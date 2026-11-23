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
| `exclude_patient_type_codes` | `entity_multi` | all 4 | `none` | `NOT` overlap with `rpt_patient_dim.patient_type_codes`; patients without a type kept; picking the source row `no_type_defined` drops patients without a type (shared dictionary 3.4); `lookup:definitions:patient_type`; footer `Exclude Pat Type` (r01: staff cover page only) |
| `include_inactive_patients` | `boolean` | r02, r03, r04 | `false` | `rpt_patient_dim.is_active` predicate dropped when `true`. r01 has no such control: active and inactive patients both print (inferred, open question 3) |
| `procedure_codes` | `entity_multi` | r02 (`all`), r04 (`all`, captured empty: `unknown_legacy`) | `all` | `procedure_code IN (...)` on the item; code picker extras are FLT-25: an ad-hoc range compiles to `procedure_code BETWEEN :low AND :high`, a category to the codes of that `code_category` in `rpt_procedure_code_dim`, a saved code set to `EXISTS rpt_code_in_group(tenant_id, group_key, procedure_code, presented_date)` |

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
| `IR` (NEW echo letter) | (Internal Referral) | `internal_referral` (enhancement, exclusion picker only) | `exclusive_status = 'internal_referral'` |
| `ER` (NEW echo letter) | (External Referral) | `external_referral` (enhancement, exclusion picker only) | `exclusive_status = 'external_referral'` |

Internal Referral and External Referral are legacy ADDITIVE flags on top of an exclusive status (research, glossary).
DentC stores them as the single item status (`status_norm`, carried into `exclusive_status`), so a DentC IR / ER item
shows `Sts = R` and matches `Referred Out`, where the legacy tool would show and match its exclusive status (for example
`D`). This is a data-imposed change of meaning (family open question 5). The two extra exclusion values exist so that the
IR / ER items can be dropped separately; they are also members of `R`.

