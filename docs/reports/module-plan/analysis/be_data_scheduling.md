# BE data map — SCHEDULING & OPERATIONS (appointments, capacity, recall, online booking, communications, time clock, lab)

_Static analysis only: code + docs read; no server started, no DB connection, no API call, no existing file modified. Snapshot 2026-11-21. Backend `<workspace>/dentc-backend` (branch `feature/uat-realse`, HEAD `9183df0`, 2026-11-16; uncommitted work is treatment-plan annual-max only). `schema.sql` = `pg_dump --schema-only` of 2026-10-11 (PostgreSQL 15.18); the only two later Alembic revisions (`9435491c1d19`, `03bbb54c0b12`) touch no table in this scope, so the dump is current here. New client databases are restored from that dump, not built by Alembic (`docs/onboarding/NEW_CLIENT_DATABASE.md` L74-98), so its index set is the real one everywhere._

**Legend** — **[V]** verified by reading the cited file / lines. **[I]** inference (reasoned from code, not executed). **[D]** a number or claim quoted from a code comment, backend doc or migration log, not re-measured. Paths are relative to `dentc-backend/` unless prefixed `FE:` (= `dentc-frontend/`). Names are snake_case exactly as in the code.

Companion documents (same folder): `be_existing_reporting.md` (existing KPI / PDF endpoints), `be_platform.md` (jobs, tenancy, office scope, exports), `be_data_financial.md` (money). This document is the **data map for scheduling and operations**: where each fact lives, what the columns mean, who writes them, what the migration did and did not load, and how to compute report metrics from them.

---

## 0. TL;DR for planners

| # | Finding | Evidence |
|---|---|---|
| 1 | One fact table: `appointments` (PK `id varchar(50)`, **no `tenant_id`** — tenant comes from `offices.tenant_id`). Exactly one provider per appointment (`provider_id` NOT NULL), optional `operatory_id`, office-local naive `date` / `start_time` / `end_time`, `duration` in minutes. Block-outs and lab cases are the same rows (`is_blocked`, `has_lab`). | [V] `app/db/models/scheduling.py` L53-102; `schema.sql` L396-438 |
| 2 | `status` is a free `varchar(30)` holding at least three vocabularies at once (legacy Title Case, seeded `appt_status` codes, literals written by services). Classify on the flags and stamps first (`is_cancelled`, `is_missed`, `is_blocked`, `checked_out_on`, `checked_in_on`, `confirmed_on`, `is_posted`) and on a normalised status string second. | [V] §1.3 |
| 3 | **`is_archived` is overloaded.** It is the soft-delete tombstone for app rows **and** it is `true` on every row loaded from Denticon `APPTH_ARCHIVE/*.txt`. Every reader in the app hides archived rows, so that whole legacy partition is invisible today. Whether it is "old history" or "deleted / rescheduled copies" is not established. | [V] `denticon_migration/migration/steps/s26_appointments.py` L36-39, L110; §1.4. [I] for the consequence |
| 4 | **No appointment history.** No status-change log, no reschedule record, no `cancelled_at` / `cancelled_by`, no `confirmed_by`, no seated stamp, no `deleted_at`. Only the current row plus `audit_logs`. "Status as of T", reschedule counts, short-notice cancellations and lead-time-to-cancel cannot be computed from the tables. | [V] §1.9 |
| 5 | Migrated appointments (176,453 [D]) carry **none** of `created_at` (= load time), `created_by`, `confirmed_on`, `checked_in_on`, `checked_out_on`, `is_new_patient`, `cancellation_*`. Created-date, created-by-user, confirmation, wait-time and new-patient-flag reports are valid for app-era rows only (`legacy_id IS NULL`). | [V] `s26_appointments.py` L20-27 |
| 6 | Scheduled production = `appointment_procedures.fee`, a client-supplied or plan-item snapshot that the server does not price. Only 10,125 lines exist for the 176,453 migrated appointments [D] (about 6 %), so historical scheduled production is essentially absent. | [V] `scheduling.py` L105-136, `app/services/appointment_service.py` L129-159; [D] migration log 2026-06-08 |
| 7 | There is **no appointment-type column**. `procedure_label` is free text; the seeded `appt_type` definition group and the `production_types` catalog are referenced by no appointment column. Hygiene vs doctor vs new-patient vs emergency can only be inferred. | [V] §1.7 |
| 8 | Capacity inputs exist (`operatories`, `office_schedule_days`, `provider_schedule_days`, `account_holidays`, `provider_holidays`, block-out rows) but: nothing was migrated or seeded, only the *current* template is stored, there are no per-operatory hours, and two resolvers in the code apply different closed-day and fallback rules. Utilisation is computable with stated assumptions, not exactly. | [V] §2 |
| 9 | No server-side double-booking guard on staff writes (only office-hours enforcement, overridable). Booked minutes can exceed capacity. | [V] `appointment_service.py` L233-246; `FE: docs/scheduler/cut_copy_paste_backend_gaps.md` SCHED-CCP-2 |
| 10 | Recall is a plain CRUD table: `patient_recalls` has **0 rows after migration** [D], no engine (nothing advances a recall when the recall procedure is completed), no link to an appointment, mixed-case `status`. `patients.first_visit` / `last_visit` / `next_recall` are written by no backend code. | [V] §3 |
| 11 | Hygiene reappointment % has no structured support. It must be derived from completed hygiene procedures plus future appointments identified by heuristics (hygienist provider, hygiene code on the booking). "Left with the next visit booked" additionally needs a trustworthy `appointments.created_at`. | [V]/[I] §3.4, §8.7 |
| 12 | No waitlist / ASAP / short-call entity. Two booleans only: `appointments.add_to_call_list` and `patients.add_to_quickfill`; neither is a list filter and the Quick-Fill UI is a disabled placeholder. The Scheduler's Cancel dialog collects reason, note and the call-list tick but **sends only the status**, so `cancellation_reason` / `cancellation_note` / `add_to_call_list` are effectively empty. | [V] §1.4, §4.2; `FE: src/components/pages/Scheduler.tsx` L1997-2011 |
| 13 | `booking_requests` (AppointNow) is a clean funnel table: status, reason, requested slot, new/existing, created / actioned stamps and user, link to the booked appointment and patient, payment block. Indexed for office + status + time. | [V] §4.1 |
| 14 | Communications: `sms_messages` (one row per outbound text, reply on the same row, `appointment_id`, `message_type`, `send_status`, `reply_intent`, `reminder_lead_hours`) supports a confirmation funnel. `email_messages` is written only by the manual send. AppointNow notifications bypass both logs. | [V] §5 |
| 15 | Time clock is the best-modelled domain and already has a server report (JSON + CSV + PDF) with office scope, caller rules, overtime, wages and audit. Legacy punches are office wall-clock values (`clock_basis = 'wall_clock'`). | [V] §6 |
| 16 | Lab = eight columns on the appointment + `labs` catalog; a list, a cost report, two PDFs and a CSV already exist. No comparison of `lab_due_on` against the appointment date is made anywhere. | [V] §7 |
| 17 | Time bases are mixed: `date` / `start_time` / `end_time` are office-local and naive; stamps are naive UTC; `booking_requests.hold_expires_at` is office-local; legacy time-clock rows are office-local. The migration does not set `offices.timezone`, so every migrated office starts on the column default `America/New_York` until someone edits it. | [V] §8.9 |
| 18 | Row counts here are small (176 k appointments, 10 k lines, 32 k punches, 5 k texts [D]); scheduling reports are cheap except where they join `patient_procedures` (1.37 M). Missing indexes are listed in §9. | [D]/[V] |

---

## 1. Appointments

### 1.1 `appointments` — column map [V]

Model `app/db/models/scheduling.py` L53-102; DDL `schema.sql` L396-438; migration `denticon_migration/migration/steps/s26_appointments.py`.

| Column | Type | Meaning / writer | Loaded by the migration? |
|---|---|---|---|
| `id` | `varchar(50)` PK | `APPT-{APPTID}` migrated; `APPT-{uuid4}` minted by the FE (`FE: src/services/schedulerApi.ts` L292-296); `APPT-{uuid7}` plan booking (`treatment_service.py` L1641); `AN{uuid7 hex[:22]}` AppointNow (`appointnow_service.py` L1526) | yes |
| `legacy_id` | `varchar(20)` | Denticon `APPTID`; NULL on app rows. **The "is migrated" test.** | yes |
| `office_id` | `int NOT NULL` FK | the office; derived from the operatory when omitted, operatory / office mismatch is 422 `operatory_office_mismatch` (`appointment_service.py` L33-83) | yes (`OID`; an unknown `OID` silently falls to the first office in the map, L79) |
| `patient_id` | `int NULL` FK | NULL = block-out | yes (rows whose `PATID` is unknown are skipped) |
| `provider_id` | `varchar(50) NOT NULL` FK | the one provider; defaults from `operatories.provider_id` when blank | yes (rows whose provider is unknown are skipped) |
| `operatory_id` | `varchar(50) NULL` FK | chair | yes, NULL when unknown |
| `date` | `date NOT NULL` | office-local calendar date | yes (`APPTDATE`) |
| `start_time`, `end_time` | `time` | office-local wall clock. `end_time` wraps past midnight; a source row without a time part gets 08:00–09:00 (L99-102) | yes |
| `duration` | `int NOT NULL` | minutes — use this for time math, not `end_time − start_time` | yes (`APPTLENGTH`, default 60) |
| `status` | `varchar(30)`, default `'Scheduled'` | free string, §1.3 | yes (mapped) |
| `is_missed`, `is_cancelled` | `bool` | recomputed by the status endpoint; independently settable by the edit form | yes (`ISMISSED`, `ISCANCELLED`) |
| `is_posted`, `posted_on` | `bool`, `timestamp` | "visit posted to the ledger". **No server writer** — client PATCH only | `is_posted` yes (`ISPOSTED`); `posted_on` no |
| `is_blocked` | `bool` | block-out / closure | yes (`ISBLOCKED` or `PATID = 0`) |
| `is_new_patient` | `bool`, default false | set by the FE quick new-patient booking and by AppointNow approval | **no** — false on every migrated row |
| `procedure_label` | `varchar(200)` | free text "Prod. Type" | yes (`PRODTYPE`) |
| `notes` | `text` | | yes |
| `campaign_id` | `varchar(100)` | the campaign **code** (matches `campaigns.code`), not an FK | yes (`CAMPAIGN`) |
| `treatment_plan_id` | `varchar(50)` FK | | yes (`TREATPLANID ≠ 0`) |
| `confirmed_on`, `checked_in_on`, `checked_out_on` | `timestamp` (naive UTC) | server stamps, §1.5 | **no** |
| `cancellation_reason` (50), `cancellation_note`, `add_to_call_list` | | accepted by the status endpoint, but the Scheduler's Cancel dialog does not send them (§1.4) | **no** |
| `created_at`, `updated_at` | `timestamp` | `DEFAULT now()` / stamped by the CRUD engine | **no** — `created_at` is the load time |
| `created_by`, `updated_by` | `int` FK `users` | stamped from the token | **no** — NULL |
| `is_archived` | `bool` | overloaded, §1.4 | `true` for `APPTH_ARCHIVE` rows |
| `has_lab`, `lab_vendor_id`, `lab_dds`, `lab_cost`, `lab_short_notice`, `lab_sent_on`, `lab_due_on`, `lab_received_on` | | §7 | yes except vendor / DDS / short notice |

