import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../../src/types';
import { db } from '../db/database';
import { AuditService } from '../services/audit';

const JWT_SECRET = process.env.JWT_SECRET || 'sentinelx-bangladesh-national-security-token-secret-2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      nidNumber: user.nidNumber,
      fullName: user.fullName,
      role: user.role,
      department: user.department,
      badgeNumber: user.badgeNumber
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authentication token missing or invalid.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = db.users.get(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User account not found or deactivated.' });
    }

    const { passwordHash, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Token expired or signature verification failed.' });
  }
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Audit log the unauthorized access attempt for security monitoring
      AuditService.log({
        userId: req.user.id,
        userName: req.user.fullName,
        userRole: req.user.role,
        action: 'UNAUTHORIZED_RESOURCE_ACCESS_ATTEMPT',
        resource: req.originalUrl,
        ipAddress: req.ip,
        status: 'DENIED',
        details: `Access to role-restricted endpoint [${allowedRoles.join(', ')}] was blocked for user with role [${req.user.role}].`
      });

      return res.status(403).json({
        error: `Forbidden: This resource is strictly restricted to ${allowedRoles.join(' / ')} personnel. Your current role is ${req.user.role}.`
      });
    }

    next();
  };
}
