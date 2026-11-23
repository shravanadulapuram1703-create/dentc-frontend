# Ortho Reports - report specifications

Orthodontic case control: visits recorded on the ortho treatment card, appointments that left no visit or ledger trace,
patients without a next appointment, new starts and time in treatment. Hub home: Clinical › Ortho, route
`/reports/c/ortho` (brief section 1, 07 section 2). Default phase P3; all five reports ship in P3, together with DATA-42.

## Overview

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `ortho.ortho_compliance_report` | Ortho Compliance Report | Patients with an active ortho contract, no future appointment and no ortho visit for N weeks (default 6) | P3 | M | APP for the contract list (contracts exist only in the app); SCHEMA(42) for the 'active' population (`contract_status`) and visit-based weeks | PARTIALLY DOCUMENTED (purpose; columns INFERRED) |
| `ortho.ortho_daily_journal` | Ortho Daily Journal | Every ortho-card visit in a visit-date range: doctor, assistant, archwires, procedures, compliance, hygiene, elastics, appliance | P3 | M | SCHEMA(42) (interim: ortho-code charges without the card fields) | DOCUMENTED (vendor field list, no image) |
| `ortho.patients_by_ortho_status_with_time_in_treatment` | Patients by Ortho Status with Time in Treatment | Ortho patients with status, start date, last ortho visit and months in treatment as of today | P3 | S | SCHEMA(42) | DOCUMENTED (vendor field list, no image) |
| `ortho.ortho_report` | Ortho Report | Patients who started ortho (start-date range) and their first / last ortho visit and next appointment | P3 | S | SCHEMA(42) | DOCUMENTED (vendor field list, no image) |
| `ortho.missing_ortho_visits` | Missing Ortho Visits | Audit: ortho patients' appointments without an ortho visit and / or a ledger transaction on the appointment date | P3 | M | SCHEMA(42) | DOCUMENTED (vendor field list, no image) |

Size covers the definition, its builder, tests and the layout checklist, not the shared data work (DATA-42).

## Shared rules

### Three clocks, one patient

The legacy reports read three sources (research section 1 item 13, section 8 item 14). DentC binds each to one dataset
column; none of the three exists for migrated history (no ortho contract, plan, instalment or visit was migrated:
`rpt_ortho_contracts` era caveat, data card 2.25).

