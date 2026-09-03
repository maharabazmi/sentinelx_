import time
import uuid
import bcrypt
from flask import Blueprint, request, jsonify, g
from ..config import Config
from ..database import get_db
from ..models import User, utcnow_iso
from ..middleware.auth import generate_token, verify_auth, decode_token
from ..services.nid_service import MockNIDVerificationService, PorichoyNIDVerificationService
from ..services.audit_service import AuditService

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

mock_nid_service = MockNIDVerificationService()
porichoy_nid_service = PorichoyNIDVerificationService()

def check_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=8)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

# Step 1: Verify NID
@auth_bp.route("/verify-nid", methods=["POST"])
def verify_nid():
    data = request.get_json() or {}
    nid_number = data.get("nidNumber")
    dob = data.get("dob")
    use_porichoy_live = data.get("usePorichoyLive", False)

    if not nid_number or not dob:
        return jsonify({"error": "NID Number and Date of Birth are mandatory for identity verification."}), 400

    try:
        service = porichoy_nid_service if use_porichoy_live else mock_nid_service
        result = service.verify_nid(nid_number, dob)

        with get_db() as db:
            existing_user = db.query(User).filter(User.nidNumber == nid_number.strip()).first() is not None

        return jsonify({
            "success": True,
            "verification": result,
            "alreadyRegistered": existing_user
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e) or "NID Verification failed."}), 400

# Step 2: Citizen Registration
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    nid_number = data.get("nidNumber")
    password = data.get("password")
    full_name = data.get("fullName")
    phone = data.get("phone")
    email = data.get("email")
    thana = data.get("thana", "Sadar")
    district = data.get("district", "Dhaka")

    if not nid_number or not password or not full_name or not phone:
        return jsonify({"error": "Missing required registration fields."}), 400

    with get_db() as db:
        if db.query(User).filter(User.nidNumber == nid_number.strip()).first():
            return jsonify({"error": "An account is already linked to this Bangladesh National ID (NID)."}), 400

        user_email = email.strip().lower() if email else f"{nid_number}@citizen.sentinelx.bd"
        if db.query(User).filter(User.email == user_email).first():
            return jsonify({"error": "Email address is already in use."}), 400

        user_id = f"user-cit-{int(time.time() * 1000)}"
        new_user = User(
            id=user_id,
            nidNumber=nid_number.strip(),
            fullName=full_name.strip(),
            email=user_email,
            phone=phone.strip(),
            role="CITIZEN",
            isNIDVerified=True,
            stationOrThana=f"{thana}, {district}",
            passwordHash=hash_password(password),
            createdAt=utcnow_iso(),
        )
        db.add(new_user)
        db.commit()

        safe_user = new_user.to_dict()
        token = generate_token(new_user)

    AuditService.log(
        user_id=safe_user["id"],
        user_name=safe_user["fullName"],
        user_role=safe_user["role"],
        action="CITIZEN_REGISTRATION_VERIFIED",
        resource="USER_REGISTRY",
        resource_id=safe_user["id"],
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Citizen successfully verified with NID [{nid_number}] and created account.",
    )

    return jsonify({
        "success": True,
        "token": token,
        "user": safe_user
    }), 201

# Login
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    identifier = data.get("identifier", "").strip()
    password = data.get("password", "")

    if not identifier or not password:
        return jsonify({"error": "Please provide NID, Email, or Badge ID, and your Password."}), 400

    search_key = identifier.lower()

    with get_db() as db:
        user = db.query(User).filter(
            (User.nidNumber.ilike(search_key)) |
            (User.email.ilike(search_key)) |
            (User.badgeNumber.ilike(search_key)) |
            (User.phone == identifier)
        ).first()

        if not user:
            return jsonify({"error": "Invalid credentials. User not found."}), 401

        # High Security Policy: Appointed Admin accounts cannot authenticate via the public gateway
        if user.role == "ADMIN":
            AuditService.log(
                user_id=user.id,
                user_name=user.fullName,
                user_role=user.role,
                action="ADMIN_PUBLIC_LOGIN_BLOCKED",
                resource="AUTH",
                ip_address=request.remote_addr,
                status="DENIED",
                details="Attempted admin login via public civilian gateway. Blocked by security policy.",
            )
            return jsonify({
                "error": "Access Denied: Administrative accounts cannot authenticate via the public civilian gateway. Official Higher Authority Clearance required."
            }), 403

        if not check_password(password, user.passwordHash):
            AuditService.log(
                user_id=user.id,
                user_name=user.fullName,
                user_role=user.role,
                action="LOGIN_FAILED",
                resource="AUTH",
                ip_address=request.remote_addr,
                status="DENIED",
                details="Incorrect password provided.",
            )
            return jsonify({"error": "Invalid password. Please check your credentials."}), 401

        safe_user = user.to_dict()
        token = generate_token(user)

    AuditService.log(
        user_id=safe_user["id"],
        user_name=safe_user["fullName"],
        user_role=safe_user["role"],
        action="USER_LOGIN",
        resource="AUTH",
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"User logged in with role [{safe_user['role']}].",
    )

    return jsonify({
        "success": True,
        "token": token,
        "user": safe_user
    })

