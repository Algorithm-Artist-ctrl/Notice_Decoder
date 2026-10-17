import { z } from 'zod';

export type DocumentDomain = 
  | 'education' 
  | 'business' 
  | 'government' 
  | 'finance' 
  | 'healthcare' 
  | 'events' 
  | 'legal' 
  | 'general';

export type AnalysisCase = 'A' | 'B' | 'C' | 'D' | 'E';

export type DocumentType = 
  | 'academic_schedule' 
  | 'office_communication' 
  | 'meeting_minutes' 
  | 'event_conference' 
  | 'job_recruitment' 
  | 'government_public' 
  | 'financial_notice'
  | 'healthcare_advisory'
  | 'legal_regulatory'
  | 'general_advisory' 
  | 'other';

export type EventCategory = 
  | 'exam' 
  | 'lecture' 
  | 'deadline' 
  | 'workshop' 
  | 'meeting' 
  | 'submission'
  | 'holiday' 
  | 'job_interview'
  | 'conference'
  | 'public_filing'
  | 'hearing'
  | 'appointment'
  | 'payment_due'
  | 'renewal'
  | 'task'
  | 'other';

export type EventKind = 'timed_event' | 'deadline_point' | 'action_task' | 'info_point';

export type ConflictSeverity = 'critical' | 'warning' | 'clean';

export type ConflictType = 
  | 'HARD_OVERLAP'            // A.start < B.end AND B.start < A.end
  | 'DEADLINE_DURING_EVENT'   // E.start <= D < E.end
  | 'NONE';

export interface BoundingBox {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedEvent {
  id: string;
  noticeId?: string;
  userId?: string;
  title: string;
  category: EventCategory;
  kind: EventKind;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:mm (24-hour)
  endTime: string | null;   // HH:mm (24-hour)
  deadlineTime: string | null; // HH:mm if point in time
  venue: string | null;
  departmentOrAudience: string | null;
  sourceNoticeRef?: string;
  sourceTextEvidence: string;
  sourceBoundingBox?: BoundingBox;
  confidence: number; // 0.0 to 1.0
  reviewRequired: boolean;
  reviewReasons: string[];
  isConfirmed: boolean;
  timezone: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConflictRecord {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  eventA: ExtractedEvent;
  eventB: ExtractedEvent; // In DEADLINE_DURING_EVENT, eventB is the deadline
  overlapStart: string; // ISO or HH:mm
  overlapEnd: string;   // ISO or HH:mm
  overlapMinutes: number;
  explanation: string;
  mathProof: string;
  suggestedAction: string;
}

export interface RequiredActionItem {
  task: string;
  dueDate?: string;
  status?: string;
  action?: string;
  assigneeOrTarget?: string;
  deadline?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface DocumentAnalysisResult {
  documentType: DocumentType;
  documentDomain?: DocumentDomain;
  analysisCase?: AnalysisCase;
  documentTitle: string;
  summary: string;
  keyInformation: string[];
  directives?: string[];
  requiredActions?: RequiredActionItem[];
  contactsOrReferences?: string[];
  isInformationalOnly?: boolean;
  hasActionableDates: boolean;
  extractedItems: ExtractedEvent[];
}

export interface UserPreferences {
  userId: string;
  timezone: string;
  reminderLeadTimeMinutes: number;
  notificationPreferences: {
    email: boolean;
    calendar: boolean;
    push: boolean;
  };
  updatedAt?: string;
}

export type DocumentLifecycleStatus = 
  | 'pending' 
  | 'uploaded' 
  | 'processing' 
  | 'extracted' 
  | 'review_required' 
  | 'confirmed' 
  | 'failed';

export interface NoticeRecord {
  id: string;
  userId?: string;
  title: string;
  documentType?: DocumentType;
  documentDomain?: DocumentDomain;
  analysisCase?: AnalysisCase;
  summary?: string;
  keyInformation?: string[];
  directives?: string[];
  requiredActions?: RequiredActionItem[];
  contactsOrReferences?: string[];
  actionableItemsCount?: number;
  rawText: string;
  fileName?: string;
  fileType: 'pdf' | 'image' | 'text';
  fileSize?: number;
  storagePath?: string;
  status: DocumentLifecycleStatus;
  errorMessage?: string;
  extractedEventsCount: number;
  conflictsCount: number;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Zod schemas for runtime request validation
export const ExtractedEventSchema = z.object({
  id: z.string().optional(),
  noticeId: z.string().optional(),
  title: z.string().min(1, 'Event title is required'),
  category: z.enum([
    'exam', 'lecture', 'deadline', 'workshop', 'meeting', 'submission', 
    'holiday', 'job_interview', 'conference', 'public_filing', 'hearing',
    'appointment', 'payment_due', 'renewal', 'task', 'other'
  ]),
  kind: z.enum(['timed_event', 'deadline_point', 'action_task', 'info_point']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be HH:mm').nullable(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be HH:mm').nullable(),
  deadlineTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Deadline time must be HH:mm').nullable(),
  venue: z.string().nullable().optional(),
  departmentOrAudience: z.string().nullable().optional(),
  sourceTextEvidence: z.string().min(1, 'Source evidence must be present'),
  confidence: z.number().min(0).max(1),
  reviewRequired: z.boolean(),
  reviewReasons: z.array(z.string()),
  isConfirmed: z.boolean(),
  timezone: z.string().default('Asia/Kolkata'),
});

export const UpdateEventPayloadSchema = ExtractedEventSchema.partial().required({
  title: true,
  date: true,
});

export const NoticeUploadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  text: z.string().max(100000).optional(),
  isDemo: z.boolean().optional(),
});

