# Scheduler — Cut / Copy / Paste appointments (Denticon parity): backend gaps

**Owner:** Frontend • **Screen:** `/scheduler` (Day view) • **Date:** 2026-10-30
**FE code:** `src/components/pages/Scheduler.tsx` (section `CUT / COPY / PASTE`),
`src/services/appointmentProceduresApi.ts` (`copyAppointmentProcedures`)

## What shipped on the frontend

| Action | Where | Behaviour |
|---|---|---|
| **Cut** | Right-click an appointment → Cut | Puts the appointment on the scheduler clipboard. The block stays on the grid with a dashed, faded outline (nothing is removed until it is pasted). A cancelled appointment can't be cut; use Copy to rebook it. |
| **Copy** | Right-click an appointment → Copy | Puts a copy on the clipboard (dashed outline on the source). |
| **Paste** | Right-click an open slot on **any date** → Paste (Move / Copy) | **Cut:** `PATCH /appointments/{id}` with the new `date`, `start_time`, `end_time`, `duration`, plus `operatory_id` and the working `office_id` when the operatory changes. Clipboard clears.<br>**Copy:** `POST /appointments` (same patient, provider, procedure label, duration and notes; status `Scheduled`; `is_new_patient: false`; no lab case), then one `POST /appointment-procedures` per live source line (status `TP`, no treatment-plan link). The clipboard stays, so the copy can be pasted into several slots. |
| Clipboard banner | Under the toolbar | Shows the patient, procedure, duration and source slot, with Cancel/Clear. **Esc** also clears it. The clipboard is kept in `sessionStorage` (`dentc:scheduler:clipboard`), so it survives a trip to the patient chart and back in the same tab. |

Client-side guards before every paste: same-operatory overlap (`hasSlotConflict`) on the loaded day,
office closed / outside office hours / lunch (slot not offered), and the office-schedule confirmation
(`scheduleIssueFor`).

## Backend gaps

| ID | Priority | Gap | FE workaround today | Ask |
|----|----------|-----|---------------------|-----|
| **SCHED-CCP-1** | P1 | **No atomic copy.** Copy is `POST /appointments` plus N separate `POST /appointment-procedures` calls with no transaction. If a procedure POST fails, the new appointment exists without some or all of its procedures. | `Promise.allSettled` and an alert telling the user to open the new appointment and add the missing lines. | `POST /api/v1/appointments/{id}/copy` `{date, start_time, operatory_id, provider_id?, office_id?}`: clones the appointment and its live procedure lines in one transaction and returns `AppointmentSchedulerRead`. |
| **SCHED-CCP-2** | P1 | **No server-side double-booking or office-hours check.** `POST` and `PATCH /appointments` list no 409; overlap is checked only by the client, and only against the appointments it has loaded. Two users pasting into the same chair at the same time will double-book it. Closed-day, outside-hours and lunch rules are client-side only. | Client `hasSlotConflict` plus the schedule confirmation. | Reject an overlap in the same operatory (excluding cancelled and archived) with **409 `slot_conflict`** (and an optional `allow_overlap` flag for intentional double-booking). Validate against `offices/{id}/schedule`. |
| **SCHED-CCP-3** | P2 | **Copied procedure lines carry the source's fee and insurance estimates.** The server pricing engine is not run again for the new date, provider or coverage state (for example, frequency used up by the original). | The snapshot is copied as is. | The copy endpoint (CCP-1) should re-price lines through the pricing engine, or `POST /appointment-procedures` should stamp fee and estimate server-side when they are omitted. |
| **SCHED-CCP-4** | P2 | **No "moved from / by" history.** Cut → Paste, like drag-and-drop, is a plain PATCH. Denticon keeps reschedule history and a reschedule count. Same as **NA-B8**. | None; only `updated_at` changes. | Record `rescheduled_from_date/time/operatory`, `rescheduled_by` and `reschedule_count` on the PATCH, or keep an `appointment_history` table. |
| **SCHED-CCP-5** | P2 | **Treatment-plan link on copy.** Copying a line with `treatment_plan_item_id` would schedule the same plan item twice, and there is no server rule or flag for a "scheduled" plan item. | Copies drop `treatment_plan_id` and `treatment_plan_item_id`, and lines are copied as `TP`. | Define the rule: either reject a second live appointment line for the same `treatment_plan_item_id` (409), or expose `scheduled_appointment_ids` on the plan item so the UI can ask the user. |
| **SCHED-CCP-6** | P3 | **Move latency.** `PATCH /appointments/{id}` takes 10–30 s (`x-process-time`), as seen with drag-and-drop. | The block pulses until the server confirms. | Profile the PATCH path (likely enrichment, ETag or audit work). |
| **SCHED-CCP-7** | P3 | **Stale cut.** A cut can sit on the clipboard while another user changes or deletes the appointment. PATCH supports `If-Match` / 412, but the scheduler feed (`AppointmentSchedulerRead`) carries no ETag or version. | Paste PATCHes only date, time and operatory; a deleted source surfaces the 404 in an alert. | Add `etag` / `version` (or `updated_at`) to `AppointmentSchedulerRead` so Paste can send `If-Match`. |

| **SCHED-CCP-8** | P3 | **The scheduler feed omits `notes`.** `GET /appointments/scheduler` has no `notes`, so the clipboard snapshot has none (found live: the first copy lost the source's "recall" note). | Paste (Copy) re-reads the source with `GET /appointments/{id}` before creating the copy. | Add `notes` to `AppointmentSchedulerRead`, which saves one round trip per paste. |
| **SCHED-CCP-9** | P3 | **Status casing is inconsistent.** Stored `status` values are mixed case (`scheduled`, `Confirmed`, `Scheduled`), and create stores whatever casing it is sent. | The UI normalises for display; copies are created as `Scheduled`, matching the existing create path. | Normalise `status` server-side to the `appt_status` definition codes. |

## Live verification (2026-10-30, Test_Dental_Group, office 2)

- **Cut → Paste across dates and chairs:** Park, Haechan moved 10/29 15:00 op-2-2 → 11/02 13:20 op-2-1 in about 6.6 s. The server row confirmed the new date, time and operatory. It was then cut and pasted back to 10/29 15:00 op-2-2, which the server also confirmed.
- **Copy → Paste:** Tanski, John (10/19, 4 procedure lines) pasted twice on 11/02 (14:20 and 15:20, op-2-3). Each copy has the same patient and provider, status `Scheduled`, and 4 lines as `TP` with no plan link. After the CCP-8 workaround, notes copied too. The clipboard survived a full page reload.
- **Overlap guard:** pasting at 15:10 over the 15:20 copy was blocked with a message, and no request was sent.
- **Cleanup:** both test copies and their 8 procedure lines were deleted (soft delete).

## Not gaps (by design)

- Lab-case fields, status timestamps and `cancellation_*` fields are deliberately **not** copied: a copied
  appointment is a new, unconfirmed visit.
- A cut-and-pasted appointment keeps its id, lab case, procedures and status. Only the slot and office change.
