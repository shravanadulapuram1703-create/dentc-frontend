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
| `daily.collection_report` | Collection Report | Payments of the range with collection adjustments, by provider, carrier or code | P1 | L | READY (by Code: derived allocations, P2; by Carrier: APP / SCHEMA(33); payment-type picker on history: REPAIR(12)) | PARTIALLY DOCUMENTED |
| `daily.deposit_slip` | Deposit Slip | Payments of the range by tender section (cash, check, card, financing) to prove the bank deposit | P1 | M | READY (Payment Date basis: SCHEMA(13); Group Batch Checks: SCHEMA(28); tender on history: REPAIR(12)) | DOCUMENTED |
| `daily.scheduled_production` | Scheduled Production | Scheduled versus actual production and estimated (goal) production for current and future days | P1 | M | APP (migrated booked lines cover 6 % of appointments; Estimated Prod.: SCHEMA(24)) | PARTIALLY DOCUMENTED |
| `daily.routing_slip` | Routing Slip | One face sheet per appointment: demographics, alerts, recalls, visits, billing and aging, coverage, ortho plan, procedures | P1 | XL | READY (Billing Type: SCHEMA(53); first / last visit: REPAIR(19); last statement: SCHEMA(22); ortho block: APP) | DOCUMENTED |
| `daily.progress_notes` | Progress Notes | Notes of the range (Detail), unsigned notes, or appointments without a note | P1 | M | READY (Unsigned: APP; Missing exact per appointment and provider: SCHEMA(18)) | PARTIALLY DOCUMENTED |
| `daily.production_analysis_report` | Production Analysis Report | Production mix by ADA category per provider, or production and collection per patient by carrier | P1 | M | READY (Carrier variant: REPAIR(10), SCHEMA(33); collection per carrier: APP) | DOCUMENTED (columns in text) |
| `daily.daily_audit` | Daily Audit | Exception list of patient-days with an appointment, ledger transaction or note but missing another; empty = all clear | P1 | M | READY (visit-code flags reviewed in setup, DATA-04; signed-note test: APP) | DOCUMENTED (columns in text) |
| `daily.claims_printed` | Claims Printed | Paper claims printed in the range, by carrier, detail or summary | P1 | S | SCHEMA(21) (prints are not recorded today; APP afterwards) | INFERRED |
| `daily.special_transaction_report` | Special Transaction Report | Filtered finder over procedure, payment and adjustment lines by provider, user, plan, patient range, age and amount | P1 | L | READY (codes on history: REPAIR(12); Service vs Transaction date on charges: SCHEMA(13); plan grouping on today's coverage until SCHEMA(33)) | DOCUMENTED |

Phase notes. No report needs a phase override: `daily.claims_printed` depends on DATA-21 (P1) and lists only prints
recorded after it lands (availability code, below); the P2 parts (Collection Report by Code on derived allocations,
Deposit Slip deposit date and batch grouping, by-Carrier variants on DATA-33) ship as availability warnings on the P1
definitions, not as later reports. INFERRED outputs (Peg Board Day Sheet, Claims Printed) need a product decision and a
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
| Peg Board Day Sheet | `rpt_ledger_entries`, `rpt_patient_dim`, `rpt_account_dim` | `transaction_date` = `report_date` | transaction office | ledger-line provider (`rpt_ledger_entries.provider_id`), inferred | - |
| Daily Journal | `rpt_ledger_entries` (`journal_column`), `rpt_charges`, `rpt_patient_dim`, `rpt_account_dim`, `rpt_user_dim`, `rpt_transaction_code_dim` | `date_basis` (default `transaction_date`) | transaction office | ledger-line provider (Prdr) | `user_key` |
| Production Report | `rpt_charges`, `rpt_adjustments`, `rpt_procedure_code_dim`, `rpt_provider_dim`, `rpt_claim_facts`, `rpt_insurance_coverage`, `rpt_fee_schedule_fees` | fixed `transaction_date` (posting date; equals service date on charges until DATA-13) | office of service | treating provider (`rpt_charges.provider_id`) | - |
| Collection Report | `rpt_payments`, `rpt_adjustments`, `rpt_payment_allocations` | fixed `transaction_date` | transaction office (where applied) | credited provider on the payment (`rpt_payments.provider_id`); by Code: allocation (P2) | - |
| Deposit Slip | `rpt_payments`, `rpt_transaction_code_dim` | `date_basis` (default `transaction_date`) | posting office | credited provider on the payment | `user_key` |
| Scheduled Production | `rpt_appointment_facts`, `rpt_appointment_procedures`, `rpt_charges`; `provider_production_goals` (NEW, DATA-24) | `appointment_date` (scheduled), `transaction_date` (actual), inferred | appointment office / office of service | appointment provider / treating provider, inferred | - |
| Routing Slip | `rpt_appointment_facts`, `rpt_patient_dim`, `rpt_patient_activity`, `rpt_account_dim`, `rpt_ar_open_items()`, `rpt_insurance_coverage`, `rpt_benefit_usage()`, `rpt_recall_due()`, `rpt_contract_installments`, `rpt_treatment_item_facts`, `rpt_patient_alerts`, `rpt_referral_facts`, `patient_notes`, `provider_route_slips` | `appointment_date` | appointment office | appointment provider | - |
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
| Classes used | `phi_identified` (patient name, id, chart number, DOB, service facts on a patient row); `financial_patient` (money on patient / account / claim rows); `financial_practice` (totals by office, code, category, carrier, period; UCR and compare-fee columns); `provider_comp` (production or collections by a named provider: Production Report by Provider, Production Analysis by provider, Collection Report by Provider); `payment_instrument` (Deposit Slip `Bank #`, `Check #`); `phi_sensitive` (Routing Slip `Sub ID`); `clinical` (Progress Notes text, Routing Slip `Med Alerts`); `aggregate` (code, category, carrier, office labels; user labels as operational attributes, rule 12) |
| Parameters | `patient_ids` (Routing Slip) and `patient_name` (Special Transaction Report) need `phi_identified` (rule 8) |
| Provider restriction | `scope.provider_restriction = none` on all twelve (the restricted twins are My Reports); `reports_view_all_providers` is not needed to pick providers here |
| Audit | Every run, print and export writes the audit event and patient manifest (AD-7, ENG-14); the per-patient documents (Routing Slip) are print-audited per patient |

### Family-wide enhancements (additive; defaults unchanged)

| Enhancement | Detail |
|---|---|
| Date presets | `today`, `yesterday`, `tomorrow` (Routing Slip, Scheduled Production), `next_7_days`, month to date (filter_card 12) |
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

<!-- WORK-ITEMS -->
| RPT-DAILY-01 | Register the `daily` category: 12 definitions with `legacy_names`, `legacy` pointer, `right_code` family `daily`, phase P1, hub section Financial › Daily | P1 | S | ENG-05, ENG-18, SEC-01, SEC-03 | The catalog lists the 12 reports for a holder of `reports_daily_reports_screen_view_only` and none for a caller without it; the definition lint loads `catalog/parity/daily_reports.parity.json` and passes for all 12 |
| RPT-DAILY-02 | Family page furniture: `title_templates`, Office band (`fixed_outer` when multi-office), footer criteria echo with starred option notes, Printed / Page n of m; header echo for Special Transaction Report | P1 | M | ENG-23, ENG-24, ENG-25, FLT-18 | A two-office PDF of Daily Journal, Production Report and Deposit Slip shows one Office band per office, the variant title and every non-default criterion in the footer; Special Transaction Report shows it at the top |
| RPT-DAILY-03 | Shared ledger-line pieces: `journal_column` column mapping, display sign rules (Deposit Slip positive), the Est. Pat. / Est. Ins. / Total summary block builder reused by Daily Journal, Peg Board Day Sheet and Collection Report | P1 | M | DATA-03, DATA-06, ENG-11 | On the fixture day a production adjustment prints in Charges, a contract-billing charge in Adjust, payments negative (positive on Deposit Slip); the summary block total equals `SUM(amount)` of the same rows |
| RPT-DAILY-04 | Attribution and availability declarations: `scope.office_attribution`, `provider_attribution`, `date_basis` per the family table; `availability[]` codes for created date, user and codes on migrated rows, payment date = transaction date until DATA-13, prints before DATA-21 | P1 | S | DATA-02, DATA-12, DATA-13, DATA-21 | A run whose range touches migrated rows returns the matching warnings and prints them in the criteria block; each definition serves exactly one office and one provider attribution |
| RPT-DAILY-05 | Rights and data classes of the 12 definitions (key class `clinical` on Progress Notes, `payment_instrument` on Deposit Slip, `provider_comp` on provider dimensions) and the P1 security review | P1 | S | SEC-07, SEC-24 | A caller without `clinical` is refused Progress Notes with 403 `data_class_denied`; a caller without `payment_instrument` gets the Deposit Slip without Bank # / Check #; lint finds no unclassified column |
| RPT-DAILY-06 | Parity tests: default run of every report equals the legacy default criteria; the 19 dynamic rules as expression test vectors | P1 | M | FLT-20, ENG-04, ENG-06 | FLT-20 passes for all 154 controls; each rule of the parity file has a vector that toggles its parameter and checks enabled / visible / forced / label state in Python and TypeScript |
| RPT-DAILY-07 | Reconciliation of family totals with the metric registry (`reconciles_with`) | P1 | M | DATA-09, ENG-32 | On the fixture and the UAT database Production Report totals equal `charged_production` + `production_adjustments` = `net_production`, Collection Report totals equal `gross_collections` / `net_collections`, Scheduled Production equals `scheduled_production`, for the same parameters |
| RPT-DAILY-08 | Drill-through and exception states: totals to `rows`, patient rows to ledger / note / claim / appointment records; "all clear" empty state for Daily Audit, Progress Notes Unsigned / Missing, Claims Printed | P1 | M | ENG-30, SEC-09 | Clicking a Production Report code total opens the detail rows that sum to it; a patient row opens the record only with `phi_identified` and the feature right; an empty Daily Audit run renders the all-clear state and counts as empty for `skip_if_empty` |
| RPT-DAILY-09 | Live legacy verification pass for the family: the family open questions and the per-report `unknown_legacy` controls (Fee Schedule To Compare default, Amount list, Insurance Plans/Sub Types dialog) and the unseen states (Production Report Category / Carrier, Progress Notes Unsigned, Show AR) | P1 | S | FLT-23 | Every item has a recorded answer with a screenshot reference; parity decisions updated and `build_parity.py` prints PARITY VALID with no `unknown_legacy` left in the category, or a written waiver per item |
<!-- /WORK-ITEMS -->
