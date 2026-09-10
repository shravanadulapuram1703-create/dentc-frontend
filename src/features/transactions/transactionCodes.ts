// Payment / adjustment code catalog for the Transactions Entry Payments and
// Adjustments tabs (used verbatim by the Account Ledger's Pay/Adj popup, which
// mounts the same two tabs).
//
// The legacy screen offers a fixed practice catalog: every payment code carries
// a *tender category* (Cash / Check / Credit Card / Direct Dep. / Third-party
// Financing) that decides which entry panel opens on the right, and every
// adjustment code carries a *sign* (+ increases the patient balance, - decreases
// it) and a *group* (Production / Collection).
//
// The backend keeps these codes in `/definitions` (`group_code` `payment_method`
// / `adjustment`) but today seeds only a generic handful (cash, check,
// write_off, ...) with none of the legacy metadata — see gaps PAY-1 / ADJ-3 in
// docs/transactions/transactions_backend_devreport.md. So:
//
//   * the legacy catalog below is the picker's baseline — every legacy code is
//     always offered, even against an unseeded backend;
//   * a backend definition with the same `key1` overlays the legacy row
//     (description / active flag win, and category / group / sign are read from
//     `key2` / `section` when the backend supplies them);
//   * backend-only definitions are appended when they carry the full legacy
//     metadata (payments: `key2` is a tender category; adjustments: `key2` is
//     production|collection AND `section` is `+`|`-`). Generic rows without that
//     metadata still resolve to a label on the grids, they just aren't offered
//     as new picks.
//
// Field names stay snake_case and bind straight to `PatientPaymentCreate` /
// `PatientAdjustmentCreate`; the code itself is what gets stored in
// `payment_method` / `adjustment_type`.

import type { DefinitionRead } from '@/api/generated/model';

// ---- Payments -------------------------------------------------------------

export type PaymentCategory =
  | 'Cash'
  | 'Check'
  | 'Credit Card'
  | 'Direct Dep.'
  | 'Third-party Financing'
  | 'None';

/** Picker filter order (legacy "All" column). `None` is the COLPY-style code with no tender. */
export const PAYMENT_CATEGORIES: PaymentCategory[] = [
  'Cash',
  'Check',
  'Credit Card',
  'Direct Dep.',
  'Third-party Financing',
  'None',
];

export interface PaymentCodeOption {
  code: string;
  category: PaymentCategory;
  description: string;
  is_active: boolean;
}

/** Legacy Denticon payment codes, in the order the legacy picker lists them. */
export const LEGACY_PAYMENT_CODES: ReadonlyArray<Omit<PaymentCodeOption, 'is_active'>> = [
  { code: 'PP006', category: 'Credit Card', description: 'PMT PAT-American Express' },
  { code: 'PF001', category: 'Third-party Financing', description: 'PMT PAT-Care Credit' },
  { code: 'PP005', category: 'Cash', description: 'PMT PAT-Cash' },
  { code: 'PP009', category: 'Check', description: 'PMT PAT-Check' },
  { code: 'PP001', category: 'Credit Card', description: 'PMT PAT-Debit Card' },
  { code: 'PP007', category: 'Credit Card', description: 'PMT PAT-Discover' },
  { code: 'PP002', category: 'Check', description: 'PMT PAT-E Check' },
  { code: 'PP008', category: 'Credit Card', description: 'PMT PAT-Master Card / Visa' },
  { code: 'PP004', category: 'Check', description: 'PMT- Collection Agency - Check' },
  { code: 'PA003', category: 'Direct Dep.', description: 'PMT-AUTO/RECUR-American Expres' },
  { code: 'PA001', category: 'Direct Dep.', description: 'PMT-AUTO/RECUR-Check' },
  { code: 'PA004', category: 'Direct Dep.', description: 'PMT-AUTO/RECUR-Discover' },
  { code: 'PA005', category: 'Direct Dep.', description: 'PMT-AUTO/RECUR-EZPAY Check' },
  { code: 'PA002', category: 'Direct Dep.', description: 'PMT-AUTO/RECUR-Master Card/Vis' },
  { code: 'APBAC', category: 'Cash', description: 'Previous Balance, Credit' },
  { code: 'APBIC', category: 'Cash', description: 'Previous Balance, Ins Credit' },
  { code: 'COLPY', category: 'None', description: 'PT Paymt To Collections Agency' },
  { code: 'PF005', category: 'Third-party Financing', description: 'Sunbit Payment' },
];

