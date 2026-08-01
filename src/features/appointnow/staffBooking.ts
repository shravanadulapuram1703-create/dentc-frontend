// staffBooking — turns an approved AppointNow request into a REAL scheduler
// appointment, using the authenticated generated client. This is the piece that
// makes "approve → the slot gets booked in the scheduler" actually happen: the
// public intake is simulated, but approval books live.
//
// Resolution order (all authed calls):
//   office     — match the request's office_code against /offices; fall back to
//                the staff's currently-selected office.
//   provider   — the slot's preferred provider if it resolves in that office;
//                else the first AppointNow-visible active provider; else any
//                active provider.
//   operatory  — an operatory tied to the chosen provider; else the first active
//                operatory in the office.
//
// The external patient is not yet a PMS patient, so the appointment is booked
// with patient_id = null and the contact details carried in the label/notes for
// staff to attach to a patient record later (see AN-5 in the devreport).

import {
  listOffices,
  listProviders,
  listOperatories,
} from "@/api/generated/endpoints/organization/organization";
import { createAppointment } from "@/services/schedulerApi";
import type { BookingRequest } from "./transport/types";

const PAGE = { size: 200 } as const;

export interface BookedResult {
  appointment_id: string;
  office_id: number;
  provider_id: string;
  operatory_id: string;
}

/**
 * Book an approved request into the scheduler. Throws a descriptive Error when
 * the office / provider / operatory can't be resolved so the caller keeps the
 * request pending and surfaces the reason.
 */
export async function bookRequestIntoScheduler(
  request: BookingRequest,
  fallbackOfficeId?: number | null,
): Promise<BookedResult> {
  // 1. Resolve the office by code (fall back to the selected office).
  const officesRes = await listOffices(PAGE).catch(() => null);
  const offices = officesRes?.items ?? [];
  const office =
    offices.find(
      (o) => o.office_code?.toUpperCase() === request.office_code.toUpperCase(),
    ) ??
    (fallbackOfficeId != null
      ? offices.find((o) => o.id === fallbackOfficeId)
      : undefined);
  const officeId = office?.id ?? fallbackOfficeId ?? null;
  if (officeId == null) {
    throw new Error(
      `Could not match office "${request.office_code}". Select the office in the top bar and try again.`,
    );
  }

  // 2. Providers + operatories for that office.
  const [providersRes, operatoriesRes] = await Promise.all([
    listProviders(PAGE).catch(() => null),
    listOperatories({ ...PAGE, office_id: officeId }).catch(() => null),
  ]);
  const providers = (providersRes?.items ?? []).filter(
    (p) => p.office_id === officeId && p.is_active,
  );
  const operatories = (operatoriesRes?.items ?? []).filter(
    (o) => o.office_id === officeId && o.is_active,
  );

  if (providers.length === 0) {
    throw new Error(`No active providers found for office "${request.office_code}".`);
  }
  if (operatories.length === 0) {
    throw new Error(`No active operatories found for office "${request.office_code}".`);
  }

  // 3. Pick a provider: preferred → AppointNow-visible → any active.
  const preferred = request.slot.provider_id
    ? providers.find((p) => p.id === request.slot.provider_id)
    : undefined;
  const provider =
    preferred ?? providers.find((p) => p.visible_in_appointnow) ?? providers[0];
  if (!provider) {
    throw new Error(`No active providers found for office "${request.office_code}".`);
  }

  // 4. Pick an operatory tied to the provider, else the first.
  const operatory =
    operatories.find((o) => o.provider_id === provider.id) ?? operatories[0];
  if (!operatory) {
    throw new Error(`No active operatories found for office "${request.office_code}".`);
  }

  // 5. Book it. patient_id stays null (external, not yet a PMS patient).
  const { contact, slot, reason_label } = request;
  const patientName = `${contact.first_name} ${contact.last_name}`.trim();
  const label = `${reason_label} — ${patientName}`;
  const notes = [
    "Booked via AppointNow (online request).",
    `Patient: ${patientName}`,
    contact.phone ? `Phone: ${contact.phone}` : null,
    contact.email ? `Email: ${contact.email}` : null,
    contact.date_of_birth ? `DOB: ${contact.date_of_birth}` : null,
    contact.is_new_patient ? "New patient" : "Existing patient",
    contact.notes ? `Notes: ${contact.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const created = await createAppointment({
    patient_id: null,
    provider_id: provider.id,
    operatory_id: operatory.id,
    office_id: officeId,
    date: slot.date,
    start_time: slot.start_time,
    end_time: slot.end_time,
    duration: slot.duration_minutes,
    status: "Scheduled",
    procedure_type: label,
    notes,
  });

  return {
    appointment_id: created.id,
    office_id: officeId,
    provider_id: provider.id,
    operatory_id: operatory.id,
  };
}
