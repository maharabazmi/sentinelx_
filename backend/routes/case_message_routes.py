import time
import uuid
from flask import Blueprint, request, jsonify, g
from ..database import get_db
from ..models import (
    CaseMessage,
    CrimeReport,
    ConsumerComplaint,
    utcnow_iso,
)
from ..middleware.auth import verify_auth
from ..services.notification_service import NotificationService
from ..services.audit_service import AuditService

case_message_bp = Blueprint("case_messages", __name__, url_prefix="/api/cases")

@case_message_bp.route("/<case_id>/messages", methods=["GET", "POST"])
@verify_auth
def handle_case_messages(case_id):
    """Retrieve or post inquiry and hearing messages for a specific crime or consumer dispute."""
    # 1. GET: Retrieve all chronological messages for this case
    if request.method == "GET":
        with get_db() as db:
            messages = (
                db.query(CaseMessage)
                .filter(CaseMessage.caseId == case_id)
                .order_by(CaseMessage.timestamp.asc())
                .all()
            )
            return jsonify({
                "success": True,
                "caseId": case_id,
                "count": len(messages),
                "messages": [m.to_dict() for m in messages]
            }), 200

    # 2. POST: Post an inquiry or response message
    data = request.get_json() or {}
    message_text = data.get("message", "").strip()
    case_type = data.get("caseType", "").strip().upper()
    is_official_notice = bool(data.get("isOfficialNotice", False))

    if not message_text:
        return jsonify({"error": "Message body cannot be empty."}), 400

    # Auto-detect caseType if omitted
    if not case_type:
        if case_id.startswith("DNCRP-") or case_id.startswith("COMP-"):
            case_type = "CONSUMER"
        else:
            case_type = "CRIME"

    msg_id = f"msg-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"
    now_iso = utcnow_iso()

    sender_id = g.user.id
    sender_name = g.user.fullName
    sender_role = g.user.role
    sender_badge = g.user.badgeNumber or g.user.designation or None

    new_message = CaseMessage(
        id=msg_id,
        caseId=case_id,
        caseType=case_type,
        senderId=sender_id,
        senderName=sender_name,
        senderRole=sender_role,
        senderBadge=sender_badge,
        message=message_text,
        isOfficialNotice=is_official_notice,
        timestamp=now_iso,
    )

    with get_db() as db:
        db.add(new_message)
        db.commit()

        # Trigger notification to counterpart
        try:
            preview_snippet = message_text if len(message_text) <= 80 else f"{message_text[:77]}..."

            if case_type == "CRIME":
                report = db.query(CrimeReport).filter(CrimeReport.caseId == case_id).first()
                if report:
                    if sender_role in ("POLICE", "ADMIN"):
                        # Notify citizen reporter
                        NotificationService.create_case_notification(
                            user_id=report.reporterId,
                            title=f"🚨 Officer Inquiry on Case {case_id}",
                            message=f"{sender_name} ({sender_badge or 'Investigating Officer'}): \"{preview_snippet}\"",
                            related_id=case_id
                        )
                    elif sender_role == "CITIZEN" and report.verifiedByOfficerId:
                        # Notify assigned officer
                        NotificationService.create_case_notification(
                            user_id=report.verifiedByOfficerId,
                            title=f"Citizen Reply on Case {case_id}",
                            message=f"{sender_name} replied: \"{preview_snippet}\"",
                            related_id=case_id
                        )
            elif case_type == "CONSUMER":
                complaint = db.query(ConsumerComplaint).filter(ConsumerComplaint.trackingNumber == case_id).first()
                if complaint:
                    if sender_role in ("CONSUMER_RIGHTS", "ADMIN"):
                        # Notify consumer complainant
                        title_prefix = "⚖️ Official Hearing Notice" if is_official_notice else "⚖️ DNCRP Inquiry"
                        NotificationService.create_complaint_notification(
                            user_id=complaint.complainantId,
                            title=f"{title_prefix} - {case_id}",
                            message=f"{sender_name} (DNCRP): \"{preview_snippet}\"",
                            related_id=case_id
                        )
        except Exception as notif_err:
            print(f"[Warning] Failed to generate in-app notification: {notif_err}")

        # Audit log
        AuditService.log(
            user_id=sender_id,
            user_name=sender_name,
            user_role=sender_role,
            action="CASE_MESSAGE_SENT",
            resource="CASE_MESSAGE",
            resource_id=case_id,
            ip_address=request.remote_addr,
            status="SUCCESS",
            details=f"Sent case message on {case_type} [{case_id}]. Official Notice: {is_official_notice}",
        )

        return jsonify({
            "success": True,
            "message": new_message.to_dict()
        }), 201
