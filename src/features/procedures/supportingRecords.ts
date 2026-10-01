// Supporting-records readiness (PROC-7c) — the ONE frontend home for the three
// backend readiness reads and the claim-submit gate:
//
//   GET /patients/{id}/procedure-readiness?procedure_code&tooth&date_of_service
//   GET /patient-procedures/{procedure_id}/readiness
//   GET /insurance-claims/{claim_id}/readiness           → missing[] + enclosures
//   POST /insurance-claims/{claim_id}/submit             → 422 supporting_records_missing
//                                                          unless allow_missing_records
//
// The server judges what "on file" means (perio exam ≤ DOS, XR/PH document or
// DICOM study, linked document / claim attachment, charted missing tooth or
// extraction charge). The UI only renders `missing` (warn), `deferred` (info —
// an attachment before the charge exists) and `satisfied`, using the rule
// labels the server returns so both agree.

import {
  getClaimReadiness,
  getPatientProcedureReadiness,
  getProcedureReadiness,
} from '@/api/generated/endpoints/procedures/procedures';
import { submitClaim } from '@/api/generated/endpoints/billing/billing';
import type {
  ClaimMissingRecord,
  ClaimReadiness,
  ClaimSubmitRequest,
  ClaimSubmitResult,
  ProcedureReadiness,
} from '@/api/generated/model';
import { supportingRecordLabel } from './procedureCodeExtras';

export type { ClaimMissingRecord, ClaimReadiness, ProcedureReadiness };

export interface ProcedureReadinessQuery {
  patient_id: number;
  procedure_code: string;
  tooth?: string | null;
  /** YYYY-MM-DD */
  date_of_service?: string | null;
}

/** Readiness of a code that is about to be planned / charged (nothing posted yet). */
export function fetchProcedureReadiness(q: ProcedureReadinessQuery): Promise<ProcedureReadiness> {
  return getProcedureReadiness(q.patient_id, {
    procedure_code: q.procedure_code,
    tooth: q.tooth?.trim() ? q.tooth.trim().toUpperCase() : null,
    date_of_service: q.date_of_service || null,
  });
}

/** Readiness of a posted charge (tooth / DOS / claim come from the row). */
export function fetchPostedProcedureReadiness(procedure_id: string): Promise<ProcedureReadiness> {
  return getPatientProcedureReadiness(procedure_id);
}

/** Every non-void line of a claim + the derived ADA Enclosures counts. */
export function fetchClaimReadiness(claim_id: string): Promise<ClaimReadiness> {
  return getClaimReadiness(claim_id);
}

/** Label for a readiness key, preferring the rule table the server sent back. */
export function readinessLabel(key: string, r?: Pick<ProcedureReadiness, 'rules'> | null): string {
  return r?.rules?.[key]?.label ?? supportingRecordLabel(key);
}

/** "X-Ray Required, Perio Chart Required" for a list of keys. */
export function readinessLabels(keys: string[] | undefined, r?: Pick<ProcedureReadiness, 'rules'> | null): string {
  return (keys ?? []).map((k) => readinessLabel(k, r)).join(', ');
}

// ---- Claim submit gate -----------------------------------------------------

export const SUPPORTING_RECORDS_MISSING = 'supporting_records_missing';

/**
 * The 422 the submit returns while a line lacks a record. Live shape (2026-09-11):
 *   { error: { code: "validation_error", message,
 *              details: { code: "supporting_records_missing", claim_id, missing: [...], hint } } }
 * so the gate is recognised by `details.code` (or `error.code` should the wrapper
 * ever surface it directly). FastAPI's own `{ detail }` shape is read as well, so
 * the modal never falls back to a generic message for this case.
 */
export function supportingRecordsError(err: unknown): { message: string; missing: ClaimMissingRecord[] } | null {
  const e = err as {
    response?: {
      status?: number;
      data?: {
        error?: {
          code?: string;
          message?: string;
          details?: { code?: string; missing?: ClaimMissingRecord[] } | ClaimMissingRecord[];
        };
        detail?: { code?: string; message?: string; missing?: ClaimMissingRecord[] } | string;
      };
    };
  };
  if (e?.response?.status !== 422) return null;
  const data = e.response.data;
  const wrapped = data?.error;
  if (wrapped) {
    const d = wrapped.details;
    const detailCode = !Array.isArray(d) ? d?.code : undefined;
    if (wrapped.code === SUPPORTING_RECORDS_MISSING || detailCode === SUPPORTING_RECORDS_MISSING) {
      const missing = Array.isArray(d) ? d : (d?.missing ?? []);
      return { message: wrapped.message || 'Supporting records are missing for this claim.', missing };
    }
  }
  const detail = data?.detail;
  if (detail && typeof detail === 'object' && detail.code === SUPPORTING_RECORDS_MISSING) {
    return { message: detail.message || 'Supporting records are missing for this claim.', missing: detail.missing ?? [] };
  }
  return null;
}

/** One line per missing record: "D2740 · tooth 30 · X-Ray Required". */
export function describeMissingRecord(m: ClaimMissingRecord): string {
  const parts = [m.procedure_code];
  if (m.tooth) parts.push(`tooth ${m.tooth}`);
  if (m.date_of_service) parts.push(m.date_of_service);
  return `${parts.join(' · ')} — ${supportingRecordLabel(m.record)}`;
}

/**
 * Submit the claim. Throws the raw error on any failure; callers use
 * `supportingRecordsError` to recognise the readiness 422 and offer
 * "Send anyway" (`allow_missing_records: true`).
 */
export function submitClaimWithRecords(
  claim_id: string,
  opts: { allow_missing_records?: boolean; send_method?: string } = {},
): Promise<ClaimSubmitResult> {
  const body: ClaimSubmitRequest = {
    send_method: opts.send_method ?? 'electronic',
    allow_missing_records: !!opts.allow_missing_records,
  };
  return submitClaim(claim_id, body);
}
