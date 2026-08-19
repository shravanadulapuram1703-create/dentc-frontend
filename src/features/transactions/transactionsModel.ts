// Transactions Entry (legacy "Transactions Entry" screen, module M03) — domain model.
//
// The legacy screen lets a front-desk user post three kinds of transactions for a
// patient on a chosen Transaction Date: procedures (charges), payments, and
// adjustments. The top grid shows everything posted for that date. This file owns
// the pure mapping between the legacy mental model and the DentC backend.
//
//   Legacy column / concept   Backend source (snake_case — bound directly, no aliases)
//   ------------------------   ----------------------------------------------------------
//   Procedure row             PatientProcedureRead (charge)
//   Payment row               PatientPaymentRead   (credit)
//   Adjustment row            PatientAdjustmentRead (credit/debit)
//   Code                      procedure_code / payment_method / adjustment_type
//   Th / Surf                 tooth / surface
//   Est Pat / Est Ins         patient_estimate / insurance_estimate
//   Amount                    fee (procedure) | amount (payment/adjustment)
//   A (apply-to)              apply_to
//   Bill                      billing_status

import type {
  PatientProcedureRead,
  PatientPaymentRead,
  PatientAdjustmentRead,
  ProviderRead,
} from '@/api/generated/model';

// ---- Shared styling (mirrors the Restorative Chart palette) ---------------
// Blue header gradient + accents reused across this module's bars/grids so the
// Transactions Entry screen reads consistently with the Restorative tab.
export const HEADER_GRADIENT = 'linear-gradient(180deg,#2566a8,#16406e)';
export const ACCENT_BLUE = '#2566a8';
export const ACCENT_BLUE_DARK = '#1d4ed8';
export const ACTION_TEAL = '#0d9488';
export const ACTION_TEAL_DARK = '#0f766e';

// ---- IDs ------------------------------------------------------------------

export function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// ---- Money / numbers ------------------------------------------------------