**Columns that do not exist** [V]: `tenant_id`; appointment type / kind; second provider (hygienist, assistant); `confirmed_by` / confirmation method; `cancelled_at` / `cancelled_by`; `missed_at`; seated / in-chair stamp; reschedule count or "moved from"; `deleted_at` / `deleted_by`; booking source (staff / online / plan / recall); recall link; version.

**Volumes** [D] (`denticon_migration/migration/logs/2026-06-08_03-15-59_migration.log` L390-457): appointments 176,453 · appointment_procedures 10,125 · operatories 57 · providers 93 · sms_messages 5,425 · time_clock_entries 31,756 · patient_recalls 0. `docs/lab-tracking/lab_tracking_backend_response_1.md` L165-167: "18 lab cases in 176,558 migrated appointments, 14 of them archived".

### 1.2 Creation paths [V]

| Path | Code | `status` written | Attribution | Notes |
|---|---|---|---|---|
| Scheduler form / copy-paste | generic `POST /appointments` → `AppointmentCRUD.create` (`appointment_service.py` L233-246) | whatever the client sends | `created_by` from token | operatory rules, lab rules, inactive-office check, office-hours check; **no overlap check** |
| Book from a treatment plan | `POST /treatment-plans/{plan_id}/book` → `treatment_service.book_from_plan` L1540-1705 | `"Scheduled"` (or body) | `created_by` | one transaction: appointment + one line per plan item, items flipped to `scheduled`; `procedure_label` = comma-joined codes |
| AppointNow approval | `appointnow_service.book_request` L1471-1562 | `"Scheduled"` | `created_by` = approver (the unattended post-payment path passes its own `actor_id`) | `is_new_patient` and `procedure_label` copied from the request; overlap re-checked here (409 `slot_conflict`) |
| Migration | `s26_appointments.py` | mapped (§1.3) | none | `ON CONFLICT (id) DO UPDATE SET status, updated_at = NOW()` — a re-run rewrites `updated_at` |

### 1.3 Status vocabulary [V]

Three vocabularies are written to the same column:

| Canonical state (proposed) | Legacy / Scheduler (Title Case) | Seeded `appt_status` `key1` | Effect of `PATCH /appointments/{id}/status` |
|---|---|---|---|
| scheduled | `Scheduled` | `scheduled` | none |
| unconfirmed | `Unconfirmed` | — | none (`confirmed_on` is **not** cleared) |
| left_message | `Left Message` | — | none |
| confirmed | `Confirmed` | `confirmed` | `confirmed_on = now` |
| arrived | `In Reception` | `in_reception` | `checked_in_on = now` |
| ready | `Available` | — | none. This is a same-day patient-flow status, **not** an open slot |
| seated | `In Operatory` | `in_chair` | `in_operatory` → **no stamp**; `in_chair` → `checked_in_on = now` (overwrites the arrival time) |
| checked_out | `Checked Out` | `checked_out`, `completed` | `checked_out_on = now` |
| no_show | `Missed` | `missed`, `no_show` | `is_missed = true` |
| cancelled | `Cancelled` | `cancelled` | `is_cancelled = true` |
| rescheduled | — | `rescheduled` | none |

- Legacy set: `FE: src/components/scheduler/statusMeta.ts` (`STATUS_META`, 10 names) = the Scheduler's `AppointmentStatusName`; the migration writes the same names (`denticon_migration/migration/utils/parsers.py` L130-149: `APPTSTATUS` 1 Scheduled, 2 Unconfirmed, 3 Confirmed, 4 Left Message, 5 In Reception, 6 Available, 7 In Operatory, 8 / X Checked Out; `ISCANCELLED` → `Cancelled`, `ISMISSED` → `Missed`).
- Seeded set: `scripts/seed_account_definitions.py` L135-146, group `appt_status` (`key1` = code, `description` = label, `color`, `sort_order`). The Dashboard's Today's Schedule widget PATCHes the **`key1`** it resolves from these definitions (`FE: src/components/dashboard/widgets/TodaysScheduleWidget.tsx` L19-25, L37-47), so `in_reception` / `checked_out` are stored next to `In Reception` / `Checked Out`.
- Literals: `"Scheduled"` (AppointNow, plan booking, column default), `"Confirmed"` (SMS reply webhook, `sms_service.py` L890-895), and lower-case `"confirmed"` / `"cancelled"` sent by the SMS inbox's staff actions (`FE: src/features/sms/hooks/useReplyActions.ts` L54, L66-70).
- Confirmed live by the FE team: stored values are mixed case — `scheduled`, `Confirmed`, `Scheduled` (`FE: docs/scheduler/cut_copy_paste_backend_gaps.md` SCHED-CCP-9) [D].
- Server rule: `scheduler_service.update_status` L303-333 stores the string **as sent**, normalises a copy (`strip().lower()`, spaces and hyphens → `_`) and applies `_STATUS_STAMP` (L53-61: `confirmed` → `confirmed_on`; `in_reception | in_chair | checked_in | arrived` → `checked_in_on`; `checked_out | completed` → `checked_out_on`), `_MISSED = {missed, no_show}`, `_CANCELLED = {cancelled, canceled}`.

Normalisation for reports: `lower(regexp_replace(btrim(status), '[ -]+', '_', 'g'))`, then map `in_operatory` / `in_chair` → seated, `checked_out` / `completed` → checked_out, `missed` / `no_show` → no_show, `cancelled` / `canceled` → cancelled.

**Which write path keeps what in step** [V]:

| Write path | `status` | `is_missed` / `is_cancelled` | Stamps | Actor | Audit detail |
|---|---|---|---|---|---|
| `PATCH /appointments/{id}/status` | raw string | both **recomputed on every call** (leaving `Missed` clears `is_missed`) | set to now, never cleared, overwritten on repeat | `updated_by` | row exists, **no before / after** |
| generic `PATCH` / `PUT /appointments/{id}` (edit form, drag-drop, cut-paste) | as sent | **not synced** — the form has separate Missed and Cancelled checkboxes (`FE: src/services/schedulerApi.ts` L700-712) | none | `updated_by` | `details.before` / `details.after` |
| generic `POST /appointments` | as sent | as sent | none | `created_by` | `details.after` |
| SMS reply `C` / `Yes` | `"Confirmed"` | untouched | `confirmed_on` | none | none (webhook) |
| SMS reply `R` | untouched | untouched | sets `add_to_call_list = true` | none | none |
| `DELETE /appointments/{id}` | untouched | untouched | `is_archived = true` | **not stamped** on the row | DELETE row (who + when) |
| `POST /appointments/{id}/restore` | untouched | untouched | `is_archived = false` | `updated_by` | POST row |

Consequence: `status`, the two flags and the stamps can disagree (`status = 'Scheduled'` with `is_cancelled = true`; `status = 'Cancelled'` with the flag false; `checked_out_on` set while `status = 'Scheduled'` if the form later rewrote the string). Reports must OR them.

**Five status classifications already in the code** — a report layer must replace them with one:

| Where | Rule |
|---|---|
| `scheduler_service` L52-63 | exact match on the normalised string |
| `sms_service._SKIP_STATUSES` L1153 | substring on lower-case: `cancel`, `complete`, `no show`, `noshow`, `missed`, `checked out`, `posted` |
| `report_service._scheduled_appointments` L128-144 | flags only: not cancelled, not blocked, not archived (so **missed counts as scheduled**); inner join to `patients` |
| `treatment_service.appointment_is_live` L244-245 | not archived and not cancelled (a no-show stays "live", so its plan items stay `scheduled`) |
| FE `dashboardUtils.deriveApptStatus`, `appointmentReport.ts`, `statusMeta.ts` | flags → stamps → string; unknown strings render as "Scheduled" in the Scheduler |

### 1.4 Cancel, no-show, broken, reschedule, delete [V]

| Topic | What exists | What is missing |
|---|---|---|
| Cancel | `is_cancelled`, `cancellation_reason varchar(50)`, `cancellation_note text`, `add_to_call_list`; the status endpoint persists all three (`scheduler_service.py` L317-323). Reason is free text; the Cancel dialog offers seven legacy values (`statusMeta.ts` `CANCELLATION_REASONS`): Automated cancellation · Cancelled and rescheduled · Cancelled by email · Cancelled by office · Cancelled NOT rescheduled · Cancelled same day · No reason provided. Not a definition group. | **The dialog's values never reach the server**: `Scheduler.confirmCancel` sends `{status: "Cancelled"}` only and logs the rest to the console (`FE: src/components/pages/Scheduler.tsx` L1997-2011). The only writers today are the SMS inbox's decline action (`cancellation_reason = "Patient declined via SMS"`, `add_to_call_list = true`) and the SMS `R` reply. Also missing: `cancelled_at`, `cancelled_by` (only `updated_at` / `updated_by`, overwritten by any later edit). |
| No-show | `is_missed` + status `Missed` / `no_show` | `missed_at`; no reason |
| Broken | no separate concept; broken = cancelled ∪ no-show | — |
| Reschedule | a move is a plain `PATCH` of `date` / `start_time` / `end_time` / `operatory_id`; the id is kept | no "moved from", no `reschedule_count`, no `rescheduled_by` (`FE` gaps NA-B8, SCHED-CCP-4). `booking_requests` has these for *requests* only. |
| Delete | `is_archived = true` (registry `soft_delete_field`, L868-869); `POST /appointments/{id}/restore` | `deleted_at` / `deleted_by`; delete reason |
| Releasing plan items | cancel / archive releases the plan items the lines book, un-cancel / restore re-books them (`appointment_service.sync_appointment_items` L120-126) | driven by flags, not by `status` |

**The `is_archived` collision.** `s26_appointments.py` L36-39 yields every row of `APPTH_ARCHIVE/*.txt` with `is_archived = True` (written at L110). The same flag is the app's soft delete. Every reader excludes archived rows by default: `GET /appointments` (`hide_soft_deleted`, registry L869), `GET /appointments/scheduler` (`scheduler_service.py` L161-162), lab cases (`lab_tracking_service.py` L337-338), last / next visit (`patient_intake_service._visits` L369-383), `report_service._scheduled_appointments`, the SMS reminder job, the AppointNow availability engine. The mapping docs call the source "Archived appointment headers — migrate these alongside `AppointmentHeader.txt` if you want full history" (`denticon_migration/migration_mapping.md` L502) [D]. Two readings, not resolved by static analysis:

| Reading | Implication |
|---|---|
| Archive = older history moved out of the live table | every report over migrated data must **include** archived migrated rows; today's "last visit" and Appointment Report under-count |
| Archive = deleted / rescheduled copies | current behaviour is right; including them would double-count |

