"""
check_columns.py — اداة تشخيصية لفحص قيم الأعمدة في ملف XLS من SAP
الاستخدام: python check_columns.py path/to/file.xls

يطبع أول 30 صف مع أرقام الأعمدة وقيمها
"""
import sys
import xml.etree.ElementTree as ET

NS = {'ss': 'urn:schemas-microsoft-com:office:spreadsheet'}

def inspect_file(path, max_rows=40):
    tree = ET.parse(path)
    root = tree.getroot()
    worksheets = root.findall('.//ss:Worksheet', NS)

    for ws in worksheets:
        name = ws.get('{urn:schemas-microsoft-com:office:spreadsheet}Name', '')
        print(f'\n=== Sheet: {name} ===')
        table = ws.find('.//ss:Table', NS)
        if table is None:
            continue

        row_count = 0
        for row in table.findall('ss:Row', NS):
            cells = row.findall('ss:Cell', NS)
            cell_map = {}
            running_idx = 0
            for cell in cells:
                idx_attr = cell.get('{urn:schemas-microsoft-com:office:spreadsheet}Index')
                if idx_attr:
                    running_idx = int(idx_attr) - 1
                data = cell.find('ss:Data', NS)
                val = (data.text or '').strip() if data is not None else ''
                if val:
                    cell_map[running_idx] = val
                running_idx += 1

            if not cell_map:
                continue

            print(f'\nRow {row_count+1}:')
            for col_idx in sorted(cell_map.keys()):
                print(f'  col{col_idx:2d} = {cell_map[col_idx]!r}')

            row_count += 1
            if row_count >= max_rows:
                break

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('الاستخدام: python check_columns.py path/to/file.xls')
        sys.exit(1)
    inspect_file(sys.argv[1])
