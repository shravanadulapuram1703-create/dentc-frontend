## Payment Plan Charges - `management.payment_plan_charges`

Management Reports, screenshot `1.PNG` - P2 - M - `reports_management_reports_screen_view_only` / `_full_control` - interactive - INFERRED (report output); the generation and posting workflow is DOCUMENTED

### Purpose

The billing clerk or office manager runs it on the morning of a billing day (or before the monthly contract run) to see
which regular payment-plan and ortho-contract instalments fall due, check card-on-file contracts before the processor
charges them, and decide what to post through the contract posting screen (legacy Utilities > Generate Contract Charges).
After posting it is the record of what was meant to hit ledgers and insurance claims on that date. Old menu name
`Regular Payment Plan Charges Report` (2020); PLAN TYPE `Ortho` was added later (research 2.8).

### Legacy output

No vendor sample or description of the printed report exists (research 9). Everything below is INFERRED from the criteria
screen and the documented posting workflow (`Show Periodic Charges as of`, the three ortho posting lists, the `Bill Date`
per row, the `Val` card validation) and must be confirmed on the live tool.

| Element | Content | Confidence |
|---|---|---|
| Title | `Payment Plan Charges` (`Regular Payment Plan Charges` / `Ortho Payment Plan Charges` per PLAN TYPE is likely, unconfirmed) | INFERRED |
| Rows | One line per contract instalment due: bill date, patient (id, name), responsible party, contract reference, provider, periodic billing amount, remaining contract balance, payments left, credit-card-on-file flag | INFERRED |
| Sections | `Regular`: one list. `Ortho`: one section per plan side (patient, primary insurance, secondary insurance), mirroring the three posting lists; the insurance sections add the carrier | INFERRED |
| Totals | Subtotal per section and per office; grand total of periodic amounts and count | INFERRED |
| Footer | `Billing Date`, `Office(s)`, `Plan Type`, ortho parts | INFERRED from the family furniture |

Sign convention: instalment amounts positive (they are what will be charged). Known quirks kept: contracts keep their
balance off the ledger until an instalment posts (research 7 rule 11), so this report, not the aging, shows what is still
to be billed. Deliberately fixed: the app never posted the "balance moved to contract" credit, so instalment billing can
debit A/R twice (data card 2.25); DATA-37 adds the credit and the report prints a warning per contract until check #33 /
#34 are clean.

### Parameters - legacy parity

<!-- PARITY:management_reports.r01 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | File rendered as PDF from the snapshot; the screen result is shown first |
| PRINT FORMAT `Excel` | Flat XLSX sheet, one instalment per row with repeated key columns; `csv` added |
| OFFICE/GROUP `Office` (default) + picker (default the working office) | Instalments of contracts whose office (`rpt_contract_installments.office_id`) is in the resolved office list |
| OFFICE/GROUP `Office Group` + picker | Same, offices of the selected group(s) |
| REPORT DATE `Billing Date` (default today) | Instalments with `due_date <= billing_date` and `NOT is_billed` (due as of the date and not yet posted; INFERRED "as of" reading of `Show Periodic Charges as of`) |
| PLAN TYPE `Regular` (default) | `contract_kind = 'regular'`: instalments of `patient_payment_plans`; one list; the three ortho boxes are disabled and have no effect |
| PLAN TYPE `Ortho` | `contract_kind = 'ortho'`: instalments of `ortho_plans` for the plan sides chosen below, one section per side |
| `Ortho Patient` ticked | `plan_side = 'patient'` included (patient-portion periodic charges) |
| `Ortho Primary` ticked | `plan_side = 'ins'` included (primary-insurance periodic charges) |
| `Ortho Secondary` ticked | `plan_side = 'sec_ins'` included (secondary-insurance periodic charges) |
| none of the three ticked (legacy default) | No plan-side restriction: all three sides (`ortho_plan_parts` `min_items 0`, `full_selection no_predicate`; meaning of the empty group unconfirmed, filter card 2.5) |
| all three ticked | All three sides (no predicate) |