A migrated row that is later deleted in the app cannot be told from an archive row by the columns. `audit_logs` can: a true delete has a row with `resource_type = 'appointments'`, `resource_id = <id>`, `method = 'DELETE'`. The same collision exists on `appointment_procedures.is_archived` (`s27` reads `AppointmentDetail_ARCHIVE.txt`) and on `patient_procedures.is_archived` (`Ledger_archive.txt`, `s28_patient_procedures.py` L39-47) — the financial data map recommends excluding archived charges, so the two documents must be reconciled once the meaning is known.

### 1.5 Confirmation, check-in, check-out [V]

| Measure | Source | Limits |
|---|---|---|
| Was confirmed | `confirmed_on IS NOT NULL` (durable: never cleared) or status `confirmed` | app-era only; re-confirming overwrites the time; no `confirmed_by`, no method. A text confirmation is identifiable through `sms_messages.reply_intent = 'confirm'` on the same `appointment_id`. |
| Confirmation attempts | statuses `Unconfirmed`, `Left Message` | current value only; no attempt count |
| Arrival | `checked_in_on` (status `In Reception`) | NULL if staff skip straight to Checked Out; overwritten by `in_chair` |
| Seated | — | no column; `In Operatory` stamps nothing |
| Check-out | `checked_out_on` | app-era only |
| Visit length | `checked_out_on − checked_in_on` | reception wait and chair time cannot be separated |
| Lateness | `checked_in_on` (UTC) vs `date + start_time` (office-local) | convert with `offices.timezone` |

Stamps are written with `datetime.now(timezone.utc)` (tz-aware) into `timestamp without time zone` columns in `update_status`, and with a naive UTC value in the SMS path. [I] The first form is stored as UTC wall-clock only when the database session time zone is UTC; the app never sets it (`app/db/session.py` L30-35 sets timeouts only).

### 1.6 Provider(s): doctor vs hygienist [V]

- `appointments.provider_id` is the only provider on the visit. There is no hygienist / assistant column on the appointment.
- Kind comes from `providers.role` (free text; canonical `dentist | hygienist | assistant | specialist | staff`, `provider_directory_service.py` L46-48; `provider_kind(role, title)` L94-104 also reads the licence title). Live values on the migrated tenant [D]: `dentist` 78, `hygienist` 16, `Dentist` 2, `Hygenist` 1, `staff` 2; `specialty` blank on 96 of 97 rows (`scripts/normalize_provider_roles.py` docstring). The repair script is dry-run by default.
- Per-line provider: `appointment_procedures.provider_id` (nullable). Completed work: `patient_procedures.provider_id` (treating, NOT NULL) and `patient_procedures.hygienist_id` (CHG-6). Patient preferences: `patients.preferred_provider_id`, `patients.preferred_hygienist_id` — not migrated (`s17_patients.py` L28-38).
- Chair default: `operatories.provider_id`, and the inverse `providers.default_operatory_id`. Unseeded on migrated data; `scripts/backfill_operatory_providers.py` was left unapplied [D].
- Provider ↔ office: `provider_offices` (M:N roster) ∪ `providers.office_id` (home scalar). Never scope by the scalar alone (`provider_directory_service.office_scope_clause` L107-114).
- Provider names are **not unique** (the FE relabels them "Name (ID)", `FE: src/components/reports/reports/appointmentReport.ts` L66-68). Group by `providers.id`.

### 1.7 Appointment "type" [V]

| Candidate | Reality |
|---|---|
| `appointments.procedure_label` | free text; legacy `PRODTYPE`; AppointNow writes the request's `reason_label`; plan booking writes comma-joined procedure codes; the FE offers the `procedure_type` definition group (7 seeded labels: Cleaning, Exam, Filling, Crown, Extraction, Root Canal, Ortho) but does not constrain the value |
| `definitions` group `appt_type` (recall, new_patient, emergency, consultation, treatment, hygiene, follow_up) | seeded; referenced by no column |
| `production_types` (`app/db/models/office_assignment.py` L23-35: `name`, `color`, `appointnow_visible`, `appointnow_duration`) + `office_production_types` | catalog exists; no FK from appointments |
| `appointnow_reasons` / `booking_requests.reason_id` | online requests only |
| `appointments.is_new_patient` | boolean, app-era only |
| `appointment_procedures.procedure_code` | best structured signal where lines exist |
| `patients.patient_type` (General / Ortho …), `providers.is_ortho_provider`, `procedure_codes.is_ortho`, `office_advanced_settings.is_ortho` | the General / Ortho split of legacy criteria has to come from these |

### 1.8 `appointment_procedures` — scheduled production [V]

Model `scheduling.py` L105-136; DDL `schema.sql` L347-369.

| Column | Meaning |
|---|---|
| `appointment_id` FK (indexed) | parent; tenant via appointment → office |
| `procedure_code` FK `procedure_codes.code` NOT NULL | the code |
| `provider_id` FK NULL | per-line provider |
| `treatment_plan_id`, `treatment_plan_item_id` (indexed) | the plan item this line books; setting the item id flips the item to `scheduled` |
| `tooth`, `surface`, `description`, `material_id`, `notes`, `billing_order` | |
| `fee numeric(12,2)` default 0 | **scheduled gross**. Source: the client payload; when the line names a plan item and omits the fee it inherits `treatment_plan_items.fee` (`appointment_service.py` L134-148); plan booking copies the item fee. The pricing engine is **not** run for a line (`FE` gap SCHED-CCP-3) |
| `insurance_estimate numeric(12,2)` default 0 | same sourcing |
| `est_patient numeric(12,2)` NULL | patient portion when set; else derive `fee − insurance_estimate` |
| `duration_minutes` NULL, `provider_units` default 1, `bill_to` (`P` / `I`) | chair time per line (NULL ≠ 0; falls back to `procedure_codes.default_duration_minutes`) |
| `status varchar(20)` default `'Planned'` | free text: migration writes `Completed` / `Scheduled` / `Planned` / `Existing` (`s27_appointment_procedures.py` L58-61); the app writes `TP` (`treatment_service.BOOKED_LINE_STATUS` L125). Not a reliable completion flag. |
| `is_archived` | soft delete (hidden by default); **also** true for `AppointmentDetail_ARCHIVE.txt` rows |
| `created_at` | load time on migrated rows; no `created_by`, no `updated_at` |

The migrated line ↔ plan-item link is not reconstructable (`appointment_procedures` kept no legacy id) [D] (backend `CLAUDE.md`).

Completed production lives in `patient_procedures` (see the financial data map). Its `appointment_id` is set by the FE only when a charge is entered from an appointment context (`FE: src/features/procedures/procedureEntryService.ts` L205, L259) and, for migrated rows, from `appt_map.get(LEDGER.APPTDID or LEDGER.APPTID)` (`s28_patient_procedures.py` L98-102). [I] `APPTDID` looks like an appointment-*detail* id while the map is keyed by header id, so migrated links may be wrong or missing; validate before using `appointment_id` to join charges to visits.

### 1.9 History and audit trail [V]

- No `appointment_history`, no status log, no trigger (the schema has no triggers at all).
- `audit_logs` (`app/db/models/audit.py`; DDL `schema.sql` L486-502; `details` is `json`, not `jsonb`) is written for every authenticated 2xx `POST / PUT / PATCH / DELETE`, with `action = method`, `resource_type = 'appointments'`, `resource_id = <appointment id>`, `user_id`, `office_id`, `patient_id`, `created_at`.
  - Generic writes go through `CRUDBase._audit` (`app/crud/base.py` L275-329) and carry `details.before` / `details.after` restricted to the fields that changed — so a move (`date`, `start_time`, `operatory_id`), a flag change or a status change made through the edit form is recoverable.
  - `PATCH /appointments/{id}/status` does not record a diff: the row proves that *a* status change happened, by whom and when, not which status.
  - SMS-driven confirmations and the AppointNow webhook path write no audit row for the appointment.
  - Writes are best-effort (exception-safe, own session); gaps are possible. Indexes: `(resource_type, resource_id)`, `created_at`, `user_id`, `office_id`, `patient_id`, `tenant_id`.
- Nothing predates the migration.

### 1.10 Existing read surfaces [V]

| Endpoint | Filters | Notes for reporting |
|---|---|---|
| `GET /appointments` (registry L849-880) | `patient_id`, `provider_id`, `operatory_id`, `office_id`, `date`, `status` (exact raw string), `is_archived`, `treatment_plan_id`, `has_lab`, `lab_vendor_id`, `lab_short_notice`, `lab_status`; ranges `date_from/_to`, `lab_sent_on_*`, `lab_due_on_*`, `lab_received_on_*`; office scope params | page size ≤ 200; hides archived; **no** filter on `created_at`, `created_by`, `is_cancelled`, `is_missed`, `is_new_patient`, `is_blocked`, `add_to_call_list`, `campaign_id` |
| `GET /appointments/scheduler` (`app/api/v1/scheduler.py` L35-54) | `date_from`, `date_to`, `office_id`, `provider_id`, `status`, `include_archived` | plain array, uncapped, heavy per-row enrichment (balances, alerts, pending treatment, eligibility). No office-scope check. Omits `is_new_patient`, `notes`, `campaign_id`, `created_at`, `updated_at`. Not a reporting source for long ranges. |
| `GET /appointment-procedures` (L901-908) | `appointment_id`, `procedure_code`, `provider_id`, `treatment_plan_id`, `treatment_plan_item_id`, `status`, `is_archived` | no date filter (needs the parent) |
| `GET /offices/{id}/calendar?from_date&to_date` | ≤ 400 days | per-day `is_open`, hours, lunch, holiday, `hours_source` — reusable capacity denominator (§2.2) |
| `GET /patients/{id}/context` | — | `visit { first_visit, last_visit, next_recall }` straight from the unpopulated columns |

---

## 2. Capacity: operatories, hours, holidays, block-outs

### 2.1 Tables [V]

