import fs from 'fs';
import path from 'path';
import { NoticeRecord, ExtractedEvent, ConflictRecord } from '../types';
import { detectConflicts } from '../lib/conflict-engine';
import { getNeonClient } from './connection';

interface LocalStoreData {
  notices: NoticeRecord[];
  events: ExtractedEvent[];
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
    const initial: LocalStoreData = { notices: [], events: [] };
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    } catch {}
    return initial;
  }
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    const initial: LocalStoreData = { notices: [], events: [] };
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

/**
 * Notice & Event Data Access Layer with direct Neon PostgreSQL persistence
 */
export class NoticeStore {
  /**
   * Saves a new notice
   */
  static async saveNotice(notice: NoticeRecord): Promise<NoticeRecord> {
    const neon = getNeonClient();
    if (neon) {
      try {
        await neon`
          INSERT INTO notices (
            id, user_id, title, raw_text, file_name, file_type, file_size, status, error_message, is_demo, created_at, updated_at
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
            ${notice.createdAt}, 
            ${notice.updatedAt}
          )
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            status = EXCLUDED.status,
            error_message = EXCLUDED.error_message,
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

    // Mirror to local store for offline/test reliability when not in strict production
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
   * Retrieves notices with user isolation:
   * - Authenticated user: returns their notices + sample demo notices
   * - Anonymous user: returns ONLY sample demo notices
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
            WHERE n.user_id = ${userId} OR n.is_demo = TRUE
            GROUP BY n.id
            ORDER BY n.created_at DESC;
          `;
        } else {
          // Anonymous visitor: ONLY sample demo notices
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

        const notices: NoticeRecord[] = [];
        for (const r of rows) {
          notices.push({
            id: String(r.id),
            userId: r.user_id ? String(r.user_id) : undefined,
            title: String(r.title),
            rawText: String(r.raw_text),
            fileName: r.file_name ? String(r.file_name) : undefined,
            fileType: r.file_type,
            fileSize: r.file_size ? Number(r.file_size) : undefined,
            status: r.status,
            errorMessage: r.error_message ? String(r.error_message) : undefined,
            extractedEventsCount: Number(r.extracted_events_count) || 0,
            conflictsCount: 0,
            isDemo: Boolean(r.is_demo),
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
          });
        }
        return notices;
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
      filtered = filtered.filter(n => n.userId === userId || n.isDemo);
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

          // Enforce ownership: reject if private and doesn't belong to current user
          if (!isDemo && (!userId || recordUserId !== userId)) {
            return null;
          }

          const events = await this.getEventsByNoticeId(id, userId);
          return {
            id: String(r.id),
            userId: recordUserId,
            title: String(r.title),
            rawText: String(r.raw_text),
            fileName: r.file_name ? String(r.file_name) : undefined,
            fileType: r.file_type,
            fileSize: r.file_size ? Number(r.file_size) : undefined,
            status: r.status,
            errorMessage: r.error_message ? String(r.error_message) : undefined,
            extractedEventsCount: events.length,
            conflictsCount: 0,
            isDemo,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
            updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
          };
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

    const notices = await this.listNotices(userId);
    return notices.find(n => n.id === id) || null;
  }

  /**
   * Deletes notice and associated events
   */
  static async deleteNotice(id: string, userId?: string): Promise<boolean> {
    const neon = getNeonClient();
    if (neon) {
      try {
        // Verify ownership and forbid deleting sample demo notices
        const check = await neon`SELECT user_id, is_demo FROM notices WHERE id = ${id} LIMIT 1;`;
        if (check.length === 0) return false;

        const row = check[0];
        if (row.is_demo) {
          return false; // Cannot delete public demo notices
        }
        if (!userId || (row.user_id && row.user_id !== userId)) {
          return false; // Unauthorized
        }

        await neon`DELETE FROM events WHERE notice_id = ${id};`;
        await neon`DELETE FROM notices WHERE id = ${id};`;
        return true;
      } catch (e: any) {
        console.error('Neon deleteNotice failed:', e);
        if (isProduction) {
          throw new Error(`Database delete failed: ${e.message}`);
        }
      }
    } else if (isProduction) {
      throw new Error('Neon database is required in production environment.');
    }

    const data = ensureDataFile();
    const notice = data.notices.find(n => n.id === id);
    if (!notice || notice.isDemo) return false;
    if (userId && notice.userId && notice.userId !== userId) return false;

    data.notices = data.notices.filter(n => n.id !== id);
    data.events = data.events.filter(e => e.noticeId !== id);
    writeDataFile(data);
    return true;
  }

  /**
   * Saves or updates events for a notice in Neon PostgreSQL
   */
  static async saveEvents(events: ExtractedEvent[], userId?: string): Promise<ExtractedEvent[]> {
    if (events.length === 0) return [];

    const neon = getNeonClient();
    if (neon) {
      try {
        for (const ev of events) {
          const ownerId = ev.userId || userId || null;
          await neon`
            INSERT INTO events (
              id, notice_id, user_id, title, category, kind, date, start_time, end_time, deadline_time, 
              venue, department_or_audience, source_text_evidence, confidence, 
              review_required, review_reasons, is_confirmed, timezone
            )
            VALUES (
              ${ev.id},
              ${ev.noticeId || null},
              ${ownerId},
              ${ev.title},
              ${ev.category},
              ${ev.kind},
              ${ev.date},
              ${ev.startTime || null},
              ${ev.endTime || null},
              ${ev.deadlineTime || null},
              ${ev.venue || null},
              ${ev.departmentOrAudience || null},
              ${ev.sourceTextEvidence},
              ${ev.confidence},
              ${ev.reviewRequired},
              ${JSON.stringify(ev.reviewReasons || [])}::jsonb,
              ${ev.isConfirmed},
              ${ev.timezone || 'Asia/Kolkata'}
            )
            ON CONFLICT (id) DO UPDATE SET
              title = EXCLUDED.title,
              category = EXCLUDED.category,
              kind = EXCLUDED.kind,
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
   * Retrieves all confirmed events (for master schedule and .ics export)
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
            WHERE is_confirmed = true AND (user_id = ${userId} OR notice_id = 'demo-notice-ps02')
            ORDER BY date ASC, start_time ASC;
          `;
        } else {
          // Anonymous visitor: ONLY sample demo confirmed events
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
      events = events.filter(e => e.userId === userId || e.noticeId === 'demo-notice-ps02');
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
   * Seeds clearly labeled Sample Demonstration Data
   */
  static async seedDemoData(): Promise<void> {
    const demoNoticeId = 'demo-notice-ps02';
    const demoNotice: NoticeRecord = {
      id: demoNoticeId,
      title: '[Sample] Academic Schedule & Lab Circular (November 2026)',
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
