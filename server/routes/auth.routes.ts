import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../../src/types';
import { db } from '../db/database';
import { MockNIDVerificationService, PorichoyNIDVerificationService } from '../services/nid-verification';
import { generateToken, verifyAuth, AuthenticatedRequest } from '../middleware/auth';
import { AuditService } from '../services/audit';

const router = Router();
const mockNIDService = new MockNIDVerificationService();
const porichoyNIDService = new PorichoyNIDVerificationService();

// Verify NID (Step 1 of Citizen Registration)
router.post('/verify-nid', async (req: Request, res: Response) => {
  const { nidNumber, dob, usePorichoyLive } = req.body;

  if (!nidNumber || !dob) {
    return res.status(400).json({ error: 'NID Number and Date of Birth are mandatory for identity verification.' });
  }

  try {
    const service = usePorichoyLive ? porichoyNIDService : mockNIDService;
    const result = await service.verifyNID(nidNumber, dob);

    // Check if an existing account is already registered with this NID
    let existingUser = false;
    for (const [_, u] of db.users) {
      if (u.nidNumber === nidNumber.trim()) {
        existingUser = true;
        break;
      }
    }

    return res.json({
      success: true,
      verification: result,
      alreadyRegistered: existingUser
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'NID Verification failed.' });
  }
});

// Citizen Registration (Step 2 - completing account creation after verified NID)
router.post('/register', async (req: Request, res: Response) => {
  const { nidNumber, dob, fullName, email, phone, password, address, thana, district } = req.body;

  if (!nidNumber || !password || !fullName || !phone) {
    return res.status(400).json({ error: 'Missing required registration fields.' });
  }

  // Check NID uniqueness
  for (const [_, u] of db.users) {
    if (u.nidNumber === nidNumber.trim()) {
      return res.status(400).json({ error: 'An account is already linked to this Bangladesh National ID (NID).' });
    }
    if (email && u.email.toLowerCase() === email.toLowerCase()) {
      return res.status(400).json({ error: 'Email address is already in use.' });
    }
  }

  const userId = `user-cit-${Date.now().toString(36)}`;
  const passwordHash = bcrypt.hashSync(password, 8);

  const newUser: User = {
    id: userId,
    nidNumber: nidNumber.trim(),
    fullName: fullName.trim(),
    email: email ? email.trim() : `${nidNumber}@citizen.sentinelx.bd`,
    phone: phone.trim(),
    role: UserRole.CITIZEN,
    isNIDVerified: true,
    stationOrThana: `${thana || 'Sadar'}, ${district || 'Dhaka'}`,
    createdAt: new Date().toISOString()
  };

  db.users.set(userId, { ...newUser, passwordHash });

  AuditService.log({
    userId: newUser.id,
    userName: newUser.fullName,
    userRole: newUser.role,
    action: 'CITIZEN_REGISTRATION_VERIFIED',
    resource: 'USER_REGISTRY',
    resourceId: newUser.id,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `Citizen successfully verified with NID [${nidNumber}] and created account.`
  });

  const token = generateToken(newUser);
  return res.status(201).json({
    success: true,
    token,
    user: newUser
  });
});

// Login (Citizens & Authorities)
router.post('/login', async (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Please provide NID, Email, or Badge ID, and your Password.' });
  }

  let foundUser: (User & { passwordHash: string }) | null = null;
  const searchKey = identifier.trim().toLowerCase();

  for (const [_, u] of db.users) {
    if (
      u.nidNumber.toLowerCase() === searchKey ||
      u.email.toLowerCase() === searchKey ||
      (u.badgeNumber && u.badgeNumber.toLowerCase() === searchKey) ||
      u.phone === identifier.trim()
    ) {
      foundUser = u;
      break;
    }
  }

  if (!foundUser) {
    return res.status(401).json({ error: 'Invalid credentials. User not found.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, foundUser.passwordHash);
  if (!isPasswordValid) {
    AuditService.log({
      userId: foundUser.id,
      userName: foundUser.fullName,
      userRole: foundUser.role,
      action: 'LOGIN_FAILED',
      resource: 'AUTH',
      ipAddress: req.ip,
      status: 'DENIED',
      details: 'Incorrect password provided.'
    });
    return res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
  }

  const { passwordHash, ...safeUser } = foundUser;
  const token = generateToken(safeUser);

  AuditService.log({
    userId: safeUser.id,
    userName: safeUser.fullName,
    userRole: safeUser.role,
    action: 'USER_LOGIN',
    resource: 'AUTH',
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `User logged in with role [${safeUser.role}].`
  });

  return res.json({
    success: true,
    token,
    user: safeUser
  });
});

// Current User Profile
router.get('/me', verifyAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    user: req.user
  });
});

