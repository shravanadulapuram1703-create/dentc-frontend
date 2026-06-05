# Scheduler Module — Backend Dev Report (API Gaps)

This report aggregates backend/API gaps discovered during the Scheduler module audit
(7 independent area reports). Each entry follows the standard format. Gaps are deduped
and ordered roughly by severity/blast radius.

---

## ✅ RESOLUTION LOG — 2026-06-03 (backend shipped + frontend adopted)

The backend team implemented the gaps (migration `a7b8c9d0e1f2`, in `openapi.json`). Orval
client regenerated (`npm run api:sync`). Frontend adoption (all `tsc -b` + `eslint` green,
live-verified at :5173 against backend :8000):

- **Operatory→Provider (Gap 1):** `OperatoryRead.provider_id` added → `Operatory.provider_id`
  in `schedulerApi`; operatory column header shows the resolved provider name; operatory→provider
  auto-fill restored in both modals (`getDefaultProvider`/`handleOperatoryChange`/slot effect).
- **Statuses + colors (Gap 4):** `fetchAppointmentStatuses` now reads `color` + `sort_order` from
  `definitions` and sorts; the Set-Status menu / filters are driven by it.
- **Status transitions server-owned (Gap 5):** `updateAppointmentStatus` now calls
  `PATCH /appointments/{id}/status` (body `{status}`) and maps the returned denormalized row;
  client no longer stamps `confirmed_on`/`checked_in_on`/`checked_out_on`.
- **Patient context (Gap 6):** `handleGoToPatient` uses `GET /patients/{id}/context`.
- **Denormalized calendar feed (Gap 7/9):** `fetchAppointments` now uses
  `GET /appointments/scheduler` (server-resolved `patient_name`/`provider_name`/`operatory_name`,
  uncapped range for day/week/month). Removed `resolvePatientNames` N+1 fan-out and the
  Scheduler background-resolution effect. **Verified live: 13 appts in one request, zero
  `/patients/{id}` calls.** Status/provider/operatory filters applied client-side (the feed
  only filters by date/office).
- **Responsible party + patient type (Gap 8):** bound `PatientRead.responsible_party_id` /
  `patient_type` in `convertPatientToSearchResult` (placeholders removed).
- **Office scoping (Gap 2):** confirmed live — `office_id` threaded to operatories/providers/
  appointments/config; `definitions` left tenant-scoped (no `office_id`).
- **Still open:** Print (routing slip / walkout) — no backend report endpoint yet; buttons remain
  removed/gated. Inline modal validation is a FE polish item (current hard-stop alert is acceptable).

The original gap entries below are retained for history.

> Field-naming note: per project convention all data fields are **snake_case** and must
> stay identical to the backend. Several gaps below exist because the frontend's
> `schedulerApi.ts` anti-corruption layer invents camelCase shapes and string sentinels
> that diverge from the generated `snake_case` DTOs.

---

## Missing API — Operatory → Provider linkage

- **Module:** Scheduler
- **Screen:** Day-view calendar column headers; New Appointment modal; Add/Edit Appointment form
- **Business Requirement:** Each operatory column should display its assigned provider, and
  selecting an operatory should auto-populate the provider on the appointment form.
- **Current Status:** `OperatoryRead` exposes only `id`, `office_id`, `name`, `display_order`,
  `is_active`, `created_at` — **no provider field**. The frontend (`schedulerApi.ts:430`)
  hardcodes `provider: ""` for every operatory, while the UI reads `operatory.provider`
  in `Scheduler.tsx:1189`, `NewAppointmentModal.tsx:269`, and `AddEditAppointmentForm.tsx:376`.
  Result: blank provider line in headers and a dead auto-fill path.
- **Suggested Endpoint:** `GET /api/v1/operatories` returns a `provider_id` (FK to providers),
  or a dedicated `GET /api/v1/operatory-providers` mapping endpoint.
- **Expected Request Model:** `ListOperatoriesParams { office_id?: number; page; size }` (unchanged).
- **Expected Response Model:** `OperatoryRead { id, office_id, name, display_order, is_active, created_at, provider_id?: string | null }` (add `provider_id`, optionally `provider_name`).
- **Reason Required:** The UI assumes operatories carry a default provider in 3+ places.
  Without a backend linkage the operatory→provider auto-fill is impossible and column
  headers render blank.
- **Impact on Frontend:** Once `provider_id` is returned, remove the `provider: ""` stub,
  resolve provider name from the providers list, and wire operatory-selection auto-fill.
  Until then the provider must be selected manually and the header line removed.

---

