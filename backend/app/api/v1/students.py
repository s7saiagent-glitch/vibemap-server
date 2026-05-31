from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_student
from app.models.user import User, StudentProfile
from app.models.academic import CourseSection, Course, AcademicCalendar
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.assessment import Assessment, StudentSubmission
from app.models.content import StudyMaterial, Announcement
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

    section_options = selectinload(Enrollment.section).selectinload(CourseSection.course)

    enrollments_result = await db.execute(
        select(Enrollment)
        .where(
            Enrollment.student_id == profile.id,
            Enrollment.status == EnrollmentStatus.ENROLLED,
        )
        .options(section_options)
    )
    current_enrollments = enrollments_result.scalars().all()

    upcoming_assessments = []
    for enrollment in current_enrollments:
        if enrollment.section_id:
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
        select(Enrollment)
        .where(
            Enrollment.student_id == profile.id,
            Enrollment.total_grade != None,
        )
        .options(section_options)
        .order_by(Enrollment.updated_at.desc())
        .limit(5)
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
        select(Enrollment)
        .where(Enrollment.student_id == profile.id)
        .options(
            selectinload(Enrollment.section)
            .selectinload(CourseSection.course),
            selectinload(Enrollment.section)
            .selectinload(CourseSection.ai_professor),
        )
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
        select(Enrollment)
        .where(
            Enrollment.student_id == profile.id,
            Enrollment.status.in_([EnrollmentStatus.COMPLETED, EnrollmentStatus.FAILED]),
        )
        .options(
            selectinload(Enrollment.section).selectinload(CourseSection.course)
        )
        .order_by(Enrollment.completed_at.desc())
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

    twin_result = await db.execute(
        select(StudentAcademicTwin).where(StudentAcademicTwin.student_id == profile.id)
    )
    twin = twin_result.scalar_one_or_none()
    if not twin:
        twin = StudentAcademicTwin(student_id=profile.id)
        db.add(twin)
        await db.commit()
        await db.refresh(twin)

    learning_style_value = twin.learning_style.value if twin.learning_style else "balanced"
    style_map = {"mixed": "balanced", "visual": "visual", "auditory": "auditory", "reading": "reading", "balanced": "balanced"}
    study_style = style_map.get(learning_style_value, "balanced")

    is_active = getattr(twin, "is_active", False)

    return {
        # Legacy fields
        "learning_style": learning_style_value,
        "performance_trend": twin.performance_trend.value if twin.performance_trend else "stable",
        "weak_topics": twin.weak_topics or [],
        "strong_topics": twin.strong_topics or [],
        "avg_study_time_per_day": twin.avg_study_time_per_day,
        "ai_recommendations": twin.ai_recommendations or [],
        "knowledge_map": twin.knowledge_map or {},
        "interaction_count": twin.interaction_count,
        # New fields for frontend twin page
        "is_active": is_active,
        "study_style": study_style,
        "current_gpa": 0.0,
        "strengths": twin.strong_topics or ["الالتزام بالمواعيد"],
        "weaknesses": twin.weak_topics or ["إدارة الوقت"],
        "recommendations": [
            {"icon": r, "title": r, "description": r}
            for r in (twin.ai_recommendations or [])
        ] or [
            {"icon": "📚", "title": "راجع ملاحظاتك يومياً", "description": "المراجعة اليومية تزيد الاحتفاظ بالمعلومات."},
            {"icon": "🎯", "title": "ضع أهدافاً أسبوعية", "description": "حدد 3 أهداف قابلة للقياس كل أسبوع."},
        ],
        "learning_goals": [
            {"title": "إتمام مراجعة المحاضرات", "progress": 30},
            {"title": "حل نماذج الاختبارات", "progress": 20},
        ],
    }


