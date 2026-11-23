# Ledger Reports - report specifications

Per-account and per-patient financial documents printed at the front desk: the account or patient ledger, the check-out receipt (Walkout), the self-filing super bill and the payment-allocation trail of one account. They are documents about one responsible party or one patient, not practice roll-ups.
New home: hub group **Financial › Ledger** at `/reports/c/ledger` (brief section 1, 07 section 1), plus the patient Print launcher (07 section 1.7, UX-29). Default phase **P1** for all four reports.

## Overview

Legacy order of the SELECT REPORT list (control index `legacy/index/ledger_reports.controls.json`): r01 Ledger Report, r02 Walkout Report, r03 Super Bill, r04 Account Allocation.

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `ledger.ledger_report` | Ledger Report | Ledger lines of one guarantor account (Account Ledger) or one patient (Patient Ledger) for a transaction-date range, with running balance | P1 | M | READY ("Print all transactions": statement lines APP from `patient_statements`; ledger notes from `account_notes`, migrated rows exist) | PARTIALLY DOCUMENTED (line content documented, printed layout INFERRED) |
| `ledger.walkout_report` | Walkout Report | Check-out receipt "Statement of Services Rendered": the day's activity, account balance and ageing, messages, next appointment, one per responsible party | P1 | L | READY (contract balances: APP; read from the payment-plan service until DATA-37, P2) | DOCUMENTED (2022 and 2023 vendor samples) |
| `ledger.super_bill` | Super Bill | Itemised services, payments and adjustments of one patient by date of service, with the office billing identity, for a self-filed claim or a tax receipt | P1 | M | READY | PARTIALLY DOCUMENTED (definition and options documented, printed layout INFERRED) |
| `ledger.account_allocation` | Account Allocation | Where each payment and credit adjustment of one account went: allocation lines to charges plus the unallocated remainder | P1 | M | READY (derived oldest-first for history and for app payments without a split until DATA-26, P2) | INFERRED |

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
| `account_id` | `entity_single` | Ledger Report (`account_ledger`), Account Allocation | `current_account` | One guarantor account (`accounts.id`); typeahead plus search dialog replace the SEARCH button (superseded). Needs `phi_identified` to set (08 5.2 rule 8) |
| `patient_id` | `entity_single` | Ledger Report (`patient_ledger`) | `current_patient` | Vendor-documented parameter of 04 9.7 without a captured control; visible and required when `report_type == patient_ledger` |
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
| Super Bill | Billing identity (office address, `billing_provider_id`) and line filter: office of service for services, transaction office for credits [I] | `service_date` (row 21, documented: "DOS Date Range"), bound to `service_date_effective` | each patient in the patient name range with at least one printed line | Previous Balance line (option): the patient, all offices |
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
user labels on a line `aggregate` (operational attributes, rule 12; no provider-grouped money block exists in this family,
so rule 3 does not apply); subscriber and member ids on the Super Bill `phi_sensitive`. A caller without
`financial_patient` receives a list without amounts (rule 5) - for these documents the definition refuses the run instead
with 403 `data_class_denied`, because a ledger without money is meaningless (declared through `key` on the `amount`
column; open question F-4). Every run, print and export writes the patient manifest (ENG-14, SEC-09); the existing
`record_print` PRINT audit row is no longer needed for these documents.

**Patient-context entry** (dynamic rules d01 of r01-r03). The patient Print launcher (07 1.7) lists `Walkout Report`,
`Superbill`, `Patient Ledger`, `Account Ledger` (legacy print-menu order) and opens the compact print dialog of the
runner on the same definition: the person parameter is resolved from `context.patient_id` and not editable, the date
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
| F-4 | Refuse a run without `financial_patient` (proposed) or deliver the documents without amounts (08 rule 5 default)? | 08_security_compliance.md owner |
| F-5 | Are voided transactions printed (struck through, as on the ledger screen) or omitted? | Live tool (research: `[unverified]`) |
| F-6 | Billing provider tax id on the Super Bill is class `security_users` under the provider-registration rule of 08 2.3; a front-desk role would lose it | 08_security_compliance.md owner (exemption for the billing identity on claim documents) |

