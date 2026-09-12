/**
 * Shared "find a patient by identifier" helpers used by every patient search
 * surface (Patient search page, scheduler New Appointment chooser, Medical
 * History copy-from typeahead, dashboard Quick Search).
 *
 * Two identifiers are covered:
 *
 *   • **Patient ID** — `PatientRead.id`, the numeric backend primary key.
 *     `GET /patients?id=` is NOT a supported filter (the backend ignores the
 *     param and returns page 1 of every patient), so the lookup goes through
 *     `GET /patients/{id}` and treats a 404 as "no match".
 *
 *   • **Legacy ID** — `PatientRead.legacy_id`, the id the patient carried in
 *     the legacy system before import (e.g. `100001`, `10021076`). The list
 *     endpoint has no `legacy_id` filter today and free-text `search` does not
 *     cover the column (gap PT-SEARCH-1 in backend_devreport.md). The frontend
 *     already sends `legacy_id=` as the agreed contract; until the backend
 *     honours it we detect the "filter ignored" response (rows whose legacy_id
 *     is not the one asked for) and report `backend_supported: false` so the
 *     UI can say so instead of showing a random page of patients.
 */
import { getPatient, listPatients } from "@/api/generated/endpoints/patients/patients";
import type { ListPatientsParams, PatientRead } from "@/api/generated/model";

/** `ListPatientsParams` plus the `legacy_id` filter requested from the backend (PT-SEARCH-1). */
export type PatientSearchParams = ListPatientsParams & {
  legacy_id?: string | null;
};

/** Gap id + user-facing copy, kept in one place so every surface says the same thing. */
export const LEGACY_ID_GAP_ID = "PT-SEARCH-1";
export const LEGACY_ID_GAP_MESSAGE =
  "Legacy ID search is not supported by the backend yet (needs a `legacy_id` filter on GET /patients, gap PT-SEARCH-1).";

/**
 * Parse what a user typed into a numeric patient id.
 * Accepts `123`, `PT-123`, `PT123`, `#123` and surrounding whitespace.
 * Returns null for anything else (so "0", "", "abc" never hit the API).
 */
export function parse_patient_id(text: string): number | null {
  const m = text.trim().match(/^(?:pt[-\s]?|#)?(\d{1,12})$/i);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** True when the text could be a legacy id (digits only — every imported legacy_id is numeric). */
export function looks_like_legacy_id(text: string): boolean {
  return /^\d{1,20}$/.test(text.trim());
}

function is_not_found(err: unknown): boolean {
  const status = (err as { response?: { status?: number } } | undefined)?.response?.status;
  return status === 404 || status === 422;
}

/**
 * Exact lookup by backend patient id. Resolves to null when there is no such
 * patient (404) or the text is not an id at all; rethrows anything else.
 */
export async function lookup_patient_by_id(text: string, signal?: AbortSignal): Promise<PatientRead | null> {
  const id = parse_patient_id(text);
  if (id == null) return null;
  try {
    return await getPatient(id, undefined, signal);
  } catch (err) {
    if (is_not_found(err)) return null;
    throw err;
  }
}

export interface LegacyIdLookupResult {
  /** Rows whose `legacy_id` equals the requested value (exact, trimmed). */
  items: PatientRead[];
  /**
   * False when the backend returned rows that do NOT carry the requested
   * legacy_id — i.e. it ignored the `legacy_id` filter (PT-SEARCH-1 not
   * deployed). The UI should surface LEGACY_ID_GAP_MESSAGE in that case.
   */
  backend_supported: boolean;
}

/**
 * Lookup by legacy id through `GET /patients?legacy_id=`. Extra list filters
 * (office scope, is_active, paging, sort) are passed through unchanged.
 */
export async function lookup_patients_by_legacy_id(
  legacy_id: string,
  params: ListPatientsParams = {},
  signal?: AbortSignal,
): Promise<LegacyIdLookupResult> {
  const wanted = legacy_id.trim();
  if (!wanted) return { items: [], backend_supported: true };

  const query: PatientSearchParams = { ...params, legacy_id: wanted };
  const page = await listPatients(query, undefined, signal);
  const rows = page.items ?? [];
  const items = rows.filter((p) => (p.legacy_id ?? "").trim() === wanted);
  // Any row that does not match means the filter was not applied server-side.
  const backend_supported = items.length === rows.length;
  return { items, backend_supported };
}

/** Client-side re-application of the list filters a by-id lookup cannot send to the server. */
export function patient_matches_scope(
  p: PatientRead,
  opts: { home_office_id?: number | null; include_inactive?: boolean },
): boolean {
  if (opts.home_office_id != null && p.home_office_id !== opts.home_office_id) return false;
  if (!opts.include_inactive && p.is_active === false) return false;
  return true;
}
