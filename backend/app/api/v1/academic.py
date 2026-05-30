from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.academic import Faculty, Department, Program, Course, CourseSection, AcademicCalendar, DegreeLevel, SemesterType
from app.schemas.academic import (
    FacultyResponse, FacultyWithDepartments, DepartmentResponse,
    ProgramResponse, CourseResponse, AcademicCalendarResponse, CourseSectionResponse
)

router = APIRouter(prefix="/academic", tags=["الهيكل الأكاديمي"])


@router.get("/faculties", response_model=List[FacultyWithDepartments])
async def get_faculties(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Faculty)
        .where(Faculty.is_active == True)
        .options(selectinload(Faculty.departments))
    )
    faculties = result.scalars().all()

    response = []
    for faculty in faculties:
        fac_data = FacultyWithDepartments.model_validate(faculty)
        fac_data.departments = [
            DepartmentResponse.model_validate(d)
            for d in faculty.departments
            if d.is_active
        ]
        response.append(fac_data)

    return response


@router.get("/programs", response_model=List[ProgramResponse])
async def get_programs(
    faculty_id: Optional[int] = Query(None),
    department_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Program).where(Program.is_active == True)
    if department_id:
        query = query.where(Program.department_id == department_id)
    if faculty_id:
        query = query.join(Department).where(Department.faculty_id == faculty_id)

    result = await db.execute(query)
    programs = result.scalars().all()
    return [ProgramResponse.model_validate(p) for p in programs]


@router.get("/programs/{program_id}", response_model=dict)
async def get_program_detail(program_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Program).where(Program.id == program_id))
    program = result.scalar_one_or_none()
    if not program:
        raise HTTPException(status_code=404, detail="البرنامج غير موجود")

    courses_result = await db.execute(
        select(Course).where(Course.program_id == program_id, Course.is_active == True)
        .order_by(Course.level, Course.code)
    )
    courses = courses_result.scalars().all()

    courses_by_level = {}
    for course in courses:
        level = course.level
        if level not in courses_by_level:
            courses_by_level[level] = []
        courses_by_level[level].append(CourseResponse.model_validate(course).model_dump())

    return {
        **ProgramResponse.model_validate(program).model_dump(),
        "courses_by_level": courses_by_level,
        "total_courses": len(courses),
    }


@router.get("/courses", response_model=List[CourseResponse])
async def get_courses(
    program_id: Optional[int] = Query(None),
    level: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Course).where(Course.is_active == True)
    if program_id:
        query = query.where(Course.program_id == program_id)
    if level:
        query = query.where(Course.level == level)
    result = await db.execute(query.order_by(Course.level, Course.code))
    courses = result.scalars().all()
    return [CourseResponse.model_validate(c) for c in courses]


@router.get("/courses/{course_id}", response_model=dict)
async def get_course_detail(course_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="المادة غير موجودة")

    sections_result = await db.execute(
        select(CourseSection).where(CourseSection.course_id == course_id, CourseSection.is_active == True)
    )
    sections = sections_result.scalars().all()

    return {
        **CourseResponse.model_validate(course).model_dump(),
        "sections": [CourseSectionResponse.model_validate(s).model_dump() for s in sections],
        "syllabus": course.syllabus,
        "learning_outcomes": course.learning_outcomes,
    }


@router.get("/calendar", response_model=AcademicCalendarResponse)
async def get_current_calendar(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AcademicCalendar).where(AcademicCalendar.is_current == True)
    )
    calendar = result.scalar_one_or_none()
    if not calendar:
        raise HTTPException(status_code=404, detail="لا يوجد تقويم أكاديمي نشط")
    return AcademicCalendarResponse.model_validate(calendar)


