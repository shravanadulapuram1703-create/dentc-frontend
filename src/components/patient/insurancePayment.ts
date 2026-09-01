// Insurance Payment window — model, allocation maths and validation.
//
// Legacy parity: the on-prem "Insurance Payment" window records a whole carrier
// remittance — the cheque/EFT identifiers, the claim it pays, and the split of
// that money across the claim's procedures — not just three numbers per line.
//
// Backend (INS-1 delivered): `POST /api/v1/ledger-insurance-details/payment`
// (`recordInsurancePayment`) takes ONE procedure line and carries the remittance
// identifiers with it: `payment_date`, `payment_method`, `check_number`,
// `bank_number`, `eob_number`, `eft_trace_number`, plus the primary/secondary
// paid / adjust / deductible amounts. A remittance is therefore posted as one
// call per allocated procedure, all sharing the same header values.

import type {
  ClaimDetailClaimRead,
  ClaimDetailCoverageRead,
  ClaimDetailProcedureRead,
} from "@/api/generated/model";

export const num = (v?: string | number | null): number => {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export const money = (v: number): string =>
  `${v < 0 ? "-" : ""}$${Math.abs(v).toFixed(2)}`;

/** Round to cents; guards the float noise that breaks equality checks. */
export const cents = (v: number): number => Math.round(v * 100) / 100;

/** Today in the browser's own timezone — `toISOString()` would shift the day. */
export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const fmtDate = (v?: string | null): string => {
  if (!v) return "-";
  const iso = String(v).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : String(v);
};

/**
 * How a remittance arrived. The `payment_method` value itself comes from the
 * `payment_method` definitions group (or the fallback list below); this is the
 * *shape* it implies, which drives which identifiers are shown and required.
 */
export type PaymentKind = "check" | "eft" | "card" | "other";

export function paymentKind(method: string): PaymentKind {
  const m = method.toLowerCase();
  if (/check|cheque|chk/.test(m)) return "check";
  if (/eft|auto|deposit|ach|wire|electronic/.test(m)) return "eft";
  if (/card|visa|mc|amex|credit/.test(m)) return "card";
  return "other";
}

/** Used when the `payment_method` definitions group is unseeded (gap CHG-10). */
export const FALLBACK_PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "check", label: "Check" },
  { value: "auto_deposit", label: "Auto Deposit / EFT" },
  { value: "credit_card", label: "Credit Card" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

/** One claim procedure, joined to whatever the carrier has already paid on it. */
export interface ProcedureLine {
  procedure_id: string;
  date_of_service: string;
  code: string;
  tooth: string;
  surface: string;
  description: string;
  provider_id: string;
  office_id: number | null;
  fee: number;
  est_ins: number;
  /** Already posted, from the coverage rows. */
  ded_used: number;
  ins_paid: number;
  ins_adjust: number;
  /** What the carrier still owes on this line: est − paid − adjusted, floored at 0. */
  remaining: number;
  prim_ins_plan_id: number | null;
  sec_ins_plan_id: number | null;
}

/** What the user is entering for a line in this remittance. */
export interface LineEntry {
  selected: boolean;
  /** "New Amt" — the carrier's payment allocated to this line. */
  paid: string;
  /** Contractual write-off for this line. */
  write_off: string;
  /** Deductible the carrier applied to this line. */
  deductible: string;
}

export const emptyLineEntry = (): LineEntry => ({
  selected: true,
  paid: "",
  write_off: "",
  deductible: "",
});

/**
 * Join `/insurance-claims/{id}/detail` into the grid the window renders.
 * `describe` resolves a procedure code to its description.
 */
export function buildProcedureLines(
  claim: ClaimDetailClaimRead,
  procedures: ClaimDetailProcedureRead[],
  coverage: ClaimDetailCoverageRead[],
  describe: (code: string) => string,
): ProcedureLine[] {
  // A procedure can carry several coverage rows (one per posted remittance), so
  // the prior amounts are the SUM of them, not the first row found.
  const byProcedure = new Map<string, ClaimDetailCoverageRead[]>();
  for (const cv of coverage) {
    if (!cv.procedure_id) continue;
    const list = byProcedure.get(cv.procedure_id);
    if (list) list.push(cv);
    else byProcedure.set(cv.procedure_id, [cv]);
  }

  return procedures.map((p) => {
    const rows = byProcedure.get(p.id) ?? [];
    const sum = (pick: (cv: ClaimDetailCoverageRead) => string | null | undefined): number =>
      cents(rows.reduce((t, cv) => t + num(pick(cv)), 0));

    const est_ins = rows.some((cv) => cv.prim_estimated != null)
      ? sum((cv) => cv.prim_estimated)
      : num(p.insurance_estimate);
    const ins_paid = sum((cv) => cv.prim_ins_paid) + sum((cv) => cv.sec_ins_paid);
    const ins_adjust = sum((cv) => cv.prim_ins_adjust) + sum((cv) => cv.sec_ins_adjust);
    const ded_used = sum((cv) => cv.prim_deductible);

    return {
      procedure_id: p.id,
      date_of_service: p.date_of_service,
      code: p.procedure_code,
      tooth: p.tooth || "",
      surface: p.surface || "",
      description: describe(p.procedure_code),
      provider_id: p.provider_id,
      office_id: p.office_id ?? claim.office_id ?? null,
      fee: num(p.fee),
      est_ins,
      ded_used,
      ins_paid,
      ins_adjust,
      remaining: Math.max(cents(est_ins - ins_paid - ins_adjust), 0),
      prim_ins_plan_id:
        rows.find((cv) => cv.prim_ins_plan_id != null)?.prim_ins_plan_id ?? claim.ins_plan_id ?? null,
      sec_ins_plan_id: rows.find((cv) => cv.sec_ins_plan_id != null)?.sec_ins_plan_id ?? null,
    };
  });
}

/**
 * Split `amount` across `lines` in proportion to what each still has
 * outstanding, never giving a line more than it is owed. Cents left over by
 * rounding land on the last line that can absorb them, so the parts always add
 * back up to the whole (or to the total outstanding, when the payment is larger).
 */
export function distributeByRemaining(
  amount: number,
  lines: { procedure_id: string; remaining: number }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  const pool = lines.filter((l) => l.remaining > 0);
  const totalRemaining = cents(pool.reduce((t, l) => t + l.remaining, 0));
  if (amount <= 0 || pool.length === 0 || totalRemaining <= 0) return out;

  const spend = Math.min(cents(amount), totalRemaining);
  let assigned = 0;
  pool.forEach((l, i) => {
    const isLast = i === pool.length - 1;
    const share = isLast
      ? cents(spend - assigned)
      : Math.min(cents((spend * l.remaining) / totalRemaining), l.remaining);
    const value = Math.max(Math.min(share, l.remaining), 0);
    assigned = cents(assigned + value);
    if (value > 0) out[l.procedure_id] = value.toFixed(2);
  });
  return out;
}

/**
 * Claim-level adjustment spread over the selected lines. `%` is taken of each
 * line's own outstanding amount; `$` is split proportionally, the same way a
 * payment is.
 */
export function distributeAdjustment(
  mode: "amount" | "percent",
  value: number,
  lines: { procedure_id: string; remaining: number }[],
): Record<string, string> {
  if (!(value > 0)) return {};
  if (mode === "percent") {
    const out: Record<string, string> = {};
    for (const l of lines) {
      const v = Math.min(cents((l.remaining * value) / 100), l.remaining);
      if (v > 0) out[l.procedure_id] = v.toFixed(2);
    }
    return out;
  }
  return distributeByRemaining(value, lines);
}

export interface PaymentHeader {
  mode: "claims" | "previous_balance";
  payment_date: string;
  payment_amount: string;
  payment_method: string;
  check_number: string;
  bank_number: string;
  eob_number: string;
  eft_trace_number: string;
  notes: string;
  close_claim: boolean;
}

export interface ValidationInput {
  header: PaymentHeader;
  lines: ProcedureLine[];
  entries: Record<string, LineEntry>;
}

/**
 * Every rule the legacy window enforces before it will post, returned together
 * so the user fixes the whole form at once instead of one alert at a time.
 */
export function validatePayment({ header, lines, entries }: ValidationInput): string[] {
  const errors: string[] = [];
  const amount = num(header.payment_amount);

  if (!header.payment_date) errors.push("Enter a payment date.");
  if (!(amount > 0)) errors.push("Enter a payment amount greater than zero.");
  if (!header.payment_method) errors.push("Select a payment type.");

  const kind = paymentKind(header.payment_method);
  if (kind === "check" && !header.check_number.trim()) {
    errors.push("Check number is required for a check payment.");
  }
  if (kind === "eft" && !header.eft_trace_number.trim() && !header.bank_number.trim()) {
    errors.push("Enter the EFT trace number or bank number for an electronic deposit.");
  }

  if (header.mode === "previous_balance") return errors;

  let allocated = 0;
  for (const line of lines) {
    const e = entries[line.procedure_id];
    if (!e) continue;
    const paid = num(e.paid);
    const writeOff = num(e.write_off);
    const deductible = num(e.deductible);
    const label = `${line.code}${line.tooth ? ` (tooth ${line.tooth})` : ""}`;

    if (paid < 0 || writeOff < 0 || deductible < 0) {
      errors.push(`${label}: amounts cannot be negative.`);
      continue;
    }
    if (!e.selected && (paid > 0 || writeOff > 0 || deductible > 0)) {
      errors.push(`${label}: amounts were entered but the line is not selected.`);
    }
    if (cents(paid + writeOff) > line.remaining + 0.005) {
      errors.push(
        `${label}: payment + write-off (${money(cents(paid + writeOff))}) exceeds the remaining ${money(line.remaining)}.`,
      );
    }
    if (deductible > line.fee + 0.005) {
      errors.push(`${label}: deductible exceeds the procedure fee.`);
    }
    if (e.selected) allocated = cents(allocated + paid);
  }

  if (Math.abs(cents(allocated - amount)) > 0.005) {
    errors.push(
      `Allocated ${money(allocated)} does not reconcile with the payment amount ${money(amount)} — ${
        allocated < amount ? `${money(cents(amount - allocated))} is unallocated` : "reduce the allocations"
      }.`,
    );
  }

  return errors;
}

export interface EntryTotals {
  paid: number;
  write_off: number;
  deductible: number;
  unallocated: number;
}

export function totalsFor(
  header: PaymentHeader,
  lines: ProcedureLine[],
  entries: Record<string, LineEntry>,
): EntryTotals {
  let paid = 0;
  let write_off = 0;
  let deductible = 0;
  for (const line of lines) {
    const e = entries[line.procedure_id];
    if (!e?.selected) continue;
    paid = cents(paid + num(e.paid));
    write_off = cents(write_off + num(e.write_off));
    deductible = cents(deductible + num(e.deductible));
  }
  return { paid, write_off, deductible, unallocated: cents(num(header.payment_amount) - paid) };
}
