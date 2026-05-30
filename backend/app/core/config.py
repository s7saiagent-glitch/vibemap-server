from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "جامعة مملكة الأرض الافتراضية"
    APP_NAME_EN: str = "Virtual Earth Kingdom University"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/university_db"
    DATABASE_URL_SYNC: str = "postgresql://postgres:password@localhost:5432/university_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str = "your-super-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # AI Providers
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    DEFAULT_AI_MODEL: str = "claude-sonnet-4-6"
    DEFAULT_AI_PROVIDER: str = "anthropic"

    # Vector DB
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: Optional[str] = None

    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_BUCKET_NAME: str = "university-content"
    AWS_REGION: str = "us-east-1"

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    # Payments
    STRIPE_SECRET_KEY: Optional[str] = None

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:3001"]

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Academic
    GPA_SCALE: float = 4.0
    PASSING_GRADE: float = 60.0
    MAX_CREDIT_HOURS_PER_SEMESTER: int = 21

    model_config = {"env_file": ".env", "case_sensitive": True, "extra": "ignore"}


settings = Settings()
