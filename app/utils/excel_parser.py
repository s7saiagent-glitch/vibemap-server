"""
Parser for XML-based Excel files (.xls) from the Magrabi sales system.
Handles the real sparse-column layout where cells carry ss:Index attributes.
"""
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, date
from typing import Optional
import re

NS = {'ss': 'urn:schemas-microsoft-com:office:spreadsheet'}


def _parse_date(val: str) -> Optional[date]:
    if not val:
        return None
    val = val.strip()
    for fmt in ('%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d', '%d-%b-%Y', '%d/%m/%Y'):
        try:
            return datetime.strptime(val, fmt).date()
        except ValueError:
            pass
    return None


def _safe_float(val) -> float:
    try:
        v = float(val)
        return v
    except (ValueError, TypeError):
        return 0.0


def _clean_name(name: str) -> str:
    if not name:
        return ''
    name = re.sub(r'\s+', ' ', name.strip())
    # Remove leading SAP ID patterns: "4562 - Name" or "-5356 - Name"
    name = re.sub(r'^-?\d+\s*-\s*', '', name)
    return name.strip().title()


def _get_rows(path: str) -> list:
    """Parse XML Excel and return list of (sheet_name, [row_list]) tuples.
    Each row_list has cells at their actual column positions (sparse → dense with empty strings)."""
    tree = ET.parse(path)
    root = tree.getroot()
    worksheets = root.findall('.//ss:Worksheet', NS)
    all_sheets = []

    for ws in worksheets:
        sheet_name = ws.get('{urn:schemas-microsoft-com:office:spreadsheet}Name', 'Sheet1')
        table = ws.find('.//ss:Table', NS)
        if table is None:
            all_sheets.append((sheet_name, []))
            continue

        rows_data = []
        for row in table.findall('ss:Row', NS):
            cells = row.findall('ss:Cell', NS)
            cell_map = {}
            running_idx = 0
            max_idx = 0
            for cell in cells:
                idx_attr = cell.get('{urn:schemas-microsoft-com:office:spreadsheet}Index')
                if idx_attr:
                    running_idx = int(idx_attr) - 1  # convert to 0-based
                data = cell.find('ss:Data', NS)
                val = (data.text or '').strip() if data is not None else ''
                cell_map[running_idx] = val
                if running_idx > max_idx:
                    max_idx = running_idx
                running_idx += 1
            row_list = [cell_map.get(i, '') for i in range(max_idx + 1)]
            rows_data.append(row_list)
        all_sheets.append((sheet_name, rows_data))
    return all_sheets


def _cell(row: list, idx: int) -> str:
    return row[idx].strip() if idx < len(row) else ''


