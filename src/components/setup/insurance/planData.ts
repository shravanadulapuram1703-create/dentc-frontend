// Insurance Plans + Coverage — form models.
//
// Per project convention (CLAUDE.md), forms bind DIRECTLY to the backend's
// snake_case field names — no camelCase aliases, no mapper. Keys mirror
// InsurancePlanRead/Update, InsuranceCoverageRuleRead/Update and
// InsCustomCoverageRead/Update exactly.

import type {
  InsurancePlanRead,
  InsurancePlanCreate,
  InsurancePlanUpdate,
  InsuranceCoverageRuleRead,
  InsuranceCoverageRuleCreate,
  InsuranceCoverageRuleUpdate,
  InsCustomCoverageRead,
  InsCustomCoverageCreate,
  InsCustomCoverageUpdate,
} from "@/api/generated/model";

// Coverage-type codes seen in the data (single-letter). Free-text fallback kept.
export const COVERAGE_TYPE_OPTIONS = ["I", "F", "C"]; // Individual / Family / Combined

// ---------------------------------------------------------------------------
// Dental / Medical category
// ---------------------------------------------------------------------------
// `insurance_plans` has NO dental/medical column — the category lives on the
// CARRIER (`carrier_type` "True" = Dental / "False" = Medical, surfaced as the
// derived `is_dental`). The plan form still shows it as its first, mandatory
// field (legacy parity) and uses it to scope the carrier picker.
// Structurally identical to the patient module's `InsCategory` so the two
// interoperate without a mapper.

export type PlanCategory = "D" | "M";

export const PLAN_CATEGORY_LABEL: Record<PlanCategory, string> = { D: "Dental", M: "Medical" };

/** The category implied by a carrier record (unknown carrier → Dental). */
export function categoryForCarrier(c: { is_dental?: boolean | null } | undefined | null): PlanCategory {
  return c?.is_dental === false ? "M" : "D";
}

// ---------------------------------------------------------------------------
// Plan form
// ---------------------------------------------------------------------------

/** Plans have no `name`: identified by carrier + employer + group + plan_type. */
export interface PlanForm {
  carrier_id: number | null;
  employer_id: number | null;
  group_number: string;
  plan_type: string;
  coverage_type: string;
  is_prepaid: boolean;
  individual_max: string;
  individual_deductible: string;
  ortho_max: string;
  family_max: string;
  family_deductible: string;
  anniversary_date: string;
  is_active: boolean;
}

export function emptyPlanForm(): PlanForm {
  return {
    carrier_id: null,
    employer_id: null,
    group_number: "",
    plan_type: "",
    coverage_type: "",
    is_prepaid: false,
    individual_max: "",
    individual_deductible: "",
    ortho_max: "",
    family_max: "",
    family_deductible: "",
    anniversary_date: "",
    is_active: true,
  };
}

export function planToForm(p: InsurancePlanRead): PlanForm {
  return {
    carrier_id: p.carrier_id ?? null,
    employer_id: p.employer_id ?? null,
    group_number: p.group_number ?? "",
    plan_type: p.plan_type ?? "",
    coverage_type: p.coverage_type ?? "",
    is_prepaid: p.is_prepaid ?? false,
    individual_max: p.individual_max ?? "",
    individual_deductible: p.individual_deductible ?? "",
    ortho_max: p.ortho_max ?? "",
    family_max: p.family_max ?? "",
    family_deductible: p.family_deductible ?? "",
    anniversary_date: p.anniversary_date ?? "",
    is_active: p.is_active ?? true,
  };
}

