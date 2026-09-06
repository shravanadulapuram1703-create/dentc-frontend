import { listPatientInsurance } from '@/api/generated/endpoints/patients/patients';
import { listInsuranceCoverageRules } from '@/api/generated/endpoints/insurance/insurance';
import type { InsuranceCoverageRuleRead } from '@/api/generated/model';

/**
 * Insurance-estimate side of pricing a procedure: which coverage percentage the
 * patient's plan pays for an ADA code.
 *
 * `insurance_coverage_rules` rows are keyed by the legacy *coverage category*
 * codes (`01` Diagnostic, `01A` Diagnostic: X-Rays, `03` Restorative, `03A`
 * Restorative: Crowns, …) rather than ADA codes, and the API exposes no
 * ADA→category map (gap FEE-1; the backend `/patients/{id}/estimate` endpoint
 * returns `coverage_pct: 0` for every code for the same reason). The on-premise
 * product resolves this with a fixed CDT-range → category table, which is what
 * {@link coverageCategoriesFor} reproduces: each ADA code maps to its most
 * specific category first (`D2740` → `03A` then `03`), and the first category the
 * plan actually has a rule for wins.
 *
 * Rules whose `start_code`/`end_code` are real ADA codes (a plan set up by code
 * range) are honoured first, so a backend that starts emitting code-keyed rules
 * needs no change here.
 *
 * Deductibles, annual maximums, frequency and age limits are NOT applied — the
 * figure is `fee × coverage_pct`, exactly the legacy "Est. Ins." column.
 */

export interface CoverageContext {
  patient_id: number;
  ins_plan_id: number | null;
  has_coverage: boolean;
  rules: InsuranceCoverageRuleRead[];
}

export const EMPTY_COVERAGE_CONTEXT: CoverageContext = {
  patient_id: 0,
  ins_plan_id: null,
  has_coverage: false,
  rules: [],
};

/** Legacy coverage categories, most specific ranges first. */
const CDT_CATEGORIES: { cat: string; label: string; ranges: [string, string][] }[] = [
  // Diagnostic sub-categories
  { cat: '01B', label: 'Diagnostic: Panoramic X-Rays', ranges: [['D0330', 'D0330']] },
  { cat: '01C', label: 'Diagnostic: X-Rays - PAs', ranges: [['D0220', 'D0230']] },
  { cat: '01D', label: 'Diagnostic: X-Rays - Bitewings', ranges: [['D0270', 'D0277']] },
  { cat: '01E', label: 'Diagnostic: X-Rays - Cone Beam', ranges: [['D0364', 'D0368'], ['D0380', 'D0386']] },
  { cat: '01A', label: 'Diagnostic: X-Rays', ranges: [['D0210', 'D0399']] },
  // Preventive sub-categories
  { cat: '02A', label: 'Preventive: Sealants', ranges: [['D1351', 'D1353']] },
  { cat: '02B', label: 'Preventive: Space Maint', ranges: [['D1510', 'D1575']] },
  // Restorative sub-categories
  { cat: '03A', label: 'Restorative: Crowns', ranges: [['D2710', 'D2799']] },
  { cat: '03B', label: 'Restorative: Build Up', ranges: [['D2950', 'D2954']] },
  // Endodontics sub-categories
  { cat: '04A', label: 'Endodontics: Molar', ranges: [['D3330', 'D3330'], ['D3348', 'D3348'], ['D3353', 'D3353']] },
  // Periodontics sub-categories
  { cat: '05A', label: 'Periodontics: Osseous Surgery', ranges: [['D4260', 'D4261']] },
  { cat: '05B', label: 'Periodontics: Arestin', ranges: [['D4381', 'D4381']] },
  // Oral surgery sub-categories
  { cat: '06A', label: 'Oral Surgery: Impactions', ranges: [['D7220', 'D7241']] },
  // Implant sub-categories
  { cat: '09A', label: 'Implants: Crowns', ranges: [['D6055', 'D6094']] },
  // Adjunctive sub-categories
  { cat: '11A', label: 'Gen Adjunctive: Anesthesia', ranges: [['D9210', 'D9248']] },
  { cat: '11B', label: 'Gen Adjunctive: Biteguard/Nightguard', ranges: [['D9940', 'D9944']] },
  // Top-level categories
  { cat: '01', label: 'Diagnostic', ranges: [['D0100', 'D0999']] },
  { cat: '02', label: 'Preventive', ranges: [['D1000', 'D1999']] },
  { cat: '07', label: 'Prosthodontics (fix/rem), Inlays, Onlays', ranges: [['D2510', 'D2664'], ['D5000', 'D5899'], ['D6200', 'D6999']] },
  { cat: '03', label: 'Restorative', ranges: [['D2000', 'D2999']] },
  { cat: '04', label: 'Endodontics', ranges: [['D3000', 'D3999']] },
  { cat: '05', label: 'Periodontics', ranges: [['D4000', 'D4999']] },
  { cat: '08', label: 'Maxillofacial Prosthetics', ranges: [['D5900', 'D5999']] },
  { cat: '09', label: 'Implants', ranges: [['D6000', 'D6199']] },
  { cat: '06', label: 'Oral Surgery', ranges: [['D7000', 'D7999']] },
  { cat: '10', label: 'Orthodontics', ranges: [['D8000', 'D8999']] },
  { cat: '11', label: 'Gen Adjunctive', ranges: [['D9000', 'D9999']] },
];

const ADA_CODE = /^D\d{4}/i;

