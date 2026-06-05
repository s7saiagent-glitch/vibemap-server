"""
Targets blueprint – company target setting and per-employee distribution.
"""
from datetime import date
import calendar

from flask import (
    Blueprint, render_template, request, redirect,
    url_for, flash, current_app,
)
from flask_babel import lazy_gettext as _l
from sqlalchemy import func, extract
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import (
    Employee, SalesTarget, CompanyTarget, SaleRecord, AppSetting,
)

bp = Blueprint('targets', __name__)


def _working_days_setting() -> int:
    setting = AppSetting.query.filter_by(key='working_days_per_month').first()
    if setting and setting.value:
        try:
            return int(setting.value)
        except ValueError:
            pass
    return current_app.config.get('WORKING_DAYS_PER_MONTH', 26)


def _days_remaining_in_month(today: date) -> int:
    last_day = calendar.monthrange(today.year, today.month)[1]
    return max(last_day - today.day, 1)


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
    """List targets for current month with achieved vs target comparison."""
    today = date.today()
    year = request.args.get('year', today.year, type=int)
    month = request.args.get('month', today.month, type=int)
    working_days = _working_days_setting()

    company_target = CompanyTarget.query.filter_by(year=year, month=month).first()

    employees = Employee.query.filter_by(is_active=True).order_by(Employee.name).all()
    targets_data = []
    total_target_amount = 0.0
    total_achieved = 0.0

    for emp in employees:
        target_row = SalesTarget.query.filter_by(
            employee_id=emp.id, year=year, month=month
        ).first()
        target_amount = float(target_row.target_amount) if target_row else 0.0
        percentage = float(target_row.percentage) if target_row else 0.0
        emp_working_days = int(target_row.working_days) if target_row else working_days

        achieved = _employee_month_sales(emp.id, year, month)
        remaining = max(target_amount - achieved, 0.0)
        progress_pct = round(achieved / target_amount * 100, 1) if target_amount > 0 else 0.0

        if progress_pct >= 100:
            badge = 'success'
        elif progress_pct >= 80:
            badge = 'warning'
        else:
            badge = 'danger'

        total_target_amount += target_amount
        total_achieved += achieved

        targets_data.append({
            'employee': emp,
            'target_amount': target_amount,
            'percentage': percentage,
            'achieved': achieved,
            'remaining': remaining,
            'progress_pct': progress_pct,
            'badge': badge,
            'working_days': emp_working_days,
            'has_target': target_row is not None,
        })

    targets_data.sort(key=lambda d: d['progress_pct'], reverse=True)

    remaining_days = _days_remaining_in_month(today)
    company_achievement_pct = round(total_achieved / total_target_amount * 100, 1) if total_target_amount > 0 else 0.0

    return render_template(
        'targets/index.html',
        targets_data=targets_data,
        company_target=company_target,
        total_target_amount=total_target_amount,
        total_achieved=total_achieved,
        company_achievement_pct=company_achievement_pct,
        remaining_days=remaining_days,
        working_days=working_days,
        year=year,
        month=month,
        today=today,
        page_title=_l('Sales Targets'),
    )


@bp.route('/set', methods=['GET', 'POST'])
def set_targets():
    """Set company target and distribute percentage per employee."""
    today = date.today()
    working_days = _working_days_setting()

    if request.method == 'POST':
        year = request.form.get('year', today.year, type=int)
        month = request.form.get('month', today.month, type=int)
        total_target = request.form.get('total_target', 0, type=float)
        notes = request.form.get('notes', '').strip()
        branch = request.form.get('branch', '').strip()

        # Validate total target
        if total_target <= 0:
            flash(_l('Company target must be greater than zero.'), 'danger')
            return redirect(url_for('targets.set_targets'))

        # Collect employee percentages
        employees = Employee.query.filter_by(is_active=True).order_by(Employee.name).all()
        emp_percentages = {}
        pct_sum = 0.0

        for emp in employees:
            pct_key = f'pct_{emp.id}'
            pct_val = request.form.get(pct_key, 0, type=float)
            emp_percentages[emp.id] = pct_val
            pct_sum += pct_val

        # Warn if sum not ~100%
        if abs(pct_sum - 100.0) > 0.5:
            flash(
                _l('Percentages sum to %(sum).1f%% — must equal 100%%.', sum=pct_sum),
                'warning'
            )
            # Proceed anyway, auto-normalise
            if pct_sum > 0:
                factor = 100.0 / pct_sum
                emp_percentages = {k: v * factor for k, v in emp_percentages.items()}

        # Upsert company target
        company_target = CompanyTarget.query.filter_by(
            year=year, month=month, branch=branch or None
        ).first()
        if company_target:
            company_target.total_target = total_target
            company_target.notes = notes
        else:
            company_target = CompanyTarget(
                year=year,
                month=month,
                total_target=total_target,
                branch=branch or None,
                notes=notes,
            )
            db.session.add(company_target)

        # Upsert per-employee targets
        for emp in employees:
            pct = emp_percentages.get(emp.id, 0.0)
            amount = round(total_target * pct / 100.0, 2)

            target_row = SalesTarget.query.filter_by(
                employee_id=emp.id, year=year, month=month
            ).first()
            if target_row:
                target_row.target_amount = amount
                target_row.percentage = pct
                target_row.working_days = working_days
            else:
                target_row = SalesTarget(
                    employee_id=emp.id,
                    year=year,
                    month=month,
                    target_amount=amount,
                    percentage=pct,
                    working_days=working_days,
                )
                db.session.add(target_row)

        try:
            db.session.commit()
            flash(
                _l('Targets set for %(month)d/%(year)d. Total: %(total).0f SAR.',
                   month=month, year=year, total=total_target),
                'success',
            )
        except IntegrityError:
            db.session.rollback()
            flash(_l('Error saving targets. Please try again.'), 'danger')

        return redirect(url_for('targets.index'))

    # GET – prefill form with existing data
    year = request.args.get('year', today.year, type=int)
    month = request.args.get('month', today.month, type=int)

    employees = Employee.query.filter_by(is_active=True).order_by(Employee.name).all()
    existing_targets = {
        t.employee_id: t
        for t in SalesTarget.query.filter_by(year=year, month=month).all()
    }
    company_target = CompanyTarget.query.filter_by(year=year, month=month).first()
    remaining_days = _days_remaining_in_month(today)

    # Build month list for selector
    months = [(i, calendar.month_name[i]) for i in range(1, 13)]

    return render_template(
        'targets/set.html',
        employees=employees,
        existing_targets=existing_targets,
        company_target=company_target,
        working_days=working_days,
        remaining_days=remaining_days,
        year=year,
        month=month,
        today=today,
        months=months,
        page_title=_l('Set Targets'),
    )


@bp.route('/<int:target_id>/delete', methods=['POST'])
def delete_target(target_id):
    """Remove a single employee target row."""
    target = SalesTarget.query.get_or_404(target_id)
    db.session.delete(target)
    db.session.commit()
    flash(_l('Target deleted.'), 'success')
    return redirect(url_for('targets.index'))


@bp.route('/clear', methods=['POST'])
def clear_month():
    """Delete all employee targets for a given month."""
    year = request.form.get('year', date.today().year, type=int)
    month = request.form.get('month', date.today().month, type=int)
    deleted = SalesTarget.query.filter_by(year=year, month=month).delete()
    db.session.commit()
    flash(_l('Cleared %(n)d targets for %(m)d/%(y)d.', n=deleted, m=month, y=year), 'success')
    return redirect(url_for('targets.index'))
