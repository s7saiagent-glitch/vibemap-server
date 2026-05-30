from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta
from app.core.database import get_db
from app.core.deps import get_current_student
from app.models.user import User, StudentProfile
from app.models.engagement import StudentPoints, StudentBadge, LectureProgress
from app.models.assessment import StudentSubmission
from app.models.enrollment import Enrollment, EnrollmentStatus

router = APIRouter(prefix="/gamification", tags=["التلعيب"])

BADGES = {
    "first_lecture": {"name": "أول خطوة", "icon": "🎯", "desc": "أكملت أول محاضرة"},
    "first_quiz": {"name": "مختبر", "icon": "📝", "desc": "أجريت أول اختبار"},
    "perfect_score": {"name": "متفوق", "icon": "⭐", "desc": "حصلت على 100% في اختبار"},
    "streak_3": {"name": "مثابر", "icon": "🔥", "desc": "درست 3 أيام متتالية"},
    "streak_7": {"name": "أسبوع نشاط", "icon": "💪", "desc": "درست 7 أيام متتالية"},
    "five_lectures": {"name": "متعلم نشيط", "icon": "📚", "desc": "أكملت 5 محاضرات"},
    "course_complete": {"name": "متخرج", "icon": "🎓", "desc": "أكملت مادة دراسية"},
    "top_student": {"name": "الأفضل", "icon": "🏆", "desc": "من أفضل 10 طلاب"},
}


@router.get("/me")
async def get_my_gamification(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    # Total points
    pts_result = await db.execute(
        select(func.sum(StudentPoints.points)).where(StudentPoints.student_id == current_user.id)
    )
    total_points = int(pts_result.scalar_one() or 0)

    # Badges earned
    badges_result = await db.execute(
        select(StudentBadge).where(StudentBadge.student_id == current_user.id)
    )
    earned_badges = badges_result.scalars().all()
    earned_keys = {b.badge_key for b in earned_badges}

    # Points breakdown
    pts_log = await db.execute(
        select(StudentPoints)
        .where(StudentPoints.student_id == current_user.id)
        .order_by(StudentPoints.id.desc())
        .limit(10)
    )
    recent_points = pts_log.scalars().all()

    # Level calculation
    level = 1 + total_points // 100
    level_progress = total_points % 100

    # Completed lectures count
    lec_result = await db.execute(
        select(func.count(LectureProgress.id)).where(
            LectureProgress.student_id == current_user.id,
            LectureProgress.completed == True,
        )
    )
    completed_lectures = lec_result.scalar_one() or 0

    # Submissions count
    sub_result = await db.execute(
        select(func.count(StudentSubmission.id)).where(
            StudentSubmission.student_id == current_user.id,
            StudentSubmission.is_graded == True,
        )
    )
    total_submissions = sub_result.scalar_one() or 0

    # Check and award new badges
    new_badges = []
    if completed_lectures >= 1 and "first_lecture" not in earned_keys:
        new_badges.append("first_lecture")
    if total_submissions >= 1 and "first_quiz" not in earned_keys:
        new_badges.append("first_quiz")
    if completed_lectures >= 5 and "five_lectures" not in earned_keys:
        new_badges.append("five_lectures")

    for badge_key in new_badges:
        badge_info = BADGES[badge_key]
        db.add(StudentBadge(
            student_id=current_user.id,
            badge_key=badge_key,
            badge_name=badge_info["name"],
            badge_icon=badge_info["icon"],
            description=badge_info["desc"],
        ))
        db.add(StudentPoints(
            student_id=current_user.id,
            points=25,
            reason=f"حصلت على شارة: {badge_info['name']}",
            category="badge",
        ))
        earned_keys.add(badge_key)
        total_points += 25

    if new_badges:
        await db.commit()

    all_badges = []
    for key, info in BADGES.items():
        all_badges.append({
            "key": key,
            "name": info["name"],
            "icon": info["icon"],
            "description": info["desc"],
            "earned": key in earned_keys,
        })

    return {
        "total_points": total_points,
        "level": level,
        "level_name": ["مبتدئ", "متعلم", "نشيط", "متقدم", "خبير", "أستاذ"][min(level - 1, 5)],
        "level_progress": level_progress,
        "completed_lectures": completed_lectures,
        "total_submissions": total_submissions,
        "badges": all_badges,
        "earned_badges_count": len(earned_keys),
        "recent_points": [
            {"points": p.points, "reason": p.reason, "category": p.category}
            for p in recent_points
        ],
        "new_badges": [BADGES[k] for k in new_badges],
    }


@router.post("/award-points")
async def award_points(
    points: int,
    reason: str,
    category: str = "general",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    db.add(StudentPoints(
        student_id=current_user.id,
        points=points,
        reason=reason,
        category=category,
    ))
    await db.commit()
    return {"message": "تم منح النقاط", "points": points}
