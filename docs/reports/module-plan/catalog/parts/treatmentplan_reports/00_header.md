# Treatment Plan Reports - report specifications

Treatment-plan follow-up and case presentation: the patient-facing proposal document, the list of planned procedures by
status (the unscheduled-treatment call list), the status analysis and the code finder. Hub home: Clinical › Treatment plans
(brief section 1). Default phase P3; every report ships in P3 (`rpt_treatment_item_facts` is P1, DATA-56; the item office
and acceptance stamps it filters on are P3, DATA-39).

## Overview

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `treatment_plan.treatment_plan_proposal` | Treatment Plan Proposal | Batch print of the signable patient treatment-plan document (estimate, benefits grid, financial disclosure, signature line) for the patients and procedures selected | P3 | L | APP (benefits grid: family columns are stored snapshots; individual remainders need DATA-32, P2) | PARTIALLY DOCUMENTED (document DOCUMENTED from the single-patient print, 2023 / 2025 samples; batch behaviour INFERRED; one option row unread) |
| `treatment_plan.treatment_plan_status` | Treatment Plan Status | Planned procedures by two-layer status, patient band with phones, phase / plan / patient subtotals: the unscheduled-treatment call list | P3 | M | APP (`Sts` of a scheduled or completed item inferred when it was never booked; status as of a date: SCHEMA(25)) | DOCUMENTED for Detail (2013 sample); Summary INFERRED |
| `treatment_plan.treatment_plan_analysis` | Treatment Plan Analysis | Count and amount of planned procedures per status per office, with five comparison ratios | P3 | M | APP | DOCUMENTED (sample c. 2022 + definitions; row set conflicts between vendor sources) |
| `treatment_plan.treatment_plan_detail` | Treatment Plan Detail | Patients who have the selected procedure code(s) in their treatment plan | P3 | S | APP | PARTIALLY DOCUMENTED (purpose, criteria, code picker); layout INFERRED |

## Shared rules

### Shared parameters and defaults (from the parity file; no report section repeats them)

| Parameter | Type | Reports | Default | Rule on this family |
|---|---|---|---|---|
| `output_format` | `enum` | all 4 | `pdf` | PDF -> `pdf`, Excel -> `xlsx`, added `csv`; `role: output`; never changes rows |
| `office_scope` | `office_scope` | all 4 | `working_office` | Attribution = office of the planned procedure (below). Mode `office` / `office_group` decides the value key; `all` = every office the caller may read |
| `provider_ids` | `entity_multi` (`ProviderParam`) | all 4 | `all` | `provider_role = treating` on the item: `rpt_treatment_item_facts.provider_id`. Items without a provider match only `all` |
| `date_range` (`date_from`, `date_to`, `date_preset`) | `date_range` | all 4 | `today` / `today` | Fixed `date_basis = diagnosed_date` (no basis parameter), bound to `presented_date`; office-local, inclusive |
| `exclude_patient_type_codes` | `entity_multi` | all 4 | `none` | `NOT` overlap with `rpt_patient_dim.patient_type_codes`; patients without a type kept; `lookup:definitions:patient_type`; footer `Exclude Pat Type` |
| `include_inactive_patients` | `boolean` | r02, r03, r04 | `false` | `rpt_patient_dim.is_active` predicate dropped when `true`. r01 has no such control: active and inactive patients both print (inferred, open question 3) |
| `procedure_codes` | `entity_multi` | r02 (`all`), r04 (`all`, captured empty: `unknown_legacy`) | `all` | `procedure_code IN (...)` on the item; code picker extras (category tree, ranges, saved code sets) are FLT-25 |

No dynamic rules exist in this category (`dynamic_rules = 0`; no control was captured greyed). Footer actions on every
report: CLEAR CRITERIA -> reset to defaults (frontend), PRINT / PREVIEW -> `print`, ADD TO MY FAVORITES -> `saved_view`
(one favorite saved view per caller and report; UPDATE MY FAVORITES overwrites it).

### Status vocabulary (binding for every report of the family)

The legacy status is two-layered (`data_card.md` 3.2). Every status criterion, column and row binds to this table, never to
`status_norm`:

| Legacy letter | Legacy label | Parameter value | Predicate on `rpt_treatment_item_facts` |
|---|---|---|---|
| `D` | Diagnosed | `diagnosed` | `exclusive_status = 'diagnosed'` |
| `A` | Accepted | `accepted` | `exclusive_status = 'accepted'` |
| `U` | Unaccepted | `unaccepted` | `exclusive_status = 'unaccepted'` |
| `H` | Hold | `hold` | `exclusive_status = 'hold'` |
| `L` | Alternative | `alternative` | `exclusive_status = 'alternative'` |
| `R` | Referred Out | `referred_out` | `exclusive_status IN ('referred_out', 'external_referral', 'internal_referral')` |
| `S` | Scheduled (flag) | `scheduled` | `is_scheduled` |
| `C` | Completed (flag) | `completed` | `is_completed` |
| `PS` | Pre-Authorized Sent | `pre_authorized_sent` | `preauth_status = 'sent'` |
| `PC` | Pre-Authorized Closed | `pre_authorized_closed` | `preauth_status = 'closed'` |

