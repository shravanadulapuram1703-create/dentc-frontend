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
import {
  createAppointment,
  fetchAppointments,
  type Appointment,
} from "@/services/schedulerApi";
import type { AvailableSlot, BookingRequest } from "./transport/types";

const PAGE = { size: 200 } as const;

/** Resolved scheduler targets for a request (office → provider → operatories). */
export interface BookingTargets {
  office_id: number;
  provider_id: string;
  provider_name: string;
  /** Active operatories in the office, preferred (provider-tied) first. */
  operatory_ids: string[];
}

/** One existing appointment that overlaps the requested slot. */
export interface SlotConflict {
  appointment_id: string;
  patient_name: string;
  provider_name: string;
  operatory_name: string;
  start_time: string;
  end_time: string;
  procedure_label: string;
  /** Why it blocks: same provider is busy, or every operatory is taken. */
  kind: "provider" | "operatory";
}

/**
 * Thrown by approve / reschedule when the slot overlaps existing scheduler
 * appointments. Carries the conflicts so the UI can show them in the red alert.
 */
export class SlotConflictError extends Error {
  readonly conflicts: SlotConflict[];
  readonly slot: AvailableSlot;
  constructor(slot: AvailableSlot, conflicts: SlotConflict[]) {
    const when = `${slot.date} ${slot.start_time}–${slot.end_time}`;
    super(
      `${conflicts.length} existing appointment${conflicts.length === 1 ? "" : "s"} already booked at ${when}.`,
    );
    this.name = "SlotConflictError";
    this.slot = slot;
    this.conflicts = conflicts;
  }
}

const toMinutes = (hhmm: string): number => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Half-open interval overlap on HH:MM strings. */
export const timesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean =>
  toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);

const toConflict = (a: Appointment, kind: SlotConflict["kind"]): SlotConflict => ({
  appointment_id: a.id,
  patient_name: a.patient_name || (a.is_blocked ? "Blocked time" : "Unnamed"),
  provider_name: a.provider_name,
  operatory_name: a.operatory_name,
  start_time: a.start_time,
  end_time: a.end_time,
  procedure_label: a.procedure_label,
  kind,
});

export interface BookedResult {
  appointment_id: string;
  office_id: number;
  provider_id: string;
  operatory_id: string;
}

/**
 * Resolve the scheduler targets (office / provider / operatories) a request
 * would be booked against. Throws a descriptive Error when something can't be
 * resolved so the caller keeps the request pending and surfaces the reason.
 */
export async function resolveBookingTargets(
  request: BookingRequest,
  fallbackOfficeId?: number | null,
): Promise<BookingTargets> {
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

  // 4. Operatories tied to the provider first, then the rest of the office.
  const tied = operatories.filter((o) => o.provider_id === provider.id);
  const others = operatories.filter((o) => o.provider_id !== provider.id);
  return {
    office_id: officeId,
    provider_id: provider.id,
    provider_name: provider.name,
    operatory_ids: [...tied, ...others].map((o) => o.id),
  };
}

/**
 * Double-booking check against the REAL scheduler for one slot. Returns the
 * operatory to book into when the slot is free, or the list of conflicting
 * appointments when it is not. Rules:
 *   - the chosen provider must not have any overlapping (non-cancelled)
 *     appointment — a provider can only be in one chair;
 *   - the first operatory (preferred first) with no overlapping appointment is
 *     used; if every operatory is taken the slot is a conflict.
 */
export async function findSlotConflicts(
  targets: BookingTargets,
  slot: AvailableSlot,
): Promise<{ operatory_id: string | null; conflicts: SlotConflict[] }> {
  const existing = (await fetchAppointments(slot.date, slot.date, String(targets.office_id)))
    .filter(
      (a) =>
        a.date === slot.date &&
        !a.cancelled &&
        timesOverlap(slot.start_time, slot.end_time, a.start_time, a.end_time),
    );

  const providerBusy = existing.filter((a) => a.provider_id === targets.provider_id);
  const freeOperatory =
    targets.operatory_ids.find((oid) => !existing.some((a) => a.operatory_id === oid)) ?? null;

  const conflicts: SlotConflict[] = [];
  if (providerBusy.length > 0) conflicts.push(...providerBusy.map((a) => toConflict(a, "provider")));
  if (freeOperatory == null) {
    existing
      .filter((a) => targets.operatory_ids.includes(a.operatory_id ?? ""))
      .forEach((a) => {
        if (!conflicts.some((c) => c.appointment_id === a.id)) conflicts.push(toConflict(a, "operatory"));
      });
  }
  return { operatory_id: conflicts.length === 0 ? freeOperatory : null, conflicts };
}

/**
 * Resolve targets + check a slot in one go (used by Reschedule before saving the
 * new time). Throws SlotConflictError when the slot is taken.
 */
export async function assertSlotAvailable(
  request: BookingRequest,
  slot: AvailableSlot,
  fallbackOfficeId?: number | null,
): Promise<BookingTargets & { operatory_id: string }> {
  const targets = await resolveBookingTargets(request, fallbackOfficeId);
  const { operatory_id, conflicts } = await findSlotConflicts(targets, slot);
  if (operatory_id == null) throw new SlotConflictError(slot, conflicts);
  return { ...targets, operatory_id };
}

/**
 * Book an approved request into the scheduler. Checks for double-booking first
 * (throws SlotConflictError with the overlapping appointments) and throws a
 * descriptive Error when the office / provider / operatory can't be resolved,
 * so the caller keeps the request pending and surfaces the reason.
 */
export async function bookRequestIntoScheduler(
  request: BookingRequest,
  fallbackOfficeId?: number | null,
): Promise<BookedResult> {
  const { office_id: officeId, provider_id, operatory_id } = await assertSlotAvailable(
    request,
    request.slot,
    fallbackOfficeId,
  );

  // 5. Book it. patient_id stays null (external, not yet a PMS patient).
  const { contact, slot, reason_label } = request;
  const patientName = `${contact.first_name} ${contact.last_name}`.trim();
  const label = `${reason_label} — ${patientName}`;
  const notes = [
    "Booked via AppointNow (online request).",
    request.original_slot
      ? `Patient originally requested: ${request.original_slot.date} ${request.original_slot.start_time} (rescheduled by staff)`
      : null,
    `Patient: ${patientName}`,
    contact.phone ? `Phone: ${contact.phone}` : null,
    contact.email ? `Email: ${contact.email}` : null,
    contact.date_of_birth ? `DOB: ${contact.date_of_birth}` : null,
    contact.is_new_patient ? "New patient" : "Existing patient",
    contact.insurance_info ? `Insurance: ${contact.insurance_info}` : null,
    `Disclaimer accepted: ${contact.disclaimer_accepted ? "Yes" : "No"}`,
    `Contact consent: ${contact.consent_accepted ? "Yes" : "No"}`,
    contact.notes ? `Notes: ${contact.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const created = await createAppointment({
    patient_id: null,
    provider_id,
    operatory_id,
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
    provider_id,
    operatory_id,
  };
}
