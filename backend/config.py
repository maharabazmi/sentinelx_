import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://user:password@localhost:5432/sentinelx_db?schema=public"
    )
    # Convert standard postgresql:// to postgresql+psycopg2:// for SQLAlchemy if needed
    clean_db_url = DATABASE_URL
    if "schema=" in clean_db_url:
        clean_db_url = clean_db_url.split("?schema=")[0].split("&schema=")[0]
    if clean_db_url.startswith("postgresql://"):
        SQLALCHEMY_DATABASE_URI = clean_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    else:
        SQLALCHEMY_DATABASE_URI = clean_db_url

    JWT_SECRET = os.getenv("JWT_SECRET", "sentinelx-bangladesh-national-security-token-secret-2026")
    JWT_EXPIRATION_HOURS = 24
    ADMIN_CLEARANCE_KEY = os.getenv("ADMIN_CLEARANCE_KEY", "HQ-BANGLADESH-SECURITY-2026")

    PORICHOY_API_KEY = os.getenv("PORICHOY_API_KEY", "")
    PORICHOY_BASE_URL = os.getenv("PORICHOY_BASE_URL", "https://api.porichoybd.com/api/v2/verifications")
    PORICHOY_API_ENDPOINT = os.getenv("PORICHOY_API_ENDPOINT", "https://api.porichoy.bd/v2/verifications/autofill")

    PORT = int(os.getenv("FLASK_PORT", os.getenv("PORT", "5000")))
    HOST = os.getenv("FLASK_HOST", "0.0.0.0")
    DEBUG = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")

    # Email / SMTP Configuration (Gmail, Outlook, or Custom SMTP)
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", os.getenv("SMTP_USER", "no-reply@sentinelx.gov.bd"))
    SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "SentinelX National Command")
    SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "True").lower() in ("true", "1", "yes")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
