import { Router, Response } from 'express';
import { db } from '../database/db.ts';
import {
  AuthenticatedRequest,
  requireAuth,
  requireRole,
} from '../middleware/auth.ts';
import { Report, Sighting, ReporterType } from '../../types/index.ts';

export const reportsRouter = Router();

// List Reports (with optional caseId or verificationStatus filter)
reportsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { caseId, status, source } = req.query;

  let reports = db.getAllReports(caseId as string | undefined);

  if (status && typeof status === 'string' && status !== 'All') {
    reports = reports.filter(
      (r) => r.verificationStatus.toLowerCase() === status.toLowerCase()
    );
  }

  if (source && typeof source === 'string' && source !== 'All') {
    reports = reports.filter((r) => r.source.toLowerCase().includes(source.toLowerCase()));
  }

  // Data Minimization for Citizen role
  if (!req.user || req.user.role === 'CITIZEN') {
    reports = reports.map((r) => ({
      ...r,
      verificationNotes: undefined, // Internal review notes hidden
      reporterContact: undefined, // Reporter contact numbers hidden
    }));
  }

  res.json({ total: reports.length, reports });
});

// Public Citizen Status Tracker
reportsRouter.get('/:id/public-status', (req, res) => {
  const { id } = req.params;
  const report = db.getReportById(id);

  if (!report) {
    res.status(404).json({
      error: `Report tracking ID ${id} not found. Please verify the ID from your submission receipt.`,
    });
    return;
  }

  // Safe Public Status Object: NO internal officer names, NO sensitive case notes
  res.json({
    reportId: report.id,
    caseId: report.caseId,
    submissionDate: report.date,
    submissionTime: report.time,
    generalLocation: report.location,
    verificationStatus: report.verificationStatus,
    updatedAt: report.updatedAt,
    message:
      report.verificationStatus === 'Verified'
        ? 'Your sighting has been independently verified by the emergency investigation team and integrated into search coordination.'
        : report.verificationStatus === 'Under Review'
        ? 'Your report is currently being analyzed and cross-referenced with surveillance and field logs.'
        : report.verificationStatus === 'Needs More Information'
        ? 'Our verification team may follow up if contact details were provided.'
        : report.verificationStatus === 'Duplicate'
        ? 'Your report confirmed an existing verified lead in the same vicinity. Thank you.'
        : 'Report received and securely queued for emergency review.',
  });
});

// Get Single Report
reportsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const report = db.getReportById(id);

  if (!report) {
    res.status(404).json({ error: `Report ${id} not found.` });
    return;
  }

  if (!req.user || req.user.role === 'CITIZEN') {
    res.json({
      ...report,
      verificationNotes: undefined,
      reporterContact: undefined,
    });
    return;
  }

  res.json(report);
});

// Submit New Report / Sighting
reportsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const {
    caseId,
    reporterType = 'Citizen',
    reporterName,
    reporterContact,
    description,
    date,
    time,
    location,
    latitude,
    longitude,
    source,
    photoUrl,
  } = req.body;

  if (!caseId) {
    res.status(400).json({ error: 'Associated Case ID is required.' });
    return;
  }

  const linkedCase = db.getCaseById(caseId);
  if (!linkedCase) {
    res.status(404).json({ error: `Associated Case ${caseId} does not exist.` });
    return;
  }

  if (!description || !description.trim()) {
    res.status(400).json({ error: 'A descriptive account of the sighting is required.' });
    return;
  }

  if (!location || !location.trim()) {
    res.status(400).json({ error: 'Sighting location description is required.' });
    return;
  }

  // Validate or fallback coordinates
  const lat = typeof latitude === 'number' ? latitude : 37.7749 + (Math.random() - 0.5) * 0.05;
  const lng = typeof longitude === 'number' ? longitude : -122.4194 + (Math.random() - 0.5) * 0.05;

  const reportId = db.generateReportId();
  const currentDate = date || new Date().toISOString().split('T')[0];
  const currentTime =
    time ||
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newReport: Report = {
    id: reportId,
    caseId,
    caseTitle: linkedCase.title,
    reporterType: (reporterType as ReporterType) || 'Citizen',
    reporterName: reporterName || 'Anonymous Citizen',
    reporterContact: reporterContact || '',
    description: description.trim(),
    date: currentDate,
    time: currentTime,
    location: location.trim(),
    latitude: lat,
    longitude: lng,
    source: source || 'Emergency Web Intake',
    verificationStatus: 'New',
    uploadedFiles: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // If photo is provided, attach to files
  if (photoUrl) {
    const fileId = `FILE-${Date.now()}`;
    const fileAttachment = {
      id: fileId,
      filename: `sighting_${reportId}.jpg`,
      originalName: 'sighting_photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 850000,
      url: photoUrl,
      thumbnailUrl: photoUrl,
      uploadedBy: newReport.reporterName,
      uploadedAt: new Date().toISOString(),
      relatedCaseId: caseId,
      relatedReportId: reportId,
      verificationStatus: 'Unverified' as const,
    };
    db.addFile(fileAttachment);
    newReport.uploadedFiles.push(fileAttachment);
  }

  db.createReport(newReport);

  // Record Timeline Event
  db.addTimelineEvent({
    caseId,
    eventType: 'REPORT_SUBMITTED',
    title: `New Sighting Report: ${reportId}`,
    description: `${newReport.reporterType} submitted sighting at ${newReport.location}.`,
    timestamp: new Date().toISOString(),
    user: newReport.reporterName,
    source: newReport.source,
    statusBadge: 'New',
    referenceId: reportId,
  });

  // Record Audit Log
  db.addAuditLog({
    userId: req.user ? req.user.id : 'ANON_REPORTER',
    userName: req.user ? req.user.fullName : newReport.reporterName,
    userRole: req.user ? req.user.role : 'CITIZEN',
    action: 'REPORT_SUBMITTED',
    resourceType: 'REPORT',
    resourceId: reportId,
    details: `Sighting report logged for case ${caseId} at ${newReport.location}.`,
    result: 'SUCCESS',
    ipAddress: req.ip || '127.0.0.1',
  });

  // Notify Verification Officer Queue
  db.addNotification({
    recipientRole: 'VERIFICATION_OFFICER',
    title: `New Report Queued: ${reportId}`,
    message: `Report for Case ${caseId} (${linkedCase.person.fullName}) requires verification.`,
    type: 'VERIFICATION',
    caseId,
    reportId,
  });

  res.status(201).json(newReport);
});

