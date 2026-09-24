import { Router, Response } from 'express';
import { db } from '../database/db.ts';
import {
  AuthenticatedRequest,
  requireAuth,
  requireRole,
} from '../middleware/auth.ts';
import { Case, CaseStatus, PriorityLevel, FileAttachment } from '../../types/index.ts';

export const casesRouter = Router();

// List Cases with filters and pagination
casesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { status, priority, search, agency, includeArchived } = req.query;
  const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';

  let cases = db.getAllCases(includeArchived === 'true' && isSuperAdmin);

  // Filter by status
  if (status && typeof status === 'string' && status !== 'All') {
    cases = cases.filter((c) => c.status.toLowerCase() === status.toLowerCase());
  }

  // Filter by priority
  if (priority && typeof priority === 'string' && priority !== 'All') {
    cases = cases.filter((c) => c.priority.toLowerCase() === priority.toLowerCase());
  }

  // Filter by agency
  if (agency && typeof agency === 'string') {
    cases = cases.filter((c) => c.leadAgency.toLowerCase().includes(agency.toLowerCase()));
  }

  // Search keyword (case ID, full name, location, identifying marks)
  if (search && typeof search === 'string') {
    const q = search.toLowerCase().trim();
    cases = cases.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.person.fullName.toLowerCase().includes(q) ||
        c.person.lastKnownLocation.toLowerCase().includes(q) ||
        c.person.identifyingMarks.toLowerCase().includes(q) ||
        c.person.clothingDescription.toLowerCase().includes(q)
    );
  }

  // Data Minimization for Unauthenticated or Citizen views
  if (!req.user || req.user.role === 'CITIZEN') {
    cases = cases.map((c) => ({
      ...c,
      internalNotes: undefined, // Strip internal investigation notes
      person: {
        ...c.person,
        reportingPersonContact: undefined as unknown as string, // Hide family phone numbers
      },
    }));
  }

  res.json({
    total: cases.length,
    cases,
  });
});

// Get Single Case Details
casesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const targetCase = db.getCaseById(id);

  if (!targetCase) {
    res.status(404).json({ error: `Case ${id} not found in database.` });
    return;
  }

  // Privacy Check & Data Minimization
  if (!req.user || req.user.role === 'CITIZEN') {
    const sanitized = {
      ...targetCase,
      internalNotes: undefined,
      person: {
        ...targetCase.person,
        reportingPersonContact: undefined as unknown as string,
      },
    };
    res.json(sanitized);
    return;
  }

  res.json(targetCase);
});

// GET /api/cases/:id/locations
casesRouter.get('/:id/locations', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, from, to } = req.query;

  const targetCase = db.getCaseById(id);
  if (!targetCase) {
    res.status(404).json({ error: `Case ${id} not found.` });
    return;
  }

  const locations = db.getCaseLocations(id, {
    status: typeof status === 'string' ? status : undefined,
    fromDate: typeof from === 'string' ? from : undefined,
    toDate: typeof to === 'string' ? to : undefined,
    userRole: req.user?.role,
  });

  res.json({
    caseId: id,
    total: locations.length,
    locations,
  });
});

// GET /api/cases/:id/map
casesRouter.get('/:id/map', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const targetCase = db.getCaseById(id);
  if (!targetCase) {
    res.status(404).json({ error: `Case ${id} not found.` });
    return;
  }

  const locations = db.getCaseLocations(id, { userRole: req.user?.role });
  const timeline = db.getTimelineEvents(id);

  // Compute bounding box
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  if (locations.length > 0) {
    locations.forEach((loc) => {
      if (loc.latitude < minLat) minLat = loc.latitude;
      if (loc.latitude > maxLat) maxLat = loc.latitude;
      if (loc.longitude < minLng) minLng = loc.longitude;
      if (loc.longitude > maxLng) maxLng = loc.longitude;
    });
  } else {
    minLat = targetCase.person.lastKnownCoordinates?.lat || 10.9976;
    maxLat = minLat;
    minLng = targetCase.person.lastKnownCoordinates?.lng || 76.9664;
    maxLng = minLng;
  }

  const verifiedCount = locations.filter((l) => l.verificationStatus === 'Verified').length;
  const underReviewCount = locations.filter((l) => l.verificationStatus === 'Under Review').length;
  const unverifiedCount = locations.filter((l) => !l.verificationStatus || (l.verificationStatus !== 'Verified' && l.verificationStatus !== 'Under Review')).length;

  res.json({
    caseId: id,
    title: targetCase.title,
    personName: targetCase.person.fullName,
    photoUrl: targetCase.person.photoUrl,
    status: targetCase.status,
    priority: targetCase.priority,
    lastKnownLocation: targetCase.person.lastKnownLocation,
    lastKnownCoordinates: targetCase.person.lastKnownCoordinates,
    dateMissing: targetCase.person.dateMissing,
    timeMissing: targetCase.person.timeMissing,
    locations,
    timeline,
    bounds: { minLat, maxLat, minLng, maxLng },
    stats: {
      totalLocations: locations.length,
      verifiedCount,
      underReviewCount,
      unverifiedCount,
    },
  });
});


