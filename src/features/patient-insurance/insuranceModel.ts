// Patient Insurance (Add/Edit Dental/Medical Plan) — form models.
//
// Mirrors the legacy Denticon "Add/Edit Primary Dental Plan" screen. A patient's
// insurance is stored across three backend resources, joined here:
//   • patient_insurance — links the patient to a plan + subscriber for one SLOT,
//     plus the individual "remaining" benefit amounts. The slot is encoded by two
//     columns: `legacy_plan_type` ("D"/"M" → Dental/Medical category) and
//     `insurance_type` ("primary"/"secondary"/… → order). This matches the
//     convention already used by PatientOverview.
//   • insurance_plans  — carrier, group #, plan-level maximums & deductibles
//     (shown read-only in the BENEFIT INFORMATION "Ind."/"Fam." columns).
//   • insurance_subscribers — subscriber demographics, eligibility, family
//     "remaining" amounts, and the notes.
//
// Per project convention (CLAUDE.md) all field keys bind DIRECTLY to the
// backend's snake_case names — no camelCase aliases, no mapper layer.

import type {
  PatientInsuranceRead,
  PatientInsuranceCreate,
  PatientInsuranceUpdate,
  InsuranceSubscriberRead,
  InsuranceSubscriberCreate,
  InsuranceSubscriberUpdate,
  InsurancePlanRead,
  InsuranceCarrierRead,
  EmployerRead,
} from "@/api/generated/model";

// ---------------------------------------------------------------------------
// Slot taxonomy — category (Dental/Medical) × order (primary…quaternary)
// ---------------------------------------------------------------------------

export type InsCategory = "D" | "M"; // legacy_plan_type prefix
export type InsOrder = "primary" | "secondary" | "tertiary" | "quaternary";

export interface InsSlot {
  category: InsCategory;
  order: InsOrder;
  /** Route segment under /patient/:id/insurance — e.g. "dental/primary". */
  segment: string;
  /** Tab/title label — e.g. "Primary Dental". */
  label: string;
  /** Window title — e.g. "Add/Edit Primary Dental Plan". */
  title: string;
  kind: "Dental" | "Medical";
}

// Display words for the order, matching the legacy screen ("Third"/"Fourth").
const ORDER_WORD: Record<InsOrder, string> = {
  primary: "Primary",
  secondary: "Secondary",
  tertiary: "Third",
  quaternary: "Fourth",
};

function makeSlot(category: InsCategory, order: InsOrder): InsSlot {
  const kind = category === "D" ? "Dental" : "Medical";
  const segment = `${kind.toLowerCase()}/${order}`;
  const label = `${ORDER_WORD[order]} ${kind}`;
  return { category, order, segment, label, title: `Add/Edit ${ORDER_WORD[order]} ${kind} Plan`, kind };
}

/** The tab strip shown across all insurance screens (mirrors the request). */
export const INSURANCE_TABS: InsSlot[] = [
  makeSlot("D", "primary"),
  makeSlot("D", "secondary"),
  makeSlot("D", "tertiary"),
  makeSlot("D", "quaternary"),
  makeSlot("M", "primary"),
  makeSlot("M", "secondary"),
];

export function slotFor(category: InsCategory, order: InsOrder): InsSlot {
  return (
    INSURANCE_TABS.find((s) => s.category === category && s.order === order) ?? makeSlot(category, order)
  );
}

/** The "other" slot the footer toggles to (primary ⇄ secondary within a category). */
export function toggleSlot(slot: InsSlot): InsSlot {
  const other: InsOrder = slot.order === "primary" ? "secondary" : "primary";
  return slotFor(slot.category, other);
}

function categoryMatches(legacy: string | null | undefined, cat: InsCategory): boolean {
  return (legacy ?? "").trim().toUpperCase().startsWith(cat);
}
function orderMatches(insuranceType: string | null | undefined, order: InsOrder): boolean {
  return (insuranceType ?? "").trim().toLowerCase() === order;
}

