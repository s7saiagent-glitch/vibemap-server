"""
analyze_sales.py — تحليل ملف مبيعات SAP ويطبع ملخص لشهر معين
الاستخدام:
  python analyze_sales.py path/to/file.xls
  python analyze_sales.py path/to/file.xls 2026 6
"""
import sys
import xml.etree.ElementTree as ET
from datetime import datetime
from collections import defaultdict

NS = {'ss': 'urn:schemas-microsoft-com:office:spreadsheet'}

COL_INVOICE  = 0
COL_ITEM     = 1
COL_DATE     = 3
COL_QTY      = 8
COL_INV_TYPE2= 10   # second Invoice Type (what we called lens_grade)
COL_PRICE    = 12
COL_RET_QTY  = 16
COL_RET_VAL  = 18
COL_VALUE    = 20
COL_INV_TYPE = 27

def _cell(row, idx):
    return row[idx].strip() if idx < len(row) else ''

def _parse_date(val):
    if not val:
        return None
    for fmt in ('%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d'):
        try:
            return datetime.strptime(val, fmt).date()
        except ValueError:
            pass
    return None

def _float(val):
    try:
        return float(val) if val else 0.0
    except:
        return 0.0

def parse(path):
    tree = ET.parse(path)
    root = tree.getroot()
    rows_data = []
    for ws in root.findall('.//ss:Worksheet', NS):
        table = ws.find('.//ss:Table', NS)
        if table is None:
            continue
        for row in table.findall('ss:Row', NS):
            cells = row.findall('ss:Cell', NS)
            cell_map = {}
            idx = 0
            for cell in cells:
                ia = cell.get('{urn:schemas-microsoft-com:office:spreadsheet}Index')
                if ia:
                    idx = int(ia) - 1
                d = cell.find('ss:Data', NS)
                cell_map[idx] = (d.text or '').strip() if d is not None else ''
                idx += 1
            max_col = max(cell_map.keys()) if cell_map else 0
            rows_data.append([cell_map.get(i, '') for i in range(max_col + 1)])
    return rows_data

def analyze(path, filter_year=None, filter_month=None):
    rows = parse(path)
    current_employee = None
    in_data = False
    records = []

    for row in rows:
        if not any(row):
            continue
        # Employee row
        if _cell(row, 0) == 'Sales' and _cell(row, 1):
            current_employee = _cell(row, 1)
            in_data = False
            continue
        # Header row
        if _cell(row, 0) == 'Invoice' and _cell(row, 1) == 'Item':
            in_data = True
            continue
        if not in_data or not current_employee:
            continue

        inv = _cell(row, COL_INVOICE)
        if not inv or not inv.isdigit():
            continue
        d = _parse_date(_cell(row, COL_DATE))
        if not d:
            continue
        if filter_year and d.year != filter_year:
            continue
        if filter_month and d.month != filter_month:
            continue

        val     = _float(_cell(row, COL_VALUE))
        ret_val = _float(_cell(row, COL_RET_VAL))
        ret_qty = _float(_cell(row, COL_RET_QTY))
        inv_type2 = _cell(row, COL_INV_TYPE2)
        inv_type  = _cell(row, COL_INV_TYPE)

        records.append({
            'emp':      current_employee,
            'inv':      inv,
            'item':     _cell(row, COL_ITEM),
            'date':     d,
            'val':      val,
            'ret_val':  ret_val,
            'ret_qty':  ret_qty,
            'inv_type2': inv_type2,
            'inv_type':  inv_type,
        })

    # ── Summary ──────────────────────────────────────────────────────
    print(f"\nTotal rows found: {len(records)}")

    total_val    = sum(r['val'] for r in records)
    total_ret    = sum(r['ret_val'] for r in records)
    net          = total_val - total_ret

    print(f"\n=== Value breakdown ===")
    print(f"  Sum of col20 (Value)     : {total_val:,.2f}")
    print(f"  Sum of col18 (Ret-VAL)   : {total_ret:,.2f}")
    print(f"  Net (Value - Ret-VAL)    : {net:,.2f}")

    # ── By Invoice Type (col10 / col27) ──────────────────────────────
    by_type = defaultdict(float)
    for r in records:
        by_type[r['inv_type'] or '(blank)'] += r['val'] - r['ret_val']
    print(f"\n=== By Invoice Type (col27) ===")
    for t, v in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"  {t:30s}  {v:,.2f}")

    by_type2 = defaultdict(float)
    for r in records:
        by_type2[r['inv_type2'] or '(blank)'] += r['val'] - r['ret_val']
    print(f"\n=== By col10 values ===")
    for t, v in sorted(by_type2.items(), key=lambda x: -x[1]):
        print(f"  {t:30s}  {v:,.2f}")

    # ── Rows with returns ─────────────────────────────────────────────
    ret_rows = [r for r in records if r['ret_val'] > 0]
    print(f"\n=== Return rows (col18 > 0): {len(ret_rows)} rows ===")
    for r in ret_rows[:20]:
        print(f"  {r['date']} | inv={r['inv']} item={r['item'][:20]} "
              f"val={r['val']:.2f} ret={r['ret_val']:.2f} "
              f"net={r['val']-r['ret_val']:.2f} type={r['inv_type']}")

    # ── By employee ───────────────────────────────────────────────────
    by_emp = defaultdict(float)
    for r in records:
        by_emp[r['emp']] += r['val'] - r['ret_val']
    print(f"\n=== Net by employee (col20 - col18) ===")
    for emp, v in sorted(by_emp.items(), key=lambda x: -x[1]):
        print(f"  {emp[:40]:40s}  {v:,.2f}")
    print(f"\n  TOTAL : {sum(by_emp.values()):,.2f}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('الاستخدام: python analyze_sales.py file.xls [year] [month]')
        sys.exit(1)
    path = sys.argv[1]
    year  = int(sys.argv[2]) if len(sys.argv) > 2 else None
    month = int(sys.argv[3]) if len(sys.argv) > 3 else None
    analyze(path, year, month)
