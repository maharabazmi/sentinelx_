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
    # Add user identity uniqueness constraints to databases created before they were declared on User.
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_nid_unique ON users (nidNumber)"))
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email_unique ON users (email)"))
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_phone_unique ON users (phone)"))
            conn.commit()
    except Exception as e:
        logger.warning(f"[DB] User identity uniqueness index migration skipped: {e}")

    # Resilient schema migration: ensure assignedOfficerId and assignedStation columns exist
    for col_name, col_sql in [
        ("investigationSummary", "TEXT"),
        ("finalFinding", "TEXT"),
        ("rewardAmount", "FLOAT"),
        ("workflowQueue", "VARCHAR(32) DEFAULT 'INTAKE'"),
    ]:
        try:
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE consumer_complaints ADD COLUMN {col_name} {col_sql}"))
                conn.commit()
        except Exception:
            pass

    # Assigned consumer-rights district belongs to officers, not complaint records.
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN assignedDistrict VARCHAR(64)"))
            conn.commit()
            logger.info("[DB] Added assignedDistrict column to users table.")
    except Exception:
        pass

    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE crime_reports ADD COLUMN assignedOfficerId VARCHAR(64)"))
            conn.commit()
            logger.info("[DB] Added assignedOfficerId column to crime_reports table.")
    except Exception:
        pass

    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE crime_reports ADD COLUMN workflowQueue VARCHAR(32) DEFAULT 'INTAKE'"))
            conn.commit()
            logger.info("[DB] Added workflowQueue column to crime_reports table.")
    except Exception:
        pass

    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE consumer_complaints ADD COLUMN assignedOfficerId VARCHAR(64)"))
            conn.commit()
            logger.info("[DB] Added assignedOfficerId column to consumer_complaints table.")
    except Exception:
        pass

    # Resilient schema migration: ensure user email verification and password change columns exist
    for col_name, col_sql in [
        ("isEmailVerified", "BOOLEAN DEFAULT 0"),
        ("mustChangePassword", "BOOLEAN DEFAULT 0"),
        ("emailVerificationCode", "VARCHAR(64)"),
        ("emailVerificationExpiresAt", "VARCHAR(64)")
    ]:
        try:
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_sql}"))
                conn.commit()
                logger.info(f"[DB] Added {col_name} column to users table.")
        except Exception:
            pass

    # Resilient schema migration: ensure case_messages attachment columns exist
    for col_name, col_sql in [
        ("attachmentUrl", "TEXT"),
        ("attachmentName", "VARCHAR(256)"),
        ("attachmentType", "VARCHAR(64)")
    ]:
        try:
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE case_messages ADD COLUMN {col_name} {col_sql}"))
                conn.commit()
                logger.info(f"[DB] Added {col_name} column to case_messages table.")
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
            # Ensure newly added seed police officers, users, and incoming consumer complaints exist
            records = get_seed_records()
            added_count = 0
            for u in records.get("users", []):
                existing_user = db.query(User).filter(User.id == u.id).first()
                if not existing_user:
                    db.merge(u)
                    added_count += 1
                elif u.role == "CONSUMER_RIGHTS" and (not existing_user.assignedDistrict or existing_user.designation != u.designation):
                    existing_user.designation = u.designation
                    existing_user.assignedDistrict = getattr(u, "assignedDistrict", None) or "Dhaka"
                    existing_user.department = u.department
                    added_count += 1
            for c in records.get("complaints", []):
                db.merge(c)
                added_count += 1
            if added_count > 0:
                db.commit()
                logger.info(f"[DB] Synced {added_count} newly added seed users/officers/complaints into database.")
            else:
                logger.info(f"Database already populated ({user_count} users found).")

        try:
            from .services.jurisdiction_service import JurisdictionService, extract_thana_keyword
            from .models import SOSRequest

            # Auto-sync/correct existing SOS records
            all_sos = db.query(SOSRequest).all()
            sos_updated = 0
            for s in all_sos:
                corrected_station = JurisdictionService.determine_sos_station(
                    db,
                    location_name=s.locationName,
                    latitude=s.latitude or 0.0,
                    longitude=s.longitude or 0.0
                )
                if not s.assignedStation or ("dhanmondi" in (s.locationName or "").lower() and "dhanmondi" not in (s.assignedStation or "").lower()):
                    s.assignedStation = corrected_station
                    st_kw = extract_thana_keyword(corrected_station)
                    s.assignedUnit = f"Awaiting Dispatch ({st_kw} Station)"
                    sos_updated += 1
            if sos_updated > 0:
                db.commit()
                logger.info(f"[DB] Auto-corrected station routing for {sos_updated} SOS records.")
        except Exception as e:
            logger.warning(f"[DB] Auto-sync skipped: {e}")
