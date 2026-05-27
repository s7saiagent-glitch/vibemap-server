from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.user import StudentProfile
from app.models.academic import Course


GRADE_SCALE = {
    (90, 100): ("A+", 4.0),
    (85, 89.9): ("A", 3.75),
    (80, 84.9): ("A-", 3.5),
    (75, 79.9): ("B+", 3.25),
    (70, 74.9): ("B", 3.0),
    (65, 69.9): ("B-", 2.75),
    (60, 64.9): ("C+", 2.5),
    (55, 59.9): ("C", 2.25),
    (50, 54.9): ("C-", 2.0),
    (45, 49.9): ("D+", 1.5),
    (40, 44.9): ("D", 1.0),
    (0, 39.9): ("F", 0.0),
}


def calculate_letter_grade(score: float) -> tuple[str, float]:
    for (min_score, max_score), (letter, points) in GRADE_SCALE.items():
        if min_score <= score <= max_score:
            return letter, points
    return "F", 0.0


def calculate_gpa(enrollments: list) -> float:
    completed = [
        e for e in enrollments
        if e.status == EnrollmentStatus.COMPLETED and e.gpa_points is not None
    ]
    if not completed:
        return 0.0

    total_points = 0.0
    total_credits = 0

    for enrollment in completed:
        credits = enrollment.section.course.credits if enrollment.section and enrollment.section.course else 3
        total_points += (enrollment.gpa_points or 0.0) * credits
        total_credits += credits

    if total_credits == 0:
        return 0.0

    return round(total_points / total_credits, 2)


def determine_academic_standing(gpa: float, credits: int) -> str:
    if credits < 30:
        return "good"
    if gpa >= 3.5:
        return "distinction"
    elif gpa >= 3.0:
        return "good"
    elif gpa >= 2.0:
        return "satisfactory"
    elif gpa >= 1.0:
        return "warning"
    else:
        return "probation"


async def update_student_gpa(student_profile: StudentProfile, db: AsyncSession) -> None:
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.student_id == student_profile.id
        )
    )
    enrollments = result.scalars().all()

    gpa = calculate_gpa(enrollments)
    completed_credits = sum(
        (e.section.course.credits if e.section and e.section.course else 3)
        for e in enrollments
        if e.status == EnrollmentStatus.COMPLETED
    )

    student_profile.cumulative_gpa = f"{gpa:.2f}"
    student_profile.total_credits_earned = completed_credits
    student_profile.academic_standing = determine_academic_standing(gpa, completed_credits)
    await db.flush()


async def generate_student_id(db: AsyncSession, year: int = None) -> str:
    year = year or datetime.now(timezone.utc).year
    result = await db.execute(
        select(func.count(StudentProfile.id))
    )
    count = result.scalar_one() + 1
    return f"STU-{year}-{count:04d}"
