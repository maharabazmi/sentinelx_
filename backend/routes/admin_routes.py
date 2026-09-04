import time
from flask import Blueprint, request, jsonify, g
from ..database import get_db, DB_ENGINE_TYPE
from ..models import (
    User,
    CrimeReport,
    EmergencyAlert,
    SOSRequest,
    ConsumerComplaint,
    AuditLog,
    utcnow_iso,
)
from ..middleware.auth import verify_auth, require_roles
from ..services.ai_prediction_service import DemonstrationAIPredictionService
from ..services.audit_service import AuditService
from ..services.jurisdiction_service import JurisdictionService
from ..config import Config
from .auth_routes import hash_password

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")
ai_prediction_service = DemonstrationAIPredictionService()
SERVER_START_TIME = time.time()

@admin_bp.before_request
@verify_auth
def check_admin_access():
    return require_roles("ADMIN")(lambda: None)()

# 1. Admin System Overview
@admin_bp.route("/system-overview", methods=["GET"])
def system_overview():
    with get_db() as db:
        users = db.query(User).all()
        crimes = db.query(CrimeReport).all()
        complaints = db.query(ConsumerComplaint).all()
        alerts = db.query(EmergencyAlert).all()
        sos = db.query(SOSRequest).all()
        logs = db.query(AuditLog).all()

        users_by_role = {
            "CITIZEN": len([u for u in users if u.role == "CITIZEN"]),
            "POLICE": len([u for u in users if u.role == "POLICE"]),
            "CONSUMER_RIGHTS": len([u for u in users if u.role == "CONSUMER_RIGHTS"]),
            "ADMIN": len([u for u in users if u.role == "ADMIN"]),
        }

        db_type_str = "PostgreSQL Enterprise Cluster" if DB_ENGINE_TYPE == "POSTGRESQL" else "PostgreSQL Relational Structure / SQLite Resilient Mode"

        security_status = {
            "encryptionEngine": "AES-256-GCM + PBKDF2 / Bcrypt Active",
            "porichoyGateway": "LIVE_PRODUCTION" if Config.PORICHOY_API_KEY else "MOCK_SANDBOX_ACTIVE",
            "aiPredictionEngine": "ONLINE (Demonstration Inference Mode)",
            "uptimeSeconds": int(time.time() - SERVER_START_TIME),
            "databaseType": db_type_str,
            "totalAuditLogs": len(logs),
            "unauthorizedAttemptsBlocked": len([l for l in logs if l.status == "DENIED"]),
        }

        return jsonify({
            "success": True,
            "stats": {
                "totalUsers": len(users),
                "usersByRole": users_by_role,
                "totalCrimesLodged": len(crimes),
                "verifiedCrimes": len([c for c in crimes if c.status not in ("SUBMITTED", "REJECTED")]),
                "totalConsumerComplaints": len(complaints),
                "totalEmergencyAlertsIssued": len(alerts),
                "totalSOSRequests": len(sos),
                "securityStatus": security_status,
            }
        })

# 2. User Management
@admin_bp.route("/users", methods=["GET"])
def get_users():
    with get_db() as db:
        users = db.query(User).all()
        return jsonify({
            "success": True,
            "users": [u.to_dict() for u in users]
        })

