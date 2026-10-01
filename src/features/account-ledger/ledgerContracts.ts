// Legacy CONTRACTS tab — three payment-plan cards. Shared by the on-screen
// panel and the printed ledger so both format the same backend fields the
// same way.

import { money } from './accountLedgerModel';
import type { PaymentPlans } from './accountLedgerService';

export interface ContractCard {
  title: string;
  rows: Array<[string, string]>;
}

/** Date-ish strings -> MM/DD/YYYY; numeric-ish -> $amount; blank -> em dash. */
export function fmtPlanValue(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') return String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
    const [y, m, d] = v.slice(0, 10).split('-');
    return `${m}/${d}/${y}`;
  }
  if (/^-?\d+(\.\d+)?$/.test(v)) return `$${money(v)}`;
  return v;
}

export function contractCards(plans: PaymentPlans): ContractCard[] {
  const reg = plans.regular;
  const ortho = plans.ortho;
  const ins = plans.orthoIns;
  const card = (title: string, rows: Array<[string, string | number | null | undefined]>): ContractCard => ({
    title,
    rows: rows.map(([label, v]) => [label, fmtPlanValue(v)]),
  });
  return [
    card('Regular - Patient Payment Plan', [
      ['Plan Amount', reg?.amt_financed ?? reg?.plan_bal_amt],
      ['Down Pay', reg?.down_payment],
      ['Next Per. Amt', reg?.periodic_amt],
      ['Next Date', reg?.first_due_date],
      ['Rem. Total Amt', reg?.rem_total_amt],
      ['Rem. # Of Pay', reg?.rem_payments],
    ]),
    // Both ortho cards come from the `/ortho-plans` contract (AL-3 resolved):
    // the patient sub-plan under `pat_*`, the insurance sub-plan under `ins_*`.
    card('Ortho - Patient Payment Plan', [
      ['Plan Amount', ortho?.pat_amt_financed],
      ['Down Pay', ortho?.pat_down_pay],
      ['Next Per. Amt', ortho?.pat_periodic_amt],
      ['Next Date', ortho?.pat_first_due_date],
      ['Rem. Total Amt', ortho?.pat_rem_amt],
      ['Rem. # Of Pay', ortho?.pat_rem_payments],
    ]),
    card('Ortho - Insurance Payment Plan', [
      ['Plan Amount', ortho?.ins_plan_amount],
      ['Down Pay', ortho?.ins_down_pay],
      ['Next Per. Amt', ortho?.ins_periodic_amt ?? ins?.periodic_amt],
      ['Next Date', ortho?.ins_first_due_date ?? ins?.periodic_date],
      ['Rem. Total Amt', ortho?.ins_rem_amt],
      ['Rem. # Of Pay', ortho?.ins_rem_payments],
    ]),
  ];
}