## Missing API — Office-scoped reference data (operatories / providers / config / procedure types)

- **Module:** Scheduler
- **Screen:** Scheduler page load; New Appointment modal metadata load
- **Business Requirement:** In a multi-office tenant, only the current office's operatories,
  providers, scheduler config (hours/slot interval), and procedure types should load.
- **Current Status:** `fetchOperatories()`, `fetchProviders()`, `fetchProcedureTypes()`, and
  `fetchSchedulerConfig()` accept an optional `officeId` but are **never called with it**
  from `Scheduler.tsx` (TODO comments at lines 198, 216, 248) or `NewAppointmentModal.tsx`
  (lines 198-201). `currentOffice` is a string like `"OFF-1"` and is never converted to a
  numeric `office_id`. Note: the generated list params already support `office_id`
  (`ListOperatoriesParams.office_id`, `ListProvidersParams.office_id`), so operatories/
  providers are mostly a **frontend wiring** gap; only procedure-type filtering and the
  office-id source are genuine backend questions.
- **Suggested Endpoint:** `GET /api/v1/operatories?office_id={n}`, `GET /api/v1/providers?office_id={n}`,
  `GET /api/v1/offices/{office_id}` (config), and confirm whether
  `GET /api/v1/definitions?group_code=procedure_type` should accept an `office_id` filter.
- **Expected Request Model:** numeric `office_id` query param on each list endpoint.
- **Expected Response Model:** existing list/`OfficeRead` shapes, filtered to the office.
- **Reason Required:** Without office scoping, every office sees all offices' operatories,
  providers, and a single global default scheduler config (hardcoded 8–17h, 10-min slots).
- **Impact on Frontend:** Add a shared `office_id` extractor (`"OFF-1" → 1`) and thread it
  through all metadata fetches and the appointments fetch. Confirm whether definitions
  need office scoping before adding a param the backend ignores.

---

## Missing API — New-patient-during-scheduling flow (patient_id contract)

- **Module:** Scheduler
- **Screen:** New Appointment modal (Quick Save); Scheduler `handleSaveAppointment`; Add/Edit form
- **Business Requirement:** A user can create a brand-new patient while booking an
  appointment and have both persisted atomically/consistently.
- **Current Status:** `AppointmentCreate.patient_id` is `number | null` (verified in
  `appointmentCreate.ts:11`). The frontend instead sends **strings**: the literal `"NEW"`
  (`Scheduler.tsx:777`), or a `chart_no` string like `"CH-001"`
  (`NewAppointmentModal.tsx:584`, `AddEditAppointmentForm.tsx:766`). `schedulerApi.createAppointment`
  (line 325) passes `patient_id` through **without numeric conversion**. The `"NEW"` branch
  in `Scheduler.tsx` never actually calls `createPatient`, so no patient is created. Behavior
  of `patient_id: null` (auto-create vs reject) is undocumented.
- **Suggested Endpoint:** Either (A) document the two-step flow — `POST /api/v1/patients`
  then `POST /api/v1/appointments` with the returned numeric `id`; or (B) extend
  `POST /api/v1/appointments` to accept an optional nested `patient` object and create the
  patient server-side, returning the new `patient_id`.
- **Expected Request Model:** (A) `AppointmentCreate { patient_id: number | null, ... }`; or
  (B) `AppointmentCreate { patient: PatientCreate | null, patient_id: number | null, ... }`.
- **Expected Response Model:** `AppointmentRead` with the resolved numeric `patient_id`.
- **Reason Required:** Clarifies whether the frontend must pre-create the patient. Today the
  "new patient mid-scheduling" path is non-functional and string `patient_id`s will 422.
- **Impact on Frontend:** Stop using `chart_no`/`"NEW"` as `patient_id`. Always create the
  patient first, capture numeric `id`, and send `patient_id: number` (or `null`). Add a
  numeric coercion/guard in `schedulerApi.createAppointment`.

---

## Missing API — Appointment status definitions (enumerated statuses + colors)

- **Module:** Scheduler
- **Screen:** Set Status context submenu; appointment cell color rendering
- **Business Requirement:** Status options and their colors should be backend-driven so the
  list stays in sync across the app.
- **Current Status:** The Set Status submenu hardcodes a 10-item array
  (`Scheduler.tsx:1590-1600`) and duplicates colors in `getStatusColor()` (lines 452-473),
  instead of consuming `fetchAppointmentStatuses()` (which already calls
  `GET /api/v1/definitions?group_code=appt_status`). Backend accepts any free-text status.
- **Suggested Endpoint:** `GET /api/v1/definitions?group_code=appt_status` returning the
  canonical statuses (and a `color` field if colors should be centralized).
