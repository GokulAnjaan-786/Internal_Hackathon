import { Router, Response } from 'express';
import { db } from '../database/db.ts';
import {
  AuthenticatedRequest,
  requireAuth,
  requireRole,
} from '../middleware/auth.ts';
import { Sighting } from '../../types/index.ts';

export const sightingsRouter = Router();

// Get Sightings with filters (for Map and Sightings list)
sightingsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { caseId, verificationStatus } = req.query;

  let sightings = db.getAllSightings(caseId as string | undefined);

  if (verificationStatus && typeof verificationStatus === 'string' && verificationStatus !== 'All') {
    sightings = sightings.filter(
      (s) => s.verificationStatus.toLowerCase() === verificationStatus.toLowerCase()
    );
  }

  // Citizens only see Verified sightings on public map/list
  if (!req.user || req.user.role === 'CITIZEN') {
    sightings = sightings
      .filter((s) => s.verificationStatus === 'Verified')
      .map((s) => ({
        ...s,
        notes: undefined, // Internal notes hidden
        reporterContact: undefined,
      }));
  }

  res.json({ total: sightings.length, sightings });
});

// Get Single Sighting
sightingsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const sighting = db.getSightingById(id);

  if (!sighting) {
    res.status(404).json({ error: `Sighting ${id} not found.` });
    return;
  }

  if (!req.user || req.user.role === 'CITIZEN') {
    if (sighting.verificationStatus !== 'Verified') {
      res.status(403).json({ error: 'Unverified sighting records are restricted to authorized personnel.' });
      return;
    }
    res.json({
      ...sighting,
      notes: undefined,
      reporterContact: undefined,
    });
    return;
  }

  res.json(sighting);
});

// Create Sighting (Field Units or Officers)
sightingsRouter.post(
  '/',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER', 'HOSPITAL_SHELTER']),
  (req: AuthenticatedRequest, res: Response) => {
    const {
      caseId,
      date,
      time,
      location,
      latitude,
      longitude,
      description,
      photoUrl,
      source = 'Field Investigation',
      verificationStatus = 'Unverified',
      notes,
    } = req.body;

    if (!caseId || !location || !description) {
      res.status(400).json({ error: 'Case ID, location, and description are required.' });
      return;
    }

    const linkedCase = db.getCaseById(caseId);
    if (!linkedCase) {
      res.status(404).json({ error: `Case ${caseId} does not exist.` });
      return;
    }

    const user = req.user!;
    const sightingId = db.generateSightingId();

    const newSighting: Sighting = {
      id: sightingId,
      caseId,
      caseTitle: linkedCase.title,
      date: date || new Date().toISOString().split('T')[0],
      time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      location: location.trim(),
      latitude: Number(latitude) || 37.7749,
      longitude: Number(longitude) || -122.4194,
      description: description.trim(),
      reporterName: user.fullName,
      reporterContact: user.email,
      photoUrl,
      source,
      verificationStatus,
      reviewerId: verificationStatus === 'Verified' ? user.id : undefined,
      reviewerName: verificationStatus === 'Verified' ? user.fullName : undefined,
      notes,
      createdAt: new Date().toISOString(),
    };

    db.createSighting(newSighting);

    db.addTimelineEvent({
      caseId,
      eventType: 'SIGHTING_LOGGED',
      title: `Field Sighting Logged: ${sightingId}`,
      description: `${user.fullName} recorded sighting at ${newSighting.location}.`,
      timestamp: new Date().toISOString(),
      user: user.fullName,
      source: newSighting.source,
      statusBadge: verificationStatus,
      referenceId: sightingId,
    });

    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'SIGHTING_CREATED',
      resourceType: 'SIGHTING',
      resourceId: sightingId,
      details: `Created sighting for case ${caseId} at ${newSighting.location}. Status: ${verificationStatus}`,
      result: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(201).json(newSighting);
  }
);
