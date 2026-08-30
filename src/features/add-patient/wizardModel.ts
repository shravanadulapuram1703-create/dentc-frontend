// Add-Patient Wizard — shared models, constants, fallback catalogs and request
// builders for the multi-step registration flow (legacy Denticon parity):
//   1 Patient Information  →  2 Responsible Party  →  3 Insurance
//   →  4 Medical Alerts    →  5 Questionnaires     →  6 Recall  →  Finish
//
// Per project convention (CLAUDE.md) all data field keys bind directly to the
// backend's snake_case names. Steps that HAVE a backend resource (Insurance →
// patient-insurance + subscribers; Recall → patient-recalls) persist on Finish;
// steps without one (Responsible Party billing record, Medical-Alert responses,
// Questionnaire responses) are collected in the UI and logged as backend gaps
// (see docs/patients/add_patient_backend_devreport.md GAP-AP-15..18).

import type {
  PatientInsuranceCreate,
  InsuranceSubscriberCreate,
  PatientRecallCreate,
  MedicalAlertIn,
  QuestionnaireResponseIn,
  OpeningBalanceIn,
  RecallIn,
  ResponsiblePartyIn,
  ResponsiblePartyPersonIn,
} from "@/api/generated/model";
import {
  LEGACY_MEDICAL_ALERT_GROUPS,
  LEGACY_MEDICAL_ALERTS,
  LEGACY_DENTAL_QUESTION_GROUPS,
  LEGACY_MEDICAL_QUESTION_GROUPS,
  LEGACY_DENTAL_QUESTIONS,
  LEGACY_MEDICAL_QUESTIONS,
  LEGACY_RECALL_ROWS,
  type MedicalAlertItem,
  type QuestionItem,
} from "./legacyCatalogs";

export type { MedicalAlertItem, MedicalAlertGroup, QuestionItem, QuestionGroup } from "./legacyCatalogs";
export {
  LEGACY_MEDICAL_ALERT_GROUPS,
  LEGACY_DENTAL_QUESTION_GROUPS,
  LEGACY_MEDICAL_QUESTION_GROUPS,
  LEGACY_RESP_PARTY_TYPES,
  MEDICAL_ALERT_COMMENTS_MAX,
  MIN_TENANT_CATALOG_ITEMS,
  toCode,
} from "./legacyCatalogs";

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

/**
 * Step ids. Insurance is **one step per selected coverage slot** (legacy chains
 * "Primary Dental Insurance >> Secondary Dental Insurance >> …"), so those ids
 * are `ins:<slot key>`.
 */
export type WizardStepId =
  | "patient"
  | "responsible-party"
  | "medical-alerts"
  | "questionnaires"
  | "recall"
  | `ins:${CoverageSlotKey}`;

export interface WizardStepMeta {
  id: WizardStepId;
  label: string;
  /** Short label for the compact stepper. */
  short: string;
  /** Set on insurance steps — which coverage slot this screen edits. */
  slotKey?: CoverageSlotKey;
}

/** Which coverage checkboxes were ticked on Step 1. */
export interface CoverageSelection {
  primary_dental: boolean;
  secondary_dental: boolean;
  primary_medical: boolean;
  secondary_medical: boolean;
}

/**
 * Build the wizard's step list for the chosen coverage. Every selected coverage
 * type gets its OWN insurance screen, in legacy order (Primary Dental → Secondary
 * Dental → Primary Medical → Secondary Medical). With no coverage selected the
 * flow skips insurance entirely.
 */
export function buildWizardSteps(coverage: CoverageSelection): WizardStepMeta[] {
  const steps: WizardStepMeta[] = [
    { id: "patient", label: "Patient Information", short: "Patient" },
    { id: "responsible-party", label: "Responsible Party", short: "Resp. Party" },
  ];
  for (const slot of COVERAGE_SLOTS) {
    if (!coverage[slot.key]) continue;
    steps.push({
      id: `ins:${slot.key}`,
      label: `${slot.label} Insurance`,
      short: slot.label,
      slotKey: slot.key,
    });
  }
  steps.push(
    { id: "medical-alerts", label: "Medical Alerts", short: "Alerts" },
    { id: "questionnaires", label: "Questionnaires", short: "Questions" },
    { id: "recall", label: "Recall Information", short: "Recall" },
  );
  return steps;
}