@router.post("/twin/activate")
async def activate_academic_twin(
    current_user: User = Depends(get_current_student),
    db: AsyncSession = Depends(get_db),
):
    """Activate or refresh academic twin for the student."""
    from app.models.assessment import StudentSubmission

    # Get GPA from submissions
    gpa_result = await db.execute(
        select(func.avg(StudentSubmission.percentage)).where(
            StudentSubmission.student_id == current_user.id,
            StudentSubmission.is_graded == True,
        )
    )
    gpa_raw = gpa_result.scalar()
    gpa = round(float(gpa_raw) / 25.0, 2) if gpa_raw else 0.0  # convert % to 4.0 scale

    # Determine study style based on user id (simplified)
    study_styles = ['visual', 'reading', 'balanced']
    style = study_styles[current_user.id % len(study_styles)]

    # Build twin data
    twin_data = {
        "is_active": True,
        "current_gpa": gpa,
        "study_style": style,
        "strengths": ["الالتزام بالمواعيد", "فهم المفاهيم النظرية"],
        "weaknesses": ["التطبيق العملي", "إدارة الوقت"],
        "recommendations": [
            {"icon": "📚", "title": "راجع ملاحظاتك يومياً", "description": "المراجعة اليومية لمدة 20 دقيقة تزيد من معدل الاحتفاظ بالمعلومات بنسبة 60%."},
            {"icon": "🎯", "title": "ضع أهدافاً أسبوعية", "description": "حدد 3 أهداف قابلة للقياس كل أسبوع لتتبع تقدمك."},
            {"icon": "🤝", "title": "شارك في المنتدى", "description": "تعليم الآخرين هو أفضل طريقة لتعميق فهمك."},
        ],
        "learning_goals": [
            {"title": "إتمام مراجعة المحاضرات", "progress": min(100, gpa * 25)},
            {"title": "حل نماذج الاختبارات", "progress": min(100, gpa * 20)},
            {"title": "المشاركة في المنتدى", "progress": 30},
        ],
    }

    # Update twin in database if model supports it (graceful fallback)
    try:
        twin_result = await db.execute(
            select(StudentAcademicTwin).where(StudentAcademicTwin.student_id == current_user.id)
        )
        twin_obj = twin_result.scalar_one_or_none()
        if twin_obj:
            twin_obj.is_active = True
            await db.commit()
    except Exception:
        pass

    return twin_data


@router.delete("/enroll/{section_id}")
async def drop_course(
    section_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    profile = current_user.student_profile
    if not profile:
        raise HTTPException(status_code=404, detail="ملف الطالب غير موجود")

    result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == profile.id,
            Enrollment.section_id == section_id,
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="التسجيل غير موجود")

    enrollment.status = EnrollmentStatus.DROPPED
    await db.commit()
    return {"message": "تم إلغاء تسجيل المادة"}


@router.get("/notifications")
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    profile = current_user.student_profile
    if not profile:
        return {"notifications": [], "total": 0}

    enrollments_result = await db.execute(
        select(Enrollment)
        .where(Enrollment.student_id == profile.id, Enrollment.status == EnrollmentStatus.ENROLLED)
    )
    enrollments = enrollments_result.scalars().all()
    section_ids = [e.section_id for e in enrollments if e.section_id]

    notifications = []
    now = datetime.now(timezone.utc)

    # Upcoming assessments as notifications
    if section_ids:
        assess_result = await db.execute(
            select(Assessment)
            .where(
                Assessment.section_id.in_(section_ids),
                Assessment.is_published == True,
                Assessment.end_datetime > now,
            )
            .options(selectinload(Assessment.section).selectinload(CourseSection.course))
            .order_by(Assessment.end_datetime)
            .limit(10)
        )
        assessments = assess_result.scalars().all()
        for a in assessments:
            course_name = a.section.course.name_ar if a.section and a.section.course else "مادة"
            days_left = (a.end_datetime - now).days if a.end_datetime else 0
            notifications.append({
                "id": f"assess_{a.id}",
                "type": "assessment",
                "title": f"موعد اختبار: {a.title_ar or a.title}",
                "body": f"{course_name} · {days_left} يوم متبقي",
                "icon": "📝",
                "is_urgent": days_left <= 2,
                "created_at": a.start_datetime.isoformat() if a.start_datetime else now.isoformat(),
            })

        # Announcements
        ann_result = await db.execute(
            select(Announcement)
            .where(Announcement.section_id.in_(section_ids))
            .order_by(Announcement.id.desc())
            .limit(5)
        )
        announcements = ann_result.scalars().all()
        for ann in announcements:
            notifications.append({
                "id": f"ann_{ann.id}",
                "type": "announcement",
                "title": ann.title,
                "body": (ann.content or "")[:100],
                "icon": "📢",
                "is_urgent": ann.priority.value == "urgent" if ann.priority else False,
                "created_at": now.isoformat(),
            })

    return {"notifications": notifications[:15], "total": len(notifications)}


