// Pricing context shapes + lightweight loaders (docs/pricing Phase F3).
//
// The heavy client resolvers are retired: the SERVER prices every charge now, so
// a "context" is just the patient / office / provider a screen is charging under.
// These loaders replace the old `loadFeeScheduleContext` / `loadCoverageContext`
// (which walked assignments and coverage rules in the browser) with a trivial
// package of those ids — the call sites are unchanged, but no client pricing
// data is fetched. The context types keep their old field shape so existing
// consumers (e.g. EditTreatmentModal's memo key) still compile.

import type { InsuranceCoverageRuleRead } from '@/api/generated/model';

export interface FeeScheduleCandidate {
  fee_schedule_id: number;
  name?: string;
}

export interface FeeScheduleContext {
  patient_id: number | null;
  office_id: number | null;
  provider_id: string | null;
  ins_plan_id: number | null;
  carrier_id: number | null;
  office_group_id: number | null;
  /** Empty under server pricing — kept for shape compatibility. */
  candidates: FeeScheduleCandidate[];
  ucr_schedule_id: number | null;
}

export interface CoverageContext {
  patient_id: number;
  ins_plan_id: number | null;
  has_coverage: boolean;
  rules: InsuranceCoverageRuleRead[];
}

export const EMPTY_FEE_CONTEXT: FeeScheduleContext = {
  patient_id: null,
  office_id: null,
  provider_id: null,
  ins_plan_id: null,
  carrier_id: null,
  office_group_id: null,
  candidates: [],
  ucr_schedule_id: null,
};

export const EMPTY_COVERAGE_CONTEXT: CoverageContext = {
  patient_id: 0,
  ins_plan_id: null,
  has_coverage: false,
  rules: [],
};

/** Package the patient/office/provider the server needs to price a charge. */
export async function loadFeeScheduleContext(args: {
  patient_id: number;
  office_id: number | null;
  provider_id?: string | null;
}): Promise<FeeScheduleContext> {
  return {
    ...EMPTY_FEE_CONTEXT,
    patient_id: args.patient_id,
    office_id: args.office_id,
    provider_id: args.provider_id ?? null,
  };
}

/** The server resolves coverage; this just records the patient. */
export async function loadCoverageContext(args: { patient_id: number }): Promise<CoverageContext> {
  return { ...EMPTY_COVERAGE_CONTEXT, patient_id: args.patient_id };
}

// --- Result shapes the charge screens render (moved from procedurePricing) ----

export interface PricedProcedure {
  fee: number;
  insurance_estimate: number;
  patient_estimate: number;
  coverage_pct: number;
  ucr_fee: number | null;
  fee_schedule_id: number | null;
  fee_schedule_name: string | null;
  fee_source: 'fee_schedule' | 'code_default' | 'none';
  fee_reason: string;
  coverage_reason: string;
  fee_conflict: string | null;
}

export interface ResolvedProcedureFee {
  fee: number;
  patient_estimate: number;
  insurance_estimate: number;
  ucr_fee: number | null;
  fee_schedule_id: number | null;
  fee_schedule_name: string | null;
  source: 'fee_schedule' | 'code_default' | 'none';
  reason: string;
  conflict: string | null;
}

export const money2 = (n: number | string | null | undefined): string => {
  const v = typeof n === 'number' ? n : parseFloat(String(n ?? ''));
  return (Number.isFinite(v) ? v : 0).toFixed(2);
};
