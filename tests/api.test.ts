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

describe('Authentication & User Isolation Suite', () => {
  const testEmailA = `student_a_${Date.now()}@example.com`;
  const testEmailB = `student_b_${Date.now()}@example.com`;
  const password = 'StrongPassword123!';
  let tokenA = '';
  let tokenB = '';
  let noticeAId = '';

  it('rejects registration with invalid email or weak password', async () => {
    const badEmailRes = await app.request('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'notanemail', password: '123' }),
    });
    expect(badEmailRes.status).toBe(400);

    const weakPassRes = await app.request('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'valid@example.com', password: 'short' }),
    });
    expect(weakPassRes.status).toBe(400);
  });

  it('registers User A and returns session token and user info', async () => {
    const res = await app.request('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailA, password, name: 'Student A' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeDefined();
    expect(body.user.email).toBe(testEmailA);
    tokenA = body.token;
  });

  it('rejects sign-in with incorrect password', async () => {
    const res = await app.request('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailA, password: 'WrongPassword999!' }),
    });
    expect(res.status).toBe(401);
  });

  it('signs in User A with valid credentials and recovers session', async () => {
    const res = await app.request('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailA, password }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.token).toBeDefined();
    tokenA = body.token;

    // Verify session
    const sessionRes = await app.request('/api/auth/session', {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    expect(sessionRes.status).toBe(200);
    const sessionBody = await sessionRes.json();
    expect(sessionBody.user).not.toBeNull();
    expect(sessionBody.user.email).toBe(testEmailA);
  });

  it('registers User B successfully', async () => {
    const res = await app.request('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmailB, password, name: 'Student B' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    tokenB = body.token;
  });

  it('enforces strict cross-user privacy: User B cannot view or delete User A notices', async () => {
    // 1. User A uploads a private notice
    const uploadRes = await app.request('/api/notices/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'User A Private Academic Notice',
        text: 'Private test for Student A on 10 Dec 2026 from 10:00 to 11:30 in Room 501.',
      }),
    });
    expect(uploadRes.status).toBe(200);
    const uploadBody = await uploadRes.json();
    noticeAId = uploadBody.data.notice.id;

    // 2. User A can see their notice in /api/notices
    const userANoticesRes = await app.request('/api/notices', {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const userANotices = await userANoticesRes.json();
    expect(userANotices.data.some((n: any) => n.id === noticeAId)).toBe(true);

    // 3. User B calling /api/notices CANNOT see User A private notice!
    const userBNoticesRes = await app.request('/api/notices', {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    const userBNotices = await userBNoticesRes.json();
    expect(userBNotices.data.some((n: any) => n.id === noticeAId)).toBe(false);

    // 4. User B requesting User A notice directly receives 404/unauthorized
    const crossGetRes = await app.request(`/api/notices/${noticeAId}`, {
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    expect(crossGetRes.status).toBe(404);

    // 5. User B trying to delete User A notice receives 403 Forbidden
    const crossDeleteRes = await app.request(`/api/notices/${noticeAId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    expect(crossDeleteRes.status).toBe(403);

    // 6. User A can successfully delete their own notice
    const ownDeleteRes = await app.request(`/api/notices/${noticeAId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    expect(ownDeleteRes.status).toBe(200);
  });

  it('signs out and invalidates session token', async () => {
    const signOutRes = await app.request('/api/auth/sign-out', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    expect(signOutRes.status).toBe(200);

    const sessionRes = await app.request('/api/auth/session', {
      headers: { 'Authorization': `Bearer ${tokenA}` },
    });
    const sessionBody = await sessionRes.json();
    expect(sessionBody.user).toBeNull();
  });

  it('guarantees anonymous users only see sample demo notices in /api/notices', async () => {
    // 1. Create a private notice for User B
    const bUpload = await app.request('/api/notices/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        title: 'User B Private Circular',
        text: 'Exam for Student B on 12 Dec 2026 from 09:00 to 12:00 in Room 101.',
      }),
    });
    expect(bUpload.status).toBe(200);
    const bNoticeId = (await bUpload.json()).data.notice.id;

    // 2. Anonymous request without Authorization header
    const anonRes = await app.request('/api/notices');
    expect(anonRes.status).toBe(200);
    const anonBody = await anonRes.json();
    
    // Every single notice returned to anonymous caller must be a demo notice!
    expect(anonBody.data.length).toBeGreaterThan(0);
    expect(anonBody.data.every((n: any) => n.isDemo === true)).toBe(true);
    expect(anonBody.data.some((n: any) => n.id === bNoticeId)).toBe(false);

    // Clean up
    await app.request(`/api/notices/${bNoticeId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
  });

  it('prevents deletion of public sample notices', async () => {
    const deleteDemoRes = await app.request('/api/notices/demo-notice-ps02', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}` },
    });
    expect(deleteDemoRes.status).toBe(403);
    const body = await deleteDemoRes.json();
    expect(body.error).toContain('sample notices cannot be deleted');
  });

  it('rejects files with invalid PDF magic bytes', async () => {
    const formData = new FormData();
    const fakePdf = new Blob(['NotARealPdfHeader12345'], { type: 'application/pdf' });
    formData.append('file', fakePdf, 'corrupted.pdf');

    const res = await app.request('/api/notices/upload', {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('does not match a valid PDF file signature');
  });
});

describe('Multi-Domain Document-to-Action & Preferences Suite', () => {
  it('processes corporate office memo and classifies document type with summary', async () => {
    const res = await app.request('/api/notices/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Executive All-Hands & Q4 Sync',
        text: 'To all staff: The Q4 Product Strategy All-Hands meeting is scheduled on 18 Nov 2026 from 10:00 to 11:30 in Boardroom A. Design system review is on 18 Nov from 11:00 to 12:00 in Room 2B. Final roadmap signoff deadline is 18 Nov at 17:00.',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.notice.documentType).toBeDefined();
    expect(body.data.notice.summary).toBeDefined();
    expect(body.data.notice.actionableItemsCount).toBeGreaterThan(0);
    expect(body.data.events.length).toBeGreaterThan(0);

    // Clean up
    await app.request(`/api/notices/${body.data.notice.id}`, { method: 'DELETE' });
  });

  it('supports zero-date reference documents without hallucinating events', async () => {
    const res = await app.request('/api/notices/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Corporate Security & Compliance Policy',
        text: 'POLICY DIRECTIVE: All employees must use multi-factor authentication. API keys and passwords must never be stored in plain text or public repositories. Security incidents must be reported immediately to security@company.internal.',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.notice.summary).toBeDefined();
    expect(body.data.notice.keyInformation).toBeDefined();
    expect(body.data.notice.keyInformation.length).toBeGreaterThan(0);
    // Has 0 events and does not crash or create hallucinated events
    expect(body.data.events.length).toBe(0);

    // Confirming a 0-event reference document should succeed
    const confirmRes = await app.request(`/api/notices/${body.data.notice.id}/confirm`, {
      method: 'POST',
    });
    expect(confirmRes.status).toBe(200);
    const confirmBody = await confirmRes.json();
    expect(confirmBody.success).toBe(true);

    // Clean up
    await app.request(`/api/notices/${body.data.notice.id}`, { method: 'DELETE' });
  });

  it('verifies that newly registered users get a clean, zero-fake empty state', async () => {
    const cleanUserEmail = `clean_user_${Date.now()}@example.com`;
    const signUpRes = await app.request('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanUserEmail, password: 'StrongPassword123!', name: 'Clean User' }),
    });
    const { token } = await signUpRes.json();

    // Authenticated user listing notices must see 0 notices (clean slate, no demo notices)
    const listRes = await app.request('/api/notices', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const listBody = await listRes.json();
    expect(listBody.success).toBe(true);
    expect(listBody.data).toEqual([]);

    // Schedule should also be empty
    const scheduleRes = await app.request('/api/schedule', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const scheduleBody = await scheduleRes.json();
    expect(scheduleBody.success).toBe(true);
    expect(scheduleBody.data).toEqual([]);
  });

  it('persists and retrieves user preferences in Neon PostgreSQL', async () => {
    const prefUserEmail = `pref_user_${Date.now()}@example.com`;
    const signUpRes = await app.request('/api/auth/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: prefUserEmail, password: 'StrongPassword123!', name: 'Pref User' }),
    });
    const { token } = await signUpRes.json();

    // Save preferences
    const updateRes = await app.request('/api/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        timezone: 'America/New_York',
        reminderLeadTimeMinutes: 60,
        notificationPreferences: { email: true, calendar: true, push: true },
      }),
    });
    expect(updateRes.status).toBe(200);
    const updateBody = await updateRes.json();
    expect(updateBody.success).toBe(true);
    expect(updateBody.data.timezone).toBe('America/New_York');
    expect(updateBody.data.reminderLeadTimeMinutes).toBe(60);

    // Retrieve preferences
    const getRes = await app.request('/api/preferences', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.success).toBe(true);
    expect(getBody.data.timezone).toBe('America/New_York');
    expect(getBody.data.reminderLeadTimeMinutes).toBe(60);
    expect(getBody.data.notificationPreferences.push).toBe(true);
  });
});




