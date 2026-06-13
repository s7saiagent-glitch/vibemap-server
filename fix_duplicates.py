"""
Run once to merge duplicate employee records that share the same SAP ID.
Usage: python fix_duplicates.py
"""
from collections import defaultdict
from app import create_app, db
from app.models import (Employee, EmployeeAlias, SaleRecord,
                        SalesProductivityRecord, PendingInvoice,
                        SalesTarget, Schedule)

app = create_app()

with app.app_context():
    groups = defaultdict(list)

    # Group by SAP ID
    for emp in Employee.query.filter(Employee.sap_id.isnot(None)).all():
        groups[emp.sap_id].append(emp)

    # Also group by normalized name (catch duplicates without SAP ID)
    name_groups = defaultdict(list)
    for emp in Employee.query.all():
        key = emp.name.strip().lower()
        name_groups[key].append(emp)

    merged = 0

    def merge_into(target, source):
        global merged
        print(f'  دمج: "{source.name}" (id={source.id}) → "{target.name}" (id={target.id})')
        SaleRecord.query.filter_by(employee_id=source.id).update({'employee_id': target.id})
        SalesProductivityRecord.query.filter_by(employee_id=source.id).update({'employee_id': target.id})
        PendingInvoice.query.filter_by(employee_id=source.id).update({'employee_id': target.id})
        SalesTarget.query.filter_by(employee_id=source.id).update({'employee_id': target.id})
        Schedule.query.filter_by(employee_id=source.id).update({'employee_id': target.id})

        for alias in list(source.aliases):
            exists = EmployeeAlias.query.filter_by(alias=alias.alias, employee_id=target.id).first()
            if not exists:
                alias.employee_id = target.id
            else:
                db.session.delete(alias)

        if source.name != target.name:
            if not EmployeeAlias.query.filter_by(alias=source.name, employee_id=target.id).first():
                db.session.add(EmployeeAlias(employee_id=target.id, alias=source.name))

        if not target.sap_id and source.sap_id:
            target.sap_id = source.sap_id

        db.session.delete(source)
        merged += 1

    # Merge by SAP ID
    processed_ids = set()
    for sap_id, emps in groups.items():
        if len(emps) < 2:
            continue
        emps.sort(key=lambda e: SaleRecord.query.filter_by(employee_id=e.id).count(), reverse=True)
        target = emps[0]
        print(f'\nتكرار بـ SAP ID={sap_id}:')
        for source in emps[1:]:
            merge_into(target, source)
            processed_ids.add(source.id)

    # Merge by identical name (catch remaining duplicates)
    for name_key, emps in name_groups.items():
        emps = [e for e in emps if e.id not in processed_ids]
        if len(emps) < 2:
            continue
        emps.sort(key=lambda e: SaleRecord.query.filter_by(employee_id=e.id).count(), reverse=True)
        target = emps[0]
        print(f'\nتكرار بالاسم "{target.name}":')
        for source in emps[1:]:
            merge_into(target, source)
            processed_ids.add(source.id)

    db.session.commit()

    if merged:
        print(f'\nتم دمج {merged} سجل مكرر بنجاح.')
    else:
        print('لا يوجد تكرار.')
