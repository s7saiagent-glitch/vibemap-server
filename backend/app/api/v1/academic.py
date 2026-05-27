from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.core.database import get_db
from app.models.academic import Faculty, Department, Program, Course, CourseSection, AcademicCalendar
from app.schemas.academic import (
    FacultyResponse, FacultyWithDepartments, DepartmentResponse,
    ProgramResponse, CourseResponse, AcademicCalendarResponse, CourseSectionResponse
)

router = APIRouter(prefix="/academic", tags=["الهيكل الأكاديمي"])


@router.get("/faculties", response_model=List[FacultyWithDepartments])
async def get_faculties(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Faculty).where(Faculty.is_active == True))
    faculties = result.scalars().all()

    response = []
    for faculty in faculties:
        dept_result = await db.execute(
            select(Department).where(Department.faculty_id == faculty.id, Department.is_active == True)
        )
        departments = dept_result.scalars().all()
        fac_data = FacultyWithDepartments.model_validate(faculty)
        fac_data.departments = [DepartmentResponse.model_validate(d) for d in departments]
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
