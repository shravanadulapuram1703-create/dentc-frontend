## Unbilled Report Due to No Insurance - `insurance.unbilled_report_due_to_no_insurance`

Insurance Reports, screenshot 10.PNG - P2 - S - `reports_insurance_reports_screen_view_only` (family `insurance`) - interactive - PARTIALLY DOCUMENTED; layout INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front office, billing staff | End of day (vendor cadence `[D]` `[R12]`) | Find procedures that were posted **before** the patient's insurance was attached: their billing order is `None` (no `D` in the Bill column), so no claim can be generated until each procedure is edited (`Advanced` -> Billing Order `None` -> `Dental`, accept the recalculation, save) `[D]` `[R2]` `[R19]` |
| Billing lead, office manager | Weekly or month end over a wider range | Catch late-attached coverage before the carrier's filing deadline; first stage of the claim funnel (research section 1 item 2), ahead of Procedures on Hold and Claims Not Created |

### Legacy output

Confidence: purpose and fix workflow **DOCUMENTED** (`[D]` `[R2]` `[R12]`); layout **INFERRED** (research reconstruction:
patient (id), procedure date, code, description, provider, fee, current carrier; comparable Open Dental option to
include procedures completed before insurance was added `[X2]`).

| Element | Content | Evidence |
|---|---|---|
| Printed title | `Unbilled Report Due to No Insurance` (menu name; not seen) | family page furniture |
| Columns (reconstructed), in order | `Pat ID` - `Patient` - `Date` - `Code` - `Description` - `Th` - `Surf` - `Provider` - `Fee` - `Carrier` | research reconstruction; `Th` / `Surf` added for parity with Procedures on Hold (proposal) |
| Grouping | Not documented. Proposal: `Office : <name>` band (multi-office), then a flat list ordered by patient and date | proposal |
| Totals | Not documented. Proposal: `Total [ n ] :` with the sum of `Fee` per office band and a grand total | proposal |
| Footer echo | `From`, `Thru`, `Offices`, then title, `Printed : <date time>`, `Page : n of m` (family furniture) | `[S]` family |

Documented behaviour we keep: the population is defined by the billing order, not by a criterion (correction of the
supplement: procedures posted before insurance was attached, billing order `None`). Money prints positive. We
deliberately add the `Bill` column (`None`) and the coverage effective date as enhancements, not as legacy columns.

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r10 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Renders the banded PDF from the snapshot; rows unchanged |
| PRINT FORMAT `Excel` | Flat typed sheet of the same rows; `csv` added as enhancement |
| OFFICE/GROUP `Office` (default) + picker (working office, `108` on the capture) | `rpt_charges.office_id IN (offices)`: office of service (PD-6); one `Office :` band per office when several |
| OFFICE/GROUP `Office Group` + picker | Every office of the chosen group(s) the caller may read; band per office |
| DATE RANGE Start Date (today) | `rpt_charges.service_date >= date_from` (fixed basis `service_date`, inferred; FLT-23) |
| DATE RANGE End Date (today) | `rpt_charges.service_date <= date_to`, inclusive |
| Population rule (no control) | Live charges with `bill_tier = 'none'`, `claim_id IS NULL`, whose patient holds an active dental coverage slot today (data card 2.20 consumer rule) |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | Family footer actions (header): reset to defaults / run with render / saved view + favorite |

