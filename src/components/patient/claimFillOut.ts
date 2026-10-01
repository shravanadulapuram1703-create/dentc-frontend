// Dental Insurance Fill-out Form — data model, option lists and persistence.
//
// Legacy parity: the on-prem "Claim Fill-Out Information" window captures the
// ADA-claim-form boxes that are *not* derived from the procedures — prior
// authorisation, place of treatment, diagnosis (ICD) pointers, number of
// enclosures, "treatment is result of" (accident), orthodontic and prosthesis
// blocks, and the printed remarks.
//
// Backend reality (openapi.json, InsuranceClaimRead/Update):
//   • The claim resource has NO columns for any of these boxes.
//   • Four of them DO live on the patient record and are round-tripped for
//     real: first_visit, student_status, school_name, assign_benefits.
//   • The rest are held per-claim in localStorage until the backend grows the
//     columns — see docs/account-ledger/claim_fillout_backend_devreport.md
//     (gaps CLM-FO-1…5). The modal labels this plainly rather than pretending
//     the values were saved server-side.

/** One fill-out record. snake_case, matching the backend field names it maps to. */
export interface ClaimFillOutForm {
  /** patient.first_visit — persisted on the patient record. */
  first_visit: string;
  prior_authorization_number: string;
  has_other_coverage: boolean;
  /** patient.assign_benefits — persisted on the patient record. */
  assign_benefits: boolean;
  signature_on_file: boolean;
  /** CMS place-of-service code, ADA box 38. */
  place_of_treatment: string;
  insurance_reference_number: string;
  /** patient.student_status — persisted on the patient record. */
  student_status: string;
  /** patient.school_name — persisted on the patient record. */
  school_name: string;
  icd_1: string;
  icd_2: string;
  icd_3: string;
  icd_4: string;
  enclosures_radiographs: string;
  enclosures_oral_images: string;
  enclosures_models: string;
  is_other_accident: boolean;
  is_occupational_illness: boolean;
  is_auto_accident: boolean;
  accident_date: string;
  accident_state: string;
  is_orthodontic_treatment: boolean;
  ortho_appliance_placed_date: string;
  ortho_months_remaining: string;
  is_prosthesis_treatment: boolean;
  is_replacement_of_prosthesis: boolean;
  prosthesis_prior_placement_date: string;
  remarks: string;
  // ---- ADA 2024 form boxes that the fill-out window never had ----------------
  /** ADA Item 1 — EPSDT / Title XIX transaction. */
  is_epsdt: boolean;
  /** ADA Item 53a — treating dentist is providing services as locum tenens. */
  is_locum_tenens: boolean;
  /** ADA Item 39a — date of the last scaling and root planing (YYYY-MM-DD); blank = derive from history. */
  date_last_srp: string;
  /** ADA Item 31a — other fee(s) such as sales tax (decimal string; blank prints nothing). */
  other_fees: string;
  /** ADA Items 20 / 12 — name suffix (Jr., III); no backend column (ADA-BE-10). */
  patient_name_suffix: string;
  subscriber_name_suffix: string;
  /**
   * Per-procedure ADA Items 29a (diagnosis pointer letters A–D, primary first)
   * and 29b (quantity 01–99), keyed by patient_procedures.id (ADA-BE-3/4).
   */
  line_overrides: Record<string, ClaimLineOverride>;
  /** ADA Item 33 — explicit missing-teeth list for this claim; null = derive from the chart (ADA-BE-6). */
  missing_teeth_override: string[] | null;
  /** patient_signatures ids captured for Items 36 / 37 / 53 of this claim (no claim binding on the row — SIG-11). */
  signature_ids: { patient_consent: number | null; assign_benefits: number | null; treating_dentist: number | null };
}

export interface ClaimLineOverride {
  diagnosis_pointer: string;
  quantity: string;
}

/** Fields the backend really stores (on the patient record). */
export const PATIENT_BACKED_FIELDS = [
  "first_visit",
  "student_status",
  "school_name",
  "assign_benefits",
] as const;

export const REMARKS_MAX_LENGTH = 240;

