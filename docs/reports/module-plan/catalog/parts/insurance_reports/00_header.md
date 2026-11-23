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
| `insurance.benefits_used_unused` | Benefits Used/Unused | Patients with benefits remaining before their plan anniversary who have a treatment plan (or are due for recall) | P2 | L | REPAIR(32); SCHEMA(53) for Exclude Responsible Party Type; Recall mode needs DATA-41 (P3) | DOCUMENTED (both modes, 2011-2012 samples) |
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
| Claim lists | Claims List, Claims Created Not Sent, Outstanding Claims | `rpt_claim_facts`; `is_preauth` chosen by `claim_kind`; `status_class` per report (Created Not Sent = `unsent`; Outstanding = `sent`, `partially_paid` with `outstanding_quality <> 'unknown'`) |
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
| `claim_sent_types` | `enum_multi` | Claims List, Outstanding Claims | both ticked | `full_selection: no_predicate`; channel not stored until DATA-21 (`sent_method`) |
| `claim_amount_min` | `decimal` | Claims List, Claims Created Not Sent, Outstanding Claims | 0.00 -> `"0.00"` | `billed_amount >= value` (never summed across a claim family) |
| `patient_name` (`patient_name_from`, `patient_name_to`) | `text_range` | Claims List, Claims Created Not Sent | AAAAA / ZZZZZ | Patient sort name, prefix rule; needs `phi_identified`; never written to a URL |
| `group_by` | `enum` `none` / `provider` | Capitation Utilization, Claims Created Not Sent, Outstanding Claims | None -> `none` | Provider level inferred; disabled with `xlsx` on Outstanding Claims only (documented) |
| `report_format` | `enum` `detail` / `summary` | Capitation Utilization, 835 Denial Report | Detail -> `detail` | 835 Denial: forced `detail` with `xlsx` |
| Report-specific keys | - | per report | as the parity file | `facility_id`, `include_ucr`, `compare_fee_schedule_id`, `print_all_codes`, `include_fees_charged`, `print_office_address`, `show_billing_provider_for_hygienist`, `eligibility_on_hold`, `date_range_type`, `appointment_created_date`, `include_patients_with_no_insurance`, `report_type`, `exclude_resp_party_type_codes`, `aging_buckets`, `date_basis`, `coverage_orders`, `claim_matching_status`, `claim_status`, `show_details_ucr`, `include_resolved_claims`, `exclude_reason_codes`; Recall state of Benefits Used/Unused: `recall_date`, `max_over`, `recall_procedure_codes` (04 vendor-doc parameters, `visible_when report_type == recall`) |

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
| Footer | `pdf.criteria_echo = footer`: the resolved criteria in the legacy echo wording (`From`, `Thru`, `Pat From`, `Thru`, `Carriers`, `Providers`, `Claim Sent Type : EClaim and Paper`, `Claim Amt Over/Equal`, `Report Date`, `Anni Date From`, `Ex Resp. Type`), then title, `Printed : <date time>`, `Page : n of m` |
| Excel | Flat typed rows, one header row, criteria on a `criteria` sheet (`xlsx.criteria_sheet`), never merged title cells; Outstanding Claims and 835 Denial keep the legacy Excel column lists |

### Rights and data classes

| Topic | Rule |
|---|---|
| Right | Family `insurance`: `reports_insurance_reports_screen_view_only` (run, view) / `reports_insurance_reports_screen_full_control` (print, export, schedule) (security card 2.2, PD-10). Override: `insurance.dps_eligibility_report` = any of `insurance`, `appointments_dps_ins_verification_reports` (security card 2.3). XLSX / CSV also need `reports_export_data_files` |
| Tenant enablement | `insurance.835_denial_report` is listed only for tenants that enable it (documented legacy behaviour); report availability owned by 02 / 08, not a parameter |
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
Outstanding Claims total = `outstanding_claims_amount`, count = `outstanding_claims_count`, Over 90 + Over 120 share =
`claims_over_90_pct`; Claims Created Not Sent count = `claims_unsent_count`; Claims Not Created primary-tier total =
`unbilled_production_amount`; Procedures on Hold total = `procedures_on_hold_amount`; 835 Denial Report feeds
`denial_rate_pct` (proxy) context only; Benefits Used/Unused total remaining = `benefits_remaining_amount` (P3 metric:
the card is shown when the metric ships); Capitation Utilization office-fee total = `capitation_value_of_services` (P3).