/**
 * Which extra fields the right-hand entry panel shows for a tender category
 * (legacy: Cash = amount only; Check = check # + bank #; Credit = card # + exp;
 * Direct Dep / Third-party / NONE = amount only).
 */
export interface PaymentPanel {
  /** Panel caption (legacy block title). */
  title: string;
  check_number: boolean;
  check_number_required: boolean;
  bank_number: boolean;
  card: boolean;
}

export function paymentPanel(category: PaymentCategory | null): PaymentPanel {
  switch (category) {
    case 'Check':
      return { title: 'Check', check_number: true, check_number_required: true, bank_number: true, card: false };
    case 'Credit Card':
      return { title: 'Credit', check_number: false, check_number_required: false, bank_number: false, card: true };
    case 'Cash':
      return { title: 'Cash', check_number: false, check_number_required: false, bank_number: false, card: false };
    case 'Direct Dep.':
      return { title: 'Direct Dep', check_number: false, check_number_required: false, bank_number: false, card: false };
    case 'Third-party Financing':
      return { title: 'Third-party Financing', check_number: false, check_number_required: false, bank_number: false, card: false };
    case 'None':
      return { title: 'NONE', check_number: false, check_number_required: false, bank_number: false, card: false };
    default:
      return { title: 'Payment', check_number: false, check_number_required: false, bank_number: false, card: false };
  }
}

const CATEGORY_ALIASES: Record<string, PaymentCategory> = {
  cash: 'Cash',
  check: 'Check',
  cheque: 'Check',
  'credit card': 'Credit Card',
  credit_card: 'Credit Card',
  credit: 'Credit Card',
  card: 'Credit Card',
  'direct dep.': 'Direct Dep.',
  'direct dep': 'Direct Dep.',
  direct_dep: 'Direct Dep.',
  'direct deposit': 'Direct Dep.',
  eft: 'Direct Dep.',
  ach: 'Direct Dep.',
  'third-party financing': 'Third-party Financing',
  'third party financing': 'Third-party Financing',
  third_party_financing: 'Third-party Financing',
  financing: 'Third-party Financing',
  none: 'None',
  '-': 'None',
};

/** `DefinitionRead.key2` -> tender category, or null when it is not one (e.g. the seeded `patient`/`insurance`). */
export function normalizePaymentCategory(key2: string | null | undefined): PaymentCategory | null {
  const k = (key2 ?? '').trim().toLowerCase();
  return k ? CATEGORY_ALIASES[k] ?? null : null;
}

/**
 * Picker rows: legacy catalog overlaid by backend definitions (same `key1`,
 * case-insensitive), plus any backend-only definition that carries a tender
 * category in `key2`. Inactive rows are dropped.
 */
export function paymentCodeOptions(defs: DefinitionRead[]): PaymentCodeOption[] {
  const byCode = new Map<string, DefinitionRead>();
  for (const d of defs) byCode.set(d.key1.trim().toUpperCase(), d);

  const rows: PaymentCodeOption[] = LEGACY_PAYMENT_CODES.map((legacy) => {
    const d = byCode.get(legacy.code.toUpperCase());
    if (!d) return { ...legacy, is_active: true };
    byCode.delete(legacy.code.toUpperCase());
    return {
      code: legacy.code,
      category: normalizePaymentCategory(d.key2) ?? legacy.category,
      description: d.description || legacy.description,
      is_active: d.is_active,
    };
  });

  const extras: PaymentCodeOption[] = [];
  for (const d of byCode.values()) {
    const category = normalizePaymentCategory(d.key2);
    if (!category) continue;
    extras.push({ code: d.key1, category, description: d.description, is_active: d.is_active });
  }
  extras.sort((a, b) => a.code.localeCompare(b.code));

  return [...rows, ...extras].filter((r) => r.is_active);
}