| Table | Key columns | Notes |
|---|---|---|
| `operatories` (`identity.py` L287-297) | `id varchar(50)` (`OPR-{OPERATORYID}` or `op-{office}-{n}`), `office_id`, `name`, `display_order`, `provider_id` (column default provider), `is_active`, `created_at` | no `tenant_id`; no hours of its own; no open / close dates. `offices.deleted_operatory_ids` (JSON) remembers chairs switched off by an office delete. |
| `offices` (`identity.py` L139-220) | `timezone` (default `America/New_York`), `slot_interval_minutes` (migrated from `APPINTERVAL`), `schedule_start_hour` / `schedule_end_hour` (defaults 8 / 17, not migrated), `office_group_id`, `opening_date`, `is_active`, `deleted_at` | the migration sets only name, address, phone and the slot interval (`s02_offices.py` L32-56). `office_groups` (the legacy "Office Group" criterion) exists but is empty after migration (`OGROUP.txt` was empty, `s52_empty_tables_stubs.py` L38) |
| `office_schedule_days` (`office_setup.py` L91-102) | `office_id`, `day_of_week` (0 = Mon … 6 = Sun), `is_closed`, `start_time`, `end_time`, `lunch_start`, `lunch_end`; unique `(office_id, day_of_week)` | upsert per weekday (`office_setup_service.replace_schedule`); **current state only**, no effective dating |
| `provider_schedule_days` (`provider_setup.py` L35-50) | `provider_id`, `office_id` (NULL = every office), `day_of_week`, `is_closed`, `start_time`, `end_time`, `lunch_*`, `effective_from` | saved as delete-all + insert (`provider_setup_service.py` L51-55), so earlier versions are lost despite `effective_from` |
| `account_holidays` (`account.py` L227-240) | `tenant_id`, `office_id` (NULL = account-wide), `holiday_date`, `holiday_name`, `status` (`CLOSED \| OPEN \| HALF_DAY`), `holiday_type` (`FEDERAL \| CUSTOM`), `is_recurring` | federal import with OPM observance (`holiday_service.py` L138-156); a range create writes one row per day |
| `provider_holidays` (`provider_setup.py` L53-65) | `provider_id`, `holiday_date`, `status`, `holiday_type`, `is_recurring` | provider time off, whole days only |
| `appointments` with `is_blocked = true` | `provider_id`, `operatory_id`, `date`, `start_time`, `duration`, `procedure_label` / `notes` as the only label | migrated from `ISBLOCKED` / `PATID = 0` ("calendar blocks — holidays, closures"). The FE "Block Appointment" card is a disabled placeholder (gap NA-B1), so the UI creates no new ones. |
| `office_advanced_settings` | `default_appt_duration`, `scheduler_end_date`, `preferred_provider_id`, `is_ortho` | |
| `account_settings` | `show_booked_production`, `scheduler_show_non_working_days` | UI switches |

Nothing in `denticon_migration/` or `scripts/` loads or seeds `office_schedule_days`, `provider_schedule_days`, `provider_holidays` or `account_holidays` [V] (grep: no hit). On a migrated tenant they are empty until staff fill them in Setup.

### 2.2 The two resolvers that already exist [V]

| | `office_calendar_service` (staff booking + `GET /offices/{id}/calendar`) | `appointnow_service` (public availability) |
|---|---|---|
| No stored row for the weekday | default Mon–Fri 08:00–17:00, weekend closed, reported `hours_source = "default"` and **not enforced** (L70-74, L146-147) | `offices.schedule_start_hour`–`schedule_end_hour` for **every** weekday, weekends included (L369-371) |
| Holiday closes the day when | `status = 'CLOSED'` (NULL counts as CLOSED); `HALF_DAY` and `OPEN` do not close (L37, L88-94) | any status except `OPEN` — `HALF_DAY` closes (L335-337) |
| Office row vs account row | office-level row wins (L93) | either one closes |
| Recurring | same month and day in the range (L54-58) | same (L329-332) |
| Provider hours | not considered | `provider_schedule_days`, office-specific over all-office, latest `effective_from ≤ day`, intersected with the office window; **falls back to the office window when the provider has no rows** (L377-415) |
| Provider time off | not considered | `provider_holidays` (L310-326) |
| Booked time | not considered | appointments not archived and not cancelled, per provider and per operatory; plus live soft-holds of pending requests (L419-499) |
| Past days | supported | returns no slots (L526-527) |
| Side effects | none | expires stale requests (writes) and caches 30 s — not reusable for history |

A report engine needs **one** calendar function. `office_calendar_service.calendar()` is the better base: it is side-effect free, range-capable and already says whether the hours are stored or assumed.

### 2.3 Is there enough for utilisation, available hours and open time?

| Quantity | Computable? | From | Caveats |
|---|---|---|---|
| Booked chair minutes per operatory / day | yes [V] | `Σ appointments.duration`, patient rows, not cancelled, not deleted | `operatory_id` may be NULL; overlaps are possible (no guard); decide whether a no-show counts as booked |
| Office open minutes per day | yes, with assumptions [I] | `office_schedule_days` (weekday) − lunch − closing `account_holidays` | unconfigured offices fall back to an assumed 08–17 Mon–Fri; **today's** template is applied to past dates; `HALF_DAY` carries no hours |
| Chair capacity | yes, with assumptions [I] | open minutes × count of active operatories | active set is current only; no per-chair hours |
| Blocked minutes | partly [V] | `appointments.is_blocked` rows | migrated blocks only; no type (lunch / meeting / closure) |
| Chair utilisation | yes, approximate | booked ÷ (capacity − blocked) | all caveats above |
| Provider available hours | weak [I] | `provider_schedule_days` − `provider_holidays`, intersected with office hours | empty schedules mean "works every office hour at every office", which overstates availability; no partial-day time off |
| Provider utilisation / production per scheduled hour | weak [I] | booked minutes or production ÷ provider hours | same |
| Open time / next available | forward only [V] | `compute_availability` logic | visible-in-AppointNow providers only; one day per call |
| Unfilled slots in the past | no exact answer | — | needs a daily capacity snapshot or effective-dated schedules |

---

## 3. Recall / recare

### 3.1 `patient_recalls` [V]

Model `app/db/models/patients.py` L441-460; DDL `schema.sql` L4592-4611; registry L539-541 (`GET/POST/PATCH/DELETE /patient-recalls`, filters `patient_id`, `status`, `is_active`, office scope; DELETE sets `is_active = false`, and inactive rows are still listed unless `is_active=true` is passed).

| Column | Meaning | Pitfall |
|---|---|---|
| `patient_id` FK NOT NULL | tenant via `patients.tenant_id` (no `tenant_id` here) | |
| `office_id` FK NULL | stamped from the working office when the FE sends it | may be NULL; the FE dashboard counts a NULL-office recall as not in the selected office (`FE: src/components/dashboard/lib/useMetrics.ts` L127-149) |
| `procedure_code` FK NULL | the recall code. FE default rows: D0120, D0210, D0330, D1110, D1120, D4910 (`FE: src/features/add-patient/legacyCatalogs.ts` L299-306) | the only structured "recall type" |
| `recall_type varchar(50)` | free text — the FE writes the procedure **description** ("Recall Reason") | not a type code |
| `interval_months int`, `interval_unit varchar(10)` | the entered number and its unit (`month \| year`) | **misnomer**: a 3-year recall is stored as `interval_months = 3`, `interval_unit = 'year'` |
| `due_date date` | next due | maintained by hand |
| `scheduled_date date`, `scheduled_time varchar(10)` (`HH:MM`) | "Sch Dt / Sch Time" | typed by hand; **no FK to an appointment** |
| `last_completed date` | | written by no service |
| `status varchar(20)` default `'due'` | FE writes `Due \| Scheduled \| Completed \| Inactive` (`FE: src/features/patient-overview/RecallEditModal.tsx` L89-96, `FE: src/features/add-patient/wizardModel.ts` L559) | mixed case (`due` vs `Due`); never changed by the server |
| `notes`, `is_active`, `created_by`, `created_at`, `updated_at` | | no `updated_by` |

Indexes: `(due_date, status)`, `(patient_id)`.

### 3.2 What does not exist [V]

- **Data**: `patient_recalls` was not migrated — Denticon's `PATRECALL` had no export file (`s52_empty_tables_stubs.py` L50; migration log: 0 rows). Only recalls created in the new app exist.
- **Engine**: no code advances `due_date`, sets `last_completed` or flips `status` when a recall procedure is posted or an appointment is booked (grep of `PatientRecall` in `app/services`: created in `patient_intake_service` L189-201, read in overview / print only).
- **Catalog**: no recall-type table. `procedure_codes.recall_interval` / `recall_unit` (`codes.py` L63-64) hold per-code defaults and **were migrated** from Denticon `RECALLINT` / `RECALLUNIT` (`s10_procedure_codes.py` L51, L67-68), but no service reads them.
- **Patient-level dates**: `patients.first_visit`, `last_visit`, `next_recall` are not migrated (`s17_patients.py` L28-38) and no backend code writes them. The Overview derives last / next visit from non-archived appointments instead (`patient_intake_service._visits` L369-383) and "scheduled recall" as `min(coalesce(scheduled_date, due_date))` over active recalls (L386-390).
- **API**: no `due_date` range, no `procedure_code` / `recall_type` filter on `/patient-recalls`; a Recall report over the generic endpoint would page everything.
- **Rights**: the Recall Reports rights were removed from the catalogue (see `be_platform.md`).

### 3.3 What a Recall report can use today

| Report need | Source | Status |
|---|---|---|
| Patients due / overdue by date range and recall code | `patient_recalls.due_date`, `procedure_code`, `is_active`, `status` | works for app-created rows only |
| Recall scheduled or not | `scheduled_date IS NOT NULL` (manual) — better: a future live appointment for the patient | manual field unreliable; derive from appointments |
| Last visit | max past non-cancelled appointment date, or max `patient_procedures.date_of_service` | derive; the column is empty |
| Recall by provider / hygienist | `patients.preferred_hygienist_id` / `preferred_provider_id`, or the provider of the last hygiene procedure | preferences not migrated |
| Contact attempts | `sms_messages.message_type = 'recall'` (§5), letters / postcards (`letter_batch_runs`) | texts only; `message_type` on legacy rows is inferred from the text |
| Recall effectiveness (due → scheduled → completed) | needs recall ↔ appointment ↔ procedure links | not modelled |

For migrated patients a recall list has to be **derived**: last completed date per patient and recall code from `patient_procedures`, plus that code's `procedure_codes.recall_interval` / `recall_unit` (or a practice default) = due date; minus patients with a future live appointment. [I] The unit vocabulary of the migrated `recall_unit` values is unverified.

### 3.4 Hygiene reappointment %

Definition: of patients with a completed hygiene visit in the period, the share who left with their next hygiene visit scheduled.

| Ingredient | Source | Quality |
|---|---|---|
| Hygiene visit | `patient_procedures` with a hygiene code (D1110, D1120, D4910, D4346, D4341, D4342, D4355 — make the set configurable), `is_void = false`, by `date_of_service`, `office_id`, `provider_id` / `hygienist_id` | good, including history |
| Next hygiene appointment | a later live `appointments` row for the patient that is "hygiene": provider kind = hygienist, **or** a hygiene code among its `appointment_procedures`, **or** `procedure_label` text | heuristic (no appointment type, sparse lines, free-text label) |
| "Left with" | `appointments.created_at` (UTC → office-local) on or before the visit date | app-era rows only |

A looser, fully computable variant: "has a future hygiene appointment as of today / as of period end". SQL in §8.7.

---

## 4. Online booking, waitlist, call lists, unscheduled

### 4.1 AppointNow — `booking_requests` [V]

Model `app/db/models/appointnow.py` L73-204; DDL `schema.sql` L576-651; service `appointnow_service.py`; staff list `GET /appointnow/requests` (`app/api/v1/appointnow.py` L168-215: `status`, `office_id`, `office_ids`, `q`, `reason_id`, `reason_label`, `is_new_patient`, `date_from` / `date_to` **over `slot_date`**, sort, paging ≤ 200, per-status counts).