### Family-wide enhancements (additive; the untouched form is the legacy run)

| Enhancement | Detail |
|---|---|
| Drill-through | Claim number -> claim record (`kind record`, right of the claim screen); patient -> patient shell (`phi_identified`); carrier band total -> `rows` of that carrier; Procedures on Hold / Unbilled -> the procedure in the ledger |
| Funnel links | Each pre-claim and claim report links to the next stage report with the same `office_scope` and dates (drill `kind report`) |
| Row actions | Open claim, open ledger, open Scheduler booking hand-off where an appointment is the row |
| Legacy aliases | `legacy_names[]`: `Claims Listing`, `Capitation Utilization - Detail`, `Benefits Used/Unused - Recall`, `Outstanding Claims - Excel`, `Outstanding Claim Report for Provider`, `Pre-Auth Outstanding Claims`, `EOB Claim Reconcile Report` (vendor spelling) |
| Saved views shipped | The old report names as organisation views: `Outstanding Claims - Excel` (`output_format = xlsx`), `Outstanding Claim Report for Provider` (`group_by = provider`), `Pre-Auth Outstanding Claims` (`claim_kind = pre_authorization`), `Benefits Used/Unused - Recall` (`report_type = recall`, from P3) |
| Scheduling | All 13 are `schedulable` (no patient context); suggested cadences of research 3.10 offered as schedule presets (end of day: Claims Not Created, Procedures on Hold, Unbilled; month end: Outstanding Claims, Capitation Utilization) |
| Cost class | `interactive` by default; `escalate_when` to `background` for Claims Not Created with `date_basis = all`, Outstanding Claims over all offices, Benefits Used/Unused over a 12-month anniversary range across offices |
| Availability notices | `availability[]` entries for APP history (created dates), SCHEMA(21) channel, SCHEMA(31) past report date, SCHEMA(33) derived bill tier, SCHEMA(34) hold flag and sweep history, SCHEMA(38) "needs ERA integration", REPAIR(32) migrated statuses; printed in the criteria block |

### Family-wide open questions

| # | Question | Default used until answered |
|---|---|---|
| 1 | Does PRINT FORMAT = Excel grey GROUP BY on Capitation Utilization and Claims Created Not Sent as on Outstanding Claims? | Left enabled |
| 2 | Which provider do the PROVIDER filters apply to on the claim reports (treating or billing) and on Benefits Used/Unused? | Treating, else billing; Benefits as proposed above |
| 3 | `CLAIM TYPE` Both / Dental / Medical: dental versus medical claims, and a separate `Medical Claims` band? | Dental / medical category; band per category |
| 4 | Contents of the carrier, provider, responsible-party-type and reason-code SELECT dialogs (active only, order, inactive rows) | Every row, active first |
| 5 | `835 Denial Report` tenant enablement: keep it hidden unless enabled, or list it for every tenant with the "needs ERA integration" notice? | Hidden unless enabled (legacy behaviour) |
| 6 | CREATE TASK needs ENG-49, the follow-up store of DASH-28 and SEC-36, all P3: pull them into P2 for Outstanding Claims parity? | Pulled into P2 (RPT-INS-07) |
| 7 | Office attribution of Benefits Used/Unused and of unmatched 835 payments | Patient home office; Unassigned office |

