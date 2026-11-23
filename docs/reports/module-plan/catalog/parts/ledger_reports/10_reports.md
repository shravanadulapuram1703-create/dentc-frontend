## Ledger Report - `ledger.ledger_report`

Ledger Reports, screenshot `1.PNG` - P1 - M - `reports_ledger_reports_screen_view_only` / `_full_control` - instant - PARTIALLY DOCUMENTED (how it is run and what a ledger line holds documented; printed layout INFERRED)

### Purpose

Front desk and billing staff, on demand: a printed or exported ledger of one guarantor account (all family members) or of
one patient for a date range - when a patient asks what was paid in a year, when the statement does not show enough
history, for a dispute, a collection agency hand-off or a transfer of care ([R] research section 5, Ledger Report, `[V47]`).
It is also the paper form of the on-screen Patient Ledger / Account Ledger (`/patient/:patientId/ledger`,
`/account-ledger`), so its lines and balances must equal the screen.

### Legacy output

Confidence: line content DOCUMENTED (ledger screen guide `[V23]`), printed layout INFERRED (no vendor sample exists).

| Element | Legacy (source) | New report |
|---|---|---|
| Printed title | not documented | `title_templates`: `Account Ledger` when `report_type = account_ledger`, `Patient Ledger` when `patient_ledger` (print-menu item names) [I] |
| Header | office and responsible party / patient, account number, date range [I] | Letterhead, `Office :` band, person block (name, address, `Account # :`), `From` / `Thru` |
| Line content | `Date` (date of service for procedures, claim created date for claims, entry date for payments / adjustments), `Patient`, `Office`, `A` (`P` patient / `R` responsible party), `Code` (procedure code, `CLM-P` / `CLM-S`, payment / adjustment code), `TH`, `Surf`, `Type` (`P` production / `C` collection), note and EOB indicators, `Description`, `Bill` (`D`..`DDDD`, `M` / `MM`), `Duration`, `Provider`, `Est Pat`, `Est Ins`, `Amount`, `Balance`, `User` [D] | The same columns in the same order (note and EOB indicators: see Output) |
| Sort | the account ledger can be sorted by transaction date or date of service [D] | `sort_by` enhancement, default transaction date (legacy print order not documented) |
| Closing | closing balance and an ageing / estimated-insurance / estimated-patient summary as on the Walkout [I] | Summary block `Balance Summary` at report end (proposal, marked [I] in the definition description) |
| `Print all transactions (includes statements, ledger notes)` | adds the non-financial rows - `Statement Sent - $X.XX`, ledger notes, probably claim lines - otherwise omitted [I] | Adds statement, note and claim rows without amounts |
| Quirk | voided transactions and unclosed statements show struck through on the ledger screen; whether they print is `[unverified]` | Not printed by default; enhancement `include_voided_transactions` prints them struck through and outside the balance |

Signs: one signed `Amount` column (charges positive, payments and credits with a leading minus), running `Balance`
signed (credit balance negative). Kept.

### Parameters - legacy parity

<!-- PARITY:ledger_reports.r01 -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT = Account Ledger (default) | `report_type = account_ledger`: every live leg whose `account_id` = the selected account (all current members); `account_id` visible and required, `patient_id` hidden; running balance of the account; `Patient` column shown |
| REPORT FORMAT = Patient Ledger | `report_type = patient_ledger`: every live leg whose `patient_id` = the selected patient; `patient_id` visible and required, `account_id` hidden; running balance of the patient; `Patient` column hidden (one patient) |
| OFFICE/GROUP = Office (default; Office Group greyed) | Office locked to the working office; prints in the letterhead and `Office :` band; does not filter lines (shared rules, F-3) |
| Office picker (greyed, `108`) | Read-only display of the working office; no other value can be sent |
| Start Date / End Date (default today / today) | Lines with `transaction_date` in the range; the balance before `date_from` prints as the first line `Previous Balance` so the running balance is the true account balance |
| Responsible Party + SEARCH (pre-filled with the account in context) | The one account of the run; SEARCH superseded by the typeahead / dialog of `account_id` |
| Print all transactions - unchecked (default) | Money lines only |
| Print all transactions - checked | Also `Statement Sent - $X.XX` rows (`patient_statements`, app era), ledger-note rows (`account_notes`) and claim rows (`rpt_claim_facts`: `CLM-P` / `CLM-S` with claim number and billed amount in Description, no amount in `Amount`) |
| Print-menu prompt "add a patient note" (`add_patient_note`, default false) | true: after the PDF is rendered one note per patient of the run is written through the patient-notes feature; rows unchanged |

