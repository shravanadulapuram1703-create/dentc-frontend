// Per-procedure "supporting records" requirements — attachments, perio chart,
// photo, X-ray and missing-tooth information — configured on Setup → Procedure
// Codes → Charting alongside requires_tooth / surface / quadrant.
//
// Backend-owned since PROC-7a (Alembic aee911131850): five NOT NULL booleans on
// `procedure_codes`, present on ProcedureCodeRead (list + detail) and accepted
// by Create/Update. This module is the ONE place that knows the key list and
// the user-facing copy, so Setup, the requirements resolver and the readiness
// UI stay in step. Enforcement lives server-side (claim submit, PROC-7c) — see
// supportingRecords.ts for the readiness endpoints.

import type { ProcedureCodeRead } from '@/api/generated/model';

export interface ProcedureCodeExtras {
  /** Posting / claiming needs at least one attached document. */
  requires_attachment: boolean;
  /** A periodontal charting exam must be on file (e.g. D4341/D4342 SRP). */
  requires_perio_chart: boolean;
  /** An intraoral / extraoral photo must be attached. */
  requires_photo: boolean;
  /** A radiograph must be on file (crowns, endo, extractions…). */
  requires_xray: boolean;
  /** Missing-tooth clause data (date of loss, prior prosthesis) must be captured. */
  requires_missing_tooth_info: boolean;
}

export const PROCEDURE_CODE_EXTRA_KEYS = [
  'requires_attachment',
  'requires_perio_chart',
  'requires_photo',
  'requires_xray',
  'requires_missing_tooth_info',
] as const satisfies readonly (keyof ProcedureCodeExtras)[];

export type ProcedureCodeExtraKey = (typeof PROCEDURE_CODE_EXTRA_KEYS)[number];

/** Readiness `key` the backend uses for each flag (ProcedureReadiness.requires/missing/…). */
export const SUPPORTING_RECORD_KEY: Record<ProcedureCodeExtraKey, string> = {
  requires_attachment: 'attachment',
  requires_perio_chart: 'perio_chart',
  requires_photo: 'photo',
  requires_xray: 'xray',
  requires_missing_tooth_info: 'missing_tooth_info',
};

/** User-facing copy shared by the Setup toggles and any downstream prompt. */
export const PROCEDURE_CODE_EXTRA_LABELS: Record<ProcedureCodeExtraKey, { label: string; hint: string }> = {
  requires_attachment: {
    label: 'Attachments Required',
    hint: 'Posting or claiming this procedure requires at least one attached document (narrative, lab slip, consent…). Checked when the claim is submitted.',
  },
  requires_perio_chart: {
    label: 'Perio Chart Required',
    hint: 'A periodontal charting exam must be on file before this procedure is charted or posted (e.g. scaling & root planing D4341/D4342).',
  },
  requires_photo: {
    label: 'Photo Required',
    hint: 'An intraoral / extraoral photo must be attached to the patient record for this procedure.',
  },
  requires_xray: {
    label: 'X-Ray Required',
    hint: 'A radiograph must be on file (crowns, endodontics, extractions…) — also drives the claim attachment.',
  },
  requires_missing_tooth_info: {
    label: 'Missing Tooth Info Required',
    hint: 'Missing-tooth clause data (date of loss / extraction, prior prosthesis) must be captured — bridges, implants, dentures.',
  },
};

/** Label for a readiness key ("xray" → "X-Ray Required"). Unknown keys echo back. */
export function supportingRecordLabel(key: string): string {
  for (const k of PROCEDURE_CODE_EXTRA_KEYS) {
    if (SUPPORTING_RECORD_KEY[k] === key) return PROCEDURE_CODE_EXTRA_LABELS[k].label;
  }
  return key;
}

export function emptyProcedureCodeExtras(): ProcedureCodeExtras {
  return {
    requires_attachment: false,
    requires_perio_chart: false,
    requires_photo: false,
    requires_xray: false,
    requires_missing_tooth_info: false,
  };
}

/** Narrow any object (form state, server row) down to just the five flags. */
export function pickProcedureCodeExtras(src: Partial<Record<ProcedureCodeExtraKey, unknown>>): ProcedureCodeExtras {
  const out = emptyProcedureCodeExtras();
  for (const k of PROCEDURE_CODE_EXTRA_KEYS) out[k] = !!src[k];
  return out;
}

/** The five flags of a procedure-code row (server is the source of truth). */
export function resolveProcedureCodeExtras(row: ProcedureCodeRead): ProcedureCodeExtras {
  return pickProcedureCodeExtras(row);
}
