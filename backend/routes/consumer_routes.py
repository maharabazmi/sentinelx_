import time
from flask import Blueprint, request, jsonify, g
from ..database import get_db
from ..models import (
    User,
    ConsumerComplaint,
    ShopReputation,
    BarcodeVerification,
    utcnow_iso,
)
from ..middleware.auth import verify_auth, require_roles
from ..services.notification_service import NotificationService
from ..services.audit_service import AuditService
from ..services.jurisdiction_service import (
    is_consumer_in_jurisdiction,
    parse_consumer_jurisdiction,
    is_same_thana,
)
from ..services.email_service import EmailService

consumer_bp = Blueprint("consumer", __name__, url_prefix="/api/consumer")

@consumer_bp.before_request
@verify_auth
def check_consumer_access():
    return require_roles("CONSUMER_RIGHTS", "ADMIN")(lambda: None)()

# 1. DNCRP Dashboard Summary (Strict Jurisdiction & Zero-Baseline Awareness)
@consumer_bp.route("/dashboard-summary", methods=["GET"])
def dashboard_summary():
    user = g.user
    scope = request.args.get("scope", "jurisdiction")

    with get_db() as db:
        all_complaints = db.query(ConsumerComplaint).all()
        all_shops = db.query(ShopReputation).all()

        if user.role == "CONSUMER_RIGHTS":
            station = user.stationOrThana or ""
            thana_kw, dist_kw = parse_consumer_jurisdiction(station)

            # 1. New Grievance Claims:
            # Submitted claims routed to officer's jurisdiction that are unassigned, or assigned to this officer
            new_complaints = len([
                c for c in all_complaints
                if c.status == "SUBMITTED" and (
                    c.assignedOfficerId == user.id or
                    (c.assignedOfficerName and user.fullName.strip().lower() == c.assignedOfficerName.strip().lower()) or
                    (is_consumer_in_jurisdiction(station, c.shopThana, c.shopDistrict) and not c.assignedOfficerId)
                )
            ])

            # 2. Under Review:
            under_review = len([
                c for c in all_complaints
                if c.status == "UNDER_REVIEW" and (
                    c.assignedOfficerId == user.id or
                    (c.assignedOfficerName and user.fullName.strip().lower() == c.assignedOfficerName.strip().lower()) or
                    (is_consumer_in_jurisdiction(station, c.shopThana, c.shopDistrict) and not c.assignedOfficerId)
                )
            ])

            # 3. Field Investigations:
            # Verified / active investigations specifically assigned to this officer
            active_investigations = len([
                c for c in all_complaints
                if c.status in ("VERIFIED", "INVESTIGATION") and (
                    c.assignedOfficerId == user.id or
                    (c.assignedOfficerName and user.fullName.strip().lower() == c.assignedOfficerName.strip().lower())
                )
            ])

            # 4. Resolved Cases:
            # Enforcement orders concluded specifically by this officer
            resolved_cases = len([
                c for c in all_complaints
                if c.status == "RESOLVED" and (
                    c.assignedOfficerId == user.id or
                    (c.assignedOfficerName and user.fullName.strip().lower() == c.assignedOfficerName.strip().lower())
                )
            ])

            # 5. Penalized Establishments:
            # Shops in this officer's jurisdiction that have verified penalties
            jurisdiction_shops = [
                s for s in all_shops
                if is_consumer_in_jurisdiction(station, s.thana, s.district)
            ]
            penalized_shops = len([s for s in jurisdiction_shops if s.verifiedFinesCount > 0])
            total_registered_shops = len(jurisdiction_shops)

            # Counts for queue scope tabs
            my_assigned_count = len([
                c for c in all_complaints
                if c.assignedOfficerId == user.id or
                (c.assignedOfficerName and user.fullName.strip().lower() == c.assignedOfficerName.strip().lower())
            ])
            unassigned_in_station = len([
                c for c in all_complaints
                if not c.assignedOfficerId and not c.assignedOfficerName and
                is_consumer_in_jurisdiction(station, c.shopThana, c.shopDistrict) and
                c.status not in ("RESOLVED", "REJECTED")
            ])

            return jsonify({
                "success": True,
                "stats": {
                    "newComplaints": new_complaints,
                    "underReview": under_review,
                    "activeInvestigations": active_investigations,
                    "resolvedCases": resolved_cases,
                    "totalRegisteredShops": total_registered_shops,
                    "penalizedShopsCount": penalized_shops,
                    "myAssignedCount": my_assigned_count,
                    "unassignedJurisdictionCount": unassigned_in_station,
                    "jurisdiction": station,
                    "thanaKeyword": thana_kw,
                    "districtKeyword": dist_kw,
                }
            })
        else:
            # ADMIN / National Command Overview
            new_complaints = len([c for c in all_complaints if c.status == "SUBMITTED"])
            under_review = len([c for c in all_complaints if c.status == "UNDER_REVIEW"])
            active_investigations = len([c for c in all_complaints if c.status in ("VERIFIED", "INVESTIGATION")])
            resolved_cases = len([c for c in all_complaints if c.status == "RESOLVED"])
            penalized_shops = len([s for s in all_shops if s.verifiedFinesCount > 0])

            return jsonify({
                "success": True,
                "stats": {
                    "newComplaints": new_complaints,
                    "underReview": under_review,
                    "activeInvestigations": active_investigations,
                    "resolvedCases": resolved_cases,
                    "totalRegisteredShops": len(all_shops),
                    "penalizedShopsCount": penalized_shops,
                    "myAssignedCount": len(all_complaints),
                    "unassignedJurisdictionCount": len([c for c in all_complaints if not c.assignedOfficerId]),
                    "jurisdiction": "National Directorate HQ (All Divisions)",
                    "thanaKeyword": "",
                    "districtKeyword": "",
                }
            })

