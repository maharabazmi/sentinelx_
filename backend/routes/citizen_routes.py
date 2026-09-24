import time
import random
from io import BytesIO
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g, send_file
from ..database import get_db
from ..models import (
    CrimeReport,
    ConsumerComplaint,
    SOSRequest,
    EmergencyAlert,
    BarcodeVerification,
    User,
    utcnow_iso,
)
from ..middleware.auth import verify_auth, require_roles
from ..services.notification_service import NotificationService
from ..services.audit_service import AuditService
from ..services.jurisdiction_service import JurisdictionService, extract_thana_keyword
from ..services.jurisdiction_service import get_consumer_officer_district, is_consumer_district_match
from ..services.geocoding_service import GeocodingService

citizen_bp = Blueprint("citizen", __name__, url_prefix="/api/citizen")

# Middleware: Verify auth and allow all civil roles (Citizens, Police, Consumer Rights, Admins)
@citizen_bp.before_request
@verify_auth
def check_citizen_access():
    return require_roles("CITIZEN", "POLICE", "CONSUMER_RIGHTS", "ADMIN")(lambda: None)()

# 1. Submit Crime Report
@citizen_bp.route("/reports", methods=["POST"])
def submit_crime_report():
    user = g.user
    data = request.get_json() or {}

    crime_type = data.get("crimeType")
    title = data.get("title")
    description = data.get("description")
    location_name = data.get("locationName")
    district = data.get("district")
    thana = data.get("thana")
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    occurred_at = data.get("occurredAt")
    severity = data.get("severity", "MEDIUM")
    request_confidentiality = bool(data.get("requestConfidentiality", False))
    evidence = data.get("evidence", [])

    if not crime_type or not title or not description or not location_name or not district or not thana:
        return jsonify({"error": "Please provide all mandatory crime incident details."}), 400

    dist_prefix = district[:3].upper()
    current_year = datetime.now().year
    rand_num = random.randint(1000, 9999)
    case_id = f"CR-{dist_prefix}-{current_year}-{rand_num}"
    report_id = f"rep-{int(time.time() * 1000)}"

    now_iso = utcnow_iso()
    new_report = CrimeReport(
        id=report_id,
        caseId=case_id,
        reporterId=user.id,
        reporterName=user.fullName,
        reporterPhone=user.phone,
        reporterNID=user.nidNumber,
        requestConfidentiality=request_confidentiality,
        crimeType=crime_type,
        title=title.strip(),
        description=description.strip(),
        locationName=location_name.strip(),
        district=district.strip(),
        thana=thana.strip(),
        latitude=GeocodingService.resolve_coordinates(
            location_name=location_name,
            thana=thana,
            district=district,
            latitude=float(latitude) if latitude is not None else None,
            longitude=float(longitude) if longitude is not None else None
        )[0],
        longitude=GeocodingService.resolve_coordinates(
            location_name=location_name,
            thana=thana,
            district=district,
            latitude=float(latitude) if latitude is not None else None,
            longitude=float(longitude) if longitude is not None else None
        )[1],
        occurredAt=occurred_at or now_iso,
        submittedAt=now_iso,
        severity=severity,
        status="SUBMITTED",
        evidence=evidence,
        investigationUpdates=[{
            "id": f"inv-{int(time.time() * 1000)}",
            "timestamp": now_iso,
            "officerName": "System Automatic Ingestion",
            "status": "SUBMITTED",
            "note": "Report officially lodged into National Public Safety Registry. Awaiting police preliminary review."
        }],
    )

    with get_db() as db:
        db.add(new_report)
        db.commit()
        report_dict = new_report.to_dict()

    thana_officers = []
    with get_db() as db:
        thana_officers = JurisdictionService.find_officers_for_station(db, new_report.thana)

    NotificationService.notify_police_thana(
        officers=thana_officers,
        title=f"New Thana Queue Case ({case_id})",
        message=(
            f'A new crime report "{title}" was added to the shared {thana} queue. '
            "Any officer at this Thana may accept, reject, or reassign it."
        ),
        related_id=report_id,
    )

    NotificationService.create_case_notification(
        user_id=user.id,
        title=f"Crime Report Lodged ({case_id})",
        message=(
            f'Your report "{title}" has been registered with status SUBMITTED and placed in '
            f'the shared {thana} Police Station queue. Tracking case ID is {case_id}.'
        ),
        related_id=report_id,
    )

    AuditService.log(
        user_id=user.id,
        user_name=user.fullName,
        user_role=user.role,
        action="LODGE_CRIME_REPORT",
        resource=case_id,
        resource_id=report_id,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=(
            f"Crime report [{crime_type}] lodged in {thana}, {district}. "
            f"Notified {len(thana_officers)} Thana officer(s); awaiting officer acceptance."
        ),
    )

    return jsonify({
        "success": True,
        "report": report_dict,
        "assignedOfficer": None,
        "message": f"Report successfully submitted to the shared {thana} Police Station queue."
    }), 201

