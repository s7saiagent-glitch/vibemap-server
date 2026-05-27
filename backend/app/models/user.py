import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, ForeignKey, Text, JSON, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserRole(str, enum.Enum):
    STUDENT = "student"
    AI_PROFESSOR = "ai_professor"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"
    HUMAN_SUPERVISOR = "human_supervisor"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    first_name_ar = Column(String(100))
    last_name_ar = Column(String(100))
    phone = Column(String(20))
    avatar_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    last_login = Column(DateTime(timezone=True))

    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    admin_profile = relationship("AdminProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="student", foreign_keys="Conversation.student_id")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name_ar(self) -> str:
        if self.first_name_ar and self.last_name_ar:
            return f"{self.first_name_ar} {self.last_name_ar}"
        return self.full_name


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    student_id = Column(String(20), unique=True, index=True)
    program_id = Column(Integer, ForeignKey("programs.id"), nullable=True)
    admission_date = Column(DateTime(timezone=True))
    expected_graduation = Column(DateTime(timezone=True))
    academic_standing = Column(String(50), default="good")
    total_credits_earned = Column(Integer, default=0)
    cumulative_gpa = Column(String(10), default="0.00")
    enrollment_status = Column(String(20), default="active")
    nationality = Column(String(100))
    date_of_birth = Column(DateTime(timezone=True))
    bio = Column(Text)

    user = relationship("User", back_populates="student_profile")
    program = relationship("Program", back_populates="students")
    enrollments = relationship("Enrollment", back_populates="student")
    program_enrollment = relationship("ProgramEnrollment", back_populates="student", uselist=False)
    academic_twin = relationship("StudentAcademicTwin", back_populates="student", uselist=False)
    english_progress = relationship("EnglishStudentProgress", back_populates="student")


class AdminProfile(Base):
    __tablename__ = "admin_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    department = Column(String(100))
    title = Column(String(100))
    permissions = Column(JSON, default=dict)

    user = relationship("User", back_populates="admin_profile")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    token = Column(String(500), unique=True, index=True)
    expires_at = Column(DateTime(timezone=True))
    is_revoked = Column(Boolean, default=False)

    user = relationship("User", back_populates="refresh_tokens")
