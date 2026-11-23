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

<!-- PARITY:daily_reports.r01 -->

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
| Datasets | `rpt_ledger_entries` (rows and balances), `rpt_patient_dim` (`chart_no`, `first_name`, `last_name`), `rpt_account_dim` (`account_no`, guarantor name for the account label), `rpt_provider_dim` (`short_id`, `provider_name`), `rpt_user_dim` (`user_label`), `rpt_transaction_code_dim` (code descriptions of payments and adjustments), `rpt_procedure_code_dim` (`description`) |
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

<!-- PARITY:daily_reports.r02 -->

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
| OTHER OPTIONS `Show AR` (greyed, unticked) | Served disabled (`disabled_value false`) because no capture shows it enabled; if the live tool shows the rule, it adds the A/R block as of the end of the range (as on the Executive Summary). No effect today |
| OTHER OPTIONS `Include Resp. Party Type` (unticked) | Ticked adds column `resp_party_type` ("Resp. Party Type", after Patient Name, position INFERRED) from `rpt_account_dim`; Detail only |
| OTHER OPTIONS `Show Datewise Summary` (unticked) | Ticked adds block `datewise_summary`: one row per basis date per office, printed after the office's lines (useful when the range spans several days) |
| GROUP BY `None` (default) | Levels: office (when multi-office) -> basis date |
| GROUP BY `Provider` | Levels: office -> provider (`Provider : <provider_name>`, subtotal `Total for <provider_name> :`) -> basis date; reproduces `Daily Journal by Provider` |
| GROUP BY `User` | Levels: office -> user (`User : <user_label>`, subtotal `Total for <user_label> :`) -> basis date; reproduces `Daily Journal by User - Detail` |
| GROUP BY > Page Break (greyed, unticked) | Enabled only when GROUP BY is not None; ticked = `page_break_by = group`: new PDF page per provider / user. Layout only, no re-run |

Dependency rules: `page_break_by` member `group` is `enabled_when ["ne","group_by","none"]` (rule d01; forced to `none`
while disabled). `show_ar` is enabled under no known condition. Not legacy rules but engine rules: under
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
| History that cannot be produced | Created Date on migrated money rows without the restore; the legacy user's name for legacy logins (only the login string exists); the `- Patient` / `- Pri Ins.` split of migrated contract billing (not migrated as two rows) |

### Output

