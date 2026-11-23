# Ledger Reports - report specifications

Per-account and per-patient financial documents printed at the front desk: the account or patient ledger, the check-out receipt (Walkout), the self-filing super bill and the payment-allocation trail of one account. They are documents about one responsible party or one patient, not practice roll-ups.
New home: hub group **Financial › Ledger** at `/reports/c/ledger` (brief section 1, 07 section 1), plus the patient Print launcher (07 section 1.7, UX-29). Default phase **P1** for all four reports.

## Overview

Legacy order of the SELECT REPORT list (control index `legacy/index/ledger_reports.controls.json`): r01 Ledger Report, r02 Walkout Report, r03 Super Bill, r04 Account Allocation.

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `ledger.ledger_report` | Ledger Report | Ledger lines of one guarantor account (Account Ledger) or one patient (Patient Ledger) for a transaction-date range, with running balance | P1 | M | READY ("Print all transactions": statement lines APP from `patient_statements`; ledger notes from `account_notes`, migrated rows exist; `Bill` depth on migrated charges REPAIR(12), derived on app charges until DATA-33; note / EOB indicators NEW, blank for migrated rows) | PARTIALLY DOCUMENTED (line content documented, printed layout INFERRED) |
| `ledger.walkout_report` | Walkout Report | Check-out receipt "Statement of Services Rendered": the day's activity, account balance and ageing, messages, next appointment, one per responsible party | P1 | L | READY (contract balances: APP; read from the stored payment-plan values until DATA-37, P2, with a warning) | DOCUMENTED (2022 and 2023 vendor samples) |
| `ledger.super_bill` | Super Bill | Itemised services, payments and adjustments of one patient by date of service, with the office billing identity, for a self-filed claim or a tax receipt | P1 | M | READY | PARTIALLY DOCUMENTED (definition and options documented, printed layout INFERRED) |
| `ledger.account_allocation` | Account Allocation | Where each payment and credit adjustment of one account went: allocation lines to charges plus the unallocated remainder | P1 | M | READY (derived account-wide oldest-first for history and for app payments without a split until DATA-26, P2; the legacy rule, patient then provider, is not reproduced until then) | INFERRED |

## Shared rules

**Family identity.** Four definitions, category `ledger`, `kind = standard`, `schedulable: false` (per-record documents whose
person parameter defaults to a patient-context token, 04 section 2.3), `paging_mode = snapshot`, `side_effects = none`
(the patient note of `add_patient_note` is written after rendering, not by the run: RPT-LEDGER-04), `cacheable = false`
(one-person documents; the cache would only hold PHI). `legacy_names[]` carry the legacy spellings: `Ledger Report`,
`Patient Ledger`, `Account Ledger`; `Walkout Report`, `Walkout`, `Walk-out Receipt`; `Super Bill`, `Superbill`,
`Super Bill Report`; `Account Allocation`.

**Shared parameters and defaults** (legacy defaults kept; the generated parity tables are authoritative).

| Parameter (value keys) | Type | Reports | Default | Rule |
|---|---|---|---|---|
| `office_scope` (`office_ids`, `office_group_id`, `office_group_ids`, `all_offices`) | `office_scope` | all four | `working_office` (legacy `108`) | Locked: `validation.allowed_modes: [office]` (Office Group option greyed), `forced_when: [{"when": true, "value": {"office_ids": {"token": "working_office"}}}]` (04 9.3 rows 33-36, 9.4, 9.5). The picker is shown read-only with the office name. What the office does differs per report (table below) |
| `date_range` (`date_from`, `date_to`, `date_preset`) | `date_range` | all four | `today` / `today`, office-local | Inclusive both ends. Fixed basis per report (table below), no `date_basis` parameter. Presets and relative tokens are the only date enhancement (filter card 12) |
| `account_id` | `entity_single` | Ledger Report (`account_ledger`), Account Allocation; Walkout Report (hidden) | `current_account`; Walkout `null` | One guarantor account (`accounts.id`); typeahead plus search dialog replace the SEARCH button (superseded). Needs `phi_identified` to set (08 5.2 rule 8). On the Walkout it is hidden and set only by the patient-context and Scheduler entries: when set it replaces the name range as the population (one account) |
| `patient_id` | `entity_single` | Ledger Report (`patient_ledger`); Super Bill (hidden) | `current_patient`; Super Bill `null` | Vendor-documented parameter of 04 9.7 without a captured control; visible and required when `report_type == patient_ledger`. On the Super Bill it is hidden and set only by the patient-context entry: when set it replaces the name range as the population (one patient) |
| `responsible_party_name` (`responsible_party_name_from`, `_to`) | `text_range` | Walkout Report | `current_responsible_party_name` both sides | Prefix rule and open bounds `AAAAA` / `ZZZZZ` of 04 3.4 |
| `patient_name` (`patient_name_from`, `_to`) | `text_range` | Super Bill | `current_patient_name` both sides | As above, on the patient sort name |
| `add_patient_note` | `boolean`, role `output` | Ledger Report, Walkout Report | `false` | Print-menu dialog option of the legacy tool; on the new hub form too (additive) |
| `output_format` | `enum` `pdf` / `xlsx` / `csv`, role `output` | all four (enhancement: no legacy PRINT FORMAT section; the legacy viewer exported to Excel and Word) | `pdf` | Never changes the rows; the screen result is always shown first |

Without a patient in context (`context.patient_id` absent) the `current_*` tokens resolve to empty and the required person
parameter answers 422 `parameter_required` (04 2.3); the form then opens with the person box empty and focused.

**Office, date and person per report** (attribution vocabulary of data card section 5; facts marked [I] are open questions).

| Report | What `office_ids` does | Date basis of `date_range` | Population (one document per) | Balance scope |
|---|---|---|---|---|
| Ledger Report | Printing office only (letterhead, `Office :` band); lines of every office of the account print with their own Office column [I] | `transaction_date` (04 7.2 row 19, documented) | the account (`account_ledger`) or the patient (`patient_ledger`) | running balance of the account or of the patient, all offices |
| Walkout Report | Printing office (logo, address, `Office # :`) and activity-line filter on the transaction office `rpt_ledger_entries.office_id` [I] | `transaction_date` (row 20, inferred) | each account in the responsible-party name range with at least one activity line | Previous Balance, Total Balance and ageing: whole account, all offices |
| Super Bill | Billing identity (office address, `billing_provider_id`) and line filter: office of service for services, transaction office for credits [I] | `service_date` (row 21, documented: "DOS Date Range"), bound to `service_date_effective` | each patient in the patient name range with at least one printed line | Previous Balance line (option): the patient, same basis (`service_date_effective`) and office rule as the lines [I, S-6] |
| Account Allocation | Printing office only; allocation unit is the account across offices (`p_unit = account`) [I] | `created_date` of the credit (row 22, inferred) with the transaction-date fallback for unreliable migrated stamps | the account | credits of the account and their allocations |

**Datasets.** `rpt_ledger_entries` (live; `rpt_ledger_entries_all` only for the voided-lines enhancement), `rpt_charges`
(tooth, surface, `apply_to`, `bill_tier`, `duration_minutes`), `rpt_patient_dim`, `rpt_account_dim`, `rpt_office_dim`,
`rpt_provider_dim`, `rpt_user_dim`, `rpt_procedure_code_dim`, `rpt_transaction_code_dim`, `rpt_claim_facts`,
`rpt_ar_open_items()` and `rpt_fifo_allocations()` (always called with `p_account_ids` = the accounts of the run, so the
call is index-driven, ENG-59), `rpt_appointment_facts`, `rpt_insurance_coverage`, `rpt_contract_installments` (P2) and the
passthroughs `patient_statements`, `account_notes` (DATA-52). The account is always the patient's **current** account
(`account_id`, data card 5.3); `posted_account_id` is never used by this family.

**Sign conventions** (data card 3.1, 2.12). `amount` is the signed A/R effect: charges and debit adjustments positive,
payments and credit adjustments negative. Two-column layouts (Walkout, Super Bill) print `Charges` = `debit` and
`Credits` = `credit` as positive numbers; single-column layouts (Ledger Report, Account Allocation) print the signed
`amount` with a leading minus, no currency symbol, two decimals, `ROUND_HALF_UP` - the legacy convention of these
reports ([R] research section 2.2). A running balance is `sum(amount)` in line order; a negative balance is a credit and
prints with a minus.

**Line order.** Ledger lines sort by `transaction_date`, then `entry_type` order charge, claim, payment, adjustment,
non-financial row, then `entry_id` (the declared `row_id_column`); the order is deterministic so a running balance never
changes between screen and PDF.

**Page furniture** (research 2.2, kept; renderer ENG-23 / ENG-25). Header: organisation name, office letterhead
(`print_service.resolve_letterhead`: name, address, phone, fax, logo; logo suppressed on Super Bill - legacy quirk kept),
printed title from `title_templates[]`, the person block (responsible party or patient, address, `Account # :`
`rpt_account_dim.account_no`). Footer (`criteria_echo = footer`): `From` / `Thru`, `Office :`, `Responsible Party :` or
`Patient :` (or the name range), the ticked options with a star (`* Print all transactions.`, `* Show charges break down.`,
`* Include UCR.`, `* Include Previous Balance.`), every `availability[]` warning of the run, `Printed : <office-local date
time>`, `By : <user label>`, `Page : n of m` (numbering restarts per document on the per-record layouts:
`sectioned_page_numbers`). The legacy copyright line is replaced by the organisation name and the DentC product line.

**Rights and data classes.** Right family `ledger`: `reports_ledger_reports_screen_view_only` (run, view, drill, save views) /
`reports_ledger_reports_screen_full_control` (also print and PDF; XLSX and CSV also need `reports_export_data_files`;
08 2.1, 2.2, PD-10); no per-report override (08 2.3). Data classes (08 5.1-5.2): person name, chart number, address, date
of service, code, tooth, surface, appointment date: `phi_identified` (the person name and the account / patient id are key
columns: without the class the run is refused, rule 5); every money cell (amount, balance, estimate, ageing bucket,
contract balance) `financial_patient` (rule 2, all rows carry an account key); check number and other payment references
`payment_instrument`; ledger-note and statement-note text `phi_identified` (rule 4, non-clinical free text); provider and
user labels on a line `aggregate` (operational attributes, rule 12); the one provider-grouped money output of the family,
the optional provider chart of Account Allocation, is `provider_comp` (rule 3) and is removed for callers without it;
subscriber and member ids on the Super Bill `phi_sensitive`. A caller without `financial_patient` receives the documents
without amounts (rule 5 default, kept until F-4 is decided; money columns are never key columns). If refusal is decided,
it needs a NEW definition-level field `required_data_classes[]` (owner 02_architecture.md section 3.1 and
08_security_compliance.md section 5.2); no `key` flag is put on a money column. A caller without `payment_instrument`
(the holders of `report_data_payment_instrument` exclude the front-desk group, 08_security_compliance.md) receives the Walkout and Account Allocation without `Check #` (F-8). Every run, print and export writes the patient manifest (ENG-14, SEC-09); the existing
`record_print` PRINT audit row is no longer needed for these documents.

