import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class MaterialType(str, enum.Enum):
    PDF = "pdf"
    VIDEO = "video"
    LINK = "link"
    NOTE = "note"
    FLASHCARD = "flashcard"
    PRESENTATION = "presentation"
    CODE = "code"


class Priority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Lecture(Base):
    __tablename__ = "lectures"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("course_sections.id", ondelete="CASCADE"))
    title = Column(String(300), nullable=False)
    title_ar = Column(String(300))
    content = Column(Text)
    ai_generated_summary = Column(Text)
    slides = Column(JSON, default=list)
    duration_minutes = Column(Integer, default=60)
    order_index = Column(Integer, default=0)
    is_published = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    ai_generated = Column(Boolean, default=False)
    learning_objectives = Column(JSON, default=list)
    key_concepts = Column(JSON, default=list)

    section = relationship("CourseSection", back_populates="lectures")
    materials = relationship("StudyMaterial", back_populates="lecture")
    student_notes = relationship("StudentNote", back_populates="lecture")


class StudyMaterial(Base):
    __tablename__ = "study_materials"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    lecture_id = Column(Integer, ForeignKey("lectures.id", ondelete="SET NULL"), nullable=True)
    material_type = Column(Enum(MaterialType), nullable=False)
    title = Column(String(300), nullable=False)
    description = Column(Text)
    file_url = Column(String(1000))
    content = Column(Text)
    ai_generated = Column(Boolean, default=False)
    is_required = Column(Boolean, default=False)
    download_count = Column(Integer, default=0)

    course = relationship("Course", back_populates="materials")
    lecture = relationship("Lecture", back_populates="materials")


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("course_sections.id", ondelete="CASCADE"))
    title = Column(String(300), nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(Enum(Priority), default=Priority.NORMAL)
    created_by_ai = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)

    section = relationship("CourseSection", back_populates="announcements")


class StudentNote(Base):
    __tablename__ = "student_notes"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    lecture_id = Column(Integer, ForeignKey("lectures.id", ondelete="CASCADE"))
    content = Column(Text, nullable=False)
    highlighted_text = Column(Text)
    color = Column(String(20), default="#D4AF37")

    lecture = relationship("Lecture", back_populates="student_notes")
