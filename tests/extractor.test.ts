import { describe, it, expect } from 'vitest';
import { extractNoticeEvents, normalizeTimeString, normalizeDateString } from '../src/lib/extractor';

describe('Document & Notice Entity Extractor', () => {
  const sampleNoticeText = `All III-year CSE students: Internal Test 2 will be held on 13 Nov 2026 from 10:00 AM to 11:30 AM in Room 204. Lab records must be submitted to the department office by 12:00 noon on 13 Nov. A guest lecture on “AI in Healthcare” is scheduled on 13 Nov, 11:00 AM to 12:30 PM, Seminar Hall.`;

  it('normalizes time strings correctly', () => {
    expect(normalizeTimeString('10:00 AM')).toBe('10:00');
    expect(normalizeTimeString('11:30 AM')).toBe('11:30');
    expect(normalizeTimeString('12:00 noon')).toBe('12:00');
    expect(normalizeTimeString('12 noon')).toBe('12:00');
    expect(normalizeTimeString('12:30 PM')).toBe('12:30');
    expect(normalizeTimeString('2 PM')).toBe('14:00');
    expect(normalizeTimeString('14:00')).toBe('14:00');
  });

  it('normalizes dates correctly', () => {
    expect(normalizeDateString('13 Nov 2026').date).toBe('2026-11-13');
    expect(normalizeDateString('13 November 2026').date).toBe('2026-11-13');
    expect(normalizeDateString('2026-11-13').date).toBe('2026-11-13');
  });

  it('extracts all 3 events with 100% accuracy from standard academic circular', async () => {
    const events = await extractNoticeEvents(sampleNoticeText);
    expect(events.length).toBe(3);

    // Event 1: Internal Test 2
    const testEvent = events.find(e => e.category === 'exam');
    expect(testEvent).toBeDefined();
    expect(testEvent?.title).toContain('Internal Test 2');
    expect(testEvent?.date).toBe('2026-11-13');
    expect(testEvent?.startTime).toBe('10:00');
    expect(testEvent?.endTime).toBe('11:30');
    expect(testEvent?.venue).toContain('Room 204');
    expect(testEvent?.sourceTextEvidence).toContain('Internal Test 2 will be held');

    // Event 2: Lab record deadline
    const deadlineEvent = events.find(e => e.kind === 'deadline_point');
    expect(deadlineEvent).toBeDefined();
    expect(deadlineEvent?.title).toContain('Lab Record');
    expect(deadlineEvent?.date).toBe('2026-11-13');
    expect(deadlineEvent?.deadlineTime).toBe('12:00');
    expect(deadlineEvent?.venue).toContain('office');
    expect(deadlineEvent?.sourceTextEvidence).toContain('submitted');

    // Event 3: Guest Lecture
    const lectureEvent = events.find(e => e.category === 'lecture');
    expect(lectureEvent).toBeDefined();
    expect(lectureEvent?.title).toContain('AI in Healthcare');
    expect(lectureEvent?.date).toBe('2026-11-13');
    expect(lectureEvent?.startTime).toBe('11:00');
    expect(lectureEvent?.endTime).toBe('12:30');
    expect(lectureEvent?.venue).toContain('Seminar Hall');
  });
});