Dependency rules: `account_id` `visible_when` / `required_when` `["eq", "report_type", "account_ledger"]`; `patient_id`
`visible_when` / `required_when` `["eq", "report_type", "patient_ledger"]` (04 9.5); `office_scope` forced (9.3);
`add_patient_note` has no rule (always offered, role `output`).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `sort_by` | `enum` `transaction_date`, `service_date` | `transaction_date` | Legacy ledger screen offers both orders [D]; `service_date` sorts by `service_date_effective`; the running balance follows the chosen order |
| `transaction_types` | `enum_multi` `services`, `payments`, `adjustments` (shared, 04 3.8) | all ticked (`no_predicate`) | Narrows the printed lines; the running balance still counts every leg (hidden legs are summed into the balance, a note "filtered view: balance includes all transactions" prints) |
| `include_voided_transactions` | `boolean` (NEW key, owner: this catalog) | `false` | Reads `rpt_ledger_entries_all`; voided legs print struck through with `Voided` in Description and never enter the balance (DATA-14 adds who and when for app rows) |
| `include_archived_transactions` | `boolean` (NEW key) | follows the tenant policy `legacy_archive_policy` | Shown only to callers with `reports_ledger_reports_screen_full_control` when the tenant policy is `exclude`; prints archived migrated lines (`is_archived`) flagged `Archived` |
| `date_preset` | presets `year_to_date`, `previous_year`, `last_12_months` | `today` | Tax-year ledger in one click; saved views keep the preset |
| `output_format` | `pdf` / `xlsx` / `csv` | `pdf` | Shared rule |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ledger_entries` (live), `rpt_ledger_entries_all` (voided option), `rpt_charges` (tooth, surface, `apply_to`, `bill_tier`, `duration_minutes`), `rpt_patient_dim`, `rpt_account_dim`, `rpt_office_dim`, `rpt_provider_dim`, `rpt_user_dim`, `rpt_procedure_code_dim`, `rpt_transaction_code_dim`, `rpt_claim_facts`, passthroughs `patient_statements`, `account_notes`, `rpt_ar_open_items()` for the summary block |
| Population | `account_ledger`: `rpt_ledger_entries.account_id = :account_id`; `patient_ledger`: `patient_id = :patient_id`. Then `transaction_date BETWEEN :date_from AND :date_to` |
| Previous balance | `sum(amount)` of the same population with `transaction_date < :date_from` (one row, `entry_type = previous_balance`, hidden id `prev:<account or patient>`) |
| Running balance | `previous_balance + sum(amount) OVER (ORDER BY <sort keys>, entry_id ROWS UNBOUNDED PRECEDING)`, computed in the builder, not in the renderer |
| Date basis | `transaction_date` (fixed). Charges: equal to `service_date` until DATA-13. Claim rows: `rpt_claim_facts.created_at_utc` converted to the claim office date (app era); migrated claims have no created date [V] - they use `submitted_date`, else the earliest line service date, and the row is flagged `date_source = substitute` |
| Office | printed per line from `rpt_ledger_entries.office_id` → `rpt_office_dim.short_id`; NULL (migrated unknown office) prints `Unassigned` |
| Provider | the provider on the leg: `rpt_ledger_entries.provider_id` (treating provider of a charge, credited provider of a payment, provider of an adjustment) → `rpt_provider_dim.short_id`; NULL prints blank |
| User | `user_key` → `rpt_user_dim.user_label`; migrated rows print the legacy login string |
| Column derivations | `A` = `rpt_charges.apply_to` (charges only); `T` = `P` when `journal_column = 'charges'`, `C` when `journal_column IN ('payment', 'adjust')` and `txn_side <> 'unknown'`, blank for unclassified migrated adjustments; `Bill` = `bill_tier` → `D` (primary), `DD`, `DDD`, `DDDD`, blank (`none`); `M` / `MM` (medical) has no source today and prints blank |
| Code and description | charges: `procedure_code`, `rpt_procedure_code_dim.description`; payments / adjustments: `code`, `rpt_transaction_code_dim.description` (migrated rows: system alias and tender, REPAIR(12)); remittance legs: `Insurance Payment (DOS mm/dd/yy)` with the carrier name from `carrier_id` |
| Availability | READY. Options: statement rows APP (`patient_statements` has no migrated rows); ledger notes READY (4,518 migrated `account_notes` rows); claim rows of migrated claims carry no lines or service dates until the `claim_id` backfill (data card 2.20); payment and adjustment codes on history: REPAIR(12) (DATA-12); the migrated charge set is incomplete until DATA-57 / R-21 - the completeness warning of the data card prints in the criteria block (`availability[]` code `migrated_ledger_incomplete`) |
| Cannot be produced | the legacy per-line note / EOB indicators for migrated rows (no link was migrated); the account as it was before a guarantor change (`account_change_events` app era only, data card 5.3) - a patient moved between accounts shows all his lines under the current account |

### Output

One format `standard`, two blocks.

Block `lines` (main, `shape = table`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `transaction_date` | Date | date | `phi_identified` | label `Totals` |
| `patient_name` | Patient | text (`First Last`) | `phi_identified` (key) | none; `visible_when` `report_type == account_ledger` |
| `office_short_id` | Office | text | `aggregate` | none |
| `apply_to` | A | text | `phi_identified` | none |
| `code` | Code | text | `phi_identified` | none |
| `tooth` | TH | text | `phi_identified` | none |
| `surface` | Surf | text | `phi_identified` | none |
| `txn_type` | T | enum `P` / `C` | `aggregate` | none |
| `description` | Description | text | `phi_identified` | none |
| `bill_tier_label` | Bill | text | `phi_identified` | none |
| `duration_minutes` | Duration | integer | `phi_identified` | none |
| `provider_short_id` | Provider | text | `aggregate` | none |
| `est_patient` | Est Pat | money | `financial_patient` | sum |
| `est_insurance` | Est Ins | money | `financial_patient` | sum |
| `amount` | Amount | money (minus sign) | `financial_patient` | sum (period activity) |
| `running_balance` | Balance | money | `financial_patient` | none (the closing balance prints as `Ending Balance` in `balance_summary`) |
| `user_label` | User | text | `aggregate` | none |
| hidden: `entry_id` (row id), `patient_id`, `account_id`, `claim_id`, `entry_type`, `is_void`, `is_non_financial`, `sort_service_date` | | | entity classes (rule 6) | |

Block `balance_summary` (`placement = report_end`, `shape = key_value`) [I]: `Previous Balance`, `Charges` (sum of
debits), `Credits` (sum of credits), `Ending Balance` (= last running balance), then as of `date_to` from
`rpt_ar_open_items(p_unit = 'account')`: `Estimated Insurance` (`open_insurance_est`), `Estimated Patient` (`open_patient`),
`Credit Balance` (unallocated credits). All `financial_patient`. Patient Ledger shows the patient's own open items.

Grouping: none (one person per run). Sort: `sort_by` (enhancement), tie-breaker `entry_id`. Page break: none.
Summary cards: `ending_balance` (block `balance_summary`), `period_charges`, `period_credits`;
`reconciles_with`: `ending_balance` = metric `total_ar` for the one account as of `date_to` (05: "one account: P1").
`empty_when`: `no_detail_rows` on `lines` (a range without activity still prints the Previous Balance row and is not
empty for printing, but is reported empty to the user with "No transactions in the range").

### Visuals and drill-through

None - a list. Drill: a charge, payment or adjustment line → `kind = record`, `route_key = patient_account_ledger`
(account ledger) or `patient_ledger` (patient ledger) with the entry id highlighted, right
`transactions_patient_ledger_screen_full_control`; a claim line → `route_key = claim` (`claim_id`), right
`transactions_insurance_claims_details_view_only`; the `Ending Balance` figure → `ledger.account_allocation` with
`account_id` (`{"param": "account_id"}`, or the patient's `account_id` column) and the same `date_range`.

### Actions

| Action | Kind | Detail |
|---|---|---|
| Open patient | row, `navigate` → `patient_overview` | needs `phi_identified` |
| Open the account ledger screen | row, `navigate` → `patient_account_ledger` | same line highlighted |
| Print walkout / super bill for this account | row, `navigate` to `ledger.walkout_report` / `ledger.super_bill` with the person and range | |
| Add patient note | via `add_patient_note` at print time (RPT-LEDGER-04) | |

Not a worklist.

### Export and print

PDF: layout `banded_table`, landscape (17 columns), letterhead, repeating column header, `Previous Balance` as first
line, `balance_summary` after the last line, criteria echo in the footer, page numbers per document. XLSX: one sheet
`Ledger` with the line table (typed money and date cells, no merged cells, running balance as a value), one sheet
`Summary` with the key-value block, a `Criteria` sheet. CSV: the line table only, formula-injection guard. Always inline
(one account; the largest migrated account has a few thousand lines - `max_rows_inline` 10,000 suffices).

### Open questions

| # | Question | Check / owner |
|---|---|---|
| L-1 | Does REPORT FORMAT = Patient Ledger replace the RESPONSIBLE PARTY box by a patient selector (vendor text says the patient ledger is run by selecting the patient; the panel in that state was never captured)? | Live tool |
| L-2 | Are lines of other offices printed (the office is locked to the working office)? | Live tool (F-3) |
| L-3 | Exact effect of "Print all transactions (includes statements, ledger notes)": statement rows, notes, and also claim lines? Where do note rows sort? | Live tool |
| L-4 | Wording and form of the print-menu "add a patient note" prompt and the note text it writes | Live tool |
| L-5 | Printed title, column set and closing summary of the legacy print (layout INFERRED) | Live tool: print one account ledger and one patient ledger |
| L-6 | Print order of the legacy report (transaction date or date of service) | Live tool |

## Walkout Report - `ledger.walkout_report`

Ledger Reports, screenshot `2.PNG` - P1 - L - `reports_ledger_reports_screen_view_only` / `_full_control` - instant (one account; `escalate_when` the name range spans more than one account → interactive) - DOCUMENTED (vendor samples 2022, 2023)

### Purpose

Front desk at check-out after every appointment: the patient's receipt for today's services and payments, with the
account balance, its ageing, the statement messages and the next appointment ([R] research section 5, Walkout Report,
`[V40]` `[V41]`). Also the card-payment receipt the patient signs (legacy signature viewer). Printed from the appointment
(Scheduler), from the patient Print menu or from Reports > Ledger Reports for a range of responsible parties (end-of-day
batch of the day's walkouts).

### Legacy output

Confidence DOCUMENTED (two vendor samples) except where marked.

| Area | Content (in print order) |
|---|---|
| Title | `Statement of Services Rendered` |
| Header | office logo; office address, `Ph #`, `Fax #`; box `Date :` (run date), `Account # :`, `Account Balance :`, `Office # :` (office short id); addressee = responsible party name and address; long date line (`Tuesday, August 9, 2022`) |
| Line table, default | `Date` · `Description` · `Chart #` · `Patient Name` · `Check #` · `Code` · `Th` · `Surf` · `Charges` · `Credits` |
| Line table, both options on | `Date` · `Description` · `Patient Name` · `Check #` · `Code` · `Th` · `Surf` · `Est. Pat` · `Est. Ins` · `UCR` · `Charges` · `Credits` (`Chart #` dropped) |
| First line | `Previous Balance` with the amount |
| Lines | procedures (description, patient first name, code, tooth, amount); patient payments named by tender (`American Express`); `Insurance Payment (Dos:02/11/23)`; adjustments (`ADJ OFF - Admin Adjustment`, `REFUND - Insurance`); contract movements (`Balance Moved to Contract`, `Contract DownPayment`) |
| Totals | `Total of Today's Activity :`, `Total Balance for the Account :` |
| Ageing grid | `Account Balance as of : <date>` - columns `Current` · `Over30` · `Over60` · `Over90` · `Over120` · `Total Balance`; rows `Estimated Insurance`, `Estimated Patient`; at the right `Reg Cont. Bal.` · `Ort Cont. Bal.` |
| `Messages :` | statement messages: the general one plus the ageing-specific one |
| `Comments :` | empty box |
| Next appointment table | `Patient Name` · `Next Appt Date` (weekday + date) · `Time` · `Next Appt Office` (name, address, phone) · `Reason`; printed only when an appointment exists |
| Footer | `Printed`, copyright, page |

