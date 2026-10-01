// Rows of the CONTRACTS tab — regular plans, payment plans and ortho plans
// flattened onto one set of columns. Shared by the on-screen tab and the
// printed Patient Overview.

import type { OverviewData } from "./useOverviewData";

export const CONTRACT_COLUMNS = [
  "Plan",
  "Setup Date",
  "Amt Financed",
  "Down Pay",
  "APR",
  "Fin Charge",
  "Interval",
  "# Pmts",
  "Periodic Amt",
  "First Due",
  "Rem Pmts",
  "Rem Amount",
];

export interface ContractRow {
  key: string;
  label: string;
  setup_date?: string | null;
  amt_financed?: string | null;
  down_payment?: string | null;
  apr?: string | null;
  fin_charge?: string | null;
  interval_type?: string | null;
  num_payments?: number | null;
  periodic_amt?: string | null;
  first_due_date?: string | null;
  rem_payments?: number | null;
  rem_total_amt?: string | null;
}

export function contract_rows(data: Pick<OverviewData, "reg_plans" | "payment_plans" | "ortho_plans">): ContractRow[] {
  return [
    ...data.reg_plans.map((p) => ({ key: `reg-${p.id}`, label: "Regular", ...p })),
    ...data.payment_plans.map((p) => ({
      key: `pay-${p.id}`,
      label: p.plan_type || "Payment Plan",
      ...p,
    })),
    // Ortho contracts live on /ortho-plans; their patient sub-plan maps onto the
    // same columns under the `pat_` prefix.
    ...data.ortho_plans.map((p) => ({
      key: `ortho-${p.id}`,
      label: "Ortho",
      setup_date: p.treat_start_date,
      amt_financed: p.pat_amt_financed,
      down_payment: p.pat_down_pay,
      apr: p.pat_apr,
      fin_charge: p.pat_fin_charge,
      interval_type: p.pat_interval,
      num_payments: p.pat_num_payments,
      periodic_amt: p.pat_periodic_amt,
      first_due_date: p.pat_first_due_date,
      rem_payments: p.pat_rem_payments,
      rem_total_amt: p.pat_rem_amt,
    })),
  ];
}

// `referral_type` is a legacy code: "0" = Referred By, "1" = Referred To.
export const referral_direction_label = (code?: string | null): string => {
  const c = (code ?? "").trim();
  if (c === "0") return "Referred By";
  if (c === "1") return "Referred To";
  return c || "-";
};
