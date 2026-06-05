"""
Import parsed Excel data into the database with deduplication.
"""
from app import db
from app.models import (Employee, EmployeeAlias, SaleRecord,
                        SalesProductivityRecord, PendingInvoice,
                        UploadBatch)


def _get_or_create_employee(name: str, sap_id: str = None) -> Employee:
    if not name:
        return None
    name_clean = name.strip()
    # Search by exact name
    emp = Employee.query.filter_by(name=name_clean).first()
    if emp:
        return emp
    # Search by alias
    alias = EmployeeAlias.query.filter_by(alias=name_clean).first()
    if alias:
        return alias.employee
    # Search by SAP ID
    if sap_id:
        emp = Employee.query.filter_by(sap_id=sap_id).first()
        if emp:
            # Add alias
            db.session.add(EmployeeAlias(employee_id=emp.id, alias=name_clean))
            return emp
    # Create new employee
    emp = Employee(name=name_clean, sap_id=sap_id or None)
    db.session.add(emp)
    db.session.flush()
    return emp


def import_sales_detail(parsed: dict) -> tuple[int, int]:
    """Import detail sale records. Returns (imported, skipped)."""
    imported = 0
    skipped = 0

    batch_record = UploadBatch(
        batch_id=parsed['batch_id'],
        filename=parsed['records'][0]['source_file'] if parsed['records'] else 'unknown',
        file_type='sales_detail',
        status='processing',
    )
    db.session.add(batch_record)

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

    batch_record.records_imported = imported
    batch_record.records_skipped = skipped
    batch_record.status = 'done'
    db.session.commit()
    return imported, skipped


def import_productivity(parsed: dict) -> tuple[int, int]:
    """Import productivity summary records."""
    imported = 0
    skipped = 0

    batch_record = UploadBatch(
        batch_id=parsed['batch_id'],
        filename=parsed['records'][0]['source_file'] if parsed['records'] else 'unknown',
        file_type='productivity',
        status='processing',
    )
    db.session.add(batch_record)

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

    batch_record.records_imported = imported
    batch_record.records_skipped = skipped
    batch_record.status = 'done'
    db.session.commit()
    return imported, skipped


def import_pending_invoices(parsed: dict) -> tuple[int, int]:
    """Import pending invoice records."""
    imported = 0
    skipped = 0

    batch_record = UploadBatch(
        batch_id=parsed['batch_id'],
        filename=parsed['records'][0]['source_file'] if parsed['records'] else 'unknown',
        file_type='pending_invoices',
        status='processing',
    )
    db.session.add(batch_record)

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

    batch_record.records_imported = imported
    batch_record.records_skipped = skipped
    batch_record.status = 'done'
    db.session.commit()
    return imported, skipped
