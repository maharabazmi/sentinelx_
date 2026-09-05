import time
import random
import re
from flask import Blueprint, request, jsonify, g
from sqlalchemy import func, or_
from ..database import get_db
from ..models import (
    User,
    CrimeReport,
    EmergencyAlert,
    SOSRequest,
    utcnow_iso,
)
from ..middleware.auth import verify_auth, require_roles
from ..services.notification_service import NotificationService
from ..services.audit_service import AuditService
from ..services.jurisdiction_service import JurisdictionService

police_bp = Blueprint("police", __name__, url_prefix="/api/police")

def extract_thana_keyword(station_or_thana: str) -> str:
    if not station_or_thana:
        return ""
    # Take first part before comma (e.g. "Fulbaria, Mymensingh" -> "Fulbaria")
    first_part = station_or_thana.split(",")[0].strip()
    # Case-insensitively strip common administrative/station suffixes
    cleaned = re.sub(
        r"(?i)\s*(police\s*station|model\s*thana|thana|upazila|ps|outpost|phari|investigation\s*centre|division|district)\b",
        "",
        first_part
    ).strip()
    return cleaned or first_part

@police_bp.before_request
@verify_auth
def check_police_access():
    return require_roles("POLICE", "ADMIN")(lambda: None)()

# 1. Police Dashboard Operational Summary
@police_bp.route("/dashboard-summary", methods=["GET"])
def dashboard_summary():
    user = g.user
    now_iso = utcnow_iso()
    thana_kw = extract_thana_keyword(user.stationOrThana)

    with get_db() as db:
        reports = db.query(CrimeReport).all()
        sos_list = db.query(SOSRequest).all()
        alerts = db.query(EmergencyAlert).all()

        new_reports = len([r for r in reports if r.status in ("SUBMITTED", "OFFICER_ASSIGNED")])
        pending_verification = len([r for r in reports if r.status in ("SUBMITTED", "OFFICER_ASSIGNED")])
        active_investigations = len([r for r in reports if r.status in ("VERIFIED", "OFFICER_ASSIGNED", "INVESTIGATION")])
        closed_cases = len([r for r in reports if r.status == "CASE_CLOSED"])

        # Station-specific metrics for rapid response
        if thana_kw:
            thana_kw_clean = thana_kw.lower()
            station_reports = [
                r for r in reports
                if thana_kw_clean in (r.thana or "").lower() or ((r.thana or "").lower() in thana_kw_clean)
            ]
        else:
            station_reports = reports

        station_unassigned = len([
            r for r in station_reports
            if not r.assignedOfficerId and not r.assignedOfficerName and r.status != "CASE_CLOSED" and r.status != "REJECTED"
        ])

        my_active_cases = len([
            r for r in reports
            if (r.assignedOfficerId == user.id or (r.assignedOfficerName and user.fullName.lower() in r.assignedOfficerName.lower()))
            and r.status not in ("CASE_CLOSED", "REJECTED")
        ])

        # Filter SOS strictly to this officer's police station coverage area
        if user.role == "POLICE":
            station_sos = [
                s for s in sos_list
                if JurisdictionService.is_sos_in_police_jurisdiction(user.stationOrThana, s, db)
            ]
        else:
            station_sos = sos_list

        active_sos = len([s for s in station_sos if s.status != "RESOLVED"])
        active_alerts = len([a for a in alerts if a.isActive and a.expirationTime > now_iso])

        return jsonify({
            "success": True,
            "stats": {
                "newReports": new_reports,
                "pendingVerification": pending_verification,
                "activeInvestigations": active_investigations,
                "closedCases": closed_cases,
                "activeSOS": active_sos,
                "activeEmergencyAlerts": active_alerts,
                "totalLodgedCases": len(reports),
                "stationUnassigned": station_unassigned,
                "myActiveCases": my_active_cases,
                "officerStation": user.stationOrThana,
                "stationKeyword": thana_kw
            }
        })

