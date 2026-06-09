"""
البدوي برو – مساعد ذكي لتحليل بيانات المبيعات.
يجيب على أي سؤال عن الموظفين، المبيعات، الأهداف، والفواتير.
"""
import re
from datetime import date, timedelta
import calendar

from sqlalchemy import func

from app import db
from app.models import (
    Employee, SaleRecord, SalesTarget, CompanyTarget,
    PendingInvoice, SalesProductivityRecord,
)

# ─── helpers ──────────────────────────────────────────────────────────────────

def _fmt(n) -> str:
    try:
        return f'{float(n):,.0f}'
    except Exception:
        return '0'


def _pct(achieved, target) -> float:
    if not target:
        return 0.0
    return round(float(achieved) / float(target) * 100, 1)


def _sales_between(d_from, d_to, employee_id=None) -> float:
    q = db.session.query(func.sum(SaleRecord.value)).filter(
        SaleRecord.sale_date >= d_from,
        SaleRecord.sale_date <= d_to,
    )
    if employee_id:
        q = q.filter(SaleRecord.employee_id == employee_id)
    return float(q.scalar() or 0)


def _this_month():
    t = date.today()
    last = calendar.monthrange(t.year, t.month)[1]
    return date(t.year, t.month, 1), date(t.year, t.month, last)


def _this_week():
    t = date.today()
    days_since_sun = (t.weekday() + 1) % 7
    start = t - timedelta(days=days_since_sun)
    return start, start + timedelta(days=6)


def _extract_employee_from_q(question: str):
    """Match any active employee name found inside the question text."""
    employees = Employee.query.filter_by(is_active=True).all()
    best = None
    best_len = 0
    for emp in employees:
        tokens = [emp.name] + emp.name.split()
        for token in tokens:
            if len(token) > 2 and token in question and len(token) > best_len:
                best = emp
                best_len = len(token)
    remainder = question.replace(best.name, '').strip() if best else question
    return best, remainder


# ─── intent patterns ───────────────────────────────────────────────────────────

PATTERNS = [
    # help
    (r'^مساعد|^مساعدة|^help$|^وش تعرف|^ماذا تعرف|^شو تعرف',
     '_show_help'),
    # employees list
    (r'قائمة الموظف|كل الموظف|جميع الموظف|عدد الموظف|list.*employee|all employee',
     '_employees_list'),
    # top sellers
    (r'أفضل|الأول|أكثر.*مبيع|top.*sell|best.*sell|أعلى.*مبيع|من.*باع|مين.*باع',
     '_top_sellers'),
    # today
    (r'اليوم|today',
     '_today_stats'),
    # this week
    (r'هذا الأسبوع|الأسبوع الحالي|أسبوع.*حالي|this week|أسبوع',
     '_week_stats'),
    # pending invoices – match both فاتورة/فواتير roots
    (r'فاتور|فواتير|pending invoice|معلق.*فاتور|فاتور.*معلق',
     '_pending_invoices_summary'),
    # oldest invoices
    (r'قديم.*فاتور|أقدم|oldest invoice',
     '_oldest_invoices'),
    # remaining target
    (r'متبقي|باقي.*هدف|هدف.*باقي|remaining.*target|يومي.*مستهدف|هدف.*يومي|كم.*هدف|هدف.*كم',
     '_remaining_targets'),
    # achievement
    (r'نسبة|إنجاز|تحقيق.*هدف|هدف.*تحقيق|achievement|progress',
     '_achievement_overview'),
    # ranking
    (r'ترتيب|مقارنة|ranking|compare|أضعف|أقل.*مبيع|من.*أقل',
     '_employee_ranking'),
    # products
    (r'منتج|product|فئة|category|صنف|item',
     '_product_analysis'),
    # productivity
    (r'إنتاج|productivity|كفاء',
     '_productivity_summary'),
    # monthly / general sales
    (r'مبيعات|sales|شهر|month|ملخص|summary|إجمالي|total|أداء',
     '_monthly_summary'),
    # employee catch-all
    (r'موظف|employee',
     '_employee_query'),
]


# ─── assistant class ───────────────────────────────────────────────────────────