/** Grid / ledger label for a stored `payment_method` (backend description first, legacy catalog second, raw code last). */
export function paymentCodeLabel(defs: DefinitionRead[]): (code: string | null | undefined) => string {
  const m = new Map<string, string>();
  for (const l of LEGACY_PAYMENT_CODES) m.set(l.code.toUpperCase(), l.description);
  for (const d of defs) m.set(d.key1.trim().toUpperCase(), d.description);
  return (code) => (code ? m.get(code.trim().toUpperCase()) || code : '');
}

/** Legacy `Apply To` choices, stored as `PatientPaymentCreate.payment_type`. */
export const PAYMENT_APPLY_TO: ReadonlyArray<{ value: 'patient' | 'insurance'; label: string }> = [
  { value: 'patient', label: 'Responsible Party' },
  { value: 'insurance', label: 'Insurance' },
];

export const CARD_EXP_MONTHS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '01', label: 'Jan' }, { value: '02', label: 'Feb' }, { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' }, { value: '05', label: 'May' }, { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' }, { value: '08', label: 'Aug' }, { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dec' },
];

export const DEFAULT_CARD_EXP_MONTH = '01';

/** Current year through +15 — a card never expires further out than that. */
export function cardExpYears(now = new Date()): string[] {
  const y = now.getFullYear();
  return Array.from({ length: 16 }, (_, i) => String(y + i));
}

export function defaultCardExpYear(now = new Date()): string {
  return String(now.getFullYear());
}

/**
 * `patient_payments` has no card columns (gap PAY-3), so the card reference is
 * folded into `notes` in a fixed, greppable shape: `CC ****1234 exp 01/2026`.
 * Only the last four digits are ever kept — never the full PAN.
 */
export function cardNote(card_last4: string, exp_month: string, exp_year: string): string {
  const last4 = card_last4.replace(/\D/g, '').slice(-4);
  const exp = exp_month && exp_year ? ` exp ${exp_month}/${exp_year}` : '';
  return last4 ? `CC ****${last4}${exp}` : exp.trim();
}

// ---- Adjustments ----------------------------------------------------------

/** `+` increases the patient balance (debit); `-` decreases it (credit / write-off). */
export type AdjustmentSign = '+' | '-';
export type AdjustmentGroup = 'Production' | 'Collection';

export const ADJUSTMENT_GROUPS: AdjustmentGroup[] = ['Production', 'Collection'];

export interface AdjustmentCodeOption {
  code: string;
  sign: AdjustmentSign;
  group: AdjustmentGroup;
  description: string;
  is_active: boolean;
}

