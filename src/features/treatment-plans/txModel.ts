// Non-graphical Treatment Plan — domain model.
//
// Legacy Denticon (module M08) shows a patient's planned procedures as a flat
// grid grouped by three integer IDs and a status. This file owns the pure
// mapping between that legacy mental model and the DentC backend resources:
//
//   Legacy            Backend
//   ----------------  -------------------------------------------------------
//   Tx Plan ID (TID)  one `TreatmentPlan` record per TID (name = "Treatment Plan N")
//   Order ID          item `priority`
//   Phase ID          item `billing_order` (STOPGAP — no backend phase_id; see PLAN-1)
//   Status            item `status`  (diagnosed / accepted / …)
//   Provider          item `diagnosed_by`
//   Fee / Est Ins     item `fee` / `insurance_estimate`;  Est Pat = fee − ins
//
// No camelCase aliases: view-model fields mirror the snake_case backend names.

import type { TreatmentPlanRead, TreatmentPlanItemRead, ProviderRead } from '@/api/generated/model';

// ---- IDs ------------------------------------------------------------------

export function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

// ---- Status ---------------------------------------------------------------

export type TxStatus = 'diagnosed' | 'accepted' | 'unaccepted' | 'hold' | 'alternative' | 'referred_out';

export const STATUS_ORDER: TxStatus[] = ['diagnosed', 'accepted', 'unaccepted', 'hold', 'alternative', 'referred_out'];

export const STATUS_LABEL: Record<TxStatus, string> = {
  diagnosed: 'Diagnosed',
  accepted: 'Accepted',
  unaccepted: 'Unaccepted',
  hold: 'Hold',
  alternative: 'Alternative',
  referred_out: 'Referred Out',
};

/** Short code shown in the grid "St" column (matches legacy single/double letters). */
export const STATUS_ABBR: Record<TxStatus, string> = {
  diagnosed: 'D',
  accepted: 'A',
  unaccepted: 'U',
  hold: 'H',
  alternative: 'Alt',
  referred_out: 'RO',
};

export const STATUS_COLOR: Record<TxStatus, string> = {
  diagnosed: '#1d4ed8', // blue
  accepted: '#15803d', // green
  unaccepted: '#b45309', // amber
  hold: '#6b7280', // gray
  alternative: '#7c3aed', // violet
  referred_out: '#dc2626', // red
};

/** A "completed" procedure (PatientProcedure) shows alongside plan items in some filters. */
export function normalizeStatus(raw: string | null | undefined): TxStatus {
  const s = (raw ?? '').trim().toLowerCase();
  if (s === 'a' || s === 'accepted') return 'accepted';
  if (s === 'u' || s === 'unaccepted') return 'unaccepted';
  if (s === 'h' || s === 'hold') return 'hold';
  if (s === 'alt' || s === 'alternative') return 'alternative';
  if (s === 'ro' || s === 'referred_out' || s === 'referred out') return 'referred_out';
  // 'd', 'diagnosed', 'planned', and unknowns default to Diagnosed (legacy default).
  return 'diagnosed';
}

// ---- Phase ID (stopgap in billing_order — see PLAN-1) ---------------------

