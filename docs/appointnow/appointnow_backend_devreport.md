# AppointNow — External Online Booking — Backend Dev Report

**Module:** AppointNow (native online appointment booking)
**Frontend:** `src/features/appointnow/**` · public page `/book/:office_code` · staff inbox `/appointnow/requests`
**Transport swap flag:** `VITE_APPOINTNOW_BACKEND` (`local` = client-side simulation, default · `api` = real backend)
**Status:** Frontend shipped and live-verified against the client-side simulation. **The entire public
surface (office info, availability, request intake) and the staff request store are NOT yet in the
backend and must be built.** This report is the contract for the backend team.

---

## 1. What was built (frontend)

A public, login-free, embeddable booking screen that a practice pastes onto a third-party office
website. External patients:

1. pick a **reason** (drives chair-time duration) and optionally a provider,
2. see **available (unbooked) slots** for a chosen day,
3. enter **basic details** (name, phone, email, DOB, notes),
4. submit a **booking request**.

The request appears inside the DentC app (staff **inbox** + **nav-bell badge** + **toast notification**).
Staff **Approve** (which books a real appointment into the scheduler) or **Decline**.

Because there is no backend yet, the whole flow runs against a **swappable transport** that *simulates*
the backend client-side (localStorage + BroadcastChannel), exactly like the Messaging module. The
transport interface (`src/features/appointnow/transport/types.ts`) is backend-shaped so the real client
(`transport/realTransport.ts`, currently inert) becomes a drop-in when the endpoints below ship.

**Approve already books for real:** the staff side is authenticated, so `staffBooking.ts` resolves a real
office/provider/operatory via the existing generated client and calls the existing
`POST /api/v1/appointments` (`schedulerApi.createAppointment`). Only the *public* intake + availability
are simulated.

### 1a. Added 2026-09-09 — intake acknowledgements, staff Reschedule, double-booking guard

**Public Details step** now also captures, before the Confirm step:
- `insurance_info` (optional) — "Name of Dental Insurance Provider & Member ID number";
- `disclaimer_accepted` and `consent_accepted` — **mandatory** Yes/No acknowledgements (request only /
  not HIPAA compliant; phone-number + call/SMS consent + 24-hour change notice). Both must be **Yes** to
  reach Confirm.

