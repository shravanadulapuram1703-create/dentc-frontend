# Statements - report specifications

The billing-statement cycle of the legacy `Reports > Statements` screen: review the accounts that qualify, print one consolidated statement per responsible party, then stamp and lock the statement period; finance charges are applied from the same screen.
New home: **Financial › Statements** at `/reports/c/statements` (brief section 1; 07 section 4.10), the generic runner with the one registered per-report criteria layout `StatementCriteriaLayout`. Default phase **P1**.

## Overview

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `statements.statement_run` | Statements | Monthly batch of responsible-party statements for one office: eligibility list (PRINT STATEMENT REPORT), statement documents written as frozen `patient_statements` rows (PRINT STATEMENTS), then UPDATE STATEMENT DATES (stamp + lock); FINANCE CHARGES opens the companion run `statements.finance_charges` | P1 | XL | SCHEMA(22) (run header, account statement dates and lock); Exclude Responsible Party Type: SCHEMA(53); open-claim exclusion READY; contract balances read from the per-patient service until `rpt_contract_installments` (DATA-37, P2) | DOCUMENTED (screen, workflow, printed statement); PARTIALLY DOCUMENTED (the PRINT STATEMENT REPORT list: layout INFERRED) |

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
| `responsible_party_name` = `responsible_party_name_from`, `responsible_party_name_to` | `text_range` | `AAAAA` / `ZZZZZ` | Inclusive range on `upper(guarantor_last_name || ', ' || guarantor_first_name)`; also the way an office splits a large batch into several runs |
| `exclude_resp_party_type_codes` | `entity_multi` | `none` | Exclude; rows without a type kept; SCHEMA(53) |
| `provider_ids` | `entity_multi` | not documented (finance-charge dialog only) | Provider credited on the posted finance-charge line; `statements.finance_charges` only |

**Datasets.** `rpt_account_dim` (population, address, flags, statement dates), `rpt_ar_open_items()` with `p_unit = 'account'`
(balance, ageing buckets, `open_insurance_est` / `open_patient`), `rpt_ledger_entries` (itemised lines), `rpt_claim_facts`
(open-claim exclusion, claim-event lines), `rpt_patient_dim` (member names, chart numbers), `rpt_contract_installments`
(`Reg Cont. Bal.` / `Ort Cont. Bal.`; P2, per-patient service before), passthrough `patient_statements` (previous statements,
"sent within n days", last statement balance), `office_statement_settings` (messages, logo, statement address and phone, through
`print_service.resolve_letterhead`), `office_advanced_settings` (finance-charge settings). Freshness `live`.

**Date bases.**

