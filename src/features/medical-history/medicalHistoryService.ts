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
import { looks_like_legacy_id, lookup_patients_by_legacy_id } from "@/features/patients/patientLookup";
import type {
  PatientMedicalAlertRead,
  PatientQuestionnaireResponseRead,
  PatientSignatureRead,
  PatientRead,
  PatientMedicalAlertCreateResponse,
} from "@/api/generated/model";
import { parseServerDateTime } from "@/utils/datetime";
import { toCode } from "@/features/add-patient/legacyCatalogs";
import { signatureBodyFields, type SignatureResult } from "@/features/signature/signatureModel";
import {
  emptyMedicalHistoryForm,
  type AlertAnswer,
  type MedicalHistoryForm,
  type QuestionnaireType,
} from "./medicalHistoryModel";

/** The `size` ceiling the backend enforces on list endpoints (CLAUDE.md). */
const PAGE_SIZE = 200;

/** The alert row that carries the free-text "Additional Comments" box — owned
 *  by the shared medical-alerts module so every consumer skips the same row. */
import {
  COMMENTS_ALERT_CODE,
  invalidatePatientMedicalAlerts,
} from "@/features/medical-alerts/patientMedicalAlerts";
export { COMMENTS_ALERT_CODE };

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
  /**
   * The stored value of each row as loaded (alert answer, or the comments text
   * for the comments row). Save compares against these and leaves an unchanged
   * row alone — the backend bumps `updated_at` / `updated_by` on every PATCH,
   * even a no-op one, so blindly re-sending every answer would stamp the whole
   * history as "modified now" each time anyone pressed Save.
   */
  alert_values: Record<string, string>;
  /** `${questionnaire_type}::${question_code}` → stored answer. */
  question_values: Record<string, string>;
}

export function emptyBaseline(): MedicalHistoryBaseline {
  return {
    alert_ids: {},
    question_ids: {},
    emergency_contact_id: null,
    alert_values: {},
    question_values: {},
  };
}

// ---------------------------------------------------------------------------
// Created / Modified stamps + change log
// ---------------------------------------------------------------------------
//
// The backend stamps every row with created_at/by and updated_at/by (PATCH and
// the soft DELETE both refresh the latter). There is no per-patient "history"
// record, so the screen-level stamps legacy prints in its header are derived
// here: Created = the earliest row, Modified = the most recent write, including
// answers that were removed. Details in the backend report (MH-17..MH-20).

/** One "who / when" pair. `at` is the raw server timestamp. */
export interface AuditStamp {
  at: string | null;
  by: string | null;
}

export interface SectionAudit {
  created: AuditStamp;
  modified: AuditStamp;
  /** Answered rows currently on file. */
  active_rows: number;
}

export type AuditSection = "alerts" | "dental" | "medical" | "signature";

export interface MedicalHistoryAudit {
  sections: Record<AuditSection, SectionAudit>;
  /** Across every section — what the header prints. */
  overall: { created: AuditStamp; modified: AuditStamp };
}

export type ChangeLogAction = "created" | "modified" | "removed";

/** One row-level event, derived from the row's own stamps. */
export interface ChangeLogEntry {
  at: string;
  by: string | null;
  action: ChangeLogAction;
  section: AuditSection;
  /** What was answered — the alert label or question text. */
  item: string;
  /** The value on file after the event ("" for a removal). */
  value: string;
}

export const AUDIT_SECTION_LABELS: Record<AuditSection, string> = {
  alerts: "Medical Alerts",
  dental: "Dental Questionnaire",
  medical: "Medical Questionnaire",
  signature: "Signature",
};

const EMPTY_STAMP: AuditStamp = { at: null, by: null };
const EMPTY_SECTION: SectionAudit = { created: EMPTY_STAMP, modified: EMPTY_STAMP, active_rows: 0 };

export function emptyAudit(): MedicalHistoryAudit {
  return {
    sections: {
      alerts: EMPTY_SECTION,
      dental: EMPTY_SECTION,
      medical: EMPTY_SECTION,
      signature: EMPTY_SECTION,
    },
    overall: { created: EMPTY_STAMP, modified: EMPTY_STAMP },
  };
}

const ms = (value?: string | null): number => parseServerDateTime(value)?.getTime() ?? NaN;

/** A stamp-bearing row, whichever resource it came from. */
interface StampedRow {
  is_active: boolean;
  created_at: string;
  created_by_name?: string | null;
  updated_at?: string | null;
  updated_by_name?: string | null;
  created_by?: number | null;
  updated_by?: number | null;
}

