from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.core.deps import get_current_active_user, get_current_admin
from app.models.user import User
from app.models.payment import PaymentRecord, PromoCode, UserEntitlement
from app.core.config import settings

router = APIRouter(prefix="/payments", tags=["المدفوعات"])

# ── Pricing table ──────────────────────────────────────────────
PRICES = {
    "registration":   {"usd": 20,  "label": "رسوم التسجيل الجامعي"},
    "english_B1":     {"usd": 29,  "label": "اللغة الإنجليزية - مستوى B1"},
    "english_B2":     {"usd": 29,  "label": "اللغة الإنجليزية - مستوى B2"},
    "english_C1":     {"usd": 29,  "label": "اللغة الإنجليزية - مستوى C1"},
    "english_C2":     {"usd": 29,  "label": "اللغة الإنجليزية - مستوى C2"},
    "english_bundle": {"usd": 99,  "label": "باقة الإنجليزي الكاملة (B1-C2)"},
    "exam":           {"usd": 15,  "label": "اختبار المادة"},
    "semester_bundle":{"usd": 50,  "label": "باقة الفصل الدراسي (5 مواد)"},
    "diploma":        {"usd": 199, "label": "شهادة الدبلوم"},
    "bachelor":       {"usd": 499, "label": "شهادة البكالوريوس"},
}

FREE_ENGLISH_LEVELS = {"A1", "A2"}


async def has_entitlement(db: AsyncSession, user_id: int, product_type: str, product_id: str) -> bool:
    result = await db.execute(
        select(UserEntitlement).where(
            and_(
                UserEntitlement.user_id == user_id,
                UserEntitlement.product_type == product_type,
                UserEntitlement.product_id == product_id,
                UserEntitlement.is_active == True,
            )
        )
    )
    return result.scalar_one_or_none() is not None


class CheckAccessRequest(BaseModel):
    product_type: str
    product_id: str


class CreatePaymentRequest(BaseModel):
    product_key: str        # key from PRICES dict, e.g. "english_B1" or "exam"
    product_id: str         # specific id, e.g. "B1" or "CS101"
    promo_code: Optional[str] = None
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class ValidatePromoRequest(BaseModel):
    code: str
    product_key: str


@router.get("/prices")
async def get_prices():
    return {"prices": PRICES, "free_english_levels": list(FREE_ENGLISH_LEVELS)}


@router.post("/check-access")
async def check_access(
    req: CheckAccessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # English A1/A2 always free
    if req.product_type == "english_level" and req.product_id in FREE_ENGLISH_LEVELS:
        return {"has_access": True, "reason": "free"}

    # Admins have access to everything
    if current_user.role.value in ("admin", "superadmin"):
        return {"has_access": True, "reason": "admin"}

    has = await has_entitlement(db, current_user.id, req.product_type, req.product_id)
    return {"has_access": has, "reason": "purchased" if has else "not_purchased"}


@router.post("/validate-promo")
async def validate_promo(
    req: ValidatePromoRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(PromoCode).where(
            PromoCode.code == req.code.upper(),
            PromoCode.is_active == True,
        )
    )
    promo = result.scalar_one_or_none()
    if not promo:
        raise HTTPException(status_code=404, detail="الكوبون غير صالح")
    if promo.current_uses >= promo.max_uses:
        raise HTTPException(status_code=400, detail="تم استنفاد هذا الكوبون")
    if promo.valid_until and promo.valid_until < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="انتهت صلاحية الكوبون")
    if promo.product_types and req.product_key not in promo.product_types:
        raise HTTPException(status_code=400, detail="هذا الكوبون لا ينطبق على هذا المنتج")
    return {"discount_percent": promo.discount_percent, "description": promo.description}


