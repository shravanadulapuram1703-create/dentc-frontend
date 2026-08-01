// Edit mode for the Add-Patient wizard's **Patient Information** screen.
//
// The Overview's PATIENT INFORMATION panel has its own EDIT button, and so do
// Responsible Party, Insurance and Recalls. This module therefore covers only
// what that one panel owns: the patient record itself plus its opening A/R
// balances. The other sections are edited from their own entry points and are
// deliberately NOT written here.
//
// `/patient/:patientId/edit` reuses the create screen's Step-1 form so the two
// stay identical field-for-field.
//
// Field keys bind directly to the backend's snake_case names (CLAUDE.md); the
// camelCase names below are the wizard's own UI form keys, shared verbatim with
// the create flow.
//
// Gaps found while wiring this up: docs/patients/patient_edit_backend_devreport.md

import {
  getPatient,
  updatePatient,
  getPatientOpeningBalance,
  setPatientOpeningBalance,
  listPatientInsurance,
} from "@/api/generated/endpoints/patients/patients";
import { getUser } from "@/api/generated/endpoints/users/users";
import type {
  PatientRead,
  PatientUpdate,
  PatientInsuranceRead,
  OpeningBalanceIn,
} from "@/api/generated/model";
import { COVERAGE_SLOTS, type CoverageSlotKey } from "./wizardModel";

/** The wizard's patient-type checkbox map (code → ticked). */
export type PatientTypesState = Record<string, boolean>;

/** Record provenance shown in the dialog header (legacy OID / Modified By / On). */
export interface PatientAudit {
  /** Home office the patient belongs to — the legacy "OID". */
  office_id: number | null;
  /** Last write timestamp, already formatted for display ("" when unknown). */
  modified_on: string;
  /** Display name of the responsible user ("" when it cannot be resolved). */
  modified_by: string;
  /**
   * True when `modified_by` was derived from `created_by` because the patient
   * resource exposes no `updated_by` (gap PE-4). The header labels it so the
   * value is never mistaken for a true last-editor attribution.
   */
  modified_by_is_creator: boolean;
}

/** Everything the Patient Information screen needs to render an existing patient. */
export interface PatientEditSnapshot {
  patient: PatientRead;
  /** Partial patch for the wizard's Step-1 `formData`. */
  form: Record<string, string | boolean>;
  patient_types: PatientTypesState;
  audit: PatientAudit;
  first_visit: string;
  last_visit: string;
  /** Non-fatal problems encountered while loading (shown as a banner). */
  warnings: string[];
}