/** Find the patient_insurance record for a given slot, if present. */
export function findSlotRecord(
  records: PatientInsuranceRead[],
  slot: InsSlot,
): PatientInsuranceRead | undefined {
  return records.find(
    (r) => r.is_active && categoryMatches(r.legacy_plan_type, slot.category) && orderMatches(r.insurance_type, slot.order),
  );
}

// ---------------------------------------------------------------------------
// Editable form — one flat object spanning the three resources
// ---------------------------------------------------------------------------

export interface InsuranceForm {
  ins_plan_id: number | null;
  subscriber_id: number | null;

  // Individual "remaining" — patient_insurance.
  deductible_remaining: string;
  max_remaining: string;
  ortho_remaining: string;

  // Family "remaining" — subscriber.
  family_ded_remaining: string;
  family_max_remaining: string;

  // Eligibility — subscriber.
  effective_date: string;
  term_date: string;
  anniversary_date: string;
  elig_status: string;
  elig_verified_on: string;
  elig_verified_by: string;

  // Subscriber demographics — subscriber.
  sub_last_name: string;
  sub_first_name: string;
  sub_member_id: string;
  sub_dob: string;
  sub_gender: string;
  sub_address: string;
  sub_address2: string;
  sub_city: string;
  sub_state: string;
  sub_zip: string;
  group_number: string;

  // patient_insurance.relationship — "Patient Rel to Sub".
  relationship: string;

  notes: string;
  is_active: boolean;

  // ---- Fields with no backend column yet (see devreport, kept local) ----
  marital_status: string;
  sub_phone: string;
  sec_rel_to_prim: string;
}

/** Read-only values derived from the linked plan / carrier / employer. */
export interface PlanDisplay {
  plan_id: number | null;
  carrier_name: string;
  carrier_legacy_id: string;
  payer_id: string;
  carrier_type: string;
  carrier_phone: string;
  employer_name: string;
  employer_city: string;
  // Plan-level benefit maxima (BENEFIT INFORMATION "Ind."/"Fam." columns).
  individual_deductible: string;
  individual_max: string;
  ortho_max: string;
  family_deductible: string;
  family_max: string;
  plan_anniversary_date: string;
}

export const EMPTY_PLAN_DISPLAY: PlanDisplay = {
  plan_id: null,
  carrier_name: "",
  carrier_legacy_id: "",
  payer_id: "",
  carrier_type: "",
  carrier_phone: "",
  employer_name: "",
  employer_city: "",
  individual_deductible: "",
  individual_max: "",
  ortho_max: "",
  family_deductible: "",
  family_max: "",
  plan_anniversary_date: "",
};

export function emptyForm(): InsuranceForm {
  return {
    ins_plan_id: null,
    subscriber_id: null,
    deductible_remaining: "",
    max_remaining: "",
    ortho_remaining: "",
    family_ded_remaining: "",
    family_max_remaining: "",
    effective_date: "",
    term_date: "",
    anniversary_date: "",
    elig_status: "",
    elig_verified_on: "",
    elig_verified_by: "",
    sub_last_name: "",
    sub_first_name: "",
    sub_member_id: "",
    sub_dob: "",
    sub_gender: "",
    sub_address: "",
    sub_address2: "",
    sub_city: "",
    sub_state: "",
    sub_zip: "",
    group_number: "",
    relationship: "Self",
    notes: "",
    is_active: true,
    marital_status: "",
    sub_phone: "",
    sec_rel_to_prim: "",
  };
}

// The subscriber's address is a single column; the legacy screen shows two
// lines, so we join/split on a newline.
function splitAddress(addr: string | null | undefined): [string, string] {
  const [l1 = "", l2 = ""] = (addr ?? "").split("\n");
  return [l1, l2];
}
function joinAddress(l1: string, l2: string): string | null {
  const v = [l1.trim(), l2.trim()].filter(Boolean).join("\n");
  return v || null;
}

export interface SlotData {
  record: PatientInsuranceRead | null;
  plan: InsurancePlanRead | null;
  carrier: InsuranceCarrierRead | null;
  employer: EmployerRead | null;
  subscriber: InsuranceSubscriberRead | null;
}

