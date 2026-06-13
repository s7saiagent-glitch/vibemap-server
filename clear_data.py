"""
clear_data.py — يمسح جميع البيانات المستوردة ويُبقي البنية فارغة.
يحذف: المبيعات، الإنتاجية، الفواتير المعلقة، جودة الفواتير،
        الموظفين والأسماء المستعارة، سجلات الرفع.
يُبقي: إعدادات التطبيق (AppSetting) والأهداف والجداول.

الاستخدام:  python clear_data.py
"""
from app import create_app, db
from app.models import (
    SaleRecord, SalesProductivityRecord,
    PendingInvoice, InvoiceNote, InvoiceQualityRecord,
    Employee, EmployeeAlias, UploadBatch,
)

app = create_app()

with app.app_context():
    print('جاري مسح البيانات...')

    deleted = {}
    deleted['InvoiceQualityRecord'] = db.session.query(InvoiceQualityRecord).delete()
    deleted['InvoiceNote']          = db.session.query(InvoiceNote).delete()
    deleted['PendingInvoice']       = db.session.query(PendingInvoice).delete()
    deleted['SaleRecord']           = db.session.query(SaleRecord).delete()
    deleted['SalesProductivity']    = db.session.query(SalesProductivityRecord).delete()
    deleted['EmployeeAlias']        = db.session.query(EmployeeAlias).delete()
    deleted['Employee']             = db.session.query(Employee).delete()
    deleted['UploadBatch']          = db.session.query(UploadBatch).delete()

    db.session.commit()

    print('\nتم المسح بنجاح:')
    for table, count in deleted.items():
        print(f'  {table}: {count} سجل')

    print('\nالتطبيق جاهز لاستيراد بيانات جديدة.')
