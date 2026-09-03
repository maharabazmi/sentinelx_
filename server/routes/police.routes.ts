import { Router, Response } from 'express';
import {
  CrimeReport,
  CrimeSeverity,
  ReportStatus,
  CrimeIncident,
  EmergencyAlert,
  EmergencyType,
  AlertSeverity,
  SOSStatus,
  UserRole
} from '../../src/types';
import { db } from '../db/database';
import { verifyAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { NotificationService } from '../services/notification';
import { AuditService } from '../services/audit';

const router = Router();

// Strict RBAC: POLICE and ADMIN only
router.use(verifyAuth);
router.use(requireRoles(UserRole.POLICE, UserRole.ADMIN));

// 1. Police Dashboard Operational Summary
router.get('/dashboard-summary', (req: AuthenticatedRequest, res: Response) => {
  const allReports = Array.from(db.crimeReports.values());
  const now = new Date().toISOString();

  const newReportsCount = allReports.filter(r => r.status === ReportStatus.SUBMITTED).length;
  const pendingVerificationCount = allReports.filter(r => r.status === ReportStatus.SUBMITTED).length;
  const activeInvestigationsCount = allReports.filter(r =>
    r.status === ReportStatus.VERIFIED ||
    r.status === ReportStatus.OFFICER_ASSIGNED ||
    r.status === ReportStatus.INVESTIGATION
  ).length;
  const closedCasesCount = allReports.filter(r => r.status === ReportStatus.CASE_CLOSED).length;

  const activeSOSCount = Array.from(db.sosRequests.values()).filter(s => s.status !== SOSStatus.RESOLVED).length;
  const activeAlertsCount = Array.from(db.emergencyAlerts.values()).filter(a => a.isActive && new Date(a.expirationTime).toISOString() > now).length;

  return res.json({
    success: true,
    stats: {
      newReports: newReportsCount,
      pendingVerification: pendingVerificationCount,
      activeInvestigations: activeInvestigationsCount,
      closedCases: closedCasesCount,
      activeSOS: activeSOSCount,
      activeEmergencyAlerts: activeAlertsCount,
      totalLodgedCases: allReports.length
    }
  });
});

// 2. Get All Crime Reports for Review (Police Authorized Access)
router.get('/reports', (req: AuthenticatedRequest, res: Response) => {
  const { status, district, thana, severity, crimeType } = req.query;
  let reports = Array.from(db.crimeReports.values());

  if (status) {
    reports = reports.filter(r => r.status === status);
  }
  if (district) {
    reports = reports.filter(r => r.district.toLowerCase() === (district as string).toLowerCase());
  }
  if (thana) {
    reports = reports.filter(r => r.thana.toLowerCase().includes((thana as string).toLowerCase()));
  }
  if (severity) {
    reports = reports.filter(r => r.severity === severity);
  }
  if (crimeType) {
    reports = reports.filter(r => r.crimeType === crimeType);
  }

  // Sort by latest submission
  reports.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return res.json({
    success: true,
    reports
  });
});

// 3. Verify or Reject Crime Report
router.post('/reports/:id/verify', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { action, notes } = req.body as { action: 'VERIFY' | 'REJECT'; notes?: string };
  const report = db.crimeReports.get(req.params.id);

  if (!report) {
    return res.status(404).json({ error: 'Crime report not found.' });
  }

  const newStatus = action === 'VERIFY' ? ReportStatus.VERIFIED : ReportStatus.REJECTED;
  report.status = newStatus;
  report.verificationNotes = notes || (action === 'VERIFY' ? 'Verified by reviewing officer.' : 'Rejected due to insufficient corroborating evidence.');
  report.verifiedByOfficerId = user.id;

  report.investigationUpdates.push({
    id: `inv-${Date.now()}`,
    timestamp: new Date().toISOString(),
    officerName: `${user.fullName} (${user.badgeNumber || 'Officer'})`,
    status: newStatus,
    note: report.verificationNotes
  });

  // Notify the citizen
  NotificationService.createCaseNotification(
    report.reporterId,
    `Case Update: ${report.caseId}`,
    action === 'VERIFY'
      ? `Your crime report "${report.title}" has been formally VERIFIED by ${user.fullName}. An investigation team has been assigned.`
      : `Your crime report "${report.title}" was reviewed and marked as REJECTED. Reason: ${report.verificationNotes}`,
    report.id
  );

  AuditService.log({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: action === 'VERIFY' ? 'VERIFY_CRIME_REPORT' : 'REJECT_CRIME_REPORT',
    resource: report.caseId,
    resourceId: report.id,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `Officer updated case status to [${newStatus}]. Notes: ${notes || 'N/A'}`
  });

  return res.json({
    success: true,
    report,
    message: `Report successfully ${action === 'VERIFY' ? 'verified' : 'rejected'}.`
  });
});

