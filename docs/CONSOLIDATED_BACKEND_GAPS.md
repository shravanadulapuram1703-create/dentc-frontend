# DentC — Consolidated Backend Gaps Report

> **Audience:** Backend team
> **Source:** Aggregated from **47** per-module frontend dev-reports under `docs/**` (`*_backend_devreport.md`, `*_gaps.md`).
> **Purpose:** Single hand-off list of every backend gap the frontend hit while modernizing each module — missing endpoints, missing fields, wrong/inconsistent behavior, and un-enumerated code domains, each with the frontend workaround currently in place.
> **Date:** 2026-08-29 (supersedes the 2026-07-05 edition, which covered 29 reports)

---

## 1. How to read this

- **Gap ID** — the identifier used in the module's own dev-report (`docs/<module>/*_backend_devreport.md`). Use it to trace back to full detail; §10 maps every module to its source file.
- **Workaround** — what the frontend does *today* to ship without the backend. Every workaround is a source of drift, N+1 latency, or unpersisted data.
- **Severity** — as stated by each module report: **Blocker/Critical** (feature is broken or data is silently lost), **High** (major workaround / not scalable), **Medium** (audit/UX/consistency), **Low** (nice-to-have / parity polish).
- Rows marked ✅ are recorded as **delivered** by the backend and wired frontend-side; they are kept so nobody re-opens them.

### What changed since the 2026-07-05 edition

**Newly covered modules** (were not in the previous edition at all): Letters (LTR), Messaging (MSG), My Page (MP), Utilities (UTIL), AppointNow (AN), Payment Plans (OPP/RPP/PP), Patient Overview (PO), Patient Edit (PE), Patient Note Documents (NOTE-DOC), Add-Patient legacy parity (LEG), Add/Edit Appointment (APPT / APPT-PROC / SCHED-DEL), New-Appointment flow (NA-B), Claim Fill-Out (CLM-FO), plus the newer Account-Ledger (AL-9…AL-18) and Transactions (CHG-3…CHG-10, PROV, FEE) findings.

**Delivered since the last edition** (do not re-open): GAP-AP-1…18 (Add Patient columns), LEG-2/3/4/5/6/7/8/10/11/12/13/14, PROC-1…5, PICK-1/2, CHART-1, AL-1/2/4/5/7, PLAN-1/2/5/10 + partial PLAN-4, CHG-4/5/6, DICOM-1/2, LTR-1…12, Users #1…#7, Provider Setup #1…#7, the `POST /patients` 500, `PROV-2` (`bank_number`).

### Totals
- **~330 open gap rows** across 47 reports (setup/admin ~95, clinical ~85, patient/transaction/platform ~150).
- Cross-cutting themes recur far more often than one-off gaps — **fix the themes in §2 first** and a large fraction of the individual rows below collapse.

---

## 2. Cross-cutting themes (fix these first — highest leverage)

These patterns appear across most modules. Addressing them centrally resolves dozens of individual rows.

| # | Theme | Appears in | What to do |
|---|-------|-----------|------------|
| T1 | **No aggregation / roll-up endpoints** — everything is per-record CRUD; all KPIs, AR, aging, collections, dashboards computed client-side over truncated lists | Dashboard, Reports, Transactions, Account Ledger, My Page | Add office/tenant-scoped summary endpoints (financial-summary, collections, AR, aging, dashboard/summary) |
| T2 | **`*_by` fields are numeric ids with no name** — every "Modified By / Created By" renders as "User #385" | Progress Notes, Perio, Charting Setup, Notes Macros, Insurance, Users, Transactions, Payment Plans, Patient Edit | Embed `*_by_name` on read models (pattern already exists on some), or a bulk users-lookup |
| T3 | **Missing `updated_at` / `updated_by` audit columns** | Notes Macros, Charting (materials), Custom Toolbar, Users, Perio, Ledger, Progress Notes, Insurance plans, Payment Plans, Patients | Standardize a `TimestampMixin` (created/updated at+by) across auditable resources |
| T4 | **No `office_id` filter on list endpoints** (or param accepted but ignored server-side) — forces client-side filtering of whole tenant | Scheduler, Office Assignment, Reports, Users, Insurance, Payments | Honor `office_id` server-side on all list endpoints |
| T5 | **Un-enumerated status/code strings** — `status`, `carrier_type`, `coverage_type`, `category`, `referral_type`, `elig_status`, `plan_type` are free-text with no enum/lookup; UI shows raw codes | Scheduler, Dashboard, Reports, Insurance, Referrals, Notes Macros, Medical, Claims, Treatment Plans, Payment Plans | Expose `/definitions` groups (or enums) and document the code domain for each |
| T6 | **N+1 fan-out from thin read models** — appointment/lab/ledger feeds return ids only, so the UI fires one `GET /patients/{id}` (etc.) per row | Scheduler, Scheduler Appointments, Lab Tracking, Account Ledger, Reports, Patient Overview | Denormalize `*_name` and key fields onto the list/feed read models |
| T7 | **No bulk / transactional writes** — save-32-teeth, copy-toolbar, replace-items = N individual calls, non-atomic, partial-failure risk | Perio, Custom Toolbar, Office Assignment, Payment Plans, Pick List (resolved) | Provide bulk upsert / atomic replace endpoints |
| T8 | **No server-rendered export (PDF/Excel) & no attachments-to-record linkage** — all PDFs built client-side (jsPDF); uploaded docs orphan at patient level | Reports, Treatment Plans, Progress Notes, Prescriptions, Lab Tracking, Transactions, Payment Plans, Patient Notes, Perio | Server-side export endpoints; add record-scoped attachment FK |
| T9 | **Soft-delete vs hard-delete inconsistency** — some DELETEs flip `is_active`/`is_archived`, siblings hard-delete; deleted rows are still returned by the list that should hide them | Perio, Restorative, Treatment Plans, Fee Schedules, Payment Plans (PP-1), Appointments (SCHED-DEL-1), Appointment Procedures (APPT-PROC-4), Insurance Claims (AL-18) | Pick one convention per family; **always** filter the soft-deleted rows out of the default list, and expose `include_deleted=true` for the exception |
| T10 | **Free-text writes with hidden server-side side-effects** — an unvalidated string column drives date stamping / state changes on exact-match, so a near-miss value saves but silently does nothing | Claims (AL-18: `status` → submitted/paid/close dates), Treatment Plans (PLAN-20), Payment Plans (PP-8), Appointments (status) | Validate against an enum and reject the rest with 422; normalise case server-side |
| T11 | **Features with no backend home are surviving in `localStorage`** — this data is per-browser, invisible to other staff, and lost on a device change | Claim Fill-Out (CLM-FO-1), Group rights (Groups Gap 2), Restorative chart settings (REST-3), Perio per-user prefs (PERIO-BE-11), Utilities audit (UTIL-2), My Page tasks/prefs (MP-3/4), Patient context (PDP-1) | Each of these is a small resource; every one shipped is a stop-gap deleted |
| T12 | **Date/time representation** — date-only columns are returned bare and timestamps were naive-UTC, so every client re-derives the calendar day and drifts by one | Letters (LTR-11 ✅ fixed, LTR-14), Patients (DOB), Claims (Claim Sent Date), Add Patient, Patient Overview | Keep offsets on every datetime (done for Letters — please apply everywhere) and document that date-only fields are calendar dates, not instants |

---

## 3. Platform / Infrastructure (blocking)