`exclusive_status_inferred = true` (a scheduled or completed item that was never booked, so its prior status is unknown
and `accepted` is assumed) is printed as `A*` with a footnote. Filter consequence: `TREATMENT PLANS = Accepted` and an
`Accepted` exclusion also match these items; every run that applies an `accepted` predicate returns `availability[]`
warning `treatment_item_status_inferred` with their count ("n items show Accepted because their status before scheduling
was not recorded"). Items with `status_norm = 'existing'` (migrated) are never listed.

### Date bases, attribution, money

| Topic | Rule |
|---|---|
| Date basis | `diagnosed_date` = `presented_date` = `coalesce(diagnosed_date, office-local created date)` of the planned procedure: the date the procedure was entered into the plan, back-datable (vendor). Printed `Diag. Dt` / `Prop. Dt` = `diagnosed_date` |
| Migrated history | The 674 migrated plans were derived from appointment lines, with no dates and no provider (`data_card.md` 2.22). The dataset today gives them `presented_date` = load date (`created_at::date`): a range covering the migration day would list every migrated item. Request to 03 (correction of DATA-56): `presented_date` = `coalesce(diagnosed_date, (created_at AT TIME ZONE 'UTC' AT TIME ZONE rpt_office_dim.timezone)::date)` for app rows (the sketch's `created_at::date` is the UTC date), and NULL when `era = 'migrated'` and `diagnosed_date` is NULL. Every definition declares `availability[]` code `treatment_plan_app_era_only` ("Treatment plans entered before go-live have no diagnosed date and are not listed") |
| "Today" | Office-local date of the working office; a multi-office run resolves `today` per office (AD-9) |
| Office attribution | `treatment_item_office` = `rpt_treatment_item_facts.office_id` = `coalesce(treatment_plans.office_id, patients.home_office_id)` today; the item's own Treating Office after DATA-39 (P3). Until DATA-39 a plan created without an office files under the patient's home office: printed as an `availability[]` warning |
| Provider attribution | Treating provider of the item (`provider_id`). The diagnosing provider (`diagnosed_by_raw`) is not an attribution |
| Counselor | `counselor_user_id` (int `users.id`), r02 only; `counselor_label` = `rpt_user_dim.user_label` joined on `rpt_user_dim.user_id = counselor_user_id` (not on `user_key`) |
| Plan number | Legacy `T ID` / `Treatment Plan : <n>` is a per-patient number. NEW `rpt_treatment_item_facts.plan_no` = `row_number() OVER (PARTITION BY patient_id ORDER BY treatment_plans.created_at, treatment_plans.id)`, identical to `assignTids()` in `src/features/treatment-plans/txModel.ts`, so screen and report agree (owner 03) |
| Money | `fee` (posted plan fee), `ucr_fee`, `insurance_estimate` (primary + secondary), `discount`. Report rule: `est_patient` = `greatest(fee - insurance_estimate, 0)` (both tiers, as `estPat()` in `txModel.ts`); `total_amount` = `est_patient + insurance_estimate` (legacy `Total`). The DATA-56 sketch subtracts only the primary estimate (`fee - i.insurance_estimate`) while `insurance_estimate` sums both tiers: request to 03 to align. `discount` is reported, never netted, except `Net Est Pat` on the proposal |
| Signs | All amounts positive; no credits exist in this family |
| Status history | Current state only (an item accepted and later set back counts as it is today) until `treatment_plan_item_events` (DATA-25); "as of a date" is not offered |
| Freshness | `live` (views over OLTP) |

### Page furniture, rights, data classes

| Topic | Rule |
|---|---|
| Header | Organisation name, printed title from `title_templates` (r01 `Treatment Plan`; r02 `Treatment Plan Status - Detail` / `Treatment Plan Status - Summary`; r03 `Treatment Plan Analysis`; r04 `Treatment Plan Detail`), `Office : <office name>` outer band when `["ctx", "multi_office"]` (r03: always, one block per office) |
| Footer | `criteria_echo = footer` (r02, r03, r04) with the legacy echo labels observed on the Treatment Plan Status sample: `From`, `Thru`, `Providers`, `Tx Plan`, `Exclude Tx Plan` (legacy letters, `S,C`; NEW letters `IR`, `ER` for the extra values), `Exclude Pat Type`; NEW labels (not observed, family open question 6): `Codes`, `Tx Counselor`; then `Printed : <date time>`, `Page : n of m`. r01 documents carry no echo (patient-facing); its staff cover page lists the resolved criteria with `From`, `Thru`, `Providers`, `Exclude Pat Type` and the NEW labels `Pat From`, `Pat Thru`, `Tx Plan ID`, `Phase`, `Order ID` (no legacy echo of r01 is documented) |
| Right family | `treatment_plan`: `reports_treatment_plan_reports_screen_view_only` (run, view, drill, private views) / `reports_treatment_plan_reports_screen_full_control` (also print, PDF, schedule); XLSX / CSV also need `reports_export_data_files` (08 section 2.1). No per-report override |
| Data classes | Patient name, Pat ID, chart #, phones, DOB, address, responsible party, procedure code, tooth, surface and dates on a patient row: `phi_identified`. Amounts on a patient row (r01, r02, r04): `financial_patient`. Amounts per office or status (r03): `financial_practice` (the treatment-coordinator persona lacks it: r03 shows counts only for that role, 08 section 5.4). Counts, status labels, code and description as a group label of an aggregate block (r03): `aggregate`; on r04 the code and description repeat on patient rows: `phi_identified`. Provider and counselor labels: `aggregate` (operational attribute, no provider group key in a money block). Pre-auth number: `phi_identified`. Subscriber id in the proposal benefits header: not printed |
| Provider restriction | `scope.provider_restriction = none` (category family); a provider-restricted caller reaches the same items only through `my_reports` metrics |
| Patient manifest | Every run records the patients listed (AD-7); the proposal additionally emits `report.print` per document |

### Data gaps the family depends on

| Gap | Effect | Owner |
|---|---|---|
| Item office and acceptance stamps (DATA-39) | Office filter uses the plan or home office until then; `Accept Dt` blank where only the effective date is known | DATA-39 (P3) |
| `presented_date` of migrated items and its office-local date | Without the correction a range covering the migration day lists undated migrated items, and an undated app item created late in the office day falls on the next (UTC) date | 03 (DATA-56 correction, NEW) |
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
| 5 | Does a legacy item flagged Internal / External Referral match `Referred Out (R)`, and which `Sts` letter does it print? | live legacy tool, r02 and r03 with a Diagnosed item flagged External Referral |
| 6 | Which footer echo labels print for CODES and TX COUNSELOR (`Codes`, `Tx Counselor` are NEW until seen)? | live legacy run of r02 with CODES and TX COUNSELOR set |

## Treatment Plan Proposal - `treatment_plan.treatment_plan_proposal`

Treatment Plan Reports › Treatment Plan Proposal, screenshot `1.PNG` (possibly truncated) - P3 - L - right family `treatment_plan` - interactive (escalates to background above 100 documents) - PARTIALLY DOCUMENTED (document layout DOCUMENTED from the single-patient `Treatment Plan` print; batch behaviour INFERRED)

### Purpose

Treatment coordinators and front desk print the patient-facing treatment plan (estimate, insurance benefits, financial
disclosure, signature line) for several patients at once: at the end of the day for every patient whose treatment was
diagnosed that day, or before a consult day for the patients on the schedule. The document is handed to the patient at case
presentation and signed. The single-patient version stays on the patient's treatment-plan screen
(`TxPlanReportModal.tsx`, `GET /treatment-plans/{plan_id}/report`, PLAN-6); this report is the batch print of the same
document.

### Legacy output

One document per patient, printed title `Treatment Plan` (internal name `TxPlnTreatPlanPatUCR`), layout read from the
vendor's 2023 and 2025 samples of the single-patient print that shares these options. That the batch report prints the same
document for each selected patient is INFERRED.

| # | Part | Content |
|---|---|---|
| 1 | Title | Organisation name; `Treatment Plan` |
| 2 | Patient box | `Patient :` · `Pat ID :` · `DOB :` |
| 3 | Account box | `Chart # :` · `Resp. Party :` (with address when `Print Responsible Party Address`) · `Office Phone # :` · `Fax # :` · `Primary Insurance:` (and `Secondary Insurance:`) |
| 4 | Procedure grid (2025, current) | `Prdr` · `Prop. Dt` · `Th` · `Surf` · `Code` · `Description` · `Est Pat.` · `Est Ins.` · `Fee` · `UCR`. The 2023 grid also had `Ord`, `Start Dt`, `End Dt` (the vendor removed them); `Prdr` was a provider code in 2023 and a full name in 2025 |
| 5 | Grouping and totals | `Treatment Plan : <id>` -> `Phase : <id>`; `Total for Phase <n> :` and `Total for Treatment Plan <n> :` over `Est Pat.`, `Est Ins.`, `Fee`, `UCR`; under each, `Discount :` (when any) and `Net Est Pat :` = `Est Pat.` - discount |
| 6 | Benefits grid | Rows `Primary`, `Secondary`, `Tertiary`, `Quaternary` (as present); columns `Fam Max` · `Fam Max Rem` · `Ind Max` · `Ind Max Rem` · `Fam Ded` · `Fam Ded Rem` · `Ind Ded` · `Ind Ded Rem`; `99999` = unlimited, printed as a number |
| 7 | Disclosure | Text of the selected Financial Disclosure letter (office letter; may contain merge fields such as tooth numbers) |
| 8 | Signature | `Patient or Parent/Guardian` and `Date` lines (image and date when signed electronically) |

Markers kept: `*` beside a fee = a discount applies to that procedure; `~` beside a fee = the deductible is applied to that
service. `UCR` = the higher of the office UCR fee and the insurance fee-schedule fee (vendor text). Signs: all amounts
positive. DentC prints `UCR` as NEW computed column `ucr_display` = `greatest(coalesce(ucr_fee, fee), fee)`: `ucr_fee` is
the stamped office UCR schedule price, `fee` the fee-schedule fee posted on the item, so the column follows the vendor's
"higher of the two" (open question 11). Deliberate fix: none. Kept quirk: `99999` printed as a number, not "Unlimited" (enhancement tooltip only). The
single-patient dialog also offers `Good Faith Estimate`, `Print Account Name`, `X-Rays` and `Include Statuses` (defaults
Diagnosed + Accepted); none of them is visible on the batch screen, whose third OTHER OPTIONS row is cut off.

### Parameters - legacy parity

<!-- PARITY:treatmentplan_reports.r01:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Office attribution on this family: office of the planned procedure = rpt_treatment_item_facts.office_id (today coalesce(treatment_plans.office_id, patients.home_office_id); the item's own Treating Office after DATA-39, P3). Not the patient's home office and not the office of a later appointment. Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. Documents are not banded by office; the letterhead office is the document office (see Data). |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Provider role on this family: the treating provider of the planned procedure (rpt_treatment_item_facts.provider_id, legacy Prdr), not the diagnosing provider (diagnosed_by_raw, a legacy provider id on migrated rows) and not the patient's preferred provider. Items without a provider (every migrated item) match only ALL. Searchable multi-select of every provider, active and inactive, roster of the working office first (prefer, never exclude). Footer echo 'Providers : ALL'. |
| DIAGNOSED DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary range, fixed date_basis = diagnosed_date, bound to rpt_treatment_item_facts.presented_date = coalesce(diagnosed_date, office-local created date) of the planned procedure (vendor: the date range in which the procedures were entered into the plan; the diagnosed date defaults to the entry date and can be back-dated). Inclusive, office-local, default today. Migrated items carry no date: they are never selected by a range (presented_date must be NULL for them, not the load timestamp - request to 03). Echoed as From / Thru on the staff cover page only; the patient documents carry no criteria echo. |
| DIAGNOSED DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary range, fixed date_basis = diagnosed_date, bound to rpt_treatment_item_facts.presented_date = coalesce(diagnosed_date, office-local created date) of the planned procedure (vendor: the date range in which the procedures were entered into the plan; the diagnosed date defaults to the entry date and can be back-dated). Inclusive, office-local, default today. Migrated items carry no date: they are never selected by a range (presented_date must be NULL for them, not the load timestamp - request to 03). Echoed as From / Thru on the staff cover page only; the patient documents carry no criteria echo. |
| NAME RANGE | Start Name (text_input) | shown: AAAAA | `patient_name_from` | text_range | - | `AAAAA` | replicated | Start of the patient name range (sort name 'Last, First', prefix rule; AAAAA = open bound). Selects whose documents print. Echoed on the staff cover page only (NEW label 'Pat From'; no legacy echo of this report is documented). |
| NAME RANGE | SEARCH (button) | - | `patient_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| NAME RANGE | End Name (text_input) | shown: ZZZZZ | `patient_name_to` | text_range | - | `ZZZZZ` | replicated | End of the patient name range, inclusive, prefix rule; ZZZZZ = open bound. Echoed on the staff cover page only (NEW label 'Pat Thru'). |
| NAME RANGE | SEARCH (button) | - | `patient_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| TREATMENT PLAN ID | (no label) (text_input) | (empty) | `treatment_plan_id` | text | - | - | replicated | Legacy Tx Plan ID: the number of one of a patient's (alternative) plans. Blank = every plan of the selected patients, each printed as its own 'Treatment Plan : <n>' section. DentC plan ids are global strings (treatment_plans.id); the per-patient number the treatment-plan screen shows is computed client-side by assignTids() in src/features/treatment-plans/txModel.ts (1, 2, 3 by created_at, id). The report needs the same number on the server: NEW column rpt_treatment_item_facts.plan_no = row_number() OVER (PARTITION BY patient_id ORDER BY created_at, id) of treatment_plans (owner 03_data_foundation.md), so screen and report agree; a hard-deleted plan renumbers the later plans in both. The box accepts a plan_no (integer, applied to every selected patient). Inferred that the legacy number is per patient - confirm on the live tool with a two-patient batch. |
| PHASE ID | (no label) (text_input) | (empty) | `phase_id` | text | - | - | replicated | Legacy Phase ID = rpt_treatment_item_facts.phase_id (integer). Blank = all phases of the plan print (vendor training PDF, partly legible). Validation: digits only. Echoed on the staff cover page only (NEW label 'Phase'). |
| ORDER ID | (no label) (text_input) | (empty) | `order_id` | text | - | - | replicated | Legacy Order ID = priority within a phase = rpt_treatment_item_facts.priority (integer). Blank = every order id. Batch screen only (not on the single-patient dialog); meaning inferred from the vendor field definition - confirm on the live tool. |
| FINANCIAL DISCLOSURE | (no label) (dropdown) | shown: .Treatment Plan Disclosure | `financial_disclosure_template_id` | entity_single | - | `first_option` | replicated | Which Financial Disclosure letter prints at the end of each document (merge fields such as tooth numbers resolved per patient). Option source financial_disclosure_letters: letter templates of the disclosure type assigned to the working office (office_letter_templates), alphabetical; default first_option = the first name in that order (vendor tip: prefix the name with a period). Which letter_type holds disclosures in DentC is open (04 option-source note). An office with no disclosure letter: the document prints without a disclosure block. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter on the document's patient: patients having any selected user-defined type (rpt_patient_dim.patient_type_codes) get no document; None = exclude nothing; patients without a type are kept unless the source row no_type_defined is picked, which drops them (shared dictionary 3.4). Echoed on the staff cover page only (label Exclude Pat Type). |
| OTHER OPTIONS | Include Office UCR (checkbox) | **checked** | `include_office_ucr` | boolean | - | `true` | replicated | Ticked (legacy default) adds the UCR column to the procedure grid and to the phase and plan totals. Legacy UCR = the higher of the office UCR fee and the insurance fee-schedule fee (vendor text); DentC prints NEW computed ucr_display = greatest(coalesce(ucr_fee, fee), fee): ucr_fee is the stamped office UCR schedule price (NULL on migrated items and on items priced before the stamp), fee the fee-schedule fee posted on the item; the higher of the two, as the vendor text says - confirm on the live tool with an item whose insurance fee exceeds the office UCR. Layout switch, role query (adds a column). |
| OTHER OPTIONS | Itemize Prices (checkbox) | **checked** | `itemize_prices` | boolean | - | `true` | replicated | Ticked (legacy default) prints per-procedure amounts (Est Pat., Est Ins., Fee, UCR on every line); unticked prints the procedure lines without amounts and only the phase and plan totals. Effect INFERRED (vendor sources do not describe it) - confirm on the live tool. |
| OTHER OPTIONS | Include Completed Procedures (checkbox) | **unchecked** | `include_completed_procedures` | boolean | - | `false` | replicated | Unticked (legacy default) leaves out procedures already completed (rpt_treatment_item_facts.is_completed = a live charge is linked to the item); ticked prints them too, marked completed. No other status is filtered by the batch screen; the single-patient dialog defaults to Diagnosed + Accepted - whether the batch screen also leaves out Unaccepted / Hold / Alternative / Referred Out items is open (confirm on the live tool). |
| OTHER OPTIONS | Print Responsible Party Address (checkbox) | **unchecked** | `print_responsible_party_address` | boolean | - | `false` | replicated | Ticked prints the responsible party's mailing address under 'Resp. Party :' in the header box (rpt_account_dim guarantor address of the patient's current account); unticked prints the name only (inferred). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:treatmentplan_reports.r01:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` | Proposal documents in the PDF layout `treatment_plan_proposal` (one document per patient) |
| PRINT FORMAT `Excel` | XLSX with one row per printed procedure line (patient, plan and phase keys repeated) and a benefits sheet; no document layout (legacy Excel of this report not documented) |
| OFFICE/GROUP `Office` | Picker lists offices; items whose `treatment_item_office` is in the list |
| OFFICE/GROUP `Office Group` | Picker lists office groups; items of the offices of the group(s) |
| Office picker `108` (working office) / list / `ALL` | Working office (default), the chosen offices, or every office the caller may read |
| PROVIDER `ALL` / list | No provider predicate / items whose treating provider is in the list |
| DIAGNOSED DATE RANGE Start Date / End Date (`today` / `today`) | Items with `presented_date` in the range; a patient gets a document when at least one item qualifies, and the document holds only the qualifying items (INFERRED, family open question 2) |
| NAME RANGE Start Name / End Name (`AAAAA` / `ZZZZZ`) | Patients whose sort name `Last, First` falls in the range, prefix rule; the sentinels add no predicate |
| NAME RANGE `SEARCH` (both) | Superseded: the lookup icon inside each box writes `Last, First` |
| TREATMENT PLAN ID blank / `<n>` | All plans / only the plan with `plan_no = n` of each selected patient |
| PHASE ID blank / `<n>` | All phases / only items with `phase_id = n` |
| ORDER ID blank / `<n>` | All items / only items with `priority = n` |
| FINANCIAL DISCLOSURE `.Treatment Plan Disclosure` (first letter) / other letter | The disclosure text printed in part 7 of every document |
| EXCLUDE PATIENT TYPE `None` / list | Nothing excluded / patients with any selected type get no document |
| `Include Office UCR` ticked (default) / unticked | `UCR` column and its totals printed / left out |
| `Itemize Prices` ticked (default) / unticked | Amounts on every procedure line / lines without amounts, totals only (INFERRED) |
| `Include Completed Procedures` unticked (default) / ticked | Completed items (`is_completed`) left out / printed, marked `Completed` |
| `Print Responsible Party Address` unticked (default) / ticked | Name only / name and mailing address under `Resp. Party :` |

Dependency rules: none captured and none documented; every control is always enabled.

### Parameters - enhancements

| Enhancement | Key and type | Default | Effect |
|---|---|---|---|
| Patients selected elsewhere (bulk "Print proposals" from Treatment Plan Status, Treatment Plan Detail or a worklist) | `patient_ids` (`entity_multi`, shared, search source `patients`) | empty = no restriction | Documents only for these patients; set only through the bulk action or the lookup; never written to a URL |
| Patients on a given day's schedule (consult-day preparation) | `appointment_date` (`date`, NEW; owner 04) | blank = no restriction | Patients with a live appointment that day in `rpt_appointment_facts` at the selected offices |
| Item status choice, as on the single-patient dialog | `include_item_statuses` (`enum_multi`, NEW; options `diagnosed`, `accepted`, `unaccepted`, `hold`, `alternative`, `referred_out`; `accepts_all`) | `all` | Exclusive statuses printed; `all` reproduces the batch screen |
| Account name on the header (single-patient dialog option) | `print_account_name` (`boolean`, NEW) | `false` | Adds the guarantor account name above `Resp. Party :`; becomes the parity mapping if the hidden third row turns out to hold it |
| Legacy 2023 columns | column chooser (`Ord`, `Start Dt`, `End Dt`) | hidden | Screen and XLSX only; the PDF grid follows the 2025 layout |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_treatment_item_facts` (items), `rpt_patient_dim` (name, `chart_no`, `dob`, `patient_type_codes`, `account_id`), `rpt_account_dim` (guarantor name and address), `rpt_office_dim` (`office_name`; NEW columns `office_phone`, `office_fax`, `address_line1`, `address_line2` for the letterhead with the existing `city`, `state`, `zip` - owner `03_data_foundation.md`, DATA-05), `rpt_provider_dim` (`Prdr` = `provider_name`; `short_id` in the 2023 variant), `rpt_insurance_coverage` (carrier and group number per tier), `rpt_benefit_usage()` (remainders as of office-local today), passthrough `letter_templates` + `office_letter_templates` (disclosure text; NEW passthrough registration, owner 03 under DATA-45) |
| Item columns | `item_id`, `plan_id`, `plan_no` (NEW), `phase_id`, `priority`, `provider_id`, `diagnosed_date`, `presented_date`, `start_date`, `end_date`, `tooth`, `surface`, `procedure_code`, `description`, `exclusive_status`, `is_completed`, `fee`, `ucr_fee`, `insurance_estimate`, `est_patient`, `discount`; NEW `estimated_deductible` (from `treatment_plan_items.estimated_deductible`, for the `~` marker; owner 03) and `plan_name` (`treatment_plans.name`, the plan description) |
| Date basis | `diagnosed_date` (`presented_date`); printed `Prop. Dt` = `diagnosed_date` (INFERRED that the proposal date is the diagnosed date, open question 12) |
| Office / provider | `treatment_item_office` filters the items; treating provider |
| Document office | One document per patient. Its office (letterhead, `Office Phone #`, `Fax #`, disclosure letter assignment) = the working office when it is in the resolved office set, otherwise the `treatment_item_office` of the patient's earliest qualifying item (`presented_date`, `item_id`). Items of other offices in scope still print on the same document. Legacy behaviour for a patient whose plans span offices is not documented (open question 13) |
| Parameter binding | office scope, providers, date range, codes of the family: `WHERE` on items; name range and patient types: `WHERE` on `rpt_patient_dim`; `treatment_plan_id`: `plan_no = :n`; `phase_id`, `order_id`: equality; `include_completed_procedures = false`: `NOT is_completed`; `include_office_ucr`, `itemize_prices`, `print_responsible_party_address`: column and layout switches (role `query`, they select columns); `financial_disclosure_template_id`: one lookup per run |
| Benefits grid | Per patient and dental slot: `Ind Max`, `Ind Ded`, `Fam Max`, `Fam Ded` = plan limits; `Ind Max Rem` = `max_remaining_effective`; `Ind Ded Rem` = `deductible_remaining_effective`; `Fam Max Rem`, `Fam Ded Rem` = stored snapshots (`family_max_remaining_stored`, `family_ded_remaining_stored`), printed with "as stored on `slot_written_on`" in the footnote. The per-plan "annual max remaining after this plan" of the single-patient service (dry re-estimate) is not computed in batch |
| Insurance label | `carrier_name` + `group_number` (no plan-name column, AL-12 convention) |
| Disclosure merge | Merge fields are resolved by the letters feature's renderer per patient (PD-15); the report passes the template id and the patient id. NEW hook, owner `02_architecture.md` (renderer call from a PDF layout) |
| Availability | APP (coverage matrix row 52): migrated plans have no dates and are never selected; benefits grid family columns are stored snapshots; `Ind Max Rem` needs DATA-32 (P2) |

### Output

Report format `standard` (single format; `itemize_prices` is a column switch, not a format); PDF layout
`treatment_plan_proposal` (NEW renderer key, owner 02), `record_per_page = true` (group level `patient`). Engine
mechanisms used (RPT-TX-10 / RPT-TX-11): the patient and account boxes are the `header_template` of the `patient` level
(printed before the grid, no NEW placement needed); line amounts use `visible_when`; phase and plan totals, `Discount :`
and `Net Est Pat :` are `trailer_blocks` of the `phase_id` and `plan_no` levels, so they print whatever `itemize_prices`
says and `net_est_patient` exists only on total rows.

Block `items` (`table`, main):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `item_id` | - | id | `phi_identified` | hidden; `row_id_column` |
| `patient_id` | Pat ID | id | `phi_identified` | hidden group key level `patient` |
| `patient_sort_name` | - | text | `phi_identified` | hidden sort key (documents by name) |
| `patient_name`, `dob`, `chart_no` | Patient, DOB, Chart # | text, date, text | `phi_identified` | hidden; placeholders of the `patient` header |
| `responsible_party_name` | Resp. Party | text | `phi_identified` | hidden; header placeholder |
| `responsible_party_address` | (address) | text | `phi_identified` | hidden; selected only when `print_responsible_party_address = true` (role `query`), else NULL and the placeholder prints empty (`null_display ''`) |
| `office_phone`, `office_fax` | Office Phone #, Fax # | text | `aggregate` | hidden; header placeholders, document office (Data) |
| `primary_insurance_label`, `secondary_insurance_label` | Primary Insurance, Secondary Insurance | text | `phi_identified` | hidden; header placeholders |
| `plan_no` | Treatment Plan | integer | `phi_identified` | hidden group key, header `Treatment Plan : {plan_no} {plan_name}` |
| `plan_name` | - | text | `phi_identified` | hidden; header placeholder |
| `phase_id` | Phase | integer | `phi_identified` | hidden group key, header `Phase : {phase_id}` |
| `priority` | Ord | integer | `phi_identified` | `default_visible false` |
| `provider_label` | Prdr | text | `aggregate` | - |
| `diagnosed_date` | Prop. Dt | date | `phi_identified` | - |
| `start_date`, `end_date` | Start Dt, End Dt | date | `phi_identified` | `default_visible false` |
| `tooth` | Th | text | `phi_identified` | - |
| `surface` | Surf | text | `phi_identified` | - |
| `procedure_code` | Code | text | `phi_identified` | - |
| `description` | Description | text | `phi_identified` | - |
| `fee_marker` | (marker) | text | `phi_identified` | `*` when `discount > 0`, `~` when `estimated_deductible > 0`, printed beside `Fee` |
| `est_patient` | Est Pat. | money | `financial_patient` | no subtotal on this block; `visible_when ["truthy", "itemize_prices"]` |
| `insurance_estimate` | Est Ins. | money | `financial_patient` | as above |
| `fee` | Fee | money | `financial_patient` | as above |
| `ucr_display` | UCR | money | `financial_patient` | NEW computed `greatest(coalesce(ucr_fee, fee), fee)`; `visible_when ["and", ["truthy", "itemize_prices"], ["truthy", "include_office_ucr"]]` |
| `status_label` | Status | text | `phi_identified` | `visible_when ["truthy", "include_completed_procedures"]`; `Completed` on completed items |

Grouping: `patient` (document; key `patient_id`; `header_template` = the two boxes `Patient : {patient_name}   Pat ID :
{patient_id}   DOB : {dob}` / `Chart # : {chart_no}   Resp. Party : {responsible_party_name} {responsible_party_address}
Office Phone # : {office_phone}   Fax # : {office_fax}   Primary Insurance: {primary_insurance_label}   Secondary
Insurance: {secondary_insurance_label}`) -> `plan_no` (`trailer_blocks [plan_totals]`) -> `phase_id` (`trailer_blocks
[phase_totals]`); no grand total in the document (a document per patient).

Blocks `phase_totals` and `plan_totals` (`key_value`, trailer of the `phase_id` / `plan_no` level; one `totals_builder`
grouped by `patient_id`, `plan_no`, `phase_id`):

| key | label | type | data_class | rule |
|---|---|---|---|---|
| `total_label` | `Total for Phase {phase_id} :` / `Total for Treatment Plan {plan_no} :` | text | `aggregate` | label |
| `est_patient`, `insurance_estimate`, `fee` | Est Pat., Est Ins., Fee | money | `financial_patient` | sums of the group's lines, always printed |
| `ucr_display` | UCR | money | `financial_patient` | sum; `visible_when ["truthy", "include_office_ucr"]` |
| `discount` | Discount : | money | `financial_patient` | sum; NULL when the sum is 0, and the line is then omitted (legacy: "when any") |
| `net_est_patient` | Net Est Pat : | money | `financial_patient` | `computed difference(est_patient, discount)` on these total rows; NULL when `discount` is NULL |

Block `benefits` (`table`, `after_group` of `patient`): `coverage_tier` (Primary ... Quaternary), `family_max`,
`family_max_remaining`, `individual_max`, `individual_max_remaining`, `family_deductible`, `family_deductible_remaining`,
`individual_deductible`, `individual_deductible_remaining` - all money, `financial_patient`, no totals. Block `disclosure`
(`key_value`, `after_group` of `patient`): `disclosure_text` (`phi_identified` once merged), then the signature lines.
Sort: documents by `patient_sort_name`, `patient_id`; lines by `plan_no`, `phase_id`, `priority`, `diagnosed_date`,
`item_id` (INFERRED, open questions 7 and 14). Page break: a new page per document (fixed). Summary cards (screen only):
documents (`count_distinct patient_id`) and procedure lines (`count item_id`), totals of block `items`; no money card
(the line amounts are not served when `itemize_prices` is unticked). `schedulable = false` (per-record document).

### Visuals and drill-through

None - a document. Drill: `patient_name` -> `kind: record`, entity `patient`, route `patient_treatment_plan` (the patient's
treatment-plan screen, `phi_identified` plus the treatment-plan feature right); a plan header -> the same screen with the
plan selected.

### Actions

| Action | Scope | Kind | Detail |
|---|---|---|---|
| Open treatment plan | row (document) | `navigate` | Patient treatment-plan screen |
| Present and sign | row | `navigate` | Opens the single-patient print dialog of the treatment-plan screen in signature mode (shared `SignatureCapture`); the signed copy is stored by that feature as a patient document, as the legacy tool logs it to patient notes. The report run itself writes nothing (`side_effects = none`) |
| Book from plan | row | `navigate` | `openSchedulerForBooking` hand-off with the document's unscheduled item ids seeded |
| Export selection | bulk | `export_selection` | Full Control and `reports_export_data_files` |

Not a worklist.

### Export and print

PDF: portrait, Letter, letterhead of the document office (Data: `office_name`, address, `office_phone`, `office_fax`), `record_per_page`, `sectioned_page_numbers` (`Page n of m` per
document), `volume_size` 200 documents per file, `criteria_echo = none` on the documents (patient-facing) and a separate
cover page with the resolved criteria for the staff copy. XLSX: sheet `items` (one row per procedure line with
`patient_id`, `patient_name`, `plan_no`, `phase_id` repeated; no merged cells), sheet `benefits`, `criteria` sheet. CSV:
block `items`. Background run (AD-5) above 100 documents, with the artifact delivered in volumes.

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | What the hidden third OTHER OPTIONS row holds (`Print Account Name`, `Good Faith Estimate`, `X-Rays` are the candidates) | live legacy tool, criteria scrolled to the bottom or a taller window |
| 2 | Effect of `Itemize Prices` unticked | live legacy run, both states |
| 3 | Which item statuses the batch prints by default (all non-completed, or Diagnosed + Accepted as on the single-patient dialog) | live legacy run with items in every status |
| 4 | Whether the batch prints the 2023 grid (`Ord`, `Start Dt`, `End Dt`) or the 2025 grid, and `Prdr` as code or name | live legacy run |
| 5 | What the legacy Excel output of this report contains | live legacy run with PRINT FORMAT Excel |
| 6 | Whether the batch output can be signed (signature viewer) or only the single-patient print | live legacy run |
| 7 | Document order (patient name, chart, diagnosed date) | live legacy run |
| 8 | Which DentC `letter_type` holds Financial Disclosure letters; payment-plan contracts use definitions group `financial_disclosure` instead - one source for both? | product decision with 04 (option source `financial_disclosure_letters`) |
| 9 | ORDER ID meaning: does it filter the order id (priority) within the phase? (INFERRED from the field definition) | live legacy run with ORDER ID 2 on a phase with three orders |
| 10 | With `Print Responsible Party Address` unticked, is the address really left out (the 2023 / 2025 single-patient samples show it)? | live legacy run, both states |
| 11 | Is the printed `UCR` the higher of the office UCR and the fee-schedule fee (`ucr_display`), or the office UCR as stored? | live legacy run with an item whose insurance fee exceeds the office UCR |
| 12 | Is `Prop. Dt` the diagnosed date or a separate proposed date? | live legacy run with an item edited after back-dating its diagnosed date |
| 13 | For a patient whose plan items belong to several offices, does the batch print one document (which letterhead) or one per office? | live legacy run, office group, patient with items in two offices |
| 14 | Line order inside a phase (order id, diagnosed date, code) | live legacy run with a phase of items entered out of order |
| 15 | What prints when the office has no Financial Disclosure letter assigned (taken: no disclosure block) | live legacy run in an office without the letter |

## Treatment Plan Status - `treatment_plan.treatment_plan_status`

Treatment Plan Reports › Treatment Plan Status, screenshot `2.PNG` (complete, vendor full-height screenshot) - P3 - M - right family `treatment_plan` - interactive - DOCUMENTED (Detail, 2013 sample); Summary INFERRED

### Purpose

Front office and treatment coordinators run it daily, weekly and at month end to find patients with treatment that is
diagnosed or accepted but not yet scheduled or completed, and call them. Vendor recipes: exclude Scheduled and Completed
(everything not yet booked or done); or status Accepted and exclude Completed and / or Scheduled (works only where staff
mark items Accepted). Management uses the Summary to size the pending treatment value per patient.

### Legacy output

Printed title `Treatment Plan Status - Detail` (2013 sample, 12 pages for seven months of one office). One line per planned
procedure:

| # | Column | Content |
|---|---|---|
| 1 | `T ID` | Treatment plan number |
| 2 | `Ph` | Phase id |
| 3 | `Ord` | Order id |
| 4 | `Sts` | Exclusive status letter |
| 5 | `PA Sts` | Pre-auth status |
| 6 | `Sch` | Scheduled flag (`Y` / `N`) |
| 7 | `Com` | Completed flag (`Y` / `N`) |
| 8 | `Diag. Dt / Accept Dt` | Diagnosed and accepted dates (two lines in one cell) |
| 9 | `Start Dt / End Dt` | Start and end dates (two lines) |
| 10 | `Th` | Tooth |
| 11 | `Surf` | Surface |
| 12 | `Code` | Procedure code |
| 13 | `Description` | Code description |
| 14 | `Prdr` | Provider code |
| 15 | `Est. Pat` | Estimated patient portion |
| 16 | `Est. Ins` | Estimated insurance portion |
| 17 | `Total` | 15 + 16 |

Band per patient: `Patient : <name>   Pat ID : <id>   Chart# :   (H) : ...   (C) : ...   (W) : ...`. Subtotals
`Total for Phase <n> :`, `Total for Plan <n> :`, `Total for Patient :` over columns 15-17. Patient blocks follow
diagnosed-date order in the sample (INFERRED rule). Footer echo `From`, `Thru`, `Providers : ALL`, `Tx Plan : ALL`,
`Exclude Tx Plan : S,C`, `Exclude Pat Type`. No grand total is visible in the sample. Summary: not documented; taken to
print patient-level totals only (INFERRED). Kept: two-layer status, letters, Y / N flags. Kept in the PDF: the two-line date cells
(`diagnosed_date` over `accepted_date`, `start_date` over `end_date`). Deliberate fix: screen, XLSX and CSV show the four
dates as separate columns; a grand total is added (enhancement, labelled `Total :`).

### Parameters - legacy parity

<!-- PARITY:treatmentplan_reports.r02:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT FORMAT | (no label) (radio_group) | **Detail** / Summary | `report_format` | enum | Detail -> `detail`, Summary -> `summary` | `detail` | replicated | Detail = one line per planned procedure under a patient band with plan and phase subtotals (DOCUMENTED, 2013 sample, printed title 'Treatment Plan Status - Detail'). Summary = one line per patient with the same three amount columns (INFERRED: not documented by the vendor; confirm on the live tool). Same population in both formats. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Office attribution on this family: office of the planned procedure = rpt_treatment_item_facts.office_id (today coalesce(treatment_plans.office_id, patients.home_office_id); the item's own Treating Office after DATA-39, P3). Not the patient's home office and not the office of a later appointment. Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. The PDF prints one 'Office : <name>' band per office. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Provider role on this family: the treating provider of the planned procedure (rpt_treatment_item_facts.provider_id, legacy Prdr), not the diagnosing provider (diagnosed_by_raw, a legacy provider id on migrated rows) and not the patient's preferred provider. Items without a provider (every migrated item) match only ALL. Searchable multi-select of every provider, active and inactive, roster of the working office first (prefer, never exclude). Footer echo 'Providers : ALL'. |
| DIAGNOSED DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary range, fixed date_basis = diagnosed_date, bound to rpt_treatment_item_facts.presented_date = coalesce(diagnosed_date, office-local created date) of the planned procedure (vendor: the date range in which the procedures were entered into the plan; the diagnosed date defaults to the entry date and can be back-dated). Inclusive, office-local, default today. Migrated items carry no date: they are never selected by a range (presented_date must be NULL for them, not the load timestamp - request to 03). Footer echo From / Thru. |
| DIAGNOSED DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary range, fixed date_basis = diagnosed_date, bound to rpt_treatment_item_facts.presented_date = coalesce(diagnosed_date, office-local created date) of the planned procedure (vendor: the date range in which the procedures were entered into the plan; the diagnosed date defaults to the entry date and can be back-dated). Inclusive, office-local, default today. Migrated items carry no date: they are never selected by a range (presented_date must be NULL for them, not the load timestamp - request to 03). Footer echo From / Thru. |
| TREATMENT PLANS | (no label) (radio_group) | **ALL** / Diagnosed / Accepted / Alternative / Hold / Unaccepted / Pre-Authorized Sent / Scheduled / Completed / Referred Out / Pre-Authorized Closed | `treatment_plan_status` | enum | ALL -> `all`, Diagnosed -> `diagnosed`, Accepted -> `accepted`, Alternative -> `alternative`, Hold -> `hold`, Unaccepted -> `unaccepted`, Pre-Authorized Sent -> `pre_authorized_sent`, Scheduled -> `scheduled`, Completed -> `completed`, Referred Out -> `referred_out`, Pre-Authorized Closed -> `pre_authorized_closed` | `all` | replicated | Two-layer legacy status (03 section 3.2 table). Exclusive statuses bind to rpt_treatment_item_facts.exclusive_status independent of the Scheduled / Completed flags: diagnosed, accepted, unaccepted, hold, alternative; referred_out = exclusive_status IN (referred_out, external_referral, internal_referral). Data-imposed change: legacy Internal / External Referral are additive flags on top of an exclusive status (research), DentC stores them as the single item status, so a DentC IR / ER item matches Referred Out and not its former exclusive status - confirm on the live tool with an item flagged External Referral. scheduled = is_scheduled, completed = is_completed, pre_authorized_sent / pre_authorized_closed = preauth_status sent / closed (primary pre-auth row). ALL = no status predicate. Accepted also matches items with exclusive_status_inferred = true (printed A*); the run returns an availability[] warning treatment_item_status_inferred with their count. Never bound to status_norm. Footer echo 'Tx Plan'. |
| EXCLUDE TREATMENT PLANS | (no label) (picker) | shown: None | `exclude_treatment_plan_statuses` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: an item is dropped when it matches ANY picked status under the same predicates as TREATMENT PLANS (exclusive status, S / C flags, PS / PC pre-auth). None = exclude nothing. Option source treatment_plan_statuses: the ten legacy values (Accepted (A) and Alternative (L) INFERRED: above the visible part of the captured dialog) plus internal_referral, external_referral (enhancement: they pick the DentC item statuses that hold the legacy IR / ER flags; NEW echo letters IR, ER). An Accepted exclusion also drops inferred A* items. Footer echo prints the legacy letters ('Exclude Tx Plan : S,C'). Vendor recipe 'exclude Scheduled and Completed' = the unscheduled-treatment call list. |
| CODES | (no label) (picker) | shown: ALL | `procedure_codes` | entity_multi | - | `all` | replicated_enhanced | Include filter on the planned procedure code (rpt_treatment_item_facts.procedure_code IN list); ALL = no restriction. Legacy SEARCH CODE dialog (category radios, sort by code / description, transfer list) becomes the code picker with category tree (FLT-25). |
| TX COUNSELOR | (no label) (picker) | shown: ALL | `tx_counselor_ids` | entity_multi | - | `all` | replicated_enhanced | Treatment counselor of the planned procedure = rpt_treatment_item_facts.counselor_user_id (a user, option source users, id and label only). ALL = no restriction; items without a counselor (every migrated item, and app items where none was chosen) match only ALL. Meaning from our transcription; the vendor documents the field, not the criterion. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter on the patient's user-defined types (rpt_patient_dim.patient_type_codes); None = exclude nothing; patients without a type kept unless the source row no_type_defined is picked, which drops them (shared dictionary 3.4). Footer echo Exclude Pat Type (vendor sample). |
| OTHER OPTIONS | Include Inactive Patients (checkbox) | **unchecked** | `include_inactive_patients` | boolean | - | `false` | replicated | Unticked (default) = only items of active patients (rpt_patient_dim.is_active); ticked adds inactive patients. Inactive and deleted patients share the flag until DATA-44. |
| OTHER OPTIONS | Include internal plan id (checkbox) | **unchecked** | `include_internal_plan_id` | boolean | - | `false` | replicated | Ticked adds a column with the system's internal plan identifier (treatment_plans.id) beside T ID; unticked prints only the per-patient plan number. Effect INFERRED (not documented) - confirm on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:treatmentplan_reports.r02:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | Block `items`: one line per item under patient, plan and phase bands |
| REPORT FORMAT `Summary` | Block `patients`: one line per patient with item count and the three amounts (INFERRED layout) |
| PRINT FORMAT `PDF` / `Excel` | PDF banded table / flat XLSX; rows unchanged |
| OFFICE/GROUP `Office` / `Office Group`; picker `108` / list / `ALL` | Items whose `treatment_item_office` is in the resolved office set |
| PROVIDER `ALL` / list | Treating provider of the item |
| DIAGNOSED DATE RANGE Start / End (`today`) | Items with `presented_date` in the range |
| TREATMENT PLANS `ALL` (default) | No status predicate |
| TREATMENT PLANS `Diagnosed` / `Accepted` / `Unaccepted` / `Hold` / `Alternative` | `exclusive_status` = that value, whether or not the item is scheduled or completed. `Accepted` also matches items with `exclusive_status_inferred = true` (`A*`); the run returns `availability[]` warning `treatment_item_status_inferred` with their count |
| TREATMENT PLANS `Referred Out` | `exclusive_status IN ('referred_out', 'external_referral', 'internal_referral')`; DentC IR / ER items are included because DentC stores the legacy additive IR / ER flags as the item status (family open question 5) |
| TREATMENT PLANS `Scheduled` / `Completed` | `is_scheduled` / `is_completed` (any exclusive status) |
| TREATMENT PLANS `Pre-Authorized Sent` / `Pre-Authorized Closed` | `preauth_status = 'sent'` / `'closed'` |
| EXCLUDE TREATMENT PLANS `None` (default) | Nothing excluded |
| EXCLUDE TREATMENT PLANS any of `Diagnosed (D)`, `Accepted (A)` (INFERRED), `Unaccepted (U)`, `Hold (H)`, `Alternative (L)` (INFERRED), `Referred Out (R)`, `Scheduled (S)`, `Completed (C)`, `Pre-Authorized Sent (PS)`, `Pre-Authorized Closed (PC)` | Items matching ANY picked predicate are dropped; footer prints the letters. Accepted and Alternative were above the visible part of the captured dialog (open question 7). An `Accepted` exclusion also drops `A*` items (warning `treatment_item_status_inferred`) |
| EXCLUDE TREATMENT PLANS `internal_referral`, `external_referral` (enhancement) | Items with that DentC item status dropped; footer echo letters `IR`, `ER` (NEW) |
| CODES `ALL` / list | Item procedure code in the list |
| TX COUNSELOR `ALL` / list | `counselor_user_id` in the list; items without a counselor only under `ALL` |
| EXCLUDE PATIENT TYPE `None` / list | Patients with any selected type dropped |
| `Include Inactive Patients` unticked (default) / ticked | Active patients only / also inactive (and deleted, until DATA-44) |
| `Include internal plan id` unticked (default) / ticked | `T ID` only / also the internal plan id column (INFERRED) |

Dependency rules: none (all controls always enabled). TREATMENT PLANS and EXCLUDE TREATMENT PLANS combine with AND
(status selected, then exclusions removed), which is what both vendor recipes rely on.

### Parameters - enhancements

| Enhancement | Key and type | Default | Effect |
|---|---|---|---|
| Sort | `sort_by` (`enum`, shared key; options NEW for this report: `diagnosed_date`, `patient_last_name`, `total_amount_desc`, `diagnosed_date_desc`) | `diagnosed_date` (legacy order: earliest diagnosed patient first) | Order of patient blocks; lines inside a patient keep plan, phase, order |
| Accepted-date window (follow-up of accepted cases) | `accepted_date` (`date_range`, NEW key, value keys `accepted_date_from`, `accepted_date_to`; owner 04) | blank = no restriction | On `accepted_date_effective`; app-era reliable after DATA-39 |
| Minimum value per patient (call the largest cases first) | `patient_total_over` (`decimal`, NEW) | `0.00` = no restriction | Patients whose listed `total_amount` is at least the value |
| Age of the pending item | column `days_since_diagnosed` | hidden | Office-local today minus `diagnosed_date` |
| Counselor column | column `counselor_label` | hidden | `rpt_user_dim.user_label` joined on `rpt_user_dim.user_id = counselor_user_id` |
| Family enhancements | `group_by`, `exclude_patients_with_future_appointment`, preset views | see Shared rules | - |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_treatment_item_facts`, `rpt_patient_dim` (`last_name`, `first_name`, `chart_no`, `phone` (H), `cell_phone` (C), `work_phone` (W), `is_active`, `patient_type_codes`), `rpt_provider_dim` (`short_id` for `Prdr`), `rpt_user_dim` (`user_label` on `user_id = counselor_user_id`), `rpt_appointment_facts` (enhancement only) |
| Columns used | `item_id`, `plan_id`, `plan_no` (NEW), `phase_id`, `priority`, `exclusive_status`, `exclusive_status_inferred`, `preauth_status`, `is_scheduled`, `is_completed`, `diagnosed_date`, `presented_date`, `accepted_date`, `accepted_date_effective`, `start_date`, `end_date`, `tooth`, `surface`, `procedure_code`, `description`, `provider_id`, `counselor_user_id`, `est_patient`, `insurance_estimate`, `fee` |
| Date basis | `diagnosed_date` (`presented_date`); `Accept Dt` prints the stored `accepted_date` (blank where only the effective date is known; reliable after DATA-39) |
| Office / provider | `treatment_item_office`; treating provider; counselor = `counselor_user_id` |
| Parameter binding | All criteria are `WHERE` predicates on the item or patient; `report_format` selects the block; `include_internal_plan_id` adds a column (role `query`) |
| Availability | APP (coverage matrix row 53). `Sts` of a scheduled or completed item that was never booked is inferred (`A*`); status as of a past date needs SCHEMA(25) (DATA-25) and is not offered. Migrated items never appear |

### Output

Format `detail`, block `items` (`table`, main):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `patient_id` | Pat ID | id | `phi_identified` | group key level `patient` (band) |
| `patient_name` | Patient | text | `phi_identified` | band label |
| `chart_no` | Chart# | text | `phi_identified` | band |
| `home_phone`, `cell_phone`, `work_phone` | (H), (C), (W) | text | `phi_identified` | band |
| `plan_no` | T ID | integer | `phi_identified` | group key level `plan` |
| `plan_id` | Internal plan id | text | `phi_identified` | `visible_when ["truthy", "include_internal_plan_id"]` |
| `phase_id` | Ph | integer | `phi_identified` | group key level `phase` |
| `priority` | Ord | integer | `phi_identified` | - |
| `status_letter` | Sts | text | `phi_identified` | `D`, `A`, `U`, `H`, `L`, `R`; `A*` when inferred |
| `preauth_letter` | PA Sts | text | `phi_identified` | `PS` / `PC` / blank |
| `scheduled_flag` | Sch | text | `phi_identified` | `Y` / `N` |
| `completed_flag` | Com | text | `phi_identified` | `Y` / `N` |
| `diagnosed_date` | Diag. Dt | date | `phi_identified` | - |
| `accepted_date` | Accept Dt | date | `phi_identified` | - |
| `start_date` | Start Dt | date | `phi_identified` | - |
| `end_date` | End Dt | date | `phi_identified` | - |
| `tooth`, `surface` | Th, Surf | text | `phi_identified` | - |
| `procedure_code`, `description` | Code, Description | text | `phi_identified` | - |
| `provider_code` | Prdr | text | `aggregate` | - |
| `est_patient` | Est. Pat | money | `financial_patient` | `sum` per phase, plan, patient; grand total |
| `insurance_estimate` | Est. Ins | money | `financial_patient` | same |
| `total_amount` | Total | money | `financial_patient` | same |
| `fee` | Fee | money | `financial_patient` | `default_visible false`; same rule |
| `first_presented_date`, `patient_sort_name`, `item_id` | - | date, text, id | `phi_identified` | hidden sort keys; `item_id` = `row_id_column` |

Grouping: `patient` (header `Patient : {patient_name}   Pat ID : {patient_id}   Chart# : {chart_no}   (H) : {home_phone}
(C) : {cell_phone}   (W) : {work_phone}`, subtotal `Total for Patient :`) -> `plan` (subtotal `Total for Plan {plan_no} :`)
-> `phase` (subtotal `Total for Phase {phase_id} :`); grand total `Total :` (enhancement). With `group_by = provider` or
`tx_counselor` an outer level is added above `patient`. Sort: `sort_by` (default `diagnosed_date` = patient blocks by
`first_presented_date`, then `patient_sort_name`, `patient_id`); lines by `plan_no`, `phase_id`, `priority`,
`procedure_code`, `item_id`. Page break: none (legacy has no control); `page_break_by` not offered.

Format `summary`, block `patients` (`table`, main): `patient_name`, `patient_id`, `chart_no`, `home_phone`, `cell_phone`,
`work_phone` (all `phi_identified`), `item_count` (integer, `aggregate`, `sum`), `est_patient`, `insurance_estimate`,
`total_amount` (money, `financial_patient`, `sum`); grand total `Total :`.

Summary cards (both formats): patients (`count_distinct patient_id`), procedures (`count item_id`), `est_patient`,
`insurance_estimate`, `total_amount` grand totals. No `reconciles_with` entry: `treatment_presented_amount` uses cohort
`COH` on `status_norm` (`era = 'app'`, leaves out `alternative`, `referred_out`, `external_referral`, `existing`, keeps
`internal_referral`), while this report filters on `exclusive_status`. Documented difference, tested in RPT-TX-13: for
`treatment_plan_status = all`, `exclude_treatment_plan_statuses = [alternative, referred_out]`, `include_inactive_patients
= true` and the other filters at their defaults, grand total of `fee` = `treatment_presented_amount` - fee of items with
`status_norm = 'internal_referral'` - fee of items whose `status_norm` is `scheduled` / `completed` and whose
`exclusive_status` is `alternative` or a referral value. Request to 05 (NEW): a cohort variant of the metric on
`exclusive_status`, after which an exact `reconciles_with` is declared. The preset "Unscheduled treatment" is not reconciled with `unscheduled_treatment_amount`: the metric is as of today,
uses the pending rule (`is_pending`, which also drops items with an end date and referred-out items) and has no diagnosed
range.

### Visuals and drill-through

Chart hint: stacked bar of `total_amount` by `status_letter` (one bar per provider when `group_by = provider`); otherwise a
list. Drill: patient band -> `kind: record` patient treatment-plan screen; item line -> `kind: record` the item's Edit
Treatment window on that screen; plan subtotal -> the screen with the plan selected. All need `phi_identified` and the
treatment-plan feature right.

### Actions

| Action | Scope | Kind | Detail |
|---|---|---|---|
| Open treatment plan | row | `navigate` | Patient treatment-plan screen |
| Book from plan | row | `navigate` | `openSchedulerForBooking` with the patient's listed unscheduled item ids seeded (never bare navigation to the scheduler) |
| Create follow-up task | row, bulk | `create_task` | One task per patient, assignee = counselor when set |
| Text / e-mail patients | bulk | `send_sms`, `send_email` | Handlers of the communication feature; `requires` consent; `no_correspondence`, `no_auto_sms`, `no_auto_email`, `sms_opt_out_at` give exclusion counts |
| Letters | bulk | `letters` | Letters feature (PD-15), one letter per patient |
| Print proposals | bulk | `navigate` | Opens `treatment_plan.treatment_plan_proposal` with `patient_ids` of the selection and the same office, provider and range |
| Export selection | bulk | `export_selection` | Full Control and `reports_export_data_files` |

Doubles as a worklist: `worklists.unscheduled_treatment` (DASH-34, right family `treatment_plan`) is the live version of
the preset "Unscheduled treatment" with follow-up outcomes; this report stays the parity print.

### Export and print

PDF: landscape (17 columns), `banded_table`, repeating header, patient bands, `Diag. Dt / Accept Dt` and `Start Dt / End
Dt` each stacked in one cell (NEW stacked-cell option of `banded_table`: `pdf_stack: [[diagnosed_date, accepted_date],
[start_date, end_date]]`, owner `02_architecture.md`), `criteria_echo = footer`, `Page : n of m`.
XLSX: one sheet per format, one row per item (detail) or per patient (summary), band fields repeated as columns, the two
date cells split into `diagnosed_date`, `accepted_date`, `start_date`, `end_date`, no merged cells, `autofilter`,
`criteria_sheet`. CSV: the main block. Background run when the estimate exceeds the inline row limit (month-end runs over
an office group).

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Layout of the Summary format | live legacy run with Summary |
| 2 | Effect of `Include internal plan id` | live legacy run, both states |
| 3 | Patient block order (earliest diagnosed date, name, id) | live legacy run with patients diagnosed out of name order |
| 4 | Whether a grand total prints | live legacy run, last page |
| 5 | Whether status `Scheduled` means "currently booked" (DentC `is_scheduled`) or "was ever scheduled" | live legacy run with a cancelled appointment |
| 6 | Whether the Diagnosed radio includes items that are scheduled or completed (our predicate: yes, exclusive status only) | live legacy run: Diagnosed with and without excluding S / C |
| 7 | Do Accepted (A) and Alternative (L) appear in the SELECT TREATMEN PLAN exclusion dialog (INFERRED: above the visible part)? | live legacy tool, open the dialog and scroll to the top |

## Treatment Plan Analysis - `treatment_plan.treatment_plan_analysis`

Treatment Plan Reports › Treatment Plan Analysis, screenshot `3.PNG` (complete) - P3 - M - right family `treatment_plan` - instant - DOCUMENTED (sample c. 2022 plus definitions; row set conflicts between vendor sources)

### Purpose

Office managers and management review it daily, weekly or monthly to see how much planned treatment sits in each status
and how the counts move through the workflow. Vendor advice: keep the default filters; the numbers are meaningful only
where staff maintain statuses. Ratios above 100% point to workflow gaps (work completed without being marked scheduled),
not to performance.

### Legacy output

Printed title `Treatment Plan Analysis`; one block per office (`Office : <name>`). Table `Treatments` · `Count` · `Amount`,
then a `Percentage :` section with two columns (count ratio, amount ratio) and a one-line explanation under each ratio.

| Row | Definition (vendor) |
|---|---|
| `Diagnosed`, `Accepted`, `Unaccepted`, `Hold`, `Alternative` | Items with that exclusive status that are not scheduled and not completed; mutually exclusive |
| `Referred Out` | Shown in the sample, not defined in the article; taken as the same rule |
| `Pre-Auth Sent`, `Pre-Auth Closed` | Items with that pre-auth status, not scheduled and not completed, whatever their exclusive status (overlap the rows above) |
| `Scheduled`, `Completed` | All scheduled / all completed items; an item can be both |

| Ratio (numerator to denominator) | Sample count % | Sample amount % |
|---|---|---|
| `Accepted to Diagnosed` | 2.96 | 1.94 |
| `Unaccepted to Diagnosed` | 1.97 | 1.90 |
| `Scheduled to Accepted` | 433.33 | 231.67 |
| `Pre - Authorized Closed to Pre - Authorized Sent` | 0.00 | 0.00 |
| `Completed to Scheduled` | 476.92 | 878.50 |

`Count` = number of items, `Amount` = their total value (taken as `fee`), ratio = numerator / denominator x 100. The rows
do not add up to the number of planned items (overlap by design); kept. Row-set conflict: the article defines
`Alternative` and `Pre-Auth Closed` but not `Referred Out`; the sample shows `Referred Out` and neither of the other two.
Decision: print all ten rows in the order Diagnosed, Accepted, Unaccepted, Hold, Alternative, Referred Out, Pre-Auth Sent,
Pre-Auth Closed, Scheduled, Completed, zero rows included (open question 1).

### Parameters - legacy parity

<!-- PARITY:treatmentplan_reports.r03:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Office attribution on this family: office of the planned procedure = rpt_treatment_item_facts.office_id (today coalesce(treatment_plans.office_id, patients.home_office_id); the item's own Treating Office after DATA-39, P3). Not the patient's home office and not the office of a later appointment. Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. The PDF prints one 'Office : <name>' band per office. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Provider role on this family: the treating provider of the planned procedure (rpt_treatment_item_facts.provider_id, legacy Prdr), not the diagnosing provider (diagnosed_by_raw, a legacy provider id on migrated rows) and not the patient's preferred provider. Items without a provider (every migrated item) match only ALL. Searchable multi-select of every provider, active and inactive, roster of the working office first (prefer, never exclude). Footer echo 'Providers : ALL'. |
| DIAGNOSED DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary range, fixed date_basis = diagnosed_date, bound to rpt_treatment_item_facts.presented_date = coalesce(diagnosed_date, office-local created date) of the planned procedure (vendor: the date range in which the procedures were entered into the plan; the diagnosed date defaults to the entry date and can be back-dated). Inclusive, office-local, default today. Migrated items carry no date: they are never selected by a range (presented_date must be NULL for them, not the load timestamp - request to 03). Footer echo From / Thru. |
| DIAGNOSED DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary range, fixed date_basis = diagnosed_date, bound to rpt_treatment_item_facts.presented_date = coalesce(diagnosed_date, office-local created date) of the planned procedure (vendor: the date range in which the procedures were entered into the plan; the diagnosed date defaults to the entry date and can be back-dated). Inclusive, office-local, default today. Migrated items carry no date: they are never selected by a range (presented_date must be NULL for them, not the load timestamp - request to 03). Footer echo From / Thru. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter on the patient's user-defined types (rpt_patient_dim.patient_type_codes); None = exclude nothing; patients without a type kept unless the source row no_type_defined is picked, which drops them (shared dictionary 3.4). |
| OTHER OPTIONS | Include Inactive Patients (checkbox) | **unchecked** | `include_inactive_patients` | boolean | - | `false` | replicated | Unticked (default) = items of active patients only; ticked adds inactive patients. Inactive and deleted share one flag until DATA-44. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:treatmentplan_reports.r03:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` / `Excel` | PDF blocks per office / flat XLSX with an `office_name` column |
| OFFICE/GROUP `Office` / `Office Group`; picker `108` / list / `ALL` | One block per office of the resolved set (items by `treatment_item_office`) |
| PROVIDER `ALL` / list | Treating provider of the item |
| DIAGNOSED DATE RANGE Start / End (`today`) | Cohort of items with `presented_date` in the range; every row and ratio counts only these items |
| EXCLUDE PATIENT TYPE `None` / list | Items of patients with any selected type left out of every row |
| `Include Inactive Patients` unticked (default) / ticked | Active patients only / also inactive |

Dependency rules: none.

### Parameters - enhancements

| Enhancement | Key and type | Default | Effect |
|---|---|---|---|
| True funnel by cohort | `report_format` (`enum`, NEW for this report: `standard` = legacy rows, `funnel`) | `standard` | `funnel`: the metric's own stage rule on `status_norm` within cohort `COH`: each item counted once at its furthest stage, `completed` (`is_completed`) > `scheduled` (`is_scheduled`) > `accepted` (`is_accepted`) > `open`; items outside `COH` (`status_norm` `alternative`, `referred_out`, `external_referral`) in a separate `outside` row that is not part of the four stages; acceptance and completion rates beside the legacy ratios |
| Organisation total block | `include_all_offices_total` (`boolean`, NEW) | `false` | Adds an `All offices` block after the office blocks when several offices are in scope |
| Codes | `procedure_codes` (`entity_multi`, shared) | `all` | Analysis for a code set (implants, crowns) |
| Comparison period | `compare_to` (FLT-26, P4) | `none` | Prior-period count and amount columns per row |
| Family enhancements | `group_by` (`provider`, `tx_counselor`): one block per office and provider / counselor | `none` | - |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_treatment_item_facts`; `rpt_patient_dim` (`is_active`, `patient_type_codes`); `rpt_office_dim` (band label) |
| Row predicates (all on items in the cohort) | Diagnosed ... Alternative: `exclusive_status = <value> AND NOT is_scheduled AND NOT is_completed`; Referred Out: `exclusive_status IN ('referred_out', 'external_referral', 'internal_referral') AND NOT is_scheduled AND NOT is_completed`; Pre-Auth Sent / Closed: `preauth_status = 'sent'` / `'closed'` `AND NOT is_scheduled AND NOT is_completed`; Scheduled: `is_scheduled`; Completed: `is_completed` |
| Measures | `count(item_id)` and `sum(fee)` per row, one `FILTER` clause per row in a single pass grouped by `office_id` |
| Ratios | `computed ratio(count_a, count_b)` and `ratio(amount_a, amount_b)` per office with the zero-denominator guard (empty cell, never 0 and never an error) |
| Date basis / attribution | `diagnosed_date` (`presented_date`); `treatment_item_office`; treating provider |
| Availability | APP (coverage matrix row 54). Current state: a cohort's rows change as items move, so re-running an old range gives today's distribution of that cohort, not the one printed then (DATA-25 for history) |

### Output

Format `standard`. Fixed outer group `office` (always, also for one office: the legacy band is printed), header `Office :
{office_name}`. Block `status_rows` (`table`, main):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | - | id | `aggregate` | hidden group key |
| `status_row` | Treatments | enum | `aggregate` | row dimension, fixed order of the ten rows |
| `item_count` | Count | integer | `aggregate` | none (rows overlap: no total row, deliberately) |
| `amount` | Amount | money | `financial_practice` | none |

Block `ratios` (`table`, `after_group` of `office`, title `Percentage :`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `ratio_label` | (ratio) | text | `aggregate` | five fixed rows |
| `ratio_note` | (explanation) | text | `aggregate` | NEW placeholder wording "<numerator> items as a share of <denominator> items, same cohort" until the five legacy lines are transcribed (open question 6), then the legacy text |
| `count_pct` | Count % | percent | `aggregate` | `computed ratio`, 2 decimals |
| `amount_pct` | Amount % | percent | `financial_practice` | `computed ratio`, 2 decimals |

Format `funnel` (enhancement): block `funnel` with `stage` (`completed`, `scheduled`, `accepted`, `open` - the four
`funnel_stage` values of `treatment_funnel_amount`, `status_norm` based, `COH`), `item_count`, `amount`, `share_of_parent`
over the four stages; row `outside` (items of `alternative`, `referred_out`, `external_referral` status) printed below,
outside the share. `reconciles_with`: the four stage amounts = `treatment_funnel_amount` and their shares =
`treatment_funnel_pct` for the same office set, providers and range when `include_inactive_patients = true` and
`exclude_patient_type_codes = none` (`outside` excluded; `internal_referral` items are in the stages, as in `COH`). The
`standard` rows reconcile with no metric (the legacy definitions overlap). Summary cards (screen only) read
block `headline` (`key_value`, placement `report_end`, `export {pdf: false}`; one row over all offices of the run, same
`FILTER` predicates as `status_rows`): `diagnosed_amount`, `accepted_amount`, `completed_amount` (money,
`financial_practice`), `completed_count`, `scheduled_count` (integer, `aggregate`, hidden) and
`completed_to_scheduled_count_pct` = `computed ratio(completed_count, scheduled_count)` (percent, `aggregate`); each card
is a total of that block, so no card is a ratio row of `ratios`. Sort and page break: fixed; PDF page break per office when more than one office.

### Visuals and drill-through

Chart: horizontal bars of `amount` per `status_row` per office (`charts[]` hint); `funnel` format uses `FunnelChart`
(DASH-11). Drill (`kind: report`, target `treatment_plan.treatment_plan_status`, `report_format = detail`, `office_ids`
<- the office of the block, `provider_ids`, `date_range`, `exclude_patient_type_codes`, `include_inactive_patients` copied;
with `group_by = provider` also `provider_ids <- {group: provider_id}`, with `group_by = tx_counselor` also
`tx_counselor_ids <- {group: counselor_user_id}`, so the drilled list matches the clicked block):

| Row clicked | Target parameters set |
|---|---|
| Diagnosed / Accepted / Unaccepted / Hold / Alternative / Referred Out | `treatment_plan_status` = that value, `exclude_treatment_plan_statuses = [scheduled, completed]` |
| Pre-Auth Sent / Pre-Auth Closed | `treatment_plan_status` = `pre_authorized_sent` / `pre_authorized_closed`, `exclude_treatment_plan_statuses = [scheduled, completed]` |
| Scheduled / Completed | `treatment_plan_status` = `scheduled` / `completed`, no exclusion |

A ratio row drills to its numerator row. The drill lands on exactly the items behind the count (reconciliation line in the
drill panel).

### Actions

None on rows (aggregate report); actions are taken on the drilled Treatment Plan Status list. Not a worklist.

### Export and print

PDF: portrait, `banded_table`, one office block per page group, `criteria_echo = footer`. XLSX: sheet `status_rows` and
sheet `ratios`, each with `office_id` and `office_name` columns, typed numbers and percents, no merged cells. CSV: block
`status_rows` (or `ratios` on request). Inline run (`instant`): one aggregate pass over the cohort.

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Current row set: are zero rows suppressed, and do `Alternative`, `Referred Out`, `Pre-Auth Closed` all print? | live legacy run over a range with items in every status |
| 2 | `Amount` = fee, estimate total or UCR | live legacy run against a known plan |
| 3 | Display of a ratio with a zero denominator | live legacy run with no accepted items |
| 4 | Whether an office group prints one block per office or one combined block | live legacy run with an office group |
| 5 | Product: should the hub default to the `funnel` format for dashboards while the parity report keeps `standard`? | product owner (PD list) |
| 6 | Exact text of the five one-line explanations printed under the ratios | live legacy run, transcribe the `Percentage :` section |

## Treatment Plan Detail - `treatment_plan.treatment_plan_detail`

Treatment Plan Reports › Treatment Plan Detail, screenshot `4.PNG` (complete) - P3 - S - right family `treatment_plan` - interactive - PARTIALLY DOCUMENTED (purpose, criteria and code picker documented; layout INFERRED)

### Purpose

Clinical leads and front office run it on demand to find the patients who have particular procedure codes in their
treatment plans: a campaign list (implant or whitening consults), a recall of a product or technique, or a check before a
specialist day. The documented use: set the range in which the plan was entered, pick one or more codes, print.

### Legacy output

No vendor sample. Reconstructed layout (INFERRED, basis: the `Treatment Plan Status - Detail` columns and the documented
purpose): group per procedure code (`Code - Description`); per item the patient (name, Pat ID, chart, phones), diagnosed
date, tooth, surface, status, provider, estimated patient, estimated insurance, fee; a subtotal per code; a grand total.
Printed title taken as the menu name `Treatment Plan Detail`. Comparable: Open Dental Treatment Finder (code-range filter).
The CODES picker (`SEARCH CODE`) offers `CATEGORY` radios (`Diagnostic`, `Restorative`, `Periodontics`, `Maxilo Prosth`,
`Prosth. fixed`, `Orthodontics`, `Other`, `Preventive`, `Endodontics`, `Prosth. remov`, `Implant Serv`, `Oral Surgery`,
`Adjunct Serv`, `All Medical`), `SORT BY` `Code` / `Desc`, a search box and a transfer list; the box is empty by default
(unlike Treatment Plan Status, where it shows `ALL`).

### Parameters - legacy parity

<!-- PARITY:treatmentplan_reports.r04:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Office attribution on this family: office of the planned procedure = rpt_treatment_item_facts.office_id (today coalesce(treatment_plans.office_id, patients.home_office_id); the item's own Treating Office after DATA-39, P3). Not the patient's home office and not the office of a later appointment. Mode office lists offices, mode office_group lists office groups; all = every office the caller may read. The PDF prints one 'Office : <name>' band per office. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Provider role on this family: the treating provider of the planned procedure (rpt_treatment_item_facts.provider_id, legacy Prdr), not the diagnosing provider (diagnosed_by_raw, a legacy provider id on migrated rows) and not the patient's preferred provider. Items without a provider (every migrated item) match only ALL. Searchable multi-select of every provider, active and inactive, roster of the working office first (prefer, never exclude). Footer echo 'Providers : ALL'. |
| DIAGNOSED DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary range, fixed date_basis = diagnosed_date, bound to rpt_treatment_item_facts.presented_date = coalesce(diagnosed_date, office-local created date) of the planned procedure (vendor: the date range in which the procedures were entered into the plan; the diagnosed date defaults to the entry date and can be back-dated). Inclusive, office-local, default today. Migrated items carry no date: they are never selected by a range (presented_date must be NULL for them, not the load timestamp - request to 03). Footer echo From / Thru. |
| DIAGNOSED DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary range, fixed date_basis = diagnosed_date, bound to rpt_treatment_item_facts.presented_date = coalesce(diagnosed_date, office-local created date) of the planned procedure (vendor: the date range in which the procedures were entered into the plan; the diagnosed date defaults to the entry date and can be back-dated). Inclusive, office-local, default today. Migrated items carry no date: they are never selected by a range (presented_date must be NULL for them, not the load timestamp - request to 03). Footer echo From / Thru. |
| CODES | (no label) (picker) | (empty) | `procedure_codes` | entity_multi | - | `all` | unknown_legacy | Captured EMPTY on Treatment Plan Detail while the same picker shows ALL on three other reports. Vendor documentation: the report finds the patients who have the selected codes in their treatment plan, so a selection may be required. Candidates: empty = all codes (used until confirmed), or at least one code is required. Confirm on the live tool. Differs from the shared mapping: Same signature as the CODES picker whose default is ALL (sig0053); the empty default is unconfirmed on this report only. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter on the patient's user-defined types (rpt_patient_dim.patient_type_codes); None = exclude nothing; patients without a type kept unless the source row no_type_defined is picked, which drops them (shared dictionary 3.4). |
| OTHER OPTIONS | Include Inactive Patients (checkbox) | **unchecked** | `include_inactive_patients` | boolean | - | `false` | replicated | Unticked (default) = items of active patients only; ticked adds inactive patients. Inactive and deleted share one flag until DATA-44. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:treatmentplan_reports.r04:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` / `Excel` | PDF grouped by code / flat XLSX |
| OFFICE/GROUP `Office` / `Office Group`; picker `108` / list / `ALL` | Items whose `treatment_item_office` is in the resolved set |
| PROVIDER `ALL` / list | Treating provider of the item |
| DIAGNOSED DATE RANGE Start / End (`today`) | Items with `presented_date` in the range |
| CODES empty (captured default) | `unknown_legacy`: treated as all codes until confirmed (every planned item in the range, grouped by code); candidate alternative: a code is required |
| CODES list | Items whose `procedure_code` is in the list (SEARCH CODE category radios and sort become the category tree and sort of the code picker, FLT-25) |
| EXCLUDE PATIENT TYPE `None` / list | Patients with any selected type dropped |
| `Include Inactive Patients` unticked (default) / ticked | Active patients only / also inactive |

Dependency rules: none captured. If the live check shows that an empty CODES box blocks the run, the parameter gets
`required: true` with no default and the parity file is rebuilt.

### Parameters - enhancements

| Enhancement | Key and type | Default | Effect |
|---|---|---|---|
| Leave out done or booked work | `exclude_treatment_plan_statuses` (`entity_multi`, shared source `treatment_plan_statuses`) | `none` | Same predicates as on Treatment Plan Status; `[scheduled, completed]` gives the open campaign list |
| Code ranges, categories, saved code sets | `procedure_codes` picker extras (FLT-25) | `all` | `D6000-D6199` as one entry; "Implant Serv" category as one click |
| One line per patient | `report_format` (`enum`, NEW for this report: `standard` = the legacy layout, `patients`) | `standard` | `patients`: one row per patient and code with item count and amounts, for mailing lists |
| Family enhancements | `group_by`, `exclude_patients_with_future_appointment` | see Shared rules | - |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_treatment_item_facts`; `rpt_patient_dim` (name, `chart_no`, phones, `is_active`, `patient_type_codes`, outreach flags); `rpt_procedure_code_dim` (`description`, `code_category` for the picker); `rpt_provider_dim` |
| Columns used | `item_id`, `patient_id`, `procedure_code`, `description`, `presented_date`, `diagnosed_date`, `tooth`, `surface`, `exclusive_status`, `exclusive_status_inferred`, `is_scheduled`, `is_completed`, `provider_id`, `est_patient`, `insurance_estimate`, `fee` |
| Date basis / attribution | `diagnosed_date` (`presented_date`); `treatment_item_office`; treating provider |
| Parameter binding | All criteria are `WHERE` predicates; `procedure_codes` list -> `procedure_code IN (...)` (an ad-hoc range compiles to `procedure_code BETWEEN :low AND :high`, a category to the codes of that `code_category`; a saved code set resolves through `EXISTS rpt_code_in_group(tenant_id, group_key, procedure_code, presented_date)`, never a join) |
| Availability | APP (coverage matrix row 55); migrated items never appear |

### Output

Format `standard`, block `items` (`table`, main):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `procedure_code` | Code | text | `phi_identified` | group key level `code`, header `{procedure_code} - {description}`; repeated on every patient row (XLSX, CSV), hence `phi_identified` on this block |
| `description` | Description | text | `phi_identified` | group label; same rule |
| `patient_name` | Patient | text | `phi_identified` | `count_distinct patient_id` per code as `Patients : n` |
| `patient_id` | Pat ID | id | `phi_identified` | - |
| `chart_no` | Chart# | text | `phi_identified` | - |
| `home_phone`, `cell_phone` | (H), (C) | text | `phi_identified` | - |
| `diagnosed_date` | Diag. Dt | date | `phi_identified` | - |
| `tooth`, `surface` | Th, Surf | text | `phi_identified` | - |
| `status_letter` | Sts | text | `phi_identified` | exclusive letter, `A*` when inferred |
| `scheduled_flag`, `completed_flag` | Sch, Com | text | `phi_identified` | `Y` / `N` |
| `provider_code` | Prdr | text | `aggregate` | - |
| `est_patient` | Est. Pat | money | `financial_patient` | `sum` per code; grand total |
| `insurance_estimate` | Est. Ins | money | `financial_patient` | same |
| `fee` | Fee | money | `financial_patient` | same |
| `item_id`, `patient_sort_name` | - | id, text | `phi_identified` | hidden; `row_id_column`, sort key |

Subtotal per code: `Total for Code {procedure_code} :` with item count, patient count and the three amounts; grand total
`Total :`. Sort: codes ascending; inside a code `patient_sort_name`, `diagnosed_date`, `item_id` (INFERRED). Page break:
none. Format `patients` (enhancement): `procedure_code`, `patient_name`, `patient_id`, `chart_no`, phones, `item_count`,
`fee` sum. Summary cards: patients (distinct), items, `fee` total.

### Visuals and drill-through

Chart hint: bar of patients per code (top 15). Drill: code subtotal -> `kind: report` `treatment_plan.treatment_plan_status`
(`procedure_codes = [<code>]`, office, providers, range, patient-type exclusion, inactive switch and `exclude_treatment_plan_statuses <- {param: exclude_treatment_plan_statuses}` copied; with `group_by` also the group's `provider_ids` / `tx_counselor_ids`; target `report_format = detail`); patient cell -> `kind: record` patient treatment-plan screen.

### Actions

| Action | Scope | Kind | Detail |
|---|---|---|---|
| Open treatment plan | row | `navigate` | Patient treatment-plan screen |
| Book from plan | row | `navigate` | `openSchedulerForBooking` with the listed item ids seeded |
| Text / e-mail patients | bulk | `send_sms`, `send_email` | Consent exclusions as on Treatment Plan Status; one message per patient (de-duplicated across codes) |
| Letters, postcards, labels | bulk | `letters`, `postcards`, `labels` | Owning features (PD-15), one per patient |
| Create task | row, bulk | `create_task` | Follow-up task per patient |
| Print proposals | bulk | `navigate` | `treatment_plan.treatment_plan_proposal` with `patient_ids` of the selection |
| Export selection | bulk | `export_selection` | Full Control and `reports_export_data_files` |

Usable as an ad-hoc campaign list; not a standing worklist.

### Export and print

PDF: landscape, `banded_table`, code bands with subtotals, `criteria_echo = footer` (`Codes : <list>`, NEW label, family open question 6), `Page : n of m`.
XLSX: one row per item with `procedure_code` and `description` repeated, typed amounts, no merged cells, `criteria_sheet`.
CSV: the main block. Inline run; background only above the inline row limit (an all-codes run over an office group).

### Open questions

| # | Question | Where to check |
|---|---|---|
| 1 | Does an empty CODES box mean all codes, or must a code be picked? | live legacy run with the box empty |
| 2 | Actual output layout: columns, grouping per code or per patient, totals | live legacy run, PDF and Excel |
| 3 | Does the report list completed and scheduled items, or only open ones? | live legacy run with a completed item of a picked code |

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-TX-01 | Shared treatment-plan parameter set and option sources: status vocabulary helper (ten legacy values -> predicates of the status table, letters for the footer echo), `treatment_plan_statuses`, `financial_disclosure_letters`, `users` for `tx_counselor_ids`, `ProviderParam` treating role | P3 | S | FLT-06, FLT-09, FLT-13, DATA-56 | Each of the 4 definitions validates with the defaults of the parity file; every legacy status value selects exactly the items of its predicate on a fixture with all ten statuses and both flags; FLT-20 parity default tests pass |
| RPT-TX-02 | Dataset corrections requested from 03 for this family: `plan_no`, `presented_date` office-local for app rows and NULL for undated migrated items, `est_patient` over both estimate tiers, NEW `rpt_office_dim` letterhead columns (`office_phone`, `office_fax`, `address_line1`, `address_line2`, DATA-05) | P3 | S | DATA-56, DATA-39 | `plan_no` equals `assignTids()` on a patient with three plans; a range covering the migration day returns no migrated item; an undated app item created at 23:30 office time (next day in UTC) gets that office-local date as `presented_date`; `est_patient + insurance_estimate` equals the legacy `Total` on an item with a secondary estimate |
| RPT-TX-03 | Family conventions: title templates, footer criteria echo labels (`Tx Plan`, `Exclude Tx Plan : S,C`, `Exclude Pat Type`; NEW `Codes`, `Tx Counselor`, echo letters `IR`, `ER`; r01 cover-page labels), `A*` inferred-status marker, `availability[]` warnings (`treatment_plan_app_era_only`, office before DATA-39, NEW `treatment_item_status_inferred`) | P3 | S | ENG-23, FLT-18, RPT-TX-01 | PDF footers print the legacy echo labels with status letters (`IR` / `ER` for the extra values); a run over an undated-office plan prints the warning in the criteria block; an `accepted` run over an `A*` item returns `treatment_item_status_inferred` with count 1 |
| RPT-TX-04 | Live legacy verification for this category: hidden third option row of r01, Summary format of r02, empty CODES box of r04, Itemize Prices and Include internal plan id effects, Analysis row set, family open questions 1-4 | P3 | S | FLT-23 | Every `unknown_legacy` and inferred note of `treatmentplan_reports.parity.json` is resolved or re-confirmed and the parity file rebuilt PARITY VALID |
| RPT-TX-05 | Family enhancements: `group_by` provider / counselor, `exclude_patients_with_future_appointment`, shipped preset views | P3 | M | RPT-TX-13, RPT-TX-15, RPT-TX-17, ENG-28 | Default runs are identical to the legacy-parity runs; each preset view opens with the documented parameters |
| RPT-TX-10 | `treatment_plan.treatment_plan_proposal` definition and builder: document grain per patient (document office rule), patient `header_template` boxes, plan and phase bands, `phase_totals` / `plan_totals` trailer blocks with Discount and Net Est Pat, `ucr_display`, markers, `schedulable = false`, benefits block from `rpt_benefit_usage()`, disclosure lookup, all eleven criteria and the enhancement keys | P3 | L | RPT-TX-01, RPT-TX-02, DATA-56, DATA-39, DATA-32, ENG-11 | Golden fixture of two patients with two plans, three phases, a discount, a deductible and an item whose fee-schedule fee exceeds the office UCR: phase and plan totals (trailer blocks), `Net Est Pat`, `ucr_display` and markers equal hand-computed values; with `itemize_prices = false` the lines carry no amounts and the totals are unchanged; TREATMENT PLAN ID 2 prints only each patient's second plan; completed items appear only with `include_completed_procedures = true` |
| RPT-TX-11 | PDF layout `treatment_plan_proposal`: record-per-page documents, header boxes, 2025 grid, benefits grid, merged disclosure through the letters renderer, signature lines, per-document page numbers, volumes | P3 | L | ENG-23, ENG-26, ENG-22, RPT-TX-10 | A 250-patient run produces two volumes; each document restarts `Page n of m`; the disclosure prints merged tooth numbers; the layout matches the single-patient print of `TxPlanReportModal.tsx` field for field |
| RPT-TX-12 | Proposal row actions: open treatment plan, present and sign (single-patient print dialog in signature mode), book from plan through `openSchedulerForBooking` | P3 | M | ENG-49, UX-22, RPT-TX-10 | Present and sign opens the patient's dialog with the plan and phase of the document preselected; the signed copy is stored by the treatment-plan feature; the run itself writes no row |
| RPT-TX-13 | `treatment_plan.treatment_plan_status` definition: Detail and Summary formats, status radio and exclusion picker on the two-layer predicates, counselor and code filters, internal plan id column, patient bands with three phones | P3 | M | RPT-TX-01, RPT-TX-02, DATA-56, DATA-39, ENG-11, ENG-23 | Vendor recipe fixtures: exclude S, C lists exactly the items neither booked nor charged; Accepted + exclude S, C lists exactly accepted unbooked uncharged items; on a fixture with alternative, referred-out, internal-referral and alternative-then-scheduled items the grand total of `fee` equals `treatment_presented_amount` minus the documented difference; `Accepted` returns the `A*` items with warning `treatment_item_status_inferred`; the PDF stacks the two date pairs |
| RPT-TX-14 | Treatment Plan Status as a call list: bulk SMS / e-mail / letters / tasks / print proposals with consent exclusion counts; preset "Unscheduled treatment" aligned with `worklists.unscheduled_treatment` | P3 | M | ENG-49, DASH-31, DASH-34, SEC-36, RPT-TX-13 | Bulk text to 50 listed patients reports the consent exclusions before sending; print proposals opens r01 with the 50 `patient_ids`; the preset and the worklist list the same patients on a fixture without end-dated items |
| RPT-TX-15 | `treatment_plan.treatment_plan_analysis` definition: ten status rows per office in one filtered pass, five guarded ratios, drill map to Treatment Plan Status | P3 | M | RPT-TX-01, DATA-56, DATA-39, ENG-11, ENG-30 | The vendor sample counts (203, 6, 4, 4, 13, 10, 26, 124) reproduce the sample ratios to two decimals; a zero denominator prints an empty cell; every row drill returns exactly its count of items |
| RPT-TX-16 | Treatment Plan Analysis enhancements: `funnel` format, organisation total block, code filter, comparison period | P4 | M | RPT-TX-15, MET-15, FLT-26 | `funnel` four stage amounts reconcile with `treatment_funnel_amount` with `include_inactive_patients = true` (the `outside` row excluded, `internal_referral` items inside the stages); the `standard` default run is unchanged; comparison columns use the same cohort rule for the prior period |
| RPT-TX-17 | `treatment_plan.treatment_plan_detail` definition: format `standard` (code-grouped item list with patient and code subtotals), CODES default per the live check, `exclude_treatment_plan_statuses` and `patients` format enhancements, drill to Treatment Plan Status carrying the exclusion | P3 | S | RPT-TX-01, RPT-TX-04, DATA-56, FLT-25 | Two picked codes produce two bands whose subtotals equal row sums and whose patient counts are distinct counts; an empty CODES box behaves as confirmed by RPT-TX-04 |
| RPT-TX-18 | Treatment Plan Detail campaign actions: bulk SMS, e-mail, letters, postcards, labels, tasks, print proposals, de-duplicated per patient | P3 | S | ENG-49, DASH-31, RPT-TX-17 | A patient listed under two codes receives one message; exclusion counts match the consent flags of `rpt_patient_dim` |

<!-- ASSEMBLED from catalog/parts/treatmentplan_reports/ (00_header.md, 10_reports.md). Edit this document directly from now on. -->