Variants: the column set changes with `Show charges break down` and `Include UCR`; with only one option on, the sample
set is not documented - the new layout inserts the option's columns before `Charges` and keeps `Chart #` (proposal; the
legacy drops `Chart #` in the wide variant to save width). Signs: two positive columns (`Charges` = debit, `Credits` =
credit); totals signed. Quirks kept: logo prints; next appointment only when one exists; downstream parsing must not rely
on column positions. Viewer extras (signature pads `Card Holder Signature`, `Dentist Signature`, `Save PDF file`): an
enhancement in P2 (RPT-LEDGER-14).

### Parameters - legacy parity

<!-- PARITY:ledger_reports.r02 -->

| Legacy option | Effect on the result |
|---|---|
| OFFICE/GROUP = Office (default; Office Group greyed) | Working office, locked: header office and activity-line filter (transaction office); balances and ageing stay account-wide |
| Office picker (greyed, `108`) | Read-only display |
| Start Date / End Date (default today / today) | Activity lines with `transaction_date` in the range at the working office; `Previous Balance` = account balance at the end of `date_from - 1`; ageing grid and `Account Balance as of` at `date_to` |
| Start Name / End Name (pre-filled from the patient in context) | Accounts whose guarantor sort name lies in the range (prefix rule); one walkout per account with at least one activity line in the range; same name in both boxes = that account only |
| SEARCH (two buttons) | Superseded by the lookup icon of each box |
| Show charges break down - unchecked (default) | No estimate columns |
| Show charges break down - checked | `Est. Pat` and `Est. Ins` per line (charges only) |
| Include UCR - unchecked (default) | No UCR column |
| Include UCR - checked | `UCR` column left of `Charges` (office fee of the charge) |
| Print dialog `General Message` (`general_message`) | Text printed first in `Messages :`; default the office statement message |
| `Current Message` .. `Over 120 Message` (`current_message`, `over_30_message`, `over_60_message`, `over_90_message`, `over_120_message`) | The one message of the account's oldest open bucket is printed after the general message (rule [I]); default the office statement messages |
| Print dialog option "add a note that a walkout was printed" (`add_patient_note`, default false) | true: a note is written after rendering; rows unchanged |

