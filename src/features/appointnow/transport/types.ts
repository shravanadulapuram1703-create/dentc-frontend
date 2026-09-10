// The BookingTransport interface — the single seam between the AppointNow UI
// (public booking screen + staff request inbox) and its backend. Two
// implementations exist:
//
//   - localTransport.ts — client-side simulation (localStorage + BroadcastChannel).
//                         The default; makes the whole request→approve flow
//                         demonstrable end-to-end in a browser with no backend.
//   - realTransport.ts  — env-gated REST client that targets the contract in
//                         docs/appointnow/appointnow_backend_devreport.md. INERT
//                         until VITE_APPOINTNOW_BACKEND=api.
//
// Swapping between them is a config change (VITE_APPOINTNOW_BACKEND) in
// bookingService.ts — no UI change. Keep this interface backend-shaped so the
// real implementation is a drop-in.

/** Booking-request lifecycle. */
export type BookingRequestStatus = "pending" | "approved" | "declined" | "expired";

/**
 * A provider a patient may pick on the public page. Only providers the office
 * has opted into (`ProviderRead.visible_in_appointnow`) should ever appear here.
 */
export interface PublicProvider {
  id: string;
  name: string;
  title?: string | null;
}

/** Public-safe office info shown on the booking screen (no PMS internals). */
export interface PublicOfficeInfo {
  office_code: string;
  /** Numeric PMS office id when known (real backend); null in local sim. */
  office_id: number | null;
  name: string;
  timezone: string;
  phone?: string | null;
  address?: string | null;
  /** Providers exposed to online booking; empty ⇒ "any available provider". */
  providers: PublicProvider[];
  /** True when this info came from the client-side simulation, not the backend. */
  is_simulated: boolean;
}

/** A reason-for-visit the patient chooses; drives the slot duration. */
export interface AppointmentReason {
  id: string;
  label: string;
  /** Minutes the appointment blocks the chair. */
  duration_minutes: number;
}

/** Query for open slots on a given day. */
export interface AvailabilityQuery {
  office_code: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Optional preferred provider id; omit for "any available". */
  provider_id?: string | null;
  /** Chosen reason's duration (minutes). */
  duration_minutes: number;
}

/** An open, bookable slot. */
export interface AvailableSlot {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** HH:MM (24h). */
  start_time: string;
  /** HH:MM (24h). */
  end_time: string;
  duration_minutes: number;
  provider_id: string | null;
  provider_name: string | null;
}

/** Basic patient details captured on the public page. */
export interface BookingContactDetails {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  /** ISO date, YYYY-MM-DD (optional). */
  date_of_birth?: string | null;
  is_new_patient: boolean;
  notes?: string | null;
  /** Optional free-text: dental insurance provider name & member ID. */
  insurance_info?: string | null;
  /**
   * Disclaimer acknowledgement (REQUIRED to submit): the patient understands this
   * is an appointment REQUEST only (not a confirmation) and that the feature is
   * not HIPAA compliant / no PHI is collected. `null` = not yet answered.
   */
  disclaimer_accepted: boolean | null;
  /**
   * Contact consent (REQUIRED to submit): the patient verifies the phone number
   * is theirs and consents to calls/texts about the appointment, and understands
   * the 24-hour notice policy for changes. `null` = not yet answered.
   */
  consent_accepted: boolean | null;
}

/** Disclaimer text shown next to the required Yes/No acknowledgement. */
export const BOOKING_DISCLAIMER_TEXT =
  "I understand that this is just an Appointment request only, NOT A CONFIRMATION. I understand that this Request Appointment feature is not HIPAA compliant and any protected health information will not be included.";

/** Consent text shown next to the required Yes/No acknowledgement. */
export const BOOKING_CONSENT_TEXT =
  "I verify that this is my phone number and consent to receive calls and text messages regarding my appointment. I understand that if my appointment is confirmed, a minimum of 24hr notice is required to make changes to a confirmed appointment.";

