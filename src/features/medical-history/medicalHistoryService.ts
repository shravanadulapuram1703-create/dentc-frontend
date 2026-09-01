// Patient Medical History — persistence.
//
// The four tabs span four backend resources:
//   Medical Alerts        → /api/v1/patient-medical-alerts
//   Dental Questionnaire  → /api/v1/patient-questionnaire-responses (type "dental")
//   Medical Questionnaire → /api/v1/patient-questionnaire-responses (type "medical")
//   Signature             → /api/v1/patient-signatures
//
// There is no composite read or write, so this module fans out and reconciles by
// row id: answered rows are created or patched, rows the user cleared back to
// Not Answered are deleted. Every save returns a refreshed baseline that the
// caller MUST adopt, or a second save would insert a duplicate of everything the
// first one created.
//
// Backend gaps found while building this: docs/medical-history/medical_history_backend_devreport.md

import {
  listPatientMedicalAlerts,
  createPatientMedicalAlert,
  updatePatientMedicalAlert,
  deletePatientMedicalAlert,
  listPatientQuestionnaireResponses,
  createPatientQuestionnaireResponse,
  updatePatientQuestionnaireResponse,
  deletePatientQuestionnaireResponse,
  listPatientSignatures,
  createPatientSignature,
  listPatientEmergencyContacts,
  createPatientEmergencyContact,
  updatePatientEmergencyContact,
  listPatients,
  getPatient,
} from "@/api/generated/endpoints/patients/patients";
import type {
  PatientSignatureRead,
  PatientRead,
  PatientMedicalAlertCreateResponse,
} from "@/api/generated/model";
import { toCode } from "@/features/add-patient/legacyCatalogs";
import {
  emptyMedicalHistoryForm,
  type AlertAnswer,
  type MedicalHistoryForm,
  type QuestionnaireType,
} from "./medicalHistoryModel";

/** The `size` ceiling the backend enforces on list endpoints (CLAUDE.md). */
const PAGE_SIZE = 200;

/** The alert row that carries the free-text "Additional Comments" box. */
export const COMMENTS_ALERT_CODE = "ADDITIONAL_COMMENTS";

const questionKey = (type: QuestionnaireType, code: string) => `${type}::${code}`;
const s = (v: unknown): string => (v == null ? "" : String(v));

/**
 * Row ids present when the screen loaded. The save path diffs the edited form
 * against this to choose POST / PATCH / DELETE per row.
 */
export interface MedicalHistoryBaseline {
  /** alert_code → row id. */
  alert_ids: Record<string, number>;
  /** `${questionnaire_type}::${question_code}` → row id. */
  question_ids: Record<string, number>;
  /** Existing primary emergency-contact row, mirrored from the questionnaire. */
  emergency_contact_id: number | null;
}

export function emptyBaseline(): MedicalHistoryBaseline {
  return { alert_ids: {}, question_ids: {}, emergency_contact_id: null };
}

/** The most recent signature of each kind. */
export interface SignaturePair {
  patient: PatientSignatureRead | null;
  dentist: PatientSignatureRead | null;
}

export interface MedicalHistorySnapshot {
  form: MedicalHistoryForm;
  baseline: MedicalHistoryBaseline;
  signatures: SignaturePair;
  warnings: string[];
}

/**
 * Read a patient's stored medical history. Each resource settles independently
 * so one unreachable endpoint costs a warning banner, not the whole screen.
 */
