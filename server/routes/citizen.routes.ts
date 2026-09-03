import { Router, Response } from 'express';
import {
  CrimeReport,
  CrimeType,
  CrimeSeverity,
  ReportStatus,
  ConsumerComplaint,
  ConsumerIssueType,
  ComplaintStatus,
  SOSRequest,
  SOSStatus,
  UserRole
} from '../../src/types';
import { db } from '../db/database';
import { verifyAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { NotificationService } from '../services/notification';
import { AuditService } from '../services/audit';

const router = Router();

// All stakeholders (citizens, police, consumer rights officers, admins) are citizens of Bangladesh
// and are authorized to access citizen safety and grievance services.
router.use(verifyAuth);
router.use(requireRoles(UserRole.CITIZEN, UserRole.POLICE, UserRole.CONSUMER_RIGHTS, UserRole.ADMIN));

// 1. Submit Crime Report
router.post('/reports', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const {
    crimeType,
    title,
    description,
    locationName,
    district,
    thana,
    latitude,
    longitude,
    occurredAt,
    severity,
    requestConfidentiality,
    evidence
  } = req.body;

  if (!crimeType || !title || !description || !locationName || !district || !thana) {
    return res.status(400).json({ error: 'Please provide all mandatory crime incident details.' });
  }

  const caseId = `CR-${(district.substring(0, 3)).toUpperCase()}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const reportId = `rep-${Date.now().toString(36)}`;

  const newReport: CrimeReport = {
    id: reportId,
    caseId,
    reporterId: user.id,
    reporterName: user.fullName,
    reporterPhone: user.phone,
    reporterNID: user.nidNumber,
    requestConfidentiality: Boolean(requestConfidentiality),
    crimeType: crimeType as CrimeType,
    title: title.trim(),
    description: description.trim(),
    locationName: locationName.trim(),
    district: district.trim(),
    thana: thana.trim(),
    latitude: Number(latitude) || 23.8103, // default to Dhaka if unprovided
    longitude: Number(longitude) || 90.4125,
    occurredAt: occurredAt || new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    severity: (severity as CrimeSeverity) || CrimeSeverity.MEDIUM,
    status: ReportStatus.SUBMITTED,
    evidence: evidence || [],
    investigationUpdates: [
      {
        id: `inv-${Date.now()}`,
        timestamp: new Date().toISOString(),
        officerName: 'System Automatic Ingestion',
        status: ReportStatus.SUBMITTED,
        note: 'Report officially lodged into National Public Safety Registry. Awaiting police preliminary review.'
      }
    ]
  };

  db.crimeReports.set(reportId, newReport);

  // Notify citizen of submission confirmation
  NotificationService.createCaseNotification(
    user.id,
    `Crime Report Lodged (${caseId})`,
    `Your report "${title}" has been registered with status SUBMITTED. Tracking case ID is ${caseId}.`,
    reportId
  );

  AuditService.log({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'LODGE_CRIME_REPORT',
    resource: caseId,
    resourceId: reportId,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `Crime report [${crimeType}] lodged. Confidentiality requested: ${Boolean(requestConfidentiality)}.`
  });

  return res.status(201).json({
    success: true,
    report: newReport,
    message: 'Report successfully submitted. Authorized police authorities have been notified for review.'
  });
});

// 2. Get Citizen's Own Crime Reports
router.get('/reports', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const myReports: CrimeReport[] = [];

  for (const [_, r] of db.crimeReports) {
    if (r.reporterId === user.id) {
      myReports.push(r);
    }
  }

  // Sort descending by submittedAt
  myReports.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return res.json({
    success: true,
    reports: myReports
  });
});

// 3. Submit Consumer Complaint
router.post('/complaints', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const {
    shopName,
    shopAddress,
    shopDistrict,
    shopThana,
    tradeLicenseOrBIN,
    productName,
    brandName,
    barcode,
    batchNumber,
    issueType,
    pricePaid,
    mrp,
    description,
    evidence
  } = req.body;

  if (!shopName || !shopDistrict || !shopThana || !productName || !issueType || !description) {
    return res.status(400).json({ error: 'Please provide shop details, product name, issue type, and description.' });
  }

  const trackingNumber = `DNCRP-${(shopDistrict.substring(0, 3)).toUpperCase()}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const complaintId = `comp-${Date.now().toString(36)}`;

  const newComplaint: ConsumerComplaint = {
    id: complaintId,
    trackingNumber,
    complainantId: user.id,
    complainantName: user.fullName,
    complainantPhone: user.phone,
    shopName: shopName.trim(),
    shopAddress: shopAddress ? shopAddress.trim() : `${shopThana}, ${shopDistrict}`,
    shopDistrict: shopDistrict.trim(),
    shopThana: shopThana.trim(),
    tradeLicenseOrBIN: tradeLicenseOrBIN ? tradeLicenseOrBIN.trim() : undefined,
    productName: productName.trim(),
    brandName: brandName ? brandName.trim() : undefined,
    barcode: barcode ? barcode.trim() : undefined,
    batchNumber: batchNumber ? batchNumber.trim() : undefined,
    issueType: issueType as ConsumerIssueType,
    pricePaid: pricePaid ? Number(pricePaid) : undefined,
    mrp: mrp ? Number(mrp) : undefined,
    description: description.trim(),
    submittedAt: new Date().toISOString(),
    status: ComplaintStatus.SUBMITTED,
    evidence: evidence || [],
    timeline: [
      {
        timestamp: new Date().toISOString(),
        status: ComplaintStatus.SUBMITTED,
        note: 'Consumer grievance registered. Awaiting DNCRP officer assignment.'
      }
    ]
  };

  db.consumerComplaints.set(complaintId, newComplaint);

  NotificationService.createComplaintNotification(
    user.id,
    `Complaint Registered: ${trackingNumber}`,
    `Your complaint regarding ${shopName} has been received by the Consumer Rights Directorate.`,
    complaintId
  );

  AuditService.log({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'LODGE_CONSUMER_COMPLAINT',
    resource: trackingNumber,
    resourceId: complaintId,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `Consumer complaint filed against [${shopName}] for [${issueType}].`
  });

  return res.status(201).json({
    success: true,
    complaint: newComplaint,
    message: 'Consumer complaint submitted to Directorate of National Consumers Right Protection (DNCRP).'
  });
});