# 2. Get Crime Reports (Jurisdiction-Aware)
@police_bp.route("/reports", methods=["GET"])
def get_reports():
    user = g.user
    scope = request.args.get("scope", "station")  # "station", "my_cases", "unassigned", "all"
    status = request.args.get("status")
    district = request.args.get("district")
    thana = request.args.get("thana")
    severity = request.args.get("severity")
    crime_type = request.args.get("crimeType")

    thana_kw = extract_thana_keyword(user.stationOrThana)

    with get_db() as db:
        query = db.query(CrimeReport)

        if user.role == "POLICE":
            if scope == "my_cases":
                # Cases assigned specifically to this officer
                query = query.filter(
                    (CrimeReport.assignedOfficerId == user.id) |
                    (CrimeReport.assignedOfficerName.ilike(f"%{user.fullName}%"))
                )
            elif scope == "unassigned":
                # Unassigned cases in this officer's Thana
                if thana_kw:
                    query = query.filter(
                        or_(
                            CrimeReport.thana.ilike(f"%{thana_kw}%"),
                            func.lower(CrimeReport.thana) == thana_kw.lower()
                        )
                    )
                query = query.filter(
                    (CrimeReport.assignedOfficerId == None) |
                    (CrimeReport.assignedOfficerId == "") |
                    (CrimeReport.assignedOfficerName == None) |
                    (CrimeReport.assignedOfficerName == "")
                )
            elif scope == "all":
                # Officer requests national registry overview
                pass
            else:
                # Default "station" scope: All reports within this officer's Thana
                if thana_kw:
                    query = query.filter(
                        or_(
                            CrimeReport.thana.ilike(f"%{thana_kw}%"),
                            func.lower(CrimeReport.thana) == thana_kw.lower()
                        )
                    )
        elif user.role == "ADMIN":
            if scope == "my_cases":
                query = query.filter(CrimeReport.assignedOfficerId == user.id)
            elif scope == "unassigned":
                query = query.filter(
                    (CrimeReport.assignedOfficerId == None) |
                    (CrimeReport.assignedOfficerId == "") |
                    (CrimeReport.assignedOfficerName == None) |
                    (CrimeReport.assignedOfficerName == "")
                )
            elif scope == "station" and thana_kw:
                query = query.filter(
                    or_(
                        CrimeReport.thana.ilike(f"%{thana_kw}%"),
                        func.lower(CrimeReport.thana) == thana_kw.lower()
                    )
                )

        # Explicit filters
        if status and status != "ALL":
            if status == "SUBMITTED":
                query = query.filter(CrimeReport.status.in_(["SUBMITTED", "OFFICER_ASSIGNED"]))
            else:
                query = query.filter(CrimeReport.status == status)
        if district and district != "ALL":
            query = query.filter(CrimeReport.district.ilike(f"%{district}%"))
        if thana and thana != "ALL":
            query = query.filter(CrimeReport.thana.ilike(f"%{thana}%"))
        if severity and severity != "ALL":
            query = query.filter(CrimeReport.severity == severity)
        if crime_type and crime_type != "ALL":
            query = query.filter(CrimeReport.crimeType == crime_type)

        reports = query.order_by(CrimeReport.submittedAt.desc()).all()
        return jsonify({
            "success": True,
            "reports": [r.to_dict() for r in reports],
            "officerStation": user.stationOrThana,
            "stationKeyword": thana_kw,
            "scope": scope
        })

# 3. Verify or Reject Crime Report
@police_bp.route("/reports/<report_id>/verify", methods=["POST"])
def verify_report(report_id):
    user = g.user
    data = request.get_json() or {}
    action = data.get("action")  # 'VERIFY' or 'REJECT'
    notes = data.get("notes")

    with get_db() as db:
        report = db.query(CrimeReport).filter(CrimeReport.id == report_id).first()
        if not report:
            return jsonify({"error": "Crime report not found."}), 404

        new_status = "VERIFIED" if action == "VERIFY" else "REJECTED"
        report.status = new_status
        report.verificationNotes = notes or ("Verified by reviewing officer." if action == "VERIFY" else "Rejected due to insufficient corroborating evidence.")
        report.verifiedByOfficerId = user.id

        updates = report.investigationUpdates
        updates.append({
            "id": f"inv-{int(time.time() * 1000)}",
            "timestamp": utcnow_iso(),
            "officerName": f"{user.fullName} ({user.badgeNumber or 'Officer'})",
            "status": new_status,
            "note": report.verificationNotes,
        })
        report.investigationUpdates = updates
        db.commit()
        report_dict = report.to_dict()

    # Notify Citizen
    NotificationService.create_case_notification(
        user_id=report.reporterId,
        title=f"Case Update: {report.caseId}",
        message=(
            f'Your crime report "{report.title}" has been formally VERIFIED by {user.fullName}. An investigation team has been assigned.'
            if action == "VERIFY"
            else f'Your crime report "{report.title}" was reviewed and marked as REJECTED. Reason: {report.verificationNotes}'
        ),
        related_id=report.id,
    )

    AuditService.log(
        user_id=user.id,
        user_name=user.fullName,
        user_role=user.role,
        action="VERIFY_CRIME_REPORT" if action == "VERIFY" else "REJECT_CRIME_REPORT",
        resource=report.caseId,
        resource_id=report.id,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Officer updated case status to [{new_status}]. Notes: {notes or 'N/A'}",
    )

    return jsonify({
        "success": True,
        "report": report_dict,
        "message": f"Report successfully {'verified' if action == 'VERIFY' else 'rejected'}."
    })