# 2. Get Citizen's Own Reports
@citizen_bp.route("/reports", methods=["GET"])
def get_my_reports():
    user = g.user
    with get_db() as db:
        reports = (
            db.query(CrimeReport)
            .filter(CrimeReport.reporterId == user.id)
            .order_by(CrimeReport.submittedAt.desc())
            .all()
        )
        return jsonify({
            "success": True,
            "reports": [r.to_dict() for r in reports]
        })

# 3. Submit Consumer Complaint
@citizen_bp.route("/complaints", methods=["POST"])
def submit_consumer_complaint():
    user = g.user
    data = request.get_json() or {}

    shop_name = data.get("shopName")
    shop_address = data.get("shopAddress")
    shop_district = data.get("shopDistrict")
    shop_thana = data.get("shopThana")
    trade_license = data.get("tradeLicenseOrBIN")
    product_name = data.get("productName")
    brand_name = data.get("brandName")
    barcode = data.get("barcode")
    batch_number = data.get("batchNumber")
    issue_type = data.get("issueType")
    price_paid = data.get("pricePaid")
    mrp = data.get("mrp")
    description = data.get("description")
    evidence = data.get("evidence", [])

    if not shop_name or not shop_district or not shop_thana or not product_name or not issue_type or not description:
        return jsonify({"error": "Please provide shop details, product name, issue type, and description."}), 400

    dist_prefix = shop_district[:3].upper()
    current_year = datetime.now().year
    rand_num = random.randint(1000, 9999)
    tracking_number = f"DNCRP-{dist_prefix}-{current_year}-{rand_num}"
    complaint_id = f"comp-{int(time.time() * 1000)}"

    now_iso = utcnow_iso()
    new_complaint = ConsumerComplaint(
        id=complaint_id,
        trackingNumber=tracking_number,
        complainantId=user.id,
        complainantName=user.fullName,
        complainantPhone=user.phone,
        shopName=shop_name.strip(),
        shopAddress=shop_address.strip() if shop_address else f"{shop_thana}, {shop_district}",
        shopDistrict=shop_district.strip(),
        shopThana=shop_thana.strip(),
        tradeLicenseOrBIN=trade_license.strip() if trade_license else None,
        productName=product_name.strip(),
        brandName=brand_name.strip() if brand_name else None,
        barcode=barcode.strip() if barcode else None,
        batchNumber=batch_number.strip() if batch_number else None,
        issueType=issue_type,
        pricePaid=float(price_paid) if (issue_type == "PRICE_GOUGING" and price_paid is not None) else None,
        mrp=float(mrp) if (issue_type == "PRICE_GOUGING" and mrp is not None) else None,
        description=description.strip(),
        submittedAt=now_iso,
        status="SUBMITTED",
        workflowQueue="INTAKE",
        evidence=evidence,
        timeline=[{
            "timestamp": now_iso,
            "status": "SUBMITTED",
            "note": "Consumer grievance registered. Awaiting DNCRP officer assignment."
        }],
    )

    with get_db() as db:
        db.add(new_complaint)
        db.commit()
        complaint_dict = new_complaint.to_dict()
        all_consumer_officers = db.query(User).filter(User.role == "CONSUMER_RIGHTS").all()
        intake_officer_ids = [
            officer.id for officer in all_consumer_officers
            if (officer.designation or "").strip().casefold() == "complaint intake officer" and
            (not get_consumer_officer_district(officer) or is_consumer_district_match(get_consumer_officer_district(officer), shop_district))
        ]

    NotificationService.create_complaint_notification(
        user_id=user.id,
        title=f"Complaint Registered: {tracking_number}",
        message=f"Your complaint regarding {shop_name} has been received by the Consumer Rights Directorate.",
        related_id=complaint_id,
    )

    for officer_id in intake_officer_ids:
        NotificationService.create_complaint_notification(
            user_id=officer_id,
            title=f"New DNCRP Dispute: {tracking_number}",
            message=f"A citizen submitted a new dispute against {shop_name}. Complaint Intake review is required.",
            related_id=complaint_id,
        )

    AuditService.log(
        user_id=user.id,
        user_name=user.fullName,
        user_role=user.role,
        action="LODGE_CONSUMER_COMPLAINT",
        resource=tracking_number,
        resource_id=complaint_id,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Consumer complaint filed against [{shop_name}] for [{issue_type}].",
    )

    return jsonify({
        "success": True,
        "complaint": complaint_dict,
        "message": "Consumer complaint submitted to Directorate of National Consumers Right Protection (DNCRP)."
    }), 201

