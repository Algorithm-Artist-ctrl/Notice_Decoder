import fs from 'fs';
import path from 'path';
import { NoticeRecord, ExtractedEvent, ConflictRecord, UserPreferences, DocumentType } from '../types';
import { detectConflicts } from '../lib/conflict-engine';
import { getNeonClient } from './connection';

interface LocalStoreData {
  notices: NoticeRecord[];
  events: ExtractedEvent[];
  userPreferences?: Record<string, UserPreferences>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'notices_store.json');

const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

function ensureDataFile(): LocalStoreData {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initial: LocalStoreData = { notices: [], events: [], userPreferences: {} };
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    } catch {}
    return initial;
  }
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    const initial: LocalStoreData = { notices: [], events: [], userPreferences: {} };
    return initial;
  }
}

function writeDataFile(data: LocalStoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Local cache write warning (running in serverless/read-only container):', err);
  }
}

function mapRowToEvent(r: any): ExtractedEvent {
  return {
    id: String(r.id),
    noticeId: r.notice_id ? String(r.notice_id) : undefined,
    userId: r.user_id ? String(r.user_id) : undefined,
    title: String(r.title),
    category: r.category,
    kind: r.kind || 'timed_event',
    date: r.date_str || (r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date)),
    startTime: r.start_time || null,
    endTime: r.end_time || null,
    deadlineTime: r.deadline_time || null,
    venue: r.venue || null,
    departmentOrAudience: r.department_or_audience || null,
    sourceTextEvidence: String(r.source_text_evidence || ''),
    confidence: typeof r.confidence === 'number' ? r.confidence : parseFloat(r.confidence || '0.90'),
    reviewRequired: Boolean(r.review_required),
    reviewReasons: Array.isArray(r.review_reasons) ? r.review_reasons : (typeof r.review_reasons === 'string' ? JSON.parse(r.review_reasons) : []),
    isConfirmed: Boolean(r.is_confirmed),
    timezone: r.timezone || 'Asia/Kolkata',
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : undefined,
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
  };
}

function mapRowToNotice(r: any, eventCount = 0): NoticeRecord {
  return {
    id: String(r.id),
    userId: r.user_id ? String(r.user_id) : undefined,
    title: String(r.title),
    documentType: (r.document_type || 'general_advisory') as DocumentType,
    summary: r.summary ? String(r.summary) : undefined,
    keyInformation: Array.isArray(r.key_information)
      ? r.key_information
      : (typeof r.key_information === 'string' ? JSON.parse(r.key_information) : []),
    actionableItemsCount: Number(r.actionable_items_count) || eventCount,
    rawText: String(r.raw_text),
    fileName: r.file_name ? String(r.file_name) : undefined,
    fileType: r.file_type,
    fileSize: r.file_size ? Number(r.file_size) : undefined,
    storagePath: r.storage_path ? String(r.storage_path) : undefined,
    status: r.status,
    errorMessage: r.error_message ? String(r.error_message) : undefined,
    extractedEventsCount: Number(r.extracted_events_count) || eventCount,
    conflictsCount: 0,
    isDemo: Boolean(r.is_demo),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
  };
}

/**
 * Notice & Event Data Access Layer with direct Neon PostgreSQL persistence
 */
