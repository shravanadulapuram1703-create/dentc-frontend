// Pure slot-availability computation.
//
// This is the reference algorithm the backend AVAILABILITY endpoint (AN-2) must
// implement server-side. The local simulation calls it over a seeded office
// schedule; the real backend would call the same logic over real office/provider
// working hours (OfficeScheduleDayRead / ProviderScheduleDayRead — minus lunch,
// minus holidays) with the day's booked appointments subtracted.
//
// It is deliberately dependency-free and side-effect-free so both the client
// simulation and (as a spec) the server can share the exact same rules.

/** A working window for one day (HH:MM, 24h). */
export interface DayWindow {
  is_closed?: boolean;
  start_time: string; // "09:00"
  end_time: string; // "17:00"
  lunch_start?: string | null;
  lunch_end?: string | null;
}

/** An occupied range to subtract from availability (HH:MM). */
export interface BookedRange {
  start_time: string;
  end_time: string;
}

export interface ComputeSlotsInput {
  /** The day's open window, or null when there is none. */
  window: DayWindow | null;
  /** True when the date is a holiday → no availability. */
  holiday?: boolean;
  /** Already-booked ranges for the day. */
  booked: BookedRange[];
  /** Step between candidate start times (minutes). */
  slotIntervalMinutes: number;
  /** How long the requested appointment blocks the chair (minutes). */
  durationMinutes: number;
  /** Optional floor: drop candidates starting before this HH:MM (e.g. "now"). */
  minStartTime?: string | null;
}

/** "HH:MM" → minutes since midnight. Returns NaN on malformed input. */
export function toMinutes(hhmm: string | null | undefined): number {
  if (!hhmm) return NaN;
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** minutes since midnight → "HH:MM" (zero-padded). */
export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** The open sub-intervals of a day window, with the lunch break removed. */
function openIntervals(window: DayWindow): Array<[number, number]> {
  const start = toMinutes(window.start_time);
  const end = toMinutes(window.end_time);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

  const lunchStart = toMinutes(window.lunch_start);
  const lunchEnd = toMinutes(window.lunch_end);
  const hasLunch =
    Number.isFinite(lunchStart) &&
    Number.isFinite(lunchEnd) &&
    lunchEnd > lunchStart &&
    lunchStart >= start &&
    lunchEnd <= end;

  if (!hasLunch) return [[start, end]];
  const intervals: Array<[number, number]> = [];
  if (lunchStart > start) intervals.push([start, lunchStart]);
  if (lunchEnd < end) intervals.push([lunchEnd, end]);
  return intervals;
}

/**
 * Compute the open, bookable start times for a day as HH:MM strings. A candidate
 * survives when [start, start+duration) fits fully inside an open interval and
 * overlaps none of the booked ranges (and starts no earlier than minStartTime).
 */
export function computeAvailableSlots(input: ComputeSlotsInput): string[] {
  const {
    window,
    holiday,
    booked,
    slotIntervalMinutes,
    durationMinutes,
    minStartTime,
  } = input;

  if (holiday || !window || window.is_closed) return [];
  if (slotIntervalMinutes <= 0 || durationMinutes <= 0) return [];

  const floor = minStartTime ? toMinutes(minStartTime) : NaN;
  const bookedMin = booked
    .map((b) => [toMinutes(b.start_time), toMinutes(b.end_time)] as const)
    .filter(([s, e]) => Number.isFinite(s) && Number.isFinite(e) && e > s);

  const out: string[] = [];
  for (const [openStart, openEnd] of openIntervals(window)) {
    for (let start = openStart; start + durationMinutes <= openEnd; start += slotIntervalMinutes) {
      const end = start + durationMinutes;
      if (Number.isFinite(floor) && start < floor) continue;
      const clash = bookedMin.some(([bs, be]) => overlaps(start, end, bs, be));
      if (!clash) out.push(fromMinutes(start));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Default office schedule for the client-side simulation
// ---------------------------------------------------------------------------

/**
 * A plausible default week the simulation uses when there is no real backend
 * schedule to read. Mon–Fri 09:00–17:00 (lunch 12:00–13:00), Sat 09:00–13:00,
 * Sun closed. `dayOfWeek` is 0=Sun … 6=Sat (JS `Date.getDay()`).
 */
export function defaultWindowForDay(dayOfWeek: number): DayWindow {
  if (dayOfWeek === 0) return { is_closed: true, start_time: "00:00", end_time: "00:00" };
  if (dayOfWeek === 6) return { start_time: "09:00", end_time: "13:00" };
  return {
    start_time: "09:00",
    end_time: "17:00",
    lunch_start: "12:00",
    lunch_end: "13:00",
  };
}