/** What the public page submits to request a slot. */
export interface SubmitRequestInput {
  office_code: string;
  reason_id: string;
  reason_label: string;
  slot: AvailableSlot;
  contact: BookingContactDetails;
}

/** A booking request as stored/returned by the transport. */
export interface BookingRequest {
  id: string;
  office_code: string;
  office_id: number | null;
  status: BookingRequestStatus;
  reason_id: string;
  reason_label: string;
  slot: AvailableSlot;
  contact: BookingContactDetails;
  /** ISO timestamp of submission. */
  created_at: string;
  /** ISO timestamp of the last status change. */
  updated_at: string;
  /** Set once approved and booked into the scheduler. */
  appointment_id?: string | null;
  /** Staff who actioned it (display name). */
  actioned_by?: string | null;
  /** Reason captured on decline. */
  decline_reason?: string | null;
  /**
   * The slot the PATIENT originally asked for, set only when staff rescheduled
   * the request before approving (`slot` then holds the new time). The contact
   * details are never changed by a reschedule.
   */
  original_slot?: AvailableSlot | null;
}

/** Real-time events the transport pushes to subscribers. */
export type BookingEvent =
  | { type: "request:new"; request: BookingRequest }
  | { type: "request:updated"; request: BookingRequest };

export type BookingEventHandler = (event: BookingEvent) => void;

/** Backend-shaped contract implemented by both transports. */
export interface BookingTransport {
  /** True when this is a labelled client-side simulation. */
  readonly isSimulated: boolean;

  /** Start listeners (BroadcastChannel / socket). Idempotent. */
  init(): Promise<void> | void;
  /** Tear down listeners. */
  dispose(): void;
  /** Subscribe to request events; returns an unsubscribe fn. */
  subscribe(handler: BookingEventHandler): () => void;

  // --- Public (unauthenticated) surface ------------------------------------
  /** Public office info for the booking screen. */
  getOfficeInfo(officeCode: string): Promise<PublicOfficeInfo>;
  /** Open slots for a day. */
  getAvailability(query: AvailabilityQuery): Promise<AvailableSlot[]>;
  /** Submit a booking request (creates a `pending` request + notifies staff). */
  submitRequest(input: SubmitRequestInput): Promise<BookingRequest>;

  // --- Staff (authenticated) surface ---------------------------------------
  /** List requests, optionally filtered by status. */
  listRequests(status?: BookingRequestStatus): Promise<BookingRequest[]>;
  /**
   * Mark a request approved. `appointmentId` is the scheduler appointment the
   * caller booked (the staff UI books via the real scheduler API, then records
   * the id here). Returns the updated request.
   */
  approveRequest(id: string, appointmentId: string, actionedBy?: string): Promise<BookingRequest>;
  /** Mark a request declined. */
  declineRequest(id: string, reason?: string, actionedBy?: string): Promise<BookingRequest>;
  /**
   * Move a PENDING request to a different slot (staff-side reschedule before
   * approval). Keeps the contact details untouched, records the patient's
   * original slot in `original_slot`, and stays `pending`.
   */
  rescheduleRequest(id: string, slot: AvailableSlot, actionedBy?: string): Promise<BookingRequest>;
}

/** Reasons offered on the public page. Durations mirror typical chair time. */
export const APPOINTMENT_REASONS: AppointmentReason[] = [
  { id: "new_patient_exam", label: "New Patient Exam", duration_minutes: 60 },
  { id: "cleaning", label: "Cleaning & Checkup", duration_minutes: 60 },
  { id: "emergency", label: "Emergency / Tooth Pain", duration_minutes: 30 },
  { id: "consultation", label: "Consultation", duration_minutes: 30 },
  { id: "follow_up", label: "Follow-up Visit", duration_minutes: 30 },
  { id: "cosmetic", label: "Cosmetic Consultation", duration_minutes: 45 },
];