| Module | Gap ID | Title | Description / Workaround | Endpoint / Resource | Severity |
|--------|--------|-------|--------------------------|---------------------|----------|
| Dashboard | 6 | **List-endpoint latency** | Live-verified 27–55s per list query against 61k patients; `?size=1` count ≈54s; login ≈10s. Makes the whole app feel broken. | All list endpoints | **Critical** |
| Payment Plans | PP-5 | **`/patients/{id}/balance` ~23s cold** | 23 479 ms cold vs 612 ms warm; every other call on the same screen is <800 ms. The screen must never block on it. | `GET /patients/{id}/balance` | **Critical** |
| Patient Notes | NOTE-DOC-3 | **`/uploads/**` served PHI unauthenticated** | Public static route exposed patient documents with no auth. Public mount has since been removed; frontend now resolves by path through `documentAccess.ts`. Confirm no environment still serves it, and finish the migration to `/content` or signed URLs. | static route | **Security** |
| Imaging | IMG-5 | No signed/expiring URLs for PHI imagery | Stable `file_url`, long-lived and guessable. | `patient-documents` | **Security** |
| Patient Notes | NOTE-DOC-2 | Documents stored on ephemeral local disk | Not GCS; lost on redeploy. Keep the `{patient_id}/{uuid}` prefix. | `patient-documents` | High |
| Letters | LTR-1 | Consent PDFs written to local disk | ✅ Delivered — object-store backed with `storage_backend`/`bucket`/`path` + `/content` proxy. A `storage_backend: "local"` row is flagged in the UI. | `patient-consents` | ✅ |
| Authentication | 2.1 | Forgot password — request reset | Missing; login "Forgot password" is a dead end. | `POST /auth/forgot-password` | High |
| Authentication | 2.2 | Reset password — validate token | Missing; cannot verify reset link before showing form. | `POST /auth/reset-password/validate` | High |
| Authentication | 2.3 | Reset password — submit | Missing; cannot set new password from token. | `POST /auth/reset-password` | High |
| Authentication | 2.4 | Legacy activation — verify user | Missing; legacy-user activation wizard step stubbed. | `POST /auth/legacy-user/verify` | High |
| Authentication | 2.5 | Legacy activation — create password | Missing; cannot complete legacy activation. | `POST /auth/legacy-user/create-password` | High |
| Authentication | 4 | Standardize security responses | 401/403/423/429/400 semantics not agreed; UI maps them blind. | `/auth/*` | Medium |
| Patient Context | PDP-1 | Read user's last patient | No endpoint; persisted in localStorage only. | `GET /users/me/last-patient` | High |
| Patient Context | PDP-2 | Persist user's last patient | No write endpoint. | `PUT /users/me/last-patient` | High |
| Patient Context | PDP-3 | Storage column | No `last_patient_id` on users table. | users table | High |
| Patient Context | PDP-4 | Tenant isolation on last-patient | Must enforce user-only + tenant isolation. | endpoint logic | High |
| Patient Context | PDP-5 | Recent-patients list | No history endpoint (legacy nav has "Recent Patients"). | `GET /users/me/recent-patients` | Low |
| Help | HELP-1 | Production Jira proxy | Direct mode exposes the token + needs CORS; prod needs a backend proxy for create-issue. | `POST {VITE_JIRA_PROXY_URL}` | High |
| Help | HELP-2 | List my tickets (status sync) | "My Tickets" cannot show live status without a server-side reporter query. | `GET {proxy}?reporter=` | High |
| Help | HELP-3 | Server-held Jira config & secrets | Project key, issue-type/priority/status mapping and the API token must live server-side. | config | High |
| Help | HELP-4 | Ticket audit persistence | Submission audit trail is local-only today. | persistence | Low |
| Help | HELP-5 | Status webhook / refresh | No push of Jira status changes. | webhook | Low |
| Messaging | MSG-1 | **Messaging data model + tables** | The whole user-to-user messaging feature runs on a local simulation (localStorage + BroadcastChannel). Nothing is shared between users. | new tables | **Blocker** |
| Messaging | MSG-2 | REST endpoints (conversations, messages, participants) | — | `/messaging/*` | **Blocker** |
| Messaging | MSG-3 | WebSocket gateway + real-time fan-out | — | `wss` | **Blocker** |
| Messaging | MSG-4 | Presence service | Presence UI is simulated. | `/messaging/presence` | High |
| Messaging | MSG-5 | Delivery & read receipts | Ticks are simulated. | message model | High |
| Messaging | MSG-6 | Attachment upload + media storage | No real file transfer. | storage | High |
| Messaging | MSG-7 | Out-of-app notification dispatch | — | — | Medium |
| Messaging | MSG-8 | Message search | — | — | Medium |
| Messaging | MSG-9 | Rate limiting & abuse controls | Recommended before GA. | — | Medium |
| Messaging | MSG-10 | Audit logging + retention | Recommended before GA (PHI in messages). | — | Medium |
| Messaging | MSG-11 | Dedicated directory endpoint | Currently reuses `listUsers`. | — | Low |
| Utilities | UTIL-1 | **Utility execution / job API** | ~40 maintenance utilities exist as a labelled *simulation*; nothing actually runs server-side. | `POST /utilities/{id}/run` + job status | **Blocker** |
| Utilities | UTIL-2 | Audit-log persistence | Utility runs are recorded in localStorage — unusable for compliance. | `/utilities/audit` | High |
| Utilities | UTIL-3 | RBAC source of truth | Which role may run which utility is a frontend constant. | permissions | High |
| Utilities | UTIL-4 | Fee-schedule bulk operations | Only the Excel template download is real. | bulk endpoints | Medium |
| Utilities | UTIL-5 | Integrations status + sync | No status/sync surface. | — | Medium |
| Utilities | UTIL-6 | Launch registry | Optional. | — | Low |
| Dashboard/My Page | DASH-4 / MP-6 | **No notifications feed** | No `/notifications` (severity, category, `is_read`, target user, mark-read). Partial sources: `/patient-alerts`, `/audit-logs`. No webhook/SSE/push. | `/notifications` | High |
| Dashboard/My Page | DASH-4 / MP-3 | **No tasks resource** | No task/todo/work-queue entity; My Page tasks live in localStorage. | `/tasks`, `/users/me/tasks` | High |
| Dashboard | DASH-4 | No unified cross-entity search | Each entity has its own `search`; the UI fans out 4+ calls and merges. | `GET /search?q=&types=` | Medium |
| Dashboard | DASH-4 | No email send; SMS is a log store | `/sms-messages` persists a row but nothing documents a gateway dispatch; there is no email endpoint at all. | send gateway | High |

---

## 4. Scheduler & Appointments

| Gap ID | Title | Description / Workaround | Endpoint / Resource | Severity |
|--------|-------|--------------------------|---------------------|----------|
| **SCHED-DEL-1** | **Deleted appointments come back** | `DELETE /appointments/{id}` is a soft delete (204, sets `is_archived`), but `GET /appointments/scheduler` neither filters archived rows nor exposes `is_archived` — so the calendar feed hands deleted appointments straight back and the client has no field to filter on. Reproduced: delete, then create any appointment → the deleted one reappears. FE now re-fetches `/appointments` to learn the archived ids. | `GET /appointments/scheduler` | **Blocker** |
| **APPT-PROC-4** | **Deleted appointment procedures come back** | `DELETE /appointment-procedures/{id}` soft-deletes (`is_archived: true`) and the list has no `is_archived` filter and returns archived rows. Confirmed live (row 10126). Every client must filter. | `GET /appointment-procedures` | **Blocker** |
| SCHED-DEL-2 | No way to restore a soft-deleted appointment | `AppointmentUpdate` has `is_archived` but nothing surfaces archived appointments to pick from — soft delete currently buys nothing and only causes SCHED-DEL-1. | confirm intent | Medium |
| SCHED-1 | Operatory → provider linkage | `OperatoryRead` missing `provider_id`; operatory auto-fill to provider broken; UI hardcodes blank. | `GET /operatories` | High |
| SCHED-2 | Office-scoped reference data | Operatories/providers/config/procedure-types not office-filtered; all tenants see all offices. | `GET /operatories?office_id=`, `/providers?office_id=` | High |
| SCHED-3 | New-patient-during-scheduling | FE passes string `patient_id` ("NEW"/chart_no); auto-create contract unclear. | `POST /appointments` | High |
| SCHED-4 | Status definitions + colors | Status list & colors hardcoded in UI; backend enum not exposed. | `GET /definitions?group_code=appt_status` | High |
| SCHED-6 | Patient context enrichment | "Go to patient" wrote hardcoded patient data instead of fetching. | `GET /patients/{id}/context` | High |
| SCHED-7 | Denormalized names on AppointmentRead | No `patient_name`/`provider_name`/`operatory_name`; N+1 `GET /patients/{id}` per appointment. | `GET /appointments/scheduler` | High |
| SCHED-APPT-2 | Cancellation metadata not persisted | `PATCH .../status` accepts only `{status}`; note/reason/call-list flag collected but dropped. | `PATCH /appointments/{id}/status` | High |
| **APPT-8** | **`requires_tooth/surface/quadrant/lab` are `false` across the whole catalogue** | Verified on D2391 (clinically requires tooth **and** surface). Tooth/surface enforcement can never fire; the picker offers a manual override instead. | `procedure_codes` seeding | High |
| **APPT-12** | **`chart_no` is not unique** | chart_no `818` is held by more than one patient — a chart-number lookup is ambiguous and caused a wrong-patient data write before it was found. Only the numeric id is safe as a key. | `patients` | High |
| APPT-PROC-1 | No `duration` on appointment procedure | Per-procedure duration cannot be stored; **Calc Time** only works within a session. | add `duration_minutes` | Medium |
| APPT-PROC-2 | No `provider_units` | Legacy "P. Units" column always 1. | add `provider_units` | Medium |
| APPT-PROC-3 | No `bill_to` | Patient-vs-insurance intent per line cannot be stored. | add `bill_to` (`P`/`I`) | Medium |
| APPT-5 | No `lab_dds` on create/update | The LAB section's DDS input cannot be saved (read model has the other four lab fields). | `AppointmentCreate/Update` | Medium |
| APPT-6 | No explosion-code concept on appointments | The legacy "By Explosion Code" filter was removed. (An `/explosion-codes` resource has since appeared for Transactions — please confirm it is the same concept.) | confirm | Medium |
| APPT-7 | `campaign_id` free text | No campaign resource to pick from. | expose campaigns | Low |
| APPT-9 | `default_fee` 0.00 / `default_duration_minutes` null for most codes | Codes with no fee-schedule entry price at 0; durations default to 30 min. | seed defaults or confirm | Medium |
| APPT-10 | No procedure-code category taxonomy | Categories derived by scanning the whole catalogue. | `GET /procedure-code-categories` | Medium |
| APPT-11 | No `home_phone` column | `phone` doubles as the home number. | confirm mapping | Low |
| SCHED-EMAIL-1 | **No email-send endpoint** | Go To → Email hands the draft to the user's own mail client via `mailto:` — it delivers, but leaves no record on the patient. | send gateway | High |
| SCHED-SMS-1 | SMS dispatch undocumented | `POST /sms-messages` records a row; nothing says a gateway sends it. UI says "queued", not "sent". | confirm | Medium |
| SCHED-5 | Status-transition timestamps | Ownership (client vs server) unclear. | `PATCH /appointments/{id}/status` | Medium |
| SCHED-8 | Responsible party + patient type on PatientRead | FE hardcoded. | `GET /patients` | Medium |
| SCHED-APPT-1 | Created/modified-by attribution | AppointmentRead missing `created_by`/`updated_by`. | `GET /appointments/{id}` | Medium |
| SCHED-APPT-3 | Same-day family/account feed | Cannot filter by responsible-party; Family section renders empty. | `GET /appointments?responsible_party_id=&date=` | Medium |
| SCHED-APPT-4 | Per-block enrichment | Feed missing `has_alert`, `patient_age/gender`, `service_summary`, `insurance_eligibility`; N+1 fan-outs. | `GET /appointments/scheduler` | Medium |
| SCHED-APPT-6 | Per-line estimated-patient portion | `est_patient` missing; FE derives `max(fee − ins_est, 0)`, ignoring COB/write-offs. | `GET /appointment-procedures` | Medium |
| SCHED-APPT-7 | Account balance on feed | Needed for the $ badge; per-patient only → capped daily fan-out. | `GET /appointments/scheduler` | Medium |
| SCHED-CONS-G7 | No per-provider / per-weekday working hours | Column gray-out uses the single office-level start/end for every column. | provider schedule feed | Medium |
| SCHED-APPT-5 | `posted_on` timestamp | Only `is_posted`; Posted cell blank. | `GET /appointments/{id}` | Low |
| SCHED-CONS-G9 | No appointment print/report endpoint | Routing slip / walkout / day sheet actions removed. | `POST /reports/routing-slip` | Low |
| SCHED-9 | Week/Month range fetching | Month-range support unconfirmed. | `GET /appointments?date_from=&date_to=` | Low |
| SCHED-10 | `procedure_label` validation | Free-text, no FK enforcement. | `POST /appointments` | Low |
| NA-B1 | Block / placeholder appointments | No way to reserve time with no patient + a reason label — *Block Appointment* disabled. | appointment `kind` + `block_label` | Medium |
| NA-B2 | Quick-Fill / ASAP waitlist | No resource to pull short-notice patients from — card disabled. | `GET /offices/{id}/quick-fill` | Medium |
| NA-B3 | Real-time insurance eligibility from an appointment | Verification action removed. | `POST /patients/{id}/insurance/{plan}/verify` | Medium |
| NA-B4 | Family / same-account same-day scheduling | Duplicate of SCHED-APPT-3 — card disabled. | see SCHED-APPT-3 | Medium |
| NA-B5 | Do appointment treatments post to the ledger? | Contract unconfirmed; the *Post* action was removed rather than guess. | confirm | Low |
| **NA-B6** | **`GET /providers?office_id={id}` returns `[]` for many offices** | Office 10 → 0 of 97 providers, yet the office schedules patients. Never scope providers by the `office_id` scalar; the FE now falls back to the full list. See also PROV-1. | `/providers`, `/offices/{id}/providers/effective` | High |
| D1 (data) | `appt_status` definitions unseeded | FE falls back to built-in S·C·U·L·R·A·O·H letters + colors. | seeding | Data |
| D2 (data) | Provider `scheduler_color` unset | FE falls back to a generated palette. | seeding | Data |

