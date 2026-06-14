"""
Import parsed Excel data into the database with deduplication.

Deduplication strategy per type:
  sales_detail    – key: (invoice_no, item_code, sale_date, employee_id)
                    Load existing keys for the file date-range into a set → O(1) lookup.
  productivity    – key: (employee_id, product_category, period_from)
                    period_to intentionally excluded: uploading a wider date range
                    (e.g. 1-Jun → 13-Jun after 1-Jun → 9-Jun) should UPDATE,
                    not insert a duplicate row.
  pending_invoices – key: (invoice_no, item_code)
                    Loaded into a set for O(1) lookup; updates fields if found.
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
    """
    Import sales detail records.
    Dedup key: (invoice_no, item_code, sale_date, employee_id).

    Pre-aggregation: SAP may emit multiple rows per key (sale + return with
    same invoice_no) OR credit notes with a DIFFERENT invoice_no for the same
    item/date/employee.  We handle both by computing the net per group:
      net_value = sum(value) - sum(ret_val)
    Credit notes (different invoice_no) are stored as negative values so the
    daily sum naturally subtracts them, matching SAP's own daily totals.

    Returns (imported, skipped).
    """
    records = parsed.get('records', [])
    if not records:
        return 0, 0

    # ── resolve employees first (needed for grouping key) ────────────────────
    emp_cache: dict[str, 'Employee'] = {}
    for rec in records:
        name = rec.get('employee_name', '')
        if name and name not in emp_cache:
            emp_cache[name] = _get_or_create_employee(name, rec.get('sap_id'))

    # ── pre-aggregate: group rows by (invoice_no, item_code, date) ──────────
    # Key deliberately excludes employee_id: SAP files often contain a branch-
    # manager section that repeats every invoice already listed under individual
    # employees.  An invoice number is globally unique, so (invoice, item, date)
    # is sufficient and prevents that double-count.
    # Employee is taken from whichever row has the highest positive value
    # (i.e. the original salesperson's section, not a manager summary copy).
    aggs: dict[tuple, dict] = {}
    skipped_parse = 0

    for rec in records:
        if not rec.get('sale_date'):
            skipped_parse += 1
            continue
        emp = emp_cache.get(rec.get('employee_name', ''))
        if not emp:
            skipped_parse += 1
            continue
        key = (rec['invoice_no'], rec.get('item_code') or '', rec['sale_date'])

        val      = float(rec.get('value')    or 0)
        ret_val  = float(rec.get('ret_val')  or 0)
        ret_qty  = float(rec.get('ret_qty')  or 0)
        qty      = float(rec.get('qty')      or 0)
        discount = float(rec.get('discount') or 0)

        # SAP credit notes store the credit as negative col20 (val) instead of col18 (ret_val).
        # A negative val would never trigger max_value update → silently ignored → overcounting.
        if val < 0 and ret_val == 0:
            ret_val = abs(val)
            val = 0.0

        if key not in aggs:
            aggs[key] = {
                **rec,
                '_emp_id':     emp.id,
                '_max_value':  0.0,
                '_total_ret':  0.0,
                '_total_disc': 0.0,
                '_qty':        0.0,
                '_ret_qty':    0.0,
            }

        # Use the row with the highest positive value as the representative.
        # Also update _emp_id so the invoice is assigned to the employee whose
        # section had the original (non-summary) sale value.
        if val > aggs[key]['_max_value']:
            aggs[key]['_max_value'] = val
            aggs[key]['_emp_id'] = emp.id
            for field in ('description', 'product_category', 'price',
                          'invoice_type', 'lens_grade'):
                aggs[key][field] = rec.get(field, aggs[key].get(field))
            if qty > 0:
                aggs[key]['_qty'] = qty

        # Always accumulate returns and discounts
        aggs[key]['_total_ret']  = max(aggs[key]['_total_ret'], ret_val)
        aggs[key]['_total_disc'] = max(aggs[key]['_total_disc'], discount)
        if ret_qty > 0:
            aggs[key]['_ret_qty'] = max(aggs[key]['_ret_qty'], ret_qty)

    # Build net_records: net = highest_sale_value − returns − discounts
    net_records = []
    for key, agg in aggs.items():
        gross    = agg['_max_value']
        total_ret  = agg['_total_ret']
        total_disc = agg['_total_disc']
        net_value  = gross - total_ret - total_disc
        net_records.append((key, {
            **agg,
            'value':    net_value,
            'discount': total_disc,
            'ret_val':  total_ret,
            'ret_qty':  agg['_ret_qty'],
            'qty':      agg['_qty'],
        }))

    if not net_records:
        return 0, skipped_parse

    # ── determine date range ──────────────────────────────────────────────────
    valid_dates = [key[2] for key, _ in net_records]
    d_min, d_max = min(valid_dates), max(valid_dates)

    # ── pre-load existing DB keys for this date range ─────────────────────────
    existing_keys: set[tuple] = set(
        (r.invoice_no, r.item_code or '', r.sale_date)
        for r in db.session.query(
            SaleRecord.invoice_no, SaleRecord.item_code,
            SaleRecord.sale_date,
        ).filter(
            SaleRecord.sale_date >= d_min,
            SaleRecord.sale_date <= d_max,
        ).all()
    )

    imported = skipped = 0
    for key, rec in net_records:
        if key in existing_keys:
            skipped += 1
            continue
        existing_keys.add(key)
        db.session.add(SaleRecord(
            employee_id=rec['_emp_id'],
            invoice_no=rec['invoice_no'],
            item_code=rec.get('item_code', ''),
            sale_date=rec['sale_date'],
            description=rec.get('description', ''),
            product_category=rec.get('product_category', ''),
            qty=rec.get('qty', 0),
            price=rec.get('price', 0),
            value=rec.get('value', 0),
            discount=rec.get('discount', 0),
            ret_qty=rec.get('ret_qty', 0),
            ret_val=rec.get('ret_val', 0),
            invoice_type=rec.get('invoice_type', ''),
            lens_grade=rec.get('lens_grade'),
            branch=rec.get('branch', ''),
            source_file=rec.get('source_file', ''),
            upload_batch=rec.get('upload_batch', ''),
        ))
        imported += 1

    db.session.commit()
    return imported, skipped + skipped_parse


def import_productivity(parsed: dict) -> tuple[int, int]:
    """
    Import productivity summary records.
    Dedup key: (employee_id, product_category, period_from).
    period_to is deliberately excluded from the key: uploading a file that covers
    a wider range (e.g. 1–13 Jun after 1–9 Jun) updates the existing row instead
    of inserting a new duplicate.
    Returns (imported, skipped/updated).
    """
    records = parsed.get('records', [])
    if not records:
        return 0, 0

    # ── pre-load existing keys: (employee_id, product_category, period_from) ──
    existing: dict[tuple, SalesProductivityRecord] = {}
    for row in SalesProductivityRecord.query.all():
        k = (row.employee_id, row.product_category, row.period_from)
        existing[k] = row

    imported = skipped = 0
    for rec in records:
        if not rec.get('period_from'):
            skipped += 1
            continue

        emp = _get_or_create_employee(rec['employee_name'], rec.get('sap_id'))
        if not emp:
            skipped += 1
            continue

        k = (emp.id, rec['product_category'], rec['period_from'])

        if k in existing:
            # Update with the latest (wider) period data
            row = existing[k]
            row.period_to = rec['period_to']
            row.qty       = rec['qty']
            row.amount    = rec['amount']
            row.source_file   = rec.get('source_file', row.source_file)
            row.upload_batch  = rec.get('upload_batch', row.upload_batch)
            skipped += 1     # not a new row – reported as "skipped/updated"
            continue

        new_row = SalesProductivityRecord(
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
        db.session.add(new_row)
        existing[k] = new_row       # guard against intra-batch duplicates
        imported += 1

    db.session.commit()
    return imported, skipped


def import_pending_invoices(parsed: dict) -> tuple[int, int]:
    """
    Import pending invoice records.
    Dedup key: (invoice_no, item_code).
    If a matching record exists, its numeric fields are refreshed (price may change).
    Returns (imported, updated+skipped).
    """
    records = parsed.get('records', [])
    if not records:
        return 0, 0

    # ── pre-load existing full objects by (invoice_no, item_code) ────────────
    existing: dict[tuple, PendingInvoice] = {
        (r.invoice_no, r.item_code or ''): r
        for r in PendingInvoice.query.all()
    }

    imported = skipped = 0
    for rec in records:
        emp = _get_or_create_employee(rec['employee_name']) if rec.get('employee_name') else None
        key = (rec['invoice_no'], rec.get('item_code') or '')

        if key in existing:
            # Update mutable fields — price/discount may change between uploads
            row = existing[key]
            row.price    = rec.get('price', row.price)
            row.net      = rec.get('net', row.net)
            row.tax      = rec.get('tax', row.tax)
            row.discount = rec.get('discount', row.discount)
            if emp and not row.employee_id:
                row.employee_id = emp.id
            skipped += 1
            continue

        new_row = PendingInvoice(
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
        db.session.add(new_row)
        existing[key] = new_row   # guard against intra-batch duplicates
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
            existing.issues        = issues_text
            existing.status        = q_status
            existing.employee_id   = grp.employee_id
            existing.invoice_date  = grp.invoice_date
            existing.branch        = grp.branch
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