const byName = (name?: string | null, id?: number | null): string | null =>
  name || (id != null ? `User #${id}` : null);

/** The most recent write to a row: its update when it has one, else its creation. */
function lastWrite(row: StampedRow): AuditStamp {
  return row.updated_at
    ? { at: row.updated_at, by: byName(row.updated_by_name, row.updated_by) }
    : { at: row.created_at, by: byName(row.created_by_name, row.created_by) };
}

function sectionAudit(rows: StampedRow[]): SectionAudit {
  let created: AuditStamp = EMPTY_STAMP;
  let modified: AuditStamp = EMPTY_STAMP;
  for (const row of rows) {
    if (!created.at || ms(row.created_at) < ms(created.at)) {
      created = { at: row.created_at, by: byName(row.created_by_name, row.created_by) };
    }
    const write = lastWrite(row);
    if (!modified.at || ms(write.at) > ms(modified.at)) modified = write;
  }
  return { created, modified, active_rows: rows.filter((r) => r.is_active).length };
}

function earliest(stamps: AuditStamp[]): AuditStamp {
  return stamps.reduce<AuditStamp>(
    (acc, x) => (x.at && (!acc.at || ms(x.at) < ms(acc.at)) ? x : acc),
    EMPTY_STAMP,
  );
}

function latest(stamps: AuditStamp[]): AuditStamp {
  return stamps.reduce<AuditStamp>(
    (acc, x) => (x.at && (!acc.at || ms(x.at) > ms(acc.at)) ? x : acc),
    EMPTY_STAMP,
  );
}

const questionnaireSection = (row: PatientQuestionnaireResponseRead): AuditSection =>
  s(row.questionnaire_type).toLowerCase() === "medical" ? "medical" : "dental";

export function computeAudit(
  alert_rows: PatientMedicalAlertRead[],
  answer_rows: PatientQuestionnaireResponseRead[],
  signature_rows: PatientSignatureRead[],
): MedicalHistoryAudit {
  const sections: Record<AuditSection, SectionAudit> = {
    alerts: sectionAudit(alert_rows),
    dental: sectionAudit(answer_rows.filter((r) => questionnaireSection(r) === "dental")),
    medical: sectionAudit(answer_rows.filter((r) => questionnaireSection(r) === "medical")),
    signature: sectionAudit(signature_rows),
  };
  const all = Object.values(sections);
  return {
    sections,
    overall: {
      created: earliest(all.map((x) => x.created)),
      modified: latest(all.map((x) => x.modified)),
    },
  };
}

/** How many events the change log keeps (newest first). */
export const CHANGE_LOG_LIMIT = 100;

/**
 * Flatten the rows into a newest-first event list. A row yields its creation
 * and, when it has been written since, one more event: a removal when it has
 * been reset to Not Answered (soft-deleted), otherwise a modification. The
 * backend keeps no per-change history, so intermediate edits are not
 * recoverable — only the latest write per row is known (MH-19).
 */
export function buildChangeLog(
  alert_rows: PatientMedicalAlertRead[],
  answer_rows: PatientQuestionnaireResponseRead[],
  signature_rows: PatientSignatureRead[],
): ChangeLogEntry[] {
  const entries: ChangeLogEntry[] = [];
  const push = (row: StampedRow, section: AuditSection, item: string, value: string) => {
    entries.push({
      at: row.created_at,
      by: byName(row.created_by_name, row.created_by),
      action: "created",
      section,
      item,
      // The value at creation is unknown once the row has been rewritten; show
      // what is on file only while the row is still in its original state.
      value: row.updated_at ? "" : value,
    });
    if (row.updated_at) {
      entries.push({
        at: row.updated_at,
        by: byName(row.updated_by_name, row.updated_by),
        action: row.is_active ? "modified" : "removed",
        section,
        item,
        value: row.is_active ? value : "",
      });
    }
  };
  for (const row of alert_rows) {
    const label = row.alert_label || row.alert_code;
    push(
      row,
      "alerts",
      row.alert_code === COMMENTS_ALERT_CODE ? "Additional Comments" : label,
      row.alert_code === COMMENTS_ALERT_CODE ? s(row.comments) : s(row.response).toUpperCase(),
    );
  }
  for (const row of answer_rows) {
    push(row, questionnaireSection(row), row.question_text || row.question_code, s(row.answer));
  }
  for (const row of signature_rows) {
    push(
      row,
      "signature",
      row.is_user_sig ? "Dentist signature" : "Patient signature",
      row.device_source ? `captured on ${row.device_source}` : "captured",
    );
  }
  return entries
    .filter((e) => Number.isFinite(ms(e.at)))
    .sort((a, b) => ms(b.at) - ms(a.at))
    .slice(0, CHANGE_LOG_LIMIT);
}

