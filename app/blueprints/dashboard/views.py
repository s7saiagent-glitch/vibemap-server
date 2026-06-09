"""
Dashboard blueprint – KPIs with day / month / date-range filter.
"""
from datetime import date, timedelta
import calendar

from flask import Blueprint, render_template, request, current_app
from flask_babel import lazy_gettext as _l
from sqlalchemy import func, extract, and_

from app import db
from app.models import (
    Employee, SaleRecord, SalesTarget, CompanyTarget,
    PendingInvoice, AppSetting,
)
from app.utils.assistant import generate_sales_advice

bp = Blueprint('dashboard', __name__)


def _working_days_setting() -> int:
    setting = AppSetting.query.filter_by(key='working_days_per_month').first()
    if setting and setting.value:
        try:
            return int(setting.value)
        except ValueError:
            pass
    return current_app.config.get('WORKING_DAYS_PER_MONTH', 26)


# ─── date-filter helpers ──────────────────────────────────────────────────────

def _parse_filter():
    """
    Return (mode, date_from, date_to, label_ar, label_en) from query-string.
    mode: 'day' | 'month' | 'range'
    """
    today = date.today()
    mode = request.args.get('mode', 'month')

    if mode == 'day':
        raw = request.args.get('date', today.isoformat())
        try:
            d = date.fromisoformat(raw)
        except ValueError:
            d = today
        return 'day', d, d, d.strftime('%Y-%m-%d'), d.strftime('%Y-%m-%d')

    if mode == 'range':
        raw_from = request.args.get('date_from', today.replace(day=1).isoformat())
        raw_to   = request.args.get('date_to',   today.isoformat())
        try:
            d_from = date.fromisoformat(raw_from)
        except ValueError:
            d_from = today.replace(day=1)
        try:
            d_to = date.fromisoformat(raw_to)
        except ValueError:
            d_to = today
        if d_from > d_to:
            d_from, d_to = d_to, d_from
        label = f'{d_from.isoformat()} → {d_to.isoformat()}'
        return 'range', d_from, d_to, label, label

    # default: month
    try:
        year  = int(request.args.get('year',  today.year))
        month = int(request.args.get('month', today.month))
    except ValueError:
        year, month = today.year, today.month
    last_day = calendar.monthrange(year, month)[1]
    d_from = date(year, month, 1)
    d_to   = date(year, month, last_day)
    label = f'{year}/{month:02d}'
    return 'month', d_from, d_to, label, label


def _sales_filter(d_from, d_to):
    return and_(SaleRecord.sale_date >= d_from, SaleRecord.sale_date <= d_to)


def _range_sales_total(d_from, d_to) -> float:
    total = db.session.query(func.sum(SaleRecord.value)).filter(
        _sales_filter(d_from, d_to)
    ).scalar()
    return float(total or 0)


def _employee_range_sales(employee_id: int, d_from, d_to) -> float:
    total = db.session.query(func.sum(SaleRecord.value)).filter(
        SaleRecord.employee_id == employee_id,
        _sales_filter(d_from, d_to),
    ).scalar()
    return float(total or 0)


# ─── view ─────────────────────────────────────────────────────────────────────

