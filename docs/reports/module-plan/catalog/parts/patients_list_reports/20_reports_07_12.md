## Update Patient Insurance (Conversion) List - By Appointment - `lists.update_patient_insurance_conversion_list_by_appointment`

Lists › Patient/Resp. Party List, group `PATIENT LIST`, screenshots 1.PNG / 9.PNG (identical) - P3 - S - `lists_patient`
(`reports_lists_patient_list_screen_view_only` / `..._full_control`) - interactive - PARTIALLY DOCUMENTED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Front office, insurance coordinator | Daily, for the appointments two days ahead (vendor routine; the only Lists report in the vendor's role matrix) | Before the visit, replace the conversion placeholder coverage with the real plan and verify eligibility, so the visit can be estimated and claimed |
| Office manager | Weekly while the practice is post-conversion | How many booked patients still carry conversion insurance; whether the clean-up is progressing per office |

The report is meaningful only for practices that were converted from another system (research quirk). In DentC every
tenant is a converted Denticon practice, and Denticon's own conversion tag (`UP`, "Update Information") was migrated into
`patients.patient_types` / `patient_type` [A `be_data_patients_clinical.md` L82, L95], so the population exists from day one.

### Legacy output

Confidence PARTIALLY DOCUMENTED: purpose and cadence documented `[P17]`, placeholder plan documented `[P18]`; layout [I].

| Item | Legacy (as documented or inferred) | DentC |
|---|---|---|
| Printed title | [I] menu name plus the format, pattern of `Explosion Codes List (Summary)`: `Update Patient Insurance (Conversion) List - By Appointment (Summary)` / `(Detail)` | `title_templates`: `report_format = summary` -> `... (Summary)`, `detail` -> `... (Detail)` [I] |
| Detail rows [I] | Appointment date and time, patient ID, patient name, phone, provider, and the converted insurance hint per coverage slot: carrier, employer, group, subscriber ID | One row per appointment x active coverage slot of the patient (a patient without a slot prints one row with blank coverage) |
| Summary rows [I] | Count of such patients per office or day | One row per office-day: appointments, distinct patients |
| Placeholder plan `[P18]` | Carrier `CONVERSION DEFAULT - Do NOT Delete! Change Pt Ins!`, employer `CONVERSION`, group `DO NOT TOUCH`; the plan record carries the old system's plan details as a hint | The slot is flagged `is_conversion_placeholder` (NEW computed column, see Data) and printed in a `Placeholder` column |
| Totals | Not documented | Detail: `Total : n` appointments and `Patients : n` distinct; Summary: grand total row |
| Sign conventions | No money | - |
| Quirks kept | Useless for never-converted practices; the default range is today (the vendor routine looks two days ahead) | Kept; the two-days-ahead routine is a saved view (enhancements) |

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r01 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | `output_format = pdf`; result shown on screen first, PDF rendered from the same snapshot; never changes rows |
| PRINT FORMAT `Excel` | `output_format = xlsx`; flat typed sheet of the chosen format; `csv` added |
| REPORT TYPE `Summary` (default) | `report_format = summary`: one row per office and appointment date with counts; same population as Detail |
| REPORT TYPE `Detail` | `report_format = detail`: one row per appointment x coverage slot with patient and insurance columns |
| OFFICE/GROUP `Office` (default) | `office_ids` (default token `working_office`): appointments whose `rpt_appointment_facts.office_id` is in the list; SELECT picks other offices, `my_offices` and `all` added |
| OFFICE/GROUP `Office Group` | `office_group_id` / `office_group_ids`: appointments at the offices of the chosen groups; no groups defined -> `all` = every office the caller may read |
| APPOINTMENT DATE RANGE Start Date / End Date (default today / today) | `date_from` / `date_to` on `rpt_appointment_facts.appointment_date` (office-local), inclusive; presets and relative tokens added |
| Rule `patients_list_reports.r01.d01` | Mode radio decides the value key; switching the mode resets the picker to that mode's default; exactly one office key is sent |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | Reset to defaults (`frontend`) / run then print (`print`) / `saved_view` (one favorite per caller and report) |

No control is greyed, hidden or dependent except the office mode. Population rule (not a control): patients tagged `UP`
in `rpt_patient_dim.patient_type_codes` with a live appointment in the range (coverage matrix row 81); see Data.

### Parameters - enhancements

| Key | Type | Default (= legacy run) | Effect |
|---|---|---|---|
| `conversion_basis` | `enum` NEW (owner 04 when adopted) | `patient_type_up` | `patient_type_up` = tag `UP` (coverage matrix rule); `placeholder_plan` = patient holds an active slot with `is_conversion_placeholder`; `either` = union. Lets the office catch patients whose tag was removed but whose plan was not replaced, and the reverse |
| `include_cancelled_appointments` | `boolean` (shared, 3.7) | `false` [I] | `true` adds cancelled and no-show appointments (`status_class IN ('cancelled','no_show')`); default drops them [I, open question 2] |
| `appointment_provider_ids` | `entity_multi` (shared role key `appointment`) | `all` | Filter on `rpt_appointment_facts.provider_id`; picker roster-first, never excludes |
| `operatory_ids` | `entity_multi` (shared, 3.7) | `all` | Filter on `rpt_appointment_facts.operatory_id` (one coordinator per column of the schedule) |
| `eligibility_statuses` | `enum_multi` NEW: `verified`, `not_eligible`, `unknown` | all ticked, `full_selection = no_predicate` | Narrow to slots not yet verified (`rpt_insurance_coverage.elig_status_class`) |
| `sort_by` | `enum` (shared key) | `appointment_date` | `appointment_date` (date, time, patient), `patient_last_name`, `provider_last_name_appointment_date` (values of sig0016) |
| `page_break_by` | `enum` (shared, `layout`) | `none` | `office`, `date` (one page per appointment day, handed to the chair-side team) |
| Saved view "Conversion check - 2 days ahead" | preset | - | `date_from = date_to = today+2d`, `report_format = detail`; schedulable daily at 07:00 office time (link-only e-mail, PD-12) |

### Data

Availability **READY** (coverage matrix row 81). Datasets: `rpt_appointment_facts` (DATA-16, P1), `rpt_patient_dim`
(DATA-05), `rpt_insurance_coverage` (DATA-21, P1), `rpt_provider_dim`, `rpt_office_dim`.

| Dataset | Columns used |
|---|---|
| `rpt_appointment_facts` | `appointment_id`, `office_id`, `appointment_date`, `start_time`, `provider_id`, `operatory_id`, `patient_id`, `status_class`, `is_block`, `is_deleted`, `is_legacy_archive`, `is_patientless`, `is_placeholder_patient` |
| `rpt_patient_dim` | `patient_id`, `chart_no`, `last_name`, `first_name`, `preferred_name`, `dob`, `phone`, `cell_phone`, `work_phone`, `patient_type_codes`, `home_office_id`, `no_auto_sms`, `sms_opt_out_at`, `no_correspondence` |
| `rpt_insurance_coverage` | `slot_id`, `patient_id`, `category`, `tier`, `carrier_name`, `employer_name`, `group_number`, `subscriber_id`, `subscriber_name`, `relationship`, `elig_status_class`, `elig_verified_on`; NEW computed `is_conversion_placeholder` = `carrier_name ILIKE 'CONVERSION DEFAULT%' OR (employer_name = 'CONVERSION' AND group_number = 'DO NOT TOUCH')` (owner 03, RPT-PLIST-41) |
| `rpt_provider_dim`, `rpt_office_dim` | `provider_name`, `short_id`; `office_name`, `timezone`, `local_today` |

| Parameter | Becomes |
|---|---|
| `office_scope` | `f.office_id = ANY(:office_ids)` (appointment office, 03 section 5.1) |
| `date_range` | `f.appointment_date BETWEEN :date_from AND :date_to` (appointment date is already office-local; "today" per office, AD-9) |
| `report_format` | Selects block `summary_by_day` or `detail` |
| fixed row filter | `NOT f.is_block AND NOT f.is_deleted AND NOT f.is_legacy_archive AND NOT f.is_patientless` and `f.status_class NOT IN ('cancelled','no_show')` unless `include_cancelled_appointments` |
| population (`conversion_basis = patient_type_up`) | `'UP' = ANY(p.patient_type_codes)` (mapping of the single `patient_type` value through `rpt_value_map`, data card 3.5) |
| `conversion_basis = placeholder_plan` / `either` | `EXISTS (SELECT 1 FROM rpt_insurance_coverage c WHERE c.patient_id = f.patient_id AND c.is_conversion_placeholder)` / OR of both |
| Detail coverage | `LEFT JOIN rpt_insurance_coverage` on `patient_id` (one row per active slot; ordered dental before medical, then tier) |

| Topic | Rule |
|---|---|
| Date basis | `appointment_date` (fixed, `scope.date_basis`) |
| Office attribution | appointment office (`office_attribution = appointment`) |
| Provider attribution | appointment provider, printed only; no legacy provider criterion |
| Migrated history | Appointments exist for both eras. The tag and the coverage are current state: once the tag is removed the patient leaves every past run; when a plan was fixed is not recorded (no coverage history, data card 2.21) |
| Eligibility | `elig_status_class` is `unknown` on every migrated subscriber [D], so the eligibility filter is meaningful for app-era verifications only |

### Output

`report_format = detail` - block `detail` (main, table). Fixed outer level `Office : <office_name>` when `["ctx", "multi_office"]`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_date` | Appt Date | date | `phi_identified` | - |
| `start_time` | Time | time | `phi_identified` | - |
| `patient_name` | Patient | text (`Last, First`) | `phi_identified` (key column) | `count_distinct(patient_id)` labelled `Patients :` |
| `patient_id` | Pat ID | id | `phi_identified` | - |
| `chart_no` | Chart # | text, `default_visible: false` | `phi_identified` | - |
| `dob` | Birth Date | date, `default_visible: false` | `phi_identified` | - |
| `phone` | Phone | text (cell, else home, else work) | `phi_identified` | - |
| `provider_name` | Provider | text | `aggregate` | - |
| `operatory_name` | Op | text, `default_visible: false` | `aggregate` | - |
| `coverage_label` | Coverage | text (`Dental Primary`, ...) | `phi_identified` | - |
| `carrier_name` | Carrier | text | `phi_identified` | - |
| `employer_name` | Employer | text | `phi_sensitive` | - |
| `group_number` | Group # | text | `phi_identified` | - |
| `subscriber_id` | Subscriber ID | text | `phi_sensitive` | - |
| `is_conversion_placeholder` | Placeholder | boolean (`Yes` / blank) | `phi_identified` | `count` of true labelled `Placeholder plans :` |
| `elig_status_class` | Elig. | enum, `default_visible: false` | `phi_identified` | - |
| `appointment_id`, `slot_id`, `office_id` | - | id, `hidden` | `phi_identified` / `aggregate` | `appointment_id` = `row_id_column` with `slot_id` |

Grand total: `Total : n` = `count_distinct(appointment_id)`, `Patients : n`. Default sort `appointment_date`, `start_time`,
`last_name`, `first_name`, `appointment_id`, `slot_id`.

`report_format = summary` - block `summary_by_day` (main, table), same outer office level.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_date` | Appt Date | date | `aggregate` | - |
| `appointment_count` | Appointments | integer | `aggregate` | `sum` (office subtotal and grand total) |
| `patient_count` | Patients | integer | `aggregate` | `count_distinct(patient_id)` over the level (not a sum: a patient booked on two days counts once in the total) |
| `placeholder_patient_count` | With Placeholder Plan | integer | `aggregate` | `count_distinct` as above |

Summary cards (both formats, block totals): appointments, patients, patients with a placeholder plan. No metric key exists
in metrics_card for conversion clean-up; the figures are described here only. Page break: `none` (default), `office`, `date`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart (Summary) | Bar: patients to update per appointment day (`kind: bar`, category `appointment_date`, value `patient_count`), useful with a 14-day range |
| Summary count cell | `kind: rows` - same report, `report_format = detail`, `office_ids` <- group office, `date_from` / `date_to` <- `appointment_date` |
| Patient name | `kind: record` patient overview (`assert_patient_visible`, `phi_identified`) |
| Coverage / carrier cell | `kind: record` patient insurance screen of the slot (`slot_id`), feature right of the insurance screen (08) |
| Appointment date / time | `kind: record` appointment in the Scheduler day view (route via `openSchedulerForBooking`-style hand-off is not used; open existing appointment) |

### Actions

| Action key | Scope | Kind | Right / requires | Rule |
|---|---|---|---|---|
| `open_patient_insurance` | row | navigate | insurance feature right | Opens the slot to attach the real plan |
| `verify_eligibility` | row / bulk | navigate | eligibility feature right | Opens `worklists.eligibility_verification` (06) filtered to the selected appointments' dates and patients |
| `open_appointment` | row | navigate | scheduler right | Scheduler at the appointment |
| `create_task` | row / bulk | create_task | task feature | "Update conversion insurance" task per patient, due the day before the appointment |
| `send_sms` | bulk | send_sms | SMS feature; `requires: sms_consent` | "Please bring your insurance card"; excludes `no_auto_sms`, opted-out; excluded count shown before send |
| `export_selection` | bulk | export_selection | `reports_export_data_files` | - |

The report doubles as a daily worklist through the tasks it creates; follow-up state (worked / resolved) belongs to
`worklists.eligibility_verification`, not to this list.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`; Detail landscape (14 visible columns), Summary portrait; header line 1 office name (one office) or organisation name, line 2 title from `title_templates`; footer `criteria_echo = footer` with `From :`, `Thru :`, `Offices :`, `Report Type :`, `Printed :`, `By :`, `Page : n of m`; repeat header per page |
| XLSX | One sheet per run (`Detail` or `Summary`), one row per appointment x slot, appointment columns repeated on every slot row, no merged cells, frozen header, autofilter; criteria sheet |
| CSV | Main block, formula-injection guard |
| Background | Not needed (one office-day range is small); `escalate_when` office group or `all` with a span over 31 days -> `background` |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Population rule of the legacy report: patient type `UP`, the placeholder plan, or both? (coverage matrix uses `UP`; research documents the plan) | Live legacy run on a converted test practice |
| 2 | Are cancelled / missed appointments listed? Is a patient listed once per appointment or once per range? | Live legacy run with a cancelled appointment in range |
| 3 | Printed columns and Summary grain (per office, per day, per provider) - INFERRED | Live legacy PDF and Excel of both formats |
| 4 | Does the legacy title carry `(Summary)` / `(Detail)`? | Live legacy PDF |
| 5 | Product: should the `UP` tag be cleared automatically when a placeholder slot is replaced (would empty the list as staff work)? | Product owner |

## Online Registered Patients - `lists.online_registered_patients`

Lists › Patient/Resp. Party List, group `PATIENT LIST`, screenshot 8.PNG - P3 - S - `lists_patient`
(`reports_lists_patient_list_screen_view_only` / `..._full_control`) - interactive - PARTIALLY DOCUMENTED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Front office | Daily | Find online registrations still pending and import (approve) them into patient records before the visit |
| Operations / multi-office manager | Weekly, monthly | Adoption of online registration per office during a roll-out (vendor purpose `[P15][P16]`) |

### Legacy output

Confidence PARTIALLY DOCUMENTED: purpose and the field `Active` documented `[P15][P16]`; layout [I].

| Item | Legacy | DentC |
|---|---|---|
| Printed title | [I] `Online Registered Patients` (+ `(Summary)` / `(Detail)` [I]) | `title_templates` per format |
| Detail [I] | One row per registration: created date, patient name and contact data, office, `Active` | Same, plus status, new / existing and the imported patient |
| Summary [I] | Registrations per office, possibly split pending / imported | One row per office: registrations, active (pending), imported, declined / expired |
| `Active` `[P15]` | `TRUE` = registration still active, not yet imported; `FALSE` = imported. Raw `TRUE` / `FALSE` suggests an unformatted dataset | Kept literally: column `Active` prints `TRUE` / `FALSE` (legacy quirk kept for parity); a readable `Status` column is added |
| Totals | Not documented | `Total : n` per office band and grand total |
| Sign conventions | No money (an AppointNow deposit is not printed) | - |

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r08 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format` `pdf` / `xlsx` (+ `csv`); never changes rows |
| REPORT TYPE `Summary` (default) | `report_format = summary`: one row per office with counts by status |
| REPORT TYPE `Detail` | `report_format = detail`: one row per registration |
| OFFICE/GROUP `Office` (default working office) | `office_ids`: registrations addressed to these offices (`booking_requests.office_id`) |
| OFFICE/GROUP `Office Group` | `office_group_id(s)`: offices of the groups; no groups -> `all` within the caller's rights |
| CREATED DATE RANGE Start Date / End Date (default today / today) | `date_from` / `date_to` on the office-local date the registration was received (`booking_requests.created_at`, UTC -> office time zone), inclusive |
| Rule `patients_list_reports.r01.d01` | Office mode switch, as on every report of the family |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | `frontend` / `print` / `saved_view` |

### Parameters - enhancements

| Key | Type | Default (= legacy run) | Effect |
|---|---|---|---|
| `registration_statuses` | `enum_multi` NEW: `pending`, `awaiting_payment`, `imported`, `declined`, `expired` | all ticked, `full_selection = no_predicate` | Daily view "pending only" (`pending`, `awaiting_payment`) |
| `registration_kind` | `enum` NEW: `all`, `new_patient`, `existing_patient` | `all` | On `booking_requests.is_new_patient`; adoption reporting usually wants `new_patient` |
| `summary_period` | `enum` NEW: `none`, `week`, `month` | `none` | Summary only: adds a period column inside each office (adoption trend over a roll-out); `none` = legacy one row per office |
| `compare_to` | shared comparison period (filter_card 12, P4) | `none` | Summary: prior-period registrations column per office |
| `include_contact_columns` | via column chooser (no parameter) | phone and e-mail visible | - |
| Saved view "Pending online registrations - last 7 days" | preset | - | `date_preset = custom`, `date_from = today-7d`, `date_to = today`, `registration_statuses = [pending, awaiting_payment]`, `report_format = detail` |

### Data

Availability **APP** (coverage matrix row 80): online registrations exist only since AppointNow went live in DentC; no
Denticon registration history was migrated (0 rows [A] `be_data_patients_clinical.md` §1.7). Registration source on the
patient record: **SCHEMA(44)** (DATA-44, P3: `patients.registration_source`, `registration_status`, `activated_at`).

| Dataset | Columns used |
|---|---|
| passthrough `booking_requests` (NEW registration as a dataset, owner 03, with DATA-44) | `id`, `tenant_id`, `office_id`, `created_at`, `status` (`pending`, `awaiting_payment`, `approved`, `declined`, `expired`), `first_name`, `last_name`, `phone`, `email`, `date_of_birth`, `is_new_patient`, `reason_label`, `slot_date`, `start_time`, `provider_name`, `patient_id`, `appointment_id`, `actioned_at`, `actioned_by`, `decline_reason`, `notes`, `insurance_info` |
| `rpt_patient_dim` | `patient_id`, `chart_no`, `registration_source`, `registration_status` (after DATA-44) - label of the imported patient |
| `rpt_office_dim`, `rpt_user_dim` | `office_name`, `timezone`; `user_label` of `actioned_by` |

| Derived column | Rule |
|---|---|
| `registration_status` | `pending` / `awaiting_payment` = stored status; `imported` = `approved` with `patient_id IS NOT NULL`; `declined`, `expired` = stored status |
| `is_active` (legacy `Active`) | `true` when `registration_status IN ('pending','awaiting_payment')`, else `false` [I: legacy defines only pending vs imported] |
| `created_date` | `(created_at AT TIME ZONE 'UTC' AT TIME ZONE office.timezone)::date`; range predicate on the timestamp with per-office UTC bounds (data card 4.3) |

| Parameter | Becomes |
|---|---|
| `office_scope` | `b.office_id = ANY(:office_ids)` (office of the registration) |
| `date_range` | `b.created_at >= utc(:date_from) AND b.created_at < utc(:date_to + 1)` per office time zone |
| `registration_statuses`, `registration_kind` | `IN` list on the derived status; `b.is_new_patient = true / false` |
| `report_format` | block `summary_by_office` or `detail` |

| Topic | Rule |
|---|---|
| Date basis | `created_date` of the registration (fixed); reliable for every row (app era only) |
| Office attribution | office of the registration (`booking_requests.office_id`) |
| Caveat | `expired` is set lazily and by the cron `expire_booking_requests` (outside the repo [V]); until it runs, overdue requests still count as `pending` / Active `TRUE` - printed as an `availability[]` note `registration_expiry_lazy` |
| Caveat | DentC has no separate online registration form today: AppointNow requests are the registration source. Registrations from other channels (patient portal intake) enter once DATA-44 stores `registration_source` - then the dataset unions patients with `registration_source = 'online'` |

### Output

`report_format = detail` - block `detail` (main). Fixed outer `Office : <office_name>` when multi-office.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `created_date` | Created Date | date | `phi_identified` | - |
| `created_time` | Time | time (office tz), `default_visible: false` | `phi_identified` | - |
| `registrant_name` | Patient | text `Last, First` | `phi_identified` (key column) | `count` -> `Total : n` per office and grand total |
| `date_of_birth` | Birth Date | date | `phi_identified` | - |
| `phone` | Phone | text | `phi_identified` | - |
| `email` | E-mail | text | `phi_identified` | - |
| `patient_kind` | New / Existing | enum (`New`, `Existing`) | `phi_identified` | `count` of `New` |
| `reason_label` | Reason | text, `default_visible: false` | `phi_identified` | - |
| `requested_slot` | Requested Appt | datetime (office tz), `default_visible: false` | `phi_identified` | - |
| `registration_status` | Status | enum | `phi_identified` | - |
| `is_active` | Active | boolean, `format.labels {true: TRUE, false: FALSE}` | `phi_identified` | `count` of `TRUE` labelled `Active :` |
| `patient_id` | Pat ID | id (blank until imported) | `phi_identified` | - |
| `actioned_at` | Imported / Actioned | datetime, `default_visible: false` | `phi_identified` | - |
| `actioned_by_label` | By | text, `default_visible: false` | `aggregate` | - |
| `notes` | Notes | text, `default_visible: false`, export `pdf: false` | `clinical` (rule 4: patient-typed free text can be clinical) | - |
| `insurance_info` | Insurance | text, `default_visible: false` | `phi_sensitive` | - |
| `registration_id`, `office_id`, `appointment_id` | - | id, `hidden` | `phi_identified` / `aggregate` | `registration_id` = `row_id_column` |

Default sort: `created_at`, `last_name`, `first_name`, `registration_id` (legacy order unknown).

`report_format = summary` - block `summary_by_office` (main).

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_name` | Office | text | `aggregate` | - |
| `period_label` | Period | text, `visible_when ["ne", "summary_period", "none"]` | `aggregate` | - |
| `registration_count` | Registrations | integer | `aggregate` | `sum`, grand total |
| `active_count` | Active (Pending) | integer | `aggregate` | `sum` |
| `imported_count` | Imported | integer | `aggregate` | `sum` |
| `declined_expired_count` | Declined / Expired | integer | `aggregate` | `sum` |
| `import_rate` | Imported % | percent, `computed ratio(imported_count, registration_count)` | `aggregate` | `ratio` on the grand total |
| `prior_registration_count` | Prior Period | integer, `visible_when ["ne", "compare_to", "none"]` | `aggregate` | `sum` |

Summary cards: registrations, active, imported %. `reconciles_with`: Summary `registration_count` grand total =
`online_booking_requests` (metrics_card 5.10, basis created) for the same offices and range, with
`registration_kind = all` and every status (to confirm in 05 that the metric counts every status). Imported % is not
`online_booking_conversion_pct` (that one counts requests that became an appointment). Page break: `none`, `office`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart (Summary) | Stacked bar per office: active / imported / declined-expired; with `summary_period` a line of registrations per period |
| Summary count cell | `kind: rows` - Detail of the same report with `office_ids` <- office, `registration_statuses` <- the clicked status column, period bounds as `date_from` / `date_to` |
| Registrant (pending) | `kind: record` the request in the AppointNow staff inbox (`booking_requests.id`), feature right of AppointNow (08) |
| Registrant (imported) | `kind: record` patient overview of `patient_id` (`assert_patient_visible`) |

### Actions

| Action key | Scope | Kind | Right / requires | Rule |
|---|---|---|---|---|
| `open_request` | row | navigate | AppointNow feature right | Inbox at the request, where approve / decline / import happen (the report never writes) |
| `send_email` / `send_sms` | bulk | send_email / send_sms | correspondence features; `requires: sms_consent` for SMS | Reminder to finish a registration awaiting payment; e-mail is a link, no PHI attachment |
| `create_task` | row / bulk | create_task | task feature | "Call registrant" for pending rows older than a day |
| `export_selection` | bulk | export_selection | `reports_export_data_files` | - |

Detail with `registration_statuses = [pending, awaiting_payment]` is the daily import queue; the inbox remains the place
where the work is done.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait (Detail 9 visible columns), header office or organisation name + title; footer echo `From :`, `Thru :`, `Offices :`, `Report Type :`, `Printed :`, `By :`, `Page : n of m` |
| XLSX | One sheet per format; `Active` written as a boolean cell with the `TRUE` / `FALSE` display; no merged cells |
| CSV | Main block; formula guard (registrant-typed names and notes are untrusted input) |
| Background | Not needed; `escalate_when` office group or `all` over more than 366 days |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Detail columns and Summary layout (split pending / imported?) - INFERRED | Live legacy run of both formats |
| 2 | Does the legacy list include existing patients who re-registered, and declined / expired registrations? | Live legacy tool |
| 3 | `Active` of a declined or expired registration: FALSE or not listed? | Live legacy tool |
| 4 | Product: is AppointNow the intended DentC counterpart of Denticon Online Patient Registration, or should a patient-portal intake form (Pat Reg / Medical Info Forms, PD-15) feed it? | Product owner; DATA-44 owner |

## Responsible Party List - `lists.responsible_party_list`

Lists › Patient/Resp. Party List, group `RESPONSIBLE PARTY LIST`, screenshot 10.PNG (mode Created Date) - P3 - L -
`lists_responsible_party` (`reports_lists_responsible_party_list_screen_view_only` / `..._full_control`) - interactive
(background for office group / `all` in the balance modes) - PARTIALLY DOCUMENTED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Billing | Before each statement run | Mode Send Statement Status = No: which accounts will get no statement and why (documented use `[P20]`) |
| Billing / collections | Month end | Modes Balance and Balance Aged Over X Days: which accounts owe, and which are overdue past 30 / 60 / 90 / 120 days (the vendor points to the Aging reports for full A/R) |
| Office manager | On demand | Mode Created Date: new guarantor accounts in a period; modes Resp. Party Type and Zip: account mix by billing type and area (mailings) |

### Legacy output

Confidence PARTIALLY DOCUMENTED: the six `REPORT BY` values and their purposes `[P19]`, two modes' criteria
`[P19·img][P20·img]`; no layout seen. Each mode replaces one legacy report:

| `report_by` | Legacy report replaced `[P19·img]` | Documented purpose | Output [I] (basis: variants; Dentrix Enterprise Collections Manager List) |
|---|---|---|---|
| `balance` | Responsible Party List by Balance | Which accounts have a balance | Account rows with balance; count and balance total |
| `balance_aged_over_x_days` | Responsible Party List Over [30/60/90/120] days | Accounts overdue in the selected ageing period | Account rows with balance and the aged amount; totals |
| `created_date` (default) | Responsible Party List | Number of responsible-party accounts | Account rows with contact data, type, created date, send-statement flag; count |
| `resp_party_type` | Responsible Party by Billing Type | Accounts by type | Grouped by type with a count per group |
| `send_statement_status` | Responsible Party-Send Statement Status | Accounts eligible / ineligible for a statement | Account rows with the flag; count |
| `zip` | Responsible Party Zip Code | Accounts by zip code | Grouped by zip with a count per group |

| Item | Rule |
|---|---|
| Printed title | [I] `Responsible Party List - <mode label>` (`title_templates` per `report_by`), header line 1 office or organisation name |
| Columns [I] | Responsible-party ID, name, address, phones, e-mail, type, created date, send-statement flag, balance (aged amount in the aged mode) |
| Sign convention | Balance positive = owed by the account, negative = credit (PD-2); canonical ledger balance, not the six legacy formulas |
| Quirks | "Inactive account" = every patient of the account inactive; the aged mode filters on the created date as well as on the aged balance (2021 screen) - both kept. `Responsible Party List - Email` has no named successor (supplement unresolved) - not reproduced, covered by the e-mail column and `has_email` enhancement |

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r09 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; never changes rows |
| REPORT BY `Created Date` (default) | `report_by = created_date`: accounts created in the range; flat list; title `... - Created Date` |
| REPORT BY `Balance` | `report_by = balance`: accounts whose current balance is not 0.00 [I], balance column and total; created range still applies (default-panel rule) |
| REPORT BY `Balance Aged Over X Days` | `report_by = balance_aged_over_x_days`: shows `aged_balance` and `aging_days`; accounts whose amount older than `aging_days` lies in the aged-balance range; created range applies |
| REPORT BY `Resp. Party Type` | `report_by = resp_party_type`: same population as Created Date, grouped by `resp_party_type` with group counts |
| REPORT BY `Send Statement Status` | `report_by = send_statement_status`: created range hidden, `send_statement_status` shown and required; accounts filtered on `send_statements` |
| REPORT BY `Zip` | `report_by = zip`: population as Created Date, grouped by the guarantor zip with group counts |
| OFFICE/GROUP `Office` (default working office) / `Office Group` | `office_ids` / `office_group_id(s)` on `rpt_account_dim.home_office_id` (account home office) |
| CREATED DATE RANGE Start / End (default today / today) | `date_from` / `date_to` on the office-local account created date, inclusive; hidden in mode Send Statement Status |
| EXCLUDE RESPONSIBLE PARTY TYPE (default `None`) | `exclude_resp_party_type_codes`: accounts whose type is in the list are dropped; `none` = nothing; accounts without a type kept (until DATA-53 every self-guarantor account has none) |
| OTHER OPTIONS `Include Inactive Accounts (All patients inactive in account)` (default unticked) | `include_inactive_accounts = false`: accounts with `active_member_count = 0` left out; ticked: listed too |
| SEND STATEMENT STATUS `Yes` / `No` (VENDOR-DOC; default not documented, candidate `yes`) | `send_statements = true` / `false` |
| Aged Balance range Start `1.00` / End `999999.99` (VENDOR-DOC, 2021 screen) | `aged_balance_from` / `aged_balance_to` on the aged amount, inclusive |
| Days `30` / `60` / `90` / `120` (VENDOR-DOC; default not documented, candidate `30`) | `aging_days`: the age threshold of the aged amount |
| Rule `patients_list_reports.r09.d01` | `report_by = send_statement_status` -> `send_statement_status` visible + required, `date_range` hidden and no created predicate; `exclude_resp_party_type_codes` and `include_inactive_accounts` stay. `report_by = balance_aged_over_x_days` -> `aged_balance` and `aging_days` visible. Hidden parameters take their `disabled_value` (default) before hashing |
| Rule `patients_list_reports.r01.d01` | Office mode switch |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | `frontend` / `print` / `saved_view` (the favorite stores `report_by`) |

Modes Balance, Resp. Party Type and Zip were never captured: they keep the default panel (created range, exclude type,
inactive checkbox) until read on the live tool (header shared rule; 04 section 9.2).

### Parameters - enhancements

| Key | Type | Default (= legacy run) | Effect |
|---|---|---|---|
| `include_account_balance` | `boolean` NEW | `false` | Adds the balance column (and its total) in the modes without one (`created_date`, `resp_party_type`, `send_statement_status`, `zip`); `role: query` (joins `rpt_ar_open_items`) |
| `include_balance_split` | `boolean` NEW | `false` | Balance modes: adds `Est. Ins.` / `Est. Pat.` from `open_insurance_est` / `open_patient` |
| `sort_by` | `enum` (shared, values of sig0191) | `responsible_party_last_name` | `responsible_party_last_name`, `responsible_party_id` (`account_no`); NEW `balance_desc` in the balance modes |
| `has_email` | `enum` NEW: `all`, `with_email`, `without_email` | `all` | Successor of the old `Responsible Party List - Email`; e-statement enrolment work |
| `no_email_statement` filter | `enum` NEW: `all`, `yes`, `no` | `all` | Mode Send Statement Status: split "no paper" and "no e-mail" statement flags (`no_email_statement`) |
| `exclude_sent_to_collection` | `boolean` (shared, 3.4) | `false` | Drops accounts flagged sent to collection (balance modes, before a reminder campaign) |
| `responsible_party_name` | `text_range` (shared, 3.4) | `AAAAA` / `ZZZZZ` | Alphabetical batch (mailing in halves); open bounds add no predicate |
| `all_dates` preset | `date_preset` NEW value (owner 04) | - | Removes the created-date predicate in the modes that keep the range (Balance on all accounts, not only today's) |
| Saved views | preset | - | "No statement - check before run": `report_by = send_statement_status`, `send_statement_status = no`; "Over 90 with balance > 50": `report_by = balance_aged_over_x_days`, `aging_days = 90`, `aged_balance_from = 50.00`, `date_preset = all_dates` |
| `compare_to` | not offered | - | Current-state list; no prior period exists |

### Data

Availability by mode (coverage matrix rows 82a-82d): `created_date` **REPAIR(10)** - migrated accounts carry the backfill
time as `created_at` until DATA-10 restores the legacy created date (if the export holds it; otherwise APP for history);
`balance`, `balance_aged_over_x_days` **READY** (derived ageing, DATA-07 P0, DATA-20 P1, DATA-27 P2 tenant-wide);
`resp_party_type` **SCHEMA(53)** (DATA-53, P1: `accounts.resp_party_type`; also blocks EXCLUDE RESPONSIBLE PARTY TYPE on
self-guarantor accounts); `send_statement_status`, `zip` **READY**.

| Dataset | Columns used |
|---|---|
| `rpt_account_dim` | `account_id`, `account_no` (Denticon RPID on migrated accounts), `home_office_id`, `guarantor_last_name`, `guarantor_first_name`, address (line 1, city, state, zip), phones, NEW `guarantor_email`, NEW `guarantor_zip5` (owner 03, RPT-PLIST-48), `resp_party_type`, `send_statements`, `no_email_statement`, `send_collections`, `member_count`, `active_member_count`, `is_active`, `merged_into_account_id`, `created_at_utc`, `last_statement_date` |
| `rpt_ar_open_items(p_tenant_id, p_account_ids, p_as_of = local_today, p_unit = 'account')` | `account_id`, `item_kind`, `open_amount`, `open_insurance_est`, `open_patient`, `age_days`, `split_quality` |
| `rpt_aging_bucket_sets` | the `legacy` set (edges of 30 / 60 / 90 / 120, data card 2.14) for the aged threshold |
| `rpt_office_dim` | `office_name`, `timezone`, `local_today` |

| Parameter | Becomes |
|---|---|
| `office_scope` | `a.home_office_id = ANY(:office_ids)` (account home office, 03 section 5.1) |
| `date_range` (all modes but `send_statement_status`) | `a.created_at_utc` within per-office UTC bounds of `date_from` / `date_to` (home-office time zone) |
| `exclude_resp_party_type_codes` | `a.resp_party_type IS NULL OR a.resp_party_type <> ALL(:codes)` |
| `include_inactive_accounts` | `false`: `a.active_member_count > 0` |
| always | `a.merged_into_account_id IS NULL` (a merged source account is a DentC artefact with no legacy counterpart [I]) |
| `send_statement_status` | `a.send_statements = (:value = 'yes')` |
| `report_by = balance` | `balance = Σ open_amount` (both item kinds; equals the account ledger balance, R-05) `<> 0` [I] |
| `report_by = balance_aged_over_x_days` | `aged_amount = Σ open_amount` of debit items with `age_days > :aging_days` (bucket edge of the legacy set; credits are never inside a bucket); `aged_amount BETWEEN :aged_balance_from AND :aged_balance_to` |
| `report_by = resp_party_type` / `zip` | group level on `resp_party_type` / `guarantor_zip5` |

| Topic | Rule |
|---|---|
| Date basis | `created_date` of the account (fixed); none in mode Send Statement Status |
| Balance as of | Office-local today of the home office; `rpt_ar_open_items` per account set of the page of offices (one call per scope, not per row) |
| Office attribution | account home office; balances are consolidated across offices (home-office unit, PD-4) |
| Migrated history | Created date unreliable before DATA-10 (`availability[]` `account_created_date_migrated`, printed when the range touches migrated accounts); resp. party type empty on self-guarantor accounts before DATA-53 (`resp_party_type_missing`); balances valid for both eras subject to ledger completeness |

### Output

One block `accounts` (main) for every mode; columns switch with `visible_when` on `report_by`. Fixed outer
`Office : <office_name>` when multi-office (home office).

| key | label | type | data_class | total / subtotal rule | visible in |
|---|---|---|---|---|---|
| `account_no` | Resp. Party ID | text | `phi_identified` | - | all |
| `responsible_party_name` | Responsible Party | text `Last, First` | `phi_identified` (key column) | `count` -> `Total Accounts : n` | all |
| `address` | Address | text (line 1, city, state) | `phi_identified` | - | all |
| `zip` | Zip | text | `phi_identified` | - | all |
| `phone` | Phone | text (home, else cell) | `phi_identified` | - | all |
| `email` | E-mail | text | `phi_identified` | - | all |
| `resp_party_type` | Type | text (definition label) | `phi_identified` | - | all |
| `created_date` | Created | date | `phi_identified` | - | all but `send_statement_status` (default hidden there) |
| `send_statements` | Send Stmt | boolean (`Yes` / `No`) | `phi_identified` | `count` of `No` in mode `send_statement_status` | all |
| `no_email_statement` | No E-mail Stmt | boolean, `default_visible: false` | `phi_identified` | - | all |
| `member_count` / `active_member_count` | Patients / Active | integer, `default_visible: false` | `phi_identified` | - | all |
| `balance` | Balance | money | `financial_patient` | `sum`; subtotal per group | `balance`, `balance_aged_over_x_days`; others when `include_account_balance` |
| `aged_amount` | Over `{aging_days}` Days | money | `financial_patient` | `sum` | `balance_aged_over_x_days` |
| `est_insurance` / `est_patient` | Est. Ins. / Est. Pat. | money | `financial_patient` | `sum` | balance modes with `include_balance_split` |
| `last_statement_date` | Last Stmt | date, `default_visible: false` | `phi_identified` | - | all (NULL until DATA-22) |
| `account_id`, `home_office_id` | - | id, `hidden` | `phi_identified` / `aggregate` | `account_id` = `row_id_column` | all |

| Mode | Group levels and subtotals | Default sort |
|---|---|---|
| `created_date`, `send_statement_status` | none (office band only) | `responsible_party_last_name` (last, first, `account_no`, `account_id`) |
| `balance`, `balance_aged_over_x_days` | none; grand total of `balance` (and `aged_amount`) | as above; `balance_desc` offered |
| `resp_party_type` | level `resp_party_type`, header `Type : {resp_party_type_label}` (label class `aggregate` + `allow`, NEW dimension declaration in 05 section 1.5), subtotal count (+ balance when shown) | type label, then name |
| `zip` | level `guarantor_zip5`, header `Zip : {zip}` (group key `phi_identified` + `deny`, rule 13), subtotal count | zip, then name |

Page break: `none` (default), `group` (modes with a group level), `office`. Summary cards: accounts; total balance and
aged amount in the balance modes. `reconciles_with` (tests): mode `balance` with `date_preset = all_dates`,
`include_inactive_accounts = true` and `office_scope = all`: Σ `balance` = `total_ar` (as of today, home-office
attribution); mode `balance_aged_over_x_days` with `aging_days = 90`, `aged_balance` open: Σ `aged_amount` =
`ar_over_90_amount` (same bucket set).

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Mode `resp_party_type`: bar of accounts (and balance) per type; mode `zip`: top 20 zips by accounts (labels follow rule 13); other modes none - a list |
| Balance cell | `kind: report` `ledger.ledger_report` with `account_id` <- row, `report_type` <- literal `account_ledger` |
| Aged amount cell | `kind: report` `monthly.aging_report_by_home_office` with `responsible_party_name_from` / `_to` <- row name, `report_date` <- today, `aging_buckets` <- buckets above `aging_days` |
| Group subtotal (type, zip) | `kind: rows` - same report filtered to the group (`exclude_resp_party_type_codes` cannot express an include, so the target receives a NEW hidden `include_resp_party_type_codes` / `zip_codes` through `param_map`) |
| Responsible party name | `kind: record` guarantor account screen (route `patient_ledger` of the guarantor patient, ledger feature right of 08) to correct the address, type or Send Statements flag |

### Actions

| Action key | Scope | Kind | Right / requires | Rule |
|---|---|---|---|---|
| `open_account` | row | navigate | ledger feature right | Account ledger / guarantor edit |
| `letters` / `labels` / `postcards` | bulk | letters / labels / postcards | letters feature (`patient_letters_generate`), PD-15 | Mailing to guarantors (zip mode), balance letters (balance modes); guarantor patients with `no_correspondence` excluded with a count |
| `send_sms` | bulk | send_sms | SMS feature; `requires: sms_consent` | Balance reminder (balance modes) |
| `print_statements_for_selection` | bulk | navigate to `statements.statement_run` with NEW `account_ids` = selection | statements family Full Control | Balance modes, mid-cycle statements |
| `create_task` | row / bulk | create_task | task feature | "Billing follow-up"; mode Send Statement Status = No: "Review statement flag" |
| `export_selection` | bulk | export_selection | `reports_export_data_files` | - |

Mode `send_statement_status` = `no` doubles as a pre-run checklist; mode `balance_aged_over_x_days` as a collections
call list (the follow-up state lives in `worklists.patient_ar`, 06).

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (up to 11 columns), header office / organisation name + mode title; footer echo `Report By :`, `From :` / `Thru :` (not in mode Send Statement Status), `Send Statement Status :`, `ExRespType :` [I label], `Aged Over : n days`, `Aged Balance : a - b`, `* Excludes Inactive Accounts` when unticked, `Printed :`, `By :`, `Page : n of m` |
| XLSX | One sheet per run with the visible columns; group key written as a column (`Type`, `Zip`) on every row instead of band rows; `outline_groups` for the group levels; money as numeric cells |
| CSV | Main block, guard on |
| Background | Balance modes for an office group or `all` (`escalate_when`), and any mode with `all_dates` over more than 20,000 accounts |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Criteria panels of modes Balance, Resp. Party Type, Zip and today's Balance Aged Over X Days (labels, defaults, whether the created range stays) | Live legacy tool, each mode |
| 2 | Mode Balance: non-zero, positive only, or a balance range? Are credit balances listed? | Live legacy run with a credit account |
| 3 | Defaults of SEND STATEMENT STATUS and of the days selector; aged threshold `> 30` or `>= 30` days | Live legacy tool |
| 4 | Printed columns and grouping of every mode (INFERRED); exact footer label of the excluded types | Live legacy PDF |
| 5 | Is `Responsible Party List - Email` gone or folded into a mode? | Live legacy menu |
| 6 | Are merged-away accounts (`merged_into_account_id`) ever wanted on this list? | Product owner |

## Responsible Party - Sent to Collection - `lists.responsible_party_sent_to_collection`

Lists › Patient/Resp. Party List, group `RESPONSIBLE PARTY LIST`, screenshot 11.PNG - P3 - S - `lists_responsible_party`
(`reports_lists_responsible_party_list_screen_view_only` / `..._full_control`) - instant - PARTIALLY DOCUMENTED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Billing / collections | Monthly | Reconcile DentC's flagged accounts with the agency's placement list; follow balances still on the books |
| Office manager | Month end | Size of the book at collection, per agency |

### Legacy output

Confidence PARTIALLY DOCUMENTED: purpose `[P19]`; the flag `Send to Collection` and the field `Collection Agency` of the
responsible party `[P23][P24]`; layout [I].

| Item | Legacy | DentC |
|---|---|---|
| Printed title | [I] `Responsible Party - Sent to Collection` | same |
| Columns [I] (basis: fields; Dentrix Enterprise Collections Manager List) | Responsible-party ID, name, phone, collection agency, account balance (possibly aged), last payment | Same, ageing buckets optional |
| Totals [I] | Count and balance total | `Total Accounts : n`, balance total |
| Data facts | The flag has no date; the vendor recommends a zero-fee `Z` code on the ledger as the hand-over marker and ticking `No Correspondence`; the balance stays on the account and in ageing / statements unless excluded | No date before DATA-35; a Z-code marker date is offered as an enhancement |
| Sign convention | Balance positive = owed; the default lower bound 0.00 is treated as a real bound [I], so credit balances are not listed by default | parity note of `r10.s03.c01`; open question |

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r10 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; never changes rows |
| OFFICE/GROUP `Office` (default working office) / `Office Group` | `office_ids` / `office_group_id(s)` on `rpt_account_dim.home_office_id` |
| ACCOUNT BALANCE RANGE Start (default `0.00`) | `account_balance_from`: balance `>=` bound, inclusive; real bound [I] - negative balances excluded |
| ACCOUNT BALANCE RANGE End (default `999999.99`) | `account_balance_to`: balance `<=` bound; practical open bound [I] |
| (population, no control) | Accounts with `send_collections = true` |
| Rule `patients_list_reports.r01.d01` | Office mode switch |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | `frontend` / `print` / `saved_view` |

No date criterion: the list is current state. Number boxes accept negative values (`validation.min = -999999.99`) so a
user can list credit balances of collection accounts.

### Parameters - enhancements

| Key | Type | Default (= legacy run) | Effect |
|---|---|---|---|
| `collection_agency_ids` | `entity_multi` NEW (`lookup:collection_agencies` NEW source, owner 04) | `all` | Per-agency reconciliation |
| `group_by` | `enum` (shared key) NEW value `collection_agency` | `none` | Group level per agency with count and balance subtotal |
| `sent_to_collections_date` | `date_range` NEW (secondary range) | blank (no restriction) | Accounts placed in a period; needs DATA-35 (`sent_to_collections_at`), else greyed with the reason |
| `include_inactive_accounts` | `boolean` (family key) | `true` [I] | Collection accounts are usually inactive; `false` drops accounts without an active patient |
| `include_aging` | `boolean` NEW | `false` | Adds `Current`, `31-60`, `61-90`, `91-120`, `Over 120` columns (legacy bucket set) |
| `marker_code_group` | via setup: code group `collection_marker` NEW in `rpt_code_groups` (owner 03) | - | Column `Marker Date` = first charge with a code of that group (the vendor's Z-code hand-over marker) |
| Saved view "Credit balances at collection" | preset | - | `account_balance_from = -999999.99`, `account_balance_to = -0.01` (refund due before closing with the agency) |

### Data

Availability **READY** (coverage matrix row 84); date sent **SCHEMA(35)** (DATA-35, P2: `accounts.sent_to_collections_at`,
`balance_status_code`). Datasets: `rpt_account_dim`, `rpt_ar_open_items()` (unit `account`), `rpt_payments`,
`rpt_charges` (marker), passthrough `collection_agencies` (NEW registration, catalog passthrough as DATA-45 does for list
catalogs: `id`, `name`, `phone`, `city`, `state`).

| Dataset | Columns used |
|---|---|
| `rpt_account_dim` | `account_id`, `account_no`, `home_office_id`, `guarantor_last_name`, `guarantor_first_name`, phones, address, `send_collections`, `collection_agency_id`, `active_member_count`, `merged_into_account_id`, `sent_to_collections_at`, `balance_status_code` |
| `rpt_ar_open_items(p_unit = 'account', p_as_of = local_today)` | `account_id`, `open_amount`, `item_kind`, `age_days` |
| `rpt_payments` | `account_id`, `payer`, `amount`, `transaction_date`, `txn_class` (`collection_agency_payment`) - last patient-side payment date and amount, agency payments since placement |
| `rpt_charges` | `account_id`, `procedure_code`, `service_date` - marker date via `rpt_code_in_group(tenant_id, 'collection_marker', code, date)` |

| Parameter | Becomes |
|---|---|
| `office_scope` | `a.home_office_id = ANY(:office_ids)` |
| population | `a.send_collections AND a.merged_into_account_id IS NULL` |
| `account_balance_from` / `_to` | `balance BETWEEN :from AND :to`, `balance = Σ open_amount` per account (R-05) |
| `collection_agency_ids` | `a.collection_agency_id = ANY(:ids)` |
| `sent_to_collections_date` | `a.sent_to_collections_at` office-local date in range (DATA-35) |

| Topic | Rule |
|---|---|
| Date basis | none (`scope.date_basis = null`); balance as of the home office's today |
| Office attribution | account home office; balance consolidated across offices |
| Migrated history | The flag and agency were migrated with the responsible party (current state); when an account was placed is unknowable for history - DATA-35 stamps it from the first edit after the column exists (`availability[]` `collection_date_unknown`) |

### Output

Block `accounts` (main). Fixed outer office band when multi-office; optional agency level.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `account_no` | Resp. Party ID | text | `phi_identified` | - |
| `responsible_party_name` | Responsible Party | text | `phi_identified` (key column) | `count` -> `Total Accounts : n` |
| `phone` | Phone | text | `phi_identified` | - |
| `address` | Address | text, `default_visible: false` | `phi_identified` | - |
| `collection_agency_name` | Collection Agency | text | `phi_identified` (on an account row) | group label `aggregate` when grouped |
| `balance` | Balance | money | `financial_patient` | `sum` (agency subtotal, office subtotal, grand total) |
| `aging_current` ... `aging_over_120` | Current / 31-60 / 61-90 / 91-120 / Over 120 | money, `visible_when ["truthy", "include_aging"]` | `financial_patient` | `sum` |
| `last_payment_date` | Last Payment | date | `phi_identified` | - |
| `last_payment_amount` | Amount | money, `default_visible: false` | `financial_patient` | - |
| `agency_payments_since` | Agency Pmts | money, `default_visible: false` (needs DATA-35) | `financial_patient` | `sum` |
| `sent_to_collections_date` | Sent On | date (blank before DATA-35) | `phi_identified` | - |
| `marker_date` | Marker Date | date, `default_visible: false` | `phi_identified` | - |
| `account_id` | - | id, `hidden`, `row_id_column` | `phi_identified` | - |

Default sort: responsible-party last name, first name, `account_no`, `account_id` [I]; `sort_by` enhancement values
`responsible_party_last_name`, `responsible_party_id`, `balance_desc`. Page break `none`, `group` (agency), `office`.
Summary cards: accounts, total balance, accounts with a payment in the last 90 days. No metric key covers collection
placements (metrics_card); figures described here only.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | With `group_by = collection_agency`: bar of balance per agency; otherwise none - a list |
| Balance cell | `kind: report` `ledger.ledger_report` (`account_id` <- row, `report_type` <- `account_ledger`) |
| Last payment | `kind: report` `ledger.ledger_report` with `date_from` / `date_to` <- `last_payment_date` |
| Agency subtotal | `kind: rows` - same report with `collection_agency_ids` <- group key |
| Name | `kind: record` guarantor account screen (ledger feature right) |

### Actions

| Action key | Scope | Kind | Right / requires | Rule |
|---|---|---|---|---|
| `export_for_agency` | bulk | export_selection | `reports_export_data_files` | CSV / XLSX with account no, name, address, phone, balance, last payment - the agency placement file |
| `letters` | bulk | letters | letters feature, PD-15 | Final notice / placement letter (ignores `no_correspondence` only if the letter feature allows legal notices - decided there) |
| `create_task` | row / bulk | create_task | task feature | "Agency follow-up" |
| `open_account` | row | navigate | ledger feature right | Clear the flag or change agency on the account screen (the report never writes) |

Doubles as the monthly agency reconciliation worklist via tasks.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait (landscape when `include_aging`); header office / organisation + title; footer echo `Offices :`, `Account Balance : <from> - <to>`, `Printed :`, `By :`, `Page : n of m` |
| XLSX | One sheet; agency as a column on each row; money numeric |
| CSV | Main block; the agency export shape is a named `export_shapes[]` entry `agency_placement` |
| Background | Not needed (`instant`) |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Are 0.00 / 999999.99 real bounds (credit balances excluded) or open bounds? (family open question 10) | Live legacy run with a credit-balance account flagged |
| 2 | Printed columns (agency, last payment, ageing?) - INFERRED | Live legacy PDF |
| 3 | Are accounts with only inactive patients listed? | Live legacy run |
| 4 | Product: should flagging an account post the Z-code marker automatically once DATA-35 stores the date? | Product owner |

## Responsible Party - Statements Sent - `lists.responsible_party_statements_sent`

Lists › Patient/Resp. Party List, group `RESPONSIBLE PARTY LIST`, screenshot 12.PNG - P3 - S - `lists_responsible_party`
(`reports_lists_responsible_party_list_screen_view_only` / `..._full_control`) - instant - PARTIALLY DOCUMENTED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Billing | After each statement run | Confirm which accounts received a statement of that statement date, per channel |
| Billing / front desk | When a payer says no statement arrived | Check the account, the channel, the address used and the balance stated |

### Legacy output

Confidence PARTIALLY DOCUMENTED: purpose `[P21]`; statement formats `[P22·img]`; layout [I].

| Item | Legacy | DentC |
|---|---|---|
| Printed title | [I] `Responsible Party - Statements Sent` | same; `title_templates` adds ` - Paper` / ` - Email` / ` - Both` [I] |
| Columns [I] | Responsible-party ID, name, mailing address or e-mail, statement date, channel, statement balance | Same |
| Totals [I] | Count of statements and total balance | `Total Statements : n`, total of `Statement Balance` |
| Related legacy outputs | Statement Setup buttons `PRINT STATEMENT SENT`, `EMAIL STATEMENT SENT REPORT`, `EMAIL STATEMENT ERROR REPORT`; the old `Email Statement Sent Report` is probably this report with `Email` [I] | Statement Setup buttons link here and to `lists.responsible_party_email_statement_error_report` |
| Sign convention | Statement balance positive = owed, negative = credit | `closing_balance` of the frozen statement row, never recomputed |
| Quirk | `Email` and `Both` greyed in the only capture (presumably offices without e-statements) | Kept enabled until the live rule is read (parity note); candidate rule below |

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r11 -->

| Legacy option | Effect on the result |
|---|---|
| STATEMENT TYPE `Paper` (default) | `statement_type = paper`: statement rows not delivered by e-mail (`delivery_method` `print`, `download` or not yet set) [I] |
| STATEMENT TYPE `Email` (greyed in capture) | `statement_type = email`: rows with `delivery_method = 'email'` and a successful send; candidate `enabled_when ["ctx", "feature.e_statements"]` (FLT-05) once confirmed |
| STATEMENT TYPE `Both` (greyed in capture) | `statement_type = both`: no channel restriction (parity mapping); channel printed per row |
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; never changes rows |
| OFFICE/GROUP `Office` (default working office) / `Office Group` | `office_ids` / `office_group_id(s)` on the statement office: `patient_statements.office_id`, fallback account home office [I] (see parity concerns) |
| STATEMENT DATE (default today) | `statement_date` (`filter_equals`): `patient_statements.statement_date = :statement_date`; must equal the date of a past run |
| Rule `patients_list_reports.r01.d01` | Office mode switch |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | `frontend` / `print` / `saved_view` |

### Parameters - enhancements

| Key | Type | Default (= legacy run) | Effect |
|---|---|---|---|
| `statement_run_id` | `entity_single` NEW (`lookup:statement_runs` NEW source: runs of the office, newest first, label `<statement date> - <n> statements`) | `null` (no restriction) | Pick one run when two runs share a date; sets `statement_date` from the run |
| `statement_date` token | relative token (filter_card 12) | `today` | Saved view "Last run" with NEW display token `last_statement_run_date` (owner 04, from `statement_runs`) so the favorite always opens the latest run |
| `responsible_party_name` | `text_range` (shared, 3.4) | `AAAAA` / `ZZZZZ` | Answer "did this payer get a statement" without paging |
| `include_failed_deliveries` | `boolean` NEW | `false` | `true` adds e-mail rows whose send failed (they are the subject of the error report) |
| `show_previous_statement` | `boolean` NEW | `false` | Adds `Previous Stmt` (date of the account's previous statement row) and `Change` (balance difference) |

### Data

Availability **APP** (coverage matrix row 83): `statement_date`, `delivery_method`, `delivery_status`, `delivered_to`,
`delivered_at`, `batch_id` exist [V]; no statement was migrated, so nothing before the first DentC run can be listed. Run
header and run office: DATA-22 (P1, `statement_runs`); rows are written by `statements.statement_run` (RPT-STMT-13).

| Dataset | Columns used |
|---|---|
| passthrough `patient_statements` (DATA-52) | `id`, `account_id`, `patient_id`, `statement_scope`, `office_id`, `statement_date`, `closing_balance`, `delivery_method` (`print`, `email`, `download`), `delivery_status` (stored `generated`, `printed`, `emailed`, `downloaded`; `sent`, `reopened`, `failed` added by RPT-STMT / DATA-22), `delivered_to`, `delivered_at`, `batch_id`, `snapshot`, `created_by` |
| `statement_runs` (DATA-22) | `batch_id`, `office_id`, `statement_date`, `status`, `statement_count`, `started_by` |
| `rpt_account_dim` | `account_no`, `guarantor_last_name`, `guarantor_first_name`, address, `guarantor_email`, `home_office_id` |

| Parameter | Becomes |
|---|---|
| `office_scope` | `coalesce(r.office_id, s.office_id, a.home_office_id) = ANY(:office_ids)` |
| `statement_date` | `s.statement_date = :statement_date` |
| `statement_type` | `paper`: `s.delivery_method IS DISTINCT FROM 'email'`; `email`: `s.delivery_method = 'email' AND s.delivery_status <> 'failed'`; `both`: none |
| fixed | `s.delivery_status IS DISTINCT FROM 'reopened'` (undone runs are not "sent"); `failed` dropped unless `include_failed_deliveries` |
| `statement_run_id` | `s.batch_id = :batch_id` |

| Topic | Rule |
|---|---|
| Date basis | `statement_date` equality (fixed) |
| Office attribution | statement-run office (row office until DATA-22 header exists; account home office as last fallback) |
| Address printed | For paper rows the mailing address frozen in `snapshot` at generation when present, else the current account address with a footnote `* current address` [I] |
| Migrated history | None (APP); `availability[]` `no_migrated_statements` printed when `statement_date` precedes the tenant's first run |

### Output

Block `statements` (main). Fixed outer office band when multi-office.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `account_no` | Resp. Party ID | text | `phi_identified` | - |
| `responsible_party_name` | Responsible Party | text | `phi_identified` (key column) | `count` -> `Total Statements : n` |
| `delivered_to` | Address / E-mail | text | `phi_identified` | - |
| `statement_date` | Statement Date | date | `phi_identified` | - |
| `channel` | Type | enum (`Paper`, `Email`) | `phi_identified` | `count` per channel in the footer when `statement_type = both` |
| `closing_balance` | Statement Balance | money | `financial_patient` | `sum` |
| `delivery_status` | Status | enum, `default_visible: false` | `phi_identified` | - |
| `delivered_at` | Sent | date, `default_visible: false` | `phi_identified` | - |
| `previous_statement_date` / `balance_change` | Previous Stmt / Change | date / money, `visible_when ["truthy", "show_previous_statement"]` | `phi_identified` / `financial_patient` | `sum` of change |
| `statement_scope` | Scope | enum (`Account`, `Patient`), `default_visible: false` | `phi_identified` | - |
| `statement_id`, `account_id`, `batch_id` | - | id, `hidden`; `statement_id` = `row_id_column` | `phi_identified` | - |

Default sort: responsible-party last name, first name, `account_no`, `statement_id`. Page break `none`, `office`.
Summary cards: statements, total stated balance, paper / e-mail split. No metric key (metrics_card has no statement
figures); described in words.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list |
| Row | `kind: record` the frozen statement PDF (`patient_statements.id`; feature right of the statement screen, 08) |
| Statement balance | `kind: report` `ledger.ledger_report` (`account_id` <- row, `report_type` <- `account_ledger`, `date_to` <- `statement_date`) |
| Header link | `kind: report` `statements.statement_run` of that office and `statement_date` (statements right) |

### Actions

| Action key | Scope | Kind | Right / requires | Rule |
|---|---|---|---|---|
| `reprint_statement` | row / bulk | custom: render the frozen statements of the selection (no new rows) | statements family Full Control | Re-mail on request; identical document |
| `email_statement` | row / bulk | custom: `email_statements` handler of `statements.statement_run` (RPT-STMT-23) | statements Full Control; account e-mail present, `no_email_statement = false` | Login-gated link (PD-12) |
| `open_account` | row | navigate | ledger feature right | - |
| `create_task` | row | create_task | task feature | "Statement not received" follow-up |
| `export_selection` | bulk | export_selection | `reports_export_data_files` | - |

Not a worklist.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait; header office / organisation + title; footer echo `Statement Type :`, `Statement Date :`, `Offices :`, `Printed :`, `By :`, `Page : n of m` |
| XLSX | One sheet; channel and status as columns |
| CSV | Main block; guard on |
| Background | Not needed (`instant`; one run is at most a few thousand rows) |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Why are `Email` / `Both` greyed - e-statement subscription or office setting? (family open question 9) | Live legacy tool of an organisation with e-statements |
| 2 | `Both`: no channel restriction, or only accounts that received paper and e-mail (format "Email & Paper")? | Live legacy run |
| 3 | Does the legacy list include statements generated but not yet marked sent (before UPDATE STATEMENT DATES / PAPER STATEMENT SENT)? | Live legacy run before and after the update |
| 4 | Printed columns and address shown (address at mailing or current) - INFERRED | Live legacy PDF |

## Responsible Party - Email Statement Error Report - `lists.responsible_party_email_statement_error_report`

Lists › Patient/Resp. Party List, group `RESPONSIBLE PARTY LIST`, screenshot 13.PNG - P3 - S - `lists_responsible_party`
(`reports_lists_responsible_party_list_screen_view_only` / `..._full_control`) - instant - PARTIALLY DOCUMENTED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Billing | After each e-statement send (the vendor sends three days after the statement date) | Fix the e-mail address on file or re-send the statement on paper, so the account is not left without a statement |

### Legacy output

Confidence PARTIALLY DOCUMENTED: purpose `[P19]`; limits `[P22]`; layout [I].

| Item | Legacy | DentC |
|---|---|---|
| Printed title | [I] `Responsible Party - Email Statement Error Report` | same |
| Columns [I] | Responsible-party ID, name, e-mail address, statement date / sent date, balance | Same, plus error text (enhancement) |
| Totals [I] | Count | `Total : n` |
| Documented limit `[P22]` | The legacy reports give no reason for a failed delivery (typical causes: wrong address, blocking by the recipient's provider) | DentC stores the error text (DATA-22 `delivery_error`) and prints it as an added column; the legacy run without it is unchanged |
| Quirk `[P22]` [conflict] | The vendor article contradicts itself on whether `No Email Statements` must be ticked to send e-statements | DentC: an account gets e-statements when it has an e-mail and `no_email_statement = false` (RPT-STMT-23) |

### Parameters - legacy parity

<!-- PARITY:patients_list_reports.r12 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format`; never changes rows |
| OFFICE/GROUP `Office` (default working office) / `Office Group` | `office_ids` / `office_group_id(s)` on the statement office (as on Statements Sent) |
| STATEMENT SENT DATE (default today) | `statement_sent_date`: office-local date of the e-mail send attempt [I: not the statement date, which precedes the send by three days at the vendor]; rows with `delivery_method = 'email'` and `delivery_status = 'failed'` |
| Rule `patients_list_reports.r01.d01` | Office mode switch |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | `frontend` / `print` / `saved_view` |

### Parameters - enhancements

| Key | Type | Default (= legacy run) | Effect |
|---|---|---|---|
| `statement_sent_date_through` | `date` NEW (optional end of a range) | blank = the single legacy date | Weekly sweep of failures |
| `sent_date_basis` | `enum` NEW: `sent_date`, `statement_date` | `sent_date` | Interprets the date as the run's statement date instead, until the live tool settles it (open question 1) |
| `error_classes` | `enum_multi` NEW: `invalid_address`, `rejected`, `bounced`, `other` (derived from `delivery_error`, owner 03) | all ticked, `no_predicate` | Separate typos from provider blocks |
| `only_unresolved` | `boolean` NEW | `false` | Drops accounts whose current e-mail differs from the failed address or that received a later successful statement |
| Saved view "E-statement failures - last 7 days" | preset | - | `statement_sent_date = today-7d`, `statement_sent_date_through = today`, `only_unresolved = true` |

### Data

Availability **SCHEMA(22)** (coverage matrix row 85): `delivery_status` exists, the failure outcome and its text do not.
Today `statement_service.deliver` only records intent (`emailed`) and no SMTP is wired [V], so no failure can occur
before DATA-22 (P1) adds the outcome and RPT-STMT-23 (P3) sends e-statements and writes `delivery_status = 'failed'`
with `delivery_error`. Asynchronous bounces need the mail provider's bounce feed (NEW, owner of the correspondence
transport); without it only synchronous rejections are listed (`availability[]` `bounces_not_captured`). No statement
was migrated (APP for history).