Dependency rules: none (three sections, nothing greyed, no hidden control documented).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `provider_ids` | `entity_multi` (shared 3.2) | `all` | Treating provider `rpt_charges.provider_id` | Never scoped by `providers.office_id` |
| `carrier_ids` | `entity_multi` (shared 3.5) | `all` | Carrier of the patient's primary dental slot today | Lines of patients without a resolvable carrier match only under `all` |
| `coverage_effective_rule` | `enum` NEW (owner 04) | `all` | `all`; `covered_on_service_date` (slot `effective_date <= service_date` and no `term_date` before it: the claim can be billed once the order is fixed); `not_covered_on_service_date` (coverage started after the visit: probably a patient-pay line, not a billing error) | Slot dates are often blank on migrated slots (data card 2.21): blank = `unknown`, kept only under `all` |
| `exclude_zero_fee` | `boolean` NEW (owner 04) | `false` | Drops lines with `charged_fee = 0` (visit and Z codes that are never claimed) | Legacy behaviour for $0.00 lines unknown (open question 3) |
| `sort_by` | `enum` (shared 3.9) | `patient_name` | `patient_name` (then service date), `service_date_oldest_first`, `fee_desc` | Oldest first = filing-deadline order |
| Column `days_since_service` | column | shown | `rpt_office_dim.local_today - service_date` | Filing-deadline exposure |
| Saved view "All unbilled - no billing order" | saved view | - | `date_preset = custom`, `date_from = 2000-01-01`, `date_to = today` | Weekly sweep; schedulable end of day (header cadence) |
| Saved view "Last 30 days" | saved view | - | `date_preset = last_30_days` | Relative range for the daily end-of-day schedule |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_charges` (rows), `rpt_insurance_coverage` (current primary dental slot: carrier, `effective_date`, `term_date`), `rpt_patient_dim` (`chart_no`, names), `rpt_procedure_code_dim` (description), `rpt_provider_dim` (short id), `rpt_office_dim` (`local_today`, band label) |
| Columns used | `charge_id`, `patient_id`, `office_id`, `provider_id`, `service_date`, `procedure_code`, `tooth`, `surface`, `quadrant`, `charged_fee`, `bill_tier`, `bill_tier_source`, `claim_id`, `primary_carrier_id` (after DATA-33), `era`, `is_void`, `is_archived` |
| Population | `NOT is_void` (archive policy of 2.0), `bill_tier = 'none'`, `claim_id IS NULL`, `EXISTS` a live `rpt_insurance_coverage` row of the patient with `category = 'dental'` (any tier), `service_date` in range, `office_id` in scope. `EXISTS`, never a join, so a patient with two slots does not double a line |
| Carrier column | `primary_carrier_id` on the charge after DATA-33; until then `carrier_name` of the patient's live primary dental slot today (`LEFT JOIN LATERAL ... LIMIT 1` on tier order) |
| Date basis | fixed `service_date` (inferred; header date-basis table); `date_basis` printed in the criteria echo |
| Office attribution | office of service (`rpt_charges.office_id`, PD-6) |
| Provider attribution | treating provider (`rpt_charges.provider_id`) |
| Coverage rating | **READY** (coverage matrix #39): the billing order was migrated (`BILLINGORDER` -> `bill_tier`, data card 2.9). App rows use the derived tier until SCHEMA(33) / DATA-33 stamps `billing_order` at posting; coverage is today's, not the coverage on the service date |
| Availability notices | `bill_tier_derived` (app-era rows on the derived rule until DATA-33), `coverage_is_current` (the carrier and the "has insurance" test are today's slot) |
| Migrated history | Which coverage existed on a past service date is unknowable (slots carry no history, data card 2.21); a line whose patient has since lost coverage drops out of the report, and the report cannot show the past state. Migrated `DD` depth is lost until DATA-12, which does not affect this population (`none` only) |

### Output

Report format: one (`standard`). Block `unbilled_no_insurance` (table, `row_id_column = charge_id`). Levels: office band
(`fixed_outer`, `["ctx", "multi_office"]`) -> flat rows; office subtotal `Total for {office_name} [ {row_count} ] :`;
grand total `Total [ {row_count} ] :`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | - | id, hidden | aggregate | group key |
| `charge_id`, `patient_id` | - | id, hidden | phi_identified | row id, drill keys |
| `chart_no` | Pat ID | text | phi_identified | none |
| `patient_name` | Patient | text, entity patient | phi_identified | key column; `count` in the band label |
| `service_date` | Date | date | phi_identified | none |
| `code` | Code | text | phi_identified | none |
| `description` | Description | text | phi_identified | none |
| `tooth` | Th | text | phi_identified | none (tooth or quadrant) |
| `surface` | Surf | text | phi_identified | none |
| `provider_short_id` | Provider | text | aggregate | none |
| `fee` | Fee | money | financial_patient | sum (`charged_fee`) |
| `carrier_name` | Carrier | text | aggregate | none |
| `bill_value` | Bill | enum (`None`) | phi_identified | none; enhancement, default visible |
| `coverage_effective_date` | Ins. Eff. | date | phi_identified | none; enhancement, hidden by default |
| `days_since_service` | Days | integer | phi_identified | `max` per band |

Sort: `sort_by` (default patient sort name, then `service_date`); tie-breaker `charge_id`. Page break: office band
(`page_break_by` not offered; office break always on for PDF when `multi_office`). Summary cards: `Unbilled lines`
(count), `Fee without billing order` (sum `fee`), `Patients` (count distinct `patient_id`). No `reconciles_with`: none
of the metric keys of metrics card 5.3 covers billing order `None` (`unbilled_production_amount` is the Claims Not
Created primary tier). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list |
| Row | `kind record`, entity charge, `route_key patient_ledger` with the charge highlighted, `right_code transactions_patient_ledger_screen_full_control` (header rule: the procedure in the ledger; the Edit Transaction dialog holds `Advanced` -> Billing Order) |
| `Patient` | patient shell (`phi_identified`) |
| Office subtotal | `kind rows` (same report, that office) |
| Footer link "Next stage" | `kind report` `insurance.procedures_on_hold` with `office_scope`, `date_from`, `date_to` copied (funnel link) |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Fix billing order | row | drill to the ledger line (the report never writes) | ledger feature right | P2 |
| Open insurance | row | `navigate` to the patient's insurance slot screen (verify the plan attached, its effective date) | patient insurance screen right | P2 |
| Set billing order to Dental | bulk | `custom:set_billing_order` through `worklists.unbilled_procedures` with NEW stage `no_billing_order` (06): per charge PATCH `billing_order` via the transaction service, re-estimate, idempotent per `(run_id, action_key, charge_id)` | `transactions_transaction_entry_screen_full_control` | P3 (ENG-49, DASH-28) |
| Export selection | bulk | `export_selection` | `reports_export_data_files` | P2 |

Doubles as a worklist: yes, as stage `no_billing_order` of `worklists.unbilled_procedures` (proposal to 06); a line leaves
the list when its billing order is set (it then moves to Claims Not Created).

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait (10 legacy columns fit), letter; office band; footer echo `From`, `Thru`, `Offices` |
| XLSX | Sheet `unbilled_no_insurance`, flat typed columns plus `Office`, `Office Name`, `Provider Name`; criteria sheet |
| CSV | Main block |
| Background | Not needed (single-day default; `escalate_when` not declared) |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Date basis: date of service or transaction date (FLT-23) | Service date |
| 2 | Column list, grouping and totals (layout not documented) | Proposal above |
| 3 | Are $0.00 lines and non-claimable codes listed? | Listed; `exclude_zero_fee` offered |
| 4 | Does the legacy report require the patient to have insurance **now** (our population rule), or does it list every `None` line? | Insurance now (the report name and the fix workflow imply it) |
| 5 | Does a line whose service date precedes the coverage effective date appear (it cannot be billed)? | Appears; `coverage_effective_rule` lets the user separate it |

## EOB 835 Claims Reconcile Report - `insurance.eob_835_claims_reconcile_report`

Insurance Reports, screenshot 11.PNG - P2 - M - `reports_insurance_reports_screen_view_only` (family `insurance`) - interactive - PARTIALLY DOCUMENTED; layout INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Billing / revenue-cycle staff | When ERA payments look missing; after each auto-post cycle (vendor `[D]` `[R22]`) | Reconcile the electronic remittances (ERA 835) received from the clearinghouse against what was posted: every processed 835 claim payment of the range, whether it was auto-posted, and the reason when it was not |
| Billing lead | Weekly / month end | Find unmatched 835 claim payments (no claim found) and unposted ones before they age; a payment absent from the report after its pay date means a failed download (vendor `[D]` `[R22]`) |

### Legacy output

Confidence: content facts **DOCUMENTED** (`[D]` `[R22]`: lists all processed payments of the range; whether each was
auto-posted; the reason when not); layout **INFERRED** (basis: `[R22]`, DentalXChange matched / unmatched claim
payments `[X10]`, Open Dental ERA claims-paid grid `[X6]`).

| Element | Content | Evidence |
|---|---|---|
| Printed title | `EOB 835 Claims Reconcile Report` (menu name; the vendor article calls it `EOB Claim Reconcile Report`) | `[D]` |
| Columns (reconstructed), in order | `Carrier` - `Check / EFT #` - `Payment Date` - `File Received` - `Patient` - `Claim ID` - `DOS` - `Billed Amt` - `Paid Amt` - `Matched` - `Posted` - `Claim Status` - `Reason Not Posted` | research reconstruction |
| `Show Details UCR` block | Not documented (`[unverified]`); taken to add the service-line detail of each claim payment with the billed (UCR) amount | parity mapping |
| Grouping / totals | Not documented. Proposal: office band -> carrier band -> check / EFT band with `Total for check <number> [ n ] :` (Billed, Paid), carrier and grand totals | proposal |
| Footer echo | `From`, `Thru` with the basis (`By Payment Date` / `By File Received on Date`), `Offices`, `Carriers`, `Matching`, `Claim Status`, then the family furniture | family |

Quirks we keep (documented): an 835 payment for a claim already closed is posted to the account and allocates to the
next open claim, so ledger and EOB can show different dates of service `[D]` `[R23]` - the row prints the 835 DOS and,
when it differs, the matched claim's DOS in a second column; auto-post runs once a day, so a same-day run can lag the
clearinghouse `[R22]` - the criteria block prints the time of the last received file. Amounts print as received on the
remittance (header money rule), never re-signed.

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r11 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Rendering only; `csv` added |
| 835 CLAIM MATCHING STATUS `Both` (default) | No predicate on matching |
| 835 CLAIM MATCHING STATUS `Matched` | `is_matched = true` (the 835 claim payment was matched to a DentC claim; meaning inferred) |
| 835 CLAIM MATCHING STATUS `UnMatched` | `is_matched = false` (no claim found; `claim_id IS NULL`) |
| CLAIM STATUS `ALL` (default) | No predicate |
| CLAIM STATUS `Partial Closed` | Claim state left by this 835 posting = partial payment (legacy `P`): `era_claim_payments.claim_status_after = 'partial_closed'` (see parity concern) |
| CLAIM STATUS `Closed` | Claim state left by this posting = closed (legacy `A`): `claim_status_after = 'closed'`. Unmatched payments carry no claim status and drop out of both values |
| OFFICE/GROUP `Office` (default, working office) / `Office Group` + picker | Office of the matched claim; unmatched rows use the payee office written by the integration, else they are the "Unassigned office" member (header attribution rule) |
| DATE RANGE `By Payment Date` (default) | `date_basis = payment_date`: `era_files.payment_date` (check / EFT date of the remittance) |
| DATE RANGE `By File Received on Date` | `date_basis = file_received_date`: office-local date of `era_files.received_at` |
| DATE RANGE Start Date / End Date (today / today) | Inclusive range on the chosen basis |
| OTHER OPTIONS `Show Details UCR` (ticked) | Adds block `service_lines` under each claim payment (835 service lines with charge submitted, the DentC UCR of the matched claim line, allowed, paid); unticked = claim-payment rows only. Rows of the main block unchanged (`role: query`, it adds a block) |
| CARRIER `Carriers` (ALL) | `era_files.carrier_id IN (...)`: payer of the remittance; `all` = no predicate; a payer not mapped to a carrier matches only under `all` |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | Family footer actions |

