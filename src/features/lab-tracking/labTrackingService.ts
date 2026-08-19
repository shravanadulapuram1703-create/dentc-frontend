// Lab Tracking — data access (anti-corruption over the generated client).
//
// There is no /labs resource and no has_lab filter on /appointments, so the
// patient's lab cases are derived: page through the patient's appointments
// (size cap 200), keep has_lab, and resolve provider names from /providers
// (AppointmentRead has no denormalized names — see gap LAB-3). Check-in / save
// is a plain PATCH of the lab fields on the appointment. The lab-vendor list is
// a best-effort read of LAB-group definitions (display-only; gap LAB-1).

import {
  listAppointments,
  updateAppointment,
} from '@/api/generated/endpoints/appointments/appointments';
import { fetchProviderDirectory } from '@/services/providerDirectory';
import { listDefinitions } from '@/api/generated/endpoints/metadata/metadata';
import type { AppointmentUpdate } from '@/api/generated/model';
import { mapAppointmentToLabCase, type LabCase } from './labModel';

const PAGE = 200;

/** id -> "Last, First" provider name map (capped at 200; sufficient per office). */
async function resolveProviderNames(): Promise<Map<string, string>> {
  try {
    const rows = await fetchProviderDirectory();
    return new Map(rows.map((p) => [p.id, p.name]));
  } catch {
    return new Map();
  }
}

/** Every lab case (has_lab appointment) for one patient, newest first. */
export async function fetchPatientLabCases(patientId: number): Promise<LabCase[]> {
  const first = await listAppointments({
    patient_id: patientId,
    size: PAGE,
    sort: 'date',
    order: 'desc',
  });
  const items = [...(first.items ?? [])];
  const pages = first.meta?.pages ?? 1;
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) =>
        listAppointments({
          patient_id: patientId,
          size: PAGE,
          page: i + 2,
          sort: 'date',
          order: 'desc',
        }),
      ),
    );
    for (const r of rest) items.push(...(r.items ?? []));
  }

  const labAppts = items.filter((a) => a.has_lab);
  if (labAppts.length === 0) return [];

  const providerNames = await resolveProviderNames();
  return labAppts.map((a) =>
    mapAppointmentToLabCase(a, providerNames.get(String(a.provider_id)) ?? ''),
  );
}

/** PATCH the lab fields on an appointment (book lab info, edit, or check-in). */
export async function saveLabCase(
  appointmentId: string,
  body: AppointmentUpdate,
): Promise<void> {
  await updateAppointment(appointmentId, body);
}

/** Best-effort lab-vendor names from the shared definitions table (group_code
 *  "LAB"). Returns [] when none are seeded — the vendor input then falls back to
 *  free text. The selection cannot persist on the appointment (gap LAB-1). */
export async function loadLabVendors(): Promise<string[]> {
  try {
    const res = await listDefinitions({ group_code: 'LAB', is_active: true, size: PAGE });
    return (res.items ?? [])
      .map((d) => d.description)
      .filter((s): s is string => !!s)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}
