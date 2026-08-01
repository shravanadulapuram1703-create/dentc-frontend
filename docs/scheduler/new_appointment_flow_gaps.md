# Scheduler — New Appointment Flow: Backend & Frontend Gaps

**Owner:** Frontend • **Module:** Scheduler → New Appointment (`/scheduler`, right-click slot → *Add New Appointment*, or the header **NEW APPOINTMENT** button)
**Branch:** `feature/phase_data_migration` • **Date:** 2026-08-01
**Related components:** `src/components/modals/NewAppointmentModal.tsx`, `src/components/modals/AddEditAppointmentForm.tsx`, `src/components/pages/AddNewPatient.tsx`

---

## What changed in this pass (context for the reader)

The new-appointment flow was reworked so it reads as one coherent path:

1. **Choose who** — a clean *Existing Patient* / *New Patient* chooser (the three legacy
   options — Family, Block, Quick Fill — are shown but disabled with a **“Coming soon”**
   badge instead of being dead clickable cards).
2. **Existing Patient** → patient search → **appointment-details** form
   (`AddEditAppointmentForm`), which now owns the modal header (the old double dark-header
   was removed) and shows only wired footer actions.
3. **New Patient** → the **real Add New Patient flow** is embedded
   (`<AddNewPatient variant="modal" mode="create">`): the user can **Quick Save** just the
   basics or run the **full wizard** (Responsible Party, Insurance, Medical Alerts,
   Questionnaires, Recall). On save the created patient is loaded and the flow continues
   straight into the appointment-details form.
4. **Save** — the appointment is persisted via `POST /appointments` (create) /
   `PUT /appointments/{id}` (edit); the grid refreshes.

Everything below is what the flow *surfaced* as still missing. Nothing is silently dropped —
each item degrades gracefully in the UI.

---

# Part A — Backend gaps (hand-off to the Backend team)

Each gap: **what the UI wants → what the backend exposes today → FE behavior now → the ask.**

| ID | Priority | Gap | FE behavior today |
|----|----------|-----|-------------------|
| **NA-B1** | P2 | **Block / placeholder appointments** — no way to reserve time with no patient + a reason/label | *Block Appointment* card disabled (“coming soon”) |
| **NA-B2** | P2 | **Quick-Fill / ASAP waitlist** resource to pull short-notice patients from | *Quick Fill List* card disabled (“coming soon”) |
| **NA-B3** | P2 | **Real-time insurance eligibility** check for an appointment’s patient/plan | *Insurance Verification* action removed from the details form |
| **NA-B4** | P2 | **Family / same-account same-day** scheduling feed (dup of consolidated **G4**) | *Family Appointment* card disabled (“coming soon”) |
| **NA-B5** | P3 | Confirm whether appointment **`treatments[]` post to the account ledger** (patient-procedures) on save, or need an explicit **Post** call | *Post* action removed; treatments are sent on the appointment payload only |
| **NA-B6** | P2 | **Offices with operatories but no office-scoped providers** — `GET /providers?office_id={id}` returns `[]` for many offices (e.g. office 38) even though the office schedules patients | appointment form now falls back to the **full** provider list; **Add-Patient wizard still hard-blocks** (see NA-F6) |

### NA-B1 — Block / placeholder appointments
**UI:** legacy lets staff drop a non-patient “block” on the grid (lunch, staff meeting,
equipment hold) with a **reason/label** and color.
**Backend today:** `AppointmentCreate.patient_id` is `number | null` (null is accepted), but
there is **no block reason/label/type** field, so a null-patient row cannot carry a title.
**Ask:** add an appointment `kind` (`patient` | `block`) + `block_label` (string) so the FE
can render and persist a block. Alternatively a dedicated `/schedule-blocks` resource.

### NA-B2 — Quick-Fill / ASAP waitlist
**UI:** *Quick Fill List* should show patients flagged “call if an earlier slot opens,”
sortable by wait, one-click to schedule into the open slot.
**Backend today:** no waitlist/ASAP resource; no `is_quick_fill` / `asap` flag on patient or a
`/quick-fill` list endpoint.
**Ask:** a `GET /offices/{id}/quick-fill` (or patient flag + filter) returning candidate
patients for an open slot.

