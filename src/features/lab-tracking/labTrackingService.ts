// Lab Tracking — data access (anti-corruption over the generated client).
//
// `GET /appointments/lab-cases` is the server-side lab view (LAB-2/5): every
// has_lab appointment, denormalised (patient / provider / office / vendor
// names, `lab_status`, `days_overdue`), archived rows excluded by default.
// Save / check-in is a PATCH of the lab block on the appointment; removing a
// case is `{has_lab:false}` alone — the server clears the rest (LAB-8).
// The vendor list is the `labs` catalog (`GET /labs`), never definitions.
// Reports come from the server (LAB-4) with the jsPDF builders as fallback.

import {
  listLabCases,
  updateAppointment,
  listLabs,
  printLabReport as printLabReportApi,
  printLabCostReport as printLabCostReportApi,
  exportLabCasesCsv,
} from '@/api/generated/endpoints/appointments/appointments';
import type {
  AppointmentUpdate,
  LabRead,
  ListLabCasesParams,
  PrintLabReportParams,
  PrintLabCostReportParams,
  ExportLabCasesCsvParams,
} from '@/api/generated/model';
import { mapLabCase, type LabCase } from './labModel';

const PAGE = 200;

export interface LabCaseListResult {
  cases: LabCase[];
  counts: { all: number; not_sent: number; sent: number; overdue: number; received: number; not_received: number };
  total_cost: number;
  as_of: string;
}

/** Every lab case for one patient (server-filtered, paged past the 200 cap). */
export async function fetchPatientLabCases(patientId: number): Promise<LabCaseListResult> {
  const base: ListLabCasesParams = {
    patient_id: patientId,
    include_archived: false,
    size: PAGE,
    sort: 'date',
    order: 'desc',
  };
  const first = await listLabCases({ ...base, page: 1 });
  const items = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => listLabCases({ ...base, page: i + 2 })),
    );
    for (const r of rest) items.push(...(r.items ?? []));
  }
  const c = first.counts ?? {};
  return {
    cases: items.map(mapLabCase),
    counts: {
      all: c.all ?? items.length,
      not_sent: c.not_sent ?? 0,
      sent: c.sent ?? 0,
      overdue: c.overdue ?? 0,
      received: c.received ?? 0,
      not_received: c.not_received ?? 0,
    },
    total_cost: first.total_cost != null ? Number(first.total_cost) : 0,
    as_of: first.as_of,
  };
}

/** PATCH the lab block on an appointment (book lab info, edit, or check-in). */
export async function saveLabCase(appointmentId: string, body: AppointmentUpdate): Promise<void> {
  await updateAppointment(appointmentId, body);
}

/** Drop the case from lab tracking: the server nulls the whole lab block. */
export async function removeLabCase(appointmentId: string): Promise<void> {
  await updateAppointment(appointmentId, { has_lab: false });
}

/** Active lab vendors from the catalog, name-sorted. Pass `includeIds` to
 *  keep since-retired vendors that are still attached to cases selectable
 *  (the server only refuses *moving* a case onto an inactive lab). */
export async function loadLabVendors(includeIds: number[] = []): Promise<LabRead[]> {
  const active = await listLabs({ is_active: true, size: PAGE, sort: 'name', order: 'asc' });
  const rows = [...(active.items ?? [])];
  const have = new Set(rows.map((l) => l.id));
  const missing = includeIds.filter((id) => !have.has(id));
  if (missing.length > 0) {
    try {
      const extra = await listLabs({ ids: missing.join(','), size: PAGE });
      for (const l of extra.items ?? []) if (!have.has(l.id)) rows.push(l);
    } catch {
      /* retired vendors simply show by id */
    }
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

// ---- server reports (LAB-4) ----

export function fetchLabReportPdf(params: PrintLabReportParams): Promise<Blob> {
  return printLabReportApi(params);
}

export function fetchLabCostReportPdf(params: PrintLabCostReportParams): Promise<Blob> {
  return printLabCostReportApi(params);
}

/** CSV export of the case grid (text/csv). The generated client types the
 *  body as unknown; ask axios for a blob so the bytes are untouched. */
export async function fetchLabCasesCsv(params: ExportLabCasesCsvParams): Promise<Blob> {
  const data = await exportLabCasesCsv(params, { responseType: 'blob' });
  if (data instanceof Blob) return data;
  return new Blob([typeof data === 'string' ? data : JSON.stringify(data)], { type: 'text/csv' });
}

/** Trigger a browser download for a blob. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