// ---------------------------------------------------------------------------
// Step 2 — Responsible Party (billing/guarantor)
// ---------------------------------------------------------------------------

/** Who the guarantor is relative to the patient (drives auto-populate). */
export const RESPONSIBLE_PARTY_SOURCES = ["Self", "Spouse", "Parent", "Guardian", "Other"] as const;

/**
 * Default "patient's relationship TO the responsible party" for a given guarantor.
 * The two are inverses: if the responsible party is the patient's **Parent**, then
 * the patient is that party's **Child**. Without this the relationship stayed at
 * its previous value (typically "Self") after switching to a non-self guarantor,
 * and a wrong `responsible_party_relationship` was saved.
 */
export function defaultPatientRelationship(rpSource: string): string {
  switch (rpSource) {
    case "Self":
      return "Self";
    case "Spouse":
      return "Spouse";
    case "Parent":
    case "Guardian":
      return "Child";
    default:
      return "Other";
  }
}

/**
 * Legacy "Step 2: Add Responsible Party Information". `rp_source` is the
 * new-app selector that decides whether the billing identity is the patient's
 * (Self) or a separate guarantor; `resp_party_type` is the legacy billing
 * classification code (CA/CO/DI/…).
 */
export interface ResponsiblePartyForm {
  rp_source: string; // Self | Spouse | Parent | Guardian | Other
  relationship: string; // relationship of the PATIENT to this responsible party
  resp_party_type: string; // legacy Resp. Party Type code (CA, CO, DI, …)

  title: string;
  preferred_name: string;
  first_name: string;
  last_name: string;
  middle_initial: string;
  dob: string;
  sex: string;
  marital_status: string;
  ssn: string;
  driver_license: string;

  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  home_phone: string;
  cell_phone: string;
  work_phone: string;

  // Billing behaviour toggles (legacy checkboxes)
  send_statements: boolean;
  no_email_statement: boolean;
  send_to_collection: boolean;
  apply_finance_charge: boolean;
  /** FK into the backend's /collection-agencies lookup (LEG-11). */
  collection_agency_id: number | null;

  // Statement + notes
  custom_statement_message: string;
  print_message_times: string;
  financial_notes: string;
  responsible_party_notes: string;

  employer: string;
}

export function emptyResponsibleParty(): ResponsiblePartyForm {
  return {
    rp_source: "Self",
    relationship: "Self",
    resp_party_type: "CA",
    title: "",
    preferred_name: "",
    first_name: "",
    last_name: "",
    middle_initial: "",
    dob: "",
    sex: "",
    marital_status: "Single",
    ssn: "",
    driver_license: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip: "",
    email: "",
    home_phone: "",
    cell_phone: "",
    work_phone: "",
    send_statements: true,
    no_email_statement: false,
    send_to_collection: false,
    apply_finance_charge: true,
    collection_agency_id: null,
    custom_statement_message: "",
    print_message_times: "0",
    financial_notes: "",
    responsible_party_notes: "",
    employer: "",
  };
}

// ---------------------------------------------------------------------------
// Step 3 — Insurance (per coverage slot)
// ---------------------------------------------------------------------------

export type CoverageSlotKey =
  | "primary_dental"
  | "secondary_dental"
  | "primary_medical"
  | "secondary_medical";