| Dataset | Columns used |
|---|---|
| passthrough `patient_statements` | `id`, `account_id`, `office_id`, `statement_date`, `closing_balance`, `delivery_method`, `delivery_status`, `delivered_to`, `delivered_at`, `batch_id`, NEW `delivery_error`, NEW `delivery_attempted_at` (timestamp of the send attempt; needed because `delivered_at` is stored as a date [A `be_data_financial.md` L241] and an attempt is not a delivery) |
| `statement_runs` (DATA-22) | `batch_id`, `office_id`, `statement_date` |
| `rpt_account_dim` | `account_no`, guarantor names, `guarantor_email` (current), phones, `no_email_statement`, `home_office_id` |

| Parameter | Becomes |
|---|---|
| `office_scope` | `coalesce(r.office_id, s.office_id, a.home_office_id) = ANY(:office_ids)` |
| `statement_sent_date` (+ `_through`) | office-local date of `s.delivery_attempted_at` between the dates (single date when `_through` blank); `sent_date_basis = statement_date`: `s.statement_date` instead |
| fixed | `s.delivery_method = 'email' AND s.delivery_status = 'failed'` |
| `only_unresolved` | `lower(a.guarantor_email) = lower(s.delivered_to) AND NOT EXISTS (later row of the account with delivery_status IN ('emailed','sent'))` |