Detail format, block `main` (`row_id_column = row_id`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id`, `provider_id`, `user_key`, `basis_date` | - | hidden group keys | aggregate (`provider_id` `aggregate`: operational label on a transaction row, rule 12 analogue) | levels |
| `row_id` | - | id, hidden | aggregate | tie-breaker (`entry_id`) |
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
| PDF | Layout `journal` (ENG-24), landscape; header practice-group name + variant title; office band, provider / user band, date band; summary block after each office; footer criteria echo (`Transaction From` / `Transaction Thru` or `Created From` / `Created Thru`, `Offices`, `Providers`, `Users`, `Patient Type`, transaction types, starred notes `* Show Resp. Party Type`, `* Datewise Summary`), `Printed :`, `Page : n of m`; page break per provider / user when ticked |
| XLSX | `main` sheet (one row per line, group keys as plain columns `office_name`, `provider_name` / `user_label`, `basis_date`; no subtotal rows, outline grouping on), `journal_summary` sheet, `datewise_summary` sheet, `criteria` sheet |
| CSV | `main` block (Detail) or `journal_summary` (Summary) |
| Background | Inline up to 31 days and 5 offices; beyond, `escalate_when` to background once ENG-38 exists (P2); in P1 `max_date_span_days` 366 with `max_rows` cap and a run warning |

### Open questions

| # | Question | Check / decision |
|---|---|---|
| 1 | What enables `Show AR`, and does it append Total A/R as on the Executive Summary | Try every combination of format, office mode and transaction types on the live tool (RPT-DAILY-09) |
| 2 | What `Include Resp. Party Type` prints and where | Tick it on a Detail run |
| 3 | `PATIENT TYPE` General = non-ortho only, Ortho = ortho-flagged only; does an active ortho contract make a patient Ortho (O-3) | Run all three on a day with ortho contract billing |
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

<!-- PARITY:daily_reports.r03 -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Summary` (default; locked unless PRODUCTION BY = Provider) | Aggregated rows of the `report_by` dimension + production-adjustment lists |
| REPORT FORMAT `Detail` (enabled only for PRODUCTION BY = Provider) | One row per completed procedure inside `Provider :-` sections + each provider's adjustment list; title `Production by Provider` |
| PRINT FORMAT `PDF` (default) / `Excel` | Output only; `banded_table` PDF or flat XLSX; `csv` added |
| OFFICE/GROUP `Office` (working office) / `Office Group` (ALL) | Charges whose office of service (`rpt_charges.office_id`) is in scope; `Office : <name>` band and `Total for, <office> [ <id> ] :` per office; Office Group = the enterprise view (bands per office, one grand total) |
| DATE RANGE Start / End (today / today) | Fixed basis `transaction_date` of the charge (posting date; equals `service_date` until DATA-13) and of the adjustment |
| PRODUCTION BY `Code` (default) | Row = procedure code (`Code`, `Description`); title `Production by Codes` (`- Provider` when grouped by provider) |
| PRODUCTION BY `Provider` | Row = treating provider (`Provider`, `ShortID`); title `Production by Provider`; Detail selectable; GROUP BY forced None; CODES hidden; PROVIDERS shown; Include UCR greyed (but see Open questions 2) |
| PRODUCTION BY `Category` | Row = procedure category (`rpt_procedure_code_dim.code_category`); title `Production by Category`; criteria state never captured |
| PRODUCTION BY `Carrier` | Row = carrier of the charge (Data); title `Production by Carrier` (INFERRED); availability warning `payer_snapshot` |
| GROUP BY `None` (default) | Office band only |
| GROUP BY `Provider` | Level `Provider :- {provider_name}` with `Total for {provider_name} :` and that provider's `Total Production Adjustments :` list; PROVIDERS picker appears beside CODES; Page Break label reads `Page Break by Provider` |
| GROUP BY `Carrier` | Level `Carrier :- {carrier_name}` with `Total for {carrier_name} :`; no adjustment trailer per carrier (adjustments carry no reliable carrier) |
| GROUP BY > Page Break (greyed until grouped) | `page_break_by = group`: new PDF page per provider / carrier; layout only |
| CODES `ALL` (default) / list | `procedure_code IN (...)` on the charge rows; hidden and forced ALL under PRODUCTION BY Provider. The adjustment lists are not filtered by codes |
| PROVIDERS (VENDOR-DOC, ALL) | Visible when PRODUCTION BY = Provider or GROUP BY = Provider; `rpt_charges.provider_id IN (...)` and `rpt_adjustments.provider_id IN (...)`; forced ALL when hidden |
| SORT BY `Transaction Date` / `Patient Lastname` (VENDOR-DOC, default first option) | Visible with PRODUCTION BY Provider + Detail; order of procedure rows inside each provider section (`transaction_date, row_id` / `patient_last_name, patient_first_name, transaction_date, row_id`) |
| OTHER OPTIONS `Include UCR` (unticked) | Ticked adds the compare-fee column `{compare_fee_schedule_name}` = SUM over the rows of the fee in force on the service date in the chosen schedule; footer `* Includes UCR`, `FeeID : <id>`; unlocks the two options below |
| OTHER OPTIONS `Include Z-Codes` (greyed until Include UCR) | With Include UCR ticked: unticked drops office-defined Z codes (`is_z_code`) from the rows, ticked keeps them. Without Include UCR, Z codes are rows as any code (as in 02 section 3.11; see parity concern) |
| FEE SCHEDULE TO COMPARE (greyed until Include UCR; default = first schedule of the tenant list, unconfirmed) | The schedule whose fees fill the compare column; required while Include UCR is ticked |

Dependency rules (parity d01-d09): `report_format` forced `summary` when `report_by != provider` (option `detail`
enabled only for `provider`); `procedure_codes` visible when `report_by != provider`; `provider_ids` visible when
`report_by == provider or group_by == provider`; `group_by` enabled when `report_by != provider` (forced `none`);
`page_break_by` enabled when `group_by != none`, label `Page Break by Provider` when `group_by == provider`; `sort_by`
visible when `report_by == provider and report_format == detail` (inferred pairing); `include_ucr` enabled when
`report_by != provider`; `include_z_codes` and `compare_fee_schedule_id` enabled when `include_ucr`;
`compare_fee_schedule_id` required when `include_ucr`.

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
| Row filter | live charges with `is_production` (contract billing `ACBIL` / `ACBILO` excluded: `non_production_charge`), `transaction_date BETWEEN :date_from AND :date_to`, office of service in scope, `procedure_codes`, `provider_ids`; Z-code rule above |
| Measures | `perf_count` = `count(*)`; `charges` = `SUM(charged_fee)` (posted fee, PD-1); `total_duration` = `SUM(duration_minutes)` (legacy units, default 0); `compare_fee` = `SUM(schedule_fee)` of `rpt_fee_schedule_fees` for (`compare_fee_schedule_id`, `procedure_code`) with `effective_date <= service_date < coalesce(effective_to, infinity)`, one price per charge (scalar lateral); `fee` is the line total whatever `quantity` is (data_card 2.9) |
| Carrier of a charge | `coalesce(rpt_charges.primary_carrier_id` (DATA-33, P2), carrier of the primary claim of the charge's claim family (`rpt_claim_facts.carrier_id` via `claim_id`), the patient's current primary dental coverage `rpt_insurance_coverage.carrier_id` (labelled `current coverage`), member `No Insurance`); hidden column `carrier_source` counts each source for the warning |
| Adjustment lists | `rpt_adjustments` live, `txn_side = 'production'` (legacy Sub Type: what the legacy list prints), `NOT is_transfer`, same range, office (`office_id`) and provider (`provider_id`) scope; one line per `code` with `code_description`, `SUM(amount)`. Migrated legs (`txn_side = 'unknown'`) form a separate line `Unclassified adjustments` with warning `migrated_adjustments_unclassified` |
| Date basis | fixed `transaction_date` (posting date) for charges and adjustments; until DATA-13 a back-dated charge counts on its date of service (warning NEW `transaction_date_equals_service_date` on every run) |
| Office attribution | office of service (`rpt_charges.office_id`); adjustments: their own office |
| Provider attribution | treating provider (`rpt_charges.provider_id`, the Ledger `Prdr`); hygienist (`hygienist_id`) not credited in parity runs |
| Coverage rating | **READY** (coverage matrix row 3) |
| Option blockers | Include UCR + Fee Schedule To Compare: `rpt_fee_schedule_fees` (DATA-51, P1); production-adjustment list on history: **REPAIR(12)**; by Carrier: **REPAIR(10)** for history (claim link backfill) and **SCHEMA(33)** for unbilled lines (current coverage until then, `payer_snapshot` warning); duration units on history: **REPAIR(10)** (code NEW `duration_not_recorded` when `total_duration = 0` on more than half of the rows) |
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
level; plus `report_end` overall list under `Grand Total :`): `adjustment_code` "Adjustment" (aggregate), `description`
(aggregate), `amount` "Amount" (money, financial_practice; provider_comp inside a provider group), subtotal `Total
Production Adjustments :`; optional `net_production` line (`show_net_production`).

