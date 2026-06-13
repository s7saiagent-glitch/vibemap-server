from datetime import datetime
from app import db


class Employee(db.Model):
    __tablename__ = 'employees'
    id = db.Column(db.Integer, primary_key=True)
    sap_id = db.Column(db.String(20), unique=True, nullable=True)
    name = db.Column(db.String(100), nullable=False)
    name_ar = db.Column(db.String(100), nullable=True)
    is_locked = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    aliases = db.relationship('EmployeeAlias', backref='employee', lazy=True, cascade='all, delete-orphan')
    sales = db.relationship('SaleRecord', backref='employee', lazy='dynamic')
    targets = db.relationship('SalesTarget', backref='employee', lazy='dynamic')
    schedules = db.relationship('Schedule', backref='employee', lazy='dynamic')
    pending_invoices = db.relationship('PendingInvoice', backref='employee', lazy='dynamic')

    def __repr__(self):
        return f'<Employee {self.name}>'


class EmployeeAlias(db.Model):
    __tablename__ = 'employee_aliases'
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    alias = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class SaleRecord(db.Model):
    __tablename__ = 'sale_records'
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    invoice_no = db.Column(db.String(30), nullable=True)
    item_code = db.Column(db.String(50), nullable=True)
    sale_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    product_category = db.Column(db.String(100), nullable=True)
    qty = db.Column(db.Float, default=0)
    price = db.Column(db.Float, default=0)
    value = db.Column(db.Float, default=0)
    ret_qty = db.Column(db.Float, default=0)
    ret_val = db.Column(db.Float, default=0)
    invoice_type = db.Column(db.String(50), nullable=True)
    lens_grade = db.Column(db.String(20), nullable=True)
    region = db.Column(db.String(100), nullable=True)
    branch = db.Column(db.String(100), nullable=True)
    source_file = db.Column(db.String(255), nullable=True)
    upload_batch = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('invoice_no', 'item_code', 'sale_date', 'employee_id', name='uq_sale_record'),
    )


class SalesProductivityRecord(db.Model):
    """Aggregated productivity summary per employee per period"""
    __tablename__ = 'sales_productivity'
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    period_from = db.Column(db.Date, nullable=False)
    period_to = db.Column(db.Date, nullable=False)
    product_category = db.Column(db.String(100), nullable=False)
    qty = db.Column(db.Float, default=0)
    amount = db.Column(db.Float, default=0)
    branch = db.Column(db.String(100), nullable=True)
    source_file = db.Column(db.String(255), nullable=True)
    upload_batch = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    employee = db.relationship('Employee', backref=db.backref('productivity_records', lazy='dynamic'))


class SalesTarget(db.Model):
    __tablename__ = 'sales_targets'
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    month = db.Column(db.Integer, nullable=False)
    target_amount = db.Column(db.Float, default=0)
    percentage = db.Column(db.Float, default=0)
    working_days = db.Column(db.Integer, default=26)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('employee_id', 'year', 'month', name='uq_target'),
    )


class CompanyTarget(db.Model):
    __tablename__ = 'company_targets'
    id = db.Column(db.Integer, primary_key=True)
    year = db.Column(db.Integer, nullable=False)
    month = db.Column(db.Integer, nullable=False)
    total_target = db.Column(db.Float, default=0)
    branch = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('year', 'month', 'branch', name='uq_company_target'),
    )


class PendingInvoice(db.Model):
    __tablename__ = 'pending_invoices'
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=True)
    invoice_no = db.Column(db.String(30), nullable=False)
    invoice_date = db.Column(db.Date, nullable=True)
    customer_name = db.Column(db.String(200), nullable=True)
    item_code = db.Column(db.String(50), nullable=True)
    description = db.Column(db.String(255), nullable=True)
    price = db.Column(db.Float, default=0)
    net = db.Column(db.Float, default=0)
    tax = db.Column(db.Float, default=0)
    discount = db.Column(db.Float, default=0)
    status = db.Column(db.String(30), default='pending')
    branch = db.Column(db.String(100), nullable=True)
    source_file = db.Column(db.String(255), nullable=True)
    upload_batch = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.relationship('InvoiceNote', backref='invoice', lazy=True, cascade='all, delete-orphan')


class InvoiceNote(db.Model):
    __tablename__ = 'invoice_notes'
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('pending_invoices.id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=True)
    note = db.Column(db.Text, nullable=False)
    reason_code = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    employee = db.relationship('Employee')


class InvoiceQualityRecord(db.Model):
    __tablename__ = 'invoice_quality'
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=True)
    invoice_no = db.Column(db.String(30), nullable=False)
    invoice_date = db.Column(db.Date, nullable=True)
    quality_score = db.Column(db.Float, nullable=True)
    issues = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), nullable=True)
    branch = db.Column(db.String(100), nullable=True)
    source_file = db.Column(db.String(255), nullable=True)
    upload_batch = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    employee = db.relationship('Employee', backref=db.backref('quality_records', lazy='dynamic'))


class Schedule(db.Model):
    __tablename__ = 'schedules'
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    shift = db.Column(db.String(30), nullable=True)
    start_time = db.Column(db.String(10), nullable=True)
    end_time = db.Column(db.String(10), nullable=True)
    is_working = db.Column(db.Boolean, default=True)
    notes = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('employee_id', 'date', name='uq_schedule'),
    )


class SavedFilter(db.Model):
    __tablename__ = 'saved_filters'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    filter_data = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class UploadBatch(db.Model):
    __tablename__ = 'upload_batches'
    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.String(50), unique=True, nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(30), nullable=False)
    records_imported = db.Column(db.Integer, default=0)
    records_skipped = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='processing')
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class AppSetting(db.Model):
    __tablename__ = 'app_settings'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
