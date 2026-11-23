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
| `Suppress Aging` | No ageing grid; `Total Due` stays |
| `Hide Insurance Shares` | No `Estimated Insurance` / `Estimated Patient` rows |
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

<!-- PARITY:statements_reports.r01 -->

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
| `Sort by Resp.Party ID` | Ordered by account number (`account_no`, the legacy RP id on migrated accounts) |
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
`report_format = statement_report`; UPDATE STATEMENT DATES and PAPER STATEMENT SENT are enabled only on a succeeded run with
`report_format = statements` whose dates were not yet updated.

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
`patient_statements.run_id` / `delivery_error` (DATA-22, P1). Further: Exclude Responsible Party Type SCHEMA(53) (DATA-53, P1);
balance split and ageing DATA-20 (P1); claim facts DATA-21 (P1); contract balances DATA-37 (P2; per-patient service before);
open-claim exclusion READY; the finance-charge run is a posting engine, not a dataset.

| Dataset | Columns used |
|---|---|
| `rpt_account_dim` | `account_id`, `account_no`, `home_office_id`, `guarantor_last_name`, `guarantor_first_name`, address, phones, `resp_party_type`, `send_statements`, `no_email_statement`, `send_collections`, `is_finance_charge`, `statement_message`, `member_count`, `is_active`, `merged_into_account_id`, `last_statement_date` |
| `rpt_ar_open_items(p_tenant_id, p_account_ids, p_as_of = statement_date, p_unit = 'account')` | `account_id`, `patient_id`, `item_kind`, `entry_id`, `age_date`, `age_days`, `open_amount`, `open_insurance_est`, `open_patient`, `split_quality`, `is_derived` |
| `rpt_ledger_entries` | `entry_id`, `entry_type`, `code`, `code_kind`, `tender_class`, `payer`, `carrier_id`, `amount`, `debit`, `credit`, `transaction_date`, `created_at_utc`, `patient_id`, `account_id`, `procedure_id`, `claim_id`, `is_sign_anomaly` (lines; tooth and surface through `rpt_charges` by `procedure_id`) |
| `rpt_claim_facts` | `claim_id`, `patient_id`, `account_id`, `tier`, `status_class`, `outstanding_quality`, `submitted_date`, `billed_amount` |
| `rpt_patient_dim` | `patient_id`, chart number, last / first name of each member |
| `rpt_contract_installments` (P2) | `patient_id`, `contract_kind`, `periodic_amount`, `is_billed` |
| `patient_statements` (passthrough) | `account_id`, `statement_date`, `closing_balance`, `delivery_status`, `delivery_method`, `run_id` |

| Parameter | Becomes |
|---|---|
| `office_scope` (forced) | `rpt_account_dim.home_office_id = :office_id`; balances and lines are NOT office-filtered (consolidated account) |
| `statement_date` | `p_as_of` of `rpt_ar_open_items`; `transaction_date <= :statement_date` on lines; value written by commit and update |
| `responsible_party_name_from` / `_to` | Range on `upper(guarantor_last_name || ', ' || guarantor_first_name)` |
| `account_balance_over` | `total_due > :value`, `total_due = Σ open_amount` per account |
| `include_credit_balances` | `OR total_due < 0` added to the balance predicate |
| `sort_by` | ORDER BY `guarantor_last_name, guarantor_first_name, account_no` or `account_no`; tie-breaker `account_id` |
| `exclude_statement_sent_within` + `_days` | `NOT EXISTS patient_statements s WHERE s.account_id = a.account_id AND s.delivery_status = 'sent' AND s.statement_date > :statement_date - :days AND s.statement_date <= :statement_date` (days = 0: `s.statement_date = :statement_date`) |
| `exclude_insurance_expected_accounts` | Drop when `Σ open_patient <= 0 AND Σ open_insurance_est > 0` |
| `exclude_sent_to_collection` | `send_collections IS NOT TRUE` |
| `exclude_open_claim_accounts` | `NOT EXISTS rpt_claim_facts c WHERE c.account_id = a.account_id AND c.status_class IN ('unsent','sent','partially_paid') AND c.outstanding_quality <> 'unknown'` |
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

### Output