Sort: Summary default `charges` desc (02 section 3.11; legacy row order not documented, by-code samples look code-ordered -
open question 5); `sort_by` options for Detail as parity. Page break: `none` / `group`. Summary cards (block totals):
`charged_production` (Charges total), `production_adjustments` (list total), `net_production` (sum of both), `#Perf`.
`empty_when`: `total_is_zero` on `main.perf_count`.

### Visuals and drill-through

Chart: horizontal bar of `charges` by the `report_by` dimension, top 15 + Other (Code / Category / Carrier); by Provider a
bar per provider with the compare fee as a second series when `include_ucr`.

| Click | Target |
|---|---|
| `charges` of a code row (Summary) | `kind = rows`, same report Detail: `report_by = provider`, `report_format = detail`, `procedure_codes = [{column: procedure_code}]`, `provider_ids = {group: provider_id}` when grouped (as 02 section 3.11; the Detail format accepts `procedure_codes` through `param_map`) |
| Provider row or subtotal | Same report, `report_by = provider`, `report_format = detail`, `provider_ids = [provider_id]` |
| Category row | Same report, `report_by = code`, `procedure_category_codes = [category]` |
| Carrier row | Same report, `report_by = code`, `carrier_ids = [carrier_id]` |
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
| 2 | Is Include UCR greyed by PRODUCTION BY Provider or by REPORT FORMAT Detail (a 2016 Provider Summary sample prints a compare column) | Open Provider + Summary; parity concern raised |
| 3 | Z codes when Include UCR is off: included (assumed) or excluded | Run with a Z code posted, UCR off |
| 4 | Default of Fee Schedule To Compare: first list entry (assumed) or the office UCR schedule (02 section 3.11 example) | Open the dropdown on a second tenant |
| 5 | Row order of Summary rows (code order or charges) and SORT BY default | Compare two samples |
| 6 | Detail columns of Production by Provider | Run Provider + Detail |
| 7 | GROUP BY Carrier: page-break label, carrier picker, adjustment list per carrier | Open the state |
| 8 | Is `Category` the 14 SEARCH CODE categories (family question 7) | Open the CATEGORY picker if one appears |
| 9 | Product: do opening-balance and contract-movement production-side codes belong in `Total Production Adjustments` (legacy prints them, analytics excludes them) | O-2 owner |