# 4. Get Citizen's Own Complaints
@citizen_bp.route("/complaints", methods=["GET"])
def get_my_complaints():
    user = g.user
    with get_db() as db:
        complaints = (
            db.query(ConsumerComplaint)
            .filter(ConsumerComplaint.complainantId == user.id)
            .order_by(ConsumerComplaint.submittedAt.desc())
            .all()
        )
        return jsonify({
            "success": True,
            "complaints": [c.to_dict() for c in complaints]
        })

# 5. Trigger Emergency SOS
@citizen_bp.route("/sos", methods=["POST"])
def trigger_sos():
    user = g.user
    data = request.get_json() or {}
    location_name = data.get("locationName")
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    sos_id = f"sos-{int(time.time() * 1000)}"
    lat_val, lng_val = GeocodingService.resolve_coordinates(
        location_name=location_name,
        latitude=float(latitude) if latitude is not None else None,
        longitude=float(longitude) if longitude is not None else None
    )
    loc_val = location_name or "Current GPS Pinpoint Location"

    with get_db() as db:
        covering_station = JurisdictionService.determine_sos_station(
            db,
            location_name=loc_val,
            latitude=lat_val,
            longitude=lng_val,
            citizen_station=user.stationOrThana
        )

        station_thana_kw = extract_thana_keyword(covering_station)
        new_sos = SOSRequest(
            id=sos_id,
            citizenId=user.id,
            citizenName=user.fullName,
            citizenPhone=user.phone,
            citizenNID=user.nidNumber,
            locationName=loc_val,
            latitude=lat_val,
            longitude=lng_val,
            status="SOS_SENT",
            createdAt=utcnow_iso(),
            assignedStation=covering_station,
            assignedUnit=f"Awaiting Dispatch ({station_thana_kw} Station)",
        )

        db.add(new_sos)
        db.commit()
        sos_dict = new_sos.to_dict()

        # Send alert notification to officers stationed at the responsible police station
        try:
            target_officers = JurisdictionService.find_officers_for_station(db, covering_station)
            for off in target_officers:
                NotificationService.create_sos_notification(
                    user_id=off.id,
                    title="🚨 SOS BEACON IN YOUR JURISDICTION",
                    message=f"Emergency distress beacon triggered at [{loc_val}]. Assigned to your station ({covering_station}).",
                    related_id=sos_id,
                )
        except Exception:
            pass

    NotificationService.create_sos_notification(
        user_id=user.id,
        title="🚨 EMERGENCY SOS BROADCAST ACTIVE",
        message=f"Your distress signal has been routed to {covering_station}. Police units are alerted.",
        related_id=sos_id,
    )

    AuditService.log(
        user_id=user.id,
        user_name=user.fullName,
        user_role=user.role,
        action="EMERGENCY_SOS_TRIGGERED",
        resource="SOS_DISPATCH",
        resource_id=sos_id,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Distress beacon triggered at [{new_sos.locationName} - Lat: {new_sos.latitude}, Lng: {new_sos.longitude}] assigned to [{covering_station}].",
    )

    return jsonify({
        "success": True,
        "sos": sos_dict,
        "message": f"Emergency SOS transmitted to {covering_station} Dispatch."
    }), 201