// 4. Get Citizen's Own Complaints
router.get('/complaints', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const myComplaints: ConsumerComplaint[] = [];

  for (const [_, c] of db.consumerComplaints) {
    if (c.complainantId === user.id) {
      myComplaints.push(c);
    }
  }

  myComplaints.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return res.json({
    success: true,
    complaints: myComplaints
  });
});

// 5. Trigger Emergency SOS
router.post('/sos', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { locationName, latitude, longitude } = req.body;

  const sosId = `sos-${Date.now().toString(36)}`;
  const newSOS: SOSRequest = {
    id: sosId,
    citizenId: user.id,
    citizenName: user.fullName,
    citizenPhone: user.phone,
    citizenNID: user.nidNumber,
    locationName: locationName || 'Current GPS Pinpoint Location',
    latitude: Number(latitude) || 23.8103,
    longitude: Number(longitude) || 90.4125,
    status: SOSStatus.SOS_SENT,
    createdAt: new Date().toISOString()
  };

  db.sosRequests.set(sosId, newSOS);

  NotificationService.createSOSNotification(
    user.id,
    '🚨 EMERGENCY SOS BROADCAST ACTIVE',
    'Your distress signal has been transmitted to Bangladesh Police Emergency Command. Stay in a safe position.',
    sosId
  );

  AuditService.log({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'EMERGENCY_SOS_TRIGGERED',
    resource: 'SOS_DISPATCH',
    resourceId: sosId,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `Distress beacon triggered at [${newSOS.locationName} - Lat: ${newSOS.latitude}, Lng: ${newSOS.longitude}].`
  });

  return res.status(201).json({
    success: true,
    sos: newSOS,
    message: 'Emergency SOS transmitted to Central Police Command Dispatch.'
  });
});

// 6. Get Citizen's SOS Status
router.get('/sos/active', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const activeSOS = Array.from(db.sosRequests.values())
    .filter(s => s.citizenId === user.id && s.status !== SOSStatus.RESOLVED)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({
    success: true,
    activeSOS: activeSOS[0] || null
  });
});

// 7. Get Active Emergency Alerts for Citizens
router.get('/emergency-alerts', (req: AuthenticatedRequest, res: Response) => {
  const now = new Date().toISOString();
  const alerts = Array.from(db.emergencyAlerts.values())
    .filter(a => a.isActive && new Date(a.expirationTime).toISOString() > now)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({
    success: true,
    alerts
  });
});

// 8. Get Citizen Notifications
router.get('/notifications', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const notifs = NotificationService.getUserNotifications(user.id);
  return res.json({
    success: true,
    notifications: notifs
  });
});

// 9. Mark Notification Read
router.post('/notifications/:id/read', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  NotificationService.markAsRead(req.params.id, user.id);
  return res.json({ success: true });
});

// 10. Barcode Product Verification Lookup
router.get('/barcode/:barcode', (req: AuthenticatedRequest, res: Response) => {
  const code = req.params.barcode.trim();
  const item = db.barcodeRegistry.get(code);

  if (!item) {
    return res.json({
      success: true,
      found: false,
      barcode: code,
      message: 'Barcode not found in BSTI certified registry. Please exercise caution.'
    });
  }

  return res.json({
    success: true,
    found: true,
    product: item
  });
});

export default router;
