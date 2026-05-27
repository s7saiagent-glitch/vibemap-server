import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, Float, DateTime, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class EnrollmentStatus(str, enum.Enum):
    ENROLLED = "enrolled"
    DROPPED = "dropped"
    COMPLETED = "completed"
    FAILED = "failed"
    WITHDRAWN = "withdrawn"
    INCOMPLETE = "incomplete"


class ProgramEnrollmentStatus(str, enum.Enum):
    ACTIVE = "active"
    GRADUATED = "graduated"
    SUSPENDED = "suspended"
    WITHDRAWN = "withdrawn"
    ON_HOLD = "on_hold"


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"))
    section_id = Column(Integer, ForeignKey("course_sections.id", ondelete="CASCADE"))
    enrolled_at = Column(DateTime(timezone=True))
    status = Column(Enum(EnrollmentStatus), default=EnrollmentStatus.ENROLLED)

    midterm_grade = Column(Float, nullable=True)
    final_grade = Column(Float, nullable=True)
    assignment_grade = Column(Float, nullable=True)
    participation_grade = Column(Float, nullable=True)
    total_grade = Column(Float, nullable=True)
    letter_grade = Column(String(5), nullable=True)
    gpa_points = Column(Float, nullable=True)
    attempt_number = Column(Integer, default=1)
    completed_at = Column(DateTime(timezone=True))
    instructor_notes = Column(Text)

    student = relationship("StudentProfile", back_populates="enrollments")
    section = relationship("CourseSection", back_populates="enrollments")


class ProgramEnrollment(Base):
    __tablename__ = "program_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), unique=True)
    program_id = Column(Integer, ForeignKey("programs.id", ondelete="CASCADE"))
    enrollment_date = Column(DateTime(timezone=True))
    expected_graduation = Column(DateTime(timezone=True))
    status = Column(Enum(ProgramEnrollmentStatus), default=ProgramEnrollmentStatus.ACTIVE)
    advisor_notes = Column(Text)

    student = relationship("StudentProfile", back_populates="program_enrollment")
    program = relationship("Program")
