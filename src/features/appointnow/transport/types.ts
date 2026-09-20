// The BookingTransport interface — the single seam between the AppointNow UI
// (public booking screen + staff request inbox) and its backend. Two
// implementations exist:
//
//   - realTransport.ts  — the DEFAULT: REST client for the shipped backend
//                         (/api/v1/appointnow/*) + the `appointnow.request` push
//                         envelope on the messaging WebSocket. Requests submitted
//                         from ANY device land in the tenant's booking_requests
//                         table and reach every staff session of that office.
//   - localTransport.ts — client-side simulation (localStorage + BroadcastChannel),
//                         opt-in via VITE_APPOINTNOW_BACKEND=local for demos with
//                         no backend. Only ever visible inside ONE browser profile.
//
// Swapping between them is a config change (VITE_APPOINTNOW_BACKEND) in
// bookingService.ts — no UI change. Keep this interface backend-shaped so both
// implementations stay drop-ins. Capability flags (`supportsPush`,
// `supportsReschedule`, `booksOnApprove`) let the UI adapt to what the connected
// backend can do instead of guessing.

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
  /**
   * Per-office reason catalog served by the backend (AN-1). Empty/absent ⇒ the
   * page falls back to the built-in `APPOINTMENT_REASONS`.
   */
  reasons?: AppointmentReason[];
  /** True when this info came from the client-side simulation, not the backend. */
  is_simulated: boolean;
}

/** A reason-for-visit the patient chooses; drives the slot duration. */
export interface AppointmentReason {
  id: string;
  label: string;
  /** Minutes the appointment blocks the chair. */
  duration_minutes: number;
  /** When true the patient must pick a specific provider for this reason. */
  requires_provider?: boolean;
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
  /** PMS patient linked/created on approve (AN-9); null while unlinked. */
  patient_id?: number | null;
  /** Staff who approved/declined it (display name, `actioned_by_name` server-side). */
  actioned_by?: string | null;
  /** ISO timestamp of the approve/decline action (server-side). */
  actioned_at?: string | null;
  /** Staff who last rescheduled it (AN-14). */
  rescheduled_by?: string | null;
  rescheduled_at?: string | null;
  reschedule_count?: number;
  /** Last outbound notification to the contact (AN-21): "sms" | "email" | null. */
  contact_notified_via?: string | null;
  contact_notified_at?: string | null;
  /** Reason captured on decline. */
  decline_reason?: string | null;
  /**
   * The slot the PATIENT originally asked for, set only when staff rescheduled
   * the request before approving (`slot` then holds the new time). The contact
   * details are never changed by a reschedule.
   */
  original_slot?: AvailableSlot | null;
}

/** Unfiltered per-status totals for the inbox tabs / nav badge (AN-13). */
export interface StatusCounts {
  pending: number;
  approved: number;
  declined: number;
  expired: number;
  all: number;
}

/** Staff list query. `office_id` scopes the inbox to the selected office. */
export interface ListRequestsParams {
  status?: BookingRequestStatus;
  office_id?: number | null;
}

/** Staff list result: the rows plus the server's per-status counts. */
export interface BookingRequestList {
  items: BookingRequest[];
  counts: StatusCounts;
}

/** What staff pass when approving (steers the booking). */
export interface ApproveOptions {
  /**
   * Appointment already booked by the CLIENT (only when `booksOnApprove` is
   * false — the local simulation). The real backend books itself and ignores it.
   */
  appointment_id?: string | null;
  /** Provider / chair the request should be booked against (server-validated). */
  provider_id?: string | null;
  operatory_id?: string | null;
  /** Link the request to an existing PMS patient (AN-9). */
  patient_id?: number | null;
  /** Staff display name (recorded by the simulation; the server uses the JWT). */
  actioned_by?: string | null;
  /** The slot being booked — lets a 409 slot_conflict map to SlotConflictError. */
  slot?: AvailableSlot;
}

