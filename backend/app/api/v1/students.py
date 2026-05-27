from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timezone
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_student
from app.models.user import User, StudentProfile
from app.models.academic import CourseSection, Course, AcademicCalendar
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.assessment import Assessment, StudentSubmission
from app.models.ai_agents import StudentAcademicTwin
from app.services.academic_service import calculate_letter_grade

router = APIRouter(prefix="/students", tags=["الطلاب"])


@router.get("/dashboard")
async def get_student_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    if not current_user.student_profile:
        raise HTTPException(status_code=404, detail="ملف الطالب غير موجود")

    profile = current_user.student_profile

    enrollments_result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == profile.id,
            Enrollment.status == EnrollmentStatus.ENROLLED,
        )
    )
    current_enrollments = enrollments_result.scalars().all()

    upcoming_assessments = []
    for enrollment in current_enrollments:
        if enrollment.section:
            assess_result = await db.execute(
                select(Assessment).where(
                    Assessment.section_id == enrollment.section_id,
                    Assessment.is_published == True,
                    Assessment.end_datetime > datetime.now(timezone.utc),
                ).order_by(Assessment.end_datetime).limit(3)
            )
            upcoming_assessments.extend(assess_result.scalars().all())

    recent_grades = []
    completed_result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == profile.id,
            Enrollment.total_grade != None,
        ).order_by(Enrollment.updated_at.desc()).limit(5)
    )
    completed_enrollments = completed_result.scalars().all()
    for e in completed_enrollments:
        if e.section and e.section.course:
            recent_grades.append({
                "course_name": e.section.course.name_ar or e.section.course.name,
                "course_code": e.section.course.code,
                "grade": e.total_grade,
                "letter_grade": e.letter_grade,
                "semester": e.section.semester.value,
            })

    twin = profile.academic_twin
    recommendations = []
    if twin and twin.ai_recommendations:
        recommendations = twin.ai_recommendations[:3]

    return {
        "student": {
            "name": current_user.full_name_ar or current_user.full_name,
            "student_id": profile.student_id,
            "gpa": profile.cumulative_gpa,
            "credits_earned": profile.total_credits_earned,
            "academic_standing": profile.academic_standing,
            "enrollment_status": profile.enrollment_status,
        },
        "current_courses_count": len(current_enrollments),
        "upcoming_assessments_count": len(upcoming_assessments),
        "upcoming_assessments": [
            {
                "id": a.id,
                "title": a.title,
                "type": a.assessment_type.value,
                "end_datetime": a.end_datetime.isoformat() if a.end_datetime else None,
                "duration_minutes": a.duration_minutes,
            }
            for a in upcoming_assessments[:5]
        ],
        "recent_grades": recent_grades,
        "ai_recommendations": recommendations,
        "learning_style": twin.learning_style.value if twin else "mixed",
        "performance_trend": twin.performance_trend.value if twin else "stable",
    }


@router.get("/my-courses")
async def get_my_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    profile = current_user.student_profile
    if not profile:
        raise HTTPException(status_code=404, detail="ملف الطالب غير موجود")

    result = await db.execute(
        select(Enrollment).where(Enrollment.student_id == profile.id)
        .order_by(Enrollment.enrolled_at.desc())
    )
    enrollments = result.scalars().all()

    courses = []
    for enrollment in enrollments:
        if enrollment.section and enrollment.section.course:
            course = enrollment.section.course
            professor_name = "أستاذ ذكاء اصطناعي"
            if enrollment.section.ai_professor:
                professor_name = enrollment.section.ai_professor.name_ar

            courses.append({
                "enrollment_id": enrollment.id,
                "section_id": enrollment.section_id,
                "course_id": course.id,
                "course_code": course.code,
                "course_name": course.name_ar or course.name,
                "credits": course.credits,
                "professor_name": professor_name,
                "status": enrollment.status.value,
                "total_grade": enrollment.total_grade,
                "letter_grade": enrollment.letter_grade,
                "semester": enrollment.section.semester.value,
                "academic_year": enrollment.section.academic_year,
            })

    return {"courses": courses, "total": len(courses)}


@router.get("/transcript")
async def get_transcript(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    profile = current_user.student_profile
    if not profile:
        raise HTTPException(status_code=404, detail="ملف الطالب غير موجود")

    result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == profile.id,
            Enrollment.status.in_([EnrollmentStatus.COMPLETED, EnrollmentStatus.FAILED]),
        ).order_by(Enrollment.completed_at.desc())
    )
    enrollments = result.scalars().all()

    semesters = {}
    for e in enrollments:
        if not e.section or not e.section.course:
            continue
        key = f"{e.section.academic_year}-{e.section.semester.value}"
        if key not in semesters:
            semesters[key] = {"academic_year": e.section.academic_year, "semester": e.section.semester.value, "courses": []}
        semesters[key]["courses"].append({
            "code": e.section.course.code,
            "name": e.section.course.name_ar or e.section.course.name,
            "credits": e.section.course.credits,
            "grade": e.total_grade,
            "letter_grade": e.letter_grade,
            "gpa_points": e.gpa_points,
        })

    return {
        "student_name": current_user.full_name_ar,
        "student_id": profile.student_id,
        "cumulative_gpa": profile.cumulative_gpa,
        "total_credits_earned": profile.total_credits_earned,
        "academic_standing": profile.academic_standing,
        "semesters": list(semesters.values()),
    }


@router.post("/enroll")
async def enroll_in_course(
    section_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    profile = current_user.student_profile
    if not profile:
        raise HTTPException(status_code=404, detail="ملف الطالب غير موجود")

    existing = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == profile.id,
            Enrollment.section_id == section_id,
            Enrollment.status.in_([EnrollmentStatus.ENROLLED]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="مسجل في هذه المادة مسبقاً")

    section_result = await db.execute(
        select(CourseSection).where(CourseSection.id == section_id, CourseSection.is_active == True)
    )
    section = section_result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="الشعبة غير موجودة")

    if section.enrolled_count >= section.capacity:
        raise HTTPException(status_code=400, detail="الشعبة ممتلئة")

    enrollment = Enrollment(
        student_id=profile.id,
        section_id=section_id,
        enrolled_at=datetime.now(timezone.utc),
        status=EnrollmentStatus.ENROLLED,
        attempt_number=1,
    )
    db.add(enrollment)
    section.enrolled_count += 1
    await db.commit()

    return {"message": "تم التسجيل بنجاح", "enrollment_id": enrollment.id}


@router.get("/twin")
async def get_academic_twin(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    profile = current_user.student_profile
    if not profile:
        raise HTTPException(status_code=404, detail="ملف الطالب غير موجود")

    twin = profile.academic_twin
    if not twin:
        twin = StudentAcademicTwin(student_id=profile.id)
        db.add(twin)
        await db.commit()

    return {
        "learning_style": twin.learning_style.value,
        "performance_trend": twin.performance_trend.value,
        "weak_topics": twin.weak_topics or [],
        "strong_topics": twin.strong_topics or [],
        "avg_study_time_per_day": twin.avg_study_time_per_day,
        "ai_recommendations": twin.ai_recommendations or [],
        "knowledge_map": twin.knowledge_map or {},
        "interaction_count": twin.interaction_count,
    }
