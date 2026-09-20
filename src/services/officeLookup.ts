// Shared office lookup — the ONE parser for the app's canonical `OFF-{id}` office
// key (what AuthContext holds as `currentOffice` and GlobalNav sets) plus a
// session-cached office catalog used for id → name resolution.
//
// Every other "extract the office number" helper must delegate here:
// `officeIdNum` in schedulerApi.ts is an alias, and the inline copies that used
// to live in Patient / EditPatientModal / NewAppointmentModal /
// AddEditAppointmentForm / ClaimDetail were deleted because they disagreed on
// whether the FIRST or the LAST digit run wins.

import { listOffices } from "@/api/generated/endpoints/organization/organization";

export interface OfficeOption {
  /** Canonical app key, e.g. "OFF-1" — matches `currentOffice`. */
  key: string;
  /** Numeric backend id (patients.home_office_id, *.office_id). */
  id: number;
  name: string;
  short_id?: string | null;
  office_code?: string | null;
  is_active: boolean;
  /**
   * The office's default patient fee schedule (`offices.default_fee_schedule_id`)
   * — the list a new patient is registered with. Null when the office has no
   * pointer configured. See `docs/pricing/pricing_hierarchy_architecture.md` §1.3.
   */
  default_fee_schedule_id?: number | null;
  /** The office's UCR fee schedule pointer (`offices.default_ucr_fee_schedule_id`). */
  default_ucr_fee_schedule_id?: number | null;
}

/**
 * Extract the numeric office id from any key shape the app has ever used:
 * "OFF-1", "1", "office-108", "O-3", "Excel Dental [108]" (display label) or an
 * already-numeric id. The LAST digit run wins so a display label whose name
 * contains digits still resolves to the bracketed id. `undefined` for empty /
 * unparseable input — callers decide whether that means "all offices" or an error
 * (see `requireOfficeId` in src/features/office-scope/officeParams.ts).
 */
export function officeKeyToId(officeKey?: string | number | null): number | undefined {
  if (officeKey == null) return undefined;
  if (typeof officeKey === "number") return Number.isFinite(officeKey) ? officeKey : undefined;
  const s = String(officeKey).trim();
  if (s === "") return undefined;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const digits = s.match(/(\d+)(?!.*\d)/)?.[1];
  return digits ? parseInt(digits, 10) : undefined;
}

/** Numeric office id → the canonical `OFF-{id}` key. */
export function officeKey(office_id: number): string {
  return `OFF-${office_id}`;
}

const PAGE = 200;

let cache: Promise<OfficeOption[]> | null = null;

/**
 * Forget the cached office catalog — call after creating / renaming an office in
 * Setup so the switcher, badges and pickers pick the change up without a reload.
 * `invalidateOfficeOptions()` in src/features/office-scope does this plus the
 * React Query entries.
 */
export function invalidateOfficeLookupCache(): void {
  cache = null;
}

function toOption(o: {
  id: number;
  name: string;
  short_id?: string | null;
  office_code?: string | null;
  is_active?: boolean | null;
  default_fee_schedule_id?: number | null;
  default_ucr_fee_schedule_id?: number | null;
}): OfficeOption {
  return {
    key: officeKey(o.id),
    id: o.id,
    name: o.name,
    short_id: o.short_id ?? null,
    office_code: o.office_code ?? null,
    is_active: o.is_active !== false,
    default_fee_schedule_id: o.default_fee_schedule_id ?? null,
    default_ucr_fee_schedule_id: o.default_ucr_fee_schedule_id ?? null,
  };
}

/**
 * All offices in the tenant (cached for the session), in the canonical shape.
 * Never filtered by assignment or `is_active` — this is the label table, and a
 * badge on a historical row must still be able to name a deactivated or
 * unassigned office. Pickers wanting active-only filter client-side.
 */
export function listOfficeOptions(): Promise<OfficeOption[]> {
  if (!cache) {
    cache = (async () => {
      const first = await listOffices({ page: 1, size: PAGE });
      const rows = [...(first.items ?? [])];
      const pages = first.meta?.pages ?? 1;
      for (let p = 2; p <= pages; p++) {
        const res = await listOffices({ page: p, size: PAGE });
        rows.push(...(res.items ?? []));
      }
      return rows.map(toOption);
    })().catch((err) => {
      cache = null; // allow a retry on the next call
      throw err;
    });
  }
  return cache;
}

/**
 * Resolve one office key to its option. Matches on the canonical key first, then
 * falls back to the numeric id so "1" and "OFF-1" both resolve.
 */
export async function resolveOffice(officeKey?: string | number | null): Promise<OfficeOption | null> {
  const id = officeKeyToId(officeKey);
  if (id == null) return null;
  const offices = await listOfficeOptions();
  return offices.find((o) => o.id === id) ?? null;
}
