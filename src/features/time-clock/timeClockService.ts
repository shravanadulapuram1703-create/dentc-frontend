// Time-clock data access — wraps the generated Orval client for
// /api/v1/time-clock-entries and /api/v1/users/{id}/time-clock-config.
// Bodies and results stay in the backend's snake_case shape.
//
// The backend exposes plain CRUD only, so a few rules the server should own are
// enforced here until it does (docs/time-clock/time_clock_backend_devreport.md):
//   - the clock time comes from the browser clock          (TC-BE-1)
//   - one open shift per user is checked before clock-in   (TC-BE-2)
//   - `total_hours` is computed and sent on clock-out      (TC-BE-3)
//   - date ranges are paged client-side (no date filter)   (TC-BE-4)
import {
  createTimeClockEntry,
  deleteTimeClockEntry,
  listTimeClockEntries,
  updateTimeClockEntry,
} from "@/api/generated/endpoints/staff/staff";
import { getUserTimeClockConfig } from "@/api/generated/endpoints/users/users";
import type {
  ListTimeClockEntriesParams,
  TimeClockConfigRead,
  TimeClockEntryRead,
} from "@/api/generated/model";
import { allOfficesParam, officeFilter } from "@/features/office-scope";
import { parseServerDateTime } from "@/utils/datetime";
import { addDays, hoursForPayload, isActiveShift } from "./timeClockModel";

// `size` caps at 200 on list endpoints.
const PAGE_SIZE = 200;
/** Safety cap for a range crawl (60 × 200 = 12k punches). */
const MAX_PAGES = 60;

export class TimeClockConflictError extends Error {
  readonly open_entry: TimeClockEntryRead;
  constructor(open_entry: TimeClockEntryRead) {
    super("You are already clocked in. Refresh to see your current shift.");
    this.name = "TimeClockConflictError";
    this.open_entry = open_entry;
  }
}

/** Newest punches for one user (newest first). */
export async function fetchRecentEntries(user_id: number, size = 10): Promise<TimeClockEntryRead[]> {
  const res = await listTimeClockEntries({ user_id, sort: "clock_in", order: "desc", size, ...allOfficesParam(true) });
  return res.items ?? [];
}

/**
 * The user's running shift, or null. A forgotten clock-out older than
 * STALE_OPEN_HOURS (or a migrated legacy open row) is NOT a running shift.
 */
export async function fetchActiveEntry(user_id: number): Promise<TimeClockEntryRead | null> {
  const recent = await fetchRecentEntries(user_id, 10);
  return recent.find((e) => isActiveShift(e)) ?? null;
}

/** Punch in now, stamped with the working office (STAMP.time_clock = "working"). */
export async function clockIn(input: { user_id: number; office_id: number | null }): Promise<TimeClockEntryRead> {
  const open = await fetchActiveEntry(input.user_id);
  if (open) throw new TimeClockConflictError(open);
  return createTimeClockEntry({
    user_id: input.user_id,
    office_id: input.office_id,
    clock_in: new Date().toISOString(),
  });
}

/** Punch out the given open shift now. */
export async function clockOut(entry: TimeClockEntryRead): Promise<TimeClockEntryRead> {
  const clock_out = new Date().toISOString();
  return updateTimeClockEntry(entry.id, {
    clock_out,
    total_hours: hoursForPayload(entry.clock_in, clock_out),
  });
}

export interface EntryRangeQuery {
  /** Inclusive `YYYY-MM-DD` bounds (local days; bucketing is done by the model). */
  from: string;
  to: string;
  user_id?: number | null;
  /** Single-office filter (server-side). */
  office_id?: number | null;
  /** Office set filter ("My offices") — applied client-side, no list endpoint takes a set yet. */
  office_ids?: number[];
  /** Tenant-wide read. */
  all_offices?: boolean;
}

export interface EntryRangeResult {
  entries: TimeClockEntryRead[];
  /** True when the crawl hit MAX_PAGES before reaching `from`. */
  truncated: boolean;
}

/**
 * Every punch whose clock-in falls in [from, to]. The endpoint has no date
 * filter (TC-BE-4), so this pages newest-first by `clock_in` and stops once a
 * page reaches past `from`. A day of slack on both ends absorbs time-zone
 * offsets; the report builder trims to the exact local days.
 */
export async function fetchEntriesInRange(q: EntryRangeQuery): Promise<EntryRangeResult> {
  const lower = parseServerDateTime(`${addDays(q.from, -1)}T00:00:00Z`)!.getTime();
  const upper = parseServerDateTime(`${addDays(q.to, 2)}T00:00:00Z`)!.getTime();
  const params: ListTimeClockEntriesParams = {
    sort: "clock_in",
    order: "desc",
    size: PAGE_SIZE,
    ...(q.user_id != null ? { user_id: q.user_id } : {}),
    ...officeFilter(q.office_id),
    ...allOfficesParam(q.all_offices === true),
  };

  const out: TimeClockEntryRead[] = [];
  let truncated = false;
  for (let page = 1; ; page++) {
    const res = await listTimeClockEntries({ ...params, page });
    const items = res.items ?? [];
    let reachedLower = false;
    for (const e of items) {
      const t = parseServerDateTime(e.clock_in)?.getTime();
      if (t == null) continue;
      if (t < lower) {
        reachedLower = true;
        continue;
      }
      if (t < upper) out.push(e);
    }
    const pages = res.meta?.pages ?? 1;
    if (reachedLower || page >= pages || items.length === 0) break;
    if (page >= MAX_PAGES) {
      truncated = true;
      break;
    }
  }

  const set = q.office_ids && q.office_ids.length > 0 ? new Set(q.office_ids) : null;
  return {
    entries: set ? out.filter((e) => e.office_id != null && set.has(e.office_id)) : out,
    truncated,
  };
}

export interface EntryDraft {
  user_id: number;
  office_id: number | null;
  /** ISO instants. */
  clock_in: string;
  clock_out: string | null;
}

/** Manager edit: create or correct a punch. */
export async function saveEntry(draft: EntryDraft, id?: number): Promise<TimeClockEntryRead> {
  const body = {
    user_id: draft.user_id,
    office_id: draft.office_id,
    clock_in: draft.clock_in,
    clock_out: draft.clock_out,
    total_hours: draft.clock_out ? hoursForPayload(draft.clock_in, draft.clock_out) : null,
  };
  return id != null ? updateTimeClockEntry(id, body) : createTimeClockEntry(body);
}

/** Manager edit: remove a punch. NOTE: the backend DELETE is a hard delete (TC-BE-6). */
export function deleteEntry(id: number): Promise<void> {
  return deleteTimeClockEntry(id);
}

export function fetchTimeClockConfig(user_id: number): Promise<TimeClockConfigRead> {
  return getUserTimeClockConfig(user_id);
}