export interface InsuranceSlotForm {
  key: CoverageSlotKey;
  label: string;
  category: "D" | "M"; // legacy_plan_type
  order: "primary" | "secondary"; // insurance_type
  carrier_id: number | null;
  carrier_name: string;
  ins_plan_id: number | null;
  plan_label: string;
  group_number: string;
  /** Subscriber ID / member number entered by the user ("SubID"). Required in legacy. */
  sub_member_id: string;
  /** Patient's relationship to the subscriber. */
  relationship: string;

  // ── Subscriber Information (legacy Step 3 right panel) ──
  sub_last_name: string;
  sub_first_name: string;
  sub_dob: string;
  sub_sex: string;
  sub_marital_status: string;
  sub_address: string;
  sub_city: string;
  sub_state: string;
  sub_zip: string;
  sub_phone: string;
  plan_effective_date: string;

  // ── Individual "remaining" amounts the patient screen also edits ──
  deductible_remaining: string;
  max_remaining: string;
  ortho_remaining: string;

  // ── Dentical Share of Cost (LEG-6) ──
  dentical_share_month: string;
  dentical_share_year: string;
  dentical_share_amount: string;
  dentical_unused: string;

  /** Secondary subscriber's relation to the primary subscriber (legacy field). */
  sec_sub_rel_to_prim_sub: string;

  notes: string;
}

export const COVERAGE_SLOTS: Array<{
  key: CoverageSlotKey;
  label: string;
  category: "D" | "M";
  order: "primary" | "secondary";
}> = [
  { key: "primary_dental", label: "Primary Dental", category: "D", order: "primary" },
  { key: "secondary_dental", label: "Secondary Dental", category: "D", order: "secondary" },
  { key: "primary_medical", label: "Primary Medical", category: "M", order: "primary" },
  { key: "secondary_medical", label: "Secondary Medical", category: "M", order: "secondary" },
];

export function emptyInsuranceSlot(s: (typeof COVERAGE_SLOTS)[number]): InsuranceSlotForm {
  return {
    key: s.key,
    label: s.label,
    category: s.category,
    order: s.order,
    carrier_id: null,
    carrier_name: "",
    ins_plan_id: null,
    plan_label: "",
    group_number: "",
    sub_member_id: "",
    relationship: "Self",
    sub_last_name: "",
    sub_first_name: "",
    sub_dob: "",
    sub_sex: "",
    sub_marital_status: "",
    sub_address: "",
    sub_city: "",
    sub_state: "",
    sub_zip: "",
    sub_phone: "",
    plan_effective_date: "",
    deductible_remaining: "",
    max_remaining: "",
    ortho_remaining: "",
    dentical_share_month: "",
    dentical_share_year: "",
    dentical_share_amount: "",
    dentical_unused: "",
    sec_sub_rel_to_prim_sub: "",
    notes: "",
  };
}

export const SUBSCRIBER_RELATIONSHIPS = ["Self", "Spouse", "Child", "Dependent", "Other"];
/** Secondary subscriber's relation to the primary subscriber (legacy list). */
export const SEC_REL_OPTIONS = ["Spouse", "Child", "Dependent", "Other"];
export const MARITAL_OPTIONS = ["Single", "Married", "Divorced", "Widowed", "Separated"];
export const SEX_OPTIONS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "O", label: "Other" },
];

// ---------------------------------------------------------------------------
// Step 4 — Medical Alerts (catalog from MEDALERT definitions; fallback below)
// ---------------------------------------------------------------------------

export interface MedicalAlertsForm {
  /** answer per alert code: "yes" | "no" | "" (unanswered). */
  responses: Record<string, "yes" | "no" | "">;
  comments: string;
}

/** The legacy Denticon alert list, grouped, used when MEDALERT is unseeded. */
export const DEFAULT_MEDICAL_ALERT_GROUPS = LEGACY_MEDICAL_ALERT_GROUPS;
export const DEFAULT_MEDICAL_ALERTS: MedicalAlertItem[] = LEGACY_MEDICAL_ALERTS;

export function emptyMedicalAlerts(): MedicalAlertsForm {
  return { responses: {}, comments: "" };
}

