import time
import secrets
import string
from flask import Blueprint, request, jsonify, g
from ..database import get_db, DB_ENGINE_TYPE
from ..models import (
    User,
    CrimeReport,
    EmergencyAlert,
    SOSRequest,
    ConsumerComplaint,
    AuditLog,
    normalize_email,
    normalize_nid,
    normalize_phone,
    utcnow_iso,
)
from ..middleware.auth import verify_auth, require_roles
from ..services.ai_prediction_service import DemonstrationAIPredictionService
from ..services.audit_service import AuditService
from ..services.email_service import EmailService
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

        db_type_str = "National Relational Data Cluster (Active)"

        security_status = {
            "encryptionEngine": "End-to-End Cryptographic Protection (Active)",
            "porichoyGateway": "NATIONAL_KYC_GATEWAY_ACTIVE",
            "aiPredictionEngine": "ONLINE (Spatial-Temporal Risk Analytics)",
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

@admin_bp.route("/users/<user_id>/assigned-district", methods=["PATCH"])
def update_user_assigned_district(user_id):
    data = request.get_json() or {}
    assigned_district = (data.get("assignedDistrict") or "").strip()
    if not assigned_district:
        return jsonify({"error": "Select a district for this DNCRP officer."}), 400
    with get_db() as db:
        authority = db.query(User).filter(User.id == user_id).first()
        if not authority:
            return jsonify({"error": "User not found."}), 404
        if authority.role != "CONSUMER_RIGHTS":
            return jsonify({"error": "District assignment applies only to DNCRP officers."}), 400
        authority.assignedDistrict = assigned_district
        db.commit()
        user_dict = authority.to_dict()
    AuditService.log(
        user_id=g.user.id,
        user_name=g.user.fullName,
        user_role=g.user.role,
        action="UPDATE_DNCRP_OFFICER_DISTRICT",
        resource=authority.fullName,
        resource_id=authority.id,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"DNCRP officer district assigned to [{assigned_district}].",
    )
    return jsonify({"success": True, "user": user_dict})

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
    assigned_district = data.get("assignedDistrict")
    station_or_thana = data.get("stationOrThana", "Central Command, Dhaka")

    if not full_name or not email or not phone or not nid_number or not role:
        return jsonify({"error": "Missing mandatory user fields (Full Name, NID, Email, Phone, Role)."}), 400
    if role == "CONSUMER_RIGHTS" and not designation:
        return jsonify({"error": "DNCRP officer category is required."}), 400

    # Auto-generate temporary password if omitted or empty
    temporary_password = str(password or "").strip()
    if not temporary_password:
        prefix = "SentX#"
        chars = string.ascii_letters + string.digits
        rand_part = ''.join(secrets.choice(chars) for _ in range(6))
        temporary_password = f"{prefix}{rand_part}!"

    normalized_nid = normalize_nid(nid_number)
    normalized_email = normalize_email(email)
    normalized_phone = normalize_phone(phone)
    with get_db() as db:
        if any(normalize_nid(user.nidNumber) == normalized_nid for user in db.query(User.nidNumber).all()):
            return jsonify({"error": "NID number is already assigned to an existing account."}), 400
        if db.query(User).filter(User.email == normalized_email).first():
            return jsonify({"error": "Email address already exists."}), 400
        if any(normalize_phone(user.phone) == normalized_phone for user in db.query(User.phone).all()):
            return jsonify({"error": "Phone number already exists."}), 400

        user_id = f"user-{role[:3].lower()}-{int(time.time() * 1000)}"
        is_authority = role in ("POLICE", "CONSUMER_RIGHTS", "ADMIN")
        new_user = User(
            id=user_id,
            nidNumber=normalized_nid,
            fullName=full_name.strip(),
            email=normalized_email,
            phone=normalized_phone,
            role=role,
            badgeNumber=badge_number.strip() if badge_number else None,
            designation=designation.strip() if designation else None,
            department=department.strip() if department else None,
            assignedDistrict=assigned_district.strip() if assigned_district else None,
            stationOrThana=station_or_thana.strip(),
            isNIDVerified=True,
            isEmailVerified=True,  # Officially verified by Administrator
            mustChangePassword=is_authority,  # Mandatory password update on first login
            createdAt=utcnow_iso(),
            passwordHash=hash_password(temporary_password),
        )
        db.add(new_user)
        db.commit()

        user_dict = new_user.to_dict()

    # Dispatch official onboarding credentials email
    email_result = EmailService.send_temporary_password(
        to_email=normalized_email,
        full_name=full_name.strip(),
        role=role,
        designation=designation.strip() if designation else None,
        badge=badge_number.strip() if badge_number else None,
        station_or_thana=station_or_thana.strip(),
        temp_password=temporary_password
    )

    AuditService.log(
        user_id=admin_user.id,
        user_name=admin_user.fullName,
        user_role=admin_user.role,
        action="CREATE_AUTHORITY_USER",
        resource="USER_REGISTRY",
        resource_id=user_id,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Admin provisioned new account [{full_name}] with role [{role}] and temporary credentials. Station: [{station_or_thana}].",
    )

    return jsonify({
        "success": True,
        "user": user_dict,
        "temporaryPassword": temporary_password,
        "emailDispatched": email_result.get("success", False),
        "emailMode": email_result.get("mode"),
        "emailMessage": email_result.get("message")
    }), 201

# 3. AI Crime Predictions & Strategic Command
@admin_bp.route("/ai-predictions", methods=["GET"])
def get_ai_predictions():
    district = request.args.get("district")
    thana = request.args.get("thana")

    with get_db() as db:
        predictions = ai_prediction_service.get_predictions(district, thana)
        risk_matrix = ai_prediction_service.get_comparative_risk_matrix(db)
        resource_allocations = ai_prediction_service.get_resource_allocation_advice(db)
        directives = ai_prediction_service.get_directives(db)

    return jsonify({
        "success": True,
        "disclaimer": "Demonstration Prediction - Model results for strategic planning and resource deployment evaluation.",
        "predictions": predictions,
        "riskMatrix": risk_matrix,
        "resourceAllocations": resource_allocations,
        "directives": directives,
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

    with get_db() as db:
        analysis = ai_prediction_service.generate_predictive_analysis(
            district=district.strip(),
            thana=thana.strip(),
            target_date=target_date,
            crime_type=crime_type,
            weather=weather,
            is_festival=is_festival,
            db=db,
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

@admin_bp.route("/ai-predictions/directives", methods=["POST"])
def issue_directive():
    data = request.get_json() or {}
    if not data.get("targetDistrict") or not data.get("targetThana"):
        return jsonify({"error": "targetDistrict and targetThana are required to issue an operational directive."}), 400

    with get_db() as db:
        directive = ai_prediction_service.issue_operational_directive(db, g.user, data)

    return jsonify({
        "success": True,
        "message": f"Operational directive ({directive['directiveCode']}) issued to {directive['targetThana']} police.",
        "directive": directive
    }), 201

@admin_bp.route("/ai-predictions/directives", methods=["GET"])
def list_directives():
    with get_db() as db:
        directives = ai_prediction_service.get_directives(db)
    return jsonify({
        "success": True,
        "directives": directives
    })

# 4. Crime Reports & Statistics (National Admin Access)
@admin_bp.route("/reports", methods=["GET"])
def get_admin_crime_reports():
    with get_db() as db:
        reports = db.query(CrimeReport).order_by(CrimeReport.submittedAt.desc()).all()
        return jsonify({
            "success": True,
            "total": len(reports),
            "reports": [r.to_dict() for r in reports]
        })

@admin_bp.route("/audit-logs/log-export", methods=["POST"])
def log_audit_export():
    data = request.get_json() or {}
    record_count = data.get("recordCount", 0)
    AuditService.log(
        user_id=g.user.id,
        user_name=g.user.fullName,
        user_role=g.user.role,
        action="EXPORT_AUDIT_TRAIL_CSV",
        resource="AUDIT_SYSTEM",
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Admin exported {record_count} system audit log records to CSV.",
    )
    return jsonify({"success": True})

# 5. Audit Logs
@admin_bp.route("/audit-logs", methods=["GET"])
def get_audit_logs():
    role = request.args.get("role")
    action = request.args.get("action")
    limit = int(request.args.get("limit", 250))

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
