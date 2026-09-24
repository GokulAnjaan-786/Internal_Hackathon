import { Router, Request, Response } from 'express';
import { db } from '../database/db.ts';
import {
  AuthenticatedRequest,
  requireAuth,
  requireRole,
} from '../middleware/auth.ts';

export const systemRouter = Router();

// Dashboard Analytics & KPIs
systemRouter.get(
  '/analytics',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const allCases = db.getAllCases();
    const allReports = db.getAllReports();
    const allSightings = db.getAllSightings();
    const allTasks = db.getAllTasks();

    const activeCases = allCases.filter(
      (c) => c.status === 'Active' || c.status === 'Under Investigation'
    ).length;
    const urgentCases = allCases.filter((c) => c.priority === 'Urgent').length;
    const resolvedCases = allCases.filter(
      (c) => c.status === 'Person Located' || c.status === 'Resolved'
    ).length;

    const pendingReviewReports = allReports.filter(
      (r) => r.verificationStatus === 'New' || r.verificationStatus === 'Under Review'
    ).length;
    const verifiedSightings = allSightings.filter((s) => s.verificationStatus === 'Verified').length;
    const unverifiedSightings = allSightings.filter((s) => s.verificationStatus === 'Unverified').length;

    const openTasks = allTasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress').length;
    const urgentTasks = allTasks.filter(
      (t) => (t.status === 'Pending' || t.status === 'In Progress') && t.priority === 'Urgent'
    ).length;

    res.json({
      activeCases,
      urgentCases,
      resolvedCases,
      totalCases: allCases.length,
      pendingReviewReports,
      verifiedSightings,
      unverifiedSightings,
      totalSightings: allSightings.length,
      openTasks,
      urgentTasks,
      totalTasks: allTasks.length,
    });
  }
);

// Immutable Audit Logs Viewer
systemRouter.get(
  '/audit-logs',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { resourceType, result, limit = 150 } = req.query;
    let logs = db.getAuditLogs(Number(limit));

    if (resourceType && typeof resourceType === 'string' && resourceType !== 'All') {
      logs = logs.filter((l) => l.resourceType === resourceType);
    }

    if (result && typeof result === 'string' && result !== 'All') {
      logs = logs.filter((l) => l.result === result);
    }

    res.json({ total: logs.length, logs });
  }
);

// In-app Notifications
systemRouter.get(
  '/notifications',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const notifications = db.getNotifications(user.role, user.id);
    res.json({
      unreadCount: notifications.filter((n) => !n.read).length,
      notifications,
    });
  }
);

// Mark Notification as Read
systemRouter.post(
  '/notifications/:id/read',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const success = db.markNotificationRead(id);
    res.json({ success });
  }
);

// Mark All Notifications as Read
systemRouter.post(
  '/notifications/read-all',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    db.markAllNotificationsRead();
    res.json({ success: true });
  }
);

// Get Users List (for assignment & officer dispatch)
systemRouter.get(
  '/users',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const users = db.getUsers().map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      agency: u.agency,
      badgeNumber: u.badgeNumber,
      avatar: u.avatar,
    }));
    res.json({ users });
  }
);

// Health & Readiness Observability
systemRouter.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'HEALTHY',
    service: 'missing-person-case-organiser',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: 'In-Memory Relational OK',
    memoryUsage: process.memoryUsage().heapUsed,
  });
});

systemRouter.get('/ready', (req: Request, res: Response) => {
  res.status(200).json({
    ready: true,
    service: 'missing-person-case-organiser',
    timestamp: new Date().toISOString(),
  });
});
