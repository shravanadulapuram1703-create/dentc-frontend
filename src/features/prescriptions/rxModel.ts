// Patient Prescriptions (M11) — view model, draft shape, and mappers.
//
// Maps the legacy Denticon "Prescriptions" screen onto the backend
// /api/v1/prescriptions resource (tag: Clinical). Field parity:
//   Rx ID → id, Rx Date → rx_date, Drug Name → drug_name (+ library_rx_id),
//   Dispense → dispense, SIG → sig, Refill → refills, Provider → provider_id,
//   Dispense As Written → is_as_written, Prescription Note → notes,
//   Rx Status (struck-off) → is_active, DoseSpot? → dosespot_rx_id/status.
//
// Backend gap (RX-P1): there is a single `notes` field, so the legacy
// "Internal Note" (which must NOT print) has nowhere to live. We wire
// "Prescription Note" → notes and gate Internal Note. See devreport.

import type {
  PrescriptionRead,
  PrescriptionCreate,
  PrescriptionLibraryRead,
} from '@/api/generated/model';

export { providerLabelResolver } from '@/features/treatment-plans/txModel';

/** A row as the legacy grid shows it. PrescriptionRead is already close. */
export type RxRow = PrescriptionRead;

/** Editable draft for the Add Prescription panel. */
export interface RxDraft {
  rx_date: string; // YYYY-MM-DD
  library_rx_id: number | null;
  drug_name: string;
  dispense: string;
  sig: string;
  refills: number;
  is_as_written: boolean;
  provider_id: string;
  /** Prints on the prescription. */
  notes: string;
  /** Legacy "Internal Note" — does not print. Backend gap RX-P1: not persisted. */
  internal_note: string;
}

/** Local YYYY-MM-DD for today (no timezone juggling — date-only field). */
export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Format a stored rx_date (ISO date or datetime) as legacy MM/DD/YYYY. */
export function fmtRxDate(value?: string | null): string {
  if (!value) return '';
  // Accept "YYYY-MM-DD" or full ISO; read the date part only to avoid TZ shifts.
  const datePart = value.slice(0, 10);
  const [y, m, d] = datePart.split('-');
  if (y && m && d) return `${m}/${d}/${y}`;
  return value;
}

/** True when the prescription was written today (drives Quick Print). */
export function isToday(value?: string | null): boolean {
  if (!value) return false;
  return value.slice(0, 10) === todayISO();
}

/** A fresh blank draft with today's date. */
export function blankDraft(): RxDraft {
  return {
    rx_date: todayISO(),
    library_rx_id: null,
    drug_name: '',
    dispense: '',
    sig: '',
    refills: 0,
    is_as_written: false,
    provider_id: '',
    notes: '',
    internal_note: '',
  };
}

/**
 * Apply a selected library drug onto a draft. Denticon copies the library's
 * default Dispense / Sig / Refill / As-Written, which remain editable.
 */
export function applyLibraryDrug(draft: RxDraft, lib: PrescriptionLibraryRead): RxDraft {
  return {
    ...draft,
    library_rx_id: lib.id,
    drug_name: lib.drug_name,
    dispense: lib.dispense ?? '',
    sig: lib.sig ?? '',
    refills: lib.refills ?? 0,
    is_as_written: lib.is_as_written ?? false,
  };
}

/** Build the POST body. `notes` carries the printable Prescription Note. */
export function toCreateBody(
  draft: RxDraft,
  patientId: number,
  officeId: number | null,
): PrescriptionCreate {
  return {
    patient_id: patientId,
    office_id: officeId,
    library_rx_id: draft.library_rx_id,
    rx_date: draft.rx_date || todayISO(),
    drug_name: draft.drug_name.trim(),
    dispense: draft.dispense.trim() || null,
    sig: draft.sig.trim() || null,
    refills: Number.isFinite(draft.refills) ? draft.refills : 0,
    is_as_written: draft.is_as_written,
    provider_id: draft.provider_id || null,
    notes: draft.notes.trim() || null,
    is_active: true,
  };
}

/** Sort rows newest first (by Rx ID), matching the legacy descending list. */
export function sortRows(rows: RxRow[]): RxRow[] {
  return [...rows].sort((a, b) => b.id - a.id);
}