@router.get("/analytics")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    profile = current_user.student_profile
    if not profile:
        raise HTTPException(status_code=404, detail="ملف الطالب غير موجود")

    enrollments_result = await db.execute(
        select(Enrollment)
        .where(Enrollment.student_id == profile.id)
        .options(selectinload(Enrollment.section).selectinload(CourseSection.course))
        .order_by(Enrollment.enrolled_at)
    )
    enrollments = enrollments_result.scalars().all()

    course_grades = []
    total_credits_attempted = 0
    for e in enrollments:
        if e.section and e.section.course:
            course_grades.append({
                "course_name": e.section.course.name_ar or e.section.course.code,
                "credits": e.section.course.credits,
                "grade": e.total_grade or 0,
                "letter_grade": e.letter_grade or "—",
                "semester": e.section.academic_year + " " + e.section.semester.value,
                "status": e.status.value,
            })
            total_credits_attempted += e.section.course.credits

    # Submissions for performance
    submissions_result = await db.execute(
        select(StudentSubmission)
        .where(
            StudentSubmission.student_id == current_user.id,
            StudentSubmission.is_graded == True,
        )
        .order_by(StudentSubmission.submitted_at)
        .limit(20)
    )
    submissions = submissions_result.scalars().all()
    performance_trend = [
        {
            "date": s.submitted_at.strftime("%Y-%m-%d") if s.submitted_at else "—",
            "score": s.percentage or 0,
            "label": s.letter_grade or "—",
        }
        for s in submissions
    ]

    return {
        "gpa": profile.cumulative_gpa or "0.00",
        "total_credits_earned": profile.total_credits_earned or 0,
        "total_credits_attempted": total_credits_attempted,
        "credits_to_graduate": max(0, 132 - (profile.total_credits_earned or 0)),
        "academic_standing": profile.academic_standing or "good",
        "course_grades": course_grades,
        "performance_trend": performance_trend,
        "current_courses": len([e for e in enrollments if e.status.value == "enrolled"]),
        "completed_courses": len([e for e in enrollments if e.status.value == "completed"]),
    }


@router.get("/materials/{section_id}")
async def get_section_materials(
    section_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    section_result = await db.execute(
        select(CourseSection).where(CourseSection.id == section_id)
    )
    section = section_result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="الشعبة غير موجودة")

    materials_result = await db.execute(
        select(StudyMaterial).where(StudyMaterial.course_id == section.course_id)
    )
    materials = materials_result.scalars().all()
    return [
        {
            "id": m.id,
            "title": m.title,
            "material_type": m.material_type.value,
            "description": m.description,
            "file_url": m.file_url,
            "content": m.content,
            "is_required": m.is_required,
        }
        for m in materials
    ]


@router.get("/my-submissions")
async def get_my_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    """Get all past assessment submissions for the student."""
    from app.models.assessment import StudentSubmission, Assessment

    submissions_result = await db.execute(
        select(StudentSubmission, Assessment)
        .join(Assessment, StudentSubmission.assessment_id == Assessment.id)
        .where(StudentSubmission.student_id == current_user.id)
        .where(StudentSubmission.is_graded == True)
        .order_by(StudentSubmission.submitted_at.desc())
    )
    rows = submissions_result.all()

    return [
        {
            "submission_id": sub.id,
            "assessment_id": assess.id,
            "assessment_title": assess.title_ar or assess.title,
            "assessment_type": assess.assessment_type.value if assess.assessment_type else "quiz",
            "submitted_at": sub.submitted_at.isoformat() if sub.submitted_at else None,
            "percentage": sub.percentage or 0,
            "letter_grade": sub.letter_grade or "F",
            "passed": sub.passed or False,
            "total_score": sub.total_score or 0,
            "max_score": sum(q.points for q in assess.questions) if assess.questions else 0,
            "time_spent_minutes": sub.time_spent_minutes or 0,
        }
        for sub, assess in rows
    ]
