from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class PaymentRecord(Base):
    __tablename__ = "payment_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    stripe_payment_intent_id = Column(String(200), unique=True, nullable=True)
    stripe_session_id = Column(String(200), nullable=True)
    amount_usd = Column(Float, nullable=False)
    currency = Column(String(10), default="usd")
    product_type = Column(String(50), nullable=False)  # english_level, exam, registration, bundle, diploma, bachelor
    product_id = Column(String(100), nullable=True)    # e.g. "B1", "CS101", "semester_1"
    status = Column(String(20), default="pending")     # pending, completed, failed, refunded
    promo_code_used = Column(String(50), nullable=True)
    discount_percent = Column(Integer, default=0)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)


class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    discount_percent = Column(Integer, nullable=False)   # 10, 20, 30, 50, 100
    max_uses = Column(Integer, default=100)
    current_uses = Column(Integer, default=0)
    valid_from = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    valid_until = Column(DateTime(timezone=True), nullable=True)
    product_types = Column(JSON, default=list)  # [] means all products
    is_active = Column(Boolean, default=True)
    description = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class UserEntitlement(Base):
    __tablename__ = "user_entitlements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_type = Column(String(50), nullable=False)
    product_id = Column(String(100), nullable=False)   # "B1", "CS101-exam", "registration"
    payment_id = Column(Integer, ForeignKey("payment_records.id"), nullable=True)
    granted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
