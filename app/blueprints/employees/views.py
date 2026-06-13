"""
Employees blueprint – CRUD, lock/unlock, alias management.
"""
from flask import (
    Blueprint, render_template, request, redirect,
    url_for, flash, jsonify, abort,
)
from flask_babel import lazy_gettext as _l

from app import db
from app.models import Employee, EmployeeAlias, SaleRecord, SalesTarget

bp = Blueprint('employees', __name__)


@bp.route('/', methods=['GET', 'POST'])
def index():
    """List all employees; handle add-employee form POST."""
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        name_ar = request.form.get('name_ar', '').strip()
        sap_id = request.form.get('sap_id', '').strip() or None

        if not name:
            flash(_l('Employee name is required.'), 'danger')
            return redirect(url_for('employees.index'))

        # Duplicate check
        existing = Employee.query.filter_by(name=name).first()
        if existing:
            flash(_l('An employee with this name already exists.'), 'warning')
            return redirect(url_for('employees.index'))

        emp = Employee(name=name, name_ar=name_ar or None, sap_id=sap_id)
        db.session.add(emp)
        db.session.commit()
        flash(_l('Employee %(name)s added successfully.', name=name), 'success')
        return redirect(url_for('employees.index'))

    employees = Employee.query.order_by(Employee.name).all()

    # Attach quick stats per employee (current month sales count)
    from datetime import date
    from sqlalchemy import extract, func
    today = date.today()

    stats = {}
    rows = (
        db.session.query(
            SaleRecord.employee_id,
            func.count(SaleRecord.id).label('cnt'),
            func.sum(SaleRecord.value).label('total'),
        )
        .filter(
            extract('year', SaleRecord.sale_date) == today.year,
            extract('month', SaleRecord.sale_date) == today.month,
        )
        .group_by(SaleRecord.employee_id)
        .all()
    )
    for row in rows:
        stats[row.employee_id] = {'count': row.cnt, 'total': float(row.total or 0)}

    return render_template(
        'employees/index.html',
        employees=employees,
        stats=stats,
        page_title=_l('Employees'),
    )


@bp.route('/<int:emp_id>/edit', methods=['GET', 'POST'])
def edit(emp_id):
    """Edit employee details."""
    emp = Employee.query.get_or_404(emp_id)

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        name_ar = request.form.get('name_ar', '').strip()
        sap_id = request.form.get('sap_id', '').strip() or None
        is_active = request.form.get('is_active') == 'on'

        if not name:
            flash(_l('Employee name is required.'), 'danger')
            return redirect(url_for('employees.edit', emp_id=emp_id))

        # Duplicate name check (exclude self)
        duplicate = Employee.query.filter(
            Employee.name == name, Employee.id != emp_id
        ).first()
        if duplicate:
            flash(_l('Another employee with this name already exists.'), 'warning')
            return redirect(url_for('employees.edit', emp_id=emp_id))

        emp.name = name
        emp.name_ar = name_ar or None
        emp.sap_id = sap_id
        emp.is_active = is_active
        db.session.commit()
        flash(_l('Employee updated successfully.'), 'success')
        return redirect(url_for('employees.index'))

    return render_template(
        'employees/edit.html',
        emp=emp,
        page_title=_l('Edit Employee'),
    )


@bp.route('/<int:emp_id>/delete', methods=['POST'])
def delete(emp_id):
    """Delete employee (soft: deactivate if has sales, hard: remove otherwise)."""
    emp = Employee.query.get_or_404(emp_id)

    has_sales = SaleRecord.query.filter_by(employee_id=emp_id).first()
    if has_sales:
        # Soft delete – deactivate to preserve history
        emp.is_active = False
        db.session.commit()
        flash(_l('Employee %(name)s deactivated (has sales history).', name=emp.name), 'warning')
    else:
        db.session.delete(emp)
        db.session.commit()
        flash(_l('Employee %(name)s deleted.', name=emp.name), 'success')

    return redirect(url_for('employees.index'))