### NA-B3 — Real-time insurance eligibility from the appointment
**UI:** the details form had an *Insurance Verification* button to run/refresh eligibility for
the scheduled patient’s active plan.
**Backend today:** no endpoint to trigger or return an eligibility check
(payer response, coverage %, remaining benefit) for a patient/plan.
**Ask:** `POST /patients/{id}/insurance/{plan}/verify` (or similar) returning an eligibility
result the appointment can display. (Overlaps the eligibility icon in consolidated **G1**.)

### NA-B4 — Family / same-account same-day scheduling
Duplicate of **G4** in `scheduler_consolidated_backend_gaps.md`. The *Family Appointment* card
stays disabled until a same-account same-day feed exists.

### NA-B5 — Do appointment treatments post to the ledger?
**UI:** legacy *Post* button pushed the appointment’s planned procedures to the account ledger.
**Backend today:** `AppointmentCreate.treatments[]` is accepted on the appointment payload; it
is **unclear** whether these become ledger `patient-procedures` or are appointment-scoped only.
**Ask:** confirm the contract. If a separate post step is required, expose it
(e.g. `POST /appointments/{id}/post`). The FE removed the placeholder *Post* button pending this.

---

# Part B — Frontend gaps / follow-ups (FE backlog)

These are FE-side, either intentionally deferred or dependent on the Part-A backend work.

- **NA-F1 — Family / Block / Quick-Fill cards are placeholders.** Rendered disabled with a
  “Coming soon” badge. Implement once NA-B1/NA-B2/NA-B4 land.
- **NA-F2 — In-form appointment delete not wired.** The old *Delete Appt* button was a fake
  `alert("Appointment deleted")` that called **no API** — removed. Real deletion still exists on
  the grid’s right-click **Delete** (calls the delete endpoint). Follow-up: wire a real delete
  into the details form when editing.
- **NA-F3 — Removed alert-only stub buttons.** *Insurance Verification*, *Change Provider*, and
  *Post* were `alert()`-only. Removed. Note: **changing the provider already works** via the
  Provider dropdown in the form (persists through `updateAppointment`); a dedicated button is
  cosmetic. *Insurance Verification* → NA-B3; *Post* → NA-B5.
- **NA-F4 — Embedded Add-Patient success alerts.** In embedded (modal) create mode, Quick
  Save / Finish still show the AddNewPatient success `alert()` before continuing to the
  appointment. Consider suppressing the intermediate alert when `onSaved` is provided so the
  handoff is seamless.
- **NA-F5 — No-slot ("NEW APPOINTMENT" button) path.** When no grid slot is pre-selected, the
  outer date/time picker now flows into the details form via `initialAppointmentData`. Keep an
  eye on time-format parity (`HH:MM` vs `hh:mm AM/PM`) between the picker and the form.
- **NA-F6 — Provider selection when the office has no scoped providers (NA-B6).** Fixed in the
  **appointment details form**: when `fetchProviders(office)` returns empty, it now falls back to
  the full provider list so a provider can always be assigned (verified: appointment saved in an
  office whose operatories have no `provider_id`). **Not yet fixed in the Add-Patient wizard** —
  its required *Preferred Provider* shows "No providers for this office", which blocks Quick
  Save/registration for a new patient in such an office. Follow-up: apply the same fallback in
  `AddNewPatient`, or (better) fix the backend provider→office assignment (NA-B6).

---

## Confirmed working (no gap)

- **Create** (`POST /appointments`) and **edit** (`PUT /appointments/{id}`) both succeed for
  existing **and** newly-created patients (the patient is registered first, so the appointment
  always carries a numeric `patient_id`).
- **New patient registration** reuses the production Add-Patient flow end-to-end (Quick Save and
  the full insurance/medical wizard), so there is a single source of truth for patient creation.
- **Double-booking guard** (operatory/time conflict) runs in `Scheduler.handleSaveAppointment`.
- **Provider auto-fill** from the operatory’s `provider_id` works on both the chooser and the
  details form.
