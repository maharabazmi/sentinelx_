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
    get_consumer_officer_district,
    is_consumer_district_match,
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
            designation = (user.designation or '').strip().casefold()
            is_intake_officer = designation == "complaint intake officer"
            intake_district = get_consumer_officer_district(user)
            district_matches = lambda complaint: not intake_district or is_consumer_district_match(intake_district, complaint.shopDistrict)
            thana_kw, dist_kw = parse_consumer_jurisdiction(station)

            # 1. New Grievance Claims:
            # Submitted or under-review claims routed to officer's jurisdiction or claimed by this intake officer
            new_complaints = len([
                c for c in all_complaints
                if c.status in ("SUBMITTED", "UNDER_REVIEW") and (
                    (is_intake_officer and district_matches(c) and (c.workflowQueue or "INTAKE") == "INTAKE" and
                     (not c.assignedOfficerId or c.assignedOfficerId == user.id)) or
                    (not is_intake_officer and c.assignedOfficerId == user.id)
                )
            ])

            # 2. Under Review:
            under_review = len([
                c for c in all_complaints
                if c.status == "UNDER_REVIEW" and (
                    (is_intake_officer and district_matches(c) and (c.workflowQueue or "INTAKE") == "INTAKE" and
                     (not c.assignedOfficerId or c.assignedOfficerId == user.id)) or
                    (not is_intake_officer and c.assignedOfficerId == user.id)
                )
            ])

            # 3. Field Investigations:
            # Verified / active investigations specifically assigned to this officer
            active_investigations = len([
                c for c in all_complaints
                if c.status in ("VERIFIED", "INVESTIGATION", "INVESTIGATION_SUMMARY", "ADJUDICATION_REVIEW", "FINAL_DECISION") and (
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
                if (
                    (is_intake_officer and district_matches(c) and (c.workflowQueue or "INTAKE") == "INTAKE" and
                     c.status in ("SUBMITTED", "UNDER_REVIEW") and (not c.assignedOfficerId or c.assignedOfficerId == user.id)) or
                    (not is_intake_officer and not c.assignedOfficerId and not c.assignedOfficerName and
                     is_consumer_in_jurisdiction(station, c.shopThana, c.shopDistrict))
                ) and
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
            active_investigations = len([c for c in all_complaints if c.status in ("VERIFIED", "INVESTIGATION", "INVESTIGATION_SUMMARY", "ADJUDICATION_REVIEW", "FINAL_DECISION")])
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
            designation = (user.designation or '').strip().casefold()
            is_intake_officer = designation == "complaint intake officer"
            intake_district = get_consumer_officer_district(user)
            district_matches = lambda complaint: not intake_district or is_consumer_district_match(intake_district, complaint.shopDistrict)
            if is_intake_officer:
                # Intake also retains rejected and handed-over records for its queue tabs.
                filtered = [
                    c for c in all_records
                    if (
                        (district_matches(c) and c.status in ("SUBMITTED", "UNDER_REVIEW") and (c.workflowQueue or "INTAKE") == "INTAKE") or
                        (district_matches(c) and c.status == "SUBMITTED") or
                        (district_matches(c) and c.workflowQueue in ("REJECTED", "INVESTIGATION")) or
                        (c.assignedOfficerId == user.id and district_matches(c))
                    )
                ]
            elif designation == "investigation officer":
                filtered = [
                    c for c in all_records
                    if c.assignedOfficerId == user.id or
                    (district_matches(c) and (c.workflowQueue == "INVESTIGATION" or c.status in ("INVESTIGATION", "UNDER_REVIEW"))) or
                    any("Investigation" in (event.get("note") or "") for event in c.timeline)
                ]
            elif designation == "adjudication officer":
                filtered = [
                    c for c in all_records
                    if c.assignedOfficerId == user.id or
                    (district_matches(c) and (c.workflowQueue == "ADJUDICATION" or c.status in ("INVESTIGATION_SUMMARY", "ADJUDICATION_REVIEW", "FINAL_DECISION", "RESOLVED"))) or
                    any("Adjudication" in (event.get("note") or "") for event in c.timeline)
                ]
            elif scope == "my_cases":
                filtered = [
                    c for c in all_records
                    if c.assignedOfficerId == user.id or
                    (c.assignedOfficerName and user.fullName.strip().lower() == c.assignedOfficerName.strip().lower())
                ]
            elif scope == "unassigned":
                filtered = [
                    c for c in all_records
                    if (
                        (not c.assignedOfficerId and not c.assignedOfficerName and c.status in ("SUBMITTED", "UNDER_REVIEW")) or
                        (c.assignedOfficerId == user.id and c.status in ("SUBMITTED", "UNDER_REVIEW"))
                    ) and
                    (is_intake_officer or is_consumer_in_jurisdiction(station, c.shopThana, c.shopDistrict) or district_matches(c))
                ]
            else:
                # Default "jurisdiction" / supervisory overview:
                filtered = [
                    c for c in all_records
                    if (is_intake_officer and (not c.assignedOfficerId or c.assignedOfficerId == user.id) and c.status in ("SUBMITTED", "UNDER_REVIEW")) or
                    is_consumer_in_jurisdiction(station, c.shopThana, c.shopDistrict) or
                    district_matches(c) or
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
    officer_category = (user.designation or '').strip().casefold()
    with get_db() as db:
        complaint = db.query(ConsumerComplaint).filter(ConsumerComplaint.id == complaint_id).first()
        if not complaint:
            return jsonify({"error": "Complaint not found."}), 404

        if user.role != "CONSUMER_RIGHTS":
            return jsonify({"error": "Only DNCRP officers can accept a dispute."}), 403
        if officer_category == "complaint intake officer":
            return jsonify({"error": "Complaint Intake Officers review, hand over, or reject disputes; they do not take charge of cases."}), 403
        elif officer_category == "investigation officer":
            if complaint.status != "UNDER_REVIEW" or complaint.assignedOfficerId != user.id:
                return jsonify({"error": "Only an investigation case handed over to you can be accepted."}), 409
            complaint.status = "INVESTIGATION"
            complaint.workflowQueue = "INVESTIGATION"
        elif officer_category == "adjudication officer":
            if complaint.status != "INVESTIGATION_SUMMARY" or complaint.assignedOfficerId != user.id:
                return jsonify({"error": "Only an investigation report handed over to you can be accepted."}), 409
            complaint.status = "ADJUDICATION_REVIEW"
            complaint.workflowQueue = "ADJUDICATION"
        else:
            return jsonify({"error": "Your DNCRP designation is not authorized to accept disputes."}), 403

        complaint.assignedOfficerId = user.id
        complaint.assignedOfficerName = user.fullName

        timeline = complaint.timeline
        timeline.append({
            "timestamp": utcnow_iso(),
            "status": complaint.status,
            "note": f"Accepted into {user.designation} queue by {user.fullName} ({user.badgeNumber or 'DNCRP officer'}).",
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
        message=f"{user.fullName} has accepted your dispute into the {user.designation} queue.",
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
    officer_category = (user.designation or '').strip()
    data = request.get_json() or {}
    status = data.get("status")
    inspector_notes = data.get("inspectorNotes")
    penalty_imposed = data.get("penaltyImposed")
    reward_amount = data.get("rewardAmount")
    note = data.get("note")
    handoff_officer_id = data.get("handoffOfficerId")
    parsed_reward_amount = None
    if reward_amount is not None and status == "RESOLVED":
        try:
            parsed_reward_amount = max(0, float(reward_amount))
        except (TypeError, ValueError):
            return jsonify({"error": "Reward/compensation amount must be a valid non-negative number."}), 400

    with get_db() as db:
        complaint = db.query(ConsumerComplaint).filter(ConsumerComplaint.id == complaint_id).first()
        if not complaint:
            return jsonify({"error": "Complaint not found."}), 404

        if user.role == "CONSUMER_RIGHTS":
            normalized_category = officer_category.casefold()
            is_supervisor = not normalized_category or "director" in normalized_category or "chief" in normalized_category or "inspector" in normalized_category
            workflow_category = (
                "Investigation Officer" if normalized_category == "investigation officer"
                else "Adjudication Officer" if (normalized_category == "adjudication officer" or (is_supervisor and complaint.status in ("INVESTIGATION_SUMMARY", "ADJUDICATION_REVIEW", "FINAL_DECISION")))
                else "Complaint Intake Officer"
            )
            if workflow_category != "Adjudication Officer" and (penalty_imposed is not None or reward_amount is not None or status in ("FINAL_DECISION", "RESOLVED")):
                return jsonify({"error": "Only an Adjudication Officer can record final findings, fines, or citizen compensation."}), 403
            intake_district = get_consumer_officer_district(user)
            if workflow_category == "Complaint Intake Officer" and intake_district and not is_consumer_district_match(intake_district, complaint.shopDistrict):
                return jsonify({"error": "This dispute is assigned to a different Intake Officer district."}), 403
            in_jur = is_consumer_in_jurisdiction(user.stationOrThana, complaint.shopThana, complaint.shopDistrict)
            is_assigned = (complaint.assignedOfficerId == user.id or (complaint.assignedOfficerName and user.fullName.strip().lower() == complaint.assignedOfficerName.strip().lower()))
            can_intake_review = workflow_category == "Complaint Intake Officer" and complaint.status in ("SUBMITTED", "UNDER_REVIEW")
            if can_intake_review and workflow_category == "Complaint Intake Officer":
                can_intake_review = not intake_district or is_consumer_district_match(intake_district, complaint.shopDistrict)
            if not in_jur and not is_assigned and not can_intake_review:
                return jsonify({"error": f"Access Denied: Dispute in {complaint.shopThana}, {complaint.shopDistrict} is outside your operational jurisdiction."}), 403

            if handoff_officer_id:
                handoff_rules = {
                    "Complaint Intake Officer": {
                        "from_status": "UNDER_REVIEW",
                        "to_status": "UNDER_REVIEW",
                        "target_role": "Investigation Officer",
                    },
                    "Investigation Officer": {
                        "from_status": "INVESTIGATION",
                        "to_status": "INVESTIGATION_SUMMARY",
                        "target_role": "Adjudication Officer",
                    },
                }
                handoff_rule = handoff_rules.get(workflow_category)
                if not handoff_rule:
                    return jsonify({"error": "This officer category cannot hand over a dispute."}), 403
                if workflow_category == "Complaint Intake Officer":
                    if complaint.status not in ("SUBMITTED", "UNDER_REVIEW"):
                        return jsonify({"error": "Only a submitted or intake-review complaint can be handed over."}), 409
                    if complaint.assignedOfficerId and complaint.assignedOfficerId != user.id:
                        return jsonify({"error": "This complaint is assigned to another officer."}), 409
                else:
                    if complaint.status != handoff_rule["from_status"] or complaint.assignedOfficerId != user.id:
                        return jsonify({"error": "The dispute is not ready for handover by this officer."}), 409
                if status and status != handoff_rule["to_status"]:
                    return jsonify({"error": f"Handover must move the dispute to {handoff_rule['to_status']}."}), 409
                handoff_officer = db.query(User).filter(
                    User.id == handoff_officer_id,
                    User.role == "CONSUMER_RIGHTS",
                    User.designation == handoff_rule["target_role"]
                ).first()
                if not handoff_officer:
                    return jsonify({"error": f"Select a valid {handoff_rule['target_role']} for handover."}), 400
                if workflow_category == "Investigation Officer":
                    if not inspector_notes and not complaint.investigationSummary:
                        return jsonify({"error": "Submit an investigation summary before handing over the case."}), 400
                    if inspector_notes:
                        complaint.investigationSummary = inspector_notes
                        complaint.inspectorNotes = inspector_notes
                complaint.assignedOfficerId = handoff_officer.id
                complaint.assignedOfficerName = handoff_officer.fullName
                complaint.status = handoff_rule["to_status"]
                complaint.workflowQueue = "INVESTIGATION" if workflow_category == "Complaint Intake Officer" else "ADJUDICATION"
                timeline = complaint.timeline
                timeline.append({
                    "timestamp": utcnow_iso(),
                    "status": complaint.status,
                    "note": f"Handover from {workflow_category} {user.fullName} to {handoff_rule['target_role']} {handoff_officer.fullName}.",
                    "officerName": user.fullName,
                })
                complaint.timeline = timeline
                db.commit()
                complaint_dict = complaint.to_dict()
                NotificationService.create_complaint_notification(
                    user_id=handoff_officer.id,
                    title=f"Case Handover: {complaint.trackingNumber}",
                    message=f"{workflow_category} {user.fullName} handed over a dispute to you.",
                    related_id=complaint.id,
                )
                NotificationService.create_complaint_notification(
                    user_id=complaint.complainantId,
                    title=f"Dispute Progress: {complaint.trackingNumber}",
                    message=f"Your dispute has been handed over to the {handoff_rule['target_role']} for the next stage of review.",
                    related_id=complaint.id,
                )
                return jsonify({
                    "success": True,
                    "complaint": complaint_dict,
                    "message": f"Dispute handed over to {handoff_rule['target_role']} {handoff_officer.fullName}."
                })

            allowed_transition = {
                "Complaint Intake Officer": (("SUBMITTED", "UNDER_REVIEW"), ("SUBMITTED", "REJECTED"), ("UNDER_REVIEW", "REJECTED")),
                "Investigation Officer": ("UNDER_REVIEW", "INVESTIGATION"),
                "Adjudication Officer": (
                    ("INVESTIGATION_SUMMARY", "ADJUDICATION_REVIEW"),
                    ("ADJUDICATION_REVIEW", "FINAL_DECISION"),
                    ("FINAL_DECISION", "RESOLVED"),
                ),
            }
            if workflow_category in allowed_transition and status:
                if workflow_category in ("Investigation Officer", "Adjudication Officer") and not is_assigned:
                    return jsonify({"error": "Only the officer assigned during handover can advance this dispute."}), 403
                valid_transitions = allowed_transition[workflow_category]
                if isinstance(valid_transitions[0], str):
                    valid_transitions = (valid_transitions,)
                if (complaint.status, status) not in valid_transitions:
                    return jsonify({
                        "error": f"{officer_category} cannot move this dispute from {complaint.status} to {status}."
                    }), 409
                if workflow_category == "Investigation Officer" and status == "INVESTIGATION" and not is_assigned:
                    return jsonify({"error": "Accept the case from your Investigation Queue before starting work."}), 409
                if workflow_category == "Adjudication Officer" and status == "FINAL_DECISION" and not inspector_notes:
                    return jsonify({"error": "Record the final finding before submitting the decision."}), 400
                if workflow_category == "Adjudication Officer" and status == "RESOLVED" and not inspector_notes:
                    return jsonify({"error": "Record the reward or compensation determination before resolving."}), 400
                if workflow_category == "Adjudication Officer" and status == "RESOLVED" and not penalty_imposed:
                    return jsonify({"error": "Enter the final reward/compensation decision before resolving."}), 400
            if status and workflow_category == "Complaint Intake Officer" and status == "REJECTED":
                if complaint.status not in ("SUBMITTED", "UNDER_REVIEW") or (complaint.assignedOfficerId and complaint.assignedOfficerId != user.id):
                    return jsonify({"error": "Only an Intake Officer reviewing this complaint can reject it."}), 403

        if status:
            complaint.status = status
            if status == "REJECTED":
                complaint.workflowQueue = "REJECTED"
            elif status == "RESOLVED":
                complaint.workflowQueue = "COMPLETED"
        if inspector_notes:
            complaint.inspectorNotes = inspector_notes
            if status == "INVESTIGATION_SUMMARY":
                complaint.investigationSummary = inspector_notes
            elif status in ("FINAL_DECISION", "RESOLVED"):
                complaint.finalFinding = inspector_notes
        if penalty_imposed:
            complaint.penaltyImposed = penalty_imposed
        if parsed_reward_amount is not None:
            complaint.rewardAmount = parsed_reward_amount

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

    resolution_message = (
        f"Final decision recorded. {complaint.finalFinding or inspector_notes or note or ''} "
        f"Reward/compensation: ৳{complaint.rewardAmount:,.2f} to the citizen. "
        f"Enforcement details: {complaint.penaltyImposed or 'None awarded.'}"
        if complaint.status == "RESOLVED"
        else f"Status updated to {complaint.status}."
    )
    NotificationService.create_complaint_notification(
        user_id=complaint.complainantId,
        title=(f"Final Reward/Compensation Decision: {complaint.trackingNumber}" if complaint.status == "RESOLVED" else f"Consumer Dispute Update: {complaint.trackingNumber}"),
        message=resolution_message,
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
