// Date-range presets for the Reports module. All ranges are inclusive
// `YYYY-MM-DD` pairs in local time, reusing the dashboard date helpers so the
// Reports and Dashboard modules bucket dates identically.
import { isoOf, addDays, startOfMonth } from "../../dashboard/lib/aggregate";

export type RangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "this_quarter"
  | "this_year"
  | "custom";

export interface DateRange {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
}

export const PRESET_LABELS: Record<RangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  this_month: "This Month",
  this_quarter: "This Quarter",
  this_year: "This Year",
  custom: "Custom Range",
};

/** Monday-start week containing `iso`. */
function startOfWeek(iso: string): string {
  const [ys, ms, ds] = iso.split("-");
  const dt = new Date(Number(ys), Number(ms) - 1, Number(ds));
  const dow = (dt.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(iso, -dow);
}

/** First day of the calendar quarter containing `iso`. */
function startOfQuarter(iso: string): string {
  const [ys, ms] = iso.split("-");
  const qStartMonth = Math.floor((Number(ms) - 1) / 3) * 3 + 1;
  return `${Number(ys)}-${String(qStartMonth).padStart(2, "0")}-01`;
}

/**
 * Resolve a preset to a concrete inclusive range. For `custom`, the caller's
 * `custom` range is returned (falling back to today when unset).
 */
export function resolveRange(preset: RangePreset, custom?: Partial<DateRange>): DateRange {
  const today = isoOf(new Date());
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case "this_week":
      return { from: startOfWeek(today), to: today };
    case "this_month":
      return { from: startOfMonth(today), to: today };
    case "this_quarter":
      return { from: startOfQuarter(today), to: today };
    case "this_year":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case "custom":
      return { from: custom?.from || today, to: custom?.to || today };
  }
}

export type Granularity = "day" | "week" | "month";

/** Pick a sensible trend bucket size from the span length (inclusive days). */
export function granularityFor(range: DateRange): Granularity {
  const [fy, fm, fd] = range.from.split("-");
  const [ty, tm, td] = range.to.split("-");
  const days =
    Math.round(
      (new Date(Number(ty), Number(tm) - 1, Number(td)).getTime() -
        new Date(Number(fy), Number(fm) - 1, Number(fd)).getTime()) /
        86_400_000,
    ) + 1;
  if (days <= 31) return "day";
  if (days <= 92) return "week";
  return "month";
}

/** Bucket key for an ISO date at the chosen granularity. */
export function bucketKey(iso: string, g: Granularity): string {
  if (g === "day") return iso;
  if (g === "month") return iso.slice(0, 7); // YYYY-MM
  // week: Monday-start key
  const [ys, ms, ds] = iso.split("-");
  const dt = new Date(Number(ys), Number(ms) - 1, Number(ds));
  const dow = (dt.getDay() + 6) % 7;
  return addDays(iso, -dow);
}

/** Short axis label for a bucket key produced by {@link bucketKey}. */
export function bucketLabel(key: string, g: Granularity): string {
  if (g === "month") {
    const [ys, ms] = key.split("-");
    return new Date(Number(ys), Number(ms) - 1, 1).toLocaleDateString(undefined, {
      month: "short",
      year: "2-digit",
    });
  }
  const [ys, ms, ds] = key.split("-");
  return new Date(Number(ys), Number(ms) - 1, Number(ds)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