Dependency rules: `ortho_plan_parts` `enabled_when ["eq", "plan_type", "ortho"]` (inferred: greyed in the capture with
Regular, Ortho is the only other value); disabled value `[]`. No other rule.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `installment_state` | `enum` NEW: `unposted`, `posted`, `all` | `unposted` (the inferred legacy population) | `posted` lists instalments posted for the billing date (`is_billed` and the posted charge's `service_date = billing_date`): the after-posting record; `all` both |
| `overdue_only` | `boolean` NEW | `false` | Only instalments with `due_date < billing_date` - the backlog the unscheduled posting sweep leaves (data card 2.25: unposted instalments are an exception list) |
| `card_on_file` | `enum` NEW: `all`, `yes`, `no` | `all` | Splits processor-charged contracts from those that need a statement or a call; legacy twin: Patients on Payment Plan `CREDIT CARD ON FILE` |
| `provider_ids` | `entity_multi` (shared dictionary 3.2), `provider_role` contract provider | `all` | Contracts of selected ortho providers; regular plans match only under `all` (no provider on the header) |
| `due_window_days` | `integer` NEW, 0-31 | `0` | Look-ahead: also lists instalments due up to N days after `billing_date` (week-ahead card-processing check) |

### Data

| Item | Rule |
|---|---|
| Rows | `rpt_contract_installments` (one row per instalment of `patient_plan_installments`, `patient_ins_payment_plans`, `patient_sec_ins_payment_plans`): `installment_key`, `patient_id`, `contract_kind`, `plan_side`, `ortho_plan_id`, `payment_plan_id`, `office_id`, `provider_id`, `due_date`, `periodic_amount`, `periodic_order`, `is_billed`, `charge_id`, `has_card_on_file` |
| Contract header | `rpt_payment_plan_contracts` joined on `payment_plan_id` / `ortho_plan_id` (unique): `contract_key`, `setup_date`, `total_amount`, `pat_periodic_amount`, `pat_payments_total`, `pat_payments_remaining`, `pat_amount_remaining`, `ins_periodic_amount`, `ins_payments_total`, `ins_payments_remaining`, `ins_amount_remaining` (recomputed, never the stale stored `rem_*`), `is_active` |
| Patient and account | `rpt_patient_dim` (`chart_no`, names, `account_id`, `preferred_provider_id`), `rpt_account_dim` (guarantor name, `home_office_id`) |
| Posted state | `rpt_charges` on `charge_id` (`service_date` = posting date, `charged_fee`) for `installment_state = posted` |
| Carrier of an insurance side | NEW: the ortho contract has no carrier column in the data card. Needed: the plan of the coverage slot behind `plan_side` (`ins` = primary, `sec_ins` = secondary) through `rpt_insurance_coverage`; owner 03 section 2.25 (DATA-37 scope) |
| Parameter application | `office_scope` -> `office_id IN (...)`; `billing_date` -> `due_date <= :billing_date` (plus `due_window_days`); `plan_type` -> `contract_kind`; `ortho_plan_parts` -> `plan_side IN (...)` mapped patient -> `patient`, primary -> `ins`, secondary -> `sec_ins`; `installment_state` -> `is_billed`; `card_on_file` -> `has_card_on_file`; inactive contracts (`is_active = false`) excluded |
| Date basis | `due_date` (legacy Bill Date / Periodic Date), office-local calendar date |
| Attribution | Office: contract office. Provider: ortho `pref_provider_id`; regular plans show the patient's preferred provider (label only, never a filter) |
| Availability | Coverage matrix #26: **APP** - no ortho contract, regular plan or instalment was migrated. Blocked by DATA-37 (dataset, `ledger_id varchar(50)` on the two insurance instalment tables so that insurance-side posting works on PostgreSQL, contract id on the charge, the `contract_movement` credit). Without DATA-37 the Ortho Primary / Secondary sections cannot show a posted state |
| Cannot be produced for history | Any contract or instalment before go-live; "paid versus due" per instalment (no payment-to-instalment link exists) |
| Warnings (`availability[]`) | `contracts_app_era_only`; `contract_double_billing` per contract listed by checks #33 / #34 |

### Output

Block `installments` (one block; for `plan_type = ortho` the plan side is the inner group level):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `due_date` | Bill Date | date | `phi_identified` | none |
| `chart_no` | Patient ID | text | `phi_identified` | none |
| `patient_name` | Patient | text (`Last, First`) | `phi_identified` | count of rows per group and grand |
| `responsible_party_name` | Resp. Party | text | `phi_identified` | none |
| `contract_ref` | Contract | text (`contract_key` label: plan type and setup date) | `phi_identified` | none |
| `provider_name` | Provider | text | `aggregate` | none |
| `carrier_name` | Carrier | text | `aggregate` | none; `visible_when ["eq", "plan_type", "ortho"]`, empty on the patient side |
| `periodic_order` | Pmt # | integer (`n of N` with `payments_total`) | `phi_identified` | none |
| `periodic_amount` | Periodic Amt. | money | `financial_patient` | sum per side, per office, grand |
| `payments_remaining` | Pmts Left | integer | `financial_patient` | none |
| `amount_remaining` | Rem. Contract Bal. | money | `financial_patient` | sum per side, per office, grand |
| `has_card_on_file` | CC On File | boolean (`Y` / blank) | `phi_identified` | count of `Y` |
| `posted_on` | Posted | date (posted charge's `service_date`) | `phi_identified` | none; `visible_when ["ne", "installment_state", "unposted"]` |
| `installment_key`, `patient_id`, `account_id`, `payment_plan_id`, `ortho_plan_id`, `office_id`, `charge_id` | hidden | id | `phi_identified` | row id `installment_key` |

| Item | Rule |
|---|---|
| Group levels | `fixed_outer` office (`when ["ctx", "multi_office"]`, header `Office : {office_name}`, subtotal); `plan_side` (Ortho only; headers `Ortho Patient`, `Ortho Primary Insurance`, `Ortho Secondary Insurance`; subtotal); grand total `Total` |
| Sort | `default_sort`: `due_date`, patient sort name, `periodic_order`, `installment_key` |
| Page break | `page_break_options`: `none` (default), `office` |
| Summary cards | count of instalments, `periodic_amount` total, count with card on file, count overdue (`due_date < billing_date`) - all block totals of the same run |
| Metric | Reconciles with `ortho_installments_unposted_amount` (05 5.11) for `plan_type = ortho`, `ortho_plan_parts = []`, `installment_state = unposted`, `billing_date = today` |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list |
| Patient cell | `record` patient payment-plan screen (`route_key = patient_payment_plans`, entity patient), right of the payment-plan feature |
| Contract cell | `report` `lists.patients_on_payment_plan` with `plan_type` and `patient_ids = [patient_id]` (the contract header list) |
| Posted cell | `record` ledger entry of `charge_id` (`route_key = ledger_entry`) |
| Section or office subtotal | `rows`: same report filtered to that side or office |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open contract posting | bulk | `navigate` | Opens the contract posting screen of the payment-plan feature with `billing_date`, plan type and the selected contracts pre-ticked (route key NEW, requested from 07; the screen keeps its own right). The report never posts |
| Open patient | row | `navigate` | Patient shell, payment-plan tab |
| Message responsible parties | bulk | `send_sms` / `send_email` | Reminder of the coming instalment to contracts without a card on file; requires `sms_consent` / e-mail; owner: messaging feature (PD-15) |
| Export selection | bulk | `export_selection` | Full Control + `reports_export_data_files` |

Worklist: yes in practice (the pre-posting check), served as a report with bulk actions; no `kind = worklist` definition.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (13 columns), office and side bands, footer with `Billing Date`, `Office(s)`, `Plan Type`, ortho parts, `Printed :`, `Page : n of m` |
| XLSX | One sheet `installments`, typed cells, `plan_side` as a column (no section rows), no merged cells, criteria sheet |
| CSV | Main block |
| Background | Not needed (instalments of one billing date) |

### Open questions

| # | Question | Where to confirm |
|---|---|---|
| 1 | Printed columns, sections and totals of the report (no sample exists) | Live tool: run Regular and Ortho with all three boxes |
| 2 | Does Billing Date mean "due on" or "due as of" (backlog included), and are already posted instalments listed? | Live tool |
| 3 | What enables the three Ortho boxes, and what does an empty group print with PLAN TYPE = Ortho (nothing, or all sides)? | Live tool (supplement unresolved r01) |
| 4 | Does the insurance side print the carrier, and where does it come from? | Live tool; 03 for the column |
| 5 | Should the report hide contracts flagged by checks #33 / #34 or only warn? (Proposal: warn) | Product owner |

## Uncollected Copay - `management.uncollected_copay`

Management Reports, screenshot `2.PNG` - P2 - M - `reports_management_reports_screen_view_only` / `_full_control` - interactive - PARTIALLY DOCUMENTED (purpose, last payment date and amount, Financial Notes column documented; other columns and the Summary format INFERRED)

### Purpose

Run by the office manager at the end of every office day (vendor cadence: daily, end of day) to check that the front desk
collected the estimated patient portion of the day's visits and any previous balance from patients who were on the
schedule. The financial notes and the last payment tell the manager whether a payment arrangement exists. The list is
the call-back list of the next morning. It was first shipped as a client-specific report under Office Reports (research
4).

### Legacy output

| Element | Content | Confidence |
|---|---|---|
| Title | `Uncollected Copay` (Summary: `Uncollected Copay - Summary`, likely) | DOCUMENTED / INFERRED |
| Rows (Detail) | One row per patient on the schedule in the range who has a patient balance due, pre-existing or created that day | DOCUMENTED (vendor text) |
| Documented columns | last payment date, last payment amount (of the account), `Financial Notes` (the account's financial notes) | DOCUMENTED |
| Inferred columns | appointment date / time, patient id and name, responsible party, provider, the day's charges, estimated patient portion of the day, amount collected that day, prior patient balance, total patient balance | INFERRED |
| Totals | totals of the balance columns | INFERRED |
| Summary | count of patients and total uncollected per office and day | INFERRED |

Sign convention: balances and amounts owed positive; amount collected printed positive (money in). Known quirk kept:
quality depends on the insurance estimate (the patient portion is the estimate at posting). Deliberately fixed: the
balance is the canonical account balance that includes in-app insurance payments (PD-2), so a patient whose insurance has
paid in the app no longer shows a false balance.

### Parameters - legacy parity

<!-- PARITY:management_reports.r02 -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | Block `patients`: one row per scheduled patient and appointment day whose patient balance exceeds the threshold |
| REPORT FORMAT `Summary` | Block `days`: one row per office and appointment day: patients listed, estimated patient portion, collected, uncollected, total patient balance (INFERRED) |
| PRINT FORMAT `PDF` (default) / `Excel` | File rendered from the snapshot; `csv` added |
| OFFICE/GROUP `Office` (default) + picker | Appointments of the selected offices (`rpt_appointment_facts.office_id`); the balance is the whole account balance across offices |
| OFFICE/GROUP `Office Group` + picker | Same for the offices of the group(s) |
| DATE RANGE Start Date / End Date (default today / today) | `appointment_date BETWEEN date_from AND date_to` (fixed basis; inferred from "patients on the schedule") |
| OTHER OPTIONS `Patient Balance Greater Than` (default `0.00`) | Row kept when the patient-responsible balance of the patient's account as of the end of the appointment day is strictly greater than the value |

Dependency rules: none (no greyed control; supplement has no rule).

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `appointment_status_classes` | `enum_multi` NEW over `status_class` (`scheduled`, `unconfirmed`, `confirmed`, `in_office`, `completed`, `past_unresolved`, `no_show`, `cancelled`); `min_items 1`, `full_selection predicate` | every class except `cancelled` (proposal for "on the schedule", open question 2) | Lets the manager include no-shows or restrict to completed visits |
| `only_uncollected_today` | `boolean` NEW | `false` | Only rows whose `uncollected_today > 0` (the day's estimate was not collected), dropping patients who only carry an old balance |
| `provider_ids` | `entity_multi` (3.2), `provider_role = appointment` | `all` | Appointment provider filter, for a provider's own desk review |
| `balance_basis` | `enum` NEW: `appointment_day`, `run_time` | `appointment_day` | `run_time` shows the balance now (after late payments), for the next-morning call list |
| `group_by` | `enum` (3.9): `none`, `provider` | `none` | Provider band with subtotals |

### Data

| Item | Rule |
|---|---|
| Population | `rpt_appointment_facts` with `NOT is_block AND NOT is_deleted AND NOT is_legacy_archive AND NOT is_patientless`, `status_class` in `appointment_status_classes`, office in scope, `appointment_date` in range; one row per (patient, office, appointment_date) - several appointments of a patient on one day collapse into one row with the first `start_time` |
| Charges of the day | `rpt_charges` of the patient with `service_date = appointment_date` and office of the appointment, `is_production`: `day_charges = Σ charged_fee`, `day_est_patient = Σ est_patient` (always derived; k13) |
| Collected that day | `rpt_payments` with `payer = 'patient'`, same patient, `transaction_date = appointment_date`: `day_collected = -Σ amount` |
| Uncollected | `uncollected_today = greatest(day_est_patient - day_collected, 0)` per row |
| Balances | `rpt_ar_open_items(p_as_of = appointment_date end of day, or run time with balance_basis = run_time)` of the patient's current `account_id` (unit `account`, PD-4): `patient_balance` = patient portion of open debits less credits (Patient AR measure, 5.3); `prior_patient_balance = patient_balance - (day_est_patient - day_collected)` |
| Last payment | Latest `rpt_payments` leg with `payer = 'patient'` of the account on or before the as-of date, grouped by `payment_group_key`: `last_payment_date`, `last_payment_amount` (`-Σ amount` of that group) |
| Notes and party | `rpt_account_dim.financial_notes`, `guarantor_last_name`, `guarantor_first_name`; `rpt_patient_dim` names and `chart_no`; `rpt_provider_dim` label |
| Parameter application | `patient_balance_over` -> `patient_balance > :value` after the balance join; `office_scope` -> appointment office; dates -> `appointment_date` |
| Date basis | `appointment_date` (fixed), office-local |
| Attribution | Office: appointment office (the balance is account-wide). Provider: appointment provider |
| Availability | Coverage matrix #27: **READY**. Patient portion on migrated charges is derived (`est_patient = charged_fee - est_insurance`, k13); the A/R open items need DATA-20 (P1, one account) and DATA-27 for tenant-wide runs |
| Cannot be produced for history | "Collected at the desk" by tender time of day (no time stamp on migrated payments); appointment status stamps of migrated visits (a kept migrated visit is `past_unresolved`, data card 2.15) |
| Warnings | `patient_portion_derived` when the range touches migrated charges |

### Output

Detail block `patients`:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `appointment_date` | Appt Date | date | `phi_identified` | none |
| `start_time` | Time | time | `phi_identified` | none |
| `chart_no` | Patient ID | text | `phi_identified` | count per group and grand |
| `patient_name` | Patient | text (`Last, First`) | `phi_identified` | none |
| `responsible_party_name` | Resp. Party | text | `phi_identified` | none |
| `provider_name` | Provider | text | `aggregate` | none |
| `day_charges` | Today's Charges | money | `financial_patient` | sum |
| `day_est_patient` | Est. Pat. Portion | money | `financial_patient` | sum |
| `day_collected` | Collected | money | `financial_patient` | sum |
| `uncollected_today` | Uncollected | money | `financial_patient` | sum |
| `prior_patient_balance` | Prior Pat. Bal. | money | `financial_patient` | sum |
| `patient_balance` | Pat. Balance | money | `financial_patient` | sum |
| `last_payment_date` | Last Pmt Date | date | `phi_identified` | none |
| `last_payment_amount` | Last Pmt Amt | money | `financial_patient` | none |
| `financial_notes` | Financial Notes | text (wrapped) | `phi_identified` | none |
| `patient_id`, `account_id`, `appointment_id`, `office_id` | hidden | id | `phi_identified` | row id `appointment_id` |

Summary block `days`:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_name` | Office | text | `aggregate` | group key |
| `appointment_date` | Date | date | `aggregate` | none |
| `patient_count` | Patients | integer | `aggregate` | sum |
| `day_est_patient` | Est. Pat. Portion | money | `financial_practice` | sum |
| `day_collected` | Collected | money | `financial_practice` | sum |
| `uncollected_today` | Uncollected | money | `financial_practice` | sum |
| `otc_collection_pct` | Collected % | percent | `financial_practice` | `ratio(day_collected capped per row, day_est_patient)` |
| `patient_balance` | Pat. Balance | money | `financial_practice` | sum |

| Item | Rule |
|---|---|
| Group levels | `fixed_outer` office when multi-office; optional `provider` (`group_by`); Detail inner level `appointment_date` with subtotal when the range spans more than one day; grand total `Total` |
| Sort | `sort_options`: `appointment_time` (default: date, `start_time`, patient sort name), `patient_name`, `patient_balance_desc` |
| Page break | `none` (default), `office`, `date` |
| Summary cards | patients listed, `uncollected_today` total, `patient_balance` total, collected %; metric keys `uncollected_copay_amount`, `otc_collection_pct` (05 5.2) |
| Reconciliation | `reconciles_with` `uncollected_copay_amount` on the Summary grand total only with `otc_collection_window_days = 0`, one office, `appointment_status_classes` = all, and accounts with one scheduled patient per day (the metric unit is the account-office-day; the report row is the patient). The difference is listed by the reconciliation test, not hidden |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Summary: bar per day of `day_est_patient` versus `day_collected` (charts hint on block `days`) |
| Patient cell | `record` patient ledger (`route_key = patient_ledger`, `right_code` of the ledger screen) |
| `patient_balance` cell | `report` `ledger.ledger_report` with `report_type = account_ledger`, `account_id` from the row |
| `day_charges` cell | `report` `daily.daily_journal` with `patient_ids = [patient_id]`, `date_from = date_to = appointment_date` |
| Summary row | `rows`: Detail format of the same report for that office and day |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open patient | row | `navigate` | Patient shell, ledger tab, to take the payment |
| Text or e-mail balance reminder | bulk | `send_sms` / `send_email` | Requires `sms_consent`; excludes `no_auto_sms` / `no_correspondence` patients and shows the exclusion count; messaging feature |
| Create follow-up task | bulk | `create_task` | One task per account "collect patient balance", assigned to the desk |
| Balance letter | bulk | `letters` | Hand-off to the letters batch (PD-15) |
| Export selection | bulk | `export_selection` | Full Control + export right |

Worklist: yes - the next-morning call list; a `worklists.patient_ar` entry (06) can open with this report's selection.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (15 columns; `financial_notes` wraps in a wide last column), footer `From` / `Thru`, `Office(s)`, `* Patient Balance Greater Than <value>`, `Printed :`, `Page : n of m` |
| XLSX | One sheet per format block, typed money and date cells, notes as text, no merged cells, criteria sheet |
| CSV | Main block of the chosen format; formula-injection guard on `financial_notes` |
| Background | Escalates to `background` when the range exceeds 31 days (one A/R open-items call per appointment day) |

### Open questions

| # | Question | Where to confirm |
|---|---|---|
| 1 | Full printed column list and order of Detail; layout of Summary | Live tool |
| 2 | Which appointments count as "on the schedule": cancelled and missed included? | Live tool (supplement unresolved r02) |
| 3 | Is the threshold applied to the account's patient balance or to the patient's own balance? | Live tool |
| 4 | Is the balance as of the appointment day or as of the run time when run for a past range? | Live tool |
| 5 | Does Start / End Date select by appointment date (vendor text implies it) or by visit (charge) date? | Live tool |

## Audit Trail - `management.audit_trail`

Management Reports, screenshot `3.PNG` - P2 - L - `reports_management_reports_screen_view_only` / `_full_control` plus key class `user_activity` - interactive (background above 31 days or all offices) - DOCUMENTED (2017 and 2023 vendor samples; Audit Type and Module Type values not documented)

### Purpose

The owner, office manager or an auditor reviews changes to business records as needed: suspected removed or altered
transactions, back-dated entries, deleted appointments, claim status changes, reopened statements. Entries cannot be
altered by users. It is not a log of every entry or keystroke (vendor). From the patient Print launcher it audits one
patient or one family account (vendor-preferred path).

### Legacy output

Header: organisation name, `Audit Trail`; landscape. One chronological list by updated date and time; no grouping, no
totals (DOCUMENTED, samples `[V31]` `[V32]`). The 2017 sample is 14 pages for two months.

| Column group | Column | Content |
|---|---|---|
| `Updated` | `Date`, `Time` | When the change was made |
| `Updated` | `Pat Amt`, `Ins Amt` | Patient and insurance amounts after the change |
| `Original` | `Date` | Original transaction date of the record |
| `Original` | `Amt`, `Ins Amt` | Amounts before the change |
| - | `Patient ID: Name` | e.g. `768: <name>` |
| - | `Description` | Event text: `Updated Patient Information page`; `Patient re-activated by <user>`; `Edit Procedure - <description>`; `Delete Procedure - <description>`; `Delete Payment - <code>`; `Edit TranDate from <date> to <date> <procedure>`; `Edit TxPlan - <procedure>`; `Delete TxPlan - <procedure>`; `ReEstimate Txplan 1. New Fees:1`; `ClaimStatus changed from :Q to S.`; `Claim Closed :Pri Claim - Sent (0.00) Closed: ...`; `Delete Insurance Claim`; `Re-schedule Appointment`; `Unpost Appointment.`; `Delete Appointment-Created`; `Statement Unclosed - Statement Sent - $<amount>` |
| - | `Tran Amt.` | Transaction amount concerned (negative for payments and credit adjustments) |
| - | `Type` | Module: `PATIENT` / `Patient`, `Transactions`, `Treatment Plan`, `Appointments` (`Setup` per vendor text) |
| - | `User` | User who made the change |

Footer: `From`, `Thru`, `User : ALL`, `Audit Type : ALL`. Claim status letters in descriptions: `Q` created not sent, `S`
sent, `A` closed, `P` partial payment, `PS` pre-auth sent, `PC` pre-auth closed. Quirks kept: no PRINT FORMAT section
(export from the result, legacy viewer `Export to: Excel / Word`); for appointments only delete, reschedule and cut /
copy-paste are recorded, ordinary appointment edits are not (we record more: additive `audit_type` values, never in place
of the legacy ones). Deliberately improved: field-level before / after values where the audit row has them (enhancement
column, research 8).

### Parameters - legacy parity

<!-- PARITY:management_reports.r03 -->

| Legacy option | Effect on the result |
|---|---|
| OFFICE/GROUP `Office` (default) + picker | Events whose `office_id` is in the resolved office list; NULL-office events (PRINT rows, office-less setup changes) only for callers who may read all offices |
| OFFICE/GROUP `Office Group` + picker | Same for the offices of the group(s) |
| USER `User` (default `ALL`) | `ALL`: every actor; a selection: `rpt_audit_events.user_id IN (...)`; echoed `User : <labels>` |
| DATE RANGE Start Date / End Date (default today / today) | `occurred_date BETWEEN date_from AND date_to` (updated date, office-local), never the original record date |
| PATIENT `Patient` empty (default) | All patients, and events that concern no patient |
| PATIENT `Patient` set (lookup) | `patient_id IN (:patient_ids)`; needs `phi_identified`. `SEARCH` is the lookup icon of the box (superseded) |
| OTHER OPTIONS `Audit Type` `ALL` (default) | No action-type restriction |
| `Audit Type` other values (list not documented) | `audit_type = <value>`; candidates `edit`, `delete`, `close_out`, `reschedule`, `cut_copy_paste` (unknown_legacy - read the list on the live tool) |
| OTHER OPTIONS `Module Type` `ALL` (default) | No module restriction |
| `Module Type` `Appointments` | `module_type = 'appointments'`: deleted, rescheduled and moved appointments (deleted ones read `Delete Appointment-Created`) |
| `Module Type` (presumed) `Patient`, `Setup`, `Transactions`, `Treatment Plan` | `module_type` = `patient`, `setup`, `transactions`, `treatment_plan` (offered as enhancement until the live list is read) |
| Patient dialog `Account` | Events of every member of the guarantor account of the patient in context (`account_id = current_account`) |
| Patient dialog `Patient` | Events of the patient in context (`patient_ids = current_patient`) |

Dependency rules: `audit_subject` `visible_when` / `required_when ["ctx", "patient_context"]` (NEW run-context fact, 02
section 3.2); in that state only `audit_subject` and `date_range` are shown and `office_scope = all`; on the hub panel
`audit_subject` is hidden (disabled value `null`). No greyed control.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `audit_type` extra values | members `create`, `print`, `status_change`, `restore` of the same `enum` | `all` | Additive action types the dataset records (data card 2.27); never shown instead of the legacy values |
| `resource_types` | `enum_multi` NEW over `rpt_audit_events.resource_type` (`patient-payments`, `patient-adjustments`, `patient-procedures`, `insurance-claims`, `appointments`, ...) | `all` | Finer than Module Type: "only payment deletions" with `audit_type = delete` |
| `show_field_changes` | `boolean` NEW | `false` | Adds column `field_changes` (field: before -> after from `before` / `after` jsonb) and expands one row per changed field in XLSX |
| `exclude_user_ids` | `entity_multi` NEW (`accepts_none`) | `none` | Hide system or integration users |
| `amount_changed_only` | `boolean` NEW | `false` | Only rows where an original and an updated amount exist and differ |
| Saved view "Deleted payments, last week" | `audit_type = delete`, `module_type = transactions`, `date_preset = last_week` | - | Weekly owner review, scheduled as a link (PD-12) |

### Data

| Item | Rule |
|---|---|
| Dataset | `rpt_audit_events` (DATA-36): `event_id`, `occurred_at_utc`, `occurred_date`, `user_id`, `office_id`, `patient_id`, `audit_type`, `module_type`, `resource_type`, `resource_id`, `path`, `before`, `after`, `original_amount`, `updated_amount`, `original_patient_amount`, `original_insurance_amount`, `updated_patient_amount`, `updated_insurance_amount`, `original_date`, `updated_date`. Sources: `audit_logs` plus `time_clock_entry_edits`, `account_change_events`, `signature_audit_events` and the NEW event tables (`appointment_events`, `claim_status_history`, `treatment_plan_item_events`, `office_day_closes`, `financial_period_locks`) |
| Description | NEW column `description` of `rpt_audit_events`, rendered by the dataset from `audit_type`, `resource_type`, the code or procedure label and the changed fields in the legacy phrasing (`Delete Payment - <code description>`, `Edit TranDate from <d1> to <d2> <procedure>`, `ClaimStatus changed from :<a> to <b>.`); owner 03 section 2.27 |
| Joins | `rpt_patient_dim` on `patient_id` (`chart_no`, names), `rpt_user_dim` on `user_key = 'u:' || user_id` (`user_label`), `rpt_office_dim` for the time zone and label; all on unique keys |
| Time | `occurred_at_utc` converted to the office time zone of the event (fallback: patient home office, then `America/New_York`, data card 4.3); `occurred_date` is that local date |
| Parameter application | `office_scope` -> `office_id IN (...)` (NULL member per scope rule); `user_ids` -> `user_id IN (...)`; dates -> `occurred_date`; `patient_ids` -> `patient_id IN (...)`; `audit_subject = account` -> `patient_id IN (members of account_id)` through `rpt_patient_dim.account_id`; `audit_type`, `module_type` -> equality; ordering by `occurred_at_utc, event_id` |
| Index | `audit_logs (tenant_id, created_at)` (DATA-36, 03 section 8); `audit_logs` must not be purged before 72 months (08 retention, SEC-33) |
| Availability | Coverage matrix #28: **APP** - nothing predates the migration. Per option: `close_out` returns no rows until DATA-29 (SCHEMA(29)); exact `reschedule` and `cut_copy_paste` need `appointment_events` (DATA-17, SCHEMA(17)) - until then reschedule is derived from appointment PUT / PATCH with changed date or start time and cut / copy-paste is not distinguishable; before / after of charge writes and the `Pat Amt` / `Ins Amt` columns need DATA-14 (SCHEMA(14)); claim status and treatment-item transitions need DATA-25 |
| Not recorded at all | Reads, failed requests, logins (`audit_logs` holds successful authenticated mutations and PRINT rows only); report runs and exports live in `report_audit_events` (`management.report_access_log`, 08 6.8) |
| Warnings | `audit_since_go_live`; `close_out_not_recorded` (until DATA-29); `appointment_moves_not_recorded` (until DATA-17); `charge_before_after_missing` (until DATA-14) |

### Output

Block `events` (one block, chronological):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `updated_date` | Updated Date | date (office-local `occurred_date`) | `user_activity` | none |
| `updated_time` | Time | time (office tz) | `user_activity` | none |
| `updated_patient_amount` | Updated Pat Amt | money | `financial_patient` | none |
| `updated_insurance_amount` | Updated Ins Amt | money | `financial_patient` | none |
| `original_date` | Original Date | date | `user_activity` | none |
| `original_amount` | Original Amt | money | `financial_patient` | none |
| `original_insurance_amount` | Original Ins Amt | money | `financial_patient` | none |
| `patient_label` | Patient ID: Name | text (`<chart_no>: <First Last>`) | `phi_identified` | none; `null_display` blank |
| `description` | Description | text | `user_activity` | none |
| `transaction_amount` | Tran Amt. | money (`updated_amount`; negative for payments and credit adjustments) | `financial_patient` | none |
| `module_label` | Type | enum `module_type` (labels `Patient`, `Transactions`, `Treatment Plan`, `Appointments`, `Setup`) | `user_activity` | none |
| `user_label` | User | text | `user_activity` | count per day subtotal (optional) |
| `audit_type_label` (enh.) | Action | enum `audit_type` | `user_activity` | none; `default_visible false` |
| `field_changes` (enh.) | Changes | text | `user_activity` | none; `visible_when show_field_changes` |
| `event_id`, `patient_id`, `user_id`, `office_id`, `resource_type`, `resource_id` | hidden | id / text | `user_activity` | row id `event_id` |

| Item | Rule |
|---|---|
| Key class | `user_activity` on the row dimension: a caller without it is refused (403 `data_class_denied`). A caller without `financial_patient` gets the list without amount columns; without `phi_identified` the run is refused when `patient_ids` is set, otherwise `patient_label` is dropped |
| Grouping | None (legacy). Enhancement view state: group by user or by day in the grid (07), not a parameter |
| Sort | `sort_options`: `updated` (default: `occurred_at_utc`, `event_id`), `user_then_updated`, `patient_then_updated` |
| Page break | `none` only |
| Summary cards | event count; count of deletes (`audit_type = delete`); count of distinct users; count of distinct patients - counts of the same snapshot. Metric links: `voided_entries_count`, `backdated_entries_count` (05 5.12) drill here |
| `empty_when` | `no_detail_rows` |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Optional: events per day stacked by `audit_type` (hint on block `events`); default a list |
| Patient cell | `record` patient shell (`route_key = patient_overview`), `right_code` of the patient chart, `assert_patient_visible` |
| Description / resource | `record` by `resource_type`: ledger entry (`patient-payments`, `patient-adjustments`, `patient-procedures`), claim (`insurance-claims`), appointment (`appointments`, only when not deleted), treatment plan; each with the feature right of the record (08 5.2 rule 10) |
| User cell | `report` same report with `user_ids = [user_id]` and the current dates |
| Dashboard tiles | `voided_entries_count` -> this report with `audit_type = delete`, `module_type = transactions`; `backdated_entries_count` -> `management.transaction_exceptions` (08 6.8) |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open record | row | `navigate` | As the drill above |
| Export selection | bulk | `export_selection` | Full Control + export right; the export is audited with a patient manifest (AD-7) |
| Create review task | bulk | `create_task` | "Review change" task to the office manager with the event ids |

Worklist: no (a review log). Footer actions: `run`, `frontend`, `saved_view`.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape, two-row column header with the `Updated` and `Original` group captions (as the sample), footer `From` / `Thru`, `Office(s)`, `User : ...`, `Audit Type : ...`, `Module Type : ...`, `Printed :`, `By :`, `Page : n of m`; watermark id (SEC-16) |
| XLSX | One sheet `events`, flat columns named `updated_date`, `updated_pat_amt`, ... (no merged group captions), `field_changes` one row per field when `show_field_changes`; criteria sheet |
| CSV | Main block; formula-injection guard on `description` |
| Background | Above 31 days or all offices (the sample: 14 pages for two months of one office); delivered to the run tray |

### Open questions

| # | Question | Where to confirm |
|---|---|---|
| 1 | Exact values and order of the Audit Type dropdown; does it depend on Module Type? | Live tool (supplement unresolved) |
| 2 | Values and order of the Module Type dropdown beyond ALL and Appointments | Live tool |
| 3 | Content of the User SELECT dialog and of the Patient SEARCH dialog; does an empty Patient box include office-less setup events? | Live tool |
| 4 | Default of the Account / Patient radios of the patient dialog, and does the dialog cover all offices? | Live tool |
| 5 | What do the Original `Amt` and Updated `Pat Amt` hold for a payment edit (patient amount or ledger amount)? | Live tool with a payment edit |
| 6 | Should view-only reads of patient records (not in `audit_logs`) ever appear here? (Proposal: no; they belong to `management.patient_report_access`) | Product owner, 08 |

## Time Clock Report - `management.time_clock_report`

Management Reports, screenshot `4.PNG` - P2 - M - `reports_management_reports_screen_view_only` / `_full_control`, user restriction `self_unless_privileged` (class `payroll_time`) - interactive - DOCUMENTED (Detail, 2020 sample); Summary and Employee Total Only PARTIALLY DOCUMENTED (vendor text, columns INFERRED)

### Purpose

The office manager or payroll clerk checks the hours of all staff, or of selected employees, for a pay period before
payroll: gross hours, overtime and, with the wage class, gross wages (vendor: "auditing gross hours and gross wages").
The My Reports copy (`my_reports.time_clock_report`) is the employee's own card; this copy has the USER picker. A
premium-subscription feature in the legacy tool. The Time Clock screen (`/time-clock/report`) stays the editor; it links
here.

### Legacy output

| `REPORT FORMAT` | Output | Confidence |
|---|---|---|
| `Detail` (default) | One row per in / out pair; columns `Employee` (Last,First), `Over time Type` (demo `Daily`), `Hourly Rate`, `Over time Rate`, `In` (date time), `In Office`, `Out` (date time), `Out Office`, `Total Hrs:Mins` (`hh:mm`), `Total Hours` (decimal). A `Total:` row after each employee-day; `Grand Total:` at the end. Footer `From`, `Thru`, `Users : ALL`, `* Detail Report`, `* Weekly Overtime calculations are not considered for this report` | DOCUMENTED (2020 sample) |
| `Summary` | One summary per user per day; overtime follows each user's overtime setting | Vendor text; columns INFERRED |
| `Employee Total Only` (older text "Total") | One line per employee for the range | Vendor text; columns INFERRED |

Setup behind the figures: per user pay rate, overtime method (`D` hours over 8 a day, `W` hours over 40 a week),
overtime rate. Quirk kept as columns: the vendor says the office of a punch is not tracked, yet Detail prints `In Office` /
`Out Office` (blank in the demo) and the screen offers an office filter and Group By Office; we fill both columns from
`time_clock_entries.office_id` (one office per entry, so both show the same value). Quirk kept: weekly overtime is not
applied in Detail (the footer note says so).

### Parameters - legacy parity

<!-- PARITY:management_reports.r04 -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | Block `punches`: one row per entry with in, out and hours; `Total:` per employee-day; Detail footnotes |
| REPORT FORMAT `Summary` | Block `days`: one row per employee and work day with regular, overtime and total hours |
| REPORT FORMAT `Employee Total Only` | Block `employees`: one row per employee for the range |
| OFFICE/GROUP `Office` (default) + picker | Resolved office list passed to `build_report(office_ids=...)`; punches of other offices left out; NULL-office legacy punches only for callers who may read all offices |
| OFFICE/GROUP `Office Group` + picker | Same for the offices of the group(s) |
| USER `User` (default `ALL`) | `ALL`: every employee with punches in scope; a selection: those users. Forced to the caller (read-only) for a caller without `payroll_time` |
| DATE RANGE Start Date / End Date (default today / today) | `work_date BETWEEN date_from AND date_to` (office-local date of clock-in); maximum span 366 days (`build_report` `MAX_REPORT_DAYS`) |
| OTHER OPTIONS `Group By Office` unticked (default) | No office band |
| `Group By Office` ticked | `group_by = office`: outer band per punch office with office subtotals; enabled when more than one office is in scope (`ctx.multi_office`, inferred) |

Dependency rules: `group_by.office` `enabled_when ["ctx", "multi_office"]` (inferred; greyed in the capture with one
office); `user_ids` `forced_when ["ctx", "user_restricted"]` -> `{"token": "current_user"}` (shared rule 04, policy: the
caller lacks `payroll_time`). No PRINT FORMAT section (the My Reports copy has one): export through the dialog.

### Parameters - enhancements

| Key | Type | Default | Effect |
|---|---|---|---|
| `date_preset` | presets `current_pay_period`, `previous_pay_period` (NEW, owner 04 7.4, from `time_clock_settings` / `time_clock_periods`); `week_start: payroll` | `today` | "Previous pay period" saved view and schedule at period end |
| `include_wages` | `boolean` (08 5.2 rule 8, needs `payroll_wage`) | `false` | Adds `regular_pay`, `overtime_pay`, `total_pay` to Summary and Employee Total Only (from `build_report` wage totals) |
| `show_issues` | `boolean` NEW | `false` | Adds column `issues` (`open`, `missing_clock_out`, `clock_out_before_clock_in`, `auto_closed`, `long_shift`) and a summary card with the count: the pre-payroll correction list |
| `include_breaks` | `boolean` NEW | `false` | Lists unpaid break / lunch entries in Detail and adds `break_hours` to the other formats (paid hours unchanged) |
| `include_inactive_users` | `boolean` (3.2) | `false` | Adds inactive users to the USER picker (punches of inactive users in range are always listed under `ALL`) |
| `compare_to` | `enum` (filter card 12, P4): `none`, `previous_period` | `none` | Employee Total Only gains `total_hours_prior` and the difference |

### Data

| Item | Rule |
|---|---|
| Source | `python_builder` (02 section 4.2, whitelist) over `time_clock_service.build_report(db, tenant_id, caller, date_from, date_to, user_ids=<resolved user_ids or None for all>, office_ids=<resolved list>, include_wages=<include_wages and payroll_wage>, include_entries=<report_format == detail>)`. Shared adapter with `my_reports.time_clock_report` (ENG-34); this definition adds the multi-user call (`user_ids` list keyword requested from 02 section 14 beside `office_ids`) and returns `office_id` with every row; the executor checks each row against the resolved scope |
| Analytics twin | `rpt_time_clock` (`entry_id`, `user_id`, `office_id`, `clock_in`, `clock_out`, `total_hours`, `work_date`, `entry_type`, `is_paid`, `source`, `clock_basis`, `is_edited`, `auto_closed`, `is_open`, `era`) for invariant R6 only: hours by user and day equal the builder (DATA-23) |
| Overtime | `split_overtime` with `effective_rules(practice, user config)`; weekly overtime looks back 7 days before `date_from`; never re-implemented in SQL. Detail prints per-pair hours without weekly overtime (legacy note) |
| User attribution | `time_clock_entries.user_id`; labels from `rpt_user_dim.user_label` (`Last,First`); UR-2: a caller without `payroll_time` gets `scope_user_ids = [caller]` and the engine passes that id to the builder (the builder no longer narrows silently) |
| Office attribution | `time_clock_entries.office_id`; NULL on legacy rows -> "Unassigned office" |
| Date basis | `work_date` = office-local date of `clock_in`; `clock_basis = wall_clock` legacy rows are read as local time |
| Availability | Coverage matrix #29: **READY**. Warnings `legacy_wall_clock` (31,756 migrated punches), `auto_closed_zero` (856 auto-closed legacy rows count 0 hours), `office_unknown_legacy` |
| Cannot be produced for history | Planned shifts (none in either era); office of legacy punches the source did not carry |

### Output

Detail block `punches`:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `employee_name` | Employee | text (`Last,First`) | `aggregate` | group key |
| `overtime_type` | Over time Type | enum `daily` / `weekly` / `none` | `payroll_time` | none |
| `hourly_rate` | Hourly Rate | money | `payroll_wage` | none |
| `overtime_rate` | Over time Rate | decimal (multiplier, 2) | `payroll_wage` | none |
| `clock_in` | In | datetime (tz office) | `payroll_time` | none |
| `in_office` | In Office | text | `aggregate` | none |
| `clock_out` | Out | datetime (tz office) | `payroll_time` | none; blank for open entries |
| `out_office` | Out Office | text | `aggregate` | none |
| `total_hrs_mins` | Total Hrs:Mins | duration (`hh_mm`) | `payroll_time` | sum per employee-day (`Total:`) and grand (`Grand Total:`) |
| `total_hours` | Total Hours | decimal (2) | `payroll_time` | sum per employee-day and grand |
| `issues` (enh.) | Issues | text | `payroll_time` | none; `visible_when show_issues` |
| `entry_id`, `user_id`, `office_id`, `work_date` | hidden | id / date | `payroll_time` | row id `entry_id` |

Summary block `days` (columns INFERRED): `employee_name` (group key, `aggregate`), `work_date` (date, `payroll_time`),
`regular_hours`, `overtime_hours`, `total_hours` (decimal 2, `payroll_time`, sum per employee and grand), `break_hours`
(enh., `visible_when include_breaks`), `regular_pay`, `overtime_pay`, `total_pay` (money, `payroll_wage`, sum,
`visible_when include_wages`).

Employee block `employees` (columns INFERRED): `employee_name` (row dimension, `aggregate`), `days_worked` (integer,
`payroll_time`), `regular_hours`, `overtime_hours`, `total_hours` (sum, grand), `total_hours_prior` (enh., P4), the three pay
columns with `include_wages`. Grand total row `Grand Total:`.

| Item | Rule |
|---|---|
| Group levels | optional outer `office` (`group_by = office`, header `Office : {office_name}`, subtotal); Detail: `employee_name` -> `work_date` (subtotal `Total:`); Summary: `employee_name` (subtotal); grand total `Grand Total:` |
| Group By Office in Summary / Employee Total Only | Hours split by punch office; overtime computed once per user-day across offices and attributed to the office of the punch during which the threshold was crossed (proposal, open question 2) |
| Sort | Detail `employee_name`, `clock_in`, `entry_id`; Summary `employee_name`, `work_date`; Employee `employee_name`; flat re-sort on `total_hours` in Employee Total Only |
| Page break | `none` (default), `office`, `employee` (one employee per page for signature sign-off) |
| Class rules | `employee_name` is `aggregate` (rule 12: user as operational attribute); every hour column `payroll_time` - a caller without the class receives only own rows (UR-2), never another user's hours; `payroll_wage` columns dropped without that class |
| Summary cards | `total_hours`, `overtime_hours`, employees with punches, issue count (`show_issues`); metric `clocked_hours` (05 5.8) reconciles with `total_hours` of paid entries (`reconciles_with`) |
| `empty_when` | `no_detail_rows` |

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Employee Total Only: horizontal bar of `total_hours` per employee, regular and overtime stacked |
| Employee row (Summary / Employee Total Only) | `rows`: same report, `report_format = detail`, `user_ids = [user_id]`, same dates |
| Day subtotal (Summary row) | `rows`: Detail for that user and `date_from = date_to = work_date` |
| Punch row | `record` Time Clock editor at that entry (`route_key = time_clock_entry`), right `utilities_time_clock_editor_*` |

### Actions

| Action | Scope | Kind | Note |
|---|---|---|---|
| Open punch in the editor | row | `navigate` | Correction stays in the Time Clock editor (its own right); the report never edits punches |
| Message employees with issues | bulk | `custom:staff_message` | Internal user-to-user message (messaging feature) asking for a missing clock-out; enabled with `show_issues` |
| Export selection | bulk | `export_selection` | Full Control + export right; payroll export |

Worklist: no; with `show_issues` it is the pre-payroll correction list. Footer actions: `run`, `frontend`, `saved_view`.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`; Detail landscape (10 columns), Summary and Employee Total Only portrait; footer `From` / `Thru`, `Offices`, `Users : ALL` or labels, `* Detail Report` / `* Summary Report` / `* Employee Total Only`, the Detail overtime note, `Printed :`, `Page : n of m`; page break per employee gives a signature line `Employee signature ____` (enhancement, `page_break_by = employee` only) |
| XLSX | One sheet per format block; `clock_in` / `clock_out` datetime cells, hours numeric, `total_hrs_mins` duration cells; no merged cells; criteria sheet |
| CSV | Main block of the chosen format (payroll import) |
| Background | Not needed (at most 366 days; `build_report` is bounded) |

### Open questions

| # | Question | Where to confirm |
|---|---|---|
| 1 | Column lists of Summary and Employee Total Only, and whether they print wages | Live tool |
| 2 | When is Group By Office enabled, and how are hours and overtime split by office? | Live tool (supplement unresolved r04) |
| 3 | What does the OFFICE/GROUP selection filter in the legacy tool when punch offices are not tracked: the punch, or the user's office assignment? | Live tool |
| 4 | Does `Users : ALL` include inactive users with punches in the range? | Live tool |
| 5 | Should a manager without `payroll_wage` see `Hourly Rate` / `Over time Rate` of the legacy Detail? (Proposal: no, the columns are dropped) | 08 product decision |

<!-- WORK-ITEMS -->
| RPT-MGMT-10 | Payment Plan Charges definition: builder over `rpt_contract_installments` + `rpt_payment_plan_contracts`, `billing_date` as-of rule, `plan_type`, `ortho_plan_parts` with enable rule and empty-group semantics, plan-side sections, office band, totals | P2 | M | DATA-37, DATA-05, RPT-MGMT-01, FLT-03 | On a fixture with one regular plan and one ortho contract with three sides: Regular lists only the regular instalments due on or before the date and not posted; Ortho with no box ticked lists all three sides in three sections; ticking Primary lists only `plan_side = ins`; totals equal the sum of `periodic_amount`; parity default test passes |
| RPT-MGMT-11 | Payment Plan Charges enhancements and hand-offs: `installment_state`, `overdue_only`, `card_on_file`, `due_window_days`, carrier column of the insurance sides, bulk hand-off to the contract posting screen, double-billing warning from checks #33 / #34 | P2 | S | RPT-MGMT-10, ENG-49, UX-39 | Selecting two rows and choosing Open contract posting opens the posting screen with the billing date and the two contracts pre-ticked; a contract listed by check #33 carries the warning; `installment_state = posted` lists the instalments posted on the date with their charge |
| RPT-MGMT-12 | Uncollected Copay definition: scheduled-patient population, day charges and patient estimate, patient payments of the day, account Patient AR as of the appointment day through `rpt_ar_open_items`, last payment, financial notes, threshold, Detail and Summary blocks | P2 | L | DATA-16, DATA-20, DATA-27, DATA-06, RPT-MGMT-01 | On fixture days: a patient with a $40 estimate who paid $25 shows Uncollected 15.00; a patient with only a prior balance above 0.00 is listed, one at 0.00 is not; an account paid in full by an in-app insurance payment is not listed (PD-2); Summary totals equal the Detail totals per office-day |
| RPT-MGMT-13 | Uncollected Copay metric reconciliation and actions: `reconciles_with uncollected_copay_amount` / `otc_collection_pct` under the stated conditions, bulk SMS / e-mail / task / letter hand-offs with exclusion counts, drill to account ledger | P2 | M | RPT-MGMT-12, MET (05 `uncollected_copay_amount`), ENG-30, ENG-49 | Reconciliation test equal on the single-patient-account fixture and the difference listed on the two-patient account; bulk SMS excludes opted-out patients and shows the count; drill from Pat. Balance opens the account ledger of that account |
| RPT-MGMT-14 | Audit Trail definition: `rpt_audit_events` block in legacy column order with the `Updated` / `Original` group captions, `description` rendering in legacy phrasing, office-local time, office / user / date / patient / Audit Type / Module Type filters, key class `user_activity`, background escalation | P2 | L | DATA-36, DATA-14, DATA-17, SEC-30, RPT-MGMT-03 | Fixture: deleting a payment produces one row `Delete Payment - <code>` with Tran Amt. negative and Module Type Transactions; editing a transaction date produces `Edit TranDate from <d1> to <d2> ...` with Original Date d1; `module_type = appointments` returns only deleted / rescheduled appointments; a caller without `user_activity` gets 403 |
| RPT-MGMT-15 | Audit Trail patient entry point: patient Print launcher item, compact dialog with `audit_subject` Account / Patient and the date range, `ctx.patient_context` fact, account member expansion | P2 | S | RPT-MGMT-14, UX-29, FLT-16 | From a patient in a two-member account, Account lists the events of both members and Patient only of the patient; the hub panel never shows `audit_subject`; a saved view from the dialog stores the tokens, not the patient |
| RPT-MGMT-16 | Audit Trail live-tool read and enhancements: record the Audit Type and Module Type lists (FLT-23) and update the parity file; `resource_types`, `show_field_changes`, `exclude_user_ids`, `amount_changed_only`; drill to the changed record per resource type | P2 | M | RPT-MGMT-14, FLT-23, ENG-30 | Parity file has no `unknown_legacy` control left for r03 after the live read; `show_field_changes` lists field: before -> after for a fixture patient edit; a click on a payment row opens that ledger entry |
| RPT-MGMT-17 | Time Clock Report (Management) definition on the shared `python_builder`: multi-user `user_ids`, office list, three formats, Group By Office split, user restriction `self_unless_privileged` with `payroll_time`, wage columns with `payroll_wage`, R6 against `rpt_time_clock` | P2 | M | ENG-34, DATA-23, SEC-19, RPT-MGMT-03 | Engine output equals `GET /reports/time-clock` for the manager, non-manager and wage cases; a caller without `payroll_time` choosing another user gets only own rows and the run stores `scope_user_ids = [caller]`; Group By Office splits a two-office day into two bands whose hours sum to the day |
| RPT-MGMT-18 | Time Clock Report enhancements and links: pay-period presets, `show_issues`, `include_breaks`, `include_wages`, page break per employee with signature line, "Open in Reports" from `/time-clock/report`, staff message bulk action | P2 | S | RPT-MGMT-17, UX-30, FLT-04 | `previous_pay_period` resolves from `time_clock_settings`; `show_issues` lists the fixture's open entry; the Time Clock screen link opens the report with the screen's range and users |
<!-- /WORK-ITEMS -->