// 4. Assign Officer & Update Investigation Status
router.post('/reports/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { status, assignedOfficerName, assignedOfficerBadge, assignedOfficerStation, note } = req.body;
  const report = db.crimeReports.get(req.params.id);

  if (!report) {
    return res.status(404).json({ error: 'Crime report not found.' });
  }

  if (status) report.status = status as ReportStatus;
  if (assignedOfficerName) report.assignedOfficerName = assignedOfficerName;
  if (assignedOfficerBadge) report.assignedOfficerBadge = assignedOfficerBadge;
  if (assignedOfficerStation) report.assignedOfficerStation = assignedOfficerStation;

  report.investigationUpdates.push({
    id: `inv-${Date.now()}`,
    timestamp: new Date().toISOString(),
    officerName: `${user.fullName} (${user.badgeNumber || 'Officer'})`,
    status: report.status,
    note: note || `Status updated to ${report.status}`
  });

  // Notify citizen of the progress
  NotificationService.createCaseNotification(
    report.reporterId,
    `Investigation Update: ${report.caseId}`,
    `Case Status updated to ${report.status}. Note: ${note || 'Investigation progressing.'}`,
    report.id
  );

  AuditService.log({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'UPDATE_INVESTIGATION_STATUS',
    resource: report.caseId,
    resourceId: report.id,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `Case status updated to [${report.status}], assigned officer: [${report.assignedOfficerName || 'N/A'}].`
  });

  return res.json({
    success: true,
    report
  });
});

// 5. POLICE-ONLY Crime Heatmap Data
// Strictly enforces that only VERIFIED reports/incidents are returned!
router.get('/heatmap', (req: AuthenticatedRequest, res: Response) => {
  // Check that caller is POLICE or ADMIN
  if (req.user?.role !== UserRole.POLICE && req.user?.role !== UserRole.ADMIN) {
    AuditService.log({
      userId: req.user?.id || 'unknown',
      userName: req.user?.fullName || 'Anonymous',
      userRole: req.user?.role || UserRole.CITIZEN,
      action: 'BLOCKED_HEATMAP_ACCESS',
      resource: '/api/police/heatmap',
      ipAddress: req.ip,
      status: 'DENIED',
      details: 'Unauthorized attempt to access police-only crime heatmap.'
    });
    return res.status(403).json({ error: 'Forbidden: Crime Heatmap is restricted exclusively to authorized Police personnel.' });
  }

  // Filter only VERIFIED incidents (VERIFIED, OFFICER_ASSIGNED, INVESTIGATION, CASE_CLOSED)
  const verifiedIncidents: CrimeIncident[] = Array.from(db.crimeReports.values())
    .filter(r => r.status !== ReportStatus.SUBMITTED && r.status !== ReportStatus.REJECTED)
    .map(r => {
      const severityMultiplier =
        r.severity === CrimeSeverity.CRITICAL ? 1.0 :
        r.severity === CrimeSeverity.HIGH ? 0.75 :
        r.severity === CrimeSeverity.MEDIUM ? 0.5 : 0.25;

      return {
        id: r.id,
        caseId: r.caseId,
        crimeType: r.crimeType,
        severity: r.severity,
        locationName: r.locationName,
        district: r.district,
        thana: r.thana,
        latitude: r.latitude,
        longitude: r.longitude,
        occurredAt: r.occurredAt,
        verifiedAt: r.submittedAt,
        intensity: severityMultiplier
      };
    });

  return res.json({
    success: true,
    totalVerifiedIncidents: verifiedIncidents.length,
    incidents: verifiedIncidents
  });
});