# ─────────────────────────────────────────────────────────────────────────────
# Parser: Sales Productivity Report (SALES_PRODUCTIVITY_REPORT type)
# Real column layout (discovered by inspection):
#   Row 2: branch name at col 0
#   Row 3: 'From' at col 0, period_from at col 4, 'To' at col 12, period_to at col 20
#   Row 4: category names at sparse column positions
#   Row 6: 'Salesman Name' at col 0, 'Sap Id' at col 2, then 'Qty'/'Amount' pairs
#   Row 7+: data rows
# ─────────────────────────────────────────────────────────────────────────────
def parse_productivity_report(path: str, batch_id: str = None) -> dict:
    if not batch_id:
        batch_id = str(uuid.uuid4())[:8]

    all_sheets = _get_rows(path)
    results = []
    period_from = None
    period_to = None
    branch = ''

    for sheet_name, rows in all_sheets:
        categories = {}      # col_idx -> category_name
        qty_cols = []        # list of col_idx for Qty
        amount_cols = []     # list of col_idx for Amount
        cat_col_pairs = []   # list of (qty_col, amount_col, category_name)

        for i, row in enumerate(rows):
            if not any(row):
                continue

            row_str = ' '.join(row)

            # Branch
            if not branch:
                for cell in row:
                    if ('JED' in cell or 'Abhour' in cell or 'Magrabi' in cell) and 'Report' not in cell:
                        branch = cell
                        break

            # Period – look for 'From' keyword; date follows after some empty cells
            if _cell(row, 0) == 'From ' or _cell(row, 0) == 'From':
                # Find the date after 'From'
                for j in range(1, len(row)):
                    if row[j] and 'T' in row[j] and period_from is None:
                        period_from = _parse_date(row[j])
                        break
                for j in range(len(row) - 1, 0, -1):
                    if row[j] and 'T' in row[j] and period_to is None:
                        period_to = _parse_date(row[j])
                        break
                continue

            # Category header row – contains product category names
            if any(cat in row_str for cat in ['Contact lenses', 'FINISHED LENSES', 'FRAMEs', 'SUNGLASSES', 'Services']):
                for j, cell in enumerate(row):
                    if cell and cell not in ('', 'Salesman Name ', 'Sap Id', 'Qty', 'Amount'):
                        categories[j] = cell
                continue

            # Sub-header row with 'Sap Id', 'Qty', 'Amount'
            if 'Sap Id' in row_str or 'SAP ID' in row_str.upper():
                qty_cols = [j for j, c in enumerate(row) if c.strip() == 'Qty']
                amount_cols = [j for j, c in enumerate(row) if c.strip() == 'Amount']
                # Build pairs using category columns: find nearest category col <= qty_col
                for q_col, a_col in zip(qty_cols, amount_cols):
                    # Find the category whose column is closest and <= q_col
                    cat_name = ''
                    best_dist = 999
                    for cat_col, cat_name_val in categories.items():
                        dist = q_col - cat_col
                        if 0 <= dist < best_dist:
                            best_dist = dist
                            cat_name = cat_name_val
                    cat_col_pairs.append((q_col, a_col, cat_name))
                continue

            # Data rows: employee name at col 0, SAP ID at col 2
            emp_name_raw = _cell(row, 0)
            if not emp_name_raw:
                continue
            if emp_name_raw in ('Salesman Name ', 'Salesman Name', 'Grand Total', 'Total'):
                if emp_name_raw in ('Total', 'Grand Total'):
                    cat_col_pairs = []  # stop parsing; summary section follows
                continue
            # Skip rows that are not employee data (header rows etc.)
            if not cat_col_pairs:
                continue

            emp_name = _clean_name(emp_name_raw)
            sap_id = _cell(row, 2)

            for q_col, a_col, cat_name in cat_col_pairs:
                qty = _safe_float(_cell(row, q_col))
                amount = _safe_float(_cell(row, a_col))
                if amount != 0 or qty != 0:
                    results.append({
                        'employee_name': emp_name,
                        'sap_id': sap_id,
                        'product_category': cat_name,
                        'qty': qty,
                        'amount': amount,
                        'period_from': period_from,
                        'period_to': period_to,
                        'branch': branch,
                        'source_file': path,
                        'upload_batch': batch_id,
                    })

    return {
        'records': results,
        'period_from': period_from,
        'period_to': period_to,
        'branch': branch,
        'batch_id': batch_id,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Parser: Sales Detail Report (19.xls style)
# Real column layout:
#   Row 1: company name
#   Row 2: report title
#   Row 3: branch
#   Row 4: 'From' at col 0, date at col 7, 'To' at col 14, date at col 21
#   Row 5: 'Sales' at col 0, 'SAP_ID - Employee Name' at col 1
#   Row 6: '' at col 0, 'Group' at col 5, category at col 8
#   Row 7: headers (Invoice, Item, Date, Description, QTY, Invoice Type, Price...)
#   Row 8+: data: col0=invoice, col1=item, col3=date, col5=desc, col8=qty,
#                  col12=price, col16=ret_qty, col18=ret_val, col20=value, col27=inv_type
# ─────────────────────────────────────────────────────────────────────────────
def parse_sales_detail_report(path: str, batch_id: str = None) -> dict:
    if not batch_id:
        batch_id = str(uuid.uuid4())[:8]

    all_sheets = _get_rows(path)
    results = []
    employees_found = set()
    period_from = None
    period_to = None
    branch = ''

    # Column indices discovered by inspection
    COL_INVOICE = 0
    COL_ITEM = 1
    COL_DATE = 3
    COL_DESC = 5
    COL_QTY = 8
    COL_LENS_GRADE = 10   # Good / Best / Better / Best+ (RX lenses only)
    COL_PRICE = 12
    COL_DISCOUNT = 14     # Discount amount per line (if present)
    COL_RET_QTY = 16
    COL_RET_VAL = 18
    COL_VALUE = 20
    COL_INV_TYPE = 27

    for sheet_name, rows in all_sheets:
        current_employee = None
        current_sap_id = None
        current_category = None
        in_data = False

        for i, row in enumerate(rows):
            if not any(row):
                continue

            row_str = ' '.join(row)

            # Branch
            if not branch:
                for cell in row:
                    if 'JED' in cell or 'Abhour' in cell:
                        branch = cell
                        break

            # Period row: 'From' at col 0, date at col 7, 'To' at col 14, date at col 21
            if _cell(row, 0) == 'From':
                # Find first and last date values
                dates_in_row = [(j, v) for j, v in enumerate(row) if v and 'T' in v]
                if len(dates_in_row) >= 1:
                    period_from = _parse_date(dates_in_row[0][1])
                if len(dates_in_row) >= 2:
                    period_to = _parse_date(dates_in_row[-1][1])
                continue

            # Employee section header: col 0 = 'Sales', col 1 = 'SAP_ID - Name'
            if _cell(row, 0) == 'Sales' and len(row) > 1 and _cell(row, 1):
                emp_raw = _cell(row, 1)
                current_employee = _clean_name(emp_raw)
                # Extract SAP ID from "NNNN - Name" prefix
                m = re.match(r'^(-?\d+)\s*-\s*', emp_raw.strip())
                current_sap_id = m.group(1).lstrip('-') if m else None
                if current_employee:
                    employees_found.add(current_employee)
                in_data = False
                current_category = None
                continue

            # Category/Group row: col 5 = 'Group', col 8 = 'XX - Category Name'
            if _cell(row, 5) == 'Group' and len(row) > 8:
                cat_raw = _cell(row, 8)
                parts = cat_raw.split(' - ', 1)
                current_category = parts[-1].strip() if parts else cat_raw
                continue

            # Column header row
            if _cell(row, 0) == 'Invoice' and _cell(row, 1) == 'Item':
                in_data = True
                continue

            # Skip if not in data mode
            if not in_data or not current_employee:
                continue

            # Skip total/blank rows
            invoice_no = _cell(row, COL_INVOICE)
            if not invoice_no or invoice_no in ('Total', 'Grand Total', 'Invoice', ' '):
                continue
            if not invoice_no.isdigit():
                continue

            sale_date_str = _cell(row, COL_DATE)
            sale_date = _parse_date(sale_date_str)
            if not sale_date:
                continue

            results.append({
                'employee_name': current_employee,
                'sap_id': current_sap_id,
                'invoice_no': invoice_no,
                'item_code': _cell(row, COL_ITEM),
                'sale_date': sale_date,
                'description': _cell(row, COL_DESC),
                'product_category': current_category or '',
                'qty': _safe_float(_cell(row, COL_QTY)),
                'price': _safe_float(_cell(row, COL_PRICE)),
                'discount': _safe_float(_cell(row, COL_DISCOUNT)),
                'value': _safe_float(_cell(row, COL_VALUE)),
                'ret_qty': _safe_float(_cell(row, COL_RET_QTY)),
                'ret_val': _safe_float(_cell(row, COL_RET_VAL)),
                'invoice_type': _cell(row, COL_INV_TYPE),
                'lens_grade': _cell(row, COL_LENS_GRADE) or None,
                'branch': branch,
                'source_file': path,
                'upload_batch': batch_id,
            })

    return {
        'records': results,
        'employees': list(employees_found),
        'period_from': period_from,
        'period_to': period_to,
        'branch': branch,
        'batch_id': batch_id,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Parser: Pending Invoice Details
# Real column layout:
#   Invoice header rows: col 1 = invoice_no, col 5 = date, col 8 = 'SAP_ID - Customer'
#   Employee is embedded in the invoice header pattern '-SAP_ID - EMPLOYEE NAME'
#   Item rows: col 0 = item_code, col 1 = description, col 5 = price, col 8 = net, col 11 = tax, col 15 = discount
# ─────────────────────────────────────────────────────────────────────────────
def parse_pending_invoices(path: str, batch_id: str = None) -> dict:
    if not batch_id:
        batch_id = str(uuid.uuid4())[:8]

    all_sheets = _get_rows(path)
    results = []
    branch = ''
    period_to = None

    COL_INV_NO = 1
    COL_INV_DATE = 5
    COL_CUSTOMER = 8
    COL_ITEM = 0
    COL_DESC = 1
    COL_PRICE = 5
    COL_NET = 8
    COL_TAX = 11
    COL_DISCOUNT = 15

    for sheet_name, rows in all_sheets:
        current_invoice_no = None
        current_invoice_date = None
        current_employee = None
        current_customer = None

        for i, row in enumerate(rows):
            if not any(row):
                continue

            # Branch
            if not branch:
                for cell in row:
                    if 'JED' in cell or 'Abhour' in cell:
                        branch = cell
                        break

            # Period
            if not period_to:
                dates_in_row = [(j, v) for j, v in enumerate(row) if v and 'T' in v and '-' in v]
                if dates_in_row:
                    period_to = _parse_date(dates_in_row[-1][1])

            # Invoice header: col 1 is numeric invoice number, col 5 is a date
            inv_raw = _cell(row, COL_INV_NO)
            date_raw = _cell(row, COL_INV_DATE)
            customer_raw = _cell(row, COL_CUSTOMER)

            if inv_raw.isdigit() and _parse_date(date_raw):
                current_invoice_no = inv_raw
                current_invoice_date = _parse_date(date_raw)
                # Customer raw may be "SAP_ID - Customer Name" or "-SAP_ID - EMPLOYEE NAME"
                current_customer = customer_raw
                # Employee SAP IDs are short (4-5 digits), sometimes prefixed with '-'
                # Customer IDs are long (7+ digits like 1152220, 203319261)
                # Pattern: "-5356 - BADWR RAMZI ALASYRI" → employee
                #          "1152220 - RABIAA MOHAMED"    → customer, NOT employee
                m = re.match(r'^(-?\d+)\s*-\s*(.+)$', customer_raw)
                if m and len(m.group(1).lstrip('-')) <= 5:
                    current_employee = _clean_name(customer_raw)
                else:
                    current_employee = None
                continue

            # Item detail row: col 0 = item_code (long number or alphanumeric)
            item_raw = _cell(row, COL_ITEM)
            desc_raw = _cell(row, COL_DESC)

            if (item_raw and item_raw not in ('Item#', '', 'Invoice No.') and
                    desc_raw and desc_raw not in ('Description', 'Invoice No.', '') and
                    current_invoice_no):
                # Skip header/blank rows
                if item_raw.lower() in ('item#', 'description', 'invoice', ''):
                    continue

                results.append({
                    'employee_name': current_employee or '',
                    'invoice_no': current_invoice_no,
                    'invoice_date': current_invoice_date,
                    'item_code': item_raw,
                    'description': desc_raw,
                    'price': _safe_float(_cell(row, COL_PRICE)),
                    'net': _safe_float(_cell(row, COL_NET)),
                    'tax': _safe_float(_cell(row, COL_TAX)),
                    'discount': _safe_float(_cell(row, COL_DISCOUNT)),
                    'branch': branch,
                    'source_file': path,
                    'upload_batch': batch_id,
                })

    return {
        'records': results,
        'branch': branch,
        'period_to': period_to,
        'batch_id': batch_id,
    }