// Create Case
casesRouter.post(
  '/',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'HOSPITAL_SHELTER']),
  (req: AuthenticatedRequest, res: Response) => {
    const {
      fullName,
      age,
      gender,
      photoUrl,
      height,
      physicalDescription,
      identifyingMarks,
      clothingDescription,
      languages,
      medicalConditions,
      lastKnownLocation,
      lastKnownCoordinates,
      lastKnownActivity,
      circumstances,
      reportingPersonName,
      reportingPersonContact,
      reportingPersonRelationship,
      dateMissing,
      timeMissing,
      priority = 'Medium',
      internalNotes,
    } = req.body;

    // Field Validations
    if (!fullName || !fullName.trim()) {
      res.status(400).json({ error: 'Missing person full name is required.' });
      return;
    }

    const parsedAge = Number(age);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120) {
      res.status(400).json({ error: 'Age must be a valid number between 0 and 120.' });
      return;
    }

    if (!dateMissing) {
      res.status(400).json({ error: 'Date missing is required.' });
      return;
    }

    if (!lastKnownLocation) {
      res.status(400).json({ error: 'Last known location is required.' });
      return;
    }

    const caseId = db.generateCaseId();
    const user = req.user!;

    const newCase: Case = {
      id: caseId,
      title: `${fullName.trim()} - Missing from ${lastKnownLocation.trim()}`,
      status: 'Active',
      priority: (priority as PriorityLevel) || 'Medium',
      assignedOfficerId: user.id,
      assignedOfficerName: user.fullName,
      leadAgency: user.agency || 'Unified Incident Command',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isArchived: false,
      internalNotes: internalNotes || '',
      statusHistory: [
        {
          fromStatus: 'Draft',
          toStatus: 'Active',
          changedBy: user.fullName,
          changedById: user.id,
          timestamp: new Date().toISOString(),
          reason: 'Initial case intake verified and activated.',
        },
      ],
      person: {
        fullName: fullName.trim(),
        age: parsedAge,
        gender: gender || 'Unknown',
        photoUrl:
          photoUrl ||
          'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
        height: height || 'Not specified',
        physicalDescription: physicalDescription || '',
        identifyingMarks: identifyingMarks || 'None noted',
        clothingDescription: clothingDescription || 'Unknown',
        languages: Array.isArray(languages) ? languages : [languages || 'English'],
        medicalConditions: medicalConditions || '',
        lastKnownLocation: lastKnownLocation.trim(),
        lastKnownCoordinates: lastKnownCoordinates || { lat: 37.7749, lng: -122.4194 },
        lastKnownActivity: lastKnownActivity || '',
        circumstances: circumstances || '',
        reportingPersonName: reportingPersonName || 'Confidential First Responder',
        reportingPersonContact: reportingPersonContact || '',
        reportingPersonRelationship: reportingPersonRelationship || 'Official Intake',
        dateMissing,
        timeMissing: timeMissing || 'Unknown',
      },
    };

    db.createCase(newCase);

    // Record Timeline Event
    db.addTimelineEvent({
      caseId: newCase.id,
      eventType: 'CASE_CREATED',
      title: `Emergency Case Opened: ${newCase.id}`,
      description: `Intake registered for ${fullName} (${parsedAge}yo) by ${user.fullName} (${user.agency}).`,
      timestamp: new Date().toISOString(),
      user: user.fullName,
      source: 'Incident Command Intake',
      statusBadge: 'Active',
      referenceId: newCase.id,
    });

    // Record Audit Log
    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'CASE_CREATED',
      resourceType: 'CASE',
      resourceId: newCase.id,
      details: `Created new case with priority ${newCase.priority} for ${fullName}.`,
      result: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    // Broadcast Notification to Verification and Case Officers
    db.addNotification({
      recipientRole: 'CASE_OFFICER',
      title: `New Case Activated: ${newCase.id}`,
      message: `${fullName} reported missing in ${lastKnownLocation}. Priority: ${newCase.priority}.`,
      type: 'ALERT',
      caseId: newCase.id,
    });

    res.status(201).json(newCase);
  }
);

