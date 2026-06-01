from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime, timezone
from typing import List
import json
from app.core.database import get_db
from app.core.deps import get_current_student, get_current_admin
from app.models.user import User, StudentProfile
from app.models.academic import CourseSection, Course
from app.models.assessment import (
    Assessment, Question, StudentSubmission, QuestionAnswer,
    QuestionType, AssessmentType
)
from app.models.ai_agents import AIProfessor
from app.schemas.assessment import (
    AssessmentResponse, AssessmentWithQuestions, AssessmentCreate,
    SubmissionCreate, SubmissionResponse, GradeReport
)
from app.services.academic_service import calculate_letter_grade
from app.services.ai.professor_agent import AIProfessorAgent
from app.services.ai.content_generator import ContentGeneratorService

router = APIRouter(prefix="/assessments", tags=["الاختبارات"])


@router.get("/section/{section_id}", response_model=List[AssessmentResponse])
async def get_section_assessments(
    section_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    result = await db.execute(
        select(Assessment).where(
            Assessment.section_id == section_id,
            Assessment.is_published == True,
        ).order_by(Assessment.start_datetime)
    )
    assessments = result.scalars().all()
    response = []
    for a in assessments:
        a_data = AssessmentResponse.model_validate(a)
        q_result = await db.execute(
            select(Question).where(Question.assessment_id == a.id)
        )
        a_data.question_count = len(q_result.scalars().all())
        response.append(a_data)
    return response


@router.get("/{assessment_id}", response_model=AssessmentWithQuestions)
async def get_assessment_detail(
    assessment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    result = await db.execute(
        select(Assessment).where(Assessment.id == assessment_id, Assessment.is_published == True)
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="الاختبار غير موجود")

    q_result = await db.execute(
        select(Question).where(Question.assessment_id == assessment_id)
        .order_by(Question.order_index)
    )
    questions = q_result.scalars().all()

    safe_questions = []
    for q in questions:
        q_data = {
            "id": q.id,
            "question_type": q.question_type.value,
            "content": q.content,
            "content_ar": q.content_ar,
            "points": q.points,
            "difficulty": q.difficulty.value,
            "order_index": q.order_index,
        }
        if q.question_type == QuestionType.MCQ:
            options = q.options or []
            q_data["options"] = [{"text": opt["text"]} for opt in options]
        safe_questions.append(q_data)

    response = AssessmentWithQuestions.model_validate(assessment)
    response.question_count = len(questions)
    response.questions = safe_questions
    return response


@router.post("/{assessment_id}/submit", response_model=SubmissionResponse)
async def submit_assessment(
    assessment_id: int,
    submission_data: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    result = await db.execute(
        select(Assessment).where(Assessment.id == assessment_id)
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="الاختبار غير موجود")

    # Count existing attempts for this student+assessment
    attempts_result = await db.execute(
        select(func.count(StudentSubmission.id)).where(
            StudentSubmission.assessment_id == assessment_id,
            StudentSubmission.student_id == current_user.id,
        )
    )
    existing_attempts = attempts_result.scalar() or 0
    attempt_number = existing_attempts + 1

    if existing_attempts >= (assessment.attempts_allowed or 1):
        raise HTTPException(
            status_code=400,
            detail=f"لقد استنفدت جميع محاولاتك ({assessment.attempts_allowed} محاولة)"
        )

    submission = StudentSubmission(
        student_id=current_user.id,
        assessment_id=assessment_id,
        started_at=datetime.now(timezone.utc),
        submitted_at=datetime.now(timezone.utc),
        time_spent_minutes=submission_data.time_spent_minutes,
        attempt_number=attempt_number,
        answers={str(a.question_id): a.answer for a in submission_data.answers},
    )
    db.add(submission)
    await db.flush()

    total_score = 0.0
    max_score = 0.0
    question_details = []

    for answer_data in submission_data.answers:
        q_result = await db.execute(
            select(Question).where(Question.id == answer_data.question_id)
        )
        question = q_result.scalar_one_or_none()
        if not question:
            continue

        max_score += question.points
        is_correct = False
        points_earned = 0.0
        ai_feedback = None

        if question.question_type == QuestionType.MCQ:
            options = question.options or []
            correct_opts = [o["text"] for o in options if o.get("is_correct")]
            is_correct = answer_data.answer in correct_opts
            points_earned = question.points if is_correct else 0.0

        elif question.question_type == QuestionType.TRUE_FALSE:
            is_correct = answer_data.answer.lower() == (question.correct_answer or "").lower()
            points_earned = question.points if is_correct else 0.0

        elif question.question_type in [QuestionType.ESSAY, QuestionType.SHORT_ANSWER]:
            section_result = await db.execute(
                select(CourseSection).where(CourseSection.id == assessment.section_id)
            )
            section = section_result.scalar_one_or_none()
            if section:
                prof_result = await db.execute(
                    select(AIProfessor).where(AIProfessor.course_id == section.course_id)
                )
                professor = prof_result.scalar_one_or_none()
                course_result = await db.execute(
                    select(Course).where(Course.id == section.course_id)
                )
                course = course_result.scalar_one_or_none()
                if professor and course:
                    agent = AIProfessorAgent(professor, course)
                    grade_result = await agent.grade_essay(
                        essay=answer_data.answer,
                        question=question.content,
                        rubric={"total_points": question.points, "criteria": "accuracy, clarity, completeness"},
                    )
                    points_earned = grade_result.get("score", 0)
                    ai_feedback = grade_result.get("feedback", "")
                    is_correct = points_earned >= (question.points * 0.6)

        total_score += points_earned

        qa = QuestionAnswer(
            submission_id=submission.id,
            question_id=question.id,
            student_answer=answer_data.answer,
            is_correct=is_correct,
            points_earned=points_earned,
            ai_feedback=ai_feedback,
        )
        db.add(qa)
        question_details.append({
            "question_id": question.id,
            "is_correct": is_correct,
            "points_earned": points_earned,
        })

    percentage = (total_score / max_score * 100) if max_score > 0 else 0
    letter_grade, gpa_points = calculate_letter_grade(percentage)
    passed = percentage >= assessment.passing_score

    submission.total_score = total_score
    submission.percentage = percentage
    submission.letter_grade = letter_grade
    submission.is_graded = True
    submission.graded_at = datetime.now(timezone.utc)
    submission.passed = passed

    await db.commit()

    return SubmissionResponse.model_validate(submission)


@router.get("/{assessment_id}/results/{submission_id}", response_model=GradeReport)
async def get_assessment_results(
    assessment_id: int,
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    result = await db.execute(
        select(StudentSubmission).where(
            StudentSubmission.id == submission_id,
            StudentSubmission.student_id == current_user.id,
            StudentSubmission.assessment_id == assessment_id,
        )
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="النتيجة غير موجودة")

    if not submission.is_graded:
        raise HTTPException(status_code=400, detail="لم يتم التصحيح بعد")

    assess_result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = assess_result.scalar_one_or_none()

    qa_result = await db.execute(
        select(QuestionAnswer).where(QuestionAnswer.submission_id == submission_id)
    )
    question_answers = qa_result.scalars().all()

    details = []
    for qa in question_answers:
        q_result = await db.execute(select(Question).where(Question.id == qa.question_id))
        question = q_result.scalar_one_or_none()
        if question:
            details.append({
                "question": question.content,
                "student_answer": qa.student_answer,
                "correct_answer": question.correct_answer if submission.passed else None,
                "is_correct": qa.is_correct,
                "points_earned": qa.points_earned,
                "max_points": question.points,
                "ai_feedback": qa.ai_feedback,
                "explanation": question.explanation if submission.passed else None,
            })

    return GradeReport(
        submission_id=submission.id,
        assessment_title=assessment.title if assessment else "الاختبار",
        total_score=submission.total_score or 0,
        max_score=assessment.total_points if assessment else 100,
        percentage=submission.percentage or 0,
        letter_grade=submission.letter_grade or "F",
        passed=submission.passed or False,
        ai_feedback=submission.ai_feedback or "تم التصحيح تلقائياً",
        question_details=details,
    )
