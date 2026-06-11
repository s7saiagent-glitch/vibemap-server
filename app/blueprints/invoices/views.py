"""
Invoices blueprint – pending invoices list, filters, and notes.
"""
from datetime import date

from flask import (
    Blueprint, render_template, request, redirect,
    url_for, flash, jsonify,
)
from flask_babel import lazy_gettext as _l
from sqlalchemy import func

from app import db
from app.models import Employee, PendingInvoice, InvoiceNote, InvoiceQualityRecord

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


@bp.route('/discounts')
def discounts():
    """Invoices with discount > 0 – summary by employee and detail list."""
    employee_id = request.args.get('employee_id', 0, type=int)
    date_from_str = request.args.get('date_from', '')
    date_to_str = request.args.get('date_to', '')
    min_discount = request.args.get('min_discount', 0.0, type=float)
    page = request.args.get('page', 1, type=int)
    today = date.today()

    base_q = PendingInvoice.query.filter(PendingInvoice.discount > 0)
    if employee_id:
        base_q = base_q.filter(PendingInvoice.employee_id == employee_id)
    if date_from_str:
        try:
            base_q = base_q.filter(PendingInvoice.invoice_date >= date.fromisoformat(date_from_str))
        except ValueError:
            pass
    if date_to_str:
        try:
            base_q = base_q.filter(PendingInvoice.invoice_date <= date.fromisoformat(date_to_str))
        except ValueError:
            pass
    if min_discount > 0:
        base_q = base_q.filter(PendingInvoice.discount >= min_discount)

    invoices = base_q.order_by(PendingInvoice.discount.desc()).paginate(
        page=page, per_page=50, error_out=False
    )

    # Global stats (no filters – full picture)
    total_discount = db.session.query(func.sum(PendingInvoice.discount)).filter(
        PendingInvoice.discount > 0
    ).scalar() or 0.0
    total_discount_count = PendingInvoice.query.filter(PendingInvoice.discount > 0).count()
    avg_discount = (float(total_discount) / total_discount_count) if total_discount_count else 0.0

    by_employee = (
        db.session.query(
            Employee.name,
            func.count(PendingInvoice.id).label('cnt'),
            func.sum(PendingInvoice.discount).label('disc_total'),
            func.sum(PendingInvoice.net).label('net_total'),
        )
        .join(PendingInvoice, PendingInvoice.employee_id == Employee.id)
        .filter(PendingInvoice.discount > 0)
        .group_by(Employee.id)
        .order_by(func.sum(PendingInvoice.discount).desc())
        .all()
    )

    employees = Employee.query.filter_by(is_active=True).order_by(Employee.name).all()

    return render_template(
        'invoices/discounts.html',
        invoices=invoices,
        employees=employees,
        by_employee=by_employee,
        total_discount=float(total_discount),
        total_discount_count=total_discount_count,
        avg_discount=avg_discount,
        employee_id=employee_id,
        date_from=date_from_str,
        date_to=date_to_str,
        min_discount=min_discount,
        today=today,
        page_title=_l('Discounts Analysis'),
    )


@bp.route('/quality')
def quality():
    """Invoice quality records – scores, issues, and status."""
    employee_id  = request.args.get('employee_id', 0, type=int)
    status_filter = request.args.get('status', '')
    date_from_str = request.args.get('date_from', '')
    date_to_str   = request.args.get('date_to', '')
    page = request.args.get('page', 1, type=int)
    today = date.today()

    q = InvoiceQualityRecord.query
    if employee_id:
        q = q.filter(InvoiceQualityRecord.employee_id == employee_id)
    if status_filter:
        q = q.filter(InvoiceQualityRecord.status == status_filter)
    if date_from_str:
        try:
            q = q.filter(InvoiceQualityRecord.invoice_date >= date.fromisoformat(date_from_str))
        except ValueError:
            pass
    if date_to_str:
        try:
            q = q.filter(InvoiceQualityRecord.invoice_date <= date.fromisoformat(date_to_str))
        except ValueError:
            pass

    records = q.order_by(InvoiceQualityRecord.invoice_date.desc()).paginate(
        page=page, per_page=50, error_out=False
    )

    # Summary stats
    total_count = InvoiceQualityRecord.query.count()
    avg_score = db.session.query(func.avg(InvoiceQualityRecord.quality_score)).scalar() or 0.0
    low_quality = InvoiceQualityRecord.query.filter(
        InvoiceQualityRecord.quality_score < 70
    ).count() if total_count else 0

    # Subquery: customers served + discount per employee (from PendingInvoice)
    _cust_subq = (
        db.session.query(
            PendingInvoice.employee_id,
            func.count(func.distinct(PendingInvoice.customer_name)).label('cust_cnt'),
            func.sum(PendingInvoice.discount).label('disc_total'),
        )
        .filter(PendingInvoice.employee_id.isnot(None))
        .group_by(PendingInvoice.employee_id)
        .subquery()
    )

    # By employee summary with enriched stats
    by_employee = (
        db.session.query(
            Employee.name,
            func.count(InvoiceQualityRecord.id).label('cnt'),
            func.avg(InvoiceQualityRecord.quality_score).label('avg_score'),
            func.min(InvoiceQualityRecord.quality_score).label('min_score'),
            func.sum(
                db.case((InvoiceQualityRecord.quality_score < 70, 1), else_=0)
            ).label('low_cnt'),
            func.coalesce(_cust_subq.c.cust_cnt, 0).label('cust_cnt'),
            func.coalesce(_cust_subq.c.disc_total, 0).label('disc_total'),
        )
        .join(InvoiceQualityRecord, InvoiceQualityRecord.employee_id == Employee.id)
        .outerjoin(_cust_subq, _cust_subq.c.employee_id == Employee.id)
        .group_by(Employee.id, _cust_subq.c.cust_cnt, _cust_subq.c.disc_total)
        .order_by(func.avg(InvoiceQualityRecord.quality_score).desc())
        .all()
    )

    # Distinct statuses for filter
    statuses = [r[0] for r in db.session.query(
        InvoiceQualityRecord.status
    ).filter(InvoiceQualityRecord.status.isnot(None)).distinct().all()]

    employees = Employee.query.filter_by(is_active=True).order_by(Employee.name).all()

    return render_template(
        'invoices/quality.html',
        records=records,
        employees=employees,
        by_employee=by_employee,
        total_count=total_count,
        avg_score=round(float(avg_score), 1),
        low_quality=low_quality,
        statuses=statuses,
        employee_id=employee_id,
        status_filter=status_filter,
        date_from=date_from_str,
        date_to=date_to_str,
        today=today,
        page_title='جودة الفواتير',
    )


