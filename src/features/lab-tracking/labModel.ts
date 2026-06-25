// Lab Tracking (legacy Denticon M12) — view-model + pure helpers.
//
// In Denticon, a "lab case" is just an APPOINTMENT that has lab work attached.
// The DentC backend mirrors this: AppointmentRead carries has_lab, lab_cost,
// lab_sent_on, lab_due_on, lab_received_on. There is NO dedicated lab resource,
// no lab-vendor field, and no lab filter on the list endpoint — so the case
// list is derived client-side by filtering this patient's appointments on
// has_lab, and the lab status is derived from the three dates. Backend gaps are
// documented in docs/lab-tracking/lab_tracking_backend_devreport.md.

import type { AppointmentRead, AppointmentUpdate } from '@/api/generated/model';

/** Lifecycle of a single lab case, derived from its three dates. */
export type LabStatus = 'not_sent' | 'sent' | 'overdue' | 'received';

/** The four legacy "Lab Report" review filters (M12 — Reviewing Lab Cases). */
export type LabFilter = 'all' | 'not_sent' | 'not_received' | 'received';

/** A lab case = one appointment with has_lab, enriched with the provider name. */
export interface LabCase {
  id: string; // appointment id
  patient_id: number | null;
  provider_id: string | null;
  provider_name: string;
  date: string; // appointment date (yyyy-mm-dd)
  start_time: string;
  procedure_label: string; // legacy "Description"
  lab_cost: number;
  lab_sent_on: string | null;
  lab_due_on: string | null;
  lab_received_on: string | null;
}

/** Editable lab fields for the Edit / Check-in panel. */
export interface LabDraft {
  has_lab: boolean;
  /** Lab vendor — display/session-only; backend has no field yet (gap LAB-1). */
  lab_vendor: string;
  /** Short-notice flag — display/session-only; no backend field (gap LAB-1). */
  short_notice: boolean;
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

// ---- status derivation ----

/**
 * Derive the lab lifecycle status from the three dates:
 *   received_on set         -> received
 *   sent_on set, due passed -> overdue   (sent but not back, past due)
 *   sent_on set             -> sent      (out at the lab)
 *   otherwise               -> not_sent
 */
export function deriveStatus(c: LabCase): LabStatus {
  if (c.lab_received_on) return 'received';
  if (c.lab_sent_on) {
    if (c.lab_due_on && toDateInput(c.lab_due_on) < todayIso()) return 'overdue';
    return 'sent';
  }
  return 'not_sent';
}

export const STATUS_META: Record<LabStatus, { label: string; cls: string }> = {
  not_sent: { label: 'Not Sent', cls: 'bg-slate-100 text-slate-700 ring-slate-300' },
  sent: { label: 'Sent', cls: 'bg-amber-100 text-amber-800 ring-amber-300' },
  overdue: { label: 'Overdue', cls: 'bg-red-100 text-red-700 ring-red-300' },
  received: { label: 'Received', cls: 'bg-green-100 text-green-700 ring-green-300' },
};

/** Match a case against a legacy review filter (M12 — Lab Report report types). */
export function matchesFilter(c: LabCase, f: LabFilter): boolean {
  const s = deriveStatus(c);
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

export function mapAppointmentToLabCase(a: AppointmentRead, providerName: string): LabCase {
  return {
    id: a.id,
    patient_id: a.patient_id ?? null,
    provider_id: a.provider_id != null ? String(a.provider_id) : null,
    provider_name: providerName || (a.provider_id != null ? String(a.provider_id) : ''),
    date: toDateInput(a.date),
    start_time: a.start_time,
    procedure_label: a.procedure_label ?? '',
    lab_cost: a.lab_cost != null ? Number(a.lab_cost) : 0,
    lab_sent_on: a.lab_sent_on ?? null,
    lab_due_on: a.lab_due_on ?? null,
    lab_received_on: a.lab_received_on ?? null,
  };
}

/** Build the editable draft for a case (or a blank draft for none). */
export function draftFromCase(c: LabCase | null): LabDraft {
  if (!c) {
    return {
      has_lab: true,
      lab_vendor: '',
      short_notice: false,
      lab_cost: '',
      lab_sent_on: '',
      lab_due_on: '',
      lab_received_on: '',
    };
  }
  return {
    has_lab: true,
    lab_vendor: '',
    short_notice: false,
    lab_cost: c.lab_cost ? String(c.lab_cost) : '',
    lab_sent_on: toDateInput(c.lab_sent_on),
    lab_due_on: toDateInput(c.lab_due_on),
    lab_received_on: toDateInput(c.lab_received_on),
  };
}

/** Map the draft to a PATCH body. Only the backend-supported lab fields are
 *  sent; vendor / short-notice have no column yet (gap LAB-1). */
export function toUpdateBody(draft: LabDraft): AppointmentUpdate {
  return {
    has_lab: draft.has_lab,
    lab_cost: draft.lab_cost.trim() === '' ? null : draft.lab_cost.trim(),
    lab_sent_on: draft.lab_sent_on || null,
    lab_due_on: draft.lab_due_on || null,
    lab_received_on: draft.lab_received_on || null,
  };
}

/** KPIs for the header strip. */
export function summarize(cases: LabCase[]) {
  let notReceived = 0;
  let overdue = 0;
  let totalCost = 0;
  for (const c of cases) {
    const s = deriveStatus(c);
    if (s === 'sent' || s === 'overdue') notReceived += 1;
    if (s === 'overdue') overdue += 1;
    totalCost += c.lab_cost;
  }
  return { total: cases.length, notReceived, overdue, totalCost };
}
