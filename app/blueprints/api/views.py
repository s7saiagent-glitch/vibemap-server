"""
API blueprint – JSON endpoints for Chart.js and front-end data consumption.
"""
import calendar
from datetime import date, timedelta

from flask import Blueprint, jsonify, request
from sqlalchemy import func, extract

from app import db
from app.models import (
    Employee, SaleRecord, SalesTarget, CompanyTarget,
    PendingInvoice, SalesProductivityRecord, AppSetting,
)

bp = Blueprint('api', __name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _working_days() -> int:
    setting = AppSetting.query.filter_by(key='working_days_per_month').first()
    if setting and setting.value:
        try:
            return int(setting.value)
        except ValueError:
            pass
    return 26


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


# ─── Employee endpoints ────────────────────────────────────────────────────────

@bp.route('/employee/<int:emp_id>/monthly-sales')
def employee_monthly_sales(emp_id):
    """
    Daily sales data for a given employee and month.

    Query params:
      year  (int, default: current year)
      month (int, default: current month)

    Returns Chart.js-ready labels + datasets (daily + cumulative).
    """
    emp = Employee.query.get_or_404(emp_id)
    today = date.today()
    year  = request.args.get('year',  today.year,  type=int)
    month = request.args.get('month', today.month, type=int)

    days_in_month = calendar.monthrange(year, month)[1]

    rows = (
        db.session.query(
            extract('day', SaleRecord.sale_date).label('day'),
            func.sum(SaleRecord.value).label('total'),
        )
        .filter(
            SaleRecord.employee_id == emp_id,
            extract('year', SaleRecord.sale_date) == year,
            extract('month', SaleRecord.sale_date) == month,
        )
        .group_by(extract('day', SaleRecord.sale_date))
        .order_by(extract('day', SaleRecord.sale_date))
        .all()
    )

    daily_dict = {int(r.day): float(r.total or 0) for r in rows}
    labels = list(range(1, days_in_month + 1))
    daily_values = [daily_dict.get(d, 0.0) for d in labels]

    # Cumulative
    cumulative = []
    running = 0.0
    for v in daily_values:
        running += v
        cumulative.append(round(running, 2))

    # Target line
    target_row = SalesTarget.query.filter_by(
        employee_id=emp_id, year=year, month=month
    ).first()
    target_amount = float(target_row.target_amount) if target_row else 0.0
    working_days  = int(target_row.working_days) if target_row else _working_days()
    daily_target_val = round(target_amount / working_days, 2) if working_days else 0.0
    target_line = [round(daily_target_val * d, 2) for d in labels]

    return jsonify({
        'employee': {'id': emp.id, 'name': emp.name},
        'year': year,
        'month': month,
        'labels': labels,
        'datasets': {
            'daily':      daily_values,
            'cumulative': cumulative,
            'target':     target_line,
        },
        'summary': {
            'total_achieved': round(running, 2),
            'target_amount':  target_amount,
            'achievement_pct': round(running / target_amount * 100, 1) if target_amount else 0.0,
        },
    })


@bp.route('/employee/<int:emp_id>/category-breakdown')
def employee_category_breakdown(emp_id):
    """
    Sales breakdown by product category for an employee.

    Query params: year, month
    Returns: Chart.js pie/doughnut-ready data.
    """
    emp = Employee.query.get_or_404(emp_id)
    today = date.today()
    year  = request.args.get('year',  today.year,  type=int)
    month = request.args.get('month', today.month, type=int)

    rows = (
        db.session.query(
            SaleRecord.product_category,
            func.sum(SaleRecord.value).label('total'),
            func.count(SaleRecord.id).label('count'),
        )
        .filter(
            SaleRecord.employee_id == emp_id,
            extract('year', SaleRecord.sale_date) == year,
            extract('month', SaleRecord.sale_date) == month,
        )
        .group_by(SaleRecord.product_category)
        .order_by(func.sum(SaleRecord.value).desc())
        .all()
    )

    grand_total = sum(float(r.total or 0) for r in rows)

    categories = []
    for r in rows:
        total_val = float(r.total or 0)
        categories.append({
            'category': r.product_category or 'Uncategorized',
            'total': round(total_val, 2),
            'count': r.count,
            'pct': round(total_val / grand_total * 100, 1) if grand_total else 0.0,
        })

    return jsonify({
        'employee': {'id': emp.id, 'name': emp.name},
        'year': year,
        'month': month,
        'labels': [c['category'] for c in categories],
        'values': [c['total'] for c in categories],
        'data':   [c['total'] for c in categories],
        'counts': [c['count'] for c in categories],
        'percentages': [c['pct'] for c in categories],
        'grand_total': round(grand_total, 2),
    })


@bp.route('/employee/<int:emp_id>/yearly-sales')
def employee_yearly_sales(emp_id):
    """Monthly totals for the past 12 months – used for trend line chart."""
    emp = Employee.query.get_or_404(emp_id)
    today = date.today()
    year = request.args.get('year', today.year, type=int)

    rows = (
        db.session.query(
            extract('month', SaleRecord.sale_date).label('month'),
            func.sum(SaleRecord.value).label('total'),
        )
        .filter(
            SaleRecord.employee_id == emp_id,
            extract('year', SaleRecord.sale_date) == year,
        )
        .group_by(extract('month', SaleRecord.sale_date))
        .order_by(extract('month', SaleRecord.sale_date))
        .all()
    )

    month_dict = {int(r.month): float(r.total or 0) for r in rows}
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    labels = month_names
    values = [month_dict.get(m, 0.0) for m in range(1, 13)]

    return jsonify({
        'employee': {'id': emp.id, 'name': emp.name},
        'year': year,
        'labels': labels,
        'values': values,
    })


@bp.route('/employee/<int:emp_id>/weekly-trend')
def employee_weekly_trend(emp_id):
    """
    Weekly sales totals for an employee for the last N weeks.

    Query params: weeks (int, default 8)
    """
    emp = Employee.query.get_or_404(emp_id)
    num_weeks = request.args.get('weeks', 8, type=int)
    today = date.today()

    # Build week ranges (Monday–Sunday)
    weeks = []
    current_monday = today - timedelta(days=today.weekday())
    for i in range(num_weeks - 1, -1, -1):
        w_start = current_monday - timedelta(weeks=i)
        w_end   = w_start + timedelta(days=6)
        weeks.append((w_start, w_end))

    labels = []
    values = []
    for w_start, w_end in weeks:
        label = f'{w_start.strftime("%d %b")}'
        total = (
            db.session.query(func.sum(SaleRecord.value))
            .filter(
                SaleRecord.employee_id == emp_id,
                SaleRecord.sale_date >= w_start,
                SaleRecord.sale_date <= w_end,
            )
            .scalar()
        ) or 0.0
        labels.append(label)
        values.append(round(float(total), 2))

    return jsonify({
        'employee': {'id': emp.id, 'name': emp.name},
        'labels': labels,
        'data':   values,
    })


# ─── Dashboard KPIs ───────────────────────────────────────────────────────────

@bp.route('/dashboard/kpis')
def dashboard_kpis():
    """Key metrics for the dashboard: employees, sales, invoices, top performer."""
    today = date.today()
    year, month = today.year, today.month

    total_employees = Employee.query.filter_by(is_active=True).count()

    monthly_sales = (
        db.session.query(func.sum(SaleRecord.value))
        .filter(
            extract('year', SaleRecord.sale_date) == year,
            extract('month', SaleRecord.sale_date) == month,
        )
        .scalar()
    ) or 0.0

    pending_count = PendingInvoice.query.filter_by(status='pending').count()
    pending_net = (
        db.session.query(func.sum(PendingInvoice.net))
        .filter_by(status='pending')
        .scalar()
    ) or 0.0

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

    company_target_row = CompanyTarget.query.filter_by(year=year, month=month).first()
    company_target = float(company_target_row.total_target) if company_target_row else 0.0
    monthly_sales_f = float(monthly_sales)
    achievement_pct = round(monthly_sales_f / company_target * 100, 1) if company_target else 0.0

    return jsonify({
        'total_employees': total_employees,
        'monthly_sales': round(monthly_sales_f, 2),
        'company_target': round(company_target, 2),
        'achievement_pct': achievement_pct,
        'pending_invoices': {
            'count': pending_count,
            'net_total': round(float(pending_net), 2),
        },
        'top_performer': {
            'name':  top_row.name  if top_row else None,
            'total': round(float(top_row.total), 2) if top_row else 0.0,
        },
        'period': {'year': year, 'month': month},
    })


# ─── Targets chart ────────────────────────────────────────────────────────────

@bp.route('/targets/chart')
def targets_chart():
    """
    Target vs actual for all active employees for a given month.
    Suitable for a grouped bar chart.

    Query params: year, month
    """
    today = date.today()
    year  = request.args.get('year',  today.year,  type=int)
    month = request.args.get('month', today.month, type=int)

    employees = Employee.query.filter_by(is_active=True).order_by(Employee.name).all()

    labels   = []
    targets  = []
    achieved = []
    pcts     = []

    for emp in employees:
        target_row = SalesTarget.query.filter_by(
            employee_id=emp.id, year=year, month=month
        ).first()
        target_amount = float(target_row.target_amount) if target_row else 0.0
        emp_achieved  = _employee_month_sales(emp.id, year, month)
        pct = round(emp_achieved / target_amount * 100, 1) if target_amount > 0 else 0.0

        labels.append(emp.name)
        targets.append(round(target_amount, 2))
        achieved.append(round(emp_achieved, 2))
        pcts.append(pct)

    return jsonify({
        'year': year,
        'month': month,
        'labels': labels,
        'datasets': {
            'targets':  targets,
            'achieved': achieved,
            'pcts':     pcts,
        },
    })


@bp.route('/targets/chart/monthly-trend')
def targets_monthly_trend():
    """
    Company-level monthly sales trend for the last N months.
    Query params: months (int, default 6)
    """
    num_months = request.args.get('months', 6, type=int)
    today = date.today()

    labels   = []
    sales    = []
    targets  = []

    for i in range(num_months - 1, -1, -1):
        # Walk backwards
        month_date = (today.replace(day=1) - timedelta(days=i * 28)).replace(day=1)
        y, m = month_date.year, month_date.month
        label = f'{calendar.month_abbr[m]} {y}'

        total = (
            db.session.query(func.sum(SaleRecord.value))
            .filter(
                extract('year', SaleRecord.sale_date) == y,
                extract('month', SaleRecord.sale_date) == m,
            )
            .scalar()
        ) or 0.0

        target_row = CompanyTarget.query.filter_by(year=y, month=m).first()
        target_val = float(target_row.total_target) if target_row else 0.0

        labels.append(label)
        sales.append(round(float(total), 2))
        targets.append(round(target_val, 2))

    return jsonify({
        'labels': labels,
        'datasets': {
            'sales':   sales,
            'targets': targets,
        },
    })


@bp.route('/employees/leaderboard')
def employees_leaderboard():
    """
    Current month employee leaderboard sorted by total sales.
    """
    today = date.today()
    year  = request.args.get('year',  today.year,  type=int)
    month = request.args.get('month', today.month, type=int)
    limit = request.args.get('limit', 10, type=int)

    rows = (
        db.session.query(
            Employee.id,
            Employee.name,
            func.sum(SaleRecord.value).label('total'),
            func.count(SaleRecord.id).label('invoices'),
        )
        .join(SaleRecord, SaleRecord.employee_id == Employee.id)
        .filter(
            Employee.is_active == True,
            extract('year', SaleRecord.sale_date) == year,
            extract('month', SaleRecord.sale_date) == month,
        )
        .group_by(Employee.id)
        .order_by(func.sum(SaleRecord.value).desc())
        .limit(limit)
        .all()
    )

    leaderboard = []
    for rank, r in enumerate(rows, start=1):
        target_row = SalesTarget.query.filter_by(
            employee_id=r.id, year=year, month=month
        ).first()
        target_amount = float(target_row.target_amount) if target_row else 0.0
        total_val = float(r.total or 0)
        pct = round(total_val / target_amount * 100, 1) if target_amount else 0.0

        leaderboard.append({
            'rank':     rank,
            'id':       r.id,
            'name':     r.name,
            'total':    round(total_val, 2),
            'invoices': r.invoices,
            'target':   round(target_amount, 2),
            'pct':      pct,
        })

    return jsonify({
        'year': year,
        'month': month,
        'leaderboard': leaderboard,
    })