Dependency rules: `office_scope` forced; no other enable / show rules (the screen has none; the six messages and
`add_patient_note` are always shown on both entries).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `appointment_id` | `entity_single` (NEW key; source `appointments` of the selected office and day) | `null` | Set by the Scheduler entry: the activity lines are those of the appointment's patient-office-day; the name range is set to the patient's guarantor. Hidden on the hub form |
| `include_family_next_appointments` | `boolean` (NEW key) | `true` | `true` = one next-appointment row per account member (legacy sample lists the patient name per row, so the legacy prints members [I]); `false` = only patients who had activity in the range |
| `show_signature_lines` | `boolean` (NEW key) | `false` | Prints `Card Holder Signature` and `Dentist Signature` lines on paper (P1); electronic capture through the signature feature is RPT-LEDGER-14 (P2) |
| `skip_zero_activity_accounts` | `boolean` (NEW key) | `true` | Name-range runs only: accounts without an activity line in the range get no walkout (the legacy population rule [I]); `false` prints a balance-only walkout for every account in the range |
| `output_format` | shared | `pdf` | |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ledger_entries` (lines, previous balance, account balance), `rpt_charges` (tooth, surface, `office_fee`), `rpt_patient_dim` (first name, chart number), `rpt_account_dim` (guarantor name, address, `account_no`), `rpt_office_dim` (letterhead, short id), `rpt_transaction_code_dim` (tender and code descriptions), `rpt_ar_open_items()` (ageing), `rpt_appointment_facts` (next appointment), `rpt_contract_installments` / `rpt_payment_plan_contracts` (contract balances, P2), office statement settings (messages) |
| Population | accounts `a` of `rpt_account_dim` with `upper(guarantor_last_name || ', ' || guarantor_first_name)` in the name range (prefix rule); kept when at least one live leg of `a` has `transaction_date` in the range and `office_id = :working_office` (or always, `skip_zero_activity_accounts = false`) |
| Activity lines | live legs of the account with `transaction_date` in the range and `office_id = :working_office` [I, W-2]; sorted by `transaction_date`, entry-type order, `entry_id` |
| Previous Balance | `sum(amount)` of all live legs of the account (all offices) with `transaction_date < :date_from` |
| Total of Today's Activity | `sum(amount)` of the activity lines |
| Total Balance for the Account | `sum(amount)` of all live legs of the account with `transaction_date <= :date_to` (all offices); equals `Account Balance :` in the header |
| Ageing grid | `rpt_ar_open_items(tenant, p_as_of = :date_to, p_account_ids = [accounts], p_unit = 'account')`, bucket set `legacy` (Current 0-29, Over30 30-59, Over60 60-89, Over90 90-119, Over120 120+; data card 2.14); row `Estimated Insurance` = `sum(open_insurance_est)` per bucket, `Estimated Patient` = `sum(open_patient)`; `Total Balance` = row sums; unallocated credits are not put in a bucket: they reduce `Total Balance` and print as `Credit :` under the grid ([I], W-6) |
| Contract balances | `Reg Cont. Bal.` / `Ort Cont. Bal.` = remaining unbilled amount of the account members' active regular / ortho contracts. P1: read from the existing payment-plan service per patient (coverage note "a report that ships earlier than its dataset"); P2: `rpt_payment_plan_contracts.pat_amount_remaining` grouped by `contract_kind` (DATA-37). APP: no contract was migrated |
| Next appointment | per account member: first `rpt_appointment_facts` row with `appointment_date > :date_to`, `NOT is_block`, `NOT is_deleted`, `NOT is_legacy_archive`, `status_class NOT IN ('cancelled', 'no_show')`, order `appointment_date, start_time`; `Next Appt Office` = `rpt_office_dim` name, address, phone of its office; `Reason` = `procedure_label` (DATA-16) [I, W-7] |
| Messages | `general_message` always; the aged message of the oldest bucket with `open_patient + open_insurance_est > 0` (`current_message` when only Current) |
| Descriptions | patient payment: tender label of `rpt_transaction_code_dim` (`card_brand` when known: REPAIR(12) for history, DATA-12); insurance payment: `Insurance Payment (Dos:<service_date_effective>)`; adjustment: code description; contract movements: their code descriptions (no contract credit is written today, DATA-37) |
| Office / provider attribution | transaction office for the line filter; no provider column |
| Availability | READY; contract balances APP; card brand on migrated payments REPAIR(12); next appointment reason empty on migrated appointments |

### Output

One format `standard`, documents of one account each (`record_per_page`).

Block `walkout_header` (`placement = report_start` per document, `key_value`): `statement_date` (Date, `phi_identified`),
`account_no` (Account #, `phi_identified`), `account_balance` (Account Balance, money, `financial_patient`),
`office_short_id` (Office #, `aggregate`), `guarantor_name`, `guarantor_address` (`phi_identified`), `long_date` (text).

Block `lines` (main, `table`) - column sets by option (`visible_when` on the columns):

| key | label | type | data_class | default variant | breakdown on | UCR on | both on | total rule |
|---|---|---|---|---|---|---|---|---|
| `transaction_date` | Date | date | `phi_identified` | yes | yes | yes | yes | label |
| `description` | Description | text | `phi_identified` | yes | yes | yes | yes | none |
| `chart_no` | Chart # | text | `phi_identified` | yes | yes | yes | no | none |
| `patient_first_name` | Patient Name | text | `phi_identified` | yes | yes | yes | yes | none |
| `check_number` | Check # | text | `payment_instrument` | yes | yes | yes | yes | none |
| `code` | Code | text | `phi_identified` | yes | yes | yes | yes | none |
| `tooth` | Th | text | `phi_identified` | yes | yes | yes | yes | none |
| `surface` | Surf | text | `phi_identified` | yes | yes | yes | yes | none |
| `est_patient` | Est. Pat | money | `financial_patient` | no | yes | no | yes | sum |
| `est_insurance` | Est. Ins | money | `financial_patient` | no | yes | no | yes | sum |
| `office_fee` | UCR | money | `financial_patient` | no | no | yes | yes | sum |
| `debit` | Charges | money | `financial_patient` | yes | yes | yes | yes | sum |
| `credit` | Credits | money | `financial_patient` | yes | yes | yes | yes | sum |
| hidden: `entry_id`, `account_id`, `patient_id`, `entry_type` | | | entity classes | | | | | |

First row `Previous Balance` (amount in `Charges` when positive, in `Credits` when negative). After the lines:
`Total of Today's Activity :` (`sum(debit) - sum(credit)`) and `Total Balance for the Account :`.

Block `ageing` (`after_group` per document, `matrix`): rows `Estimated Insurance`, `Estimated Patient`; columns
`current`, `over_30`, `over_60`, `over_90`, `over_120`, `total_balance`, plus `reg_contract_balance`,
`ortho_contract_balance`; all `financial_patient`; caption `Account Balance as of : <date_to>`.

Block `messages` (`key_value`): `Messages :` (general + aged message), `Comments :` (empty box).

Block `next_appointments` (`table`): `patient_name`, `next_appt_date` (weekday + date), `start_time`, `next_appt_office`
(name, address, phone), `reason`; all `phi_identified` (office text `aggregate`). Omitted when empty.

Grouping: `fixed_outer` level = account (one document per account, sorted by guarantor sort name, then `account_id`).
Page break: every account (`record_per_page`). Summary cards (screen only): `accounts_printed` (count),
`total_activity` (sum of activity), `total_collected_today` (sum of payment credits) - `financial_practice` when the run
spans more than one account. `reconciles_with`: `total_balance` of each document = `total_ar` for that account as of
`date_to`.

### Visuals and drill-through

