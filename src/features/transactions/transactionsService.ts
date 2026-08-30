// Non-hook concerns for the Transactions Entry tab. Wraps the shared procedure-code
// cache (category list + code search for the Add Procedures tab) and builds the
// combined transaction feed for the top grid from the generated client.

import { loadProcedureCodes, codeDescription } from '@/components/setup/insurance/procedureCodeService';
import { listPatientProcedures } from '@/api/generated/endpoints/clinical/clinical';
import {
  listPatientPayments,
  listPatientAdjustments,
  expandExplosionCode,
} from '@/api/generated/endpoints/billing/billing';
import { listExplosionCodes } from '@/api/generated/endpoints/procedures/procedures';
import { listOffices } from '@/api/generated/endpoints/organization/organization';
import { listPatientInsurance } from '@/api/generated/endpoints/patients/patients';
import {
  getInsurancePlan,
  getInsuranceCarrier,
} from '@/api/generated/endpoints/insurance/insurance';
import type {
  ProcedureCodeRead,
  PatientProcedureRead,
  PatientPaymentRead,
  PatientAdjustmentRead,
  ExplosionCodeRead,
  ExpandedProcedure,
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
  officeLabel: (id: number | null | undefined) => string,
): EntryRow[] {
  return [
    ...raw.procs.map((p) => procedureRow(p, patientName, providerLabel, codeDescription, officeLabel)),
    ...raw.pays.map((p) => paymentRow(p, patientName, paymentLabel, providerLabel, officeLabel)),
    ...raw.adjs.map((a) => adjustmentRow(a, patientName, adjustmentLabel, providerLabel, officeLabel)),
  ];
}

/** Outstanding (claim/payment-eligible) procedures for the Payments / Adjustments grids. */
export async function loadOutstandingProcedures(patientId: number): Promise<PatientProcedureRead[]> {
  const res = await listPatientProcedures({ patient_id: patientId, is_void: false, size: 200 });
  return res.items ?? [];
}

// ---------------------------------------------------------------------------
// Office directory — the grid's OFFICE column
// ---------------------------------------------------------------------------

export interface OfficeLabel {
  id: number;
  /** `short_id` when the office has one, else `office_code`. */
  code: string;
  name: string;
}

/**
 * `id -> office` for every office in the tenant, so the grid can render
 * "MOON" / "Excel Dental- Moon" instead of the raw `office_id` integer that
 * `patient_procedures.office_id` carries.
 */
export async function loadOfficeDirectory(): Promise<Map<number, OfficeLabel>> {
  const res = await listOffices({ size: 200 });
  const map = new Map<number, OfficeLabel>();
  for (const o of res.items ?? []) {
    map.set(o.id, {
      id: o.id,
      code: (o.short_id || o.office_code || String(o.id)).trim(),
      name: o.name,
    });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Insurance summary — the check-out block's "Prim. Ins" / "Sec. Ins" (CHG-8)
// ---------------------------------------------------------------------------

export interface InsuranceSummaryEntry {
  carrier_name: string;
  plan_type: string | null;
  group_number: string | null;
  /** Remaining annual maximum / deductible from `patient_insurance`. */
  max_remaining: string | null;
  deductible_remaining: string | null;
}

export interface InsuranceSummary {
  primary: InsuranceSummaryEntry | null;
  secondary: InsuranceSummaryEntry | null;
}

const EMPTY_INSURANCE_SUMMARY: InsuranceSummary = { primary: null, secondary: null };

/**
 * The patient's dental carriers by rank.
 *
 * There is no `…/patients/{id}/insurance-summary` aggregate (CHG-8), so this is
 * the same three-hop join the Patient Insurance screen does —
 * `patient_insurance -> insurance_plans -> insurance_carriers` — but issued once
 * for both ranks and tolerant of every hop being absent.
 */
export async function loadInsuranceSummary(patientId: number): Promise<InsuranceSummary> {
  const res = await listPatientInsurance({ patient_id: patientId, size: 50 }).catch(() => null);
  const records = (res?.items ?? []).filter(
    (r) => r.is_active && (r.legacy_plan_type ?? '').trim().toUpperCase().startsWith('D'),
  );
  if (records.length === 0) return EMPTY_INSURANCE_SUMMARY;

  const rank = (order: string) =>
    records.find((r) => (r.insurance_type ?? '').trim().toLowerCase() === order) ?? null;

  const entry = async (
    record: (typeof records)[number] | null,
  ): Promise<InsuranceSummaryEntry | null> => {
    if (!record || record.ins_plan_id == null) return null;
    const plan = await getInsurancePlan(record.ins_plan_id).catch(() => null);
    const carrier =
      plan?.carrier_id != null ? await getInsuranceCarrier(plan.carrier_id).catch(() => null) : null;
    const carrier_name = (carrier?.name || carrier?.carrier_name || '').trim();
    if (!carrier_name && !plan) return null;
    return {
      carrier_name: carrier_name || `Plan #${record.ins_plan_id}`,
      plan_type: plan?.plan_type ?? null,
      group_number: plan?.group_number || null,
      max_remaining: record.max_remaining ?? null,
      deductible_remaining: record.deductible_remaining ?? null,
    };
  };

  const [primary, secondary] = await Promise.all([entry(rank('primary')), entry(rank('secondary'))]);
  return { primary, secondary };
}

// ---------------------------------------------------------------------------
// Explosion codes — Add Procedures "Explosion Codes" dropdown (CHG-4)
// ---------------------------------------------------------------------------

/**
 * User-defined multi-procedure codes for an office. The resource exists now
 * (`GET /explosion-codes`, `GET /explosion-codes/{code}/expand`) but is
 * unseeded on tenant 1, so an empty list is the normal case — the picker
 * disables itself rather than being hard-coded off.
 */
export async function loadExplosionCodes(officeId: number | null): Promise<ExplosionCodeRead[]> {
  const res = await listExplosionCodes({
    ...(officeId != null ? { office_id: officeId } : {}),
    is_active: true,
    size: 200,
  }).catch(() => null);
  return (res?.items ?? []).slice().sort((a, b) => a.code.localeCompare(b.code));
}

/** The procedures a single explosion code expands to, in display order. */
export async function expandExplosion(
  code: string,
  officeId: number | null,
): Promise<ExpandedProcedure[]> {
  const res = await expandExplosionCode(code, officeId != null ? { office_id: officeId } : undefined);
  return (res.procedures ?? [])
    .slice()
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
}