/** Legacy Denticon adjustment codes, in the order the legacy picker lists them. */
export const LEGACY_ADJUSTMENT_CODES: ReadonlyArray<Omit<AdjustmentCodeOption, 'is_active'>> = [
  { code: 'AC013', sign: '-', group: 'Production', description: 'ADJ OFF - Admin Adjustment' },
  { code: 'AC009', sign: '-', group: 'Production', description: 'ADJ OFF - Bankruptcy' },
  { code: 'AC012', sign: '-', group: 'Production', description: 'ADJ OFF - Collection Fee' },
  { code: 'AFEED', sign: '-', group: 'Production', description: 'ADJ OFF - Contract Adjustments' },
  { code: 'AC006', sign: '-', group: 'Production', description: 'ADJ OFF - Coupon' },
  { code: 'AC014', sign: '-', group: 'Production', description: 'ADJ OFF - Courtesy Discount' },
  { code: 'AC003', sign: '-', group: 'Production', description: 'ADJ OFF - Failed Treatment' },
  { code: 'AC015', sign: '-', group: 'Production', description: 'ADJ OFF - Ins Agreement' },
  { code: 'AC001', sign: '-', group: 'Production', description: 'ADJ OFF - Late Charge' },
  { code: 'AC004', sign: '-', group: 'Production', description: 'ADJ OFF - Over Charged Revenue' },
  { code: 'AC011', sign: '-', group: 'Production', description: 'ADJ OFF - Reinstate Credit' },
  { code: 'AC005', sign: '-', group: 'Production', description: 'ADJ OFF - Special Promotion' },
  { code: 'AC007', sign: '-', group: 'Production', description: 'ADJ OFF - Tr to Coll Agency' },
  { code: 'AC002', sign: '-', group: 'Production', description: 'ADJ OFF - Treatment Incomplete' },
  { code: 'AC008', sign: '-', group: 'Production', description: 'ADJ OFF - Uncollectable Balanc' },
  { code: 'AD900', sign: '+', group: 'Collection', description: 'ADJ ON - Capitation Adjustment' },
  { code: 'AFEEI', sign: '+', group: 'Production', description: 'ADJ ON - Contract Adjustments' },
  { code: 'AD004', sign: '+', group: 'Production', description: 'ADJ ON - Increase Patient' },
  { code: 'AD002', sign: '+', group: 'Production', description: 'ADJ ON - Ins Agreement' },
  { code: 'AD001', sign: '+', group: 'Production', description: 'ADJ ON - Reinstate Balance' },
  { code: 'AINSO', sign: '+', group: 'Collection', description: 'AUTO - Insurance Adjustment' },
  { code: 'ACCNC', sign: '+', group: 'Collection', description: 'Cancel Contract (+)' },
  { code: 'ACCNN', sign: '-', group: 'Collection', description: 'Cancel Contract (-)' },
  { code: 'COLFE', sign: '-', group: 'Collection', description: 'Collection Agency Fee For Serv' },
  { code: 'ACRED', sign: '-', group: 'Collection', description: 'Credit Adjustment' },
  { code: 'ADEBT', sign: '+', group: 'Collection', description: 'Debit Adjustment' },
  { code: 'AFCHG', sign: '+', group: 'Production', description: 'FEE - Finance Charge (Account)' },
  { code: 'ALCHG', sign: '+', group: 'Production', description: 'FEE - Late Charge' },
  { code: 'AD003', sign: '+', group: 'Production', description: 'FEE - NSF' },
  { code: 'APBAL', sign: '+', group: 'Production', description: 'Previous Balance' },
  { code: 'APBAI', sign: '+', group: 'Production', description: 'Previous Balance Insurance' },
  { code: 'AR007', sign: '+', group: 'Collection', description: 'REFUND - 3rd Party Finance' },
  { code: 'AR002', sign: '+', group: 'Collection', description: 'REFUND - Credit Card' },
  { code: 'AR003', sign: '+', group: 'Collection', description: 'REFUND - Insurance' },
  { code: 'AR001', sign: '+', group: 'Collection', description: 'REFUND - Patient' },
  { code: 'AR004', sign: '+', group: 'Collection', description: 'REFUND - State' },
  { code: 'AI001', sign: '-', group: 'Collection', description: 'REFUND - Voided' },
  { code: 'AR008', sign: '+', group: 'Collection', description: 'REV PMT - Non-sufficient funds' },
  { code: 'AR006', sign: '+', group: 'Collection', description: 'REV PMT - Payment (corp)' },
  { code: 'AR005', sign: '+', group: 'Collection', description: 'REV PMT - TransFirst CC AutoRF' },
  { code: 'ATAX', sign: '+', group: 'Collection', description: 'Sales Tax' },
  { code: 'SUNBR', sign: '+', group: 'Collection', description: 'Sunbit Refund' },
  { code: 'AC010', sign: '-', group: 'Production', description: 'TRANSFER - Charges From' },
  { code: 'AD010', sign: '+', group: 'Production', description: 'TRANSFER - Charges To' },
  { code: 'AR010', sign: '+', group: 'Collection', description: 'TRANSFER - Payment From' },
  { code: 'AI010', sign: '-', group: 'Collection', description: 'TRANSFER - Payment to' },
];

