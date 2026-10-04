// "PT" — Pending Treatment: does the patient still have treatment-plan work left?
//
// Drives the PT badge on scheduler blocks (next to the medical-alert ✚) so the
// front desk can see at a glance that a patient has unfinished planned work.
//
// Pending = an item that `isPlanItemOpen` (the same rule the Treatment Plan page
// and Restorative Chart use): not archived, not posted to the ledger (no
// end_date), not referred out. `include_completed=false` lets the server drop
// completed rows up front. The scheduler feed carries no such flag yet
// (backend gap SCHED-PT-1), so this is a per-patient read for the day on screen.

import { listPatientTreatmentPlanItems } from '@/api/generated/endpoints/treatment-plans/treatment-plans';
import type { TreatmentPlanItemRead } from '@/api/generated/model';
import { isPlanItemOpen } from '@/features/procedures/procedureEntryService';
import { normalizeStatus, STATUS_LABEL } from './txModel';

export interface PendingTreatmentItem {
  procedure_code: string;
  tooth: string;
  surface: string;
  status_label: string;
  fee: number;
}

export interface PendingTreatmentSummary {
  count: number;
  /** How many of the pending items are already booked (status `scheduled`). */
  scheduled_count: number;
  total_fee: number;
  items: PendingTreatmentItem[];
}

const toNum = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};

export function summarizePendingTreatment(rows: readonly TreatmentPlanItemRead[]): PendingTreatmentSummary {
  const open = rows.filter(isPlanItemOpen).filter((it) => normalizeStatus(it.status) !== 'completed');
  const items = open.map((it) => ({
    procedure_code: it.procedure_code,
    tooth: it.tooth ?? '',
    surface: it.surface ?? '',
    status_label: STATUS_LABEL[normalizeStatus(it.status)],
    fee: toNum(it.fee),
  }));
  return {
    count: items.length,
    scheduled_count: open.filter((it) => normalizeStatus(it.status) === 'scheduled').length,
    total_fee: items.reduce((s, it) => s + it.fee, 0),
    items,
  };
}

/** Load the patient's pending treatment-plan items (all plans). */
export async function fetchPendingTreatment(patient_id: number): Promise<PendingTreatmentSummary> {
  const res = await listPatientTreatmentPlanItems(patient_id, { include_completed: false, size: 200 });
  return summarizePendingTreatment(res.items ?? []);
}

/** One-line tooltip: "3 pending: D2740 #3, D2950 #3, D1110 · $1,850.00". */
export function pendingTreatmentTitle(s: PendingTreatmentSummary): string {
  const list = s.items
    .slice(0, 8)
    .map((it) => [it.procedure_code, it.tooth && `#${it.tooth}`, it.surface].filter(Boolean).join(' '))
    .join(', ');
  const more = s.items.length > 8 ? `, +${s.items.length - 8} more` : '';
  const fee = s.total_fee > 0
    ? ` · $${s.total_fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '';
  const booked = s.scheduled_count > 0 ? ` (${s.scheduled_count} scheduled)` : '';
  return `Pending treatment — ${s.count} item${s.count === 1 ? '' : 's'}${booked}: ${list}${more}${fee}. Click to open the Treatment Plan.`;
}
