// Non-hook concerns for the Transactions Entry tab. Wraps the shared procedure-code
// cache (category list + code search for the Add Procedures tab) and builds the
// combined transaction feed for the top grid from the generated client.

import { loadProcedureCodes, codeDescription } from '@/components/setup/insurance/procedureCodeService';
import { listPatientProcedures } from '@/api/generated/endpoints/clinical/clinical';
import {
  listPatientPayments,
  listPatientAdjustments,
} from '@/api/generated/endpoints/billing/billing';
import type {
  ProcedureCodeRead,
  PatientProcedureRead,
  PatientPaymentRead,
  PatientAdjustmentRead,
} from '@/api/generated/model';
import {
  codeInCategory,
  procedureRow,
  paymentRow,
  adjustmentRow,
  type ProcCategory,
  type EntryRow,
} from './transactionsModel';

export { loadProcedureCodes, codeDescription };

/** All active codes belonging to a legacy category button, sorted by code. */
export async function codesInCategory(cat: ProcCategory): Promise<ProcedureCodeRead[]> {
  const map = await loadProcedureCodes();
  return [...map.values()]
    .filter((c) => c.is_active !== false && codeInCategory(c.code, cat))
    .sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Filter a category's codes by the Add-Procedure-By inputs (code / user code /
 * description substrings). Empty inputs pass everything in the category.
 */
export function filterCodes(
  codes: ProcedureCodeRead[],
  byCode: string,
  byUserCode: string,
  byDescription: string,
): ProcedureCodeRead[] {
  const c = byCode.trim().toLowerCase();
  const u = byUserCode.trim().toLowerCase();
  const d = byDescription.trim().toLowerCase();
  return codes.filter(
    (x) =>
      (!c || x.code.toLowerCase().includes(c)) &&
      (!u || (x.legacy_code ?? '').toLowerCase().includes(u)) &&
      (!d || x.description.toLowerCase().includes(d)),
  );
}

export interface RawTransactions {
  procs: PatientProcedureRead[];
  pays: PatientPaymentRead[];
  adjs: PatientAdjustmentRead[];
}

/**
 * Fetch the raw transactions (procedures + payments + adjustments) for a single
 * Transaction Date. Returns plain backend records — mapping to grid view-model
 * rows happens in the component (cheaply, via useMemo) so that the network fetch
 * key stays stable and never re-runs on label-resolver identity changes.
 */
export async function loadRawTransactions(patientId: number, isoDate: string): Promise<RawTransactions> {
  // Warm the procedure-code cache so codeDescription() resolves synchronously.
  await loadProcedureCodes();

  const [procRes, payRes, adjRes] = await Promise.all([
    listPatientProcedures({ patient_id: patientId, is_void: false, size: 200 }).catch(() => ({ items: [] as PatientProcedureRead[] })),
    listPatientPayments({ patient_id: patientId, is_void: false, size: 200 }).catch(() => ({ items: [] as PatientPaymentRead[] })),
    listPatientAdjustments({ patient_id: patientId, size: 200 }).catch(() => ({ items: [] as PatientAdjustmentRead[] })),
  ]);

  const onDate = (s: string | null | undefined) => (s ?? '').slice(0, 10) === isoDate;

  return {
    procs: (procRes.items ?? []).filter((p) => onDate(p.date_of_service)),
    pays: (payRes.items ?? []).filter((p) => onDate(p.payment_date)),
    adjs: (adjRes.items ?? []).filter((a) => !a.is_void && onDate(a.adjustment_date)),
  };
}

/** Map raw transactions to grid rows. Pure — no network; safe to call each render. */
export function buildEntryRows(
  raw: RawTransactions,
  patientName: string,
  providerLabel: (id: string | null | undefined) => string,
  paymentLabel: (code: string | null | undefined) => string,
  adjustmentLabel: (code: string | null | undefined) => string,
): EntryRow[] {
  return [
    ...raw.procs.map((p) => procedureRow(p, patientName, providerLabel, codeDescription)),
    ...raw.pays.map((p) => paymentRow(p, patientName, paymentLabel)),
    ...raw.adjs.map((a) => adjustmentRow(a, patientName, adjustmentLabel)),
  ];
}

/** Outstanding (claim/payment-eligible) procedures for the Payments / Adjustments grids. */
export async function loadOutstandingProcedures(patientId: number): Promise<PatientProcedureRead[]> {
  const res = await listPatientProcedures({ patient_id: patientId, is_void: false, size: 200 });
  return res.items ?? [];
}
