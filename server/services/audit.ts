import { AuditLog, UserRole } from '../../src/types';
import { db } from '../db/database';

export class AuditService {
  static log(entry: {
    userId: string;
    userName: string;
    userRole: UserRole;
    action: string;
    resource: string;
    resourceId?: string;
    ipAddress?: string;
    status: 'SUCCESS' | 'DENIED' | 'FLAGGED';
    details: string;
  }): AuditLog {
    const logItem: AuditLog = {
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      userId: entry.userId,
      userName: entry.userName,
      userRole: entry.userRole,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      ipAddress: entry.ipAddress || '127.0.0.1',
      status: entry.status,
      details: entry.details
    };

    db.auditLogs.unshift(logItem);
    // Keep max 500 audit logs
    if (db.auditLogs.length > 500) {
      db.auditLogs = db.auditLogs.slice(0, 500);
    }
    return logItem;
  }

  static getLogs(filters?: { userRole?: UserRole; action?: string; limit?: number }): AuditLog[] {
    let result = [...db.auditLogs];
    if (filters?.userRole) {
      result = result.filter(l => l.userRole === filters.userRole);
    }
    if (filters?.action) {
      result = result.filter(l => l.action.toLowerCase().includes(filters.action!.toLowerCase()));
    }
    if (filters?.limit) {
      result = result.slice(0, filters.limit);
    }
    return result;
  }
}
