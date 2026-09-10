// Edit mode for the Add-Patient wizard.
//
// Editing runs the same steps the create flow does — Patient Information,
// Responsible Party, Recall Information — so a patient saved with Quick Save
// (which persists only the patient record, the self responsible-party link and
// the opening balances) can be reopened later and completed. Before this, edit
// mode was Step 1 only and the skipped sections had no entry point at all.
//
// Medical Alerts and the Dental/Medical Questionnaires are deliberately NOT
// here: they belong to the dedicated Patient Medical History screen
// (`/patient/:id/medical-history`), which also owns the Signature tab and the
// Copy Medical History picker. Keeping them out matters for more than tidiness
// — this module deletes rows it does not find in the form, so owning a section
// it no longer displays would silently wipe that patient's answers on save.
//
// Two halves:
//   • `loadPatientForEdit`      — Step 1 (patient record + opening A/R + audit)
//   • `loadPatientSections`     — Responsible Party + Recall, plus the row ids
//                                 needed to save them as updates, not duplicates
// and their mirror images `savePatientEdits` / `savePatientSections`.
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
  getResponsibleParty,
  createResponsibleParty,
  updateResponsibleParty,
  listPatientRecalls,
  createPatientRecall,
  updatePatientRecall,
  deletePatientRecall,
} from "@/api/generated/endpoints/patients/patients";
import { getUser } from "@/api/generated/endpoints/users/users";
import type {
  PatientRead,
  PatientUpdate,
  PatientInsuranceRead,
  OpeningBalanceIn,
  PatientRecallUpdate,
} from "@/api/generated/model";
import {
  COVERAGE_SLOTS,
  DEFAULT_RECALLS,
  buildRecallCreate,
  buildResponsiblePartyPerson,
  emptyResponsibleParty,
  type CoverageSlotKey,
  type RecallEntry,
  type ResponsiblePartyForm,
} from "./wizardModel";

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

// ===========================================================================
// Responsible Party · Recall — the wizard's remaining editable sections
// ===========================================================================
//
// These are the sections Quick Save skips that the wizard still owns. Each
// lives in its own backend resource, so both load and save fan out, and each
// leg is independently best-effort: one unreachable resource degrades to a
// warning instead of blocking the other.

/** The `size` ceiling the backend enforces on list endpoints (CLAUDE.md). */
const PAGE_SIZE = 200;

/**
 * Row ids present when the sections loaded. The save path diffs the edited
 * forms against this to decide POST / PATCH / DELETE per row, so re-saving
 * cannot pile up duplicate recall records.
 */
export interface PatientSectionsBaseline {
  /** Every recall row id that existed at load time. */
  recall_ids: number[];
}

export function emptySectionsBaseline(): PatientSectionsBaseline {
  return { recall_ids: [] };
}

/** What the Responsible Party and Recall steps need to render an existing patient. */
export interface PatientSectionsSnapshot {
  responsible_party: ResponsiblePartyForm;
  /** Backing guarantor row, when the patient links to a resolvable one. */
  responsible_party_id: number | null;
  recalls: RecallEntry[];
  baseline: PatientSectionsBaseline;
  warnings: string[];
}

/** `"09:00:00"` → `"09:00"` — `<input type="time">` rejects the seconds. */
const timeValue = (v?: string | null): string => (v ? String(v).slice(0, 5) : "");
/** Dates arrive as `"2026-08-29"` or a full timestamp; the date inputs want the day. */
const dateValue = (v?: string | null): string => (v ? String(v).slice(0, 10) : "");

/**
 * The patient's guarantor row, or null. `responsible_party_id` is a **string**
 * on `PatientRead` and legacy records carry an un-migrated id that has no row
 * behind it, so a non-numeric id is skipped outright and a 404 is treated as
 * "no guarantor" rather than an error (gap PO-2).
 */
async function loadGuarantor(patient: PatientRead) {
  const raw = patient.responsible_party_id ?? null;
  if (!raw || !/^\d+$/.test(String(raw))) return null;
  try {
    return await getResponsibleParty(Number(raw));
  } catch {
    return null;
  }
}

/**
 * Hydrate the Responsible Party and Recall steps from the stored patient.
 *
 * A patient with no recall rows falls back to the six legacy default rows the
 * create flow seeds, so a Quick-Saved patient opens on the same screen the user
 * would have seen had they not skipped it.
 */