/** Real-time events the transport pushes to subscribers. */
export type BookingEvent =
  | { type: "request:new"; request: BookingRequest }
  | { type: "request:updated"; request: BookingRequest }
  | { type: "request:deleted"; request_id: string; office_id: number | null };

export type BookingEventHandler = (event: BookingEvent) => void;

/** Backend-shaped contract implemented by both transports. */
export interface BookingTransport {
  /** True when this is a labelled client-side simulation. */
  readonly isSimulated: boolean;
  /**
   * True when `subscribe()` delivers live events (BroadcastChannel / socket).
   * When false the staff context POLLS `listRequests` to notice new requests.
   */
  readonly supportsPush: boolean;
  /**
   * Reconciliation poll period in ms, or null for none. The real backend's push
   * is best-effort (Redis fan-out / in-process), so the context keeps a slow
   * poll as the source of truth even with push connected.
   */
  readonly pollIntervalMs: number | null;
  /** True when `rescheduleRequest` is implemented by this backend (AN-14). */
  readonly supportsReschedule: boolean;
  /**
   * True when `approveRequest` books the scheduler appointment SERVER-SIDE
   * (atomic re-check + create). When false the caller must book first and pass
   * the resulting `appointment_id` in `ApproveOptions`.
   */
  readonly booksOnApprove: boolean;

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
  /** List requests (all statuses unless filtered), scoped by office when given. */
  listRequests(params?: ListRequestsParams): Promise<BookingRequestList>;
  /**
   * Approve a request. With `booksOnApprove` the backend re-checks the slot,
   * books the appointment and links it atomically; otherwise the caller booked
   * already and passes `appointment_id`. Returns the updated request.
   */
  approveRequest(id: string, options?: ApproveOptions): Promise<BookingRequest>;
  /** Mark a request declined. */
  declineRequest(id: string, reason?: string, actionedBy?: string): Promise<BookingRequest>;
  /**
   * Move a PENDING request to a different slot (staff-side reschedule before
   * approval). Keeps the contact details untouched, records the patient's
   * original slot in `original_slot`, and stays `pending`. Throws
   * SlotConflictError on overlap and a plain Error when `supportsReschedule`
   * is false.
   */
  rescheduleRequest(id: string, slot: AvailableSlot, actionedBy?: string): Promise<BookingRequest>;
  /**
   * Permanently remove a request (spam/test rows — AN-24). An APPROVED request
   * is refused unless `force` is true; the booked appointment is never touched.
   */
  deleteRequest(id: string, force?: boolean): Promise<void>;
}

/** Empty counts (used before the first load / by the simulation). */
export const EMPTY_COUNTS: StatusCounts = {
  pending: 0,
  approved: 0,
  declined: 0,
  expired: 0,
  all: 0,
};

/** Compute per-status counts from a list (simulation + client fallback). */
export function countByStatus(requests: BookingRequest[]): StatusCounts {
  const c: StatusCounts = { ...EMPTY_COUNTS, all: requests.length };
  for (const r of requests) {
    if (r.status in c) c[r.status] += 1;
  }
  return c;
}

/**
 * Built-in reasons offered on the public page when the office has none
 * configured. Ids mirror the backend's default catalog
 * (`appointnow_service._DEFAULT_REASONS`) so a submitted `reason_id` resolves
 * server-side either way.
 */
export const APPOINTMENT_REASONS: AppointmentReason[] = [
  { id: "new_patient", label: "New Patient Exam", duration_minutes: 60 },
  { id: "cleaning", label: "Cleaning / Hygiene", duration_minutes: 60 },
  { id: "checkup", label: "Checkup / Recall", duration_minutes: 30 },
  { id: "emergency", label: "Emergency / Tooth Pain", duration_minutes: 30 },
  { id: "consultation", label: "Consultation", duration_minutes: 30 },
  { id: "other", label: "Other", duration_minutes: 30 },
];
