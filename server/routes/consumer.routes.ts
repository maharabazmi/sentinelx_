import { Router, Response } from 'express';
import {
  ConsumerComplaint,
  ComplaintStatus,
  ShopReputation,
  BarcodeVerification,
  UserRole
} from '../../src/types';
import { db } from '../db/database';
import { verifyAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { NotificationService } from '../services/notification';
import { AuditService } from '../services/audit';

const router = Router();

// Strict RBAC: CONSUMER_RIGHTS and ADMIN only
router.use(verifyAuth);
router.use(requireRoles(UserRole.CONSUMER_RIGHTS, UserRole.ADMIN));

// 1. Consumer Rights Directorate Dashboard Summary
router.get('/dashboard-summary', (req: AuthenticatedRequest, res: Response) => {
  const allComplaints = Array.from(db.consumerComplaints.values());
  const allShops = Array.from(db.shops.values());

  const newComplaints = allComplaints.filter(c => c.status === ComplaintStatus.SUBMITTED).length;
  const underReview = allComplaints.filter(c => c.status === ComplaintStatus.UNDER_REVIEW).length;
  const activeInvestigations = allComplaints.filter(c =>
    c.status === ComplaintStatus.VERIFIED || c.status === ComplaintStatus.INVESTIGATION
  ).length;
  const resolvedCases = allComplaints.filter(c => c.status === ComplaintStatus.RESOLVED).length;
  const penalizedShopsCount = allShops.filter(s => s.verifiedFinesCount > 0).length;

  return res.json({
    success: true,
    stats: {
      newComplaints,
      underReview,
      activeInvestigations,
      resolvedCases,
      totalRegisteredShops: allShops.length,
      penalizedShopsCount
    }
  });
});

// 2. Get All Consumer Complaints
router.get('/complaints', (req: AuthenticatedRequest, res: Response) => {
  const { status, district, issueType } = req.query;
  let complaints = Array.from(db.consumerComplaints.values());

  if (status) {
    complaints = complaints.filter(c => c.status === status);
  }
  if (district) {
    complaints = complaints.filter(c => c.shopDistrict.toLowerCase() === (district as string).toLowerCase());
  }
  if (issueType) {
    complaints = complaints.filter(c => c.issueType === issueType);
  }

  complaints.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return res.json({
    success: true,
    complaints
  });
});

// 3. Update Consumer Complaint Status & Enforce Actions
router.post('/complaints/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { status, inspectorNotes, penaltyImposed, note } = req.body;
  const complaint = db.consumerComplaints.get(req.params.id);

  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  if (status) complaint.status = status as ComplaintStatus;
  if (inspectorNotes) complaint.inspectorNotes = inspectorNotes;
  if (penaltyImposed) complaint.penaltyImposed = penaltyImposed;
  complaint.assignedOfficerName = user.fullName;

  complaint.timeline.push({
    timestamp: new Date().toISOString(),
    status: complaint.status,
    note: note || inspectorNotes || `Status updated to ${complaint.status} by DNCRP Inspector.`,
    officerName: user.fullName
  });

  // Check if shop exists in directory and adjust trust score
  let linkedShop: ShopReputation | undefined;
  for (const [_, s] of db.shops) {
    if (s.shopName.toLowerCase() === complaint.shopName.toLowerCase() ||
      (complaint.tradeLicenseOrBIN && s.tradeLicenseOrBIN === complaint.tradeLicenseOrBIN)) {
      linkedShop = s;
      break;
    }
  }

  if (linkedShop && status === ComplaintStatus.RESOLVED && penaltyImposed) {
    linkedShop.verifiedFinesCount += 1;
    linkedShop.resolvedComplaints += 1;
    linkedShop.trustScore = Math.max(1.0, Number((linkedShop.trustScore - 0.4).toFixed(1)));
    if (linkedShop.trustScore < 2.0) {
      linkedShop.complianceStatus = 'SUSPENDED';
    } else if (linkedShop.trustScore < 3.5) {
      linkedShop.complianceStatus = 'UNDER_WATCH';
    }
  }

  // Notify citizen
  NotificationService.createComplaintNotification(
    complaint.complainantId,
    `Consumer Dispute Update: ${complaint.trackingNumber}`,
    `Status updated to ${complaint.status}. ${penaltyImposed ? `Enforcement Order: ${penaltyImposed}` : ''}`,
    complaint.id
  );

  AuditService.log({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'UPDATE_CONSUMER_COMPLAINT',
    resource: complaint.trackingNumber,
    resourceId: complaint.id,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `DNCRP officer updated dispute [${complaint.trackingNumber}] to [${complaint.status}]. Penalty: [${penaltyImposed || 'None'}].`
  });

  return res.json({
    success: true,
    complaint,
    message: 'Consumer complaint record updated.'
  });
});

// 4. Shop Directory & Trust Scores
router.get('/shops', (req: AuthenticatedRequest, res: Response) => {
  const shops = Array.from(db.shops.values()).sort((a, b) => b.trustScore - a.trustScore);
  return res.json({
    success: true,
    shops
  });
});

router.post('/shops', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { shopName, tradeLicenseOrBIN, address, district, thana, category, complianceStatus } = req.body;

  if (!shopName || !tradeLicenseOrBIN || !district || !thana) {
    return res.status(400).json({ error: 'Shop name, BIN/Trade License, and location are required.' });
  }

  const shopId = `shop-${Date.now().toString(36)}`;
  const newShop: ShopReputation = {
    id: shopId,
    shopName: shopName.trim(),
    tradeLicenseOrBIN: tradeLicenseOrBIN.trim(),
    address: address ? address.trim() : `${thana}, ${district}`,
    district: district.trim(),
    thana: thana.trim(),
    category: category || 'General Merchandise',
    trustScore: 4.5,
    totalComplaints: 0,
    resolvedComplaints: 0,
    verifiedFinesCount: 0,
    lastInspectedAt: new Date().toISOString(),
    complianceStatus: complianceStatus || 'GOOD'
  };

  db.shops.set(shopId, newShop);

  AuditService.log({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'REGISTER_MERCHANT_ESTABLISHMENT',
    resource: tradeLicenseOrBIN,
    resourceId: shopId,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `New merchant registered into DNCRP Surveillance index: [${shopName}].`
  });

  return res.status(201).json({
    success: true,
    shop: newShop
  });
});

// 5. Barcode Product Registry Management
router.get('/barcodes', (req: AuthenticatedRequest, res: Response) => {
  const barcodes = Array.from(db.barcodeRegistry.values());
  return res.json({
    success: true,
    barcodes
  });
});

router.post('/barcodes', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { barcode, productName, companyName, bstiStandard, mrp, status } = req.body;

  if (!barcode || !productName || !companyName) {
    return res.status(400).json({ error: 'Barcode, Product Name, and Company are required.' });
  }

  const newBarcode: BarcodeVerification = {
    barcode: barcode.trim(),
    productName: productName.trim(),
    companyName: companyName.trim(),
    bstiStandard: bstiStandard || 'BSTI Standard BDS 2026',
    mrp: Number(mrp) || 100,
    isRegistered: status !== 'COUNTERFEIT_FLAGGED',
    status: status || 'AUTHENTIC'
  };

  db.barcodeRegistry.set(newBarcode.barcode, newBarcode);

  AuditService.log({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'UPDATE_BARCODE_REGISTRY',
    resource: barcode,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `Product barcode [${barcode}] registered with status [${newBarcode.status}].`
  });

  return res.status(201).json({
    success: true,
    product: newBarcode
  });
});

export default router;