@bp.route('/<int:emp_id>/lock', methods=['POST'])
def toggle_lock(emp_id):
    """Toggle locked status for an employee."""
    emp = Employee.query.get_or_404(emp_id)
    emp.is_locked = not emp.is_locked
    db.session.commit()

    status = _l('locked') if emp.is_locked else _l('unlocked')
    flash(_l('Employee %(name)s %(status)s.', name=emp.name, status=status), 'info')

    # Support AJAX – return JSON if requested
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({'locked': emp.is_locked, 'name': emp.name})

    return redirect(request.referrer or url_for('employees.index'))


@bp.route('/<int:emp_id>/alias', methods=['POST'])
def add_alias(emp_id):
    """Add an alias name for an employee."""
    emp = Employee.query.get_or_404(emp_id)
    alias_name = request.form.get('alias', '').strip()

    if not alias_name:
        flash(_l('Alias cannot be empty.'), 'danger')
        return redirect(url_for('employees.edit', emp_id=emp_id))

    # Check alias not already taken
    existing_alias = EmployeeAlias.query.filter_by(alias=alias_name).first()
    if existing_alias:
        flash(_l('Alias "%(alias)s" is already assigned.', alias=alias_name), 'warning')
        return redirect(url_for('employees.edit', emp_id=emp_id))

    # Also check against employee names
    existing_emp = Employee.query.filter_by(name=alias_name).first()
    if existing_emp:
        flash(_l('That name belongs to an existing employee.'), 'warning')
        return redirect(url_for('employees.edit', emp_id=emp_id))

    alias = EmployeeAlias(employee_id=emp_id, alias=alias_name)
    db.session.add(alias)
    db.session.commit()
    flash(_l('Alias "%(alias)s" added.', alias=alias_name), 'success')
    return redirect(url_for('employees.edit', emp_id=emp_id))


@bp.route('/<int:emp_id>/alias/<int:alias_id>/delete', methods=['POST'])
def delete_alias(emp_id, alias_id):
    """Remove an alias from an employee."""
    alias = EmployeeAlias.query.filter_by(id=alias_id, employee_id=emp_id).first_or_404()
    db.session.delete(alias)
    db.session.commit()
    flash(_l('Alias removed.'), 'success')
    return redirect(url_for('employees.edit', emp_id=emp_id))


@bp.route('/merge', methods=['POST'])
def merge():
    """
    Merge duplicate employee records.
    All sales, targets, schedules, invoices, and aliases from `source_id`
    are re-assigned to `target_id`, then source is deleted.
    """
    target_id = request.form.get('target_id', type=int)
    source_id = request.form.get('source_id', type=int)

    if not target_id or not source_id or target_id == source_id:
        flash('يرجى اختيار موظفين مختلفين للدمج.', 'danger')
        return redirect(url_for('employees.index'))

    target = Employee.query.get_or_404(target_id)
    source = Employee.query.get_or_404(source_id)

    from app.models import SalesTarget, Schedule, PendingInvoice, SalesProductivityRecord

    # Re-assign all related records
    SaleRecord.query.filter_by(employee_id=source.id).update({'employee_id': target.id})
    SalesTarget.query.filter_by(employee_id=source.id).update({'employee_id': target.id})
    SalesProductivityRecord.query.filter_by(employee_id=source.id).update({'employee_id': target.id})
    PendingInvoice.query.filter_by(employee_id=source.id).update({'employee_id': target.id})
    Schedule.query.filter_by(employee_id=source.id).update({'employee_id': target.id})

    # Merge aliases
    for alias in list(source.aliases):
        exists = EmployeeAlias.query.filter_by(alias=alias.alias, employee_id=target.id).first()
        if not exists:
            alias.employee_id = target.id
        else:
            db.session.delete(alias)

    # Add source name as alias if not already present
    if source.name != target.name:
        exists = EmployeeAlias.query.filter_by(alias=source.name, employee_id=target.id).first()
        if not exists:
            db.session.add(EmployeeAlias(employee_id=target.id, alias=source.name))

    # Update SAP ID on target if missing
    if not target.sap_id and source.sap_id:
        target.sap_id = source.sap_id

    db.session.delete(source)
    db.session.commit()

    flash(f'تم دمج "{source.name}" مع "{target.name}" بنجاح.', 'success')
    return redirect(url_for('employees.index'))
