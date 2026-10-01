// Lab Tracking (legacy Denticon M12) — view-model + pure helpers.
//
// In Denticon, a "lab case" is just an APPOINTMENT that has lab work attached.
// The DentC backend mirrors this: the lab block lives on the appointment
// (has_lab, lab_vendor_id → labs catalog, lab_dds = the dentist, lab_cost,
// lab_short_notice, lab_sent_on / lab_due_on / lab_received_on) and the
// server derives `lab_status` (received → overdue → sent → not_sent).
// `GET /appointments/lab-cases` returns the denormalised, filtered case list;
// this module maps it to the grid and builds the PATCH body for edits.
// Server write rules (LAB-6..10): has_lab=false clears the block; cost must be
// >= 0 with two decimals; due/received cannot precede sent (422 lab_date_order).

import type { AppointmentUpdate, LabCaseRead, LabRead } from '@/api/generated/model';

/** Lifecycle of a single lab case (server-derived `lab_status`). */
export type LabStatus = 'not_sent' | 'sent' | 'overdue' | 'received';

/** The four legacy "Lab Report" review filters (M12 — Reviewing Lab Cases). */
export type LabFilter = 'all' | 'not_sent' | 'not_received' | 'received';

/** A lab case = one appointment with has_lab, as served by /lab-cases. */
export interface LabCase {
  id: string; // appointment id
  patient_id: number | null;
  patient_name: string;
  provider_id: string | null;
  provider_name: string;
  office_id: number;
  office_name: string;
  date: string; // appointment date (yyyy-mm-dd)
  start_time: string;
  procedure_label: string; // legacy "Description"
  lab_vendor_id: number | null;
  lab_vendor_name: string;
  lab_dds: string;
  lab_cost: number;
  lab_short_notice: boolean;
  lab_sent_on: string | null;
  lab_due_on: string | null;
  lab_received_on: string | null;
  lab_status: LabStatus;
  days_overdue: number | null;
  is_archived: boolean;
}

/** Editable lab fields for the Edit / Check-in panel. */
export interface LabDraft {
  has_lab: boolean;
  /** FK into the labs catalog ('' = none). */
  lab_vendor_id: string;
  /** The dentist the case is for (free text, <= 100 chars). */
  lab_dds: string;
  lab_short_notice: boolean;
  lab_cost: string; // currency text
  lab_sent_on: string; // '' | yyyy-mm-dd
  lab_due_on: string;
  lab_received_on: string;
}

// ---- date / money helpers ----

/** Today as yyyy-mm-dd in the local timezone (date-only comparisons). */
export function todayIso(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/** yyyy-mm-dd plus n days (date-only arithmetic). */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

/** Normalise any backend date ("2022-11-07", ISO datetime, …) to yyyy-mm-dd. */
export function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}

/** Human display for a date, "—" when empty. */
export function fmtDate(value: string | null | undefined): string {
  const iso = toDateInput(value);
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
}

