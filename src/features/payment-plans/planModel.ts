// Payment Plan domain model — shared by the Ortho and Regular contract screens.
//
// Both legacy screens (Denticon "Ortho Payment Plan" / "Regular Payment Plan")
// are contract calculators: staff enter a principal, a down payment, an APR, an
// interval and a payment count, and the screen derives the finance charge,
// periodic payment, total of payments and the billing schedule.
//
// Every field name here matches the backend's snake_case column names
// (OrthoPlanRead / PatientPaymentPlanRead) so the forms bind straight through.
// Fields the backend has no column for are marked `UI-ONLY (gap …)` and are
// listed in docs/payment-plans/payment_plans_backend_devreport.md.

import type { OrthoPlanRead, PatientPaymentPlanRead } from "@/api/generated/model";

// ---------------------------------------------------------------------------
// Intervals
// ---------------------------------------------------------------------------

export interface IntervalDef {
  value: string;
  label: string;
  /** Compounding / billing periods per year — drives the APR amortisation. */
  per_year: number;
  /** Step applied when generating the billing schedule. */
  step_months?: number;
  step_days?: number;
}

/** Legacy "Interval" dropdown, in the legacy order. */
export const INTERVALS: IntervalDef[] = [
  { value: "weekly", label: "Weekly", per_year: 52, step_days: 7 },
  { value: "bi_weekly", label: "Bi-Weekly", per_year: 26, step_days: 14 },
  { value: "semi_monthly", label: "Semi-Monthly", per_year: 24, step_days: 15 },
  { value: "monthly", label: "Monthly", per_year: 12, step_months: 1 },
  { value: "quarterly", label: "Quarterly", per_year: 4, step_months: 3 },
  { value: "semi_annually", label: "Semi-Annually", per_year: 2, step_months: 6 },
  { value: "annually", label: "Annually", per_year: 1, step_months: 12 },
];

export const DEFAULT_INTERVAL = "monthly";