/** Normalise an ADA code for range comparison: upper-case, first 5 chars (drops AMB "A" suffix). */
function adaKey(code: string): string | null {
  const m = ADA_CODE.exec(code.trim().toUpperCase());
  return m ? m[0] : null;
}

/** Legacy coverage category codes an ADA code belongs to, most specific first. */
export function coverageCategoriesFor(procedure_code: string): { cat: string; label: string }[] {
  const key = adaKey(procedure_code);
  if (!key) return [];
  return CDT_CATEGORIES.filter((c) => c.ranges.some(([lo, hi]) => key >= lo && key <= hi)).map(({ cat, label }) => ({ cat, label }));
}

/** The patient's active primary plan (falls back to any active plan). */
async function resolvePrimaryPlanId(patient_id: number): Promise<number | null> {
  const res = await listPatientInsurance({ patient_id, size: 50 });
  const active = (res.items ?? []).filter((r) => r.is_active !== false && r.ins_plan_id != null);
  if (active.length === 0) return null;
  const primary = active.find((r) => /prim/i.test(r.insurance_type ?? '')) ?? active[0]!;
  return primary.ins_plan_id ?? null;
}

const PAGE = 200;

/**
 * Load the coverage rules of the patient's primary plan once per screen; the
 * per-code lookup ({@link resolveCoverage}) is then synchronous.
 */
export async function loadCoverageContext(args: { patient_id: number }): Promise<CoverageContext> {
  const { patient_id } = args;
  try {
    const ins_plan_id = await resolvePrimaryPlanId(patient_id);
    if (ins_plan_id == null) return { patient_id, ins_plan_id: null, has_coverage: false, rules: [] };
    const first = await listInsuranceCoverageRules({ ins_plan_id, page: 1, size: PAGE });
    const rules = [...(first.items ?? [])];
    const pages = first.meta?.pages ?? 1;
    for (let p = 2; p <= pages; p++) {
      const res = await listInsuranceCoverageRules({ ins_plan_id, page: p, size: PAGE }).catch(() => null);
      if (res?.items) rules.push(...res.items);
    }
    // FREQ LIMITATION CODE GRP rows share this table under a reserved
    // convention (category "FREQGRP", code "FQ…") — they carry no coverage %.
    const coverageOnly = rules.filter(
      (r) => (r.category ?? '').trim().toUpperCase() !== 'FREQGRP' && !(r.start_code ?? '').toUpperCase().startsWith('FQ'),
    );
    return { patient_id, ins_plan_id, has_coverage: true, rules: coverageOnly };
  } catch {
    return { patient_id, ins_plan_id: null, has_coverage: false, rules: [] };
  }
}

export interface ResolvedCoverage {
  /** 0–100. */
  coverage_pct: number;
  /** Legacy coverage category (or ADA range) the rule was matched on. */
  rule_code: string | null;
  rule_description: string | null;
  ded_waived: boolean;
  /** One-line explanation for the UI. */
  reason: string;
}

function pct(v: string | number | null | undefined): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

/** Coverage percentage the patient's plan pays for `procedure_code`. */
export function resolveCoverage(ctx: CoverageContext, procedure_code: string): ResolvedCoverage {
  if (!ctx.has_coverage || ctx.ins_plan_id == null) {
    return { coverage_pct: 0, rule_code: null, rule_description: null, ded_waived: false, reason: 'No active insurance plan on file' };
  }
  const key = adaKey(procedure_code);

  // 1. Rules expressed as ADA code ranges (most specific = narrowest range).
  if (key) {
    const width = (r: InsuranceCoverageRuleRead) =>
      parseInt((r.end_code ?? r.start_code ?? '').slice(1), 10) - parseInt((r.start_code ?? '').slice(1), 10);
    const byCode = ctx.rules
      .filter((r) => ADA_CODE.test(r.start_code ?? '') && key >= (r.start_code ?? '').toUpperCase() && key <= (r.end_code ?? r.start_code ?? '').toUpperCase())
      .sort((a, b) => width(a) - width(b));
    const hit = byCode[0];
    if (hit) {
      return {
        coverage_pct: pct(hit.coverage_pct), rule_code: hit.start_code ?? null, rule_description: hit.description ?? null,
        ded_waived: !!hit.ded_waived, reason: `${hit.description ?? `${hit.start_code}–${hit.end_code}`} — ${pct(hit.coverage_pct)}%`,
      };
    }
  }

  // 2. Legacy coverage-category rules, most specific category first.
  const cats = coverageCategoriesFor(procedure_code);
  for (const c of cats) {
    const rule = ctx.rules.find((r) => (r.start_code ?? '').trim().toUpperCase() === c.cat);
    if (rule) {
      return {
        coverage_pct: pct(rule.coverage_pct), rule_code: c.cat, rule_description: rule.description ?? c.label,
        ded_waived: !!rule.ded_waived, reason: `${rule.description ?? c.label} (${c.cat}) — ${pct(rule.coverage_pct)}%`,
      };
    }
  }
  return {
    coverage_pct: 0, rule_code: null, rule_description: null, ded_waived: false,
    reason: cats.length ? `Plan has no coverage rule for ${cats[cats.length - 1]!.label}` : 'Not an ADA code — no coverage category',
  };
}

/** Split a fee by coverage percentage (rounded to cents). */
export function splitByCoverage(fee: number, coverage_pct: number): { insurance_estimate: number; patient_estimate: number } {
  const ins = Math.round(Math.max(0, fee) * (Math.min(100, Math.max(0, coverage_pct)) / 100) * 100) / 100;
  return { insurance_estimate: ins, patient_estimate: Math.round((Math.max(0, fee) - ins) * 100) / 100 };
}
