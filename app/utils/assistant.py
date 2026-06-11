"""
AQ – مساعد ذكي لتحليل بيانات المبيعات.
يجيب على أي سؤال عن الموظفين، المبيعات، الأهداف، الفواتير، الخصومات، والمنتجات.
"""
import re
from datetime import date, timedelta
from typing import Optional
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


def _last_month_range():
    first_this = date.today().replace(day=1)
    last_prev = first_this - timedelta(days=1)
    return last_prev.replace(day=1), last_prev


def _get_branch_manager() -> Optional[Employee]:
    """Return the designated branch manager Employee or None."""
    from app.models import AppSetting
    s = AppSetting.query.filter_by(key='branch_manager_name').first()
    if not s or not s.value:
        return None
    return Employee.query.filter(
        Employee.name.ilike(f'%{s.value.strip()}%')
    ).first()


def _is_manager(emp: Employee) -> bool:
    mgr = _get_branch_manager()
    return mgr is not None and mgr.id == emp.id


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


MONTH_MAP = {
    'يناير': 1, 'جانوار': 1, 'فبراير': 2, 'فراير': 2, 'مارس': 3,
    'أبريل': 4, 'ابريل': 4, 'مايو': 5, 'يونيو': 6, 'يونيه': 6,
    'يوليو': 7, 'يوليه': 7, 'أغسطس': 8, 'اغسطس': 8,
    'سبتمبر': 9, 'أكتوبر': 10, 'اكتوبر': 10,
    'نوفمبر': 11, 'ديسمبر': 12,
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5,
    'june': 6, 'july': 7, 'august': 8, 'september': 9, 'october': 10,
    'november': 11, 'december': 12,
}


# ─── intent patterns (priority-ordered) ──────────────────────────────────────

PATTERNS = [
    (r'^مساعد$|^مساعدة$|^help$|^وش تعرف|^ماذا تعرف|^شو تعرف|^أوامر|^commands',
     '_show_help'),
    (r'مدير|مدير الفرع|branch.?manager|المسؤول|المسئول|المشرف',
     '_manager_profile'),
    (r'هدف.*فرع|فرع.*هدف|target.*branch|branch.*target|هدف.*إجمالي|إجمالي.*هدف',
     '_branch_target'),
    (r'قائمة الموظف|كل الموظف|جميع الموظف|عدد الموظف|list.*employee',
     '_employees_list'),
    (r'أفضل|الأول|أكثر.*مبيع|أعلى.*مبيع|من.*باع|مين.*باع|top.*sell|best.*sell',
     '_top_sellers'),
    (r'اليوم|today',
     '_today_stats'),
    (r'هذا الأسبوع|الأسبوع الحالي|أسبوع.*حالي|this week|هذا أسبوع',
     '_week_stats'),
    (r'الشهر الماضي|الشهر السابق|last month|شهر.*ماضي|ماضي.*شهر|الماضي.*مبيع|مبيع.*الماضي',
     '_last_month_stats'),
    (r'لماذا|ليش|ليه|سبب|why|أسباب|تفسير|تحليل.*أداء|أداء.*تحليل|مين.*ضعيف|من.*ضعيف',
     '_why_analysis'),
    (r'خصم|خصومات|discount|تخفيض|حسم',
     '_discounts_analysis'),
    (r'جود|جودة|quality|تقييم.*فاتور',
     '_quality_summary'),
    (r'فاتور|فواتير|pending.?invoice|معلق.*فاتور|فاتور.*معلق',
     '_pending_invoices_summary'),
    (r'قديم.*فاتور|أقدم.*فاتور|oldest.?invoice',
     '_oldest_invoices'),
    (r'متبقي|باقي.*هدف|هدف.*باقي|remaining.*target|يومي.*مستهدف|هدف.*يومي|كم.*هدف|هدف.*كم',
     '_remaining_targets'),
    (r'نسبة|إنجاز|تحقيق.*هدف|هدف.*تحقيق|achievement|progress|أداء.*هدف',
     '_achievement_overview'),
    (r'ترتيب|مقارنة|ranking|compare|أضعف|أقل.*مبيع|من.*أقل|الأدنى|الأقل',
     '_employee_ranking'),
    (r'منتج|منتجات|product|فئة|فئات|category|صنف|أصناف',
     '_product_analysis'),
    (r'إنتاج|إنتاجية|productivity|كفاءة',
     '_productivity_summary'),
    (r'عميل|عملاء|customer|زبون|زبائن',
     '_customer_analysis'),
    (r'مبيعات|sales|شهر|month|ملخص|summary|إجمالي|total|أداء',
     '_monthly_summary'),
    (r'موظف|employee',
     '_employee_query'),
]


# ─── assistant class ──────────────────────────────────────────────────────────

