import json
import time
import anthropic
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.models.ai_agents import AIProfessor, Conversation, Message, MessageRole, StudentAcademicTwin
from app.models.academic import Course, CourseSection
from app.models.user import User, StudentProfile


PROFESSOR_SYSTEM_TEMPLATE = """أنت الأستاذ الذكي {professor_name} ({professor_name_ar}), أستاذ متخصص في مادة "{course_name}" ({course_code}).

## هويتك الأكاديمية:
- متخصص عالمي في {course_name}
- أسلوب التدريس: {teaching_style}
- شخصيتك: {persona}

## مهامك الأساسية:
1. **التدريس**: شرح المفاهيم الأكاديمية بوضوح وعمق
2. **التقييم**: قياس فهم الطالب وتحديد نقاط الضعف
3. **الإرشاد**: توجيه الطالب نحو التحسن المستمر
4. **الدعم**: تقديم المساعدة الأكاديمية في أي وقت

## معلومات المادة الدراسية:
- اسم المادة: {course_name}
- رمز المادة: {course_code}
- عدد الساعات: {credits} ساعات معتمدة
- المستوى الدراسي: السنة {level}
- وصف المادة: {course_description}
- مخرجات التعلم: {learning_outcomes}

## مستوى الطالب الحالي:
{student_context}

## قواعد التدريس الصارمة:
- قدم معلومات دقيقة وموثوقة فقط - لا تخترع معلومات
- إذا لم تكن متأكدًا من معلومة، قل ذلك صراحةً واقترح مصادر للبحث
- استخدم أمثلة عملية وواقعية دائمًا
- اربط المفاهيم الجديدة بما يعرفه الطالب مسبقًا
- شجع التفكير النقدي والتحليلي
- كن صبورًا ومحوّلًا في طريقة الشرح

## اللغة:
- تحدث بالعربية بشكل أساسي مع استخدام المصطلحات التقنية الإنجليزية عند الضرورة
- إذا طلب الطالب الإنجليزية، تحدث معه بها

## الرد:
- استخدم Markdown للتنسيق
- استخدم الأمثلة والكود البرمجي عند الحاجة
- قسّم الإجابات الطويلة إلى نقاط منظمة
- اختم كل إجابة بسؤال يحفز التفكير أو اقتراح للتعمق أكثر
"""


