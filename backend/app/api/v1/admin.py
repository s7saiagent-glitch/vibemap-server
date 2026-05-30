from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
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

    return {
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