@admin_bp.route("/users", methods=["POST"])
def create_user():
    admin_user = g.user
    data = request.get_json() or {}

    full_name = data.get("fullName")
    email = data.get("email")
    phone = data.get("phone")
    nid_number = data.get("nidNumber")
    role = data.get("role")
    password = data.get("password")
    badge_number = data.get("badgeNumber")
    designation = data.get("designation")
    department = data.get("department")
    station_or_thana = data.get("stationOrThana", "Central Command, Dhaka")

    if not full_name or not email or not phone or not nid_number or not role or not password:
        return jsonify({"error": "Missing mandatory user fields."}), 400

    with get_db() as db:
        if db.query(User).filter(User.nidNumber == nid_number.strip()).first():
            return jsonify({"error": "NID number is already assigned to an existing account."}), 400
        if db.query(User).filter(User.email == email.strip().lower()).first():
            return jsonify({"error": "Email address already exists."}), 400

        user_id = f"user-{role[:3].lower()}-{int(time.time() * 1000)}"
        new_user = User(
            id=user_id,
            nidNumber=nid_number.strip(),
            fullName=full_name.strip(),
            email=email.strip().lower(),
            phone=phone.strip(),
            role=role,
            badgeNumber=badge_number.strip() if badge_number else None,
            designation=designation.strip() if designation else None,
            department=department.strip() if department else None,
            stationOrThana=station_or_thana.strip(),
            isNIDVerified=True,
            createdAt=utcnow_iso(),
            passwordHash=hash_password(password),
        )
        db.add(new_user)
        db.commit()

        # If officer was provisioned, auto-assign any pending reports in their station jurisdiction
        assigned_cases_count = 0
        if role == "POLICE":
            assigned_cases_count = JurisdictionService.auto_assign_pending_reports_for_officer(db, new_user)

        user_dict = new_user.to_dict()

    AuditService.log(
        user_id=admin_user.id,
        user_name=admin_user.fullName,
        user_role=admin_user.role,
        action="CREATE_AUTHORITY_USER",
        resource="USER_REGISTRY",
        resource_id=user_id,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Admin provisioned new account [{full_name}] with role [{role}]. Station: [{station_or_thana}]. Auto-assigned [{assigned_cases_count}] pending cases.",
    )

    return jsonify({
        "success": True,
        "user": user_dict
    }), 201

# 3. AI Crime Predictions
@admin_bp.route("/ai-predictions", methods=["GET"])
def get_ai_predictions():
    district = request.args.get("district")
    thana = request.args.get("thana")
    predictions = ai_prediction_service.get_predictions(district, thana)

    AuditService.log(
        user_id=g.user.id,
        user_name=g.user.fullName,
        user_role=g.user.role,
        action="QUERY_AI_PREDICTIONS",
        resource="AI_PREDICTION_ENGINE",
        ip_address=request.remote_addr,
        status="SUCCESS",
        details="Admin accessed AI crime prediction spatial-temporal analysis results.",
    )

    return jsonify({
        "success": True,
        "disclaimer": "Demonstration Prediction - Model results for strategic planning and resource deployment evaluation only.",
        "predictions": predictions
    })

@admin_bp.route("/ai-predictions/generate", methods=["POST"])
def generate_ai_scenario():
    data = request.get_json() or {}
    district = data.get("district")
    thana = data.get("thana")
    target_date = data.get("targetDate")
    crime_type = data.get("crimeType")
    weather = data.get("weather")
    is_festival = data.get("isFestival", False)

    if not district or not thana:
        return jsonify({"error": "Target District and Thana are required."}), 400

    analysis = ai_prediction_service.generate_predictive_analysis(
        district=district.strip(),
        thana=thana.strip(),
        target_date=target_date,
        crime_type=crime_type,
        weather=weather,
        is_festival=is_festival,
    )

    AuditService.log(
        user_id=g.user.id,
        user_name=g.user.fullName,
        user_role=g.user.role,
        action="GENERATE_AI_SCENARIO_PREDICTION",
        resource=f"{district}/{thana}",
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Admin generated AI crime risk forecast for [{thana}, {district}]. Risk Score: [{analysis['predictedRiskLevel']}].",
    )

    return jsonify({
        "success": True,
        "prediction": analysis
    })

# 4. Audit Logs
@admin_bp.route("/audit-logs", methods=["GET"])
def get_audit_logs():
    role = request.args.get("role")
    action = request.args.get("action")
    limit = int(request.args.get("limit", 100))

    logs = AuditService.get_logs(user_role=role, action=action, limit=limit)
    return jsonify({
        "success": True,
        "totalLogs": len(logs),
        "logs": logs
    })

# 5. Security Config
@admin_bp.route("/security-config", methods=["GET"])
def security_config():
    return jsonify({
        "success": True,
        "config": {
            "porichoyApiEndpoint": Config.PORICHOY_API_ENDPOINT,
            "porichoyMockMode": not bool(Config.PORICHOY_API_KEY),
            "encryptionAlgorithm": "AES-256-GCM",
            "jwtExpirationHours": Config.JWT_EXPIRATION_HOURS,
            "aiModel": "SentinelX-CrimeRisk-GradientBoostedTree v2.4 (Demo)",
            "heatmapAccessRole": "POLICE, ADMIN",
            "aiPredictionAccessRole": "ADMIN ONLY",
            "nidVerificationEnforced": True,
        }
    })