export async function loadPatientSections(
  patient: PatientRead,
): Promise<PatientSectionsSnapshot> {
  const warnings: string[] = [];
  const baseline = emptySectionsBaseline();
  const patient_id = patient.id;

  const settle = async <T,>(label: string, run: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await run();
    } catch {
      warnings.push(`${label} could not be loaded.`);
      return fallback;
    }
  };

  const [guarantor, recall_rows] = await Promise.all([
    loadGuarantor(patient),
    settle(
      "Recalls",
      async () =>
        (await listPatientRecalls({ patient_id, is_active: true, size: PAGE_SIZE })).items,
      [],
    ),
  ]);

  // ── Responsible Party ───────────────────────────────────────────────────
  // The guarantor row holds the billing identity; the patient row holds the
  // relationship between the two. `rp_source` is a UI-only concept with no
  // stored counterpart, so it is inferred: a real guarantor row means the
  // patient is not self-responsible.
  const responsible_party = emptyResponsibleParty();
  const stored_relationship = s(patient.responsible_party_relationship);
  if (guarantor) {
    const source_from_relationship = RP_SOURCE_BY_RELATIONSHIP[stored_relationship.toLowerCase()];
    Object.assign(responsible_party, {
      rp_source: source_from_relationship ?? "Other",
      relationship: stored_relationship || "Other",
      resp_party_type: s(guarantor.resp_party_type) || "CA",
      title: s(guarantor.title),
      preferred_name: s(guarantor.preferred_name),
      first_name: s(guarantor.first_name),
      last_name: s(guarantor.last_name),
      middle_initial: s(guarantor.middle_initial),
      dob: dateValue(guarantor.dob),
      sex: s(guarantor.sex),
      marital_status: s(guarantor.marital_status) || "Single",
      ssn: s(guarantor.ssn),
      driver_license: s(guarantor.driver_license),
      address_line1: s(guarantor.address_line1),
      address_line2: s(guarantor.address_line2),
      city: s(guarantor.city),
      state: s(guarantor.state),
      zip: s(guarantor.zip),
      email: s(guarantor.email),
      home_phone: s(guarantor.home_phone),
      cell_phone: s(guarantor.cell_phone),
      work_phone: s(guarantor.work_phone),
      employer: s(guarantor.employer),
      send_statements: b(guarantor.send_statements, true),
      no_email_statement: b(guarantor.no_email_statement),
      send_to_collection: b(guarantor.send_collections),
      apply_finance_charge: b(guarantor.is_finance_charge, true),
      collection_agency_id: guarantor.collection_agency_id ?? null,
      custom_statement_message: s(guarantor.statement_message),
      print_message_times: String(guarantor.statement_message_print_count ?? 0),
      financial_notes: s(guarantor.financial_notes),
      responsible_party_notes: s(guarantor.responsible_party_notes),
    } satisfies Partial<ResponsiblePartyForm>);
  }

  // ── Recall ──────────────────────────────────────────────────────────────
  // `buildRecallCreate` writes the raw interval alongside its unit rather than
  // normalising to months, so this reads straight back without conversion.
  const stored_recalls: RecallEntry[] = recall_rows.map((row) => {
    baseline.recall_ids.push(row.id);
    return {
      id: row.id,
      procedure_code: s(row.procedure_code),
      interval: row.interval_months != null ? String(row.interval_months) : "",
      interval_type: s(row.interval_unit).toLowerCase() === "year" ? "Year" : "Month",
      due_date: dateValue(row.due_date),
      sched_date: dateValue(row.scheduled_date),
      sched_time: timeValue(row.scheduled_time),
      reason: s(row.recall_type),
    };
  });
  const recalls =
    stored_recalls.length > 0 ? stored_recalls : DEFAULT_RECALLS.map((r) => ({ ...r }));

  return {
    responsible_party,
    responsible_party_id: guarantor?.id ?? null,
    recalls,
    baseline,
    warnings,
  };
}

/**
 * `rp_source` has no stored column — it is reconstructed from the patient's
 * relationship to the guarantor. Anything unrecognised lands on "Other", which
 * keeps the guarantor editable without inventing a relationship.
 */
const RP_SOURCE_BY_RELATIONSHIP: Record<string, string> = {
  self: "Self",
  spouse: "Spouse",
  child: "Parent", // the patient is the CHILD ⇒ the guarantor is the parent
  parent: "Other",
  guardian: "Guardian",
  ward: "Guardian",
};

export interface SaveSectionsInput {
  patient_id: number;
  office_id: number | null;
  /** Row ids captured by {@link loadPatientSections}. */
  baseline: PatientSectionsBaseline;
  responsible_party: ResponsiblePartyForm;
  /** Existing guarantor row id, when one was resolved at load time. */
  responsible_party_id: number | null;
  recalls: RecallEntry[];
}

