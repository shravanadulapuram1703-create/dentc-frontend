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
legacy default not documented, ours ticked [I]), `include_credit_balances` (`false`), `exclude_sent_to_collection` (`false`),
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
| Aging Report by Home Office | `rpt_ar_open_items()` unit `account`, `rpt_account_dim`, `rpt_patient_dim`, `rpt_patient_activity`, `rpt_payment_plan_contracts` | none; `report_date` as of | home office `rpt_account_dim.home_office_id` | `provider_basis`: preferred (`rpt_patient_dim.preferred_provider_id`, fallback `rpt_patient_activity.last_visit_provider_id`) or transaction (`rpt_ar_open_items.provider_id`) |
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
| Bucket set | Legacy bucket set of `rpt_aging_bucket_sets` (`legacy`: Current 0-29, Over 30 30-59, Over 60 60-89, Over 90 90-119, Over 120 120+, the article definition); the boundary day is printed in the criteria echo. The glossary variant (0-30) is a one-day difference to confirm on the live tool. When `over_120_plus` is in `aging_buckets` (Excel only) the ageing reports use set `legacy_extended` (as `legacy` up to Over 90, then `bucket_over_120` = 120-149, `bucket_over_150` 150-179, `bucket_over_180` 180-269, `bucket_over_270` 270-364, `bucket_over_365` 365+), so the five columns sum to the 120+ amount; the criteria echo prints these edges |
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

## Executive Summary - `monthly.executive_summary`

Monthly Reports, screenshot `1.PNG` - P2 - L - `reports_monthly_reports_screen_view_only` / `_full_control` (family `monthly`) - interactive (background when the run spans more than 10 offices or more than 366 days) - DOCUMENTED (every line and its vendor definition); GROUP BY Provider / Page Break layout INFERRED

### Purpose

Owner, regional manager and office manager: one page of practice KPIs per office - patients, visits, appointments,
production, collections, adjustments, doctor / hygiene split, averages, referral sources, MTD / YTD money and, on request,
the A/R snapshot. Run at the end of the day (range = today), at month end (range = the month, the vendor-recommended run
with `SELECT` > all offices) and for year-end information ([R] research section 2.9: Management / C-level, daily, month
end, year end). Supports: "is this office on track this month", comparing locations side by side, spotting a drop in
visits or a rise in cancellations, and the month-end management pack. The Daily Reports category has its own daily
variants (not part of this category).

### Legacy output

Confidence DOCUMENTED: base layout and every line from the vendor field guide (annotated, 3 images) and a 2025 sample;
GROUP BY Provider and Page Break layout INFERRED (third-party source only).

Header: organisation name, title `Executive Summary`, band `Office : <office>`. Body in three columns: label, bold figure,
sub-figure column. One KPI block per selected office; whether a consolidated all-offices block follows is unverified
(family open question 1).

| # | Printed line (exact) | Vendor definition |
|---|---|---|
| 1 | `New Patients :` | patients added to the system (created date) in the range, by the patient's home office |
| 2 | `New Patients by First Visit Date :` | patients whose first visit is in the range, same office rule |
| 3 | `Patients Seen :` | distinct patients with a ledger procedure whose code has Ledger Code = yes and Visit Code = yes |
| 4 | `Avg Patients Seen Per Day :` | Patients Seen ÷ office working days (days with a ledger procedure in the range) |
| 5 | `Patient Visits :` | patient-days with such a procedure |
| 6 | `Total Procedures Done :` | ledger procedures with Ledger Code = yes (Visit Code ignored) |
| 7 | `Total Chair Hours :` | appointment length of appointments with a completed transaction; missed and cancelled excluded |
| 8 | `Missed Appointments :` | appointments in the range marked missed |
| 9 | `Cancelled Appointments :` | appointments in the range marked cancelled |
| 10 | `Production :` | visit-code ledger items net of all production adjustments |
| 11 | `  Patient :` (sub-figure) | estimated patient portion = Production - Insurance |
| 12 | `  Insurance :` (sub-figure) | estimated insurance portion |
| 13 | `Non visit code transactions :` | ledger items with Ledger Code = yes and Visit Code = no |
| 14 | `Total :` | Production + non visit code transactions |
| 15 | `Collection :` | patient + insurance payments, printed negative (A/R reduced) |
| 16 | `  Patient :` / `  Insurance :` | ledger type `P` / `I` |
| 17 | `Adjustments :` `(Collection)` | total collection adjustments |
| 18 | `Dentist Production :` + sub `Non visit code transactions :` | production of dentist providers |
| 19 | `Hygienist Production :` + sub `Non visit code transactions :` | production of hygienist providers |
| 20 | `Total :` | dentist + hygienist, non-visit included |
| 21-24 | `Average Production Per Patients Seen :` / `Per Chair Hours :` / `Per Procedures Done :` / `Per Patient Visits :` | Production (line 10) ÷ the line named |

Further blocks per office: `Referrals :` table (source name, `New Patients`, `Production`, `Total :` row; probably printed
only when referral data exists [I]); MTD / YTD table (rows `Charges`, `Non-Visit code Transactions`, `Payments`,
`Adjustments`; MTD = first of the month of End Date through End Date, YTD = January 1 through End Date); with Show AR the
row `A/R as of : <End Date>` with `Current`, `Over30`, `Over60`, `Over90`, `Over120`, `Total A/R`, then `Estimated
Insurance :` and `Estimated Patient :`. Footer: `From:`, `Thru:`, `Offices: <ids>`, `Providers : ALL`, `* Show AR.`.

Signs: payments negative, adjustments as stored (sample `35.86`), no currency symbol, two decimals. Quirks kept: three
new-patient notions side by side; the A/R block equals the Aging Report only for a single-day run with Include Credit
Balance ticked on the Aging Report. Quirks deliberately fixed: the vendor guide's copy error on the Insurance line (we
print Insurance); a third row `Other Production :` prints only when providers that are neither dentist nor
hygienist produced, so lines 18-20 still add up. `Total Chair Hours` keeps the legacy figure by default: the vendor sample
behaves like minutes (1,060.00 for 24 visits, 3,768.90 / 1,060 = 3.56 per "chair hour"), so the default prints the sum of
appointment minutes under the legacy label; hours are an enhancement switch (`chair_time_unit`, Open questions 3).

### Parameters - legacy parity

<!-- PARITY:montly_reports.r01:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (token working_office). Executive Summary: one KPI block per resolved office (fixed outer group level office, always applied, also for a single office); figures are the activity within that office - production, visits and procedures by office of service (rpt_charges.office_id / rpt_visits.office_id), payments and adjustments by transaction office (rpt_ledger_entries.office_id), appointments by appointment office, A/R block per office with allocation unit account_office. Exception (vendor documentation): the new-patient counts use the patient's home office (rpt_patient_dim.home_office_id). The vendor-recommended run selects all offices; whether a consolidated all-offices block is appended is unverified - check on the live tool. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Limits every figure to the selected providers; ALL echoed as 'Providers : ALL'. Provider column per figure (no single attribution): production, procedures and non-visit transactions = treating provider rpt_charges.provider_id; patients seen / patient visits = rpt_provider_visits.provider_id; missed / cancelled appointments and chair hours = rpt_appointment_facts.provider_id; collections and collection adjustments = provider on the ledger leg rpt_ledger_entries.provider_id (credited provider, not the allocation provider). The per-figure binding is inferred: the vendor documents only that the picker limits the figures - confirm on the live tool with a two-provider office. Declared parity exceptions to PD-7: collections by the ledger-leg provider (enhancement collections_provider_attribution = allocation_provider offers the PD-7 basis) and hygienist credit = treating provider. Show AR block: filtered on rpt_ar_open_items.provider_id (inferred). New-patient lines and the Referrals block are not provider-limited (inferred). |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis transaction_date (04 7.2 row 26, documented: production uses the posting date). Charges carry transaction_date = service date until DATA-13. The MTD and YTD blocks derive from date_to only (MTD = first of that month through date_to, YTD = January 1 through date_to). New Patients uses the patient created date (unreliable for migrated patients: load timestamp), New Patients by First Visit Date uses the first visit date. Default today in the office time zone; enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the transaction-date range; also the as-of date of the Show AR block and the end of the MTD / YTD windows. Default today in the office time zone; enhanced with presets and relative tokens. |
| OTHER OPTIONS | Show AR (checkbox) | **unchecked** | `show_ar` | boolean | - | `false` | replicated | Executive Summary: adds the block 'A/R as of : <date_to>' (Current / Over30 / Over60 / Over90 / Over120 / Total A/R, then Estimated Insurance and Estimated Patient) per office, computed from rpt_ar_open_items(:tenant_id, :date_to, NULL, 'account_office') and the footer flag '* Show AR.'. role: query (the block is computed only when ticked; escalates to background with more than one office or a tenant-wide scope). Legacy bucket set; buckets carry open debits, credits are netted into Total A/R only (legacy placement of credits unverified). The block is as of date_to for any range; the vendor says it matches the Aging Report only for a single-day run - whether the legacy as-of differs on multi-day runs is to be confirmed on the live tool. Enabled on this report. |
| GROUP BY | (no label) (radio_group) | **None** / Provider | `group_by` | enum | None -> `none`, Provider -> `provider` | `none` | replicated | None = office totals; Provider = the KPI block repeated under a provider header inside each office (layout inferred, third-party source). Provider-grouped visit counts read rpt_provider_visits and are not additive across providers (a patient-day seen by a dentist and a hygienist counts under both); the office total still comes from rpt_visits. |
| GROUP BY | Page Break (checkbox) | **unchecked** - greyed out | `page_break_by.group` | enum | - | `false` | replicated | Enabled when: group_by == provider (inferred). Page Break checkbox beside GROUP BY: ticked sets page_break_by = group (each provider block starts a new PDF page; layout role, the snapshot is reused). Greyed while GROUP BY = None; Provider is the only other value, so enabled_when group_by == provider (inferred from the criteria screen). Member checkbox: default false = unticked, so page_break_by = none (the parity default and the Shared-rules value 'none' are the same state). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:montly_reports.r01:END -->

| Legacy option | Effect on the result |
|---|---|
| OFFICE/GROUP = Office (default) + picker `108` | `office_ids = [working office]`; one KPI block (and its trailer blocks) per resolved office (`fixed_outer` level office, also for one office). Each figure uses its own office column (Data) |
| OFFICE/GROUP = Office Group + picker | `office_group_id`: every office of the group, one block each, in office display order |
| Provider = ALL (default) | No provider predicate; footer `Providers : ALL` |
| Provider = list | Every figure limited to the providers on its own provider column (Data, provider column per line); footer lists the provider short ids. New-patient lines and Referrals block are not provider-limited [I] |
| Start Date / End Date (default today / today) | Range of every count and money line on its date (Data); End Date also anchors MTD (month start of `date_to`) and YTD (January 1 of `date_to`) and is the as-of date of the A/R block |
| Show AR unticked (default) | No A/R block, no footer flag |
| Show AR ticked | Adds block `ar_snapshot` (`A/R as of : <date_to>`) per office and footer flag `* Show AR.` |
| GROUP BY = None (default) | Office totals only |
| GROUP BY = Provider | Inside each office one KPI block per provider with activity in the range (provider header `Provider : <short id> - <name>`), then the office total block [I]. Lines without a provider (1, 2, Referrals) print in the office total block only |
| Page Break unticked (default; greyed while GROUP BY = None) | Provider blocks follow each other |
| Page Break ticked | `page_break_by = group`: each provider block starts a new PDF page; layout only, the snapshot is reused |

Dependency rules: `page_break_by` `enabled_when` `["eq", "group_by", "provider"]` (inferred from the greyed capture;
disabled value `none`). Legacy actions: PRINT / PREVIEW -> `print`, CLEAR CRITERIA -> `frontend`, ADD TO MY FAVORITES ->
`saved_view`.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_preset` | preset of `date_range` | `today` | Month-end pack in one click: `last_month`, `month_to_date`, `year_to_date`, `last_quarter`; schedules store the preset (a monthly schedule on the 1st with `last_month`) |
| `compare_to` (+ `compare_date_from`, `compare_date_to`) | `enum` `none`, `previous_period`, `previous_year`, `custom` (filter card 12, `supports_comparison = true`) | `none` | Adds columns `Prior` and `Change %` to every count and money line of the KPI block; the legacy layout is unchanged while `none`. P4 (FLT-26) |
| `office_scope` `my_offices` / `all` | shared | `working_office` | Regional run over the caller's offices |
| `chair_time_unit` | `enum` `legacy_minutes`, `hours` (NEW key, owner: this catalog) | `legacy_minutes` | `hours` prints line 7 as `sum(duration_minutes) / 60` and recomputes line 22 on it; the label stays `Total Chair Hours :`, the criteria echo prints `Chair time : hours`. The default keeps the legacy (minutes-scale) figure until Open questions 3 is answered |
| `collections_provider_attribution` | `enum` `transaction_provider`, `allocation_provider` (NEW key, owner: this catalog; vocabulary to 04) | `transaction_provider` | `allocation_provider` limits and splits lines 15-17 by `rpt_payment_allocations.allocation_provider_id` (PD-7 basis, `Unallocated` printed as its own sub-line); the default keeps the inferred legacy binding on the ledger leg |
| `include_office_total_block` | `boolean` (NEW key, owner: this catalog) | `false` | Appends one consolidated block over all resolved offices after the last office (ratio lines recomputed from the summed components, never averaged). Replaced by the legacy behaviour once family open question 1 is answered |
| `chart_series` (view state, not a parameter) | - | - | Toggles the trend chart (Visuals) |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_charges`, `rpt_ledger_entries`, `rpt_visits`, `rpt_provider_visits`, `rpt_appointment_facts`, `rpt_patient_activity`, `rpt_patient_dim`, `rpt_provider_dim`, `rpt_procedure_code_dim`, `rpt_office_dim`, `rpt_ar_open_items()` (unit `account_office`, `p_as_of = date_to`), `rpt_aging_bucket_sets` (set `legacy`) |
| Fixed `date_basis` | `transaction_date` (documented). Charges: `rpt_charges.transaction_date`, equal to `service_date` until DATA-13. Visits: `rpt_visits.visit_date` (date of service of the visit-code charges). Appointments: `appointment_date`. Payments / adjustments: `rpt_ledger_entries.transaction_date` |
| Line 1 | `count(*)` of `rpt_patient_dim` with office-local `created_at_utc` date in range, `created_at_reliable`, NOT `is_placeholder_patient`; office = `rpt_patient_dim.home_office_id`. Migrated patients carry the load time: they are never counted (APP for history), `availability[]` code `created_date_migrated` |
| Line 2 | `rpt_patient_activity.first_visit_date` in range, office = `rpt_patient_dim.home_office_id` (metric `new_patients_first_visit` with `new_patient_office_attribution = home_office`: overrides the metric default `first_visit_office`; vendor-documented) |
| Lines 3, 5 | `count(DISTINCT patient_id)` and `count(*)` of `rpt_visits` (office = `rpt_visits.office_id`); by provider `rpt_provider_visits` (not additive across providers) |
| Line 4 | Line 3 ÷ `count(DISTINCT transaction_date)` of `rpt_charges` with `is_ledger_code` of the office in range (vendor definition: days with any ledger procedure; not the metric `working_days`, whose `activity` basis also counts kept-appointment days); zero-denominator guard prints `0.00` |
| Line 6 | `count(*)` of `rpt_charges` with `is_ledger_code` (office of service) - metric `procedures_done` |
| Line 7 | `sum(duration_minutes)` (default `chair_time_unit = legacy_minutes`, the legacy figure) or `sum(duration_minutes) / 60` (`hours`) of `rpt_appointment_facts` with `is_kept`, NOT `is_block`, NOT `is_deleted`, NOT `is_legacy_archive` (unless tenant policy) - metric `chair_hours`, office = appointment office |
| Lines 8, 9 | `count(*)` of `rpt_appointment_facts` with `status_class = 'no_show'` / `'cancelled'` (data card 3.2), same row filters |
| Line 10 | Legacy Sub Type axis (parity): `Σ rpt_charges.charged_fee [is_ledger_code AND is_visit_code]` + `Σ rpt_ledger_entries.amount [journal_column = 'charges' AND entry_type <> 'charge']` of the office - the rows the Executive Day Sheet prints as Production. Not the analytic `ledger_bucket` axis: a contractual write-off code with Sub Type Collection counts in line 17 only, a Production-Sub-Type code of bucket `opening_balance` / `non_income_adjustment` counts in line 10 |
| Lines 11, 12 | Insurance = `Σ rpt_charges.est_insurance` of the visit-code charges of line 10; Patient = line 10 - Insurance (the vendor formula; production adjustments therefore land in Patient) |
| Line 13 | `Σ charged_fee [is_ledger_code AND NOT is_visit_code]`; line 10 charges + line 13 = `Σ charged_fee [is_ledger_code]` (identity of RPT-MONTHLY-10) |
| Line 14 | line 10 + line 13 |
| Lines 15, 16 | `Σ amount` of `rpt_ledger_entries [journal_column = 'payment']` (legacy ledger type P / I) split by `payer` (`patient` / `insurance`; both stores, PD-2); signed negative. Differs from `gross_collections` by `non_collection_payment` rows, which the legacy line includes |
| Line 17 | `Σ amount [journal_column = 'adjust' AND entry_type <> 'charge']` (legacy Sub Type Collection); migrated adjustments have unknown Sub Type and land here until DATA-12 (`availability[]` code `unclassified_adjustments`) |
| Lines 18-20 | lines 10 and 13 split by `rpt_provider_dim.provider_kind` of the treating provider (`rpt_charges.provider_id`; production adjustments by `rpt_ledger_entries.provider_id`): `dentist` + `specialist` -> Dentist, `hygienist` -> Hygienist, other / NULL -> Other [I]. Hygienist credit uses the treating provider (`hygiene_credit_policy = treating_provider` for parity): declared parity exception to PD-7 ("hygienist when recorded"); the legacy hygienist credit is unverified (Open questions 8) |
| Lines 21-24 | `safe_div(line 10, line 3 / 7 / 6 / 5)` (line 22 divides by line 7 in the unit of `chair_time_unit`), computed by the banding step from unrounded components (metric catalog 7.9) |
| Referrals block | new patients of line 2 grouped by `rpt_patient_dim.referral_source_id` / `referral_source_name` (migrated patients: link by legacy id through `referred_by_raw`; app patients: free text until DATA-40, printed under the raw text); `Production` = `Σ amount [journal_column = 'charges']` of those patients in the range (charges plus production adjustments, Visit Code ignored, vendor definition). Rows only for sources with a new patient; block omitted when empty [I] |
| MTD / YTD block | windows `start_of_month(date_to)..date_to`, `start_of_year(date_to)..date_to`: `Charges` = line 10 rule, `Non-Visit code Transactions` = line 13, `Payments` = line 15, `Adjustments` = line 17 |
| A/R block | `rpt_ar_open_items(:tenant_id, :date_to, NULL, 'account_office')` per `unit_office_id` (single-office runs pass the account ids of the resolved scope as the third argument); computed only when `show_ar` is ticked (`show_ar` has `role: query`; `escalate_when` `show_ar = true` with more than one office or a tenant-wide scope -> `background`): buckets of `rpt_aging_bucket_sets` `legacy` over `open_amount` of open debits by `age_days`; `Total A/R` = `Σ open_amount` over debits and unallocated credits (credits netted, metric `total_ar`); `Estimated Insurance` = `Σ open_insurance_est`; `Estimated Patient` = `Σ open_patient` (credits included, [I]). Current..Over120 add up to Total A/R only on a scope without unallocated credits (Open questions 9). The block is as of `date_to` for any range, so it matches the Aging Report whenever `report_date = date_to`; the legacy single-day restriction is not reproduced (Open questions 10) |
| Provider attribution (inferred, family open question 2) | production, procedures, non-visit: `rpt_charges.provider_id`; patients seen / visits: `rpt_provider_visits.provider_id`; chair hours, missed, cancelled: `rpt_appointment_facts.provider_id`; collections, adjustments: `rpt_ledger_entries.provider_id` (declared parity exception to PD-7, which attributes collections by allocation; `collections_provider_attribution = allocation_provider` offers the PD-7 basis); A/R block: `rpt_ar_open_items.provider_id` [I] |
| Office attribution | per line as above (office of service, visit office, appointment office, transaction office, home office for new patients, unit office for A/R); NULL office = `Unassigned office` (organisation callers only) |
| Availability | READY (coverage matrix row 13). Procedures Done / Non visit need the reviewed `is_ledger_code` / `is_visit_code` flags (DATA-04); line 1 is APP for migrated patients; chair hours need `is_kept` (DATA-16); visits DATA-18, first visit DATA-19; A/R block DATA-27 (tenant-wide), a past End Date is recomputed until DATA-30; referral production for app patients needs DATA-40 (P3); migrated adjustment classes REPAIR(12); migrated ledger completeness DATA-57 warning |
| Cannot be produced | `New Patients` (created date) for migrated patients; frozen month-end figures before day close exists (DATA-29 / DATA-30); hygienist credit on migrated charges (no `hygienist_id`) |

### Output

One format `standard` (no REPORT FORMAT control). Block `kpi` (`shape = key_value`, main), grouping `fixed_outer` office
(header `Office : {office_name}`), option `group_by = provider` adds level provider (header `Provider : {provider_short_id}
- {provider_name}`, `page_break_allowed`), `trailer_blocks` `referrals`, `mtd_ytd`, `ar_snapshot` after each office.

Block `kpi` - one row per line per group; columns:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `line_key` | (hidden) | id | `aggregate` | - |
| `line_label` | (label column) | text | `aggregate` | label |
| `value` | (bold figure) | decimal / money / integer per line (`format` from the line: counts integer, hours decimal 2, money 2 decimals minus sign) | counts `aggregate`; money `financial_practice`; in provider groups `provider_comp` | office block = office figure (never the sum of provider blocks: visit counts are not additive) |
| `sub_value` | (sub-figure) | money | as `value` | as `value` |
| `prior_value`, `change_pct` | Prior, Change % | as `value`, percent | as `value` | `visible_when` `["ne", "compare_to", "none"]` |

Line keys in print order: `new_patients_created`, `new_patients_first_visit`, `patients_seen`, `avg_patients_seen_per_day`,
`patient_visits`, `procedures_done`, `chair_hours`, `missed_appointments`, `cancelled_appointments`, `production_net`
(subs `production_est_patient`, `production_est_insurance`), `production_non_visit`, `production_total`,
`collection_total` (subs `collection_patient`, `collection_insurance`), `collection_adjustments`, `production_dentist`
(sub `production_dentist_non_visit`), `production_hygienist` (sub `production_hygienist_non_visit`), `production_other`
(`visible_when` non-zero), `production_provider_total`, `avg_production_per_patient_seen`,
`avg_production_per_chair_hour`, `avg_production_per_procedure`, `avg_production_per_visit`.

Block `referrals` (table, `after_group`): `referral_source_name` Referral (text, `phi_identified` when the source is a
patient or free text, else `aggregate`, rule 13), `new_patients` New Patients (integer, `aggregate`, sum),
`production` Production (money, `financial_practice`, sum); `Total :` row. Sort: source name.

Block `mtd_ytd` (table, `after_group`): `row_label` (Charges, Non-Visit code Transactions, Payments, Adjustments), `mtd`
MTD, `ytd` YTD (money, `financial_practice`; `provider_comp` in provider groups); no total row.

Block `ar_snapshot` (table, `after_group`, `visible_when` `["truthy", "show_ar"]`): `ar_as_of` (date, label `A/R as of :`),
`bucket_current` Current, `bucket_over_30` Over30, `bucket_over_60` Over60, `bucket_over_90` Over90, `bucket_over_120`
Over120, `total_ar` Total A/R, `estimated_insurance` Estimated Insurance, `estimated_patient` Estimated Patient (money,
`financial_practice`).

