# Medical Alerts — surfacing in Prescriptions & Scheduler — backend gap report

**Audience:** backend team · **Date:** 2026-09-10 · **Branch:** `feature/uat-realse-v2`
**Related reports:** [`medical_history_backend_devreport.md`](./medical_history_backend_devreport.md) (MH-13, MH-14),
[`../scheduler/scheduler_appointments_backend_devreport.md`](../scheduler/scheduler_appointments_backend_devreport.md) (SCHED-APPT-4),
[`../prescriptions/prescriptions_backend_devreport.md`](../prescriptions/prescriptions_backend_devreport.md).

## 0. Requirement

When a patient's **Medical History → Medical Alerts** tab has an alert answered **YES** and saved
(e.g. *Allergic To → Penicillin*, *Cardiac Pacemaker*), that alert must be visible:

1. **Prescriptions tab** — whenever a provider adds a new prescription, the exact alerts
   (allergies / conditions + comments) must be in front of them so they do not prescribe against
   an allergy.
2. **Scheduler** — every appointment block for that patient must carry a red medical-alert icon
   so all staff know the patient has an active alert.

## 1. What the frontend does today (shipped, `tsc -b` + `eslint` clean)

| Piece | File | Behaviour |
|---|---|---|
| Shared alert reader | `src/features/medical-alerts/patientMedicalAlerts.ts` | `fetchPatientMedicalAlertSummary(patient_id)` = `GET /patient-medical-alerts?patient_id&is_active=true` **+** `GET /patient-alerts?patient_id&is_active=true` in parallel → active alerts (Medical History `response="yes"` rows + free-text patient alerts), grouped by legacy section (allergies first), plus the `ADDITIONAL_COMMENTS` text. 60 s per-patient cache; invalidated by the Medical History save. `usePatientMedicalAlerts()` hook. |
| Banner | `src/features/medical-alerts/MedicalAlertBanner.tsx` | Red **MEDICAL ALERT** strip: compact one-liner while browsing, full grouped list (+ comments, + "Open Medical History" link) in Add mode. Distinct states for *no history on file* (amber — unknown ≠ clear), *no active alerts* (green), *could not load* (amber + retry). |
| Prescriptions | `src/features/prescriptions/PrescriptionsPage.tsx` | Banner above the Rx list (`full` in Add mode, headed *REVIEW BEFORE PRESCRIBING*). **Save** re-states the alerts in a confirm ("MEDICAL ALERT — … Prescribe *Drug* anyway?"); also confirms when no medical history is on file or alerts could not be loaded. |
| Scheduler day view | `src/components/pages/Scheduler.tsx` | Red **✚** on the block when the feed's `has_alert` is true **or** the shared summary has alerts. Click → `MedicalAlertPopover` (alerts grouped by section + comments + link to Medical History). Hover tooltip lists the alerts. Legend entry added. |
| Scheduler week / month | `WeekView.tsx`, `MonthView.tsx` | Same ✚ via a `hasAlert(appt)` predicate (feed flag OR cached summary). |
| Details pop-out | `AppointmentDetailsPopover.tsx` / `fetchAppointmentDetails` | "⚕ Medical Alerts" section now reads the shared summary (was `/patient-alerts` only) and shows *Section: label*. |

**Live-verified 2026-09-10** (backend `127.0.0.1:8000`, tenant 1, patient **83917** "M, J"):
`GET /patient-medical-alerts?patient_id=83917` → rows 24 *frequent_headaches*=yes, 25 *cardiac_pacemaker*=yes,
26 *aspirin*=yes, 23 *cancer_tumor_or_growth*=no. Prescriptions tab shows
"3 active medical alerts · 1 allergy — Allergic To: **Aspirin** · Check, if applicable: Cardiac Pacemaker ·
Medical Conditions: Frequent Headaches".

---

## 2. Gaps

### MA-1 · Scheduler feed `has_alert` ignores Medical History YES answers — **Critical**

`AppointmentSchedulerRead.has_alert` is derived from `patient_alerts` only. A patient whose Medical
History has YES alerts but no free-text patient alert is reported as `has_alert: false`.

**Verified:** `GET /appointments/scheduler?date_from=2026-09-03&date_to=2026-09-03&office_id=1` →
`APPT-0e2df68a-…` (patient 83917, 3 YES alerts) has `has_alert: false`; `GET /patient-alerts?patient_id=83917`
→ `total: 0`. Every one of the 9 rows on that day had `has_alert: false`.

**Impact:** the flag the feed exists to provide is wrong for the common case, so the frontend still has
to fan out per patient (day view only, ≤40 patients) to draw the icon. In **week / month** views the ✚
only appears for patients whose summary happens to be cached — the feed flag would make it exact.

**Ask (either):**
- Compute `has_alert = EXISTS(patient_medical_alerts WHERE patient_id AND response='yes' AND is_active)
  OR EXISTS(patient_alerts WHERE patient_id AND is_active)`; **or**
- On create/update of a `patient_medical_alerts` row with `response='yes'`, upsert a `patient_alerts`
  row with `source_medical_alert_id` (the column exists and is always `null` today); deactivate it when
  the answer changes to `no` / the row is soft-deleted. The frontend already de-duplicates by
  `source_medical_alert_id`, so this is safe to ship without a frontend change.

### MA-2 · No per-patient alert summary / bulk lookup — **High**

There is no single call that answers "what are this patient's active alerts". The frontend makes
**two** list calls per patient (`patient-medical-alerts` + `patient-alerts`); the scheduler day view
does that for up to 40 patients (80 requests) after every date change, and the Details pop-out repeats it.

