import { ExtractedEvent, ConflictRecord } from '../types';

/**
 * Utility to convert date string (YYYY-MM-DD) and time string (HH:mm)
 * to epoch milliseconds in UTC or given timezone offset.
 */
export function parseDateTimeToEpoch(dateStr: string, timeStr: string, _tz = 'UTC'): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);

  if (
    isNaN(year) || isNaN(month) || isNaN(day) ||
    isNaN(hours) || isNaN(minutes) ||
    hours < 0 || hours > 23 || minutes < 0 || minutes > 59
  ) {
    throw new Error(`Invalid date/time format: date="${dateStr}", time="${timeStr}"`);
  }

  // Construct UTC timestamp
  return Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
}

/**
 * Formats epoch milliseconds back to 12-hour or 24-hour time representation
 */
export function formatEpochToTimeString(epochMs: number): string {
  const d = new Date(epochMs);
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function format12Hour(timeStr: string | null): string {
  if (!timeStr) return 'Unspecified';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr.padStart(2, '0');
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${period}`;
}

export interface NormalizedInterval {
  event: ExtractedEvent;
  startEpoch: number;
  endEpoch: number;
  isOvernight: boolean;
  isValid: boolean;
  validationError?: string;
}

export interface NormalizedDeadline {
  event: ExtractedEvent;
  deadlineEpoch: number;
  isValid: boolean;
  validationError?: string;
}

/**
 * Normalizes an ExtractedEvent into an interval [start, end)
 */
export function normalizeEventInterval(event: ExtractedEvent): NormalizedInterval {
  if (!event.date) {
    return {
      event,
      startEpoch: 0,
      endEpoch: 0,
      isOvernight: false,
      isValid: false,
      validationError: 'Event missing required date',
    };
  }

  if (!event.startTime) {
    return {
      event,
      startEpoch: 0,
      endEpoch: 0,
      isOvernight: false,
      isValid: false,
      validationError: 'Event missing start time; duration cannot be inferred',
    };
  }

  if (!event.endTime) {
    return {
      event,
      startEpoch: 0,
      endEpoch: 0,
      isOvernight: false,
      isValid: false,
      validationError: 'Event missing end time; duration cannot be silently assumed',
    };
  }

  try {
    let startEpoch = parseDateTimeToEpoch(event.date, event.startTime, event.timezone);
    let endEpoch = parseDateTimeToEpoch(event.date, event.endTime, event.timezone);
    let isOvernight = false;

    // Check for overnight event: e.g. 23:00 to 02:00
    if (endEpoch < startEpoch) {
      // Add 24 hours (86,400,000 ms)
      endEpoch += 24 * 60 * 60 * 1000;
      isOvernight = true;
    } else if (endEpoch === startEpoch) {
      return {
        event,
        startEpoch,
        endEpoch,
        isOvernight: false,
        isValid: false,
        validationError: 'Event start time cannot be identical to end time for timed events (zero duration)',
      };
    }

    return {
      event,
      startEpoch,
      endEpoch,
      isOvernight,
      isValid: true,
    };
  } catch (err: any) {
    return {
      event,
      startEpoch: 0,
      endEpoch: 0,
      isOvernight: false,
      isValid: false,
      validationError: err.message || 'Failed to parse timestamps',
    };
  }
}

/**
 * Normalizes a point-in-time deadline
 */
export function normalizeDeadlinePoint(event: ExtractedEvent): NormalizedDeadline {
  if (!event.date) {
    return {
      event,
      deadlineEpoch: 0,
      isValid: false,
      validationError: 'Deadline missing required date',
    };
  }

  const time = event.deadlineTime || event.startTime;
  if (!time) {
    return {
      event,
      deadlineEpoch: 0,
      isValid: false,
      validationError: 'Deadline missing time; cannot evaluate as a specific instant',
    };
  }

  try {
    const deadlineEpoch = parseDateTimeToEpoch(event.date, time, event.timezone);
    return {
      event,
      deadlineEpoch,
      isValid: true,
    };
  } catch (err: any) {
    return {
      event,
      deadlineEpoch: 0,
      isValid: false,
      validationError: err.message || 'Failed to parse deadline time',
    };
  }
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  hardOverlapsCount: number;
  deadlineWarningsCount: number;
  conflicts: ConflictRecord[];
  reviewNeededEvents: { event: ExtractedEvent; reason: string }[];
}

/**
 * Deterministic Conflict Detection Engine
 * 
 * Implements half-open intervals [start, end)
 * Interval overlap rule: A.start < B.end AND B.start < A.end
 * Overlap window: [max(A.start, B.start), min(A.end, B.end))
 * 
 * Deadline rule: Point D in [E.start, E.end) <=> E.start <= D < E.end
 */
export function detectConflicts(events: ExtractedEvent[]): ConflictDetectionResult {
  const conflicts: ConflictRecord[] = [];
  const reviewNeededEvents: { event: ExtractedEvent; reason: string }[] = [];

  const timedIntervals: NormalizedInterval[] = [];
  const deadlines: NormalizedDeadline[] = [];

  // 1. Separate and normalize inputs
  for (const ev of events) {
    if (ev.kind === 'deadline_point') {
      const norm = normalizeDeadlinePoint(ev);
      if (norm.isValid) {
        deadlines.push(norm);
      } else {
        reviewNeededEvents.push({ event: ev, reason: norm.validationError! });
      }
    } else {
      const norm = normalizeEventInterval(ev);
      if (norm.isValid) {
        timedIntervals.push(norm);
      } else {
        reviewNeededEvents.push({ event: ev, reason: norm.validationError! });
      }
    }
  }

  // 2. Check pairwise timed event overlaps: A vs B
  for (let i = 0; i < timedIntervals.length; i++) {
    for (let j = i + 1; j < timedIntervals.length; j++) {
      const A = timedIntervals[i];
      const B = timedIntervals[j];

      // Interval overlap check: A.start < B.end AND B.start < A.end
      const overlapStart = Math.max(A.startEpoch, B.startEpoch);
      const overlapEnd = Math.min(A.endEpoch, B.endEpoch);

      // In half-open intervals [start, end), an overlap exists strictly when overlapStart < overlapEnd
      if (overlapStart < overlapEnd) {
        const durationMinutes = Math.round((overlapEnd - overlapStart) / (1000 * 60));
        const startTimeStr = format12Hour(formatEpochToTimeString(overlapStart));
        const endTimeStr = format12Hour(formatEpochToTimeString(overlapEnd));

        const timeRangeA = `${format12Hour(A.event.startTime)}–${format12Hour(A.event.endTime)}`;
        const timeRangeB = `${format12Hour(B.event.startTime)}–${format12Hour(B.event.endTime)}`;

        conflicts.push({
          id: `conflict-${A.event.id || i}-${B.event.id || j}`,
          type: 'HARD_OVERLAP',
          severity: 'critical',
          eventA: A.event,
          eventB: B.event,
          overlapStart: formatEpochToTimeString(overlapStart),
          overlapEnd: formatEpochToTimeString(overlapEnd),
          overlapMinutes: durationMinutes,
          explanation: `"${A.event.title}" (${timeRangeA}) overlaps with "${B.event.title}" (${timeRangeB}) from ${startTimeStr} to ${endTimeStr} (${durationMinutes} minutes).`,
          mathProof: `[${A.event.startTime}, ${A.event.endTime}) ∩ [${B.event.startTime}, ${B.event.endTime}) = [${formatEpochToTimeString(overlapStart)}, ${formatEpochToTimeString(overlapEnd)}) (overlap length: ${durationMinutes}m)`,
          suggestedAction: `Check if you must attend both or request attendance accommodation. Both events occupy physical/virtual space simultaneously.`,
        });
      }
    }
  }

  // 3. Check deadlines against timed events: D in [E.start, E.end)
  for (const dl of deadlines) {
    for (const ev of timedIntervals) {
      const D = dl.deadlineEpoch;
      // Half open interval [E.start, E.end): E.start <= D < E.end
      if (ev.startEpoch <= D && D < ev.endEpoch) {
        const deadlineTimeStr = format12Hour(formatEpochToTimeString(D));
        const eventRange = `${format12Hour(ev.event.startTime)}–${format12Hour(ev.event.endTime)}`;

        conflicts.push({
          id: `deadline-warning-${dl.event.id}-${ev.event.id}`,
          type: 'DEADLINE_DURING_EVENT',
          severity: 'warning',
          eventA: ev.event,
          eventB: dl.event,
          overlapStart: formatEpochToTimeString(D),
          overlapEnd: formatEpochToTimeString(D),
          overlapMinutes: 0,
          explanation: `Deadline "${dl.event.title}" at ${deadlineTimeStr} occurs during "${ev.event.title}" (${eventRange}).`,
          mathProof: `${ev.event.startTime} <= ${formatEpochToTimeString(D)} < ${ev.event.endTime}`,
          suggestedAction: `Submit or complete "${dl.event.title}" BEFORE entering "${ev.event.title}", or arrange an earlier submission time.`,
        });
      }
    }
  }

  const hardOverlapsCount = conflicts.filter(c => c.type === 'HARD_OVERLAP').length;
  const deadlineWarningsCount = conflicts.filter(c => c.type === 'DEADLINE_DURING_EVENT').length;

  return {
    hasConflicts: conflicts.length > 0,
    hardOverlapsCount,
    deadlineWarningsCount,
    conflicts,
    reviewNeededEvents,
  };
}
