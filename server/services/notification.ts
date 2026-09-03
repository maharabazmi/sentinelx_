import { NotificationItem, UserRole } from '../../src/types';
import { db } from '../db/database';

export class NotificationService {
  static createCaseNotification(userId: string, title: string, message: string, relatedId?: string) {
    const notif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      type: 'CASE_STATUS',
      title,
      message,
      relatedId,
      severity: 'INFO',
      createdAt: new Date().toISOString(),
      isRead: false
    };
    db.notifications.unshift(notif);
    return notif;
  }

  static createComplaintNotification(userId: string, title: string, message: string, relatedId?: string) {
    const notif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      type: 'COMPLAINT_UPDATE',
      title,
      message,
      relatedId,
      severity: 'INFO',
      createdAt: new Date().toISOString(),
      isRead: false
    };
    db.notifications.unshift(notif);
    return notif;
  }

  static createSOSNotification(userId: string, title: string, message: string, relatedId?: string) {
    const notif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      userId,
      type: 'SOS_UPDATE',
      title,
      message,
      relatedId,
      severity: 'EMERGENCY',
      createdAt: new Date().toISOString(),
      isRead: false
    };
    db.notifications.unshift(notif);
    return notif;
  }

  static broadcastEmergencyAlert(alertTitle: string, alertMessage: string, alertId: string) {
    // Deliver emergency alert to all active registered users
    for (const [userId] of db.users) {
      const notif: NotificationItem = {
        id: `notif-alert-${Date.now()}-${userId}`,
        userId,
        type: 'EMERGENCY_ALERT',
        title: `🚨 EMERGENCY ALERT: ${alertTitle}`,
        message: alertMessage,
        relatedId: alertId,
        severity: 'EMERGENCY',
        createdAt: new Date().toISOString(),
        isRead: false
      };
      db.notifications.unshift(notif);
    }
  }

  static getUserNotifications(userId: string): NotificationItem[] {
    return db.notifications.filter(n => n.userId === userId);
  }

  static markAsRead(notificationId: string, userId: string): boolean {
    const notif = db.notifications.find(n => n.id === notificationId && n.userId === userId);
    if (notif) {
      notif.isRead = true;
      return true;
    }
    return false;
  }

  static markAllAsRead(userId: string): void {
    db.notifications
      .filter(n => n.userId === userId)
      .forEach(n => {
        n.isRead = true;
      });
  }
}