@bp.route('/')
def index():
    today = date.today()
    working_days = _working_days_setting()

    mode, d_from, d_to, label_ar, label_en = _parse_filter()

    # Convenience for month-mode target lookups
    target_year  = d_from.year
    target_month = d_from.month

    # ── KPIs ──────────────────────────────────────────────────────────────────
    total_employees = Employee.query.filter_by(is_active=True).count()
    period_sales    = _range_sales_total(d_from, d_to)
    pending_count   = PendingInvoice.query.filter_by(status='pending').count()

    top_row = (
        db.session.query(Employee.name, func.sum(SaleRecord.value).label('total'))
        .join(SaleRecord, SaleRecord.employee_id == Employee.id)
        .filter(_sales_filter(d_from, d_to))
        .group_by(Employee.id)
        .order_by(func.sum(SaleRecord.value).desc())
        .first()
    )
    top_performer       = top_row.name if top_row else _l('N/A')
    top_performer_sales = float(top_row.total) if top_row else 0.0

    # Company target only makes sense for month mode
    company_target_row = CompanyTarget.query.filter_by(
        year=target_year, month=target_month
    ).first()
    company_target = float(company_target_row.total_target) if company_target_row else 0.0

    # ── Per-employee data ─────────────────────────────────────────────────────
    employees = Employee.query.filter_by(is_active=True).order_by(Employee.name).all()
    employee_data = []

    # Remaining working days (only meaningful for month mode)
    days_in_month = calendar.monthrange(target_year, target_month)[1]
    days_elapsed  = min(today.day, days_in_month) if mode == 'month' and target_year == today.year and target_month == today.month else days_in_month
    remaining_calendar_days = days_in_month - days_elapsed
    remaining_working_days  = max(round(remaining_calendar_days * working_days / days_in_month), 1)

    for emp in employees:
        target_row = SalesTarget.query.filter_by(
            employee_id=emp.id, year=target_year, month=target_month
        ).first()
        target_amount    = float(target_row.target_amount) if target_row else 0.0
        emp_working_days = int(target_row.working_days)    if target_row else working_days

        achieved  = _employee_range_sales(emp.id, d_from, d_to)
        remaining = max(target_amount - achieved, 0.0)

        # Scale target for day/range modes
        if mode == 'day':
            # Daily target = monthly target / working days
            daily_target = (target_amount / emp_working_days) if emp_working_days > 0 else 0.0
            display_target = daily_target
        elif mode == 'range':
            range_days = (d_to - d_from).days + 1
            display_target = (target_amount / days_in_month * range_days) if days_in_month > 0 else 0.0
            daily_target   = remaining / remaining_working_days if remaining_working_days > 0 else 0.0
        else:  # month
            display_target = target_amount
            daily_target   = remaining / remaining_working_days if remaining_working_days > 0 else 0.0

        # Progress % against scaled target
        if display_target > 0:
            progress_pct  = min(round(achieved / display_target * 100, 1), 100)
            over_achieved = achieved > display_target
        else:
            progress_pct  = 0.0
            over_achieved = False

        badge = 'success' if progress_pct >= 100 else ('warning' if progress_pct >= 80 else 'danger')

        employee_data.append({
            'employee':       emp,
            'target_amount':  display_target,
            'achieved':       achieved,
            'remaining':      max(display_target - achieved, 0.0),
            'daily_target':   daily_target,
            'progress_pct':   progress_pct,
            'over_achieved':  over_achieved,
            'badge':          badge,
            'emp_working_days': emp_working_days,
        })

    employee_data.sort(key=lambda d: d['progress_pct'], reverse=True)

    achievement_pct = round(period_sales / company_target * 100, 1) if company_target else 0

    kpis = {
        'total_employees':        total_employees,
        'period_sales':           period_sales,
        'company_target':         company_target,
        'company_achievement_pct': achievement_pct,
        'top_performer':          top_performer,
        'top_performer_sales':    top_performer_sales,
        'pending_invoices':       pending_count,
        'working_days':           working_days,
        'remaining_working_days': remaining_working_days,
    }

    # Build month list for selector
    months = [(i, date(2000, i, 1).strftime('%B')) for i in range(1, 13)]

    return render_template(
        'dashboard/index.html',
        kpis=kpis,
        employee_data=employee_data,
        today=today,
        mode=mode,
        d_from=d_from,
        d_to=d_to,
        period_label=label_ar,
        year=target_year,
        month=target_month,
        months=months,
        page_title=_l('Dashboard'),
    )


@bp.route('/advice')
def advice():
    lang = 'ar'
    advice_list = generate_sales_advice(lang=lang)
    return render_template(
        'dashboard/advice.html',
        advice_list=advice_list,
        page_title=_l('Sales Advice'),
    )
