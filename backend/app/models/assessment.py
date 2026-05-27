import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, Float, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class AssessmentType(str, enum.Enum):
    QUIZ = "quiz"
    MIDTERM = "midterm"
    FINAL = "final"
    ASSIGNMENT = "assignment"
    PROJECT = "project"
    CODING_EXAM = "coding_exam"
    PRACTICAL = "practical"


class QuestionType(str, enum.Enum):
    MCQ = "mcq"
    ESSAY = "essay"
    CODING = "coding"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"
    FILL_BLANK = "fill_blank"


class DifficultyLevel(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("course_sections.id", ondelete="CASCADE"))
    title = Column(String(300), nullable=False)
    title_ar = Column(String(300))
    assessment_type = Column(Enum(AssessmentType), nullable=False)
    description = Column(Text)
    instructions = Column(Text)
    instructions_ar = Column(Text)

    total_points = Column(Float, default=100.0)
    passing_score = Column(Float, default=60.0)
    duration_minutes = Column(Integer, default=60)
    attempts_allowed = Column(Integer, default=1)

    start_datetime = Column(DateTime(timezone=True))
    end_datetime = Column(DateTime(timezone=True))

    is_randomized = Column(Boolean, default=True)
    show_results_immediately = Column(Boolean, default=True)
    anti_cheat_enabled = Column(Boolean, default=True)
    ai_generated = Column(Boolean, default=False)
    is_published = Column(Boolean, default=False)

    weight_percent = Column(Float, default=20.0)

    section = relationship("CourseSection", back_populates="assessments")
    questions = relationship("Question", back_populates="assessment", cascade="all, delete-orphan")
    submissions = relationship("StudentSubmission", back_populates="assessment")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"))
    question_type = Column(Enum(QuestionType), nullable=False)
    content = Column(Text, nullable=False)
    content_ar = Column(Text)
    options = Column(JSON, default=list)
    correct_answer = Column(Text)
    explanation = Column(Text)
    explanation_ar = Column(Text)
    points = Column(Float, default=1.0)
    difficulty = Column(Enum(DifficultyLevel), default=DifficultyLevel.MEDIUM)
    ai_generated = Column(Boolean, default=False)
    order_index = Column(Integer, default=0)
    topic_tag = Column(String(100))

    assessment = relationship("Assessment", back_populates="questions")
    answers = relationship("QuestionAnswer", back_populates="question")


class StudentSubmission(Base):
    __tablename__ = "student_submissions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    assessment_id = Column(Integer, ForeignKey("assessments.id", ondelete="CASCADE"))

    started_at = Column(DateTime(timezone=True))
    submitted_at = Column(DateTime(timezone=True))
    time_spent_minutes = Column(Integer, default=0)

    answers = Column(JSON, default=dict)
    total_score = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    letter_grade = Column(String(5), nullable=True)
    ai_feedback = Column(Text)
    graded_at = Column(DateTime(timezone=True))
    is_graded = Column(Boolean, default=False)

    attempt_number = Column(Integer, default=1)
    cheat_flags = Column(JSON, default=list)
    tab_switch_count = Column(Integer, default=0)
    passed = Column(Boolean, nullable=True)

    assessment = relationship("Assessment", back_populates="submissions")
    question_answers = relationship("QuestionAnswer", back_populates="submission", cascade="all, delete-orphan")


class QuestionAnswer(Base):
    __tablename__ = "question_answers"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("student_submissions.id", ondelete="CASCADE"))
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"))
    student_answer = Column(Text)
    is_correct = Column(Boolean, nullable=True)
    points_earned = Column(Float, default=0.0)
    ai_feedback = Column(Text)

    submission = relationship("StudentSubmission", back_populates="question_answers")
    question = relationship("Question", back_populates="answers")