# 4. Assign Officer & Update Status
@police_bp.route("/reports/<report_id>/status", methods=["POST"])
def update_investigation_status(report_id):
    user = g.user
    data = request.get_json() or {}
    status = data.get("status")
    officer_id = data.get("assignedOfficerId")
    officer_name = data.get("assignedOfficerName")
    officer_badge = data.get("assignedOfficerBadge")
    officer_station = data.get("assignedOfficerStation")
    note = data.get("note")

    with get_db() as db:
        report = db.query(CrimeReport).filter(CrimeReport.id == report_id).first()
        if not report:
            return jsonify({"error": "Crime report not found."}), 404

        if status:
            report.status = status
        if officer_id:
            report.assignedOfficerId = officer_id
        if officer_name:
            report.assignedOfficerName = officer_name
        if officer_badge:
            report.assignedOfficerBadge = officer_badge
        if officer_station:
            report.assignedOfficerStation = officer_station

        updates = report.investigationUpdates
        updates.append({
            "id": f"inv-{int(time.time() * 1000)}",
            "timestamp": utcnow_iso(),
            "officerName": f"{user.fullName} ({user.badgeNumber or 'Officer'})",
            "status": report.status,
            "note": note or f"Status updated to {report.status}",
        })
        report.investigationUpdates = updates
        db.commit()
        report_dict = report.to_dict()

    NotificationService.create_case_notification(
        user_id=report.reporterId,
        title=f"Investigation Update: {report.caseId}",
        message=f"Case Status updated to {report.status}. Note: {note or 'Investigation progressing.'}",
        related_id=report.id,
    )

    AuditService.log(
        user_id=user.id,
        user_name=user.fullName,
        user_role=user.role,
        action="UPDATE_INVESTIGATION_STATUS",
        resource=report.caseId,
        resource_id=report.id,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Case status updated to [{report.status}], assigned officer: [{report.assignedOfficerName or 'N/A'}].",
    )

    return jsonify({
        "success": True,
        "report": report_dict
    })

# 5. Dedicated Case Assignment & Self-Claiming
@police_bp.route("/reports/<report_id>/assign", methods=["POST"])
def assign_or_claim_report(report_id):
    user = g.user
    data = request.get_json() or {}
    officer_id = data.get("officerId")  # If None or equal to user.id -> Self-Claim
    note = data.get("note")

    with get_db() as db:
        report = db.query(CrimeReport).filter(CrimeReport.id == report_id).first()
        if not report:
            return jsonify({"error": "Crime report not found."}), 404

        if officer_id and officer_id != user.id:
            target_officer = db.query(User).filter(User.id == officer_id, User.role == "POLICE").first()
            if not target_officer:
                return jsonify({"error": "Target police officer not found."}), 404
        else:
            target_officer = user

        report.assignedOfficerId = target_officer.id
        report.assignedOfficerName = target_officer.fullName
        report.assignedOfficerBadge = target_officer.badgeNumber or "POLICE"
        report.assignedOfficerStation = target_officer.stationOrThana

        if report.status in ("SUBMITTED", "VERIFIED", "OFFICER_ASSIGNED"):
            report.status = "INVESTIGATION"

        is_self_claim = (target_officer.id == user.id)
        log_action = "CLAIM_INVESTIGATION" if is_self_claim else "ASSIGN_INVESTIGATION"

        updates = report.investigationUpdates
        updates.append({
            "id": f"inv-{int(time.time() * 1000)}",
            "timestamp": utcnow_iso(),
            "officerName": f"{user.fullName} ({user.badgeNumber or 'Officer'})",
            "status": report.status,
            "note": note or (
                f"Investigation claimed by {target_officer.fullName} ({target_officer.badgeNumber or 'Officer'})."
                if is_self_claim
                else f"Assigned to {target_officer.fullName} ({target_officer.badgeNumber or 'Officer'}) by {user.fullName}."
            ),
        })
        report.investigationUpdates = updates
        db.commit()
        report_dict = report.to_dict()

    # Notify Citizen
    NotificationService.create_case_notification(
        user_id=report.reporterId,
        title=f"Investigator Assigned: {report.caseId}",
        message=f"{target_officer.fullName} (Badge #{target_officer.badgeNumber or 'N/A'}, {target_officer.stationOrThana}) has been assigned to investigate your report.",
        related_id=report.id,
    )

    AuditService.log(
        user_id=user.id,
        user_name=user.fullName,
        user_role=user.role,
        action=log_action,
        resource=report.caseId,
        resource_id=report.id,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Case assigned to [{target_officer.fullName}] (ID: {target_officer.id}).",
    )

    return jsonify({
        "success": True,
        "message": f"Case successfully {'claimed' if is_self_claim else 'assigned'} to {target_officer.fullName}.",
        "report": report_dict
    })