# 2. Get Consumer Complaints (Jurisdiction Scoped with Queue Filters)
@consumer_bp.route("/complaints", methods=["GET"])
def get_complaints():
    user = g.user
    scope = request.args.get("scope", "jurisdiction")
    status = request.args.get("status")
    district = request.args.get("district")
    thana = request.args.get("thana")
    issue_type = request.args.get("issueType")

    station = user.stationOrThana or ""

    with get_db() as db:
        query = db.query(ConsumerComplaint)

        if status and status != "ALL":
            query = query.filter(ConsumerComplaint.status == status)
        if district and district != "ALL":
            query = query.filter(ConsumerComplaint.shopDistrict.ilike(f"%{district}%"))
        if thana and thana != "ALL":
            query = query.filter(ConsumerComplaint.shopThana.ilike(f"%{thana}%"))
        if issue_type and issue_type != "ALL":
            query = query.filter(ConsumerComplaint.issueType == issue_type)

        all_records = query.order_by(ConsumerComplaint.submittedAt.desc()).all()

        if user.role == "CONSUMER_RIGHTS":
            if scope == "my_cases":
                filtered = [
                    c for c in all_records
                    if c.assignedOfficerId == user.id or
                    (c.assignedOfficerName and user.fullName.strip().lower() == c.assignedOfficerName.strip().lower())
                ]
            elif scope == "unassigned":
                filtered = [
                    c for c in all_records
                    if (not c.assignedOfficerId and not c.assignedOfficerName) and
                    is_consumer_in_jurisdiction(station, c.shopThana, c.shopDistrict)
                ]
            else:
                # Default "jurisdiction": in officer's jurisdiction OR assigned directly to this officer
                filtered = [
                    c for c in all_records
                    if is_consumer_in_jurisdiction(station, c.shopThana, c.shopDistrict) or
                    c.assignedOfficerId == user.id or
                    (c.assignedOfficerName and user.fullName.strip().lower() == c.assignedOfficerName.strip().lower())
                ]
        else:
            # ADMIN can view by scope or nationwide
            if scope == "my_cases":
                filtered = [
                    c for c in all_records
                    if c.assignedOfficerId == user.id or
                    (c.assignedOfficerName and user.fullName.strip().lower() == c.assignedOfficerName.strip().lower())
                ]
            elif scope == "unassigned":
                filtered = [
                    c for c in all_records
                    if not c.assignedOfficerId and not c.assignedOfficerName
                ]
            elif scope == "jurisdiction" and station:
                filtered = [
                    c for c in all_records
                    if is_consumer_in_jurisdiction(station, c.shopThana, c.shopDistrict)
                ]
            else:
                filtered = all_records

        return jsonify({
            "success": True,
            "complaints": [c.to_dict() for c in filtered],
            "officerStation": station,
            "scope": scope
        })

