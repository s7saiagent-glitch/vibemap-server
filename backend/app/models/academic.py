import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, Text, JSON, Float, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class DegreeLevel(str, enum.Enum):
    DIPLOMA = "diploma"
    BACHELOR = "bachelor"
    MASTER = "master"
    PHD = "phd"


class SemesterType(str, enum.Enum):
    FALL = "fall"
    SPRING = "spring"
    SUMMER = "summer"


class Faculty(Base):
    __tablename__ = "faculties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text)
    description_ar = Column(Text)
    icon = Column(String(100), default="🎓")
    color = Column(String(20), default="#00D4FF")
    is_active = Column(Boolean, default=True)

    departments = relationship("Department", back_populates="faculty", cascade="all, delete-orphan")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculties.id", ondelete="CASCADE"))
    name = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)

    faculty = relationship("Faculty", back_populates="departments")
    programs = relationship("Program", back_populates="department", cascade="all, delete-orphan")


class Program(Base):
    __tablename__ = "programs"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id", ondelete="CASCADE"))
    name = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    degree_level = Column(Enum(DegreeLevel), default=DegreeLevel.BACHELOR)
    total_credits_required = Column(Integer, default=132)
    duration_years = Column(Integer, default=4)
    description = Column(Text)
    description_ar = Column(Text)
    requirements = Column(JSON, default=dict)
    learning_outcomes = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)

    department = relationship("Department", back_populates="programs")
    courses = relationship("Course", back_populates="program")
    students = relationship("StudentProfile", back_populates="program")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("programs.id", ondelete="CASCADE"))
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=False)
    credits = Column(Integer, default=3)
    level = Column(Integer, default=1)
    semester_offered = Column(Enum(SemesterType), default=SemesterType.FALL)
    description = Column(Text)
    description_ar = Column(Text)
    prerequisites = Column(JSON, default=list)
    syllabus = Column(JSON, default=dict)
    learning_outcomes = Column(JSON, default=list)
    is_elective = Column(Boolean, default=False)
    max_attempts = Column(Integer, default=3)
    is_active = Column(Boolean, default=True)

    program = relationship("Program", back_populates="courses")
    sections = relationship("CourseSection", back_populates="course")
    ai_professor = relationship("AIProfessor", back_populates="course", uselist=False)
    materials = relationship("StudyMaterial", back_populates="course")


class CourseSection(Base):
    __tablename__ = "course_sections"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    academic_year = Column(String(10), nullable=False)
    semester = Column(Enum(SemesterType), nullable=False)
    section_number = Column(Integer, default=1)
    ai_professor_id = Column(Integer, ForeignKey("ai_professors.id"), nullable=True)
    capacity = Column(Integer, default=100)
    enrolled_count = Column(Integer, default=0)
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)

    course = relationship("Course", back_populates="sections")
    ai_professor = relationship("AIProfessor", back_populates="sections")
    enrollments = relationship("Enrollment", back_populates="section")
    assessments = relationship("Assessment", back_populates="section")
    lectures = relationship("Lecture", back_populates="section")
    announcements = relationship("Announcement", back_populates="section")


class AcademicCalendar(Base):
    __tablename__ = "academic_calendars"

    id = Column(Integer, primary_key=True, index=True)
    academic_year = Column(String(10), nullable=False)
    semester = Column(Enum(SemesterType), nullable=False)
    registration_start = Column(DateTime(timezone=True))
    registration_end = Column(DateTime(timezone=True))
    classes_start = Column(DateTime(timezone=True))
    classes_end = Column(DateTime(timezone=True))
    final_exam_start = Column(DateTime(timezone=True))
    final_exam_end = Column(DateTime(timezone=True))
    is_current = Column(Boolean, default=False)