<!-- WORK-ITEMS -->
| RPT-LEDGER-01 | Ledger family skeleton: four definitions with report keys, legacy names and aliases, right family `ledger`, office lock (`allowed_modes`, unconditional `forced_when`), patient-context defaults, `schedulable: false`, `cacheable: false`, `legacy_actions[]` | P1 | S | ENG-03, ENG-05, FLT-03, FLT-16, SEC-03 | `GET /reports/catalog` lists the four `ledger.*` entries in legacy order with their aliases; a request with `office_group_id` answers 422; `office_ids` other than the working office is replaced by the working office and echoed; definition lint passes against `catalog/parity/ledger_reports.parity.json` |
| RPT-LEDGER-02 | Shared per-account ledger builder: live legs of one account or patient, line description and code resolution (procedure, payment, adjustment, system alias), opening (previous) balance before `date_from`, running balance window, `T` (P / C) and `Bill` derivation, claim and non-financial rows | P1 | M | DATA-06, DATA-07, DATA-21, DATA-52, ENG-59 | For every fixture account the closing balance of the builder equals `GET /patients/{id}/account-balance` and the account-ledger feed of the screen (R-02, R-03); the builder query of one account is index-driven (plan attached) and returns in under 300 ms on the UAT database |
| RPT-LEDGER-03 | Patient Print launcher entries and compact print dialog for Walkout Report, Superbill, Patient Ledger, Account Ledger (preset `report_type`, read-only person, dialog-only options), Scheduler appointment menu entry for the walkout | P1 | S | UX-29, FLT-16, UX-07 | From the patient shell each of the four items opens the dialog with the patient's account or name resolved; PRINT / PREVIEW produces the same snapshot as the hub form with the same values; the "Coming Soon" alert is gone |
| RPT-LEDGER-04 | `add_patient_note` post-render hook: after a PDF artifact of `ledger.ledger_report` or `ledger.walkout_report` is complete, call the patient-notes handler once per patient (ledger) or account guarantor (walkout), idempotent per `(run_id, artifact_id, patient_id)`, audited as an action | P1 | S | ENG-22, ENG-14, NEW post-render hook in 02 section 3.10 | Printing twice from the same run writes one note; a failed render writes none; the note text names the document and the date range; the audit event lists the note id |
| RPT-LEDGER-05 | Letterhead and logo handling for the family on the `slip` and `banded_table` layouts: office letterhead block, logo from object storage, logo suppressed on Super Bill, `sectioned_page_numbers` per document | P1 | S | ENG-23, ENG-25, ENG-60 | Walkout and Ledger PDFs show the office logo; Super Bill shows none; a 30-account walkout run numbers pages per walkout |
| RPT-LEDGER-06 | Family reconciliation tests: Ledger closing balance = account balance; Walkout `Total Balance for the Account` = ageing grid `Total Balance` = account balance as of `date_to`; Account Allocation per-credit allocated + unallocated = credit amount (R-06) | P1 | M | ENG-17, DATA-07, DATA-20 | The suite runs on the PostgreSQL tier over fixture accounts covering a split payment, a prepayment, a refund with source payment, a transfer pair, two offices and an insurance remittance; all equalities hold to the cent |
| RPT-LEDGER-07 | Live legacy verification pass for the family: F-1..F-5 and the per-report questions L-*, W-*, S-*, A-* (Patient Ledger panel, Print all transactions effect, dialog wording and defaults, walkout message pre-fill, office filter, Account Allocation output) | P1 | S | FLT-23 | Every question has a recorded answer with a screenshot reference; the decisions file is updated and `build_parity.py` prints PARITY VALID; INFERRED layouts are either confirmed or changed |
| RPT-LEDGER-08 | Align the existing patient ledger PDF `GET /patients/{id}/reports/ledger` (`render_ledger`) with the engine builder: same rows and balances, soft-deleted claims excluded (PRINT-13), then point `LedgerPage` Print at `ledger.ledger_report` and keep the old route as an adapter | P1 | S | RPT-LEDGER-02, ENG-35 | For 20 sampled accounts the old route and `ledger.ledger_report` print the same lines and closing balance; no soft-deleted claim prints |
| RPT-LEDGER-09 | Family parity default tests, criteria echo strings and security review: default `params` equal the parity defaults; starred option notes; class matrix (no `phi_identified` → 403; no `financial_patient` → per F-4; no `payment_instrument` → Check # dropped) | P1 | S | FLT-20, FLT-18, SEC-24, SEC-14 | Tests pass per report; the PDF footer prints the echo of the shared-rules table; a front-desk principal without `payment_instrument` gets the walkout without the Check # column |
<!-- /WORK-ITEMS -->
