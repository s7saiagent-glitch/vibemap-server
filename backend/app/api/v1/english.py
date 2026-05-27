from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_student
from app.models.user import User
from app.models.english import (
    EnglishCourse, EnglishUnit, EnglishStudentProgress,
    PlacementTest, CEFRLevel
)
from app.services.ai.english_tutor import EnglishTutorAgent

router = APIRouter(prefix="/english", tags=["اللغة الإنجليزية"])


@router.get("/courses")
async def get_english_courses(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EnglishCourse).where(EnglishCourse.is_active == True)
        .order_by(EnglishCourse.level)
    )
    courses = result.scalars().all()
    return [
        {
            "id": c.id,
            "level": c.level.value,
            "name": c.name,
            "name_ar": c.name_ar,
            "description_ar": c.description_ar,
            "total_units": c.total_units,
            "estimated_hours": c.estimated_hours,
            "skills_focus": c.skills_focus,
        }
        for c in courses
    ]


@router.post("/placement-test")
async def submit_placement_test(
    answers: dict,
    time_spent_minutes: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    tutor = EnglishTutorAgent()
    evaluation = await tutor.conduct_placement_test_evaluation(answers, time_spent_minutes)

    recommended_level = CEFRLevel(evaluation.get("recommended_level", "B1"))

    test_record = PlacementTest(
        student_id=current_user.id,
        test_date=datetime.now(timezone.utc),
        placement_score=evaluation.get("overall_score", 50),
        recommended_level=recommended_level,
        answers=answers,
        time_spent_minutes=time_spent_minutes,
        grammar_score=evaluation.get("grammar_score", 0),
        vocabulary_score=evaluation.get("vocabulary_score", 0),
        reading_score=evaluation.get("reading_score", 0),
        ai_assessment=evaluation.get("overall_feedback_ar", ""),
    )
    db.add(test_record)

    course_result = await db.execute(
        select(EnglishCourse).where(EnglishCourse.level == recommended_level)
    )
    course = course_result.scalar_one_or_none()

    if current_user.student_profile and course:
        progress_result = await db.execute(
            select(EnglishStudentProgress).where(
                EnglishStudentProgress.student_id == current_user.student_profile.id,
                EnglishStudentProgress.course_id == course.id,
            )
        )
        existing_progress = progress_result.scalar_one_or_none()
        if not existing_progress:
            progress = EnglishStudentProgress(
                student_id=current_user.student_profile.id,
                course_id=course.id,
                current_level=recommended_level,
                placement_test_score=evaluation.get("overall_score", 50),
                started_at=datetime.now(timezone.utc),
                last_activity=datetime.now(timezone.utc),
            )
            db.add(progress)

    await db.commit()

    return {
        "recommended_level": recommended_level.value,
        "overall_score": evaluation.get("overall_score"),
        "grammar_score": evaluation.get("grammar_score"),
        "vocabulary_score": evaluation.get("vocabulary_score"),
        "level_description_ar": evaluation.get("level_description_ar"),
        "strengths_ar": evaluation.get("strengths_ar"),
        "areas_to_improve_ar": evaluation.get("areas_to_improve_ar"),
        "recommended_course_ar": evaluation.get("recommended_course_ar"),
        "study_tips": evaluation.get("study_tips_ar", []),
    }


@router.get("/my-progress")
async def get_my_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    if not current_user.student_profile:
        raise HTTPException(status_code=404, detail="ملف الطالب غير موجود")

    result = await db.execute(
        select(EnglishStudentProgress).where(
            EnglishStudentProgress.student_id == current_user.student_profile.id
        )
    )
    progress_list = result.scalars().all()

    if not progress_list:
        return {"message": "لم يبدأ برنامج اللغة الإنجليزية بعد", "progress": []}

    return {
        "progress": [
            {
                "course_id": p.course_id,
                "current_level": p.current_level.value,
                "placement_test_score": p.placement_test_score,
                "completed_units": p.completed_units,
                "reading_score": p.reading_score,
                "writing_score": p.writing_score,
                "grammar_score": p.grammar_score,
                "vocabulary_score": p.vocabulary_score,
                "total_study_hours": p.total_study_hours,
                "streak_days": p.streak_days,
                "last_activity": p.last_activity.isoformat() if p.last_activity else None,
            }
            for p in progress_list
        ]
    }


@router.get("/courses/{level}/units")
async def get_course_units(
    level: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    try:
        cefr_level = CEFRLevel(level.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail="مستوى غير صحيح")

    course_result = await db.execute(
        select(EnglishCourse).where(EnglishCourse.level == cefr_level)
    )
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="الكورس غير موجود")

    units_result = await db.execute(
        select(EnglishUnit).where(
            EnglishUnit.course_id == course.id,
            EnglishUnit.is_published == True,
        ).order_by(EnglishUnit.unit_number)
    )
    units = units_result.scalars().all()

    return {
        "course": {
            "id": course.id,
            "level": course.level.value,
            "name_ar": course.name_ar,
            "total_units": course.total_units,
        },
        "units": [
            {
                "id": u.id,
                "unit_number": u.unit_number,
                "title": u.title,
                "title_ar": u.title_ar,
                "grammar_topic": u.grammar_topic,
                "vocabulary_topic": u.vocabulary_topic,
                "has_reading": bool(u.reading_passage),
                "has_writing": bool(u.writing_task),
            }
            for u in units
        ],
    }


@router.post("/chat")
async def chat_with_english_tutor(
    message: str,
    level: str = "B1",
    conversation_history: list = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    tutor = EnglishTutorAgent()
    history = conversation_history or []
    result = await tutor.chat(
        message=message,
        student_level=level.upper(),
        history=history,
    )
    return result


@router.post("/exercises/{unit_id}/submit")
async def submit_exercises(
    unit_id: int,
    answers: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    unit_result = await db.execute(select(EnglishUnit).where(EnglishUnit.id == unit_id))
    unit = unit_result.scalar_one_or_none()
    if not unit:
        raise HTTPException(status_code=404, detail="الوحدة غير موجودة")

    exercises = unit.exercises or []
    correct_count = 0
    total = len(exercises)
    feedback = []

    for exercise in exercises:
        ex_id = str(exercise.get("id"))
        student_answer = answers.get(ex_id, "")
        correct_answer = exercise.get("answer", "")

        is_correct = student_answer.strip().lower() == correct_answer.strip().lower()
        if is_correct:
            correct_count += 1

        feedback.append({
            "exercise_id": ex_id,
            "is_correct": is_correct,
            "student_answer": student_answer,
            "correct_answer": correct_answer,
            "tip": exercise.get("tip_ar", ""),
        })

    score = (correct_count / total * 100) if total > 0 else 0

    return {
        "score": round(score, 1),
        "correct": correct_count,
        "total": total,
        "feedback": feedback,
        "passed": score >= 60,
    }