# 6. Get Police Officers (for station assignment dropdowns)
@police_bp.route("/officers", methods=["GET"])
def get_police_officers():
    station = request.args.get("station")
    with get_db() as db:
        query = db.query(User).filter(User.role == "POLICE")
        if station and station != "ALL":
            clean_kw = extract_thana_keyword(station)
            if clean_kw:
                query = query.filter(
                    or_(
                        User.stationOrThana.ilike(f"%{clean_kw}%"),
                        func.lower(User.stationOrThana) == clean_kw.lower()
                    )
                )
        officers = query.all()
        return jsonify({
            "success": True,
            "officers": [
                {
                    "id": o.id,
                    "fullName": o.fullName,
                    "badgeNumber": o.badgeNumber,
                    "designation": o.designation,
                    "stationOrThana": o.stationOrThana,
                    "email": o.email,
                    "phone": o.phone
                }
                for o in officers
            ]
        })

# 5. POLICE-ONLY Crime Heatmap Data
@police_bp.route("/heatmap", methods=["GET"])
def get_crime_heatmap():
    user = g.user
    if user.role not in ("POLICE", "ADMIN"):
        AuditService.log(
            user_id=user.id,
            user_name=user.fullName,
            user_role=user.role,
            action="BLOCKED_HEATMAP_ACCESS",
            resource="/api/police/heatmap",
            ip_address=request.remote_addr,
            status="DENIED",
            details="Unauthorized attempt to access police-only crime heatmap.",
        )
        return jsonify({"error": "Forbidden: Crime Heatmap is restricted exclusively to authorized Police personnel."}), 403

    with get_db() as db:
        # Strictly only verified incidents (not SUBMITTED, not REJECTED)
        reports = (
            db.query(CrimeReport)
            .filter(CrimeReport.status.notin_(["SUBMITTED", "REJECTED"]))
            .all()
        )

        incidents = []
        for r in reports:
            multiplier = 1.0 if r.severity == "CRITICAL" else 0.75 if r.severity == "HIGH" else 0.5 if r.severity == "MEDIUM" else 0.25
            incidents.append({
                "id": r.id,
                "caseId": r.caseId,
                "crimeType": r.crimeType,
                "severity": r.severity,
                "locationName": r.locationName,
                "district": r.district,
                "thana": r.thana,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "occurredAt": r.occurredAt,
                "verifiedAt": r.submittedAt,
                "intensity": multiplier,
            })

        return jsonify({
            "success": True,
            "totalVerifiedIncidents": len(incidents),
            "incidents": incidents
        })

# 6. Emergency Alerts Management
@police_bp.route("/emergency-alerts", methods=["GET"])
def get_police_emergency_alerts():
    with get_db() as db:
        alerts = db.query(EmergencyAlert).order_by(EmergencyAlert.createdAt.desc()).all()
        return jsonify({
            "success": True,
            "alerts": [a.to_dict() for a in alerts]
        })

