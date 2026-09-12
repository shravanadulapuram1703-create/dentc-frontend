// INSURANCE DETAILS wizard — load / save orchestration over the generated
// client (no raw axios).
//
// A plan's details span two stores:
//   1. `insurance_plans`            — every PLAN + BENEFITS field (the nine
//                                     legacy fields of PLAN-DTL-1 are columns
//                                     since 2026-09; values typed before that
//                                     are read once from the browser fallback
//                                     and written to the server on next save)
//   2. `insurance_coverage_rules`   — COVERAGE & LIMITATIONS rows (category +
//                                     per-code exceptions) AND, under the
//                                     reserved FREQGRP convention, the FREQ
//                                     LIMITATION CODE GRP rows
//
// Saving is a diff: rows removed in the UI are DELETEd, changed rows PATCHed,
// new rows POSTed. Per-row failures don't abort the save — they are collected
// in `issues` so the user sees exactly what didn't land.

import {
  getInsurancePlan,
  createInsurancePlan,
  updateInsurancePlan,
  listInsuranceCoverageRules,
  createInsuranceCoverageRule,
  updateInsuranceCoverageRule,
  deleteInsuranceCoverageRule,
  listInsCustomCoverage,
} from "@/api/generated/endpoints/insurance/insurance";
import type { InsurancePlanRead, InsuranceCoverageRuleRead, InsuranceCarrierRead, EmployerRead } from "@/api/generated/model";
import { planToForm, buildPlanCreate, buildPlanUpdate, planHasNoExtras } from "../planData";
import { ensureCarrierRecords, carrierRecord, ensureEmployerNames, employerName } from "../lookupService";
import {
  type PlanDetailsForm,
  type CoverageRow,
  type FreqCodeGroupRow,
  type CoverageCategoryDef,
  isFreqGroupRule,
  ruleToCoverageRow,
  ruleToFreqGroupRow,
  buildCoverageRowCreate,
  buildCoverageRowUpdate,
  buildFreqGroupCreate,
  buildFreqGroupUpdate,
  coverageRowEquals,
  freqGroupRowEquals,
  sortCoverageRows,
} from "./planDetailsModel";
import { hasLegacyPlanExtras, loadPlanExtras, removePlanExtras } from "./planExtrasStore";
import { loadPlanLookups } from "./planLookups";

const PAGE = 200;

/** All coverage-rule rows of a plan (paged at the 200 cap). */
export async function loadAllRules(ins_plan_id: number): Promise<InsuranceCoverageRuleRead[]> {
  const first = await listInsuranceCoverageRules({ ins_plan_id, page: 1, size: PAGE, sort: "start_code", order: "asc" });
  const rules = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;
  for (let p = 2; p <= pages; p++) {
    const res = await listInsuranceCoverageRules({ ins_plan_id, page: p, size: PAGE, sort: "start_code", order: "asc" });
    rules.push(...(res.items ?? []));
  }
  // Defensive: the plan filter is server-side, but never trust a row for another plan.
  return rules.filter((r) => r.ins_plan_id === ins_plan_id);
}

export interface PlanDetailsBundle {
  plan: InsurancePlanRead | null;
  form: PlanDetailsForm;
  carrier: InsuranceCarrierRead | null;
  employer_label: string;
  coverage_rows: CoverageRow[];
  freq_rows: FreqCodeGroupRow[];
}

/** Split raw rules into the two tabs' rows. */
export function splitRules(rules: InsuranceCoverageRuleRead[], categories: CoverageCategoryDef[]) {
  const label = (code: string) => categories.find((c) => c.code === code)?.label ?? code;
  const coverage_rows: CoverageRow[] = [];
  const freq_rows: FreqCodeGroupRow[] = [];
  for (const r of rules) {
    if (isFreqGroupRule(r)) freq_rows.push(ruleToFreqGroupRow(r));
    else coverage_rows.push(ruleToCoverageRow(r, label));
  }
  return { coverage_rows: sortCoverageRows(coverage_rows), freq_rows };
}

/** Load an existing plan for editing / viewing / copying. */
export async function loadPlanDetails(plan_id: number): Promise<PlanDetailsBundle> {
  const [plan, rules, lookups] = await Promise.all([getInsurancePlan(plan_id), loadAllRules(plan_id), loadPlanLookups()]);
  await Promise.all([
    ensureCarrierRecords([plan.carrier_id]),
    plan.employer_id != null ? ensureEmployerNames([plan.employer_id]) : Promise.resolve(),
  ]);
  const { coverage_rows, freq_rows } = splitRules(rules, lookups.categories);
  // Legacy fallback: a plan whose new columns are all empty but that has
  // values in this browser's old store shows those values, so nothing typed
  // before the columns existed is lost; the next Finish writes them server-side.
  const form = planToForm(plan);
  const legacy = planHasNoExtras(plan) && hasLegacyPlanExtras(plan.id) ? loadPlanExtras(plan.id) : null;
  return {
    plan,
    form: legacy ? { ...form, ...legacy } : form,
    carrier: carrierRecord(plan.carrier_id) ?? null,
    employer_label: plan.employer_id != null ? employerName(plan.employer_id) : "",
    coverage_rows,
    freq_rows,
  };
}

