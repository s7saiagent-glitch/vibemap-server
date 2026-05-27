import json
import anthropic
from app.core.config import settings
from app.models.academic import Course, Program


class ContentGeneratorService:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.DEFAULT_AI_MODEL

    async def generate_lecture(self, course: Course, topic: str, duration_minutes: int = 60) -> dict:
        prompt = f"""أنت أكاديمي متخصص في إنشاء محتوى تعليمي لمادة "{course.name_ar}" ({course.code}).
أنشئ محاضرة أكاديمية احترافية حول: "{topic}"
مدة المحاضرة: {duration_minutes} دقيقة

الشرائح يجب أن تكون بين 10-15 شريحة.

أرسل JSON بهذا الهيكل:
{{
  "title": "عنوان المحاضرة",
  "title_ar": "عنوان المحاضرة بالعربية",
  "overview": "نظرة عامة على المحاضرة",
  "learning_objectives": ["هدف 1", "هدف 2", "هدف 3"],
  "key_concepts": ["مفهوم 1", "مفهوم 2"],
  "slides": [
    {{
      "slide_number": 1,
      "type": "title",
      "title": "عنوان الشريحة",
      "content": "محتوى الشريحة",
      "notes": "ملاحظات المحاضر",
      "duration_minutes": 3
    }}
  ],
  "summary": "ملخص المحاضرة",
  "discussion_questions": ["سؤال 1", "سؤال 2"],
  "further_reading": ["مرجع 1", "مرجع 2"],
  "assignment": "واجب المحاضرة المقترح"
}}"""

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}],
        )
        try:
            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(text)
        except json.JSONDecodeError:
            return {
                "title": f"محاضرة: {topic}",
                "content": response.content[0].text,
                "slides": [],
                "error": "parsing_failed",
            }

    async def generate_assessment(
        self, course: Course, assessment_type: str,
        num_questions: int, difficulty: str
    ) -> dict:
        type_names = {
            "quiz": "اختبار قصير",
            "midterm": "اختبار منتصف الفصل",
            "final": "الاختبار النهائي",
            "assignment": "واجب دراسي",
        }
        type_ar = type_names.get(assessment_type, assessment_type)

        prompt = f"""أنت خبير في إنشاء الاختبارات الأكاديمية لمادة "{course.name_ar}" ({course.code}).
أنشئ {type_ar} يحتوي على {num_questions} سؤال.
مستوى الصعوبة: {difficulty}
المستوى الدراسي: السنة {course.level}

أرسل JSON:
{{
  "title": "عنوان الاختبار",
  "title_ar": "عنوان الاختبار بالعربية",
  "instructions": "تعليمات الاختبار",
  "total_points": {num_questions * 5},
  "estimated_minutes": {num_questions * 3},
  "questions": [
    {{
      "id": 1,
      "type": "mcq",
      "content": "نص السؤال",
      "content_ar": "نص السؤال بالعربية",
      "options": [
        {{"text": "الخيار أ", "is_correct": true}},
        {{"text": "الخيار ب", "is_correct": false}},
        {{"text": "الخيار ج", "is_correct": false}},
        {{"text": "الخيار د", "is_correct": false}}
      ],
      "correct_answer": "أ",
      "explanation": "شرح الإجابة",
      "points": 5,
      "difficulty": "{difficulty}",
      "topic_tag": "الموضوع"
    }}
  ]
}}
اجعل الأسئلة متنوعة (MCQ، صح/خطأ، إجابة قصيرة إذا كانت النسبة تسمح)."""

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}],
        )
        try:
            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(text)
        except json.JSONDecodeError:
            return {"error": "فشل في إنشاء الاختبار", "raw": response.content[0].text[:500]}

    async def generate_course_syllabus(self, program: Program, course_name: str, credits: int) -> dict:
        prompt = f"""أنت أكاديمي خبير في برامج {program.name_ar}.
أنشئ خطة مقرر (Syllabus) احترافية لمادة: "{course_name}"
عدد الساعات: {credits} ساعات معتمدة
البرنامج: {program.name_ar}
مستوى الدرجة: {program.degree_level.value}

أرسل JSON شامل يتضمن:
{{
  "course_name": "اسم المادة",
  "course_name_ar": "اسم المادة بالعربية",
  "credits": {credits},
  "description": "وصف المادة",
  "prerequisites": ["متطلب 1"],
  "learning_outcomes": ["مخرج 1", "مخرج 2"],
  "weekly_schedule": [
    {{"week": 1, "topic": "الموضوع", "activities": "الأنشطة"}}
  ],
  "grading": {{
    "midterm": 30,
    "final": 40,
    "assignments": 20,
    "participation": 10
  }},
  "textbooks": ["كتاب 1"],
  "references": ["مرجع 1"]
}}"""

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}],
        )
        try:
            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(text)
        except json.JSONDecodeError:
            return {"error": "فشل في إنشاء خطة المقرر"}

    async def generate_study_notes(self, topic: str, course_name: str, level: str = "intermediate") -> str:
        prompt = f"""أنشئ ملخصًا دراسيًا احترافيًا لموضوع:
**{topic}**
من مادة: {course_name}
المستوى: {level}

اجعل الملخص:
- منظمًا بعناوين واضحة (Markdown)
- يشمل التعريفات، المفاهيم الأساسية، الأمثلة
- يتضمن جدولًا مقارنًا إن أمكن
- ينتهي بنقاط مراجعة سريعة
- لا يزيد عن 800 كلمة"""

        response = await self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