@police_bp.route("/emergency-alerts", methods=["POST"])
def create_emergency_alert():
    user = g.user
    data = request.get_json() or {}

    emergency_type = data.get("emergencyType")
    title = data.get("title")
    message = data.get("message")
    affected_area = data.get("affectedArea")
    district = data.get("district", "Dhaka")
    severity = data.get("severity", "HIGH")
    start_time = data.get("startTime")
    expiration_time = data.get("expirationTime")
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    radius_km = data.get("radiusKm", 5.0)

    if not emergency_type or not title or not message or not affected_area or not expiration_time:
        return jsonify({"error": "Missing mandatory emergency alert fields."}), 400

    alert_id = f"alert-{int(time.time() * 1000)}"
    dist_code = (district or "NAT")[:3].upper()
    type_code = emergency_type[:4].upper()
    alert_code = f"ALERT-{dist_code}-{type_code}-{random.randint(100, 999)}"

    now_iso = utcnow_iso()
    new_alert = EmergencyAlert(
        id=alert_id,
        alertCode=alert_code,
        emergencyType=emergency_type,
        title=title.strip(),
        message=message.strip(),
        affectedArea=affected_area.strip(),
        district=district,
        latitude=float(latitude) if latitude is not None else 23.8103,
        longitude=float(longitude) if longitude is not None else 90.4125,
        radiusKm=float(radius_km) if radius_km is not None else 5.0,
        severity=severity,
        issuedByOfficerId=user.id,
        issuedByOfficerName=user.fullName,
        issuedByStation=user.stationOrThana or user.department or "DMP Central Operations",
        startTime=start_time or now_iso,
        expirationTime=expiration_time,
        isActive=True,
        createdAt=now_iso,
    )

    with get_db() as db:
        db.add(new_alert)
        db.commit()
        alert_dict = new_alert.to_dict()

    NotificationService.broadcast_emergency_alert(new_alert.title, new_alert.message, new_alert.id)

    AuditService.log(
        user_id=user.id,
        user_name=user.fullName,
        user_role=user.role,
        action="PUBLISH_TEMPORARY_EMERGENCY_ALERT",
        resource=alert_code,
        resource_id=alert_id,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Emergency Alert [{emergency_type}] published for [{affected_area}]. Valid until: {new_alert.expirationTime}.",
    )

    return jsonify({
        "success": True,
        "alert": alert_dict,
        "message": "Emergency alert successfully published and broadcasted to affected zone."
    }), 201

@police_bp.route("/emergency-alerts/<alert_id>/toggle-active", methods=["POST"])
def toggle_alert_active(alert_id):
    user = g.user
    with get_db() as db:
        alert = db.query(EmergencyAlert).filter(EmergencyAlert.id == alert_id).first()
        if not alert:
            return jsonify({"error": "Emergency alert not found."}), 404

        alert.isActive = not alert.isActive
        db.commit()
        alert_dict = alert.to_dict()

    AuditService.log(
        user_id=user.id,
        user_name=user.fullName,
        user_role=user.role,
        action="REACTIVATE_EMERGENCY_ALERT" if alert.isActive else "DEACTIVATE_EMERGENCY_ALERT",
        resource=alert.alertCode,
        resource_id=alert.id,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Alert status toggled to [{'ACTIVE' if alert.isActive else 'INACTIVE'}].",
    )

    return jsonify({
        "success": True,
        "alert": alert_dict
    })

# 7. SOS Dispatch Management
@police_bp.route("/sos", methods=["GET"])
def get_police_sos_list():
    user = g.user
    with get_db() as db:
        all_sos = db.query(SOSRequest).order_by(SOSRequest.createdAt.desc()).all()
        if user.role == "POLICE":
            filtered_sos = [
                s for s in all_sos
                if JurisdictionService.is_sos_in_police_jurisdiction(user.stationOrThana, s, db)
            ]
        else:
            filtered_sos = all_sos

        return jsonify({
            "success": True,
            "sosRequests": [s.to_dict() for s in filtered_sos]
        })

@police_bp.route("/sos/<sos_id>/respond", methods=["POST"])
def respond_sos(sos_id):
    user = g.user
    data = request.get_json() or {}
    status = data.get("status", "RESPONDING")
    assigned_unit = data.get("assignedUnit")
    notes = data.get("notes")

    with get_db() as db:
        sos = db.query(SOSRequest).filter(SOSRequest.id == sos_id).first()
        if not sos:
            return jsonify({"error": "SOS request not found."}), 404

        # Verify jurisdiction before allowing police response
        if user.role == "POLICE" and not JurisdictionService.is_sos_in_police_jurisdiction(user.stationOrThana, sos, db):
            return jsonify({"error": "This distress beacon is outside your police station's coverage jurisdiction."}), 403

        sos.status = status
        sos.respondedAt = utcnow_iso()
        if assigned_unit:
            sos.assignedUnit = assigned_unit
        if notes:
            sos.notes = notes

        db.commit()
        sos_dict = sos.to_dict()

    NotificationService.create_sos_notification(
        user_id=sos.citizenId,
        title=f"🚨 SOS Status: {sos.status.replace('_', ' ')}",
        message=f"Police Dispatch update: {f'Unit [{assigned_unit}] assigned. ' if assigned_unit else ''}{notes or 'Police units are responding to your location.'}",
        related_id=sos.id,
    )

    AuditService.log(
        user_id=user.id,
        user_name=user.fullName,
        user_role=user.role,
        action="RESPOND_SOS_ALERT",
        resource="SOS_DISPATCH",
        resource_id=sos.id,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Officer responded to citizen SOS. Assigned Unit: [{assigned_unit or 'N/A'}], Status: [{sos.status}].",
    )

    return jsonify({
        "success": True,
        "sos": sos_dict
    })
