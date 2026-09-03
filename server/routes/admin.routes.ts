import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, UserRole, CrimeType } from '../../src/types';
import { db } from '../db/database';
import { verifyAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { DemonstrationAIPredictionService } from '../services/ai-prediction';
import { AuditService } from '../services/audit';

const router = Router();
const aiPredictionService = new DemonstrationAIPredictionService();

// Strict RBAC: ADMIN ONLY
router.use(verifyAuth);
router.use(requireRoles(UserRole.ADMIN));

// 1. Admin System Dashboard Statistics
router.get('/system-overview', (req: AuthenticatedRequest, res: Response) => {
  const usersList = Array.from(db.users.values());
  const crimeReports = Array.from(db.crimeReports.values());
  const consumerComplaints = Array.from(db.consumerComplaints.values());
  const emergencyAlerts = Array.from(db.emergencyAlerts.values());
  const sosRequests = Array.from(db.sosRequests.values());

  const usersByRole = {
    CITIZEN: usersList.filter(u => u.role === UserRole.CITIZEN).length,
    POLICE: usersList.filter(u => u.role === UserRole.POLICE).length,
    CONSUMER_RIGHTS: usersList.filter(u => u.role === UserRole.CONSUMER_RIGHTS).length,
    ADMIN: usersList.filter(u => u.role === UserRole.ADMIN).length
  };

  const securityStatus = {
    encryptionEngine: 'AES-256-GCM + PBKDF2 / Bcrypt Active',
    porichoyGateway: process.env.PORICHOY_API_KEY ? 'LIVE_PRODUCTION' : 'MOCK_SANDBOX_ACTIVE',
    aiPredictionEngine: 'ONLINE (Demonstration Inference Mode)',
    uptimeSeconds: Math.floor(process.uptime()),
    databaseType: 'PostgreSQL Relational Structure / Secure In-Memory Cluster',
    totalAuditLogs: db.auditLogs.length,
    unauthorizedAttemptsBlocked: db.auditLogs.filter(l => l.status === 'DENIED').length
  };

  return res.json({
    success: true,
    stats: {
      totalUsers: usersList.length,
      usersByRole,
      totalCrimesLodged: crimeReports.length,
      verifiedCrimes: crimeReports.filter(c => c.status !== 'SUBMITTED' && c.status !== 'REJECTED').length,
      totalConsumerComplaints: consumerComplaints.length,
      totalEmergencyAlertsIssued: emergencyAlerts.length,
      totalSOSRequests: sosRequests.length,
      securityStatus
    }
  });
});

// 2. User & Authority Account Management
router.get('/users', (req: AuthenticatedRequest, res: Response) => {
  const safeUsers = Array.from(db.users.values()).map(({ passwordHash, ...user }) => user);
  return res.json({
    success: true,
    users: safeUsers
  });
});

router.post('/users', (req: AuthenticatedRequest, res: Response) => {
  const adminUser = req.user!;
  const { fullName, email, phone, nidNumber, role, badgeNumber, designation, department, stationOrThana, password } = req.body;

  if (!fullName || !email || !phone || !nidNumber || !role || !password) {
    return res.status(400).json({ error: 'Missing mandatory user fields.' });
  }

  // Check unique NID and Email
  for (const [_, u] of db.users) {
    if (u.nidNumber === nidNumber.trim()) {
      return res.status(400).json({ error: 'NID number is already assigned to an existing account.' });
    }
    if (u.email.toLowerCase() === email.toLowerCase()) {
      return res.status(400).json({ error: 'Email address already exists.' });
    }
  }

  const userId = `user-${role.substring(0, 3).toLowerCase()}-${Date.now().toString(36)}`;
  const passwordHash = bcrypt.hashSync(password, 8);

  const newUser: User = {
    id: userId,
    nidNumber: nidNumber.trim(),
    fullName: fullName.trim(),
    email: email.trim(),
    phone: phone.trim(),
    role: role as UserRole,
    badgeNumber: badgeNumber?.trim(),
    designation: designation?.trim(),
    department: department?.trim(),
    stationOrThana: stationOrThana?.trim(),
    isNIDVerified: true,
    createdAt: new Date().toISOString()
  };

  db.users.set(userId, { ...newUser, passwordHash });

  AuditService.log({
    userId: adminUser.id,
    userName: adminUser.fullName,
    userRole: adminUser.role,
    action: 'CREATE_AUTHORITY_USER',
    resource: 'USER_REGISTRY',
    resourceId: userId,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `Admin provisioned new account [${fullName}] with role [${role}].`
  });

  return res.status(201).json({
    success: true,
    user: newUser
  });
});

// 3. ADMIN-ONLY AI Crime Prediction Dashboard Data
router.get('/ai-predictions', async (req: AuthenticatedRequest, res: Response) => {
  const { district, thana } = req.query;
  const predictions = await aiPredictionService.getPredictions(district as string, thana as string);

  AuditService.log({
    userId: req.user!.id,
    userName: req.user!.fullName,
    userRole: req.user!.role,
    action: 'QUERY_AI_PREDICTIONS',
    resource: 'AI_PREDICTION_ENGINE',
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: 'Admin accessed AI crime prediction spatial-temporal analysis results.'
  });

  return res.json({
    success: true,
    disclaimer: 'Demonstration Prediction - Model results for strategic planning and resource deployment evaluation only.',
    predictions
  });
});

// 4. Generate AI Scenario Simulation
router.post('/ai-predictions/generate', async (req: AuthenticatedRequest, res: Response) => {
  const { district, thana, targetDate, crimeType, weather, isFestival } = req.body;

  if (!district || !thana) {
    return res.status(400).json({ error: 'Target District and Thana are required.' });
  }

  const analysis = await aiPredictionService.generatePredictiveAnalysis({
    district: district.trim(),
    thana: thana.trim(),
    targetDate: targetDate || new Date().toISOString(),
    crimeType: crimeType as CrimeType,
    weather: weather || 'Monsoon Clear',
    isFestival: Boolean(isFestival)
  });

  AuditService.log({
    userId: req.user!.id,
    userName: req.user!.fullName,
    userRole: req.user!.role,
    action: 'GENERATE_AI_SCENARIO_PREDICTION',
    resource: `${district}/${thana}`,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `Admin generated AI crime risk forecast for [${thana}, ${district}]. Risk Score: [${analysis.predictedRiskLevel}].`
  });

  return res.json({
    success: true,
    prediction: analysis
  });
});

// 5. System Audit Logs
router.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  const { role, action, limit } = req.query;
  const logs = AuditService.getLogs({
    userRole: role as UserRole,
    action: action as string,
    limit: limit ? Number(limit) : 100
  });

  return res.json({
    success: true,
    totalLogs: logs.length,
    logs
  });
});

// 6. Security and Configuration State
router.get('/security-config', (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    config: {
      porichoyApiEndpoint: 'https://api.porichoy.bd/v2/verifications/autofill',
      porichoyMockMode: true,
      encryptionAlgorithm: 'AES-256-GCM',
      jwtExpirationHours: 24,
      aiModel: 'SentinelX-CrimeRisk-GradientBoostedTree v2.4 (Demo)',
      heatmapAccessRole: 'POLICE, ADMIN',
      aiPredictionAccessRole: 'ADMIN ONLY',
      nidVerificationEnforced: true
    }
  });
});

export default router;
