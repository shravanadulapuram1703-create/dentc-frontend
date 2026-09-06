import { resolveProcedureFee, type FeeScheduleContext } from '@/services/feeScheduleResolver';
import { resolveCoverage, splitByCoverage, type CoverageContext } from '@/services/coverageResolver';

/**
 * Price one procedure for the Restorative Chart the way the on-premise product
 * does when an ADA code is picked:
 *
 *   fee                = the fee schedule in force for this patient/office/provider
 *                        (Setup → Insurance → Fee Schedules), else the code default
 *   insurance_estimate = fee × the plan's coverage % for the code's category
 *                        (or the schedule's own insurance amount when it states one)
 *   patient_estimate   = fee − insurance_estimate
 *
 * Both contexts are loaded once per screen; this call is cheap and cached.
 */
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
  /** Setup ambiguity (two equally-specific schedules disagree) — worth showing. */
  fee_conflict: string | null;
}

export async function priceProcedure(
  feeCtx: FeeScheduleContext,
  coverageCtx: CoverageContext,
  procedure_code: string,
  opts: { default_fee?: string | number | null; on_date?: string | null } = {},
): Promise<PricedProcedure> {
  const priced = await resolveProcedureFee(feeCtx, procedure_code, opts);
  const cov = resolveCoverage(coverageCtx, procedure_code);

  // A schedule that states an explicit insurance amount wins over a percentage;
  // otherwise the plan's coverage % is applied to the schedule fee.
  let insurance_estimate = priced.insurance_estimate;
  let patient_estimate = priced.patient_estimate;
  if (insurance_estimate <= 0 && cov.coverage_pct > 0) {
    ({ insurance_estimate, patient_estimate } = splitByCoverage(priced.fee, cov.coverage_pct));
  }

  return {
    fee: priced.fee,
    insurance_estimate,
    patient_estimate,
    coverage_pct: cov.coverage_pct,
    ucr_fee: priced.ucr_fee,
    fee_schedule_id: priced.fee_schedule_id,
    fee_schedule_name: priced.fee_schedule_name,
    fee_source: priced.source,
    fee_reason: priced.reason,
    coverage_reason: cov.reason,
    fee_conflict: priced.conflict,
  };
}

export const money2 = (n: number | string | null | undefined): string => {
  const v = typeof n === 'number' ? n : parseFloat(String(n ?? ''));
  return (Number.isFinite(v) ? v : 0).toFixed(2);
};
