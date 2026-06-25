# Lab Tracking (M12) — Backend Dev Report

Frontend module: `src/features/lab-tracking/**`, route `/patient/:id/lab-tracking`
(patient secondary-nav icon "Lab Tracking", placed beside Prescriptions).

## How it maps to the backend

In legacy Denticon, **Lab Tracking is not a standalone screen** — a "lab case" is an
appointment with lab work attached, edited inside the Scheduler appointment form. The
DentC backend mirrors this: lab data lives on the appointment.

`AppointmentRead` / `AppointmentUpdate` / `AppointmentCreate` carry:

| Field              | Type            | Legacy control |
| ------------------ | --------------- | -------------- |
| `has_lab`          | bool            | "Lab" checkbox |
| `lab_cost`         | decimal string  | "Lab Cost"     |
| `lab_sent_on`      | date            | "Sent on"      |
| `lab_due_on`       | date            | "Due on"       |
| `lab_received_on`  | date            | "Recvd. on"    |

The module derives each case's **status** from the dates
(`received` → `overdue` (sent, past due) → `sent` → `not_sent`). Check-in =
PATCH `lab_received_on` (+ `lab_cost`) on the appointment.

`requires_lab` exists on the procedure code (signals which procedures need a lab) but is
not yet surfaced here.

## Gaps

### LAB-1 — No lab-vendor (lab DDS) field on the appointment
Legacy lets staff pick the **lab vendor** ("Creative Dental", …) and a **Short Notice**
flag per case. `AppointmentRead/Update` have neither column (the existing
`schedulerApi.ts` `lab_dds` is a phantom view-model field that is never written). The
Edit/Check-in panel renders both controls (vendor input + datalist sourced best-effort
from `definitions` `group_code=LAB`, and a Short Notice checkbox) but marks them
**"not saved"** inline — they are display/session-only until the backend adds
`lab_vendor_id`/`lab_vendor` and `lab_short_notice` (or a dedicated lab-case table).
**Ask:** add a lab-vendor reference (FK to a labs/vendors resource or a definitions
group) and a short-notice flag to the appointment lab fields.

### LAB-2 — No lab filters on `GET /api/v1/appointments`
The list endpoint filters by `patient_id`, `provider_id`, `office_id`, `date`,
`date_from/to`, `status`, `search` — but **not** `has_lab`, `lab_sent_on`,
`lab_due_on`, or `lab_received_on`. The page pages through the patient's appointments
(size cap 200) and filters `has_lab` + status client-side. Fine per-patient; an
office-wide lab list (below) would be expensive.
**Ask:** add `has_lab` and lab-date range filters to the appointments list params.

### LAB-3 — `AppointmentRead` has no denormalized names
Unlike `AppointmentSchedulerRead` (which carries `patient_name`/`provider_name` but
**omits the lab fields**), `AppointmentRead` returns only ids. The module resolves
provider names from `/providers` (1 call, cached). The denormalized scheduler feed can't
be reused because it drops the lab columns.
**Ask:** either add the lab fields to `AppointmentSchedulerRead`, or denormalize
`provider_name` onto `AppointmentRead`.

### LAB-4 — No lab report / export endpoints
Legacy has a **Lab Report** (review by Not Sent / Not Received / Due Date) and a **Lab
Cost Report** (totals by sent/due/received date range), both with PDF/Excel output. There
are no reporting/aggregation/export endpoints, so both reports are generated client-side
(jsPDF + autotable) from the in-memory cases.
**Ask:** server-side lab report + cost aggregation (and PDF/Excel export) if office-wide
reporting is required.

### LAB-5 — Office-wide / cross-patient lab tracking not built
The legacy reports are office-wide (every patient's lab cases in a date range). This
module is **patient-scoped** (driven from the patient nav icon). An office-wide Lab
Tracking dashboard would need LAB-2 (server-side `has_lab` filtering) to avoid paging the
entire appointment book; until then it is intentionally out of scope.
