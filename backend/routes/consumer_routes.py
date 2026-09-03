import time
from flask import Blueprint, request, jsonify, g
from ..database import get_db
from ..models import (
    ConsumerComplaint,
    ShopReputation,
    BarcodeVerification,
    utcnow_iso,
)
from ..middleware.auth import verify_auth, require_roles
from ..services.notification_service import NotificationService
from ..services.audit_service import AuditService

consumer_bp = Blueprint("consumer", __name__, url_prefix="/api/consumer")

@consumer_bp.before_request
@verify_auth
def check_consumer_access():
    return require_roles("CONSUMER_RIGHTS", "ADMIN")(lambda: None)()

# 1. DNCRP Dashboard Summary
@consumer_bp.route("/dashboard-summary", methods=["GET"])
def dashboard_summary():
    with get_db() as db:
        complaints = db.query(ConsumerComplaint).all()
        shops = db.query(ShopReputation).all()

        new_complaints = len([c for c in complaints if c.status == "SUBMITTED"])
        under_review = len([c for c in complaints if c.status == "UNDER_REVIEW"])
        active_investigations = len([c for c in complaints if c.status in ("VERIFIED", "INVESTIGATION")])
        resolved_cases = len([c for c in complaints if c.status == "RESOLVED"])
        penalized_shops = len([s for s in shops if s.verifiedFinesCount > 0])

        return jsonify({
            "success": True,
            "stats": {
                "newComplaints": new_complaints,
                "underReview": under_review,
                "activeInvestigations": active_investigations,
                "resolvedCases": resolved_cases,
                "totalRegisteredShops": len(shops),
                "penalizedShopsCount": penalized_shops,
            }
        })

# 2. Get All Consumer Complaints
@consumer_bp.route("/complaints", methods=["GET"])
def get_complaints():
    status = request.args.get("status")
    district = request.args.get("district")
    issue_type = request.args.get("issueType")

    with get_db() as db:
        query = db.query(ConsumerComplaint)
        if status:
            query = query.filter(ConsumerComplaint.status == status)
        if district:
            query = query.filter(ConsumerComplaint.shopDistrict.ilike(district))
        if issue_type:
            query = query.filter(ConsumerComplaint.issueType == issue_type)

        complaints = query.order_by(ConsumerComplaint.submittedAt.desc()).all()
        return jsonify({
            "success": True,
            "complaints": [c.to_dict() for c in complaints]
        })

# 3. Update Complaint Status & Enforce Actions
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

        if status:
            complaint.status = status
        if inspector_notes:
            complaint.inspectorNotes = inspector_notes
        if penalty_imposed:
            complaint.penaltyImposed = penalty_imposed
        complaint.assignedOfficerName = user.fullName

        timeline = complaint.timeline
        timeline.append({
            "timestamp": utcnow_iso(),
            "status": complaint.status,
            "note": note or inspector_notes or f"Status updated to {complaint.status} by DNCRP Inspector.",
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
            shop.trustScore = max(1.0, round(shop.trustScore - 0.4, 1))
            if shop.trustScore < 2.0:
                shop.complianceStatus = "SUSPENDED"
            elif shop.trustScore < 3.5:
                shop.complianceStatus = "UNDER_WATCH"

        db.commit()
        complaint_dict = complaint.to_dict()

    NotificationService.create_complaint_notification(
        user_id=complaint.complainantId,
        title=f"Consumer Dispute Update: {complaint.trackingNumber}",
        message=f"Status updated to {complaint.status}. {f'Enforcement Order: {penalty_imposed}' if penalty_imposed else ''}",
        related_id=complaint.id,
    )

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

# 4. Shop Directory & Trust Scores
@consumer_bp.route("/shops", methods=["GET"])
def get_shops():
    with get_db() as db:
        shops = db.query(ShopReputation).order_by(ShopReputation.trustScore.desc()).all()
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