export async function loadMedicalHistory(patient_id: number): Promise<MedicalHistorySnapshot> {
  const warnings: string[] = [];
  const baseline = emptyBaseline();
  const form = emptyMedicalHistoryForm();

  const settle = async <T,>(label: string, run: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await run();
    } catch {
      warnings.push(`${label} could not be loaded.`);
      return fallback;
    }
  };

  const [alert_rows, answer_rows, signatures, contacts] = await Promise.all([
    settle(
      "Medical alerts",
      async () =>
        (await listPatientMedicalAlerts({ patient_id, is_active: true, size: PAGE_SIZE })).items,
      [],
    ),
    settle(
      "Questionnaire answers",
      async () =>
        (
          await listPatientQuestionnaireResponses({
            patient_id,
            is_active: true,
            size: PAGE_SIZE,
          })
        ).items,
      [],
    ),
    settle("Signatures", () => loadSignatures(patient_id), { patient: null, dentist: null }),
    settle(
      "Emergency contact",
      async () => (await listPatientEmergencyContacts({ patient_id, size: 50 })).items,
      [],
    ),
  ]);

  for (const row of alert_rows) {
    baseline.alert_ids[row.alert_code] = row.id;
    if (row.alert_code === COMMENTS_ALERT_CODE) {
      form.alerts.comments = s(row.comments);
      continue;
    }
    const answer = s(row.response).toLowerCase();
    if (answer === "yes" || answer === "no") form.alerts.responses[row.alert_code] = answer;
  }

  for (const row of answer_rows) {
    const type: QuestionnaireType =
      s(row.questionnaire_type).toLowerCase() === "medical" ? "medical" : "dental";
    baseline.question_ids[questionKey(type, row.question_code)] = row.id;
    form[type][row.question_code] = s(row.answer);
  }

  // The Medical Questionnaire's Emergency Contact block is ALSO a real resource.
  // Seed those three questions from it when the questionnaire has no answer of
  // its own, so a contact captured at registration shows up here.
  const primary = contacts.find((c) => c.is_primary && c.is_active !== false) ?? contacts[0];
  if (primary) {
    baseline.emergency_contact_id = primary.id;
    const seed = (label: string, value: string) => {
      const code = toCode(label);
      if (!form.medical[code] && value) form.medical[code] = value;
    };
    seed("Emergency contact name", s(primary.name));
    seed("Emergency contact phone", s(primary.phone));
    seed("Emergency contact relationship to patient", s(primary.relationship));
  }

  return { form, baseline, signatures, warnings };
}

/** Latest patient-signed and latest user(dentist)-signed images. */
export async function loadSignatures(patient_id: number): Promise<SignaturePair> {
  const res = await listPatientSignatures({
    patient_id,
    page: 1,
    size: 50,
    sort: "created_at",
    order: "desc",
  });
  const rows = res.items ?? [];
  return {
    patient: rows.find((r) => !r.is_user_sig && r.signature_data) ?? null,
    dentist: rows.find((r) => r.is_user_sig && r.signature_data) ?? null,
  };
}

/**
 * Store one signature image. Signatures are append-only — the backend has no
 * concept of replacing one, so the newest row of each kind wins on read.
 */
export function saveSignature(
  patient_id: number,
  data_url: string,
  is_user_sig: boolean,
): Promise<PatientSignatureRead> {
  return createPatientSignature({
    patient_id,
    signature_data: data_url,
    signature_len: data_url.length,
    device_source: "web-pad",
    is_user_sig,
  });
}

export interface SaveMedicalHistoryInput {
  patient_id: number;
  baseline: MedicalHistoryBaseline;
  form: MedicalHistoryForm;
  alert_labels: Record<string, string>;
  question_labels: { dental: Record<string, string>; medical: Record<string, string> };
}

export interface SaveMedicalHistoryResult {
  warnings: string[];
  /** Row ids AFTER the save. The caller must adopt this before saving again. */
  baseline: MedicalHistoryBaseline;
}

/**
 * Persist all three data tabs. Sections are independent and best-effort: a
 * failure is reported and the remaining sections still save. Reconciling
 * against `baseline` makes repeated saves idempotent.
 */