**Patient-context entry** (dynamic rules d01 of r01-r03). The patient Print launcher (07 1.7) lists `Walkout Report`,
`Superbill`, `Patient Ledger`, `Account Ledger` (legacy print-menu order) and opens the compact print dialog of the
runner on the same definition: the person parameter is resolved from `context.patient_id` and not editable (Walkout:
hidden `account_id = current_account`; Super Bill: hidden `patient_id = current_patient`, so the population is the
account or patient in context and never a name-prefix match; the name boxes are display only), the date
range and the dialog-only options (`add_patient_note`, the six walkout messages, `include_previous_balance`) are shown.
The hub form shows the dialog-only options too (additive, defaults reproduce the legacy run). A favorite stores the
token, never the patient: it follows the patient in context (04 2.3).

**Family-wide enhancements** (additive; untouched defaults reproduce the legacy run).

| Enhancement | Parameter / feature | Detail |
|---|---|---|
| Date presets for patient questions | `date_preset` (`today`, `year_to_date`, `previous_year`, `last_12_months`) | "How much did I pay last year" (vendor use case of the Ledger Report) and the HSA / FSA receipt on Super Bill become one click; a saved view keeps the relative preset |
| Patient Print launcher | UX-29, RPT-LEDGER-03 | One menu for the four documents from the patient shell and the Scheduler appointment menu, with the patient pre-resolved |
| Drill to the record | `drill_targets[]` kind `record` | Every line opens its source: charge or payment in `/patient/:patientId/ledger` or `/account-ledger`, a claim line in `/patient/:patientId/claim/:claimId` (route keys of 07 section 5, right `transactions_patient_ledger_screen_full_control` or the claim right) |
| Reprint of the same document | run snapshot (AD-5) and run history | A walkout or super bill reprinted next week shows the rows of the original run, not a recomputation; "Run again for today" is a separate button. Reprints are audited as prints of the stored artifact |
| CSV / XLSX of the line table | `output_format` | One flat table per document type, typed money cells, no merged title cells |

**Family-wide open questions.**

| # | Question | Check on the live legacy tool / decision owner |
|---|---|---|
| F-1 | Are the person boxes pre-filled from the patient in context by design, and what do they show when no patient is open (empty, or the last patient)? | Live tool (04 11.5 "Pre-fill of name ranges") |
| F-2 | Contents of the RESPONSIBLE PARTY and PATIENT SEARCH dialogs (search fields, inactive accounts, merged accounts) | Live tool |
| F-3 | Does any ledger report print lines of offices other than the working office (the office lock is shown on all four screens)? | Live tool: account with a charge at office A and a payment at office B |
| F-4 | Deliver the documents without amounts to a caller without `financial_patient` (08 rule 5 default, current design) or refuse the run (needs the NEW `required_data_classes[]` field of 02 section 3.1)? | 08_security_compliance.md owner |
| F-5 | Are voided transactions printed (struck through, as on the ledger screen) or omitted? | Live tool (research: `[unverified]`) |
| F-6 | Billing provider tax id on the Super Bill is class `security_users` under the provider-registration rule of 08 2.3; a front-desk role would lose it | 08_security_compliance.md owner (exemption for the billing identity on claim documents) |
| F-7 | A name-range run with the same name in both boxes: does the legacy tool print every account / patient whose sort name equals or starts with that name (several families), or only the one in context? | Live tool: two accounts with the same guarantor name |
| F-8 | `Check #` is a legacy column of the Walkout, but `payment_instrument` is not held by the front-desk group, the main user at check-out: grant the class with the `ledger` family, or exempt the check number on one-account documents? Until decided, `Check #` is dropped for callers without the class | 08_security_compliance.md owner |

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
| Line content | `Date` (date of service for procedures, claim created date for claims, entry date for payments / adjustments), `Patient`, `Office`, `A` (`P` patient / `R` responsible party), `Code` (procedure code, `CLM-P` / `CLM-S`, payment / adjustment code), `TH`, `Surf`, `Type` (`P` production / `C` collection), note and EOB indicators, `Description`, `Bill` (`D`..`DDDD`, `M` / `MM`), `Duration`, `Provider`, `Est Pat`, `Est Ins`, `Amount`, `Balance`, `User` [D] | The same columns in the same order; the note and EOB indicators are the columns `has_note` / `has_eob` (Output; NEW sources, blank for migrated rows) |
| Sort | the account ledger can be sorted by transaction date or date of service [D] | `sort_by` enhancement, default transaction date (legacy print order not documented) |
| Opening | not documented whether the print starts with a previous-balance line [I] | `Previous Balance` printed above the first line (L-5) |
| Closing | closing balance and an ageing / estimated-insurance / estimated-patient summary as on the Walkout [I] | Summary block `Balance Summary` at report end (proposal, marked [I] in the definition description) |
| `Print all transactions (includes statements, ledger notes)` | adds the non-financial rows - `Statement Sent - $X.XX`, ledger notes, probably claim lines - otherwise omitted [I] | Adds statement, note and claim rows without amounts |
| Quirk | voided transactions and unclosed statements show struck through on the ledger screen; whether they print is `[unverified]` | Not printed by default; enhancement `include_voided_transactions` prints them struck through and outside the balance |

Signs: one signed `Amount` column (charges positive, payments and credits with a leading minus), running `Balance`
signed (credit balance negative). Kept.

### Parameters - legacy parity

