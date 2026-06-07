import {
  getPatientBalance,
  getPatientLedger as genGetPatientLedger,
} from "@/api/generated/endpoints/billing/billing";
import type { LedgerResponse } from "@/api/generated/model";

// ===== TYPES =====
//
// The ledger feed is backend-owned. Bind directly to the generated snake_case
// contract (LedgerResponse { entries, opening_balance, closing_balance, total,
// as_of } / thin LedgerEntry) instead of a hand-written shape that drifts.
//
// NOTE: this service was previously a ~800-line raw-axios wrapper hitting ~17
// phantom `/api/v1/...` paths (procedures, claims, payments, adjustments,
// metadata) that do not exist in the backend. Those have been removed; consumers
// now call the generated Orval client directly:
//   - procedures        -> @/api/generated/endpoints/clinical  (patient-procedures)
//   - claims            -> @/api/generated/endpoints/billing    (insurance-claims)
//   - payments/adjust   -> @/api/generated/endpoints/billing    (patient-payments / -adjustments)
//   - code lists        -> @/api/generated/endpoints/metadata   (definitions, group_code)
//   - procedure codes   -> @/api/generated/endpoints/procedures (procedure-codes)
// See docs/transactions/transactions_audit.md.
export type { LedgerResponse, LedgerEntry } from "@/api/generated/model";

export interface BalancesResponse {
  account_balance: number;
  patient_balance: number;
  insurance_balance: number;
  estimated_insurance: number;
  estimated_patient: number;
  aging: {
    current: number;
    age_30: number;
    age_60: number;
    age_90: number;
    age_120: number;
  };
  recent_activity: {
    today_charges: number;
    today_payments: number;
    last_insurance_payment: { amount: number; date: string } | null;
    last_patient_payment: { amount: number; date: string } | null;
  };
}

// ===== API FUNCTIONS =====

/**
 * Get a patient's ledger feed (running-balance) for a date window.
 *
 * Wraps the generated `getPatientLedger` (GET /patients/{id}/ledger). The real
 * endpoint accepts only `date_from`, `date_to`, `page`, `size` and returns the
 * generated `LedgerResponse`; the legacy `limit/offset/transaction_type/status/
 * sort_*` params and `{ ledger_entries, pagination }` envelope are gone (the
 * backend does not support server-side sort/type/status filtering — see
 * docs/transactions backend devreport LED-1).
 */
export const getPatientLedger = (
  patientId: string | number,
  params?: {
    date_from?: string | null;
    date_to?: string | null;
    page?: number;
    size?: number;
  }
): Promise<LedgerResponse> =>
  genGetPatientLedger(Number(patientId), {
    date_from: params?.date_from ?? undefined,
    date_to: params?.date_to ?? undefined,
    page: params?.page,
    size: params?.size,
  });

/**
 * Get account balances and aging information.
 *
 * Wraps the canonical generated `getPatientBalance` (GET /patients/{id}/balance)
 * and adapts the enriched `PatientBalance` to the ledger UI's `BalancesResponse`.
 */
export const getPatientBalances = async (
  patientId: string | number
): Promise<BalancesResponse> => {
  const b = await getPatientBalance(Number(patientId));
  const ra = b.recent_activity;
  return {
    account_balance: b.account_balance ?? b.balance ?? 0,
    patient_balance: b.patient_balance ?? 0,
    insurance_balance: b.insurance_balance ?? 0,
    estimated_insurance: b.estimated_insurance ?? 0,
    estimated_patient: b.estimated_patient ?? 0,
    aging: {
      current: b.aging?.current ?? 0,
      age_30: b.aging?.b30 ?? 0,
      age_60: b.aging?.b60 ?? 0,
      age_90: b.aging?.b90 ?? 0,
      age_120: b.aging?.b120 ?? 0,
    },
    recent_activity: {
      today_charges: b.today_charges ?? 0,
      today_payments: ra?.today ?? 0,
      last_insurance_payment: ra?.last_ins
        ? { amount: ra.last_ins_amount ?? 0, date: ra.last_ins }
        : null,
      last_patient_payment: ra?.last_pat
        ? { amount: ra.last_pat_amount ?? 0, date: ra.last_pat }
        : null,
    },
  };
};
