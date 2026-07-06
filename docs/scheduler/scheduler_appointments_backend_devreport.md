# Scheduler — "Understanding Appointments" (M03) Backend Dev Report

Backend/API gaps discovered while implementing the **appointment-interaction UX**
from the legacy Denticon guide *M03 — Understanding Appointments* (appointment
summary block, left-click Details pop-out, edit, status workflow, cancel dialog,
medical alert). This complements the module-wide gaps in
[`scheduler_backend_devreport.md`](./scheduler_backend_devreport.md).

Frontend delivered (all `tsc -b` + `eslint` clean):

- **Details pop-out** (left-click) — `src/components/scheduler/AppointmentDetailsPopover.tsx`,
  hydrated by `fetchAppointmentDetails` (`GET /appointments/{id}` +
  `GET /patients/{id}/context` + `GET /appointment-procedures?appointment_id` +
  `GET /appointments?patient_id&date_from` + `GET /patient-alerts?patient_id`).
- **Quick-status bar** (Option 1, S·C·U·L·R·A·O·H + Missed + Cancel) — `StatusIconBar.tsx`,
  embedded in the pop-out; applies via `PATCH /appointments/{id}/status`.
- **Grouped Set-Status submenu** (Option 2: confirmation / same-day / terminal) — `Scheduler.tsx`.
- **Cancel dialog** (note / add-to-call-list / reason) — `CancelAppointmentDialog.tsx`.
- **Missed** → strikethrough, stays on grid; **status color strip + letter badge** on each block.
- **Medical-alert** red-cross badge + popover — `MedicalAlertPopover.tsx` / `fetchPatientAlerts`.

---

## SCHED-APPT-1 — No created-by / modified-by user on `AppointmentRead`
**Legacy:** the Details pop-out shows *"Created: (date) JENNYLMS  Modified: (date) PDDS4363"*
— i.e. **who** created/modified the appointment.
**Backend:** `AppointmentRead` exposes `created_at` / `updated_at` timestamps but **no**
`created_by` / `updated_by` (user) fields.
**Impact:** the pop-out shows the created/modified **dates** only; the user attribution is omitted.
**Ask:** add `created_by` / `updated_by` (user id + resolved login/name) to `AppointmentRead`.

## SCHED-APPT-2 — Status PATCH accepts only `{status}`; cancellation metadata not persisted
**Legacy:** the Cancel dialog captures a **cancellation note**, an **Add to Call List** flag,
and a **cancellation reason** (Automated / Rescheduled / by email / by office / NOT rescheduled /
same day / No reason).
**Backend:** `PATCH /appointments/{id}/status` takes only `{status}`. There is no field to
persist the note, reason, or call-list flag, and no "cancelled appointment list" / call-list resource.
**Impact:** the dialog collects the data and the FE logs it (`console.info`) so nothing is
silently dropped, but it is **not saved**.
**Ask:** either extend the status PATCH body (`cancellation_note`, `cancellation_reason`,
`add_to_call_list`) or add a dedicated cancel endpoint + a cancelled-appointments/call-list resource.

## SCHED-APPT-3 — No same-day family / account appointments feed
**Legacy:** the Details pop-out lists *"Family Appointment(s) for {date}"* — same-day appointments
for other members of the patient's account / responsible party.
**Backend:** the scheduler feed / `GET /appointments` cannot filter by responsible-party or account;
`AppointmentSchedulerRead` carries no responsible-party linkage. Resolving it client-side would need
an N+1 over every same-day appointment's patient context.
**Impact:** the **Family** section is rendered empty.
**Ask:** add `responsible_party_id` to the feed, or a `GET /appointments?responsible_party_id=&date=`
(or `GET /patients/{id}/family-appointments?date=`) endpoint.

## SCHED-APPT-4 — Feed lacks per-block enrichment (alerts, age/gender, services, insurance eligibility)
**Legacy:** each appointment block shows the patient's **age/gender**, the **attached services** list,
a **medical-alert** red cross, and an **insurance-eligibility** icon (green = eligible, red = not,
gray = unknown). Hovering the icons reveals confirmation/same-day status, responsible-party type,
preferred language, lab tracking, and the new-patient placeholder.
**Backend:** `AppointmentSchedulerRead` carries none of these. Specifically there is **no `has_alert`
flag**, no age/gender, no attached-service summary, and **no insurance-eligibility status**.
**Impact:**
- Medical-alert badges are populated by a **capped, daily-view-only, non-blocking** fan-out over
  `GET /patient-alerts?patient_id` (deduped, ≤40 patients) — acceptable but a real N+1 that a feed
  flag would eliminate.
- Age/gender and the attached-services list are shown only in the on-demand Details pop-out.
- The **insurance-eligibility icon is not rendered** (no data source).
**Ask:** denormalize onto the feed: `has_alert: bool`, `patient_age`, `patient_gender`,
`service_summary` (or count), and `insurance_eligibility: 'eligible'|'ineligible'|'unknown'|null`.

## SCHED-APPT-5 — No `posted_on` timestamp for the status grid "Posted" cell
**Legacy:** the status-timestamp grid includes a **Posted** cell.
**Backend:** `AppointmentRead.is_posted` is a boolean only; there is no `posted_on` timestamp
(and the denormalized feed omits `is_posted` entirely).
**Impact:** the "Posted" cell in the Details status grid is left blank.
**Ask:** add `posted_on` to `AppointmentRead` and surface `is_posted`/`posted_on` on the feed.

## SCHED-APPT-7 — Feed lacks the patient's account balance (drives the $ badge)
**Feature:** each appointment block shows a **$ badge** when the patient owes an outstanding
balance, and the details pop-out shows the balance breakdown (account / patient / insurance).
**Backend:** the balance is only available per-patient via `GET /patients/{id}/balance`
(`PatientBalance`) — the scheduler feed (`AppointmentSchedulerRead`) carries no balance field.
**Impact:** the $ badges are populated by a **capped, daily-view-only, non-blocking** fan-out over
`GET /patients/{id}/balance` (deduped with the alerts fan-out, ≤40 patients, one round trip per
patient for alerts+balance). The details pop-out reuses the balance already returned by
`GET /patients/{id}/context` (no extra call there).
**Ask:** denormalize `account_balance` (and ideally `patient_balance`) onto `AppointmentSchedulerRead`,
or add a batch `GET /patients/balances?ids=` — either removes the per-day balance fan-out.

## SCHED-APPT-6 — No per-line estimated-patient portion on appointment procedures
**Legacy:** the pop-out / edit grid shows an **Est. Pat.** per procedure and an appointment total.
**Backend:** `AppointmentProcedureRead` has `fee` and `insurance_estimate` (as strings) but **no
`est_patient`** field.
**Impact:** the FE derives `est_patient = max(fee − insurance_estimate, 0)` per line and sums it.
This ignores secondary insurance, write-offs, and adjustments.
**Ask:** add a computed `est_patient` (and ideally a per-appointment `est_patient_total`) that
accounts for the full coordination-of-benefits logic.

---

_Statuses used by the Set-Status workflow come from `definitions` (`group_code = appt_status`,
`color` + `sort_order`); the FE overlays the legacy S·C·U·L·R·A·O·H letter icons and
confirmation/same-day/terminal grouping (`src/components/scheduler/statusMeta.ts`). If the backend
seeds `appt_status` with these ten values + colors, the FE picks them up automatically._
