// Hand-off contract for "New Appointment" buttons on patient screens
// (Treatment Plan, Restorative Chart, Patient Overview → Appointments).
//
// Those buttons used to call `navigate('/scheduler')` with nothing attached, so
// the scheduler opened cold: the user picked a slot, the New Appointment modal
// asked "Who is this appointment for?" again, and the procedure(s) they had
// selected on the plan never reached the TREATMENTS grid. The request now
// travels in router state; the scheduler holds it as a *pending booking* until
// a slot is clicked, then opens the modal with the patient preselected and the
// plan items seeded as appointment procedure lines (linked back to the plan via
// `treatment_plan_id`).

import type { NavigateFunction } from "react-router-dom";

export interface SchedulerBookingRequest {
  /** PatientRead.id — the appointment's `patient_id`. */
  patient_id: number;
  /** Display only ("Last, First"); the modal loads the real record. */
  patient_name?: string;
  /** treatment_plan_items.id values to pre-load as appointment procedures. */
  plan_item_ids: string[];
  /**
   * Provider the appointment should default to — the provider stored on the
   * plan item(s) being booked (`treatment_plan_items.provider_id`). Without
   * it the appointment form falls back to the operatory's assigned provider,
   * which is not the one chosen on the treatment plan. The form also picks
   * the operatory assigned to this provider when no slot was clicked.
   */
  provider_id?: string | null;
  /** Where the request came from (for the scheduler banner). */
  source?: "treatment-plan" | "restorative" | "patient-overview";
}

/** Key under `location.state` that carries the request. */
export const SCHEDULER_BOOKING_STATE_KEY = "scheduler_booking";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/** Pull a well-formed booking request out of `location.state`, or null. */
export const bookingRequestFromState = (
  state: unknown,
): SchedulerBookingRequest | null => {
  if (!isRecord(state)) return null;
  const raw = state[SCHEDULER_BOOKING_STATE_KEY];
  if (!isRecord(raw)) return null;
  const patient_id = Number(raw.patient_id);
  if (!Number.isFinite(patient_id) || patient_id <= 0) return null;
  const plan_item_ids = Array.isArray(raw.plan_item_ids)
    ? raw.plan_item_ids.map((id) => String(id)).filter(Boolean)
    : [];
  return {
    patient_id,
    patient_name:
      typeof raw.patient_name === "string" ? raw.patient_name : undefined,
    plan_item_ids,
    provider_id:
      typeof raw.provider_id === "string" && raw.provider_id
        ? raw.provider_id
        : null,
    source:
      raw.source === "treatment-plan" ||
      raw.source === "restorative" ||
      raw.source === "patient-overview"
        ? raw.source
        : undefined,
  };
};

/** Open the scheduler with a pending booking for this patient / these items. */
export const openSchedulerForBooking = (
  navigate: NavigateFunction,
  request: SchedulerBookingRequest,
): void => {
  navigate("/scheduler", {
    state: { [SCHEDULER_BOOKING_STATE_KEY]: request },
  });
};