| Figure | Basis |
|---|---|
| Balances, ageing grid, Total Due, eligibility thresholds | as of `statement_date` (end of the office-local day of the run's office) |
| Itemised lines | `transaction_date` in (`accounts.last_statement_date`, `statement_date`]; plus app-era legs with `transaction_date <= last_statement_date` and `created_at_utc` after the previous run of the account (back-dated entries), flagged `*` "posted after the last statement" |
| Ageing buckets | `age_date` of `rpt_ar_open_items` (ageing starts when the procedure is completed), bucket set `legacy` (0-29 / 30-59 / 60-89 / 90-119 / 120+; 03 §2.14 fixes the vendor's one-day ambiguity) |
| "Sent within n days" | `patient_statements.statement_date` compared with `statement_date` (inferred) |
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
| Account inactive or merged | inferred | `is_active = false` or `merged_into_account_id IS NOT NULL` | `account_inactive` |
| Allocation issue | "the account has allocation issues" `[D]` | Σ `open_amount` of the account ≠ ledger balance (R-05 fails for the account) or an `is_sign_anomaly` leg | `allocation_issue` |
| Balance changed after the pull | `[D]` | Applied by UPDATE STATEMENT DATES: the account's current balance as of `statement_date` ≠ snapshot `total_due` | `balance_changed` (action result, not a list row) |

**Page furniture.** `statement_report`: legacy furniture (research §2.2): organisation name, title `Statement Report` (INFERRED title),
`Office : <office name>`; footer criteria echo (`Statement Date`, `Responsible Party Range`, `Account Balance Over`, each ticked
exclusion as `* Excludes ...`, `* Includes accounts with Credit Balances.`), report title, `Printed : <office-local date time>`,
`Page : n of m`. `statements`: no criteria echo on documents sent to patients; page numbers restart per statement
(`SectionedNumberedCanvas`, 02 §7.2); the criteria are kept on the run and in the audit record.

**Rights and data classes** (08 §2.3; security card).

| Capability | Right |
|---|---|
| Run `statement_report`, view | `reports_statements_screen_view_only` (family `statements`) |
| Run `statements` (writes), print and export, PAPER STATEMENT SENT, `statements.finance_charges` format `apply` | `reports_statements_screen_full_control` (`action_right_codes.commit`) |
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

<!-- WORK-ITEMS -->
| RPT-STMT-01 | `StatementCriteriaLayout`: two-table criteria form, three footer buttons with legacy labels, criteria actions FINANCE CHARGES / PAPER STATEMENT SENT at their legacy positions, display rows Last Statement Date / Last Close Out Date, six message boxes with counters, red reminder note | P1 | M | UX-28, FLT-14, FLT-28, ENG-05 | The form renders every control of `legacy/index/statements_reports.controls.json` at its legacy place; defaults equal the parity file (FLT-20); `exclude_open_claim_accounts` is absent while the feature is off |
| RPT-STMT-02 | Display sources `office_last_statement_date` and `office_last_close_out_date` in the validate response; tenant setting `legacy_close_out_date` written by the migration | P1 | S | DATA-22, FLT-02 | Validate returns the latest updated run date of the office and the close-out date; both empty on a fresh tenant; switching the working office changes both |
| RPT-STMT-03 | Organisation setting `hold_statements_with_open_claims` and the `ctx.feature.hold_statements_with_open_claims` fact | P1 | S | FLT-05, ENG-06 | Feature off: the parameter is not served and a sent value is forced to `false`; feature on: shown, default `false` |
| RPT-STMT-04 | Account statement lock: write guard on charges, payments, adjustments and refunds with `transaction_date <= accounts.statement_locked_through`, administrator override audited | P1 | M | DATA-22, DATA-14 | A posting dated on or before the lock date fails through every write path with `statement_period_locked`; an override writes an audit row; undo of the stamp lifts the guard |
| RPT-STMT-05 | Migration cut-over for statement history: back-fill `accounts.last_statement_date` from the legacy export when present, else tenant setting `statement_history_start_date` (default migrated-through date) with a `Balance Forward` first line | P1 | S | DATA-22, DATA-10 | First DentC statement of a migrated account itemises only legs after the cut-over date and opens with the balance at that date; Total Due unchanged |
| RPT-STMT-06 | Rights, audit and manifest wiring for the family: commit right, update-dates right, PDF print audit (`record_print` equivalent), patient manifest of every run and action | P1 | S | SEC-04, SEC-09, SEC-22, ENG-14, ENG-61 | View Only runs the list and cannot print statements; each statements run and each action writes audit events with the account count; manifests list every member patient printed |
| RPT-STMT-07 | Retire the synchronous `POST /offices/{office_id}/statements/batch` path for batches: deprecate in OpenAPI, guard it with the statements right and office rule meanwhile | P1 | S | ENG-16, SEC-10 | The route answers 403 without the right and outside the caller's offices; the FE has no caller of it |
| RPT-STMT-08 | Background execution of statement runs: `escalate_when` by estimated account count, job mode for very large batches, notification when volumes are ready | P2 | M | ENG-38, ENG-45, ENG-42 | A 7,800-account office runs as one background run and yields 16 PDF volumes; the inline path is no longer the limit |
| RPT-STMT-09 | Live legacy verification of the Statements screen: Statement Date default rule, `days.` list, PAPER STATEMENT SENT, message boxes and counter, meaning of the four layout checkboxes, Account Balance Over measure, open-claim meaning, Statement Report layout, FINANCE CHARGES dialog | P1 | S | FLT-23 | Every open question of this document is answered or explicitly deferred; decisions file, parity file and document regenerated |
<!-- /WORK-ITEMS -->