export interface SaveSectionsResult {
  warnings: string[];
  /**
   * The row ids as they stand AFTER the save, including rows just created.
   * The caller must adopt this as its new baseline — saving twice without it
   * would re-create every row the first save inserted.
   */
  baseline: PatientSectionsBaseline;
  /** The guarantor row id, now non-null if this save created one. */
  responsible_party_id: number | null;
  /** The recall rows carrying the ids they now have on the backend. */
  recalls: RecallEntry[];
}

/**
 * Persist the Responsible Party and Recall steps against an existing patient.
 *
 * Both sections are independent and best-effort: a failure is reported as a
 * warning and the other still saves. Recall rows are reconciled against
 * `baseline`, so this is idempotent across repeated saves.
 */
export async function savePatientSections(
  input: SaveSectionsInput,
): Promise<SaveSectionsResult> {
  const warnings: string[] = [];
  const { patient_id, baseline } = input;
  // Rebuilt as we go so the caller can save again without duplicating rows.
  const next: PatientSectionsBaseline = emptySectionsBaseline();
  let responsible_party_id = input.responsible_party_id;

  // ── Responsible Party ───────────────────────────────────────────────────
  // A self-responsible patient has no guarantor record to write: the link is
  // the `responsible_party_relationship` already carried on the patient by
  // Step 1. Only a real guarantor is created or patched here, and an existing
  // one is never deleted — unlinking is not something this screen offers.
  if (input.responsible_party.rp_source !== "Self") {
    const person = buildResponsiblePartyPerson(input.responsible_party);
    try {
      if (responsible_party_id != null) {
        await updateResponsibleParty(responsible_party_id, person);
      } else {
        const created = await createResponsibleParty({
          ...person,
          home_office_id: input.office_id ?? undefined,
          is_active: true,
        });
        responsible_party_id = created.id;
        // Link the new guarantor to the patient, or it exists but bills nobody.
        await updatePatient(patient_id, {
          responsible_party_id: String(created.id),
          responsible_party_relationship: input.responsible_party.relationship || undefined,
        });
      }
    } catch {
      warnings.push("Responsible party could not be saved.");
    }
  }

  // ── Recall ──────────────────────────────────────────────────────────────
  // A row is a recall only once it has a due date — same rule the create flow
  // applies. Clearing the due date on a stored row therefore deletes it.
  const surviving = new Set<number>();
  const saved_recalls: RecallEntry[] = [];
  /** Record one row's outcome exactly once: what to show, and what id it keeps. */
  const keepRecall = (entry: RecallEntry, id: number | undefined) => {
    saved_recalls.push(id === entry.id ? entry : { ...entry, id });
    if (id == null) return;
    surviving.add(id);
    if (!next.recall_ids.includes(id)) next.recall_ids.push(id);
  };

  for (const entry of input.recalls) {
    // A row with no due date is not a recall yet. Keep it on screen (the user
    // may still be filling it in) but drop any stale id, so a stored row whose
    // date was cleared gets deleted below rather than re-patched.
    if (!entry.due_date) {
      keepRecall(entry, undefined);
      continue;
    }
    const label = entry.reason || entry.procedure_code || "Recall";
    try {
      if (entry.id != null) {
        const interval = parseInt(entry.interval, 10);
        // `status` and `last_completed` are deliberately not sent — a stored
        // recall may already be completed and this screen must not reset it.
        const patch: PatientRecallUpdate = {
          office_id: input.office_id ?? undefined,
          recall_type: entry.reason.trim() || null,
          procedure_code: entry.procedure_code.trim() || null,
          due_date: entry.due_date || null,
          interval_months: Number.isFinite(interval) ? interval : null,
          interval_unit: entry.interval_type.toLowerCase(),
          scheduled_date: entry.sched_date || null,
          scheduled_time: entry.sched_time || null,
          is_active: true,
        };
        await updatePatientRecall(entry.id, patch);
        keepRecall(entry, entry.id);
      } else {
        const created = await createPatientRecall(
          buildRecallCreate(entry, patient_id, input.office_id),
        );
        keepRecall(entry, created.id);
      }
    } catch {
      warnings.push(`Recall "${label}" could not be saved.`);
      // Keep the row as the user left it so a retry still has their input, and
      // hold on to its id so a failed update is not mistaken for a deletion.
      keepRecall(entry, entry.id);
    }
  }
  for (const id of baseline.recall_ids) {
    if (surviving.has(id)) continue;
    try {
      await deletePatientRecall(id);
    } catch {
      warnings.push("A removed recall could not be deleted.");
    }
  }

  return { warnings, baseline: next, responsible_party_id, recalls: saved_recalls };
}