**Ask:** one of
- `GET /patients/{id}/medical-alerts/summary` → `{ alerts: [{id, source, code, label, section, comments,
  is_flash_alert, blocks_charges}], comments, history_on_file }` (the shape the frontend already builds);
- add `alerts` (same array) to `GET /patients/{id}/context` (`SchedulerPatientRead`) so the pop-out needs no extra call;
- add `alert_summary: string | null` ("Allergic To: Aspirin; Cardiac Pacemaker") next to `has_alert` on the
  scheduler feed so the block tooltip and the popover are populated without any fan-out;
- accept `patient_ids` (comma-list, ≤200) on `GET /patient-medical-alerts` and `GET /patient-alerts`.

### MA-3 · `section` / `alert_label` are inconsistent on `PatientMedicalAlertRead` — **Medium**

Rows written through the same screen come back with different `section` values for the same catalog
group, and some with none:

| id | alert_code | section (backend) | Legacy catalog group |
|---|---|---|---|
| 24 | frequent_headaches | `Medical Conditions` | Check, if applicable |
| 25 | cardiac_pacemaker | `null` | Check, if applicable |
| 26 | aspirin | `Allergic To` | Allergic To |
| 22 | autoimmune_disease | `null` | Check, if applicable |

The frontend falls back to the legacy catalog (`legacyCatalogs.ts`) for label and section, so the
banner renders — but the grouping differs by which client wrote the row.

**Ask:** populate `alert_label` and `section` server-side from the MEDALERT definition the `alert_code`
belongs to (MH-1 seeding is the prerequisite), and treat the client-sent values as optional overrides only.

### MA-4 · `is_flash_alert` / `blocks_charges` on answered alerts are always `false` — **Medium** (MH-14 follow-up)

`PatientMedicalAlertRead` now exposes both fields, but they are never derived from the Setup catalog's
`is_flash_alert` and cannot be set on `PatientMedicalAlertCreate` / `Update`. Verified: all 8 YES rows in the
tenant have `false / false`. The banner and the popover render the badges, so nothing will show until the
backend sets them.

**Ask:** derive from the MEDALERT definition on read, or accept them on create/update.

### MA-5 · No drug ↔ alert check and no acknowledgement audit on `POST /prescriptions` — **High (clinical safety)**

The backend accepts any prescription regardless of active alerts, and nothing records that the prescriber
saw them. The frontend's banner + confirm is the *only* guard, and it is not persisted.

**Ask:**
- `PrescriptionCreate.alerts_acknowledged: bool` + `acknowledged_alert_ids: int[]` (persisted, returned on
  `PrescriptionRead`) so the chart shows *which* alerts were on file when the Rx was written;
- optional: `prescription_library.allergy_keys: string[]` (e.g. `["penicillin","aspirin"]`) and a `409`/
  `warnings[]` from `POST /prescriptions` when a key matches an active YES alert — the frontend would show
  the server warning instead of its generic confirm.

### MA-6 · Sync semantics between the two alert tables are undefined — **Medium**

`patient_alerts.source_medical_alert_id` exists but nothing writes it; `PATCH /patient-medical-alerts/{id}`
to `response="no"` or `DELETE` (soft) has no effect on `patient_alerts`. Whichever option is chosen for MA-1,
define: what happens on YES→NO, on re-answer YES, on Copy Medical History (MH-4), and on
`POST /patients/register` with `medical_alerts[]`.

### MA-7 · "Additional Comments" is a magic alert row (MH-13) — **Low**

The prescriptions banner must special-case `alert_code = "ADDITIONAL_COMMENTS"` (it is not an alert) and
read its `comments`. A real `patient_medical_history.comments` field (or `comments` on the summary in MA-2)
removes the special case from every consumer.

### MA-8 · Latency on the endpoints these screens depend on — **High (UX)**

Measured during verification (local backend, warm process):

| Call | Time |
|---|---|
| `POST /auth/login` | 56 s |
| `GET /appointments/scheduler` (1 day, 9 rows) | 25 s |
| `GET /patient-medical-alerts?patient_id=…` | < 2 s |

The banner shows "Checking medical alerts…" until the two list calls return; on the scheduler the ✚
appears only after the fan-out completes. Both are acceptable at the alert endpoints' speed but the
feed/login times make the whole flow feel broken.

---

## 3. Summary

| # | Gap | Severity | Verified |
|---|---|---|---|
| MA-1 | Feed `has_alert` ignores Medical History YES answers | 🔴 Critical | ✓ |
| MA-5 | No drug↔alert check / no acknowledgement audit on prescriptions | 🔴 High | ✓ |
| MA-2 | No per-patient summary / bulk alert lookup (2 calls × N patients) | 🟠 High | ✓ |
| MA-8 | Login / scheduler-feed latency | 🟠 High | ✓ |
| MA-3 | `section` / `alert_label` inconsistent or null on answers | 🟡 Medium | ✓ |
| MA-4 | `is_flash_alert` / `blocks_charges` never set on answers | 🟡 Medium | ✓ |
| MA-6 | Sync semantics between `patient_medical_alerts` and `patient_alerts` undefined | 🟡 Medium | ✓ |
| MA-7 | Comments stored as a magic alert row | 🔵 Low | ✓ |

**Fastest win:** MA-1 (feed flag) + MA-2 (`alert_summary` on the feed and `alerts` on patient context)
remove every remaining fan-out and make week/month icons exact; MA-5 is the clinical-safety item.
