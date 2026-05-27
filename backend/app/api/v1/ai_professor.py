from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from typing import List
from app.core.database import get_db
from app.core.deps import get_current_student
from app.models.user import User
from app.models.academic import CourseSection, Course
from app.models.ai_agents import AIProfessor, Conversation, Message, MessageRole, AIInteractionLog
from app.schemas.ai_chat import (
    ChatRequest, ChatResponse, ConversationResponse,
    ConversationDetailResponse, MessageResponse, AIProfessorResponse,
    GenerateQuizRequest, ExplainRequest
)
from app.services.ai.professor_agent import AIProfessorAgent

router = APIRouter(prefix="/ai-professor", tags=["الأستاذ الذكي"])


async def _get_or_create_conversation(
    db: AsyncSession, student_id: int, professor_id: int,
    section_id: int, conversation_id: int = None
) -> Conversation:
    if conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.student_id == student_id,
            )
        )
        conv = result.scalar_one_or_none()
        if conv:
            return conv

    conv = Conversation(
        student_id=student_id,
        ai_professor_id=professor_id,
        section_id=section_id,
        title=f"محادثة {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}",
        message_count=0,
    )
    db.add(conv)
    await db.flush()
    return conv


@router.post("/chat", response_model=ChatResponse)
async def chat_with_professor(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    section_result = await db.execute(
        select(CourseSection).where(CourseSection.id == request.section_id)
    )
    section = section_result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="الشعبة غير موجودة")

    professor_result = await db.execute(
        select(AIProfessor).where(AIProfessor.course_id == section.course_id)
    )
    professor = professor_result.scalar_one_or_none()

    course_result = await db.execute(select(Course).where(Course.id == section.course_id))
    course = course_result.scalar_one_or_none()

    if not professor or not course:
        raise HTTPException(status_code=404, detail="لا يوجد أستاذ ذكاء اصطناعي لهذه المادة")

    conversation = await _get_or_create_conversation(
        db, current_user.id, professor.id, request.section_id, request.conversation_id
    )

    history_result = await db.execute(
        select(Message).where(Message.conversation_id == conversation.id)
        .order_by(Message.created_at).limit(30)
    )
    history_msgs = history_result.scalars().all()
    history = [{"role": m.role.value, "content": m.content} for m in history_msgs]

    agent = AIProfessorAgent(professor, course)
    ai_result = await agent.chat(
        message=request.message,
        history=history,
        db=db,
        student_id=current_user.id,
        conversation_id=conversation.id,
    )

    user_message = Message(
        conversation_id=conversation.id,
        role=MessageRole.USER,
        content=request.message,
    )
    db.add(user_message)

    ai_message = Message(
        conversation_id=conversation.id,
        role=MessageRole.ASSISTANT,
        content=ai_result["response"],
        tokens_used=ai_result["tokens_used"],
        model_used=ai_result.get("model_used"),
    )
    db.add(ai_message)

    conversation.message_count += 2
    conversation.updated_at = datetime.now(timezone.utc)

    professor.total_conversations = (professor.total_conversations or 0) + 1

    log = AIInteractionLog(
        student_id=current_user.id,
        professor_id=professor.id,
        interaction_type="chat",
        tokens_consumed=ai_result["tokens_used"],
        model_used=ai_result.get("model_used"),
        duration_seconds=ai_result.get("duration_seconds", 0),
    )
    db.add(log)
    await db.commit()

    return ChatResponse(
        response=ai_result["response"],
        conversation_id=conversation.id,
        message_id=ai_message.id,
        tokens_used=ai_result["tokens_used"],
        suggested_topics=ai_result.get("suggested_topics", []),
        related_materials=ai_result.get("related_materials", []),
    )


@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.student_id == current_user.id,
            Conversation.is_active == True,
        ).order_by(Conversation.updated_at.desc()).limit(50)
    )
    conversations = result.scalars().all()
    return [ConversationResponse.model_validate(c) for c in conversations]


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation_detail(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.student_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")

    msgs_result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = msgs_result.scalars().all()

    response = ConversationDetailResponse.model_validate(conversation)
    response.messages = [MessageResponse.model_validate(m) for m in messages]
    return response


@router.post("/generate-quiz")
async def generate_quiz(
    request: GenerateQuizRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    section_result = await db.execute(select(CourseSection).where(CourseSection.id == request.section_id))
    section = section_result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="الشعبة غير موجودة")

    professor_result = await db.execute(select(AIProfessor).where(AIProfessor.course_id == section.course_id))
    professor = professor_result.scalar_one_or_none()
    course_result = await db.execute(select(Course).where(Course.id == section.course_id))
    course = course_result.scalar_one_or_none()

    if not professor or not course:
        raise HTTPException(status_code=404, detail="الأستاذ غير موجود")

    agent = AIProfessorAgent(professor, course)
    quiz = await agent.generate_quiz(
        topic=request.topic,
        difficulty=request.difficulty,
        num_questions=request.num_questions,
    )
    return quiz


@router.post("/explain")
async def explain_concept(
    request: ExplainRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    section_result = await db.execute(select(CourseSection).where(CourseSection.id == request.section_id))
    section = section_result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="الشعبة غير موجودة")

    professor_result = await db.execute(select(AIProfessor).where(AIProfessor.course_id == section.course_id))
    professor = professor_result.scalar_one_or_none()
    course_result = await db.execute(select(Course).where(Course.id == section.course_id))
    course = course_result.scalar_one_or_none()

    if not professor or not course:
        raise HTTPException(status_code=404, detail="الأستاذ غير موجود")

    agent = AIProfessorAgent(professor, course)
    explanation = await agent.explain_concept(request.concept, request.detail_level)
    return {"concept": request.concept, "explanation": explanation}


@router.get("/section/{section_id}", response_model=AIProfessorResponse)
async def get_section_professor(
    section_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    section_result = await db.execute(select(CourseSection).where(CourseSection.id == section_id))
    section = section_result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="الشعبة غير موجودة")

    result = await db.execute(select(AIProfessor).where(AIProfessor.course_id == section.course_id))
    professor = result.scalar_one_or_none()
    if not professor:
        raise HTTPException(status_code=404, detail="لا يوجد أستاذ ذكاء اصطناعي")

    return AIProfessorResponse.model_validate(professor)