Sort: fixed line order; offices in display order; providers by last name. Page break: `page_break_by` (`none`, `group`).
Summary cards (main office or the total block): `production_net`, `collection_total`, `patients_seen`, `new_patients_first_visit`.
`reconciles_with`: `patients_seen` = `patients_seen`, `chair_hours` = `chair_hours` (only under `chair_time_unit = hours`),
`total_ar` = `total_ar` (unit `account_office`, as of `date_to`). Identity test with a documented bridge (not a `reconciles_with` entry, the axes differ): `production_net` = metric
`visit_code_production` + bridge, where bridge = Σ non-charge legs with `journal_column = 'charges'` and `ledger_bucket <>
'production_adjustment'` - Σ legs with `ledger_bucket = 'production_adjustment'` and `journal_column <> 'charges'` + the
visit-code charges with `is_ledger_code` but not `is_production` (minus the reverse); unclassified migrated rows
(`unclassified_adjustment`) are listed as a bridge line. `empty_when`: `total_is_zero` on `production_total`.

### Visuals and drill-through

Chart (screen only, `charts[]`): bar chart of `production_net`, `collection_total` (sign flipped for display) and
`collection_adjustments` per office (category = office) when more than one office; per provider when grouped.

| Click | Target | Parameters passed |
|---|---|---|
| `production_net`, `production_non_visit`, dentist / hygienist lines | `daily.production_report` | `office_ids` = clicked office, `date_from` / `date_to`, `provider_ids` = clicked provider group or the run's |
| `collection_total` and subs | `daily.collection_report` | office, range, providers |
| `collection_adjustments` | `daily.special_transaction_report` | office, range (adjustment codes of class collection) |
| `patients_seen`, `patient_visits` | `lists.patients_seen` | office, range, providers |
| `new_patients_first_visit` | `lists.patient_list_new_patient` | home office, range |
| `missed_appointments`, `cancelled_appointments` | `appointment.appointment_list` | office, range, status missed / cancelled |
| Referral row | `referral.referral_summary_report` | source, range |
| A/R bucket or `total_ar` | `monthly.aging_report` | office, `report_date = date_to`, `aging_buckets = [clicked]`, `include_credit_balances = true`; for a provider-limited run also `group_by = provider`, `provider_basis = transaction_provider`, `provider_ids`. A bucket drill reconciles on the clicked bucket column only (the target prints every bucket of the selected accounts); `total_ar` reconciles on the grand total |
| MTD / YTD cell | same report | `date_from` = window start, `date_to` |

### Actions

None at row level (aggregate report, not a worklist). Bulk: `export_selection` of the chosen offices' blocks. Hub
actions: schedule (month-end pack; needs `reports_monthly_reports_screen_full_control` + `reports_schedule_own`), save view,
share (needs `reports_share`).

### Export and print

PDF: layout `executive_summary` (NEW renderer key: three-column key-value body, trailer tables), portrait, letterhead
(organisation name, title, `Office :` band), criteria echo in the footer (`From:`, `Thru:`, `Offices:`, `Providers :`,
`* Show AR.`), `Printed :`, `By :`, `Page : n of m`; one office per page block, page break per provider when ticked.
XLSX: sheet `Summary` flat (`office`, `provider`, `line_key`, `line_label`, `value`, `sub_value`, prior columns when
present), sheets `Referrals`, `MTD_YTD`, `AR` (one row per office), `Criteria`; no merged cells. CSV: the `kpi` block flat.
Background run (`escalate_when` above) delivers the artifact by link.

### Open questions

| # | Question |
|---|---|
| 1 | Consolidated all-offices block on multi-office runs (family 1); until answered, `include_office_total_block` default false |
| 2 | Which provider column limits each line when providers are selected (family 2); confirm with a two-provider office |
| 3 | `Total Chair Hours` unit: sample (1,060.00 for 24 visits, 3.56 per hour) behaves like minutes. Default `chair_time_unit = legacy_minutes` keeps it; confirm the unit on the live tool |
| 4 | GROUP BY Provider layout and where the new-patient and referral lines print (INFERRED) |
| 5 | Whether specialists count as Dentist Production; whether production adjustments count in the dentist / hygienist split |
| 6 | Whether Patients Seen excludes missed / cancelled appointments (search snippet only) - our visit rule does not read appointments |
| 7 | Is the Referrals block printed when it is empty, and does it count by first-visit date or created date |
| 8 | Is hygienist production credited to the treating provider or to the recorded hygienist (PD-7 exception); are collections limited by the ledger-leg provider or by allocation |
| 9 | Show AR: does the legacy row place unallocated credits inside a bucket or only in `Total A/R` |
| 10 | Show AR on a multi-day range: is the legacy A/R as of the End Date (our rule) or does it match the Aging Report only for a single-day run |

## Executive Day Sheet - `monthly.executive_day_sheet`

Monthly Reports, screenshot `2.PNG` - P2 - M - `reports_monthly_reports_screen_view_only` / `_full_control` (family `monthly`) - interactive (instant for one office and one day; background for an office group over more than 92 days) - DOCUMENTED (columns and row structure from the 2020 and 2022 samples); closing total row unverified

### Purpose

Office manager, bookkeeper and owner, daily or for any range (month-end adjustment review): the money of the range per
transaction type - services, every production adjustment code, every collection adjustment code, every payment code -
with its effect on A/R. Used to see which adjustment codes were used and for how much, how much sales tax and finance
charges were posted, and to check that the month's A/R movement is explained by codes (vendor recommendation; modern form
of the peg-board day sheet).

### Legacy output

Confidence DOCUMENTED (two vendor samples); total row unverified.

Header: organisation name, `Executive Day Sheet` (the 2020 build printed `Day Sheet` in the footer), `Office : <office
name>`. One section per office.

| Column (as printed) | Content |
|---|---|
| `Type` | `Services`, then each adjustment / payment code name, right-aligned |
| `Production` | amount for `Services` and production-class adjustment codes; `--` otherwise |
| `Collections` | amount for payment codes; `--` otherwise |
| `Adjustments` | amount for collection-class adjustment codes; `--` otherwise |
| `A. R. Impact` | signed effect on receivables (sample: `Services` $56,144.66 -> $56,144.66; `$Test Production Adj` ($75.00) -> ($75.00); `FEE - Finance Charge (Account)` $608.21; `Sales Tax` $0.80) |

Row order: (1) `Services`; (2) production adjustment codes (`ADJ OFF - Courtesy Discount`, `AUTO - Insurance
Adjustment(P)`, `FEE - Finance Charge (Account)`, `FEE - Late Charge`, ...); (3) collection adjustment codes (`Balance
Moved to Contract`, `Periodic Contract Billing`, `REFUND - Patient`, `REV PMT - Non-sufficient funds`, `Sales Tax`,
`TRANSFER - Payment From`, ...); (4) payment codes (`PMT PAT-Cash`, `PMT INS - Check`, ...). Within a section the sample
order looks alphabetical [I]. Every configured code prints even at $0.00 (a single-office sample runs to 5 pages). A
grand-total row is likely on the last page but not visible in the published pages [unverified]. Footer: `From`, `Thru`,
`Office`.

Signs and format: `$` and parentheses for negatives (`format.negative = parentheses`, `symbol = $`); payments negative.
Kept. Deliberate addition: a `Total` row per office (sum of each column), marked [I] in the definition description until
confirmed.

### Parameters - legacy parity