- **Expected Request Model:** `ListDefinitionsParams { group_code: "appt_status" }`.
- **Expected Response Model:** `DefinitionRead[] { code, display_name, color?, sort_order? }`.
- **Reason Required:** Hardcoded status list/colors drift from backend; new/removed statuses
  won't surface in the UI.
- **Impact on Frontend:** Replace the hardcoded array and color map with the fetched
  definitions; render status colors from the response.

---

## Missing API — Status-transition timestamps (confirmed/checked_in/checked_out)

- **Module:** Scheduler
- **Screen:** Set Status menu; check-in/check-out workflow
- **Business Requirement:** Changing status to Confirmed / In Reception / Checked Out should
  record the transition time for the audit trail and reporting.
- **Current Status:** `AppointmentUpdate` supports `confirmed_on`, `checked_in_on`,
  `checked_out_on` (`appointmentUpdate.ts:34-36`), but `updateAppointmentStatus`
  (`schedulerApi.ts:405-415`) only sets `is_missed`/`is_cancelled` and never populates the
  timestamps.
- **Suggested Endpoint:** `PATCH /api/v1/appointments/{id}` (existing) — confirm whether the
  backend stamps these server-side on status change, or expects the client to send them.
- **Expected Request Model:** `AppointmentUpdate { status, confirmed_on?, checked_in_on?, checked_out_on? }`.
- **Expected Response Model:** `AppointmentRead` reflecting the updated timestamps.
- **Reason Required:** Clarifies ownership of transition timestamps. If client-owned, the
  frontend must send them; if server-owned, the frontend should stop guessing.
- **Impact on Frontend:** Expand `updateAppointmentStatus` to set the relevant timestamp on
  each transition (or rely on server stamping once documented).

---

## Missing API — Patient context enrichment for cross-module navigation

- **Module:** Scheduler → Patient module hand-off
- **Screen:** "Go to patient" navigation (`handleGoToPatient`)
- **Business Requirement:** Navigating from an appointment to the Patient module should carry
  real demographics, insurance, balances, and visit history.
- **Current Status:** `handleGoToPatient` (`Scheduler.tsx:888-905`) writes a **fully
  hardcoded** patient context to sessionStorage (age 34, gender M, dob 03/15/1990,
  "Delta Dental PPO", balance 1245.0, recall dates, etc.). None of it comes from the backend.
- **Suggested Endpoint:** `GET /api/v1/patients/{id}` (or a `/patients/{id}/context` aggregate)
  returning demographics + insurance + balance + visit dates.
- **Expected Request Model:** path param numeric `id`.
- **Expected Response Model:** `PatientRead` (+ insurance/ledger/visit aggregates if a
  dedicated context endpoint is provided).
- **Reason Required:** Downstream Patient module currently receives fabricated facts, which
  corrupts ledger/insurance/schedule views.
- **Impact on Frontend:** Replace the hardcoded object with a real patient fetch keyed by the
  numeric appointment `patient_id`.

---

## Missing API — Denormalized names on AppointmentRead (patient / provider / operatory)

- **Module:** Scheduler
- **Screen:** Day/Week/Month calendar; Add/Edit Appointment form
- **Business Requirement:** Appointment cells and the edit form must show human-readable
  **names** (patient "Last, First", provider name, operatory name), not raw ids.
- **Current Status:** `AppointmentRead` carries only `patient_id` (number), `provider_id`,
  and `operatory_id` — no denormalized names. The frontend resolves provider/operatory names
  from the `/providers` and `/operatories` lists, but there is **no batch patient lookup**, so
  `schedulerApi.resolvePatientNames` fans out `GET /patients/{id}` per distinct patient id
  (N+1). For a month view this can be dozens–hundreds of requests. `fetchAppointment` (single,
  used by the edit form) must likewise re-fetch the provider/operatory lists + the patient just
  to display names.
- **Suggested Endpoint:** Either (a) add `patient_name`, `provider_name`, `operatory_name`
  (read-only, server-resolved) to `AppointmentRead`; or (b) add a batch
  `GET /api/v1/patients?ids=1,2,3` returning `PatientRead[]` so names resolve in one call.
- **Expected Request Model:** unchanged for (a); `ids: number[]` query for (b).
- **Expected Response Model:** `AppointmentRead` + `*_name` fields, or `PatientRead[]`.
- **Reason Required:** Without it, every calendar/edit render does N+1 patient fetches; failures
  degrade to "Patient <id>". Denormalized names (or a batch endpoint) remove the N+1 entirely.
