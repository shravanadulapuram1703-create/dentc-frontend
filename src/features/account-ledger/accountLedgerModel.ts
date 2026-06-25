// Account Ledger (legacy "Account Ledger - Show All" screen) — domain model.
//
// The legacy Account Ledger shows the full financial history for a patient as a
// single chronological feed mixing three record kinds, with a per-row running
// balance and a Grand-Total footer:
//
//   Legacy concept            Backend source (snake_case — bound directly)
//   -----------------------   ------------------------------------------------
//   Procedure (charge) row    PatientProcedureRead   (Code = procedure_code)
//   Payment (credit) row      PatientPaymentRead     (Code = "PMT")
//   Adjustment row            PatientAdjustmentRead  (Code = "PATADJ")
//
// This module owns the pure mapping legacy-grid <-> backend records. It reuses
// the money/date helpers from the Transactions Entry model so the two financial
// screens read consistently.

import type {
  PatientProcedureRead,
  PatientPaymentRead,
  PatientAdjustmentRead,
} from '@/api/generated/model';
import { num, fmtDate } from '@/features/transactions/transactionsModel';

export { money, num, fmtDate } from '@/features/transactions/transactionsModel';

// ---- View-model -----------------------------------------------------------

export type LedgerKind = 'procedure' | 'payment' | 'adjustment';

/** One row in the Account Ledger grid (one backend record). */
export interface LedgerRow {
  key: string; // stable React key (kind + id)
  kind: LedgerKind;
  iso: string; // YYYY-MM-DD — used for sort/filter (never displayed)
  date: string; // MM/DD/YYYY display
  patient: string;
  office: string; // office short_id / office_code (e.g. "MCMURR")
  apply_to: string; // legacy "A" column
  code: string; // procedure_code | "PMT" | "PATADJ"
  tooth: string; // legacy "TH"
  surface: string; // legacy "Surf"
  t: 'C' | 'P'; // legacy "T": C = credit (payment), P = procedure/posting
  n: string; // legacy "N": "N" when unbilled (no claim), else "-"
  description: string; // "$162 Resin composite-4...", "$-74 Payment - Insurance"
  bill: string; // legacy "Bill" (billing_status)
  provider: string;
  est_pat: number;
  est_ins: number;
  amount: number; // charge positive, credit negative (drives running balance)
  balance: number; // running balance after this row (filled by withRunningBalance)
  user: string; // legacy "User" (created_by resolved to a username)
}

// Resolver function types the builders depend on (supplied by the service/page).
export type LabelFn = (code: string | null | undefined) => string;
export type OfficeFn = (officeId: number | null | undefined) => string;
export type UserFn = (userId: number | null | undefined) => string;

// ---- Formatting -----------------------------------------------------------

/** Compact currency for the Description column: whole numbers drop the ".00"
 *  to mirror the legacy strings ("$162", "$-74", "$3", "$33.50"). */
function amtShort(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}

// ---- Row builders ---------------------------------------------------------

export function procedureRow(
  p: PatientProcedureRead,
  patientName: string,
  office: OfficeFn,
  provider: LabelFn,
  user: UserFn,
  codeDesc: (code: string) => string,
): LedgerRow {
  const fee = num(p.fee);
  const text = codeDesc(p.procedure_code) || p.procedure_code;
  return {
    key: `procedure-${p.id}`,
    kind: 'procedure',
    iso: (p.date_of_service ?? '').slice(0, 10),
    date: fmtDate(p.date_of_service),
    patient: patientName,
    office: office(p.office_id),
    apply_to: p.apply_to ?? '-',
    code: p.procedure_code,
    tooth: p.tooth ?? '-',
    surface: p.surface ?? '-',
    t: 'P',
    n: p.claim_id ? '-' : 'N',
    description: `$${amtShort(fee)} ${text}`,
    bill: p.billing_status ?? '-',
    provider: provider(p.provider_id),
    est_pat: num(p.patient_estimate),
    est_ins: num(p.insurance_estimate),
    amount: fee,
    balance: 0,
    user: user(p.created_by),
  };
}

export function paymentRow(
  p: PatientPaymentRead,
  patientName: string,
  office: OfficeFn,
  provider: LabelFn,
  user: UserFn,
  methodLabel: LabelFn,
): LedgerRow {
  const amt = num(p.amount);
  const method = methodLabel(p.payment_method);
  const typeLabel = p.payment_type
    ? p.payment_type.charAt(0).toUpperCase() + p.payment_type.slice(1)
    : '';
  // "$-74 Payment - Insurance" / "$-136.40 Credit Card Payment"
  const tail = method ? `${method} Payment` : `Payment${typeLabel ? ` - ${typeLabel}` : ''}`;
  return {
    key: `payment-${p.id}`,
    kind: 'payment',
    iso: (p.payment_date ?? '').slice(0, 10),
    date: fmtDate(p.payment_date),
    patient: patientName,
    office: office(p.office_id),
    apply_to: '-',
    code: 'PMT',
    tooth: '-',
    surface: '-',
    t: 'C',
    n: 'N',
    description: `$${amtShort(-amt)} ${tail}`,
    bill: '-',
    provider: provider(p.provider_id),
    est_pat: 0,
    est_ins: 0,
    amount: -amt,
    balance: 0,
    user: user(p.created_by),
  };
}

