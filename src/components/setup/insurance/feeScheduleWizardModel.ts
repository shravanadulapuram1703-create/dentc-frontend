// New Fee Schedule Wizard — pure model (no React, no fetching).
//
// Legacy parity (Denticon "New Fee Schedule Wizard"):
//   1. Schedule Type        → fee_schedules {name, effective_date, fee_type, pricing_model}
//   2. Offices              → All Offices | Specific Offices
//   3. Providers            → All Providers | Providers | Specialties
//   4. Add Fee Schedule     → fee_schedule_entries (bulk upsert)
//
// The Fee Schedule → Office(s) → Provider(s) relationship is persisted as
// `fee_schedule_assignments` rows. Backend rules this file encodes
// (dentc-backend app/services/fee_vocab.py + fee_schedule_service.py):
//   • a row must set a RANK key (ins_plan_id / carrier_id / provider_id /
//     specialty_id); office_id / office_group_id only NARROW a row and cannot
//     stand alone (422 assignment_needs_target);
//   • the key tuple is unique across ALL schedules (409
//     assignment_duplicate_target) — re-binding an existing tuple means PATCHing
//     that row's fee_schedule_id, not creating a second row;
//   • specialty_id is matched against `providers.specialty` (exact string).
//
// Every field binds to the backend snake_case names (CLAUDE.md).

import type {
  FeeScheduleAssignmentCreate,
  FeeScheduleAssignmentRead,
  ProviderRead,
} from "@/api/generated/model";

export type OfficeScope = "all" | "specific";
export type ProviderScope = "all" | "providers" | "specialties";

export interface WizardFeeRow {
  patient_fee: string;
  insurance_fee: string;
  amb_code: string;
}

export interface WizardState {
  // Step 1
  name: string;
  effective_date: string;
  fee_type: string;
  pricing_model: string;
  // Step 2
  office_scope: OfficeScope;
  office_ids: number[];
  // Step 3
  provider_scope: ProviderScope;
  provider_ids: string[];
  specialties: string[];
  // Step 4 — keyed by procedure_code
  fees: Record<string, WizardFeeRow>;
}

export function emptyWizardState(today: string, default_fee_type = "standard"): WizardState {
  return {
    name: "",
    effective_date: today,
    fee_type: default_fee_type,
    pricing_model: "percentage",
    office_scope: "all",
    office_ids: [],
    provider_scope: "all",
    provider_ids: [],
    specialties: [],
    fees: {},
  };
}

// ---------------------------------------------------------------------------
// Step 3 — providers derived from the selected offices
// ---------------------------------------------------------------------------

export interface WizardProviderRow {
  id: string;
  short_id: string | null;
  first_name: string;
  last_name: string;
  name: string;
  specialty: string | null;
  is_active: boolean;
  /** The SELECTED offices this provider serves (roster ∪ home office). Empty for "All Offices". */
  office_ids: number[];
  /** False when the provider serves none of the selected offices (only listed via "show all"). */
  in_scope: boolean;
}

function splitName(p: ProviderRead): { first_name: string; last_name: string } {
  if (p.first_name || p.last_name) return { first_name: p.first_name ?? "", last_name: p.last_name ?? "" };
  const parts = (p.name ?? "").trim().split(/\s+/);
  if (parts.length <= 1) return { first_name: parts[0] ?? "", last_name: "" };
  return { first_name: parts.slice(0, -1).join(" "), last_name: parts[parts.length - 1] ?? "" };
}

/**
 * The providers the Providers / Specialties step offers.
 *
 * "All Offices" → every active provider. "Specific Offices" → the providers
 * serving at least one selected office, where serving = the office's roster
 * (`/offices/{id}/providers/effective`, falling back to the raw join) ∪ the
 * provider's home `office_id`. Each row carries WHICH selected offices it serves
 * so the saved assignment is narrowed to exactly those offices.
 *
 * `include_others` appends every remaining active provider with `in_scope:false`
 * — the office roster is sparse in migrated data (see providerDirectory.ts), so a
 * provider who really works at the office may be missing from it.
 */
export function buildProviderRows(
  directory: ProviderRead[],
  office_scope: OfficeScope,
  office_ids: number[],
  rosters: Map<number, string[] | null>,
  include_others = false,
): WizardProviderRow[] {
  const active = directory.filter((p) => p.is_active);
  const rows: WizardProviderRow[] = [];
  for (const p of active) {
    const id = String(p.id);
    const serving =
      office_scope === "all"
        ? []
        : office_ids.filter((o) => p.office_id === o || (rosters.get(o) ?? []).includes(id));
    const in_scope = office_scope === "all" || serving.length > 0;
    if (!in_scope && !include_others) continue;
    rows.push({
      id,
      short_id: p.short_id ?? null,
      ...splitName(p),
      name: p.name,
      specialty: p.specialty?.trim() || null,
      is_active: p.is_active,
      office_ids: serving,
      in_scope,
    });
  }
  return rows.sort(
    (a, b) =>
      Number(b.in_scope) - Number(a.in_scope) ||
      a.last_name.localeCompare(b.last_name, undefined, { sensitivity: "base" }) ||
      a.first_name.localeCompare(b.first_name, undefined, { sensitivity: "base" }) ||
      a.id.localeCompare(b.id),
  );
}

