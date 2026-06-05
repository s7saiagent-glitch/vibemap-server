"""
Invoices blueprint – pending invoices list, filters, and notes.
"""
from datetime import date

from flask import (
    Blueprint, render_template, request, redirect,
    url_for, flash, jsonify,
)
from flask_babel import lazy_gettext as _l

from app import db
from app.models import Employee, PendingInvoice, InvoiceNote

bp = Blueprint('invoices', __name__)

REASON_CODES = [
    ('PAYMENT_DELAY', _l('Payment Delay')),
    ('DISPUTE',       _l('Dispute')),
    ('MISSING_DOCS',  _l('Missing Documents')),
    ('RETURNED',      _l('Returned Goods')),
    ('OTHER',         _l('Other')),
]


@bp.route('/')
def index():
    """List pending invoices with optional filters."""
    status_filter  = request.args.get('status', '')
    employee_filter = request.args.get('employee_id', 0, type=int)
    branch_filter  = request.args.get('branch', '')
    date_from      = request.args.get('date_from', '')
    date_to        = request.args.get('date_to', '')
    search         = request.args.get('search', '').strip()
    page           = request.args.get('page', 1, type=int)

    query = PendingInvoice.query

    if status_filter:
        query = query.filter(PendingInvoice.status == status_filter)
    else:
        # Default: show only pending
        query = query.filter(PendingInvoice.status == 'pending')

    if employee_filter:
        query = query.filter(PendingInvoice.employee_id == employee_filter)

    if branch_filter:
        query = query.filter(PendingInvoice.branch.ilike(f'%{branch_filter}%'))

    if date_from:
        try:
            df = date.fromisoformat(date_from)
            query = query.filter(PendingInvoice.invoice_date >= df)
        except ValueError:
            pass

    if date_to:
        try:
            dt = date.fromisoformat(date_to)
            query = query.filter(PendingInvoice.invoice_date <= dt)
        except ValueError:
            pass

    if search:
        like = f'%{search}%'
        query = query.filter(
            db.or_(
                PendingInvoice.invoice_no.ilike(like),
                PendingInvoice.customer_name.ilike(like),
                PendingInvoice.description.ilike(like),
            )
        )

    invoices = query.order_by(
        PendingInvoice.invoice_date.desc(),
        PendingInvoice.invoice_no,
    ).paginate(page=page, per_page=30, error_out=False)

    employees = Employee.query.filter_by(is_active=True).order_by(Employee.name).all()

    # Summary stats
    total_pending = PendingInvoice.query.filter_by(status='pending').count()
    from sqlalchemy import func
    total_net = db.session.query(func.sum(PendingInvoice.net)).filter_by(status='pending').scalar() or 0.0

    return render_template(
        'invoices/index.html',
        invoices=invoices,
        employees=employees,
        reason_codes=REASON_CODES,
        total_pending=total_pending,
        total_net=float(total_net),
        status_filter=status_filter,
        employee_filter=employee_filter,
        branch_filter=branch_filter,
        date_from=date_from,
        date_to=date_to,
        search=search,
        today=date.today(),
        page_title=_l('Pending Invoices'),
    )


@bp.route('/<int:invoice_id>/note', methods=['POST'])
def add_note(invoice_id):
    """Add a note to a pending invoice."""
    invoice = PendingInvoice.query.get_or_404(invoice_id)
    note_text   = request.form.get('note', '').strip()
    reason_code = request.form.get('reason_code', '').strip()
    employee_id = request.form.get('employee_id', 0, type=int) or None
    new_status  = request.form.get('status', '').strip()

    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    if not note_text:
        msg = str(_l('Note cannot be empty.'))
        if is_ajax:
            return jsonify({'error': msg}), 400
        flash(msg, 'danger')
        return redirect(url_for('invoices.index'))

    note = InvoiceNote(
        invoice_id=invoice_id,
        note=note_text,
        reason_code=reason_code or None,
        employee_id=employee_id,
    )
    db.session.add(note)

    # Optionally update invoice status
    if new_status and new_status in ('pending', 'resolved', 'in_progress', 'cancelled'):
        invoice.status = new_status

    db.session.commit()

    if is_ajax:
        return jsonify({
            'success': True,
            'note_id': note.id,
            'note_text': note_text,
            'reason_code': reason_code,
            'status': invoice.status,
            'created_at': note.created_at.strftime('%Y-%m-%d %H:%M'),
        })

    flash(_l('Note added to invoice %(inv)s.', inv=invoice.invoice_no), 'success')
    return redirect(url_for('invoices.index'))


@bp.route('/<int:invoice_id>/resolve', methods=['POST'])
def resolve(invoice_id):
    """Mark an invoice as resolved."""
    invoice = PendingInvoice.query.get_or_404(invoice_id)
    invoice.status = 'resolved'
    db.session.commit()

    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
    if is_ajax:
        return jsonify({'success': True, 'status': 'resolved'})

    flash(_l('Invoice %(inv)s marked as resolved.', inv=invoice.invoice_no), 'success')
    return redirect(url_for('invoices.index'))


@bp.route('/<int:invoice_id>')
def detail(invoice_id):
    """Invoice detail page with full note history."""
    invoice = PendingInvoice.query.get_or_404(invoice_id)
    notes = InvoiceNote.query.filter_by(invoice_id=invoice_id).order_by(
        InvoiceNote.created_at.desc()
    ).all()
    employees = Employee.query.filter_by(is_active=True).order_by(Employee.name).all()

    return render_template(
        'invoices/detail.html',
        invoice=invoice,
        notes=notes,
        employees=employees,
        reason_codes=REASON_CODES,
        page_title=_l('Invoice %(inv)s', inv=invoice.invoice_no),
    )