## Collection Report - `daily.collection_report`

Daily Reports, screenshot 4.PNG - P1 - L - `reports_daily_reports_screen_view_only` (family `daily`) - interactive (By Code: background) - PARTIALLY DOCUMENTED

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
file-size failure on a full-year all-office run [P49] becomes a background run.

### Parameters - legacy parity

<!-- PARITY:daily_reports.r04 -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | Payment lines (and collection-adjustment lines when included) inside the COLLECTION BY sections, then the summary block; By Code: the code table |
| REPORT FORMAT `Summary` | No lines: one total row per section member (office / provider / carrier) and the summary block; By Code: the code table (Summary layout unverified) |
| PRINT FORMAT `PDF` (default) / `Excel` | Output only; `csv` added |
| OFFICE/GROUP `Office` (working office) / `Office Group` (ALL) | Payment legs whose transaction office (`rpt_payments.office_id`, the office where the payment was applied) is in scope; `Office :` section each |
| DATE RANGE Start / End (today / today) | Fixed basis `transaction_date` of the payment and adjustment legs |
| PAYMENT TYPES `ALL` (default) / list of payment codes | `rpt_payments.code IN (...)` (payment codes of Setup > Payment/Adjustment Types, not tender categories); does not filter adjustments; migrated payments (alias codes) match only under ALL until DATA-12 |
| COLLECTION BY `None` (default) | Office sections only; title `Collection Report - Detail` / `- Summary` (INFERRED) |
| COLLECTION BY `Provider` | Level `Provider : {provider_name}` on the credited provider of the payment (`rpt_payments.provider_id`, "provider on payment"; NULL = `Unassigned provider`) and of the adjustment (`rpt_adjustments.provider_id`); title `Collection Report By Provider - Detail`; reproduces `Daily Collection` |
| COLLECTION BY `Carrier` | Level `Carrier : {carrier_name}` on `rpt_payments.carrier_id` (insurance payments); patient payments in member `Patient`, insurance payments without carrier in `Carrier not recorded`; title `Collection Report by Carrier - Detail` (INFERRED) |
| COLLECTION BY `Code` | Other result block `by_code` (filter_card section 8): rows = procedure codes the payments were allocated to; title `Collection Report by Code - Detail` |
| COLLECTION BY > Page Break (greyed while None) | `page_break_by = group`: new PDF page per provider / carrier / (By Code: per office); layout only |
| OTHER OPTIONS `Include Adjustments(Collection)` (ticked) | Collection-side adjustments of the range are added: lines (Detail), `Adjust` column, the Adjustments section of the summary block, footer `* With Adjustments(Collection)`. Unticked: payments only |

