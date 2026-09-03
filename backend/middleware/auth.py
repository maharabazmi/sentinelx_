from functools import wraps
from datetime import datetime, timezone, timedelta
import jwt
from flask import request, jsonify, g
from ..config import Config
from ..database import get_db
from ..models import User
from ..services.audit_service import AuditService

def generate_token(user: User) -> str:
    payload = {
        "id": user.id,
        "nidNumber": user.nidNumber,
        "fullName": user.fullName,
        "role": user.role,
        "department": user.department,
        "badgeNumber": user.badgeNumber,
        "exp": datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")

def decode_token(token: str) -> dict:
    return jwt.decode(token, Config.JWT_SECRET, algorithms=["HS256"])

class AuthenticatedUser:
    def __init__(self, data: dict):
        self.id = data.get("id")
        self.nidNumber = data.get("nidNumber")
        self.fullName = data.get("fullName")
        self.email = data.get("email")
        self.phone = data.get("phone")
        self.role = data.get("role")
        self.badgeNumber = data.get("badgeNumber")
        self.designation = data.get("designation")
        self.department = data.get("department")
        self.stationOrThana = data.get("stationOrThana")
        self.isNIDVerified = data.get("isNIDVerified", False)
        self.createdAt = data.get("createdAt")

    def to_dict(self):
        return {
            "id": self.id,
            "nidNumber": self.nidNumber,
            "fullName": self.fullName,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "badgeNumber": self.badgeNumber,
            "designation": self.designation,
            "department": self.department,
            "stationOrThana": self.stationOrThana,
            "isNIDVerified": self.isNIDVerified,
            "createdAt": self.createdAt,
        }

def verify_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Unauthorized: Authentication token missing or invalid."}), 401

        token = auth_header.split(" ")[1]
        try:
            decoded = decode_token(token)
            with get_db() as db:
                user = db.query(User).filter(User.id == decoded["id"]).first()
                if not user:
                    return jsonify({"error": "Unauthorized: User account not found or deactivated."}), 401
                user_data = user.to_dict()

            g.user = AuthenticatedUser(user_data)
            g.user_dict = user_data
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Unauthorized: Token expired."}), 401
        except Exception:
            return jsonify({"error": "Unauthorized: Token verification failed."}), 401

        return f(*args, **kwargs)
    return decorated_function

def require_roles(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = getattr(g, "user", None)
            if not user:
                return jsonify({"error": "Authentication required."}), 401

            if user.role not in allowed_roles:
                AuditService.log(
                    user_id=user.id,
                    user_name=user.fullName,
                    user_role=user.role,
                    action="UNAUTHORIZED_RESOURCE_ACCESS_ATTEMPT",
                    resource=request.path,
                    ip_address=request.remote_addr,
                    status="DENIED",
                    details=f"Access to role-restricted endpoint [{', '.join(allowed_roles)}] was blocked for user with role [{user.role}].",
                )
                return jsonify({
                    "error": f"Forbidden: This resource is strictly restricted to {' / '.join(allowed_roles)} personnel. Your current role is {user.role}."
                }), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator
