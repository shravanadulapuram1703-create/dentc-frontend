# Monthly Reports - report specifications

Month-end financial reports of the legacy Monthly Reports category (folder `montly_reports`, 9 reports, 108 legacy
controls of which 2 vendor-documented): management KPI summary, code-level day sheet, the two A/R ageing reports and the
five allocation reports used for provider pay. New home: hub area **Financial › Month-end**, category key `monthly`,
report keys `monthly.*`. Default phase **P2** (brief section 6); every report of the family ships in P2.

## Overview

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `monthly.executive_summary` | Executive Summary | One KPI block per office (optionally per provider): patients, visits, appointments, production, collections, adjustments, averages, referrals, MTD / YTD, optional A/R snapshot | P2 | L | READY | DOCUMENTED; GROUP BY Provider / Page Break layout INFERRED |
| `monthly.executive_day_sheet` | Executive Day Sheet | One row per transaction code (services, each production and collection adjustment code, each payment code) per office with Production / Collections / Adjustments / A. R. Impact | P2 | M | READY (one row per code on history: REPAIR(12)) | DOCUMENTED; closing total row unverified |
| `monthly.aging_report_by_home_office` | Aging Report by Home Office | A/R by responsible party, aged in buckets, split total / Ins / Pat, accounts filed under their home office, all transactions considered | P2 | L | READY (resp. party type SCHEMA(53), balance status SCHEMA(35), last statement date SCHEMA(22), past report date SCHEMA(30)) | DOCUMENTED (Detail); Summary and GROUP BY PROVIDER PARTIALLY DOCUMENTED |
| `monthly.aging_report` | Aging Report | Same layout, but only the transactions recorded in each selected office are aged against each other (transaction-office A/R) | P2 | M | READY (as above; ties to the per-office ledger balance, R-14b) | DOCUMENTED (Detail); Summary and GROUP BY PROVIDER PARTIALLY DOCUMENTED |
| `monthly.income_allocation` | Income Allocation | Per-provider receivable roll-forward of collections allocated to each provider's completed work; the basis of collection-based provider pay | P2 | L | READY (derived allocations; real allocations SCHEMA(26); entry-date basis on history REPAIR(10); `is_income` on history REPAIR(12)) | DOCUMENTED (Summary, formulas checked); PARTIALLY DOCUMENTED (Detail) |
| `monthly.allocation_detail` | Allocation Detail | Payments entered in the range with the procedures they were allocated to, by payment type, with an optional per-day recap | P2 | M | READY (derived; payment-type sections on history REPAIR(12)) | PARTIALLY DOCUMENTED; layout INFERRED |
| `monthly.unallocated_payment_adjustments` | Unallocated Payment/Adjustments | Payments and credit adjustments that are not applied to any charge, for correction of posting errors | P2 | M | SCHEMA(26) (meaningful only on persisted allocations; not reproducible for migrated history) | PARTIALLY DOCUMENTED; layout INFERRED |
| `monthly.daily_journal_summary_by_allocation` | Daily Journal Summary by Allocation | Daily-journal totals in which payments and collection adjustments are attributed by allocation instead of by entry | P2 | M | READY (derived) | INFERRED (no vendor description found) |
| `monthly.waterfall_report` | WaterFall Report | Collections broken down by month of date of service: service months as rows, months of application as columns | P2 | M | READY (derived) | PARTIALLY DOCUMENTED; layout INFERRED |

Phase note: Unallocated Payment/Adjustments is rated SCHEMA(26); DATA-26 is a P2 item, so the report stays in P2 but
cannot pass acceptance before DATA-26. Until then the definition is `status: beta` and prints the availability warning of
the next section.

## Shared rules

### Parameters every report of the family shares

| Parameter (value keys) | Type | Legacy control | Default | Family rule |
|---|---|---|---|---|
| `office_scope` (`office_ids`, `office_group_id`, `office_group_ids`, `all_offices`) | `office_scope` | OFFICE/GROUP radio + picker (all 9 reports) | `office_ids = working_office` (legacy `108` = the working office) | `scope.office_mode = required`. Office Group is enabled on every report. The office column it filters differs per report (attribution table below); every report prints one section per resolved office (`fixed_outer` level office) |
| `date_range` (`date_from`, `date_to`, `date_preset`) | `date_range` | DATE RANGE Start Date / End Date (7 reports: all but the two ageing reports) | `today` / `today` | Fixed `date_basis` per report (no basis radio on any Monthly report); inclusive, office-local. Presets and relative tokens are additive (filter card 12) |
| `report_date` | `date` | REPORT DATE (both ageing reports) | `today` | Role `as_of`: balances at the end of that office-local day |
| `provider_ids` | `entity_multi` | PROVIDER picker (Executive Summary, both ageing reports, Income Allocation, Allocation Detail) | `all` | The provider column differs per report (attribution table below). Never scoped by `providers.office_id`; pickers prefer the office roster, never exclude |
| `output_format` | `enum` | PRINT FORMAT (Executive Day Sheet, both ageing reports, Daily Journal Summary by Allocation, WaterFall) | `pdf` | `pdf`, `xlsx`, added `csv`. Role `output` except on the two ageing reports, where it is `query` (bucket member `over_120_plus`, rules d01). Reports without PRINT FORMAT (Executive Summary, Income Allocation, Allocation Detail, Unallocated) still export PDF / XLSX / CSV from the runner (the legacy viewer offered Excel / Word export on every report) |
| `report_format` | `enum` | REPORT FORMAT (both ageing reports, Income Allocation, Daily Journal Summary by Allocation) | `detail` | `detail` / `summary`; legacy default Detail on all four |

Ageing parameter block (identical on `monthly.aging_report_by_home_office` and `monthly.aging_report`, same keys and
defaults): `report_format`, `output_format`, `office_scope`, `group_by` (member `group_by.provider`, default `none`),
`provider_basis` (`preferred_provider`), `provider_ids` (`all`; both enabled only when `group_by == provider`),
`report_date` (`today`), `patient_type` (`both`), `responsible_party_name` (`AAAAA` / `ZZZZZ`),
`exclude_resp_party_type_codes` (`none`), `aging_by` (`account_ar`), `account_balance_over` (`0.00`, label follows
`aging_by`), `only_credit_balances` (`false`), `aging_buckets` (all five ticked, `predicate`; `over_120_plus` in Excel,
default not documented), `include_credit_balances` (`false`), `exclude_sent_to_collection` (`false`),
`exclude_insurance_expected_accounts` (`false`), `include_balance_status` (`false`), `include_contract_balances`
(`false`), `sort_by` (`responsible_party_last_name`). The two reports differ only in the allocation unit and the office
attribution - never in parameters.

Legacy actions on every screen: PRINT / PREVIEW -> `print` (run, preview on screen, render the chosen format); CLEAR
CRITERIA -> `frontend` (reset to defaults); ADD TO MY FAVORITES -> `saved_view` (save view + favorite).

### Datasets, date bases and attribution

| Report | Datasets | Fixed `date_basis` (04 7.2) | Office attribution (03 5.1) | Provider attribution (03 5.2) |
|---|---|---|---|---|
| Executive Summary | `rpt_charges`, `rpt_ledger_entries`, `rpt_visits`, `rpt_provider_visits`, `rpt_appointment_facts`, `rpt_patient_activity`, `rpt_patient_dim`, `rpt_provider_dim`, `rpt_ar_open_items()` | `transaction_date` (documented); MTD / YTD from `date_to`; new patients: created date and first visit date | per figure: office of service (production, visits), transaction office (payments, adjustments), appointment office, home office (new patients), unit `account_office` (A/R block) | per figure, inferred: treating (`rpt_charges.provider_id`), provider of a visit (`rpt_provider_visits.provider_id`), appointment provider, provider on the ledger leg |
| Executive Day Sheet | `rpt_ledger_entries` (`journal_column`), `rpt_transaction_code_dim` | `transaction_date` (inferred, PD-8) | transaction office | none (no provider control) |
| Aging Report by Home Office | `rpt_ar_open_items()` unit `account`, `rpt_account_dim`, `rpt_patient_dim`, `rpt_patient_activity`, `rpt_contract_installments` | none; `report_date` as of | home office `rpt_account_dim.home_office_id` | `provider_basis`: preferred (`rpt_patient_dim.preferred_provider_id`, fallback `rpt_patient_activity.last_visit_provider_id`) or transaction (`rpt_ar_open_items.provider_id`) |
| Aging Report | same, unit `account_office` | none; `report_date` as of | transaction office (`unit_office_id`) | as above |
| Income Allocation | `rpt_payment_allocations`, `rpt_ledger_entries`, `rpt_provider_dim` | `created_date` of the credit (documented) | allocation office `allocation_office_id` | allocation provider `allocation_provider_id`; `Unallocated` = `method = 'unallocated'` |
| Allocation Detail | `rpt_payment_allocations`, `rpt_payments` | `created_date` (documented) | allocation office (implied) | allocation provider (implied) |
| Unallocated Payment/Adjustments | `rpt_payment_allocations`, `rpt_account_dim`, `rpt_patient_dim` | `created_date` (inferred) or as of today | credit office `credit_office_id` (inferred) | none (no provider control) |
| Daily Journal Summary by Allocation | `rpt_ledger_entries`, `rpt_payment_allocations` | `transaction_date` (inferred) | charges by transaction office, credits by allocation office (inferred) | allocation provider (inferred) |
| WaterFall Report | `rpt_payment_allocations`, `rpt_charges` | `service_date` of the paid debit (documented); columns by `allocation_date` | allocation office (inferred) | none (no provider control) |

