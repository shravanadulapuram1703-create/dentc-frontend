# Daily Reports - report specifications

End-of-day and next-day operational reports: what was posted, produced, collected and deposited today, what is booked
for tomorrow, and what is missing from today's visits. Hub location: **Financial › Daily** (brief section 1), category key
`daily`, report keys `daily.*`. Default phase **P1** (brief section 6: Daily financial core); every report of the family ships in P1.

## Overview

Rating = coverage matrix 11.1 (default run). Confidence = `research/legacy_report_outputs_daily_my.md` section 2.
Size per brief section 4 (S up to 2 days, M up to 1 week, L up to 2 weeks, XL more).

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `daily.peg_board_day_sheet` | Peg Board Day Sheet | All postings of one day with previous balance, charges, payments, adjustments and new balance (balancing sheet) | P1 | M | READY (frozen sheet: SCHEMA(29)) | INFERRED |
| `daily.daily_journal` | Daily Journal | Charges, payments and adjustments of a date range, line detail or code-level summary, with the Est. Pat. / Est. Ins. / Total block | P1 | L | READY (Created Date and User on history: REPAIR(10); Resp. Party Type: SCHEMA(53); migrated code lines: REPAIR(12)) | DOCUMENTED |
| `daily.production_report` | Production Report | Completed procedures posted in the range plus production adjustments, by code, provider, category or carrier | P1 | L | READY (by Carrier: REPAIR(10), SCHEMA(33); adjustment list on history: REPAIR(12)) | DOCUMENTED (Code, Provider); PARTIALLY DOCUMENTED (Category, Carrier, Detail) |
| `daily.collection_report` | Collection Report | Payments of the range with collection adjustments, by provider, carrier or code | P1 | L | READY (by Code: per-account derived allocations inline in P1, 31-day cap; allocation table P2 (DATA-26); by Carrier: APP / SCHEMA(33); payment-type picker on history: REPAIR(12)) | PARTIALLY DOCUMENTED |
| `daily.deposit_slip` | Deposit Slip | Payments of the range by tender section (cash, check, card, financing) to prove the bank deposit | P1 | M | READY (Payment Date basis: SCHEMA(13); Group Batch Checks: SCHEMA(28); tender on history: REPAIR(12)) | DOCUMENTED |
| `daily.scheduled_production` | Scheduled Production | Scheduled versus actual production and estimated (goal) production for current and future days | P1 | M | APP (migrated booked lines cover 6 % of appointments; Estimated Prod.: SCHEMA(24)) | PARTIALLY DOCUMENTED |
| `daily.routing_slip` | Routing Slip | One face sheet per appointment: demographics, alerts, recalls, visits, billing and aging, coverage, ortho plan, procedures | P1 | XL | READY (Billing Type: SCHEMA(53); first / last visit: REPAIR(19); last statement: SCHEMA(22); ortho block: APP) | DOCUMENTED |
| `daily.progress_notes` | Progress Notes | Notes of the range (Detail), unsigned notes, or appointments without a note | P1 | M | READY (Unsigned: APP; Missing exact per appointment and provider: SCHEMA(18)) | PARTIALLY DOCUMENTED |
| `daily.production_analysis_report` | Production Analysis Report | Production mix by ADA category per provider, or production and collection per patient by carrier | P1 | M | READY (Carrier variant: REPAIR(10), SCHEMA(33); collection per carrier: APP) | DOCUMENTED (columns in text) |
| `daily.daily_audit` | Daily Audit | Exception list of patient-days with an appointment, ledger transaction or note but missing another; empty = all clear | P1 | M | READY (visit-code flags reviewed in setup, DATA-04; signed-note test: APP) | DOCUMENTED (columns in text) |
| `daily.claims_printed` | Claims Printed | Paper claims printed in the range, by carrier, detail or summary | P1 | S | SCHEMA(21) (prints are not recorded today; APP afterwards) | INFERRED |
| `daily.special_transaction_report` | Special Transaction Report | Filtered finder over procedure, payment and adjustment lines by provider, user, plan, patient range, age and amount | P1 | L | READY (codes on history: REPAIR(12); Service vs Transaction date on charges: SCHEMA(13); plan grouping on today's coverage until SCHEMA(33)) | DOCUMENTED |

Phase notes. No report needs a phase override: `daily.claims_printed` depends on DATA-21 (P1) and lists only prints
recorded after it lands (availability code, below). Every legacy option runs in P1: Collection Report by Code runs inline
on per-account derived allocations (`rpt_fifo_allocations()`, DATA-20, ENG-59) with a 31-day cap; Collection by Carrier
runs on remittance legs (RPT-DAILY-22a); Group Batch Checks `Check#` groups by check number (RPT-DAILY-40). The P2 parts
(allocation table DATA-26, Deposit Slip deposit date and Batch ID grouping on DATA-28, stamped carriers on DATA-33,
background runs ENG-38) ship as availability warnings and later switches on the P1 definitions, not as later reports. INFERRED outputs (Peg Board Day Sheet, Claims Printed) need a product decision and a
live printout before their columns are frozen (research section 8 item 8).

## Shared rules

### Parameters shared by the family

Keys are those of `catalog/reference/filter_card.md` section 3; the per-report mapping is in each section's generated parity table.

| Parameter (value keys) | Type | Legacy control | Default (= legacy) | Reports | Family rule |
|---|---|---|---|---|---|
| `output_format` | `enum` | PRINT FORMAT PDF / Excel (+ `csv`) | `pdf` | all but Routing Slip | `role: output`; never changes rows; PRINT / PREVIEW = run then render. Routing Slip has no PRINT FORMAT (PDF only) |
| `office_scope` (`office_ids`, `office_group_id`, `office_group_ids`, `all_offices`) | `office_scope` | OFFICE/GROUP radio + picker | mode `office`, `office_ids = working_office`; mode `office_group` default `all` | all | Office band `Office : <name>` is the outer group when `["ctx", "multi_office"]`. Routing Slip: option `office_group` disabled (`option_enabled_when false`) |
| `provider_ids` | `entity_multi` | PROVIDER / PROVIDER/USER > Provider; Production Report PROVIDERS (vendor-doc) | `all` | r01, r02, r03, r05, r06, r07, r09, r10, r11, r12 | Role differs per report (attribution table below). Never scoped by `providers.office_id`; roster-first ordering only |
| `preferred_provider_ids` | `entity_multi` | PROVIDER > Preferred Provider | `all` | r08 | `rpt_patient_dim.preferred_provider_id`; migrated patients match only under `all` |
| `user_ids` | `entity_multi` | PROVIDER/USER > User | `all` | r02, r05, r12 | `user_key` of the ledger leg (data_card 5.4); migrated rows match only under `all` |
| `date_range` (`date_from`, `date_to`, `date_preset`) | `date_range` | DATE RANGE Start / End Date | `today` / `today` (office-local) | all but r01 | Inclusive, office-local; presets and relative tokens are additive (filter_card 12) |
| `date_basis` | `enum` | DATE RANGE radio | first legacy option | r02 (`transaction_date` / `created_date`), r05 (`transaction_date` / `payment_date`), r08 (`service_date` / `created_date` / `appointment_date`), r12 (`transaction_date` / `service_date`) | Others have a fixed `date_basis` on the definition (table below) |
| `report_date` | `date` | REPORT DATE | `today` | r01 | role `single_day` |
| `report_format` | `enum` | REPORT FORMAT | `detail`; `summary` on Production Report | r02, r03, r04, r11 | Production Report: forced `summary` unless `report_by = provider` |
| `group_by`, `page_break_by` (member `group`) | `enum` | GROUP BY / COLLECTION BY + Page Break | `none` / unticked | r02, r03, r04, r10, r12 (`group_by` only, default `code`) | Page Break enabled only when grouped; Daily Audit auto-ticks it for `provider` |
| `sort_by` | `enum` | SORT BY | first legacy option (vendor-doc rows: default undocumented) | r03 (vendor-doc), r07, r10, r12 (vendor-doc) | Order inside the innermost group; `row_id_column` tie-breaker |

### Datasets, date bases and attribution

| Report | Datasets (`rpt_*`; backticks = OLTP passthrough) | Date basis | Office attribution (data_card 5.1) | Provider attribution (5.2) | User |
|---|---|---|---|---|---|
| Peg Board Day Sheet | `rpt_ledger_entries`, `rpt_charges` (tooth, surface), `rpt_patient_dim`, `rpt_account_dim`, `rpt_provider_dim`, `rpt_user_dim`, `rpt_transaction_code_dim`, `rpt_procedure_code_dim` | `transaction_date` = `report_date` | transaction office | ledger-line provider (`rpt_ledger_entries.provider_id`), inferred | - |
| Daily Journal | `rpt_ledger_entries` (`journal_column`), `rpt_charges`, `rpt_patient_dim`, `rpt_account_dim`, `rpt_user_dim`, `rpt_transaction_code_dim` | `date_basis` (default `transaction_date`) | transaction office | ledger-line provider (Prdr) | `user_key` |
| Production Report | `rpt_charges`, `rpt_adjustments`, `rpt_procedure_code_dim`, `rpt_provider_dim`, `rpt_claim_facts`, `rpt_insurance_coverage`, `rpt_fee_schedule_fees` | fixed `transaction_date` (posting date; equals service date on charges until DATA-13) | office of service | treating provider (`rpt_charges.provider_id`) | - |
| Collection Report | `rpt_payments`, `rpt_adjustments`, `rpt_fifo_allocations()` (by Code, P1) / `rpt_payment_allocations` (P2), `rpt_charges` | fixed `transaction_date` | transaction office (where applied) | credited provider on the payment (`rpt_payments.provider_id`; deviation from PD-7 for parity) | - |
| Deposit Slip | `rpt_payments`, `rpt_transaction_code_dim` | `date_basis` (default `transaction_date`) | posting office | credited provider on the payment | `user_key` |
| Scheduled Production | `rpt_appointment_procedures`, `rpt_appointment_facts`, `rpt_charges`, `provider_production_goals` (NEW, DATA-24), `rpt_provider_calendar_days()` (DATA-55), `rpt_provider_dim`, `rpt_office_dim` | `appointment_date` (scheduled), `transaction_date` (actual), inferred | composite NEW `appointment_or_service_office` (03 section 5.1) | composite NEW `line_or_treating_provider` (03 section 5.2), inferred | - |
| Routing Slip | `rpt_appointment_facts`, `rpt_appointment_procedures`, `rpt_patient_dim`, `rpt_patient_activity`, `rpt_account_dim`, `rpt_ar_open_items()`, `rpt_insurance_coverage`, `rpt_benefit_usage()` (P2; P1 per-patient service), `rpt_recall_due()` (P3; P1 per-patient recall service), `rpt_ortho_contracts` / `rpt_payment_plan_contracts` (P1 per-patient ortho service), `rpt_treatment_item_facts`, `rpt_charges` (completion test), `rpt_patient_alerts`, `rpt_referral_facts` (P3; P1 `rpt_patient_dim` + `referrals` count), `patient_notes`, `provider_route_slips` | `appointment_date` | appointment office | appointment provider | - |
| Progress Notes | `rpt_progress_note_facts`, `rpt_appointment_note_audit()`, `rpt_patient_dim` | `date_basis` (default `service_date` = note DOS) | office of the note / appointment | preferred provider (picker); note author printed | created by (printed) |
| Production Analysis Report | `rpt_charges`, `rpt_procedure_code_dim`, `rpt_provider_dim`, `rpt_claim_facts`, `rpt_payments` | fixed `service_date` | office of service | treating provider | - |
| Daily Audit | `rpt_visit_audit()` | date of the PATIENT HAS record | office of the record (same office, same day) | provider arrays of `rpt_visit_audit()` (vendor conflict: preferred vs transaction provider) | - |
| Claims Printed | `rpt_claim_facts`, `claim_print_events` (NEW, DATA-21) | fixed `claim_printed_date` (NEW), inferred | claim office | billing provider of the claim, inferred | - |
| Special Transaction Report | `rpt_ledger_entries`, `rpt_charges`, `rpt_insurance_coverage` (`reporting_subtype`), `rpt_patient_dim` | `date_basis` (default `transaction_date`) | transaction office | transaction provider (Tran Prdr) | `user_key` |

"Today" is the office's local date (AD-9, data_card 4.3); a multi-office run uses each office's own today. A NULL office
(migrated payments) is the member "Unassigned office" (data_card 5.1 rule 3).

### Money and sign conventions

| Rule | Detail |
|---|---|
| Sign | Amounts are `rpt_ledger_entries.amount`, signed by A/R impact: charges positive, payments negative, adjustments with their own sign (research 3.2). Deposit Slip prints payments as positive amounts (display transform `negative: minus` on the absolute value, declared on its columns) |
| Legacy columns | Journal and day-sheet columns use `journal_column` (`charges` / `payment` / `adjust`): production adjustments print in Charges, contract-billing charges (`non_production_charge`) in Adjust. Analytics figures (summary cards, `reconciles_with`) use `ledger_bucket`, never `journal_column` |
| Summary block | `Est. Pat.` / `Est. Ins.` / `Total` with sections Charges (Services plus one line per production adjustment code), Payments (one line per payment code), Adjustments (one line per adjustment code): one shared block builder for Daily Journal, Peg Board Day Sheet and the Collection Report summary tail |
| Production | Parity reports show the posted fee (`charged_fee`); UCR only where the legacy option asks for it (`include_ucr`, Journal `UCR` column = `office_fee`) (PD-1) |
| Ratios | `Avg $`, `Avg. Dur.`, `Eff. Rate $`, `Per %` are `computed` columns from unrounded components with a zero-denominator guard; total rows are true ratios (the legacy accumulated `Eff. Rate $` total is not copied, research section 1 item 11) |
| Migrated adjustments | `unclassified_adjustment` until DATA-12: printed in Adjust and listed as a separate line in summary blocks, with an availability warning (code NEW: `migrated_adjustments_unclassified`; the availability code list is owned by `03_data_foundation.md`) |

### Page furniture

| Element | Rule |
|---|---|
| Header | Practice-group name, report title from `title_templates` (variant titles: `Daily Journal - Detail` / `- Summary`, `Production by Codes`, `Production by Codes - Provider`, `Production by Provider`, `Collection Report by Code - Detail`, `Collection Report By Provider - Detail`, `Patient Progress Notes`) |
| Office band | `fixed_outer` level `Office : <office_name>` when `["ctx", "multi_office"]`, with `Total for Office : <name>` subtotal |
| Criteria echo | `pdf.criteria_echo = footer` (From / Thru or Transaction From / Thru, Offices, Providers, Users, Codes, Payment Types, Check Type, FeeID, starred option notes such as `* Includes UCR`, `* Show Patient`, `* With Adjustments(Collection)`); Special Transaction Report echoes at the `header`. XLSX: `criteria_sheet` |
| Footer | `Printed : <date time>` in the office zone, `Page : n of m`; the legacy vendor copyright line is not reproduced |
| XLSX | Flat typed sheet, one header row, no merged cells, blocks other than `main` on their own sheet (engine_card 3.8); replaces the legacy layout-preserving Excel |
| Availability | Matching `availability[]` entries are printed in the criteria block and returned as run warnings (codes per report section) |

### Rights and data classes

| Topic | Rule |
|---|---|
| Right family | `daily`: `reports_daily_reports_screen_view_only` (run + view) / `reports_daily_reports_screen_full_control` (also print, export, schedule) (security_card 2.2-2.3, PD-10). Data-file export additionally needs `reports_export_data_files` |
| Per-report override | `daily.progress_notes`: note text is a key column of class `clinical` (a caller without it is refused). `daily.daily_audit`: only note / signature presence, `phi_identified`, no `clinical` (security_card 5.2 rule 11) |
| Classes used | `phi_identified` (patient name, id, chart number, DOB, service facts on a patient row); `financial_patient` (money on patient / account / claim rows); `financial_practice` (totals by office, code, category, carrier, period; UCR and compare-fee columns); `provider_comp` (production or collections by a named provider: Production Report by Provider, Production Analysis by provider, Collection Report by Provider, Daily Journal grouped by provider); `payment_instrument` (Deposit Slip `Bank #`, `Check #`); `phi_sensitive` (Routing Slip `Sub ID`); `clinical` (Progress Notes text, Routing Slip `Med Alerts`); `aggregate` (code, category, carrier, office labels; user labels as operational attributes, rule 12) |
| Parameters | `patient_ids` (Routing Slip) and `patient_name` (Special Transaction Report) need `phi_identified` (rule 8) |
| Provider restriction | `scope.provider_restriction = none` on all twelve (the restricted twins are My Reports); `reports_view_all_providers` is not needed to pick providers here |
| Audit | Every run, print and export writes the audit event and patient manifest (AD-7, ENG-14); the per-patient documents (Routing Slip) are print-audited per patient |

### Family-wide enhancements (additive; defaults unchanged)

| Enhancement | Detail |
|---|---|
| Date presets | `today`, `yesterday`, `month_to_date` (04 section 7.4); NEW presets owned by 04 section 7.4: `tomorrow` = `tomorrow` / `tomorrow`, `next_7_days` = `today` / `today+6d`, `rest_of_month` = `today` / `end_of_month` (Routing Slip, Scheduled Production); NEW token `next_business_day` (Routing Slip) |
| Summary cards | Values are block totals of the same run: day production, collections, adjustments, deposit total, exceptions count (Daily Audit, Unsigned / Missing notes) |
| `reconciles_with` | Production Report totals ↔ `charged_production`, `production_adjustments`, `net_production`; Collection Report ↔ `gross_collections`, `collection_adjustments`, `net_collections`; Scheduled Production ↔ `scheduled_production` (metrics_card 5.1-5.2); tests, not second queries |
| Drill-through | Totals drill to `rows` of the same report (detail format); patient rows to the patient ledger, note, claim or appointment (`kind = record`, `phi_identified` + feature right) |
| Exception states | Daily Audit, Progress Notes (Unsigned / Missing) and Claims Printed show an explicit "all clear" empty state (`empty_when` test `no_detail_rows`) |
| Saved views, favorites, URL state, restore last run | Hub features (filter_card 12); legacy ADD / UPDATE MY FAVORITES = save view + favorite |
| Schedules | `schedulable: true` except Routing Slip (per-record document); delivery is a login-gated link (PD-12) |

### Family-wide open questions

| # | Question | Check on the live legacy tool |
|---|---|---|
| 1 | `Transaction Date` meaning: editable ledger date or entry date (vendor conflict) - affects Daily Journal, Deposit Slip, Special Transaction Report | Post a back-dated payment; run each report on both dates |
| 2 | Provider meaning on Peg Board Day Sheet, Collection Report, Scheduled Production, Claims Printed and Daily Audit (inferred or conflicting) | Run with one provider picked against a patient whose lines carry two providers |
| 3 | Picker dialogs (Provider, User, Operatory, Payment Types, Carriers, Category, Exclude Patient Type, Payment/Adj Codes, Insurance Plans/Sub Types): list source, inactive rows | Open each SELECT dialog |
| 4 | Defaults of the vendor-documented SORT BY rows (Production Report, Special Transaction Report) | Open the hidden states |
| 5 | Peg Board Day Sheet and Claims Printed outputs (INFERRED) | Obtain one printout of each |
| 6 | View Only behaviour on the criteria screen (PRINT / PREVIEW hidden or disabled) | Log in with a View Only group |
| 7 | Is the 14-category list of the SEARCH CODE dialog the domain of every Category picker (Production Analysis, Special Transaction, Production Report by Category) | Open CATEGORY pickers |

## Peg Board Day Sheet - `daily.peg_board_day_sheet`

Daily Reports, screenshot 1.PNG - P1 - M - `reports_daily_reports_screen_view_only` (family `daily`) - interactive - INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Bookkeeper, office manager | End of day, after the last posting; again before a day close (PD-9, P2) | Balance the day: every posting of one office-local day with the account balance before and after it, and proof that `previous receivables + charges + payments + adjustments = new receivables` |
| Front desk lead | Next morning | Find postings on the wrong patient, provider or code before statements and claims go out |
| Owner | On demand, one past day | Re-read a closed day (frozen copy only after DATA-29, see Data) |

The legacy report is defined only by a glossary entry ("all transactions recorded for the day", the paper peg-board sheet
that tracked what was collected and what the patient still owed; research A1). Every layout statement below is a product
proposal built from the peg-board form, the SoftDent `Daysheet` and the Dentrix `Day Sheet (Charges and Receipts)`
(research A1 [C1][C2][C8]) and must be confirmed against one live legacy printout (family open question 5, item
RPT-DAILY-12) before the column list is frozen.

### Legacy output

Confidence: **INFERRED** for every block. Nothing here was seen in a Denticon sample.

| Block (proposal) | Content | Basis |
|---|---|---|
| Header | Practice-group name; title `Peg Board Day Sheet`; `Report Date : <date>`; `Office : <office_name>` band per office | Family page furniture (research 3.1) |
| Posting lines | One row per posting on the report date: patient id / chart, patient name, provider, code, description, tooth, surface, previous balance, charge, payment, adjustment, new balance | Peg-board columns `[C8]`, SoftDent main section `[C1]` |
| Day totals / proof of posting | Column totals and `previous balance + charges - payments - adjustments = new balance` (printed with our sign convention: payments already negative) | `[C8]` |
| A/R control | Previous receivables total, today's change, new receivables total | SoftDent `Previous Receivables Total` / `Today's Receivables` / `New Receivables Total` `[C1]` |
| Summary block | `Est. Pat.` / `Est. Ins.` / `Total` by section Charges / Payments / Adjustments, one line per code | Nearest Denticon relative is the Executive Day Sheet (one row per transaction type, `A. R. Impact` column, research A1 [P48]); the shared journal block of RPT-DAILY-03 is reused so the day sheet and the Daily Journal of the same day agree |
| Provider recap (possible) | Charges, payments, adjustments per provider | SoftDent `Provider Summary` `[C1]`; offered behind `show_provider_recap` (enhancement, default off) because no Denticon source names it |

Sign convention (family rule): `rpt_ledger_entries.amount`, charges positive, payments negative, adjustments with their
own sign; columns follow `journal_column` (production adjustments in Charges, contract-billing charges in Adjust).
Quirks kept: none known. Deliberate choices (not legacy facts): balances are per guarantor account and per office
(allocation unit `account_office`, data_card 2.13), so that the office's A/R control block equals that office's ledger
balance (R-14b); a provider-filtered run keeps the office A/R control and adds the reconciling line
`Postings of other providers` so the proof still ties (the legacy effect is unknown: "totals no longer tie to office A/R",
research A1 [unverified]).

### Parameters - legacy parity

<!-- PARITY:daily_reports.r01:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group (picker source switches with the mode). Both options enabled on this report. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Default = id of the office the user was working in (capture shows 108). Mode office: one or more offices the caller can read (default working_office); mode office_group: groups of Setup > Office Groups (default all). The selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select (legacy SELECT dialog); all = no restriction. Provider role on this report: provider of the ledger line (rpt_ledger_entries.provider_id: treating provider on charges, credited provider on payments, adjustment provider). INFERRED - no vendor statement for this report; confirm on the live tool. |
| REPORT DATE | Report Date (date_input) | shown: 11/21/2026 | `report_date` | date | - | `today` | replicated_enhanced | Single date, role single_day: the sheet lists every ledger leg whose transaction_date = report_date (PD-8); previous balance = ledger sum before the day, new balance = through the day (as-of the end of that office-local day). Default = today in the office time zone (relative token), enhanced with presets. Output INFERRED (research A1). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:daily_reports.r01:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Run, preview on screen, render the `day_sheet` PDF layout. Rows unchanged (`role: output`) |
| PRINT FORMAT `Excel` | Same run; XLSX with one flat sheet per block (`postings`, `ar_control`, `journal_summary`, `provider_recap` when on). `csv` added: `postings` block only |
| OFFICE/GROUP `Office` (default) + picker (default = working office, `office_ids = [working_office]`) | Postings whose transaction office (`rpt_ledger_entries.office_id`) is in the list; one `Office : <name>` band, A/R control block and summary block per office; grand total over offices when more than one |
| OFFICE/GROUP `Office Group` + picker (default ALL) | Same, for every office of the chosen groups; the run is multi-office, so office bands are printed (`["ctx", "multi_office"]`) |
| PROVIDER `ALL` (default) | No provider predicate; proof line ties exactly |
| PROVIDER one or more providers | Postings whose ledger-line provider (`rpt_ledger_entries.provider_id`: treating provider on charges, credited provider on payments, adjustment provider) is selected. Balance columns and the A/R control block stay office-wide; `Postings of other providers` = the day movement of the other providers, so the proof still ties. Provider meaning INFERRED (family open question 2) |
| REPORT DATE (default today, office-local) | `single_day` role: every live leg with `transaction_date = report_date`; previous balance = ledger sum before that day, new balance = through the end of that day. A multi-office run resolves "today" per office (AD-9) |

Dependency rules: none on the legacy screen (no greyed control, no dynamic state in any capture).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `report_date` presets `yesterday` and NEW token `previous_office_day` | `date` token | `today` unchanged | Next-morning run without typing the date; `previous_office_day` = last day the office was open (`rpt_office_calendar_days()`, DATA-55) | Token NEW, owned by `04_filter_framework.md` 7.4 |
| `user_ids` | `entity_multi` (shared 3.2) | `all` | Restrict postings to the posting user (`user_key`); balance columns unchanged, a `Postings of other users` proof line appears | Migrated rows match only under `all` (DATA-10) |
| `transaction_types` | `enum_multi` (shared 3.8) | all ticked (no predicate) | Show only charges, payments or adjustments while keeping the proof line (`Postings of other types`) | Same member rule as Daily Journal |
| `show_provider_recap` | `boolean` NEW | `false` | Adds the `provider_recap` block after each office (comparable-system block, research A1) | Owner: this catalog; data class `provider_comp` |
| `show_backdated_flag` | `boolean` NEW | `false` | Adds column `is_backdated` (`created_date <> transaction_date`) to spot entries keyed today for another day and entries keyed on another day for this one | Class `user_activity` (security_card 5.1); exact from DATA-13 |
| `sort_by` | `enum` (shared 3.9) | `posting_order` | `posting_order` (created time, entry id), `patient_last_name`, `provider` | Options NEW for this report; legacy has no sort control, `posting_order` is the paper-sheet order |
| Saved view "Yesterday, my office" | saved view | - | `report_date = yesterday`, `office_ids = @working_office` | Hub feature (filter_card 12) |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_ledger_entries` (rows and balances), `rpt_charges` (`tooth`, `surface` of charge legs, joined on `entry_id`), `rpt_patient_dim` (`chart_no`, `first_name`, `last_name`), `rpt_account_dim` (`account_no`, guarantor name for the account label), `rpt_provider_dim` (`short_id`, `provider_name`), `rpt_user_dim` (`user_label`), `rpt_transaction_code_dim` (code descriptions of payments and adjustments), `rpt_procedure_code_dim` (`description`) |
| Row filter | live legs (`NOT is_void`, archive per tenant policy) with `transaction_date = :report_date` and `office_id IN (:office_ids)`; capitation legs (`cap`, `capa`, no patient) are listed under a `Capitation` pseudo-account line (data_card 2.10: "the day sheet prints both lines") |
| Columns used | `entry_id`, `entry_type`, `journal_column`, `amount`, `office_fee`, `est_patient`, `est_insurance`, `payer`, `code`, `code_kind`, `transaction_date`, `created_date`, `created_at_utc`, `created_at_reliable`, `office_id`, `provider_id`, `patient_id`, `account_id`, `procedure_id`, `user_key`, `carrier_id`, `claim_id`, `ledger_bucket` |
| Previous / new balance per line | Unit = (`account_id`, `office_id`) (`account_office`, data_card 2.13). `previous_balance` = `SUM(amount)` of the unit's live legs with `transaction_date < report_date` plus the unit's legs of the same day ordered before the line (`created_at_utc`, then `entry_id`); `new_balance = previous_balance + amount`. One window query per run over the touched units; index `(tenant_id, account_id, transaction_date)` (DATA-06 indexes) |
| A/R control | `previous_receivables` = `SUM(amount)` of every live leg of the office with `transaction_date < report_date`; `new_receivables` = through `report_date`; `day_charges`, `day_payments`, `day_adjustments` = sums by `journal_column` of the day; `other_postings` = day movement excluded by `provider_ids`, `user_ids` or `transaction_types`; `proof_difference` = previous + charges + payments + adjustments + other_postings - new (must be 0.00; a non-zero value is a defect and fails RPT-DAILY-07 style tests) |
| Date basis | fixed `transaction_date` (PD-8); `date_basis` is not a parameter |
| Office attribution | transaction office (`rpt_ledger_entries.office_id`); NULL office on migrated payments = member `Unassigned office` (data_card 5.1 rule 3) |
| Provider attribution | ledger-line provider (`rpt_ledger_entries.provider_id`), INFERRED; NULL = `Unassigned provider` |
| Coverage rating | **READY** (coverage matrix 11.1 row 1): previous and new balance are ledger sums as of the day |
| Frozen sheet | **SCHEMA(29)** (DATA-29, P2): until day close exists a re-run of a past day includes later back-dated postings and corrections, so it can differ from the copy printed that evening. Availability code NEW `day_sheet_not_frozen` (owned by 03), printed on every run whose `report_date` is before today |
| Migrated history | adjustments are `unclassified_adjustment` until DATA-12: printed in Adjust, listed as one `Unclassified adjustments` line in the summary block (code `migrated_adjustments_unclassified`); posting order within a migrated day falls back to `entry_id` when `created_at_reliable` is false; migrated payments carry tender aliases (`CASH`, `CHECK`, `CARD`, `ACH`) instead of the legacy code (REPAIR(12)); the skipped migrated charges (DATA-57) make previous balances of migrated accounts differ from Denticon until R-21 passes (completeness caveat with the measured gap) |

### Output

Report format: one (`standard`). Blocks in print order per office band: `postings` (main), `ar_control` (after office),
`journal_summary` (after office), `provider_recap` (after office, when on); then `Grand Total` versions of
`ar_control` and `journal_summary` when more than one office.

`postings` (shape `table`, placement `main`, `row_id_column = row_id`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | Office | id, hidden | aggregate | group key of the office band |
| `row_id` | Row | id, hidden | aggregate | `entry_id`; tie-breaker |
| `posted_at` | Posted | datetime, hidden | phi_identified | sort key of `posting_order` |
| `patient_id`, `account_id` | - | id, hidden | phi_identified | drill keys |
| `patient_last_name` | - | text, hidden | phi_identified | sort key |
| `chart_no` | Pat ID/ Chart # | text | phi_identified | none |
| `patient_name` | Patient Name | text, entity patient | phi_identified | key column; label `Last, First` |
| `provider_short_id` | Prdr | text | aggregate | none |
| `code` | Code | text | phi_identified | none |
| `description` | Description | text | phi_identified | none |
| `tooth` | Th | text | phi_identified | none |
| `surface` | Surf | text | phi_identified | none |
| `previous_balance` | Prev. Bal. | money | financial_patient | none (a balance, not additive) |
| `charges` | Charges | money | financial_patient | sum per office, grand sum |
| `payments` | Payments | money (negative) | financial_patient | sum |
| `adjustments` | Adjust | money | financial_patient | sum |
| `new_balance` | New Bal. | money | financial_patient | none |
| `user_label` | User | text | aggregate | none |
| `is_backdated` | Back-dated | boolean, `visible_when ["truthy","show_backdated_flag"]` | user_activity | count |

`ar_control` (shape `key_value`, placement `after_group`): `previous_receivables` "Previous Receivables Total",
`day_charges` "Charges", `day_payments` "Payments", `day_adjustments` "Adjustments", `other_postings` "Postings of other
providers / users / types" (shown when non-zero), `new_receivables` "New Receivables Total", `proof_difference` "Out of
balance" (shown when non-zero). All `money`, class `financial_practice`.

`journal_summary` (shared builder RPT-DAILY-03): columns `section` (hidden group key: `charges`, `payments`,
`adjustments`), `line_label` "Description" (aggregate), `est_pat` "Est. Pat.", `est_ins` "Est. Ins.", `total` "Total"
(money, financial_practice, sum); subtotals `Total Charges :`, `Total Payments :`, `Total Adjustments :`.

`provider_recap` (visible when `show_provider_recap`): `provider_id` (hidden), `provider_name` "Provider"
(provider_comp, key), `charges`, `payments`, `adjustments`, `net_change` (= sum of the three; computed `difference`),
all money `provider_comp`; sum totals.

Sort: `posting_order` (default) = `posted_at`, `row_id`; enhancement options above. Page break: office band only
(`page_break_by` not offered; each office starts a page in the PDF as on a paper sheet). Summary cards (block totals):
day charges, day payments, day adjustments, new receivables, out-of-balance amount. `empty_when`: `no_detail_rows` on
`postings` (a day without postings still prints the A/R control block on screen, but counts as empty for
`skip_if_empty`).

### Visuals and drill-through

Chart: none - a balancing form.

| Click | Target |
|---|---|
| Patient name / row | `kind = record`, patient ledger (`route_key patient_ledger`, right of the ledger feature, `phi_identified`) |
| `charges` / `payments` / `adjustments` totals of an office | `kind = report`, `daily.daily_journal` with `report_format = detail`, `date_basis = transaction_date`, `date_from = date_to = report_date`, `office_ids = {group: office_id}`, `transaction_types = [services]` / `[payments]` / `[adjustments]`, `provider_ids` copied |
| A summary-block code line | `daily.daily_journal` detail, same day and office, filtered to that code (`payment_adjustment_codes` or `procedure_codes`, parameters the target accepts through `param_map`) |
| `provider_recap` row | `daily.daily_journal` detail with `provider_ids = [provider_id]` |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open patient ledger | row | `navigate` | Drill above |
| Export selection | bulk | `export_selection` | Selected posting lines to CSV / XLSX (P3, ENG-49) |
| Create task "correct posting" | bulk | `create_task` | For lines found wrong while balancing (wrong provider or code); task carries the entry ids; owning feature handler (P3) |

Not a worklist: the sheet is a closed-day proof, not a queue.

### Export and print

| Output | Rule |
|---|---|
| PDF | Layout `day_sheet` (ENG-24), landscape, letter; header: practice-group name, `Peg Board Day Sheet`, `Report Date : <date>`; office band per office with a page break between offices; A/R control and summary block at the end of each office; footer criteria echo (`Report Date`, `Offices`, `Providers`, enhancement values), `Printed : <date time>`, `Page : n of m`; `day_sheet_not_frozen` and completeness caveats in the criteria block |
| XLSX | Sheets `postings`, `ar_control`, `journal_summary`, `provider_recap` (when on), `criteria`; no merged cells; balances as typed money cells |
| CSV | `postings` block |
| Background | Not needed: one day per office; `max_rows_inline` 5,000, rows beyond are paged from the snapshot |

### Open questions

| # | Question | Check on the live legacy tool / decision |
|---|---|---|
| 1 | Real layout of the legacy sheet: columns, order, whether it shows a balance per line or per account, whether an A/R control block and a provider recap exist | Obtain one printout (RPT-DAILY-12); until then the layout above is a product proposal |
| 2 | Which provider the PROVIDER picker filters (ledger-line provider assumed) and whether balances follow the filter | Run with one provider on a patient whose lines carry two providers |
| 3 | Balance unit: account per office (chosen) or account across offices, or patient | Compare a printout for a family seen in two offices |
| 4 | Does the Report Date select by transaction date or entry date (family question 1) | Post a back-dated payment and run both days |
| 5 | Product decision: should the sheet be frozen at day close (DATA-29) and the live re-run show a "changed since close" marker | PD-9 owner |

## Daily Journal - `daily.daily_journal`

Daily Reports, screenshot 2.PNG - P1 - L - `reports_daily_reports_screen_view_only` (family `daily`) - interactive (background for long ranges once ENG-38 exists, P2) - DOCUMENTED (Detail and Summary layouts seen, 2022 / 2024 samples); three options unverified

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front office and clinical staff | Daily, end of day, as `Daily Journal by Provider - Detail` | Find providers with charges who did not work; check that each doctor's services are what that doctor normally performs; one DSO runs it each morning to correct providers (research A2 [P2][P1][T2]) |
| Office manager | Daily | Day's production = Detail with only Services; day's collection = Detail with only Payments (the vendor's primary end-of-day check, [P1]) |
| Management | Daily / weekly, `Daily Journal - Summary` by office or office group | Code-level totals of charges, payments and adjustments |
| Auditor | On demand, Created Date basis | Catch back-dated entries (old `Daily Journal by User - Detail (by created date)`) |

### Legacy output

Confidence: DOCUMENTED for both formats [P4·img][P5·img][P6·img]; `Include Resp. Party Type`, `Show AR`, the exact
`PATIENT TYPE` rule and the datewise recap layout are unverified.

Detail - title `Daily Journal - Detail`:

| # | Column | Content |
|---|---|---|
| 1 | `Pat ID/ Chart #` | Patient identifier |
| 2 | `Patient Name` | |
| 3 | `Prdr` | Provider short id on the ledger line |
| 4 | `Code` | Procedure code, or the payment / adjustment code |
| 5 | `Description` | Code description |
| 6 | `Th` | Tooth |
| 7 | `Surf` | Surface |
| 8 | `UCR` | UCR fee of the procedure (0.00 on payments and adjustments) |
| 9 | `Charges` | Services and production adjustments (signed) |
| 10 | `Payment` | Payments (negative) |
| 11 | `Adjust` | Other adjustments (signed); contract-billing debits positive |
| 12 | `User` | User who entered the line |

Grouping and totals (Detail): `Office : <name>` -> `Transaction Date: <date>` -> lines -> `Total for, <date>` (UCR,
Charges, Payment, Adjust) -> `Total for Office : <name>` -> `Summary for <office>` (the Est. Pat. / Est. Ins. / Total
block) -> `Grand Total :` -> `Grand Total Summary :`.

Summary - title `Daily Journal - Summary`: per `Office :` only the summary block (Charges: `Services` plus one line per
production-adjustment code -> `Total Charges :`; Payments: one line per payment code -> `Total Payments :`; Adjustments:
one line per adjustment code -> `Total Adjustments :`), then `Grand Total Summary :`. No patient names.

Quirks kept: production adjustments print in Charges (expected legacy behaviour; a Collection Sub Type there is a defect,
[P4]); contract-billing debits print in Adjust with a positive amount; a contract charge can print as two lines suffixed
`- Patient` and `- Pri Ins.` with their own amount and user [P5·img] - we print the stored rows as they are (one row per
`patient_procedures` row) and do not synthesise the split. Quirk not kept: none. With `GROUP BY` Provider / User the level
order (provider outside the date) is INFERRED.

### Parameters - legacy parity

<!-- PARITY:daily_reports.r02:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT FORMAT | (no label) (radio_group) | **Detail** / Summary | `report_format` | enum | Detail -> `detail`, Summary -> `summary` | `detail` | replicated | Detail = line listing with patient names and date subtotals; Summary = the Est. Pat. / Est. Ins. / Total summary block only. Both options enabled in every state. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group (picker source switches with the mode). Both options enabled on this report. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Default = id of the office the user was working in (capture shows 108). Mode office: one or more offices the caller can read (default working_office); mode office_group: groups of Setup > Office Groups (default all). The selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER/USER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; all = no restriction. Provider role: provider on the ledger line (rpt_ledger_entries.provider_id, journal column Prdr); one patient's payments can split across providers. |
| PROVIDER/USER | User (picker) | shown: ALL | `user_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; all = no restriction. User role: poster of the ledger leg (user_key, data_card 5.4). Migrated rows carry only a legacy login string and match only under all until DATA-10. |
| DATE RANGE | (no label) (radio_group) | **Transaction Date** / Created Date | `date_basis` | enum | Transaction Date -> `transaction_date`, Created Date -> `created_date` | `transaction_date` | replicated | - |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range; date_basis is fixed per report or chosen by the basis radio of the same section. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| PATIENT TYPE | (no label) (radio_group) | **Both** / General / Ortho | `patient_type` | enum | Both -> `both`, General -> `general`, Ortho -> `ortho` | `both` | replicated | Ortho-patient flag, not the user-defined patient types of INCLUDE / EXCLUDE PATIENT TYPE. |
| TRANSACTION TYPES | Services (checkbox) | **checked** | `transaction_types.services` | enum_multi | - | `true` | replicated | - |
| TRANSACTION TYPES | Payments (checkbox) | **checked** | `transaction_types.payments` | enum_multi | - | `true` | replicated | - |
| TRANSACTION TYPES | Adjustments (checkbox) | **checked** | `transaction_types.adjustments` | enum_multi | - | `true` | replicated | - |
| OTHER OPTIONS | Show AR (checkbox) | **unchecked** - greyed out | `show_ar` | boolean | - | `false` | replicated | Enabled when: unknown. Greyed on Daily Journal in every known capture; driver not known, so enabled_when unknown (04 9.3: the control stays enabled and the definition lint flags it until RPT-DAILY-09 answers it). Ticked adds block ar_summary (Total A/R as of date_to per office and at report end), INFERRED from the Executive Summary option of the same name. |
| OTHER OPTIONS | Include Resp. Party Type (checkbox) | **unchecked** | `include_resp_party_type` | boolean | - | `false` | replicated | - |
| OTHER OPTIONS | Show Datewise Summary (checkbox) | **unchecked** | `show_datewise_summary` | boolean | - | `false` | replicated | Same parameter as Show Datewise Distribution. |
| GROUP BY | (no label) (radio_group) | **None** / Provider / User | `group_by` | enum | None -> `none`, Provider -> `provider`, User -> `user` | `none` | replicated | - |
| GROUP BY | Page Break (checkbox) | **unchecked** - greyed out | `page_break_by.group` | enum | - | `false` | replicated | Enabled when: group_by != none. Page Break checkbox beside GROUP BY: ticked sets page_break_by = group (break on the selected grouping). Greyed while GROUP BY = None. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| GROUP BY = Provider or User (any grouping other than None) | the Page Break checkbox becomes available - a page break is offered only when the journal is grouped; it stays greyed while GROUP BY = None | page_break_by member group (Page Break checkbox) is enabled_when group_by != none; while group_by = none it is disabled and page_break_by is forced to its disabled_value none, so a stale tick never reaches the PDF renderer. |
<!-- PARITY:daily_reports.r02:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | Blocks `main` (line listing with patient names, date subtotals) + `journal_summary` after each office and at the end; title `Daily Journal - Detail` |
| REPORT FORMAT `Summary` | Block `journal_summary` only, per office and grand; no patient rows; title `Daily Journal - Summary` |
| PRINT FORMAT `PDF` (default) / `Excel` | Output only (`role: output`); `journal` PDF layout or flat XLSX; `csv` added |
| OFFICE/GROUP `Office` (default, working office) / `Office Group` (default ALL) | Lines whose transaction office is in scope; one `Office :` section each, office subtotal and office summary; grand totals when more than one |
| PROVIDER/USER > Provider `ALL` (default) / list | Lines whose ledger-line provider (`Prdr`, `rpt_ledger_entries.provider_id`) is selected. One patient's payments can split across two providers; each line is filtered on its own |
| PROVIDER/USER > User `ALL` (default) / list | Lines whose poster (`user_key`) is selected; migrated rows match only under ALL until DATA-10 |
| DATE RANGE `Transaction Date` (default) | Range applies to `transaction_date`; date group header `Transaction Date: <date>` |
| DATE RANGE `Created Date` | Range applies to `created_date` (system entry date, not editable); header `Created Date: <date>`; catches back-dated entries; era-greyed where unreliable (Data) |
| Start Date / End Date (default today / today, office-local) | Inclusive range on the chosen basis |
| PATIENT TYPE `Both` (default) | No predicate |
| PATIENT TYPE `General` / `Ortho` | `rpt_patient_dim.is_ortho_patient = false` / `true` (ortho-patient flag, data_card 3.5); legs without a patient (capitation) are dropped under General and Ortho |
| TRANSACTION TYPES `Services` (ticked) | Keeps charge legs (`entry_type = charge`), contract-billing charges included (they print in Adjust) |
| TRANSACTION TYPES `Payments` (ticked) | Keeps payment legs (`entry_type IN (patient_payment, insurance_payment)` and payment-code opening credits) |
| TRANSACTION TYPES `Adjustments` (ticked) | Keeps every other leg: adjustments (production and collection Sub Type), refunds, transfers, opening rows. All three ticked = no predicate; an unticked class leaves the lines and the summary section. At least one must stay ticked |
| OTHER OPTIONS `Show AR` (greyed, unticked) | `enabled_when unknown` (04 9.3: stays enabled, lint-flagged until RPT-DAILY-09 reads the rule). Ticked adds block `ar_summary` "Total A/R" after each office and at the report end: `SUM(rpt_ledger_entries.amount)` of the office's live legs with `transaction_date <= date_to` (unit `account_office`, as the Peg Board A/R control), money `financial_practice`. Effect INFERRED from the Executive Summary option of the same name |
| OTHER OPTIONS `Include Resp. Party Type` (unticked) | Ticked adds column `resp_party_type` ("Resp. Party Type", after Patient Name, position INFERRED) from `rpt_account_dim`; Detail only |
| OTHER OPTIONS `Show Datewise Summary` (unticked) | Ticked adds block `datewise_summary`: one row per basis date per office, printed after the office's lines (useful when the range spans several days) |
| GROUP BY `None` (default) | Levels: office (when multi-office) -> basis date |
| GROUP BY `Provider` | Levels: office -> provider (`Provider : <provider_name>`, subtotal `Total for <provider_name> :`) -> basis date; reproduces `Daily Journal by Provider` |
| GROUP BY `User` | Levels: office -> user (`User : <user_label>`, subtotal `Total for <user_label> :`) -> basis date; reproduces `Daily Journal by User - Detail` |
| GROUP BY > Page Break (greyed, unticked) | Enabled only when GROUP BY is not None; ticked = `page_break_by = group`: new PDF page per provider / user. Layout only, no re-run |

Dependency rules: `page_break_by` member `group` is `enabled_when ["ne","group_by","none"]` (rule d01; forced to `none`
while disabled). `show_ar` carries `enabled_when ["unknown"]` (evaluates true; captured greyed, driver unknown). Not legacy rules but engine rules: under
`report_format = summary` the columns `resp_party_type` and the `datewise_summary` block are not produced (no lines);
the parameters stay editable, as on the legacy screen.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `date_range` presets `yesterday`, `week_to_date`, `month_to_date` | `date_range` | `today` | Morning-after and weekly management runs | filter_card 12 |
| `procedure_codes` | `entity_multi` (shared 3.6) | `all` | Restrict service lines to codes (e.g. check that hygiene codes were charged by hygienists) | Applies to charge legs only; other legs unaffected |
| `payment_adjustment_codes` | `entity_multi` (shared, 04 section 15) | `all` | Restrict payment / adjustment lines to codes | Migrated legs carry alias codes until DATA-12 |
| `backdated_only` | `boolean` NEW | `false` | Lines whose `created_date <> transaction_date` only; column `is_backdated` shown | Class `user_activity`; exact from DATA-13; owner: this catalog |
| `exclude_zero_lines` | `boolean` NEW | `false` | Drop lines with `amount = 0` (ledger codes that are not A/R codes post with zero fee, research 3.2) | Owner: this catalog |
| Saved views | saved view | - | "Provider check - services only" (`group_by = provider`, `transaction_types = [services]`, `page_break_by = group`); "Collections today" (`transaction_types = [payments]`); "Back-dated this week" (`date_basis = created_date`, `week_to_date`, `backdated_only`) | Hub feature |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_ledger_entries` (lines, `journal_column`), `rpt_charges` (tooth, surface, `office_fee` through `entry_id`), `rpt_patient_dim` (`chart_no`, names, `is_ortho_patient`), `rpt_account_dim` (`resp_party_type`), `rpt_user_dim` (`user_label`), `rpt_transaction_code_dim` (payment / adjustment descriptions), `rpt_procedure_code_dim` (`description`), `rpt_provider_dim` (`short_id`, `provider_name`) |
| Columns used | `entry_id`, `entry_type`, `journal_column`, `ledger_bucket`, `code`, `code_kind`, `amount`, `office_fee`, `est_patient`, `est_insurance`, `payer`, `carrier_id`, `claim_id`, `transaction_date`, `created_date`, `created_at_utc`, `created_at_reliable`, `office_id`, `provider_id`, `patient_id`, `account_id`, `procedure_id`, `user_key`, `is_void`, `is_archived` |
| Date basis | `date_basis` parameter: `transaction_date` -> `transaction_date`; `created_date` -> per-office UTC bounds on `created_at_utc` (data_card 4.3), `posting_date` after DATA-13. The date group level uses the same column |
| Office attribution | transaction office (`rpt_ledger_entries.office_id`); `Unassigned office` member for NULL |
| Provider attribution | ledger-line provider (`provider_id`; Prdr); NULL = `Unassigned provider` (own group under GROUP BY Provider) |
| User | `user_key` (data_card 5.4); label `user_label`; legacy logins print their login string |
| Column mapping | `charges` = `amount` where `journal_column = 'charges'`; `payment` where `'payment'`; `adjust` where `'adjust'`; `ucr` = `office_fee` on charge legs, 0.00 elsewhere |
| Summary block | Charges section: line `Services` = charge legs with `journal_column = 'charges'`, plus one line per production-adjustment code; Payments: one line per payment code; Adjustments: one line per code of `journal_column = 'adjust'` (contract-billing code lines `ACBIL` / `ACBILO`, collection adjustments, transfers, opening rows), plus `Unclassified adjustments` for migrated legs. Est. split: charges `est_patient` / `est_insurance`; payments by `payer`; adjustments in Est. Ins. when the leg is a remittance write-off (`rwo`) or carries `carrier_id`, else Est. Pat. (adjustment rule INFERRED) |
| Datewise summary | per office and basis date: `charges`, `payment`, `adjust` sums and `net` (sum of amount) |
| Coverage rating | **READY** (coverage matrix row 2) |
| Option blockers | Created Date basis and User on history: **REPAIR(10)** (DATA-10; migrated `created_at` is load time until `--restore-created-at`, availability code NEW `created_date_unreliable`, basis greyed for ranges before the migrated-through date when not restored); Include Resp. Party Type: **SCHEMA(53)** (DATA-53; NULL on self-guarantor accounts until then, code NEW `resp_party_type_missing`); code-level lines for migrated payments and adjustments: **REPAIR(12)** (DATA-12; payments print the tender alias, adjustments `Unclassified adjustments`, code `migrated_adjustments_unclassified`) |
| History that cannot be produced | Created Date on migrated money rows without the restore; the legacy user's name for legacy logins (only the login string exists); the `- Patient` / `- Pri Ins.` split of migrated contract billing (not migrated as two rows); PATIENT TYPE uses the patient's current ortho status (`rpt_patient_dim.is_ortho_patient`), not the status at the transaction date (open question 3) |
| Show AR | `ar_summary`: per office `SUM(amount)` of live legs with `transaction_date <= date_to`, unit `account_office`; grand copy at `report_end` when multi-office. INFERRED (Executive Summary) |

### Output

Detail format, block `main` (`row_id_column = row_id`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id`, `user_key`, `basis_date` | - | hidden group keys | aggregate (`user_key`: operational user, security_card rule 12) | levels |
| `provider_id` | - | hidden group key | provider_comp when `group_by = provider` (rule 3: names a provider in a block with money; the level label and provider subtotals inherit it), else aggregate | level `provider` |
| `row_id` | - | id, hidden | aggregate | tie-breaker (`entry_id`) |
| `posted_at` | - | datetime, hidden | phi_identified | sort key: `created_at_utc`; falls back to `entry_id` order when `created_at_reliable` is false |
| `patient_id`, `account_id` | - | id, hidden | phi_identified | drill keys |
| `chart_no` | Pat ID/ Chart # | text | phi_identified | none |
| `patient_name` | Patient Name | text, entity patient | phi_identified | key column |
| `resp_party_type` | Resp. Party Type | text, `visible_when ["truthy","include_resp_party_type"]` | phi_identified | none |
| `provider_short_id` | Prdr | text | aggregate | none |
| `code` | Code | text | phi_identified | none |
| `description` | Description | text | phi_identified | none |
| `tooth` | Th | text | phi_identified | none |
| `surface` | Surf | text | phi_identified | none |
| `ucr` | UCR | money | financial_patient | sum per date, group, office, grand |
| `charges` | Charges | money | financial_patient | sum |
| `payment` | Payment | money (negative) | financial_patient | sum |
| `adjust` | Adjust | money | financial_patient | sum |
| `user_label` | User | text | aggregate | none |
| `is_backdated` | Back-dated | boolean, visible with `backdated_only` | user_activity | count |

Group levels (Detail): fixed outer `Office : {office_name}` (when multi-office; subtotal `Total for Office : {office_name}`,
trailer `journal_summary` titled `Summary for {office_name}`); `group_by` level provider / user (subtotal per member);
inner fixed level `Transaction Date: {basis_date}` or `Created Date: {basis_date}` (subtotal `Total for, {basis_date}`).
Grand total `Grand Total :` then block `journal_summary` titled `Grand Total Summary :` (placement `report_end`).
Sort inside the date level: `posted_at`, `row_id` (legacy order not documented; posting order proposed).

Summary format: `journal_summary` only (columns as in Peg Board Day Sheet: `section`, `line_label`, `est_pat`, `est_ins`,
`total`; money `financial_practice`), per office and `Grand Total Summary :`; with `group_by` provider / user one block
per member inside the office (INFERRED).

`datewise_summary` (Detail, `visible_when show_datewise_summary`, placement `after_group` of the office level):
`basis_date` "Date", `charges`, `payment`, `adjust`, `net` (money `financial_practice`, sums).

`ar_summary` (both formats, `visible_when ["truthy","show_ar"]`, shape `key_value`, placement `after_group` of the office
level and `report_end`): `total_ar` "Total A/R" (money, `financial_practice`), as of `date_to`. INFERRED layout.

Provider grouping and rights: with `group_by = provider` the provider key is `provider_comp`; a caller without it is
refused GROUP BY Provider (key column rule 5) and can still run `group_by` none or user. The line column `provider_short_id`
(Prdr) stays `aggregate`.

Page break: `none` / `group` (provider or user level). Summary cards (block totals): Charges, Payments, Adjustments,
Net (sum of the three), lines count. Not `reconciles_with` metrics: journal columns are legacy columns, not metric
buckets (family money rule).

### Visuals and drill-through

Chart: with `show_datewise_summary` or a range over one day, a stacked bar per day (charges, payments, adjust) from the
`datewise_summary` block; otherwise none.

| Click | Target |
|---|---|
| Patient row | `kind = record`, patient ledger (`route_key patient_ledger`, ledger right) |
| Provider subtotal (GROUP BY Provider) | `kind = report`, `daily.production_report` with `report_by = provider`, `report_format = detail`, `provider_ids = {group: provider_id}`, `date_range` copied (only when `date_basis = transaction_date`) |
| Payments total of an office | `kind = report`, `daily.collection_report`, `group_by = provider`, same office and range |
| Summary code line | `kind = rows`, same report Detail filtered to that code |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open patient ledger | row | `navigate` | Correct a provider or code on the source screen |
| Create task "correct provider / code" | bulk | `create_task` | The morning provider-correction routine as a queue (P3, ENG-49) |
| Export selection | bulk | `export_selection` | P3 |

Doubles as a worklist only through the saved view "Provider check - services only"; no live paging.

### Export and print

| Output | Rule |
|---|---|
| PDF | Layout `journal` (ENG-24), landscape; header practice-group name + variant title; office band, provider / user band, date band; summary block after each office; footer criteria echo (`Transaction From` / `Transaction Thru` or `Created From` / `Created Thru`, `Offices`, `Providers`, `Users`, `Patient Type`, transaction types, starred notes `* Show Resp. Party Type`, `* Datewise Summary`, `* Show AR`), `Printed :`, `Page : n of m`; page break per provider / user when ticked |
| XLSX | `main` sheet (one row per line, group keys as plain columns `office_name`, `provider_name` / `user_label`, `basis_date`; no subtotal rows, outline grouping on), `journal_summary` sheet, `datewise_summary` sheet, `criteria` sheet |
| CSV | `main` block (Detail) or `journal_summary` (Summary) |
| Background | Inline up to 31 days and 5 offices; beyond, `escalate_when` to background once ENG-38 exists (P2); in P1 `max_date_span_days` 366 with `max_rows` cap and a run warning |

### Open questions

| # | Question | Check / decision |
|---|---|---|
| 1 | What enables `Show AR` (served `enabled_when unknown`), and does it append Total A/R as of the end of the range as on the Executive Summary (taken) | Try every combination of format, office mode and transaction types on the live tool (RPT-DAILY-09) |
| 2 | What `Include Resp. Party Type` prints and where | Tick it on a Detail run |
| 3 | `PATIENT TYPE` General = non-ortho only, Ortho = ortho-flagged only; does an active ortho contract make a patient Ortho (O-3); does the legacy use the current status or the status at the transaction date (we use current) | Run all three on a day with ortho contract billing, for a patient whose ortho ended since |
| 4 | Do production adjustments follow the `Services` or the `Adjustments` tick (we use the entry class: Adjustments) | Untick Adjustments on a day with a production adjustment |
| 5 | With GROUP BY Provider / User: is the date level inside the group, and is a summary block printed per group | Run grouped with a two-day range |
| 6 | Layout of the datewise recap | Tick Show Datewise Summary over a week |
| 7 | Est. Pat. / Est. Ins. placement of adjustments in the summary block | Compare a legacy summary with an insurance write-off |

## Production Report - `daily.production_report`

Daily Reports, screenshot 3.PNG - P1 - L - `reports_daily_reports_screen_view_only` (family `daily`) - interactive (escalates above 92 days or 5 offices) - DOCUMENTED (Production By Code, Provider); PARTIALLY DOCUMENTED (Category, Carrier, Detail)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Management | Monthly / quarterly / yearly | By Code: number of codes rendered and charges per code for fee negotiation; by Code by Provider: revenue mix and clinical coaching; by Category: high-level mix (research A3 [P2][P8][P10]) |
| Offices that pay on production | Daily / per pay period | Production by Provider (Summary, Detail) with a compare-fee column at a "provider pay" schedule (`Include UCR` + `Fee Schedule To Compare`, [P10]) |
| Analyst | Month end | Net production = Grand Total charges + Total Production Adjustments ([T1]); our `reconciles_with` makes this a test |

### Legacy output

Population: completed procedures posted to the ledger in the date range, plus production adjustments; no payments, no
collection adjustments, no scheduled work [P8]; the posting date decides the period [P47].

| Variant (title) | Columns, left to right | Grouping and totals | Confidence |
|---|---|---|---|
| `Production by Codes` (Code, GROUP BY None) | `Code`, `Description`, `#Perf`, `Charges $`, `Avg $`, `Total Dur. (Units)`, `Avg. Dur. (Units)`, `Eff. Rate $`, `Per %` | `Office : <name>` -> code rows -> `Total for, <office> [ <OID> ] :` -> `Total Production Adjustments :` | DOCUMENTED [P9·img] 2022 |
| `Production by Codes - Provider` (Code, GROUP BY Provider) | Same, compare-fee column after `Charges $` when Include UCR | `Provider :- <name>` -> code rows -> `Total for <provider> :` -> that provider's `Total Production Adjustments :` (one line per adjustment code) -> `Grand Total :` -> overall adjustment list | DOCUMENTED [P10·img][T1·img] |
| `Production by Provider` (Provider, Summary) | `Provider`, `ShortID`, `#Perf`, `Charges $`, compare-fee column headed with the schedule name, `Avg $`, `Total Dur. (Units)`, `Avg. Dur. (Units)`, `Eff. Rate $`, `Per %` | one row per provider -> `Total :` | DOCUMENTED [P8·img] 2016 |
| `Production by Provider` Detail | Itemises each completed procedure per provider; columns not seen - expected date, patient, code, tooth, surface, charge | provider sections | INFERRED |
| `Production by Category` | Category rows with the measure columns | as by Code | PARTIALLY (title from the old report name only) |
| `Production by Carrier` | Carrier rows with the measure columns | as by Code | INFERRED |

Column definitions [P8]: `#Perf` = count of procedures; `Total Dur.` = sum of DUR units (default 0); `Avg. Dur.` =
Total Dur. / #Perf; `Eff. Rate $` = Charges / Total Dur. (legacy: zero-duration rows show the charge itself); `Avg $` =
Charges / #Perf; `Per %` = row charges / charges of its group (a provider total row shows provider / grand total);
compare-fee column = count x fee of the chosen schedule, footer `FeeID` and `* Includes UCR`.

Quirks deliberately fixed (family ratio rule): total-row `Eff. Rate $` is a true ratio (legacy accumulates it in by-code
samples); zero-duration rows show an empty `Eff. Rate $` (`null_display` "-") instead of the charge. Kept: accuracy
depends on the provider on each procedure and on durations being entered [P8]; production is not comparable with income
allocation [P47].

### Parameters - legacy parity

<!-- PARITY:daily_reports.r03:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT FORMAT | (no label) (radio_group) | Detail / **Summary** | `report_format` | enum | Detail -> `detail`, Summary -> `summary` | `summary` | replicated | Option rules: detail enabled when report_by == provider. Option detail enabled_when report_by == provider; report_format forced to summary for code, category and carrier (vendor text: Detail only for PRODUCTION BY = Provider). |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group (picker source switches with the mode). Both options enabled on this report. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Default = id of the office the user was working in (capture shows 108). Mode office: one or more offices the caller can read (default working_office); mode office_group: groups of Setup > Office Groups (default all). The selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary range, fixed basis transaction_date (the posting date decides the period, research A3); no date_basis radio on this report. On charges transaction_date equals service_date until DATA-13 adds the ledger date. Default = today in the office time zone; enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the fixed transaction_date (posting date) range. Default = today in the office time zone; enhanced with presets and relative tokens. |
| PRODUCTION BY | (no label) (radio_group) | **Code** / Provider / Category / Carrier | `report_by` | enum | Code -> `code`, Provider -> `provider`, Category -> `category`, Carrier -> `carrier` | `code` | replicated | PRODUCTION BY selects the report variant (no None option). |
| GROUP BY | (no label) (radio_group) | **None** / Provider / Carrier | `group_by` | enum | None -> `none`, Provider -> `provider`, Carrier -> `carrier` | `none` | replicated | Enabled when: report_by != provider. |
| GROUP BY | Page Break (checkbox) | **unchecked** - greyed out | `page_break_by.group` | enum | - | `false` | replicated | Enabled when: group_by != none. Page Break checkbox beside GROUP BY: ticked sets page_break_by = group (break on the selected grouping). Greyed while GROUP BY = None. |
| CODES | (no label) (picker) | shown: ALL | `procedure_codes` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. One capture (Treatment Plan Detail) shows an empty box: treated as no restriction - confirm. |
| OTHER OPTIONS | Include UCR (checkbox) | **unchecked** | `include_ucr` | boolean | - | `false` | replicated | Enabled when: not (report_by == provider and report_format == detail). Greyed only in the observed state PRODUCTION BY = Provider + REPORT FORMAT = Detail; the 2016 Production by Provider Summary sample prints the compare-fee column, so Provider + Summary keeps it enabled. Deviation from filter_card 9.6 (rule report_by != provider) recorded as a challenge to 04; confirm on the live tool (open question 2). |
| OTHER OPTIONS | Include Z-Codes (checkbox) | **unchecked** - greyed out | `include_z_codes` | boolean | - | `false` | replicated | Enabled when: include_ucr == true. Greyed until Include UCR is ticked (enabled_when include_ucr == true, disabled_value false). Builder rule (02 section 3.11): Z codes are dropped only when include_ucr = true and include_z_codes = false; while Include UCR is off the disabled value false does NOT remove Z-code rows. |
| FEE SCHEDULE TO COMPARE | Fee Schedule To Compare (dropdown) | shown: CIGNA PPO HAMILTON ( 128 ) - greyed out | `compare_fee_schedule_id` | entity_single | - | `first_option` | unknown_legacy | Enabled when: include_ucr == true. Lookup dropdown of fee schedules shown as name ( id ), greyed until Include UCR is ticked (disabled_value null, required_when include_ucr == true). The greyed default is tenant data (other tenants show other schedules): candidate default first_option until the live tool confirms list order and default. The 02 section 3.11 worked example (token office_default_ucr_fee_schedule) is to be aligned with this candidate by the 02 owner. |
| PROVIDERS | (no label) (picker) † | (empty) | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | VENDOR-DOC PROVIDERS picker: shown beside CODES when group_by = provider and in place of CODES when report_by = provider (visible_when report_by == provider or group_by == provider, shared rule of 04). Provider = treating provider of the charge (rpt_charges.provider_id, the Prdr of the Ledger). Searchable multi-select; default all (04 shared default; legacy default and picker dialog undocumented - open question 10). |
| SORT BY | (no label) (radio_group) † | Transaction Date / Patient Lastname | `sort_by` | enum | Transaction Date -> `transaction_date`, Patient Lastname -> `patient_last_name` | - | replicated | VENDOR-DOC SORT BY, seen only with PRODUCTION BY = Provider and REPORT FORMAT = Detail (visible_when report_by == provider and report_format == detail, inferred, shared rule of 04). Legacy default not documented: the parity default is empty; the definition uses the 04 rule 'first legacy option' (transaction_date) until the live tool confirms. Row order inside each provider section of the detail block. |

† From vendor documentation - not visible in our screenshot of this screen (hidden row, collapsed dropdown or another report mode).

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| PRODUCTION BY = Code (the default) | REPORT FORMAT is locked to Summary (Detail greyed); the CODES picker is shown; GROUP BY None / Provider / Carrier is available; Include UCR is available | With report_by = code (default): report_format is forced to summary (forced_when report_by != provider; option detail enabled_when report_by == provider); procedure_codes is visible (visible_when report_by != provider); group_by offers none / provider / carrier; include_ucr is enabled (enabled_when not (report_by == provider and report_format == detail)). |
| Include UCR is ticked (PRODUCTION BY = Code) | Include Z-Codes and the Fee Schedule To Compare dropdown unlock; both are greyed while Include UCR is unticked | include_z_codes and compare_fee_schedule_id are enabled_when include_ucr == true (disabled_value false / null); compare_fee_schedule_id is required_when include_ucr == true (inferred, shared rule of 04). |
| GROUP BY = Provider (with PRODUCTION BY = Code) | the Page Break checkbox reads `Page Break by Provider` (shown ticked in the sample) | The page_break_by member group checkbox carries the label 'Page Break by Provider' when group_by == provider (label_when, shared rule of 04); the value is page_break_by = group. Its default stays unticked: the sample shows it ticked, but nothing documents an automatic tick on this report. |
| GROUP BY = Provider (with PRODUCTION BY = Code) | a PROVIDERS picker appears beside the CODES picker | provider_ids is visible_when report_by == provider or group_by == provider (shared rule of 04); otherwise it is hidden and forced to all. |
| PRODUCTION BY = Provider | REPORT FORMAT Detail becomes selectable. The document states that Detail is selectable only for PRODUCTION BY = Provider; the Category and Carrier states were not seen in any screenshot. | report_format option detail is enabled_when report_by == provider; for code, category and carrier report_format is forced to summary. Category and Carrier states were never captured: the rule follows the vendor text (Detail only for Provider) and is to be confirmed on the live tool. |
| PRODUCTION BY = Provider (state seen with REPORT FORMAT = Detail selected) | the GROUP BY options Provider and Carrier are greyed | group_by is enabled_when report_by != provider; under report_by = provider it is disabled and forced to none (the legacy greys only the Provider and Carrier options, which leaves None as the only choice - same effect). |
| PRODUCTION BY = Provider (state seen with REPORT FORMAT = Detail selected) | the CODES picker is replaced by the PROVIDERS picker | procedure_codes is visible_when report_by != provider (hidden and forced to all for provider); provider_ids becomes visible through its visible_when report_by == provider. |
| PRODUCTION BY = Provider (state seen with REPORT FORMAT = Detail selected) | a SORT BY section (Transaction Date / Patient Lastname) appears | sort_by (transaction_date / patient_last_name) is visible_when report_by == provider and report_format == detail (inferred, shared rule of 04: the state was seen only with both set); hidden otherwise, value forced to its disabled_value. |
| PRODUCTION BY = Provider (state seen with REPORT FORMAT = Detail selected) | Include UCR and Include Z-Codes are greyed | include_ucr is enabled_when not (report_by == provider and report_format == detail): greyed (disabled_value false) only in the observed Provider + Detail state; Provider + Summary keeps it, as the 2016 Production by Provider Summary sample prints the compare-fee column. include_z_codes and compare_fee_schedule_id follow through include_ucr == true. Which of the two drives the greying is to be confirmed on the live tool. |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `report_format` | forced_when | report_by != provider | summary | documented - REPORT FORMAT is locked to Summary unless PRODUCTION BY = Provider; the Detail option is greyed (option_enabled_when). |
| `procedure_codes` | visible_when | report_by != provider | - | documented - With PRODUCTION BY = Provider the CODES picker is replaced by the PROVIDERS picker. |
| `provider_ids` | visible_when | report_by == provider or group_by == provider | - | documented - PROVIDERS picker (absent from our capture). |
| `sort_by` | visible_when | report_by == provider and report_format == detail | - | inferred - SORT BY was seen with PRODUCTION BY = Provider and Detail; which of the two drives it is not documented. |
| `page_break_by` | label_when | group_by == provider | Page Break by Provider | documented - Label of the Page Break checkbox. |
| `compare_fee_schedule_id` | required_when | include_ucr == true | - | inferred - The compare column needs a schedule. |
<!-- PARITY:daily_reports.r03:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Summary` (default; locked unless PRODUCTION BY = Provider) | Aggregated rows of the `report_by` dimension + production-adjustment lists |
| REPORT FORMAT `Detail` (enabled only for PRODUCTION BY = Provider) | One row per completed procedure inside `Provider :-` sections + each provider's adjustment list; title `Production by Provider` |
| PRINT FORMAT `PDF` (default) / `Excel` | Output only; `banded_table` PDF or flat XLSX; `csv` added |
| OFFICE/GROUP `Office` (working office) / `Office Group` (ALL) | Charges whose office of service (`rpt_charges.office_id`) is in scope; `Office : <name>` band and `Total for, <office> [ <id> ] :` per office; Office Group = the enterprise view (taken: bands per office, one grand total; open question 13) |
| DATE RANGE Start / End (today / today) | Fixed basis `transaction_date` of the charge (posting date; equals `service_date` until DATA-13) and of the adjustment |
| PRODUCTION BY `Code` (default) | Row = procedure code (`Code`, `Description`); title `Production by Codes` (`- Provider` when grouped by provider) |
| PRODUCTION BY `Provider` | Row = treating provider (`Provider`, `ShortID`); title `Production by Provider`; Detail selectable; GROUP BY forced None; CODES hidden; PROVIDERS shown; Include UCR greyed only together with Detail (Summary keeps the compare-fee column, as the 2016 sample; Open questions 2) |
| PRODUCTION BY `Category` | Row = procedure category (`rpt_procedure_code_dim.code_category`); title `Production by Category`; criteria state never captured |
| PRODUCTION BY `Carrier` | Row = carrier of the charge (Data); title `Production by Carrier` (INFERRED); availability code NEW `carrier_from_current_coverage` (owned by 03, shared with RPT-DAILY-71) |
| GROUP BY `None` (default) | Office band only |
| GROUP BY `Provider` | Level `Provider :- {provider_name}` with `Total for {provider_name} :` and that provider's `Total Production Adjustments :` list; PROVIDERS picker appears beside CODES; Page Break label reads `Page Break by Provider` |
| GROUP BY `Carrier` | Level `Carrier :- {carrier_name}` with `Total for {carrier_name} :` and that carrier's `Total Production Adjustments :` list (research A3: outer sections with their own totals and adjustment lists). Carrier of an adjustment = `coalesce(rpt_adjustments.carrier_id`, carrier of the target charge through `procedure_id` resolved as for charges, member `No Insurance`); migrated legs that resolve to nothing go to member `Carrier not recorded`, counted by `carrier_source` in the payer warning (open question 7) |
| GROUP BY > Page Break (greyed until grouped) | `page_break_by = group`: new PDF page per provider / carrier; layout only |
| CODES `ALL` (default) / list | `procedure_code IN (...)` on the charge rows; hidden and forced ALL under PRODUCTION BY Provider. The adjustment lists are not filtered by codes |
| PROVIDERS (VENDOR-DOC; default all = 04 shared default, legacy default undocumented, open question 10) | Visible when PRODUCTION BY = Provider or GROUP BY = Provider; `rpt_charges.provider_id IN (...)` and `rpt_adjustments.provider_id IN (...)`; forced ALL when hidden |
| SORT BY `Transaction Date` / `Patient Lastname` (VENDOR-DOC, default first option) | Visible with PRODUCTION BY Provider + Detail; order of procedure rows inside each provider section (`transaction_date, row_id` / `patient_last_name, patient_first_name, transaction_date, row_id`) |
| OTHER OPTIONS `Include UCR` (unticked) | Ticked adds the compare-fee column `{compare_fee_schedule_name}` = SUM over the rows of the fee in force on the service date in the chosen schedule; footer `* Includes UCR`, `FeeID : <id>`; unlocks the two options below |
| OTHER OPTIONS `Include Z-Codes` (greyed until Include UCR) | With Include UCR ticked: unticked drops office-defined Z codes (`is_z_code`) from the rows, ticked keeps them. Without Include UCR, Z codes are rows as any code (builder rule of 02 section 3.11: the disabled value `false` never removes Z-code rows) |
| FEE SCHEDULE TO COMPARE (greyed until Include UCR; default = first schedule of the tenant list, unconfirmed) | The schedule whose fees fill the compare column; required while Include UCR is ticked |

Dependency rules (parity d01-d09): `report_format` forced `summary` when `report_by != provider` (option `detail`
enabled only for `provider`); `procedure_codes` visible when `report_by != provider`; `provider_ids` visible when
`report_by == provider or group_by == provider`; `group_by` enabled when `report_by != provider` (forced `none`);
`page_break_by` enabled when `group_by != none`, label `Page Break by Provider` when `group_by == provider`; `sort_by`
visible when `report_by == provider and report_format == detail` (inferred pairing); `include_ucr` enabled when
`not (report_by == provider and report_format == detail)` (greyed only in the observed Provider + Detail state; deviation from filter_card 9.6, challenge to 04); `include_z_codes` and `compare_fee_schedule_id` enabled when `include_ucr`;
`compare_fee_schedule_id` required when `include_ucr`. Drill values: a forced or hidden parameter is replaced (04 9.3), so
drills that narrow the Detail format to a code use the hidden parameter NEW `drill_procedure_codes` (`entity_multi`,
no `visible_when`, applied on `rpt_charges.procedure_code` by the Detail builder; owner `04_filter_framework.md`).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `procedure_category_codes` | `entity_multi` (shared 3.6) | `all` | Restrict to categories; shown for every `report_by` (the legacy Category state may hold this picker, unverified) | Domain question: 14 SEARCH CODE categories vs `code_category` |
| `carrier_ids` | `entity_multi` (shared 3.5) | `all` | Restrict to carriers; shown when `report_by = carrier` or `group_by = carrier` | Carrier source rules in Data |
| `production_groups` | `enum_multi` NEW (`doctor`, `hygiene`, `other`) | all ticked (no predicate) | Doctor versus hygiene production from `rpt_provider_dim.production_group` | Owner: `04_filter_framework.md` (shared candidate for Provider Dashboard) |
| `include_office_ucr` | `boolean` (04 section 15 key) | `false` | Adds `office_fee` column "Office UCR $" (gross production, PD-1) and `implied_writeoff` "Fee-sched. W/O $" beside `Charges $` | Independent of the legacy compare column; class `financial_practice` |
| `show_net_production` | `boolean` NEW | `false` | Adds a `net_production` line after each `Total Production Adjustments :` list (charges + listed adjustments) | Owner: this catalog |
| `compare_to` | `enum` (filter_card 12, FLT-26) | `none` | `previous_period` / `previous_year`: adds `charges_compare` and `charges_change_pct` columns per row | P4; `supports_comparison: true` |
| `top_n` | `integer` NEW | none | Keep the N rows with the highest charges per group, rest summed as `Other` | Screen and PDF only; owner: this catalog |
| Saved views | saved view | - | "Provider pay period" (`report_by = provider`, `date_preset = last_2_weeks`); "Code mix last month" (`report_by = code`, `last_month`, chart on) | Hub feature |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_charges` (rows), `rpt_adjustments` (adjustment lists), `rpt_procedure_code_dim` (`description`, `code_category`, `is_z_code`, `is_production`), `rpt_provider_dim` (`provider_name`, `short_id`, `production_group`), `rpt_claim_facts` (carrier through `claim_id`), `rpt_insurance_coverage` (fallback carrier), `rpt_fee_schedule_fees` (compare fee), `rpt_patient_dim` (Detail names) |
| Row filter | live charges with `is_production` (contract billing `ACBIL` / `ACBILO` excluded: `non_production_charge`), `transaction_date BETWEEN :date_from AND :date_to`, office of service in scope, `procedure_codes`, `provider_ids`, hidden drill parameter `drill_procedure_codes` (Detail); Z-code rule above |
| Measures | `perf_count` = `count(*)`; `charges` = `SUM(charged_fee)` (posted fee, PD-1); `total_duration` = `SUM(duration_minutes)` (legacy units, default 0); `compare_fee` = `SUM(schedule_fee)` of `rpt_fee_schedule_fees` for (`compare_fee_schedule_id`, `procedure_code`) with `effective_date <= service_date < coalesce(effective_to, infinity)`, one price per charge (scalar lateral); `fee` is the line total whatever `quantity` is (data_card 2.9) |
| Carrier of a charge | `coalesce(rpt_charges.primary_carrier_id` (DATA-33, P2), carrier of the primary claim of the charge's claim family (`rpt_claim_facts.carrier_id` via `claim_id`), the patient's current primary dental coverage `rpt_insurance_coverage.carrier_id` (labelled `current coverage`), member `No Insurance`); hidden column `carrier_source` counts each source for the warning |
| Adjustment lists | `rpt_adjustments` live, `txn_side = 'production'` (legacy Sub Type: what the legacy list prints), `NOT is_transfer`, same range, office (`office_id`) and provider (`provider_id`) scope; one line per `code` with `code_description`, `SUM(amount)`. Under GROUP BY Carrier each list is per carrier member (carrier of an adjustment = `coalesce(rpt_adjustments.carrier_id`, carrier of the target charge through `procedure_id` by the charge rule, `No Insurance`); unresolvable migrated legs = member `Carrier not recorded`. Migrated legs (`txn_side = 'unknown'`) form a separate line `Unclassified adjustments` with warning `migrated_adjustments_unclassified` |
| Date basis | fixed `transaction_date` (posting date) for charges and adjustments; until DATA-13 a back-dated charge counts on its date of service (warning NEW `transaction_date_equals_service_date` on every run) |
| Office attribution | office of service (`rpt_charges.office_id`); adjustments: their own office |
| Provider attribution | treating provider (`rpt_charges.provider_id`, the Ledger `Prdr`); hygienist (`hygienist_id`) not credited in parity runs |
| Coverage rating | **READY** (coverage matrix row 3) |
| Option blockers | Include UCR + Fee Schedule To Compare: `rpt_fee_schedule_fees` (DATA-51, P1); production-adjustment list on history: **REPAIR(12)**; by Carrier: **REPAIR(10)** for history (claim link backfill) and **SCHEMA(33)** for unbilled lines (current coverage until then, availability code NEW `carrier_from_current_coverage`, owned by 03); duration units on history: **REPAIR(10)** (code NEW `duration_not_recorded` when `total_duration = 0` on more than half of the rows) |
| History that cannot be produced | carrier of migrated unbilled charges at the time of service; the posting date of migrated charges that had a `DOSDATE` (until DATA-12 re-reads `TRANDATE`); migrated charges skipped at load (DATA-57 completeness caveat) |
| Reconciliation | `reconciles_with`: `main.charges` = `charged_production` (same scope, basis `transaction_date`); the adjustment lists use the legacy side, the metric `production_adjustments` uses `ledger_bucket`; the test asserts `list total - production_adjustments` = SUM of `contractual_writeoff` legs whose `txn_side = 'collection'` minus SUM of non-income production-side classes (opening balance, contract movement), zero once O-2 seeds `AINSO` / `INS_WRITE_OFF` as Production |

### Output

Summary format, block `main` (per `report_by`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id`, `provider_id`, `carrier_id` | - | hidden group keys | aggregate / provider_comp / aggregate | levels |
| `procedure_code` (`code`) | Code | text | aggregate | key |
| `description` (`code`) | Description | text | aggregate | label |
| `provider_name` (`provider`) | Provider | text | provider_comp | key |
| `provider_short_id` (`provider`) | ShortID | text | provider_comp | label |
| `category` (`category`) | Category | text | aggregate | key |
| `carrier_name` (`carrier`) | Carrier | text | aggregate | key |
| `perf_count` | #Perf | integer | aggregate | sum |
| `charges` | Charges $ | money | financial_practice (provider_comp under provider rows or group) | sum; drill `procedures` |
| `compare_fee` | `{compare_fee_schedule_name}` | money, `visible_when include_ucr` | financial_practice | sum |
| `office_fee`, `implied_writeoff` | Office UCR $, Fee-sched. W/O $ | money, `visible_when include_office_ucr` | financial_practice | sum |
| `avg_charge` | Avg $ | money, computed `ratio(charges, perf_count)` | derived | ratio of totals |
| `total_duration` | Total Dur. (Units) | integer | aggregate | sum |
| `avg_duration` | Avg. Dur. (Units) | decimal(1), computed `ratio(total_duration, perf_count)` | derived | ratio |
| `eff_rate` | Eff. Rate $ | money, computed `ratio(charges, total_duration)`, null when duration 0 | derived | ratio |
| `pct_of_group` | Per % | percent(1), computed `share_of_parent(charges)` | derived | share of parent; the provider subtotal row shows provider / grand total |

Detail format (`report_by = provider` only), block `main`: hidden `office_id`, `provider_id`, `row_id` (`entry_id`),
`patient_id`, `patient_last_name`; visible `transaction_date` "Date" (phi_identified), `chart_no` "Pat ID/ Chart #"
(phi_identified), `patient_name` "Patient" (phi_identified, key, entity patient), `procedure_code` "Code", `description`
"Description", `tooth` "Th", `surface` "Surf" (phi_identified), `duration` "Dur. (Units)" (integer, aggregate, sum),
`charges` "Charges $" (money, `financial_patient`, sum). Levels: office (multi-office) -> `Provider :- {provider_name}`
(fixed) with `Total for {provider_name} :` and the provider's adjustment trailer; `Grand Total :`. Column list INFERRED.

Block `production_adjustments` (placement `after_group` of the office level and, when grouped or Detail, of the provider
or carrier level; plus `report_end` overall list under `Grand Total :`): `adjustment_code` "Adjustment" (aggregate), `description`
(aggregate), `amount` "Amount" (money, financial_practice; provider_comp inside a provider group), subtotal `Total
Production Adjustments :`; optional `net_production` line (`show_net_production`).

Sort: Summary default = the legacy order seen in the by-code samples: `procedure_code` asc (code), `provider_name` asc
(provider), `category` asc (category), `carrier_name` asc (carrier), each with the `row_id` tie-breaker (open question 5);
`charges` desc is a NEW `sort_by` option of the Summary format (enhancement); `sort_by` options for Detail as parity. Page break: `none` / `group`. Summary cards (block totals):
`charged_production` (Charges total), `production_adjustments` (list total), `net_production` (sum of both), `#Perf`.
`empty_when`: no rows in `main` and no rows in `production_adjustments` (a range with only production adjustments prints
the lists and is not empty).

### Visuals and drill-through

Chart: horizontal bar of `charges` by the `report_by` dimension, top 15 + Other (Code / Category / Carrier); by Provider a
bar per provider with the compare fee as a second series when `include_ucr`.

| Click | Target |
|---|---|
| `charges` of a code row (Summary) | `kind = rows`, same report Detail: `report_by = provider`, `report_format = detail`, `drill_procedure_codes = [{column: procedure_code}]` (NEW hidden parameter, owner 04; `procedure_codes` itself is hidden and forced `all` under Provider), `provider_ids = {group: provider_id}` when grouped |
| Provider row or subtotal | Same report, `report_by = provider`, `report_format = detail`, `provider_ids = [provider_id]` |
| Category row | Same report, `report_by = code`, `procedure_category_codes = [category]` |
| Carrier row | Same report, `report_by = code`, `group_by = carrier` (makes `carrier_ids` visible, so it is not forced), `carrier_ids = [carrier_id]` |
| Adjustment line | `daily.special_transaction_report` filtered to the adjustment code, office and range |
| Detail patient row | `kind = record`, patient ledger (ledger right, `phi_identified`) |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open patient ledger | row (Detail) | `navigate` | Fix provider, duration or code |
| Create task "enter duration" | bulk (Detail rows with `duration = 0`) | `create_task` | Durations feed `Eff. Rate $`; P3 (ENG-49) |
| Export selection | bulk | `export_selection` | P3 |

Not a worklist.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape; header practice-group name + variant title; office band; provider / carrier band; adjustment lists after each group; footer echo `From`, `Thru`, `Offices`, `Providers`, `Codes`, `FeeID`, `* Includes UCR`, `* Detail Report`, `Printed :`, `Page : n of m`; page break per group when ticked |
| XLSX | `main` sheet flat (group keys as columns, outline grouping), `production_adjustments` sheet (with `office_name`, `provider_name` columns), `criteria` sheet; ratio columns as values computed from unrounded components |
| CSV | `main` block |
| Background | `escalate_when` date span > 92 days or > 5 offices (02 section 3.11) once ENG-38 exists (P2); P1 limit `max_date_span_days` 366 |

### Open questions

| # | Question | Check / decision |
|---|---|---|
| 1 | Criteria of PRODUCTION BY Category and Carrier (pickers, Detail availability) | Open both states (RPT-DAILY-09) |
| 2 | Is Include UCR greyed by PRODUCTION BY Provider or by REPORT FORMAT Detail (a 2016 Provider Summary sample prints a compare column) | Open Provider + Summary and Provider + Detail; until then Include UCR is greyed only for Provider + Detail (deviation from filter_card 9.6, challenge to 04) |
| 3 | Z codes when Include UCR is off: included (assumed) or excluded | Run with a Z code posted, UCR off |
| 4 | Default of Fee Schedule To Compare: first list entry (assumed) or the office UCR schedule (02 section 3.11 example) | Open the dropdown on a second tenant |
| 5 | Row order of Summary rows (code order taken as default; `charges` desc offered as option) and SORT BY default | Compare two samples |
| 6 | Detail columns of Production by Provider | Run Provider + Detail |
| 7 | GROUP BY Carrier: page-break label, carrier picker; does the legacy print an adjustment list per carrier (taken: yes, research A3) and how does it attribute adjustments to a carrier | Open the state; run with a write-off on an insured charge |
| 8 | Is `Category` the 14 SEARCH CODE categories (family question 7) | Open the CATEGORY picker if one appears |
| 9 | Product: do opening-balance and contract-movement production-side codes belong in `Total Production Adjustments` (legacy prints them, analytics excludes them) | O-2 owner |
| 10 | Default value and list of the PROVIDERS picker under GROUP BY Provider and PRODUCTION BY Provider (taken: all, the 04 shared default) | Open both states |
| 11 | Is `Page Break by Provider` ticked automatically under GROUP BY Provider (the sample shows it ticked; taken: unticked, unlike Daily Audit `default_when`) | Switch GROUP BY to Provider on a fresh screen |
| 12 | Is SORT BY driven by PRODUCTION BY = Provider or by REPORT FORMAT = Detail (taken: both required) | Open Provider + Summary |
| 13 | Office Group output: one band per office with a grand total (taken) or one consolidated set of rows | Run Office Group with two offices |

## Collection Report - `daily.collection_report`

Daily Reports, screenshot 4.PNG - P1 - L - `reports_daily_reports_screen_view_only` (family `daily`) - interactive (By Code inline in P1 with a 31-day cap; background escalation from P2, ENG-38) - PARTIALLY DOCUMENTED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front office / bookkeeper | End of day, with the Daily Journal payments run, as Detail with COLLECTION BY Provider (old `Daily Collection`, research A4 [P1]) | What was collected today, per provider, per payment code, with collection adjustments |
| Manager / analyst | Month end | Payments total + collection adjustments total, office-wide and per provider ([T1]); `reconciles_with` makes it a test |
| Billing | On demand, by Carrier | Insurance money received per carrier |
| Owner | On demand, by Code | Which procedure codes the money was collected against |

### Legacy output

Confidence: PARTIALLY DOCUMENTED. By Code layout seen [P12·img]; By Provider summary tail seen [T1·img]; None / Carrier /
Summary and the detail line columns are INFERRED.

| Variant (title) | Content | Confidence |
|---|---|---|
| `Collection Report by Code - Detail` | `Office : <name>` -> one row per code collected against: `Code`, `Descr`, `# Perf`, `UCR` (office default UCR, ADA codes only), `Amount` (charged), `Est Ins`, `Payments` (patient, negative), `Ins. Pay` (insurance, negative), `Adjust` -> `Total:` | DOCUMENTED |
| `Collection Report By Provider - Detail` | Provider sections with payment lines (line columns not visible), ending in a summary block: each payment code with patient / insurance / total -> `Total Payments :`, then `Adjustments` listing each collection adjustment code -> `Total Adjustments :`. Footer `Offices`, `Provider`, `Payment Type`, `* With Adjustments(Collection)` | Tail DOCUMENTED; lines INFERRED |
| None / Carrier, Detail | Payment lines per office (None) or per carrier section; columns proposed from the Open Dental `Daily Payments` comparable (`Date`, paying patient, `Provider`, `Check#`, `Amount`) [C4] | INFERRED |
| Summary (any COLLECTION BY) | Totals only | INFERRED |

Sign convention: payments negative, adjustments with their own sign (family rule); the analytics figure is `-sum`.
Quirks kept: no provider picker on the base screen although the footer echoes `Provider` (we echo `Provider : ALL` unless
the enhancement filter is used); totals are not comparable with income allocation [P47]. Quirk fixed: the vendor's
file-size failure on a full-year all-office run [P49] becomes an inline cap with `report_too_large_for_inline` in P1 and a background run from P2 (ENG-38).

### Parameters - legacy parity

<!-- PARITY:daily_reports.r04:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT FORMAT | (no label) (radio_group) | **Detail** / Summary | `report_format` | enum | Detail -> `detail`, Summary -> `summary` | `detail` | replicated | Detail = payment lines inside the COLLECTION BY sections plus the summary block (By Code: the code table); Summary = totals per member. Both options enabled in every state (no dependency captured). |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group (picker source switches with the mode). Both options enabled on this report. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Default = id of the office the user was working in (capture shows 108). Mode office: one or more offices the caller can read (default working_office); mode office_group: groups of Setup > Office Groups (default all). The selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary range, fixed basis transaction_date of the payment and collection-adjustment legs (coverage matrix row 4); no date_basis radio. Default = today in the office time zone; enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the fixed transaction_date range. Default = today in the office time zone; enhanced with presets and relative tokens. |
| PAYMENT TYPES | Payment Types (picker) | shown: ALL | `payment_codes` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog becomes a searchable multi-select; ALL = no restriction. Restricts payment legs to the chosen payment codes (Setup > Payment/Adjustment Types), not the tender categories of the checkbox variant. Proposal (not documented): collection adjustments are not filtered by it - open question 8. Dialog content never captured. |
| COLLECTION BY | (no label) (radio_group) | **None** / Provider / Carrier / Code | `group_by` | enum | None -> `none`, Provider -> `provider`, Carrier -> `carrier`, Code -> `code` | `none` | replicated | COLLECTION BY groups the report (it has a None option and the Page Break twin) and also sets the printed variant title. |
| COLLECTION BY | Page Break (checkbox) | **unchecked** - greyed out | `page_break_by.group` | enum | - | `false` | replicated | Enabled when: group_by != none (inferred). Page Break checkbox beside COLLECTION BY; greyed while None is selected; enabled for Provider, Carrier and Code (inferred - open question 10). Under COLLECTION BY Code the break is per office (proposal, open question 9). |
| OTHER OPTIONS | Include Adjustments(Collection) (checkbox) | **checked** | `include_collection_adjustments` | boolean | - | `true` | replicated | - |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:daily_reports.r04:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | Payment lines (and collection-adjustment lines when included) inside the COLLECTION BY sections, then the summary block; By Code: the code table |
| REPORT FORMAT `Summary` | No lines: one total row per section member (office / provider / carrier) and the summary block; By Code: the code table (Summary layout unverified) |
| PRINT FORMAT `PDF` (default) / `Excel` | Output only; `csv` added |
| OFFICE/GROUP `Office` (working office) / `Office Group` (ALL) | Payment legs whose transaction office (`rpt_payments.office_id`, the office where the payment was applied) is in scope; `Office :` section each |
| DATE RANGE Start / End (today / today) | Fixed basis `transaction_date` of the payment and adjustment legs |
| PAYMENT TYPES `ALL` (default) / list of payment codes | `rpt_payments.code IN (...)` (payment codes of Setup > Payment/Adjustment Types, not tender categories); does not filter collection adjustments (proposal, open question 8); migrated payments (alias codes) match only under ALL until DATA-12 |
| COLLECTION BY `None` (default) | Office sections only; title `Collection Report - Detail` / `- Summary` (INFERRED) |
| COLLECTION BY `Provider` | Level `Provider : {provider_name}` on the credited provider of the payment (`rpt_payments.provider_id`, "provider on payment"; NULL = `Unassigned provider`) and of the adjustment (`rpt_adjustments.provider_id`); title `Collection Report By Provider - Detail`; reproduces `Daily Collection` |
| COLLECTION BY `Carrier` | Level `Carrier : {carrier_name}` on `rpt_payments.carrier_id` (insurance payments); patient payments in member `Patient`, insurance payments without carrier in `Carrier not recorded` (warning `carrier_on_payment_missing`); title `Collection Report by Carrier - Detail` (INFERRED); P1 on remittance legs (RPT-DAILY-22a), stamped carrier on insurance checks after DATA-33 (RPT-DAILY-22b) |
| COLLECTION BY `Code` | Other result block `by_code` (filter_card section 8): rows = procedure codes the payments were allocated to; title `Collection Report by Code - Detail` |
| COLLECTION BY > Page Break (greyed while None) | `page_break_by = group`: new PDF page per provider / carrier; under By Code per office (proposal, open question 9); layout only |
| OTHER OPTIONS `Include Adjustments(Collection)` (ticked) | Collection-side adjustments of the range are added: lines (Detail), `Adjust` column, the Adjustments section of the summary block, footer `* With Adjustments(Collection)`. Unticked: payments only |

Dependency rules: `page_break_by` member `group` `enabled_when ["ne","group_by","none"]` (inferred from the greyed
default: enabled for Provider, Carrier and Code, open question 10). `report_format` has no lock. No legacy rule hides a control.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `provider_ids` | `entity_multi` (shared 3.2, role credited provider) | `all` | Restrict to providers on the payment; fills the footer `Provider` echo the legacy prints | Additive: the legacy screen has no picker |
| `payment_types` | `enum_multi` (shared 3.8, tender categories) | all ticked (no predicate) | Pick by tender (cash, check, credit card, CareCredit, direct deposit, internal financing, none) instead of single codes; ANDed with `payment_codes` | From `rpt_payments.deposit_group` |
| `payer_types` | `enum_multi` NEW (`patient`, `insurance`) | both (no predicate) | Patient-only or insurance-only collections | From `payer`; owner `04_filter_framework.md` |
| `carrier_ids` | `entity_multi` (shared 3.5) | `all` | Restrict insurance payments to carriers; shown when `group_by = carrier` | App-era remittances only until DATA-33 |
| `user_ids` | `entity_multi` (shared 3.2) | `all` | Payments posted by the selected users (cash-drawer check) | Migrated rows match only under `all` |
| `compare_to` | `enum` (FLT-26) | `none` | Prior-period column per section member (`payments_compare`, `change_pct`) | P4 |
| Saved views | saved view | - | "Daily Collection" (`group_by = provider`, Detail, today); "Insurance by carrier - month to date" (`group_by = carrier`, `payer_types = [insurance]`, `month_to_date`) | Hub feature |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_payments` (payment legs), `rpt_adjustments` (collection adjustments), `rpt_payment_allocations` / `rpt_fifo_allocations()` (By Code), `rpt_charges` (By Code `UCR`, `Amount`, `Est Ins` of the paid charges), `rpt_transaction_code_dim`, `rpt_patient_dim`, `rpt_provider_dim`, `rpt_claim_facts` (carrier name) |
| Payment rows | live `rpt_payments` (both stores, in-app remittances included: PD-2), `transaction_date` in range, office in scope, `payment_codes`; columns `entry_id`, `payer`, `amount`, `code`, `code_description`, `counts_as_collection`, `collection_class_quality`, `deposit_group`, `transaction_date`, `office_id`, `provider_id`, `patient_id`, `carrier_id`, `check_number`, `user_key`, `is_sign_anomaly`. A reversed payment with refund stays live; its refund is a collection-adjustment leg (data_card 2.10) |
| Adjustment rows (`include_collection_adjustments`) | live `rpt_adjustments` with `txn_side = 'collection'`, `NOT is_transfer`, `entry_type IN ('adjustment','refund')`; migrated legs (`txn_side = 'unknown'`) as one line `Unclassified adjustments` with warning `migrated_adjustments_unclassified` |
| Detail line split | `pat_payment` = `amount` where `payer` is patient; `ins_payment` where insurance; `adjust` = adjustment legs |
| By Code | P1 inline: `rpt_fifo_allocations(tenant, <accounts with a credit in scope>, :date_to, 'account')` as an interactive function dataset narrowed by the account list, `office_ids` and the range (ENG-59 narrowing argument; DATA-20, P1); P2: `rpt_payment_allocations` (DATA-26). Credits in scope = allocation rows whose `credit_entry_id` is (a) a payment leg with `credit_office_id` IN office scope, `credit_transaction_date` in range and `code IN payment_codes`, plus (b) only when `include_collection_adjustments`, a credit leg of `rpt_adjustments` with `txn_side = 'collection'` and `NOT is_transfer` in the same office scope and range. Production-side credits (`txn_side = 'production'`, `credit_ledger_bucket = 'production_adjustment'`) are excluded. Row = `procedure_code` of the debit; `perf_count` = count of live `rpt_charges` rows of that `procedure_code` with `is_production`, `transaction_date` in range, office in scope ("times performed in the range", research A4); hidden `allocated_charge_count` = `count(DISTINCT debit_entry_id)` for reconciliation; `ucr` = `office_fee` of the paid charges where `rpt_procedure_code_dim.is_cdt`, else 0.00 (research A4 "ADA codes only"; open question 11); `amount`, `est_ins` = `charged_fee`, `est_insurance` of the paid charges (each charge once); `payments` / `ins_pay` = `-SUM(allocation amount)` of credits (a) by payer, `adjust` = `-SUM(allocation amount)` of credits (b); credits of (a) not allocated to a charge form rows `Unallocated`, `Refunded`, `Opening balance / transfer`. Identities: `SUM(payments + ins_pay)` = payment total of the same parameters (R-08); `SUM(adjust)` = collection-adjustment credit total. Printed note "allocation derived (oldest first)" when `is_derived` rows exist. Caps: `max_date_span_days` 31 and `max_rows_inline`; above either the run fails with `report_too_large_for_inline` until ENG-38 (P2) |
| Date basis | fixed `transaction_date` |
| Office attribution | transaction office (where applied); NULL = `Unassigned office` |
| Provider attribution | credited provider on the payment line (`rpt_payments.provider_id`) - P1 rule of data_card 2.13. Deviation from PD-7 for legacy parity: the legacy By Provider prints the provider on the payment line (research A4, unverified; open question 3). Allocation provider offered from P2 as enhancement `provider_attribution = allocation` (NEW, owner 04; DATA-26) with an explicit `Unallocated` member |
| Coverage rating | **READY** (coverage matrix row 4) |
| Option blockers | By Code: P1 inline on per-account derived allocations with a 31-day cap (code NEW `allocations_derived`), tenant-wide table P2 (DATA-26); by Carrier: **APP** for remittances, **SCHEMA(33)** for `patient_payments` insurance checks (no carrier until then, code NEW `carrier_on_payment_missing`); payment-type picker on history: **REPAIR(12)** (code `migrated_codes_collapsed` NEW) |
| History that cannot be produced | carrier of migrated insurance payments; payment code and card brand of migrated payments; the split of migrated adjustments into collection and production; legacy allocation lines (By Code on history is a derived oldest-first result and will not match a Denticon print line by line) |
| Reconciliation | `reconciles_with`: SUM of `pat_payment + ins_payment` over rows with `counts_as_collection` = `-gross_collections`. Adjustments: the list selects by legacy Sub Type (`txn_side = 'collection'`), the metric `collection_adjustments` by `ledger_bucket`, so the test is a bridge: list total - `collection_adjustments` = SUM(`amount`) of `txn_side = 'collection'` legs whose `ledger_bucket IN ('production_adjustment','non_income_adjustment','opening_balance')` - SUM(`amount`) of `collection_adjustment`-bucket legs whose `txn_side <> 'collection'`; zero once O-2 is seeded (RPT-DAILY-07, RPT-DAILY-20); payments with `counts_as_collection = false` (`COLPY`, conversion credits) keep their own summary line marked `not a collection` and are outside the metric |

### Output

Detail (`group_by` none / provider / carrier), block `main` (`row_id_column = row_id`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id`, `provider_id`, `carrier_id` | - | hidden group keys | aggregate / provider_comp / aggregate | levels |
| `row_id` | - | id, hidden | aggregate | `entry_id` |
| `patient_id` | - | id, hidden | phi_identified | drill key |
| `transaction_date` | Date | date | phi_identified | none |
| `chart_no` | Pat ID/ Chart # | text | phi_identified | none |
| `patient_name` | Patient Name | text, entity patient | phi_identified | key column |
| `provider_short_id` | Prdr | text | aggregate | none |
| `code` | Code | text | phi_identified | none |
| `description` | Description | text | phi_identified | none |
| `check_number` | Check # | text | payment_instrument | none (dropped without the class) |
| `pat_payment` | Payments | money (negative) | financial_patient | sum per group, office, grand |
| `ins_payment` | Ins. Pay | money (negative) | financial_patient | sum |
| `adjust` | Adjust | money, `visible_when include_collection_adjustments` | financial_patient | sum |
| `total` | Total | money, computed sum of the three | derived | sum |

Column list INFERRED (only the summary tail and the By Code table were seen). Levels: office (multi-office, subtotal
`Total for Office : {office_name}`) -> provider / carrier member (subtotal `Total for {member} :`). Sort inside a section:
`transaction_date`, `patient_last_name`, `row_id`. Grand total `Grand Total :`.

Summary (`group_by` none / provider / carrier), block `main`: one row per member of the innermost level: `member_label`
("Office" / "Provider" / "Carrier"; provider_comp under provider), `pat_payment`, `ins_payment`, `adjust`, `total`
(money `financial_practice`; `provider_comp` under provider), `payment_count` (`count(DISTINCT payment_group_key)`,
integer) - sums.

Block `collection_summary` (both formats, placement `after_group` of the office level and `report_end`; per provider
section too when `group_by = provider`, INFERRED): `section` (hidden: `payments`, `adjustments`), `line_label` (code +
description, aggregate), `pat_amount` "Patient", `ins_amount` "Insurance", `total` "Total" (money financial_practice;
provider_comp inside a provider section); subtotals `Total Payments :`, `Total Adjustments :` (Adjustments section only
when included). Built by the shared block builder (RPT-DAILY-03) restricted to the two sections.

By Code, block `by_code` (both formats): `office_id` (hidden), `procedure_code` "Code" (aggregate, key), `description`
"Descr" (aggregate), `perf_count` "# Perf" (integer, sum), `ucr` "UCR", `amount` "Amount", `est_ins` "Est Ins",
`payments` "Payments", `ins_pay` "Ins. Pay", `adjust` "Adjust" (money financial_practice, sum); hidden
`allocated_charge_count` (integer, aggregate, sum; reconciliation only); total `Total:`; sort `procedure_code` asc, pseudo
rows last.

Page break: `none` / `group`. Summary cards (block totals): `gross_collections` (payments with `counts_as_collection`),
`patient_collections`, `insurance_collections`, `collection_adjustments`, `net_collections` (gross + adjustments).
`empty_when`: `no_detail_rows` (Detail) / `total_is_zero` on `collection_summary.total` (Summary).

### Visuals and drill-through

Chart: bar of `total` by provider or carrier (COLLECTION BY Provider / Carrier); donut of payments by tender
(`deposit_group`) for None; none for By Code (a table).

| Click | Target |
|---|---|
| Patient row | `kind = record`, patient ledger (ledger right) |
| Provider / carrier subtotal or Summary row | `kind = rows`, same report Detail filtered to the member (`provider_ids` / `carrier_ids` through `param_map`) |
| Payment-code line of the summary block | Same report Detail, `payment_codes = [code]` |
| Office `Total Payments :` | `kind = report`, `daily.deposit_slip` with the same office scope and range, `date_basis = transaction_date`, `payment_types` = all seven members (`cash`, `check`, `credit_card`, `care_credit`, `direct_deposit`, `internal_financing`, `none`), `payment_codes` copied. Totals tie only where `office_id = posting_office_id` (the slip attributes to the posting office) |
| By Code row | `kind = report`, `daily.production_report`, `report_by = code`, `procedure_codes = [code]`, same range (what was produced versus collected for the code) |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open patient ledger | row | `navigate` | Correct the provider or code of a payment |
| Create task "assign provider" | bulk (rows in `Unassigned provider`) | `create_task` | Turns the Unassigned section into a queue; P3 (ENG-49) |
| Export selection | bulk | `export_selection` | P3 |

Doubles as a worklist only for the `Unassigned provider` section; not live-paged.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait for Summary, landscape for Detail and By Code; header practice-group name + variant title; office / provider / carrier bands; summary block at the end of each office and the report; footer echo `From`, `Thru`, `Offices`, `Provider`, `Payment Type`, `* With Adjustments(Collection)`, `Printed :`, `Page : n of m` |
| XLSX | `main` (or `by_code`) sheet flat with group columns, `collection_summary` sheet, `criteria` sheet; `check_number` absent without `payment_instrument` |
| CSV | `main` or `by_code` block |
| Background | P1 has no background path (ENG-38 is P2): Detail runs inline with `max_rows_inline` 5,000 and a run warning; By Code runs inline with `max_date_span_days` 31 and fails with `report_too_large_for_inline` above the caps. From P2, Detail above 31 days or 5 offices and By Code above the caps escalate to background (ENG-38) |

### Open questions

| # | Question | Check / decision |
|---|---|---|
| 1 | Detail line columns for None / Provider / Carrier | Run each with a two-payment day |
| 2 | Summary format layout | Run Summary with each COLLECTION BY |
| 3 | Provider meaning: payment-line provider (assumed; deviation from PD-7, allocation provider as P2 enhancement) or allocation provider | Payment on a charge of another provider |
| 4 | Do provider / carrier / code pickers appear for the other COLLECTION BY choices (footer echoes Provider) | Open each state |
| 5 | Is the summary block printed per provider section or once at the end | Sample with two providers |
| 6 | By Code: does `# Perf` also count charges of earlier dates that received money (taken: times performed in the range, research A4); are unallocated credits shown | Compare with a legacy By Code print |
| 7 | Product: P1 By Code runs inline on per-account derived allocations with a 31-day cap (taken); confirm against open decision O-12 of 03 (nightly `rpt_derived_allocations` in P1 is the alternative) | Data foundation owner |
| 8 | Do Payment Types restrict the collection adjustments (taken: no) | Pick one payment code with Include Adjustments ticked |
| 9 | What Page Break does under COLLECTION BY Code (taken: per office) | Tick Page Break with Code |
| 10 | Is Page Break enabled for every COLLECTION BY value other than None (taken) | Switch each value |
| 11 | By Code `UCR`: the fee stamped on the charge (`office_fee`, taken) or the fee in force in the office default UCR schedule (`rpt_office_dim.default_ucr_fee_schedule_id` via `rpt_fee_schedule_fees`); 0.00 for non-ADA codes (taken) | Compare a code whose UCR changed after posting |

## Deposit Slip - `daily.deposit_slip`

Daily Reports, screenshot 5.PNG - P1 - M - `daily` family (`reports_daily_reports_screen_view_only` / `_full_control`) - interactive (background above 31 days) - DOCUMENTED

### Purpose

| Who | When | Task / decision |
|---|---|---|
| Front office, office manager | Every end of day, all payment types or one type at a time | Prove the bank deposit: every cash payment and every posted check is in the drawer and on the deposit ticket |
| Office manager, DSO finance | Daily / weekly | Balance card and financing batches against the card processor and the financing company report |
| Front office | On demand | Find a payment by check number (browser find in the legacy tool; quick filter here) |

One report replaces the older `Deposit Slip`, `Deposit Slip - Credit Card`, `Deposit Slip - Care Credit`, `Deposit Slip - Direct Deposit` (research 7); the four old names are `legacy_names[]` aliases.

### Legacy output

Confidence DOCUMENTED (samples 2012 / 2020 / 2022, research A5). Title `Deposit Slip`.

| Block | Content (legacy labels) |
|---|---|
| Header | Practice name; title `Deposit Slip`; office name, address, phone; run date in long form; older variants an `Account No :` line |
| One section per ticked payment type | Fixed order of the checkboxes: Cash, Check, Credit Card, CareCredit, Direct Deposit, Internal Financing, None |
| Check section columns | `Patient`, `Bank #`, `Check #`, `Amount` |
| Card / financing section columns | `Patient Name (Chart #)`, `Amount`, sub-headed by payment code |
| Cash section columns | Not described separately; taken as the card layout (`Patient Name (Chart #)`, `Amount`) - INFERRED |
| Date groups | `Transaction Date: <date>` (older: `Date :`) -> lines -> `Total Checks, <date>:` |
| Totals | `Total for <payment code> :`, `Grand Total For Checks:` (per section), `Grand Total:` |
| Footer | `Transaction From` / `Transaction Thru`, `Payment Types`, `Offices`, `Providers`, `Users`, `Check Type`, `* Show Patient` or `* Show Responsible Party` |

| Convention / quirk | Treatment here |
|---|---|
| Payments print as positive amounts (the ledger stores them negative) | Kept: display value `-amount` (header money rules) |
| A payment code reaches a section only if its Sub Type / Class are set in setup (a legacy Care Credit code with blank Sub Type never reaches CareCredit) | Kept as data rule: the section is `rpt_transaction_code_dim.deposit_group` of the code version valid on the line's `transaction_date`; a code with no group falls under `None` |
| "Show Cash" in older guidance | Is the Cash checkbox; no extra control |
| Legacy Excel = layout copy with merged cells | Fixed: flat typed sheet (header XLSX rule) |
| Vendor conflict on what `Transaction Date` means (family open question 1) | Bound to `rpt_payments.transaction_date` (ledger date); confirmed by RPT-DAILY-09 |

### Parameters - legacy parity

<!-- PARITY:daily_reports.r05:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group (picker source switches with the mode). Both options enabled on this report. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Default = id of the office the user was working in (capture shows 108). Mode office: one or more offices the caller can read (default working_office); mode office_group: groups of Setup > Office Groups (default all). The selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER/USER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; all = no restriction. Provider role: credited provider on the payment line (rpt_payments.provider_id, nullable: payments without a provider match only under all). Provider and User always both apply (vendor documentation). |
| PROVIDER/USER | User (picker) | shown: ALL | `user_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; all = no restriction. User role: the user who posted the payment (user_key). Migrated rows match only under all. |
| DATE RANGE | (no label) (radio_group) | **Transaction Date** / Payment Date | `date_basis` | enum | Transaction Date -> `transaction_date`, Payment Date -> `payment_date` | `transaction_date` | replicated | - |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range; date_basis is fixed per report or chosen by the basis radio of the same section. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| PAYMENT TYPES | Cash (checkbox) | **checked** | `payment_types.cash` | enum_multi | - | `true` | replicated | Member of the payment type (tender category) checkbox group. |
| PAYMENT TYPES | Check (checkbox) | **unchecked** | `payment_types.check` | enum_multi | - | `false` | replicated | Member of the payment type (tender category) checkbox group. |
| PAYMENT TYPES | Credit Card (checkbox) | **unchecked** | `payment_types.credit_card` | enum_multi | - | `false` | replicated | Member of the payment type (tender category) checkbox group. |
| PAYMENT TYPES | CareCredit (checkbox) | **unchecked** | `payment_types.care_credit` | enum_multi | - | `false` | replicated | Member of the payment type (tender category) checkbox group. |
| PAYMENT TYPES | Direct Deposit (checkbox) | **unchecked** | `payment_types.direct_deposit` | enum_multi | - | `false` | replicated | Member of the payment type (tender category) checkbox group. |
| PAYMENT TYPES | Internal Financing (checkbox) | **unchecked** | `payment_types.internal_financing` | enum_multi | - | `false` | replicated | Member of the payment type (tender category) checkbox group. |
| PAYMENT TYPES | None (checkbox) | **unchecked** | `payment_types.none` | enum_multi | - | `false` | replicated | Checkbox literally labelled None: payment types whose type field is blank (vendor documentation), not a select-nothing shortcut. |
| CHECK TYPE | (no label) (radio_group) | **Both** / Patient Checks / Insurance Checks - greyed out | `check_type` | enum | Both -> `both`, Patient Checks -> `patient_checks`, Insurance Checks -> `insurance_checks` | `both` | replicated | Enabled when: payment_types contains check. Greyed until the Check payment type is ticked. |
| GROUP BATCH CHECKS | GROUP BATCH CHECKS (checkbox) | **unchecked** - greyed out | `group_batch_checks` | boolean | - | `false` | replicated | Enabled when: payment_types contains check (inferred). Section header doubles as the checkbox. Greyed in the default state. |
| GROUP BATCH CHECKS | (no label) (radio_group) | **Batch ID(Batch Insurance Payment)** / Check# - greyed out | `batch_check_grouping` | enum | Batch ID(Batch Insurance Payment) -> `batch_id`, Check# -> `check_number` | `batch_id` | replicated | Enabled when: group_batch_checks == true. Greyed until GROUP BATCH CHECKS is ticked. |
| OTHER OPTIONS | (no label) (radio_group) | **Show Responsible Party** / Show Patient / None | `payer_display` | enum | Show Responsible Party -> `responsible_party`, Show Patient -> `patient`, None -> `none` | `responsible_party` | replicated | payer_display is a NEW report-specific parameter key (owner: this definition; candidate for 04 section 15). None = names suppressed, group totals only (taken; open question 1). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| PAYMENT TYPES Check is ticked | CHECK TYPE (Both / Patient Checks / Insurance Checks) unlocks; it is enabled only while Check is ticked | check_type is enabled_when ['in', 'payment_types', ['check']] holds (the list contains check); otherwise disabled with disabled_value both. |
| the GROUP BATCH CHECKS header checkbox is ticked | its radios Batch ID(Batch Insurance Payment) / Check# unlock | batch_check_grouping is enabled_when group_batch_checks == true (disabled_value batch_id); group_batch_checks itself is enabled_when the payment_types list contains check (inferred). |
| OFFICE/GROUP = Office Group | the picker box selects office groups defined in Setup > Office Groups instead of offices, and its default is ALL (in Office mode the default is the logged-in OID) | office_scope: mode office_group switches the picker to lookup:office_groups and writes office_group_id with default all; mode office uses lookup:offices and office_ids with default working_office. Exactly one value key is sent. |
| the criteria screen was opened from a saved favorite (My Favorites) | the ADD TO MY FAVORITES action button reads UPDATE MY FAVORITES | Hub feature (07): a report opened from a saved view or favorite shows 'Update favorite' instead of 'Add to favorites'; the action updates that report_saved_views row (new definition_version stamped). |
<!-- PARITY:daily_reports.r05:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` / `Excel` | `output_format` `pdf` / `xlsx` (+ `csv`); never changes rows; the run always previews on screen first |
| OFFICE/GROUP `Office` + picker (default working office) | Payments whose posting office `coalesce(posting_office_id, office_id)` is in `office_ids`; several offices = one Office band per office |
| OFFICE/GROUP `Office Group` + picker (default ALL) | Offices of the chosen group(s) (`office_group_id`); `all` = every office the caller may read |
| PROVIDER/USER > Provider (ALL) | `rpt_payments.provider_id IN (...)` (credited provider); payments without a provider match only under `all` |
| PROVIDER/USER > User (ALL) | `user_key IN (...)` of the poster; migrated rows match only under `all`. Provider and User always both apply (AND) |
| DATE RANGE `Transaction Date` (default) | Range on `rpt_payments.transaction_date`; date-group header `Transaction Date: <date>`, footer `Transaction From` / `Transaction Thru` |
| DATE RANGE `Payment Date` | Range on `rpt_payments.payment_date` (date the payment applies to); header `Payment Date: <date>`, footer `Payment From` / `Payment Thru`. Same rows as Transaction Date until DATA-13 (warning) |
| Start Date / End Date (today / today) | Inclusive office-local range on the chosen basis |
| PAYMENT TYPES `Cash` (ticked) | Section `Cash`: `deposit_group = 'cash'` |
| PAYMENT TYPES `Check` | Section `Checks`: `deposit_group = 'check'`; unlocks CHECK TYPE and GROUP BATCH CHECKS |
| PAYMENT TYPES `Credit Card` | Section `Credit Card`: `deposit_group = 'credit_card'`, sub-headed by payment code |
| PAYMENT TYPES `CareCredit` | Section `CareCredit`: `deposit_group = 'care_credit'` |
| PAYMENT TYPES `Direct Deposit` | Section `Direct Deposit`: `deposit_group = 'direct_deposit'` |
| PAYMENT TYPES `Internal Financing` | Section `Internal Financing`: `deposit_group = 'internal_financing'` (no seeded code carries it today: empty until a tenant code is mapped) |
| PAYMENT TYPES `None` | Section `None`: `deposit_group = 'none'` or NULL (blank type field; conversion credits `APBAC`, `APBIC`, `COLPY`, migrated rows without tender) |
| All seven ticked | `semantics.full_selection = no_predicate`: every payment, sectioned |
| CHECK TYPE `Both` (default) | Check section lists patient and insurance checks |
| CHECK TYPE `Patient Checks` | Check section keeps `payer = 'patient'` (posted in Transaction Entry); other sections unaffected |
| CHECK TYPE `Insurance Checks` | Check section keeps `payer = 'insurance'` (posted in the Insurance Payment screen, both stores) |
| GROUP BATCH CHECKS (unticked) | One line per payment row: a cheque that paid N claims prints N lines |
| GROUP BATCH CHECKS ticked + `Batch ID(Batch Insurance Payment)` | Insurance check lines collapse to one line per insurance batch (remittance, DATA-28; interim `payment_group_key`), name = carrier |
| GROUP BATCH CHECKS ticked + `Check#` | Check lines collapse to one line per (`check_number`, `bank_number`, payer, date, office); amount summed |
| OTHER OPTIONS `Show Responsible Party` (default) | Name column = guarantor `Last, First` of the payment's account (`rpt_account_dim`); footer `* Show Responsible Party` |
| OTHER OPTIONS `Show Patient` | Name column = patient `Last, First (Chart #)`; footer `* Show Patient` |
| OTHER OPTIONS `None` | No names: detail lines suppressed, group totals only (export shape `summary_only`) - meaning "totals only" to confirm |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD (UPDATE) TO MY FAVORITES | Reset to defaults / run + render / saved view + favorite (`Update favorite` when opened from one) |

| Dependency rule | Expression |
|---|---|
| d01 CHECK TYPE enabled only while Check is ticked | `check_type.enabled_when = ["in", "payment_types", ["check"]]`, `disabled_value both` |
| d02 Batch radios unlock with GROUP BATCH CHECKS | `batch_check_grouping.enabled_when = ["truthy", "group_batch_checks"]`, `disabled_value batch_id` |
| GROUP BATCH CHECKS itself (inferred) | `group_batch_checks.enabled_when = ["in", "payment_types", ["check"]]`, `disabled_value false` |
| d03 Office Group mode | picker source `lookup:office_groups`, default `all`; Office mode `lookup:offices`, default `working_office` |
| d04 favorite opened | `Update favorite` label (hub feature) |

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_range` presets | `date_range` | `today` | `yesterday` (morning deposit of the previous day), `this_week`; relative token in saved views |
| `payment_codes` | `entity_multi` (`lookup:transaction_codes`, payment kind) | `all` | Narrow a section to codes (one card brand code, one financing code) |
| `show_refund_legs` | `boolean` (NEW, 04) | `false` | Marks payments reversed with refund (`is_reversed_by_refund`) and prints the linked refund leg beside them; rows and totals unchanged (reversed-with-refund payments stay live on their date by default, data card 2.10) |
| `deposit_status` | `enum` (NEW, 04; P2 after DATA-28) `all` / `undeposited` / `deposited` | `all` | Lists only payments not yet on a deposit: the deposit-pack worklist |
| `show_card_brand` | `boolean` (NEW, 04) | `false` | Adds `Card` (brand + last four, DATA-12) in card sections for processor reconciliation |
| Saved view "All tender types" | saved view | - | All seven boxes ticked, `yesterday`, Show Patient |
| Quick filter on `Check #` | screen | - | Replaces the legacy browser-find routine |

### Data

| Item | Binding |
|---|---|
| Datasets | `rpt_payments` (all payment legs, both stores, PD-2), `rpt_transaction_code_dim` (through the row's `deposit_group` / `tender_class` / `card_brand`), `rpt_patient_dim`, `rpt_account_dim`, `rpt_user_dim`, `rpt_office_dim`; batch-line carrier name from `rpt_claim_facts.carrier_name` (through the remittance's claims) or `rpt_insurance_coverage.carrier_name` |
| Columns read | `entry_id`, `patient_id`, `account_id`, `amount`, `code`, `code_description`, `deposit_group`, `tender_class`, `card_brand`, `payer`, `transaction_date`, `payment_date`, `office_id`, `posting_office_id`, `provider_id`, `user_key`, `check_number`, `bank_number`, `payment_group_key`, `carrier_id`, `is_sign_anomaly`, `is_reversed_by_refund`, `deposit_id` |
| Row filter | Live rows (`NOT is_void`); reversed-with-refund payments stay on their date; capitation legs (`cap`) under their code's group with the carrier as name |
| Date basis | `date_basis` `transaction_date` -> `transaction_date`; `payment_date` -> `payment_date` (data card 4.1) |
| Office | Posting office `coalesce(posting_office_id, office_id)` (data card 5.1); NULL = "Unassigned office" member |
| Provider / user | Credited provider `rpt_payments.provider_id`; `user_key` (5.4) |
| `payment_types` | `coalesce(deposit_group, 'none') IN (:list)`; full selection = no predicate |
| `check_type` | Predicate on `payer` applied only to rows with `deposit_group = 'check'` |
| `group_batch_checks` | Builder aggregates check rows: `check_number` mode `GROUP BY office, date, payer, check_number, bank_number` (P1, RPT-DAILY-40); `batch_id` mode `GROUP BY remittance_id` (NEW `rpt_payments` column after DATA-28, owned by 03 section 2.10), interim `payment_group_key` with warning `batch_grouping_heuristic` |
| `payer_display` | Picks the name join (account guarantor or patient); `none` switches the main block to group totals |
| Rating | READY (coverage 11.1 #5) |
| Options blocked | Payment Date basis: SCHEMA(13) - until DATA-13 both radios select the same rows and the report says so; Group Batch Checks `Batch ID` and a deposit date: SCHEMA(28); tender sections on history: REPAIR(12) |
| Migrated history | Four tender values only (`cash`, `check`, `card`, `ach`) and no card brand: card and ACH payments land in `credit_card` / `direct_deposit` only via the system alias codes, never in `care_credit`; no check number on many rows; no deposit date ever |
| Availability codes (NEW, list owned by 03) | `payment_date_equals_transaction_date` (range touches rows without a separate ledger date), `tender_history_collapsed` (range touches migrated payments), `batch_grouping_heuristic` (Batch ID mode before DATA-28), `sign_anomaly_rows` (any `is_sign_anomaly` row listed) |

### Output

Main block `payments` (shape `table`; PDF layout `deposit_slip`).

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `deposit_group` | Section | enum (hidden group key; labels Cash, Checks, Credit Card, CareCredit, Direct Deposit, Internal Financing, None) | aggregate | level key |
| `group_date` | Transaction Date / Payment Date | date (hidden group key; basis column) | aggregate | level key |
| `payment_code` | Payment code (`code - code_description`) | text (hidden group key in non-check sections) | aggregate | level key |
| `payer_name` | Patient / Patient Name (Chart #) / Responsible Party | text | phi_identified | `label`; absent when `payer_display = none` |
| `chart_no` | Chart # | text (rendered inside the name cell in PDF) | phi_identified | none |
| `bank_number` | Bank # | text (Check section only in PDF) | payment_instrument | none |
| `check_number` | Check # | text (Check section only in PDF) | payment_instrument | none |
| `card_brand` | Card | text (`show_card_brand`) | payment_instrument | none |
| `payer` | Payer | enum `patient` / `insurance` | aggregate | none |
| `amount_display` | Amount | money (`-amount`, `negative: minus`) | financial_patient | `sum` at every level |
| `line_count` | # | integer (screen / XLSX only) | aggregate | `count` |
| `entry_id`, `patient_id`, `account_id` | - | id (hidden; drill, manifest) | phi_identified | - |

| Level (outer -> inner) | Header | Subtotal label |
|---|---|---|
| Office (`fixed_outer`, multi-office) | `Office : <office_name>` | `Total for Office : <office_name>` |
| `deposit_group` | section label | `Grand Total For <section>:` |
| `group_date` | `Transaction Date: <date>` (`Payment Date:` under that basis) | `Total <section>, <date>:` |
| `payment_code` (not in Checks) | `<code> - <description>` | `Total for <code> :` |
| Grand total | - | `Grand Total:` |

Sort inside the innermost group (`default_sort`, no legacy SORT BY): name, then `check_number`, then `entry_id` (`row_id_column`). Page break: none (no legacy control). Summary cards: `Grand Total`, one card per ticked section total, `Checks` count; all are block totals. `empty_when`: `no_detail_rows`. No `reconciles_with`: posting-office attribution and the `none` conversion credits make the slip differ from `gross_collections` by design; R-09 (deposit on posting office) is the invariant.

### Visuals and drill-through

| Element | Leads to |
|---|---|
| Chart | none - a list |
| Payment line | `kind = record`, patient ledger of `patient_id` (route key `patient_ledger`, 07), needs `phi_identified` + the ledger feature right (08) |
| Section / code / date subtotal | `kind = rows`, same report filtered to the group |
| Section total | `kind = report`, `daily.collection_report` with `date_range`, `office_scope` copied and `payment_types = [<deposit_group>]` (tender group of the section; the None section includes NULL-group rows). The Collection Report attributes by transaction office, so the drilled total can differ for payments keyed in another office (note printed on the drill) |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open patient ledger | row | `navigate` | as drill |
| Export selection | bulk | `export_selection` | `reports_export_data_files` |
| Create deposit from selection | bulk | `custom:create_deposit` (deposit feature, P2, DATA-28) | Turns the listed undeposited payments into one deposit; idempotent per run and entry; worklist use with `deposit_status = undeposited` |

### Export and print

| Output | Rule |
|---|---|
| PDF | Portrait, layout `deposit_slip` (report-specific renderer of `banded_table`): one section per ticked type, Bank # / Check # only in Checks, header practice name / `Deposit Slip` / office name, address, phone / run date long form; footer criteria echo with `Check Type` and the starred payer note; `Printed :`, `Page : n of m` |
| XLSX | One flat sheet `payments` (section, date, code, name, chart, bank, check, amount); `none` payer mode exports the totals sheet; criteria sheet |
| CSV | Main block; formula guard (a check number starting with `=` is quoted) |
| Background | Above 31 days or more than one office group (`escalate_when`) |

### Open questions

| # | Question | Where to confirm |
|---|---|---|
| 1 | `None` payer option: names blanked with lines kept, or totals only (taken: totals only) | Run with None on the live tool |
| 2 | Cash section columns and whether card sections group by date before payment code (taken: date then code) | Printout with Cash and Credit Card ticked over two days |
| 3 | What enables GROUP BATCH CHECKS (taken: Check ticked, inferred) and its exact output | Tick Check, then the box, on the live tool |
| 4 | Does CHECK TYPE classify by entry screen or by payer; an app "insurance check to previous balance" is a `patient_payments` row with payer insurance | Post one of each and run Patient Checks |
| 5 | `Account No :` header line (older samples): no office bank-account field exists; product decision whether to add one (NEW, `offices`) | Product owner |
| 6 | Header office address / phone need `rpt_office_dim` address and phone columns (NEW, 03) | 03 owner |

## Scheduled Production - `daily.scheduled_production`

Daily Reports, screenshot 6.PNG - P1 - M - `daily` family (`reports_daily_reports_screen_view_only` / `_full_control`) - interactive - PARTIALLY DOCUMENTED (figures defined, layout INFERRED)

### Purpose

| Who | When | Task / decision |
|---|---|---|
| Front office | Daily, "prepare for tomorrow" | See the production dollars on the book for coming days; fill slow days |
| Office manager | Weekly, for the coming week | Compare booked production with the goal; decide on open-time campaigns and staffing |
| Office manager | After the day | Scheduled versus actual: how much booked production was lost to cancellations, no-shows or changed treatment |

Old name `Daily Scheduled Production` (alias).

### Legacy output

Confidence PARTIALLY DOCUMENTED: the three figures are defined by the vendor; no output sample or column layout was seen (research A6, section 9 item 3).

| Figure (legacy label) | Vendor definition |
|---|---|
| Scheduled Production | Total of the procedures attached to appointments |
| Actual Production | Total of procedures posted to the ledger |
| `Estimated Prod.` | Monthly goal / 20 assumed working days [P21], or monthly `Production` goal / the provider's working days [P22] - vendor conflict; goal screens also conflict (Provider Goals vs Per Office Settings > Production) |

Inferred layout (INFERRED, to confirm on the live tool): one row per provider, per day when the range spans days, with the three amounts, day and office totals and a grand total. Title `Scheduled Production`; footer criteria echo `From` / `Thru`, `Offices`, `Providers`. Comparable used by the research: scheduled-production-by-provider reports of another vendor (gross scheduled production = sum of fees of scheduled procedures).

Kept fixes: totals are sums (no ratio column in legacy); zero-line appointments add 0 to `Scheduled Prod.` and are counted in `Appts w/o procedures` when `show_appointment_counts` is on.

### Parameters - legacy parity

<!-- PARITY:daily_reports.r06:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group (picker source switches with the mode). Both options enabled on this report. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Default = id of the office the user was working in (capture shows 108). Mode office: one or more offices the caller can read (default working_office); mode office_group: groups of Setup > Office Groups (default all). The selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; all = no restriction. Provider role: scheduled side = line provider rpt_appointment_procedures.provider_id (as metric scheduled_production, M15 / P8, and the doctor / hygiene split); actual side = treating provider rpt_charges.provider_id. INFERRED - the appointment provider (rpt_appointment_procedures.appointment_provider_id) is the alternative reading; confirm on the live tool. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary range; future dates allowed. Basis appointment_date for scheduled production and transaction_date (posting) for actual production - INFERRED, the vendor states no basis. Default = today in the office time zone; enhanced with presets (NEW presets tomorrow, next_7_days, rest_of_month of 04 7.4) and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end; future dates allowed. Default = today in the office time zone; enhanced with presets and relative tokens. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:daily_reports.r06:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` / `Excel` | `output_format` `pdf` / `xlsx` (+ `csv`); rows unchanged |
| OFFICE/GROUP `Office` + picker (working office) | Composite attribution NEW `appointment_or_service_office` (03 section 5.1): scheduled side appointment office `rpt_appointment_procedures.office_id`, actual side office of service `rpt_charges.office_id`, goal side goal office; all three matched on the same `office_id` key of the join; printed in the criteria echo |
| OFFICE/GROUP `Office Group` + picker (ALL) | Offices of the chosen group(s) |
| PROVIDER > Provider (ALL) | Composite attribution NEW `line_or_treating_provider` (03 section 5.2): scheduled side line provider (`rpt_appointment_procedures.provider_id`, as metric `scheduled_production` M15 / P8); actual side treating provider (`rpt_charges.provider_id`); goal side goal provider; matched on the same `provider_id` key - INFERRED (appointment provider `appointment_provider_id` is the alternative, open question 2) |
| DATE RANGE Start / End Date (today / today; future allowed) | Scheduled: `appointment_date` in range; actual: `transaction_date` (= `service_date` until DATA-13) in range, zero for future days; estimated: goal share of each day in range - INFERRED bases |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD (UPDATE) TO MY FAVORITES | As family |

No dependency rules (no greyed control on the screen).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_range` presets | `date_range` | `today` | NEW presets of 04 section 7.4: `tomorrow` (`tomorrow` / `tomorrow`), `next_7_days` (`today` / `today+6d`), `rest_of_month` (`today` / `end_of_month`); `month_to_date` |
| `operatory_ids` | `entity_multi` (`lookup:operatories`) | `all` | Scheduled side only: chair-level view |
| `provider_kinds` | `enum_multi` (NEW, 04) `dentist` / `hygienist` / `other` from `provider_kind` | full selection | Doctor versus hygiene book (matches `doctor_scheduled_production` / `hygiene_scheduled_production`) |
| `show_appointment_counts` | `boolean` (NEW, 04) | `false` | Adds `Appts`, `Appts w/o procedures` (`line_count = 0`), `Booked hrs` columns |
| `show_variance` | `boolean` (NEW, 04) | `false` | Adds `Sched. - Est.` and `Sched. % of Est.` (computed, zero guard) to expose slow days |
| `compare_to` | comparison period (filter_card 12, P4) | `none` | Prior-week / prior-year scheduled production for the same weekdays |
| Saved view "Next 7 days by provider" | saved view | - | `next_7_days`, `all` providers, variance on |

### Data

| Item | Binding |
|---|---|
| Datasets | `rpt_appointment_procedures` (booked lines), `rpt_appointment_facts` (counts, operatory, booked minutes), `rpt_charges` (actual), `provider_production_goals` (NEW, DATA-24), `rpt_provider_calendar_days()` (working days, DATA-55), `rpt_provider_dim`, `rpt_office_dim` |
| Scheduled production | `SUM(scheduled_fee)` per line provider `rpt_appointment_procedures.provider_id` (falls back to `appointment_provider_id` when NULL) where `status_class NOT IN ('cancelled', 'no_show')`, `NOT is_block`, `NOT is_legacy_archive`, appointment not deleted, `appointment_date` in range (the `scheduled_production` metric definition) |
| Actual production | `SUM(charged_fee)` of live `rpt_charges` with `is_production`, `transaction_date` in range (posted fee, PD-1; production adjustments not included - vendor: "procedures posted") |
| Estimated Prod. | Per provider, office and day: monthly goal of that month / divisor; divisor = organisation setting `estimated_production_divisor` (NEW, 05 §8): `provider_working_days` (default, [P22], working days from `rpt_provider_calendar_days()`; non-working days get 0) or `fixed_20` ([P21], every weekday gets goal / 20) |
| Grain of the join | Full outer join of the three sides on (`office_id`, `day`, `provider_id`); a provider appears when any side is non-zero |
| Office / provider attribution | One declared attribution each (data_card 5.1 rule 1, RPT-DAILY-04): `scope.office_attribution = appointment_or_service_office` and `scope.provider_attribution = line_or_treating_provider` (both NEW composite attributions owned by 03 sections 5.1 / 5.2, listing the per-side columns above); printed in the criteria echo. INFERRED |
| Rating | APP (coverage 11.1 #6): migrated booked lines cover 6 % of appointments, so scheduled production of migrated periods is mostly absent; `Estimated Prod.`: SCHEMA(24) |
| History limits | A past day shows the book as it stands today (completed lines stay, cancelled ones drop) until the start-of-day snapshot (DATA-48, P4); booked fees are client snapshots, never re-priced |
| Availability codes (NEW, list owned by 03) | `scheduled_lines_sparse_before_cutover` (range touches migrated appointments), `production_goals_missing` (no goal row: column empty, never 0), `past_book_is_current_state` (range contains past days) |

### Output

Main block `scheduled_production` (shape `table`).

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `day` | Date | date (group key; level shown when the range spans more than one day) | aggregate | level key |
| `provider_name` | Provider | text (`provider_id` hidden key) | provider_comp | `label` |
| `scheduled_production` | Scheduled Prod. | money | provider_comp (row), financial_practice (totals) | `sum` |
| `actual_production` | Actual Prod. | money | provider_comp | `sum` |
| `estimated_production` | Estimated Prod. | money (null when no goal) | provider_comp | `sum` (null when every member is null) |
| `variance_to_estimate` | Sched. - Est. | money, computed `difference` (`show_variance`) | provider_comp | computed on the total |
| `pct_of_estimate` | Sched. % of Est. | percent, computed `ratio` (`show_variance`) | provider_comp | true ratio |
| `appointment_count` | Appts | integer (`show_appointment_counts`) | aggregate | `sum` |
| `zero_line_appointment_count` | Appts w/o procedures | integer | aggregate | `sum` |
| `booked_hours` | Booked hrs | decimal | aggregate | `sum` |

| Level | Header | Subtotal |
|---|---|---|
| Office (`fixed_outer`, multi-office) | `Office : <office_name>` | `Total for Office : <office_name>` |
| `day` (range > 1 day) | long date | `Total for <date> :` |
| rows | one per provider, sorted by `last_name`, `provider_id` | - |
| Grand total | - | `Grand Total :` |

Summary cards: `Scheduled Prod.`, `Actual Prod.`, `Estimated Prod.` (grand totals); metric keys `scheduled_production`, `charged_production`, `production_goal` (P3, G(24)) for the reconciliation tests. `reconciles_with`: `scheduled_production` (scheduled total and per provider, both on the line provider), `charged_production` with basis `transaction` (actual total, same office and range; the metric default basis is service date). Page break: none.

### Visuals and drill-through

| Element | Leads to |
|---|---|
| Chart | Grouped bars per day (scheduled vs actual) with an `Estimated Prod.` line; per provider when the range is one day |
| Scheduled Prod. cell | `kind = report`, `appointment.appointment_detail` (`available_from P3`) with `date_range` = the day, `provider_ids` = row provider, `office_scope` copied; until P3 `kind = record`, the scheduler day (`scheduler_day`) of that office and date |
| Actual Prod. cell | `kind = report`, `daily.production_report` with `report_by = provider`, `report_format = detail`, `provider_ids`, `date_range` = the day |
| Day subtotal | `kind = rows`, same report for that day |

### Actions

| Action | Scope | Kind |
|---|---|---|
| Open the day in the scheduler | row | `navigate` (route key `scheduler_day`, 07) with office and date |
| Export selection | bulk | `export_selection` |

Not a worklist.

### Export and print

| Output | Rule |
|---|---|
| PDF | Portrait (`auto` to landscape when variance and count columns are on), `banded_table`; footer echo `From` / `Thru`, `Offices`, `Providers`, availability warnings |
| XLSX | One flat sheet: office, date, provider, three amounts (+ optional columns); criteria sheet |
| CSV | Main block |
| Background | Above 93 days or more than 10 offices |

### Open questions

| # | Question | Where to confirm |
|---|---|---|
| 1 | Row grain and column order (provider x day as taken, or day x provider, or one row per appointment) | Printout of a two-day, two-provider range |
| 2 | Date basis of each side and the provider meaning (taken: line provider for scheduled, as the metric; appointment provider is the alternative) | Book a hygiene line under a doctor appointment; run with one provider |
| 3 | `Estimated Prod.`: divisor 20 or provider working days; goal from Provider Goals or Per Office Settings > Production (product decision; default `provider_working_days`) | Live tool + product owner |
| 4 | Are completed, checked-in and past-unresolved appointments in Scheduled Production for past days (taken: yes, only cancelled and no-show drop) | Run for yesterday after cancelling one appointment |
| 5 | Does Actual Production include production adjustments (taken: no) | Post a production adjustment and rerun |

## Routing Slip - `daily.routing_slip`

Daily Reports, screenshot 7.PNG - P1 - XL - `daily` family (`reports_daily_reports_screen_view_only` / `_full_control`) - interactive (background above 7 days or 150 slips) - DOCUMENTED

### Purpose

| Who | When | Task / decision |
|---|---|---|
| Front office | End of day, for the next day (`tomorrow`) | One face sheet per appointment with what staff need when the patient arrives: alerts, balance, coverage, recall, plan and the procedures to post |
| Clinical team | Morning huddle | Per-patient preparation: medical alerts, treatment to propose, recall due |
| Office | Before planned outages | Print Blank Routing Slip for photocopying |

Also printable in the legacy tool from Patient Overview and from the Scheduler (right-click Print); those entry points are a scope question (open question 1). Old names `Daily Routing Slip`, `Routing Slips` (aliases).

### Legacy output

Confidence DOCUMENTED (sample 2023 and the info tooltip, research A7). Per-record document: one slip per appointment, title `Routing Slip`, `OP:` (operatory) top right.

| Section (order) | Fields (legacy labels) |
|---|---|
| `Patient Information` (`Pat ID`, `Office`) | Name, address, `DOB`, `Age`, `Pat Since`, `Sex`, `Pat Type`; `Ref by`, `Ref Type`, `# of Ref`, `Lst Ref`, `Lst Ref Amt`; phones (H) (C) (W); `Email`; `Med Alerts` box; `Pat Notes` box |
| `Scheduled Appointment` | `Date`, `Time`, `Provider`, `Reason`, `Appt Notes` |
| `Recalls` | Grid `Date`, `Sche. Dt.`, `Reason` |
| `Next Appointment` | `Date`, `Time`, `Prdr` (REPORT BY = recall: the next scheduled recall instead) |
| `Visits` | `First Visit`, `Last Visit`, `Last Missed`, `#Missed`, `#Cancelled` |
| `Preferred` | `Provider`, `Hygienist` |
| `Responsible Party` | Name, address, phones |
| `Billing Information` | `Billing Type`; `Last Stmt Date`, `Last Stmt Amt`, `Last Pay Date`, `Last Pay Amt`, `Last Ins Pay Date`, `Last Ins Pay Amt`; aging grid `Current`, `Over 30`, `Over 60`, `Over 90`, `Over 120`, `Balance`, `Est Pat.`, `Est Ins.` with a row `Account Balance` and a row for the patient |
| `Primary Carrier`, `Secondary Carrier` (each `Eligible :`) | `Carrier`, `Employer`, `Subscriber`, `Sub ID`, `Sub DOB`, `Rel To Sub`; `Yearly Max`, `Rem Max`, `Yearly Ded`, `Rem Ded`, `Group No.` |
| `Ortho Plan Details` (ortho-flagged patients only) | `Code`, `Fee`, `Treatment Start Date`, `Treatment End Date`, `Banding Date`, `Desr`; `Ortho-Patient Payment Plan` and `Ortho - Insurance Payment Plan`, each `Plan Amount`, `Down Pay`, `Next Per Amt`, `Next Date`, `Rem. Total Amt`, `Rem. # Of Pay` |
| `Flash Alerts` | `Message`, `Block Charge` |
| Procedure area | `Appointment Procedures` (appointment codes) or the provider's default routing-slip codes, then treatment-plan codes; columns not documented - taken as `Code`, `Description`, `Th`, `Surf`, `Fee` (INFERRED) |

Quirks: only Daily report without PRINT FORMAT (PDF only, kept); the legacy rights article files it under the appointment-reports right (not kept: `daily` family); block appointments for events produce no slip (search summary only, kept as rule `NOT is_block`); no layout editor documented (none built).

### Parameters - legacy parity

<!-- PARITY:daily_reports.r07:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Option rules: office_group enabled when false. Office versus Office Group. On Routing Slip the Office Group option is greyed (option office_group enabled_when false): one or several offices only. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Default = id of the office the user was working in (capture shows 108). Mode office only on this report: one or more offices the caller can read; tokens working_office, my_offices. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; all = no restriction. Provider role: appointment provider (rpt_appointment_facts.provider_id): Provider, Operatory and DATE RANGE select which appointments get a slip (vendor documentation). |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary range, fixed basis appointment_date (rpt_appointment_facts.appointment_date, office-local): one slip per appointment in the range. Default = today in the office time zone; enhanced with presets (NEW preset tomorrow of 04 7.4). |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the appointment_date range. Default = today in the office time zone; enhanced with presets and relative tokens. |
| REPORT BY | (no label) (radio_group) | **Next Scheduled Appointment** / Next Scheduled Recall | `report_by` | enum | Next Scheduled Appointment -> `next_scheduled_appointment`, Next Scheduled Recall -> `next_scheduled_recall` | `next_scheduled_appointment` | replicated | - |
| OPERATORY | Operatory (picker) | shown: ALL | `operatory_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| PATIENTS | Patient (text_input) | (empty) | `patient_ids` | entity_multi | - | `all` | replicated_enhanced | Patient lookup box (header plural PATIENTS, row label Patient). Vendor documentation: limits the run to one patient; left blank, a slip prints for every patient with an appointment in the range. Legacy holds one patient; the parameter accepts a list (enhancement). |
| PATIENTS | SEARCH (button) | - | `patient_ids.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| OTHER OPTIONS | (no label) (radio_group) | **Recommended** / Active Treatment Plan / Codes | `procedure_code_source` | enum | Recommended -> `recommended`, Active Treatment Plan -> `active_treatment_plan`, Codes -> `codes` | `recommended` | replicated | procedure_code_source is a NEW report-specific parameter key (owner: this definition). Selects what fills the procedure area of each slip. |
| OTHER OPTIONS | (no label) (other) | (empty) | `procedure_code_source` | enum | - | - | help_text | Info icon after Recommended. Tooltip (vendor documentation): order of procedure codes = appointment codes, then provider defaults, then blank; then Accepted, then Diagnosed plan codes. Kept as help on the recommended option. |
| OTHER OPTIONS | Include Completed Procedures (checkbox) | **unchecked** | `include_completed_procedures` | boolean | - | `false` | replicated | - |
| SORT BY | (no label) (radio_group) | **Appointment Date** / Provider (Last Name) – Appointment Date / Operatory – Appointment Date / Patient Last Name | `sort_by` | enum | Appointment Date -> `appointment_date`, Provider (Last Name) – Appointment Date -> `provider_last_name_appointment_date`, Operatory – Appointment Date -> `operatory_appointment_date`, Patient Last Name -> `patient_last_name` | `appointment_date` | replicated | - |
| SORT BY | Print Blank Routing Slip (checkbox) | **unchecked** | `print_blank_routing_slip` | boolean | - | `false` | replicated | print_blank_routing_slip is a NEW report-specific parameter key (owner: this definition). Ticked = one empty form, no data query; every other criterion is ignored. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print (PDF only; this report has no PRINT FORMAT). |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:daily_reports.r07:END -->

| Legacy option | Effect on the result |
|---|---|
| OFFICE/GROUP `Office` + picker (working office) | Appointments of the chosen office(s) (appointment office); one or several offices |
| OFFICE/GROUP `Office Group` | Disabled (`option_enabled_when false`, as on the legacy screen) |
| PROVIDER > Provider (ALL) | Appointments whose appointment provider (`rpt_appointment_facts.provider_id`) is selected |
| DATE RANGE Start / End Date (today / today) | One slip per live appointment with `appointment_date` in range |
| REPORT BY `Next Scheduled Appointment` (default) | `Next Appointment` block = the patient's next live appointment after this one (any office): date, time, provider |
| REPORT BY `Next Scheduled Recall` | The same block shows the next scheduled recall: `Date`, `Time`, `Prdr` only (legacy fields). P1: the per-patient recall service of the Recalls block, recalls whose code is on a future booked line (`exact` rule), earliest; P3: `rpt_recall_due` row with `scheduled_basis = 'exact'` (DATA-41). Whether the legacy also prints the recall code is INFERRED (open question 4) |
| OPERATORY (ALL) | Appointments in the selected operatories |
| PATIENTS > Patient (blank) + SEARCH | Blank = every patient with an appointment in the range; a patient (list allowed) = only that patient's appointments; SEARCH is the lookup built into the box |
| OTHER OPTIONS `Recommended` (default; info icon) | Procedure area: appointment codes if any, else the appointment provider's default routing-slip codes (`provider_route_slips`), else blank; then treatment-plan codes of accepted items, else of diagnosed items, else blank |
| OTHER OPTIONS `Active Treatment Plan` | Procedure area: appointment codes, then every open item of the patient's active treatment plan with phase and status |
| OTHER OPTIONS `Codes` | Procedure area: the procedure codes only (appointment codes, else provider defaults), no treatment-plan section - INFERRED reading of "procedure codes only" |
| Include Completed Procedures (unticked) | Ticked: completed treatment-plan items (`rpt_treatment_item_facts.is_completed`) and completed appointment lines are also listed (marked `C`); unticked drops both. An appointment line is completed when (a) its `treatment_plan_item_id` has `is_completed`, or (b) a live `rpt_charges` row exists for the same patient, `procedure_code`, `tooth`, `surface` with `service_date = appointment_date` (code + tooth + surface reconcile rule); `line_status_raw` is not a completion flag (data_card 2.16). Meaning on the live-verification list (RPT-DAILY-55) |
| SORT BY `Appointment Date` (default) | Slips ordered by appointment date, start time |
| SORT BY `Provider (Last Name) – Appointment Date` | By appointment provider last name, then date, time |
| SORT BY `Operatory – Appointment Date` | By operatory name, then date, time |
| SORT BY `Patient Last Name` | By patient last name, first name, then date, time |
| Print Blank Routing Slip (unticked) | Ticked: one empty form (labels and office header only, no patient data, no query) |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD (UPDATE) TO MY FAVORITES | As family; no PRINT FORMAT (PDF only) |

Dependency rules: none captured besides the disabled Office Group option. `print_blank_routing_slip = true` makes the builder ignore every other criterion (echoed `* Blank form`); no greying is invented.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_range` presets | `date_range` | `today` | NEW preset `tomorrow` (the documented routine) and NEW token `next_business_day`, both owned by 04 section 7.4 |
| `patient_ids` multi | `entity_multi` | `all` | Several patients (legacy one) |
| `appointment_statuses_included` | `enum_multi` (NEW, 04) `scheduled` / `confirmed` / `unconfirmed` / `in_office` / `completed` / `past_unresolved` | full selection | Print only confirmed patients, or skip completed ones on a same-day reprint; cancelled / no-show never print |
| `sections_hidden` | `enum_multi` (NEW, 04) of the section keys | none | Office-level slip trimming (for example hide Ortho, Recalls) saved in a view; legacy prints all |
| `appointment_ids` (from scheduler) | `entity_multi` (NEW, 04; hidden, set by drill / entry point) | `all` | Current-appointment-only print from the Scheduler (open question 1) |

### Data

| Section | Datasets and columns |
|---|---|
| Selection | `rpt_appointment_facts`: `appointment_id`, `office_id`, `operatory_id`, `provider_id`, `patient_id`, `appointment_date`, `start_time`, `duration_minutes`, `status_class`, `procedure_label`, `notes`, `is_block`, `is_deleted`, `is_legacy_archive`, `is_patientless`; filter `NOT is_block AND NOT is_deleted AND NOT is_legacy_archive AND status_class NOT IN ('cancelled', 'no_show') AND NOT is_patientless` |
| Patient Information | `rpt_patient_dim`: `patient_id`, `chart_no`, names, address, `dob` (age at run date), `gender_code`, `patient_type_codes`, `phone`, `cell_phone`, `work_phone`, `email`, `referral_source_name`, `referred_by_raw`, `referral_type_raw`; `Pat Since` = `rpt_patient_activity.first_visit_date`; `Ref by` / `Ref Type` from `rpt_patient_dim.referral_source_name` (else `referred_by_raw`) / `referral_type_raw`. `# of Ref` / `Lst Ref`: P1 = NEW per-patient count and latest date of `referrals` rows naming this patient as source (per-patient service, availability code NEW `referral_counters_unreliable`, owned by 03); P3 = `rpt_referral_facts` `inbound_source` rows (DATA-40, data card 2.30); `Lst Ref Amt` NEW (meaning unconfirmed) |
| Med Alerts / Flash Alerts | `rpt_patient_alerts` active rows: medical alerts (`alert_label`); flash alerts `is_flash_alert` -> `Message`, `blocks_charges` -> `Block Charge` |
| Pat Notes | `patient_notes` passthrough (non-deleted) |
| Scheduled Appointment | selection row; `Reason` = `procedure_label`; `Appt Notes` = `notes`; `OP:` = `rpt_appointment_facts.operatory_label` (NEW column, DATA-16) |
| Recalls | `rpt_recall_due(p_as_of = run date)`: `due_date`, `scheduled_date` (exact basis only), code description; P3 dataset (DATA-41): in P1 the block reads the existing per-patient recall service and switches when the dataset lands (coverage 11.1 rule) |
| Next Appointment | `rpt_appointment_facts`: first live appointment of the patient after this one's date and time (`Date`, `Time`, `Prdr`); recall mode: P1 per-patient recall service (recalls whose code is on a future booked line, `exact` rule; date, time, line provider), P3 `rpt_recall_due` (DATA-41) |
| Visits | `rpt_patient_activity`: `first_visit_date`, `last_visit_date`, `last_missed_date`, `missed_count`, `cancelled_count` |
| Preferred | `rpt_patient_dim.preferred_provider_id`, `preferred_hygienist_id` (NULL on migrated patients: printed blank) |
| Responsible Party | `rpt_account_dim` guarantor name, address, phones |
| Billing Information | `Billing Type` = `rpt_account_dim.resp_party_type`; `Last Stmt Date` / `Amt` = `last_statement_date` and the `patient_statements` row of that date; `Last Pay` / `Last Ins Pay` = `rpt_patient_activity` dates with the amount of that row; aging grid = `rpt_ar_open_items(p_as_of = run date, p_unit = 'account')` with the `legacy` bucket set: row `Account Balance` over the account, row patient over the patient's items; `Est Pat.` / `Est Ins.` = `open_patient` / `open_insurance_est` |
| Carriers | `rpt_insurance_coverage` dental slots tier primary / secondary: `carrier_name`, `employer_name`, `subscriber_name`, `subscriber_id`, `subscriber_dob`, `relationship`, `individual_max`, `individual_deductible`, `group_number`, `elig_status_class`; `Rem Max` / `Rem Ded` = `rpt_benefit_usage()` effective remainders (P2, DATA-32; in P1 `benefit_usage_service.slot_benefits`) |
| Ortho | `rpt_ortho_contracts` (P3) + `rpt_payment_plan_contracts` (P2): treat dates, banding date, `total_ortho_amt`, patient and insurance plan amounts, periodic amount, next due, remaining amount and count; `Code`, `Desr`, `Down Pay` are NEW columns (03); per-patient ortho service in P1 |
| Procedure area | `rpt_appointment_procedures` (code, tooth, surface, `scheduled_fee`, `treatment_plan_item_id`; completion by the rule of Include Completed Procedures), `rpt_charges` (completion test), `provider_route_slips` (`procedure_code`, `num_times`), `rpt_treatment_item_facts` (`exclusive_status`, `is_completed`, `is_scheduled`, `phase_id`, `fee`, plan); active plan needs a plan status (NEW `plan_status` on the dataset, 03) |
| Office / provider | Appointment office; appointment provider (data card 5.1, 5.2) |
| Rating | READY (coverage 11.1 #7) |
| Fields blocked | `Billing Type`: SCHEMA(53); `First Visit` / `Last Visit`: REPAIR(19); `Last Stmt Date`: SCHEMA(22); recall block derived (maintained rows SCHEMA(41)); ortho block: APP (no contract migrated) |
| Migrated history | No preferred provider / hygienist, no eligibility status (`unknown`), family remainders stale, referral counters unreliable, appointment notes present |
| Availability codes (NEW, list owned by 03) | `billing_type_missing`, `visit_dates_derived`, `statement_dates_missing`, `recall_derived`, `patientless_appointments_skipped`, `referral_counters_unreliable` |

### Output

The engine result has two blocks; the PDF renders them as slips.

Block `slips` (main, one row per appointment = one document):

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `appointment_date`, `start_time` | Date, Time | date, time | phi_identified | none |
| `patient_name` | Patient | text (key) | phi_identified | `count` (`Slips : n`) |
| `pat_id` / `chart_no` | Pat ID | text | phi_identified | none |
| `provider_name` | Provider | text | aggregate | none |
| `operatory_name` | OP | text (`rpt_appointment_facts.operatory_label`, NEW, DATA-16) | aggregate | none |
| `appointment_status` | Status | enum `status_class` | phi_identified | none |
| `med_alert_flag` | Alerts | boolean (has active alert; label only) | clinical | none |
| `account_balance` | Balance | money | financial_patient | none |
| `appointment_id`, `patient_id`, `account_id` | - | id (hidden) | phi_identified | - |

Section blocks (`placement = after_group` of the level `appointment_id`, one per slip section, shape `key_value` or `table`): `patient_info`, `scheduled_appointment`, `recalls`, `next_appointment`, `visits`, `preferred`, `responsible_party`, `billing`, `aging` (table: row label, `current`, `over_30`, `over_60`, `over_90`, `over_120`, `balance`, `est_pat`, `est_ins`), `carriers` (two rows), `ortho` (when `is_ortho_patient`), `flash_alerts`, `procedures` (table `code`, `description`, `tooth`, `surface`, `fee`, `source` = appointment / provider_default / accepted_plan / diagnosed_plan / active_plan, `status` C when completed).

| Field group | data_class |
|---|---|
| Identity, address, phones, DOB, appointment facts, referral, `Pat Notes`, `Appt Notes`, procedure codes | phi_identified |
| `Sub ID` | phi_sensitive (field dropped without the class) |
| `Med Alerts`, `Flash Alerts` | clinical (box dropped without the class) |
| Billing amounts, aging, ortho amounts, plan fees, max / deductible remainders | financial_patient |

Grouping: level `appointment_id` with `page_break_allowed` (one slip per page, `record_per_page`), order by `sort_by`. Sort options as the legacy SORT BY; `row_id_column = appointment_id`. No subtotals. Summary card: `Slips` count. Screen: the slip index (`slips`) with a slip preview pane.

### Visuals and drill-through

| Element | Leads to |
|---|---|
| Chart | none - a per-patient document |
| Index row | `kind = record`, appointment in the Scheduler (route key `scheduler_appointment`, 07); patient name -> Patient Overview (`patient_overview`); both need `phi_identified` + feature right |
| Balance cell | `kind = record`, patient ledger (`patient_ledger`) |

### Actions

| Action | Scope | Kind |
|---|---|---|
| Print this slip | row | `export_selection` (PDF of one slip, print-audited per patient) |
| Print selected slips | bulk | `export_selection` (PDF) |
| Open patient / appointment | row | `navigate` |

Not a worklist; `schedulable: false` (per-record document, header rule).

### Export and print

| Output | Rule |
|---|---|
| PDF | Portrait letter, layout `slip`, `record_per_page`, split into volumes (`volume_size` 200 slips); header practice name, title `Routing Slip`, `OP:` top right, `Pat ID` / `Office`; footer `Printed :`, `Page : n of m` per slip (`sectioned_page_numbers`), criteria echo on a cover line only; blank form = same layout with empty boxes |
| XLSX | Not offered (no legacy PRINT FORMAT; a slip is a form) |
| CSV | Slip index only (enhancement, `reports_export_data_files`) for huddle sheets |
| Background | Escalates above 7 days or 150 slips; result is a PDF artifact |

### Open questions

| # | Question | Where to confirm |
|---|---|---|
| 1 | Scope: also serve the Scheduler entry (current appointment only / all of the day for this location / all locations, `Appointment Date`, `Include Completed Procedures`) and Patient Overview > Print Reports > Routing Slip through this definition (recommended: yes, through `appointment_ids` / `patient_ids` drills) | Product owner |
| 2 | Procedure-area columns, and whether fees print | Live printout |
| 3 | Meaning of `Lst Ref Amt` and `Pat Since` (taken: first visit date) | Live tool, patient with referrals |
| 4 | Label and fields of the Next Appointment block under `Next Scheduled Recall` (taken: `Date`, `Time`, `Prdr` only; recall code not printed) | Run REPORT BY recall |
| 5 | Do cancelled / missed appointments in the range get a slip (taken: no); patientless appointments (taken: skipped with warning) | Live tool |
| 6 | `Codes` and `Active Treatment Plan` exact content; are "Accepted plans" plan-level or item-level statuses | Run each option for a patient with two plans |
| 7 | SORT BY spelling: en dash or hyphen in the two composite options | Live screen |
| 8 | Aging as-of date: run date or appointment date (taken: run date) | Print a slip for next week |

## Progress Notes - `daily.progress_notes`

Daily Reports, screenshot 8.PNG - P1 - M - `daily` family (`reports_daily_reports_screen_view_only` / `_full_control`), key class `clinical` on Detail - interactive - PARTIALLY DOCUMENTED (Detail seen in 2010 samples; Unsigned and Missing INFERRED)

### Purpose

| Who | When | Task / decision |
|---|---|---|
| Clinical staff, office manager | Daily, before notes lock at end of day | Unsigned: notes entered but not signed; Missing: appointments without a note - finish them while still editable |
| Clinical lead | On demand | Detail: review every note of a period; print all notes of a patient for a referral or a treatment facility |
| Compliance | Periodic | Evidence that every visit has a signed note |

One report replaced `Patient Progress Notes`, `Unsigned Progress Notes Report`, `Missing Progress Notes` (aliases). Twins: worklist Unsigned Progress Notes (06; family any of `daily`, `my_reports`) and `my_reports.missing_progress_notes`.

### Legacy output

| Variant (`report_type`) | Confidence | Title | Content |
|---|---|---|---|
| `detail` | PARTIALLY DOCUMENTED (2010 samples) | `Patient Progress Notes` | Columns `Pat ID` (one sample prints the name under it), `Patient Name` (another sample prints `Primary Carrier` here), `Notes` (full text), `Created By` (user id of the author). Grouping `Created On: <date>` -> notes -> `Sub total for, <date> : <count>` -> `Total Notes: <count>`. Footer `From Date` / `Thru`, `Printed By: <user>` |
| `unsigned` | INFERRED (not seen) | `Unsigned Progress Notes` (taken from the old report name) | Notes not signed, for range and criteria; taken: Detail layout plus `Provider`, `Locked` columns |
| `missing` | INFERRED (not seen; comparable: My Reports Missing Progress Notes, Daily Audit) | `Missing Progress Notes` | One row per appointment: date / time, patient id and name, provider, appointment status, note indicator; exceptions only by default, every appointment with `ALL`; count totals |

Kept / fixed: the group header follows the chosen date basis (`DOS Date:` / `Created On:` / `Appointment Date:`) - the 2010 sample's `Created On` predates the basis radio [unverified]; counts are true counts; struck-off notes print with a `Struck off` marker in Detail and never count as unsigned. Context rules (research A8): a note is editable only on its day and in its office, locks at end of day or when signed; a signed note can be struck out, not edited.

### Parameters - legacy parity

<!-- PARITY:daily_reports.r08:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group (picker source switches with the mode). Both options enabled on this report. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Default = id of the office the user was working in (capture shows 108). Mode office: one or more offices the caller can read (default working_office); mode office_group: groups of Setup > Office Groups (default all). The selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER | Preferred Provider (picker) | shown: ALL | `preferred_provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog becomes a searchable multi-select; ALL = no restriction. Row label Preferred Provider (section header PROVIDER): literal mapping to rpt_patient_dim.preferred_provider_id in all three variants; migrated patients (no preferred provider) match only under all. The appointment provider of Missing is offered as enhancement appointment_provider_ids. Confirm the Missing meaning on the live tool. |
| PROGRESS NOTES TO PRINT | (no label) (radio_group) | **Detail** / Unsigned / Missing | `report_type` | enum | Detail -> `detail`, Unsigned -> `unsigned`, Missing -> `missing` | `detail` | replicated | Selects the report variant (legacy Patient Progress Notes / Unsigned / Missing Progress Notes). |
| DATE RANGE | (no label) (radio_group) | **DOS Date** / Created On Date / Appointment Date | `date_basis` | enum | DOS Date -> `service_date`, Created On Date -> `created_date`, Appointment Date -> `appointment_date` | `service_date` | replicated | Option rules: appointment_date enabled when report_type != detail. The Appointment Date option is greyed while PROGRESS NOTES TO PRINT = Detail. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range; date_basis is fixed per report or chosen by the basis radio of the same section. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| APPOINTMENTS TO INCLUDE | (no label) (radio_group) | **Only with Missing Progress Notes** / ALL - greyed out | `appointments_to_include` | enum | Only with Missing Progress Notes -> `only_missing_progress_notes`, ALL -> `all` | `only_missing_progress_notes` | replicated | Enabled when: report_type != detail. Greyed while report_type = detail. Research A8: Missing unlocks it (unverified); the Unsigned state was never captured, so enabled_when report_type != detail follows the shared option rule of date_basis and is to be confirmed (it may be report_type == missing only). |
| OTHER OPTIONS | Page Break by Patient (checkbox) | **unchecked** | `page_break_by.patient` | enum | - | `false` | replicated | Ticked sets page_break_by = patient. The patient group level exists only when chosen, so this definition declares page_break_by with role query (exception to filter_card section 8). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| PROGRESS NOTES TO PRINT = Detail (the default) | the Appointment Date date-basis radio and the APPOINTMENTS TO INCLUDE radios are greyed | date_basis option appointment_date is enabled_when report_type != detail and appointments_to_include is enabled_when report_type != detail (disabled_value only_missing_progress_notes); under report_type = detail a stored appointment_date basis falls back to service_date. Whether Unsigned also unlocks them (or only Missing) is to be confirmed on the live tool. |
<!-- PARITY:daily_reports.r08:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` / `Excel` | `output_format` `pdf` / `xlsx` (+ `csv`) |
| OFFICE/GROUP `Office` + picker / `Office Group` | `scope.office_attribution` declared per `report_formats[]` entry: note office (`detail`, `unsigned`), appointment office (`missing`) |
| PROVIDER > Preferred Provider (ALL) | `rpt_patient_dim.preferred_provider_id IN (...)`: patients whose preferred provider is selected, all three variants; migrated patients (no preferred provider) only under `all` |
| PROGRESS NOTES TO PRINT `Detail` (default) | Every non-deleted note in the range (struck-off included, marked) |
| PROGRESS NOTES TO PRINT `Unsigned` | Notes with `NOT is_signed AND NOT is_struck_off` in the range; migrated notes excluded (signature status unknown) with warning |
| PROGRESS NOTES TO PRINT `Missing` | Live appointments in the range without a progress note of the patient (same office, same day; exact appointment link after DATA-18) |
| DATE RANGE `DOS Date` (default) | `note_date`; under `missing` the appointment date (a missing note has no DOS) - INFERRED for `missing` (open question 7) |
| DATE RANGE `Created On Date` | `created_date` of the note (load time on migrated notes: warning); under `missing` the appointment `created_date` (app era only) - INFERRED for `missing` (open question 7) |
| DATE RANGE `Appointment Date` (greyed under Detail) | `unsigned`: notes whose patient has a live appointment in the same office on the note date, appointment date in range - INFERRED (open question 7); `missing`: `appointment_date` |
| Start Date / End Date (today / today) | Inclusive office-local range on the basis |
| APPOINTMENTS TO INCLUDE `Only with Missing Progress Notes` (default; greyed under Detail) | `missing`: only appointments without a note |
| APPOINTMENTS TO INCLUDE `ALL` | `missing`: every appointment with its note status (`Note`, `Signed` columns); `unsigned`: no effect (to confirm) |
| OTHER OPTIONS Page Break by Patient (unticked) | Ticked: patient level becomes the outer group under the office band, one patient per PDF page |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD (UPDATE) TO MY FAVORITES | As family |

| Dependency rule | Expression |
|---|---|
| d01 Appointment Date basis and APPOINTMENTS TO INCLUDE greyed under Detail | `date_basis` option `appointment_date`: `enabled_when ["ne", "report_type", "detail"]`; `appointments_to_include.enabled_when ["ne", "report_type", "detail"]`, `disabled_value only_missing_progress_notes`; a stored `appointment_date` basis falls back to `service_date` under Detail |
| Unsigned state (never captured) | Same rule as Missing until confirmed; may be `["eq", "report_type", "missing"]` only |

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_range` presets | `date_range` | `today` | `yesterday`, `this_week`, last 30 days (Detail print-out for a referral) |
| `appointment_provider_ids` | `entity_multi` (shared key, role `appointment`) | `all` | `missing`: filter by the appointment's provider (the My Reports rule, `missing_progress_notes_count` definition) |
| `author_provider_ids` | `entity_multi` (NEW key, role `note_author`, 04) | `all` | `detail` / `unsigned`: filter by `author_provider_id` |
| `user_ids` | `entity_multi` (role: note author user) | `all` | `detail` / `unsigned`: `author_user_id`; migrated notes only under `all` |
| `patient_ids` | `entity_multi` | `all` | Print all notes of one patient (needs `phi_identified`) |
| `include_struck_off` | `boolean` (NEW, 04) | `true` | `false` hides struck-off notes in `detail` |
| `show_primary_carrier` | `boolean` (NEW, 04) | `false` | Adds `Primary Carrier` (the second sample's column) |
| `show_note_status` | `boolean` (NEW, 04) | `false` | `detail`: adds `Status` and `Signed` columns (not legacy) |
| Saved views | saved view | - | "Unsigned - yesterday", "Missing - today, my appointments" |

### Data

| Item | Binding |
|---|---|
| Datasets | `rpt_progress_note_facts` (`note_id`, `patient_id`, `office_id`, `note_date`, `created_date`, `created_at_utc`, `author_user_id`, `author_provider_id`, `is_signed`, `signed_at`, `signed_by_user_id`, `is_struck_off`, `is_locked`, `era`); note text from the `progress_notes` passthrough by `note_id` (NEW passthrough registration, 03), decoded server-side; `rpt_appointment_note_audit()` (missing: one row per live appointment with note flags); `rpt_patient_dim`, `rpt_user_dim`, `rpt_provider_dim`, `rpt_insurance_coverage` (primary carrier) |
| Note text decoding | Legacy `notes_html` is stored double-escaped with the `~^^~` marker; the frontend decodes it only through `noteContent.ts`. The PDF / XLSX builder needs a Python twin of that decoder with shared test vectors, else migrated notes print escaped markup |
| Date basis | `service_date` -> `note_date`; `created_date` -> `created_date` (data card 4.1); `appointment_date` -> appointment date (missing; unsigned through same-day appointment). The `missing` / `unsigned` readings are INFERRED (open question 7) |
| Office | `scope.office_attribution` per report format: note office (`detail`, `unsigned`), appointment office (`missing`) |
| Provider | `preferred_provider_ids` on the patient (legacy picker); author and appointment provider as enhancements (data card 5.2) |
| Rating | READY (coverage 11.1 #8) |
| Variants blocked | `unsigned`: APP (every migrated note is unsigned, no author); `missing` exact per appointment and provider: SCHEMA(18); until the link exists a note matches by patient, office and day, so two appointments of one patient on one day share one note test |
| Migrated history | 35,286 migrated notes without author or signature: `Created By` blank; Created On = load time |
| Availability codes (NEW, list owned by 03) | `migrated_notes_signature_unknown`, `migrated_notes_created_is_load_time`, `note_link_by_patient_day`, `preferred_provider_not_migrated` |

### Output

Block `notes` (`detail`, `unsigned`), title from `title_templates`: `Patient Progress Notes` / `Unsigned Progress Notes`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `group_date` | DOS Date / Created On / Appointment Date | date (group key) | aggregate | level key |
| `pat_id` | Pat ID | text (patient id, chart no under it) | phi_identified | none |
| `patient_name` | Patient Name | text | phi_identified | none |
| `primary_carrier_name` | Primary Carrier | text (`show_primary_carrier`) | aggregate | none |
| `note_text` | Notes | text, full | clinical (key column in `detail`; ordinary column in `unsigned`, dropped without the class) | `count` (`Sub total for, <date> : n`) |
| `created_by` | Created By | text (`user_label`) | aggregate | none |
| `author_provider_name` | Provider | text, `visible_when ["eq","report_type","unsigned"]` | aggregate | none |
| `note_status` | Status | enum `signed` / `unsigned` / `struck_off` / `locked`; `visible_when ["or", ["eq","report_type","unsigned"], ["truthy","show_note_status"]]` (Unsigned shows Locked / Unsigned) | phi_identified | none |
| `signed_at` | Signed | datetime (`tz: office`); `visible_when ["and", ["eq","report_type","detail"], ["truthy","show_note_status"]]` (never in Unsigned) | phi_identified | none |
| `note_id`, `patient_id` | - | id (hidden) | phi_identified | - |

Block `appointments` (`missing`), title `Missing Progress Notes`:

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `appointment_date`, `start_time` | Appt Date, Time | date, time | phi_identified | level key (date) |
| `pat_id`, `patient_name` | Pat ID, Patient Name | text | phi_identified | `count` |
| `provider_name` | Provider (appointment) | text | aggregate | none |
| `appointment_status` | Appt Status | enum `status_class` | phi_identified | none |
| `has_progress_note` | Note | boolean | phi_identified | `count` of true (ALL mode) |
| `has_signed_note` | Signed | boolean | phi_identified | `count` of true (ALL mode) |
| `appointment_id`, `patient_id` | - | id (hidden) | phi_identified | - |

| Level | Header | Subtotal |
|---|---|---|
| Office (`fixed_outer`, multi-office) | `Office : <office_name>` | `Total for Office : <office_name>` (count) |
| Patient (only when `page_break_by = patient`) | `Patient : <name> (<Pat ID>)` | `Total for <name> : n` |
| `group_date` | `<basis label>: <date>` | `Sub total for, <date> : n` |
| Grand total | - | `Total Notes: n` / `Total Appointments: n` |

Sort inside a date: patient last name, first name, note `created_at_utc`, `row_id_column` (`note_id` / `appointment_id`). Page break: `none` / `patient`; because the patient level exists only when it is chosen, this definition declares `page_break_by` with `role: query` (exception to filter_card 8). Under defaults Detail prints exactly the legacy columns `Pat ID`, `Patient Name`, `Notes`, `Created By`. Summary cards: `Notes` (detail), `Unsigned` (block total; not tied to metric `unsigned_progress_notes_count`, which also counts migrated notes that this report excludes), `Missing` (`missing_progress_notes_count`; equal only with `preferred_provider_ids = all`, the metric filters by appointment provider). `empty_when`: `no_detail_rows` with the "all clear" state for `unsigned` and `missing`.

### Visuals and drill-through

| Element | Leads to |
|---|---|
| Chart | none - a list; summary cards only |
| Note row | `kind = record`, the patient's Progress Notes screen at that note (route key `patient_progress_notes`, 07), `phi_identified` + progress-notes feature right (08) |
| Missing row | `kind = record`, the appointment in the Scheduler (`scheduler_appointment`); second link to `patient_progress_notes` to write the note |
| Date subtotal | `kind = rows`, same variant for that date |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Review and sign | row (`unsigned`) | `navigate` to `patient_progress_notes` | Replaces the Interactive Reports REVIEW & SIGN; signing stays in the notes feature (signature capture) |
| Write note | row (`missing`) | `navigate` to `patient_progress_notes` with the appointment date | |
| Remind authors | bulk (`unsigned`, `missing`) | `create_task` per author user / appointment provider's user, one task per person listing the notes | Feature right of tasks; `max_selection` 500 |
| Message author | bulk | `custom:send_staff_message` (messaging feature, NEW handler) | User-to-user message, never PHI beyond patient id and date |
| Export selection | bulk | `export_selection` | |

Unsigned and Missing double as worklists; the live worklist (`paging_mode = live`) is the Unsigned Progress Notes worklist of 06. Schedulable: yes, `skip_if_empty` for `unsigned` / `missing` (morning delivery of yesterday's exceptions, PD-12 link only).

### Export and print

| Output | Rule |
|---|---|
| PDF | Portrait, `banded_table`, note text wrapped full width (no truncation), page break per patient when chosen; footer `From Date` / `Thru`, `Printed By: <user>`, `Printed :`, `Page : n of m`, criteria echo; audit with patient manifest |
| XLSX | One flat sheet per variant; note text in one cell (decoded plain text, 32,767-character cell limit: longer notes split into continuation rows flagged `continued`); criteria sheet |
| CSV | Main block; formula guard on note text |
| Background | Detail above 31 days or 5,000 notes |

### Open questions

| # | Question | Where to confirm |
|---|---|---|
| 1 | Does Unsigned also unlock Appointment Date and APPOINTMENTS TO INCLUDE, or only Missing | Live screen, Unsigned selected |
| 2 | Unsigned and Missing output layouts (not seen) | Live printouts |
| 3 | Under Missing, does the Preferred Provider picker filter the patient's preferred provider (taken, literal) or the appointment provider (My Reports rule) | Run Missing with one provider for a patient whose preferred provider differs |
| 4 | Detail second column: `Patient Name` or `Primary Carrier` (taken: name, carrier optional) | Current printout |
| 5 | Group header of Detail: `Created On` whatever the basis, or the basis label (taken: basis label) | Run Detail with DOS Date |
| 6 | Are struck-off notes printed in Detail | Strike a note and run |
| 7 | Meaning of DOS Date / Created On Date / Appointment Date under Unsigned and Missing (taken: Missing DOS = appointment date, Missing Created On = appointment created date, Unsigned Appointment Date = note with a same-day appointment) | Run each basis per variant on the live tool (RPT-DAILY-55) |

## Production Analysis Report - `daily.production_analysis_report`

Daily Reports, screenshot 9.PNG - P1 - M - `reports_daily_reports_screen_view_only` (family `daily`) - interactive - DOCUMENTED (columns defined in vendor text, no sample image; layout of the sections INFERRED)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Owner, office manager | Month end, quarter end, on demand | Production mix per provider: which ADA categories (diagnostic, preventive, restorative, ...) each provider produces and what share of the office's production in that category the provider carries (associate mix, hygiene versus doctor balance, referral-out decisions) |
| Owner, treatment coordinator | Before fee or network negotiations | Carrier analysis: how many patients of each carrier were seen, how many claims were created, and average production and insurance collection per patient of that carrier (payer mix, PPO participation decisions) |
| Regional manager | On demand, office group | Compare the category mix of offices of one group (office band per office) |

### Legacy output

Confidence: **DOCUMENTED** for the column lists and their definitions [P31]; the section layout (provider sections with one row
per category) is INFERRED [unverified]; no totals row is documented [P31].

`ANALYSIS BY = Category` (title proposal `Production Analysis by Category`; the printed title is not documented):

| # | Column | Definition [P31] |
|---|---|---|
| 1 | `Category` | ADA category of the procedure code (Setup > Procedure Codes) |
| 2 | `Provider $` | The provider's gross production in the category |
| 3 | `Practice Group $` | The office's gross production in the category |
| 4 | `Prov. Prod/ Total Prov. Prod. (%)` | Category share of the provider's total production |
| 5 | `Prov. Prod/ Prac. Grp Prod. (%)` | Provider's share of the office's production in that category |

`ANALYSIS BY = Carrier` (title proposal `Production Analysis by Carrier`):

| # | Column | Definition [P31] |
|---|---|---|
| 1 | `Carrier` | Insurance carrier |
| 2 | `# Patient` | Patients attached to the carrier who were seen in the range |
| 3 | `# of Claims` | Claims created for the carrier in the range |
| 4 | `Avg. Production per Pat` | Carrier gross production ÷ `# Patient` |
| 5 | `Avg. Collection per Pat` | Carrier gross collection ÷ `# Patient` |

"Gross production" in the legacy vocabulary is the posted fee (metric `charged_production`, PD-1); parity columns show
`charged_fee`, never UCR. Sign: production is positive; a migrated negative charge line (data_card 2.9) is summed with its
sign. Quirk kept as a label, fixed in meaning: the column is named `Practice Group $` but defined at office level [P31];
we keep the label and define the denominator per office band, and add a separate all-offices section for a multi-office run
(Output). Quirk fixed: percentage totals are true ratios of unrounded components (family rule).

### Parameters - legacy parity

<!-- PARITY:daily_reports.r09:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| ANALYSIS BY | (no label) (radio_group) | **Category** / Carrier | `report_by` | enum | Category -> `category`, Carrier -> `carrier` | `category` | replicated | ANALYSIS BY selects the report variant. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group (picker source switches with the mode). Both options enabled on this report. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Default = id of the office the user was working in (capture shows 108). Mode office: one or more offices the caller can read (default working_office); mode office_group: groups of Setup > Office Groups (default all). The selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; all = no restriction. Category: treating provider of the charge (rpt_charges.provider_id); Provider $ = the provider's gross production in the category (research A9). Carrier (proposal, pending live check): # Patient from rpt_provider_visits, # of Claims from rpt_claim_facts.treating_provider_id, collections from rpt_payments.provider_id. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary range, definition date_basis service_date (coverage matrix row 9). Carrier format per-measure bases, stated in the column descriptions: production and # Patient on service_date, # of Claims on the claim created date, collections on transaction_date (open question 8). Default = today in the office time zone; enhanced with presets. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the service_date range. Default = today in the office time zone; enhanced with presets and relative tokens. |
| CATEGORY | (no label) (picker) | shown: ALL | `procedure_category_codes` | entity_multi | - | `all` | replicated_enhanced | Enabled when: report_by == category (inferred: captured enabled with ANALYSIS BY = Category while CARRIER is greyed). ADA category of the procedure code (Setup > Procedure Codes); searchable multi-select over lookup:procedure_categories; all = no restriction. Whether ANALYSIS BY = Carrier greys it is not documented - confirm. |
| CARRIER | (no label) (picker) | shown: ALL - greyed out | `carrier_ids` | entity_multi | - | `all` | replicated_enhanced | Enabled when: report_by == carrier (inferred). Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. Greyed on Production Analysis Report while ANALYSIS BY = Category. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:daily_reports.r09:END -->

| Legacy option | Effect on the result |
|---|---|
| ANALYSIS BY `Category` (default) | `report_by = category`: blocks `category_mix` + `office_category_totals` (provider sections x category rows); enables CATEGORY, greys CARRIER |
| ANALYSIS BY `Carrier` | `report_by = carrier`: blocks `carrier_mix` (+ `carrier_patients`) (one row per carrier); enables CARRIER, greys CATEGORY (inferred) |
| PRINT FORMAT `PDF` (default) / `Excel` | Rendering only (`role: output`); `csv` added. Excel = flat typed sheet of the active block |
| OFFICE/GROUP `Office` (default, picker = working office) | Charges whose office of service (`rpt_charges.office_id`) is in the list; `Practice Group $` and both % use that office's production as denominator |
| OFFICE/GROUP `Office Group` (picker default ALL) | Every office of the chosen groups; one `Office : <name>` band per office (multi-office) plus the section `All selected offices`, where `Practice Group $` is the sum over the selected offices |
| PROVIDER `ALL` (default) / list | Category: provider sections only for the selected treating providers (`rpt_charges.provider_id`); `Practice Group $` stays office-wide (all providers), so the second % still answers "share of the office" - INFERRED (the legacy text defines the column only as the office's production in the category; open question 8). Carrier: restricts production, `# Patient` (patients seen by a selected provider, `rpt_provider_visits`), `# of Claims` (`rpt_claim_facts.treating_provider_id`) and collections (credited provider `rpt_payments.provider_id`) - per-measure roles are a proposal (Open questions 3) |
| DATE RANGE Start / End (default today / today, office-local) | Fixed basis `service_date` for production and `# Patient`; claim created date for `# of Claims`; transaction date for collections (Data) |
| CATEGORY `ALL` (default) / list | `procedure_category_codes`: only charges whose `code_category` is selected; denominators are computed over the same category set. Uncategorised codes are kept only under `all` (row `Uncategorised`) |
| CARRIER `ALL` (default) / list (greyed while Category) | `carrier_ids`: only carrier rows of the selected carriers; `No insurance` and `Carrier not recorded` rows appear only under `all`. Disabled value `all` while `report_by = category` |

Dependency rules: CATEGORY `enabled_when ["eq","report_by","category"]` (inferred from the capture: active with Category);
CARRIER `enabled_when ["eq","report_by","carrier"]` (inferred: greyed with Category, filter_card 9.3 row 23). A disabled
picker is reset to `all` before hashing (engine_card 3.2). No other rule.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `date_range` presets `month_to_date`, `last_month`, `quarter_to_date`, `year_to_date` | `date_range` preset | `today` unchanged | Mix analysis is a period question; presets avoid typing month ends | filter_card 12 |
| `compare_to` (`none`, `previous_period`, `previous_year`) | `enum` (FLT-26, P4) | `none` | Adds `provider_amount_prior` and `share_change_pct` (percentage points) beside each category row; carrier variant adds prior `# Patient` and prior average production | `supports_comparison: true` on this definition; legacy columns unchanged |
| `show_zero_categories` | `boolean` NEW | `false` | Category rows where the office produced but the provider did not (`Provider $` = 0) are printed, so the mix of every provider has the same rows | Owner: this catalog |
| `production_basis` | `enum` NEW (`charged`, `office_fee`) | `charged` | `office_fee` swaps `Provider $` / `Practice Group $` to UCR (`office_fee`, metric `gross_production`) for fee-independent mix comparison across PPO-heavy offices | PD-1; title gains `* UCR basis` |
| `credit_hygienist` | `boolean` NEW | `false` | Category: when a charge carries `hygienist_id` (app era), the hygienist's section receives the line instead of the treating provider | Default `false` = legacy parity (the legacy attributes to the ledger provider); the organisation-level hygienist setting of `05_metric_catalog.md` (PD-7) applies to dashboards, not to this parity report |
| `show_carrier_patients` | `boolean` NEW | `false` | Carrier: adds block `carrier_patients` after each carrier row: patient, visits, production, insurance collected | Class `phi_identified` / `financial_patient`; feeds bulk actions |
| `sort_by` | `enum` (shared 3.9), options NEW | `category` | Category: `category` (label order), `provider_amount_desc`; Carrier: `carrier`, `patients_desc`, `avg_production_desc` | Legacy has no sort control |
| Saved view "Provider mix - last month" | saved view | - | `date_preset = last_month`, `report_by = category`, `office_ids = @working_office` | Schedulable monthly (PD-12 link delivery) |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_charges`, `rpt_procedure_code_dim` (`code_category`, `description`), `rpt_provider_dim` (`provider_name`, `short_id`), `rpt_visits` / `rpt_provider_visits` (seen patients), `rpt_claim_facts`, `rpt_payments`, `rpt_insurance_coverage` (carrier fallback), `rpt_office_dim` |
| Rows (both formats) | live `rpt_charges` with `is_production` (contract-billing `non_production_charge` excluded), `service_date BETWEEN :date_from AND :date_to`, `office_id IN (:office_ids)` |
| Category measures | `provider_amount` = `SUM(charged_fee)` per (office, provider, `code_category`); `office_amount` = `SUM(charged_fee)` per (office, `code_category`) over all providers; `pct_of_provider_total` = `provider_amount / SUM(provider_amount) over the provider's categories in scope`; `pct_of_office_category` = `provider_amount / office_amount`. Both `computed` with zero-denominator guard |
| Category domain | `procedure_category_codes` binds `rpt_procedure_code_dim.code_category` (12 ADA labels plus `Medical`, `Account`, data_card 2.5); whether this equals the 14-label legacy SEARCH CODE list is family open question 7 |
| Carrier attribution of a charge | `carrier_key = coalesce(rpt_charges.primary_carrier_id` (stamped at posting, DATA-33, P2) `, carrier_id of the patient's active dental slot with tier primary today` (`rpt_insurance_coverage`)`)`; NULL = `No insurance`. Until DATA-33 the carrier is today's coverage, not the coverage on the service date (availability code NEW `carrier_from_current_coverage`, owned by 03) |
| `# Patient` | `COUNT(DISTINCT patient_id)` of `rpt_visits` rows (visit-code charge) in range whose visit charges carry the carrier; with `provider_ids` from `rpt_provider_visits`. Depends on the visit-code flags (DATA-04) |
| `# of Claims` | `COUNT(DISTINCT claim_id)` of `rpt_claim_facts` with `carrier_id` = carrier, `NOT is_preauth`, `status_class NOT IN ('deleted','void')`, created date in range. Created date = office-local `created_at_utc` where `created_at_reliable`; migrated claims have no created date (data_card 2.20), so `submitted_date` stands in, with availability code NEW `claim_created_date_proxy` - REPAIR(10) per coverage matrix |
| Collections per carrier | `SUM(-amount)` of `rpt_payments` with `payer` insurance, `carrier_id` = carrier, `transaction_date` in range. Carrier on payments exists only for app remittance legs (`rpay`) and after DATA-33: **APP**. Insurance payments without a carrier are one row `Carrier not recorded` (only under `carrier_ids = all`), so the block total equals metric `insurance_collections` |
| Averages | `avg_production_per_patient = carrier_production / patient_count`, `avg_collection_per_patient = carrier_collections / patient_count`; `computed`, guard → NULL (`null_display` `-`) when `# Patient` = 0 |
| Date basis | fixed `service_date` (definition `date_basis`); carrier measures name their own basis in the column `description`: production and `# Patient` service date, `# of Claims` claim created date, collections transaction date (open question 9) |
| Office attribution | office of service (`rpt_charges.office_id`); claims: claim office; payments: transaction office |
| Provider attribution | treating provider `rpt_charges.provider_id` (PD-7); `credit_hygienist` switches to `hygienist_id` where recorded |
| Availability | Category: **READY** (coverage matrix 11.1 row 9). Carrier: REPAIR(10) (claim dates, coverage slots of history), SCHEMA(33) (payer on the charge), collection per carrier **APP** |
| Migrated history | the skipped migrated charges (DATA-57) lower production of migrated periods (completeness caveat); migrated insurance payments carry no carrier and fall in `Carrier not recorded`; migrated coverage tiers are wrong until the slot repair (data_card 2.21) |

### Output

Report format: one (`standard`; no legacy REPORT FORMAT control, engine_card 3.7). `report_by` selects the blocks:
`category_mix` and `office_category_totals` carry `visible_when ["eq","report_by","category"]`, `carrier_mix` and
`carrier_patients` carry `visible_when ["eq","report_by","carrier"]`; summary cards and charts are declared per block.
`title_templates`:
`report_by == category` → `Production Analysis by Category`; `carrier` → `Production Analysis by Carrier` (titles are a
proposal, Open questions 1).

`category_mix` (`visible_when report_by = category`, shape `table`, `row_id_column = row_id`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | Office | id, hidden | aggregate | `fixed_outer` band key when multi-office |
| `provider_id` | - | id, hidden | provider_comp | group key level `provider` |
| `provider_name` | Provider | text | provider_comp | group header `Provider : {provider_name} ({short_id})`; key column |
| `row_id` | - | text, hidden | aggregate | `office_id:provider_id:category_code` |
| `category_code` | - | text, hidden | aggregate | sort key |
| `category_label` | Category | text | aggregate | subtotal label `Total for {provider_name}` |
| `provider_amount` | Provider $ | money | provider_comp | sum per provider, per office |
| `office_amount` | Practice Group $ | money | financial_practice | sum per provider (= office total over the provider's categories) |
| `pct_of_provider_total` | Prov. Prod/ Total Prov. Prod. (%) | percent (computed `share_of_parent(provider_amount)`) | provider_comp (derived) | subtotal 100 % |
| `pct_of_office_category` | Prov. Prod/ Prac. Grp Prod. (%) | percent (computed `ratio(provider_amount, office_amount)`) | provider_comp (derived) | subtotal = ratio of subtotals |
| `provider_amount_prior`, `share_change_pct` | Prior Provider $, Change (pts) | money, percent; `visible_when ["ne","compare_to","none"]` | provider_comp | sum / ratio |

Grouping: `fixed_outer` office band (`["ctx","multi_office"]`) → level `provider` (subtotal on, additive to the legacy
output); grand total off (a sum over providers is the office total, printed by `office_category_totals`). Block
`office_category_totals` (placement `after_group` of the office band; shape `table`): `category_label`, `office_amount`,
`office_share_pct` (`share_of_parent`), class `financial_practice`; a final `All selected offices` copy when multi-office.

`carrier_mix` (`visible_when report_by = carrier`, shape `table`, `row_id_column = row_id`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | Office | id, hidden | aggregate | band key when multi-office |
| `carrier_id` | - | id, hidden | aggregate | row key, drill |
| `row_id` | - | text, hidden | aggregate | `office_id:carrier_id` |
| `carrier_name` | Carrier | text | aggregate | key column; `null_display` `No insurance` / `Carrier not recorded` |
| `patient_count` | # Patient | integer | aggregate | `count_distinct` over the office (a patient with two carriers counts once in the total) |
| `claim_count` | # of Claims | integer | aggregate | sum |
| `carrier_production` | Production | money, hidden by default (`default_visible false`) | financial_practice | sum; numerator of the average |
| `avg_production_per_patient` | Avg. Production per Pat | money (computed `ratio(carrier_production, patient_count)`) | financial_practice | ratio of totals |
| `carrier_collections` | Collections | money, `default_visible false` | financial_practice | sum (= `insurance_collections`) |
| `avg_collection_per_patient` | Avg. Collection per Pat | money (computed `ratio(carrier_collections, patient_count)`) | financial_practice | ratio of totals |

`carrier_patients` (`visible_when ["and", ["eq","report_by","carrier"], ["truthy","show_carrier_patients"]]`, placement
`after_group`, `row_id_column = row_id`): `row_id` (hidden, `office_id:carrier_id:patient_id`), `patient_id` (hidden),
`patient_name` (phi_identified, entity patient), `visit_count`, `production`, `insurance_collected` (financial_patient).

Sort: `category_mix` provider last name, then `category_label` (or `provider_amount` desc); `carrier_mix` carrier name
(enhancement options above). Page break: none legacy; the office band starts a new page in PDF. Summary cards (block totals):
category blocks - office production (`office_amount` total, `reconciles_with` `charged_production`), number of providers;
carrier blocks - patients seen, claims created, insurance collections (`reconciles_with` `insurance_collections`). Metric
`category_production_share_pct` (P2) is the governed twin of the second % column. `empty_when`: `no_detail_rows`.

### Visuals and drill-through

Chart: category blocks - stacked 100 % bar per provider (`category_label` stacks, value `provider_amount`, `top_n` 8 plus
`Other`); carrier blocks - horizontal bar of `avg_production_per_patient` per carrier with `patient_count` as label.

| Click | Target |
|---|---|
| Category row (`provider_amount`) | `kind = report`, `daily.special_transaction_report`: `date_basis = service_date`, `date_from`/`date_to` copied, `office_ids = {group: office_id}`, `provider_ids = [{column: provider_id}]`, `code_scope_mode = category`, `code_scope_selection = [{column: category_code}]`, `payment_adjustment_codes = none`, `group_by = code`, hidden drill parameter NEW `production_only = true` (owner 04, honoured by Special Transaction as `ledger_bucket = 'production'`, so contract-billing codes drop out) - the procedure lines that sum to the cell. Suppressed (`kind = rows` of `category_mix` instead) when `credit_hygienist = true` |
| `office_amount` | Same target without `provider_ids` |
| Provider subtotal | `daily.production_report` with `report_by = provider`, `report_format = detail`, `provider_ids = [provider_id]`, date range and office copied. The target uses a fixed `transaction_date` basis, so totals equal the cell only while `transaction_date = service_date` (until DATA-13; note printed on the drill) |
| Carrier `# of Claims` | `kind = report`, `report_key = insurance.claims_list` (`available_from P2`), `param_map {carrier_ids: [{column: carrier_id}], date_from / date_to: copy}` |
| Carrier `# Patient` | `kind = rows` of block `carrier_patients` (sets `show_carrier_patients = true`, `carrier_ids = [carrier_id]`) |
| Patient row of `carrier_patients` | `kind = record`, patient ledger (`phi_identified`, ledger feature right) |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Export selection | bulk | `export_selection` | Selected rows of either block (ENG-49, P3) |
| Open patient ledger | row (`carrier_patients`) | `navigate` | |
| Letter / postcard to carrier patients | bulk (`carrier_patients`) | `letters` | e.g. network-change notice to patients of one carrier; owning correspondence feature (PD-15), consent exclusions `no_correspondence` |

Not a worklist: an analysis, not a queue.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait (five columns); header practice-group name, variant title, `From / Thru`; office band per office, `All selected offices` section last; footer criteria echo (Offices, Providers, Categories or Carriers, `* UCR basis` when on), `Printed :`, `Page : n of m`; availability notes (carrier from current coverage, claim created proxy, collections APP) in the criteria block |
| XLSX | One sheet per block (`category_mix` or `carrier_mix`, `office_category_totals`, `carrier_patients` when on), `criteria` sheet; percentages as numeric percent cells |
| CSV | Main block of the active `report_by` (`category_mix` or `carrier_mix`) |
| Background | Not needed for a month; year ranges of a large group escalate to `background` once ENG-38 exists (P2) |

### Open questions

| # | Question | Check on the live legacy tool / decision |
|---|---|---|
| 1 | Printed titles, section layout (provider sections assumed), any totals rows | Print both variants once (RPT-DAILY-09) |
| 2 | Does ANALYSIS BY = Carrier enable CARRIER and grey CATEGORY (supplement unresolved r09) | Switch the radio on the criteria screen |
| 3 | Carrier variant: what PROVIDER filters (production, patients, claims, collections) | Run Carrier with one provider |
| 4 | "Carrier gross collection": insurance payments of the carrier (assumed) or all collections of its patients | Compare one carrier row with a ledger total |
| 5 | Denominator of the first %: provider total over selected categories (assumed) or over all categories | Run with one category picked |
| 6 | With an office group: is `Practice Group $` the group total (legacy label) or each office (vendor text) | Run Office Group with two offices |
| 7 | Is a patient "attached to the carrier" by primary coverage only, or by any coverage tier | Patient with secondary coverage only |
| 8 | With PROVIDER = one provider, does `Practice Group $` stay office-wide (taken) or shrink to the filtered providers | Run Category with one provider |
| 9 | Carrier variant: which date filters `# of Claims` and `Avg. Collection per Pat` (service date of the claimed or paid work, claim created date, payment date; taken: created date and payment date) | Run one carrier for a month whose claims were created the month after service |

## Daily Audit - `daily.daily_audit`

Daily Reports, screenshot 10.PNG - P1 - M - `reports_daily_reports_screen_view_only` (family `daily`) - interactive - DOCUMENTED (options and columns in vendor text, no sample image)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front office | End of day | Every scheduled patient has a ledger transaction, and no appointment that did not happen is left unresolved (research A10 [P2][T2]) |
| Assistants and providers | End of day, sorted or grouped by provider | Write and sign the missing progress notes of the day; offices that do not sign notes ignore the last column |
| DSO / office manager | Every morning for the previous day | Exception review across offices; the success state is an empty report |

### Legacy output

Confidence: **DOCUMENTED** (columns and options in text [P32][P33]); no sample image, so column order follows the article.
One row per patient-office-day that fails at least one ticked test (exception list). Columns [P32]:

| # | Column | Content |
|---|---|---|
| 1 | `Appt Date` | Appointment date (blank when no appointment that day) |
| 2 | `Tran Date` | Ledger transaction date (blank when none) |
| 3 | `PN DOS Date` | Progress-note date of service (blank when none) |
| 4 | `Pat ID` | Patient id |
| 5 | `Name` | Patient name |
| 6 | `Last Visit` | Last appointment date |
| 7 | `Pat Type` | Patient types on file, abbreviated |
| 8 | `Provider` | Provider, abbreviated (vendor conflict: preferred provider or provider on the transaction date) |
| 9 | `Ledger Transaction` | ✓ / X - a ledger transaction exists for the scheduled procedures |
| 10 | `Appt` | ✓ / X - an appointment exists in the same office on the same day as the ledger entry |
| 11 | `PN` | ✓ / X - a progress note was added in the same office on the same day |
| 12 | `PN With Sig` | ✓ / X - the note was signed in the same office on the same day |

Grouping: `Office : <name>` band (multi-office); with GROUP BY Provider one section per provider, page break per provider.
Totals: none documented; we add a count per group and per office. Quirks kept: only procedure codes flagged `Visit Code`
count as a ledger transaction [P33] (a posted non-visit code still shows X); matching is same office and same day [P32].
Success state: an empty report [P32] - rendered as an explicit "all clear" state (family rule).

### Parameters - legacy parity

<!-- PARITY:daily_reports.r10:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group (picker source switches with the mode). Both options enabled on this report. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Default = id of the office the user was working in (capture shows 108). Mode office: one or more offices the caller can read (default working_office); mode office_group: groups of Setup > Office Groups (default all). The selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; all = no restriction. One provider set for filter and GROUP BY: coalesce(nullif(appointment_provider_ids \|\| charge_provider_ids, '{}'), note_provider_ids) of rpt_visit_audit() (change owned by 03 section 2.17). Vendor conflict: the article names the preferred provider and also the provider on the transaction date - confirm on the live tool. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary range on the date of the PATIENT HAS record: appointment_date, transaction_date of the ledger line or note_date (DOS) of the progress note; with ALL any of the three. Matching is same office, same day. Default = today in the office time zone; enhanced with presets (yesterday). |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the PATIENT HAS date range. Default = today in the office time zone; enhanced with presets and relative tokens. |
| PATIENT HAS | (no label) (radio_group) | **ALL** / Appointment / Transaction in Ledger / Progress Notes | `patient_has` | enum | ALL -> `all`, Appointment -> `appointment`, Transaction in Ledger -> `ledger_transaction`, Progress Notes -> `progress_notes` | `all` | replicated | patient_has is a NEW enum key (owner 04 section 3.6). Appointment = live appointments with status_class not in (cancelled, no_show) (rpt_visit_audit() argument owned by 03; include_resolved_appointments lifts it). |
| BUT MISSING | Appointment (checkbox) | **checked** | `missing_items.appointment` | enum_multi | - | `true` | replicated | - |
| BUT MISSING | Transaction in Ledger (checkbox) | **checked** | `missing_items.ledger_transaction` | enum_multi | - | `true` | replicated | - |
| BUT MISSING | Progress Notes (checkbox) | **checked** | `missing_items.progress_notes` | enum_multi | - | `true` | replicated | - |
| BUT MISSING | Progress Notes with Signature (checkbox) | **checked** | `missing_items.progress_notes_with_signature` | enum_multi | - | `true` | replicated | - |
| SORT BY | (no label) (radio_group) | **Date** / Patient Lastname / Provider | `sort_by` | enum | Date -> `date`, Patient Lastname -> `patient_last_name`, Provider -> `provider` | `date` | replicated | - |
| GROUP BY | (no label) (radio_group) | **None** / Provider | `group_by` | enum | None -> `none`, Provider -> `provider` | `none` | replicated | No greyed state on this report. Provider = one section per provider of the patient-office-day (one provider set shared with the PROVIDER filter, Data). |
| GROUP BY | Page Break (checkbox) | **unchecked** - greyed out | `page_break_by.group` | enum | - | `false` | replicated | Enabled when: group_by == provider. Page Break checkbox beside GROUP BY: ticked sets page_break_by = group (break on the selected grouping). Greyed while GROUP BY = None. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| GROUP BY = Provider | Page Break is ticked automatically, so each provider gets only their own list | page_break_by member group is enabled_when group_by == provider and default_when group_by == provider sets it to group (shared rule of 04: ticked automatically). The user may untick it; whether the legacy locks it is to be confirmed. |
| OFFICE/GROUP = Office Group | the picker box selects office groups defined in Setup > Office Groups instead of offices, and its default is ALL (in Office mode the default is the logged-in OID) | office_scope: mode office_group switches the picker to lookup:office_groups and writes office_group_id with default all; mode office uses lookup:offices and office_ids with default working_office. |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `page_break_by` | default_when | group_by == provider | group | documented - Page Break is ticked automatically when GROUP BY = Provider. |
<!-- PARITY:daily_reports.r10:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Rendering only; `csv` added |
| OFFICE/GROUP `Office` (default, working office) / `Office Group` (default ALL) | `p_office_ids` of `rpt_visit_audit()`: the office of the appointment, charge and note (one office per row); office band per office when multi-office |
| PROVIDER `ALL` (default) / list | `p_provider_ids`: keeps a patient-office-day when a selected provider is in its provider set `coalesce(nullif(appointment_provider_ids || charge_provider_ids, '{}'), note_provider_ids)` - the same set GROUP BY unnests (change to `rpt_visit_audit()` owned by 03 section 2.17); the four tests stay whole-day, so a day worked by a hygienist and a dentist shows in both lists and never a false "missing appointment" |
| DATE RANGE Start / End (default today / today) | `visit_date` (the date of the PATIENT HAS record: appointment date, ledger transaction date or note DOS; same day by construction) between the bounds, office-local |
| PATIENT HAS `ALL` (default) | Population = patient-office-days with an appointment OR a ledger transaction OR a note |
| PATIENT HAS `Appointment` | Population = days with `has_appointment` |
| PATIENT HAS `Transaction in Ledger` | Population = days with `has_ledger_transaction` (visit-code charge) |
| PATIENT HAS `Progress Notes` | Population = days with `has_progress_note` |
| BUT MISSING `Appointment` (ticked) | Row prints when `NOT has_appointment` |
| BUT MISSING `Transaction in Ledger` (ticked) | Row prints when `NOT has_ledger_transaction` |
| BUT MISSING `Progress Notes` (ticked) | Row prints when `NOT has_progress_note` |
| BUT MISSING `Progress Notes with Signature` (ticked) | Row prints when `NOT has_signed_note` (a day without any note also fails this test) |
| BUT MISSING combination | `missing_items` is a predicate (filter_card 2.5): row prints when ANY ticked item is missing; at least one box (`min_items 1`). A test equal to the PATIENT HAS choice can never fail (e.g. Appointment / Appointment) and adds nothing |
| SORT BY `Date` (default) | `visit_date` (the date of the PATIENT HAS type; with ALL the appointment date, which is the same day), then last name |
| SORT BY `Patient Lastname` | Last name, first name, within each office band |
| SORT BY `Provider` | First provider short id of the row (appointment providers, then charge providers), then date |
| GROUP BY `None` (default) | Flat list per office |
| GROUP BY `Provider` | One section per provider of the provider set `coalesce(nullif(appointment_provider_ids || charge_provider_ids, '{}'), note_provider_ids)` (the PROVIDER filter uses the same set); a row appears under each of its providers; subtotal count per provider |
| GROUP BY `Page Break` (greyed while None) | `page_break_by = group`: new PDF page per provider section |

Dependency rules: `page_break_by` member `group` `enabled_when ["eq","group_by","provider"]`, and `default_when` the same
condition sets it to `group` (rule d01, ticked automatically; whether the legacy locks it is to be confirmed). Rule d02:
office scope mode switches the picker source (`lookup:offices` / `lookup:office_groups`, default `working_office` / `all`).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `date_range` presets `yesterday`, NEW token `previous_office_day` | preset / token | `today` unchanged | The documented morning routine (previous day) without typing; `previous_office_day` skips closed days (`rpt_office_calendar_days()`, DATA-55) | Token owned by `04_filter_framework.md` 7.4 |
| `include_resolved_appointments` | `boolean` NEW | `false` | `true` also counts cancelled and no-show appointments as "has appointment" (default: only appointments that were or should have been kept, Data) | Owner: `03_data_foundation.md` (`rpt_visit_audit()` argument) |
| `show_preferred_provider` | `boolean` NEW | `false` | Adds column `Pref Prov` (`rpt_patient_dim.preferred_provider_id`) beside `Provider`, settling the vendor conflict visibly | NULL on migrated patients |
| `show_scheduled_codes` | `boolean` NEW | `false` | Adds `Appt Codes` (booked codes of the day, `rpt_appointment_procedures`) and `Posted Codes` (all codes posted that day, visit and non-visit) so the X on `Ledger Transaction` is explained when a non-visit code was posted | Class `phi_identified` |
| Saved views | saved view | - | "Yesterday - unsigned notes by provider" (`date_preset = yesterday`, `missing_items = [progress_notes, progress_notes_with_signature]`, `group_by = provider`); "Scheduled but not posted" (`patient_has = appointment`, `missing_items = [ledger_transaction]`); "No signature check" (three boxes, for offices that do not sign notes) | Schedulable daily with `skip_if_empty` |
| Worklist twin | worklist | - | The provider's own exceptions under `my_reports` rights (Unsigned progress notes worklist, security_card 2.3) | Owned by `06_dashboards.md` |

### Data

| Topic | Rule |
|---|---|
| Dataset | `rpt_visit_audit(p_tenant_id, p_office_ids, p_date_from, p_date_to, p_provider_ids)` (data_card 2.17): one row per (`patient_id`, `office_id`, `visit_date`) with `has_appointment`, `has_ledger_transaction`, `has_progress_note`, `has_signed_note`, `appointment_provider_ids`, `charge_provider_ids`, `note_provider_ids`, `appointment_count`, `procedure_count`, `charged_production` |
| Joined | `rpt_patient_dim` (`chart_no`, `first_name`, `last_name`, `patient_type_codes`, `preferred_provider_id`), `rpt_patient_activity` (`last_appointment_date`, `last_visit_date`), `rpt_provider_dim` (`short_id`) |
| Population | `patient_has` (NEW enum key, owner 04 section 3.6): `all` → `has_appointment OR has_ledger_transaction OR has_progress_note`; otherwise the one flag |
| Exception predicate | OR over the ticked `missing_items` of `NOT <flag>` |
| Appointment side | live appointments (`NOT is_block AND NOT is_deleted`, archive per tenant policy) with `status_class NOT IN ('cancelled','no_show')` - a resolved broken appointment needs no transaction; `past_unresolved` and `completed` count. The status rule is NEW for the function (owned by 03); `include_resolved_appointments` lifts it |
| Ledger side | live visit-code charges (`is_visit_code`, DATA-04) of the patient, office and day. Until the office reviews the flags (DATA-04 default rule) the test follows the shipped default; availability code NEW `visit_code_flags_unreviewed` when `rpt_data_quality` reports the flags unreviewed |
| Note side | `rpt_progress_note_facts` not deleted, `note_date` = day, same office; signed = `is_signed` |
| Dates | `appt_date` = `visit_date` when `has_appointment`; `tran_date` = `visit_date` when `has_ledger_transaction`; `pn_dos_date` = `visit_date` when `has_progress_note`; otherwise NULL (`null_display` blank) |
| `Last Visit` | `rpt_patient_activity.last_appointment_date` (legacy "last appointment date"), current state, not relative to the audited day (Open questions 3) |
| Office / provider attribution | office of the record (same office, same day); provider arrays as above (vendor conflict, family open question 2) |
| Availability | **READY** (coverage matrix 11.1 row 10); signed-note test **APP**: every migrated note is unsigned (data_card 2.18), so with the default boxes every migrated day with a note prints `PN With Sig` X - availability code NEW `signature_test_app_only` on runs that touch migrated dates |
| Migrated history | migrated notes have no author: `note_provider_ids` empty; a note belongs to patient and date only until DATA-18, so two appointments of one patient on one day share the note test; archived appointments follow the tenant policy |

### Output

Report format: one (`standard`). Block `exceptions` (shape `table`, `row_id_column = row_id`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | Office | id, hidden | aggregate | band key |
| `row_id` | - | text, hidden | phi_identified | `patient_id:office_id:visit_date` |
| `group_provider_id` | - | id, hidden; active only with `group_by = provider` | aggregate | group key; header `Provider : {provider_name}` |
| `visit_date` | - | date, hidden | phi_identified | sort key `date` |
| `appt_date` | Appt Date | date | phi_identified | none |
| `tran_date` | Tran Date | date | phi_identified | none |
| `pn_dos_date` | PN DOS Date | date | phi_identified | none |
| `patient_id` | - | id, hidden | phi_identified | drill, manifest |
| `chart_no` | Pat ID | text | phi_identified | none |
| `patient_name` | Name | text, entity patient | phi_identified | key column; `count` per group, office, grand |
| `patient_last_name` | - | text, hidden | phi_identified | sort key |
| `last_visit` | Last Visit | date | phi_identified | none |
| `pat_type` | Pat Type | text | phi_identified | none (comma-separated codes) |
| `provider_short_ids` | Provider | text | aggregate | none (comma-separated) |
| `preferred_provider_short_id` | Pref Prov | text, `visible_when ["truthy","show_preferred_provider"]` | aggregate | none |
| `has_ledger_transaction` | Ledger Transaction | boolean (✓ / X) | phi_identified | count of X |
| `has_appointment` | Appt | boolean | phi_identified | count of X |
| `has_progress_note` | PN | boolean | phi_identified | count of X |
| `has_signed_note` | PN With Sig | boolean | phi_identified | count of X |
| `appointment_id` | - | id, hidden | phi_identified | drill (first appointment of the day) |
| `appt_codes`, `posted_codes` | Appt Codes, Posted Codes | text, `visible_when ["truthy","show_scheduled_codes"]` | phi_identified | none |

No `clinical` column: only presence of a note and a signature (security_card 5.2 rule 11). Grouping: `fixed_outer` office
band → optional level `provider` (`group_by` option `provider`, `page_break_allowed`); subtotal `Total for {provider_name}`
= row count and the four X counts; grand total off when single office. Sort options: `date` (`visit_date`,
`patient_last_name`, `row_id`), `patient_last_name` (`patient_last_name`, first name, `visit_date`), `provider`
(`provider_short_ids`, `visit_date`). Page break: `group` (provider). Summary cards (block totals): exceptions (row count,
metric `daily_audit_exceptions_count`), missing appointment, missing ledger transaction, missing note, unsigned (count of X
per column; the last relates to `unsigned_progress_notes_count`). `empty_when`: `no_detail_rows` → all-clear state.

### Visuals and drill-through

Chart: none - an exception list. The summary cards act as quick filters on the snapshot.

| Click | Target |
|---|---|
| Patient name | `kind = record`, patient overview (`phi_identified`, patient feature right) |
| `Ledger Transaction` X | `kind = record`, patient ledger at `visit_date` (ledger feature right) |
| `Appt` X / `Appt Date` | `kind = record`, appointment (`appointment_id`) in the Scheduler; X on a day without appointment opens the Scheduler on that day and office |
| `PN` / `PN With Sig` X | `kind = record`, patient progress notes at `visit_date` (progress-notes feature right) |
| Summary card | Same report, snapshot quick filter on the column (no new run) |
| Provider subtotal | `kind = rows`, same report filtered to `group_provider_id` with `missing_items = [progress_notes, progress_notes_with_signature]` (Progress Notes filters by the patient's preferred provider, a different role, so it is not the target) |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open patient / ledger / appointment / notes | row | `navigate` | As drills |
| Create task "complete visit record" | bulk | `create_task` | Assigned to the row's provider (or a chosen user); task text names the missing items and the date; handler of the tasks feature (P3) |
| Message provider | bulk | `custom:internal_message` NEW | One user-to-user message per provider listing the patients with missing or unsigned notes (Messaging feature handler; owner of the handler key `02_architecture.md`) |
| Export selection | bulk | `export_selection` | ENG-49 |

Doubles as a worklist: yes. With the snapshot, a fixed row stays until re-run; the worklist twin (`06_dashboards.md`) uses
`paging_mode = live` so a signed note drops out.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (12 columns); header practice-group name, `Daily Audit`, `From / Thru`; office band; provider section with page break when grouped; ✓ / X glyphs from the vendored font; footer criteria echo (Patient Has, But Missing, Providers, Offices), `Printed :`, `Page : n of m`; empty run prints "No exceptions found for the selected criteria" |
| XLSX | Sheet `exceptions` with booleans as `TRUE` / `FALSE`, provider as a column (no section rows), `criteria` sheet |
| CSV | `exceptions` |
| Background | Not needed (one row per patient-day) |

### Open questions

| # | Question | Check on the live legacy tool / decision |
|---|---|---|
| 1 | Provider meaning: preferred provider or provider on the transaction date (vendor conflict); our arrays answer "who worked the day" | Run with one provider on a day worked by two providers |
| 2 | Page Break: can the user untick it under GROUP BY Provider | Toggle on the criteria screen |
| 3 | `Last Visit`: last appointment overall or before the audited day | Audit a past day for a patient seen since |
| 4 | Transaction in Ledger: Visit Code flag only, or Visit Code and Ledger Code (vendor texts differ) | Post a ledger-only code on an appointment day |
| 5 | Do cancelled / missed appointments count as "has appointment" (we exclude them) | Cancel an appointment and run the day |
| 6 | Column order and ✓ / X rendering | One printout |

## Claims Printed - `daily.claims_printed`

Daily Reports, screenshot 11.PNG - P1 - S - `reports_daily_reports_screen_view_only` (family `daily`) - instant - INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Billing staff | End of day | Confirm that the paper claims printed today went out, and that each printed claim was then marked sent (printing alone does not mark a claim sent, research A11 [P38]) [unverified] |
| Office manager | Weekly | Paper volume per carrier: candidates for moving to electronic submission |
| Auditor | On demand | Who printed which claim when (PHI disclosure trail of paper claims); `Printed By` is class `user_activity`, so the auditor role needs that class (security_card 2.3) |

### Legacy output

Confidence: **INFERRED**. No vendor description exists (research A11); the report appears in no old-name source. The
layout below follows Denticon's own `Claims Listing` (Insurance Reports > Claims List, 2011 sample [P39·img]) and must be
confirmed with one live printout (RPT-DAILY work item below) before the columns are frozen.

| Format | Inferred layout |
|---|---|
| Detail | `Carrier : <name>  Ph : <phone>` header → one line per printed claim → `Total for <carrier> [ <count> ] :` with amount sums |
| Summary | One line per carrier: carrier, number of claims, claim amount, estimated insurance [unverified] |

Detail columns (Claims Listing model): `Chart #` (with an `ORTHO` marker), `Patient / Subscriber`, `Patient - Subscriber DOB`,
`Sub ID`, `Claim #`, `Claim Sent - DOS`, `Claim Amt`, `Est. Ins`, `Recv. Amt.`, `Rem. Amt.`, `Status`. We add `Printed`
(date and time of the print) because it is the report's date basis. Footer of the model: `From` / `Thru`, `Carrier`,
`Provider`. Sign: claim amounts positive; `Rem. Amt.` = expected minus received.

### Parameters - legacy parity

<!-- PARITY:daily_reports.r11:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT FORMAT | (no label) (radio_group) | **Detail** / Summary | `report_format` | enum | Detail -> `detail`, Summary -> `summary` | `detail` | replicated | Detail / Summary both enabled in every state (no dependency captured). Detail = one row per printed claim by carrier; Summary = one row per carrier. Whole report output INFERRED. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group (picker source switches with the mode). Both options enabled on this report. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Default = id of the office the user was working in (capture shows 108). Mode office: one or more offices the caller can read (default working_office); mode office_group: groups of Setup > Office Groups (default all). The selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; all = no restriction. Provider role: billing provider of the claim (rpt_claim_facts.billing_provider_id) - INFERRED, no vendor description of this report; confirm (treating provider is the alternative). |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary range, fixed basis claim_printed_date (NEW, DATA-21: claim_print_events / insurance_claims.last_printed_at): claims printed on paper in the range. INFERRED basis (printed vs created vs sent date); prints are not recorded today, so the report covers prints from DATA-21 on (APP). Default = today in the office time zone. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the claim_printed_date range. Default = today in the office time zone; enhanced with presets and relative tokens. |
| CARRIER | Carriers (picker) | shown: ALL | `carrier_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:daily_reports.r11:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | Format `detail`: block `printed_claims`, one row per printed claim, grouped by carrier |
| REPORT FORMAT `Summary` | Format `summary`: block `carrier_summary`, one row per carrier (counts and amounts of the same claims) |
| PRINT FORMAT `PDF` (default) / `Excel` | Rendering only; `csv` added |
| OFFICE/GROUP `Office` (default, working office) / `Office Group` (ALL) | Claim office (`rpt_claim_facts.office_id`) in the resolved list; office band when multi-office |
| PROVIDER `ALL` (default) / list | Billing provider of the claim (`rpt_claim_facts.billing_provider_id`), INFERRED (treating provider is the alternative, Open questions 2) |
| DATE RANGE Start / End (default today / today) | Fixed basis `claim_printed_date` (NEW, DATA-21): claims with at least one print event whose office-local date is in the range |
| CARRIER `ALL` (default) / list | `carrier_ids` on `rpt_claim_facts.carrier_id` |

Dependency rules: none on the legacy screen (no greyed control). Office scope rule d02 of the family applies.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `only_not_marked_sent` | `boolean` NEW | `false` | Keeps claims whose `status_class = 'unsent'` after the print: the "printed but never marked sent" worklist | Owner: this catalog |
| `show_each_print` | `boolean` NEW | `false` | One row per print event instead of per claim (reprints visible, with `Printed By`) | `Printed By` is class `user_activity` |
| `include_preauthorizations` | `boolean` NEW | `true` | `false` drops printed pre-authorisations (`is_preauth`); column `Type` shows Claim / Pre-auth; money totals never include them (`sum where NOT is_preauth`) | Legacy screen has no control; whether the legacy lists pre-authorisations is INFERRED - confirm (open question 4). Not the shared `claim_kind` (single choice, default `claims`) |
| `user_ids` | `entity_multi` (shared 3.2) | `all` | Prints made by the selected users (`claim_print_events.printed_by_user_id`) | App-era only by construction |
| `date_range` presets `yesterday`, `this_week` | preset | `today` | Weekly paper review | |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_claim_facts` (`claim_id`, `claim_number`, `claim_family_no`, `patient_id`, `office_id`, `carrier_id`, `carrier_name`, `carrier_phone`, `tier`, `is_preauth`, `status_class`, `submitted_date`, `service_from`, `service_to`, `billing_provider_id`, `treating_provider_id`, `billed_amount`, `expected_amount`, `paid_amount`, `outstanding_amount`, `outstanding_quality`, `subscriber_id`, `subscriber_name`, `subscriber_dob`, `print_count`, `last_printed_at`, `sent_method`), `claim_print_events` (NEW, DATA-21: `claim_id`, `printed_at`, `printed_by_user_id`, `office_id`, `channel` (`ada_direct`, `batch_paper`, `preview`), `form_version`), `rpt_patient_dim` (`chart_no`, names, `dob`, `is_ortho_patient`) |
| Row filter | claims with an `EXISTS` print event in range (`(printed_at AT TIME ZONE 'UTC' AT TIME ZONE office tz)::date BETWEEN :date_from AND :date_to`), `status_class <> 'deleted'`; void claims are kept with Status `Void` (the paper already left the office; open question 4); preview-only events excluded (a print preview is not a print) |
| Pre-authorisations | listed (with `include_preauthorizations`), but every money total (carrier, office, grand, summary) is `sum where NOT is_preauth` (data_card 2.20 consumer rule); the carrier subtotal adds a separate `Pre-auths` count |
| E-claims | Only paper prints are events; a claim sent electronically appears only if it was also printed (copy for the office) - inferred |
| Date basis | fixed `claim_printed_date` (NEW; filter_card 3.10: claim prints are not recorded today) |
| Office / provider attribution | claim office; billing provider of the claim (inferred) |
| Money | `billed_amount` (Claim Amt), `expected_amount` (Est. Ins), `paid_amount` (Recv. Amt.), `outstanding_amount` (Rem. Amt.; blank when `outstanding_quality = 'unknown'`). Per-tier columns, so a secondary claim prints its own expected amount. `billed_amount` describes the lines of the whole claim family (data_card 2.20 Family rule): when a primary and its secondary are both printed in the range, the carrier totals count `billed_amount` once per `claim_family_no` and carrier |
| Availability | **SCHEMA(21)** (coverage matrix 11.1 row 11): prints are not recorded today. The frontend prints the ADA form client-side (`src/features/claims/ada/AdaClaimPrintModal.tsx`) and keeps a print log only in `localStorage` (`dentc:claim_print_log:v1:<claim_id>`, `appendClaimPrintLog` in `src/features/claims/ada/adaLocalStores.ts`), which the server cannot read. After DATA-21 the report is **APP**: no print before the capture start exists; availability code NEW `claim_prints_not_recorded_before` (with the capture start date) on ranges that start earlier |
| Migrated history | no migrated claim has a print event; `print_count` is 0 on every migrated claim |

### Output

Report formats `detail` (default) and `summary`. `title_templates`: `Claims Printed - Detail` / `Claims Printed - Summary`
(proposal).

`printed_claims` (format `detail`, shape `table`, `row_id_column = row_id`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | Office | id, hidden | aggregate | band key |
| `carrier_id` | - | id, hidden | aggregate | group key; header `Carrier : {carrier_name}  Ph : {carrier_phone}` |
| `row_id` | - | text, hidden | phi_identified | `claim_id` (or `claim_id:event_id` with `show_each_print`) |
| `patient_id`, `claim_id` | - | id, hidden | phi_identified | drill, manifest |
| `chart_no` | Chart # | text | phi_identified | none; suffix `ORTHO` when `is_ortho_patient` |
| `patient_subscriber` | Patient / Subscriber | text, entity patient | phi_identified | key column; subtotal label `Total for {carrier_name} [ {count} ] :` |
| `patient_subscriber_dob` | Patient - Subscriber DOB | text | phi_identified | none |
| `subscriber_id` | Sub ID | text | phi_sensitive | none (dropped for a caller without the class) |
| `claim_number` | Claim # | text | phi_identified | `count` |
| `tier` | Tier | enum | aggregate | none (added: primary / secondary ...) |
| `sent_dos` | Claim Sent - DOS | text | phi_identified | none (`submitted_date` and `service_from`) |
| `printed_at` | Printed | datetime (`tz: office`) | phi_identified | none; latest print in range |
| `printed_by` | Printed By | text, `visible_when ["truthy","show_each_print"]` | user_activity | none |
| `billed_amount` | Claim Amt | money | financial_patient | sum where `NOT is_preauth` per carrier, office, grand |
| `expected_amount` | Est. Ins | money | financial_patient | sum where `NOT is_preauth` |
| `paid_amount` | Recv. Amt. | money | financial_patient | sum where `NOT is_preauth` |
| `outstanding_amount` | Rem. Amt. | money | financial_patient | sum where `NOT is_preauth` (unknown-quality rows excluded and counted) |
| `claim_type` | Type | enum Claim / Pre-auth (added) | aggregate | `count` of Pre-auth per carrier |
| `status_label` | Status | enum | aggregate | none |

`carrier_summary` (format `summary`): `carrier_name` "Carrier" (aggregate, key), `claim_count` "# Claims" (integer, sum),
`print_count` "# Prints" (integer, sum; added, not legacy), `billed_amount` "Claim Amt", `expected_amount` "Est. Ins" (money,
`financial_practice`, sum where `NOT is_preauth`); grand total.

Grouping: office band → carrier level (detail). Sort inside a carrier: patient last name, `claim_number`, `row_id` (no
legacy SORT BY). Page break: none legacy. Summary cards (block totals): claims printed, claims printed and still unsent,
claim amount printed. No metric key covers prints (a governed count would be NEW in `05_metric_catalog.md`). `empty_when`:
`no_detail_rows` → all-clear state ("No paper claims printed in the range").

### Visuals and drill-through

Chart: none - a list (summary format: bar of claims per carrier when more than three carriers).

| Click | Target |
|---|---|
| Claim # / row | `kind = record`, `{entity: claim, id_column: claim_id, route_key: claim_detail}`, `right_code transactions_insurance_claims_details_view_only`, `phi_identified` |
| Patient | `kind = record`, patient insurance screen |
| Summary carrier row | `kind = rows`: format `detail`, `carrier_ids = [carrier_id]` |
| Card "printed and still unsent" | Same report with `only_not_marked_sent = true` |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open claim | row | `navigate` | |
| Mark as sent | bulk | `custom:claims_mark_sent` NEW | Calls the claims feature's send-status update for the selected unsent claims (legacy `Update as Sent` of Outstanding Paper Claims, research A11 [P38]); needs the claim edit right; idempotent per `(run_id, action_key, claim_id)` |
| Reprint | row | `navigate` | Opens the ADA print modal for the claim (records a new print event) |
| Export selection | bulk | `export_selection` | |

Doubles as a worklist with `only_not_marked_sent`.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape; header practice-group name, title per format, `From / Thru`; carrier band with phone; footer criteria echo (Offices, Providers, Carriers), `Printed :`, `Page : n of m`; `claim_prints_not_recorded_before` note in the criteria block |
| XLSX | `printed_claims` or `carrier_summary`, carrier as a column, `criteria` sheet |
| CSV | Active block |
| Background | Not needed |

### Open questions

| # | Question | Check on the live legacy tool / decision |
|---|---|---|
| 1 | Real layout, columns and Summary content (whole report INFERRED) | Obtain one printout of each format |
| 2 | PROVIDER: billing or treating provider | Claim whose billing and treating providers differ |
| 3 | Date basis: printed, created or sent date | Print an old claim today and run today |
| 4 | Are e-claims, pre-authorisations (taken: listed, excluded from money totals) and void claims (taken: kept as Void) included | Run a day with one e-claim, one printed pre-auth and one voided printed claim |
| 5 | Does a batch print (Outstanding Paper Claims) and a single-claim print both count | Print one claim each way |
| 6 | Product decision: is a print preview a print (we exclude previews) | Product owner |

## Special Transaction Report - `daily.special_transaction_report`

Daily Reports, screenshot 12.PNG (plus vendor-documented Sort By row) - P1 - L - `reports_daily_reports_screen_view_only` (family `daily`) - interactive (background above `max_rows_inline` once ENG-38 exists, P2) - DOCUMENTED (PDF and Excel samples, 2025)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Management | As needed (research A12 [P2]) | Count procedures for fee negotiation (codes by provider, carrier plan); clinical-mix questions such as an exam code charged to ages 0-3 or sealants done today |
| Billing | On demand | Find every account that received a finance charge on a date (adjustment code); find payments of one patient for an HSA / FSA receipt in Excel [P36][P37] |
| Office manager | Daily / weekly | Postings by user or by transaction provider for a chosen code set |

### Legacy output

Confidence: **DOCUMENTED** [P36·img][P37·img]; group totals, the meaning of `PRIM` / `SEC` and the Amount dropdown values are
unverified. Title `Special Transaction Report`.

PDF: criteria block at the **top** (`Patient Name Range`, `Date Range`, `Providers`, `Payment/Adjust`, `Procedure Codes`,
`Excluded Pat Types`, `Group By`), then `Office: <name>`, then a group header per Group By value (e.g. `Code: <code> -
<description>`), then:

| # | Column | Content |
|---|---|---|
| 1 | `Date` | Transaction or service date (per the date-basis radio) |
| 2 | `Patient ID` | |
| 3 | `Patient Name` | |
| 4 | `Pat Type` | User-defined patient types, comma-separated |
| 5 | `Tran Prdr` | Transaction provider |
| 6 | `UCR` | Office fee |
| 7 | `PRIM`, `SEC` | Primary / secondary insurance portions [unverified meaning] |
| 8 | `AMOUNT` | Transaction amount |

Excel (flat, one row per transaction): `Office Name`, `Code` (code - description), `Date`, `Patient ID`, `Patient Name`,
`Pat Type`, `Transaction Provider`, `UCR`, `PRIM`, `SEC`, `AMOUNT`, with the group value repeated as a column.

Kept: criteria echo at the top; one flat Excel row per transaction. Added (not documented): group subtotals (count, UCR,
PRIM, SEC, AMOUNT) and an office total. Sign: `AMOUNT` = `rpt_ledger_entries.amount` (charges positive, payments negative,
adjustments with their sign); the legacy sign of payment rows is unverified (Open questions 4). `PRIM` / `SEC` are the
insurance estimates at posting on procedure rows (proposal), blank on payment and adjustment rows.

### Parameters - legacy parity

<!-- PARITY:daily_reports.r12:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group (picker source switches with the mode). Both options enabled on this report. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Default = id of the office the user was working in (capture shows 108). Mode office: one or more offices the caller can read (default working_office); mode office_group: groups of Setup > Office Groups (default all). The selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER/USER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; all = no restriction. Provider role: transaction provider (rpt_ledger_entries.provider_id, printed Tran Prdr / Transaction Provider). |
| PROVIDER/USER | User (picker) | shown: ALL | `user_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; all = no restriction. User role: poster of the ledger leg (user_key); also the group key of group_by = user (Username). |
| DATE RANGE | (no label) (radio_group) | **Transaction Date** / Service Date | `date_basis` | enum | Transaction Date -> `transaction_date`, Service Date -> `service_date` | `transaction_date` | replicated | Transaction Date bound provisionally to the ledger transaction_date; the supplement records the vendor reading 'date the transaction was entered', which would bind to created_date (reliable on app rows only, data_card 4.2) - open question 10. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range; date_basis is fixed per report or chosen by the basis radio of the same section. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| PATIENT NAME RANGE | Start Name (text_input) | shown: AAAAA | `patient_name_from` | text_range | - | `AAAAA` | replicated | Start of an alphabetical range on the patient sort name (Last, First). AAAAA / ZZZZZ are the legacy open bounds. On Super Bill both boxes are pre-filled with the patient in context (token current_patient_name = Last, First), which selects exactly that patient. |
| PATIENT NAME RANGE | SEARCH (button) | - | `patient_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| PATIENT NAME RANGE | End Name (text_input) | shown: ZZZZZ | `patient_name_to` | text_range | - | `ZZZZZ` | replicated | End of the alphabetical range on the patient sort name (inclusive, prefix rule). Vendor documentation: the same patient in both boxes limits the report to that patient. |
| PATIENT NAME RANGE | SEARCH (button) | - | `patient_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| EXCLUDE PATIENT TYPE | (no label) (picker) | shown: None | `exclude_patient_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; patients holding a selected type are dropped. Source row no_type_defined (if the dialog lists No Type Defined) drops patients without a type; otherwise patients without a type are kept. Dialog never captured; vendor text calls it an include filter - confirm. |
| PAYMENT/ADJ CODES | (no label) (picker) | shown: None | `payment_adjustment_codes` | entity_multi | - | `none` | replicated_enhanced | payment_adjustment_codes is a NEW key (owner 04 section 3.8): entity_multi, values kind:code plus pseudo-value payment:(none) for legs without a code, default none; ALL = every payment, adjustment, refund, transfer and opening-balance leg with no code predicate. Dialog never captured. |
| PAYMENT/ADJ CODES | NONE (button) | - | `payment_adjustment_codes.clear` | action | - | - | superseded | NONE button resets the picker to None. Superseded by the None / clear control built into the multi-select. |
| INSURANCE PLANS/SUB TYPES | (no label) (picker) | shown: ALL | `insurance_plan_selection` | entity_multi | - | `all` | unknown_legacy | insurance_plan_selection is a NEW key (owner 04 section 3.5): one entity_multi parameter whose option source insurance_plans_and_subtypes returns typed values plan:<id>, subtype:dental, subtype:medical; ALL = no restriction. Dialog never captured: confirm rows, grouping and selection rules on the live tool. |
| CODE/CATEGORY | (no label) (radio_group) | **Code** / Category | `code_scope.mode` | scoped_selection | Code -> `code`, Category -> `category` | `code` | replicated | Chooses whether the picker below lists procedure codes or categories. |
| CODE/CATEGORY | (no label) (picker) | shown: ALL | `code_scope.selection` | scoped_selection | - | `all` | replicated_enhanced | Procedure codes (mode code) or procedure categories (mode category). Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| CODE/CATEGORY | NONE (button) | - | `code_scope.clear` | action | - | - | superseded | NONE button sets the selection to none. Superseded by the None / clear control built into the multi-select. |
| OTHER OPTIONS | Age Range (checkbox) | **unchecked** | `age_range_enabled` | number_range | - | `false` | replicated | Gate of the age range: the From / To boxes apply only when ticked. |
| OTHER OPTIONS | From (number_input) | shown: 0 - greyed out | `age_from` | number_range | - | `0` | replicated | Enabled when: age_range_enabled == true (inferred). Lower age bound in years, inclusive; 0 is the legacy open bound (no predicate). Applies only while Age Range is ticked. |
| OTHER OPTIONS | To (number_input) | shown: 999 - greyed out | `age_to` | number_range | - | `999` | replicated | Enabled when: age_range_enabled == true (inferred). Upper age bound in years, inclusive; 999 is the legacy open bound (no predicate). Applies only while Age Range is ticked. |
| OTHER OPTIONS | Amount (dropdown) | shown: All Amount | `amount_operator` | amount_comparison | - | `all` | unknown_legacy | Static dropdown captured collapsed: only All Amount is known. Provisional option set until the live check: all, greater_than, greater_or_equal, less_than, less_or_equal, equal, compared on abs(amount); whether the legacy compares the signed or the absolute amount is unknown (open question 1). |
| OTHER OPTIONS | (no label) (number_input) | shown: 0 - greyed out | `amount_value` | amount_comparison | - | `0.00` | replicated | Enabled when: amount_operator != all (inferred). Comparison amount for the Amount dropdown. Greyed while the dropdown shows All Amount. |
| OTHER OPTIONS | Group By (radio_group) | **Code** / Username / Insurance Plan / Transaction Provider | `group_by` | enum | Code -> `code`, Username -> `user`, Insurance Plan -> `insurance_plan`, Transaction Provider -> `transaction_provider` | `code` | replicated | Row label Group By inside OTHER OPTIONS. Vendor documentation shows a further Sort By row below it that our capture cuts off. |
| OTHER OPTIONS | Sort By (radio_group) † | Patient LastName / Patient ID / Date | `sort_by` | enum | Patient LastName -> `patient_last_name`, Patient ID -> `patient_id`, Date -> `date` | - | replicated | VENDOR-DOC row Sort By below Group By (cut off in our capture). Order inside each group_by group. Date = the column chosen by date_basis (transaction_date or service_date). Legacy default not documented: parity default empty; the definition uses the 04 rule 'first legacy option' (patient_last_name) until confirmed on the live tool. |

† From vendor documentation - not visible in our screenshot of this screen (hidden row, collapsed dropdown or another report mode).

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| CODE/CATEGORY = Code / Category | the picker box under the radios selects procedure codes (Code) or ADA categories (Category) | code_scope (scoped_selection): code_scope_mode = code reads lookup:procedure_codes, code_scope_mode = category reads lookup:procedure_categories for code_scope_selection. Changing the mode resets code_scope_selection to all (design decision; legacy reset behaviour not documented - confirm in RPT-DAILY-80); none stays allowed in both modes. |
| the criteria screen was opened from a saved favorite (My Favorites) | the ADD TO MY FAVORITES action button reads UPDATE MY FAVORITES | Hub feature (07): a report opened from a saved view or favorite shows 'Update favorite' instead of 'Add to favorites'; the action updates that report_saved_views row. |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `amount_value` | required_when | amount_operator != all | - | inferred |
<!-- PARITY:daily_reports.r12:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Rendering only; Excel = the flat layout above (group value as column); `csv` added |
| OFFICE/GROUP `Office` (default) / `Office Group` (ALL) | Transaction office (`rpt_ledger_entries.office_id`); Office Group reproduces the old group-level report; office band per office |
| PROVIDER/USER Provider `ALL` (default) / list | Transaction provider of the line (`rpt_ledger_entries.provider_id`: treating provider on charges, credited provider on payments, adjustment provider) |
| PROVIDER/USER User `ALL` (default) / list | Poster of the line (`user_key`); migrated rows match only under `all` |
| DATE RANGE `Transaction Date` (default) | `transaction_date` between the bounds (ledger date; binding provisional: the vendor reading "date entered" would bind to `created_date`, reliable on app rows only - open question 10) |
| DATE RANGE `Service Date` | `service_date_effective` between the bounds (charges: date of service; adjustments and payments: date of the linked charge, else transaction date). On charges both bases select the same rows until DATA-13 |
| DATE RANGE Start / End (default today / today) | Inclusive, office-local |
| PATIENT NAME RANGE Start `AAAAA` / End `ZZZZZ` (defaults) | Sort name `Last, First` range with the prefix rule; sentinel bounds add no predicate; same name twice = one patient. SEARCH buttons superseded by the lookup in each box |
| EXCLUDE PATIENT TYPE `None` (default) / list | Patients holding any selected user-defined type are dropped (`NOT` overlap with `patient_type_codes`). Source row `no_type_defined` (if the legacy dialog lists No Type Defined, family open question 3) drops patients whose `patient_type_codes` is empty; otherwise patients without a type are always kept. Vendor text calls it an include filter (conflict, Open questions 2) |
| PAYMENT/ADJ CODES `None` (default) | No payment or adjustment rows |
| PAYMENT/ADJ CODES `ALL` / list (`NONE` button resets to None) | `ALL` = every live leg with `entry_type IN ('patient_payment','insurance_payment','adjustment','refund','transfer','opening_balance')` and no code predicate (legs without a code included, printed under group `Code: (none)`); a list = `kind:code IN (...)` (`payment_adjustment_codes`, NEW key owned by 04 section 3.8), with pseudo-value `payment:(none)` for legs without a code |
| INSURANCE PLANS/SUB TYPES `ALL` (default) / list | `plan:<id>` keeps patients with an active coverage slot of that plan; `subtype:medical` / `subtype:dental` keeps patients with a slot of that `reporting_subtype`; a list is OR. `all` = no predicate (uninsured patients kept). Today's coverage until DATA-33 |
| CODE/CATEGORY `Code` (default) | The picker lists procedure codes (`lookup:procedure_codes`) |
| CODE/CATEGORY `Category` | The picker lists ADA categories (`lookup:procedure_categories`); procedure rows by `code_category` |
| CODE/CATEGORY picker `ALL` (default) / list / `NONE` button | `all` = every procedure row; list = those codes or categories; `none` = no procedure rows |
| OTHER OPTIONS Age Range unticked (default) / ticked | Gate of the age filter; unticked = no age predicate |
| Age From `0` / To `999` (defaults, greyed until ticked) | Inclusive age in whole years at the run's reference date; `0` / `999` are open bounds; a narrowed bound drops patients without a birth date |
| Amount `All Amount` (default) / other operators | `All Amount` = no predicate; the other values are not captured (unknown_legacy); proposal: `greater_than`, `greater_or_equal`, `less_than`, `less_or_equal`, `equal`, compared with the absolute value of `AMOUNT` |
| Amount value (default 0.00, greyed while All Amount) | Comparison value; required when the operator is not `all` |
| Group By `Code` (default) | Group per code: header `Code: {code} - {description}` (procedure, payment or adjustment code) |
| Group By `Username` | Group per poster: `Username: {user_label}` |
| Group By `Insurance Plan` | Group per primary plan of the line (Data): `Insurance Plan: {carrier_name} - {group_number}`; `No insurance` group |
| Group By `Transaction Provider` | Group per line provider: `Transaction Provider: {provider_name}` |
| Sort By `Patient LastName` / `Patient ID` / `Date` (VENDOR-DOC row; default not documented, parity default `patient_last_name`) | Order inside each group; `Date` = the column of the chosen date basis |

Dependency rules: d01 - `code_scope_mode` switches the source of `code_scope_selection` and resets it to `all` (design
decision; legacy reset behaviour not documented, open question 8); `none` stays allowed in both modes. Age `From` / `To` `enabled_when ["truthy","age_range_enabled"]` (inferred). `amount_value`
`enabled_when` and `required_when ["ne","amount_operator","all"]` (inferred). d02 (UPDATE MY FAVORITES) is the hub's saved
view behaviour. When both `code_scope_selection` and `payment_adjustment_codes` are `none` the run is valid and empty; the
form shows the hint "Select procedure codes or payment / adjustment codes" (legacy behaviour unconfirmed).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `age_basis` | `enum` NEW (`run_date`, `row_date`) | `run_date` | `row_date` computes age on the line's date (the "exam code to ages 0-3" question asks the age at service) | Owner: `04_filter_framework.md` (age reference) |
| Code picker extras | FLT-25 (P3) | `all` | Code ranges (`D1351`, `D0100-D0999`), saved code sets ("Sealants", "Exams") | Default unchanged |
| `show_code_count_summary` | `boolean` NEW | `false` | Adds block `code_counts` (per code: count, patients, UCR, AMOUNT) at the report end - the fee-negotiation count without reading the detail | Class `financial_practice` |
| `include_voided` | `boolean` NEW | `false` | Reads `rpt_ledger_entries_all` and adds column `Voided` | Class `user_activity` on the flag; for audit of deleted postings |
| `compare_to` | `enum` (FLT-26, P4) | `none` | Adds prior-period count and AMOUNT to `code_counts` | |
| Saved views | saved view | - | "Finance charges yesterday" (`payment_adjustment_codes = [adjustment:<finance charge code>]`, `code_scope_selection = none`, `date_preset = yesterday`, `group_by = code`); "Sealants today, ages 6-14" (category Preventive or code set, age gate on); "One patient's payments this year" (same name twice, payment codes ALL, `date_preset = year_to_date`) | The patient view cannot be shared organisation-wide (filter_card 12, SH-1) |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_ledger_entries` (rows), `rpt_charges` (`est_ins_primary`, `est_ins_secondary`, `primary_ins_plan_id` after DATA-33), `rpt_patient_dim` (`chart_no`, names, `dob`, `patient_type_codes`), `rpt_insurance_coverage` (`ins_plan_id`, `carrier_name`, `group_number`, `reporting_subtype`, `tier`, `category`), `rpt_procedure_code_dim` (`description`, `code_category`), `rpt_transaction_code_dim` (payment / adjustment descriptions), `rpt_provider_dim`, `rpt_user_dim` (`user_label`) |
| Row sets | procedure rows: `entry_type = 'charge'` filtered by `code_scope`; payment / adjustment rows: under `all` every live leg with `entry_type IN ('patient_payment','insurance_payment','adjustment','refund','transfer','opening_balance')`, NULL code included (group `Code: (none)`); under a list `kind:code IN (...)` plus `payment:(none)` for legs without a code; app remittance legs (`rpay`) and write-offs (`rwo`) are included under `all` whatever their code; capitation legs (no patient) are excluded (no patient attributes to test). NEW keys (owner 04 section 3): `payment_adjustment_codes` (3.8), `insurance_plan_selection` (3.5, typed values `plan:<id>` / `subtype:<value>`) with option sources `lookup:payment_adjustment_codes` and `lookup:insurance_plans_and_subtypes`. Option source `payment_adjustment_codes` lists the system codes (`CASH`, `CHECK`, `CARD`, `ACH`, `unclassified`) as selectable in report pickers only - ask to 03 to align data_card 3.3 (`is_selectable = false` for posting) |
| Filters | office (`office_id`), `provider_id`, `user_key`, date column per `date_basis`, name range on `upper(last_name || ', ' || first_name)`, `NOT (patient_type_codes && :exclude)`, coverage `EXISTS` on `rpt_insurance_coverage`, age from `dob`, amount on `abs(amount)` |
| Insurance plan of a line (grouping) | charges: `primary_ins_plan_id` (DATA-33, P2), else the patient's active dental primary slot today; payments: `ins_plan_id` (DATA-33) else the same fallback; NULL = `No insurance`. Availability code NEW `plan_from_current_coverage` until DATA-33 |
| Columns used | `entry_id`, `entry_type`, `code`, `code_kind`, `amount`, `office_fee`, `transaction_date`, `service_date_effective`, `office_id`, `provider_id`, `patient_id`, `user_key`, `procedure_id`, `claim_id`, `is_void` (with `include_voided`) |
| Date basis | `date_basis` parameter: `transaction_date` (default) / `service_date` |
| Office / provider / user attribution | transaction office; transaction provider (Tran Prdr); poster `user_key` |
| Availability | **READY** (coverage matrix 11.1 row 12). Payment / adjustment codes on history: REPAIR(12) - migrated payments carry only the tender aliases `CASH`, `CHECK`, `CARD`, `ACH` and adjustments `unclassified`, so a specific code finds app-era rows only (code `migrated_adjustments_unclassified` and NEW `migrated_payment_codes_aliased`); Service vs Transaction date on charges: SCHEMA(13); insurance-plan grouping on today's coverage until SCHEMA(33) |
| Migrated history | user is a legacy login string (matches only `all`; `Username` groups by that string); charges skipped by the migration (DATA-57) are absent |

### Output

Report format: one (`standard`); the group-by value selects the group level. Block `transactions` (shape `table`,
`row_id_column = row_id`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | - | id, hidden | aggregate | band key `Office: {office_name}` |
| `office_name` | Office Name | text, `export {pdf: false}` | aggregate | none (Excel and CSV column) |
| `group_key` | - | text, hidden | aggregate | group key |
| `group_label` | Code / Username / Insurance Plan / Transaction Provider (label per `group_by`) | text, `export {pdf: false, xlsx: true, csv: true}` (printed as the group header in PDF) | aggregate | subtotal `Total for {group_label} :` |
| `row_id` | - | text, hidden | phi_identified | `entry_id` |
| `row_date` | Date | date | phi_identified | none |
| `patient_id` | Patient ID | id, entity patient | phi_identified | none; sort key `patient_id` |
| `patient_last_name` | - | text, hidden | phi_identified | sort key |
| `patient_name` | Patient Name | text | phi_identified | key column; `count` per group |
| `pat_type` | Pat Type | text | phi_identified | none |
| `code`, `code_description` | Code (Excel: `code - description`) | text; `export {pdf: false}` when `group_by = code` (the header carries it); under the other groupings printed in the PDF as an added column (not in the legacy PDF list, open question 5) | phi_identified | none |
| `tran_provider` | Tran Prdr (Excel: Transaction Provider) | text | aggregate | none |
| `user_label` | User | text, `default_visible false` | aggregate | none (rule 12) |
| `ucr` | UCR | money | financial_patient | sum per group, office, grand |
| `prim` | PRIM | money | financial_patient | sum |
| `sec` | SEC | money | financial_patient | sum |
| `amount` | AMOUNT | money | financial_patient | sum |
| `is_voided` | Voided | boolean, `visible_when ["truthy","include_voided"]` | user_activity | count |

`code_counts` (visible with `show_code_count_summary`, placement `report_end`): `code` (aggregate, key), `description`,
`line_count`, `patient_count` (`count_distinct`), `ucr`, `amount` (money `financial_practice`).

Grouping: `fixed_outer` office band (always printed, as in the sample) → level from `group_by` (`code`, `user`,
`insurance_plan`, `transaction_provider`); subtotal per group, office total, grand total when multi-office. Sort options
(`sort_by`): `patient_last_name` (last name, first name, `row_date`, `row_id`), `patient_id` (`patient_id`, `row_date`,
`row_id`), `date` (`row_date`, last name, `row_id`). Page break: none legacy (enhancement: `page_break_by = group`, shared
member, default `none`). Summary cards (block totals): lines, patients, AMOUNT, UCR. `reconciles_with`: none (a filtered
finder); test: with `code_scope_selection = all`, `payment_adjustment_codes = none` and default options, `SUM(amount)` equals
`SUM(charged_fee)` of `rpt_charges` for the same office, providers and transaction dates. `empty_when`: `no_detail_rows`.

### Visuals and drill-through

Chart: none by default (a finder); with `show_code_count_summary` a bar of `line_count` per code (`top_n` 15).

| Click | Target |
|---|---|
| Patient ID / name | `kind = record`, patient ledger at `row_date` (`phi_identified`, ledger feature right) |
| Row | `kind = record`, ledger entry (`entry_id`) |
| Code group subtotal (procedure code) | Only when `group_by = code` and the group is a procedure code: `daily.production_report`, `report_by = code`, `procedure_codes = [{group: group_key}]`, same date range, office and providers (production context of the code) |
| `code_counts` row | `kind = rows`: same report filtered to the code |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open patient ledger | row | `navigate` | |
| Patient payment receipt | bulk (payment rows of one patient) | `custom:payment_receipt` NEW | One PDF receipt listing the selected payments (HSA / FSA use case [P37]); handler owned by the ledger feature; P3 |
| Letter / postcard / SMS to listed patients | bulk | `letters`, `postcards`, `send_sms` | e.g. recall or follow-up of all patients with a code (sealant program); consent exclusions `no_correspondence`, `no_auto_sms`, `sms_opt_out_at`; distinct patients |
| Create task | bulk | `create_task` | Correct a posting found wrong (code, provider) |
| Export selection | bulk | `export_selection` | |

Not a standing worklist; a saved view becomes a recurring list (e.g. daily finance charges).

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape; `criteria_echo = header` (Patient Name Range, Date Range with basis, Providers, Users, Payment/Adjust, Procedure Codes or Categories, Excluded Pat Types, Insurance Plans/Sub Types, Age Range, Amount, Group By, Sort By); office band; group headers; `Printed :`, `Page : n of m` in the footer |
| XLSX | One flat sheet `transactions` in the legacy Excel column order (`Office Name`, group value column, `Date`, `Patient ID`, `Patient Name`, `Pat Type`, `Transaction Provider`, `UCR`, `PRIM`, `SEC`, `AMOUNT`), typed cells, no subtotal rows (totals are left to the user's formulas or the `code_counts` sheet), `criteria` sheet |
| CSV | `transactions`, same column order |
| Background | Year ranges with all codes over several offices exceed `max_rows_inline`; escalate to `background` (ENG-38, P2) |

### Open questions

| # | Question | Check on the live legacy tool / decision |
|---|---|---|
| 1 | Values of the Amount dropdown and whether the comparison uses the signed or absolute amount | Expand the dropdown; run `> 100` with payments selected |
| 2 | EXCLUDE PATIENT TYPE: exclude (label, footer `Excluded Pat Types`) or include (vendor article) | Pick one type and compare row counts |
| 3 | Meaning of `PRIM` / `SEC` on procedure rows (estimate) and on payment rows | Compare a sample row with the ledger |
| 4 | Sign of payment and credit-adjustment rows in `AMOUNT` | Run with one payment code |
| 5 | Group totals and office totals: printed or not | One multi-page printout |
| 6 | Default of the Sort By row; whether Age From / To unlock with the checkbox | Open the criteria screen |
| 7 | Age reference date (run date, end date or line date) | Patient whose birthday falls inside the range |
| 8 | Is the Category list of CODE/CATEGORY the 14 SEARCH CODE categories; does switching Code / Category reset the selection (taken: reset to ALL) | Open the picker in Category mode; switch the radio with codes picked |
| 9 | INSURANCE PLANS/SUB TYPES dialog: list source, tiers considered, inactive plans | Open the dialog |
| 10 | `Transaction Date` = ledger date (bound now) or entry date (`created_date`, reliable on app rows only) | Post a back-dated payment (family open question 1) |

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-DAILY-01 | Register the `daily` category: 12 definitions with `legacy_names`, `legacy` pointer, `right_code` family `daily`, phase P1, hub section Financial › Daily | P1 | S | ENG-05, ENG-18, SEC-01, SEC-03 | The catalog lists the 12 reports for a holder of `reports_daily_reports_screen_view_only` and none for a caller without it; the definition lint loads `catalog/parity/daily_reports.parity.json` and passes for all 12 |
| RPT-DAILY-02 | Family page furniture: `title_templates`, Office band (`fixed_outer` when multi-office), footer criteria echo with starred option notes, Printed / Page n of m; header echo for Special Transaction Report | P1 | M | ENG-23, ENG-24, ENG-25, FLT-18 | A two-office PDF of Daily Journal, Production Report and Deposit Slip shows one Office band per office, the variant title and every non-default criterion in the footer; Special Transaction Report shows it at the top |
| RPT-DAILY-03 | Shared ledger-line pieces: `journal_column` column mapping, display sign rules (Deposit Slip positive), the Est. Pat. / Est. Ins. / Total summary block builder reused by Daily Journal, Peg Board Day Sheet and Collection Report | P1 | M | DATA-03, DATA-06, ENG-11 | On the fixture day a production adjustment prints in Charges, a contract-billing charge in Adjust, payments negative (positive on Deposit Slip); the summary block total equals `SUM(amount)` of the same rows |
| RPT-DAILY-04 | Attribution and availability declarations: `scope.office_attribution`, `provider_attribution`, `date_basis` per the family table (Scheduled Production composite NEW `appointment_or_service_office` / `line_or_treating_provider`; Progress Notes office attribution per report format); `availability[]` codes for created date, user and codes on migrated rows, payment date = transaction date until DATA-13, prints before DATA-21 | P1 | S | DATA-02, DATA-12, DATA-13, DATA-21 | A run whose range touches migrated rows returns the matching warnings and prints them in the criteria block; each definition (or each report format of Progress Notes) serves exactly one declared office and one provider attribution, printed in the criteria echo |
| RPT-DAILY-05 | Rights and data classes of the 12 definitions (key class `clinical` on Progress Notes, `payment_instrument` on Deposit Slip, `provider_comp` on provider dimensions) and the P1 security review | P1 | S | SEC-07, SEC-24 | A caller without `clinical` is refused Progress Notes with 403 `data_class_denied`; a caller without `payment_instrument` gets the Deposit Slip without Bank # / Check #; lint finds no unclassified column |
| RPT-DAILY-06 | Parity tests: default run of every report equals the legacy default criteria; the 19 dynamic rules as expression test vectors | P1 | M | FLT-20, ENG-04, ENG-06 | FLT-20 passes for all 154 controls; each rule of the parity file has a vector that toggles its parameter and checks enabled / visible / forced / label state in Python and TypeScript |
| RPT-DAILY-07 | Reconciliation of family totals with the metric registry (`reconciles_with`) and the Sub Type / bucket bridges | P1 | M | DATA-09, ENG-32 | On the fixture and the UAT database Production Report totals equal `charged_production` + `production_adjustments` = `net_production`, Collection Report payments equal `-gross_collections`, the Collection adjustment list minus `collection_adjustments` equals the bridge (collection-side legs in production / non-income / opening buckets minus collection-bucket legs of another side), Scheduled Production equals `scheduled_production` (line provider) and actual equals `charged_production` with basis `transaction`, for the same parameters |
| RPT-DAILY-08 | Drill-through and exception states: totals to `rows`, patient rows to ledger / note / claim / appointment records; "all clear" empty state for Daily Audit, Progress Notes Unsigned / Missing, Claims Printed | P1 | M | ENG-30, SEC-09 | Clicking a Production Report code total opens the detail rows that sum to it; a patient row opens the record only with `phi_identified` and the feature right; an empty Daily Audit run renders the all-clear state and counts as empty for `skip_if_empty` |
| RPT-DAILY-09 | Live legacy verification pass for the family: the family open questions and the per-report `unknown_legacy` controls (Fee Schedule To Compare default, Amount list, Insurance Plans/Sub Types dialog) and the unseen states (Production Report Category / Carrier, Progress Notes Unsigned, Show AR) | P1 | S | FLT-23 | Every item has a recorded answer with a screenshot reference; parity decisions updated and `build_parity.py` prints PARITY VALID with no `unknown_legacy` left in the category, or a written waiver per item |
| RPT-DAILY-10 | Peg Board Day Sheet definition: `postings` block with per-line running balance on unit (`account_id`, `office_id`), office bands, `journal_summary` trailer, availability `day_sheet_not_frozen` | P1 | M | DATA-06, DATA-02, ENG-11, ENG-24, RPT-DAILY-03 | On the fixture day each line's `new_balance - previous_balance = amount`; the last line of each account equals its ledger balance at the end of the day; a past-day run prints the not-frozen caveat |
| RPT-DAILY-11 | Day-sheet A/R control block and proof: previous / new receivables per office, `other_postings` for provider / user / type filters, `proof_difference`; optional `provider_recap` | P1 | S | DATA-06, DATA-09 | For every fixture day and every filter combination `proof_difference = 0.00` and `new_receivables` equals the office's transaction-office ledger balance (R-14b) |
| RPT-DAILY-12 | Peg Board Day Sheet legacy confirmation: obtain one live printout, freeze columns, record the product decision on balance unit and provider filter | P1 | S | FLT-23, RPT-DAILY-09 | A screenshot reference and a signed decision exist; the definition's column list matches it or each deviation is written down |
| RPT-DAILY-13 | Daily Journal definition: Detail and Summary formats, basis-date level, GROUP BY provider / user (provider key `provider_comp`), page break, `transaction_types` entry-class mapping, `patient_type`, datewise block, `ar_summary` block of Show AR (`enabled_when unknown`), variant titles | P1 | L | DATA-06, ENG-11, ENG-24, ENG-27, RPT-DAILY-03 | The fixture day reproduces the legacy Detail and Summary sample structure (date subtotal, office total, summary block, grand total summary); unticking Payments removes payment lines and the Payments section; Summary has no patient column; ticking Show AR adds Total A/R equal to the office ledger balance at `date_to`; a caller without `provider_comp` is refused GROUP BY Provider only |
| RPT-DAILY-14 | Daily Journal Created Date basis: per-office UTC bounds, era greying when `created_at_reliable` is false, switch to `posting_date` after DATA-13; `backdated_only` enhancement | P1 | S | DATA-10, DATA-13, FLT-12 | A payment keyed today for yesterday appears on today's Created Date run and yesterday's Transaction Date run; a range before the migrated-through date without the restore greys the basis with `created_date_unreliable` |
| RPT-DAILY-15 | Include Resp. Party Type column on Daily Journal Detail | P1 | S | DATA-53 | With the option ticked every line of an account with a type prints it; self-guarantor accounts print it after DATA-53; before it the run warns `resp_party_type_missing` |
| RPT-DAILY-16 | Production Report definition on `report_by` (code / provider / category / carrier), Summary and provider Detail, GROUP BY provider / carrier, PROVIDERS / SORT BY dynamic controls, true-ratio totals, title templates | P1 | L | DATA-04, DATA-06, ENG-11, ENG-23, ENG-31 | Fixture run reproduces the three documented layouts; `Per %` of a provider subtotal = provider / grand total; total `Eff. Rate $` = total charges / total duration; the nine parity rules pass their vectors |
| RPT-DAILY-17 | Production compare-fee column: `include_ucr`, `compare_fee_schedule_id` (fee in force on the service date), Z-code rule, `include_office_ucr` enhancement | P1 | S | DATA-51, FLT-06 | For a schedule with two dated entries of one code the compare column equals count x the fee in force on each service date; Z codes drop only when UCR is on and Include Z-Codes is off |
| RPT-DAILY-18 | Production by Carrier carrier resolution (charge stamp, claim family carrier, current coverage, No Insurance) with `carrier_source` counts and availability code NEW `carrier_from_current_coverage`; switch to stamped carrier after DATA-33 | P1 | M | DATA-21, DATA-33 | Every charge lands in exactly one carrier row; the warning prints the count per source; after DATA-33 new charges resolve from the stamp |
| RPT-DAILY-19 | Production adjustment lists per office / provider / carrier / report end on the legacy Sub Type (carrier of an adjustment from `rpt_adjustments.carrier_id`, else the target charge's carrier, `Carrier not recorded` for unresolved migrated legs), `Unclassified adjustments` line, bridge test to `production_adjustments` | P1 | S | DATA-03, DATA-12, RPT-DAILY-07 | List total minus `production_adjustments` equals the bridge (collection-side write-offs minus non-income production classes) on the fixture; zero after the O-2 seed; under GROUP BY Carrier the per-carrier lists sum to the office list |
| RPT-DAILY-20 | Collection Report definition: Detail / Summary for COLLECTION BY none / provider / carrier, payment-code filter, collection adjustments, `collection_summary` block, `Unassigned provider` member, variant titles, adjustment bridge | P1 | L | DATA-03, DATA-06, ENG-11, ENG-23, RPT-DAILY-03 | Fixture day: payments with `counts_as_collection` sum to `-gross_collections`; the adjustment list minus `collection_adjustments` equals the bridge of RPT-DAILY-07 (zero once O-2 is seeded); unticking Include Adjustments removes the Adjust column, lines and section and the footer note |
| RPT-DAILY-21 | Collection Report by Code on allocations: P1 inline run of `rpt_fifo_allocations()` narrowed to the accounts with a credit in scope (office scope, range, payment codes, collection adjustments only when included; 31-day cap, `max_rows_inline`, `report_too_large_for_inline` above), `# Perf` = charges performed in the range, `UCR` on ADA codes only; P2 switch to `rpt_payment_allocations` and background escalation (ENG-38); pseudo rows Unallocated / Refunded / Opening balance or transfer | P1 | M | DATA-20, ENG-59 | `SUM(payments + ins_pay)` of `by_code` equals the payment total of the same parameters (R-08) and `SUM(adjust)` the collection-adjustment credit total; a production write-off on the same account adds nothing; a 40-day range is refused with `report_too_large_for_inline`; the derived-allocation note prints when derived rows exist; the P2 run reads the table and gives the same totals |
| RPT-DAILY-22a | Collection by Carrier in P1: carrier from remittance legs (`rpt_payments.carrier_id`) and `rpt_claim_facts`, `Patient` and `Carrier not recorded` members, `carrier_on_payment_missing` warning | P1 | S | DATA-21, RPT-DAILY-20 | Every payment lands in one member; app remittances carry their carrier; patient payments land in `Patient`; the warning counts insurance payments without a carrier |
| RPT-DAILY-22b | Collection by Carrier on the stamped carrier of `patient_payments` insurance checks after DATA-33 | P2 | S | DATA-33, RPT-DAILY-22a | A new insurance check posted after DATA-33 lands in its carrier member, not in `Carrier not recorded`; the warning count drops accordingly |
| RPT-DAILY-23 | Enhancement parameters of r01-r04 (`previous_office_day` token, `show_provider_recap`, `show_backdated_flag`, `exclude_zero_lines`, `production_groups`, `top_n`, `show_net_production`, `payer_types`, Collection `provider_ids` / `payment_types` / `carrier_ids` / `user_ids`) and the listed saved views | P1 | M | FLT-04, FLT-17, DATA-55, ENG-28 | Each enhancement has a default-off test proving the legacy default run is unchanged and a test of its effect; the saved views open with relative dates resolved per office |
| RPT-DAILY-24 | Prior-period comparison on Production and Collection Reports (`compare_to`, change columns) | P4 | S | FLT-26, ENG-32 | `previous_period` adds `charges_compare` / `payments_compare` equal to a run of the previous range; default `none` output byte-equal to the parity run |
| RPT-DAILY-25 | Row and bulk actions of r01-r04: open ledger, `create_task` (correct posting, enter duration, assign provider), `export_selection` | P3 | S | ENG-49, SEC-09 | Actions resolve ids from the snapshot; a caller without `phi_identified` sees none; each hand-off is audited |
| RPT-DAILY-40 | Deposit Slip definition and builder: sections by `deposit_group` (NULL as `none`), posting-office attribution, `check_type` on Check rows, `payer_display`, both date bases with the DATA-13 warning, display sign, GROUP BATCH CHECKS `Check#` mode (`GROUP BY office, date, payer, check_number, bank_number`) | P1 | M | DATA-03, DATA-06, DATA-13, RPT-DAILY-03, RPT-DAILY-04 | On the fixture day with all seven boxes ticked the Grand Total equals `-SUM(amount)` of live payment legs on the posting office; Cash-only default lists only `deposit_group = cash`; Insurance Checks drops the patient checks; before DATA-13 both bases return the same rows and the warning; with Group Batch Checks + `Check#` one cheque paying three claims prints one line and totals are unchanged |
| RPT-DAILY-41 | Deposit Slip PDF layout `deposit_slip`: per-section columns (Bank # / Check # only in Checks), date and payment-code subtotals, office header with address and phone, starred payer note | P1 | M | ENG-23, RPT-DAILY-02, RPT-DAILY-40 | A two-day run with Cash, Check and Credit Card renders the legacy block order, `Total Checks, <date>:`, `Total for <code> :`, `Grand Total For Checks:`, `Grand Total:`; a caller without `payment_instrument` gets the slip without Bank # / Check # |
| RPT-DAILY-42 | Group Batch Checks `Batch ID` mode on remittances (`remittance_id`, NEW `rpt_payments` column after DATA-28) with the interim `payment_group_key` and its `batch_grouping_heuristic` warning before DATA-28 | P2 | S | DATA-28, RPT-DAILY-40 | One insurance remittance paying three claims prints one line after DATA-28; before it, Batch ID mode groups by `payment_group_key` and prints the heuristic warning; totals unchanged by grouping |
| RPT-DAILY-43 | Deposit pack: `deposit_status` parameter and bulk action `create_deposit` over the snapshot | P2 | M | DATA-28, RPT-DAILY-40 | Undeposited view lists only rows without `deposit_id`; the action creates one deposit, is idempotent per run and entry, and a payment cannot land on two deposits (R-09) |
| RPT-DAILY-44 | Scheduled Production definition: three-sided outer join (booked lines, posted charges, goals) by office, day and provider; scheduled side on the line provider `rpt_appointment_procedures.provider_id` (fallback appointment provider); composite attributions `appointment_or_service_office` / `line_or_treating_provider`; enhancements `provider_kinds`, `show_variance`, `show_appointment_counts` | P1 | M | DATA-16, DATA-06, RPT-DAILY-04, RPT-DAILY-07 | Scheduled total and each provider row equal `scheduled_production` for the same parameters; a hygiene line booked under a doctor appointment counts for the hygienist; actual total equals `charged_production` with basis `transaction`; a cancelled appointment's lines drop out; a future day shows actual 0 |
| RPT-DAILY-45 | Estimated Prod.: read `provider_production_goals`, organisation setting `estimated_production_divisor` (`provider_working_days` default, `fixed_20`), working days from `rpt_provider_calendar_days()` | P1 | S | DATA-24, DATA-55, RPT-DAILY-44 | With a 22-working-day month and goal 44,000 a working day shows 2,000 under `provider_working_days` and 2,200 under `fixed_20`; no goal row prints empty, never 0, with `production_goals_missing` |
| RPT-DAILY-46 | Scheduled Production at start of day: optional `Sched. at start of day` column from the daily snapshot for past days | P4 | S | DATA-48, RPT-DAILY-44 | For a past day the column equals `scheduled_production_start_of_day`; the warning `past_book_is_current_state` disappears for days with a snapshot |
| RPT-DAILY-47 | Routing Slip definition: appointment selection (status, block, archive, patientless rules), Office Group disabled, sort options, slip index block, Print Blank Routing Slip branch, `schedulable: false` | P1 | M | DATA-16, ENG-05, RPT-DAILY-01 | Default run for a fixture day returns one index row per live appointment of the working office in `sort_by` order; a cancelled and a block appointment get no slip; blank mode runs no data query and prints one empty form |
| RPT-DAILY-48 | Routing Slip section builders: patient info, alerts, notes, scheduled and next appointment (both REPORT BY modes), visits, preferred, responsible party, billing with aging grid, two carriers with benefit remainders, ortho, flash alerts; P1 reads per-patient services for recall (Recalls block and REPORT BY recall), referral counters (`referrals` count, `referral_counters_unreliable`), benefit and ortho blocks, and switches to `rpt_recall_due()` (DATA-41) and `rpt_referral_facts` (DATA-40) in P3; `OP:` from `operatory_label` (DATA-16) | P1 | L | DATA-16, DATA-19, DATA-20, DATA-21, DATA-52, DATA-53, RPT-DAILY-47 | Each field of the legacy sample is filled for the fixture patient or blank with its availability code; REPORT BY recall prints Date, Time, Prdr of the next booked recall; the aging row `Account Balance` equals the account ledger balance; `Sub ID` is absent for a caller without `phi_sensitive`, alert boxes without `clinical` |
| RPT-DAILY-49 | Routing Slip procedure area resolver: Recommended order (appointment codes, `provider_route_slips`, accepted then diagnosed items), Active Treatment Plan, Codes, Include Completed Procedures with the appointment-line completion rule (linked plan item completed, or a live charge with same patient, code, tooth, surface on the appointment date) | P1 | M | DATA-56, RPT-DAILY-47 | Fixture vectors: appointment with lines prints its lines; without lines prints the provider defaults; a patient with accepted and diagnosed items prints only the accepted ones; ticking Include Completed adds completed items and a posted appointment line marked C; unticked, the posted appointment line is not listed |
| RPT-DAILY-50 | Routing Slip PDF layout `slip`: one slip per page, `OP:` top right, sectioned page numbers, volumes of 200, blank form, per-patient print audit | P1 | L | ENG-23, ENG-14, RPT-DAILY-48 | A 60-appointment day renders 60 slips in under the interactive limit; a 450-slip week runs in background as three volumes; the audit holds one print event per patient |
| RPT-DAILY-51 | Routing Slip entry points: Scheduler (current appointment / day at this location / all locations) and Patient Overview through `appointment_ids` / `patient_ids` drills (after the open-question decision) | P1 | S | RPT-DAILY-47, UX hub runner | Right-click Print in the Scheduler produces the same slip as the report for that appointment; the hidden `appointment_ids` parameter is echoed |
| RPT-DAILY-52 | Progress Notes definition: variants `detail`, `unsigned`, `missing` (two blocks), basis bindings per variant, d01 rule, `page_break_by` patient level with `role: query`, per-variant key class | P1 | M | DATA-18, FLT-20, RPT-DAILY-05 | Detail lists every note of the range; Unsigned excludes signed, struck-off and migrated notes; Missing returns one row per appointment without a note (ALL: every appointment with flags); a caller without `clinical` is refused Detail and runs Missing |
| RPT-DAILY-53 | Server-side note text decoder (Python twin of `noteContent.ts` for the legacy double-escaped `notes_html`) with shared test vectors, used by PDF, XLSX and CSV | P1 | S | RPT-DAILY-52 | The same fixture notes render identical plain text in the Progress Notes screen and in the PDF; no `~^^~` marker or escaped entity appears in any export |
| RPT-DAILY-54 | Progress Notes actions and schedules: Review and sign / Write note navigation, Remind authors tasks, staff message handler, `skip_if_empty` schedules for Unsigned / Missing | P1 | S | ENG-30, SEC-09, RPT-DAILY-52 | A bulk reminder creates one task per author listing that author's notes; a scheduled Missing run with no rows sends nothing; a navigation lands on the note only with the feature right |
| RPT-DAILY-55 | Live verification of the r05-r08 specifics: Deposit Slip None payer mode, Cash layout, batch output; Scheduled Production layout, bases, provider meaning and goal source; Routing Slip procedure columns, completed-line meaning, recall-mode block, `Lst Ref Amt`; Progress Notes Unsigned / Missing layouts, the Unsigned greying and the meaning of each date basis per variant | P1 | S | RPT-DAILY-09 | Every open question of the four sections has a recorded answer with a screenshot reference and the decisions file is updated through its owner |
| RPT-DAILY-70 | Production Analysis Report definition: one format `standard`, blocks `category_mix` + `office_category_totals` (`visible_when report_by = category`) and `carrier_mix` + `carrier_patients` (`visible_when report_by = carrier`) with `row_id_column`; denominators office-wide (INFERRED); enabled rules of CATEGORY / CARRIER; drills to Special Transaction Report with `production_only` | P1 | M | DATA-04, DATA-06, DATA-18, DATA-21, ENG-11, ENG-30, RPT-DAILY-01, RPT-DAILY-02 | On the fixture month the `office_amount` total of the category blocks equals `charged_production` (service basis) for the office; each provider's first % sums to 100.00 %; clicking a category cell (with `credit_hygienist` off) opens Special Transaction rows whose AMOUNT sum equals the cell, also for a category holding `ACBIL`; the Practice Group $ behaviour under a provider filter follows the answer to open question 8 |
| RPT-DAILY-71 | Carrier attribution of the Production Analysis carrier format: carrier of a charge (DATA-33 stamp, else today's primary dental slot), claims-created date with submitted-date proxy, `Carrier not recorded` row, availability codes `carrier_from_current_coverage`, `claim_created_date_proxy` | P1 | S | DATA-21, DATA-33, RPT-DAILY-04 | Fixture: a patient seen twice with one carrier counts once; the carrier block's collections total equals `insurance_collections`; a migrated claim is counted by its sent date and the run prints the proxy warning |
| RPT-DAILY-72 | Daily Audit definition on `rpt_visit_audit()`: population, OR-of-ticked exception predicate, one provider set for filter and GROUP BY (`coalesce(nullif(appointment_provider_ids || charge_provider_ids, '{}'), note_provider_ids)`, change owned by 03 section 2.17), auto page break, ✓ / X columns, all-clear state, availability codes `signature_test_app_only`, `visit_code_flags_unreviewed` | P1 | M | DATA-04, DATA-16, DATA-18, ENG-11, RPT-DAILY-08 | Every PATIENT HAS x BUT MISSING combination of the DATA-18 fixture returns the expected rows; a day worked by a hygienist and a dentist appears under both providers with all four flags whole-day; a note-only day prints under its author grouped and also when filtered by that author; a posted non-visit code leaves `Ledger Transaction` = X; an empty run renders all clear and counts as empty for `skip_if_empty` |
| RPT-DAILY-73 | Appointment status rule of the audit (cancelled and no-show excluded unless `include_resolved_appointments`) agreed with 03 and implemented as a `rpt_visit_audit()` argument | P1 | S | DATA-18 | A cancelled appointment without posting produces no row by default and one row with the option on |
| RPT-DAILY-74 | Daily Audit worklist actions: open patient / ledger / appointment / notes drills, bulk `create_task` and NEW `custom:internal_message` to the row providers | P3 | M | ENG-49, SEC-36, RPT-DAILY-72 | Selecting 5 rows of two providers sends two messages that list exactly those patients; a caller without `phi_identified` receives no patient drill |
| RPT-DAILY-75 | Claims Printed definition: formats `detail` / `summary`, carrier band and `Total for <carrier> [ n ] :`, pre-authorisations listed but outside money totals, void claims kept as Void, `only_not_marked_sent`, `show_each_print`, availability code `claim_prints_not_recorded_before` | P1 | S | DATA-21, ENG-11, RPT-DAILY-01 | After printing three claims of two carriers and one pre-auth on the fixture, Detail lists four rows under two carrier bands, money totals exclude the pre-auth and the carrier subtotal counts it separately; Summary shows the same totals; a range before the capture start prints the warning; `Sub ID` is dropped for a caller without `phi_sensitive` |
| RPT-DAILY-76 | Server-side claim print capture from the frontend: ADA direct print (`AdaClaimPrintModal.tsx`) and batch paper print post a print event to the DATA-21 endpoint through the generated client; the `localStorage` print log (`dentc:claim_print_log:v1:*`) becomes a read-once fallback and is retired | P1 | S | DATA-21 | Printing a claim from the modal creates one `claim_print_events` row with user, office and channel; a preview creates none; the claim's `print_count` and `last_printed_at` update; no new `localStorage` print-log key is written |
| RPT-DAILY-77 | Bulk action `custom:claims_mark_sent` from Claims Printed, delegating to the claims feature's send-status update | P2 | S | ENG-49, SEC-36, RPT-DAILY-75 | Marking two unsent printed claims sets them `sent` once (idempotent on re-click) and an `only_not_marked_sent` re-run no longer lists them |
| RPT-DAILY-78 | Freeze the Claims Printed and Production Analysis layouts against live legacy printouts (Claims Printed INFERRED; Production Analysis section layout and titles) | P1 | S | FLT-23, RPT-DAILY-09 | A printout of each format is recorded with a screenshot reference; column lists, titles and totals updated or a written waiver per difference |
| RPT-DAILY-79 | Special Transaction Report definition: procedure and payment / adjustment row sets with None / ALL semantics, all OTHER OPTIONS filters, four group-by levels with subtotals, vendor-doc Sort By, header criteria echo, flat legacy Excel order, availability codes for migrated codes and current coverage | P1 | L | DATA-03, DATA-06, DATA-12, DATA-13, DATA-21, FLT-07, ENG-11, ENG-23, ENG-27, RPT-DAILY-02 | Default run on the fixture day equals all charges of the day (`SUM(amount)` = `SUM(charged_fee)`) and no payments; adding one payment code adds exactly those payment legs; same name twice returns one patient; age gate 0-3 drops patients without DOB only when narrowed; each group-by value yields the documented header and subtotals |
| RPT-DAILY-80 | Option sources and unknown controls of the Special Transaction Report: `insurance_plans_and_subtypes` (typed `plan:<id>` / `subtype:<value>`), `payment_adjustment_codes` (`kind:code`, pseudo-value `payment:(none)`, system codes selectable in report pickers only - alignment with data_card 3.3 asked of 03), Amount operator list and the Code / Category reset behaviour confirmed on the live tool | P1 | S | FLT-06, FLT-07, FLT-23 | The pickers list plans with carrier and group number, the two subtypes, and every payment / adjustment code including `CASH`, `CHECK`, `CARD`, `ACH`, `unclassified`; an ALL run includes payment legs without a code under `Code: (none)`; `build_parity.py` shows no `unknown_legacy` left for r12 or a written waiver |
| RPT-DAILY-81 | Special Transaction enhancements: `code_counts` block, `age_basis`, `include_voided`, saved-view seeds (finance charges yesterday, sealants by age, one patient's payments) | P1 | S | RPT-DAILY-79, ENG-28 | `code_counts` totals equal the detail totals; `age_basis = row_date` changes membership of a patient whose birthday is inside the range; voided rows appear only with the option and the `user_activity` class |
| RPT-DAILY-82 | Bulk action `custom:payment_receipt` (per-patient payment receipt PDF from selected Special Transaction payment rows) | P3 | M | ENG-49, ENG-25, SEC-36, RPT-DAILY-79 | Selecting three payments of one patient produces one receipt PDF with those payments and their total; a selection spanning two patients is refused with a message |

<!-- ASSEMBLED from catalog/parts/daily_reports/ (00_header.md, 10_reports_01_04.md, 20_reports_05_08.md, 30_reports_09_12.md). Edit this document directly from now on. -->