export function adjustmentRow(
  a: PatientAdjustmentRead,
  patientName: string,
  office: OfficeFn,
  user: UserFn,
  typeLabel: LabelFn,
): LedgerRow {
  // Adjustments are stored signed (credit/write-off negative, fee-add positive).
  const amt = num(a.amount);
  const reason = typeLabel(a.adjustment_type) || 'Adjustment';
  return {
    key: `adjustment-${a.id}`,
    kind: 'adjustment',
    iso: (a.adjustment_date ?? '').slice(0, 10),
    date: fmtDate(a.adjustment_date),
    patient: patientName,
    office: office(a.office_id),
    apply_to: '-',
    code: 'PATADJ',
    tooth: '-',
    surface: '-',
    t: 'P',
    n: 'N',
    description: `$${amtShort(amt)} Adjustment: ${reason}`,
    bill: '-',
    provider: '-',
    est_pat: 0,
    est_ins: 0,
    amount: amt,
    balance: 0,
    user: user(a.created_by),
  };
}

// ---- Running balance ------------------------------------------------------

/**
 * Compute the per-row running balance over the WHOLE chronological feed.
 * Rows are summed oldest-first (charges add, credits subtract) so each row's
 * balance reflects the account balance at that point in time — independent of
 * the display sort/filter/pagination applied later.
 */
export function withRunningBalance(rows: LedgerRow[]): LedgerRow[] {
  const chronological = [...rows].sort((a, b) => a.iso.localeCompare(b.iso));
  let bal = 0;
  const balByKey = new Map<string, number>();
  for (const r of chronological) {
    bal = Math.round((bal + r.amount) * 100) / 100;
    balByKey.set(r.key, bal);
  }
  return rows.map((r) => ({ ...r, balance: balByKey.get(r.key) ?? 0 }));
}

// ---- Filtering / sorting (legacy "Show All" + "Sort By") ------------------

export type LedgerFilter = 'all' | 'procedure' | 'payment' | 'adjustment';

export const FILTER_OPTIONS: { value: LedgerFilter; label: string }[] = [
  { value: 'all', label: 'Show All' },
  { value: 'procedure', label: 'Procedures' },
  { value: 'payment', label: 'Payments' },
  { value: 'adjustment', label: 'Adjustments' },
];

export type LedgerSort =
  | 'date_desc'
  | 'date_asc'
  | 'code_asc'
  | 'provider_asc'
  | 'amount_desc'
  | 'amount_asc';

export const SORT_OPTIONS: { value: LedgerSort; label: string }[] = [
  { value: 'date_desc', label: 'Date (newest first)' },
  { value: 'date_asc', label: 'Date (oldest first)' },
  { value: 'code_asc', label: 'Code (A–Z)' },
  { value: 'provider_asc', label: 'Provider (A–Z)' },
  { value: 'amount_desc', label: 'Amount (high–low)' },
  { value: 'amount_asc', label: 'Amount (low–high)' },
];

export function applyFilter(rows: LedgerRow[], filter: LedgerFilter): LedgerRow[] {
  if (filter === 'all') return rows;
  return rows.filter((r) => r.kind === filter);
}

/** Inclusive date-range filter on the (never-displayed) iso field. */
export function applyDateRange(
  rows: LedgerRow[],
  fromIso: string | null,
  toIso: string | null,
): LedgerRow[] {
  return rows.filter((r) => {
    if (!r.iso) return false;
    if (fromIso && r.iso < fromIso) return false;
    if (toIso && r.iso > toIso) return false;
    return true;
  });
}

export function applySort(rows: LedgerRow[], sort: LedgerSort): LedgerRow[] {
  const out = [...rows];
  switch (sort) {
    case 'date_asc':
      return out.sort((a, b) => a.iso.localeCompare(b.iso));
    case 'date_desc':
      return out.sort((a, b) => b.iso.localeCompare(a.iso));
    case 'code_asc':
      return out.sort((a, b) => a.code.localeCompare(b.code));
    case 'provider_asc':
      return out.sort((a, b) => a.provider.localeCompare(b.provider));
    case 'amount_asc':
      return out.sort((a, b) => a.amount - b.amount);
    case 'amount_desc':
      return out.sort((a, b) => b.amount - a.amount);
    default:
      return out;
  }
}

/** MM/DD/YYYY free-text -> YYYY-MM-DD (or null when blank/unparseable). */
export function parseDateInput(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const parts = s.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    if (m && d && y) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
}
