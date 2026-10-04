// Pure time-clock model: punch → hours, day/week bucketing, overtime and the
// hours report. No React, no network — unit-tested in __tests__/.
//
// Data shapes are the backend's snake_case `TimeClockEntryRead` (one row per
// shift: `clock_in` … `clock_out`, open while `clock_out` is null).
//
// Two clock semantics live in the same table (TC-BE-9):
//   - legacy rows (`legacy_id` set, migrated from Denticon) store the office's
//     WALL-CLOCK time with a `Z` suffix — "2023-12-08T09:25:00Z" means 9:25 AM
//     at the office, not 9:25 UTC;
//   - rows punched in DentC store a real UTC instant.
// Every display/bucketing helper therefore takes the entry's zone from
// `entryTimeZone()`: "UTC" for legacy rows (renders the stored wall clock
// unchanged), the office's IANA zone for new ones.
import type { TimeClockEntryRead } from "@/api/generated/model";
import { parseServerDateTime, US_DISPLAY_TIME_ZONE } from "@/utils/datetime";

export type TimeClockEntry = TimeClockEntryRead;

/** Zone that renders a legacy wall-clock row unchanged. */
export const LEGACY_WALL_CLOCK_ZONE = "UTC";

/**
 * An open punch older than this is a forgotten clock-out, not a running shift:
 * the user may clock in again and the row is flagged for a manager to fix.
 */
export const STALE_OPEN_HOURS = 20;

/** Shifts longer than this are flagged for review. */
export const LONG_SHIFT_HOURS = 16;

const MS_PER_HOUR = 3_600_000;

// ── Zones & formatting ──────────────────────────────────────────────────────

export function isLegacyEntry(entry: Pick<TimeClockEntry, "legacy_id">): boolean {
  return entry.legacy_id != null && entry.legacy_id !== "";
}