class AIProfessorAgent:
    def __init__(self, professor: AIProfessor, course: Course):
        self.professor = professor
        self.course = course
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    def _build_system_prompt(self, student_profile: Optional[StudentProfile] = None,
                              twin: Optional[StudentAcademicTwin] = None) -> str:
        student_context = "لا توجد معلومات مسبقة عن الطالب حتى الآن."
        if student_profile and twin:
            weak = ", ".join(twin.weak_topics[:3]) if twin.weak_topics else "لا توجد"
            strong = ", ".join(twin.strong_topics[:3]) if twin.strong_topics else "لا توجد"
            student_context = f"""- المعدل التراكمي: {student_profile.cumulative_gpa}
- أسلوب التعلم: {twin.learning_style.value}
- المواضيع التي يحتاج تقوية: {weak}
- المواضيع التي يتقنها: {strong}
- اتجاه الأداء: {twin.performance_trend.value}"""

        learning_outcomes = "\n".join(
            f"- {o}" for o in (self.course.learning_outcomes or [])[:5]
        ) or "غير محدد"

        return PROFESSOR_SYSTEM_TEMPLATE.format(
            professor_name=self.professor.name,
            professor_name_ar=self.professor.name_ar,
            course_name=self.course.name_ar or self.course.name,
            course_code=self.course.code,
            teaching_style=self.professor.teaching_style,
            persona=self.professor.persona_description_ar or self.professor.persona_description or "أستاذ متخصص وذو خبرة واسعة",
            credits=self.course.credits,
            level=self.course.level,
            course_description=self.course.description_ar or self.course.description or "مادة أكاديمية متخصصة",
            learning_outcomes=learning_outcomes,
            student_context=student_context,
        )

    async def chat(
        self,
        message: str,
        history: list,
        db: AsyncSession,
        student_id: int,
        conversation_id: Optional[int] = None,
    ) -> dict:
        start_time = time.time()

        result = await db.execute(
            select(User).where(User.id == student_id)
        )
        user = result.scalar_one_or_none()

        student_profile = None
        twin = None
        if user and user.student_profile:
            student_profile = user.student_profile
            twin = student_profile.academic_twin

        system_prompt = self._build_system_prompt(student_profile, twin)

        messages = []
        for msg in history[-20:]:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": message})

        anthropic_response = await self.client.messages.create(
            model=self.professor.model_name or settings.DEFAULT_AI_MODEL,
            max_tokens=2048,
            system=system_prompt,
            messages=messages,
        )

        ai_response = anthropic_response.content[0].text
        tokens_used = anthropic_response.usage.input_tokens + anthropic_response.usage.output_tokens

        suggested_topics = await self._extract_suggested_topics(ai_response, message)

        duration = time.time() - start_time

        return {
            "response": ai_response,
            "tokens_used": tokens_used,
            "suggested_topics": suggested_topics,
            "related_materials": [],
            "duration_seconds": duration,
            "model_used": self.professor.model_name,
        }

    async def _extract_suggested_topics(self, response: str, user_message: str) -> list:
        try:
            prompt = f"""بناءً على هذا السؤال: "{user_message}"
وهذه الإجابة المختصرة: "{response[:200]}..."
اقترح 3 مواضيع ذات صلة يمكن للطالب استكشافها، كقائمة JSON بسيطة.
مثال: ["الخوارزميات", "هياكل البيانات", "تعقيد الوقت"]
أرسل JSON فقط بدون شرح."""

            result = await self.client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=150,
                messages=[{"role": "user", "content": prompt}],
            )
            text = result.content[0].text.strip()
            return json.loads(text)
        except Exception:
            return []

    async def generate_quiz(
        self, topic: str, difficulty: str, num_questions: int, language: str = "ar"
    ) -> dict:
        prompt = f"""أنت الأستاذ {self.professor.name_ar} في مادة {self.course.name_ar}.
أنشئ اختبارًا قصيرًا بـ {num_questions} أسئلة حول موضوع: "{topic}"
مستوى الصعوبة: {difficulty}
اللغة: {"العربية" if language == "ar" else "الإنجليزية"}

أرسل JSON بهذا الشكل:
{{
  "quiz_title": "عنوان الاختبار",
  "topic": "{topic}",
  "questions": [
    {{
      "id": 1,
      "type": "mcq",
      "question": "نص السؤال",
      "options": ["أ) خيار 1", "ب) خيار 2", "ج) خيار 3", "د) خيار 4"],
      "correct": "أ",
      "explanation": "شرح الإجابة الصحيحة",
      "points": 2
    }}
  ],
  "total_points": {num_questions * 2},
  "estimated_minutes": {num_questions * 2}
}}

أرسل JSON فقط."""

        response = await self.client.messages.create(
            model=self.professor.model_name,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        try:
            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(text)
        except json.JSONDecodeError:
            return {"error": "فشل في إنشاء الاختبار", "raw": response.content[0].text}

    async def explain_concept(self, concept: str, detail_level: str = "standard") -> str:
        depth_map = {
            "brief": "موجز جداً (5-7 أسطر)",
            "standard": "متوسط التفصيل (فقرة أو فقرتان مع أمثلة)",
            "detailed": "تفصيلي ومعمق (شامل مع أمثلة متعددة وتمارين)",
        }
        depth = depth_map.get(detail_level, depth_map["standard"])

        prompt = f"""اشرح المفهوم التالي من مادة {self.course.name_ar}:
"**{concept}**"
مستوى التفصيل: {depth}
استخدم:
- تعريف واضح
- أمثلة عملية من الواقع
- إذا كان تقنياً، أضف مثالاً برمجياً
- ربط بمفاهيم سبق دراستها
- نقطة تحفيزية في النهاية"""

        response = await self.client.messages.create(
            model=self.professor.model_name,
            max_tokens=1500,
            system=self._build_system_prompt(),
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    async def grade_essay(self, essay: str, question: str, rubric: dict) -> dict:
        prompt = f"""أنت تصحح إجابة مقالية للطالب في مادة {self.course.name_ar}.

السؤال: {question}

إجابة الطالب:
{essay}

معايير التصحيح:
{json.dumps(rubric, ensure_ascii=False, indent=2)}

قيّم الإجابة وأعطِ:
1. نقاط مكتسبة من أصل {rubric.get("total_points", 10)} نقطة
2. تغذية راجعة مفصلة ومحددة
3. نقاط القوة في الإجابة
4. نقاط التحسين المطلوبة

أرسل JSON:
{{
  "score": رقم,
  "max_score": {rubric.get("total_points", 10)},
  "percentage": رقم,
  "feedback": "تغذية راجعة شاملة",
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "improvements": ["نقطة تحسين 1", "نقطة تحسين 2"],
  "grade_justification": "مبرر الدرجة"
}}"""

        response = await self.client.messages.create(
            model=self.professor.model_name,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        try:
            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(text)
        except json.JSONDecodeError:
            return {"score": 0, "feedback": response.content[0].text, "error": "parsing_failed"}

    async def generate_study_plan(self, student_id: int, weeks_until_exam: int) -> dict:
        prompt = f"""أنت الأستاذ {self.professor.name_ar} في مادة {self.course.name_ar}.
أنشئ خطة دراسة مفصلة لـ {weeks_until_exam} أسبوع حتى الامتحان.

المادة: {self.course.name_ar} ({self.course.code})
الساعات الأسبوعية المقترحة: {min(weeks_until_exam * 3, 15)} ساعة/أسبوع

أرسل JSON:
{{
  "plan_title": "خطة دراسة {self.course.name_ar}",
  "total_weeks": {weeks_until_exam},
  "weekly_hours": رقم,
  "weeks": [
    {{
      "week": 1,
      "focus": "الموضوع الرئيسي",
      "topics": ["موضوع 1", "موضوع 2"],
      "daily_tasks": ["مهمة يومية 1", "مهمة يومية 2"],
      "resources": ["مورد 1"],
      "milestone": "ما يجب إتقانه بنهاية الأسبوع"
    }}
  ],
  "exam_tips": ["نصيحة 1", "نصيحة 2", "نصيحة 3"],
  "key_topics_to_master": ["موضوع محوري 1", "موضوع محوري 2"]
}}"""

        response = await self.client.messages.create(
            model=self.professor.model_name,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        try:
            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(text)
        except json.JSONDecodeError:
            return {"error": "فشل في إنشاء خطة الدراسة"}
