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

// GET What Changed Since Last Login
systemRouter.get(
  '/what-changed',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const summary = db.getWhatChangedForUser(user.id);
    res.json(summary);
  }
);

// GET Senior Officer Command Dashboard
systemRouter.get(
  '/senior-dashboard',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const data = db.getSeniorOfficerDashboardData();
    res.json(data);
  }
);

// GET Stale Cases & Threshold Configuration
systemRouter.get(
  '/stale-cases',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const hours = req.query.threshold ? Number(req.query.threshold) : db.getStaleThresholdHours();
    const staleCases = db.getStaleCases(hours);
    res.json({
      thresholdHours: hours,
      count: staleCases.length,
      staleCases,
    });
  }
);

systemRouter.post(
  '/stale-threshold',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { hours } = req.body;
    if (!hours || isNaN(Number(hours)) || Number(hours) < 1) {
      res.status(400).json({ error: 'Valid threshold hours required.' });
      return;
    }
    const updated = db.setStaleThresholdHours(Number(hours));
    res.json({ thresholdHours: updated });
  }
);

// Global Search (Search across Cases, Reports, Sightings, Leads, Tasks with RBAC)
systemRouter.get(
  '/search',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    if (!q) {
      res.json({ cases: [], reports: [], sightings: [], leads: [], tasks: [] });
      return;
    }

    const user = req.user!;
    const isCitizen = user.role === 'CITIZEN';

    const cases = db.getAllCases()
      .filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.person.fullName.toLowerCase().includes(q) ||
          c.person.lastKnownLocation.toLowerCase().includes(q) ||
          c.person.identifyingMarks.toLowerCase().includes(q)
      )
      .map((c) => (isCitizen ? { ...c, internalNotes: undefined } : c));

    const reports = db.getAllReports()
      .filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.reporterName.toLowerCase().includes(q)
      )
      .map((r) => (isCitizen ? { ...r, verificationNotes: undefined, reporterContact: undefined } : r));

    const sightings = db.getAllSightings().filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );

    const leads = isCitizen
      ? []
      : db.getAllLeads().filter(
          (l) =>
            l.id.toLowerCase().includes(q) ||
            l.title.toLowerCase().includes(q) ||
            l.description.toLowerCase().includes(q) ||
            (l.assignedOfficerName && l.assignedOfficerName.toLowerCase().includes(q))
        );

    const tasks = isCitizen
      ? []
      : db.getAllTasks().filter(
          (t) =>
            t.id.toLowerCase().includes(q) ||
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.assignedOfficerName.toLowerCase().includes(q)
        );

    res.json({
      query: q,
      totalCount: cases.length + reports.length + sightings.length + leads.length + tasks.length,
      cases,
      reports,
      sightings,
      leads,
      tasks,
    });
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

