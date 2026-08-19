import {
  listFeeSchedules,
  listFeeScheduleEntries,
  listFeeScheduleAssignments,
} from '@/api/generated/endpoints/procedures/procedures';
import { getOffice } from '@/api/generated/endpoints/organization/organization';
import { listPatientInsurance } from '@/api/generated/endpoints/patients/patients';
import { getInsurancePlan } from '@/api/generated/endpoints/insurance/insurance';
import type {
  FeeScheduleRead,
  FeeScheduleEntryRead,
  FeeScheduleAssignmentRead,
} from '@/api/generated/model';

/**
 * Applies the fee schedules defined in Setup → Insurance → Fee Schedules to a
 * procedure being charged, so a posted procedure carries a real fee split into a
 * patient portion and an insurance portion instead of a flat `default_fee` with
 * `insurance_estimate: 0`.
 *
 * Nothing here invents pricing: a fee schedule entry already stores the two
 * amounts side by side (Setup renders them as the **Patient Fee** and
 * **Insurance Fee** columns). This module only decides *which* schedule applies
 * and reads those two numbers back out.
 *
 * ## Which schedule applies
 * `fee_schedule_assignments` rows bind a schedule to any combination of
 * insurance plan / carrier / provider / office / office group / specialty. A row
 * is a candidate when **every key it sets matches** the charge being posted; a
 * row that sets nothing is the practice-wide default. The most specific matching
 * row wins (most keys set), ties broken by the newest row. Below the assignments
 * sit the office's own `default_fee_schedule_id`, then the code's `default_fee`.
 *
 * ## How the split is read
 * `fee = patient_fee`; `insurance_estimate = insurance_fee`; `patient_estimate =
 * fee - insurance_estimate`. That is not a guess — it is what the migrated
 * legacy charges in this database do. Posted procedures line up column-for-column
 * with the schedules that priced them:
 *
 * | posted charge | entry that produced it |
 * | --- | --- |
 * | office 14 `D0120` fee 44.00, ucr 50.00 | fs 24 `patient_fee` 44.00 / fs 34 (UCR) 50.00 |
 * | office 4 `D0120` fee 47.00, ucr 145.00 | fs 25 `patient_fee` 47.00 / fs 4 (UCR) 145.00 |
 * | office 3 `D0120` fee 25.41, ucr 145.00 | fs 28 `patient_fee` 25.41 / fs 4 (UCR) 145.00 |
 *
 * So `patient_fee` is the schedule's fee for the code and `insurance_fee` is a
 * separate payer-side amount (0 in every migrated schedule; set only where staff
 * have entered one). {@link chargeFor} is the single place this is interpreted.
 *
 * ## What this deliberately does NOT do
 * Legacy rows also carry a percentage-derived estimate (`D2393` fee 131.00 →
 * `insurance_estimate` 104.80 = 80%). Reproducing that needs
 * `insurance_coverage_rules.coverage_pct`, which is keyed by legacy *coverage
 * category* codes (`01`, `01A`, `11B`) with no ADA-code mapping exposed by the
 * API — see gap FEE-1. Until that lands, the insurance figure is whatever the
 * fee schedule itself states.
 */

const PAGE = 200;

// ---------------------------------------------------------------------------
// Fee arithmetic — the single place the patient/insurance split is interpreted
// ---------------------------------------------------------------------------

function num(v: string | number | null | undefined): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

/** The charge a fee-schedule entry sets for the code. See the module note. */
export function chargeFor(entry: FeeScheduleEntryRead): number {
  return num(entry.patient_fee);
}

/** The payer-side amount the entry states, if any. */
export function insuranceFor(entry: FeeScheduleEntryRead): number {
  return num(entry.insurance_fee);
}