<!-- PARITY:ledger_reports.r01:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT FORMAT | (no label) (radio_group) | **Account Ledger** / Patient Ledger | `report_type` | enum | Account Ledger -> `account_ledger`, Patient Ledger -> `patient_ledger` | `account_ledger` | replicated | Legacy title is REPORT FORMAT, but the choice selects the report variant, so it maps to report_type (04 section 8). account_ledger = every member of the guarantor account selected by account_id; patient_ledger = one patient selected by patient_id (vendor-documented parameter of 04 9.7, default current_patient; the panel in that state was never captured). Not a row grain: both variants print the same line layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Option rules: office_group enabled when false. Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 - greyed out | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Enabled when: false. 108 = id of the office the user was working in. Locked: forced_when true -> office_ids = working_office (04 9.3 row 33, vendor screenshots show the same lock). On this report the office is the PRINTING office (letterhead, header 'Office :' band, criteria echo), not a line filter: the ledger is organisation-wide (office context is never a fence, CLAUDE.md) and the legacy ledger line carries its own Office column, so lines of every office of the account are printed with that column. Whether the legacy print drops lines of other offices is not documented: confirm on the live tool (open question L-2). |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive, office-local; date_basis fixed transaction_date (04 7.2 row 19, documented): the ledger date of the line = rpt_ledger_entries.transaction_date (date of service for a charge until DATA-13, entry date of a payment or adjustment); claim lines use the claim created date (rpt_claim_facts.created_at_utc, app era only). Default today (relative token). Enhanced with presets (year_to_date, previous_year for the 'how much did I pay this year' request). |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the transaction-date range (basis as Start Date). Default today. Enhanced with presets and relative tokens. |
| RESPONSIBLE PARTY | Responsible Party (text_input) | shown: [responsible party open at capture] | `account_id` | entity_single | - | `current_account` | replicated | One responsible party = one guarantor account (accounts.id = rpt_ledger_entries.account_id, the patient's current account, data card 5.3), shown as Last, First. Pre-filled with the account of the patient in context (token current_account). Visible and required when report_type == account_ledger (shared rules of 04); with patient_ledger the report takes patient_id instead. Setting it needs class phi_identified (08 5.2 rule 8). |
| RESPONSIBLE PARTY | SEARCH (button) | - | `account_id.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| OTHER OPTIONS | Print all transactions (includes statements, ledger notes) (checkbox) | **unchecked** | `print_all_transactions` | boolean | - | `false` | replicated | false = money lines only (rpt_ledger_entries, live). true = also the non-financial ledger rows: 'Statement Sent - $X.XX' lines from patient_statements (statement_date in the range; app era only, no migrated statement rows), ledger notes from account_notes (note date in the range, NEW date column of the DATA-52 passthrough; 4,518 migrated rows), and claim lines CLM-P / CLM-S from rpt_claim_facts (claim date in the range; inferred - the legacy label names statements and notes only). Population and sort of these rows: report section Data. Non-financial rows carry no amount and do not change the running balance. Exact legacy effect is an inference: confirm on the live tool (open question L-3). |
| Patient Ledger Report (print-menu dialog) | [prompt, legacy wording not documented: add a patient note] (other) † | (empty) | `add_patient_note` | boolean | - | `false` | replicated | Legacy prompt of the print-menu flow (asks whether to add a patient note) becomes the shared vendor-doc parameter add_patient_note of 04 9.7: boolean, definition default false, role output (never changes the rows). true = after the PDF artifact is rendered, the patient-notes handler writes one note 'Ledger printed <date range> by <user>' (wording NEW, owned by the patient-notes feature) per patient of the run; idempotent per (run_id, artifact_id, patient_id). Legacy wording, form (confirmation box or checkbox) and default are not documented: confirm on the live tool (open question L-4). Offered on the hub form too (additive). Default differs: legacy default not documented (L-4); false = no note, the definition default of 04 9.7 |

† From vendor documentation - not visible in our screenshot of this screen (hidden row, collapsed dropdown or another report mode).

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run (cost_class instant, one account or one patient), show the ledger on screen, then render the PDF (layout banded_table, landscape) or XLSX / CSV from the same snapshot. When add_patient_note is true the render step hands the printed document to the patient-notes handler (one note per patient of the run). |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| The ledger is printed from the patient toolbar Print Reports icon > Patient Ledger / Account Ledger instead of Reports > Ledger Reports | The print menu lists `Patient Ledger` and `Account Ledger` as separate items; each opens a dialog (`Patient Ledger Report`) with `Date Range` (`Start Date*`, `End Date*`) and the buttons `Print / Preview` / `Cancel`, and the flow asks whether to add a patient note. | Same definition ledger.ledger_report, second entry point. The patient Print launcher (07 section 1.7, UX-29) offers two items, Patient Ledger and Account Ledger; each opens the compact print dialog of the runner with report_type preset (patient_ledger / account_ledger, not editable there), patient_id = current_patient or account_id = current_account resolved from context.patient_id (hidden in the dialog), date_range (date_from, date_to; both required, default today / today) and add_patient_note (boolean, default false). Buttons PRINT / PREVIEW and CANCEL. On the hub form add_patient_note is visible as well (additive, default false); account_id is visible_when report_type == account_ledger, patient_id visible_when report_type == patient_ledger (shared rules of 04). |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `office_scope` | forced_when | true | {"office_ids": {"token": "working_office"}} | shown - Lock of the four Ledger reports: always the working office. |
| `account_id` | visible_when | report_type == account_ledger | - | documented - The account ledger is run by selecting the responsible party. |
| `account_id` | required_when | report_type == account_ledger | - | documented |
| `patient_id` | visible_when | report_type == patient_ledger | - | documented - The patient ledger is run by selecting the patient (panel not captured). |
| `patient_id` | required_when | report_type == patient_ledger | - | documented |
<!-- PARITY:ledger_reports.r01:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT = Account Ledger (default) | `report_type = account_ledger`: every live leg whose `account_id` = the selected account (all current members); `account_id` visible and required, `patient_id` hidden; running balance of the account; `Patient` column shown |
| REPORT FORMAT = Patient Ledger | `report_type = patient_ledger`: every live leg whose `patient_id` = the selected patient; `patient_id` visible and required, `account_id` hidden; running balance of the patient [I: whether the legacy Patient Ledger balance is the patient's or the account's is not documented, L-5]; `Patient` column hidden (one patient) |
| OFFICE/GROUP = Office (default; Office Group greyed) | Office locked to the working office; prints in the letterhead and `Office :` band; does not filter lines (shared rules, F-3) |
| Office picker (greyed, `108`) | Read-only display of the working office; no other value can be sent |
| Start Date / End Date (default today / today) | Lines with `transaction_date` in the range; the balance before `date_from` prints above the first line as `Previous Balance` so the running balance is the true account balance [I: not documented for the legacy print, L-5] |
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
| `include_archived_transactions` | `boolean` (NEW key) | `false` (archived lines excluded, as the live filter does) | Reads `rpt_ledger_entries_all`; shown only to callers with `reports_ledger_reports_screen_full_control` and only when the tenant's archive policy excludes archived migrated lines (data card 3.6); prints them (`is_archived`) flagged `Archived` |
| `date_preset` | presets `year_to_date`, `previous_year`, `last_12_months` | `today` | Tax-year ledger in one click; saved views keep the preset |
| `output_format` | `pdf` / `xlsx` / `csv` | `pdf` | Shared rule |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ledger_entries` (live), `rpt_ledger_entries_all` (voided option), `rpt_charges` (tooth, surface, `apply_to`, `bill_tier`, `duration_minutes`), `rpt_patient_dim`, `rpt_account_dim`, `rpt_office_dim`, `rpt_provider_dim`, `rpt_user_dim`, `rpt_procedure_code_dim`, `rpt_transaction_code_dim`, `rpt_claim_facts`, passthroughs `patient_statements`, `account_notes`, `rpt_ar_open_items()` for the summary block |
| Population | `account_ledger`: `rpt_ledger_entries.account_id = :account_id`; `patient_ledger`: `patient_id = :patient_id`. Then `transaction_date BETWEEN :date_from AND :date_to` |
| Statement rows (`print_all_transactions`) | `patient_statements` with `account_id = :account_id` (`account_ledger`) or `patient_id = :patient_id` (`patient_ledger`), `statement_date BETWEEN :date_from AND :date_to`; date `statement_date`, Description `Statement Sent - $<closing_balance>`, `entry_type = statement`. App era only |
| Note rows (`print_all_transactions`) | `account_notes` joined through `patients` of the population (`account_ledger`: every patient with `patients.account_id = :account_id`; `patient_ledger`: only rows with `patient_id = :patient_id` - migrated account notes sit on one representative member, so a patient ledger of another member shows none); NOT `is_struck_off`; note date in the range. The passthrough exposes no date column today: NEW `note_date` (from the note's created date; migrated rows need the source note date) on the DATA-52 passthrough, owner 03_data_foundation.md section 2.30; Description = note text (`phi_identified`), `entry_type = note` |
| Claim rows (`print_all_transactions`) | `rpt_claim_facts` with `account_id = :account_id` or `patient_id = :patient_id`, `status_class <> 'deleted'`, claim date (Date basis row) in the range; Code `CLM-P` / `CLM-S` by `tier`, Description claim number and `billed_amount`, `entry_type = claim` |
| Order of non-financial rows | inside the date of the line by the shared line order (charge, claim, payment, adjustment, non-financial row), then `entry_id`; statement and note rows carry `entry_id` `stm:<id>` / `note:<id>` [I, L-3] |
| Previous balance | `sum(amount)` of the same population with `transaction_date < :date_from`; a figure of the block `opening` (`report_start`, `key_value`), never a row of `lines`, so it stays outside every column total; the PDF prints it above the first line |
| Running balance | `previous_balance + sum(amount) OVER (ORDER BY <sort keys>, entry_id ROWS UNBOUNDED PRECEDING)`, computed in the builder, not in the renderer |
| Date basis | `transaction_date` (fixed). Charges: equal to `service_date` until DATA-13. Claim rows: `rpt_claim_facts.created_at_utc` converted to the claim office date (app era); migrated claims have no created date [V] - they use `submitted_date`, else the earliest line service date, and the row is flagged `date_source = substitute` |
| Office | printed per line from `rpt_ledger_entries.office_id` → `rpt_office_dim.short_id`; NULL (migrated unknown office) prints `Unassigned` |
| Provider | the provider on the leg: `rpt_ledger_entries.provider_id` (treating provider of a charge, credited provider of a payment, provider of an adjustment) → `rpt_provider_dim.short_id`; NULL prints blank |
| User | `user_key` → `rpt_user_dim.user_label`; migrated rows print the legacy login string |
| Column derivations | `A` = `rpt_charges.apply_to` (charges only); `T` = `P` when `journal_column = 'charges'`, `C` when `journal_column IN ('payment', 'adjust')` and `txn_side <> 'unknown'`, blank for unclassified migrated adjustments; `Bill` = `bill_tier` → `D` (`primary`), `DD` (`secondary`), `DDD` (`tertiary`), blank (`none`); `DDDD` has no source (no quaternary tier value; NEW value `quaternary` owned by 03_data_foundation.md section 2.9 if the live tool shows it) and prints blank; on migrated charges every `D*` value was folded into `primary` at load, so `DD` / `DDD` print as `D` until DATA-12 re-reads the depth; on app charges `bill_tier` is derived until DATA-33; `M` / `MM` (medical) has no source today and prints blank |
| Note / EOB indicators | `has_note` = the leg has a ledger note; `has_eob` = the leg has a remittance (EOB) document. Neither link exists in the datasets: NEW boolean columns of `rpt_ledger_entries` (note link per leg; EOB = remittance document link), owner 03_data_foundation.md section 2.12; blank for migrated rows (no link was migrated) |
| Code and description | charges: `procedure_code`, `rpt_procedure_code_dim.description`; payments / adjustments: `code`, `rpt_transaction_code_dim.description` (migrated rows: system alias and tender, REPAIR(12)); remittance legs: `Insurance Payment (DOS mm/dd/yy)` with the carrier name from `carrier_id` |
| Availability | READY. Options: statement rows APP (`patient_statements` has no migrated rows); ledger notes READY (4,518 migrated `account_notes` rows); claim rows of migrated claims carry no lines or service dates until the `claim_id` backfill (data card 2.20); payment and adjustment codes on history: REPAIR(12) (DATA-12); the migrated charge set is incomplete until DATA-57 / R-21 - the completeness warning of the data card prints in the criteria block (`availability[]` code `migrated_ledger_incomplete`); `Bill` depth on migrated charges REPAIR(12) (prints `D` for `DD` / `DDD`, code `bill_depth_folded`), on app charges derived until DATA-33 (code `bill_tier_derived`); note / EOB indicators NEW (blank for migrated rows, code `ledger_indicators_unavailable`) |
| Cannot be produced | the legacy per-line note / EOB indicators for migrated rows (no link was migrated); `DDDD` and `M` / `MM`; the account as it was before a guarantor change (`account_change_events` app era only, data card 5.3) - a patient moved between accounts shows all his lines under the current account |

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
| `has_note` | Note | boolean | `phi_identified` | none |
| `has_eob` | EOB | boolean | `aggregate` | none |
| `description` | Description | text | `phi_identified` | none |
| `bill_tier_label` | Bill | text | `phi_identified` | none |
| `duration_minutes` | Duration | integer | `phi_identified` | none |
| `provider_short_id` | Provider | text | `aggregate` | none |
| `est_patient` | Est Pat | money | `financial_patient` | sum |
| `est_insurance` | Est Ins | money | `financial_patient` | sum |
| `amount` | Amount | money (minus sign) | `financial_patient` | sum (period activity; the previous balance is not a row, so it is not in the total) |
| `running_balance` | Balance | money | `financial_patient` | none (the closing balance prints as `Ending Balance` in `balance_summary`) |
| `user_label` | User | text | `aggregate` | none |
| hidden: `debit`, `credit` | | money | `financial_patient` | sum (back the `period_charges` / `period_credits` cards and the `balance_summary` figures) |
| hidden: `entry_id` (row id), `patient_id`, `account_id`, `claim_id`, `entry_type`, `is_void`, `is_non_financial`, `sort_service_date` | | | entity classes (rule 6) | |

Block `opening` (`placement = report_start`, `shape = key_value`): `previous_balance` (Previous Balance, money,
`financial_patient`); printed above the first line of `lines`.

Block `balance_summary` (`placement = report_end`, `shape = key_value`) [I]: `Previous Balance`, `Charges` (sum of
debits of `lines`), `Credits` (sum of credits of `lines`), `Ending Balance` (= previous balance + `amount` total = last
running balance), then as of `date_to` from `rpt_ar_open_items(p_unit = 'account')`: `Estimated Insurance`
(`open_insurance_est`), `Estimated Patient` (`open_patient`), `Credit Balance` (`open_amount` of the `unallocated_credit`
rows). All `financial_patient`. Patient Ledger: open debits with `patient_id` = the patient, and `Credit Balance` from the
`unallocated_credit` rows whose `patient_id` is the patient (the credit's own patient); account-level credits of other
members are not shown there.

Grouping: none (one person per run). Sort: `sort_by` (enhancement), tie-breaker `entry_id`. Page break: none.
Summary cards: `ending_balance` (block `balance_summary`), `period_charges`, `period_credits`;
`reconciles_with`: `ending_balance` = metric `total_ar` for the one account as of `date_to` (05: "one account: P1").
`empty_when`: `no_detail_rows` on `lines` (a range without activity still prints the `opening` block and is not
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

PDF: layout `banded_table`, landscape (19 columns), letterhead, repeating column header, the `opening` block
(`Previous Balance`) above the first line, `balance_summary` after the last line, criteria echo in the footer, page numbers per document. XLSX: one sheet
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
| L-5 | Printed title, column set and closing summary of the legacy print (layout INFERRED); does it start with a previous-balance line; is the Patient Ledger running balance the patient's or the account's; how are the note and EOB indicators printed? | Live tool: print one account ledger and one patient ledger of a member with a noted line and an EOB |
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
| First line | `Previous Balance` with the amount in the `Credits` / balance column |
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

<!-- PARITY:ledger_reports.r02:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Option rules: office_group enabled when false. Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 - greyed out | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Enabled when: false. 108 = id of the office the user was working in. Locked: forced_when true -> office_ids = working_office (vendor screenshots show the same lock). On this report the office is (a) the printing office (logo, address, 'Office # :' box, Next Appt Office comparison) and (b) the line filter of the activity table: lines whose transaction office rpt_ledger_entries.office_id = the working office (the visit's checkout). Previous Balance, Total Balance for the Account and the ageing grid are account-wide (all offices), because they state what the responsible party owes. (b) is inferred: confirm on the live tool with an account that has activity at two offices on the same day (open question W-2). |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive, office-local; date_basis fixed transaction_date (04 7.2 row 20, inferred): the activity lines of the walkout are the ledger lines whose transaction_date falls in the range. Default today (vendor text: default today). Previous Balance = account balance at the end of date_from - 1 day (printed above the lines, outside every column total). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the transaction-date range. Default today. The ageing grid and 'Account Balance as of' are computed as of date_to (rpt_ar_open_items p_as_of = date_to). |
| RESPONSIBLE PARTY NAME RANGE | Start Name (text_input) | shown: [name of the patient open at capture] | `responsible_party_name_from` | text_range | - | `current_responsible_party_name` | replicated | Start of the alphabetical range on the responsible-party sort name upper(guarantor_last_name \|\| ', ' \|\| guarantor_first_name) of rpt_account_dim, prefix rule of 04 3.4; AAAAA / ZZZZZ are open bounds. Both boxes pre-filled from the patient in context (token current_responsible_party_name = the guarantor of that patient's account). One walkout per account in the range that has at least one activity line in the date range at the working office. Whether the legacy pre-fill is the patient or the guarantor is not documented (test with a dependent, open question W-3). |
| RESPONSIBLE PARTY NAME RANGE | SEARCH (button) | - | `responsible_party_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| RESPONSIBLE PARTY NAME RANGE | End Name (text_input) | shown: [name of the patient open at capture] | `responsible_party_name_to` | text_range | - | `current_responsible_party_name` | replicated | End of the responsible-party name range (inclusive, prefix rule). Pre-filled like Start Name, so the default run prints the walkout of the account in context only. |
| RESPONSIBLE PARTY NAME RANGE | SEARCH (button) | - | `responsible_party_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| OTHER OPTIONS | Show charges break down (checkbox) | **unchecked** | `show_charges_breakdown` | boolean | - | `false` | replicated | true adds Est. Pat and Est. Ins on every line (vendor sample): charges print rpt_ledger_entries.est_patient / est_insurance (they always sum to the fee, R-20); payment and adjustment lines print blank in both columns. In the vendor sample with both options on, Chart # is dropped from the line table; the new layout keeps the same column set per option combination (Output, variant table). |
| OTHER OPTIONS | Include UCR (checkbox) | **unchecked** | `include_ucr` | boolean | - | `false` | replicated | On this report Include UCR adds a UCR column immediately left of Charges with the office (UCR) fee stamped on the charge (rpt_ledger_entries.office_fee, PD-1 gross production basis); blank on payment and adjustment lines. Unlike the Production Report there is no Fee Schedule To Compare: compare_fee_schedule_id is not a parameter of this definition and include_ucr enables nothing. |
| Walkout Report print-menu dialog (title not documented) | General Message (text_input) † | (empty) | `general_message` | text | - | `{"token": "server_value"}` | replicated | Shared vendor-doc parameter of 04 9.7: text, validation.max_length 100, role layout, definition default server_value = office_statement_settings.message_general of the working office. Printed in the Messages area of every walkout of the run. Legacy dialog default text not documented (inferred: the office statement message): confirm on the live tool (W-4). Default differs: legacy default text not documented (W-4); the office statement message of the working office is assumed (04 9.7: server_value) |
| Walkout Report print-menu dialog (title not documented) | Current Message (text_input) † | (empty) | `current_message` | text | - | `{"token": "server_value"}` | replicated | Shared vendor-doc parameter of 04 9.7: text, max_length 100, role layout, default server_value = office_statement_settings.message_current. Printed after the general message on a walkout whose oldest open balance is in the Current bucket. Legacy default text not documented (W-4). Default differs: legacy default text not documented (W-4); the office statement message of the working office is assumed (04 9.7: server_value) |
| Walkout Report print-menu dialog (title not documented) | Over 30 Message (text_input) † | (empty) | `over_30_message` | text | - | `{"token": "server_value"}` | replicated | Shared vendor-doc parameter of 04 9.7: text, max_length 100, role layout, default server_value = office_statement_settings.message_30. Printed when the oldest open bucket of the account is Over 30. Legacy default text not documented (W-4). Default differs: legacy default text not documented (W-4); the office statement message of the working office is assumed (04 9.7: server_value) |
| Walkout Report print-menu dialog (title not documented) | Over 60 Message (text_input) † | (empty) | `over_60_message` | text | - | `{"token": "server_value"}` | replicated | Shared vendor-doc parameter of 04 9.7: text, max_length 100, role layout, default server_value = office_statement_settings.message_60. Printed when the oldest open bucket is Over 60. Legacy default text not documented (W-4). Default differs: legacy default text not documented (W-4); the office statement message of the working office is assumed (04 9.7: server_value) |
| Walkout Report print-menu dialog (title not documented) | Over 90 Message (text_input) † | (empty) | `over_90_message` | text | - | `{"token": "server_value"}` | replicated | Shared vendor-doc parameter of 04 9.7: text, max_length 100, role layout, default server_value = office_statement_settings.message_90. Printed when the oldest open bucket is Over 90. Legacy default text not documented (W-4). Default differs: legacy default text not documented (W-4); the office statement message of the working office is assumed (04 9.7: server_value) |
| Walkout Report print-menu dialog (title not documented) | Over 120 Message (text_input) † | (empty) | `over_120_message` | text | - | `{"token": "server_value"}` | replicated | Shared vendor-doc parameter of 04 9.7: text, max_length 100, role layout, default server_value = office_statement_settings.message_120. Printed when the oldest open bucket is Over 120. Legacy default text not documented (W-4). Default differs: legacy default text not documented (W-4); the office statement message of the working office is assumed (04 9.7: server_value) |
| Walkout Report print-menu dialog (title not documented) | [option, legacy label not documented: add a note to the patient's Notes that a walkout was printed] (other) † | (empty) | `add_patient_note` | boolean | - | `false` | replicated | Shared vendor-doc parameter add_patient_note of 04 9.7: boolean, definition default false, role output. true = after the PDF is rendered the patient-notes handler records 'Walkout printed <date range> by <user>' (wording NEW) in the Notes of the patient in context (patient-context entry), or, for a name-range run, of every account member who has an activity line on the walkout (a guarantor of kind responsible_party is not a patient and gets no note); idempotent per (run_id, artifact_id, patient_id). Legacy label, control type and default are not documented (W-5). Default differs: legacy default not documented (W-5); false = no note, the definition default of 04 9.7 |

† From vendor documentation - not visible in our screenshot of this screen (hidden row, collapsed dropdown or another report mode).

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run (instant for one responsible party, interactive for a name range), show the walkouts on screen, then render the PDF in layout slip with record_per_page = one walkout per responsible party; XLSX / CSV give the flat line table. When add_patient_note is true the render step writes the 'walkout printed' note through the patient-notes handler: to the patient in context for a patient-context run, else to every account member with an activity line; idempotent per (run_id, artifact_id, patient_id). |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| The walkout is printed from the print menu (patient toolbar Print Reports icon > Walkout Report) instead of Reports > Ledger Reports | A print dialog offers extras that the Reports criteria panel does not have: six editable message boxes (`General Message`, `Current Message`, `Over 30 Message`, `Over 60 Message`, `Over 90 Message`, `Over 120 Message`) and an option to add a note to the patient's Notes that a walkout was printed. | Same definition ledger.walkout_report, second entry point. The patient Print launcher item Walkout Report opens the compact print dialog with account_id = current_account (hidden; it fixes the population to the account in context, so another account whose guarantor sort name matches or starts with the same string is not printed), responsible_party_name_from / responsible_party_name_to = current_responsible_party_name (read-only display there), date_range (default today / today), the six message texts general_message, current_message, over_30_message, over_60_message, over_90_message, over_120_message (text, max_length 100, role layout, pre-filled with server_value = the office statement messages) and add_patient_note (boolean, default false). The Scheduler appointment menu Print > Walkout Report opens the same dialog with account_id = the account of the appointment's patient and date_range = the appointment date (both ends); appointment_id is not set by the entry, so the whole account's activity of that day prints as in a name-range run of one account (legacy population of the appointment entry not documented: W-5). On the hub form the six messages and add_patient_note are visible too, in a section MESSAGES below OTHER OPTIONS (additive; untouched values reproduce the legacy run); account_id is hidden there and the name range drives the population. |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `office_scope` | forced_when | true | {"office_ids": {"token": "working_office"}} | shown - Lock of the four Ledger reports: always the working office. |
<!-- PARITY:ledger_reports.r02:END -->

| Legacy option | Effect on the result |
|---|---|
| OFFICE/GROUP = Office (default; Office Group greyed) | Working office, locked: header office and activity-line filter (transaction office); balances and ageing stay account-wide |
| Office picker (greyed, `108`) | Read-only display |
| Start Date / End Date (default today / today) | Activity lines with `transaction_date` in the range at the working office; `Previous Balance` = account balance at the end of `date_from - 1`; ageing grid and `Account Balance as of` at `date_to` |
| Start Name / End Name (pre-filled from the patient in context) | Accounts whose guarantor sort name lies in the range (prefix rule); one walkout per account with at least one activity line in the range; same name in both boxes = every account whose guarantor sort name equals or starts with it (F-7). The patient-context and Scheduler entries also send the hidden `account_id`, which makes the run that one account |
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
| `account_id` | `entity_single` (shared key, filter card 3) | `null` | Hidden. Set by the patient-context entry (`current_account`) and the Scheduler entry (account of the appointment's patient, with `date_range` = the appointment date): the population is that one account and the name range is display only. Not on the hub form |
| `appointment_id` | `entity_single` (NEW key; source `appointments` of the selected office and day) | `null` | Opt-in narrowing, not set by any entry: the activity lines are only those of the appointment's patient at the appointment's office on its day. Offered in the compact dialog of the Scheduler entry as "This appointment only" (unticked) |
| `include_family_next_appointments` | `boolean` (NEW key) | `true` | `true` = one next-appointment row per account member (legacy sample lists the patient name per row, so the legacy prints members [I]); `false` = only patients who had activity in the range |
| `show_signature_lines` | `boolean` (NEW key) | `false` | Prints `Card Holder Signature` and `Dentist Signature` lines on paper (P1); electronic capture through the signature feature is RPT-LEDGER-14 (P2) |
| `skip_zero_activity_accounts` | `boolean` (NEW key) | `true` | Name-range runs only: accounts without an activity line in the range get no walkout (the legacy population rule [I]); `false` prints a balance-only walkout for every account in the range |
| `output_format` | shared | `pdf` | |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ledger_entries` (lines, previous balance, account balance), `rpt_charges` (tooth, surface, `office_fee`), `rpt_patient_dim` (first name, chart number), `rpt_account_dim` (guarantor name, address, `account_no`), `rpt_office_dim` (name, short id), `print_service.resolve_letterhead` (office address, phone, fax, logo: `rpt_office_dim` has no address or phone columns), `rpt_transaction_code_dim` (tender and code descriptions), `rpt_ar_open_items()` (ageing), `rpt_appointment_facts` (next appointment), `rpt_contract_installments` / `rpt_payment_plan_contracts` (contract balances, P2), office statement settings (messages) |
| Population | `account_id` set (patient-context and Scheduler entries): that one account. Otherwise accounts `a` of `rpt_account_dim` with `upper(guarantor_last_name || ', ' || guarantor_first_name)` in the name range (prefix rule). Kept when at least one live leg of `a` has `transaction_date` in the range and `office_id = :working_office` (or always, `skip_zero_activity_accounts = false`) |
| Activity lines | live legs of the account with `transaction_date` in the range and `office_id = :working_office` [I, W-2]; with the opt-in `appointment_id` additionally `patient_id` = the appointment's patient; sorted by `transaction_date`, entry-type order, `entry_id` |
| Previous Balance | `sum(amount)` of all live legs of the account (all offices) with `transaction_date < :date_from`; a figure of `walkout_header`, never a row of `lines`, so no column total contains it |
| Total of Today's Activity | `sum(amount)` of the activity lines (the `amount` total of `lines`) |
| Activity at other offices | `sum(amount)` of the account's live legs with `transaction_date` in the range and `office_id <> :working_office` (NULL office included); printed as `Activity at other offices :` between the two totals only when non-zero, so that Previous Balance + Today's Activity + other offices = Total Balance (NEW line, not legacy; W-2) |
| Total Balance for the Account | `sum(amount)` of all live legs of the account with `transaction_date <= :date_to` (all offices); equals `Account Balance :` in the header |
| Ageing grid | `rpt_ar_open_items(tenant, p_as_of = :date_to, p_account_ids = [accounts], p_unit = 'account')`, bucket set `legacy` (Current 0-29, Over30 30-59, Over60 60-89, Over90 90-119, Over120 120+; data card 2.14); row `Estimated Insurance` = `sum(open_insurance_est)` per bucket, `Estimated Patient` = `sum(open_patient)`; `Total Balance` = row sums; unallocated credits are not put in a bucket: they reduce `Total Balance` and print as `Credit :` under the grid ([I], W-6) |
| Contract balances | `Reg Cont. Bal.` / `Ort Cont. Bal.` = remaining unbilled amount of the account members' active regular / ortho contracts. P1: read from the existing payment-plan service per patient (coverage note "a report that ships earlier than its dataset"); its remaining amounts are the stored `*_rem_amt` client snapshots, which are stale (data card 2.25), so every walkout with a contract prints the `availability[]` warning `contract_balance_stored` "contract balance from stored plan values"; contract billing can also debit A/R twice (03_data_foundation.md section 6 #33 / #34), which no report can net out. P2: `rpt_payment_plan_contracts.pat_amount_remaining` (recomputed) grouped by `contract_kind` (DATA-37). APP: no contract was migrated |
| Next appointment | per account member: first `rpt_appointment_facts` row with `appointment_date > :date_to`, `NOT is_block`, `NOT is_deleted`, `NOT is_legacy_archive`, `status_class NOT IN ('cancelled', 'no_show')`, order `appointment_date, start_time`; `Next Appt Office` = `rpt_office_dim.office_name` plus address and phone from `print_service.resolve_letterhead` of that office; `Reason` = `procedure_label` (DATA-16) [I, W-7] |
| Messages | `general_message` always; the aged message of the oldest bucket with `open_patient + open_insurance_est > 0` (`current_message` when only Current) |
| Descriptions | patient payment: tender label of `rpt_transaction_code_dim` (`card_brand` when known: REPAIR(12) for history, DATA-12); insurance payment: `Insurance Payment (Dos:<service_date_effective>)`; adjustment: code description; contract movements: their code descriptions (no contract credit is written today, DATA-37) |
| Office / provider attribution | transaction office for the line filter; no provider column |
| Availability | READY; contract balances APP, from stored plan values in P1 (`contract_balance_stored`); card brand on migrated payments REPAIR(12); next appointment reason empty on migrated appointments; `Check #` dropped for callers without `payment_instrument` (F-8) |

### Output

One format `standard`, documents of one account each (`record_per_page`).

Block `walkout_header` (`placement = report_start` per document, `key_value`): `statement_date` (Date, `phi_identified`),
`account_no` (Account #, `phi_identified`), `account_balance` (Account Balance, money, `financial_patient`),
`office_short_id` (Office #, `aggregate`), `guarantor_name`, `guarantor_address` (`phi_identified`), `long_date` (text),
`previous_balance` (Previous Balance, money, `financial_patient`; printed by the `slip` layout as the first line of the
table, signed, in the `Credits` / balance column as in the vendor sample [I: placement with a positive balance, W-1]),
`other_office_activity` (money, `financial_patient`, printed only when non-zero), hidden `account_id` and
`first_leg_date` (date of the account's first live leg, for the `Total Balance` drill).

Block `lines` (main, `table`) - column sets by option (`visible_when` on the columns):

| key | label | type | data_class | default variant | breakdown on | UCR on | both on | total rule |
|---|---|---|---|---|---|---|---|---|
| `transaction_date` | Date | date | `phi_identified` | yes | yes | yes | yes | label |
| `description` | Description | text | `phi_identified` | yes | yes | yes | yes | none |
| `chart_no` | Chart # | text | `phi_identified` | yes | yes | yes | no | none |
| `patient_first_name` | Patient Name | text | `phi_identified` | yes | yes | yes | yes | none |
| `check_number` | Check # | text | `payment_instrument` (dropped for callers without the class, F-8) | yes | yes | yes | yes | none |
| `code` | Code | text | `phi_identified` | yes | yes | yes | yes | none |
| `tooth` | Th | text | `phi_identified` | yes | yes | yes | yes | none |
| `surface` | Surf | text | `phi_identified` | yes | yes | yes | yes | none |
| `est_patient` | Est. Pat | money | `financial_patient` | no | yes | no | yes | sum |
| `est_insurance` | Est. Ins | money | `financial_patient` | no | yes | no | yes | sum |
| `office_fee` | UCR | money | `financial_patient` | no | no | yes | yes | sum |
| `debit` | Charges | money | `financial_patient` | yes | yes | yes | yes | sum |
| `credit` | Credits | money | `financial_patient` | yes | yes | yes | yes | sum |
| hidden: `amount` | | money | `financial_patient` | | | | | sum (`Total of Today's Activity`) |
| hidden: `payment_credit` | | money (`credit` of `patient_payment` / `insurance_payment` legs, else 0) | `financial_patient` | | | | | sum (`total_collected_today` card) |
| hidden: `entry_id`, `account_id`, `patient_id`, `entry_type` | | | entity classes | | | | | |

`Previous Balance` (from `walkout_header`) prints above the lines and is in no column total. After the lines:
`Total of Today's Activity :` (= the `amount` total = `sum(debit) - sum(credit)` of the activity lines),
`Activity at other offices :` (only when non-zero) and `Total Balance for the Account :`.

Block `ageing` (`after_group` per document, `matrix`): rows `Estimated Insurance`, `Estimated Patient`; columns
`current`, `over_30`, `over_60`, `over_90`, `over_120`, `total_balance`, plus `reg_contract_balance`,
`ortho_contract_balance`; all `financial_patient`; caption `Account Balance as of : <date_to>`.

Block `messages` (`key_value`): `Messages :` (general + aged message), `Comments :` (empty box).

Block `next_appointments` (`table`): `patient_name`, `next_appt_date` (weekday + date), `start_time`, `next_appt_office`
(name, address, phone), `reason`; all `phi_identified` (office text `aggregate`). Omitted when empty.

Grouping: `fixed_outer` level = account (one document per account, sorted by guarantor sort name, then `account_id`).
Page break: every account (`record_per_page`). Summary cards (screen only, block totals of `lines`): `total_activity`
(`amount` total), `total_collected_today` (`payment_credit` total) - `financial_practice` when the run spans more than one
account. The number of walkouts printed is shown in the run status, not as a card (it is not a block total). `reconciles_with`: `total_balance` of each document = `total_ar` for that account as of
`date_to`.

### Visuals and drill-through

None - a document. Drill: a line → `kind = record` `patient_account_ledger` (right
`transactions_patient_ledger_screen_full_control`); `Total Balance` → `ledger.ledger_report` with `report_type =
account_ledger`, `param_map` `{"report_type": {"literal": "account_ledger"}, "account_id": {"column": "account_id"},
"date_from": {"column": "first_leg_date"}, "date_to": {"param": "date_to"}}` (the whole history of the account up to
`date_to`, so the ledger's ending balance equals the clicked figure); a bucket cell →
`ledger.account_allocation` for the account (which credits went where); a next appointment → `kind = record`, `route_key = appointment`
(`openSchedulerAtAppointment` with appointment id, date, office).

### Actions

| Action | Kind | Detail |
|---|---|---|
| Print from the appointment | entry point, Scheduler appointment menu → compact dialog with hidden `account_id` = the account of the appointment's patient and `date_range` = the appointment date; `appointment_id` only when the user ticks "This appointment only" (RPT-LEDGER-03) | replaces the legacy right-click > Print > Walkout Report; population of the legacy entry not documented (W-5) |
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
| W-1 | Column set with only one of the two options ticked; column of the `Previous Balance` amount when the balance is positive and when it is a credit | Live tool |
| W-2 | Are activity lines restricted to the working office, and are the balances account-wide? If so, how does the legacy walkout explain the gap (the new one prints `Activity at other offices :`)? | Live tool, account with activity at two offices on the same day |
| W-3 | Is the name pre-fill the patient or the guarantor (test with a dependent)? Which accounts does a range include - only those with activity in the range? | Live tool (04 11.5) |
| W-4 | Default text of the six message boxes (office statement messages assumed) and the rule choosing the aged message | Live tool |
| W-5 | Title, label, control type and default of the "add a note" option, and which patient receives the note; is the dialog also shown from the appointment right-click entry, and does that entry print the whole account's day or only the appointment's patient? | Live tool |
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

<!-- PARITY:ledger_reports.r03:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Option rules: office_group enabled when false. Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 - greyed out | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Enabled when: false. 108 = id of the office the user was working in. Locked: forced_when true -> office_ids = working_office (vendor screenshots show the same lock). On this report the office is (a) the billing identity printed on the form (rpt_office_dim address and billing_provider_id, vendor text: the insurance billing provider entered under Setup / Offices) and (b) the line filter: services by office of service rpt_charges.office_id, payments and adjustments by transaction office rpt_ledger_entries.office_id = the working office, because a claim is filed per billing office. (b) is inferred: confirm on the live tool (S-2). |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive, office-local; date_basis fixed service_date (04 7.2 row 21, documented: the print-menu dialog labels it DOS Date Range). Bound to rpt_ledger_entries.service_date_effective, so payments and adjustments linked to a charge of the range print with it and unlinked ones by their transaction date. Vendor advice: treatment date through the insurance payment posting date. Default today. Enhanced with presets. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the date-of-service range (basis as Start Date). Default today. |
| PATIENT NAME RANGE | Start Name (text_input) | shown: [name of the patient open at capture] | `patient_name_from` | text_range | - | `current_patient_name` | replicated | Start of the alphabetical range on the patient sort name upper(last_name \|\| ', ' \|\| first_name) of rpt_patient_dim, prefix rule of 04 3.4; AAAAA / ZZZZZ open bounds. Both boxes pre-filled with the patient in context (token current_patient_name), so the default run prints that patient's super bill. One super bill per PATIENT (the other three ledger reports are by responsible party) that has at least one printed line in the range. |
| PATIENT NAME RANGE | SEARCH (button) | - | `patient_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| PATIENT NAME RANGE | End Name (text_input) | shown: [name of the patient open at capture] | `patient_name_to` | text_range | - | `current_patient_name` | replicated | End of the alphabetical range on the patient sort name (inclusive, prefix rule). Vendor documentation: the same patient in both boxes limits the report to that patient. |
| PATIENT NAME RANGE | SEARCH (button) | - | `patient_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| TRANSACTION TYPES | Services (checkbox) | **checked** | `transaction_types.services` | enum_multi | - | `true` | replicated | Member services of transaction_types (enum_multi, min_items 1, full_selection no_predicate, 04 2.5): production charges (rpt_ledger_entries.entry_type = charge and ledger_bucket <> non_production_charge). Contract-billing charges (ACBIL / ACBILO, ledger_bucket non_production_charge) belong to the Adjustment member, as the legacy journal prints them in Adjust (data card 2.12) [I, S-7]. Unticked = no service lines. |
| TRANSACTION TYPES | Payments (checkbox) | **checked** | `transaction_types.payments` | enum_multi | - | `true` | replicated | Member payments: entry_type in (patient_payment, insurance_payment). Payments only (Services and Adjustment unticked) = the vendor's tax receipt (title template 'Payment Receipt' is NEW, see the report section). |
| TRANSACTION TYPES | Adjustment (checkbox) | **checked** | `transaction_types.adjustments` | enum_multi | - | `true` | replicated | Member adjustments (legacy label singular 'Adjustment'): entry_type in (adjustment, refund, transfer, opening_balance), plus contract-billing charges (ledger_bucket non_production_charge) [I, S-7]. With all three members ticked the canonical value is all (no predicate), so no live line of the patient in the range is dropped. |
| Super Bill Report (print-menu dialog) | Include Previous Balance (checkbox) † | **unchecked** | `include_previous_balance` | boolean | - | `false` | replicated | Shared vendor-doc parameter of 04 9.7: boolean, definition default false, role query. true = a first line 'Previous Balance' = sum(rpt_ledger_entries.amount) of the patient's live legs with service_date_effective < date_from, under the same office rule as the lines (charges by rpt_charges.office_id, credits by rpt_ledger_entries.office_id = the working office) and over every entry type (transaction_types does not narrow it), so that Balance = Previous Balance + the listed lines is the balance of the printed scope. Basis and office scope of the legacy figure are not documented (S-6). Dialog only in the legacy tool; default not documented: confirm on the live tool (S-3). Offered on the hub form too (additive). Default differs: legacy default not documented (S-3); false = no previous-balance line, the definition default of 04 9.7 |

† From vendor documentation - not visible in our screenshot of this screen (hidden row, collapsed dropdown or another report mode).

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run (instant for one patient, interactive for a name range), show the super bills on screen, then render the PDF in layout slip with record_per_page = one super bill per patient, no office logo (legacy quirk kept); XLSX / CSV give the flat line table. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| The super bill is printed from the print menu (patient toolbar Print Reports icon > Superbill) instead of Reports > Ledger Reports | The dialog `Super Bill Report` is shown: the date range is labelled `DOS Date Range` there and the extra option `Include Previous Balance` is offered (dialog only). | Same definition ledger.super_bill, second entry point. The patient Print launcher item Superbill opens the compact print dialog titled Super Bill Report with patient_id = current_patient (hidden; it fixes the population to the patient in context, so another patient whose sort name matches or starts with the same string is not printed), patient_name_from / patient_name_to = current_patient_name (read-only display there), date_range labelled DOS Date Range (date_from, date_to, basis service_date in both entries) and include_previous_balance (boolean, default false). On the hub form include_previous_balance is visible too, after TRANSACTION TYPES (additive, default false); patient_id is hidden there and the name range drives the population; transaction_types is visible in both entries. |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `office_scope` | forced_when | true | {"office_ids": {"token": "working_office"}} | shown - Lock of the four Ledger reports: always the working office. |
<!-- PARITY:ledger_reports.r03:END -->

| Legacy option | Effect on the result |
|---|---|
| OFFICE/GROUP = Office (default; Office Group greyed) | Working office locked: billing identity of the form and line filter (services by office of service, credits by transaction office) |
| Office picker (greyed, `108`) | Read-only display |
| Start Date / End Date (default today / today; dialog label `DOS Date Range`) | Lines whose `service_date_effective` is in the range: services by date of service; payments and adjustments linked to a charge print with the charge's DOS, unlinked ones by their transaction date |
| Start Name / End Name (pre-filled with the patient in context) | One super bill per patient in the range (prefix rule) with at least one printed line; same name twice = every patient whose sort name equals or starts with it (F-7). The patient-context entry also sends the hidden `patient_id`, which makes the run that one patient |
| SEARCH (two buttons) | Superseded by the lookup icons |
| TRANSACTION TYPES Services - checked (default) / unchecked | Service (production charge) lines printed / omitted |
| Payments - checked (default) / unchecked | Patient and insurance payment lines printed / omitted; Payments only = tax receipt |
| Adjustment - checked (default) / unchecked | Adjustment, refund, transfer, opening-balance and contract-billing (`ACBIL` / `ACBILO`) lines printed / omitted [I: contract billing as an adjustment, S-7] |
| All three ticked | Canonical `all`: no predicate |
| None ticked | Not allowed: 422 `min_items` (04 2.5) |
| Print dialog `Include Previous Balance` - false (definition default) / true | true: first line `Previous Balance` = the patient's balance before `date_from` on the lines' basis (`service_date_effective`) and office rule, included in `Balance` [I, S-6] |

Dependency rules: `office_scope` forced; none else. `include_previous_balance` shown in both entries.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `patient_id` | `entity_single` (shared key, filter card 3) | `null` | Hidden. Set by the patient-context entry (`current_patient`): the population is that one patient and the name range is display only. Not on the hub form |
| `include_insurance_block` | `boolean` (NEW key) | `true` | Prints the coverage block (carrier, subscriber, ids); `false` for a tax receipt |
| `coverage_slot` | `enum` `primary`, `secondary` (NEW key) | `primary` | Which dental coverage the form is prepared for; the subscriber block prints that slot |
| `itemize_by_visit` | `boolean` (NEW key) | `false` | Groups lines by date of service with a per-visit subtotal (one claim per visit) |
| `date_preset` | presets `previous_year`, `year_to_date` | `today` | HSA / FSA year receipts |
| `output_format` | shared | `pdf` | |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_ledger_entries`, `rpt_charges` (tooth, surface, `provider_id`), `rpt_patient_dim`, `rpt_account_dim` (`account_no`), `rpt_office_dim` (`office_name`, `billing_provider_id`), `print_service.resolve_letterhead` (office address and phone; `rpt_office_dim` has no such columns), `rpt_provider_dim` (billing and treating provider name, `npi`, `license`, `tax_id`), `rpt_procedure_code_dim`, `rpt_transaction_code_dim`, `rpt_insurance_coverage` (current dental slots: carrier, subscriber, `subscriber_id`, `group_number`) |
| Population | `patient_id` set (patient-context entry): that one patient. Otherwise patients of `rpt_patient_dim` whose sort name `upper(last_name || ', ' || first_name)` is in the range (prefix rule). Kept with at least one printed line |
| Lines | live legs with `patient_id` = the patient, `service_date_effective BETWEEN :date_from AND :date_to`, entry class in `transaction_types` (services = `charge` with `ledger_bucket <> 'non_production_charge'`; payments = `patient_payment`, `insurance_payment`; adjustments = `adjustment`, `refund`, `transfer`, `opening_balance` and contract-billing charges `ledger_bucket = 'non_production_charge'` [I, S-7]), office filter: charges `rpt_charges.office_id = :working_office` (office of service), credits `rpt_ledger_entries.office_id = :working_office` (transaction office) [I, S-2] |
| Previous balance | `sum(amount)` of the patient's live legs with `service_date_effective < :date_from`, same office rule as the lines, every entry type (`transaction_types` does not narrow it). Same basis and scope as the lines, so a credit linked to a charge of the range is never in both, and a back-dated charge is never lost; `Balance` is the balance of the printed scope [I, S-6] |
| Date basis | `service_date` (fixed) through `service_date_effective`; `service_date_source` printed as a footnote mark on lines dated by their transaction date |
| Provider attribution | treating provider of the charge (`rpt_charges.provider_id`) per line; billing provider = `rpt_office_dim.billing_provider_id` |
| Availability | READY. Migrated payments and adjustments are not linked to charges, so they print on their transaction date, not under the DOS they paid (data card 4.2); migrated payment codes REPAIR(12); NPI / licence blank where the provider record has none; coverage block shows today's coverage (the coverage at the date of service is not stored per charge until DATA-33) |

### Output

One format `standard`, one document per patient (`record_per_page`).

Block `bill_header` (`key_value`, per document): office name (`rpt_office_dim.office_name`), address, phone
(`print_service.resolve_letterhead`) (`aggregate`); `billing_provider_name`,
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
| `debit` | Charges | money | `financial_patient` | sum |
| `credit` | Credits | money | `financial_patient` | sum |
| hidden: `service_charge` | | money (`debit` of Services-member legs, else 0) | `financial_patient` | sum (`Total Charges`) |
| hidden: `payment_credit` | | money (`credit` of Payments-member legs, else 0) | `financial_patient` | sum (`Total Payments`) |
| hidden: `adjustment_amount` | | money (signed `amount` of Adjustment-member legs, else 0) | `financial_patient` | sum (`Total Adjustments`, signed: refunds, debit adjustments and contract billing net against credit adjustments) |
| hidden: `amount` | | money | `financial_patient` | sum |
| hidden: `entry_id`, `patient_id`, `entry_type`, `service_date_source` | | | entity classes | |

Totals block (`report_end` per document): `Previous Balance` (option; a figure of this block, never a row of `lines`, the
PDF prints it as the first line), `Total Charges` (`service_charge` total: production services only), `Total Payments`
(`payment_credit` total), `Total Adjustments` (`adjustment_amount` total, signed), `Balance` (= previous balance +
`amount` total = previous + Total Charges - Total Payments + Total Adjustments), all `financial_patient`.

Grouping: `fixed_outer` = patient (sorted by sort name, `patient_id`); with `itemize_by_visit` a level `service_date`
with subtotal. Page break: per patient. Summary cards (screen, block totals of `lines`): `total_charges`
(`service_charge`), `total_payments` (`payment_credit`); the number of super bills is shown in the run status.

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
| S-6 | Basis and scope of the legacy `Previous Balance`: before the DOS range or before the transaction date; the patient's balance at the working office or at all offices (and is the all-office balance printed anywhere)? | Live tool: patient with a prepayment linked to a later DOS and activity at two offices |
| S-7 | Where does a contract-billing line (`ACBIL` / `ACBILO`) print, and in which total (Charges or Adjustments)? | Live tool: super bill of a patient on a payment plan |

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

<!-- PARITY:ledger_reports.r04:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Option rules: office_group enabled when false. Office versus Office Group. The Office Group option is greyed on Routing Slip and the four Ledger reports (mode locked to office); the whole control is greyed on Referral Source List. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 - greyed out | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | Enabled when: false. 108 = id of the office the user was working in. Locked: forced_when true -> office_ids = working_office (stated for the category; no vendor screenshot of this report). On this report the office is the printing office only: allocations are computed per account (rpt_fifo_allocations p_unit = account, data card 2.13) and every allocation line prints its own credit office and allocation office, because a payment entered at one office can pay a charge of another. Whether the legacy report restricts credits to the working office is unknown (report INFERRED): confirm on the live tool (A-2). |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive, office-local; date_basis fixed created_date (04 7.2 row 22, inferred: entry date of the credit, as on the other allocation reports) applied to rpt_payment_allocations.credit_created_date. A migrated credit whose created_at is not reliable (created_at_reliable = false until the created-date backfill, DATA-10) is matched on credit_transaction_date instead and the run prints that availability warning. Default today. Enhanced with presets (previous_month, year_to_date). |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Inclusive end of the credit created-date range. Default today. Allocations are computed as of date_to (p_as_of = date_to). |
| RESPONSIBLE PARTY | Responsible Party (text_input) | shown: [responsible party open at capture] | `account_id` | entity_single | - | `current_account` | replicated | One responsible party = one guarantor account (accounts.id), shown as Last, First; the p_account_ids argument of rpt_fifo_allocations. Pre-filled with the account of the patient in context (token current_account). Always required (shared rule). Setting it needs class phi_identified. |
| RESPONSIBLE PARTY | SEARCH (button) | - | `account_id.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `office_scope` | forced_when | true | {"office_ids": {"token": "working_office"}} | shown - Lock of the four Ledger reports: always the working office. |
| `account_id` | required_when | true | - | shown - One account per run. |
<!-- PARITY:ledger_reports.r04:END -->

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
| Datasets | `rpt_fifo_allocations(tenant, p_account_ids = [:account_id], p_as_of = greatest(:date_to, max(transaction_date) of the account's credit legs whose created date is in the range), p_unit = 'account')` (the function cuts legs by leg date, so a credit entered in the range but post-dated after `date_to` would otherwise be missing; the allocation is then computed as of that later date and the run prints `availability[]` code `allocation_as_of_extended` naming the date) (P1; from P2 the persisted rows of `rpt_payment_allocations` for that account, DATA-26), `rpt_ledger_entries` (credit and debit attributes, check number, `carrier_id` of an insurance credit), `rpt_claim_facts` / `rpt_insurance_coverage` (`carrier_name` for that `carrier_id`), `rpt_charges` (tooth, surface), `rpt_patient_dim`, `rpt_provider_dim`, `rpt_office_dim`, `rpt_transaction_code_dim`, `rpt_ar_open_items()` (option) |
| Population | allocation rows whose `credit_entry_id` is a credit leg of the account with `credit_created_date BETWEEN :date_from AND :date_to`; a migrated credit with `created_at_reliable = false` is matched on `credit_transaction_date` (availability warning `created_date_substituted`) |
| Allocation lines | `method <> 'unallocated'`: `debit_entry_id` → charge attributes, `service_date`, `procedure_code`, `allocation_provider_id` (NULL = `Unassigned provider`), `allocation_office_id`, `allocation_date`, `amount`, `method` label (`explicit` = user split, `adjustment_target`, `remittance_line` = insurance line, `refund_link`, `transfer_pair`, `derived_fifo` = oldest first) |
| Remainder | `method = 'unallocated'` row: `amount`, `unallocated_reason` (`credit_balance` on derived rows) |
| Targets that are not charges | `allocation_target` `debit_adjustment`, `refund`, `opening_balance`, `transfer` print with their own description (finance charge, refund, previous balance, transfer) |
| Date basis | `created_date` of the credit (04 7.2 row 22, inferred) |
| Office attribution | credit office (`credit_office_id`) and allocation office (`allocation_office_id`) both printed; no office filter |
| Provider attribution | credited provider of the credit (`credit_provider_id`) on the credit line; producing provider (`allocation_provider_id`) on allocation lines (PD-7) |
| Availability | READY (derived for history). Every migrated allocation is `derived_fifo`, `transfer_pair` or `unallocated` and will not reproduce what the legacy tool allocated at entry time (data card 2.13). The derived rule is account-wide oldest-first (`rpt_fifo_core` orders every debit of the unit by age); the legacy rule applies a patient payment FIFO by patient, then provider, and an adjustment to its patient, provider and location, so derived results differ from the legacy allocation for migrated history and for app payments without a user split until DATA-26 implements the legacy rule (`availability[]` code `allocation_rule_account_fifo`, A-6); app payments are real links only when split by the user, for remittances and refunds with a source, until DATA-26. Created date on migrated credits: REPAIR(10) (backfill). The result is a recomputation as of `date_to`: a later back-dated entry changes it. The definition prints "Allocation derived (oldest first)" whenever a derived row is listed |

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
| `payer_name` | Payer Name | text (carrier name of an insurance credit; blank for patient credits) | `aggregate` | group header |
| `tender_label` | Tender | text (`tender_class` → label) | `aggregate` | group header |
| `check_number` | Check # | text | `payment_instrument` (dropped for callers without the class, F-8) | group header |
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
| hidden: `derived_applied_amount` | | money (`applied_amount` of rows with `is_derived`, else 0) | `financial_patient` | sum |
| hidden: `derived_share` | | percent, `computed` `ratio(derived_applied_amount, applied_amount)` | `financial_patient` | `ratio` (grand total backs the `derived_share` card) |
| hidden: `allocation_id` (row id), `credit_entry_id`, `debit_entry_id`, `account_id`, `debit_patient_id`, `is_derived`, `unallocated_reason` | | | entity classes | |

Grouping: level 1 = credit (`credit_entry_id`, header = the credit columns, subtotal `Allocated` / `Unallocated`), sorted
by `credit_created_date`, `credit_entry_id`; rows by `service_date`, `allocation_id`. Grand total: `Credits`,
`Allocated`, `Unallocated` (invariant: `Allocated + Unallocated = Credits`, R-06).

Block `open_items` (`report_end`, option `include_open_items`): `DOS Date`, `Patient Name`, `Office`, `Code`, `Th`,
`Surf`, `T`, `Description`, `Provider`, `Current`, `Over 30`, `Over 60`, `Over 90`, `Over 120`, `Balance`,
`Contract Adjustments` (the documented `Aging Detail` columns), money `financial_patient`; totals per bucket.
`contract_adjustments` (Contract Adjustments) is APP and empty until DATA-37 writes the contract movement credit (no
open-item column carries it today: NEW column of `rpt_ar_open_items`, owner 03_data_foundation.md section 2.14).

Summary cards (block totals of `allocations`): `credits_total` (`credit_amount`), `allocated_total` (`applied_amount`),
`unallocated_total` (`unallocated_amount`), `derived_share` (`derived_share` ratio total: share of the allocated amount
that is derived). Page break: none.

### Visuals and drill-through

Optional bar: allocated amount by `allocation_provider_short_id` (`charts[]` hint, `top_n` 10) - shows which provider the
family's money credited. Money grouped by a named provider: the series is class `provider_comp` (08 rule 3) and the chart
is removed for callers without it. Drill: an allocation line → `kind = record` `patient_ledger` (the charge); a credit
header → `patient_account_ledger` (the payment); `Unallocated` subtotal of a credit → `kind = record`
`patient_account_ledger` with that credit highlighted (`monthly.unallocated_payment_adjustments` has no account or
responsible-party parameter, so a drill there would not reconcile to the clicked figure); provider bar → none.

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
| A-3 | Which date the range filters (entry date assumed, 04 7.2 row 22); is a credit entered in the range but post-dated after `End Date` listed, and as of which date is it allocated? | Live tool: payment entered today and back-dated, and one post-dated |
| A-4 | Does the legacy report list unallocated remainders and non-charge targets? | Live tool |
| A-5 | Product: show derived allocations for migrated history with the warning (proposed) or refuse ranges before the migration date | Product owner |
| A-6 | Should `rpt_fifo_core` order a patient payment's targets per patient, then provider (the documented legacy rule) instead of account-wide oldest-first, and apply adjustments to their own patient, provider and location? | 03_data_foundation.md section 2.13 owner (DATA-26) |

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-LEDGER-01 | Ledger family skeleton: four definitions with report keys, legacy names and aliases, right family `ledger`, office lock (`allowed_modes`, unconditional `forced_when`), patient-context defaults, `schedulable: false`, `cacheable: false`, `legacy_actions[]` | P1 | S | ENG-03, ENG-05, FLT-03, FLT-16, SEC-03 | `GET /reports/catalog` lists the four `ledger.*` entries in legacy order with their aliases; a request with `office_group_id` answers 422; `office_ids` other than the working office is replaced by the working office and echoed; definition lint passes against `catalog/parity/ledger_reports.parity.json` |
| RPT-LEDGER-02 | Shared per-account ledger builder: live legs of one account or patient, line description and code resolution (procedure, payment, adjustment, system alias), opening (previous) balance before `date_from`, running balance window, `T` (P / C) and `Bill` derivation, claim and non-financial rows | P1 | M | DATA-06, DATA-07, DATA-21, DATA-52, ENG-59 | For every fixture account the closing balance of the builder equals `GET /patients/{id}/account-balance` and the account-ledger feed of the screen (R-02, R-03); the builder query of one account is index-driven (plan attached) and returns in under 300 ms on the UAT database |
| RPT-LEDGER-03 | Patient Print launcher entries and compact print dialog for Walkout Report, Superbill, Patient Ledger, Account Ledger (preset `report_type`, read-only person, hidden `account_id` / `patient_id` from context, dialog-only options), Scheduler appointment menu entry for the walkout (`account_id` of the appointment's patient, appointment date, opt-in `appointment_id`) | P1 | S | UX-29, FLT-16, UX-07 | From the patient shell each of the four items opens the dialog with the patient's account or name resolved; a Walkout or Super Bill from context prints only the account / patient in context even when another guarantor or patient has the same or a longer name starting with it; PRINT / PREVIEW produces the same snapshot as the hub form with the same values; the "Coming Soon" alert is gone |
| RPT-LEDGER-04 | `add_patient_note` post-render hook: after a PDF artifact of `ledger.ledger_report` or `ledger.walkout_report` is complete, call the patient-notes handler once per patient: ledger = every patient of the run; walkout = the patient in context, or for a name-range run every account member with an activity line; idempotent per `(run_id, artifact_id, patient_id)`, audited as an action | P1 | S | ENG-22, ENG-14, NEW post-render hook in 02 section 3.10 | Printing twice from the same run writes one note; a failed render writes none; the note text names the document and the date range; the audit event lists the note id |
| RPT-LEDGER-05 | Letterhead and logo handling for the family on the `slip` and `banded_table` layouts: office letterhead block, logo from object storage, logo suppressed on Super Bill, `sectioned_page_numbers` per document | P1 | S | ENG-23, ENG-25, ENG-60 | Walkout and Ledger PDFs show the office logo; Super Bill shows none; a 30-account walkout run numbers pages per walkout |
| RPT-LEDGER-06 | Family reconciliation tests: Ledger closing balance = account balance; Walkout `Total Balance for the Account` = ageing grid `Total Balance` = account balance as of `date_to`; Account Allocation per-credit allocated + unallocated = credit amount (R-06) | P1 | M | ENG-17, DATA-07, DATA-20 | The suite runs on the PostgreSQL tier over fixture accounts covering a split payment, a prepayment, a refund with source payment, a transfer pair, two offices and an insurance remittance; all equalities hold to the cent |
| RPT-LEDGER-07 | Live legacy verification pass for the family: F-1, F-2, F-3, F-5, F-7 and the per-report questions L-*, W-*, S-*, A-* (Patient Ledger panel, Print all transactions effect, dialog wording and defaults, walkout message pre-fill, office filter, Account Allocation output) | P1 | S | FLT-23 | Every question has a recorded answer with a screenshot reference; the decisions file is updated and `build_parity.py` prints PARITY VALID; INFERRED layouts are either confirmed or changed |
| RPT-LEDGER-08 | Align the existing patient ledger PDF `GET /patients/{id}/reports/ledger` (`render_ledger`) with the engine builder: same rows and balances, soft-deleted claims excluded (PRINT-13), then point `LedgerPage` Print at `ledger.ledger_report` and keep the old route as an adapter | P1 | S | RPT-LEDGER-02, ENG-35 | For 20 sampled accounts the old route and `ledger.ledger_report` print the same lines and closing balance; no soft-deleted claim prints |
| RPT-LEDGER-09 | Family parity default tests, criteria echo strings and security review: default `params` equal the parity defaults; starred option notes; class matrix (no `phi_identified` → 403; no `financial_patient` → documents without amounts, rule 5, until F-4 decides otherwise; no `payment_instrument` → Check # dropped, F-8) | P1 | S | FLT-20, FLT-18, SEC-24, SEC-14 | Tests pass per report; the PDF footer prints the echo of the shared-rules table; a principal without `financial_patient` gets the ledger without money columns; a front-desk principal without `payment_instrument` gets the walkout without the Check # column |
| RPT-LEDGER-10 | `ledger.ledger_report` definition: both `report_type` variants, `opening` block (previous balance outside the column totals), running balance, `T` / `Bill` / `A` derivations, `has_note` / `has_eob` columns (NEW sources, 03), Print all transactions rows (statements, notes, claims, with their population and date rules), `sort_by`, `transaction_types`, voided and archived options, `balance_summary` block, drills | P1 | M | RPT-LEDGER-02, DATA-52, DATA-21, ENG-11, ENG-30 | Fixture account with two members: account ledger closing balance = account balance, patient ledger closing balance = patient balance; Print all transactions adds exactly the statement, note and claim rows of the fixture without changing any balance; `patient_ledger` without `patient_id` answers 422 |
| RPT-LEDGER-11 | Ledger Report outputs: landscape `banded_table` PDF with letterhead and echo, XLSX (Ledger, Summary, Criteria sheets), CSV | P1 | S | ENG-23, ENG-27, ENG-15, RPT-LEDGER-05 | A 3,000-line account renders in under 10 s; XLSX opens without repair prompts and the running balance column equals the screen |
| RPT-LEDGER-12 | `ledger.walkout_report` definition: name-range population, activity-line office filter, previous balance, totals, ageing grid from `rpt_ar_open_items` (`legacy` bucket set), aged message choice, next-appointment block, column variants of the two options, hidden `account_id` population and opt-in `appointment_id`, `Activity at other offices` line, P1 contract balances from the payment-plan service with the `contract_balance_stored` warning | P1 | L | RPT-LEDGER-02, DATA-20, DATA-16, FLT-16 | Fixture account: `Total Balance for the Account` = `Account Balance` = ageing `Total Balance` = account balance as of `date_to`; Previous Balance + Total of Today's Activity + Activity at other offices = Total Balance, and no column total contains the previous balance; each of the four option combinations yields the documented column set; an account without a future appointment prints no next-appointment block |
| RPT-LEDGER-13 | Walkout `slip` PDF layout: logo, header box, long date, line table variants, totals, ageing grid with contract balances, Messages / Comments boxes, next-appointment table, `record_per_page` volumes, multi-account run criteria page | P1 | M | ENG-25, RPT-LEDGER-05 | Side-by-side with the 2022 / 2023 vendor samples every documented area is present in the same order; a 150-account end-of-day run produces one file with page numbers per walkout |
| RPT-LEDGER-14 | Walkout signatures: `Card Holder Signature` and `Dentist Signature` captured through `src/features/signature/` (`SignatureCapture`) in the viewer and stamped into the stored PDF artifact; `show_signature_lines` for paper | P2 | M | RPT-LEDGER-13, ENG-22 | A signed walkout is stored as a new artifact version with both images and the signer time; the unsigned artifact stays in run history |
| RPT-LEDGER-15 | Walkout contract balances on `rpt_payment_plan_contracts` / `rpt_contract_installments` instead of the per-patient service | P2 | S | DATA-37, RPT-LEDGER-12 | `Reg Cont. Bal.` / `Ort Cont. Bal.` equal the remaining amounts of the fixture contracts; the per-patient service call is removed from the builder |
| RPT-LEDGER-16 | `ledger.super_bill` definition: patient name-range population and hidden `patient_id`, DOS basis on `service_date_effective`, `transaction_types` members (contract billing under Adjustment), office filter, previous-balance line on the lines' basis and office rule, billing identity and coverage blocks, totals from the hidden member columns, `Payment receipt` saved view | P1 | M | RPT-LEDGER-02, DATA-21, FLT-16 | Fixture patient: Payments only lists every payment of the range and no charge; three ticks = no predicate (canonical `all` in `params`); a payment linked to a charge of the range prints under that DOS and is not in Previous Balance; Previous Balance + listed lines = Balance; a refund nets in Total Adjustments, not in Total Charges |
| RPT-LEDGER-17 | Super Bill `slip` PDF layout without logo, claim-attachment header, per-patient documents; XLSX and CSV | P1 | S | ENG-25, ENG-27, RPT-LEDGER-05 | PDF shows billing provider name and NPI, no logo; a caller without `security_users` sees the form without tax id (until F-6 is decided) |
| RPT-LEDGER-18 | `ledger.account_allocation` definition on `rpt_fifo_allocations` for one account: credit groups, allocation and remainder rows, method labels, created-date filter with the transaction-date fallback, open-items trailer, provider chart, drills | P1 | M | DATA-20, ENG-59, ENG-11 | For every fixture credit `Allocated + Unallocated = Credit Amount` (R-06); a derived row prints the derived note and the `allocation_rule_account_fifo` warning; a credit entered in the range but back-dated before it is listed; a credit entered in the range but post-dated after `date_to` is listed with the `allocation_as_of_extended` warning; the provider chart is absent for a caller without `provider_comp` |
| RPT-LEDGER-19 | Account Allocation on persisted allocations (`rpt_payment_allocations`, DATA-26): real methods and `unallocated_reason` for app payments, no recomputation for app rows | P2 | S | DATA-26, RPT-LEDGER-18 | An app payment split by the user prints `explicit` rows; a parked prepayment prints `Unallocated - prepayment`; the run of the same parameters is unchanged after a later back-dated entry for app rows |

<!-- ASSEMBLED from catalog/parts/ledger_reports/ (00_header.md, 10_reports.md). Edit this document directly from now on. -->
