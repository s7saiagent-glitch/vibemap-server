import json
import anthropic
from app.core.config import settings


CEFR_DESCRIPTIONS = {
    "A1": "مبتدئ - يفهم ويستخدم عبارات مألوفة وبسيطة جداً",
    "A2": "أساسي - يفهم جملاً وتعبيرات شائعة الاستخدام",
    "B1": "متوسط - يفهم النقاط الرئيسية في مواقف اعتيادية",
    "B2": "فوق المتوسط - يفهم أفكاراً رئيسية في نصوص معقدة",
    "C1": "متقدم - يفهم مجموعة واسعة من النصوص المطولة الصعبة",
    "C2": "إتقان تام - يفهم بسهولة كل ما يسمعه ويقرأه",
}

ENGLISH_TUTOR_SYSTEM = """You are Professor Sarah, a professional English language tutor specializing in teaching English to Arabic speakers.

## Your Teaching Profile:
- Warm, encouraging, and patient
- Expert in CEFR framework (A1 to C2)
- Teaching method: Communicative Language Teaching (CLT)
- Specialization: Grammar, Vocabulary, Writing, Reading, Listening

## Student Level: {level} - {level_description}

## Teaching Rules:
1. Always correct grammatical errors gently and explain why
2. Introduce new vocabulary in context
3. Use Arabic explanations when the student is A1/A2 level
4. For B1+ levels, teach in English with Arabic support only when needed
5. Provide POSITIVE reinforcement before correction
6. Give practical examples from everyday life
7. End each response with a mini-exercise or question

## Response Format:
- Correct the student's English if needed (show: ❌ Wrong → ✅ Correct)
- Explain the grammar rule briefly
- Provide an example
- Continue the conversation naturally
"""


class EnglishTutorAgent:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.DEFAULT_AI_MODEL

    async def chat(self, message: str, student_level: str, history: list) -> dict:
        level_desc = CEFR_DESCRIPTIONS.get(student_level, "متوسط")
        system = ENGLISH_TUTOR_SYSTEM.format(
            level=student_level, level_description=level_desc
        )

        messages = []
        for msg in history[-15:]:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": message})

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=system,
            messages=messages,
        )

        ai_text = response.content[0].text

        vocabulary = await self._extract_vocabulary(ai_text, student_level)

        return {
            "response": ai_text,
            "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
            "new_vocabulary": vocabulary,
            "level": student_level,
        }

    async def grade_writing(self, text: str, level: str, task_type: str) -> dict:
        prompt = f"""Grade this English writing task for a {level} level student.

Task Type: {task_type}
Student's Writing:
---
{text}
---

Evaluate and provide feedback in Arabic + English.
Return JSON:
{{
  "overall_score": number (0-100),
  "band_score": "{level}",
  "grammar_score": number (0-100),
  "vocabulary_score": number (0-100),
  "coherence_score": number (0-100),
  "task_achievement": number (0-100),
  "corrected_text": "corrected version",
  "grammar_errors": [
    {{"error": "original", "correction": "fixed", "rule": "grammar rule explanation"}}
  ],
  "vocabulary_feedback": "vocabulary assessment in Arabic",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "overall_feedback_ar": "تغذية راجعة شاملة بالعربية",
  "overall_feedback_en": "Overall feedback in English"
}}"""

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        )
        try:
            text_resp = response.content[0].text.strip()
            if text_resp.startswith("```"):
                text_resp = text_resp.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(text_resp)
        except json.JSONDecodeError:
            return {"overall_score": 0, "feedback": response.content[0].text, "error": "parsing_failed"}

    async def generate_exercises(self, skill: str, level: str, topic: str) -> dict:
        skill_names = {
            "grammar": "Grammar",
            "vocabulary": "Vocabulary",
            "reading": "Reading Comprehension",
            "writing": "Writing",
            "listening": "Listening (transcript-based)",
        }
        skill_name = skill_names.get(skill, skill)

        prompt = f"""Create 5 English {skill_name} exercises for {level} level students on the topic: "{topic}".

Return JSON:
{{
  "skill": "{skill}",
  "level": "{level}",
  "topic": "{topic}",
  "instructions_ar": "تعليمات التمرين بالعربية",
  "exercises": [
    {{
      "id": 1,
      "type": "fill_blank|mcq|reorder|error_correction|short_answer",
      "instruction": "Exercise instruction",
      "content": "Exercise content",
      "options": ["A) option", "B) option"],
      "answer": "correct answer",
      "explanation": "Why this is correct",
      "tip_ar": "نصيحة للطالب بالعربية"
    }}
  ],
  "vocabulary_focus": ["word1 - definition", "word2 - definition"],
  "grammar_note": "Grammar point covered"
}}"""

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=2500,
            messages=[{"role": "user", "content": prompt}],
        )
        try:
            text_resp = response.content[0].text.strip()
            if text_resp.startswith("```"):
                text_resp = text_resp.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(text_resp)
        except json.JSONDecodeError:
            return {"error": "فشل في إنشاء التمارين"}

    async def conduct_placement_test_evaluation(self, answers: dict, time_spent: int) -> dict:
        prompt = f"""Evaluate this English placement test and determine the CEFR level.

Test Answers: {json.dumps(answers, ensure_ascii=False)}
Time Spent: {time_spent} minutes

Based on the answers, determine:
1. Grammar score (0-100)
2. Vocabulary score (0-100)
3. Reading score (0-100)
4. Overall score (0-100)
5. CEFR level (A1/A2/B1/B2/C1/C2)

Scoring guide:
- 0-20%: A1
- 21-35%: A2
- 36-55%: B1
- 56-70%: B2
- 71-85%: C1
- 86-100%: C2

Return JSON:
{{
  "grammar_score": number,
  "vocabulary_score": number,
  "reading_score": number,
  "overall_score": number,
  "recommended_level": "B1",
  "level_description_ar": "وصف المستوى بالعربية",
  "strengths_ar": "نقاط القوة بالعربية",
  "areas_to_improve_ar": "مجالات التحسين بالعربية",
  "recommended_course_ar": "اسم الكورس المقترح بالعربية",
  "study_tips_ar": ["نصيحة 1", "نصيحة 2"]
}}"""

        response = await self.client.messages.create(
            model=self.model,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        try:
            text_resp = response.content[0].text.strip()
            if text_resp.startswith("```"):
                text_resp = text_resp.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(text_resp)
        except json.JSONDecodeError:
            return {
                "overall_score": 50,
                "recommended_level": "B1",
                "error": "evaluation_failed",
            }

    async def _extract_vocabulary(self, response_text: str, level: str) -> list:
        if len(response_text) < 100:
            return []
        try:
            prompt = f"""From this English lesson response, extract 3-5 key vocabulary words suitable for {level} level.
Text: {response_text[:500]}
Return JSON array: [{{"word": "example", "definition_ar": "مثال", "example": "This is an example."}}]
Return ONLY JSON array."""
            result = await self.client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}],
            )
            return json.loads(result.content[0].text.strip())
        except Exception:
            return []
