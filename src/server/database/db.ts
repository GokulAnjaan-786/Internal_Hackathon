import {
  Case,
  Report,
  Sighting,
  InvestigationTask,
  TimelineEvent,
  AuditLog,
  NotificationItem,
  User,
  FileAttachment,
  CaseLocationItem,
  UserCurrentLocation,
  Lead,
  LeadStatus,
  LeadPriority,
  MissingInfoStatus,
  MissingInfoItem,
  CaseCompleteness,
  PriorityReason,
  CasePriorityDetails,
  ChangeItem,
  WhatChangedSummary,
  ConflictItem,
  AiNextActionSuggestion,
  PotentialRelatedCase,
  EvidenceAuditEntry,
  CaseClosureChecklist,
  PriorityLevel,
} from '../../types/index.ts';

// In-Memory Relational Data Store
class Database {
  private users: Map<string, User> = new Map();
  private userPasswords: Map<string, string> = new Map(); // demo hashed / clear for mock
  private cases: Map<string, Case> = new Map();
  private reports: Map<string, Report> = new Map();
  private sightings: Map<string, Sighting> = new Map();
  private files: Map<string, FileAttachment> = new Map();
  private tasks: Map<string, InvestigationTask> = new Map();
  private leads: Map<string, Lead> = new Map();
  private priorityOverrides: Map<string, { priority: PriorityLevel; reason: string; overrideBy: string; overrideAt: string }> = new Map();
  private missingInfoMap: Map<string, Map<string, MissingInfoStatus>> = new Map();
  private userLogins: Map<string, { current: string; previous: string }> = new Map();
  private conflicts: Map<string, ConflictItem[]> = new Map();
  private aiNextActions: Map<string, AiNextActionSuggestion[]> = new Map();
  private potentialRelatedCases: Map<string, PotentialRelatedCase[]> = new Map();
  private evidenceAuditLogs: Map<string, EvidenceAuditEntry[]> = new Map();
  private caseClosureChecklists: Map<string, CaseClosureChecklist> = new Map();
  private staleCaseThresholdHours: number = 48;
  private userCurrentLocations: Map<string, UserCurrentLocation> = new Map();
  private timeline: TimelineEvent[] = [];
  private auditLogs: AuditLog[] = [];
  private notifications: NotificationItem[] = [];

  constructor() {
    this.seedAll();
  }

  // Users & Auth
  public getUsers(): User[] {
    return Array.from(this.users.values());
  }

  public getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  public getUserByUsername(username: string): User | undefined {
    return Array.from(this.users.values()).find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
  }

  public verifyPassword(username: string, passwordAttempt: string): User | null {
    const user = this.getUserByUsername(username);
    if (!user) return null;
    const stored = this.userPasswords.get(user.id);
    if (stored === passwordAttempt) {
      return user;
    }
    return null;
  }