@router.post("/seed-demo")
async def seed_demo_data(db: AsyncSession = Depends(get_db)):
    """Seed initial demo programs, courses, and sections. Safe to call multiple times."""
    existing = await db.execute(select(func.count(Faculty.id)))
    if existing.scalar() > 0:
        programs_result = await db.execute(select(Program).where(Program.is_active == True))
        programs = programs_result.scalars().all()
        return {"message": "البيانات موجودة مسبقاً", "programs": len(programs)}

    # ── Faculties ──────────────────────────────────────────────────────
    cs_faculty = Faculty(name="College of Computer Science", name_ar="كلية علوم الحاسب", code="CS_FAC", icon="💻", color="#00D4FF", is_active=True)
    biz_faculty = Faculty(name="College of Business Administration", name_ar="كلية الإدارة والأعمال", code="BIZ_FAC", icon="📊", color="#FFD700", is_active=True)
    db.add_all([cs_faculty, biz_faculty])
    await db.flush()

    # ── Departments ────────────────────────────────────────────────────
    cs_dept = Department(faculty_id=cs_faculty.id, name="Computer Science", name_ar="علوم الحاسب", code="CS_DEPT", is_active=True)
    biz_dept = Department(faculty_id=biz_faculty.id, name="Business Administration", name_ar="إدارة الأعمال", code="BIZ_DEPT", is_active=True)
    db.add_all([cs_dept, biz_dept])
    await db.flush()

    # ── Programs ───────────────────────────────────────────────────────
    cs_prog = Program(department_id=cs_dept.id, name="Computer Science", name_ar="علوم الحاسب", code="CS-BS", degree_level=DegreeLevel.BACHELOR, total_credits_required=136, duration_years=4, description_ar="برنامج بكالوريوس في علوم الحاسب يغطي البرمجة والخوارزميات وهندسة البرمجيات", is_active=True)
    se_prog = Program(department_id=cs_dept.id, name="Software Engineering", name_ar="هندسة البرمجيات", code="SE-BS", degree_level=DegreeLevel.BACHELOR, total_credits_required=136, duration_years=4, description_ar="برنامج بكالوريوس في هندسة البرمجيات مع التركيز على تطوير الأنظمة والجودة", is_active=True)
    sec_prog = Program(department_id=cs_dept.id, name="Cybersecurity", name_ar="الأمن السيبراني", code="SEC-DIP", degree_level=DegreeLevel.DIPLOMA, total_credits_required=72, duration_years=2, description_ar="دبلوم في الأمن السيبراني وحماية الأنظمة والشبكات", is_active=True)
    ai_prog = Program(department_id=cs_dept.id, name="Artificial Intelligence", name_ar="الذكاء الاصطناعي", code="AI-BS", degree_level=DegreeLevel.BACHELOR, total_credits_required=134, duration_years=4, description_ar="برنامج بكالوريوس في الذكاء الاصطناعي وتعلم الآلة", is_active=True)
    ba_prog = Program(department_id=biz_dept.id, name="Business Administration", name_ar="إدارة الأعمال", code="BA-BS", degree_level=DegreeLevel.BACHELOR, total_credits_required=132, duration_years=4, description_ar="برنامج بكالوريوس في إدارة الأعمال والتسويق والمالية", is_active=True)
    ba_dip = Program(department_id=biz_dept.id, name="Business Administration Diploma", name_ar="دبلوم إدارة الأعمال", code="BA-DIP", degree_level=DegreeLevel.DIPLOMA, total_credits_required=72, duration_years=2, description_ar="دبلوم في إدارة الأعمال يغطي المبادئ الأساسية للإدارة والتسويق", is_active=True)
    db.add_all([cs_prog, se_prog, sec_prog, ai_prog, ba_prog, ba_dip])
    await db.flush()

    # ── Courses (Level 1 — Semester 1) ─────────────────────────────────
    cs_courses_l1 = [
        Course(program_id=cs_prog.id, code="CS101", name="Intro to Computer Science", name_ar="مقدمة في علوم الحاسب", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="مقدمة شاملة لعالم الحوسبة ومفاهيمها الأساسية", is_active=True),
        Course(program_id=cs_prog.id, code="CS110", name="Python Programming", name_ar="البرمجة بلغة Python", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="تعلم أساسيات البرمجة باستخدام لغة Python الحديثة", is_active=True),
        Course(program_id=cs_prog.id, code="MATH101", name="Calculus I", name_ar="حساب التفاضل والتكامل 1", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="المشتقات والتكامل وتطبيقاتها في الحوسبة", is_active=True),
        Course(program_id=cs_prog.id, code="ENGL101-CS", name="English I", name_ar="اللغة الإنجليزية 1", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="مهارات اللغة الإنجليزية الأساسية للطالب الجامعي", is_active=True),
        Course(program_id=cs_prog.id, code="ISLM101-CS", name="Islamic Culture", name_ar="الثقافة الإسلامية", credits=2, level=1, semester_offered=SemesterType.FALL, description_ar="القيم الإسلامية وأثرها في التطوير المهني والشخصي", is_active=True),
        Course(program_id=cs_prog.id, code="COMM101-CS", name="Communication Skills", name_ar="مهارات التواصل", credits=1, level=1, semester_offered=SemesterType.FALL, description_ar="مهارات التواصل الفعّال في البيئة الأكاديمية والمهنية", is_active=True),
    ]
    se_courses_l1 = [
        Course(program_id=se_prog.id, code="SE101", name="Intro to Software Engineering", name_ar="مقدمة في هندسة البرمجيات", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="مبادئ هندسة البرمجيات ودورة حياة تطوير الأنظمة", is_active=True),
        Course(program_id=se_prog.id, code="SE110", name="Java Programming", name_ar="البرمجة بلغة Java", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="تعلم البرمجة كائنية التوجه باستخدام Java", is_active=True),
        Course(program_id=se_prog.id, code="MATH101-SE", name="Calculus I", name_ar="حساب التفاضل والتكامل 1", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="أسس الرياضيات للمهندسين", is_active=True),
        Course(program_id=se_prog.id, code="ENGL101-SE", name="English I", name_ar="اللغة الإنجليزية 1", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="مهارات اللغة الإنجليزية", is_active=True),
        Course(program_id=se_prog.id, code="ISLM101-SE", name="Islamic Culture", name_ar="الثقافة الإسلامية", credits=2, level=1, semester_offered=SemesterType.FALL, description_ar="القيم الإسلامية في العمل الهندسي", is_active=True),
        Course(program_id=se_prog.id, code="COMM101-SE", name="Communication Skills", name_ar="مهارات التواصل", credits=1, level=1, semester_offered=SemesterType.FALL, description_ar="التواصل المهني للمهندسين", is_active=True),
    ]
    sec_courses_l1 = [
        Course(program_id=sec_prog.id, code="SEC101", name="Information Security Fundamentals", name_ar="أساسيات أمن المعلومات", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="مبادئ أمن المعلومات والتهديدات الإلكترونية", is_active=True),
        Course(program_id=sec_prog.id, code="SEC110", name="Python for Security", name_ar="البرمجة بلغة Python للأمن", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="البرمجة النصية لأدوات الأمن السيبراني", is_active=True),
        Course(program_id=sec_prog.id, code="NET101", name="Computer Networks", name_ar="شبكات الحاسب", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="أسس شبكات الحاسب والبروتوكولات", is_active=True),
        Course(program_id=sec_prog.id, code="ENGL101-SEC", name="English I", name_ar="اللغة الإنجليزية 1", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="مهارات اللغة الإنجليزية", is_active=True),
        Course(program_id=sec_prog.id, code="ISLM101-SEC", name="Islamic Culture", name_ar="الثقافة الإسلامية", credits=2, level=1, semester_offered=SemesterType.FALL, description_ar="أخلاقيات الأمن الرقمي في الإسلام", is_active=True),
        Course(program_id=sec_prog.id, code="COMM101-SEC", name="Communication Skills", name_en="Communication Skills", name_ar="مهارات التواصل", credits=1, level=1, semester_offered=SemesterType.FALL, description_ar="مهارات التواصل المهني", is_active=True),
    ]
    ai_courses_l1 = [
        Course(program_id=ai_prog.id, code="AI101", name="Intro to Artificial Intelligence", name_ar="مقدمة في الذكاء الاصطناعي", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="مدخل إلى عالم الذكاء الاصطناعي وتطبيقاته", is_active=True),
        Course(program_id=ai_prog.id, code="AI110", name="Python for AI", name_ar="Python للذكاء الاصطناعي", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="البرمجة بـ Python مع مكتبات NumPy وPandas", is_active=True),
        Course(program_id=ai_prog.id, code="MATH101-AI", name="Calculus & Linear Algebra", name_ar="التفاضل والجبر الخطي", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="الرياضيات الأساسية لعلم البيانات والذكاء الاصطناعي", is_active=True),
        Course(program_id=ai_prog.id, code="STAT101", name="Statistics & Probability", name_ar="الإحصاء والاحتمالات", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="مبادئ الإحصاء والاحتمالات لتعلم الآلة", is_active=True),
        Course(program_id=ai_prog.id, code="ENGL101-AI", name="English I", name_ar="اللغة الإنجليزية 1", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="مهارات اللغة الإنجليزية", is_active=True),
        Course(program_id=ai_prog.id, code="ISLM101-AI", name="Islamic Culture", name_ar="الثقافة الإسلامية", credits=2, level=1, semester_offered=SemesterType.FALL, description_ar="القيم الإسلامية وأخلاقيات الذكاء الاصطناعي", is_active=True),
    ]
    ba_courses_l1 = [
        Course(program_id=ba_prog.id, code="BA101", name="Principles of Management", name_ar="مبادئ الإدارة", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="المبادئ الأساسية للإدارة والتخطيط التنظيمي", is_active=True),
        Course(program_id=ba_prog.id, code="BA110", name="Microeconomics", name_ar="الاقتصاد الجزئي", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="دراسة سلوك المستهلك والمنتج في الأسواق", is_active=True),
        Course(program_id=ba_prog.id, code="BA115", name="Financial Accounting", name_ar="المحاسبة المالية", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="أسس المحاسبة المالية والقوائم المالية", is_active=True),
        Course(program_id=ba_prog.id, code="ENGL101-BA", name="English I", name_ar="اللغة الإنجليزية 1", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="مهارات اللغة الإنجليزية للأعمال", is_active=True),
        Course(program_id=ba_prog.id, code="ISLM101-BA", name="Islamic Culture", name_ar="الثقافة الإسلامية", credits=2, level=1, semester_offered=SemesterType.FALL, description_ar="الاقتصاد الإسلامي والقيم في الأعمال", is_active=True),
        Course(program_id=ba_prog.id, code="COMM101-BA", name="Communication Skills", name_ar="مهارات التواصل", credits=1, level=1, semester_offered=SemesterType.FALL, description_ar="التواصل الفعّال في بيئة الأعمال", is_active=True),
    ]
    ba_dip_l1 = [
        Course(program_id=ba_dip.id, code="BAD101", name="Principles of Management", name_ar="مبادئ الإدارة", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="المبادئ الأساسية للإدارة والتنظيم", is_active=True),
        Course(program_id=ba_dip.id, code="BAD110", name="Economics Fundamentals", name_ar="أساسيات الاقتصاد", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="مفاهيم العرض والطلب والسوق", is_active=True),
        Course(program_id=ba_dip.id, code="BAD115", name="Principles of Accounting", name_ar="مبادئ المحاسبة", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="المدخل إلى علم المحاسبة", is_active=True),
        Course(program_id=ba_dip.id, code="ENGL101-BAD", name="English I", name_ar="اللغة الإنجليزية 1", credits=3, level=1, semester_offered=SemesterType.FALL, description_ar="مهارات اللغة الإنجليزية", is_active=True),
        Course(program_id=ba_dip.id, code="ISLM101-BAD", name="Islamic Culture", name_ar="الثقافة الإسلامية", credits=2, level=1, semester_offered=SemesterType.FALL, description_ar="الثقافة الإسلامية في الأعمال", is_active=True),
        Course(program_id=ba_dip.id, code="COMM101-BAD", name="Communication Skills", name_ar="مهارات التواصل", credits=1, level=1, semester_offered=SemesterType.FALL, description_ar="مهارات التواصل المهني", is_active=True),
    ]

    all_courses = cs_courses_l1 + se_courses_l1 + sec_courses_l1 + ai_courses_l1 + ba_courses_l1 + ba_dip_l1
    db.add_all(all_courses)
    await db.flush()

    # ── Course Sections (current semester) ─────────────────────────────
    sections = []
    for course in all_courses:
        sections.append(CourseSection(
            course_id=course.id,
            academic_year="2025-2026",
            semester=SemesterType.FALL,
            section_number=1,
            capacity=100,
            enrolled_count=0,
            is_active=True,
            start_date=datetime(2025, 9, 1, tzinfo=timezone.utc),
            end_date=datetime(2026, 1, 31, tzinfo=timezone.utc),
        ))
    db.add_all(sections)

    # ── Academic Calendar ──────────────────────────────────────────────
    calendar = AcademicCalendar(
        academic_year="2025-2026",
        semester=SemesterType.FALL,
        registration_start=datetime(2025, 8, 15, tzinfo=timezone.utc),
        registration_end=datetime(2025, 9, 5, tzinfo=timezone.utc),
        classes_start=datetime(2025, 9, 7, tzinfo=timezone.utc),
        classes_end=datetime(2026, 1, 20, tzinfo=timezone.utc),
        final_exam_start=datetime(2026, 1, 22, tzinfo=timezone.utc),
        final_exam_end=datetime(2026, 1, 31, tzinfo=timezone.utc),
        is_current=True,
    )
    db.add(calendar)
    await db.commit()

    return {
        "message": "تم إنشاء البيانات الأولية بنجاح",
        "faculties": 2,
        "departments": 2,
        "programs": 6,
        "courses": len(all_courses),
        "sections": len(sections),
    }