// Money fields are decimal strings on the contract; send null when blank.
function money(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

// ---------------------------------------------------------------------------
// Coverage-rule limits — typed columns (2026-09-07 spec)
//
// `insurance_coverage_rules` now carries typed limits (`freq_limit` integer
// ordinal, `age_min` / `age_max` / `wait_months` integers) next to the legacy
// string mirrors (`age_limit` "min-max", `wait_period` months). The backend
// documents that the typed limits win over the mirrors, so every write sends
// the typed values (plus the mirrors, so legacy readers stay consistent) and
// every read prefers a typed value when it is non-null.
// ---------------------------------------------------------------------------

/** UI keeps the frequency ordinal as a string ("0" = No Limitation); the API stores an integer. */
export function freqLimitToApi(v: string | number | null | undefined): number {
  const n = typeof v === "number" ? v : Number.parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Whole non-negative integer from a form string; ""/junk → null. */
export function intOrNull(v: string | number | null | undefined): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? Math.trunc(v) : null;
  const m = /^\d+/.exec(String(v ?? "").trim());
  return m ? Number.parseInt(m[0], 10) : null;
}

/** Legacy `age_limit` mirror ("min", "min-max", "0"/"" = none) → typed columns. */
export function ageLimitToApi(v: string | null | undefined): { age_min: number | null; age_max: number | null } {
  const t = (v ?? "").trim();
  if (t === "" || t === "0") return { age_min: null, age_max: null };
  const m = /^(\d*)\s*-\s*(\d*)$/.exec(t);
  if (m) return { age_min: m[1] ? Number(m[1]) : null, age_max: m[2] ? Number(m[2]) : null };
  return { age_min: /^\d+$/.test(t) ? Number(t) : null, age_max: null };
}

function planCommonBody(f: PlanForm) {
  return {
    employer_id: f.employer_id,
    group_number: f.group_number.trim() || null,
    plan_type: f.plan_type.trim() || null,
    coverage_type: f.coverage_type.trim() || null,
    is_prepaid: f.is_prepaid,
    individual_max: money(f.individual_max),
    individual_deductible: money(f.individual_deductible),
    ortho_max: money(f.ortho_max),
    family_max: money(f.family_max),
    family_deductible: money(f.family_deductible),
    anniversary_date: f.anniversary_date.trim() || null,
    is_active: f.is_active,
  };
}

/** carrier_id is required on create; caller guards it is non-null. */
export function buildPlanCreate(f: PlanForm): InsurancePlanCreate {
  return { carrier_id: f.carrier_id as number, ...planCommonBody(f) };
}

export function buildPlanUpdate(f: PlanForm): InsurancePlanUpdate {
  return { carrier_id: f.carrier_id ?? undefined, ...planCommonBody(f) };
}

// ---------------------------------------------------------------------------
// Coverage rule form (plan sub-resource)
// ---------------------------------------------------------------------------

export interface CoverageRuleForm {
  start_code: string;
  end_code: string;
  category: string;
  description: string;
  coverage_pct: string;
  ded_waived: boolean;
  freq_limit: string;
  age_limit: string;
  wait_period: string;
}

export function emptyCoverageRuleForm(): CoverageRuleForm {
  return {
    start_code: "",
    end_code: "",
    category: "",
    description: "",
    coverage_pct: "",
    ded_waived: false,
    freq_limit: "",
    age_limit: "",
    wait_period: "",
  };
}

export function coverageRuleToForm(r: InsuranceCoverageRuleRead): CoverageRuleForm {
  return {
    start_code: r.start_code ?? "",
    end_code: r.end_code ?? "",
    category: r.category ?? "",
    description: r.description ?? "",
    coverage_pct: r.coverage_pct ?? "",
    ded_waived: r.ded_waived ?? false,
    freq_limit: r.freq_limit == null ? "" : String(r.freq_limit),
    age_limit: r.age_limit ?? "",
    wait_period: r.wait_period ?? "",
  };
}

function coverageRuleCommonBody(f: CoverageRuleForm) {
  return {
    start_code: f.start_code.trim(),
    end_code: (f.end_code.trim() || f.start_code.trim()),
    category: f.category.trim() || null,
    description: f.description.trim() || null,
    coverage_pct: money(f.coverage_pct),
    ded_waived: f.ded_waived,
    freq_limit: f.freq_limit.trim() === "" ? null : freqLimitToApi(f.freq_limit),
    ...ageLimitToApi(f.age_limit),
    wait_months: intOrNull(f.wait_period),
    age_limit: f.age_limit.trim() || null,
    wait_period: f.wait_period.trim() || null,
  };
}

export function buildCoverageRuleCreate(
  insPlanId: number,
  f: CoverageRuleForm,
): InsuranceCoverageRuleCreate {
  return { ins_plan_id: insPlanId, ...coverageRuleCommonBody(f) };
}

export function buildCoverageRuleUpdate(f: CoverageRuleForm): InsuranceCoverageRuleUpdate {
  return { ...coverageRuleCommonBody(f) };
}

// ---------------------------------------------------------------------------
// Custom coverage form (tenant-wide defaults)
// ---------------------------------------------------------------------------

export interface CustomCoverageForm {
  start_code: string;
  end_code: string;
  description: string;
  coverage_pct: string;
  ded_waived: boolean;
}

export function emptyCustomCoverageForm(): CustomCoverageForm {
  return { start_code: "", end_code: "", description: "", coverage_pct: "", ded_waived: false };
}

export function customCoverageToForm(c: InsCustomCoverageRead): CustomCoverageForm {
  return {
    start_code: c.start_code ?? "",
    end_code: c.end_code ?? "",
    description: c.description ?? "",
    coverage_pct: c.coverage_pct ?? "",
    ded_waived: c.ded_waived ?? false,
  };
}

function customCoverageCommonBody(f: CustomCoverageForm) {
  return {
    start_code: f.start_code.trim(),
    end_code: f.end_code.trim() || f.start_code.trim(),
    description: f.description.trim() || null,
    coverage_pct: money(f.coverage_pct),
    ded_waived: f.ded_waived,
  };
}

export function buildCustomCoverageCreate(f: CustomCoverageForm): InsCustomCoverageCreate {
  return { ...customCoverageCommonBody(f) };
}

export function buildCustomCoverageUpdate(f: CustomCoverageForm): InsCustomCoverageUpdate {
  return { ...customCoverageCommonBody(f) };
}
