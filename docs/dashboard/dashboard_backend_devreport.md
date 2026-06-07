# Dashboard — Backend Dev Report

> Status of the backend surface for the **Dashboard Modernization** phase.
> Produced from a full sweep of `openapi.json` + the generated Orval client (`src/api/generated/**`).
> Convention reminder: all API data fields are **snake_case**; bind UI/state directly to them.

## TL;DR

The DentC backend exposes **no aggregation / reporting / analytics / stats / dashboard endpoints**
whatsoever. Searches of `openapi.json` for `/dashboard`, `/report`, `/summary`, `/analytics`,
`/stats`, `/metrics`, `/kpi`, `/count`, `/overview`, `/utilization` return nothing except the two
single-record composites `/treatment-plans/{plan_id}/summary` and
`/patients/{patient_id}/balance` + `/ledger`.

Consequence: **every KPI tile, trend chart, and "office performance" rate must be computed
client-side** by paging the relevant list endpoint (`size` capped at **200**) and aggregating in the
browser. This is acceptable for single-office / single-day windows but is an N+1 / multi-page hazard
for month-range and practice-wide figures. The single highest-leverage backend ask is a
**`GET /api/v1/dashboard/summary?office_id=&date=`** roll-up endpoint.

A second class of widgets has **no backing data model at all** (tasks, insurance verification,
notifications, refunds, leads/conversion) — these are true gaps, not just missing aggregation.

---

## 0. Live-verified backend latency (Phase 1–2 finding)

During live verification against the dev DB (~61k patients), **every list query took
~27–55 seconds** — including `GET /patients?is_active=true&size=1` (a pure
`meta.total` count) at ~54s, `GET /appointments?date_from=…` at ~28s, and
`GET /patient-payments?…` at ~30–48s. Logins took ~10s. This is independent of the
frontend.

Implications:
- The 3-second dashboard load target is **unachievable** with the current backend
  regardless of frontend optimization. KPI tiles that read `meta.total` are single
  cheap calls but still gated by this latency.
- **Client-side analytics aggregation is impractical** here: a date-range fan-out that
  pages multiple 200-row pages multiplies a ~30–50s/page cost into minutes. The
  Analytics widget was therefore made **opt-in** (loads on demand) with paging capped
  at 3 pages/resource and an explicit "capped sample" notice.
- Highest-impact backend asks (beyond §2): **add DB indexes** on the filter/sort
  columns used by list endpoints (`created_at`, `is_active`, `payment_date`,
  `date_of_service`, appointment `date`), make `?size=1` count queries cheap (or add
  count endpoints), and ship the `/dashboard/summary` + `/dashboard/trends` roll-ups so
  the dashboard isn't paging raw rows at all.

## 1. Generic CRUD vs. aggregation — the core gap

Every resource follows the same shape: `GET /api/v1/<resource>` (paginated list, `size` max 200,
free-text `search`, snake_case filters) + `GET /api/v1/<resource>/{item_id}` + Create/Update/Delete.
The generated client exports, per GET: the plain fn (`listX`), TanStack `getXQueryOptions` /
`getXQueryKey` factories, **and** a `useListX` query hook; mutations export `useCreateX` etc.
Lists return `PaginatedResponse<…>` with `.items` + `.meta.total` (use `meta.total` for cheap counts).

There is **no** group-by / sum / count-by-status endpoint anywhere, so "how many appointments are
checked-in today" or "total production this month" require either one filtered call per bucket (read
`meta.total`) or pulling the rows and tallying.

---

## 2. Missing aggregation / reporting endpoints (data EXISTS, roll-up does not)

These widgets are buildable today via client-side aggregation, but each would be far cheaper and
more accurate with a server roll-up. **Priority order:**

| # | Proposed endpoint | Powers | Why it's needed |
|---|---|---|---|
| 1 | `GET /api/v1/dashboard/summary?office_id=&date=` → `{appointments_today, by_status, patients_seen, new_patients, production_scheduled, production_completed, collections, ar_outstanding, claims_pending, claims_denied, recalls_due}` | All KPI cards | One call replaces ~10 multi-page client aggregations; makes the 3-second load target realistic |
| 2 | `GET /api/v1/dashboard/trends?metric=&from=&to=&granularity=day\|week\|month` | Analytics charts (appointment/revenue/patient/provider trends) | No time-series endpoint exists; `Reports.tsx` currently uses hardcoded mock arrays |
| 3 | `GET /api/v1/reports/provider-productivity?office_id=&from=&to=` → per-provider `{scheduled_production, completed_production, patient_count, booked_minutes, available_minutes}` | Provider Productivity widget | Removes a heavy 3-endpoint client fan-out **and** supplies the utilization denominator (see §3) |
| 4 | Practice-wide A/R aggregate: `GET /api/v1/reports/ar-summary?office_id=` (total outstanding + aging buckets) | Financial Overview → Outstanding Balances | `/patients/{id}/balance` is per-patient only; office-wide total is currently infeasible |
| 5 | `production` summary or a **date filter on `/appointment-procedures`** | Today's Production KPI | `/appointment-procedures` has **no date filter** → forces an N+1 (one call per appointment) to total scheduled production |
| 6 | `due_date_from` / `due_date_to` (+ `office_id`) on `GET /api/v1/patient-recalls` | Recall KPI + Recall/Recare widget + Tasks queue | No due-date range filter today; "due today/this week/this month" buckets must page all recalls and filter client-side |
| 7 | `office_id` filter on `GET /api/v1/patient-payments` | Today's Collection / Revenue KPIs per office | Payments list is tenant-scoped only; per-office revenue must be filtered client-side (and the row carries no office) |