| Group | Columns |
|---|---|
| Identity | `id` (UUIDv7 string, time-sortable), `tenant_id`, `office_id` |
| Lifecycle | `status` ∈ `pending \| awaiting_payment \| approved \| declined \| expired`; `created_at`; `actioned_by`, `actioned_at`; `decline_reason` (free text); `hold_expires_at`; `booking_error` |
| Request | `reason_id`, `reason_label`, `duration_minutes`, `provider_id` / `provider_name`, `operatory_id`, `slot_date`, `start_time`, `end_time`, `is_emergency` |
| Contact | `first_name`, `last_name`, `phone`, `email`, `date_of_birth`, `is_new_patient`, `insurance_info`, `notes`, acknowledgement flags + hashes |
| Reschedule | `original_slot_date` / `_start_time` / `_end_time` / `_duration_minutes` / `_provider_id`, `reschedule_count`, `rescheduled_by`, `rescheduled_at` |
| Outcome | `appointment_id` (FK, set on approve), `patient_id` (matched / created on approve), `contact_notified_at` / `_via` (last notification only) |
| Payment | `requires_payment`, `payment_status` ∈ `not_required \| required \| link_sent \| paid \| expired \| refunded`, `payment_amount`, `paid_at`, `paid_amount`, `payment_method`, `ledger_payment_id` (FK `patient_payments`), refund block |
| Abuse | `source_ip` (never returned publicly) |

Catalog: `appointnow_reasons` (per office: `reason_code`, `label`, `duration_minutes`, `requires_provider`, `requires_payment`, `payment_amount`, `is_active`); a built-in six-reason list is served when an office has none (`appointnow_service.py` L80-87). Provider opt-in: `providers.visible_in_appointnow`.

Supported out of the box: requests by status / office / reason / new-vs-existing / day, approval and decline rates, expiry rate, response time (`actioned_at − created_at`), lead time (`slot_date − created_at`), reschedule rate, emergency share, online deposits collected, conversion to a kept visit (join `appointment_id`). Not captured: marketing source / UTM, abandonment before submit, decline reason as a code.

Time bases inside this one table: `created_at` (DB `now()`), `actioned_at`, `rescheduled_at`, `acknowledged_at`, `paid_at`, `refunded_at`, `contact_notified_at`, `payment_link_expires_at` = naive UTC; **`hold_expires_at` = office-local naive** (`appointnow_service.py` L963-964). `pending → expired` is flipped lazily on inbox / availability reads and by `scripts/expire_booking_requests.py` (cron outside the repo), so `expired` counts depend on that job running.

Indexes: `(tenant_id, office_id, status, created_at)`, `(tenant_id, office_id, slot_date)`, `tenant_id`, `office_id`, `payment_link_id`.

### 4.2 Waitlist / ASAP / short-call / quick-fill [V]

| Concept | What exists | Usable for a report? |
|---|---|---|
| Call list (cancelled or asked to reschedule) | `appointments.add_to_call_list` — set by an SMS `R` reply and by the SMS inbox's decline action; the Cancel dialog's tick box is collected but not sent (§1.4) | by SQL only; **not** an API filter; no "worked / resolved" state; effectively empty for cancellations made in the Scheduler |
| Quick-Fill (short-notice) list | `patients.add_to_quickfill` (boolean) | flag only; no preferred days / times; the FE "Quick Fill List" card is disabled (gap NA-B2) |
| ASAP / waitlist with wanted slot | — | not modelled |
| Short call list right | `appointments_short_call_list` appears in the legacy rights catalogue (`access_rights_catalog.py` L41) | a right without a feature |

### 4.3 Unscheduled and broken lists (all derived) [V]/[I]

| List | Derivation |
|---|---|
| Broken appointments not rescheduled | cancelled ∪ no-show in the period with no later live appointment for the patient |
| Unscheduled treatment | pending plan items (`treatment_service.pending_item_clauses` L942-952: not archived, `end_date IS NULL`, no live charge, status ∉ `completed \| referred_out \| external_referral`) with status ≠ `scheduled` and no live booking line. `GET /patients/{id}/treatment-plan-items?pending=true` and the feed's `pending_tx_count` / `pending_tx_scheduled_count` / `pending_tx_fee` use the same rule per patient; there is no practice-wide endpoint. |
| Active patients with no future appointment | `patients.is_active` and no live appointment with `date ≥ today` |
| Unscheduled recall | active recall due with no future live appointment |
| Incomplete / un-posted visits | past appointments neither cancelled, missed nor checked out / posted |

Legacy plan-item statuses are single letters and long forms folded by `treatment_service.LEGACY_ITEM_STATUS_MAP` (L908-919); `scripts/normalize_treatment_item_statuses.py` repairs stored rows. Only 674 plans / 677 items were derived by the migration [D].

---

## 5. Communications

### 5.1 `sms_messages` [V]

Model `app/db/models/comms.py` L28-94; DDL `schema.sql` L6555-6590; service `app/services/sms_service.py`; list `GET /sms-messages` (registry L1314-1341: filters `patient_id`, `appointment_id`, `message_type`, `is_read`, `office_id`, `direction`, `send_status`, `needs_attention`, `reply_intent`, `template_id`; ranges `sent_at_*`, `reply_received_on_*`; `date_from` / `date_to` on the activity timestamp).

| Column | Meaning |
|---|---|
| Shape | **one row per outbound text with the reply on the same row** (`sent_text` + `reply_text`); a stand-alone inbound text is a row with `sent_text IS NULL`, `direction = 'inbound'` |
| `tenant_id`, `office_id` (NULL allowed), `patient_id` (NULL = unmatched), `appointment_id` | links |
| `message_type` | `manual \| appointment_reminder \| appointment_confirmation \| recall \| balance \| inbound_reply \| opt_out \| opt_in \| other` (L77-80) |
| `direction`, `sent_at`, `sent_phone`, `from_phone`, `segments`, `template_id`, `client_id`, `created_by` (NULL = automated job) | send side |
| `send_status` | `queued \| sent \| delivered \| deliveryfailed \| sendingfailed \| received` (RingCentral vocabulary); `error_code`, `error_message` |
| `delivered_on` | delivery stamp |
| `reply_text`, `reply_phone`, `reply_received_on`, `reply_intent` (`confirm \| reschedule \| cancel \| stop \| start \| help \| other`), `needs_attention`, `is_read` | reply side |
| `reminder_lead_hours` | which lead bucket an automated reminder was for; unique `(appointment_id, message_type, reminder_lead_hours)` where not NULL |
| `twilio_sid`, `reply_twilio_sid` | provider message ids (names kept after the move to RingCentral) |

Producers [V]: `POST /sms/send` (manual; the caller picks `message_type`); the reminder job `run_reminders` (L1160-1272; `message_type = 'appointment_reminder'`, default leads `[48, 2]` hours from `account_communications.sms_reminder_lead_hours`, skips opted-out patients, quiet hours, cancelled / completed / missed / archived appointments; invoked by `scripts/run_sms_reminders.py` or `POST /sms/reminders/run`); the optional confirmation auto-reply (`appointment_confirmation`); the inbound webhook; hand-posted rows; the migration.

Effects on the appointment [V] (`handle_inbound` L793-924): a `confirm` reply to a text that carries an `appointment_id` sets `appointments.confirmed_on` and `status = 'Confirmed'`; `reschedule` sets `add_to_call_list`; `cancel` only raises `needs_attention` (staff cancel). `stop` / `start` flip `patients.no_auto_sms` and stamp `sms_opt_out_at` / `sms_opt_in_at`.

Legacy rows (5,425 [D]): `message_type`, `direction` and `sent_at` were **back-filled by heuristics** (`alembic/versions/e0f1a2b3c4d5_add_sms_module_gaps.py` L99-134: type from keywords in the text, `sent_at = coalesce(delivered_on, created_at)` — and `created_at` is the load time, `send_status 'Success' → 'delivered'`). Treat legacy text analytics as indicative.

Gateway: when RingCentral is not configured the service runs log-only and rows stay `queued` (`_dispatch` L613-617) — a delivery-rate report must check `GET /sms/gateway`. Retention: `scripts/purge_sms_messages.py` blanks bodies past `SMS_RETENTION_DAYS` and keeps the row.

Indexes: `(patient_id, created_at)`, `(office_id, sent_at)`, `sent_phone`, `from_phone`, unique `(tenant_id, client_id)`, unique provider ids, the partial reminder index. No general index on `appointment_id` or on `(tenant_id, message_type, sent_at)`.

### 5.2 `email_messages` [V]

Model `comms.py` L134-169; DDL `schema.sql` L1620-1645. Columns: `tenant_id`, `office_id`, `patient_id`, `appointment_id`, `to_email`, `subject`, `message_type` (`manual | appointment_reminder | appointment_confirmation | recall | balance | statement | other`), `send_status` (SendGrid events: `queued | processed | delivered | deferred | bounce | dropped | open | click | spamreport | unsubscribe | failed`), `sent_at`, `delivered_at`, `opened_at`, `created_by`. The **only** producer is `POST /email/send` (`app/api/v1/email.py` L41-48). There is no automated e-mail reminder or confirmation job.

### 5.3 Not logged [V]

- AppointNow contact notifications (approve / decline / reschedule / payment) are sent through the gateways directly and leave no `sms_messages` / `email_messages` row — only `booking_requests.contact_notified_at` / `_via`, last one only (`appointnow_notification_service.py` L20-27, L193-247).
- Phone calls, letters and postcards as contact attempts: `letter_batch_runs` / `letter_batch_items` record batch letters; nothing records a call.

### 5.4 Confirmation-rate reporting — what is supportable

| Metric | Formula | Scope |
|---|---|---|
| Confirmed share of appointments | `confirmed_on IS NOT NULL` ÷ patient appointments that reached their date | app-era |
| Reminder funnel | reminders sent → `send_status = 'delivered'` → replied → `reply_intent = 'confirm'` | by office, day, lead bucket, template |
| Confirmed-by-text share | appointments with a `confirm` reply ÷ appointments reminded | |
| Needs-action replies | `reply_intent IN ('cancel','reschedule')` | work queue |
| Opt-out rate | `patients.no_auto_sms`, `sms_opt_out_at` | |
| No-show rate by confirmation state | join the above with §8.2 | app-era |

---

## 6. Time clock

### 6.1 Tables [V]

| Table | Columns | Notes |
|---|---|---|
| `time_clock_entries` (`staff.py` L37-90; DDL L6774-6802) | `tenant_id`, `office_id` (NULL allowed), `user_id`, `clock_in`, `clock_out`, `total_hours numeric(5,2)` (derived on every write), `entry_type` (`work \| break \| lunch`; only `work` is paid), `source` (`punch \| manual \| legacy`), `clock_basis` (`utc \| wall_clock \| utc_converted`), `notes`, `created_by`, `updated_at/by`, `is_edited`, `original_clock_in/out`, `edit_reason`, soft delete (`is_active`, `deleted_at/by`, `delete_reason`), `auto_closed`, `auto_closed_at`, `auto_close_reason` | partial unique index: one open shift per user |
| `time_clock_entry_edits` (L93-109) | `entry_id`, `action`, `edited_by`, `edited_at`, `edit_reason`, original and new in / out, `changes` JSON | append-only change log |
| `time_clock_periods` (L112-131) | `office_id` (NULL = all), `period_start`, `period_end`, `status` (`open \| approved \| locked`), `locked`, approver / locker stamps | a locked period freezes its entries (409 `period_locked`) |
| `time_clock_settings` (L134-156) | per tenant: `overtime_method` (`none \| weekly \| daily \| daily_weekly`), daily / weekly thresholds (8 / 40), `week_start_day`, `overtime_rate` (1.5), `auto_close_after_hours` (20), `auto_close_policy` (`flag \| office_close \| off`), `require_edit_reason` | |
| `user_time_clock_config` (`access.py` L139-159) | per user: `pay_rate`, `overtime_method`, `overtime_rate`, `clock_in_required`, threshold and week-start overrides | wages are visible to `owner \| admin \| super_admin` only |