// Update Case Information
casesRouter.patch(
  '/:id',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const existing = db.getCaseById(id);
    if (!existing) {
      res.status(404).json({ error: `Case ${id} not found.` });
      return;
    }

    const user = req.user!;
    const updates = req.body;

    // Disallow overwriting status directly via patch (must use /status endpoint for proper audit history)
    delete updates.status;
    delete updates.id;
    delete updates.statusHistory;

    const updated = db.updateCase(id, updates);

    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'CASE_UPDATED',
      resourceType: 'CASE',
      resourceId: id,
      details: `Updated case fields: ${Object.keys(updates).join(', ')}.`,
      result: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json(updated);
  }
);

// Change Case Status with Full Audit and History Tracking
casesRouter.post(
  '/:id/status',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { newStatus, reason } = req.body as { newStatus: CaseStatus; reason: string };

    if (!newStatus || !reason || !reason.trim()) {
      res.status(400).json({
        error: 'Both newStatus and an authorized reason are mandatory for changing case status.',
      });
      return;
    }

    const existing = db.getCaseById(id);
    if (!existing) {
      res.status(404).json({ error: `Case ${id} not found.` });
      return;
    }

    const user = req.user!;
    const fromStatus = existing.status;

    // Update history
    const historyEntry = {
      fromStatus,
      toStatus: newStatus,
      changedBy: user.fullName,
      changedById: user.id,
      timestamp: new Date().toISOString(),
      reason: reason.trim(),
    };

    const updated = db.updateCase(id, {
      status: newStatus,
      statusHistory: [...existing.statusHistory, historyEntry],
    });

    // Add Timeline Event
    db.addTimelineEvent({
      caseId: id,
      eventType: 'STATUS_CHANGE',
      title: `Case Status Changed to "${newStatus}"`,
      description: `Status transitioned from ${fromStatus} to ${newStatus}. Rationale: ${reason.trim()}`,
      timestamp: new Date().toISOString(),
      user: user.fullName,
      source: 'Command Authority',
      statusBadge: newStatus,
      referenceId: id,
    });

    // Audit Log
    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'CASE_STATUS_CHANGED',
      resourceType: 'CASE',
      resourceId: id,
      details: `Changed status from ${fromStatus} to ${newStatus}. Reason: ${reason}`,
      result: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    // Notification
    db.addNotification({
      recipientRole: 'ALL',
      title: `Case ${id} Status: ${newStatus}`,
      message: `${existing.person.fullName} status updated to ${newStatus}. ${reason}`,
      type: newStatus === 'Person Located' || newStatus === 'Resolved' ? 'ALERT' : 'INFO',
      caseId: id,
    });

    res.json(updated);
  }
);

// Soft Archival of Case
casesRouter.post(
  '/:id/archive',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      res.status(400).json({ error: 'A justification is required to archive an emergency case record.' });
      return;
    }

    const existing = db.getCaseById(id);
    if (!existing) {
      res.status(404).json({ error: `Case ${id} not found.` });
      return;
    }

    const user = req.user!;
    const updated = db.updateCase(id, {
      isArchived: true,
      status: 'Archived',
    });

    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'CASE_ARCHIVED',
      resourceType: 'CASE',
      resourceId: id,
      details: `Case archived by Super Admin. Justification: ${reason}`,
      result: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json(updated);
  }
);

// Get Case Timeline
casesRouter.get('/:id/timeline', (req, res) => {
  const { id } = req.params;
  const events = db.getTimelineEvents(id);
  res.json({ caseId: id, events });
});

// Photo & Evidence Management for Case
casesRouter.get('/:id/photos', (req, res) => {
  const { id } = req.params;
  const files = db.getFilesByCaseId(id);
  res.json({ caseId: id, files });
});