`internal_referral` / `external_referral` are DentC-only extra values of `exclude_treatment_plan_statuses` (enhancement);
they are also members of `R`. `exclusive_status_inferred = true` (a scheduled or completed item that was never booked, so
its prior status is unknown and `accepted` is assumed) is printed as `A*` with a footnote. Items with `status_norm =
'existing'` (migrated) are never listed.

### Date bases, attribution, money

| Topic | Rule |
|---|---|
| Date basis | `diagnosed_date` = `presented_date` = `coalesce(diagnosed_date, office-local created date)` of the planned procedure: the date the procedure was entered into the plan, back-datable (vendor). Printed `Diag. Dt` / `Prop. Dt` = `diagnosed_date` |
| Migrated history | The 674 migrated plans were derived from appointment lines, with no dates and no provider (`data_card.md` 2.22). The dataset today gives them `presented_date` = load date (`created_at::date`): a range covering the migration day would list every migrated item. Request to 03 (correction of DATA-56): `presented_date` is NULL when `era = 'migrated'` and `diagnosed_date` is NULL. Every definition declares `availability[]` code `treatment_plan_app_era_only` ("Treatment plans entered before go-live have no diagnosed date and are not listed") |
| "Today" | Office-local date of the working office; a multi-office run resolves `today` per office (AD-9) |
| Office attribution | `treatment_item_office` = `rpt_treatment_item_facts.office_id` = `coalesce(treatment_plans.office_id, patients.home_office_id)` today; the item's own Treating Office after DATA-39 (P3). Until DATA-39 a plan created without an office files under the patient's home office: printed as an `availability[]` warning |
| Provider attribution | Treating provider of the item (`provider_id`). The diagnosing provider (`diagnosed_by_raw`) is not an attribution |
| Counselor | `counselor_user_id` (users), r02 only |
| Plan number | Legacy `T ID` / `Treatment Plan : <n>` is a per-patient number. NEW `rpt_treatment_item_facts.plan_no` = `row_number() OVER (PARTITION BY patient_id ORDER BY treatment_plans.created_at, treatment_plans.id)`, identical to `assignTids()` in `src/features/treatment-plans/txModel.ts`, so screen and report agree (owner 03) |
| Money | `fee` (posted plan fee), `ucr_fee`, `insurance_estimate` (primary + secondary), `discount`. Report rule: `est_patient` = `greatest(fee - insurance_estimate, 0)` (both tiers, as `estPat()` in `txModel.ts`); `total_amount` = `est_patient + insurance_estimate` (legacy `Total`). The DATA-56 sketch subtracts only the primary estimate (`fee - i.insurance_estimate`) while `insurance_estimate` sums both tiers: request to 03 to align. `discount` is reported, never netted, except `Net Est Pat` on the proposal |
| Signs | All amounts positive; no credits exist in this family |
| Status history | Current state only (an item accepted and later set back counts as it is today) until `treatment_plan_item_events` (DATA-25); "as of a date" is not offered |
| Freshness | `live` (views over OLTP) |

### Page furniture, rights, data classes

| Topic | Rule |
|---|---|
| Header | Organisation name, printed title from `title_templates` (r01 `Treatment Plan`; r02 `Treatment Plan Status - Detail` / `Treatment Plan Status - Summary`; r03 `Treatment Plan Analysis`; r04 `Treatment Plan Detail`), `Office : <office name>` outer band when `["ctx", "multi_office"]` (r03: always, one block per office) |
| Footer | `criteria_echo = footer` with the legacy echo labels `From`, `Thru`, `Providers`, `Tx Plan`, `Exclude Tx Plan` (legacy letters, `S,C`), `Exclude Pat Type`, `Codes`, `Tx Counselor`, `Pat From` / `Thru` (r01); then `Printed : <date time>`, `Page : n of m` |
| Right family | `treatment_plan`: `reports_treatment_plan_reports_screen_view_only` (run, view, drill, private views) / `reports_treatment_plan_reports_screen_full_control` (also print, PDF, schedule); XLSX / CSV also need `reports_export_data_files` (08 section 2.1). No per-report override |
| Data classes | Patient name, Pat ID, chart #, phones, DOB, address, responsible party, procedure code, tooth, surface and dates on a patient row: `phi_identified`. Amounts on a patient row (r01, r02, r04): `financial_patient`. Amounts per office or status (r03): `financial_practice` (the treatment-coordinator persona lacks it: r03 shows counts only for that role, 08 section 5.4). Counts, status labels, code and description as a group label: `aggregate`. Provider and counselor labels: `aggregate` (operational attribute, no provider group key in a money block). Pre-auth number: `phi_identified`. Subscriber id in the proposal benefits header: not printed |
| Provider restriction | `scope.provider_restriction = none` (category family); a provider-restricted caller reaches the same items only through `my_reports` metrics |
| Patient manifest | Every run records the patients listed (AD-7); the proposal additionally emits `report.print` per document |