**Staff inbox card** now has three actions on a pending request: **Decline**, **Reschedule**, **Approve &
book**. Reschedule opens an inline date + start-time editor (end time derived from the reason's duration);
the patient's contact details are never touched, and the original slot is kept on the request
(`original_slot`) and shown as *"Rescheduled by staff · patient originally asked for …"*. It is also
written into the appointment notes on approve.

**Double-booking guard (client-side, against the REAL scheduler):** both *Approve & book* and *Reschedule*
first resolve office → provider → operatories (`staffBooking.resolveBookingTargets`) and then load that
day's appointments (`GET /appointments/scheduler` + the archived-id overlay) to check the slot
(`findSlotConflicts`). A slot is blocked when the chosen **provider** already has an overlapping
non-cancelled appointment, or when **every active operatory** in the office is taken; otherwise the first
free operatory is used. On a conflict nothing is written; a **red modal** ("Time slot already booked")
lists each overlapping appointment (patient, time, procedure, provider, operatory, reason = *Provider busy*
/ *Chair taken*) with a "Choose another time" shortcut into Reschedule. The request stays `pending`.

**End-to-end test (2026-09-09, office MOON / id 1, provider PRV-100, operatory op-1-5):**

| Step | Action | Result |
|------|--------|--------|
| 1 | Created a real appointment 2026-09-10 10:00–11:00 for PRV-100 / op-1-5 via `POST /appointments` | 201 |
| 2 | Seeded a pending request for 2026-09-10 10:00 (60 min, any provider) and clicked **Approve & book** | Red modal *Time slot already booked* listing the 10:00–11:00 appointment (*Provider busy*); no `POST /appointments`; request still pending |
| 3 | **Choose another time** → Reschedule to 10:30 → *Check availability & save* | Red modal again (10:30–11:30 overlaps); slot NOT saved |
| 4 | Reschedule to 14:00 → *Check availability & save* | Toast *Request rescheduled*; card shows 2:00 PM + "patient originally asked for 10:00 AM"; contact details unchanged |
| 5 | **Approve & book** | `POST /appointments` 201 → `APPT-eae66930…` 14:00–15:00, PRV-100, op-1-5, office 1, `patient_id: null`; notes carry name/phone/email/new-patient/insurance/disclaimer/consent/original slot; request `approved` with `appointment_id` |
| 6 | Backend probe: `POST /appointments` 10:15–10:45 for the SAME provider + operatory as step 1 | **201 Created — the backend does not reject overlapping appointments** (see AN-15) |
| 7 | Cleanup: deleted the three test appointments (204 each), cleared the simulated request store | scheduler feed for 2026-09-10 shows none of them |

---

## 2. Endpoints the backend must build

All under a new tag, e.g. `appointnow`. Slot/time values are `HH:MM` (24h); dates are `YYYY-MM-DD`.

### AN-1 — Public office info (UNAUTH)
`GET /api/v1/appointnow/offices/{office_code}`
Returns public-safe office branding + the providers opted into online booking. No PMS internals.
```jsonc
{
  "office_code": "MAINST",
  "office_id": 1,
  "name": "Reckon Dental — Main St",
  "timezone": "America/New_York",
  "phone": "(555) 123-4567",
  "address": "123 Main St, Springfield",
  "providers": [ { "id": "PRV-1", "name": "Dr. Jane Smith", "title": "DDS" } ]
}
```
- `providers` = only providers with **`ProviderRead.visible_in_appointnow = true`** (see AN-7).
- Must be reachable **anonymously** (no tenant token). Resolve the tenant from `office_code`.
- `name` must be the **human office name only** (e.g. `"Excel Dental - Wexford"`) — **never** the
  `office_code`/id. The public header renders this string verbatim as the page title.
- 404 for unknown/booking-disabled offices (the UI shows a friendly "booking unavailable").
- **Frontend note:** in `local` mode the page now best-effort resolves the *real* office name (+ phone,
  address, AppointNow-visible providers) via the existing authed `GET /offices` **only when a staff token
  is present** (i.e. a staff member previewing from the app). A genuinely anonymous visitor on a
  third-party site has no token, so the true office name/branding depends entirely on **AN-1**; until it
  ships they see a generic brand fallback.

### AN-2 — Public availability (UNAUTH)
`GET /api/v1/appointnow/offices/{office_code}/availability?date=YYYY-MM-DD&provider_id=&duration_minutes=`
Returns the open, bookable start times for the day.
```jsonc
{ "slots": [ { "date": "2026-08-03", "start_time": "09:00", "end_time": "10:00",
               "duration_minutes": 60, "provider_id": "PRV-1", "provider_name": "Dr. Jane Smith" } ] }
```
**Algorithm (reference implementation shipped as `src/features/appointnow/lib/availability.ts`):**
1. Take the office per-day working window (`GET /offices/{id}/schedule` → `OfficeScheduleDayRead`:
   `start_time`/`end_time`, minus `lunch_start..lunch_end`, honoring `is_closed`).
2. If a provider is requested, intersect with that provider's window
   (`GET /providers/{id}/schedule` → `ProviderScheduleDayRead`).
3. Remove office/provider **holidays** (`/offices/{id}/holidays`, `/providers/{id}/holidays`,
   `/tenants/{id}/holidays`).
4. Slice into `OfficeRead.slot_interval_minutes` steps; keep steps where
   `[start, start+duration_minutes)` fits the window.
5. Subtract **already-booked** ranges from `GET /appointments/scheduler?date_from&date_to&office_id`
   (per operatory/provider capacity).
6. For today, drop slots that already started.
- Must be anonymous, cheap, and **cacheable** (short TTL). Consider a per-office availability cache.

### AN-3 — Public booking-request intake (UNAUTH)
`POST /api/v1/appointnow/offices/{office_code}/requests`
Body = `SubmitRequestInput` (see `types.ts`): `reason_id`, `reason_label`, `slot`, `contact`
(`first_name`, `last_name`, `phone`, `email`, `date_of_birth?`, `is_new_patient`, `notes?`,
`insurance_info?`, `disclaimer_accepted`, `consent_accepted`).
- `insurance_info` (optional free text) = "Name of Dental Insurance Provider & Member ID number".
- `disclaimer_accepted` / `consent_accepted` (boolean) are **mandatory acknowledgements**; the public UI
  only submits when both are `true` (Yes). The backend should **reject** intake with either `false`/missing
  and persist both flags with the request (audit trail of the patient's acknowledgement + contact consent
  for calls/SMS). The legal text is in `types.ts` (`BOOKING_DISCLAIMER_TEXT` / `BOOKING_CONSENT_TEXT`).
Returns the created `BookingRequest` (`id`, `status: "pending"`, timestamps).
- **Anti-abuse is mandatory** (public, unauthenticated write): rate-limit per IP/office, CAPTCHA/turnstile,
  and validate the slot is still open at submit time.
- Should **soft-hold** the slot (see AN-8) so two people can't request the same slot simultaneously.
- Do **not** create a patient or appointment here — this is only a request.

### AN-4 — Staff: list requests (AUTH)
`GET /api/v1/appointnow/requests?status=pending|approved|declined|expired&office_id=`
Returns `BookingRequest[]` (or `{ items }`), tenant/office-scoped. Powers the inbox + badge count.
- **Server-side search/filter/paging (see AN-13):** the inbox has a search box + filters (office, reason,
  patient type, appointment-date range) + sort. Today these run **client-side over the full loaded list**,
  which only scales while request volume is small. Please add query params so the list can be filtered
  server-side: `q` (free-text over name/phone/email/reason/code), `reason_id`/`reason_label`, `is_new_patient`,
  `date_from`/`date_to` (over the requested **slot date**), `sort` (`created_desc|created_asc|slot_asc|slot_desc`),
  and `page`/`size`. Also return an unfiltered **per-status count summary** (pending/approved/declined/all)
  so the tab badges stay accurate independent of the active filter.

### AN-5 — Staff: approve / decline (AUTH)
`POST /api/v1/appointnow/requests/{id}/approve` · `POST /api/v1/appointnow/requests/{id}/decline`
- **Approve should book atomically server-side**: re-check the slot is still free, create the
  appointment, attach it to the request (`appointment_id`), set `status: "approved"`, release the hold,
  and return the updated request. (The current frontend books client-side via `POST /appointments` and
  passes the resulting `appointment_id` in the approve body — the server may honor that id or, preferably,
  book itself and ignore it. Please make approval the single atomic transaction.)
- Approve should optionally **create/match a patient** from the contact details (see AN-9); today the
  appointment is booked with `patient_id: null` and the contact carried in the label/notes.
- Decline body: `{ reason?: string }`. Sets `status: "declined"`, stores reason + actor.

### AN-14 — Staff: reschedule a pending request (AUTH) — NEW 2026-09-09
`POST /api/v1/appointnow/requests/{id}/reschedule` · body `{ slot: AvailableSlot, actioned_by?: string }`
- Only valid while `status == "pending"` (409 otherwise). Replaces `slot`, sets `original_slot` to the
  patient's first-requested slot if not already set, bumps `updated_at`, records the actor. The **contact
  details must not change** — the appointment is always saved with the details the patient entered.
- Must run the same **double-booking check** as approve (AN-15) and return **409 + the conflicting
  appointments** (`{ conflicts: [{ appointment_id, patient_name, provider_name, operatory_name,
  start_time, end_time, procedure_label, kind: "provider"|"operatory" }] }`) so the red modal can list them.
- Release / re-take the slot hold (AN-8) for the new time. Optionally notify the patient (email/SMS) of
  the proposed new time.
- Frontend: `RealBookingTransport.rescheduleRequest()` already targets this route; the local simulation
  implements it in `localTransport.ts`.

### AN-15 — Server-side double-booking guard (AUTH) — NEW 2026-09-09, **verified gap**
`POST /api/v1/appointments` (and `PATCH /appointments/{id}` on date/time/provider/operatory changes)
currently **accepts overlapping appointments**: an appointment for the same provider AND operatory at an
overlapping time returned **201** during the E2E test above. The frontend now guards approve/reschedule
client-side, but that is racy (two staff users, or a walk-in booked between the check and the create).
- Reject with **409** when the slot overlaps a non-cancelled, non-archived appointment for the **same
  provider** or the **same operatory** (blocked-time rows included). Return the conflicting rows in the
  body (shape above) so the UI can show them.
- Apply the same rule inside the atomic **approve** (AN-5) and **reschedule** (AN-14) transactions, and
  in the public **availability** (AN-2) so patients are never offered a taken slot (today the local
  simulation fabricates slots from office hours only — it does not consult the scheduler).
- Consider an optional `allow_overlap: true` flag for deliberate double-booking (some practices
  double-book hygiene), defaulting to strict.

### AN-6 — Realtime notification for new requests (AUTH)
Staff must be alerted **without polling**. Provide a WebSocket/SSE push (or webhook) on new/updated
requests. The frontend already renders a toast + bell badge; the local simulation uses BroadcastChannel.
In `api` mode, `RealBookingTransport.subscribe()` is a no-op until this ships (falls back to manual
Refresh). Optional but recommended: email/SMS to the office on new request, and to the patient on
approve/decline.

### AN-7 — Provider exposure flag (EXISTS)
`ProviderRead.visible_in_appointnow` already exists and is the intended control for which providers are
offered in AN-1/AN-2. Please ensure it is settable in Provider Setup and enforced in AN-1/AN-2.

---

## 3. Additional backend concerns (please design in)

- **AN-8 Slot hold/expiry:** holding a slot on request (AN-3) with a TTL, auto-expiring to `status:
  "expired"` if not actioned, so availability stays truthful.
- **AN-9 Duplicate-patient matching:** on approve, match phone/email/DOB against existing patients before
  creating a new one; surface a "possible match" to staff.
- **AN-10 Timezone:** availability + display must respect `OfficeRead.timezone`; the public visitor may be
  in a different zone. Return times in office-local and label the zone.
- **AN-11 Public CORS:** AN-1..3 must allow-list the practice's website origin(s) (the page may be
  embedded in an iframe → also consider `X-Frame-Options`/CSP `frame-ancestors`).
