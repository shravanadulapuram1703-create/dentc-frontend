// INSURANCE DETAILS wizard — data model.
//
// The legacy "Insurance Details" dialog (PLAN / BENEFITS / COVERAGE &
// LIMITATIONS / FREQ LIMITATION CODE GRP) edits ONE insurance plan plus its
// coverage-rule sub-resource. Per project convention every key here is the
// backend's snake_case name; the handful of legacy fields the backend has NO
// column for are grouped in `PlanExtras` and persisted by `planExtrasStore`
// (browser storage) until the backend grows them — see
// docs/insurance/insurance_plan_details_backend_devreport.md (PLAN-DTL-*).
//
// Backend facts this model is built on (live-verified against the running
// backend, tenant 1):
//   • `insurance_coverage_rules` rows are keyed by the LEGACY COVERAGE CATEGORY
//     code (`01` Diagnostic, `01A` Diagnostic: X-Rays, …) — one row per
//     category — plus optional per-procedure "exception" rows keyed by the ADA
//     code (`D0120`).
//   • `freq_limit` stores the 1-based ORDINAL of the legacy FREQUENCYLIMITATIONS
//     list (`1` = Once every 6 months … `12` = Once per Lifetime, `0`/null = No
//     Limitation). Definitions group FREQUENCYLIMITATIONS holds the labels in
//     that order (legacy_id 325…337). Since the 2026-09-07 spec it is an
//     INTEGER; the UI keeps the string form for its <select>.
//   • Age / waiting limits: the backend now has typed `age_min` / `age_max` /
//     `wait_months` integer columns next to the legacy string mirrors
//     `age_limit` (`"min"` or `"min-max"`, `"0"` = none) and `wait_period`
//     (whole months). Typed values win server-side; migrated rows only carry
//     the mirrors, so reads prefer typed-when-present and writes send both.
//   • Definitions group DEFCOVERAGE (key1 = category code, key2 = default %)
//     is the legacy "Basic, Major, Ortho" default coverage table.
//   • There is NO resource for the FREQ LIMITATION CODE GRP tab. Its rows are
//     persisted server-side as coverage-rule rows under a reserved convention
//     (`category = "FREQGRP"`, `start_code = end_code = "FQ" + INSLIMITATIONS
//     code`) so they are shared by every user, and excluded from the coverage
//     table and the estimate resolver.

import type { InsuranceCoverageRuleRead, InsuranceCoverageRuleCreate, InsuranceCoverageRuleUpdate } from "@/api/generated/model";
import { type PlanForm, emptyPlanForm, freqLimitToApi, intOrNull } from "../planData";

// ---------------------------------------------------------------------------
// PLAN tab — fields with no backend column ("extras")
// ---------------------------------------------------------------------------

export const FEES_TO_PRINT_OPTIONS = [
  { value: "office_ucr", label: "Office UCR Fees" },
  { value: "plan_fees", label: "Plan (Fee Schedule) Fees" },
  { value: "carrier_fees", label: "Carrier Fees" },
] as const;

export const CLAIM_OPTIONS = [
  { value: "submit", label: "Submit Claim" },
  { value: "do_not_submit", label: "Do Not Submit Claim" },
  { value: "print_only", label: "Print Claim Only (no e-claim)" },
] as const;

export const FORM_TO_PRINT_OPTIONS = [
  { value: "ADA2024", label: "ADA 2024 Form" },
  { value: "ADA2019", label: "ADA 2019 Form" },
  { value: "ADA2012", label: "ADA 2012 Form" },
  { value: "ADA2006", label: "ADA 2006 Form" },
  { value: "CMS1500", label: "CMS-1500 (Medical)" },
] as const;

export const NETWORK_TYPE_OPTIONS = [
  { value: "unknown", label: "Unknown" },
  { value: "in_network", label: "In Network" },
  { value: "out_of_network", label: "Out of Network" },
] as const;