/**
 * Rows the user has reset to Not Answered are soft-deleted, so the active list
 * the form binds to cannot see them — yet a removal is the most recent
 * "modification" of the history. Fetch them separately, newest write first.
 * (Capped at one page; older removals fall off the change log, nothing else.)
 */
async function listInactiveAlerts(patient_id: number): Promise<PatientMedicalAlertRead[]> {
  return (
    await listPatientMedicalAlerts({
      patient_id,
      is_active: false,
      size: PAGE_SIZE,
      sort: "updated_at",
      order: "desc",
    })
  ).items;
}

async function listInactiveAnswers(
  patient_id: number,
): Promise<PatientQuestionnaireResponseRead[]> {
  return (
    await listPatientQuestionnaireResponses({
      patient_id,
      is_active: false,
      size: PAGE_SIZE,
      sort: "updated_at",
      order: "desc",
    })
  ).items;
}

export interface MedicalHistoryAuditSnapshot {
  audit: MedicalHistoryAudit;
  change_log: ChangeLogEntry[];
}

/**
 * Recompute the stamps and the change log from what is on the server — used
 * after a save, when the row set has just changed. Best effort: a failed
 * resource contributes nothing rather than failing the refresh.
 */
export async function loadMedicalHistoryAudit(
  patient_id: number,
): Promise<MedicalHistoryAuditSnapshot> {
  const quiet = async <T,>(run: () => Promise<T[]>): Promise<T[]> => {
    try {
      return await run();
    } catch {
      return [];
    }
  };
  const [active_alerts, inactive_alerts, active_answers, inactive_answers, signature_rows] =
    await Promise.all([
      quiet(
        async () =>
          (await listPatientMedicalAlerts({ patient_id, is_active: true, size: PAGE_SIZE })).items,
      ),
      quiet(() => listInactiveAlerts(patient_id)),
      quiet(
        async () =>
          (
            await listPatientQuestionnaireResponses({
              patient_id,
              is_active: true,
              size: PAGE_SIZE,
            })
          ).items,
      ),
      quiet(() => listInactiveAnswers(patient_id)),
      quiet(() => listSignatureRows(patient_id)),
    ]);
  const alerts = [...active_alerts, ...inactive_alerts];
  const answers = [...active_answers, ...inactive_answers];
  return {
    audit: computeAudit(alerts, answers, signature_rows),
    change_log: buildChangeLog(alerts, answers, signature_rows),
  };
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
  audit: MedicalHistoryAudit;
  change_log: ChangeLogEntry[];
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

  const [alert_rows, answer_rows, signature_rows, contacts, inactive_alerts, inactive_answers] =
    await Promise.all([
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
      settle("Signatures", () => listSignatureRows(patient_id), []),
      settle(
        "Emergency contact",
        async () => (await listPatientEmergencyContacts({ patient_id, size: 50 })).items,
        [],
      ),
      // Audit only — a failure here costs nothing the user can act on.
      listInactiveAlerts(patient_id).catch(() => []),
      listInactiveAnswers(patient_id).catch(() => []),
    ]);
  const signatures = pickLatestSignatures(signature_rows);

  for (const row of alert_rows) {
    baseline.alert_ids[row.alert_code] = row.id;
    if (row.alert_code === COMMENTS_ALERT_CODE) {
      form.alerts.comments = s(row.comments);
      baseline.alert_values[row.alert_code] = s(row.comments).trim();
      continue;
    }
    const answer = s(row.response).toLowerCase();
    baseline.alert_values[row.alert_code] = answer;
    if (answer === "yes" || answer === "no") form.alerts.responses[row.alert_code] = answer;
  }

  for (const row of answer_rows) {
    const type: QuestionnaireType =
      s(row.questionnaire_type).toLowerCase() === "medical" ? "medical" : "dental";
    const key = questionKey(type, row.question_code);
    baseline.question_ids[key] = row.id;
    baseline.question_values[key] = s(row.answer).trim();
    form[type][row.question_code] = s(row.answer);
  }

  const all_alerts = [...alert_rows, ...inactive_alerts];
  const all_answers = [...answer_rows, ...inactive_answers];
  const audit = computeAudit(all_alerts, all_answers, signature_rows);
  const change_log = buildChangeLog(all_alerts, all_answers, signature_rows);

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

  return { form, baseline, signatures, audit, change_log, warnings };
}

