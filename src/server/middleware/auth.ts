import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../../types/index.ts';
import { db } from '../database/db.ts';

// Extend Express Request to carry authenticated user
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// In-Memory Session Token Store
const activeSessions = new Map<string, { userId: string; expiresAt: number }>();

export function createSession(userId: string): string {
  const token = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  // 24 hours expiry
  activeSessions.set(token, {
    userId,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
  return token;
}

export function revokeSession(token: string): void {
  activeSessions.delete(token);
}

export function getSessionUser(token: string): User | null {
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return db.getUserById(session.userId) || null;
}

// Authentication Middleware
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers['x-session-token']) {
    token = req.headers['x-session-token'] as string;
  }

  // Also support demo cookie or fallback header
  if (!token) {
    // If citizen/public route, allowed
    req.user = undefined;
    return next();
  }

  const user = getSessionUser(token);
  if (!user) {
    res.status(401).json({
      error: 'Invalid or expired session. Please authenticate.',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  req.user = user;
  next();
}

// Require Login Middleware
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required to access this emergency case resource.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }
  next();
}

// Role-Based Access Control (RBAC)
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      db.addAuditLog({
        userId: req.user.id,
        userName: req.user.fullName,
        userRole: req.user.role,
        action: 'ACCESS_DENIED',
        resourceType: 'SYSTEM',
        resourceId: req.path,
        details: `Role ${req.user.role} attempted unauthorized access to ${req.method} ${req.path}`,
        result: 'DENIED',
        ipAddress: req.ip || '127.0.0.1',
      });

      res.status(403).json({
        error: `Access denied. Role '${req.user.role}' lacks permission for this operation.`,
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  };
}

// Simple IP Rate Limiter for Emergency Endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(limit = 60, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const current = rateLimitMap.get(ip);

    if (!current || now > current.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > limit) {
      res.status(429).json({
        error: 'Too many requests. Please slow down to preserve emergency system availability.',
        code: 'RATE_LIMITED',
      });
      return;
    }

    next();
  };
}
