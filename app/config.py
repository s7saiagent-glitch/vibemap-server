import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'change-me-in-production-please')
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL', f'sqlite:///{os.path.join(BASE_DIR, "instance", "sales.db")}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB

    BABEL_DEFAULT_LOCALE = 'ar'
    BABEL_DEFAULT_TIMEZONE = 'Asia/Riyadh'
    LANGUAGES = {'ar': 'العربية', 'en': 'English'}

    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', '')

    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
    WORKING_DAYS_PER_MONTH = int(os.environ.get('WORKING_DAYS_PER_MONTH', 26))
    PERFORMANCE_DROP_THRESHOLD = float(os.environ.get('PERFORMANCE_DROP_THRESHOLD', -10.0))
    TARGET_GREEN_THRESHOLD = float(os.environ.get('TARGET_GREEN_THRESHOLD', 100.0))
    TARGET_YELLOW_THRESHOLD = float(os.environ.get('TARGET_YELLOW_THRESHOLD', 80.0))

    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = 3600


class DevelopmentConfig(Config):
    DEBUG = True
    WTF_CSRF_ENABLED = False


class ProductionConfig(Config):
    DEBUG = False


config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig,
}