export function formFromSlot(data: SlotData): InsuranceForm {
  const { record, subscriber } = data;
  const base = emptyForm();
  if (!record && !subscriber) return base;
  const [addr1, addr2] = splitAddress(subscriber?.sub_address);
  return {
    ...base,
    ins_plan_id: record?.ins_plan_id ?? subscriber?.ins_plan_id ?? null,
    subscriber_id: record?.subscriber_id ?? subscriber?.id ?? null,
    deductible_remaining: record?.deductible_remaining ?? "",
    max_remaining: record?.max_remaining ?? "",
    ortho_remaining: record?.ortho_remaining ?? subscriber?.ortho_remaining ?? "",
    family_ded_remaining: subscriber?.family_ded_remaining ?? "",
    family_max_remaining: subscriber?.family_max_remaining ?? "",
    effective_date: subscriber?.effective_date ?? "",
    term_date: subscriber?.term_date ?? "",
    anniversary_date: subscriber?.anniversary_date ?? "",
    elig_status: subscriber?.elig_status ?? "",
    elig_verified_on: subscriber?.elig_verified_on ?? "",
    elig_verified_by: subscriber?.elig_verified_by ?? "",
    sub_last_name: subscriber?.sub_last_name ?? "",
    sub_first_name: subscriber?.sub_first_name ?? "",
    sub_member_id: subscriber?.sub_member_id ?? "",
    sub_dob: subscriber?.sub_dob ?? "",
    sub_gender: subscriber?.sub_gender ?? "",
    sub_address: addr1,
    sub_address2: addr2,
    sub_city: subscriber?.sub_city ?? "",
    sub_state: subscriber?.sub_state ?? "",
    sub_zip: subscriber?.sub_zip ?? "",
    group_number: subscriber?.group_number ?? "",
    relationship: record?.relationship || "Self",
    notes: subscriber?.notes ?? "",
    is_active: record?.is_active ?? true,
  };
}

/** Map a picked existing subscriber into the editable subscriber fields. */
export function subscriberFields(sub: InsuranceSubscriberRead): Partial<InsuranceForm> {
  const [addr1, addr2] = splitAddress(sub.sub_address);
  return {
    subscriber_id: sub.id,
    sub_last_name: sub.sub_last_name ?? "",
    sub_first_name: sub.sub_first_name ?? "",
    sub_member_id: sub.sub_member_id ?? "",
    sub_dob: sub.sub_dob ?? "",
    sub_gender: sub.sub_gender ?? "",
    sub_address: addr1,
    sub_address2: addr2,
    sub_city: sub.sub_city ?? "",
    sub_state: sub.sub_state ?? "",
    sub_zip: sub.sub_zip ?? "",
    group_number: sub.group_number ?? "",
    effective_date: sub.effective_date ?? "",
    term_date: sub.term_date ?? "",
    anniversary_date: sub.anniversary_date ?? "",
    family_ded_remaining: sub.family_ded_remaining ?? "",
    family_max_remaining: sub.family_max_remaining ?? "",
    ortho_remaining: sub.ortho_remaining ?? "",
    elig_status: sub.elig_status ?? "",
    elig_verified_on: sub.elig_verified_on ?? "",
    elig_verified_by: sub.elig_verified_by ?? "",
    notes: sub.notes ?? "",
  };
}

export function planDisplayFromSlot(data: SlotData): PlanDisplay {
  const { plan, carrier, employer } = data;
  if (!plan) return EMPTY_PLAN_DISPLAY;
  return {
    plan_id: plan.id,
    carrier_name: carrier?.name ?? "",
    carrier_legacy_id: carrier?.legacy_id ?? (carrier ? String(carrier.id) : ""),
    payer_id: carrier?.payer_id ?? "",
    carrier_type: carrier ? (carrier.is_dental ? "Dental" : "Medical") : "",
    carrier_phone: carrier?.phone ?? "",
    employer_name: employer?.name ?? "",
    employer_city: [employer?.city, employer?.state].filter(Boolean).join(", "),
    individual_deductible: plan.individual_deductible ?? "",
    individual_max: plan.individual_max ?? "",
    ortho_max: plan.ortho_max ?? "",
    family_deductible: plan.family_deductible ?? "",
    family_max: plan.family_max ?? "",
    plan_anniversary_date: plan.anniversary_date ?? "",
  };
}

