export type UserRole =
  | 'SUPER_ADMIN'
  | 'CASE_OFFICER'
  | 'VERIFICATION_OFFICER'
  | 'HOSPITAL_SHELTER'
  | 'CITIZEN';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  agency: string;
  badgeNumber?: string;
  avatar?: string;
}

export type CaseStatus =
  | 'Draft'
  | 'Active'
  | 'Under Investigation'
  | 'Person Located'
  | 'Resolved'
  | 'Closed'
  | 'Archived';

export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface StatusHistoryEntry {
  fromStatus: CaseStatus;
  toStatus: CaseStatus;
  changedBy: string;
  changedById: string;
  timestamp: string;
  reason: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PersonProfile {
  fullName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Non-Binary' | 'Unknown';
  photoUrl: string;
  height: string; // e.g. "5'9\" (175 cm)"
  physicalDescription: string;
  identifyingMarks: string; // scars, tattoos, birthmarks
  clothingDescription: string;
  languages: string[];
  medicalConditions?: string;
  lastKnownLocation: string;
  lastKnownCoordinates: Coordinates;
  lastKnownActivity: string;
  circumstances: string;
  reportingPersonName: string;
  reportingPersonContact: string;
  reportingPersonRelationship: string;
  dateMissing: string;
  timeMissing: string;
}

export interface Case {
  id: string; // MP-2026-XXXXXX
  title: string;
  status: CaseStatus;
  priority: PriorityLevel;
  person: PersonProfile;
  assignedOfficerId: string;
  assignedOfficerName: string;
  leadAgency: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryEntry[];
  summary?: string;
  internalNotes?: string;
  isArchived: boolean;
}

export type ReportStatus =
  | 'New'
  | 'Under Review'
  | 'Verified'
  | 'Rejected'
  | 'Duplicate'
  | 'Needs More Information';

export type ReporterType =
  | 'Citizen'
  | 'Police'
  | 'Hospital'
  | 'Shelter'
  | 'Field Team'
  | 'Family';

export interface FileAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  thumbnailUrl?: string;
  uploadedBy: string;
  uploadedAt: string;
  relatedCaseId: string;
  relatedReportId?: string;
  verificationStatus: 'Unverified' | 'Verified' | 'Flagged';
}

export interface Report {
  id: string; // REP-2026-XXXXXX
  caseId: string;
  caseTitle?: string;
  reporterId?: string;
  reporterType: ReporterType;
  reporterName: string;
  reporterContact?: string;
  description: string;
  date: string;
  time: string;
  location: string;
  latitude: number;
  longitude: number;
  uploadedFiles: FileAttachment[];
  source: string;
  verificationStatus: ReportStatus;
  assignedReviewerId?: string;
  assignedReviewerName?: string;
  verificationNotes?: string;
  duplicateOfReportId?: string;
  confidenceScore?: number; // AI score suggestion 0-100
  createdAt: string;
  updatedAt: string;
}

