import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, Float, DateTime, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class LectureProgress(Base):
    __tablename__ = "lecture_progress"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lecture_id = Column(Integer, ForeignKey("lectures.id", ondelete="CASCADE"), nullable=False)
    completed = Column(Boolean, default=False)
    progress_percent = Column(Float, default=0.0)
    time_spent_minutes = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class StudentPoints(Base):
    __tablename__ = "student_points_log"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    points = Column(Integer, default=0)
    reason = Column(String(200), nullable=False)
    category = Column(String(50), default="general")


class StudentBadge(Base):
    __tablename__ = "student_badges"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    badge_key = Column(String(50), nullable=False)
    badge_name = Column(String(100), nullable=False)
    badge_icon = Column(String(10), default="🏅")
    description = Column(String(200))


class ForumPost(Base):
    __tablename__ = "forum_posts"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("course_sections.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(300), nullable=False)
    content = Column(Text, nullable=False)
    upvotes = Column(Integer, default=0)
    is_pinned = Column(Boolean, default=False)
    is_answered = Column(Boolean, default=False)

    replies = relationship("ForumReply", back_populates="post", cascade="all, delete-orphan")


class ForumReply(Base):
    __tablename__ = "forum_replies"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("forum_posts.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    upvotes = Column(Integer, default=0)
    is_ai_answer = Column(Boolean, default=False)

    post = relationship("ForumPost", back_populates="replies")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    section_id = Column(Integer, ForeignKey("course_sections.id"), nullable=False)
    date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status = Column(String(20), default="present")  # present, absent, late, excused
    notes = Column(Text, nullable=True)
    recorded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class GradeAppeal(Base):
    __tablename__ = "grade_appeals"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_name = Column(String(200), nullable=False)
    current_grade = Column(String(10), nullable=True)
    expected_grade = Column(String(10), nullable=True)
    reason = Column(String(200), nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, reviewing, resolved, rejected
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