# 3. Claim Dispute Investigation (Take Charge)
@consumer_bp.route("/complaints/<complaint_id>/claim", methods=["POST"])
def claim_complaint(complaint_id):
    user = g.user
    with get_db() as db:
        complaint = db.query(ConsumerComplaint).filter(ConsumerComplaint.id == complaint_id).first()
        if not complaint:
            return jsonify({"error": "Complaint not found."}), 404

        if user.role == "CONSUMER_RIGHTS":
            in_jur = is_consumer_in_jurisdiction(user.stationOrThana, complaint.shopThana, complaint.shopDistrict)
            if not in_jur:
                return jsonify({"error": f"Access Denied: Dispute in {complaint.shopThana}, {complaint.shopDistrict} is outside your operational jurisdiction ({user.stationOrThana})."}), 403

        complaint.assignedOfficerId = user.id
        complaint.assignedOfficerName = user.fullName
        if complaint.status == "SUBMITTED":
            complaint.status = "UNDER_REVIEW"

        timeline = complaint.timeline
        timeline.append({
            "timestamp": utcnow_iso(),
            "status": complaint.status,
            "note": f"Claimed by DNCRP Authority {user.fullName} ({user.badgeNumber or user.designation or 'Officer'}).",
            "officerName": user.fullName,
        })
        complaint.timeline = timeline
        db.commit()
        complaint_dict = complaint.to_dict()

    AuditService.log(
        user_id=user.id,
        user_name=user.fullName,
        user_role=user.role,
        action="CLAIM_CONSUMER_DISPUTE",
        resource=complaint.trackingNumber,
        resource_id=complaint.id,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Authority {user.fullName} claimed consumer dispute [{complaint.trackingNumber}].",
    )

    NotificationService.create_complaint_notification(
        user_id=complaint.complainantId,
        title=f"Authority Assigned: {complaint.trackingNumber}",
        message=f"{user.fullName} ({user.stationOrThana}) has taken charge of your consumer dispute.",
        related_id=complaint.id,
    )

    return jsonify({
        "success": True,
        "complaint": complaint_dict,
        "message": f"Successfully claimed dispute {complaint.trackingNumber}."
    })

