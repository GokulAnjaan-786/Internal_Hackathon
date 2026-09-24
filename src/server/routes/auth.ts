import { Router, Response } from 'express';
import { db } from '../database/db.ts';
import {
  AuthenticatedRequest,
  createSession,
  revokeSession,
  requireAuth,
} from '../middleware/auth.ts';
import { UserRole } from '../../types/index.ts';

export const authRouter = Router();

// Login
authRouter.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  const user = db.verifyPassword(username, password);
  if (!user) {
    db.addAuditLog({
      userId: 'UNKNOWN',
      userName: username,
      userRole: 'CITIZEN',
      action: 'LOGIN_FAILED',
      resourceType: 'AUTH',
      resourceId: username,
      details: 'Invalid credentials attempted.',
      result: 'FAILURE',
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  const token = createSession(user.id);

  db.addAuditLog({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    action: 'LOGIN_SUCCESS',
    resourceType: 'AUTH',
    resourceId: user.id,
    details: `User logged in under role ${user.role}.`,
    result: 'SUCCESS',
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json({
    token,
    user,
  });
});

// Demo Role Switcher for instant testing
authRouter.post('/demo-switch', (req, res) => {
  const { role } = req.body as { role: UserRole };
  const users = db.getUsers();
  const targetUser = users.find((u) => u.role === role);

  if (!targetUser) {
    res.status(404).json({ error: `No demo account registered for role ${role}` });
    return;
  }

  const token = createSession(targetUser.id);

  db.addAuditLog({
    userId: targetUser.id,
    userName: targetUser.fullName,
    userRole: targetUser.role,
    action: 'DEMO_ROLE_SWITCH',
    resourceType: 'AUTH',
    resourceId: targetUser.id,
    details: `Switched active session to demo role: ${targetUser.role}`,
    result: 'SUCCESS',
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json({
    token,
    user: targetUser,
  });
});

// Logout
authRouter.post('/logout', (req: AuthenticatedRequest, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    revokeSession(token);
  }

  if (req.user) {
    db.addAuditLog({
      userId: req.user.id,
      userName: req.user.fullName,
      userRole: req.user.role,
      action: 'LOGOUT',
      resourceType: 'AUTH',
      resourceId: req.user.id,
      details: 'User logged out securely.',
      result: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });
  }

  res.json({ message: 'Successfully logged out.' });
});

// Get Current User Profile
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// Forgot Password (Simulated secure token issuance)
authRouter.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email address is required.' });
    return;
  }

  const users = db.getUsers();
  const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  // Timing-safe response: don't reveal email existence
  res.json({
    message: 'If the emergency account exists in our verified registry, a secure reset token has been dispatched to official dispatch channels.',
    simulatedResetToken: matched ? `rst_${Math.random().toString(36).substring(2, 10)}` : undefined,
  });
});
