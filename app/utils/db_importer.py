"""
Import parsed Excel data into the database with deduplication.
"""
from datetime import date as date_cls

from sqlalchemy import func

from app import db
from app.models import (Employee, EmployeeAlias, SaleRecord,
                        SalesProductivityRecord, PendingInvoice,
                        InvoiceNote, InvoiceQualityRecord)


def _get_or_create_employee(name: str, sap_id: str = None) -> Employee:
    if not name:
        return None
    name_clean = name.strip()
    emp = Employee.query.filter_by(name=name_clean).first()
    if emp:
        return emp
    alias = EmployeeAlias.query.filter_by(alias=name_clean).first()
    if alias:
        return alias.employee
    if sap_id:
        emp = Employee.query.filter_by(sap_id=sap_id).first()
        if emp:
            db.session.add(EmployeeAlias(employee_id=emp.id, alias=name_clean))
            return emp
    emp = Employee(name=name_clean, sap_id=sap_id or None)
    db.session.add(emp)
    db.session.flush()
    return emp


def import_sales_detail(parsed: dict) -> tuple[int, int]:
    """Import detail sale records. Returns (imported, skipped)."""
    imported = 0
    skipped = 0

    for rec in parsed['records']:
        emp = _get_or_create_employee(rec['employee_name'])
        if not emp:
            skipped += 1
            continue

        existing = SaleRecord.query.filter_by(
            invoice_no=rec['invoice_no'],
            item_code=rec['item_code'],
            sale_date=rec['sale_date'],
            employee_id=emp.id,
        ).first()

        if existing:
            skipped += 1
            continue

        sale = SaleRecord(
            employee_id=emp.id,
            invoice_no=rec['invoice_no'],
            item_code=rec['item_code'],
            sale_date=rec['sale_date'],
            description=rec['description'],
            product_category=rec['product_category'],
            qty=rec['qty'],
            price=rec['price'],
            value=rec['value'],
            ret_qty=rec['ret_qty'],
            ret_val=rec['ret_val'],
            invoice_type=rec.get('invoice_type', ''),
            branch=rec.get('branch', ''),
            source_file=rec.get('source_file', ''),
            upload_batch=rec.get('upload_batch', ''),
        )
        db.session.add(sale)
        imported += 1

    db.session.commit()
    return imported, skipped


def import_productivity(parsed: dict) -> tuple[int, int]:
    """Import productivity summary records."""
    imported = 0
    skipped = 0

    for rec in parsed['records']:
        emp = _get_or_create_employee(rec['employee_name'], rec.get('sap_id'))
        if not emp:
            skipped += 1
            continue

        existing = SalesProductivityRecord.query.filter_by(
            employee_id=emp.id,
            period_from=rec['period_from'],
            period_to=rec['period_to'],
            product_category=rec['product_category'],
        ).first()

        if existing:
            existing.qty = rec['qty']
            existing.amount = rec['amount']
            skipped += 1
            continue

        pr = SalesProductivityRecord(
            employee_id=emp.id,
            period_from=rec['period_from'],
            period_to=rec['period_to'],
            product_category=rec['product_category'],
            qty=rec['qty'],
            amount=rec['amount'],
            branch=rec.get('branch', ''),
            source_file=rec.get('source_file', ''),
            upload_batch=rec.get('upload_batch', ''),
        )
        db.session.add(pr)
        imported += 1

    db.session.commit()
    return imported, skipped


def import_pending_invoices(parsed: dict) -> tuple[int, int]:
    """Import pending invoice records."""
    imported = 0
    skipped = 0

    for rec in parsed['records']:
        emp = _get_or_create_employee(rec['employee_name']) if rec['employee_name'] else None

        existing = PendingInvoice.query.filter_by(
            invoice_no=rec['invoice_no'],
            item_code=rec.get('item_code', ''),
        ).first()

        if existing:
            skipped += 1
            continue

        inv = PendingInvoice(
            employee_id=emp.id if emp else None,
            invoice_no=rec['invoice_no'],
            invoice_date=rec.get('invoice_date'),
            item_code=rec.get('item_code', ''),
            description=rec.get('description', ''),
            price=rec.get('price', 0),
            net=rec.get('net', 0),
            tax=rec.get('tax', 0),
            discount=rec.get('discount', 0),
            branch=rec.get('branch', ''),
            source_file=rec.get('source_file', ''),
            upload_batch=rec.get('upload_batch', ''),
        )
        db.session.add(inv)
        imported += 1

    db.session.commit()
    _refresh_quality_records()
    return imported, skipped


def _refresh_quality_records():
    """Recompute InvoiceQualityRecord for all pending invoices."""
    today = date_cls.today()

    groups = (
        db.session.query(
            PendingInvoice.invoice_no,
            PendingInvoice.employee_id,
            PendingInvoice.invoice_date,
            PendingInvoice.status,
            PendingInvoice.branch,
            func.sum(PendingInvoice.discount).label('total_discount'),
            func.sum(PendingInvoice.net).label('total_net'),
        )
        .group_by(PendingInvoice.invoice_no, PendingInvoice.employee_id)
        .all()
    )

    for grp in groups:
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
        issues_text = '، '.join(issues) or None

        existing = InvoiceQualityRecord.query.filter_by(invoice_no=grp.invoice_no).first()
        if existing:
            existing.quality_score = score
            existing.issues = issues_text
            existing.status = q_status
            existing.employee_id = grp.employee_id
            existing.invoice_date = grp.invoice_date
            existing.branch = grp.branch
        else:
            db.session.add(InvoiceQualityRecord(
                invoice_no=grp.invoice_no,
                employee_id=grp.employee_id,
                invoice_date=grp.invoice_date,
                quality_score=score,
                issues=issues_text,
                status=q_status,
                branch=grp.branch,
            ))

    db.session.commit()