| Topic | Rule |
|---|---|
| Date basis | send-attempt date (fixed, [I]) |
| Office attribution | as Statements Sent |
| Migrated history | none |

### Output

Block `failures` (main). Fixed outer office band when multi-office.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `account_no` | Resp. Party ID | text | `phi_identified` | - |
| `responsible_party_name` | Responsible Party | text | `phi_identified` (key column) | `count` -> `Total : n` |
| `delivered_to` | E-mail Address | text (the address the send used) | `phi_identified` | - |
| `statement_date` | Statement Date | date | `phi_identified` | - |
| `sent_date` | Sent Date | date | `phi_identified` | - |
| `closing_balance` | Balance | money | `financial_patient` | `sum` |
| `delivery_error` | Error | text (NEW; blank before DATA-22) | `phi_identified` (free text, rule 4) | - |
| `error_class` | Error Type | enum, `default_visible: false` | `phi_identified` | `count` per class in the footer |
| `current_email` | Current E-mail | text, `default_visible: false` | `phi_identified` | - |
| `phone` | Phone | text, `default_visible: false` | `phi_identified` | - |
| `statement_id`, `account_id` | - | id, `hidden`; `statement_id` = `row_id_column` | `phi_identified` | - |

Default sort: responsible-party last name, first name, `statement_id`. Page break `none`, `office`. Summary cards:
failures, balance not delivered. No metric key exists; a delivery-rate metric for statements would be NEW in 05.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list |
| Row | `kind: record` the frozen statement PDF |
| Name | `kind: record` guarantor account screen to correct the e-mail (ledger feature right) |
| Statement date | `kind: report` `lists.responsible_party_statements_sent` with `statement_date` <- row, `statement_type` <- `email`, `include_failed_deliveries` <- `true` |

