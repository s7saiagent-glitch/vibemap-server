"""
Dashboard blueprint – KPIs, employee daily target progress, and advice page.
"""
from datetime import date, timedelta
from flask import Blueprint, render_template, current_app
from flask_babel import lazy_gettext as _l
from sqlalchemy import func, extract

from app import db
from app.models import (
    Employee, SaleRecord, SalesTarget, CompanyTarget,
    PendingInvoice, AppSetting,
)
from app.utils.assistant import generate_sales_advice

bp = Blueprint('dashboard', __name__)


def _working_days_setting() -> int:
    """Return configured working days per month from AppSettings or config."""
    setting = AppSetting.query.filter_by(key='working_days_per_month').first()
    if setting and setting.value:
        try:
            return int(setting.value)
        except ValueError:
            pass
    return current_app.config.get('WORKING_DAYS_PER_MONTH', 26)


def _month_sales_total(year: int, month: int) -> float:
    total = (
        db.session.query(func.sum(SaleRecord.value))
        .filter(
            extract('year', SaleRecord.sale_date) == year,
            extract('month', SaleRecord.sale_date) == month,
        )
        .scalar()
    )
    return float(total or 0)


def _employee_month_sales(employee_id: int, year: int, month: int) -> float:
    total = (
        db.session.query(func.sum(SaleRecord.value))
        .filter(
            SaleRecord.employee_id == employee_id,
            extract('year', SaleRecord.sale_date) == year,
            extract('month', SaleRecord.sale_date) == month,
        )
        .scalar()
    )
    return float(total or 0)


@bp.route('/')
def index():
    today = date.today()
    year, month = today.year, today.month
    working_days = _working_days_setting()

    # ── KPIs ──────────────────────────────────────────────────────────────────
    total_employees = Employee.query.filter_by(is_active=True).count()
    monthly_sales = _month_sales_total(year, month)
    pending_count = PendingInvoice.query.filter_by(status='pending').count()

    # Top performer this month
    top_row = (
        db.session.query(Employee.name, func.sum(SaleRecord.value).label('total'))
        .join(SaleRecord, SaleRecord.employee_id == Employee.id)
        .filter(
            extract('year', SaleRecord.sale_date) == year,
            extract('month', SaleRecord.sale_date) == month,
        )
        .group_by(Employee.id)
        .order_by(func.sum(SaleRecord.value).desc())
        .first()
    )
    top_performer = top_row.name if top_row else _l('N/A')
    top_performer_sales = float(top_row.total) if top_row else 0.0

    # Company target for this month
    company_target_row = CompanyTarget.query.filter_by(
        year=year, month=month
    ).first()
    company_target = float(company_target_row.total_target) if company_target_row else 0.0

    # ── Per-employee progress data ────────────────────────────────────────────
    employees = Employee.query.filter_by(is_active=True).order_by(Employee.name).all()
    employee_data = []

    # Estimate elapsed working days (rough: calendar days elapsed as fraction of month days)
    days_in_month = 31 if month in (1, 3, 5, 7, 8, 10, 12) else (
        30 if month in (4, 6, 9, 11) else (
            29 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 28
        )
    )
    days_elapsed = today.day
    # Remaining working days estimate
    remaining_calendar_days = days_in_month - days_elapsed
    remaining_working_days = max(
        round(remaining_calendar_days * working_days / days_in_month), 1
    )

    for emp in employees:
        target_row = SalesTarget.query.filter_by(
            employee_id=emp.id, year=year, month=month
        ).first()
        target_amount = float(target_row.target_amount) if target_row else 0.0
        emp_working_days = int(target_row.working_days) if target_row else working_days

        achieved = _employee_month_sales(emp.id, year, month)
        remaining = max(target_amount - achieved, 0.0)

        # Daily target = remaining / remaining working days
        daily_target = remaining / remaining_working_days if remaining_working_days > 0 else 0.0

        # Progress percentage (capped at 100 for bar width)
        if target_amount > 0:
            progress_pct = min(round(achieved / target_amount * 100, 1), 100)
            over_achieved = achieved > target_amount
        else:
            progress_pct = 0.0
            over_achieved = False

        # Badge colour
        if progress_pct >= 100:
            badge = 'success'
        elif progress_pct >= 80:
            badge = 'warning'
        else:
            badge = 'danger'

        # Today's sales for the employee
        today_sales = (
            db.session.query(func.sum(SaleRecord.value))
            .filter(
                SaleRecord.employee_id == emp.id,
                SaleRecord.sale_date == today,
            )
            .scalar()
        )
        today_sales = float(today_sales or 0)

        employee_data.append({
            'employee': emp,
            'target_amount': target_amount,
            'achieved': achieved,
            'remaining': remaining,
            'daily_target': daily_target,
            'progress_pct': progress_pct,
            'over_achieved': over_achieved,
            'badge': badge,
            'today_sales': today_sales,
            'emp_working_days': emp_working_days,
        })

    # Sort by progress descending so top performers appear first
    employee_data.sort(key=lambda d: d['progress_pct'], reverse=True)

    kpis = {
        'total_employees': total_employees,
        'monthly_sales': monthly_sales,
        'company_target': company_target,
        'company_achievement_pct': round(monthly_sales / company_target * 100, 1) if company_target else 0,
        'top_performer': top_performer,
        'top_performer_sales': top_performer_sales,
        'pending_invoices': pending_count,
        'working_days': working_days,
        'remaining_working_days': remaining_working_days,
    }

    return render_template(
        'dashboard/index.html',
        kpis=kpis,
        employee_data=employee_data,
        today=today,
        year=year,
        month=month,
        page_title=_l('Dashboard'),
    )


@bp.route('/advice')
def advice():
    """Sales advice page powered by AlQahtaniPro rule engine."""
    lang = 'ar'  # will be overridden by babel locale in template if needed
    advice_list = generate_sales_advice(lang=lang)
    return render_template(
        'dashboard/advice.html',
        advice_list=advice_list,
        page_title=_l('Sales Advice'),
    )
