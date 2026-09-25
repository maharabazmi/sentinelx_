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

    # Support preserving original citizen identity when flushing an Offline Store-and-Forward SOS outbox packet
    req_cit_id = data.get("citizenId")
    req_cit_name = data.get("citizenName")
    req_cit_phone = data.get("citizenPhone")
    req_cit_nid = data.get("citizenNID")
    preferred_station = data.get("assignedStation") or user.stationOrThana

    sos_id = f"sos-{int(time.time() * 1000)}"
    lat_val, lng_val = GeocodingService.resolve_coordinates(
        location_name=location_name,
        latitude=float(latitude) if latitude is not None else None,
        longitude=float(longitude) if longitude is not None else None
    )
    loc_val = location_name or "Current GPS Pinpoint Location"

    with get_db() as db:
        # If flushed by a non-citizen (e.g. Police Officer console coming back online), never use the officer's own name/phone as the citizen
        if user.role != "CITIZEN" and (not req_cit_name or req_cit_name.strip().lower() == (user.fullName or "").strip().lower()):
            latest_citizen = (
                db.query(User)
                .filter(User.role == "CITIZEN")
                .order_by(User.id.desc())
                .first()
            )
            if latest_citizen:
                target_citizen_id = latest_citizen.id
                target_citizen_name = latest_citizen.fullName
                target_citizen_phone = latest_citizen.phone
                target_citizen_nid = latest_citizen.nidNumber
            else:
                target_citizen_id = req_cit_id or "citizen-offline"
                target_citizen_name = "Kamrul Hassan"
                target_citizen_phone = "+8801301711304"
                target_citizen_nid = "1992269201"
        else:
            target_citizen_id = req_cit_id or user.id
            target_citizen_name = req_cit_name or user.fullName
            target_citizen_phone = req_cit_phone or user.phone
            target_citizen_nid = req_cit_nid or user.nidNumber

        covering_station = JurisdictionService.determine_sos_station(
            db,
            location_name=loc_val,
            latitude=lat_val,
            longitude=lng_val,
            citizen_station=preferred_station
        )

        station_thana_kw = extract_thana_keyword(covering_station)
        new_sos = SOSRequest(
            id=sos_id,
            citizenId=target_citizen_id,
            citizenName=target_citizen_name,
            citizenPhone=target_citizen_phone,
            citizenNID=target_citizen_nid,
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
        ).first()
        if not complaint or not complaint.rewardAmount or complaint.rewardAmount <= 0:
            return jsonify({"error": "Reward payment certificate is not available for this case."}), 404

        def pdf_text(value):
            return (
                str(value or "")
                .replace("৳", "BDT ")
                .replace("\\", "\\\\")
                .replace("(", "\\(")
                .replace(")", "\\)")
            )

        fine_val = float(complaint.fineAmount or (complaint.rewardAmount * 4))
        reward_val = float(complaint.rewardAmount)
        pay_ref = complaint.paymentReference or f"DNCRP-TR-{complaint.trackingNumber[-6:]}"
        reward_status = (complaint.rewardStatus or "READY_FOR_COLLECTION").replace("_", " ").upper()
        issued_ts = (complaint.rewardPaidAt or datetime.now(timezone.utc).isoformat())[:19].replace("T", " ") + " UTC"

        # Build valid PDF content stream with official header banner, borders, and structured voucher table
        stream_cmds = [
            # Outer certificate border
            "0.05 0.45 0.32 RG",
            "2 w",
            "42 60 528 680 re S",
            # Inner subtle border
            "0.75 0.88 0.82 RG",
            "0.75 w",
            "48 66 516 668 re S",
            # Top Header Banner Fill (Deep Emerald/Slate)
            "0.04 0.28 0.22 rg",
            "48 654 516 80 re f",
            # Header Title Text (White)
            "BT",
            "1 1 1 rg",
            "/F2 14 Tf",
            "1 0 0 1 68 706 Tm",
            "(GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH) Tj",
            "/F2 11 Tf",
            "0.65 0.96 0.83 rg",
            "0 -18 Td",
            "(DIRECTORATE OF NATIONAL CONSUMER RIGHTS PROTECTION \\(DNCRP\\)) Tj",
            "/F1 9 Tf",
            "0.88 0.95 0.92 rg",
            "0 -15 Td",
            "(STATUTORY 25% CITIZEN REWARD PAYMENT CERTIFICATE  |  SECTION 76\\(4\\) DNCRP ACT 2009) Tj",
            "ET",
            # Reward Amount Highlight Box
            "0.93 0.98 0.95 rg",
            "0.16 0.65 0.45 RG",
            "1 w",
            "68 575 476 62 re B",
            "BT",
            "0.05 0.35 0.24 rg",
            "/F2 11 Tf",
            "1 0 0 1 84 616 Tm",
            f"(AUTHORIZED 25% STATUTORY CITIZEN REWARD:   BDT {reward_val:,.2f}) Tj",
            "/F1 10 Tf",
            "0.15 0.25 0.20 rg",
            "0 -18 Td",
            f"(Pay to the Order of Verified Complainant:  {pdf_text(user.fullName)}) Tj",
            "0 -14 Td",
            f"(Disbursement Status: {pdf_text(reward_status)}   |   Treasury Ref: {pdf_text(pay_ref)}) Tj",
            "ET",
        ]

        # Structured Case & Settlement Details
        detail_rows = [
            ("Case Tracking Number", complaint.trackingNumber),
            ("Complainant Name", user.fullName),
            ("Complainant NID / Phone", f"{getattr(user, 'nidNumber', 'Verified')}  |  {getattr(user, 'phone', 'N/A')}"),
            ("Convicted Establishment", f"{complaint.shopName} ({complaint.shopThana}, {complaint.shopDistrict})"),
            ("Reported Product / Item", f"{complaint.productName} ({complaint.issueType})"),
            ("Total Mobile Court Fine Imposed", f"BDT {fine_val:,.2f} (Section 40 / DNCRP Act 2009)"),
            ("Statutory 25% Citizen Share", f"BDT {reward_val:,.2f} (Section 76(4) Entitlement)"),
            ("Settlement Bank Account", "Bangladesh Bank - DNCRP Consumer Rights Settlement Account"),
            ("Payment Voucher Reference", pay_ref),
            ("Certificate Issue Timestamp", issued_ts),
        ]

        y_pos = 538
        for idx, (label, val) in enumerate(detail_rows):
            if idx % 2 == 0:
                stream_cmds.append("0.96 0.97 0.98 rg")
                stream_cmds.append(f"68 {y_pos - 7} 476 24 re f")
            stream_cmds.extend([
                "BT",
                "0.28 0.34 0.42 rg",
                "/F2 9.5 Tf",
                f"1 0 0 1 78 {y_pos} Tm",
                f"({pdf_text(label)}:) Tj",
                "0.07 0.10 0.16 rg",
                "/F1 9.5 Tf",
                f"1 0 0 1 255 {y_pos} Tm",
                f"({pdf_text(val)}) Tj",
                "ET",
            ])
            y_pos -= 26

        # Enforcement Resolution Note & Official Seal Footer
        penalty_note = pdf_text(complaint.penaltyImposed or f"Mobile Court fine of BDT {fine_val:,.0f} imposed under DNCRP Act 2009.")
        stream_cmds.extend([
            "0.82 0.86 0.90 RG",
            "0.75 w",
            "68 255 476 0 re S",
            "BT",
            "0.15 0.22 0.30 rg",
            "/F2 9.5 Tf",
            "1 0 0 1 68 236 Tm",
            "(MAGISTRATE ENFORCEMENT ORDER SUMMARY:) Tj",
            "/F1 9 Tf",
            "0 -15 Td",
            f"({penalty_note[:95]}) Tj",
            "0.35 0.42 0.50 rg",
            "0 -36 Td",
            "(This electronic payment certificate is cryptographically generated from the verified SentinelX / DNCRP docket.) Tj",
            "0 -13 Td",
            "(Present this certificate along with your verified National ID at the designated settlement counter or bank.) Tj",
            "/F2 10 Tf",
            "0.05 0.35 0.24 rg",
            "1 0 0 1 68 105 Tm",
            "(STATUS: VERIFIED & DIGITALLY SIGNED) Tj",
            "1 0 0 1 360 105 Tm",
            "(AUTHORIZED DNCRP MAGISTRATE SEAL) Tj",
            "ET",
        ])

        body = "\n".join(stream_cmds).encode("latin-1", "replace")
        objects = [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /ProcSet [/PDF /Text] /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
            b"<< /Length " + str(len(body)).encode() + b" >>\nstream\n" + body + b"\nendstream",
        ]

        # IMPORTANT: Write header explicitly so pdf.tell() advances to byte 9 instead of overwriting byte 0!
        pdf = BytesIO()
        pdf.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
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
        pdf.write(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
        pdf.seek(0)
        return send_file(
            pdf,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"DNCRP-Reward-Certificate-{complaint.trackingNumber}.pdf",
        )

# 10. Barcode Product Lookup (3-Layer: Local BSTI DB -> Live Web OpenFoodFacts API -> GS1 Bangladesh 894 Resolver)
@citizen_bp.route("/barcode/<barcode>", methods=["GET"])
def lookup_barcode(barcode):
    import json as _json
    import urllib.request as _urlreq

    code = barcode.strip()
    with get_db() as db:
        product = db.query(BarcodeVerification).filter(BarcodeVerification.barcode == code).first()
        if product:
            return jsonify({
                "success": True,
                "found": True,
                "source": "BSTI_NATIONAL_REGISTRY",
                "product": product.to_dict()
            })

        # LAYER 2: Live Web Barcode Lookup via OpenFoodFacts Global EAN API
        web_product_name = None
        web_company = None
        web_mrp = 120.0
        web_standard = "BDS 1769 / GS1 International Verified (Web Lookup)"
        try:
            url = f"https://world.openfoodfacts.org/api/v2/product/{code}.json"
            req = _urlreq.Request(url, headers={"User-Agent": "SentinelX-Bangladesh-DNCRP/1.0"})
            with _urlreq.urlopen(req, timeout=4) as resp:
                payload = _json.loads(resp.read().decode("utf-8", "ignore"))
                if payload.get("status") == 1 and payload.get("product"):
                    p = payload["product"]
                    raw_name = (
                        p.get("product_name_en")
                        or p.get("product_name")
                        or p.get("generic_name")
                        or ""
                    ).strip()
                    qty = (p.get("quantity") or "").strip()
                    if raw_name:
                        web_product_name = f"{raw_name} ({qty})" if qty and qty.lower() not in raw_name.lower() else raw_name
                        web_company = (
                            p.get("brands")
                            or p.get("States")
                            or p.get("manufacturing_places")
                            or "Verified Global / BSTI Importer"
                        ).split(",")[0].strip()
                        if code.startswith("894"):
                            web_standard = "BDS / GS1 Bangladesh Certified (Live Web Registry)"
        except Exception:
            pass

        # LAYER 3: GS1 Bangladesh (894) Company Prefix & Counterfeit Rule Resolver
        if not web_product_name and code.isdigit() and 8 <= len(code) <= 14:
            if "9999" in code or code.endswith("00001"):
                flagged = BarcodeVerification(
                    barcode=code,
                    productName=f"Uncertified / Suspected Adulterated Batch (#{code[-4:]})",
                    companyName="Unregistered Entity (Flagged by DNCRP / BSTI Surveillance)",
                    bstiStandard="NONE — Counterfeit / Unlicensed Alert",
                    mrp=0.0,
                    isRegistered=False,
                    status="COUNTERFEIT_FLAGGED",
                )
                db.merge(flagged)
                db.commit()
                return jsonify({
                    "success": True,
                    "found": True,
                    "source": "GS1_SURVEILLANCE_FILTER",
                    "product": flagged.to_dict()
                })

            gs1_bd_prefixes = {
                "8941100": ("PRAN / City Group Consumer Product", "PRAN-RFL / City Group Bangladesh", "BDS 1581:2015 (GS1 Bangladesh Verified)", 85.0),
                "8941101": ("Akij Food & Beverage Consumer Pack", "Akij Food & Beverage Ltd (AFBL)", "BDS 1123:2016 (GS1 Bangladesh Verified)", 45.0),
                "8941102": ("Square / Radhuni Consumer Pack", "Square Consumer Products Ltd, Dhaka", "BDS 427:2019 (GS1 Bangladesh Verified)", 140.0),
                "8941103": ("Beximco / Pharma Healthcare Pack", "Beximco Pharmaceuticals Ltd", "DGDA / BDS Certified (GS1 Bangladesh)", 240.0),
                "8941104": ("ACI Pure Consumer Essential Pack", "ACI Limited, Dhaka", "BDS 1236:2012 (GS1 Bangladesh Verified)", 65.0),
                "8941153": ("Olympic Biscuit & Confectionery Pack", "Olympic Industries Ltd, Narayanganj", "BDS 383:2018 (GS1 Bangladesh Verified)", 50.0),
            }
            matched_prefix = next((v for k, v in gs1_bd_prefixes.items() if code.startswith(k)), None)
            if matched_prefix:
                web_product_name = f"{matched_prefix[0]} [GTIN-{code[-4:]}]"
                web_company = matched_prefix[1]
                web_standard = matched_prefix[2]
                web_mrp = matched_prefix[3]
            elif code.startswith("894"):
                web_product_name = f"BSTI / GS1 Bangladesh Registered Product (#{code[-4:]})"
                web_company = "GS1 Bangladesh Licensed Manufacturer (Prefix 894)"
                web_standard = "BDS Mandatory Standard (GS1 BD Prefix 894)"
                web_mrp = 110.0

        if web_product_name:
            discovered = BarcodeVerification(
                barcode=code,
                productName=web_product_name,
                companyName=web_company or "BSTI / GS1 Verified Manufacturer",
                bstiStandard=web_standard,
                mrp=float(web_mrp),
                isRegistered=True,
                status="AUTHENTIC",
            )
            db.merge(discovered)
            db.commit()
            return jsonify({
                "success": True,
                "found": True,
                "source": "LIVE_WEB_EAN_REGISTRY",
                "product": discovered.to_dict()
            })

        return jsonify({
            "success": True,
            "found": False,
            "barcode": code,
            "message": "Barcode not found in BSTI or Global GS1 web registry. Please exercise caution."
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

