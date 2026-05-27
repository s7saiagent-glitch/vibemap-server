import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, Text, JSON, Float
from sqlalchemy.orm import relationship
from app.core.database import Base


class AIProvider(str, enum.Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"


class MessageRole(str, enum.Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class LearningStyle(str, enum.Enum):
    VISUAL = "visual"
    AUDITORY = "auditory"
    READING = "reading"
    KINESTHETIC = "kinesthetic"
    MIXED = "mixed"


class PerformanceTrend(str, enum.Enum):
    IMPROVING = "improving"
    STABLE = "stable"
    DECLINING = "declining"


class AIProfessor(Base):
    __tablename__ = "ai_professors"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), unique=True)
    name = Column(String(200), nullable=False)
    name_ar = Column(String(200), nullable=False)
    persona_description = Column(Text)
    persona_description_ar = Column(Text)
    teaching_style = Column(String(100), default="interactive")
    system_prompt = Column(Text, nullable=False)
    model_provider = Column(Enum(AIProvider), default=AIProvider.ANTHROPIC)
    model_name = Column(String(100), default="claude-sonnet-4-6")
    temperature = Column(Float, default=0.7)
    avatar_url = Column(String(500))
    specializations = Column(JSON, default=list)
    total_conversations = Column(Integer, default=0)
    avg_rating = Column(Float, default=5.0)
    is_active = Column(Boolean, default=True)

    course = relationship("Course", back_populates="ai_professor")
    sections = relationship("CourseSection", back_populates="ai_professor")
    conversations = relationship("Conversation", back_populates="ai_professor")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    ai_professor_id = Column(Integer, ForeignKey("ai_professors.id", ondelete="CASCADE"))
    section_id = Column(Integer, ForeignKey("course_sections.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(300), default="محادثة جديدة")
    message_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    student = relationship("User", back_populates="conversations", foreign_keys=[student_id])
    ai_professor = relationship("AIProfessor", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"))
    role = Column(Enum(MessageRole), nullable=False)
    content = Column(Text, nullable=False)
    tokens_used = Column(Integer, default=0)
    model_used = Column(String(100))
    metadata = Column(JSON, default=dict)

    conversation = relationship("Conversation", back_populates="messages")


class StudentAcademicTwin(Base):
    __tablename__ = "student_academic_twins"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), unique=True)
    learning_style = Column(Enum(LearningStyle), default=LearningStyle.MIXED)
    knowledge_map = Column(JSON, default=dict)
    weak_topics = Column(JSON, default=list)
    strong_topics = Column(JSON, default=list)
    avg_study_time_per_day = Column(Float, default=2.0)
    preferred_study_time = Column(String(20), default="evening")
    performance_trend = Column(Enum(PerformanceTrend), default=PerformanceTrend.STABLE)
    ai_recommendations = Column(JSON, default=list)
    interaction_count = Column(Integer, default=0)
    last_analysis = Column(Text)

    student = relationship("StudentProfile", back_populates="academic_twin")


class AIInteractionLog(Base):
    __tablename__ = "ai_interaction_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    professor_id = Column(Integer, ForeignKey("ai_professors.id", ondelete="SET NULL"), nullable=True)
    interaction_type = Column(String(50))
    tokens_consumed = Column(Integer, default=0)
    cost_usd = Column(Float, default=0.0)
    model_used = Column(String(100))
    duration_seconds = Column(Float, default=0.0)
