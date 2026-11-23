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

<!-- PARITY:daily_reports.r05 -->

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
| `include_reversed` | `boolean` (NEW, 04) | `false` | Adds payments reversed with refund as struck lines with the refund leg beside them; default keeps them live on their date (data card 2.10 rule), unchanged rows |
| `deposit_status` | `enum` (NEW, 04; P2 after DATA-28) `all` / `undeposited` / `deposited` | `all` | Lists only payments not yet on a deposit: the deposit-pack worklist |
| `show_card_brand` | `boolean` (NEW, 04) | `false` | Adds `Card` (brand + last four, DATA-12) in card sections for processor reconciliation |
| Saved view "All tender types" | saved view | - | All seven boxes ticked, `yesterday`, Show Patient |
| Quick filter on `Check #` | screen | - | Replaces the legacy browser-find routine |

### Data

| Item | Binding |
|---|---|
| Datasets | `rpt_payments` (all payment legs, both stores, PD-2), `rpt_transaction_code_dim` (through the row's `deposit_group` / `tender_class` / `card_brand`), `rpt_patient_dim`, `rpt_account_dim`, `rpt_user_dim`, `rpt_office_dim`; `insurance_carriers` passthrough for batch lines |
| Columns read | `entry_id`, `patient_id`, `account_id`, `amount`, `code`, `code_description`, `deposit_group`, `tender_class`, `card_brand`, `payer`, `transaction_date`, `payment_date`, `office_id`, `posting_office_id`, `provider_id`, `user_key`, `check_number`, `bank_number`, `payment_group_key`, `carrier_id`, `is_sign_anomaly`, `is_reversed_by_refund`, `deposit_id` |
| Row filter | Live rows (`NOT is_void`); reversed-with-refund payments stay on their date; capitation legs (`cap`) under their code's group with the carrier as name |
| Date basis | `date_basis` `transaction_date` -> `transaction_date`; `payment_date` -> `payment_date` (data card 4.1) |
| Office | Posting office `coalesce(posting_office_id, office_id)` (data card 5.1); NULL = "Unassigned office" member |
| Provider / user | Credited provider `rpt_payments.provider_id`; `user_key` (5.4) |
| `payment_types` | `coalesce(deposit_group, 'none') IN (:list)`; full selection = no predicate |
| `check_type` | Predicate on `payer` applied only to rows with `deposit_group = 'check'` |
| `group_batch_checks` | Builder aggregates check rows: `check_number` mode `GROUP BY office, date, payer, check_number, bank_number`; `batch_id` mode `GROUP BY remittance_id` (DATA-28), interim `payment_group_key` |
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
| Section total | `kind = report`, `daily.collection_report` with `date_range`, `office_scope`, `payment_codes` of the section copied |

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

Kept fixes: totals are sums (no ratio column in legacy); a zero-line appointment is counted and shown, not hidden.

### Parameters - legacy parity

<!-- PARITY:daily_reports.r06 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` / `Excel` | `output_format` `pdf` / `xlsx` (+ `csv`); rows unchanged |
| OFFICE/GROUP `Office` + picker (working office) | Scheduled side: appointment office `rpt_appointment_procedures.office_id`; actual side: office of service `rpt_charges.office_id`; goal side: goal office |
| OFFICE/GROUP `Office Group` + picker (ALL) | Offices of the chosen group(s) |
| PROVIDER > Provider (ALL) | Scheduled side: appointment provider (`rpt_appointment_procedures.appointment_provider_id`); actual side: treating provider (`rpt_charges.provider_id`); goal side: goal provider - INFERRED |
| DATE RANGE Start / End Date (today / today; future allowed) | Scheduled: `appointment_date` in range; actual: `transaction_date` (= `service_date` until DATA-13) in range, zero for future days; estimated: goal share of each day in range - INFERRED bases |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD (UPDATE) TO MY FAVORITES | As family |

No dependency rules (no greyed control on the screen).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_range` presets | `date_range` | `today` | `tomorrow`, `next_7_days`, `rest_of_month` (today to month end), month to date |
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
| Scheduled production | `SUM(scheduled_fee)` where `status_class NOT IN ('cancelled', 'no_show')`, `NOT is_block`, `NOT is_legacy_archive`, appointment not deleted, `appointment_date` in range (the `scheduled_production` metric definition) |
| Actual production | `SUM(charged_fee)` of live `rpt_charges` with `is_production`, `transaction_date` in range (posted fee, PD-1; production adjustments not included - vendor: "procedures posted") |
| Estimated Prod. | Per provider, office and day: monthly goal of that month / divisor; divisor = organisation setting `estimated_production_divisor` (NEW, 05 §8): `provider_working_days` (default, [P22], working days from `rpt_provider_calendar_days()`; non-working days get 0) or `fixed_20` ([P21], every weekday gets goal / 20) |
| Grain of the join | Full outer join of the three sides on (`office_id`, `day`, `provider_id`); a provider appears when any side is non-zero |
| Office / provider attribution | appointment office + appointment provider (scheduled); office of service + treating provider (actual); goal row (estimated) - all INFERRED, declared on the definition |
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

Summary cards: `Scheduled Prod.`, `Actual Prod.`, `Estimated Prod.` (grand totals); metric keys `scheduled_production`, `charged_production`, `production_goal` (P3, G(24)) for the reconciliation tests. `reconciles_with`: `scheduled_production` (scheduled total), `charged_production` (actual total, same office and range). Page break: none.

### Visuals and drill-through

| Element | Leads to |
|---|---|
| Chart | Grouped bars per day (scheduled vs actual) with an `Estimated Prod.` line; per provider when the range is one day |
| Scheduled Prod. cell | `kind = report`, `appointment.appointment_detail` (key provisional, Appointment category) with `date_range` = the day, `provider_ids` = row provider, `office_scope` copied |
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
| 2 | Date basis of each side and the provider meaning (appointment vs line provider for scheduled) | Book a hygiene line under a doctor appointment; run with one provider |
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

<!-- PARITY:daily_reports.r07 -->

| Legacy option | Effect on the result |
|---|---|
| OFFICE/GROUP `Office` + picker (working office) | Appointments of the chosen office(s) (appointment office); one or several offices |
| OFFICE/GROUP `Office Group` | Disabled (`option_enabled_when false`, as on the legacy screen) |
| PROVIDER > Provider (ALL) | Appointments whose appointment provider (`rpt_appointment_facts.provider_id`) is selected |
| DATE RANGE Start / End Date (today / today) | One slip per live appointment with `appointment_date` in range |
| REPORT BY `Next Scheduled Appointment` (default) | `Next Appointment` block = the patient's next live appointment after this one (any office): date, time, provider |
| REPORT BY `Next Scheduled Recall` | The same block shows the next scheduled recall (`rpt_recall_due` row with `scheduled_basis = 'exact'`, earliest `scheduled_date`): date, time, provider, recall code |
| OPERATORY (ALL) | Appointments in the selected operatories |
| PATIENTS > Patient (blank) + SEARCH | Blank = every patient with an appointment in the range; a patient (list allowed) = only that patient's appointments; SEARCH is the lookup built into the box |
| OTHER OPTIONS `Recommended` (default; info icon) | Procedure area: appointment codes if any, else the appointment provider's default routing-slip codes (`provider_route_slips`), else blank; then treatment-plan codes of accepted items, else of diagnosed items, else blank |
| OTHER OPTIONS `Active Treatment Plan` | Procedure area: appointment codes, then every open item of the patient's active treatment plan with phase and status |
| OTHER OPTIONS `Codes` | Procedure area: the procedure codes only (appointment codes, else provider defaults), no treatment-plan section - INFERRED reading of "procedure codes only" |
| Include Completed Procedures (unticked) | Ticked: completed treatment-plan items and completed appointment lines are also listed (marked `C`) |
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
| `date_range` presets | `date_range` | `today` | `tomorrow` (the documented routine), `next_business_day` (NEW token, 04) |
| `patient_ids` multi | `entity_multi` | `all` | Several patients (legacy one) |
| `appointment_statuses_included` | `enum_multi` (NEW, 04) `scheduled` / `confirmed` / `unconfirmed` / `in_office` / `completed` / `past_unresolved` | full selection | Print only confirmed patients, or skip completed ones on a same-day reprint; cancelled / no-show never print |
| `sections_hidden` | `enum_multi` (NEW, 04) of the section keys | none | Office-level slip trimming (for example hide Ortho, Recalls) saved in a view; legacy prints all |
| `appointment_ids` (from scheduler) | `entity_multi` (NEW, 04; hidden, set by drill / entry point) | `all` | Current-appointment-only print from the Scheduler (open question 1) |

### Data

| Section | Datasets and columns |
|---|---|
| Selection | `rpt_appointment_facts`: `appointment_id`, `office_id`, `operatory_id`, `provider_id`, `patient_id`, `appointment_date`, `start_time`, `duration_minutes`, `status_class`, `procedure_label`, `notes`, `is_block`, `is_deleted`, `is_legacy_archive`, `is_patientless`; filter `NOT is_block AND NOT is_deleted AND NOT is_legacy_archive AND status_class NOT IN ('cancelled', 'no_show') AND NOT is_patientless` |
| Patient Information | `rpt_patient_dim`: `patient_id`, `chart_no`, names, address, `dob` (age at run date), `gender_code`, `patient_type_codes`, `phone`, `cell_phone`, `work_phone`, `email`, `referral_source_name`, `referral_type_raw`; `Pat Since` = `rpt_patient_activity.first_visit_date`; `# of Ref` / `Lst Ref` = count and latest `referral_date` of `rpt_referral_facts` `inbound_source` rows naming this patient (data card 2.30); `Lst Ref Amt` NEW (meaning unconfirmed) |
| Med Alerts / Flash Alerts | `rpt_patient_alerts` active rows: medical alerts (`alert_label`); flash alerts `is_flash_alert` -> `Message`, `blocks_charges` -> `Block Charge` |
| Pat Notes | `patient_notes` passthrough (non-deleted) |
| Scheduled Appointment | selection row; `Reason` = `procedure_label`; `Appt Notes` = `notes`; operatory name from the `operatories` passthrough |
| Recalls | `rpt_recall_due(p_as_of = run date)`: `due_date`, `scheduled_date` (exact basis only), code description; P3 dataset (DATA-41): in P1 the block reads the existing per-patient recall service and switches when the dataset lands (coverage 11.1 rule) |
| Next Appointment | `rpt_appointment_facts`: first live appointment of the patient after this one's date and time; recall mode from `rpt_recall_due` |
| Visits | `rpt_patient_activity`: `first_visit_date`, `last_visit_date`, `last_missed_date`, `missed_count`, `cancelled_count` |
| Preferred | `rpt_patient_dim.preferred_provider_id`, `preferred_hygienist_id` (NULL on migrated patients: printed blank) |
| Responsible Party | `rpt_account_dim` guarantor name, address, phones |
| Billing Information | `Billing Type` = `rpt_account_dim.resp_party_type`; `Last Stmt Date` / `Amt` = `last_statement_date` and the `patient_statements` row of that date; `Last Pay` / `Last Ins Pay` = `rpt_patient_activity` dates with the amount of that row; aging grid = `rpt_ar_open_items(p_as_of = run date, p_unit = 'account')` with the `legacy` bucket set: row `Account Balance` over the account, row patient over the patient's items; `Est Pat.` / `Est Ins.` = `open_patient` / `open_insurance_est` |
| Carriers | `rpt_insurance_coverage` dental slots tier primary / secondary: `carrier_name`, `employer_name`, `subscriber_name`, `subscriber_id`, `subscriber_dob`, `relationship`, `individual_max`, `individual_deductible`, `group_number`, `elig_status_class`; `Rem Max` / `Rem Ded` = `rpt_benefit_usage()` effective remainders (P2, DATA-32; in P1 `benefit_usage_service.slot_benefits`) |
| Ortho | `rpt_ortho_contracts` (P3) + `rpt_payment_plan_contracts` (P2): treat dates, banding date, `total_ortho_amt`, patient and insurance plan amounts, periodic amount, next due, remaining amount and count; `Code`, `Desr`, `Down Pay` are NEW columns (03); per-patient ortho service in P1 |
| Procedure area | `rpt_appointment_procedures` (code, tooth, surface, `scheduled_fee`, `line_status_raw`), `provider_route_slips` (`procedure_code`, `num_times`), `rpt_treatment_item_facts` (`exclusive_status`, `is_completed`, `is_scheduled`, `phase_id`, `fee`, plan); active plan needs a plan status (NEW `plan_status` on the dataset, 03) |
| Office / provider | Appointment office; appointment provider (data card 5.1, 5.2) |
| Rating | READY (coverage 11.1 #7) |
| Fields blocked | `Billing Type`: SCHEMA(53); `First Visit` / `Last Visit`: REPAIR(19); `Last Stmt Date`: SCHEMA(22); recall block derived (maintained rows SCHEMA(41)); ortho block: APP (no contract migrated) |
| Migrated history | No preferred provider / hygienist, no eligibility status (`unknown`), family remainders stale, referral counters unreliable, appointment notes present |
| Availability codes (NEW, list owned by 03) | `billing_type_missing`, `visit_dates_derived`, `statement_dates_missing`, `recall_derived`, `patientless_appointments_skipped` |

### Output

The engine result has two blocks; the PDF renders them as slips.

Block `slips` (main, one row per appointment = one document):

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `appointment_date`, `start_time` | Date, Time | date, time | phi_identified | none |
| `patient_name` | Patient | text (key) | phi_identified | `count` (`Slips : n`) |
| `pat_id` / `chart_no` | Pat ID | text | phi_identified | none |
| `provider_name` | Provider | text | aggregate | none |
| `operatory_name` | OP | text | aggregate | none |
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
| 4 | Label and fields of the Next Appointment block under `Next Scheduled Recall` | Run REPORT BY recall |
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

<!-- PARITY:daily_reports.r08 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` / `Excel` | `output_format` `pdf` / `xlsx` (+ `csv`) |
| OFFICE/GROUP `Office` + picker / `Office Group` | Office of the note (`detail`, `unsigned`) or of the appointment (`missing`) |
| PROVIDER > Preferred Provider (ALL) | `rpt_patient_dim.preferred_provider_id IN (...)`: patients whose preferred provider is selected, all three variants; migrated patients (no preferred provider) only under `all` |
| PROGRESS NOTES TO PRINT `Detail` (default) | Every non-deleted note in the range (struck-off included, marked) |
| PROGRESS NOTES TO PRINT `Unsigned` | Notes with `NOT is_signed AND NOT is_struck_off` in the range; migrated notes excluded (signature status unknown) with warning |
| PROGRESS NOTES TO PRINT `Missing` | Live appointments in the range without a progress note of the patient (same office, same day; exact appointment link after DATA-18) |
| DATE RANGE `DOS Date` (default) | `note_date`; under `missing` the appointment date (a missing note has no DOS) |
| DATE RANGE `Created On Date` | `created_date` of the note (load time on migrated notes: warning); under `missing` the appointment `created_date` (app era only) |
| DATE RANGE `Appointment Date` (greyed under Detail) | `unsigned`: notes whose patient has a live appointment in the same office on the note date, appointment date in range; `missing`: `appointment_date` |
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
| `include_struck_off` | `boolean` (NEW, 04) | `true` | `detail`: hide struck-off notes |
| `show_primary_carrier` | `boolean` (NEW, 04) | `false` | Adds `Primary Carrier` (the second sample's column) |
| Saved views | saved view | - | "Unsigned - yesterday", "Missing - today, my appointments" |

### Data

| Item | Binding |
|---|---|
| Datasets | `rpt_progress_note_facts` (`note_id`, `patient_id`, `office_id`, `note_date`, `created_date`, `created_at_utc`, `author_user_id`, `author_provider_id`, `is_signed`, `signed_at`, `signed_by_user_id`, `is_struck_off`, `is_locked`, `era`); note text from the `progress_notes` passthrough by `note_id` (NEW passthrough registration, 03), decoded server-side; `rpt_appointment_note_audit()` (missing: one row per live appointment with note flags); `rpt_patient_dim`, `rpt_user_dim`, `rpt_provider_dim`, `rpt_insurance_coverage` (primary carrier) |
| Note text decoding | Legacy `notes_html` is stored double-escaped with the `~^^~` marker; the frontend decodes it only through `noteContent.ts`. The PDF / XLSX builder needs a Python twin of that decoder with shared test vectors, else migrated notes print escaped markup |
| Date basis | `service_date` -> `note_date`; `created_date` -> `created_date` (data card 4.1); `appointment_date` -> appointment date (missing; unsigned through same-day appointment) |
| Office | Note office / appointment office |
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
| `author_provider_name` | Provider | text (`unsigned`) | aggregate | none |
| `note_status` | Status | enum `signed` / `unsigned` / `struck_off` / `locked` | phi_identified | none |
| `signed_at` | Signed | datetime (`tz: office`) | phi_identified | none |
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

Sort inside a date: patient last name, first name, note `created_at_utc`, `row_id_column` (`note_id` / `appointment_id`). Page break: `none` / `patient`; because the patient level exists only when it is chosen, this definition declares `page_break_by` with `role: query` (exception to filter_card 8). Summary cards: `Notes` (detail), `Unsigned` (metric key `unsigned_progress_notes_count`), `Missing` (`missing_progress_notes_count`; equal only with `preferred_provider_ids = all`, the metric filters by appointment provider). `empty_when`: `no_detail_rows` with the "all clear" state for `unsigned` and `missing`.

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

<!-- WORK-ITEMS -->
| RPT-DAILY-40 | Deposit Slip definition and builder: sections by `deposit_group` (NULL as `none`), posting-office attribution, `check_type` on Check rows, `payer_display`, both date bases with the DATA-13 warning, display sign | P1 | M | DATA-03, DATA-06, DATA-13, RPT-DAILY-03, RPT-DAILY-04 | On the fixture day with all seven boxes ticked the Grand Total equals `-SUM(amount)` of live payment legs on the posting office; Cash-only default lists only `deposit_group = cash`; Insurance Checks drops the patient checks; before DATA-13 both bases return the same rows and the warning |
| RPT-DAILY-41 | Deposit Slip PDF layout `deposit_slip`: per-section columns (Bank # / Check # only in Checks), date and payment-code subtotals, office header with address and phone, starred payer note | P1 | M | ENG-23, RPT-DAILY-02, RPT-DAILY-40 | A two-day run with Cash, Check and Credit Card renders the legacy block order, `Total Checks, <date>:`, `Total for <code> :`, `Grand Total For Checks:`, `Grand Total:`; a caller without `payment_instrument` gets the slip without Bank # / Check # |
| RPT-DAILY-42 | Group Batch Checks: `check_number` mode now; `batch_id` mode on remittances (DATA-28) with the interim `payment_group_key` and its warning | P2 | S | DATA-28, RPT-DAILY-40 | One insurance cheque paying three claims prints one line in both modes after DATA-28; before it, Batch ID mode prints the heuristic warning; totals unchanged by grouping |
| RPT-DAILY-43 | Deposit pack: `deposit_status` parameter and bulk action `create_deposit` over the snapshot | P2 | M | DATA-28, RPT-DAILY-40 | Undeposited view lists only rows without `deposit_id`; the action creates one deposit, is idempotent per run and entry, and a payment cannot land on two deposits (R-09) |
| RPT-DAILY-44 | Scheduled Production definition: three-sided outer join (booked lines, posted charges, goals) by office, day and provider; enhancements `provider_kinds`, `show_variance`, `show_appointment_counts` | P1 | M | DATA-16, DATA-06, RPT-DAILY-07 | Scheduled total equals `scheduled_production` and actual total equals `charged_production` for the same parameters; a cancelled appointment's lines drop out; a future day shows actual 0 |
| RPT-DAILY-45 | Estimated Prod.: read `provider_production_goals`, organisation setting `estimated_production_divisor` (`provider_working_days` default, `fixed_20`), working days from `rpt_provider_calendar_days()` | P1 | S | DATA-24, DATA-55, RPT-DAILY-44 | With a 22-working-day month and goal 44,000 a working day shows 2,000 under `provider_working_days` and 2,200 under `fixed_20`; no goal row prints empty, never 0, with `production_goals_missing` |
| RPT-DAILY-46 | Scheduled Production at start of day: optional `Sched. at start of day` column from the daily snapshot for past days | P4 | S | DATA-48, RPT-DAILY-44 | For a past day the column equals `scheduled_production_start_of_day`; the warning `past_book_is_current_state` disappears for days with a snapshot |
| RPT-DAILY-47 | Routing Slip definition: appointment selection (status, block, archive, patientless rules), Office Group disabled, sort options, slip index block, Print Blank Routing Slip branch, `schedulable: false` | P1 | M | DATA-16, ENG-05, RPT-DAILY-01 | Default run for a fixture day returns one index row per live appointment of the working office in `sort_by` order; a cancelled and a block appointment get no slip; blank mode runs no data query and prints one empty form |
| RPT-DAILY-48 | Routing Slip section builders: patient info, alerts, notes, scheduled and next appointment (both REPORT BY modes), visits, preferred, responsible party, billing with aging grid, two carriers with benefit remainders, ortho, flash alerts; P1 reads per-patient services for recall, benefit and ortho blocks | P1 | L | DATA-19, DATA-20, DATA-21, DATA-52, DATA-53, RPT-DAILY-47 | Each field of the legacy sample is filled for the fixture patient or blank with its availability code; the aging row `Account Balance` equals the account ledger balance; `Sub ID` is absent for a caller without `phi_sensitive`, alert boxes without `clinical` |
| RPT-DAILY-49 | Routing Slip procedure area resolver: Recommended order (appointment codes, `provider_route_slips`, accepted then diagnosed items), Active Treatment Plan, Codes, Include Completed Procedures | P1 | M | DATA-56, RPT-DAILY-47 | Fixture vectors: appointment with lines prints its lines; without lines prints the provider defaults; a patient with accepted and diagnosed items prints only the accepted ones; ticking Include Completed adds completed items marked C |
| RPT-DAILY-50 | Routing Slip PDF layout `slip`: one slip per page, `OP:` top right, sectioned page numbers, volumes of 200, blank form, per-patient print audit | P1 | L | ENG-23, ENG-14, RPT-DAILY-48 | A 60-appointment day renders 60 slips in under the interactive limit; a 450-slip week runs in background as three volumes; the audit holds one print event per patient |
| RPT-DAILY-51 | Routing Slip entry points: Scheduler (current appointment / day at this location / all locations) and Patient Overview through `appointment_ids` / `patient_ids` drills (after the open-question decision) | P1 | S | RPT-DAILY-47, UX hub runner | Right-click Print in the Scheduler produces the same slip as the report for that appointment; the hidden `appointment_ids` parameter is echoed |
| RPT-DAILY-52 | Progress Notes definition: variants `detail`, `unsigned`, `missing` (two blocks), basis bindings per variant, d01 rule, `page_break_by` patient level with `role: query`, per-variant key class | P1 | M | DATA-18, FLT-20, RPT-DAILY-05 | Detail lists every note of the range; Unsigned excludes signed, struck-off and migrated notes; Missing returns one row per appointment without a note (ALL: every appointment with flags); a caller without `clinical` is refused Detail and runs Missing |
| RPT-DAILY-53 | Server-side note text decoder (Python twin of `noteContent.ts` for the legacy double-escaped `notes_html`) with shared test vectors, used by PDF, XLSX and CSV | P1 | S | RPT-DAILY-52 | The same fixture notes render identical plain text in the Progress Notes screen and in the PDF; no `~^^~` marker or escaped entity appears in any export |
| RPT-DAILY-54 | Progress Notes actions and schedules: Review and sign / Write note navigation, Remind authors tasks, staff message handler, `skip_if_empty` schedules for Unsigned / Missing | P1 | S | ENG-30, SEC-09, RPT-DAILY-52 | A bulk reminder creates one task per author listing that author's notes; a scheduled Missing run with no rows sends nothing; a navigation lands on the note only with the feature right |
| RPT-DAILY-55 | Live verification of the r05-r08 specifics: Deposit Slip None payer mode, Cash layout, batch output; Scheduled Production layout, bases and goal source; Routing Slip procedure columns, recall-mode block, `Lst Ref Amt`; Progress Notes Unsigned / Missing layouts and the Unsigned greying | P1 | S | RPT-DAILY-09 | Every open question of the four sections has a recorded answer with a screenshot reference and the decisions file is updated through its owner |
<!-- /WORK-ITEMS -->