# Classified Higher Authority Admin Clearance
@auth_bp.route("/admin-clearance", methods=["POST"])
def admin_clearance():
    data = request.get_json() or {}
    clearance_key = data.get("clearanceKey", "").strip()
    identifier = data.get("identifier", "").strip()
    password = data.get("password", "")

    if not clearance_key or not identifier or not password:
        return jsonify({
            "error": "Authority Clearance Key, Appointee Identifier, and Password are all mandatory."
        }), 400

    # 1. Verify Higher Authority Clearance Key
    if clearance_key != Config.ADMIN_CLEARANCE_KEY:
        AuditService.log(
            user_id="UNKNOWN",
            user_name=identifier,
            user_role="ADMIN_PROBE",
            action="INVALID_CLEARANCE_KEY_ATTEMPT",
            resource="HQ_AUTH",
            ip_address=request.remote_addr,
            status="DENIED",
            details="Invalid Higher Authority Clearance Key submitted.",
        )
        return jsonify({
            "error": "Classified Clearance Failure: Invalid Higher Authority Clearance Key."
        }), 403

    search_key = identifier.lower()

    with get_db() as db:
        user = db.query(User).filter(
            (User.email.ilike(search_key)) |
            (User.nidNumber.ilike(search_key)) |
            (User.badgeNumber.ilike(search_key))
        ).first()

        if not user or user.role != "ADMIN":
            AuditService.log(
                user_id="UNKNOWN",
                user_name=identifier,
                user_role="ADMIN_PROBE",
                action="ADMIN_ACCOUNT_NOT_FOUND",
                resource="HQ_AUTH",
                ip_address=request.remote_addr,
                status="DENIED",
                details=f"Appointee identifier [{identifier}] not authorized for administrative appointment.",
            )
            return jsonify({"error": "Access Denied: Appointee record not found in central registry."}), 401

        if not check_password(password, user.passwordHash):
            AuditService.log(
                user_id=user.id,
                user_name=user.fullName,
                user_role=user.role,
                action="ADMIN_PASSWORD_MISMATCH",
                resource="HQ_AUTH",
                ip_address=request.remote_addr,
                status="DENIED",
                details="Incorrect secret password provided for administrator.",
            )
            return jsonify({"error": "Authentication Failed: Incorrect secret password."}), 401

        safe_user = user.to_dict()
        token = generate_token(user)

    AuditService.log(
        user_id=safe_user["id"],
        user_name=safe_user["fullName"],
        user_role=safe_user["role"],
        action="ADMIN_CLEARANCE_SESSION_ESTABLISHED",
        resource="HQ_AUTH",
        ip_address=request.remote_addr,
        status="SUCCESS",
        details="Executive high-privilege session established via classified clearance gateway.",
    )

    return jsonify({
        "success": True,
        "token": token,
        "user": safe_user
    })

# Current Profile
@auth_bp.route("/me", methods=["GET"])
@verify_auth
def get_me():
    return jsonify({
        "success": True,
        "user": g.user.to_dict()
    })

# Demo Role Switcher
@auth_bp.route("/demo-switch", methods=["POST"])
def demo_switch():
    data = request.get_json() or {}
    role = data.get("role")

    auth_header = request.headers.get("Authorization")
    current_user = None
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            decoded = decode_token(token)
            with get_db() as db:
                current_user = db.query(User).filter(User.id == decoded["id"]).first()
        except Exception:
            pass

    # Enforce security constraints
    if not current_user:
        if role != "CITIZEN":
            return jsonify({
                "error": "Access Denied: Public portal (guest) access is strictly restricted to Citizen Services only. Official credentials are required to access Police, Consumer Rights (DNCRP), or System Admin portals."
            }), 403
    else:
        if current_user.role == "CITIZEN" and role != "CITIZEN":
            AuditService.log(
                user_id=current_user.id,
                user_name=current_user.fullName,
                user_role=current_user.role,
                action="UNAUTHORIZED_ROLE_SWITCH_BLOCKED",
                resource="AUTH",
                ip_address=request.remote_addr,
                status="DENIED",
                details=f"Citizen [{current_user.fullName}] attempted unauthorized escalation to role [{role}]. Access restricted.",
            )
            return jsonify({
                "error": "Access Denied: Citizens are registered as citizens and cannot elevate or switch to law enforcement or authority roles."
            }), 403

        if current_user.role == "POLICE" and role not in ("POLICE", "CITIZEN"):
            return jsonify({
                "error": "Access Denied: Police authority accounts cannot switch to Consumer Rights or System Administration."
            }), 403

        if current_user.role == "CONSUMER_RIGHTS" and role not in ("CONSUMER_RIGHTS", "CITIZEN"):
            return jsonify({
                "error": "Access Denied: Consumer Rights officers cannot switch to Police or System Administration."
            }), 403

        if current_user.role == "ADMIN" and role not in ("ADMIN", "CITIZEN"):
            return jsonify({
                "error": "Access Denied: System Administrators cannot switch to Police or Consumer Rights operational roles."
            }), 403

    with get_db() as db:
        target_user = db.query(User).filter(User.role == role).first()
        if not target_user:
            return jsonify({"error": f"Demo user for role {role} not found."}), 404

        safe_user = target_user.to_dict()
        token = generate_token(target_user)

    AuditService.log(
        user_id=safe_user["id"],
        user_name=safe_user["fullName"],
        user_role=safe_user["role"],
        action="DEMO_ROLE_SWITCH",
        resource="AUTH",
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Active session set to role [{role}].",
    )

    return jsonify({
        "success": True,
        "token": token,
        "user": safe_user
    })