// Quick Role Switcher for Developer Review and Demonstration
// CONSTRAINTS:
// 1. Citizens cannot switch to authority roles (POLICE, CONSUMER_RIGHTS, ADMIN).
// 2. Consumer Rights officers cannot switch to Police or Admin (their authority role is locked, but can access Citizen view).
// 3. Police officers cannot switch to Consumer Rights or Admin (their authority role is locked, but can access Citizen view).
// 4. System Admin cannot switch to Police or Consumer Rights (role is locked, but can access Citizen view).
// 5. Authority stakeholders (Police, Consumer Rights, Admin) are citizens first, so they can switch to Citizen mode or their own authority role, but cannot switch between different authority agencies.
router.post('/demo-switch', (req: Request, res: Response) => {
  const { role } = req.body as { role: UserRole };
  const authHeader = req.headers.authorization;
  
  let currentUser: User | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sentinelx-bangladesh-national-security-token-secret-2026') as any;
      const found = db.users.get(decoded.id);
      if (found) {
        const { passwordHash, ...safe } = found;
        currentUser = safe;
      }
    } catch {
      // unauthenticated demo switch allowed from landing
    }
  }

  // Enforce security constraints
  if (!currentUser) {
    // Guest constraint: Public portal is only for Citizen services
    if (role !== UserRole.CITIZEN) {
      return res.status(403).json({
        error: 'Access Denied: Public portal (guest) access is strictly restricted to Citizen Services only. Official credentials are required to access Police, Consumer Rights (DNCRP), or System Admin portals.'
      });
    }
  } else {
    // Constraint 1: Citizen can only be Citizen and take services as citizen
    if (currentUser.role === UserRole.CITIZEN && role !== UserRole.CITIZEN) {
      AuditService.log({
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'UNAUTHORIZED_ROLE_SWITCH_BLOCKED',
        resource: 'AUTH',
        ipAddress: req.ip,
        status: 'DENIED',
        details: `Citizen [${currentUser.fullName}] attempted unauthorized escalation to role [${role}]. Access restricted.`
      });
      return res.status(403).json({
        error: 'Access Denied: Citizens are registered as citizens and cannot elevate or switch to law enforcement or authority roles.'
      });
    }

    // Constraint 2: Authority roles cannot switch to another distinct authority role
    if (currentUser.role === UserRole.POLICE && role !== UserRole.POLICE && role !== UserRole.CITIZEN) {
      return res.status(403).json({
        error: 'Access Denied: Police authority accounts cannot switch to Consumer Rights or System Administration.'
      });
    }

    if (currentUser.role === UserRole.CONSUMER_RIGHTS && role !== UserRole.CONSUMER_RIGHTS && role !== UserRole.CITIZEN) {
      return res.status(403).json({
        error: 'Access Denied: Consumer Rights officers cannot switch to Police or System Administration.'
      });
    }

    if (currentUser.role === UserRole.ADMIN && role !== UserRole.ADMIN && role !== UserRole.CITIZEN) {
      return res.status(403).json({
        error: 'Access Denied: System Administrators cannot switch to Police or Consumer Rights operational roles.'
      });
    }
  }
  
  let targetUser: (User & { passwordHash: string }) | undefined;

  for (const [_, u] of db.users) {
    if (u.role === role) {
      targetUser = u;
      break;
    }
  }

  if (!targetUser) {
    return res.status(404).json({ error: `Demo user for role ${role} not found.` });
  }

  const { passwordHash, ...safeUser } = targetUser;
  const token = generateToken(safeUser);

  AuditService.log({
    userId: safeUser.id,
    userName: safeUser.fullName,
    userRole: safeUser.role,
    action: 'DEMO_ROLE_SWITCH',
    resource: 'AUTH',
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: `Active session set to role [${role}].`
  });

  return res.json({
    success: true,
    token,
    user: safeUser
  });
});

export default router;