export function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export function money(v: string | number | null | undefined): string {
  return num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function estPat(
  fee: string | number | null | undefined,
  ins: string | number | null | undefined,
): number {
  return Math.max(0, Math.round((num(fee) - num(ins)) * 100) / 100);
}

// ---- Dates ----------------------------------------------------------------

/** MM/DD/YYYY (or any parseable string) -> YYYY-MM-DD for the API. */
export function toIsoDate(s: string): string {
  const parts = s.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    if (m && d && y) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? todayIso() : dt.toISOString().slice(0, 10);
}

/** YYYY-MM-DD (or ISO) -> MM/DD/YYYY for display. Date-only strings are formatted
 * from their parts to avoid the UTC-midnight off-by-one that `new Date('YYYY-MM-DD')`
 * produces in negative-offset timezones. */
export function fmtDate(s: string | null | undefined): string {
  if (!s) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return s;
  return dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

export function todayDisplay(): string {
  return new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---- Provider resolution --------------------------------------------------

export function providerLabelResolver(
  providers: { id: string; name: string }[],
): (id: string | null | undefined) => string {
  const byId = new Map<string, string>();
  for (const p of providers) byId.set(p.id, p.name);
  return (id) => (id ? byId.get(id) || id : '');
}

export function providerShortResolver(
  providers: ProviderRead[],
): (id: string | null | undefined) => string {
  const byId = new Map<string, ProviderRead>();
  for (const p of providers) byId.set(p.id, p);
  return (id) => {
    if (!id) return '';
    const p = byId.get(id);
    return p?.short_id || p?.name || id;
  };
}

// ---- Procedure category buttons (legacy 14-button grid) -------------------
// First 12 are ADA code ranges (robust regardless of backend `category` text);
// OTHER catches anything outside the ranges; ALL_MEDICAL is a medical-code filter
// (backend currently seeds no medical CPT codes — see CHG-3 gap).

export interface ProcCategory {
  key: string;
  label: string;
  /** [lo, hi] inclusive numeric ADA range (digits after the leading "D"); null for special buckets. */
  range: [number, number] | null;
}

export const PROC_CATEGORIES: ProcCategory[] = [
  { key: 'diagnostic', label: 'Diagnostic', range: [100, 999] },
  { key: 'preventive', label: 'Preventive', range: [1000, 1999] },
  { key: 'restorative', label: 'Restorative', range: [2000, 2999] },
  { key: 'endodontics', label: 'Endodontics', range: [3000, 3999] },
  { key: 'periodontics', label: 'Periodontics', range: [4000, 4999] },
  { key: 'prosth_removable', label: 'Prosth, Remov', range: [5000, 5899] },
  { key: 'maxillo_prosth', label: 'Maxillo Prosth', range: [5900, 5999] },
  { key: 'implant_serv', label: 'Implant Serv', range: [6000, 6199] },
  { key: 'prosth_fixed', label: 'Prosth, Fixed', range: [6200, 6999] },
  { key: 'oral_surgery', label: 'Oral Surgery', range: [7000, 7999] },
  { key: 'orthodontics', label: 'Orthodontics', range: [8000, 8999] },
  { key: 'adjunct_serv', label: 'Adjunct Serv', range: [9000, 9999] },
  { key: 'other', label: 'Other', range: null },
  { key: 'all_medical', label: 'All Medical', range: null },
];

/** Numeric portion of an ADA code ("D2391" -> 2391); null if not parseable. */
export function adaNum(code: string): number | null {
  const m = /^[A-Za-z]?0*(\d+)/.exec(code.trim());
  return m ? Number(m[1]) : null;
}

export function codeInCategory(code: string, cat: ProcCategory): boolean {
  if (cat.key === 'all_medical') {
    // Medical/CPT codes are numeric-only (no leading "D"); ADA dental codes carry a letter.
    return !/^[A-Za-z]/.test(code.trim());
  }
  const n = adaNum(code);
  if (n == null) return false;
  if (cat.range == null) {
    // "Other" = inside no defined ADA range.
    return !PROC_CATEGORIES.some(
      (c) => c.range != null && n >= c.range[0] && n <= c.range[1],
    );
  }
  return n >= cat.range[0] && n <= cat.range[1];
}

// ---- Transaction grid view-model ------------------------------------------

export type EntryKind = 'procedure' | 'payment' | 'adjustment';

export interface EntryRow {
  id: string;
  kind: EntryKind;
  pm: boolean; // payment/credit marker (legacy "Pm" column)
  date: string; // display MM/DD/YYYY
  patient: string;
  office: string;
  apply_to: string; // "A" column
  code: string;
  tooth: string;
  surface: string;
  description: string;
  bill: string; // billing_status
  provider: string;
  est_pat: number;
  est_ins: number;
  amount: number; // charge positive, credit negative
}

export function procedureRow(
  p: PatientProcedureRead,
  patientName: string,
  providerLabel: (id: string | null | undefined) => string,
  codeDesc: (code: string) => string,
): EntryRow {
  const fee = num(p.fee);
  const ins = num(p.insurance_estimate);
  return {
    id: p.id,
    kind: 'procedure',
    pm: false,
    date: fmtDate(p.date_of_service),
    patient: patientName,
    office: p.office_id != null ? String(p.office_id) : '',
    apply_to: p.apply_to ?? '',
    code: p.procedure_code,
    tooth: p.tooth ?? '',
    surface: p.surface ?? '',
    description: codeDesc(p.procedure_code) || p.procedure_code,
    bill: p.billing_status ?? '',
    provider: providerLabel(p.provider_id),
    est_pat: num(p.patient_estimate),
    est_ins: ins,
    amount: fee,
  };
}

export function paymentRow(
  p: PatientPaymentRead,
  patientName: string,
  codeLabel: (code: string | null | undefined) => string,
  providerLabel: (id: string | null | undefined) => string,
): EntryRow {
  return {
    id: p.id,
    kind: 'payment',
    pm: true,
    date: fmtDate(p.payment_date),
    patient: patientName,
    office: '',
    apply_to: p.payment_type ?? '',
    code: p.payment_method ?? '',
    tooth: '',
    surface: '',
    description: codeLabel(p.payment_method) || 'Payment',
    bill: '',
    provider: p.provider_name || providerLabel(p.provider_id),
    est_pat: 0,
    est_ins: 0,
    amount: -num(p.amount),
  };
}

export function adjustmentRow(
  a: PatientAdjustmentRead,
  patientName: string,
  codeLabel: (code: string | null | undefined) => string,
  providerLabel: (id: string | null | undefined) => string,
): EntryRow {
  return {
    id: String(a.id),
    kind: 'adjustment',
    pm: true,
    date: fmtDate(a.adjustment_date),
    patient: patientName,
    office: '',
    apply_to: '',
    code: a.adjustment_type ?? '',
    tooth: '',
    surface: '',
    description: codeLabel(a.adjustment_type) || 'Adjustment',
    bill: '',
    provider: providerLabel(a.provider_id),
    est_pat: 0,
    est_ins: 0,
    amount: -num(a.amount),
  };
}