None - a document. Drill: a line → `kind = record` `patient_account_ledger` (right
`transactions_patient_ledger_screen_full_control`); `Total Balance` → `ledger.ledger_report` with `report_type =
account_ledger`, `account_id` of the document and `date_range` = `previous_year` start through `date_to`; a bucket cell →
`ledger.account_allocation` for the account (which credits went where); a next appointment → `kind = record`, `route_key = appointment`
(`openSchedulerAtAppointment` with appointment id, date, office).

### Actions

| Action | Kind | Detail |
|---|---|---|
| Print from the appointment | entry point, Scheduler appointment menu → compact dialog with `appointment_id` (RPT-LEDGER-03) | replaces the legacy right-click > Print > Walkout Report |
| Take payment | row, `navigate` → payment entry of the account (`/patient/:patientId/transaction`, payments tab) | right `transactions_transaction_entry_screen_full_control`; the walkout re-runs after posting ("Run again for today") |
| Schedule next appointment | row, `kind = record`, `route_key = scheduler_booking` (`openSchedulerForBooking` with the patient) when the next-appointment block is empty | the Scheduler booking hand-off, never a bare navigation to `/scheduler` |
| Capture signatures | row, `custom:signature_capture` (P2, RPT-LEDGER-14) | |
| Add patient note | `add_patient_note` at print time | |

A name-range run doubles as the end-of-day walkout batch; it is not a worklist.

### Export and print

PDF: layout `slip`, portrait, letter size, one walkout per account (`record_per_page`, `sectioned_page_numbers`),
office logo and letterhead, the legacy block order above, criteria echo only on a separate last page of a multi-account
run (the walkout itself is a patient-facing document: no criteria footer, `criteria_echo = none` on document pages, the
run criteria page lists `From`, `Thru`, `Office :`, `Resp. Party Range`, starred options). `volume_size` 500 documents.
XLSX: sheet `Lines` (one row per line with `account_no` and guarantor name repeated, no merged cells), sheet `Ageing`
(one row per account and estimate row), sheet `Next Appointments`; CSV: the line table. Name-range runs above 200 accounts
run in the background (`escalate_when`).

### Open questions

| # | Question | Check / owner |
|---|---|---|
| W-1 | Column set with only one of the two options ticked | Live tool |
| W-2 | Are activity lines restricted to the working office, and are the balances account-wide? | Live tool, account with activity at two offices on the same day |
| W-3 | Is the name pre-fill the patient or the guarantor (test with a dependent)? Which accounts does a range include - only those with activity in the range? | Live tool (04 11.5) |
| W-4 | Default text of the six message boxes (office statement messages assumed) and the rule choosing the aged message | Live tool |
| W-5 | Title, label, control type and default of the "add a note" option; is the dialog also shown from the appointment right-click entry? | Live tool |
| W-6 | How a credit balance prints in the ageing grid | Live tool, account with a credit |
| W-7 | Next appointment: after the run date or after `date_to`; members of the account or only the patient; source of `Reason` | Live tool |

## Super Bill - `ledger.super_bill`

Ledger Reports, screenshot `3.PNG` - P1 - M - `reports_ledger_reports_screen_view_only` / `_full_control` - instant (one patient; `escalate_when` the name range spans more than one patient → interactive) - PARTIALLY DOCUMENTED (definition, options and rules documented; printed layout INFERRED, no vendor sample)

### Purpose

Front desk or billing on patient request: an itemised statement of services rendered on a date or in a range, with
payments and adjustments, that the patient attaches to a claim filed with the carrier on their own (out-of-network,
secondary not filed by the office), or uses as a tax / HSA / FSA receipt (payments only), or to see charges and payments
after insurance paid less than estimated ([R] research section 5, Super Bill, `[V21]` `[V45]` `[V46]`). It prints the
insurance billing provider of the office (Setup / Offices) because it supports a claim.

### Legacy output

Confidence: definition and options DOCUMENTED, layout INFERRED.

| Element | Legacy (source) | New report |
|---|---|---|
| Title | `Super Bill` (Ledger Reports list), `Superbill` (print menu), `Super Bill Report` (dialog) | `title_templates`: `Super Bill`; NEW enhancement: `Payment Receipt` when `transaction_types = [payments]` (product decision, not legacy) |
| Billing identity | office name / address and billing provider identity (name, licence / NPI / tax id as needed on a claim) [I] | Office name, address, phone; billing provider name, NPI, licence, tax id (F-6) |
| Patient block | patient and subscriber / insurance details [I] | Patient name, DOB, address, chart number, account number; primary and secondary dental coverage: carrier, subscriber name, subscriber id, group number |
| Lines | date of service, code, tooth, surface, description, provider, fee, then payments and adjustments [I] | DOS, Code, Th, Surf, Description, Provider (+ NPI), Charges, Credits; payments and adjustments after the services of their date |
| Totals | charges, credits, balance [I] | `Total Charges`, `Total Payments`, `Total Adjustments`, `Balance` |
| `Include Previous Balance` (dialog only) | adds a previous-balance line [D] | First line `Previous Balance` |
| Diagnosis codes | `[unverified]` | Not printed (no diagnosis on charges today; S-4) |
| Quirk | office logo does not print [D] | Kept: no logo |

Signs: two positive columns (`Charges`, `Credits`); `Balance` signed.

### Parameters - legacy parity

<!-- PARITY:ledger_reports.r03 -->

| Legacy option | Effect on the result |
|---|---|
| OFFICE/GROUP = Office (default; Office Group greyed) | Working office locked: billing identity of the form and line filter (services by office of service, credits by transaction office) |
| Office picker (greyed, `108`) | Read-only display |
| Start Date / End Date (default today / today; dialog label `DOS Date Range`) | Lines whose `service_date_effective` is in the range: services by date of service; payments and adjustments linked to a charge print with the charge's DOS, unlinked ones by their transaction date |
| Start Name / End Name (pre-filled with the patient in context) | One super bill per patient in the range (prefix rule) with at least one printed line; same name twice = that patient |
| SEARCH (two buttons) | Superseded by the lookup icons |
| TRANSACTION TYPES Services - checked (default) / unchecked | Service (charge) lines printed / omitted |
| Payments - checked (default) / unchecked | Patient and insurance payment lines printed / omitted; Payments only = tax receipt |
| Adjustment - checked (default) / unchecked | Adjustment, refund, transfer and opening-balance lines printed / omitted |
| All three ticked | Canonical `all`: no predicate |
| None ticked | Not allowed: 422 `min_items` (04 2.5) |
| Print dialog `Include Previous Balance` - false (definition default) / true | true: first line `Previous Balance` = patient balance before `date_from` (all offices), included in `Balance` |

