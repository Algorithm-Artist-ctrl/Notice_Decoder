import { z } from 'zod';

export type EventCategory = 
  | 'exam' 
  | 'lecture' 
  | 'deadline' 
  | 'workshop' 
  | 'meeting' 
  | 'submission'
  | 'holiday' 
  | 'other';

export type EventKind = 'timed_event' | 'deadline_point';

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

export interface NoticeRecord {
  id: string;
  title: string;
  rawText: string;
  fileName?: string;
  fileType: 'pdf' | 'image' | 'text';
  fileSize?: number;
  status: 'pending' | 'processing' | 'extracted' | 'confirmed' | 'failed';
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
  category: z.enum(['exam', 'lecture', 'deadline', 'workshop', 'meeting', 'submission', 'holiday', 'other']),
  kind: z.enum(['timed_event', 'deadline_point']),
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
