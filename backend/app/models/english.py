import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, Text, JSON, Float, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class CEFRLevel(str, enum.Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


class EnglishSkill(str, enum.Enum):
    READING = "reading"
    WRITING = "writing"
    LISTENING = "listening"
    SPEAKING = "speaking"
    GRAMMAR = "grammar"
    VOCABULARY = "vocabulary"


class EnglishCourse(Base):
    __tablename__ = "english_courses"

    id = Column(Integer, primary_key=True, index=True)
    level = Column(Enum(CEFRLevel), nullable=False, unique=True)
    name = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=False)
    description = Column(Text)
    description_ar = Column(Text)
    total_units = Column(Integer, default=12)
    estimated_hours = Column(Integer, default=60)
    skills_focus = Column(JSON, default=list)
    learning_objectives = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)

    units = relationship("EnglishUnit", back_populates="course", cascade="all, delete-orphan", order_by="EnglishUnit.unit_number")
    student_progress = relationship("EnglishStudentProgress", back_populates="course")


class EnglishUnit(Base):
    __tablename__ = "english_units"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("english_courses.id", ondelete="CASCADE"))
    unit_number = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    title_ar = Column(String(200))
    grammar_topic = Column(String(200))
    vocabulary_topic = Column(String(200))
    reading_passage = Column(Text)
    listening_script = Column(Text)
    writing_task = Column(Text)
    speaking_task = Column(Text)
    exercises = Column(JSON, default=list)
    vocabulary_list = Column(JSON, default=list)
    grammar_rules = Column(JSON, default=list)
    is_published = Column(Boolean, default=False)

    course = relationship("EnglishCourse", back_populates="units")


class EnglishStudentProgress(Base):
    __tablename__ = "english_student_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"))
    course_id = Column(Integer, ForeignKey("english_courses.id", ondelete="CASCADE"))
    current_level = Column(Enum(CEFRLevel), default=CEFRLevel.A1)
    placement_test_score = Column(Float, default=0.0)
    completed_units = Column(JSON, default=list)
    current_unit_id = Column(Integer, ForeignKey("english_units.id"), nullable=True)

    reading_score = Column(Float, default=0.0)
    writing_score = Column(Float, default=0.0)
    grammar_score = Column(Float, default=0.0)
    vocabulary_score = Column(Float, default=0.0)
    listening_score = Column(Float, default=0.0)
    speaking_score = Column(Float, default=0.0)

    total_study_hours = Column(Float, default=0.0)
    started_at = Column(DateTime(timezone=True))
    last_activity = Column(DateTime(timezone=True))
    streak_days = Column(Integer, default=0)

    student = relationship("StudentProfile", back_populates="english_progress")
    course = relationship("EnglishCourse", back_populates="student_progress")


class PlacementTest(Base):
    __tablename__ = "placement_tests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    test_date = Column(DateTime(timezone=True))
    placement_score = Column(Float, nullable=False)
    recommended_level = Column(Enum(CEFRLevel), nullable=False)
    answers = Column(JSON, default=dict)
    time_spent_minutes = Column(Integer, default=0)
    grammar_score = Column(Float, default=0.0)
    vocabulary_score = Column(Float, default=0.0)
    reading_score = Column(Float, default=0.0)
    ai_assessment = Column(Text)