/** Plan Type values (legacy list). Backend PLANTYPE definitions are merged in at runtime. */
export const PLAN_TYPE_FALLBACK = ["Indemnity", "PPO", "HMO", "DISCOUNT", "MEDICAID", "MEDICAL", "UNION", "OUT OF NETWORK"];

export interface PlanExtras {
  fees_to_print: string;
  claim_option: string;
  form_to_print: string;
  reporting_subtype: string;
  network_type: string;
  noa_only: boolean;
  per_visit_copay: string;
  lifetime_ortho_benefits: boolean;
  plan_notes: string;
}

export function emptyPlanExtras(): PlanExtras {
  return {
    fees_to_print: "office_ucr",
    claim_option: "submit",
    form_to_print: "ADA2024",
    reporting_subtype: "",
    network_type: "unknown",
    noa_only: false,
    per_visit_copay: "",
    lifetime_ortho_benefits: true,
    plan_notes: "",
  };
}

export const PLAN_EXTRA_KEYS = Object.keys(emptyPlanExtras()) as (keyof PlanExtras)[];

/** The whole PLAN + BENEFITS form: backend-backed `PlanForm` + the extras. */
export type PlanDetailsForm = PlanForm & PlanExtras;

export function emptyPlanDetailsForm(): PlanDetailsForm {
  return { ...emptyPlanForm(), ...emptyPlanExtras() };
}

/** Split a details form back into its backend-backed and extras halves. */
export function splitPlanDetails(f: PlanDetailsForm): { plan: PlanForm; extras: PlanExtras } {
  const {
    fees_to_print,
    claim_option,
    form_to_print,
    reporting_subtype,
    network_type,
    noa_only,
    per_visit_copay,
    lifetime_ortho_benefits,
    plan_notes,
    ...plan
  } = f;
  return {
    plan,
    extras: { fees_to_print, claim_option, form_to_print, reporting_subtype, network_type, noa_only, per_visit_copay, lifetime_ortho_benefits, plan_notes },
  };
}

// ---------------------------------------------------------------------------
// Anniversary (Month/Day) ↔ anniversary_date (YYYY-MM-DD)
// ---------------------------------------------------------------------------
// Legacy captures only month + day; the backend column is a full date, so the
// year is preserved from the stored value (or the current year on first save).

export function anniversaryParts(iso: string): { month: string; day: string; year: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return { month: "01", day: "01", year: String(new Date().getFullYear()) };
  return { year: m[1]!, month: m[2]!, day: m[3]! };
}