export interface WizardSpecialtyRow {
  /** Exact `providers.specialty` string — what the pricing resolver matches `specialty_id` against. */
  specialty: string;
  provider_count: number;
}

/** Distinct specialties of the in-scope providers (exact strings, the resolver's key). */
export function deriveSpecialties(rows: WizardProviderRow[]): WizardSpecialtyRow[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.in_scope || !r.specialty) continue;
    counts.set(r.specialty, (counts.get(r.specialty) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([specialty, provider_count]) => ({ specialty, provider_count }))
    .sort((a, b) => a.specialty.localeCompare(b.specialty, undefined, { sensitivity: "base" }));
}

// ---------------------------------------------------------------------------
// Persisting the relationship — assignment rows
// ---------------------------------------------------------------------------

export type AssignmentTarget = Omit<FeeScheduleAssignmentCreate, "fee_schedule_id">;

/**
 * The assignment rows the wizard writes (without fee_schedule_id).
 *
 * Providers   → one row per (provider × selected office it serves); a provider
 *               added via "show all" (serves none) is bound to every selected
 *               office. "All Offices" → office_id null.
 * Specialties → one row per (specialty × selected office), or office_id null.
 * All         → nothing: an office-only row is refused by the backend. The
 *               office default pointer (Office Setup) is the home for that.
 */
export function buildAssignmentTargets(
  state: Pick<WizardState, "office_scope" | "office_ids" | "provider_scope" | "provider_ids" | "specialties">,
  provider_rows: WizardProviderRow[],
): AssignmentTarget[] {
  const scope_offices: (number | null)[] = state.office_scope === "all" ? [null] : state.office_ids;
  const out: AssignmentTarget[] = [];
  if (state.provider_scope === "providers") {
    const byId = new Map(provider_rows.map((r) => [r.id, r]));
    for (const provider_id of state.provider_ids) {
      const served = byId.get(provider_id)?.office_ids ?? [];
      const offices = state.office_scope === "all" ? [null] : served.length > 0 ? served : state.office_ids;
      for (const office_id of offices) out.push({ provider_id, office_id });
    }
  } else if (state.provider_scope === "specialties") {
    for (const specialty_id of state.specialties) {
      for (const office_id of scope_offices) out.push({ specialty_id, office_id });
    }
  }
  return out;
}

/** The backend's NULL-aware uniqueness key for an assignment tuple. */
export function assignmentTupleKey(a: {
  ins_plan_id?: number | null;
  carrier_id?: number | null;
  provider_id?: string | null;
  specialty_id?: string | null;
  office_id?: number | null;
  office_group_id?: number | null;
}): string {
  const v = (x: unknown) => (x == null || x === "" ? "" : String(x));
  return [a.ins_plan_id, a.carrier_id, a.provider_id, a.specialty_id, a.office_id, a.office_group_id].map(v).join("|");
}

export interface PlannedAssignment {
  target: AssignmentTarget;
  /** The row already binding this exact tuple (to another schedule), if any. */
  existing: FeeScheduleAssignmentRead | null;
}

/** Pair each planned target with the existing row that owns the same tuple. */
export function planAssignments(
  targets: AssignmentTarget[],
  existing: FeeScheduleAssignmentRead[],
): PlannedAssignment[] {
  const byKey = new Map(existing.map((a) => [assignmentTupleKey(a), a]));
  const seen = new Set<string>();
  const out: PlannedAssignment[] = [];
  for (const target of targets) {
    const key = assignmentTupleKey(target);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ target, existing: byKey.get(key) ?? null });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Step 4 — fees
// ---------------------------------------------------------------------------

/** A fee row worth sending: a fee, a Plan-Pays amount or an AMB code was entered. */
export function filledFeeRows(fees: Record<string, WizardFeeRow>): [string, WizardFeeRow][] {
  return Object.entries(fees).filter(
    ([, r]) => r.patient_fee.trim() !== "" || r.insurance_fee.trim() !== "" || r.amb_code.trim() !== "",
  );
}

export function invalidFeeCodes(fees: Record<string, WizardFeeRow>): string[] {
  const bad = (v: string) => v.trim() !== "" && (Number.isNaN(Number(v)) || Number(v) < 0);
  return Object.entries(fees)
    .filter(([, r]) => bad(r.patient_fee) || bad(r.insurance_fee))
    .map(([code]) => code);
}

/**
 * The entry in force for each code on `as_of` (latest effective_date <= as_of,
 * else the latest row) — what "Copy Fees From Existing Fee Schedule" copies.
 */
export function latestEntryPerCode<T extends { procedure_code: string; effective_date: string }>(
  entries: T[],
  as_of: string,
): Map<string, T> {
  const best = new Map<string, T>();
  const rank = (e: T) => (e.effective_date <= as_of ? 1 : 0);
  for (const e of entries) {
    const cur = best.get(e.procedure_code);
    if (
      !cur ||
      rank(e) > rank(cur) ||
      (rank(e) === rank(cur) && (rank(e) === 1 ? e.effective_date > cur.effective_date : e.effective_date < cur.effective_date))
    ) {
      best.set(e.procedure_code, e);
    }
  }
  return best;
}
