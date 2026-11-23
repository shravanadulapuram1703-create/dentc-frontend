# Statements - report specifications

The billing-statement cycle of the legacy `Reports > Statements` screen: review the accounts that qualify, print one consolidated statement per responsible party, then stamp and lock the statement period; finance charges are applied from the same screen.
New home: **Financial › Statements** at `/reports/c/statements` (brief section 1; 07 section 4.10), the generic runner with the one registered per-report criteria layout `StatementCriteriaLayout`. Default phase **P1**.

## Overview

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `statements.statement_run` | Statements | Monthly batch of responsible-party statements for one office: eligibility list (PRINT STATEMENT REPORT), statement documents written as frozen `patient_statements` rows (PRINT STATEMENTS), then UPDATE STATEMENT DATES (stamp + lock); FINANCE CHARGES opens the companion run `statements.finance_charges` | P1 | XL | SCHEMA(22) (run header, account statement dates and lock); Exclude Responsible Party Type: SCHEMA(53); open-claim exclusion READY for app-era claims (migrated claims with `outstanding_quality = 'unknown'` do not hold an account, warning `open_claim_quality_unknown`); contract balances read from the per-patient service until `rpt_contract_installments` (DATA-37, P2) | DOCUMENTED (screen, workflow, printed statement); PARTIALLY DOCUMENTED (the PRINT STATEMENT REPORT list: layout INFERRED) |

## Shared rules

The family is one legacy screen, so most rules below are those of `statements.statement_run`; they are stated here once so that
the companion definition `statements.finance_charges` (NEW, not a legacy report: the dialog behind the FINANCE CHARGES button)
follows the same rules.

**Definitions of the family.**

| Definition | Kind | Formats (`report_format`, not a legacy control) | `side_effects` | Legacy entry |
|---|---|---|---|---|
| `statements.statement_run` | `standard` | `statement_report` (list), `statements` (documents) | `none` / `writes` (per format, 02 §5.9) | Statements screen: PRINT STATEMENT REPORT, PRINT STATEMENTS; bulk actions UPDATE STATEMENT DATES, PAPER STATEMENT SENT |
| `statements.finance_charges` (NEW, 04 §2.4) | `standard` | `preview` (list of the charges that would post), `apply` (posts them) | `none` / `writes` | FINANCE CHARGES button (`run_finance_charges` criteria action) |

`report_format` has no legacy control: the legacy screen selects the format through its footer buttons. The runner draws the two
buttons with their legacy labels; each sends the run with the matching format (`legacy_actions[]`: `PRINT STATEMENT REPORT` →
`run_format:statement_report`, `PRINT STATEMENTS` → `run_format:statements`).

**Shared parameters and defaults** (filter card section 3; parity table of the report section).

| Parameter | Type | Default | Rule on this family |
|---|---|---|---|
| `office_scope` | `office_scope`, hidden | forced `{"office_ids": {"token": "working_office"}}` (04 9.5, inferred) | `scope.office_mode = required`; one office per run; the office is the responsible party's **home office** (`rpt_account_dim.home_office_id`) |
| `statement_date` | `date`, role `run_date` | `yesterday` (unknown_legacy; captured value = day before the capture) | Billing date, as-of date of balances and ageing, upper bound of the itemised lines, value stamped by UPDATE STATEMENT DATES |
| `responsible_party_name` = `responsible_party_name_from`, `responsible_party_name_to` | `text_range` | `AAAAA` / `ZZZZZ` | Inclusive range on `upper(unaccent(concat_ws(', ', guarantor_last_name, guarantor_first_name)))` (dictionary expression; `unaccent` and the `COLLATE "C"` comparison are NEW, owner 04 §3.4, so `ÁVILA` falls inside `AAAAA`-`ZZZZZ`; a NULL first name keeps the account); also the way an office splits a large batch into several runs |
| `exclude_resp_party_type_codes` | `entity_multi` | `none` | Exclude; rows without a type kept; SCHEMA(53) |
| `provider_ids` | `entity_multi` | not documented (finance-charge dialog only) | Provider credited on the posted finance-charge line; `statements.finance_charges` only |

**Datasets.** `rpt_account_dim` (population, address, flags, statement dates), `rpt_ar_open_items()` with `p_unit = 'account'`
(balance, ageing buckets, `open_insurance_est` / `open_patient`), `rpt_ledger_entries` (itemised lines), `rpt_claim_facts`
(open-claim exclusion, claim-event lines), `rpt_patient_dim` (member names, chart numbers), `rpt_contract_installments`
(`Reg Cont. Bal.` / `Ort Cont. Bal.`; P2, per-patient service before), `rpt_procedure_code_dim` / `rpt_transaction_code_dim` (line
descriptions), `rpt_office_dim` (`Office # :`), passthrough `patient_statements` (previous statements,
"sent within n days", last statement balance), `office_statement_settings` (messages, logo, statement address and phone, through
`print_service.resolve_letterhead`), `office_advanced_settings` (finance-charge settings). Freshness `live`.

**Date bases.**