// Verify Report
reportsRouter.post(
  '/:id/verify',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { verificationNotes } = req.body;

    const report = db.getReportById(id);
    if (!report) {
      res.status(404).json({ error: `Report ${id} not found.` });
      return;
    }

    const user = req.user!;
    const updated = db.updateReport(id, {
      verificationStatus: 'Verified',
      assignedReviewerId: user.id,
      assignedReviewerName: user.fullName,
      verificationNotes: verificationNotes || 'Verified against corroborating eyewitness and surveillance logs.',
    });

    // Automatically create a Verified Sighting linked to this report for map view
    const sightingId = db.generateSightingId();
    const newSighting: Sighting = {
      id: sightingId,
      caseId: report.caseId,
      caseTitle: report.caseTitle,
      reportId: report.id,
      date: report.date,
      time: report.time,
      location: report.location,
      latitude: report.latitude,
      longitude: report.longitude,
      description: report.description,
      reporterName: report.reporterName,
      reporterContact: report.reporterContact,
      photoUrl: report.uploadedFiles[0]?.url,
      source: report.source,
      verificationStatus: 'Verified',
      reviewerId: user.id,
      reviewerName: user.fullName,
      notes: verificationNotes || 'Officially verified sighting lead.',
      createdAt: new Date().toISOString(),
    };
    db.createSighting(newSighting);

    // Update case timeline
    db.addTimelineEvent({
      caseId: report.caseId,
      eventType: 'VERIFICATION_ACTION',
      title: `Report Verified: ${id}`,
      description: `${user.fullName} verified report at ${report.location}. Notes: ${verificationNotes || 'Corroborated'}`,
      timestamp: new Date().toISOString(),
      user: user.fullName,
      source: 'Verification Desk',
      statusBadge: 'Verified',
      referenceId: id,
    });

    // Audit Log
    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'REPORT_VERIFIED',
      resourceType: 'REPORT',
      resourceId: id,
      details: `Report ${id} marked Verified. Sighting ${sightingId} registered. Notes: ${verificationNotes || 'None'}`,
      result: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    // Notify Case Officer
    db.addNotification({
      recipientRole: 'CASE_OFFICER',
      title: `Verified Lead: Case ${report.caseId}`,
      message: `Report ${id} at ${report.location} has been verified by ${user.fullName}.`,
      type: 'ALERT',
      caseId: report.caseId,
      reportId: id,
    });

    res.json({ report: updated, sighting: newSighting });
  }
);

// Reject Report
reportsRouter.post(
  '/:id/reject',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      res.status(400).json({ error: 'A justification is required to reject an emergency sighting report.' });
      return;
    }

    const report = db.getReportById(id);
    if (!report) {
      res.status(404).json({ error: `Report ${id} not found.` });
      return;
    }

    const user = req.user!;
    const updated = db.updateReport(id, {
      verificationStatus: 'Rejected',
      assignedReviewerId: user.id,
      assignedReviewerName: user.fullName,
      verificationNotes: `REJECTED: ${reason.trim()}`,
    });

    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'REPORT_REJECTED',
      resourceType: 'REPORT',
      resourceId: id,
      details: `Report ${id} rejected by ${user.fullName}. Reason: ${reason}`,
      result: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json(updated);
  }
);

// Mark as Duplicate
reportsRouter.post(
  '/:id/duplicate',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { masterReportId, notes } = req.body;

    const report = db.getReportById(id);
    if (!report) {
      res.status(404).json({ error: `Report ${id} not found.` });
      return;
    }

    const user = req.user!;
    const updated = db.updateReport(id, {
      verificationStatus: 'Duplicate',
      duplicateOfReportId: masterReportId || undefined,
      assignedReviewerId: user.id,
      assignedReviewerName: user.fullName,
      verificationNotes: `Marked duplicate of ${masterReportId || 'existing record'}. ${notes || ''}`,
    });

    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'REPORT_MARKED_DUPLICATE',
      resourceType: 'REPORT',
      resourceId: id,
      details: `Report ${id} marked duplicate of ${masterReportId}.`,
      result: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json(updated);
  }
);

// Request Additional Information
reportsRouter.post(
  '/:id/request-info',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { detailsNeeded } = req.body;

    const report = db.getReportById(id);
    if (!report) {
      res.status(404).json({ error: `Report ${id} not found.` });
      return;
    }

    const user = req.user!;
    const updated = db.updateReport(id, {
      verificationStatus: 'Needs More Information',
      assignedReviewerId: user.id,
      assignedReviewerName: user.fullName,
      verificationNotes: `Information Requested: ${detailsNeeded || 'Additional corroborating details or clearer photo required.'}`,
    });

    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'REPORT_INFO_REQUESTED',
      resourceType: 'REPORT',
      resourceId: id,
      details: `Additional information requested for Report ${id}.`,
      result: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json(updated);
  }
);