Dependency rules: `office_scope` forced; none else. `include_previous_balance` shown in both entries.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `include_insurance_block` | `boolean` (NEW key) | `true` | Prints the coverage block (carrier, subscriber, ids); `false` for a tax receipt |
| `coverage_slot` | `enum` `primary`, `secondary` (NEW key) | `primary` | Which dental coverage the form is prepared for; the subscriber block prints that slot |
| `itemize_by_visit` | `boolean` (NEW key) | `false` | Groups lines by date of service with a per-visit subtotal (one claim per visit) |
| `date_preset` | presets `previous_year`, `year_to_date` | `today` | HSA / FSA year receipts |
| `output_format` | shared | `pdf` | |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ledger_entries`, `rpt_charges` (tooth, surface, `provider_id`), `rpt_patient_dim`, `rpt_account_dim` (`account_no`), `rpt_office_dim` (address, `billing_provider_id`), `rpt_provider_dim` (billing and treating provider name, `npi`, `license`, `tax_id`), `rpt_procedure_code_dim`, `rpt_transaction_code_dim`, `rpt_insurance_coverage` (current dental slots: carrier, subscriber, `subscriber_id`, `group_number`) |
| Population | patients of `rpt_patient_dim` whose sort name `upper(last_name || ', ' || first_name)` is in the range (prefix rule), with at least one printed line |
| Lines | live legs with `patient_id` = the patient, `service_date_effective BETWEEN :date_from AND :date_to`, entry class in `transaction_types` (services = `charge`; payments = `patient_payment`, `insurance_payment`; adjustments = `adjustment`, `refund`, `transfer`, `opening_balance`), office filter: charges `office_id = :working_office` (office of service), credits `office_id = :working_office` (transaction office) [I, S-2] |
| Previous balance | `sum(amount)` of the patient's live legs with `transaction_date < :date_from` (all offices) |
| Date basis | `service_date` (fixed) through `service_date_effective`; `service_date_source` printed as a footnote mark on lines dated by their transaction date |
| Provider attribution | treating provider of the charge (`rpt_charges.provider_id`) per line; billing provider = `rpt_office_dim.billing_provider_id` |
| Availability | READY. Migrated payments and adjustments are not linked to charges, so they print on their transaction date, not under the DOS they paid (data card 4.2); migrated payment codes REPAIR(12); NPI / licence blank where the provider record has none; coverage block shows today's coverage (the coverage at the date of service is not stored per charge until DATA-33) |

### Output

One format `standard`, one document per patient (`record_per_page`).

Block `bill_header` (`key_value`, per document): office name, address, phone (`aggregate`); `billing_provider_name`,
`billing_provider_npi`, `billing_provider_license` (`aggregate`), `billing_provider_tax_id` (`security_users`, F-6);
`patient_name`, `patient_dob`, `patient_address`, `chart_no`, `account_no` (`phi_identified`); coverage block
`carrier_name` (`aggregate`), `subscriber_name` (`phi_identified`), `subscriber_id`, `group_number` (`phi_sensitive`).

Block `lines` (main, `table`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `service_date` | DOS | date | `phi_identified` | label `Totals` |
| `code` | Code | text | `phi_identified` | none |
| `tooth` | Th | text | `phi_identified` | none |
| `surface` | Surf | text | `phi_identified` | none |
| `description` | Description | text | `phi_identified` | none |
| `provider_name` | Provider | text | `aggregate` | none |
| `provider_npi` | NPI | text | `aggregate` | none |
| `debit` | Charges | money | `financial_patient` | sum (`Total Charges`) |
| `credit` | Credits | money | `financial_patient` | sum; split in the totals into `Total Payments` (payment legs) and `Total Adjustments` |
| hidden: `entry_id`, `patient_id`, `entry_type`, `service_date_source` | | | entity classes | |

Totals block (`report_end` per document): `Previous Balance` (option), `Total Charges`, `Total Payments`,
`Total Adjustments`, `Balance` (= previous + charges - credits), all `financial_patient`.

Grouping: `fixed_outer` = patient (sorted by sort name, `patient_id`); with `itemize_by_visit` a level `service_date`
with subtotal. Page break: per patient. Summary cards (screen): `patients_printed`, `total_charges`, `total_payments`.

### Visuals and drill-through

None - a document. Drill: a service line → `kind = record` `patient_ledger` (charge highlighted); the patient name →
`patient_overview`; `Balance` → `ledger.ledger_report` (`report_type = patient_ledger`, `patient_id`, same range).

### Actions

| Action | Kind | Detail |
|---|---|---|
| Open patient | row, `navigate` → `patient_overview` | |
| Print claim instead | row, `navigate` → claim of the DOS (`route_key = claim`) when the office files it | right of the claim screen |
| Print receipt only | form preset: `transaction_types = [payments]`, `include_insurance_block = false` (saved view shipped as `Payment receipt`) | |

Not a worklist.

### Export and print

PDF: layout `slip`, portrait, one super bill per patient (`record_per_page`, page numbers per document), **no logo**
(legacy quirk kept), billing identity block at the top in claim-attachment form, signature-free. Criteria echo on a run
page only for multi-patient runs (document pages are patient-facing). XLSX: sheet `Lines` (patient and DOS repeated per
row), sheet `Totals`; CSV: line table.

### Open questions

| # | Question | Check / owner |
|---|---|---|
| S-1 | Printed layout: header fields, billing provider identifiers, subscriber block, column order, totals (INFERRED) | Live tool: print one super bill |
| S-2 | Are lines restricted to the working office? | Live tool (F-3) |
| S-3 | Default of `Include Previous Balance`; is it really unavailable from Reports > Ledger Reports? | Live tool |
| S-4 | Does the legacy super bill print diagnosis codes (and from which field)? | Live tool; if yes, a NEW charge diagnosis column is needed (owner 03) |
| S-5 | Product: keep the `Payment Receipt` title enhancement or always print `Super Bill` | Product owner |

## Account Allocation - `ledger.account_allocation`

Ledger Reports, screenshot `4.PNG` - P1 - M - `reports_ledger_reports_screen_view_only` / `_full_control` - instant (one account, `rpt_fifo_allocations` with `p_account_ids`) - INFERRED (no vendor description of the output)

### Purpose

Billing staff and office managers, on demand: explain to a family where its money went, check which provider was credited
with a payment, and diagnose a ledger-versus-ageing mismatch before a reallocation or a `TRANSFER` adjustment ([R]
research section 5, Account Allocation, anchors `[V16]` `[V21]` `[V22]` `[V23]` `[V24]`). It is the one-account view of
the allocation data behind Income Allocation and Allocation Detail (`catalog/monthly_reports.md`).

### Legacy output

Confidence INFERRED: only the criteria are known (office, date range, one responsible party, no options). Proposed
layout from the documented ledger screens (`Payment Allocation` pop-up, `Payment Allocation Detail` with `Unallocated`,
`Aging Detail` columns) and the allocation rules (patient payments FIFO by patient then provider; insurance payments to
their claim line; adjustments specific to patient, provider and location `[D]`):

| Element | Proposal |
|---|---|
| Title | `Account Allocation` |
| Header | letterhead, responsible party, `Account # :`, `From` / `Thru` |
| Credit line | date entered, transaction date, code, description, payer (patient / carrier), tender, check number, entering office, patient, amount |
| Allocation lines under it | procedure DOS, patient, code, tooth, surface, allocation provider, allocation office, allocation date, method, amount applied |
| Remainder line | `Unallocated` with the remainder and its reason |
| Totals | per credit: allocated, unallocated; account: credits, allocated, unallocated |
| Trailer (enhancement) | open charges of the account as of `date_to` with ageing (the `Aging Detail` columns) |