# 4. Update Complaint Status & Enforce Actions
@consumer_bp.route("/complaints/<complaint_id>/status", methods=["POST"])
def update_complaint_status(complaint_id):
    user = g.user
    data = request.get_json() or {}
    status = data.get("status")
    inspector_notes = data.get("inspectorNotes")
    penalty_imposed = data.get("penaltyImposed")
    note = data.get("note")

    with get_db() as db:
        complaint = db.query(ConsumerComplaint).filter(ConsumerComplaint.id == complaint_id).first()
        if not complaint:
            return jsonify({"error": "Complaint not found."}), 404

        if user.role == "CONSUMER_RIGHTS":
            in_jur = is_consumer_in_jurisdiction(user.stationOrThana, complaint.shopThana, complaint.shopDistrict)
            is_assigned = (complaint.assignedOfficerId == user.id or (complaint.assignedOfficerName and user.fullName.strip().lower() == complaint.assignedOfficerName.strip().lower()))
            if not in_jur and not is_assigned:
                return jsonify({"error": f"Access Denied: Dispute in {complaint.shopThana}, {complaint.shopDistrict} is outside your operational jurisdiction."}), 403

        if status:
            complaint.status = status
        if inspector_notes:
            complaint.inspectorNotes = inspector_notes
        if penalty_imposed:
            complaint.penaltyImposed = penalty_imposed

        # Always bind assignment to acting officer
        complaint.assignedOfficerName = user.fullName
        complaint.assignedOfficerId = user.id

        timeline = complaint.timeline
        timeline.append({
            "timestamp": utcnow_iso(),
            "status": complaint.status,
            "note": note or inspector_notes or f"Status updated to {complaint.status} by DNCRP Authority {user.fullName}.",
            "officerName": user.fullName,
        })
        complaint.timeline = timeline

        # Adjust Shop Trust Score if resolved with penalty
        shop = None
        if complaint.tradeLicenseOrBIN:
            shop = db.query(ShopReputation).filter(ShopReputation.tradeLicenseOrBIN == complaint.tradeLicenseOrBIN).first()
        if not shop:
            shop = db.query(ShopReputation).filter(ShopReputation.shopName.ilike(complaint.shopName)).first()

        if shop and status == "RESOLVED" and penalty_imposed:
            shop.verifiedFinesCount += 1
            shop.resolvedComplaints += 1
            shop.lastInspectedAt = utcnow_iso()
            shop.trustScore = max(1.0, round(shop.trustScore - 0.4, 1))
            if shop.trustScore < 2.0:
                shop.complianceStatus = "SUSPENDED"
            elif shop.trustScore < 3.5:
                shop.complianceStatus = "UNDER_WATCH"

        db.commit()
        complaint_dict = complaint.to_dict()

        # Find complainant citizen for status email
        complainant = db.query(User).filter(User.id == complaint.complainantId).first()
        citizen_email = complainant.email if complainant else None
        citizen_name = complainant.fullName if complainant else complaint.complainantName

    NotificationService.create_complaint_notification(
        user_id=complaint.complainantId,
        title=f"Consumer Dispute Update: {complaint.trackingNumber}",
        message=f"Status updated to {complaint.status}. {f'Enforcement Order: {penalty_imposed}' if penalty_imposed else ''}",
        related_id=complaint.id,
    )

    if citizen_email and "@" in citizen_email:
        try:
            EmailService.send_case_status_update(
                to_email=citizen_email,
                recipient_name=citizen_name,
                case_id=complaint.trackingNumber,
                case_title=f"{complaint.shopName} - {complaint.productName}",
                new_status=complaint.status,
                officer_name=user.fullName,
                officer_station=user.stationOrThana,
                note=penalty_imposed or inspector_notes or note or f"Dispute status updated to {complaint.status}."
            )
        except Exception:
            pass

    AuditService.log(
        user_id=user.id,
        user_name=user.fullName,
        user_role=user.role,
        action="UPDATE_CONSUMER_COMPLAINT",
        resource=complaint.trackingNumber,
        resource_id=complaint.id,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"DNCRP officer updated dispute [{complaint.trackingNumber}] to [{complaint.status}]. Penalty: [{penalty_imposed or 'None'}].",
    )

    return jsonify({
        "success": True,
        "complaint": complaint_dict,
        "message": "Consumer complaint record updated."
    })

# 5. List DNCRP Officers for Station / Directorate
@consumer_bp.route("/officers", methods=["GET"])
def get_officers():
    with get_db() as db:
        officers = db.query(User).filter(User.role == "CONSUMER_RIGHTS").all()
        return jsonify({
            "success": True,
            "officers": [
                {
                    "id": o.id,
                    "fullName": o.fullName,
                    "badgeNumber": o.badgeNumber,
                    "designation": o.designation,
                    "department": o.department,
                    "stationOrThana": o.stationOrThana,
                }
                for o in officers
            ]
        })