/** Display a time string (HH:MM[:SS]) as 12-hour, "—" when empty. */
export function fmtTime(value: string | null | undefined): string {
  if (!value) return '—';
  const [hStr, mStr] = String(value).split(':');
  let h = Number(hStr);
  const m = mStr ?? '00';
  if (!Number.isFinite(h)) return String(value);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function money(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// ---- status ----

/**
 * Client-side fallback for the server's `lab_status` derivation (used only
 * when a row lacks it, e.g. a stale feed):
 *   received_on set         -> received
 *   sent_on set, due passed -> overdue
 *   sent_on set             -> sent
 *   otherwise               -> not_sent
 */
export function deriveStatus(c: {
  lab_sent_on?: string | null;
  lab_due_on?: string | null;
  lab_received_on?: string | null;
}): LabStatus {
  if (c.lab_received_on) return 'received';
  if (c.lab_sent_on) {
    if (c.lab_due_on && toDateInput(c.lab_due_on) < todayIso()) return 'overdue';
    return 'sent';
  }
  return 'not_sent';
}

export function statusOf(c: LabCase): LabStatus {
  return c.lab_status ?? deriveStatus(c);
}

export const STATUS_META: Record<LabStatus, { label: string; cls: string }> = {
  not_sent: { label: 'Not Sent', cls: 'bg-slate-100 text-slate-700 ring-slate-300' },
  sent: { label: 'Sent', cls: 'bg-amber-100 text-amber-800 ring-amber-300' },
  overdue: { label: 'Overdue', cls: 'bg-red-100 text-red-700 ring-red-300' },
  received: { label: 'Received', cls: 'bg-green-100 text-green-700 ring-green-300' },
};

/** Match a case against a legacy review filter (M12 — Lab Report report types). */
export function matchesFilter(c: LabCase, f: LabFilter): boolean {
  const s = statusOf(c);
  switch (f) {
    case 'all':
      return true;
    case 'not_sent':
      return s === 'not_sent';
    case 'not_received':
      return s === 'sent' || s === 'overdue'; // sent out, not yet back
    case 'received':
      return s === 'received';
    default:
      return true;
  }
}

/** Within an inclusive appointment-date range; empty bounds are open. */
export function inDateRange(c: LabCase, from: string, to: string): boolean {
  const d = toDateInput(c.date);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

// ---- mapping ----

export function mapLabCase(a: LabCaseRead): LabCase {
  return {
    id: a.id,
    patient_id: a.patient_id ?? null,
    patient_name: a.patient_name ?? '',
    provider_id: a.provider_id ?? null,
    provider_name: a.provider_name ?? (a.provider_id ?? ''),
    office_id: a.office_id,
    office_name: a.office_name ?? '',
    date: toDateInput(a.date),
    start_time: a.start_time,
    procedure_label: a.procedure_label ?? '',
    lab_vendor_id: a.lab_vendor_id ?? null,
    lab_vendor_name: a.lab_vendor_name ?? '',
    lab_dds: a.lab_dds ?? '',
    lab_cost: a.lab_cost != null ? Number(a.lab_cost) : 0,
    lab_short_notice: !!a.lab_short_notice,
    lab_sent_on: a.lab_sent_on ?? null,
    lab_due_on: a.lab_due_on ?? null,
    lab_received_on: a.lab_received_on ?? null,
    lab_status: (a.lab_status as LabStatus) ?? deriveStatus(a),
    days_overdue: a.days_overdue ?? null,
    is_archived: !!a.is_archived,
  };
}

/** Build the editable draft for a case (or a blank draft for none). */
export function draftFromCase(c: LabCase | null): LabDraft {
  if (!c) {
    return {
      has_lab: true,
      lab_vendor_id: '',
      lab_dds: '',
      lab_short_notice: false,
      lab_cost: '',
      lab_sent_on: '',
      lab_due_on: '',
      lab_received_on: '',
    };
  }
  return {
    has_lab: true,
    lab_vendor_id: c.lab_vendor_id != null ? String(c.lab_vendor_id) : '',
    lab_dds: c.lab_dds,
    lab_short_notice: c.lab_short_notice,
    lab_cost: c.lab_cost ? String(c.lab_cost) : '',
    lab_sent_on: toDateInput(c.lab_sent_on),
    lab_due_on: toDateInput(c.lab_due_on),
    lab_received_on: toDateInput(c.lab_received_on),
  };
}

/** Money text → two-decimal string the backend accepts (LAB-7: no rounding
 *  server-side, `ge=0`, `decimal_places=2`), or null when blank. */
export function toCostBody(text: string): string | null {
  const t = text.trim().replace(/[$,]/g, '');
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n * 100) / 100).toFixed(2);
}

/** Map the draft to a PATCH body (all lab columns are real now). */
export function toUpdateBody(draft: LabDraft): AppointmentUpdate {
  return {
    has_lab: draft.has_lab,
    lab_vendor_id: draft.lab_vendor_id ? Number(draft.lab_vendor_id) : null,
    lab_dds: draft.lab_dds.trim() || null,
    lab_short_notice: draft.lab_short_notice,
    lab_cost: toCostBody(draft.lab_cost),
    lab_sent_on: draft.lab_sent_on || null,
    lab_due_on: draft.lab_due_on || null,
    lab_received_on: draft.lab_received_on || null,
  };
}

/** Client-side echo of the server's LAB-9 date-order rule so the user gets
 *  an inline message instead of a 422 round-trip. */
export function dateOrderError(draft: LabDraft): string | null {
  if (draft.lab_sent_on && draft.lab_due_on && draft.lab_due_on < draft.lab_sent_on) {
    return 'Due on cannot be earlier than Sent on.';
  }
  if (draft.lab_sent_on && draft.lab_received_on && draft.lab_received_on < draft.lab_sent_on) {
    return 'Recvd. on cannot be earlier than Sent on.';
  }
  return null;
}

/** "Name (CODE)" label for a lab vendor. */
export function labVendorLabel(l: Pick<LabRead, 'name' | 'code'>): string {
  return l.code ? `${l.name} (${l.code})` : l.name;
}

/** KPIs for the header strip. */
export function summarize(cases: LabCase[]) {
  let notReceived = 0;
  let overdue = 0;
  let totalCost = 0;
  for (const c of cases) {
    const s = statusOf(c);
    if (s === 'sent' || s === 'overdue') notReceived += 1;
    if (s === 'overdue') overdue += 1;
    totalCost += c.lab_cost;
  }
  return { total: cases.length, notReceived, overdue, totalCost };
}
