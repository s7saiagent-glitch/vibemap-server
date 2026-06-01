from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.core.deps import get_current_admin
from app.models.user import User, UserRole, StudentProfile
from app.models.academic import Faculty, Department, Program, Course, CourseSection
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.ai_agents import AIProfessor, AIInteractionLog
from app.models.assessment import StudentSubmission, Assessment, Question, AssessmentType as AssessmentTypeModel, DifficultyLevel
from app.models.content import StudyMaterial, MaterialType
from app.schemas.academic import FacultyResponse, ProgramResponse, CourseResponse
from app.schemas.assessment import AssessmentCreate
from app.services.ai.content_generator import ContentGeneratorService
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["الإدارة"])


@router.get("/dashboard")
async def get_admin_dashboard(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    students_count = await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.STUDENT)
    )
    total_students = students_count.scalar_one()

    active_courses = await db.execute(
        select(func.count(CourseSection.id)).where(CourseSection.is_active == True)
    )
    total_active_sections = active_courses.scalar_one()

    enrollments_count = await db.execute(
        select(func.count(Enrollment.id)).where(Enrollment.status == EnrollmentStatus.ENROLLED)
    )
    total_enrollments = enrollments_count.scalar_one()

    ai_interactions = await db.execute(
        select(func.count(AIInteractionLog.id))
    )
    total_interactions = ai_interactions.scalar_one()

    programs_count = await db.execute(select(func.count(Program.id)))
    total_programs = programs_count.scalar_one()

    professors_count = await db.execute(select(func.count(AIProfessor.id)))
    total_professors = professors_count.scalar_one()

    recent_students = await db.execute(
        select(User).where(User.role == UserRole.STUDENT)
        .order_by(User.created_at.desc()).limit(5)
    )
    recent = recent_students.scalars().all()

    # Grade distribution from submissions
    from app.models.assessment import StudentSubmission as Sub
    grade_dist_result = await db.execute(select(Sub.percentage).where(Sub.is_graded == True))
    percentages = [float(p) for p in grade_dist_result.scalars().all() if p is not None]
    grade_distribution = {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
    for p in percentages:
        if p >= 90: grade_distribution["A"] += 1
        elif p >= 80: grade_distribution["B"] += 1
        elif p >= 70: grade_distribution["C"] += 1
        elif p >= 60: grade_distribution["D"] += 1
        else: grade_distribution["F"] += 1

    # Top courses by enrollment
    top_courses_result = await db.execute(
        select(Course.name_ar, func.count(Enrollment.id).label("cnt"))
        .join(CourseSection, Course.id == CourseSection.course_id)
        .join(Enrollment, CourseSection.id == Enrollment.section_id)
        .group_by(Course.id, Course.name_ar)
        .order_by(func.count(Enrollment.id).desc())
        .limit(6)
    )
    top_courses = [{"name": row[0], "enrollments": row[1]} for row in top_courses_result.all()]

    # Faculty count (users with faculty/staff role or from faculty table)
    faculty_count_result = await db.execute(select(func.count(Faculty.id)))
    total_faculty = faculty_count_result.scalar_one()

    return {
        # Flat fields for analytics page
        "total_students": total_students,
        "active_sections": total_active_sections,
        "total_enrollments": total_enrollments,
        "total_faculty": total_faculty,
        "grade_distribution": grade_distribution,
        "enrollment_trend": [],
        "top_courses": top_courses,
        "recent_activities": [
            {
                "icon": "👤",
                "title": f"طالب جديد: {u.full_name_ar or u.full_name or u.email}",
                "time": u.created_at.strftime("%Y-%m-%d") if u.created_at else "",
            }
            for u in recent
        ],
        # Legacy nested format
        "stats": {
            "total_students": total_students,
            "active_sections": total_active_sections,
            "total_enrollments": total_enrollments,
            "ai_interactions": total_interactions,
            "total_programs": total_programs,
            "ai_professors": total_professors,
        },
        "recent_students": [
            {
                "id": u.id,
                "name": u.full_name_ar or u.full_name,
                "email": u.email,
                "created_at": u.created_at.isoformat(),
            }
            for u in recent
        ],
    }


@router.get("/students")
async def get_students(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    program_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    query = select(User).where(User.role == UserRole.STUDENT)
    if search:
        query = query.where(
            (User.email.ilike(f"%{search}%")) |
            (User.first_name.ilike(f"%{search}%")) |
            (User.last_name.ilike(f"%{search}%")) |
            (User.first_name_ar.ilike(f"%{search}%"))
        )

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar_one()

    query = query.offset((page - 1) * per_page).limit(per_page).order_by(User.created_at.desc()) \
        .options(selectinload(User.student_profile))
    result = await db.execute(query)
    students = result.scalars().all()

    student_list = []
    for user in students:
        profile = user.student_profile
        student_list.append({
            "id": user.id,
            "name": user.full_name_ar or user.full_name,
            "email": user.email,
            "student_id": profile.student_id if profile else None,
            "gpa": profile.cumulative_gpa if profile else "0.00",
            "credits": profile.total_credits_earned if profile else 0,
            "status": profile.enrollment_status if profile else "unknown",
            "is_active": user.is_active,
            "created_at": user.created_at.isoformat(),
        })

    return {
        "students": student_list,
        "total": total,
        "page": page,
        "pages": (total + per_page - 1) // per_page,
    }


class StudentUpdateRequest(BaseModel):
    first_name_ar: Optional[str] = None
    last_name_ar: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    enrollment_status: Optional[str] = None
    academic_standing: Optional[str] = None


@router.patch("/students/{student_id}", response_model=dict)
async def update_student(
    student_id: int,
    data: StudentUpdateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(select(User).where(User.id == student_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="الطالب غير موجود")

    for field in ["first_name_ar", "last_name_ar", "first_name", "last_name", "phone", "is_active"]:
        val = getattr(data, field)
        if val is not None:
            setattr(user, field, val)

    if data.enrollment_status or data.academic_standing:
        prof_result = await db.execute(
            select(StudentProfile).where(StudentProfile.user_id == student_id)
        )
        profile = prof_result.scalar_one_or_none()
        if profile:
            if data.enrollment_status:
                profile.enrollment_status = data.enrollment_status
            if data.academic_standing:
                profile.academic_standing = data.academic_standing

    await db.commit()
    return {"message": "تم تحديث بيانات الطالب بنجاح", "student_id": student_id}


@router.post("/academic/faculties", response_model=FacultyResponse)
async def create_faculty(
    name: str, name_ar: str, code: str,
    icon: str = "🎓", color: str = "#00D4FF",
    description: str = None, description_ar: str = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    existing = await db.execute(select(Faculty).where(Faculty.code == code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="رمز الكلية موجود مسبقاً")

    faculty = Faculty(
        name=name, name_ar=name_ar, code=code,
        icon=icon, color=color,
        description=description, description_ar=description_ar,
    )
    db.add(faculty)
    await db.commit()
    return FacultyResponse.model_validate(faculty)


@router.post("/courses", response_model=CourseResponse)
async def create_course(
    program_id: int, code: str, name: str, name_ar: str,
    credits: int = 3, level: int = 1,
    description: str = None, description_ar: str = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    course = Course(
        program_id=program_id, code=code, name=name, name_ar=name_ar,
        credits=credits, level=level,
        description=description, description_ar=description_ar,
    )
    db.add(course)
    await db.commit()
    return CourseResponse.model_validate(course)


@router.post("/ai-professors/create")
async def create_ai_professor(
    course_id: int,
    name: str,
    name_ar: str,
    persona_description: str = None,
    teaching_style: str = "interactive",
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    course_result = await db.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="المادة غير موجودة")

    existing = await db.execute(select(AIProfessor).where(AIProfessor.course_id == course_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="يوجد أستاذ ذكاء اصطناعي لهذه المادة مسبقاً")

    system_prompt = f"""أنت الأستاذ {name_ar}, متخصص في مادة {course.name_ar} ({course.code}).
تدريس احترافي، صبور، ومتفاعل مع الطلاب."""

    professor = AIProfessor(
        course_id=course_id,
        name=name,
        name_ar=name_ar,
        persona_description=persona_description,
        persona_description_ar=persona_description,
        teaching_style=teaching_style,
        system_prompt=system_prompt,
        model_name="claude-sonnet-4-6",
    )
    db.add(professor)
    await db.commit()

    return {
        "id": professor.id,
        "name_ar": professor.name_ar,
        "course": course.name_ar,
        "message": "تم إنشاء الأستاذ الذكي بنجاح",
    }


@router.get("/ai-professors")
async def list_ai_professors(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(AIProfessor).where(AIProfessor.is_active == True))
    professors = result.scalars().all()
    return [
        {
            "id": p.id,
            "name_ar": p.name_ar,
            "course_id": p.course_id,
            "total_conversations": p.total_conversations,
            "avg_rating": p.avg_rating,
            "model_name": p.model_name,
        }
        for p in professors
    ]


@router.post("/content/generate-lecture")
async def generate_lecture_content(
    course_id: int,
    topic: str,
    duration_minutes: int = 60,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    course_result = await db.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="المادة غير موجودة")

    generator = ContentGeneratorService()
    lecture_data = await generator.generate_lecture(course, topic, duration_minutes)
    return lecture_data


@router.post("/assessments")
async def create_assessment(
    data: AssessmentCreate,
    publish: bool = False,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    section_result = await db.execute(select(CourseSection).where(CourseSection.id == data.section_id))
    section = section_result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="الشعبة غير موجودة")

    assessment = Assessment(
        section_id=data.section_id,
        title=data.title,
        title_ar=data.title_ar or data.title,
        assessment_type=data.assessment_type,
        description=data.description,
        instructions=data.instructions,
        total_points=data.total_points,
        passing_score=data.passing_score,
        duration_minutes=data.duration_minutes,
        attempts_allowed=data.attempts_allowed,
        start_datetime=data.start_datetime,
        end_datetime=data.end_datetime,
        is_randomized=data.is_randomized,
        anti_cheat_enabled=data.anti_cheat_enabled,
        weight_percent=data.weight_percent,
        is_published=publish,
    )
    db.add(assessment)
    await db.flush()

    for i, q_data in enumerate(data.questions):
        question = Question(
            assessment_id=assessment.id,
            question_type=q_data.question_type,
            content=q_data.content,
            content_ar=q_data.content_ar or q_data.content,
            options=q_data.options or [],
            correct_answer=q_data.correct_answer,
            explanation=q_data.explanation,
            points=q_data.points,
            difficulty=q_data.difficulty,
            order_index=i,
            topic_tag=q_data.topic_tag,
        )
        db.add(question)

    await db.commit()
    await db.refresh(assessment)
    return {
        "id": assessment.id,
        "title": assessment.title_ar or assessment.title,
        "section_id": assessment.section_id,
        "is_published": assessment.is_published,
        "question_count": len(data.questions),
        "message": "تم إنشاء الاختبار بنجاح",
    }


@router.get("/assessments")
async def list_assessments(
    section_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    query = select(Assessment).options(selectinload(Assessment.section).selectinload(CourseSection.course))
    if section_id:
        query = query.where(Assessment.section_id == section_id)
    query = query.order_by(Assessment.id.desc())
    result = await db.execute(query)
    assessments = result.scalars().all()
    return [
        {
            "id": a.id,
            "title": a.title_ar or a.title,
            "assessment_type": a.assessment_type.value,
            "section_id": a.section_id,
            "course_name": a.section.course.name_ar if a.section and a.section.course else None,
            "total_points": a.total_points,
            "duration_minutes": a.duration_minutes,
            "is_published": a.is_published,
            "start_datetime": a.start_datetime.isoformat() if a.start_datetime else None,
            "end_datetime": a.end_datetime.isoformat() if a.end_datetime else None,
        }
        for a in assessments
    ]


@router.patch("/assessments/{assessment_id}/publish")
async def toggle_assessment_publish(
    assessment_id: int,
    publish: bool = True,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Assessment).where(Assessment.id == assessment_id))
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="الاختبار غير موجود")
    assessment.is_published = publish
    await db.commit()
    return {"message": "تم تحديث حالة النشر", "is_published": publish}


@router.get("/sections")
async def list_sections(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    result = await db.execute(
        select(CourseSection)
        .where(CourseSection.is_active == True)
        .options(selectinload(CourseSection.course))
        .order_by(CourseSection.id)
    )
    sections = result.scalars().all()
    return [
        {
            "id": s.id,
            "course_name": s.course.name_ar if s.course else None,
            "course_code": s.course.code if s.course else None,
            "academic_year": s.academic_year,
            "semester": s.semester.value,
        }
        for s in sections
    ]


@router.post("/sections")
async def create_section(
    course_id: int = Query(...),
    section_number: str = Query(...),
    semester: str = Query(...),
    academic_year: str = Query(...),
    capacity: int = Query(30),
    ai_professor_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Create a new course section."""
    # Verify course exists
    course_result = await db.execute(select(Course).where(Course.id == course_id))
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="المادة الدراسية غير موجودة")

    # Create section
    section = CourseSection(
        course_id=course_id,
        section_number=section_number,
        semester=semester,
        academic_year=academic_year,
        capacity=capacity,
        is_active=True,
    )
    if ai_professor_id:
        section.ai_professor_id = ai_professor_id

    db.add(section)
    await db.commit()
    await db.refresh(section)

    return {
        "id": section.id,
        "course_id": section.course_id,
        "course_name": course.name_ar,
        "section_number": section.section_number,
        "semester": section.semester,
        "academic_year": section.academic_year,
        "capacity": section.capacity,
        "is_active": section.is_active,
    }


@router.patch("/sections/{section_id}")
async def update_section(
    section_id: int,
    capacity: Optional[int] = Query(None),
    is_active: Optional[bool] = Query(None),
    semester: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Update a course section."""
    result = await db.execute(select(CourseSection).where(CourseSection.id == section_id))
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="الشعبة غير موجودة")

    if capacity is not None:
        section.capacity = capacity
    if is_active is not None:
        section.is_active = is_active
    if semester is not None:
        section.semester = semester

    await db.commit()
    return {"message": "تم تحديث الشعبة بنجاح", "id": section_id}


@router.post("/materials")
async def add_study_material(
    course_id: int,
    title: str,
    material_type: MaterialType,
    description: str = None,
    file_url: str = None,
    content: str = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    course_result = await db.execute(select(Course).where(Course.id == course_id))
    if not course_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="المادة غير موجودة")

    material = StudyMaterial(
        course_id=course_id,
        material_type=material_type,
        title=title,
        description=description,
        file_url=file_url,
        content=content,
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)
    return {"id": material.id, "title": material.title, "message": "تم إضافة المادة التعليمية بنجاح"}


@router.get("/materials")
async def list_materials(
    course_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    query = select(StudyMaterial)
    if course_id:
        query = query.where(StudyMaterial.course_id == course_id)
    result = await db.execute(query.order_by(StudyMaterial.id.desc()))
    materials = result.scalars().all()
    return [
        {
            "id": m.id,
            "title": m.title,
            "material_type": m.material_type.value,
            "course_id": m.course_id,
            "description": m.description,
            "file_url": m.file_url,
            "content": m.content,
            "download_count": m.download_count,
        }
        for m in materials
    ]


@router.post("/lectures")
async def create_lecture(
    section_id: int,
    title_ar: str,
    content: str,
    duration_minutes: int = 60,
    order_index: int = 0,
    learning_objectives: str = "",
    key_concepts: str = "",
    publish: bool = False,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    from app.models.content import Lecture
    import json

    section_result = await db.execute(select(CourseSection).where(CourseSection.id == section_id))
    if not section_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="الشعبة غير موجودة")

    objectives = [o.strip() for o in learning_objectives.split("\n") if o.strip()] if learning_objectives else []
    concepts = [c.strip() for c in key_concepts.split(",") if c.strip()] if key_concepts else []

    lecture = Lecture(
        section_id=section_id,
        title_ar=title_ar,
        title=title_ar,
        content=content,
        duration_minutes=duration_minutes,
        order_index=order_index,
        learning_objectives=objectives,
        key_concepts=concepts,
        is_published=publish,
    )
    db.add(lecture)
    await db.commit()
    await db.refresh(lecture)
    return {
        "id": lecture.id,
        "title": lecture.title_ar,
        "section_id": lecture.section_id,
        "is_published": lecture.is_published,
        "message": "تم إنشاء المحاضرة بنجاح",
    }


@router.get("/lectures/{section_id}")
async def list_section_lectures(
    section_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    from app.models.content import Lecture
    result = await db.execute(
        select(Lecture).where(Lecture.section_id == section_id).order_by(Lecture.order_index)
    )
    lectures = result.scalars().all()
    return [
        {
            "id": l.id,
            "title": l.title_ar or l.title,
            "duration_minutes": l.duration_minutes,
            "order_index": l.order_index,
            "is_published": l.is_published,
            "view_count": l.view_count,
        }
        for l in lectures
    ]


@router.patch("/lectures/{lecture_id}/publish")
async def publish_lecture(
    lecture_id: int,
    publish: bool = True,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    from app.models.content import Lecture
    result = await db.execute(select(Lecture).where(Lecture.id == lecture_id))
    lecture = result.scalar_one_or_none()
    if not lecture:
        raise HTTPException(status_code=404, detail="المحاضرة غير موجودة")
    lecture.is_published = publish
    await db.commit()
    return {"message": "تم التحديث", "is_published": publish}