export function anniversaryIso(month: string, day: string, year?: string): string {
  const y = year && /^\d{4}$/.test(year) ? year : String(new Date().getFullYear());
  return `${y}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
export const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

// ---------------------------------------------------------------------------
// Frequency limitation (ordinal codes)
// ---------------------------------------------------------------------------

export interface FrequencyOption {
  /** The value stored in `freq_limit` ("0" = No Limitation). */
  code: string;
  label: string;
}

/** Canonical legacy list; ordinal = position (matches migrated `freq_limit`). */
export const FREQUENCY_FALLBACK: FrequencyOption[] = [
  { code: "0", label: "No Limitation" },
  { code: "1", label: "Once every 6 month of Date of Service" },
  { code: "2", label: "Once every 3 years of Date of Service" },
  { code: "3", label: "Twice per Last 12 months of Date of Service" },
  { code: "4", label: "Twice per Benefit Year" },
  { code: "5", label: "Four per Benefit Year" },
  { code: "6", label: "Once per Benefit Year" },
  { code: "7", label: "Once per Two Benefit Years" },
  { code: "8", label: "Once per Three Benefit Years" },
  { code: "9", label: "Once per Five Benefit Years" },
  { code: "10", label: "Once per Seven Benefit Years" },
  { code: "11", label: "Once per Ten Benefit Years" },
  { code: "12", label: "Once per Lifetime" },
  { code: "13", label: "Other - See plan notes" },
];

/** API integer / legacy string → the UI's string ordinal ("0" = No Limitation). */
export function normaliseFreq(v: string | number | null | undefined): string {
  const t = String(v ?? "").trim();
  return t === "" ? "0" : t;
}

// ---------------------------------------------------------------------------
// Coverage categories (legacy DEFCOVERAGE table)
// ---------------------------------------------------------------------------

export interface CoverageCategoryDef {
  code: string;
  label: string;
  /** Default coverage % for the "Basic, Major, Ortho" table. */
  default_pct: string;
  /** Default frequency ordinal (from the migrated legacy default table). */
  default_freq: string;
}

/** Legacy default table, live-verified against DEFCOVERAGE + migrated plans. */
export const COVERAGE_CATEGORY_FALLBACK: CoverageCategoryDef[] = [
  { code: "01", label: "Diagnostic", default_pct: "100", default_freq: "1" },
  { code: "01A", label: "Diagnostic: X-Rays", default_pct: "100", default_freq: "6" },
  { code: "01B", label: "Diagnostic: Panoramic X-Rays", default_pct: "100", default_freq: "9" },
  { code: "01C", label: "Diagnostic: X-Rays - PAs", default_pct: "100", default_freq: "0" },
  { code: "01D", label: "Diagnostic: X-Rays - Bitewings", default_pct: "100", default_freq: "5" },
  { code: "01E", label: "Diagnostic: X-Rays - Cone Beam", default_pct: "100", default_freq: "0" },
  { code: "02", label: "Preventive", default_pct: "100", default_freq: "1" },
  { code: "02A", label: "Preventive: Sealants", default_pct: "100", default_freq: "12" },
  { code: "02B", label: "Preventive: Space Maint", default_pct: "100", default_freq: "0" },
  { code: "03", label: "Restorative", default_pct: "80", default_freq: "6" },
  { code: "03A", label: "Restorative: Crowns", default_pct: "50", default_freq: "9" },
  { code: "03B", label: "Restorative: Build Up", default_pct: "80", default_freq: "9" },
  { code: "04", label: "Endodontics", default_pct: "80", default_freq: "12" },
  { code: "04A", label: "Endodontics: Molar", default_pct: "80", default_freq: "12" },
  { code: "05", label: "Periodontics", default_pct: "80", default_freq: "7" },
  { code: "05A", label: "Periodontics: Osseous Surgery", default_pct: "80", default_freq: "0" },
  { code: "05B", label: "Periodontics: Arestin", default_pct: "80", default_freq: "0" },
  { code: "06", label: "Oral Surgery", default_pct: "80", default_freq: "12" },
  { code: "06A", label: "Oral Surgery: Impactions", default_pct: "80", default_freq: "12" },
  { code: "07", label: "Prosthodontics (fix/rem), Inlays, Onlays", default_pct: "50", default_freq: "0" },
  { code: "08", label: "Maxillofacial Prosthetics", default_pct: "50", default_freq: "0" },
  { code: "09", label: "Implants", default_pct: "0", default_freq: "12" },
  { code: "09A", label: "Implants: Crowns", default_pct: "0", default_freq: "9" },
  { code: "10", label: "Orthodontics", default_pct: "50", default_freq: "0" },
  { code: "11", label: "Gen Adjunctive", default_pct: "0", default_freq: "0" },
  { code: "11A", label: "Gen Adjunctive: Anesthesia", default_pct: "0", default_freq: "0" },
  { code: "11B", label: "Gen Adjunctive: Biteguard/Nightguard", default_pct: "0", default_freq: "0" },
  { code: "12", label: "Non-covered Services", default_pct: "0", default_freq: "0" },
];

/** The "Change coverage table" choices. */
export type CoverageTableKind = "legacy_default" | "custom" | "blank";

export const COVERAGE_TABLE_OPTIONS: { value: CoverageTableKind; label: string }[] = [
  { value: "legacy_default", label: "Basic, Major, Ortho" },
  { value: "custom", label: "Custom Coverage (Setup → Insurance → Custom Coverage)" },
  { value: "blank", label: "Blank (no categories)" },
];

// ---------------------------------------------------------------------------
// FREQ LIMITATION CODE GRP — code groups (legacy INSLIMITATIONS)
// ---------------------------------------------------------------------------

export interface CodeGroupDef {
  code: string;
  label: string;
}

export const CODE_GROUP_FALLBACK: CodeGroupDef[] = [
  { code: "01", label: "Diagnostic: Periodic Exam (D0120)" },
  { code: "01A", label: "Diagnostic: Bitewing X-rays (D0274)" },
  { code: "01B", label: "Diagnostic: Full Mouth X-ray (D0210) / PanX (D0330)" },
  { code: "02", label: "Preventive: Prophylaxis - Adult (D1110)" },
  { code: "02A", label: "Preventive: Prophylaxis - Child (D1120)" },
  { code: "02B", label: "Preventive: Fluoride (D1208) / Varnish (D1206)" },
  { code: "02C", label: "Preventive: Sealants (D1351)" },
  { code: "02D", label: "Preventive: Space Maintainers (D1510-D1525)" },
  { code: "03", label: "Restorative: Crowns (D2710-D2794)" },
  { code: "03A", label: "Restorative: Fillings (D2140-D2394)" },
  { code: "03B", label: "Restorative: Foil / Inlays / Onlays (D2410-D2664)" },
  { code: "05", label: "Periodontics: SC/RP (D4341-4342)" },
  { code: "05A", label: "Periodontics: Full Mouth Debridement (D4355)" },
  { code: "05B", label: "Periodontics: Arestin (D4381)" },
  { code: "05C", label: "Periodontics: Perio Maintenance (D4910)" },
  { code: "06", label: "Oral and Maxillofacial: Occlusal Orthotic Device (D7880)" },
  { code: "07", label: "Removable Prosthetics: Dentures/Partials (D5110-D5281)" },
  { code: "07A", label: "Fixed Prosthetics: Bridges (D6205-D6252, D6710-D6794)" },
  { code: "07B", label: "Fixed Prosthetics: Bridges - Inlays / Onlays (D6545-D6634)" },
  { code: "08", label: "Orthodontics" },
  { code: "11", label: "Adjunctive Services: Occlusal Guard (D9940)" },
  { code: "11A", label: "Adjunctive Services: Palliative / Emergency Tx (D9110)" },
];

/** Reserved coverage-rule convention for FREQ LIMITATION CODE GRP rows. */
export const FREQ_GROUP_CATEGORY = "FREQGRP";
export const FREQ_GROUP_PREFIX = "FQ";
/** `age_limit` marker for the Whole Mouth flag on a FREQGRP row. */
const WHOLE_MOUTH_MARK = "WM";

export function isFreqGroupRule(r: Pick<InsuranceCoverageRuleRead, "category" | "start_code">): boolean {
  return (r.category ?? "").trim().toUpperCase() === FREQ_GROUP_CATEGORY
    || (r.start_code ?? "").toUpperCase().startsWith(FREQ_GROUP_PREFIX);
}

// ---------------------------------------------------------------------------
// Rows (UI models)
// ---------------------------------------------------------------------------

const ADA_CODE = /^D\d{4}/i;

export function isAdaCode(code: string): boolean {
  return ADA_CODE.test(code.trim());
}

export interface CoverageRow {
  /** Backend rule id; null until saved. */
  id: number | null;
  /** Category header row, or a per-procedure exception row. */
  kind: "category" | "code";
  /** Category code (`01`) or ADA code (`D0120`). */
  code: string;
  /** For exception rows: the category the code sits under (`01`). */
  parent_code: string;
  description: string;
  ded_waived: boolean;
  coverage_pct: string;
  freq_limit: string;
  age_min: string;
  age_max: string;
  wait_period: string;
}

export interface FreqCodeGroupRow {
  id: number | null;
  code_group: string;
  freq_limit: string;
  whole_mouth: boolean;
  per_day_quantity: string;
}

// Age limitation "min"/"min-max" encoding.
export function parseAgeLimit(v: string | null | undefined): { age_min: string; age_max: string } {
  const t = (v ?? "").trim();
  if (t === "" || t === "0") return { age_min: "0", age_max: "0" };
  const m = /^(\d*)\s*-\s*(\d*)$/.exec(t);
  if (m) return { age_min: m[1] || "0", age_max: m[2] || "0" };
  return { age_min: /^\d+$/.test(t) ? t : "0", age_max: "0" };
}

export function formatAgeLimit(age_min: string, age_max: string): string {
  const lo = age_min.trim() || "0";
  const hi = age_max.trim() || "0";
  if (hi === "0") return lo;
  return `${lo}-${hi}`;
}

function digits(v: string | number | null | undefined): string {
  const t = String(v ?? "").trim();
  const m = /^\d+/.exec(t);
  return m ? m[0] : t === "" ? "0" : t;
}

/** Typed integer column when present, else the legacy string mirror. */
function typedOrMirror(typed: number | null | undefined, mirror: string | null | undefined): string {
  return typed == null ? digits(mirror) : String(typed);
}

function pctText(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  if (t === "") return "0";
  const n = Number(t);
  return Number.isFinite(n) ? String(Math.round(n * 100) / 100) : t;
}

/** Backend rule → coverage row (never call with a FREQGRP row). */
export function ruleToCoverageRow(r: InsuranceCoverageRuleRead, categoryLabel: (code: string) => string): CoverageRow {
  const code = (r.start_code ?? "").trim().toUpperCase();
  const isCode = isAdaCode(code);
  const legacyAge = parseAgeLimit(r.age_limit);
  const hasTypedAge = r.age_min != null || r.age_max != null;
  const age_min = hasTypedAge ? String(r.age_min ?? 0) : legacyAge.age_min;
  const age_max = hasTypedAge ? String(r.age_max ?? 0) : legacyAge.age_max;
  const cat = (r.category ?? "").trim().toUpperCase();
  return {
    id: r.id,
    kind: isCode ? "code" : "category",
    code,
    // Migrated category rows carry category "0"; exception rows carry their parent.
    parent_code: isCode ? (cat && cat !== "0" ? cat : "") : "",
    description: (r.description ?? "").trim() || (isCode ? "" : categoryLabel(code)),
    ded_waived: !!r.ded_waived,
    coverage_pct: pctText(r.coverage_pct),
    freq_limit: normaliseFreq(r.freq_limit),
    age_min,
    age_max,
    wait_period: typedOrMirror(r.wait_months, r.wait_period),
  };
}

function coverageRowBody(row: CoverageRow) {
  const age_min = intOrNull(row.age_min) ?? 0;
  const age_max = intOrNull(row.age_max) ?? 0;
  const wait_months = intOrNull(row.wait_period) ?? 0;
  return {
    start_code: row.code,
    end_code: row.code,
    category: row.kind === "code" ? (row.parent_code || null) : "0",
    description: row.description.trim() || null,
    coverage_pct: row.coverage_pct.trim() === "" ? "0" : row.coverage_pct.trim(),
    ded_waived: row.ded_waived,
    // Typed limits (authoritative server-side) + the legacy string mirrors.
    freq_limit: freqLimitToApi(row.freq_limit),
    age_min,
    age_max,
    wait_months,
    age_limit: formatAgeLimit(String(age_min), String(age_max)),
    wait_period: String(wait_months),
  };
}

export function buildCoverageRowCreate(ins_plan_id: number, row: CoverageRow): InsuranceCoverageRuleCreate {
  return { ins_plan_id, ...coverageRowBody(row) };
}

export function buildCoverageRowUpdate(row: CoverageRow): InsuranceCoverageRuleUpdate {
  return { ...coverageRowBody(row) };
}

/** Backend rule (FREQGRP convention) → freq code group row. */
export function ruleToFreqGroupRow(r: InsuranceCoverageRuleRead): FreqCodeGroupRow {
  const raw = (r.start_code ?? "").trim().toUpperCase();
  return {
    id: r.id,
    code_group: raw.startsWith(FREQ_GROUP_PREFIX) ? raw.slice(FREQ_GROUP_PREFIX.length) : raw,
    freq_limit: normaliseFreq(r.freq_limit),
    whole_mouth: (r.age_limit ?? "").trim().toUpperCase() === WHOLE_MOUTH_MARK,
    per_day_quantity: digits(r.wait_period) === "0" ? "" : digits(r.wait_period),
  };
}

function freqGroupBody(row: FreqCodeGroupRow, label: string) {
  const code = `${FREQ_GROUP_PREFIX}${row.code_group.trim().toUpperCase()}`;
  return {
    start_code: code,
    end_code: code,
    category: FREQ_GROUP_CATEGORY,
    description: label || null,
    coverage_pct: null,
    ded_waived: false,
    freq_limit: freqLimitToApi(row.freq_limit),
    // FREQGRP rows overload the legacy mirrors (whole-mouth mark / per-day
    // quantity); the typed age/wait columns are deliberately left null.
    age_limit: row.whole_mouth ? WHOLE_MOUTH_MARK : null,
    wait_period: row.per_day_quantity.trim() || null,
  };
}

export function buildFreqGroupCreate(ins_plan_id: number, row: FreqCodeGroupRow, label: string): InsuranceCoverageRuleCreate {
  return { ins_plan_id, ...freqGroupBody(row, label) };
}

export function buildFreqGroupUpdate(row: FreqCodeGroupRow, label: string): InsuranceCoverageRuleUpdate {
  return { ...freqGroupBody(row, label) };
}

/** Rows for a fresh plan from a category table. */
export function defaultCoverageRows(defs: CoverageCategoryDef[]): CoverageRow[] {
  return defs.map((d) => ({
    id: null,
    kind: "category",
    code: d.code,
    parent_code: "",
    description: d.label,
    ded_waived: false,
    coverage_pct: d.default_pct,
    freq_limit: d.default_freq,
    age_min: "0",
    age_max: "0",
    wait_period: "0",
  }));
}

/** Sort: category rows by code, each followed by its exception rows. */
export function sortCoverageRows(rows: CoverageRow[]): CoverageRow[] {
  const cats = rows.filter((r) => r.kind === "category").sort((a, b) => a.code.localeCompare(b.code));
  const codes = rows.filter((r) => r.kind === "code").sort((a, b) => a.code.localeCompare(b.code));
  const out: CoverageRow[] = [];
  const placed = new Set<CoverageRow>();
  for (const c of cats) {
    out.push(c);
    for (const x of codes) {
      if (x.parent_code === c.code) {
        out.push(x);
        placed.add(x);
      }
    }
  }
  for (const x of codes) if (!placed.has(x)) out.push(x);
  return out;
}

/** A field-level equality check used by the diff-save. */
export function coverageRowEquals(a: CoverageRow, b: CoverageRow): boolean {
  return (
    a.kind === b.kind && a.code === b.code && a.parent_code === b.parent_code && a.description === b.description
    && a.ded_waived === b.ded_waived && a.coverage_pct === b.coverage_pct && a.freq_limit === b.freq_limit
    && a.age_min === b.age_min && a.age_max === b.age_max && a.wait_period === b.wait_period
  );
}

export function freqGroupRowEquals(a: FreqCodeGroupRow, b: FreqCodeGroupRow): boolean {
  return a.code_group === b.code_group && a.freq_limit === b.freq_limit && a.whole_mouth === b.whole_mouth
    && a.per_day_quantity === b.per_day_quantity;
}
