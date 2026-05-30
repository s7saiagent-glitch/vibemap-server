from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from app.core.database import get_db
from app.core.deps import get_current_student
from app.models.user import User
from app.models.engagement import ForumPost, ForumReply

router = APIRouter(prefix="/forum", tags=["المنتدى"])


class PostCreate(BaseModel):
    title: str
    content: str


class ReplyCreate(BaseModel):
    content: str


@router.get("/section/{section_id}")
async def get_forum_posts(
    section_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    result = await db.execute(
        select(ForumPost)
        .where(ForumPost.section_id == section_id)
        .options(selectinload(ForumPost.replies))
        .order_by(ForumPost.is_pinned.desc(), ForumPost.id.desc())
    )
    posts = result.scalars().all()

    # Get author names
    posts_data = []
    for p in posts:
        author_result = await db.execute(select(User).where(User.id == p.student_id))
        author = author_result.scalar_one_or_none()
        posts_data.append({
            "id": p.id,
            "title": p.title,
            "content": p.content[:200],
            "upvotes": p.upvotes,
            "is_pinned": p.is_pinned,
            "is_answered": p.is_answered,
            "reply_count": len(p.replies),
            "author_name": (author.first_name_ar or author.first_name) if author else "طالب",
            "created_at": p.created_at.isoformat() if hasattr(p, 'created_at') and p.created_at else None,
        })

    return posts_data


@router.get("/post/{post_id}")
async def get_post_detail(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    result = await db.execute(
        select(ForumPost).where(ForumPost.id == post_id)
        .options(selectinload(ForumPost.replies))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="المنشور غير موجود")

    author_result = await db.execute(select(User).where(User.id == post.student_id))
    author = author_result.scalar_one_or_none()

    replies_data = []
    for r in post.replies:
        r_author = await db.execute(select(User).where(User.id == r.student_id))
        r_author = r_author.scalar_one_or_none()
        replies_data.append({
            "id": r.id,
            "content": r.content,
            "upvotes": r.upvotes,
            "is_ai_answer": r.is_ai_answer,
            "author_name": (r_author.first_name_ar or r_author.first_name) if r_author else "طالب",
            "created_at": r.created_at.isoformat() if hasattr(r, 'created_at') and r.created_at else None,
        })

    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "upvotes": post.upvotes,
        "is_pinned": post.is_pinned,
        "is_answered": post.is_answered,
        "author_name": (author.first_name_ar or author.first_name) if author else "طالب",
        "replies": replies_data,
        "section_id": post.section_id,
    }


@router.post("/section/{section_id}")
async def create_post(
    section_id: int,
    data: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    post = ForumPost(
        section_id=section_id,
        student_id=current_user.id,
        title=data.title,
        content=data.content,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return {"id": post.id, "title": post.title, "message": "تم نشر السؤال بنجاح"}


@router.post("/post/{post_id}/reply")
async def add_reply(
    post_id: int,
    data: ReplyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    post_result = await db.execute(select(ForumPost).where(ForumPost.id == post_id))
    if not post_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="المنشور غير موجود")

    reply = ForumReply(
        post_id=post_id,
        student_id=current_user.id,
        content=data.content,
    )
    db.add(reply)
    await db.commit()
    return {"message": "تم إضافة الرد"}


@router.post("/post/{post_id}/upvote")
async def upvote_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_student),
):
    result = await db.execute(select(ForumPost).where(ForumPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="المنشور غير موجود")
    post.upvotes = (post.upvotes or 0) + 1
    await db.commit()
    return {"upvotes": post.upvotes}
