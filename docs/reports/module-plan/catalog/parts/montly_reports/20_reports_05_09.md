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

<!-- PARITY:montly_reports.r05 -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | `report_format = detail`: allocation lines grouped office > allocation provider, provider subtotals of the income columns, office and grand totals |
| REPORT FORMAT `Summary` | `report_format = summary`: one roll-forward row per provider, `Unallocated` row, `Total :` row per office |
| OFFICE/GROUP `Office` (default) + picker (default the working office, `108`) | `office_ids`; filters `allocation_office_id` of allocation rows and `office_id` of the non-allocated legs (charges, production adjustments, income adjustments (+), non-income); the `Unallocated` row by `credit_office_id`. One section per resolved office |
| OFFICE/GROUP `Office Group` + picker | `office_group_id` / `office_group_ids`: resolved to the group's offices, same columns; still one section per office |
| PROVIDER `ALL` (default) | no provider predicate; every provider with activity or on the roster of the office is listed, plus `Unallocated` and `Unassigned provider` rows |
| PROVIDER list | `allocation_provider_id IN (...)` on allocation rows, `provider_id IN (...)` on the other legs; the `Unallocated` row is not printed (it belongs to no provider) [I]; the footer echo lists the provider ids |
| DATE RANGE Start Date (default today) | lower bound of `credit_created_date` for payment / credit columns; lower bound of `transaction_date` for charges and adjustments [I]; `beginning_balance` is computed as of `date_from - 1` |
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
created_date` (04 7.2 row 28). Office attribution: allocation office; provider attribution: allocation provider.

Column rules (A = `rpt_payment_allocations`, L = `rpt_ledger_entries`; "income target" = `allocation_target IN
('production', 'non_production_charge', 'debit_adjustment')`; all amounts are magnitudes unless stated):

| Column | Rows | Date predicate | Office / provider |
|---|---|---|---|
| `beginning_balance` | `rpt_ar_open_items(p_as_of = date_from - 1, p_unit = 'account')`, `item_kind` open debit, Σ `open_amount` (signed) | as of | `office_id`, `provider_id` of the open item |
| `charges` | L `entry_type = 'charge'` (buckets `production` and `non_production_charge`) | `transaction_date` in range [I] | `office_id` (= office of service), `provider_id` |
| `production_adjust_pos` / `_neg` | L `ledger_bucket = 'production_adjustment'`, `is_income`, `amount > 0` / `< 0` | `transaction_date` in range [I] | own `office_id`, `provider_id` (adjustments are specific to patient, provider and location `[D]`) |
| `payments` | A, `credit_entry_type IN ('patient_payment', 'insurance_payment')`, income target, `method <> 'unallocated'` | `credit_created_date` in range and `allocation_date <= date_to` | `allocation_office_id`, `allocation_provider_id` |
| `prev_allocation` | A as `payments`, target `production` / `non_production_charge`, or `debit_adjustment` whose `debit_ledger_bucket <> 'production_adjustment'` | `credit_created_date < date_from` and `allocation_date` in range | as `payments` |
| `prev_allocation_prod_adj` | A as `payments`, target `debit_adjustment` with `debit_ledger_bucket = 'production_adjustment'` | `credit_created_date < date_from` and `allocation_date` in range | as `payments` |
| `income_adjust_neg` | A, `credit_entry_type = 'adjustment'`, `credit_ledger_bucket = 'collection_adjustment'`, income target | as `payments` | as `payments` |
| `prev_allocation_income_adj` | A as `income_adjust_neg` | as `prev_allocation` | as `payments` |
| `income_adjust_pos` | L `ledger_bucket = 'collection_adjustment'`, `is_income`, `amount > 0`, excluding `entry_type = 'refund'` with a `linked_payment_id` (already netted by `refund_link`) | `created_date` in range | own `office_id`, `provider_id` |
| `non_income` (signed) | L `ledger_bucket = 'non_income_adjustment'` | `created_date` in range [I] | own `office_id`, `provider_id` |
| `unclassified_adjust` (NEW, shown only when non-zero) | L `ledger_bucket = 'unclassified_adjustment'` (every migrated adjustment until DATA-12) | `transaction_date` in range | own office, provider; not in `income`; added to `ending_balance` signed |
| `income` | computed from the columns above (formula of Legacy output), `computed` spec, zero-safe | - | - |
| `ending_balance` | computed roll-forward; hidden `ending_balance_check` = `rpt_ar_open_items(p_as_of = date_to)` per provider; a difference prints the run warning `roll_forward_variance` with the amount | - | - |

`Unallocated` row (one per office, `provider_ids = all` only): `beginning_balance` = Σ unallocated credits as of
`date_from - 1` (signed, negative); `payments` / `income_adjust_neg` = unallocated remainders as of `date_to` of credits
created in the range; `prev_allocation` = minus the amount moved out of the pool (credits entered before the range,
allocated in it); `ending_balance` = unallocated credits as of `date_to`; `income` blank. Attributed to
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
| `allocation_id` (hidden) | - | id | financial_patient | `row_id_column` |
| `income_column` | Column | enum (`payments`, `prev_allocation`, `prev_allocation_prod_adj`, `income_adjust_neg`, `prev_allocation_income_adj`, `income_adjust_pos`, `non_income`) | aggregate | - |
| `pay_date` | Pay Date | date (`credit_transaction_date`) | phi_identified | - |
| `entry_date` | Entered | date (`credit_created_date`) | phi_identified | - |
| `allocation_date` | Allo Date | date | phi_identified | - |
| `service_date` | Proc Date | date | phi_identified | - |
| `credit_patient_name`, `chart_no` | Paid By (patient), Chart # | text | phi_identified | - |
| `payer` | Payer | enum (`patient`, `insurance`) | aggregate | - |
| `credit_code`, `credit_description` | Code, Description | text | phi_identified | - |
| `check_number` | Check # | text | payment_instrument | - |
| `debit_patient_name` | Procedure Patient | text | phi_identified | - |
| `procedure_code`, `tooth`, `surface` | Proc Code, Th, Surf | text | phi_identified | - |
| `method` | Method | enum (`explicit`, `remittance_line`, `adjustment_target`, `derived_fifo`) | aggregate | - |
| `amount` | Amount | money (signed by `income_column`: minus for `income_adjust_pos`) | financial_patient | sum per provider = Summary `income`; per office; grand |
| `account_id`, `credit_patient_id` (hidden) | - | id | phi_identified | drill, manifest |

Sort: Summary `row_kind`, `provider_name`; Detail `income_column` order, `allocation_date`, `credit_patient_name`,
`allocation_id`. No `sort_by` parameter (legacy has none). Page break: none in legacy; PDF starts each office on a new
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

<!-- PARITY:montly_reports.r06 -->

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
| PAYMENT TYPES all six ticked (default) | `semantics.full_selection = no_predicate`: no tender predicate, so insurance payments and payments without a category (migrated rows, `deposit_group = 'none'`) are listed and print in section `Other / uncategorised` |
| PAYMENT TYPES a subset | `deposit_group IN (...)`, rows without a category dropped; at least one box (`min_items = 1`) |
| OTHER OPTIONS `Show Datewise Summary` (ticked) | adds block `datewise_summary` after each office (`role = query`, the block is built by the builder); unticked: no recap |
| PRINT / PREVIEW, CLEAR CRITERIA, ADD TO MY FAVORITES | `print`, `frontend`, `saved_view` |

Dependency rules: none on the legacy screen.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `group_by` | `enum` (shared key; options `payment_type`, `provider`, `none`) | `payment_type` (the inferred legacy layout) | `provider`: allocation-provider sections with subtotals - the per-provider audit trail of `payments`; `none`: one flat list |
| `payers` | `enum_multi` NEW (`patient`, `insurance`; owner 04) | both, `no_predicate` | `rpt_payment_allocations.payer`; isolates insurance money that legacy PAYMENT TYPES cannot separate |
| `cross_office_only` | `boolean` NEW (owner 04) | `false` | `true`: only lines with `credit_office_id <> allocation_office_id` - payments taken in one office that paid another office's work |
| `include_allocated_after_range` | `boolean` NEW (owner 04) | `false` | `true` drops the `allocation_date <= date_to` cut: shows range payments allocated later (live view) |
| `date_range` presets | `date_range` | `today` | `last_month`, `last_2_weeks`, `month_to_date`; saved view per pay period |

### Data

Datasets: `rpt_payment_allocations`, `rpt_payments` (code, description, check number, `deposit_group`, `card_brand`),
`rpt_patient_dim`, `rpt_account_dim`, `rpt_provider_dim`, `rpt_office_dim`, `rpt_charges` (tooth, surface via
`debit_entry_id`). Fixed `date_basis = created_date` (04 7.2 row 29). Office attribution: allocation office (implied);
provider attribution: allocation provider (implied).

Population: `rpt_payment_allocations` rows with `credit_entry_type IN ('patient_payment', 'insurance_payment')`,
`method <> 'unallocated'`, `allocation_target IN ('production', 'non_production_charge', 'debit_adjustment')`
(provider-income targets; refunded, opening-balance and transfer matches are left out and counted in the criteria block),
`credit_created_date` in range, `allocation_date <= date_to`. Credit adjustments are not listed (the screen is about
PAYMENT TYPES) [I]. Tender: join `rpt_payments` on `credit_entry_id = entry_id` for `deposit_group`; payment legs from
remittances have `deposit_group` of their code (insurance check / EFT) or `none`.

Availability (coverage row 18): **READY** on derived allocations; payment-type sections on history: REPAIR(12)
(migrated tender is only `cash`, `check`, `card`, `ach` or NULL, no CareCredit, Direct Deposit or Internal Financing
distinction, no check numbers); created dates of migrated rows: REPAIR(10); real allocation lines: SCHEMA(26). A migrated
month lists derived lines that Denticon would not print the same way.

### Output

Block `allocation_lines` (`fixed_outer` office; level `deposit_group` per `group_by`; subtotal "Total <type> :"):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `allocation_id` (hidden) | - | id | financial_patient | `row_id_column` |
| `deposit_group` (hidden key), `payment_type_label` | Payment Type | enum | aggregate | group key and label |
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
(legacy); offices start a new PDF page. Summary cards: `allocated_amount` total, `payment_count` total, share of derived
lines.

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

<!-- PARITY:montly_reports.r07 -->

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
| `credit_kinds` | `enum_multi` NEW (`patient_payment`, `insurance_payment`, `adjustment`; owner 04) | all, `no_predicate` | filters `credit_entry_type` |
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
negative leg with a patient (payments, credit adjustments, write-offs, opening-balance credits such as `APBAC`);
`transfer_pair` legs never appear.

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
| `responsible_party_name` (hidden sort key `responsible_party_last_name`) | Resp Party | text | phi_identified | group label |
| `entry_date` | Entered | date | phi_identified | - |
| `transaction_date` | Tran Date | date | phi_identified | - |
| `credit_patient_name`, `chart_no` | Patient, Chart # | text | phi_identified | - |
| `credit_kind` | Type | enum (`patient_payment`, `insurance_payment`, `adjustment`) | aggregate | - |
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

Sort: `responsible_party_last_name`, `responsible_party_first_name`, `entry_date`, `credit_entry_id`. Page break: none
(legacy); enhancement `page_break_by` not offered. Summary cards: `unallocated_amount` total, account count
(`count_distinct account_id`), lines older than 30 days.

### Visuals and drill-through

Chart: none - a list (an ageing bar of `unallocated_amount` by `age_days` band 0-30 / 31-90 / 91+ is offered as an
optional card).

| Click | Target |
|---|---|
| Line or account subtotal | `ledger.account_allocation`, `account_id` <- column, `date_from` = `credit_created_date`, `date_to` = today |
| Patient name | patient record (record right of the patient feature, 08) |
| Office grand total | `monthly.income_allocation`, `report_format = summary`, `office_ids` <- group, dates copied (the `Unallocated` row) |

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

<!-- PARITY:montly_reports.r08 -->

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
| `allocation_dating` | `enum` NEW (`credit_transaction_date`, `allocation_date`; owner 04) | `credit_transaction_date` (inferred basis) | `allocation_date`: allocated credits are dated by `allocation_date` instead; lets the live verification switch the default without a schema change |
| `show_allocation_bridge` | `boolean` NEW (owner 04) | `false` | adds block `allocation_bridge` per office: journal payments by entry (same range, transaction office), minus allocated to other offices, plus allocated from other offices, minus unallocated remainder, equals payments by allocation |
| `provider_ids` | `entity_multi` (shared) - enhancement, legacy screen has none | `all` | `provider_id` of debit legs and `allocation_provider_id` of allocated credits |
| `suppress_zero_rows` | `boolean` NEW (owner 04) | `false` (legacy-like code rows) | hides 0.00 code rows in the Summary office block |
| `date_range` presets | `date_range` | `today` | `last_month`, `month_to_date` |

### Data

Datasets: `rpt_ledger_entries` (debit legs, `journal_column`, codes), `rpt_payment_allocations` (credit parts),
`rpt_transaction_code_dim` (code rows), `rpt_patient_dim`, `rpt_provider_dim`, `rpt_office_dim`. Fixed `date_basis =
transaction_date` (04 7.2 row 31, inferred).

| Part | Rows | Office / provider | Column |
|---|---|---|---|
| Charges and production adjustments | L `journal_column = 'charges'`, `transaction_date` in range | own `office_id`, `provider_id` | `charges` |
| Debit collection-side legs (refunds, reversals, finance charges with Sub Type Collection, contract billing) | L `journal_column = 'adjust'`, `amount > 0` | own `office_id`, `provider_id` | `adjustments` |
| Payments | A, `credit_entry_type IN ('patient_payment', 'insurance_payment')`, `method <> 'unallocated'`, `credit_transaction_date` in range | `allocation_office_id`, `allocation_provider_id` | `payments` (negated) |
| Credit adjustments | A, `credit_entry_type = 'adjustment'`, `method <> 'unallocated'`, column by the credit's `journal_column` (production credits to `charges`, others to `adjustments`) | allocation office / provider | `charges` or `adjustments` (negated) |
| Unallocated | A, `method = 'unallocated'`, credit dated in range | `credit_office_id`; provider row `Unallocated` | `payments` or `adjustments` |
| Unclassified migrated adjustments | L `ledger_bucket = 'unclassified_adjustment'` | own office, provider | `adjustments`, code row `unclassified` (REPAIR(12)) |

Credits matched to `refund`, `opening_balance` or `transfer` targets stay in their column under the provider of the
matched debit (they move A/R) - so `Σ charges + payments + adjustments` over all offices equals the Daily Journal's net
movement for the same range when credits and debits are dated in the range (test).

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
`allocated_to_other_offices`, `allocated_from_other_offices`, `unallocated_remainder`, `payments_by_allocation` (money,
financial_practice).

Sort: Summary `provider_name`, `code_order`, `code`; Detail `transaction_date`, `patient_name`, `line_id`. Page break:
none (legacy); offices on a new page. Summary cards: `charges`, `payments`, `adjustments`, `net_total` totals.

### Visuals and drill-through

Chart: grouped bar per provider of `payments` by allocation beside the provider's payments by entry (from the bridge
data) - shows who is paid for whose collections.

| Click | Target |
|---|---|
| Provider subtotal | `kind = rows`: same report, `report_format = detail`, `provider_ids` <- group, `office_ids` <- group |
| Code row | `kind = rows`: Detail filtered to the code (hidden NEW parameter `transaction_codes`, set through `param_map`) |
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
| 5 | Are production-side credit adjustments (write-offs) counted by allocation or by entry? |

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

<!-- PARITY:montly_reports.r09 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | `output_format` (`role = output`, `csv` added); never changes the matrix |
| OFFICE/GROUP `Office` (default) + picker (default the working office) | `office_ids` on `allocation_office_id` (office where the paid production was charged) [I]; one matrix per office |
| OFFICE/GROUP `Office Group` + picker | `office_group_id` / `office_group_ids`, same column |
| DATE RANGE Start Date / End Date (default today / today) | service months: rows for every month touched by `service_date BETWEEN date_from AND date_to` of the paid debit; columns from the first service month through the month of the run date. Help text: "use a range of at least one quarter" (vendor guidance); the default single day yields one row |
| OTHER OPTIONS `Payments and Adjustments` (default) | `payment_adjustment_scope = payments_and_adjustments`: every allocated credit |
| OTHER OPTIONS `Payments only` | `payments_only`: `credit_entry_type IN ('patient_payment', 'insurance_payment')` |
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
| `billed_amount` (row) | Σ debit legs of `rpt_ledger_entries` with `entry_type = 'charge'` or debit adjustments (`entry_type = 'adjustment'`, `amount > 0`, buckets `production_adjustment` / `collection_adjustment`), `service_date_effective` in the service month, `office_id` in scope |
| cell | Σ `rpt_payment_allocations.amount`, `method <> 'unallocated'`, `allocation_target IN ('production', 'non_production_charge', 'debit_adjustment')`, credit filter of `payment_adjustment_scope`, grouped by `date_trunc('month', service_date)` x `date_trunc('month', allocation_date)` (or lag `months_between`) |
| `total_collected` (row) | Σ cells of the row |
| `collected_pct` (row) | `ratio(total_collected, billed_amount)` |
| `remaining_balance` (row) | `billed_amount` - Σ every allocation of the row's debits regardless of the radio (open as of today) |

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
| `billed_amount` | Production | money | financial_practice | sum |
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

<!-- WORK-ITEMS -->
| RPT-MONTHLY-40 | Income Allocation definition, Summary format: roll-forward columns and both legacy formulas, magnitude sign rule, `Unallocated` and `Unassigned provider` rows, zero rows from the office roster, `title_templates`, background run | P2 | L | RPT-MONTHLY-04, DATA-26, DATA-20, ENG-11, ENG-38, ENG-59, FLT-03 | on `golden_small` the vendor-sample arithmetic holds per row (`income` and `ending_balance` recomputed from the printed columns); a payment entered Feb 1 back-dated to Jan 15 is in February `payments`; a Jan prepayment allocated to a Mar charge is in the Jan `Unallocated` row and in Mar `prev_allocation`; a provider selection hides the `Unallocated` row |
| RPT-MONTHLY-41 | Income Allocation Detail format and drills: allocation lines with Pay / Entered / Allo / Proc dates, `income_column`, provider subtotals, drill provider row -> Detail, line -> `ledger.account_allocation` | P2 | M | RPT-MONTHLY-40, ENG-30 | per provider and office the Detail subtotal equals the Summary `income`; the drill list total equals the clicked number |
| RPT-MONTHLY-42 | Income Allocation roll-forward variance check: `ending_balance_check` from `rpt_ar_open_items(date_to)`, run warning `roll_forward_variance`, `unclassified_adjust` column for migrated adjustments | P2 | S | RPT-MONTHLY-40, DATA-12, RPT-MONTHLY-06 | a fixture with a back-dated charge inside the range produces the warning with the exact amount; a migrated period shows `unclassified_adjust` non-zero and `Income Adj` columns zero |
| RPT-MONTHLY-43 | Income Allocation enhancements: `office_layout = consolidated`, `split_payments_by_payer`, `production_groups`, `include_zero_rows`, pay-period saved view and pin action | P2 | S | RPT-MONTHLY-40, ENG-28, ENG-36 | consolidated totals equal the sum of the per-office sections; patient + insurance payments equal `payments`; defaults reproduce the legacy run |
| RPT-MONTHLY-44 | Allocation Detail definition: population rules (payments only, income targets, created-date range, `allocation_date <= date_to`), `payment_types` on `deposit_group` with `no_predicate`, payment-type sections, `Other / uncategorised` section | P2 | M | RPT-MONTHLY-04, DATA-03, DATA-26, FLT-14 | grand total equals Σ `payments` of Income Allocation for the same offices, providers and dates; unticking Cash removes cash lines and the uncategorised migrated lines; a prepayment never allocated is absent |
| RPT-MONTHLY-45 | Allocation Detail `datewise_summary` block and enhancements `group_by` (`payment_type` / `provider` / `none`), `payers`, `cross_office_only`, `include_allocated_after_range` | P2 | S | RPT-MONTHLY-44, ENG-11 | datewise rows sum to the office total per payment type; `cross_office_only` lists exactly the lines with credit office different from allocation office |
| RPT-MONTHLY-46 | Unallocated Payment/Adjustments definition (`status: beta` until DATA-26): unallocated rows by credit office, created-date range or as-of-today, `Exclude Credit Balances` on the account balance, `Include Inactive Patients`, responsible-party subtotals, derived-equals-credit-balance warning | P2 | M | DATA-26, RPT-MONTHLY-04, FLT-15 | ticking the as-of checkbox disables both dates and lists every unallocated credit; the DATA-26 fixture (open insurance portion + patient overpayment) lists the overpayment with Exclude Credit Balances ticked; an as-of-today grand total equals the Income Allocation `Unallocated` ending balance for the office |
| RPT-MONTHLY-47 | Unallocated worklist: enhancements `unallocated_reasons`, `credit_kinds`, `min_unallocated_amount`, `older_than_days`; row navigation; bulk `create_task`, `letters`, `export_selection`; saved view "Unapplied, account still owes" | P3 | S | RPT-MONTHLY-46, ENG-49 | a bulk task creates one task per selected account and is audited; the letter hand-off receives only accounts with a credit balance |
| RPT-MONTHLY-48 | Daily Journal Summary by Allocation definition: Summary and Detail blocks, debit legs by own office, credits by allocation office / provider, unallocated line, office code block through the shared code-row renderer | P2 | M | RPT-MONTHLY-05, RPT-MONTHLY-04, ENG-24, DATA-03 | over all offices of the tenant Σ charges + payments + adjustments equals the Daily Journal net movement for the same range; charges per office equal the Daily Journal charges |
| RPT-MONTHLY-49 | Daily Journal Summary by Allocation enhancements: `allocation_dating`, `show_allocation_bridge` block, optional `provider_ids`, `suppress_zero_rows` | P2 | S | RPT-MONTHLY-48 | the bridge identity (journal payments - to other offices + from other offices - unallocated = payments by allocation) holds per office on a two-office fixture |
| RPT-MONTHLY-50 | WaterFall Report definition: matrix block (service month x allocation month), `billed_amount`, `collected_pct`, `remaining_balance`, `payment_adjustment_scope`, per-office matrices, wide-matrix PDF banding | P2 | M | ENG-31, RPT-MONTHLY-04, DATA-26, ENG-23, ENG-27 | row totals equal the allocated credits of the service month (RPT-MONTHLY-08 identity); `Payments only` + `Adjustments only` cells sum to `Payments and Adjustments` cells; a 24-column matrix prints in two page bands with row labels repeated |
| RPT-MONTHLY-51 | WaterFall enhancements: `column_mode = lag_month`, `max_lag_months`, `show_cumulative_pct`, `allocation_lines` format as cell drill, cohort chart | P2 | S | RPT-MONTHLY-50, ENG-30 | the lag view totals equal the calendar view totals; a cell drill lists rows that sum to the cell |
| RPT-MONTHLY-52 | Live legacy capture for the five allocation reports: sample prints of Income Allocation Detail, Allocation Detail, Unallocated, Daily Journal Summary by Allocation (both formats) and WaterFall for one office and one month with a cross-office payment and a prepayment; answers recorded against the open questions of each section | P2 | S | FLT-23, RPT-MONTHLY-07 | every open question of the five sections has an answer or a written waiver; definitions whose inferred defaults change are re-versioned |
<!-- /WORK-ITEMS -->