// Upload Photo / Evidence for Case
casesRouter.post(
  '/:id/photos',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER', 'HOSPITAL_SHELTER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { filename, originalName, mimeType, sizeBytes, url, reportId } = req.body;

    // Strict MIME & Size Validation
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!mimeType || !allowedMime.includes(mimeType)) {
      res.status(400).json({
        error: 'Invalid file format. Only JPEG, PNG, WEBP images and official PDF documents are accepted.',
      });
      return;
    }

    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (sizeBytes && sizeBytes > maxBytes) {
      res.status(400).json({ error: 'File size exceeds 10MB limit.' });
      return;
    }

    const user = req.user!;
    const fileId = `FILE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newFile: FileAttachment = {
      id: fileId,
      filename: filename || `evidence_${fileId}.jpg`,
      originalName: originalName || 'evidence_upload.jpg',
      mimeType,
      sizeBytes: sizeBytes || 1024 * 500,
      url: url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
      thumbnailUrl: url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      uploadedBy: user.fullName,
      uploadedAt: new Date().toISOString(),
      relatedCaseId: id,
      relatedReportId: reportId,
      verificationStatus: 'Unverified',
    };

    db.addFile(newFile);

    // Timeline event
    db.addTimelineEvent({
      caseId: id,
      eventType: 'PHOTO_UPLOADED',
      title: 'Evidence Media Added',
      description: `New file "${newFile.originalName}" uploaded by ${user.fullName}.`,
      timestamp: new Date().toISOString(),
      user: user.fullName,
      source: 'Evidence Locker',
      referenceId: fileId,
    });

    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'FILE_UPLOADED',
      resourceType: 'FILE',
      resourceId: fileId,
      details: `Uploaded evidence file ${newFile.originalName} for case ${id}.`,
      result: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(201).json(newFile);
  }
);

// GET Case At A Glance (30-60 second summary card data)
casesRouter.get('/:id/at-a-glance', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const targetCase = db.getCaseById(id);
  if (!targetCase) {
    res.status(404).json({ error: `Case ${id} not found.` });
    return;
  }

  const reports = db.getAllReports(id);
  const sightings = db.getAllSightings(id);
  const verifiedSightings = sightings.filter((s) => s.verificationStatus === 'Verified');
  const underReviewReports = reports.filter((r) => r.verificationStatus === 'Under Review');
  const leads = db.getAllLeads(id);
  const openLeads = leads.filter((l) => l.status !== 'CLOSED' && l.status !== 'NOT_USEFUL');
  const tasks = db.getAllTasks(id);
  const openTasks = tasks.filter((t) => t.status !== 'Completed');

  res.json({
    caseId: targetCase.id,
    title: targetCase.title,
    person: targetCase.person,
    priority: targetCase.priority,
    status: targetCase.status,
    assignedOfficerName: targetCase.assignedOfficerName,
    leadAgency: targetCase.leadAgency,
    createdAt: targetCase.createdAt,
    updatedAt: targetCase.updatedAt,
    counters: {
      reportsCount: reports.length,
      sightingsCount: sightings.length,
      verifiedSightingsCount: verifiedSightings.length,
      underReviewCount: underReviewReports.length,
      openLeadsCount: openLeads.length,
      openTasksCount: openTasks.length,
    },
  });
});

// GET & POST Case Completeness
casesRouter.get('/:id/completeness', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const completeness = db.getCaseCompleteness(id);
  res.json(completeness);
});

casesRouter.post(
  '/:id/completeness/:itemId',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id, itemId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Status is required.' });
      return;
    }

    const updated = db.updateMissingInfoStatus(id, itemId, status, notes);

    db.addAuditLog({
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'CASE_COMPLETENESS_UPDATED',
      resourceType: 'CASE',
      resourceId: id,
      details: `Updated missing information item "${itemId}" status to "${status}".`,
      result: 'SUCCESS',
    });

    res.json(updated);
  }
);

// GET Priority Rationale & Manual Override
casesRouter.get('/:id/priority-details', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const details = db.getCasePriorityDetails(id);
  res.json(details);
});

casesRouter.post(
  '/:id/priority-override',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { priority, reason } = req.body;

    if (!priority || !reason || !reason.trim()) {
      res.status(400).json({ error: 'Both new priority level and justification reason are required.' });
      return;
    }

    const user = req.user!;
    const updated = db.overrideCasePriority(id, priority, reason.trim(), user.fullName, user.id);
    res.json(updated);
  }
);

// GET & Resolve Conflicts
casesRouter.get('/:id/conflicts', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const conflicts = db.getCaseConflicts(id);
  res.json({ caseId: id, conflicts });
});

casesRouter.post(
  '/:id/conflicts/:conflictId/resolve',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id, conflictId } = req.params;
    const { resolutionNotes } = req.body;

    const resolved = db.resolveConflict(id, conflictId, resolutionNotes || 'Reviewed and dismissed by officer.');
    if (!resolved) {
      res.status(404).json({ error: `Conflict item ${conflictId} not found for case ${id}.` });
      return;
    }

    db.addAuditLog({
      userId: req.user!.id,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'CONFLICT_RESOLVED',
      resourceType: 'CASE',
      resourceId: id,
      details: `Resolved conflict ${conflictId}. Notes: ${resolutionNotes || 'Dismissed'}`,
      result: 'SUCCESS',
    });

    res.json(resolved);
  }
);

// AI Next Actions
casesRouter.get('/:id/next-actions', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const actions = db.getAiNextActions(id);
  res.json({ caseId: id, actions });
});

casesRouter.post(
  '/:id/next-actions/:actionId',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id, actionId } = req.params;
    const { status } = req.body as { status: 'ACCEPTED' | 'DISMISSED' };

    if (!status || (status !== 'ACCEPTED' && status !== 'DISMISSED')) {
      res.status(400).json({ error: 'Status must be ACCEPTED or DISMISSED.' });
      return;
    }

    const user = req.user!;
    const updated = db.updateAiNextActionStatus(id, actionId, status, user.fullName, user.id);
    if (!updated) {
      res.status(404).json({ error: `Action ${actionId} not found.` });
      return;
    }

    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: status === 'ACCEPTED' ? 'AI_ACTION_ACCEPTED' : 'AI_ACTION_DISMISSED',
      resourceType: 'CASE',
      resourceId: id,
      details: `${status} AI action recommendation "${updated.actionTitle}".`,
      result: 'SUCCESS',
    });

    res.json(updated);
  }
);

// Cross-Case Connections
casesRouter.get('/:id/related-cases', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const related = db.getPotentialRelatedCases(id);
  res.json({ caseId: id, relatedCases: related });
});

// Case Closure Checklist & Final Closure
casesRouter.get('/:id/closure-checklist', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const checklist = db.getCaseClosureChecklist(id);
  res.json(checklist);
});

casesRouter.post(
  '/:id/closure-checklist',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updates = req.body;
    const updated = db.updateCaseClosureChecklist(id, updates);
    res.json(updated);
  }
);

casesRouter.post(
  '/:id/close',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { closureReason } = req.body;

    if (!closureReason || !closureReason.trim()) {
      res.status(400).json({ error: 'A formal closure justification reason is required.' });
      return;
    }

    const user = req.user!;
    const closed = db.closeCase(id, closureReason.trim(), user.fullName, user.id);
    if (!closed) {
      res.status(404).json({ error: `Case ${id} not found.` });
      return;
    }

    res.json(closed);
  }
);

// Printable Case Report PDF Structure
casesRouter.get('/:id/report-pdf', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const targetCase = db.getCaseById(id);
  if (!targetCase) {
    res.status(404).json({ error: `Case ${id} not found.` });
    return;
  }

  const reports = db.getAllReports(id);
  const sightings = db.getAllSightings(id);
  const leads = db.getAllLeads(id);
  const tasks = db.getAllTasks(id);
  const timeline = db.getTimelineEvents(id);
  const files = db.getFilesByCaseId(id);
  const locations = db.getCaseLocations(id);
  const completeness = db.getCaseCompleteness(id);

  res.json({
    generatedAt: new Date().toISOString(),
    caseDetails: targetCase,
    personDetails: targetCase.person,
    completeness,
    summary: targetCase.summary || 'Official situation report.',
    reports,
    sightings,
    leads,
    tasks,
    timeline,
    evidenceFiles: files,
    locations,
    statusHistory: targetCase.statusHistory,
  });
});

// Evidence Audit Log Entries
casesRouter.get('/:id/evidence/:fileId/audit', (req: AuthenticatedRequest, res: Response) => {
  const { fileId } = req.params;
  const history = db.getEvidenceAuditHistory(fileId);
  res.json({ fileId, auditHistory: history });
});

casesRouter.post(
  '/:id/evidence/:fileId/audit',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const { fileId } = req.params;
    const { action = 'VIEWED', notes } = req.body;
    const user = req.user!;

    db.addEvidenceAudit(fileId, {
      action,
      performedBy: user.fullName,
      performedById: user.id,
      role: user.role,
      timestamp: new Date().toISOString(),
      notes: notes || 'Accessed evidence file in secure vault.',
    });

    res.json({ success: true });
  }
);

