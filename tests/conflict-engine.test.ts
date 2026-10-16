import { describe, it, expect } from 'vitest';
import { detectConflicts, parseDateTimeToEpoch } from '../src/lib/conflict-engine';
import { ExtractedEvent } from '../src/types';

describe('Deterministic Conflict Engine [Half-Open Interval Rules]', () => {
  const baseEvent = (overrides: Partial<ExtractedEvent>): ExtractedEvent => ({
    id: 'ev-1',
    title: 'Sample Event',
    category: 'lecture',
    kind: 'timed_event',
    date: '2026-11-13',
    startTime: '10:00',
    endTime: '11:30',
    deadlineTime: null,
    venue: 'Room 204',
    departmentOrAudience: 'CSE',
    sourceTextEvidence: 'Sample text evidence',
    confidence: 0.95,
    reviewRequired: false,
    reviewReasons: [],
    isConfirmed: true,
    timezone: 'Asia/Kolkata',
    ...overrides,
  });

  // Test 1: Identical intervals
  it('1. detects hard overlap for identical intervals', () => {
    const e1 = baseEvent({ id: 'e1', title: 'Session A', startTime: '10:00', endTime: '11:30' });
    const e2 = baseEvent({ id: 'e2', title: 'Session B', startTime: '10:00', endTime: '11:30' });

    const result = detectConflicts([e1, e2]);
    expect(result.hasConflicts).toBe(true);
    expect(result.hardOverlapsCount).toBe(1);
    expect(result.conflicts[0].overlapMinutes).toBe(90);
    expect(result.conflicts[0].overlapStart).toBe('10:00');
    expect(result.conflicts[0].overlapEnd).toBe('11:30');
  });

  // Test 2: Partial overlap
  it('2. detects partial overlap with precision (30 min overlap)', () => {
    const testEvent = baseEvent({
      id: 'test-2',
      title: 'Internal Test 2',
      category: 'exam',
      startTime: '10:00',
      endTime: '11:30',
      venue: 'Room 204',
    });

    const lectureEvent = baseEvent({
      id: 'lecture-1',
      title: 'Guest Lecture — AI in Healthcare',
      category: 'lecture',
      startTime: '11:00',
      endTime: '12:30',
      venue: 'Seminar Hall',
    });

    const result = detectConflicts([testEvent, lectureEvent]);
    expect(result.hasConflicts).toBe(true);
    expect(result.hardOverlapsCount).toBe(1);
    expect(result.conflicts[0].overlapMinutes).toBe(30);
    expect(result.conflicts[0].overlapStart).toBe('11:00');
    expect(result.conflicts[0].overlapEnd).toBe('11:30');
  });

  // Test 3: Complete containment
  it('3. detects complete containment where one event is entirely inside another', () => {
    const parentEvent = baseEvent({ id: 'parent', title: 'Full Day Workshop', startTime: '09:00', endTime: '17:00' });
    const childEvent = baseEvent({ id: 'child', title: 'Keynote Speech', startTime: '10:00', endTime: '11:00' });

    const result = detectConflicts([parentEvent, childEvent]);
    expect(result.hasConflicts).toBe(true);
    expect(result.hardOverlapsCount).toBe(1);
    expect(result.conflicts[0].overlapMinutes).toBe(60);
    expect(result.conflicts[0].overlapStart).toBe('10:00');
    expect(result.conflicts[0].overlapEnd).toBe('11:00');
  });

  // Test 4: Adjacent intervals (Zero false positive!)
  it('4. DOES NOT flag adjacent intervals touching only at endpoints (e.g. 10:00-11:30 and 11:30-13:00)', () => {
    const morningClass = baseEvent({ id: 'm', title: 'Math Lecture', startTime: '10:00', endTime: '11:30' });
    const afternoonLab = baseEvent({ id: 'a', title: 'Physics Lab', startTime: '11:30', endTime: '13:00' });

    const result = detectConflicts([morningClass, afternoonLab]);
    expect(result.hasConflicts).toBe(false);
    expect(result.hardOverlapsCount).toBe(0);
    expect(result.conflicts).toHaveLength(0);
  });

  // Test 5: Different dates
  it('5. ignores overlapping hours on different dates', () => {
    const day1 = baseEvent({ id: 'd1', date: '2026-11-13', startTime: '10:00', endTime: '11:30' });
    const day2 = baseEvent({ id: 'd2', date: '2026-11-14', startTime: '10:00', endTime: '11:30' });

    const result = detectConflicts([day1, day2]);
    expect(result.hasConflicts).toBe(false);
    expect(result.conflicts).toHaveLength(0);
  });

  // Test 6: Missing end times
  it('6. flags events with missing end times as requiring review and does not invent duration', () => {
    const incompleteEvent = baseEvent({ id: 'inc', title: 'Assembly', startTime: '09:00', endTime: null });
    const normalEvent = baseEvent({ id: 'norm', startTime: '09:30', endTime: '10:30' });

    const result = detectConflicts([incompleteEvent, normalEvent]);
    expect(result.reviewNeededEvents.length).toBeGreaterThan(0);
    expect(result.reviewNeededEvents[0].reason).toContain('missing end time');
    // Cannot assume overlap without user review
    expect(result.hardOverlapsCount).toBe(0);
  });

  // Test 7: Ambiguous times
  it('7. flags malformed or ambiguous times for review', () => {
    const invalidTimeEvent = baseEvent({ id: 'bad-time', startTime: '25:70', endTime: '11:00' });
    const result = detectConflicts([invalidTimeEvent]);
    expect(result.reviewNeededEvents.length).toBe(1);
    expect(result.reviewNeededEvents[0].reason).toContain('Invalid date/time format');
  });

  // Test 8: Midnight crossings (overnight events)
  it('8. correctly calculates overlaps across midnight', () => {
    // Event A: 23:00 to 02:00 (+1 day)
    const nightShift = baseEvent({ id: 'overnight', startTime: '23:00', endTime: '02:00' });
    // Event B: 01:00 to 03:00 (+1 day, on next date relative to A start, or 01:30)
    // To represent relative overnight in normalized hours:
    // When end < start, normalized interval adds 24h to end.
    const earlyMorning = baseEvent({ id: 'early', startTime: '23:30', endTime: '00:30' });

    const result = detectConflicts([nightShift, earlyMorning]);
    expect(result.hasConflicts).toBe(true);
    expect(result.hardOverlapsCount).toBe(1);
    expect(result.conflicts[0].overlapMinutes).toBe(60); // 23:30 to 00:30 is 60m
  });

  // Test 9: Timezone normalization
  it('9. correctly converts dates and times to UTC epoch', () => {
    const epoch1 = parseDateTimeToEpoch('2026-11-13', '10:00', 'UTC');
    const epoch2 = parseDateTimeToEpoch('2026-11-13', '11:30', 'UTC');
    const diffMinutes = (epoch2 - epoch1) / (1000 * 60);
    expect(diffMinutes).toBe(90);
  });

  // Test 10: Deadline during an event
  it('10. detects deadline occurring during an event (12:00 noon inside 11:00-12:30 lecture)', () => {
    const lectureEvent = baseEvent({
      id: 'lecture-1',
      title: 'Guest Lecture — AI in Healthcare',
      startTime: '11:00',
      endTime: '12:30',
    });

    const deadlineEvent = baseEvent({
      id: 'deadline-1',
      title: 'Lab Record Submission Deadline',
      category: 'deadline',
      kind: 'deadline_point',
      startTime: '12:00',
      endTime: null,
      deadlineTime: '12:00',
    });

    const result = detectConflicts([lectureEvent, deadlineEvent]);
    expect(result.hasConflicts).toBe(true);
    expect(result.deadlineWarningsCount).toBe(1);
    expect(result.conflicts[0].type).toBe('DEADLINE_DURING_EVENT');
    expect(result.conflicts[0].severity).toBe('warning');
    expect(result.conflicts[0].explanation).toContain('12:00 PM occurs during "Guest Lecture');
  });

  // Test 11: Deadline at event endpoints
  it('11. handles deadline at event endpoints with half-open [start, end) rules', () => {
    const lecture = baseEvent({ id: 'lec', startTime: '11:00', endTime: '12:30' });
    
    // Deadline exactly at end: 12:30
    // Half-open rule: 11:00 <= D < 12:30. Since D = 12:30, it is NOT < 12:30 -> NO clash!
    const deadlineAtEnd = baseEvent({
      id: 'dl-end',
      kind: 'deadline_point',
      category: 'deadline',
      startTime: '12:30',
      deadlineTime: '12:30',
    });

    const result1 = detectConflicts([lecture, deadlineAtEnd]);
    expect(result1.deadlineWarningsCount).toBe(0);

    // Deadline exactly at start: 11:00
    // Half-open rule: 11:00 <= 11:00 < 12:30 -> True -> CLASH!
    const deadlineAtStart = baseEvent({
      id: 'dl-start',
      kind: 'deadline_point',
      category: 'deadline',
      startTime: '11:00',
      deadlineTime: '11:00',
    });

    const result2 = detectConflicts([lecture, deadlineAtStart]);
    expect(result2.deadlineWarningsCount).toBe(1);
  });

  // Test 12: Invalid start/end combinations (zero duration)
  it('12. flags invalid start/end combinations such as start === end', () => {
    const zeroDurationEvent = baseEvent({ id: 'zero', startTime: '10:00', endTime: '10:00' });
    const result = detectConflicts([zeroDurationEvent]);
    expect(result.reviewNeededEvents.length).toBe(1);
    expect(result.reviewNeededEvents[0].reason).toContain('zero duration');
  });
});