// ---------------------------------------------------------------------------
// Step 5 — Questionnaires (Dental + Medical)
// ---------------------------------------------------------------------------

export interface QuestionnairesForm {
  dental: Record<string, string>;
  medical: Record<string, string>;
}

/** Legacy Dental / Medical questionnaires (grouped), used when the catalogs are unseeded. */
export const DEFAULT_DENTAL_QUESTION_GROUPS = LEGACY_DENTAL_QUESTION_GROUPS;
export const DEFAULT_MEDICAL_QUESTION_GROUPS = LEGACY_MEDICAL_QUESTION_GROUPS;
export const DEFAULT_DENTAL_QUESTIONS: QuestionItem[] = LEGACY_DENTAL_QUESTIONS;
export const DEFAULT_MEDICAL_QUESTIONS: QuestionItem[] = LEGACY_MEDICAL_QUESTIONS;

export function emptyQuestionnaires(): QuestionnairesForm {
  return { dental: {}, medical: {} };
}

// ---------------------------------------------------------------------------
// Step 6 — Recall
// ---------------------------------------------------------------------------

/** One row of the legacy "Add Recall Due Dates" grid. */
export interface RecallEntry {
  /**
   * Backend `patient_recalls.id` when this row was loaded from an existing
   * patient. Absent on the create flow's seeded rows and on rows the user adds,
   * which is exactly what tells the edit save to POST rather than PATCH.
   */
  id?: number;
  procedure_code: string;
  /** Interval value (paired with interval_type Month/Year). */
  interval: string;
  interval_type: "Month" | "Year";
  due_date: string;
  /** Scheduled date/time, if the appointment is already booked. */
  sched_date: string;
  sched_time: string;
  /** Legacy "Recall Reason" — the procedure's description. */
  reason: string;
}

/** The six legacy default recall rows (D0120/D0210/D0330/D1110/D1120/D4910). */
export const DEFAULT_RECALLS: RecallEntry[] = LEGACY_RECALL_ROWS.map((r) => ({
  procedure_code: r.procedure_code,
  interval: r.interval,
  interval_type: r.interval_type,
  due_date: "",
  sched_date: "",
  sched_time: "",
  reason: r.reason,
}));

/** Interval in months, normalising the legacy Month/Year unit. */
export function recallIntervalMonths(entry: RecallEntry): number | undefined {
  const n = parseInt(entry.interval, 10);
  if (!Number.isFinite(n)) return undefined;
  return entry.interval_type === "Year" ? n * 12 : n;
}

// ---------------------------------------------------------------------------
// Request builders for the persistable steps (Insurance, Recall)
// ---------------------------------------------------------------------------

const nz = (v: string): string | null => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

