// Legacy BALANCES table model — one aggregate "Account Balance" row followed by
// one row per patient on the account. Shared by the on-screen table, the
// Balance Statistics popup and the printed ledger.

import type { BalancesResponse } from '@/services/ledgerApi';
import type { AccountMember } from './accountLedgerService';

/** Per-member balance snapshot; `balances` is null until its request resolves. */
export interface MemberBalance {
  member: AccountMember;
  balances: BalancesResponse | null;
}

export const BALANCE_COLS = [
  'Patient', 'Current', 'Over 30', 'Over 60', 'Over 90', 'Over 120', 'Balance',
  'Est Ins', 'Est Pat', "Today's Charges", "Today's Payments",
  'Last Ins. Pay', 'Last Ins. Pay Date', 'Last Pat. Pay', 'Last Pat. Date',
] as const;

/** YYYY-MM-DD -> MM/DD/YYYY; em dash when blank. */
export const fmtDay = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
};

/** Latest payment of a kind across all account members. */
export function mostRecent(
  rows: MemberBalance[],
  key: 'last_insurance_payment' | 'last_patient_payment',
): { amount: number; date: string } | null {
  let best: { amount: number; date: string } | null = null;
  for (const r of rows) {
    const p = r.balances?.recent_activity[key];
    if (p && (!best || p.date > best.date)) best = p;
  }
  return best;
}

/**
 * The aggregate "Account Balance" row: every money column summed across the
 * members whose balances have loaded (null until at least one has).
 */
export function aggregateBalances(rows: MemberBalance[]): BalancesResponse | null {
  if (!rows.some((r) => r.balances)) return null;
  const sum = (pick: (b: BalancesResponse) => number): number =>
    rows.reduce((s, r) => s + (r.balances ? pick(r.balances) : 0), 0);
  return {
    account_balance: sum((b) => b.account_balance),
    patient_balance: sum((b) => b.patient_balance),
    insurance_balance: sum((b) => b.insurance_balance),
    estimated_insurance: sum((b) => b.estimated_insurance),
    estimated_patient: sum((b) => b.estimated_patient),
    aging: {
      current: sum((b) => b.aging.current),
      age_30: sum((b) => b.aging.age_30),
      age_60: sum((b) => b.aging.age_60),
      age_90: sum((b) => b.aging.age_90),
      age_120: sum((b) => b.aging.age_120),
    },
    recent_activity: {
      today_charges: sum((b) => b.recent_activity.today_charges),
      today_payments: sum((b) => b.recent_activity.today_payments),
      last_insurance_payment: mostRecent(rows, 'last_insurance_payment'),
      last_patient_payment: mostRecent(rows, 'last_patient_payment'),
    },
  };
}
