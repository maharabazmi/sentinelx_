import logging
from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from .config import Config
from .models import Base, User
from .seed_data import get_seed_records

logger = logging.getLogger("sentinelx.database")
logging.basicConfig(level=logging.INFO)

def create_database_engine():
    pg_uri = Config.SQLALCHEMY_DATABASE_URI
    try:
        # Test connecting to PostgreSQL with short connection timeout
        test_engine = create_engine(
            pg_uri,
            connect_args={"connect_timeout": 3},
            pool_pre_ping=True
        )
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"[DB] Connected to PostgreSQL database at {pg_uri.split('@')[-1]}")
        return test_engine, "POSTGRESQL"
    except Exception as e:
        logger.warning(
            f"[DB] PostgreSQL not reachable ({type(e).__name__}: {e}). "
            f"Falling back to local SQLite engine (sqlite:///sentinelx.db) so development runs seamlessly."
        )
        sqlite_uri = "sqlite:///sentinelx.db"
        sqlite_engine = create_engine(
            sqlite_uri,
            connect_args={"check_same_thread": False},
            pool_pre_ping=True
        )
        return sqlite_engine, "SQLITE_FALLBACK"

engine, DB_ENGINE_TYPE = create_database_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)

@contextmanager
def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    # Resilient schema migration: ensure assignedOfficerId and assignedStation columns exist
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE crime_reports ADD COLUMN assignedOfficerId VARCHAR(64)"))
            conn.commit()
            logger.info("[DB] Added assignedOfficerId column to crime_reports table.")
    except Exception:
        pass

    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE sos_requests ADD COLUMN assignedStation VARCHAR(128)"))
            conn.commit()
            logger.info("[DB] Added assignedStation column to sos_requests table.")
    except Exception:
        pass

    with get_db() as db:
        user_count = db.query(User).count()
        if user_count == 0:
            logger.info("[DB] Seeding initial database records...")
            records = get_seed_records()
            for key, items in records.items():
                for item in items:
                    db.merge(item)
            db.commit()
            logger.info("[DB] Database seeded successfully with initial users, crime reports, alerts, and BSTI catalog.")
        else:
            logger.info(f"Database already populated ({user_count} users found).")

        # Auto-sync any unassigned reports to stationed officers
        try:
            from .services.jurisdiction_service import JurisdictionService
            synced_count = JurisdictionService.auto_sync_all_unassigned_reports(db)
            if synced_count > 0:
                logger.info(f"[DB] Auto-routed {synced_count} pending cases to stationed police officers.")
        except Exception as e:
            logger.warning(f"[DB] Auto-sync skipped: {e}")