Family rules on the data:

| Rule | Detail |
|---|---|
| Allocations are derived until DATA-26 | Every allocation report (Income Allocation, Allocation Detail, Unallocated, Daily Journal Summary by Allocation, WaterFall) reads `rpt_payment_allocations`; derived rows (`is_derived = true`) print the run warning "allocation derived (oldest first)". Derived results do not reproduce a legacy print line by line, and on derived rows `Unallocated` equals the credit balances |
| Two ageing units | Aging Report = unit `account_office`, Aging Report by Home Office = unit `account`. They are two units, not two groupings of one result (03 2.14): the transaction-office figure of each office equals its ledger balance (R-14b); the home-office total equals organisation A/R (R-05) |
| Bucket set | Legacy bucket set of `rpt_aging_bucket_sets` (`legacy`: Current 0-29, Over 30 30-59, Over 60 60-89, Over 90 90-119, Over 120 120+, the article definition); the boundary day is printed in the criteria echo. The glossary variant (0-30) is a one-day difference to confirm on the live tool |
| Created-date basis | Income Allocation, Allocation Detail and Unallocated select credits by `credit_created_date`. Migrated money rows carry the load timestamp until the created-date restore (REPAIR(10)); a range before the tenant's migrated-through date prints an availability warning |
| Live, not frozen | A past `report_date` and any allocation run is recomputed from today's rows; month-end figures reproduce only from day close and snapshots (DATA-29, DATA-30). Pay runs read the frozen copy once those exist |
| Unassigned members | NULL `office_id` = "Unassigned office" (organisation totals only for callers who may see all offices); NULL `allocation_provider_id` = "Unassigned provider", which is never the `Unallocated` row |

### Sign conventions and page furniture

| Topic | Rule |
|---|---|
| Signs | Amounts are signed as in `rpt_ledger_entries`: charges and debit adjustments positive, payments and credit adjustments negative (legacy prints payments negative: A/R reduction). Executive Day Sheet: `$` and parentheses for negatives (`format.negative = parentheses`, `symbol = $`); every other report: leading minus, no currency symbol. Two decimals, ROUND_HALF_UP once in banding |
| Production versus journal columns | Day-sheet and journal columns follow `journal_column` (legacy Sub Type), so production adjustments print with charges and contract billing prints in Adjust; analytic totals use `ledger_bucket` (03 2.12) |
| Header | Organisation name, printed title (`title_templates[]`: e.g. `Aging Report - Detail`, `Aging Report by Home Office - Detail`, `Income Allocation Report - Summary`), band `Office : <office name>` per office |
| Footer | `criteria_echo = footer`: From / Thru (or Report Date), Office(s), Providers (`ALL` default), report flags (`* Show AR.`, `* Includes accounts with Credit Balances.`, `Ex Resp Party Type : NONE`, `Aging : Current Over30 ...`, `Account Balance Over : 0.00`), then title, `Printed : <office-local datetime>`, `By : <user>`, `Page : n of m` |
| Availability warnings | Printed in the criteria block and returned as run warnings (`availability[]`): derived allocations, created dates of migrated rows, missing responsible-party type (DATA-53), balance status (DATA-35), last statement date (DATA-22), as-of recomputation (DATA-30) |

