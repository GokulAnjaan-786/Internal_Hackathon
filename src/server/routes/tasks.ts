import { Router, Response } from 'express';
import { db } from '../database/db.ts';
import {
  AuthenticatedRequest,
  requireAuth,
  requireRole,
} from '../middleware/auth.ts';
import { InvestigationTask, TaskStatus, PriorityLevel } from '../../types/index.ts';

export const tasksRouter = Router();

// List Tasks
tasksRouter.get(
  '/',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER', 'HOSPITAL_SHELTER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { caseId, status, priority, assignedOfficerId } = req.query;

    let tasks = db.getAllTasks(caseId as string | undefined);

    if (status && typeof status === 'string' && status !== 'All') {
      tasks = tasks.filter((t) => t.status.toLowerCase() === status.toLowerCase());
    }

    if (priority && typeof priority === 'string' && priority !== 'All') {
      tasks = tasks.filter((t) => t.priority.toLowerCase() === priority.toLowerCase());
    }

    if (assignedOfficerId && typeof assignedOfficerId === 'string') {
      tasks = tasks.filter((t) => t.assignedOfficerId === assignedOfficerId);
    }

    res.json({ total: tasks.length, tasks });
  }
);

// Create Task
tasksRouter.post(
  '/',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const {
      caseId,
      title,
      description,
      assignedOfficerId,
      assignedOfficerName,
      priority = 'High',
      dueDate,
    } = req.body;

    if (!caseId || !title || !description) {
      res.status(400).json({ error: 'Case ID, task title, and task description are required.' });
      return;
    }

    const linkedCase = db.getCaseById(caseId);
    if (!linkedCase) {
      res.status(404).json({ error: `Case ${caseId} does not exist.` });
      return;
    }

    const user = req.user!;
    const taskId = db.generateTaskId();

    const newTask: InvestigationTask = {
      id: taskId,
      caseId,
      caseTitle: linkedCase.title,
      title: title.trim(),
      description: description.trim(),
      assignedOfficerId: assignedOfficerId || user.id,
      assignedOfficerName: assignedOfficerName || user.fullName,
      priority: (priority as PriorityLevel) || 'High',
      dueDate: dueDate || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      status: 'Pending',
      createdBy: user.fullName,
      createdAt: new Date().toISOString(),
    };

    db.createTask(newTask);

    // Add Timeline Entry
    db.addTimelineEvent({
      caseId,
      eventType: 'TASK_ASSIGNED',
      title: `Task Assigned: ${newTask.title}`,
      description: `Assigned to ${newTask.assignedOfficerName} by ${user.fullName}. Priority: ${newTask.priority}.`,
      timestamp: new Date().toISOString(),
      user: user.fullName,
      source: 'Task Dispatch',
      statusBadge: newTask.priority,
      referenceId: taskId,
    });

    // Audit Log
    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: 'TASK_CREATED',
      resourceType: 'TASK',
      resourceId: taskId,
      details: `Created investigation task "${newTask.title}" for case ${caseId}. Assigned to: ${newTask.assignedOfficerName}.`,
      result: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    // Notification to assigned officer
    db.addNotification({
      recipientUserId: newTask.assignedOfficerId,
      title: `New Task Assigned: ${newTask.title}`,
      message: `Priority: ${newTask.priority} for Case ${caseId}. Due: ${new Date(newTask.dueDate).toLocaleDateString()}.`,
      type: 'TASK',
      caseId,
    });

    res.status(201).json(newTask);
  }
);

// Update Task Status & Notes
tasksRouter.patch(
  '/:id',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'CASE_OFFICER', 'VERIFICATION_OFFICER']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status, notes } = req.body as { status?: TaskStatus; notes?: string };

    const task = db.getTaskById(id);
    if (!task) {
      res.status(404).json({ error: `Task ${id} not found.` });
      return;
    }

    const user = req.user!;
    const isCompleted = status === 'Completed';

    const updated = db.updateTask(id, {
      status: status || task.status,
      notes: notes !== undefined ? notes : task.notes,
      completedAt: isCompleted ? new Date().toISOString() : task.completedAt,
    });

    if (isCompleted) {
      db.addTimelineEvent({
        caseId: task.caseId,
        eventType: 'TASK_COMPLETED',
        title: `Task Completed: ${task.title}`,
        description: `Marked completed by ${user.fullName}. ${notes ? `Findings: ${notes}` : ''}`,
        timestamp: new Date().toISOString(),
        user: user.fullName,
        source: 'Investigation Desk',
        statusBadge: 'Completed',
        referenceId: id,
      });
    }

    db.addAuditLog({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action: isCompleted ? 'TASK_COMPLETED' : 'TASK_UPDATED',
      resourceType: 'TASK',
      resourceId: id,
      details: `Task ${id} updated to status "${status || task.status}".`,
      result: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json(updated);
  }
);
