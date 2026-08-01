/**
 * Fee Schedule API Service
 *
 * Thin adapter over the generated Orval client's real `GET /api/v1/fee-schedules`
 * (`listFeeSchedules`, tag: Procedures). Returns the small `FeeSchedule` shape the
 * patient add/edit forms already consume. The legacy raw-`fetch` + mock-schedule
 * fallback was removed (GAP-AP-5): the dropdown now reflects real, tenant-scoped
 * fee schedules and `feeScheduleId` is the numeric backend id (as a string).
 */

import { listFeeSchedules } from "@/api/generated/endpoints/procedures/procedures";
import type { FeeScheduleRead } from "@/api/generated/model";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface FeeSchedule {
  feeScheduleId: string; // backend fee_schedules.id, as a string for <select> values
  feeScheduleName: string;
  description?: string;
  isActive: boolean;
  effectiveDate?: string;
  officeId?: string;
}

export interface ProcedureCode {
  procedureCode: string;
  description: string;
  fee: number;
  coverageType?: string;
  category?: string;
}

export interface FeeScheduleResponse {
  feeSchedules: FeeSchedule[];
  total: number;
}

export interface ProcedureCodesResponse {
  procedures: ProcedureCode[] | undefined;
  feeScheduleId: string;
  feeScheduleName: string;
}

// ============================================================================
// In-Memory Cache (Session-based)
// ============================================================================

class FeeScheduleCache {
  // Keyed by office so switching offices re-queries instead of reusing a stale list.
  private byOffice = new Map<string, FeeScheduleResponse>();

  setFeeScheduleList(key: string, data: FeeScheduleResponse): void {
    this.byOffice.set(key, data);
  }
  getFeeScheduleList(key: string): FeeScheduleResponse | null {
    return this.byOffice.get(key) ?? null;
  }
  /** Any cached list — used by helpers that only need names/ids. */
  getAny(): FeeScheduleResponse | null {
    const first = this.byOffice.values().next();
    return first.done ? null : first.value;
  }
  clear(): void {
    this.byOffice.clear();
  }
}

const cache = new FeeScheduleCache();

/** Extract a numeric office id from "OFF-1" / "1" / "office-108" → number | undefined. */
function officeIdToNumber(officeId?: string): number | undefined {
  if (!officeId) return undefined;
  if (/^\d+$/.test(officeId)) return parseInt(officeId, 10);
  const m = officeId.match(/(\d+)$/);
  return m && m[1] ? parseInt(m[1], 10) : undefined;
}

// ============================================================================
// API Functions
// ============================================================================

const toFeeSchedule = (f: FeeScheduleRead): FeeSchedule => ({
  feeScheduleId: String(f.id),
  feeScheduleName: f.name,
  description: f.fee_type ?? undefined,
  isActive: f.is_active,
  effectiveDate: f.effective_date ?? undefined,
  officeId: f.office_id != null ? String(f.office_id) : undefined,
});

/**
 * Fetch selectable active fee schedules.
 *
 * Fee schedules are mostly **org-wide** — their `fee_type` is carrier / plan /
 * provider / ucr and `office_id` is null, so filtering by `office_id` returns an
 * empty list (that is exactly why the dropdown was blank). We therefore ask for
 * the office-scoped set first and, when the office has none of its own, fall back
 * to the org-wide list — which is what the Fee Schedule Setup screen shows.
 *
 * @param officeId - Optional office id ("OFF-1"/"1"); used as a preference, not a hard filter.
 */
export async function getFeeSchedules(officeId?: string): Promise<FeeScheduleResponse> {
  const cacheKey = officeId ?? "";
  const cached = cache.getFeeScheduleList(cacheKey);
  if (cached) return cached;

  const office_id = officeIdToNumber(officeId);

  // Office-specific schedules (if this office defines any of its own).
  let items: FeeScheduleRead[] = [];
  if (office_id != null) {
    const scoped = await listFeeSchedules({
      office_id,
      is_active: true,
      size: 200,
      sort: "name",
    });
    items = scoped.items ?? [];
  }

  // Fall back to the org-wide list when the office has no schedules of its own.
  if (items.length === 0) {
    const all = await listFeeSchedules({ is_active: true, size: 200, sort: "name" });
    items = all.items ?? [];
  }

  const feeSchedules = items.map(toFeeSchedule);
  const response: FeeScheduleResponse = { feeSchedules, total: feeSchedules.length };
  cache.setFeeScheduleList(cacheKey, response);
  return response;
}

/**
 * Procedure-code preload for a fee schedule. The patient add/edit forms call this
 * only to warm a cache and ignore the result; there is no patient-facing
 * fee-schedule-entries join here, so this is a no-op that returns an empty list.
 * (Fee Schedule Setup has its own dedicated entries screen.)
 */
export async function getProcedureCodesByFeeSchedule(
  feeScheduleId: string,
): Promise<ProcedureCodesResponse> {
  const schedule = (cache.getAny()?.feeSchedules ?? []).find(
    (fs) => fs.feeScheduleId === feeScheduleId,
  );
  return {
    procedures: [],
    feeScheduleId,
    feeScheduleName: schedule?.feeScheduleName ?? "",
  };
}

/** Get a single fee schedule by id. */
export async function getFeeScheduleById(feeScheduleId: string): Promise<FeeSchedule | null> {
  const response = await getFeeSchedules();
  return response.feeSchedules.find((fs) => fs.feeScheduleId === feeScheduleId) || null;
}

/** Clear all cached fee schedule data. */
export function clearFeeScheduleCache(): void {
  cache.clear();
}

/** Find fee schedule by name (case-insensitive). */
export async function findFeeScheduleByName(name: string): Promise<FeeSchedule | null> {
  const response = await getFeeSchedules();
  return (
    response.feeSchedules.find((fs) => fs.feeScheduleName.toLowerCase() === name.toLowerCase()) ||
    null
  );
}

/** Get the default (first active) fee schedule for an office. */
export async function getDefaultFeeSchedule(officeId?: string): Promise<FeeSchedule | null> {
  const response = await getFeeSchedules(officeId);
  return response.feeSchedules.find((fs) => fs.isActive) || response.feeSchedules[0] || null;
}
