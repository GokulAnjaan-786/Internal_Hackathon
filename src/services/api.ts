import {
  Case,
  Report,
  Sighting,
  InvestigationTask,
  TimelineEvent,
  AuditLog,
  NotificationItem,
  User,
  UserRole,
  AiMatchAnalysis,
  AiDuplicateAnalysis,
  AiCaseSummaryResult,
  FileAttachment,
  CaseLocationItem,
  DistanceCalculationResult,
  UserCurrentLocation,
  LocationIntelligenceResult,
} from '../types/index.ts';

const TOKEN_KEY = 'mpo_session_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) errorMsg = errorData.error;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  demoSwitch: (role: UserRole) =>
    request<{ token: string; user: User }>('/api/auth/demo-switch', {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  logout: () =>
    request<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  getMe: () =>
    request<{ user: User }>('/api/auth/me'),

  // Cases
  getCases: (params?: {
    status?: string;
    priority?: string;
    search?: string;
    includeArchived?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.priority) q.append('priority', params.priority);
    if (params?.search) q.append('search', params.search);
    if (params?.includeArchived) q.append('includeArchived', 'true');
    return request<{ total: number; cases: Case[] }>(`/api/cases?${q.toString()}`);
  },

  getCaseById: (id: string) =>
    request<Case>(`/api/cases/${id}`),

  createCase: (data: any) =>
    request<Case>('/api/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCase: (id: string, updates: Partial<Case>) =>
    request<Case>(`/api/cases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  updateCaseStatus: (id: string, newStatus: string, reason: string) =>
    request<Case>(`/api/cases/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ newStatus, reason }),
    }),

  archiveCase: (id: string, reason: string) =>
    request<Case>(`/api/cases/${id}/archive`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getCaseTimeline: (caseId: string) =>
    request<{ caseId: string; events: TimelineEvent[] }>(`/api/cases/${caseId}/timeline`),

  getCasePhotos: (caseId: string) =>
    request<{ caseId: string; files: FileAttachment[] }>(`/api/cases/${caseId}/photos`),

  uploadCasePhoto: (caseId: string, data: any) =>
    request<FileAttachment>(`/api/cases/${caseId}/photos`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Reports
  getReports: (params?: { caseId?: string; status?: string; source?: string }) => {
    const q = new URLSearchParams();
    if (params?.caseId) q.append('caseId', params.caseId);
    if (params?.status) q.append('status', params.status);
    if (params?.source) q.append('source', params.source);
    return request<{ total: number; reports: Report[] }>(`/api/reports?${q.toString()}`);
  },

  getReportById: (id: string) =>
    request<Report>(`/api/reports/${id}`),

  submitReport: (data: any) =>
    request<Report>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyReport: (id: string, verificationNotes: string) =>
    request<{ report: Report; sighting: Sighting }>(`/api/reports/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ verificationNotes }),
    }),

  rejectReport: (id: string, reason: string) =>
    request<Report>(`/api/reports/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  duplicateReport: (id: string, masterReportId: string, notes?: string) =>
    request<Report>(`/api/reports/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ masterReportId, notes }),
    }),

  requestReportInfo: (id: string, detailsNeeded: string) =>
    request<Report>(`/api/reports/${id}/request-info`, {
      method: 'POST',
      body: JSON.stringify({ detailsNeeded }),
    }),

  getPublicReportStatus: (reportId: string) =>
    request<{
      reportId: string;
      caseId: string;
      submissionDate: string;
      submissionTime: string;
      generalLocation: string;
      verificationStatus: string;
      updatedAt: string;
      message: string;
    }>(`/api/reports/${reportId}/public-status`),

  // Sightings
  getSightings: (params?: { caseId?: string; verificationStatus?: string }) => {
    const q = new URLSearchParams();
    if (params?.caseId) q.append('caseId', params.caseId);
    if (params?.verificationStatus) q.append('verificationStatus', params.verificationStatus);
    return request<{ total: number; sightings: Sighting[] }>(`/api/sightings?${q.toString()}`);
  },

  createSighting: (data: any) =>
    request<Sighting>('/api/sightings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Tasks
  getTasks: (params?: { caseId?: string; status?: string; priority?: string }) => {
    const q = new URLSearchParams();
    if (params?.caseId) q.append('caseId', params.caseId);
    if (params?.status) q.append('status', params.status);
    if (params?.priority) q.append('priority', params.priority);
    return request<{ total: number; tasks: InvestigationTask[] }>(`/api/tasks?${q.toString()}`);
  },

  createTask: (data: any) =>
    request<InvestigationTask>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTask: (id: string, status?: string, notes?: string) =>
    request<InvestigationTask>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),

  // AI Assistance
  matchDescription: (caseId: string, sightingDescription: string) =>
    request<AiMatchAnalysis>('/api/ai/match-description', {
      method: 'POST',
      body: JSON.stringify({ caseId, sightingDescription }),
    }),

  detectDuplicates: (reportIdA: string, reportIdB: string) =>
    request<AiDuplicateAnalysis>('/api/ai/detect-duplicates', {
      method: 'POST',
      body: JSON.stringify({ reportIdA, reportIdB }),
    }),

  generateCaseSummary: (caseId: string) =>
    request<AiCaseSummaryResult>('/api/ai/case-summary', {
      method: 'POST',
      body: JSON.stringify({ caseId }),
    }),

  getLocationIntelligence: (params: {
    caseId: string;
    locationName: string;
    latitude?: number;
    longitude?: number;
  }) =>
    request<LocationIntelligenceResult>('/api/ai/location-intelligence', {
      method: 'POST',
      body: JSON.stringify(params),
    }),


  // System & Analytics
  getAnalytics: () =>
    request<{
      activeCases: number;
      urgentCases: number;
      resolvedCases: number;
      totalCases: number;
      pendingReviewReports: number;
      verifiedSightings: number;
      unverifiedSightings: number;
      totalSightings: number;
      openTasks: number;
      urgentTasks: number;
      totalTasks: number;
    }>('/api/analytics'),

  getAuditLogs: (params?: { resourceType?: string; result?: string }) => {
    const q = new URLSearchParams();
    if (params?.resourceType) q.append('resourceType', params.resourceType);
    if (params?.result) q.append('result', params.result);
    return request<{ total: number; logs: AuditLog[] }>(`/api/audit-logs?${q.toString()}`);
  },

  getNotifications: () =>
    request<{ unreadCount: number; notifications: NotificationItem[] }>('/api/notifications'),

  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/api/notifications/${id}/read`, { method: 'POST' }),

  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/api/notifications/read-all', { method: 'POST' }),

  getUsers: () =>
    request<{ users: User[] }>('/api/users'),

  // Location & Geospatial Intelligence
  getLocationConfig: () =>
    request<{
      hasMapsKey: boolean;
      apiKey: string;
      defaultCenter: { lat: number; lng: number };
      defaultZoom: number;
    }>('/api/location/config'),

  getCaseLocations: (
    caseId: string,
    params?: { status?: string; from?: string; to?: string }
  ) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.from) q.append('from', params.from);
    if (params?.to) q.append('to', params.to);
    const qs = q.toString();
    return request<{ caseId: string; total: number; locations: CaseLocationItem[] }>(
      `/api/cases/${caseId}/locations${qs ? `?${qs}` : ''}`
    );
  },

  getCaseMapBundle: (caseId: string) =>
    request<{
      caseId: string;
      title: string;
      personName: string;
      photoUrl: string;
      status: string;
      priority: string;
      lastKnownLocation: string;
      lastKnownCoordinates: { lat: number; lng: number };
      dateMissing: string;
      timeMissing: string;
      locations: CaseLocationItem[];
      timeline: TimelineEvent[];
      bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
      stats: {
        totalLocations: number;
        verifiedCount: number;
        underReviewCount: number;
        unverifiedCount: number;
      };
    }>(`/api/cases/${caseId}/map`),

  calculateDistance: (params: {
    originLatitude: number;
    originLongitude: number;
    destinationLatitude: number;
    destinationLongitude: number;
    originLabel?: string;
    destinationLabel?: string;
  }) => {
    const q = new URLSearchParams({
      originLatitude: String(params.originLatitude),
      originLongitude: String(params.originLongitude),
      destinationLatitude: String(params.destinationLatitude),
      destinationLongitude: String(params.destinationLongitude),
    });
    if (params.originLabel) q.append('originLabel', params.originLabel);
    if (params.destinationLabel) q.append('destinationLabel', params.destinationLabel);
    return request<DistanceCalculationResult>(`/api/location/distance?${q.toString()}`);
  },

  updateCurrentLocation: (params: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    address?: string;
  }) =>
    request<{ success: boolean; message: string; location: UserCurrentLocation }>(
      '/api/location/current',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    ),

  getCurrentLocation: () =>
    request<UserCurrentLocation>('/api/location/current'),
};