class AlQahtaniPro:

    def answer(self, question: str, lang: str = 'ar') -> str:
        q = question.strip()
        if not q:
            return self._help_message()

        emp, remainder = _extract_employee_from_q(q)

        # Question is just an employee name → full profile
        if emp and len(remainder) < 4:
            return self._employee_profile(emp)

        for pattern, method_name in PATTERNS:
            if re.search(pattern, q, re.IGNORECASE | re.UNICODE):
                handler = getattr(self, method_name)
                try:
                    result = handler(q, emp=emp)
                    if result:
                        return result
                except Exception:
                    pass

        return self._monthly_summary(q)

    # ── handlers ───────────────────────────────────────────────────────────────

    def _show_help(self, q, **kw):
        return self._help_message()

    def _employees_list(self, q, **kw):
        emps = Employee.query.filter_by(is_active=True).order_by(Employee.name).all()
        if not emps:
            return 'لا يوجد موظفون مسجلون بعد.'
        d_from, d_to = _this_month()
        lines = [f'👥 **الموظفون النشطون ({len(emps)})**\n']
        for i, emp in enumerate(emps, 1):
            sales = _sales_between(d_from, d_to, emp.id)
            lines.append(f'{i}. {emp.name} — {_fmt(sales)} ريال')
        return '\n'.join(lines)

    def _top_sellers(self, q, **kw):
        d_from, d_to = _this_month()
        n_match = re.search(r'(\d+)', q)
        n = min(int(n_match.group(1)), 20) if n_match else 5
        results = (
            db.session.query(Employee.name, func.sum(SaleRecord.value).label('total'))
            .join(SaleRecord)
            .filter(SaleRecord.sale_date >= d_from, SaleRecord.sale_date <= d_to)
            .group_by(Employee.id)
            .order_by(func.sum(SaleRecord.value).desc())
            .limit(n)
            .all()
        )
        if not results:
            return 'لا توجد بيانات مبيعات لهذا الشهر.'
        medals = ['🥇', '🥈', '🥉'] + ['🏅'] * 20
        lines = [f'🏆 **أفضل البائعين – {d_from.strftime("%B %Y")}**\n']
        for i, (name, total) in enumerate(results):
            lines.append(f'{medals[i]} {name}: {_fmt(total)} ريال')
        return '\n'.join(lines)

    def _today_stats(self, q, emp=None, **kw):
        today = date.today()
        if emp:
            total = _sales_between(today, today, emp.id)
            t_row = SalesTarget.query.filter_by(
                employee_id=emp.id, year=today.year, month=today.month
            ).first()
            daily = (float(t_row.target_amount) / (t_row.working_days or 26)) if t_row else 0
            return (f'📅 **مبيعات اليوم – {emp.name}**\n'
                    f'المحقق: {_fmt(total)} ريال\n'
                    f'الهدف اليومي: {_fmt(daily)} ريال\n'
                    f'النسبة: {_pct(total, daily)}%')
        results = (
            db.session.query(Employee.name, func.sum(SaleRecord.value).label('total'))
            .join(SaleRecord)
            .filter(SaleRecord.sale_date == today)
            .group_by(Employee.id)
            .order_by(func.sum(SaleRecord.value).desc())
            .all()
        )
        if not results:
            return f'📅 لا توجد مبيعات مسجلة اليوم ({today}).'
        grand = sum(r.total for r in results)
        lines = [f'📅 **مبيعات اليوم – {today}**\nالإجمالي: {_fmt(grand)} ريال\n']
        for name, total in results:
            lines.append(f'• {name}: {_fmt(total)} ريال')
        return '\n'.join(lines)

    def _week_stats(self, q, emp=None, **kw):
        d_from, d_to = _this_week()
        if emp:
            total = _sales_between(d_from, d_to, emp.id)
            return (f'📆 **مبيعات الأسبوع – {emp.name}**\n'
                    f'{d_from.strftime("%d/%m")} – {d_to.strftime("%d/%m/%Y")}\n'
                    f'الإجمالي: {_fmt(total)} ريال')
        results = (
            db.session.query(Employee.name, func.sum(SaleRecord.value).label('total'))
            .join(SaleRecord)
            .filter(SaleRecord.sale_date >= d_from, SaleRecord.sale_date <= d_to)
            .group_by(Employee.id)
            .order_by(func.sum(SaleRecord.value).desc())
            .all()
        )
        if not results:
            return 'لا توجد مبيعات هذا الأسبوع.'
        grand = sum(r.total for r in results)
        lines = [f'📆 **مبيعات الأسبوع الحالي**\n'
                 f'{d_from.strftime("%d/%m")} – {d_to.strftime("%d/%m/%Y")}\n'
                 f'الإجمالي: {_fmt(grand)} ريال\n']
        for name, total in results:
            lines.append(f'• {name}: {_fmt(total)} ريال')
        return '\n'.join(lines)

    def _pending_invoices_summary(self, q, emp=None, **kw):
        if emp:
            count, total = db.session.query(
                func.count(PendingInvoice.id), func.sum(PendingInvoice.net)
            ).filter(PendingInvoice.employee_id == emp.id,
                     PendingInvoice.status == 'pending').one()
            return (f'📋 **الفواتير المعلقة – {emp.name}**\n'
                    f'العدد: {count or 0} فاتورة\n'
                    f'الإجمالي: {_fmt(total or 0)} ريال')
        results = (
            db.session.query(Employee.name,
                             func.count(PendingInvoice.id).label('cnt'),
                             func.sum(PendingInvoice.net).label('total'))
            .join(PendingInvoice, PendingInvoice.employee_id == Employee.id)
            .filter(PendingInvoice.status == 'pending')
            .group_by(Employee.id)
            .order_by(func.sum(PendingInvoice.net).desc())
            .all()
        )
        if not results:
            return '✅ لا توجد فواتير معلقة حالياً.'
        grand_c = sum(r.cnt for r in results)
        grand_t = sum(r.total or 0 for r in results)
        lines = [f'📋 **الفواتير المعلقة**\n'
                 f'الإجمالي: {grand_c} فاتورة | {_fmt(grand_t)} ريال\n']
        for name, cnt, total in results:
            lines.append(f'• {name}: {cnt} فاتورة – {_fmt(total or 0)} ريال')
        return '\n'.join(lines)

    def _oldest_invoices(self, q, **kw):
        invs = (PendingInvoice.query.filter_by(status='pending')
                .order_by(PendingInvoice.invoice_date).limit(5).all())
        if not invs:
            return '✅ لا توجد فواتير معلقة.'
        lines = ['📋 **أقدم الفواتير المعلقة**\n']
        for inv in invs:
            e = Employee.query.get(inv.employee_id) if inv.employee_id else None
            lines.append(f'• {inv.invoice_no} | {inv.invoice_date} | '
                         f'{e.name if e else "—"} | {_fmt(inv.net)} ريال')
        return '\n'.join(lines)

    def _remaining_targets(self, q, emp=None, **kw):
        today = date.today()
        d_from, d_to = _this_month()
        days_left = max(calendar.monthrange(today.year, today.month)[1] - today.day, 1)
        targets = SalesTarget.query.filter_by(year=today.year, month=today.month)
        if emp:
            targets = targets.filter_by(employee_id=emp.id)
        targets = targets.all()
        if not targets:
            return 'لا توجد أهداف محددة لهذا الشهر.'
        lines = [f'🎯 **الهدف المتبقي – {today.strftime("%B %Y")}**\n'
                 f'أيام متبقية: {days_left}\n']
        for t in targets:
            achieved  = _sales_between(d_from, d_to, t.employee_id)
            remaining = max(float(t.target_amount) - achieved, 0)
            daily     = remaining / days_left
            pct       = _pct(achieved, t.target_amount)
            e = Employee.query.get(t.employee_id)
            icon = '✅' if pct >= 100 else ('⚠️' if pct >= 80 else '🔴')
            lines.append(
                f'{icon} {e.name if e else "?"}\n'
                f'   المحقق: {_fmt(achieved)} | المتبقي: {_fmt(remaining)}\n'
                f'   الهدف اليومي المطلوب: {_fmt(daily)} | النسبة: {pct}%'
            )
        return '\n'.join(lines)

    def _achievement_overview(self, q, **kw):
        today = date.today()
        d_from, d_to = _this_month()
        results = (
            db.session.query(
                Employee.name,
                func.sum(SaleRecord.value).label('achieved'),
                SalesTarget.target_amount,
            )
            .join(SaleRecord, SaleRecord.employee_id == Employee.id)
            .join(SalesTarget, SalesTarget.employee_id == Employee.id)
            .filter(
                SalesTarget.year == today.year,
                SalesTarget.month == today.month,
                SaleRecord.sale_date >= d_from,
                SaleRecord.sale_date <= d_to,
            )
            .group_by(Employee.id)
            .order_by(func.sum(SaleRecord.value).desc())
            .all()
        )
        if not results:
            return 'لا توجد بيانات كافية لعرض نسب الإنجاز.'
        lines = [f'📊 **نسب الإنجاز – {d_from.strftime("%B %Y")}**\n']
        for name, achieved, target in results:
            pct  = _pct(achieved, target)
            filled = int(pct / 10)
            bar  = '█' * filled + '░' * (10 - filled)
            icon = '✅' if pct >= 100 else ('⚠️' if pct >= 80 else '🔴')
            lines.append(f'{icon} {name}: {pct}%  [{bar}]')
            lines.append(f'   {_fmt(achieved)} / {_fmt(target)} ريال')
        return '\n'.join(lines)

    def _employee_ranking(self, q, **kw):
        d_from, d_to = _this_month()
        want_lowest = bool(re.search(r'أضعف|أقل|ضعيف|lowest|worst', q, re.IGNORECASE))
        order = func.sum(SaleRecord.value).asc() if want_lowest else func.sum(SaleRecord.value).desc()
        results = (
            db.session.query(Employee.name, func.sum(SaleRecord.value).label('total'))
            .join(SaleRecord)
            .filter(SaleRecord.sale_date >= d_from, SaleRecord.sale_date <= d_to)
            .group_by(Employee.id).order_by(order).all()
        )
        if not results:
            return 'لا توجد بيانات لهذا الشهر.'
        medals = ['🥇', '🥈', '🥉'] + ['🏅'] * 20
        title = '📉 **ترتيب الأداء (الأقل أولاً)**' if want_lowest else '📈 **ترتيب الأداء**'
        lines = [f'{title} – {d_from.strftime("%B %Y")}\n']
        for i, (name, total) in enumerate(results):
            prefix = str(i + 1) + '.' if want_lowest else medals[i]
            lines.append(f'{prefix} {name}: {_fmt(total)} ريال')
        return '\n'.join(lines)

    def _product_analysis(self, q, **kw):
        d_from, d_to = _this_month()
        results = (
            db.session.query(
                SaleRecord.product_category,
                func.sum(SaleRecord.value).label('total'),
                func.count(SaleRecord.id).label('cnt'),
            )
            .filter(
                SaleRecord.sale_date >= d_from,
                SaleRecord.sale_date <= d_to,
                SaleRecord.product_category.isnot(None),
                SaleRecord.product_category != '',
            )
            .group_by(SaleRecord.product_category)
            .order_by(func.sum(SaleRecord.value).desc())
            .limit(10).all()
        )
        if not results:
            return 'لا توجد بيانات منتجات لهذا الشهر.'
        lines = [f'📦 **أفضل الفئات – {d_from.strftime("%B %Y")}**\n']
        for cat, total, cnt in results:
            lines.append(f'• {cat}: {_fmt(total)} ريال ({cnt} فاتورة)')
        return '\n'.join(lines)

    def _productivity_summary(self, q, emp=None, **kw):
        today = date.today()
        qs = SalesProductivityRecord.query.filter_by(year=today.year, month=today.month)
        if emp:
            qs = qs.filter_by(employee_id=emp.id)
        records = qs.order_by(SalesProductivityRecord.value.desc()).limit(10).all()
        if not records:
            return 'لا توجد بيانات إنتاجية لهذا الشهر.'
        lines = [f'⚡ **بيانات الإنتاجية – {today.strftime("%B %Y")}**\n']
        for r in records:
            e = Employee.query.get(r.employee_id)
            lines.append(f'• {e.name if e else "?"}: {_fmt(r.value)}')
        return '\n'.join(lines)

    def _monthly_summary(self, q, emp=None, **kw):
        if emp:
            return self._employee_profile(emp)
        today   = date.today()
        d_from, d_to = _this_month()
        total   = _sales_between(d_from, d_to)
        n_emp   = Employee.query.filter_by(is_active=True).count()
        p_cnt   = PendingInvoice.query.filter_by(status='pending').count()
        p_amt   = db.session.query(func.sum(PendingInvoice.net)).filter_by(status='pending').scalar() or 0
        ct      = CompanyTarget.query.filter_by(year=today.year, month=today.month).first()
        target  = float(ct.total_target) if ct else 0
        top     = (
            db.session.query(Employee.name, func.sum(SaleRecord.value).label('t'))
            .join(SaleRecord)
            .filter(SaleRecord.sale_date >= d_from, SaleRecord.sale_date <= d_to)
            .group_by(Employee.id).order_by(func.sum(SaleRecord.value).desc()).first()
        )
        lines = [f'📊 **ملخص {d_from.strftime("%B %Y")}**\n',
                 f'👥 الموظفون: {n_emp}',
                 f'💰 إجمالي المبيعات: {_fmt(total)} ريال']
        if target:
            lines.append(f'🎯 الهدف: {_fmt(target)} ريال | النسبة: {_pct(total, target)}%')
        if top:
            lines.append(f'🏆 أفضل بائع: {top.name} ({_fmt(top.t)} ريال)')
        lines.append(f'📋 فواتير معلقة: {p_cnt} ({_fmt(p_amt)} ريال)')
        lines.append(f'\n💬 اسألني عن:\nأفضل بائع | هدف موظف | مبيعات اليوم | فواتير معلقة | ترتيب الموظفين | نسبة الإنجاز')
        return '\n'.join(lines)

    def _employee_query(self, q, emp=None, **kw):
        if emp:
            return self._employee_profile(emp)
        return self._employees_list(q)

    def _employee_profile(self, emp: Employee) -> str:
        today   = date.today()
        d_from, d_to = _this_month()
        wk_from, wk_to = _this_week()
        days_left = max(calendar.monthrange(today.year, today.month)[1] - today.day, 1)

        achieved    = _sales_between(d_from, d_to, emp.id)
        today_sales = _sales_between(today, today, emp.id)
        week_sales  = _sales_between(wk_from, wk_to, emp.id)

        t_row    = SalesTarget.query.filter_by(employee_id=emp.id, year=today.year, month=today.month).first()
        target   = float(t_row.target_amount) if t_row else 0
        remaining = max(target - achieved, 0)
        daily    = remaining / days_left if days_left else 0
        pct      = _pct(achieved, target)

        p_cnt, p_amt = db.session.query(
            func.count(PendingInvoice.id), func.sum(PendingInvoice.net)
        ).filter_by(employee_id=emp.id, status='pending').one()

        icon = '✅' if pct >= 100 else ('⚠️' if pct >= 80 else '🔴')
        lines = [f'👤 **{emp.name}**\n',
                 f'📅 مبيعات اليوم:        {_fmt(today_sales)} ريال',
                 f'📆 مبيعات الأسبوع:      {_fmt(week_sales)} ريال',
                 f'📈 مبيعات الشهر:        {_fmt(achieved)} ريال']
        if target:
            lines += [
                f'🎯 الهدف الشهري:        {_fmt(target)} ريال',
                f'{icon} نسبة الإنجاز:        {pct}%',
                f'🔺 المتبقي:             {_fmt(remaining)} ريال',
                f'📌 الهدف اليومي المطلوب: {_fmt(daily)} ريال',
            ]
        lines.append(f'📋 فواتير معلقة:        {p_cnt or 0} ({_fmt(p_amt or 0)} ريال)')
        return '\n'.join(lines)

    def _help_message(self) -> str:
        return (
            'مرحباً! أنا البدوي برو 🤖\n\n'
            'يمكنني الإجابة على أي سؤال عن البيانات:\n\n'
            '• **أفضل بائع** أو **أفضل 3 بائعين**\n'
            '• **مبيعات اليوم** / **مبيعات الأسبوع** / **مبيعات الشهر**\n'
            '• **هدف [اسم الموظف]** – مثال: هدف أحمد\n'
            '• **فواتير معلقة** أو **فواتير معلقة أحمد**\n'
            '• **ترتيب الموظفين** أو **من الأضعف**\n'
            '• **نسبة الإنجاز** لكل موظف\n'
            '• **قائمة الموظفين**\n'
            '• **[اسم الموظف] مباشرة** – تقرير كامل\n'
        )


