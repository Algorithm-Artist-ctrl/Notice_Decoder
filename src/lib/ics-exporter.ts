import { ExtractedEvent } from '../types';

/**
 * Escapes characters according to RFC 5545 Section 3.3.11:
 * - Backslash (\) -> \\
 * - Semicolon (;) -> \;
 * - Comma (,) -> \,
 * - Newline (\n) -> \n
 */
export function escapeICalText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Formats date and time into RFC 5545 UTC timestamp format: YYYYMMDDTHHMMSSZ
 */
export function formatToICalDateTime(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const [hours, minutes] = timeStr.split(':');

  const y = year.padStart(4, '0');
  const m = month.padStart(2, '0');
  const d = day.padStart(2, '0');
  const h = hours.padStart(2, '0');
  const min = minutes.padStart(2, '0');

  return `${y}${m}${d}T${h}${min}00Z`;
}

/**
 * Generates an RFC 5545 standard .ics file content from a list of confirmed events
 */
export function generateICalendar(events: ExtractedEvent[], calendarName = 'Notice Decoder Schedule'): string {
  // Only export confirmed events
  const validEvents = events.filter(e => e.isConfirmed && e.date);

  if (validEvents.length === 0) {
    throw new Error('No confirmed events available for calendar export');
  }

  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Notice Decoder//Academic Schedule v1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICalText(calendarName)}`,
    'X-WR-TIMEZONE:Asia/Kolkata',
  ];

  for (const ev of validEvents) {
    const uid = ev.id ? `notice-decoder-${ev.id}@noticedecoder.app` : `notice-decoder-${Math.random().toString(36).substring(2)}@noticedecoder.app`;
    const summary = escapeICalText(ev.title);
    const location = escapeICalText(ev.venue || 'Campus');
    
    let descriptionText = `Category: ${ev.category.toUpperCase()}\\nEvidence: ${ev.sourceTextEvidence}`;
    if (ev.departmentOrAudience) {
      descriptionText += `\\nAudience: ${ev.departmentOrAudience}`;
    }
    descriptionText += `\\nDecoded by Notice Decoder`;
    const description = escapeICalText(descriptionText);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);

    if (ev.kind === 'deadline_point') {
      const time = ev.deadlineTime || ev.startTime || '12:00';
      const dtStart = formatToICalDateTime(ev.date, time);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtStart}`);
      lines.push(`SUMMARY:[DEADLINE] ${summary}`);
      // Add VALARM for deadlines
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:Upcoming Deadline: ${summary}`);
      lines.push('TRIGGER:-PT1H'); // 1 hour reminder
      lines.push('END:VALARM');
    } else {
      const startTime = ev.startTime || '09:00';
      const endTime = ev.endTime || '10:00';
      const dtStart = formatToICalDateTime(ev.date, startTime);
      const dtEnd = formatToICalDateTime(ev.date, endTime);

      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${summary}`);
    }

    lines.push(`LOCATION:${location}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n') + '\r\n';
}

/**
 * Triggers a browser download of the generated .ics file
 */
export function downloadICalendarFile(icsContent: string, fileName = 'notice-decoder-schedule.ics'): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
