"""
Schedule blueprint – weekly/monthly schedule management for employees.
"""
import calendar
from datetime import date, timedelta

from flask import (
    Blueprint, render_template, request, redirect,
    url_for, flash, jsonify,
)
from flask_babel import lazy_gettext as _l
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import Employee, Schedule

bp = Blueprint('schedule', __name__)

SHIFT_CHOICES = [
    ('morning',   _l('Morning')),
    ('evening',   _l('Evening')),
    ('split',     _l('Split')),
    ('day_off',   _l('Day Off')),
    ('holiday',   _l('Holiday')),
    ('sick',      _l('Sick Leave')),
    ('annual',    _l('Annual Leave')),
]

SHIFT_BADGE = {
    'morning': 'primary',
    'evening': 'info',
    'split':   'secondary',
    'day_off': 'light',
    'holiday': 'warning',
    'sick':    'danger',
    'annual':  'success',
}


def _build_calendar(year: int, month: int) -> list[list[date | None]]:
    """Return a list-of-weeks, each week being 7 date objects or None for padding."""
    cal = calendar.Calendar(firstweekday=6)  # Sunday first
    month_days = cal.monthdatescalendar(year, month)
    result = []
    for week in month_days:
        week_row = [d if d.month == month else None for d in week]
        result.append(week_row)
    return result


@bp.route('/')
def index():
    """Monthly calendar view showing schedule for all active employees."""
    today = date.today()
    year  = request.args.get('year', today.year, type=int)
    month = request.args.get('month', today.month, type=int)

    employees = Employee.query.filter_by(is_active=True).order_by(Employee.name).all()

    first_day = date(year, month, 1)
    last_day  = date(year, month, calendar.monthrange(year, month)[1])

    # Load all schedules for the month – keyed by (employee_id, date)
    schedules_raw = Schedule.query.filter(
        Schedule.date >= first_day,
        Schedule.date <= last_day,
    ).all()
    schedule_map: dict[tuple, Schedule] = {
        (s.employee_id, s.date): s for s in schedules_raw
    }

    calendar_weeks = _build_calendar(year, month)
    months = [(i, calendar.month_name[i]) for i in range(1, 13)]

    return render_template(
        'schedule/index.html',
        employees=employees,
        calendar_weeks=calendar_weeks,
        schedule_map=schedule_map,
        shift_choices=SHIFT_CHOICES,
        shift_badge=SHIFT_BADGE,
        year=year,
        month=month,
        today=today,
        months=months,
        page_title=_l('Work Schedule'),
    )


@bp.route('/set', methods=['POST'])
def set_schedule():
    """Set or update a single employee's shift on a specific date."""
    employee_id = request.form.get('employee_id', 0, type=int)
    date_str    = request.form.get('date', '')
    shift       = request.form.get('shift', '').strip()
    start_time  = request.form.get('start_time', '').strip() or None
    end_time    = request.form.get('end_time', '').strip() or None
    notes       = request.form.get('notes', '').strip() or None

    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    # Validate
    if not employee_id:
        msg = str(_l('Employee is required.'))
        return jsonify({'error': msg}), 400 if is_ajax else (flash(msg, 'danger'), redirect(url_for('schedule.index')))[1]

    if not date_str:
        msg = str(_l('Date is required.'))
        return jsonify({'error': msg}), 400 if is_ajax else (flash(msg, 'danger'), redirect(url_for('schedule.index')))[1]

    try:
        sched_date = date.fromisoformat(date_str)
    except ValueError:
        msg = str(_l('Invalid date format.'))
        if is_ajax:
            return jsonify({'error': msg}), 400
        flash(msg, 'danger')
        return redirect(url_for('schedule.index'))

    emp = Employee.query.get(employee_id)
    if not emp:
        msg = str(_l('Employee not found.'))
        if is_ajax:
            return jsonify({'error': msg}), 404
        flash(msg, 'danger')
        return redirect(url_for('schedule.index'))

    is_working = shift not in ('day_off', 'holiday', 'sick', 'annual')

    existing = Schedule.query.filter_by(employee_id=employee_id, date=sched_date).first()
    if existing:
        existing.shift = shift
        existing.start_time = start_time
        existing.end_time = end_time
        existing.is_working = is_working
        existing.notes = notes
    else:
        sched = Schedule(
            employee_id=employee_id,
            date=sched_date,
            shift=shift,
            start_time=start_time,
            end_time=end_time,
            is_working=is_working,
            notes=notes,
        )
        db.session.add(sched)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        msg = str(_l('Could not save schedule entry.'))
        if is_ajax:
            return jsonify({'error': msg}), 500
        flash(msg, 'danger')
        return redirect(url_for('schedule.index'))

    if is_ajax:
        return jsonify({
            'success': True,
            'employee_id': employee_id,
            'date': date_str,
            'shift': shift,
            'is_working': is_working,
            'badge': SHIFT_BADGE.get(shift, 'secondary'),
        })

    flash(
        _l('Schedule updated for %(name)s on %(date)s.', name=emp.name, date=date_str),
        'success',
    )
    return redirect(url_for('schedule.index', year=sched_date.year, month=sched_date.month))


@bp.route('/bulk-set', methods=['POST'])
def bulk_set():
    """Set the same shift for all employees on a given date."""
    date_str = request.form.get('date', '')
    shift    = request.form.get('shift', '').strip()

    try:
        sched_date = date.fromisoformat(date_str)
    except ValueError:
        flash(_l('Invalid date.'), 'danger')
        return redirect(url_for('schedule.index'))

    employees = Employee.query.filter_by(is_active=True).all()
    is_working = shift not in ('day_off', 'holiday', 'sick', 'annual')
    count = 0

    for emp in employees:
        existing = Schedule.query.filter_by(employee_id=emp.id, date=sched_date).first()
        if existing:
            existing.shift = shift
            existing.is_working = is_working
        else:
            db.session.add(Schedule(
                employee_id=emp.id,
                date=sched_date,
                shift=shift,
                is_working=is_working,
            ))
        count += 1

    db.session.commit()
    flash(_l('Bulk shift "%(shift)s" applied to %(n)d employees on %(date)s.',
             shift=shift, n=count, date=date_str), 'success')
    return redirect(url_for('schedule.index', year=sched_date.year, month=sched_date.month))


@bp.route('/employee/<int:emp_id>')
def employee_schedule(emp_id):
    """Individual employee schedule view."""
    emp = Employee.query.get_or_404(emp_id)
    today = date.today()
    year  = request.args.get('year', today.year, type=int)
    month = request.args.get('month', today.month, type=int)

    first_day = date(year, month, 1)
    last_day  = date(year, month, calendar.monthrange(year, month)[1])

    schedules = Schedule.query.filter(
        Schedule.employee_id == emp_id,
        Schedule.date >= first_day,
        Schedule.date <= last_day,
    ).order_by(Schedule.date).all()

    working_days_count = sum(1 for s in schedules if s.is_working)
    calendar_weeks = _build_calendar(year, month)
    schedule_map = {s.date: s for s in schedules}
    months = [(i, calendar.month_name[i]) for i in range(1, 13)]

    return render_template(
        'schedule/employee.html',
        emp=emp,
        schedules=schedules,
        schedule_map=schedule_map,
        calendar_weeks=calendar_weeks,
        shift_choices=SHIFT_CHOICES,
        shift_badge=SHIFT_BADGE,
        working_days_count=working_days_count,
        year=year,
        month=month,
        today=today,
        months=months,
        page_title=_l('Schedule – %(name)s', name=emp.name),
    )