---

## 3. Missing metrics (no field/denominator to compute them)

- **Provider utilization %** — booked minutes are derivable (sum appointment `duration`), but there is
  **no provider working-hours / shift / capacity** model and `ProviderRead` carries no hours. The
  denominator does not exist in the API. Needs endpoint #3 above, or a provider-hours resource.
- **New-patient conversion rate** — `AppointmentRead.is_new_patient` gives a new-patient appointment
  *count*, but there is **no leads / inquiries / marketing-funnel** entity to supply the conversion
  base. Only a raw count is buildable, not a true rate.
- **Appointment fill rate / chair utilization denominator** — "available chair-minutes" must be
  synthesized from `listOperatories` (active chair count) × `getOfficeSchedule` (open hours) −
  `listOfficeHolidays`. No endpoint returns bookable capacity directly.

---

## 4. Missing resources entirely (hard gaps — widget not buildable without new backend)

| Widget / feature | Missing resource | Notes / closest existing primitive |
|---|---|---|
| **Tasks & Work Queue** (generic tasks) | `GET/POST /api/v1/tasks` with `assignee_id`, `due_date`, `status` | No task/todo/work-queue entity at all. Sub-queues (unconfirmed appts, recalls, TP follow-ups) can be composed from their source modules; a generic user-assignable task list cannot. |
| **Insurance Verification** | eligibility/verification status filter or `/insurance-verifications` | `InsuranceSubscriberRead` carries `elig_status`/`elig_verified_on`/`elig_notes`/`term_date`, but the list endpoint has **no `elig_status` filter** and `elig_status` is an untyped string (no enum). Buildable only by paging all subscribers + client bucketing. A filter + enum (or dedicated endpoint) is needed. |
| **Outstanding documents** queue | global document-status list | `listPatientDocuments` **requires `patient_id`** and has no status / pagination → cannot query office-wide "unsigned/missing" docs. |
| **Refund requests** | `/api/v1/refund-requests` (or flag on payments) | Zero matches for `refund` in the spec. No refund workflow/status exists. |
| **Notifications Center** | `/api/v1/notifications` (severity, category, `is_read`, `target_user_id`, mark-read PATCH) | No notifications/events/alerts feed. Partial sources: `/patient-alerts` (per-patient clinical flags, persistent — no read state) and `/audit-logs` (admin-only raw HTTP action log, no severity/targeting). No webhook/SSE/push. |
| **Unified Quick Search** | `GET /api/v1/search?q=&types=` | No global cross-entity search. Each entity (patients, appointments, providers, insurance-carriers/plans/subscribers/employers) has its own `search` param → must fan out 4+ parallel calls and merge client-side. |
| **SMS / Email send actions** (Recall/Recare) | real send gateway | `/sms-messages` is a CRUD **log store** (persists a row, does not transmit). No email-send endpoint at all. Only `verify-telecom` (config check) exists. Actions can deep-link `tel:`/`sms:`/`mailto:` or log a record, but cannot send server-side. |
| **Check-In / Checkout / Walk-In** | typed status enum + walk-in flow | No walk-in endpoint. Check-in/checkout work **only** via `PATCH /appointments/{id}/status` with a free-text status string (`AppointmentStatusUpdate.status` has no enum) — the server stamps `checked_in_on`/`checked_out_on`. Status strings must be resolved from `/definitions` (group `appt_status`); they are not type-safe. |

---

## 5. Status / enum drift to confirm against live data

Several "status" fields are free-text strings with **no generated enum**, so exact token values must
be confirmed against backend data (or `/definitions`) before filtering on them:

- `AppointmentRead.status` / `AppointmentStatusUpdate.status` → resolve via `/definitions` group
  `appt_status` (also has a `color` field for status colors). Booleans `is_cancelled`, `is_missed`
  (no-show), and timestamps `checked_in_on` / `checked_out_on` are reliable and **enum-free** — prefer
  these over status strings where possible.
- `TreatmentPlanRead.status` (pending/accepted/rejected tokens unverified).
- `InsuranceClaimRead.status` (pending/denied tokens unverified).
- `InsuranceSubscriberRead.elig_status` (pending/failed tokens unverified, and unfilterable).
- `PatientProcedureRead.billing_status` (completed token unverified).

---

## 6. Per-widget buildability matrix