/** Rows seeded from Setup → Insurance → Custom Coverage (tenant-wide defaults). */
export async function loadCustomCoverageRows(): Promise<CoverageRow[]> {
  const first = await listInsCustomCoverage({ size: PAGE, page: 1, sort: "start_code", order: "asc" });
  const items = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;
  for (let p = 2; p <= pages; p++) {
    const res = await listInsCustomCoverage({ size: PAGE, page: p, sort: "start_code", order: "asc" });
    items.push(...(res.items ?? []));
  }
  return items.map((c) => ({
    id: null,
    kind: /^D\d{4}/i.test(c.start_code) ? "code" : "category",
    code: c.start_code.trim().toUpperCase(),
    parent_code: "",
    description: (c.description ?? "").trim(),
    ded_waived: !!c.ded_waived,
    coverage_pct: (c.coverage_pct ?? "0").toString(),
    freq_limit: "0",
    age_min: "0",
    age_max: "0",
    wait_period: "0",
  }));
}

export interface SavePlanDetailsArgs {
  /** null → create. */
  plan_id: number | null;
  form: PlanDetailsForm;
  coverage_rows: CoverageRow[];
  freq_rows: FreqCodeGroupRow[];
  /** Rows as loaded — the diff baseline (empty on create). */
  original_coverage_rows: CoverageRow[];
  original_freq_rows: FreqCodeGroupRow[];
  /** Labels for FREQGRP descriptions. */
  code_group_label: (code: string) => string;
}

export interface SavePlanDetailsResult {
  plan: InsurancePlanRead;
  /** Human-readable per-row failures (empty = everything landed). */
  issues: string[];
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function savePlanDetails(args: SavePlanDetailsArgs): Promise<SavePlanDetailsResult> {
  const issues: string[] = [];

  // 1) The plan itself — this one MUST succeed; everything else hangs off its id.
  let plan: InsurancePlanRead;
  if (args.plan_id == null) {
    plan = await createInsurancePlan(buildPlanCreate(args.form));
  } else {
    plan = await updateInsurancePlan(args.plan_id, buildPlanUpdate(args.form));
  }
  const ins_plan_id = plan.id;
  // Everything is on the server now — drop the pre-column browser copy.
  removePlanExtras(ins_plan_id);

  // 2) Coverage rows (diff).
  const origById = new Map(args.original_coverage_rows.filter((r) => r.id != null).map((r) => [r.id as number, r]));
  const keptIds = new Set<number>();
  for (const row of args.coverage_rows) {
    const label = row.kind === "category" ? `${row.code} ${row.description}` : row.code;
    try {
      if (row.id == null) {
        await createInsuranceCoverageRule(buildCoverageRowCreate(ins_plan_id, row));
      } else {
        keptIds.add(row.id);
        const before = origById.get(row.id);
        if (!before || !coverageRowEquals(before, row)) {
          await updateInsuranceCoverageRule(row.id, buildCoverageRowUpdate(row));
        }
      }
    } catch (e) {
      issues.push(`Coverage row ${label}: ${errMsg(e)}`);
    }
  }
  for (const [id, before] of origById) {
    if (keptIds.has(id)) continue;
    try {
      await deleteInsuranceCoverageRule(id);
    } catch (e) {
      issues.push(`Remove coverage row ${before.code}: ${errMsg(e)}`);
    }
  }

  // 3) Frequency code-group rows (diff, FREQGRP convention).
  const origFreqById = new Map(args.original_freq_rows.filter((r) => r.id != null).map((r) => [r.id as number, r]));
  const keptFreq = new Set<number>();
  for (const row of args.freq_rows) {
    const label = args.code_group_label(row.code_group);
    try {
      if (row.id == null) {
        await createInsuranceCoverageRule(buildFreqGroupCreate(ins_plan_id, row, label));
      } else {
        keptFreq.add(row.id);
        const before = origFreqById.get(row.id);
        if (!before || !freqGroupRowEquals(before, row)) {
          await updateInsuranceCoverageRule(row.id, buildFreqGroupUpdate(row, label));
        }
      }
    } catch (e) {
      issues.push(`Frequency group ${label}: ${errMsg(e)}`);
    }
  }
  for (const [id, before] of origFreqById) {
    if (keptFreq.has(id)) continue;
    try {
      await deleteInsuranceCoverageRule(id);
    } catch (e) {
      issues.push(`Remove frequency group ${before.code_group}: ${errMsg(e)}`);
    }
  }

  return { plan, issues };
}

export interface CopiedPlanDetails {
  form: PlanDetailsForm;
  carrier: InsuranceCarrierRead | null;
  employer_label: string;
  coverage_rows: CoverageRow[];
  freq_rows: FreqCodeGroupRow[];
}

/** "Copy From Existing": everything from the source plan, with row ids cleared. */
export async function copyPlanDetails(source_plan_id: number): Promise<CopiedPlanDetails> {
  const b = await loadPlanDetails(source_plan_id);
  return {
    form: { ...b.form, is_active: true },
    carrier: b.carrier,
    employer_label: b.employer_label,
    coverage_rows: b.coverage_rows.map((r) => ({ ...r, id: null })),
    freq_rows: b.freq_rows.map((r) => ({ ...r, id: null })),
  };
}

// Re-exported for the "Copy" and "View Details" affordances.
export type { InsuranceCarrierRead, EmployerRead };