<!-- WORK-ITEMS -->
| RPT-INS-01 | Claim-list definitions: Claims List and Claims Created Not Sent (carrier band and subtotal with count, claim_kind / claim_type / claim_sent_types / claim_amount_min / patient_name filters, created-date basis, APP availability notice) | P2 | M | DATA-21, DATA-32, ENG-11, ENG-23, ENG-27, FLT-06, FLT-13 | Default run lists only claims created today in the working office with `status_class` per report; footer echo matches the legacy wording; `claim_sent_types` full selection adds no predicate; parity defaults pass FLT-20 |
| RPT-INS-02 | Outstanding Claims definition: as-of run, ageing on estimated insurance in five buckets, carrier bands with phone, Group / Sub ID / Created By lines, flat Excel with the legacy 25 columns, `group_by` disabled for xlsx, `output_format` role query | P2 | L | DATA-21, DATA-31, DATA-32, MET-11, ENG-11, ENG-23, ENG-27 | Grand total equals `outstanding_claims_amount` for the same parameters; bucket columns sum to Total = Est. Ins; a zero-estimate claim is listed with zeros; xlsx run returns `group_by = none`; a past report_date is refused until `rpt_claim_facts_as_of()` exists |
| RPT-INS-03 | Pre-claim exception definitions: Procedures on Hold, Claims Not Created (date_basis radio with ALL, single day, coverage_orders), Unbilled Report Due to No Insurance | P2 | M | DATA-21, DATA-33, DATA-13, DATA-12, ENG-11, ENG-27 | A held procedure appears on Procedures on Hold and on Claims Not Created; the primary-tier total equals `unbilled_production_amount`; `date_basis = all` disables report_date; quaternary returns no rows without error |
| RPT-INS-04 | Managed-care definitions: Capitation Utilization (Detail carrier -> plan / group -> date bands, Office Default / Co - Pay / Sup. Fee., include_ucr + compare_fee_schedule_id, print_all_codes, facility_id header) and Capitation Payment | P2 | L | DATA-32, DATA-33, DATA-38, DATA-51, DATA-04, DATA-05, ENG-23, ENG-27 | Default Detail run matches the column list of the 2008 sample; compare column appears only with include_ucr; unticked print_all_codes drops codes not reported to the carrier; a capitation payment entered once appears once, with a carrier subtotal and grand total |
| RPT-INS-05 | Benefits Used/Unused definition: per-patient block per treatment-plan id with the eight benefit columns per coverage, anniversary range default (upcoming_benefit_year), exclude_resp_party_type_codes, unlimited flag; Recall mode wired when DATA-41 lands | P2 | L | DATA-32, DATA-53, DATA-56, DATA-41, FLT-04, ENG-23 | Default range resolves to the first day of next month through one year later minus one day; Ind Max Rem equals `rpt_benefit_usage()`; Fam Max Rem prints the stored snapshot with its written date; `99999` rows are flagged and excluded from totals; recall option shows its availability notice until DATA-41 |
| RPT-INS-06 | Eligibility definitions: DPS Eligibility Report (date_range_type with two ranges, on-hold, patients without insurance) and RTE Sweep Details | P2 | M | DATA-16, DATA-21, DATA-34, ENG-11 | `date_range_type = appointment_date` disables the created range and the reverse; `both` applies both; RTE Sweep lists only checks made by the automatic actor; both reports run empty with their availability notice before DATA-34 data exists |
| RPT-INS-07 | CREATE TASK on Outstanding Claims: bulk action `create_tasks` writing one follow-up per claim of the snapshot (outstanding_claim / outstanding_pre_auth), count confirmation, auto-close on claim resolution | P2 | M | ENG-49, DASH-28, SEC-36, RPT-INS-02 | Confirmation states the snapshot's claim count; rerunning the action for the same run creates no duplicates; a follow-up closes when its claim becomes paid, closed, denied, void or deleted; the action needs the task feature right, not only `insurance` |
| RPT-INS-08 | Remittance definitions: EOB 835 Claims Reconcile Report (matching and claim-status filters, payment / file-received basis, show_details_ucr block) and 835 Denial Report (Summary by carrier, Detail carrier -> service code -> reason code, flat Excel, xlsx forces detail, 31-day span, exclude_reason_codes) | P2 | L | DATA-38, DATA-31, FLT-08, ENG-23, ENG-27 | 835 Denial opens with xlsx and detail, office `all`; a 32-day range is refused; Excel columns equal the documented list and the last row carries the row count and sums; both reports show "needs ERA integration" while the ERA tables are empty |
| RPT-INS-09 | Family parity and reconciliation tests plus the live-legacy checklist of this catalog (inferred bases, option effects, dialog contents, Recall state, Summary layouts) | P2 | M | FLT-20, FLT-23, ENG-18, MET-11 | The 13 definitions validate against `insurance_reports.parity.json` in the lint; every `reconciles_with` of the family passes on the fixture; each inferred item has an answer or a recorded waiver |
<!-- /WORK-ITEMS -->