/** Zone to display / bucket an entry in (see the file header). */
export function entryTimeZone(
  entry: Pick<TimeClockEntry, "legacy_id" | "office_id">,
  zoneForOffice: (office_id: number) => string | null | undefined,
): string {
  if (isLegacyEntry(entry)) return LEGACY_WALL_CLOCK_ZONE;
  return (entry.office_id != null ? zoneForOffice(entry.office_id) : null) || US_DISPLAY_TIME_ZONE;
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>();

/** `YYYY-MM-DD` of `date` in `time_zone`. */
export function dayKey(date: Date, time_zone: string): string {
  let fmt = dayFormatters.get(time_zone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: time_zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    dayFormatters.set(time_zone, fmt);
  }
  return fmt.format(date);
}

/** "09:25 AM" in `time_zone`. */
export function formatClockTime(date: Date | null, time_zone: string): string {
  if (!date) return "—";
  return date.toLocaleTimeString("en-US", { timeZone: time_zone, hour: "2-digit", minute: "2-digit" });
}

/** "Mon 12/08/2023" for a `YYYY-MM-DD` key (zone-free: the key already is the local day). */
export function formatDayKey(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

/** Decimal hours as payroll shows them: "7.42". */
export function formatHours(hours: number | null | undefined): string {
  if (hours == null || Number.isNaN(hours)) return "—";
  return hours.toFixed(2);
}

/** Elapsed time as "3h 07m". */
export function formatDuration(ms: number): string {
  const total_minutes = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(total_minutes / 60);
  const m = total_minutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

// ── Day arithmetic on YYYY-MM-DD keys ───────────────────────────────────────

/** Add `n` days to a `YYYY-MM-DD` key. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The Sunday that starts the payroll week containing `day`. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  return addDays(day, -d.getUTCDay());
}

// ── Punch → hours ───────────────────────────────────────────────────────────

/** Hours between clock-in and clock-out; null while the punch is open or unparseable. */
export function entryHours(entry: Pick<TimeClockEntry, "clock_in" | "clock_out" | "total_hours">): number | null {
  const start = parseServerDateTime(entry.clock_in);
  const end = parseServerDateTime(entry.clock_out);
  if (start && end) return (end.getTime() - start.getTime()) / MS_PER_HOUR;
  // Defensive: a closed row whose timestamps don't parse but carries a total.
  if (end == null && entry.clock_out) {
    const n = Number(entry.total_hours);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Two-decimal string for `total_hours` (the server does not compute it — TC-BE-3). */
export function hoursForPayload(clock_in: string, clock_out: string): string {
  const start = parseServerDateTime(clock_in);
  const end = parseServerDateTime(clock_out);
  if (!start || !end) return "0.00";
  return Math.max(0, (end.getTime() - start.getTime()) / MS_PER_HOUR).toFixed(2);
}

/** An open punch that is still a plausible running shift (not a forgotten clock-out). */
export function isActiveShift(entry: TimeClockEntry, now: Date = new Date()): boolean {
  if (entry.clock_out) return false;
  const start = parseServerDateTime(entry.clock_in);
  if (!start || isLegacyEntry(entry)) return false;
  const age = now.getTime() - start.getTime();
  return age >= -5 * 60_000 && age < STALE_OPEN_HOURS * MS_PER_HOUR;
}

// ── Overtime ────────────────────────────────────────────────────────────────

export type OvertimeRuleKey = "none" | "weekly_40" | "daily_8" | "daily_8_weekly_40";

export interface OvertimeRule {
  daily_threshold: number | null;
  weekly_threshold: number | null;
}

export const OVERTIME_RULES: Record<OvertimeRuleKey, { label: string; rule: OvertimeRule }> = {
  none: { label: "No overtime", rule: { daily_threshold: null, weekly_threshold: null } },
  weekly_40: { label: "Weekly > 40 h (FLSA)", rule: { daily_threshold: null, weekly_threshold: 40 } },
  daily_8: { label: "Daily > 8 h", rule: { daily_threshold: 8, weekly_threshold: null } },
  daily_8_weekly_40: { label: "Daily > 8 h + Weekly > 40 h (CA)", rule: { daily_threshold: 8, weekly_threshold: 40 } },
};

/**
 * Map a user's `time-clock-config.overtime_method` to a rule. The backend stores
 * free text with no documented vocabulary (TC-BE-7), so match loosely and fall
 * back to the FLSA weekly rule.
 */
export function overtimeRuleFromMethod(method?: string | null): OvertimeRuleKey {
  const m = String(method ?? "").toLowerCase();
  if (!m) return "weekly_40";
  if (m.includes("none") || m === "0") return "none";
  const daily = m.includes("day") || m.includes("daily");
  const weekly = m.includes("week");
  if (daily && weekly) return "daily_8_weekly_40";
  if (daily) return "daily_8";
  return "weekly_40";
}

/**
 * Split each day's hours into regular / overtime. Daily overtime is taken first;
 * the weekly threshold then applies to the REMAINING regular hours in the
 * payroll week (Sun–Sat), so an hour is never counted as overtime twice.
 * `days` must be ascending.
 */
export function splitOvertime(
  days: ReadonlyArray<{ day: string; hours: number }>,
  rule: OvertimeRule,
): Array<{ day: string; regular: number; overtime: number }> {
  const weekly_regular = new Map<string, number>();
  return days.map(({ day, hours }) => {
    const worked = Math.max(0, hours);
    let overtime = rule.daily_threshold != null ? Math.max(0, worked - rule.daily_threshold) : 0;
    let regular = worked - overtime;
    if (rule.weekly_threshold != null) {
      const wk = weekStart(day);
      const so_far = weekly_regular.get(wk) ?? 0;
      const room = Math.max(0, rule.weekly_threshold - so_far);
      if (regular > room) {
        overtime += regular - room;
        regular = room;
      }
      weekly_regular.set(wk, so_far + regular);
    }
    return { day, regular, overtime };
  });
}

// ── Report ──────────────────────────────────────────────────────────────────

export type EntryIssue = "missing_clock_out" | "clock_out_before_in" | "long_shift";

export const ISSUE_LABELS: Record<EntryIssue, string> = {
  missing_clock_out: "Missing clock-out",
  clock_out_before_in: "Clock-out before clock-in",
  long_shift: `Shift over ${LONG_SHIFT_HOURS} h`,
};

export interface EntryRow {
  entry: TimeClockEntry;
  time_zone: string;
  day: string;
  clock_in: Date;
  clock_out: Date | null;
  /** Worked hours; null while open. A running shift counts its elapsed time in `live_hours`. */
  hours: number | null;
  live_hours: number | null;
  issues: EntryIssue[];
}

export interface DaySummary {
  day: string;
  rows: EntryRow[];
  hours: number;
  regular: number;
  overtime: number;
}

export interface UserSummary {
  user_id: number;
  name: string;
  days: DaySummary[];
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  shift_count: number;
  issue_count: number;
  /** The user's running shift, if any (elapsed time NOT included in totals). */
  active_row: EntryRow | null;
}

export interface ReportTotals {
  users: number;
  shifts: number;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  issues: number;
}

export interface BuildReportOptions {
  /** Inclusive `YYYY-MM-DD` range, in each entry's own zone. */
  from: string;
  to: string;
  zoneForOffice: (office_id: number) => string | null | undefined;
  resolveUserName: (user_id: number) => string;
  rule: OvertimeRule;
  now?: Date;
}

export function toEntryRow(
  entry: TimeClockEntry,
  zoneForOffice: BuildReportOptions["zoneForOffice"],
  now: Date = new Date(),
): EntryRow | null {
  const clock_in = parseServerDateTime(entry.clock_in);
  if (!clock_in) return null;
  const clock_out = parseServerDateTime(entry.clock_out);
  const time_zone = entryTimeZone(entry, zoneForOffice);
  const hours = entryHours(entry);
  const active = isActiveShift(entry, now);
  const issues: EntryIssue[] = [];
  if (!clock_out && !active) issues.push("missing_clock_out");
  if (hours != null && hours < 0) issues.push("clock_out_before_in");
  if (hours != null && hours > LONG_SHIFT_HOURS) issues.push("long_shift");
  return {
    entry,
    time_zone,
    day: dayKey(clock_in, time_zone),
    clock_in,
    clock_out,
    hours,
    live_hours: active ? (now.getTime() - clock_in.getTime()) / MS_PER_HOUR : null,
    issues,
  };
}

/** Group entries into per-user, per-day summaries with overtime applied. */
export function buildReport(entries: readonly TimeClockEntry[], opts: BuildReportOptions): UserSummary[] {
  const now = opts.now ?? new Date();
  const byUser = new Map<number, EntryRow[]>();
  for (const entry of entries) {
    const row = toEntryRow(entry, opts.zoneForOffice, now);
    if (!row || row.day < opts.from || row.day > opts.to) continue;
    const list = byUser.get(entry.user_id) ?? [];
    list.push(row);
    byUser.set(entry.user_id, list);
  }

  const users: UserSummary[] = [];
  for (const [user_id, rows] of byUser) {
    rows.sort((a, b) => a.clock_in.getTime() - b.clock_in.getTime());
    const dayMap = new Map<string, EntryRow[]>();
    for (const r of rows) {
      const list = dayMap.get(r.day) ?? [];
      list.push(r);
      dayMap.set(r.day, list);
    }
    const dayList = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, dayRows]) => ({
        day,
        rows: dayRows,
        // Negative (clock-out before clock-in) rows are flagged, never paid.
        hours: dayRows.reduce((s, r) => s + (r.hours != null && r.hours > 0 ? r.hours : 0), 0),
      }));
    const split = splitOvertime(dayList, opts.rule);
    const days: DaySummary[] = dayList.map((d, i) => ({ ...d, regular: split[i]?.regular ?? d.hours, overtime: split[i]?.overtime ?? 0 }));
    users.push({
      user_id,
      name: opts.resolveUserName(user_id),
      days,
      total_hours: days.reduce((s, d) => s + d.hours, 0),
      regular_hours: days.reduce((s, d) => s + d.regular, 0),
      overtime_hours: days.reduce((s, d) => s + d.overtime, 0),
      shift_count: rows.length,
      issue_count: rows.filter((r) => r.issues.length > 0).length,
      active_row: rows.find((r) => r.live_hours != null) ?? null,
    });
  }
  return users.sort((a, b) => a.name.localeCompare(b.name));
}

export function reportTotals(users: readonly UserSummary[]): ReportTotals {
  return {
    users: users.length,
    shifts: users.reduce((s, u) => s + u.shift_count, 0),
    total_hours: users.reduce((s, u) => s + u.total_hours, 0),
    regular_hours: users.reduce((s, u) => s + u.regular_hours, 0),
    overtime_hours: users.reduce((s, u) => s + u.overtime_hours, 0),
    issues: users.reduce((s, u) => s + u.issue_count, 0),
  };
}

// ── Period presets ──────────────────────────────────────────────────────────

export type PeriodKey = "today" | "this_week" | "last_week" | "last_2_weeks" | "this_month" | "last_month" | "custom";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Today",
  this_week: "This week",
  last_week: "Last week",
  last_2_weeks: "Last 2 weeks",
  this_month: "This month",
  last_month: "Last month",
  custom: "Custom range",
};

/** Inclusive `{ from, to }` for a preset, relative to `today` (`YYYY-MM-DD`). */
export function periodRange(period: Exclude<PeriodKey, "custom">, today: string): { from: string; to: string } {
  const sunday = weekStart(today);
  const month = today.slice(0, 7);
  switch (period) {
    case "today":
      return { from: today, to: today };
    case "this_week":
      return { from: sunday, to: addDays(sunday, 6) };
    case "last_week":
      return { from: addDays(sunday, -7), to: addDays(sunday, -1) };
    case "last_2_weeks":
      return { from: addDays(sunday, -14), to: addDays(sunday, -1) };
    case "this_month": {
      const next = new Date(`${month}-01T12:00:00Z`);
      next.setUTCMonth(next.getUTCMonth() + 1);
      return { from: `${month}-01`, to: addDays(next.toISOString().slice(0, 10), -1) };
    }
    case "last_month": {
      const first = `${month}-01`;
      const prevLast = addDays(first, -1);
      return { from: `${prevLast.slice(0, 7)}-01`, to: prevLast };
    }
  }
}

// ── CSV ─────────────────────────────────────────────────────────────────────

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Array<Array<string | number>>): string {
  // BOM so Excel opens UTF-8 correctly (built from a char code — see utilities GOTCHA).
  return String.fromCharCode(0xfeff) + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export function summaryCsv(users: readonly UserSummary[]): string {
  return toCsv([
    ["Employee", "User ID", "Days worked", "Shifts", "Regular hours", "Overtime hours", "Total hours", "Issues"],
    ...users.map((u) => [
      u.name,
      u.user_id,
      u.days.length,
      u.shift_count,
      formatHours(u.regular_hours),
      formatHours(u.overtime_hours),
      formatHours(u.total_hours),
      u.issue_count,
    ]),
  ]);
}

export function detailCsv(users: readonly UserSummary[], officeName: (office_id: number | null | undefined) => string): string {
  const rows: Array<Array<string | number>> = [
    ["Employee", "User ID", "Date", "Office", "Clock in", "Clock out", "Hours", "Issues", "Entry ID"],
  ];
  for (const u of users) {
    for (const d of u.days) {
      for (const r of d.rows) {
        rows.push([
          u.name,
          u.user_id,
          d.day,
          officeName(r.entry.office_id),
          formatClockTime(r.clock_in, r.time_zone),
          r.clock_out ? formatClockTime(r.clock_out, r.time_zone) : r.live_hours != null ? "On the clock" : "",
          formatHours(r.hours),
          r.issues.map((i) => ISSUE_LABELS[i]).join("; "),
          r.entry.id,
        ]);
      }
    }
  }
  return toCsv(rows);
}

// ── Wall clock ⇄ instant (entry editor) ─────────────────────────────────────

/** `zone`'s offset from UTC at instant `t`, in ms (local − UTC). */
function zoneOffsetMs(t: number, time_zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: time_zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(t));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const local = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return local - Math.floor(t / 1000) * 1000;
}

/**
 * ISO instant for a wall-clock `day` + `HH:MM` in `time_zone`. For the legacy
 * zone ("UTC") this is the stored wall clock itself, which keeps edited legacy
 * rows in their original semantics.
 */
export function wallTimeToIso(day: string, hhmm: string, time_zone: string): string {
  const guess = Date.parse(`${day}T${hhmm}:00Z`);
  if (time_zone === LEGACY_WALL_CLOCK_ZONE) return new Date(guess).toISOString();
  const first = zoneOffsetMs(guess, time_zone);
  let t = guess - first;
  const second = zoneOffsetMs(t, time_zone);
  if (second !== first) t = guess - second; // DST edge
  return new Date(t).toISOString();
}

/** `{ day: "YYYY-MM-DD", time: "HH:MM" }` of `date` in `time_zone`. */
export function isoToWallTime(date: Date, time_zone: string): { day: string; time: string } {
  const time = date.toLocaleTimeString("en-GB", {
    timeZone: time_zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return { day: dayKey(date, time_zone), time };
}
