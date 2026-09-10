// Ledger (legacy "Patient Ledger" / "Account Ledger — Show All" screens) — domain model.
//
// Both legacy screens render the SAME grid; only the scope of the feed differs:
//
//   Patient Ledger  -> transactions belonging to the selected patient only
//   Account Ledger  -> transactions of every patient on the account
//                      (the responsible-party/family group)
//
// A single chronological feed mixes four record kinds, with a per-row running
// balance and a Grand-Total footer:
//
//   Legacy concept            Backend source (snake_case — bound directly)
//   -----------------------   ------------------------------------------------
//   Procedure (charge) row    AccountLedgerRow source_type='charge'      (Code = procedure_code)
//   Payment (credit) row      AccountLedgerRow source_type='payment'     (Code = "PMT")
//   Adjustment row            AccountLedgerRow source_type='adjustment'  (Code = "PATADJ")
//   Claim row                 InsuranceClaimRead                         (Code = "CLM-P/S/T")
//
// The first three come denormalised from `GET /patients/{id}/account-ledger`
// (AL-1/2/4/5/7). Claim rows have no representation in that feed and are
// merged in client-side from `GET /insurance-claims` (gap AL-8).

import type { AccountLedgerRow, InsuranceClaimRead } from '@/api/generated/model';
import { num, fmtDate } from '@/features/transactions/transactionsModel';

export { money, num, fmtDate } from '@/features/transactions/transactionsModel';
import { money as fmtMoney } from '@/features/transactions/transactionsModel';

/** Legacy currency rendering for every ledger surface. */
export const dollars = (n: number): string => `$${fmtMoney(n)}`;

// ---- View-model -----------------------------------------------------------

export type LedgerKind = 'charge' | 'payment' | 'adjustment' | 'claim';

/** One row in the ledger grid (one backend record). */
export interface LedgerRow {
  key: string; // stable React key (kind + source id)
  kind: LedgerKind;
  source_id: string; // procedure id / payment id / adjustment id / claim id
  patient_id: number; // owning patient (differs per row in Account scope)
  iso: string; // YYYY-MM-DD — used for sort/filter (never displayed)
  date: string; // MM/DD/YYYY display
  patient: string; // "Last, First" of the owning patient
  office: string; // office short_id / office_code (e.g. "MOON")
  office_id: number | null;
  apply_to: string; // legacy "A" column
  code: string; // procedure_code | "PMT" | "PATADJ" | "CLM-P"
  tooth: string; // legacy "TH"
  surface: string; // legacy "Surf"
  t: string; // legacy "T": C = credit, P = debit/posting
  n: string; // legacy "N": "N" when unbilled (no claim), else "-"
  description: string; // "$162 Resin composite-4...", "$-74 Payment - Insurance"
  detail: string; // the backend's untouched description (no amount prefix)
  bill: string; // legacy "Bill" — "H" when the charge is on Hold Claim
  hold_claim: boolean; // procedure held back from claim creation
  provider: string;
  est_pat: number;
  est_ins: number;
  amount: number; // charge positive, credit negative (drives running balance)
  balance: number; // running balance after this row (filled by withRunningBalance)
  user: string; // legacy "User" (created_by resolved to a username)
  /** True when this row may be selected for a new insurance claim: an
   *  unbilled procedure charge that is not on Hold Claim (legacy "Prn"). */
  claimable: boolean;
}

export type UserFn = (userId: number | null | undefined) => string;

// ---- Grid presentation constants -------------------------------------------
// Kept here (not in LedgerGrid.tsx) so that file exports only its component and
// stays Fast-Refresh friendly.

/** Legacy grid columns, in order. "Prn" carries the row-selection checkbox. */
export const GRID_COLS = [
  'Prn', 'Date', 'Patient', 'Office', 'A', 'Code', 'TH', 'Surf', 'T', 'N', 'At',
  '', 'Description', 'Bill', 'Durati…', 'Provider', 'Est Pat', 'Est Ins',
  'Amount', 'Balance', 'User',
] as const;

export const RIGHT_COLS: readonly string[] = ['Est Pat', 'Est Ins', 'Amount', 'Balance'];

