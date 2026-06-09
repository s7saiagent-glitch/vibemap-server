"""
Sahs Pro: Rule-based intelligent assistant with optional LLM fallback.
"""
import re
from datetime import date, timedelta
from sqlalchemy import func, extract
from app import db
from app.models import (Employee, SaleRecord, SalesTarget, CompanyTarget,
                        PendingInvoice, SalesProductivityRecord)


class SahsPro:
    def __init__(self, openai_key: str = None):
        self.openai_key = openai_key

    def answer(self, question: str, lang: str = 'ar') -> str:
        q = question.strip().lower()

        handlers = [
            (r'top seller|أفضل بائع|أكثر مبيعا', self._top_seller),
            (r'pending invoice|فاتور.*معلق', self._pending_invoices),
            (r'remaining target|هدف.*متبقي|تارجت.*متبقي|باقي.*هدف', self._remaining_target),
            (r'performance|أداء|performance.*month|شهر', self._employee_performance),
            (r'target.*achiev|نسبة.*تحقيق|تحقيق.*هدف', self._target_achievement),
        ]

        for pattern, handler in handlers:
            if re.search(pattern, question, re.IGNORECASE):
                try:
                    result = handler(question, lang)
                    if result:
                        return result
                except Exception:
                    pass

        return self._generic_stats(lang)

    def _top_seller(self, question: str, lang: str) -> str:
        today = date.today()
        result = (
            db.session.query(
                Employee.name,
                func.sum(SaleRecord.value).label('total')
            )
            .join(SaleRecord)
            .filter(
                extract('year', SaleRecord.sale_date) == today.year,
                extract('month', SaleRecord.sale_date) == today.month,
            )
            .group_by(Employee.id)
            .order_by(func.sum(SaleRecord.value).desc())
            .first()
        )
        if not result:
            return ('لا توجد بيانات مبيعات للشهر الحالي.' if lang == 'ar'
                    else 'No sales data for current month.')
        if lang == 'ar':
            return f'أفضل بائع هذا الشهر: {result.name} بإجمالي {result.total:,.0f} ريال.'
        return f'Top seller this month: {result.name} with total {result.total:,.0f} SAR.'

    def _pending_invoices(self, question: str, lang: str) -> str:
        # Extract employee name from question
        emp_name = self._extract_name(question)
        query = db.session.query(func.count(PendingInvoice.id), func.sum(PendingInvoice.net))
        if emp_name:
            emp = Employee.query.filter(Employee.name.ilike(f'%{emp_name}%')).first()
            if emp:
                query = query.filter(PendingInvoice.employee_id == emp.id)
        count, total = query.one()
        count = count or 0
        total = total or 0
        if lang == 'ar':
            suffix = f' للموظف {emp_name}' if emp_name else ''
            return f'عدد الفواتير المعلقة{suffix}: {count} فاتورة بإجمالي {total:,.0f} ريال.'
        suffix = f' for {emp_name}' if emp_name else ''
        return f'Pending invoices{suffix}: {count} invoices totaling {total:,.0f} SAR.'

    def _remaining_target(self, question: str, lang: str) -> str:
        today = date.today()
        emp_name = self._extract_name(question)
        emp = None
        if emp_name:
            emp = Employee.query.filter(Employee.name.ilike(f'%{emp_name}%')).first()

        targets = SalesTarget.query.filter_by(year=today.year, month=today.month)
        if emp:
            targets = targets.filter_by(employee_id=emp.id)
        targets = targets.all()

        lines = []
        for t in targets:
            achieved = db.session.query(func.sum(SaleRecord.value)).filter(
                SaleRecord.employee_id == t.employee_id,
                extract('year', SaleRecord.sale_date) == today.year,
                extract('month', SaleRecord.sale_date) == today.month,
            ).scalar() or 0
            remaining = t.target_amount - achieved
            working_days = t.working_days or 26
            days_elapsed = today.day
            daily_needed = remaining / max(working_days - days_elapsed + 1, 1)
            e = Employee.query.get(t.employee_id)
            lines.append(f'{e.name}: متبقي {remaining:,.0f} ريال (يومي: {daily_needed:,.0f} ريال)'
                         if lang == 'ar' else
                         f'{e.name}: Remaining {remaining:,.0f} SAR (Daily: {daily_needed:,.0f} SAR)')

        if not lines:
            return ('لا توجد أهداف محددة لهذا الشهر.' if lang == 'ar'
                    else 'No targets set for this month.')
        return '\n'.join(lines)

    def _employee_performance(self, question: str, lang: str) -> str:
        today = date.today()
        emp_name = self._extract_name(question)
        query = db.session.query(Employee.name, func.sum(SaleRecord.value))
        query = query.join(SaleRecord)
        query = query.filter(
            extract('year', SaleRecord.sale_date) == today.year,
            extract('month', SaleRecord.sale_date) == today.month,
        )
        if emp_name:
            query = query.filter(Employee.name.ilike(f'%{emp_name}%'))
        results = query.group_by(Employee.id).all()
        if not results:
            return ('لا توجد بيانات.' if lang == 'ar' else 'No data available.')
        lines = []
        for name, total in results:
            target = db.session.query(func.sum(SalesTarget.target_amount)).filter(
                SalesTarget.year == today.year,
                SalesTarget.month == today.month,
            ).scalar() or 0
            pct = (total / target * 100) if target else 0
            lines.append(f'{name}: {total:,.0f} ريال ({pct:.1f}% من الهدف)'
                         if lang == 'ar' else
                         f'{name}: {total:,.0f} SAR ({pct:.1f}% of target)')
        return '\n'.join(lines)

    def _target_achievement(self, question: str, lang: str) -> str:
        today = date.today()
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
                extract('year', SaleRecord.sale_date) == today.year,
                extract('month', SaleRecord.sale_date) == today.month,
            )
            .group_by(Employee.id)
            .all()
        )
        if not results:
            return ('لا توجد بيانات مقارنة.' if lang == 'ar' else 'No comparison data.')
        lines = []
        for name, achieved, target in results:
            pct = (achieved / target * 100) if target else 0
            icon = '✅' if pct >= 100 else ('⚠️' if pct >= 80 else '🔴')
            lines.append(f'{icon} {name}: {pct:.1f}%')
        return '\n'.join(lines)

    def _generic_stats(self, lang: str) -> str:
        today = date.today()
        emp_count = Employee.query.filter_by(is_active=True).count()
        sales_count = db.session.query(func.count(SaleRecord.id)).filter(
            extract('year', SaleRecord.sale_date) == today.year,
            extract('month', SaleRecord.sale_date) == today.month,
        ).scalar() or 0
        total_sales = db.session.query(func.sum(SaleRecord.value)).filter(
            extract('year', SaleRecord.sale_date) == today.year,
            extract('month', SaleRecord.sale_date) == today.month,
        ).scalar() or 0

        if lang == 'ar':
            return (f'مرحبا! أنا ساهس برو. إليك ملخص هذا الشهر:\n'
                    f'• عدد الموظفين النشطين: {emp_count}\n'
                    f'• عدد فواتير هذا الشهر: {sales_count}\n'
                    f'• إجمالي المبيعات: {total_sales:,.0f} ريال\n'
                    f'يمكنك سؤالي عن: أفضل بائع، الفواتير المعلقة، الهدف المتبقي، أداء موظف معين.')
        return (f'Hi! I\'m Sahs Pro. Monthly snapshot:\n'
                f'• Active employees: {emp_count}\n'
                f'• Invoices this month: {sales_count}\n'
                f'• Total sales: {total_sales:,.0f} SAR\n'
                f'Ask me about: top seller, pending invoices, remaining target, employee performance.')

    @staticmethod
    def _extract_name(text: str) -> str:
        patterns = [
            r'employee\s+([A-Za-z؀-ۿ\s]+)',
            r'للموظف\s+([A-Za-z؀-ۿ\s]+)',
            r'موظف\s+([A-Za-z؀-ۿ\s]+)',
            r'for\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)',
        ]
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return ''


