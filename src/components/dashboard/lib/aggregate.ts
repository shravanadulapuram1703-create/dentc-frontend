// Client-side aggregation helpers for dashboard metrics. The backend exposes no
// roll-up endpoints, so KPI/analytics widgets page through list endpoints (size
// capped at 200) and aggregate here. See docs/dashboard/dashboard_backend_devreport.md.
import type { PageMeta } from "@/api/generated/model";

// ---------------------------------------------------------------------------
// Money (backend decimals are strings)
// ---------------------------------------------------------------------------

export function parseDecimal(s?: string | null): number {
  if (!s) return 0;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function formatCurrency(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function formatCurrencyExact(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

// ---------------------------------------------------------------------------
// Dates (all `YYYY-MM-DD`, local)
// ---------------------------------------------------------------------------

export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function addDays(iso: string, days: number): string {
  const [ys, ms, ds] = iso.split("-");
  const dt = new Date(Number(ys), Number(ms) - 1, Number(ds) + days);
  return isoOf(dt);
}

export function startOfMonth(iso: string): string {
  const [ys, ms] = iso.split("-");
  return `${Number(ys)}-${String(Number(ms)).padStart(2, "0")}-01`;
}

/** Inclusive list of `YYYY-MM-DD` from `from` to `to`. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  // guard against pathological ranges
  for (let i = 0; i < 400 && cur <= to; i++) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/** Short axis label for a YYYY-MM-DD (e.g. "Jun 6"). */
export function shortDayLabel(iso: string): string {
  const [ys, ms, ds] = iso.split("-");
  return new Date(Number(ys), Number(ms) - 1, Number(ds)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface Paged<T> {
  items: T[];
  total: number;
  /** true when more pages existed than `maxPages` — surface this, never hide it. */
  truncated: boolean;
}

/**
 * Page through a paginated list endpoint and collect items, bounded by `maxPages`
 * so a busy range can't fan out unbounded. Pages sequentially (lists are small).
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, size: number) => Promise<{ items: T[]; meta: PageMeta }>,
  opts?: { size?: number; maxPages?: number },
): Promise<Paged<T>> {
  const size = opts?.size ?? 200;
  const maxPages = opts?.maxPages ?? 5;
  const first = await fetchPage(1, size);
  const items = [...first.items];
  const lastPage = Math.min(first.meta.pages, maxPages);
  for (let p = 2; p <= lastPage; p++) {
    const r = await fetchPage(p, size);
    items.push(...r.items);
  }
  return { items, total: first.meta.total, truncated: first.meta.pages > maxPages };
}