### Rights and data classes

| Topic | Rule |
|---|---|
| Right family | `monthly`: `reports_monthly_reports_screen_view_only` (run, view, drill, private views) / `reports_monthly_reports_screen_full_control` (also print, PDF export, schedules). XLSX / CSV export also needs `reports_export_data_files`; schedules `reports_schedule_own`. No per-report override (security card 2.3) |
| Provider restriction | `scope.provider_restriction = none` on all 9 (legacy: any provider could be picked; `reports_view_all_providers` is granted to holders of `monthly`) |
| Office scope | `office_scope` is resolved by the engine to the offices the caller may read; `all` never widens rights (AD-7) |
| Data classes | Office and code totals: `financial_practice`. Rows or group keys naming a provider with money (Income Allocation Summary, Executive Summary by provider, allocation provider groups): `provider_comp`. Account and patient rows (ageing Detail, Allocation Detail, Unallocated, Daily Journal Summary Detail, Income Allocation Detail): names, ids, phones `phi_identified`, amounts `financial_patient`. Check numbers and card data on allocation lines: `payment_instrument`. Counts, code labels, office labels: `aggregate`. `responsible_party_name` needs `phi_identified` to be set (rule 8) |
| Audit | Every run, print and export is audited with parameters, row count and the patient manifest (ageing Detail, Allocation Detail, Unallocated and the Detail formats carry patients) |

### Family-wide enhancements (additive, defaults unchanged)

| Enhancement | Detail |
|---|---|
| Filter card 12 set | Date presets and relative tokens, multi-office and `my_offices`, searchable pickers, criteria chips, saved views, URL state, restore last run, CSV export |
| Drill-through | Ageing account row -> account ledger (`ledger.ledger_report`, `report_type = account_ledger`); Income Allocation provider row -> Detail format filtered to the provider (`kind = rows`); Executive Summary figures -> the underlying reports (`daily.production_report`, `daily.collection_report`, `monthly.aging_report`, `lists.patients_seen`); Unallocated row -> account allocation (`ledger.account_allocation`). Drill rights per 08 |
| Background runs | Tenant-wide allocation and ageing runs are `cost_class = background` (03: tenant-wide FIFO is a background job); single-office runs escalate by row estimate |
| Schedules | All 9 are `schedulable` (no patient-context default); month-end runs delivered by login-gated link (PD-12); `empty_when` = `total_is_zero` on the Executive Summary and Executive Day Sheet, `no_detail_rows` elsewhere |
| Frozen month-end | After DATA-29 / DATA-30 a run whose range or report date lies in a locked period reads the snapshot and prints "frozen as of <close date>" |

### Family-wide open questions (to confirm on the live legacy tool)

| # | Question |
|---|---|
| 1 | Is a consolidated all-offices block appended to multi-office runs of the Executive Summary and the day sheet, or only one block per office? |
| 2 | Which provider column each Executive Summary figure is limited by when providers are selected |
| 3 | Bucket boundary day (0-29 article versus 0-30 glossary) on both ageing reports |
| 4 | Default state and tooltip of `Over 120+` with PRINT FORMAT = Excel, and whether it exists on Aging Report |
| 5 | Ageing with a Provider selection: are whole accounts or only that provider's items listed; how Preferred Provider is chosen for a multi-patient account |
| 6 | Layout of Summary format and GROUP BY PROVIDER output on the ageing reports |
| 7 | Income Allocation: office of the `Unallocated` row; dating of charges and production adjustments in the roll-forward; Detail layout |
| 8 | Allocation Detail and Unallocated: office and provider attribution of the selectors; whether credit adjustments are listed under PAYMENT TYPES |
| 9 | Daily Journal Summary by Allocation: complete output layout and date basis (no vendor material exists) |
| 10 | WaterFall: matrix orientation (calendar months or lag buckets), column window, whether write-offs count under "Adjustments only" |

