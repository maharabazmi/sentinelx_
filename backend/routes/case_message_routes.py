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

def _resolve_case_context(db, raw_case_id: str):
    """
    Resolve either an internal DB primary key (rep-..., comp-...) or a public
    docket/tracking code (CR-..., GD-..., DNCRP-...) into:
      (canonical_id, alias_ids_list, case_type, report_obj, complaint_obj)
    """
    clean_id = (raw_case_id or "").strip()
    report = (
        db.query(CrimeReport)
        .filter((CrimeReport.caseId == clean_id) | (CrimeReport.id == clean_id))
        .first()
    )
    if report:
        aliases = list({clean_id, report.caseId, report.id})
        return report.caseId, aliases, "CRIME", report, None

    complaint = (
        db.query(ConsumerComplaint)
        .filter((ConsumerComplaint.trackingNumber == clean_id) | (ConsumerComplaint.id == clean_id))
        .first()
    )
    if complaint:
        aliases = list({clean_id, complaint.trackingNumber, complaint.id})
        return complaint.trackingNumber, aliases, "CONSUMER", None, complaint

    fallback_type = "CONSUMER" if (clean_id.startswith("DNCRP-") or clean_id.startswith("comp-")) else "CRIME"
    return clean_id, [clean_id], fallback_type, None, None


@case_message_bp.route("/<case_id>/messages", methods=["GET", "POST"])
@verify_auth
def handle_case_messages(case_id):
    """Retrieve or post inquiry and hearing messages for a specific crime or consumer dispute."""
    # 1. GET: Retrieve all chronological messages across both canonical caseId and internal id aliases
    if request.method == "GET":
        with get_db() as db:
            canonical_id, alias_ids, _, _, _ = _resolve_case_context(db, case_id)
            messages = (
                db.query(CaseMessage)
                .filter(CaseMessage.caseId.in_(alias_ids))
                .order_by(CaseMessage.timestamp.asc())
                .all()
            )
            # Self-heal any split messages so all messages share the canonical tracking number
            migrated = False
            for m in messages:
                if m.caseId != canonical_id:
                    m.caseId = canonical_id
                    migrated = True
            if migrated:
                db.commit()

            return jsonify({
                "success": True,
                "caseId": canonical_id,
                "count": len(messages),
                "messages": [m.to_dict() for m in messages]
            }), 200

    # 2. POST: Post an inquiry or response message
    data = request.get_json() or {}
    message_text = data.get("message", "").strip()
    attachment_url = data.get("attachmentUrl")
    attachment_name = data.get("attachmentName")
    attachment_type = data.get("attachmentType")
    case_type = data.get("caseType", "").strip().upper()
    is_official_notice = bool(data.get("isOfficialNotice", False))

    if not message_text and not attachment_url:
        return jsonify({"error": "Message body or attachment is required."}), 400

    msg_id = f"msg-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"
    now_iso = utcnow_iso()

    sender_id = g.user.id
    sender_name = g.user.fullName
    sender_role = g.user.role
    sender_badge = g.user.badgeNumber or g.user.designation or None

    with get_db() as db:
        canonical_id, _, resolved_type, report, complaint = _resolve_case_context(db, case_id)
        effective_case_type = case_type or resolved_type

        new_message = CaseMessage(
            id=msg_id,
            caseId=canonical_id,
            caseType=effective_case_type,
            senderId=sender_id,
            senderName=sender_name,
            senderRole=sender_role,
            senderBadge=sender_badge,
            message=message_text,
            attachmentUrl=attachment_url,
            attachmentName=attachment_name,
            attachmentType=attachment_type,
            isOfficialNotice=is_official_notice,
            timestamp=now_iso,
        )
        db.add(new_message)
        db.commit()

        # Trigger notification to counterpart
        try:
            preview_snippet = message_text if message_text else f"[Attachment: {attachment_name or 'File'}]"
            if len(preview_snippet) > 80:
                preview_snippet = f"{preview_snippet[:77]}..."

            if effective_case_type == "CRIME" and report:
                if sender_role in ("POLICE", "ADMIN"):
                    NotificationService.create_case_notification(
                        user_id=report.reporterId,
                        title=f"🚨 Officer Inquiry on Case {canonical_id}",
                        message=f"{sender_name} ({sender_badge or 'Investigating Officer'}): \"{preview_snippet}\"",
                        related_id=canonical_id
                    )
                elif sender_role == "CITIZEN":
                    target_officer_id = report.assignedOfficerId or report.verifiedByOfficerId
                    if target_officer_id:
                        NotificationService.create_case_notification(
                            user_id=target_officer_id,
                            title=f"Citizen Reply on Case {canonical_id}",
                            message=f"{sender_name} replied: \"{preview_snippet}\"",
                            related_id=canonical_id
                        )
            elif effective_case_type == "CONSUMER" and complaint:
                if sender_role in ("CONSUMER_RIGHTS", "ADMIN"):
                    title_prefix = "⚖️ Official Hearing Notice" if is_official_notice else "⚖️ DNCRP Inquiry"
                    NotificationService.create_complaint_notification(
                        user_id=complaint.complainantId,
                        title=f"{title_prefix} - {canonical_id}",
                        message=f"{sender_name} (DNCRP): \"{preview_snippet}\"",
                        related_id=canonical_id
                    )
                elif sender_role == "CITIZEN" and complaint.assignedOfficerId:
                    NotificationService.create_complaint_notification(
                        user_id=complaint.assignedOfficerId,
                        title=f"Complainant Reply on {canonical_id}",
                        message=f"{sender_name} replied: \"{preview_snippet}\"",
                        related_id=canonical_id
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
            resource_id=canonical_id,
            ip_address=request.remote_addr,
            status="SUCCESS",
            details=f"Sent case message on {effective_case_type} [{canonical_id}]. Official Notice: {is_official_notice}",
        )

        return jsonify({
            "success": True,
            "message": new_message.to_dict()
        }), 201