export class NoticeStore {
  /**
   * Saves a new notice / document record
   */
  static async saveNotice(notice: NoticeRecord): Promise<NoticeRecord> {
    const neon = getNeonClient();
    if (neon) {
      try {
        await neon`
          INSERT INTO notices (
            id, user_id, title, raw_text, file_name, file_type, file_size, status, error_message, is_demo, 
            document_type, summary, key_information, actionable_items_count, storage_path, created_at, updated_at
          ) VALUES (
            ${notice.id}, 
            ${notice.userId || null}, 
            ${notice.title}, 
            ${notice.rawText}, 
            ${notice.fileName || null}, 
            ${notice.fileType}, 
            ${notice.fileSize || null}, 
            ${notice.status}, 
            ${notice.errorMessage || null}, 
            ${Boolean(notice.isDemo)}, 
            ${notice.documentType || 'general_document'},
            ${notice.summary || null},
            ${JSON.stringify(notice.keyInformation || [])}::jsonb,
            ${notice.actionableItemsCount || 0},
            ${notice.storagePath || null},
            ${notice.createdAt}, 
            ${notice.updatedAt}
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            status = EXCLUDED.status,
            error_message = EXCLUDED.error_message,
            document_type = EXCLUDED.document_type,
            summary = EXCLUDED.summary,
            key_information = EXCLUDED.key_information,
            actionable_items_count = EXCLUDED.actionable_items_count,
            storage_path = EXCLUDED.storage_path,
            updated_at = EXCLUDED.updated_at;
        `;
        return notice;
      } catch (err: any) {
        console.error('Neon saveNotice failed:', err);
        if (isProduction) {
          throw new Error(`Database save failed: ${err.message}`);
        }
      }
    } else if (isProduction) {
      throw new Error('Neon database is required in production environment.');
    }

    const data = ensureDataFile();
    const idx = data.notices.findIndex(n => n.id === notice.id);
    if (idx >= 0) {
      data.notices[idx] = notice;
    } else {
      data.notices.unshift(notice);
    }
    writeDataFile(data);
    return notice;
  }

