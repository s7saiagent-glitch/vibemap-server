from app.models.user import User, StudentProfile, AdminProfile, RefreshToken
from app.models.academic import Faculty, Department, Program, Course, CourseSection, AcademicCalendar
from app.models.enrollment import Enrollment, ProgramEnrollment
from app.models.assessment import Assessment, Question, StudentSubmission, QuestionAnswer
from app.models.content import Lecture, StudyMaterial, Announcement, StudentNote
from app.models.ai_agents import AIProfessor, Conversation, Message, StudentAcademicTwin, AIInteractionLog
from app.models.english import EnglishCourse, EnglishUnit, EnglishStudentProgress, PlacementTest
from app.models.engagement import LectureProgress, StudentPoints, StudentBadge, ForumPost, ForumReply

__all__ = [
    "User", "StudentProfile", "AdminProfile", "RefreshToken",
    "Faculty", "Department", "Program", "Course", "CourseSection", "AcademicCalendar",
    "Enrollment", "ProgramEnrollment",
    "Assessment", "Question", "StudentSubmission", "QuestionAnswer",
    "Lecture", "StudyMaterial", "Announcement", "StudentNote",
    "AIProfessor", "Conversation", "Message", "StudentAcademicTwin", "AIInteractionLog",
    "EnglishCourse", "EnglishUnit", "EnglishStudentProgress", "PlacementTest",
    "LectureProgress", "StudentPoints", "StudentBadge", "ForumPost", "ForumReply",
]