class AQAssistant:

    def answer(self, question: str, lang: str = 'ar') -> str:
        q = question.strip()
        if not q:
            return self._help_message()

        emp, remainder = _extract_employee_from_q(q)

        # Just an employee name → full profile
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

        return self._unknown_fallback(q, emp=emp)

    # ── handlers ─────────────────────────────────────────────────────────────

    def _show_help(self, q, **kw):
        return self._help_message()

    # ── manager ──────────────────────────────────────────────────────────────

    def _manager_profile(self, q, emp=None, **kw):
        mgr = emp if (emp and _is_manager(emp)) else _get_branch_manager()
        if not mgr:
            return self._branch_target(q)
        return self._build_manager_report(mgr)

    def _build_manager_report(self, mgr: Employee) -> str:
        today = date.today()
        d_from, d_to = _this_month()
        days_left = max(calendar.monthrange(today.year, today.month)[1] - today.day, 1)

        total_sales = _sales_between(d_from, d_to)
        ct = CompanyTarget.query.filter_by(year=today.year, month=today.month).first()
        branch_target = float(ct.total_target) if ct else 0

        emp_results = (
            db.session.query(
                Employee.name,
                Employee.id,
                func.sum(SaleRecord.value).label('total'),
            )
            .join(SaleRecord)
            .filter(SaleRecord.sale_date >= d_from, SaleRecord.sale_date <= d_to)
            .group_by(Employee.id)
            .order_by(func.sum(SaleRecord.value).desc())
            .all()
        )

        p_cnt = PendingInvoice.query.filter_by(status='pending').count()
        p_amt = db.session.query(func.sum(PendingInvoice.net)).filter_by(status='pending').scalar() or 0

        lines = [f'🏢 **{mgr.name} – مدير الفرع**\n',
                 f'📊 **أداء الفرع – {d_from.strftime("%B %Y")}**',
                 f'💰 إجمالي مبيعات الفرع: {_fmt(total_sales)} ريال']

        if branch_target:
            pct = _pct(total_sales, branch_target)
            icon = '✅' if pct >= 100 else ('⚠️' if pct >= 80 else '🔴')
            remaining = max(branch_target - total_sales, 0)
            lines.append(f'{icon} هدف الفرع: {_fmt(branch_target)} ريال | النسبة: {pct}%')
            if remaining > 0:
                lines.append(f'📌 المتبقي: {_fmt(remaining)} ريال | الهدف اليومي: {_fmt(remaining / days_left)} ريال')
        else:
            lines.append('⚠️ لم يُحدَّد هدف للفرع هذا الشهر.')

        if emp_results:
            lines.append(f'\n👥 **أداء الفريق**')
            medals = ['🥇', '🥈', '🥉'] + ['🏅'] * 20
            rank = 0
            for name, eid, total in emp_results:
                if eid == mgr.id:
                    lines.append(f'🏢 {name}: {_fmt(total)} ريال (مدير الفرع)')
                else:
                    lines.append(f'{medals[rank]} {name}: {_fmt(total)} ريال')
                    rank += 1

        lines.append(f'\n📋 فواتير معلقة في الفرع: {p_cnt} ({_fmt(p_amt)} ريال)')
        return '\n'.join(lines)

    def _branch_target(self, q, **kw):
        today = date.today()
        d_from, d_to = _this_month()
        days_left = max(calendar.monthrange(today.year, today.month)[1] - today.day, 1)
        ct = CompanyTarget.query.filter_by(year=today.year, month=today.month).first()
        total_sales = _sales_between(d_from, d_to)

        if not ct:
            return (f'🎯 لم يُحدَّد هدف للفرع لشهر {d_from.strftime("%B %Y")}.\n'
                    f'💰 إجمالي المبيعات الحالي: {_fmt(total_sales)} ريال')

        target = float(ct.total_target)
        pct = _pct(total_sales, target)
        remaining = max(target - total_sales, 0)
        icon = '✅' if pct >= 100 else ('⚠️' if pct >= 80 else '🔴')

        return (f'🎯 **هدف الفرع – {d_from.strftime("%B %Y")}**\n\n'
                f'الهدف: {_fmt(target)} ريال\n'
                f'المحقق: {_fmt(total_sales)} ريال\n'
                f'{icon} نسبة الإنجاز: {pct}%\n'
                f'المتبقي: {_fmt(remaining)} ريال\n'
                f'الهدف اليومي المطلوب: {_fmt(remaining / days_left)} ريال\n'
                f'أيام متبقية: {days_left}')

    # ── employees ─────────────────────────────────────────────────────────────

    def _employees_list(self, q, **kw):
        mgr = _get_branch_manager()
        mgr_id = mgr.id if mgr else None
        emps = Employee.query.filter_by(is_active=True).order_by(Employee.name).all()
        if not emps:
            return 'لا يوجد موظفون مسجلون بعد.'
        d_from, d_to = _this_month()
        lines = [f'👥 **الموظفون النشطون ({len(emps)})**\n']
        for i, emp in enumerate(emps, 1):
            sales = _sales_between(d_from, d_to, emp.id)
            role = ' 🏢 مدير الفرع' if emp.id == mgr_id else ''
            lines.append(f'{i}. {emp.name}{role} — {_fmt(sales)} ريال')
        return '\n'.join(lines)

    def _top_sellers(self, q, **kw):
        mgr = _get_branch_manager()
        mgr_id = mgr.id if mgr else None
        d_from, d_to = _this_month()
        n_match = re.search(r'(\d+)', q)
        n = min(int(n_match.group(1)), 20) if n_match else 5

        results = (
            db.session.query(
                Employee.name,
                Employee.id,
                func.sum(SaleRecord.value).label('total'),
            )
            .join(SaleRecord)
            .filter(SaleRecord.sale_date >= d_from, SaleRecord.sale_date <= d_to)
            .group_by(Employee.id)
            .order_by(func.sum(SaleRecord.value).desc())
            .all()
        )
        if not results:
            return 'لا توجد بيانات مبيعات لهذا الشهر.'

        # Separate manager from salespersons
        sales_rows = [(name, total) for name, eid, total in results if eid != mgr_id][:n]
        mgr_row = next(((name, total) for name, eid, total in results if eid == mgr_id), None)

        medals = ['🥇', '🥈', '🥉'] + ['🏅'] * 20
        lines = [f'🏆 **أفضل البائعين – {d_from.strftime("%B %Y")}**\n']
        for i, (name, total) in enumerate(sales_rows):
            lines.append(f'{medals[i]} {name}: {_fmt(total)} ريال')
        if mgr_row:
            lines.append(f'\n🏢 {mgr_row[0]} (مدير الفرع): {_fmt(mgr_row[1])} ريال')
        return '\n'.join(lines)

    def _employee_ranking(self, q, **kw):
        mgr = _get_branch_manager()
        mgr_id = mgr.id if mgr else None
        d_from, d_to = _this_month()
        want_lowest = bool(re.search(r'أضعف|أقل|ضعيف|الأدنى|lowest|worst|الأقل', q, re.IGNORECASE))
        order = func.sum(SaleRecord.value).asc() if want_lowest else func.sum(SaleRecord.value).desc()
        results = (
            db.session.query(
                Employee.name,
                Employee.id,
                func.sum(SaleRecord.value).label('total'),
            )
            .join(SaleRecord)
            .filter(SaleRecord.sale_date >= d_from, SaleRecord.sale_date <= d_to)
            .group_by(Employee.id).order_by(order).all()
        )
        if not results:
            return 'لا توجد بيانات لهذا الشهر.'

        sales_rows = [(name, total) for name, eid, total in results if eid != mgr_id]

        medals = ['🥇', '🥈', '🥉'] + ['🏅'] * 20
        title = '📉 **ترتيب الأداء (الأقل أولاً)**' if want_lowest else '📈 **ترتيب الأداء**'
        lines = [f'{title} – {d_from.strftime("%B %Y")}\n']
        for i, (name, total) in enumerate(sales_rows):
            prefix = str(i + 1) + '.' if want_lowest else medals[i]
            lines.append(f'{prefix} {name}: {_fmt(total)} ريال')
        return '\n'.join(lines)

    # ── time periods ──────────────────────────────────────────────────────────

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

    def _last_month_stats(self, q, emp=None, **kw):
        d_from, d_to = _last_month_range()
        label = d_from.strftime('%B %Y')
        if emp:
            total = _sales_between(d_from, d_to, emp.id)
            t = SalesTarget.query.filter_by(employee_id=emp.id, year=d_from.year, month=d_from.month).first()
            target = float(t.target_amount) if t else 0
            pct = _pct(total, target)
            icon = '✅' if pct >= 100 else ('⚠️' if pct >= 80 else '🔴')
            lines = [f'📅 **الشهر الماضي – {emp.name}** ({label})\n',
                     f'المبيعات: {_fmt(total)} ريال']
            if target:
                lines.append(f'الهدف: {_fmt(target)} ريال | {icon} النسبة: {pct}%')
            return '\n'.join(lines)

        results = (
            db.session.query(Employee.name, func.sum(SaleRecord.value).label('total'))
            .join(SaleRecord)
            .filter(SaleRecord.sale_date >= d_from, SaleRecord.sale_date <= d_to)
            .group_by(Employee.id)
            .order_by(func.sum(SaleRecord.value).desc())
            .all()
        )
        if not results:
            return f'لا توجد بيانات مبيعات لـ{label}.'
        grand = sum(r.total or 0 for r in results)
        ct = CompanyTarget.query.filter_by(year=d_from.year, month=d_from.month).first()
        target = float(ct.total_target) if ct else 0
        lines = [f'📅 **الشهر الماضي – {label}**\n',
                 f'إجمالي المبيعات: {_fmt(grand)} ريال']
        if target:
            lines.append(f'هدف الفرع: {_fmt(target)} ريال | النسبة: {_pct(grand, target)}%')
        lines.append('')
        medals = ['🥇', '🥈', '🥉'] + ['🏅'] * 20
        for i, (name, total) in enumerate(results):
            lines.append(f'{medals[i]} {name}: {_fmt(total)} ريال')
        return '\n'.join(lines)

    # ── analysis ──────────────────────────────────────────────────────────────

    def _why_analysis(self, q, emp=None, **kw):
        """Diagnose low performance or issues."""
        today = date.today()
        d_from, d_to = _this_month()

        if emp:
            achieved = _sales_between(d_from, d_to, emp.id)
            t = SalesTarget.query.filter_by(employee_id=emp.id, year=today.year, month=today.month).first()
            target = float(t.target_amount) if t else 0
            pct = _pct(achieved, target)
            disc = db.session.query(func.sum(PendingInvoice.discount)).filter(
                PendingInvoice.employee_id == emp.id, PendingInvoice.discount > 0
            ).scalar() or 0
            p_cnt = PendingInvoice.query.filter_by(employee_id=emp.id, status='pending').count()

            lines = [f'🔍 **تحليل أداء {emp.name}**\n']
            if not target:
                lines.append('⚠️ لم يُحدَّد هدف لهذا الموظف هذا الشهر.')
            elif pct >= 100:
                lines.append(f'✅ أداء ممتاز: {pct}% من الهدف محققة!\nلا توجد مشاكل واضحة.')
                return '\n'.join(lines)
            else:
                lines.append(f'📊 الإنجاز: {pct}% | {_fmt(achieved)} / {_fmt(target)} ريال\n')
                lines.append('**محتملات الضعف:**')
                if pct < 50:
                    lines.append('🔴 إنجاز منخفض جداً — يحتاج دعم وتوجيه مكثّف.')
                elif pct < 80:
                    lines.append('⚠️ دون المستهدف — يحتاج تركيزاً وزيادة نشاط.')
                if disc > 0:
                    net = db.session.query(func.sum(PendingInvoice.net)).filter(
                        PendingInvoice.employee_id == emp.id
                    ).scalar() or 0
                    dp = round(float(disc) / float(net) * 100, 1) if net else 0
                    lines.append(f'💸 خصومات مرتفعة: {_fmt(disc)} ريال ({dp}% من الصافي).')
                if p_cnt > 0:
                    lines.append(f'📋 {p_cnt} فاتورة معلقة لم تُحسم.')
            return '\n'.join(lines)

        # General: find who needs support
        results = (
            db.session.query(
                Employee.name,
                func.sum(SaleRecord.value).label('achieved'),
                SalesTarget.target_amount,
            )
            .join(SaleRecord, SaleRecord.employee_id == Employee.id)
            .join(SalesTarget, SalesTarget.employee_id == Employee.id)
            .filter(
                SalesTarget.year == today.year, SalesTarget.month == today.month,
                SaleRecord.sale_date >= d_from,
            )
            .group_by(Employee.id).all()
        )
        poor = [(n, a, t) for n, a, t in results if _pct(a, t) < 80]
        if not poor:
            return '✅ جميع الموظفين على المسار الصحيح.'
        lines = ['🔍 **من يحتاج دعماً هذا الشهر؟**\n']
        for name, achieved, target in poor:
            pct = _pct(achieved, target)
            remaining = max(float(target) - float(achieved), 0)
            icon = '🔴' if pct < 50 else '⚠️'
            lines.append(f'{icon} {name}: {pct}% — متبقي {_fmt(remaining)} ريال')
        lines.append('\n💡 ركّز على هؤلاء الموظفين ودعمهم لإنجاز أهدافهم.')
        return '\n'.join(lines)

    def _quality_summary(self, q, emp=None, **kw):
        from app.models import InvoiceQualityRecord
        base = InvoiceQualityRecord.query
        if emp:
            base = base.filter_by(employee_id=emp.id)
        total = base.count()
        if not total:
            return 'لا توجد سجلات جودة بعد. اضغط "توليد الجودة" في صفحة جودة الفواتير.'
        avg_q = db.session.query(func.avg(InvoiceQualityRecord.quality_score))
        if emp:
            avg_q = avg_q.filter(InvoiceQualityRecord.employee_id == emp.id)
        avg_val = round(float(avg_q.scalar() or 0), 1)
        low = base.filter(InvoiceQualityRecord.quality_score < 70).count()
        if emp:
            icon = '✅' if avg_val >= 80 else ('⚠️' if avg_val >= 60 else '🔴')
            return (f'📋 **جودة فواتير {emp.name}**\n'
                    f'عدد الفواتير: {total}\n'
                    f'{icon} متوسط الجودة: {avg_val} / 100\n'
                    f'فواتير منخفضة الجودة: {low}')
        by_emp = (
            db.session.query(
                Employee.name,
                func.count(InvoiceQualityRecord.id).label('cnt'),
                func.avg(InvoiceQualityRecord.quality_score).label('avg_score'),
            )
            .join(InvoiceQualityRecord, InvoiceQualityRecord.employee_id == Employee.id)
            .group_by(Employee.id)
            .order_by(func.avg(InvoiceQualityRecord.quality_score).desc())
            .all()
        )
        icon = '✅' if avg_val >= 80 else ('⚠️' if avg_val >= 60 else '🔴')
        lines = [f'📋 **جودة الفواتير – الفريق**\n{icon} المتوسط الكلي: {avg_val} / 100\n']
        for row in by_emp:
            sc = round(float(row.avg_score or 0), 1)
            ei = '✅' if sc >= 80 else ('⚠️' if sc >= 60 else '🔴')
            lines.append(f'{ei} {row.name}: {sc} ({row.cnt} فاتورة)')
        return '\n'.join(lines)

    # ── invoices ──────────────────────────────────────────────────────────────

    def _discounts_analysis(self, q, emp=None, **kw):
        filters = [PendingInvoice.discount > 0]
        if emp:
            filters.append(PendingInvoice.employee_id == emp.id)
        total_disc = db.session.query(func.sum(PendingInvoice.discount)).filter(*filters).scalar() or 0
        count = PendingInvoice.query.filter(*filters).count()
        if count == 0:
            return (f'لا توجد خصومات مسجلة للموظف {emp.name}.' if emp
                    else 'لا توجد فواتير بها خصومات في قاعدة البيانات.')
        avg = float(total_disc) / count if count else 0
        if emp:
            return (f'💸 **خصومات – {emp.name}**\n'
                    f'عدد الفواتير: {count}\n'
                    f'إجمالي الخصومات: {_fmt(total_disc)} ريال\n'
                    f'متوسط الخصم: {_fmt(avg)} ريال')
        by_emp = (
            db.session.query(
                Employee.name,
                func.count(PendingInvoice.id).label('cnt'),
                func.sum(PendingInvoice.discount).label('disc'),
            )
            .join(PendingInvoice, PendingInvoice.employee_id == Employee.id)
            .filter(PendingInvoice.discount > 0)
            .group_by(Employee.id)
            .order_by(func.sum(PendingInvoice.discount).desc())
            .all()
        )
        lines = [f'💸 **تحليل الخصومات**\n'
                 f'الإجمالي: {_fmt(total_disc)} ريال | الفواتير: {count} | المتوسط: {_fmt(avg)} ريال\n']
        for row in by_emp:
            lines.append(f'• {row.name}: {row.cnt} فاتورة — {_fmt(row.disc or 0)} ريال')
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
            db.session.query(
                Employee.name,
                func.count(PendingInvoice.id).label('cnt'),
                func.sum(PendingInvoice.net).label('total'),
            )
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

    # ── targets ───────────────────────────────────────────────────────────────

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
        lines = [f'🎯 **الهدف المتبقي – {today.strftime("%B %Y")}**\nأيام متبقية: {days_left}\n']
        for t in targets:
            achieved = _sales_between(d_from, d_to, t.employee_id)
            remaining = max(float(t.target_amount) - achieved, 0)
            daily = remaining / days_left
            pct = _pct(achieved, t.target_amount)
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
                SalesTarget.year == today.year, SalesTarget.month == today.month,
                SaleRecord.sale_date >= d_from, SaleRecord.sale_date <= d_to,
            )
            .group_by(Employee.id)
            .order_by(func.sum(SaleRecord.value).desc())
            .all()
        )
        if not results:
            return 'لا توجد بيانات كافية لعرض نسب الإنجاز.'
        lines = [f'📊 **نسب الإنجاز – {d_from.strftime("%B %Y")}**\n']
        for name, achieved, target in results:
            pct = _pct(achieved, target)
            filled = int(pct / 10)
            bar = '█' * min(filled, 10) + '░' * max(10 - filled, 0)
            icon = '✅' if pct >= 100 else ('⚠️' if pct >= 80 else '🔴')
            lines.append(f'{icon} {name}: {pct}%  [{bar}]')
            lines.append(f'   {_fmt(achieved)} / {_fmt(target)} ريال')
        return '\n'.join(lines)

    # ── products / productivity ───────────────────────────────────────────────

    def _product_analysis(self, q, emp=None, **kw):
        d_from, d_to = _this_month()
        base = db.session.query(
            SaleRecord.product_category,
            func.sum(SaleRecord.value).label('total'),
            func.count(SaleRecord.id).label('cnt'),
        ).filter(
            SaleRecord.sale_date >= d_from, SaleRecord.sale_date <= d_to,
            SaleRecord.product_category.isnot(None), SaleRecord.product_category != '',
        )
        if emp:
            base = base.filter(SaleRecord.employee_id == emp.id)
        results = base.group_by(SaleRecord.product_category).order_by(
            func.sum(SaleRecord.value).desc()
        ).limit(10).all()
        if not results:
            return (f'لا توجد بيانات منتجات لـ{emp.name} هذا الشهر.' if emp
                    else 'لا توجد بيانات منتجات لهذا الشهر.')
        title = f'📦 **أفضل الفئات – {d_from.strftime("%B %Y")}**'
        if emp:
            title += f'\n({emp.name})'
        lines = [title + '\n']
        grand = sum(r.total or 0 for r in results)
        for cat, total, cnt in results:
            pct = round(float(total or 0) / grand * 100, 1) if grand else 0
            lines.append(f'• {cat}: {_fmt(total)} ريال ({pct}%) — {cnt} سجل')
        return '\n'.join(lines)

    def _productivity_summary(self, q, emp=None, **kw):
        today = date.today()
        d_from = date(today.year, today.month, 1)
        qs = SalesProductivityRecord.query.filter(SalesProductivityRecord.period_from >= d_from)
        if emp:
            qs = qs.filter(SalesProductivityRecord.employee_id == emp.id)
        records = qs.order_by(SalesProductivityRecord.amount.desc()).limit(10).all()
        if not records:
            return self._product_analysis(q, emp=emp)
        lines = [f'⚡ **بيانات الإنتاجية – {today.strftime("%B %Y")}**\n']
        for r in records:
            e = Employee.query.get(r.employee_id)
            lines.append(f'• {e.name if e else "?"} | {r.product_category}: {_fmt(r.amount)} ريال ({r.qty} وحدة)')
        return '\n'.join(lines)

    def _customer_analysis(self, q, emp=None, **kw):
        base = db.session.query(
            PendingInvoice.customer_name,
            func.count(PendingInvoice.id).label('cnt'),
            func.sum(PendingInvoice.net).label('total'),
        ).filter(
            PendingInvoice.customer_name.isnot(None),
            PendingInvoice.customer_name != '',
        )
        if emp:
            base = base.filter(PendingInvoice.employee_id == emp.id)
        results = base.group_by(PendingInvoice.customer_name).order_by(
            func.sum(PendingInvoice.net).desc()
        ).limit(10).all()
        if not results:
            return 'لا توجد بيانات عملاء في الفواتير.'
        title = '🧾 **أكبر العملاء (بالفواتير المعلقة)**'
        if emp:
            title += f'\n({emp.name})'
        lines = [title + '\n']
        for name, cnt, total in results:
            lines.append(f'• {name}: {cnt} فاتورة — {_fmt(total or 0)} ريال')
        return '\n'.join(lines)

    # ── monthly summary ────────────────────────────────────────────────────────

    def _monthly_summary(self, q, emp=None, **kw):
        if emp:
            return self._employee_profile(emp)
        today = date.today()
        d_from, d_to = _this_month()
        total = _sales_between(d_from, d_to)
        n_emp = Employee.query.filter_by(is_active=True).count()
        p_cnt = PendingInvoice.query.filter_by(status='pending').count()
        p_amt = db.session.query(func.sum(PendingInvoice.net)).filter_by(status='pending').scalar() or 0
        ct = CompanyTarget.query.filter_by(year=today.year, month=today.month).first()
        target = float(ct.total_target) if ct else 0
        top = (
            db.session.query(Employee.name, func.sum(SaleRecord.value).label('t'))
            .join(SaleRecord)
            .filter(SaleRecord.sale_date >= d_from, SaleRecord.sale_date <= d_to)
            .group_by(Employee.id).order_by(func.sum(SaleRecord.value).desc()).first()
        )
        lines = [f'📊 **ملخص {d_from.strftime("%B %Y")}**\n',
                 f'👥 الموظفون النشطون: {n_emp}',
                 f'💰 إجمالي المبيعات: {_fmt(total)} ريال']
        if target:
            lines.append(f'🎯 هدف الفرع: {_fmt(target)} ريال | النسبة: {_pct(total, target)}%')
        if top:
            lines.append(f'🏆 أفضل بائع: {top.name} ({_fmt(top.t)} ريال)')
        lines.append(f'📋 فواتير معلقة: {p_cnt} ({_fmt(p_amt)} ريال)')
        lines.append(f'\n💬 اسألني عن:\nأفضل بائع | هدف موظف | مبيعات اليوم | فواتير معلقة | خصومات | منتجات | ترتيب الموظفين')
        return '\n'.join(lines)

    def _employee_query(self, q, emp=None, **kw):
        if emp:
            return self._employee_profile(emp)
        return self._employees_list(q)

    def _employee_profile(self, emp: Employee) -> str:
        # Manager gets a special report
        if _is_manager(emp):
            return self._build_manager_report(emp)

        today = date.today()
        d_from, d_to = _this_month()
        wk_from, wk_to = _this_week()
        days_left = max(calendar.monthrange(today.year, today.month)[1] - today.day, 1)

        achieved = _sales_between(d_from, d_to, emp.id)
        today_sales = _sales_between(today, today, emp.id)
        week_sales = _sales_between(wk_from, wk_to, emp.id)

        t_row = SalesTarget.query.filter_by(employee_id=emp.id, year=today.year, month=today.month).first()
        target = float(t_row.target_amount) if t_row else 0
        remaining = max(target - achieved, 0)
        daily = remaining / days_left if days_left else 0
        pct = _pct(achieved, target)

        p_cnt, p_amt = db.session.query(
            func.count(PendingInvoice.id), func.sum(PendingInvoice.net)
        ).filter_by(employee_id=emp.id, status='pending').one()

        disc_total = db.session.query(func.sum(PendingInvoice.discount)).filter(
            PendingInvoice.employee_id == emp.id, PendingInvoice.discount > 0,
        ).scalar() or 0

        cust_cnt = db.session.query(func.count(func.distinct(PendingInvoice.customer_name))).filter(
            PendingInvoice.employee_id == emp.id,
            PendingInvoice.customer_name.isnot(None),
        ).scalar() or 0

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
        lines.append(f'🧾 عدد العملاء:         {cust_cnt} عميل')
        lines.append(f'📋 فواتير معلقة:        {p_cnt or 0} ({_fmt(p_amt or 0)} ريال)')
        if disc_total > 0:
            lines.append(f'💸 إجمالي الخصومات:     {_fmt(disc_total)} ريال')
        return '\n'.join(lines)

    # ── fallback ──────────────────────────────────────────────────────────────

    def _unknown_fallback(self, q, emp=None, **kw) -> str:
        """Smart fallback: check month names, latest data, then guide."""
        today = date.today()
        d_from, d_to = _this_month()

        # 1. If employee detected but nothing matched → show their profile
        if emp:
            return self._employee_profile(emp)

        # 2. Check for month name in question
        q_lower = q.lower()
        for month_name, month_num in MONTH_MAP.items():
            if month_name in q_lower:
                year = today.year
                last_day = calendar.monthrange(year, month_num)[1]
                mf = date(year, month_num, 1)
                mt = date(year, month_num, last_day)
                total = _sales_between(mf, mt)
                if total > 0:
                    results = (
                        db.session.query(Employee.name, func.sum(SaleRecord.value).label('t'))
                        .join(SaleRecord)
                        .filter(SaleRecord.sale_date >= mf, SaleRecord.sale_date <= mt)
                        .group_by(Employee.id).order_by(func.sum(SaleRecord.value).desc()).all()
                    )
                    lines = [f'📅 **مبيعات {month_name} {year}**\nالإجمالي: {_fmt(total)} ريال\n']
                    medals = ['🥇', '🥈', '🥉'] + ['🏅'] * 20
                    for i, (n, t) in enumerate(results):
                        lines.append(f'{medals[i]} {n}: {_fmt(t)} ريال')
                    return '\n'.join(lines)

        # 3. Has data this month → monthly summary
        has_this_month = bool(db.session.query(SaleRecord.id).filter(
            SaleRecord.sale_date >= d_from
        ).first())
        if has_this_month:
            return self._monthly_summary(q)

        # 4. Has any data → show latest available period
        latest = db.session.query(func.max(SaleRecord.sale_date)).scalar()
        if latest:
            lf = latest.replace(day=1)
            total = _sales_between(lf, latest)
            results = (
                db.session.query(Employee.name, func.sum(SaleRecord.value).label('t'))
                .join(SaleRecord).filter(SaleRecord.sale_date >= lf)
                .group_by(Employee.id).order_by(func.sum(SaleRecord.value).desc()).all()
            )
            lines = [f'📊 **آخر بيانات متاحة – {lf.strftime("%B %Y")}**\nالإجمالي: {_fmt(total)} ريال\n']
            medals = ['🥇', '🥈', '🥉'] + ['🏅'] * 20
            for i, (n, t) in enumerate(results):
                lines.append(f'{medals[i]} {n}: {_fmt(t)} ريال')
            return '\n'.join(lines)

        # 5. No data at all
        return (
            'لم أتمكن من فهم سؤالك بشكل دقيق. 🤔\n\n'
            'جرّب واحداً من هذه:\n'
            '• **أفضل بائع** | **ترتيب الموظفين** | **من الأضعف**\n'
            '• **مبيعات اليوم / الأسبوع / الشهر الماضي**\n'
            '• **مبيعات [اسم الموظف]** — مثال: مبيعات محمد\n'
            '• **هدف الفرع** | **نسبة الإنجاز**\n'
            '• **الفواتير المعلقة** | **خصومات** | **جودة الفواتير**\n'
            '• **مدير الفرع** — تقرير أحمد قحطاني\n'
            '• **مساعد** — لرؤية كل الأوامر'
        )

    def _help_message(self) -> str:
        return (
            'مرحباً! أنا AQ، مساعدك الذكي 🤖\n\n'
            'يمكنني الإجابة على أي سؤال عن البيانات:\n\n'
            '• **أفضل بائع** أو **أفضل 3 بائعين**\n'
            '• **مبيعات اليوم / الأسبوع / الشهر / الشهر الماضي**\n'
            '• **مبيعات [اسم الموظف]** — تقرير كامل\n'
            '• **هدف الفرع** — نسبة إنجاز الفرع كاملاً\n'
            '• **مدير الفرع** — تقرير أحمد قحطاني\n'
            '• **هدف [اسم الموظف]** — الهدف المتبقي واليومي\n'
            '• **نسبة الإنجاز** — لكل موظف\n'
            '• **من الأضعف / ترتيب الموظفين**\n'
            '• **ليش [اسم الموظف] ضعيف** — تحليل الأسباب\n'
            '• **فواتير معلقة** | **خصومات** | **جودة الفواتير**\n'
            '• **منتجات / فئات** — أفضل المنتجات\n'
            '• **عملاء** — أكبر العملاء\n'
            '• **يناير / فبراير / مارس...** — مبيعات أي شهر\n'
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

    mgr = _get_branch_manager()
    mgr_id = mgr.id if mgr else None
    employees = Employee.query.filter_by(is_active=True).all()
    # Exclude manager from individual salesperson rules
    salespeople = [e for e in employees if e.id != mgr_id]

    # Rule 1: below 80% for 2 months
    for emp in salespeople:
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
                f'⚠️ {emp.name} أداؤه أقل من 80% لشهرين متتاليين — يحتاج متابعة.',
                f'{emp.name} underperformed (<80%) for 2 consecutive months.'))

    # Rule 2: top performer
    top = (
        db.session.query(Employee.name, func.sum(SaleRecord.value).label('total'))
        .join(SaleRecord)
        .filter(
            SaleRecord.sale_date >= d_from, SaleRecord.sale_date <= d_to,
            SaleRecord.employee_id != mgr_id if mgr_id else True,
        )
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
    for emp in salespeople:
        if emp.id not in ids_with_sales:
            advice.append(_card('danger', emp.name,
                f'⚠️ لا توجد مبيعات مسجلة للموظف {emp.name} هذا الشهر.',
                f'⚠️ No sales for {emp.name} this month.'))

    # Rule 4: high discounts warning
    disc_result = (
        db.session.query(
            Employee.name,
            func.sum(PendingInvoice.discount).label('disc'),
            func.sum(PendingInvoice.net).label('net'),
        )
        .join(PendingInvoice, PendingInvoice.employee_id == Employee.id)
        .filter(PendingInvoice.discount > 0)
        .group_by(Employee.id)
        .having(func.sum(PendingInvoice.discount) > func.sum(PendingInvoice.net) * 0.1)
        .all()
    )
    for row in disc_result:
        pct = round(float(row.disc or 0) / float(row.net or 1) * 100, 1)
        advice.append(_card('warning', row.name,
            f'💸 خصومات {row.name} مرتفعة: {_fmt(row.disc)} ريال ({pct}% من صافي الفواتير).',
            f'💸 {row.name} has high discounts: {_fmt(row.disc)} SAR ({pct}% of net).'))

    # Rule 5: branch target progress
    ct = CompanyTarget.query.filter_by(year=today.year, month=today.month).first()
    if ct and ct.total_target:
        branch_sales = _sales_between(d_from, d_to)
        pct = _pct(branch_sales, ct.total_target)
        days_left = max(calendar.monthrange(today.year, today.month)[1] - today.day, 1)
        days_total = calendar.monthrange(today.year, today.month)[1]
        expected_pct = round((days_total - days_left) / days_total * 100, 1)
        if pct < expected_pct - 10:
            advice.append(_card('warning', None,
                f'🎯 إنجاز الفرع {pct}% وهو أقل من المتوقع ({expected_pct}%) بحسب الأيام المنقضية.',
                f'🎯 Branch at {pct}%, behind expected pace ({expected_pct}%).'))
        elif pct >= 100:
            advice.append(_card('success', None,
                f'🎉 الفرع حقق هدفه بنسبة {pct}%! عمل رائع.',
                f'🎉 Branch achieved {pct}% of target! Great work.'))

    # Rule 6: declining categories
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