### 6.2 The existing report [V]

`GET /reports/time-clock?from&to[&user_id][&office_id][&office_ids][&all_offices][&overtime_method][&include_wages][&include_entries]` → `TimeClockReport` (`time_clock_service.build_report` L1324-1465): per user `{rule, pay_rate, days:[{date, regular, overtime, total, break_hours, issues, entries}], totals}` + grand totals (`regular`, `overtime`, `total`, `break_hours`, `days_worked`, `entry_count`, `issue_count`, pay figures when allowed). `…/report.csv?layout=summary|detail`, `…/report.pdf?detail=`. Range ≤ 366 days. Days are the **office-local date of clock-in**; `wall_clock` rows are read as local. Weekly overtime looks back before `from`. Office scope via `resolve_list_office_filter(..., reports=True)`; non-managers get their own card only; exports are audited (`action = 'PRINT'`, `resource_type = 'time_clock_report'`). Issues vocabulary: `open`, `missing_clock_out`, `auto_closed`, `clock_out_before_clock_in`, `long_shift` (> 12 h).

### 6.3 Pitfalls [V]

- All 31,756 migrated rows are `source = 'legacy'`, `clock_basis = 'wall_clock'` (office wall time stored as if UTC). `scripts/backfill_time_clock_utc.py` converts them and was **not run** [D]. Plain SQL over `clock_in` mixes two bases — always branch on `clock_basis` (as `work_date` L388-393 does).
- 856 of 857 open legacy rows were flagged `auto_closed` / `missing_clock_out` and count 0 hours [D].
- `office_id` may be NULL on legacy rows whose `OID` was not mapped (`s40_time_clock_entries.py` L62).
- There is no staff *schedule* (planned shifts), so "scheduled vs worked" cannot be reported. Hours can be related to production only at office / day level, or per provider where `providers.user_id` links a provider to a user (most migrated providers have no linked user [D], `provider_setup.py` L88-90).
- The FE still aggregates client-side; the server CSV / PDF have no FE caller (see `be_existing_reporting.md`).

---

## 7. Lab cases

A lab case **is** an appointment with `has_lab = true`; there is no lab-case row [V] (`lab_tracking_service.py` L1-31).

| Item | Detail |
|---|---|
| Columns | `has_lab`, `lab_vendor_id` (FK `labs`), `lab_dds` (free text — the dentist, max 100), `lab_cost numeric(10,2)`, `lab_short_notice`, `lab_sent_on`, `lab_due_on`, `lab_received_on` (dates) |
| Catalog | `labs` (`scheduling.py` L17-50): `tenant_id`, `office_id` (NULL = all offices), `name`, `code`, contact fields, `default_turnaround_days`, `is_active` |
| Derived status | `received` (received date set) → `overdue` (sent, due date before today, not received) → `sent` → `not_sent`; `not_received` = sent ∪ overdue (`derive_lab_status` L93-104 and its SQL twin). "Today" = the office's local date when one office is selected, else UTC |
| Write rules | un-ticking `has_lab` clears the detail; any lab detail implies `has_lab`; due / received before sent is 422 `lab_date_order` |
| Existing outputs | `GET /appointments/lab-cases` (16 filters, per-status counts, total cost), `…/cost-report` (`date_basis` = `appointment \| sent \| due \| received`; `group_by` = `vendor \| provider \| office \| month \| dds`), `…/report.pdf`, `…/cost-report.pdf`, `…/export.csv` |
| Due date vs appointment | **not compared anywhere**. "Case not back before the appointment it is needed for" = `has_lab AND lab_received_on IS NULL AND date <= :horizon` is a new derivation; turnaround = `lab_received_on − lab_sent_on`; lateness = `lab_received_on − lab_due_on`; on-time rate per vendor follows |
| Gaps | one case per appointment — [I] a case spanning the prep and the seat visit is two unrelated rows; no case number; no remake flag; `lab_cost` is read only by the lab and scheduler code (it is not posted to any ledger); the cost report aggregates in Python; these routes take `office_id` with a tenant check only (no office-scope validation) |
| Data | 18 lab cases among the migrated appointments, 14 of them archived [D] |

---

## 8. Metric logic (PostgreSQL sketches) and pitfalls

### 8.1 One canonical appointment fact

Every metric below should read from a single normalised relation, not re-derive predicates:

```sql
CREATE VIEW v_appointment_fact AS
SELECT a.id, o.tenant_id, a.office_id, o.timezone, o.office_group_id,
       a.provider_id, a.operatory_id, a.patient_id,
       a.date, a.start_time, a.duration,
       (a.legacy_id IS NOT NULL)                                   AS is_migrated,
       (a.is_blocked OR a.patient_id IS NULL)                      AS is_block,
       s.status_norm,
       (a.is_cancelled OR s.status_norm IN ('cancelled','canceled')) AS is_cancelled_n,
       (a.is_missed    OR s.status_norm IN ('missed','no_show'))     AS is_no_show_n,
       (a.checked_out_on IS NOT NULL OR a.is_posted
          OR s.status_norm IN ('checked_out','completed'))           AS is_completed_n,
       (a.confirmed_on IS NOT NULL OR s.status_norm = 'confirmed')   AS was_confirmed,
       -- deleted in the app: archived AND (app row OR an audited DELETE). Archived migrated rows
       -- without a DELETE are the legacy archive partition — include or exclude per the §1.4 decision.
       (a.is_archived AND (a.legacy_id IS NULL OR EXISTS (
            SELECT 1 FROM audit_logs al
            WHERE al.resource_type = 'appointments' AND al.resource_id = a.id AND al.method = 'DELETE')))
                                                                    AS is_deleted,
       (a.is_archived AND a.legacy_id IS NOT NULL)                  AS is_legacy_archive,
       a.is_new_patient, a.confirmed_on, a.checked_in_on, a.checked_out_on,
       a.cancellation_reason, a.add_to_call_list, a.campaign_id, a.procedure_label,
       a.created_at, a.created_by, a.updated_at, a.updated_by
FROM appointments a
JOIN offices o ON o.id = a.office_id                      -- tenant comes from here
CROSS JOIN LATERAL (
  SELECT lower(regexp_replace(btrim(a.status), '[ -]+', '_', 'g')) AS status_norm) s;
```