export async function saveMedicalHistory(
  input: SaveMedicalHistoryInput,
): Promise<SaveMedicalHistoryResult> {
  const warnings: string[] = [];
  const { patient_id, baseline, form } = input;
  // Start from what already exists and mutate as rows are created or deleted.
  // Building this up from empty instead would lose every id after the point a
  // section threw, and the next save would duplicate those rows.
  const next: MedicalHistoryBaseline = {
    alert_ids: { ...baseline.alert_ids },
    question_ids: { ...baseline.question_ids },
    emergency_contact_id: baseline.emergency_contact_id,
  };

  // ── Medical Alerts ──────────────────────────────────────────────────────
  try {
    const answered = new Set<string>();
    for (const [code, answer] of Object.entries(form.alerts.responses)) {
      if (answer !== "yes" && answer !== "no") continue;
      answered.add(code);
      const existing_id = baseline.alert_ids[code];
      const response = answer as PatientMedicalAlertCreateResponse;
      const alert_label = input.alert_labels[code] ?? undefined;
      if (existing_id != null) {
        await updatePatientMedicalAlert(existing_id, { response, alert_label, is_active: true });
      } else {
        const created = await createPatientMedicalAlert({
          patient_id,
          alert_code: code,
          alert_label,
          response,
          is_active: true,
        });
        next.alert_ids[code] = created.id;
      }
    }

    const comments = form.alerts.comments.trim();
    const comments_id = baseline.alert_ids[COMMENTS_ALERT_CODE];
    if (comments) {
      answered.add(COMMENTS_ALERT_CODE);
      if (comments_id != null) {
        await updatePatientMedicalAlert(comments_id, { comments, is_active: true });
      } else {
        const created = await createPatientMedicalAlert({
          patient_id,
          alert_code: COMMENTS_ALERT_CODE,
          alert_label: "Additional Comments",
          comments,
          is_active: true,
        });
        next.alert_ids[COMMENTS_ALERT_CODE] = created.id;
      }
    }

    // Rows the user reset to Not Answered.
    for (const [code, id] of Object.entries(baseline.alert_ids)) {
      if (answered.has(code)) continue;
      await deletePatientMedicalAlert(id);
      delete next.alert_ids[code];
    }
  } catch {
    warnings.push("Medical alerts could not be saved.");
  }

  // ── Questionnaires ──────────────────────────────────────────────────────
  for (const type of ["dental", "medical"] as const) {
    try {
      const kept = new Set<string>();
      for (const [code, raw] of Object.entries(form[type])) {
        const answer = (raw ?? "").trim();
        if (!answer) continue;
        const key = questionKey(type, code);
        kept.add(key);
        const existing_id = baseline.question_ids[key];
        const question_text = input.question_labels[type][code] ?? undefined;
        if (existing_id != null) {
          await updatePatientQuestionnaireResponse(existing_id, {
            answer,
            question_text,
            is_active: true,
          });
        } else {
          const created = await createPatientQuestionnaireResponse({
            patient_id,
            questionnaire_type: type,
            question_code: code,
            question_text,
            answer,
            is_active: true,
          });
          next.question_ids[key] = created.id;
        }
      }
      for (const [key, id] of Object.entries(baseline.question_ids)) {
        if (!key.startsWith(`${type}::`) || kept.has(key)) continue;
        await deletePatientQuestionnaireResponse(id);
        delete next.question_ids[key];
      }
    } catch {
      warnings.push(
        `${type === "dental" ? "Dental" : "Medical"} questionnaire answers could not be saved.`,
      );
    }
  }

  // ── Emergency contact mirror ────────────────────────────────────────────
  // Legacy keeps this block on the Medical Questionnaire, but the backend has a
  // real `patient-emergency-contacts` resource that the rest of the app reads.
  // Keep the two in step rather than letting the questionnaire own a second,
  // invisible copy.
  try {
    const value = (label: string) => (form.medical[toCode(label)] ?? "").trim();
    const name = value("Emergency contact name");
    const phone = value("Emergency contact phone");
    const relationship = value("Emergency contact relationship to patient");
    if (name) {
      if (baseline.emergency_contact_id != null) {
        await updatePatientEmergencyContact(baseline.emergency_contact_id, {
          name,
          phone: phone || undefined,
          relationship: relationship || undefined,
          is_active: true,
        });
      } else {
        const created = await createPatientEmergencyContact({
          patient_id,
          name,
          phone: phone || undefined,
          relationship: relationship || undefined,
          is_primary: true,
          is_active: true,
        });
        next.emergency_contact_id = created.id;
      }
    }
  } catch {
    warnings.push("Emergency contact could not be saved.");
  }

  return { warnings, baseline: next };
}

// ---------------------------------------------------------------------------
// Copy Medical History (legacy "***Copy Medical History***" picker)
// ---------------------------------------------------------------------------

/** What the copy action brings across. */
export type CopyScope = "all" | "alerts" | "dental" | "medical";

export const COPY_SCOPE_LABELS: Record<CopyScope, string> = {
  all: "Copy Medical History (everything)",
  alerts: "Copy Medical Alerts",
  dental: "Copy Dental Questionnaire",
  medical: "Copy Medical Questionnaire",
};