# 6. Get Citizen Active SOS Status
@citizen_bp.route("/sos/active", methods=["GET"])
def get_active_sos():
    user = g.user
    with get_db() as db:
        active_sos = (
            db.query(SOSRequest)
            .filter(SOSRequest.citizenId == user.id, SOSRequest.status != "RESOLVED")
            .order_by(SOSRequest.createdAt.desc())
            .first()
        )
        return jsonify({
            "success": True,
            "activeSOS": active_sos.to_dict() if active_sos else None
        })

@citizen_bp.route("/sos/resolve", methods=["POST"])
def resolve_active_sos():
    user = g.user
    data = request.get_json() or {}
    sos_id = data.get("sosId")

    with get_db() as db:
        query = db.query(SOSRequest).filter(SOSRequest.citizenId == user.id, SOSRequest.status != "RESOLVED")
        if sos_id:
            query = query.filter(SOSRequest.id == sos_id)
        active_sos = query.first()

        if not active_sos:
            return jsonify({"success": True, "message": "No active SOS beacon found."})

        active_sos.status = "RESOLVED"
        active_sos.notes = (active_sos.notes or "") + " [Resolved/Stood Down by Citizen]"
        db.commit()

        AuditService.log(
            user_id=user.id,
            user_name=user.fullName,
            user_role=user.role,
            action="EMERGENCY_SOS_RESOLVED_BY_CITIZEN",
            resource="SOS_DISPATCH",
            resource_id=active_sos.id,
            ip_address=request.remote_addr,
            status="SUCCESS",
            details="Citizen marked their active emergency SOS as safe / resolved.",
        )

        return jsonify({
            "success": True,
            "message": "Emergency SOS beacon resolved. You are marked safe."
        })

# 7. Get Active Emergency Alerts for Citizens
@citizen_bp.route("/emergency-alerts", methods=["GET"])
def get_citizen_emergency_alerts():
    now_iso = utcnow_iso()
    with get_db() as db:
        alerts = (
            db.query(EmergencyAlert)
            .filter(EmergencyAlert.isActive == True, EmergencyAlert.expirationTime > now_iso)
            .order_by(EmergencyAlert.createdAt.desc())
            .all()
        )
        return jsonify({
            "success": True,
            "alerts": [a.to_dict() for a in alerts]
        })

# 8. Notifications
@citizen_bp.route("/notifications", methods=["GET"])
def get_notifications():
    user = g.user
    notifs = NotificationService.get_user_notifications(user.id)
    return jsonify({
        "success": True,
        "notifications": notifs
    })

# 9. Mark Notification Read
@citizen_bp.route("/notifications/<notif_id>/read", methods=["POST"])
def mark_notification_read(notif_id):
    user = g.user
    NotificationService.mark_as_read(notif_id, user.id)
    return jsonify({"success": True})