export interface Sighting {
  id: string; // SGT-2026-XXXXXX
  caseId: string;
  caseTitle?: string;
  reportId?: string;
  date: string;
  time: string;
  location: string;
  latitude: number;
  longitude: number;
  description: string;
  reporterName: string;
  reporterContact?: string;
  photoUrl?: string;
  source: string;
  verificationStatus: 'Verified' | 'Unverified' | 'Under Review' | 'Rejected';
  reviewerId?: string;
  reviewerName?: string;
  notes?: string;
  createdAt: string;
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';

export interface InvestigationTask {
  id: string; // TSK-2026-XXXXXX
  caseId: string;
  caseTitle?: string;
  title: string;
  description: string;
  assignedOfficerId: string;
  assignedOfficerName: string;
  priority: PriorityLevel;
  dueDate: string;
  status: TaskStatus;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  eventType:
    | 'CASE_CREATED'
    | 'STATUS_CHANGE'
    | 'REPORT_SUBMITTED'
    | 'SIGHTING_LOGGED'
    | 'PHOTO_UPLOADED'
    | 'VERIFICATION_ACTION'
    | 'TASK_ASSIGNED'
    | 'TASK_COMPLETED'
    | 'INTERNAL_NOTE';
  title: string;
  description: string;
  timestamp: string;
  user: string;
  source: string;
  statusBadge?: string;
  referenceId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  resourceType: 'CASE' | 'REPORT' | 'SIGHTING' | 'TASK' | 'AUTH' | 'USER' | 'FILE' | 'SYSTEM';
  resourceId: string;
  details: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  ipAddress?: string;
}

export interface NotificationItem {
  id: string;
  recipientRole?: UserRole | 'ALL';
  recipientUserId?: string;
  title: string;
  message: string;
  type: 'INFO' | 'ALERT' | 'VERIFICATION' | 'TASK';
  caseId?: string;
  reportId?: string;
  read: boolean;
  createdAt: string;
}

export interface AiMatchAnalysis {
  matchConfidence: 'High' | 'Moderate' | 'Low' | 'Inconclusive';
  similarityPercentage: number;
  matchedFeatures: string[];
  divergentFeatures: string[];
  reasoning: string;
  humanReviewDisclaimer: string;
}

export interface AiDuplicateAnalysis {
  isPotentialDuplicate: boolean;
  confidenceScore: number;
  matchingPoints: string[];
  differingPoints: string[];
  recommendation: string;
  humanReviewDisclaimer: string;
}

export interface AiCaseSummaryResult {
  summary: string;
  totalReportsCount: number;
  verifiedSightingsCount: number;
  pendingReviewCount: number;
  latestVerifiedLocation?: string;
  criticalLeads: string[];
  disclaimer: string;
}

export interface LocationIntelligenceResult {
  locationName: string;
  coordinates: { lat: number; lng: number };
  searchPerimeterRadiusKm: number;
  transitHubs: string[];
  medicalAndShelterPoints: string[];
  keyPerimeterRisks: string[];
  tacticalRecommendations: string[];
  groundingSources?: Array<{ title?: string; uri?: string }>;
  summary: string;
  disclaimer: string;
}


export type LocationType =
  | 'Last Known Location'
  | 'Reported Sighting'
  | 'Verified Sighting'
  | 'Search Location'
  | 'Hospital'
  | 'Shelter'
  | 'Investigation Location'
  | 'Current Authorised User Location'
  | 'Other Authorised Location';

export interface CaseLocationItem {
  id: string;
  caseId: string;
  reportId?: string;
  sightingId?: string;
  locationType: LocationType;
  latitude: number;
  longitude: number;
  locationName: string;
  address?: string;
  timestamp: string;
  source: string;
  verificationStatus?: 'Verified' | 'Unverified' | 'Under Review' | 'Rejected' | 'Duplicate';
  description?: string;
  confidenceScore?: number;
  photoUrl?: string;
  reporterName?: string;
}

export interface DistanceCalculationResult {
  origin: { lat: number; lng: number; label?: string };
  destination: { lat: number; lng: number; label?: string };
  straightLineDistanceMeters: number;
  straightLineDistanceKm: number;
  straightLineDistanceText: string;
  roadDistanceMeters?: number;
  roadDistanceKm?: number;
  roadDistanceText?: string;
  estimatedTravelTime?: string;
  isRoutingAvailable: boolean;
  hasRoadData: boolean;
  directionsUrl?: string;
  calculatedAt: string;
}

export interface UserCurrentLocation {
  userId: string;
  userRole: UserRole;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  address?: string;
  updatedAt: string;
}

// ----------------------------------------------------
// NEW INVESTIGATION WORKSPACE EXTENSIONS
// ----------------------------------------------------

export type LeadStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'UNDER_INVESTIGATION'
  | 'WAITING_FOR_RESPONSE'
  | 'VERIFIED'
  | 'NOT_USEFUL'
  | 'CLOSED';

export type LeadPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Lead {
  id: string; // LED-2026-XXXXXX
  caseId: string;
  caseTitle?: string;
  title: string;
  description: string;
  source: string;
  priority: LeadPriority;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  createdAt: string;
  dueDate?: string;
  status: LeadStatus;
  evidence?: string[];
  result?: string;
  notes?: string;
  updatedAt: string;
}

export type MissingInfoStatus =
  | 'Required'
  | 'Optional'
  | 'Collected'
  | 'Unavailable'
  | 'NotApplicable';

export interface MissingInfoItem {
  id: string;
  category: string;
  label: string;
  status: MissingInfoStatus;
  notes?: string;
}

export interface CaseCompleteness {
  personDetailsPercent: number;
  reportInfoPercent: number;
  locationDataPercent: number;
  verificationPercent: number;
  tasksPercent: number;
  overallPercent: number;
  missingItems: MissingInfoItem[];
}

export interface PriorityReason {
  code: string;
  label: string;
  impact: 'High' | 'Medium' | 'Low';
}

export interface CasePriorityDetails {
  calculatedPriority: PriorityLevel;
  currentPriority: PriorityLevel;
  isManualOverride: boolean;
  overrideReason?: string;
  overrideBy?: string;
  overrideAt?: string;
  reasons: PriorityReason[];
}

export interface ChangeItem {
  id: string;
  type: 'REPORT' | 'SIGHTING' | 'VERIFICATION' | 'TASK' | 'LEAD' | 'PHOTO' | 'STATUS_CHANGE';
  title: string;
  description: string;
  timestamp: string;
  caseId?: string;
  recordId?: string;
}

export interface WhatChangedSummary {
  sinceTimestamp: string;
  newReportsCount: number;
  newSightingsCount: number;
  verifiedSightingsCount: number;
  rejectedReportsCount: number;
  completedTasksCount: number;
  newPhotographsCount: number;
  statusChangesCount: number;
  newLeadsCount: number;
  items: ChangeItem[];
}

export interface ConflictItem {
  id: string;
  caseId: string;
  category: 'Clothing' | 'Age' | 'Time' | 'Location' | 'Vehicle' | 'Physical Description' | 'Direction' | 'Other';
  conflictingValues: { reportId?: string; source: string; value: string; timestamp: string }[];
  status: 'UNRESOLVED' | 'REVIEWED' | 'DISMISSED';
  resolutionNotes?: string;
}

export interface AiNextActionSuggestion {
  id: string;
  caseId: string;
  actionTitle: string;
  description: string;
  whySuggested: string;
  priority: PriorityLevel;
  status: 'PENDING' | 'ACCEPTED' | 'DISMISSED';
  relatedLeadId?: string;
  relatedTaskId?: string;
}

export interface PotentialRelatedCase {
  id: string;
  caseId: string;
  targetCaseId: string;
  targetCaseTitle: string;
  targetPersonName: string;
  similarityScore: number;
  matchingReasons: string[];
  status: 'PENDING' | 'REVIEWED' | 'DISMISSED';
}

export interface EvidenceAuditEntry {
  action: 'UPLOADED' | 'VIEWED' | 'MODIFIED' | 'VERIFIED' | 'FLAGGED';
  performedBy: string;
  performedById: string;
  role: UserRole;
  timestamp: string;
  notes?: string;
}

export interface CaseClosureChecklist {
  identityConfirmed: boolean;
  leadsReviewed: boolean;
  tasksReviewed: boolean;
  evidenceUpdated: boolean;
  notesCompleted: boolean;
  followupsCompleted: boolean;
  closureReason: string;
  closedBy?: string;
  closedAt?: string;
  finalReportGenerated: boolean;
}


