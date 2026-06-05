# ساهس برو | Sahs Pro
## Sales Analysis & Performance Tracking System

نظام متكامل لتحليل المبيعات وتتبع الأداء مع واجهة ثنائية اللغة (عربي / إنجليزي).

---

## المميزات الرئيسية

- **رفع ملفات Excel** متعددة (تقارير مبيعات، فواتير معلقة، جودة الفواتير)
- **لوحة تحكم شاملة** مع KPIs وتقدم الأهداف اليومية لكل موظف
- **إدارة الأهداف** الشهرية وتوزيعها بالنسب المئوية
- **تقارير متقدمة**: فعلي مقابل الهدف، مقارنة أسبوعية، تحليل الموظف
- **الفواتير المعلقة** مع إمكانية إضافة ملاحظات
- **المساعد الذكي "ساهس برو"** للإجابة على الاستفسارات
- **جدول المناوبات** للموظفين
- **تصدير Excel وطباعة وإرسال بريد** لجميع التقارير
- **واجهة ثنائية اللغة** (العربية RTL + الإنجليزية LTR)

---

## متطلبات التشغيل

- Python 3.11+
- SQLite (مدمج) أو PostgreSQL

---

## تثبيت المشروع

```bash
# 1. استنساخ المشروع
git clone <repo-url>
cd vibemap-server

# 2. إنشاء بيئة افتراضية
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# 3. تثبيت المتطلبات
pip install -r requirements.txt

# 4. إعداد المتغيرات البيئية
cp .env.example .env
# قم بتعديل .env وإضافة بياناتك

# 5. تهيئة قاعدة البيانات
flask db init
flask db migrate -m "initial"
flask db upgrade

# 6. تجميع ملفات الترجمة
pybabel compile -d translations

# 7. تشغيل التطبيق
flask run
# أو للإنتاج:
gunicorn wsgi:app
```

---

## هيكل قاعدة البيانات

### جداول رئيسية:

| الجدول | الوصف |
|--------|-------|
| `employees` | بيانات الموظفين الموحدة |
| `employee_aliases` | الأسماء البديلة للموظفين |
| `sale_records` | سجلات المبيعات التفصيلية |
| `sales_productivity` | ملخصات الإنتاجية حسب الفئة |
| `sales_targets` | الأهداف الشهرية لكل موظف |
| `company_targets` | الأهداف الإجمالية للشركة |
| `pending_invoices` | الفواتير المعلقة |
| `invoice_notes` | ملاحظات الموظفين على الفواتير |
| `invoice_quality` | سجلات جودة الفواتير |
| `schedules` | جداول المناوبات |
| `saved_filters` | الفلاتر المحفوظة |
| `upload_batches` | سجل ملفات الرفع |
| `app_settings` | إعدادات التطبيق |

---

## أنواع ملفات Excel المدعومة

| نوع الملف | نمط الاسم | الوصف |
|-----------|-----------|-------|
| تقرير إنتاجية | `SALES_PRODUCTIVITY_REPORT*.xls` | ملخص مبيعات حسب الفئة لكل موظف |
| تفاصيل مبيعات | `19.xls` أو أي تقرير تفصيلي | فواتير مبيعات تفصيلية لكل موظف |
| فواتير معلقة | `*pendingInvoice*.xls` | تقرير الفواتير المعلقة |

---

## المتغيرات البيئية

```env
FLASK_ENV=production
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///instance/sales.db  # أو رابط PostgreSQL
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
OPENAI_API_KEY=  # اختياري للمساعد الذكي
WORKING_DAYS_PER_MONTH=26
```

---

## نشر Docker

```bash
docker build -t sahs-pro .
docker run -p 5000:5000 --env-file .env sahs-pro
```

---

## نشر على Heroku / Railway / Render

```bash
# Heroku
heroku create
heroku config:set SECRET_KEY=...
git push heroku main

# Railway / Render: ارفع الكود وأضف المتغيرات البيئية من لوحة التحكم
```

---

## واجهة برمجة التطبيقات (API)

| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/api/employee/<id>/monthly-sales` | GET | بيانات المبيعات الشهرية |
| `/api/employee/<id>/category-breakdown` | GET | توزيع حسب فئة المنتج |
| `/api/dashboard/kpis` | GET | مؤشرات الأداء الرئيسية |
| `/api/targets/chart` | GET | بيانات مخطط الأهداف |

---

## الدعم والمساهمة

لإضافة ميزات أو الإبلاغ عن مشاكل، يرجى فتح Issue في المستودع.

---

**تم التطوير بواسطة ساهس برو - 2026**