// ---------------------------------------------------------------------------
// Builders — request bodies (money fields are decimal strings; null when blank)
// ---------------------------------------------------------------------------

function nz(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

export function buildSubscriberCreate(f: InsuranceForm, insPlanId: number): InsuranceSubscriberCreate {
  return {
    ins_plan_id: insPlanId,
    sub_first_name: nz(f.sub_first_name),
    sub_last_name: nz(f.sub_last_name),
    sub_member_id: nz(f.sub_member_id),
    sub_dob: nz(f.sub_dob),
    sub_gender: nz(f.sub_gender),
    sub_address: joinAddress(f.sub_address, f.sub_address2),
    sub_city: nz(f.sub_city),
    sub_state: nz(f.sub_state),
    sub_zip: nz(f.sub_zip),
    group_number: nz(f.group_number),
    effective_date: nz(f.effective_date),
    term_date: nz(f.term_date),
    anniversary_date: nz(f.anniversary_date),
    family_max_remaining: nz(f.family_max_remaining),
    family_ded_remaining: nz(f.family_ded_remaining),
    ortho_remaining: nz(f.ortho_remaining),
    elig_status: nz(f.elig_status),
    elig_verified_on: nz(f.elig_verified_on),
    elig_verified_by: nz(f.elig_verified_by),
    notes: nz(f.notes),
    is_active: f.is_active,
  };
}

export function buildSubscriberUpdate(f: InsuranceForm): InsuranceSubscriberUpdate {
  // Same body shape as create; ins_plan_id is kept so the subscriber follows a
  // re-selected plan (InsuranceSubscriberUpdate accepts it as optional).
  return buildSubscriberCreate(f, f.ins_plan_id ?? 0) as InsuranceSubscriberUpdate;
}

export function buildPatientInsuranceCreate(
  f: InsuranceForm,
  patientId: number,
  slot: InsSlot,
  subscriberId: number | null,
): PatientInsuranceCreate {
  return {
    patient_id: patientId,
    ins_plan_id: f.ins_plan_id,
    subscriber_id: subscriberId,
    legacy_plan_type: slot.category,
    insurance_type: slot.order,
    relationship: nz(f.relationship),
    deductible_remaining: nz(f.deductible_remaining),
    max_remaining: nz(f.max_remaining),
    ortho_remaining: nz(f.ortho_remaining),
    is_active: f.is_active,
  };
}

export function buildPatientInsuranceUpdate(
  f: InsuranceForm,
  slot: InsSlot,
  subscriberId: number | null,
): PatientInsuranceUpdate {
  return {
    ins_plan_id: f.ins_plan_id,
    subscriber_id: subscriberId,
    legacy_plan_type: slot.category,
    insurance_type: slot.order,
    relationship: nz(f.relationship),
    deductible_remaining: nz(f.deductible_remaining),
    max_remaining: nz(f.max_remaining),
    ortho_remaining: nz(f.ortho_remaining),
    is_active: f.is_active,
  };
}

// ---------------------------------------------------------------------------
// Small option lists used by the subscriber selects.
// ---------------------------------------------------------------------------

/** Option shape for the "Member Subscriber" dropdown. */
export interface InsuranceSubscriberOption {
  id: number;
  label: string;
  sub?: string;
}

export const RELATIONSHIP_OPTIONS = ["Self", "Spouse", "Child", "Dependent", "Other"];
export const SEC_REL_OPTIONS = ["Spouse", "Child", "Dependent", "Other"];
export const MARITAL_OPTIONS = ["Single", "Married", "Divorced", "Widowed", "Separated"];
export const GENDER_OPTIONS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "O", label: "Other" },
];

export function moneyDisplay(v: string | null | undefined): string {
  if (v == null || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : String(v);
}
