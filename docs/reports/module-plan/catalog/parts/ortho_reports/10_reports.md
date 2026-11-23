## Ortho Compliance Report - `ortho.ortho_compliance_report`

Ortho Reports, screenshot `1.PNG` - P3 - M - right family `ortho` (`reports_ortho_reports_view_only` / `reports_ortho_reports_access_full_control`) - cost_class interactive - legacy output confidence PARTIALLY DOCUMENTED (purpose documented, columns INFERRED)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Ortho coordinator, front desk of an ortho office | Weekly, and before the schedule for the next adjustment cycle is built | Find active ortho patients who fell out of the visit rhythm: no future appointment and no ortho visit for N weeks; call and book them |
| Orthodontist, office manager | Month end | Size of the "lost in treatment" pool per provider and office; patients past their planned end date |

Vendor purpose: identify patients overdue for a visit - patients with an **active ortho contract** and **no future
appointment** (research section 6, [R56]). Default cadence: not stated by the vendor.

### Legacy output

No sample, no field list. Printed title not seen; the definition prints `Ortho Compliance Report` [I].

Reconstructed columns (INFERRED from the sibling ortho reports, research section 6):

| # | Header (proposal) | Content |
|---|---|---|
| 1 | `Pat ID` | patient id |
| 2 | `Pat Name` | last, first, middle initial |
| 3 | `Cell Phone` / `Email` | contact |
| 4 | `Ortho Status` | status of the contract |
| 5 | `Ortho Start Date` | contract start |
| 6 | `Last Visit` | last ortho-card visit [I] |
| 7 | `Weeks` | weeks since the last visit |
| 8 | `Provider` | contract provider [I] |

Grouping, totals and sort: unknown. Kept: one row per patient, office band per office. Deliberately decided (to confirm):
a contract without any recorded visit is listed with `Weeks` blank and the flag `No visit recorded` (a new contract that
never had an adjustment is the most overdue case) [I].

### Parameters - legacy parity