export const HEADER_BG = 'linear-gradient(180deg,#1f6fc4,#155a9e)';

/** Which drill-down a ledger click asked for. */
export type LedgerTarget = 'detail' | 'claim-details' | 'allocation';

// ---- Formatting -----------------------------------------------------------


/** Compact currency for the Description column: whole numbers drop the ".00"
 *  to mirror the legacy strings ("$162", "$-74", "$3", "$33.50"). */
function amtShort(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}

const dash = (v: string | null | undefined): string => (v && v.trim() ? v : '-');

/**
 * Signed transaction amount for a denormalised feed row.
 *
 * The backend returns `charge` and `credit` as separate magnitudes and an
 * `amount` that is documented as "+charge / -credit" — but currently ships
 * credits UNSIGNED there (a $500 payment arrives as amount "500.00", which
 * pushes the running balance the wrong way; gap AL-9). Deriving the sign from
 * `charge`/`credit` (and, as a last resort, `transaction_kind`) is correct
 * under either convention.
 */
export function signedAmount(r: AccountLedgerRow): number {
  const charge = Math.abs(num(r.charge));
  const credit = Math.abs(num(r.credit));
  if (charge || credit) return Math.round((charge - credit) * 100) / 100;
  const amt = Math.abs(num(r.amount));
  return r.transaction_kind === 'C' ? -amt : amt;
}

// ---- Row builders ---------------------------------------------------------

/** Map one denormalised backend row (charge / payment / adjustment). */
export function apiRow(
  r: AccountLedgerRow,
  patientId: number,
  patientName: string,
  user: UserFn,
  /** Procedure ids on Hold Claim, joined in by the service (AL-17). */
  held?: Set<string>,
): LedgerRow {
  const kind: LedgerKind =
    r.source_type === 'payment' ? 'payment' : r.source_type === 'adjustment' ? 'adjustment' : 'charge';
  const amount = signedAmount(r);
  const text = r.description || r.code || '';
  // Migrated rows sometimes arrive already money-prefixed ("$-89 Payment - …");
  // prefixing again produced "$0 $-89 Payment - …" in the grid.
  const described = text.trimStart().startsWith('$') ? text : `$${amtShort(amount)} ${text}`.trim();
  const onHold = kind === 'charge' && Boolean(held?.has(r.source_id));
  return {
    key: `${kind}-${r.source_id}`,
    kind,
    source_id: r.source_id,
    patient_id: patientId,
    iso: (r.entry_date ?? '').slice(0, 10),
    date: fmtDate(r.entry_date),
    patient: patientName,
    office: dash(r.office_short_id ?? (r.office_id != null ? String(r.office_id) : null)),
    office_id: r.office_id ?? null,
    apply_to: dash(r.apply_to),
    code: r.code || (kind === 'payment' ? 'PMT' : kind === 'adjustment' ? 'PATADJ' : ''),
    tooth: dash(r.tooth),
    surface: dash(r.surface),
    t: r.transaction_kind || (kind === 'payment' ? 'C' : 'P'),
    n: r.unbilled ? 'N' : '-',
    description: described,
    detail: text,
    // Legacy shows a bare "H" in the Bill column for a held charge.
    bill: onHold ? 'H' : dash(r.billing_status),
    hold_claim: onHold,
    provider: dash(r.provider_name ?? r.provider_id),
    est_pat: num(r.patient_estimate),
    est_ins: num(r.insurance_estimate),
    amount,
    balance: 0,
    user: r.user_label || user(r.user_id) || '-',
    // Only an unbilled, un-held procedure charge can go on a new claim.
    claimable: kind === 'charge' && r.unbilled === true && !onHold,
  };
}

const CLAIM_CODE: Record<string, string> = {
  primary: 'CLM-P',
  secondary: 'CLM-S',
  tertiary: 'CLM-T',
  quaternary: 'CLM-Q',
};
const CLAIM_LABEL: Record<string, string> = {
  primary: 'Pri',
  secondary: 'Sec',
  tertiary: 'Ter',
  quaternary: 'Qua',
};