| Widget | Verdict | Primary endpoints | Blocking gap |
|---|---|---|---|
| Header (user/role/office/date/time) | ✅ available | `getMeFull`, `AuthContext` | — |
| Global Quick Search | 🟡 partial | `listPatients` / `listAppointments` / `listProviders` / `listInsurance*` | no unified endpoint → client fan-out |
| KPI: Today's Appointments | ✅ available | `listSchedulerAppointments`, `listAppointments`, `listDefinitions` | counts client-side (use bool flags) |
| KPI: Today's Production & Collection | 🟡 partial | `listAppointments`+`listAppointmentProcedures`; `listPatientPayments` | production = N+1 (no date filter on appt-procedures) |
| KPI: Patients | 🟡 partial | `listPatients` (`created_at_*`, `is_active`, `meta.total`); `listPatientRecalls` | recall "due" has no date filter |
| KPI: Revenue (d/w/m) | 🟡 partial | `listPatientPayments` (`payment_date_*`) | client paging; no office filter |
| Today's Schedule | ✅ available | `listSchedulerAppointments`, `updateAppointmentStatus`, `updateAppointment`, `listDefinitions` | utilization sub-metric is client-side |
| Patient Activity | 🟡 partial | `listSchedulerAppointments`, `listPatients`, `listDefinitions` | status buckets depend on tenant `appt_status` config |
| Tasks & Work Queue | 🟡 partial / ❌ | `listAppointments`, `listPatientRecalls`, `listTreatmentPlans` | no tasks entity; no insurance-verif; no global docs |
| Insurance Verification | 🟡 partial | `listInsuranceSubscribers` (client bucket on `elig_status`) | no filter/enum/endpoint |
| Treatment Acceptance | 🟡 partial | `listTreatmentPlans` (status counts) | $ metrics = N+1 via `getTreatmentPlanSummary` |
| Financial Overview | 🟡 partial | `listInsuranceClaims`, `listPatientPayments`, `getPatientBalance` | practice-wide A/R + refunds gaps |
| Recall & Recare | 🟡 partial | `listPatientRecalls`, `getPatient` | no due-date filter; no SMS/email send |
| Provider Productivity | 🟡 partial | `listProviders`, `listPatientProcedures`, `listAppointments` | utilization denominator missing |
| Office Performance | 🟡 partial | `listSchedulerAppointments`, `listOperatories`, `getOfficeSchedule` | conversion rate gap; capacity client-side |
| Notifications Center | 🟡 partial | `listPatientAlerts`, `listAuditLogs` | no notifications feed |
| Quick Actions panel | 🟡 partial | `createPatient`✅, `createAppointment`✅, `createTreatmentPlan`✅(no route), `createInsuranceClaim`✅(no route), `createPatientPayment`✅ | missing UI routes; walk-in/check-in not first-class |
| Analytics charts | 🟡 partial | `listAppointments`, `listPatientPayments`, `listPatientProcedures`, `listPatients` | no time-series endpoint; client bucketing |

Legend: ✅ available · 🟡 partial (client-side aggregation / unverified enum) · ❌ hard gap (no data model).

---

## 7. Frontend routing gaps (endpoint exists, UI route missing)

From `src/App.tsx` (react-router-dom v6 `<Routes>`, auth-gated only — no role gating):

- **Create Treatment Plan** — `createTreatmentPlan` exists; only TP route is a `PlaceholderPage`
  (`/patient/:patientId/treatment`); `/patient/:patientId/treatment-plan` in `GlobalNav` is a dead link.
- **Create Insurance Claim** — `createInsuranceClaim` exists; only claim **detail** route exists
  (`/patient/:patientId/claim/:claimId`); no new-claim or claims-list route.
- **Recalls list** — `listPatientRecalls` exists; `/patient/:patientId/recall` & `/reports/recall` in
  nav have **no matching route**.
- **Collect Payment** — `createPatientPayment` exists; no focused collect-payment route (only ledger/
  transaction screens).
- Dead nav links to clean up: `/patient/:patientId/treatment-plan`, `/recall`, `/information`,
  `/responsible-party`, `/medical`, and most insurance/transaction submenu paths (no catch-all route).
- `GlobalNav.tsx` still has camelCase office handling (`officeId`/`officeName`/`shortId`) — violates the
  snake_case convention; flag for cleanup.

---

## 8. Recommended backend work (summary, by priority)

1. **`GET /api/v1/dashboard/summary?office_id=&date=`** — single KPI roll-up (unblocks all KPI cards).
2. **`GET /api/v1/dashboard/trends?metric=&from=&to=&granularity=`** — analytics time-series.
3. **`GET /api/v1/reports/provider-productivity`** — provider widget + utilization denominator.
4. **Notifications resource** — `GET /api/v1/notifications` + mark-read, with severity/targeting.
5. **Generic tasks resource** — `GET/POST /api/v1/tasks`.
6. **Insurance eligibility**: `elig_status` filter + enum on `/insurance-subscribers` (or `/insurance-verifications`).
7. **Filters**: `due_date_from/to` + `office_id` on `/patient-recalls`; date filter on `/appointment-procedures`; `office_id` on `/patient-payments`.
8. **Practice-wide A/R aggregate**, **refund-requests resource**, **leads/conversion** model.
9. **SMS/email send gateway**; **typed appointment-status enum** + first-class check-in/checkout/walk-in.
10. **Unified `GET /api/v1/search`** across patients/appointments/providers/insurance.
