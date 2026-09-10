// Patient Medical History — form model + catalog resolution.
//
// One screen owns the four legacy Denticon "Patient Medical History" tabs:
// Medical Alerts · Dental Questionnaire · Medical Questionnaire · Signature.
// Before this, medical alerts and the questionnaires were reachable only while
// *creating* a patient, so anything skipped at registration could never be
// filled in again.
//
// Catalogs come from the tenant's MEDALERT / DENTQUEST / MEDQUEST `definitions`
// when they are seeded, otherwise from the verbatim legacy transcription in
// `legacyCatalogs` — the same precedence the Add-Patient wizard uses, so the two
// screens can never disagree about which questions exist.

import {
  LEGACY_MEDICAL_ALERT_GROUPS,
  LEGACY_DENTAL_QUESTION_GROUPS,
  LEGACY_MEDICAL_QUESTION_GROUPS,
  MEDICAL_ALERT_COMMENTS_MAX,
  MIN_TENANT_CATALOG_ITEMS,
  type MedicalAlertGroup,
  type MedicalAlertItem,
  type QuestionGroup,
  type QuestionItem,
  type QuestionKind,
} from "@/features/add-patient/legacyCatalogs";
import {
  GROUP_TYPE,
  listGroupsByType,
  listDefinitionsByGroup,
} from "@/components/setup/medical/definitionsService";

export { MEDICAL_ALERT_COMMENTS_MAX };
export type { MedicalAlertGroup, MedicalAlertItem, QuestionGroup, QuestionItem, QuestionKind };

/** Which questionnaire an answer belongs to — matches the backend's `questionnaire_type`. */
export type QuestionnaireType = "dental" | "medical";

/**
 * Legacy renders three states per alert, with a legend for all three:
 * NO · NOT ANSWERED · YES. "" is Not Answered and is the default — it is
 * *absence*, persisted by having no row at all rather than by a stored value.
 */
export type AlertAnswer = "yes" | "no" | "";

export interface MedicalAlertsForm {
  /** alert_code → answer. A code missing from this map is Not Answered. */
  responses: Record<string, AlertAnswer>;
  /** Legacy caps this at 100 characters. */
  comments: string;
}

/** question_code → answer. Yes/No answers store "yes"/"no"; the rest store text. */
export type QuestionnaireAnswers = Record<string, string>;

/** The whole screen's editable state. */
export interface MedicalHistoryForm {
  alerts: MedicalAlertsForm;
  dental: QuestionnaireAnswers;
  medical: QuestionnaireAnswers;
}

export function emptyMedicalHistoryForm(): MedicalHistoryForm {
  return { alerts: { responses: {}, comments: "" }, dental: {}, medical: {} };
}

/** The resolved question/alert lists the screen renders. */
export interface MedicalHistoryCatalogs {
  alerts: MedicalAlertGroup[];
  dental: QuestionGroup[];
  medical: QuestionGroup[];
  /** True for a list that came from the tenant's own seeded definitions. */
  source: { alerts: boolean; dental: boolean; medical: boolean };
}

export const LEGACY_CATALOGS: MedicalHistoryCatalogs = {
  alerts: LEGACY_MEDICAL_ALERT_GROUPS,
  dental: LEGACY_DENTAL_QUESTION_GROUPS,
  medical: LEGACY_MEDICAL_QUESTION_GROUPS,
  source: { alerts: false, dental: false, medical: false },
};

/** alert_code → label, across every group (used to send `alert_label`). */
export const alertLabels = (groups: MedicalAlertGroup[]): Record<string, string> =>
  Object.fromEntries(groups.flatMap((g) => g.items).map((a) => [a.code, a.label]));

/** question_code → label (used to send `question_text`). */
export const questionLabels = (groups: QuestionGroup[]): Record<string, string> =>
  Object.fromEntries(groups.flatMap((g) => g.questions).map((q) => [q.code, q.label]));

/** Every alert code in the catalog — drives "No to all alerts" and the counters. */
export const allAlertCodes = (groups: MedicalAlertGroup[]): string[] =>
  groups.flatMap((g) => g.items).map((a) => a.code);

/**
 * The Questionnaire Setup screens store the input type on the definition's
 * `key2`; anything else renders as a Yes/No row.
 */
const kindFromDefinition = (value: unknown): QuestionKind =>
  value === "text" || value === "date" || value === "textarea" ? value : "yesno";

/**
 * Load one definition-group-backed catalog. Returns null when the tenant's
 * catalog is unseeded (or too sparse to be real — see MIN_TENANT_CATALOG_ITEMS),
 * so the caller keeps the legacy list.
 */
async function loadDefinitionGroups(
  groupType: string,
): Promise<Array<{ title: string; rows: Array<{ code: string; label: string; kind: QuestionKind }> }> | null> {
  const groups = await listGroupsByType(groupType);
  const loaded: Array<{
    title: string;
    rows: Array<{ code: string; label: string; kind: QuestionKind }>;
  }> = [];
  for (const group of groups) {
    const definitions = await listDefinitionsByGroup(group.group_code);
    if (definitions.length === 0) continue;
    loaded.push({
      title: group.description,
      rows: definitions.map((d) => ({
        code: d.key1 || String(d.id),
        label: d.description,
        kind: kindFromDefinition((d as { key2?: unknown }).key2),
      })),
    });
  }
  const total = loaded.reduce((n, g) => n + g.rows.length, 0);
  return total >= MIN_TENANT_CATALOG_ITEMS ? loaded : null;
}

/**
 * Resolve all three catalogs. Every lookup degrades to the legacy list on its
 * own, so an unseeded or unreachable definitions table still renders a complete,
 * usable screen rather than an empty one.
 */
export async function loadMedicalHistoryCatalogs(): Promise<MedicalHistoryCatalogs> {
  const settle = async <T,>(run: () => Promise<T | null>): Promise<T | null> => {
    try {
      return await run();
    } catch {
      return null;
    }
  };

  const [alertGroups, dentalGroups, medicalGroups] = await Promise.all([
    settle(() => loadDefinitionGroups(GROUP_TYPE.MEDICAL_ALERT)),
    settle(() => loadDefinitionGroups(GROUP_TYPE.DENTAL_QUESTIONNAIRE)),
    settle(() => loadDefinitionGroups(GROUP_TYPE.MEDICAL_QUESTIONNAIRE)),
  ]);

  return {
    alerts: alertGroups
      ? alertGroups.map((g) => ({
          title: g.title,
          items: g.rows.map((r) => ({ code: r.code, label: r.label })),
        }))
      : LEGACY_MEDICAL_ALERT_GROUPS,
    dental: dentalGroups
      ? dentalGroups.map((g) => ({
          title: g.title,
          questions: g.rows.map((r) => ({ code: r.code, label: r.label, kind: r.kind })),
        }))
      : LEGACY_DENTAL_QUESTION_GROUPS,
    medical: medicalGroups
      ? medicalGroups.map((g) => ({
          title: g.title,
          questions: g.rows.map((r) => ({ code: r.code, label: r.label, kind: r.kind })),
        }))
      : LEGACY_MEDICAL_QUESTION_GROUPS,
    source: {
      alerts: alertGroups != null,
      dental: dentalGroups != null,
      medical: medicalGroups != null,
    },
  };
}