/** "2026-07-26T21:00:00.194660" → "07/26/2026 9:00 PM". */
function formatTimestamp(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const s = (v: unknown): string => (v == null ? "" : String(v));
const b = (v: unknown, fallback = false): boolean =>
  typeof v === "boolean" ? v : fallback;
/** Money-ish backend values arrive as numbers or numeric strings. */
const money = (v: unknown): string => {
  const n = typeof v === "number" ? v : parseFloat(s(v));
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

/** Backend gender code → the display name the wizard's `sex` select holds. */
const GENDER_NAME: Record<string, string> = { M: "Male", F: "Female", O: "Other" };

/**
 * The wizard stores `sex` as a display name because that is what the metadata
 * dropdown lists. Prefer the tenant's own metadata label so a custom list still
 * round-trips; fall back to the canonical M/F/O names.
 */
export function genderCodeToName(
  code: string | null | undefined,
  genders?: Array<{ code: string; name: string }>,
): string {
  if (!code) return "";
  const fromMetadata = genders?.find((g) => g.code === code)?.name;
  return fromMetadata ?? GENDER_NAME[code] ?? code;
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

/**
 * Hydrate the Patient Information screen. The patient record is required; the
 * opening balance and the coverage summary each degrade to a warning so one
 * slow or broken endpoint never blocks editing demographics.
 */
export async function loadPatientForEdit(
  patient_id: number,
  genders?: Array<{ code: string; name: string }>,
): Promise<PatientEditSnapshot> {
  const warnings: string[] = [];
  const patient = await getPatient(patient_id);

  const settle = async <T,>(label: string, run: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await run();
    } catch {
      warnings.push(`${label} could not be loaded.`);
      return fallback;
    }
  };

  const [opening, insurance_rows, modified_by] = await Promise.all([
    settle("Starting balances", () => getPatientOpeningBalance(patient_id), null),
    // Read-only on this screen — it drives the Coverage Type summary only.
    settle(
      "Coverage summary",
      async () => (await listPatientInsurance({ patient_id, size: 50 })).items,
      [] as PatientInsuranceRead[],
    ),
    // `PatientRead` carries only the numeric `created_by` — no `updated_by` and
    // no *_name fields (gap PE-4) — so resolve the user for a readable name.
    // A failure here is not worth a warning banner; the field just shows "—".
    (async () => {
      if (patient.created_by == null) return "";
      try {
        const user = await getUser(patient.created_by);
        const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
        return full || user.username || user.email || "";
      } catch {
        return "";
      }
    })(),
  ]);

  const audit: PatientAudit = {
    office_id: patient.home_office_id ?? null,
    modified_on: formatTimestamp(patient.updated_at ?? patient.created_at),
    modified_by,
    modified_by_is_creator: Boolean(modified_by),
  };

  // ── Coverage summary ────────────────────────────────────────────────────
  const coverage: Record<CoverageSlotKey, boolean> = {
    primary_dental: false,
    secondary_dental: false,
    primary_medical: false,
    secondary_medical: false,
  };
  for (const record of insurance_rows) {
    if (record.is_active === false) continue;
    const category = (record.legacy_plan_type ?? "").trim().toUpperCase().startsWith("M")
      ? "M"
      : "D";
    const order = (record.insurance_type ?? "").trim().toLowerCase();
    const match = COVERAGE_SLOTS.find((c) => c.category === category && c.order === order);
    if (match) coverage[match.key] = true;
  }

  // ── Step-1 form ─────────────────────────────────────────────────────────
  const student_status = s(patient.student_status);
  const form: Record<string, string | boolean> = {
    birthdate: s(patient.dob),
    lastName: s(patient.last_name),
    firstName: s(patient.first_name),
    title: s(patient.title),
    preferredName: s(patient.preferred_name),
    pronouns: s(patient.pronouns) || "Please Select",

    address1: s(patient.address_line1),
    address2: s(patient.address_line2),
    city: s(patient.city),
    state: s(patient.state),
    zip: s(patient.zip),

    phone: s(patient.phone),
    cellPhone: s(patient.cell_phone),
    workPhone: s(patient.work_phone),
    email: s(patient.email),

    ssn: s(patient.ssn),
    chartNo: s(patient.chart_no),
    driverLicense: s(patient.driver_license),
    mediId: s(patient.medicaid_id),
    studentStatus: student_status || "No",
    schoolName: s(patient.school_name),

    maritalStatus: s(patient.marital_status) || "Single",
    sex: genderCodeToName(patient.gender, genders),

    guardianName: s(patient.guardian_name),
    guardianPhone: s(patient.guardian_phone),

    active: b(patient.is_active, true),
    assignBenefits: b(patient.assign_benefits),
    hipaaAgreement: b(patient.hipaa_agreement),
    noCorrespondence: b(patient.no_correspondence),
    noAutoEmail: b(patient.no_auto_email),
    noAutoSMS: b(patient.no_auto_sms),
    addToQuickFill: b(patient.add_to_quickfill),

    noCoverage: !Object.values(coverage).some(Boolean),
    primaryDental: coverage.primary_dental,
    secondaryDental: coverage.secondary_dental,
    primaryMedical: coverage.primary_medical,
    secondaryMedical: coverage.secondary_medical,

    feeScheduleId: patient.fee_schedule_id != null ? String(patient.fee_schedule_id) : "",
    preferredProvider: s(patient.preferred_provider_id),
    preferredHygienist: s(patient.preferred_hygienist_id) || "None",

    referralType: s(patient.referral_type),
    referredBy: s(patient.referred_by),
    referredTo: s(patient.referred_to),
    referralToDate: s(patient.referral_to_date),

    relToResp: s(patient.responsible_party_relationship) || "Please Select",
    preferredContact: s(patient.preferred_contact) || "No Preference",

    patientNotes: s(patient.patient_notes),
    hipaaSharing: s(patient.hipaa_sharing_notes),

    balanceCurrent: money(opening?.current),
    balanceOver30: money(opening?.over_30),
    balanceOver60: money(opening?.over_60),
    balanceOver90: money(opening?.over_90),
    balanceOver120: money(opening?.over_120),
  };

  // ── Patient types ───────────────────────────────────────────────────────
  const stored_types = Array.isArray(patient.patient_types)
    ? (patient.patient_types as unknown[]).map((t) => s(t).toUpperCase())
    : [];
  const patient_types: PatientTypesState = {
    CH: stored_types.includes("CH"),
    CP: stored_types.includes("CP"),
    EF: stored_types.includes("EF"),
    // `patient_type: "Ortho"` is the scalar the rest of the app reads; the OR
    // code in `patient_types` is the legacy checkbox. Either one means ortho.
    OR: stored_types.includes("OR") || /ortho/i.test(s(patient.patient_type)),
    SN: stored_types.includes("SN"),
    SR: stored_types.includes("SR"),
    SS: stored_types.includes("SS"),
    UP: stored_types.includes("UP"),
  };

  return {
    patient,
    form,
    patient_types,
    audit,
    first_visit: s(patient.first_visit),
    last_visit: s(patient.last_visit),
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Save
// ---------------------------------------------------------------------------

export interface SaveEditsInput {
  patient_id: number;
  /** Flat PatientUpdate body, already built by the wizard's payload builder. */
  patient: PatientUpdate;
  opening_balance: OpeningBalanceIn | null;
}

/**
 * Persist the Patient Information screen. The patient record is the only
 * required write — if it fails the whole save fails. The opening balance is
 * best-effort and reported as a warning.
 */
export async function savePatientEdits(input: SaveEditsInput): Promise<string[]> {
  const warnings: string[] = [];

  await updatePatient(input.patient_id, input.patient);

  // Always written so clearing a bucket back to zero sticks.
  try {
    await setPatientOpeningBalance(
      input.patient_id,
      input.opening_balance ?? { current: 0, over_30: 0, over_60: 0, over_90: 0, over_120: 0 },
    );
  } catch {
    warnings.push("Starting balances could not be saved.");
  }

  return warnings;
}
