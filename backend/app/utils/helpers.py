from datetime import datetime, timezone


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def format_gpa(gpa: float) -> str:
    return f"{gpa:.2f}"


def paginate(query, page: int, per_page: int):
    return query.offset((page - 1) * per_page).limit(per_page)