Dependency rules: `page_break_by` member `group` `enabled_when ["ne","group_by","none"]` (inferred from the greyed
default). `report_format` has no lock. No legacy rule hides a control.

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
| By Code | P1: `rpt_fifo_allocations(tenant, <accounts with a payment or collection adjustment in scope>, :date_to, 'account')` restricted to credits whose `credit_transaction_date` is in range (function dataset, ENG-59); P2: `rpt_payment_allocations` (DATA-26). Row = `procedure_code` of the debit; `perf_count` = `count(DISTINCT debit_entry_id)`; `ucr`, `amount`, `est_ins` = `office_fee`, `charged_fee`, `est_insurance` of those charges (each charge once); `payments` / `ins_pay` / `adjust` = `-SUM(allocation amount)` by credit kind; credits not allocated to a charge form rows `Unallocated`, `Refunded`, `Opening balance / transfer` so the table total equals the payment total (R-08). Printed note "allocation derived (oldest first)" when `is_derived` rows exist |
| Date basis | fixed `transaction_date` |
| Office attribution | transaction office (where applied); NULL = `Unassigned office` |
| Provider attribution | credited provider on the payment line (`rpt_payments.provider_id`) - P1 rule of data_card 2.13; allocation provider is not used by this parity report |
| Coverage rating | **READY** (coverage matrix row 4) |
| Option blockers | By Code: derived allocations, P2 for tenant-wide runs (DATA-26; P1 runs are background and capped at 31 days, code NEW `allocations_derived`); by Carrier: **APP** for remittances, **SCHEMA(33)** for `patient_payments` insurance checks (no carrier until then, code NEW `carrier_on_payment_missing`); payment-type picker on history: **REPAIR(12)** (code `migrated_codes_collapsed` NEW) |
| History that cannot be produced | carrier of migrated insurance payments; payment code and card brand of migrated payments; the split of migrated adjustments into collection and production; legacy allocation lines (By Code on history is a derived oldest-first result and will not match a Denticon print line by line) |
| Reconciliation | `reconciles_with`: SUM of `pat_payment + ins_payment` over rows with `counts_as_collection` = `-gross_collections`; adjustment total = `collection_adjustments` (sign per metric); payments with `counts_as_collection = false` (`COLPY`, conversion credits) keep their own summary line marked `not a collection` and are outside the metric |

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
`payments` "Payments", `ins_pay` "Ins. Pay", `adjust` "Adjust" (money financial_practice, sum); total `Total:`; sort
`procedure_code` asc, pseudo rows last.

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
| Office `Total Payments :` | `kind = report`, `daily.deposit_slip` with the same office scope and range (proves the bank deposit) |
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
| Background | Detail above 31 days or 5 offices escalates to background (P2, ENG-38); By Code is background in every phase (allocation computation); P1 inline cap `max_rows_inline` 5,000 and run warning for larger results |

### Open questions

| # | Question | Check / decision |
|---|---|---|
| 1 | Detail line columns for None / Provider / Carrier | Run each with a two-payment day |
| 2 | Summary format layout | Run Summary with each COLLECTION BY |
| 3 | Provider meaning: payment-line provider (assumed) or allocation provider | Payment on a charge of another provider |
| 4 | Do provider / carrier / code pickers appear for the other COLLECTION BY choices (footer echoes Provider) | Open each state |
| 5 | Is the summary block printed per provider section or once at the end | Sample with two providers |
| 6 | By Code: is `# Perf` the count of charges collected against or of charges performed in the range; are unallocated credits shown | Compare with a legacy By Code print |
| 7 | Product: P1 By Code on derived per-account allocation (background) or blocked until DATA-26 (open decision O-12 of 03) | Data foundation owner |