<!-- PARITY:montly_reports.r02:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Our Excel is a flat typed sheet (one record per row) [I]: the legacy Excel layout of this report is not documented (the vendor's flat-layout statement is cross-cutting, its evidence is a Daily report) - confirm on the live tool. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (token working_office). Executive Day Sheet: one section per office by transaction office (rpt_ledger_entries.office_id, PD-6 day sheet); every configured transaction code of the office is printed, also at 0.00. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis transaction_date (04 7.2 row 27, inferred from the day-sheet family, PD-8): rpt_ledger_entries.transaction_date. Default today in the office time zone; enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the transaction-date range. Default today in the office time zone; enhanced with presets and relative tokens. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:montly_reports.r02:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT = PDF (default) | `output_format = pdf`: preview on screen, PDF rendered from the snapshot |
| PRINT FORMAT = Excel | `output_format = xlsx`: flat typed sheet from the same snapshot (rows unchanged) |
| OFFICE/GROUP = Office (default) + picker `108` | One section per resolved office; legs filtered on the transaction office `rpt_ledger_entries.office_id` |
| OFFICE/GROUP = Office Group + picker | Every office of the group, one section each (no consolidated section unless family open question 1 says so) |
| Start Date / End Date (default today / today) | Legs with `transaction_date` in the inclusive range; code rows without legs print 0.00 |

No dependency rules on this screen. No provider control: `provider_ids` is not offered and no provider restriction applies.
Legacy actions as the family.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_preset` | preset | `today` | `last_month` / `month_to_date` for the month-end adjustment review |
| `hide_zero_rows` | `boolean` (NEW key, owner: this catalog) | `false` | Drops code rows whose four amounts are 0.00 (the legacy prints them); the criteria echo prints `* Zero rows hidden.` |
| `code_sections` | `enum_multi` `services`, `production_adjustments`, `collection_adjustments`, `payments` (NEW key; `min_items` 1, `full_selection = no_predicate`) | all ticked | Prints only the chosen sections; `Total` row then labelled `Total (selected sections)` |
| `include_office_total_section` | `boolean` (NEW key) | `false` | Adds one consolidated section over all resolved offices |
| `compare_to` | shared (filter card 12) | `none` | Adds `Prior A. R. Impact` and `Change` per code row. P4 |
| `output_format = csv` | shared | - | CSV of the code rows |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ledger_entries` (live), `rpt_transaction_code_dim`, `rpt_office_dim` |
| Date basis | `transaction_date` fixed (inferred from the day-sheet family, PD-8); charges equal their service date until DATA-13 |
| Office | transaction office `rpt_ledger_entries.office_id`; NULL = `Unassigned office` section (organisation callers only) |
| Provider | none |
| Row skeleton | per office: one `Services` row, plus one row per code of `rpt_transaction_code_dim` (`code_kind` `adjustment` / `payment`, `is_active` or used in the range, version valid on `date_to`), plus system rows that occur in the range (`unclassified` for migrated adjustments, migrated tender aliases), plus a row per procedure code of class `non_production_charge` used in the range (contract billing) |
| Section of a row | `services`: `entry_type = 'charge' AND journal_column = 'charges'`; `production_adjustments`: `entry_type <> 'charge' AND journal_column = 'charges'`; `collection_adjustments`: `journal_column = 'adjust'` (collection Sub Type, unknown Sub Type, transfers, opening rows, refunds, contract-billing charges); `payments`: `journal_column = 'payment'` |
| Amount columns | `production` = `Σ amount` for rows of sections services / production_adjustments, NULL (`--`) otherwise; `collections` = `Σ amount` of payment rows; `adjustments` = `Σ amount` of collection-adjustment rows; `ar_impact` = `Σ amount` of every row (A/R movement) |
| Joins | legs to codes on `code` through `LATERAL ... ORDER BY valid_from DESC LIMIT 1` (no multiplication, R-01); zero rows by `LEFT JOIN` from the skeleton |
| Availability | READY (coverage matrix row 14). One row per code on history: REPAIR(12) - until DATA-12 every migrated adjustment prints on `Unclassified adjustment (migrated)` in the collection section and migrated payments on their tender alias rows (`availability[]` `unclassified_adjustments`); code catalog DATA-03; completeness of migrated charges DATA-57 |
| Cannot be produced | per-code adjustment split for migrated history before DATA-12; a frozen day sheet of a past range before DATA-29 |

### Output

One format `standard`, block `codes` (table, main), grouping `fixed_outer` office (`Office : {office_name}`, subtotal row
`Total`, `page_break_allowed`), inner level `code_section` (no header printed, legacy has none; section order fixed).

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `type_label` | Type | text (right-aligned for code rows) | `aggregate` | label `Total` |
| `production` | Production | money (`$`, parentheses, `null_display = --`) | `financial_practice` | sum |
| `collections` | Collections | money (same format) | `financial_practice` | sum |
| `adjustments` | Adjustments | money (same format) | `financial_practice` | sum |
| `ar_impact` | A. R. Impact | money (same format) | `financial_practice` | sum (= office ledger movement of the range) |
| `prior_ar_impact`, `ar_impact_change` | Prior A. R. Impact, Change | money | `financial_practice` | sum; `visible_when` `["ne", "compare_to", "none"]` |
| hidden: `row_id` (`<office>:<section>:<code>`), `code`, `code_kind`, `code_section`, `section_order`, `legacy_sub_type`, `is_system_row` | | | `aggregate` | |

Sort: `default_sort` = `section_order`, then `type_label` (case-insensitive), then `code`. Page break: office (always
a new page per office in PDF, as the samples). Summary cards per office: `production` total, `collections` total,
`adjustments` total, `ar_impact` total. `reconciles_with`: `ar_impact` total = `Σ rpt_ledger_entries.amount` of office and
range (R-14b roll-forward); `production` total = `Σ amount [journal_column = 'charges']` of office and range, which
excludes contract billing (`non_production_charges` print in Adjustments) - an identity test added to RPT-MONTHLY-15.
`empty_when`: `{block: codes, test: total_is_zero, column: ar_impact}`; a range with only offsetting legs (net A/R movement
0.00) therefore counts as empty for `skip_if_empty`.

### Visuals and drill-through

Chart: horizontal bar of the ten largest absolute `adjustments` and `production` adjustment rows (`top_n = 10`), to show
which adjustment codes drive the month. Drill:

| Click | Target | Parameters passed |
|---|---|---|
| `Services` row | `daily.production_report` | office, `date_from` / `date_to` |
| Adjustment or payment code row | `daily.special_transaction_report` | office, range, payment / adjustment code = clicked `code` |
| Office `Total` of `ar_impact` | `daily.daily_journal` | office, range (the lines behind the movement) |

### Actions

None (aggregate report). Not a worklist. Hub actions: schedule (e.g. monthly on the 1st with `last_month`), save view.

### Export and print

PDF: layout `day_sheet` (ENG-24) in its code-row variant (RPT-MONTHLY-05), portrait, `$` and parentheses, `--` for empty
cells, header `Executive Day Sheet` / `Office :`, footer echo `From`, `Thru`, `Office`, `Printed :`, `By :`, `Page : n
of m`, new page per office, `Total` row at the end of each office. XLSX: one sheet `Day Sheet` with columns `office`,
`section`, `code`, `type`, `production`, `collections`, `adjustments`, `ar_impact` (typed money, no `--` text: empty cells
are blank), a `Criteria` sheet. CSV: the same flat table.

### Open questions

| # | Question |
|---|---|
| 1 | Is there a grand-total row on the last page, per office or over all offices |
| 2 | Row order inside a section (alphabetical, code order or setup order) |
| 3 | Are inactive codes printed at 0.00, or only active ones; are codes of other offices' setups printed |
| 4 | Where contract billing (`Periodic Contract Billing`) prints when it is a procedure posting: our rule follows `journal_column` (Adjust) |
| 5 | Date basis: transaction date assumed (no basis control on the screen) |
| 6 | Layout of the legacy Excel output (not documented; our xlsx is a flat typed sheet [I]) |

## Aging Report by Home Office - `monthly.aging_report_by_home_office`

Monthly Reports, screenshot `3.PNG` (criteria row SORT BY clipped; completed from vendor screenshots) - P2 - L - `reports_monthly_reports_screen_view_only` / `_full_control` (family `monthly`) - interactive (background for more than 5 offices, an office group, `all`, or a row estimate above 20,000 accounts) - DOCUMENTED (Detail, PDF and Excel); Summary and GROUP BY PROVIDER PARTIALLY DOCUMENTED

### Purpose

Front office and billing staff for collection calls (daily / weekly), management for the A/R snapshot at month end and
year end, and the reference when a statement looks wrong (compare the balance on this report, on Aging Report and on the
ledger). It lists accounts receivable by responsible party, split into estimated insurance and estimated patient
portions, aged into buckets, for the responsible parties whose **home office** is selected - every transaction of the
account counts wherever it was recorded. The vendor's recommended ageing for multi-location organisations, because it
avoids the false debit and credit pairs of the transaction-office view.

### Legacy output

Confidence: Detail DOCUMENTED (2019 PDF sample, 2023 Excel sample, 2025 footer); Summary and GROUP BY PROVIDER layouts
PARTIALLY DOCUMENTED.

Titles: `Aging by Home Office` (2019 build), `Aging Report by Home Office - Detail` (Excel 2023). Header: organisation,
title, `Office : <office>` band.

Detail, PDF: one three-line block per responsible party, separated by a dashed rule.

| Column (as printed) | Content |
|---|---|
| `Resp Party` > `ID`, `Name` | responsible-party id, `Last, First` |
| `Type` | responsible-party type code (demo `CA`, `IN`, `AA`, `OO`) |
| `Lst Pay Date` / `Lst Pay Amount` (2025: one stacked `Lst Pay Dt/ Amt.`) | last payment date and amount |
| `Lst Stmt Date` | last statement date |
| (row tag) | blank = total, `Ins:`, `Pat:` |
| `Current`, `Over 30`, `Over 60`, `Over 90`, `Over 120` | balance per bucket |
| `Total Bal.` | row total |

Line 1 = identity + account totals; line 2 = phones `(H):`, `(C):` and the `Ins:` amounts; line 3 = the `Pat:` amounts
(2025 build: line 2 starts with `Type : <code>` and the last-payment amount, line 3 with the phone). Totals on the last
page: `Total Accounts with A/R : <n>`, then `Total :`, `Ins:`, `Pat:` rows across all buckets. Footer: `Report Date`,
`Start Name` / `End Name`, `Patient Type`, `Offices`, `Provider : N/A` (not grouped), `Ex Resp Party Type : NONE`,
`Aging : Current Over30 Over60 Over90 Over120`, `Account Balance Over : 0.00`, `* Includes accounts with Credit
Balances.` when ticked.

Detail, Excel: flat sheet, first column `Office`, then per bucket the triple `<bucket>`, `<bucket> Est. Ins`,
`<bucket> Est. Pat`; with `Over 120+` the triples `Over 120`, `Over 150`, `Over 180`, `Over 270`, `Over 365`.

Summary [D purpose, I layout]: the A/R snapshot of each selected office - one total / `Ins:` / `Pat:` block by bucket per
office without account lines. GROUP BY PROVIDER [I]: account blocks grouped and subtotalled by provider.

Signs: leading minus, no currency symbol; credit balances negative in `Total Bal.`. Quirks kept: only responsible parties
appear (their ids differ from patient ids); the `Ins:` estimate is not the Outstanding Claims total (secondary insurance
and claims not yet created are included). Bucket edges: legacy set (Current 0-29, Over 30 30-59, Over 60 60-89, Over 90
90-119, Over 120 120+), printed in the echo; the 0-30 glossary variant is family open question 3.

### Parameters - legacy parity

<!-- PARITY:montly_reports.r03:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT FORMAT | (no label) (radio_group) | **Detail** / Summary | `report_format` | enum | Detail -> `detail`, Summary -> `summary` | `detail` | replicated | Greyed on 835 Denial Report while PRINT FORMAT = Excel (vendor documentation: Excel exists only as Detail). On the Daily Production Report the Detail option alone is greyed until PRODUCTION BY = Provider (option_enabled_when). |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first; enhanced with csv. On this report output_format has role: query (04 section 8) because the AGING bucket member over_120_plus depends on it (rule d01) and changes the bucket columns. Excel is a flat typed sheet: first column Office, then per bucket the triple <bucket>, <bucket> Est. Ins, <bucket> Est. Pat. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (token working_office). Aging Report by Home Office: the selected offices are HOME offices - the report lists the accounts whose rpt_account_dim.home_office_id is selected and ages ALL their transactions wherever recorded (rpt_ar_open_items unit account, scope.office_attribution = home office). Not the transaction office of the shared default; an account appears once, under its home office. |
| PROVIDER | GROUP BY PROVIDER (checkbox) | **unchecked** | `group_by.provider` | enum | - | `false` | replicated | Ticked sets group_by = provider and enables the provider basis radio and the Provider picker. Member checkbox: default false = unticked, so group_by = none (the Shared-rules value 'none' is the same state). |
| PROVIDER | (no label) (radio_group) | **Preferred Provider** / Transaction Provider - greyed out | `provider_basis` | enum | Preferred Provider -> `preferred_provider`, Transaction Provider -> `transaction_provider` | `preferred_provider` | replicated | Enabled when: group_by == provider (inferred). Greyed until GROUP BY PROVIDER is ticked. |
| PROVIDER | Provider (picker) | shown: ALL - greyed out | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Enabled when: group_by == provider (inferred). Provider picker, enabled with GROUP BY PROVIDER. Filters the provider column chosen by provider_basis: preferred_provider = rpt_patient_dim.preferred_provider_id of the patient on the open item (fallback rpt_patient_activity.last_visit_provider_id; not migrated, so migrated patients fall under the fallback), transaction_provider = rpt_ar_open_items.provider_id of the open item. ALL = no restriction. Whether a provider filter drops whole accounts or only the items of other providers is not documented - confirm on the live tool. |
| REPORT DATE | Report Date (date_input) | shown: 11/21/2026 | `report_date` | date | - | `today` | replicated_enhanced | Report date with role as_of: balances at the end of that office-local day; ageing starts when the procedure is completed. A past date is recomputed from today's rows until day close and A/R snapshots exist (DATA-29, DATA-30). Default today in the office time zone (relative token). |
| PATIENT TYPE | (no label) (radio_group) | **Both** / General / Ortho | `patient_type` | enum | Both -> `both`, General -> `general`, Ortho -> `ortho` | `both` | replicated | Ortho-patient flag, not the user-defined patient types of INCLUDE / EXCLUDE PATIENT TYPE. Applied as an item filter on rpt_patient_dim.is_ortho_patient of the open item's patient before account aggregation (inferred) - confirm on the live tool whether whole accounts or items are filtered. |
| RESPONSIBLE PARTY NAME RANGE | Start Name (text_input) | shown: AAAAA | `responsible_party_name_from` | text_range | - | `AAAAA` | replicated | Start of the alphabetical range on the responsible-party sort name 'Last, First' of rpt_account_dim (guarantor_last_name, guarantor_first_name), with the prefix rule of 04: a bound without a comma compares the last name only, which is the vendor-documented legacy meaning (range on the responsible party LAST name). AAAAA / ZZZZZ are open bounds. Needs data class phi_identified. |
| RESPONSIBLE PARTY NAME RANGE | SEARCH (button) | - | `responsible_party_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| RESPONSIBLE PARTY NAME RANGE | End Name (text_input) | shown: ZZZZZ | `responsible_party_name_to` | text_range | - | `ZZZZZ` | replicated | End of the range on the responsible-party sort name (inclusive, prefix rule). |
| RESPONSIBLE PARTY NAME RANGE | SEARCH (button) | - | `responsible_party_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| EXCLUDE RESP. PARTY TYPE | (no label) (picker) | shown: None | `exclude_resp_party_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter on rpt_account_dim.resp_party_type: None = exclude nothing; accounts of a selected type are dropped, accounts without a type are kept; echoed in the footer as 'Ex Resp Party Type'. Needs DATA-53 (the type exists only on responsible_parties today, self-guarantor accounts have none). Dialog content was never captured - confirm on the live tool. |
| AGING BY | (no label) (radio_group) | **Account AR** / Patient AR | `aging_by` | enum | Account AR -> `account_ar`, Patient AR -> `patient_ar` | `account_ar` | replicated | Patient AR also renames the threshold to Patient Balance Over (rule d02). account_ar = insurance + patient open amounts of the account, including items of patients whose home office is another office. patient_ar = open_patient only, and on this home-office report only the items of patients whose own rpt_patient_dim.home_office_id is selected (inferred reading of the vendor's 'only the patient balances for this office') - confirm on the live tool. |
| AGING BY | Account Balance Over (number_input) | shown: 0.00 | `account_balance_over` | decimal | - | `0.00` | replicated | Balance > value, on the measure chosen by aging_by. The threshold applies to accounts (account-office pairs on Aging Report) with total > 0 only; accounts with total < 0 are governed by include_credit_balances / only_credit_balances alone; total = 0 is never listed (inferred credit rule, otherwise ticking Include Credit Balance could list no credit account under '> 0.00') - confirm on the live tool. |
| AGING | SHOW ONLY CREDIT BALANCES (checkbox) | **unchecked** | `only_credit_balances` | boolean | - | `false` | replicated | Sits inside the AGING section header bar. |
| AGING | Current (checkbox) | **checked** | `aging_buckets.current` | enum_multi | - | `true` | replicated | Aging bucket checkbox (account filter, predicate even when all ticked). Vendor documentation: Excel output shows Over 120+ in place of Over 120. The bucket predicate applies to debit accounts only: credits never sit inside a bucket (data card 2.14), so credit accounts are governed by the two credit options alone (inferred; shared rule to be stated in 04 2.5 for aging_buckets). |
| AGING | Over 30 (checkbox) | **checked** | `aging_buckets.over_30` | enum_multi | - | `true` | replicated | Aging bucket checkbox (account filter, predicate even when all ticked). Vendor documentation: Excel output shows Over 120+ in place of Over 120. The bucket predicate applies to debit accounts only: credits never sit inside a bucket (data card 2.14), so credit accounts are governed by the two credit options alone (inferred; shared rule to be stated in 04 2.5 for aging_buckets). |
| AGING | Over 60 (checkbox) | **checked** | `aging_buckets.over_60` | enum_multi | - | `true` | replicated | Aging bucket checkbox (account filter, predicate even when all ticked). Vendor documentation: Excel output shows Over 120+ in place of Over 120. The bucket predicate applies to debit accounts only: credits never sit inside a bucket (data card 2.14), so credit accounts are governed by the two credit options alone (inferred; shared rule to be stated in 04 2.5 for aging_buckets). |
| AGING | Over 90 (checkbox) | **checked** | `aging_buckets.over_90` | enum_multi | - | `true` | replicated | Aging bucket checkbox (account filter, predicate even when all ticked). Vendor documentation: Excel output shows Over 120+ in place of Over 120. The bucket predicate applies to debit accounts only: credits never sit inside a bucket (data card 2.14), so credit accounts are governed by the two credit options alone (inferred; shared rule to be stated in 04 2.5 for aging_buckets). |
| AGING | Over 120 (checkbox) | **checked** | `aging_buckets.over_120` | enum_multi | - | `true` | replicated | Aging bucket checkbox (account filter, predicate even when all ticked). Vendor documentation: Excel output shows Over 120+ in place of Over 120. The bucket predicate applies to debit accounts only: credits never sit inside a bucket (data card 2.14), so credit accounts are governed by the two credit options alone (inferred; shared rule to be stated in 04 2.5 for aging_buckets). |
| AGING | Include Credit Balance (checkbox) | **unchecked** | `include_credit_balances` | boolean | - | `false` | replicated | false = accounts whose total balance is negative are left out (legacy default: the grand total is then higher than the real A/R); true = they are listed and counted. Ignored while only_credit_balances is true. |
| OTHER OPTIONS | Exclude patients sent to collection. (checkbox) | **unchecked** | `exclude_sent_to_collection` | boolean | - | `false` | replicated | - |
| OTHER OPTIONS | Exclude accounts where patient portion is paid & insurance portion is expected. (checkbox) | **unchecked** | `exclude_insurance_expected_accounts` | boolean | - | `false` | replicated | - |
| OTHER OPTIONS | Include Balance Status (checkbox) | **unchecked** | `include_balance_status` | boolean | - | `false` | replicated | role: query (the builder adds the column and its dataset read; the row population is unchanged, it does not filter): prints the account balance status (code + description) on the account block. Needs DATA-35 (accounts.balance_status_code, definitions group balance_status); until then the column is empty and the report prints an availability warning. |
| OTHER OPTIONS | Include Contract Balances (checkbox) | **unchecked** | `include_contract_balances` | boolean | - | `false` | replicated | role: query (the builder adds the columns and the read of rpt_payment_plan_contracts; the row population is unchanged, it does not filter): Reg Cont. Bal. / Ort Cont. Bal. = sum of pat_amount_remaining of the account members' active (is_active) regular / ortho contracts of rpt_payment_plan_contracts (DATA-37); the ortho insurance remainder ins_amount_remaining is not added (inferred). Column names inferred from the Walkout Report - confirm both on the live tool. |
| SORT BY | (no label) (radio_group) | **Resp. Party Last name [?]** / Resp. Party ID [?] | `sort_by` | enum | Resp. Party Last name [?] -> `responsible_party_last_name`, Resp. Party ID [?] -> `responsible_party_id` | `responsible_party_last_name` | replicated | Vendor screenshots confirm both labels (Resp. Party Last name / Resp. Party ID; the [?] of the inventory is kept only because option keys must match the index) and that SORT BY is the last section. responsible_party_last_name = guarantor last name, first name, account_id; responsible_party_id = the legacy responsible-party id (rpt_account_dim.legacy_key, else account_no). Rows are sorted inside each office (and provider when grouped). |
| AGING | Over 120+ (checkbox) † | **unchecked** | `aging_buckets.over_120_plus` | enum_multi | - | `true` | replicated | Legacy default undocumented; default true inferred (it replaces the Over 120 box, which is ticked by default, and the form carries the over_120 state across the format switch, so a direct xlsx run from a saved view or URL also starts ticked). Shared vendor-doc parameter of 04: member over_120_plus of aging_buckets, shown only when output_format == xlsx, in place of over_120 (rule d01). With it the run uses bucket set legacy_extended: bucket_over_120 = 120-149, then bucket_over_150 / bucket_over_180 / bucket_over_270 / bucket_over_365 with ins_* / pat_* twins, summing to the 120+ amount; as an account filter it tests a balance aged 120+ days. Info-icon tooltip text not documented - read default and tooltip on the live tool with PRINT FORMAT = Excel. |

† From vendor documentation - not visible in our screenshot of this screen (hidden row, collapsed dropdown or another report mode).

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| PRINT FORMAT = Excel | In the AGING section the bucket checkbox `Over 120` is replaced by the checkbox `Over 120+` (with an info icon); with PRINT FORMAT = PDF the plain `Over 120` checkbox is shown. | aging_buckets option over_120 has visible_when output_format != xlsx and option over_120_plus has visible_when output_format == xlsx (shared rule of 04). output_format is declared role: query on this report, so switching PDF <-> Excel re-validates and re-runs. When output_format changes the form carries the ticked state of the shown 120 box to the other one (over_120 <-> over_120_plus), so the default run stays all-buckets-ticked in both formats; a hidden member is never sent. With over_120_plus in the list the run adds the extended bucket columns of set legacy_extended (bucket_over_120 = 120-149, bucket_over_150, bucket_over_180, bucket_over_270, bucket_over_365) (with Est. Ins / Est. Pat triples) to the xlsx and screen output and the account filter tests a balance aged 120+ days. |
| AGING BY = Patient AR | The threshold field `Account Balance Over` is relabelled `Patient Balance Over`; with AGING BY = Account AR the label is `Account Balance Over`. | account_balance_over keeps one value key; its label is 'Patient Balance Over' when aging_by == patient_ar and 'Account Balance Over' otherwise (label_when, shared rule of 04). The predicate follows aging_by: patient_ar compares the account's open_patient total, account_ar the account's total open_amount (insurance + patient). The criteria echo prints the label that was shown. |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `aging_buckets` | option_visible_when | output_format == xlsx | over_120_plus | documented - Excel shows Over 120+ (with an info icon) in place of Over 120. |
| `aging_buckets` | option_visible_when | output_format != xlsx | over_120 | documented |
| `account_balance_over` | label_when | aging_by == patient_ar | Patient Balance Over | documented - Label of the threshold follows AGING BY. |
<!-- PARITY:montly_reports.r03:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT = Detail (default) | Block `accounts`: one account block per responsible party, office totals, `Total Accounts with A/R` |
| REPORT FORMAT = Summary | Block `office_summary`: per office (and per provider when grouped) the total / Ins / Pat rows by bucket and the account count; no account rows |
| PRINT FORMAT = PDF (default) | PDF; `aging_buckets` shows `over_120` |
| PRINT FORMAT = Excel | `output_format = xlsx` (role `query`): `over_120` is replaced by `over_120_plus` (ticked state carried over), the run is re-validated and re-run, the xlsx adds the extended triples |
| OFFICE/GROUP = Office (default) + picker `108` | Accounts whose `rpt_account_dim.home_office_id` is selected; all their open items, any office |
| OFFICE/GROUP = Office Group + picker | Home offices of the group, one `Office :` section each |
| GROUP BY PROVIDER unticked (default) | `group_by = none`; footer `Provider : N/A`; provider basis and picker greyed |
| GROUP BY PROVIDER ticked | `group_by = provider`: open items grouped by the provider of `provider_basis`; an account whose items belong to two providers appears under both with its share [I]; provider subtotal rows |
| Preferred Provider (default, greyed until grouped) | provider of an item = `rpt_patient_dim.preferred_provider_id` of the item's patient, fallback `rpt_patient_activity.last_visit_provider_id`, else `Unassigned provider` |
| Transaction Provider | provider of an item = `rpt_ar_open_items.provider_id` (the provider on the open debit; credits: provider on the credit leg) |
| Provider = ALL (default, greyed until grouped) | no provider predicate |
| Provider = list | only items whose provider (per basis) is selected; account totals recomputed over those items [I] |
| Report Date (default today) | `p_as_of = report_date`: balances and ages at the end of that office-local day |
| PATIENT TYPE = Both (default) / General / Ortho | item filter on `rpt_patient_dim.is_ortho_patient` of the item's patient (`general` = false, `ortho` = true) before account totals [I]; echoed |
| Start Name `AAAAA` / End Name `ZZZZZ` (+ SEARCH) | inclusive range on the guarantor sort name, prefix rule (a bound without comma compares the last name); sentinels add no predicate; SEARCH superseded by the lookup icon |
| EXCLUDE RESP. PARTY TYPE = None (default) / list | `rpt_account_dim.resp_party_type NOT IN (...)`; accounts without a type kept; echoed `Ex Resp Party Type` |
| AGING BY = Account AR (default) | measure = insurance + patient (`open_amount`); threshold compares the account total |
| AGING BY = Patient AR | measure = `open_patient` only, and only items of patients whose own `rpt_patient_dim.home_office_id` is selected [I]; accounts with only an insurance balance drop out; the threshold label becomes `Patient Balance Over` |
| Account Balance Over `0.00` | account measure total `>` value (applies to debit accounts; see the credit rule below) |
| SHOW ONLY CREDIT BALANCES unticked (default) / ticked | ticked: only accounts with total `< 0`; overrides Include Credit Balance |
| Current / Over 30 / Over 60 / Over 90 / Over 120 (all ticked) | account filter: a debit account is listed when it has an open debit in at least one ticked bucket (`predicate` even when all ticked); printed columns are always all five |
| Over 120+ (Excel only; legacy default not documented, our default ticked [I]) | as `over_120` for the filter (open debit aged 120+); switches to bucket set `legacy_extended`: `bucket_over_120` (120-149), `bucket_over_150`, `bucket_over_180`, `bucket_over_270`, `bucket_over_365`, each with Est. Ins / Est. Pat, summing to the 120+ amount |
| Include Credit Balance unticked (default) | accounts with total `< 0` are left out (grand total higher than real A/R) |
| Include Credit Balance ticked | accounts with total `< 0` are listed and counted; footer `* Includes accounts with Credit Balances.` |
| Exclude patients sent to collection. | ticked: accounts with `rpt_account_dim.send_collections` dropped |
| Exclude accounts where patient portion is paid & insurance portion is expected. | ticked: accounts with patient total `<= 0` and insurance total `> 0` dropped |
| Include Balance Status | layout: adds `Bal. Status` (code + description) to line 1 of the block (DATA-35) |
| Include Contract Balances | layout: adds `Reg Cont. Bal.` and `Ort Cont. Bal.` (names inferred from the Walkout Report) to line 1 |
| SORT BY = Resp. Party Last name (default) / Resp. Party ID | order of accounts inside each office (and provider): last name, first name, `account_id` / legacy responsible-party id |

Dependency rules: `provider_basis` and `provider_ids` `enabled_when` `["eq", "group_by", "provider"]` (inferred; disabled
values `preferred_provider`, `all`); `aging_buckets` option `over_120` `visible_when` `["ne", "output_format", "xlsx"]`,
option `over_120_plus` `visible_when` `["eq", "output_format", "xlsx"]` (rule d01); `account_balance_over` label
`Patient Balance Over` when `["eq", "aging_by", "patient_ar"]` (rule d02); `include_credit_balances` ignored while
`only_credit_balances` is true. Credit rule (proposal, see Open questions 1): the threshold and the bucket predicate apply
to accounts with total `> 0`; accounts with total `< 0` are governed only by the two credit options; accounts with total
`= 0` are never listed.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `report_date` tokens | `date` | `today` | `end_of_last_month` for the month-end snapshot in schedules and saved views |
| `min_age_days` | `integer` (NEW key, owner: this catalog) | `0` | Lists only accounts whose oldest open debit is at least n days old (collection call list "over 60 and nothing paid") |
| `last_payment_before` | `date` (NEW key) | blank (no predicate) | Accounts whose last payment is before the date or that never paid |
| `exclude_accounts_with_payment_plan` | `boolean` (NEW key) | `false` | Drops accounts with an active regular or ortho contract (`rpt_payment_plan_contracts.is_active`) |
| `exclude_accounts_with_future_appointment` | `boolean` (NEW key) | `false` | Drops accounts where a member holds a future appointment (`rpt_patient_activity.next_appointment_date`), to focus calls on patients not coming in |
| `aging_bucket_set` | `enum` `legacy`, `common` (NEW key; sets of `rpt_aging_bucket_sets`) | `legacy` | `common` (31-60 / 61-90 / 91+) for dashboards comparison; echoed |
| `office_scope` `my_offices` | shared | `working_office` | Regional run |
| `compare_report_date` | `date` (NEW key) | blank | Summary format only: adds the bucket totals as of the second date and the change (month-over-month A/R movement) |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ar_open_items(:tenant_id, :report_date, NULL, 'account')` (single-office runs pass the account ids of the resolved scope as the third argument), `rpt_aging_bucket_sets`, `rpt_account_dim`, `rpt_patient_dim`, `rpt_patient_activity`, `rpt_ledger_entries` (last payment for a past date), `rpt_payment_plan_contracts` (contract balances), `rpt_provider_dim`, `rpt_office_dim` |
| Date basis | none; `report_date` role `as_of`; ages from `age_date` (procedure completed) to `report_date` |
| Office | home office `rpt_account_dim.home_office_id` (`scope.office_attribution = home_office`); NULL = `Unassigned office`. Items of any transaction office count |
| Provider | `provider_basis` (above); default run has no provider attribution |
| Account aggregates | per `account_id`: `total = Σ open_amount` (debits and unallocated credits), `ins_total = Σ open_insurance_est`, `pat_total = Σ open_patient`; per bucket `Σ` over open debits with `age_days` inside the bucket (credits are never inside a bucket). Bucket set `legacy`; with `over_120_plus` in `aging_buckets` set `legacy_extended` (Shared rules, Bucket set): `bucket_over_120` = 120-149 and `bucket_over_150`, `bucket_over_180`, `bucket_over_270`, `bucket_over_365` follow, each with its `ins_*` / `pat_*` twin |
| Credits in the three lines | an unallocated credit enters `Total Bal.` and the `Pat:` total (patient payer) or the `Ins:` total (insurance payer) [I]; buckets show debits only |
| Identity columns | `responsible_party_id` = `rpt_account_dim.legacy_key` (Denticon `RPID`) else `account_no`; name `guarantor_last_name`, `guarantor_first_name`; phones from `rpt_account_dim`; `resp_party_type` (DATA-53) |
| Last payment | `report_date = today`: `max(rpt_patient_activity.last_patient_payment_date)` over account members and the amount of that row (data card 2.19); past date: latest `rpt_ledger_entries` leg `entry_type = 'patient_payment'` with `transaction_date <= report_date`, legs of the same day summed |
| Last statement date | `rpt_account_dim.last_statement_date` (DATA-22); empty before it |
| Balance status | `rpt_account_dim.balance_status_code` + definitions label (DATA-35) |
| Contract balances | source `rpt_payment_plan_contracts` (`is_active`) only: `Reg Cont. Bal.` = `Σ pat_amount_remaining` of regular contracts; `Ort Cont. Bal.` = `Σ pat_amount_remaining` of ortho contracts (the remaining insurance side `ins_amount_remaining` is not added [I], Open questions 8); split `contract_kind` (DATA-37); app era only |
| Parameter roles | `include_balance_status` and `include_contract_balances` have `role: query` (the builder adds the columns and their dataset reads; the row population is unchanged, they do not filter) |
| Parameter application | office, name range, resp-party type, sent to collection: account predicates; patient type, provider, Patient AR office rule: item predicates before aggregation; threshold, buckets, credit options, insurance-expected: account predicates after aggregation |
| Availability | READY (coverage matrix row 15). Derived oldest-first allocation; Ins / Pat split and names on history REPAIR(10) (`split_quality` footnote when not `exact`); Exclude Resp. Party Type SCHEMA(53); Balance Status SCHEMA(35); Last Statement Date SCHEMA(22); past report date reproduces only with SCHEMA(30); migrated A/R completeness REPAIR(57); tenant-wide FIFO DATA-27 |
| Cannot be produced | an exact past ageing before snapshots (recomputed from today's rows, `availability[]` `as_of_recomputed`); preferred provider for migrated patients (fallback only); contract balances of migrated contracts (none migrated); the account as it was before a guarantor change |

### Output

Format `detail`, block `accounts` (table, main). Grouping `fixed_outer` office (`Office : {office_name}`, subtotal rows
`Total :` / `Ins:` / `Pat:` and `Total Accounts with A/R : {count}`), option `group_by = provider` adds level provider
(`Provider : {provider_short_id} - {provider_name}`, same subtotal rows). Grand total over all offices when the run
resolves to more than one office [I]. One row per account (per account and provider when grouped); the PDF renders it as
the three-line block.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `responsible_party_id` | Resp Party ID | text | `phi_identified` (key) | count_distinct `account_id` -> `Total Accounts with A/R` |
| `responsible_party_name` | Name | text `Last, First` | `phi_identified` (key) | label |
| `resp_party_type` | Type | text | `phi_identified` | none |
| `phone_home`, `phone_cell` | (H):, (C): | text | `phi_identified` | none |
| `last_payment_date` | Lst Pay Date | date | `phi_identified` | none |
| `last_payment_amount` | Lst Pay Amount | money | `financial_patient` | none |
| `last_statement_date` | Lst Stmt Date | date | `phi_identified` | none |
| `balance_status` | Bal. Status | text | `phi_identified` | none; `visible_when` `["truthy", "include_balance_status"]` |
| `reg_contract_balance`, `ortho_contract_balance` | Reg Cont. Bal., Ort Cont. Bal. | money | `financial_patient` | sum; `visible_when` `["truthy", "include_contract_balances"]` |
| `bucket_current` ... `bucket_over_120` | Current, Over 30, Over 60, Over 90, Over 120 | money | `financial_patient` | sum |
| `total_balance` | Total Bal. | money | `financial_patient` | sum |
| `ins_current` ... `ins_over_120`, `ins_total` | Ins: per bucket, total | money | `financial_patient` | sum |
| `pat_current` ... `pat_over_120`, `pat_total` | Pat: per bucket, total | money | `financial_patient` | sum |
| `bucket_over_150`, `bucket_over_180`, `bucket_over_270`, `bucket_over_365`; `ins_over_150` ... `ins_over_365`; `pat_over_150` ... `pat_over_365` | Over 150 ... Over 365, Est. Ins, Est. Pat | money | `financial_patient` | sum; `visible_when` `["in", "aging_buckets", ["over_120_plus"]]`; `export` xlsx and screen only. Under this set `bucket_over_120` / `ins_over_120` / `pat_over_120` hold 120-149 only, so the row total is not double-counted |
| `split_quality_note` | (footnote) | text | `aggregate` | none |
| hidden: `account_id` (row id with provider key), `office_id`, `provider_id`, `sort_last_name`, `sort_first_name`, `guarantor_patient_id` | | | entity classes (rule 6) | |

Format `summary`, block `office_summary` (table): one row per office (per office and provider when grouped) and portion
(`portion` = `Total`, `Ins:`, `Pat:`): `office_name` (`aggregate`), `provider_name` (`provider_comp` when grouped),
`portion`, five bucket columns, `total_balance` (all `financial_practice`), `account_count` (`aggregate`); grand total
rows; `compare_*` columns when `compare_report_date` is set.

Sort: `sort_by` `responsible_party_last_name` (keys `sort_last_name`, `sort_first_name`, `account_id`) /
`responsible_party_id` (`responsible_party_id`, `account_id`); `row_id_column` `account_id` (+ `provider_id`). Page break:
office (PDF new page per office). Summary cards: `total_balance`, `ins_total`, `pat_total`, `account_count`, `bucket_over_90`
total, `bucket_over_120` total (the 90+ share is shown in the bucket chart, not as a card). `reconciles_with`: grand `total_balance` with credits included = metric `total_ar`
(`ar_office_attribution = home_office`) as of `report_date` (R-05). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

Chart: stacked bar of the five bucket totals per office (Summary and Detail header), split Ins / Pat; second chart donut
of `ins_total` versus `pat_total`. Drill:

| Click | Target | Parameters passed |
|---|---|---|
| Account row / name | `ledger.ledger_report` | `report_type = account_ledger`, `account_id`, `date_preset = trailing_12_months` (needs `phi_identified`) |
| Bucket cell of an account | `ledger.account_allocation` | `account_id`, `date_to = report_date` (the open items behind the bucket) |
| Office or provider bucket subtotal (Summary) | same report, `kind = rows` | `report_format = detail`, office, provider, `aging_buckets = [clicked bucket]` |
| `Total Bal.` of a credit account | `worklists.unallocated_credits` | `account_id` |
| Account count | same report, `kind = rows` | `report_format = detail` |

### Actions

The Detail format doubles as the collection worklist (hand-off target of `worklists.patient_ar`).

| Action | Scope / kind | Detail |
|---|---|---|
| Open account ledger | row, `navigate` -> `patient_account_ledger` | right of the ledger screen; `phi_identified` |
| Open guarantor patient | row, `navigate` -> `patient_overview` | when the guarantor is a patient |
| Collection letter | bulk, `letters` | hand-off of the selected accounts to the letters batch (PD-15); excludes `no_correspondence` |
| Balance reminder text | bulk, `send_sms` | `requires: sms_consent`; exclusions counted (`no_auto_sms`, `sms_opt_out_at`) |
| Balance reminder e-mail | bulk, `send_email` | `no_auto_email` excluded; no amounts in the message body unless the template allows (08) |
| Follow-up task | bulk, `create_task` | one task per account to a chosen user ("collection call") |
| Send statements | bulk, `navigate` -> `statements` with the selected accounts | statement run of the Statements screen |
| Export selection | bulk, `export_selection` | needs `reports_export_data_files` |

### Export and print

PDF: layout `aging_block` (NEW renderer key: three-line account block with dashed rule, row tags `Ins:` / `Pat:`, phones on
line 2), landscape, letterhead, repeating column header, office totals and `Total Accounts with A/R` at office end, footer
criteria echo exactly as the legacy list (Report Date, Start / End Name, Patient Type, Offices, Provider, Ex Resp Party
Type, Aging, Account / Patient Balance Over, credit flag). Summary: `banded_table`. XLSX: Detail one flat sheet with
`Office` first, identity columns, then per bucket the triple `<bucket>`, `<bucket> Est. Ins`, `<bucket> Est. Pat`
(extended triples with Over 120+), typed cells, frozen header, autofilter, no merged cells; Summary one sheet [I] (the
only legacy Excel sample is Detail; whether Summary is offered with PRINT FORMAT = Excel is Open questions 10); `Criteria`
sheet. CSV: Detail flat as the xlsx. Background for tenant-wide runs (data card 2.13: tenant-wide FIFO is a background
job); the artifact is delivered by link.

### Open questions

| # | Question |
|---|---|
| 1 | How the threshold and the bucket boxes treat credit accounts when Include Credit Balance is ticked (proposal: they apply to debit accounts only) |
| 2 | Where an unapplied credit prints in the three lines (Total only, `Pat:` / `Ins:`, or a bucket) |
| 3 | AGING BY = Patient AR: does "only the patient balances for this office" mean the patient's own home office (our reading) or the account's |
| 4 | Provider filter: whole accounts or only the provider's items (family 5); Preferred Provider of a multi-patient account |
| 5 | Summary and GROUP BY PROVIDER layouts (family 6); grand total over offices |
| 6 | `Over 120+` default state and info-icon text (family 4); bucket boundary day (family 3) |
| 7 | PATIENT TYPE: item-level (our rule) or account-level filter |
| 8 | Last payment: patient payments only (our rule, data card) or any payer; position of Balance Status and contract balances on the page; is `Ort Cont. Bal.` the patient remainder only (our rule) or patient + insurance remainder |
| 9 | Content of the EXCLUDE RESP. PARTY TYPE dialog (never captured) |
| 10 | Is REPORT FORMAT = Summary available (or greyed) with PRINT FORMAT = Excel |

## Aging Report - `monthly.aging_report`

Monthly Reports, screenshot `4.PNG` (criteria panel pixel-identical to `3.PNG`, SORT BY clipped) - P2 - M - `reports_monthly_reports_screen_view_only` / `_full_control` (family `monthly`) - interactive (background as Aging Report by Home Office) - DOCUMENTED (Detail); Summary and GROUP BY PROVIDER PARTIALLY DOCUMENTED

### Purpose

The single-location ageing: the same responsible-party / insurance / patient / bucket layout as
`monthly.aging_report_by_home_office`, but it evaluates **only the transactions recorded in each selected office** -
A/R by transaction office. Recommended by the vendor for single-location practices (daily / weekly collection work,
`Aging Report - Detail` with Include Balance Status; `Aging Report - Summary` with Include Credit Balance for the
real A/R); explicitly not recommended for multi-location organisations. In DentC it is also the per-office A/R that the
Executive Day Sheet and the Executive Summary roll forward (R-14b) and the drill target of the A/R dashboard tiles.

### Legacy output

Confidence: Detail DOCUMENTED (2019 and 2025 samples); Summary and GROUP BY PROVIDER PARTIALLY DOCUMENTED. Printed titles
`Aging Detail` (2019), `Aging Report - Detail` (2025); Summary title `Aging Report - Summary` [I from the old menu name].

Columns, three-line block, totals (`Total Accounts with A/R : n`, `Total :` / `Ins:` / `Pat:`) and footer echo are
identical to Aging Report by Home Office (section above). Differences:

| Topic | Aging Report | Aging Report by Home Office |
|---|---|---|
| Transactions considered | only those recorded at the selected office | all transactions of the account |
| Account listed under | each selected office where its office balance is non-zero | its home office only |
| Vendor example: charge 100 at A, payment 100 at B | A shows 100 due; B shows a 100 credit (with Include Credit Balance) although the ledger is 0 | account not listed |
| Sum across all offices | organisation A/R only with credit balances included | organisation A/R |

Quirks kept: accounts with a 0.00 ledger balance appear in multi-location organisations (debit at one office, credit at
another); the default run excludes credit balances, so the default total is above the real A/R and does not equal the
Executive Summary A/R block (which nets credits); Account AR can pull balances of dependants who belong to another
office.

### Parameters - legacy parity

<!-- PARITY:montly_reports.r04:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT FORMAT | (no label) (radio_group) | **Detail** / Summary | `report_format` | enum | Detail -> `detail`, Summary -> `summary` | `detail` | replicated | Greyed on 835 Denial Report while PRINT FORMAT = Excel (vendor documentation: Excel exists only as Detail). On the Daily Production Report the Detail option alone is greyed until PRODUCTION BY = Provider (option_enabled_when). |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first; enhanced with csv. On this report output_format has role: query (04 section 8) because over_120_plus depends on it (rule d01, inferred for this report). Excel is a flat typed sheet: Office, then per bucket the triple <bucket>, <bucket> Est. Ins, <bucket> Est. Pat. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (token working_office). Aging Report: the selected offices are TRANSACTION offices - only the legs recorded in each selected office are allocated and aged against each other (rpt_ar_open_items unit account_office, scope.office_attribution = transaction office). An account is listed under every selected office where its office balance is non-zero, so an account with a 0.00 ledger balance can show a debit at one office and a credit at another (vendor example). |
| PROVIDER | GROUP BY PROVIDER (checkbox) | **unchecked** | `group_by.provider` | enum | - | `false` | replicated | Ticked sets group_by = provider and enables the provider basis radio and the Provider picker. Member checkbox: default false = unticked, so group_by = none (the Shared-rules value 'none' is the same state). |
| PROVIDER | (no label) (radio_group) | **Preferred Provider** / Transaction Provider - greyed out | `provider_basis` | enum | Preferred Provider -> `preferred_provider`, Transaction Provider -> `transaction_provider` | `preferred_provider` | replicated | Enabled when: group_by == provider (inferred). Greyed until GROUP BY PROVIDER is ticked. |
| PROVIDER | Provider (picker) | shown: ALL - greyed out | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Enabled when: group_by == provider (inferred). Provider picker, enabled with GROUP BY PROVIDER. Filters the provider column chosen by provider_basis: preferred_provider = rpt_patient_dim.preferred_provider_id (fallback rpt_patient_activity.last_visit_provider_id), transaction_provider = rpt_ar_open_items.provider_id. ALL = no restriction. Account-versus-item effect of the filter not documented - confirm on the live tool. |
| REPORT DATE | Report Date (date_input) | shown: 11/21/2026 | `report_date` | date | - | `today` | replicated_enhanced | Report date with role as_of: balances per account and office at the end of that office-local day; ageing starts when the procedure is completed. A past date is recomputed from today's rows until DATA-29 / DATA-30. Default today in the office time zone (relative token). |
| PATIENT TYPE | (no label) (radio_group) | **Both** / General / Ortho | `patient_type` | enum | Both -> `both`, General -> `general`, Ortho -> `ortho` | `both` | replicated | Ortho-patient flag, not the user-defined patient types of INCLUDE / EXCLUDE PATIENT TYPE. Applied as an item filter on rpt_patient_dim.is_ortho_patient of the open item's patient before account aggregation (inferred) - confirm on the live tool whether whole accounts or items are filtered. |
| RESPONSIBLE PARTY NAME RANGE | Start Name (text_input) | shown: AAAAA | `responsible_party_name_from` | text_range | - | `AAAAA` | replicated | Start of the alphabetical range on the responsible-party sort name 'Last, First' (rpt_account_dim), prefix rule of 04: a bound without a comma compares the last name only (vendor-documented meaning). AAAAA / ZZZZZ are open bounds. Needs data class phi_identified. |
| RESPONSIBLE PARTY NAME RANGE | SEARCH (button) | - | `responsible_party_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| RESPONSIBLE PARTY NAME RANGE | End Name (text_input) | shown: ZZZZZ | `responsible_party_name_to` | text_range | - | `ZZZZZ` | replicated | End of the range on the responsible-party sort name (inclusive, prefix rule). |
| RESPONSIBLE PARTY NAME RANGE | SEARCH (button) | - | `responsible_party_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| EXCLUDE RESP. PARTY TYPE | (no label) (picker) | shown: None | `exclude_resp_party_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter on rpt_account_dim.resp_party_type: None = exclude nothing; accounts without a type are kept; echoed as 'Ex Resp Party Type'. Needs DATA-53. Dialog content was never captured - confirm on the live tool. |
| AGING BY | (no label) (radio_group) | **Account AR** / Patient AR | `aging_by` | enum | Account AR -> `account_ar`, Patient AR -> `patient_ar` | `account_ar` | replicated | Patient AR also renames the threshold to Patient Balance Over (rule d02). account_ar = insurance + patient open amounts of the account within each transaction office; patient_ar = open_patient of the account's items in that office (the home-office reading of the sibling report does not apply to the transaction-office unit; inferred). |
| AGING BY | Account Balance Over (number_input) | shown: 0.00 | `account_balance_over` | decimal | - | `0.00` | replicated | Balance > value, on the measure chosen by aging_by. The threshold applies to accounts (account-office pairs on Aging Report) with total > 0 only; accounts with total < 0 are governed by include_credit_balances / only_credit_balances alone; total = 0 is never listed (inferred credit rule, otherwise ticking Include Credit Balance could list no credit account under '> 0.00') - confirm on the live tool. |
| AGING | SHOW ONLY CREDIT BALANCES (checkbox) | **unchecked** | `only_credit_balances` | boolean | - | `false` | replicated | Sits inside the AGING section header bar. |
| AGING | Current (checkbox) | **checked** | `aging_buckets.current` | enum_multi | - | `true` | replicated | Aging bucket checkbox (account filter, predicate even when all ticked). Vendor documentation: Excel output shows Over 120+ in place of Over 120. The bucket predicate applies to debit accounts only: credits never sit inside a bucket (data card 2.14), so credit accounts are governed by the two credit options alone (inferred; shared rule to be stated in 04 2.5 for aging_buckets). |
| AGING | Over 30 (checkbox) | **checked** | `aging_buckets.over_30` | enum_multi | - | `true` | replicated | Aging bucket checkbox (account filter, predicate even when all ticked). Vendor documentation: Excel output shows Over 120+ in place of Over 120. The bucket predicate applies to debit accounts only: credits never sit inside a bucket (data card 2.14), so credit accounts are governed by the two credit options alone (inferred; shared rule to be stated in 04 2.5 for aging_buckets). |
| AGING | Over 60 (checkbox) | **checked** | `aging_buckets.over_60` | enum_multi | - | `true` | replicated | Aging bucket checkbox (account filter, predicate even when all ticked). Vendor documentation: Excel output shows Over 120+ in place of Over 120. The bucket predicate applies to debit accounts only: credits never sit inside a bucket (data card 2.14), so credit accounts are governed by the two credit options alone (inferred; shared rule to be stated in 04 2.5 for aging_buckets). |
| AGING | Over 90 (checkbox) | **checked** | `aging_buckets.over_90` | enum_multi | - | `true` | replicated | Aging bucket checkbox (account filter, predicate even when all ticked). Vendor documentation: Excel output shows Over 120+ in place of Over 120. The bucket predicate applies to debit accounts only: credits never sit inside a bucket (data card 2.14), so credit accounts are governed by the two credit options alone (inferred; shared rule to be stated in 04 2.5 for aging_buckets). |
| AGING | Over 120 (checkbox) | **checked** | `aging_buckets.over_120` | enum_multi | - | `true` | replicated | Aging bucket checkbox (account filter, predicate even when all ticked). Vendor documentation: Excel output shows Over 120+ in place of Over 120. The bucket predicate applies to debit accounts only: credits never sit inside a bucket (data card 2.14), so credit accounts are governed by the two credit options alone (inferred; shared rule to be stated in 04 2.5 for aging_buckets). |
| AGING | Include Credit Balance (checkbox) | **unchecked** | `include_credit_balances` | boolean | - | `false` | replicated | false = per office, accounts whose office balance is negative are left out (legacy default); true = they are listed. Only with true does the sum over all offices equal organisation A/R (vendor documentation). Ignored while only_credit_balances is true. |
| OTHER OPTIONS | Exclude patients sent to collection. (checkbox) | **unchecked** | `exclude_sent_to_collection` | boolean | - | `false` | replicated | - |
| OTHER OPTIONS | Exclude accounts where patient portion is paid & insurance portion is expected. (checkbox) | **unchecked** | `exclude_insurance_expected_accounts` | boolean | - | `false` | replicated | - |
| OTHER OPTIONS | Include Balance Status (checkbox) | **unchecked** | `include_balance_status` | boolean | - | `false` | replicated | role: query (the builder adds the column and its dataset read; the row population is unchanged, it does not filter): prints the account balance status (code + description) on the account block. Needs DATA-35 (accounts.balance_status_code, definitions group balance_status); until then the column is empty and the report prints an availability warning. |
| OTHER OPTIONS | Include Contract Balances (checkbox) | **unchecked** | `include_contract_balances` | boolean | - | `false` | replicated | role: query (the builder adds the columns and the read of rpt_payment_plan_contracts; the row population is unchanged, it does not filter): Reg Cont. Bal. / Ort Cont. Bal. = sum of pat_amount_remaining of the account members' active (is_active) regular / ortho contracts of rpt_payment_plan_contracts (DATA-37); the ortho insurance remainder ins_amount_remaining is not added (inferred). Column names inferred from the Walkout Report - confirm both on the live tool. Contract balances are account-level, not per office: printed on the account's line of each office where it appears. |
| SORT BY | (no label) (radio_group) | **Resp. Party Last name [?]** / Resp. Party ID [?] | `sort_by` | enum | Resp. Party Last name [?] -> `responsible_party_last_name`, Resp. Party ID [?] -> `responsible_party_id` | `responsible_party_last_name` | replicated | Labels confirmed by vendor screenshots of the identical panel ([?] kept only because option keys must match the index). responsible_party_last_name = guarantor last name, first name, account_id; responsible_party_id = legacy responsible-party id (rpt_account_dim.legacy_key, else account_no). Sorted inside each office (and provider when grouped). |
| AGING | Over 120+ (checkbox) † | **unchecked** | `aging_buckets.over_120_plus` | enum_multi | - | `true` | replicated | Legacy default undocumented; default true inferred (it replaces the Over 120 box, which is ticked by default, and the form carries the over_120 state across the format switch, so a direct xlsx run from a saved view or URL also starts ticked). Shared vendor-doc parameter of 04: member over_120_plus of aging_buckets, shown only when output_format == xlsx, in place of over_120 (rule d01) - inferred for this report from the pixel-identical panel of Aging Report by Home Office. With it the run uses bucket set legacy_extended: bucket_over_120 = 120-149, then bucket_over_150 / bucket_over_180 / bucket_over_270 / bucket_over_365 with ins_* / pat_* twins, summing to the 120+ amount; as an account filter it tests a balance aged 120+ days. Info-icon tooltip text not documented - read default and tooltip on the live tool with PRINT FORMAT = Excel. |

† From vendor documentation - not visible in our screenshot of this screen (hidden row, collapsed dropdown or another report mode).

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| PRINT FORMAT = Excel | In the AGING section the bucket checkbox `Over 120` is replaced by the checkbox `Over 120+` (with an info icon); with PRINT FORMAT = PDF the plain `Over 120` checkbox is shown. | Same as Aging Report by Home Office (inferred for this report from the pixel-identical panel): aging_buckets option over_120 visible_when output_format != xlsx, option over_120_plus visible_when output_format == xlsx; output_format is role: query here; the form carries the ticked state between the two members on a format change; over_120_plus switches to bucket set legacy_extended (bucket_over_120 = 120-149, bucket_over_150 / _180 / _270 / _365) and filters on a balance aged 120+ days. Confirm on the live tool that Over 120+ appears on this report. |
| AGING BY = Patient AR | The threshold field `Account Balance Over` is relabelled `Patient Balance Over`; with AGING BY = Account AR the label is `Account Balance Over`. | account_balance_over is labelled 'Patient Balance Over' when aging_by == patient_ar, else 'Account Balance Over' (label_when, shared rule of 04); the predicate compares open_patient (patient_ar) or the open_amount total (account_ar) of the account within each transaction office (unit account_office). |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `aging_buckets` | option_visible_when | output_format == xlsx | over_120_plus | inferred - Excel shows Over 120+ (with an info icon) in place of Over 120. |
| `aging_buckets` | option_visible_when | output_format != xlsx | over_120 | inferred |
| `account_balance_over` | label_when | aging_by == patient_ar | Patient Balance Over | documented - Label of the threshold follows AGING BY. |
<!-- PARITY:montly_reports.r04:END -->

Every option has the effect described for `monthly.aging_report_by_home_office` with the office unit `account_office`
(open items computed per account **and** transaction office, `rpt_ar_open_items.unit_office_id`). The options whose
effect differs:

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT = Detail (default) / Summary | Detail: one block per account per office where the account's office balance is non-zero; Summary: per office the total / Ins / Pat bucket rows and the account count |
| PRINT FORMAT = PDF (default) / Excel | as the home-office report; Excel shows Over 120+ in place of Over 120 (rule d01, inferred for this report from the identical panel) and re-runs |
| OFFICE/GROUP = Office (default) + picker `108` / Office Group | transaction offices: only legs with `office_id` in the selection are allocated and aged against each other; one `Office :` section per office |
| GROUP BY PROVIDER / Preferred Provider / Transaction Provider / Provider picker | as the home-office report, inside each office section; Transaction Provider = provider of the open item of that office |
| Report Date (default today) | as of the end of that day, per office unit |
| PATIENT TYPE Both / General / Ortho | item filter on the patient of the office-unit item |
| Start Name / End Name (+ SEARCH), EXCLUDE RESP. PARTY TYPE | account predicates, as the home-office report |
| AGING BY = Account AR (default) | measure `open_amount` of the account's items in that office (all members, so dependants of another home office count) |
| AGING BY = Patient AR | measure `open_patient` of the account's items in that office; accounts with only an insurance balance in that office drop out; label `Patient Balance Over` (rule d02) |
| Account Balance Over `0.00` | office-level account total `>` value |
| SHOW ONLY CREDIT BALANCES | only (account, office) pairs with office total `< 0` - the false credits of cross-office payments appear here |
| Current ... Over 120 (all ticked), Over 120+ (Excel) | (account, office) pairs with an open debit of that office in a ticked bucket |
| Include Credit Balance unticked (default) / ticked | (account, office) pairs with office total `< 0` left out / listed; only ticked does the sum over all offices equal organisation A/R |
| Exclude patients sent to collection., Exclude accounts where patient portion is paid & insurance portion is expected. | as the home-office report, tested on the office-level totals (insurance-expected) and the account flag (collection) |
| Include Balance Status | account-level status printed on each office line of the account |
| Include Contract Balances | account-level contract balances printed on each office line of the account (not split by office) |
| SORT BY = Resp. Party Last name (default) / Resp. Party ID | inside each office (and provider) |

Dependency rules: identical to the home-office report (`provider_basis` / `provider_ids` `enabled_when` `["eq",
"group_by", "provider"]`; d01 option visibility on `output_format` with `role: query`; d02 label rule; credit rule as
proposed there).

### Parameters - enhancements

The enhancement keys of `monthly.aging_report_by_home_office` (`min_age_days`, `last_payment_before`,
`exclude_accounts_with_payment_plan`, `exclude_accounts_with_future_appointment`, `aging_bucket_set`,
`compare_report_date`, `report_date` tokens), with the same defaults, plus:

| Key | Type | Default | Effect |
|---|---|---|---|
| `only_cross_office_accounts` | `boolean` (NEW key, owner: this catalog) | `false` | Lists only accounts that carry a non-zero balance in two or more of the resolved offices (the false debit / credit pairs to clean up by a transfer); needs `all` or several offices |
| `show_account_ledger_balance` | `boolean` (NEW key) | `false` | Adds column `Acct. Bal.` (the account's balance over all offices, unit `account`) beside the office `Total Bal.`, so a 0.00 account with an office debit is visible at a glance |

### Data

| Item | Rule |
|---|---|
| Datasets | as the home-office report, with `rpt_ar_open_items(:tenant_id, :report_date, NULL, 'account_office')` (bucket set `legacy`, `legacy_extended` with `over_120_plus`, as there); `show_account_ledger_balance` also calls unit `account` for the listed accounts |
| Office | transaction office `rpt_ar_open_items.unit_office_id` (`scope.office_attribution = transaction_office`); a real allocation link is kept only when both legs sit in the same office; NULL office = `Unassigned office` (migrated payments of unknown office: a credit there) |
| Provider, last payment, statement date, balance status, contract balances | as the home-office report (last payment and contract balances are account-level, not per office [I]) |
| Ties to | per-office ledger balance `Σ rpt_ledger_entries.amount GROUP BY office_id` as of `report_date` when credits are included (R-14b) |
| Availability | READY (coverage matrix row 16), with the same option ratings as the home-office report: SCHEMA(53) resp. party type, SCHEMA(35) balance status, SCHEMA(22) last statement date, SCHEMA(30) past report date, REPAIR(10) split and names on history, REPAIR(57) completeness; tenant-wide runs DATA-27 |
| Cannot be produced | as the home-office report; in addition the legacy per-office allocation of migrated history is derived (oldest first inside each office), so a migrated account can show a different office split than Denticon printed |

### Output

Same blocks, columns, data classes, sort options and totals as `monthly.aging_report_by_home_office` (block `accounts` for
Detail, `office_summary` for Summary), with these changes:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `account_ledger_balance` | Acct. Bal. | money | `financial_patient` | none (an account can repeat across offices); `visible_when` `["truthy", "show_account_ledger_balance"]` |
| `other_office_count` | Other Offices | integer | `aggregate` | none; `visible_when` `["truthy", "only_cross_office_accounts"]` |
| hidden `row_id` | | id | `phi_identified` | `<account_id>:<unit_office_id>[:<provider_id>]` |

Grouping `fixed_outer` office = `unit_office_id`. Grand total across offices is the sum of the office totals (with credits
included it equals organisation A/R). `reconciles_with`: office `total_balance` with credits included = metric `total_ar`
(`ar_office_attribution = transaction_office`) of that office as of `report_date`; also equals the Executive Summary
`total_ar` of a single-day run (RPT-MONTHLY-08). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

Charts as the home-office report (bucket stack per office). Drill as the home-office report, plus: an account row with
`only_cross_office_accounts` -> `monthly.aging_report_by_home_office` with `account_id` filter through `param_map`
(`responsible_party_name_from` / `_to` = the account's sort name) to show the netted view; Summary office total ->
`monthly.executive_day_sheet` with the office and `date_preset = month_to_date` (the movement behind the balance).
A/R dashboard tiles drill here with `report_date` and `aging_buckets` (06 drill table).

### Actions

Same row and bulk actions as the home-office report (open account ledger, collection letter, SMS, e-mail, task, statements,
export selection). Additional row action `Transfer balance between offices` (`navigate` -> `patient_account_ledger` with
the transfer dialog preselected) for cross-office pairs; offered only with `only_cross_office_accounts` and the ledger
Full Control right. Doubles as a worklist as the home-office report.

### Export and print

As the home-office report: PDF `aging_block` landscape with the legacy footer echo and title `Aging Report - Detail` /
`Aging Report - Summary` (`title_templates` by `report_format`), new page per office; XLSX flat with `Office` first and the
bucket triples (extended with Over 120+); CSV flat; background for tenant-wide runs. The added columns export to all three
formats.

### Open questions

| # | Question |
|---|---|
| 1 | Does Over 120+ exist on this report with PRINT FORMAT = Excel (rule d01 inferred from the identical panel) |
| 2 | Are last payment, Balance Status and contract balances printed per office line or once per account |
| 3 | Credit rule, Patient AR meaning, provider filter and Summary layout: as open questions 1, 3, 4, 5 of the home-office report |
| 4 | Accounts with a 0.00 office balance but open debits and credits inside one office (parked remainders after DATA-26): listed or not |
| 5 | Is REPORT FORMAT = Summary available (or greyed) with PRINT FORMAT = Excel (only a Detail Excel sample exists) |

## Income Allocation - `monthly.income_allocation`

Monthly Reports, screenshot `5.PNG` - P2 - L - `reports_monthly_reports_screen_view_only` / `_full_control` - background (allocation as of two dates over every account of the allocation offices; see Data) - DOCUMENTED (Summary, both vendor formulas checked against two published samples); PARTIALLY DOCUMENTED (Detail, layout INFERRED)

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Owner, payroll, regional finance | Month end or per pay period; run per location where the provider treated, and for all offices when providers work across offices of one account `[D]` | Collection-based provider pay: the provider is paid on the `Income` column (right-most) x the compensation percentage `[D]` |
| Office manager | Before the pay run | Find back-dated payments and payments made outside the range but allocated inside it (Detail: `Pay Date`, `Allo Date`, `Proc Date`) `[D]` |
| Finance | Month end | Per-provider receivable roll-forward (`Beginning Balance` to `Ending Balance`) and the size of the `Unallocated` pool |

### Legacy output

Summary - DOCUMENTED `[S]` 2012 and 2026 samples. Title `Income Allocation Report - Summary`; band `Office : <name>`; one
row per provider (zero rows included), then an `Unallocated` row and a `Total :` row; footer `From`, `Thru`,
`Providers : ALL`. Columns in printed order (2026 build):

| # | Printed label | Vendor definition | Our key |
|---|---|---|---|
| 1 | `Prov ID` | provider id | `provider_short_id` |
| 2 | `Last, First Name` | provider name | `provider_name` |
| 3 | `Beginning Balance` | provider balance before the From date (production charged, not yet collected) | `beginning_balance` |
| 4 | `Charges (+)` | production in the range | `charges` |
| 5 | `Production Adjust (+)` | production adjustments > 0, `IsIncome = 1` | `production_adjust_pos` |
| 6 | `Production Adjust (-)` | production adjustments < 0, `IsIncome = 1` | `production_adjust_neg` |
| 7 | `Payments (-)` | payments (patient and insurance) of the range allocated to the provider | `payments` |
| 8 | `Prev Alloc (-)` | money allocated in the range that was entered before the From date (production adjustments ignored) | `prev_allocation` |
| 9 | `Prev Alloc Prod Adj (-)` | amount allocated to previous production adjustments | `prev_allocation_prod_adj` |
| 10 | `Income Adj (-)` | collection adjustments < 0, `IsIncome = 1` | `income_adjust_neg` |
| 11 | `Prev Alloc Income Adj (-)` | not defined by the vendor; by analogy collection credit adjustments entered before the range and allocated in it `[I]` | `prev_allocation_income_adj` |
| 12 | `Income Adj (+)` | collection adjustments > 0, `IsIncome = 1` | `income_adjust_pos` |
| 13 | `Ending Balance` | provider balance as of the To date | `ending_balance` |
| 14 | `Non Income` | every `IsIncome = 0` transaction, never allocated | `non_income` |
| 15 | `Income` | provider income, the pay base | `income` |

Formulas (2026 build; the vendor's 2022 formula plus the two terms found by checking the sample):

```text
income         = payments + prev_allocation + income_adjust_neg + prev_allocation_income_adj - income_adjust_pos
ending_balance = beginning_balance + charges + production_adjust_pos - production_adjust_neg - payments
                 - prev_allocation - prev_allocation_prod_adj - income_adjust_neg - prev_allocation_income_adj
                 + income_adjust_pos + non_income
```

Sign convention (report-specific, documented by the sample arithmetic): columns 4-12 print **positive magnitudes**
and the operator is in the label (`(+)` / `(-)`); `Beginning Balance`, `Ending Balance`, `Non Income` and `Income` print
signed with a leading minus. This overrides the family rule "signed as in `rpt_ledger_entries`" for this report only.

Detail - PARTIALLY DOCUMENTED. Old name `Income Allocation - Detail`. Documented: individual lines each with `Pay Date`,
`Allo Date` and `Proc Date` `[D]`. INFERRED: title `Income Allocation Report - Detail`; grouped by provider; one line per
allocation (payment or collection adjustment against a procedure or debit adjustment) with payer / patient, code,
amount and the three dates; provider subtotals that equal the provider's Summary income columns.

Quirks kept: created-date basis (a payment entered Feb 1 and back-dated to Jan 15 is February money); allocation office
(where the procedure was charged); live report (reallocations and late entries change past periods until a period is
frozen); not reconcilable with production or collection reports; a prepayment is collection but not allocation.
Deliberately fixed: none in the figures; the run prints which allocations are derived and which periods are frozen.

### Parameters - legacy parity

<!-- PARITY:montly_reports.r05:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT FORMAT | (no label) (radio_group) | **Detail** / Summary | `report_format` | enum | Detail -> `detail`, Summary -> `summary` | `detail` | replicated | Detail = one line per allocation (payment or collection adjustment against a procedure) with Pay Date, Allo Date and Proc Date, grouped by provider (layout inferred, PARTIALLY DOCUMENTED); Summary = one row per provider (zero rows included) plus an Unallocated row and a Total row, with the roll-forward columns Beginning Balance ... Ending Balance, Non Income, Income (documented). Legacy default Detail kept. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (token working_office); several offices or an office group allowed. Income Allocation: the selected offices are ALLOCATION offices - money is credited to the office where the paid procedure was charged (rpt_payment_allocations.allocation_office_id), not the office where the payment was entered. The Unallocated row (method = unallocated, no debit) is attributed to the credit's own office (credit_office_id) - inferred, confirm on the live tool. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Allocation provider: the provider of the completed work the money was allocated to (rpt_payment_allocations.allocation_provider_id). NULL prints as a separate 'Unassigned provider' row, which is not the Unallocated row. Not the provider on the payment line. ALL = no restriction; the Unallocated row is printed only under ALL - a builder rule, not an enabled_when, and inferred (it belongs to no provider): confirm on the live tool. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis created_date (04 7.2 row 28, documented; supersedes the coverage matrix's 'allocation date'). Dating per roll-forward column: payments, prev_allocation, prev_allocation_prod_adj, income_adjust_neg, prev_allocation_income_adj by the credit's created date (credit_created_date; prev columns: created before date_from, allocated in range); income_adjust_pos, non_income and transfer legs by their created_date; charges, production adjustments and unclassified_adjust by transaction_date (inferred). A payment entered Feb 1 and back-dated to Jan 15 falls in February. Beginning Balance is as of date_from - 1, Ending Balance as of date_to. Migrated money rows carry the load timestamp as created_at until the created-date restore (REPAIR(10)); the run prints an availability warning for ranges before the migrated-through date. Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the created-date range (see Start Date); also the as-of date of Ending Balance. Default today in the office time zone; enhanced with presets and relative tokens. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:montly_reports.r05:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | `report_format = detail`: allocation lines grouped office > allocation provider, provider subtotals of the income columns, office and grand totals |
| REPORT FORMAT `Summary` | `report_format = summary`: one roll-forward row per provider, `Unallocated` row, `Total :` row per office |
| OFFICE/GROUP `Office` (default) + picker (default the working office, `108`) | `office_ids`; filters `allocation_office_id` of allocation rows and `office_id` of the non-allocated legs (charges, production adjustments, income adjustments (+), non-income); the `Unallocated` row by `credit_office_id`. One section per resolved office |
| OFFICE/GROUP `Office Group` + picker | `office_group_id` / `office_group_ids`: resolved to the group's offices, same columns; still one section per office |
| PROVIDER `ALL` (default) | no provider predicate; every provider with activity or on the roster of the office is listed, plus `Unallocated` and `Unassigned provider` rows |
| PROVIDER list | `allocation_provider_id IN (...)` on allocation rows, `provider_id IN (...)` on the other legs; the `Unallocated` row is not printed (it belongs to no provider) [I]; the footer echo lists the provider ids |
| DATE RANGE Start Date (default today) | lower bound of `credit_created_date` for the allocation columns (payments, prev allocations, `income_adjust_neg`); of `created_date` for `income_adjust_pos`, `non_income` and transfer legs; of `transaction_date` for charges, production adjustments and `unclassified_adjust` [I]; `beginning_balance` is computed as of `date_from - 1` |
| DATE RANGE End Date (default today) | inclusive upper bound of the same dates; `ending_balance` and the unallocated cut are as of `date_to` |
| PRINT / PREVIEW, CLEAR CRITERIA, ADD TO MY FAVORITES | `print`, `frontend`, `saved_view` (family rule) |

Dependency rules: none on the legacy screen. Engine rule: with `provider_ids != all` the `Unallocated` row is suppressed by
the builder (not a parameter rule).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_range` presets | `date_range` | `today` (legacy) | Offered: `last_month` (pay month), `last_2_weeks`, `last_quarter`, `month_to_date`; a saved view "Provider pay - last month" stores the preset, so a monthly schedule always reads the closed month |
| `office_layout` | `enum` NEW (owner `04_filter_framework.md`) | `per_office` (legacy) | `consolidated`: one provider table across all resolved offices with an `office_count` column, for providers paid across offices of one organisation |
| `split_payments_by_payer` | `boolean` NEW (owner 04) | `false` | Adds `payments_patient` and `payments_insurance` beside `payments` (they sum to it), by `rpt_payment_allocations.payer` |
| `production_groups` | `enum_multi` NEW (`doctor`, `hygiene`, `other`; owner 04) | all ticked, `no_predicate` | Filters provider rows by `rpt_provider_dim.production_group`; for separate doctor and hygienist pay runs |
| `include_zero_rows` | `boolean` NEW (owner 04) | `true` (legacy prints zero rows) | `false` hides providers whose every column is 0.00 |
| `compare_to` | filter card 12 (P4, FLT-26) | `none` | Adds `income_prior` and `income_change` (previous period / previous year) for each provider; legacy columns unchanged |

### Data

Datasets: `rpt_payment_allocations`, `rpt_ledger_entries`, `rpt_ar_open_items()` (beginning and ending balance; NEW
for this report beside the header's list), `rpt_provider_dim`, `rpt_office_dim`; Detail adds `rpt_patient_dim`,
`rpt_account_dim`, `rpt_charges` (tooth, surface through `debit_entry_id = rpt_charges.entry_id`). Fixed `date_basis =
created_date` (04 7.2 row 28). Office attribution: allocation office; provider attribution: allocation provider. The
coverage matrix rates this report on "allocation date"; that wording is superseded by 04 7.2 row 28 (created date of the
credit, vendor-documented) and is to be corrected in the matrix by the owner of 03.

Column rules (A = `rpt_payment_allocations`, L = `rpt_ledger_entries`; "income target" = `allocation_target IN
('production', 'non_production_charge', 'debit_adjustment')`; all amounts are magnitudes unless stated):

| Column | Rows | Date predicate | Office / provider |
|---|---|---|---|
| `beginning_balance` | `rpt_ar_open_items(p_as_of = date_from - 1, p_unit = 'account')`, `item_kind` open debit, Σ `open_amount` (signed) | as of | `office_id`, `provider_id` of the open item |
| `charges` | L `entry_type = 'charge'` (buckets `production` and `non_production_charge`) | `transaction_date` in range [I] | `office_id` (= office of service), `provider_id` |
| `production_adjust_pos` / `_neg` | L `ledger_bucket = 'production_adjustment'`, `is_income`, `amount > 0` / `< 0` | `transaction_date` in range [I] | own `office_id`, `provider_id` (adjustments are specific to patient, provider and location `[D]`) |
| `payments` | A, `credit_entry_type IN ('patient_payment', 'insurance_payment')` AND `credit_ledger_bucket = 'collection'` (the data-card provider-income rule) AND the credit leg's `rpt_ledger_entries.is_income` is not false (join on `credit_entry_id`), income target, `method <> 'unallocated'` | `credit_created_date` in range and `allocation_date <= date_to` | `allocation_office_id`, `allocation_provider_id` |
| `prev_allocation` | A as `payments`, target `production` / `non_production_charge`, or `debit_adjustment` whose `debit_ledger_bucket <> 'production_adjustment'` | `credit_created_date < date_from` and `allocation_date` in range | as `payments` |
| `prev_allocation_prod_adj` | A as `payments`, target `debit_adjustment` with `debit_ledger_bucket = 'production_adjustment'` | `credit_created_date < date_from` and `allocation_date` in range | as `payments` |
| `income_adjust_neg` | A, `credit_entry_type = 'adjustment'`, `credit_ledger_bucket = 'collection_adjustment'`, income target | as `payments` | as `payments` |
| `prev_allocation_income_adj` | A as `income_adjust_neg` | as `prev_allocation` | as `payments` |
| `income_adjust_pos` | L `ledger_bucket = 'collection_adjustment'`, `is_income`, `amount > 0`, excluding `entry_type = 'refund'` with a `linked_payment_id` (already netted by `refund_link`) | `created_date` in range | own `office_id`, `provider_id` |
| `non_income` (signed) | L `ledger_bucket IN ('non_income_adjustment', 'non_collection_payment')` OR (`entry_type <> 'charge'` AND `is_income = false`): every IsIncome = 0 item, payments included; never allocated | `created_date` in range [I] | own `office_id`, `provider_id` |
| `transfer_in` / `transfer_out` (NEW rule [I], Open questions 7) | L `entry_type = 'transfer'` legs of a `TRANSFER - Payment From` / `To` pair whose two legs carry different `provider_id` values (also a `transfer_pair` matched inside one account): the To leg adds its magnitude to the To provider's `income_adjust_neg` (income up), the From leg to the From provider's `income_adjust_pos` (income down); a pair that moves money out of the pool reduces the `Unallocated` row the same way | `created_date` in range | own `office_id`, `provider_id` of each leg |
| `unclassified_adjust` (NEW, shown only when non-zero) | L `ledger_bucket = 'unclassified_adjustment'` (every migrated adjustment until DATA-12) | `transaction_date` in range | own office, provider; not in `income`; added to `ending_balance` signed |
| `income` | computed from the columns above (formula of Legacy output), `computed` spec, zero-safe | - | - |
| `ending_balance` | computed roll-forward; hidden `ending_balance_check` = `rpt_ar_open_items(p_as_of = date_to)` per provider; a difference prints the run warning `roll_forward_variance` with the amount | - | - |

`Unallocated` row (one per office, `provider_ids = all` only; every column of the row is [I] - the research says only
that it holds all unallocated amounts; Open questions 8): `beginning_balance` = Σ `open_amount` (signed, negative) of the
`rpt_ar_open_items(:tenant_id, :date_from - 1, NULL, 'account')` rows with `item_kind = 'unallocated_credit'`;
`ending_balance` = the same as of `date_to`; `payments` / `income_adjust_neg` = the in-range remainder of credits created
in the range = their `unallocated` rows of `rpt_payment_allocations` (today's state) plus their allocations with
`allocation_date > date_to`; `prev_allocation` = the amount moved out of the pool in the range (credits entered before
the range, allocated in it), printed as a positive magnitude like every `(-)` column; `income` blank. Attributed to
`credit_office_id` [I]. `Unassigned provider` row: `allocation_provider_id IS NULL`, never merged into `Unallocated`.
Credits matched to targets `refund`, `opening_balance`, `transfer` are in no column (R-08 lists them as "refunded" and
"opening / transfer"); the Total row therefore is not "all payments entered" and the criteria block says so.

Parameter binding: `office_scope` -> `allocation_office_id` / `office_id` / `credit_office_id` per column above;
`provider_ids` -> provider columns above; `date_range` -> the date predicates above; `report_format` -> block choice.
Created-date predicate uses per-office UTC bounds until DATA-13 (`posting_date`).

Availability (coverage matrix row 17): **READY** on derived allocations. Real allocations: SCHEMA(26) (DATA-26);
entry-date basis on history: REPAIR(10); `is_income` on history: REPAIR(12) (until then every migrated adjustment is in
`unclassified_adjust`, so `Income Adj` columns are empty for migrated periods); migrated-ledger completeness caveat:
DATA-57. On derived rows the `Unallocated` row equals the credit balances of the office. A legacy print of a migrated
month is not reproducible line by line (Denticon allocated at entry time; we derive oldest first). A closed pay period
reproduces only from the frozen copy (DATA-29, DATA-30).

### Output

Summary block `income_summary` (`shape = table`, `fixed_outer` office):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `provider_id` (hidden) | - | id | provider_comp | group key |
| `row_kind` (hidden) | - | enum (`provider`, `unassigned_provider`, `unallocated`) | aggregate | sort key: providers, unassigned, unallocated |
| `provider_short_id` | Prov ID | text | provider_comp | label `Total :` |
| `provider_name` | Last, First Name | text | provider_comp | - |
| `beginning_balance` | Beginning Balance | money | provider_comp | sum |
| `charges` | Charges (+) | money | provider_comp | sum |
| `production_adjust_pos` | Production Adjust (+) | money | provider_comp | sum |
| `production_adjust_neg` | Production Adjust (-) | money | provider_comp | sum |
| `payments_patient`, `payments_insurance` | Pat Payments (-), Ins Payments (-) | money | provider_comp | sum; `visible_when split_payments_by_payer` |
| `payments` | Payments (-) | money | provider_comp | sum |
| `prev_allocation` | Prev Alloc (-) | money | provider_comp | sum |
| `prev_allocation_prod_adj` | Prev Alloc Prod Adj (-) | money | provider_comp | sum |
| `income_adjust_neg` | Income Adj (-) | money | provider_comp | sum |
| `prev_allocation_income_adj` | Prev Alloc Income Adj (-) | money | provider_comp | sum |
| `income_adjust_pos` | Income Adj (+) | money | provider_comp | sum |
| `unclassified_adjust` | Unclassified Adj | money | provider_comp | sum; `default_visible` only when non-zero in the run |
| `ending_balance` | Ending Balance | money | provider_comp | sum (computed per row, then summed) |
| `non_income` | Non Income | money | provider_comp | sum |
| `income` | Income | money | provider_comp | sum |
| `income_prior`, `income_change` | Income (prior), Change | money | provider_comp | sum; `visible_when compare_to != none` |

Detail block `income_lines` (`fixed_outer` office, level `allocation_provider_id` with subtotal "Provider total :"):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `line_id` (hidden) | - | id (`allocation_id` for allocation lines, `entry_id` for ledger legs) | financial_patient | `row_id_column` |
| `income_column` | Column | enum (`payments`, `prev_allocation`, `prev_allocation_prod_adj`, `income_adjust_neg`, `prev_allocation_income_adj`, `income_adjust_pos`) | aggregate | - |
| `pay_date` | Pay Date | date (`credit_transaction_date`) | phi_identified | - |
| `entry_date` | Entered | date (`credit_created_date`) | phi_identified | - |
| `allocation_date` | Allo Date | date (empty on `income_adjust_pos` legs) | phi_identified | - |
| `service_date` | Proc Date | date (empty on `income_adjust_pos` legs) | phi_identified | - |
| `credit_patient_name`, `chart_no` | Paid By (patient), Chart # | text | phi_identified | - |
| `payer` | Payer | enum (`patient`, `insurance`) | aggregate | - |
| `credit_code`, `credit_description` | Code, Description | text | phi_identified | - |
| `check_number` | Check # | text | payment_instrument | - |
| `debit_patient_name` | Procedure Patient | text | phi_identified | - |
| `procedure_code`, `tooth`, `surface` | Proc Code, Th, Surf | text | phi_identified | - |
| `method` | Method | enum (`explicit`, `remittance_line`, `adjustment_target`, `derived_fifo`) | aggregate | - |
| `amount` | Amount | money (signed by `income_column`: minus for `income_adjust_pos`) | financial_patient | Σ `amount` over the income columns per provider = Summary `income` (`prev_allocation_prod_adj` lines print but are excluded from that subtotal, as from the formula); per office; grand |

`non_income` legs are not part of `income`: the Detail prints them in a separate trailing section `Non Income` per
office (same columns, `line_id` = `entry_id`), excluded from the provider subtotal.
| `account_id`, `credit_patient_id` (hidden) | - | id | phi_identified | drill, manifest |

Sort: Summary `row_kind`, `provider_name`; Detail `income_column` order, `allocation_date`, `credit_patient_name`,
`line_id`. No `sort_by` parameter (legacy has none). Page break: none in legacy; PDF starts each office on a new
page (`fixed_outer` office, `page_break_allowed`). Summary cards (Summary format): `income` total, `payments` total,
`ending_balance` total, `Unallocated` ending - all block totals. `reconciles_with`: `provider_income` only after
05 confirms the date basis (metric dated by allocation, report by credit created date; see Open questions).

### Visuals and drill-through

Chart (Summary): horizontal bar of `income` per provider, stacked by component (`payments`, `prev_allocation`,
`income_adjust_neg` minus `income_adjust_pos`), `top_n` 20; the `Unallocated` pool as a separate grey bar.

| Click | Target |
|---|---|
| Provider row / `income` cell | `kind = rows`: same report, `report_format = detail`, `provider_ids` <- group `allocation_provider_id`, `office_ids` <- group office, `date_range` copied |
| `charges` cell | `daily.production_report`, `provider_ids` <- group, `office_ids` <- group, `date_from` / `date_to` copied |
| `payments` cell | `monthly.allocation_detail`, `provider_ids` <- group, `office_ids` <- group, dates copied |
| `Unallocated` row | `monthly.unallocated_payment_adjustments`, `office_ids` <- group, dates copied |
| Detail line | `ledger.account_allocation` (`account_id` <- column, dates copied); patient name -> patient record (record right of the patient feature, 08) |

### Actions

| Action | Scope | Kind | Notes |
|---|---|---|---|
| Open account allocation | row (Detail) | `navigate` | through the drill above |
| Export selection | bulk | `export_selection` | needs `reports_export_data_files` |
| Pin run as pay-run record | run | pin | `reports_runs_pin`; keeps the snapshot the pay run was based on until DATA-29 / DATA-30 freeze periods |

Not a worklist.

### Export and print

PDF: `banded_table`, landscape (17 numeric columns at `font_size` 7), title from `title_templates[]`
(`Income Allocation Report - Summary` / `- Detail`), `Office :` band, `criteria_echo = footer` (From, Thru, Office(s),
`Providers : ALL` or the ids, derived-allocation and created-date warnings), `Total :` row bold. XLSX: one sheet per
format block, typed money cells, a `row_kind` column instead of bold rows, `office_name` repeated on every row, no merged
cells, criteria sheet. CSV: the main block. Background run; the run screen shows progress and the file link.

### Open questions

| # | Question |
|---|---|
| 1 | Reading of `Prev Alloc (-)`: credits entered before the range and allocated in it (our rule) or allocations of range credits to charges dated before the range? Compare one provider row with a live print |
| 2 | Office of the `Unallocated` row (credit office assumed) and whether it prints under a provider selection |
| 3 | Dating of `Charges`, production adjustments and `Non Income` in the roll-forward (transaction date assumed) |
| 4 | Does `Charges (+)` include contract billing (`non_production_charge`)? Does `Payments` require the allocation to fall before `date_to`? |
| 5 | Detail layout (columns, order, subtotals) - capture a live Detail print |
| 6 | Which providers get zero rows (office roster assumed: `served_office_ids`, active providers) |
| 7 | How a `TRANSFER - Payment From` / `To` pair (the vendor's fix for misallocated money) moves provider `Income` and the `Unallocated` row; our proposed rule is marked [I] in Data |
| 8 | Which columns the legacy prints for the `Unallocated` row (compare the 2012 / 2026 samples): every value of the row is [I] |
| 7 | Product: should `income_adjust_pos` follow the provider of the reversed payment's allocations instead of the adjustment line's provider? |

## Allocation Detail - `monthly.allocation_detail`

Monthly Reports, screenshot `6.PNG` - P2 - M - `reports_monthly_reports_screen_view_only` / `_full_control` - interactive (reads the `rpt_payment_allocations` table; escalates to background above the row estimate or for tenant-wide scope) - PARTIALLY DOCUMENTED (meaning); layout INFERRED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Office manager, billing | Month end, pay period, on demand | See every payment entered in the range together with the procedures it paid and the provider credited with it; the line list behind `Payments` of Income Allocation |
| Owner | Provider pay disputes | Prove which procedures a provider was paid on |
| Billing | Daily / weekly | Spot payments applied to the wrong patient, provider or office (cross-office allocations are visible per line) |

### Legacy output

PARTIALLY DOCUMENTED `[D]`: the report shows payments received together with what they paid for - money collected and
entered in the range that applies to completed procedures with payment due; a prepayment does not appear until it pays a
completed procedure; its figures cannot be matched to a collection report. Old name `Allocation Report`.

INFERRED layout (no vendor sample; confirm on the live tool):

| Element | Inference |
|---|---|
| Title | `Allocation Detail` (old print title `Allocation Report` possible) |
| Grouping | office band > payment type section (`Cash`, `Check`, `Credit Card`, `CareCredit`, `Direct Deposit`, `Internal Financing`) |
| Line | payment entry date, patient / responsible party, payment code and check number, payment amount -> procedure date, patient, code, tooth, allocation provider, allocated amount |
| Totals | per payment type, per office, grand total |
| `Show Datewise Summary` | closing section: one line per date with the allocated amount per payment type and a total |

Signs: allocated amounts print as positive magnitudes [I] (as on Income Allocation).

### Parameters - legacy parity

<!-- PARITY:montly_reports.r06:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (token working_office). Allocation Detail: ALLOCATION office (rpt_payment_allocations.allocation_office_id, office of the paid procedure) - stated by the vendor for the allocation family, implied for this report's selector; confirm on the live tool. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Allocation provider (rpt_payment_allocations.allocation_provider_id): the provider whose completed work the payment paid, not the provider on the payment line (implied for this report by the family rule). ALL = no restriction. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis created_date (04 7.2 row 29, documented): money collected and ENTERED in the range (credit_created_date) that applies to completed procedures; an unapplied prepayment does not appear until it pays a procedure. Migrated created dates unreliable until REPAIR(10). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the created-date range. Default today in the office time zone; enhanced with presets and relative tokens. |
| PAYMENT TYPES | Cash (checkbox) | **checked** | `payment_types.cash` | enum_multi | - | `true` | replicated | Member of the payment type (tender category) checkbox group, bound to the effective deposit_group of the payment line: the code catalog's deposit_group, else (migrated rows without a code) the tender_class fallback cash -> cash, check -> check, card -> credit_card, ach -> check, flagged tender_assumed. Population is payment credits only (credit adjustments are not listed, inferred). Insurance payments follow the box of their code's deposit_group; lines with no group at all print in Other / uncategorised and appear only under the full selection (no_predicate). |
| PAYMENT TYPES | Check (checkbox) | **checked** | `payment_types.check` | enum_multi | - | `true` | replicated | Member of the payment type (tender category) checkbox group, bound to the effective deposit_group of the payment line: the code catalog's deposit_group, else (migrated rows without a code) the tender_class fallback cash -> cash, check -> check, card -> credit_card, ach -> check, flagged tender_assumed. Population is payment credits only (credit adjustments are not listed, inferred). Insurance payments follow the box of their code's deposit_group; lines with no group at all print in Other / uncategorised and appear only under the full selection (no_predicate). |
| PAYMENT TYPES | Credit Card (checkbox) | **checked** | `payment_types.credit_card` | enum_multi | - | `true` | replicated | Member of the payment type (tender category) checkbox group, bound to the effective deposit_group of the payment line: the code catalog's deposit_group, else (migrated rows without a code) the tender_class fallback cash -> cash, check -> check, card -> credit_card, ach -> check, flagged tender_assumed. Population is payment credits only (credit adjustments are not listed, inferred). Insurance payments follow the box of their code's deposit_group; lines with no group at all print in Other / uncategorised and appear only under the full selection (no_predicate). |
| PAYMENT TYPES | CareCredit (checkbox) | **checked** | `payment_types.care_credit` | enum_multi | - | `true` | replicated | Member of the payment type (tender category) checkbox group, bound to the effective deposit_group of the payment line: the code catalog's deposit_group, else (migrated rows without a code) the tender_class fallback cash -> cash, check -> check, card -> credit_card, ach -> check, flagged tender_assumed. Population is payment credits only (credit adjustments are not listed, inferred). Insurance payments follow the box of their code's deposit_group; lines with no group at all print in Other / uncategorised and appear only under the full selection (no_predicate). |
| PAYMENT TYPES | Direct Deposit (checkbox) | **checked** | `payment_types.direct_deposit` | enum_multi | - | `true` | replicated | Member of the payment type (tender category) checkbox group, bound to the effective deposit_group of the payment line: the code catalog's deposit_group, else (migrated rows without a code) the tender_class fallback cash -> cash, check -> check, card -> credit_card, ach -> check, flagged tender_assumed. Population is payment credits only (credit adjustments are not listed, inferred). Insurance payments follow the box of their code's deposit_group; lines with no group at all print in Other / uncategorised and appear only under the full selection (no_predicate). |
| PAYMENT TYPES | Internal Financing (checkbox) | **checked** | `payment_types.internal_financing` | enum_multi | - | `true` | replicated | Member of the payment type (tender category) checkbox group, bound to the effective deposit_group of the payment line: the code catalog's deposit_group, else (migrated rows without a code) the tender_class fallback cash -> cash, check -> check, card -> credit_card, ach -> check, flagged tender_assumed. Population is payment credits only (credit adjustments are not listed, inferred). Insurance payments follow the box of their code's deposit_group; lines with no group at all print in Other / uncategorised and appear only under the full selection (no_predicate). No seeded payment code carries internal_financing (financing codes PF001 / PF005 are care_credit), so this box selects nothing until the tenant maps a code (DATA-03 note). |
| OTHER OPTIONS | Show Datewise Summary (checkbox) | **checked** | `show_datewise_summary` | boolean | - | `true` | replicated | Layout (role: layout, filter card): shows a closing per-day recap (allocated amount per payment type and total, one line per created date) aggregated from the lines of the same snapshot; content inferred from the label. Legacy default ticked, kept. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:montly_reports.r06:END -->

| Legacy option | Effect on the result |
|---|---|
| OFFICE/GROUP `Office` (default) + picker (default the working office) | `office_ids` on `allocation_office_id` (office of the paid procedure; implied by the family rule) |
| OFFICE/GROUP `Office Group` + picker | `office_group_id` / `office_group_ids` resolved to offices, same column |
| PROVIDER `ALL` (default) | no predicate |
| PROVIDER list | `allocation_provider_id IN (...)`; NULL providers ("Unassigned provider") only under `ALL` |
| DATE RANGE Start Date / End Date (default today / today) | `credit_created_date BETWEEN date_from AND date_to` and `allocation_date <= date_to` [I] |
| PAYMENT TYPES `Cash` (ticked) | member `cash` of `payment_types` -> `deposit_group = 'cash'` |
| PAYMENT TYPES `Check` (ticked) | `check` -> `deposit_group = 'check'` (includes `ach` e-check tender of `PP002`) |
| PAYMENT TYPES `Credit Card` (ticked) | `credit_card` -> `deposit_group = 'credit_card'` |
| PAYMENT TYPES `CareCredit` (ticked) | `care_credit` -> `deposit_group = 'care_credit'` |
| PAYMENT TYPES `Direct Deposit` (ticked) | `direct_deposit` -> `deposit_group = 'direct_deposit'` |
| PAYMENT TYPES `Internal Financing` (ticked) | `internal_financing` -> `deposit_group = 'internal_financing'` (no seeded code carries it today) |
| PAYMENT TYPES all six ticked (default) | `semantics.full_selection = no_predicate`: no tender predicate. Every line is sectioned by its effective `deposit_group` whatever the payer (insurance payments with a categorised code print in that code's section); only lines whose effective group is `none` print in section `Other / uncategorised` |
| PAYMENT TYPES a subset | effective `deposit_group IN (...)` (insurance payments follow their code's box); lines whose effective group is `none` dropped; at least one box (`min_items = 1`) |
| OTHER OPTIONS `Show Datewise Summary` (ticked) | shows block `datewise_summary` after each office (`role = layout`, filter card: the recap is aggregated from the lines of the same snapshot and shown by `visible_when`; toggling reuses the snapshot); unticked: no recap |
| PRINT / PREVIEW, CLEAR CRITERIA, ADD TO MY FAVORITES | `print`, `frontend`, `saved_view` |

Dependency rules: none on the legacy screen.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `group_by` | `enum` (shared key; option `payment_type` is NEW, owner 04; `provider`, `none`) | `payment_type` - deviates from the dictionary default `none` because the inferred legacy layout sections by payment type [I] | `provider`: allocation-provider sections with subtotals - the per-provider audit trail of `payments`; `none`: one flat list |
| `payers` | `enum_multi` NEW (`patient`, `insurance`; owner 04) | both, `no_predicate` | `rpt_payment_allocations.payer`; isolates insurance money that legacy PAYMENT TYPES cannot separate |
| `cross_office_only` | `boolean` NEW (owner 04) | `false` | `true`: only lines with `credit_office_id <> allocation_office_id` - payments taken in one office that paid another office's work |
| `include_allocated_after_range` | `boolean` NEW (owner 04) | `false` | `true` drops the `allocation_date <= date_to` cut: shows range payments allocated later (live view) |
| `date_range` presets | `date_range` | `today` | `last_month`, `last_2_weeks`, `month_to_date`; saved view per pay period |

### Data

Datasets: `rpt_payment_allocations`, `rpt_payments` (code, description, check number, `deposit_group`, `card_brand`),
`rpt_patient_dim`, `rpt_account_dim`, `rpt_provider_dim`, `rpt_office_dim`, `rpt_charges` (tooth, surface via
`debit_entry_id`). Fixed `date_basis = created_date` (04 7.2 row 29). Office attribution: allocation office (implied);
provider attribution: allocation provider (implied). The coverage matrix rates this report on "allocation date"; that
wording is superseded by 04 7.2 row 29 (created date of the credit, vendor-documented) and is to be corrected in the
matrix by the owner of 03.

Population: `rpt_payment_allocations` rows with `credit_entry_type IN ('patient_payment', 'insurance_payment')`,
`method <> 'unallocated'`, `allocation_target IN ('production', 'non_production_charge', 'debit_adjustment')`
(provider-income targets; refunded, opening-balance and transfer matches are left out and counted in the criteria block),
`credit_created_date` in range, `allocation_date <= date_to`. Credit adjustments are not listed (the screen is about
PAYMENT TYPES) [I]. Tender: join `rpt_payments` on `credit_entry_id = entry_id` for `deposit_group`; payment legs from
remittances have `deposit_group` of their code (insurance check / EFT) or `none`. Effective group: the catalog
`deposit_group`; for a row without a catalog code (`deposit_group = 'none'`, every migrated payment) fall back to
`tender_class`: `cash` -> `cash`, `check` -> `check`, `card` -> `credit_card`, `ach` -> `check` (as `PP002`); such lines
carry hidden flag `tender_assumed = true`, and the criteria block prints the assumed share. Only rows with neither a
code group nor a tender stay `none`. `internal_financing` is carried by no seeded code (`PF001` / `PF005` are
`care_credit`): the box selects nothing until the tenant maps a code (DATA-03 note).

Availability (coverage row 18): **READY** on derived allocations; payment-type sections on history: REPAIR(12)
(migrated tender is only `cash`, `check`, `card`, `ach` or NULL, no CareCredit, Direct Deposit or Internal Financing
distinction, no check numbers); created dates of migrated rows: REPAIR(10); real allocation lines: SCHEMA(26). A migrated
month lists derived lines that Denticon would not print the same way.

### Output

Block `allocation_lines` (`fixed_outer` office; level `deposit_group` per `group_by`; subtotal "Total <type> :"):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `allocation_id` (hidden) | - | id | financial_patient | `row_id_column` |
| `deposit_group` (hidden key, effective group), `payment_type_label` | Payment Type | enum | aggregate | group key and label |
| `tender_assumed` (hidden) | - | boolean | aggregate | count of assumed lines for the criteria block |
| `entry_date` | Entered | date | phi_identified | - |
| `pay_date` | Pay Date | date | phi_identified | - |
| `responsible_party_name` | Resp Party | text | phi_identified | - |
| `credit_patient_name`, `chart_no` | Patient, Chart # | text | phi_identified | - |
| `payer` | Payer | enum | aggregate | - |
| `payment_code`, `payment_description` | Code, Description | text | phi_identified | - |
| `check_number`, `card_brand` | Check #, Card | text | payment_instrument | - |
| `credit_amount` | Payment Amount | money | financial_patient | `none` (repeats on every line of one payment) |
| `service_date` | Proc Date | date | phi_identified | - |
| `debit_patient_name` | Procedure Patient | text | phi_identified | - |
| `procedure_code`, `tooth`, `surface` | Proc Code, Th, Surf | text | phi_identified | - |
| `allocation_provider_name` | Provider | text | provider_comp | group label when `group_by = provider` |
| `allocation_office_name` | Alloc Office | text | aggregate | `visible_when ctx multi_office` |
| `allocation_date` | Allo Date | date | phi_identified | - |
| `method` | Method | enum | aggregate | - |
| `allocated_amount` | Allocated | money | financial_patient | sum per group, office, grand |
| `payment_count` (hidden) | Payments | integer | aggregate | `count_distinct credit_entry_id` per group |
| `account_id`, `credit_patient_id` (hidden) | - | id | phi_identified | drill, manifest |

Block `datewise_summary` (`placement = after_group` office, `visible_when show_datewise_summary`): `entry_date` (date,
aggregate) | `cash`, `check`, `credit_card`, `care_credit`, `direct_deposit`, `internal_financing`, `other` (money,
financial_practice, sum) | `total` (money, financial_practice, sum). One row per created date in the range that has lines.

Sort: `entry_date`, `credit_patient_name`, `credit_entry_id`, `allocation_id` (no legacy `sort_by`). Page break: none
(legacy); offices start a new PDF page. Summary cards: `allocated_amount` total, `payment_count` total (the share of
derived and of `tender_assumed` lines is printed in the criteria block, not as a card).

### Visuals and drill-through

Chart: stacked column of `allocated_amount` per `entry_date` by `payment_type_label` (from `datewise_summary`).

| Click | Target |
|---|---|
| Line | `ledger.account_allocation`, `account_id` <- column, dates copied |
| Patient name | patient record (record right of the patient feature, 08) |
| Provider subtotal (`group_by = provider`) | `monthly.income_allocation`, `report_format = detail`, `provider_ids` <- group, `office_ids` <- group, dates copied |
| Datewise row | `kind = rows`: same report filtered to that `entry_date` (`date_from = date_to` <- column) |

### Actions

| Action | Scope | Kind | Notes |
|---|---|---|---|
| Open account allocation | row | `navigate` | drill above |
| Open patient ledger | row | `navigate` | `ledger.ledger_report`, `report_type = account_ledger`, `account_id` <- column |
| Export selection | bulk | `export_selection` | `reports_export_data_files` |

Not a worklist (corrections are made from Unallocated Payment/Adjustments and Account Allocation).

### Export and print

PDF `banded_table`, landscape, title `Allocation Detail`, `Office :` band, payment-type section headers, subtotals,
`datewise_summary` printed after the office's lines, criteria footer (From, Thru, Office(s), Providers, `Payment Types :`
list or `ALL`, derived warning). XLSX: sheet `allocation_lines` (one row per allocation, `office_name` and
`payment_type_label` repeated) and sheet `datewise_summary`; no merged cells. CSV: main block, or `options.block =
datewise_summary`.

### Open questions

| # | Question |
|---|---|
| 1 | Complete printed layout and title (no vendor sample exists) |
| 2 | Are credit adjustments listed, and under which section? (assumed: payments only) |
| 3 | Do insurance payments appear under PAYMENT TYPES, and in which section? (assumed: listed under full selection only) |
| 4 | Office and provider meaning of the selectors (allocation office / provider assumed) |
| 5 | Content of `Show Datewise Summary` (per created date, by payment type assumed) |
| 6 | Is a range payment allocated after `date_to` listed (live) or not? |
| 7 | Data: which payment codes map to `internal_financing` (no seeded code carries it) |

## Unallocated Payment/Adjustments - `monthly.unallocated_payment_adjustments`

Monthly Reports, screenshot `7.PNG` - P2 (`status: beta` until DATA-26) - M - `reports_monthly_reports_screen_view_only` / `_full_control` - interactive (one read of `rpt_payment_allocations`, `method = 'unallocated'`) - PARTIALLY DOCUMENTED (purpose, parameters); layout INFERRED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Billing staff, office manager | Daily, weekly, monthly `[D]` | List every payment and credit adjustment not applied to any charge, and make the corrections that balance patient ledgers: wait for the procedure, add a `TRANSFER - Payment To` adjustment under the right provider, or reallocate the account `[D]` |
| Office manager | Month end | Size of unearned money (prepayments, deposits, overpayments) per office |

The report doubles as a **worklist**: each line is a posting to fix or a credit to refund.

### Legacy output

PARTIALLY DOCUMENTED `[D]`: lists every unallocated payment and adjustment in a date range; credit balances can be
excluded. Unallocated money "resides" with the office that entered it until a completed procedure absorbs it; on the
ledger such a payment shows `Unallocated` in the `Provider` column (a partly allocated one shows `***`).

INFERRED layout: title `Unallocated Payment/Adjustments`; band `Office :`; one line per unallocated payment or credit
adjustment: date entered, responsible party and patient (id, name), code / description, transaction provider, office,
original amount, unallocated amount, account balance; subtotal per responsible party; office and grand totals. The
grand total of an as-of-today run should tie to the `Unallocated` row of Income Allocation - Summary.

Signs [I]: original and unallocated amounts as positive magnitudes; account balance signed (credit negative).

### Parameters - legacy parity

<!-- PARITY:montly_reports.r07:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (token working_office). Unallocated Payment/Adjustments: office that entered and holds the unapplied money = the credit leg's own office (rpt_payment_allocations.credit_office_id); an unallocated row has no debit, so there is no allocation office (vendor: unallocated money resides with the office that entered it). Inferred binding - confirm on the live tool. |
| DATE RANGE | Print all unallocated payment/adjustments as of today (checkbox) | **unchecked** | `print_all_unallocated_as_of_today` | boolean | - | `false` | replicated | true = the date range is ignored and every credit that is unallocated as of the office-local today is listed (as-of snapshot); the two date boxes are disabled (enabled_when on date_from / date_to, 04 rule). false (legacy default) = credits entered in the range that are still unallocated today. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Enabled when: print_all_unallocated_as_of_today == false (inferred). Primary date range, fixed date_basis created_date (04 7.2 row 30, inferred: items entered in the range), on credit_created_date of the unallocated row; the unallocated state itself is today's. Disabled while print_all_unallocated_as_of_today is ticked. Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Enabled when: print_all_unallocated_as_of_today == false (inferred). Inclusive end of the created-date range; disabled while print_all_unallocated_as_of_today is ticked. Enhanced with presets and relative tokens. |
| OTHER OPTIONS | Exclude Credit Balances (checkbox) | **unchecked** | `exclude_credit_balances` | boolean | - | `false` | replicated | true = drop the unallocated items of accounts whose total balance (rpt_ledger_entries sum per account) is a credit, leaving the credits that sit unapplied while the account still owes - the posting errors to fix (meaning inferred from vendor text 'credit balances can be excluded'). On derived allocations every unallocated row is a credit balance by construction, so a ticked run is empty until DATA-26 persists allocations with reasons. The account balance is taken as of the office-local today (the unallocated state is today's). |
| OTHER OPTIONS | Include Inactive Patients (checkbox) | **unchecked** | `include_inactive_patients` | boolean | - | `false` | replicated | false = drops lines whose credit patient has rpt_patient_dim.is_active = false (inferred; inactive and deleted share the flag until DATA-44); true = no patient-status predicate. Confirm on the live tool whether the paying patient or the account is tested. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:montly_reports.r07:END -->

| Legacy option | Effect on the result |
|---|---|
| OFFICE/GROUP `Office` (default) + picker (default the working office) | `office_ids` on `credit_office_id` - the office that entered and holds the money [I] |
| OFFICE/GROUP `Office Group` + picker | `office_group_id` / `office_group_ids`, same column |
| DATE RANGE `Print all unallocated payment/adjustments as of today` unticked (default) | credits with `credit_created_date` in the range that are unallocated today |
| DATE RANGE `Print all unallocated payment/adjustments as of today` ticked | no date predicate: every credit unallocated as of the office-local today; Start / End Date disabled |
| DATE RANGE Start Date / End Date (default today / today) | `credit_created_date BETWEEN date_from AND date_to`; `enabled_when ["falsy", "print_all_unallocated_as_of_today"]` (inferred) - a disabled range takes its default and does not reach the builder |
| OTHER OPTIONS `Exclude Credit Balances` unticked (default) | every unallocated credit is listed |
| OTHER OPTIONS `Exclude Credit Balances` ticked | drops lines of accounts whose total balance (Σ `rpt_ledger_entries.amount` per `account_id`, as of today) is below 0, leaving credits that sit unapplied while the account still owes - the posting errors |
| OTHER OPTIONS `Include Inactive Patients` unticked (default) | drops lines whose credit patient has `rpt_patient_dim.is_active = false` |
| OTHER OPTIONS `Include Inactive Patients` ticked | no patient-status predicate (inactive and deleted share the flag until DATA-44) |
| PRINT / PREVIEW, CLEAR CRITERIA, ADD TO MY FAVORITES | `print`, `frontend`, `saved_view` |

Dependency rules: `print_all_unallocated_as_of_today == true` disables `date_from` / `date_to` (9.6, inferred).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `unallocated_reasons` | `enum_multi` NEW (`prepayment`, `overpayment`, `no_open_patient_portion`, `manual_hold`, `credit_balance`; owner 04) | all, `no_predicate` | filters `unallocated_reason`; `credit_balance` is the only value on derived rows |
| `credit_kinds` | `enum_multi` NEW (`patient_payment`, `insurance_payment`, `adjustment`, `opening_balance`, `transfer`; owner 04) | all, `no_predicate` | filters `credit_entry_type` |
| `min_unallocated_amount` | `decimal` NEW (owner 04) | `0.00` (no predicate) | strictly greater than; hides cent-level remainders |
| `older_than_days` | `integer` NEW (owner 04) | blank (no predicate) | `age_days > n` where `age_days = local_today - credit_created_date`; worklist view "unapplied over 30 days" |
| `date_range` presets | `date_range` | `today` | `week_to_date`, `last_month` |

### Data

Datasets: `rpt_payment_allocations` (rows `method = 'unallocated'`), `rpt_ledger_entries` (credit leg attributes,
account balance), `rpt_account_dim`, `rpt_patient_dim`, `rpt_provider_dim`, `rpt_office_dim`. Fixed `date_basis =
created_date` (04 7.2 row 30, inferred) on `credit_created_date`; the unallocated state is always today's (the table is
the output of `rpt_fifo_allocations(..., current_date, 'account')`). Office attribution: credit office
(`credit_office_id`); provider: none (the line prints `credit_provider_id`, the provider on the credit line).

Line amounts: `original_amount` = `-amount` of the credit leg in `rpt_ledger_entries`; `unallocated_amount` = Σ
`rpt_payment_allocations.amount` of the credit's `unallocated` rows; `allocated_amount` = difference. Credit kinds: every
negative leg with a patient (payments, credit adjustments, write-offs, opening-balance credits such as `APBAC`, unpaired
transfer-out legs); `credit_kind` = `credit_entry_type` (`patient_payment`, `insurance_payment`, `adjustment`,
`opening_balance`, `transfer`); `transfer_pair` legs never appear. Whether the legacy lists opening-balance and transfer
credits is Open questions 6. `Exclude Credit Balances` tests the account balance as of the office-local today (the
unallocated state is today's).

Availability (coverage row 19): **SCHEMA(26)**. On derived rows an unallocated remainder exists only when the account has
no open debit left, so the list equals the credit-balance list and `Exclude Credit Balances` returns nothing - the run
prints this as availability warning `derived_unallocated_equals_credit_balances`. Meaningful only for credits posted
after DATA-26 (APP): the writer stores the remainder with its `unallocated_reason`. Not reproducible for migrated history.
A past range lists the credits entered then that are unallocated **today**, never the state on the range end.

### Output

Block `unallocated_lines` (`fixed_outer` office; level `account_id` with header `{responsible_party_name} (Acct
{account_no})` and subtotal; grand total):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `credit_entry_id` (hidden) | - | id | financial_patient | `row_id_column` |
| `account_id` (hidden key), `account_no` | Acct # | id / text | phi_identified | group key |
| `responsible_party_name` (display label; hidden sort keys `rpt_account_dim.guarantor_last_name`, `guarantor_first_name`) | Resp Party | text | phi_identified | group label |
| `entry_date` | Entered | date | phi_identified | - |
| `transaction_date` | Tran Date | date | phi_identified | - |
| `credit_patient_name`, `chart_no` | Patient, Chart # | text | phi_identified | - |
| `credit_kind` | Type | enum (`patient_payment`, `insurance_payment`, `adjustment`, `opening_balance`, `transfer`) | aggregate | - |
| `code`, `description` | Code, Description | text | phi_identified | - |
| `check_number` | Check # | text | payment_instrument | - |
| `credit_provider_name` | Provider | text | aggregate | - |
| `credit_office_name` | Office | text | aggregate | `visible_when ctx multi_office` |
| `original_amount` | Amount | money | financial_patient | sum |
| `allocated_amount` | Allocated | money | financial_patient | sum |
| `unallocated_amount` | Unallocated | money | financial_patient | sum per account, office, grand |
| `unallocated_reason` | Reason | enum | aggregate | - |
| `age_days` | Days | integer | aggregate | max per account |
| `account_balance` | Acct Balance | money | financial_patient | per account: `label` (printed once on the subtotal line) |
| `is_derived` (hidden) | - | boolean | aggregate | count for the warning |

Sort: `guarantor_last_name`, `guarantor_first_name` (of `rpt_account_dim`), `entry_date`, `credit_entry_id`. Page break: none
(legacy); enhancement `page_break_by` not offered. Summary cards: `unallocated_amount` total, account count
(`count_distinct account_id`), lines older than 30 days.

### Visuals and drill-through

Chart: none - a list (an ageing bar of `unallocated_amount` by `age_days` band 0-30 / 31-90 / 91+ is offered as an
optional card).

| Click | Target |
|---|---|
| Line or account subtotal | `ledger.account_allocation`, `account_id` <- column, `date_from` = `credit_created_date`, `date_to` = today |
| Patient name | patient record (record right of the patient feature, 08) |
| Office grand total | only when `print_all_unallocated_as_of_today = true`: `monthly.income_allocation`, `report_format = summary`, `office_ids` <- group, `date_from = date_to = today` (its `Unallocated` ending balance is the same as-of-today pool); with a date range no drill is offered (the two reports date the pool differently) |

### Actions

| Action | Scope | Kind | Notes |
|---|---|---|---|
| Open account ledger | row | `navigate` | `ledger.ledger_report`, `report_type = account_ledger`, `account_id` <- column |
| Open payment / reallocate | row | `navigate` | NEW route key of the ledger feature (edit payment allocation), named by `07_ux_blueprint.md` |
| Create follow-up task | row, bulk | `create_task` | task "Apply or refund unallocated credit" per account; feature right of tasks (08) |
| Credit refund letter | bulk | `letters` | hands account ids to the letters feature (PD-15); only for lines with `account_balance < 0` |
| Export selection | bulk | `export_selection` | `reports_export_data_files` |

Worklist: yes - saved view "Unapplied, account still owes" (`exclude_credit_balances = true`, `older_than_days = 7`)
pinned for billing; bulk actions need ENG-49 (P3), row navigation works from P2.

### Export and print

PDF `banded_table`, landscape, title `Unallocated Payment/Adjustments`, `Office :` band, responsible-party group
headers and subtotals, criteria footer (From / Thru or `As of today`, Office(s), `* Excludes accounts with credit
balances.` / `* Includes inactive patients.` when set, derived warning). XLSX: one flat sheet, account number and name on
every row. CSV: main block.

### Open questions

| # | Question |
|---|---|
| 1 | Does ticking `Print all ... as of today` disable or only ignore Start / End Date? |
| 2 | Meaning of `Exclude Credit Balances` (account balance below zero assumed) and balance as of today or as of `date_to` |
| 3 | Office of the selector (credit office assumed) |
| 4 | Is `Include Inactive Patients` tested on the paying patient or on the account (any active member)? |
| 5 | Printed columns and grouping (no vendor sample) |
| 6 | Are write-offs and opening-balance credits listed? |

## Daily Journal Summary by Allocation - `monthly.daily_journal_summary_by_allocation`

Monthly Reports, screenshot `8.PNG` - P2 - M - `reports_monthly_reports_screen_view_only` / `_full_control` - interactive (single office; tenant-wide or more than 31 days escalates to background) - INFERRED (no vendor article, PDF or image found)

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Office manager, finance | Month end [I] | Bridge between the Daily Journal (money by the office and provider it was entered under) and Income Allocation (money by the office and provider whose work it paid) |
| Multi-office finance | Month end [I] | See how much of an office's deposits paid another office's production, and how much is still unallocated |

### Legacy output

INFERRED throughout - treat every element as a hypothesis for the live verification. Anchors: Daily Journal-Summary
prints, for a range and an office, the transactions with their ledger description and totals of charges, payments and
adjustments; production adjustments print in `Charges` (+ / -), collection adjustments in `Adjustments` `[D]`.

| Element | Inference |
|---|---|
| Titles | `Daily Journal Summary by Allocation - Summary` / `- Detail` |
| Summary | per office and allocation provider, one row per transaction code / description with `Charges`, `Payments`, `Adjustments`; payments and collection credit adjustments counted by allocation (allocation office and provider); an `Unallocated` line for money not applied |
| Detail | the same per transaction line (date, patient, code, description, provider, amounts) |
| Totals | per provider, per office, grand. Charges equal the Daily Journal; payments differ from it by money allocated across offices and by unallocated money |

Signs: as the Daily Journal - charges positive, payments and credit adjustments negative, leading minus.

### Parameters - legacy parity

<!-- PARITY:montly_reports.r08:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT FORMAT | (no label) (radio_group) | **Detail** / Summary | `report_format` | enum | Detail -> `detail`, Summary -> `summary` | `detail` | replicated | Summary = per office and allocation provider one row per transaction code / description with Charges, Payments, Adjustments totals where payments and collection adjustments are counted by allocation, plus an Unallocated line; Detail = the same per transaction line. Both layouts INFERRED (no vendor description exists) - confirm on the live tool. Legacy default Detail kept. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Our Excel is a flat typed sheet (one record per row) [I]: the legacy Excel layout of this report is not documented (the vendor's flat-layout statement is cross-cutting, its evidence is a Daily report) - confirm on the live tool. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (token working_office). Office attribution inferred: charges and production adjustments by transaction office (as the Daily Journal), payments and collection adjustments by allocation office (rpt_payment_allocations.allocation_office_id), unallocated amounts by the credit's own office. Confirm on the live tool. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis transaction_date (04 7.2 row 31, inferred: the default basis of the Daily Journal it summarises); whether allocated payments are dated by their transaction date or by the allocation date is unknown - confirm on the live tool. Enhanced with presets and relative tokens. The enhancement parameter allocation_dating (default credit_transaction_date, INFERRED) lets the live verification switch to allocation_date without a schema change; the research's inferred identity (payments = Daily Journal payments minus newly unallocated plus previously unallocated now applied) points to allocation-date dating. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the transaction-date range. Default today in the office time zone; enhanced with presets and relative tokens. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:montly_reports.r08:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | `report_format = detail`: one line per ledger leg or per allocation part of a credit |
| REPORT FORMAT `Summary` | `report_format = summary`: one row per code within office > provider, with totals |
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format = pdf` / `xlsx` (`role = output`; `csv` added); never changes the rows |
| OFFICE/GROUP `Office` (default) + picker (default the working office) | `office_ids`: charges and production-side adjustments by their own `office_id`; allocated credits by `allocation_office_id`; unallocated remainders by `credit_office_id` [I] |
| OFFICE/GROUP `Office Group` + picker | `office_group_id` / `office_group_ids`, same columns |
| DATE RANGE Start Date / End Date (default today / today) | `transaction_date` in range for debit legs and `credit_transaction_date` in range for credits (`date_basis = transaction_date`, inferred); allocation as of today (live) |
| PRINT / PREVIEW, CLEAR CRITERIA, ADD TO MY FAVORITES | `print`, `frontend`, `saved_view` |

Dependency rules: none on the legacy screen.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `allocation_dating` | `enum` NEW (`credit_transaction_date`, `allocation_date`; owner 04) | `credit_transaction_date` (INFERRED basis; the research's inferred identity "payments = Daily Journal payments minus newly unallocated plus previously unallocated now applied" points to `allocation_date` - Open questions 2) | `allocation_date`: allocated credits are dated by `allocation_date` instead; lets the live verification switch the default without a schema change |
| `show_allocation_bridge` | `boolean` NEW (owner 04) | `false` | adds block `allocation_bridge` per office: journal payments by entry (same range, transaction office), minus allocated to other offices, plus allocated from other offices, minus unallocated remainder, plus previously unallocated now applied, equals payments by allocation |
| `provider_ids` | `entity_multi` (shared) - enhancement, legacy screen has none | `all` | `provider_id` of debit legs and `allocation_provider_id` of allocated credits |
| `suppress_zero_rows` | `boolean` NEW (owner 04) | `false` (legacy-like code rows) | hides 0.00 code rows in the Summary office block |
| `date_range` presets | `date_range` | `today` | `last_month`, `month_to_date` |

### Data

Datasets: `rpt_ledger_entries` (debit legs, `journal_column`, codes), `rpt_payment_allocations` (credit parts),
`rpt_transaction_code_dim` (code rows), `rpt_patient_dim`, `rpt_provider_dim`, `rpt_office_dim`. Fixed `date_basis =
transaction_date` (04 7.2 row 31, inferred).

| Part | Rows | Office / provider | Column |
|---|---|---|---|
| Charges and production adjustments | L `journal_column = 'charges'` (debits and production-side credits of both signs: production items are counted by entry, the default of Open questions 5), `transaction_date` in range | own `office_id`, `provider_id` | `charges` |
| Debit collection-side legs (refunds, reversals, finance charges with Sub Type Collection, contract billing) | L `journal_column = 'adjust'`, `amount > 0` | own `office_id`, `provider_id` | `adjustments` |
| Payments | A, `credit_entry_type IN ('patient_payment', 'insurance_payment')`, `method <> 'unallocated'`, `credit_transaction_date` in range | `allocation_office_id`, `allocation_provider_id` | `payments` (negated) |
| Credit adjustments | A, `credit_entry_type = 'adjustment'` AND the credit leg's `rpt_ledger_entries.journal_column <> 'charges'` (join on `credit_entry_id`: collection-side credits only - production-side credits are already in the first row), `method <> 'unallocated'` | allocation office / provider | `adjustments` (negated) |
| Unallocated | A, `method = 'unallocated'`, credits of the two rows above, credit dated in range | `credit_office_id`; provider row `Unallocated` | `payments` or `adjustments` |
| Transfer and opening-balance credits | L `entry_type IN ('transfer', 'opening_balance')`, `amount < 0`, `journal_column <> 'charges'`, `transaction_date` in range (unpaired transfer-out legs, migrated `transfer_pair` legs, conversion credits `APBAC` / `APBIC`); counted by entry, not by allocation [I] | own `office_id`, `provider_id` | by `journal_column`: `adjustments` or `payments` |
| Unclassified migrated adjustments | L `ledger_bucket = 'unclassified_adjustment'` | own office, provider | `adjustments`, code row `unclassified` (REPAIR(12)) |

Credits matched to `refund`, `opening_balance` or `transfer` targets stay in their column under the provider of the
matched debit (they move A/R). Every leg is counted once (production-side credits by entry in the first row, transfer
and opening-balance credits by entry in the last row, payment and collection-side adjustment credits by allocation), so
`Σ charges + payments + adjustments` over all offices equals the Daily Journal's net movement for the same range when
`allocation_dating = credit_transaction_date` (test of RPT-MONTHLY-48).

Availability (coverage row 20): **READY** on derived allocations; no legacy sample exists, so parity is unverifiable
until a live print is captured; code rows for migrated payments and adjustments: REPAIR(12); real allocations:
SCHEMA(26). Live: allocations are today's, so a re-run of a past month moves amounts between providers after a
reallocation (frozen only through DATA-29 / DATA-30).

### Output

Summary block `journal_by_allocation` (`fixed_outer` office; level `allocation_provider_id` (labels "Unallocated",
"Unassigned provider" included) with subtotal; code rows through the shared code-row renderer of RPT-MONTHLY-05):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `provider_id` (hidden key), `provider_name` | Provider | text | provider_comp | group label |
| `code_order` (hidden) | - | integer | aggregate | services, production adjustments, collection adjustments, payments |
| `code` | Code | text | aggregate | - |
| `description` | Description | text | aggregate | label `Total :` |
| `line_count` | Count | integer | aggregate | sum; `default_visible = false` |
| `charges` | Charges | money | provider_comp | sum |
| `payments` | Payments | money | provider_comp | sum |
| `adjustments` | Adjustments | money | provider_comp | sum |
| `net_total` | Total | money (computed `charges + payments + adjustments`) | provider_comp | sum |

Office total block (placement `after_group` office): the same columns without provider, every configured code printed
also at 0.00 (unless `suppress_zero_rows`), class `financial_practice`.

Detail block `journal_lines` (`fixed_outer` office; level provider with subtotal):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `line_id` (hidden) | - | id (`entry_id` or `allocation_id`) | financial_patient | `row_id_column` |
| `transaction_date` | Date | date | phi_identified | - |
| `patient_name`, `chart_no` | Patient, Chart # | text | phi_identified | - |
| `code`, `description` | Code, Description | text | phi_identified | - |
| `tooth`, `surface` | Th, Surf | text | phi_identified | - |
| `service_date` | Proc Date (paid procedure) | date | phi_identified | credits only |
| `allocation_date` | Allo Date | date | phi_identified | credits only |
| `entered_office_name` | Entered At | text | aggregate | credits only; `visible_when ctx multi_office` |
| `user_key` | User | text | aggregate | - |
| `charges`, `payments`, `adjustments` | Charges, Payments, Adjustments | money | financial_patient | sum per provider, office, grand |
| `patient_id` (hidden) | - | id | phi_identified | drill, manifest |

Block `allocation_bridge` (`shape = key_value`, after each office, `visible_when show_allocation_bridge`): `journal_payments`,
`allocated_to_other_offices`, `allocated_from_other_offices`, `unallocated_remainder`, `previously_unallocated_applied`
(credits dated before the range whose allocation falls in it; non-zero only when `allocation_dating = allocation_date`),
`payments_by_allocation` (money, financial_practice).

Sort: Summary `provider_name`, `code_order`, `code`; Detail `transaction_date`, `patient_name`, `line_id`. Page break:
none (legacy); offices on a new page. Summary cards: `charges`, `payments`, `adjustments`, `net_total` totals.

### Visuals and drill-through

Chart: grouped bar per provider of `payments` by allocation beside the provider's payments by entry (from the bridge
data) - shows who is paid for whose collections.

| Click | Target |
|---|---|
| Provider subtotal | `kind = rows`: same report, `report_format = detail`, `provider_ids` <- group, `office_ids` <- group |
| Code row | `kind = rows`: Detail filtered to the code through `param_map`: `payment_adjustment_codes` <- `code` for payment and adjustment rows, `procedure_codes` <- `code` for charge rows (shared dictionary keys, hidden on this report) |
| `journal_payments` (bridge) | `daily.daily_journal`, `office_ids` <- group, dates copied |
| Detail line | `ledger.account_allocation` for credits, `ledger.ledger_report` for debits (`account_id` <- hidden column) |

### Actions

| Action | Scope | Kind | Notes |
|---|---|---|---|
| Open account ledger | row (Detail) | `navigate` | `ledger.ledger_report`, `report_type = account_ledger` |
| Export selection | bulk | `export_selection` | `reports_export_data_files` |

Not a worklist.

### Export and print

PDF: `journal` layout (ENG-24) with provider bands and the office code block, portrait for Summary, landscape for Detail;
title per `report_format`; criteria footer (From, Thru, Office(s), `Payments by allocation (derived oldest first)`).
XLSX: Summary = one row per office x provider x code; Detail = one row per line; the bridge on its own sheet; no merged
cells. CSV: main block. PRINT FORMAT `Excel` renders the XLSX directly after the on-screen preview.

### Open questions

| # | Question |
|---|---|
| 1 | Entire layout of both formats (no vendor material) - capture a live Summary and Detail print for one office and one day with a cross-office payment |
| 2 | Are allocated payments dated by their transaction date or by allocation date (`allocation_dating`)? |
| 3 | Office of unallocated money and of debit legs (own office assumed) |
| 4 | Does the Summary group by provider at all, or only by code? |
| 5 | Are production-side credit adjustments (write-offs) counted by allocation or by entry? (default: by entry) |
| 6 | Are transfer and opening-balance credits printed, and by entry or by allocation |

## WaterFall Report - `monthly.waterfall_report`

Monthly Reports, screenshot `9.PNG` - P2 - M - `reports_monthly_reports_screen_view_only` / `_full_control` - interactive (one office, up to 12 service months); escalates to background for more offices or longer ranges - PARTIALLY DOCUMENTED (purpose, cadence, parameters); layout INFERRED

### Purpose

| Who | When | Decision or task |
|---|---|---|
| Management, C-level | Quarterly and yearly `[D]` | Predict collection rates from how earlier service months were collected; cash-on-hand analysis `[D]` |
| Finance | Month end | How fast each month's production turns into cash; which service months still carry open balances |

### Legacy output

PARTIALLY DOCUMENTED `[D]`: breaks collections down by the month of the date of service (`Service Date`) for the chosen
range; pick the office(s) and use a range of at least one quarter. INFERRED layout (generic waterfall design; confirm):

| Element | Inference |
|---|---|
| Title | `WaterFall Report` |
| Rows | one per service month in the range, with that month's production |
| Columns | months in which payments and / or adjustments were applied to that month's production (calendar months, or lag buckets same month, +1, +2 ...) - a triangular matrix |
| Measures | amount per cell; cumulative % of the service month's production collected; remaining balance |
| Radio | cells hold payments + adjustments, payments only, or adjustments only |
| Totals | column totals (cash per month by service-month origin), row totals, grand total; per office |

Signs [I]: cell amounts as positive magnitudes.

### Parameters - legacy parity

<!-- PARITY:montly_reports.r09:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Our Excel is a flat typed sheet (one record per row) [I]: the legacy Excel layout of this report is not documented (the vendor's flat-layout statement is cross-cutting, its evidence is a Daily report) - confirm on the live tool. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (token working_office). WaterFall: allocation office (office where the paid production was charged, rpt_payment_allocations.allocation_office_id) - inferred from its dependence on allocation; the vendor names only 'pick the office(s)'. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, fixed date_basis service_date (04 7.2 row 32, documented): selects the service months of the production (service_date of the debit leg) that form the rows; the month columns are the months in which credits were applied to that production (allocation_date), up to the run date - column window inferred. A partial first or last month is clipped to the range for both billed_amount and the cells. 'Use a range of at least one quarter' is vendor guidance, shown as a UI hint (enhancement). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the service-date range. Default today in the office time zone; enhanced with presets and relative tokens. |
| OTHER OPTIONS | (no label) (radio_group) | **Payments and Adjustments** / Payments only / Adjustments only | `payment_adjustment_scope` | enum | Payments and Adjustments -> `payments_and_adjustments`, Payments only -> `payments_only`, Adjustments only -> `adjustments_only` | `payments_and_adjustments` | replicated | Which credits fill the cells: payments_only = credit_entry_type patient_payment / insurance_payment with credit_ledger_bucket = 'collection'; adjustments_only = credit_entry_type adjustment (write-offs included); payments_and_adjustments = the union of the two, so the two subsets add up to it. Opening-balance and transfer credits (APBAC / APBIC, transfer legs) and non-collection payments are in no option. Whether contractual write-offs count as adjustments here is not documented - confirm on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:montly_reports.r09:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format` (`role = output`, `csv` added); never changes the matrix |
| OFFICE/GROUP `Office` (default) + picker (default the working office) | `office_ids` on `allocation_office_id` (office where the paid production was charged) [I]; one matrix per office |
| OFFICE/GROUP `Office Group` + picker | `office_group_id` / `office_group_ids`, same column |
| DATE RANGE Start Date / End Date (default today / today) | service months: rows for every month touched by `service_date BETWEEN date_from AND date_to` of the paid debit; a partial first or last month is clipped to the range for both `billed_amount` and the cells (the criteria echo prints the clipped range); columns from the first service month through the month of the run date. "Use a range of at least one quarter" is vendor guidance, shown as a UI hint (enhancement); the default single day yields one row |
| OTHER OPTIONS `Payments and Adjustments` (default) | `payment_adjustment_scope = payments_and_adjustments`: the union of the two options below (`credit_entry_type IN ('patient_payment', 'insurance_payment', 'adjustment')`); opening-balance and transfer credits (`APBAC`, `APBIC`, transfer legs) and non-collection payments are in no option |
| OTHER OPTIONS `Payments only` | `payments_only`: `credit_entry_type IN ('patient_payment', 'insurance_payment')` AND `credit_ledger_bucket = 'collection'` |
| OTHER OPTIONS `Adjustments only` | `adjustments_only`: `credit_entry_type = 'adjustment'` (write-offs included; to confirm) |
| PRINT / PREVIEW, CLEAR CRITERIA, ADD TO MY FAVORITES | `print`, `frontend`, `saved_view` |

Dependency rules: none on the legacy screen.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `column_mode` | `enum` NEW (`calendar_month`, `lag_month`; owner 04) | `calendar_month` (inferred legacy) | `lag_month`: columns M+0, M+1 ... M+`max_lag_months`, last column folds every later month - service months become comparable cohorts |
| `max_lag_months` | `integer` NEW (owner 04) | `12` | `enabled_when ["eq", "column_mode", "lag_month"]`; validation 1..36 |
| `show_cumulative_pct` | `boolean` NEW (owner 04) | `false` | cells show cumulative % of `billed_amount` instead of amounts (same snapshot, `role = layout`) |
| `report_format` | `enum` NEW (`standard`, `allocation_lines`; owner: this catalog) | `standard` (the legacy matrix) | `allocation_lines` = the allocation rows behind the matrix; the drill target of a cell |
| `service_month`, `allocation_month` | `date` NEW, hidden (set only through `param_map`) | blank | filter `allocation_lines` to one cell |
| `date_range` presets | `date_range` | `today` | `last_quarter`, `this_year`, trailing 12 months (`today-12m` / `today`) - saved view "Quarterly waterfall" |

### Data

Datasets: `rpt_payment_allocations`, `rpt_charges` and `rpt_ledger_entries` (billed amount of each service month),
`rpt_office_dim`. Fixed `date_basis = service_date` (04 7.2 row 32, documented) on `rpt_payment_allocations.service_date`
(the debit's `service_date_effective`); columns by `allocation_date`. Office attribution: allocation office (inferred);
no provider attribution (no provider control).

| Measure | Rows |
|---|---|
| `billed_amount` (row) | Σ the debit legs that can be allocation targets of the cells: `rpt_ledger_entries` with `entry_type = 'charge'` (`ledger_bucket IN ('production', 'non_production_charge')`) plus debit adjustments (`entry_type = 'adjustment'`, `amount > 0`, any bucket except `opening_balance` / `transfer`), `service_date_effective` in the service month AND `BETWEEN date_from AND date_to`, `office_id` in scope. Numerator and denominator cover the same debits, so `collected_pct` never exceeds 100 % except through credits on debits outside the clip. Printed label `Charges` [I] (Open questions 2) |
| cell | Σ `rpt_payment_allocations.amount`, `method <> 'unallocated'`, `allocation_target IN ('production', 'non_production_charge', 'debit_adjustment')`, `service_date BETWEEN date_from AND date_to`, credit filter of `payment_adjustment_scope`, grouped by `date_trunc('month', service_date)` x `date_trunc('month', allocation_date)` (or lag `months_between`) |
| `total_collected` (row) | Σ cells of the row |
| `collected_pct` (row) | `ratio(total_collected, billed_amount)` |
| `remaining_balance` (row) | `billed_amount` - Σ every allocation of the row's debits (same clip) regardless of the radio (open as of today) |

Availability (coverage row 21): **READY** on derived allocations. Derived `allocation_date` = the later of the two
transaction dates, so on history a payment is placed in the month of the later of payment and charge, not in the month
Denticon applied it; real allocation dates: SCHEMA(26). Write-off split by class on history: REPAIR(12). Live: a
back-dated entry re-shapes past columns until DATA-30 snapshots exist. Migrated charge gap (DATA-57) lowers
`billed_amount` of migrated months and is printed with the measured gap.

### Output

Block `waterfall` (`shape = matrix`, `fixed_outer` office; `pivot`: `row_keys [service_month]`, `column_key
allocation_month` (or `lag_month`), `value_columns [amount]`, `column_order` ascending, `max_columns` from
`limits.max_pivot_columns`, `row_totals`, `column_totals`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `service_month` | Service Month | date (`pattern MMM yyyy`) | aggregate | label `Total :` |
| `billed_amount` | Charges [I] | money | financial_practice | sum |
| `amount` (pivot cell) | `{allocation_month}` / `M+{n}` | money | financial_practice | column totals = cash applied per month |
| `total_collected` | Collected | money | financial_practice | sum |
| `collected_pct` | Collected % | percent (computed ratio) | financial_practice | ratio of totals |
| `remaining_balance` | Remaining | money | financial_practice | sum |

Block `waterfall_lines` (`report_format = allocation_lines`): `allocation_id` (hidden, `row_id_column`), `service_date`,
`allocation_date`, `credit_kind`, `credit_code`, `patient_name` (phi_identified), `procedure_code` (phi_identified),
`allocated_amount` (financial_patient, sum), `account_id` (hidden, phi_identified).

Sort: rows by `service_month` ascending; columns ascending. More columns than `max_pivot_columns`: the run answers
`too_many_pivot_columns` and suggests `column_mode = lag_month`. Page break: one office per page. Summary cards: grand
`total_collected`, overall `collected_pct`, `remaining_balance`.

### Visuals and drill-through

Chart: line chart of cumulative `collected_pct` by lag month, one line per service month (cohort curves), computed from
the same snapshot; plus a heat-map colouring of the matrix cells by share of `billed_amount`.

| Click | Target |
|---|---|
| Cell | `kind = rows`: same report, `report_format = allocation_lines`, `service_month` <- row key, `allocation_month` <- column key, `office_ids` <- group |
| `billed_amount` | `daily.production_report`, `office_ids` <- group, `date_from` / `date_to` = the service month |
| `remaining_balance` | none in P2: no report lists open items by service month (ageing reports age by days, not by service month); a NEW worklist candidate for `06_dashboards.md` |

### Actions

| Action | Scope | Kind | Notes |
|---|---|---|---|
| Export selection | bulk | `export_selection` | `reports_export_data_files` (matrix and `allocation_lines`) |

Not a worklist.

### Export and print

PDF: `banded_table` matrix renderer, landscape, at most 13 month columns per page band (wider matrices continue on a
following page band with the row labels repeated), title `WaterFall Report`, `Office :` band, criteria footer (From,
Thru, Office(s), `Payments and Adjustments` / `Payments only` / `Adjustments only`, derived warning). XLSX: one sheet per
office with the matrix as typed cells (first column `service_month`, one column per month, totals row and column, no
merged cells) plus a long-format sheet (`office_name`, `service_month`, `allocation_month`, `amount`) for pivoting.
CSV: long format. Background run above one office or 12 service months.

### Open questions

| # | Question |
|---|---|
| 1 | Matrix orientation and column window: calendar months or lag buckets; does the column window end at the run date or at `date_to`? |
| 2 | Does the row show production, and which (charged fee, net of production adjustments)? Are percentages printed? |
| 3 | Do write-offs count under `Adjustments only`? Are collection-side credit adjustments included? |
| 4 | Office attribution of the selection (allocation office assumed) |
| 5 | Is unallocated money (prepayments) shown anywhere? |

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-MONTHLY-01 | Register the `monthly` category: 9 definitions with `legacy_names[]` (including the old menu names: Aging - Detail / Summary, Aging by Provider, Aging by Home Office with Balance Status, Income Allocation - Detail / Summary, Allocation Report, Unallocated Payments/Adjustments Report), right family `monthly`, hub area Financial › Month-end, shared header / footer / criteria echo | P2 | S | ENG-03, ENG-05, ENG-23, SEC-03, SEC-04, FLT-18 | catalog search by every legacy and old name finds the report; a View Only holder can run but not print or export; the footer echo of a default run lists From, Thru, Office(s), Providers : ALL |
| RPT-MONTHLY-02 | Shared ageing builder for both units (`account`, `account_office`) with the full ageing parameter block, three-line account block (total / Ins / Pat), `Total Accounts with A/R` and grand totals | P2 | L | DATA-20, DATA-27, DATA-53, DATA-35, DATA-22, DATA-37, FLT-01, FLT-14, ENG-11 | vendor example (charge 100 at A, payment 100 at B) gives A = 100 and B = -100 with credits included on Aging Report and no row on Aging Report by Home Office; per-office totals equal the ledger balance (R-14b); home-office total equals organisation A/R (R-05) |
| RPT-MONTHLY-03 | Excel bucket extension: member `over_120_plus`, `output_format` role `query` on both ageing reports, bucket set `legacy_extended` (`bucket_over_120` 120-149, `bucket_over_150`, `bucket_over_180`, `bucket_over_270`, `bucket_over_365`) with Est. Ins / Est. Pat triples | P2 | S | RPT-MONTHLY-02, DATA-27, ENG-27, FLT-05, FLT-15 | switching PDF -> Excel shows Over 120+ in place of Over 120, keeps the ticked state and re-runs; the xlsx carries the five extended triples and they sum to the 120+ amount of the PDF run (no double count in the row total); PDF never shows them |
| RPT-MONTHLY-04 | Allocation reading layer for the five allocation reports: attribution columns (allocation office / provider, credit office), `credit_created_date` basis, Unallocated semantics, derived-allocation warning | P2 | M | DATA-26, DATA-13, DATA-10, ENG-59 | R-08 holds per office and period (by provider + unallocated + refunded + opening / transfer = payments); a payment entered Feb 1 back-dated to Jan 15 falls in February; derived runs print the warning |
| RPT-MONTHLY-05 | Code-row day-sheet rendering shared by Executive Day Sheet and Daily Journal Summary by Allocation: every configured code printed also at 0.00, ordered services / production adjustments / collection adjustments / payments, signed A. R. Impact | P2 | M | ENG-24, DATA-03, DATA-12, FLT-07 | a range without activity still prints every active code at 0.00; Σ A. R. Impact equals the office's ledger movement of the range; migrated adjustments print on the unclassified row until DATA-12 |
| RPT-MONTHLY-06 | Availability and era warnings of the family (`availability[]`): created dates of migrated rows, derived allocations, missing resp. party type, balance status, last statement date, as-of recomputation | P2 | S | DATA-02, ENG-03, MET-06 | each warning appears in the run response and the PDF criteria block exactly when its condition holds for the resolved range and offices |
| RPT-MONTHLY-07 | Parity default tests and live verification list: the 108 controls of `catalog/parity/montly_reports.parity.json` and rules d01 / d02 of both ageing reports; checklist of the INFERRED items for the live legacy tool | P2 | S | FLT-20, FLT-23, ENG-18 | a run with untouched defaults resolves to the parity defaults for all 9 reports; the lint finds every legacy control mapped; the checklist lists the open questions of this document with an owner |
| RPT-MONTHLY-08 | Cross-report reconciliation tests: Executive Summary Show AR = Aging Report total (`report_date = date_to`, credits included); Income Allocation `payments` = Allocation Detail grand total for the same offices, providers and dates; Unallocated grand total (as of today) = Income Allocation `Unallocated` row; WaterFall row totals = allocated credits of the service month | P2 | M | DATA-09, ENG-17, RPT-MONTHLY-02, RPT-MONTHLY-04 | the four identities pass on the `golden_small` fixtures for both eras and are wired as `reconciles_with` where a metric exists (`total_ar`, `provider_income`) |
| RPT-MONTHLY-09 | Background runs, month-end schedules and frozen periods for the family: `cost_class` and `escalate_when`, `empty_when`, snapshot read for locked periods | P2 | M | ENG-38, ENG-43, ENG-44, DATA-29, DATA-30, MET-12 | a tenant-wide ageing or allocation run goes to the worker and completes; a monthly schedule delivers a login-gated link; a month-end ageing re-run after a later edit returns the frozen figures |
| RPT-MONTHLY-10 | `monthly.executive_summary` definition: `kpi` key-value block with the 24 lines and their formulas, per-line office and provider columns, MTD / YTD, A/R block (unit `account_office`), Show AR flag, office `fixed_outer` level, criteria echo | P2 | L | RPT-MONTHLY-01, DATA-04, DATA-16, DATA-18, DATA-19, DATA-27, MET-05, MET-10, ENG-11 | On `golden_small` each line equals its metric (`patients_seen`, `patient_visits`, `procedures_done`, `chair_hours` under `chair_time_unit = hours`, `appointments_no_show`, `appointments_cancelled`); line 10 = `visit_code_production` + the documented bridge (Sub Type versus class, unclassified rows); line 10 charges + line 13 = Σ `charged_fee` [`is_ledger_code`]; the default prints chair time in legacy minutes; Patient + Insurance = Production; Dentist + Hygienist + Other = Total; MTD of a run ending on the 1st equals the range figure; Show AR total equals `monthly.aging_report` with credits included and `report_date = date_to` |
| RPT-MONTHLY-11 | Executive Summary GROUP BY Provider: provider level, provider-attributed lines, office total block from office facts (not summed), Page Break as `page_break_by = group` | P2 | M | RPT-MONTHLY-10, DATA-18, ENG-23 | A patient-day seen by a dentist and a hygienist counts once in the office block and once under each provider; Page Break greyed while GROUP BY = None; ticking it re-renders without a new run |
| RPT-MONTHLY-12 | Executive Summary Referrals block: sources of first-visit new patients, production of those patients, legacy-id link for migrated patients, raw-text fallback for app patients, switch to `referral_source_id` after DATA-40 | P2 | S | RPT-MONTHLY-10, DATA-19, DATA-40 | Fixture with two sources: New Patients sum equals line 2 for patients with a source; production equals their charges plus production adjustments in the range; block omitted when empty |
| RPT-MONTHLY-13 | PDF renderer `executive_summary` (three-column key-value body, trailer tables, per-office and per-provider blocks) and XLSX sheets Summary / Referrals / MTD_YTD / AR | P2 | M | ENG-23, ENG-27, RPT-MONTHLY-10 | Side by side with the 2025 vendor sample every line, label and footer flag is present in order; the xlsx has no merged cells and typed money cells |
| RPT-MONTHLY-14 | Executive Summary enhancements: `include_office_total_block`, `chair_time_unit`, `collections_provider_attribution`, chart, drill targets of the KPI lines, comparison columns (`compare_to`, P4 part) | P2 | S | RPT-MONTHLY-10, ENG-30, FLT-26 | Total block ratios equal ratios of summed components; each drill returns a run whose total equals the clicked figure (an A/R bucket drill: the clicked bucket column of the target, not its grand total); `chair_time_unit = hours` divides line 7 by 60 and recomputes line 22; `compare_to = none` leaves the served columns of the legacy layout unchanged |
| RPT-MONTHLY-15 | `monthly.executive_day_sheet` definition on the code-row renderer: office sections, section rules by `journal_column` and `entry_type`, zero rows from the code skeleton, unclassified migrated row, office `Total` row | P2 | M | RPT-MONTHLY-05, DATA-03, DATA-12, ENG-24 | Office `Total` of A. R. Impact equals the office ledger movement of the range; every active code prints at 0.00 on an empty day; a production adjustment prints in Production, a refund and contract billing in Adjustments; `$` and parentheses in PDF |
| RPT-MONTHLY-16 | Executive Day Sheet enhancements and outputs: `hide_zero_rows`, `code_sections`, `include_office_total_section`, top-10 adjustment chart, drills to Production / Special Transaction / Daily Journal, XLSX `Day Sheet` sheet | P2 | S | RPT-MONTHLY-15, ENG-27, ENG-30 | Default run equals the legacy row set; with `hide_zero_rows` only non-zero rows remain and the echo says so; a code-row drill lists legs summing to the row |
| RPT-MONTHLY-17 | `monthly.aging_report_by_home_office` definition on the shared ageing builder (unit `account`): home-office attribution, account aggregates, item-level patient-type / provider / Patient AR filters, account-level threshold / bucket / credit / insurance-expected / collection predicates, identity, last payment, statement date, balance status, contract balances | P2 | L | RPT-MONTHLY-02, RPT-MONTHLY-03, DATA-22, DATA-35, DATA-37, DATA-53, FLT-16 | Vendor example (charge 100 at A, payment 100 at B) lists no account; grand total with credits included equals organisation A/R (R-05); each legacy option toggled alone changes the row set as its parity row says on fixtures; the footer echo matches the legacy wording |
| RPT-MONTHLY-18 | Ageing Summary format and GROUP BY PROVIDER for both ageing reports: `office_summary` block, provider level with Preferred (fallback last-visit provider) and Transaction basis, provider subtotals, grand total, `compare_report_date` | P2 | M | RPT-MONTHLY-17, RPT-MONTHLY-02 | Summary bucket totals equal the Detail office totals for the same parameters; an account with items of two providers splits exactly between them; Provider picker greyed until GROUP BY PROVIDER |
| RPT-MONTHLY-19 | PDF renderer `aging_block` (three-line account block, dashed rule, Ins: / Pat: tags, phones, office totals, `Total Accounts with A/R`) and the flat Excel layout with bucket triples and the Over 120+ extension, for both ageing reports | P2 | M | ENG-23, ENG-27, RPT-MONTHLY-03, RPT-MONTHLY-17 | Side by side with the 2019 / 2025 PDF and 2023 Excel samples every column and footer item is present; Excel switch shows Over 120+ and the five extended triples; PDF never shows them |
| RPT-MONTHLY-20 | Ageing enhancement parameters for both ageing reports: `min_age_days`, `last_payment_before`, `exclude_accounts_with_payment_plan`, `exclude_accounts_with_future_appointment`, `aging_bucket_set` | P2 | S | RPT-MONTHLY-17, DATA-19, DATA-37 | Each key at its default leaves the parity run unchanged; each key alone removes exactly the fixture accounts it targets |
| RPT-MONTHLY-21 | Ageing worklist actions for both ageing reports: open account ledger, open guarantor patient, collection letter, SMS and e-mail reminders with consent exclusions, follow-up task, statement hand-off, export selection; `worklists.patient_ar` hand-off | P3 | M | ENG-49, RPT-MONTHLY-17, SEC-03 | Bulk SMS excludes accounts without consent and reports the count; entity ids come from the snapshot; every hand-off is audited with the patient manifest |
| RPT-MONTHLY-22 | `monthly.aging_report` definition (unit `account_office`): transaction-office attribution, per-office account blocks, cross-office credits, account-level fields repeated per office line, `only_cross_office_accounts`, `show_account_ledger_balance`, transfer row action | P2 | M | RPT-MONTHLY-02, RPT-MONTHLY-17, RPT-MONTHLY-18, RPT-MONTHLY-19 | Vendor example gives A = 100 and B = -100 with credits included and no B row by default; each office total with credits included equals its ledger balance (R-14b); `only_cross_office_accounts` lists exactly the fixture accounts with balances in two offices |
| RPT-MONTHLY-23 | Live legacy verification of reports 1-4: the open questions of this part (chair-hour unit, provider binding, GROUP BY layouts, day-sheet total row and order, credit rule, Patient AR meaning, Over 120+ on Aging Report, last payment payer) with owner and answer recorded in the parity decisions | P2 | S | FLT-23, RPT-MONTHLY-07 | Every open question of sections 1-4 has an answer or a recorded product decision; definitions with `[I]` items updated and `definition_version` bumped |
| RPT-MONTHLY-40 | Income Allocation definition, Summary format: roll-forward columns and both legacy formulas, magnitude sign rule, `Unallocated` and `Unassigned provider` rows, zero rows from the office roster, `title_templates`, background run | P2 | L | RPT-MONTHLY-04, DATA-26, DATA-20, ENG-11, ENG-38, ENG-59, FLT-03 | on `golden_small` the vendor-sample arithmetic holds per row (`income` and `ending_balance` recomputed from the printed columns); a payment entered Feb 1 back-dated to Jan 15 is in February `payments`; a Jan prepayment allocated to a Mar charge is in the Jan `Unallocated` row and in Mar `prev_allocation`; a provider selection hides the `Unallocated` row; a non-income payment code (`COLPY`) lands in `non_income`, never in `payments` or `income`; a `TRANSFER - Payment From` / `To` pair between two providers moves `income` from the From to the To provider (proposed rule, re-checked after the live capture) |
| RPT-MONTHLY-41 | Income Allocation Detail format and drills: allocation lines with Pay / Entered / Allo / Proc dates, `income_column`, provider subtotals, drill provider row -> Detail, line -> `ledger.account_allocation` | P2 | M | RPT-MONTHLY-40, ENG-30 | per provider and office the Detail subtotal equals the Summary `income`; the drill list total equals the clicked number |
| RPT-MONTHLY-42 | Income Allocation roll-forward variance check: `ending_balance_check` from `rpt_ar_open_items(date_to)`, run warning `roll_forward_variance`, `unclassified_adjust` column for migrated adjustments | P2 | S | RPT-MONTHLY-40, DATA-12, RPT-MONTHLY-06 | a fixture with a back-dated charge inside the range produces the warning with the exact amount; a migrated period shows `unclassified_adjust` non-zero and `Income Adj` columns zero |
| RPT-MONTHLY-43 | Income Allocation enhancements: `office_layout = consolidated`, `split_payments_by_payer`, `production_groups`, `include_zero_rows`, pay-period saved view and pin action | P2 | S | RPT-MONTHLY-40, ENG-28, ENG-36 | consolidated totals equal the sum of the per-office sections; patient + insurance payments equal `payments`; defaults reproduce the legacy run |
| RPT-MONTHLY-44 | Allocation Detail definition: population rules (payments only, income targets, created-date range, `allocation_date <= date_to`), `payment_types` on `deposit_group` with `no_predicate`, payment-type sections, `Other / uncategorised` section | P2 | M | RPT-MONTHLY-04, DATA-03, DATA-26, FLT-14 | grand total equals Σ `payments` of Income Allocation for the same offices, providers and dates; a migrated payment with tender `cash` and no catalog code prints under Cash flagged `tender_assumed`; unticking Cash removes exactly the cash lines (catalog and assumed); only lines with neither code group nor tender print in `Other / uncategorised`; a prepayment never allocated is absent |
| RPT-MONTHLY-45 | Allocation Detail `datewise_summary` block and enhancements `group_by` (`payment_type` / `provider` / `none`), `payers`, `cross_office_only`, `include_allocated_after_range` | P2 | S | RPT-MONTHLY-44, ENG-11 | datewise rows sum to the office total per payment type; `cross_office_only` lists exactly the lines with credit office different from allocation office |
| RPT-MONTHLY-46 | Unallocated Payment/Adjustments definition (`status: beta` until DATA-26): unallocated rows by credit office, created-date range or as-of-today, `Exclude Credit Balances` on the account balance, `Include Inactive Patients`, responsible-party subtotals, derived-equals-credit-balance warning | P2 | M | DATA-26, RPT-MONTHLY-04, FLT-15 | ticking the as-of checkbox disables both dates and lists every unallocated credit; the DATA-26 fixture (open insurance portion + patient overpayment) lists the overpayment with Exclude Credit Balances ticked; an as-of-today grand total equals the Income Allocation `Unallocated` ending balance for the office |
| RPT-MONTHLY-47 | Unallocated worklist: enhancements `unallocated_reasons`, `credit_kinds`, `min_unallocated_amount`, `older_than_days`; row navigation; bulk `create_task`, `letters`, `export_selection`; saved view "Unapplied, account still owes" | P3 | S | RPT-MONTHLY-46, ENG-49 | a bulk task creates one task per selected account and is audited; the letter hand-off receives only accounts with a credit balance |
| RPT-MONTHLY-48 | Daily Journal Summary by Allocation definition: Summary and Detail blocks, debit legs by own office, credits by allocation office / provider, unallocated line, office code block through the shared code-row renderer | P2 | M | RPT-MONTHLY-05, RPT-MONTHLY-04, ENG-24, DATA-03 | over all offices of the tenant Σ charges + payments + adjustments equals the Daily Journal net movement for the same range (fixture with a contractual write-off, an unpaired transfer and an `APBAC` credit: each counted once); charges per office equal the Daily Journal charges |
| RPT-MONTHLY-49 | Daily Journal Summary by Allocation enhancements: `allocation_dating`, `show_allocation_bridge` block, optional `provider_ids`, `suppress_zero_rows` | P2 | S | RPT-MONTHLY-48 | the bridge identity (journal payments - to other offices + from other offices - unallocated + previously unallocated now applied = payments by allocation) holds per office on a two-office fixture under both `allocation_dating` values |
| RPT-MONTHLY-50 | WaterFall Report definition: matrix block (service month x allocation month), `billed_amount`, `collected_pct`, `remaining_balance`, `payment_adjustment_scope`, per-office matrices, wide-matrix PDF banding | P2 | M | ENG-31, RPT-MONTHLY-04, DATA-26, ENG-23, ENG-27 | row totals equal the allocated credits of the service month (RPT-MONTHLY-08 identity); `Payments only` + `Adjustments only` cells sum to `Payments and Adjustments` cells; a 24-column matrix prints in two page bands with row labels repeated |
| RPT-MONTHLY-51 | WaterFall enhancements: `column_mode = lag_month`, `max_lag_months`, `show_cumulative_pct`, `allocation_lines` format as cell drill, cohort chart | P2 | S | RPT-MONTHLY-50, ENG-30 | the lag view totals equal the calendar view totals; a cell drill lists rows that sum to the cell |
| RPT-MONTHLY-52 | Live legacy capture for the five allocation reports: sample prints of Income Allocation Detail, Allocation Detail, Unallocated, Daily Journal Summary by Allocation (both formats) and WaterFall for one office and one month with a cross-office payment and a prepayment; answers recorded against the open questions of each section | P2 | S | FLT-23, RPT-MONTHLY-07 | every open question of the five sections has an answer or a written waiver; definitions whose inferred defaults change are re-versioned |

<!-- ASSEMBLED from catalog/parts/montly_reports/ (00_header.md, 10_reports_01_04.md, 20_reports_05_09.md). Edit this document directly from now on. -->