export function normalizeAdjustmentGroup(key2: string | null | undefined): AdjustmentGroup | null {
  const k = (key2 ?? '').trim().toLowerCase();
  if (k === 'production') return 'Production';
  if (k === 'collection') return 'Collection';
  return null;
}

/** Proposed convention (gap ADJ-3): the sign travels in `DefinitionRead.section` as `+` / `-`. */
export function normalizeAdjustmentSign(section: string | null | undefined): AdjustmentSign | null {
  const s = (section ?? '').trim();
  if (s === '+' || s.toLowerCase() === 'debit') return '+';
  if (s === '-' || s.toLowerCase() === 'credit') return '-';
  return null;
}

/**
 * Picker rows: legacy catalog overlaid by backend definitions (same `key1`),
 * plus backend-only definitions that carry BOTH a group (`key2`) and a sign
 * (`section`). Inactive rows are dropped.
 */
export function adjustmentCodeOptions(defs: DefinitionRead[]): AdjustmentCodeOption[] {
  const byCode = new Map<string, DefinitionRead>();
  for (const d of defs) byCode.set(d.key1.trim().toUpperCase(), d);

  const rows: AdjustmentCodeOption[] = LEGACY_ADJUSTMENT_CODES.map((legacy) => {
    const d = byCode.get(legacy.code.toUpperCase());
    if (!d) return { ...legacy, is_active: true };
    byCode.delete(legacy.code.toUpperCase());
    return {
      code: legacy.code,
      sign: normalizeAdjustmentSign(d.section) ?? legacy.sign,
      group: normalizeAdjustmentGroup(d.key2) ?? legacy.group,
      description: d.description || legacy.description,
      is_active: d.is_active,
    };
  });

  const extras: AdjustmentCodeOption[] = [];
  for (const d of byCode.values()) {
    const group = normalizeAdjustmentGroup(d.key2);
    const sign = normalizeAdjustmentSign(d.section);
    if (!group || !sign) continue;
    extras.push({ code: d.key1, sign, group, description: d.description, is_active: d.is_active });
  }
  extras.sort((a, b) => a.code.localeCompare(b.code));

  return [...rows, ...extras].filter((r) => r.is_active);
}

/** Grid / ledger label for a stored `adjustment_type` (backend description first, legacy catalog second, raw code last). */
export function adjustmentCodeLabel(defs: DefinitionRead[]): (code: string | null | undefined) => string {
  const m = new Map<string, string>();
  for (const l of LEGACY_ADJUSTMENT_CODES) m.set(l.code.toUpperCase(), l.description);
  for (const d of defs) m.set(d.key1.trim().toUpperCase(), d.description);
  return (code) => (code ? m.get(code.trim().toUpperCase()) || code : '');
}

/** Sign of a stored `adjustment_type` from the catalog (backend `section` first); null when unknown. */
export function adjustmentSignOf(code: string | null | undefined, defs: DefinitionRead[]): AdjustmentSign | null {
  if (!code) return null;
  const key = code.trim().toUpperCase();
  const d = defs.find((x) => x.key1.trim().toUpperCase() === key);
  const fromBackend = normalizeAdjustmentSign(d?.section);
  if (fromBackend) return fromBackend;
  return LEGACY_ADJUSTMENT_CODES.find((l) => l.code.toUpperCase() === key)?.sign ?? null;
}

/**
 * How a `+` (debit) adjustment is persisted today. `/patient-adjustments` rows
 * are always applied as a credit by the backend (ledger `credit = amount`), so a
 * balance-increasing adjustment is written as a `patient_payments` row with
 * `payment_type = 'adjustment'` and a POSITIVE amount — the one row type whose
 * stored sign the backend's `ledger_sign` module honours as a balance delta.
 * Gap ADJ-2 asks for a first-class signed adjustment instead.
 */
export const DEBIT_ADJUSTMENT_PAYMENT_TYPE = 'adjustment';

export function isDebitAdjustmentPayment(p: { payment_type?: string | null }): boolean {
  return (p.payment_type ?? '').trim().toLowerCase() === DEBIT_ADJUSTMENT_PAYMENT_TYPE;
}