---

## 5. Patients, Transactions, Ledger, Claims & Reports

### 5a. Patients

| Gap ID | Title | Description / Workaround | Endpoint | Severity |
|--------|-------|--------------------------|----------|----------|
| GAP-AP-1…18 | Add-Patient columns (pronouns, DL, student, hygienist, fee schedule, referral-to, RP relationship, coverage, patient types, flags, HIPAA note, opening balance, wizard, chart-no autogen, medical alerts, questionnaire, composite register) | ✅ **All delivered** by the backend team and wired frontend-side. | `patients`, `/patients/register` | ✅ |
| LEG-2…14 | Legacy-parity registration (alert enum, emergency contacts, question sections, plan search by group #, dentical share, anniversary expiry, recall interval, guarantor record, billing flags, statement message, RP type, account roster) | ✅ Delivered + wired. | multiple | ✅ |
| **LEG-1** | **MEDALERT / DENTQUEST / MEDQUEST catalogs unseeded** | The legacy 88 alerts + 29/22 questions were never migrated; a single stray seeded row replaced the catalog, so the FE carries a verbatim copy and a `MIN_TENANT_CATALOG_ITEMS` guard. Seed file supplied by us. | data migration | High |
| **LEG-15** | No `referral_type="1"` ("Referred To") records exist | The Referred-To picker has nothing to offer. | data migration | Medium |
| LEG-16 | `PatientRead` has no `home_office_name` | Absent from spec *and* runtime; forces an office lookup per patient. | `PatientRead` | Low |
| LEG-17 | `RecallIn` (register composite) missing `interval_unit`/`scheduled_date`/`scheduled_time` | Sending recalls through the composite would silently drop LEG-8's fields; recalls were moved out of the atomic register as a workaround. | `RecallIn` | Low |
| **PO-2** | **`patients.responsible_party_id` holds an unresolvable legacy id** | Migrated patients point at ids like `"13002496"`; the whole tenant has 2 responsible-party rows → 404. The RESPONSIBLE PARTY panel cannot resolve the guarantor; FE falls back to `GET /patients?responsible_party_id=` and shows an inline warning. | migration | **High** |
| **PO-3** | Account roster unusable for migrated accounts | `/responsible-parties/{id}/patients` cannot accept the raw legacy string and is missing columns. | `/responsible-parties/{id}/patients` | **High** |
| **PO-6** | **Referrals not linked to patients** | 666 referral rows, 1 of the first 200 carries `patient_id`; `patients.referred_by` is a raw legacy id (`"13000412"`). The REFERRALS tab is empty for virtually every patient. | migration | **High** |
| **PO-7** | Payment-plan / contract tables empty tenant-wide | `patient-reg-plans`, `patient-payment-plans`, `patient-ins-payment-plans` all return 0 rows. | migration | **High** |
| PO-1 | No Patient Overview aggregate endpoint | ~20 requests per page load. | `GET /patients/{id}/overview` | Medium |
| PO-4 | No family/account-scoped appointment query | — | `patient_ids` or `responsible_party_id` on `/appointments` | Medium |
| PO-5 | `/appointments` has no `is_archived` filter | Related to SCHED-DEL-1. | `/appointments` | Medium |
| PO-8 | `first_visit` / `last_visit` / `next_recall` never populated | Patient 72462 has 4 appointments and all three are null. Either maintain them on write or drop them from `PatientRead`. | `patients` | Medium |
| PO-9 | `patient_insurance.relationship` has no definitions entry | Single-letter legacy codes render raw. | `resp_party_rel` group | Low |
| PO-10 | No patient photo storage | — | `photo_document_id` | Low |
| PO-11 | `responsible_parties` has no office | — | add `home_office_id` | Low |
| PO-12 | `/patients/{id}/account-plans` is misnamed | It returns insurance plans. | rename/alias | Low |
| **NOTE-DOC-1** | **A patient note cannot reference a document** | Uploaded documents orphan at the patient level; progress-notes already has the attachment pattern. | `document_id` on `PatientNote*` or `/patient-notes/{id}/attachments` | **Blocker** |
| NOTE-DOC-4 | No vocabulary for `document_type` | Free text. | seed a `DOCTYPE` definitions group | Low |
| NOTE-DOC-5 | No server-side file validation | No content-type allow-list or size cap. | enforce + document | Medium |
| PE-1 | `patient_flags` booleans have no columns | The shared request type carries flags the patient resource cannot store; reading them back produced a wiped-ortho-state bug. | drop from contract or add columns | Medium |
| PE-4 | `PatientRead` has no `updated_by`, no resolved user names | "Last modified by" is unfillable. | add `updated_by`, `*_by_name` | Medium |
| PE-2 | No catalog endpoint for `patient_types` | Codes rendered from a frontend list. | expose lookup | Low |
| PE-3 | `/patients/{id}/context` too thin to hydrate an edit form | Opening balance missing. | fold in or document | Low |
| PATIENTS-1 | Patient documents | ✅ Delivered (`/patient-documents` + `/content`). | — | ✅ |
| PATIENTS-6 | Patient-scoped ledger writes (phantom paths) | FE assumed non-existent `/patients/{id}/payments`, `/adjustments`. | use the real resources | High |
| PATIENTS-7 | Composed claim-detail | ✅ Delivered (`/insurance-claims/{id}/detail`). | — | ✅ |
| PATIENTS-8 | Claim clearinghouse ops + attachments | Attachments delivered; validate/submit/status-refresh still missing (see §5d). | `/insurance-claims/{id}/validate|submit` | High |
| PATIENTS-3 | Advanced patient search | Only free-text + chart_no; no SSN/DOB/insurance/provider/office/type filters. | `GET /patients` (extend) | Medium |
| PATIENTS-4 | Duplicate-check | ✅ Delivered (`/patients/check-duplicate`). | — | ✅ |
| PATIENTS-5 | Balance shape | Missing `insurance_balance`, today's charges, last-payment amounts. | `GET /patients/{id}/balance` | Low |
| PATIENTS-10 | Note audit author + attachments | `PatientNoteRead` missing `created_by_name`/`updated_by(_name)`. | `GET /patient-notes` | Low |

### 5b. Transactions (Entry, Payments, Adjustments, Refunds, Statements)

| Gap ID | Title | Description / Workaround | Endpoint | Severity |
|--------|-------|--------------------------|----------|----------|
| DASH-1 | Office financial summary | No aggregate for outstanding/patient/insurance balances; only per-patient. | `GET /offices/{id}/financial-summary` | High |
| DASH-2 | Collections summary (today/month) | No aggregated collections endpoint. | `GET /offices/{id}/collections` | High |
| DASH-3 | Insurance receivables (A/R) | Only per-patient `insurance_balance`; no office A/R or aging-by-carrier. | `GET /offices/{id}/insurance-receivables` | High |
| DASH-4 | Refund/adjustment/write-off totals | No summary; refund concept missing entirely. | `GET /offices/{id}/adjustment-summary` | High |
| DASH-5 | Office-wide transaction feed | Ledger is per-patient only; no cross-patient feed. | `GET /offices/{id}/transactions` | High |
| LED-1 | Ledger sort + type/status filter | Ledger accepts only date/page/size. | `/patients/{id}/ledger` (extend) | High |
| INS-1(tx) | Check/EFT/EOB capture on insurance payment | ✅ **Delivered** — `POST /ledger-insurance-details/payment` (`recordInsurancePayment`) carries `payment_date`, `payment_method`, `check_number`, `bank_number`, `eob_number`, `eft_trace_number`. Now used by the rebuilt Insurance Payment window; see §5d for what is still missing around it. | `POST /ledger-insurance-details/payment` | ✅ |
| REF-1 | Process refund | No refund concept; the only workaround is an unvalidated negative payment. | `POST /patients/{id}/refunds` | High |
| REF-2 | Reverse/void payment or adjustment | Only a passive `is_void` boolean; no reverse route / offsetting entry. | `POST /patient-payments/{id}/reverse` | High |
| STMT-1 | Individual statement generation | No single-patient statement endpoint. | `POST /patients/{id}/statements` | High |
| SRCH-1 | Unified cross-patient transaction search | Client merges 4 calls; cannot paginate correctly. | `GET /transactions?search=&type=&status=` | High |
| **FEE-1** | **Percentage-based insurance estimates are impossible** | There is no ADA-code → coverage-category map, so a plan's "80% of basic" cannot be applied. Charges are priced from fee schedules (proven: `patient_fee` **is** the fee, `insurance_fee` is a separate payer amount) but the insurance split cannot be estimated. | coverage-category map | **High** |
| FEE-2 | Offices are not linked to their fee schedules | `fee_schedule_assignments` unseeded; the resolver guesses. | backfill assignments or `offices.default_fee_schedule_id` | High |
| FEE-3 | No server-side pricing endpoint | Pricing logic is duplicated in the client. | `POST /patients/{id}/price` | Medium |
| **PROV-1** | Office↔provider assignment table effectively unseeded | `/providers?office_id=10` → **0** while `/offices/10/providers` → 1 and `/effective` → 0. Any picker scoped by the scalar shows an empty list. Shared `providerDirectory.ts` now feeds every picker with a full-list fallback. | `provider_offices` seeding | High |
| PROV-3 | `providers.role` is free text with inconsistent spellings | Hygienist filtering relies on `/hygien/i`. | enum or definitions group | Medium |
| CHG-1 | Charge-time estimate calculation | Estimates are client-supplied; no server calc from coverage + fee schedule. | `POST /patients/{id}/estimate` | Medium |
| CHG-2 | Structured anatomy/surface/material rules | `ProcedureCodeRead` has flat booleans only (and they are all false — APPT-8). | extend `ProcedureCodeRead` | Medium |
| CHG-3 | "All Medical" procedure codes | No medical-code subset to filter on. | flag or category | Medium |
| CHG-4/5/6 | Explosion codes; payment Bank #, per-procedure Pat Paid/Pat Adj; preferred-hygienist persistence | ✅ Delivered and integrated 2026-08-29. | — | ✅ |
| CHG-7 | Today's Est **Deductible** portion not computed | Not returned on balance/estimate payloads. | add `estimated_deductible` | Medium |
| CHG-9 | "Checked Out" appointment status from Transactions | No supported transition from this screen. | status flow | High |
| CHG-10 | `key2` unset on `payment_method` and `adjustment` definitions | The legacy Type/Group filters have no data, so they are hidden rather than faked. Only three adjustment codes are seeded. | seed `key2` + widen the seed | Medium |
| ADJ-1 | Per-procedure adjustment allocation | No allocations array; allocate is payment-scoped only. | `POST /patient-adjustments/{id}/allocate` | Medium |
| REF-3 | Refundable-credit lookup | `PatientBalance` has no unapplied-credit field. | `GET /patients/{id}/refundable-balance` | Medium |
| STMT-2 | Batch statement run | No monthly batch for outstanding balances. | `POST /offices/{id}/statements/batch` | Medium |
| STMT-3 | Statement delivery (print/email/PDF) | — | `GET /patients/{id}/statements/{id}/pdf` | Medium |
| SRCH-2/3 | Search by transaction number / amount / balance | No amount-range or txn-number filters. | collection endpoints | Medium |
| AUD-1 | Per-record change history | `audit-logs` has no `resource_id` filter. | `GET /audit-logs` (extend) | Medium |
| AUD-2 | Audit fields on ledger entries | `LedgerEntry` missing creator/modifier + timestamps. | `LedgerEntry` | Medium |
| REF-4 | Refund authorization policy | No threshold/approval flow. | `GET /metadata/refund-policy` | Low |

### 5c. Account Ledger

> ✅ **Delivered since the last edition:** AL-1 / AL-2 / AL-4 / AL-5 / AL-7 — the denormalised `GET /patients/{id}/account-ledger` feed with server-side running balance, paging, type filter and sort now exists and is what the unified Ledger screen reads.

| Gap ID | Title | Description / Workaround | Endpoint | Severity |
|--------|-------|--------------------------|----------|----------|
| **AL-9** | **Payment amounts are stored negative, so `/balance` and the feed read backwards** | Every consumer of `/balance` (patient header chip, dashboards, aging) inherits the sign error; the grid computes `charge − |credit|` to compensate. Settle one convention. | `patient_payments`, `/balance`, account-ledger feed | **Critical** |
| **AL-8** | **Claim transactions are absent from the account-ledger feed** | The legacy ledger interleaves `CLM-P / CLM-S / CLM-T` rows. The FE merges them client-side from `GET /insurance-claims?patient_id=`, which cannot participate in server paging or the running balance. | add `source_type: 'claim'` rows | **Critical** |
| **AL-10** | **No user attribution on transactions** | The legacy **User** column (who posted this) is blank for migrated rows; `created_by` was not backfilled. | backfill `created_by` + expose a name | **Critical** |
| AL-11 | Account (family) scope has no server-side feed | The feed is keyed by one `patient_id`; the FE resolves the member list and fans out per member. | `scope=patient|account` or `responsible_party_id` | High |
| AL-17 | Hold Claim invisible to the feed | No `hold_claim` on `AccountLedgerRow` and no filter on `/patient-procedures`, so the FE walks patient-procedures **per account member** just to colour one column and to keep held charges out of Create Claim. | add `hold_claim` to the feed row | High |
| **AL-18** | **Claim status is unvalidated free text with hidden date side-effects** | `insurance_claims.status` is `String(30)`, no enum, no validation; `POST …/status` stamps `submitted_date` / `paid_date` / `close_date`+`is_active=false` only on an **exact lowercase match**. A capitalised `"Submitted"` saves the literal string and silently skips the date stamp — reported as a bug ("status does not update"). The frontend now sends only the five canonical values and reads the claim back to confirm. Transitions are also one-way: reverting to `draft` leaves `submitted_date`, and reopening a closed claim never restores `is_active`. | `POST /insurance-claims/{id}/status` | **High** |
| AL-13 | Edit Treatment / Edit Payment fields with no column | Charge: duration, per-carrier estimate split, contract PlanID, referral type/dentist, fee schedule used. Payment: EOB #, apply-to/posted-from. Both: modified-by/on, ICD-10. | `patient_procedures`, `patient_payments` | Medium |
| AL-14 | Feed descriptions inconsistently money-prefixed | Some rows arrive with `$amount` baked into `description`, some not; the grid has to compose the legacy string. | return plain text | Medium |
| AL-15 | `allocations-summary.remaining_amount` always 0 | The legacy "Outstanding Amount" line cannot be shown. | compute fee − allocated | Medium |
| AL-16 | Migrated payment allocations carry no procedure link | The Payment Allocation Detail popup is empty for historical payments. | backfill `procedure_id` + `amount` | Medium |
| AL-3 | "Ortho - Patient Payment Plan" has no discriminator | The Contracts tab's Ortho-Patient panel renders all dashes. | `plan_type` discriminator | Medium |
| AL-6 | Columns with no backing data | `A` / `At` / attachment / duration semantics unconfirmed. | confirm/add | Low |
| AL-12 | Responsible party / primary insurance / plan name not in context | The legacy title row cannot be reproduced. | patient summary | Low |

### 5d. Insurance Claims & Claim Fill-Out *(new)*

| Gap ID | Title | Description / Workaround | Endpoint | Severity |
|--------|-------|--------------------------|----------|----------|
| **CLM-FO-1** | **The claim resource has no fill-out columns at all** | The legacy "Claim Fill-Out Information" window captures the ADA-form boxes that are not derived from procedures. None exist in `openapi.json`: `prior_authorization_number` (box 2), `has_other_coverage` (4), `signature_on_file` (36/37), `place_of_treatment` (38), `insurance_reference_number`, `enclosures_radiographs/oral_images/models` (39), `is_other_accident`/`is_occupational_illness`/`is_auto_accident` (45), `accident_date` (46), `accident_state` (47), `is_orthodontic_treatment` (40), `ortho_appliance_placed_date` (41), `ortho_months_remaining` (42), `is_prosthesis_treatment`/`is_replacement_of_prosthesis` (43), `prosthesis_prior_placement_date` (44), `remarks` (35). Only First Visit / Student Status / School Name / Assign Benefits have a home (on the **patient**). Everything else is kept per-claim in `localStorage` with an on-screen warning. | add to `insurance_claims` or a 1:1 `insurance_claim_fillout` child | **High** |
| CLM-FO-2 | `remarks` must be separate from `notes` | `notes` is the staff claim-notes field; remarks is the 240-char box that prints in ADA box 35. Reusing `notes` would clobber staff notes, so remarks is not persisted at all today. | separate column | High |
| CLM-FO-3 | ICD library is unseeded | `GET /icd-codes?is_active=true` → `meta.total = 0`, so ICD 1–4 fall back to free text; there is also no per-claim `icd_1…4` nor a per-line diagnosis pointer. | seed + columns | Medium |
| CLM-FO-4 | No place-of-service source | `place_of_treatment` renders from a hardcoded CMS list; a `/place-of-service-codes` resource exists but nothing links it to a claim. | confirm + seed | Low |
| CLM-FO-5 | Fill-out data is not carried into e-claim submission | `ClaimSubmissionCreate` carries only `claim_id/batch_id/is_preauth/total_charges/num_lines/submission_status/claim_text`. | 837D payload builder | High |
| **INS-PAY-2** | **A posted insurance payment cannot be reversed, and `recalculate` will not correct the claim** | `record_insurance_payment` moves `claim.total_paid` forward and nothing moves it back. Verified: posted $150.00, deleted all three coverage rows (204; `GET` → 404, list `total: 0`, `/detail` coverage `[]`), then `recalculate` → 200 still reporting `total_paid: "150.00"`. A mis-keyed remittance overstates carrier payment permanently; only a manual `PATCH total_paid` fixes it. There is no insurance counterpart to `/patient-payments/{id}/reverse`. | `POST /insurance-claims/{id}/recalculate`, new `/ledger-insurance-details/{id}/reverse` | **Critical** |
| INS-PAY-1 | Remittance record has no `notes` column | The legacy window collects a note per remittance; the frontend appends it to the claim's `notes` with a dated prefix so it is at least auditable. | `InsurancePaymentCreate` | High |
| INS-PAY-3 | No batch endpoint — a multi-line remittance is not atomic | One cheque over four procedures is four POSTs; a mid-way failure half-pays the claim ("posted N of M", no rollback). | accept `lines[]` in one transaction | High |
| INS-PAY-4 | No claim-level adjustment / write-off | Only per-line `prim_ins_adjust` exists, so a "10% claim write-off" is distributed across lines and the original intent is not recorded. | claim-level `write_off` | Medium |
| INS-PAY-5 | Tertiary tier and secondary deductible not writable | `InsurancePaymentCreate` has no `ter_ins_paid` (the read model does) and no `sec_deductible`. | create contract | Medium |
| INS-PAY-6 | No `eob_number` on a patient payment | "Insurance Check to Previous Balance" writes `patient-payments`, so the EOB has to be folded into `notes`. | `PatientPaymentCreate` | Medium |
| INS-PAY-7 | No outstanding-claims feed shaped for the payment window | The legacy window lists every outstanding claim with charges / est ins / ded used / paid / adj / remaining; those roll-ups need one detail call per claim today. | `GET /patients/{id}/outstanding-claims` | Medium |
| INS-PAY-8 | Attachment types have no vocabulary | The EOB rides `attachment_type: "EOB"` free text (compare NOTE-DOC-4). | seed a definitions group | Low |
| AUD-3 | Claim status-change history | ✅ `/insurance-claims/{id}/status-history` now exists; "Claim Closed By" is still hardcoded. | — | ✅/Medium |
| SVC-1 | Send/submit claim action | `/insurance-claims/{id}/submit` exists but no clearinghouse behaviour is documented; E-CLAIM and VALIDATE CLAIM remain disabled with an honest notice. | document Phase-4 EDI | High |
| PATIENTS-8 | Claim validation | No clearinghouse validate call. | `POST /insurance-claims/{id}/validate` | High |
| — | No claim print / report | DIRECT PRINT is disabled — there is no server-rendered ADA claim form. | report service | Medium |

### 5e. Payment Plans (Ortho + Regular) *(new)*

| Gap ID | Title | Description / Workaround | Resource | Severity |
|--------|-------|--------------------------|----------|----------|
| **PP-1** | **`DELETE` is a soft delete the list endpoint does not honour** | Deleted ortho/regular plans keep coming back from `GET /ortho-plans` and `/patient-payment-plans`; the FE filters `is_active` client-side. | honour `is_active` on the list | **High** |
| PP-2 | No "post periodic billing" endpoint | Instalments cannot be posted to the ledger from the contract. | `POST /patient-ins-payment-plans/{id}/post` | High |
| PP-6 | No FK between an ortho plan and its periodic billing rows | The two periodic tables are joined by convention. | add `ortho_plan_id` | High |
| PP-3 | No contract / coupon report endpoint | Contract + coupon PDFs are built client-side (jsPDF). | server-rendered contract | Medium |
| PP-4 | `patient_reg_plans` vs `patient_payment_plans` overlap | Which is canonical is undocumented. | confirm | Medium |
| PP-7 | No audit trail on contract changes | No `updated_by`. | add + audit rows | Medium |
| PP-8 | `plan_type` unconstrained free text | `"regular"` / `"ortho"` by convention only. | enum or definitions group | Medium |
| OPP-1 | Ortho: only one billing code | Legacy requires an *Initial* and a *Periodic* code; only the periodic one can be stored. | add `initial_procedure_code` | High |
| OPP-6 / RPP-4 | **No payment-method columns at all** | Payment code, card holder, card number, exp, CVV, "post down payment using this card" are rendered read-only with a "not stored" notice. Needs a **tokenised vault reference**, never raw PAN. | `payment_token_id`, `card_last4`, … | High |
| OPP-9 / RPP-5 | Patient sub-plan has no per-instalment rows | The two insurance tiers have real billing rows with `is_billed`/`ledger_id`; the patient tier's schedule is a client-side projection with no posted state. | `patient_ortho_payment_plans` | High |
| OPP-8 | Secondary insurance sub-plan is not symmetric with primary | Primary has 11 columns, secondary 4. | add the missing 7 | Medium |
| OPP-2 | No `pref_provider_id` on an ortho plan | Drives which provider periodic charges post under. | add FK | Medium |
| OPP-4 | Patient sub-plan has no setup date / notes / remarks | The insurance tiers have them. | add `pat_setup_date`, `pat_notes`, `remarks` | Medium |
| OPP-7 | Insurance "Mon. claim Print Fee" / "Suppress Periodic Printing" missing on both tiers | — | add 4 columns | Medium |
| OPP-10 | No plan-level `tx_duration_months` / `months_remaining` | Derived client-side from banding/treat-end dates. | add or confirm derivation | Medium |
| OPP-11 | `created_by` is free text, no `created_office_id` | The creator's name cannot be resolved. | FK to users + office | Medium |
| OPP-3 | No `insert_class` | Legacy dropdown. | add | Low |
| OPP-5 / RPP-3 | No `financial_disclosure` | Selects which disclosure text prints on the contract. | add | Low |
| RPP-1 | No "Treatment Plan Amount" line | Recovered arithmetically; the *intent* (plan vs open balance) is lost. | add column | Medium |
| RPP-2 | No `billing_code` on regular plans | `patient_ins_payment_plans` has one — inconsistent. | add + seed `ACBIL` | Medium |
| RPP-6 | No `total_of_payments` | Derived. | optional | Low |

### 5f. Reports & Dashboard

| Gap ID | Title | Description / Workaround | Endpoint | Severity |
|--------|-------|--------------------------|----------|----------|
| REPORTS-G1 / DASH-1 | No aggregation / roll-up endpoints | KPIs and trends computed client-side with truncation warnings. | `GET /reports/summary`, `/dashboard/summary` | High |
| REPORTS-G2 | No practice-wide A/R | Per-patient balance only; "Awaiting backend". | `GET /reports/accounts-receivable` | High |
| REPORTS-G3 | No aging (30/60/90/120+) | Aging report not built. | `GET /reports/aging` | High |
| REPORTS-G7 | List reads carry no denormalized names | Tables show `patient_id`; provider joined client-side. | denormalize | High |
| DASH-3 | Missing metric denominators | No provider working hours/capacity, no leads, no chair capacity → utilization/conversion impossible. | `ProviderRead` + hours | High |
| REPORTS-G4 | No server-side export / email / scheduled reports | Client-side CSV + `.xls` SpreadsheetML + jsPDF. | `POST /reports/{report}/export` | Medium |
| REPORTS-G5 | Status fields un-enumerated | Hardcoded vocab matched case-insensitively. | `/definitions` | Medium |
| REPORTS-G8 | Scheduler feed has no pagination / provider / status params | Whole array fetched and filtered client-side. | add params | Medium |
| REPORTS-G9 | Treatment-plan list has no rolled-up totals | Item totals would be N+1, so they are omitted. | add `total_fee`, `est_*` | Medium |
| REPORTS-G10 | Insurance-claims list has no date-range filter | The claims report cannot be date-scoped. | add `submitted_from/to` | Medium |
| DASH-2 | Missing aggregation set | dashboard/summary, trends, provider-productivity, practice AR, production summary, recall date-range, office payments filter. | multiple | High |
| REPORTS-G6 | `office_id` list filter | ✅ Resolved on procedures/payments/claims. | — | ✅ |

---

## 6. Clinical modules

### 6a. Restorative Charting

| Gap ID | Title | Description / Workaround | Resource | Severity |
|--------|-------|--------------------------|----------|----------|
| REST-1 | Enrich `chart_conditions` | Missing `group_id`, `grade`, `updated_by/at`; FE encodes them in `region`. | `chart_conditions` | High |
| REST-2 | `chart_status_templates` catalog (NEW) | No bridge/denture preset resource; FE hardcodes. | NEW | High |
| REST-3 | `chart_settings` per-patient (NEW) | View settings (numbering, visibility) in localStorage. | NEW | High |
| REST-4 | `chart_tooth_notes` (NEW) | No per-tooth note resource; FE writes a `condition_code='NOTE'` row. | NEW | High |
| REST-5 | Seed colors/materials | Materials have null color/pattern. | seeding | Medium |
| REST-7 | First-class per-item metadata | `tooth_status/root_scope/rct_fill/watch_*` encoded in `region`. | `chart_conditions` | Medium |
| REST-8 | ADA alternate-benefit ("A") codes | Missing `amb_code`/`is_downgrade`/`alternate_of`. | `procedure_codes` | Medium |
| REST-9 | Root-level conditions | Missing `segment`/`root_segment`. | `chart_conditions` | Medium |
| REST-10 | Freehand drawing persistence | Strokes packed into `progress_notes.notes_html` + a PNG upload. | — | Low |
| REST-6 | Server-side FHIR R4 export | Deferred, out of scope — listed for completeness. | NEW | Deferred |
| — | `chart-conditions` DELETE is soft (`is_inactive`) | Consistent with T9; the FE filters. | `chart_conditions` | Low |

### 6b. Perio Charting

| Gap ID | Title | Description / Workaround | Resource | Severity |
|--------|-------|--------------------------|----------|----------|
| PERIO-BE-1 | UNIQUE(exam_id, tooth_no) | No constraint; duplicate rows allowed; FE guards in-memory and flushes on unmount. | `perio_exam_details` | Blocker |
| PERIO-BE-2 | Mobility rejects half-grades | Columns INTEGER; 0.5/1.5/2.5 rejected; FE drops non-integers. | `perio_exam_details` | Blocker |
| PERIO-BE-3 | DELETE semantics inconsistent | Exam soft-deletes, detail hard-deletes; no filter excludes voided → deleted exams still listed. | `perio_exams` | High |
| PERIO-BE-4 | CAL not stored | Derived client-side as PD+FGM; cannot be recorded independently. | `perio_exam_details` | High |
| PERIO-BE-5 | Detail audit columns | No created/updated at+by. | `perio_exam_details` | Medium |
| PERIO-BE-6 | Exam attribution thin | `created_by` id only. | `perio_exams` | Medium |
| PERIO-BE-7 | No server-side range validation | `PATCH {pd1:999}` succeeds. | PATCH | Medium |
| PERIO-BE-8 | No bulk upsert | A 32-tooth save is ~32 non-atomic calls. | `perio_exam_details` | Medium |
| **PERIO-BE-14** | **No provider on `PerioExam`** | The printed "Periodontal Examination Record" has to infer the clinician. | add `provider_id` | Medium |
| PERIO-BE-9 | Date-range filters | Compare/history fetch-all client-side. | `perio_exams` GET | Low |
| PERIO-BE-10 | Server comparison / summary / print | Compare + PDF client-side. | — | Low |
| PERIO-BE-11 | Per-user chart settings | No "me" route, no seed; FE uses localStorage. | `perio_chart_settings` | Low |
| PERIO-BE-12 | `auto_advance` schema undefined | Free-form object. | `perio_chart_templates` | Low |
| PERIO-BE-13 | Clarify `PerioChartActivity` | Undocumented legacy log. | — | Low |

### 6c. Progress Notes

| Gap ID | Title | Description / Workaround | Resource | Severity |
|--------|-------|--------------------------|----------|----------|
| PN-1 | Per-user signature store | `patient-signatures` is keyed by patient; "Load My Signature" cannot work. | users/signature | Blocker |
| PN-2 | `/sign` ignores "Change User" | The sign endpoint takes no body; always signs as the caller — no over-the-shoulder signing. | `/progress-notes/{id}/sign` | Blocker |
| PN-3 | Attachments not linkable to a note | Docs orphan at patient level. | `patient-documents` | Blocker |
| PN-4 | No strike-off timestamp | Same-day restore rule unenforceable. | `progress_notes` | Medium |
| PN-5 | `created_by`/`signed_by` have no name | Render as "User #N". | `progress_notes` | Medium |
| PN-6 | Macro `category` free text / numeric codes | Dropdown shows raw codes. | `note-macros` | Medium |
| PN-7 | Locking is client-derived only | The API can still mutate signed notes. | PATCH guard | Medium |

### 6d. Treatment Plans

> ✅ **Delivered since the last edition:** PLAN-1 (`phase_id`), PLAN-2 (`diagnosed_date`), PLAN-5 (`provider_id`), PLAN-10 (`discount`), and partially PLAN-4 (`start_date`/`end_date`). The frontend dual-writes the new and legacy columns during the transition.

| Gap ID | Title | Description / Workaround | Resource | Severity |
|--------|-------|--------------------------|----------|----------|
| PLAN-13 | Item becomes undeletable | A soft-deleted insurance-detail + FK RESTRICT → the parent delete returns 409 forever. | `treatment-plan-insurance-details` | Blocker |
| PLAN-3 | No insurance-estimate compute | The store exists but there is no compute endpoint; `insurance_estimate` stays 0 and Re-Estimate is inert. | `POST /treatment-plans/{id}/re-estimate` | High |
| PLAN-12 | Items have no working `patient_id` filter | The param is accepted but ignored → the FE does one call per plan. | `treatment-plan-items` GET | High |
| **PLAN-16** | **Provider→procedure eligibility unseeded** | `GET /providers/{id}/procedure-codes` returns `[]` for all 96 providers, so the Change-Provider restriction is inert (FE treats an empty allow-list as "unrestricted"). | seed assignments | Medium |
| **PLAN-20** | **Status enum missing `scheduled` / `completed` / referral states** | The enum has 6 values; the legacy screen has more, and `status` accepts arbitrary strings anyway (T10). | extend + validate | Medium |
| PLAN-17 | No per-procedure `notes` on an item | Legacy has a per-line note. | add `notes` | Medium |
| PLAN-18 | No `accepted_date` / `scheduled_date` | Legacy tracks when a plan item was accepted and scheduled. | add columns | Medium |
| PLAN-19 | No per-item `duration_minutes` | Edit Treatment has a Duration field with nowhere to save. | add column | Medium |
| PLAN-6 | No server export | Print built client-side (jsPDF). | — | Medium |
| PLAN-8 | `patient-documents` list empty for plan uploads | Upload 201s but the list returns 0 (uploaded docs have `office_id: null` and the list is office-scoped). | list scoping | Medium |
| PLAN-21 | Deductible tilde marker | Legacy prints `~` beside a fee subject to deductible; nothing marks it. | flag | Low |
| PLAN-22 | Est Pat cash/credit split | Legacy shows two Est-Pat columns. | columns | Low |
| PLAN-23 | Topaz e-signature capture | No signature capture on plan acceptance. | signature | Low |
| PLAN-9 | No pre-auth workflow | Fields exist; no submission/tracking. | — | Low |
| PLAN-4 | Item missing office / PS / S / C | Remaining legacy grid fields. | `treatment_plan_item` | Low |
| PLAN-14 | Item DELETE is hard | Inconsistent with `patient-procedures` soft delete. | confirm | Low |
| PLAN-15 | No procedure→appointment linkage | "New Appt" just navigates. | — | Low |
| PLAN-11 | No treatment-counselor resource | — | — | Low |
| PLAN-7 | Per-patient consent capture | ✅ Largely delivered via `patient-consents` + `/sign` (see Letters LTR-10). | — | ✅ |

### 6e. Prescriptions · 6f. Lab Tracking · 6g. Imaging · 6h. Patient Insurance

| Gap ID | Title | Description / Workaround | Resource | Severity |
|--------|-------|--------------------------|----------|----------|
| **Rx** RX-P1 | No separate "Internal Note" | Single `notes` field prints; the Internal Note input is gated. | `prescriptions` | Medium |
| RX-P2 | No DoseSpot patient id | — | `patients` | Low |
| RX-P3 | ePrescribe not integrated | No DoseSpot launch/handoff. | — | Low |
| RX-P4 | No print/export endpoint | Client-side jsPDF. | — | Low |
| RX-P5 | Med/Source status columns | No backend equivalent. | `prescriptions` | Low |
| **Lab** LAB-1 | No lab-vendor field | `lab_vendor(_id)` + `lab_short_notice` missing; the FE renders them with a "not saved" notice. | `appointments` | High |
| LAB-2 | No lab filters on the list | No `has_lab` / lab-date filters. | `appointments` list | Medium |
| LAB-3 | Denormalized names missing | The scheduler feed has names but drops the lab fields. | `AppointmentSchedulerRead` | Low |
| LAB-4 | No lab report/export | — | — | Low |
| LAB-5 | Office-wide lab tracking | Blocked on LAB-2. | — | Low |
| **Imaging** IMG-1 | Binary ↔ metadata unrelated | `patient-documents` and `image-details` are unlinked; the doc id is stuffed into the `tile_id` string. | add FK | High |
| IMG-2 | `image-details` not patient-scoped | Must resolve an image group first. | add `patient_id` + filter | High |
| IMG-3 | No imaging-native binary endpoint | Images ride the generic document store. | `/patients/{id}/images` | High |
| IMG-4 | No thumbnails | Full-res originals used as thumbnails. | server-side thumbnails | Medium |
| IMG-5 | No signed/expiring URLs | See §3 (security). | — | Security |
| IMG-6 | No image view/audit trail | HIPAA "who viewed which image" missing. | — | Medium |
| IMG-7 | No device-scan persistence | No modality/exposure/DICOM capture path. | acquisition endpoint | Medium |
| **DICOM-1/2** | DICOM endpoints + generated client | ✅ Delivered and swapped to Orval. | — | ✅ |
| **DICOM-3** | **No DICOM imaging migrated for any patient** | The viewer is verified end-to-end only against injected mock data; real GCS bytes, the 307 signed-URL redirect and the 24h token expiry are unverifiable. | run the migration + derivative worker for ≥1 patient | **Blocker (validation)** |
| **Pt Ins** INS-PT-15 | Migrated plans have no group number | The smart search and duplicate check are inert for migrated data. | migration | High |
| INS-PT-19 | Duplicate prevention is client-side only | Two users can create the same plan concurrently; nothing enforces uniqueness. (Supersedes INS-PT-16.) | server-side constraint + 409 | High |
| INS-PT-14 | `search` is not scoped to the group number | Group-number search can only be exact-match. | scope `search` | Medium |
| INS-PT-7 | No per-field plan search | The legacy dialog searches one named field at a time; one `search` param spans several. | field-scoped params | Medium |
| INS-PT-9/18 | No batch-by-id lookup for carriers and employers | Plan lists fan out one call per id. | `?ids=` batch | Medium |
| INS-PT-10 | Carrier "Claim Type" has no label source | Raw code shown. | definitions group | Medium |
| INS-PT-8 | Plans have no modified metadata | `InsurancePlanRead` has no `updated_at`/`updated_by`. | add | Medium |
| INS-PT-13 | Quick-add can create duplicate carriers/employers | Neither create endpoint checks for an existing match. | uniqueness check | Medium |
| INS-PT-21 | Soft-deleted plans don't flag as duplicates | The check scopes to active rows, so a deleted plan silently collides. | include inactive | Medium |
| INS-PT-20 | No "is this group taken" endpoint | The duplicate check re-uses the list endpoint. | count/HEAD or 409 | Low |
| INS-PT-1/2/3 | Subscriber marital status, phone, secondary-sub relationship | Rendered, not persisted. | `insurance_subscribers` | Low |
| INS-PT-4/11 | Address line 2 (subscriber, employer) | Single column; the FE joins/splits on a newline. | second line | Low |
| INS-PT-5 | No real eligibility verification | "Update Status" stamps a local value. | verification endpoint | Low |
| INS-PT-6 | Eligibility "Plan Date" column | Only a subscriber-level date is stored. | add | Low |
| INS-PT-12 | `carrier_type` stringly typed | `"True"`/`"False"`. | boolean/enum | Low |
| INS-PT-17 | No deep link to a single plan in Setup | — | route/id | Low |

---

## 7. Setup / Admin modules

### 7a. Security — Users & Groups

| Gap ID | Title | Description / Workaround | Resource | Severity |
|--------|-------|--------------------------|----------|----------|
| Users #1–#7 | Compound create/update, setup metadata, time-clock config, login restrictions, roles catalog, list filters, self-service password | ✅ **All delivered** (`/users/complete`, `/users/setup-metadata`, `/users/{id}/time-clock-config`, `/users/{id}/security-settings`, `/roles`, `?office_id=&role=`, `/users/me/change-password`) and wired. | — | ✅ |
| Users #8 | Update-audit fields | No `updated_at`/`updated_by` on `UserRead`; "Last Updated By/On" stays blank. | `UserRead` | Medium |
| Users (fields) | Missing user fields | `short_id`, `report_access_provider_id`, `custom_1/2`, `signature_*`, `image_url`. | user model + image upload | Med/High |
| Groups Gap 1 | Rights / permissions catalog | No endpoint for the ~517-right picker; hardcoded in the FE. | `GET /permissions` | High |
| Groups Gap 2 | Group → rights read/write | **Assignments live in localStorage** — not shared, not enforced. | `GET/PUT /user-groups/{id}/rights` | High |
| Groups Gap 4 | RBAC enforcement | Even once stored, rights are not enforced server-side. | enforcement layer | High |
| Groups Gap 3 | Copy user group server-side | FE emulates create + copy. | `POST /user-groups/{id}/copy` | Medium |

### 7b. Office Assignment

| Gap ID | Title | Description / Workaround | Resource | Severity |
|--------|-------|--------------------------|----------|----------|
| OA-24 | Office↔procedure-code assignment | No office-scoped GET/PUT or link table — tab gated. | `/offices/{id}/procedure-codes` | High |
| OA-25 | Explosion codes resource + office link | Tab gated. (An `/explosion-codes` resource now exists for Transactions — please confirm whether it satisfies this.) | — | High |
| OA-26 | Production types resource + office link | Tab gated. | `/production-types` | High |
| OA-32 | Ortho Misc Setup resource | Undefined at backend; gated. | define | High |
| OA-27 | Users bulk/copy + `created_by` | No bulk set/copy; no office/active filter. | `PUT /offices/{id}/users` | Medium |
| OA-28 | Provider ↔ office is single-office | A scalar FK, not M:N; see also PROV-1 / NA-B6. | `provider_offices` | Medium |
| OA-29/30/31 | Note-macro / RX / letter-template office assignment | Tenant-wide catalogs with no office link (letters partially resolved via `/letter-templates/effective`). | `/offices/{id}/...` | Medium |
| OA-33 | `?office_id=` not honored server-side | `/user-offices`, `/providers` ignore the filter. | those endpoints | Medium |

### 7c. Insurance & Fee Schedules (Setup)

| Gap ID | Title | Description / Workaround | Resource | Severity |
|--------|-------|--------------------------|----------|----------|
| INS-1 | No `carrier_type` filter | The Dental/Medical split pages the whole 1 340-row list (~7 requests). | `ListInsuranceCarriersParams` | High |
| INS-3 | Carrier capability flags not modeled | No eligibility / claim-status / DXC-attachment / insurance-type flags. | `InsuranceCarrierRead` | High |
| INS-8 | **Unstable pagination drops/duplicates rows** | Sorting by non-unique `name`: 1 340 total → 1 338 unique (2 skipped, 1 duplicated). Applies to every paginated endpoint. | `ORDER BY name, id` | High |
| INS-2 | `carrier_type` untyped string | `"True"`/`"False"`. | boolean/enum | Medium |
| INS-4 | Fax/email not modeled | — | carrier contract | Medium |
| INS-5/6 | Employer model minimal, no audit metadata | No `salesrep`, contact person, modified audit. | `EmployerRead` | Medium |
| INS-9 | Plans `search` can't match carrier/employer name | Re-tested: still not active in the running backend; the UI uses entity pickers instead. | `GET /insurance-plans` | Medium |
| INS-10 | Opaque `coverage_type` / category codes | Definitions wired but the groups are unseeded in this tenant. | seed | Medium |
| INS-11 | No `elig_status` filter | Live status is uniformly "unknown"; the Pending Verifications KPI is unmeasurable. | subscribers list | Medium |
| INS-7 | Carrier "Fee Schedule" link managed elsewhere | Informational — no action. | — | ℹ️ |
| FEE-1 | Fee-schedule DELETE soft-deletes | Entries/assignments hard-delete — inconsistent. | confirm convention | Medium |
| FEE-2 | No `amb_code` | Legacy AMB Code column. | add field | Medium |
| FEE-3 | Assignment lacks office-group | — | `office_group_id` | Medium |
| FEE-4 | No schedule-level effective date / versioning | `effective_date` exists on entries only. | expose on schedule | Medium |

### 7d. Codes, Charting Setup, Pick List, Macros, Medical, Toolbar, Referrals, Provider

| Gap ID | Title | Description / Workaround | Resource | Severity |
|--------|-------|--------------------------|----------|----------|
| PROC-1…5 | Charting config, provider permissions, insurance mapping, Main booleans, KPI stats | ✅ **Delivered** and wired. | — | ✅ |
| AUX-1 | Modifier codes | Missing resource (legacy 2-column grid). | seed `MODIFIER` group | High |
| AUX-2 | Type-of-Service codes | Missing. | seed `TYPEOFSERVICE` | High |
| AUX-3 | Place-of-Service codes | Needs a Tax ID field `definitions` cannot hold. | `place-of-service-codes` | High |
| AUX-4 | ICD codes | Resource exists but is **unseeded** (`total: 0`) — see CLM-FO-3. | seed ICD-9/10/SNOMED | High |
| PROC-6 | Fee-schedules list latency | `?size=200` takes seconds; the tab needs only `id,name`. | lightweight projection | Low |
| CHART-1a | Perio template `*_by` not expanded | Shows "Modified By: 385". | `*_by_name` | Medium |
| CHART-1b / 2c / 3d | No default seed (perio template, colors, materials) | New tenants get empty grids. | idempotent seed | Medium |
| CHART-3a | Materials missing `updated_at` | "Modified On" unfillable. | `TimestampMixin` | Low |
| CHART-2a / 3b | Colors & materials missing `modified_by` | — | add column | Low |
| PICK-1/2 | Cascade delete + bulk replace | ✅ Resolved (`.../cascade`, `PUT .../options`). | — | ✅ |
| PICK-3 | No custom/system discriminator | Cannot split built-in vs user pick lists. | flag/enum | Medium |
| PICK-4/5 | Item value single `answer_code`; no uniqueness validation | — | confirm | Low |
| NM-2 | Macro `category` stored as numeric codes | `"179"` rather than a label, with no group to resolve it. | `NOTE_MACRO_CATEGORY` group + backfill | High |
| NM-1 | No `category` filter | FE loads all and filters. | add param | Medium |
| NM-6 | `GET /note-macros` ignores `sort` / `order` | FE sorts client-side. | honour the params | Medium |
| NM-7 | Seeded macros duplicated ~4× | Data issue in the seeded tenant. | de-dupe | Medium |
| NM-3/4/5 | `created_by` id only; no `updated_at`/`updated_by`; no name uniqueness | — | add | Medium/Low |
| MED-1 | No feature-scoped catalog home | `definition-groups` has no `group_type` filter; the FE filters by convention (`MEDALERT`/`MEDQUEST`/`DENTQUEST`). | bless `group_type` + filter | High |
| MED-3 | Questions have no input-type column | The type code is stored in `key1` by convention. | add `input_type` | High |
| MED-4 | No question ↔ answer linkage | `medical-history-details` is keyed by a free-text code with no FK. | add `question_id` | High |
| MED-2 | No seed data | See LEG-1 — same catalogs. | seed | Medium |
| MED-5 | No draft/publish + ordering | — | flag + `sort_order` | Medium |
| TB-1 | No toolbar resource | Repurposes `definition-groups` with `group_type=TOOLBAR`. | resource or bless it | High |
| TB-4 | No toolbar order / role binding / default | — | add fields | High |
| TB-2 | No function registry | 26 functions + icons hardcoded in the FE. | catalog endpoint | Medium |
| TB-5 | No seed + no transactional copy/save | Copy/save is N calls with partial-failure risk. | seed + bulk write | Medium |
| TB-3 | No `updated_at`/`updated_by` on groups | — | add | Low |
| RX-1 (setup) | No "Modified By" on the Rx library | `updated_at` only. | add `updated_by` | Medium |
| RX-3 | No drug / formulary lookup | `drug_name` is free text. | formulary resource | Medium |
| RX-2/4 | Sig 240-cap is FE-only; no `drug_name` uniqueness | — | confirm | Low |
| REF-1 (referrals) | Missing referral fields | No `e_referral_id`, `practice_name`, `contact_name`, `cost`; no demographics feed. | extend `ReferralRead` | Medium |
| REF-2 (referrals) | `referral_type` code domain undocumented | `"0"` = Referred By, `"1"` = Referred To. | enum / definitions | Low |
| Provider #1–#7 | Schedules, holidays, watermarks, referral offices, carrier logins, user link | ✅ **All delivered** and wired. | — | ✅ |
| Provider Gap A | Provider `id` is client-supplied | `ProviderCreate.id` is a required string with no server convention → collision risk. | server-assign or publish the convention | Low |
| Provider Note D | `provider_role` / `provider_specialty` definition groups empty | Free-text fallback in the UI. | seed | Low |

---

## 8. Cross-cutting product modules *(new in this edition)*

### 8a. Letters

> ✅ **Delivered:** LTR-1…LTR-12 — object-store consents, `LETTERTYPE` definitions, provider/office/marketing merge columns, `treatment_plan_id` binding, `/letters/render` + `/render-batch` + `/merge-fields`, `/patients/{id}/letter-context`, `/letter-templates/effective`, consent status vocabulary + `/sign`, timezone offsets on every datetime, and document-list filters + paging.

| Gap ID | Title | Description / Workaround | Severity |
|--------|-------|--------------------------|----------|
| LTR-13 | `#APPT_PRDR#` resolves blank with no *upcoming* appointment | Should fall back to the last visit or the preferred provider. | Medium |
| LTR-14 | `#TODAY_DATE#` is the UTC date, not the office's | The client overrides it — a workaround that self-retires via a version probe. | Medium |
| LTR-15 | `/letters/render` cannot accept caller-supplied values | Signature-type overrides cannot be passed, so `/render` is not yet the render path. | Medium |
| LTR-16 | `/consent-forms` and `/patient-documents` unverified against a real bucket | A `storage_backend: "local"` row is flagged in the UI. | Medium |
| LTR-17 | The appointment block should say which tier resolved it | Ask: `appointment_source: "next" \| "last" \| "preferred" \| null`. | Low |
| — | **Round-2 build not deployed** | Both reachable backends still serve the round-1 response; the frontend is already written to defer to the server once it lands. | High |

### 8b. AppointNow (external online booking)

The entire feature is new backend work; the frontend ships against a swappable transport (`VITE_APPOINTNOW_BACKEND`), with the local simulation on by default and the API transport inert until these exist. Approving a request already books a **real** appointment through `schedulerApi.createAppointment`.

| Gap ID | Title | Severity |
|--------|-------|----------|
| AN-1 | Public office info (unauthenticated) | High |
| AN-2 | Public availability (unauthenticated) | High |
| AN-3 | Public booking-request intake (unauthenticated) | High |
| AN-4 | Staff: list booking requests (auth) | High |
| AN-5 | Staff: approve / decline (auth) | High |
| AN-6 | Realtime notification for new requests | Medium |
| AN-7 | Provider exposure flag | ✅ exists |
| AN-8…12 | Rate limiting, spam/abuse controls, public-endpoint tenancy, audit, request→appointment linkage | Medium |

### 8c. My Page

| Gap ID | Title | Description / Workaround | Priority |
|--------|-------|--------------------------|----------|
| MP-1 | No self-service profile update | `PATCH /users/me` does not exist. | P1 |
| MP-7 | Weak user→provider link; no server-side `provider_id` scheduler filter | "My Schedule" filters client-side on `report_access_provider_id`. | P1 |
| MP-3 | No personal tasks resource | localStorage. | P2 |
| MP-6 | No notifications / alerts feed | Alerts are derived client-side. | P2 |
| MP-2 | No self-service profile photo upload | — | P2 |
| MP-9 | Personal KPI aggregation | Inherits the Dashboard aggregation gap. | P2 |
| MP-4 | No user preferences / favorites / layout store | localStorage. | P3 |
| MP-5 | No notification-preferences resource | Fold into MP-4. | P3 |
| MP-8 | No per-user activity log / recently-viewed | — | P3 |
| MP-10 | Confirm `last_login_at` is stamped on login | — | P3 |

### 8d. Help, Messaging, Utilities, Patient Context

See §3 — these are platform-level and blocking, so they are listed there in full (HELP-1…5, MSG-1…11, UTIL-1…6, PDP-1…5).

---

## 9. Suggested prioritization for backend

1. **Stop losing / corrupting data (Blocker & Critical).**
   - AL-9 payment sign convention (every balance in the product is affected).
   - T9 soft-delete leaks: SCHED-DEL-1, APPT-PROC-4, PP-1, PERIO-BE-3 — deleted things reappearing is the single most-reported class of bug.
   - PERIO-BE-1 (`UNIQUE(exam_id, tooth_no)`) and PERIO-BE-2 (half-grade mobility).
   - PLAN-13 (item permanently undeletable), NOTE-DOC-1 (note ↔ document link).
   - INS-PAY-2 — a reversed insurance payment leaves `claim.total_paid` overstated forever.
   - APPT-12 (`chart_no` not unique) — it has already caused a wrong-patient write.
2. **Performance (Critical).** Dashboard list latency (27–55 s), PP-5 (`/balance` 23 s cold), INS-8 (pagination drops rows), PROC-6.
3. **Validate what the server acts on (T10).** AL-18 claim status, PLAN-20, PP-8, appointment status — an enum + 422 for each, and normalise case.
4. **Kill the N+1 & truncation tax (T6/T1).** Denormalize names on the scheduler / lab / ledger / report feeds; add the office-level financial, collections and A/R aggregates; add claim rows to the account-ledger feed (AL-8).
5. **Persist data the UI already collects but has to throw away.** SCHED-APPT-2 cancellation metadata, LAB-1 lab vendor, INS-1(tx) check/EFT/EOB, CLM-FO-1 the whole ADA fill-out form, OPP-6/RPP-4 tokenised payment method, PDP-1…4 last patient, Groups Gap 2 rights.
6. **Migration/seed data (nothing is buildable without it).** PO-2/PO-3 (guarantor ids), PO-6 (referrals), PO-7 (contracts), PO-8 (visit dates), LEG-1/MED-2 (alert & question catalogs), LEG-15 (referred-to), AUX-4/CLM-FO-3 (ICD), PLAN-16 (provider eligibility), PROV-1/NA-B6 (office↔provider), FEE-2 (office↔fee schedule), APPT-8 (`requires_*` flags), D1/D2 (appointment status colors), DICOM-3.
7. **Enumerations & audit standardization (T2/T3/T5).** `*_by_name`, `updated_at`/`updated_by`, and `/definitions` groups for every status/code field — one pass clears ~40 Medium rows.
8. **New resources.** Messaging (MSG-1…6), Utilities execution (UTIL-1…3), AppointNow (AN-1…6), refunds/statements (REF/STMT), tasks & notifications (MP-3/MP-6/DASH-4), office-assignment link tables (OA-24…32), auxiliary code tables (AUX-1…4).

---

## 10. Source index

| Area | Report |
|------|--------|
| Account Ledger, Claims | `docs/account-ledger/account_ledger_backend_devreport.md` |
| Claim Fill-Out | `docs/account-ledger/claim_fillout_backend_devreport.md` |
| Insurance Payment window | `docs/account-ledger/insurance_payment_backend_devreport.md` |
| AppointNow | `docs/appointnow/appointnow_backend_devreport.md` |
| Authentication | `docs/authentication/authentication_backend_devreport.md` |
| Charting Setup | `docs/charthing/charting_setup_backend_devreport.md` |
| Dashboard | `docs/dashboard/dashboard_backend_devreport.md` |
| Help (Jira) | `docs/help/help_module_backend_devreport.md`, `help_module_devreport.md` |
| Imaging / DICOM | `docs/imaging/imaging_backend_devreport.md`, `dicom_imaging_frontend_devreport.md` |
| Insurance Setup, Fee Schedules | `docs/insurance/insurance_backend_devreport.md` |
| Lab Tracking | `docs/lab-tracking/lab_tracking_backend_devreport.md` |
| Letters | `docs/letters/letters_backend_devreport.md` (+ `letters_backend_response.md`) |
| Messaging | `docs/messaging/messaging_backend_devreport.md` (+ requirements & API contract) |
| My Page | `docs/my-page/my_page_backend_devreport.md` |
| Patient Context | `docs/patient-context/persistent_patient_selection_backend_devreport.md` |
| Patient Insurance | `docs/patient-insurance/patient_insurance_backend_devreport.md` |
| Add Patient | `docs/patients/add_patient_backend_devreport.md`, `add_patient_legacy_parity_devreport.md` |
| Patient Edit / Overview / Notes / Documents | `docs/patients/patient_edit_backend_devreport.md`, `patient_overview_backend_devreport.md`, `patient_note_documents_backend_devreport.md`, `patients_backend_devreport.md` |
| Payment Plans | `docs/payment-plans/payment_plans_backend_devreport.md` |
| Perio Charting | `docs/perio/perio_charting_backend_devreport.md` |
| Pick List, Notes Macros, Medical, Prescriptions Setup, Toolbar | `docs/pick-list/pick_list_setup_backend_devreport.md` (consolidated, §1–§5) |
| Prescriptions (per-patient) | `docs/prescriptions/prescriptions_backend_devreport.md` |
| Procedure Codes, Auxiliary Code Tables | `docs/procedure-codes/procedure_codes_backend_devreport.md`, `auxiliary_code_tables_backend_devreport.md` |
| Progress Notes | `docs/progress-notes/progress_notes_backend_devreport.md` |
| Provider Setup | `docs/provider-setup/provider_setup_backend_devreport.md` |
| Referrals | `docs/referrals/referral_setup_backend_devreport.md` |
| Reports | `docs/reports/reports_backend_devreport.md` |
| Restorative Charting | `docs/restorative/restorative_charting_backend_devreport.md` |
| Scheduler | `docs/scheduler/scheduler_backend_devreport.md`, `scheduler_appointments_backend_devreport.md`, `scheduler_consolidated_backend_gaps.md`, `add_edit_appointment_backend_devreport.md`, `new_appointment_flow_gaps.md` |
| Security (Users, Groups) | `docs/security/users/*.md`, `docs/security/groups/groups_backend_devreport.md` |
| Office Assignment | `docs/setup/offices/office_assignment_backend_devreport.md` |
| Transactions | `docs/transactions/transactions_backend_devreport.md` |
| Treatment Plans | `docs/treatment-plans/treatment_plan_backend_devreport.md` |
| Utilities | `docs/utilities/utilities_backend_devreport.md` |

_Full per-gap detail (repro steps, exact payloads, live verification logs) lives in each module's report above._