- **Impact on Frontend:** When (a) ships, drop `resolvePatientNames` and bind `patient_name`
  directly; when (b) ships, replace the per-id fan-out with one batch call.

---

## Missing API — Responsible Party ID and Patient Type on PatientRead

- **Module:** Scheduler (patient search results)
- **Screen:** New Appointment modal patient search/selection
- **Business Requirement:** Display the responsible party and patient type (ortho vs general)
  for a selected patient.
- **Current Status:** `PatientRead` has neither field. The frontend hardcodes `respId: "R-001"`
  and `patientType: "General"` for every patient (`NewAppointmentModal.tsx:339-341`, with
  comments noting the fields don't exist on `PatientRead`).
- **Suggested Endpoint:** `GET /api/v1/patients` / `GET /api/v1/patients/{id}` should return
  `responsible_party_id` and `patient_type` (or `is_ortho`).
- **Expected Request Model:** unchanged list/detail params.
- **Expected Response Model:** `PatientRead { ..., responsible_party_id?: string | null, patient_type?: string | null }`.
- **Reason Required:** These are real practice-management fields shown in the UI; today they
  are placeholders for all patients.
- **Impact on Frontend:** If supported, bind to the real fields; otherwise remove `respId`/
  `patientType` from the search-result type and UI.

---

## Missing API — Weekly / Monthly view date-range fetching

- **Module:** Scheduler
- **Screen:** Calendar view-mode switching (daily/weekly/monthly)
- **Business Requirement:** Weekly and monthly views must fetch the appropriate date range.
- **Current Status:** `viewMode` state exists but is never read; only daily renders. Fetch
  always sends `date_from === date_to` (single day) at `Scheduler.tsx:307-308`. `ListAppointmentsParams`
  already supports `date_from`/`date_to`, so this is primarily a **frontend** gap — listed
  here only to confirm the backend imposes no max range.
- **Suggested Endpoint:** `GET /api/v1/appointments?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`
  (existing) — confirm max span / pagination behavior for month-wide queries.
- **Expected Request Model:** `ListAppointmentsParams { date_from, date_to, office_id, size<=200 }`.
- **Expected Response Model:** `PaginatedResponse<AppointmentRead>`.
- **Reason Required:** Need confirmation that month-range queries are supported within the
  `size<=200` pagination limit.
- **Impact on Frontend:** Implement `getDateRange(selectedDate, viewMode)` and paginate if a
  month exceeds 200 results.

---

## Optional / Documentation — procedure_label validation

- **Module:** Scheduler
- **Screen:** Appointment create/edit (procedure type dropdown)
- **Business Requirement:** Procedure type chosen in the UI should be a valid definition.
- **Current Status:** Backend stores `procedure_label` as free-text (no FK). The UI sources
  options from `GET /api/v1/definitions?group_code=procedure_type` but the backend does not
  validate the submitted label against them (`schedulerApi.ts:334`).
- **Suggested Endpoint:** `POST /api/v1/appointments` — either enforce `procedure_label` as a
  FK/enum against definitions, or document that it is intentionally free-text.
- **Expected Request Model:** `AppointmentCreate { procedure_label?: string | null }`.
- **Expected Response Model:** `AppointmentRead`.
- **Reason Required:** Clarifies whether the frontend must enforce membership or can pass
  arbitrary labels.
- **Impact on Frontend:** If free-text is intentional, no change; if FK-validated, send the
  definition code and surface validation errors.

---

## Optional / No-backend — Cut / Copy / Paste / Reschedule / Print / Quick Fill

- **Module:** Scheduler
- **Screen:** Context menu and header toolbar
- **Business Requirement:** Clipboard-style appointment moves, reschedule, print routing
  slip / walkout report, and quick-fill.
- **Current Status:** These buttons render with no handlers (`Scheduler.tsx:1095-1111`,
  1337-1354). Reschedule can reuse `PATCH /appointments/{id}`; cut/copy/paste can be
  client-side. Print (routing slip / walkout report) has no backend.
- **Suggested Endpoint:** Print/report generation may need `POST /api/v1/reports/routing-slip`
  / `walkout-report` (or render client-side). Cut/copy/paste/reschedule need no new backend.
- **Expected Request Model:** report endpoints: `{ appointment_id }`.
- **Expected Response Model:** report endpoints: PDF/HTML payload.
- **Reason Required:** Only print/report features are genuinely blocked on backend; the rest
  are frontend implementation.
- **Impact on Frontend:** Implement reschedule/clipboard client-side; gate print until a
  report endpoint exists, or remove the buttons.