<!-- WORK-ITEMS -->
| RPT-DAILY-10 | Peg Board Day Sheet definition: `postings` block with per-line running balance on unit (`account_id`, `office_id`), office bands, `journal_summary` trailer, availability `day_sheet_not_frozen` | P1 | M | DATA-06, DATA-02, ENG-11, ENG-24, RPT-DAILY-03 | On the fixture day each line's `new_balance - previous_balance = amount`; the last line of each account equals its ledger balance at the end of the day; a past-day run prints the not-frozen caveat |
| RPT-DAILY-11 | Day-sheet A/R control block and proof: previous / new receivables per office, `other_postings` for provider / user / type filters, `proof_difference`; optional `provider_recap` | P1 | S | DATA-06, DATA-09 | For every fixture day and every filter combination `proof_difference = 0.00` and `new_receivables` equals the office's transaction-office ledger balance (R-14b) |
| RPT-DAILY-12 | Peg Board Day Sheet legacy confirmation: obtain one live printout, freeze columns, record the product decision on balance unit and provider filter | P1 | S | FLT-23, RPT-DAILY-09 | A screenshot reference and a signed decision exist; the definition's column list matches it or each deviation is written down |
| RPT-DAILY-13 | Daily Journal definition: Detail and Summary formats, basis-date level, GROUP BY provider / user, page break, `transaction_types` entry-class mapping, `patient_type`, datewise block, variant titles | P1 | L | DATA-06, ENG-11, ENG-24, ENG-27, RPT-DAILY-03 | The fixture day reproduces the legacy Detail and Summary sample structure (date subtotal, office total, summary block, grand total summary); unticking Payments removes payment lines and the Payments section; Summary has no patient column |
| RPT-DAILY-14 | Daily Journal Created Date basis: per-office UTC bounds, era greying when `created_at_reliable` is false, switch to `posting_date` after DATA-13; `backdated_only` enhancement | P1 | S | DATA-10, DATA-13, FLT-12 | A payment keyed today for yesterday appears on today's Created Date run and yesterday's Transaction Date run; a range before the migrated-through date without the restore greys the basis with `created_date_unreliable` |
| RPT-DAILY-15 | Include Resp. Party Type column on Daily Journal Detail | P1 | S | DATA-53 | With the option ticked every line of an account with a type prints it; self-guarantor accounts print it after DATA-53; before it the run warns `resp_party_type_missing` |
| RPT-DAILY-16 | Production Report definition on `report_by` (code / provider / category / carrier), Summary and provider Detail, GROUP BY provider / carrier, PROVIDERS / SORT BY dynamic controls, true-ratio totals, title templates | P1 | L | DATA-04, DATA-06, ENG-11, ENG-23, ENG-31 | Fixture run reproduces the three documented layouts; `Per %` of a provider subtotal = provider / grand total; total `Eff. Rate $` = total charges / total duration; the nine parity rules pass their vectors |
| RPT-DAILY-17 | Production compare-fee column: `include_ucr`, `compare_fee_schedule_id` (fee in force on the service date), Z-code rule, `include_office_ucr` enhancement | P1 | S | DATA-51, FLT-06 | For a schedule with two dated entries of one code the compare column equals count x the fee in force on each service date; Z codes drop only when UCR is on and Include Z-Codes is off |
| RPT-DAILY-18 | Production by Carrier carrier resolution (charge stamp, claim family carrier, current coverage, No Insurance) with `carrier_source` counts and `payer_snapshot` warning; switch to stamped carrier after DATA-33 | P1 | M | DATA-21, DATA-33 | Every charge lands in exactly one carrier row; the warning prints the count per source; after DATA-33 new charges resolve from the stamp |
| RPT-DAILY-19 | Production adjustment lists per office / provider / report end on the legacy Sub Type, `Unclassified adjustments` line, bridge test to `production_adjustments` | P1 | S | DATA-03, DATA-12, RPT-DAILY-07 | List total minus `production_adjustments` equals the bridge (collection-side write-offs minus non-income production classes) on the fixture; zero after the O-2 seed |
| RPT-DAILY-20 | Collection Report definition: Detail / Summary for COLLECTION BY none / provider / carrier, payment-code filter, collection adjustments, `collection_summary` block, `Unassigned provider` member, variant titles | P1 | L | DATA-03, DATA-06, ENG-11, ENG-23, RPT-DAILY-03 | Fixture day: payments with `counts_as_collection` sum to `-gross_collections`; adjustments to `collection_adjustments`; unticking Include Adjustments removes the Adjust column, lines and section and the footer note |
| RPT-DAILY-21 | Collection Report by Code on allocations: P1 background run on `rpt_fifo_allocations()` for the accounts in scope (31-day cap), P2 switch to `rpt_payment_allocations`; pseudo rows Unallocated / Refunded / Opening balance or transfer | P1 | M | DATA-20, DATA-26, ENG-59, ENG-38 | The `by_code` total equals the payment total of the same parameters (R-08); the derived-allocation note prints when derived rows exist; P2 run reads the table and gives the same totals |
| RPT-DAILY-22 | Collection by Carrier: carrier on remittance legs, `Patient` and `Carrier not recorded` members, `carrier_on_payment_missing` warning; stamped carrier on insurance checks after DATA-33 | P2 | S | DATA-33 | Every payment lands in one member; app remittances carry their carrier; the warning counts insurance payments without a carrier |
| RPT-DAILY-23 | Enhancement parameters of r01-r04 (`previous_office_day` token, `show_provider_recap`, `show_backdated_flag`, `exclude_zero_lines`, `production_groups`, `top_n`, `show_net_production`, `payer_types`, Collection `provider_ids` / `payment_types` / `carrier_ids` / `user_ids`) and the listed saved views | P1 | M | FLT-04, FLT-17, DATA-55, ENG-28 | Each enhancement has a default-off test proving the legacy default run is unchanged and a test of its effect; the saved views open with relative dates resolved per office |
| RPT-DAILY-24 | Prior-period comparison on Production and Collection Reports (`compare_to`, change columns) | P4 | S | FLT-26, ENG-32 | `previous_period` adds `charges_compare` / `payments_compare` equal to a run of the previous range; default `none` output byte-equal to the parity run |
| RPT-DAILY-25 | Row and bulk actions of r01-r04: open ledger, `create_task` (correct posting, enter duration, assign provider), `export_selection` | P3 | S | ENG-49, SEC-09 | Actions resolve ids from the snapshot; a caller without `phi_identified` sees none; each hand-off is audited |
<!-- /WORK-ITEMS -->
