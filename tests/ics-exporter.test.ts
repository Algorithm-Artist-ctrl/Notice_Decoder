import { describe, it, expect } from 'vitest';
import { generateICalendar, escapeICalText } from '../src/lib/ics-exporter';
import { ExtractedEvent } from '../src/types';

describe('RFC 5545 iCalendar (.ics) Generator', () => {
  const sampleEvents: ExtractedEvent[] = [
    {
      id: 'ev-test',
      title: 'Internal Test 2, CSE Dept',
      category: 'exam',
      kind: 'timed_event',
      date: '2026-11-13',
      startTime: '10:00',
      endTime: '11:30',
      deadlineTime: null,
      venue: 'Room 204; Block B',
      departmentOrAudience: 'III-year CSE',
      sourceTextEvidence: 'Internal Test 2 will be held on 13 Nov 2026',
      confidence: 0.98,
      reviewRequired: false,
      reviewReasons: [],
      isConfirmed: true,
      timezone: 'Asia/Kolkata',
    },
    {
      id: 'ev-deadline',
      title: 'Lab Record Submission Deadline',
      category: 'deadline',
      kind: 'deadline_point',
      date: '2026-11-13',
      startTime: '12:00',
      endTime: null,
      deadlineTime: '12:00',
      venue: 'Department Office',
      departmentOrAudience: 'III-year CSE',
      sourceTextEvidence: 'Lab records must be submitted by 12:00 noon',
      confidence: 0.95,
      reviewRequired: false,
      reviewReasons: [],
      isConfirmed: true,
      timezone: 'Asia/Kolkata',
    },
    {
      id: 'ev-unconfirmed',
      title: 'Unconfirmed Tentative Seminar',
      category: 'lecture',
      kind: 'timed_event',
      date: '2026-11-14',
      startTime: '14:00',
      endTime: '15:00',
      deadlineTime: null,
      venue: 'Auditorium',
      departmentOrAudience: null,
      sourceTextEvidence: 'Tentative seminar',
      confidence: 0.5,
      reviewRequired: true,
      reviewReasons: ['Uncertain venue'],
      isConfirmed: false, // NOT confirmed!
      timezone: 'Asia/Kolkata',
    },
  ];

  it('escapes special characters per RFC 5545', () => {
    expect(escapeICalText('Room 204; Block B, Floor 2')).toBe('Room 204\\; Block B\\, Floor 2');
    expect(escapeICalText('Line 1\nLine 2')).toBe('Line 1\\nLine 2');
    expect(escapeICalText('Path\\To\\Folder')).toBe('Path\\\\To\\\\Folder');
  });

  it('generates valid RFC 5545 headers and structure', () => {
    const ics = generateICalendar(sampleEvents);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//Notice Decoder//Academic Schedule v1.0//EN');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('exports only confirmed events and ignores unconfirmed candidates', () => {
    const ics = generateICalendar(sampleEvents);
    expect(ics).toContain('SUMMARY:Internal Test 2\\, CSE Dept');
    expect(ics).toContain('SUMMARY:[DEADLINE] Lab Record Submission Deadline');
    expect(ics).not.toContain('Unconfirmed Tentative Seminar');
  });

  it('formats timed events with correct start and end UTC timestamps', () => {
    const ics = generateICalendar(sampleEvents);
    expect(ics).toContain('DTSTART:20261113T100000Z');
    expect(ics).toContain('DTEND:20261113T113000Z');
    expect(ics).toContain('LOCATION:Room 204\\; Block B');
  });

  it('formats deadline points with point timestamp and VALARM trigger', () => {
    const ics = generateICalendar(sampleEvents);
    expect(ics).toContain('DTSTART:20261113T120000Z');
    expect(ics).toContain('DTEND:20261113T120000Z');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-PT1H');
    expect(ics).toContain('END:VALARM');
  });

  it('throws an error if no confirmed events exist', () => {
    const unconfirmedOnly = sampleEvents.filter(e => !e.isConfirmed);
    expect(() => generateICalendar(unconfirmedOnly)).toThrow('No confirmed events available');
  });
});