Signs: credits and applied amounts print as positive magnitudes under explicit headings (`Credit Amount`, `Applied`,
`Unallocated`) [I]; to confirm against the live print (A-1).

### Parameters - legacy parity

<!-- PARITY:ledger_reports.r04 -->

| Legacy option | Effect on the result |
|---|---|
| OFFICE/GROUP = Office (default; Office Group greyed) | Working office locked; printing office only; allocation is computed for the whole account |
| Office picker (greyed, `108`) | Read-only display |
| Start Date / End Date (default today / today) | Credits (payments, credit adjustments, write-offs) whose created date is in the range, with all their allocation rows as of `date_to` |
| Responsible Party + SEARCH (pre-filled with the account in context) | The one account; always required; SEARCH superseded |

Dependency rules: `office_scope` forced; `account_id` `required_when` true (shared rule).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `include_open_items` | `boolean` (NEW key) | `false` | Adds the trailer block of open charges with ageing (`rpt_ar_open_items`) - the "what is still owed by which charge" half of a mismatch diagnosis |
| `credit_kinds` | `enum_multi` `payments`, `adjustments`, `write_offs` (NEW key; `no_predicate` when full) | all ticked | Narrows the listed credits |
| `show_derived_only` | `boolean` (NEW key) | `false` | Lists only credits whose allocation is derived (`is_derived`), i.e. never split by a user - the review list before a reallocation |
| `date_preset` | presets `previous_month`, `year_to_date`, `all_history` (NEW preset: `date_from` = first leg of the account) | `today` | |
| `output_format` | shared | `pdf` | |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_fifo_allocations(tenant, p_account_ids = [:account_id], p_as_of = :date_to, p_unit = 'account')` (P1; from P2 the persisted rows of `rpt_payment_allocations` for that account, DATA-26), `rpt_ledger_entries` (credit and debit attributes, check number), `rpt_charges` (tooth, surface), `rpt_patient_dim`, `rpt_provider_dim`, `rpt_office_dim`, `rpt_transaction_code_dim`, `rpt_ar_open_items()` (option) |
| Population | allocation rows whose `credit_entry_id` is a credit leg of the account with `credit_created_date BETWEEN :date_from AND :date_to`; a migrated credit with `created_at_reliable = false` is matched on `credit_transaction_date` (availability warning `created_date_substituted`) |
| Allocation lines | `method <> 'unallocated'`: `debit_entry_id` → charge attributes, `service_date`, `procedure_code`, `allocation_provider_id` (NULL = `Unassigned provider`), `allocation_office_id`, `allocation_date`, `amount`, `method` label (`explicit` = user split, `adjustment_target`, `remittance_line` = insurance line, `refund_link`, `transfer_pair`, `derived_fifo` = oldest first) |
| Remainder | `method = 'unallocated'` row: `amount`, `unallocated_reason` (`credit_balance` on derived rows) |
| Targets that are not charges | `allocation_target` `debit_adjustment`, `refund`, `opening_balance`, `transfer` print with their own description (finance charge, refund, previous balance, transfer) |
| Date basis | `created_date` of the credit (04 7.2 row 22, inferred) |
| Office attribution | credit office (`credit_office_id`) and allocation office (`allocation_office_id`) both printed; no office filter |
| Provider attribution | credited provider of the credit (`credit_provider_id`) on the credit line; producing provider (`allocation_provider_id`) on allocation lines (PD-7) |
| Availability | READY (derived for history). Every migrated allocation is `derived_fifo`, `transfer_pair` or `unallocated` and will not reproduce what the legacy tool allocated at entry time (data card 2.13); app payments are real links only when split by the user, for remittances and refunds with a source, until DATA-26. Created date on migrated credits: REPAIR(10) (backfill). The result is a recomputation as of `date_to`: a later back-dated entry changes it. The definition prints "Allocation derived (oldest first)" whenever a derived row is listed |

### Output

One format `standard`.

Block `allocations` (main, `table`, grouped by credit):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `credit_created_date` | Entered | date | `phi_identified` | group header |
| `credit_transaction_date` | Trans. Date | date | `phi_identified` | group header |
| `credit_code` | Code | text | `phi_identified` | group header |
| `credit_description` | Description | text | `phi_identified` | group header |
| `payer` | Payer | enum `patient` / `insurance` | `aggregate` | group header |
| `check_number` | Check # | text | `payment_instrument` | group header |
| `credit_office_short_id` | Entered At | text | `aggregate` | group header |
| `credit_provider_short_id` | Credited Provider | text | `aggregate` | group header |
| `credit_amount` | Credit Amount | money | `financial_patient` | group header; grand total sum |
| `service_date` | DOS | date | `phi_identified` | none |
| `debit_patient_name` | Patient | text | `phi_identified` (key) | none |
| `procedure_code` | Code | text | `phi_identified` | none |
| `tooth`, `surface` | Th, Surf | text | `phi_identified` | none |
| `allocation_provider_short_id` | Provider | text | `aggregate` | none |
| `allocation_office_short_id` | Office | text | `aggregate` | none |
| `allocation_date` | Applied On | date | `phi_identified` | none |
| `method_label` | Method | enum | `aggregate` | none |
| `applied_amount` | Applied | money | `financial_patient` | subtotal per credit `Allocated`; grand total |
| `unallocated_amount` | Unallocated | money | `financial_patient` | subtotal per credit; grand total |
| hidden: `allocation_id` (row id), `credit_entry_id`, `debit_entry_id`, `account_id`, `debit_patient_id`, `is_derived`, `unallocated_reason` | | | entity classes | |

Grouping: level 1 = credit (`credit_entry_id`, header = the credit columns, subtotal `Allocated` / `Unallocated`), sorted
by `credit_created_date`, `credit_entry_id`; rows by `service_date`, `allocation_id`. Grand total: `Credits`,
`Allocated`, `Unallocated` (invariant: `Allocated + Unallocated = Credits`, R-06).

Block `open_items` (`report_end`, option `include_open_items`): `DOS Date`, `Patient Name`, `Office`, `Code`, `Th`,
`Surf`, `T`, `Description`, `Provider`, `Current`, `Over 30`, `Over 60`, `Over 90`, `Over 120`, `Balance` (the documented
`Aging Detail` columns), money `financial_patient`; totals per bucket.

Summary cards: `credits_total`, `allocated_total`, `unallocated_total`, `derived_share` (percent of allocated amount
that is derived). Page break: none.

### Visuals and drill-through

Optional bar: allocated amount by `allocation_provider_short_id` (`charts[]` hint, `top_n` 10) - shows which provider the
family's money credited. Drill: an allocation line → `kind = record` `patient_ledger` (the charge); a credit header →
`patient_account_ledger` (the payment); `Unallocated` subtotal → `monthly.unallocated_payment_adjustments` with
`office_ids` of the credit, `date_range` of this run (P2 report, link hidden before P2); provider bar → none.

### Actions

| Action | Kind | Detail |
|---|---|---|
| Open payment | row, `navigate` → payment allocation detail of the credit on the ledger screen | right `transactions_patient_ledger_screen_full_control` |
| Reallocate account | row, `navigate` → the reallocation function of the account when it exists (legacy `Patient > Reallocate Account`; no DentC screen today) | hidden until the feature exists |

Not a worklist.

### Export and print

PDF: layout `banded_table`, landscape, letterhead, credit group bands with the allocation rows inside, criteria echo in
the footer with the derived-allocation note. XLSX: sheet `Allocations` (one row per allocation row with the credit
columns repeated, no merged cells), sheet `Open Items` when chosen; CSV: allocation rows. Inline always (one account).

### Open questions

| # | Question | Check / owner |
|---|---|---|
| A-1 | The whole printed layout (report INFERRED): columns, grouping, signs, totals | Live tool: print the report for an account with a split payment and an insurance payment |
| A-2 | Are credits restricted to the working office? | Live tool (F-3) |
| A-3 | Which date the range filters (entry date assumed, 04 7.2 row 22) | Live tool: payment entered today and back-dated |
| A-4 | Does the legacy report list unallocated remainders and non-charge targets? | Live tool |
| A-5 | Product: show derived allocations for migrated history with the warning (proposed) or refuse ranges before the migration date | Product owner |

<!-- WORK-ITEMS -->
| RPT-LEDGER-10 | `ledger.ledger_report` definition: both `report_type` variants, previous-balance row, running balance, `T` / `Bill` / `A` derivations, Print all transactions rows (statements, notes, claims), `sort_by`, `transaction_types`, voided and archived options, `balance_summary` block, drills | P1 | M | RPT-LEDGER-02, DATA-52, DATA-21, ENG-11, ENG-30 | Fixture account with two members: account ledger closing balance = account balance, patient ledger closing balance = patient balance; Print all transactions adds exactly the statement, note and claim rows of the fixture without changing any balance; `patient_ledger` without `patient_id` answers 422 |
| RPT-LEDGER-11 | Ledger Report outputs: landscape `banded_table` PDF with letterhead and echo, XLSX (Ledger, Summary, Criteria sheets), CSV | P1 | S | ENG-23, ENG-27, ENG-15, RPT-LEDGER-05 | A 3,000-line account renders in under 10 s; XLSX opens without repair prompts and the running balance column equals the screen |
| RPT-LEDGER-12 | `ledger.walkout_report` definition: name-range population, activity-line office filter, previous balance, totals, ageing grid from `rpt_ar_open_items` (`legacy` bucket set), aged message choice, next-appointment block, column variants of the two options, `appointment_id` entry, P1 contract balances from the payment-plan service | P1 | L | RPT-LEDGER-02, DATA-20, DATA-16, FLT-16 | Fixture account: `Total Balance for the Account` = `Account Balance` = ageing `Total Balance` = account balance as of `date_to`; each of the four option combinations yields the documented column set; an account without a future appointment prints no next-appointment block |
| RPT-LEDGER-13 | Walkout `slip` PDF layout: logo, header box, long date, line table variants, totals, ageing grid with contract balances, Messages / Comments boxes, next-appointment table, `record_per_page` volumes, multi-account run criteria page | P1 | M | ENG-25, RPT-LEDGER-05 | Side-by-side with the 2022 / 2023 vendor samples every documented area is present in the same order; a 150-account end-of-day run produces one file with page numbers per walkout |
| RPT-LEDGER-14 | Walkout signatures: `Card Holder Signature` and `Dentist Signature` captured through `src/features/signature/` (`SignatureCapture`) in the viewer and stamped into the stored PDF artifact; `show_signature_lines` for paper | P2 | M | RPT-LEDGER-13, ENG-22 | A signed walkout is stored as a new artifact version with both images and the signer time; the unsigned artifact stays in run history |
| RPT-LEDGER-15 | Walkout contract balances on `rpt_payment_plan_contracts` / `rpt_contract_installments` instead of the per-patient service | P2 | S | DATA-37, RPT-LEDGER-12 | `Reg Cont. Bal.` / `Ort Cont. Bal.` equal the remaining amounts of the fixture contracts; the per-patient service call is removed from the builder |
| RPT-LEDGER-16 | `ledger.super_bill` definition: patient name-range population, DOS basis on `service_date_effective`, `transaction_types` members, office filter, previous-balance line, billing identity and coverage blocks, totals, `Payment receipt` saved view | P1 | M | RPT-LEDGER-02, DATA-21, FLT-16 | Fixture patient: Payments only lists every payment of the range and no charge; three ticks = no predicate (canonical `all` in `params`); a payment linked to a charge of the range prints under that DOS |
| RPT-LEDGER-17 | Super Bill `slip` PDF layout without logo, claim-attachment header, per-patient documents; XLSX and CSV | P1 | S | ENG-25, ENG-27, RPT-LEDGER-05 | PDF shows billing provider name and NPI, no logo; a caller without `security_users` sees the form without tax id (until F-6 is decided) |
| RPT-LEDGER-18 | `ledger.account_allocation` definition on `rpt_fifo_allocations` for one account: credit groups, allocation and remainder rows, method labels, created-date filter with the transaction-date fallback, open-items trailer, provider chart, drills | P1 | M | DATA-20, ENG-59, ENG-11 | For every fixture credit `Allocated + Unallocated = Credit Amount` (R-06); a derived row prints the derived note; a credit entered in the range but back-dated before it is listed |
| RPT-LEDGER-19 | Account Allocation on persisted allocations (`rpt_payment_allocations`, DATA-26): real methods and `unallocated_reason` for app payments, no recomputation for app rows | P2 | S | DATA-26, RPT-LEDGER-18 | An app payment split by the user prints `explicit` rows; a parked prepayment prints `Unallocated - prepayment`; the run of the same parameters is unchanged after a later back-dated entry for app rows |
<!-- /WORK-ITEMS -->