# 6. Shop Directory & Trust Scores
@consumer_bp.route("/shops", methods=["GET"])
def get_shops():
    user = g.user
    scope = request.args.get("scope", "all")
    station = user.stationOrThana or ""

    with get_db() as db:
        all_shops = db.query(ShopReputation).order_by(ShopReputation.trustScore.desc()).all()
        if user.role == "CONSUMER_RIGHTS" and scope == "jurisdiction":
            shops = [s for s in all_shops if is_consumer_in_jurisdiction(station, s.thana, s.district)]
        else:
            shops = all_shops

        return jsonify({
            "success": True,
            "shops": [s.to_dict() for s in shops]
        })

@consumer_bp.route("/shops", methods=["POST"])
def register_shop():
    user = g.user
    data = request.get_json() or {}
    shop_name = data.get("shopName")
    trade_license = data.get("tradeLicenseOrBIN")
    address = data.get("address")
    district = data.get("district")
    thana = data.get("thana")
    category = data.get("category", "General Merchandise")
    compliance_status = data.get("complianceStatus", "GOOD")

    if not shop_name or not trade_license or not district or not thana:
        return jsonify({"error": "Shop name, BIN/Trade License, and location are required."}), 400

    shop_id = f"shop-{int(time.time() * 1000)}"
    new_shop = ShopReputation(
        id=shop_id,
        shopName=shop_name.strip(),
        tradeLicenseOrBIN=trade_license.strip(),
        address=address.strip() if address else f"{thana}, {district}",
        district=district.strip(),
        thana=thana.strip(),
        category=category,
        trustScore=4.5,
        totalComplaints=0,
        resolvedComplaints=0,
        verifiedFinesCount=0,
        lastInspectedAt=utcnow_iso(),
        complianceStatus=compliance_status,
    )

    with get_db() as db:
        db.add(new_shop)
        db.commit()
        shop_dict = new_shop.to_dict()

    AuditService.log(
        user_id=user.id,
        user_name=user.fullName,
        user_role=user.role,
        action="REGISTER_MERCHANT_ESTABLISHMENT",
        resource=trade_license,
        resource_id=shop_id,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"New merchant registered into DNCRP Surveillance index: [{shop_name}].",
    )

    return jsonify({
        "success": True,
        "shop": shop_dict
    }), 201

# 5. Barcode Product Registry
@consumer_bp.route("/barcodes", methods=["GET"])
def get_barcodes():
    with get_db() as db:
        barcodes = db.query(BarcodeVerification).all()
        return jsonify({
            "success": True,
            "barcodes": [b.to_dict() for b in barcodes]
        })

@consumer_bp.route("/barcodes", methods=["POST"])
def register_barcode():
    user = g.user
    data = request.get_json() or {}
    barcode = data.get("barcode")
    product_name = data.get("productName")
    company_name = data.get("companyName")
    bsti_standard = data.get("bstiStandard", "BSTI Standard BDS 2026")
    mrp = data.get("mrp", 100.0)
    status = data.get("status", "AUTHENTIC")

    if not barcode or not product_name or not company_name:
        return jsonify({"error": "Barcode, Product Name, and Company are required."}), 400

    new_barcode = BarcodeVerification(
        barcode=barcode.strip(),
        productName=product_name.strip(),
        companyName=company_name.strip(),
        bstiStandard=bsti_standard,
        mrp=float(mrp),
        isRegistered=(status != "COUNTERFEIT_FLAGGED"),
        status=status,
    )

    with get_db() as db:
        db.merge(new_barcode)
        db.commit()
        barcode_dict = new_barcode.to_dict()

    AuditService.log(
        user_id=user.id,
        user_name=user.fullName,
        user_role=user.role,
        action="UPDATE_BARCODE_REGISTRY",
        resource=barcode,
        ip_address=request.remote_addr,
        status="SUCCESS",
        details=f"Product barcode [{barcode}] registered with status [{new_barcode.status}].",
    )

    return jsonify({
        "success": True,
        "product": barcode_dict
    }), 201
