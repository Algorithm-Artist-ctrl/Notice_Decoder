import fs from 'fs';
import path from 'path';
import { NoticeRecord, ExtractedEvent, ConflictRecord } from '../types';
import { detectConflicts } from '../lib/conflict-engine';
import { getNeonClient, getDatabaseStatus } from './connection';

interface LocalStoreData {
  notices: NoticeRecord[];
  events: ExtractedEvent[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'notices_store.json');

function ensureDataFile(): LocalStoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initial: LocalStoreData = { notices: [], events: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    const initial: LocalStoreData = { notices: [], events: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

function writeDataFile(data: LocalStoreData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Notice & Event Data Access Layer
 */
export class NoticeStore {
  /**
   * Saves a new notice
   */
  static async saveNotice(notice: NoticeRecord): Promise<NoticeRecord> {
    const neon = getNeonClient();
    if (neon) {
      await neon`
        INSERT INTO notices (id, title, raw_text, file_name, file_type, file_size, status, error_message, is_demo, created_at, updated_at)
        VALUES (
          ${notice.id}, 
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
          updated_at = EXCLUDED.updated_at;
      `;
    }

    // Always maintain local fallback store for seamless offline/dev resiliency
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
   * Retrieves all notices
   */
  static async listNotices(): Promise<NoticeRecord[]> {
    const neon = getNeonClient();
    if (neon) {
      try {
        const rows = await neon`
          SELECT n.*, 
                 COUNT(DISTINCT e.id)::int as extracted_events_count
          FROM notices n
          LEFT JOIN events e ON e.notice_id = n.id
          GROUP BY n.id
          ORDER BY n.created_at DESC;
        `;
        return rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          rawText: r.raw_text,
          fileName: r.file_name,
          fileType: r.file_type,
          fileSize: r.file_size,
          status: r.status,
          errorMessage: r.error_message,
          extractedEventsCount: r.extracted_events_count || 0,
          conflictsCount: 0,
          isDemo: r.is_demo,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      } catch (e) {
        console.warn('Neon query failed, using local store fallback:', e);
      }
    }

    const data = ensureDataFile();
    // Compute event counts
    return data.notices.map(n => {
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
   * Retrieves single notice by ID
   */
  static async getNoticeById(id: string): Promise<NoticeRecord | null> {
    const notices = await this.listNotices();
    return notices.find(n => n.id === id) || null;
  }

  /**
   * Deletes notice and associated events
   */
  static async deleteNotice(id: string): Promise<boolean> {
    const neon = getNeonClient();
    if (neon) {
      try {
        await neon`DELETE FROM notices WHERE id = ${id};`;
      } catch (e) {
        console.warn('Neon delete failed:', e);
      }
    }

    const data = ensureDataFile();
    data.notices = data.notices.filter(n => n.id !== id);
    data.events = data.events.filter(e => e.noticeId !== id);
    writeDataFile(data);
    return true;
  }

  /**
   * Saves or updates events for a notice
   */
  static async saveEvents(events: ExtractedEvent[]): Promise<ExtractedEvent[]> {
    if (events.length === 0) return [];

    const neon = getNeonClient();
    if (neon) {
      for (const ev of events) {
        try {
          await neon`
            INSERT INTO events (
              id, notice_id, title, category, kind, date, start_time, end_time, deadline_time, 
              venue, department_or_audience, source_text_evidence, confidence, 
              review_required, review_reasons, is_confirmed, timezone
            )
            VALUES (
              ${ev.id},
              ${ev.noticeId || null},
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
        } catch (e) {
          console.warn('Neon event insert failed:', e);
        }
      }
    }

    const data = ensureDataFile();
    for (const ev of events) {
      const idx = data.events.findIndex(e => e.id === ev.id);
      if (idx >= 0) {
        data.events[idx] = ev;
      } else {
        data.events.push(ev);
      }
    }
    writeDataFile(data);
    return events;
  }

  /**
   * Retrieves events for a specific notice
   */
  static async getEventsByNoticeId(noticeId: string): Promise<ExtractedEvent[]> {
    const data = ensureDataFile();
    return data.events.filter(e => e.noticeId === noticeId);
  }

  /**
   * Retrieves all confirmed events (for master schedule and .ics export)
   */
  static async getAllConfirmedEvents(): Promise<ExtractedEvent[]> {
    const data = ensureDataFile();
    return data.events.filter(e => e.isConfirmed);
  }

  /**
   * Updates an individual event field
   */
  static async updateEvent(id: string, updates: Partial<ExtractedEvent>): Promise<ExtractedEvent | null> {
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

    // Sync to Neon if connected
    await this.saveEvents([updated]);
    return updated;
  }

  /**
   * Runs conflict analysis across all confirmed events or a given notice's events
   */
  static async getConflictAnalysis(noticeId?: string): Promise<{
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
      ? await this.getEventsByNoticeId(noticeId) 
      : await this.getAllConfirmedEvents();

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
      conflictsCount: 2,
      isDemo: true,
      createdAt: '2026-10-15T10:00:00Z',
      updatedAt: '2026-10-15T10:05:00Z',
    };

    const demoEvents: ExtractedEvent[] = [
      {
        id: 'demo-ev-1',
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
        sourceBoundingBox: { page: 1, x: 42, y: 110, width: 480, height: 24 },
        confidence: 0.98,
        reviewRequired: false,
        reviewReasons: [],
        isConfirmed: true,
        timezone: 'Asia/Kolkata',
      },
      {
        id: 'demo-ev-2',
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
        sourceBoundingBox: { page: 1, x: 42, y: 140, width: 460, height: 24 },
        confidence: 0.96,
        reviewRequired: false,
        reviewReasons: [],
        isConfirmed: true,
        timezone: 'Asia/Kolkata',
      },
      {
        id: 'demo-ev-3',
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
        sourceBoundingBox: { page: 1, x: 42, y: 170, width: 495, height: 24 },
        confidence: 0.97,
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