/** Bare noun for the same scope, for sentences that supply their own verb. */
export const COPY_SCOPE_NOUNS: Record<CopyScope, string> = {
  all: "the whole medical history",
  alerts: "the medical alerts",
  dental: "the dental questionnaire",
  medical: "the medical questionnaire",
};

/**
 * Read another patient's answers for the copy picker.
 *
 * There is no server-side copy endpoint, so this is a read of the source
 * followed by a normal save on the target — meaning the copy lands in the form
 * unsaved, and the user still has to press Save. That is deliberate: it gives
 * them a chance to review what came across before it is written to a chart.
 */
export async function loadHistoryForCopy(source_patient_id: number): Promise<MedicalHistoryForm> {
  const snapshot = await loadMedicalHistory(source_patient_id);
  return snapshot.form;
}

/** Merge a copied history into the current form, honouring the chosen scope. */
export function applyCopy(
  current: MedicalHistoryForm,
  incoming: MedicalHistoryForm,
  scope: CopyScope,
): MedicalHistoryForm {
  const next: MedicalHistoryForm = {
    alerts: { responses: { ...current.alerts.responses }, comments: current.alerts.comments },
    dental: { ...current.dental },
    medical: { ...current.medical },
  };
  if (scope === "all" || scope === "alerts") {
    next.alerts = {
      responses: { ...incoming.alerts.responses },
      comments: incoming.alerts.comments,
    };
  }
  if (scope === "all" || scope === "dental") next.dental = { ...incoming.dental };
  if (scope === "all" || scope === "medical") {
    // The emergency contact is specific to the person, never to their history —
    // copying it would attach one patient's next-of-kin to another's chart.
    const kept: Record<string, string> = { ...incoming.medical };
    for (const label of [
      "Emergency contact name",
      "Emergency contact phone",
      "Emergency contact relationship to patient",
    ]) {
      delete kept[toCode(label)];
      const existing = current.medical[toCode(label)];
      if (existing) kept[toCode(label)] = existing;
    }
    next.medical = kept;
  }
  return next;
}

/**
 * Patient search for the copy dialog.
 *
 * `GET /patients?search=` matches names but ranks nothing — it just pages
 * alphabetically. Searching "Rob" for the patient *Rob, Leo* returns 25 of the
 * several hundred "Robert"s and the intended match never appears, at any page a
 * picker would reasonably load (gap MH-9). Until the backend ranks results this
 * compensates on the client:
 *
 *   • a bare number is looked up as a patient id / chart number directly
 *   • "Last, First" is split, searched on the surname, then filtered exactly
 *   • a phone is matched through its own filter
 *
 * Exact hits are listed first so the thing the user actually typed is on top.
 */
export async function searchPatients(term: string): Promise<PatientRead[]> {
  const query = term.trim();
  if (query.length < 2) return [];

  const digits = query.replace(/\D/g, "");
  const isNumeric = /^\d+$/.test(query);

  const run = async (params: Parameters<typeof listPatients>[0]) => {
    try {
      return (await listPatients(params)).items ?? [];
    } catch {
      return [];
    }
  };

  // "Last, First" — search the surname, then narrow on both parts below.
  const [lastPart, firstPart] = query.split(",").map((p) => p.trim());
  const nameQuery = lastPart && firstPart ? lastPart : query;

  const [byId, byChart, byPhone, byName] = await Promise.all([
    isNumeric
      ? getPatient(Number(query))
          .then((p) => [p])
          .catch(() => [] as PatientRead[])
      : Promise.resolve([] as PatientRead[]),
    isNumeric || digits.length >= 4 ? run({ chart_no: query, size: 10 }) : Promise.resolve([]),
    digits.length >= 7 ? run({ phone: digits, size: 10 }) : Promise.resolve([]),
    run({ search: nameQuery, size: 50, sort: "last_name", order: "asc" }),
  ]);

  // When the user gave both parts, keep only rows matching both.
  const narrowed =
    lastPart && firstPart
      ? byName.filter(
          (p) =>
            (p.last_name ?? "").toLowerCase().startsWith(lastPart.toLowerCase()) &&
            (p.first_name ?? "").toLowerCase().startsWith(firstPart.toLowerCase()),
        )
      : byName;

  const merged: PatientRead[] = [];
  const seen = new Set<number>();
  for (const row of [...byId, ...byChart, ...byPhone, ...narrowed]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }
  return merged.slice(0, 25);
}