export function interval_def(value?: string | null): IntervalDef {
  const v = (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return INTERVALS.find((i) => i.value === v) ?? INTERVALS[3]!;
}

export function interval_label(value?: string | null): string {
  return interval_def(value).label;
}

// ---------------------------------------------------------------------------
// Number / date helpers
// ---------------------------------------------------------------------------

/** Parse a money/percent input to a number; blank and garbage both read as 0. */
export function num(value?: string | number | null): number {
  if (value == null || value === "") return 0;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[$,\s%]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Parse to an integer count (payment counts, durations). */
export function int(value?: string | number | null): number {
  const n = Math.trunc(num(value));
  return Number.isFinite(n) ? n : 0;
}

/** Fixed 2dp string for money form fields (never "NaN"). */
export function dec(value?: number | string | null): string {
  const n = num(value);
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

/** Money for display: $1,408.00 / ($12.00) for negatives. */
export function money(value?: number | string | null): string {
  const n = num(value);
  const body = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n < 0 ? `($${body})` : `$${body}`;
}

/** Backend "12.34" → "12.34" for an input; null/"" → "". */
export function money_field(value?: string | number | null): string {
  if (value == null || value === "") return "";
  return dec(value);
}

/** Backend number → input string; null → "". */
export function int_field(value?: number | null): string {
  return value == null ? "" : String(value);
}

/** Today as YYYY-MM-DD in local time (backend dates are plain local dates). */
export function today_iso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** YYYY-MM-DD → MM/DD/YYYY. Formatted from parts so there is no UTC shift. */
export function fmt_date(value?: string | null, dash = "-"): string {
  if (!value) return dash;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value;
  return `${m[2]}/${m[3]}/${m[1]}`;
}

/** Normalise a backend datetime/date to the YYYY-MM-DD a date input wants. */
export function date_field(value?: string | null): string {
  if (!value) return "";
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return m ? m[1]! : "";
}

/** "" → null, so blank date inputs clear the column instead of sending "". */
export function date_out(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

/** "" → null for numeric columns. */
export function num_out(value: string): string | null {
  return value.trim() === "" ? null : dec(value);
}

export function int_out(value: string): number | null {
  return value.trim() === "" ? null : int(value);
}

/** Add `n` intervals to a YYYY-MM-DD date, clamping day-of-month overflow. */
export function add_interval(iso: string, interval: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const def = interval_def(interval);
  if (def.step_days) {
    const dt = new Date(y, mo - 1, d + def.step_days * n);
    return iso_of(dt);
  }
  const step = def.step_months ?? 1;
  const target = new Date(y, mo - 1 + step * n, 1);
  // Clamp: 31 Jan + 1 month → 28/29 Feb, matching the legacy biller.
  const last_day = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, last_day));
  return iso_of(target);
}

function iso_of(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole months between two YYYY-MM-DD dates (0 when either is missing). */
export function months_between(from?: string | null, to?: string | null): number {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from ?? "");
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(to ?? "");
  if (!a || !b) return 0;
  let months =
    (Number(b[1]) - Number(a[1])) * 12 + (Number(b[2]) - Number(a[2]));
  if (Number(b[3]) < Number(a[3])) months -= 1;
  return months;
}

// ---------------------------------------------------------------------------
// Contract maths
// ---------------------------------------------------------------------------

/**
 * Level periodic payment for `principal` financed over `n` periods at `apr_pct`
 * nominal annual rate. Zero APR degrades to a straight principal / n split,
 * which is what the legacy screen does for its default 0.00% contracts.
 */
export function periodic_payment(principal: number, apr_pct: number, n: number, per_year: number): number {
  if (n <= 0 || principal <= 0) return 0;
  const i = apr_pct / 100 / per_year;
  if (i <= 0) return principal / n;
  return (principal * i) / (1 - Math.pow(1 + i, -n));
}

export interface Amortisation {
  periodic_amt: number;
  fin_charge: number;
  total_of_payments: number;
}

/** Derive periodic payment / finance charge / total from the contract inputs. */
export function amortise(
  amt_financed: number,
  apr_pct: number,
  n: number,
  interval: string,
): Amortisation {
  const per_year = interval_def(interval).per_year;
  const raw = periodic_payment(amt_financed, apr_pct, n, per_year);
  const periodic_amt = round2(raw);
  const total_of_payments = round2(periodic_amt * n);
  return {
    periodic_amt,
    fin_charge: round2(Math.max(0, total_of_payments - amt_financed)),
    total_of_payments,
  };
}

/**
 * Inverse of `amortise` for when staff type a periodic payment directly: keep
 * their number and re-derive the charge/total from it.
 */
export function from_periodic(amt_financed: number, periodic_amt: number, n: number): Amortisation {
  const total_of_payments = round2(periodic_amt * n);
  return {
    periodic_amt: round2(periodic_amt),
    fin_charge: round2(Math.max(0, total_of_payments - amt_financed)),
    total_of_payments,
  };
}

export function round2(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export interface ScheduleRow {
  periodic_order: number;
  periodic_date: string;
  periodic_amt: number;
  rem_payments: number;
  rem_total_amt: number;
  is_billed: boolean;
  billing_code?: string | null;
  ledger_id?: string | null;
}

/**
 * Build the periodic billing schedule the legacy "BILLING DETAILS" popup shows.
 * The final instalment absorbs the rounding remainder so the rows always sum to
 * the total of payments exactly.
 */
export function build_schedule(
  first_due_date: string,
  interval: string,
  num_payments: number,
  periodic_amt: number,
  total_of_payments?: number,
): ScheduleRow[] {
  const n = Math.max(0, Math.trunc(num_payments));
  if (!first_due_date || n === 0 || periodic_amt <= 0) return [];
  const total = round2(total_of_payments && total_of_payments > 0 ? total_of_payments : periodic_amt * n);
  const rows: ScheduleRow[] = [];
  let paid = 0;
  for (let k = 0; k < n; k += 1) {
    const is_last = k === n - 1;
    const amt = is_last ? round2(total - paid) : round2(periodic_amt);
    paid = round2(paid + amt);
    rows.push({
      periodic_order: k + 1,
      periodic_date: add_interval(first_due_date, interval, k),
      periodic_amt: amt,
      rem_payments: n - k - 1,
      rem_total_amt: round2(total - paid),
      is_billed: false,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Regular ("Regular Payment Plan") form
// ---------------------------------------------------------------------------

/**
 * The legacy CONTRACT block is a 5-line worksheet:
 *   1 Patient Balance Amount  → plan_bal_amt
 *   2 Treatment Plan Amount   → derived (see `regular_tx_plan_amount`)
 *   3 Total Plan Amount (1+2) → derived
 *   4 Down Payment Amount     → down_payment
 *   5 Amount Financed (3-4)   → amt_financed
 * Line 2 has no backend column, but it is recoverable without loss because
 * 2 = (amt_financed + down_payment) − plan_bal_amt, so nothing is dropped on a
 * save/reload round-trip (see gap RPP-1 for the explicit column request).
 */
export interface RegularPlanForm {
  patient_balance_amount: string; // (1) plan_bal_amt
  tx_plan_amount: string; // (2) derived
  total_plan_amount: string; // (3) derived
  down_payment: string; // (4) down_payment
  amt_financed: string; // (5) amt_financed
  tx_plan_number: string; // "Treatment Plan Patient Balance for ID"
  setup_date: string;
  apr: string;
  interval_type: string;
  num_payments: string;
  periodic_amt: string;
  first_due_date: string;
  fin_charge: string;
  total_of_payments: string; // derived
  rem_payments: string;
  rem_total_amt: string;
  notes: string;
  // UI-ONLY (gap RPP-2) — legacy shows a fixed contract billing code.
  billing_code: string;
  // UI-ONLY (gap RPP-3)
  disclosure: string;
  // UI-ONLY (gap RPP-4) — payment method has no backend columns.
  payment_code: string;
  card_holder: string;
  card_number: string;
  card_exp_month: string;
  card_exp_year: string;
  card_cvv: string;
  post_down_payment_with_card: boolean;
}

/** Legacy renders this code read-only on every regular contract. */
export const REGULAR_BILLING_CODE = "ACBIL : Periodic Contract Billing";

export function empty_regular_form(): RegularPlanForm {
  return {
    patient_balance_amount: "",
    tx_plan_amount: "",
    total_plan_amount: "",
    down_payment: "",
    amt_financed: "",
    tx_plan_number: "",
    setup_date: today_iso(),
    apr: "0.00",
    interval_type: DEFAULT_INTERVAL,
    num_payments: "",
    periodic_amt: "",
    first_due_date: "",
    fin_charge: "",
    total_of_payments: "",
    rem_payments: "",
    rem_total_amt: "",
    notes: "",
    billing_code: REGULAR_BILLING_CODE,
    disclosure: "Treatment Plan Disclosure",
    payment_code: "",
    card_holder: "",
    card_number: "",
    card_exp_month: "01",
    card_exp_year: String(new Date().getFullYear()),
    card_cvv: "",
    post_down_payment_with_card: false,
  };
}

/** Recover line 2 from the persisted columns (see the interface comment). */
export function regular_tx_plan_amount(row: PatientPaymentPlanRead): number {
  const total = num(row.amt_financed) + num(row.down_payment);
  return round2(Math.max(0, total - num(row.plan_bal_amt)));
}

export function regular_form_from(row: PatientPaymentPlanRead): RegularPlanForm {
  const base = empty_regular_form();
  const tx_amount = regular_tx_plan_amount(row);
  const total_plan = round2(num(row.plan_bal_amt) + tx_amount);
  const financed = num(row.amt_financed);
  return {
    ...base,
    patient_balance_amount: money_field(row.plan_bal_amt),
    tx_plan_amount: dec(tx_amount),
    total_plan_amount: dec(total_plan),
    down_payment: money_field(row.down_payment),
    amt_financed: money_field(row.amt_financed),
    tx_plan_number: row.tx_plan_number ?? "",
    setup_date: date_field(row.setup_date) || today_iso(),
    apr: money_field(row.apr) || "0.00",
    interval_type: interval_def(row.interval_type).value,
    num_payments: int_field(row.num_payments),
    periodic_amt: money_field(row.periodic_amt),
    first_due_date: date_field(row.first_due_date),
    fin_charge: money_field(row.fin_charge),
    total_of_payments: dec(financed + num(row.fin_charge)),
    rem_payments: int_field(row.rem_payments),
    rem_total_amt: money_field(row.rem_total_amt),
    notes: row.notes ?? "",
  };
}

/** Body for POST/PATCH /patient-payment-plans. */
export function regular_body(form: RegularPlanForm, patient_id: number, office_id: number | null) {
  return {
    patient_id,
    office_id,
    plan_type: "regular" as const,
    plan_bal_amt: num_out(form.patient_balance_amount),
    tx_plan_number: form.tx_plan_number.trim() || null,
    setup_date: date_out(form.setup_date),
    amt_financed: num_out(form.amt_financed),
    down_payment: num_out(form.down_payment),
    apr: num_out(form.apr),
    fin_charge: num_out(form.fin_charge),
    interval_type: form.interval_type,
    num_payments: int_out(form.num_payments),
    periodic_amt: num_out(form.periodic_amt),
    first_due_date: date_out(form.first_due_date),
    rem_payments: int_out(form.rem_payments),
    rem_total_amt: num_out(form.rem_total_amt),
    notes: form.notes.trim() || null,
    is_active: true,
  };
}

/** Legacy required-field validation for the regular contract. */
export function validate_regular(form: RegularPlanForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (num(form.total_plan_amount) <= 0) {
    errors.total_plan_amount = "Total Plan Amount is required.";
  }
  if (num(form.down_payment) > num(form.total_plan_amount)) {
    errors.down_payment = "Down Payment cannot exceed the Total Plan Amount.";
  }
  if (num(form.amt_financed) <= 0) errors.amt_financed = "Amount Financed is required.";
  if (!form.setup_date) errors.setup_date = "Plan Setup Date is required.";
  if (form.apr.trim() === "") errors.apr = "APR is required.";
  if (int(form.num_payments) <= 0) errors.num_payments = "No. of Payments is required.";
  if (!form.first_due_date) errors.first_due_date = "First Billing Date is required.";
  if (form.rem_payments.trim() === "") {
    errors.rem_payments = "Remaining # of Payments is required.";
  } else if (int(form.rem_payments) > int(form.num_payments)) {
    errors.rem_payments = "Remaining payments cannot exceed the total payment count.";
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Ortho ("Ortho Payment Plan") form
// ---------------------------------------------------------------------------

/**
 * The ortho screen is a PLAN ID header plus three independent sub-plans
 * (patient / primary insurance / secondary insurance), each with its own
 * enable checkbox, amortisation block, notes and billing actions.
 */
export interface OrthoPlanForm {
  // --- PLAN ID -------------------------------------------------------------
  /** UI-ONLY (gap OPP-1) — backend stores a single `procedure_code`. */
  initial_billing_code: string;
  /** Periodic Billing Code → procedure_code. */
  procedure_code: string;
  description: string;
  /** UI-ONLY (gap OPP-2) — no provider column on ortho_plans. */
  pref_provider_id: string;
  total_ortho_amt: string; // Fee
  pat_share_amt: string; // Est. Patient
  ins_share_amt: string; // Est. Insurance
  treat_start_date: string;
  banding_date: string;
  /** Tx Duration (In Months) — derived from banding → treatment end. */
  tx_duration_months: string;
  treat_end_date: string;
  /** UI-ONLY (gap OPP-3) */
  insert_class: string;

  // --- START PATIENT PAYMENT PLAN -----------------------------------------
  pat_plan_enabled: boolean;
  /** UI-ONLY (gap OPP-4) — no pat_setup_date column. */
  pat_setup_date: string;
  pat_first_due_date: string;
  pat_plan_amount: string; // derived = financed + down
  pat_interval: string;
  pat_down_pay: string;
  pat_fin_charge: string;
  pat_amt_financed: string;
  pat_total_of_payments: string; // derived
  pat_apr: string;
  pat_num_payments: string;
  pat_periodic_amt: string;
  pat_rem_payments: string;
  pat_rem_amt: string;
  /** UI-ONLY (gap OPP-5) */
  pat_disclosure: string;
  /** UI-ONLY (gap OPP-4) — only the two insurance sub-plans have notes. */
  pat_notes: string;

  // --- PAYMENT METHOD (all UI-ONLY, gap OPP-6) -----------------------------
  payment_code: string;
  card_holder: string;
  card_number: string;
  card_exp_month: string;
  card_exp_year: string;
  card_cvv: string;
  post_down_payment_with_card: boolean;

  // --- START PRI INSURANCE PAYMENT PLAN ------------------------------------
  ins_plan_enabled: boolean;
  ins_plan_id: string;
  ins_setup_date: string;
  ins_first_due_date: string;
  ins_interval: string;
  ins_plan_amount: string;
  ins_down_pay: string;
  ins_num_payments: string;
  ins_periodic_amt: string;
  ins_rem_payments: string;
  ins_rem_amt: string;
  ins_months_remaining: string;
  /** UI-ONLY (gap OPP-7) */
  ins_mon_claim_print_fee: string;
  /** UI-ONLY (gap OPP-7) */
  ins_suppress_periodic_printing: boolean;
  ins_notes: string;

  // --- START SEC INSURANCE PAYMENT PLAN ------------------------------------
  sec_ins_plan_enabled: boolean;
  sec_ins_plan_id: string;
  /** UI-ONLY (gap OPP-8) */
  sec_ins_setup_date: string;
  /** UI-ONLY (gap OPP-8) */
  sec_ins_first_due_date: string;
  /** UI-ONLY (gap OPP-8) */
  sec_ins_interval: string;
  sec_ins_plan_amount: string;
  /** UI-ONLY (gap OPP-8) */
  sec_ins_down_pay: string;
  /** UI-ONLY (gap OPP-8) */
  sec_ins_num_payments: string;
  sec_ins_periodic_amt: string;
  /** UI-ONLY (gap OPP-8) */
  sec_ins_rem_payments: string;
  /** UI-ONLY (gap OPP-8) */
  sec_ins_rem_amt: string;
  /** UI-ONLY (gap OPP-7) */
  sec_ins_mon_claim_print_fee: string;
  /** UI-ONLY (gap OPP-7) */
  sec_ins_suppress_periodic_printing: boolean;
  sec_ins_notes: string;
}

export function empty_ortho_form(): OrthoPlanForm {
  const today = today_iso();
  return {
    initial_billing_code: "",
    procedure_code: "",
    description: "",
    pref_provider_id: "",
    total_ortho_amt: "",
    pat_share_amt: "",
    ins_share_amt: "",
    treat_start_date: today,
    banding_date: today,
    tx_duration_months: "",
    treat_end_date: "",
    insert_class: "None",

    pat_plan_enabled: false,
    pat_setup_date: today,
    pat_first_due_date: add_interval(today, DEFAULT_INTERVAL, 1),
    pat_plan_amount: "",
    pat_interval: DEFAULT_INTERVAL,
    pat_down_pay: "",
    pat_fin_charge: "",
    pat_amt_financed: "",
    pat_total_of_payments: "",
    pat_apr: "0.00",
    pat_num_payments: "",
    pat_periodic_amt: "",
    pat_rem_payments: "",
    pat_rem_amt: "",
    pat_disclosure: "Treatment Plan Disclosure",
    pat_notes: "",

    payment_code: "",
    card_holder: "",
    card_number: "",
    card_exp_month: "01",
    card_exp_year: String(new Date().getFullYear()),
    card_cvv: "",
    post_down_payment_with_card: false,

    ins_plan_enabled: false,
    ins_plan_id: "",
    ins_setup_date: today,
    ins_first_due_date: add_interval(today, DEFAULT_INTERVAL, 1),
    ins_interval: DEFAULT_INTERVAL,
    ins_plan_amount: "",
    ins_down_pay: "",
    ins_num_payments: "",
    ins_periodic_amt: "",
    ins_rem_payments: "",
    ins_rem_amt: "",
    ins_months_remaining: "",
    ins_mon_claim_print_fee: "",
    ins_suppress_periodic_printing: false,
    ins_notes: "",

    sec_ins_plan_enabled: false,
    sec_ins_plan_id: "",
    sec_ins_setup_date: today,
    sec_ins_first_due_date: add_interval(today, DEFAULT_INTERVAL, 1),
    sec_ins_interval: DEFAULT_INTERVAL,
    sec_ins_plan_amount: "",
    sec_ins_down_pay: "",
    sec_ins_num_payments: "",
    sec_ins_periodic_amt: "",
    sec_ins_rem_payments: "",
    sec_ins_rem_amt: "",
    sec_ins_mon_claim_print_fee: "",
    sec_ins_suppress_periodic_printing: false,
    sec_ins_notes: "",
  };
}

/** A sub-plan counts as "started" when it carries any amount or schedule. */
function has_values(...values: Array<string | number | null | undefined>): boolean {
  return values.some((v) => v != null && String(v).trim() !== "" && num(v) !== 0);
}

export function ortho_form_from(row: OrthoPlanRead): OrthoPlanForm {
  const base = empty_ortho_form();
  const banding = date_field(row.banding_date);
  const end = date_field(row.treat_end_date);
  const financed = num(row.pat_amt_financed);
  return {
    ...base,
    procedure_code: row.procedure_code ?? "",
    description: row.description ?? "",
    total_ortho_amt: money_field(row.total_ortho_amt),
    pat_share_amt: money_field(row.pat_share_amt),
    ins_share_amt: money_field(row.ins_share_amt),
    treat_start_date: date_field(row.treat_start_date),
    banding_date: banding,
    treat_end_date: end,
    tx_duration_months: banding && end ? String(months_between(banding, end)) : "",

    pat_plan_enabled: has_values(
      row.pat_amt_financed,
      row.pat_periodic_amt,
      row.pat_num_payments,
      row.pat_down_pay,
    ),
    pat_first_due_date: date_field(row.pat_first_due_date),
    pat_plan_amount: dec(financed + num(row.pat_down_pay)),
    pat_interval: interval_def(row.pat_interval).value,
    pat_down_pay: money_field(row.pat_down_pay),
    pat_fin_charge: money_field(row.pat_fin_charge),
    pat_amt_financed: money_field(row.pat_amt_financed),
    pat_total_of_payments: dec(financed + num(row.pat_fin_charge)),
    pat_apr: money_field(row.pat_apr) || "0.00",
    pat_num_payments: int_field(row.pat_num_payments),
    pat_periodic_amt: money_field(row.pat_periodic_amt),
    pat_rem_payments: int_field(row.pat_rem_payments),
    pat_rem_amt: money_field(row.pat_rem_amt),

    ins_plan_enabled: has_values(
      row.ins_plan_amount,
      row.ins_periodic_amt,
      row.ins_num_payments,
      row.ins_plan_id,
    ),
    ins_plan_id: row.ins_plan_id == null ? "" : String(row.ins_plan_id),
    ins_setup_date: date_field(row.ins_setup_date) || base.ins_setup_date,
    ins_first_due_date: date_field(row.ins_first_due_date),
    ins_interval: interval_def(row.ins_interval).value,
    ins_plan_amount: money_field(row.ins_plan_amount),
    ins_down_pay: money_field(row.ins_down_pay),
    ins_num_payments: int_field(row.ins_num_payments),
    ins_periodic_amt: money_field(row.ins_periodic_amt),
    ins_rem_payments: int_field(row.ins_rem_payments),
    ins_rem_amt: money_field(row.ins_rem_amt),
    ins_months_remaining: int_field(row.ins_months_remaining),
    ins_notes: row.ins_notes ?? "",

    sec_ins_plan_enabled: has_values(
      row.sec_ins_plan_amount,
      row.sec_ins_periodic_amt,
      row.sec_ins_plan_id,
    ),
    sec_ins_plan_id: row.sec_ins_plan_id == null ? "" : String(row.sec_ins_plan_id),
    sec_ins_plan_amount: money_field(row.sec_ins_plan_amount),
    sec_ins_periodic_amt: money_field(row.sec_ins_periodic_amt),
    sec_ins_notes: row.sec_ins_notes ?? "",
  };
}

/** Body for POST/PATCH /ortho-plans — only the columns the backend owns. */
export function ortho_body(form: OrthoPlanForm, patient_id: number, office_id: number | null) {
  const pat_on = form.pat_plan_enabled;
  const ins_on = form.ins_plan_enabled;
  const sec_on = form.sec_ins_plan_enabled;
  return {
    patient_id,
    office_id,
    procedure_code: form.procedure_code.trim() || null,
    description: form.description.trim() || null,
    total_ortho_amt: num_out(form.total_ortho_amt),
    pat_share_amt: num_out(form.pat_share_amt),
    ins_share_amt: num_out(form.ins_share_amt),
    treat_start_date: date_out(form.treat_start_date),
    treat_end_date: date_out(form.treat_end_date),
    banding_date: date_out(form.banding_date),

    pat_amt_financed: pat_on ? num_out(form.pat_amt_financed) : null,
    pat_down_pay: pat_on ? num_out(form.pat_down_pay) : null,
    pat_apr: pat_on ? num_out(form.pat_apr) : null,
    pat_fin_charge: pat_on ? num_out(form.pat_fin_charge) : null,
    pat_interval: pat_on ? form.pat_interval : null,
    pat_num_payments: pat_on ? int_out(form.pat_num_payments) : null,
    pat_periodic_amt: pat_on ? num_out(form.pat_periodic_amt) : null,
    pat_rem_payments: pat_on ? int_out(form.pat_rem_payments) : null,
    pat_rem_amt: pat_on ? num_out(form.pat_rem_amt) : null,
    pat_first_due_date: pat_on ? date_out(form.pat_first_due_date) : null,

    ins_plan_id: ins_on ? int_out(form.ins_plan_id) : null,
    ins_setup_date: ins_on ? date_out(form.ins_setup_date) : null,
    ins_plan_amount: ins_on ? num_out(form.ins_plan_amount) : null,
    ins_down_pay: ins_on ? num_out(form.ins_down_pay) : null,
    ins_interval: ins_on ? form.ins_interval : null,
    ins_num_payments: ins_on ? int_out(form.ins_num_payments) : null,
    ins_periodic_amt: ins_on ? num_out(form.ins_periodic_amt) : null,
    ins_rem_payments: ins_on ? int_out(form.ins_rem_payments) : null,
    ins_rem_amt: ins_on ? num_out(form.ins_rem_amt) : null,
    ins_first_due_date: ins_on ? date_out(form.ins_first_due_date) : null,
    ins_months_remaining: ins_on ? int_out(form.ins_months_remaining) : null,
    ins_notes: ins_on ? form.ins_notes.trim() || null : null,

    sec_ins_plan_id: sec_on ? int_out(form.sec_ins_plan_id) : null,
    sec_ins_plan_amount: sec_on ? num_out(form.sec_ins_plan_amount) : null,
    sec_ins_periodic_amt: sec_on ? num_out(form.sec_ins_periodic_amt) : null,
    sec_ins_notes: sec_on ? form.sec_ins_notes.trim() || null : null,

    is_active: true,
  };
}

export function validate_ortho(form: OrthoPlanForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.procedure_code.trim()) errors.procedure_code = "Periodic Billing Code is required.";
  if (!form.initial_billing_code.trim()) errors.initial_billing_code = "Initial Billing Code is required.";
  if (!form.treat_start_date) errors.treat_start_date = "Treatment Start Date is required.";
  if (!form.treat_end_date) errors.treat_end_date = "Treatment End Date is required.";
  if (form.treat_start_date && form.treat_end_date && form.treat_end_date < form.treat_start_date) {
    errors.treat_end_date = "Treatment End Date cannot precede the start date.";
  }
  if (
    form.banding_date &&
    form.treat_end_date &&
    form.treat_end_date < form.banding_date
  ) {
    errors.banding_date = "Banding Date cannot follow the treatment end date.";
  }

  if (form.pat_plan_enabled) {
    if (num(form.pat_plan_amount) <= 0) errors.pat_plan_amount = "Plan Amount is required.";
    if (num(form.pat_down_pay) > num(form.pat_plan_amount)) {
      errors.pat_down_pay = "Down Payment cannot exceed the Plan Amount.";
    }
    if (int(form.pat_num_payments) <= 0) errors.pat_num_payments = "Payments count is required.";
    if (!form.pat_first_due_date) errors.pat_first_due_date = "1st Per. Billing Date is required.";
  }
  if (form.ins_plan_enabled) {
    if (num(form.ins_plan_amount) <= 0) errors.ins_plan_amount = "Plan Amount is required.";
    if (int(form.ins_num_payments) <= 0) errors.ins_num_payments = "Payments count is required.";
    if (!form.ins_first_due_date) errors.ins_first_due_date = "1st Per. Billing Date is required.";
  }
  if (form.sec_ins_plan_enabled && num(form.sec_ins_plan_amount) <= 0) {
    errors.sec_ins_plan_amount = "Plan Amount is required.";
  }
  return errors;
}

/** Legacy inserts "<user> MM/DD/YYYY h:mm AM" at the caret of a notes box. */
export function time_stamp(user: string): string {
  const d = new Date();
  const date = d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${user || "USER"} ${date} ${time}`;
}