/**
 * Map an insurance claim to the legacy "CLM-P — Pri Claim - Sent (70.00)" row.
 * Claim rows are informational: they never move the running balance (the
 * underlying procedure charges already did), so `amount` is 0.
 */
export function claimRow(
  c: InsuranceClaimRead,
  patientName: string,
  officeLabel: (id: number | null | undefined) => string,
  user: UserFn,
): LedgerRow {
  const order = (c.billing_order || 'primary').toLowerCase();
  const status = (c.status || 'draft').replace(/_/g, ' ');
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  const billed = num(c.total_billed);
  const paid = num(c.total_paid);
  const closed = c.close_date ? ` Closed: ${fmtDate(c.close_date)}` : '';
  const iso = (c.submitted_date || c.date_of_service_from || c.created_at || '').slice(0, 10);
  const claimText =
    `${CLAIM_LABEL[order] ?? 'Pri'} Claim - ${statusText} (${billed.toFixed(2)})${closed}` +
    (paid ? ` Paid ${paid.toFixed(2)}` : '');
  return {
    key: `claim-${c.id}`,
    kind: 'claim',
    source_id: c.id,
    patient_id: c.patient_id,
    iso,
    date: fmtDate(iso),
    // Prefer the account-member label so claim rows read identically to the
    // transaction rows they belong to.
    patient: patientName || c.patient_name || '',
    office: officeLabel(c.office_id),
    office_id: c.office_id ?? null,
    apply_to: '-',
    code: CLAIM_CODE[order] ?? 'CLM',
    tooth: '-',
    surface: '-',
    t: '-',
    n: 'N',
    description: claimText,
    detail: claimText,
    bill: c.claim_number ? `#${c.claim_number}` : '-',
    hold_claim: false,
    provider: '-',
    est_pat: 0,
    est_ins: num(c.est_insurance),
    amount: 0,
    balance: 0,
    user: user(c.created_by) || '-',
    claimable: false,
  };
}

// ---- Running balance ------------------------------------------------------

/**
 * Compute the per-row running balance over the WHOLE chronological feed.
 * Rows are summed oldest-first (charges add, credits subtract) so each row's
 * balance reflects the account balance at that point in time — independent of
 * the display sort/filter/pagination applied later.
 *
 * The backend ships a `running_balance` per row, but it is (a) per-patient, so
 * it cannot describe a multi-patient account feed, and (b) currently signs
 * credits the wrong way (AL-9). Recomputing keeps both scopes consistent.
 */
export function withRunningBalance(rows: LedgerRow[]): LedgerRow[] {
  const chronological = [...rows].sort(
    (a, b) => a.iso.localeCompare(b.iso) || a.key.localeCompare(b.key),
  );
  let bal = 0;
  const balByKey = new Map<string, number>();
  for (const r of chronological) {
    bal = Math.round((bal + r.amount) * 100) / 100;
    balByKey.set(r.key, bal);
  }
  return rows.map((r) => ({ ...r, balance: balByKey.get(r.key) ?? 0 }));
}

// ---- Filtering / sorting (legacy "Show All" + "Sort By") ------------------

export type LedgerFilter = 'all' | 'charge' | 'payment' | 'adjustment' | 'claim';

export const FILTER_OPTIONS: { value: LedgerFilter; label: string }[] = [
  { value: 'all', label: 'Show All' },
  { value: 'charge', label: 'Procedures' },
  { value: 'payment', label: 'Payments' },
  { value: 'adjustment', label: 'Adjustments' },
  { value: 'claim', label: 'Claims' },
];

export type LedgerSort =
  | 'date_desc'
  | 'date_asc'
  | 'code_asc'
  | 'provider_asc'
  | 'amount_desc'
  | 'amount_asc'
  | 'patient_asc';

export const SORT_OPTIONS: { value: LedgerSort; label: string }[] = [
  { value: 'date_desc', label: 'Date (newest first)' },
  { value: 'date_asc', label: 'Date (oldest first)' },
  { value: 'patient_asc', label: 'Patient (A–Z)' },
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
  if (!fromIso && !toIso) return rows;
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
    case 'patient_asc':
      return out.sort((a, b) => a.patient.localeCompare(b.patient) || a.iso.localeCompare(b.iso));
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
