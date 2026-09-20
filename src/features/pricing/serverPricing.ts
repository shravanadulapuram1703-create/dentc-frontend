// Server-authoritative pricing (docs/pricing Phase F3). The charge screens'
// preview call sites use these; they always price through the server's estimate
// endpoint — the single source of truth that also prices the posted charge, so a
// preview matches what posts. The legacy client resolvers are gone.
//
// `priceProcedureFor` / `resolveProcedureFeeFor` keep the old (feeCtx, …)
// signatures so the call sites did not have to change; they read patient/office
// from the context. A failed/unresolvable estimate returns a safe empty result
// (fee 0, source "none") rather than a client-computed guess.

import { estimatePatientCharges } from '@/api/generated/endpoints/billing/billing';
import type { EstimateLineResult } from '@/api/generated/model';
import { feeSourceLabel } from './provenance';
import type {
  FeeScheduleContext,
  CoverageContext,
  PricedProcedure,
  ResolvedProcedureFee,
} from './pricingContext';

const num = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

interface PriceOpts {
  default_fee?: string | number | null;
  on_date?: string | null;
}

/** Estimate one code for a patient at an office/date; null on any failure. */
async function serverLine(
  patient_id: number,
  office_id: number,
  code: string,
  opts: { on_date?: string | null; provider_id?: string | null },
): Promise<EstimateLineResult | null> {
  try {
    const res = await estimatePatientCharges(
      patient_id,
      { lines: [{ procedure_code: code, ...(opts.provider_id ? { provider_id: opts.provider_id } : {}) }] },
      { office_id, ...(opts.on_date ? { date_of_service: opts.on_date } : {}) },
    );
    return res.lines?.[0] ?? null;
  } catch {
    return null;
  }
}

const UNPRICED: PricedProcedure = {
  fee: 0,
  insurance_estimate: 0,
  patient_estimate: 0,
  coverage_pct: 0,
  ucr_fee: null,
  fee_schedule_id: null,
  fee_schedule_name: null,
  fee_source: 'none',
  fee_reason: 'Pricing unavailable',
  coverage_reason: '',
  fee_conflict: null,
};

/** A server estimate line → the `PricedProcedure` shape the screens render. */
function lineToPriced(line: EstimateLineResult): PricedProcedure {
  const isUnpriced = line.fee_source === 'unpriced';
  const cov = num(line.coverage_pct);
  const catDesc = line.coverage_category_description || line.coverage_category || '';
  return {
    fee: num(line.fee),
    insurance_estimate: num(line.insurance_estimate),
    patient_estimate: num(line.patient_estimate),
    coverage_pct: cov,
    // ucr_fee isn't returned by /estimate; the server stamps it on the posted charge.
    ucr_fee: null,
    fee_schedule_id: line.fee_schedule_id ?? null,
    fee_schedule_name: null,
    fee_source: isUnpriced ? 'none' : 'fee_schedule',
    fee_reason: feeSourceLabel(line.fee_source),
    coverage_reason: cov > 0 ? `${catDesc ? `${catDesc} — ` : ''}${cov}%` : catDesc || '',
    fee_conflict: null,
  };
}

/** Preview the full fee + split for a code (server-priced). */
export async function priceProcedureFor(
  feeCtx: FeeScheduleContext,
  coverageCtx: CoverageContext,
  code: string,
  opts: PriceOpts = {},
): Promise<PricedProcedure> {
  const patient_id = feeCtx.patient_id ?? coverageCtx.patient_id ?? null;
  const office_id = feeCtx.office_id;
  if (patient_id == null || office_id == null) return UNPRICED;
  const line = await serverLine(patient_id, office_id, code, {
    on_date: opts.on_date,
    provider_id: feeCtx.provider_id,
  });
  return line ? lineToPriced(line) : UNPRICED;
}

/** Preview fee-only (server-priced) for the fee-only call sites. */
export async function resolveProcedureFeeFor(
  feeCtx: FeeScheduleContext,
  code: string,
  opts: PriceOpts = {},
): Promise<ResolvedProcedureFee> {
  const patient_id = feeCtx.patient_id;
  const office_id = feeCtx.office_id;
  const empty: ResolvedProcedureFee = {
    fee: 0,
    patient_estimate: 0,
    insurance_estimate: 0,
    ucr_fee: null,
    fee_schedule_id: null,
    fee_schedule_name: null,
    source: 'none',
    reason: 'Pricing unavailable',
    conflict: null,
  };
  if (patient_id == null || office_id == null) return empty;
  const line = await serverLine(patient_id, office_id, code, {
    on_date: opts.on_date,
    provider_id: feeCtx.provider_id,
  });
  if (!line) return empty;
  return {
    fee: num(line.fee),
    patient_estimate: num(line.patient_estimate),
    insurance_estimate: num(line.insurance_estimate),
    ucr_fee: null,
    fee_schedule_id: line.fee_schedule_id ?? null,
    fee_schedule_name: null,
    source: line.fee_source === 'unpriced' ? 'none' : 'fee_schedule',
    reason: feeSourceLabel(line.fee_source),
    conflict: null,
  };
}