Outcome class, in priority order: `cancelled` → `no_show` → `completed` → `past_unresolved` (date before the office's today and none of the above) → `in_office` (arrived / seated) → `confirmed` → `scheduled`.

### 8.2 Appointments by status / provider / operatory / day; no-show and cancellation rates

```sql
SELECT f.date, f.office_id, f.provider_id, f.operatory_id,
       count(*)                                         AS appts,
       sum(f.duration)                                  AS booked_minutes,
       count(*) FILTER (WHERE f.is_completed_n)         AS completed,
       count(*) FILTER (WHERE f.is_no_show_n)           AS no_shows,
       count(*) FILTER (WHERE f.is_cancelled_n)         AS cancelled,
       count(*) FILTER (WHERE f.was_confirmed)          AS confirmed
FROM v_appointment_fact f
WHERE f.tenant_id = :tenant AND f.date BETWEEN :from AND :to
  AND NOT f.is_block AND NOT f.is_deleted
GROUP BY 1,2,3,4;
```

| Rate | Formula | Note |
|---|---|---|
| No-show rate | `no_shows ÷ (completed + no_shows)` | denominator = appointments that reached their time uncancelled; restrict to past dates |
| Cancellation rate | `cancelled ÷ appts` | |
| Broken rate | `(no_shows + cancelled) ÷ appts` | |
| Same-day cancellation | the `/status` audit row's `created_at` (UTC → office-local) vs the appointment date; `cancellation_reason = 'Cancelled same day'` once the dialog's values are actually sent | no `cancelled_at`; the reason is not persisted today (§1.4) |
| Cancellations by reason | `cancellation_reason` | populated only by the SMS decline path today |
| Unresolved | past, not completed / missed / cancelled | measures front-desk close-out discipline; on migrated data it also absorbs visits that were kept but never checked out |

### 8.3 New-patient appointments

```sql
-- (a) flag, app-era only
SELECT count(*) FROM v_appointment_fact
WHERE is_new_patient AND NOT is_migrated AND NOT is_block AND NOT is_deleted AND NOT is_cancelled_n;

-- (b) derived, works across the migration: the patient's first uncancelled appointment
SELECT * FROM (
  SELECT f.*, row_number() OVER (PARTITION BY f.patient_id ORDER BY f.date, f.start_time) AS rn
  FROM v_appointment_fact f
  WHERE NOT f.is_block AND NOT f.is_deleted AND NOT f.is_cancelled_n) x
WHERE rn = 1 AND date BETWEEN :from AND :to;
```

Variant (b) depends on the §1.4 decision (if the archive is real history it must be included, otherwise old patients look new). The financial equivalent is the first `patient_procedures.date_of_service`.

### 8.4 Scheduled production by day / provider

```sql
SELECT f.date, f.office_id, coalesce(ap.provider_id, f.provider_id) AS provider_id,
       sum(ap.fee)                                                       AS scheduled_gross,
       sum(ap.insurance_estimate)                                        AS est_insurance,
       sum(coalesce(ap.est_patient, greatest(ap.fee - ap.insurance_estimate, 0))) AS est_patient,
       count(DISTINCT f.id)                                              AS appts_with_lines
FROM v_appointment_fact f
JOIN appointment_procedures ap ON ap.appointment_id = f.id AND NOT ap.is_archived
WHERE f.tenant_id = :tenant AND f.date BETWEEN :from AND :to
  AND NOT f.is_block AND NOT f.is_deleted AND NOT f.is_cancelled_n
GROUP BY 1,2,3;
```

Report the share of appointments **without** lines next to the figure: an appointment with no treatment lines contributes 0, and lines are a price snapshot (not re-priced when coverage or the fee schedule changes). Scheduled-vs-completed needs `patient_procedures` for the same patient and day; `ap.status` is not a completion flag.

### 8.5 Production per visit

```sql
WITH visits AS (
  SELECT pp.office_id, pp.patient_id, pp.date_of_service, sum(pp.fee) AS production
  FROM patient_procedures pp
  JOIN patients p ON p.id = pp.patient_id AND p.tenant_id = :tenant
  WHERE NOT pp.is_void AND pp.date_of_service BETWEEN :from AND :to
  GROUP BY 1,2,3)
SELECT office_id, count(*) AS visits, sum(production) AS production,
       round(sum(production) / nullif(count(*), 0), 2) AS production_per_visit
FROM visits GROUP BY 1;
```

A visit = distinct `(patient_id, date_of_service, office_id)`. Do not use `patient_procedures.appointment_id` as the visit key (§1.8). Apply the archived-charge rule chosen in the financial data map.

### 8.6 Chair utilisation

```sql
WITH days AS (
  SELECT d::date AS d, extract(isodow FROM d)::int - 1 AS dow      -- 0 = Mon … 6 = Sun, as stored
  FROM generate_series(:from::date, :to::date, interval '1 day') d),
hol AS (                                    -- office row beats account row; NULL status = CLOSED
  SELECT DISTINCT ON (dd.d) dd.d, upper(coalesce(h.status, 'CLOSED')) AS status
  FROM days dd
  JOIN account_holidays h ON h.tenant_id = :tenant
   AND (h.office_id = :office OR h.office_id IS NULL)
   AND (h.holiday_date = dd.d
        OR (h.is_recurring AND to_char(h.holiday_date, 'MMDD') = to_char(dd.d, 'MMDD')))
  ORDER BY dd.d, (h.office_id IS NULL)),
open_min AS (
  SELECT dd.d,
         CASE
           WHEN hol.status = 'CLOSED' THEN 0
           WHEN s.id IS NULL THEN CASE WHEN dd.dow >= 5 THEN 0 ELSE 540 END   -- unconfigured: assumed 08–17
           WHEN s.is_closed OR s.start_time IS NULL OR s.end_time IS NULL THEN 0
           ELSE extract(epoch FROM (s.end_time - s.start_time)) / 60
                - coalesce(extract(epoch FROM (s.lunch_end - s.lunch_start)) / 60, 0)
         END AS minutes,
         (s.id IS NULL) AS hours_assumed
  FROM days dd
  LEFT JOIN office_schedule_days s ON s.office_id = :office AND s.day_of_week = dd.dow
  LEFT JOIN hol ON hol.d = dd.d),
chairs AS (SELECT count(*) AS n FROM operatories WHERE office_id = :office AND is_active),
booked AS (
  SELECT f.date AS d,
         sum(f.duration) FILTER (WHERE NOT f.is_block) AS booked_min,
         sum(f.duration) FILTER (WHERE f.is_block)     AS blocked_min
  FROM v_appointment_fact f
  WHERE f.office_id = :office AND f.date BETWEEN :from AND :to
    AND NOT f.is_deleted AND NOT f.is_cancelled_n AND f.operatory_id IS NOT NULL
  GROUP BY 1)
SELECT o.d, o.hours_assumed, o.minutes * c.n AS chair_capacity_min,
       coalesce(b.booked_min, 0) AS booked_min, coalesce(b.blocked_min, 0) AS blocked_min,
       round(coalesce(b.booked_min, 0)::numeric
             / nullif(o.minutes * c.n - coalesce(b.blocked_min, 0), 0), 3) AS chair_utilisation
FROM open_min o CROSS JOIN chairs c LEFT JOIN booked b ON b.d = o.d;
```

Mirrors `office_calendar_service` (the staff-side rule). Surface `hours_assumed` in the output; decide whether no-shows count as booked ("scheduled" vs "kept" utilisation); cap or flag values above 1 (double booking). Provider utilisation replaces the chair count with per-provider minutes from `provider_schedule_days` minus `provider_holidays`, falling back to office hours when a provider has no rows.

### 8.7 Hygiene reappointment rate

```sql
WITH hyg_visits AS (                       -- one row per patient x hygiene visit day
  SELECT DISTINCT pp.patient_id, pp.office_id, pp.date_of_service AS dos
  FROM patient_procedures pp
  JOIN patients p ON p.id = pp.patient_id AND p.tenant_id = :tenant
  WHERE NOT pp.is_void AND pp.date_of_service BETWEEN :from AND :to
    AND pp.procedure_code = ANY(:hygiene_codes)),
next_hyg AS (
  SELECT v.patient_id, v.dos, min(f.date) AS next_date,
         bool_or((f.created_at AT TIME ZONE 'UTC' AT TIME ZONE f.timezone)::date <= v.dos
                 AND NOT f.is_migrated) AS booked_by_visit_day
  FROM hyg_visits v
  JOIN v_appointment_fact f ON f.patient_id = v.patient_id AND f.date > v.dos
   AND NOT f.is_block AND NOT f.is_deleted AND NOT f.is_cancelled_n
  LEFT JOIN providers pr ON pr.id = f.provider_id
  WHERE lower(pr.role) IN ('hygienist', 'hygenist')                -- heuristic 1: hygienist column
     OR EXISTS (SELECT 1 FROM appointment_procedures ap            -- heuristic 2: hygiene code booked
                WHERE ap.appointment_id = f.id AND NOT ap.is_archived
                  AND ap.procedure_code = ANY(:hygiene_codes))
  GROUP BY 1, 2)
SELECT count(*)                                              AS hygiene_visits,
       count(n.next_date)                                    AS has_future_hygiene_appt,
       count(*) FILTER (WHERE n.booked_by_visit_day)         AS left_with_next_visit_booked,
       round(100.0 * count(*) FILTER (WHERE n.booked_by_visit_day) / nullif(count(*), 0), 1)
                                                             AS hygiene_reappointment_pct
FROM hyg_visits v LEFT JOIN next_hyg n USING (patient_id, dos);
```

`left_with_next_visit_booked` is only meaningful for visits after go-live. `has_future_hygiene_appt` (the "currently reappointed" variant) is computable for any period but drifts as appointments are added later. The general reappointment rate drops the hygiene filters on both sides.

### 8.8 Unscheduled treatment; broken not rescheduled; appointments created by user; confirmation funnel

```sql
-- Unscheduled treatment (practice-wide twin of treatment_service.pending_item_clauses).
-- Fold legacy single-letter item statuses first (LEGACY_ITEM_STATUS_MAP: c, s, ro, er …).
SELECT tp.patient_id, coalesce(tp.office_id, p.home_office_id) AS office_id,
       count(*) AS items, sum(i.fee) AS fee
FROM treatment_plan_items i
JOIN treatment_plans tp ON tp.id = i.plan_id
JOIN patients p ON p.id = tp.patient_id AND p.tenant_id = :tenant
WHERE NOT i.is_archived AND i.end_date IS NULL
  AND coalesce(lower(i.status), '') NOT IN ('completed','referred_out','external_referral','scheduled')
  AND NOT EXISTS (SELECT 1 FROM patient_procedures pp
                  WHERE pp.treatment_plan_item_id = i.id AND NOT pp.is_void)
  AND NOT EXISTS (SELECT 1 FROM appointment_procedures ap
                  JOIN appointments a ON a.id = ap.appointment_id
                  WHERE ap.treatment_plan_item_id = i.id AND NOT ap.is_archived
                    AND NOT a.is_archived AND NOT a.is_cancelled)
GROUP BY 1, 2;

-- Broken appointments with no later live appointment
SELECT f.* FROM v_appointment_fact f
WHERE f.tenant_id = :tenant AND f.date BETWEEN :from AND :to
  AND (f.is_cancelled_n OR f.is_no_show_n) AND NOT f.is_block AND NOT f.is_deleted
  AND NOT EXISTS (SELECT 1 FROM v_appointment_fact n
                  WHERE n.patient_id = f.patient_id AND n.date > f.date
                    AND NOT n.is_block AND NOT n.is_deleted
                    AND NOT n.is_cancelled_n AND NOT n.is_no_show_n);

-- Appointments created by user, by office-local creation date (app-era rows only)
SELECT f.created_by, u.username,
       (f.created_at AT TIME ZONE 'UTC' AT TIME ZONE f.timezone)::date AS created_local_date,
       count(*) AS booked,
       count(*) FILTER (WHERE f.is_new_patient) AS new_patient_booked,
       count(*) FILTER (WHERE f.is_cancelled_n) AS later_cancelled
FROM v_appointment_fact f LEFT JOIN users u ON u.id = f.created_by
WHERE f.tenant_id = :tenant AND NOT f.is_migrated AND NOT f.is_block
  AND f.created_at >= :from_utc AND f.created_at < :to_utc
GROUP BY 1, 2, 3;

-- Reminder / confirmation funnel
SELECT m.office_id, m.reminder_lead_hours,
       count(*)                                                  AS sent,
       count(*) FILTER (WHERE m.send_status = 'delivered')       AS delivered,
       count(*) FILTER (WHERE m.reply_received_on IS NOT NULL)   AS replied,
       count(*) FILTER (WHERE m.reply_intent = 'confirm')        AS confirmed_by_text,
       count(*) FILTER (WHERE m.reply_intent IN ('cancel','reschedule')) AS needs_action
FROM sms_messages m
WHERE m.tenant_id = :tenant AND m.direction = 'outbound'
  AND m.message_type = 'appointment_reminder'
  AND m.sent_at >= :from_utc AND m.sent_at < :to_utc
GROUP BY 1, 2;
```

Online-booking users appear as the approver; `created_by IS NULL` on app rows = unattended paths.

### 8.9 Pitfall register

| # | Pitfall | Rule |
|---|---|---|
| 1 | `is_archived` = soft delete **and** legacy archive partition | never use `NOT is_archived` blindly on migrated rows; decide once (§1.4) and encode it in the fact view |
| 2 | Soft-deleted rows returned by feeds | fixed for `/appointments` and `/appointments/scheduler` (default hide); raw SQL and `?include_archived=true` / `?is_archived=true` still see them; `appointment_procedures`, `treatment_plan_items`, `time_clock_entries.is_active`, `patient_recalls.is_active` each have their own flag |
| 3 | Free-form `status` in three vocabularies and mixed case | normalise; classify on flags and stamps first |
| 4 | `status`, `is_cancelled`, `is_missed` are independently writable | OR them |
| 5 | Stamps are overwritten and never cleared | `confirmed_on` = last confirmation; an "unconfirmed" appointment may still carry it |
| 6 | Block-outs live in the fact table | exclude `is_blocked OR patient_id IS NULL` from counts; subtract them from capacity |
| 7 | `Available` is a patient-flow status | not an open slot |
| 8 | No overlap guard | utilisation can exceed 100 % |
| 9 | `created_at` on migrated rows = load time; re-runs rewrite `updated_at` | restrict created-date metrics to `legacy_id IS NULL`; expect a spike at the migration date otherwise |
| 10 | Naive timestamps, mixed bases | `date` / `start_time` office-local; stamps UTC; convert with `offices.timezone` before bucketing by day; legacy time-clock rows are local; `booking_requests.hold_expires_at` is local |
| 11 | Migrated offices start on the default `America/New_York` | verify `offices.timezone` per office before any UTC → local conversion |
| 12 | Server "today" is UTC in several places | `billing_service.todays_appointment` (L956-958), the scheduler feed (age, lab status), `report_service`; an evening in the US is already tomorrow |
| 13 | `chart_no` is not unique | 10,045 duplicated `(tenant_id, chart_no)` groups across 83,898 patients [D] (`docs/scheduler/add_edit_appointment_backend_response.md` L256-274); the ORM declares `unique=True` but the database has no such constraint (`schema.sql`); key on `patients.id` |
| 14 | Provider names repeat; `role` is free text with typos | key on `providers.id`; normalise `role` through `provider_kind` |
| 15 | `providers.office_id` is a home scalar | use `provider_offices ∪ home` for "providers of an office"; an appointment's own `office_id` is authoritative for where work happened |
| 16 | No `tenant_id` on `appointments`, `appointment_procedures`, `operatories`, `patient_recalls` | always join `offices.tenant_id` or `patients.tenant_id` |
| 17 | `duration` vs `end_time` | `end_time` wraps at midnight and can be inconsistent; use `duration` |
| 18 | Unknown `OID` in the migration fell back to the first office | a slice of legacy appointments may sit in the wrong office |
| 19 | Capacity uses today's template | historical utilisation shifts when someone edits office hours |
| 20 | `interval_months` is not months when `interval_unit = 'year'` | multiply |
| 21 | SMS rows are outbound-with-reply | count replies from `reply_received_on`, not from inbound rows alone; legacy `message_type` is inferred |
| 22 | Log-only SMS mode | `send_status` stays `queued`; delivery rates are meaningless until the gateway is live |

### 8.10 Date bases available per fact (for the legacy "by date of service vs by created date" criterion) [V]

| Fact | Service / event date | Created date | Other dates |
|---|---|---|---|
| `appointments` | `date` (office-local) | `created_at` (UTC; app-era only) | `updated_at`; `confirmed_on`, `checked_in_on`, `checked_out_on`, `posted_on` |
| `appointment_procedures` | parent `appointments.date` | `created_at` (load time on migrated rows) | — |
| `booking_requests` | `slot_date` (office-local) | `created_at` (UTC) | `actioned_at`, `rescheduled_at`, `paid_at` |
| `patient_recalls` | `due_date` | `created_at` | `scheduled_date`, `last_completed`, `updated_at` |
| `sms_messages` / `email_messages` | `sent_at` (UTC) | `created_at` | `delivered_on` / `delivered_at`, `reply_received_on`, `opened_at` |
| `time_clock_entries` | office-local date of `clock_in` | `created_at` | `updated_at`, `deleted_at`, the edit log |
| Lab case | `appointments.date`, `lab_sent_on`, `lab_due_on`, `lab_received_on` | as the appointment | — |

"User" as a criterion: `appointments.created_by` / `updated_by`, `booking_requests.actioned_by`, `sms_messages.created_by` (NULL = automated), `time_clock_entries.user_id`, `audit_logs.user_id`. None of these is populated on migrated scheduling rows except the time-clock `user_id`.

---

## 9. Indexes

### 9.1 Existing [V] (`schema.sql`)

| Table | Indexes |
|---|---|
| `appointments` | `idx_appt_date_office (date, office_id)`, `idx_appt_provider_date (provider_id, date)`, `idx_appt_operatory_date (operatory_id, date)`, `idx_appt_patient_date (patient_id, date)`, `idx_appt_status (status)`, `idx_appt_archived (is_archived)`, `idx_appt_legacy (legacy_id)`, `ix_appointments_lab_vendor_id`, `ix_appointments_office_has_lab (office_id, has_lab)` |
| `appointment_procedures` | `idx_appt_proc_appt (appointment_id)`, `ix_appointment_procedures_treatment_plan_item_id` |
| `operatories` | `idx_operatories_office`, `idx_operatories_legacy` |
| `office_schedule_days` | `office_id`, `tenant_id`, unique `(office_id, day_of_week)` |
| `provider_schedule_days` | `provider_id`, `office_id`, `tenant_id` |
| `account_holidays` / `provider_holidays` | `holiday_date`, `office_id` / `provider_id`, `tenant_id` |
| `patient_recalls` | `idx_pat_recall_due (due_date, status)`, `idx_pat_recall_patient (patient_id)` |
| `booking_requests` | `(tenant_id, office_id, status, created_at)`, `(tenant_id, office_id, slot_date)`, `tenant_id`, `office_id`, `payment_link_id` |
| `sms_messages` | `idx_sms_patient (patient_id, created_at)`, `(office_id, sent_at)`, `sent_phone`, `from_phone`, unique `(tenant_id, client_id)`, unique `twilio_sid`, unique `reply_twilio_sid`, partial unique `(appointment_id, message_type, reminder_lead_hours)` |
| `email_messages` | `tenant_id`, `patient_id`, `provider_message_id`, unique `(tenant_id, client_id)` |
| `time_clock_entries` | `idx_tclock_user_date (user_id, clock_in)`, `(tenant_id, clock_in)`, partial unique open shift `(tenant_id, user_id)` |
| `time_clock_entry_edits` / `time_clock_periods` | `entry_id`, `tenant_id` / `tenant_id` |
| `audit_logs` | `(resource_type, resource_id)`, `resource_type`, `created_at`, `tenant_id`, `user_id`, `office_id`, `patient_id` |
| `labs`, `campaigns` | `name`, `tenant_id`; `code`, `tenant_id`, unique `(tenant_id, code)` |

The ORM models and the Alembic baseline (`72d534c666ec`) declare a different set (single-column `ix_appointments_patient_id` / `_provider_id` / `_office_id` / `_legacy_id` from `index=True`). None of those is in the dump: the migrated database was created from `denticon_migration/migration/db/schema.sql` (L612-618 define the `idx_appt_*` set) and client databases are restored from it, so the single-column set exists only in schemas built from the models (the SQLite test database). Do not read index coverage off the models.

### 9.2 What reporting needs [I]

| Add | For |
|---|---|
| `appointments (office_id, date) INCLUDE (provider_id, operatory_id, duration, is_cancelled, is_missed, is_blocked, is_archived)` | office-first day ranges without heap visits (the existing index leads with `date`) |
| `appointments (created_at) WHERE legacy_id IS NULL`, and `(created_by, created_at)` | bookings by creation date / by user |
| `appointments (patient_id, date) WHERE NOT is_cancelled` (the plain one exists) | next / previous visit, reappointment, first visit |
| `appointments (campaign_id) WHERE campaign_id IS NOT NULL` | campaign roll-ups |
| `appointment_procedures (procedure_code)` | hygiene / code-based appointment typing |
| `patient_recalls (office_id, due_date) WHERE is_active` | recall due lists by office |
| `sms_messages (tenant_id, message_type, sent_at)`, `sms_messages (appointment_id)` | reminder funnel, per-appointment contact history |
| `email_messages (tenant_id, sent_at)`, `(appointment_id)` | same |
| `booking_requests (tenant_id, created_at)` | funnel by submission date (the status index needs `office_id` first) |
| `time_clock_entries (office_id, clock_in)` | office-level labour reports |
| `audit_logs (resource_type, method, created_at)` or a dedicated event table | mining deletes and moves |
| `patient_procedures (patient_id, date_of_service)` exists; add `(office_id, date_of_service)` and `(procedure_code, date_of_service)` (see the financial data map) | production per visit, hygiene visits |

At current volumes the scheduling tables are small; the priority is correctness of the fact definition, then the indexes on `patient_procedures` that the joins in §8.5 and §8.7 hit.

---

## 10. Gaps the report module will have to close (backend)

| Area | Gap | Suggested shape |
|---|---|---|
| History | no appointment event log | `appointment_events (appointment_id, tenant_id, office_id, event_type, from_value, to_value, at_utc, by_user_id, source)` written by every path (status endpoint, generic PATCH, SMS webhook, AppointNow, delete / restore); gives status-as-of, reschedule counts, cancel lead time, who confirmed |
| Delete vs archive | one flag, two meanings | `deleted_at`, `deleted_by` (+ reason); keep `is_archived` for the legacy partition; backfill from `audit_logs` |
| Status | free string | canonical `status_code` (FK / CHECK to one vocabulary) + backfill; one shared classifier replacing the five in §1.3 |
| Type | none | `appointment_type` (FK `production_types` or the `appt_type` group), backfilled from `procedure_label` / lines / provider kind |
| Stamps | no seated stamp, no cancel / miss stamps, no actor | `seated_on`, `cancelled_at/by`, `missed_at`, `confirmed_by`, `confirmed_via` |
| Source | unknown | `booking_source` (`staff \| online \| plan \| recall \| copy`) and `recall_id` |
| Tenancy | join required | `tenant_id` on `appointments` (denormalised) for a tenant-leading index |
| Scheduled production | client snapshot, sparse | server-priced lines at booking; or a nightly "scheduled production" snapshot |
| Capacity | current template only; unseeded | effective-dated office / provider schedules or a daily `schedule_capacity` snapshot (office, operatory, provider, date, available / booked / blocked minutes); typed block-outs; one calendar function |
| Double booking | unguarded | overlap check (or an explicit `allow_overlap` flag) so utilisation is bounded |
| Recall | no engine, no links, no data | recall types, `patient_recalls.appointment_id`, auto-advance on completion, status enum; derived recall list for migrated patients |
| Waitlist | two booleans | `waitlist_entries` (patient, office, provider, wanted window, reason, state) |
| Communications | partial logging | log AppointNow and automated e-mail sends in the message tables; contact-attempt log for calls |
| Visit dates | `patients.first_visit` / `last_visit` / `next_recall` empty | maintain them (trigger or nightly job) or drop them from read models |
| Migration | created date / user, confirmations, provider prefs not loaded | re-import if the export carries them |
| APIs | lists lack report filters; feed is enrichment-heavy | report endpoints over the fact view, office-scoped, with the filters of §1.10 marked missing |

---

## 11. Open questions

1. What does Denticon's `APPTH_ARCHIVE` (and `AppointmentDetail_ARCHIVE`, `Ledger_archive`) contain — older history or deleted / rescheduled rows? Quick data checks: date distribution of `is_archived` vs live among `legacy_id IS NOT NULL`; share of archived legacy appointments that have charges on the same patient and day; duplicates per patient / slot.
2. How many of the 176 k migrated appointments are archived, cancelled, missed, blocked, without operatory, or assigned to the fallback office?
3. Does `AppointmentHeader.txt` carry created / modified date and user, confirmation or check-in times? If so, should the migration be re-run to load them?
4. Is `patient_procedures.appointment_id` trustworthy on migrated rows (`APPTDID` vs `APPTID`)? Check patient and date agreement on linked rows.
5. Are `offices.timezone`, office hours and provider schedules configured on the production tenants, or is everything still on defaults?
6. Which definitions does the practice want: does a no-show count as booked time; which codes define a hygiene visit; is "reappointed" measured at visit day or as of today?
7. Is the database session time zone UTC on every environment (needed for the `now()` defaults and the tz-aware stamps)?
8. Are the cron entry points (`run_sms_reminders`, `expire_booking_requests`, `auto_close_time_clock`) actually scheduled in production? Several derived states depend on them.
9. Can Denticon export recall data (`PATRECALL`), or must the recall list for migrated patients be derived from procedure history?
10. Should block-outs stay in `appointments` or move to their own table before a capacity model is built on them?
