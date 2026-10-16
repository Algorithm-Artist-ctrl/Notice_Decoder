import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../server/index';
import { NoticeStore } from '../src/db/store';
import { extractNoticeEvents } from '../src/lib/extractor';
import { detectConflicts } from '../src/lib/conflict-engine';
import { generateICalendar } from '../src/lib/ics-exporter';

describe('Notice Decoder Full-Stack Integration Suite', () => {
  beforeAll(async () => {
    // Seed ground truth demonstration dataset
    await NoticeStore.seedDemoData();
  });

  it('persists and retrieves the sample academic notice', async () => {
    const notice = await NoticeStore.getNoticeById('demo-notice-ps02');
    expect(notice).not.toBeNull();
    expect(notice?.id).toBe('demo-notice-ps02');
    expect(notice?.title).toContain('Academic Schedule');
    expect(notice?.isDemo).toBe(true);
  });

  it('retrieves all 3 ground truth events associated with the demo notice', async () => {
    const events = await NoticeStore.getEventsByNoticeId('demo-notice-ps02');
    expect(events.length).toBe(3);

    const testEvent = events.find(e => e.title.includes('Internal Test'));
    const deadlineEvent = events.find(e => e.title.includes('Lab Record'));
    const lectureEvent = events.find(e => e.title.includes('Guest Lecture'));

    expect(testEvent).toBeDefined();
    expect(deadlineEvent).toBeDefined();
    expect(lectureEvent).toBeDefined();

    expect(testEvent?.startTime).toBe('10:00');
    expect(testEvent?.endTime).toBe('11:30');
    expect(lectureEvent?.startTime).toBe('11:00');
    expect(lectureEvent?.endTime).toBe('12:30');
    expect(deadlineEvent?.deadlineTime).toBe('12:00');
  });

  it('calculates reproducible conflicts: 1 hard overlap (30m) and 1 deadline warning', async () => {
    const analysis = await NoticeStore.getConflictAnalysis('demo-notice-ps02');
    expect(analysis.summary.hardOverlaps).toBe(1);
    expect(analysis.summary.deadlineWarnings).toBe(1);

    const overlap = analysis.conflicts.find(c => c.type === 'HARD_OVERLAP');
    expect(overlap).toBeDefined();
    expect(overlap?.overlapMinutes).toBe(30);
    expect(overlap?.overlapStart).toBe('11:00');
    expect(overlap?.overlapEnd).toBe('11:30');

    const deadlineWarning = analysis.conflicts.find(c => c.type === 'DEADLINE_DURING_EVENT');
    expect(deadlineWarning).toBeDefined();
    expect(deadlineWarning?.eventB.title).toContain('Lab Record');
  });

  it('exports RFC 5545 compliant .ics calendar file with standard attributes', async () => {
    const events = await NoticeStore.getAllConfirmedEvents();
    expect(events.length).toBeGreaterThan(0);

    const icsContent = generateICalendar(events);
    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('VERSION:2.0');
    expect(icsContent).toContain('PRODID:-//Notice Decoder//Academic Schedule v1.0//EN');
    expect(icsContent).toContain('SUMMARY:Internal Test 2');
    expect(icsContent).toContain('END:VCALENDAR');
  });

  it('updates an event and reflects changes in real-time conflict analysis', async () => {
    // If the lecture time is shifted to 14:00-15:30, all conflicts should resolve!
    const events = await NoticeStore.getEventsByNoticeId('demo-notice-ps02');
    const lecture = events.find(e => e.title.includes('Guest Lecture'))!;

    const updatedLecture = await NoticeStore.updateEvent(lecture.id, {
      startTime: '14:00',
      endTime: '15:30',
    });

    expect(updatedLecture?.startTime).toBe('14:00');

    const newAnalysis = await NoticeStore.getConflictAnalysis('demo-notice-ps02');
    // Overlap with 10:00-11:30 test is resolved!
    expect(newAnalysis.summary.hardOverlaps).toBe(0);
    // Deadline at 12:00 is also resolved because 12:00 is not in [14:00, 15:30)!
    expect(newAnalysis.summary.deadlineWarnings).toBe(0);

    // Reset back to original 11:00-12:30 for consistency
    await NoticeStore.updateEvent(lecture.id, {
      startTime: '11:00',
      endTime: '12:30',
    });
  });
});

describe('HTTP REST API Endpoints via Hono', () => {
  it('GET /api/health returns 200 with system diagnostics', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.app).toBe('Notice Decoder');
    expect(body.system).toBeDefined();
    expect(body.system.database).toBeDefined();
    expect(body.system.ocr.status).toBe('ready');
    expect(body.system.calendar.format).toContain('RFC 5545');
  });

  it('GET /api/neon/services returns status of Neon integrations', async () => {
    const res = await app.request('/api/neon/services');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.postgres).toBeDefined();
    expect(body.data.objectStorage).toBeDefined();
    expect(body.data.functions).toBeDefined();
  });

  it('POST /api/demo/seed reloads the sample ground-truth notice', async () => {
    const res = await app.request('/api/demo/seed', { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.notice.id).toBe('demo-notice-ps02');
    expect(body.data.events.length).toBe(3);
  });

  it('GET /api/notices lists saved notices', async () => {
    const res = await app.request('/api/notices');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/notices/:id retrieves a specific notice and its events', async () => {
    const res = await app.request('/api/notices/demo-notice-ps02');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.notice.id).toBe('demo-notice-ps02');
    expect(body.data.events.length).toBe(3);
  });

  it('GET /api/schedule returns confirmed events sorted chronologically', async () => {
    const res = await app.request('/api/schedule');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/conflicts computes schedule overlaps for notice', async () => {
    const res = await app.request('/api/conflicts?noticeId=demo-notice-ps02');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.hasConflicts).toBe(true);
    expect(body.data.summary.hardOverlaps).toBe(1);
  });

  it('POST /api/notices/upload processes text input and persists events', async () => {
    const res = await app.request('/api/notices/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Midterm Examination Schedule',
        text: 'Department of IT: Midterm Exam on 25 Nov 2026 from 09:00 to 11:00 in Room 101. Project Submission deadline is 25 Nov at 14:00.',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.notice.title).toBe('Midterm Examination Schedule');
    expect(body.data.events.length).toBe(2);

    // Clean up created notice
    const createdId = body.data.notice.id;
    await app.request(`/api/notices/${createdId}`, { method: 'DELETE' });
  });

  it('PATCH /api/events/:id updates event attributes', async () => {
    const events = await NoticeStore.getEventsByNoticeId('demo-notice-ps02');
    const target = events[0];

    const res = await app.request(`/api/events/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venue: 'Lab Complex 3' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.venue).toBe('Lab Complex 3');

    // Restore original venue
    await app.request(`/api/events/${target.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venue: target.venue }),
    });
  });

  it('POST /api/notices/:id/confirm marks all events as confirmed', async () => {
    const res = await app.request('/api/notices/demo-notice-ps02/confirm', { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.every((e: any) => e.isConfirmed === true)).toBe(true);
  });

  it('GET /api/calendar/export returns RFC 5545 iCalendar stream', async () => {
    const res = await app.request('/api/calendar/export');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/calendar');
    const text = await res.text();
    expect(text).toContain('BEGIN:VCALENDAR');
    expect(text).toContain('VERSION:2.0');
    expect(text).toContain('PRODID:-//Notice Decoder//Academic Schedule v1.0//EN');
  });
});