Format `statement_report` (legacy PRINT STATEMENT REPORT), block `eligible_accounts` (main):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `account_no` | Resp. Party ID | text | phi_identified | label `Total` |
| `responsible_party_name` | Responsible Party | text | phi_identified | count, label `Accounts: {n}` |
| `resp_party_type` | Type | text | phi_identified | none |
| `member_count` | Patients | integer | phi_identified | sum |
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
| `reg_contract_balance` | Reg Cont. Bal. | money | financial_patient | sum |
| `ortho_contract_balance` | Ort Cont. Bal. | money | financial_patient | sum |
| `message_bucket` | Message | enum (`current`, `over_30` ... `over_120`) | phi_identified | none (default_visible false) |
| `has_mailing_address` | Address | boolean | phi_identified | count true (default_visible false) |
| `account_id`, `guarantor_patient_id` | - | id, hidden | phi_identified | - |

Block `excluded_accounts` (placement `report_end`, visible_when `show_excluded_accounts`): `account_no`, `responsible_party_name`,
`total_due`, `exclusion_reason` (enum: `below_threshold`, `credit_balance`, `sent_within_days`, `insurance_expected`,
`sent_to_collection`, `open_claim`, `resp_party_type_excluded`, `send_statements_off`, `account_inactive`, `allocation_issue`;
first matching reason in this order), count total.

Format `statements` (legacy PRINT STATEMENTS), `side_effects = writes`, PDF layout `statement`, `record_per_page`:

| Block | Shape / placement | Columns (type, class) | Totals |
|---|---|---|---|
| `statement_documents` | table, main (screen: one row per document) | `account_no`, `responsible_party_name`, `statement_date` (date), `last_statement_date`, `line_count` (integer), `total_credits`, `total_charges`, `total_due`, `est_insurance`, `est_patient` (money, financial_patient), `message_bucket`, `delivery_state` (enum `generated`, `sent`, `paper_sent`, `emailed`; phi_identified) | count; sums of money |
| `statement_lines` | table, grouped by account (group level `account`, page break per account forced, document per group) | `line_date` (Date), `description` (Description), `chart_no` (Chart #), `patient_name` (Patient Name), `procedure_code` (Code), `tooth` (Th), `surface` (Surf) - text/date, phi_identified; `credits` (Credits), `charges` (Charges) - money, financial_patient; hidden `entry_id`, `line_kind` (`balance_forward`, `charge`, `payment`, `adjustment`, `claim_event`, `prior_period_correction`) | per account: `Total :` sum of credits and charges; `Total Due as of {statement_date} :` = `total_due` |
| `aging_grid` | matrix, `after_group` | rows `Estimated Insurance`, `Estimated Patient`; columns `Current`, `Over30`, `Over60`, `Over90`, `Over120`, `Total Balance` (money, financial_patient); an unallocated credit in the `Current` cell of Estimated Patient [I] | row totals; column total = `total_due` |
| `contract_balances` | key_value, `after_group` | `Reg Cont. Bal.`, `Ort Cont. Bal.` | - |
| `messages` | key_value, `after_group` | `Messages :` general + bucket message; `Comments :` `rpt_account_dim.statement_message` [I] | - |

Line order: `balance_forward` first, then `line_date`, then charges before credits, then `entry_id`. Description rules: charge =
procedure description; payment = code or tender description plus carrier name for insurance (`Ins Chk <carrier>`); claim event =
`<Prim|Sec|Ter> Claim - Sent (<billed_amount>)` dated `submitted_date`, no money; back-dated line suffixed `*`.

Grouping and sort: no `group_by` (fixed outer level `account` on the documents); sort per `sort_by`; page break per document
(fixed). Summary cards (`statement_report`): Accounts (count of `eligible_accounts`), Balance (Σ `total_due`), Est. Pat., Est.
Ins., Excluded (count of `excluded_accounts`). `reconciles_with`: per account `total_due` = metric `total_ar` for that account
(one-account variant, P1) - a test, not a query. `empty_when`: `no_detail_rows` on the main block.

### Visuals and drill-through

Chart: none - a list. With `show_excluded_accounts`: bar chart hint `excluded_by_reason` (count per `exclusion_reason`).

| Click | Target |
|---|---|
| A row of `eligible_accounts` / `statement_documents` | `kind = report`: `ledger.ledger_report` with `account_id` ← column `account_id`, `report_type` ← literal `account_ledger`, date range from `last_statement_date` to `statement_date` (keys as `catalog/ledger_reports.md` defines them) |
| Responsible party name | `kind = record`: guarantor account screen (route `patient_ledger` of the guarantor patient, `right_code` = ledger feature right of 08), to correct address or `Send Statements` |
| An ageing cell | `monthly.aging_report_by_home_office` (P2) with `responsible_party_name_from` / `_to` ← the row's name, `report_date` ← `statement_date`, `aging_buckets` ← the clicked bucket |
| `exclusion_reason = open_claim` | `insurance.outstanding_claims` (P2) filtered to the account's patients |
| A `statement_documents` row | `kind = record`: the frozen statement PDF of that account (`patient_statements` id from the snapshot) |
| After the update: header link | `lists.responsible_party_statements_sent` with `statement_date` ← run `statement_date` |

### Actions

| Action key | Scope | Kind | Right | Rule |
|---|---|---|---|---|
| `open_ledger` | row | navigate | ledger feature right | Account ledger of the guarantor |
| `create_task` | row / bulk | create_task | task feature | "Billing follow-up" task per account |
| `send_balance_reminder` | row / bulk | send_sms | SMS feature; `requires: sms_consent` | Excluded count shown before send (P3 handler) |
| `print_statements_for_selection` | bulk (on `statement_report`) | custom: new run of format `statements` with `account_ids` = selection and the same params | Full Control | Confirmation with the account count |
| `export_selection` | bulk | export_selection | `reports_export_data_files` | - |
| `letters` | bulk | letters | letters feature (PD-15) | Collection letters for the selection |
| `update_statement_dates` | bulk, `legacy_action` UPDATE STATEMENT DATES | custom | `reports_statement_allow_updating_statement_dates` | Only on a succeeded `statements` run; selection `all` or rows; per account: skip with `balance_changed` when the current balance ≠ snapshot; set `last_statement_date`, `statement_locked_through`, `patient_statements.delivery_status = 'sent'` (prints as the `Statement Sent - $X.XX` ledger line), `statement_runs.dates_updated_at / _by`; with `account_settings.statement_close_out_all` also stamps the office's zero and credit accounts not in the run; idempotent per `(run_id, action_key, account_id)` |
| `paper_statement_sent` | bulk, `legacy_action` PAPER STATEMENT SENT | custom (proposal) | Full Control | unknown_legacy; proposal until FLT-23: sets `delivery_method = 'print'` on the run's rows, which feeds `lists.responsible_party_statements_sent` with `statement_type = paper` |
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
| 8 | Whether "open claim" includes created-not-sent claims | Live tool |
| 9 | Why the six message boxes were not rendered in our capture; one counter per box or shared | Live tool |
| 10 | FINANCE CHARGES dialog: control types, defaults, formula, whether `Provider` filters or stamps | Live tool |
| 11 | Does the legacy export hold each responsible party's Last Statement Date (cut-over of RPT-STMT-05) | Migration data |
| 12 | Which claim events print (only `Sent`, or also paid / closed) and how an unallocated credit appears in the ageing grid | Vendor sample with a credit account |

<!-- WORK-ITEMS -->
| RPT-STMT-10 | Definition `statements.statement_run`: parameters of the parity file, formats `statement_report` / `statements` with `side_effects`, hidden forced `office_scope`, rights and `action_right_codes`, `legacy_actions[]`, `availability[]`, enhancement parameters `show_excluded_accounts`, `account_ids` | P1 | M | ENG-03, ENG-61, FLT-28, SEC-03, RPT-STMT-03 | Definition lint passes; served JSON carries every parity control; defaults equal the parity file (FLT-20); `statements` format is not schedulable and not cacheable |
| RPT-STMT-11 | Eligibility builder (one shared CTE for both formats and the finance-charge run) and blocks `eligible_accounts`, `excluded_accounts` with the exclusion-reason order | P1 | M | DATA-20, DATA-21, DATA-22, DATA-53, ENG-59 | Fixture office: each criterion and hidden rule drops exactly its fixture account with the right reason; eligible + excluded = accounts homed at the office in the name range |
| RPT-STMT-12 | Statement document builder: balance forward, lines since the last statement with back-dated flag, claim-event lines, prior-period correction line, ageing grid, contract balances (per-patient service in P1), messages by bucket | P1 | L | DATA-06, DATA-20, DATA-21, DATA-22, RPT-STMT-05 | For every fixture account balance forward + Σ lines + correction = `total_due` = account ledger balance as of `statement_date` (R-03 / R-05); grid columns sum to `total_due` |
| RPT-STMT-13 | `commit_builder` of format `statements`: `statement_runs` header and one `patient_statements` row per account (`run_id`, `statement_scope = account`, totals, ageing, frozen message, lines snapshot) in the terminal transaction | P1 | M | ENG-61, DATA-22 | A retried or re-queued run writes once (unique `(run_id, account_id)`); a failed run writes nothing; reprint from the snapshot equals the first print |
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
<!-- /WORK-ITEMS -->
