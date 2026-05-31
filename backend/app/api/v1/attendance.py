from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from datetime import datetime, timezone, date
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_admin
from app.models.user import User
from app.models.engagement import AttendanceRecord

router = APIRouter(prefix="/attendance", tags=["الحضور"])


@router.get("/my-attendance")
async def get_my_attendance(
    section_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance records for the current student."""
    query = select(AttendanceRecord).where(AttendanceRecord.student_id == current_user.id)
    if section_id:
        query = query.where(AttendanceRecord.section_id == section_id)
    query = query.order_by(AttendanceRecord.date.desc())

    result = await db.execute(query)
    records = result.scalars().all()

    # Calculate stats
    total = len(records)
    present = sum(1 for r in records if r.status == "present")
    absent = sum(1 for r in records if r.status == "absent")
    late = sum(1 for r in records if r.status == "late")
    attendance_pct = round((present / total * 100) if total > 0 else 100.0, 1)

    return {
        "records": [
            {
                "id": r.id,
                "section_id": r.section_id,
                "date": r.date.isoformat() if r.date else None,
                "status": r.status,
                "notes": r.notes,
            }
            for r in records
        ],
        "stats": {
            "total": total,
            "present": present,
            "absent": absent,
            "late": late,
            "attendance_percentage": attendance_pct,
            "at_risk": attendance_pct < 75,
        },
    }


@router.post("/record")
async def record_attendance(
    section_id: int = Query(...),
    student_id: int = Query(...),
    status: str = Query("present"),
    notes: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Record attendance for a student (admin only)."""
    record = AttendanceRecord(
        student_id=student_id,
        section_id=section_id,
        status=status,
        notes=notes,
        recorded_by=current_admin.id,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return {"message": "تم تسجيل الحضور", "id": record.id}


@router.get("/section/{section_id}")
async def get_section_attendance(
    section_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """Get all attendance records for a section (admin)."""
    result = await db.execute(
        select(AttendanceRecord).where(AttendanceRecord.section_id == section_id)
        .order_by(AttendanceRecord.date.desc())
    )
    records = result.scalars().all()

    # Group by student
    by_student: dict = {}
    for r in records:
        sid = r.student_id
        if sid not in by_student:
            by_student[sid] = {"student_id": sid, "present": 0, "absent": 0, "late": 0, "records": []}
        by_student[sid][r.status if r.status in ("present", "absent", "late") else "present"] += 1
        by_student[sid]["records"].append({
            "date": r.date.isoformat() if r.date else None,
            "status": r.status,
        })

    return {"section_id": section_id, "students": list(by_student.values())}