/** True when an entry carries no usable pricing at all (both columns blank). */
function isBlank(entry: FeeScheduleEntryRead): boolean {
  return entry.patient_fee == null && entry.insurance_fee == null;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export interface FeeScheduleCandidate {
  fee_schedule_id: number;
  name: string;
  fee_type: string | null;
  /** Number of assignment keys matched — higher is more specific. */
  specificity: number;
  /** Human explanation of why this schedule applies, shown in the UI. */
  reason: string;
}

export interface FeeScheduleContext {
  office_id: number | null;
  provider_id: string | null;
  ins_plan_id: number | null;
  carrier_id: number | null;
  office_group_id: number | null;
  /** Most specific first. */
  candidates: FeeScheduleCandidate[];
  /** Office UCR schedule, used to fill `ucr_fee` on the posted procedure. */
  ucr_schedule_id: number | null;
}

export const EMPTY_FEE_CONTEXT: FeeScheduleContext = {
  office_id: null,
  provider_id: null,
  ins_plan_id: null,
  carrier_id: null,
  office_group_id: null,
  candidates: [],
  ucr_schedule_id: null,
};

async function loadAllAssignments(): Promise<FeeScheduleAssignmentRead[]> {
  const first = await listFeeScheduleAssignments({ page: 1, size: PAGE });
  const rows = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;
  for (let p = 2; p <= pages; p++) {
    const res = await listFeeScheduleAssignments({ page: p, size: PAGE }).catch(() => null);
    if (res?.items) rows.push(...res.items);
  }
  return rows;
}

async function loadAllSchedules(): Promise<Map<number, FeeScheduleRead>> {
  const first = await listFeeSchedules({ page: 1, size: PAGE });
  const rows = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;
  for (let p = 2; p <= pages; p++) {
    const res = await listFeeSchedules({ page: p, size: PAGE }).catch(() => null);
    if (res?.items) rows.push(...res.items);
  }
  return new Map(rows.map((s) => [s.id, s]));
}

/** The patient's active primary plan (falls back to any active plan). */
async function resolvePatientPlan(
  patient_id: number,
): Promise<{ ins_plan_id: number | null; carrier_id: number | null }> {
  try {
    const res = await listPatientInsurance({ patient_id, size: 50 });
    const active = (res.items ?? []).filter((r) => r.is_active !== false && r.ins_plan_id != null);
    if (active.length === 0) return { ins_plan_id: null, carrier_id: null };
    const primary = active.find((r) => /prim/i.test(r.insurance_type ?? '')) ?? active[0]!;
    const ins_plan_id = primary.ins_plan_id!;
    const plan = await getInsurancePlan(ins_plan_id).catch(() => null);
    return { ins_plan_id, carrier_id: plan?.carrier_id ?? null };
  } catch {
    return { ins_plan_id: null, carrier_id: null };
  }
}

/** Describe an assignment row in the terms the front desk thinks in. */
function reasonFor(a: FeeScheduleAssignmentRead): string {
  const parts: string[] = [];
  if (a.ins_plan_id != null) parts.push(`plan #${a.ins_plan_id}`);
  if (a.carrier_id != null) parts.push(`carrier #${a.carrier_id}`);
  if (a.provider_id) parts.push(`provider ${a.provider_id}`);
  if (a.office_id != null) parts.push(`office ${a.office_id}`);
  if (a.office_group_id != null) parts.push(`office group ${a.office_group_id}`);
  if (a.specialty_id) parts.push(`specialty ${a.specialty_id}`);
  return parts.length === 0 ? 'practice default' : `assigned to ${parts.join(' + ')}`;
}

/**
 * Everything needed to price any procedure for one patient/office/provider.
 * Load once per screen and reuse for every code — the per-code lookup is cheap.
 */
export async function loadFeeScheduleContext(args: {
  patient_id: number;
  office_id: number | null;
  provider_id?: string | null;
}): Promise<FeeScheduleContext> {
  const { patient_id, office_id, provider_id = null } = args;

  const [plan, office, assignments, schedules] = await Promise.all([
    resolvePatientPlan(patient_id),
    office_id != null ? getOffice(office_id).catch(() => null) : Promise.resolve(null),
    loadAllAssignments().catch(() => [] as FeeScheduleAssignmentRead[]),
    loadAllSchedules().catch(() => new Map<number, FeeScheduleRead>()),
  ]);

  const office_group_id = office?.office_group_id ?? null;

  const ctx = {
    office_id,
    provider_id,
    ins_plan_id: plan.ins_plan_id,
    carrier_id: plan.carrier_id,
    office_group_id,
  };

  // An assignment applies only if every key it pins matches this charge.
  const matches = (a: FeeScheduleAssignmentRead): number | null => {
    let keys = 0;
    const check = (assigned: unknown, actual: unknown): boolean => {
      if (assigned == null) return true;
      keys += 1;
      return assigned === actual;
    };
    const ok =
      check(a.ins_plan_id, ctx.ins_plan_id) &&
      check(a.carrier_id, ctx.carrier_id) &&
      check(a.provider_id, ctx.provider_id) &&
      check(a.office_id, ctx.office_id) &&
      check(a.office_group_id, ctx.office_group_id) &&
      check(a.specialty_id ?? null, null);
    return ok ? keys : null;
  };

  const candidates: FeeScheduleCandidate[] = [];
  const seen = new Set<number>();

  const push = (fee_schedule_id: number, specificity: number, reason: string) => {
    if (seen.has(fee_schedule_id)) return;
    const s = schedules.get(fee_schedule_id);
    // Inactive schedules are retired pricing — never charge from them.
    if (s && s.is_active === false) return;
    seen.add(fee_schedule_id);
    candidates.push({
      fee_schedule_id,
      name: s?.name ?? `Schedule #${fee_schedule_id}`,
      fee_type: s?.fee_type ?? null,
      specificity,
      reason,
    });
  };

  assignments
    .map((a) => ({ a, specificity: matches(a) }))
    .filter((x): x is { a: FeeScheduleAssignmentRead; specificity: number } => x.specificity !== null)
    .sort((x, y) => y.specificity - x.specificity || y.a.id - x.a.id)
    .forEach(({ a, specificity }) => push(a.fee_schedule_id, specificity, reasonFor(a)));

  // The office's own default sits below any assignment that named this office.
  if (office?.default_fee_schedule_id != null) {
    push(office.default_fee_schedule_id, 0, `office ${office.name ?? office_id} default`);
  }

  return {
    ...ctx,
    candidates,
    ucr_schedule_id: office?.default_ucr_fee_schedule_id ?? null,
  };
}

// ---------------------------------------------------------------------------
// Per-code lookup
// ---------------------------------------------------------------------------

/** `${fee_schedule_id}:${procedure_code}` → entries, so re-pricing is instant. */
const entryPromises = new Map<string, Promise<FeeScheduleEntryRead[]>>();
const cacheKey = (fee_schedule_id: number, code: string) => `${fee_schedule_id}:${code}`;

function fetchEntries(fee_schedule_id: number, procedure_code: string): Promise<FeeScheduleEntryRead[]> {
  const key = cacheKey(fee_schedule_id, procedure_code);
  let p = entryPromises.get(key);
  if (!p) {
    p = listFeeScheduleEntries({ fee_schedule_id, procedure_code, size: 50 })
      .then((r) => r.items ?? [])
      .catch(() => [] as FeeScheduleEntryRead[]);
    entryPromises.set(key, p);
  }
  return p;
}

/** Forget cached entries — call after editing fee schedules in Setup. */
export function clearFeeScheduleCache(): void {
  entryPromises.clear();
}

/**
 * Pick the entry in force on `on_date`: the latest `effective_date` that is not
 * in the future, else the earliest entry we have (a schedule dated ahead of the
 * service date is better than no price at all).
 */
function entryInForce(
  entries: FeeScheduleEntryRead[],
  on_date: string | null,
): FeeScheduleEntryRead | null {
  const usable = entries.filter((e) => !isBlank(e));
  if (usable.length === 0) return null;
  const dated = usable
    .filter((e) => e.effective_date)
    .sort((a, b) => (a.effective_date! < b.effective_date! ? 1 : -1));
  if (on_date) {
    const inForce = dated.find((e) => e.effective_date! <= on_date);
    if (inForce) return inForce;
  }
  return dated[dated.length - 1] ?? usable[0]!;
}

export interface ResolvedProcedureFee {
  /** Total charge. */
  fee: number;
  patient_estimate: number;
  insurance_estimate: number;
  /** Office UCR fee for the code, when a UCR schedule is configured. */
  ucr_fee: number | null;
  fee_schedule_id: number | null;
  fee_schedule_name: string | null;
  source: 'fee_schedule' | 'code_default' | 'none';
  /** One-line explanation for the UI, e.g. "UCR -Excel Dental — practice default". */
  reason: string;
  /**
   * Set when another equally-specific assignment prices this code differently,
   * i.e. Setup holds conflicting assignments and the winner is only decided by
   * "newest wins". Worth showing — it is a Setup problem, not a pricing one.
   */
  conflict: string | null;
}

/**
 * Price one procedure code against the loaded context.
 *
 * Falls back to the procedure code's `default_fee` (all patient, no insurance)
 * when no schedule prices the code — the pre-existing behaviour, so a practice
 * with no fee schedules configured is no worse off than before.
 */
export async function resolveProcedureFee(
  ctx: FeeScheduleContext,
  procedure_code: string,
  opts: { default_fee?: string | number | null; on_date?: string | null } = {},
): Promise<ResolvedProcedureFee> {
  const on_date = opts.on_date ?? null;

  const ucrPromise =
    ctx.ucr_schedule_id != null ? fetchEntries(ctx.ucr_schedule_id, procedure_code) : null;

  for (const c of ctx.candidates) {
    const entry = entryInForce(await fetchEntries(c.fee_schedule_id, procedure_code), on_date);
    if (!entry) continue;
    const fee = chargeFor(entry);
    const insurance_estimate = insuranceFor(entry);
    const patient_estimate = Math.max(0, fee - insurance_estimate);
    const ucrEntry = ucrPromise ? entryInForce(await ucrPromise, on_date) : null;

    // Another assignment of equal specificity pricing this code differently means
    // Setup is ambiguous and only "newest wins" separated them.
    let conflict: string | null = null;
    for (const other of ctx.candidates) {
      if (other === c || other.specificity !== c.specificity) continue;
      const rival = entryInForce(await fetchEntries(other.fee_schedule_id, procedure_code), on_date);
      if (rival && chargeFor(rival) !== fee) {
        conflict = `${other.name} (${other.reason}) prices this code at ${chargeFor(rival).toFixed(2)}`;
        break;
      }
    }

    return {
      fee,
      patient_estimate,
      insurance_estimate,
      ucr_fee: ucrEntry ? chargeFor(ucrEntry) : null,
      fee_schedule_id: c.fee_schedule_id,
      fee_schedule_name: c.name,
      source: 'fee_schedule',
      reason: `${c.name} — ${c.reason}`,
      conflict,
    };
  }

  const fallback = num(opts.default_fee);
  return {
    fee: fallback,
    patient_estimate: fallback,
    insurance_estimate: 0,
    ucr_fee: null,
    fee_schedule_id: null,
    fee_schedule_name: null,
    source: fallback > 0 ? 'code_default' : 'none',
    reason:
      fallback > 0
        ? "No fee schedule prices this code — using the code's default fee"
        : 'No fee schedule prices this code and it has no default fee',
    conflict: null,
  };
}
