import { describe, it, expect, beforeAll } from 'vitest';
import { NoticeStore } from '../src/db/store';
import { extractNoticeEvents } from '../src/lib/extractor';
import { detectConflicts } from '../src/lib/conflict-engine';
import { generateICalendar } from '../src/lib/ics-exporter';

describe('Notice Decoder Full-Stack Integration Suite', () => {
  beforeAll(async () => {
    // Seed ground truth demonstration dataset
    await NoticeStore.seedDemoData();
  });

  it('persists and retrieves the PS-02 demonstration notice', async () => {
    const notice = await NoticeStore.getNoticeById('demo-notice-ps02');
    expect(notice).not.toBeNull();
    expect(notice?.id).toBe('demo-notice-ps02');
    expect(notice?.title).toContain('III-Year CSE');
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
    expect(icsContent).toContain('PRODID:-//Byte_Brains//Notice Decoder v1.0//EN');
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
