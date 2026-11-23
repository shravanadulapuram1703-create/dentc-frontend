# Insurance Reports - report specifications

The 13 legacy Insurance Reports: the claim funnel from unbilled procedure to remittance, managed-care (capitation)
reporting, benefits remaining before rollover, and eligibility verification. Hub home: **Insurance** (brief section 1),
report_key prefix `insurance.`, right family `insurance`. Default phase **P2** (Month-end, A/R and insurance); every report keeps P2.

## Overview

Legacy order of the 13-entry menu (the tenant with `835 Denial Report` enabled). Size: S up to 2 days, M up to 1 week,
L up to 2 weeks. Availability = default-run rating of `coverage_matrix.md` 11.1 (#30-#42). Confidence = legacy output
confidence of `research/legacy_report_outputs_insurance_txplan_ortho.md` section 2.

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `insurance.claims_list` | Claims List | Claims (or pre-authorisations) generated in a date range, banded by carrier, for audit and follow-up | P2 | M | APP (created date not loaded for migrated claims); REPAIR(10), REPAIR(32), SCHEMA(21) for options | DOCUMENTED (2011 sample) |
| `insurance.capitation_utilization` | Capitation Utilization | Monthly report to a managed-care (DHMO) carrier of the procedures done for its members, with co-pay and supplemental fee | P2 | L | REPAIR(32); SCHEMA(33) payer on the charge | DOCUMENTED (Detail, 2008 sample); Summary INFERRED |
| `insurance.claims_created_not_sent` | Claims Created Not Sent | Claims saved but never transmitted or printed (legacy status `Q`), to batch and send | P2 | S | APP; REPAIR(32) statuses | INFERRED |
| `insurance.procedures_on_hold` | Procedures on Hold | Procedures with `Hold Claim` ticked, so the hold can be released and a claim generated | P2 | S | READY | PARTIALLY DOCUMENTED; layout INFERRED |
| `insurance.dps_eligibility_report` | DPS Eligibility Report | Appointments and their insurance-verification requests to the verification service (DPS), by appointment date or created date | P2 | M | READY (current stamp); SCHEMA(34) for history, verify type and On Hold | INFERRED |
| `insurance.capitation_payment` | Capitation Payment | History of capitation payments received from managed-care carriers | P2 | M | SCHEMA(38); APP afterwards | PARTIALLY DOCUMENTED; layout INFERRED |
| `insurance.benefits_used_unused` | Benefits Used/Unused | Patients with benefits remaining before their plan anniversary who have a treatment plan (or are due for recall) | P2 | L | REPAIR(32); SCHEMA(53) for Exclude Responsible Party Type; Recall mode needs the derived `rpt_recall_due()` (P3 under DATA-41, requested for P2 by RPT-INS-47; known P2 parity gap until it ships) | DOCUMENTED (both modes, 2011-2012 samples) |
| `insurance.outstanding_claims` | Outstanding Claims | Sent claims (or pre-authorisations) not yet paid, banded by carrier and aged on estimated insurance; creates follow-up tasks | P2 | L | REPAIR(32); REPAIR(10) estimates; SCHEMA(31) for a past Report Date | DOCUMENTED (2023 PDF, Excel c. 2015) |
| `insurance.claims_not_created` | Claims Not Created | Billable procedures per coverage tier that have no claim (held procedures included) | P2 | M | APP (derived bill tier until SCHEMA(33)); REPAIR(10), REPAIR(12) history; SCHEMA(13) DOS vs Transaction date | PARTIALLY DOCUMENTED; layout INFERRED |
| `insurance.unbilled_report_due_to_no_insurance` | Unbilled Report Due to No Insurance | Procedures posted before insurance was attached (billing order None), which must be edited before a claim can be generated | P2 | S | READY; SCHEMA(33) for app rows | PARTIALLY DOCUMENTED; layout INFERRED |
| `insurance.eob_835_claims_reconcile_report` | EOB 835 Claims Reconcile Report | ERA (835) claim payments processed in a range, matched or not, posted or not with the reason | P2 | M | SCHEMA(38); data only with a clearinghouse ERA integration | PARTIALLY DOCUMENTED; layout INFERRED |
| `insurance.835_denial_report` | 835 Denial Report | ERA 835 payments that were denied or partially paid: Summary by carrier, Detail by carrier, service code and reason code, flat Excel | P2 | L | SCHEMA(38); SCHEMA(31) claim-level denial fields | DOCUMENTED (2023 samples and field definitions) |
| `insurance.rte_sweep_details` | RTE Sweep Details | Results of the automatic real-time-eligibility sweep of upcoming appointments | P2 | S | SCHEMA(34); data only with a real-time eligibility integration | INFERRED |

## Shared rules

### Family structure

| Group | Reports | Population (data card 2.20 consumer rules) |
|---|---|---|
| Claim lists | Claims List, Claims Created Not Sent, Outstanding Claims | `rpt_claim_facts`; `is_preauth` chosen by `claim_kind`; `status_class` per report (Claims List = sent claims, `unsent` only with `include_unsent`; Created Not Sent = `unsent`; Outstanding = `sent`, `partially_paid` with `outstanding_quality <> 'unknown'`) |
| Pre-claim exceptions | Unbilled Report Due to No Insurance, Procedures on Hold, Claims Not Created | `rpt_charges` (`bill_tier = 'none'`; `hold_claim`), `rpt_unclaimed_charge_tiers` (`NOT has_claim`, held procedures included) |
| Managed care | Capitation Utilization, Capitation Payment | `rpt_charges` x `rpt_insurance_coverage` (`is_prepaid`) x `rpt_fee_schedule_fees`; `capitation_payments` (DATA-38) |
| Benefits | Benefits Used/Unused | `rpt_benefit_usage()`, `rpt_insurance_coverage`, `rpt_treatment_item_facts`, `rpt_recall_due()`, `rpt_account_dim` |
| Remittance (ERA 835) | EOB 835 Claims Reconcile Report, 835 Denial Report | `era_files`, `era_claim_payments`, `era_adjustments` (DATA-38), joined to `rpt_claim_facts` when matched |
| Eligibility | DPS Eligibility Report, RTE Sweep Details | `rpt_appointment_facts`, `rpt_insurance_coverage` (`elig_status_class`, `elig_verified_on`); `eligibility_verifications` (DATA-34) |

The eight claim-funnel stages (research section 1 item 2) stay eight reports; the funnel view across them belongs to the
insurance dashboard (`dashboards.insurance_rcm`, DASH-14) and the worklists of 06.

### Shared parameters and defaults

Every control of the 13 screens is mapped in `catalog/parity/insurance_reports.parity.json` (130 controls, PARITY VALID).
Keys and types are those of filter_card section 3; report sections do not restate them.

| Parameter (value keys) | Type | Reports | Legacy default -> default | Family rule |
|---|---|---|---|---|
| `output_format` | `enum` `pdf` / `xlsx`, added `csv` | all 13 | PDF -> `pdf`; **835 Denial Report: Excel -> `xlsx`** (documented) | `role: output`, except `role: query` on Outstanding Claims and 835 Denial Report (rules r08.d01, r12.d01). Screen preview always first |
| `office_scope` (`office_ids`, `office_group_id`, `office_group_ids`, `all_offices`) | `office_scope` | all 13 | Office, picker = working office -> `working_office`; **835 Denial Report: `all`** (documented) | Include; `all` = every office the caller may read; applied to the office attribution below |
| `date_range` (`date_from`, `date_to`, `date_preset`) | `date_range` | 11 (not Outstanding Claims, Claims Not Created) | today / today -> `today` / `today`; Benefits Used/Unused `start_of_next_month` / `start_of_next_month+1y-1d` (preset `upcoming_benefit_year`) | Inclusive, office-local dates; basis in the table below; 835 Denial Report `validation.max_span_days: 31` |
| `report_date` | `date` | Outstanding Claims (`as_of`), Claims Not Created (`single_day`) | today -> `today` | Claims Not Created: enabled_when `date_basis != all` |
| `carrier_ids` | `entity_multi` (`lookup:carriers`) | Claims List, Capitation Utilization, Claims Created Not Sent, Capitation Payment, Outstanding Claims, EOB 835, 835 Denial | ALL -> `all` | Carrier of the claim; of the prepaid slot (Capitation Utilization); of the payment (Capitation Payment, ERA) |
| `provider_ids` | `entity_multi` (`lookup:providers`) | Capitation Utilization, Claims Created Not Sent, DPS Eligibility, Benefits Used/Unused, Outstanding Claims | ALL -> `all` | Role per report (provider attribution below); never scoped by `providers.office_id` |
| `claim_kind` | `enum` | Claims List, Outstanding Claims | Claims -> `claims` | `pre_authorization` lists pre-authorisations instead (documented) |
| `claim_type` | `enum` | Claims List, Claims Created Not Sent, Outstanding Claims | Both -> `both` | Dental / medical category; meaning inferred |
| `claim_sent_types` | `enum_multi` | Claims List, Outstanding Claims | both ticked | `full_selection: no_predicate` over the report's own population (both populations hold sent claims only); channel not stored until DATA-21 (`sent_method`) |
| `claim_amount_min` | `decimal` | Claims List, Claims Created Not Sent, Outstanding Claims | 0.00 -> `"0.00"` | `billed_amount >= value` (never summed across a claim family) |
| `patient_name` (`patient_name_from`, `patient_name_to`) | `text_range` | Claims List, Claims Created Not Sent | AAAAA / ZZZZZ | Patient sort name, prefix rule; needs `phi_identified`; never written to a URL |
| `group_by` | `enum` `none` / `provider` | Capitation Utilization, Claims Created Not Sent, Outstanding Claims | None -> `none` | Provider level inferred; disabled with `xlsx` on Outstanding Claims only (documented) |
| `report_format` | `enum` `detail` / `summary` | Capitation Utilization, 835 Denial Report | Detail -> `detail` | 835 Denial: forced `detail` with `xlsx` |
| Report-specific keys | - | per report | as the parity file | `facility_id`, `include_ucr`, `compare_fee_schedule_id`, `print_all_codes`, `include_fees_charged`, `print_office_address`, `show_billing_provider_for_hygienist`, `eligibility_on_hold`, `date_range_type`, `appointment_created_date` (`date_range`, value keys `appointment_created_date_from` / `appointment_created_date_to`), `include_patients_with_no_insurance`, `report_type`, `exclude_resp_party_type_codes`, `aging_buckets`, `date_basis`, `coverage_orders`, `claim_matching_status`, `claim_status`, `show_details_ucr`, `include_resolved_claims`, `exclude_reason_codes`; Recall state of Benefits Used/Unused: `recall_date`, `max_over`, `recall_procedure_codes` (04 vendor-doc parameters, `visible_when report_type == recall`) |

Footer actions: `CLEAR CRITERIA` -> `frontend` (reset to the defaults above), `PRINT / PREVIEW` -> `print`,
`ADD TO MY FAVORITES` -> `saved_view` (reads UPDATE MY FAVORITES when opened from a favorite) on all 13 reports.
`CREATE TASK` exists on Outstanding Claims only: bulk action `create_tasks` (RPT-INS-07).

### Date bases

| Report | `date_basis` | Evidence | Migrated-data limit |
|---|---|---|---|
| Claims List | `created_date` (claim generated) | documented | no created date on migrated claims (APP) |
| Capitation Utilization | `transaction_date` of the procedure | inferred (sample column Tran. Date) | equals `service_date` until DATA-13 |
| Claims Created Not Sent | `created_date` (claim created) | inferred (section title) | APP |
| Procedures on Hold | `service_date` | inferred | - |
| DPS Eligibility Report | `appointment_date` and / or appointment `created_date`, chosen by `date_range_type` | screenshot; non-default states inferred | migrated appointments have no created date |
| Capitation Payment | `payment_date` | inferred | APP (DATA-38) |
| Benefits Used/Unused | `anniversary_date` (next benefit rollover of the slot) | documented | plan anniversaries right only after the source-field backfill |
| Outstanding Claims | `report_date` as of; ageing on `age_date_sent` | as-of documented; age basis unverified | a past date needs `rpt_claim_facts_as_of()` (DATA-31) |
| Claims Not Created | `all` / `service_date` / `transaction_date` (radio), single day | screenshot; single-day use documented | DOS and Transaction select the same rows until DATA-13 |
| Unbilled Report Due to No Insurance | `service_date` | inferred | - |
| EOB 835 Claims Reconcile Report | `payment_date` / `file_received_date` (radio) | screenshot; range documented | ERA rows exist only from the integration |
| 835 Denial Report | `payment_date`, at most 31 days | basis inferred, span documented | as above |
| RTE Sweep Details | `created_date` of the automatic check | inferred | rows exist only from DATA-34 and the integration |

Every inferred basis is an item of FLT-23 (live legacy verification). Each definition prints its basis in the criteria echo (AD-9).

### Office and provider attribution

| Report | `scope.office_attribution` | `scope.provider_attribution` |
|---|---|---|
| Claims List, Claims Created Not Sent, Outstanding Claims | claim office (`rpt_claim_facts.office_id`) | claim provider: `treating_provider_id`, else `billing_provider_id` (06 section 6.7); Claims List has no provider filter |
| Capitation Utilization, Procedures on Hold, Claims Not Created, Unbilled Report Due to No Insurance | office of service (`rpt_charges.office_id`, PD-6) | treating provider (`rpt_charges.provider_id`) |
| DPS Eligibility Report, RTE Sweep Details | appointment office (`rpt_appointment_facts.office_id`) | appointment provider |
| Capitation Payment | office where the payment was applied (`capitation_payments`, DATA-38) | none (carrier-level payment, no patient) |
| Benefits Used/Unused | patient home office (`rpt_patient_dim.home_office_id`), proposed - legacy rule not documented | proposed: treating provider of the planned item (Treatment Plan), preferred provider (Recall) |
| EOB 835 Claims Reconcile Report, 835 Denial Report | office of the matched claim; an unmatched 835 claim payment is the member "Unassigned office" (data card 5.1 rule 3) until the ERA payee carries an office (NEW, owner 03) | none |

`provider_restriction = none` for the family (not a My Reports family). With several offices in scope the PDF prints one
`Office : <name>` band per office (`fixed_outer` with `["ctx", "multi_office"]`); Excel adds `Office` / `Office Name` columns.

### Money and sign conventions

| Rule | Detail |
|---|---|
| Claim money | `billed_amount`, `ucr_amount` describe the family's lines and are never summed across a claim family; `expected_amount`, `paid_amount`, `writeoff_amount`, `outstanding_amount` are per tier and additive (data card 2.20). Pre-authorisations are never in a money aggregate with claims |
| Display sign | Every money column prints positive as the legacy reports do: billed, estimated, received and remaining amounts. Payments are stored negative in `rpt_payments` (money in = `-amount`); the capitation payment prints the amount received |
| Capitation | The `cap` / `capa` legs net to zero and never enter a patient balance; Capitation Payment lists the payment leg only |
| 835 amounts | Charges Submitted, Contract Obligations (CO), Patient Responsibility (PR), Other Adjust (OA), Actual Allowed, Paid Amount as received on the remittance; never re-signed |
| Unlimited plans | A plan maximum of `99999` prints as `99,999.00` and is flagged `unlimited`; it is excluded from any total of remaining benefits |
| Quality caveats | Rows with `outstanding_quality = 'unknown'` or `expected_basis <> 'estimate'` are counted and printed in a notice, never silently included (data card 2.20) |

### Status vocabulary

Legacy claim letters -> `rpt_claim_facts.status_class` (data card 3.2): `Q` Created, Not Sent -> `unsent`; `S` Sent ->
`sent`; `P` Partial Payment -> `partially_paid`; `A` Closed -> `closed` / `paid`; `PS` / `PC` -> `is_preauth` with
`sent` / `closed`. `void` and `deleted` claims are never listed by any report of the family. Eligibility: `verified`,
`not_eligible`, `unknown` (legacy Eligible / Not Eligible / Unknown). Migrated claim statuses are reliable only after
REPAIR(32) (section 6 #15 of 03).

### Page furniture

| Element | Rule |
|---|---|
| Header | Organisation name, printed title, `Office : <name>` band per office. Printed titles differ from menu names and are kept: `Claims Listing`, `Capitation Utilization - Detail` (and `- Summary`, inferred), `Benefits Used/Unused Report - Treatment Plan` / `- Recall`; the others print the menu name (not seen, inferred) |
| Header block | Capitation Utilization prints the office block (address, `Ph # :`, `Tax ID :`) when `print_office_address`, and `Facility ID : <facility_id>` |
| Carrier band | `Carrier : <name>   Ph : <phone>` with `Total for <carrier> [ n ] :` on the claim lists (documented for Claims Listing and Outstanding Claims); grand totals not visible on the samples (`grand_total.enabled = true` proposed) |
| Footer | `pdf.criteria_echo = footer`: the resolved criteria in the legacy echo wording of each report's sample (Outstanding Claims: `Report Date`, `Offices`, `Providers`, `Carriers`, `Claim Sent Type : EClaim and Paper`, `Claim Amt Over/Equal`; Claims List: `From`, `Thru`, `Pat From`, `Thru`, `Carrier`, `Claim Type : EP`, `Claim amt over`, plus `Claim Category`; Benefits Used/Unused: `Anni Date From`, `Thru`, `Ex Resp. Type`, `Providers`; the others as their Legacy output), then title, `Printed : <date time>`, `Page : n of m` |
| Excel | Flat typed rows, one header row, criteria on a `criteria` sheet (`xlsx.criteria_sheet`), never merged title cells; Outstanding Claims and 835 Denial keep the legacy Excel column lists |

### Rights and data classes

| Topic | Rule |
|---|---|
| Right | Family `insurance`: `reports_insurance_reports_screen_view_only` (run, view) / `reports_insurance_reports_screen_full_control` (print, export, schedule) (security card 2.2, PD-10). Override: `insurance.dps_eligibility_report` = any of `insurance`, `appointments_dps_ins_verification_reports` (security card 2.3). XLSX / CSV also need `reports_export_data_files` |
| Tenant enablement | `insurance.835_denial_report` is listed only for tenants that enable it (documented legacy behaviour). NEW definition field `availability.tenant_flag` (owner 02; catalog listing rule owner 08), not a parameter; scope of RPT-INS-75 |
| `phi_identified` | Patient name, chart number, patient id, DOB, phones, claim number, dates of service, procedure code, tooth, surface, appointment date, claim note (free text). Key column of every patient-row report: a caller without it is refused (02 section 3.3) |
| `phi_sensitive` | Subscriber id / member id (`Sub ID`), subscriber DOB, group number on a patient row |
| `financial_patient` | Money on a claim, charge, patient or 835 service-line row and its subtotals (rule 2 of security card 5.2): claim amount, UCR, estimate, received, remaining, buckets, fees, co-pay, supplemental fee, benefit maxima and remainders of a patient |
| `financial_practice` | Rows without a patient: 835 Denial Summary by carrier, Capitation Payment rows, summary cards |
| `provider_comp` | The provider group key when `group_by = provider` in a block with money (rule 3) |
| `payment_instrument` | Check #, bank #, EOB #, EFT trace number (Capitation Payment, EOB 835) |
| `aggregate` | Carrier name and phone, office, reason and remark codes, status, created-by user label |
| Parameters | `patient_name` needs `phi_identified` (rule 8) |

### Metrics behind the summary headers

Summary cards are block totals of the same run (02 section 3.7) and `reconciles_with` these metric keys (metrics card 5.3):
Outstanding Claims count = `outstanding_claims_count`; with `aged_amount_basis = remaining` the grand Total =
`outstanding_claims_amount` and the Over 90 + Over 120 share = `claims_over_90_pct` (the legacy `estimate` basis buckets
`Est. Ins` and equals them only when no listed claim carries a payment); Claims Created Not Sent: saved view "All unsent
claims" count plus the count of migrated unsent claims (`era = 'migrated'`, reached only under `date_basis =
service_date`) = `claims_unsent_count`; Claims Not Created primary-tier total = `unbilled_production_amount`; Procedures
on Hold `is_production` lines = `procedures_on_hold_amount`; 835 Denial Report feeds `denial_rate_pct` (proxy) context
only; Benefits Used/Unused total remaining = `benefits_remaining_amount` (P3 metric: the card is shown when the metric
ships); Capitation Utilization hidden `Office UCR` total = `capitation_value_of_services` (P3) for `print_all_codes = true`
and primary-tier prepaid slots.

### Family-wide enhancements (additive; the untouched form is the legacy run)

| Enhancement | Detail |
|---|---|
| Drill-through | Claim number -> claim record (`kind record`, right of the claim screen); patient -> patient shell (`phi_identified`); carrier band total -> `rows` of that carrier; Procedures on Hold / Unbilled -> the procedure in the ledger |
| Funnel links | Each pre-claim and claim report links to the next stage report with the same `office_scope` and dates (drill `kind report`) |
| Row actions | Open claim, open ledger, open Scheduler booking hand-off where an appointment is the row |
| Legacy aliases | `legacy_names[]`: `Claims Listing`, `Capitation Utilization - Detail`, `Benefits Used/Unused - Recall`, `Outstanding Claims - Excel`, `Outstanding Claim Report for Provider`, `Pre-Auth Outstanding Claims`, `EOB Claim Reconcile Report` (vendor spelling) |
| Saved views shipped | The old report names as organisation views: `Outstanding Claims - Excel` (`output_format = xlsx`), `Outstanding Claim Report for Provider` (`group_by = provider`), `Pre-Auth Outstanding Claims` (`claim_kind = pre_authorization`), `Benefits Used/Unused - Recall` (`report_type = recall`, shipped with the derived `rpt_recall_due()`, RPT-INS-47) |
| Scheduling | All 13 are `schedulable` (no patient context); suggested cadences of research 3.10 offered as schedule presets (end of day: Claims Not Created, Procedures on Hold, Unbilled; month end: Outstanding Claims, Capitation Utilization) |
| Cost class | `interactive` by default; `escalate_when` to `background` for Claims Not Created with `date_basis = all`, Outstanding Claims over all offices, Benefits Used/Unused over a 12-month anniversary range across offices, Capitation Utilization over all offices with a range over 92 days, DPS Eligibility Report over all offices with a range over 31 days, EOB 835 over all offices with a span over 31 days, 835 Denial Report over all offices above 50,000 lines |
| Bulk actions | Every bulk action (`export_selection` included) runs through the snapshot dispatch ENG-49 and SEC-36, both P3: in P2 the export is the whole-run export through `output_format`; selection export from P3 |
| Availability notices | `availability[]` entries for APP history (created dates), SCHEMA(21) channel, SCHEMA(31) past report date, SCHEMA(33) derived bill tier, SCHEMA(34) hold flag and sweep history, SCHEMA(38) "needs ERA integration", REPAIR(32) migrated statuses; printed in the criteria block |

### Family-wide open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Does PRINT FORMAT = Excel grey GROUP BY on Capitation Utilization and Claims Created Not Sent as on Outstanding Claims? | Left enabled |
| 2 | Which provider do the PROVIDER filters apply to on the claim reports (treating or billing) and on Benefits Used/Unused? | Treating, else billing; Benefits as proposed above |
| 3 | `CLAIM TYPE` Both / Dental / Medical: dental versus medical claims, and a separate `Medical Claims` band? | Dental / medical category; band per category |
| 4 | Contents of the carrier, provider, responsible-party-type and reason-code SELECT dialogs (active only, order, inactive rows) | Every row, active first |
| 5 | `835 Denial Report` tenant enablement: keep it hidden unless enabled, or list it for every tenant with the "needs ERA integration" notice? | Hidden unless enabled (legacy behaviour) |
| 6 | CREATE TASK needs ENG-49, the follow-up store of DASH-28 and SEC-36, all P3 in 02 / 06 / 08: accept the re-phase request of RPT-INS-07 (snapshot bulk dispatch, minimal follow-up store, action authorisation in P2)? | Requested; until accepted CREATE TASK is P3 and a known P2 parity gap |
| 7 | Office attribution of Benefits Used/Unused and of unmatched 835 payments | Patient home office; Unassigned office |
| 8 | Derived `rpt_recall_due()` (no recall engine) in P2 for the Recall mode of Benefits Used/Unused (request of RPT-INS-47 to 03)? | Requested; until accepted Recall mode runs empty with `recall_mode_p3`, a known P2 parity gap |

## Claims List - `insurance.claims_list`

Insurance Reports, screenshot 1.PNG - P2 - M - `reports_insurance_reports_screen_view_only` (family `insurance`) - interactive - DOCUMENTED (2011 sample `[R5]`; current layout not re-verified)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Insurance coordinator, billing staff | On demand; typically next morning for "claims generated yesterday" and at month end for the month | Audit what was billed in a period: every claim (or pre-authorisation) generated, with its estimate, what has come back and what is still expected |
| Treatment coordinator | Weekly | Track pre-authorisations sent in a period (`claim_kind = pre_authorization`) before booking the treatment |
| Office manager | Month end | Check that every claim generated in the month carries an estimate and a status; spot carriers with many claims still unpaid |

It is the "generated in a period" stage of the claim funnel (header, family structure); open receivables by age are
Outstanding Claims, unsent claims are Claims Created Not Sent.

### Legacy output

Confidence: **DOCUMENTED** from the vendor's 2011 sample `[R5]`; the current build was not re-captured.

| Element | Content | Evidence |
|---|---|---|
| Printed title | `Claims Listing` (pre-authorisation run: title not seen; we print `Claims Listing` with the sub-title `Pre-Authorizations`, proposal) | `[S]` |
| Header | Organisation name, title, `Office : <name>` band per office (family page furniture) | `[S]` |
| Carrier band | `Carrier : <name>   Ph : <phone>` | `[S]` |
| Columns, in order | 1 `Chart #` - 2 `Patient / Subscriber` (two names, slash-separated) - 3 `Patient - Subscriber DOB` (two dates) - 4 `Sub ID` - 5 `Claim #` - 6 `Claim Sent - DOS` (sent date and date of service) - 7 `Claim Amt` - 8 `Est. Ins` - 9 `Recv. Amt.` - 10 `Rem. Amt.` - 11 `Status` | `[S]` |
| Carrier subtotal | `Total for <carrier> [ n ] :` with `n` = claim count and sums of columns 7-10 | `[S]` |
| Grand total | Not visible on the sample page `[unverified]`; we print `Grand Total [ n ] :` (header: `grand_total.enabled = true` proposed) | - |
| Footer echo | `From`, `Thru`, `Pat From`, `Thru`, `Carrier`, `Provider`, `Claim Type : EP`, `Claim amt over`; then title, `Printed : <date time>`, `Page : n of m` | `[S]` |

Sign conventions: every money column prints positive (billed, estimated, received, remaining). `Rem. Amt.` equals
`Est. Ins - Recv. Amt.` on every sample row (a 100.00 claim with 0.00 estimate shows 0.00 remaining) `[I]`; we keep that
formula. `Status` prints the word of the legacy letter (`Sent` on every sample row).

| Quirk | Treatment |
|---|---|
| 2011 footer echoes `Provider : ALL` although the current screen has no provider picker | Not echoed (no parameter); a provider filter is offered as an enhancement and echoed only when it is not `all` |
| Demo rows show `ORTHO` in `Chart #` | Printed as stored; no meaning assumed |
| A secondary claim repeats the lines (and so the `Claim Amt`) of its primary claim | Kept on the row (legacy). **Deliberate fix (open question 7):** each carrier subtotal adds a claim family's `Claim Amt` once within that carrier band, so a band equals the sum of its distinct families; only the grand total and the summary card add a family once across bands (header money rule); the footer prints `Secondary claims not re-added : n` when it matters |
| `Claim Type : EP` in the footer is the sent-type echo (E = EClaim, P = Paper), not CLAIM TYPE | Kept verbatim; CLAIM TYPE is echoed as `Claim Category : Both / Dental / Medical` (our wording, open question 6) |

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r01:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| CLAIM/PRE-AUTH | (no label) (radio_group) | **Claims** / Pre-Authorization | `claim_kind` | enum | Claims -> `claims`, Pre-Authorization -> `pre_authorization` | `claims` | replicated | - |
| CLAIM TYPE | (no label) (radio_group) | **Both** / Dental / Medical | `claim_type` | enum | Both -> `both`, Dental -> `dental`, Medical -> `medical` | `both` | replicated | Dental versus medical category of the claim (rpt_claim_facts.category; insurance_claims.claim_type holds the coverage tier on migrated rows, normalisation owned by 03). That the radio filters dental versus medical claims is inferred (supplement unresolved item); both = no predicate. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office or Office Group, both enabled on this screen (nothing greyed). Office: one or more offices the caller may read, default the working office; Office Group: groups from Setup > Office Groups, default ALL. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group); both enabled on this screen. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Fixed date_basis = created_date: the date the claim was generated, not the date of service (documented, 04 section 7.2 row 13). Reads rpt_claim_facts.created_at_utc as office-local date; no created date was loaded for migrated claims (created_at_reliable = false), so the report is APP for history. Default today in the office time zone; enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | End of the claim-generated (created_date) range, inclusive. Same basis and migrated-data limit as Start Date. Default today; enhanced with presets and relative tokens. |
| NAME RANGE | Start Name (text_input) | shown: AAAAA | `patient_name_from` | text_range | - | `AAAAA` | replicated | Start of an alphabetical range on the patient sort name. The legacy title does not say whose name; the vendor sample footer prints Pat From / Thru, so it is the patient name range (same parameter as PATIENT NAME RANGE). |
| NAME RANGE | SEARCH (button) | - | `patient_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| NAME RANGE | End Name (text_input) | shown: ZZZZZ | `patient_name_to` | text_range | - | `ZZZZZ` | replicated | End of the alphabetical range on the patient sort name (inclusive, prefix rule). |
| NAME RANGE | SEARCH (button) | - | `patient_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| CLAIM AMOUNT OVER OR EQUAL TO | (no label) (number_input) | shown: 0.00 | `claim_amount_min` | decimal | - | `0.00` | replicated | Claim amount >= value, compared with billed_amount (the legacy Claim Amt column; footer `Claim amt over`). Billed amount is per claim family: a secondary claim is compared with the family's billed lines. |
| CARRIER | Carriers (picker) | shown: ALL | `carrier_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| CLAIM SENT TYPE | EClaim (checkbox) | **checked** | `claim_sent_types.eclaim` | enum_multi | - | `true` | replicated | - |
| CLAIM SENT TYPE | Paper (checkbox) | **checked** | `claim_sent_types.paper` | enum_multi | - | `true` | replicated | - |
| OTHER OPTIONS | Include Resolved Claims (checkbox) | **unchecked** | `include_resolved_claims` | boolean | - | `false` | replicated | Effect not documented (supplement unresolved item, research [I]). Mapped as: false = only unresolved sent claims (status_class sent, partially_paid, denied); true = also resolved claims (paid, closed). Pre-authorisation run: false = sent, true = also closed. Unsent claims are outside the population of this report (claims transmitted, research [R5]) unless the enhancement include_unsent is ticked; void and deleted claims are never listed. Confirm on the live tool which statuses count as resolved and whether denied claims are listed by default. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:insurance_reports.r01:END -->

| Legacy option | Effect on the result |
|---|---|
| CLAIM/PRE-AUTH `Claims` (default) | `NOT is_preauth`: claims only |
| CLAIM/PRE-AUTH `Pre-Authorization` | `is_preauth`: pre-authorisations instead of claims (documented); `Recv. Amt.` is normally 0.00; sub-title `Pre-Authorizations`; never mixed with claims in one total |
| CLAIM TYPE `Both` (default) | No predicate on `category` |
| CLAIM TYPE `Dental` / `Medical` | `category = 'dental'` / `'medical'` (meaning inferred, family open question 3); `insurance_claims.claim_type` holds the tier on migrated rows, so `category` comes from the 03 normalisation |
| OFFICE/GROUP `Office` (default) + picker (default working office) | Claim office `rpt_claim_facts.office_id IN (:office_ids)`; one `Office : <name>` band per office |
| OFFICE/GROUP `Office Group` + picker (default ALL) | Every office of the chosen groups (or every office the caller may read); multi-office bands |
| DATE RANGE Start Date / End Date (default today / today) | Fixed basis `created_date`: claim generated (`created_at_utc` as office-local date, per-office UTC bounds, data card 4.3) between the two dates inclusive. Only rows with `created_at_reliable`: migrated claims have no created date and are never selected (APP) |
| NAME RANGE Start Name `AAAAA` / End Name `ZZZZZ` (defaults) | Patient sort name `LAST, FIRST`, prefix rule, open bounds add no predicate (filter card 3.4). Needs `phi_identified` |
| NAME RANGE `SEARCH` (two buttons) | Superseded by the lookup icon in each box (writes `Last, First`) |
| CLAIM AMOUNT OVER OR EQUAL TO (default 0.00) | `billed_amount >= :claim_amount_min`; at 0.00 every claim passes, including claims whose header total was zeroed by the recompute (data card 2.20) |
| CARRIER `ALL` (default) / a selection | No predicate / `carrier_id IN (...)` on the claim's carrier |
| CLAIM SENT TYPE `EClaim` + `Paper` both ticked (default) | No channel predicate (`full_selection: no_predicate`) over sent claims: claims sent by either channel, and sent claims without a recorded channel, are kept |
| CLAIM SENT TYPE `EClaim` only / `Paper` only | `sent_method = 'eclaim'` / `'paper'`; claims without a recorded channel (every claim before DATA-21, coverage matrix #30) are dropped, notice `claim_channel_not_recorded`. Both unticked: 422 `min_items` |
| OTHER OPTIONS `Include Resolved Claims` unticked (default) | Claims: `status_class IN ('sent', 'partially_paid', 'denied')`. Pre-authorisations: `status_class = 'sent'` (proposal, open question 1) |
| OTHER OPTIONS `Include Resolved Claims` ticked | Also `paid` and `closed` (pre-authorisations: also `closed`). `void` and `deleted` are never listed |
| Population rule (no control) | Claims transmitted (research `[R5]`, sample `Sent` on every row): `status_class <> 'unsent'` (equivalently `submitted_date IS NOT NULL`); unsent claims only with the enhancement `include_unsent` (open question 9) |
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged (`role: output`); PDF banded layout or flat XLSX; `csv` added |

Dependency rules: none (no greyed control, no dynamic state documented).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `date_basis` | `enum` (shared 3.3) | `created_date` (legacy) | `created_date` / NEW value `sent_date` (`submitted_date`) / `service_date` (`service_from`). `sent_date` and `service_date` work on migrated history, so "claims sent last month" is answerable for any period | `sent_date` is NEW in the vocabulary of `04_filter_framework.md` 7.3; `service_date` on migrated claims needs the `claim_id` backfill (REPAIR(10)) |
| `include_unsent` | NEW `boolean` (owner 04) | `false` (legacy population) | `true` also lists `status_class = 'unsent'` claims (no sent date, no channel), labelled `Created, Not Sent` | The live list of unsent claims stays Claims Created Not Sent |
| `provider_ids` | `entity_multi` (shared 3.2) | `all` | Claim provider: `treating_provider_id`, else `billing_provider_id` (header attribution) | Restores the filter the 2011 footer echoes; hidden in the echo while `all` |
| `coverage_orders` | `enum_multi` (shared 2.5) | all four ticked (no predicate) | `tier IN (...)`: list only primary or only secondary claims | Same members and semantics as Claims Not Created |
| `sort_by` | `enum` (shared 3.9) | `patient_name` | Inside the carrier band: `patient_name` (sort name, then `claim_number`), `claim_number`, `created_date`, `claim_amount_desc` | Legacy row order inside a band not documented (open question 8) |
| Optional columns | column chooser | hidden | `Ty` (tier letter), `Created On`, `Created By`, `Days Since Sent`, `Outstanding` (`outstanding_amount`, net of write-offs) | Legacy columns unchanged when untouched |
| Saved view "Claims generated yesterday" | saved view | - | `date_preset = yesterday`, `office_ids = @working_office` | Next-morning audit |
| Saved view "Pre-auths this month" | saved view | - | `claim_kind = pre_authorization`, `date_preset = month_to_date`, `include_resolved_claims = true` | Treatment-coordinator tracking |
| Saved view "Claims sent last month" | saved view | - | `date_basis = sent_date`, `date_preset = last_month`, `include_resolved_claims = true` | Reconciles with `claims_submitted_count` (Output) |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_claim_facts` (rows), `rpt_patient_dim` (`chart_no`, `first_name`, `last_name`, `dob`), `rpt_user_dim` (`user_label` of `created_by_user_id`, optional column), `rpt_office_dim` (band label, `local_today`) |
| Columns used | `claim_id`, `claim_number`, `claim_family_no`, `patient_id`, `office_id`, `carrier_id`, `carrier_name`, `carrier_phone`, `tier`, `category`, `is_preauth`, `status_class`, `submitted_date`, `service_from`, `created_at_utc`, `created_at_reliable`, `created_by_user_id`, `treating_provider_id`, `billing_provider_id`, `billed_amount`, `expected_amount`, `expected_basis`, `paid_amount`, `outstanding_amount`, `outstanding_quality`, `sent_method`, `sub_member_id`, `subscriber_name`, `subscriber_dob`, `era` |
| Population | `status_class NOT IN ('void', 'deleted', 'unsent')` (`unsent` kept only with `include_unsent`), then the parameter predicates of the parity table |
| Date basis | fixed `created_date` (header date-bases table, documented); enhancement `date_basis` as above. `created_date` predicate runs on the timestamp with per-office UTC bounds and `created_at_reliable = true` |
| Office attribution | claim office `rpt_claim_facts.office_id` |
| Provider attribution | none on the legacy screen; enhancement filter on treating, else billing provider |
| Computed columns (builder, not in the data card) | `patient_sort_name = upper(concat_ws(', ', last_name, first_name))` (filter card 3.4); `tier_rank` = `primary` 1, `secondary` 2, `tertiary` 3, `quaternary` 4 |
| Family-once claim amount | hidden column `billed_amount_band_once` = `billed_amount` on the first row of each (`carrier_id`, `claim_family_no`) in the run (`row_number() OVER (PARTITION BY carrier_id, claim_family_no ORDER BY tier_rank, claim_id) = 1`), else 0: carrier subtotals; hidden column `billed_amount_once` (same window `PARTITION BY claim_family_no` only): grand total and summary card. Computed inside the filtered population |
| Remaining amount | computed `difference(expected_amount, paid_amount)` (engine computed-column kind, legacy formula); `outstanding_amount` (also net of write-offs) is the optional `Outstanding` column |
| Coverage rating | **APP** (coverage matrix 11.1 #30): the created date was not loaded for migrated claims, so the default run lists app-era claims only. Options: service dates and estimates on history REPAIR(10); carrier / plan and status mapping REPAIR(32); EClaim / Paper per claim SCHEMA(21) (filter card: only the full selection returns rows until then) |
| Quality notices | `expected_basis <> 'estimate'` rows (estimate missing or equal to billed) are counted and printed in the criteria block; migrated rows selected through the enhanced bases carry the REPAIR(32) status notice (a migrated `A` claim may show as `Sent`) |
| Migrated history | not reproducible on the legacy basis: no migrated claim can ever match a `created_date` range. Availability code `claim_created_date_app_only` (NEW, owner 03) printed when the range starts before the tenant's go-live date |

### Output

Report format: one (`standard`); `claim_kind` changes the population and the sub-title only. Block `claims` (shape `table`,
placement `main`, `row_id_column = claim_id`). Grouping: `fixed_outer` office band when `["ctx", "multi_office"]`, then
the fixed level carrier (`key_columns [carrier_id]`, `header_template "Carrier : {carrier_name}   Ph : {carrier_phone}"`,
subtotal label `Total for {carrier_name} [ {row_count} ] :`); `grand_total {enabled: true, label: "Grand Total [ {row_count} ] :"}`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | Office | id, hidden | aggregate | group key of the office band |
| `carrier_id` | - | id, hidden | aggregate | group key of the carrier band |
| `carrier_name`, `carrier_phone` | - | text, hidden | aggregate | band labels |
| `claim_id` | - | id, hidden | phi_identified | row id, drill key |
| `patient_id` | - | id, hidden, entity patient | phi_identified | drill key, manifest |
| `patient_sort_name` | - | text, hidden | phi_identified | sort key |
| `chart_no` | Chart # | text | phi_identified | none |
| `patient_subscriber` | Patient / Subscriber | text | phi_identified | key column; `Last, First / Last, First` |
| `patient_subscriber_dob` | Patient - Subscriber DOB | text (two dates) | phi_sensitive | none; XLSX / CSV split into `patient_dob` (phi_identified) and `subscriber_dob` (phi_sensitive) |
| `sub_id` | Sub ID | text | phi_sensitive | none (`sub_member_id`, open question 4) |
| `claim_number` | Claim # | text, drill `claim_record` | phi_identified | none |
| `sent_dos` | Claim Sent - DOS | text (two dates) | phi_identified | none; XLSX / CSV split into `submitted_date`, `service_from` (date) |
| `claim_amount` | Claim Amt | money | financial_patient | carrier subtotal = `sum(billed_amount_band_once)`; office band and grand total = `sum(billed_amount_once)`; row shows `billed_amount` |
| `est_ins` | Est. Ins | money | financial_patient | sum (`expected_amount`) |
| `recv_amt` | Recv. Amt. | money | financial_patient | sum (`paid_amount`) |
| `rem_amt` | Rem. Amt. | money, computed | financial_patient | sum |
| `status` | Status | enum | aggregate | none. Labels: `unsent` Created, Not Sent; `sent` Sent; `partially_paid` Partial Payment; `paid`, `closed` Closed; `denied` Denied (no legacy letter); pre-auth `unsent` / `sent` Pre Auth Sent, `closed` Pre Auth Closed |
| `tier_letter` | Ty | text, `default_visible: false` | aggregate | none (`P`, `S`, `T`, `Q`) |
| `created_date` | Created On | date, `default_visible: false` | phi_identified | none |
| `created_by` | Created By | text, `default_visible: false` | aggregate | none |
| `days_since_sent` | Days Since Sent | integer, `default_visible: false` | phi_identified | none (`local_today - submitted_date`) |
| `outstanding` | Outstanding | money, `default_visible: false` | financial_patient | sum |
| `row_count` | - | integer, hidden | aggregate | `count` per band, placeholder `[ n ]` |

Sort: `sort_by` (enhancement) inside the carrier band; carriers ordered by `carrier_name`; tie-breaker `claim_id`. Page
break: office band only. Summary cards (block totals): `Claims` (count), `Claim Amt` (family-once), `Est. Ins`,
`Rem. Amt.`. `reconciles_with`: none on the default basis; test RPT-INS-10 checks that the count equals
`claims_submitted_count` for the saved view "Claims sent last month". `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart (optional, below the table) | Horizontal bars: `Claim Amt` and `Rem. Amt.` per carrier, top 10 (`charts[] {kind: bar, block: claims, category_column: carrier_name}`) |
| `Claim #` | `claim_record`: `kind record`, entity claim, `route_key claim_detail`, `right_code transactions_insurance_claims_details_view_only` |
| `Patient / Subscriber` | patient shell (`route_key patient_overview`), `phi_identified` |
| Carrier subtotal | `kind rows`: same run filtered to the carrier |
| `Status` = Sent / Partial Payment | `kind report` `insurance.outstanding_claims` with `office_scope`, `carrier_ids` = `{column: carrier_id}`, `claim_kind` copied |
| `Status` = Created, Not Sent (only with `include_unsent`) | `kind report` `insurance.claims_created_not_sent` with `office_scope`, `carrier_ids`, `date_from` / `date_to` copied |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Open claim | row | drill `claim_record` | `transactions_insurance_claims_details_view_only` | P2 |
| Open ledger | row | `navigate` `patient_ledger` (`patient_id`) | `transactions_patient_ledger_screen_full_control` (alternative read right, security card 2.2) | P2 |
| Export selection | bulk | `export_selection` (P2: whole-run export through `output_format`) | `reports_export_data_files` | P3 (ENG-49, SEC-36) |
| Create follow-up tasks | bulk | `create_task` (outstanding claims follow-up of DASH-28) | task feature right | P3 (ENG-49) |

Not a worklist: the live follow-up list is `worklists.outstanding_claims`.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (11 columns), letter; header per family page furniture; carrier bands and subtotals; `criteria_echo = footer` with the legacy wording of Legacy output; `totals_on_last_page` |
| XLSX | One sheet `claims`, one header row, the two composite columns split into four typed columns, `Office`, `Office Name`, `Carrier`, `Carrier Phone` as columns, no subtotal rows (outline groups optional), criteria on sheet `criteria` |
| CSV | Same columns as XLSX, main block |
| Background | Not needed at the default; `escalate_when` none (one claim row per claim; NEW index on `insurance_claims (tenant_id, office_id, created_at)` for the created-date basis, owner 03, with the `rpt_claim_facts` build) |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Which statuses does `Include Resolved Claims` add (closed only, or paid and denied too)? Are denied claims listed by default? What does it do on a pre-authorisation run? | Claims: default sent, partially paid, denied, ticked adds paid and closed. Pre-auths: default sent, ticked adds closed |
| 2 | Printed title and sub-title of a pre-authorisation run | `Claims Listing` + `Pre-Authorizations` |
| 3 | Is a grand total printed; is there an office total with several offices? | Both printed |
| 4 | Is `Sub ID` the member id or the subscriber's own id? | `sub_member_id` |
| 5 | `Rem. Amt.` formula when a payment exceeds the estimate (negative remaining?) | `Est. Ins - Recv. Amt.`, sign kept |
| 6 | Footer wording for CLAIM TYPE (dental / medical) beside `Claim Type : EP` | `Claim Category : <value>` |
| 7 | Does a secondary claim print its family's `Claim Amt` and add it again to the carrier total? | Row prints it; each carrier subtotal adds a family once within the band, the grand total once overall (deliberate fix) |
| 8 | Row order inside a carrier band | Patient sort name, then claim number |
| 9 | Are claims created but never sent (legacy `Q`) listed by the default run? | No: claims transmitted only (`[R5]`); enhancement `include_unsent` |

## Capitation Utilization - `insurance.capitation_utilization`

Insurance Reports, screenshot 2.PNG - P2 - L - `reports_insurance_reports_screen_view_only` (family `insurance`) - interactive - DOCUMENTED (Detail, 2008 sample `[R8]`); Summary INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Billing staff of offices that treat managed-care (DHMO, prepaid) members | Month end, once per carrier | Produce the utilisation report the carrier requires: patients seen and services performed for its members, with the co-pay collected and the supplemental fees the carrier owes (documented) |
| Office manager, owner | Quarterly, before contract renewal | Compare the office-fee value of the work done for members with what the carrier pays (capitation and supplemental fees) |

### Legacy output

Confidence: **DOCUMENTED** for `Detail` (2008 sample `[R8]`), **INFERRED** for `Summary`.

| Element | Content | Evidence |
|---|---|---|
| Header block | Office name, address lines, `Ph # :`, `Tax ID :` (with `Print Office Address`), then `Facility ID : <value>` | `[S]` `[D]` |
| Printed title | `Capitation Utilization - Detail`; Summary: `Capitation Utilization - Summary` (not seen, inferred) | `[S]` |
| Detail columns, in order | `Patient Name` - `Sub ID` - `Sub DOB` - `Tran. Date` - `Code` - `Description` - `Th` - `Surf` - `Prdr` - `Office Default` - `Co - Pay` - `Sup. Fee.` | `[S]` |
| Grouping | `Carrier : <name>` -> `Plan ID : <id>   Group No : <no>` -> `Tran Date : <date>` (which plan identifier `Plan ID` prints is not documented, open question 9) | `[S]` |
| Totals | `Total for <group no> :`, `Total for carrier - <name> :`, `Grand Total :` over the three money columns; no total per date band | `[S]` |
| Summary (INFERRED) | Carrier and plan / group totals without patient lines (research `[I]`); we add the encounter counts of the comparable SoftDent report `[X8]` (members seen, procedures) | `[I]` |

Column meanings: `Co - Pay` and `Sup. Fee.` are the two amounts of the managed-care fee schedule (patient amount and
insurance supplemental amount, `[D]` `[R35]`); `Office Default` is taken to be the comparison (UCR) fee, all 0.00 in the
default sample `[I]`: we print the compare fee when `Include UCR` is ticked and 0.00 otherwise (inferred, FLT-23). `Th`
holds a tooth number or a quadrant (`UL`, `LL`). The default run prints exactly the 12 sample columns. All money prints positive; no patient balance is
involved (the report lists services, not money posted).

Quirks kept: zero `Office Default` values print as `0.00`, not blank; the date band repeats per plan / group. Deliberate
choice: a line whose code has neither a co-pay nor a supplemental fee on the schedule (blank / blank = non-covered,
`[D]` `[R35]`) prints both cells blank and counts in a `Non-covered lines : n` footer line.

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r02:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT FORMAT | (no label) (radio_group) | **Detail** / Summary | `report_format` | enum | Detail -> `detail`, Summary -> `summary` | `detail` | replicated | Detail = one row per procedure (printed title Capitation Utilization - Detail, documented by the 2008 sample). Summary layout is not documented: proposed carrier and plan / group totals without patient lines (research [I]); confirm on the live tool. On 835 Denial Report the same radio is locked by PRINT FORMAT; here no such rule is documented. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office or Office Group, both enabled on this screen (nothing greyed). Office: one or more offices the caller may read, default the working office; Office Group: groups from Setup > Office Groups, default ALL. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group); both enabled on this screen. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog becomes a searchable multi-select; ALL = no restriction. provider_role = treating: rpt_charges.provider_id (the Prdr column). Whether the filter follows the billing provider when Show Billing Provider For Hygienist is ticked is not documented (proposed: the filter always applies to the treating provider). Dialog content never captured - confirm list source and inactive rows on the live tool. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Fixed date_basis = transaction_date of the procedure (inferred from the Tran. Date column of the vendor sample, 04 section 7.2 row 14; FLT-23 confirms). Equals service_date on charges until DATA-13. Default today; enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | End of the transaction_date range, inclusive (basis inferred as Start Date). Default today; enhanced with presets and relative tokens. |
| FACILITY ID | (no label) (text_input) | (empty) | `facility_id` | text | - | - | replicated | Free text printed in the report header as `Facility ID : <value>` (the carrier's id for the office); not a filter (inferred from the vendor sample header). role layout: changing it re-renders the snapshot. Blank by default (legacy box empty). |
| CARRIER | Carriers (picker) | shown: ALL | `carrier_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; ALL = no restriction. Filters the carrier of the patient's prepaid (capitation) coverage slot (rpt_insurance_coverage.carrier_id with is_prepaid), inferred; the payer stamped on the charge (primary_carrier_id) replaces it from DATA-33. Dialog content never captured - confirm whether only capitation carriers are listed. |
| INCLUDE UCR | Include UCR (checkbox) | **unchecked** | `include_ucr` | boolean | - | `false` | replicated | Section header and checkbox carry the same words. |
| FEE SCHEDULE TO COMPARE | Fee Schedule To Compare (dropdown) | shown: CP-40 ( 135 ) - greyed out | `compare_fee_schedule_id` | entity_single | - | `first_option` | unknown_legacy | Enabled when: include_ucr == true. Capitation Utilization shows CP-40 ( 135 ) while the Production Reports of the same tenant show CIGNA PPO HAMILTON ( 128 ): the two values cannot both be the first entry of one list, so this dropdown has another list or another default rule. Candidates: the list is restricted to capitation fee schedules (source fee_schedules filtered by pricing_model = copay) and the default is its first entry; or the default comes from the plan or the office. Confirm list content, order and default on the live tool. Differs from the shared mapping: Same signature as Fee Schedule To Compare of the Daily Production Report (sig0056), different captured default in the same tenant. |
| OTHER OPTIONS | Print All Codes (checkbox) | **unchecked** | `print_all_codes` | boolean | - | `false` | replicated | Documented: ticked = every code including z-codes (internal extra-service codes); unticked = only the codes to be reported to the carrier. The flag that says which codes are reported to the carrier does not exist: NEW, proposed rpt_procedure_code_dim.bill_to_insurance (DATA-04) or the z-code prefix rule, owned by 03_data_foundation.md. role query. |
| OTHER OPTIONS | Include Fees Charged (checkbox) | **checked** | `include_fees_charged` | boolean | - | `true` | replicated | Documented: shows the fees associated with the reported procedures (on by default, as captured). Mapped (inferred) as: ticked = the Co - Pay and Sup. Fee. cells print the managed-care schedule fees; unticked = those cells print blank; rows and the 12 legacy columns unchanged (the 2008 default sample has no separate fee column). Alternative reading recorded for FLT-23: the box adds a charged-fee column or switches Office Default; if the live tool shows that, rebind the box to that column. role query. |
| OTHER OPTIONS | Print Office Address (checkbox) | **unchecked** | `print_office_address` | boolean | - | `false` | replicated | Documented: prints the office location block (address, Ph #, Tax ID) in the report header. role layout (renderer only). |
| OTHER OPTIONS | Show Billing Provider For Hygienist (checkbox) | **unchecked** | `show_billing_provider_for_hygienist` | boolean | - | `false` | replicated | Not documented (supplement unresolved item). Mapped (inferred) as: on a line whose treating provider is a hygienist (provider_kind = hygienist, DATA-05), the Prdr column prints the billing provider instead, because carriers accept only dentists as treating providers. Does not change the rows. Confirm on the live tool. |
| GROUP BY | (no label) (radio_group) | **None** / Provider | `group_by` | enum | None -> `none`, Provider -> `provider` | `none` | replicated | Provider adds one group level on the same provider as PROVIDER: the treating provider rpt_charges.provider_id, also when Show Billing Provider For Hygienist prints the billing provider (proposal; the vendor's popular variant `Capitation utilization by provider`). Whether PRINT FORMAT = Excel greys GROUP BY here, as on Outstanding Claims, is not documented: the control stays enabled until confirmed on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| INCLUDE UCR: Include UCR is ticked | The Fee Schedule To Compare dropdown becomes available (it is greyed while Include UCR is unticked); it offers a list of fee schedules and the chosen one is shown on the report for comparison. | compare_fee_schedule_id (entity_single, lookup:fee_schedules) has enabled_when include_ucr == true and required_when include_ucr == true (shared rule of 04, inferred); while include_ucr is false the control is greyed and its value is replaced by disabled_value null. Office Default prints the fee of the line's code on the chosen schedule in force on the service date when include_ucr is ticked, and 0.00 while it is unticked (the 2008 default sample prints 0.00 on every row; reading inferred, FLT-23). No extra column is added; the chosen schedule is named in the criteria echo. |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `compare_fee_schedule_id` | required_when | include_ucr == true | - | inferred - The compare column needs a schedule. |
<!-- PARITY:insurance_reports.r02:END -->

| Legacy option | Effect on the result |
|---|---|
| REPORT FORMAT `Detail` (default) | Block `detail`: one row per procedure, three group levels, title `... - Detail` |
| REPORT FORMAT `Summary` | Block `summary`: one row per carrier x plan / group with counts and the money totals, no patient lines (INFERRED) |
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged (`role: output`); `csv` added. Whether Excel greys GROUP BY is family open question 1 (left enabled) |
| OFFICE/GROUP `Office` (default) + picker (working office) | Office of service `rpt_charges.office_id IN (...)`; office header block per office |
| OFFICE/GROUP `Office Group` + picker (ALL) | Every office of the groups; one header block and band per office |
| PROVIDER `ALL` (default) / a selection | No predicate / treating provider `rpt_charges.provider_id IN (...)`; applies to the treating provider also when the billing provider is printed (proposal) |
| DATE RANGE Start / End (today / today) | Fixed basis `transaction_date` of the procedure (inferred from `Tran. Date`); equals `service_date` until DATA-13 |
| FACILITY ID (blank) | Free text printed as `Facility ID : <value>` in the header; not a filter (`role: layout`, re-renders the snapshot); blank prints `Facility ID :` with no value |
| CARRIER `ALL` (default) / a selection | Carrier of the patient's prepaid coverage slot (`rpt_insurance_coverage.carrier_id` with `is_prepaid`); after DATA-33 the payer stamped on the charge when that plan is prepaid |
| INCLUDE UCR unticked (default) | `Office Default` prints 0.00 on every line (as the 2008 default sample); `compare_fee_schedule_id` greyed, value forced to `null` |
| INCLUDE UCR ticked | Enables FEE SCHEDULE TO COMPARE (required); `Office Default` prints the fee of the line's code on that schedule in force on the service date (NULL prints blank); no extra column (inferred, FLT-23) |
| FEE SCHEDULE TO COMPARE (greyed; captured `CP-40 ( 135 )`) | One fee schedule (`lookup:fee_schedules`, label `Name ( id )`); default `first_option` candidate, list content and default rule `unknown_legacy` (FLT-23); named in the criteria echo |
| OTHER OPTIONS `Print All Codes` unticked (default) | Only codes reported to the carrier: `coalesce(rpt_procedure_code_dim.bill_to_insurance, NOT is_z_code)`; z-codes (internal extra-service codes) dropped (documented) |
| OTHER OPTIONS `Print All Codes` ticked | Every code, z-codes included |
| OTHER OPTIONS `Include Fees Charged` ticked (default) | `Co - Pay` and `Sup. Fee.` print the managed-care schedule fees of each line; rows and the 12 columns unchanged (documented "shows the fees"; which cells it switches is inferred, open question 2) |
| OTHER OPTIONS `Include Fees Charged` unticked | `Co - Pay` and `Sup. Fee.` cells print blank, totals blank; rows unchanged (inferred) |
| OTHER OPTIONS `Print Office Address` unticked (default) / ticked | Header without / with the office block (address, `Ph # :`, `Tax ID :`); `role: layout` |
| OTHER OPTIONS `Show Billing Provider For Hygienist` unticked (default) | `Prdr` prints the treating provider |
| OTHER OPTIONS `Show Billing Provider For Hygienist` ticked | On a line whose treating provider has `provider_kind = 'hygienist'` (DATA-05), `Prdr` prints the office billing provider (`rpt_office_dim.billing_provider_id`); rows unchanged (INFERRED) |
| GROUP BY `None` (default) | Carrier -> plan / group -> date levels |
| GROUP BY `Provider` | Adds an outer provider level (inferred; vendor's popular variant "Capitation utilization by provider") with `Total for provider - <name> :`, on the treating provider (the provider PROVIDER filters), also when the billing provider is printed (proposal) |

Dependency rule `insurance_reports.r02.d01`: `compare_fee_schedule_id` has `enabled_when ["truthy", "include_ucr"]` and
`required_when ["truthy", "include_ucr"]`; while greyed its value is `null` and `Office Default` prints 0.00.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `page_break_by` | `enum` (shared 3.9), role `layout` | `none` | NEW value `carrier`: each carrier starts a page, so one PDF can be split and sent per carrier; `group` = break on the provider level when `group_by = provider` | `carrier` is NEW in the 04 vocabulary (8); XLSX `sheet_per_page_break` gives one sheet per carrier |
| `procedure_codes` | `entity_multi` (shared 3.6) | `all` | Restrict to codes a carrier asks about (for example the supplemental-fee codes) | - |
| `include_non_covered` | `boolean` NEW | `true` | `false` drops lines whose code is blank / blank on the managed-care schedule | Owner: this catalog |
| Optional columns `Office UCR`, `Fee Charged` | column chooser | hidden | `rpt_charges.office_fee` (UCR snapshot, PD-1) and `rpt_charges.charged_fee` | Not legacy columns; the default keeps the 12 sample columns |
| Summary columns `members_seen`, `procedure_count` | columns | shown in Summary | Encounter counts per plan / group and carrier | Comparable `[X8]` |
| `compare_to` | comparison period (filter card 12) | `none` | On `summary`: prior-month and prior-year columns of `Office Default` and `Sup. Fee.` | P4 (FLT-26), `supports_comparison` on the summary format only |
| Saved view "Last month, carrier <name>" | saved view | - | `date_preset = last_month`, `carrier_ids = [id]`, `facility_id` = the carrier's facility id, `print_office_address = true` | Keeps the Facility ID per carrier; schedulable on the 1st of the month (header cadence) |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_charges` (rows), `rpt_insurance_coverage` (prepaid slot, `carrier_id`, `carrier_name`, `ins_plan_id`, `group_number`, `sub_member_id`, `subscriber_dob`, `is_prepaid`), `rpt_procedure_code_dim` (`description`, `is_z_code`, `bill_to_insurance`), `rpt_fee_schedule_fees` (`patient_fee`, `insurance_fee`, `schedule_fee`, `pricing_model`), `rpt_patient_dim` (names), `rpt_provider_dim` (`short_id`, `provider_kind`), `rpt_office_dim` (`office_name`, `billing_provider_id`, `local_today`; header block address, phone and tax id are NEW columns `address_line1`, `address_line2`, `phone`, `tax_id`, owner 03, extending DATA-05 / RPT-INS-12: the card has only `city`, `state`, `zip`), NEW passthrough `rpt_fee_schedule_assignments` (owner 03, delivered in P2 with RPT-INS-14) |
| Population | live charges (`NOT is_void`, archive policy), `NOT is_contract_billing`, `transaction_date` in range, `office_id` in scope, patient holds a live prepaid dental slot (`is_prepaid`); a patient with two prepaid slots is listed under the lower tier; `print_all_codes` rule as above |
| Co - Pay / Sup. Fee. | `patient_fee` / `insurance_fee` of the managed-care schedule (`pricing_model = 'copay'`) in force on the service date; blank while `include_fees_charged` is unticked. Schedule = `rpt_charges.fee_schedule_id` when it is a copay schedule, else the schedule assigned to the slot's plan / carrier through `fee_schedule_assignments` precedence (`ins_plan_id > carrier_id > provider_id > specialty_id`, narrowed by office). NEW: set-based resolver `rpt_resolved_fee_schedule()` mirroring `pricing_service.resolve_procedure_fee`, owned by `03_data_foundation.md`; `fee_schedule_assignments` read through the NEW passthrough `rpt_fee_schedule_assignments` (owner 03, RPT-INS-14, P2) |
| Office Default | with `include_ucr`: `rpt_fee_schedule_fees.schedule_fee` of `compare_fee_schedule_id` on (code, service date), NULL prints blank; without: 0.00 (inferred from the sample) |
| Office UCR, Fee Charged (optional, hidden) | `rpt_charges.office_fee` (UCR snapshot, `gross_production` basis, PD-1); `rpt_charges.charged_fee` |
| Date basis | fixed `transaction_date` (inferred); FLT-23 confirms |
| Office attribution | office of service (PD-6) |
| Provider attribution | treating provider `rpt_charges.provider_id`; printed provider per `show_billing_provider_for_hygienist` |
| Coverage rating | **REPAIR(32)** (coverage matrix #31): capitation plans are identifiable only after the legacy prepaid code is decoded - `insurance_plans.is_prepaid` is true on 9 of 31,337 migrated plans because `ISPREPAID` was pushed through a boolean parse (`legacy_prepaid_code` keeps the raw value [V]). Until DATA-32 the report is near-empty on migrated plans. Interim rule proposed for 03: a plan is prepaid when `is_prepaid` or its resolved fee schedule has `pricing_model = 'copay'` (open question 7) |
| Further limits | `Co - Pay` / `Sup. Fee.` and FEE SCHEDULE TO COMPARE need `rpt_fee_schedule_fees` (DATA-51); payer on the charge SCHEMA(33): until then coverage is today's slot, so a member who left the plan disappears from past months and a new member's earlier visits appear; `print_all_codes` uses `is_z_code` until `bill_to_insurance` is filled in setup (DATA-04); hygienist rule needs `provider_kind` (DATA-05) |
| Migrated history | transaction date equals service date (DATA-13); migrated charges have no `fee_schedule_id` (resolver path only); skipped migrated charges (DATA-57) are missing from past months |

### Output

Report formats: `detail` (default), `summary`. Office header block (`placement: report_start` per office band, shape
`key_value`): `office_name`, `address` (NEW `address_line1`, `address_line2`, with `city`, `state`, `zip`), `phone`
(`Ph # :`, NEW), `tax_id` (`Tax ID :`, NEW) when `print_office_address`; `facility_id` (`Facility ID :`) always. Class
`aggregate` (practice data).

`detail` (shape `table`, `row_id_column = charge_id`, `max_levels 4`). Levels: [provider when `group_by = provider`:
`Provider : {provider_name}`, subtotal `Total for provider - {provider_name} :`] -> carrier `Carrier : {carrier_name}`,
subtotal `Total for carrier - {carrier_name} :` -> plan / group `Plan ID : {plan_label}   Group No : {group_number}`
(`plan_label` = the plan's legacy or display id when one exists, else `ins_plan_id`; proposal, open question 9),
subtotal `Total for {group_number} :` -> date `Tran Date : {transaction_date}`, no subtotal. Grand total `Grand Total :`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id`, `carrier_id`, `ins_plan_id`, `group_number`, `transaction_date` | - | hidden | aggregate (`transaction_date`: phi_identified) | group keys |
| `provider_group_id` | - | id, hidden | provider_comp | group key when `group_by = provider` (treating provider `rpt_charges.provider_id`) |
| `charge_id`, `patient_id` | - | id, hidden | phi_identified | row id, drill keys |
| `patient_name` | Patient Name | text, entity patient | phi_identified | key column |
| `sub_id` | Sub ID | text | phi_sensitive | none |
| `sub_dob` | Sub DOB | date | phi_sensitive | none |
| `tran_date` | Tran. Date | date | phi_identified | none |
| `code` | Code | text | phi_identified | none |
| `description` | Description | text | phi_identified | none |
| `tooth` | Th | text | phi_identified | none (tooth or quadrant) |
| `surface` | Surf | text | phi_identified | none |
| `provider_short_id` | Prdr | text | aggregate | none |
| `office_default` | Office Default | money (compare fee with `include_ucr`, else 0.00) | financial_patient | sum |
| `co_pay` | Co - Pay | money (blank without `include_fees_charged`) | financial_patient | sum |
| `sup_fee` | Sup. Fee. | money (blank without `include_fees_charged`) | financial_patient | sum |
| `office_ucr` | Office UCR | money, `default_visible: false` | financial_patient | sum (reconciliation column) |
| `fee_charged` | Fee Charged | money, `default_visible: false` | financial_patient | sum |
| `is_non_covered` | - | boolean, hidden | aggregate | count, printed `Non-covered lines : n` |

`summary` (shape `table`, row = office x [provider] x carrier x plan / group, title `Capitation Utilization - Summary`):
`carrier_name` "Carrier" (aggregate, key), `ins_plan_id` "Plan ID", `group_number` "Group No" (aggregate),
`members_seen` "Members Seen" (integer, `count_distinct` patient; sum is not additive, carrier and grand rows recount),
`procedure_count` "Procedures" (integer, count), `office_default`, `co_pay`, `sup_fee`, hidden `office_ucr`,
`fee_charged` (money, `financial_practice`, sum); carrier subtotal and grand total as in detail.

Sort: carriers by name, plans by `group_number`, dates ascending, then `patient_sort_name`, `code`, `charge_id`. Page
break: `page_break_by` (enhancement). Summary cards: `Office Default` total, `Co - Pay` total, `Sup. Fee.` total,
`Members Seen`. `reconciles_with`: grand `office_ucr` = `capitation_value_of_services` (P3 metric; test enabled when
the metric ships) for a run with `print_all_codes = true` restricted to primary-tier prepaid slots (the metric's
population); the default run differs by the dropped z-codes and the secondary prepaid slots, printed as reconciling lines
of the test. `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart (Summary only) | Stacked bars per carrier: `Co - Pay` + `Sup. Fee.` against `Office UCR` (value of services against what was earned per visit) |
| `Patient Name` | patient shell, `phi_identified` |
| Detail row | `kind record`, entity charge, `route_key patient_ledger` (charge highlighted), `right_code transactions_patient_ledger_screen_full_control` |
| Plan / group subtotal or summary row | `kind rows`: detail format filtered to carrier and plan |
| Carrier subtotal | `kind report` `insurance.capitation_payment` with `office_scope`, `carrier_ids` = the carrier, `date_from` / `date_to` copied (what the carrier paid for the same period) |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Open ledger | row | drill (record) | `transactions_patient_ledger_screen_full_control` | P2 |
| Export per carrier | run | whole-run export with `page_break_by = carrier` and `xlsx.sheet_per_page_break` (selection export through `export_selection` from P3, ENG-49) | `reports_export_data_files` | P2 |

Not a worklist.

### Export and print

| Output | Rule |
|---|---|
| PDF | Legacy-like form: office header block (address, `Ph # :`, `Tax ID :`, `Facility ID :`) at the top of each office, banded table, landscape (12 legacy columns; up to 14 with the optional columns), letter; `criteria_echo = footer` (`From`, `Thru`, `Providers`, `Carriers`, `Print All Codes`, compare schedule name); one carrier per page set with `page_break_by = carrier` |
| XLSX | Sheet `detail` or `summary`, flat rows with `Office`, `Office Name`, `Carrier`, `Plan ID`, `Group No` as columns; header-block values on the `criteria` sheet (`Facility ID`, address); no merged cells |
| CSV | Main block of the chosen format |
| Background | `interactive`; escalates to `background` when `all_offices` and the range exceeds 92 days (`escalate_when`, server only) |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Summary layout (columns, levels, counts) | Carrier x plan / group rows with members seen, procedures and money totals |
| 2 | What does `Office Default` print (compare fee of `Include UCR`, office UCR, office default schedule), and which cells does `Include Fees Charged` switch (Co - Pay / Sup. Fee., a charged-fee column, or `Office Default`)? (FLT-23) | Compare fee with Include UCR, else 0.00 (as the default sample); Include Fees Charged switches Co - Pay / Sup. Fee.; 12 columns by default |
| 3 | Where does the provider level of GROUP BY Provider sit (outer, or under carrier)? | Outermost inside the office band |
| 4 | `Show Billing Provider For Hygienist`: office billing provider or the supervising dentist? Do PROVIDER and the GROUP BY Provider level then follow the printed provider? | Office billing provider; filter and group level stay on the treating provider |
| 5 | FEE SCHEDULE TO COMPARE: list content (copay schedules only?), order, default rule | Every schedule, `first_option` candidate (FLT-23) |
| 6 | Date basis `Tran. Date` = transaction or service date | Transaction date (equal until DATA-13) |
| 7 | Interim capitation-plan rule until the prepaid code is decoded (copay schedule = prepaid?) | Proposed to 03; until accepted only `is_prepaid` plans |
| 8 | Are non-covered (blank / blank) lines printed? Are members with no visits listed? | Printed with blank cells; members without visits not listed |
| 9 | Which identifier does the `Plan ID :` band print (carrier plan number, legacy plan id, internal key)? `ins_plan_id` is unreliable on migrated rows (FLT-23) | Legacy or display id of the plan when one exists, else `ins_plan_id` (proposal) |

## Claims Created Not Sent - `insurance.claims_created_not_sent`

Insurance Reports, screenshot 3.PNG - P2 - S - `reports_insurance_reports_screen_view_only` (family `insurance`) - interactive - INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Billing staff | Daily, before the batch claim submission | Find claims that were created (saved) but never transmitted or printed - legacy status `Q`, ledger text `Created, Not Sent` - and send them `[I]`, vocabulary `[D]` `[R15]` `[R16]` |
| Office manager | Weekly | Make sure no claim waits more than a day or two; see who created the waiting claims |

No vendor article names this report; every layout statement below is a reconstruction from the Claims Listing family
`[R5]`, Open Dental `Claims Not Sent` `[X1]`, Dentrix Enterprise `Insurance Claims Not Sent` `[X9]` and Dentrix
`Insurance Claims to Process` `[X14]`, to be confirmed on the live tool (RPT-INS-09, FLT-23).

### Legacy output

Confidence: **INFERRED** for every element.

| Element | Content (proposal) | Basis |
|---|---|---|
| Printed title | `Claims Created Not Sent` (menu name; not seen) | header page furniture |
| Carrier band | `Carrier : <name>   Ph : <phone>` | Claims Listing family `[R5]` |
| Columns, in order | `Chart #` - `Patient / Subscriber` - `Sub ID` - `Claim #` - `Created On` - `DOS` - `Ty` - `Claim Amt` - `Est. Ins` - `Status` | research reconstruction `[X1]` `[X9]` |
| Subtotal | `Total for <carrier> [ n ] :` with claim count, sums of `Claim Amt` and `Est. Ins` | `[R5]` |
| GROUP BY Provider | Outer provider level `Provider : <name>` with subtotal | `[C]` `[I]` |
| Grand total | `Grand Total [ n ] :` | proposal |
| Footer echo | `From`, `Thru`, `Pat From`, `Thru`, `Providers`, `Carriers`, `Claim Amt Over/Equal`, `Claim Category`, then title, printed stamp, page | family furniture |

Sign conventions: money positive. Quirk to confirm: a claim saved with `E-Claim` reads `Recreated` in the legacy ledger
but still waits in Batch Claims Processing; whether the legacy report lists it is `[unverified]` `[R16]`. We list every
unsent claim, whatever button created it.

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r03:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| CLAIM TYPE | (no label) (radio_group) | **Both** / Dental / Medical | `claim_type` | enum | Both -> `both`, Dental -> `dental`, Medical -> `medical` | `both` | replicated | Dental versus medical category of the claim (rpt_claim_facts.category). That it filters dental versus medical claims is inferred, as on Claims List; both = no predicate. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office or Office Group, both enabled on this screen (nothing greyed). Office: one or more offices the caller may read, default the working office; Office Group: groups from Setup > Office Groups, default ALL. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group); both enabled on this screen. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; ALL = no restriction. provider_role = claim provider: rpt_claim_facts.treating_provider_id, falling back to billing_provider_id when it is empty (same rule as worklists.outstanding_claims, 06 section 6.7). Which provider the legacy filter uses is not documented - confirm on the live tool. |
| CREATED ON DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Fixed date_basis = created_date: the date the claim was created (our reading of the section title, 04 section 7.2). Population status_class = unsent (legacy status Q, Created Not Sent). Migrated claims carry no created date, so the report is APP. Whether a claim saved with E-Claim (ledger text Recreated) is included is unverified. Default today; enhanced with presets and relative tokens. |
| CREATED ON DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | End of the claim created_date range, inclusive; same basis and limits as Start Date. Default today; enhanced with presets and relative tokens. |
| NAME RANGE | Start Name (text_input) | shown: AAAAA | `patient_name_from` | text_range | - | `AAAAA` | replicated | Start of an alphabetical range on the patient sort name. The legacy title does not say whose name; the vendor sample footer prints Pat From / Thru, so it is the patient name range (same parameter as PATIENT NAME RANGE). |
| NAME RANGE | SEARCH (button) | - | `patient_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| NAME RANGE | End Name (text_input) | shown: ZZZZZ | `patient_name_to` | text_range | - | `ZZZZZ` | replicated | End of the alphabetical range on the patient sort name (inclusive, prefix rule). |
| NAME RANGE | SEARCH (button) | - | `patient_name.search` | action | - | - | superseded | Superseded by the lookup built into the bound control: typing searches (typeahead) and the search icon opens the full search dialog; no separate button. |
| CLAIM AMOUNT OVER OR EQUAL TO | (no label) (number_input) | shown: 0.00 | `claim_amount_min` | decimal | - | `0.00` | replicated | Claim amount >= value, compared with billed_amount (as on Claims List, inferred). |
| CARRIER | Carriers (picker) | shown: ALL | `carrier_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| GROUP BY | (no label) (radio_group) | **None** / Provider | `group_by` | enum | None -> `none`, Provider -> `provider` | `none` | replicated | Provider adds one group level on the claim provider of PROVIDER (inferred). Whether PRINT FORMAT = Excel greys GROUP BY here, as on Outstanding Claims, is not documented: the control stays enabled until confirmed on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:insurance_reports.r03:END -->

| Legacy option | Effect on the result |
|---|---|
| CLAIM TYPE `Both` (default) / `Dental` / `Medical` | No predicate / `category = 'dental'` / `'medical'` (inferred, as Claims List) |
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged; `csv` added. Excel greying GROUP BY: family open question 1 (left enabled) |
| OFFICE/GROUP `Office` (default) + picker / `Office Group` + picker | Claim office `rpt_claim_facts.office_id` in the resolved set; band per office |
| PROVIDER `ALL` (default) / a selection | No predicate / `coalesce(treating_provider_id, billing_provider_id) IN (...)` (inferred, family open question 2) |
| CREATED ON DATE RANGE Start / End (today / today) | Fixed basis `created_date` (claim created), `created_at_reliable` rows only; migrated claims never match (APP) |
| NAME RANGE Start `AAAAA` / End `ZZZZZ`; two `SEARCH` buttons | Patient sort-name range with the prefix rule, open bounds; buttons superseded by the lookup icons |
| CLAIM AMOUNT OVER OR EQUAL TO (0.00) | `billed_amount >= value` (inferred, as Claims List) |
| CARRIER `ALL` (default) / a selection | No predicate / claim carrier `IN (...)` |
| GROUP BY `None` (default) | Carrier bands only |
| GROUP BY `Provider` | Outer provider level on the claim provider, subtotal per provider (inferred) |
| Population rule (no control) | `status_class = 'unsent'` (stored `draft`, `ready`, `hold`, blank, other unknown values without a sent date, data card 3.2) and `NOT is_preauth` |

Dependency rules: none captured.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `claim_kind` | `enum` (shared 3.5) | `claims` | `pre_authorization` lists unsent pre-authorisations instead | The legacy screen has no CLAIM/PRE-AUTH section; the default keeps the legacy population |
| `date_basis` | `enum` (shared 3.3) | `created_date` | `service_date` (`service_from`): finds the old unsent claims that no created date reaches, migrated drafts included (flagged) | Migrated drafts may be closed claims stored as `draft` (REPAIR(32)) |
| `coverage_orders` | `enum_multi` (shared 2.5) | all ticked | Only primary or only secondary unsent claims (secondary claims wait for the primary EOB) | - |
| `sort_by` | `enum` (shared 3.9) | `patient_name` | `patient_name`, `created_oldest_first` (Dentrix `[X14]` order), `claim_amount_desc` | Legacy order unknown |
| Column `days_unsent` | column | hidden (`default_visible: false`) | `local_today - created_date` | Drives the age chart and the `Oldest (days)` card whether shown or not |
| Saved view "All unsent claims" | saved view | - | `date_preset = custom`, `date_from = 2000-01-01`, `date_to = today` | Daily pre-batch list; with `created_date` it covers every app-era claim |
| Saved view "Unsent over 2 days" | saved view | - | `date_preset = custom`, `date_from = 2000-01-01`, `date_to = today-2d` | Escalation list for the manager |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_claim_facts`, `rpt_patient_dim`, `rpt_user_dim` (`Created By`), `rpt_provider_dim` (provider band label) |
| Columns used | as Claims List plus `created_by_user_id`, `service_from`, `tier`; no remittance columns (an unsent claim has none) |
| Date basis | fixed `created_date`; enhancement `service_date` |
| Office attribution | claim office |
| Provider attribution | claim provider: `treating_provider_id`, else `billing_provider_id` (06 section 6.7) |
| Family amounts | `Claim Amt` totals add a claim family once (`billed_amount_once`, as Claims List); `Est. Ins` per tier, additive |
| Coverage rating | **APP** (coverage matrix #32): the created date of migrated claims is the load time, so they are excluded from the default basis; mis-mapped statuses REPAIR(32) |
| Era notes | migrated claims whose stored code became `draft` and that carry no sent date classify as `unsent` (data card 2.20); they appear only through `date_basis = service_date`, flagged `era = migrated`, with the notice `claim_status_unconfirmed` (NEW code, owner 03) until section 6 #15 of 03 confirms the codes |
| Not reproducible | which migrated claims were really waiting to be sent on a past date (no status history before DATA-25) |

### Output

Report format: one (`standard`). Block `claims` (table, `row_id_column = claim_id`). Levels: office band
(`multi_office`) -> [provider `Provider : {provider_name}`, subtotal `Total for provider - {provider_name} [ {row_count} ] :`
when `group_by = provider`] -> carrier `Carrier : {carrier_name}   Ph : {carrier_phone}`, subtotal
`Total for {carrier_name} [ {row_count} ] :`; grand total `Grand Total [ {row_count} ] :`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id`, `carrier_id` | - | id, hidden | aggregate | group keys |
| `provider_group_id` | - | id, hidden | provider_comp | group key when `group_by = provider` (money in the block, rule 3) |
| `claim_id`, `patient_id` | - | id, hidden | phi_identified | row id, drill keys |
| `chart_no` | Chart # | text | phi_identified | none |
| `patient_subscriber` | Patient / Subscriber | text | phi_identified | key column |
| `sub_id` | Sub ID | text | phi_sensitive | none |
| `claim_number` | Claim # | text, drill `claim_record` | phi_identified | none |
| `created_date` | Created On | date | phi_identified | none |
| `service_from` | DOS | date | phi_identified | none |
| `tier_letter` | Ty | text | aggregate | none |
| `claim_amount` | Claim Amt | money | financial_patient | sum of `billed_amount_once` |
| `est_ins` | Est. Ins | money | financial_patient | sum |
| `status` | Status | enum | aggregate | none (`Created, Not Sent`; stored value in the tooltip: `draft`, `ready`, `hold`) |
| `days_unsent` | Days Unsent | integer, `default_visible: false` | phi_identified | `max` per band |
| `created_by` | Created By | text, `default_visible: false` | aggregate | none |
| `era_flag` | Migrated | boolean, `visible_when ["eq","date_basis","service_date"]` | aggregate | count |

Sort: `sort_by` inside the carrier band; tie-breaker `claim_id`. Page break: office band; `page_break_by = group`
offered when `group_by = provider` (shared 3.9). Summary cards: `Unsent claims` (count), `Claim Amt`, `Oldest (days)`.
`reconciles_with`: count of the saved view "All unsent claims" (created-date basis, `created_at_reliable` rows: every
app-era unsent claim) + count of `era = 'migrated'` unsent claims (listed only under `date_basis = service_date`) =
`claims_unsent_count`, which counts every `status_class = 'unsent'` claim, migrated drafts included. `empty_when`:
`no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bars of claim count by age band of `days_unsent`: `0-1`, `2-7`, `8-30`, `over 30` |
| Age bar | `kind rows`: the run filtered to that band |
| `Claim #` | `claim_record` (`route_key claim_detail`, `right_code transactions_insurance_claims_details_view_only`) |
| `Patient / Subscriber` | patient shell, `phi_identified` |
| Carrier subtotal | `kind rows` |
| Footer link "Next stage" | `kind report` `insurance.claims_list` with the same `office_scope` and dates (funnel link, header) |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Open claim (send, print or edit there) | row | drill `claim_record` | `transactions_insurance_claims_details_view_only` | P2 |
| Open ledger | row | `navigate` `patient_ledger` | `transactions_patient_ledger_screen_full_control` | P2 |
| Send in batch | bulk | `navigate` to Batch Claims Processing (`route_key batch_claims_processing`) with the snapshot's claim ids | claim feature right | P3 (ENG-49; the utility is a labelled placeholder in `src/components/utilities/utilityCatalog.ts` today) |
| Export selection | bulk | `export_selection` (P2: whole-run export through `output_format`) | `reports_export_data_files` | P3 (ENG-49, SEC-36) |

Doubles as a worklist: the live, actionable version is stage `unsent` of `worklists.unbilled_procedures` (06); the
report stays the printable daily list.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape, carrier (and provider) bands, footer echo as Legacy output |
| XLSX | Sheet `claims`: flat typed columns plus `Office`, `Office Name`, `Carrier`, `Carrier Phone`, `Provider` (when grouped), `Stored Status`; criteria sheet |
| CSV | Main block |
| Background | Not needed (small population: unsent claims only) |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Column list, order and printed title (no vendor source) | Proposal of Legacy output |
| 2 | Is a claim saved with `E-Claim` (ledger `Recreated`) listed? | Every unsent claim is listed |
| 3 | Does CREATED ON DATE RANGE read the creation date or the last recreation date? | Creation date |
| 4 | Are pre-authorisations that were never sent listed? | No (enhancement `claim_kind`) |
| 5 | Provider of the PROVIDER filter and of GROUP BY Provider | Treating, else billing |
| 6 | Does Excel grey GROUP BY? | Left enabled (family open question 1) |
| 7 | Do CLAIM TYPE, NAME RANGE, CLAIM AMOUNT (on the billed amount) and CARRIER behave as on Claims List (supplement unresolved item)? | Yes (FLT-23) |

## Procedures on Hold - `insurance.procedures_on_hold`

Insurance Reports, screenshot 4.PNG - P2 - S - `reports_insurance_reports_screen_view_only` (family `insurance`) - interactive - PARTIALLY DOCUMENTED; layout INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front office, billing staff | Daily, run for today's date (vendor cadence `[D]` `[R12]` `[R14]`) | Review the procedures whose billing the office put on hold (`Hold Claim` ticked, red `H` in the Bill column), release the hold and generate the claim |
| Office manager | Weekly, over a wider range | Catch holds that were forgotten: a held procedure never reaches a claim until someone unticks it |

### Legacy output

Confidence: purpose and workflow **DOCUMENTED** (`[D]` `[R11]` `[R12]` `[R14]`); layout **INFERRED**.

| Element | Content | Evidence |
|---|---|---|
| Printed title | `Procedures on Hold` (menu name; not seen) | header page furniture |
| Columns (reconstructed), in order | `Pat ID` - `Patient` - `Date` - `Code` - `Description` - `Th` - `Surf` - `Provider` - `Fee` - `Est. Ins` - `Carrier` - `Hold Note` (research "patient (id and name)" printed as two columns, proposal) | research reconstruction |
| Grouping / totals | Not documented; proposal: office band, flat list, `Total [ n ] :` with sums of `Fee` and `Est. Ins` | proposal |
| Footer echo | `From`, `Thru`, `Offices`, title, printed stamp, page | family furniture |

Documented behaviour we keep: the hold is a tick on the procedure (Ledger or Transaction Entry) that blocks claim
generation until unticked; a note explaining the hold can be added; held procedures also appear on Claims Not Created
(reconciliation rule 4 of the research, header RPT-INS-03). Money prints positive.

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r04:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office or Office Group, both enabled on this screen (nothing greyed). Office: one or more offices the caller may read, default the working office; Office Group: groups from Setup > Office Groups, default ALL. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group); both enabled on this screen. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Fixed date_basis = service_date of the held procedure (inferred, 04 section 7.2 row 15; vendor sources do not say date of service or transaction date - FLT-23). Population: rpt_charges with hold_claim = true and no claim. Default today (vendor cadence: daily, today's date); enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | End of the service_date range, inclusive (basis inferred). Default today; enhanced with presets and relative tokens. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:insurance_reports.r04:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged; `csv` added |
| OFFICE/GROUP `Office` (default) + picker (working office) | Office of service `rpt_charges.office_id IN (...)` |
| OFFICE/GROUP `Office Group` + picker (ALL) | Every office of the groups; band per office |
| DATE RANGE Start / End (today / today) | Fixed basis `service_date` of the held procedure (inferred; DOS versus transaction date unverified, FLT-23) |
| Population rule (no control) | Live charges with `hold_claim = true` and no claim (`billing_state = 'hold'`, data card 2.9): the procedures put on hold and not yet billed |

Dependency rules: none (three sections, nothing greyed).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `provider_ids` | `entity_multi` (shared 3.2) | `all` | Treating provider `rpt_charges.provider_id` | - |
| `carrier_ids` | `entity_multi` (shared 3.5) | `all` | Carrier of the line (rule in Data) | Lines without insurance match only under `all` |
| `group_by` | `enum` (shared 3.9) | `none` | `provider`, `carrier`: one level with subtotals | Values exist in the shared vocabulary |
| `sort_by` | `enum` (shared 3.9) | `patient_name` | `patient_name` (then date), `service_date_oldest_first`, `fee_desc` | - |
| Column `days_since_service` | column | hidden (`default_visible: false`) | `local_today - service_date`; the age of the hold itself is unknown (no hold stamp, Data) | - |
| Saved view "All open holds" | saved view | - | `date_preset = custom`, `date_from = 2000-01-01`, `date_to = today` | Weekly forgotten-hold sweep; schedulable end of day (header cadence) |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_charges` (rows), `rpt_patient_dim` (`chart_no`, names), `rpt_procedure_code_dim` (`description`), `rpt_provider_dim` (`short_id`), `rpt_insurance_coverage` (carrier of the primary dental slot) |
| Columns used | `charge_id`, `patient_id`, `office_id`, `provider_id`, `service_date`, `procedure_code`, `tooth`, `surface`, `quadrant`, `charged_fee`, `est_insurance`, `hold_claim`, `claim_id`, `billing_state`, `bill_tier`, `primary_carrier_id` (after DATA-33), `era` |
| Population | `NOT is_void` (archive policy), `billing_state = 'hold'`, `service_date` in range, `office_id` in scope. A held charge that already carries a claim (possible on migrated rows, where `ISHOLDCLAIM` and the claim link were both loaded [V] `s28`) is `on_claim` and not listed |
| Carrier | `primary_carrier_id` on the charge after DATA-33; until then the carrier of the patient's live primary dental slot today (`rpt_insurance_coverage`, `category = 'dental'`, `tier = 'primary'`); blank when the patient has no coverage |
| Hold note | Not stored: `patient_procedures` has `hold_claim` (boolean) only [V `app/db/models/clinical.py`]. NEW `patient_procedures.hold_reason`, `hold_set_at`, `hold_set_by`, written by `patient_procedure_service` when the flag changes, exposed on `rpt_charges` (owner `03_data_foundation.md`, item RPT-INS-18). Until then the `Hold Note` column prints the procedure note (`patient_procedures.notes`, NEW column `procedure_note` on `rpt_charges`, class `clinical`) |
| Date basis | fixed `service_date` (inferred) |
| Office attribution | office of service (PD-6) |
| Provider attribution | treating provider |
| Coverage rating | **READY** (coverage matrix #33): the hold flag was migrated (`ISHOLDCLAIM` [V] `s28`) |
| Migrated history | who held a procedure, when and why is unknowable for migrated rows (and for app rows until RPT-INS-18); the report shows the current hold state only, never the holds of a past date |

### Output

Report format: one (`standard`). Block `held_procedures` (table, `row_id_column = charge_id`). Levels: office band
(`multi_office`) -> [provider or carrier level when `group_by` is set, subtotal `Total for {label} [ {row_count} ] :`];
grand total `Total [ {row_count} ] :`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | - | id, hidden | aggregate | group key |
| `charge_id`, `patient_id` | - | id, hidden | phi_identified | row id, drill keys |
| `group_key` | - | hidden | provider_comp (provider) / aggregate (carrier) | group key when `group_by` is set |
| `chart_no` | Pat ID | text | phi_identified | none |
| `patient_name` | Patient | text, entity patient | phi_identified | key column |
| `service_date` | Date | date | phi_identified | none |
| `code` | Code | text | phi_identified | none |
| `description` | Description | text | phi_identified | none |
| `tooth` | Th | text | phi_identified | none (tooth or quadrant) |
| `surface` | Surf | text | phi_identified | none |
| `provider_short_id` | Provider | text | aggregate | none |
| `fee` | Fee | money | financial_patient | sum (`charged_fee`) |
| `est_ins` | Est. Ins | money | financial_patient | sum (`est_insurance`) |
| `carrier_name` | Carrier | text | aggregate | none |
| `hold_note` | Hold Note | text | phi_identified (`hold_reason`); `clinical` while it falls back to the procedure note | none |
| `days_since_service` | Days | integer, `default_visible: false` | phi_identified | `max` per band |

Sort: `sort_by`; tie-breaker `charge_id`. Page break: office band; `page_break_by = group` when grouped. Summary cards:
`Held procedures` (count), `Fee on hold`, `Est. Ins on hold`. `reconciles_with`: grand `fee` of the `is_production`
lines = `procedures_on_hold_amount` (metrics card 5.3, service basis); held non-production lines are the reconciling
difference, printed in the test. `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | none - a list (the age split is in the `Days` column and the summary cards) |
| Row | `kind record`, entity charge, `route_key patient_ledger` with the charge highlighted, `right_code transactions_patient_ledger_screen_full_control` (header: the procedure in the ledger) |
| `Patient` | patient shell, `phi_identified` |
| Group subtotal | `kind rows` |
| Footer link "Next stage" | `kind report` `insurance.claims_not_created` with `office_scope` copied, `date_basis = service_date`, `report_date = date_to` (funnel link). Claims Not Created is single-day in its legacy form, so the link opens on `date_to` only; with the enhancement `unclaimed_service_range` it carries the whole range |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Release hold / create claim | row | drill to the ledger line, where the Edit Transaction dialog holds the `Hold Claim` tick and the claim flow (the report itself never writes) | ledger feature right | P2 |
| Release holds | bulk | `custom:release_hold` through `worklists.unbilled_procedures` (stage `hold`), PATCH `hold_claim = false` per charge via `patient_procedure_service`, idempotent per `(run_id, action_key, charge_id)` | `transactions_transaction_entry_screen_full_control` | P3 (ENG-49, DASH-28) |
| Export selection | bulk | `export_selection` (P2: whole-run export through `output_format`) | `reports_export_data_files` | P3 (ENG-49, SEC-36) |

Doubles as a worklist: yes; the live version is stage `hold` of `worklists.unbilled_procedures` (06), which leaves the
list when the hold is released and the claim exists.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (note column), letter; office band; footer echo `From`, `Thru`, `Offices` |
| XLSX | Sheet `held_procedures`, flat typed columns plus `Office`, `Office Name`, `Provider Name`; criteria sheet |
| CSV | Main block |
| Background | Not needed |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Date basis: date of service or transaction date | Service date |
| 2 | Column list, grouping and totals (layout not documented) | Proposal above |
| 3 | Does the legacy report print the hold note? | Yes, `Hold Note` column (procedure note until RPT-INS-18) |
| 4 | Are held procedures of patients without insurance listed? Are $0.00 lines listed? | Both listed |
| 5 | Product: should releasing a hold from the report be allowed in P2 (write action) or stay in the ledger | Ledger only in P2; bulk release in P3 |
| 6 | Does the legacy report list held procedures that already have a claim (migrated `ISHOLDCLAIM` rows with a claim link)? | No (`billing_state = 'on_claim'` wins) |

## DPS Eligibility Report - `insurance.dps_eligibility_report`

Insurance Reports, screenshot 5.PNG - P2 - M - any of `reports_insurance_reports_screen_view_only` (family `insurance`), `appointments_dps_ins_verification_reports` (override, security card 2.3) - interactive - INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Front desk, insurance coordinator | Daily, one to three working days ahead of the schedule | See the appointments that need an insurance verification, the ones already sent to the verification service and the answers that came back, so every insured patient is verified before the visit `[I]`; feature `[D]` `[R26]` `[R27]` |
| Front desk | Daily, for newly booked appointments | With `Appointment Created Date`: the appointments booked today (any visit date), which need a first verification request |
| Office manager | Weekly | Audit of requests left `On Hold` (the service does not work them) and of insured appointments never verified |

DPS = Denticon Practice Services, the vendor's outsourced verification service: a `DPS Ins. Verification` request is made per
appointment on the `Subscriber / Insurance Verification` form (appointment date and time, patient, member id, DOB, phone,
e-mail, provider; per primary and secondary coverage the subscriber, id, DOB, `Patient Is Subscriber`, carrier name and
address, `Verify Type`, employer, group number; an `On Hold` tick; `Submit`), answered in 24-48 hours `[D]` `[S]` `[R26]`.
DentC has no outsourced service: the DentC request is an `eligibility_verifications` row with `method = 'service'` and
`status = 'requested'` written by the request action of RPT-INS-41; verifications done by staff are `method = 'manual'`.

### Legacy output

Confidence: **INFERRED** for every element - the report itself is described nowhere (research section 4, DPS Eligibility Report).

| Element | Content (proposal) | Basis |
|---|---|---|
| Printed title | `DPS Eligibility Report` (menu name; not seen) | header page furniture |
| Office band | `Office : <name>` per office | family furniture |
| Grain | One row per appointment and coverage slot (primary, secondary); per-coverage grain `[unverified]` | research grain; the request form carries primary and secondary |
| Columns, in order | `Appt Date` - `Time` - `Created On` - `Provider` - `Patient` - `Chart #` - `DOB` - `Phone` - `Ty` - `Carrier` - `Subscriber` - `Sub DOB` - `Sub ID` - `Group #` - `Employer` - `Verify Type` - `On Hold` - `Status` | research reconstruction (verification form `[R26]`) |
| Grouping | Appointment date band `Appointment Date : <date>` with a count | proposal |
| Totals | `Total Appointments [ n ]` per date and for the report | proposal |
| Footer echo | `Date Range Type`, `Appt From`, `Thru`, `Created From`, `Thru`, `Providers`, `On Hold`, `Include patients with no insurance`, then title, `Printed : <date time>`, `Page : n of m` | family furniture; labels proposed |

No money is printed. Quirk kept from the data, not from the legacy tool: one eligibility stamp per subscriber marks every
dependant (data card 2.21), so two children of one subscriber print the same `Status` and `Last Verified`.

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r05:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| DPS ELIGIBILITY | On Hold (checkbox) | **unchecked** | `eligibility_on_hold` | boolean | - | `false` | replicated | DPS = Denticon Practice Services. Mapped (inferred) as: ticked = only appointments whose latest verification request carries the On Hold flag of the Subscriber / Insurance Verification form; unticked = no restriction on the flag. The flag is eligibility_verifications.is_on_hold (DATA-34, SCHEMA(34)), written in P2 by the request form of RPT-INS-41; until a row exists a ticked box returns no rows and prints the notice needs_eligibility_history. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office or Office Group, both enabled on this screen (nothing greyed). Office: one or more offices the caller may read, default the working office; Office Group: groups from Setup > Office Groups, default ALL. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group); both enabled on this screen. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; ALL = no restriction. provider_role = appointment: rpt_appointment_facts.provider_id. Dialog content never captured - confirm list source and inactive rows on the live tool. |
| DATE RANGE TYPE | (no label) (radio_group) | **Appointment Date** / Appointment Created Date / Both | `date_range_type` | enum | Appointment Date -> `appointment_date`, Appointment Created Date -> `appointment_created_date`, Both -> `both` | `appointment_date` | replicated | Chooses which of the two date ranges applies. Both = the two ranges combined with AND (inferred; OR is the alternative, FLT-23). |
| APPOINTMENT DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Enabled when: date_range_type != appointment_created_date (inferred). Primary date range. Basis appointment_date unless the section carries a basis radio (Appointment Detail by User). Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| APPOINTMENT DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Enabled when: date_range_type != appointment_created_date (inferred). Primary date range, inclusive end. Basis appointment_date unless the section carries a basis radio. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| APPOINTMENT CREATED DATE RANGE | Start Date (date_input) | shown: 11/21/2026 - greyed out | `appointment_created_date_from` | date_range | - | `today` | replicated_enhanced | Enabled when: date_range_type != appointment_date (inferred). Secondary date range on the appointment creation date. Greyed while DATE RANGE TYPE = Appointment Date. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| APPOINTMENT CREATED DATE RANGE | End Date (date_input) | shown: 11/21/2026 - greyed out | `appointment_created_date_to` | date_range | - | `today` | replicated_enhanced | Enabled when: date_range_type != appointment_date (inferred). Secondary date range, inclusive end. Greyed while DATE RANGE TYPE = Appointment Date. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| OTHER OPTIONS | Include patients with no insurance (checkbox) | **unchecked** | `include_patients_with_no_insurance` | boolean | - | `false` | replicated | Mapped (inferred): false = only appointments of patients with an active dental coverage slot today (rpt_insurance_coverage, category = 'dental'); true = also appointments of patients without one. A medical-only patient counts as uninsured (proposal, FLT-23). Coverage is today's, not on the appointment date. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `appointment_created_date` | required_when | date_range_type != appointment_date | - | inferred - The secondary range applies only then. |
<!-- PARITY:insurance_reports.r05:END -->

| Legacy option | Effect on the result |
|---|---|
| DPS ELIGIBILITY `On Hold` unticked (default) | No predicate on the hold flag: every appointment in range (insured, plus uninsured when the last option is ticked), with or without a request |
| DPS ELIGIBILITY `On Hold` ticked | Only appointment slots whose latest verification request has `is_on_hold = true` (`eligibility_verifications`, DATA-34; meaning inferred, supplement correction "likely"). Before DATA-34 holds no row: zero rows plus notice `needs_eligibility_history` |
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged; Excel = flat sheet; `csv` added |
| OFFICE/GROUP `Office` (default) + picker (working office) / `Office Group` + picker | Appointment office `rpt_appointment_facts.office_id` in the resolved set; one `Office :` band per office |
| PROVIDER `ALL` (default) / a selection | No predicate / `rpt_appointment_facts.provider_id IN (...)` (`provider_role = appointment`) |
| DATE RANGE TYPE `Appointment Date` (default) | `appointment_date BETWEEN date_from AND date_to`; the created range is greyed and ignored (`disabled_value`) |
| DATE RANGE TYPE `Appointment Created Date` | `created_date BETWEEN appointment_created_date_from AND appointment_created_date_to` on rows with `created_at_reliable`; the appointment range is greyed and ignored. Migrated appointments never match (no created date) |
| DATE RANGE TYPE `Both` | Both ranges apply, combined with AND (inferred: "applies both"; OR is the alternative, open question 2) |
| APPOINTMENT DATE RANGE Start / End (today / today) | Inclusive office-local appointment dates; `enabled_when date_range_type != appointment_created_date` |
| APPOINTMENT CREATED DATE RANGE Start / End (today / today, greyed) | Inclusive office-local created dates (timestamp bounds per office time zone, data card 4.3); `enabled_when date_range_type != appointment_date`; `required_when` the same |
| OTHER OPTIONS `Include patients with no insurance` unticked (default) | Only appointments of patients holding an active dental slot today (`rpt_insurance_coverage`, `category = 'dental'`); a medical-only patient counts as uninsured (proposal, open question 7) |
| `Include patients with no insurance` ticked | Adds one row per appointment of a patient without an active slot; coverage columns blank, `Status` = `No Insurance` |
| Population rule (no control) | `NOT is_block AND NOT is_deleted AND NOT is_legacy_archive`, `NOT is_patientless`; cancelled and no-show appointments excluded (`status_class NOT IN ('cancelled', 'no_show')`, proposal - legacy rule unknown, open question 3) |

Dependency rules: DATE RANGE TYPE enables exactly the range(s) it names (rules of the parity file, inferred from the
greyed capture); no other captured rule. The `required_when` row names the `date_range` parameter
`appointment_created_date`, whose value keys are `appointment_created_date_from` and `appointment_created_date_to` (the
two parity rows): both are required when `["ne", "date_range_type", "appointment_date"]`.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `date_preset` values `tomorrow`, `next_2_working_days`, `next_7_days` | `date_range` presets (FLT-04) | `today` | The daily "verify ahead" window | Same presets as `worklists.eligibility_verification` |
| `coverage_orders` | `enum_multi` (shared 2.5) | all ticked (`no_predicate`) | Only primary or only secondary slots | `quaternary` never matches; tertiary only where a slot exists |
| `carrier_ids` | `entity_multi` (shared 3.5) | `all` | Carrier of the slot | Legacy screen has no carrier criterion |
| `eligibility_states` | NEW `enum_multi` (owner 04), one value list for the category: `verified`, `not_eligible`, `unknown`, `expired`, `no_insurance`, `error`; this report offers all but `error` | full selection, `no_predicate` | E.g. only `unknown` + `expired` = the work still to do. `expired` = `verified` with `elig_verified_on` older than the organisation setting `eligibility_valid_days` before the appointment (05 section 3 setting 35) | Same states as the worklist filter "verification state" |
| `request_states` | NEW `enum_multi`: `not_requested`, `requested`, `answered`, `error` (owner 04) | full selection | Filters on the latest `eligibility_verifications` row of the slot | Empty until DATA-34 data exists |
| `sort_by` | `enum` (shared 3.9) | `appointment_date_time` | `appointment_date_time`, `provider_appointment`, `patient_last_name`, `days_since_verified_desc` | Legacy order unknown |
| Saved view "Verify tomorrow" | saved view | - | `date_preset = tomorrow`, `eligibility_states = [unknown, not_eligible, expired]` | Daily pre-visit list |
| Saved view "Booked today" | saved view | - | `date_range_type = appointment_created_date`, created range `today` | New bookings needing a first request |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_appointment_facts`, `rpt_insurance_coverage`, `rpt_patient_dim`, `rpt_provider_dim`, `rpt_user_dim`, `eligibility_verifications` (passthrough, DATA-34) |
| Columns used | appointments: `appointment_id`, `office_id`, `provider_id`, `patient_id`, `appointment_date`, `start_time`, `created_date`, `created_at_reliable`, `status_class`, `is_block`, `is_deleted`, `is_legacy_archive`, `is_patientless`; coverage: `slot_id`, `category`, `tier`, `carrier_id`, `carrier_name`, `carrier_phone`, `group_number`, `employer_name`, `subscriber_id`, `sub_member_id`, `subscriber_name`, `subscriber_dob`, `relationship`, `elig_status_class`, `elig_verified_on`, `elig_verified_by`; patient: `first_name`, `last_name`, `chart_no`, `dob`, `phone`, `cell_phone`; verifications (latest row per appointment and slot, `LEFT JOIN LATERAL ... ORDER BY checked_at DESC LIMIT 1`, matched on (`appointment_id`, `subscriber_id`, `tier`), then (`appointment_id`, `subscriber_id`); proposal, open question 8: else on `subscriber_id` and `tier` alone within 30 days before the appointment): `method`, `verify_type`, `is_on_hold`, `status`, `payer_name`, `error_text`, `checked_at`, `checked_by` |
| Join | appointment x today's dental slots of the patient (`LEFT JOIN` when `include_patients_with_no_insurance`); never multiplies beyond one row per slot |
| Date basis | `appointment_date` and / or appointment `created_date`, chosen by `date_range_type` (header) |
| Office attribution | appointment office |
| Provider attribution | appointment provider |
| Coverage rating | **READY** on the current stamp (coverage matrix #34); history of requests and answers, `Verify Type` and `On Hold`: **SCHEMA(34)** |
| Availability entries | `eligibility_current_stamp_only` (until DATA-34: status is the subscriber's current stamp, no request columns); `needs_eligibility_history` (On Hold ticked or `request_states` narrowed before DATA-34 rows exist); `appointment_created_date_app_only` (created range: migrated appointments never match) |
| Not reproducible | which appointments were verified before a past visit (one overwritable stamp per subscriber, no history before DATA-34); coverage on the appointment date (slots carry no dates: coverage is today's); every migrated subscriber is `unknown` (data card 2.21), so at go-live nearly every insured appointment shows `Unknown` |

### Output

Report format: one (`standard`). Block `appointments` (table, `row_id_column = row_key` = `appointment_id || ':' || coalesce(slot_id, 0)`).
Levels: office band (`multi_office`) -> appointment date `Appointment Date : {appointment_date}`, subtotal
`Total Appointments [ {appointment_count} ]`; grand total `Total Appointments [ {appointment_count} ]` (count of distinct
`appointment_id`, so a two-slot appointment counts once).

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | - | id, hidden | aggregate | group key |
| `row_key`, `appointment_id`, `patient_id`, `subscriber_id` | - | id, hidden | phi_identified | row id, drill and action keys |
| `appointment_date` | Appt Date | date | phi_identified | group key of the date level |
| `start_time` | Time | time | phi_identified | none |
| `created_date` | Created On | date | phi_identified | none (blank on migrated rows) |
| `provider_name` | Provider | text | aggregate | none |
| `patient_name` | Patient | text | phi_identified | key column; `count_distinct appointment_id` |
| `chart_no` | Chart # | text | phi_identified | none |
| `dob` | DOB | date | phi_identified | none |
| `phone` | Phone | text | phi_identified | none (cell, else home) |
| `tier_letter` | Ty | text | aggregate | none (`P`, `S`, `T`) |
| `carrier_name` | Carrier | text | aggregate | none |
| `carrier_phone` | Carrier Ph | text, `default_visible: false` | aggregate | none |
| `subscriber_name` | Subscriber | text | phi_identified | none |
| `subscriber_dob` | Sub DOB | date | phi_sensitive | none |
| `sub_member_id` | Sub ID | text | phi_sensitive | none |
| `group_number` | Group # | text | phi_sensitive | none |
| `employer_name` | Employer | text | phi_sensitive | none |
| `verify_type` | Verify Type | text | aggregate | none (DATA-34; blank before) |
| `is_on_hold` | On Hold | boolean | aggregate | count of true |
| `request_status` | Request | enum, `default_visible: false` | aggregate | none (`Not requested`, `Requested`, `Answered`, `Error`) |
| `elig_status` | Status | enum | aggregate | count per value in the report-end block (`Eligible`, `Not Eligible`, `Unknown`, `Expired`, `No Insurance`) |
| `elig_verified_on` | Last Verified | datetime (`tz: office`), `default_visible: false` | phi_identified | none |
| `elig_verified_by` | Verified By | text, `default_visible: false` | aggregate | none (user label, `Auto_RTE` for the sweep) |
| `days_to_appointment` | Days | integer, `default_visible: false` | aggregate | none |
| `payer_message` | Payer Message | text, `default_visible: false` | phi_identified | none (free text, security card 5.2 rule 4) |

Block `status_summary` (`key_value`, placement `report_end`): count of appointment slots per `elig_status` and the count
with `is_on_hold`. Sort: `sort_by` inside the date band; tie-breaker `row_key`. Page break: office band;
`page_break_by = date` (value of the shared 3.9 vocabulary) for one page per appointment day. Summary cards: `Appointments`,
`Unverified` (`unknown` + `not_eligible` + `expired`), `On hold`, `Requested, no answer`. No metric reconciles exactly:
`eligibility_verified_pct` (P3) uses its own window and validity rule; test RPT-INS-40 checks that a run with the
worklist's window and `coverage_orders = [primary]` gives the same verified share. `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Stacked bars per appointment day: slots by `elig_status` (next 7 days view); none on a one-day run |
| Status bar segment | `kind rows`: the run filtered to that day and status |
| `Patient` | patient shell (`route_key patient_overview`), `phi_identified` |
| `Appt Date` / `Time` | `kind record`, entity appointment, `route_key scheduler_appointment` (Scheduler opened on the day with the appointment selected), right of the Scheduler screen |
| `Carrier` / `Sub ID` | `kind record`, entity coverage slot, `route_key patient_insurance` (the slot's plan screen), right of the patient insurance screen |
| Summary card `Unverified` | P3: `kind report` `worklists.eligibility_verification` with the same `office_scope` and appointment range (06 serves it from P3); P2: `kind rows` of this run filtered to `unknown`, `not_eligible`, `expired` |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Update status (verified / not eligible with a note) | row | `custom:verify_eligibility` -> `POST /insurance-subscribers/{subscriber_id}/verify-eligibility` (handler of 06 section 6.3) | patient insurance feature right | P3 (ENG-49); P2 = open the coverage screen |
| Request verification (writes `eligibility_verifications`, `method = 'service'`, `status = 'requested'`, verify type, on-hold flag) | row and bulk | P2: request form on the appointment window (verify type, On Hold, Submit; RPT-INS-41, no ENG-49); P3: `custom:request_verification` from the report (RPT-INS-42) | `appointments_dps_ins_verification_reports` | P2 on the appointment window; P3 from the report (ENG-49) |
| Request updated insurance from the patient | bulk | `send_sms` / `send_email` (template "please bring your current insurance card"), consent exclusions counted | messaging right | P3 (DASH-31) |
| Open appointment | row | drill `scheduler_appointment` | Scheduler right | P2 |
| Export selection | bulk | `export_selection` (P2: whole-run export through `output_format`) | `reports_export_data_files` | P3 (ENG-49, SEC-36) |

Doubles as a worklist: the live, actionable version is `worklists.eligibility_verification` (06 section 6.3); the report is
the printable audit list with request history.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (the 18 proposed legacy columns by default; optional columns add to them), office and date bands, `status_summary` at report end, footer echo as Legacy output; `Sub ID` and `Sub DOB` dropped for a caller without `phi_sensitive` |
| XLSX | Sheet `appointments`: flat typed columns plus `Office`, `Office Name`, `Appointment Id`; `Phone` split into `Home Phone`, `Cell Phone`; criteria sheet |
| CSV | Main block |
| Background | Not needed (one office-day is tens of rows); `escalate_when` all offices and a range over 31 days |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Printed title, column list, grouping and totals (no vendor source) | Proposal of Legacy output |
| 2 | DATE RANGE TYPE `Both`: both ranges (AND) or either (OR)? | AND |
| 3 | Are cancelled, missed and block-out appointments listed? | Excluded |
| 4 | One row per appointment or per appointment and coverage? | Per appointment and slot |
| 5 | `On Hold` ticked: only held requests, or held requests added to the list? | Only held requests |
| 6 | Does the legacy report list appointments without any DPS request, or only appointments with a request? | All appointments in range (the request columns show `Not requested`) |
| 7 | `Include patients with no insurance`: does it add appointments of uninsured patients (inferred)? Does a medical-only patient count as uninsured? | Adds them; insured = active dental slot today, so medical-only patients count as uninsured |
| 8 | How is a verification request matched to a coverage slot when the request carries no appointment (the 30-day subscriber fall-back is our proposal)? | (`appointment_id`, `subscriber_id`, `tier`) first; else `subscriber_id` and `tier` within 30 days before the appointment |

## Capitation Payment - `insurance.capitation_payment`

Insurance Reports, screenshot 6.PNG - P2 - M - `reports_insurance_reports_screen_view_only` (family `insurance`) - instant - PARTIALLY DOCUMENTED; layout INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Managed-care (DHMO) office, billing | Month end, after the carriers' monthly capitation cheques arrive | List the capitation payments received per carrier and period, check that every contracted carrier paid, and hand the figures to accounting `[D]` `[R9]` |
| Office manager | Month end, with Capitation Utilization | Compare what each managed-care carrier paid with the value of the services done for its members (enhancement) |

Source data in the legacy tool `[S]` `[D]` `[R37]`: `Transactions > Capitation Payment` with carrier (shown with its capitation
fee schedule), `Use Payment Code Of` (e.g. `CAP PYMT`), `Use Adjustment Code Of` (e.g. `ADJ ON - Capitation Adjustment`),
`Date`, `Amount`, `Check #`, `Bank #`, `EOB #`, `Notes`; each payment posts a payment line and an offsetting adjustment
line on the pseudo-account `Account, Capitation`.

### Legacy output

Confidence: purpose and source data **PARTIALLY DOCUMENTED**; layout **INFERRED** (research section 4, Capitation Payment).

| Element | Content (proposal) | Basis |
|---|---|---|
| Printed title | `Capitation Payment` (menu name; not seen) | header page furniture |
| Office band | `Office : <name>` per office | family furniture |
| Carrier band | `Carrier : <name>` | research reconstruction |
| Columns, in order | `Date` - `Carrier` - `Payment Code` - `Description` - `Check #` - `Bank #` - `EOB #` - `Amount` - `User` | research reconstruction `[I]`, entry screen `[R37]` |
| Subtotal | `Total for <carrier> [ n ] :` with payment count and `Amount` | research ("subtotal per carrier") |
| Grand total | `Grand Total [ n ] :` | research ("grand total") |
| Footer echo | `From`, `Thru`, `Offices`, `Carriers`, then title, `Printed`, `Page : n of m` | family furniture |

Sign convention: `Amount` prints positive (money received); the offsetting adjustment leg is never listed (header money
rules). Comparable consulted for shape only: SoftDent `Capitation Collections Summary` `[X7]`.

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r06:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office or Office Group, both enabled on this screen (nothing greyed). Office: one or more offices the caller may read, default the working office; Office Group: groups from Setup > Office Groups, default ALL. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group); both enabled on this screen. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Fixed date_basis = payment_date of the capitation payment (inferred, 04 section 7.2 row 16). Reads capitation_payments (DATA-38, SCHEMA(38)): no capitation payment exists before it, so the report is APP. Default today; enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | End of the payment_date range, inclusive (basis inferred). Default today; enhanced with presets and relative tokens. |
| CARRIER | Carriers (picker) | shown: ALL | `carrier_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; ALL = no restriction. Filters the carrier of the capitation payment (capitation_payments carrier, DATA-38). Dialog content never captured - confirm whether only carriers with a capitation fee schedule are listed. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:insurance_reports.r06:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged; Excel = flat sheet; `csv` added |
| OFFICE/GROUP `Office` (default) + picker (working office) / `Office Group` + picker | `capitation_payments.office_id` (office where the payment was applied) in the resolved set; one `Office :` band per office |
| DATE RANGE Start / End (today / today) | Fixed basis `payment_date` (inferred): `payment_date BETWEEN date_from AND date_to`, inclusive |
| CARRIER `ALL` (default) / a selection | No predicate / `capitation_payments.carrier_id IN (...)`. Option source `carriers`; whether the legacy dialog lists only carriers with a capitation fee schedule is open (question 2) |
| Population rule (no control) | `NOT is_void`; payment leg only (one row per `capitation_payments` row) |

Dependency rules: none captured. No PROVIDER section exists on the screen.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `group_by` | `enum` (shared 3.9), options `none` and NEW value `carrier_month` (the carrier band is a fixed level, always printed) | `none` | `carrier_month` adds a payment-month level under the carrier with a subtotal per month | A 12-month range then reads as a carrier x month payment history |
| `include_voided` | NEW `boolean` (owner 04) | `false` | Lists voided payments with `Void` = yes, `void_reason`, excluded from totals | Audit of reversed cheques |
| `include_utilization_comparison` | NEW `boolean` (owner 04) | `false` | Adds per carrier subtotal `Value of Services` (office-fee value of procedures done for the carrier's prepaid members in the same range, the hidden `Office UCR` total of `insurance.capitation_utilization`) and `Paid / Value` | Same population rule as Capitation Utilization (RPT-INS-12, RPT-INS-14); P3 with `capitation_utilization_pct` |
| `date_preset` values `last_month`, `last_12_months`, `year_to_date` | `date_range` presets | `today` | Month-end and annual views | - |
| Saved view "Last month by carrier" | saved view | - | `date_preset = last_month` | Month-end hand-off to accounting |

### Data

| Topic | Rule |
|---|---|
| Datasets | `capitation_payments` (passthrough, DATA-38), `rpt_transaction_code_dim` (code descriptions), `rpt_user_dim` (`created_by`), `rpt_office_dim`; carriers through the `carriers` catalog passthrough; `fee_schedule_name` through the fee-schedule catalog passthrough (`fee_schedules`, header of `rpt_fee_schedule_fees`, DATA-51) joined on `fee_schedule_id`. The `cap` legs of `rpt_payments` (`txn_class = 'capitation_payment'`) carry the same money and are the reconciliation target, not a second source |
| Columns used | `id`, `office_id`, `carrier_id`, `fee_schedule_id`, `payment_date`, `amount`, `payment_code`, `adjustment_code`, `check_number`, `bank_number`, `eob_number`, `provider_id`, `notes`, `posted_at`, `posting_date`, `created_by`, `is_void`, `voided_at`, `void_reason` |
| Date basis | `payment_date` (inferred, header); `posting_date` is printed only (`Posted On`) |
| Office attribution | office where the payment was applied (`capitation_payments.office_id`) |
| Provider attribution | none (carrier-level payment, no patient); `provider_id` is stored and printable, never filtered by the legacy screen |
| Coverage rating | **SCHEMA(38)** (coverage matrix #35): a carrier-level payment has no patient and no table today; **APP** afterwards |
| Prerequisite outside the report | a capture screen that writes `capitation_payments` (RPT-INS-44); until it exists the report is listed with notice `needs_capitation_entry` and runs empty |
| Not reproducible | legacy capitation payments: none were loaded into a carrier-level entity; whether the legacy LEDGER export holds them as rows of the pseudo-account `Account, Capitation` is unknown (open question 4) |
| Reconciliation | sum of `Amount` = `-sum(amount)` of `rpt_payments` rows with `txn_class = 'capitation_payment'` for the same offices and `payment_date` range (R-02 untouched: the `cap` / `capa` pair nets to zero) |

### Output

Report format: one (`standard`). Block `payments` (table, `row_id_column = capitation_payment_id`). Levels: office band
(`multi_office`) -> carrier `Carrier : {carrier_name}`, subtotal `Total for {carrier_name} [ {row_count} ] :` -> [month
`{payment_month}` with subtotal when `group_by = carrier_month`]; grand total `Grand Total [ {row_count} ] :`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id`, `carrier_id` | - | id, hidden | aggregate | group keys |
| `capitation_payment_id` | - | id, hidden | aggregate | row id |
| `payment_date` | Date | date | aggregate | none |
| `carrier_name` | Carrier | text | aggregate | group label |
| `fee_schedule_name` | Capitation Fee Schedule | text, `default_visible: false` | aggregate | none |
| `payment_code` | Payment Code | text | aggregate | none |
| `payment_code_description` | Description | text | aggregate | none |
| `adjustment_code` | Adj. Code | text, `default_visible: false` | aggregate | none |
| `check_number` | Check # | text | payment_instrument | none |
| `bank_number` | Bank # | text | payment_instrument | none |
| `eob_number` | EOB # | text | payment_instrument | none |
| `amount` | Amount | money | financial_practice | sum (void rows excluded) |
| `created_by` | User | text | aggregate | none |
| `posted_on` | Posted On | date, `default_visible: false` | aggregate | none |
| `provider_name` | Provider | text, `default_visible: false` | aggregate | none |
| `notes` | Notes | text, `default_visible: false` | phi_identified | none (free text, rule 4) |
| `is_void`, `void_reason` | Void, Void Reason | boolean, text, `visible_when ["truthy","include_voided"]` | aggregate | count of void rows |
| `value_of_services` | Value of Services | money, subtotal-only, `visible_when ["truthy","include_utilization_comparison"]` | financial_practice | carrier subtotal and grand total only |
| `paid_to_value_pct` | Paid / Value | percent, computed `ratio(amount, value_of_services)` | financial_practice | carrier and grand level |

Sort: `payment_date`, then `check_number`; tie-breaker `capitation_payment_id`. Page break: office band;
`page_break_by = group` breaks per carrier. Summary cards: `Capitation received` (sum `amount`), `Payments` (count),
`Carriers paid` (count distinct `carrier_id`). `reconciles_with`: none in the metric registry (no capitation-received
metric exists; NEW metric `capitation_payments_amount` proposed to 05). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bars of `amount` per carrier; with `carrier_month` a line per carrier over the months (missing month = no payment, shown as a gap) |
| Carrier subtotal | `kind rows` |
| `Value of Services` | `kind report` `insurance.capitation_utilization` with `carrier_ids = [carrier]`, the same `office_scope` and dates, `report_format = summary` |
| Row | `kind record`, entity capitation payment, `route_key capitation_payment_entry` (NEW screen of RPT-INS-44), right `transactions_transaction_entry_screen_full_control` |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Open payment (edit or void there) | row | drill `capitation_payment_entry` | transaction entry right | P2 |
| Export selection | bulk | `export_selection` (P2: whole-run export through `output_format`) | `reports_export_data_files` | P3 (ENG-49, SEC-36) |

Not a worklist.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, portrait (9 default columns), office and carrier bands, footer echo; `Check #`, `Bank #`, `EOB #` dropped for a caller without `payment_instrument` |
| XLSX | Sheet `payments`: flat typed rows with `Office`, `Office Name`, `Carrier`, `Payment Month`; criteria sheet |
| CSV | Main block |
| Background | Never (one row per carrier per month) |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Column list, order and totals (no vendor sample) | Proposal of Legacy output |
| 2 | Does the CARRIER dialog list every carrier or only carriers with a capitation fee schedule? | Every carrier (family question 4) |
| 3 | Date basis: payment date or posting date? | `payment_date` |
| 4 | Did the legacy export contain capitation payments as ledger rows of `Account, Capitation`, and should they be loaded into `capitation_payments` (NEW repair, owner 03)? | Not loaded; the report is APP |
| 5 | Are voided capitation payments listed (struck through) on the legacy report? | Not listed (enhancement `include_voided`) |

## Benefits Used/Unused - `insurance.benefits_used_unused`

Insurance Reports, screenshot 7.PNG - P2 (Recall mode with the derived `rpt_recall_due()`, requested for P2, RPT-INS-47) - L - `reports_insurance_reports_screen_view_only` (family `insurance`) - interactive (background over a 12-month range across offices) - DOCUMENTED (both modes, 2011-2012 samples)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Treatment coordinator, front office | Before the benefit rollover: November-December for calendar-year plans, monthly for non-calendar plans | Find patients whose annual maximum is not used up before their plan anniversary and who have planned treatment (or are due for recall), call or write them, and book the work before the benefits reset `[D]` `[R6]` |
| Office manager | Quarterly | Size the unscheduled treatment that is still covered by this year's benefits |

### Legacy output

Confidence: **DOCUMENTED** for both modes (vendor samples 2011-2012 `[S]` `[R6]`; current layout may have changed).

| Element | Treatment Plan mode | Recall mode |
|---|---|---|
| Printed title | `Benefits Used/Unused Report - Treatment Plan` | `Benefits Used/Unused Report - Recall` |
| Grain | One block per patient per treatment-plan ID, one line per coverage | One block per patient per recall item, one line per coverage |
| Column groups, in order | `Patient Name` (with `Chart # :` underneath) - `Phones` (`(H)`, `(C)`, `(W)`) - `Treat Pln`: `ID`, `Charges` - `Carrier` (prefixed `P :` / `S :`) - `Anni Dt` - `Fam Max` - `Fam Max Rem` - `Ind Max` - `Ind Max Rem` - `Fam Ded` - `Fam Ded Rem` - `Ind Ded` - `Ind Ded Rem` | `Patient Name` - `Chart#` (own column) - `Phones` - `Recall`: `Date`, `Code`, `Reason` - `Carrier` - `Anni Dt` - the same eight benefit columns |
| Coverage lines | Primary and secondary print as two lines of the block | same |
| Grouping and totals | None on either sample | None |
| Footer echo | `Anni Date From`, `Thru`, `Ex Resp. Type`, `Providers`, then title, `Printed`, `Page : n of m` | 2011 sample adds `Recall Date From / Thru`, `Max Over`, `Recall Codes` |

Quirks kept: `99999.00` is an unlimited plan, not a balance (flagged `unlimited`, excluded from totals); `Ind Max Rem`
already nets posted procedures with estimated insurance, not only paid claims `[D]` `[R38]` - `rpt_benefit_usage()` is
recomputed from the claims of the benefit year, so this report prints NEW `max_remaining_with_posted` =
`max_remaining_effective` minus the `est_for_tier` of the slot's unclaimed production charges of the benefit year
(`rpt_unclaimed_charge_tiers`, `NOT has_claim`; owner 03, RPT-INS-46); remaining amounts are only as good as the benefit reset (`[R13]` `[R39]`; DentC recomputes from claims of the benefit year, data card 2.21). Quirk fixed:
the 2011 header typos `Fax Max Rem` / `Ins Max Rem` print as `Fam Max Rem` / `Ind Max Rem` (2023 wording).

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r07:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| TREATMENT PLAN/RECALL | (no label) (radio_group) | **Treatment Plan** / Recall | `report_type` | enum | Treatment Plan -> `treatment_plan`, Recall -> `recall` | `treatment_plan` | replicated | Selects population and layout (documented): treatment_plan = patients with a treatment plan and benefits remaining (printed title Benefits Used/Unused Report - Treatment Plan); recall = patients due for recall (title ... - Recall). Only the Treatment Plan state was captured; the Recall-state criteria of a 2011 sample (Recall Date From / Thru, Max Over, Recall Codes) are the shared vendor-doc parameters recall_date, max_over, recall_procedure_codes of 04, visible_when report_type == recall (inferred). The recall option reads rpt_recall_due(), P3 under DATA-41; RPT-INS-47 requests the derived function (no recall engine) from 03 in P2. Until it ships the option is listed with notice recall_mode_p3 and runs empty: a known P2 parity gap. Capture the Recall state on the live tool. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office or Office Group, both enabled on this screen (nothing greyed). Office: one or more offices the caller may read, default the working office; Office Group: groups from Setup > Office Groups, default ALL. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group); both enabled on this screen. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; ALL = no restriction; echoed in the footer as Providers. Which provider the legacy filter applies to is not documented. Proposed: treatment_plan mode = treating provider of the planned item (rpt_treatment_item_facts); recall mode = the patient's preferred provider (rpt_patient_dim.preferred_provider_id, not migrated). Confirm on the live tool. |
| ANNIVERSARY DATE RANGE (* UPCOMING BENEFIT ROLLOVER PERIOD.) | Start Date (date_input) | shown: 12/01/2026 | `date_from` | date_range | - | `start_of_next_month` | replicated_enhanced | Primary date range with fixed date_basis = anniversary_date. Default is the first day of next month, not today. Header note (* UPCOMING BENEFIT ROLLOVER PERIOD.) is kept as help text. |
| ANNIVERSARY DATE RANGE (* UPCOMING BENEFIT ROLLOVER PERIOD.) | End Date (date_input) | shown: 11/30/2027 | `date_to` | date_range | - | `start_of_next_month+1y-1d` | replicated_enhanced | Primary date range, inclusive end, fixed date_basis = anniversary_date. Default = start date plus one year minus one day. |
| EXCLUDE RESPONSIBLE PARTY TYPE | (no label) (picker) | shown: None | `exclude_resp_party_type_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter on the account's responsible-party type (shared parameter exclude_resp_party_type_codes, lookup definitions:resp_party_type): None = exclude nothing; accounts of a picked type are dropped, accounts without a type are kept. Echoed as Ex Resp. Type. Needs accounts.resp_party_type: SCHEMA(53) (DATA-53, P1). The legacy value list was never captured - confirm on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `recall_date` | visible_when | report_type == recall | - | inferred - Recall state of Benefits Used/Unused (not captured). |
| `max_over` | visible_when | report_type == recall | - | inferred |
| `recall_procedure_codes` | visible_when | report_type == recall | - | inferred |
<!-- PARITY:insurance_reports.r07:END -->

| Legacy option | Effect on the result |
|---|---|
| TREATMENT PLAN/RECALL `Treatment Plan` (default) | Population = patients with at least one pending treatment-plan item (`rpt_treatment_item_facts.is_pending`) whose dental slot has its next anniversary in range; one block per patient and `plan_id`; title `... - Treatment Plan` |
| TREATMENT PLAN/RECALL `Recall` | Population = patients with a recall row of `rpt_recall_due()` whose `due_date IS NOT NULL` and `due_date BETWEEN recall_date_from AND recall_date_to` (no `recall_status` predicate; only when `recall_date` is absent: `recall_status IN ('due', 'overdue')`) and a slot with its next anniversary in range; one block per patient and recall code; title `... - Recall`; shows the three Recall criteria (vendor-doc). Until the derived `rpt_recall_due()` ships (requested for P2, RPT-INS-47) the option is listed with notice `recall_mode_p3` and runs empty: a known P2 parity gap |
| Recall Date From / Thru (vendor-doc, `recall_date`, Recall mode only) | `rpt_recall_due.due_date BETWEEN recall_date_from AND recall_date_to`; default unknown, proposed `today` .. `date_to` of the anniversary range (inferred) |
| Max Over (vendor-doc, `max_over`, Recall mode only) | `max_remaining_with_posted > max_over` on at least one coverage line of the patient (inferred from the echo label; control type and default unknown, proposed `0.00`) |
| Recall Codes (vendor-doc, `recall_procedure_codes`, Recall mode only) | `all` = every recall code / `procedure_code IN (...)` on the recall row |
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged; Excel = flat sheet one row per coverage line; `csv` added |
| OFFICE/GROUP `Office` (default) + picker (working office) / `Office Group` + picker | Patient home office `rpt_patient_dim.home_office_id` in the resolved set (header, proposed); band per office |
| PROVIDER `ALL` (default) / a selection | No predicate / Treatment Plan: at least one pending item of the block with `rpt_treatment_item_facts.provider_id IN (...)`, and `Charges` sums only those items; Recall: `rpt_recall_due.preferred_provider_id IN (...)` (both proposed, family question 2) |
| ANNIVERSARY DATE RANGE Start (first day of next month) / End (one year later minus a day) | Fixed basis `anniversary_date` = next benefit rollover of the slot = `rpt_benefit_usage.benefit_year_end + 1` as of the office-local today; coverage line kept when that date is in range; a block is printed when at least one of its lines is kept. Help text `(* UPCOMING BENEFIT ROLLOVER PERIOD.)` |
| EXCLUDE RESPONSIBLE PARTY TYPE `None` (default) / a selection | Nothing excluded / patients whose account's `rpt_account_dim.resp_party_type` is selected are dropped; accounts without a type are kept (`null_policy keep`); echo `Ex Resp. Type` |
| Population rule (no control) | Active patients only (`rpt_patient_dim.is_active`, proposed); dental slots only; at least one coverage line with remaining maximum > 0 or unlimited (`[D]` purpose "still have benefits", the exact rule is unverified) |

Dependency rules: `recall_date`, `max_over`, `recall_procedure_codes` `visible_when report_type == recall` (vendor-doc,
inferred; the Recall state of the screen was never captured).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `benefits_remaining_min` | NEW `decimal` (key used by `worklists.unscheduled_treatment`, owner 04) | `"0.00"` | Keeps patients whose `Ind Max Rem` on some line is at least the value | The Treatment Plan twin of `max_over` |
| `acceptance_state` | `enum` (key used by 06 section 6.5, owner 04): `any`, `accepted_only`, `not_accepted` | `any` | `accepted_only` = items with `exclusive_status = 'accepted'` only | Accepted but unscheduled work is the best call list |
| `has_future_appointment` | NEW `enum` `any` / `yes` / `no` (owner 04) | `any` | `no` keeps patients without any live future appointment (`rpt_appointment_facts`) | Avoids calling patients already booked |
| `coverage_orders` | `enum_multi` (shared 2.5) | all ticked | Primary only, secondary only | - |
| `carrier_ids` | `entity_multi` (shared 3.5) | `all` | Carrier of the slot | - |
| `sort_by` | `enum` (shared 3.9) | `patient_last_name` | `patient_last_name`, `remaining_desc` (largest `Ind Max Rem` first), `anniversary_date`, `charges_desc` | Legacy order unknown (samples alphabetical `[I]`) |
| Column `est_insurance_pending` | column | hidden | Sum of `insurance_estimate` of the pending items of the block | Shows how much of the remaining maximum the plan would use |
| Saved view "Year-end calendar plans" | saved view | - | `date_from = next 01-01`, `date_to = next 01-01` | Calendar-year rollovers only |
| Saved view `Benefits Used/Unused - Recall` | saved view (header) | - | `report_type = recall` | From P3 |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_benefit_usage()` (as of office-local today), `rpt_insurance_coverage`, `rpt_treatment_item_facts`, `rpt_unclaimed_charge_tiers` (`est_for_tier`, `has_claim`, `service_date`: posted, unclaimed estimates), `rpt_recall_due()` (Recall), `rpt_patient_dim`, `rpt_account_dim`, `rpt_procedure_code_dim` (recall reason), `rpt_appointment_facts` (enhancement) |
| Columns used | benefit usage: `slot_id`, `patient_id`, `tier`, `carrier_id`, `benefit_year_start`, `benefit_year_end`, `individual_max`, `max_remaining_effective`, `max_remaining_source`, `individual_deductible`, `deductible_remaining_effective`, `deductible_remaining_source`, `family_max`, `family_max_remaining_stored`, `family_deductible`, `family_ded_remaining_stored`, `slot_written_on`; coverage: `carrier_name`, `category`; items: `plan_id`, `item_id`, `provider_id`, `fee`, `insurance_estimate`, `is_pending`, `exclusive_status`, `era`; recall: `procedure_code`, `due_date`, `recall_status`, `preferred_provider_id`; patient: `first_name`, `last_name`, `chart_no`, `phone`, `cell_phone`, `work_phone`, `home_office_id`, `account_id`, `is_active`; account: `resp_party_type` |
| Benefit columns | `Ind Max`, `Ind Ded`, `Fam Max`, `Fam Ded` = plan limits; `Ind Max Rem` = NEW `max_remaining_with_posted` (`max_remaining_effective` minus the `est_for_tier` of the slot's `NOT has_claim` production charges with `service_date` in the benefit year, owner 03; legacy nets posted procedures); `Ind Ded Rem` = `deductible_remaining_effective`; `Fam Max Rem`, `Fam Ded Rem` = stored snapshots per subscriber, printed with `slot_written_on` (data card 2.21) |
| `Charges` | Treatment Plan: `sum(fee)` of the pending items of the `plan_id` (inferred: "total charges of that plan ID"; open question 2) |
| Date basis | `anniversary_date` (header) |
| Office attribution | patient home office (proposed, header) |
| Provider attribution | treating provider of the planned item (Treatment Plan), preferred provider (Recall) - proposed |
| Coverage rating | **REPAIR(32)** (coverage matrix #36): plan limits and slot tiers right only after the source-field backfill; family columns are stored snapshots; pending treatment **APP** (migrated plans are 674 dateless headers); Recall mode the derived `rpt_recall_due()` (P3 in the data card; requested for P2 without the engine, RPT-INS-47; DATA-41 maintained rows stay P3); EXCLUDE RESPONSIBLE PARTY TYPE **SCHEMA(53)** (until DATA-53 self-guarantor accounts carry no type and are never excluded) |
| Availability entries | `benefit_limits_unrepaired` (before DATA-32 checks pass), `family_remaining_stored`, `resp_party_type_partial` (before DATA-53), `recall_mode_p3` |
| Not reproducible | remaining benefits as of a past date for migrated years (no deductible was applied to any migrated row; `Ind Ded Rem` is the stored or plan value for history); anniversaries of plans whose `anniversary_month` is 0 before the backfill (line printed with `Anni Dt` blank and excluded from the range filter, counted in the notice) |

### Output

Report formats: the `report_type` values select the block; there is no `report_format` control.

Block `tp_benefits` (`report_type = treatment_plan`; table, `row_id_column = row_key` = `patient_id:plan_id:slot_id`).
Levels: office band (`multi_office`) -> patient-plan block (key `patient_id`, `plan_id`; header row carries patient,
phones, plan id and charges on the first coverage line, later lines blank in those cells). No subtotals (legacy); grand
total enabled (proposal).

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id` | - | id, hidden | aggregate | group key |
| `row_key`, `patient_id`, `slot_id` | - | id, hidden | phi_identified | row id, drill and action keys |
| `patient_name` | Patient Name | text | phi_identified | key column; grand `count_distinct patient_id` |
| `chart_no` | Chart # | text (PDF: second line under the name) | phi_identified | none |
| `phones` | Phones | text (`(H) ... (C) ... (W) ...`) | phi_identified | none |
| `plan_id` | ID | text | phi_identified | group key of the block |
| `plan_charges` | Charges | money | financial_patient | printed once per block; grand total sums each block once |
| `est_insurance_pending` | Est. Ins | money, `default_visible: false` | financial_patient | as `plan_charges` |
| `tier_carrier` | Carrier | text (`P : <carrier>`, `S : <carrier>`) | aggregate | none |
| `anniversary_date` | Anni Dt | date | aggregate | none |
| `family_max` | Fam Max | money | financial_patient | none |
| `family_max_remaining` | Fam Max Rem | money (tooltip `as of {slot_written_on}`) | financial_patient | none |
| `individual_max` | Ind Max | money | financial_patient | none |
| `individual_max_remaining` | Ind Max Rem | money (`max_remaining_with_posted`, NEW) | financial_patient | grand sum excluding `is_unlimited` rows |
| `family_deductible` | Fam Ded | money | financial_patient | none |
| `family_ded_remaining` | Fam Ded Rem | money | financial_patient | none |
| `individual_deductible` | Ind Ded | money | financial_patient | none |
| `individual_ded_remaining` | Ind Ded Rem | money | financial_patient | none |
| `is_unlimited` | Unlimited | boolean (`individual_max >= 99999`) | aggregate | count |
| `max_remaining_source` | Rem. Source | enum, `default_visible: false` (`claims`, `stored`, `plan`) | aggregate | none |
| `family_written_on` | Fam Rem As Of | date, `default_visible: false` | aggregate | none |

Block `recall_benefits` (`report_type = recall`): the same columns with `plan_id`, `plan_charges` and
`est_insurance_pending` replaced by `recall_due_date` (Date, phi_identified), `recall_code` (Code, phi_identified),
`recall_reason` (Reason = description of the recall code, aggregate; legacy meaning unverified), and `chart_no` as its
own column; block key `patient_id`, `recall_code`.

Sort: `sort_by` (blocks), coverage lines by tier; tie-breaker `row_key`. Page break: office band;
`page_break_by = patient` (value of the shared 3.9 vocabulary) for one block per page. Summary cards: `Patients` (count distinct),
`Remaining maximum` (sum `individual_max_remaining`, unlimited excluded), `Unlimited plans` (count), `Planned charges`
(Treatment Plan). `reconciles_with`: grand total of the hidden column `max_remaining_claims` (`max_remaining_effective`,
`default_visible: false`) on primary slots = `benefits_remaining_amount` (P3; the card is shown when the metric ships,
header) for `report_type = treatment_plan`, all providers, default anniversary range; `Ind Max Rem` differs from it by
the posted, unclaimed estimates (the legacy netting).
`empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bars of `Remaining maximum` by anniversary month of the range (12 bars) - where the money expires first |
| Month bar | `kind rows` filtered to that anniversary month |
| `Patient Name` | patient shell (`route_key patient_overview`), `phi_identified` |
| `ID` / `Charges` | `kind record`, entity treatment plan, `route_key patient_treatment_plan` (the plan opened), right of the treatment-plan screen |
| `Carrier` / benefit cells | `kind record`, entity coverage slot, `route_key patient_insurance`, right of the patient insurance screen |
| Recall `Date` / `Code` | `kind record`, `route_key patient_recall`, right of the recall screen (P3) |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Schedule the plan items | row | `navigate` booking hand-off (`openSchedulerForBooking` with the block's pending items preselected) | Scheduler right | P2 |
| Print proposal | row | `navigate` `treatment_plan.treatment_plan_proposal` with the patient in context | `treatment_plan` family | P2 |
| "Use your benefits before {anniversary_date}" message | bulk | `send_sms` / `send_email` with consent exclusions counted (`no_correspondence`, `no_auto_sms`, `sms_opt_out_at`) | messaging right | P3 (DASH-31) |
| Letters | bulk | `letters` (benefit-reminder letter template) | letters right (PD-15) | P3 |
| Create follow-up tasks | bulk | `create_task` (type `benefits_expiring`, NEW, owner 06) | task feature right | P3 (ENG-49, DASH-28) |
| Export selection | bulk | `export_selection` (P2: whole-run export through `output_format`) | `reports_export_data_files` | P3 (ENG-49, SEC-36) |

Doubles as a worklist: the live counterpart is `worklists.unscheduled_treatment` with "benefit year ends within N
months"; the report keeps the legacy anniversary-range form.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (14 columns), block layout with the patient cells on the first coverage line, name and `Chart # :` stacked, footer echo `Anni Date From`, `Thru`, `Ex Resp. Type`, `Providers` (Recall adds `Recall Date From`, `Thru`, `Max Over`, `Recall Codes`) |
| XLSX | Sheet per mode: one row per coverage line, patient and plan columns repeated on every line (no merged cells), `Phones` split into `Home Phone`, `Cell Phone`, `Work Phone`, `Unlimited` and `Fam Rem As Of` as columns; criteria sheet |
| CSV | Main block |
| Background | `escalate_when` all offices or more than 3 offices with a range over 6 months (header: 12-month range across offices) |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Capture the Recall state of the screen: are `Recall Date From / Thru`, `Max Over`, `Recall Codes` still controls, their types and defaults? | Vendor-doc parameters, visible in Recall mode, defaults proposed |
| 2 | `Charges` = pending items only, or every item of the plan id? Are accepted / diagnosed / hold items all counted? | Pending items, every exclusive status |
| 3 | Is a patient with nothing remaining (Ind Max Rem 0) listed? | Not listed unless unlimited |
| 4 | Which provider does PROVIDER filter? | Item provider (Treatment Plan), preferred provider (Recall) |
| 5 | Are inactive patients listed? | Active only |
| 6 | Office attribution: patient home office or plan office? | Home office (DATA-39 adds the item office in P3) |
| 7 | Recall `Reason` column content | Recall code description |
| 8 | Is the anniversary range compared with the next rollover or with the stored plan anniversary date? | Next rollover (`benefit_year_end + 1`) |
| 9 | `Ind Max Rem` nets posted procedures with estimated insurance `[R38]`: posted lines of the benefit year only, and is the estimate the tier's estimate at posting? | `max_remaining_with_posted` with `est_for_tier` of unclaimed production charges of the benefit year |

## Outstanding Claims - `insurance.outstanding_claims`

Insurance Reports, screenshot 8.PNG - P2 - L - `reports_insurance_reports_screen_view_only` (family `insurance`); CREATE TASK needs the task feature right - interactive (background over all offices) - DOCUMENTED (2023 PDF, Excel c. 2015)

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Billing staff | Month end on the default date (vendor cadence `[D]` `[R13]`), and weekly for follow-up | List every claim sent and not yet recorded as paid, banded by carrier with its phone so one call covers several claims, aged on the estimated insurance; create follow-up tasks from the list `[D]` `[R3]` `[R10]` `[R18]` |
| Billing staff | Weekly | `Pre-Authorization`: pre-authorisations sent and not answered |
| Office manager | Month end | Insurance receivable by age band; claims over 90 days |

Vendor statement kept: the total is **not** comparable with Aging estimated insurance - it omits secondary claims not yet
created and procedures with no claim `[D]` `[R10]`.

### Legacy output

Confidence: **DOCUMENTED** (PDF printed 6/3/2023 `[S]` `[R10]`; Excel c. 2015 read from a low-resolution image, spellings approximate `[S]` `[R4]`). Internal names `NewOutstandingClaims` (PDF), sheet `GrpXlsClaimsAge` (Excel).

| Element | PDF | Evidence |
|---|---|---|
| Header | Organisation, `Outstanding Claims`, `Office : <name>`, band `Dental Claims` (a `Medical Claims` band presumed) | `[S]`; medical band `[I]` |
| Carrier band | `Carrier : <name>   Ph : <phone>` | `[S]` |
| Columns, in order | `Claim Sent / DOS` - `Patient Name / DOB` - `Subscriber Name / DOB` - `Chart #` - `Claim #` - `Ty` - `UCR` - `Claim $` - `Est. Ins` - `Curr` - `Over30` - `Over 60` - `Over 90` - `Over 120` - `Total` | `[S]` |
| Extra lines per claim | `Group: <no>` under the patient, `Sub ID: <id>` under the subscriber, `Created By: <user>` at the right | `[S]` |
| Ageing | The bucket columns carry `Est. Ins`; `Total` = `Est. Ins` (1,822.00 claim, 1,500.00 estimate -> `Over 120` 1,500.00, `Total` 1,500.00); a 0.00-estimate claim is listed with zero buckets | `[S]` |
| Subtotals | `Total for <carrier> [ n ] :` (header); grand total not on the sample's first page | header; `[unverified]` |
| GROUP BY Provider | A provider level (the former `Outstanding Claim Report for Provider`) | `[D]` `[R18]`; layout `[I]` |
| Footer echo | `Report Date`, `Offices`, `Providers`, `Carriers`, `Claim Sent Type : EClaim and Paper`, `Claim Amt Over/Equal`, title, `Printed`, `PlanetDDS (c) 2003 - 2023`, `Page : 1 of 42` | `[S]` |

| Element | Excel (flat, one row per claim, 25 columns) |
|---|---|
| Columns, in order | `Office` - `Carrier Name` - `Carrier Phone` - `Provider` - `Patient` - `Pat ID` - `Pat DOB` - `Subscriber` - `Sub DOB` - `Sub ID` - `Group #` - `DOS` - `Claim Sent` - `Claim #` - `UCR` - `Claim$` - `Est Ins` - `Recv Amt` - `Curr` - `Over30` - `Over60` - `Over90` - `Over120` - `Total` - `Claim Note` |
| Row 1 | Organisation, `User ID : <user>`, title (moved to the criteria sheet: no merged title cells) |
| `Claim Note` | Latest office-defined claim status with timestamp and user `[D]` `[R17]` |

Sign conventions: every amount positive. Quirks kept: buckets age `Est. Ins`, not the claim amount (reconciliation rule 2
of the research); `Ty` prints the coverage order; `UCR` and `Claim $` can differ. Quirk stated, not fixed: the age basis
cannot be read from the sample; we age from the date sent (`age_date_sent`), as comparables do `[X3]`, and print the basis
in the criteria echo.

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r08:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| CLAIM/PRE-AUTH | (no label) (radio_group) | **Claims** / Pre-Authorization | `claim_kind` | enum | Claims -> `claims`, Pre-Authorization -> `pre_authorization` | `claims` | replicated | - |
| CLAIM TYPE | (no label) (radio_group) | **Both** / Dental / Medical | `claim_type` | enum | Both -> `both`, Dental -> `dental`, Medical -> `medical` | `both` | replicated | - |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office or Office Group, both enabled on this screen (nothing greyed). Office: one or more offices the caller may read, default the working office; Office Group: groups from Setup > Office Groups, default ALL. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group); both enabled on this screen. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; ALL = no restriction; footer Providers. provider_role = claim provider: rpt_claim_facts.treating_provider_id, falling back to billing_provider_id (06 section 6.7). The Excel output prints a Provider column; which provider it is, is not documented - confirm on the live tool. |
| REPORT DATE | Report Date (date_input) | shown: 11/21/2026 | `report_date` | date | - | `today` | replicated_enhanced | Single date, role as_of (documented: vendor advises the default date for a right-now figure). Default today in the office time zone. A future date shifts the ageing only (population and amounts of today). A past date needs rpt_claim_facts_as_of() (DATA-31, with status history from DATA-25): until then it is refused with 422 as_of_unavailable (NEW validation code, owner 02) and the notice outstanding_as_of_today_only. Whether the legacy Report Date reconstructs history or only shifts the aging is unverified. |
| CLAIM AMOUNT OVER OR EQUAL TO | (no label) (number_input) | shown: 0.00 | `claim_amount_min` | decimal | - | `0.00` | replicated | Claim amount >= value, compared with billed_amount (the Claim $ column; footer Claim Amt Over/Equal). |
| CARRIER | Carriers (picker) | shown: ALL | `carrier_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| CLAIM SENT TYPE | EClaim (checkbox) | **checked** | `claim_sent_types.eclaim` | enum_multi | - | `true` | replicated | - |
| CLAIM SENT TYPE | Paper (checkbox) | **checked** | `claim_sent_types.paper` | enum_multi | - | `true` | replicated | - |
| OTHER OPTIONS | Current (checkbox) | **checked** | `aging_buckets.current` | enum_multi | - | `true` | replicated | Aging bucket of the claim, always a predicate (filter_card 2.5): the claim is listed when its age bucket (report_date - age_date_sent) is ticked, whatever its amount (a 0.00-estimate claim is listed with zero buckets, documented). Current = 0-30 days. Bucket columns carry expected_amount (legacy Est. Ins) by default, outstanding_amount with the enhancement aged_amount_basis = remaining. The age basis (sent date or date of service) and that the boxes select claims rather than columns are inferred - confirm on the live tool. |
| OTHER OPTIONS | Over 30 (checkbox) | **checked** | `aging_buckets.over_30` | enum_multi | - | `true` | replicated | Aging bucket Over 30 (31-60 days from age_date_sent to report_date); predicate as for Current. Age basis unverified. |
| OTHER OPTIONS | Over 60 (checkbox) | **checked** | `aging_buckets.over_60` | enum_multi | - | `true` | replicated | Aging bucket Over 60 (61-90 days); predicate as for Current. Age basis unverified. |
| OTHER OPTIONS | Over 90 (checkbox) | **checked** | `aging_buckets.over_90` | enum_multi | - | `true` | replicated | Aging bucket Over 90 (91-120 days); predicate as for Current. Age basis unverified. |
| OTHER OPTIONS | Over 120 (checkbox) | **checked** | `aging_buckets.over_120` | enum_multi | - | `true` | replicated | Aging bucket Over 120 (more than 120 days); predicate as for Current. The Excel output keeps Over120 as its last bucket (the over_120_plus split belongs to the two Aging reports only). Age basis unverified. |
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. role query on this report: group_by depends on it (rule d01). Excel = flat one row per claim with the columns of the legacy Excel layout (Office ... Claim Note); not the legacy merged layout. |
| GROUP BY | (no label) (radio_group) | **None** / Provider | `group_by` | enum | None -> `none`, Provider -> `provider` | `none` | replicated | Enabled when: output_format != xlsx. Vendor screenshot: both radios are greyed on Outstanding Claims when PRINT FORMAT = Excel. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| CREATE TASK | Bulk action create_tasks (kind create_task, scope bulk, entity claim, id_column claim_id): after a confirmation that states the number of claims of the run, writes one follow-up per claim of the snapshot, typed outstanding_claim (claim_kind = claims) or outstanding_pre_auth (claim_kind = pre_authorization); the follow-up closes itself when the claim's status_class becomes paid, closed, denied, void or deleted. Idempotent per (run_id, action_key, claim_id). Store: worklist_followups of 06 section 6.7 (DASH-28), dispatch ENG-49, authorisation SEC-36, all P3 in their owning documents: RPT-INS-07 raises a cross-document re-phase request to 02 / 06 / 08 for the snapshot bulk dispatch, the minimal follow-up store and the action authorisation in P2 (blocking dependency). If the request is refused, CREATE TASK ships in P3 and is listed as a known P2 parity gap. Feature right of the task store, not the report right. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| PRINT FORMAT = Excel | Both GROUP BY radios (None / Provider) are greyed out; the Excel output is a flat workbook. | group_by has enabled_when ["not_in", "output_format", ["xlsx", "csv"]] (documented for Excel; csv, added as an enhancement, behaves like xlsx): with output_format = xlsx or csv both options are greyed and the value is replaced by disabled_value none, so the workbook is the flat one-row-per-claim sheet. output_format is declared with role query on this report (04 section 8), so switching PDF / Excel re-runs the report instead of re-rendering the snapshot. |
<!-- PARITY:insurance_reports.r08:END -->

| Legacy option | Effect on the result |
|---|---|
| CLAIM/PRE-AUTH `Claims` (default) | `NOT is_preauth`; title `Outstanding Claims` |
| CLAIM/PRE-AUTH `Pre-Authorization` | `is_preauth` with `status_class = 'sent'`; title `Outstanding Pre-Authorizations` (proposal; legacy title unseen); the former `Pre-Auth Outstanding Claims`. Money never combined with claims |
| CLAIM TYPE `Both` (default) / `Dental` / `Medical` | No predicate, `Dental Claims` then `Medical Claims` band / `category = 'dental'` / `'medical'` (meaning inferred, family question 3) |
| OFFICE/GROUP `Office` (default) + picker (working office) / `Office Group` + picker | Claim office `rpt_claim_facts.office_id` in the resolved set; `Office :` band per office; Excel `Office` column |
| PROVIDER `ALL` (default) / a selection | No predicate / `coalesce(treating_provider_id, billing_provider_id) IN (...)`; footer `Providers` |
| REPORT DATE (today) | As of the end of that office-local day: population and amounts as of the date, age = `report_date - age_date_sent`. Today: `rpt_claim_facts`. A past date: `rpt_claim_facts_as_of()` (DATA-31); until it exists a past date is refused with 422 `as_of_unavailable` (NEW code, owner 02) and the notice `outstanding_as_of_today_only`. A future date shifts the ageing only (proposal) |
| CLAIM AMOUNT OVER OR EQUAL TO (0.00) | `billed_amount >= value` (`Claim $`); footer `Claim Amt Over/Equal` |
| CARRIER `ALL` (default) / a selection | No predicate / claim carrier `IN (...)`; footer `Carriers` |
| CLAIM SENT TYPE `EClaim` + `Paper` (both ticked, default) | Full selection: no predicate (claims without a recorded channel kept); footer `Claim Sent Type : EClaim and Paper` |
| CLAIM SENT TYPE one box | `sent_method IN (...)`; claims without a channel dropped; meaningful only with DATA-21 (SCHEMA(21)), notice `claim_channel_not_recorded` before |
| OTHER OPTIONS `Current`, `Over 30`, `Over 60`, `Over 90`, `Over 120` (all ticked, default) | Always a predicate on the claim's age bucket: `current` 0-30 days, `over_30` 31-60, `over_60` 61-90, `over_90` 91-120, `over_120` more than 120, from `age_date_sent` to `report_date`. A claim is listed when its bucket is ticked, whatever its amount (a 0.00-estimate claim of a ticked bucket is listed with zeros). Unticked buckets also print as empty columns (proposal) |
| PRINT FORMAT `PDF` (default) | Banded PDF layout above; `role: query` on this report |
| PRINT FORMAT `Excel` | Flat 25-column workbook; GROUP BY greyed and forced to `none` (rule d01); `csv` behaves like `xlsx` |
| GROUP BY `None` (default) | Category band -> carrier band only |
| GROUP BY `Provider` | Outer provider level `Provider : <name>` above the carrier band, with `Total for provider - <name> [ n ] :` (level position inferred); legacy alias `Outstanding Claim Report for Provider` |
| CREATE TASK (footer action) | Bulk action `create_tasks` of RPT-INS-07 over the run's snapshot (confirmation states the claim count; one follow-up per claim, type `outstanding_claim` or `outstanding_pre_auth`) |
| Population rule (no control) | `status_class IN ('sent', 'partially_paid')` and `outstanding_quality <> 'unknown'`; `void`, `deleted` never listed; rows with `outstanding_quality = 'unknown'` counted in the notice `claims_unconfirmed_excluded` (header quality caveats) |

Dependency rules: `group_by` `enabled_when ["not_in", "output_format", ["xlsx", "csv"]]`, `disabled_value none`
(documented for Excel, rule d01; `csv` follows `xlsx`).

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `aged_amount_basis` | NEW `enum` `estimate` / `remaining` (owner 04) | `estimate` (legacy) | `remaining`: bucket columns and `Total` carry `outstanding_amount` (estimate less insurance received); reconciles with `outstanding_claims_amount` | Research section 9: "billed vs estimated toggle"; partial payments make the two differ |
| `include_unconfirmed_claims` | NEW `boolean` (owner 04) | `false` | Lists the `outstanding_quality = 'unknown'` migrated claims flagged `Unconfirmed`, excluded from every total | Migration clean-up list until REPAIR(32) |
| `coverage_orders` | `enum_multi` (shared 2.5) | all ticked | Primary only / secondary only | Secondary claims are the ones most often forgotten |
| `sort_by` | `enum` (shared 3.9) | `claim_sent_date` | `claim_sent_date` (oldest first), `patient_last_name`, `est_ins_desc`, `age_desc` | Legacy row order unknown |
| `page_break_by` | `enum` (shared 3.9) member `group` | `none` | New page per provider (with GROUP BY) or per carrier | Carrier-per-page printouts for phone follow-up |
| Columns `days_outstanding`, `last_payment_date`, `submission_count`, `sent_method`, `last_follow_up` | columns, `default_visible: false` | - | Age in days, last insurance payment, re-submissions, channel, latest follow-up outcome (DASH-28) | Research section 9: "last follow-up status inline" |
| Saved views (header) | saved views | - | `Outstanding Claims - Excel`, `Outstanding Claim Report for Provider`, `Pre-Auth Outstanding Claims` | - |
| Saved view "Over 90 days" | saved view | - | `aging_buckets = [over_90, over_120]`, `sort_by = est_ins_desc` | Month-end escalation list |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_claim_facts` (today) / `rpt_claim_facts_as_of()` (past date, DATA-31), `rpt_patient_dim`, `rpt_user_dim` (`Created By`), `rpt_provider_dim`, `rpt_office_dim`; `worklist_followups` passthrough (DASH-28) for `last_follow_up` |
| Columns used | `claim_id`, `claim_number`, `claim_family_no`, `patient_id`, `office_id`, `carrier_id`, `carrier_name`, `carrier_phone`, `tier`, `category`, `is_preauth`, `status_class`, `submitted_date`, `age_date_sent`, `service_from`, `last_payment_date`, `created_by_user_id`, `treating_provider_id`, `billing_provider_id`, `billed_amount`, `ucr_amount`, `expected_amount`, `expected_basis`, `paid_amount`, `outstanding_amount`, `outstanding_quality`, `sent_method`, `submission_count`, `subscriber_name`, `subscriber_dob`, `sub_member_id`, `group_number`, `claim_note`; patient `first_name`, `last_name`, `dob`, `chart_no` |
| Family amounts | `Claim $` and `UCR` add a claim family once per carrier band in carrier subtotals and once overall in the category, office and grand totals (`billed_amount_band_once` / `billed_amount_once` and NEW `ucr_amount_band_once` / `ucr_amount_once`, rule of Claims List); `Est. Ins`, `Recv Amt`, buckets per tier, additive |
| Bucket amount | default `aged_amount_basis = estimate`: `expected_amount` (legacy, documented); `remaining`: `outstanding_amount`. The data card 2.20 consumer rule ("the bucket columns carry `outstanding_amount`") needs the amendment "bucket columns carry `expected_amount` (legacy) or `outstanding_amount` (remaining basis)": NEW item for 03 |
| `Est. Ins` | `expected_amount`; rows with `expected_basis <> 'estimate'` flagged and counted in the notice `estimate_basis_billed` (header quality caveats); `none` prints 0.00 and stays listed |
| `Recv Amt` | `paid_amount` (insurance received so far on the claim, as of the report date) |
| Date basis | `report_date` as of; ageing on `age_date_sent` (header) |
| Office attribution | claim office |
| Provider attribution | claim provider: treating, else billing (06 section 6.7) |
| Coverage rating | **REPAIR(32)** (coverage matrix #37): a migrated claim counts only while submitted or pending, and closed claims may sit in `draft` until the legacy codes are confirmed; estimate on history REPAIR(10); past Report Date SCHEMA(31), exact only from the start of DATA-25 capture |
| Availability entries | `outstanding_as_of_today_only` (before DATA-31), `claim_status_current_basis` (past date before DATA-25 capture: `status_basis = 'current'`), `claims_unconfirmed_excluded`, `claim_channel_not_recorded` (one sent-type box before DATA-21), `estimate_basis_billed` |
| Not reproducible | the outstanding list of a past date before claim status history exists; `Created By` of migrated claims (blank); estimates of migrated secondary claims (`expected_basis = 'none'`) |

### Output

Report format: one (`standard`), two output shapes chosen by `output_format` (role `query`).

Block `claims` (table, `row_id_column = claim_id`). Levels (PDF and screen): office band (`multi_office`) -> [provider
`Provider : {provider_name}`, subtotal `Total for provider - {provider_name} [ {row_count} ] :`, when `group_by =
provider`] -> category `Dental Claims` / `Medical Claims` (subtotal `Total {category_label} Claims [ {row_count} ] :`) -> carrier
`Carrier : {carrier_name}   Ph : {carrier_phone}`, subtotal `Total for {carrier_name} [ {row_count} ] :`; grand total
`Grand Total [ {row_count} ] :`. With `xlsx` / `csv` the levels are dropped and every row carries the band values.

| key | label | type | data_class | total / subtotal rule | PDF / XLSX |
|---|---|---|---|---|---|
| `office_id`, `carrier_id`, `category` | - | id / enum, hidden | aggregate | group keys | - |
| `provider_group_id` | - | id, hidden | provider_comp | group key when `group_by = provider` | - |
| `claim_id`, `patient_id` | - | id, hidden | phi_identified | row id, drill keys | - |
| `office_name` | Office | text | aggregate | none | XLSX col 1 |
| `carrier_name` | Carrier Name | text | aggregate | none | band / XLSX col 2 |
| `carrier_phone` | Carrier Phone | text | aggregate | none | band / XLSX col 3 |
| `provider_name` | Provider | text | aggregate | none | band when grouped / XLSX col 4 |
| `patient_name` | Patient | text | phi_identified | key column; `count` | PDF `Patient Name / DOB` line 1 / XLSX col 5 |
| `patient_ref` | Pat ID | text (`rpt_patient_dim.patient_id`; `chart_no` if the live tool prints the chart, open question 9) | phi_identified | none | XLSX col 6 |
| `patient_dob` | Pat DOB | date | phi_identified | none | PDF line 2 / XLSX col 7 |
| `subscriber_name` | Subscriber | text | phi_identified | none | PDF `Subscriber Name / DOB` line 1 / XLSX col 8 |
| `subscriber_dob` | Sub DOB | date | phi_sensitive | none | PDF line 2 / XLSX col 9 |
| `sub_member_id` | Sub ID | text | phi_sensitive | none | PDF `Sub ID:` sub-line / XLSX col 10 |
| `group_number` | Group # | text | phi_sensitive | none | PDF `Group:` sub-line / XLSX col 11 |
| `service_from` | DOS | date | phi_identified | none | PDF `Claim Sent / DOS` line 2 / XLSX col 12 |
| `claim_sent_date` | Claim Sent | date (`age_date_sent`) | phi_identified | none | PDF line 1 / XLSX col 13 |
| `chart_no` | Chart # | text | phi_identified | none | PDF only |
| `claim_number` | Claim # | text, drill `claim_record` | phi_identified | none | both, XLSX col 14 |
| `tier_letter` | Ty | text | aggregate | none | PDF only (`P`, `S`, `T`) |
| `ucr_amount` | UCR | money | financial_patient | sum of `ucr_amount_once` | both, XLSX col 15 |
| `claim_amount` | Claim $ | money | financial_patient | sum of `billed_amount_once` | both, XLSX col 16 |
| `est_ins` | Est. Ins | money | financial_patient | sum | both, XLSX col 17 |
| `recv_amt` | Recv Amt | money | financial_patient | sum | XLSX col 18 (screen `default_visible: false`) |
| `aged_current` | Curr | money | financial_patient | sum | both, XLSX col 19 |
| `aged_over_30` | Over30 | money | financial_patient | sum | both, XLSX col 20 |
| `aged_over_60` | Over 60 | money | financial_patient | sum | both, XLSX col 21 (`Over60`) |
| `aged_over_90` | Over 90 | money | financial_patient | sum | both, XLSX col 22 (`Over90`) |
| `aged_over_120` | Over 120 | money | financial_patient | sum | both, XLSX col 23 (`Over120`) |
| `aged_total` | Total | money | financial_patient | sum (= sum of the five buckets) | both, XLSX col 24 |
| `claim_note` | Claim Note | text | phi_identified | none (free text) | XLSX col 25 |
| `created_by` | Created By | text | aggregate | none | PDF sub-line at the right |
| `quality_flag` | Unconfirmed / Est. basis | enum | aggregate | count | screen and XLSX when flagged rows exist |

Bucket rule: each claim's aged amount (`est_ins`, or `outstanding_amount` with `aged_amount_basis = remaining`) is put in
exactly one bucket column by age; the other four are 0.00. Sort: `sort_by` inside the carrier band; tie-breaker
`claim_id`. Page break: office band; `page_break_by = group`. Summary cards: `Outstanding` (grand `aged_total`), `Claims`
(count), `Over 90 %` (`(aged_over_90 + aged_over_120) / aged_total`), `Oldest (days)`. `reconciles_with`: count =
`outstanding_claims_count`; `Over 90 %` = `claims_over_90_pct`; grand `aged_total` with `aged_amount_basis = remaining`
= `outstanding_claims_amount` (all tiers, default criteria, report date today) - with the default `estimate` basis the
two are equal only when no listed claim carries a payment (open question 1). `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Stacked horizontal bars: `aged_total` per carrier (top 10, rest as `Other`), segments by bucket |
| Carrier bar or carrier subtotal | `kind rows` filtered to the carrier |
| Bucket cell of a subtotal | `kind rows` filtered to the carrier and bucket |
| `Claim #` | `claim_record` (`route_key claim_detail`, `right_code transactions_insurance_claims_details_view_only`) |
| `Patient` | patient shell (`route_key patient_overview`), `phi_identified` |
| Carrier band label | `kind report` `dashboards.insurance_rcm` filtered to the carrier (carrier scorecard: days to pay, denial rate) |
| Summary card `Outstanding` | P3: `kind report` `worklists.outstanding_claims` with the same `office_scope`, `carrier_ids`, `claim_kind` (06 serves it from P3); P2: `kind rows` of this run |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| CREATE TASK (`create_tasks`, legacy footer button) | bulk (`all` or selection) | `create_task` into `worklist_followups` (DASH-28) through ENG-49, authorised by SEC-36 | task feature right (RPT-INS-07) | P2 only if the cross-document re-phase request of RPT-INS-07 to 02 / 06 / 08 is accepted (blocking dependency); otherwise P3 and a known P2 parity gap (family question 6) |
| Open claim (resubmit, close, mark denied there) | row | drill `claim_record` | claim screen right | P2 |
| Claim status history | row | `navigate` `GET /insurance-claims/{claim_id}/status-history` view in the claim screen | claim screen right | P2 |
| Log carrier contact | row | `custom:log_outcome` (06 section 6.7) | `worklists_followup_manage` | P3 (DASH-28) |
| Export selection | bulk | `export_selection` (P2: whole-run export through `output_format`) | `reports_export_data_files` | P3 (ENG-49, SEC-36) |

Doubles as a worklist: yes for printing and task creation; the live queue is `worklists.outstanding_claims` (06 section
6.7, DASH-35).

### Export and print

| Output | Rule |
|---|---|
| PDF | Report-specific layout key `outstanding_claims` on the banded renderer: landscape, two-line stacked cells (`Claim Sent / DOS`, `Patient Name / DOB`, `Subscriber Name / DOB`), sub-lines `Group:`, `Sub ID:`, `Created By:` (NEW renderer feature `sub_lines`, owner 02), category, carrier and provider bands, footer echo with the age basis `Aged from: Date Sent` |
| XLSX | One sheet, the legacy 25 columns in legacy order with typed cells (dates as dates, money as numbers), frozen header, autofilter; organisation, user and title on the criteria sheet; no grand-total row in the data sheet (totals on the criteria sheet) |
| CSV | The same 25 columns |
| Background | `escalate_when` all offices or more than 5 offices (header); a month-end schedule preset (header) |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | On a partially paid claim, does `Total` / the buckets carry `Est. Ins` or the remaining estimate (`Est. Ins - Recv Amt`)? The sample shows only unpaid claims | `Est. Ins` (documented sample); `aged_amount_basis = remaining` as the enhancement, which reconciles with `outstanding_claims_amount` |
| 2 | Age basis: date sent or date of service? | Date sent |
| 3 | Does a past Report Date reconstruct the list as of that day or only shift the ageing? | Reconstruct (DATA-31); refused until then |
| 4 | Are carrier and grand totals printed? Is there a `Medical Claims` band? | Both printed; band per category |
| 5 | Position of the provider level with GROUP BY Provider (outside or inside the carrier band) | Outside |
| 6 | Printed title for `Pre-Authorization` | `Outstanding Pre-Authorizations` |
| 7 | Do `Current` .. `Over 120` select claims at all (inferred), and do unticked buckets drop their columns or only their claims? | They filter claims by age bucket; columns stay |
| 8 | Is a sent claim with no sent date (`age_date_sent` NULL) listed, and in which bucket? | Listed in `Current`, flagged |
| 9 | Excel `Pat ID`: patient id or chart number? | Patient id (`rpt_patient_dim.patient_id`) |

## Claims Not Created - `insurance.claims_not_created`

Insurance Reports, screenshot 9.PNG - P2 - M - `reports_insurance_reports_screen_view_only` (family `insurance`) - interactive (background with `date_basis = all`) - PARTIALLY DOCUMENTED; layout INFERRED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Billing staff, front office | End of day, for today's date of service; or once per day of service at the end of the week (vendor cadence `[D]` `[R11]` `[R12]` `[R21]`) | Find posted procedures that should be on a claim but are not, per coverage tier, so the claims get created and sent the same day |
| Billing lead | Weekly, `ALL` | Standing check that no procedure stays unbilled, including held procedures and secondary claims that were never created after the primary closed |

Funnel position: after Unbilled Report Due to No Insurance and Procedures on Hold, before Claims Created Not Sent
(research section 1 item 2). Held procedures (`Hold Claim` ticked) appear here too `[D]` `[R11]`.

### Legacy output

Confidence: purpose, cadence and the held-procedure rule **PARTIALLY DOCUMENTED**; layout **INFERRED** (basis: Open
Dental `Procedures Not Billed to Insurance` `[X2]`, Dentrix `Procedures Not Attached to Insurance` and `Secondary Ins
Claims Not Created` `[X14]`).

| Element | Content (proposal) | Basis |
|---|---|---|
| Printed title | `Claims Not Created` (menu name; not seen) | header page furniture |
| Office band | `Office : <name>` | family furniture |
| Coverage band | `Primary` / `Secondary` / `Tertiary` / `Quaternary` (one per ticked CLAIM TYPE box) | the CLAIM TYPE ticks fold the tier cases into one report `[C]` `[I]` |
| Columns, in order | `Patient` - `Chart #` - `DOS` - `Tran Date` - `Code` - `Description` - `Th` - `Surf` - `Provider` - `Fee` - `Est. Ins` - `Bill` - `Ty` - `Carrier` | research reconstruction |
| Subtotals | Per coverage band: count, `Fee`, `Est. Ins` | proposal |
| Grand total | Count, `Fee`, `Est. Ins` | proposal |
| Footer echo | `Report Date : ALL` or `DOS Date : <date>` / `Transaction Date : <date>`, `Offices`, `Claim Type : Primary, Secondary, Tertiary, Quaternary`, title, `Printed`, `Page` | family furniture |

`Bill` prints the legacy billing value: `D` (one plan), `DD` (primary and secondary), `DDD`, red `H` when held `[D]`
`[R2]` `[R11]`. Money positive. Rule kept from the legacy tool: a secondary line exists only when the procedure carries
`DD` and the primary claim is closed `[D]` `[R19]`, so one procedure appears in at most one band (the primary band needs
no primary claim, the secondary band needs a closed one).

### Parameters - legacy parity

<!-- PARITY:insurance_reports.r09:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office or Office Group, both enabled on this screen (nothing greyed). Office: one or more offices the caller may read, default the working office; Office Group: groups from Setup > Office Groups, default ALL. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group); both enabled on this screen. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| REPORT DATE | (no label) (radio_group) | **ALL** / DOS Date / Transaction Date | `date_basis` | enum | ALL -> `all`, DOS Date -> `service_date`, Transaction Date -> `transaction_date` | `all` | replicated | Chooses the column of the single Report Date: ALL = no date restriction (every unclaimed procedure) and disables report_date; DOS Date = service_date; Transaction Date = transaction_date. Single-day use is documented; that the radio decides the compared column is our transcription. service_date and transaction_date select the same rows until DATA-13 stores a separate ledger date on charges; the report prints that. |
| REPORT DATE | Report Date (date_input) | shown: 11/21/2026 - greyed out | `report_date` | date | - | `today` | replicated_enhanced | Enabled when: date_basis != all (inferred). Single date, role single_day: rows whose date_basis column equals report_date. Greyed while date_basis = all (enabled_when inferred from the screenshot). Default today in the office time zone; enhanced with presets and relative tokens. |
| CLAIM TYPE | Primary (checkbox) | **checked** | `coverage_orders.primary` | enum_multi | - | `true` | replicated | On Claims Not Created the CLAIM TYPE title means coverage order, not dental / medical. |
| CLAIM TYPE | Secondary (checkbox) | **checked** | `coverage_orders.secondary` | enum_multi | - | `true` | replicated | On Claims Not Created the CLAIM TYPE title means coverage order, not dental / medical. |
| CLAIM TYPE | Tertiary (checkbox) | **checked** | `coverage_orders.tertiary` | enum_multi | - | `true` | replicated | On Claims Not Created the CLAIM TYPE title means coverage order, not dental / medical. |
| CLAIM TYPE | Quaternary (checkbox) | **checked** | `coverage_orders.quaternary` | enum_multi | - | `true` | replicated | On Claims Not Created the CLAIM TYPE title means coverage order. No quaternary coverage slot exists in DentC, so this tick adds no rows; it stays for parity. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:insurance_reports.r09:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Rows unchanged; Excel = flat sheet; `csv` added |
| OFFICE/GROUP `Office` (default) + picker (working office) / `Office Group` + picker | Office of service `rpt_unclaimed_charge_tiers.office_id` in the resolved set; band per office |
| REPORT DATE radio `ALL` (default) | No date predicate: every unclaimed billable procedure; `report_date` greyed (`enabled_when date_basis != all`) and ignored |
| REPORT DATE radio `DOS Date` | `service_date = report_date` (single day) |
| REPORT DATE radio `Transaction Date` | `transaction_date = report_date` (single day); equals `service_date` until DATA-13, so both options select the same rows and the notice `transaction_date_equals_service_date` is printed (SCHEMA(13)) |
| Report Date (today, greyed under ALL) | The single day, office-local; enabled under DOS Date / Transaction Date |
| CLAIM TYPE `Primary` (ticked) | Tier `primary` lines: billable charge (`bill_tier <> 'none'`) of a patient with a primary dental slot today and no primary claim (`NOT has_claim`) |
| CLAIM TYPE `Secondary` (ticked) | Tier `secondary` lines: additionally `is_primary_closed` and `bill_tier IN ('secondary', 'tertiary')` |
| CLAIM TYPE `Tertiary` (ticked) | Tier `tertiary` lines: additionally `is_primary_closed` and `bill_tier = 'tertiary'` (proposal: the secondary claim closed is not required, data card rule names only the primary) |
| CLAIM TYPE `Quaternary` (ticked) | No quaternary slot exists in DentC: adds no rows, no error (kept for parity) |
| CLAIM TYPE all four ticked (default) | Full selection = `no_predicate` on the tier (filter card 2.5); at least one box required |
| Population rule (no control) | `rpt_unclaimed_charge_tiers WHERE NOT has_claim` (`is_production`, `bill_tier <> 'none'`, dental slots); held procedures included (`hold_claim`, Bill `H`); live charges only |

Dependency rules: `report_date` `enabled_when ["ne", "date_basis", "all"]` (inferred from the greyed capture),
`disabled_value today`.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `date_preset` for `report_date` with a range mode | NEW `date_range` `unclaimed_service_range` (`unclaimed_service_range_from` / `_to`, owner 04), `visible_when date_basis != all` | absent (single day) | A week of service days in one run instead of one run per day (vendor end-of-week routine) | The single-day legacy form stays the default |
| `service_date_floor` | NEW `date` (owner 04) | none | With `ALL`: ignores procedures served before the date (e.g. the go-live date) | Keeps the `ALL` run to actionable work |
| `provider_ids` | `entity_multi` (shared 3.2), `provider_role = treating` | `all` | `rpt_charges.provider_id IN (...)` | - |
| `carrier_ids` | `entity_multi` (shared 3.5) | `all` | Carrier of the slot of the tier line | - |
| `include_held` | NEW `boolean` (owner 04) | `true` (legacy) | `false` drops held procedures (they are on Procedures on Hold) | - |
| `group_by` | `enum` (shared 3.9) `none` / `provider` / `carrier` / NEW `patient` | `none` | Level inside the coverage band with subtotals | One claim per patient and visit is how claims are made |
| `sort_by` | `enum` (shared 3.9) | `patient_last_name` | `patient_last_name`, `service_date` (oldest first), `fee_desc` | Legacy order unknown |
| Column `days_since_service` | column, hidden (`default_visible: false`) | - | `local_today - service_date`; red when over the carrier's timely-filing limit | Filing limit per carrier is NEW (not stored), owner 03; until then the NEW organisation setting `claim_timely_filing_days` (default 90, owner 05 settings) |
| Saved view "Today's services" | saved view | - | `date_basis = service_date`, `report_date = today` | End-of-day run |
| Saved view "Secondary claims to create" | saved view | - | `coverage_orders = [secondary]` | Primary EOB posted, secondary never created |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_unclaimed_charge_tiers`, `rpt_charges` (description, tooth, surface, `era`, `created_date`), `rpt_insurance_coverage` (carrier name and phone of the tier slot), `rpt_patient_dim`, `rpt_procedure_code_dim`, `rpt_provider_dim` |
| Columns used | `charge_id`, `patient_id`, `office_id`, `provider_id`, `service_date`, `transaction_date`, `procedure_code`, `charged_fee`, `bill_tier`, `bill_tier_source`, `hold_claim`, `tier`, `ins_plan_id`, `carrier_id`, `est_for_tier`, `has_claim`, `tier_claim_id`, `is_primary_closed`; charges: `tooth`, `surface`, `era`; code: `description` |
| Date basis | `all` / `service_date` / `transaction_date`, single day (header) |
| Office attribution | office of service |
| Provider attribution | treating provider (`rpt_charges.provider_id`) |
| Coverage rating | **APP** (coverage matrix #38): the bill tier of app charges is derived until SCHEMA(33); history needs REPAIR(10) for claim links (migrated `claim_id` is NULL until check #3 of 03 section 6) and REPAIR(12) for the `DD` / `DDD` depth; DOS vs Transaction date SCHEMA(13); coverage is today's |
| Migrated rows | until DATA-10 check #3 has run for the tenant, migrated charges carry no claim link and would all read "not created": the builder adds `era = 'app'` and prints notice `migrated_claim_links_missing`; after the check, migrated charges are included. Until DATA-12 every migrated `D...` billing order is `primary`, so no migrated charge reaches the secondary or tertiary band (notice `bill_depth_lost`) |
| Coverage today | a patient insured today but not on the service date is listed; a patient whose plan ended is not (slots have no dates, data card 2.21); notice `coverage_is_current` |
| Availability entries | `derived_bill_tier` (before DATA-33), `transaction_date_equals_service_date` (before DATA-13), `migrated_claim_links_missing`, `bill_depth_lost`, `coverage_is_current` |
| Not reproducible | what was unclaimed on a past day (no claim status or coverage history); the billing depth of migrated charges before DATA-12; the tertiary estimate: `est_for_tier` is 0 for any tier other than primary and secondary (no tertiary estimate stored), so tertiary lines print `Est. Ins` 0.00 until NEW `rpt_charges.est_ins_tertiary` (owner 03) |

### Output

Report format: one (`standard`). Block `unclaimed` (table, `row_id_column = row_key` = `charge_id:tier`). Levels: office
band (`multi_office`) -> coverage `{tier_label} Claims Not Created`, subtotal `Total {tier_label} [ {row_count} ] :` ->
[`group_by` level: provider (`provider_comp` key), carrier `Carrier : {carrier_name}   Ph : {carrier_phone}`, or patient
`{patient_name}`, each with subtotal]; grand total `Grand Total [ {row_count} ] :`.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id`, `tier`, `carrier_id` | - | id / enum, hidden | aggregate | group keys |
| `provider_group_id` | - | id, hidden | provider_comp | group key when `group_by = provider` |
| `row_key`, `charge_id`, `patient_id` | - | id, hidden | phi_identified | row id, drill keys (`group_by = patient` key, rule 7) |
| `patient_name` | Patient | text | phi_identified | key column; `count` |
| `chart_no` | Chart # | text | phi_identified | none |
| `service_date` | DOS | date | phi_identified | none |
| `transaction_date` | Tran Date | date | phi_identified | none (legacy proposal column) |
| `procedure_code` | Code | text | phi_identified | none |
| `description` | Description | text | aggregate | none |
| `tooth`, `surface` | Th, Surf | text | phi_identified | none |
| `provider_name` | Provider | text | aggregate | none |
| `fee` | Fee | money (`charged_fee`) | financial_patient | sum |
| `est_ins` | Est. Ins | money (`est_for_tier`; 0.00 on tertiary lines) | financial_patient | sum |
| `bill_value` | Bill | text (`D`, `DD`, `DDD`, `H`) | aggregate | count of `H` |
| `tier_letter` | Ty | text | aggregate | none |
| `carrier_name` | Carrier | text | aggregate | none |
| `days_since_service` | Days | integer, `default_visible: false` | aggregate | `max` per band |
| `bill_tier_source` | Bill Source | enum, `default_visible: false` (`stored`, `derived`) | aggregate | count of `derived` |

Sort: `sort_by` inside the innermost level; tie-breaker `row_key`. Page break: office band; `page_break_by = group`.
Summary cards: `Unbilled (primary)` (primary band `fee`), `Procedures`, `Held`, `Oldest (days)`. `reconciles_with`:
primary-band `fee` total = `unbilled_production_amount` (header, MET-11) for `date_basis = all` and `service_date` runs.
Because a charge appears in at most one band, the grand `Fee` total is not double-counted. `empty_when`: `no_detail_rows`.

### Visuals and drill-through

| Element | Target |
|---|---|
| Chart | Bars of `fee` by `days_since_service` band (`0-1`, `2-7`, `8-30`, `31-90`, `over 90`), stacked by tier |
| Age bar | `kind rows` filtered to the band |
| Row | `kind record`, entity charge, `route_key patient_ledger` (charge highlighted), `right_code transactions_patient_ledger_screen_full_control` |
| `Patient` | patient shell (`route_key patient_overview`), `phi_identified` |
| `Bill` = `H` | `kind report` `insurance.procedures_on_hold` with the same `office_scope` (funnel link) |
| Footer link "Next stage" | `kind report` `insurance.claims_created_not_sent` with the same `office_scope` (header funnel links) |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Open ledger (create the claim there) | row | drill `patient_ledger` | ledger screen right | P2 |
| Create claim for the patient's lines of the day | row and bulk | `custom:create_claim` -> claim creation of the billing service with the snapshot's charge ids of one patient, tier and service date | claim screen full-control right | P3 (ENG-49) |
| Release hold | bulk | `custom:release_hold` (RPT-INS-19) | transaction-entry right | P3 |
| Export selection | bulk | `export_selection` (P2: whole-run export through `output_format`) | `reports_export_data_files` | P3 (ENG-49, SEC-36) |

Doubles as a worklist: the live queue is stage `not_created` of `worklists.unbilled_procedures` (06); the report stays the
end-of-day printout.

### Export and print

| Output | Rule |
|---|---|
| PDF | `banded_table`, landscape (14 columns), office, coverage and optional group bands, `Bill = H` printed red, footer echo as Legacy output |
| XLSX | Sheet `unclaimed`: flat typed rows with `Office`, `Office Name`, `Coverage`, `Carrier Phone`, `Bill Source`; criteria sheet |
| CSV | Main block |
| Background | `escalate_when date_basis = all` (header); single-day runs inline |

### Open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Column list, grouping, totals and printed title (no vendor source) | Proposal of Legacy output |
| 2 | Under `ALL`, is there an implicit age cut-off (e.g. only the last year)? | None (enhancement `service_date_floor`) |
| 3 | Tertiary line rule: is the secondary claim's closure also required? | Primary closed only |
| 4 | Are non-dental (medical) claims considered? | Dental slots only (data card view) |
| 5 | Are procedures with a zero fee or a non-billable code listed? | `is_production` charges only, zero fee included |
| 6 | Are DOS Date and Transaction Date single days in the legacy tool, or ranges ending on the date? | Single day (supplement correction, single-day use documented) |
| 7 | Do the CLAIM TYPE boxes Primary .. Quaternary choose the coverage levels whose missing claims are listed (inferred)? | Yes |
| 8 | Does the REPORT DATE radio (DOS Date / Transaction Date) choose the compared column (our transcription of the screen)? | Yes |

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

<!-- PARITY:insurance_reports.r10:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office or Office Group, both enabled on this screen (nothing greyed). Office: one or more offices the caller may read, default the working office; Office Group: groups from Setup > Office Groups, default ALL. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group); both enabled on this screen. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Fixed date_basis = service_date of the procedure (inferred, 04 section 7.2 row 17; basis not documented - FLT-23). Population: rpt_charges with bill_tier = none, no claim, patient holds an active dental slot today. Default today; enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | End of the service_date range, inclusive (basis inferred). Default today; enhanced with presets and relative tokens. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:insurance_reports.r10:END -->

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
| `carrier_ids` | `entity_multi` (shared 3.5) | `all` | Carrier of the patient's live primary dental slot today (the same carrier the `Carrier` column prints) | Lines of patients without a resolvable carrier match only under `all` |
| `coverage_effective_rule` | `enum` NEW (owner 04) | `all` | `all`; `covered_on_service_date` (slot `effective_date <= service_date` and no `term_date` before it: the claim can be billed once the order is fixed); `not_covered_on_service_date` (coverage started after the visit: probably a patient-pay line, not a billing error) | `effective_date` / `term_date` are subscriber-level, not slot history (data card 2.21: the slot has no dates of its own); blank = `unknown`, kept only under `all`; notice `coverage_is_current` |
| `include_unconfirmed_none` | `boolean` NEW (owner 04) | `true` (parity: the legacy population is every `None` line) | `false` drops lines whose `none` is not a stored billing order (`bill_tier_source` `derived` or `migrated_blank`) | Separates lines explicitly set to None from blank migrated orders and uncovered app lines (open question 6) |
| `exclude_zero_fee` | `boolean` NEW (owner 04) | `false` | Drops lines with `charged_fee = 0` (visit and Z codes that are never claimed) | Legacy behaviour for $0.00 lines unknown (open question 3) |
| `sort_by` | `enum` (shared 3.9) | `patient_name` | `patient_name` (then service date), `service_date_oldest_first`, `fee_desc` | Oldest first = filing-deadline order |
| Column `days_since_service` | column | hidden (`default_visible: false`) | `rpt_office_dim.local_today - service_date` | Filing-deadline exposure |
| Saved view "All unbilled - no billing order" | saved view | - | `date_preset = custom`, `date_from = 2000-01-01`, `date_to = today` | Weekly sweep; schedulable end of day (header cadence) |
| Saved view "Last 30 days" | saved view | - | `date_preset = last_30_days` | Relative range for the daily end-of-day schedule |

### Data

| Topic | Rule |
|---|---|
| Datasets | `rpt_charges` (rows), `rpt_insurance_coverage` (current primary dental slot: carrier, `effective_date`, `term_date`), `rpt_patient_dim` (`chart_no`, names), `rpt_procedure_code_dim` (description), `rpt_provider_dim` (short id), `rpt_office_dim` (`local_today`, band label) |
| Columns used | `charge_id`, `patient_id`, `office_id`, `provider_id`, `service_date`, `procedure_code`, `tooth`, `surface`, `quadrant`, `charged_fee`, `bill_tier`, `bill_tier_source`, `claim_id`, `era`, `is_void`, `is_archived`; coverage: `carrier_id`, `carrier_name`, `tier`, `effective_date`, `term_date` |
| Population | `NOT is_void` (archive policy of 2.0), `bill_tier = 'none'`, `claim_id IS NULL`, `EXISTS` a live `rpt_insurance_coverage` row of the patient with `category = 'dental'` (any tier), `service_date` in range, `office_id` in scope. `EXISTS`, never a join, so a patient with two slots does not double a line |
| Carrier column | always `carrier_name` / `carrier_id` of the patient's live primary dental slot today (`LEFT JOIN LATERAL ... LIMIT 1` on tier order), also after DATA-33: the population was posted before any insurance was attached, so the payer stamped at posting (`primary_carrier_id`) is NULL by definition |
| Date basis | fixed `service_date` (inferred; header date-basis table); `date_basis` printed in the criteria echo |
| Office attribution | office of service (`rpt_charges.office_id`, PD-6) |
| Provider attribution | treating provider (`rpt_charges.provider_id`) |
| Coverage rating | **READY** (coverage matrix #39) for lines whose billing order is stored: the billing order was migrated (`BILLINGORDER` -> `bill_tier`, data card 2.9). Two kinds of `none` are not a stored None (03 rule: migrated rows without a value are `none`; app rows without an estimate or `coverage_rule_id` derive `none`, e.g. non-covered codes of an insured patient): NEW `bill_tier_source` value `migrated_blank` beside `stored` / `derived` (owner 03); both kinds are listed under the parity default and flagged. App rows use the derived tier until SCHEMA(33) / DATA-33 stamps `billing_order` at posting; coverage is today's, not the coverage on the service date |
| Availability notices | `bill_tier_derived` (app-era rows on the derived rule until DATA-33), `bill_order_blank_migrated` (NEW: migrated lines with a blank billing order, counted), `coverage_is_current` (the carrier and the "has insurance" test are today's slot) |
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
| `bill_value` | Bill | enum (`None`) | phi_identified | none; enhancement, `default_visible: false` |
| `bill_tier_source` | Bill Source | enum (`stored`, `derived`, `migrated_blank`), `default_visible: false` | aggregate | count per value in the notice |
| `coverage_effective_date` | Ins. Eff. | date | phi_identified | none; enhancement, hidden by default |
| `days_since_service` | Days | integer, `default_visible: false` | phi_identified | `max` per band |

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
| Export selection | bulk | `export_selection` (P2: whole-run export through `output_format`) | `reports_export_data_files` | P3 (ENG-49, SEC-36) |

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
| 6 | Does the legacy report list lines whose billing order is blank, or only lines explicitly set to None? | Both (`include_unconfirmed_none = true`), flagged by `bill_tier_source` |

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

<!-- PARITY:insurance_reports.r11:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| 835 CLAIM MATCHING STATUS | (no label) (radio_group) | **Both** / Matched / UnMatched | `claim_matching_status` | enum | Both -> `both`, Matched -> `matched`, UnMatched -> `unmatched` | `both` | replicated | Whether the 835 claim payment was matched to a DentC claim (inferred meaning): both = no predicate. Reads era_claim_payments (DATA-38); filled only by a clearinghouse ERA integration outside this module. |
| CLAIM STATUS | (no label) (radio_group) | **ALL** / Partial Closed / Closed | `claim_status` | enum | ALL -> `all`, Partial Closed -> `partial_closed`, Closed -> `closed` | `all` | replicated | partial_closed / closed = era_claim_payments.claim_status_after, the claim state left by this 835 posting (legacy P / A, inferred); all = no predicate. Unmatched payments carry no claim_status_after and drop out of both non-ALL values. The claim's current status_class is not used (open question 3). |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office or Office Group, both enabled on this screen (nothing greyed). Office: one or more offices the caller may read, default the working office; Office Group: groups from Setup > Office Groups, default ALL. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group); both enabled on this screen. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. Unmatched 835 payments without a payee office are the Unassigned office member (header rule): the default working-office run omits them and prints their count in a notice; the NEW payee -> office mapping (RPT-INS-72) gives them an office. |
| DATE RANGE | (no label) (radio_group) | **By Payment Date** / By File Received on Date | `date_basis` | enum | By Payment Date -> `payment_date`, By File Received on Date -> `file_received_date` | `payment_date` | replicated | Basis of the range: payment_date = payment date of the 835 claim payment, file_received_date = date the 835 file was received (era_files, DATA-38). Documented: the report lists all processed payments of the range, auto-posted or not. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range; date_basis is fixed per report or chosen by the basis radio of the same section. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end. Default = today in the office time zone (relative token). Enhanced with presets and relative tokens. |
| OTHER OPTIONS | Show Details UCR (checkbox) | **checked** | `show_details_ucr` | boolean | - | `true` | replicated | Not documented (ticked by default, as captured). Mapped (unverified) as: adds the service-line block of each 835 claim payment with both the 835 charge submitted and the DentC UCR of the matched claim line (rpt_claim_lines.office_fee); does not change the claim payments listed. role query (adds a block). Confirm on the live tool. |
| CARRIER | Carriers (picker) | shown: ALL | `carrier_ids` | entity_multi | - | `all` | replicated_enhanced | Searchable multi-select; ALL = no restriction. Filters the payer of the 835 claim payment (era_claim_payments carrier). Dialog content never captured - confirm list source on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:insurance_reports.r11:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Rendering only; `csv` added |
| 835 CLAIM MATCHING STATUS `Both` (default) | No predicate on matching |
| 835 CLAIM MATCHING STATUS `Matched` | `is_matched = true` (the 835 claim payment was matched to a DentC claim; meaning inferred) |
| 835 CLAIM MATCHING STATUS `UnMatched` | `is_matched = false` (no claim found; `claim_id IS NULL`) |
| CLAIM STATUS `ALL` (default) | No predicate |
| CLAIM STATUS `Partial Closed` | Claim state left by this 835 posting = partial payment (legacy `P`): `era_claim_payments.claim_status_after = 'partial_closed'` (inferred; the claim's current status is open question 3) |
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
| `show_check_reconciliation` | `boolean` NEW (owner 04) | `false` | Adds block `check_totals`: per remittance (`era_files` row) `total_amount` of the 835 vs sum of `paid_amount` of its claim payments vs sum posted in DentC (`rpt_payments` with the same `eft_trace_number` / `check_number`, carrier and office; until DATA-33 fills `rpt_payments.carrier_id` on `patient_payments` rows the match uses the number and office only and prints notice `check_match_without_carrier`, NEW) and the difference | Deposit-level reconciliation (research section 9) |
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
| UCR block | `service_lines`: one row per 835 service line (code, DOS, charge submitted, allowed, paid) with `ucr_amount` = `rpt_claim_lines.office_fee` of the matched claim line: same `claim_family_no`, `procedure_code` and `service_date`, ties broken by the lowest `charge_id`, each charge consumed once. Tooth is not in the key: the 835 service line of the DATA-38 sketch carries no tooth (NEW `era_service_lines.tooth` only if the integration supplies one, owner 03, RPT-INS-72) |
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
| Row (posted) | `kind record`, the posted insurance payment in the patient ledger through NEW `era_claim_payments.posted_payment_entry_id` (written by the auto-post, owner 03, RPT-INS-72); until it exists the matched claim's ledger (`right_code transactions_patient_ledger_screen_full_control`) |
| Check subtotal | `kind rows` filtered to that `era_file_id` |
| Card `Unmatched` / `Not posted` | `kind rows` with `claim_matching_status = unmatched` / `posting_status = not_posted` |
| Footer link | `kind report` `insurance.835_denial_report` with `office_scope`, `carrier_ids`, `date_from`, `date_to` (span cut to 31 days) |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Open claim / open ledger | row | `navigate` | claim / ledger feature right | P2 |
| Match to claim | row | `navigate` to the integration's ERA posting screen with the 835 claim payment (owned by the integration feature, not this module) | insurance posting right | after the integration |
| Create follow-up | bulk | `create_task` per unmatched or unposted claim payment (follow-up store of DASH-28) | task feature right | P3 (ENG-49, DASH-28) |
| Export selection | bulk | `export_selection` (P2: whole-run export through `output_format`) | `reports_export_data_files` | P3 (ENG-49, SEC-36) |

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
| 7 | CARRIER dialog contents and source (inactive carriers); how an 835 payer is mapped to a DentC carrier (`era_files.carrier_id`) | All carriers of the tenant; unmapped payers match only under `all` |

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

<!-- PARITY:insurance_reports.r12:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| REPORT FORMAT | (no label) (radio_group) | **Detail** / Summary - greyed out | `report_format` | enum | Detail -> `detail`, Summary -> `summary` | `detail` | replicated | Enabled when: output_format != xlsx. Greyed on 835 Denial Report while PRINT FORMAT = Excel (vendor documentation: Excel exists only as Detail). On the Daily Production Report the Detail option alone is greyed until PRODUCTION BY = Provider (option_enabled_when). |
| PRINT FORMAT | (no label) (radio_group) | PDF / **Excel** | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `xlsx` | replicated_enhanced | Default Excel is this report's own documented opening state (vendor screenshot identical to our capture). role query on this report: report_format depends on it (rule d01). PDF = Summary or Detail layout in the viewer; Excel = flat Detail, one row per service line. Enhanced with csv (flat Detail, like Excel). |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office or Office Group, both enabled on this screen (nothing greyed). Office: one or more offices the caller may read, default the working office; Office Group: groups from Setup > Office Groups, default ALL. |
| OFFICE/GROUP | (no label) (picker) | shown: ALL | `office_scope.selection` | office_scope | - | `all` | replicated_enhanced | Default all is documented for this report (the office box opens on ALL; the vendor's screenshot shows the same); the other reports of the category open on the working office. all = every office the caller may read (filter_card 3.1), never wider than the caller's scope. |
| DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Fixed date_basis = payment_date of the 835 claim payment (inferred, 04 section 7.2 row 18). Documented limit: at most one month per run -> validation.max_span_days 31. Default today; enhanced with presets and relative tokens. |
| DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | End of the payment_date range, inclusive; the span from Start Date may not exceed 31 days (documented one-month limit). Default today; enhanced with presets and relative tokens. |
| CARRIER | Carriers (picker) | shown: ALL | `carrier_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Dialog content was never captured - confirm list source and inactive rows on the live tool. |
| EXCLUDE REASON CODE | (no label) (picker) | shown: None | `exclude_reason_codes` | entity_multi | - | `none` | replicated_enhanced | Exclude filter: None = exclude nothing; a service line that has any adjustment row with a picked reason code is removed together with its line money and all its adjustments (research reading, inferred). The NEW enhancement exclude_reason_scope = adjustment (owner 04) removes only the matching adjustment rows instead. Option source lookup:denial_reason_codes (FLT-08, P2), the 835 claim adjustment reason codes of era_adjustments (DATA-38); the legacy value list was never captured - confirm on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| PRINT FORMAT = Excel (the state the report opens in) | REPORT FORMAT is greyed with Detail marked - the Excel output exists only as Detail. With PRINT FORMAT = PDF, REPORT FORMAT can be set to Summary or Detail. | report_format has enabled_when ["not_in", "output_format", ["xlsx", "csv"]] and forced_when [{when: ["in", "output_format", ["xlsx", "csv"]], value: detail}] (documented for Excel; csv, added as an enhancement, behaves like xlsx): the report opens with output_format = xlsx (legacy default kept), so both REPORT FORMAT options are greyed with Detail marked; choosing pdf enables both options (detail / summary). A summary sent together with xlsx or csv is replaced by detail and reported in warnings[]. output_format has role query on this report. |

| Parameter rule (04_filter_framework.md) | Rule | When | Value | Evidence |
|---|---|---|---|---|
| `report_format` | forced_when | output_format == xlsx | detail | documented - Excel exists only as Detail. |
<!-- PARITY:insurance_reports.r12:END -->

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
| EXCLUDE REASON CODE (default `None`) | `none` = exclude nothing; picked codes: every service line that has an adjustment row with a picked reason code is removed with its line money and all its adjustments (research "removes lines with the picked reason codes", inferred). Enhancement `exclude_reason_scope = adjustment` removes only the matching adjustment rows. Source `lookup:denial_reason_codes` (FLT-08) |
| Population rule (no control) | Service lines of 835 claim payments that were denied or partially paid: `EXISTS` an `rpt_era_adjustments` row with `amount <> 0` after the filters (inferred definition; `paid_amount < charge_submitted` is the alternative of open question 1) |
| Tenant enablement (no control) | Report listed only when the organisation enables it: NEW definition field `availability.tenant_flag` (owner 02; catalog listing rule owner 08), not a parameter |
| CLEAR CRITERIA / PRINT / PREVIEW / ADD TO MY FAVORITES | Family footer actions; CLEAR CRITERIA returns to `xlsx`, `detail`, office `all` |

Dependency rules: d01 - `report_format` `enabled_when ["not_in", "output_format", ["xlsx", "csv"]]` and `forced_when [{when:
["in", "output_format", ["xlsx", "csv"]], value: "detail"}]` (`csv` follows `xlsx`); a `summary` sent with `xlsx` or
`csv` is replaced and reported in `warnings[]`. The form opens with Excel selected, Detail marked and both REPORT FORMAT radios greyed.

### Parameters - enhancements

| Key | Type | Default | Effect | Note |
|---|---|---|---|---|
| `exclude_reason_scope` | `enum` NEW (owner 04): `line`, `adjustment` | `line` (research reading) | `adjustment`: EXCLUDE REASON CODE removes only the adjustment rows with a picked code (reason lines, CO / PR / OA sums); service lines left with no adjustment row then drop out; line money of kept lines unchanged | Routine contractual codes removed without losing the line |
| `adjustment_group_codes` | `enum_multi` NEW (owner 04): `co`, `pr`, `oa`, `pi` | all ticked, `full_selection: no_predicate` | Keeps only adjustment rows of the ticked groups | Patient-responsibility-only or contractual-only review |
| `include_reason_codes` | `entity_multi` NEW (owner 04), source `lookup:denial_reason_codes` | `all` | Include filter on reason codes (inverse of the legacy exclude) | Both may be set; exclude wins |
| `denial_kind` | `enum` NEW (owner 04) | `both` | `both`, `denied` (line `paid_amount = 0`), `partially_paid` | Separates full denials (rework) from partial payments (fee schedule) |
| `provider_ids` | `entity_multi` (shared 3.2) | `all` | Claim provider of the matched claim | Unmatched lines only under `all` |
| `procedure_codes` | `entity_multi` (shared 3.6) | `all` | Service code of the line | Code-range extras of FLT-13 |
| `compare_to` | shared 12 (`previous_period`) | `none` | Summary format: prior-period columns `Paid Amount (prior)` and `Denied lines (prior)` per carrier | Prior window has the same span, so the 31-day rule holds for both |
| Column `denied_lines` | column (Summary) | shown | Count of lines with `paid_amount = 0` per carrier | Basis of the dashboard proxy |
| Saved view "Last month, Excel" | saved view | - | `date_preset = last_month` (resolves within 31 days) | Monthly schedule preset |
| Saved view "Full denials, PDF Detail" | saved view | - | `output_format = pdf`, `report_format = detail`, `denial_kind = denied`, `exclude_reason_codes = [45]`, `exclude_reason_scope = adjustment` | Rework list without routine contractual lines |

### Data

| Topic | Rule |
|---|---|
| Tables | `era_files`, `era_claim_payments`, `era_adjustments` (DATA-38) and NEW `era_service_lines` (RPT-INS-72) |
| Datasets | NEW `rpt_era_service_lines` (owner 03): one row per 835 service line with office (`report_office_id`), carrier, `payer_id`, `patient_id`, claim number of the matched claim, DOS, `procedure_code`, `charge_submitted`, `actual_allowed`, `paid_amount`, `pr_amount`, `co_amount`, `other_amount` (sums of its adjustments by group; `other` = OA + PI); NEW `rpt_era_adjustments`: one row per adjustment with `group_code`, `reason_code`, `remark_code`, `amount`, joined to its line. Descriptions from NEW reference table `era_reason_codes` (`code_set` = `carc` / `rarc`, `code`, `description`, `is_active`; RPT-INS-76) |
| Population | Lines of claim payments in scope (office, carrier, payment date); with `exclude_reason_scope = line` minus every line holding an adjustment with an excluded code; then `EXISTS` an adjustment row with `amount <> 0` after the include / group filters (and, with `exclude_reason_scope = adjustment`, after the exclude filter); `denial_kind` on `paid_amount` |
| Money aggregation | Line money (`charge_submitted`, `actual_allowed`, `paid_amount`) is summed on `rpt_era_service_lines` only; adjustment money (`pr_amount`, `co_amount`, `other_amount`) is summed from the kept adjustment rows. Default `line` scope: an excluded line leaves every sum with all its money; `adjustment` scope: only the excluded adjustment amounts leave the adjustment sums, line money of kept lines unchanged |
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
| `carrier_label` | Carrier / Carrier ID | text (`{carrier_name} ({payer_id})`; `payer_id` as the id is INFERRED, open question 8) | aggregate | key column |
| `charges_submitted` | Charges Submitted | money | financial_practice | sum |
| `other_adjust` | Other Adjust | money | financial_practice | sum |
| `contract_obligations` | Contract Obligations | money | financial_practice | sum |
| `patient_responsibility` | Patient Responsibility | money | financial_practice | sum |
| `actual_allowed` | Actual Allowed | money | financial_practice | sum |
| `paid_amount` | Paid Amount | money | financial_practice | sum |
| `denied_lines` | Denied Lines | integer | aggregate | sum; enhancement |
| `paid_amount_prior` | Paid (prior) | money | financial_practice | sum; `visible_when ["ne", "compare_to", "none"]` |

Format `detail`, PDF layout - block `detail` with levels: office band (`fixed_outer`, `when ["ctx", "multi_office"]`; proposal: the Detail sample shows only the carrier band) -> carrier band `Carrier: {carrier_name} ({payer_id})`
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
| Export selection | bulk | `export_selection` (P2: whole-run export through `output_format`) | `reports_export_data_files` | P3 (ENG-49, SEC-36) |

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
| 1 | Population: lines with any non-zero adjustment, lines paid below the charge submitted, or only claims with payer status denied / partially paid (835 `CLP02`, not stored: NEW `era_claim_payments.payer_claim_status_code`)? | Lines with any non-zero adjustment |
| 2 | EXCLUDE REASON CODE: drops whole service lines or only the adjustment rows? Value list of the picker? | Whole lines (research reading); `exclude_reason_scope = adjustment` as enhancement; CARC list |
| 3 | Excel with several codes of one group on a line: one row per line (joined codes) or one row per code? | One row per line, joined |
| 4 | Detail `Count`: service lines or reason occurrences ("number of reason codes per service")? | Lines at service level, occurrences at reason level |
| 5 | Date basis: remittance payment date or posting date | Remittance payment date |
| 6 | Tenant enablement: hidden unless enabled, or listed with the notice (header question 5) | Hidden unless enabled |
| 7 | Excel `CLMChargeSubmitted`: the claim-level charge (835 `CLP03`) repeated per row, or the service-line charge (`SVC02`)? | Line charge; a claim-level value is never summed across lines |
| 8 | Which identifier prints in `Carrier / Carrier ID` and Excel `CarrierID`: the 835 payer id or the vendor's carrier record id? | 835 `payer_id` (inferred) |
| 9 | One-month cap: calendar month, one month from Start Date, or 31 days? | `max_span_days: 31` |
| 10 | CARRIER dialog contents and source (inactive carriers); how an 835 payer is mapped to a DentC carrier (`era_files.carrier_id`) | All carriers of the tenant; unmapped payers match only under `all` |

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

<!-- PARITY:insurance_reports.r13:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office or Office Group, both enabled on this screen (nothing greyed). Office: one or more offices the caller may read, default the working office; Office Group: groups from Setup > Office Groups, default ALL. |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in. Offices (mode office) or office groups (mode office_group); both enabled on this screen. The selection becomes exactly one of the value keys office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. |
| CREATED ON DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Fixed date_basis = created_date of the automatic eligibility check (its check date-time as office-local date; inferred - the report is not described by the vendor). Reads eligibility_verifications (DATA-34, SCHEMA(34)) rows whose actor is the automatic sweep; needs a real-time eligibility integration that writes them. Default today; enhanced with presets and relative tokens. |
| CREATED ON DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | End of the check created_date range, inclusive (basis inferred). Default today; enhanced with presets and relative tokens. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:insurance_reports.r13:END -->

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
| `eligibility_states` | `enum_multi` NEW (owner 04, the key of DPS Eligibility Report); this report offers `verified`, `not_eligible`, `unknown` and the enhancement value `error` (payer rejected the inquiry; printed `Unknown` in the legacy Result) | all ticked, `full_selection: no_predicate` | Include on the check result | Saved view "Problems only" = `not_eligible`, `unknown`, `error` |
| `appointment_date` (`appointment_date_from`, `appointment_date_to`, `appointment_date_preset`) | `date_range` NEW secondary range (owner 04) | blank | Appointment date of the checked appointment; blank = no restriction | "Tomorrow's patients not eligible" |
| `carrier_ids` | `entity_multi` (shared 3.5) | `all` | Carrier of the checked plan | - |
| `appointment_provider_ids` | `entity_multi` (shared 3.2, role `appointment`) | `all` | `rpt_appointment_facts.provider_id` | Roster-first picker |
| `latest_check_only` | `boolean` NEW (owner 04) | `false` | Keeps the last automatic check per appointment and coverage | A sweep that retries the same appointment lists it once |
| Saved view "Not eligible - next 3 days" | saved view | - | `date_preset = last_7_days`, `appointment_date_preset = next_3_days`, `eligibility_states = [not_eligible, error]`, `latest_check_only = true` | Morning schedule preset |

### Data

| Topic | Rule |
|---|---|
| Table | `eligibility_verifications` (DATA-34): `id`, `office_id`, `appointment_id`, `patient_id`, `subscriber_id`, `ins_plan_id`, `carrier_id`, `tier`, `method`, `status`, `payer_name`, `error_text`, `checked_at`, `checked_by` |
| Dataset | NEW `rpt_eligibility_checks` (owner 03, DATA-34): one row per verification with `checked_date` (office-local), `elig_status_class` (`verified` / `not_eligible` / `unknown`; a stored `error` maps to `unknown` for the legacy Result and keeps `is_payer_error = true` with `error_text`), joined to `rpt_appointment_facts` (`appointment_date`, `start_time`, `provider_id`), `rpt_patient_dim`, `rpt_insurance_coverage` (subscriber name, `sub_member_id`, carrier, `tier`) |
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
| `result` | Result | enum (legacy `Eligible`, `Not Eligible`, `Unknown`; a payer error prints `Unknown` with its text in `Payer Message`) | aggregate | `count` per value in the band label |
| `is_payer_error` | Error | boolean, `default_visible: false` (enhancement value `error` of `eligibility_states`) | aggregate | count |
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
| Card `Not eligible` | `kind rows` with `eligibility_states = [not_eligible]` |
| Footer link | `worklists.eligibility_verification` (P3) with the same offices and the appointment-date range; until P3 `insurance.dps_eligibility_report` |

### Actions

| Action | Scope | Kind | Right | Phase |
|---|---|---|---|---|
| Open appointment / open insurance | row | `navigate` | Scheduler / patient insurance right | P2 |
| Text patient to update insurance | bulk | `send_sms` to the listed patients (`requires sms_consent`, exclusion count shown; template owned by the SMS feature) | SMS feature right | P3 |
| Verify manually | row | `navigate` to the slot's Verify Eligibility (existing manual stamp, `POST /insurance-subscribers/{subscriber_id}/verify-eligibility` [V]) | patient insurance right | P2 |
| Export selection | bulk | `export_selection` (P2: whole-run export through `output_format`) | `reports_export_data_files` | P3 (ENG-49, SEC-36) |

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
| 6 | How does the legacy report show an inquiry the payer rejected (`ERROR` text): as `Unknown`, as its own status, or not at all? | `Unknown` with the error text in `Payer Message` |

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-INS-01 | Claim-list definitions: Claims List and Claims Created Not Sent (carrier band and subtotal with count, claim_kind / claim_type / claim_sent_types / claim_amount_min / patient_name filters, created-date basis, APP availability notice) | P2 | M | DATA-21, DATA-32, ENG-11, ENG-23, ENG-27, FLT-06, FLT-13 | Default run lists only claims created today in the working office with `status_class` per report (Claims List: sent claims only, `unsent` with `include_unsent`); footer echo matches the legacy wording of each sample; `claim_sent_types` full selection adds no predicate; parity defaults pass FLT-20 |
| RPT-INS-02 | Outstanding Claims definition: as-of run, ageing on estimated insurance in five buckets, carrier bands with phone, Group / Sub ID / Created By lines, flat Excel with the legacy 25 columns, `group_by` disabled for xlsx, `output_format` role query | P2 | L | DATA-21, DATA-31, DATA-32, MET-11, ENG-11, ENG-23, ENG-27, NEW 03 amendment of the data card 2.20 bucket rule (`expected_amount` legacy / `outstanding_amount` remaining basis) | Default (`estimate`) buckets sum to Total = Est. Ins; with `aged_amount_basis = remaining` the grand Total equals `outstanding_claims_amount` and Over 90 % equals `claims_over_90_pct` for the same parameters; a zero-estimate claim is listed with zeros; xlsx run returns `group_by = none`; a past report_date is refused until `rpt_claim_facts_as_of()` exists |
| RPT-INS-03 | Pre-claim exception definitions: Procedures on Hold, Claims Not Created (date_basis radio with ALL, single day, coverage_orders), Unbilled Report Due to No Insurance | P2 | M | DATA-21, DATA-33, DATA-13, DATA-12, ENG-11, ENG-27 | A held procedure appears on Procedures on Hold and, when its patient holds an active dental slot, on Claims Not Created; the primary-tier total equals `unbilled_production_amount`; `date_basis = all` disables report_date; quaternary returns no rows without error |
| RPT-INS-04 | Managed-care definitions: Capitation Utilization (Detail carrier -> plan / group -> date bands, Office Default / Co - Pay / Sup. Fee., include_ucr + compare_fee_schedule_id, print_all_codes, facility_id header) and Capitation Payment | P2 | L | DATA-32, DATA-33, DATA-38, DATA-51, DATA-04, DATA-05, RPT-INS-14 (NEW `rpt_fee_schedule_assignments`), NEW `rpt_office_dim` address / phone / tax id (03), ENG-23, ENG-27 | Default Detail run prints exactly the 12 columns of the 2008 sample, `Office Default` 0.00; Office Default carries the compare fee only with include_ucr; unticked print_all_codes drops codes not reported to the carrier; a capitation payment entered once appears once, with a carrier subtotal and grand total |
| RPT-INS-05 | Benefits Used/Unused definition: per-patient block per treatment-plan id with the eight benefit columns per coverage, anniversary range default (upcoming_benefit_year), exclude_resp_party_type_codes, unlimited flag; Recall mode wired when DATA-41 lands | P2 | L | DATA-32, DATA-53, DATA-56, DATA-41, FLT-04, ENG-23 | Default range resolves to the first day of next month through one year later minus one day; Ind Max Rem equals `max_remaining_with_posted` (`rpt_benefit_usage().max_remaining_effective` net of posted, unclaimed estimates); Fam Max Rem prints the stored snapshot with its written date; `99999` rows are flagged and excluded from totals; recall option shows `recall_mode_p3` until the derived `rpt_recall_due()` ships |
| RPT-INS-06 | Eligibility definitions: DPS Eligibility Report (date_range_type with two ranges, on-hold, patients without insurance) and RTE Sweep Details | P2 | M | DATA-16, DATA-21, DATA-34, ENG-11 | `date_range_type = appointment_date` disables the created range and the reverse; `both` applies both; RTE Sweep lists only checks made by the automatic actor; before DATA-34 rows exist DPS Eligibility lists the appointments with the current subscriber stamp and the notice `eligibility_current_stamp_only`, only On Hold ticked or a narrowed `request_states` returns zero rows with `needs_eligibility_history`, and RTE Sweep Details runs empty with its notice |
| RPT-INS-07 | CREATE TASK on Outstanding Claims: bulk action `create_tasks` writing one follow-up per claim of the snapshot (outstanding_claim / outstanding_pre_auth), count confirmation, auto-close on claim resolution | P2 | M | RPT-INS-02; blocking: cross-document re-phase request to 02 / 06 / 08 moving ENG-49 (snapshot bulk dispatch), the `worklist_followups` store of DASH-28 and SEC-36 to P2 (all P3 today; if refused the item moves to P3 and CREATE TASK is a known P2 parity gap) | Confirmation states the snapshot's claim count; rerunning the action for the same run creates no duplicates; a follow-up closes when its claim becomes paid, closed, denied, void or deleted; the action needs the task feature right, not only `insurance` |
| RPT-INS-08 | Remittance definitions: EOB 835 Claims Reconcile Report (matching and claim-status filters, payment / file-received basis, show_details_ucr block) and 835 Denial Report (Summary by carrier, Detail carrier -> service code -> reason code, flat Excel, xlsx forces detail, 31-day span, exclude_reason_codes) | P2 | L | DATA-38, DATA-31, FLT-08, ENG-23, ENG-27 | 835 Denial opens with xlsx and detail, office `all`; a 32-day range is refused; Excel columns equal the documented list and the last row carries the row count and sums; both reports show "needs ERA integration" while the ERA tables are empty |
| RPT-INS-09 | Family parity and reconciliation tests plus the live-legacy checklist of this catalog (inferred bases, option effects, dialog contents, Recall state, Summary layouts) | P2 | M | FLT-20, FLT-23, ENG-18, MET-11 | The 13 definitions validate against `insurance_reports.parity.json` in the lint; every `reconciles_with` of the family passes on the fixture; each inferred item has an answer or a recorded waiver |
| RPT-INS-10 | Claims List definition: 11 legacy columns (composite `Patient / Subscriber`, `Patient - Subscriber DOB`, `Claim Sent - DOS` split in XLSX), status labels, carrier band with count, family-once `Claim Amt` totals, `include_resolved_claims` status sets for claims and pre-auths, pre-auth sub-title, legacy footer wording | P2 | M | RPT-INS-01, DATA-21, DATA-32, ENG-11, ENG-23, ENG-27 | Default run lists only app-era sent claims created today in the working office (no `unsent` claim without `include_unsent`); a primary + secondary family of one carrier adds `Claim Amt` once to that carrier subtotal, a family split over two carriers adds it once to each band and once to the grand total, and prints it on both rows; `Rem. Amt.` = `Est. Ins - Recv. Amt.`; ticking Include Resolved adds paid and closed claims only; void / deleted never appear |
| RPT-INS-11 | Claims List enhancements: `include_unsent`, `date_basis` with NEW value `sent_date` and `service_date`, `provider_ids` (claim provider), `coverage_orders`, `sort_by`, optional columns, three shipped saved views | P2 | S | RPT-INS-10, FLT-02, ENG-28 | With `date_basis = sent_date` and Include Resolved the count equals `claims_submitted_count` for the same range and offices; migrated claims appear under `sent_date` with the REPAIR(32) notice; untouched defaults reproduce RPT-INS-10 output byte for byte |
| RPT-INS-12 | Capitation Utilization Detail: prepaid-slot population, carrier -> plan / group -> date levels (provider outer level with GROUP BY on the treating provider), `Office Default` (compare fee with Include UCR, else 0.00) / `Co - Pay` / `Sup. Fee.` (switched by Include Fees Charged), hidden `Office UCR` / `Fee Charged`, office header block with Facility ID (NEW `rpt_office_dim` address / phone / tax id, owner 03), `print_all_codes` rule, hygienist billing-provider rule, non-covered count | P2 | L | RPT-INS-04, RPT-INS-14, DATA-32, DATA-51, DATA-04, DATA-05, NEW `rpt_office_dim` address / phone / tax id (03), ENG-23, ENG-27 | Default run prints exactly the 12 columns of the 2008 sample and the three subtotal labels, `Office Default` 0.00 on every line; unticked Print All Codes drops z-codes; Office Default carries the compare fee only with Include UCR and a schedule; unticked Include Fees Charged blanks Co - Pay and Sup. Fee. without changing rows; a hygienist line prints the office billing provider only when ticked; grand `Office UCR` with `print_all_codes = true` on primary-tier prepaid slots equals `capitation_value_of_services` on the fixture |
| RPT-INS-13 | Capitation Utilization Summary format and `page_break_by = carrier` (NEW value) with XLSX sheet per carrier | P2 | S | RPT-INS-12, ENG-23, ENG-27 | Summary carrier totals equal the Detail carrier totals for the same parameters; `members_seen` is recounted at carrier and grand level (not summed); a two-carrier PDF starts the second carrier on a new page |
| RPT-INS-14 | Managed-care fee resolution for reporting: NEW `rpt_resolved_fee_schedule()` (charge schedule, else `fee_schedule_assignments` precedence by plan, carrier, provider, specialty, narrowed by office) and the interim prepaid-plan rule (`is_prepaid` or resolved schedule `pricing_model = 'copay'`) proposed to 03; NEW passthrough dataset `rpt_fee_schedule_assignments` over `fee_schedule_assignments` (owner 03, delivered here in P2) | P2 | M | DATA-32, DATA-51 | `rpt_fee_schedule_assignments` returns every assignment row of the tenant with its office; on a sample of app-era charges the resolved schedule equals `pricing_service.resolve_procedure_fee`; a plan whose schedule is copay is listed before the prepaid code is decoded only when 03 accepts the interim rule; blank / blank codes flag `is_non_covered` |
| RPT-INS-15 | Claims Created Not Sent definition: unsent population (`status_class = 'unsent'`, claims only), proposed columns with `Days Unsent` and `Created By`, provider and carrier levels, enhancements (`claim_kind`, `date_basis = service_date` with migrated flag, `coverage_orders`, `sort_by`), age-band chart, saved views | P2 | S | RPT-INS-01, DATA-21, DATA-32, ENG-11 | Count of the saved view "All unsent claims" plus the count of migrated unsent claims under `date_basis = service_date` equals `claims_unsent_count`; a sent claim never appears; a migrated draft appears only under `service_date` with the `claim_status_unconfirmed` notice; GROUP BY Provider subtotals sum to the grand total |
| RPT-INS-16 | Send in batch hand-off from Claims Created Not Sent: bulk `navigate` to Batch Claims Processing carrying the snapshot's claim ids | P3 | S | RPT-INS-15, ENG-49 | The utility opens with exactly the selected unsent claims; ids come from the snapshot, never from the client; the hand-off is audited |
| RPT-INS-17 | Procedures on Hold definition: `billing_state = 'hold'` population on service date, proposed columns (carrier from the primary slot until DATA-33, `Hold Note`, `Days`), enhancements (`provider_ids`, `carrier_ids`, `group_by`, `sort_by`), drill to the ledger line, funnel link to Claims Not Created | P2 | S | RPT-INS-03, DATA-06, DATA-21, ENG-11 | Every held unclaimed live charge in range appears once; each one of a patient with an active dental slot also appears on Claims Not Created; a held charge with a claim id is not listed; total Fee of the `is_production` lines equals `procedures_on_hold_amount` |
| RPT-INS-18 | Hold reason and hold stamps: NEW `patient_procedures.hold_reason`, `hold_set_at`, `hold_set_by` written by `patient_procedure_service` on every hold change; `rpt_charges` exposes them and `procedure_note`; ledger dialog captures the reason (handed to 03 and the ledger feature) | P2 | S | DATA-06 | Ticking Hold Claim with a reason stores reason, time and user; unticking clears them and writes an audit row; Procedures on Hold prints the reason instead of the procedure note |
| RPT-INS-19 | Bulk release of holds from the report through `worklists.unbilled_procedures` (`custom:release_hold`) | P3 | S | RPT-INS-17, ENG-49, DASH-28 | Releasing 20 selected rows PATCHes 20 charges once each (idempotent on rerun); a charge changed since the snapshot is skipped and reported; the action needs the transaction-entry right |
| RPT-INS-40 | DPS Eligibility Report definition: appointment x slot grain, `date_range_type` with the two ranges (AND for `both`), `include_patients_with_no_insurance`, current-stamp status columns, date bands with distinct-appointment counts, `status_summary` block, eligibility-state enhancement and saved views | P2 | M | RPT-INS-06, DATA-16, DATA-21, ENG-11, ENG-23, ENG-27, FLT-04 | Default run lists today's live appointments of insured patients in the working office, one row per slot; `appointment_created_date` alone never returns a migrated appointment; a two-slot appointment counts once in the subtotal; with the worklist's window and `coverage_orders = [primary]` the verified share equals `eligibility_verified_pct` on the fixture |
| RPT-INS-41 | Verification request capture for DentC (the DPS request), P2 part: request form on the appointment window (verify type, On Hold, Submit; no report action, no ENG-49) writing `eligibility_verifications` (`method = 'service'`, `status = 'requested'`, `verify_type`, `is_on_hold`, `tier`, `subscriber_id`); answer entry closes the request; report columns Verify Type, On Hold, Request and the `eligibility_on_hold` / `request_states` filters read it (handed to 03 and the insurance feature); the row and bulk "Request verification" actions of the report are P3 (RPT-INS-42) | P2 | M | DATA-34, RPT-INS-40 | A request made on the appointment window appears as `Requested` with its verify type; ticking On Hold on the report lists exactly the held requests; answering the request moves it to `Answered` and updates the subscriber stamp; before any row exists On Hold returns zero rows with `needs_eligibility_history` |
| RPT-INS-42 | DPS Eligibility actions: update status (`custom:verify_eligibility`), row and bulk `custom:request_verification` from the report (writer of RPT-INS-41), bulk "request updated insurance" text / e-mail with consent exclusions, drill to `worklists.eligibility_verification` | P3 | S | RPT-INS-40, RPT-INS-41, ENG-49, DASH-31 | A bulk request from the report writes one `requested` row per selected slot, idempotent per run; updating a row's status writes one verification and the row shows the new status on the next run; opted-out patients are counted and skipped; the drill opens the worklist with the same offices and window |
| RPT-INS-43 | Capitation Payment definition: `capitation_payments` population on `payment_date`, carrier band with count and grand total, `payment_instrument` columns, `include_voided`, `group_by = carrier_month`, reconciliation with the `cap` legs of `rpt_payments` | P2 | M | RPT-INS-04, DATA-38, ENG-11, ENG-23, ENG-27 | A payment entered once appears once with carrier subtotal and grand total; a voided payment is absent unless `include_voided`, and then excluded from totals; the grand total equals `-sum(amount)` of `rpt_payments` `txn_class = 'capitation_payment'` for the same offices and dates |
| RPT-INS-44 | Capitation payment entry screen (legacy `Transactions > Capitation Payment`): carrier with capitation fee schedule, payment and adjustment code, date, amount, check / bank / EOB numbers, notes, void with reason; writes `capitation_payments` through the DATA-38 writer (handed to the transactions feature) | P2 | M | DATA-38, DATA-03 | Saving a payment writes one row and two ledger legs that net to zero; the payment shows in Collection Report under tender `capitation` and on Capitation Payment; void keeps the row with `is_void` and removes it from both |
| RPT-INS-45 | Capitation Payment utilisation comparison: `include_utilization_comparison` subtotal columns `Value of Services` and `Paid / Value`, drill to Capitation Utilization Summary, NEW metric `capitation_payments_amount` proposed to 05 | P3 | S | RPT-INS-43, RPT-INS-12, RPT-INS-13, RPT-INS-14 | `Value of Services` per carrier equals the hidden `Office UCR` carrier total of `insurance.capitation_utilization` for the same offices and dates; `Paid / Value` equals `capitation_utilization_pct` when member co-pays are zero on the fixture |
| RPT-INS-46 | Benefits Used/Unused Treatment Plan mode: pending-item population per patient and plan id, next-rollover anniversary filter, eight benefit columns from `rpt_benefit_usage()` with stored family snapshots and `slot_written_on`, unlimited flag, home-office attribution, `exclude_resp_party_type_codes`, block layout and flat XLSX | P2 | L | RPT-INS-05, DATA-32, DATA-53, DATA-56, ENG-11, ENG-23, ENG-27 | Default range resolves to the first day of next month through one year later minus a day; a slot rolling over this month is not listed; `Ind Max Rem` equals `max_remaining_with_posted` (NEW, owner 03: `rpt_benefit_usage().max_remaining_effective` minus the `est_for_tier` of the slot's unclaimed production charges of the benefit year), and a procedure posted with an estimate but not yet on a claim lowers it; a `99999` plan is flagged and excluded from the remaining total; an account of an excluded type drops all its patients, an account without a type is kept |
| RPT-INS-47 | Benefits Used/Unused Recall mode: `rpt_recall_due()` population (`due_date` in the recall range, no `recall_status` predicate), `recall_date`, `max_over`, `recall_procedure_codes` visible only in Recall mode, `recall_benefits` block, title `... - Recall`, live capture of the Recall screen state (FLT-23); request to 03 for the derived `rpt_recall_due()` without the recall engine in P2 (NEW item, owner 03), maintained rows stay with DATA-41 in P3 | P2 | M | RPT-INS-46, NEW 03 item: derived `rpt_recall_due()` in P2 (if refused: this item moves to P3 and Recall mode is a known P2 parity gap), FLT-23 | Recall mode lists only patients with a recall due in the recall range and a rollover in the anniversary range, a recall due 200 days ahead included when inside both ranges; `max_over = 100.00` drops patients whose remaining maximum is 100.00 or less on every line; before the derived function ships the option shows `recall_mode_p3` and runs empty |
| RPT-INS-48 | Benefits Used/Unused enhancements and outreach: `benefits_remaining_min`, `acceptance_state`, `has_future_appointment`, `sort_by`, anniversary-month chart, schedule hand-off, proposal print, bulk benefit-reminder text / e-mail / letters, follow-up tasks | P3 | M | RPT-INS-46, ENG-49, DASH-28, DASH-31 | With `has_future_appointment = no` a patient with any live future appointment is absent; the schedule hand-off opens the Scheduler with the block's pending items preselected; a bulk message skips and counts opted-out patients; untouched defaults reproduce RPT-INS-46 output |
| RPT-INS-49 | Outstanding Claims report specifics: category and carrier bands with phone, stacked PDF cells and `Group:` / `Sub ID:` / `Created By:` sub-lines (NEW renderer `sub_lines`), legacy 25-column flat XLSX / CSV, pre-authorisation title, family-once `Claim $` / `UCR` totals (once per carrier band, once overall), `Total {category_label} Claims` subtotal, age-bucket predicate independent of amount, quality notices | P2 | M | RPT-INS-02, DATA-21, DATA-32, ENG-23, ENG-27 | PDF of the fixture matches the 2023 column order; XLSX has exactly the 25 legacy columns in order with typed cells; a 0.00-estimate claim of a ticked bucket is listed with zeros; unticking `Over 120` removes only those claims; a primary + secondary family adds `Claim $` once |
| RPT-INS-50 | Outstanding Claims for a past Report Date: switch the builder to `rpt_claim_facts_as_of()`, `status_basis` notice before DATA-25 capture, 422 `as_of_unavailable` until the function exists | P2 | S | RPT-INS-49, DATA-31, DATA-25 | A claim paid yesterday is listed for a report date of two days ago with the remittance of that date excluded from `Recv Amt`; before DATA-31 a past date is refused with the code and notice; a date before history capture prints `claim_status_current_basis` |
| RPT-INS-51 | Outstanding Claims enhancements: `aged_amount_basis`, `include_unconfirmed_claims`, `coverage_orders`, `sort_by`, optional columns (days, last payment, submissions, channel, last follow-up), carrier aging chart, drills to the worklist and the insurance dashboard | P2 | S | RPT-INS-49, MET-11, DASH-14 | With `aged_amount_basis = remaining` the grand Total equals `outstanding_claims_amount`; count equals `outstanding_claims_count`; `Over 90 %` equals `claims_over_90_pct`; unconfirmed migrated claims appear only with the flag on and never in totals |
| RPT-INS-52 | Claims Not Created definition: `rpt_unclaimed_charge_tiers` population per ticked tier (secondary and tertiary depth and primary-closed rules, quaternary empty), `date_basis` radio with single `report_date`, coverage bands with subtotals, `Bill` value with `H`, `era = 'app'` guard until DATA-10 check #3, availability notices | P2 | M | RPT-INS-03, DATA-21, DATA-10, DATA-12, DATA-13, DATA-33, ENG-11, ENG-23, ENG-27 | A held unclaimed procedure appears with `Bill = H`; a charge whose primary claim exists but is open is in no band; after the primary closes a `DD` charge appears in the secondary band only; primary-band Fee equals `unbilled_production_amount`; Transaction Date and DOS Date return the same rows with the SCHEMA(13) notice before DATA-13 |
| RPT-INS-53 | Claims Not Created enhancements: `unclaimed_service_range`, `service_date_floor`, `provider_ids`, `carrier_ids`, `include_held`, `group_by` (provider / carrier / patient), `days_since_service` with the organisation filing-limit setting, saved views | P2 | S | RPT-INS-52, FLT-02, ENG-28 | A Monday-Friday range returns the union of the five single-day runs; `include_held = false` removes exactly the rows listed on Procedures on Hold; untouched defaults reproduce RPT-INS-52 output |
| RPT-INS-54 | Create claim from Claims Not Created: bulk `custom:create_claim` grouping the snapshot's charge ids by patient, tier and service date, through the billing service (no client-sent ids) | P3 | M | RPT-INS-52, ENG-49 | Selecting three lines of one patient and day creates one claim with three lines; rerunning the action for the same run creates nothing; a charge claimed since the snapshot is skipped and reported |
| RPT-INS-70 | Unbilled Report Due to No Insurance definition: `bill_tier = 'none'` unclaimed population with the active-dental-slot `EXISTS` test, service-date basis, proposed 10 columns plus `Bill`, `Ins. Eff.`, `Days`, office band and totals, enhancements (`provider_ids`, `carrier_ids`, `coverage_effective_rule`, `include_unconfirmed_none`, `exclude_zero_fee`, `sort_by`), `bill_tier_source` with NEW value `migrated_blank` (03), carrier from today's primary slot, drill to the ledger line, funnel link to Procedures on Hold, two saved views | P2 | S | RPT-INS-03, DATA-06, DATA-21, DATA-33, ENG-11, ENG-23, ENG-27 | Default run lists only today's live `none` lines without claim of insured patients in the working office; a patient with two dental slots shows each line once; a line with a claim or with billing order `Dental` never appears; app rows print the `bill_tier_derived` notice until DATA-33; the fixture's migrated blank-order lines are counted in `bill_order_blank_migrated` and drop out with `include_unconfirmed_none = false`; the `Carrier` column shows today's primary slot carrier also after DATA-33 |
| RPT-INS-71 | Stage `no_billing_order` of `worklists.unbilled_procedures` with bulk `custom:set_billing_order` (billing order Dental, re-estimate) proposed to 06 | P3 | S | RPT-INS-70, ENG-49, DASH-28 | Setting the order on 10 selected lines PATCHes 10 charges once each (idempotent on rerun); the lines leave the stage and appear on Claims Not Created; the action needs the transaction-entry right |
| RPT-INS-72 | ERA reporting layer: NEW `era_service_lines` table and `era_adjustments.era_service_line_id` (amendment to DATA-38), `era_claim_payments.patient_name_835`, `payer_claim_status_code` and `posted_payment_entry_id` (written by the auto-post), optional `era_service_lines.tooth`, payee -> office mapping, NEW views `rpt_era_claim_payments`, `rpt_era_service_lines`, `rpt_era_adjustments` with `report_office_id` and office-local `file_received_date` (handed to 03) | P2 | M | DATA-38, DATA-05, DATA-21 | Line money summed over `rpt_era_service_lines` equals the 835 file's claim totals on a fixture with multi-reason lines (no multiplication); an unmatched payment with a mapped payee lands in that office, otherwise in Unassigned office; R-01 style uniqueness holds on every view |
| RPT-INS-73 | EOB 835 Claims Reconcile definition: claim-payment rows with carrier and check bands, `claim_matching_status`, `claim_status` on `claim_status_after`, `date_basis` payment / file received, `show_details_ucr` service-line block with DentC UCR, DOS-mismatch column, last-file-received notice, `needs_era_integration` | P2 | M | RPT-INS-08, RPT-INS-72, ENG-11, ENG-23, ENG-27 | Both / Matched / UnMatched partition the default population; `Closed` returns no unmatched rows; unticking Show Details UCR removes only the line block; check subtotals equal the sum of their rows; empty ERA tables return the notice, not an error |
| RPT-INS-74 | EOB 835 enhancements: `posting_status`, `not_posted_reasons`, `days_unposted_min`, `provider_ids`, `check_totals` block (835 file total vs claim payments vs DentC posted payments by check / EFT number), two saved views, posted / unposted chart | P2 | S | RPT-INS-73, DATA-28, DATA-33, FLT-08 | For a fixture file with one unposted claim payment the `difference` of its check equals that payment's paid amount; before DATA-33 the match runs on check / EFT number and office with the notice `check_match_without_carrier`; untouched defaults reproduce RPT-INS-73 output; the unmatched saved view shows Unassigned-office rows only to all-office callers |
| RPT-INS-75 | 835 Denial Report definition: Summary (carrier rows, office total), Detail PDF (carrier -> service code -> reason levels with counts), Excel 21-column grid with final `Total : <n>` row, `xlsx` + `detail` + office `all` defaults, d01 forced rule, 31-day validation, exclude rule on service lines with `exclude_reason_scope`, group mapping PR / CO / OA+PI, tenant enablement through NEW `availability.tenant_flag` (02 / 08) | P2 | L | RPT-INS-08, RPT-INS-72, RPT-INS-76, FLT-08, ENG-11, ENG-23, ENG-27 | The form opens with Excel, Detail greyed-marked, office ALL; a 32-day span is refused; excluding code 45 removes every service line carrying a code-45 adjustment with its line money and all its adjustments; with `exclude_reason_scope = adjustment` only the code-45 rows are removed and Charges Submitted of kept lines is unchanged; Summary carrier totals equal Detail carrier totals; Excel columns and order equal the documented list |
| RPT-INS-76 | Reason and remark code reference: NEW `era_reason_codes` (CARC / RARC code, description, active) seeded from the published code lists, feeding `lookup:denial_reason_codes` and the description columns | P2 | S | FLT-08, DATA-38 | Every reason and remark code on the fixture resolves to a description; an unknown code prints the code with `(unknown code)`; the picker lists active codes first |
| RPT-INS-77 | 835 Denial enhancements: `adjustment_group_codes`, `include_reason_codes`, `denial_kind`, `provider_ids`, `procedure_codes`, Summary `compare_to = previous_period` and `denied_lines`, top-reason chart, drill from reason line to grid rows, two saved views; P3 bulk hand-off to `worklists.denied_claims` | P2 | M | RPT-INS-75, ENG-28; P3 part: ENG-49, DASH-28, DATA-31 | `denial_kind = denied` lists only lines with paid 0; prior-period columns use a window of the same length that also passes the 31-day rule; untouched defaults reproduce RPT-INS-75 output byte for byte |
| RPT-INS-78 | RTE Sweep Details definition: NEW `rpt_eligibility_checks` view (handed to 03), `method = 'rte_sweep'` population on the office-local check date, proposed 16 columns, office and check-date bands with result counts, enhancements (`eligibility_states`, `appointment_date`, `carrier_ids`, `appointment_provider_ids`, `latest_check_only`), drills to Scheduler and insurance slot, notices `needs_rte_integration` and `auto_eligibility_on` | P2 | S | RPT-INS-06, DATA-34, DATA-16, ENG-11, ENG-23, ENG-27 | A manual check never appears; a check at 23:30 office time on day D is listed for D, not D+1; a payer-rejected check prints Result `Unknown` with the error text; with `latest_check_only` an appointment checked twice is listed once with the later result; before DATA-34 rows exist the run is empty with the notice |
| RPT-INS-79 | Sweep prerequisites recorded for the eligibility integration: NEW `offices.rte_sweep_days_before`, sweep writer contract (one `eligibility_verifications` row per appointment x coverage, `method = 'rte_sweep'`, `checked_by` NULL, payer and error text) and status expiry after one month (handed to 03 and the integration owner) | P2 | S | DATA-34 | The contract document lists the fields RPT-INS-78 reads; a sweep fixture written to it produces the expected report rows; expiry turns a status older than one month to `unknown` on the coverage dataset only, never on the stored check rows |

<!-- ASSEMBLED from catalog/parts/insurance_reports/ (00_header.md, 10_reports_01_04.md, 20_reports_05_09.md, 30_reports_10_13.md). Edit this document directly from now on. -->
