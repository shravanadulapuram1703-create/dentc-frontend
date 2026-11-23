# Ortho Reports - report specifications

Orthodontic case control: visits recorded on the ortho treatment card, appointments that left no visit or ledger trace,
patients without a next appointment, new starts and time in treatment. Hub home: Clinical › Ortho, route
`/reports/c/ortho` (brief section 1, 07 section 2). Default phase P3; all five reports ship in P3, together with DATA-42.

## Overview

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `ortho.ortho_compliance_report` | Ortho Compliance Report | Patients with an active ortho contract, no future appointment and no ortho visit for N weeks (default 6) | P3 | M | APP (contracts exist only in the app; visit-based weeks: SCHEMA(42)) | PARTIALLY DOCUMENTED (purpose; columns INFERRED) |
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
| `Last Visit` / `First Visit` (ortho) | Ortho Treatment Card entries | `ortho_visits.visit_date` (DATA-42): last = `rpt_ortho_contracts.last_visit_date`, first = NEW `first_ortho_visit_date` | interim: last charge with `is_ortho_code` |
| `Last Visit` (general, Missing Ortho Visits only) | patient's last visit | `rpt_patient_activity.last_visit_date` | yes (DATA-19) |
| `Next Appt` / "no future appointment" | scheduler | `rpt_patient_activity.next_appointment_date` (first live appointment after the office's today, not cancelled / no-show) | yes |
| `Time in Treatment` | months from start to the current date | `rpt_ortho_contracts.months_in_treatment` (whole months by `age()`, as of the office's today); rounding rule of the legacy tool not stated | app-era contracts |

Contract selection: one row per patient on the patient-grain reports (r01, r03, r04). When a patient has more than one
contract in scope, the contract with the latest ortho start is used and `contract_count` is carried as a hidden column [I].
`rpt_ortho_contracts` is defined over active `ortho_plans` rows only; r03 also needs finished contracts (status
`debonded` / `retention`) and therefore asks 03 for an `is_active` / `contract_status` column on an all-contracts grain
(RPT-ORTHO-02).

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
| Patient population | Ortho patient = a patient with an `ortho_plans` row in scope (r01, r03, r04) or `rpt_patient_dim.is_ortho_patient` (r05: tag rule or active contract, data card 3.5) |
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

<!-- WORK-ITEMS -->
| RPT-ORTHO-01 | Ortho family scaffolding: shared parameter declarations, `scope` attributions (`ortho_contract`, `ortho_visit`, `appointment`), `availability[]` entry `ortho_app_era_only`, criteria echo, right family `ortho`, legacy names and actions | P3 | S | ENG-03, ENG-18, FLT-09, SEC (08 family `ortho`) | Lint passes for the five definitions with every `legacy_control_ids` entry of `catalog/parity/ortho_reports.parity.json`; a View Only holder runs and cannot print; a caller without `phi_identified` gets 403 `data_class_denied` |
| RPT-ORTHO-02 | Request to 03 (DATA-42): `rpt_ortho_contracts` on an all-contracts grain with `is_active`, `contract_status`, computed `ortho_start_date`, `first_ortho_visit_date`, `last_ortho_visit_date`, `ortho_visit_count`, `missed_appointment_count`; `rpt_ortho_visits` view over `ortho_visits` with procedures of the visit | P3 | M | DATA-42, DATA-37, DATA-19 | Every criterion and documented output column of the five reports binds to a declared dataset column (DATA-42 acceptance); a debonded contract is returned with `is_active = false` |
| RPT-ORTHO-03 | `ortho_statuses` option source and the status vocabulary (definitions group, seeded from the live legacy list once read; interim seed `observation`, `active`, `debonded`, `retention` marked provisional) | P3 | S | DATA-42, FLT-09 | `GET` options for `ortho_status_codes` returns the seeded codes; an unknown code in a request answers 422 |
| RPT-ORTHO-04 | Ortho fixture set on the PostgreSQL test tier: three offices, contracts (active, past planned end, debonded, no start date, two contracts on one patient), visits, appointments (kept, cancelled, future), ortho visit code charges | P3 | M | ENG-17, DATA-42 | Golden outputs of the five definitions are stable; each open-question assumption has one fixture row that shows its effect |
| RPT-ORTHO-05 | Outreach and booking actions for the family: bulk `send_sms` / `send_email` / `letters` / `create_task`, row `navigate` to the Scheduler booking hand-off and to the ortho payment plan screen | P3 | S | ENG-49, DASH-31, UX-22 | Selection resolves from the snapshot; consent exclusions counted; booking opens the Scheduler with the patient preselected |
| RPT-ORTHO-06 | Live legacy confirmation checklist for the family (F1-F6 and the per-report questions) and decisions-file update | P3 | S | - | Every question has a recorded answer; `build_parity.py` re-run prints PARITY VALID; changed assumptions bump `definition_version` |
| RPT-ORTHO-07 | Ortho dashboard drill bindings: `dashboards.ortho` tiles open `ortho.ortho_report`, `ortho.patients_by_ortho_status_with_time_in_treatment`, `ortho.ortho_compliance_report`, `ortho.missing_ortho_visits`, `ortho.ortho_daily_journal` with office, period and provider parameters | P3 | S | DASH-26, ENG-30, MET (05 section 5.11) | Drill list count equals the tile value for `ortho_starts` (r04, first-visit range blank) and `ortho_active_patients` (r03, status all, dates blank) on the fixture |
<!-- /WORK-ITEMS -->