/** The patient's signature rows, newest first. */
async function listSignatureRows(patient_id: number): Promise<PatientSignatureRead[]> {
  const res = await listPatientSignatures({
    patient_id,
    page: 1,
    size: 50,
    sort: "created_at",
    order: "desc",
  });
  return res.items ?? [];
}

function pickLatestSignatures(rows: PatientSignatureRead[]): SignaturePair {
  return {
    patient: rows.find((r) => !r.is_user_sig && r.signature_data) ?? null,
    dentist: rows.find((r) => r.is_user_sig && r.signature_data) ?? null,
  };
}

/** Latest patient-signed and latest user(dentist)-signed images. */
export async function loadSignatures(patient_id: number): Promise<SignaturePair> {
  return pickLatestSignatures(await listSignatureRows(patient_id));
}

/**
 * Store one signature image. Signatures are append-only — the backend has no
 * concept of replacing one, so the newest row of each kind wins on read.
 */
export function saveSignature(
  patient_id: number,
  signature: SignatureResult,
  is_user_sig: boolean,
): Promise<PatientSignatureRead> {
  return createPatientSignature({
    patient_id,
    ...signatureBodyFields(signature),
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
  /** True when at least one row was created, changed or removed. */
  changed: boolean;
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
    alert_values: { ...baseline.alert_values },
    question_values: { ...baseline.question_values },
  };
  let changed = false;

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
        // Unchanged rows are left alone so their Modified stamp stays honest.
        if (baseline.alert_values[code] === answer) continue;
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
      next.alert_values[code] = answer;
      changed = true;
    }

    const comments = form.alerts.comments.trim();
    const comments_id = baseline.alert_ids[COMMENTS_ALERT_CODE];
    if (comments) {
      answered.add(COMMENTS_ALERT_CODE);
      if (comments_id != null) {
        if (baseline.alert_values[COMMENTS_ALERT_CODE] !== comments) {
          await updatePatientMedicalAlert(comments_id, { comments, is_active: true });
          changed = true;
        }
      } else {
        const created = await createPatientMedicalAlert({
          patient_id,
          alert_code: COMMENTS_ALERT_CODE,
          alert_label: "Additional Comments",
          comments,
          is_active: true,
        });
        next.alert_ids[COMMENTS_ALERT_CODE] = created.id;
        changed = true;
      }
      next.alert_values[COMMENTS_ALERT_CODE] = comments;
    }

    // Rows the user reset to Not Answered.
    for (const [code, id] of Object.entries(baseline.alert_ids)) {
      if (answered.has(code)) continue;
      await deletePatientMedicalAlert(id);
      delete next.alert_ids[code];
      delete next.alert_values[code];
      changed = true;
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
          if (baseline.question_values[key] === answer) continue;
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
        next.question_values[key] = answer;
        changed = true;
      }
      for (const [key, id] of Object.entries(baseline.question_ids)) {
        if (!key.startsWith(`${type}::`) || kept.has(key)) continue;
        await deletePatientQuestionnaireResponse(id);
        delete next.question_ids[key];
        delete next.question_values[key];
        changed = true;
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

  // The Prescriptions banner and the Scheduler badge read a cached alert
  // summary — drop it so the answers just written show up on the next screen.
  invalidatePatientMedicalAlerts(patient_id);

  return { warnings, baseline: next, changed };
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
 *   • a bare number is looked up as a patient id / chart number / legacy id
 *     directly (legacy id via the pending `legacy_id=` filter, PT-SEARCH-1)
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

  const [byId, byLegacy, byChart, byPhone, byName] = await Promise.all([
    isNumeric
      ? getPatient(Number(query))
          .then((p) => [p])
          .catch(() => [] as PatientRead[])
      : Promise.resolve([] as PatientRead[]),
    // Exact legacy-id hits only; when the backend ignores the filter the
    // helper returns none rather than a random page (PT-SEARCH-1).
    looks_like_legacy_id(query)
      ? lookup_patients_by_legacy_id(query, { size: 10 })
          .then((r) => r.items)
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
  for (const row of [...byId, ...byLegacy, ...byChart, ...byPhone, ...narrowed]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }
  return merged.slice(0, 25);
}