<!-- WORK-ITEMS -->
| RPT-MONTHLY-01 | Register the `monthly` category: 9 definitions with `legacy_names[]` (including the old menu names: Aging - Detail / Summary, Aging by Provider, Aging by Home Office with Balance Status, Income Allocation - Detail / Summary, Allocation Report, Unallocated Payments/Adjustments Report), right family `monthly`, hub area Financial › Month-end, shared header / footer / criteria echo | P2 | S | ENG-03, ENG-05, ENG-23, SEC-03, SEC-04, FLT-18 | catalog search by every legacy and old name finds the report; a View Only holder can run but not print or export; the footer echo of a default run lists From, Thru, Office(s), Providers : ALL |
| RPT-MONTHLY-02 | Shared ageing builder for both units (`account`, `account_office`) with the full ageing parameter block, three-line account block (total / Ins / Pat), `Total Accounts with A/R` and grand totals | P2 | L | DATA-20, DATA-27, DATA-53, DATA-35, DATA-22, DATA-37, FLT-01, FLT-14, ENG-11 | vendor example (charge 100 at A, payment 100 at B) gives A = 100 and B = -100 with credits included on Aging Report and no row on Aging Report by Home Office; per-office totals equal the ledger balance (R-14b); home-office total equals organisation A/R (R-05) |
| RPT-MONTHLY-03 | Excel bucket extension: member `over_120_plus`, `output_format` role `query` on both ageing reports, extended bucket set Over 120 / 150 / 180 / 270 / 365 with Est. Ins / Est. Pat triples | P2 | S | RPT-MONTHLY-02, DATA-27, ENG-27, FLT-05, FLT-15 | switching PDF -> Excel shows Over 120+ in place of Over 120, keeps the ticked state and re-runs; the xlsx carries the five extended triples; PDF never shows them |
| RPT-MONTHLY-04 | Allocation reading layer for the five allocation reports: attribution columns (allocation office / provider, credit office), `credit_created_date` basis, Unallocated semantics, derived-allocation warning | P2 | M | DATA-26, DATA-13, DATA-10, ENG-59 | R-08 holds per office and period (by provider + unallocated + refunded + opening / transfer = payments); a payment entered Feb 1 back-dated to Jan 15 falls in February; derived runs print the warning |
| RPT-MONTHLY-05 | Code-row day-sheet rendering shared by Executive Day Sheet and Daily Journal Summary by Allocation: every configured code printed also at 0.00, ordered services / production adjustments / collection adjustments / payments, signed A. R. Impact | P2 | M | ENG-24, DATA-03, DATA-12, FLT-07 | a range without activity still prints every active code at 0.00; Σ A. R. Impact equals the office's ledger movement of the range; migrated adjustments print on the unclassified row until DATA-12 |
| RPT-MONTHLY-06 | Availability and era warnings of the family (`availability[]`): created dates of migrated rows, derived allocations, missing resp. party type, balance status, last statement date, as-of recomputation | P2 | S | DATA-02, ENG-03, MET-06 | each warning appears in the run response and the PDF criteria block exactly when its condition holds for the resolved range and offices |
| RPT-MONTHLY-07 | Parity default tests and live verification list: the 108 controls of `catalog/parity/montly_reports.parity.json` and rules d01 / d02 of both ageing reports; checklist of the INFERRED items for the live legacy tool | P2 | S | FLT-20, FLT-23, ENG-18 | a run with untouched defaults resolves to the parity defaults for all 9 reports; the lint finds every legacy control mapped; the checklist lists the open questions of this document with an owner |
| RPT-MONTHLY-08 | Cross-report reconciliation tests: Executive Summary Show AR = Aging Report total (single day, credits included); Income Allocation `Income` components = Allocation Detail totals; Unallocated grand total (as of today) = Income Allocation `Unallocated` row; WaterFall row totals = allocated credits of the service month | P2 | M | DATA-09, ENG-17, RPT-MONTHLY-02, RPT-MONTHLY-04 | the four identities pass on the `golden_small` fixtures for both eras and are wired as `reconciles_with` where a metric exists (`total_ar`, `provider_income`) |
| RPT-MONTHLY-09 | Background runs, month-end schedules and frozen periods for the family: `cost_class` and `escalate_when`, `empty_when`, snapshot read for locked periods | P2 | M | ENG-38, ENG-43, ENG-44, DATA-29, DATA-30, MET-12 | a tenant-wide ageing or allocation run goes to the worker and completes; a monthly schedule delivers a login-gated link; a month-end ageing re-run after a later edit returns the frozen figures |
<!-- /WORK-ITEMS -->