| Legacy concept | Legacy source | DentC column | Exists today |
|---|---|---|---|
| `Ortho Start Date` | ortho contract (payment plan) start | `rpt_ortho_contracts` ortho start = `coalesce(banding_date, treat_start_date)` (03 section 2.25); output column `ortho_start_date` (NEW computed column, see work item RPT-ORTHO-02) | app-era contracts only (`ortho_plans`) |
| `Ortho Status` | newest ortho treatment plan on the Ortho Treatment Card | `rpt_ortho_contracts.ortho_status_code` (DATA-42 puts the status on the contract; DentC has no separate ortho clinical plan) | NULL until DATA-42 |
| `Last Visit` / `First Visit` (ortho) | Ortho Treatment Card entries | `ortho_visits.visit_date` (DATA-42): last = `rpt_ortho_contracts.last_visit_date`, first = NEW `first_ortho_visit_date` | interim: charges with `is_ortho_code AND NOT is_contract_billing` |
| `Last Visit` (general, Missing Ortho Visits only) | patient's last visit | `rpt_patient_activity.last_visit_date` | yes (DATA-19) |
| `Next Appt` / "no future appointment" | scheduler | `rpt_patient_activity.next_appointment_date` (first live appointment on or after the office's today, not cancelled / no-show; 03 section 2.19) | yes |
| `Time in Treatment` | months from start to the current date | `rpt_ortho_contracts.months_in_treatment` (whole months by `age()`, as of the office's today); rounding rule of the legacy tool not stated | app-era contracts |

Contract selection: one row per patient on the patient-grain reports (r01, r03, r04). When a patient has more than one
contract in scope, the contract with the latest ortho start is used and `contract_count` is carried as a hidden column [I].

Two different flags, never mixed: `ortho_plans.is_active = false` is the **soft delete** (data card, delete-flag table:
excluded on every grain and every report); treatment state is `contract_status` (DATA-42: `active`, `debonded`,
`retention`). Until `contract_status` exists, "in treatment" is approximated as `coalesce(debond_date, treat_end_date) IS
NULL OR coalesce(debond_date, treat_end_date) >= local_today` and the run warns `ortho_contract_status_unavailable`. r03
also needs finished contracts and therefore asks 03 for `contract_status` on the non-deleted grain (RPT-ORTHO-02).

Columns this family uses beyond the data card (all NEW):

| Column | Kind | Definition | Owner |
|---|---|---|---|
| `rpt_ortho_contracts.ortho_start_date` | dataset column | `coalesce(banding_date, treat_start_date)` | 03 section 2.25, via RPT-ORTHO-02 |
| `rpt_ortho_contracts.first_ortho_visit_date` | dataset column | min `ortho_visits.visit_date` of the contract (interim: first `is_ortho_code AND NOT is_contract_billing` charge) | 03 section 2.25, via RPT-ORTHO-02 |
| `rpt_ortho_contracts.contract_status` | dataset column | `ortho_plans.contract_status` (DATA-42) | 03 section 2.25, via RPT-ORTHO-02 |
| `rpt_ortho_contracts.months_to_debond` | dataset column | whole months of `age(debond_date, ortho_start_date)`; NULL without a debond date | 03 section 2.25, via RPT-ORTHO-02 |
| `contract_count` | definition-level computed column | count of the patient's non-deleted contracts in scope | report definition |
| `ortho_status_label` | definition-level computed column | label of `ortho_status_code` joined on `lookup:ortho_statuses` | report definition |

The ortho last visit is always `rpt_ortho_contracts.last_visit_date` (output key `last_visit_date`, label `Last Visit`); it
is never the general `rpt_patient_activity.last_visit_date`, except on r05, where the vendor prints the general one.

### Shared parameters and defaults (from the parity file; sections do not repeat them)

| Parameter | Type | Reports | Default | Rule on this family |
|---|---|---|---|---|
| `output_format` | `enum` | all 5 | `pdf` | PDF -> `pdf`, Excel -> `xlsx`, added `csv`; `role: output`; never changes rows |
| `office_scope` | `office_scope` | all 5 | `working_office` (legacy `108` = working office) | Office -> `office_ids`, Office Group -> `office_group_id`. Attribution per report: contract office (r01, r03, r04), visit office (r02), appointment office (r05) |
| `provider_ids` | `entity_multi` | r01, r02 | `all` | r01: contract provider `rpt_ortho_contracts.provider_id` (`ortho_plans.pref_provider_id`) [I]; r02: visit doctor `ortho_visits.visit_provider_id` [I]. Roster-first list, never scoped by `providers.office_id` |
| `appointment_provider_ids`, `visit_doctor_ids` | `entity_multi` | r05 | `all` | `provider_role` `appointment` / `ortho_visit` (filter card 3.2) |
| `date_range` (`date_from`, `date_to`) | `date_range` | r02, r05 | `today` / `today` | Fixed basis: `ortho_visit_date` (r02), `appointment_date` (r05); no `date_basis` parameter |
| `ortho_start_date` | `date_range` (attribute) | r03, r04 | blank (r03), `today` / `today` (r04) | Blank = no restriction |
| `ortho_last_visit_date`, `ortho_first_visit_date` | `date_range` (attribute) | r03 / r04 | blank / `today` | Ortho-card visits, never the general visit |
| `ortho_status_codes` | `entity_multi` | r03, r04 | `all` | `lookup:ortho_statuses` (NEW, FLT-09); a list drops contracts without a status |
| `weeks_since_last_visit` | `integer` | r01 | `6` | `validation.min` 0, `max` 520 |
| `missing_items` | `enum_multi` | r05 | both ticked | members `ledger_transaction`, `ortho_visit`; `predicate`, `min_items` 1 |

Footer actions on every report: CLEAR CRITERIA -> reset to defaults (frontend), PRINT / PREVIEW -> `print`, ADD TO MY
FAVORITES -> `saved_view` (one favorite saved view per caller and report). The index lists no dynamic rule and no greyed
control for this category.

### Date bases, attribution, scope

| Topic | Rule |
|---|---|
| Date basis | `ortho_visit_date` = `ortho_visits.visit_date` (office-local date, entered); `appointment_date` = `rpt_appointment_facts.appointment_date`; attribute ranges compare office-local `DATE` columns, inclusive (AD-9). "As of" figures (weeks since last visit, months in treatment, next appointment) use the office's local today (`rpt_office_dim.local_today`) of the contract's office |
| Office | Contract office `rpt_ortho_contracts.office_id`; visit office `ortho_visits.office_id`; appointment office `rpt_appointment_facts.office_id`. A NULL office is "Unassigned office" (data card 5.1 rule 3). Patient home office is never the filter on this family [I] |
| Provider | Declared per report in `scope.provider_attribution`: `ortho_contract` (r01, NEW role), `ortho_visit` (r02, r05 Visit Doctor), `appointment` (r05). `scope.provider_restriction = none` on r03 and r04 (no provider control); `self_unless_privileged` is not applied to this family (it is not My Reports, PD-11) |
| Patient population | Ortho patient = a patient with a non-deleted `ortho_plans` row in scope (r01, r03, r04) or `rpt_patient_dim.is_ortho_patient` (r05: tag rule or active contract, data card 3.5) |
| Freshness | `live` (views over OLTP tables) |
| Migrated history | None: zero contracts and zero ortho visits were migrated. `availability[]` entry `ortho_app_era_only` is printed in the criteria block of every run: "Ortho contracts and visits exist only for data created in DentC" |

### Page furniture

Legacy (category-wide, research 3.2; no ortho sample exists, so this is inferred from sibling categories [I]): line 1
organisation name, line 2 printed title (legacy menu name; ortho printed titles were never seen), `Office : <name>` band
per office, footer criteria echo (`Offices`, `Providers`, date ranges, status list, weeks threshold, missing items),
`Printed : <date time>`, `Page : n of m`. DentC: `pdf.criteria_echo = footer`, `repeat_header = true`, letterhead = office
logo of the working office, `xlsx.criteria_sheet = true`, `fixed_outer` office level `when ["ctx", "multi_office"]`.

### Rights and data classes

| Item | Rule |
|---|---|
| Right family | `ortho`: `reports_ortho_reports_view_only` (run, view, drill, private views) / `reports_ortho_reports_access_full_control` (also print, PDF; XLSX and CSV need `reports_export_data_files` in addition). No per-report override |
| Key columns | `patient_name`, `patient_id` (`phi_identified`): a caller without `phi_identified` is refused (403 `data_class_denied`); every report of the family is a patient list |
| `phi_identified` | patient id, chart no, name, DOB, cell phone, e-mail, appointment date, visit date, ortho start date, first / last visit, next appointment, ortho status, procedures posted, archwires, elastics, appliance, time in treatment |
| `clinical` | `compliance_code`, `oral_hygiene_code` (clinical assessments), visit notes (free text, rule 4); dropped for callers without the class, the row stays |
| `financial_patient` | contract amounts and remaining-to-bill columns added as enhancements (rule 2) |
| `aggregate` | provider short id and name, assistant username (operational labels without money, rules 3 and 12), office name, counts in group headers |
| Drill to records | `patient` record targets need `phi_identified` and the target feature's right (ortho payment plan screen: payment-plan right; ledger: ledger right), checked by `assert_patient_visible()` |

### Family-wide enhancements (on top of filter card section 12)

| Enhancement | Key / type | Detail |
|---|---|---|
| Contract provider filter where the legacy screen has none | `provider_ids` (`entity_multi`, default `all`) | r03, r04; default keeps the legacy run |
| Status filter on the reports that lack it | `ortho_status_codes` (`entity_multi`, default `all`) | r01, r05 |
| Outreach bulk actions | `send_sms`, `send_email`, `letters`, `create_task` (02 section 3.10) | r01, r04, r05: consent exclusions from `rpt_patient_dim.no_auto_sms`, `no_auto_email`, `no_correspondence` |
| Book next visit | row action `navigate` to the Scheduler booking hand-off (`openSchedulerForBooking`) with patient and contract provider | r01, r03, r04 |
| Saved views with relative dates | e.g. Ortho Report "Starts this month" (`ortho_start_date_preset = this_month`, first-visit range blank) | stored server-side (ENG-28) |
| Ortho dashboard drills | metric drills of `dashboards.ortho` (06 section 2.13) open these reports with the parameters of the tile | RPT-ORTHO-07 |

### Family-wide open questions

| # | Question | Where to check |
|---|---|---|
| F1 | Ortho status value list (ORTHO STATUS picker) | live legacy picker dialog; seeds `ortho_statuses` |
| F2 | Printed titles, column order, grouping and totals of all five reports (no image exists) | print each report once on the live tool |
| F3 | Whether a sixth "Ortho revenue report" exists in some builds (vendor blog 2022) | live report list of a tenant with ortho |
| F4 | Content of the SELECT dialogs (provider, appointment provider, visit doctor, office group, ortho status): inactive rows, short id or name | live dialogs |
| F5 | `Ortho Start Date` = treatment start, banding date or plan setup date (03 uses `coalesce(banding_date, treat_start_date)`, 04 names `treat_start_date`) | compare one contract on the live tool; then align 03 and 04 |
| F6 | Product: whether patients with a finished contract (debonded, retention) belong on r03 (assumed yes once `contract_status` exists) | product owner |

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

<!-- PARITY:ortho_reports.r01:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in; default token working_office. On this report the office attribution is the contract office (rpt_ortho_contracts.office_id = ortho_plans.office_id), not the patient's home office and not the office of the last visit [I]. A contract with a NULL office_id is the member 'Unassigned office' (03 section 5.1 rule 3). Selection becomes exactly one of office_ids / office_group_id / office_group_ids; all = every office the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL) becomes a searchable multi-select; ALL = no restriction. Provider role on this report: the contract provider rpt_ortho_contracts.provider_id (ortho_plans.pref_provider_id, provider_role 'ortho_contract', NEW role for 04) [I]: the vendor names no provider column for this report. Alternative to confirm on the live tool: provider of the last ortho visit. Never scoped by providers.office_id; roster-first list. |
| NUMBER OF WEEKS SINCE LAST VISIT | (no label) (number_input) | shown: 6 | `weeks_since_last_visit` | integer | - | `6` | replicated | Threshold in whole weeks, validation min 0, max 520. Inferred semantics (not documented): a row qualifies when the contract is not soft-deleted (ortho_plans.is_active = true, applied on every grain) and is in treatment (contract_status = 'active', NEW column from DATA-42; until then approximated as coalesce(debond_date, treat_end_date) IS NULL OR >= the office's local today, with warning ortho_contract_status_unavailable), the patient has no live appointment on or after the office's today (rpt_patient_activity.next_appointment_date IS NULL; cancelled / no-show excluded), and weeks_since_last_visit >= threshold, where last visit = rpt_ortho_contracts.last_visit_date (last ortho_visits row of the contract after DATA-42; before: last charge with is_ortho_code AND NOT is_contract_billing, change requested in RPT-ORTHO-02). A contract with no visit at all is listed (weeks shown blank, flagged 'no visit'). Confirm on the live tool: which last visit, >= or >, whether a same-day appointment counts as future, and whether patients with a future appointment are excluded regardless of weeks. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:ortho_reports.r01:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot (`pdf` / `xlsx`; `csv` added). Rows unchanged |
| OFFICE/GROUP `Office` (default, working office) | `office_ids`: contracts whose `rpt_ortho_contracts.office_id` is in the set; one `Office :` band per office when more than one |
| OFFICE/GROUP `Office Group` | `office_group_id`: every office of the group, banded per office |
| PROVIDER `ALL` (default) | No provider predicate |
| PROVIDER narrowed | `rpt_ortho_contracts.provider_id IN (:provider_ids)` (contract provider [I]); contracts without a provider drop out |
| NUMBER OF WEEKS SINCE LAST VISIT `6` (default) | Keeps contracts with `weeks_since_last_visit >= 6` (or no visit at all) [I] |
| NUMBER OF WEEKS SINCE LAST VISIT other value `n` | Same test with `n`; `0` lists every active contract without a future appointment |
| (hidden population rule, no control) | Not soft-deleted (`is_active`) AND in treatment (`contract_status = 'active'` after DATA-42; before: `coalesce(debond_date, treat_end_date)` NULL or on / after local today, warning `ortho_contract_status_unavailable`) AND `rpt_patient_activity.next_appointment_date IS NULL` (no live appointment on or after the office's today, cancelled and no-show excluded) |

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
| Datasets | `rpt_ortho_contracts` (contract, `office_id`, `provider_id`, `ortho_status_code`, `debond_date`, `treat_end_date`, `months_in_treatment`, `months_remaining`, `is_past_planned_end`, `last_visit_date`, `weeks_since_last_visit`, NEW `ortho_start_date`, NEW `contract_status`); `rpt_patient_activity` (`next_appointment_date`, `last_appointment_date`); `rpt_patient_dim` (`chart_no`, names, `cell_phone`, `email`, `no_auto_sms`, `no_auto_email`, `no_correspondence`); `rpt_provider_dim` (provider short id, name) |
| Date basis | None (as of the office's today). `weeks_since_last_visit` = floor((local today - `last_visit_date`) / 7) |
| Last visit | `rpt_ortho_contracts.last_visit_date`. After DATA-42: `max(ortho_visits.visit_date)` per contract (`ortho_plan_id`). Before: the 03 section 2.25 lateral today reads every `is_ortho_code` charge, contract-billing instalments included; RPT-ORTHO-02 asks 03 to change it to `c.is_ortho_code AND NOT c.is_contract_billing`, so an instalment posting never resets the weeks |
| Contract per patient | Latest ortho start among the patient's in-treatment contracts in scope; `contract_count` (NEW, definition level) hidden |
| Office / provider | Contract office; contract provider (`ortho_plans.pref_provider_id`) |
| Filters | `office_scope` -> `office_id IN`; `provider_ids` -> `provider_id IN`; `weeks_since_last_visit` -> `(weeks_since_last_visit >= :n OR last_visit_date IS NULL)` on the dataset column; population rule -> `is_active` AND in treatment AND `next_appointment_date IS NULL` |
| Availability | Coverage matrix: **APP** for the contract list (contracts are app-era only); the 'active' population needs `contract_status` and visit-based weeks need `ortho_visits` (both **SCHEMA(42)**). Before DATA-42 the in-treatment approximation and the interim last-visit rule apply, with warnings `ortho_contract_status_unavailable` and `ortho_last_visit_from_charges` |
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
| `last_visit_date` | Last Visit | `date` | `phi_identified` | `null_display` "No visit recorded" |
| `weeks_since_last_visit` | Weeks | `integer` | `phi_identified` | max per office (label `Longest gap`) |
| `last_appointment_date` | Last Appt | `date` | `phi_identified` | - (enhancement, default visible) |
| `treat_end_date` | Planned End | `date` | `phi_identified` | - (enhancement, default hidden) |
| `is_past_planned_end` | Past Planned End | `boolean` | `phi_identified` | count of true (enhancement) |
| `provider_short_id` | Provider | `text` | `aggregate` | - |
| hidden: `ortho_plan_id`, `office_id`, `provider_id`, `contract_count`, `row_id` | | | `phi_identified` / `aggregate` | - |

Grouping: `fixed_outer` office when multi-office; optional `provider` level. Sort: `weeks_desc` = `weeks_since_last_visit`
desc nulls first, then `patient_last_name` (hidden), `row_id`. Page break: `page_break_by` `none` / `office` (layout,
enhancement). Summary cards: `Patients listed` (count), `Past planned end` (count). Related metrics (not reconciled):
`ortho_missing_visit_patients` (same idea; its threshold `ortho_visit_interval_weeks` plays the role of the
`weeks_since_last_visit` parameter, but it ignores future appointments) and `ortho_active_no_appointment_pct` (no weeks test).

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
| Q5 | Whether an unconfirmed appointment, or one cancelled later, counts as "future appointment" (we use live, not cancelled / no-show), and whether a same-day appointment counts as future (we use on or after the office's today) |

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

<!-- PARITY:ortho_reports.r02:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in; default token working_office. Office attribution on this report: the office of the ortho visit (ortho_visits.office_id, DATA-42); interim before DATA-42: office of service of the ortho-code charge (rpt_charges.office_id). |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog becomes a searchable multi-select; ALL = no restriction. Provider role on this report: the visit doctor (ortho_visits.visit_provider_id, provider_role 'ortho_visit', same column as visit_doctor_ids) [I]: the vendor prints this provider as 'Doctor'; that PROVIDER filters it is not stated (supplement, unresolved). Interim before DATA-42: rpt_charges.provider_id of the ortho-code charge. Never scoped by providers.office_id. |
| VISIT DATE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range. This legacy section fixes date_basis = ortho_visit_date (no basis radio). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| VISIT DATE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range. This legacy section fixes date_basis = ortho_visit_date (no basis radio). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:ortho_reports.r02:END -->

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
| Datasets | `rpt_ortho_visits` (NEW view over `ortho_visits`, DATA-42; requested in RPT-ORTHO-02): `visit_id`, `ortho_plan_id`, `patient_id`, `office_id`, `visit_date`, `visit_provider_id`, `assistant_user_id`, `upper_archwire`, `lower_archwire`, `compliance_code`, `oral_hygiene_code`, `elastics`, `appliance`, `notes`, `charge_id`; `rpt_charges` (`procedure_code`, `is_ortho_code`, `service_date`, `office_id`, `patient_id`); `rpt_patient_dim`; `rpt_provider_dim`; `rpt_user_dim` (`assistant_username` = `rpt_user_dim.user_name`, joined on `rpt_user_dim.user_id = ortho_visits.assistant_user_id`) |
| Procedures | `string_agg` of the codes of live charges with `is_ortho_code` of the patient on `visit_date` in the visit office, in posting order; the charge named by `charge_id` (the auto-posted ortho visit code) is always included |
| Date basis | `ortho_visit_date` (filter card 7.3) |
| Office / provider | Visit office; visit doctor |
| Archwire labels | `upper_archwire` / `lower_archwire` hold the description from Ortho Setup (DATA-42 sketch stores text, so a later setup rename does not rewrite history) |
| Availability | **SCHEMA(42)**. Interim mode until `ortho_visits` exists: one row per patient-office-day with an `is_ortho_code` charge (contract-billing charges excluded); `Doctor` = charge provider; `Procedures` = codes; `Assistant`, `UAW`, `LAW`, `Compliance`, `Oral Hygiene`, `Elastics`, `Appliance` empty; run warning `ortho_visit_card_fields_unavailable` |
| Migrated history | Interim mode works on migrated charges with D8xxx codes (ortho codes were migrated as charges); card fields never exist for migrated visits. After DATA-42 the run is split by `rpt_tenant_settings.ortho_visits_since` (NEW, see r05): dates before it keep the interim charge rows, dates on or after it read `rpt_ortho_visits`; the warning `ortho_visit_card_fields_unavailable` prints whenever the range reaches before that date |

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
Sort: `visit_date` asc (legacy: oldest to newest), then `patient_last_name` [I], then `visit_id`. Page break: `none` (default), `date`, `office`. Summary card:
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

PDF layout `journal` (02 section 7.2 lists Ortho Daily Journal there) with the summary block omitted (the report declares
only block `main`; the legacy tool states no totals; the per-band `Visits:` count is a group subtotal row, enhancement):
landscape (12 columns), date band headers, multi-line
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
`months_to_debond` (NEW, see shared rules) shows the closed duration.

### Parameters - legacy parity

<!-- PARITY:ortho_reports.r03:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in; default token working_office. Office attribution on this report: the contract office rpt_ortho_contracts.office_id [I]. No PROVIDER control exists on this screen, so a provider-restricted caller is not restricted here (scope.provider_restriction = none). |
| ORTHO START DATE | Start Date (date_input) | (empty) | `ortho_start_date_from` | date_range | - | - | replicated_enhanced | Optional attribute range ortho_start_date, blank = no restriction (captured blank: the screenshot cannot prove whether blank is the default or the criteria had been cleared - confirm on the live tool). Binds to rpt_ortho_contracts ortho start = coalesce(banding_date, treat_start_date) as 03 section 2.25 defines it; 04 section 3 names treat_start_date alone - 03 owns the column (open question). Contracts without any start date are dropped whenever a bound is set. |
| ORTHO START DATE | End Date (date_input) | (empty) | `ortho_start_date_to` | date_range | - | - | replicated_enhanced | End of the ortho_start_date attribute range, inclusive; blank = open end. Same binding and caveat as the Start Date box. |
| PATIENT LAST VISIT | Start Date (date_input) | (empty) | `ortho_last_visit_date_from` | date_range | - | - | replicated_enhanced | Optional attribute range ortho_last_visit_date, blank = no restriction. Vendor: Last Visit on this report = date of service of the last Ortho Treatment Card entry (rpt_ortho_contracts.last_visit_date, last ortho_visits row after DATA-42), not the general last visit (rpt_patient_activity.last_visit_date). A patient without an ortho visit is dropped whenever a bound is set. |
| PATIENT LAST VISIT | End Date (date_input) | (empty) | `ortho_last_visit_date_to` | date_range | - | - | replicated_enhanced | End of the ortho_last_visit_date attribute range, inclusive; blank = open end. |
| ORTHO STATUS | (no label) (picker) | shown: ALL | `ortho_status_codes` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select on lookup:ortho_statuses (NEW, FLT-09); ALL = no restriction, so contracts without a status are kept; a narrower list drops contracts whose ortho_status_code is NULL (null_policy drop). The legacy value list is not shown in any source; the vocabulary is NEW (DATA-42). Status = the status of the newest ortho treatment plan in the legacy tool; here rpt_ortho_contracts.ortho_status_code. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:ortho_reports.r03:END -->

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
| `include_finished_contracts` | `boolean` (NEW, needs RPT-ORTHO-02) | `true` (fixed; decided under F6) | Ticked: also contracts with `contract_status IN ('debonded', 'retention')`; unticked: `contract_status = 'active'` only. Soft-deleted contracts (`is_active = false`) are never returned. Before DATA-42 the parameter is disabled (`enabled_when` on the availability flag of `contract_status`; disabled value = default). Answering F6 bumps `definition_version` |
| `group_by` | `enum`: `none`, `ortho_status`, `provider` | `none` | Status band with count and average months |
| `sort_by` | `enum`: `status_patient`, `months_desc`, `patient_last_name`, `ortho_start_date` | `status_patient` [I] | Order |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ortho_contracts` (non-deleted grain after RPT-ORTHO-02: NEW `ortho_start_date`, `ortho_status_code`, `last_visit_date`, `months_in_treatment`, `treat_end_date`, `months_remaining`, `is_past_planned_end`, `debond_date`, NEW `contract_status`, NEW `months_to_debond`, `provider_id`, `office_id`); `rpt_patient_dim` (`dob`, `cell_phone`, `email`, names, `chart_no`) |
| Time in Treatment | `months_in_treatment` = whole months of `age(local today, ortho_start_date)` (floor) as 03 defines it; NULL when no start date |
| Contract per patient | Latest ortho start in scope; `contract_count` (NEW, definition level) hidden; a second in-treatment contract is a data warning |
| Filters | `office_scope` -> contract office; `ortho_start_date_*` -> `ortho_start_date BETWEEN`; `ortho_last_visit_date_*` -> `last_visit_date BETWEEN`; `ortho_status_codes` -> `IN`; always `is_active` (soft delete) |
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
| `last_visit_date` | Last Visit | `date` | `phi_identified` | - |
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
`ortho_active_patients` when status is `all`, both ranges are blank, `include_finished_contracts = false`, every contract
has `ortho_start_date <= local_today` and every patient has `contract_count = 1` (fixture test; the metric counts
contracts, the report patients).

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

<!-- PARITY:ortho_reports.r04:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in; default token working_office. Office attribution on this report: the contract office rpt_ortho_contracts.office_id [I]. No PROVIDER control exists on this screen. |
| ORTHO START DATE | Start Date (date_input) | shown: 11/21/2026 | `ortho_start_date_from` | date_range | - | `today` | replicated_enhanced | Attribute range ortho_start_date, legacy default today (date token today in the office time zone). Binds to coalesce(banding_date, treat_start_date) of rpt_ortho_contracts (03 section 2.25; NEW computed column ortho_start_date via RPT-ORTHO-02). Combined with PATIENT FIRST VISIT by AND [I] (04 section 11 open item 'Two ortho ranges'). Every ortho visit belongs to a contract (DATA-42 ortho_visits.ortho_plan_id NOT NULL), so the vendor's second use 'visit but not started' = a contract with first_ortho_visit_date set and ortho_start_date IS NULL, reached with this range blank; confirm the legacy meaning on the live tool. |
| ORTHO START DATE | End Date (date_input) | shown: 11/21/2026 | `ortho_start_date_to` | date_range | - | `today` | replicated_enhanced | End of the ortho_start_date attribute range, inclusive; default today. |
| PATIENT FIRST VISIT | Start Date (date_input) | shown: 11/21/2026 | `ortho_first_visit_date_from` | date_range | - | `today` | replicated_enhanced | Attribute range ortho_first_visit_date, legacy default today. Vendor: First Visit = first Ortho Treatment Card entry (min ortho_visits.visit_date of the patient, NEW column first_ortho_visit_date for rpt_ortho_contracts, owner 03), not the first visit to the practice (rpt_patient_activity.first_visit_date). Combined with ORTHO START DATE by AND [I]. |
| PATIENT FIRST VISIT | End Date (date_input) | shown: 11/21/2026 | `ortho_first_visit_date_to` | date_range | - | `today` | replicated_enhanced | End of the ortho_first_visit_date attribute range, inclusive; default today. |
| ORTHO STATUS | (no label) (picker) | shown: ALL | `ortho_status_codes` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select on lookup:ortho_statuses (NEW, FLT-09); ALL = no restriction (contracts without a status kept); a narrower list drops NULL statuses. Legacy value list unknown (DATA-42 defines the vocabulary). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:ortho_reports.r04:END -->

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
| Datasets | `rpt_ortho_contracts` (NEW `ortho_start_date`, `ortho_status_code`, NEW `first_ortho_visit_date`, `last_visit_date`, `office_id`, `provider_id`, `is_active` as soft delete); `rpt_patient_activity.next_appointment_date`; `rpt_patient_dim` |
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
| `last_visit_date` | Last Visit | `date` | `phi_identified` | - |
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
| Next Appt | `navigate` Scheduler day view on `next_appointment_date` in the contract office, patient highlighted (appointment right; `rpt_patient_activity` carries no appointment id) |
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

<!-- PARITY:ortho_reports.r05:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| MISSING | Ledger Transaction (checkbox) | **checked** | `missing_items.ledger_transaction` | enum_multi | - | `true` | replicated | Member ledger_transaction of missing_items (enum_multi, options on this report: ledger_transaction, ortho_visit; min_items 1; semantics.full_selection = predicate). Ticked: an appointment qualifies when no live charge exists for the patient in the appointment's office on the appointment date (any is_ledger_code charge; rpt_charges). Inferred rule (supplement, unresolved): a row is listed when at least one ticked item is missing (OR across ticked items). |
| MISSING | Ortho Visit (checkbox) | **checked** | `missing_items.ortho_visit` | enum_multi | - | `true` | replicated | Member ortho_visit of missing_items. Ticked: an appointment qualifies when no ortho_visits row (DATA-42) exists for the patient on the appointment date in the appointment's office. Inferred rule: OR across ticked items; both ticked (default) = appointments missing a ledger transaction, an ortho visit, or both. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in; default token working_office. Office attribution on this report: the appointment office rpt_appointment_facts.office_id; ledger and visit tests are matched in the same office on the same day (as the Daily Audit, 03 section 2.17). |
| APPOINTMENT PROVIDER | Appointment Provider (picker) | shown: ALL | `appointment_provider_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; ALL = no restriction. provider_role appointment: rpt_appointment_facts.provider_id (prints as 'Provider'). Never scoped by providers.office_id. Not forced for provider-restricted callers: the family declares scope.provider_restriction = none (PD-11 restricts My Reports and provider dashboards only). |
| APPOINTMENT DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range. Basis appointment_date unless the section carries a basis radio (Appointment Detail by User). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| APPOINTMENT DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Basis appointment_date unless the section carries a basis radio. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| VISIT DOCTOR | Visit Doctor (picker) | shown: ALL | `visit_doctor_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; ALL = no restriction. provider_role ortho_visit: ortho_visits.visit_provider_id (prints as 'Visit Provider'). A narrower list keeps only appointments that HAVE an ortho visit by one of the chosen doctors, so rows missing the visit drop out (null_policy drop) [I]; the form shows a hint when visit_doctor_ids is not all and ortho_visit is ticked. Confirm on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:ortho_reports.r05:END -->

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
| VISIT DOCTOR narrowed | Keeps appointments where any of the day's visit providers (`visit_provider_ids`) is in the list; appointments without a visit drop out [I] |

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
| Function | `rpt_ortho_visit_audit(p_tenant_id, p_office_ids, p_date_from, p_date_to)` (NEW, owner 03, twin of `rpt_appointment_note_audit()`): one row per live appointment (`NOT is_block AND NOT is_deleted`, `status_class NOT IN ('cancelled', 'no_show')`, archive excluded) of an ortho patient (`rpt_patient_dim.is_ortho_patient`) in the range, with `has_ledger_transaction`, `has_ortho_visit`, `visit_provider_ids` (array: a patient can have more than one visit on one day) evaluated same patient, same office, same day |
| Ledger test | `EXISTS` live `rpt_charges` row with `is_ledger_code` on `service_date = appointment_date` in the office [I]. Not the Daily Audit visit-code rule: the ortho visit code is usually zero-fee and may not be flagged `is_visit_code` |
| Visit test | `EXISTS` `ortho_visits` row on `visit_date = appointment_date` in the office (DATA-42) |
| Future appointments | Appointments after the office's today are excluded and the run warns `future_appointments_excluded` [I] (they would always show both gaps) |
| General last visit | `rpt_patient_activity.last_visit_date` (DATA-19) |
| Status | `rpt_ortho_contracts.ortho_status_code` of the patient's latest contract |
| Availability | **SCHEMA(42)**: the `Ortho Visit` test and `Visit Provider` need `ortho_visits`; no interim (the visit cannot be told apart from the ledger line) |
| Migrated history | Appointments and charges were migrated, ortho visits were not. The date range is never clamped: for appointments before the tenant's ortho go-live (`rpt_tenant_settings.ortho_visits_since`, NEW, owner 03 section 2.17 with `rpt_ortho_visit_audit()`) `has_ortho_visit` is unknown (NULL, printed `-`), such rows never qualify on the `ortho_visit` gap, the ledger gap is still evaluated, and the run warns `ortho_visits_before_go_live` |

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
| `visit_provider_short_ids` | Visit Provider | `text` (short ids of all same-day visit providers joined with `, `) | `aggregate` | - |
| `has_ledger_transaction` | Ledger Transaction | `boolean` (labels Yes / No) | `phi_identified` | count of `No` (label `Missing ledger`) |
| `has_ortho_visit` | Ortho Visit | `boolean` (labels Yes / No) | `phi_identified` | count of `No` (label `Missing visit`) |
| hidden: `appointment_id` (`row_id`), `office_id`, `appointment_provider_id`, `ortho_plan_id`, `patient_last_name` | | | | - |

Grouping: office when multi-office; optional provider or date. Page break: `none`, `group`, `office`. Summary cards:
`Appointments listed`, `Missing ledger`, `Missing visit`. No related metric (appointment-grain audit).

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

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-ORTHO-01 | Ortho family scaffolding: shared parameter declarations, `scope` attributions (`ortho_contract`, `ortho_visit`, `appointment`), `availability[]` entry `ortho_app_era_only`, criteria echo, right family `ortho`, legacy names and actions | P3 | S | ENG-03, ENG-18, FLT-09, SEC (08 family `ortho`) | Lint passes for the five definitions with every `legacy_control_ids` entry of `catalog/parity/ortho_reports.parity.json`; a View Only holder runs and cannot print; a caller without `phi_identified` gets 403 `data_class_denied` |
| RPT-ORTHO-02 | Request to 03 (DATA-42): `rpt_ortho_contracts` on the non-deleted grain (`is_active` stays the soft-delete filter) with NEW `contract_status`, computed `ortho_start_date`, `first_ortho_visit_date`, `months_to_debond`, `ortho_visit_count`, `missed_appointment_count`; interim `last_visit_date` lateral changed to `c.is_ortho_code AND NOT c.is_contract_billing`, after DATA-42 `max(ortho_visits.visit_date)` per `ortho_plan_id`; `rpt_ortho_visits` view over `ortho_visits` with procedures of the visit; `rpt_tenant_settings.ortho_visits_since` | P3 | M | DATA-42, DATA-37, DATA-19 | Every criterion and documented output column of the five reports binds to a declared dataset column (DATA-42 acceptance); a debonded contract is returned with `contract_status = debonded`; a soft-deleted contract is never returned; an instalment charge does not move `last_visit_date` |
| RPT-ORTHO-03 | `ortho_statuses` option source and the status vocabulary (definitions group, seeded from the live legacy list once read; interim seed `observation`, `active`, `debonded`, `retention` marked provisional) | P3 | S | DATA-42, FLT-09 | `GET` options for `ortho_status_codes` returns the seeded codes; an unknown code in a request answers 422 |
| RPT-ORTHO-04 | Ortho fixture set on the PostgreSQL test tier: three offices, contracts (active, past planned end, debonded, no start date, two contracts on one patient), visits, appointments (kept, cancelled, future), ortho visit code charges | P3 | M | ENG-17, DATA-42 | Golden outputs of the five definitions are stable; each open-question assumption has one fixture row that shows its effect |
| RPT-ORTHO-05 | Outreach and booking actions for the family: bulk `send_sms` / `send_email` / `letters` / `create_task`, row `navigate` to the Scheduler booking hand-off and to the ortho payment plan screen | P3 | S | ENG-49, DASH-31, UX-22 | Selection resolves from the snapshot; consent exclusions counted; booking opens the Scheduler with the patient preselected |
| RPT-ORTHO-06 | Live legacy confirmation checklist for the family (F1-F6 and the per-report questions) and decisions-file update | P3 | S | - | Every question has a recorded answer; `build_parity.py` re-run prints PARITY VALID; changed assumptions bump `definition_version` |
| RPT-ORTHO-07 | Ortho dashboard drill bindings: `dashboards.ortho` tiles open `ortho.ortho_report`, `ortho.patients_by_ortho_status_with_time_in_treatment`, `ortho.ortho_compliance_report`, `ortho.missing_ortho_visits`, `ortho.ortho_daily_journal` with office, period and provider parameters | P3 | S | DASH-26, ENG-30, MET (05 section 5.11) | Drill list count equals the tile value for `ortho_starts` (r04, first-visit range blank) and `ortho_active_patients` (r03, status all, dates blank) on the fixture, every listed contract started on or before local today and one contract per patient |
| RPT-ORTHO-10 | Definition `ortho.ortho_compliance_report`: population rule, weeks threshold, no-visit contracts, interim last-visit rule, columns, sorts, actions | P3 | M | RPT-ORTHO-01, RPT-ORTHO-02, DATA-19, DATA-42 | Fixture: an active contract with a visit 7 weeks ago and no future appointment is listed at threshold 6 and not at 8; the same contract with an instalment posted 1 week ago is still listed at threshold 6; the same patient with an appointment today or later is not listed; a soft-deleted contract is never listed; after DATA-42 a debonded contract is never listed |
| RPT-ORTHO-11 | Ortho Compliance worklist mode: live paging, follow-up columns, `exclude_followed_up_within_days`, booking hand-off | P3 | S | RPT-ORTHO-10, DASH-28, DASH-30, ENG-48 | Booking an appointment from the row removes the patient at the next refresh; a logged follow-up hides the row for the chosen days |
| RPT-ORTHO-12 | Definition `ortho.ortho_daily_journal` on `rpt_ortho_visits` with the `journal` PDF layout | P3 | M | RPT-ORTHO-02, ENG-24, ENG-27, DATA-42 | Fixture day with three visits prints three rows under one date band in vendor column order; Procedures lists the auto-posted visit code; `clinical` columns are absent for a caller without the class |
| RPT-ORTHO-13 | Ortho Daily Journal interim mode on `rpt_charges` (until `ortho_visits` exists) with warning `ortho_visit_card_fields_unavailable` | P3 | S | RPT-ORTHO-12, DATA-04 | A patient-day with D8670 and D8080 charges is one row with both codes; contract-billing charges are not rows; the warning prints in the criteria block |
| RPT-ORTHO-14 | Definition `ortho.patients_by_ortho_status_with_time_in_treatment` | P3 | S | RPT-ORTHO-02, RPT-ORTHO-03 | Default run (all blank, status all, `include_finished_contracts = true`) lists every non-deleted contract in scope once per patient; a contract started 14 months and 20 days ago shows 14; status filter drops NULL statuses |
| RPT-ORTHO-15 | Definition `ortho.ortho_report` with both attribute ranges, start-missing enhancement and next appointment | P3 | S | RPT-ORTHO-02, DATA-19 | Default today/today lists only a contract starting today with a first visit today; start range blank + `ortho_start_missing_only` lists the contract with visits and no start; count equals `ortho_starts` with the first-visit range blank |
| RPT-ORTHO-16 | Function `rpt_ortho_visit_audit()` (request to 03) and definition `ortho.missing_ortho_visits` | P3 | M | RPT-ORTHO-02, DATA-16, DATA-19, DATA-42, ENG-59 | Fixture: appointment with visit and charge is not listed; with charge only shows Visit `No`; with visit and deleted charge shows Ledger `No`; cancelled and future appointments are not listed; only-ledger tick hides the visit-only gap; two same-day visits by different doctors show both short ids and match a VISIT DOCTOR list holding either; an appointment before `ortho_visits_since` shows Visit `-` and is listed only for a ledger gap |
| RPT-ORTHO-17 | Missing Ortho Visits row actions and worklist mode (post transaction, chart visit task, resolve / snooze) | P3 | S | RPT-ORTHO-16, ENG-49, DASH-28 | Posting the visit code from the row and re-running removes the Ledger `No`; a resolved row is hidden with `exclude_resolved` |

<!-- ASSEMBLED from catalog/parts/ortho_reports/ (00_header.md, 10_reports.md). Edit this document directly from now on. -->