@citizen_bp.route("/consumer/rewards/<complaint_id>/e-check.pdf", methods=["GET"])
def download_reward_echeck(complaint_id):
    user = g.user
    with get_db() as db:
        complaint = db.query(ConsumerComplaint).filter(
            ConsumerComplaint.id == complaint_id,
            ConsumerComplaint.complainantId == user.id,
            ConsumerComplaint.status == "RESOLVED",
        ).first()
        if not complaint or not complaint.rewardAmount or complaint.rewardAmount <= 0:
            return jsonify({"error": "Reward e-check is not available for this case."}), 404

        def pdf_text(value):
            return str(value or "").replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

        lines = [
            "SENTINELX / DNCRP ELECTRONIC REWARD E-CHECK",
            "Government Consumer Rights Settlement Record",
            "",
            f"Pay to the order of: {user.fullName}",
            f"Fine collected: BDT {(complaint.fineAmount or complaint.rewardAmount * 4):,.2f}",
            f"Amount: BDT {complaint.rewardAmount:,.2f}",
            f"Reward status: {(complaint.rewardStatus or 'READY_FOR_COLLECTION').replace('_', ' ').title()}",
            f"Payment reference: {complaint.paymentReference or 'Pending assignment'}",
            "Settlement bank: Government Consumer Rights Settlement Account",
            f"Case tracking number: {complaint.trackingNumber}",
            f"Issue: {complaint.issueType}",
            f"Merchant: {complaint.shopName}",
            f"Issued: {(complaint.rewardPaidAt or datetime.now(timezone.utc).isoformat())[:19].replace('T', ' ')} UTC",
            "",
            "This electronic reward certificate is generated from the verified DNCRP case record.",
            "It is not a negotiable bank instrument until processed by the authorized settlement bank.",
        ]
        content = ["BT", "/F1 12 Tf", "0 0 0 rg", "1 0 0 1 72 740 Tm"]
        for index, line in enumerate(lines):
            if index:
                content.append("0 -24 Td")
            content.append(f"({pdf_text(line)}) Tj")
        content.append("ET")
        body = "\n".join(content).encode("latin-1", "replace")
        objects = [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /ProcSet [/PDF /Text] /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            b"<< /Length " + str(len(body)).encode() + b" >>\nstream\n" + body + b"\nendstream",
        ]
        pdf = BytesIO(b"%PDF-1.4\n")
        offsets = [0]
        for number, obj in enumerate(objects, start=1):
            offsets.append(pdf.tell())
            pdf.write(f"{number} 0 obj\n".encode())
            pdf.write(obj)
            pdf.write(b"\nendobj\n")
        xref = pdf.tell()
        pdf.write(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
        for offset in offsets[1:]:
            pdf.write(f"{offset:010d} 00000 n \n".encode())
        pdf.write(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
        pdf.seek(0)
        return send_file(pdf, mimetype="application/pdf", as_attachment=True, download_name=f"reward-e-check-{complaint.trackingNumber}.pdf")

# 10. Barcode Product Lookup
@citizen_bp.route("/barcode/<barcode>", methods=["GET"])
def lookup_barcode(barcode):
    code = barcode.strip()
    with get_db() as db:
        product = db.query(BarcodeVerification).filter(BarcodeVerification.barcode == code).first()
        if not product:
            return jsonify({
                "success": True,
                "found": False,
                "barcode": code,
                "message": "Barcode not found in BSTI certified registry. Please exercise caution."
            })

        return jsonify({
            "success": True,
            "found": True,
            "product": product.to_dict()
        })

# 11. SentinelX Dual-Engine AI Civic & Legal Copilot (4-Tier Gemini Cascade + Local SQLite/Legal RAG)
@citizen_bp.route("/assistant", methods=["POST"])
def ask_citizen_assistant():
    from ..services.chatbot_service import ChatbotService
    user = g.user
    data = request.get_json() or {}
    message = data.get("message", "")
    history = data.get("history", [])
    result = ChatbotService.process_message(user=user, message=message, history=history)
    return jsonify({
        "success": True,
        **result,
    })