/** Parse an integer field, or null when blank/invalid. */
const intOrNull = (v: string): number | null => {
  const n = parseInt((v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
};

/** A slot is worth persisting once a plan has been picked. */
export function slotHasPlan(slot: InsuranceSlotForm): boolean {
  return slot.ins_plan_id != null;
}

export function buildSubscriberCreateForSlot(
  slot: InsuranceSlotForm,
  patientLastName: string,
  patientFirstName: string,
): InsuranceSubscriberCreate {
  // "Self" relationship defaults the subscriber to the patient; otherwise use the
  // subscriber fields captured on the insurance step.
  const isSelf = (slot.relationship || "Self").toLowerCase() === "self";
  return {
    ins_plan_id: slot.ins_plan_id ?? 0,
    sub_first_name: nz(isSelf ? patientFirstName : slot.sub_first_name),
    sub_last_name: nz(isSelf ? patientLastName : slot.sub_last_name),
    sub_member_id: nz(slot.sub_member_id),
    sub_dob: nz(slot.sub_dob),
    sub_gender: nz(slot.sub_sex),
    sub_address: nz(slot.sub_address),
    sub_city: nz(slot.sub_city),
    sub_state: nz(slot.sub_state),
    sub_zip: nz(slot.sub_zip),
    group_number: nz(slot.group_number),
    effective_date: nz(slot.plan_effective_date),
    notes: nz(slot.notes),
    is_active: true,
  } as InsuranceSubscriberCreate;
}

export function buildPatientInsuranceCreateForSlot(
  slot: InsuranceSlotForm,
  patientId: number,
  subscriberId: number | null,
): PatientInsuranceCreate {
  return {
    patient_id: patientId,
    ins_plan_id: slot.ins_plan_id,
    subscriber_id: subscriberId,
    legacy_plan_type: slot.category,
    insurance_type: slot.order,
    relationship: nz(slot.relationship),
    sec_sub_rel_to_prim_sub: nz(slot.sec_sub_rel_to_prim_sub),
    deductible_remaining: nz(slot.deductible_remaining),
    max_remaining: nz(slot.max_remaining),
    ortho_remaining: nz(slot.ortho_remaining),
    // Dentical Share of Cost (LEG-6).
    dentical_share_month: intOrNull(slot.dentical_share_month),
    dentical_share_year: intOrNull(slot.dentical_share_year),
    dentical_share_amount: nz(slot.dentical_share_amount),
    dentical_unused: nz(slot.dentical_unused),
    is_active: true,
  };
}

/**
 * Full-fidelity recall row (LEG-8 delivered `interval_unit`, `scheduled_date` and
 * `scheduled_time`, so the legacy Month/Year unit and the Sched Dt/Time columns
 * round-trip exactly — no more converting Years to months or folding the
 * scheduled slot into the note text).
 */
export function buildRecallCreate(
  entry: RecallEntry,
  patientId: number,
  officeId: number | null,
): PatientRecallCreate {
  const interval = parseInt(entry.interval, 10);
  return {
    patient_id: patientId,
    office_id: officeId ?? undefined,
    recall_type: nz(entry.reason),
    procedure_code: nz(entry.procedure_code),
    due_date: nz(entry.due_date),
    interval_months: Number.isFinite(interval) ? interval : undefined,
    interval_unit: entry.interval_type.toLowerCase(), // "month" | "year"
    scheduled_date: nz(entry.sched_date),
    scheduled_time: nz(entry.sched_time),
    status: "Due",
    is_active: true,
  };
}

// ---------------------------------------------------------------------------
// Builders for the atomic POST /patients/register composite (GAP-AP-13/15/18)
// ---------------------------------------------------------------------------

/**
 * Patient↔responsible-party link (LEG-10..13).
 *
 * Precedence enforced by the backend is `is_self` > `person` > `responsible_party_id`,
 * so we send exactly one: a self-responsible patient self-links; anyone else sends
 * the full guarantor as `person`, which the backend creates AND links inside the
 * same register transaction.
 */
export function buildResponsiblePartyIn(form: ResponsiblePartyForm): ResponsiblePartyIn {
  const isSelf = form.rp_source === "Self";
  if (isSelf) {
    return { is_self: true, relationship: "self" };
  }
  return {
    relationship: nz(form.relationship) ?? undefined,
    person: buildResponsiblePartyPerson(form),
  };
}

/**
 * The guarantor's own fields, in the shape the backend uses everywhere a
 * responsible party is written. `ResponsiblePartyCreate` / `ResponsiblePartyUpdate`
 * are this same field set plus `home_office_id` / `is_active`, so the edit flow
 * spreads this into its own bodies rather than re-listing 30 fields.
 */
export function buildResponsiblePartyPerson(
  form: ResponsiblePartyForm,
): ResponsiblePartyPersonIn {
  const num = (v: string) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    title: nz(form.title),
    preferred_name: nz(form.preferred_name),
    last_name: nz(form.last_name),
    first_name: nz(form.first_name),
    middle_initial: nz(form.middle_initial),
    address_line1: nz(form.address_line1),
    address_line2: nz(form.address_line2),
    city: nz(form.city),
    state: nz(form.state),
    zip: nz(form.zip),
    email: nz(form.email),
    dob: nz(form.dob),
    marital_status: nz(form.marital_status),
    sex: nz(form.sex),
    ssn: nz(form.ssn),
    driver_license: nz(form.driver_license),
    home_phone: nz(form.home_phone),
    cell_phone: nz(form.cell_phone),
    work_phone: nz(form.work_phone),
    employer: nz(form.employer),
    resp_party_type: nz(form.resp_party_type),
    collection_agency_id: form.collection_agency_id ?? undefined,
    send_statements: form.send_statements,
    no_email_statement: form.no_email_statement,
    send_collections: form.send_to_collection,
    is_finance_charge: form.apply_finance_charge,
    statement_message: nz(form.custom_statement_message),
    statement_message_print_count: num(form.print_message_times),
    financial_notes: nz(form.financial_notes),
    responsible_party_notes: nz(form.responsible_party_notes),
  };
}

/** One MedicalAlertIn per answered alert, plus a comments-only row when present. */
export function buildMedicalAlertsIn(
  form: MedicalAlertsForm,
  labels: Record<string, string>,
): MedicalAlertIn[] {
  const rows: MedicalAlertIn[] = Object.entries(form.responses)
    .filter(([, ans]) => ans === "yes" || ans === "no")
    .map(([code, ans]) => ({
      alert_code: code,
      alert_label: labels[code] ?? undefined,
      response: ans,
    }));
  const comments = nz(form.comments);
  if (comments) {
    rows.push({ alert_code: "ADDITIONAL_COMMENTS", alert_label: "Additional Comments", comments });
  }
  return rows;
}

/** One QuestionnaireResponseIn per answered question across both questionnaires. */
export function buildQuestionnaireResponsesIn(
  form: QuestionnairesForm,
  labels: { dental: Record<string, string>; medical: Record<string, string> },
): QuestionnaireResponseIn[] {
  const build = (
    which: "dental" | "medical",
    answers: Record<string, string>,
  ): QuestionnaireResponseIn[] =>
    Object.entries(answers)
      .filter(([, ans]) => nz(ans) != null)
      .map(([code, ans]) => ({
        questionnaire_type: which,
        question_code: code,
        question_text: labels[which][code] ?? undefined,
        answer: ans,
      }));
  return [...build("dental", form.dental), ...build("medical", form.medical)];
}

/**
 * Recall row for the `POST /patients/register` composite.
 *
 * NOTE: `RecallIn` does **not** yet carry LEG-8's `interval_unit` /
 * `scheduled_date` / `scheduled_time` (they landed on `PatientRecallCreate` only),
 * so sending recalls through the composite would silently drop the legacy
 * Month/Year unit and the Sched Dt/Time columns. The wizard therefore persists
 * recalls through the standalone `patient-recalls` resource via
 * {@link buildRecallCreate} and omits them here — see gap LEG-17. Kept for
 * callers that only need the reduced shape.
 */
export function buildRecallIn(entry: RecallEntry, officeId: number | null): RecallIn {
  return {
    recall_type: nz(entry.reason),
    procedure_code: nz(entry.procedure_code),
    due_date: nz(entry.due_date),
    interval_months: recallIntervalMonths(entry),
    office_id: officeId ?? undefined,
  };
}

/** Opening A/R buckets; null when every bucket is zero/blank. */
export function buildOpeningBalanceIn(b: {
  current: string;
  over_30: string;
  over_60: string;
  over_90: string;
  over_120: string;
}): OpeningBalanceIn | null {
  const num = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  const buckets = {
    current: num(b.current),
    over_30: num(b.over_30),
    over_60: num(b.over_60),
    over_90: num(b.over_90),
    over_120: num(b.over_120),
  };
  const anyNonZero = Object.values(buckets).some((v) => v !== 0);
  return anyNonZero ? buckets : null;
}