### Data gaps the family depends on

| Gap | Effect | Owner |
|---|---|---|
| Item office and acceptance stamps (DATA-39) | Office filter uses the plan or home office until then; `Accept Dt` blank where only the effective date is known | DATA-39 (P3) |
| `presented_date` of migrated items | Without the correction a range covering the migration day lists undated migrated items | 03 (DATA-56 correction, NEW) |
| `plan_no` | `T ID` / `Treatment Plan : <n>` and the r01 TREATMENT PLAN ID box need the per-patient number on the server | 03 (NEW column of `rpt_treatment_item_facts`) |
| `est_patient` across both estimate tiers | `Est. Pat` + `Est. Ins` must equal the legacy `Total` | 03 (DATA-56 correction, NEW) |
| Status history | Funnel by date and status "as of" impossible until event capture | DATA-25 |
| Benefit remainders | Proposal benefits grid needs `rpt_benefit_usage()` | DATA-32 (P2) |
| Inactive versus deleted patients | `include_inactive_patients` also adds deleted patients | DATA-44 |
| Hard-deleted plans | Deleted plans leave no trace; `plan_no` of later plans shifts | DATA-39 (`treatment_plans.is_deleted`) |

### Family-wide enhancements (additive; defaults unchanged)

| Enhancement | Key and type | Reports | Phase |
|---|---|---|---|
| Counselor and treating-provider grouping | `group_by` `enum`: `none` (default), `provider`, `tx_counselor` | r02, r03, r04 | P3 |
| Patients with a future appointment left out (call list hygiene) | `exclude_patients_with_future_appointment` `boolean`, default `false`; live appointment after office-local today in `rpt_appointment_facts` | r02, r04 | P3 |
| Saved views shipped as presets: "Unscheduled treatment" (exclude S, C), "Accepted not scheduled" (status A, exclude S, C), "Month to date analysis" (`date_preset = month_to_date`) | saved views, relative dates | r02, r03 | P3 |
| Comparison period | `compare_to` (FLT-26) | r03 | P4 |

### Family-wide open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Is the legacy Tx Plan ID a per-patient number (1, 2, 3) in the batch reports, and does `Include internal plan id` print the system plan number? | live legacy tool, run r02 for two patients with two plans each |
| 2 | Does the diagnosed-date range select items (only those items print) or patients (whole plan prints)? Taken as items on every report | live legacy tool, patient with items diagnosed on two dates |
| 3 | Does Treatment Plan Proposal (no Include Inactive control) print inactive patients? | live legacy tool |
| 4 | Do the EXCLUDE PATIENT TYPE and SELECT dialogs list inactive providers / users / types, and does the TX COUNSELOR picker list users or providers? | live legacy tool, open each dialog |

<!-- WORK-ITEMS -->
| RPT-TX-01 | Shared treatment-plan parameter set and option sources: status vocabulary helper (ten legacy values -> predicates of the status table, letters for the footer echo), `treatment_plan_statuses`, `financial_disclosure_letters`, `users` for `tx_counselor_ids`, `ProviderParam` treating role | P3 | S | FLT-06, FLT-09, FLT-13, DATA-56 | Each of the 4 definitions validates with the defaults of the parity file; every legacy status value selects exactly the items of its predicate on a fixture with all ten statuses and both flags; FLT-20 parity default tests pass |
| RPT-TX-02 | Dataset corrections requested from 03 for this family: `plan_no`, `presented_date` NULL for undated migrated items, `est_patient` over both estimate tiers | P3 | S | DATA-56, DATA-39 | `plan_no` equals `assignTids()` on a patient with three plans; a range covering the migration day returns no migrated item; `est_patient + insurance_estimate` equals the legacy `Total` on an item with a secondary estimate |
| RPT-TX-03 | Family conventions: title templates, footer criteria echo labels (`Tx Plan`, `Exclude Tx Plan : S,C`, `Exclude Pat Type`), `A*` inferred-status marker, `availability[]` warnings (app era only, office before DATA-39) | P3 | S | ENG-23, FLT-18, RPT-TX-01 | PDF footers print the legacy echo labels with status letters; a run over an undated-office plan prints the warning in the criteria block |
| RPT-TX-04 | Live legacy verification for this category: hidden third option row of r01, Summary format of r02, empty CODES box of r04, Itemize Prices and Include internal plan id effects, Analysis row set, family open questions 1-4 | P3 | S | FLT-23 | Every `unknown_legacy` and inferred note of `treatmentplan_reports.parity.json` is resolved or re-confirmed and the parity file rebuilt PARITY VALID |
| RPT-TX-05 | Family enhancements: `group_by` provider / counselor, `exclude_patients_with_future_appointment`, shipped preset views | P3 | M | RPT-TX-13, RPT-TX-15, RPT-TX-17, ENG-28 | Default runs are identical to the legacy-parity runs; each preset view opens with the documented parameters |
<!-- /WORK-ITEMS -->