### Actions

| Action key | Scope | Kind | Right / requires | Rule |
|---|---|---|---|---|
| `open_account` | row | navigate | ledger feature right | Correct the address |
| `reprint_statement` | row / bulk | custom (frozen statements, as on Statements Sent) | statements Full Control | Paper re-send of the same statement |
| `email_statement` | row / bulk | custom: `email_statements` handler (RPT-STMT-23) | statements Full Control | Re-send after correction; idempotent per `(run_id, action_key, account)` |
| `send_sms` | bulk | send_sms | SMS feature; `requires: sms_consent` | "Please confirm your e-mail address" |
| `create_task` | row / bulk | create_task | task feature | "Fix e-mail address" |
| `export_selection` | bulk | export_selection | `reports_export_data_files` | - |

With `only_unresolved = true` the report doubles as the e-statement repair worklist.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait (landscape when `delivery_error` is visible); header office / organisation + title; footer echo `Statement Sent Date :`, `Offices :`, `Printed :`, `By :`, `Page : n of m` |
| XLSX | One sheet; error text in its own column |
| CSV | Main block; guard on (error text comes from a remote mail server) |
| Background | Not needed (`instant`) |

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Does Statement Sent Date match the run's statement date or the day the e-mails went out? (family open question 9; supplement unresolved) | Live legacy run three days after a statement date |
| 2 | Does the legacy list include bounces reported later by the recipient's server, or only immediate rejections? | Live legacy tool; vendor e-statement service notes |
| 3 | Printed columns - INFERRED | Live legacy PDF |
| 4 | Product: on a failed e-mail, should the next statement run fall back to paper automatically? | Product owner; `statements.statement_run` owner |

