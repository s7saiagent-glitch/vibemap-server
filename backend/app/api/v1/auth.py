from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
from typing import Optional
import httpx
from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token, decode_token
)
from app.core.deps import get_current_active_user
from app.core.config import settings
from app.models.user import User, UserRole, StudentProfile, RefreshToken
from app.schemas.user import (
    UserCreate, LoginRequest, TokenResponse, UserResponse,
    RefreshTokenRequest, UserUpdate, PasswordChangeRequest
)
from app.services.academic_service import generate_student_id
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["المصادقة"])


class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == user_data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="البريد الإلكتروني مسجل مسبقاً",
        )

    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=UserRole.STUDENT,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        first_name_ar=user_data.first_name_ar,
        last_name_ar=user_data.last_name_ar,
        phone=user_data.phone,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    await db.flush()

    student_id = await generate_student_id(db)
    student_profile = StudentProfile(
        user_id=user.id,
        student_id=student_id,
        program_id=user_data.program_id,
        admission_date=datetime.now(timezone.utc),
        enrollment_status="active",
        academic_standing="good",
    )
    db.add(student_profile)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(user.id, user.role.value)
    refresh_token_str = create_refresh_token(user.id)

    refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_token)
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="البريد الإلكتروني أو كلمة المرور غير صحيحة",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="الحساب موقوف")

    user.last_login = datetime.now(timezone.utc)

    access_token = create_access_token(user.id, user.role.value)
    refresh_token_str = create_refresh_token(user.id)

    refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token_str,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_token)
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=dict)
async def refresh_token(request: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(request.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="رمز التحديث غير صالح")

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == request.refresh_token,
            RefreshToken.is_revoked == False,
        )
    )
    stored_token = result.scalar_one_or_none()
    if not stored_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="رمز التحديث منتهي أو ملغي")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="المستخدم غير نشط")

    new_access_token = create_access_token(user.id, user.role.value)

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/logout")
async def logout(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token == request.refresh_token,
            RefreshToken.user_id == current_user.id,
        )
    )
    token = result.scalar_one_or_none()
    if token:
        token.is_revoked = True
        await db.commit()
    return {"message": "تم تسجيل الخروج بنجاح"}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_active_user)):
    data = UserResponse.model_validate(current_user).model_dump()
    if current_user.student_profile and current_user.student_profile.program:
        prog = current_user.student_profile.program
        data["program_name"] = prog.name_ar or prog.name
        data["program_id"] = prog.id
        data["student_id"] = current_user.student_profile.student_id
    return data


@router.put("/me", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    for field, value in update_data.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/google")
async def google_auth(request: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
    client_secret = getattr(settings, "GOOGLE_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail="Google OAuth غير مفعّل - يرجى إضافة GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET")

    async with httpx.AsyncClient() as client:
        token_resp = await client.post("https://oauth2.googleapis.com/token", data={
            "code": request.code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": request.redirect_uri,
            "grant_type": "authorization_code",
        })
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="فشل التحقق من رمز Google")
        tokens = token_resp.json()

        user_resp = await client.get("https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"})
        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="فشل جلب بيانات المستخدم من Google")
        google_user = user_resp.json()

    email = google_user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="لم يتم الحصول على البريد الإلكتروني من Google")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=email,
            password_hash=get_password_hash(f"google_{email}_oauth"),
            role=UserRole.STUDENT,
            first_name=google_user.get("given_name", ""),
            last_name=google_user.get("family_name", ""),
            first_name_ar=google_user.get("given_name", ""),
            last_name_ar=google_user.get("family_name", ""),
            avatar_url=google_user.get("picture"),
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
        student_id = await generate_student_id(db)
        profile = StudentProfile(
            user_id=user.id, student_id=student_id,
            admission_date=datetime.now(timezone.utc),
            enrollment_status="active", academic_standing="good",
        )
        db.add(profile)
        await db.commit()
        await db.refresh(user)
    else:
        if google_user.get("picture") and not user.avatar_url:
            user.avatar_url = google_user.get("picture")
            await db.commit()

    access_token = create_access_token(user.id, user.role.value)
    refresh_token_str = create_refresh_token(user.id)
    refresh_token = RefreshToken(
        user_id=user.id, token=refresh_token_str,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(refresh_token)
    await db.commit()

    return TokenResponse(
        access_token=access_token, refresh_token=refresh_token_str,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/change-password")
async def change_password(
    request: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="كلمة المرور الحالية غير صحيحة")

    current_user.password_hash = get_password_hash(request.new_password)
    await db.commit()
    return {"message": "تم تغيير كلمة المرور بنجاح"}