Dependency rules: none captured (no greyed control). `claim_status` values other than `all` imply matched rows only; the
form does not grey MATCHING STATUS (not in the legacy screen) but the criteria block notes that `UnMatched` + `Closed`
returns nothing.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `posting_status` | `enum` NEW (owner 04) | `both` | `both`, `posted` (`is_posted`), `not_posted` | The documented content ("whether auto-posted") as a filter |
| `not_posted_reasons` | `entity_multi` NEW (owner 04, source `lookup:era_not_posted_reasons` from the integration's reason vocabulary) | `all` | Include on `not_posted_reason` | Enabled when `posting_status != posted` |
| `provider_ids` | `entity_multi` (shared 3.2) | `all` | Claim provider of the matched claim (`treating_provider_id`, else `billing_provider_id`) | Unmatched rows only under `all` |
| `show_check_reconciliation` | `boolean` NEW (owner 04) | `false` | Adds block `check_totals`: per remittance (`era_files` row) `total_amount` of the 835 vs sum of `paid_amount` of its claim payments vs sum posted in DentC (`rpt_payments` with the same `eft_trace_number` / `check_number`, carrier and office) and the difference | Deposit-level reconciliation (research section 9) |
| `days_unposted_min` | `integer` NEW (owner 04) | blank | Only unposted rows whose file was received at least n days ago | Ageing of the posting backlog |
| Date presets | shared 12 | `today` | `yesterday` (morning check after the overnight auto-post), `last_7_days` | - |
| Saved view "Unposted ERA payments" | saved view | - | `posting_status = not_posted`, `date_basis = file_received_date`, `last_30_days` | Daily schedule preset |
| Saved view "Unmatched ERA payments" | saved view | - | `claim_matching_status = unmatched`, `office_scope = all` | `all` so that Unassigned-office rows are visible to callers who may read every office |

### Data

| Topic | Rule |
|---|---|
| Tables | `era_files`, `era_claim_payments` (DATA-38); service lines for the UCR block from `era_adjustments` / NEW `era_service_lines` (below) |
| Datasets | NEW `rpt_era_claim_payments` (owner 03, DATA-38): one row per `era_claim_payments` row joined to its `era_files` row (`carrier_id`, `payer_id`, `check_or_eft_number`, `payment_date`, `received_at`, `total_amount`, `file_name`) plus `file_received_date` (office-local), `report_office_id` (claim office, else `office_id` of the payment, else NULL = Unassigned office). Joined: `rpt_claim_facts` (claim number, office, DOS, providers, current `status_class`), `rpt_patient_dim`, `rpt_office_dim` |
| Columns used | `era_claim_payments`: `id`, `era_file_id`, `office_id`, `claim_id`, `is_matched`, `patient_id`, `payer_claim_control_number`, `service_date`, `billed_amount`, `paid_amount`, `patient_responsibility`, `is_posted`, `posted_at`, `not_posted_reason`, `claim_status_after`; `era_files`: `carrier_id`, `payer_id`, `check_or_eft_number`, `payment_date`, `received_at`, `total_amount` |
| Patient | `era_claim_payments.patient_id` when the integration resolved it, else the patient of the matched claim; unmatched without patient print the 835 patient name (NEW column `patient_name_835` on `era_claim_payments`, owner 03) |
| Date basis | `payment_date` (`era_files.payment_date`) or `file_received_date` (`(received_at AT TIME ZONE 'UTC' AT TIME ZONE tz)::date`, tz of `report_office_id`, else the organisation default zone; data card 4.3) |
| Office attribution | office of the matched claim; unmatched = payee office written by the integration (NEW mapping payee NPI / TIN -> office, owner 03), else "Unassigned office" (data card 5.1 rule 3: visible only to callers who may read every office). Consequence: the legacy default run (working office) omits unmatched payments without a payee office - printed as a notice with their count |
| Provider attribution | none in the legacy form; enhancement filter on the claim provider |
| UCR block | `service_lines`: one row per 835 service line (code, DOS, charge submitted, allowed, paid) with `ucr_amount` of the matched `rpt_claim_lines` row (same claim family, code, tooth and DOS; first by line number) |
| Coverage rating | **SCHEMA(38)** (coverage matrix #40): the ERA tables are filled only by a clearinghouse integration outside this module; until rows exist the report runs empty with the notice `needs_era_integration` |
| Migrated history | No ERA was migrated: no remittance file history exists before the integration starts; nothing before that date can be produced |

`era_adjustments` holds one row per service line **and** reason code with the line money repeated (DATA-38 sketch), so
summing `charge_submitted` / `paid_amount` over it multiplies a line by its reason count. NEW `era_service_lines`
(`id`, `era_claim_payment_id`, `line_no`, `procedure_code`, `service_date`, `units`, `charge_submitted`, `actual_allowed`,
`paid_amount`) with `era_adjustments.era_service_line_id` (owner 03, amendment to DATA-38) is required by this block and
by 835 Denial Report (RPT-INS-72).

### Output

Report format: one (`standard`). Levels in block `claim_payments` (table, `row_id_column = era_claim_payment_id`): office
band (`multi_office`) -> carrier band `Carrier : {carrier_name} ({payer_id})` -> check band `Check / EFT # : {check_or_eft_number}   Paid {payment_date}`
with subtotal `Total for check {check_or_eft_number} [ {row_count} ] :`; carrier subtotal; grand total.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `report_office_id`, `carrier_id`, `era_file_id` | - | id, hidden | aggregate | group keys |
| `era_claim_payment_id`, `patient_id`, `claim_id` | - | id, hidden | phi_identified | row id, drill keys |
| `check_or_eft_number` | Check / EFT # | text | payment_instrument | group label |
| `payment_date` | Payment Date | date | aggregate | none |
| `file_received_at` | File Received | datetime (tz office) | aggregate | none |
| `patient_name` | Patient | text, entity patient | phi_identified | key column |
| `claim_number` | Claim ID | text | phi_identified | none; blank when unmatched |
| `payer_claim_control_number` | Payer Claim # | text | phi_identified | none; enhancement, hidden by default |
| `service_date_835` | DOS | date | phi_identified | none |
| `claim_service_date` | Claim DOS | date | phi_identified | none; printed only when it differs (quirk `[R23]`) |
| `billed_amount` | Billed Amt | money | financial_patient | sum |
| `paid_amount` | Paid Amt | money | financial_patient | sum |
| `patient_responsibility` | Pat Resp | money | financial_patient | sum; enhancement, hidden by default |
| `is_matched` | Matched | boolean (`Y` / `N`) | aggregate | `count` of `N` in the band label |
| `is_posted` | Posted | boolean (`Y` / `N`) | aggregate | `count` of `N` in the band label |
| `claim_status_after` | Claim Status | enum (`Partial Closed`, `Closed`) | aggregate | none |
| `not_posted_reason` | Reason Not Posted | text | phi_identified (free text, rule 4) | none |

Block `service_lines` (`placement: after_group` of the claim payment row, `visible_when ["truthy", "show_details_ucr"]`):
`procedure_code` Code (phi_identified), `service_date` DOS (phi_identified), `charge_submitted` Charge Submitted, `ucr_amount`
UCR, `actual_allowed` Allowed, `paid_amount` Paid (money, financial_patient, no subtotal: the claim-payment row carries
the totals). Block `check_totals` (enhancement, `placement: report_end`): `check_or_eft_number` (payment_instrument),
`carrier_name`, `file_total_amount`, `claim_payments_paid`, `posted_in_dentc`, `difference` (`computed difference`;
money, financial_practice).

Sort: default carrier name, check number, patient sort name; tie-breaker `era_claim_payment_id`. Page break: office
band. Summary cards: `Claim payments` (count), `Paid` (sum `paid_amount`), `Unmatched` (count, filter `is_matched =
false`), `Not posted` (count) - each a block total of the same run. No `reconciles_with` (no metric covers ERA; metrics
card 5.3 lists none). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Stacked bar per carrier: posted / not posted / unmatched counts (`charts[]` kind `bars`, `top_n` 10) |
| `Claim ID` | `kind record`, entity claim, `route_key claim_detail`, `right_code transactions_insurance_claims_details_view_only` |
| `Patient` | patient shell (`phi_identified`) |
| Row (posted) | `kind record`, the posted insurance payment in the patient ledger (`right_code transactions_patient_ledger_screen_full_control`) |
| Check subtotal | `kind rows` filtered to that `era_file_id` |
| Card `Unmatched` / `Not posted` | `kind rows` with `claim_matching_status = unmatched` / `posting_status = not_posted` |
| Footer link | `kind report` `insurance.835_denial_report` with `office_scope`, `carrier_ids`, `date_from`, `date_to` (span cut to 31 days) |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Open claim / open ledger | row | `navigate` | claim / ledger feature right | P2 |
| Match to claim | row | `navigate` to the integration's ERA posting screen with the 835 claim payment (owned by the integration feature, not this module) | insurance posting right | after the integration |
| Create follow-up | bulk | `create_task` per unmatched or unposted claim payment (follow-up store of DASH-28) | task feature right | P3 (ENG-49, DASH-28) |
| Export selection | bulk | `export_selection` | `reports_export_data_files` | P2 |

Doubles as a worklist: partly; the unposted and unmatched saved views are the queue until an ERA posting worklist exists
(not in 06; proposal recorded in open questions).

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (13 columns), letter; office, carrier and check bands; UCR block indented under its row; footer echo with basis wording |
| XLSX | Sheet `claim_payments` flat (carrier, check and office as columns on every row); sheet `service_lines` with the parent `era_claim_payment_id`, `Claim ID`, `Patient`; sheet `check_totals` when requested; criteria sheet |
| CSV | Main block; `options.block = service_lines` for the lines |
| Background | Not needed for the default; `escalate_when` date span > 31 days with `office_scope = all` |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Column list, grouping and totals (layout INFERRED) | Proposal above |
| 2 | `Show Details UCR`: does it add service lines, or only a UCR column on the claim row? Is "UCR" the office fee or the submitted charge? | Service-line block with both charge submitted and DentC UCR |
| 3 | `CLAIM STATUS`: status left by the posting of this 835, or the claim's current status? | Status left by this posting (`claim_status_after`) |
| 4 | Is `Payment Date` the check / EFT date of the remittance or the date the payment was posted? | Check / EFT date (`era_files.payment_date`) |
| 5 | Which ERA vendor and integration (835 parser, matching, auto-post) - outside this module | Report ships empty with `needs_era_integration` |
| 6 | Product: an ERA posting worklist in 06 for unmatched / unposted payments | Saved views until decided |

## 835 Denial Report - `insurance.835_denial_report`

Insurance Reports, screenshot 12.PNG - P2 - L - `reports_insurance_reports_screen_view_only` (family `insurance`; listed only for tenants that enable it) - interactive - DOCUMENTED (2023 samples and field definitions `[R1]`)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Billing / revenue-cycle staff | Monthly, one month at most per run (vendor `[D]` `[R1]`) | Find ERA 835 auto-payments that were **denied or partially paid**, by carrier, procedure and adjustment reason, to correct and resubmit claims, appeal, or fix fee schedules and coding |
| Office manager, owner | Month end | See which carriers and reason codes cost the most (contractual obligations versus patient responsibility versus other adjustments) |

### Legacy output

Confidence: **DOCUMENTED** for the three layouts `[S]` `[R1]` (vendor captions `835 Claim Denial - Summary` / `- Detail`).

| Variant | Content |
|---|---|
| Summary (PDF) | `Office: <name>` band; columns `Carrier / Carrier ID` - `Charges Submitted` - `Other Adjust` - `Contract Obligations` - `Patient Responsibility` - `Actual Allowed` - `Paid Amount`; one row per carrier (name with id in parentheses); `Total for Office, <name> :` |
| Detail (PDF) | Band `Carrier: <name> (<id>)`; per **service code** a bold line: code, description, `Count`, `Charges Submitted`, `Actual Allowed`, `Paid Amount`; under it one line per **reason code**: code, description, count, `Other Adjust`, `Contract Obligations`, `Patient Responsibility`; `Total for carrier, <name>:` with count and all six amounts |
| Detail (Excel) | One row per service line: `Office Name` - `Carrier Name` - `CarrierID` - `PatientID` - `ClaimID` - `DOS` - `SvcCode` - `CLMChargeSubmitted` - `Reason Code` - `Reason Code Desc` - `CO Reason Code` - `CO Reason Code Desc` - `Other Reason Code` - `Other Reason Code Desc` - `Remark Code` - `Remark Code Desc` - `PatAdj` - `COAdj` - `OtherAdj` - `ActualAllowed` - `Paid Amount`; last row `Total : <row count>` with the sums |

Field definitions `[D]` `[R1]` (paraphrased): Charges Submitted = what the office billed for the procedure; Contract
Obligations (CO) = billed minus allowed in network, not owed by the patient; Patient Responsibility (PR) = deductible,
co-pay, co-insurance, some denials, no coverage on the DOS; Other Adjustment (OA) = neither; Actual Allowed = plan
allowance (not for non-participating dentists); Paid Amount = what the carrier paid; Reason / Remark Code = code and
text of the adjustment or denial reason (sample values `96`, `169`, `1`, `2`, `16`, `45`, `149`; `N255`, `N37`, `N587`:
the standard 835 claim adjustment and remark code sets, inferred); Count = number of reason codes per service.

Kept: positive amounts as received; the Excel row-count total row; the one-month cap; Excel as the opening format; office
`ALL`. Interpretation (inferred): `Reason Code` / `PatAdj` = group PR, `CO Reason Code` / `COAdj` = group CO, `Other
Reason Code` / `OtherAdj` = groups OA and PI.

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r12 -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default; greyed while Excel) | Block `detail`: carrier -> service code -> reason code (PDF) or one row per service line (Excel / CSV) |
| REPORT FORMAT `Summary` (only with PDF) | Block `summary`: one row per carrier with the six sums, office total |
| PRINT FORMAT `Excel` (default, documented) | Flat Detail download; forces `report_format = detail` (rule d01); `output_format` is `role: query` here |
| PRINT FORMAT `PDF` | Report viewer layout; enables REPORT FORMAT (Summary / Detail) |
| OFFICE/GROUP `Office` (default) + picker `ALL` (documented default) | Every office the caller may read; office of the matched claim, unmatched = Unassigned office (header rule); one `Office:` band per office |
| OFFICE/GROUP `Office Group` + picker | Offices of the chosen group(s) |
| DATE RANGE Start / End (today / today) | `era_files.payment_date` in range (basis inferred, FLT-23); `validation.max_span_days = 31` (documented one-month limit): a longer span is refused with 422 `max_span_exceeded` |
| CARRIER `Carriers` (ALL) | `era_files.carrier_id IN (...)`; `all` = no predicate |
| EXCLUDE REASON CODE (default `None`) | `none` = exclude nothing; picked codes: the adjustment rows with those reason codes are removed from reason lines and adjustment sums, then service lines left with no adjustment row are removed (see parity concern; effect inferred). Source `lookup:denial_reason_codes` (FLT-08) |
| Population rule (no control) | Service lines of 835 claim payments that were denied or partially paid: lines with at least one adjustment row (`paid_amount < charge_submitted`), inferred definition |
| Tenant enablement (no control) | Report listed only when the organisation enables it (02 / 08 availability, not a parameter) |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | Family footer actions; CLEAR CRITERIA returns to `xlsx`, `detail`, office `all` |

Dependency rules: d01 - `report_format` `enabled_when ["ne", "output_format", "xlsx"]` and `forced_when [{when: ["in",
"output_format", ["xlsx", "csv"]], value: "detail"}]`; a `summary` sent with `xlsx` is replaced and reported in
`warnings[]`. The form opens with Excel selected, Detail marked and both REPORT FORMAT radios greyed.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `adjustment_group_codes` | `enum_multi` NEW (owner 04): `co`, `pr`, `oa`, `pi` | all ticked, `full_selection: no_predicate` | Keeps only adjustment rows of the ticked groups | Patient-responsibility-only or contractual-only review |
| `include_reason_codes` | `entity_multi` NEW (owner 04), source `lookup:denial_reason_codes` | `all` | Include filter on reason codes (inverse of the legacy exclude) | Both may be set; exclude wins |
| `denial_kind` | `enum` NEW (owner 04) | `both` | `both`, `denied` (line `paid_amount = 0`), `partially_paid` | Separates full denials (rework) from partial payments (fee schedule) |
| `provider_ids` | `entity_multi` (shared 3.2) | `all` | Claim provider of the matched claim | Unmatched lines only under `all` |
| `procedure_codes` | `entity_multi` (shared 3.6) | `all` | Service code of the line | Code-range extras of FLT-13 |
| `compare_to` | shared 12 (`previous_period`) | `none` | Summary format: prior-period columns `Paid Amount (prior)` and `Denied lines (prior)` per carrier | Prior window has the same span, so the 31-day rule holds for both |
| Column `denied_lines` | column (Summary) | shown | Count of lines with `paid_amount = 0` per carrier | Basis of the dashboard proxy |
| Saved view "Last month, Excel" | saved view | - | `date_preset = last_month` (resolves within 31 days) | Monthly schedule preset |
| Saved view "Full denials, PDF Detail" | saved view | - | `output_format = pdf`, `report_format = detail`, `denial_kind = denied`, `exclude_reason_codes = [45]` | Rework list without routine contractual lines |

### Data

| Topic | Rule |
|---|---|
| Tables | `era_files`, `era_claim_payments`, `era_adjustments` (DATA-38) and NEW `era_service_lines` (RPT-INS-72) |
| Datasets | NEW `rpt_era_service_lines` (owner 03): one row per 835 service line with office (`report_office_id`), carrier, `payer_id`, `patient_id`, claim number of the matched claim, DOS, `procedure_code`, `charge_submitted`, `actual_allowed`, `paid_amount`, `pr_amount`, `co_amount`, `other_amount` (sums of its adjustments by group; `other` = OA + PI); NEW `rpt_era_adjustments`: one row per adjustment with `group_code`, `reason_code`, `remark_code`, `amount`, joined to its line. Descriptions from NEW reference table `era_reason_codes` (`code_set` = `carc` / `rarc`, `code`, `description`, `is_active`; RPT-INS-76) |
| Population | Lines of claim payments in scope (office, carrier, payment date) with `EXISTS` an adjustment row after the exclude / include / group filters; `denial_kind` on `paid_amount` |
| Money aggregation | Line money (`charge_submitted`, `actual_allowed`, `paid_amount`) is summed on `rpt_era_service_lines` only; adjustment money (`pr_amount`, `co_amount`, `other_amount`) is summed from adjustment rows after filters, so excluding a reason code lowers the adjustment sums but not the line money of kept lines |
| Excel row | One row per service line; when a line has several codes in one group, codes and descriptions are joined with `, ` in code order and the group amount is their sum (legacy behaviour not documented: open question 3) |
| Date basis | `payment_date` of the remittance (inferred, header table); at most 31 days |
| Office attribution | office of the matched claim; unmatched = payee office (NEW mapping, owner 03) else Unassigned office; default `all` makes the Unassigned member visible to callers who may read every office |
| Provider attribution | none (legacy); enhancement on the claim provider |
| Coverage rating | **SCHEMA(38)** (coverage matrix #41): needs the clearinghouse ERA integration; claim-level denial fields (`denied_date`, `denial_reason_code`, `denied_amount`) of SCHEMA(31) / DATA-31 are used only by the drill to the claim |
| Availability notices | `needs_era_integration`; `tenant_not_enabled` (definition hidden); `era_service_lines_missing` until RPT-INS-72 (the report refuses to run rather than double-count) |
| Migrated history | None: no 835 data was migrated; denial reasons of legacy claims are unknowable |

### Output

Report formats (`report_formats[]`): `detail` (default) and `summary`.

Format `summary` - block `carrier_summary` (table, `row_id_column = carrier_id`); office band (`fixed_outer`, always, as the
sample prints `Office:` even for one office); office total `Total for Office, {office_name} :`; grand total when several
offices.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `report_office_id`, `carrier_id` | - | id, hidden | aggregate | group / row keys |
| `carrier_label` | Carrier / Carrier ID | text (`{carrier_name} ({payer_id})`) | aggregate | key column |
| `charges_submitted` | Charges Submitted | money | financial_practice | sum |
| `other_adjust` | Other Adjust | money | financial_practice | sum |
| `contract_obligations` | Contract Obligations | money | financial_practice | sum |
| `patient_responsibility` | Patient Responsibility | money | financial_practice | sum |
| `actual_allowed` | Actual Allowed | money | financial_practice | sum |
| `paid_amount` | Paid Amount | money | financial_practice | sum |
| `denied_lines` | Denied Lines | integer | aggregate | sum; enhancement |
| `paid_amount_prior` | Paid (prior) | money | financial_practice | sum; `visible_when ["ne", "compare_to", "none"]` |

Format `detail`, PDF layout - block `detail` with levels: office band -> carrier band `Carrier: {carrier_name} ({payer_id})`
with subtotal `Total for carrier, {carrier_name}:` -> service-code level (bold line, `subtotal_position: before`) -> reason
rows.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `procedure_code` / `procedure_description` | Code / Description (service line) | text | aggregate (no patient key on this layout) | group key and label |
| `line_count` | Count | integer | aggregate | `count` of service lines (service level), of adjustment rows (reason level) |
| `reason_code` / `reason_description` | Code / Description (reason line) | text | aggregate | row key |
| `group_code` | Grp | enum (`CO`, `PR`, `OA`, `PI`) | aggregate | none; enhancement column |
| `charges_submitted`, `actual_allowed`, `paid_amount` | Charges Submitted / Actual Allowed / Paid Amount | money | financial_practice | sum at service level (line money), carrier and office totals |
| `other_adjust`, `contract_obligations`, `patient_responsibility` | Other Adjust / Contract Obligations / Patient Responsibility | money | financial_practice | sum at reason level; carrier and office totals |

Format `detail`, Excel / CSV / screen grid - block `service_lines` (table, `row_id_column = era_service_line_id`), the
legacy 21 columns in order: `office_name` Office Name (aggregate), `carrier_name` Carrier Name (aggregate), `payer_id`
CarrierID (aggregate), `chart_no` PatientID (phi_identified, key), `claim_number` ClaimID (phi_identified), `service_date`
DOS (phi_identified), `procedure_code` SvcCode (phi_identified), `charges_submitted` CLMChargeSubmitted, `pr_reason_codes`
Reason Code, `pr_reason_descriptions` Reason Code Desc, `co_reason_codes` CO Reason Code, `co_reason_descriptions` CO
Reason Code Desc, `other_reason_codes` Other Reason Code, `other_reason_descriptions` Other Reason Code Desc,
`remark_codes` Remark Code, `remark_descriptions` Remark Code Desc (codes and descriptions aggregate), `patient_responsibility`
PatAdj, `contract_obligations` COAdj, `other_adjust` OtherAdj, `actual_allowed` ActualAllowed, `paid_amount` Paid Amount
(money: financial_patient, sum). Hidden: `patient_id`, `claim_id` (phi_identified), `era_claim_payment_id`. Grand total row
`Total : {row_count}` with the sums (legacy last row).

Sort: Summary by carrier name; Detail by carrier name, service code, reason code; Excel by office, carrier, patient, DOS,
code; tie-breaker the row id. Page break: office band; `page_break_by` not offered (enhancement: new page per carrier in
Detail, value `carrier`, layout only). Summary cards (both formats): `Lines` (count), `Charges Submitted`, `Paid
Amount`, `Patient Responsibility`, `Contract Obligations`. `denial_rate_pct` is shown as context only (header), never as
`reconciles_with` (different basis: claims, not 835 lines). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Horizontal bars: top 10 reason codes by adjustment amount, split by group (`charts[]` kind `bars`, block `detail`, `top_n` 10); Summary: bars of paid versus charges submitted per carrier |
| Summary carrier row | `kind rows`: format `detail` filtered to that carrier (and office) |
| Detail service-code line / reason line | `kind rows`: Excel-grain block filtered to the code (and reason), with `output_format = pdf` kept |
| `ClaimID` (grid) | `kind record`, entity claim, `route_key claim_detail`, `right_code transactions_insurance_claims_details_view_only` |
| `PatientID` (grid) | patient shell (`phi_identified`) |
| Footer link | `kind report` `insurance.eob_835_claims_reconcile_report` with `office_scope`, `carrier_ids`, dates, `date_basis = payment_date` |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Open claim | row (grid) | `navigate` | claim feature right | P2 |
| Send to denied-claims queue | bulk (grid rows) | `custom:add_to_denied_claims` into `worklists.denied_claims` (one entry per matched claim, de-duplicated) | `insurance` + task feature right | P3 (ENG-49, DASH-28, DATA-31) |
| Create follow-up | bulk | `create_task` per matched claim | task feature right | P3 |
| Export selection | bulk | `export_selection` | `reports_export_data_files` | P2 |

Doubles as a worklist: no; it feeds `worklists.denied_claims` (06, P3).

### Export and print

| Output | Rule |
|---|---|
| PDF | Summary: `banded_table`, portrait, office band, office total. Detail: `banded_table`, landscape, carrier band, bold service-code lines with indented reason lines, carrier total; footer echo `From`, `Thru`, `Offices`, `Carriers`, `Exclude Reason Code` |
| XLSX | Default output. Sheet `service_lines` with the 21 legacy columns as typed cells (codes as text, amounts as numbers), frozen header, autofilter, final `Total : <n>` row (NEW xlsx option `total_row`, owner 02); criteria sheet. No merged cells |
| CSV | Same 21 columns, no total row |
| Background | Not needed within 31 days; `escalate_when` `office_scope = all` with more than 50,000 lines |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Population: lines with any adjustment, or only claims with payer status denied / partially paid (835 `CLP02`, not stored: NEW `era_claim_payments.payer_claim_status_code`)? | Lines with any adjustment |
| 2 | EXCLUDE REASON CODE: drops adjustment rows or whole service lines? Value list of the picker? | Drops adjustment rows, then empty lines; CARC list |
| 3 | Excel with several codes of one group on a line: one row per line (joined codes) or one row per code? | One row per line, joined |
| 4 | Detail `Count`: service lines or reason occurrences ("number of reason codes per service")? | Lines at service level, occurrences at reason level |
| 5 | Date basis: remittance payment date or posting date | Remittance payment date |
| 6 | Tenant enablement: hidden unless enabled, or listed with the notice (header question 5) | Hidden unless enabled |

## RTE Sweep Details - `insurance.rte_sweep_details`

Insurance Reports, screenshot 13.PNG - P2 - S - `reports_insurance_reports_screen_view_only` (family `insurance`) - interactive - INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front office, insurance coordinator | Each morning, for the checks the overnight sweep made (inferred) | Review the results of the automatic real-time-eligibility (RTE) sweep of upcoming appointments (the system checks patients with a plan a configured number of days before the appointment and updates the plan status `[D]` `[R29]` `[R30]`); call patients whose coverage came back `Not Eligible` or with a payer error before they arrive |
| Office manager | Weekly | See whether the sweep ran and which payers reject inquiries (subscriber not found, payer unavailable) |

### Legacy output

Confidence: **INFERRED** - the report is not described by the vendor. Documented feature: the stored result shows
`Checked by: Auto_RTE`, the check time, `PAYER`, `SUBSCRIBER` and an `ERROR` text when the payer rejects the inquiry
`[R32]`; statuses `Eligible`, `Not Eligible`, `Unknown`; a status expires a month after the last check `[R28]`; offices on
AutoEligibility no longer run the nightly RTE `[R34]`, so the report can be empty for them.

| Element | Content | Evidence |
|---|---|---|
| Printed title | `RTE Sweep Details` (menu name; not seen) | inferred |
| Columns (reconstructed), in order | `Checked On` (date-time, the CREATED ON range) - `Office` - `Appt Date` - `Patient` - `Carrier / Payer ID` - `Subscriber` - `Coverage` (P / S) - `Result` - `Payer Message` | research reconstruction; comparable: the vendor's interactive Eligibility Verification screen `[R32]` |
| Grouping / totals | Not documented. Proposal: office band -> check-date band; per band `Checks [ n ] : Eligible n, Not Eligible n, Unknown n` | proposal |
| Footer echo | `Created From`, `Thru`, `Offices` + family furniture | family |

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r13 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Rendering only; `csv` added |
| OFFICE/GROUP `Office` (default, working office) / `Office Group` + picker | `eligibility_verifications.office_id IN (...)`; the appointment office (header attribution) |
| CREATED ON DATE RANGE Start Date (today) | Office-local date of `checked_at` of the automatic check `>= date_from` (fixed basis `created_date` of the check; inferred) |
| CREATED ON DATE RANGE End Date (today) | `<= date_to`, inclusive (per-office UTC bounds, data card 4.3) |
| Population rule (no control) | Checks made by the automatic sweep only: `method = 'rte_sweep'` (`checked_by IS NULL`; legacy actor `Auto_RTE`); manual checks and DPS requests are not listed |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | Family footer actions |

Dependency rules: none (three sections, nothing greyed).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `elig_results` | `enum_multi` NEW (owner 04): `verified`, `not_eligible`, `unknown`, `error` | all ticked, `full_selection: no_predicate` | Include on the check result | Saved view "Problems only" = `not_eligible`, `unknown`, `error` |
| `appointment_date` (`appointment_date_from`, `appointment_date_to`, `appointment_date_preset`) | `date_range` NEW secondary range (owner 04) | blank | Appointment date of the checked appointment; blank = no restriction | "Tomorrow's patients not eligible" |
| `carrier_ids` | `entity_multi` (shared 3.5) | `all` | Carrier of the checked plan | - |
| `appointment_provider_ids` | `entity_multi` (shared 3.2, role `appointment`) | `all` | `rpt_appointment_facts.provider_id` | Roster-first picker |
| `latest_check_only` | `boolean` NEW (owner 04) | `false` | Keeps the last automatic check per appointment and coverage | A sweep that retries the same appointment lists it once |
| Saved view "Not eligible - next 3 days" | saved view | - | `date_preset = last_7_days`, `appointment_date_preset = next_3_days`, `elig_results = [not_eligible, error]`, `latest_check_only = true` | Morning schedule preset |

### Data

| Topic | Rule |
|---|---|
| Table | `eligibility_verifications` (DATA-34): `id`, `office_id`, `appointment_id`, `patient_id`, `subscriber_id`, `ins_plan_id`, `carrier_id`, `tier`, `method`, `status`, `payer_name`, `error_text`, `checked_at`, `checked_by` |
| Dataset | NEW `rpt_eligibility_checks` (owner 03, DATA-34): one row per verification with `checked_date` (office-local), `elig_status_class` (`verified` / `not_eligible` / `unknown`, `error` kept as its own value with `error_text`), joined to `rpt_appointment_facts` (`appointment_date`, `start_time`, `provider_id`), `rpt_patient_dim`, `rpt_insurance_coverage` (subscriber name, `sub_member_id`, carrier, `tier`) |
| Population | `method = 'rte_sweep'`, `checked_date` in range, `office_id` in scope |
| Date basis | fixed `created_date` of the check = office-local date of `checked_at` (inferred) |
| Office attribution | appointment office (`eligibility_verifications.office_id`, written from the appointment) |
| Provider attribution | appointment provider (enhancement filter only) |
| Coverage rating | **SCHEMA(34)** (coverage matrix #42): today one overwritable stamp per subscriber exists (`insurance_subscribers.elig_status`, `elig_verified_on`, `elig_verified_by` [V `app/db/models/insurance.py`]) and `verify_eligibility` writes a manual stamp only, "no clearinghouse wired yet" [V `app/services/insurance_service.py`]. The report needs DATA-34 **and** a real-time eligibility integration with a daily sweep |
| Sweep setting | Office setting "# of Days Before Appt. to Check Eligibility" (`[R29]`) does not exist: NEW `offices.rte_sweep_days_before` (owner 03 / office setup). `account_settings.auto_eligibility` exists [V `app/db/models/account.py`]; when true the report prints `auto_eligibility_on` (nightly RTE not run, report may be empty) |
| Availability notices | `needs_rte_integration` (no `rte_sweep` rows yet), `auto_eligibility_on` |
| Migrated history | None: legacy check history was not migrated; `elig_status` is `unknown` on the 65k migrated subscribers (data card 2.21) |

### Output

Report format: one (`standard`). Block `sweep_checks` (table, `row_id_column = verification_id`). Levels: office band
(`multi_office`) -> check-date band `Checked {checked_date}` with subtotal `Checks [ {row_count} ] :` and result counts;
grand total.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | - | id, hidden | aggregate | group key |
| `verification_id`, `patient_id`, `appointment_id` | - | id, hidden | phi_identified | row id, drill keys |
| `checked_at` | Checked On | datetime (tz office) | aggregate | none |
| `appointment_date` | Appt Date | date | phi_identified | none |
| `appointment_time` | Time | time | phi_identified | none |
| `provider_short_id` | Provider | text | aggregate | none |
| `chart_no` | Pat ID | text | phi_identified | none |
| `patient_name` | Patient | text, entity patient | phi_identified | key column |
| `carrier_name` | Carrier | text | aggregate | none |
| `payer_name` | Payer | text | aggregate | none |
| `subscriber_name` | Subscriber | text | phi_identified | none |
| `sub_member_id` | Sub ID | text | phi_sensitive | none |
| `coverage_tier` | Coverage | enum (`P`, `S`) | aggregate | none |
| `result` | Result | enum (`Eligible`, `Not Eligible`, `Unknown`, `Error`) | aggregate | `count` per value in the band label |
| `error_text` | Payer Message | text | phi_identified (free text, rule 4) | none |
| `checked_by_label` | Checked By | text (`Auto_RTE`) | aggregate | none |

Sort: default `checked_at`, then patient sort name; enhancement `sort_by` = `appointment_date`, `result`. Page break:
office band. Summary cards: `Checks`, `Not eligible`, `Errors`, `Unknown` (block totals). `reconciles_with`: none
(`eligibility_verified_pct` is an appointment-window metric of P3, not a check count). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Stacked bars per check day by result (`bars`); second chart: top payers by `error` count |
| `Patient` | patient shell (`phi_identified`) |
| `Appt Date` | `kind record`, entity appointment, `route_key scheduler_appointment` (Scheduler on that day with the appointment open), right of the Scheduler |
| `Carrier` / row | `kind record`, the patient's insurance slot screen (eligibility tab) |
| Card `Not eligible` | `kind rows` with `elig_results = [not_eligible]` |
| Footer link | `worklists.eligibility_verification` (P3) with the same offices and the appointment-date range; until P3 `insurance.dps_eligibility_report` |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Open appointment / open insurance | row | `navigate` | Scheduler / patient insurance right | P2 |
| Text patient to update insurance | bulk | `send_sms` to the listed patients (`requires sms_consent`, exclusion count shown; template owned by the SMS feature) | SMS feature right | P3 |
| Verify manually | row | `navigate` to the slot's Verify Eligibility (existing manual stamp, `POST /insurance-subscribers/{subscriber_id}/verify-eligibility` [V]) | patient insurance right | P2 |
| Export selection | bulk | `export_selection` | `reports_export_data_files` | P2 |

Doubles as a worklist: no; the actionable queue is `worklists.eligibility_verification` (06, P3), which reads the same
`rpt_eligibility_checks` rows.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (payer message), letter; office and check-date bands; footer echo `Created From`, `Thru`, `Offices` |
| XLSX | Sheet `sweep_checks` flat typed columns plus `Office Name`; criteria sheet |
| CSV | Main block |
| Background | Not needed |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Is CREATED ON the date-time of the automatic check (our reading) or the appointment created date? | Check date-time |
| 2 | Column list, grouping and totals (whole layout INFERRED) | Proposal above |
| 3 | Are manual RTE checks or AutoEligibility refreshes listed too? | Automatic sweep only |
| 4 | One row per appointment or per appointment and coverage (primary and secondary checked separately)? | Per check (appointment x coverage) |
| 5 | Which RTE integration and the sweep schedule (outside this module); where the days-before setting lives | `needs_rte_integration` notice; NEW office setting |

<!-- WORK-ITEMS -->
| RPT-INS-70 | Unbilled Report Due to No Insurance definition: `bill_tier = 'none'` unclaimed population with the active-dental-slot `EXISTS` test, service-date basis, proposed 10 columns plus `Bill`, `Ins. Eff.`, `Days`, office band and totals, enhancements (`provider_ids`, `carrier_ids`, `coverage_effective_rule`, `exclude_zero_fee`, `sort_by`), drill to the ledger line, funnel link to Procedures on Hold, two saved views | P2 | S | RPT-INS-03, DATA-06, DATA-21, DATA-33, ENG-11, ENG-23, ENG-27 | Default run lists only today's live `none` lines without claim of insured patients in the working office; a patient with two dental slots shows each line once; a line with a claim or with billing order `Dental` never appears; app rows print the `bill_tier_derived` notice until DATA-33 |
| RPT-INS-71 | Stage `no_billing_order` of `worklists.unbilled_procedures` with bulk `custom:set_billing_order` (billing order Dental, re-estimate) proposed to 06 | P3 | S | RPT-INS-70, ENG-49, DASH-28 | Setting the order on 10 selected lines PATCHes 10 charges once each (idempotent on rerun); the lines leave the stage and appear on Claims Not Created; the action needs the transaction-entry right |
| RPT-INS-72 | ERA reporting layer: NEW `era_service_lines` table and `era_adjustments.era_service_line_id` (amendment to DATA-38), `era_claim_payments.patient_name_835` and `payer_claim_status_code`, payee -> office mapping, NEW views `rpt_era_claim_payments`, `rpt_era_service_lines`, `rpt_era_adjustments` with `report_office_id` and office-local `file_received_date` (handed to 03) | P2 | M | DATA-38, DATA-05, DATA-21 | Line money summed over `rpt_era_service_lines` equals the 835 file's claim totals on a fixture with multi-reason lines (no multiplication); an unmatched payment with a mapped payee lands in that office, otherwise in Unassigned office; R-01 style uniqueness holds on every view |
| RPT-INS-73 | EOB 835 Claims Reconcile definition: claim-payment rows with carrier and check bands, `claim_matching_status`, `claim_status` on `claim_status_after`, `date_basis` payment / file received, `show_details_ucr` service-line block with DentC UCR, DOS-mismatch column, last-file-received notice, `needs_era_integration` | P2 | M | RPT-INS-08, RPT-INS-72, ENG-11, ENG-23, ENG-27 | Both / Matched / UnMatched partition the default population; `Closed` returns no unmatched rows; unticking Show Details UCR removes only the line block; check subtotals equal the sum of their rows; empty ERA tables return the notice, not an error |
| RPT-INS-74 | EOB 835 enhancements: `posting_status`, `not_posted_reasons`, `days_unposted_min`, `provider_ids`, `check_totals` block (835 file total vs claim payments vs DentC posted payments by check / EFT number), two saved views, posted / unposted chart | P2 | S | RPT-INS-73, DATA-28, FLT-08 | For a fixture file with one unposted claim payment the `difference` of its check equals that payment's paid amount; untouched defaults reproduce RPT-INS-73 output; the unmatched saved view shows Unassigned-office rows only to all-office callers |
| RPT-INS-75 | 835 Denial Report definition: Summary (carrier rows, office total), Detail PDF (carrier -> service code -> reason levels with counts), Excel 21-column grid with final `Total : <n>` row, `xlsx` + `detail` + office `all` defaults, d01 forced rule, 31-day validation, exclude rule on adjustment rows, group mapping PR / CO / OA+PI, tenant enablement | P2 | L | RPT-INS-08, RPT-INS-72, RPT-INS-76, FLT-08, ENG-11, ENG-23, ENG-27 | The form opens with Excel, Detail greyed-marked, office ALL; a 32-day span is refused; excluding code 45 lowers Contract Obligations by the code-45 amount and leaves Charges Submitted of kept lines unchanged; Summary carrier totals equal Detail carrier totals; Excel columns and order equal the documented list |
| RPT-INS-76 | Reason and remark code reference: NEW `era_reason_codes` (CARC / RARC code, description, active) seeded from the published code lists, feeding `lookup:denial_reason_codes` and the description columns | P2 | S | FLT-08, DATA-38 | Every reason and remark code on the fixture resolves to a description; an unknown code prints the code with `(unknown code)`; the picker lists active codes first |
| RPT-INS-77 | 835 Denial enhancements: `adjustment_group_codes`, `include_reason_codes`, `denial_kind`, `provider_ids`, `procedure_codes`, Summary `compare_to = previous_period` and `denied_lines`, top-reason chart, drill from reason line to grid rows, two saved views; P3 bulk hand-off to `worklists.denied_claims` | P2 | M | RPT-INS-75, ENG-28; P3 part: ENG-49, DASH-28, DATA-31 | `denial_kind = denied` lists only lines with paid 0; prior-period columns use a window of the same length that also passes the 31-day rule; untouched defaults reproduce RPT-INS-75 output byte for byte |
| RPT-INS-78 | RTE Sweep Details definition: NEW `rpt_eligibility_checks` view (handed to 03), `method = 'rte_sweep'` population on the office-local check date, proposed 16 columns, office and check-date bands with result counts, enhancements (`elig_results`, `appointment_date`, `carrier_ids`, `appointment_provider_ids`, `latest_check_only`), drills to Scheduler and insurance slot, notices `needs_rte_integration` and `auto_eligibility_on` | P2 | S | RPT-INS-06, DATA-34, DATA-16, ENG-11, ENG-23, ENG-27 | A manual check never appears; a check at 23:30 office time on day D is listed for D, not D+1; with `latest_check_only` an appointment checked twice is listed once with the later result; before DATA-34 rows exist the run is empty with the notice |
| RPT-INS-79 | Sweep prerequisites recorded for the eligibility integration: NEW `offices.rte_sweep_days_before`, sweep writer contract (one `eligibility_verifications` row per appointment x coverage, `method = 'rte_sweep'`, `checked_by` NULL, payer and error text) and status expiry after one month (handed to 03 and the integration owner) | P2 | S | DATA-34 | The contract document lists the fields RPT-INS-78 reads; a sweep fixture written to it produces the expected report rows; expiry turns a status older than one month to `unknown` on the coverage dataset only, never on the stored check rows |
<!-- /WORK-ITEMS -->