- **AN-12 Auth interceptor hazard:** the public endpoints must **never return 401** to an anonymous
  visitor — the shared axios client hard-redirects any 401 to `/login`. The frontend already isolates
  public calls onto a bare axios instance, but keep public responses to 200/403/404/422.
- **AN-13 Inbox search / filter / paging (scale):** the staff inbox now ships a search box, filters
  (office, reason, patient type, appointment-date range) and sort — all **client-side over the full
  request list**, which is fine at low volume but won't scale. Add the server-side params on **AN-4** and
  return a per-status count summary for the tab badges. Suggested indexes: `(tenant_id, office_id,
  status, created_at)` and `(tenant_id, office_id, slot_date)`; a text index over
  name/phone/email/reason for `q`.

---

## 4. Data shapes (authoritative: `src/features/appointnow/transport/types.ts`)

`BookingRequest`, `SubmitRequestInput`, `AvailabilityQuery`, `AvailableSlot`, `PublicOfficeInfo`,
`AppointmentReason` are defined there and should be mirrored by the backend response models. The
reason catalog (id → duration) currently lives client-side (`APPOINTMENT_REASONS`); consider serving it
per-office from AN-1 so offices can customize reasons/durations.

---

## 5. How to light up the real backend

1. Implement AN-1..AN-6.
2. Set `VITE_APPOINTNOW_BACKEND=api`.
3. `RealBookingTransport` (already written, `transport/realTransport.ts`) takes over with **no UI change**.
   Public calls go through a bare axios instance (`baseURL` only); staff calls through the shared authed
   client. Flip `supportsAttachments`-style capability flags are not needed here.
