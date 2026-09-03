import time
import uuid
from ..database import get_db
from ..models import NotificationItem, User, utcnow_iso

class NotificationService:
    @staticmethod
    def _create_item(user_id: str, n_type: str, title: str, message: str, severity: str = "INFO", related_id: str = None):
        item_id = f"notif-{int(time.time() * 1000)}-{uuid.uuid4().hex[:4]}"
        item = NotificationItem(
            id=item_id,
            userId=user_id,
            type=n_type,
            title=title,
            message=message,
            relatedId=related_id,
            severity=severity,
            createdAt=utcnow_iso(),
            isRead=False,
        )
        with get_db() as db:
            db.add(item)
            db.commit()
            return item.to_dict()

    @classmethod
    def create_case_notification(cls, user_id: str, title: str, message: str, related_id: str = None):
        return cls._create_item(user_id, "CASE_STATUS", title, message, severity="INFO", related_id=related_id)

    @classmethod
    def create_complaint_notification(cls, user_id: str, title: str, message: str, related_id: str = None):
        return cls._create_item(user_id, "COMPLAINT_UPDATE", title, message, severity="INFO", related_id=related_id)

    @classmethod
    def create_sos_notification(cls, user_id: str, title: str, message: str, related_id: str = None):
        return cls._create_item(user_id, "SOS_UPDATE", title, message, severity="EMERGENCY", related_id=related_id)

    @classmethod
    def broadcast_emergency_alert(cls, alert_title: str, alert_message: str, alert_id: str):
        with get_db() as db:
            users = db.query(User).all()
            for u in users:
                item_id = f"notif-alert-{int(time.time() * 1000)}-{u.id}"
                item = NotificationItem(
                    id=item_id,
                    userId=u.id,
                    type="EMERGENCY_ALERT",
                    title=f"🚨 EMERGENCY ALERT: {alert_title}",
                    message=alert_message,
                    relatedId=alert_id,
                    severity="EMERGENCY",
                    createdAt=utcnow_iso(),
                    isRead=False,
                )
                db.add(item)
            db.commit()

    @staticmethod
    def get_user_notifications(user_id: str):
        with get_db() as db:
            items = (
                db.query(NotificationItem)
                .filter(NotificationItem.userId == user_id)
                .order_by(NotificationItem.createdAt.desc())
                .all()
            )
            return [i.to_dict() for i in items]

    @staticmethod
    def mark_as_read(notification_id: str, user_id: str) -> bool:
        with get_db() as db:
            item = db.query(NotificationItem).filter(
                NotificationItem.id == notification_id,
                NotificationItem.userId == user_id
            ).first()
            if item:
                item.isRead = True
                db.commit()
                return True
            return False

    @staticmethod
    def mark_all_as_read(user_id: str):
        with get_db() as db:
            items = db.query(NotificationItem).filter(
                NotificationItem.userId == user_id,
                NotificationItem.isRead == False
            ).all()
            for i in items:
                i.isRead = True
            db.commit()