<!-- PARITY:ortho_reports.r01 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot (`pdf` / `xlsx`; `csv` added). Rows unchanged |
| OFFICE/GROUP `Office` (default, working office) | `office_ids`: contracts whose `rpt_ortho_contracts.office_id` is in the set; one `Office :` band per office when more than one |
| OFFICE/GROUP `Office Group` | `office_group_id`: every office of the group, banded per office |
| PROVIDER `ALL` (default) | No provider predicate |
| PROVIDER narrowed | `rpt_ortho_contracts.provider_id IN (:provider_ids)` (contract provider [I]); contracts without a provider drop out |
| NUMBER OF WEEKS SINCE LAST VISIT `6` (default) | Keeps contracts with `weeks_since_last_visit >= 6` (or no visit at all) [I] |
| NUMBER OF WEEKS SINCE LAST VISIT other value `n` | Same test with `n`; `0` lists every active contract without a future appointment |
| (hidden population rule, no control) | Active contract (`is_active`; `contract_status = 'active'` after DATA-42) AND `rpt_patient_activity.next_appointment_date IS NULL` (no live appointment after the office's today, cancelled and no-show excluded) |

Dependency rules: none (nothing greyed, no dynamic rule in the index).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `ortho_status_codes` | `entity_multi` (`lookup:ortho_statuses`) | `all` | Restrict to statuses (for example exclude `observation`) |
| `past_planned_end_only` | `boolean` (NEW) | `false` | Keep contracts with `is_past_planned_end = true` |
| `include_no_visit_contracts` | `boolean` (NEW) | `true` | Unticked: drop contracts that never had a visit; the default reproduces the decided legacy behaviour |
| `exclude_followed_up_within_days` | `integer` (NEW, needs DASH-28) | empty | Drop patients with a worklist follow-up logged in the last n days |
| `group_by` | `enum`: `none`, `provider` | `none` | Provider band with patient count |
| `sort_by` | `enum`: `weeks_desc`, `patient_last_name`, `last_visit_date`, `provider` | `weeks_desc` [I] | Row order inside the office band |
| Saved view "Overdue 8+ weeks - my offices" | saved view | - | `weeks_since_last_visit = 8`, `office_ids = @my_offices` |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ortho_contracts` (contract, `office_id`, `provider_id`, `ortho_status_code`, `treat_end_date`, `months_in_treatment`, `months_remaining`, `is_past_planned_end`, `last_visit_date`, `weeks_since_last_visit`); `rpt_patient_activity` (`next_appointment_date`, `last_appointment_date`); `rpt_patient_dim` (`chart_no`, names, `cell_phone`, `email`, `no_auto_sms`, `no_auto_email`, `no_correspondence`); `rpt_provider_dim` (provider short id, name) |
| Date basis | None (as of the office's today). `weeks_since_last_visit` = floor((local today - `last_visit_date`) / 7) |
| Last visit | After DATA-42: last `ortho_visits.visit_date`. Before: last charge with `is_ortho_code` (03 section 2.25) - this includes contract-billing charges (`is_contract_billing`), which are not visits; the interim builder excludes `is_contract_billing` rows [I] |
| Contract per patient | Latest ortho start among the patient's active contracts in scope; `contract_count` hidden |
| Office / provider | Contract office; contract provider (`ortho_plans.pref_provider_id`) |
| Filters | `office_scope` -> `office_id IN`; `provider_ids` -> `provider_id IN`; `weeks_since_last_visit` -> `(weeks_since_last_visit >= :n OR last_visit_date IS NULL)`; population rule -> `NOT EXISTS` future live appointment |
| Availability | Coverage matrix: **APP** (contracts are app-era only). Visit-based weeks need DATA-42 (`ortho_visits`); before, the interim last-visit rule applies and the run carries the warning `ortho_last_visit_from_charges` |
| Migrated history | None: no migrated contract exists, so the report is empty for patients treated before go-live unless their contract is re-entered in DentC |

### Output

One block `main`, grain patient.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `patient_id` | Pat ID | `id` | `phi_identified` | - |
| `patient_name` | Pat Name | `text` | `phi_identified` | count (label `Patients:`) per office and grand total |
| `cell_phone` | Cell Phone | `text` | `phi_identified` | - |
| `email` | Email | `text` | `phi_identified` | - |
| `ortho_status_label` | Ortho Status | `enum` | `phi_identified` | - |
| `ortho_start_date` | Ortho Start Date | `date` | `phi_identified` | - |
| `last_ortho_visit_date` | Last Visit | `date` | `phi_identified` | `null_display` "No visit recorded" |
| `weeks_since_last_visit` | Weeks | `integer` | `phi_identified` | max per office (label `Longest gap`) |
| `last_appointment_date` | Last Appt | `date` | `phi_identified` | - (enhancement, default visible) |
| `treat_end_date` | Planned End | `date` | `phi_identified` | - (enhancement, default hidden) |
| `is_past_planned_end` | Past Planned End | `boolean` | `phi_identified` | count of true (enhancement) |
| `provider_short_id` | Provider | `text` | `aggregate` | - |
| hidden: `ortho_plan_id`, `office_id`, `provider_id`, `contract_count`, `row_id` | | | `phi_identified` / `aggregate` | - |

Grouping: `fixed_outer` office when multi-office; optional `provider` level. Sort: `weeks_desc` = `weeks_since_last_visit`
desc nulls first, then `patient_last_name` (hidden), `row_id`. Page break: `page_break_by` `none` / `office` (layout,
enhancement). Summary cards: `Patients listed` (count), `Past planned end` (count). Related metric (not a reconciliation:
different population): `ortho_active_no_appointment_pct`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bar of patients by weeks band (6-8, 9-12, 13-26, >26, no visit), computed from the snapshot; none in PDF |
| Patient name | `record` patient -> `/patient/:id/overview` (needs `phi_identified`) |
| Ortho Start Date | `record` ortho contract -> `/patient/:id/payment-plan/ortho` (payment-plan right) |
| Office or provider count | `rows` of this report filtered to the group |
| Last Visit | `report` `ortho.ortho_daily_journal` with `patient_ids = [patient]`, `date_from = last visit - 365d`, `date_to = today` |

### Actions

| Action | Kind | Notes |
|---|---|---|
| Book next visit | row `navigate` | Scheduler booking hand-off (`openSchedulerForBooking`) with patient and contract provider |
| Text / e-mail reminder | bulk `send_sms` / `send_email` | `requires` consent; exclusions counted |
| Recall-style letter | bulk `letters` | Hand-off to Letters (PD-15) |
| Create follow-up task | row / bulk `create_task` | Assigned to the caller by default |
| Export selection | bulk `export_selection` | Export right |

Doubles as a worklist: yes - the ortho "no next appointment" queue; worklist mode (live paging, follow-up columns) is
RPT-ORTHO-11.

### Export and print

PDF `banded_table`, portrait, letterhead, header row repeated, criteria echo in the footer (offices, providers, weeks
threshold, statuses), `Page n of m`. XLSX: one sheet `Ortho Compliance`, one typed row per patient, office and provider
as columns (no merged bands), criteria sheet. CSV: main block. Background: not needed (one row per active contract).

### Open questions

| # | Question |
|---|---|
| Q1 | Columns, title, sort and totals of the legacy print (no field list exists) |
| Q2 | Which last visit counts (ortho-card visit or general visit); `>=` or `>`; whether a patient with a future appointment is excluded regardless of the weeks (supplement, unresolved) |
| Q3 | Whether contracts without any visit are listed |
| Q4 | Which provider PROVIDER filters (contract provider assumed; alternative: last visit provider) |
| Q5 | Whether an appointment that is unconfirmed or only booked in the Scheduler but cancelled later counts as "future appointment" (we use live, not cancelled / no-show) |

## Ortho Daily Journal - `ortho.ortho_daily_journal`

Ortho Reports, screenshot `2.PNG` - P3 - M - right family `ortho` - cost_class interactive (background above a 366-day span) - legacy output confidence DOCUMENTED (vendor field list, no image)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Orthodontist, ortho assistant | End of day (default today / today) | Check that every adjustment seen today is on the card with wire, elastics and compliance, and that the ortho visit code was posted |
| Ortho coordinator | On demand (a patient's history over a range) | Wire sequence and compliance trend of a patient before a consult or a transfer |

### Legacy output

Vendor field list, in order ([R56], DOCUMENTED, no image): `Pat ID`, `Pat Name` (last, first, middle initial), `Doctor`
(provider short id), `Assistant` (username), `UAW`, `LAW` (upper / lower archwire description from Ortho Setup),
`Procedures` (multi-line: all ortho procedures posted for the visit), `Compliance` (short id), `Oral Hygiene` (short id),
`Elastics`, `Appliance`.

Grouping and order: all visit entries separated by visit date, oldest to newest. Totals: none stated. Printed title:
not seen; the definition prints `Ortho Daily Journal` [I]. Kept: date bands, vendor column order, multi-line procedures.
Added (enhancement, flagged): visit count per date band and grand total.

### Parameters - legacy parity

<!-- PARITY:ortho_reports.r02 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot; Excel = flat rows with the visit date repeated |
| OFFICE/GROUP `Office` (default) / `Office Group` | Visits whose `ortho_visits.office_id` is in the resolved set; office band when multi-office |
| PROVIDER `ALL` (default) | No predicate |
| PROVIDER narrowed | `ortho_visits.visit_provider_id IN (:provider_ids)` (the printed `Doctor`) [I] |
| VISIT DATE Start Date / End Date (default today / today) | `ortho_visits.visit_date BETWEEN :date_from AND :date_to`, inclusive, office-local; one band per visit date |

Dependency rules: none.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `patient_ids` | `entity_multi` (`lookup:patients`, shared key) | `all` | One patient's visit history (drill target of the other reports) |
| `assistant_user_ids` | `entity_multi` (NEW, `lookup:users`, `provider_role` n/a) | `all` | Visits charted by the chosen assistants |
| `compliance_codes` | `entity_multi` (NEW, `lookup:ortho_compliance_codes`, owner 04 / 03) | `all` | For example only poor compliance |
| `show_visit_notes` | `boolean` (NEW, `role: query`) | `false` | Adds the `visit_notes` column (class `clinical`) |
| `group_by` | `enum`: `none`, `provider`, `patient` | `none` | Second level inside the date band (provider) or patient history layout (patient band, visits by date) |
| Presets | `date_preset` | `today` | `yesterday`, `this_week`, `last_month` |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ortho_visits` (NEW view over `ortho_visits`, DATA-42; requested in RPT-ORTHO-02): `visit_id`, `ortho_plan_id`, `patient_id`, `office_id`, `visit_date`, `visit_provider_id`, `assistant_user_id`, `upper_archwire`, `lower_archwire`, `compliance_code`, `oral_hygiene_code`, `elastics`, `appliance`, `notes`, `charge_id`; `rpt_charges` (`procedure_code`, `is_ortho_code`, `service_date`, `office_id`, `patient_id`); `rpt_patient_dim`; `rpt_provider_dim`; `rpt_user_dim` (username) |
| Procedures | `string_agg` of the codes of live charges with `is_ortho_code` of the patient on `visit_date` in the visit office, in posting order; the charge named by `charge_id` (the auto-posted ortho visit code) is always included |
| Date basis | `ortho_visit_date` (filter card 7.3) |
| Office / provider | Visit office; visit doctor |
| Archwire labels | `upper_archwire` / `lower_archwire` hold the description from Ortho Setup (DATA-42 sketch stores text, so a later setup rename does not rewrite history) |
| Availability | **SCHEMA(42)**. Interim mode until `ortho_visits` exists: one row per patient-office-day with an `is_ortho_code` charge (contract-billing charges excluded); `Doctor` = charge provider; `Procedures` = codes; `Assistant`, `UAW`, `LAW`, `Compliance`, `Oral Hygiene`, `Elastics`, `Appliance` empty; run warning `ortho_visit_card_fields_unavailable` |
| Migrated history | Interim mode works on migrated charges with D8xxx codes (ortho codes were migrated as charges); card fields never exist for migrated visits |

### Output

Block `main`, grain ortho visit.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `visit_date` | Visit Date (band header `Visit Date : <date>`) | `date` | `phi_identified` | group key; subtotal count `Visits:` (enhancement) |
| `patient_id` | Pat ID | `id` | `phi_identified` | - |
| `patient_name` | Pat Name | `text` | `phi_identified` | count per band and grand total (enhancement) |
| `doctor_short_id` | Doctor | `text` | `aggregate` | - |
| `assistant_username` | Assistant | `text` | `aggregate` | - |
| `upper_archwire` | UAW | `text` | `phi_identified` | - |
| `lower_archwire` | LAW | `text` | `phi_identified` | - |
| `procedures` | Procedures | `text` (multi-line) | `phi_identified` | - |
| `compliance_code` | Compliance | `text` | `clinical` | - |
| `oral_hygiene_code` | Oral Hygiene | `text` | `clinical` | - |
| `elastics` | Elastics | `text` | `phi_identified` | - |
| `appliance` | Appliance | `text` | `phi_identified` | - |
| `visit_notes` | Visit Notes | `text` | `clinical` | - (visible when `show_visit_notes`) |
| hidden: `visit_id` (`row_id`), `ortho_plan_id`, `office_id`, `visit_provider_id`, `patient_last_name` | | | | - |

Grouping: `fixed_outer` office when multi-office -> `visit_date` (always, legacy) -> optional `provider` / `patient`.
Sort inside a date: patient last name, then `visit_id` [I]. Page break: `none` (default), `date`, `office`. Summary card:
`Visits` (count). Related metric: `ortho_production` is not reconciled here (no money on this report).

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Visits per day (column) when the range spans more than 7 days; none for a single day |
| Patient name | `record` patient -> `/patient/:id/overview` |
| Procedures | `record` ledger -> `/patient/:id/ledger` at the visit date (ledger right) |
| Date band count | `rows` filtered to that date |

### Actions

Row: open patient, open ortho contract (`/patient/:id/payment-plan/ortho`), create task ("complete card entry"). Bulk:
export selection. Not a worklist (a journal of what happened).

### Export and print

PDF layout `journal` (02 section 7.2 lists Ortho Daily Journal there): landscape (12 columns), date band headers, multi-line
`Procedures` cell, repeated column header, criteria echo footer (offices, providers, visit date range). XLSX: sheet
`Ortho Daily Journal`, one row per visit, `visit_date` and office as columns, procedures joined with `; `. CSV: same.
Background run when the span exceeds 366 days or the row estimate exceeds `max_rows_inline`.

### Open questions

| # | Question |
|---|---|
| Q1 | Whether PROVIDER filters the visit `Doctor` (supplement, unresolved) or the contract provider |
| Q2 | Whether the legacy print has per-date counts or any total |
| Q3 | Whether `Procedures` lists only the codes linked to the visit or all ortho codes posted that day |
| Q4 | Whether `Compliance` / `Oral Hygiene` print short ids or descriptions in Excel |

## Patients by Ortho Status with Time in Treatment - `ortho.patients_by_ortho_status_with_time_in_treatment`

Ortho Reports, screenshot `3.PNG` - P3 - S - right family `ortho` - cost_class instant - legacy output confidence DOCUMENTED (vendor field list, no image)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Orthodontist, ortho coordinator | Monthly case review | Active base by status and how long each patient has been in treatment; spot long-running cases |
| Office manager | Month end, before contract billing review | Patients still in treatment past the planned months |

### Legacy output

Vendor field list ([R56], DOCUMENTED, no image): `Pat ID`, `Pat Name`, `DOB`, `Cell Phone`, `Email`, `Last Visit` (date
of service of the last Ortho Treatment Card entry), `Ortho Status` (from the newest ortho treatment plan), `Ortho Start
Date` (from the ortho payment plan start date; the vendor notes it may need adjusting), `Time in Treatment` (total months
between the start date and the **current date**; rounding not stated).

Grouping by status is suggested by the name but not stated [unverified]; totals not stated. Kept: the vendor column set.
Decided: default order status, then patient name, with no status band unless `group_by = ortho_status` [I]. Known quirk
kept: Time in Treatment runs to today, also for a debonded contract (legacy definition); the enhancement column
`months_to_debond` shows the closed duration.

### Parameters - legacy parity

<!-- PARITY:ortho_reports.r03 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot |
| OFFICE/GROUP `Office` (default) / `Office Group` | Contracts whose office is in the resolved set |
| ORTHO START DATE Start / End (default blank) | Blank = no restriction; a bound keeps contracts whose `ortho_start_date` lies inside (inclusive); contracts without a start drop out once a bound is set |
| PATIENT LAST VISIT Start / End (default blank) | Blank = no restriction; a bound keeps patients whose last ortho visit lies inside; patients without a visit drop out |
| ORTHO STATUS `ALL` (default) | No predicate (contracts without status kept) |
| ORTHO STATUS narrowed | `ortho_status_code IN (...)`; NULL status dropped |

Dependency rules: none. The two ranges and the status combine with AND [I].

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `provider_ids` | `entity_multi` (contract provider) | `all` | Per orthodontist |
| `months_in_treatment` | `number_range` (NEW: `months_in_treatment_from`, `months_in_treatment_to`, integer) | empty | For example 30+ months |
| `past_planned_end_only` | `boolean` (NEW) | `false` | `is_past_planned_end = true` |
| `include_inactive_contracts` | `boolean` (NEW, needs RPT-ORTHO-02) | `true` once `contract_status` exists | Unticked: active contracts only |
| `group_by` | `enum`: `none`, `ortho_status`, `provider` | `none` | Status band with count and average months |
| `sort_by` | `enum`: `status_patient`, `months_desc`, `patient_last_name`, `ortho_start_date` | `status_patient` [I] | Order |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ortho_contracts` (all-contracts grain after RPT-ORTHO-02: `ortho_start_date`, `ortho_status_code`, `last_ortho_visit_date`, `months_in_treatment`, `treat_end_date`, `months_remaining`, `is_past_planned_end`, `debond_date`, `is_active`, `provider_id`, `office_id`); `rpt_patient_dim` (`dob`, `cell_phone`, `email`, names, `chart_no`) |
| Time in Treatment | `months_in_treatment` = whole months of `age(local today, ortho_start_date)` (floor) as 03 defines it; NULL when no start date |
| Contract per patient | Latest ortho start in scope; `contract_count` hidden; a second active contract is a data warning |
| Filters | `office_scope` -> contract office; `ortho_start_date_*` -> `ortho_start_date BETWEEN`; `ortho_last_visit_date_*` -> `last_ortho_visit_date BETWEEN`; `ortho_status_codes` -> `IN` |
| Availability | **SCHEMA(42)**: `ortho_status_code` and visit-based last visit need DATA-42; before it the status column is empty and the status filter accepts only `all` (warning `ortho_status_unavailable`); last visit uses the interim charge rule |
| Migrated history | None (no migrated contract) |

### Output

Block `main`, grain patient (one contract).

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `patient_id` | Pat ID | `id` | `phi_identified` | - |
| `patient_name` | Pat Name | `text` | `phi_identified` | count per group and grand total |
| `dob` | DOB | `date` | `phi_identified` | - |
| `cell_phone` | Cell Phone | `text` | `phi_identified` | - |
| `email` | Email | `text` | `phi_identified` | - |
| `last_ortho_visit_date` | Last Visit | `date` | `phi_identified` | - |
| `ortho_status_label` | Ortho Status | `enum` | `phi_identified` | group key when `group_by = ortho_status` (label class `aggregate` in the header count) |
| `ortho_start_date` | Ortho Start Date | `date` | `phi_identified` | - |
| `months_in_treatment` | Time in Treatment | `integer` (format `{unit: months}`) | `phi_identified` | avg per group (enhancement) |
| `treat_end_date` | Planned End | `date` | `phi_identified` | - (enhancement, hidden by default) |
| `months_remaining` | Months Left | `integer` | `phi_identified` | - (enhancement) |
| `months_to_debond` | Months to Debond | `integer` | `phi_identified` | - (enhancement, visible when any row has a debond date) |
| `provider_short_id` | Provider | `text` | `aggregate` | - (enhancement) |
| `total_ortho_amt` | Contract Amount | `money` | `financial_patient` | sum (enhancement, hidden by default) |
| hidden: `ortho_plan_id`, `office_id`, `provider_id`, `contract_count`, `ortho_status_code`, `patient_last_name`, `row_id` | | | | - |

Grouping: office when multi-office; optional status / provider. Page break: `none`, `group`. Summary cards: `Patients`,
`Average months in treatment`, `Past planned end`. Reconciliation (`reconciles_with`): row count equals
`ortho_active_patients` when status is `all`, both ranges are blank and `include_inactive_contracts = false` (fixture test).

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Patients by status (bar) and a months-in-treatment histogram (6-month bins) |
| Patient name | `record` patient -> `/patient/:id/overview` |
| Ortho Start Date | `record` -> `/patient/:id/payment-plan/ortho` |
| Last Visit | `report` `ortho.ortho_daily_journal` with `patient_ids`, `date_from = ortho_start_date`, `date_to = today` |
| Status group count | `rows` filtered to the status |

### Actions

Row: open patient, open contract, book next visit (Scheduler hand-off). Bulk: create task, letters (for example a
progress letter), export selection. Not a worklist.

### Export and print

PDF `banded_table`, portrait (9 columns), criteria echo footer (offices, start range, last-visit range, statuses). XLSX:
sheet `Ortho Status`, one row per patient, status label as a column. CSV: same. No background need.

### Open questions

| # | Question |
|---|---|
| Q1 | Whether blank is the true default of the four dates (the capture may show cleared criteria) |
| Q2 | Ortho status value list; whether the report groups by status |
| Q3 | Rounding of Time in Treatment (whole months floored assumed) |
| Q4 | Whether finished (debonded) patients are listed (F6) |
| Q5 | Whether the criteria filter exactly the three printed values (supplement, unresolved) |

## Ortho Report - `ortho.ortho_report`

Ortho Reports, screenshot `4.PNG` - P3 - S - right family `ortho` - cost_class interactive - legacy output confidence DOCUMENTED (vendor field list, no image)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Ortho coordinator, treatment coordinator | Daily / monthly (starts of the day or month) | List of patients who recently started ortho treatment; welcome calls, start checklists |
| Same | On demand | Find patients with an ortho visit who have not started treatment (vendor second use): blank ORTHO START DATE, set PATIENT FIRST VISIT |

### Legacy output

Vendor field list ([R56], DOCUMENTED, no image): `Pat ID`, `Pat Name`, `DOB`, `Cell Phone`, `Email`, `Ortho Status`,
`Ortho Start Date`, `First Visit` (first Ortho Treatment Card entry), `Last Visit` (last Ortho Treatment Card entry),
`Next Appt` (next scheduled appointment). Grouping, totals, sort, title: not stated. Kept: vendor column set; decided
default sort `ortho_start_date`, then patient name [I].

Quirk: both ranges default to today, so the default run lists only patients whose contract starts today **and** whose first
ortho visit is today [I] (04 open item "Two ortho ranges"); kept as the legacy default.

### Parameters - legacy parity

<!-- PARITY:ortho_reports.r04 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot |
| OFFICE/GROUP `Office` (default) / `Office Group` | Contracts whose office is in the resolved set |
| ORTHO START DATE Start / End (default today / today) | `ortho_start_date BETWEEN` (inclusive); blank boxes = no restriction; contracts without a start drop out when a bound is set |
| PATIENT FIRST VISIT Start / End (default today / today) | `first_ortho_visit_date BETWEEN`; blank = no restriction; patients without any visit drop out when a bound is set |
| ORTHO STATUS `ALL` (default) / narrowed | No predicate / `ortho_status_code IN (...)` |

Dependency rules: none. Ranges combine with AND [I]. "Visit but not started" = a contract with a first visit and
`ortho_start_date IS NULL` (every `ortho_visits` row belongs to a contract in the DATA-42 schema, so a patient with a visit
always has a contract row) - reached with the start range blank and the enhancement `ortho_start_missing_only`.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `provider_ids` | `entity_multi` (contract provider) | `all` | Starts per orthodontist |
| `ortho_start_missing_only` | `boolean` (NEW) | `false` | Contracts with visits and no start date (vendor second use, explicit) |
| `next_appointment_filter` | `enum` (NEW): `all`, `with_next_appointment`, `without_next_appointment` | `all` | New starts without a booked follow-up |
| `group_by` | `enum`: `none`, `provider`, `ortho_status` | `none` | Starts per provider |
| `compare_to` | comparison period (filter card 12, P4) | `none` | Starts count of the previous period in the summary card |
| Saved view "Starts this month" | saved view | - | `ortho_start_date_preset = this_month`, first-visit range blank |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ortho_contracts` (`ortho_start_date`, `ortho_status_code`, `first_ortho_visit_date` NEW, `last_ortho_visit_date`, `office_id`, `provider_id`); `rpt_patient_activity.next_appointment_date`; `rpt_patient_dim` |
| Date bases | Attribute ranges `ortho_start_date`, `ortho_first_visit_date` (filter card 3.3; never the practice first visit `rpt_patient_activity.first_visit_date`) |
| Contract per patient | Latest ortho start; for `ortho_start_missing_only` the contract without a start |
| Availability | **SCHEMA(42)** (first visit and status need `ortho_visits` and `ortho_status_code`). Interim: first / last visit from `is_ortho_code` charges (contract billing excluded), status empty |
| Migrated history | None |

### Output

Block `main`, grain patient.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `patient_id` | Pat ID | `id` | `phi_identified` | - |
| `patient_name` | Pat Name | `text` | `phi_identified` | count per office and grand total |
| `dob` | DOB | `date` | `phi_identified` | - |
| `cell_phone` | Cell Phone | `text` | `phi_identified` | - |
| `email` | Email | `text` | `phi_identified` | - |
| `ortho_status_label` | Ortho Status | `enum` | `phi_identified` | - |
| `ortho_start_date` | Ortho Start Date | `date` | `phi_identified` | - |
| `first_ortho_visit_date` | First Visit | `date` | `phi_identified` | - |
| `last_ortho_visit_date` | Last Visit | `date` | `phi_identified` | - |
| `next_appointment_date` | Next Appt | `date` | `phi_identified` | count of empty (label `Without next appt`, enhancement) |
| `provider_short_id` | Provider | `text` | `aggregate` | - (enhancement) |
| `total_ortho_amt` | Contract Amount | `money` | `financial_patient` | sum (enhancement, hidden by default) |
| hidden: `ortho_plan_id`, `office_id`, `provider_id`, `patient_last_name`, `row_id` | | | | - |

Sort: `ortho_start_date` asc, patient last name, `row_id`. Page break: `none`, `office`. Summary cards: `Starts` (count),
`Without next appointment`. Reconciliation: with the first-visit range blank and status `all`, the count equals
`ortho_starts` for the same office set and start range (fixture test, RPT-ORTHO-07).

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Starts per week or month (column) when the start range spans more than one month |
| Patient name | `record` patient -> `/patient/:id/overview` |
| Ortho Start Date | `record` -> `/patient/:id/payment-plan/ortho` |
| Next Appt | `record` appointment in the Scheduler (appointment right) |
| First / Last Visit | `report` `ortho.ortho_daily_journal` with `patient_ids` and the visit date |

### Actions

Row: open patient, open contract, book next visit when `Next Appt` is empty. Bulk: welcome text / e-mail (`send_sms`,
`send_email` with consent exclusions), letters (welcome packet), create task, export selection. Usable as a short
"new start follow-up" worklist through `next_appointment_filter = without_next_appointment`.

### Export and print

PDF `banded_table`, landscape (10 columns), criteria echo footer (offices, both ranges, statuses). XLSX sheet `Ortho
Report`, one row per patient. CSV. No background need.

### Open questions

| # | Question |
|---|---|
| Q1 | How the two ranges combine and whether patients without a start date are listed by default |
| Q2 | Whether `Next Appt` is any next appointment or only an ortho appointment |
| Q3 | Ortho status value list |
| Q4 | Default sort and any totals of the legacy print |

## Missing Ortho Visits - `ortho.missing_ortho_visits`

Ortho Reports, screenshot `5.PNG` - P3 - M - right family `ortho` - cost_class interactive (background above a 92-day span) - legacy output confidence DOCUMENTED (vendor field list, no image)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Ortho assistant, office manager | End of day (default today / today) | Audit, like Daily Audit and Missing Progress Notes: every ortho patient with an appointment should have an ortho visit on the card **and** a ledger entry; fix the gaps before close |
| Billing | Month end | Ortho visit codes not posted (lost visit counts, contract billing questions) |

### Legacy output

Vendor field list ([R56], DOCUMENTED, no image), grain one row per appointment: `Appt Date`, `Pat ID`, `Pat Name`,
`Last Visit` (the patient's **general** last visit, not the last ortho visit), `Ortho Status`, `Provider` (provider on the
appointment), `Visit Provider` (provider on the ortho visit), `Ledger Transaction` (Yes / No for the appointment date),
`Ortho Visit` (Yes / No for the appointment date). Grouping, totals and sort: not stated.

Quirk (documented): saving an ortho visit auto-posts the configured `Ortho Visit Code` (`offices.ortho_visit_code`), so a row
with Ledger `No` and Visit `Yes` points at configuration (no visit code) or a deleted transaction. Kept, and explained in
the help text of the report.

### Parameters - legacy parity

<!-- PARITY:ortho_reports.r05 -->

| Legacy option | Effect on the result |
|---|---|
| MISSING `Ledger Transaction` ticked (default) | Appointments with no live charge for the patient in the appointment office on the appointment date qualify [I] |
| MISSING `Ortho Visit` ticked (default) | Appointments with no `ortho_visits` row for the patient on that date in that office qualify [I] |
| Both ticked (default) | Rows missing at least one of the two (OR); `Yes` / `No` columns show which |
| One ticked | Only that gap qualifies; the other column is still printed |
| None ticked | Not allowed (`min_items` 1, 422 `invalid_parameter`) |
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot |
| OFFICE/GROUP `Office` (default) / `Office Group` | Appointments whose `rpt_appointment_facts.office_id` is in the set |
| APPOINTMENT PROVIDER `ALL` (default) / narrowed | No predicate / `rpt_appointment_facts.provider_id IN (...)` |
| APPOINTMENT DATE RANGE Start / End (default today / today) | `appointment_date BETWEEN`, inclusive, office-local |
| VISIT DOCTOR `ALL` (default) | No predicate |
| VISIT DOCTOR narrowed | Keeps appointments whose same-day ortho visit was charted by one of the doctors; appointments without a visit drop out [I] |

Dependency rules: none on the screen. Form hint (not a rule): when `visit_doctor_ids` is narrowed and `ortho_visit` is
ticked, the form says that missing-visit rows cannot match a visit doctor.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `ortho_status_codes` | `entity_multi` | `all` | Restrict by contract status |
| `group_by` | `enum`: `none`, `appointment_provider`, `appointment_date` | `none` | Provider band with counts of each gap |
| `sort_by` | `enum`: `appointment_date`, `patient_last_name`, `appointment_provider` | `appointment_date` [I] | Order |
| `exclude_resolved` | `boolean` (NEW, needs DASH-28) | `false` | Hide rows already marked resolved in the worklist |
| Presets | `date_preset` | `today` | `yesterday`, `this_week`, `month_to_date` |

### Data

| Item | Rule |
|---|---|
| Function | `rpt_ortho_visit_audit(p_tenant_id, p_office_ids, p_date_from, p_date_to)` (NEW, owner 03, twin of `rpt_appointment_note_audit()`): one row per live appointment (`NOT is_block AND NOT is_deleted`, `status_class NOT IN ('cancelled', 'no_show')`, archive excluded) of an ortho patient (`rpt_patient_dim.is_ortho_patient`) in the range, with `has_ledger_transaction`, `has_ortho_visit`, `visit_provider_ids` evaluated same patient, same office, same day |
| Ledger test | `EXISTS` live `rpt_charges` row with `is_ledger_code` on `service_date = appointment_date` in the office [I]. Not the Daily Audit visit-code rule: the ortho visit code is usually zero-fee and may not be flagged `is_visit_code` |
| Visit test | `EXISTS` `ortho_visits` row on `visit_date = appointment_date` in the office (DATA-42) |
| Future appointments | Appointments after the office's today are excluded and the run warns `future_appointments_excluded` [I] (they would always show both gaps) |
| General last visit | `rpt_patient_activity.last_visit_date` (DATA-19) |
| Status | `rpt_ortho_contracts.ortho_status_code` of the patient's latest contract |
| Availability | **SCHEMA(42)**: the `Ortho Visit` test and `Visit Provider` need `ortho_visits`; no interim (the visit cannot be told apart from the ledger line) |
| Migrated history | Appointments and charges were migrated, ortho visits were not: a pre-go-live range would show every appointment as visit-missing, so the date range is limited to dates on or after the tenant's ortho go-live (`rpt_tenant_settings.ortho_visits_since`, NEW) with a warning |

### Output

Block `main`, grain appointment.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_date` | Appt Date | `date` | `phi_identified` | - |
| `patient_id` | Pat ID | `id` | `phi_identified` | - |
| `patient_name` | Pat Name | `text` | `phi_identified` | count of rows per group and grand total |
| `last_visit_date` | Last Visit | `date` | `phi_identified` | - |
| `ortho_status_label` | Ortho Status | `enum` | `phi_identified` | - |
| `appointment_provider_short_id` | Provider | `text` | `aggregate` | - |
| `visit_provider_short_id` | Visit Provider | `text` | `aggregate` | - |
| `has_ledger_transaction` | Ledger Transaction | `boolean` (labels Yes / No) | `phi_identified` | count of `No` (label `Missing ledger`) |
| `has_ortho_visit` | Ortho Visit | `boolean` (labels Yes / No) | `phi_identified` | count of `No` (label `Missing visit`) |
| hidden: `appointment_id` (`row_id`), `office_id`, `appointment_provider_id`, `ortho_plan_id`, `patient_last_name` | | | | - |

Grouping: office when multi-office; optional provider or date. Page break: `none`, `group`, `office`. Summary cards:
`Appointments listed`, `Missing ledger`, `Missing visit`. Related metric (not reconciled, different grain):
`ortho_missing_visit_patients`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Stacked bar per appointment provider: missing ledger / missing visit / both |
| Patient name | `record` patient -> `/patient/:id/overview` |
| Ledger Transaction `No` | `record` -> `/patient/:id/transaction` (post the visit code; transactions right) |
| Ledger Transaction `Yes` | `record` -> `/patient/:id/ledger` at the date |
| Ortho Visit `Yes` | `report` `ortho.ortho_daily_journal` with `patient_ids` and `date_from = date_to = appointment_date` |
| Appt Date | `record` appointment in the Scheduler |
| Provider group counts | `rows` filtered to the group |

### Actions

Row: open patient, open appointment, post transaction, create task ("chart ortho visit" assigned to the visit provider or
the appointment provider). Bulk: create tasks, export selection. Doubles as a worklist (daily close checklist); worklist
mode with resolve / snooze is RPT-ORTHO-17.

### Export and print

PDF `banded_table`, landscape (9 columns), criteria echo footer (missing items, offices, appointment providers, visit
doctors, date range). XLSX sheet `Missing Ortho Visits`, Yes / No as text cells. CSV. Background above a 92-day span.

### Open questions

| # | Question |
|---|---|
| Q1 | How the MISSING ticks select rows (OR across ticked items assumed) - supplement, unresolved |
| Q2 | Whether "ledger transaction" means any ledger line or only the ortho visit code / a visit code |
| Q3 | Which appointments are tested: cancelled, no-show, future, non-ortho appointments of an ortho patient |
| Q4 | Whether VISIT DOCTOR filters only rows that have a visit (assumed) |
| Q5 | Whether "ortho patient" is the patient flag or an active contract |

<!-- WORK-ITEMS -->
| RPT-ORTHO-10 | Definition `ortho.ortho_compliance_report`: population rule, weeks threshold, no-visit contracts, interim last-visit rule, columns, sorts, actions | P3 | M | RPT-ORTHO-01, RPT-ORTHO-02, DATA-19, DATA-42 | Fixture: an active contract with a visit 7 weeks ago and no future appointment is listed at threshold 6 and not at 8; the same patient with a future appointment is not listed; a debonded contract is never listed |
| RPT-ORTHO-11 | Ortho Compliance worklist mode: live paging, follow-up columns, `exclude_followed_up_within_days`, booking hand-off | P3 | S | RPT-ORTHO-10, DASH-28, DASH-30, ENG-48 | Booking an appointment from the row removes the patient at the next refresh; a logged follow-up hides the row for the chosen days |
| RPT-ORTHO-12 | Definition `ortho.ortho_daily_journal` on `rpt_ortho_visits` with the `journal` PDF layout | P3 | M | RPT-ORTHO-02, ENG-24, ENG-27, DATA-42 | Fixture day with three visits prints three rows under one date band in vendor column order; Procedures lists the auto-posted visit code; `clinical` columns are absent for a caller without the class |
| RPT-ORTHO-13 | Ortho Daily Journal interim mode on `rpt_charges` (until `ortho_visits` exists) with warning `ortho_visit_card_fields_unavailable` | P3 | S | RPT-ORTHO-12, DATA-04 | A patient-day with D8670 and D8080 charges is one row with both codes; contract-billing charges are not rows; the warning prints in the criteria block |
| RPT-ORTHO-14 | Definition `ortho.patients_by_ortho_status_with_time_in_treatment` | P3 | S | RPT-ORTHO-02, RPT-ORTHO-03 | Default run (all blank, status all) lists every contract in scope once per patient; a contract started 14 months and 20 days ago shows 14; status filter drops NULL statuses |
| RPT-ORTHO-15 | Definition `ortho.ortho_report` with both attribute ranges, start-missing enhancement and next appointment | P3 | S | RPT-ORTHO-02, DATA-19 | Default today/today lists only a contract starting today with a first visit today; start range blank + `ortho_start_missing_only` lists the contract with visits and no start; count equals `ortho_starts` with the first-visit range blank |
| RPT-ORTHO-16 | Function `rpt_ortho_visit_audit()` (request to 03) and definition `ortho.missing_ortho_visits` | P3 | M | RPT-ORTHO-02, DATA-16, DATA-19, DATA-42, ENG-59 | Fixture: appointment with visit and charge is not listed; with charge only shows Visit `No`; with visit and deleted charge shows Ledger `No`; cancelled and future appointments are not listed; only-ledger tick hides the visit-only gap |
| RPT-ORTHO-17 | Missing Ortho Visits row actions and worklist mode (post transaction, chart visit task, resolve / snooze) | P3 | S | RPT-ORTHO-16, ENG-49, DASH-28 | Posting the visit code from the row and re-running removes the Ledger `No`; a resolved row is hidden with `exclude_resolved` |
<!-- /WORK-ITEMS -->
