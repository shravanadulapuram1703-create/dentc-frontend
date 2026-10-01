// Server-authoritative pricing — provenance model + one-line formatter.
//
// Under the target architecture (docs/pricing/pricing_hierarchy_architecture.md)
// the SERVER prices every charge and returns *why* it landed on a number:
// which schedule, which tier, the coverage %, the deductible consumed, the UCR
// list and the expected write-off, plus any warnings. The frontend stops
// computing money and simply RENDERS this provenance next to the charge.
//
// This module is the single seam for that display. It is deliberately built
// against a hand-written superset shape (`PricingProvenance`) rather than one
// generated response type, because the server surface arrives in stages: today
// `POST /patients/{id}/estimate` returns the v1-shaped `EstimateLineResult`
// (no UCR, no write-off, no warnings, legacy `fee_source` values); after the
// `api:sync` for PRICING_ENGINE_V2 it will carry the full set. The adapters
// below normalise whatever is available, so a screen wired to the estimate
// endpoint renders correctly now and gains the extra facts for free later.
//
// Rendered by the charge screens' provenance UI (gap report groups B / FE-PR-14).

import type { EstimateLineResult } from '@/api/generated/model';

/**
 * Everything the UI needs to explain a priced line. Every money/coverage field is
 * optional so a partial (v1) estimate renders what it has and a full (v2) result
 * renders the rest — never assume a field is present.
 */
export interface PricingProvenance {
  /** Resolved allowed amount posted as the charge fee. */
  fee: number;
  fee_schedule_id?: number | null;
  fee_schedule_name?: string | null;
  /** Precedence-card tier that priced the line (v1 or v2 `fee_source` code). */
  fee_source?: string | null;
  /** Latest effective date of the entry in force, ISO (v2). */
  fee_effective_date?: string | null;
  /** 0–100. */
  coverage_pct?: number | null;
  coverage_category?: string | null;
  coverage_category_description?: string | null;
  /** Primary dental plan name, when known. */
  plan_name?: string | null;
  insurance_estimate?: number | null;
  patient_estimate?: number | null;
  estimated_deductible?: number | null;
  /** Office UCR fee for the code (v2). */
  ucr_fee?: number | null;
  /** `ucr_fee - fee`; null when the office has no UCR list (v2). */
  expected_write_off?: number | null;
  /** True when no tier priced the code (office policy `flag`). */
  is_unpriced?: boolean;
  /** Coded/human warnings from the resolver (e.g. code missing on the bound schedule). */
  warnings?: string[];
}

/**
 * Human labels for every `fee_source` the server can return — both the current
 * (v1) values and the target (v2) precedence-card values, so the display is
 * correct before and after the engine flip.
 */
export const FEE_SOURCE_LABELS: Record<string, string> = {
  // Target (v2) precedence card — docs/pricing §3.1 FEE_SOURCES.
  override: 'manual override',
  client_legacy: 'client-entered (legacy)',
  assignment_plan: 'plan fee schedule',
  assignment_carrier: 'carrier fee schedule',
  patient_schedule: 'patient list',
  assignment_provider: 'provider fee schedule',
  office_default: 'office default list',
  office_ucr: 'office UCR list',
  unpriced: 'unpriced',
  plan_item: 'planned fee',
  migrated: 'migrated (as posted)',
  // Current (v1) resolver values, still emitted by the dark engine.
  assignment: 'fee-schedule assignment',
  plan_schedule: 'plan fee schedule',
  code_default: 'code default fee',
};

/** Label a `fee_source`, falling back to the raw code so nothing renders blank. */
export function feeSourceLabel(source: string | null | undefined): string {
  if (!source) return 'unknown';
  return FEE_SOURCE_LABELS[source] ?? source;
}

const money = (n: number | null | undefined): string =>
  typeof n === 'number' && Number.isFinite(n) ? n.toFixed(2) : '—';

/**
 * The one-line provenance string, e.g.
 * "44.00 from CP-40 · patient list · Ins 80% Diagnostic on Delta PPO · ded 0.00 · UCR 50.00 · write-off 6.00".
 * Only the parts actually present are joined, so a v1 estimate produces a shorter
 * (but correct) line than a v2 one.
 */
export function formatProvenance(p: PricingProvenance): string {
  const parts: string[] = [];

  if (p.is_unpriced) {
    parts.push(`unpriced (${money(p.fee)})`);
  } else {
    const from = p.fee_schedule_name ? ` from ${p.fee_schedule_name}` : '';
    parts.push(`${money(p.fee)}${from}`);
  }

  if (p.fee_source) parts.push(feeSourceLabel(p.fee_source));

  if (p.coverage_pct != null && p.coverage_pct > 0) {
    const cat = p.coverage_category_description || p.coverage_category || '';
    const plan = p.plan_name ? ` on ${p.plan_name}` : '';
    parts.push(`Ins ${p.coverage_pct}%${cat ? ` ${cat}` : ''}${plan}`.trim());
  }

  if (p.estimated_deductible != null) parts.push(`ded ${money(p.estimated_deductible)}`);
  if (p.ucr_fee != null) parts.push(`UCR ${money(p.ucr_fee)}`);
  if (p.expected_write_off != null) parts.push(`write-off ${money(p.expected_write_off)}`);

  return parts.join(' · ');
}

const toNum = (v: string | number | null | undefined): number | null => {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Normalise one `EstimateLineResult` (the response of
 * `POST /patients/{id}/estimate`) into a `PricingProvenance`. v2-only fields
 * (UCR, write-off, effective date, warnings) are filled once the synced result
 * carries them — add them here, no screen change needed.
 */
export function provenanceFromEstimateLine(
  line: EstimateLineResult,
  extra?: Partial<PricingProvenance>,
): PricingProvenance {
  return {
    fee: toNum(line.fee) ?? 0,
    fee_schedule_id: line.fee_schedule_id ?? null,
    fee_source: line.fee_source ?? null,
    coverage_pct: toNum(line.coverage_pct),
    coverage_category: line.coverage_category ?? null,
    coverage_category_description: line.coverage_category_description ?? null,
    insurance_estimate: toNum(line.insurance_estimate),
    patient_estimate: toNum(line.patient_estimate),
    estimated_deductible: toNum(line.estimated_deductible),
    is_unpriced: line.fee_source === 'unpriced',
    ...extra,
  };
}