| Figure | Basis |
|---|---|
| Balances, ageing grid, Total Due, eligibility thresholds | as of `statement_date` (end of the office-local day of the run's office) |
| Estimated Insurance / Estimated Patient split, insurance-expected exclusion | money cut at `statement_date`, claim status of today (`claim_status_basis` of `rpt_ar_open_items`); warning `claim_status_as_of_today` when `statement_date` < office-local today |
| Itemised lines | `transaction_date` in (`accounts.last_statement_date`, `statement_date`]; plus app-era legs with `transaction_date <= last_statement_date` and `created_at_utc` after the previous run of the account (back-dated entries), flagged `*` "posted after the last statement" |
| Ageing buckets | `age_date` of `rpt_ar_open_items` (ageing starts when the procedure is completed), bucket set `legacy` (0-29 / 30-59 / 60-89 / 90-119 / 120+; 03 §2.14 fixes the vendor's one-day ambiguity) |
| "Sent within n days" | `patient_statements.statement_date` of a statement that counts as sent (`delivery_status` in `sent`, `paper_sent`, `emailed`) compared with `statement_date` (inferred) |
| Finance charges | `finance_charge_date` (its own parameter), as-of date of the balances charged |

**Office and provider attribution.** Office: home office of the account (03 §5.1, PD-6 "statements"); the statement consolidates
every leg of the account whatever office it was posted in, and the run lists only accounts homed at the run's office (legacy: "Please
update Statement Dates after Printing respective Office Statements"). Provider: none on the statement run (no provider column, no
provider restriction: `scope.provider_restriction = none`); `statements.finance_charges` stamps `provider_ids` on the line it posts.
Account: the patient's current account (`account_id`, 03 §5.3); a patient moved to another guarantor appears on the new guarantor's
statement with all of its legs.

**Sign conventions.** Charges positive in `Charges`; payments, insurance payments, write-offs and credit adjustments printed
**negative** in `Credits` (legacy prints payments negative, research §2.5; DentC stores payments negative, AL-9); debit
adjustments and refunds positive in `Charges`. `Total Due` = sum of every open item (debits minus unallocated credits) = the
account's ledger balance as of `statement_date` (R-03 / R-05). A credit statement shows a negative Total Due.

**Hidden population rules** (no legacy control; applied by every format, never by a parameter).

| Rule | Source | DentC predicate | Exclusion reason (NEW vocabulary, `statement_report` with `show_excluded_accounts`) |
|---|---|---|---|
| Responsible party opted out | `Send Statements` unticked on the responsible party `[D]` | `rpt_account_dim.send_statements = false` | `send_statements_off` |
| Account merged | inferred (a merged account has no members left) | `merged_into_account_id IS NOT NULL` | `account_merged` |
| Allocation issue | "the account has allocation issues" `[D]`; DentC test `[I]` | the account has an `is_sign_anomaly` leg, an `age_reset` transfer leg, or an explicit allocation link that `rpt_fifo_core` caps (over-application); Σ `open_amount` = ledger balance holds by construction (R-05), so it is not a test | `allocation_issue` |
| Balance changed after the pull | `[D]` | Applied by UPDATE STATEMENT DATES: the account's current balance as of `statement_date` ≠ snapshot `total_due` | `balance_changed` (action result, not a list row) |
| No home office | DentC data gap (no legacy rule) | `home_office_id IS NULL` and total balance above the threshold: in no office's run | `no_home_office` (counted in every run of the tenant, warning `no_home_office`) |

Inactive accounts (`is_active = false`, no active member) are NOT dropped: a former patient who still owes money keeps receiving
statements unless `Send Statements` is off; the list counts them (summary card Inactive) [I].

**Page furniture.** `statement_report`: legacy furniture (research §2.2): organisation name, title `Statement Report` (INFERRED title),
`Office : <office name>`; footer criteria echo (`Statement Date`, `Responsible Party Range`, `Account Balance Over`, each ticked
exclusion as `* Excludes ...`, `* Includes accounts with Credit Balances.`), report title, `Printed : <office-local date time>`,
`Page : n of m`. `statements`: no criteria echo on documents sent to patients; page numbers restart per statement
(`SectionedNumberedCanvas`, 02 §7.2); the criteria are kept on the run and in the audit record.

**Rights and data classes** (08 §2.3; security card).

| Capability | Right |
|---|---|
| Run `statement_report` and view it on screen | `reports_statements_screen_view_only` (family `statements`) |
| Run `statements` (writes); PDF print and XLSX / CSV of either format, the list included (PD-10); PAPER STATEMENT SENT; `statements.finance_charges` format `apply` | `reports_statements_screen_full_control` (`action_right_codes.commit`) |
| UPDATE STATEMENT DATES; undo of a stamp (enhancement) | `reports_statement_allow_updating_statement_dates` (undo additionally an administrator, PD-9) |
| Bulk export of the list | `reports_export_data_files` in addition (08 action rights) |

| Data class | Columns |
|---|---|
| `phi_identified` | responsible-party name, address, account number, chart number, patient name, date / code / tooth / surface of a line, statement dates, message bucket, exclusion reason; key columns of every block |
| `financial_patient` | every amount on a statement or list row and their run totals (rule 2 of 08 §5.2: totals inherit the class) |
| `payment_instrument` | none printed: the card section of the remittance slip is blank for the payer to fill in; no card data is read |

**Family-wide enhancements** (additive; untouched defaults = the legacy run).

| Enhancement | Detail |
|---|---|
| Exclusion reasons | `show_excluded_accounts` (boolean, NEW, default `false`) adds the accounts the criteria or hidden rules dropped, each with `exclusion_reason` |
| Selection runs | `account_ids` (entity_multi, NEW, hidden in the form, default `all`): set by the bulk action "Print statements for selection" of the list, so a reviewed subset is printed without re-entering criteria |
| CLEAR CRITERIA | the generic action, absent on the legacy screen (04 §14) |
| Saved views | "Month-end statements A-L" with `statement_date = end_of_last_month` and a name range; shareable (no patient value key) |
| Reversible stamp | `undo_statement_dates` (the legacy per-patient `Unclose Last Statement` generalised to a run, audited, PD-9) |
| Review before update | the run page shows the `statements` snapshot with per-account delivery state; UPDATE STATEMENT DATES is offered only on that snapshot |

**Phase risk** (02 §18.2-1). Background runs arrive in P2; in P1 a run must fit the inline budget (45 s, 50,000 rows). A large office
splits the batch by `responsible_party_name` (the legacy range exists for this purpose); a run above the budget fails with
`report_too_large_for_inline` and the hint names the range split. `cost_class = interactive` in P1 (a `background` definition is
hidden while `REPORT_BACKGROUND_ENABLED = false`), `escalate_when` an estimated account count above 2,000 from P2.

**Family-wide open questions.** (1) The FINANCE CHARGES dialog: control types, defaults and posting formula (only the field labels are
documented). (2) PAPER STATEMENT SENT: purpose and enabling condition (04 open decision 15). (3) Whether the legacy last statement
date per account exists in the migration export (RP table); without it every first DentC statement itemises the whole history unless
the cut-over rule of RPT-STMT-05 applies. (4) 02 §5.9 and 07 §4.10 call FINANCE CHARGES "a parameter of the run"; 04 §2.4 and the
parity file make it a criteria action opening `statements.finance_charges` - this document follows 04.

## Statements - `statements.statement_run`

Statements (`statements_reports.r01`, screenshot `1.PNG`, single-purpose form, no SELECT REPORT list) - P1 - XL - family `statements` (`reports_statements_screen_view_only` / `reports_statements_screen_full_control`; commit = Full Control; UPDATE STATEMENT DATES = `reports_statement_allow_updating_statement_dates`) - interactive in P1, background from P2 (RPT-STMT-08) - DOCUMENTED (screen, workflow, printed statement); PARTIALLY DOCUMENTED (Statement Report list, layout INFERRED)

### Purpose

| Who | When | Task / decision |
|---|---|---|
| Billing staff of each office | Monthly, after Close Out of the prior month (vendor cadence research §2.9) | Vendor sequence: FINANCE CHARGES (if the office charges them) > PRINT STATEMENT REPORT (review who will get a statement) > PRINT STATEMENTS (produce and keep the batch) > UPDATE STATEMENT DATES (stamp `Statement Sent - $X.XX`, set Last Statement Date, lock the period) only after the statements are confirmed correct |
| Office manager | Before the update | Check the eligible population and totals against the A/R, decide on exclusions (insurance-expected, collections, open claims, responsible-party types) |
| Billing staff, on demand | Any day | Reprint or re-run a subset (one name range, one account selection) |

### Legacy output

Two outputs (research §6 "Statements"). Confidence: the printed statement DOCUMENTED from four vendor samples (2008, 2011, 2013,
2025); the Statement Report list INFERRED (no sample found).

**PRINT STATEMENTS - printed statement, in-app layout** `[S]` (one document per responsible party, consolidated over all
members of the account, from the responsible party's home office, with that office's settings and messages):

| # | Area | Content |
|---|---|---|
| 1 | Header | Title `Statement`; office logo and return address (statement address and billing phone when configured); responsible party name and address in window-envelope position; box `Billing Date :` (statement date), `Account # :`, `Amount Due :`, `Office # :` |
| 2 | Payment box (older build, top right) | `Method of Payment` - `Check`, `Credit Card`, `Credit Card # :`, `CID :`, `Exp Date :`, `Name : (as it appears on the Credit Card)`, `Type of Card :`, `Signature :` |
| 3 | Tear line | `Detach here and Return this Portion of the Statement with your Payment` |
| 4 | Line table | `Date` · `Description` · `Chart #` · `Patient Name` · `Code` · `Th` · `Surf` · `Credits` · `Charges` |
| 5 | First line | `Last Statement Balance`, dated with the previous statement date |
| 6 | Lines | Transactions since the last statement: procedures, payments (research quotes `$-190.39 Ins Chk <carrier>`, `$-8.03 Visa`), claim events (`Sec Claim - Sent (218.00)`, amount inside the description, no money column) |
| 7 | Totals | `Total :` (credits, charges) and `Total Due as of <statement date> :` |
| 8 | Ageing grid | `Current` · `Over30` · `Over60` · `Over90` · `Over120` · `Total Balance`; rows `Estimated Insurance`, `Estimated Patient`; beside it `Reg Cont. Bal.` · `Ort Cont. Bal.` (remaining contract balances, off-ledger until periodic charges post) |
| 9 | `Messages :` / `Comments :` | General message plus the message of the account's ageing (Current / Over 30 / 60 / 90 / 120), e.g. online-payment invitation, collections notice |

Vendor statement-service layout (2008 / 2011 samples, not on the in-app screen): postal barcode; line table `Date` · `Description`
· `Patient Name` · `Code` · `TH` · `Surf` · [`Full Fee`] · `Charge` · `Ins Exp` · `Pat Por` · `Credit` · `Balance` (running);
ageing grid without `Over120`; bottom remittance coupon. Offered as the enhancement `statement_layout = service_style`.

**PRINT STATEMENT REPORT - eligibility list** `[I]`: one row per eligible responsible party (id, name, balance, ageing,
estimated insurance / patient, last statement date) with a count and a total - effectively the ageing detail filtered by the
statement criteria. Confirm the real columns and title on the live tool (RPT-STMT-09).

**Variants per option** (each INFERRED unless tagged):

| Option | Effect on the printed statement |
|---|---|
| `Suppress Aging` | No ageing grid; `Total Due` stays; whether `Reg Cont. Bal.` / `Ort Cont. Bal.` go too is not documented (proposal: kept; open question 5) |
| `Hide Insurance Shares` | No `Estimated Insurance` / `Estimated Patient` rows; the grid prints one row `Total` (Current ... Over120, Total Balance) |
| `Hide Credit Card Section` | Payment box without the card fields (vendor viewer names `StatementRPV1_V1_withoutCC`, `StatementPrev_withoutCC` `[S]`) |
| `Include Credit Balances` | Credit accounts also receive a statement (negative Total Due) |
| Sort radio | Order of the documents in the batch (`[C]`) |

**Sign conventions and quirks.**

| Legacy behaviour | Kept / fixed |
|---|---|
| Payments printed negative in `Credits` | Kept (research §2.5) |
| Only transactions since `Last Statement Date` are itemised; skipping UPDATE STATEMENT DATES makes later statements repeat years of history `[D]` | Kept as the rule; mitigated: the list shows `last_statement_date` and line count per account, and the first run after migration uses the cut-over of RPT-STMT-05 |
| Generating with one date and updating with another shows more than one month `[D]` | Fixed: UPDATE STATEMENT DATES always writes the run's own `statement_date`; no date input on the action |
| A reprint after the update shows only the `Last Statement Balance` line `[D]` | Fixed: a stored statement reprints from its frozen `patient_statements.snapshot`, lines included |
| Update and Close Out with today's date lock today's entries `[D]` | Kept as a warning: second confirmation when `statement_date` = office-local today |
| Lock cannot be undone except per patient (`Unclose Last Statement`) `[D]` | Improved: `undo_statement_dates` per run or account, audited (PD-9) |
| Viewer export to Excel and Word `[S]` | PDF, XLSX and CSV; Word superseded (no editable statement) |

### Parameters - legacy parity

<!-- PARITY:statements_reports.r01:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| [no header] LEFT TABLE | Statement Date (date_input) | shown: 11/20/2026 | `statement_date` | date | - | `yesterday` | unknown_legacy | Role run_date (04 section 3.3): the Billing Date printed on every statement, the as-of date of the balances and the ageing grid ('Total Due as of <date>'), the upper bound of the itemised lines, and the value UPDATE STATEMENT DATES writes. Required. Default rule unconfirmed: check on the live tool whether the box opens with the previous day, today or a stored date (for example the end of last month). Default differs: 04 proposes today; the capture shows the day before the capture date (11/20/2026), and the vendor warns against updating statement dates with today's date because it locks today's entries. The token yesterday reproduces the captured value; confirm the rule on the live tool. |
| [no header] LEFT TABLE | (no label) (other) | (empty) | `statement_date` | date | - | - | help_text | Info icon after the Statement Date label; tooltip text not visible - capture it on the live tool and keep it as help text. |
| [no header] LEFT TABLE | FINANCE CHARGES (button) | - | `run_finance_charges` | action | - | - | replicated | Criteria-area button, not a parameter: a definition action (02 section 3.10, scope criteria, kind navigate) that opens the separate finance-charge run statements.finance_charges with its own five criteria (Finance Charge Date, Responsible Party Range, Exclude Responsible Party Type, Provider, Apply Finance Charge to Patient Portion / Entire Balance). No finance-charge engine exists yet (new feature). |
| [no header] LEFT TABLE | Responsible Party Range (static_text) | - | `responsible_party_name_from` | text_range | - | - | help_text | Row caption of the Start Name / End Name pair; kept as the label of the range control. |
| [no header] LEFT TABLE | Start Name (text_input) | shown: AAAAA | `responsible_party_name_from` | text_range | - | `AAAAA` | replicated | Start of the responsible-party last-name range. |
| [no header] LEFT TABLE | SEARCH (button) | - | `responsible_party_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| [no header] LEFT TABLE | End Name (text_input) | shown: ZZZZZ | `responsible_party_name_to` | text_range | - | `ZZZZZ` | replicated | End of the responsible-party last-name range (inclusive). |
| [no header] LEFT TABLE | SEARCH (button) | - | `responsible_party_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| [no header] LEFT TABLE | Account Balance Over (number_input) | shown: 5.00 | `account_balance_over` | decimal | - | `5.00` | replicated | Statements meaning: strictly greater than, applied to the total balance of the guarantor account (insurance plus patient portions, all offices of the account, as of statement_date; rpt_ar_open_items unit account). Accounts with a balance of exactly 0.00 never qualify. Legacy measure (account total versus estimated patient portion) is not documented in so many words - confirm on the live tool with an account whose patient portion is below and whose total is above the threshold. |
| [no header] LEFT TABLE | Include Credit Balances (checkbox) | **unchecked** | `include_credit_balances` | boolean | - | `false` | replicated | Statements meaning differs from the Aging reports: the threshold account_balance_over already drops every account below 5.00, so true ADDS the accounts whose total balance is negative (credit statements) to the population; the threshold is not applied to them. false = no credit statement. Meaning inferred (no vendor description); confirm on the live tool. |
| [no header] LEFT TABLE | (no label) (radio_group) | **Sort by Resp.Party Lastname** / Sort by Resp.Party ID | `sort_by` | enum | Sort by Resp.Party Lastname -> `responsible_party_last_name`, Sort by Resp.Party ID -> `responsible_party_id` | `responsible_party_last_name` | replicated | - |
| [no header] LEFT TABLE | Suppress Aging (checkbox) | **unchecked** | `suppress_aging` | boolean | - | `false` | replicated | Role layout on format statements: true removes the ageing grid (Current ... Over120, Total Balance, Estimated Insurance / Patient rows) from each statement; Total Due stays. Whether Reg Cont. Bal. / Ort Cont. Bal. are removed as well is not documented (proposal: kept). On format statement_report it has no effect. Meaning inferred from the label (no vendor description). |
| [no header] LEFT TABLE | Hide Insurance Shares (checkbox) | **unchecked** | `hide_insurance_shares` | boolean | - | `false` | replicated | Role layout on format statements: true replaces the Estimated Insurance and Estimated Patient rows of the ageing grid by one row Total (Current ... Over120, Total Balance) and removes the Ins Exp / Pat Por columns of the service_style layout. Population unchanged. Meaning inferred from the label. |
| [no header] LEFT TABLE | Hide Credit Card Section (checkbox) | **unchecked** | `hide_credit_card_section` | boolean | - | `false` | replicated | Role layout on format statements: true prints the remittance slip without the card fields (Credit Card # / CID / Exp Date / Name as it appears on the Credit Card / Type of Card / Signature); Check stays. Vendor viewer shows statement variants named ..._withoutCC, which fits; meaning otherwise inferred. |
| [no header] RIGHT TABLE | Last Statement Date (static_text) | - | `last_statement_date` | display | - | `server_value` | replicated | display_source office_last_statement_date: statement_date of the latest statement_runs row (NEW, DATA-22) of the resolved office (home office of the run) whose dates were updated (NEW column dates_updated_at not null), else empty. Empty for every migrated tenant until a run is updated (no statement was migrated). |
| [no header] RIGHT TABLE | Last Close Out Date (static_text) | - | `last_close_out_date` | display | - | `server_value` | replicated | display_source office_last_close_out_date: latest financial_period_locks row covering the resolved office (DATA-29, P2). Until DATA-29 the value is the NEW tenant setting legacy_close_out_date written by the migration (the captured 12/31/2019), else empty. Read-only; Close Out itself is Setup, not this screen. |
| [no header] RIGHT TABLE | Print Reports (static_text) | - | `paper_statement_sent` | action | - | - | help_text | Row caption Print Reports of the PAPER STATEMENT SENT button; kept as its label. |
| [no header] RIGHT TABLE | PAPER STATEMENT SENT (button) | - - greyed out | `paper_statement_sent` | action | - | - | unknown_legacy | Enabled when: unknown (unknown). Criteria-area button, not a parameter: a definition action (02 section 3.10). Greyed in our capture, enabled in vendor screenshots. What it does is not documented: its row caption Print Reports suggests a report of paper statements sent; 02 section 5.9 treats it as a bulk action over the snapshot of a statement run. Confirm what it does and what enables it. |
| [no header] RIGHT TABLE | Exclude accounts where statement was sent within last (checkbox) | **unchecked** | `exclude_statement_sent_within` | lookback_days | - | `false` | replicated | Checkbox of the sentence 'Exclude accounts where statement was sent within last [n] days.'. true drops an account that has a patient_statements row that counts as sent (delivery_status in sent, paper_sent, emailed; reopened and generated do not count; set defined by DATA-22), any office, with statement_date > statement_date - n days and <= statement_date; with n = 0 only a statement of the same statement_date counts (inferred: the legacy reference day is not documented - statement date assumed, not today). |
| [no header] RIGHT TABLE | days. (dropdown) | shown: 0 | `exclude_statement_sent_within_days` | lookback_days | - | `0` | unknown_legacy | Day list of the within-last sentence, captured collapsed with value 0 and enabled while the checkbox is unticked (no enabling rule, 04 section 9.6; the value is ignored while exclude_statement_sent_within is false). Until the list is read, the server accepts an integer 0-365. Live check: expand the dropdown and record every value. |
| [no header] RIGHT TABLE | Exclude accounts where patient portion is paid and insurance portion is expected (checkbox) | **checked** | `exclude_insurance_expected_accounts` | boolean | - | `true` | replicated | Default checked on Statements (captured and vendor text). true drops accounts whose open patient portion is <= 0 while an insurance portion is still expected (sum open_patient <= 0 AND sum open_insurance_est > 0 over the account's open items as of statement_date). For migrated charges without the claim_id backfill open_insurance_est is 0 (split_quality unknown), so such accounts are NOT dropped - counted in the run warning. |
| [no header] RIGHT TABLE | Exclude patients Sent to Collection. (checkbox) | **unchecked** | `exclude_sent_to_collection` | boolean | - | `false` | replicated | true drops accounts with rpt_account_dim.send_collections = true (the legacy Sent to Collection flag of the responsible party). |
| [no header] RIGHT TABLE | Exclude Responsible Parties where the Patient has an open claim (checkbox) | **unchecked** | `exclude_open_claim_accounts` | boolean | - | `false` | replicated | Visible only with the organisation feature hold_statements_with_open_claims (rule d01). true drops an account when any member patient has a claim in rpt_claim_facts with status_class in (unsent, sent, partially_paid), NOT is_preauth and outstanding_quality <> unknown. Migrated open claims with outstanding_quality unknown do not hold the account: availability code open_claim_quality_unknown prints their count. Inferred: whether the legacy 'open claim' includes created-not-sent claims and pre-authorisations, and whether 'the Patient' means any member or the guarantor patient only - confirm on the live tool. |
| [no header] RIGHT TABLE | Exclude Responsible Party Type (picker) | shown: None | `exclude_resp_party_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter on rpt_account_dim.resp_party_type (source definitions:resp_party_type); none = exclude nothing; rows without a type are kept. Needs DATA-53 (the type is NULL on self-guarantor accounts until then). Enhanced: chip box with search instead of the SELECT dialog, whose content was never captured. |
| [no header] BELOW THE TABLES | Maximum 100 characters per message (static_text) | - | - | - | - | - | help_text | Caption of the six statement message boxes (General, Current, Over 30, Over 60, Over 90, Over 120 Message; vendor documentation), which were not rendered in our capture. Kept as help text of the six text parameters general_message ... over_120_message (max_length 100). |
| [no header] BELOW THE TABLES | Note: Please update Statement Dates after Printing respective Office Statements. (static_text) | - | - | - | - | - | help_text | Reminder shown above the action buttons; kept as help text beside Update Statement Dates. |
| [no header] BELOW THE TABLES | General Message (text_input) † | (empty) | `general_message` | text | - | `server_value` | replicated | Shared vendor-doc parameter (04 section 9.7): text, validation.max_length 100, default server_value = office_statement_settings.message_general of the run's office. Printed in the Messages area of every statement of the run. On this report role query, not layout as 04 section 9.7 declares: the text is frozen into patient_statements.message by the commit, so it must be part of params, the run hash and the audit record (challenge to 04: role query for the Statements messages, layout kept for the Walkout Report). |
| [no header] BELOW THE TABLES | Current Message (text_input) † | (empty) | `current_message` | text | - | `server_value` | replicated | Shared vendor-doc parameter: max_length 100, default server_value = office_statement_settings.message_current. Printed after the general message on statements whose message_bucket is current (oldest open debit of the account aged 0-29 days as of statement_date, bucket set legacy). Role query on this report (frozen into patient_statements.message). |
| [no header] BELOW THE TABLES | Over 30 Message (text_input) † | (empty) | `over_30_message` | text | - | `server_value` | replicated | Shared vendor-doc parameter: max_length 100, default server_value = office_statement_settings.message_30. Printed when message_bucket is over_30 (oldest open debit 30-59 days). Role query on this report. |
| [no header] BELOW THE TABLES | Over 60 Message (text_input) † | (empty) | `over_60_message` | text | - | `server_value` | replicated | Shared vendor-doc parameter: max_length 100, default server_value = office_statement_settings.message_60. Printed when message_bucket is over_60 (60-89 days). Role query on this report. |
| [no header] BELOW THE TABLES | Over 90 Message (text_input) † | (empty) | `over_90_message` | text | - | `server_value` | replicated | Shared vendor-doc parameter: max_length 100, default server_value = office_statement_settings.message_90. Printed when message_bucket is over_90 (90-119 days). Role query on this report. |
| [no header] BELOW THE TABLES | Over 120 Message (text_input) † | (empty) | `over_120_message` | text | - | `server_value` | replicated | Shared vendor-doc parameter: max_length 100, default server_value = office_statement_settings.message_120. Printed when message_bucket is over_120 (120 days and more). Role query on this report. Live check: whether the legacy bucket is driven by the oldest open debit of the account or by the patient portion only. |
| [no header] BELOW THE TABLES | Remaining Characters (static_text) † | - | - | - | - | - | help_text | Remaining Characters counter of the message boxes: kept as the live counter that TextParam shows under each of the six message parameters (validation.max_length 100). One counter per box assumed; position not documented. |

† From vendor documentation - not visible in our screenshot of this screen (hidden row, collapsed dropdown or another report mode).

| Legacy action button | In the new module |
|---|---|
| PRINT STATEMENT REPORT | run_format:statement_report - run of statements.statement_run with report_format = statement_report (side_effects none): one row per eligible responsible-party account, count and totals; never writes. View Only runs it and sees the list on screen; the PDF print and the XLSX / CSV of the list need Full Control of the statements family (PD-10), exports additionally reports_export_data_files. |
| PRINT STATEMENTS | run_format:statements - run with report_format = statements (side_effects writes): one statement document per eligible account, PDF layout statement in volumes of 500; the commit_builder writes a NEW statement_runs header (DATA-22) and one frozen patient_statements row per account (batch_id = statement_runs id, statement_date, totals, ageing, message, snapshot of the lines, delivery_status generated) in the terminal transaction. Needs action_right_codes.commit = reports_statements_screen_full_control and a confirmation (confirm_side_effects); never cached, never scheduled. |
| UPDATE STATEMENT DATES | action:update_statement_dates - bulk action (scope bulk, legacy_action UPDATE STATEMENT DATES) over the snapshot of a succeeded statements run: per account sets accounts.last_statement_date and accounts.statement_locked_through to the run's statement_date, sets the run's patient_statements rows (by batch_id) to delivery_status sent and delivery_method print (email or both once e-statements apply; NEW delivery_status vocabulary generated / sent / paper_sent / emailed / reopened, owner 03 DATA-22), so they print as the 'Statement Sent - $X.XX' ledger line; stamps the NEW columns statement_runs.dates_updated_at / dates_updated_by (DATA-22); skips accounts whose balance changed since the run (reason balance_changed); idempotent per (batch_id, action_key, account_id). Right reports_statement_allow_updating_statement_dates; confirmation required; a statement_date equal to the office-local today needs a second confirmation (vendor advice). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| The account-level feature "Enable Advance Hold Statements with Open Claims" is activated | The checkbox `Exclude Responsible Parties where the Patient has an open claim` is present on the screen; it is only present when that feature is activated. | exclude_open_claim_accounts is declared with visible_when ["ctx", "feature.hold_statements_with_open_claims"] (04 shared rule). The ctx fact is read from a NEW organisation setting account_settings.hold_statements_with_open_claims (owner 03 / 08). Feature off: the checkbox is not served and its value is forced to the disabled_value false, so it adds no predicate and is echoed as 'not applied'. Feature on: shown in the RIGHT TABLE with default false; ticked drops every account with an open claim of any member. |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `office_scope` | forced_when | true | {"office_ids": {"token": "working_office"}} | inferred - Hidden scope: the statement run is per office. |
| `exclude_open_claim_accounts` | visible_when | ctx.feature.hold_statements_with_open_claims | - | documented - Present only when the account feature "Enable Advance Hold Statements with Open Claims" is on. |
<!-- PARITY:statements_reports.r01:END -->

| Legacy option | Effect on the result |
|---|---|
| `Statement Date` = a date | Billing date printed; as-of date of balances, ageing and Total Due; upper bound of the itemised lines; date stamped by UPDATE STATEMENT DATES; reference day of "sent within n days". Default `yesterday` (unknown_legacy) |
| Info icon after Statement Date | Help text (tooltip text to capture) |
| `FINANCE CHARGES` button | Opens `statements.finance_charges` (criteria action `run_finance_charges`); changes nothing in this run until charges are applied, after which they are ordinary ledger legs on the next run |
| `Responsible Party Range` caption | Label of the name range |
| `Start Name` = `AAAAA` / text | Lower bound (inclusive) on the guarantor sort name `LAST, FIRST`; `AAAAA` = from the start of the alphabet |
| `End Name` = `ZZZZZ` / text | Upper bound (inclusive, prefix rule of 04 §3.4: `SMITH` includes `SMITH, JOHN`); `ZZZZZ` = to the end |
| `SEARCH` (twice) | Superseded: the lookup icon of each box writes `Last, First` of the chosen responsible party |
| `Account Balance Over` = `5.00` / amount | Keeps accounts whose total balance as of `statement_date` is strictly greater than the amount |
| `Include Credit Balances` unticked | No statement for accounts with a negative total |
| `Include Credit Balances` ticked | Accounts with a negative total are added regardless of `Account Balance Over` |
| `Sort by Resp.Party Lastname` (default) | Rows and documents ordered by guarantor last name, first name, account number |
| `Sort by Resp.Party ID` | Ordered by responsible-party id, numeric-aware (`legacy_key` = RPID numerically where present, then `account_no`) |
| `Suppress Aging` ticked | Statements print without the ageing grid (layout only) |
| `Hide Insurance Shares` ticked | Statements print without the Estimated Insurance / Estimated Patient rows (layout only) |
| `Hide Credit Card Section` ticked | Payment box without card fields (layout only) |
| `Last Statement Date` | Read-only: latest updated statement run of the office |
| `Last Close Out Date` | Read-only: latest close-out (period lock) covering the office |
| `Print Reports` caption + `PAPER STATEMENT SENT` (greyed) | Criteria action `paper_statement_sent`; behaviour unknown_legacy (proposal in Actions) |
| `Exclude accounts where statement was sent within last` ticked + `[n] days.` | Drops accounts with a statement dated within the n days up to `statement_date`; unticked: the day value is ignored |
| `days.` = `0` / other values (list not captured) | Number of days; 0 = only a statement of the same date counts |
| `Exclude accounts where patient portion is paid and insurance portion is expected` ticked (default) | Drops accounts whose open patient portion is <= 0 while insurance is still expected |
| same, unticked | Such accounts receive a statement showing the insurance-expected balance |
| `Exclude patients Sent to Collection.` ticked | Drops accounts flagged sent to collection |
| `Exclude Responsible Parties where the Patient has an open claim` ticked | Drops accounts where any member has an unsent, sent or partially paid claim; shown only with the open-claim feature (rule d01) |
| `Exclude Responsible Party Type` = `None` (default) / types | Drops accounts of the selected types; `None` = no exclusion |
| `Maximum 100 characters per message` | Help text of the six message boxes |
| `Note: Please update Statement Dates after Printing respective Office Statements.` | Help text beside UPDATE STATEMENT DATES |
| `General Message` text | Printed on every statement of the run; default = office setup text |
| `Current Message` / `Over 30` / `Over 60` / `Over 90` / `Over 120 Message` text | Printed on the statements whose `message_bucket` matches; default = office setup text |
| `Remaining Characters` | Live counter under each message box |
| Action `PRINT STATEMENT REPORT` | Run with `report_format = statement_report`; no write |
| Action `PRINT STATEMENTS` | Run with `report_format = statements`; writes the frozen statement rows |
| Action `UPDATE STATEMENT DATES` | Bulk action on that run's snapshot: stamp, lock, ledger marker line |

Dependency rules: `exclude_open_claim_accounts` visible only when `ctx.feature.hold_statements_with_open_claims` (d01, disabled
value `false`); `exclude_statement_sent_within_days` has no enabling rule and is ignored while `exclude_statement_sent_within` is
false; `office_scope` hidden and forced to `working_office`; the layout booleans and messages have no effect on
`report_format = statement_report`; UPDATE STATEMENT DATES is enabled only on a succeeded run with `report_format = statements`
whose dates were not yet updated; PAPER STATEMENT SENT: enabling condition unknown_legacy (RPT-STMT-09 / FLT-23; enabled on the
bare criteria form in the vendor's screenshots).

### Parameters - enhancements

| Key | Type | Default | Effect | Phase |
|---|---|---|---|---|
| `show_excluded_accounts` | `boolean` (NEW, report-specific) | `false` | Adds the block `excluded_accounts`: every account of the office in the name range that a criterion or a hidden rule dropped, with `exclusion_reason`; main totals unchanged | P1 |
| `account_ids` | `entity_multi` (NEW; source `accounts`; hidden in the form) | `all` | Restricts the run to a selection; set by "Print statements for selection" and by the A/R worklist of 06; needs `phi_identified` | P1 |
| `statement_layout` | `enum` (NEW): `standard`, `service_style` | `standard` | `service_style` prints `Ins Exp`, `Pat Por` and a running `Balance` column (vendor service layout); role layout | P2 |
| `include_full_fee` | `boolean` (NEW) | `false` | With `service_style`: adds `Full Fee` (office UCR fee, `rpt_ledger_entries.office_fee`) next to `Charge` | P2 |
| `delivery_filter` | `enum` (NEW): `all`, `paper_only`, `email_only` | `all` | `paper_only` = accounts without an e-mail or with `no_email_statement`; `email_only` = the rest; for the e-statement action | P3 |
| Saved view with tokens | `statement_date = end_of_last_month`, name range per batch | - | "Month-end statements A-L / M-Z" | P1 |

### Data

Availability: **SCHEMA(22)** - `statement_runs` header, `accounts.last_statement_date`, `statement_locked_through`,
`patient_statements.delivery_error`, the existing `patient_statements.batch_id` used as the run id (DATA-22, P1). Further: Exclude
Responsible Party Type SCHEMA(53) (DATA-53, P1); balance split and ageing DATA-20 (P1); claim facts DATA-21 (P1); contract
balances DATA-37 (P2; per-patient service before); open-claim exclusion READY for app-era claims (migrated unknown-quality
claims do not hold, warning `open_claim_quality_unknown`); the finance-charge run is a posting engine, not a dataset.

| Dataset | Columns used |
|---|---|
| `rpt_account_dim` | `account_id`, `account_no`, `home_office_id`, `guarantor_last_name`, `guarantor_first_name`, address, phones, `resp_party_type`, `send_statements`, `no_email_statement`, `send_collections`, `is_finance_charge`, `statement_message`, `member_count`, `active_member_count`, `legacy_key`, `is_active`, `merged_into_account_id`, `last_statement_date`; `guarantor_patient_id` (NEW, 03 §2.8: patient id of a self-guarantor, NULL for a responsible-party row) |
| `rpt_ar_open_items(p_tenant_id, p_account_ids, p_as_of = statement_date, p_unit = 'account')` | `account_id`, `patient_id`, `item_kind`, `entry_id`, `age_date`, `age_days`, `open_amount`, `open_insurance_est`, `open_patient`, `split_quality`, `is_derived` |
| `rpt_ledger_entries` | `entry_id`, `entry_type`, `code`, `code_kind`, `tender_class`, `payer`, `carrier_id`, `amount`, `debit`, `credit`, `transaction_date`, `created_at_utc`, `patient_id`, `account_id`, `procedure_id`, `claim_id`, `is_sign_anomaly` (lines; tooth and surface through `rpt_charges` by `procedure_id`) |
| `rpt_claim_facts` | `claim_id`, `patient_id`, `account_id`, `tier`, `is_preauth`, `status_class`, `outstanding_quality`, `submitted_date`, `billed_amount`, `carrier_id`, `carrier_name` (`Ins Chk <carrier>`) |
| `rpt_procedure_code_dim` | `procedure_code`, `description` (charge line description) |
| `rpt_transaction_code_dim` | code, description, tender (payment / adjustment line description) |
| `rpt_office_dim` | `office_id`, `office_code` (`Office # :`), `office_name`, `local_today` |
| `rpt_patient_dim` | `patient_id`, chart number, last / first name of each member |
| `rpt_contract_installments` (P2) | `patient_id`, `contract_kind`, `periodic_amount`, `is_billed` |
| `patient_statements` (passthrough) | `account_id`, `statement_date`, `closing_balance`, `delivery_status` (vocabulary `generated`, `sent`, `paper_sent`, `emailed`, `reopened` NEW, owner 03 DATA-22; backend default `generated`), `delivery_method` (`print`, `email`, `download`), `batch_id` (= `statement_runs` id) |
| `statement_runs` (NEW, DATA-22) | id, office, `statement_date`, params, `dates_updated_at`, `dates_updated_by` (NEW columns) |

| Parameter | Becomes |
|---|---|
| `office_scope` (forced) | `rpt_account_dim.home_office_id = :office_id`; balances and lines are NOT office-filtered (consolidated account); accounts with NULL `home_office_id` are counted as `no_home_office` |
| `statement_date` | `p_as_of` of `rpt_ar_open_items`; `transaction_date <= :statement_date` on lines; value written by commit and update |
| `responsible_party_name_from` / `_to` | Range on `upper(unaccent(concat_ws(', ', guarantor_last_name, guarantor_first_name)))`, `COLLATE "C"`, prefix rule of 04 §3.4; sentinel bounds add no predicate |
| `account_balance_over` | `total_due > :value`, `total_due = Σ open_amount` per account |
| `include_credit_balances` | `OR total_due < 0` added to the balance predicate |
| `sort_by` | `responsible_party_last_name`: ORDER BY `guarantor_last_name, guarantor_first_name, account_no`; `responsible_party_id`: ORDER BY `legacy_key::bigint` when numeric (NULLS LAST), then `(account_no ~ '^[0-9]+$') DESC, length(account_no), account_no`; tie-breaker `account_id` |
| `exclude_statement_sent_within` + `_days` | `NOT EXISTS patient_statements s WHERE s.account_id = a.account_id AND s.delivery_status IN ('sent','paper_sent','emailed') AND s.statement_date > :statement_date - :days AND s.statement_date <= :statement_date` (days = 0: `s.statement_date = :statement_date`) |
| `exclude_insurance_expected_accounts` | Drop when `Σ open_patient <= 0 AND Σ open_insurance_est > 0` |
| `exclude_sent_to_collection` | `send_collections IS NOT TRUE` |
| `exclude_open_claim_accounts` | `NOT EXISTS rpt_claim_facts c WHERE c.account_id = a.account_id AND c.status_class IN ('unsent','sent','partially_paid') AND NOT c.is_preauth AND c.outstanding_quality <> 'unknown'` |
| `exclude_resp_party_type_codes` | `resp_party_type IS NULL OR resp_party_type NOT IN (...)` |
| `suppress_aging`, `hide_insurance_shares`, `hide_credit_card_section`, `statement_layout`, `include_full_fee` | Renderer only (role layout) |
| six messages | Role query: resolved text frozen into `patient_statements.message`; selection by `message_bucket` |
| `account_ids` | `account_id = ANY(:ids)` |

Derived values per account: `total_due` = Σ `open_amount`; bucket amounts = Σ `open_amount` by `age_days` band (legacy set);
`est_insurance` = Σ `open_insurance_est`, `est_patient` = `total_due - est_insurance`; `message_bucket` = band of the oldest item
with `open_amount > 0` (`current` when none) [I]; `last_statement_balance` = `closing_balance` of the latest sent statement, else
the balance at the cut-over date (RPT-STMT-05); lines = legs with `transaction_date` in (`last_statement_date`, `statement_date`]
plus back-dated app-era legs created after the previous run; `prior_period_correction` = `total_due - (last_statement_balance + Σ
lines)`, printed only when not zero (a void or override inside a locked period).

What migrated history cannot give (served as `availability[]` warnings):

| Code | Message |
|---|---|
| `no_migrated_statements` | No legacy statement was migrated: Last Statement Date and "sent within n days" start with the first DentC run (unless RPT-STMT-05 finds the legacy date) |
| `split_unknown` | Accounts with `split_quality = unknown` (migrated charges without the claim_id back-fill) show all of the balance as Estimated Patient and are not dropped by the insurance-expected exclusion; the count is printed |
| `resp_party_type_missing` | Until DATA-53 self-guarantor accounts have no type, so the type exclusion keeps them |
| `contract_balance_service` | Until DATA-37 the contract balances come from the per-patient payment-plan service (slow on cold cache) |
| `migrated_claim_events` | Claim-event lines exist only for claims with a submitted date; migrated claims have no per-send history |
| `open_claim_quality_unknown` | With `exclude_open_claim_accounts` ticked: count of accounts whose member has a claim in an open `status_class` with `outstanding_quality = 'unknown'` (migrated, before the claim_id back-fill and the status-code check); those accounts were NOT held |
| `claim_status_as_of_today` | When `statement_date` < office-local today: Estimated Insurance and the insurance-expected exclusion use today's claim status |
| `no_home_office` | Count of accounts with a balance above the threshold and no home office: they are in no office's run (listed in `excluded_accounts` with reason `no_home_office`) |

### Output

Format `statement_report` (legacy PRINT STATEMENT REPORT), block `eligible_accounts` (main):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `account_no` | Resp. Party ID | text | phi_identified | label `Total` |
| `responsible_party_name` | Responsible Party | text | phi_identified | count, label `Accounts: {n}` |
| `resp_party_type` | Type | text | phi_identified | none (default_visible false; enhancement until RPT-STMT-09) |
| `member_count` | Patients | integer | phi_identified | sum (default_visible false; enhancement until RPT-STMT-09) |
| `last_statement_date` | Last Statement | date | phi_identified | none |
| `last_statement_balance` | Last Stmt Balance | money | financial_patient | sum (default_visible false) |
| `current` | Current | money | financial_patient | sum |
| `over_30` | Over 30 | money | financial_patient | sum |
| `over_60` | Over 60 | money | financial_patient | sum |
| `over_90` | Over 90 | money | financial_patient | sum |
| `over_120` | Over 120 | money | financial_patient | sum |
| `total_due` | Balance | money | financial_patient | sum |
| `est_insurance` | Est. Ins. | money | financial_patient | sum |
| `est_patient` | Est. Pat. | money | financial_patient | sum |
| `reg_contract_balance` | Reg Cont. Bal. | money | financial_patient | sum (default_visible false; enhancement until RPT-STMT-09) |
| `ortho_contract_balance` | Ort Cont. Bal. | money | financial_patient | sum (default_visible false; enhancement until RPT-STMT-09) |
| `message_bucket` | Message | enum (`current`, `over_30` ... `over_120`) | phi_identified | none (default_visible false) |
| `has_mailing_address` | Address | boolean | phi_identified | count true (default_visible false) |
| `account_id`, `guarantor_patient_id` (NEW, see Data) | - | id, hidden | phi_identified | - |

Block `excluded_accounts` (placement `report_end`, visible_when `show_excluded_accounts`): `account_no`, `responsible_party_name`,
`total_due`, `exclusion_reason` (enum: `below_threshold`, `credit_balance`, `sent_within_days`, `insurance_expected`,
`sent_to_collection`, `open_claim`, `resp_party_type_excluded`, `send_statements_off`, `account_merged`, `allocation_issue`, `no_home_office`;
first matching reason in this order), count total.

Format `statements` (legacy PRINT STATEMENTS), `side_effects = writes`, PDF layout `statement`, `record_per_page`:

| Block | Shape / placement | Columns (type, class) | Totals |
|---|---|---|---|
| `statement_documents` | table, main (screen: one row per document) | `account_no`, `responsible_party_name`, `statement_date` (date), `last_statement_date`, `line_count` (integer), `amount_due`, `total_credits`, `total_charges`, `total_due`, `est_insurance`, `est_patient` (money, financial_patient; `amount_due` = header `Amount Due :`, = `total_due` until open question 6 decides), `message_bucket`, `delivery_state` (enum = `patient_statements.delivery_status`: `generated`, `sent`, `paper_sent`, `emailed`, `reopened`; phi_identified) | count; sums of money |
| `statement_lines` | table, grouped by account (group level `account`, page break per account forced, document per group) | `line_date` (Date), `description` (Description), `chart_no` (Chart #), `patient_name` (Patient Name), `procedure_code` (Code), `tooth` (Th), `surface` (Surf) - text/date, phi_identified; `credits` (Credits), `charges` (Charges) - money, financial_patient; hidden `entry_id`, `line_kind` (`balance_forward`, `charge`, `payment`, `adjustment`, `claim_event`, `prior_period_correction`) | per account: `Total :` sum of credits and charges; `Total Due as of {statement_date} :` = `total_due` |
| `aging_grid` | matrix, `after_group` | rows `Estimated Insurance`, `Estimated Patient` (one row `Total` with `hide_insurance_shares`); columns `Current`, `Over30`, `Over60`, `Over90`, `Over120`, `Total Balance` (money, financial_patient); an unallocated credit in the `Current` cell of Estimated Patient [I] | row totals; column total = `total_due` |
| `contract_balances` | key_value, `after_group` | `Reg Cont. Bal.`, `Ort Cont. Bal.` | - |
| `messages` | key_value, `after_group` | `Messages :` general + bucket message; `Comments :` `rpt_account_dim.statement_message` [I] | - |

Line order: `balance_forward` first, then `line_date`, then charges before credits, then `entry_id`. Description rules: charge =
procedure description; payment = code or tender description plus carrier name for insurance (`Ins Chk <carrier>`); claim event =
`<Prim|Sec|Ter> Claim - Sent (<billed_amount>)` dated `submitted_date`, no money; back-dated line suffixed `*`.

Grouping and sort: no `group_by` (fixed outer level `account` on the documents); sort per `sort_by`; page break per document
(fixed). Summary cards (`statement_report`): Accounts (count of `eligible_accounts`), Balance (Σ `total_due`), Est. Pat., Est.
Ins., Excluded (count of `excluded_accounts`), Inactive (count of eligible accounts with `is_active = false`). `reconciles_with`: per account `total_due` = metric `total_ar` for that account
(one-account variant, P1) - a test, not a query. `empty_when`: `no_detail_rows` on the main block.

### Visuals and drill-through

Chart: none - a list. With `show_excluded_accounts`: bar chart hint `excluded_by_reason` (count per `exclusion_reason`).

| Click | Target |
|---|---|
| A row of `eligible_accounts` / `statement_documents` | `kind = report`: `ledger.ledger_report` with `account_id` ← column `account_id`, `report_type` ← literal `account_ledger`, `date_from` ← `last_statement_date` + 1 day (empty: cut-over date of RPT-STMT-05), `date_to` ← `statement_date`. The Ledger Report forces `office_scope` to the working office; if it filters legs by office, the drill shows only that office's legs, not every leg of the consolidated statement (to confirm in `catalog/ledger_reports.md`) |
| Responsible party name | `kind = record`: guarantor account screen (route `patient_ledger` of the guarantor patient, `right_code` = ledger feature right of 08), to correct address or `Send Statements` |
| An ageing cell | `monthly.aging_report_by_home_office` (P2) with `responsible_party_name_from` / `_to` ← the row's name, `report_date` ← `statement_date`, `aging_buckets` ← the clicked bucket |
| `exclusion_reason = open_claim` | `insurance.outstanding_claims` (P2) filtered to the account's patients |
| A `statement_documents` row | `kind = record`: the frozen statement PDF of that account (`patient_statements` id from the snapshot) |
| After the update: header link | `lists.responsible_party_statements_sent` with `statement_date` ← run `statement_date` (rows carry `delivery_method = 'print'`, so the default STATEMENT TYPE = Paper lists them) |

### Actions

| Action key | Scope | Kind | Right | Rule |
|---|---|---|---|---|
| `open_ledger` | row | navigate | ledger feature right | Account ledger of the guarantor |
| `create_task` | row / bulk | create_task | task feature | "Billing follow-up" task per account |
| `send_balance_reminder` | row / bulk | send_sms | SMS feature; `requires: sms_consent` | Excluded count shown before send (P3 handler) |
| `print_statements_for_selection` | bulk (on `statement_report`) | custom: new run of format `statements` with `account_ids` = selection and the same params | Full Control | Confirmation with the account count |
| `export_selection` | bulk | export_selection | `reports_export_data_files` | - |
| `letters` | bulk | letters | letters feature (PD-15) | Collection letters for the selection |
| `update_statement_dates` | bulk, `legacy_action` UPDATE STATEMENT DATES | custom | `reports_statement_allow_updating_statement_dates` | Only on a succeeded `statements` run; selection `all` or rows; per account: skip with `balance_changed` when the current balance ≠ snapshot; set `last_statement_date`, `statement_locked_through`, on the rows of the run's `batch_id` `delivery_status = 'sent'` and `delivery_method = 'print'` (`email` / both once RPT-STMT-23 applies; prints as the `Statement Sent - $X.XX` ledger line), `statement_runs.dates_updated_at / _by` (NEW, DATA-22); with `account_settings.statement_close_out_all` also stamps the office's zero and credit accounts not in the run; idempotent per `(batch_id, action_key, account_id)` |
| `paper_statement_sent` | bulk, `legacy_action` PAPER STATEMENT SENT | custom (proposal) | Full Control | unknown_legacy; proposal until FLT-23: sets `delivery_status = 'paper_sent'` (`delivery_method = 'print'`) on the run's rows, which feeds `lists.responsible_party_statements_sent` with `statement_type = paper` |
| `undo_statement_dates` | bulk (run or rows) | custom | update-dates right + administrator | Restores the previous `last_statement_date` / lock, marks the rows `reopened` (struck through in the ledger, kept for audit) |
| `email_statements` | bulk | custom: correspondence handler | Full Control | P3: e-mail with a login-gated download link (no attachment), only accounts with an e-mail and `no_email_statement = false` |

Not a worklist: the list is a pre-run review. Balance follow-up lives in the patient A/R worklist of 06, whose bulk action
"Statements for the selection" calls this definition with `account_ids`.

**FINANCE CHARGES - `statements.finance_charges`** (criteria action `run_finance_charges`; dialog fields documented, behaviour INFERRED):

| Parameter | Type | Default | Meaning |
|---|---|---|---|
| `finance_charge_date` | `date` | not documented; proposal the screen's `statement_date` | Date of the posted charge and as-of date of the balances |
| `responsible_party_name` | `text_range` | `AAAAA` / `ZZZZZ` (assumed as the screen) | Accounts in range |
| `exclude_resp_party_type_codes` | `entity_multi` | `none` | As on the screen |
| `provider_ids` | `entity_multi`, `validation.max_items` 1 (proposal) | not documented | Provider stamped on the posted line (proposal; could be a filter - confirm) |
| `finance_charge_basis` | `enum`: `patient_portion`, `entire_balance` | not documented; proposal `patient_portion` | Base: Σ `open_patient` or Σ `open_amount` of items with `age_days >= days_before_charge` |

Rule [I]: accounts homed at the office with `is_finance_charge = true`; skip when the base < `office_advanced_settings.min_balance`;
charge = round(base × `finance_charge_pct` / 100 / 12, 2), at least `min_charge`; format `preview` lists account, base, charge;
format `apply` (`side_effects = writes`, Full Control) posts one adjustment per account with code `FEE - Finance Charge (Account)`
(transaction code catalog, DATA-03), office = home office, idempotent per `(account_id, finance_charge_date)`.

### Export and print

| Output | Rule |
|---|---|
| PDF `statement_report` | Layout `banded_table`, landscape, letterhead, repeating header, footer criteria echo and legacy furniture (shared rules), totals on the last page |
| PDF `statements` | Layout `statement` (ENG-26), US Letter portrait, one document per account, page numbers restart per document, address block in #10 window position, payment box and tear line, `hide_credit_card_section` / `suppress_aging` / `hide_insurance_shares` applied, logo and statement address from `print_service.resolve_letterhead`, no criteria echo; volumes of 500 documents (`volume_size`), one artifact per volume; order = `sort_by` |
| XLSX | `statement_report`: sheet `eligible_accounts` (one typed table, frozen header, autofilter), sheet `excluded_accounts`, criteria sheet. `statements`: sheet `statements` (one row per document) and sheet `statement_lines` (one row per line with `account_no` and `responsible_party_name` repeated); no merged cells |
| CSV | Main block of the format; `options.block = statement_lines` for the lines |
| Background | P1 inline only (split by name range); from P2 background with notification when volumes are ready (RPT-STMT-08) |
| Audit | Every run, print, export and action audited with params, account count and patient manifest (every member printed) |

### Open questions

| # | Question | Where to confirm |
|---|---|---|
| 1 | Default rule of `Statement Date` (previous day, today, stored date) and the info-icon tooltip | Live tool |
| 2 | Values of the `days.` dropdown; whether "within last n days" counts from the statement date or today | Live tool |
| 3 | PAPER STATEMENT SENT: what it does and what enables it (04 open decision 15) | Live tool, product owner |
| 4 | Real columns, title and totals of the PRINT STATEMENT REPORT list (INFERRED here) | Live tool sample |
| 5 | Meaning of Include Credit Balances, Suppress Aging, Hide Insurance Shares, Hide Credit Card Section (INFERRED from labels) | Live tool sample with each ticked |
| 6 | `Account Balance Over` and `Amount Due`: account total or estimated patient portion | Live tool, one insurance account |
| 7 | Which ageing drives the message (oldest open debit or patient portion); content of `Comments :` | Vendor sample, live tool |
| 8 | Whether "open claim" includes created-not-sent claims and pending pre-authorisations; whether "the Patient" means any member or only the guarantor patient | Live tool |
| 9 | Why the six message boxes were not rendered in our capture; one counter per box or shared | Live tool |
| 10 | FINANCE CHARGES dialog: control types, defaults, formula, whether `Provider` filters or stamps | Live tool |
| 11 | Does the legacy export hold each responsible party's Last Statement Date (cut-over of RPT-STMT-05) | Migration data |
| 12 | Which claim events print (only `Sent`, or also paid / closed) and how an unallocated credit appears in the ageing grid | Vendor sample with a credit account |
| 13 | Contents of the two SEARCH dialogs and of the Exclude Responsible Party Type SELECT dialog; legacy meaning of "allocation issues"; does an account whose patients are all inactive and that has a balance get a statement | Live tool |
| 14 | The per-patient single-statement print path (Print Reports icon > Statement) and its options | Live tool |
| 15 | Meaning of `account_settings.statement_close_out_individual` next to `statement_close_out_all`; 04 §9.7 should declare `role: query` for the six Statements messages (frozen into `patient_statements.message`, part of the run hash), layout kept for the Walkout Report | Product owner, 03 / 04 |

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-STMT-01 | `StatementCriteriaLayout`: two-table criteria form, three footer buttons with legacy labels, criteria actions FINANCE CHARGES / PAPER STATEMENT SENT at their legacy positions, display rows Last Statement Date / Last Close Out Date, six message boxes with counters, red reminder note | P1 | M | UX-28, FLT-14, FLT-28, ENG-05 | The form renders every control of `legacy/index/statements_reports.controls.json` at its legacy place; defaults equal the parity file (FLT-20); `exclude_open_claim_accounts` is absent while the feature is off |
| RPT-STMT-02 | Display sources `office_last_statement_date` and `office_last_close_out_date` in the validate response; tenant setting `legacy_close_out_date` written by the migration | P1 | S | DATA-22, FLT-02 | Validate returns the latest updated run date of the office and the close-out date; both empty on a fresh tenant; switching the working office changes both |
| RPT-STMT-03 | Organisation setting `hold_statements_with_open_claims` and the `ctx.feature.hold_statements_with_open_claims` fact | P1 | S | FLT-05, ENG-06 | Feature off: the parameter is not served and a sent value is forced to `false`; feature on: shown, default `false` |
| RPT-STMT-04 | Account statement lock: write guard on charges, payments, adjustments and refunds with `transaction_date <= accounts.statement_locked_through`, administrator override audited | P1 | M | DATA-22, DATA-14 | A posting dated on or before the lock date fails through every write path with `statement_period_locked`; an override writes an audit row; undo of the stamp lifts the guard |
| RPT-STMT-05 | Migration cut-over for statement history: back-fill `accounts.last_statement_date` from the legacy export when present, else tenant setting `statement_history_start_date` (default migrated-through date) with a `Balance Forward` first line | P1 | S | DATA-22, DATA-10 | First DentC statement of a migrated account itemises only legs after the cut-over date and opens with the balance at that date; Total Due unchanged |
| RPT-STMT-06 | Rights, audit and manifest wiring for the family: commit right, update-dates right, PDF print audit (`record_print` equivalent), patient manifest of every run and action | P1 | S | SEC-04, SEC-09, SEC-22, ENG-14, ENG-61 | View Only runs the list and cannot print statements; each statements run and each action writes audit events with the account count; manifests list every member patient printed |
| RPT-STMT-07 | Retire the synchronous `POST /offices/{office_id}/statements/batch` path for batches: deprecate in OpenAPI, guard it with the statements right and office rule meanwhile | P1 | S | ENG-16, SEC-10 | The route answers 403 without the right and outside the caller's offices; the FE has no caller of it |
| RPT-STMT-08 | Background execution of statement runs: `escalate_when` by estimated account count, job mode for very large batches, notification when volumes are ready | P2 | M | ENG-38, ENG-45, ENG-42 | A 7,800-account office runs as one background run and yields 16 PDF volumes; the inline path is no longer the limit |
| RPT-STMT-09 | Live legacy verification of the Statements screen: Statement Date default rule, `days.` list, PAPER STATEMENT SENT, message boxes and counter, meaning of the four layout checkboxes, Account Balance Over measure, open-claim meaning, Statement Report layout, FINANCE CHARGES dialog | P1 | S | FLT-23 | Every open question of this document is answered or explicitly deferred; decisions file, parity file and document regenerated |
| RPT-STMT-10 | Definition `statements.statement_run`: parameters of the parity file, formats `statement_report` / `statements` with `side_effects`, hidden forced `office_scope`, rights and `action_right_codes`, `legacy_actions[]`, `availability[]`, enhancement parameters `show_excluded_accounts`, `account_ids` | P1 | M | ENG-03, ENG-61, FLT-28, SEC-03, RPT-STMT-03 | Definition lint passes; served JSON carries every parity control; defaults equal the parity file (FLT-20); `statements` format is not schedulable and not cacheable |
| RPT-STMT-11 | Eligibility builder (one shared CTE for both formats and the finance-charge run) and blocks `eligible_accounts`, `excluded_accounts` with the exclusion-reason order | P1 | M | DATA-20, DATA-21, DATA-22, DATA-53, ENG-59 | Fixture office: each criterion and hidden rule drops exactly its fixture account with the right reason; eligible + excluded = accounts homed at the office in the name range |
| RPT-STMT-12 | Statement document builder: balance forward, lines since the last statement with back-dated flag, claim-event lines, prior-period correction line, ageing grid, contract balances (per-patient service in P1), messages by bucket | P1 | L | DATA-06, DATA-20, DATA-21, DATA-22, RPT-STMT-05 | For every fixture account balance forward + Σ lines + correction = `total_due` = account ledger balance as of `statement_date` (R-03 / R-05); grid columns sum to `total_due` |
| RPT-STMT-13 | `commit_builder` of format `statements`: `statement_runs` header and one `patient_statements` row per account (`batch_id` = run id, `statement_scope = account`, totals, ageing, frozen message, lines snapshot) in the terminal transaction | P1 | M | ENG-61, DATA-22 | A retried or re-queued run writes once (unique `(batch_id, account_id)`); a failed run writes nothing; reprint from the snapshot equals the first print |
| RPT-STMT-14 | PDF layout `statement` at legacy parity: header box, window address, payment box and tear line, line table, totals, ageing grid, contract balances, messages; the three layout toggles; volumes | P1 | L | ENG-26, ENG-60, RPT-STMT-12 | Layout checklist against the 2013 / 2025 samples; a 1,200-account run yields 3 volumes with page numbers restarting per statement; toggles remove exactly their area |
| RPT-STMT-15 | Bulk action `update_statement_dates` with balance-changed skip, close-out-all option, ledger marker, lock stamp, today-date second confirmation | P1 | M | ENG-61, RPT-STMT-04, RPT-STMT-13 | Running it twice changes nothing the second time; skipped accounts are listed with `balance_changed`; Ledger Report shows `Statement Sent - $X.XX` on the statement date; Last Statement Date of the office updates |
| RPT-STMT-16 | Action `paper_statement_sent` mapped after the live check (FLT-23); proposal: delivery method `print` on the run's rows | P1 | S | FLT-23, RPT-STMT-13 | The action does what the live tool does; `lists.responsible_party_statements_sent` with `statement_type = paper` lists the run's accounts |
| RPT-STMT-17 | Companion definition `statements.finance_charges` (formats `preview` / `apply`), criteria action from the Statements screen, posting with the finance-charge code | P1 | L | DATA-03, DATA-20, ENG-61, FLT-28, RPT-STMT-11 | Preview total equals the posted total; applying twice for one date posts once; only Full Control can apply; posted lines appear on the next statement run |
| RPT-STMT-18 | Action `undo_statement_dates` (run or accounts), audited, administrator only | P1 | S | RPT-STMT-15, RPT-STMT-04, SEC-08 | After undo the lock is lifted, Last Statement Date returns to the previous value, the rows show `reopened`, an audit event records who and why |
| RPT-STMT-19 | Parity and reconciliation tests of the family: default run, each option, office rule, View Only versus Full Control, statement total versus `total_ar` per account | P1 | S | FLT-20, ENG-17, DATA-09, SEC-14 | All tests green on `golden_small`; a View Only caller gets 403 on format `statements` |
| RPT-STMT-20 | XLSX and CSV exports of both formats (`eligible_accounts`, `excluded_accounts`, `statements`, `statement_lines`) | P1 | S | ENG-27, ENG-15 | Typed cells, no merged cells, criteria sheet; CSV formula guard on names |
| RPT-STMT-21 | `statement_layout = service_style` with `include_full_fee` (running balance, Ins Exp, Pat Por, Full Fee) | P2 | M | RPT-STMT-14 | Running balance of the last line equals Total Due; Full Fee equals `office_fee` of each charge |
| RPT-STMT-22 | Contract balances from `rpt_contract_installments` instead of the per-patient service | P2 | S | DATA-37, RPT-STMT-12 | `Reg Cont. Bal.` / `Ort Cont. Bal.` equal the service values on fixtures; no per-patient call remains in the run |
| RPT-STMT-23 | Bulk action `email_statements` and `delivery_filter` through the correspondence handler (login-gated link, no attachment) | P3 | M | ENG-49, ENG-44, RPT-STMT-13 | Only accounts with an e-mail and `no_email_statement = false` receive a link; `delivery_state = emailed`; a failed send stores `delivery_error` |

<!-- ASSEMBLED from catalog/parts/statements_reports/ (00_header.md, 10_reports.md). Edit this document directly from now on. -->
