from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.academic import DegreeLevel, SemesterType


class FacultyResponse(BaseModel):
    id: int
    name: str
    name_ar: str
    code: str
    description: Optional[str] = None
    description_ar: Optional[str] = None
    icon: str
    color: str
    is_active: bool

    model_config = {"from_attributes": True}


class DepartmentResponse(BaseModel):
    id: int
    faculty_id: int
    name: str
    name_ar: str
    code: str
    description: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


class FacultyWithDepartments(FacultyResponse):
    departments: List[DepartmentResponse] = []


class ProgramResponse(BaseModel):
    id: int
    department_id: int
    name: str
    name_ar: str
    code: str
    degree_level: DegreeLevel
    total_credits_required: int
    duration_years: int
    description: Optional[str] = None
    description_ar: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


class CourseResponse(BaseModel):
    id: int
    program_id: int
    code: str
    name: str
    name_ar: str
    credits: int
    level: int
    description: Optional[str] = None
    description_ar: Optional[str] = None
    prerequisites: List[str] = []
    is_elective: bool
    is_active: bool

    model_config = {"from_attributes": True}


class CourseSectionResponse(BaseModel):
    id: int
    course_id: int
    academic_year: str
    semester: SemesterType
    section_number: int
    capacity: int
    enrolled_count: int
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: bool

    model_config = {"from_attributes": True}


class AcademicCalendarResponse(BaseModel):
    id: int
    academic_year: str
    semester: SemesterType
    registration_start: Optional[datetime] = None
    registration_end: Optional[datetime] = None
    classes_start: Optional[datetime] = None
    classes_end: Optional[datetime] = None
    final_exam_start: Optional[datetime] = None
    final_exam_end: Optional[datetime] = None
    is_current: bool

    model_config = {"from_attributes": True}