@bp.route('/quality/generate', methods=['POST'])
def generate_quality():
    """Compute InvoiceQualityRecord entries from existing PendingInvoice data."""
    today = date.today()

    # One row per unique invoice_no
    invoice_groups = (
        db.session.query(
            PendingInvoice.invoice_no,
            PendingInvoice.employee_id,
            PendingInvoice.invoice_date,
            PendingInvoice.status,
            PendingInvoice.branch,
            func.sum(PendingInvoice.discount).label('total_discount'),
            func.sum(PendingInvoice.net).label('total_net'),
        )
        .group_by(
            PendingInvoice.invoice_no,
            PendingInvoice.employee_id,
        )
        .all()
    )

    if not invoice_groups:
        flash('لا توجد فواتير معلقة لتوليد سجلات الجودة منها. ارفع ملف الفواتير أولاً.', 'warning')
        return redirect(url_for('invoices.quality'))

    created = updated = 0
    for grp in invoice_groups:
        # Count notes on invoices with this invoice_no
        note_count = (
            db.session.query(func.count(InvoiceNote.id))
            .join(PendingInvoice, InvoiceNote.invoice_id == PendingInvoice.id)
            .filter(PendingInvoice.invoice_no == grp.invoice_no)
            .scalar() or 0
        )

        score = 100.0
        issues = []

        if (grp.total_discount or 0) > 0:
            score -= 15
            issues.append('خصم مطبق')
            net = grp.total_net or 0
            if net > 0 and (grp.total_discount / net) > 0.15:
                score -= 10
                issues.append('خصم مرتفع')

        if note_count > 0:
            score -= min(note_count * 10, 30)
            issues.append(f'{note_count} ملاحظة')

        if grp.status == 'cancelled':
            score -= 20
            issues.append('ملغاة')
        elif grp.status == 'pending' and grp.invoice_date:
            days_old = (today - grp.invoice_date).days
            if days_old > 30:
                score -= 10
                issues.append(f'معلقة {days_old} يوم')

        if (grp.total_net or 0) == 0:
            score -= 10
            issues.append('مبلغ صفر')

        score = max(0.0, min(100.0, round(score, 1)))
        q_status = 'جيد' if score >= 80 else ('مقبول' if score >= 60 else 'ضعيف')

        existing = InvoiceQualityRecord.query.filter_by(invoice_no=grp.invoice_no).first()
        if existing:
            existing.quality_score = score
            existing.issues = '، '.join(issues) or None
            existing.status = q_status
            existing.employee_id = grp.employee_id
            existing.invoice_date = grp.invoice_date
            existing.branch = grp.branch
            updated += 1
        else:
            db.session.add(InvoiceQualityRecord(
                invoice_no=grp.invoice_no,
                employee_id=grp.employee_id,
                invoice_date=grp.invoice_date,
                quality_score=score,
                issues='، '.join(issues) or None,
                status=q_status,
                branch=grp.branch,
            ))
            created += 1

    db.session.commit()
    flash(f'تم توليد {created} سجل جديد وتحديث {updated} سجل موجود.', 'success')
    return redirect(url_for('invoices.quality'))


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
