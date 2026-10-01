// Patient medical alerts — the ONE place the app asks "does this patient have
// an active medical alert, and what is it?".
//
// Two backend resources hold alert-like data and neither knows about the other
// (medical-history gap MH-14 / MA-1):
//   • /patient-medical-alerts — the Medical History tab's tri-state answers.
//     A row with response "yes" IS the alert (e.g. Allergic To → Penicillin).
//     The free-text "Additional Comments" box is stored as a magic row whose
//     alert_code is ADDITIONAL_COMMENTS (MH-13).
//   • /patient-alerts — free-text account alerts (blocks_charges /
//     is_flash_alert). The backend does NOT mirror a Yes answer into this
//     table, and the scheduler feed's `has_alert` is derived from it alone, so
//     reading only this resource misses every Medical History alert.
//
// Consumers (Prescriptions add screen, Scheduler block badge + popover,
// appointment Details pop-out) all read through fetchPatientMedicalAlertSummary
// so they can never disagree. Results are cached per patient for a short TTL;
// the Medical History save path invalidates the entry it changed.

import { useCallback, useEffect, useState } from "react";
import {
  listPatientAlerts,
  listPatientMedicalAlerts,
} from "@/api/generated/endpoints/patients/patients";
import type { PatientAlertRead, PatientMedicalAlertRead } from "@/api/generated/model";
import { LEGACY_MEDICAL_ALERT_GROUPS } from "@/features/add-patient/legacyCatalogs";

/** The alert row that carries the free-text "Additional Comments" box. */
export const COMMENTS_ALERT_CODE = "ADDITIONAL_COMMENTS";

/** The `size` ceiling the backend enforces on list endpoints (CLAUDE.md). */
const PAGE_SIZE = 200;

/** How long a fetched summary is reused before it is re-read (ms). */
const CACHE_TTL_MS = 60_000;

/** Section label used for free-text /patient-alerts rows. */
export const PATIENT_ALERT_SECTION = "Account Alert";

export type MedicalAlertSource = "medical_history" | "patient_alert";

export interface ActiveMedicalAlert {
  id: number;
  source: MedicalAlertSource;
  /** alert_code for Medical History rows; "" for free-text patient alerts. */
  code: string;
  /** Human label — alert_label, else the legacy catalog label, else the code. */
  label: string;
  /** Legacy group the alert belongs to ("Allergic To", "Medical Conditions", …). */
  section: string;
  comments: string;
  is_flash_alert: boolean;
  blocks_charges: boolean;
  answered_at: string | null;
}

export interface PatientMedicalAlertSummary {
  patient_id: number;
  /** Every active alert: Medical History "yes" answers + free-text patient alerts. */
  alerts: ActiveMedicalAlert[];
  /** The Medical History "Additional Comments" text. */
  comments: string;
  /** True when at least one Medical History alert row exists (yes OR no). */
  history_on_file: boolean;
  /** True when one of the two reads failed — the summary may be incomplete. */
  partial: boolean;
  fetched_at: number;
}

// ---------------------------------------------------------------------------
// Catalog lookup — labels/sections for rows the backend stored without them.
// ---------------------------------------------------------------------------

interface CatalogEntry {
  label: string;
  section: string;
  order: number;
}

const CATALOG: Map<string, CatalogEntry> = (() => {
  const map = new Map<string, CatalogEntry>();
  let order = 0;
  for (const group of LEGACY_MEDICAL_ALERT_GROUPS) {
    for (const item of group.items) {
      map.set(item.code, { label: item.label, section: group.title, order: order++ });
    }
  }
  return map;
})();

/** Section order for display: allergies first (the prescribing-critical group). */
const SECTION_ORDER: string[] = [
  ...LEGACY_MEDICAL_ALERT_GROUPS.map((g) => g.title),
  PATIENT_ALERT_SECTION,
];