def generate_sales_advice(lang: str = 'ar') -> list[dict]:
    """Generate automated rule-based sales advice cards."""
    today = date.today()
    advice = []

    def _card(type_: str, employee, msg_ar: str, msg_en: str) -> dict:
        msg = msg_ar if lang == 'ar' else msg_en
        return {'type': type_, 'level': type_, 'employee': employee,
                'message': msg, 'message_ar': msg_ar, 'message_en': msg_en}

    # Rule 1: Under 80% target for 2 consecutive months
    employees = Employee.query.filter_by(is_active=True).all()
    for emp in employees:
        low_months = 0
        for months_back in [1, 2]:
            check_date = today.replace(day=1) - timedelta(days=months_back * 28)
            target = SalesTarget.query.filter_by(
                employee_id=emp.id, year=check_date.year, month=check_date.month
            ).first()
            if not target or target.target_amount == 0:
                continue
            achieved = db.session.query(func.sum(SaleRecord.value)).filter(
                SaleRecord.employee_id == emp.id,
                extract('year', SaleRecord.sale_date) == check_date.year,
                extract('month', SaleRecord.sale_date) == check_date.month,
            ).scalar() or 0
            if achieved / float(target.target_amount) < 0.80:
                low_months += 1
        if low_months >= 2:
            advice.append(_card(
                'warning', emp.name,
                f'الموظف {emp.name} أداؤه أقل من 80% لشهرين متتاليين — يُنصح بمراجعة الأداء وتقديم الدعم.',
                f'{emp.name} underperformed (<80%) for 2 consecutive months — recommend performance review.',
            ))

    # Rule 2: Employees currently above target
    top_emps = (
        db.session.query(Employee.name, func.sum(SaleRecord.value).label('total'))
        .join(SaleRecord)
        .filter(
            extract('year', SaleRecord.sale_date) == today.year,
            extract('month', SaleRecord.sale_date) == today.month,
        )
        .group_by(Employee.id)
        .order_by(func.sum(SaleRecord.value).desc())
        .all()
    )
    if top_emps:
        top = top_emps[0]
        advice.append(_card(
            'success', top.name,
            f'🏆 أفضل أداء هذا الشهر: {top.name} بإجمالي {top.total:,.0f} ريال.',
            f'🏆 Top performer this month: {top.name} with {top.total:,.0f} SAR.',
        ))

    # Rule 3: Employees with no sales this month
    emp_ids_with_sales = {r.employee_id for r in (
        db.session.query(SaleRecord.employee_id)
        .filter(
            extract('year', SaleRecord.sale_date) == today.year,
            extract('month', SaleRecord.sale_date) == today.month,
        ).all()
    )}
    for emp in employees:
        if emp.id not in emp_ids_with_sales:
            advice.append(_card(
                'danger', emp.name,
                f'⚠️ لا توجد مبيعات مسجلة للموظف {emp.name} هذا الشهر.',
                f'⚠️ No sales recorded for {emp.name} this month.',
            ))

    # Rule 4: Product declining trend
    from sqlalchemy import text
    try:
        declining = db.session.execute(text("""
            SELECT product_category,
                   SUM(CASE WHEN strftime('%Y-%m', sale_date) = strftime('%Y-%m', 'now', '-1 month') THEN value ELSE 0 END) AS prev_month,
                   SUM(CASE WHEN strftime('%Y-%m', sale_date) = strftime('%Y-%m', 'now') THEN value ELSE 0 END) AS curr_month
            FROM sale_records
            WHERE product_category IS NOT NULL AND product_category != ''
            GROUP BY product_category
            HAVING prev_month > 0 AND curr_month < prev_month * 0.8
        """)).fetchall()
        for row in declining:
            advice.append(_card(
                'info', None,
                f'📉 انخفاض مبيعات "{row[0]}" بأكثر من 20% — يُنصح بحملة ترويجية.',
                f'📉 "{row[0]}" sales down >20% vs last month — suggest a promotional campaign.',
            ))
    except Exception:
        pass

    # If no data at all, show a welcome message
    if not advice:
        advice.append(_card(
            'info', None,
            'لا توجد بيانات كافية بعد. قم برفع ملفات المبيعات أولاً لتظهر التوصيات.',
            'Not enough data yet. Upload your sales files first to see recommendations.',
        ))

    return advice
