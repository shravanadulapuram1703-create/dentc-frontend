// Shared cell formatters + bucketing for report definitions. Dates are formatted
// from YYYY-MM-DD parts (never `new Date("YYYY-MM-DD")`, which parses as UTC and
// shifts a day in negative-offset zones).
import { parseDecimal } from "../../dashboard/lib/aggregate";
import {
  type DateRange,
  type Granularity,
  granularityFor,
  bucketKey,
  bucketLabel,
} from "../lib/reportRange";
import type { ChartSeriesPoint } from "../types";

/** "2024-09-03T..." | "2024-09-03" → "Sep 3, 2024" (empty for null). */
export function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** "14:30:00" | "14:30" → "2:30 PM". */
export function fmtTime(t?: string | null): string {
  if (!t) return "";
  const [hs, ms] = t.split(":");
  const h = Number(hs);
  if (!Number.isFinite(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${(ms ?? "00").padStart(2, "0")} ${period}`;
}

/** Currency string from a backend decimal string. */
export function money(s?: string | null): string {
  return parseDecimal(s).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

/**
 * Bucket a set of dated money rows into a bar-chart series (production/
 * collections over time) using the range-appropriate granularity.
 */
export function timeSeries<T>(
  rows: T[],
  range: DateRange,
  getDate: (r: T) => string | null | undefined,
  getValue: (r: T) => number,
): { data: ChartSeriesPoint[]; granularity: Granularity } {
  const g = granularityFor(range);
  const buckets = new Map<string, number>();
  for (const r of rows) {
    const d = getDate(r)?.slice(0, 10);
    if (!d) continue;
    const k = bucketKey(d, g);
    buckets.set(k, (buckets.get(k) ?? 0) + getValue(r));
  }
  const data = [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => ({ label: bucketLabel(k, g), value: v }));
  return { data, granularity: g };
}

/** Count occurrences of a string key into a pie-chart series (status mix, etc). */
export function distribution<T>(rows: T[], getKey: (r: T) => string): ChartSeriesPoint[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = getKey(r) || "—";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
}