# ─── advice cards ─────────────────────────────────────────────────────────────

def generate_sales_advice(lang: str = 'ar') -> list[dict]:
    today = date.today()
    d_from, d_to = _this_month()
    advice = []

    def _card(type_: str, employee, msg_ar: str, msg_en: str) -> dict:
        msg = msg_ar if lang == 'ar' else msg_en
        return {'type': type_, 'level': type_, 'employee': employee,
                'message': msg, 'message_ar': msg_ar, 'message_en': msg_en}

    employees = Employee.query.filter_by(is_active=True).all()

    # Rule 1: below 80% for 2 months
    for emp in employees:
        low = 0
        for mb in [1, 2]:
            check = today.replace(day=1) - timedelta(days=mb * 28)
            t = SalesTarget.query.filter_by(
                employee_id=emp.id, year=check.year, month=check.month
            ).first()
            if not t or not t.target_amount:
                continue
            last = calendar.monthrange(check.year, check.month)[1]
            a = _sales_between(date(check.year, check.month, 1),
                               date(check.year, check.month, last), emp.id)
            if a / float(t.target_amount) < 0.80:
                low += 1
        if low >= 2:
            advice.append(_card('warning', emp.name,
                f'الموظف {emp.name} أداؤه أقل من 80% لشهرين متتاليين.',
                f'{emp.name} underperformed (<80%) for 2 consecutive months.'))

    # Rule 2: top performer
    top = (
        db.session.query(Employee.name, func.sum(SaleRecord.value).label('total'))
        .join(SaleRecord)
        .filter(SaleRecord.sale_date >= d_from, SaleRecord.sale_date <= d_to)
        .group_by(Employee.id).order_by(func.sum(SaleRecord.value).desc()).first()
    )
    if top:
        advice.append(_card('success', top.name,
            f'🏆 أفضل أداء هذا الشهر: {top.name} بإجمالي {_fmt(top.total)} ريال.',
            f'🏆 Top performer: {top.name} with {_fmt(top.total)} SAR.'))

    # Rule 3: no sales this month
    ids_with_sales = {r.employee_id for r in
        db.session.query(SaleRecord.employee_id)
        .filter(SaleRecord.sale_date >= d_from, SaleRecord.sale_date <= d_to).all()}
    for emp in employees:
        if emp.id not in ids_with_sales:
            advice.append(_card('danger', emp.name,
                f'⚠️ لا توجد مبيعات مسجلة للموظف {emp.name} هذا الشهر.',
                f'⚠️ No sales for {emp.name} this month.'))

    # Rule 4: declining categories
    from sqlalchemy import text
    try:
        rows = db.session.execute(text("""
            SELECT product_category,
                   SUM(CASE WHEN strftime('%Y-%m',sale_date)=strftime('%Y-%m','now','-1 month') THEN value ELSE 0 END) prev,
                   SUM(CASE WHEN strftime('%Y-%m',sale_date)=strftime('%Y-%m','now') THEN value ELSE 0 END) curr
            FROM sale_records
            WHERE product_category IS NOT NULL AND product_category != ''
            GROUP BY product_category
            HAVING prev > 0 AND curr < prev * 0.8
        """)).fetchall()
        for row in rows:
            advice.append(_card('info', None,
                f'📉 انخفاض مبيعات "{row[0]}" بأكثر من 20% مقارنة بالشهر الماضي.',
                f'📉 "{row[0]}" sales down >20% vs last month.'))
    except Exception:
        pass

    if not advice:
        advice.append(_card('info', None,
            'لا توجد بيانات كافية بعد. قم برفع ملفات المبيعات لتظهر التوصيات.',
            'Not enough data yet. Upload sales files to see recommendations.'))

    return advice
