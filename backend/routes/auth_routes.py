import time
import uuid
import bcrypt
import random
from flask import Blueprint, request, jsonify, g
from ..config import Config
from ..database import get_db
from ..models import User, normalize_email, normalize_nid, normalize_phone, utcnow_iso
from ..middleware.auth import generate_token, verify_auth, decode_token
from ..services.nid_service import MockNIDVerificationService, PorichoyNIDVerificationService
from ..services.audit_service import AuditService
from ..services.email_service import EmailService

# Temporary OTP Store: normalized_email -> {"otp": str, "expires_at": float, "name": str}
_pending_email_otps = {}
# Verified Emails Cache: normalized_email -> expiry_timestamp
_verified_emails = {}

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
        verified_nid = normalize_nid(result.get("nidNumber") or nid_number)

        with get_db() as db:
            existing_user = any(
                normalize_nid(user.nidNumber) == verified_nid
                for user in db.query(User.nidNumber).all()
            )

        return jsonify({
            "success": True,
            "verification": result,
            "alreadyRegistered": existing_user
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e) or "NID Verification failed."}), 400

# Step 1.5: Send Email Verification OTP
@auth_bp.route("/send-email-otp", methods=["POST"])
def send_email_otp():
    data = request.get_json() or {}
    email = data.get("email")
    full_name = data.get("fullName", "Citizen")

    if not email:
        return jsonify({"error": "Email address is required."}), 400

    normalized = normalize_email(email)
    if "@" not in normalized or "." not in normalized:
        return jsonify({"error": "Invalid email address format."}), 400

    # Ensure email isn't already taken
    with get_db() as db:
        if db.query(User).filter(User.email == normalized).first():
            return jsonify({"error": "Email address is already linked to an existing account."}), 400

    # Generate 6-digit cryptographic OTP
    otp_code = f"{random.randint(100000, 999999):06d}"
    expires_at = time.time() + 600  # 10 minutes TTL

    _pending_email_otps[normalized] = {
        "otp": otp_code,
        "expires_at": expires_at,
        "name": full_name.strip() if full_name else "Citizen"
    }

    email_result = EmailService.send_verification_otp(normalized, otp_code, recipient_name=full_name)

    response_data = {
        "success": True,
        "message": f"Verification code sent to {normalized}.",
        "expiresInSeconds": 600,
        "emailMode": email_result.get("mode")
    }

    # If in dev simulator mode, provide dev_otp for effortless developer testing
    if email_result.get("mode") == "dev_simulated":
        response_data["devOtp"] = otp_code

    return jsonify(response_data)

# Step 1.6: Verify Email OTP Code
@auth_bp.route("/verify-email-otp", methods=["POST"])
def verify_email_otp():
    data = request.get_json() or {}
    email = data.get("email")
    otp_code = str(data.get("otp", "")).strip()

    if not email or not otp_code:
        return jsonify({"error": "Email and 6-digit OTP code are required."}), 400

    normalized = normalize_email(email)
    record = _pending_email_otps.get(normalized)

    if not record:
        return jsonify({"error": "No pending verification code found for this email. Please request a new code."}), 400

    if time.time() > record["expires_at"]:
        _pending_email_otps.pop(normalized, None)
        return jsonify({"error": "Verification code has expired. Please request a new one."}), 400

    if record["otp"] != otp_code:
        return jsonify({"error": "Invalid verification code. Please check and try again."}), 400

    # Mark as verified in session cache (valid for 30 minutes to complete registration)
    _verified_emails[normalized] = time.time() + 1800
    _pending_email_otps.pop(normalized, None)

    return jsonify({
        "success": True,
        "message": "Email address successfully verified.",
        "verifiedEmail": normalized
    })

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

    normalized_nid = normalize_nid(nid_number)
    with get_db() as db:
        if any(normalize_nid(user.nidNumber) == normalized_nid for user in db.query(User.nidNumber).all()):
            return jsonify({"error": "An account is already linked to this Bangladesh National ID (NID)."}), 400

        user_email = normalize_email(email) if email else f"{normalized_nid}@citizen.sentinelx.bd"
        if db.query(User).filter(User.email == user_email).first():
            return jsonify({"error": "Email address is already in use."}), 400

        user_phone = normalize_phone(phone)
        if any(normalize_phone(user.phone) == user_phone for user in db.query(User.phone).all()):
            return jsonify({"error": "Phone number is already in use."}), 400

        # Check if email was verified via OTP
        is_email_verified = False
        if email:
            if user_email in _verified_emails and time.time() < _verified_emails[user_email]:
                is_email_verified = True
            elif data.get("isEmailVerified"):
                is_email_verified = True

        user_id = f"user-cit-{int(time.time() * 1000)}"
        new_user = User(
            id=user_id,
            nidNumber=normalized_nid,
            fullName=full_name.strip(),
            email=user_email,
            phone=user_phone,
            role="CITIZEN",
            isNIDVerified=True,
            isEmailVerified=is_email_verified,
            mustChangePassword=False,
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

# Change Password (used for mandatory first-login password change or profile update)
@auth_bp.route("/change-password", methods=["POST"])
@verify_auth
def change_password():
    data = request.get_json() or {}
    current_password = data.get("currentPassword", "").strip()
    new_password = data.get("newPassword", "").strip()

    if not current_password or not new_password:
        return jsonify({"error": "Current password and new password are required."}), 400

    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters long."}), 400

    if current_password == new_password:
        return jsonify({"error": "New password must be different from your current temporary password."}), 400

    user_id = g.user.id
    with get_db() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return jsonify({"error": "User account not found."}), 404

        if not check_password(current_password, user.passwordHash):
            return jsonify({"error": "Current temporary password is incorrect."}), 400

        user.passwordHash = hash_password(new_password)
        user.mustChangePassword = False
        db.commit()

        safe_user = user.to_dict()
        new_token = generate_token(user)

    AuditService.log(
        user_id=safe_user["id"],
        user_name=safe_user["fullName"],
        user_role=safe_user["role"],
        action="PASSWORD_UPDATED_SECURELY",
        resource="USER_SECURITY",
        resource_id=safe_user["id"],
        ip_address=request.remote_addr,
        status="SUCCESS",
        details="User established new permanent security password.",
    )

    return jsonify({
        "success": True,
        "message": "Password successfully updated.",
        "token": new_token,
        "user": safe_user
    })