export function decodePhase(billing_order: string | null | undefined): number {
  const n = parseInt((billing_order ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function encodePhase(phase: number): string {
  return String(phase > 0 ? phase : 1);
}

// ---- Tx Plan ID (derived from plan name) ----------------------------------

export function planTid(plan: Pick<TreatmentPlanRead, 'name'>): number | null {
  const m = /(\d+)\s*$/.exec(plan.name ?? '');
  return m ? Number(m[1]) : null;
}

export function planNameForTid(tid: number): string {
  return `Treatment Plan ${tid}`;
}

/**
 * Resolve every patient plan to a stable, small TID (1, 2, 3 …) by creation
 * order. Legacy-seeded plan names embed the legacy plan id (e.g. "Treatment Plan
 * 10003652"), so we deliberately ignore the trailing number for display and
 * assign sequential ordinals — matching the small integers the legacy grid shows.
 */
export function assignTids(plans: TreatmentPlanRead[]): Map<string, number> {
  const sorted = [...plans].sort(
    (a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id),
  );
  const out = new Map<string, number>();
  sorted.forEach((p, i) => out.set(p.id, i + 1));
  return out;
}

// ---- Estimates ------------------------------------------------------------

export function num(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export function money(v: string | number | null | undefined): string {
  return num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function estPat(fee: string | number | null | undefined, ins: string | number | null | undefined): number {
  return Math.max(0, Math.round((num(fee) - num(ins)) * 100) / 100);
}

// ---- Provider resolution --------------------------------------------------

export function providerLabelResolver(providers: ProviderRead[]): (id: string | null | undefined) => string {
  const byId = new Map<string, ProviderRead>();
  for (const p of providers) byId.set(p.id, p);
  return (id) => {
    if (!id) return '';
    const p = byId.get(id);
    if (!p) return id;
    return p.short_id || p.name || id;
  };
}

// ---- Procedure category buttons (legacy 12-button grid) -------------------
// Categorized by ADA code range — robust regardless of backend `category` text.

export interface ProcCategory {
  key: string;
  label: string;
  /** [lo, hi] inclusive numeric ADA range (digits after the leading "D"). */
  range: [number, number];
}

export const PROC_CATEGORIES: ProcCategory[] = [
  { key: 'diagnostic', label: 'Diagnostic', range: [100, 999] },
  { key: 'preventive', label: 'Preventive', range: [1000, 1999] },
  { key: 'restorative', label: 'Restorative', range: [2000, 2999] },
  { key: 'endodontics', label: 'Endodontics', range: [3000, 3999] },
  { key: 'periodontics', label: 'Periodontics', range: [4000, 4999] },
  { key: 'prosth_removable', label: 'Prosth. removr', range: [5000, 5899] },
  { key: 'maxillo_prosth', label: 'Maxillo Prosth', range: [5900, 5999] },
  { key: 'implant_serv', label: 'Implant Serv', range: [6000, 6199] },
  { key: 'prosth_fixed', label: 'Prosth. fixed', range: [6200, 6999] },
  { key: 'oral_surgery', label: 'Oral Surgery', range: [7000, 7999] },
  { key: 'orthodontics', label: 'Orthodontics', range: [8000, 8999] },
  { key: 'adjunct_serv', label: 'Adjunct Serv', range: [9000, 9999] },
];

/** Numeric portion of an ADA code ("D2391" -> 2391); null if not parseable. */
export function adaNum(code: string): number | null {
  const m = /^[A-Za-z]?0*(\d+)/.exec(code.trim());
  return m ? Number(m[1]) : null;
}

export function codeInCategory(code: string, cat: ProcCategory): boolean {
  const n = adaNum(code);
  return n != null && n >= cat.range[0] && n <= cat.range[1];
}

// ---- Grid view-model ------------------------------------------------------

export interface TxRow {
  /** Underlying treatment_plan_item id. */
  id: string;
  plan_id: string;
  tid: number;
  phase: number;
  order: number;
  status: TxStatus;
  diag_date: string; // created_at (no backend diagnosed_date — see PLAN-2)
  code: string;
  description: string;
  tooth: string;
  surface: string;
  provider_id: string;
  provider_label: string;
  fee: number;
  est_ins: number;
  est_pat: number;
}

export function buildRows(
  items: TreatmentPlanItemRead[],
  tidByPlan: Map<string, number>,
  providerLabel: (id: string | null | undefined) => string,
  codeDesc: (code: string) => string,
): TxRow[] {
  const rows = items.map((it) => {
    const fee = num(it.fee);
    const est_ins = num(it.insurance_estimate);
    // phase_data_migration: the item now has real `phase_id` / `provider_id` /
    // `diagnosed_date` columns. Prefer them, falling back to the legacy stopgaps
    // (billing_order / diagnosed_by / created_at) for rows not yet migrated.
    const prov = it.provider_id ?? it.diagnosed_by ?? '';
    return {
      id: it.id,
      plan_id: it.plan_id,
      tid: tidByPlan.get(it.plan_id) ?? 1,
      phase: it.phase_id ?? decodePhase(it.billing_order),
      order: it.priority ?? 1,
      status: normalizeStatus(it.status),
      diag_date: it.diagnosed_date ?? it.created_at ?? '',
      code: it.procedure_code,
      description: it.description || codeDesc(it.procedure_code) || '',
      tooth: it.tooth ?? '',
      surface: it.surface ?? '',
      provider_id: prov,
      provider_label: providerLabel(prov),
      fee,
      est_ins,
      est_pat: estPat(fee, est_ins),
    } satisfies TxRow;
  });
  // Legacy sort: Tx Plan ID, then Phase ID, then Order ID.
  rows.sort((a, b) => a.tid - b.tid || a.phase - b.phase || a.order - b.order || a.code.localeCompare(b.code));
  return rows;
}