// 6. Emergency Alerts Management (Police Only)
router.get('/emergency-alerts', (req: AuthenticatedRequest, res: Response) => {
  const alerts = Array.from(db.emergencyAlerts.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return res.json({
    success: true,
    alerts
  });
});

router.post('/emergency-alerts', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { emergencyType, title, message, affectedArea, district, severity, startTime, expirationTime, latitude, longitude, radiusKm } = req.body;

  if (!emergencyType || !title || !message || !affectedArea || !expirationTime) {
    return res.status(400).json({ error: 'Missing mandatory emergency alert fields.' });
  }

  const alertId = `alert-${Date.now().toString(36)}`;
  const alertCode = `ALERT-${(district || 'NAT').substring(0, 3).toUpperCase()}-${(emergencyType.substring(0, 4)).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  const newAlert: EmergencyAlert = {
    id: alertId,
    alertCode,
    emergencyType: emergencyType as EmergencyType,
    title: title.trim(),
    message: message.trim(),
    affectedArea: affectedArea.trim(),
    district: district || 'Dhaka',
    latitude: latitude ? Number(latitude) : 23.8103,
    longitude: longitude ? Number(longitude) : 90.4125,
    radiusKm: radiusKm ? Number(radiusKm) : 5,
    severity: (severity as AlertSeverity) || AlertSeverity.HIGH,
    issuedByOfficerId: user.id,
    issuedByOfficerName: user.fullName,
    issuedByStation: user.stationOrThana || user.department || 'DMP Central Operations',
    startTime: startTime || new Date().toISOString(),
    expirationTime: new Date(expirationTime).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString()
  };

  db.emergencyAlerts.set(alertId, newAlert);

  // Broadcast to all active citizens and authority personnel
  NotificationService.broadcastEmergencyAlert(newAlert.title, newAlert.message, newAlert.id);

  AuditService.log({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'PUBLISH_TEMPORARY_EMERGENCY_ALERT',
    resource: alertCode,
    resourceId: alertId,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `Emergency Alert [${emergencyType}] published for [${affectedArea}]. Valid until: ${newAlert.expirationTime}.`
  });

  return res.status(201).json({
    success: true,
    alert: newAlert,
    message: 'Emergency alert successfully published and broadcasted to affected zone.'
  });
});

router.post('/emergency-alerts/:id/toggle-active', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const alert = db.emergencyAlerts.get(req.params.id);

  if (!alert) {
    return res.status(404).json({ error: 'Emergency alert not found.' });
  }

  alert.isActive = !alert.isActive;

  AuditService.log({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: alert.isActive ? 'REACTIVATE_EMERGENCY_ALERT' : 'DEACTIVATE_EMERGENCY_ALERT',
    resource: alert.alertCode,
    resourceId: alert.id,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `Alert status toggled to [${alert.isActive ? 'ACTIVE' : 'INACTIVE'}].`
  });

  return res.json({
    success: true,
    alert
  });
});

// 7. SOS Dispatch Management
router.get('/sos', (req: AuthenticatedRequest, res: Response) => {
  const sosList = Array.from(db.sosRequests.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return res.json({
    success: true,
    sosRequests: sosList
  });
});

router.post('/sos/:id/respond', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { status, assignedUnit, notes } = req.body;
  const sos = db.sosRequests.get(req.params.id);

  if (!sos) {
    return res.status(404).json({ error: 'SOS request not found.' });
  }

  sos.status = (status as SOSStatus) || SOSStatus.RESPONDING;
  sos.respondedAt = new Date().toISOString();
  if (assignedUnit) sos.assignedUnit = assignedUnit;
  if (notes) sos.notes = notes;

  NotificationService.createSOSNotification(
    sos.citizenId,
    `🚨 SOS Status: ${sos.status.replace(/_/g, ' ')}`,
    `Police Dispatch update: ${assignedUnit ? `Unit [${assignedUnit}] assigned.` : ''} ${notes || 'Police units are responding to your location.'}`,
    sos.id
  );

  AuditService.log({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'RESPOND_SOS_ALERT',
    resource: 'SOS_DISPATCH',
    resourceId: sos.id,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `Officer responded to citizen SOS. Assigned Unit: [${assignedUnit || 'N/A'}], Status: [${sos.status}].`
  });

  return res.json({
    success: true,
    sos
  });
});

export default router;