export function emptyClaimFillOut(): ClaimFillOutForm {
  return {
    first_visit: "",
    prior_authorization_number: "",
    has_other_coverage: false,
    assign_benefits: false,
    signature_on_file: false,
    place_of_treatment: "11",
    insurance_reference_number: "",
    student_status: "No",
    school_name: "",
    icd_1: "",
    icd_2: "",
    icd_3: "",
    icd_4: "",
    enclosures_radiographs: "0",
    enclosures_oral_images: "0",
    enclosures_models: "0",
    is_other_accident: false,
    is_occupational_illness: false,
    is_auto_accident: false,
    accident_date: "",
    accident_state: "",
    is_orthodontic_treatment: false,
    ortho_appliance_placed_date: "",
    ortho_months_remaining: "0",
    is_prosthesis_treatment: false,
    is_replacement_of_prosthesis: false,
    prosthesis_prior_placement_date: "",
    remarks: "",
    is_epsdt: false,
    is_locum_tenens: false,
    date_last_srp: "",
    other_fees: "",
    patient_name_suffix: "",
    subscriber_name_suffix: "",
    line_overrides: {},
    missing_teeth_override: null,
    signature_ids: { patient_consent: null, assign_benefits: null, treating_dentist: null },
  };
}

/** CMS place-of-service codes offered on the dental claim form (ADA box 38). */
export const PLACE_OF_TREATMENT_OPTIONS: { code: string; label: string }[] = [
  { code: "11", label: "11 - Office" },
  { code: "12", label: "12 - Home" },
  { code: "21", label: "21 - Inpatient Hospital" },
  { code: "22", label: "22 - Outpatient Hospital" },
  { code: "23", label: "23 - Emergency Room – Hospital" },
  { code: "24", label: "24 - Ambulatory Surgical Center" },
  { code: "26", label: "26 - Military Treatment Facility" },
  { code: "31", label: "31 - Skilled Nursing Facility" },
  { code: "32", label: "32 - Nursing Facility" },
  { code: "33", label: "33 - Custodial Care Facility" },
  { code: "34", label: "34 - Hospice" },
  { code: "41", label: "41 - Ambulance – Land" },
  { code: "51", label: "51 - Inpatient Psychiatric Facility" },
  { code: "54", label: "54 - Intermediate Care Facility" },
  { code: "61", label: "61 - Comprehensive Inpatient Rehab Facility" },
  { code: "62", label: "62 - Comprehensive Outpatient Rehab Facility" },
  { code: "71", label: "71 - Public Health Clinic" },
  { code: "72", label: "72 - Rural Health Clinic" },
  { code: "81", label: "81 - Independent Laboratory" },
  { code: "99", label: "99 - Other Place of Service" },
];

/** Values match what Add/Edit Patient writes to patient.student_status. */
export const STUDENT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "No", label: "Non-Student" },
  { value: "Full-time", label: "Full-time" },
  { value: "Part-time", label: "Part-time" },
];

const STORAGE_PREFIX = "dentc:claim_fillout:v1:";

export interface StoredClaimFillOut {
  form: ClaimFillOutForm;
  saved_at: string;
}

/** Read the locally-held boxes for a claim (returns null when never saved). */
export function loadLocalClaimFillOut(claimId: string): StoredClaimFillOut | null {
  if (!claimId) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${claimId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredClaimFillOut>;
    if (!parsed || typeof parsed !== "object" || !parsed.form) return null;
    const form = { ...emptyClaimFillOut(), ...parsed.form };
    if (!form.line_overrides || typeof form.line_overrides !== "object") form.line_overrides = {};
    if (!Array.isArray(form.missing_teeth_override)) form.missing_teeth_override = null;
    form.signature_ids = { ...emptyClaimFillOut().signature_ids, ...(form.signature_ids ?? {}) };
    return { form, saved_at: parsed.saved_at || "" };
  } catch {
    return null;
  }
}

export function saveLocalClaimFillOut(claimId: string, form: ClaimFillOutForm): void {
  if (!claimId) return;
  try {
    const payload: StoredClaimFillOut = { form, saved_at: new Date().toISOString() };
    localStorage.setItem(`${STORAGE_PREFIX}${claimId}`, JSON.stringify(payload));
  } catch {
    // Quota / private-mode failures are surfaced by the caller's save handler.
    throw new Error("Could not store the fill-out form in this browser.");
  }
}

/**
 * Every stored fill-out key. Logging out (and any 401) runs
 * `localStorage.clear()`, so these have to be named for preservation the same
 * way the "last patient" keys are — otherwise a session timeout silently
 * discards claim data the backend has nowhere to hold (CLM-FO-1).
 */
export function claimFillOutKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
  } catch {
    return [];
  }
  return keys;
}

/** Clamp an enclosure count to the legacy 00–99 range; blank means 0. */
export function clampEnclosure(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 2);
  return digits === "" ? "0" : String(parseInt(digits, 10));
}
