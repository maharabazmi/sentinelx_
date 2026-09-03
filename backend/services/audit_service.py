import time
import uuid
from ..database import get_db
from ..models import AuditLog, utcnow_iso

class AuditService:
    @staticmethod
    def log(
        user_id: str,
        user_name: str,
        user_role: str,
        action: str,
        resource: str,
        details: str,
        status: str = "SUCCESS",
        resource_id: str = None,
        ip_address: str = "127.0.0.1",
    ) -> dict:
        log_id = f"audit-{int(time.time() * 1000)}-{uuid.uuid4().hex[:4]}"
        log_item = AuditLog(
            id=log_id,
            timestamp=utcnow_iso(),
            userId=user_id,
            userName=user_name,
            userRole=user_role,
            action=action,
            resource=resource,
            resourceId=resource_id,
            ipAddress=ip_address or "127.0.0.1",
            status=status,
            details=details,
        )
        try:
            with get_db() as db:
                db.add(log_item)
                db.commit()
                return log_item.to_dict()
        except Exception as e:
            # Fallback in case of temporary logging failure
            print(f"AuditService.log warning: {e}")
            return log_item.to_dict()

    @staticmethod
    def get_logs(user_role: str = None, action: str = None, limit: int = 100):
        with get_db() as db:
            query = db.query(AuditLog)
            if user_role:
                query = query.filter(AuditLog.userRole == user_role)
            if action:
                query = query.filter(AuditLog.action.ilike(f"%{action}%"))
            query = query.order_by(AuditLog.timestamp.desc()).limit(limit)
            return [l.to_dict() for l in query.all()]