<!-- WORK-ITEMS -->
| RPT-PLIST-40 | Definition `lists.update_patient_insurance_conversion_list_by_appointment`: parity parameters, formats `summary` / `detail` (appointment x slot), title templates, columns and data classes of this section, row filters, enhancement keys `conversion_basis`, `include_cancelled_appointments`, `appointment_provider_ids`, `operatory_ids`, `eligibility_statuses`, `sort_by`, `page_break_by` | P3 | S | DATA-16, DATA-21, RPT-PLIST-01, RPT-PLIST-06, RPT-PLIST-41 | Golden fixture: a `UP` patient with two slots and one appointment in range gives two Detail rows and Summary 1 appointment / 1 patient; a cancelled appointment appears only with `include_cancelled_appointments`; defaults equal the parity file (FLT-20) |
| RPT-PLIST-41 | NEW computed column `rpt_insurance_coverage.is_conversion_placeholder` (carrier `CONVERSION DEFAULT%` or employer `CONVERSION` + group `DO NOT TOUCH`) and its count on the migrated tenant | P3 | S | DATA-21 | The flag is true exactly on the placeholder slots of a hand-checked sample; the count of `UP` patients with and without a placeholder slot is recorded for open question 1 |
| RPT-PLIST-42 | Conversion list actions and saved view: `open_patient_insurance`, `verify_eligibility` hand-off to `worklists.eligibility_verification`, `create_task`, `send_sms`, schedulable "2 days ahead" view | P3 | S | RPT-PLIST-40, ENG-28, ENG-49 | The view opened on two consecutive days lists the appointments of today+2d; SMS excludes opted-out patients and shows the excluded count |
| RPT-PLIST-43 | Definition `lists.online_registered_patients` on passthrough `booking_requests`: derived `registration_status` / `is_active` (`TRUE` / `FALSE` display), Summary per office with optional period, Detail columns, enhancement keys `registration_statuses`, `registration_kind`, `summary_period` | P3 | S | DATA-44, MET-18, RPT-PLIST-06, RPT-PLIST-44 | Fixture with one request per status: Summary counts active 2 (pending + awaiting payment), imported 1, declined / expired 2; created-date bounds respect the office time zone; Summary total equals `online_booking_requests` |
| RPT-PLIST-44 | Register `booking_requests` as a passthrough dataset (tenant scope, office column, created-date binding) and, after DATA-44, union patients with `registration_source = 'online'` | P3 | S | DATA-44, ENG-09 | Lint passes; a run never reads a request of another tenant; the `registration_expiry_lazy` warning prints when overdue pending rows exist |
| RPT-PLIST-45 | Definition `lists.responsible_party_list`: six `report_by` modes in one block with `visible_when` columns, rule `patients_list_reports.r09.d01`, group levels for type and zip, title per mode, enhancement keys `include_account_balance`, `include_balance_split`, `sort_by`, `has_email`, `exclude_sent_to_collection`, `responsible_party_name` | P3 | M | DATA-07, DATA-10, DATA-20, RPT-PLIST-01, RPT-PLIST-07, RPT-PLIST-48 | Each mode runs on the fixture; switching to Send Statement Status hides and resets the created range; inactive accounts (no active member) appear only with `include_inactive_accounts`; merged-away accounts never appear |
| RPT-PLIST-46 | Aged mode: `aged_balance` (`number_range`, 1.00 / 999999.99) and `aging_days` (30 / 60 / 90 / 120) bound to `rpt_ar_open_items` unit `account` and the legacy bucket set; reconciliation tests against `total_ar` and `ar_over_90_amount` | P3 | S | DATA-27, RPT-PLIST-45, MET-10 | Σ balance (mode balance, all dates, all offices, inactive included) = `total_ar`; Σ aged amount with 90 days = `ar_over_90_amount`; credits never counted in the aged amount |
| RPT-PLIST-47 | Resp. party type mode and exclude filter on `rpt_account_dim.resp_party_type`, option source `definitions:resp_party_type` with `No Type Defined`, `resp_party_type_missing` warning until the back-fill | P3 | S | DATA-53, RPT-PLIST-45 | After DATA-53 every fixture account has a type and the type group counts sum to the account count; before it the warning prints and NULL-type accounts are kept by the exclude filter |
| RPT-PLIST-48 | `rpt_account_dim` contact columns for the guarantor lists: NEW `guarantor_email`, `guarantor_zip5`, phone preference, mailing address of party and self-guarantor accounts (owner 03) | P3 | S | DATA-05 | Every account of a 500-account sample shows the address and e-mail the guarantor screen shows, for both guarantor kinds |
| RPT-PLIST-49 | NEW display token `last_statement_run_date` and option source `statement_runs` (owner 04) for the statement lists | P3 | S | DATA-22, FLT-06 | A favorite with the token opens on the latest run's date of the working office; the source lists runs newest first with their counts |
| RPT-PLIST-50 | Definition `lists.responsible_party_sent_to_collection`: population `send_collections`, `account_balance` range with negative values allowed, columns incl. agency, last payment, optional ageing, `group_by = collection_agency`, agency export shape | P3 | S | DATA-07, DATA-20, RPT-PLIST-07, RPT-PLIST-51 | Default run excludes a flagged credit account and includes it with the credit saved view; agency subtotals sum to the grand total; the `agency_placement` CSV has one row per account |
| RPT-PLIST-51 | Passthrough `collection_agencies` and option source `collection_agencies`; code group `collection_marker` for the Z-code marker date; `sent_to_collections_date` range and `agency_payments_since` after DATA-35 | P3 | S | DATA-35, DATA-04, DATA-45, FLT-06 | Agency names resolve for every flagged account; marker date equals the first marker charge of a fixture account; the date range is greyed with its reason before DATA-35 |
| RPT-PLIST-52 | Definition `lists.responsible_party_statements_sent` on `patient_statements` + `statement_runs`: `statement_type` channel mapping, run-office attribution with fallbacks, reopened rows excluded, `statement_run_id`, `responsible_party_name`, `include_failed_deliveries`, `show_previous_statement` | P3 | S | DATA-22, RPT-STMT-13, RPT-PLIST-08, RPT-PLIST-49 | A fixture run of 3 accounts (2 paper, 1 e-mail) lists 2 / 1 / 3 rows for paper / email / both; an undone run lists nothing; the stated balance equals `closing_balance` of the frozen row |
| RPT-PLIST-53 | STATEMENT TYPE option rule: read the greyed `Email` / `Both` cause on the live tool and declare `enabled_when` (candidate `ctx.feature.e_statements`); Statement Setup links to both statement lists | P3 | S | FLT-23, FLT-05, RPT-PLIST-52 | The served definition greys the options exactly when the live tool does; the parity file is rebuilt PARITY VALID |
| RPT-PLIST-54 | Definition `lists.responsible_party_email_statement_error_report`: failed e-mail rows by send-attempt date, `delivery_error` column and `error_classes`, `statement_sent_date_through`, `sent_date_basis`, `only_unresolved`, repair actions | P3 | S | DATA-22, RPT-STMT-23, RPT-PLIST-08, RPT-PLIST-55 | A send that the transport rejects appears on the report of its attempt date with the stored error text; after the address is corrected the row leaves the `only_unresolved` view |
| RPT-PLIST-55 | Statement delivery outcome capture for the error report: `delivery_status = 'failed'`, `delivery_error`, NEW `delivery_attempted_at` written by the e-statement handler; bounce feed from the mail provider marked as follow-up (owner of the correspondence transport) | P3 | S | DATA-22, RPT-STMT-23 | Every e-mail attempt writes one outcome; a synchronous rejection stores `failed` and the text; `bounces_not_captured` prints until the bounce feed exists |
<!-- /WORK-ITEMS -->