  // Cases
  public getAllCases(includeArchived = false): Case[] {
    return Array.from(this.cases.values())
      .filter((c) => includeArchived || !c.isArchived)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getCaseById(id: string): Case | undefined {
    return this.cases.get(id);
  }

  public createCase(newCase: Case): Case {
    this.cases.set(newCase.id, newCase);
    return newCase;
  }

  public updateCase(id: string, updates: Partial<Case>): Case | undefined {
    const existing = this.cases.get(id);
    if (!existing) return undefined;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.cases.set(id, updated);
    return updated;
  }

  public generateCaseId(): string {
    const count = this.cases.size + 1;
    const padded = String(count).padStart(6, '0');
    return `MP-2026-${padded}`;
  }

  // Reports
  public getAllReports(caseId?: string): Report[] {
    let list = Array.from(this.reports.values());
    if (caseId) {
      list = list.filter((r) => r.caseId === caseId);
    }
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getReportById(id: string): Report | undefined {
    return this.reports.get(id);
  }

  public createReport(report: Report): Report {
    this.reports.set(report.id, report);
    return report;
  }

  public updateReport(id: string, updates: Partial<Report>): Report | undefined {
    const existing = this.reports.get(id);
    if (!existing) return undefined;
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.reports.set(id, updated);
    return updated;
  }

  public generateReportId(): string {
    const count = this.reports.size + 1;
    const padded = String(count).padStart(6, '0');
    return `REP-2026-${padded}`;
  }

  // Sightings
  public getAllSightings(caseId?: string): Sighting[] {
    let list = Array.from(this.sightings.values());
    if (caseId) {
      list = list.filter((s) => s.caseId === caseId);
    }
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getSightingById(id: string): Sighting | undefined {
    return this.sightings.get(id);
  }

  public createSighting(sighting: Sighting): Sighting {
    this.sightings.set(sighting.id, sighting);
    return sighting;
  }

  public updateSighting(id: string, updates: Partial<Sighting>): Sighting | undefined {
    const existing = this.sightings.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.sightings.set(id, updated);
    return updated;
  }

  public generateSightingId(): string {
    const count = this.sightings.size + 1;
    const padded = String(count).padStart(6, '0');
    return `SGT-2026-${padded}`;
  }

  // Files
  public addFile(file: FileAttachment): FileAttachment {
    this.files.set(file.id, file);
    return file;
  }

  public getFilesByCaseId(caseId: string): FileAttachment[] {
    return Array.from(this.files.values()).filter((f) => f.relatedCaseId === caseId);
  }

  public getFileById(fileId: string): FileAttachment | undefined {
    return this.files.get(fileId);
  }

  // Tasks
  public getAllTasks(caseId?: string): InvestigationTask[] {
    let list = Array.from(this.tasks.values());
    if (caseId) {
      list = list.filter((t) => t.caseId === caseId);
    }
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getTaskById(id: string): InvestigationTask | undefined {
    return this.tasks.get(id);
  }

  public createTask(task: InvestigationTask): InvestigationTask {
    this.tasks.set(task.id, task);
    return task;
  }

  public updateTask(id: string, updates: Partial<InvestigationTask>): InvestigationTask | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.tasks.set(id, updated);
    return updated;
  }

  public generateTaskId(): string {
    const count = this.tasks.size + 1;
    const padded = String(count).padStart(6, '0');
    return `TSK-2026-${padded}`;
  }

  // ----------------------------------------------------
  // LEADS MANAGEMENT
  // ----------------------------------------------------
  public getAllLeads(caseId?: string): Lead[] {
    let list = Array.from(this.leads.values());
    if (caseId) {
      list = list.filter((l) => l.caseId === caseId);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getLeadById(id: string): Lead | undefined {
    return this.leads.get(id);
  }

  public createLead(lead: Lead): Lead {
    this.leads.set(lead.id, lead);
    return lead;
  }

  public updateLead(id: string, updates: Partial<Lead>): Lead | undefined {
    const existing = this.leads.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.leads.set(id, updated);
    return updated;
  }

  public generateLeadId(): string {
    const count = this.leads.size + 1;
    const padded = String(count).padStart(6, '0');
    return `LED-2026-${padded}`;
  }

  // ----------------------------------------------------
  // CASE COMPLETENESS & MISSING INFO
  // ----------------------------------------------------
  public getCaseCompleteness(caseId: string): CaseCompleteness {
    const c = this.cases.get(caseId);
    if (!c) {
      return {
        personDetailsPercent: 0,
        reportInfoPercent: 0,
        locationDataPercent: 0,
        verificationPercent: 0,
        tasksPercent: 0,
        overallPercent: 0,
        missingItems: [],
      };
    }

    const p = c.person;
    let personScore = 0;
    if (p.fullName) personScore += 20;
    if (p.photoUrl && !p.photoUrl.includes('unsplash.com/photo-1544005313-94ddf0286df2')) personScore += 20;
    if (p.physicalDescription) personScore += 20;
    if (p.identifyingMarks && p.identifyingMarks !== 'None noted') personScore += 20;
    if (p.clothingDescription && p.clothingDescription !== 'Unknown') personScore += 20;

    const reports = this.getAllReports(caseId);
    const reportScore = Math.min(100, reports.length * 25);

    const locations = this.getCaseLocations(caseId);
    const locationScore = Math.min(100, locations.length * 30);

    const verifiedReports = reports.filter((r) => r.verificationStatus === 'Verified');
    const verificationScore = reports.length > 0 ? Math.round((verifiedReports.length / reports.length) * 100) : 50;

    const tasks = this.getAllTasks(caseId);
    const completedTasks = tasks.filter((t) => t.status === 'Completed');
    const tasksScore = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 50;

    const overall = Math.round(
      personScore * 0.25 +
        reportScore * 0.2 +
        locationScore * 0.2 +
        verificationScore * 0.2 +
        tasksScore * 0.15
    );

    const caseMap = this.missingInfoMap.get(caseId) || new Map();
    const defaultMissing: MissingInfoItem[] = [
      {
        id: 'photo',
        category: 'Identity',
        label: 'Recent High-Resolution Photograph',
        status:
          p.photoUrl && !p.photoUrl.includes('unsplash.com/photo-1544005313-94ddf0286df2')
            ? 'Collected'
            : 'Required',
      },
      {
        id: 'marks',
        category: 'Physical',
        label: 'Distinctive Identifying Mark / Scar / Tattoo',
        status: p.identifyingMarks && p.identifyingMarks !== 'None noted' ? 'Collected' : 'Required',
      },
      {
        id: 'clothing',
        category: 'Appearance',
        label: 'Exact Clothing & Footwear Description',
        status: p.clothingDescription && p.clothingDescription !== 'Unknown' ? 'Collected' : 'Required',
      },
      {
        id: 'last_contact',
        category: 'Timeline',
        label: 'Exact Last Phone Contact / Digital Timestamp',
        status: p.timeMissing !== 'Unknown' ? 'Collected' : 'Required',
      },
      {
        id: 'witness_contact',
        category: 'Witnesses',
        label: 'Primary Witness Direct Phone Contact',
        status: p.reportingPersonContact ? 'Collected' : 'Required',
      },
      {
        id: 'medical_records',
        category: 'Medical',
        label: 'Medical & Prescription History',
        status: p.medicalConditions ? 'Collected' : 'Optional',
      },
    ];

    const missingItems = defaultMissing.map((item) => {
      const storedStatus = caseMap.get(item.id);
      return {
        ...item,
        status: storedStatus || item.status,
      };
    });

    return {
      personDetailsPercent: personScore,
      reportInfoPercent: reportScore,
      locationDataPercent: locationScore,
      verificationPercent: verificationScore,
      tasksPercent: tasksScore,
      overallPercent: overall,
      missingItems,
    };
  }

  public updateMissingInfoStatus(
    caseId: string,
    itemId: string,
    status: MissingInfoStatus,
    notes?: string
  ): CaseCompleteness {
    if (!this.missingInfoMap.has(caseId)) {
      this.missingInfoMap.set(caseId, new Map());
    }
    this.missingInfoMap.get(caseId)!.set(itemId, status);
    return this.getCaseCompleteness(caseId);
  }

  // ----------------------------------------------------
  // CASE PRIORITY SYSTEM & OVERRIDE
  // ----------------------------------------------------
  public getCasePriorityDetails(caseId: string): CasePriorityDetails {
    const c = this.cases.get(caseId);
    if (!c) {
      return {
        calculatedPriority: 'Medium',
        currentPriority: 'Medium',
        isManualOverride: false,
        reasons: [],
      };
    }

    const reasons: PriorityReason[] = [];
    let score = 0;

    // Vulnerability check
    if (c.person.age < 12 || c.person.age > 65) {
      reasons.push({
        code: 'VULNERABLE_AGE',
        label: `Subject age (${c.person.age}yo) falls within vulnerable protocol (Child / Elderly).`,
        impact: 'High',
      });
      score += 40;
    }

    // Medical conditions
    if (c.person.medicalConditions && c.person.medicalConditions.trim()) {
      reasons.push({
        code: 'MEDICAL_CONCERN',
        label: `Active medical concern noted: "${c.person.medicalConditions}".`,
        impact: 'High',
      });
      score += 35;
    }

    // Time elapsed since disappearance
    const missingDate = new Date(
      `${c.person.dateMissing}T${c.person.timeMissing === 'Unknown' ? '00:00' : c.person.timeMissing}:00Z`
    ).getTime();
    const hoursElapsed = Math.max(0, Math.floor((Date.now() - missingDate) / (1000 * 3600)));

    if (hoursElapsed > 48) {
      reasons.push({
        code: 'TIME_ELAPSED_CRITICAL',
        label: `No verified subject contact for over ${hoursElapsed} hours (Critical threshold).`,
        impact: 'High',
      });
      score += 30;
    } else if (hoursElapsed > 24) {
      reasons.push({
        code: 'TIME_ELAPSED_MODERATE',
        label: `No verified subject contact for ${hoursElapsed} hours.`,
        impact: 'Medium',
      });
      score += 20;
    }

    // Reports / Sightings severity
    const reports = this.getAllReports(caseId);
    if (reports.some((r) => r.verificationStatus === 'Verified')) {
      reasons.push({
        code: 'VERIFIED_SIGHTING_ACTIVE',
        label: 'Active verified sighting logged requiring immediate field dispatch.',
        impact: 'Medium',
      });
      score += 15;
    }

    let calculated: PriorityLevel = 'Low';
    if (score >= 60) calculated = 'Urgent';
    else if (score >= 35) calculated = 'High';
    else if (score >= 15) calculated = 'Medium';

    const override = this.priorityOverrides.get(caseId);

    return {
      calculatedPriority: calculated,
      currentPriority: override ? override.priority : c.priority,
      isManualOverride: !!override,
      overrideReason: override?.reason,
      overrideBy: override?.overrideBy,
      overrideAt: override?.overrideAt,
      reasons,
    };
  }

  public overrideCasePriority(
    caseId: string,
    priority: PriorityLevel,
    reason: string,
    officerName: string,
    officerId: string
  ): CasePriorityDetails {
    const c = this.cases.get(caseId);
    if (!c) throw new Error('Case not found');

    this.priorityOverrides.set(caseId, {
      priority,
      reason,
      overrideBy: officerName,
      overrideAt: new Date().toISOString(),
    });

    this.updateCase(caseId, { priority });

    this.addTimelineEvent({
      caseId,
      eventType: 'STATUS_CHANGE',
      title: `Case Priority Adjusted to ${priority}`,
      description: `Manual priority override by ${officerName}. Rationale: ${reason}`,
      timestamp: new Date().toISOString(),
      user: officerName,
      source: 'Command Desk',
      statusBadge: priority,
      referenceId: caseId,
    });

    this.addAuditLog({
      userId: officerId,
      userName: officerName,
      userRole: 'CASE_OFFICER',
      action: 'CASE_PRIORITY_OVERRIDDEN',
      resourceType: 'CASE',
      resourceId: caseId,
      details: `Changed priority to ${priority}. Justification: ${reason}`,
      result: 'SUCCESS',
    });

    return this.getCasePriorityDetails(caseId);
  }

  // ----------------------------------------------------
  // WHAT CHANGED SINCE LAST LOGIN
  // ----------------------------------------------------
  public recordUserLogin(userId: string): { current: string; previous: string } {
    const existing = this.userLogins.get(userId);
    const now = new Date().toISOString();
    const previous = existing
      ? existing.current
      : new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const updated = { current: now, previous };
    this.userLogins.set(userId, updated);
    return updated;
  }

  public getWhatChangedForUser(userId: string): WhatChangedSummary {
    const login = this.userLogins.get(userId);
    const since = login ? login.previous : new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const sinceTime = new Date(since).getTime();

    const items: ChangeItem[] = [];

    // Reports
    const allReports = Array.from(this.reports.values());
    const newReports = allReports.filter((r) => new Date(r.createdAt).getTime() > sinceTime);
    newReports.forEach((r) => {
      items.push({
        id: `CHG-REP-${r.id}`,
        type: 'REPORT',
        title: `New Sighting Report: ${r.id}`,
        description: `Submitted for case ${r.caseId} at ${r.location}`,
        timestamp: r.createdAt,
        caseId: r.caseId,
        recordId: r.id,
      });
    });

    // Verified Sightings
    const allSightings = Array.from(this.sightings.values());
    const newSightings = allSightings.filter((s) => new Date(s.createdAt).getTime() > sinceTime);
    const verifiedSightings = newSightings.filter((s) => s.verificationStatus === 'Verified');
    verifiedSightings.forEach((s) => {
      items.push({
        id: `CHG-SGT-${s.id}`,
        type: 'VERIFICATION',
        title: `Verified Sighting Registered: ${s.id}`,
        description: `Verified by ${s.reviewerName || 'Desk Officer'} at ${s.location}`,
        timestamp: s.createdAt,
        caseId: s.caseId,
        recordId: s.id,
      });
    });

    // Rejected reports
    const rejectedReports = newReports.filter((r) => r.verificationStatus === 'Rejected');

    // Completed Tasks
    const allTasks = Array.from(this.tasks.values());
    const completedTasks = allTasks.filter(
      (t) => t.completedAt && new Date(t.completedAt).getTime() > sinceTime
    );
    completedTasks.forEach((t) => {
      items.push({
        id: `CHG-TSK-${t.id}`,
        type: 'TASK',
        title: `Task Completed: ${t.title}`,
        description: `Completed for case ${t.caseId} by ${t.assignedOfficerName}`,
        timestamp: t.completedAt!,
        caseId: t.caseId,
        recordId: t.id,
      });
    });

    // New Leads
    const allLeads = Array.from(this.leads.values());
    const newLeads = allLeads.filter((l) => new Date(l.createdAt).getTime() > sinceTime);
    newLeads.forEach((l) => {
      items.push({
        id: `CHG-LED-${l.id}`,
        type: 'LEAD',
        title: `New Lead Created: ${l.title}`,
        description: `Priority: ${l.priority} for case ${l.caseId}`,
        timestamp: l.createdAt,
        caseId: l.caseId,
        recordId: l.id,
      });
    });

    // New Photos
    const allFiles = Array.from(this.files.values());
    const newFiles = allFiles.filter((f) => new Date(f.uploadedAt).getTime() > sinceTime);
    newFiles.forEach((f) => {
      items.push({
        id: `CHG-FLE-${f.id}`,
        type: 'PHOTO',
        title: `New Evidence Uploaded: ${f.filename}`,
        description: `Uploaded by ${f.uploadedBy} for case ${f.relatedCaseId}`,
        timestamp: f.uploadedAt,
        caseId: f.relatedCaseId,
        recordId: f.id,
      });
    });

    return {
      sinceTimestamp: since,
      newReportsCount: newReports.length,
      newSightingsCount: newSightings.length,
      verifiedSightingsCount: verifiedSightings.length,
      rejectedReportsCount: rejectedReports.length,
      completedTasksCount: completedTasks.length,
      newPhotographsCount: newFiles.length,
      statusChangesCount: 0,
      newLeadsCount: newLeads.length,
      items: items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    };
  }

  // ----------------------------------------------------
  // CONFLICTS, AI NEXT ACTIONS & RELATED CASES
  // ----------------------------------------------------
  public getCaseConflicts(caseId: string): ConflictItem[] {
    return this.conflicts.get(caseId) || [];
  }

  public resolveConflict(
    caseId: string,
    conflictId: string,
    resolutionNotes: string
  ): ConflictItem | undefined {
    const list = this.conflicts.get(caseId) || [];
    const item = list.find((c) => c.id === conflictId);
    if (!item) return undefined;
    item.status = 'DISMISSED';
    item.resolutionNotes = resolutionNotes;
    return item;
  }

  public getAiNextActions(caseId: string): AiNextActionSuggestion[] {
    return this.aiNextActions.get(caseId) || [];
  }

  public updateAiNextActionStatus(
    caseId: string,
    actionId: string,
    status: 'ACCEPTED' | 'DISMISSED',
    officerName = 'Command Officer',
    officerId = 'USR-001'
  ): AiNextActionSuggestion | undefined {
    const list = this.aiNextActions.get(caseId) || [];
    const action = list.find((a) => a.id === actionId);
    if (!action) return undefined;
    action.status = status;

    if (status === 'ACCEPTED') {
      const taskId = this.generateTaskId();
      const c = this.getCaseById(caseId);
      const newTask: InvestigationTask = {
        id: taskId,
        caseId,
        caseTitle: c?.title || 'Case Investigation Task',
        title: action.actionTitle,
        description: `${action.description} (Origin: AI Investigation Assistant - ${action.whySuggested})`,
        assignedOfficerId: officerId,
        assignedOfficerName: officerName,
        priority: action.priority,
        dueDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        status: 'Pending',
        createdBy: 'AI Investigation Assistant',
        createdAt: new Date().toISOString(),
      };
      this.createTask(newTask);
      action.relatedTaskId = taskId;
    }

    return action;
  }

  public getPotentialRelatedCases(caseId: string): PotentialRelatedCase[] {
    return this.potentialRelatedCases.get(caseId) || [];
  }

  // ----------------------------------------------------
  // EVIDENCE AUDIT & CASE CLOSURE
  // ----------------------------------------------------
  public addEvidenceAudit(fileId: string, entry: EvidenceAuditEntry): void {
    if (!this.evidenceAuditLogs.has(fileId)) {
      this.evidenceAuditLogs.set(fileId, []);
    }
    this.evidenceAuditLogs.get(fileId)!.push(entry);
  }

  public getEvidenceAuditHistory(fileId: string): EvidenceAuditEntry[] {
    return this.evidenceAuditLogs.get(fileId) || [];
  }

  public getCaseClosureChecklist(caseId: string): CaseClosureChecklist {
    const existing = this.caseClosureChecklists.get(caseId);
    if (existing) return existing;

    const defaultChecklist: CaseClosureChecklist = {
      identityConfirmed: false,
      leadsReviewed: false,
      tasksReviewed: false,
      evidenceUpdated: false,
      notesCompleted: false,
      followupsCompleted: false,
      closureReason: '',
      finalReportGenerated: false,
    };
    this.caseClosureChecklists.set(caseId, defaultChecklist);
    return defaultChecklist;
  }

  public updateCaseClosureChecklist(
    caseId: string,
    updates: Partial<CaseClosureChecklist>
  ): CaseClosureChecklist {
    const existing = this.getCaseClosureChecklist(caseId);
    const updated = { ...existing, ...updates };
    this.caseClosureChecklists.set(caseId, updated);
    return updated;
  }

  public closeCase(
    caseId: string,
    closureReason: string,
    officerName: string,
    officerId: string
  ): Case | undefined {
    const c = this.cases.get(caseId);
    if (!c) return undefined;

    const updated = this.updateCase(caseId, {
      status: 'Closed',
      statusHistory: [
        ...c.statusHistory,
        {
          fromStatus: c.status,
          toStatus: 'Closed',
          changedBy: officerName,
          changedById: officerId,
          timestamp: new Date().toISOString(),
          reason: closureReason,
        },
      ],
    });

    this.updateCaseClosureChecklist(caseId, {
      closedBy: officerName,
      closedAt: new Date().toISOString(),
      closureReason,
    });

    this.addTimelineEvent({
      caseId,
      eventType: 'STATUS_CHANGE',
      title: 'Case Officially Closed',
      description: `Investigation finalized and case closed by ${officerName}. Reason: ${closureReason}`,
      timestamp: new Date().toISOString(),
      user: officerName,
      source: 'Command Authority',
      statusBadge: 'Closed',
      referenceId: caseId,
    });

    this.addAuditLog({
      userId: officerId,
      userName: officerName,
      userRole: 'CASE_OFFICER',
      action: 'CASE_CLOSED',
      resourceType: 'CASE',
      resourceId: caseId,
      details: `Case closed with official reason: ${closureReason}`,
      result: 'SUCCESS',
    });

    return updated;
  }

  // ----------------------------------------------------
  // SENIOR OFFICER DASHBOARD & STALE CASES
  // ----------------------------------------------------
  public getStaleThresholdHours(): number {
    return this.staleCaseThresholdHours;
  }

  public setStaleThresholdHours(hours: number): number {
    this.staleCaseThresholdHours = hours;
    return hours;
  }

  public getStaleCases(thresholdHours = this.staleCaseThresholdHours): Case[] {
    const cutoffTime = Date.now() - thresholdHours * 3600 * 1000;
    return this.getAllCases()
      .filter((c) => c.status === 'Active' || c.status === 'Under Investigation')
      .filter((c) => new Date(c.updatedAt).getTime() < cutoffTime);
  }

  public getSeniorOfficerDashboardData(): any {
    const activeCases = this.getAllCases().filter(
      (c) => c.status === 'Active' || c.status === 'Under Investigation'
    );
    const urgentCases = activeCases.filter((c) => c.priority === 'Urgent');
    const staleCases = this.getStaleCases();
    const reports = this.getAllReports();
    const pendingVerifications = reports.filter(
      (r) => r.verificationStatus === 'New' || r.verificationStatus === 'Under Review'
    );

    const tasks = this.getAllTasks();
    const overdueTasks = tasks.filter(
      (t) => t.status !== 'Completed' && new Date(t.dueDate).getTime() < Date.now()
    );

    const leads = this.getAllLeads();
    const openLeads = leads.filter((l) => l.status !== 'CLOSED' && l.status !== 'NOT_USEFUL');

    const sightings = this.getAllSightings();
    const newVerifiedSightings = sightings.filter((s) => s.verificationStatus === 'Verified');

    return {
      summaryCounters: {
        activeCases: activeCases.length,
        urgentCases: urgentCases.length,
        staleCases: staleCases.length,
        pendingVerifications: pendingVerifications.length,
        overdueTasks: overdueTasks.length,
        openLeads: openLeads.length,
        newVerifiedSightings: newVerifiedSightings.length,
      },
      attentionCases: activeCases.map((c) => {
        const cCompleteness = this.getCaseCompleteness(c.id);
        const cPriority = this.getCasePriorityDetails(c.id);
        const caseLeads = leads.filter((l) => l.caseId === c.id && l.status !== 'CLOSED');
        const caseTasks = tasks.filter((t) => t.caseId === c.id && t.status !== 'Completed');

        return {
          caseId: c.id,
          title: c.title,
          personName: c.person.fullName,
          photoUrl: c.person.photoUrl,
          priority: c.priority,
          status: c.status,
          assignedOfficer: c.assignedOfficerName,
          lastUpdated: c.updatedAt,
          openLeadsCount: caseLeads.length,
          openTasksCount: caseTasks.length,
          completenessScore: cCompleteness.overallPercent,
          priorityReasons: cPriority.reasons.map((r) => r.label),
          isStale:
            new Date(c.updatedAt).getTime() < Date.now() - this.staleCaseThresholdHours * 3600 * 1000,
        };
      }),
    };
  }

  // Location Intelligence
  public setUserCurrentLocation(loc: UserCurrentLocation): void {
    this.userCurrentLocations.set(loc.userId, loc);
  }

  public getUserCurrentLocation(userId: string): UserCurrentLocation | undefined {
    return this.userCurrentLocations.get(userId);
  }

  public getCaseLocations(
    caseId: string,
    filters?: { status?: string; fromDate?: string; toDate?: string; userRole?: string }
  ): CaseLocationItem[] {
    const c = this.cases.get(caseId);
    if (!c) return [];

    const locations: CaseLocationItem[] = [];

    // 1. Last Known Location
    if (c.person.lastKnownCoordinates && typeof c.person.lastKnownCoordinates.lat === 'number') {
      locations.push({
        id: `LOC-${c.id}-LKL`,
        caseId: c.id,
        locationType: 'Last Known Location',
        latitude: c.person.lastKnownCoordinates.lat,
        longitude: c.person.lastKnownCoordinates.lng,
        locationName: c.person.lastKnownLocation,
        timestamp: `${c.person.dateMissing}T${c.person.timeMissing}:00Z`,
        source: `${c.person.reportingPersonRelationship} (${c.person.reportingPersonName})`,
        verificationStatus: 'Verified',
        description: `Last known position where ${c.person.fullName} was seen. Circumstances: ${c.person.circumstances}`,
        reporterName: filters?.userRole === 'CITIZEN' ? undefined : c.person.reportingPersonName,
      });
    }

    // 2. Sightings for this case
    let caseSightings = Array.from(this.sightings.values()).filter((s) => s.caseId === caseId);

    if (filters?.status && filters.status !== 'All') {
      caseSightings = caseSightings.filter(
        (s) => s.verificationStatus.toLowerCase() === filters.status!.toLowerCase()
      );
    }

    if (filters?.fromDate) {
      const fromTime = new Date(filters.fromDate).getTime();
      caseSightings = caseSightings.filter((s) => new Date(s.createdAt).getTime() >= fromTime);
    }

    if (filters?.toDate) {
      const toTime = new Date(filters.toDate).getTime();
      caseSightings = caseSightings.filter((s) => new Date(s.createdAt).getTime() <= toTime);
    }

    caseSightings.forEach((s) => {
      const locType =
        s.verificationStatus === 'Verified' ? 'Verified Sighting' : 'Reported Sighting';

      locations.push({
        id: `LOC-${s.id}`,
        caseId: s.caseId,
        sightingId: s.id,
        reportId: s.reportId,
        locationType: locType,
        latitude: s.latitude,
        longitude: s.longitude,
        locationName: s.location,
        timestamp: `${s.date}T${s.time}:00Z`,
        source: s.source,
        verificationStatus: s.verificationStatus,
        description: s.description,
        photoUrl: s.photoUrl,
        reporterName: filters?.userRole === 'CITIZEN' ? undefined : s.reporterName,
      });
    });

    return locations;
  }

  public getAllLocations(filters?: {
    status?: string;
    caseId?: string;
    timeWindow?: string;
    userRole?: string;
  }): CaseLocationItem[] {
    let result: CaseLocationItem[] = [];

    const targetCases = filters?.caseId && filters.caseId !== 'All'
      ? Array.from(this.cases.values()).filter((c) => c.id === filters.caseId)
      : Array.from(this.cases.values()).filter((c) => !c.isArchived);

    for (const c of targetCases) {
      const caseLocs = this.getCaseLocations(c.id, {
        status: filters?.status,
        userRole: filters?.userRole,
      });
      result.push(...caseLocs);
    }

    // Time Window Filtering
    if (filters?.timeWindow && filters.timeWindow !== 'all') {
      const now = Date.now();
      let windowMs = 0;
      if (filters.timeWindow === '1h') windowMs = 1 * 60 * 60 * 1000;
      else if (filters.timeWindow === '6h') windowMs = 6 * 60 * 60 * 1000;
      else if (filters.timeWindow === '24h') windowMs = 24 * 60 * 60 * 1000;
      else if (filters.timeWindow === '7d') windowMs = 7 * 24 * 60 * 60 * 1000;
      else if (filters.timeWindow === 'today') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        windowMs = now - startOfDay.getTime();
      }

      if (windowMs > 0) {
        result = result.filter((loc) => {
          const t = new Date(loc.timestamp).getTime();
          // Include if within window or if invalid date
          return isNaN(t) || now - t <= windowMs;
        });
      }
    }

    return result;
  }

  // Timeline
  public getTimelineEvents(caseId: string): TimelineEvent[] {
    return this.timeline
      .filter((t) => t.caseId === caseId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addTimelineEvent(event: Omit<TimelineEvent, 'id'>): TimelineEvent {
    const newEvent: TimelineEvent = {
      ...event,
      id: `TL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    this.timeline.push(newEvent);
    return newEvent;
  }

  // Audit Logs
  public getAuditLogs(limit = 150): AuditLog[] {
    return [...this.auditLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  public addAuditLog(
    entry: Omit<AuditLog, 'id' | 'timestamp'>
  ): AuditLog {
    const log: AuditLog = {
      ...entry,
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.push(log);
    return log;
  }

  // Notifications
  public getNotifications(userRole?: string, userId?: string): NotificationItem[] {
    return this.notifications
      .filter((n) => {
        if (!n.recipientRole || n.recipientRole === 'ALL') return true;
        if (userRole && n.recipientRole === userRole) return true;
        if (userId && n.recipientUserId === userId) return true;
        return false;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addNotification(
    item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>
  ): NotificationItem {
    const notification: NotificationItem = {
      ...item,
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    this.notifications.push(notification);
    return notification;
  }

  public markNotificationRead(id: string): boolean {
    const target = this.notifications.find((n) => n.id === id);
    if (target) {
      target.read = true;
      return true;
    }
    return false;
  }

  public markAllNotificationsRead(): void {
    this.notifications.forEach((n) => (n.read = true));
  }

  // Seed Data Generation
  private seedAll() {
    // 1. Seed Users
    const usersList: Array<{ user: User; pass: string }> = [
      {
        user: {
          id: 'USR-001',
          username: 'admin',
          fullName: 'Director Eleanor Vance',
          email: 'e.vance@emergencyops.gov',
          role: 'SUPER_ADMIN',
          agency: 'National Emergency Operations Command',
          badgeNumber: 'NEOC-010',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        },
        pass: 'admin123',
      },
      {
        user: {
          id: 'USR-002',
          username: 'officer',
          fullName: 'Det. Marcus Thorne',
          email: 'm.thorne@metro-investigations.gov',
          role: 'CASE_OFFICER',
          agency: 'Metro Unified Missing Persons Unit',
          badgeNumber: 'DET-4482',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        },
        pass: 'officer123',
      },
      {
        user: {
          id: 'USR-003',
          username: 'verifier',
          fullName: 'Inspector Sarah Chen',
          email: 's.chen@incident-verify.gov',
          role: 'VERIFICATION_OFFICER',
          agency: 'Crisis Intelligence Verification Branch',
          badgeNumber: 'VER-819',
          avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        },
        pass: 'verifier123',
      },
      {
        user: {
          id: 'USR-004',
          username: 'shelter',
          fullName: 'Dr. Arthur Morales',
          email: 'a.morales@metrohealth.org',
          role: 'HOSPITAL_SHELTER',
          agency: 'St. Jude Emergency Center & Red Cross Shelter Hub',
          badgeNumber: 'MED-1102',
          avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
        },
        pass: 'shelter123',
      },
      {
        user: {
          id: 'USR-005',
          username: 'citizen',
          fullName: 'Jordan Miller',
          email: 'jordan.m@citizenvolunteer.net',
          role: 'CITIZEN',
          agency: 'Disaster Relief Community Volunteer',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
        pass: 'citizen123',
      },
    ];

    usersList.forEach(({ user, pass }) => {
      this.users.set(user.id, user);
      this.userPasswords.set(user.id, pass);
    });

    // 2. Seed Detailed Real-World Cases
    const seededCases: Case[] = [
      {
        id: 'MP-2026-000001',
        title: 'Arun Kumar - Missing Tech Specialist Separated During Severe Storm',
        status: 'Active',
        priority: 'Urgent',
        leadAgency: 'City Police Missing Persons Bureau',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        createdAt: '2026-09-24T05:00:00Z',
        updatedAt: '2026-09-24T08:30:00Z',
        isArchived: false,
        summary: '34-year-old software engineer last seen leaving office hub in Ukkadam during flash power outage and torrential downpour. Three subsequent sightings reported across central transit corridors.',
        internalNotes: 'Transit cameras at Railway Station ticket hall being reviewed by Verification Officer. Mobile phone last pinged Ukkadam cell tower.',
        statusHistory: [
          {
            fromStatus: 'Draft',
            toStatus: 'Active',
            changedBy: 'Det. Marcus Thorne',
            changedById: 'USR-002',
            timestamp: '2026-09-24T05:15:00Z',
            reason: 'High priority urgent report submitted by spouse with immediate welfare concern.',
          },
        ],
        person: {
          fullName: 'Arun Kumar',
          age: 34,
          gender: 'Male',
          photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
          height: '5\'10" (178 cm)',
          physicalDescription: 'Medium athletic build, short black hair, clean-shaven, dark brown eyes, wears rectangular black-frame spectacles.',
          identifyingMarks: 'Small scar above left eyebrow, wearing a black chronograph watch.',
          clothingDescription: 'Charcoal grey water-resistant windbreaker jacket, navy blue polo t-shirt, beige khaki trousers, brown leather walking boots.',
          languages: ['Tamil', 'English', 'Malayalam'],
          medicalConditions: 'Mild peanut allergy, carries epinephrine auto-injector in backpack.',
          lastKnownLocation: 'Ukkadam Bus Terminus & Lake Hub, Coimbatore',
          lastKnownCoordinates: { lat: 10.9892, lng: 76.9614 },
          lastKnownActivity: 'Navigating bus terminal to reach connecting shuttle during localized flash flooding.',
          circumstances: 'Separated from colleagues when flash flooding blocked normal transit routes; battery died at 6:15 PM.',
          reportingPersonName: 'Priya Kumar',
          reportingPersonContact: '+91-98401-23456',
          reportingPersonRelationship: 'Spouse',
          dateMissing: '2026-09-24',
          timeMissing: '06:15 PM',
        },
      },
      {
        id: 'MP-2026-000101',
        title: 'Maya Lin - High School Student Separated During Flash Flood Evacuation',
        status: 'Active',
        priority: 'Urgent',
        leadAgency: 'Metro Unified Missing Persons Unit',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        createdAt: '2026-09-21T08:30:00Z',
        updatedAt: '2026-09-23T14:15:00Z',
        isArchived: false,
        summary: '17-year-old student last seen near North River High School during rapid evacuation. Multiple citizen sightings near Central Transit Terminal.',
        internalNotes: 'Cell phone pinged at tower 4B (near 5th & Main) at 10:14 PM before going dark. Family has provided dental records.',
        statusHistory: [
          {
            fromStatus: 'Draft',
            toStatus: 'Active',
            changedBy: 'Det. Marcus Thorne',
            changedById: 'USR-002',
            timestamp: '2026-09-21T08:35:00Z',
            reason: 'Intake verified from mother and school principal.',
          },
        ],
        person: {
          fullName: 'Maya Lin',
          age: 17,
          gender: 'Female',
          photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
          height: '5\'4" (163 cm)',
          physicalDescription: 'Slender build, long dark straight hair with copper highlights, brown eyes, wears wire-rimmed round glasses.',
          identifyingMarks: 'Small birthmark on left wrist, silver ear stud.',
          clothingDescription: 'Navy blue North River High hoodie, black jeans, yellow water-resistant backpack, white sneakers.',
          languages: ['English', 'Mandarin'],
          medicalConditions: 'Mild asthma, carries blue inhaler.',
          lastKnownLocation: 'North River High School, Gate 3, Riverdale District',
          lastKnownCoordinates: { lat: 37.7749, lng: -122.4194 },
          lastKnownActivity: 'Boarding emergency shuttle during flood warning; eyewitness says she went back for school bag.',
          circumstances: 'Separated from class group when water rushed into the lower bus bay. Did not arrive at Shelter 4.',
          reportingPersonName: 'Grace Lin',
          reportingPersonContact: '+1-555-019-2831',
          reportingPersonRelationship: 'Mother',
          dateMissing: '2026-09-21',
          timeMissing: '07:45 AM',
        },
      },
      {
        id: 'MP-2026-000102',
        title: 'Robert "Bob" Caldwell - Elderly Veteran with Dementia Wandered from Shelter C',
        status: 'Under Investigation',
        priority: 'High',
        leadAgency: 'County Search & Rescue',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        createdAt: '2026-09-22T06:10:00Z',
        updatedAt: '2026-09-23T11:00:00Z',
        isArchived: false,
        summary: '78-year-old veteran with Alzheimer\'s disease walked out of emergency shelter during overnight shift change. Requires cardiac medication.',
        internalNotes: 'Night security cameras show subject exiting via north fire door at 02:14 AM wearing slippers.',
        statusHistory: [
          {
            fromStatus: 'Draft',
            toStatus: 'Active',
            changedBy: 'Det. Marcus Thorne',
            changedById: 'USR-002',
            timestamp: '2026-09-22T06:20:00Z',
            reason: 'Shelter warden reported missing vulnerable adult.',
          },
          {
            fromStatus: 'Active',
            toStatus: 'Under Investigation',
            changedBy: 'Det. Marcus Thorne',
            changedById: 'USR-002',
            timestamp: '2026-09-22T09:00:00Z',
            reason: 'Ground search team deployed with K-9 units in neighboring ravines.',
          },
        ],
        person: {
          fullName: 'Robert Caldwell',
          age: 78,
          gender: 'Male',
          photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
          height: '5\'10" (178 cm)',
          physicalDescription: 'Thin build, white receding hair, blue eyes, noticeable limp on right leg.',
          identifyingMarks: 'Surgical scar on right knee, U.S. Navy tattoo on left forearm.',
          clothingDescription: 'Olive drab army fleece jacket, grey sweatpants, dark brown slippers, navy blue baseball cap with "USS Enterprise".',
          languages: ['English'],
          medicalConditions: 'Alzheimer\'s, high blood pressure, prone to disorientation in noisy environments.',
          lastKnownLocation: 'Oakridge Community Center Shelter C, Bed 44',
          lastKnownCoordinates: { lat: 37.7833, lng: -122.4167 },
          lastKnownActivity: 'Resting in shelter after wildfire evacuation.',
          circumstances: 'Wandered out during 2:00 AM shift change unnoticed.',
          reportingPersonName: 'Brenda Caldwell',
          reportingPersonContact: '+1-555-014-9923',
          reportingPersonRelationship: 'Daughter',
          dateMissing: '2026-09-22',
          timeMissing: '02:15 AM',
        },
      },
      {
        id: 'MP-2026-000103',
        title: 'Mateo Morales - 6-Year-Old Separated at Stadium Emergency Distribution Point',
        status: 'Active',
        priority: 'Urgent',
        leadAgency: 'Metro Police Child Abduction Rapid Response',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        createdAt: '2026-09-23T15:20:00Z',
        updatedAt: '2026-09-23T19:40:00Z',
        isArchived: false,
        summary: 'Child got separated from parents during crowd surge at relief water distribution entrance.',
        internalNotes: 'Amber alert broadcast issued to regional transit. Child knows his first name and mother\'s name.',
        statusHistory: [
          {
            fromStatus: 'Draft',
            toStatus: 'Active',
            changedBy: 'Director Eleanor Vance',
            changedById: 'USR-001',
            timestamp: '2026-09-23T15:25:00Z',
            reason: 'Immediate Amber priority code assigned.',
          },
        ],
        person: {
          fullName: 'Mateo Morales',
          age: 6,
          gender: 'Male',
          photoUrl: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=400&auto=format&fit=crop&q=80',
          height: '3\'8" (112 cm)',
          physicalDescription: 'Curly brown hair, large dark brown eyes, dimple on right cheek.',
          identifyingMarks: 'Small scar under chin from playground fall.',
          clothingDescription: 'Red dinosaur t-shirt, blue denim shorts, light-up green sandals, clutching a small stuffed lion.',
          languages: ['Spanish', 'English'],
          medicalConditions: 'None reported.',
          lastKnownLocation: 'Civic Stadium Concourse B, Gate 8',
          lastKnownCoordinates: { lat: 37.7682, lng: -122.4285 },
          lastKnownActivity: 'Standing in line with mother for drinking water.',
          circumstances: 'Crowd pushed forward when new bottled water pallets arrived; mother lost grip on child\'s hand.',
          reportingPersonName: 'Camila Morales',
          reportingPersonContact: '+1-555-018-7711',
          reportingPersonRelationship: 'Mother',
          dateMissing: '2026-09-23',
          timeMissing: '03:10 PM',
        },
      },
      {
        id: 'MP-2026-000104',
        title: 'Elena Rostova - Utility Technician Unaccounted for Following Substation Collapse',
        status: 'Under Investigation',
        priority: 'High',
        leadAgency: 'Industrial Incident Emergency Taskforce',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        createdAt: '2026-09-20T18:00:00Z',
        updatedAt: '2026-09-22T21:00:00Z',
        isArchived: false,
        summary: 'Lead electrical engineer did not report to safe assembly area after structural failure at South Grid Power Station.',
        internalNotes: 'Thermal imaging drones detected heat signatures in basement level B2; rescue teams currently shoring timbers.',
        statusHistory: [
          {
            fromStatus: 'Draft',
            toStatus: 'Active',
            changedBy: 'Det. Marcus Thorne',
            changedById: 'USR-002',
            timestamp: '2026-09-20T18:15:00Z',
            reason: 'Company incident coordinator filed missing worker emergency notice.',
          },
          {
            fromStatus: 'Active',
            toStatus: 'Under Investigation',
            changedBy: 'Det. Marcus Thorne',
            changedById: 'USR-002',
            timestamp: '2026-09-21T07:00:00Z',
            reason: 'Urban Search and Rescue (USAR) team dispatched.',
          },
        ],
        person: {
          fullName: 'Elena Rostova',
          age: 34,
          gender: 'Female',
          photoUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&auto=format&fit=crop&q=80',
          height: '5\'7" (170 cm)',
          physicalDescription: 'Athletic build, auburn hair tied back in braid, hazel eyes.',
          identifyingMarks: 'Geometric tattoo on upper back.',
          clothingDescription: 'High-visibility yellow safety vest over grey coveralls, steel-toed work boots, white hard hat with company sticker #409.',
          languages: ['English', 'Russian'],
          medicalConditions: 'Allergic to penicillin.',
          lastKnownLocation: 'Bay Substation 3, Electrical Control Room 2B',
          lastKnownCoordinates: { lat: 37.7511, lng: -122.3982 },
          lastKnownActivity: 'Manual shutdown of auxiliary transformers.',
          circumstances: 'Roof section collapsed during seismic tremors; crew lost contact via radio at 17:42.',
          reportingPersonName: 'Viktor Rostova',
          reportingPersonContact: '+1-555-016-3390',
          reportingPersonRelationship: 'Spouse',
          dateMissing: '2026-09-20',
          timeMissing: '05:45 PM',
        },
      },
      {
        id: 'MP-2026-000105',
        title: 'Tariq Al-Mansoor - Volunteer Disaster Medical Worker Missing in Hillside District',
        status: 'Person Located',
        priority: 'Medium',
        leadAgency: 'Red Crescent & Civil Protection Liaison',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        createdAt: '2026-09-19T12:00:00Z',
        updatedAt: '2026-09-23T18:00:00Z',
        isArchived: false,
        summary: 'Emergency EMT volunteer lost communication after landslide cut off road in Eastern Valley.',
        internalNotes: 'Found safe at St. Mary\'s makeshift clinic assisting wounded civilians with disrupted cell tower.',
        statusHistory: [
          {
            fromStatus: 'Draft',
            toStatus: 'Active',
            changedBy: 'Det. Marcus Thorne',
            changedById: 'USR-002',
            timestamp: '2026-09-19T12:15:00Z',
            reason: 'Volunteer dispatch flagged failure to return.',
          },
          {
            fromStatus: 'Active',
            toStatus: 'Person Located',
            changedBy: 'Inspector Sarah Chen',
            changedById: 'USR-003',
            timestamp: '2026-09-23T18:00:00Z',
            reason: 'Identified and verified in person by Field Medic Lead Dr. Patel.',
          },
        ],
        person: {
          fullName: 'Tariq Al-Mansoor',
          age: 28,
          gender: 'Male',
          photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop&q=80',
          height: '6\'0" (183 cm)',
          physicalDescription: 'Medium build, short black beard, dark eyes.',
          identifyingMarks: 'Small scar over left eyebrow.',
          clothingDescription: 'Red emergency medical response vest, black cargo pants, red duffel with medical cross.',
          languages: ['Arabic', 'English', 'French'],
          medicalConditions: 'None.',
          lastKnownLocation: 'Valley Ridge Road, Mile Marker 4',
          lastKnownCoordinates: { lat: 37.7952, lng: -122.4021 },
          lastKnownActivity: 'Transporting trauma kit to isolated neighborhood.',
          circumstances: 'Landslide blocked both entry roads; radio transmitter battery depleted.',
          reportingPersonName: 'Samira Al-Mansoor',
          reportingPersonContact: '+1-555-012-6688',
          reportingPersonRelationship: 'Sister',
          dateMissing: '2026-09-19',
          timeMissing: '11:30 AM',
        },
      },
      {
        id: 'MP-2026-000106',
        title: 'Chloe Dupont - University Student Lost in Canyon Park Trail Area',
        status: 'Active',
        priority: 'High',
        leadAgency: 'Mountain Rescue & Forestry Rangers',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        createdAt: '2026-09-22T20:00:00Z',
        updatedAt: '2026-09-23T16:30:00Z',
        isArchived: false,
        summary: '21-year-old student hiking alone before sudden thunderstorm triggered flash flooding in Glen Canyon.',
        internalNotes: 'Search team found her hiking pole near stream crossing; helicopter FLIR search scheduled at dusk.',
        statusHistory: [
          {
            fromStatus: 'Draft',
            toStatus: 'Active',
            changedBy: 'Det. Marcus Thorne',
            changedById: 'USR-002',
            timestamp: '2026-09-22T20:10:00Z',
            reason: 'Roommate reported failure to return from day hike.',
          },
        ],
        person: {
          fullName: 'Chloe Dupont',
          age: 21,
          gender: 'Female',
          photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
          height: '5\'6" (168 cm)',
          physicalDescription: 'Blonde wavy shoulder-length hair, blue eyes, athletic build.',
          identifyingMarks: 'Small butterfly tattoo on right ankle.',
          clothingDescription: 'Teal windbreaker jacket, black leggings, purple hiking boots, grey daypack.',
          languages: ['French', 'English'],
          medicalConditions: 'Nut allergy.',
          lastKnownLocation: 'Glen Canyon Park Trailhead South',
          lastKnownCoordinates: { lat: 37.7385, lng: -122.4418 },
          lastKnownActivity: 'Solo trail run and photography.',
          circumstances: 'Severe thunderstorm washed out footbridges; vehicle remains parked at trailhead.',
          reportingPersonName: 'Aaliyah Jones',
          reportingPersonContact: '+1-555-017-8452',
          reportingPersonRelationship: 'Roommate',
          dateMissing: '2026-09-22',
          timeMissing: '04:30 PM',
        },
      },
      {
        id: 'MP-2026-000107',
        title: 'David O\'Connor - Unidentified Patient Admitted with Trauma at Metro General Hospital',
        status: 'Under Investigation',
        priority: 'Medium',
        leadAgency: 'Hospital Social Services Liaison',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        createdAt: '2026-09-21T14:00:00Z',
        updatedAt: '2026-09-23T10:15:00Z',
        isArchived: false,
        summary: 'Cross-matching unidentified trauma victim found unconscious near highway overpass following structural accident.',
        internalNotes: 'Fingerprints submitted to regional emergency database; patient is conscious but disoriented with retrograde amnesia.',
        statusHistory: [
          {
            fromStatus: 'Draft',
            toStatus: 'Under Investigation',
            changedBy: 'Dr. Arthur Morales',
            changedById: 'USR-004',
            timestamp: '2026-09-21T14:10:00Z',
            reason: 'Hospital intake submission for unidentified trauma victim.',
          },
        ],
        person: {
          fullName: 'David O\'Connor (Tentative ID)',
          age: 42,
          gender: 'Male',
          photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
          height: '6\'1" (185 cm)',
          physicalDescription: 'Muscular build, short brown hair greying at temples, grey eyes.',
          identifyingMarks: 'Tribal tattoo on left shoulder, silver wedding band engraved with "Forever D&S 2012".',
          clothingDescription: 'Ripped denim jacket, dark grey t-shirt, brown leather boots.',
          languages: ['English', 'Irish'],
          medicalConditions: 'Concussion, broken left collarbone.',
          lastKnownLocation: 'Highway 101 Overpass & Industrial Parkway',
          lastKnownCoordinates: { lat: 37.7612, lng: -122.4089 },
          lastKnownActivity: 'Unknown prior to discovery by paramedic patrol.',
          circumstances: 'Found collapsed without identification documents following bridge debris fall.',
          reportingPersonName: 'Paramedic Shift Capt. Jackson',
          reportingPersonContact: '+1-555-013-4411',
          reportingPersonRelationship: 'First Responder',
          dateMissing: '2026-09-21',
          timeMissing: '01:00 PM',
        },
      },
      {
        id: 'MP-2026-000108',
        title: 'Mei-Ling Zhou - Wheelchair-bound Resident Missing from Senior Facility',
        status: 'Active',
        priority: 'Urgent',
        leadAgency: 'Adult Protective Services & Search Team',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        createdAt: '2026-09-23T09:00:00Z',
        updatedAt: '2026-09-23T17:00:00Z',
        isArchived: false,
        summary: '82-year-old using motorized wheelchair unaccounted for after rapid wildfire smoke evacuation.',
        internalNotes: 'Transit cameras indicate a motorized wheelchair boarding M-line bus at 10:15 AM heading towards downtown.',
        statusHistory: [
          {
            fromStatus: 'Draft',
            toStatus: 'Active',
            changedBy: 'Det. Marcus Thorne',
            changedById: 'USR-002',
            timestamp: '2026-09-23T09:10:00Z',
            reason: 'Intake validated from facility nurse director.',
          },
        ],
        person: {
          fullName: 'Mei-Ling Zhou',
          age: 82,
          gender: 'Female',
          photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
          height: '5\'0" (152 cm)',
          physicalDescription: 'Petite, grey hair in bun, brown eyes, wears red motorized wheelchair.',
          identifyingMarks: 'Jade pendant on gold chain around neck.',
          clothingDescription: 'Burgundy knitted cardigan, black floral trousers, blue cloth shoes.',
          languages: ['Cantonese', 'English'],
          medicalConditions: 'Limited mobility, requires insulin twice daily.',
          lastKnownLocation: 'Golden Gate Senior Assisted Living, West Wing',
          lastKnownCoordinates: { lat: 37.7819, lng: -122.4662 },
          lastKnownActivity: 'Waiting for transport van in lobby.',
          circumstances: 'Amid dense smoke evacuation, staff believed she was put on Bus #2; bus arrived without her.',
          reportingPersonName: 'Victor Zhou',
          reportingPersonContact: '+1-555-015-7799',
          reportingPersonRelationship: 'Son',
          dateMissing: '2026-09-23',
          timeMissing: '08:30 AM',
        },
      },
      {
        id: 'MP-2026-000109',
        title: 'Lucas Silva - Missing Teenager Last Seen at Harbor Relief Pier',
        status: 'Draft',
        priority: 'Medium',
        leadAgency: 'Harbor Patrol Unit',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        createdAt: '2026-09-23T19:00:00Z',
        updatedAt: '2026-09-23T19:00:00Z',
        isArchived: false,
        summary: '15-year-old volunteer boy last spotted near cargo unloading dock at Pier 39.',
        internalNotes: 'Draft case under preliminary officer review awaiting confirmation of legal guardian details.',
        statusHistory: [],
        person: {
          fullName: 'Lucas Silva',
          age: 15,
          gender: 'Male',
          photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
          height: '5\'8" (173 cm)',
          physicalDescription: 'Dark skin, curly black hair, dark eyes.',
          identifyingMarks: 'Small birthmark on left cheek.',
          clothingDescription: 'Grey hooded sweatshirt with orange "VOLUNTEER" lettering, blue jeans, white running shoes.',
          languages: ['Portuguese', 'English'],
          medicalConditions: 'None.',
          lastKnownLocation: 'Pier 39 Logistics Terminal',
          lastKnownCoordinates: { lat: 37.8087, lng: -122.4098 },
          lastKnownActivity: 'Unloading emergency supply crates.',
          circumstances: 'Stepped away to use restroom at 18:30, did not return.',
          reportingPersonName: 'Lucia Silva',
          reportingPersonContact: '+1-555-011-8844',
          reportingPersonRelationship: 'Aunt',
          dateMissing: '2026-09-23',
          timeMissing: '06:30 PM',
        },
      },
      {
        id: 'MP-2026-000110',
        title: 'Angela & Benjamin Ward - Mother and Toddler Displaced by Apartment Fire',
        status: 'Resolved',
        priority: 'Low',
        leadAgency: 'Municipal Family Services',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        createdAt: '2026-09-18T10:00:00Z',
        updatedAt: '2026-09-20T16:00:00Z',
        isArchived: false,
        summary: 'Mother and 2-year-old son accounted for at relative\'s home after phone lost in structure fire.',
        internalNotes: 'Case closed after physical wellness check conducted by Officer Diaz. Both are safe and housed.',
        statusHistory: [
          {
            fromStatus: 'Draft',
            toStatus: 'Active',
            changedBy: 'Det. Marcus Thorne',
            changedById: 'USR-002',
            timestamp: '2026-09-18T10:10:00Z',
            reason: 'Fire department reported 2 residents missing after building collapse.',
          },
          {
            fromStatus: 'Active',
            toStatus: 'Resolved',
            changedBy: 'Inspector Sarah Chen',
            changedById: 'USR-003',
            timestamp: '2026-09-20T16:00:00Z',
            reason: 'Contact established; staying with maternal grandparents in East Bay.',
          },
        ],
        person: {
          fullName: 'Angela Ward',
          age: 29,
          gender: 'Female',
          photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
          height: '5\'5" (165 cm)',
          physicalDescription: 'Brown hair in ponytail, green eyes, carrying toddler Benjamin.',
          identifyingMarks: 'Small star tattoo on wrist.',
          clothingDescription: 'Purple sweater, jeans, sneakers.',
          languages: ['English'],
          medicalConditions: 'None.',
          lastKnownLocation: '2400 Mission Street Apartments',
          lastKnownCoordinates: { lat: 37.7599, lng: -122.4191 },
          lastKnownActivity: 'Evacuating building during 3-alarm fire.',
          circumstances: 'Evacuated without mobile phone or purse; family reported them missing after searching triage center.',
          reportingPersonName: 'James Ward',
          reportingPersonContact: '+1-555-019-3322',
          reportingPersonRelationship: 'Brother',
          dateMissing: '2026-09-18',
          timeMissing: '09:00 AM',
        },
      },
    ];

    seededCases.forEach((c) => this.cases.set(c.id, c));

    // 3. Seed Reports (Various sources, statuses, duplicate candidates)
    const seededReports: Report[] = [
      {
        id: 'REP-2026-000101',
        caseId: 'MP-2026-000101',
        caseTitle: 'Maya Lin - High School Student Separated During Flash Flood Evacuation',
        reporterType: 'Citizen',
        reporterName: 'Carlos Rivera',
        reporterContact: '+1-555-091-2300',
        description: 'Saw a teenage girl matching description wearing a dark blue hoodie and yellow backpack sitting inside Transit Hub Waiting Room 2 looking distressed and asking people for a phone charger.',
        date: '2026-09-21',
        time: '02:30 PM',
        location: 'Central Transit Hub, Platform 4 Waiting Area',
        latitude: 37.7891,
        longitude: -122.4014,
        source: 'Citizen Emergency Portal',
        verificationStatus: 'Verified',
        assignedReviewerId: 'USR-003',
        assignedReviewerName: 'Inspector Sarah Chen',
        verificationNotes: 'Transit police officer dispatched to Transit Hub confirmed girl was there, but she boarded outbound shuttle toward West Portal. Transit security video saved.',
        uploadedFiles: [],
        createdAt: '2026-09-21T14:45:00Z',
        updatedAt: '2026-09-21T15:30:00Z',
      },
      {
        id: 'REP-2026-000102',
        caseId: 'MP-2026-000101',
        caseTitle: 'Maya Lin - High School Student Separated During Flash Flood Evacuation',
        reporterType: 'Citizen',
        reporterName: 'Danielle Brooks',
        reporterContact: '+1-555-082-1144',
        description: 'Young girl around 16 or 17 with round glasses and yellow backpack buying a water bottle at the convenience store right by West Portal station.',
        date: '2026-09-21',
        time: '04:15 PM',
        location: 'Corner Mart, West Portal Ave & Ulloa St',
        latitude: 37.7402,
        longitude: -122.4678,
        source: 'Citizen Sighting Portal',
        verificationStatus: 'Verified',
        assignedReviewerId: 'USR-003',
        assignedReviewerName: 'Inspector Sarah Chen',
        verificationNotes: 'Store manager verified receipt and cashier remembered girl. Matches physical description and clothing.',
        uploadedFiles: [],
        createdAt: '2026-09-21T16:30:00Z',
        updatedAt: '2026-09-21T17:10:00Z',
      },
      {
        id: 'REP-2026-000103',
        caseId: 'MP-2026-000101',
        caseTitle: 'Maya Lin - High School Student Separated During Flash Flood Evacuation',
        reporterType: 'Citizen',
        reporterName: 'Anonymous Reporter',
        description: 'Possible duplicate sighting: saw girl with yellow bag near West Portal station around 4:20 PM near the tram line.',
        date: '2026-09-21',
        time: '04:20 PM',
        location: 'West Portal Station Tram stop',
        latitude: 37.7405,
        longitude: -122.4675,
        source: 'Citizen Hotline',
        verificationStatus: 'Duplicate',
        assignedReviewerId: 'USR-003',
        assignedReviewerName: 'Inspector Sarah Chen',
        duplicateOfReportId: 'REP-2026-000102',
        verificationNotes: 'Identical time and location as Report REP-2026-000102. Consolidated under master lead.',
        uploadedFiles: [],
        createdAt: '2026-09-21T17:00:00Z',
        updatedAt: '2026-09-21T17:15:00Z',
      },
      {
        id: 'REP-2026-000104',
        caseId: 'MP-2026-000101',
        caseTitle: 'Maya Lin - High School Student Separated During Flash Flood Evacuation',
        reporterType: 'Shelter',
        reporterName: 'Shelter Worker Emily Wong',
        reporterContact: '+1-555-044-8899',
        description: 'A teenage girl registered at our overflow shelter desk for soup, but left before taking a cot because of overcrowding. Did not give full surname.',
        date: '2026-09-22',
        time: '08:00 PM',
        location: 'Sunset Community Center Evacuation Shelter',
        latitude: 37.7554,
        longitude: -122.4842,
        source: 'Shelter Intake Portal',
        verificationStatus: 'Under Review',
        assignedReviewerId: 'USR-003',
        assignedReviewerName: 'Inspector Sarah Chen',
        verificationNotes: 'Reviewing shelter intake security logs to cross-reference face with Maya Lin photo.',
        uploadedFiles: [],
        createdAt: '2026-09-22T21:10:00Z',
        updatedAt: '2026-09-23T08:00:00Z',
      },
      {
        id: 'REP-2026-000105',
        caseId: 'MP-2026-000102',
        caseTitle: 'Robert Caldwell - Elderly Veteran with Dementia Wandered from Shelter C',
        reporterType: 'Citizen',
        reporterName: 'Greg Harrison',
        reporterContact: '+1-555-031-7762',
        description: 'Elderly man wearing a green military style jacket and slippers was sitting on a bench in Golden Gate Park near the rose garden looking confused and shivering.',
        date: '2026-09-22',
        time: '07:30 AM',
        location: 'Golden Gate Park Rose Garden, near Park Presidio',
        latitude: 37.7712,
        longitude: -122.4705,
        source: 'Citizen Emergency Portal',
        verificationStatus: 'Verified',
        assignedReviewerId: 'USR-003',
        assignedReviewerName: 'Inspector Sarah Chen',
        verificationNotes: 'Verified sighting. Ranger unit dispatched immediately; found empty slippers and half-eaten granola bar at bench. Footprints lead south.',
        uploadedFiles: [],
        createdAt: '2026-09-22T08:05:00Z',
        updatedAt: '2026-09-22T08:45:00Z',
      },
      {
        id: 'REP-2026-000106',
        caseId: 'MP-2026-000102',
        caseTitle: 'Robert Caldwell - Elderly Veteran with Dementia Wandered from Shelter C',
        reporterType: 'Citizen',
        reporterName: 'Unknown Caller',
        description: 'Saw an older man walking along Ocean Beach seawall in the fog. Was wearing a navy hat.',
        date: '2026-09-22',
        time: '11:15 AM',
        location: 'Ocean Beach Seawall near Cliff House',
        latitude: 37.7781,
        longitude: -122.5135,
        source: 'Citizen Hotline',
        verificationStatus: 'New',
        uploadedFiles: [],
        createdAt: '2026-09-23T11:20:00Z',
        updatedAt: '2026-09-23T11:20:00Z',
      },
      {
        id: 'REP-2026-000107',
        caseId: 'MP-2026-000103',
        caseTitle: 'Mateo Morales - 6-Year-Old Separated at Stadium Emergency Distribution Point',
        reporterType: 'Field Team',
        reporterName: 'Officer Bradley Kent',
        reporterContact: '+1-555-022-9901',
        description: 'Volunteer at First Aid Station 3 reported seeing a small boy in a dinosaur shirt holding a green toy walking with a security guard towards Section 110.',
        date: '2026-09-23',
        time: '04:10 PM',
        location: 'Civic Stadium Ramp 4 near Section 110',
        latitude: 37.7686,
        longitude: -122.4281,
        source: 'First Responder Radio/CAD',
        verificationStatus: 'Needs More Information',
        assignedReviewerId: 'USR-003',
        assignedReviewerName: 'Inspector Sarah Chen',
        verificationNotes: 'Contacting Section 110 security guard on radio frequency 3 to confirm custody of child.',
        uploadedFiles: [],
        createdAt: '2026-09-23T16:25:00Z',
        updatedAt: '2026-09-23T17:10:00Z',
      },
      {
        id: 'REP-2026-000108',
        caseId: 'MP-2026-000108',
        caseTitle: 'Mei-Ling Zhou - Wheelchair-bound Resident Missing from Senior Facility',
        reporterType: 'Citizen',
        reporterName: 'Transit Driver Marcus Cole',
        reporterContact: '+1-555-077-1234',
        description: 'Elderly Asian lady in a burgundy sweater and motorized wheelchair was assisted off the 38 Geary bus at Van Ness Ave stop by fellow passengers.',
        date: '2026-09-23',
        time: '11:45 AM',
        location: 'Geary Blvd & Van Ness Ave Bus Stop',
        latitude: 37.7858,
        longitude: -122.4215,
        source: 'Transit Incident Log',
        verificationStatus: 'Verified',
        assignedReviewerId: 'USR-003',
        assignedReviewerName: 'Inspector Sarah Chen',
        verificationNotes: 'Confirmed by bus surveillance video clip time-stamped 11:43:20 AM. Subject wheeled eastward on Geary.',
        uploadedFiles: [],
        createdAt: '2026-09-23T13:00:00Z',
        updatedAt: '2026-09-23T14:05:00Z',
      },
      {
        id: 'REP-2026-000001',
        caseId: 'MP-2026-000001',
        caseTitle: 'Arun Kumar - Missing Tech Specialist Separated During Severe Storm',
        reporterType: 'Citizen',
        reporterName: 'Muthukumar S.',
        reporterContact: '+91-94432-11002',
        description: 'Saw individual matching Arun Kumar outside the fruit market near Ukkadam Lake bypass walking briskly with a dark windbreaker.',
        date: '2026-09-24',
        time: '06:45 PM',
        location: 'Ukkadam Lake Bypass Market Junction, Coimbatore',
        latitude: 10.9912,
        longitude: 76.9625,
        source: 'Citizen Hotline',
        verificationStatus: 'Verified',
        assignedReviewerId: 'USR-003',
        assignedReviewerName: 'Inspector Sarah Chen',
        verificationNotes: 'Verified via local merchant stall camera footage showing subject passing at 6:47 PM.',
        uploadedFiles: [],
        createdAt: '2026-09-24T06:55:00Z',
        updatedAt: '2026-09-24T07:10:00Z',
      },
      {
        id: 'REP-2026-000002',
        caseId: 'MP-2026-000001',
        caseTitle: 'Arun Kumar - Missing Tech Specialist Separated During Severe Storm',
        reporterType: 'Police',
        reporterName: 'Sub-Inspector Rajesh V.',
        reporterContact: '+91-422-230-0100',
        description: 'Transit beat patrol reported subject resembling photo asking station master about suburban train services towards Gandhipuram/Tiruppur.',
        date: '2026-09-24',
        time: '07:20 PM',
        location: 'Coimbatore Junction Railway Station, Platform 1',
        latitude: 10.9976,
        longitude: 76.9664,
        source: 'Transit Police Log',
        verificationStatus: 'Under Review',
        assignedReviewerId: 'USR-003',
        assignedReviewerName: 'Inspector Sarah Chen',
        verificationNotes: 'Awaiting station master confirmation and Railway Police CCTV time sync.',
        uploadedFiles: [],
        createdAt: '2026-09-24T07:35:00Z',
        updatedAt: '2026-09-24T07:40:00Z',
      },
      {
        id: 'REP-2026-000003',
        caseId: 'MP-2026-000001',
        caseTitle: 'Arun Kumar - Missing Tech Specialist Separated During Severe Storm',
        reporterType: 'Citizen',
        reporterName: 'Anand R.',
        reporterContact: '+91-98940-55612',
        description: 'Believes he saw a person matching photo at tea shop near Gandhipuram Central Bus Stand waiting under umbrella shelter.',
        date: '2026-09-24',
        time: '08:05 PM',
        location: 'Gandhipuram Town Bus Stand & Cross Cut Road Junction, Coimbatore',
        latitude: 11.0183,
        longitude: 76.9644,
        source: 'Public Web Portal',
        verificationStatus: 'New',
        assignedReviewerId: 'USR-003',
        assignedReviewerName: 'Inspector Sarah Chen',
        verificationNotes: 'Field officer dispatched to tea stall to inspect payment slip records.',
        uploadedFiles: [],
        createdAt: '2026-09-24T08:15:00Z',
        updatedAt: '2026-09-24T08:15:00Z',
      },
    ];

    seededReports.forEach((r) => this.reports.set(r.id, r));

    // 4. Seed Sightings
    const seededSightings: Sighting[] = [
      {
        id: 'SGT-2026-000001',
        caseId: 'MP-2026-000001',
        caseTitle: 'Arun Kumar',
        reportId: 'REP-2026-000001',
        date: '2026-09-24',
        time: '06:45 PM',
        location: 'Ukkadam Lake Bypass Market Junction, Coimbatore',
        latitude: 10.9912,
        longitude: 76.9625,
        description: 'Confirmed sighting outside fruit stall walking briskly wearing dark windbreaker.',
        reporterName: 'Muthukumar S.',
        source: 'Citizen Sighting',
        verificationStatus: 'Verified',
        reviewerId: 'USR-003',
        reviewerName: 'Inspector Sarah Chen',
        notes: 'Confirmed through shop security camera timestamp 18:47 hrs.',
        createdAt: '2026-09-24T06:55:00Z',
      },
      {
        id: 'SGT-2026-000002',
        caseId: 'MP-2026-000001',
        caseTitle: 'Arun Kumar',
        reportId: 'REP-2026-000002',
        date: '2026-09-24',
        time: '07:20 PM',
        location: 'Coimbatore Junction Railway Station, Platform 1',
        latitude: 10.9976,
        longitude: 76.9664,
        description: 'Subject reported inquiring at station master cabin regarding train schedule.',
        reporterName: 'Sub-Inspector Rajesh V.',
        source: 'Transit Police Log',
        verificationStatus: 'Under Review',
        reviewerId: 'USR-003',
        reviewerName: 'Inspector Sarah Chen',
        notes: 'Verification team requesting station camera feed to authenticate ID.',
        createdAt: '2026-09-24T07:35:00Z',
      },
      {
        id: 'SGT-2026-000003',
        caseId: 'MP-2026-000001',
        caseTitle: 'Arun Kumar',
        reportId: 'REP-2026-000003',
        date: '2026-09-24',
        time: '08:05 PM',
        location: 'Gandhipuram Town Bus Stand & Cross Cut Road Junction, Coimbatore',
        latitude: 11.0183,
        longitude: 76.9644,
        description: 'Citizen reported seeing man matching description under bus shelter umbrella.',
        reporterName: 'Anand R.',
        source: 'Public Web Portal',
        verificationStatus: 'Unverified',
        reviewerId: 'USR-003',
        reviewerName: 'Inspector Sarah Chen',
        notes: 'Pending initial call verification with informant.',
        createdAt: '2026-09-24T08:15:00Z',
      },
      {
        id: 'SGT-2026-000101',
        caseId: 'MP-2026-000101',
        caseTitle: 'Maya Lin',
        reportId: 'REP-2026-000101',
        date: '2026-09-21',
        time: '02:30 PM',
        location: 'Central Transit Hub, Platform 4',
        latitude: 37.7891,
        longitude: -122.4014,
        description: 'Sitting on bench in Waiting Room 2 with yellow backpack.',
        reporterName: 'Carlos Rivera',
        source: 'Citizen Sighting',
        verificationStatus: 'Verified',
        reviewerId: 'USR-003',
        reviewerName: 'Inspector Sarah Chen',
        notes: 'Confirmed by CCTV Review.',
        createdAt: '2026-09-21T14:45:00Z',
      },
      {
        id: 'SGT-2026-000102',
        caseId: 'MP-2026-000101',
        caseTitle: 'Maya Lin',
        reportId: 'REP-2026-000102',
        date: '2026-09-21',
        time: '04:15 PM',
        location: 'Corner Mart, West Portal Ave & Ulloa St',
        latitude: 37.7402,
        longitude: -122.4678,
        description: 'Buying bottled water; wore navy hoodie with school emblem.',
        reporterName: 'Danielle Brooks',
        source: 'Store Customer',
        verificationStatus: 'Verified',
        reviewerId: 'USR-003',
        reviewerName: 'Inspector Sarah Chen',
        notes: 'Matched with store receipt #8192.',
        createdAt: '2026-09-21T16:30:00Z',
      },
      {
        id: 'SGT-2026-000103',
        caseId: 'MP-2026-000101',
        caseTitle: 'Maya Lin',
        reportId: 'REP-2026-000104',
        date: '2026-09-22',
        time: '08:00 PM',
        location: 'Sunset Community Center Shelter',
        latitude: 37.7554,
        longitude: -122.4842,
        description: 'Observed in cafeteria line, did not check into dormitory room.',
        reporterName: 'Emily Wong',
        source: 'Shelter Staff',
        verificationStatus: 'Under Review',
        reviewerId: 'USR-003',
        reviewerName: 'Inspector Sarah Chen',
        notes: 'Awaiting cafeteria camera footage retrieval.',
        createdAt: '2026-09-22T21:10:00Z',
      },
      {
        id: 'SGT-2026-000104',
        caseId: 'MP-2026-000102',
        caseTitle: 'Robert Caldwell',
        reportId: 'REP-2026-000105',
        date: '2026-09-22',
        time: '07:30 AM',
        location: 'Golden Gate Park Rose Garden',
        latitude: 37.7712,
        longitude: -122.4705,
        description: 'Elderly man on bench wearing olive fleece jacket.',
        reporterName: 'Greg Harrison',
        source: 'Morning Jogger',
        verificationStatus: 'Verified',
        reviewerId: 'USR-003',
        reviewerName: 'Inspector Sarah Chen',
        notes: 'Slippers recovered at scene by Park Police.',
        createdAt: '2026-09-22T08:05:00Z',
      },
      {
        id: 'SGT-2026-000105',
        caseId: 'MP-2026-000102',
        caseTitle: 'Robert Caldwell',
        reportId: 'REP-2026-000106',
        date: '2026-09-22',
        time: '11:15 AM',
        location: 'Ocean Beach Seawall near Cliff House',
        latitude: 37.7781,
        longitude: -122.5135,
        description: 'Man walking alone slowly along seawall toward parking lot.',
        reporterName: 'Unknown Beachgoer',
        source: 'Phone Tip',
        verificationStatus: 'Unverified',
        createdAt: '2026-09-23T11:20:00Z',
      },
      {
        id: 'SGT-2026-000106',
        caseId: 'MP-2026-000108',
        caseTitle: 'Mei-Ling Zhou',
        reportId: 'REP-2026-000108',
        date: '2026-09-23',
        time: '11:45 AM',
        location: 'Geary Blvd & Van Ness Ave',
        latitude: 37.7858,
        longitude: -122.4215,
        description: 'Red motorized wheelchair exiting bus ramp.',
        reporterName: 'Marcus Cole',
        source: 'Transit Driver Log',
        verificationStatus: 'Verified',
        reviewerId: 'USR-003',
        reviewerName: 'Inspector Sarah Chen',
        notes: 'Camera confirmed at 11:43 AM.',
        createdAt: '2026-09-23T13:00:00Z',
      },
    ];

    seededSightings.forEach((s) => this.sightings.set(s.id, s));

    // 5. Seed Investigation Tasks
    const seededTasks: InvestigationTask[] = [
      {
        id: 'TSK-2026-000101',
        caseId: 'MP-2026-000101',
        caseTitle: 'Maya Lin',
        title: 'Review Central Transit Station CCTV Platform 4',
        description: 'Subpoena and extract high-definition footage between 02:00 PM and 03:30 PM on Sept 21 to track boarding destination.',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        priority: 'Urgent',
        dueDate: '2026-09-23T18:00:00Z',
        status: 'Completed',
        createdBy: 'Director Eleanor Vance',
        createdAt: '2026-09-21T15:00:00Z',
        completedAt: '2026-09-21T18:45:00Z',
        notes: 'Footage confirmed subject boarded West Portal shuttle bus #418.',
      },
      {
        id: 'TSK-2026-000102',
        caseId: 'MP-2026-000101',
        caseTitle: 'Maya Lin',
        title: 'Interview Sunset Community Center Shelter Volunteers',
        description: 'Interview evening soup line workers who served meals between 7:30 PM and 8:30 PM on Sept 22.',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        priority: 'High',
        dueDate: '2026-09-24T12:00:00Z',
        status: 'In Progress',
        createdBy: 'Det. Marcus Thorne',
        createdAt: '2026-09-23T08:30:00Z',
      },
      {
        id: 'TSK-2026-000103',
        caseId: 'MP-2026-000102',
        caseTitle: 'Robert Caldwell',
        title: 'Deploy K-9 Search Unit along Golden Gate Park South Trails',
        description: 'Track scent cone from recovery site at Rose Garden bench towards 9th Ave entrance.',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        priority: 'Urgent',
        dueDate: '2026-09-23T16:00:00Z',
        status: 'In Progress',
        createdBy: 'Det. Marcus Thorne',
        createdAt: '2026-09-22T09:15:00Z',
        notes: 'K-9 unit "Echo" alerted on trail heading towards Japanese Tea Garden.',
      },
      {
        id: 'TSK-2026-000104',
        caseId: 'MP-2026-000103',
        caseTitle: 'Mateo Morales',
        title: 'Coordinate Civic Stadium Perimeter Lock & Concourse Sweep',
        description: 'Ensure all exit gates have photo flyer, check all family restrooms and first aid booths.',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        priority: 'Urgent',
        dueDate: '2026-09-23T20:00:00Z',
        status: 'In Progress',
        createdBy: 'Director Eleanor Vance',
        createdAt: '2026-09-23T15:35:00Z',
      },
      {
        id: 'TSK-2026-000105',
        caseId: 'MP-2026-000107',
        caseTitle: 'David O\'Connor',
        title: 'Query Missing Persons Database for Engraved Ring "Forever D&S 2012"',
        description: 'Run cross-jurisdictional query against reported missing spouses in neighboring counties.',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        priority: 'Medium',
        dueDate: '2026-09-24T18:00:00Z',
        status: 'Pending',
        createdBy: 'Dr. Arthur Morales',
        createdAt: '2026-09-22T10:00:00Z',
      },
    ];

    seededTasks.forEach((t) => this.tasks.set(t.id, t));

    // 6. Seed Timeline Events
    this.addTimelineEvent({
      caseId: 'MP-2026-000001',
      eventType: 'CASE_CREATED',
      title: 'Emergency Missing Person Case Registered',
      description: 'Case registered by Det. Marcus Thorne upon emergency report from Priya Kumar (Spouse). Subject lost contact in Ukkadam during storm power disruption.',
      timestamp: '2026-09-24T05:00:00Z',
      user: 'Det. Marcus Thorne',
      source: 'Intake Bureau',
      statusBadge: 'Active',
      referenceId: 'MP-2026-000001',
    });

    this.addTimelineEvent({
      caseId: 'MP-2026-000001',
      eventType: 'SIGHTING_LOGGED',
      title: 'Sighting 1 Logged & Verified (Ukkadam 6:45 PM)',
      description: 'Sighting reported at Ukkadam Lake Bypass Market Junction. Verified by Inspector Sarah Chen via merchant CCTV.',
      timestamp: '2026-09-24T06:45:00Z',
      user: 'Muthukumar S. / Insp. Sarah Chen',
      source: 'Citizen Hotline',
      statusBadge: 'Verified',
      referenceId: 'SGT-2026-000001',
    });

    this.addTimelineEvent({
      caseId: 'MP-2026-000001',
      eventType: 'SIGHTING_LOGGED',
      title: 'Sighting 2 Logged (Railway Station 7:20 PM)',
      description: 'Transit beat patrol reported subject at Coimbatore Junction Railway Station Platform 1 inquiring about train departures.',
      timestamp: '2026-09-24T07:20:00Z',
      user: 'Sub-Inspector Rajesh V.',
      source: 'Transit Police Log',
      statusBadge: 'Under Review',
      referenceId: 'SGT-2026-000002',
    });

    this.addTimelineEvent({
      caseId: 'MP-2026-000001',
      eventType: 'SIGHTING_LOGGED',
      title: 'Sighting 3 Logged (Gandhipuram 8:05 PM)',
      description: 'Citizen report received from Gandhipuram Central Bus Stand under tea stall shelter.',
      timestamp: '2026-09-24T08:05:00Z',
      user: 'Anand R.',
      source: 'Public Web Portal',
      statusBadge: 'Unverified',
      referenceId: 'SGT-2026-000003',
    });

    this.addTimelineEvent({
      caseId: 'MP-2026-000101',
      eventType: 'CASE_CREATED',
      title: 'Missing Person Case Created',
      description: 'Case opened by Det. Marcus Thorne upon intake report from Grace Lin (Mother).',
      timestamp: '2026-09-21T08:30:00Z',
      user: 'Det. Marcus Thorne',
      source: 'Internal Intake',
      statusBadge: 'Active',
      referenceId: 'MP-2026-000101',
    });

    this.addTimelineEvent({
      caseId: 'MP-2026-000101',
      eventType: 'REPORT_SUBMITTED',
      title: 'First Citizen Sighting Report Logged',
      description: 'Report REP-2026-000101 submitted by Carlos Rivera at Central Transit Hub.',
      timestamp: '2026-09-21T14:45:00Z',
      user: 'Carlos Rivera',
      source: 'Citizen Portal',
      statusBadge: 'New',
      referenceId: 'REP-2026-000101',
    });

    this.addTimelineEvent({
      caseId: 'MP-2026-000101',
      eventType: 'VERIFICATION_ACTION',
      title: 'Transit Hub Sighting Verified',
      description: 'Inspector Sarah Chen reviewed CCTV and confirmed subject match with high confidence.',
      timestamp: '2026-09-21T15:30:00Z',
      user: 'Inspector Sarah Chen',
      source: 'Verification Desk',
      statusBadge: 'Verified',
      referenceId: 'REP-2026-000101',
    });

    this.addTimelineEvent({
      caseId: 'MP-2026-000101',
      eventType: 'TASK_ASSIGNED',
      title: 'Investigation Task Dispatched',
      description: 'Task TSK-2026-000101 created: Review Central Transit Station CCTV Platform 4.',
      timestamp: '2026-09-21T15:35:00Z',
      user: 'Director Eleanor Vance',
      source: 'Command Operations',
      statusBadge: 'Urgent',
      referenceId: 'TSK-2026-000101',
    });

    this.addTimelineEvent({
      caseId: 'MP-2026-000101',
      eventType: 'REPORT_SUBMITTED',
      title: 'Second Verified Sighting at West Portal',
      description: 'Convenience store clerk confirmed girl matching description purchased bottled water.',
      timestamp: '2026-09-21T17:10:00Z',
      user: 'Inspector Sarah Chen',
      source: 'Field Verification',
      statusBadge: 'Verified',
      referenceId: 'REP-2026-000102',
    });

    this.addTimelineEvent({
      caseId: 'MP-2026-000101',
      eventType: 'REPORT_SUBMITTED',
      title: 'Shelter Lead Logged at Sunset Community Center',
      description: 'Report REP-2026-000104 submitted by shelter staff. Awaiting CCTV confirmation.',
      timestamp: '2026-09-22T21:10:00Z',
      user: 'Emily Wong',
      source: 'Shelter Intake Desk',
      statusBadge: 'Under Review',
      referenceId: 'REP-2026-000104',
    });

    // 7. Seed Initial Audit Logs
    this.addAuditLog({
      userId: 'USR-001',
      userName: 'Director Eleanor Vance',
      userRole: 'SUPER_ADMIN',
      action: 'SYSTEM_BOOTSTRAP',
      resourceType: 'SYSTEM',
      resourceId: 'SYS-INIT',
      details: 'Emergency Operations Command center instance initialized with multi-agency RBAC policies.',
      result: 'SUCCESS',
      ipAddress: '10.0.4.1',
    });

    this.addAuditLog({
      userId: 'USR-002',
      userName: 'Det. Marcus Thorne',
      userRole: 'CASE_OFFICER',
      action: 'CASE_CREATED',
      resourceType: 'CASE',
      resourceId: 'MP-2026-000101',
      details: 'Created case for Maya Lin with priority Urgent.',
      result: 'SUCCESS',
      ipAddress: '10.0.4.18',
    });

    this.addAuditLog({
      userId: 'USR-003',
      userName: 'Inspector Sarah Chen',
      userRole: 'VERIFICATION_OFFICER',
      action: 'REPORT_VERIFIED',
      resourceType: 'REPORT',
      resourceId: 'REP-2026-000101',
      details: 'Verified sighting at Central Transit Hub after cross-referencing camera feed.',
      result: 'SUCCESS',
      ipAddress: '10.0.4.22',
    });

    // 8. Seed Initial Notifications
    this.addNotification({
      recipientRole: 'CASE_OFFICER',
      title: 'New High-Priority Sighting Received',
      message: 'A citizen reported sighting Maya Lin near West Portal Ave. Requires review.',
      type: 'ALERT',
      caseId: 'MP-2026-000101',
      reportId: 'REP-2026-000102',
    });

    this.addNotification({
      recipientRole: 'VERIFICATION_OFFICER',
      title: 'Verification Queue Item Pending',
      message: 'Report REP-2026-000104 from Sunset Community Center awaits image verification.',
      type: 'VERIFICATION',
      caseId: 'MP-2026-000101',
      reportId: 'REP-2026-000104',
    });

    this.addNotification({
      recipientRole: 'SUPER_ADMIN',
      title: 'Urgent Case Opened: Amber Status',
      message: 'Case MP-2026-000103 (Mateo Morales, 6yo) marked Urgent following stadium crowd separation.',
      type: 'ALERT',
      caseId: 'MP-2026-000103',
    });

    // 9. Seed Initial Leads
    const initialLeads: Lead[] = [
      {
        id: 'LED-2026-000001',
        caseId: 'MP-2026-000001',
        caseTitle: 'Rajesh Kumar - Missing from Ukkadam',
        title: 'Railway Station Platform 1 Ticket Counter Inquiry',
        description: 'Interview Railway station booking clerk who reported seeing subject asking about late-night train to Palakkad.',
        source: 'Transit Police Sighting Log SGT-2026-000002',
        priority: 'High',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        createdAt: '2026-09-24T07:30:00Z',
        dueDate: '2026-09-25T12:00:00Z',
        status: 'UNDER_INVESTIGATION',
        notes: 'Clerk remembered blue windbreaker jacket matching description.',
        updatedAt: '2026-09-24T08:00:00Z',
      },
      {
        id: 'LED-2026-000002',
        caseId: 'MP-2026-000001',
        caseTitle: 'Rajesh Kumar - Missing from Ukkadam',
        title: 'Coimbatore Medical College Hospital Emergency Desk Audit',
        description: 'Check emergency admission logs for unidentified male admitted following storm power disruption.',
        source: 'Hospital Intake Desk',
        priority: 'Urgent',
        assignedOfficerId: 'USR-003',
        assignedOfficerName: 'Inspector Sarah Chen',
        createdAt: '2026-09-24T08:00:00Z',
        dueDate: '2026-09-24T18:00:00Z',
        status: 'WAITING_FOR_RESPONSE',
        notes: 'Requested casualty register dump for Sept 23 night shift.',
        updatedAt: '2026-09-24T08:15:00Z',
      },
      {
        id: 'LED-2026-000003',
        caseId: 'MP-2026-000001',
        caseTitle: 'Rajesh Kumar - Missing from Ukkadam',
        title: 'Gandhipuram Bus Stand Tea Stall CCTV Collection',
        description: 'Obtain security footage from Annapoorna tea stall near bay 4.',
        source: 'Citizen Report REP-2026-000003',
        priority: 'Medium',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        createdAt: '2026-09-24T08:30:00Z',
        dueDate: '2026-09-25T15:00:00Z',
        status: 'ASSIGNED',
        updatedAt: '2026-09-24T08:30:00Z',
      },
      {
        id: 'LED-2026-000101',
        caseId: 'MP-2026-000101',
        caseTitle: 'Maya Lin - Missing from Central Transit Hub',
        title: 'Central Transit Station Platform 4 High-Res Camera Dump',
        description: 'Export 1080p footage from camera 4B covering north exit between 14:30 and 15:15.',
        source: 'Verified Sighting REP-2026-000101',
        priority: 'Urgent',
        assignedOfficerId: 'USR-003',
        assignedOfficerName: 'Inspector Sarah Chen',
        createdAt: '2026-09-21T15:40:00Z',
        dueDate: '2026-09-22T10:00:00Z',
        status: 'VERIFIED',
        notes: 'Subject confirmed exiting towards 4th Street transit plaza.',
        updatedAt: '2026-09-21T16:00:00Z',
      },
      {
        id: 'LED-2026-000102',
        caseId: 'MP-2026-000101',
        caseTitle: 'Maya Lin - Missing from Central Transit Hub',
        title: 'Sunset Community Center Shelter Contact Audit',
        description: 'Contact night coordinator at Sunset Shelter regarding teenage girl matching description.',
        source: 'Shelter Desk Log REP-2026-000104',
        priority: 'High',
        assignedOfficerId: 'USR-002',
        assignedOfficerName: 'Det. Marcus Thorne',
        createdAt: '2026-09-22T21:15:00Z',
        dueDate: '2026-09-23T12:00:00Z',
        status: 'UNDER_INVESTIGATION',
        notes: 'Shelter staff requested officer visit for photo verification.',
        updatedAt: '2026-09-23T09:00:00Z',
      },
    ];
    initialLeads.forEach((l) => this.leads.set(l.id, l));

    // 10. Seed Initial Conflicts
    this.conflicts.set('MP-2026-000001', [
      {
        id: 'CFL-001',
        caseId: 'MP-2026-000001',
        category: 'Clothing',
        status: 'UNRESOLVED',
        conflictingValues: [
          { reportId: 'REP-2026-000001', source: 'Family Intake', value: 'Blue windbreaker & black trousers', timestamp: '2026-09-24T05:00:00Z' },
          { reportId: 'SGT-2026-000003', source: 'Citizen Sighting #3', value: 'Dark brown hooded sweatshirt', timestamp: '2026-09-24T08:05:00Z' },
        ],
      },
      {
        id: 'CFL-002',
        caseId: 'MP-2026-000001',
        category: 'Direction',
        status: 'UNRESOLVED',
        conflictingValues: [
          { reportId: 'SGT-2026-000002', source: 'Transit Patrol', value: 'Boarding outbound train towards Palakkad', timestamp: '2026-09-24T07:20:00Z' },
          { reportId: 'SGT-2026-000003', source: 'Gandhipuram Citizen', value: 'Waiting under bus stand shelter heading north', timestamp: '2026-09-24T08:05:00Z' },
        ],
      },
    ]);

    this.conflicts.set('MP-2026-000101', [
      {
        id: 'CFL-003',
        caseId: 'MP-2026-000101',
        category: 'Physical Description',
        status: 'UNRESOLVED',
        conflictingValues: [
          { reportId: 'REP-2026-000101', source: 'Carlos Rivera', value: 'Hair tied back in ponytail with red backpack', timestamp: '2026-09-21T14:45:00Z' },
          { reportId: 'REP-2026-000104', source: 'Shelter Staff', value: 'Short hair cut with black tote bag', timestamp: '2026-09-22T21:10:00Z' },
        ],
      },
    ]);

    // 11. Seed Initial AI Next Actions
    this.aiNextActions.set('MP-2026-000001', [
      {
        id: 'ACT-001',
        caseId: 'MP-2026-000001',
        actionTitle: 'Verify Railway Station Platform 1 CCTV',
        description: 'Cross-reference Sighting SGT-2026-000002 timestamp (7:20 PM) with Railway station camera 3 facing ticket booth.',
        whySuggested: 'High-priority unverified sighting logged near high-volume transit corridor within 1 hour of disappearance.',
        priority: 'Urgent',
        status: 'PENDING',
      },
      {
        id: 'ACT-002',
        caseId: 'MP-2026-000001',
        actionTitle: 'Resolve Conflicting Clothing Descriptions',
        description: 'Contact reporting party Anand R. (SGT-2026-000003) to confirm if dark brown hooded jacket was worn over blue windbreaker.',
        whySuggested: 'Conflict detected between family intake description and Gandhipuram citizen report.',
        priority: 'High',
        status: 'PENDING',
      },
      {
        id: 'ACT-003',
        caseId: 'MP-2026-000001',
        actionTitle: 'Dispatch Field Team to Coimbatore CMC Casualty Desk',
        description: 'Send patrol officer to physically review admissions ledger from storm power outage period.',
        whySuggested: 'Subject has documented hypertension & cardiovascular concern.',
        priority: 'High',
        status: 'PENDING',
      },
    ]);

    this.aiNextActions.set('MP-2026-000101', [
      {
        id: 'ACT-004',
        caseId: 'MP-2026-000101',
        actionTitle: 'Conduct Physical Verification at Sunset Community Shelter',
        description: 'Dispatch Officer Marcus Thorne to inspect shelter intake log and photo match subject.',
        whySuggested: 'Shelter report matches age profile (14yo) and general disappearance timeframe.',
        priority: 'Urgent',
        status: 'PENDING',
      },
    ]);

    // 12. Seed Initial Potential Related Cases
    this.potentialRelatedCases.set('MP-2026-000001', [
      {
        id: 'REL-001',
        caseId: 'MP-2026-000001',
        targetCaseId: 'MP-2026-000107',
        targetCaseTitle: 'David O\'Connor - Missing from Golden Gate Sector',
        targetPersonName: 'David O\'Connor',
        similarityScore: 78,
        matchingReasons: [
          'Similar age range (54yo vs 58yo)',
          'Similar storm power outage circumstances',
          'Medical concern noted for both subjects',
        ],
        status: 'PENDING',
      },
    ]);
  }
}

export const db = new Database();
