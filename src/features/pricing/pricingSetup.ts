// Typed views over the pricing Setup read endpoints, which the generated client
// returns as `unknown` (the backend publishes no response schema for them).
// Shapes are declared here and cast once at the query boundary:
//   GET /fee-schedules/{id}/usage      → FeeScheduleUsage   (Where-used + can_retire)
//   GET /insurance-plans/{id}/fee-binding → PlanFeeBinding   (which schedule prices a plan)
//   GET /setup/pricing-health          → PricingHealth       (per-office work queues)

import {
  useGetFeeScheduleUsage,
  useGetPricingHealth,
} from '@/api/generated/endpoints/procedures/procedures';
import { useGetInsurancePlanFeeBinding } from '@/api/generated/endpoints/insurance/insurance';

export interface FeeScheduleUsage {
  fee_schedule_id: number;
  name: string;
  is_active: boolean;
  counts: { assignments: number; offices: number; patients: number; entries: number };
  can_retire: boolean;
}

export interface PlanFeeBinding {
  ins_plan_id: number;
  carrier_id: number | null;
  bound: boolean;
  /** How the plan is bound: the payer tier that names it, or null when unbound. */
  via: string | null;
  fee_schedule_id: number | null;
  fee_schedule_name: string | null;
  fee_schedule_active: boolean | null;
  fee_source: string | null;
  assignment_id: number | null;
}

export interface PricingHealthFinding {
  code: string;
  severity: 'error' | 'warning' | 'info' | string;
  /** The Setup screen that owns the fix, e.g. "Setup - Offices - Fee Defaults". */
  screen: string;
  office_id?: number | null;
  office_name?: string | null;
  count?: number | null;
}

export interface PricingHealth {
  findings: PricingHealthFinding[];
  summary: { total: number; by_code: Record<string, number> };
}

/** Where a fee schedule is referenced + whether it can be retired. */
export function useFeeScheduleUsage(scheduleId: number | null | undefined) {
  const { data, isLoading, isError, refetch } = useGetFeeScheduleUsage(scheduleId as number, {
    query: { enabled: scheduleId != null },
  });
  return { usage: (data as FeeScheduleUsage | undefined) ?? null, isLoading, isError, refetch };
}

/** The schedule bound to a plan through the payer tiers (read-only; wizard never picks one). */
export function usePlanFeeBinding(planId: number | null | undefined) {
  const { data, isLoading, isError } = useGetInsurancePlanFeeBinding(planId as number, {
    query: { enabled: planId != null },
  });
  return { binding: (data as PlanFeeBinding | undefined) ?? null, isLoading, isError };
}

/** Coded pricing-setup findings, each naming the owning screen (docs/pricing §3.6). */
export function usePricingHealth() {
  const { data, isLoading, isError, refetch } = useGetPricingHealth(undefined, {
    query: { staleTime: 60 * 1000 },
  });
  const health = (data as PricingHealth | undefined) ?? null;
  return { health, findings: health?.findings ?? [], isLoading, isError, refetch };
}

/** Human labels for the pricing-health finding codes. */
export const HEALTH_FINDING_LABELS: Record<string, string> = {
  office_without_ucr: 'Office has no UCR fee schedule',
  office_without_default: 'Office has no default patient fee schedule',
  assignment_never_reachable: 'Fee-schedule assignment can never match (no target)',
  assignment_to_inactive_schedule: 'Assignment points at a retired schedule',
  insurance_fee_on_percentage_schedule: 'Plan-Pays amount set on a percentage list',
  zero_fee_entries: 'Entries priced at $0 (blank, not marked no-charge)',
  code_without_coverage_category: 'Procedure code has no coverage category',
  code_missing_on_bound_schedule: 'A bound schedule is missing a high-traffic code',
  capitation_plan_without_copay_binding: 'Capitation plan has no copay list bound',
  codes_needing_a_price: 'Codes with no price on any list',
  client_legacy_fees_posted: 'Charges posted with client-entered fees',
  unpriced_charges_posted: 'Charges posted unpriced ($0)',
  legacy_binding_columns_unfolded: 'Legacy fee-binding columns not yet migrated',
};

export function healthFindingLabel(code: string): string {
  return HEALTH_FINDING_LABELS[code] ?? code;
}
