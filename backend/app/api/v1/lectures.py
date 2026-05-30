from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
from typing import Optional
from app.core.database import get_db
from app.core.deps import get_current_student, get_current_admin
from app.models.user import User
from app.models.content import Lecture, StudyMaterial
from app.models.academic import CourseSection, Course
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.engagement import LectureProgress

router = APIRouter(prefix="/lectures", tags=["المحاضرات"])


@router.get("/section/{section_id}")
async def get_section_lectures(
    section_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    result = await db.execute(
        select(Lecture)
        .where(Lecture.section_id == section_id, Lecture.is_published == True)
        .order_by(Lecture.order_index)
    )
    lectures = result.scalars().all()

    progress_result = await db.execute(
        select(LectureProgress).where(
            LectureProgress.student_id == current_user.id,
            LectureProgress.lecture_id.in_([l.id for l in lectures]),
        )
    )
    progress_map = {p.lecture_id: p for p in progress_result.scalars().all()}

    return [
        {
            "id": l.id,
            "title": l.title_ar or l.title,
            "duration_minutes": l.duration_minutes,
            "order_index": l.order_index,
            "learning_objectives": l.learning_objectives or [],
            "key_concepts": l.key_concepts or [],
            "has_content": bool(l.content),
            "view_count": l.view_count,
            "completed": progress_map.get(l.id, None) and progress_map[l.id].completed,
            "progress_percent": progress_map.get(l.id, None) and progress_map[l.id].progress_percent or 0,
            "time_spent_minutes": progress_map.get(l.id, None) and progress_map[l.id].time_spent_minutes or 0,
        }
        for l in lectures
    ]


@router.get("/{lecture_id}")
async def get_lecture_detail(
    lecture_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    result = await db.execute(
        select(Lecture).where(Lecture.id == lecture_id, Lecture.is_published == True)
    )
    lecture = result.scalar_one_or_none()
    if not lecture:
        raise HTTPException(status_code=404, detail="المحاضرة غير موجودة")

    # Increment view count
    lecture.view_count = (lecture.view_count or 0) + 1

    # Get materials
    mat_result = await db.execute(
        select(StudyMaterial).where(StudyMaterial.lecture_id == lecture_id)
    )
    materials = mat_result.scalars().all()

    # Get student progress
    prog_result = await db.execute(
        select(LectureProgress).where(
            LectureProgress.student_id == current_user.id,
            LectureProgress.lecture_id == lecture_id,
        )
    )
    progress = prog_result.scalar_one_or_none()

    await db.commit()

    return {
        "id": lecture.id,
        "title": lecture.title_ar or lecture.title,
        "content": lecture.content,
        "summary": lecture.ai_generated_summary,
        "duration_minutes": lecture.duration_minutes,
        "order_index": lecture.order_index,
        "learning_objectives": lecture.learning_objectives or [],
        "key_concepts": lecture.key_concepts or [],
        "slides": lecture.slides or [],
        "section_id": lecture.section_id,
        "view_count": lecture.view_count,
        "completed": progress.completed if progress else False,
        "progress_percent": progress.progress_percent if progress else 0,
        "notes": progress.notes if progress else "",
        "materials": [
            {
                "id": m.id,
                "title": m.title,
                "material_type": m.material_type.value,
                "file_url": m.file_url,
                "description": m.description,
            }
            for m in materials
        ],
    }


@router.post("/{lecture_id}/progress")
async def save_lecture_progress(
    lecture_id: int,
    progress_percent: float = 0,
    completed: bool = False,
    time_spent_minutes: int = 0,
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    result = await db.execute(
        select(LectureProgress).where(
            LectureProgress.student_id == current_user.id,
            LectureProgress.lecture_id == lecture_id,
        )
    )
    progress = result.scalar_one_or_none()

    if not progress:
        progress = LectureProgress(
            student_id=current_user.id,
            lecture_id=lecture_id,
        )
        db.add(progress)

    progress.progress_percent = max(progress.progress_percent or 0, progress_percent)
    progress.time_spent_minutes = (progress.time_spent_minutes or 0) + time_spent_minutes
    if notes is not None:
        progress.notes = notes
    if completed and not progress.completed:
        progress.completed = True
        progress.completed_at = datetime.now(timezone.utc)

    await db.commit()
    return {"message": "تم حفظ التقدم", "completed": progress.completed, "progress_percent": progress.progress_percent}