  /**
   * Retrieves notices with strict user isolation:
   * - Authenticated user: returns ONLY their owned notices (never mixes demo notices automatically)
   * - Anonymous user: returns ONLY public demo sandbox notices
   */
  static async listNotices(userId?: string): Promise<NoticeRecord[]> {
    const neon = getNeonClient();
    if (neon) {
      try {
        let rows: any[] = [];
        if (userId) {
          rows = await neon`
            SELECT n.*, 
                   COUNT(DISTINCT e.id)::int as extracted_events_count
            FROM notices n
            LEFT JOIN events e ON e.notice_id = n.id
            WHERE n.user_id = ${userId}
            GROUP BY n.id
            ORDER BY n.created_at DESC;
          `;
        } else {
          rows = await neon`
            SELECT n.*, 
                   COUNT(DISTINCT e.id)::int as extracted_events_count
            FROM notices n
            LEFT JOIN events e ON e.notice_id = n.id
            WHERE n.is_demo = TRUE
            GROUP BY n.id
            ORDER BY n.created_at DESC;
          `;
        }

        return rows.map(r => mapRowToNotice(r, Number(r.extracted_events_count) || 0));
      } catch (err: any) {
        console.error('Neon listNotices failed:', err);
        if (isProduction) {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    } else if (isProduction) {
      throw new Error('Neon database is required in production environment.');
    }

    const data = ensureDataFile();
    let filtered = data.notices;
    if (userId) {
      filtered = filtered.filter(n => n.userId === userId);
    } else {
      filtered = filtered.filter(n => n.isDemo);
    }

    return filtered.map(n => {
      const noticeEvents = data.events.filter(e => e.noticeId === n.id);
      const conflicts = detectConflicts(noticeEvents);
      return {
        ...n,
        extractedEventsCount: noticeEvents.length,
        conflictsCount: conflicts.conflicts.length,
      };
    });
  }

  /**
   * Retrieves single notice by ID with strict ownership check
   */
  static async getNoticeById(id: string, userId?: string): Promise<NoticeRecord | null> {
    const neon = getNeonClient();
    if (neon) {
      try {
        const rows = await neon`SELECT * FROM notices WHERE id = ${id} LIMIT 1;`;
        if (rows && rows.length > 0) {
          const r = rows[0];
          const recordUserId = r.user_id ? String(r.user_id) : undefined;
          const isDemo = Boolean(r.is_demo);
          // Enforce ownership:
          // - Private notice with owner: only that owner can access
          // - Anonymous upload: only accessible in anonymous session
          // - Demo notice: accessible to everyone
          if (!isDemo) {
            if (recordUserId) {
              if (recordUserId !== userId) return null;
            } else {
              if (userId) return null;
            }
          }

          const events = await this.getEventsByNoticeId(id, userId);
          return mapRowToNotice(r, events.length);
        }
        return null;
      } catch (err: any) {
        console.error('Neon getNoticeById failed:', err);
        if (isProduction) {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    } else if (isProduction) {
      throw new Error('Neon database is required in production environment.');
    }

    const data = ensureDataFile();
    const notice = data.notices.find(n => n.id === id);
    if (!notice) return null;

    if (!notice.isDemo) {
      if (notice.userId) {
        if (notice.userId !== userId) return null;
      } else {
        if (userId) return null;
      }
    }

    const noticeEvents = data.events.filter(e => e.noticeId === id);
    return {
      ...notice,
      extractedEventsCount: noticeEvents.length,
    };
  }

  /**
   * Deletes notice and associated events
   */
  static async deleteNotice(id: string, userId: string): Promise<boolean> {
    const neon = getNeonClient();
    if (neon) {
      try {
        const rows = await neon`SELECT user_id, is_demo FROM notices WHERE id = ${id} LIMIT 1;`;
        if (!rows || rows.length === 0) return false;

        const notice = rows[0];
        if (notice.is_demo) {
          return false; // Forbid deleting shared demo notice
        }
        if (notice.user_id !== userId) {
          return false; // Unauthorized
        }

        await neon`DELETE FROM events WHERE notice_id = ${id};`;
        await neon`DELETE FROM notices WHERE id = ${id};`;
        return true;
      } catch (err: any) {
        console.error('Neon deleteNotice failed:', err);
        if (isProduction) {
          throw new Error(`Database delete failed: ${err.message}`);
        }
      }
    } else if (isProduction) {
      throw new Error('Neon database is required in production environment.');
    }

    const data = ensureDataFile();
    const notice = data.notices.find(n => n.id === id);
    if (!notice) return false;
    if (notice.isDemo) return false;
    if (notice.userId !== userId) return false;

    data.notices = data.notices.filter(n => n.id !== id);
    data.events = data.events.filter(e => e.noticeId !== id);
    writeDataFile(data);
    return true;
  }

  /**
   * Saves a collection of extracted events
   */
  static async saveEvents(events: ExtractedEvent[], userId?: string): Promise<ExtractedEvent[]> {
    if (events.length === 0) return [];

    const neon = getNeonClient();
    if (neon) {
      try {
        for (const ev of events) {
          await neon`
            INSERT INTO events (
              id, notice_id, user_id, title, category, kind, item_type, date, 
              start_time, end_time, deadline_time, venue, department_or_audience, 
              source_text_evidence, confidence, review_required, review_reasons, 
              is_confirmed, timezone
            ) VALUES (
              ${ev.id},
              ${ev.noticeId || null},
              ${ev.userId || userId || null},
              ${ev.title},
              ${ev.category},
              ${ev.kind || 'timed_event'},
              ${ev.kind || 'timed_event'},
              ${ev.date},
              ${ev.startTime || null},
              ${ev.endTime || null},
              ${ev.deadlineTime || null},
              ${ev.venue || null},
              ${ev.departmentOrAudience || null},
              ${ev.sourceTextEvidence},
              ${ev.confidence || 0.90},
              ${ev.reviewRequired},
              ${JSON.stringify(ev.reviewReasons || [])}::jsonb,
              ${ev.isConfirmed},
              ${ev.timezone || 'Asia/Kolkata'}
            )
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              category = EXCLUDED.category,
              kind = EXCLUDED.kind,
              item_type = EXCLUDED.item_type,
              date = EXCLUDED.date,
              start_time = EXCLUDED.start_time,
              end_time = EXCLUDED.end_time,
              deadline_time = EXCLUDED.deadline_time,
              venue = EXCLUDED.venue,
              department_or_audience = EXCLUDED.department_or_audience,
              is_confirmed = EXCLUDED.is_confirmed,
              review_required = EXCLUDED.review_required,
              review_reasons = EXCLUDED.review_reasons,
              updated_at = CURRENT_TIMESTAMP;
          `;
        }
        return events;
      } catch (e: any) {
        console.error('Neon saveEvents failed:', e);
        if (isProduction) {
          throw new Error(`Database saveEvents failed: ${e.message}`);
        }
      }
    } else if (isProduction) {
      throw new Error('Neon database is required in production environment.');
    }

    const data = ensureDataFile();
    for (const ev of events) {
      const idx = data.events.findIndex(e => e.id === ev.id);
      if (idx >= 0) {
        data.events[idx] = { ...ev, userId: ev.userId || userId };
      } else {
        data.events.push({ ...ev, userId: ev.userId || userId });
      }
    }
    writeDataFile(data);
    return events;
  }

  /**
   * Retrieves events for a specific notice from Neon PostgreSQL
   */
  static async getEventsByNoticeId(noticeId: string, userId?: string): Promise<ExtractedEvent[]> {
    const neon = getNeonClient();
    if (neon) {
      try {
        const rows = await neon`
          SELECT id, notice_id, user_id, title, category, kind, date::text as date_str,
                 start_time, end_time, deadline_time, venue, department_or_audience,
                 source_text_evidence, confidence, review_required, review_reasons,
                 is_confirmed, timezone, created_at, updated_at
          FROM events
          WHERE notice_id = ${noticeId}
          ORDER BY date ASC, start_time ASC;
        `;
        return rows.map(mapRowToEvent);
      } catch (err: any) {
        console.error('Neon getEventsByNoticeId failed:', err);
        if (isProduction) {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    } else if (isProduction) {
      throw new Error('Neon database is required in production environment.');
    }

    const data = ensureDataFile();
    return data.events.filter(e => e.noticeId === noticeId);
  }

  /**
   * Retrieves all confirmed events:
   * - Authenticated: ONLY user's confirmed events
   * - Anonymous: ONLY demo notice events
   */
  static async getAllConfirmedEvents(userId?: string): Promise<ExtractedEvent[]> {
    const neon = getNeonClient();
    if (neon) {
      try {
        let rows: any[] = [];
        if (userId) {
          rows = await neon`
            SELECT id, notice_id, user_id, title, category, kind, date::text as date_str,
                   start_time, end_time, deadline_time, venue, department_or_audience,
                   source_text_evidence, confidence, review_required, review_reasons,
                   is_confirmed, timezone, created_at, updated_at
            FROM events
            WHERE is_confirmed = true AND user_id = ${userId}
            ORDER BY date ASC, start_time ASC;
          `;
        } else {
          rows = await neon`
            SELECT id, notice_id, user_id, title, category, kind, date::text as date_str,
                   start_time, end_time, deadline_time, venue, department_or_audience,
                   source_text_evidence, confidence, review_required, review_reasons,
                   is_confirmed, timezone, created_at, updated_at
            FROM events
            WHERE is_confirmed = true AND notice_id = 'demo-notice-ps02'
            ORDER BY date ASC, start_time ASC;
          `;
        }
        return rows.map(mapRowToEvent);
      } catch (err: any) {
        console.error('Neon getAllConfirmedEvents failed:', err);
        if (isProduction) {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    } else if (isProduction) {
      throw new Error('Neon database is required in production environment.');
    }

    const data = ensureDataFile();
    let events = data.events.filter(e => e.isConfirmed);
    if (userId) {
      events = events.filter(e => e.userId === userId);
    } else {
      events = events.filter(e => e.noticeId === 'demo-notice-ps02');
    }
    return events;
  }

  /**
   * Updates an individual event field in Neon and local store
   */
  static async updateEvent(id: string, updates: Partial<ExtractedEvent>, userId?: string): Promise<ExtractedEvent | null> {
    const neon = getNeonClient();
    if (neon) {
      try {
        const rows = await neon`
          SELECT id, notice_id, user_id, title, category, kind, date::text as date_str,
                 start_time, end_time, deadline_time, venue, department_or_audience,
                 source_text_evidence, confidence, review_required, review_reasons,
                 is_confirmed, timezone, created_at, updated_at
          FROM events
          WHERE id = ${id}
          LIMIT 1;
        `;
        if (rows && rows.length > 0) {
          const current = mapRowToEvent(rows[0]);
          if (userId && current.userId && current.userId !== userId && current.noticeId !== 'demo-notice-ps02') {
            return null; // unauthorized
          }

          const merged: ExtractedEvent = {
            ...current,
            ...updates,
            updatedAt: new Date().toISOString(),
          };

          await neon`
            UPDATE events SET
              title = ${merged.title},
              category = ${merged.category},
              kind = ${merged.kind},
              date = ${merged.date},
              start_time = ${merged.startTime || null},
              end_time = ${merged.endTime || null},
              deadline_time = ${merged.deadlineTime || null},
              venue = ${merged.venue || null},
              department_or_audience = ${merged.departmentOrAudience || null},
              is_confirmed = ${merged.isConfirmed},
              review_required = ${merged.reviewRequired},
              review_reasons = ${JSON.stringify(merged.reviewReasons || [])}::jsonb,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ${id};
          `;
          return merged;
        }
        return null;
      } catch (err: any) {
        console.error('Neon updateEvent failed:', err);
        if (isProduction) {
          throw new Error(`Database update failed: ${err.message}`);
        }
      }
    } else if (isProduction) {
      throw new Error('Neon database is required in production environment.');
    }

    const data = ensureDataFile();
    const idx = data.events.findIndex(e => e.id === id);
    if (idx === -1) return null;

    const updated: ExtractedEvent = {
      ...data.events[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    data.events[idx] = updated;
    writeDataFile(data);
    return updated;
  }

  /**
   * Runs conflict analysis across all confirmed events or a given notice's events
   */
  static async getConflictAnalysis(noticeId?: string, userId?: string): Promise<{
    events: ExtractedEvent[];
    conflicts: ConflictRecord[];
    hasConflicts: boolean;
    summary: {
      totalEvents: number;
      hardOverlaps: number;
      deadlineWarnings: number;
      cleanEvents: number;
    };
  }> {
    const events = noticeId 
      ? await this.getEventsByNoticeId(noticeId, userId) 
      : await this.getAllConfirmedEvents(userId);

    const analysis = detectConflicts(events);

    return {
      events,
      conflicts: analysis.conflicts,
      hasConflicts: analysis.hasConflicts,
      summary: {
        totalEvents: events.length,
        hardOverlaps: analysis.hardOverlapsCount,
        deadlineWarnings: analysis.deadlineWarningsCount,
        cleanEvents: Math.max(0, events.length - analysis.hardOverlapsCount * 2 - analysis.deadlineWarningsCount),
      },
    };
  }

  /**
   * Retrieves persistent user preferences from Neon PostgreSQL
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    const defaultPrefs: UserPreferences = {
      userId,
      timezone: 'Asia/Kolkata',
      reminderLeadTimeMinutes: 30,
      notificationPreferences: {
        email: false,
        calendar: true,
        push: false,
      },
    };

    const neon = getNeonClient();
    if (neon) {
      try {
        const rows = await neon`
          SELECT user_id, timezone, reminder_lead_time_minutes, notification_preferences, updated_at
          FROM user_preferences
          WHERE user_id = ${userId}
          LIMIT 1;
        `;
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            userId: String(r.user_id),
            timezone: r.timezone || 'Asia/Kolkata',
            reminderLeadTimeMinutes: Number(r.reminder_lead_time_minutes) || 30,
            notificationPreferences: typeof r.notification_preferences === 'string'
              ? JSON.parse(r.notification_preferences)
              : (r.notification_preferences || defaultPrefs.notificationPreferences),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
          };
        }
      } catch (err: any) {
        console.warn('Neon getUserPreferences warning:', err.message);
      }
    }

    const data = ensureDataFile();
    return data.userPreferences?.[userId] || defaultPrefs;
  }

  /**
   * Saves persistent user preferences to Neon PostgreSQL
   */
  static async saveUserPreferences(userId: string, prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getUserPreferences(userId);
    const merged: UserPreferences = {
      ...current,
      ...prefs,
      userId,
      updatedAt: new Date().toISOString(),
    };

    const neon = getNeonClient();
    if (neon) {
      try {
        await neon`
          INSERT INTO user_preferences (
            user_id, timezone, reminder_lead_time_minutes, notification_preferences, updated_at
          ) VALUES (
            ${userId},
            ${merged.timezone},
            ${merged.reminderLeadTimeMinutes},
            ${JSON.stringify(merged.notificationPreferences)}::jsonb,
            CURRENT_TIMESTAMP
          )
          ON CONFLICT (user_id) DO UPDATE SET
            timezone = EXCLUDED.timezone,
            reminder_lead_time_minutes = EXCLUDED.reminder_lead_time_minutes,
            notification_preferences = EXCLUDED.notification_preferences,
            updated_at = CURRENT_TIMESTAMP;
        `;
      } catch (err: any) {
        console.warn('Neon saveUserPreferences warning:', err.message);
      }
    }

    const data = ensureDataFile();
    if (!data.userPreferences) data.userPreferences = {};
    data.userPreferences[userId] = merged;
    writeDataFile(data);
    return merged;
  }

  /**
   * Seeds clearly labeled Sample Demonstration Data for optional demo mode
   */
  static async seedDemoData(): Promise<void> {
    const demoNoticeId = 'demo-notice-ps02';
    const demoNotice: NoticeRecord = {
      id: demoNoticeId,
      title: '[Sample] Academic Schedule & Lab Circular (November 2026)',
      documentType: 'academic_schedule',
      summary: 'Department circular announcing Internal Test 2, Lab Record submission deadline, and AI in Healthcare guest lecture.',
      keyInformation: [
        'Internal Test 2 is mandatory for all III-year CSE students.',
        'Lab record submission must be completed before 12:00 noon.',
        'Guest lecture will be conducted by visiting industry expert in Seminar Hall.'
      ],
      actionableItemsCount: 3,
      rawText: `All III-year CSE students: Internal Test 2 will be held on 13 Nov 2026 from 10:00 AM to 11:30 AM in Room 204. Lab records must be submitted to the department office by 12:00 noon on 13 Nov. A guest lecture on “AI in Healthcare” is scheduled on 13 Nov, 11:00 AM to 12:30 PM, Seminar Hall.`,
      fileName: 'Academic_Circular_Sample.pdf',
      fileType: 'pdf',
      fileSize: 42350,
      status: 'confirmed',
      extractedEventsCount: 3,
      conflictsCount: 0,
      isDemo: true,
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: new Date().toISOString(),
    };

    const neon = getNeonClient();
    if (neon) {
      try {
        await neon`DELETE FROM events WHERE notice_id = ${demoNoticeId};`;
      } catch (err: any) {
        console.warn('Neon clear demo events warning:', err.message);
      }
    }

    const data = ensureDataFile();
    data.events = data.events.filter(e => e.noticeId !== demoNoticeId);
    data.notices = data.notices.filter(n => n.id !== demoNoticeId);
    writeDataFile(data);

    const demoEvents: ExtractedEvent[] = [
      {
        id: 'ev-demo-1',
        noticeId: demoNoticeId,
        title: 'Internal Test 2',
        category: 'exam',
        kind: 'timed_event',
        date: '2026-11-13',
        startTime: '10:00',
        endTime: '11:30',
        deadlineTime: null,
        venue: 'Room 204',
        departmentOrAudience: 'III-year CSE',
        sourceTextEvidence: 'Internal Test 2 will be held on 13 Nov 2026 from 10:00 AM to 11:30 AM in Room 204.',
        confidence: 0.98,
        reviewRequired: false,
        reviewReasons: [],
        isConfirmed: true,
        timezone: 'Asia/Kolkata',
      },
      {
        id: 'ev-demo-2',
        noticeId: demoNoticeId,
        title: 'Guest Lecture: AI in Healthcare',
        category: 'lecture',
        kind: 'timed_event',
        date: '2026-11-13',
        startTime: '11:00',
        endTime: '12:30',
        deadlineTime: null,
        venue: 'Seminar Hall',
        departmentOrAudience: 'III-year CSE',
        sourceTextEvidence: 'A guest lecture on “AI in Healthcare” is scheduled on 13 Nov, 11:00 AM to 12:30 PM, Seminar Hall.',
        confidence: 0.95,
        reviewRequired: false,
        reviewReasons: [],
        isConfirmed: true,
        timezone: 'Asia/Kolkata',
      },
      {
        id: 'ev-demo-3',
        noticeId: demoNoticeId,
        title: 'Lab Record Submission Deadline',
        category: 'deadline',
        kind: 'deadline_point',
        date: '2026-11-13',
        startTime: '12:00',
        endTime: null,
        deadlineTime: '12:00',
        venue: 'Department Office',
        departmentOrAudience: 'III-year CSE',
        sourceTextEvidence: 'Lab records must be submitted to the department office by 12:00 noon on 13 Nov.',
        confidence: 0.96,
        reviewRequired: false,
        reviewReasons: [],
        isConfirmed: true,
        timezone: 'Asia/Kolkata',
      },
    ];

    await this.saveNotice(demoNotice);
    await this.saveEvents(demoEvents);
  }
}
