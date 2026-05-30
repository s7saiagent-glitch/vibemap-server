from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.database import get_db
from app.core.deps import get_current_student
from app.models.user import User
from app.models.academic import Course, CourseSection, Program
from app.models.content import Lecture, StudyMaterial

router = APIRouter(prefix="/search", tags=["البحث"])


@router.get("")
async def global_search(
    q: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    results = []

    # Search courses
    courses_result = await db.execute(
        select(Course).where(
            or_(
                Course.name_ar.ilike(f"%{q}%"),
                Course.name.ilike(f"%{q}%"),
                Course.code.ilike(f"%{q}%"),
                Course.description_ar.ilike(f"%{q}%"),
            )
        ).limit(5)
    )
    for c in courses_result.scalars().all():
        results.append({
            "type": "course",
            "id": c.id,
            "title": c.name_ar or c.name,
            "subtitle": c.code,
            "icon": "📚",
            "url": f"/student/courses",
        })

    # Search lectures
    lectures_result = await db.execute(
        select(Lecture).where(
            or_(
                Lecture.title_ar.ilike(f"%{q}%"),
                Lecture.title.ilike(f"%{q}%"),
                Lecture.content.ilike(f"%{q}%"),
            ),
            Lecture.is_published == True,
        ).limit(5)
    )
    for l in lectures_result.scalars().all():
        results.append({
            "type": "lecture",
            "id": l.id,
            "title": l.title_ar or l.title,
            "subtitle": "محاضرة",
            "icon": "🎓",
            "url": f"/student/lecture/{l.id}",
        })

    # Search materials
    mat_result = await db.execute(
        select(StudyMaterial).where(
            or_(
                StudyMaterial.title.ilike(f"%{q}%"),
                StudyMaterial.description.ilike(f"%{q}%"),
            )
        ).limit(3)
    )
    for m in mat_result.scalars().all():
        results.append({
            "type": "material",
            "id": m.id,
            "title": m.title,
            "subtitle": m.material_type.value,
            "icon": "📄",
            "url": f"/student/courses",
        })

    # Search programs
    prog_result = await db.execute(
        select(Program).where(
            or_(
                Program.name_ar.ilike(f"%{q}%"),
                Program.name.ilike(f"%{q}%"),
            )
        ).limit(3)
    )
    for p in prog_result.scalars().all():
        results.append({
            "type": "program",
            "id": p.id,
            "title": p.name_ar or p.name,
            "subtitle": "تخصص",
            "icon": "🎯",
            "url": f"/academic/plans",
        })

    return {"results": results, "total": len(results), "query": q}
