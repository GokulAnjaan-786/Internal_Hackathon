import { Router, Response } from 'express';
import { db } from '../database/db.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.ts';
import { Lead, LeadStatus, LeadPriority } from '../../types/index.ts';

export const leadsRouter = Router();

// List Leads (filter by caseId, status, priority, assignedOfficerId)
leadsRouter.get(
  '/',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER', 'HOSPITAL_SHELTER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { caseId, status, priority, assignedOfficerId } = req.query;

    let leads = db.getAllLeads(caseId as string | undefined);

    if (status && typeof status === 'string' && status !== 'All') {
      leads = leads.filter((l) => l.status.toUpperCase() === status.toUpperCase());
    }

    if (priority && typeof priority === 'string' && priority !== 'All') {
      leads = leads.filter((l) => l.priority.toLowerCase() === priority.toLowerCase());
    }

    if (assignedOfficerId && typeof assignedOfficerId === 'string') {
      leads = leads.filter((l) => l.assignedOfficerId === assignedOfficerId);
    }

    res.json({ total: leads.length, leads });
  }
);

// Get Single Lead
leadsRouter.get(
  '/:id',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const lead = db.getLeadById(id);
    if (!lead) {
      res.status(404).json({ error: `Lead ${id} not found.` });
      return;
    }
    res.json(lead);
  }
);

// Create Lead
leadsRouter.post(
  '/',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const {
      caseId,
      title,
      description,
      source = 'Investigation Desk',
      priority = 'High',
      assignedOfficerId,
      assignedOfficerName,
      dueDate,
      notes,
    } = req.body;

    if (!caseId || !title || !description) {
      res.status(400).json({ error: 'caseId, title, and description are mandatory for registering a lead.' });
      return;
    }

    const targetCase = db.getCaseById(caseId);
    if (!targetCase) {
      res.status(404).json({ error: `Case ${caseId} does not exist.` });
      return;
    }

    const user = req.user!;
    const leadId = db.generateLeadId();

    const newLead: Lead = {
      id: leadId,
      caseId,
      caseTitle: targetCase.title,
      title: title.trim(),
      description: description.trim(),
      source: source.trim(),
      priority: (priority as LeadPriority) || 'High',
      assignedOfficerId: assignedOfficerId || user.id,
      assignedOfficerName: assignedOfficerName || user.fullName,
      createdAt: new Date().toISOString(),
      dueDate: dueDate || new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      status: 'NEW',
      notes: notes || '',
      updatedAt: new Date().toISOString(),
    };

    db.createLead(newLead);

    // Audit Log & Timeline
    db.addTimelineEvent({
      caseId,
      eventType: 'INTERNAL_NOTE',
      title: `Investigation Lead Opened: ${leadId}`,
      description: `Lead "${newLead.title}" registered by ${user.fullName}. Priority: ${newLead.priority}.`,
      timestamp: new Date().toISOString(),
      user: user.fullName,
      source: newLead.source,
      statusBadge: newLead.priority,
      referenceId: leadId,
    });

    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'LEAD_CREATED',
      resourceType: 'CASE',
      resourceId: caseId,
      details: `Created lead ${leadId}: "${newLead.title}". Assigned to: ${newLead.assignedOfficerName}`,
      result: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    res.status(201).json(newLead);
  }
);

// Update Lead Status & Details
leadsRouter.patch(
  '/:id',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const existing = db.getLeadById(id);
    if (!existing) {
      res.status(404).json({ error: `Lead ${id} not found.` });
      return;
    }

    const user = req.user!;
    const { status, notes, result, priority, assignedOfficerId, assignedOfficerName } = req.body;

    const updates: Partial<Lead> = {};
    if (status) updates.status = status as LeadStatus;
    if (notes !== undefined) updates.notes = notes;
    if (result !== undefined) updates.result = result;
    if (priority) updates.priority = priority as LeadPriority;
    if (assignedOfficerId) updates.assignedOfficerId = assignedOfficerId;
    if (assignedOfficerName) updates.assignedOfficerName = assignedOfficerName;

    const updated = db.updateLead(id, updates);

    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'LEAD_UPDATED',
      resourceType: 'CASE',
      resourceId: existing.caseId,
      details: `Updated lead ${id} to status ${updated?.status}.`,
      result: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json(updated);
  }
);