const humanize = (code: string): string =>
  code
    .replace(/_+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const s = (v: unknown): string => (v == null ? "" : String(v));

const isYes = (row: PatientMedicalAlertRead): boolean =>
  s(row.response).trim().toLowerCase() === "yes";

/** Is this section the allergy group? Drives the prescribing emphasis. */
export const isAllergySection = (section: string): boolean => /allerg/i.test(section);

const sectionRank = (section: string): number => {
  const i = SECTION_ORDER.indexOf(section);
  return i === -1 ? SECTION_ORDER.length : i;
};

const mapHistoryRow = (row: PatientMedicalAlertRead): ActiveMedicalAlert => {
  const cat = CATALOG.get(row.alert_code);
  return {
    id: row.id,
    source: "medical_history",
    code: row.alert_code,
    label: s(row.alert_label).trim() || cat?.label || humanize(row.alert_code),
    section: s(row.section).trim() || cat?.section || "Other",
    comments: s(row.comments).trim(),
    is_flash_alert: row.is_flash_alert === true,
    blocks_charges: row.blocks_charges === true,
    answered_at: row.answered_at ?? row.updated_at ?? row.created_at ?? null,
  };
};

const mapPatientAlertRow = (row: PatientAlertRead): ActiveMedicalAlert => ({
  id: row.id,
  source: "patient_alert",
  code: "",
  label: s(row.alert).trim() || "Patient alert",
  section: PATIENT_ALERT_SECTION,
  comments: "",
  is_flash_alert: row.is_flash_alert === true,
  blocks_charges: row.blocks_charges === true,
  answered_at: row.created_at ?? null,
});

/** Stable display order: section (allergies first), then catalog order, then label. */
export const sortAlerts = (alerts: ActiveMedicalAlert[]): ActiveMedicalAlert[] =>
  [...alerts].sort((a, b) => {
    const bySection = sectionRank(a.section) - sectionRank(b.section);
    if (bySection !== 0) return bySection;
    const ao = CATALOG.get(a.code)?.order ?? Number.MAX_SAFE_INTEGER;
    const bo = CATALOG.get(b.code)?.order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.label.localeCompare(b.label);
  });

/** Group sorted alerts by section, preserving the display order. */
export function groupAlertsBySection(
  alerts: ActiveMedicalAlert[],
): Array<{ section: string; alerts: ActiveMedicalAlert[] }> {
  const groups: Array<{ section: string; alerts: ActiveMedicalAlert[] }> = [];
  for (const alert of sortAlerts(alerts)) {
    const last = groups[groups.length - 1];
    if (last && last.section === alert.section) last.alerts.push(alert);
    else groups.push({ section: alert.section, alerts: [alert] });
  }
  return groups;
}

/** One line per section — "Allergic To: Aspirin, Penicillin" — for confirms/tooltips. */
export const summarizeAlerts = (alerts: ActiveMedicalAlert[]): string[] =>
  groupAlertsBySection(alerts).map(
    (g) => `${g.section}: ${g.alerts.map((a) => a.label).join(", ")}`,
  );

/**
 * One display line per ACTIVE alert — "Penicillin — allergic since 2019" —
 * for the Patient Overview row and its print. Only Medical History rows
 * answered "yes" (plus free-text account alerts) are listed; "no" / blank
 * answers and the Additional Comments row are not alerts and stay hidden.
 */
export const alertDisplayLines = (
  history_rows: PatientMedicalAlertRead[] | null | undefined,
  patient_alert_rows: PatientAlertRead[] | null | undefined,
): string[] =>
  buildSummary(0, history_rows ?? null, patient_alert_rows ?? null).alerts.map((a) =>
    [a.label, a.comments].filter(Boolean).join(" — "),
  );

// ---------------------------------------------------------------------------
// Fetch + cache
// ---------------------------------------------------------------------------

/** Fold the raw rows into a summary. */
export function buildSummary(
  patient_id: number,
  history_rows: PatientMedicalAlertRead[] | null,
  patient_alert_rows: PatientAlertRead[] | null,
): PatientMedicalAlertSummary {
  const history = (history_rows ?? []).filter((r) => r.is_active !== false);
  const commentsRow = history.find((r) => r.alert_code === COMMENTS_ALERT_CODE);
  const answered = history.filter((r) => r.alert_code !== COMMENTS_ALERT_CODE);

  const fromHistory = answered.filter(isYes).map(mapHistoryRow);
  const historyIds = new Set(fromHistory.map((h) => h.id));
  // A patient-alert mirrored from a Medical History row (source_medical_alert_id
  // — future backend behaviour) must not be listed twice.
  const fromPatientAlerts = (patient_alert_rows ?? [])
    .filter((r) => r.is_active !== false)
    .filter((r) => r.source_medical_alert_id == null || !historyIds.has(r.source_medical_alert_id))
    .map(mapPatientAlertRow);

  return {
    patient_id,
    alerts: sortAlerts([...fromHistory, ...fromPatientAlerts]),
    comments: s(commentsRow?.comments).trim(),
    history_on_file: answered.length > 0,
    partial: history_rows == null || patient_alert_rows == null,
    fetched_at: Date.now(),
  };
}

const cache = new Map<number, { at: number; promise: Promise<PatientMedicalAlertSummary> }>();

/** Drop the cached summary for one patient (or every patient). Called after a
 *  Medical History save so the next screen re-reads the new answers. */
export function invalidatePatientMedicalAlerts(patient_id?: number): void {
  if (patient_id == null) cache.clear();
  else cache.delete(patient_id);
}

/**
 * Active alerts for a patient. Two reads in parallel; each degrades to null on
 * failure (`partial` = true) so one broken endpoint never hides the other's
 * alerts. Rejects only when BOTH reads fail.
 */
export function fetchPatientMedicalAlertSummary(
  patient_id: number,
  opts: { force?: boolean } = {},
): Promise<PatientMedicalAlertSummary> {
  const hit = cache.get(patient_id);
  if (!opts.force && hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.promise;

  const promise = (async () => {
    const [history, patientAlerts] = await Promise.all([
      listPatientMedicalAlerts({ patient_id, is_active: true, size: PAGE_SIZE })
        .then((r) => r.items ?? [])
        .catch(() => null),
      listPatientAlerts({ patient_id, is_active: true, size: PAGE_SIZE })
        .then((r) => r.items ?? [])
        .catch(() => null),
    ]);
    if (history == null && patientAlerts == null) {
      throw new Error("Medical alerts could not be loaded");
    }
    return buildSummary(patient_id, history, patientAlerts);
  })();

  cache.set(patient_id, { at: Date.now(), promise });
  // A failed read must not be served from cache for the next minute.
  promise.catch(() => {
    if (cache.get(patient_id)?.promise === promise) cache.delete(patient_id);
  });
  return promise;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface PatientMedicalAlertsState {
  summary: PatientMedicalAlertSummary | null;
  alerts: ActiveMedicalAlert[];
  loading: boolean;
  error: boolean;
  refresh: () => void;
}

/** Read-through hook over fetchPatientMedicalAlertSummary for a patient screen. */
export function usePatientMedicalAlerts(
  patient_id: number | null | undefined,
  opts: { enabled?: boolean } = {},
): PatientMedicalAlertsState {
  const enabled = (opts.enabled ?? true) && patient_id != null && patient_id > 0;
  const [summary, setSummary] = useState<PatientMedicalAlertSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    if (patient_id != null) invalidatePatientMedicalAlerts(patient_id);
    setTick((t) => t + 1);
  }, [patient_id]);

  useEffect(() => {
    if (!enabled || patient_id == null) {
      setSummary(null);
      setLoading(false);
      setError(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(false);
    fetchPatientMedicalAlertSummary(patient_id)
      .then((res) => {
        if (!alive) return;
        setSummary(res);
      })
      .catch(() => {
        if (!alive) return;
        setSummary(null);
        setError(true);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [enabled, patient_id, tick]);

  return { summary, alerts: summary?.alerts ?? [], loading, error, refresh };
}
