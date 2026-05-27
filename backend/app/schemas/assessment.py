from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.assessment import AssessmentType, QuestionType, DifficultyLevel


class QuestionCreate(BaseModel):
    question_type: QuestionType
    content: str
    content_ar: Optional[str] = None
    options: Optional[List[Dict[str, Any]]] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    points: float = 1.0
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    topic_tag: Optional[str] = None


class QuestionResponse(BaseModel):
    id: int
    question_type: QuestionType
    content: str
    content_ar: Optional[str] = None
    options: Optional[List[Dict[str, Any]]] = None
    points: float
    difficulty: DifficultyLevel
    order_index: int

    model_config = {"from_attributes": True}


class AssessmentCreate(BaseModel):
    section_id: int
    title: str
    title_ar: Optional[str] = None
    assessment_type: AssessmentType
    description: Optional[str] = None
    instructions: Optional[str] = None
    total_points: float = 100.0
    passing_score: float = 60.0
    duration_minutes: int = 60
    attempts_allowed: int = 1
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    is_randomized: bool = True
    anti_cheat_enabled: bool = True
    weight_percent: float = 20.0
    questions: List[QuestionCreate] = []


class AssessmentResponse(BaseModel):
    id: int
    title: str
    title_ar: Optional[str] = None
    assessment_type: AssessmentType
    description: Optional[str] = None
    total_points: float
    passing_score: float
    duration_minutes: int
    attempts_allowed: int
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    is_published: bool
    weight_percent: float
    question_count: int = 0

    model_config = {"from_attributes": True}


class AssessmentWithQuestions(AssessmentResponse):
    questions: List[QuestionResponse] = []
    instructions: Optional[str] = None


class AnswerSubmit(BaseModel):
    question_id: int
    answer: str


class SubmissionCreate(BaseModel):
    assessment_id: int
    answers: List[AnswerSubmit]
    time_spent_minutes: int = 0


class SubmissionResponse(BaseModel):
    id: int
    assessment_id: int
    total_score: Optional[float] = None
    percentage: Optional[float] = None
    letter_grade: Optional[str] = None
    is_graded: bool
    passed: Optional[bool] = None
    ai_feedback: Optional[str] = None
    submitted_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class GradeReport(BaseModel):
    submission_id: int
    assessment_title: str
    total_score: float
    max_score: float
    percentage: float
    letter_grade: str
    passed: bool
    ai_feedback: str
    question_details: List[Dict[str, Any]] = []
