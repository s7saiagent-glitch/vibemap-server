from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.ai_agents import MessageRole, LearningStyle, PerformanceTrend


class ChatRequest(BaseModel):
    section_id: int
    message: str
    conversation_id: Optional[int] = None
    language: str = "ar"


class ChatResponse(BaseModel):
    response: str
    conversation_id: int
    message_id: int
    tokens_used: int
    suggested_topics: List[str] = []
    related_materials: List[dict] = []


class MessageResponse(BaseModel):
    id: int
    role: MessageRole
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: int
    title: str
    message_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetailResponse(ConversationResponse):
    messages: List[MessageResponse] = []


class AIProfessorResponse(BaseModel):
    id: int
    name: str
    name_ar: str
    persona_description: Optional[str] = None
    teaching_style: str
    avg_rating: float
    total_conversations: int
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class StudentTwinResponse(BaseModel):
    learning_style: LearningStyle
    performance_trend: PerformanceTrend
    weak_topics: List[str] = []
    strong_topics: List[str] = []
    avg_study_time_per_day: float
    ai_recommendations: List[str] = []

    model_config = {"from_attributes": True}


class GenerateQuizRequest(BaseModel):
    section_id: int
    topic: str
    difficulty: str = "medium"
    num_questions: int = 5
    question_types: List[str] = ["mcq"]


class ExplainRequest(BaseModel):
    section_id: int
    concept: str
    detail_level: str = "standard"
    language: str = "ar"