@router.post("/create-session")
async def create_payment_session(
    req: CreatePaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    if req.product_key not in PRICES:
        raise HTTPException(status_code=400, detail="منتج غير موجود")

    price_info = PRICES[req.product_key]
    amount = price_info["usd"]
    discount = 0

    # Apply promo code
    if req.promo_code:
        result = await db.execute(
            select(PromoCode).where(
                PromoCode.code == req.promo_code.upper(),
                PromoCode.is_active == True,
            )
        )
        promo = result.scalar_one_or_none()
        if promo and promo.current_uses < promo.max_uses:
            discount = promo.discount_percent
            amount = round(amount * (1 - discount / 100), 2)

    stripe_key = getattr(settings, "STRIPE_SECRET_KEY", None)

    # If Stripe is configured, create real session
    if stripe_key:
        try:
            import stripe
            stripe.api_key = stripe_key
            success_url = req.success_url or "https://s7sai.cloud/payment/success?session_id={CHECKOUT_SESSION_ID}"
            cancel_url = req.cancel_url or "https://s7sai.cloud/payment/cancel"

            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": "usd",
                        "product_data": {"name": price_info["label"]},
                        "unit_amount": int(amount * 100),
                    },
                    "quantity": 1,
                }],
                mode="payment",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "user_id": str(current_user.id),
                    "product_key": req.product_key,
                    "product_id": req.product_id,
                    "promo_code": req.promo_code or "",
                },
            )

            # Record payment
            payment = PaymentRecord(
                user_id=current_user.id,
                stripe_session_id=session.id,
                amount_usd=amount,
                product_type=req.product_key,
                product_id=req.product_id,
                status="pending",
                promo_code_used=req.promo_code,
                discount_percent=discount,
            )
            db.add(payment)
            await db.commit()

            return {"checkout_url": session.url, "session_id": session.id, "amount": amount}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"خطأ في بوابة الدفع: {str(e)}")

    # Demo mode: grant access directly (no Stripe configured)
    payment = PaymentRecord(
        user_id=current_user.id,
        amount_usd=amount,
        product_type=req.product_key,
        product_id=req.product_id,
        status="completed",
        promo_code_used=req.promo_code,
        discount_percent=discount,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(payment)
    await db.flush()

    entitlement = UserEntitlement(
        user_id=current_user.id,
        product_type=req.product_key,
        product_id=req.product_id,
        payment_id=payment.id,
    )
    db.add(entitlement)

    if req.promo_code:
        result = await db.execute(select(PromoCode).where(PromoCode.code == req.promo_code.upper()))
        promo = result.scalar_one_or_none()
        if promo:
            promo.current_uses += 1

    await db.commit()
    return {"checkout_url": None, "demo_mode": True, "access_granted": True, "amount": amount}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    stripe_key = getattr(settings, "STRIPE_SECRET_KEY", None)
    webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", None)
    if not stripe_key:
        return {"status": "ignored"}

    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        import stripe
        stripe.api_key = stripe_key
        if webhook_secret:
            event = stripe.Webhook.construct_event(payload, sig, webhook_secret)
        else:
            event = stripe.Event.construct_from({"data": {"object": {}}, "type": "checkout.session.completed"}, stripe_key)
    except Exception:
        raise HTTPException(status_code=400, detail="Webhook signature invalid")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.get("metadata", {})
        user_id = int(metadata.get("user_id", 0))
        product_key = metadata.get("product_key", "")
        product_id = metadata.get("product_id", "")
        session_id = session.get("id", "")

        # Mark payment complete
        result = await db.execute(
            select(PaymentRecord).where(PaymentRecord.stripe_session_id == session_id)
        )
        payment = result.scalar_one_or_none()
        if payment:
            payment.status = "completed"
            payment.completed_at = datetime.now(timezone.utc)
            payment.stripe_payment_intent_id = session.get("payment_intent", "")

        # Grant entitlement
        if user_id and product_key and product_id:
            existing = await db.execute(
                select(UserEntitlement).where(
                    UserEntitlement.user_id == user_id,
                    UserEntitlement.product_type == product_key,
                    UserEntitlement.product_id == product_id,
                )
            )
            if not existing.scalar_one_or_none():
                entitlement = UserEntitlement(
                    user_id=user_id,
                    product_type=product_key,
                    product_id=product_id,
                    payment_id=payment.id if payment else None,
                )
                db.add(entitlement)

        await db.commit()

    return {"status": "ok"}


@router.get("/my-payments")
async def get_my_payments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    result = await db.execute(
        select(PaymentRecord).where(
            PaymentRecord.user_id == current_user.id,
            PaymentRecord.status == "completed",
        ).order_by(PaymentRecord.created_at.desc())
    )
    payments = result.scalars().all()
    return [
        {
            "id": p.id,
            "product": PRICES.get(p.product_type, {}).get("label", p.product_type),
            "amount": p.amount_usd,
            "discount": p.discount_percent,
            "date": p.created_at.strftime("%Y/%m/%d"),
            "status": p.status,
        }
        for p in payments
    ]


# Admin endpoints
@router.post("/admin/promo-codes")
async def create_promo_code(
    code: str,
    discount_percent: int,
    max_uses: int = 100,
    description: str = "",
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    existing = await db.execute(select(PromoCode).where(PromoCode.code == code.upper()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="الكوبون موجود مسبقاً")
    promo = PromoCode(
        code=code.upper(),
        discount_percent=discount_percent,
        max_uses=max_uses,
        description=description,
    )
    db.add(promo)
    await db.commit()
    return {"message": "تم إنشاء الكوبون", "code": code.upper()}


@router.get("/admin/promo-codes")
async def list_promo_codes(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    result = await db.execute(select(PromoCode).order_by(PromoCode.created_at.desc()))
    promos = result.scalars().all()
    return [
        {
            "code": p.code,
            "discount": p.discount_percent,
            "uses": f"{p.current_uses}/{p.max_uses}",
            "active": p.is_active,
            "description": p.description,
        }
        for p in promos
    ]

@router.get("/admin/revenue")
async def get_revenue_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    from sqlalchemy import func
    result = await db.execute(
        select(
            func.sum(PaymentRecord.amount_usd),
            func.count(PaymentRecord.id),
        ).where(PaymentRecord.status == "completed")
    )
    row = result.one()
    total_revenue = row[0] or 0
    total_transactions = row[1] or 0

    # By product type
    by_product = await db.execute(
        select(PaymentRecord.product_type, func.sum(PaymentRecord.amount_usd), func.count(PaymentRecord.id))
        .where(PaymentRecord.status == "completed")
        .group_by(PaymentRecord.product_type)
    )
    breakdown = [
        {"product": PRICES.get(r[0], {}).get("label", r[0]), "revenue": r[1] or 0, "count": r[2]}
        for r in by_product.all()
    ]

    return {
        "total_revenue_usd": round(total_revenue, 2),
        "total_transactions": total_transactions,
        "breakdown": breakdown,
    }
