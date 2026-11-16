// patientFromRequest — turns an AppointNow request's contact block into a real
// PMS patient, the SAME way the Scheduler's Quick Save does
// (NewAppointmentModal.handleQuickSave): `POST /patients/register` with the
// minimal identity, the server duplicate guard (409 duplicate_patient →
// "book for this existing patient?" / force_create), and the patient's home
// office = the request's office.
//
// Why the client does this instead of `create_patient: true` on approve:
//   • the backend's create_patient path (appointnow_service._resolve_patient_
//     for_booking) silently LINKS any single patient sharing the phone OR the
//     e-mail — a parent's phone on a child's request books the parent (AN-31);
//   • it writes the number into `phone` (home) instead of `cell_phone`, and a
//     strong duplicate comes back as a bare 409 with no "use existing /
//     create anyway" choice (no force_create on ApproveInput).
// So we resolve the patient here and approve with an explicit `patient_id`,
// which the server links to both the appointment and the request.
//
// Before this, approve sent neither patient_id nor create_patient, so every
// approved request was booked with appointment.patient_id = NULL and the
// appointment form showed "This patient has no backend id".

import {
  appointnowGetRequest,
  getAppointment,
  updateAppointment,
} from "@/api/generated/endpoints/appointments/appointments";
import type { PatientCreate } from "@/api/generated/model";
import { registerPatientResilient, isDuplicatePatientError } from "@/services/patientApi";
import { toDuplicatePatient } from "@/services/patient.service";

/** The contact fields we need — satisfied by both BookingContactDetails and ContactOut. */
export interface RequestContactLike {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
}

/** Raised when the request lacks the identity a patient record needs. */
export class IncompleteContactError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IncompleteContactError";
  }
}

/**
 * Minimal PatientCreate from the request contact. The public form's phone is
 * the number the patient consented to receive texts on → `cell_phone`
 * (Quick Save's default "Cell" radio).
 */
export function buildPatientFromContact(
  contact: RequestContactLike,
  home_office_id: number,
): PatientCreate {
  const first_name = (contact.first_name ?? "").trim();
  const last_name = (contact.last_name ?? "").trim();
  if (!first_name || !last_name) {
    throw new IncompleteContactError(
      "The request has no first/last name, so a patient record cannot be created. " +
        "Book the patient from the Scheduler instead.",
    );
  }
  const digits = (contact.phone ?? "").replace(/\D/g, "");
  return {
    first_name,
    last_name,
    dob: contact.date_of_birth || null,
    home_office_id,
    email: (contact.email ?? "").trim() || null,
    cell_phone: digits || null,
    patient_type: "General",
    is_active: true,
  };
}

export interface ResolvedPatient {
  patient_id: number;
  /** true = a new patient row was created; false = linked to an existing one. */
  created: boolean;
}

/**
 * Asks staff what to do with a strong duplicate. Defaults to the same
 * window.confirm wording Quick Save uses so both flows behave identically.
 * Return true = use the existing patient, false = create a separate one.
 */
export type ConfirmDuplicate = (summary: {
  name: string;
  dob: string;
  patient_id: string;
}) => boolean | Promise<boolean>;

const defaultConfirmDuplicate: ConfirmDuplicate = (d) =>
  window.confirm(
    `${d.name} (DOB ${d.dob || "—"}, Patient ID ${d.patient_id}) already exists.\n\n` +
      "OK — book the appointment for this existing patient.\n" +
      "Cancel — create a separate new patient anyway.",
  );

/**
 * Register the request's contact as a patient (Quick Save parity). A strong
 * duplicate is put to staff: link the existing record, or force-create.
 */
export async function resolvePatientFromContact(
  contact: RequestContactLike,
  home_office_id: number,
  confirmDuplicate: ConfirmDuplicate = defaultConfirmDuplicate,
): Promise<ResolvedPatient> {
  const patient = buildPatientFromContact(contact, home_office_id);
  try {
    const res = await registerPatientResilient({ patient });
    if (res.warnings.length > 0) {
      console.warn("[AppointNow] patient saved with warnings:", res.warnings);
    }
    return { patient_id: res.patient_id, created: true };
  } catch (err) {
    const top = isDuplicatePatientError(err) ? err.candidates[0] : undefined;
    if (!top) throw err;
    const first = toDuplicatePatient(top);
    if (await confirmDuplicate({ name: first.name, dob: first.dob, patient_id: first.patient_id })) {
      return { patient_id: first.id, created: false };
    }
    const res = await registerPatientResilient({ patient, force_create: true });
    return { patient_id: res.patient_id, created: true };
  }
}

/** `AppointNow request <id>` — the first line the server writes into the appointment note. */
const REQUEST_NOTE_RE = /AppointNow request\s+([A-Za-z0-9_-]+)/;

/** The AppointNow request id an appointment was booked from, parsed from its notes. */
export function appointNowRequestIdFromNotes(notes: string | null | undefined): string | null {
  return REQUEST_NOTE_RE.exec(notes ?? "")?.[1] ?? null;
}

/**
 * Repair an appointment that was approved before patients were linked
 * (appointment.patient_id = NULL): read the request, register/match its
 * contact, then PATCH the appointment's patient_id. Idempotent — if the
 * appointment (or the request) already carries a patient, that one is used.
 *
 * Backend gap AN-30: there is no endpoint to set `booking_requests.patient_id`
 * after approval, so the request row itself stays unlinked; only the
 * appointment is repaired.
 */
export async function linkPatientToAppointNowAppointment(
  appointment_id: string,
  request_id: string,
  fallback_office_id: number | null,
  confirmDuplicate?: ConfirmDuplicate,
): Promise<ResolvedPatient> {
  const appt = await getAppointment(appointment_id);
  if (appt.patient_id != null) return { patient_id: appt.patient_id, created: false };

  const req = await appointnowGetRequest(request_id);
  let resolved: ResolvedPatient;
  if (req.patient_id != null) {
    resolved = { patient_id: req.patient_id, created: false };
  } else {
    const office_id = req.office_id ?? appt.office_id ?? fallback_office_id;
    if (!office_id) throw new Error("The request has no office to register the patient in.");
    resolved = await resolvePatientFromContact(req.contact ?? {}, office_id, confirmDuplicate);
  }
  await updateAppointment(appointment_id, { patient_id: resolved.patient_id });
  return resolved;
}
