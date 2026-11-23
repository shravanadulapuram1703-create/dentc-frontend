# New analytics reports - specifications

These 49 report definitions are things the legacy tool does not have. They turn the module from a parity catalog into an
analytics product. Each one answers a decision or leads to an action that no legacy report supports as well: trends with a
comparison, cohorts, funnels, rates by provider, office and payer, capacity, payer economics, control and data-quality
exceptions, and the reports the dashboards of `06_dashboards.md` drill into where no legacy report exists. They do not
replace any legacy report. The 118 legacy reports keep literal parity (AD-8) and stay the print counterparts. A new report
names its closest legacy report and says what is different.

How the pieces relate:
- **Dashboards** show `metric_key`s (05) and drill into reports.
- **Worklists** (06 §6) are queues that hold follow-up state.
- **The new reports here** are the analysis layer between them. Each runs on the same `rpt_*` datasets and the same
  metric registry, and its totals reconcile with the dashboard tile that opens it (`reconciles_with`, 02 §15.3). Where
  the answer is a queue of patients, claims or accounts to work, the report drills to the worklist instead of
  duplicating it.

Abbreviations in "Called for by":

| Abbreviation | Source |
|---|---|
| KPI §n | `research/dental_kpi_dictionary.md` |
| CT TS-n / D-n / I-n | `research/competitor_analytics_teardown.md` §5 table stakes, §5 differentiators and §6 feature ideas |
| DSO §n | `research/denticon_analytics_and_dso.md` |
| 06 §n | the dashboard or tile that drills here or shows the metric |
| 08 §6.8 #n | an audit report whose key and source `08_security_compliance.md` already fixed. It is specified here |

The phase column gives the phase and the data item it waits for. Data availability codes are those of
`catalog/reference/coverage_matrix.md`:
- **H**: works on migrated history.
- **APP**: app-era data only.
- **REPAIR(n)** and **SCHEMA(n)**: waits for DATA-n.

## Overview

### Financial and revenue cycle (19)

| report_key | Title | Purpose in one line | Closest legacy report (what is different) | Called for by | Phase |
|---|---|---|---|---|---|
| `analytics.production_trend_mix` | Production trend and mix | Gross, charged and net production per month, with PY, by category, then code, by doctor / hygiene / other and by payer, with shares and production per procedure | `daily.production_analysis_report` (one range and one cut; no period columns, PY, shares or net basis) | KPI §3.1, §3.9; CT TS-1; 06 §2.5 "By category, then code", "By carrier" | P2. H; production-adjustment codes on history REPAIR(12) |
| `analytics.production_vs_schedule` | Actual versus scheduled production | For each office-day and provider: production scheduled at start of day, what was added, what was lost to breaks and what was actually produced, so schedule accuracy and same-day additions show | `daily.scheduled_production` (forward look only; no start-of-day freeze, no comparison with what was produced) | KPI §3.1; 06 §2.4 "Unplanned and schedule variance", §2.8 "Schedule accuracy" | P4. APP; SCHEMA(48) start-of-day snapshot |
| `analytics.collections_trend_mix` | Collections trend and mix | Gross and net collections per month, with PY, by payer (patient, insurance, carrier), tender class and office, with patient share and the four collection % variants side by side | `daily.collection_report` (one range, list or code grouping; no trend, no PY, no variants) | KPI §3.2; CT TS-1, I-38; 06 §2.6 "By payer and tender", "Collection %" | P2. H; carrier on payments APP / SCHEMA(33); tender on history REPAIR(12) |
| `analytics.payment_lag` | Service-to-payment lag | How long money takes to arrive after service, by payer, carrier, provider and office: lag buckets (0, 1-30, 31-60, 61-90, over 90 days), payment-weighted days, share collected by day 30 and day 90 | `monthly.waterfall_report` (collected to date by service month, with no lag distribution by payer) | KPI §3.2 `days_to_payment`; DSO §14.6; 06 §2.6 "Speed" | P2. Derived oldest-first allocation on history (marked `is_derived`), patient side only: insurance side of migrated months `not_available` (claim turnaround shown instead); persisted allocation SCHEMA(26) |
| `analytics.adjustment_writeoff_analysis` | Adjustments and write-offs | Adjustments by class (contractual, discretionary or courtesy, bad debt, correction, refund), code, provider, entering user and carrier, with write-off rates against office-fee and charged production | `daily.special_transaction_report` (a transaction list by code; no class roll-up, no rates, no carrier) | KPI §3.12 FRO-08; DSO §14.6; 06 §2.5 "Write-offs and adjustments", §2.6 "Bad debt" | P2. Class on history REPAIR(12); carrier of write-offs APP |
| `monthly.ar_trend` | A/R trend and days outstanding | A/R at each month end: ageing buckets, patient and insurance split, credit balances, over-90 %, days in A/R and DSO variants, by office (transaction or home attribution) | `monthly.aging_report` (one as-of date, no trend) | KPI §2.8, §3.2; CT TS-3, I-38; 06 §2.6 "A/R trend", §2.1 receivables rows | P2. Frozen from the first snapshot SCHEMA(30); earlier month ends recomputed and labelled `recomputed` |
| `management.time_of_service_collection` | Time-of-service collection | Estimated patient portion collected on the day of service, by office, provider, check-out user and weekday; uncollected amount and its later recovery | `management.uncollected_copay` (a one-day list of who still owes; no rate, no trend, no user) | KPI §3.2, §3.12 FRO-05; DSO §14.6; 06 §2.4 "Money at the desk", §2.6 "Time of service" | P2. H with derived patient portion (k13) |
| `management.payment_plan_portfolio` | Payment plans and financing | Regular and ortho contracts: count, remaining balance, instalments due against posted and paid, delinquency rate and days, financing-tender share of patient collections | `management.payment_plan_charges` (instalments due on one billing date) and `lists.patients_on_payment_plan` (roster) | KPI §3.2, §3.11; CT I-37; 06 §2.6 "Work queues" (`worklists.payment_plan_overdue`) | P2. APP (no contract migrated); SCHEMA(37) |
| `analytics.fee_realization` | Fee schedule and UCR realisation | Per code and fee schedule: UCR, scheduled fee, average posted fee, average collected per procedure, realisation %, volume. Lists codes posted at zero or unpriced, and codes billed below the schedule in force | `lists.procedure_codes_by_fee_schedule` (setup listing; no volume, no posted or collected amounts) | CT I-24 (internal part only); KPI §3.1 `implied_writeoff`; 06 §2.5 "Data quality" (`unpriced_charge_count`) | P2. Fee lookup DATA-51; collected per line SCHEMA(26); history H for fees |
| `insurance.payer_mix_profitability` | Payer mix and plan profitability | Per carrier and plan: patients, insured share of production, contractual write-off rate, collected per procedure and per chair hour, days to pay, denial rate | `daily.production_report` by carrier (production only; no write-off, speed or yield by payer) | KPI §3.3; DSO §14.6 "payer mix with time to collect"; 06 §2.7 "Payers" scorecard | P2. Payer on the service date SCHEMA(33) (history uses today's coverage, k12); yield columns on service months at least 90 days old; chair hours P3 |
| `insurance.claim_cycle_performance` | Claim cycle and first-pass performance | Claims by carrier, office, provider and user: submission lag, same-day rate, turnaround to first payment, first-pass rate (proxy), resubmissions, secondary-claim lag after primary payment | `insurance.claims_list` (claim rows by status; no cycle statistics) | KPI §3.3; DSO §14.6; CT TS-4; 06 §2.7 "Speed and quality", "Claims submitted" | P2. Stage timing APP from DATA-25; migrated claims REPAIR (k5) |
| `insurance.denial_analysis` | Denial analysis | Denied claims and amounts by reason and remark code, carrier, procedure code, provider and office, with recovery after appeal or resubmission | `insurance.835_denial_report` (ERA denials only, needs a clearinghouse; no recovery outcome) | DSO §14.6 "Denial analytics"; CT I-37; 06 §2.0.4 "Denial counts", §2.7 "Work queues" | P3. APP; SCHEMA(31) manual denial fields (P2); held at P3 by its queue `worklists.denied_claims` (P3); ERA reason codes only with DATA-38 |
| `insurance.eligibility_verification_compliance` | Eligibility verification compliance | Share of insured appointments verified within the validity window before the visit, by office, user, carrier and lead time; not-eligible findings and their visit outcome | `insurance.dps_eligibility_report` (verification list for a date; no compliance rate or outcome) | KPI §3.3 RCM; CT TS-4; 06 §2.7 "Eligibility", §2.16 "Insurance desk" | P3. APP; history of verifications SCHEMA(34) (P2); held at P3 by the eligibility metrics of 05 and `worklists.eligibility_verification` (P3) |
| `daily.day_close_reconciliation` | Day close and deposit reconciliation | For each office-day: posted payments by tender against deposited amounts, undeposited remainder, close status, who closed it and when, corrections after close; month-lock status | `daily.deposit_slip` (one deposit's contents; no ledger-to-deposit variance, no close history) | KPI §6 routines (end of day, end of month); CT TS-2; 06 §2.6 "Cash controls" | P2. APP; SCHEMA(28), SCHEMA(29) |
| `analytics.cash_conversion_waterfall` | Cash-conversion waterfall | From office-fee production to estimated cash over the trailing 12 months, stage by stage: contractual, time-of-service balance still open after the recovery window, bad debt, A/R over 90 at risk net of that balance. Each stage lists its rows | `monthly.waterfall_report` (collections by service month, not stage losses) | DSO §14.6; KPI §3.13 DSO-08; 06 §2.7 "Cash conversion" (drill target "stage lists"), §2.14 "Revenue cycle" | P4. H for stages (k1, k13); A/R stage from open items of the window's debits, frozen month-end total as a check SCHEMA(30) |
| `management.provider_pay_basis` | Provider pay basis | For each provider, pay period and office: production, adjusted (net) production, allocated collections, lab fees and refunds/reversals. These are the inputs of production-, collection- or lab-net pay, shown side by side | `monthly.income_allocation` (allocated income only; no production basis or lab deduction) | DSO §14.7, §15 #17 | P2. Allocations SCHEMA(26); frozen bases for locked periods SCHEMA(29), SCHEMA(30); lab fees DATA-23 (APP); pay rules not stored (no pay is computed) |
| `insurance.claims_backlog_trend` | Claims backlog trend | Outstanding claims at each month end by carrier, claim age bucket, tier and office: amount, count, share over 90 days, and the movement between month ends (sent, paid, closed, written off) | `insurance.outstanding_claims` (one report date, claim rows; no trend, no carrier ageing over time) | KPI §3.3 RCM-01, §6 (end of month: claims ageing); DSO §14.6; 06 §2.7 "Backlog trend", "By carrier" | P2. Frozen month ends SCHEMA(30); earlier month ends recomputed with `rpt_claim_facts_as_of()` SCHEMA(31), status exact from DATA-25 capture |
| `insurance.estimate_accuracy_analysis` | Insurance estimate accuracy | Primary estimate against what the carrier paid and wrote off, by carrier, plan, code and code category, and the patient balance left after the EOB against the patient estimate given at the desk | `insurance.claims_list` (claim rows; no estimate-to-paid comparison by carrier or code) | KPI §3.3 RCM-11; 06 §2.7 "Payers" (`insurance_estimate_accuracy_pct`) | P2. APP (remittance lines); estimate frozen at claim creation SCHEMA(49) (P4) |
| `statements.statement_collection_effectiveness` | Statement and collections effectiveness | Per statement run and month: accounts billed, amount due, accounts paying and amount collected within 30 and 60 days, days to first payment, failed deliveries; accounts sent to collections and agency recovery | `lists.responsible_party_statements_sent` (statements sent, no payment outcome); `lists.responsible_party_sent_to_collection` (roster, no recovery) | KPI §6 (end of month: statements, A/R review), §3.2 COL-10; 06 §2.6 "Over 90 days" | P2. APP (no statement was migrated); run header SCHEMA(22); collection stage and date SCHEMA(35) |

### Schedule, hygiene, treatment, patients and providers (14)

| report_key | Title | Purpose in one line | Closest legacy report (what is different) | Called for by | Phase |
|---|---|---|---|---|---|
| `appointment.schedule_utilization` | Schedule utilisation and capacity | For each provider, operatory and day: scheduled hours, booked hours, chair hours, open time, utilisation %, production per hour and per visit. Has a look-back format and a look-ahead (open time) format | `appointment.appointment_list` (appointment rows; no capacity or open time) | KPI §3.4; CT TS-7; 06 §2.8 "Provider utilisation", "Chair utilisation", "Open time ahead", §2.2 `provider_scheduled_hours` (no drill target in 06) | P3. Capacity uses today's template (k10); capacity history SCHEMA(43) |
| `appointment.broken_appointment_analysis` | Cancellations, no-shows and recovery | Broken-appointment rates by weekday, lead time, notice, patient kind, provider and reason; recovery %, days to rebook, value lost; repeat patients | `appointment.appointment_list` Cancelled / Missed lists (rows only; no rates, recovery or repeat view) | KPI §2.7, §3.4; CT TS-7; 06 §2.8 "Broken appointments", "Recovery", "By weekday and patient kind" | P3. H for status rates; reasons and notice APP / SCHEMA(17) |
| `appointment.patient_flow_times` | Patient flow and wait times | Check-in to seated, seated to check-out and late starts, by provider, operatory, weekday and appointment type | `appointment.appointment_time_stamps` (stamps per appointment; no durations or distributions) | CT §3.1 (huddle anatomy); KPI §3.4 | P3. APP; SCHEMA(17) stamps; type SCHEMA(43) |
| `recall.recare_effectiveness` | Hygiene reappointment and recall effectiveness | The four hygiene reappointment variants by hygienist, visit kind and carrier. Also pre-appointment %, recall overdue bands, and retention by code group (child prophy, adult prophy, SRP, perio) | `recall.scheduled_recall_report` and `recall.recall_due_report` (patient lists; no rates or retention) | KPI §2.5, §3.5; CT I-39; 06 §2.9 "Reappointment", "Recall position", "Retention" | P3. H via derived recall intervals; maintained recall SCHEMA(41); at-visit variants APP |
| `analytics.clinical_mix` | Procedure and perio mix | Procedure mix by code group and provider as per-visit rates: perio patient %, SRP per day, adjuncts, fluoride, bitewings at recare, FMX/pano for new patients, crowns and endo per exam. Compared with the office and organisation | `daily.production_analysis_report` (counts and fees per code; no per-visit ratios, no peer comparison) | KPI §3.5, §3.9; CT I-39; 06 §2.9 "Perio and adjuncts" | P3. H (code groups DATA-04) |
| `treatment_plan.clinical_follow_through_gaps` | Clinical follow-through gaps | Patients for whom code group A was completed with no follow-on group B within N months. Pairs: root canal without crown, SRP without perio maintenance, extraction without replacement, crown prep without seat. Has bulk outreach | `treatment_plan.treatment_plan_status` (planned items only; misses follow-ons never planned) | CT I-13 (has / lacks code logic, P0), §5 TS-5; 06 §12.5 ideas 13-14 "partly" | P3. H (works on migrated charges) |
| `treatment_plan.case_acceptance_funnel` | Case acceptance funnel | Cohorts by diagnosed month: presented to accepted to scheduled to completed, by provider, counsellor and category. Also time to schedule and complete, presentation per exam by provider (format `presentation`), and ageing of the unscheduled backlog with remaining benefits | `treatment_plan.treatment_plan_analysis` (status totals for one range; no cohort stages or time to schedule) | KPI §2.6, §3.6; CT I-40, D-13; 06 §2.10 "Presented", "Funnel", "Acceptance", "Completion", "Unscheduled treatment" | P3. APP; DATA-56, events DATA-25, office SCHEMA(39) |
| `analytics.new_patient_acquisition` | New patient acquisition and conversion | New patients by source, booking channel, zip, office and provider; first-visit production, imaging and reappointment; conversion to a second visit within 6 and 12 months | `lists.patient_list_new_patient` (roster) and `referral.referral_summary_report` (counts by source; no conversion) | KPI §3.7; CT TS-6; 06 §2.11 "New patients", "First-visit quality", "Where new patients come from" | P3. H for visits; source SCHEMA(40); channel SCHEMA(17) |
| `analytics.patient_retention_cohorts` | Retention, attrition and the active base | Retention curves by first-visit cohort at 6, 12, 18 and 24 months. Includes an active-base bridge per period (start + new + reactivated - lost = end), attrition and reactivation by office and provider | `lists.patient_list` (status today; no cohort or flow) | KPI §2.4, §3.7; CT I-18; 06 §2.11 "Base", "Flow", "Retention" | P3. H (visit history); losses by status change SCHEMA(44) |
| `analytics.patient_value` | Patient and family value | Annual and lifetime production and collections per patient and per guarantor account, by first-visit cohort, source, payer type and office. Has a top-accounts list | `referral.referral_production_list` (production by referral source, not per patient or account over time) | KPI §3.7; DSO §14.4; 06 §2.11 "Value" | P4. H for production; collections SCHEMA(26) |
| `analytics.provider_scorecard` | Provider scorecard | Providers x metric set (doctor or hygienist set of 05 §5.8) for a period, with office value, peer median and quartile, goal and band. The monthly review sheet per provider | `my_reports.production_report` and `monthly.income_allocation` (production or income alone, one provider) | CT I-7, TS-10, D-12; KPI §3.8; 06 §3.4, §2.9 "Hygienist scorecard" | P4. Metrics P1-P3; peers ENG-51 |
| `appointment.lab_case_performance` | Lab case performance | For each lab and provider: cases, turnaround, late share, cases not back before the appointment, lab cost and lab cost % of production | `appointment.lab_cost_report` (cost per case; no turnaround or lateness) | KPI §3.9; 06 §2.0.4 lab metrics | P3. APP (DATA-23) |
| `ortho.ortho_contract_health` | Ortho starts, debonds and contract health | Exams to starts, starts per debond, active base, beyond planned end, no next appointment, remaining to bill, unposted instalments, delinquent contracts, by month and orthodontist | `ortho.patients_by_ortho_status_with_time_in_treatment` (status roster; no flow, conversion or contract money) | KPI §3.11; 06 §2.13 | P3. APP; SCHEMA(42) |
| `analytics.revenue_opportunity` | Revenue opportunity | Recoverable revenue by category (unscheduled treatment, recall due, broken appointments, unbilled, outstanding claims, patient A/R past due), ranked by value, with a what-if rate. Each category opens its worklist | none (dashboards show the counters separately) | CT I-12; KPI §8 (leading indicators) | P4. As the worklists' datasets |

### Multi-office, executive, marketing, staff and control (16)

| report_key | Title | Purpose in one line | Closest legacy report (what is different) | Called for by | Phase |
|---|---|---|---|---|---|
| `analytics.office_comparison` | Office comparison and same-store growth | Offices and office groups x a metric pack (`core`, `rcm`, `clinical`) with group subtotals, ranks, rank movement, median and top-quartile comparators, and per-working-day values. The same-store format names the comparable offices and the reason for each exclusion | `monthly.executive_summary` run office by office (no ranking, comparators or same-store set) | DSO §14.2-§14.4; KPI §3.13; CT I-22; 06 §2.14 "Office scorecard", "Same-store growth" (drill target "office scorecard"), §5 | P4. H (k1); groups need office groups set up |
| `analytics.cross_office_patient_flow` | Cross-office patient flow | Patients, visits and production by home office x office of service; patients seen at two or more offices; internal referrals to sister offices and whether they were completed there | `lists.patients_seen` (patients by office; no office pairs, no home-office view) | DSO §14.2 (consolidated roll-ups across locations); KPI §3.13; 05 `office_pair`, `cross_office_patients`; 06 §2.11 "Across offices" | P4. H (visit history); internal referrals APP |
| `analytics.goal_attainment` | Goal attainment and pacing | Production against goal by provider, office and group for the month and year to date: percent of goal, needed per remaining working day, forecast (done + scheduled), run-rate projection | `daily.scheduled_production` ("Estimated Prod." column only; no attainment or pacing) | KPI §7; CT TS-10, I-3, I-8; DSO §14.8; 06 §4, §2.1 / §2.2 goal rows, §2.5 "Production to goal" (drill target "goal rows") | P3. Goals DATA-24 / MET-17 (no migrated goals) |
| `referral.referral_source_return` | Referral and marketing source return | By source (patient, doctor, campaign, online): new patients of matured first-visit cohorts, production and collections of those patients over 12 and 24 months, referral cost. Cost per new patient and return on spend once spend is entered. Conversion by source is in `analytics.new_patient_acquisition` | `referral.referral_production_list` (production of referred patients; no conversion, cost or return) | CT D-14, I-41; KPI §3.10; DSO §14.4; 06 §2.12 "Value by source", "Cost per new patient" (no drill target in 06) | P3. Links SCHEMA(40); cost columns P4, NEW `marketing_spend` input (05 §5.10) |
| `analytics.online_booking_funnel` | Online booking funnel | Booking requests to approved to appointment to kept to new patient to first-visit production. Shown by office, request type, emergency flag, hour received and response time | `lists.online_registered_patients` (registrations; no request funnel) | KPI §3.10; CT I-42; 06 §2.12 "Online booking", §2.8 "Booking activity" | P3. APP; registered passthrough of the existing `booking_requests` table (as `lists.online_registered_patients` reads it) |
| `analytics.communication_effectiveness` | Reminder, confirmation and campaign effectiveness | Messages sent to delivered to replied or confirmed to kept or booked, by channel, message type, lead time and office. Shows no-show rate of confirmed against unconfirmed visits, undeliverable contacts and campaign appointments | `appointment.appointments_confirmed_via_vendors` (confirmed list; no funnel or outcome) | CT D-14, I-42; KPI §3.10; 06 §2.12 "Communication funnel", "Campaigns", §2.8 "Confirmations" | P3. APP; SCHEMA(43); migrated texts heuristic |
| `analytics.outreach_results` | Outreach results | Worklist attempts, outcomes, items resolved, and value scheduled and collected inside the attribution window. Shown by worklist, user, channel and outcome code | none (legacy Task Manager shows open tasks, not results) | CT D-6, I-11; 06 DASH-43 "Outreach results view" (no key in 06), §6.1 | P4. APP; `worklist_followups`, `worklist_events` (DASH-29) |
| `management.staff_productivity` | Staff hours against production | Clocked staff hours by office-day and role against production, collections, visits and appointments created. Also production per clocked hour and the hygienist production-to-wage ratio | `management.time_clock_report` (punches and totals; no output side) | KPI §3.8, §3.12, §3.13 DSO-11; 06 §2.9 "Wages", §2.1 "Clocked hours" | P3. Hours H (DATA-23); appointments created P3; format `wage_ratio` P4 (MET-27, class `payroll_wage`) |
| `management.time_clock_exceptions` | Time-clock exceptions | Missed punches, open shifts, edits after the fact (with editor), overtime, punches on closed days or outside office hours, by user and pay period | `management.time_clock_report` (lists punches; exceptions must be found by eye) | KPI §3.12; DSO §14.7 (payroll review) | P2. H; edits from `time_clock_entry_edits` through `rpt_audit_events` (DATA-36) |
| `management.report_access_log` | Report access log | Who ran, viewed, exported, printed, downloaded or delivered which report, with patient counts and the watermark resolver | none | 08 §6.8 #4; DSO §15 #21 | P1. Engine audit (`report_audit_events`) |
| `management.patient_report_access` | Patient report access | For one patient: every report run, view, export, print, delivery and action that contained the patient | none | 08 §6.8 #6 | P2. Engine audit; `report_audit_patient_index` |
| `management.transaction_exceptions` | Transaction exceptions | Deleted, voided, changed and back-dated money entries; post-close corrections; adjustments and refunds by user. Adds formats `fee_overrides` (posted fee differs from the schedule in force) and `after_hours` | `management.audit_trail` (raw change events; no money-exception taxonomy) | 08 §6.8 #10; KPI §3.12 FRO-08; KPI §6 (deleted-transaction reports) | P2. SCHEMA(13), SCHEMA(14), SCHEMA(29); fee overrides DATA-51 (schedule of the charge, else the patient's schedule, labelled) |
| `management.user_activity_review` | User activity review | For each user: changes, prints, exports and patients touched per day. Flags activity after hours, on closed days, from other offices, or above the user's own baseline | `management.audit_trail` (events by user; no baseline or after-hours test) | 08 §6.8 (review reports, O-2); KPI §6 | P2. APP; writes and report events only (reads are not audited, data card §2.27) |
| `management.data_quality_exceptions` | Record data-quality exceptions | Record-level gaps that distort reports or block work: patients without responsible party or insurance details, new patients without source, appointments without procedures, visits without notes, possible duplicate patients (name + birth date), unpriced charges | `daily.daily_audit` (visit completeness for a day only) | KPI §3.12 FRO-09; 06 §2.5 "Data quality", §2.12 `new_patients_missing_source_pct` | P2. H; checks of DATA-02 |
| `management.setup_integrity` | Setup integrity | Organisation-level setup problems: inactive or unflagged procedure codes in use, unclassified payment and adjustment codes, providers without `provider_kind`, offices without a schedule template, fee schedules with gaps, carriers without a payer id | `lists.procedure_codes_list`, `lists.credit_codes_report` (listings; no in-use or gap tests) | 03 §6 readiness checks; 06 §2.8 "schedule not configured", §2.1 `unclassified_adjustments` | P1. H; DATA-02, DATA-03, DATA-04, DATA-05 |
| `management.report_usage` | Report usage and health | Most and least run reports and views, slowest runs, timeouts and failures, schedules failing or skipped, exports by format, unused saved views | none | DSO §15 #21; 02 `GET /reports/stats` | P2. Engine tables `report_runs`, `report_schedules`, `report_deliveries` |

## Shared rules

**Identity.**
- Every report here is `kind = standard`, `paging_mode = snapshot` and `side_effects = none`. Every report is
  `schedulable = true` except a single-patient report, which is `schedulable = false` because a stored patient id in a
  saved view or schedule row is PHI: `management.patient_report_access`.
- None is a worklist. Where rows need follow-up, the report drills to a worklist of 06 §6.
- `legacy = null` and `legacy_names = []`. AD-8 parity rules do not apply.
- `keywords[]` carry the market names of the concept (for example "Revenue Finder", "Provider Pulse", "matchback") so that
  hub search finds them.
- Category key `analytics` is NEW. Brief §4 lists no such key, so this is a challenge recorded against the brief. Its
  registry entry is owned by `02_architecture.md` §3.1 and its hub group "Analytics" by `07_ux_blueprint.md`.
- Keys in other categories sit in their subject's hub group.
- Audit reports of 08 §6.8: this document specifies the ones that analyse use of the report engine and of the ledger -
  #4 `management.report_access_log`, #6 `management.patient_report_access` (both read the engine's own audit tables),
  #10 `management.transaction_exceptions` (ledger) and the review report `management.user_activity_review`. Compliance
  registers and control checks (#5, #7, #8, #9, #11) stay specified in 08.

**Standard parameters.** Keys come from `catalog/reference/filter_card.md` §3. NEW keys are owned by
`04_filter_framework.md`.

| Parameter (value keys) | Type | Default | Rule |
|---|---|---|---|
| `office_scope` (`office_ids`, `office_group_id`, `office_group_ids`, `all_offices`) | `office_scope` | `working_office`; `all` on `analytics.office_comparison` | A working context, never a fence. `all` = every office the caller may read. Office column = `scope.office_attribution` (PD-6). A multi-office run adds the `Office : <name>` outer band (`fixed_outer` with `["ctx", "multi_office"]`) and an organisation total |
| `office_attribution` | `enum` | per report (PD-6) | NEW in 04 (06 §2.6 request): `transaction_office` or `home_office` on A/R and patient reports; `visit_office` (rows on `rpt_visits`; non-additive across offices, organisation total deduplicated) on patient-activity reports only; printed in the criteria echo |
| `date_range` (`date_from`, `date_to`, `date_preset`) | `date_range` | `last_month` on period reports, `month_to_date` on operational reports, `trailing_12_months` on trend reports; matured cohorts on cohort formats; `last_12_month_ends` on month-end trends | Inclusive, office-local. Fixed `date_basis` per report (AD-9, PD-8), printed. Cohort formats apply the range to the cohort date and state the window. NEW presets in 04: `matured_12m_cohorts` (`start_of_month-23m` .. `start_of_month-12m-1d`: twelve cohort months whose 12-month window has closed), `matured_24m_cohorts` (`start_of_month-35m` .. `start_of_month-24m-1d`), `last_12_month_ends` (`start_of_last_month-11m` .. `end_of_last_month`: twelve complete months, so twelve month ends). The resolved range and the maturity rule print in the criteria echo |
| `report_date` | `date` (role `as_of`) | `today` | Point-in-time reports and blocks. A past date is served from snapshots where they exist (DATA-30), otherwise recomputed and labelled `recomputed` |
| `compare_to` (`compare_date_from`, `compare_date_to`) | `enum` | `previous_year` on trend reports, `none` elsewhere | `none`, `previous_period`, `previous_year`, `goal` (P3, DATA-24), `custom` (filter card §12, `supports_comparison = true`). These reports use it from their own phase, not P4: request to 04 |
| `time_grain` | `enum` | `month` | NEW in 04 (06 §2.0.2): `day`, `week`, `month`, `quarter`, `year`; only grains the metrics allow (05 `time_grains[]`) |
| `provider_ids` | `entity_multi` | `all` | `provider_role` = `scope.provider_attribution` (PD-7). The office roster is listed first and nobody is excluded. Forced to `current_user_report_provider` under PD-11 on definitions with `provider_restriction = self_unless_privileged` |
| `production_group` | `enum` | `all` | NEW in 04 (06 §2.0.2): `all`, `doctor`, `hygiene`, `other` |
| `pay_period_grain` | `enum` | per `time_clock_settings` | NEW in 04: `week`, `biweekly`, `semi_monthly`, `month` - one vocabulary for `management.provider_pay_basis` and `management.time_clock_exceptions`; `week` and `biweekly` anchor on the payroll week (`week_start: payroll`, 04 §7.4) |
| `carrier_ids`, `procedure_category_codes`, `procedure_codes`, `user_ids`, `aging_buckets` | as filter card | `all` | Only where the report has that dimension |
| `report_format` | `enum` | `summary` | `summary` (metric x period or member), `detail` (the rows behind the totals). Some reports add named formats (`look_ahead`, `same_store`, `fee_overrides`) |
| `group_by`, `sort_by`, `page_break_by`, `output_format` | as filter card §3.9 | `none`, first option, `none`, `pdf` | `output_format` adds `csv`; `page_break_by` is `layout` |

**Numbers.**
- Every value is a `metric_key` of `05_metric_catalog.md`, read with the metric's own basis, attribution, settings and
  availability. The alternative is a dataset column of `catalog/reference/data_card.md`.
- A measure that 05 does not have is marked NEW in the specification and requested from 05, for example:
  - second-visit conversion
  - cohort retention at month N
  - wait-time durations
  - eligibility lead time
- No formula, code list or status list lives in a report definition.
- Ratios are recomputed from summed components (ratio of sums) at every level.
- Total rules use only the `total.fn` values of engine card §3 (`sum`, `count`, `count_distinct`, `min`, `max`, `avg`,
  `ratio`, `weighted_avg`, `share_of_parent`, `label`, `none`). A stock (A/R or an active base at a period end), a
  median or a percentile is written `none (builder: <rule>)`: the builder computes the value for every grouping set
  (`GROUPING SETS`) and the banding step passes it through, never sums it. Request to 02 §3.3: `total.fn` values `first`,
  `last`, `median`, `percentile(p)` and a per-axis rule for matrix shapes (one function over offices, another over
  periods); once they exist these columns switch to them.
- Money that arrives after the service (collections, explicit write-offs, payment lag) is measured on service months that
  ended at least `maturity_days` before the run date (NEW 05 setting, default 90). Younger months are `is_provisional`:
  shown dashed, kept out of yield totals, and the cut date prints in the criteria echo. One rule for
  `analytics.payment_lag`, `analytics.fee_realization`, `insurance.payer_mix_profitability` and
  `insurance.estimate_accuracy_analysis`.
- Splits show their residual row (`Unassigned`, `Unallocated`, `other`).
- `reconciles_with[]` binds each headline total to the metric that a dashboard tile shows for the same parameters.

**Standard outputs.**

| Block | Content |
|---|---|
| Summary cards | Headline values of the run, each a block total (engine card §3.7); comparison and variance when `compare_to` is set |
| Main block | Summary format: member x metric or metric x period table (`shape = matrix` for period columns), with comparison and variance columns, subtotals per group and a grand total. Detail format: the rows that sum to the totals |
| Charts | Hints of engine card §3.7 (trend, bars, funnel, ageing), computed on the server from the snapshot. "Show as table" is always present |
| Criteria echo | Date basis, office and provider attribution, `data_as_of`, source class (`live`, `snapshot`, `rollup`), resolved metric variants and settings version, and `availability[]` warnings ("history starts on <date>", `recomputed`, `is_derived`, proxy labels) |
| States | `no_data`, `not_available`, `restricted` and `suppressed` render as named states. A literal 0 appears only for a computed zero (06 §3.1) |
| Files | PDF `banded_table` landscape, criteria echo in the footer. XLSX with frozen header, outline groups and a criteria sheet. CSV per block. All rendered from the run snapshot (AD-6) |

**Cost and freshness.**
- `cost_class = interactive` by default.
- `background` for:
  - cohort reports (retention, funnel, lag, patient value)
  - any run spanning more than 13 months on live views
  - multi-office runs above the engine limits, until the P4 roll-ups (DATA-47, ENG-50) serve them.
- `freshness` follows the datasets. Closed months read frozen `month_end` rows once DATA-30 runs.

**Saved views, schedules and alerts.**
- Saved views are stored on the server (02 §8). The office is stored as the relative token `working_office` by default,
  so a view follows the user's working office (CT I-46).
- A shipped view per report covers the routine it serves (KPI §6), for example:
  - "Last month by office" on `analytics.office_comparison`
  - "Yesterday" on `daily.day_close_reconciliation`
- Schedules deliver an in-app notification and a link-only e-mail (PD-12), with `skip_if_empty` on exception reports.
- Threshold alerts are not report features. They are metric conditions on `report_schedules.condition` (06 §7, ENG-52,
  P4) that open the report.

**Rights and data classes** (codes of `catalog/reference/security_card.md` §2.2).
- A report opens with the View Only code of the report family of its subject. Print, export, schedule and share follow
  the action rights (PD-10).

| Reports | Family (right) | Classes |
|---|---|---|
| `analytics.production_trend_mix`, `analytics.production_vs_schedule`, `analytics.adjustment_writeoff_analysis`, `analytics.fee_realization`, `analytics.clinical_mix`, `daily.day_close_reconciliation` | `daily` | `financial_practice`; `provider_comp` when sliced by provider; `phi_identified` + `financial_patient` on detail rows |
| `analytics.collections_trend_mix`, `analytics.payment_lag`, `monthly.ar_trend`, `analytics.cash_conversion_waterfall`, `analytics.patient_value` | `monthly` | as above |
| `statements.statement_collection_effectiveness` | `statements` | `financial_practice`; detail rows `phi_identified` + `financial_patient` |
| `management.time_of_service_collection`, `management.payment_plan_portfolio`, `management.provider_pay_basis`, `management.time_clock_exceptions`, `management.staff_productivity` | `management` | `provider_pay_basis`: `provider_comp`. Time-clock reports: `payroll_time` (user restriction UR-2); the wage ratio needs `payroll_wage` |
| `insurance.*` of this list | `insurance` | `financial_practice`; detail rows `phi_identified` |
| `appointment.*`, `analytics.online_booking_funnel`, `analytics.communication_effectiveness` | `appointment` | `aggregate`; detail rows `phi_identified` |
| `recall.recare_effectiveness` | `recall` | `aggregate`, `provider_comp` by hygienist |
| `treatment_plan.*` | `treatment_plan` | `financial_practice`; `clinical` on code-pair detail |
| `analytics.new_patient_acquisition`, `analytics.patient_retention_cohorts` | `lists_patient` | `aggregate`; detail `phi_identified` |
| `referral.referral_source_return` | `referral` | `financial_practice` |
| `ortho.ortho_contract_health` | `ortho` | `financial_practice` |
| `analytics.provider_scorecard`, `analytics.goal_attainment` | `analytics_provider_scorecards_view`; `analytics_goals_view` | `provider_comp`; `provider_restriction = self_unless_privileged`; peer values follow SC-1 (mean from 5 other providers, median or quartile from 10; never minimum or maximum of others) |
| `analytics.office_comparison`, `analytics.cross_office_patient_flow` | `analytics_office_comparison_view` (+ `office_scope_view_all_offices` for `all`) | comparators and office pairs over the caller's readable offices only (06 §5.4); cross-office detail rows `phi_identified` |
| `analytics.revenue_opportunity`, `analytics.outreach_results` | each category or worklist needs its own family; a category without one is `restricted` | `outreach_results` by user: `user_activity` |
| `management.report_access_log`, `management.patient_report_access`, `management.transaction_exceptions`, `management.user_activity_review` | `audit` (08 §6.8) | `user_activity`; `phi_identified` on patient-level formats; office rule S-14 |
| `management.data_quality_exceptions`, `management.setup_integrity`, `management.report_usage` | `management`; `report_usage` needs `reports_runs_manage_all` | `setup_integrity` is organisation-level (`office_mode = none` justification, 08 S-10); detail rows `phi_identified` |

- A provider-restricted caller never receives an office total from which another provider's value can be derived (PR-8).
- Patient-level detail never goes to an outside recipient without SC-2.

**Drill conventions.**
- Drills use the `{std}` parameter map of 06 §2.0.4: clicked period → `date_from` / `date_to` (or `report_date`), member
  → `office_ids` / `provider_ids` / `carrier_ids` / `procedure_codes` / `user_ids`, and the report's `date_basis`.
- Every total drills to the rows that sum to it: `kind = rows` (the detail format), or the legacy report or worklist
  named in its specification.
- A ratio offers its numerator list and its denominator list separately.
- A row opens its record (patient, claim, appointment, ledger entry) through `route_key`s owned by 07.
- Before a worklist ships, a drill to it falls back to the worklist's print counterpart (06 §2.0.4 phase fall-back).

Dashboard drill targets that are worklists are served by the worklist definitions of 06 §6, not specified again here:

| Worklist (06) | Section | Worklist (06) | Section |
|---|---|---|---|
| `worklists.eligibility_verification` | §6.3 | `worklists.unconfirmed_appointments` | §6.10 |
| `worklists.unsigned_progress_notes` | §6.4 | `worklists.unallocated_credits` | §6.11 |
| `worklists.unscheduled_treatment` | §6.5 | `worklists.reactivation` | §6.12 |
| `worklists.recall_due` | §6.6 | `worklists.not_reappointed` | §6.12 (P1 read-only, DASH-53) |
| `worklists.outstanding_claims` | §6.7 | `worklists.unbilled_procedures` | §6.12 |
| `worklists.patient_ar` | §6.8 | `worklists.unresolved_appointments` | §6.12 |
| `worklists.broken_appointments` | §6.9 | `worklists.todays_patients` | §6.12 |
| `worklists.denied_claims` | §6.12 | `worklists.day_close_checklist` | §6.12 (P2) |
| `worklists.payment_plan_overdue` | §6.12 | `worklists.lab_cases_due` | §6.12 |
| `worklists.my_followups` | §6.12 | | |

**Drill map changes for 06.** Rates, trends and analyses move to the new report; row lists stay on the legacy report
or worklist, and the new report drills on to them. 06 adds these rows to the drill map of 2.0.4 (or as tile `drill`
overrides) in the phase of each report; before that phase the tile keeps today's target (phase fall-back). The table is
an input of the DASH-01 lint: a new key that is not in the registry, or served later than its tile, fails the build.

| 06 tile | Metric keys | Drill target in 06 today | New target | Stays on today's target |
|---|---|---|---|---|
| §2.5 "By category, then code", "By carrier" | `category_production_share_pct`, `insured_production_share_pct`, `revenue_per_procedure` | `daily.production_analysis_report`; `daily.production_report` | `analytics.production_trend_mix` (`mix_dimension` = `category_code` / `payer`) | amounts: `daily.production_report` |
| §2.5 "Write-offs and adjustments"; §2.6 "Bad debt" | `writeoff_rate_pct`, `contractual_writeoff_rate_pct`, `bad_debt_rate_pct`, NEW `discount_rate_pct` | `daily.special_transaction_report` | `analytics.adjustment_writeoff_analysis` | amounts: `daily.special_transaction_report` |
| §2.5 "Production to goal"; goal rows of §2.1, §2.2; §2.4 "Where we stand" | `production_goal`, `production_vs_goal_pct`, `daily_avg_needed_to_goal`, `production_forecast` | "goal rows" (no key) | `analytics.goal_attainment` | — |
| §2.5 "Data quality"; §2.4 "Day hygiene" | `unpriced_charge_count` | `daily.production_report` | `management.data_quality_exceptions` (`check_keys = ['unpriced_charge']`) | — |
| §2.6 "Collection %", "By payer and tender" | `collection_pct` and its variants, `patient_collection_share_pct` | `daily.collection_report` (numerator) | `analytics.collections_trend_mix` (format `rates`; `mix_dimension = payer`) | amounts: `daily.collection_report` |
| §2.6 "Time of service"; §2.4 "Money at the desk" | `otc_collection_pct` | `management.uncollected_copay` | `management.time_of_service_collection` | `uncollected_copay_amount` of one day: `management.uncollected_copay` |
| §2.6 "Speed" | `days_to_payment` | `monthly.aging_report` | `analytics.payment_lag` | `ar_days`: `monthly.ar_trend` |
| §2.6 "A/R trend" | `total_ar`, `ar_over_90_pct` at month ends | `monthly.aging_report` | `monthly.ar_trend` | a month-end cell opens `monthly.aging_report` from the report |
| §2.6 "Over 90 days" | `patient_ar_past_due_amount` (statement follow-up) | `worklists.patient_ar` | `statements.statement_collection_effectiveness` (tile menu "Statement results") | accounts: `worklists.patient_ar` |
| §2.6 "Cash controls"; §2.16 "Day controls" | `day_close_compliance_pct`, `undeposited_payments_amount` | `daily.deposit_slip`; `worklists.day_close_checklist` | `daily.day_close_reconciliation` | days not closed: `worklists.day_close_checklist` |
| §2.6 "Work queues" (payment plans) | NEW `payment_plan_delinquent_contracts`, plan balances | `worklists.payment_plan_overdue` | `management.payment_plan_portfolio` | the queue: `worklists.payment_plan_overdue` |
| §2.7 "Payers" | `contractual_writeoff_rate_pct`, `insurance_collections` by carrier | `daily.production_report` / `daily.collection_report` | `insurance.payer_mix_profitability` | amounts: the legacy reports with `carrier_ids` |
| §2.7 "Payers" | `insurance_estimate_accuracy_pct` | `insurance.claims_list` | `insurance.estimate_accuracy_analysis` | claim rows: `insurance.claims_list` |
| §2.7 "Speed and quality", "Claims submitted" | `same_day_claim_rate_pct`, `claim_submission_lag_days`, `first_pass_claim_rate_pct`, `claims_submitted_count` | `insurance.claims_list` | `insurance.claim_cycle_performance` | claim rows: `insurance.claims_list` |
| §2.7 "Speed and quality"; 2.0.4 denial counts (P3) | `denial_rate_pct`; denied amounts by reason | `insurance.claims_list`; `worklists.denied_claims` | `insurance.denial_analysis` | open denials: `worklists.denied_claims` |
| §2.7 "Backlog trend" (no target today), "By carrier" | `outstanding_claims_amount`, `outstanding_claims_count`, `claims_over_90_pct` over month ends | —; `worklists.outstanding_claims` | `insurance.claims_backlog_trend` | today's claims: `worklists.outstanding_claims` |
| §2.7 "Eligibility"; §2.16 "Insurance desk" | NEW `eligibility_verified_in_time_pct` (history) | — | `insurance.eligibility_verification_compliance` | `eligibility_verified_pct` (next days): `worklists.eligibility_verification` |
| §2.7 "Cash conversion"; §2.14 "Revenue cycle" | `cash_conversion_waterfall_amount` | "stage lists" (no key); `dashboards.insurance_rcm` | `analytics.cash_conversion_waterfall` | — |
| §2.8 "Provider utilisation", "Chair utilisation"; §2.2 `provider_scheduled_hours` | `provider_utilization_pct`, `chair_utilization_pct`, `booked_hours`, `provider_scheduled_hours`, `chair_capacity_hours` | `appointment.appointment_list`; — | `appointment.schedule_utilization` | appointment rows: `appointment.appointment_list` |
| §2.8 "Open time ahead" | `open_time_pct` | Scheduler route | tile header: `appointment.schedule_utilization` (`look_ahead`) | a cell still opens the Scheduler day |
| §2.8 "Broken appointments", "By weekday and patient kind", "Recovery" | `cancellation_rate_pct`, `no_show_rate_pct`, `broken_appointment_rate_pct`, `broken_appointment_recovery_pct` | `appointment.appointment_list`; `worklists.broken_appointments` | `appointment.broken_appointment_analysis` | unrecovered appointments and `broken_appointment_value_lost`: `worklists.broken_appointments` |
| §2.8 "Schedule accuracy"; §2.4 "Unplanned and schedule variance" | `scheduled_production_start_of_day`, `actual_vs_scheduled_production_pct` | `daily.scheduled_production`; `daily.production_report` | `analytics.production_vs_schedule` | `scheduled_production` ahead: `daily.scheduled_production`; `same_day_treatment_amount`: `daily.production_report` |
| §2.8 "Confirmations"; §2.12 "Communication funnel", "Campaigns" | `reminder_delivery_rate_pct`, `reminder_confirmation_rate_pct`, `recall_outreach_yield_pct`, `campaign_appointments` | `worklists.unconfirmed_appointments`; `worklists.recall_due`; `appointment.appointment_list` | `analytics.communication_effectiveness` | `unconfirmed_appointments`, `confirmation_rate_pct`: `worklists.unconfirmed_appointments` |
| §2.8 "Booking activity"; §2.12 "Online booking" | `online_booking_requests`, `online_booking_conversion_pct` | `appointment.appointment_detail`; `lists.online_registered_patients` | `analytics.online_booking_funnel` | registrations: `lists.online_registered_patients`; `appointments_created`: `appointment.appointment_detail` |
| §2.9 "Reappointment", "Recall position", "Retention" | the hygiene reappointment keys, `recall_overdue_pct`, `recare_active_pct`, `hygiene_retention_12m_pct` | `worklists.not_reappointed`; `worklists.recall_due`; `daily.production_report` | `recall.recare_effectiveness` | patients not reappointed or overdue: the worklists |
| §2.9 "Perio and adjuncts" | `perio_patient_pct`, `perio_visit_share_pct`, `fluoride_rate_pct`, `bitewing_recare_pct`, `adjunctive_therapy_pct` | `daily.production_report` | `analytics.clinical_mix` | counts and amounts: `daily.production_report` |
| §2.9 "Hygienist scorecard"; §3.4 | hygienist set of 05 §5.8 | `dashboards.provider` | `analytics.provider_scorecard` (`scorecard_set = hygienist`) | — |
| §2.9 "Wages" | `hygienist_production_to_wage_ratio` | `management.time_clock_report` | `management.staff_productivity` (format `wage_ratio`) | `clocked_hours`: `management.time_clock_report` |
| §2.10 "Presented", "Acceptance", "Funnel", "Completion" | `treatment_presented_per_exam`, `diagnostic_pct`, the case-acceptance keys, `treatment_funnel_pct`, `case_completion_pct`, `acceptance_completion_gap_pp` | `treatment_plan.treatment_plan_status`; `treatment_plan.treatment_plan_analysis` | `treatment_plan.case_acceptance_funnel` (format `presentation` for the first two) | stage amounts and items: `treatment_plan.treatment_plan_status` |
| §2.11 "First-visit quality", "Where new patients come from" | `fmx_pano_new_patient_pct`, `new_patient_lead_days`, `new_patients` by `source_category` and `zip5` | `worklists.not_reappointed`; `lists.patient_list_new_patient` | `analytics.new_patient_acquisition` | `new_patient_reappointment_pct` complement: `worklists.not_reappointed`; patient rows: `lists.patient_list_new_patient` |
| §2.11 "Flow", "Retention" | `net_patient_growth_pct`, `attrition_rate_pct`, `reactivated_patients`, `patient_retention_12m_pct` | `worklists.reactivation` | `analytics.patient_retention_cohorts` | lost, at-risk and lapsed patients: `worklists.reactivation` |
| §2.11 "Value" | `patient_value_annual` | `daily.production_report` | `analytics.patient_value` | — |
| §2.11 "Across offices" | `cross_office_patients` | `lists.patients_seen` | `analytics.cross_office_patient_flow` | patient rows: `lists.patients_seen` |
| §2.12 "Value by source", "Cost per new patient" | `referral_source_production`, `cost_per_new_patient` | `referral.referral_production_list`; — | `referral.referral_source_return` | amounts: `referral.referral_production_list` |
| §2.12 "New patients by source" | `new_patients_missing_source_pct` | `referral.referral_summary_report` | `management.data_quality_exceptions` (`check_keys = ['new_patient_missing_source']`) | counts by source: `referral.referral_summary_report` |
| §2.13 the four ortho tiles | the ortho keys of 05 §5.11 | the ortho lists; `management.payment_plan_charges` | `ortho.ortho_contract_health` | patient lists and instalment rows: unchanged |
| 2.0.4 lab metrics | `lab_cost_pct`, `lab_turnaround_days` | `appointment.lab_cost_report`, `appointment.lab_report` | `appointment.lab_case_performance` | `lab_cost_amount` and case rows: the legacy reports |
| §2.14 "Office scorecard", "Same-store growth" | the scorecard members, `same_store_growth_pct`, `offices_growing_pct` | "office scorecard" (no key) | `analytics.office_comparison` | — |
| DASH-43; 2.0.4 `follow_up_completion_pct` (supervisor view) | `follow_up_completion_pct` | `worklists.my_followups` | `analytics.outreach_results` | the user's own items: `worklists.my_followups` |
| §2.16 "Day controls"; 2.0.4 audit rows | `voided_entries_count`, `backdated_entries_count` | `management.audit_trail` | `management.transaction_exceptions` | raw events: `management.audit_trail` |
| §2.8 "schedule not configured" state; §2.5 "Data quality" | `hours_source = 'default'`, `unclassified_adjustments` | office schedule setup; `daily.special_transaction_report` | `management.setup_integrity` | the setup screen link and the amounts stay |

**Data honesty.**
- Every specification states which rows work on migrated history, which are app-era only and which wait for a DATA item.
  The same statement is in `availability[]`, so it prints on the output.
- Migrated-only periods of an app-era measure render "history starts on <date>", never 0.
- Proxy measures keep the label "proxy" (first-pass rate, denial rate without ERA).
- The phase of a report is the latest phase among its datasets and metrics (brief §6). P4 reports are analytics depth:
  roll-ups, snapshots, goals overlay, peers.

## Candidates left out

| Candidate | Reason |
|---|---|
| Executive month-end pack | Answered by `dashboards.executive_summary` (twin report for print, export and digest, frozen month-end rows) plus `monthly.executive_summary` for literal parity |
| Guarantor follow-up priority list | Answered by `worklists.patient_ar` (sort by value or age, promise date, next appointment); a report copy would have no follow-up state |
| Credit balances report | `worklists.unallocated_credits` with `only_credit_balances` and `monthly.aging_report` with `only_credit_balances`; the month-end trend is a column of `monthly.ar_trend` |
| Unapplied and unallocated money report | `monthly.unallocated_payment_adjustments` and `worklists.unallocated_credits` |
| Unbilled and held procedures report | `worklists.unbilled_procedures`; print: `insurance.claims_not_created`, `insurance.procedures_on_hold`, `insurance.claims_created_not_sent` |
| Secondary claims not created | `insurance.claims_not_created` on the secondary tier (`rpt_unclaimed_charge_tiers`); the secondary lag is a column of `insurance.claim_cycle_performance` |
| Refunds and voids report | Formats of `management.transaction_exceptions` (voided entries, adjustments and refunds by user); refund totals are a class in `analytics.adjustment_writeoff_analysis` |
| Fee override report on its own | Requested as format `fee_overrides` of `management.transaction_exceptions` (a control view of the same entries); the price-level view is in `analytics.fee_realization` |
| Same-day treatment report | `daily.production_report` with the drill-only unplanned-lines parameter (06 §12.4) and `group_by` provider or code |
| Unscheduled treatment list or value report | `worklists.unscheduled_treatment`; the ageing summary is a format of `treatment_plan.case_acceptance_funnel` |
| Recall due, at-risk, lapsed, not-reappointed lists | `worklists.recall_due`, `worklists.reactivation`, `worklists.not_reappointed`; print `recall.recall_due_report` |
| Separate same-store growth report | Format `same_store` of `analytics.office_comparison` |
| Office-group roll-up report | Group subtotals of `analytics.office_comparison`; every report's `office_scope` accepts a group |
| RCM health score by office | `dashboards.insurance_rcm` (tile library, off by default, never without its five components, 06 §2.7); `analytics.office_comparison` offers it only under `metric_pack = custom` with its five components |
| Days sales outstanding report | Columns of `monthly.ar_trend` (`ar_days` variants) |
| Production and collections by provider or office | `analytics.provider_scorecard`, `analytics.office_comparison`, `daily.production_report` / `monthly.income_allocation` with `group_by` |
| Separate hygienist scorecard | `scorecard_set = hygienist` of `analytics.provider_scorecard` |
| Family and household view | Flag `unscheduled_family_members` of `worklists.todays_patients`; account-level value in `analytics.patient_value`; `lists.responsible_party_list` |
| Weekday x hour utilisation heatmap | No hour-of-day dimension in 05 (06 D-8) |
| Predictive no-show, attendance or acceptance scores | Not in this plan (06 §12.5, CT I-36) |
| Suggested patients for an open slot | A Scheduler feature, not a report (CT I-6; 06 D-7) |
| External fee or KPI benchmarks (zip percentiles, peer cohorts) | No external data; PD-13 keeps benchmarking inside one organisation |
| Overhead, EBITDA, P&L, budget to actual | No general-ledger expense data in DentC (KPI §3.13 DSO-06, DSO-07) |
| Staffing and recruitment | No HR data (KPI §3.13 DSO-11) |
| True clean-claim rate, ERA reconciliation | Needs a clearinghouse (DATA-38); legacy `insurance.eob_835_claims_reconcile_report` and `insurance.835_denial_report` cover it when one exists |
| Chart (PHI read) access review | Reads are not audited (data card §2.27); report-based PHI access is `management.patient_report_access` |
| Accounting of disclosures, access rights matrix, access change log, audit integrity check, access readiness | Compliance registers and control checks specified by 08 §6.8 (#5, #7, #8, #9, #11); see the inclusion rule under Identity |
| Treatment-team attribution | No assistant or coordinator per visit is stored (CT I-10) |
| Separate referring-doctor scorecard | Doctors are sources in `referral.referral_source_return` |
| Benefits-expiry campaign list | `worklists.unscheduled_treatment` filters (`benefits_remaining_min`, benefit year end) and `insurance.benefits_used_unused` |
| Short-call (ASAP) list | Scheduler call list; `worklists.broken_appointments` (`include_off_call_list`) |
| Forms completed before check-in | `appointment.smartassist_report_card` and the `forms_missing` flag of `worklists.todays_patients` (DATA-54) |
| Lab remakes | No remake field on lab cases |
| Payment-request (text-to-pay) results | No payment-request feature or data |
| Patient satisfaction and reviews | No survey or review data |

## Domain: Financial and revenue cycle

## Production trend and mix - `analytics.production_trend_mix`

financial - P2 - M - `reports_daily_reports_screen_view_only` - interactive (background above 13 months on live views) - REPAIR(12)

### Purpose
Owner, office manager and regional manager, at month end and in the monthly review: where production comes from and how
its mix moves - category then code, doctor / hygiene / other, provider, payer - per month against the same month a year
earlier, on gross, charged or net basis. Supports fee, scheduling and marketing decisions (push a category that is
shrinking, act on a payer whose share grows at a low realisation), and is the drill target of the "By category, then code"
and "By carrier" tiles.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `daily.production_analysis_report` (one range, one cut, counts and fees per code); `daily.production_report` (`group_by` code / carrier, one range; stays the drill target for the rows) | Period columns with PY, shares of the period, gross / charged / net basis, mix by category then code, production group, provider, payer and office, production per procedure |

Called for by: KPI §3.1 (PRD-01..04, PRD-10), §3.9 (mix); CT TS-1 ("by provider, office, procedure category/code and
carrier"); 06 §2.5 tiles "By category, then code", "By carrier", "By day and provider type".

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | office of service (PD-6) |
| `date_range` | `date_range` | `trailing_12_months` | fixed `date_basis = service_date` |
| `compare_to` | `enum` | `previous_year` | `none`, `previous_period`, `previous_year`, `custom`; `goal` not offered (no category goals) |
| `time_grain` | `enum` | `month` | `week`, `month`, `quarter`, `year` |
| `provider_ids` | `entity_multi` | `all` | `provider_role = treating`; PD-11 restriction honoured |
| `production_group` | `enum` | `all` | `doctor`, `hygiene`, `other` (`rpt_provider_dim.production_group`) |
| `procedure_category_codes`, `procedure_codes`, `carrier_ids` | `entity_multi` | `all` | `carrier_ids` applies through `payer_basis` |
| `report_format` | `enum` | `summary` | `summary`, `detail` (charge and adjustment legs behind a cell) |
| `group_by`, `sort_by`, `page_break_by`, `output_format` | filter card §3.9 | `none`, `value_desc`, `none`, `pdf` | `group_by`: `none`, `office`, `production_group` |
| `production_basis` | `enum` NEW (04) | `net` | `gross` (office fee), `charged` (posted fee), `net` (charged plus signed production adjustments, PD-1): which of `gross_production`, `charged_production`, `net_production` fills the production columns and every per-unit ratio; printed. Shared with `analytics.production_vs_schedule` |
| `payer_basis` | `enum` NEW (04) | `at_service` | `at_service` (`rpt_charges.primary_carrier_id`, DATA-33) or `current_coverage` (primary dental slot of `rpt_insurance_coverage` today, k12). Under `at_service` a row without a stamped payer (every migrated charge, app charges before DATA-33) falls back to today's coverage with `payer_source = 'current_coverage'` and the share of such production is printed; `current_coverage` forces the fallback on every row. Shared with `analytics.fee_realization`, `insurance.payer_mix_profitability` |
| `mix_dimension` | `enum` NEW | `category_code` | `category_code` (category rows expanding to codes), `production_group`, `provider`, `payer` (patient-only / insured, then carrier), `office` |
| `top_n` | `integer` NEW | 15 | members beyond N fold into `other`; 0 = all |

### Data

| Dataset | Columns used |
|---|---|
| `rpt_charges` | `service_date`, `office_id`, `provider_id`, `procedure_code`, `code_category`, `office_fee`, `charged_fee`, `implied_writeoff`, `is_production`, `is_unpriced`, `primary_carrier_id`, `patient_id`, `entry_id` |
| `rpt_ledger_entries` | `ledger_bucket = 'production_adjustment'`: `amount`, `procedure_id`, `provider_id`, `carrier_id`, `service_date_effective` or `transaction_date` per the 05 setting `production_adjustment_dating` |
| `rpt_provider_dim`, `rpt_procedure_code_dim`, `rpt_insurance_coverage`, `rpt_dates` | `production_group`; code labels; fallback carrier; zero-fill |

- Attribution: office of service, treating provider (PD-7); an adjustment takes the code and carrier of the charge named by
  `procedure_id`, else the member `Unassigned code` / `Carrier not recorded` (residual rows, never spread).
- Calculation: per period x member, `gross_production`, `charged_production`, `implied_writeoff`, `production_adjustments`,
  `net_production`, `procedure_count`, `production_per_procedure` (on the chosen basis), `category_production_share_pct`
  (share of the period's total on the chosen basis), `insured_production_share_pct`; compare columns from the same
  builder over the shifted range.

```
p  := SELECT d.period_start, <member keys>, sum(c.office_fee) gross, sum(c.charged_fee) charged,
             sum(c.implied_writeoff) implied, count(*) procs
      FROM rpt_charges c JOIN rpt_dates d ON d.date_key = c.service_date
      LEFT JOIN LATERAL (primary dental slot of c.patient_id) cov ON payer_basis needs it
      WHERE c.is_production AND c.service_date BETWEEN :from AND :to AND <scope> GROUP BY 1, <member keys>
a  := SELECT period(e.<dating column>), <member keys via procedure_id>, sum(e.amount) prod_adj
      FROM rpt_ledger_entries e WHERE e.ledger_bucket = 'production_adjustment' AND <range, scope> GROUP BY ...
out:= p FULL JOIN a USING (period_start, <member keys>) ; net = charged + prod_adj ; ratios by the banding step
```
| Era | What works |
|---|---|
| Migrated history | Gross, charged, counts, category and code (H; k3, k14). Net equals charged and the unclassified amount is shown beside it (k1). Carrier is today's coverage (k12) |
| App era | The payer stamped on the charge from DATA-33 |
| Waits for | DATA-12 (classified production adjustments on history, REPAIR(12)); DATA-33 (payer on the service date, SCHEMA(33)) |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `period_start` | Period | date | `aggregate` | label |
| `member_key`, `member_label` | Category / code / group / provider / payer / office | text | `aggregate`; `provider_comp` when `mix_dimension = provider` | label |
| `gross_production` | Gross (office fee) | money | `financial_practice` | sum |
| `charged_production` | Charged | money | `financial_practice` | sum |
| `implied_writeoff` | Fee-schedule write-off | money | `financial_practice` | sum |
| `production_adjustments` | Production adjustments | money | `financial_practice` | sum |
| `unclassified_adjustments` | Unclassified adjustments | money | `financial_practice` | sum (visible when the range touches migrated rows) |
| `net_production` | Net | money | `financial_practice` | sum |
| `procedure_count` | Procedures | integer | `aggregate` | sum |
| `production_per_procedure` | Per procedure | money | `financial_practice` | ratio (basis column / `procedure_count`) |
| `category_production_share_pct` | Share | percent | `financial_practice` | share_of_parent |
| `insured_production_share_pct` | Insured share | percent | `financial_practice` | ratio |
| `<metric>_compare`, `<metric>_variance_pct` | PY / variance | money, percent | as the metric | sum / ratio of sums |
| `payer_source` | Payer source | enum | `aggregate` | none (hidden unless `mix_dimension = payer`) |

- Grouping: `fixed_outer` office band when multi-office; `group_by` level; members; `category_code` expands to codes
  (second level, collapsed by default). Grand total per period.
- Variants: `summary` = `shape = matrix` (members x periods, value = the basis column; compare columns per period);
  `detail` = the legs behind one cell (`entry_id`, `service_date`, patient (`phi_identified`), code, provider, fees,
  adjustment amount; `financial_patient`), `row_id_column = entry_id`.
- Summary cards: `net_production` (or the basis metric), `charged_production`, `gross_production`, `production_per_procedure`,
  `insured_production_share_pct`. `reconciles_with`: grand totals = `gross_production`, `charged_production`,
  `net_production` for the same parameters.

### Visuals and drill-through
- Chart `trend` (stacked bars per period by member, PY as a dashed total line); `bars` of shares for the last period; "Show
  as table" always.
- Cell -> `daily.production_report` with `{std}`, `date_basis = service_date`, `group_by` = the member dimension, codes of
  the clicked category; adjustment cells -> `daily.special_transaction_report` (`payment_adjustment_codes` of the class);
  any cell -> `kind = rows` (detail format); detail row -> ledger entry record (`route_key` of 07).

### Actions
- No row actions (aggregate report). Shipped view "Trailing 12 months by category" (monthly schedule, PD-12 link-only).
- Suited alert (06 §7, P4): `category_production_share_pct` of a category falls more than N points against PY.

### Open questions
- Should `payer_basis = at_service` mix stamped and fallback rows in one range (default here, labelled) or refuse the
  fallback once DATA-33 is live? Product decision.
- Hygiene slice by provider kind (default) or by `hygiene_visit` code group (05 alternative split): offer as a
  `mix_dimension` value once 05 names the split.
- Net production by code leaves unlinked adjustments in `Unassigned code`; on migrated months that row holds every
  adjustment.

## Actual versus scheduled production - `analytics.production_vs_schedule`

financial - P4 - M - `reports_daily_reports_screen_view_only` - interactive - SCHEMA(48)

### Purpose
Office manager and doctors, weekly and at month end: for each office-day and provider, what was on the book when the day
began, what was added during the day, what was lost to cancellations and no-shows, and what was actually produced. Shows
whether the schedule is a reliable forecast and where the gap comes from (breaks versus unplanned same-day work), which
drives confirmation effort, short-call use and same-day treatment coaching.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `daily.scheduled_production` (a forward look at booked fees); `daily.production_report` (the produced side alone) | The book frozen at the start of the day against what was produced, with the gap split into breaks, same-day additions and unplanned work, by office-day and provider |

Called for by: KPI §3.1 PRD-12 / PRD-13 ("snapshot time of scheduled must be fixed (start of day)"); 06 §2.4 tile
"Unplanned and schedule variance", §2.8 tile "Schedule accuracy" (header drill map).

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | appointment office = office of service |
| `date_range` | `date_range` | `last_month` | fixed `date_basis = appointment_date` (= service date of the day's production) |
| `compare_to` | `enum` | `none` | `previous_period`, `previous_year` |
| `time_grain` | `enum` | `day` | `day`, `week`, `month` |
| `provider_ids` | `entity_multi` | `all` | appointment provider for the schedule side, treating provider for the produced side; the mismatch is a residual row |
| `production_group` | `enum` | `all` | |
| `report_format` | `enum` | `summary` | `summary` (office-day x provider), `detail` (appointments of one office-day) |
| `group_by`, `sort_by`, `output_format` | §3.9 | `provider`, `date`, `pdf` | `group_by`: `none`, `provider`, `production_group` |
| `production_basis` | `enum` NEW | `net` | as defined in `analytics.production_trend_mix`, for the produced side; `gross` not offered (booked fees are posted-fee estimates) |

### Data

| Dataset | Columns used |
|---|---|
| `rpt_scheduled_production_snapshot` (DATA-48) | office x provider x date rows with `snapshot_date = appointment_date`: the start-of-day book |
| `rpt_scheduled_production_snapshot_lines` (NEW, appointment grain) | `snapshot_date`, `appointment_id`, `office_id`, `provider_id`, `scheduled_fee`, `line_count`: follows each start-of-day appointment to its outcome. Requested of 03 as an acceptance criterion of DATA-48 (same nightly job; about 30 days ahead per office and day; retention 400 days) |
| `rpt_appointment_facts` | `appointment_id`, `appointment_date`, `office_id`, `provider_id`, `status_class`, `is_kept`, `scheduled_fee`, `created_date`, `is_block`, `is_deleted` |
| `rpt_appointment_procedures`, `rpt_charges`, `rpt_ledger_entries` | booked lines; `service_date`, `charged_fee`, `is_planned`, `appointment_id`; production adjustments for the net basis |

Shipping order: the office x provider bridge (`scheduled_production_start_of_day`, `produced_amount`,
`same_day_treatment_amount`, variance and `actual_vs_scheduled_production_pct`) ships with DATA-48. The columns that
follow single appointments (`lost_broken`, `added_same_day`, `kept_scheduled`) and the detail format need the
appointment-grain table: until it exists they render `not_available` ("needs the appointment-grain snapshot").

- Calculation per office-day x provider:
  - `scheduled_sod` = start-of-day snapshot (`scheduled_production_start_of_day`).
  - `lost_broken` = snapshot fee of start-of-day appointments now `cancelled` / `no_show` (NEW `scheduled_production_lost_broken`).
  - `moved_out` = start-of-day appointments rescheduled to another date (needs `appointment_events`, DATA-17; until then
    inside `lost_broken`, footnoted).
  - `added_same_day` = booked fee of live appointments of the day absent from the snapshot (NEW `scheduled_production_added_same_day`).
  - `kept_scheduled` = snapshot fee of start-of-day appointments that were kept (NEW `scheduled_production_kept_pct` =
    kept ÷ `scheduled_sod`, the DI "completed" variant of PRD-13).
  - `produced` = production of the day on `production_basis`; `unplanned` = `same_day_treatment_amount`.
  - `actual_vs_scheduled_production_pct` = produced ÷ `scheduled_sod`; `variance` = produced − `scheduled_sod`.

```
sod := SELECT appointment_id, office_id, provider_id, scheduled_fee FROM rpt_scheduled_production_snapshot_lines
       WHERE snapshot_date = appointment_date AND appointment_date BETWEEN :from AND :to
out := sod LEFT JOIN rpt_appointment_facts f USING (appointment_id)  -- outcome now
       UNION added := live f of the day NOT IN sod
       JOIN produced := rpt_charges / rpt_ledger_entries by (office_id, service_date, provider_id)
```
| Era | What works |
|---|---|
| Migrated history | Nothing: no snapshot existed, and 94 % of migrated appointments have no booked lines (k7) |
| App era | From the snapshot go-live (`history starts on <date>` before it, G(48)); booked fees are client snapshots, never re-priced |
| Waits for | DATA-48 (the office x provider bridge); the NEW appointment-grain table (lost, added and kept columns, detail format); DATA-17 (`moved_out`) |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `business_date`, `office_id`, `provider_id` (+ labels) | Day / office / provider | date, id, text | `aggregate`; `provider_comp` by provider | label |
| `scheduled_production_start_of_day` | Scheduled at start of day | money | `financial_practice` | sum |
| `scheduled_production_lost_broken` | Lost to breaks | money | `financial_practice` | sum |
| `scheduled_production_added_same_day` | Added during the day | money | `financial_practice` | sum |
| `scheduled_kept_amount` | Scheduled and kept | money | `financial_practice` | sum |
| `scheduled_production_kept_pct` | Kept share of the start-of-day book | percent | `financial_practice` | ratio |
| `produced_amount` | Produced | money | `financial_practice` | sum |
| `same_day_treatment_amount` | Unplanned same-day work | money | `financial_practice` | sum |
| `variance_amount` | Produced − scheduled | money | `financial_practice` | sum |
| `actual_vs_scheduled_production_pct` | Actual vs scheduled | percent | `financial_practice` | ratio |
| `appointments_sod`, `appointments_broken`, `appointments_added` | Counts | integer | `aggregate` | sum |

- Grouping: office band (multi-office), `group_by` level, days. Grand total. No default colour band (05: the vendor's own
  bands conflict).
- Detail format: one row per appointment of the office-day with `in_start_of_day_book`, outcome `status_class`, snapshot
  fee, booked fee now, produced on that appointment (`rpt_charges.appointment_id`), patient (`phi_identified`).
- Summary cards: `scheduled_production_start_of_day`, `produced_amount`, `actual_vs_scheduled_production_pct`,
  `scheduled_production_lost_broken`, `scheduled_production_added_same_day`. `reconciles_with`:
  `scheduled_production_start_of_day`, `actual_vs_scheduled_production_pct`.

### Visuals and drill-through
- Chart: bridge (waterfall) per period `scheduled_sod − lost_broken + added − not produced + unplanned = produced`; `trend`
  of `actual_vs_scheduled_production_pct` by day.
- Drill: lost -> `worklists.broken_appointments` (date and provider); added / appointment rows -> appointment record;
  produced -> `daily.production_report` `{std}`; office-day -> `kind = rows`.

### Actions
- None on rows (outcome already happened). Shipped view "Last month by provider"; weekly schedule. Alert suited:
  `scheduled_production_kept_pct` below a threshold for 5 working days.

### Open questions
- Appointment-grain snapshot (request to 03): size per tenant (30 days ahead per day) and retention.
- "Moved out" needs DATA-17 events; until then a rescheduled appointment counts as lost on its old day and added on the new
  one - acceptable, or suppress `added_same_day` for appointments created before the day?
- Produced work on a day without any appointment (walk-ins) appears only on the produced side: label it `unbooked visit`.

## Collections trend and mix - `analytics.collections_trend_mix`

financial - P2 - M - `reports_monthly_reports_screen_view_only` - interactive (background above 13 months) - REPAIR(12)

### Purpose
Owner, office manager and billing lead at month end: how much cash came in per month against last year, from whom
(patient, insurance, each carrier), by which tender (cash, card, financing, ACH), in which office, with net collections
and every collection % variant side by side so nobody argues about the definition. Supports staffing of the billing desk,
tender policy (financing share, card fees) and the follow-up on offices whose collection % drifts.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `daily.collection_report` (one range, list or code grouping); `monthly.executive_summary` (one month's gross collection without mix) | Period columns with PY, mix by payer, carrier, tender, deposit group, office and provider, net collections, and the collection % variants side by side per period |

Called for by: KPI §3.2 COL-01..06, §2.8 (variant matrix); CT TS-1, I-38 ("collections analytics pack"); 06 §2.6 tiles
"By payer and tender", "Collection %" (component lists).

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | office where the payment was applied (PD-6) |
| `date_range` | `date_range` | `trailing_12_months` | `date_basis` shared key: `transaction_date` (default), `payment_date`, `deposit_date` (after DATA-28) |
| `compare_to` | `enum` | `previous_year` | |
| `time_grain` | `enum` | `month` | |
| `provider_ids` | `entity_multi` | `all` | role from the 05 setting `collections_provider_attribution` (`payment_provider` until DATA-26, then `allocation`) |
| `carrier_ids` | `entity_multi` | `all` | carrier of the payment leg |
| `payment_types` | `enum_multi` | all ticked | deposit groups (filter card §3.8) |
| `report_format` | `enum` | `summary` | `summary`, `rates` (collection % variants per period), `detail` |
| `group_by`, `sort_by`, `output_format` | §3.9 | `none`, `value_desc`, `pdf` | `group_by`: `none`, `office` |
| `mix_dimension` | `enum` NEW | `payer` | `payer` (patient / insurance), `carrier`, `tender_class`, `deposit_group`, `office`, `provider` |

### Data
| Dataset | Columns used |
|---|---|
| `rpt_payments` | `amount`, `payer`, `tender_class`, `deposit_group`, `counts_as_collection`, `collection_class_quality`, `carrier_id`, `office_id`, `provider_id`, `transaction_date`, `payment_date`, `deposit_date` |
| `rpt_ledger_entries` | `ledger_bucket = 'collection_adjustment'`; `entry_type = 'refund'` (the refund part of that bucket) |
| `rpt_payment_allocations` | provider by allocation (P2) |
| `rpt_charges`, `rpt_ledger_entries` | production denominators of the rates format |

- Calculation: `gross_collections`, `patient_collections`, `insurance_collections`, `collection_adjustments` (every
  collection adjustment, refunds included), `refunds` ("of which refunds": the refund part of `collection_adjustments`,
  data card §2.12 bucket table, never subtracted a second time), `net_collections` = gross − collection adjustments,
  `patient_collection_share_pct` per period x member. Rates format: `collection_pct` (resolved
  variant named), `net_collection_pct`, `net_collection_pct_after_bad_debt`, `net_collection_pct_charged_base`,
  `gross_collection_pct`, `collection_pct_rolling_90d`, `collection_pct_rolling_12m` per period, only at office,
  organisation and provider level (a tender or carrier has no production denominator here; carrier rates are in
  `insurance.payer_mix_profitability`).
- NEW column `assumed_collection_amount` = Σ collections with `collection_class_quality = 'assumed'` (k15), printed as a
  share beside each period.

```
c := SELECT period(<basis col>), <member>, -sum(p.amount) FILTER (WHERE p.counts_as_collection) gross, ...
     FROM rpt_payments p WHERE <range, scope, payment_types, carrier_ids> GROUP BY ...
j := SELECT period(e.transaction_date), <member>, sum(e.amount) FILTER (WHERE e.ledger_bucket='collection_adjustment') cadj
     FROM rpt_ledger_entries e WHERE ...
out := c FULL JOIN j ; net = gross - cadj ; rates from the metric builders of 05 for the same periods
```
| Era | What works |
|---|---|
| Migrated history | Gross collections, payer split and office (H; k11, k15, k16). Tender only as cash / check / card / ach; collection adjustments and refunds are zero and net equals gross (k1); carrier NULL (member `Carrier not recorded`); provider by allocation derived (k4) |
| App era | Carrier on remittance rows; carrier on `patient_payments` rows only after DATA-33 |
| Waits for | DATA-12 (code-level tender and classified adjustments on history, REPAIR(12)); DATA-33 (carrier); DATA-26 (allocation-based provider); DATA-28 (deposit-date basis) |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `period_start` | Period | date | `aggregate` | label |
| `member_key`, `member_label` | Payer / carrier / tender / office / provider | text | `aggregate`; `provider_comp` by provider | label |
| `gross_collections` | Gross collections | money | `financial_practice` | sum |
| `patient_collections`, `insurance_collections` | Patient / insurance | money | `financial_practice` | sum |
| `collection_adjustments` | Collection adjustments (incl. refunds) | money | `financial_practice` | sum |
| `refunds` | of which refunds | money | `financial_practice` | sum (an indented sub-column of `collection_adjustments`; the XLSX net formula never references it) |
| `net_collections` | Net collections | money | `financial_practice` | sum |
| `patient_collection_share_pct` | Patient share | percent | `financial_practice` | ratio |
| `assumed_collection_amount` | Tender not recorded (assumed) | money | `financial_practice` | sum |
| rate columns (rates format) | the seven variants | percent | `financial_practice` | ratio of the metric's components |
| `*_compare`, `*_variance_pct` | PY / variance | money, percent | as the metric | sum / ratio |

- Summary format: matrix members x periods (value = gross collections; net row per period). Rates format: matrix variants x
  periods, each variant labelled with its denominator. Detail: payment legs (`entry_id`, date, patient `phi_identified`,
  amount `financial_patient`, code, tender, carrier, office, poster `user_activity`).
- Summary cards: `net_collections`, `gross_collections`, `collection_pct`, `patient_collection_share_pct`,
  `collection_pct_rolling_12m`. `reconciles_with`: `gross_collections`, `net_collections`, `collection_pct`.

### Visuals and drill-through
- Stacked `bars` per period by member with PY total line; `trend` of the rate variants (one line each, resolved variant
  bold).
- Cell -> `daily.collection_report` with `{std}`, `date_basis = transaction_date`, `payment_types` of the tender member,
  `carrier_ids`; collection-adjustment and refund cells -> `daily.special_transaction_report`; rate cell -> numerator list
  (this report, detail) and denominator list (`analytics.production_trend_mix` detail) separately.

### Actions
- None on rows. Shipped view "Trailing 12 months by payer"; monthly schedule. Alert suited: `collection_pct_rolling_90d`
  below 95 % (06 band).

### Open questions
- Should financing (`care_credit`, class `financing_payment`) be its own payer member ("third party") instead of patient?
  KPI COL-06 pitfall; 05 counts it as patient today.
- Deposit-date basis is offered only after DATA-28; before that the option is disabled with the reason printed.

## Service-to-payment lag - `analytics.payment_lag`

financial - P2 - M - `reports_monthly_reports_screen_view_only` - background - SCHEMA(26)

### Purpose
Billing lead and owner, monthly: how long money takes to arrive after the service, by payer, carrier, provider and office.
Separates slow payers from non-payers, sizes the cash tied up by each carrier, and checks whether patient-portion
collection happens at the visit or weeks later. Feeds carrier follow-up priorities and statement timing.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `monthly.waterfall_report` (collected to date by service month, one table) | Lag distribution in buckets, payment-weighted days, share collected by day N, by payer, carrier, provider and office, for money received and for service cohorts |

Called for by: KPI §3.2 COL-14 `days_to_payment` ("requires payment-to-procedure allocation"); DSO §14.6 ("payer mix
with time to collect"); 06 §2.6 tile "Speed" (`days_to_payment` by `payer`) and "Collected to date by service month".

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | allocation office (office of the paid charge) |
| `date_range` | `date_range` | `last_month` (payment format), `trailing_12_months` (service format) | basis fixed by format: payment transaction date / service date |
| `compare_to` | `enum` | `none` | `previous_period`, `previous_year` |
| `provider_ids` | `entity_multi` | `all` | `provider_role` = producing provider (`allocation_provider_id`) |
| `carrier_ids` | `entity_multi` | `all` | carrier of the paying leg |
| `report_format` | `enum` | `payment_cohort` | `payment_cohort` (money received in the range, by lag), `service_cohort` (production of each service month, share collected by day N), `detail` |
| `group_by`, `output_format` | §3.9 | `none`, `pdf` | `group_by`: `none`, `office` |
| `mix_dimension` | `enum` NEW | `payer` | `payer`, `carrier`, `provider`, `office` |
| `lag_days_marks` | `enum_multi` NEW | `0`, `30`, `90` | the "collected by day N" columns of the service format |

### Data
| Dataset | Columns used |
|---|---|
| `rpt_payment_allocations` | rows with `credit_ledger_bucket = 'collection'` and `allocation_target = 'production'`: `amount`, `credit_transaction_date`, `service_date`, `payer`, `allocation_office_id`, `allocation_provider_id`, `credit_entry_id`, `is_derived`, `method` |
| `rpt_ledger_entries` | `carrier_id` through `credit_entry_id` |
| `rpt_claim_facts` | `submitted_date`, `first_paid_date` (claim turnaround shown for the insurance side of migrated months) |
- Service format denominator: `net_production_before_bad_debt` of the service month (05), on the same office and provider.
- Lag = `credit_transaction_date − service_date` (days, never negative: prepayments allocated to later service get lag 0 and
  are counted in a `prepaid` column). NEW dimension `payment_lag_bucket` (`0`, `1_30`, `31_60`, `61_90`, `over_90`;
  edges stored as bucket set `payment_lag` in `rpt_aging_bucket_sets`, NEW row owned by 03), requested from 05.
- Metrics: `days_to_payment` (payment-weighted), `cohort_collection_pct` (to date); NEW `collected_within_days_pct`
  (allocations with lag <= N ÷ collectible production of the service month, setting N) requested from 05.

```
al := SELECT a.*, e.carrier_id, (a.credit_transaction_date - a.service_date) AS lag_days
      FROM rpt_payment_allocations a LEFT JOIN rpt_ledger_entries e ON e.entry_id = a.credit_entry_id
      WHERE a.credit_ledger_bucket = 'collection' AND a.allocation_target = 'production'
payment_cohort: GROUP BY member, payment_lag_bucket(lag_days)  over credit_transaction_date in range
service_cohort: GROUP BY service month, member; Σ amount FILTER (lag_days <= N) / collectible production
```
| Era | What works |
|---|---|
| Migrated history | Patient side: lag by service month and provider is an estimate (every link `derived_fifo`, k4, `is_derived` printed; the incomplete migrated charge set spends credits on the wrong charges, k14). Insurance side: `not_available`. Derived oldest-first allocation applies a migrated insurance payment (no carrier, no claim link, k11) to the account's oldest open debit, not to the claim line it paid (data card §2.13), so its lag measures nothing. The claim turnaround `claim_days_to_payment` (sent to first payment, H) is shown in its place, labelled |
| App era | Remittances are linked to their claim line; exact for every payment from DATA-26 (persisted allocation at posting) |
| Waits for | DATA-26 (SCHEMA(26)). A service month is `is_provisional` until `maturity_days` (90) after its end |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `member_key`, `member_label` | Payer / carrier / provider / office | text | `aggregate`; `provider_comp` by provider | label |
| `service_month` (service format) | Service month | date | `aggregate` | label |
| `collected_amount` | Collected (allocated) | money | `financial_practice` | sum |
| `lag_0_amount` ... `lag_over_90_amount` | Same day / 1-30 / 31-60 / 61-90 / over 90 | money | `financial_practice` | sum |
| `lag_<bucket>_share_pct` | Share per bucket | percent | `financial_practice` | ratio (bucket / collected) |
| `prepaid_amount` | Paid before service | money | `financial_practice` | sum |
| `days_to_payment` | Payment-weighted days | decimal | `financial_practice` | weighted_avg (amount) |
| `collectible_production` (service format) | Collectible production | money | `financial_practice` | sum |
| `collected_within_<n>_pct` | Collected by day N | percent | `financial_practice` | ratio |
| `cohort_collection_pct` | Collected to date | percent | `financial_practice` | ratio |
| `derived_share_pct` | Allocation derived | percent | `aggregate` | ratio |

- Grouping: office band; members; service months (service format, matrix months x marks). Grand total.
- Detail: allocation rows (`allocation_id`, payment date, service date, lag, amount, payer, carrier, provider, patient
  `phi_identified`, `is_derived`).
- Summary cards: `days_to_payment` (overall, patient, insurance; for a range of migrated months the insurance card shows
  `claim_days_to_payment` and the overall card the patient side, both labelled), `collected_within_30_pct`,
  `lag_over_90_share_pct`.
  `reconciles_with`: `days_to_payment`; collected total = the allocated part of `gross_collections` (R-08 remainder shown as
  `Unallocated` / `refunded` / `opening or transfer` rows).

### Visuals and drill-through
- Payment format: 100 % stacked `bars` per member by lag bucket. Service format: cumulative curve per service month (share
  collected by day N), one line per cohort.
- Member -> `kind = rows`; carrier member -> `insurance.claim_cycle_performance` (`carrier_ids`); service month ->
  `monthly.waterfall_report` for that month; detail row -> payment ledger entry.

### Actions
- None. Monthly schedule; quarterly review view "Carriers by days to payment".

### Open questions
- Lag on the insurance side counts from service, not from claim sent: the claim-side lag is in
  `insurance.claim_cycle_performance`. Keep both or show the split (service -> sent -> paid) here once DATA-25 timing exists?
- Should the patient side measure from the date the patient portion became due (after the EOB) rather than from service?
  Needs the EOB date per charge (app era only).

## Adjustments and write-offs - `analytics.adjustment_writeoff_analysis`

financial - P2 - M - `reports_daily_reports_screen_view_only` - interactive - REPAIR(12)

### Purpose
Owner and office manager monthly, doctor at the month-end review: what production was given up and why - contractual
(fee schedule and insurance write-offs), discretionary (courtesy and discounts), bad debt, corrections, refunds - by code,
provider, entering user and carrier, as rates of office-fee and charged production. Supports PPO participation decisions,
discount discipline and the review of who adjusts what. The control view of single entries is
`management.transaction_exceptions`; this report is the mix and rate view.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `daily.special_transaction_report` (a transaction list by code for a range) | Class roll-up (contractual, discretionary, bad debt, correction, refund), the implied fee-schedule write-off, rates against office-fee and charged production, splits by code, provider, entering user and carrier, trend by class |

Called for by: KPI §3.1 PRD-02 / PRD-04, §3.12 FRO-08; DSO §14.6 ("adjustments and write-offs by type, location and
provider"); 06 §2.5 tile "Write-offs and adjustments", §2.6 tile "Bad debt".

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | transaction office of the adjustment |
| `date_range` | `date_range` | `last_month` | `date_basis` shared key: `transaction_date` (default), `service_date` (`service_date_effective`: links an adjustment to its charge's month) |
| `compare_to` | `enum` | `previous_year` | |
| `time_grain` | `enum` | `month` | period columns in the trend format |
| `provider_ids` | `entity_multi` | `all` | `provider_role = treating` (provider of the adjustment leg) |
| `user_ids` | `entity_multi` | `all` | poster (`user_key`); class `user_activity` |
| `carrier_ids`, `procedure_category_codes`, `procedure_codes` | `entity_multi` | `all` | code through `procedure_id` |
| `payment_adjustment_codes` | `entity_multi` (04 §15) | `all` | adjustment codes only |
| `report_format` | `enum` | `summary` | `summary` (class x member), `trend` (class x period), `detail` |
| `group_by`, `sort_by`, `output_format` | §3.9 | `none`, `value_desc`, `pdf` | `group_by`: `none`, `office`, `provider`, `user`, `carrier`, `code` |
| `adjustment_classes` | `enum_multi` NEW | all ticked | values of NEW `adjustment_report_class` (below) |

### Data
| Dataset | Columns used |
|---|---|
| `rpt_adjustments` | `amount`, `entry_type`, `txn_class`, `txn_side`, `code`, `is_income`, `is_transfer`, `user_key`, `provider_id`, `carrier_id`, `procedure_id`, `office_id`, `transaction_date`, `linked_service_date` |
| `rpt_ledger_entries` | `ledger_bucket` |
| `rpt_charges` | `implied_writeoff`, `office_fee`, `charged_fee` (implied class and the production denominators) |
| `rpt_payments`, `rpt_transaction_code_dim` | `gross_collections` (refund denominator); code versions and the class column |
- NEW column `adjustment_report_class` on `rpt_transaction_code_dim` (from `rpt_value_map` domain
  `adjustment_report_class`, owned by 03; no code list in the definition): `contractual` (`contractual_writeoff` + the
  implied write-off of charges), `discretionary` (`discount`), `bad_debt` (`bad_debt`, `collection_agency`), `correction`
  (`charge_correction`), `refund` (`refund_patient`, `refund_insurance`, `refund_financing`, `payment_reversal`),
  `added_charge` (`finance_or_late_charge`, `nsf_fee`), `other` (`other_production`, `other_collection`), `unclassified`;
  `transfer`, `opening_balance`, `contract_movement`, `sales_tax`, `capitation_writeoff` form the block "not income"
  (shown, never in a rate).
- Rates: `writeoff_rate_pct`, `contractual_writeoff_rate_pct`, `bad_debt_rate_pct`, `provider_adjustment_rate_pct`;
  NEW `discount_rate_pct` (discretionary ÷ gross production) requested from 05. Production rates exist only for the
  production-side classes `contractual`, `discretionary`, `bad_debt`, `correction` and `unclassified`; class `refund` has
  a collections rate (refunds ÷ `gross_collections`); `added_charge` and `other` have no rate. Amounts: `implied_writeoff`,
  `production_adjustments` by `txn_class`, `collection_adjustments`, `refunds`, `bad_debt_amount`,
  `adjustments_posted_amount` (by user), `unclassified_adjustments`.

```
adj := SELECT <member>, tc.adjustment_report_class AS cls, sum(a.amount) amt, count(*) n
       FROM rpt_adjustments a LEFT JOIN LATERAL (code version on a.transaction_date) tc ON true
       WHERE <range on basis column, scope, codes, users> GROUP BY ...
imp := SELECT <member>, 'contractual', -sum(c.implied_writeoff) FROM rpt_charges c WHERE c.is_production AND <service range>
den := gross_production, charged_production of the same scope (05 builders)
```
| Era | What works |
|---|---|
| Migrated history | Implied write-off where an office fee was stored (k3); totals. Every migrated adjustment is `unclassified` (k1), so the class split and the class rates are `not_available`; poster is the legacy login string (k6) |
| App era | Classes from the code catalog; carrier of explicit write-offs (remittance write-offs `rwo`) |
| Waits for | DATA-12 (classes on history, REPAIR(12)); DATA-03 (code catalog) |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `adjustment_report_class` | Class | enum | `aggregate` | label |
| `member_key`, `member_label` | Code / provider / user / carrier | text | `aggregate`; `provider_comp` by provider; `user_activity` by user | label |
| `adjustment_amount` | Amount (signed, lowers production when negative) | money | `financial_practice` | sum |
| `adjustment_count` | Entries | integer | `aggregate` | sum |
| `share_of_class_pct` | Share of class | percent | `financial_practice` | share_of_parent |
| `rate_gross_pct` | Of office-fee production | percent | `financial_practice` | ratio (production-side classes only; blank on `refund`, `added_charge`, `other`) |
| `rate_charged_pct` | Of charged production | percent | `financial_practice` | ratio (production-side classes only) |
| `rate_collections_pct` | Of gross collections | percent | `financial_practice` | ratio (class `refund` only) |
| `average_amount` | Average per entry | money | `financial_practice` | ratio |
| `*_compare`, `*_variance_pct` | PY / variance | money, percent | as above | sum / ratio |

- Grouping: office band; class (subtotal); member. Grand total of income classes; "not income" block below it.
- Trend format: matrix class x period. Detail: adjustment legs (`entry_id`, dates, code, class, amount, patient
  `phi_identified`, provider, user, carrier, linked charge code).
- Summary cards: `writeoff_rate_pct`, `contractual_writeoff_rate_pct`, `discount_rate_pct`, `bad_debt_rate_pct`,
  `refunds`. `reconciles_with`: sums of classes = `production_adjustments` + `collection_adjustments` +
  `unclassified_adjustments` for the same parameters; `bad_debt_amount`.

### Visuals and drill-through
- Stacked `bars` of classes per period; horizontal `bars` of the top members in the selected class.
- Class or member cell -> `daily.special_transaction_report` with `payment_adjustment_codes` = codes of the cell and
  `{std}`; implied row -> `daily.production_report` (`include_ucr = true`); user cell -> `management.transaction_exceptions`
  (`user_ids`); detail row -> ledger entry.

### Actions
- None on rows. Shipped view "Last month by class and provider"; monthly schedule with `skip_if_empty = false`.
- Alert suited: `discount_rate_pct` or `bad_debt_rate_pct` above the 05 band.

### Open questions
- Class seed is inferred (03 O-2): the product owner must confirm the mapping before the class split is trusted.
- Should the implied write-off be shown inside `contractual` by default (here) or only on request? It is not an entry and
  has no user or code of its own.

## A/R trend and days outstanding - `monthly.ar_trend`

financial - P2 - L - `reports_monthly_reports_screen_view_only` - background - SCHEMA(30)

### Purpose
Owner, office manager and billing lead at month end and in the quarterly review: receivables at each month end - ageing
buckets, patient and insurance split, credit balances, over-90 share, days in A/R in each variant - with the flows that
moved it (A/R bridge), by office under transaction or home attribution. Tells whether receivables are getting older or
just bigger, and which office is deteriorating.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `monthly.aging_report`, `monthly.aging_report_by_home_office` (one as-of date, account rows) | Month ends as columns with PY, frozen where a snapshot exists, buckets, patient / insurance split, credit balances, over-90 share, the days-in-A/R variants and the A/R bridge between month ends |

Called for by: KPI §2.8, §3.2 COL-07..11; CT TS-3, I-38; 06 §2.6 tile "A/R trend" (from snapshots), §2.1 receivables
rows; replaces a separate DSO report (header "Candidates left out").

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | |
| `office_attribution` | `enum` NEW in 04 | `transaction_office` | `transaction_office` (unit `account_office`), `home_office` (unit `account`) |
| `date_range` | `date_range` | `last_12_month_ends` | NEW preset (header): twelve complete months, so twelve month-end columns; the month ends inside the range are the columns; fixed basis `as_of` |
| `compare_to` | `enum` | `previous_year` | same month end a year earlier |
| `time_grain` | `enum` | `month` | `month`, `quarter` (quarter ends) |
| `aging_bucket_set` | `enum` NEW | organisation setting | `legacy`, `legacy_extended`, `common` (03 bucket sets) |
| `aging_by` | `enum` | `account_ar` | `account_ar`, `patient_ar` (filter card §3.5) |
| `group_by`, `output_format` | §3.9 | `none`, `pdf` | `group_by`: `none`, `office` |
| `report_format` | `enum` | `summary` | `summary` (measures x month ends), `bridge` (A/R movement per month), `detail` (accounts at one month end) |

### Data
| Dataset | Columns used |
|---|---|
| `rpt_ar_snapshot`, `rpt_ar_snapshot_accounts` (DATA-30) | frozen month ends (`snapshot_kind IN ('month_end', 'period_lock')`): `attribution`, `office_id`, `bucket_set`, `bucket_key`, `open_amount`, `open_insurance_est`, `open_patient`, `account_count`; accounts for the detail format |
| `rpt_ar_open_items(p_as_of = month end, p_unit)` | month ends before the first snapshot, recomputed from today's rows and labelled `recomputed` (later voids and back-dated entries rewrite them; claim status is today's) |
| `rpt_ledger_entries` | flows by `ledger_bucket` on `transaction_date` for the bridge and the days-in-A/R denominators (invariant I-2 of 05: opening + charged production + non-production charges + production adjustments + collection adjustments − gross collections + unclassified + other movements = closing) |
- Metrics per month end: `total_ar`, `ar_debit_balance`, `credit_balances`, `patient_ar`, `insurance_ar_estimated`,
  `ar_aging_amount` by `aging_bucket`, `ar_over_90_amount`, `ar_over_90_pct`, `patient_ar_past_due_amount`, `ar_days`
  (resolved) and `ar_days_production_90d`, `ar_days_collections_business_days`, `ar_days_collections_calendar_days`.

```
me  := month ends of the range (rpt_dates)
snap:= SELECT snapshot_date, office_id, bucket_key, sum(open_amount) ... FROM rpt_ar_snapshot
       WHERE attribution = :attr AND bucket_set = :set AND snapshot_kind IN ('month_end','period_lock') AND snapshot_date IN me
rec := for me without snap: rpt_ar_open_items(:tenant, :office_ids, me, :unit) aggregated the same way, source='recomputed'
flow:= SELECT month, ledger_bucket, sum(amount) FROM rpt_ledger_entries WHERE transaction_date in range GROUP BY 1, 2
```
| Era | What works |
|---|---|
| Migrated history | Totals, subject to the migrated-ledger completeness (k14); patient / insurance split `unknown` without the claim backfill (split_quality footnote); `ar_days` variants on net bases degraded (k1). Every recomputed month end of a tenant is a background run (about 2.7 M legs) |
| App era | Frozen month ends from the first snapshot; exact split from the claim facts |
| Waits for | DATA-30 (frozen month ends, SCHEMA(30)); DATA-12 (net bases); DATA-57 (ledger completeness) |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `month_end` | Month end | date | `aggregate` | label |
| `source` | Frozen / recomputed | enum | `aggregate` | none |
| `total_ar`, `ar_debit_balance`, `credit_balances` | Net A/R / debits / credits | money | `financial_practice` | none (builder: sum over offices per month end; never over months) |
| `bucket_<key>_amount` | One column per bucket of the set | money | `financial_practice` | none (builder: sum over offices per month end) |
| `patient_ar`, `insurance_ar_estimated` | Patient / insurance (estimated) | money | `financial_practice` | none (builder: sum over offices per month end) |
| `ar_over_90_amount`, `ar_over_90_pct` | Over 90 / share | money, percent | `financial_practice` | none (builder: per month end over offices) / ratio |
| `patient_ar_past_due_amount` | Patient past due | money | `financial_practice` | none (builder: per month end over offices) |
| `ar_days`, three variant columns | Days in A/R | decimal | `financial_practice` | ratio of components |
| `account_count` | Accounts with a balance | integer | `aggregate` | none (builder: per month end; an account with balances at two offices counts at both) |
| bridge columns (bridge format) | Opening, production, adjustments, collections, other, closing, `difference` | money | `financial_practice` | sum over months for flows; opening none (builder: first month), closing none (builder: last month) |

- Shape `matrix`: measures x month ends; office band when multi-office with organisation total (A/R sums across offices,
  never across months). `difference` of the bridge is 0 by invariant; a non-zero value prints the R-14b warning.
- Detail: accounts at one month end (`account_id`, guarantor `phi_identified`, buckets, total `financial_patient`).
- Summary cards (last month end): `total_ar`, `ar_over_90_pct`, `ar_days`, `credit_balances`; with PY variance.
  `reconciles_with`: `total_ar`, `ar_over_90_pct`, `ar_days` at the last month end.

### Visuals and drill-through
- `trend` of `total_ar` (stacked by bucket) with `ar_over_90_pct` on a second axis; `trend` of the `ar_days` variants.
- Month-end cell -> `monthly.aging_report` (or `monthly.aging_report_by_home_office` under home attribution) with
  `report_date` = month end and `aging_buckets` = clicked bucket; credit cell -> `worklists.unallocated_credits`
  (`only_credit_balances`); patient past due -> `worklists.patient_ar`.

### Actions
- None. Shipped view "Last 12 month ends"; monthly schedule on day 2 after the lock.

### Open questions
- Store recomputed month ends (as `snapshot_kind = 'recomputed'`, rewritable) to avoid repeating the tenant-wide job, or
  recompute per run? Request to 03 / 02 (cache policy).
- Days in A/R headline variant: 05 default `production_90d`, legacy preset `collections_business_days`; the report prints
  all three, the headline follows the setting.

## Time-of-service collection - `management.time_of_service_collection`

financial - P2 - M - `reports_management_reports_screen_view_only` - interactive - READY

### Purpose
Office manager and front-desk lead, weekly and at month end: how much of the estimated patient portion is collected on
the day of service, by office, provider, the user who posted the visit and weekday; how much was left uncollected, and
how much of that was recovered later and how fast. Drives desk coaching, pre-visit estimates and statement timing.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `management.uncollected_copay` (a one-day list of patients who still owe after the visit) | The time-of-service rate and its trend, by office, provider, the credited user and weekday; the uncollected amount, how much of it was recovered later, how fast, and what is still open |

Called for by: KPI §3.2 COL-05, §3.12 FRO-05; DSO §14.6 (OTC collection rate); 06 §2.4 "Money at the desk", §2.6 "Time
of service" (header drill map: the rate tiles drill here, the list stays the drill for one day).

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | office of the unit (account-office-day) |
| `date_range` | `date_range` | `last_month` | fixed `date_basis = service_date` |
| `compare_to` | `enum` | `previous_period` | |
| `time_grain` | `enum` | `month` | `day`, `week`, `month` |
| `provider_ids` | `entity_multi` | `all` | `provider_role = treating`; pro-rata split (below) |
| `user_ids` | `entity_multi` | `all` | user credited with the unit (05 dimension U; credit rule below) |
| `report_format` | `enum` | `summary` | `summary`, `detail` (one row per unit) |
| `group_by`, `sort_by`, `output_format` | §3.9 | `none`, `rate_asc`, `pdf` | `group_by`: `none`, `office`, `provider`, `user`, `day_of_week` |
| `recovery_window_days` | `integer` NEW | 60 | horizon for "recovered later" |

### Data
| Dataset | Columns used |
|---|---|
| `rpt_charges` | `est_patient`, `account_id`, `office_id`, `service_date`, `provider_id`, `user_key`, `created_at_utc`, `is_production` |
| `rpt_payments` | `payer = 'patient'`, `counts_as_collection`, `account_id`, `office_id`, `transaction_date` |
| `rpt_dates`, `rpt_user_dim` | `day_of_week`; user labels |
- Unit `u` = account-office-day with `est_u = Σ est_patient > 0` (05 `otc_collection_pct`). `pay_u` = patient collections
  of the account at that office from the service day through `otc_collection_window_days` (setting 34). Metrics
  `otc_collection_pct`, `uncollected_copay_amount`.
- Later recovery (NEW `uncollected_copay_recovered_amount`, `uncollected_copay_recovered_pct`, `uncollected_copay_recovery_days`
  requested from 05): patient collections of the account after the window up to `recovery_window_days`, capped at the
  unit's uncollected amount, oldest unit first when one account has several. NEW
  `uncollected_copay_still_open_amount` = uncollected − recovered: the part still open after the recovery window (stage 3
  of `analytics.cash_conversion_waterfall`).
- By user (NEW binding requested from 05, whose dimension U names "the user who posted the unit's charges"): a unit is
  credited to one user, the one who posted the largest share of the unit's `est_patient` (ties: the earliest posting), so
  user rows sum to the office total.
- By provider (NEW binding requested from 05, which today defines no P on this metric): a unit's `est_u`, `pay_u` and
  recovery are split pro rata to the provider shares of `est_patient` in the unit.

```
cu  := SELECT account_id, office_id, service_date, user_key, sum(est_patient) est_user, min(created_at_utc) first_post
       FROM rpt_charges WHERE is_production AND service_date BETWEEN :from AND :to GROUP BY 1,2,3,4
u   := SELECT account_id, office_id, service_date, sum(est_user) est,
              (array_agg(user_key ORDER BY est_user DESC, first_post))[1] credited_user
       FROM cu GROUP BY 1,2,3 HAVING sum(est_user) > 0
pay := SELECT u.*, least(-sum(p.amount) FILTER (WHERE p.transaction_date <= u.service_date + :w), u.est) collected
       FROM u LEFT JOIN rpt_payments p ON p.account_id = u.account_id AND p.office_id = u.office_id
            AND p.payer = 'patient' AND p.counts_as_collection AND p.transaction_date >= u.service_date
rec := later patient payments (service_date + w, service_date + recovery_window] applied to uncollected, capped
```
| Era | What works |
|---|---|
| Migrated history | Every column (H) with the derived patient portion `charged_fee − est_insurance` (k13), which overstates the patient portion where insurance paid more than estimated; user is the legacy login string (k6) |
| Both eras | Prepayments before the service day are not counted as collected at the visit (they are payments on earlier days): footnote |
| Waits for | 05 acceptance of the recovery metrics, the pro-rata provider binding and the user-credit rule |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `member_key`, `member_label` | Office / provider / user / weekday | text | `aggregate`; `provider_comp`; `user_activity` | label |
| `unit_count` | Patient-days with a patient portion | integer | `aggregate` | sum |
| `estimated_patient_portion_units` | Estimated patient portion | money | `financial_practice` | sum |
| `collected_at_visit_amount` | Collected at the visit | money | `financial_practice` | sum |
| `otc_collection_pct` | Time-of-service collection | percent | `financial_practice` | ratio |
| `uncollected_copay_amount` | Left uncollected | money | `financial_practice` | sum |
| `uncollected_copay_recovered_amount` | Recovered later | money | `financial_practice` | sum |
| `uncollected_copay_recovered_pct` | Recovered share | percent | `financial_practice` | ratio |
| `uncollected_copay_recovery_days` | Days to recover (weighted) | decimal | `financial_practice` | weighted_avg |
| `uncollected_copay_still_open_amount` | Still open after the recovery window | money | `financial_practice` | sum |

- Grouping: office band; `group_by`; periods (matrix when `time_grain` spans several periods). Grand total.
- Detail: one row per unit (`service_date`, account, guarantor and patients `phi_identified`, estimate, collected,
  uncollected, recovered, recovery date, next appointment date; `financial_patient`), `row_id_column = unit_key`.
- Summary cards: `otc_collection_pct` (with the 80 / 95 band), `uncollected_copay_amount`,
  `uncollected_copay_recovered_pct`. `reconciles_with`: `otc_collection_pct`, `uncollected_copay_amount`; user rows sum
  to the office total (one credited user per unit).

### Visuals and drill-through
- `trend` of `otc_collection_pct` with the band; `bars` by user or weekday.
- Day member or unit -> `management.uncollected_copay` for that date and office; still-open units ->
  `worklists.patient_ar` (accounts of the cell); unit row -> patient account ledger.

### Actions
- Row `navigate` to the account ledger; bulk `create_task` ("collect balance") on still-open units, handed to the
  worklist feature (`worklists.patient_ar` owns follow-up state). Weekly schedule to office managers.

### Open questions
- Window 0 days (05 default) versus 7 days: show both columns, or only the setting?
- Pro-rata provider split is NEW and needs 05 to accept it; otherwise "by provider" is limited to the treating provider of
  units with one provider.

## Payment plans and financing - `management.payment_plan_portfolio`

financial - P2 - M - `reports_management_reports_screen_view_only` - interactive - SCHEMA(37)

### Purpose
Office manager and financial coordinator, monthly: the regular and ortho contract book - how many contracts, how much
remains to bill and to collect, instalments due against posted and paid, which contracts are delinquent and for how
long, and how much patient money arrives through third-party financing. Supports collection follow-up, the decision to
offer in-house plans versus financing, and the check that the periodic posting actually ran.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `management.payment_plan_charges` (instalments due on one billing date); `lists.patients_on_payment_plan` (roster by setup date) | Contract balances, instalments due against posted and paid, unposted instalments, delinquency rate and days late on one shared definition, card on file, financing share of patient collections |

Called for by: KPI §3.2 (prepayments and plans as collection pitfalls), §3.11 (ortho contract money); CT I-37
(financial worklists); 06 §2.6 "Work queues" (`worklists.payment_plan_overdue` is the queue; this report is its
analysis).

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | contract office |
| `report_date` | `date` (`as_of`) | `today` | balances and delinquency as of the date (recomputed, k12) |
| `date_range` | `date_range` | `last_month` | flows: instalments due and payments received in the range |
| `provider_ids` | `entity_multi` | `all` | contract provider |
| `plan_type` | `enum` | `both` | filter card §3.5 `regular`, `ortho`; NEW option `both` requested from 04 |
| `report_format` | `enum` | `summary` | `summary` (by office, provider, kind), `detail` (one row per contract), `delinquent` (contracts past grace) |
| `group_by`, `sort_by`, `output_format` | §3.9 | `none`, `days_late_desc`, `pdf` | `group_by`: `none`, `office`, `provider`, `contract_kind` |

Settings echoed: `payment_plan_grace_days` (06 §6.12, default 10 days).

### Data

| Dataset | Columns used |
|---|---|
| `rpt_payment_plan_contracts` | `contract_kind`, `contract_key`, `patient_id`, `office_id`, `provider_id`, `setup_date`, `total_amount`, `pat_plan_amount`, `pat_amount_remaining`, `ins_amount_remaining`, `has_card_on_file`, `is_active` |
| `rpt_contract_installments` | `due_date`, `periodic_amount`, `is_billed`, `charge_id`, `plan_side` |
| `rpt_charges` | `charge_id`, `entry_id`, `service_date` (posting date of the instalment charge) |
| `rpt_ar_open_items()` | open amount of the instalment charge's leg (`entry_id`) as of `report_date` |
| `rpt_payment_allocations` | paid per instalment = allocations to the charge's `entry_id` |
| `rpt_ortho_contracts` | `unbilled_amount`, `next_due_date`, `is_past_planned_end` |
| `rpt_payments` | `txn_class = 'financing_payment'` (or `tender_class = 'financing'`) against `patient_collections` of the range |

One definition for both contract reports (NEW in 05 §5.11, requested; `ortho.ortho_contract_health` binds to the same
builders, so the ortho rows of this report equal that report for the same `report_date`):
- Posted by date D = `is_billed` and the instalment charge's `service_date <= D`.
- `installments_unposted_amount` as of D = Σ `periodic_amount` of instalments with `due_date <= D` not posted by D
  (both plan sides; for ortho rows this is `ortho_installments_unposted_amount`).
- `payment_plan_delinquent_contracts` as of D = contracts with at least one patient-side instalment with
  `due_date <= D − payment_plan_grace_days`, posted, and an open amount above 0 on its charge as of D (insurance-side
  instalments are followed as claims). Days late = D − `due_date` of the oldest such instalment.
  `ortho_delinquent_contracts` is its `contract_kind = 'ortho'` slice. The same predicate selects the rows of
  `worklists.payment_plan_overdue`.
- Paid per instalment: no payment-to-instalment link exists, so paid = allocations to the instalment's charge, labelled
  `allocation derived` until DATA-26 (k4).
- Measures: `ortho_remaining_to_bill_amount`, `ortho_installments_unposted_amount` (05); NEW
  `payment_plan_contracts_active`, `payment_plan_remaining_amount`, `installments_due_amount`,
  `installments_posted_amount`, `installments_paid_amount`, `installments_unposted_amount`,
  `payment_plan_delinquent_contracts`, `payment_plan_delinquent_pct`, `payment_plan_delinquent_days_avg`,
  `financing_collection_share_pct` requested from 05.

```
inst := SELECT i.*, c.entry_id, c.service_date AS posted_date, ar.open_amount
        FROM rpt_contract_installments i
        LEFT JOIN rpt_charges c ON c.charge_id = i.charge_id
        LEFT JOIN rpt_ar_open_items(:t, :offices, :as_of, 'account') ar ON ar.entry_id = c.entry_id
k    := SELECT contract_key, sum(periodic_amount) FILTER (WHERE due_date BETWEEN :from AND :to) due,
             sum(periodic_amount) FILTER (WHERE is_billed AND posted_date <= :as_of AND due_date BETWEEN :from AND :to) posted,
             sum(periodic_amount) FILTER (WHERE due_date <= :as_of AND NOT (is_billed AND posted_date <= :as_of)) unposted,
             max(:as_of - due_date) FILTER (WHERE plan_side = 'patient' AND is_billed AND open_amount > 0
                                             AND due_date <= :as_of - :payment_plan_grace_days) days_late
        FROM inst GROUP BY contract_key                       -- delinquent := days_late IS NOT NULL
```

| Era | What works |
|---|---|
| Migrated history | Nothing: no contract, plan or instalment was migrated |
| App era | Every column. The periodic posting sweep is not scheduled, so unposted instalments are expected until it is (listed, not hidden) |
| Waits for | DATA-37: contract billing can debit A/R twice until the `contract_movement` credit is posted (03 §2.25; affected contracts carry `double_billing_suspect` from 03 section 6 #33 / #34), and insurance-side instalments fail to post on PostgreSQL until then (check #26). DATA-26 (paid per instalment exact) |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `contract_kind`, member labels | Regular / ortho; office / provider | enum, text | `aggregate`; `provider_comp` by provider | label |
| `contracts_active` | Active contracts | integer | `aggregate` | sum |
| `contract_total_amount` | Contract total | money | `financial_practice` | sum |
| `remaining_to_bill_amount` | Remaining to bill | money | `financial_practice` | sum |
| `remaining_balance_amount` | Billed and still open | money | `financial_practice` | sum |
| `installments_due_amount` / `_posted_amount` / `_paid_amount` | Due / posted / paid in the range | money | `financial_practice` | sum |
| `installments_unposted_amount` | Due and not posted | money | `financial_practice` | sum |
| `payment_plan_delinquent_contracts`, `payment_plan_delinquent_pct` | Delinquent / share | integer, percent | `aggregate` | sum / ratio |
| `payment_plan_delinquent_days_avg` | Average days late | decimal | `aggregate` | weighted_avg (open amount) |
| `card_on_file_pct` | Card on file | percent | `aggregate` | ratio |
| `financing_collection_share_pct` | Financing share of patient collections | percent | `financial_practice` | ratio (organisation and office rows only) |

- Detail and delinquent formats: one row per contract (patient `phi_identified`, setup date, provider, kind, totals,
  next due, days late, card on file, `double_billing_suspect`; amounts `financial_patient`).
- Summary cards: `payment_plan_remaining_amount`, `installments_unposted_amount`, `payment_plan_delinquent_pct`,
  `financing_collection_share_pct`. `reconciles_with`: `ortho_remaining_to_bill_amount`,
  `ortho_installments_unposted_amount`, `ortho_delinquent_contracts` (ortho rows, equal to `ortho.ortho_contract_health`
  for the same `report_date`); `payment_plan_delinquent_contracts` = the contracts of `worklists.payment_plan_overdue` for
  the same scope.

### Visuals and drill-through
- `bars` of due / posted / paid per month; `aging`-style bars of delinquent amount by days-late band.
- Delinquent count -> `worklists.payment_plan_overdue` (office, provider); unposted -> `management.payment_plan_charges`
  (`report_date` = due date); contract count -> `lists.patients_on_payment_plan`; contract row -> patient payment-plan
  screen (`route_key` of 07).

### Actions
- Row `navigate` (contract); bulk `create_task` on delinquent contracts handed to `worklists.payment_plan_overdue`;
  `letters` (overdue notice) through the correspondence feature (PD-15). Monthly schedule with `skip_if_empty` on the
  delinquent format.

### Open questions
- Is "paid" per instalment acceptable on derived allocation, or should the report wait for a payment-to-instalment link
  (request to 03)?
- Should contracts whose patient also has financing payments be shown as one exposure?

## Fee schedule and UCR realisation - `analytics.fee_realization`

financial - P2 - M - `reports_daily_reports_screen_view_only` - interactive (background above 13 months) - SCHEMA(26)

### Purpose
Owner and office manager, quarterly and before the yearly fee update: for each procedure code and fee schedule, what the
office asks (UCR), what the schedule in force says, what was actually posted, and what was collected per procedure, with
the volume behind it. Lists codes posted at zero or unpriced and codes billed below the schedule in force. Supports the
UCR update, PPO fee negotiation priorities (high volume, low realisation) and the fix of pricing errors.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `lists.procedure_codes_by_fee_schedule` (a setup listing of fees); `daily.production_report` with `include_ucr` (one compare schedule for one range, no collections) | Per code and schedule: UCR, fee in force, average posted and collected per procedure, realisation %, volume, and four pricing tests that list the failing lines |

Different from `management.transaction_exceptions` format `fee_overrides` (a control list of single entries by user):
this is the price-level view per code and schedule. Both use the same fee-in-force builder. Called for by: CT I-24 (the
internal part; no external fee percentiles, PD-13); KPI §3.1 `implied_writeoff`, §3.3 RCM-07 / RCM-12; 06 §2.5 tile
"Data quality" (`unpriced_charge_count`).

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | office of service |
| `date_range` | `date_range` | `trailing_12_months` | fixed `date_basis = service_date` |
| `provider_ids` | `entity_multi` | `all` | treating provider |
| `fee_schedule_ids` | `entity_multi` | `all` | schedule in force for the line (`fee_in_force`: the charge's schedule, else the patient's, else the office default) |
| `carrier_ids` | `entity_multi` | `all` | through `payer_basis` |
| `procedure_category_codes`, `procedure_codes` | `entity_multi` | `all` | |
| `report_format` | `enum` | `summary` | `summary` (code x schedule), `exceptions` (rows failing a test), `detail` (charge lines) |
| `group_by`, `sort_by`, `output_format` | §3.9 | `code`, `volume_desc`, `pdf` | `group_by`: `none`, `code`, `fee_schedule`, `office` |
| `payer_basis` | `enum` NEW | `at_service` | as defined in `analytics.production_trend_mix` |
| `realization_tests` | `enum_multi` NEW | all ticked | `unpriced` (posted at zero or `is_unpriced`), `below_schedule` (posted fee < schedule fee in force), `above_ucr` (`fee_above_office_fee > 0`), `no_schedule_entry` (code has no entry on the charge's schedule) |
| `min_volume` | `integer` NEW | 5 | summary rows below the volume fold into `other` |

### Data
| Dataset | Columns used |
|---|---|
| `rpt_charges` | `procedure_code`, `fee_schedule_id`, `fee_source`, `is_unpriced`, `charged_fee`, `office_fee`, `implied_writeoff`, `fee_above_office_fee`, `quantity`, `service_date`, `office_id`, `provider_id`, `patient_id`, `entry_id` |
| `rpt_fee_schedule_fees` (DATA-51) | `fee_schedule_id`, `procedure_code`, `effective_date`, `effective_to` (half-open), `schedule_fee` |
| `rpt_patient_dim`, `rpt_office_dim` | `fee_schedule_id` (patient's current schedule); `default_fee_schedule_id`, `default_ucr_fee_schedule_id` |
| `rpt_payment_allocations` | collected per line: `debit_entry_id` = the charge's `entry_id`, `credit_ledger_bucket = 'collection'` |
| `rpt_remittance_lines` | insurance paid and write-off per line (app era) |

- Fee in force: one shared builder, NEW `fee_in_force(charge)` owned by 03 with DATA-51, used by this report and by format
  `fee_overrides` of `management.transaction_exceptions`, so the `below_schedule` drill returns the same lines. Schedule =
  `rpt_charges.fee_schedule_id`, else the patient's current schedule (`rpt_patient_dim.fee_schedule_id`, k12), else the
  office's `default_fee_schedule_id`, with `schedule_source` = `charge`, `patient_current` or `office_default`. Fee =
  `schedule_fee` of that schedule and code with `service_date >= effective_date AND (effective_to IS NULL OR service_date
  < effective_to)`. UCR = the same lookup on the office's `default_ucr_fee_schedule_id`.
- Per code x schedule: volume, `avg_ucr_fee`, `avg_schedule_fee`, `avg_posted_fee` (`charged_fee` per line; `quantity > 1`
  lines are normalised per unit, 03 §6 #24), `avg_collected` (NEW `collected_per_procedure`), NEW `posted_to_schedule_pct`
  (posted ÷ schedule fee), NEW `fee_realization_pct` (collected ÷ UCR), `implied_writeoff`, `unpriced_charge_count`.
- Collected per line is cut at the run date; service months younger than `maturity_days` (90) are `is_provisional` and
  kept out of the `collected_per_procedure` and `fee_realization_pct` totals (header rule).

```
fee_in_force(c) := SELECT k.schedule_id, k.schedule_source,
                          (SELECT f.schedule_fee FROM rpt_fee_schedule_fees f
                           WHERE f.fee_schedule_id = k.schedule_id AND f.procedure_code = c.procedure_code
                             AND c.service_date >= f.effective_date AND (f.effective_to IS NULL OR c.service_date < f.effective_to)
                           ORDER BY f.effective_date DESC LIMIT 1) AS schedule_fee
                   FROM (SELECT coalesce(c.fee_schedule_id, p.fee_schedule_id, o.default_fee_schedule_id) AS schedule_id,
                                CASE WHEN c.fee_schedule_id IS NOT NULL THEN 'charge'
                                     WHEN p.fee_schedule_id IS NOT NULL THEN 'patient_current' ELSE 'office_default' END AS schedule_source
                         FROM rpt_patient_dim p, rpt_office_dim o
                         WHERE p.patient_id = c.patient_id AND o.office_id = c.office_id) k
f := SELECT c.*, s.schedule_id, s.schedule_source, s.schedule_fee AS sched, u.schedule_fee AS ucr
     FROM rpt_charges c
     LEFT JOIN LATERAL fee_in_force(c) s ON true
     LEFT JOIN LATERAL (same fee lookup on o.default_ucr_fee_schedule_id) u ON true
     WHERE c.is_production AND <range, scope>
col := SELECT debit_entry_id, sum(amount) FROM rpt_payment_allocations WHERE credit_ledger_bucket = 'collection' GROUP BY 1
out := GROUP BY procedure_code, fee_schedule_id ; tests evaluated per line, counted per group
```
| Era | What works |
|---|---|
| Migrated history | Posted fees, volume and the UCR snapshot (H, k3). `fee_schedule_id` is NULL on migrated charges, so the schedule is the patient's current one or the office default (`schedule_source`, k12); schedule entries carry no end date, so a deleted entry rewrites the past (03 §2.29). Collected per line is derived oldest-first (k4) |
| App era | The schedule stamped on the charge; insurance paid per line from remittances |
| Waits for | DATA-51 (fee lookup, P1); DATA-26 (collected per line exact, SCHEMA(26)) |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `procedure_code`, `description`, `code_category` | Code | text | `aggregate` | label |
| `fee_schedule_id`, `fee_schedule_name`, `schedule_source` | Fee schedule | id, text, enum | `aggregate` | label |
| `procedure_count` | Volume | integer | `aggregate` | sum |
| `avg_ucr_fee`, `avg_schedule_fee`, `avg_posted_fee` | UCR / schedule / posted (per procedure) | money | `financial_practice` | weighted_avg (volume) |
| `collected_per_procedure` | Collected per procedure | money | `financial_practice` | ratio (collected / volume) |
| `posted_to_schedule_pct` | Posted vs schedule | percent | `financial_practice` | ratio |
| `fee_realization_pct` | Collected vs UCR | percent | `financial_practice` | ratio |
| `charged_production`, `implied_writeoff`, `collected_amount` | Totals | money | `financial_practice` | sum |
| `unpriced_count`, `below_schedule_count`, `above_ucr_count`, `no_schedule_entry_count` | Test counts | integer | `aggregate` | sum |
| `insurance_paid_per_procedure` | Insurance paid per procedure (app era) | money | `financial_practice` | ratio |

- Grouping: `group_by` level (code or schedule) with subtotals; grand total.
- Exceptions format: one row per failing charge line (date, patient `phi_identified`, code, schedule, posted, schedule fee,
  UCR, test, poster `user_activity`). Detail: every line of a group.
- Summary cards: `fee_realization_pct`, `posted_to_schedule_pct`, `unpriced_charge_count`, `implied_writeoff`.
  `reconciles_with`: `unpriced_charge_count`, `implied_writeoff`, `charged_production`.

### Visuals and drill-through
- Horizontal `bars` of `fee_realization_pct` for the top codes by volume, with volume as the adjacent table column.
- Code row -> `daily.production_report` (`procedure_codes`, `include_ucr = true`, `compare_fee_schedule_id` = the row's
  schedule); test count -> `kind = rows` (exceptions format); schedule -> `lists.procedure_codes_by_fee_schedule`
  (`fee_schedule_id`); line -> ledger entry; `below_schedule` lines -> `management.transaction_exceptions`
  (`report_format = fee_overrides`).

### Actions
- None on rows (fee changes happen in Setup). Quarterly schedule "Top 50 codes by volume"; monthly `exceptions` schedule
  with `skip_if_empty`.

### Open questions
- Which UCR is the reference when an office has no `default_ucr_fee_schedule_id`: the stamped `office_fee` (default here)
  or none?
- Tolerance for `below_schedule` (rounding cents) as a setting in 05?

## Payer mix and plan profitability - `insurance.payer_mix_profitability`

financial - P2 - L - `reports_insurance_reports_screen_view_only` - background - SCHEMA(33)

### Purpose
Owner and DSO finance, quarterly and before contract renewals: for each carrier and plan, how many patients and how much
production it carries, how much the contract concedes, what is collected per procedure and per chair hour, how fast it
pays and how often it denies. The basis for dropping, renegotiating or promoting a plan, compared with self-pay patients.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `daily.production_report` grouped by carrier (production only); `insurance.claims_list` (claims without economics) | Per carrier and plan: patients, share of production, contractual write-off rate, yield per procedure and per chair hour on mature service months, speed, denial and estimate accuracy, against self-pay |

Called for by: KPI §3.3 RCM-07 / RCM-08; DSO §14.6 ("payer mix with time to collect and write-offs by insurer"); 06
§2.7 tile "Payers" scorecard (rows = carriers).

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | office of service |
| `date_range` | `date_range` | `trailing_12_months` | service-date cohort; speed and denial rates on claims of the cohort; yield columns on its mature service months only (below) |
| `compare_to` | `enum` | `previous_year` | |
| `carrier_ids` | `entity_multi` | `all` | |
| `provider_ids` | `entity_multi` | `all` | treating provider |
| `report_format` | `enum` | `summary` | `summary` (carrier, expanding to plan), `detail` (charges of a carrier) |
| `group_by`, `sort_by`, `output_format` | §3.9 | `none`, `charged_desc`, `pdf` | `group_by`: `none`, `office` |
| `payer_basis` | `enum` NEW | `at_service` | as defined in `analytics.production_trend_mix`; self-pay = no dental coverage on the basis |
| `include_plans` | `boolean` NEW | `true` | second level per plan (`ins_plan_id`; plans have no name: label = group number + employer) |

### Data
| Dataset | Columns used |
|---|---|
| `rpt_charges` | payer by `payer_basis`, `charged_fee`, `office_fee`, `implied_writeoff`, `appointment_id`, `patient_id`, `service_date`, `entry_id` |
| `rpt_adjustments` | `txn_class = 'contractual_writeoff'`, `carrier_id` |
| `rpt_payment_allocations` | collected on the payer's charges (all payers), `credit_transaction_date` |
| `rpt_claim_facts`, `rpt_claim_lines`, `rpt_remittance_lines` | `carrier_id`, `ins_plan_id`, `submitted_date`, `first_paid_date`, `status_class`, `is_preauth`; estimate accuracy |
| `rpt_appointment_facts`, `rpt_insurance_coverage` | `duration_minutes`, `is_kept` (chair hours); the fallback payer |

- Maturity (header rule): `collected_amount`, `collected_per_procedure`, `collected_per_chair_hour`, the explicit part of
  `contractual_writeoff_rate_pct` and `days_to_payment` are computed only on service months that ended at least
  `maturity_days` (90) before the run date, and count money collected within 90 days of service, so a slow carrier is not
  penalised twice (in speed and again in yield). Production and share columns use the whole range; `yield_months` and the
  cut date print per run, and a carrier whose mature months hold too little volume (`rate_min_denominator`) is shown
  unranked.
- Measures per carrier (plan): distinct patients (NEW `payer_patients`), `charged_production`, `gross_production`, share of
  charged production (`category_production_share_pct` pattern over payers), `insured_production_share_pct` (organisation
  row), `contractual_writeoff_rate_pct`, collected (allocations), NEW `collected_per_procedure`, NEW
  `collected_per_chair_hour` (collected ÷ chair hours of kept appointments whose charges carry the payer, an appointment
  with several payers split by charged fee), `claim_days_to_payment`, `days_to_payment` (insurance side), `denial_rate_pct`
  (proxy), `first_pass_claim_rate_pct` (proxy), `insurance_estimate_accuracy_pct`, outstanding share
  (`outstanding_claims_amount` of the carrier as of today).

```
ch  := SELECT <payer key via payer_basis>, c.* FROM rpt_charges c ... WHERE c.is_production AND <service range>
col := SELECT ch.payer_key, sum(a.amount) FROM rpt_payment_allocations a JOIN ch ON a.debit_entry_id = ch.entry_id
       WHERE a.credit_ledger_bucket = 'collection' AND ch.service_month_end <= :run_date - :maturity_days
         AND a.credit_transaction_date <= ch.service_date + 90 GROUP BY 1      -- mature months, collected by day 90
hrs := SELECT payer_key, sum(f.duration_minutes * share) / 60 FROM rpt_appointment_facts f JOIN ch USING (appointment_id)
       WHERE f.is_kept GROUP BY 1                                   -- share = payer's fee share of the appointment
clm := SELECT carrier_id, ins_plan_id, <05 builders for claim_days_to_payment, denial_rate_pct, ...>
       FROM rpt_claim_facts WHERE NOT is_preauth AND service_to in range
```
| Era | What works |
|---|---|
| Migrated history | Payer is today's coverage (k12): a patient who changed carrier is attributed to the new one for all history. Collected per procedure is derived (k4); explicit contractual write-offs have no carrier; plan and status of migrated claims need DATA-10 / DATA-32 (k5). Chair hours rely on the charge-to-appointment link, unreliable on migrated rows (`appointment_link_reliable`, printed) |
| App era | Carrier on remittance write-offs; claim speed and denial proxies |
| Waits for | DATA-33 (payer on the service date, SCHEMA(33)); DATA-26 (exact yield); DATA-16 (chair-hour column, P3) |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `carrier_id`, `carrier_name`; `ins_plan_id`, `plan_label` | Carrier / plan | id, text | `aggregate` | label |
| `payer_patients` | Patients | integer | `aggregate` | count_distinct (not additive across carriers) |
| `charged_production`, `gross_production` | Production | money | `financial_practice` | sum |
| `production_share_pct` | Share of production | percent | `financial_practice` | share_of_parent |
| `contractual_writeoff_rate_pct` | Contractual write-off | percent | `financial_practice` | ratio |
| `yield_months` | Mature service months used | integer | `aggregate` | none (one value per run) |
| `collected_amount` | Collected by day 90 (mature months) | money | `financial_practice` | sum |
| `collected_per_procedure` | Collected per procedure | money | `financial_practice` | ratio |
| `collected_per_chair_hour` | Collected per chair hour | money | `financial_practice` | ratio |
| `claim_days_to_payment` | Claim turnaround (days) | decimal | `aggregate` | weighted_avg (claims) |
| `days_to_payment` | Service to payment (days) | decimal | `financial_practice` | weighted_avg (amount) |
| `denial_rate_pct`, `first_pass_claim_rate_pct` | Denial / first pass (proxy) | percent | `aggregate` | ratio |
| `insurance_estimate_accuracy_pct` | Estimate accuracy | percent | `financial_practice` | ratio |
| `outstanding_claims_amount` | Outstanding today | money | `financial_practice` | sum |
| `payer_source_current_share_pct` | Payer from current coverage | percent | `aggregate` | ratio |

- Rows: carriers (top 15 + `other`), `Self-pay`, `Payer not recorded`; plan level under each carrier. Organisation total.
- Detail: charges of a carrier (date, patient `phi_identified`, code, fee, write-off, collected).
- Summary cards: `insured_production_share_pct`, `contractual_writeoff_rate_pct`, `claim_days_to_payment`,
  `collected_per_procedure` (insured vs self-pay). `reconciles_with`: `charged_production` (total),
  `insured_production_share_pct`.

### Visuals and drill-through
- `scorecard` (rows = carriers, columns = the measures, bands from 05 where they exist); `bars` of production share.
- Carrier production -> `daily.production_report` (`carrier_ids`); collections -> `daily.collection_report`
  (`carrier_ids`); speed -> `insurance.claim_cycle_performance` (`carrier_ids`); denials -> `insurance.denial_analysis`;
  outstanding -> `worklists.outstanding_claims` (`carrier_ids`).

### Actions
- None. Quarterly schedule; shipped view "Trailing 12 months, carriers and plans".

### Open questions
- Profitability without cost data: the report ranks yield per procedure and per chair hour, never margin (no expense data,
  KPI DSO-07). Is "profitability" in the title acceptable?
- Dual coverage: production is attributed to the primary payer only; secondary collections count toward the primary's
  yield. Alternative: a `Dual coverage` member.

## Claim cycle and first-pass performance - `insurance.claim_cycle_performance`

financial - P2 - M - `reports_insurance_reports_screen_view_only` - interactive - APP

### Purpose
Billing lead and office manager, weekly and monthly: how fast claims leave the office and come back, by carrier, office,
treating provider and the user who sent them - submission lag, same-day rate, turnaround to first payment, first-pass
rate, resubmissions, and the lag between primary payment and the secondary claim. Drives the billing routine (same-day
sending, attachments) and carrier escalation.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `insurance.claims_list` (claim rows by status and date) | Cycle statistics by carrier, office, provider and sending user: submission lag, same-day rate, turnaround, first-pass proxy, resubmissions, secondary-claim lag, lag distribution |

Called for by: KPI §3.3 RCM-02 / RCM-04 / RCM-06, §3.12 FRO-06; DSO §14.6 (same-day claim rate); CT TS-4; 06 §2.7
tiles "Speed and quality", "Claims submitted" (header drill map: the rates drill here, the list stays the row target).

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | claim office |
| `date_range` | `date_range` | `last_month` | `date_basis` shared key: `service_date` (cohort by `service_to`, default), `submitted_date`, `first_paid_date` |
| `compare_to` | `enum` | `previous_period` | |
| `time_grain` | `enum` | `month` | |
| `carrier_ids` | `entity_multi` | `all` | |
| `provider_ids` | `entity_multi` | `all` | `provider_role = treating` (`treating_provider_id`) |
| `user_ids` | `entity_multi` | `all` | sending user (below) |
| `coverage_orders` | `enum_multi` (04 §15) | all | `primary`, `secondary`, `tertiary`, `quaternary` |
| `claim_kind` | `enum` | `claims` | pre-authorisations excluded from money and speed |
| `report_format` | `enum` | `summary` | `summary`, `distribution` (lag buckets), `detail` |
| `group_by`, `output_format` | §3.9 | `none`, `pdf` | `group_by`: `none`, `carrier`, `office`, `provider`, `user` |

### Data
| Dataset | Columns used |
|---|---|
| `rpt_claim_facts` | `claim_id`, `claim_family_no`, `tier`, `carrier_id`, `office_id`, `treating_provider_id`, `service_to`, `submitted_date`, `first_submitted_at`, `first_paid_date`, `submission_count`, `status_class`, `created_by_user_id`, `is_preauth`, `sent_method` |
| `rpt_claim_status_events` (NEW dataset over `claim_status_history`, DATA-25, requested from 03) | `claim_id`, `from_status`, `to_status`, `changed_at`, office-local `changed_date`, `changed_by`: sending user = `changed_by` of the first transition to `sent`; resubmissions = later transitions to `sent`; time in stage (created -> sent -> first paid) |
- Metrics: `claims_submitted_count`, `same_day_claim_rate_pct`, `claim_submission_lag_days`, `claim_days_to_payment`,
  `first_pass_claim_rate_pct` (proxy), `denial_rate_pct` (proxy); NEW `resubmission_rate_pct`,
  `secondary_claim_lag_days` (secondary `submitted_date` − primary `first_paid_date` within one family; `parent_claim_id`
  after DATA-31), `claim_create_to_send_days`, dimension `claim_lag_bucket` (`same_day`, `1_3`, `4_7`, `8_14`, `15_30`,
  `over_30`) requested from 05.

```
cl  := SELECT * FROM rpt_claim_facts WHERE NOT is_preauth AND status_class NOT IN ('deleted','void') AND <basis in range>
ev  := SELECT claim_id, min(changed_at) FILTER (WHERE to_status='sent') first_sent, count(*) FILTER (WHERE to_status='sent') sends,
             (array_agg(changed_by ORDER BY changed_at) FILTER (WHERE to_status='sent'))[1] sent_by
       FROM rpt_claim_status_events GROUP BY 1
sec := SELECT s.claim_id, s.submitted_date - p.first_paid_date FROM cl s JOIN cl p
       ON p.claim_family_no = s.claim_family_no AND p.tier = 'primary' AND s.tier = 'secondary'
```
| Era | What works |
|---|---|
| Migrated history | Sent to first payment (H). Submission lag and same-day rate need `service_to`, which migrated claims lack until the claim backfill (k5, history N(10)) |
| App era | First pass and resubmissions from `submission_count`; stage timing and sending user from DATA-25 go-live (G(25), `history starts on <date>`) |
| Waits for | DATA-25 (status events); DATA-31 (office-local claim dates: until then an evening send lands on the next day); DATA-10 (claim backfill). True clean-claim rate needs a clearinghouse (DATA-38) and is not offered |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| member key and label | Carrier / office / provider / user | text | `aggregate`; `provider_comp`; `user_activity` | label |
| `claims_submitted_count` | Claims sent | integer | `aggregate` | sum |
| `same_day_claim_rate_pct` | Sent on the service day | percent | `aggregate` | ratio |
| `claim_submission_lag_days` | Service to sent (days) | decimal | `aggregate` | weighted_avg (claims) |
| `claim_create_to_send_days` | Created to sent (days) | decimal | `aggregate` | weighted_avg |
| `claim_days_to_payment` | Sent to first payment (days) | decimal | `aggregate` | weighted_avg |
| `first_pass_claim_rate_pct` | First pass (proxy) | percent | `aggregate` | ratio |
| `resubmission_rate_pct` | Resubmitted | percent | `aggregate` | ratio |
| `denial_rate_pct` | Denied (proxy) | percent | `aggregate` | ratio |
| `secondary_claim_lag_days` | Primary paid to secondary sent (days) | decimal | `aggregate` | weighted_avg |
| `billed_amount` | Billed | money | `financial_practice` | sum (per family, never across a family) |
| `lag_<bucket>_count` (distribution format) | Claims per lag bucket | integer | `aggregate` | sum |

- Grouping: office band; `group_by`; periods as matrix columns in the summary format. Grand total.
- Detail: claims (claim number, carrier, patient `phi_identified`, tier, service, created, sent, first paid dates, sends,
  status, sent by `user_activity`).
- Summary cards: `same_day_claim_rate_pct` (band 20 / 80), `claim_submission_lag_days`, `claim_days_to_payment`,
  `first_pass_claim_rate_pct`. `reconciles_with`: these four and `claims_submitted_count`.

### Visuals and drill-through
- `trend` of the four headline rates; histogram-like `bars` per `claim_lag_bucket` (distribution format).
- Rate numerator and denominator -> `insurance.claims_list` (`claim_status`, `carrier_ids`, date range) separately;
  unsent part -> `worklists.unbilled_procedures`; slow carrier -> `worklists.outstanding_claims` (`carrier_ids`); claim row ->
  claim record.

### Actions
- None. Weekly schedule to the billing lead; alert suited: `same_day_claim_rate_pct` below 40 % for a week.

### Open questions
- Cohort default by service date (publisher's rule, every primary claim of the cohort) versus by sent date for the speed
  columns: one run mixes them; print the basis per column?
- Is "sending user" the user of the status transition or the claim creator when the transition was automatic?

## Denial analysis - `insurance.denial_analysis`

financial - P3 - M - `reports_insurance_reports_screen_view_only` - interactive - SCHEMA(31)

### Purpose
Billing lead and owner, monthly: which claims are denied, for how much, why, by carrier, procedure code, provider and
office, and what happened next - paid after resubmission or appeal, written off, or still open. Directs root-cause work
(coding, attachments, eligibility) and shows the recovery the billing team achieves.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `insurance.835_denial_report` (ERA 835 denials only, needs a clearinghouse) | Manually recorded denials as well, by reason, carrier, code, provider and office, with the outcome inside a window: paid after resubmission or appeal, written off, still open |

Called for by: DSO §14.6 "Denial analytics"; KPI §3.3 RCM-03 (denial rate and denial recovery); CT I-37; 06 §2.0.4
"Denial counts and amounts (P3, after DATA-31)", §2.7 "Work queues" (`worklists.denied_claims` is the queue; this is its
analysis). Phase: DATA-31 is P2, but the report is held at P3 by its queue `worklists.denied_claims` (P3), which owns the
follow-up and receives the bulk hand-off.

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | claim office |
| `date_range` | `date_range` | `last_month` | fixed `date_basis = denied_date` (NEW claim date basis, 04) |
| `compare_to` | `enum` | `previous_period` | |
| `carrier_ids`, `procedure_codes`, `procedure_category_codes` | `entity_multi` | `all` | codes through the claim family's lines |
| `provider_ids` | `entity_multi` | `all` | treating provider |
| `coverage_orders` | `enum_multi` | all | |
| `report_format` | `enum` | `summary` | `summary`, `recovery` (outcome by denial month), `detail` |
| `group_by`, `sort_by`, `output_format` | §3.9 | `reason`, `amount_desc`, `pdf` | `group_by`: `none`, `reason`, `carrier`, `code`, `provider`, `office` |
| `denial_reason_codes` | `entity_multi` NEW | `all` | NEW definitions group `claim_denial_reason` (03, DATA-31); ERA CARC / RARC codes when DATA-38 data flows |
| `recovery_window_days` | `integer` NEW | 120 | outcome horizon (KPI: about three cycles of 45-60 days) |

### Data
| Dataset | Columns used |
|---|---|
| `rpt_claim_facts` | NEW exposed columns from DATA-31 (request to 03): `denied_date`, `denial_reason_code`, `denial_remark_code`, `denied_amount`, `appeal_date`, `parent_claim_id` |
| `rpt_claim_lines` | codes of the claim family |
| `rpt_claim_status_events` (NEW, see `insurance.claim_cycle_performance`) | transitions after the denial |
| `rpt_remittance_lines` | payments and write-offs after `denied_date` |
| `era_adjustments` (NEW passthrough, DATA-38) | CARC / RARC codes, only with a clearinghouse |
- Outcome per denied claim within the window: `recovered_paid` (payment on the claim or its resubmitted successor after the
  denial), `resubmitted_pending`, `appealed_pending` (`appeal_date` set), `written_off` (write-off remittance or an
  adjustment on its lines), `open_no_action`.
- NEW metrics requested from 05: `denied_claims_count`, `denied_amount`, `denial_recovery_pct` (recovered amount ÷ denied
  amount), `denial_recovery_days`, `denial_open_amount`; existing `denial_rate_pct` (proxy; dated denials G(31)).

```
d   := SELECT * FROM rpt_claim_facts WHERE status_class = 'denied' OR denied_date IS NOT NULL   -- once denied counts
pay := SELECT claim_id, sum(paid) FILTER (WHERE payment_date > d.denied_date AND payment_date <= d.denied_date + :w)
       FROM rpt_remittance_lines ... (claim and its successors through parent_claim_id / claim_family_no)
out := d JOIN lines (codes) ; outcome by precedence paid > written_off > appealed > resubmitted > open
```
| Era | What works |
|---|---|
| Migrated history | Nothing: migrated claims carry no denial data |
| App era | From DATA-31 go-live (G(31)). Before it a denial is only a current `status_class = 'denied'` with no date, amount or reason: the summary runs on status only with the "proxy" label and `recovery` is `not_available` |
| Waits for | DATA-31 (P2); DATA-38 (ERA reason codes replace the manual ones) |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| member key and label | Reason / carrier / code / provider / office | text | `aggregate`; `provider_comp` by provider | label |
| `denied_claims_count` | Denied claims | integer | `aggregate` | sum |
| `denied_amount` | Denied amount | money | `financial_practice` | sum |
| `share_of_denied_pct` | Share | percent | `financial_practice` | share_of_parent |
| `denial_rate_pct` | Denial rate (proxy) | percent | `aggregate` | ratio |
| `recovered_amount`, `denial_recovery_pct` | Recovered / share | money, percent | `financial_practice` | sum / ratio |
| `written_off_amount` | Written off | money | `financial_practice` | sum |
| `denial_open_amount` | Still open | money | `financial_practice` | sum |
| `denial_recovery_days` | Days to recover | decimal | `aggregate` | weighted_avg (recovered amount) |
| outcome counts | Paid / resubmitted / appealed / written off / open | integer | `aggregate` | sum |

- Recovery format: matrix denial month x outcome. Detail: denied claims (claim, patient `phi_identified`, carrier, codes,
  reason, remark, denied date and amount, outcome, recovered, days).
- Summary cards: `denied_amount`, `denial_rate_pct`, `denial_recovery_pct`, `denial_open_amount`. `reconciles_with`:
  `denial_rate_pct`; open amount = the `denied_amount` total of `worklists.denied_claims` for the same scope.

### Visuals and drill-through
- Pareto `bars` by reason (count and amount); `funnel` denied -> resubmitted / appealed -> recovered.
- Open amount -> `worklists.denied_claims` (`carrier_ids`, reason); any member -> `kind = rows`; claim row -> claim record
  (resubmit, close there); ERA-only views -> `insurance.835_denial_report`.

### Actions
- Bulk `create_task` handed to `worklists.denied_claims` for open claims. Monthly schedule; alert suited: denial rate above
  8 % (05 band).

### Open questions
- Count a claim denied once in its life (here) or per denial event (needs `claim_status_history` with several denials)?
- Line-level denials (one procedure denied, others paid) are not storable until DATA-31 adds line fields: request to 03?

## Eligibility verification compliance - `insurance.eligibility_verification_compliance`

financial - P3 - M - `reports_insurance_reports_screen_view_only` - interactive - SCHEMA(34)

### Purpose
Office manager and insurance coordinator, weekly: what share of insured appointments had coverage verified inside the
validity window before the visit, how far ahead, by whom and for which carriers; how many checks found the patient not
eligible, and what happened at those visits. Holds the desk to the "verify 24-48 hours ahead" routine and links lapses to
denials and surprise patient balances.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `insurance.dps_eligibility_report` (the verification list for a date range) | Share of insured past appointments verified inside the validity window, lead time bands, rates by office, user and carrier, not-eligible findings and what happened at those visits |

Called for by: KPI §3.3 RCM-09; CT TS-4; 06 §2.7 tile "Eligibility", §2.16 tile "Insurance desk" (both drill to
`worklists.eligibility_verification` for the queue; the rate history drills here). Phase: DATA-34 is P2, but the report is
held at P3 by the eligibility metrics of 05 (P3) and its queue `worklists.eligibility_verification` (P3).

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | appointment office |
| `date_range` | `date_range` | `last_month` | fixed `date_basis = appointment_date`; past appointments only (the future window is the worklist's) |
| `compare_to` | `enum` | `previous_period` | |
| `carrier_ids` | `entity_multi` | `all` | carrier of the primary dental slot |
| `user_ids` | `entity_multi` | `all` | verifying user (`checked_by`; automatic sweeps = member `Automatic`) |
| `provider_ids` | `entity_multi` | `all` | appointment provider |
| `report_format` | `enum` | `summary` | `summary`, `detail` (appointments) |
| `group_by`, `output_format` | §3.9 | `none`, `pdf` | `group_by`: `none`, `office`, `user`, `carrier`, `lead_bucket` |
| `min_lead_hours` | `integer` NEW | 0 | a check counts as "in time" only when at least this many hours before the start |

### Data
| Dataset | Columns used |
|---|---|
| `rpt_appointment_facts` | live, not blocks: `appointment_id`, `appointment_date`, `start_time`, `office_id`, `provider_id`, `patient_id`, `status_class`, `is_kept` |
| `rpt_insurance_coverage` | `category = 'dental'`, `tier = 'primary'`, `carrier_id` ("insured") |
| `rpt_eligibility_checks` (NEW, owner 03, DATA-34; already requested by `catalog/insurance_reports.md`) | `checked_at`, `checked_date`, `elig_status_class`, `method`, `checked_by`, `patient_id`, `appointment_id`, `tier` |
| `rpt_claim_facts` | later denial of the visit's claim (outcome column) |
- In time = a `verified` check for the patient's primary dental coverage with `checked_at` inside
  [`appointment start − eligibility_valid_days` (setting 35), `appointment start − min_lead_hours`].
- Lead time = appointment start − latest check before it; NEW dimension `verification_lead_bucket` (`same_day`, `1_day`,
  `2_3_days`, `4_7_days`, `8_30_days`, `older`, `never`). NEW metrics requested from 05: `eligibility_verified_in_time_pct`
  (history-based twin of `eligibility_verified_pct`), `eligibility_lead_hours_avg`, `not_eligible_findings_count`.
- Outcome of not-eligible findings: kept / broken (`status_class`), patient payment at the visit (`otc` unit of
  `management.time_of_service_collection`), claim denied later (P3, DATA-31).

```
a   := SELECT f.* FROM rpt_appointment_facts f JOIN rpt_insurance_coverage cov ON cov.patient_id = f.patient_id
       AND cov.category = 'dental' AND cov.tier = 'primary' WHERE NOT f.is_block AND NOT f.is_deleted AND <range, scope>
chk := LATERAL (SELECT * FROM rpt_eligibility_checks e WHERE e.patient_id = a.patient_id
       AND e.checked_at < a.start_ts - :min_lead ORDER BY e.checked_at DESC LIMIT 1)
out := a LEFT JOIN chk ; in_time := chk.elig_status_class = 'verified' AND chk.checked_at >= a.start_ts - :valid_days
```
| Era | What works |
|---|---|
| Migrated history | Nothing: only one overwritable stamp per subscriber exists (`elig_verified_on`), so past appointments cannot be judged |
| App era | From DATA-34 go-live (G(34)); earlier periods render `history starts on <date>`; the current-state `eligibility_verified_pct` stays on the dashboard |
| Both eras | Insured is today's coverage (k12): a patient who gained or lost coverage since the visit is misclassified; one stamp per subscriber marks every dependant |
| Waits for | DATA-34 (P2); DATA-31 (claim denied later) |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| member key and label | Office / user / carrier / lead bucket | text | `aggregate`; `user_activity` by user | label |
| `insured_appointments` | Insured appointments | integer | `aggregate` | sum |
| `verified_in_time_count`, `eligibility_verified_in_time_pct` | Verified in time / share | integer, percent | `aggregate` | sum / ratio |
| `verified_late_count` | Verified, but outside the window (too early or after the start) | integer | `aggregate` | sum |
| `never_verified_count` | Not verified | integer | `aggregate` | sum |
| `eligibility_lead_hours_avg` | Average lead (hours) | decimal | `aggregate` | weighted_avg (checks) |
| `not_eligible_findings_count` | Found not eligible | integer | `aggregate` | sum |
| `not_eligible_kept_count` | ...and the visit was kept | integer | `aggregate` | sum |
| `not_eligible_collected_amount` | Patient payment at those visits | money | `financial_practice` | sum |
| `denied_after_visit_count` | Claim later denied | integer | `aggregate` | sum |

- Detail: appointments (date, time, patient `phi_identified`, carrier, last check time and result, verifier, lead, status).
- Summary cards: `eligibility_verified_in_time_pct`, `never_verified_count`, `not_eligible_findings_count`.
  `reconciles_with`: none (the dashboard metric is current-state; the twin is NEW).

### Visuals and drill-through
- `trend` of the in-time share; `bars` by `verification_lead_bucket`.
- Never-verified count -> `kind = rows`; not-eligible rows -> patient insurance screen; user cell -> `kind = rows` filtered by
  user; date -> `insurance.dps_eligibility_report` for that date.

### Actions
- None on past rows (the future queue is `worklists.eligibility_verification`). Weekly schedule; alert suited: in-time
  share below 90 % for a week.

### Open questions
- Validity window per carrier (some plans need re-verification per visit) or one organisation setting (05 setting 35)?
- Should a check done on the visit day before the start count as in time when `min_lead_hours = 0`? Default yes.

## Day close and deposit reconciliation - `daily.day_close_reconciliation`

financial - P2 - L - `reports_daily_reports_screen_view_only` - interactive - SCHEMA(29)

### Purpose
Office manager each morning ("Yesterday" view), owner and controller at month end: for each office-day, the payments
posted by tender against the amounts deposited, what is still undeposited, whether the day was closed, by whom and when,
what changed after the close, and whether the month is locked. The cash-control register that proves the day sheet, the
deposit and the ledger agree.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `daily.deposit_slip` (the contents of one deposit); `monthly.executive_day_sheet` (a day's totals without the deposit side) | Per office-day: posted by tender against deposited, undeposited remainder, deposit variance, close state, closer and time, changes after the close, frozen against live totals, month-lock status |

Called for by: KPI §6 routines (end of day: balance the deposit; end of month: close out), §3.12 FRO-07; CT TS-2; 06
§2.6 tile "Cash controls", §2.16 "Day controls" (`worklists.day_close_checklist` is the queue for days not yet closed).

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | posting office (deposits sit where the money was keyed, R-09) |
| `date_range` | `date_range` | `month_to_date` | fixed `date_basis = transaction_date` (business date); shipped view "Yesterday" |
| `payment_types` | `enum_multi` | all ticked | deposit groups |
| `report_format` | `enum` | `summary` | `summary` (office-day), `detail` (payments of one office-day with deposit link), `month_lock` (office-month) |
| `group_by`, `output_format` | §3.9 | `office`, `pdf` | |
| `close_states` | `enum_multi` NEW | all ticked | `closed`, `reopened`, `not_closed`, `closed_calendar_day` (office closed by calendar) |
| `only_exceptions` | `boolean` NEW | `false` | rows with a variance, an undeposited amount, a post-close correction or no close |

### Data
| Dataset | Columns used |
|---|---|
| `rpt_office_calendar_days()` | open days |
| `rpt_payments` | `posting_office_id`, `office_id`, `transaction_date`, `deposit_group`, `deposit_id`, `counts_as_collection`, `amount`, `created_at_utc`, `created_at_reliable` |
| `deposits`, `deposit_items` (NEW passthroughs, DATA-28) | `deposit_date`, `deposit_group`, `status`, `total_amount`, `deposited_by`, `deposited_at`; items |
| `office_day_closes`, `financial_period_locks` (NEW passthroughs, DATA-29) | `status`, `closed_at`, `closed_by`, `reopened_at`, `reopened_by`, `reopen_reason`, `control_totals`; `locked_through`, `locked_by`, `unlocked_at` |
| `rpt_day_close_snapshot`, `rpt_snapshot_variances` (DATA-30) | frozen control totals |
| `rpt_ledger_entries_all` | legs keyed or voided after `closed_at` whose `transaction_date` is the business date: `created_at_utc`, `created_at_reliable`, `is_void`; `voided_at` (DATA-14, NEW column on the view) |
| `rpt_user_dim` | closer and poster labels |

- Keyed time: no `rpt_*` view exposes `posted_at` (DATA-13 adds it to the base tables). Request to 03 as part of DATA-13:
  `posted_at` and `posting_date` on `rpt_ledger_entries(_all)`, `rpt_payments` and `rpt_adjustments`. Until then the
  sketch reads `created_at_utc`; a row with `created_at_reliable = false` is labelled (every migrated row precedes the
  first close, so the test is exact for app rows).
- Per office-day: posted collections by deposit group (R-09), deposited (items of deposits holding the day's payments),
  undeposited (`undeposited_payments_amount`), deposit variance (deposit total − items), close state, closer, close time,
  frozen control totals versus live recompute (variance = post-close changes), corrections after close (count, signed
  amount, users), lock state of the date. Metrics: `day_close_compliance_pct`, `undeposited_payments_amount`; NEW
  `deposit_variance_amount`, `post_close_correction_amount`, `post_close_correction_count`, `days_open_unclosed` requested
  from 05.

```
d   := SELECT office_id, day FROM rpt_office_calendar_days(:t, :offices, :from, :to) WHERE is_open
pay := SELECT coalesce(posting_office_id, office_id) o, transaction_date, deposit_group, -sum(amount) posted,
             -sum(amount) FILTER (WHERE deposit_id IS NULL) undeposited FROM rpt_payments WHERE counts_as_collection ...
cls := latest office_day_closes row per (office_id, business_date)
chg := SELECT office_id, transaction_date, count(*), sum(amount) FROM rpt_ledger_entries_all e JOIN cls ...
       WHERE e.created_at_utc > cls.closed_at OR (e.is_void AND e.voided_at > cls.closed_at)   -- posted_at once exposed (DATA-13)
lck := max(locked_through) of the effective lock rows (office or all offices) ; is_locked := day <= lck
```
| Era | What works |
|---|---|
| Migrated history | Nothing: no deposit, close or lock existed; migrated payments have no deposit |
| App era | From DATA-28 / DATA-29 go-live; earlier days render `history starts on <date>`, later days without a close render `not_closed` |
| Waits for | DATA-28 (deposits), DATA-29 (closes and locks), DATA-30 (frozen control totals), DATA-14 (void stamps); DATA-13 view columns (`posted_at`) |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `business_date`, `office_id`, `office_name` | Day / office | date, id, text | `aggregate` | label |
| `posted_<deposit_group>_amount` | Posted by tender (one column per group) | money | `financial_practice` | sum |
| `posted_total_amount` | Posted collections | money | `financial_practice` | sum |
| `deposited_amount` | Deposited | money | `financial_practice` | sum |
| `undeposited_payments_amount` | Undeposited | money | `financial_practice` | sum |
| `deposit_variance_amount` | Deposit variance | money | `financial_practice` | sum |
| `close_state` | Close state | enum | `aggregate` | none |
| `closed_by_label`, `closed_at` | Closed by / at | text, datetime | `user_activity` | none |
| `reopen_count`, `reopen_reason` | Reopened | integer, text | `user_activity` | sum / none |
| `post_close_correction_count`, `post_close_correction_amount` | Changes after close | integer, money | `financial_practice` | sum |
| `control_total_variance_amount` | Frozen vs now | money | `financial_practice` | sum |
| `is_locked`, `locked_through` | Month lock | boolean, date | `aggregate` | none |
| `day_close_compliance_pct` (subtotal rows) | Days closed | percent | `aggregate` | ratio |

- Grouping: office (subtotal with compliance and undeposited), days. Month-lock format: office x month (lock date, locker,
  unlocks, open days, unclosed days).
- Detail: payments of one office-day (entry, patient `phi_identified`, amount `financial_patient`, tender, deposit,
  poster `user_activity`, posted after close flag).
- Summary cards: `day_close_compliance_pct`, `undeposited_payments_amount`, `days_open_unclosed`,
  `post_close_correction_amount`. `reconciles_with`: `day_close_compliance_pct`, `undeposited_payments_amount`; R-09 per row
  (posted = deposited + undeposited), a failing row is flagged.

### Visuals and drill-through
- Calendar `heatmap` of close state per office-day; `bars` of undeposited by day.
- Deposit cell -> `daily.deposit_slip` (date, deposit group); posted cell -> `daily.daily_journal` for the office-day;
  corrections -> `management.transaction_exceptions` (post-close format); unclosed day -> `worklists.day_close_checklist`;
  close row -> the day-close screen (`route_key` of 07, `setup_close_out_*` rights).

### Actions
- Row `navigate` to the day close of the office-day. No close or deposit is performed from the report (`side_effects =
  none`). Shipped view "Yesterday" scheduled each working morning with `skip_if_empty` + `only_exceptions = true`; month-end
  view "Month lock status".

### Open questions
- Card settlements are batched by the processor, not by tender day: should the variance compare against a processor
  settlement total (no data) or only against deposits keyed in DentC?
- One day close per office covers all deposit groups; is a per-group close needed (cash drawer versus cards)?

## Cash-conversion waterfall - `analytics.cash_conversion_waterfall`

financial - P4 - M - `reports_monthly_reports_screen_view_only` - background - SCHEMA(30)

### Purpose
Owner and DSO finance, quarterly: how office-fee production of the last 12 months turns into cash, and where it leaks -
contractual concessions, the time-of-service gap, bad debt and aged receivables at risk - stage by stage and office by
office, with the rows behind each stage. Ranks the levers (renegotiate, collect at the desk, follow up old A/R) by dollar
size.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `monthly.waterfall_report` (collections by service month, collected to date) | Stage losses from office-fee production to estimated cash, each counted once, per office, with the rows behind every stage and actual net collections beside the estimate |

Called for by: DSO §14.6 (cash-conversion waterfall, recovery sizing); KPI §3.13 DSO-08; 06 §2.7 tile "Cash conversion"
(drill target "stage lists", header drill map), §2.14 tile "Revenue cycle".

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | stage attribution per stage (below); multi-office runs show offices as columns |
| `report_date` | `date` (`as_of`) | last month end | the window is the 12 months ending at the date (fixed by the metric) |
| `compare_to` | `enum` | `none` | `previous_year` (window ending a year earlier) |
| `report_format` | `enum` | `summary` | `summary` (stages), `detail` (rows of one stage) |
| `group_by`, `output_format` | §3.9 | `none`, `pdf` | `group_by`: `none`, `office` (columns) |
| `waterfall_stage` | `enum` NEW in 04 (05 dimension) | `all` | required for `detail`: `contractual`, `time_of_service_gap`, `bad_debt`, `aged_ar_at_risk` |

### Data
| Stage (`waterfall_stage`) | Source | Rule over the 12-month window ending `report_date` |
|---|---|---|
| `gross_production` | `rpt_charges.office_fee`, office of service | production of the window |
| `contractual` | `rpt_charges`, `rpt_adjustments` | `implied_writeoff − Σ contractual_writeoff` adjustments |
| `time_of_service_gap` | units of `management.time_of_service_collection` serviced in the window | `uncollected_copay_still_open_amount`: the patient portion not collected at the visit and not recovered within `recovery_window_days` (60), as of `report_date`. Units of the last `recovery_window_days` of the window are not mature: their uncollected amount so far is used and marked `is_provisional` |
| `bad_debt` | `rpt_adjustments`, class `bad_debt` | `bad_debt_amount` |
| `aged_ar_at_risk` | `rpt_ar_open_items(report_date)` (open debit items, transaction attribution) | `(1 − aged_ar_recovery_share) ×` (open amount aged over 90 days of debits serviced in the window − the stage-3 amount of units serviced at least 90 days before `report_date`) |
| estimated cash | — | `gross_production` − the four stages |

Overlap rule (printed in the criteria echo): a patient portion not collected at the visit and still open after the
recovery window is counted once, in `time_of_service_gap`; `aged_ar_at_risk` is limited to debits serviced in the window
(so the flow stages and the stock stage cover the same year) and excludes that amount. Only the still-open part of the
time-of-service gap is a stage: the part recovered later is not leakage. This differs from 05 §5.13 (stage 3 =
`uncollected_copay_amount`, stage 5 = `ar_over_90_amount` of every debit): challenge to 05 §5.13, which should adopt the
rule for `cash_conversion_waterfall_amount`.

- Beside the estimate (not a stage): actual `net_collections` of the same 12 months, so the estimate can be checked, and
  the frozen month-end `ar_over_90_amount` (`rpt_ar_snapshot`) with the part outside the window, as a check of stage 5.
- Detail rows per stage: contractual -> charge lines with implied write-off and contractual adjustment legs; gap ->
  account-office-day units with the still-open amount; bad debt -> adjustment legs; aged A/R -> open items over 90 days
  of window debits, with the stage-3 units marked and netted.

```
s1 := gross_production(:window)        s2 := contractual(:window)        s4 := bad_debt_amount(:window)
s3 := Σ uncollected_copay_still_open_amount of TOS units with service_date in :window, as of :as_of
s5 := (1 - setting46) * ( Σ open_amount FROM rpt_ar_open_items(:t, :offices, :as_of, 'account_office')
                                         WHERE age_days > 90 AND service_date IN :window
                          - Σ s3 amount of units with service_date <= :as_of - 90 )
out:= rows (stage, amount, share_of_gross) ; cash := s1 - s2 - s3 - s4 - s5 ; compare: same for :as_of - 1 year
```

| Era | What works |
|---|---|
| Migrated history | Gross, contractual (implied part) and time-of-service stages (H; k3, k13). Bad debt and the explicit contractual part are 0 on migrated months and the unclassified amount is printed beside the stages (k1) |
| Both eras | Shares are of office-fee production (the publisher uses expected-fee production: context only, 05). Stage 5 is recomputed from open items; the frozen month-end total is the check |
| Waits for | DATA-12 (classified adjustments on history); DATA-30 (frozen month-end A/R for the check, SCHEMA(30)); 05 acceptance of the overlap rule |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `waterfall_stage`, `stage_label` | Stage | enum, text | `aggregate` | label |
| `stage_amount` | Amount | money | `financial_practice` | none (a waterfall: start, steps, end) |
| `share_of_gross_pct` | Share of gross production | percent | `financial_practice` | none |
| `stage_amount_compare`, `stage_variance_pct` | PY / variance | money, percent | `financial_practice` | none |
| `office_<id>_amount` (office columns) | Per office | money | `financial_practice` | none |
| `net_collections_actual` (card and footer row) | Actual net collections, same window | money | `financial_practice` | none |
| `metric_definition_amount` | Stage on the current 05 definition | money | `financial_practice` | none (stages 3 and 5 only, until 05 adopts the overlap rule) |
| `stage_quality` | Frozen / recomputed / degraded / provisional | enum | `aggregate` | none |

- Detail: per stage the columns of its source rows (entry or unit id, date, patient `phi_identified`, code or account,
  amount `financial_patient`), `row_id_column` per stage.
- Summary cards: gross production, leakage total (stages 2-5), estimated cash, `net_collections_actual`. `reconciles_with`:
  stages `gross_production`, `contractual` and `bad_debt` = `cash_conversion_waterfall_amount` with that
  `waterfall_stage`; `time_of_service_gap` and `aged_ar_at_risk` once 05 adopts the overlap rule (until then the 05 values
  print in the column `metric_definition_amount` beside them).

### Visuals and drill-through
- `funnel` drawn as a waterfall (06 §3.5); per-office small multiples for multi-office runs.
- Stage -> `kind = rows` (detail of the stage); contractual -> `analytics.adjustment_writeoff_analysis`
  (`adjustment_classes = contractual`); gap -> `management.time_of_service_collection`; bad debt ->
  `analytics.adjustment_writeoff_analysis` (`bad_debt`); aged A/R -> `monthly.aging_report` (`report_date`, `aging_buckets`
  over 90) and `worklists.patient_ar` / `worklists.outstanding_claims`.

### Actions
- None. Quarterly schedule to owners; shipped view "Trailing 12 months by office".

### Open questions
- Recovery share of A/R over 90 (setting 46, default 0.45 from the publisher): keep as an organisation setting or let the
  run override it?
- Show capitation offices separately (no per-procedure contractual write-off; `AD900` is outside both nets)?

## Provider pay basis - `management.provider_pay_basis`

financial - P2 - L - `reports_management_reports_screen_view_only` - background - SCHEMA(26)

### Purpose
Owner, office manager or payroll administrator at each pay period: for every provider, pay period and office, the inputs
of any production-, collection- or lab-net pay formula side by side - production, adjusted (net) production, collections
allocated to the provider's work, lab fees, and refunds or reversals of money already credited. No pay is computed and no
pay rule is stored; the report gives one reproducible, frozen basis per period that payroll applies its formula to.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `monthly.income_allocation` (allocated income only, one range); `daily.production_report` by provider (production alone) | Every pay input side by side per provider, pay period and office: production, adjusted production, allocated collections, lab fees, reversals of earlier credits; frozen per locked period; a statement per provider with the rows behind each input |

Called for by: DSO §14.7 (ADA models: total production, adjusted production, collections, lab-net), §15 #17 (provider
compensation statements); KPI §3.2 COL-02 ("basis of collection-based provider pay"). Phase P2: its datasets are P1-P2
(DATA-23, DATA-26, DATA-29, DATA-30); a period is reproducible only once it is locked.

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | per-office breakdown (pay is often per location, DSO §14.7) |
| `date_range` | `date_range` | `last_month` | the pay period(s); bases fixed per column (below) |
| `pay_period_grain` | `enum` NEW (header) | `month` | `week`, `biweekly`, `semi_monthly`, `month`; `week` and `biweekly` anchor on the payroll week |
| `provider_ids` | `entity_multi` | `all` | `provider_restriction = self_unless_privileged` (PD-11): a restricted caller gets the own rows and no office total |
| `production_group` | `enum` | `all` | |
| `report_format` | `enum` | `summary` | `summary` (provider x period x office), `statement` (one provider, one period, every component with its rows), `detail` |
| `group_by`, `page_break_by`, `output_format` | §3.9 | `provider`, `provider`, `pdf` | |
| `hygiene_credit` | `enum` NEW | 05 setting | `hygienist`, `dentist`, `both` (05 hygienist crediting setting); printed |

### Data
| Component | Basis | Source |
|---|---|---|
| Production | service date | `rpt_charges` (`gross_production`, `charged_production` by treating provider; hygienist per `hygiene_credit`) and `production_adjustments` attributed to the provider (`rpt_ledger_entries`, `production_adjustment`) -> `net_production`, `net_production_before_bad_debt` |
| Collections | allocation date | `provider_income` from `rpt_payment_allocations` (`allocation_provider_id`, `allocation_office_id`, `allocation_date`, targets `production`, `non_production_charge`, `debit_adjustment`); `Unassigned provider` and `Unallocated` rows shown |
| Reversals | reversal date | money credited in an earlier period and taken back in this one (refund linked to the payment, payment reversal, re-allocation): NEW `provider_income_reversed_amount` (05), from persisted allocations with `reversed_at` in the period (DATA-26); not computable on derived rows (a recomputation rewrites the earlier period instead) |
| Lab fees | appointment date | `rpt_lab_cases.lab_cost` by `provider_id` and office (NEW `provider_lab_cost_amount`, the P binding of `lab_cost_amount`, 05) |
| Freeze | — | periods inside a `financial_period_locks` lock (DATA-29) read `rpt_metric_values` with `snapshot_kind = 'period_lock'` (DATA-30; 05 §10 freezes `provider_income`); open periods are live and marked `open` |

```
prd := SELECT provider_id, office_id, period(service_date), sum(office_fee), sum(charged_fee) FROM rpt_charges ...
adj := SELECT provider_id, office_id, period(<dating>), sum(amount) FROM rpt_ledger_entries WHERE ledger_bucket='production_adjustment'
inc := SELECT allocation_provider_id, allocation_office_id, period(allocation_date), sum(amount)
       FROM rpt_payment_allocations WHERE credit_ledger_bucket='collection' AND allocation_target IN (...)
rev := SELECT ... FROM payment_allocations (persisted) WHERE reversed_at in period            -- DATA-26
lab := SELECT provider_id, office_id, period(appointment_date), sum(lab_cost) FROM rpt_lab_cases
out := FULL JOIN on (provider_id, office_id, period) ; frozen periods replaced by period_lock values
```
| Era | What works |
|---|---|
| Migrated history | Production (H; net degraded, k1). Collections derived oldest-first, changing when back-dated entries arrive (k4); lab fees: 18 migrated cases |
| App era | A reproducible pay basis: persisted allocations (DATA-26) frozen by a period lock (DATA-29, DATA-30); reversals |
| Waits for | DATA-26 (SCHEMA(26)), DATA-29, DATA-30 (P2); DATA-23 (P1) |

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `provider_id`, `provider_label`, `provider_kind` | Provider | id, text, enum | `provider_comp` | label |
| `pay_period_start`, `pay_period_end`, `period_state` | Pay period / open or locked | date, date, enum | `aggregate` | label |
| `office_id`, `office_name` | Office | id, text | `aggregate` | label |
| `gross_production` | Production (office fee) | money | `provider_comp` | sum |
| `charged_production` | Production (posted fee) | money | `provider_comp` | sum |
| `production_adjustments` | Production adjustments | money | `provider_comp` | sum |
| `net_production` | Adjusted production | money | `provider_comp` | sum |
| `provider_income` | Collections allocated | money | `provider_comp` | sum |
| `provider_income_reversed_amount` | Reversed in the period | money | `provider_comp` | sum |
| `provider_lab_cost_amount` | Lab fees | money | `provider_comp` | sum |
| `collections_net_of_lab_amount` | Collections less lab fees | money | `provider_comp` | sum |
| `allocation_quality` | Persisted / derived | enum | `aggregate` | none |

- Grouping: provider (page break), period, office rows with a provider subtotal (pay is per provider across offices).
  The `Unassigned provider` and `Unallocated` rows appear only to unrestricted callers.
- Statement format: one provider and period; blocks per component listing their rows (charges, adjustments, allocations,
  reversals, lab cases; patients `phi_identified`), so payroll can audit each input.
- Summary cards: totals of the five components for the run. `reconciles_with`: `provider_income`, `net_production` by
  provider for the same parameters.

### Visuals and drill-through
- Grouped `bars` per provider (production, net, collections, lab); no trend by default.
- Production -> `daily.production_report` (`provider_ids`, `group_by = code`); collections -> `monthly.income_allocation`
  (`provider_ids`, period); allocation rows -> `monthly.allocation_detail`; lab -> `appointment.lab_cost_report`;
  reversal row -> ledger entry.

### Actions
- None (no pay calculation, no publish workflow: DSO §14.7's review-then-publish belongs to a payroll feature, not this
  module). Schedule per pay period to the payroll administrator (`reports_schedule_own`, link-only).

### Open questions
- Pay periods that cross a lock date mix frozen and live values: refuse the run, or show the two parts?
- Is per-procedure pay (Denticon's dedicated fee schedule trick, DSO §14.7) in scope as a column `schedule_amount` from a
  chosen `compare_fee_schedule_id`? Proposed as an option, not default.
- Hygienist pay on hygiene production requires the hygienist on the charge (`hygienist_id`, app era): migrated hygiene
  production sits with the treating provider.

## Claims backlog trend - `insurance.claims_backlog_trend`

financial - P2 - M - `reports_insurance_reports_screen_view_only` - background (recomputed month ends) - SCHEMA(31)

### Purpose

Billing lead, office manager and DSO finance, at month end and in the quarterly carrier review: is the insurance backlog
shrinking or ageing, at which carriers and in which age buckets, and does the billing team clear more claims than it
sends. Decisions: which carriers to escalate or work in bulk, whether the billing desk needs more hours, whether a
carrier's slowdown is new (a payer problem) or old (an office problem). Today's open claims stay in
`worklists.outstanding_claims`; this report is their history.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `insurance.outstanding_claims` (open claims on one report date, claim rows aged into the legacy buckets) | Month ends as columns with PY, by carrier, claim age bucket, tier and office; the share over 90 days per carrier over time; amount-weighted age; the movement between month ends (sent, paid, written off, closed unpaid, denied); frozen month ends where a snapshot exists |

`monthly.ar_trend` carries only the estimated insurance share of A/R, without carriers or claim ages. Called for by: KPI
§3.3 RCM-01, §6 (end of month: run ageing and claims reports); DSO §14.6 (centralised billing); 06 §2.7 tiles "Backlog
trend" (no drill target today), "By carrier" (`claims_over_90_pct`).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Claim office |
| `date_range` | `date_range` | `last_12_month_ends` | The month ends inside the range are the columns; fixed basis `as_of` |
| `compare_to` | `enum` | `previous_year` | Same month end a year earlier |
| `time_grain` | `enum` | `month` | `month`, `quarter` (quarter ends) |
| `carrier_ids` | `entity_multi` | `all` | |
| `coverage_orders` | `enum_multi` (04 §15) | `primary` | `primary`, `secondary`, `tertiary`, `quaternary`; outstanding amounts are per tier and additive, `billed_amount` is never summed across a claim family |
| `aging_buckets` | as filter card | all | claim age on `age_date_sent` (the buckets of `insurance.outstanding_claims`) |
| `report_format` | `enum` | `summary` | `summary` (measures x month ends), `by_carrier` (carrier x month ends), `movement` (bridge per month), `detail` (open claims at one month end) |
| `group_by`, `sort_by`, `output_format` | filter card 3.9 | `none`, `outstanding_desc`, `pdf` | `group_by`: `none`, `office`, `carrier`, `tier` |
| `carrier_measure` | `enum` NEW (04) | `outstanding_claims_amount` | format `by_carrier`: `outstanding_claims_amount`, `outstanding_claims_count`, `claims_over_90_pct` |

### Data

| Dataset | Columns used |
|---|---|
| `rpt_metric_values` (DATA-30, `snapshot_kind = 'month_end'`) | frozen `outstanding_claims_amount`, `outstanding_claims_count`, `claims_over_90_pct` by `tier` (05 §10). NEW request to 05 / 03: the same month-end rows also by `carrier_id` and `claim_age_bucket`, so carrier months freeze too |
| `rpt_claim_facts_as_of(p_tenant_id, p_as_of)` (DATA-31) | month ends without a frozen row: `claim_id`, `claim_family_no`, `carrier_id`, `office_id`, `tier`, `status_class`, `outstanding_amount`, `outstanding_quality`, `age_date_sent`, `is_preauth`, `status_basis` |
| `rpt_claim_status_events` (NEW, see `insurance.claim_cycle_performance`) | movement between month ends: transitions to `sent`, `paid`, `closed`, `denied` |
| `rpt_remittance_lines` | insurance paid and written off between month ends |

Calculation: per month end M and member, the open population of `insurance.outstanding_claims` as of M (`status_class IN
('sent', 'partially_paid')`, `outstanding_quality <> 'unknown'`, not `is_preauth`), aged on `age_date_sent` at M:
`outstanding_claims_amount`, `outstanding_claims_count`, `claims_over_90_pct`, bucket amounts and NEW
`outstanding_claims_avg_age_days` (amount-weighted age, requested of 05 §5.3). Movement per month (NEW
`claims_backlog_movement`, 05): opening open amount + sent − paid − written off − closed unpaid − moved to denied =
closing open amount, with `difference` printed (0 by construction where the status history is exact). Rows with
`outstanding_quality = 'unknown'` are excluded and counted per month end.

```
me   := month ends of the range (rpt_dates)
frz  := SELECT snapshot_date, tier, carrier_id, claim_age_bucket, value FROM rpt_metric_values
        WHERE snapshot_kind = 'month_end' AND metric_key IN (...) AND snapshot_date IN me
rec  := for m IN me without frz:
        SELECT carrier_id, tier, office_id, bucket(m - age_date_sent) AS b, sum(outstanding_amount), count(*)
        FROM rpt_claim_facts_as_of(:t, m) WHERE status_class IN ('sent','partially_paid') AND outstanding_quality <> 'unknown'
             AND NOT is_preauth GROUP BY 1, 2, 3, 4                       -- source = 'recomputed', status_basis printed
mov  := SELECT month(ev.changed_date), ev.to_status, sum(<claim amount>) FROM rpt_claim_status_events ev
        JOIN rpt_claim_facts cf USING (tenant_id, claim_id) WHERE ev.changed_date BETWEEN :date_from AND :date_to GROUP BY 1, 2
```

| Era | What works |
|---|---|
| Migrated history | Month ends after the claim backfill (DATA-10); migrated claims with unconfirmed status codes are `outstanding_quality = 'unknown'` and excluded with their count (k5, DATA-32). Before DATA-25 capture, the status of a past month end is today's status (`status_basis = 'current'`, printed) |
| App era | Status as of each month end from `claim_status_history` (DATA-25); frozen month ends from the first snapshot |
| Waits for | DATA-31 (`rpt_claim_facts_as_of()`, SCHEMA(31)); DATA-30 (frozen rows); NEW carrier and age-bucket dimensions on the month-end rows (05 / 03); DATA-25 (exact movement) |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `month_end` | Month end | date | `aggregate` | label |
| `source` | Frozen / recomputed | enum | `aggregate` | none |
| `member_label` | Carrier / office / tier | text | `aggregate` | label |
| `outstanding_claims_amount` | Outstanding | money | `financial_practice` | none (builder: sum over members per month end; never over months) |
| `outstanding_claims_count` | Open claims | integer | `aggregate` | none (builder: per month end) |
| `bucket_<key>_amount` | One column per claim age bucket | money | `financial_practice` | none (builder: per month end) |
| `claims_over_90_pct` | Over 90 days | percent | `financial_practice` | ratio |
| `outstanding_claims_avg_age_days` | Average age (amount-weighted) | decimal | `aggregate` | weighted_avg (outstanding amount) |
| `unknown_quality_count` | Excluded (status unknown) | integer | `aggregate` | none (builder: per month end) |
| movement columns (format `movement`) | Opening, sent, paid, written off, closed unpaid, denied, closing, `difference` | money | `financial_practice` | sum over months for flows; opening none (builder: first month), closing none (builder: last month) |

Shape `matrix`: measures (carriers in `by_carrier`) x month ends with PY per column; office band when multi-office with
the organisation total per month end. Detail: open claims at one month end (claim number, carrier, patient
`phi_identified`, tier, sent date, age, outstanding `financial_patient`). Summary cards (last month end):
`outstanding_claims_amount`, `claims_over_90_pct`, `outstanding_claims_avg_age_days`, with PY variance.
`reconciles_with`: `outstanding_claims_amount`, `outstanding_claims_count`, `claims_over_90_pct` at the last month end.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Trend | Outstanding amount stacked by age bucket per month end, `claims_over_90_pct` on a second axis |
| Heat table | Carrier x month end, value `carrier_measure` (top 15 carriers + `other`) |
| Bridge | Movement per month (format `movement`) |

| Click | Target |
|---|---|
| Month-end cell | `insurance.outstanding_claims` (`report_date` = month end, `carrier_ids`, `coverage_orders`, `aging_buckets`) |
| Last month end, carrier | `worklists.outstanding_claims` (`carrier_ids`, `aging_buckets`) |
| Movement cell | `insurance.claim_cycle_performance` (`carrier_ids`, month) |
| Detail row | Claim record |

### Actions

None on rows (follow-up is worked in `worklists.outstanding_claims`). Shipped views "Last 12 month ends by carrier",
"Over 90 days by carrier". Monthly schedule on day 2 after the lock to the billing lead and the owner. Alert suited:
`claims_over_90_pct` of a carrier up more than N points against the previous month end (ENG-52, P4).

### Open questions

- Freeze carrier and age-bucket rows at month end (request to 05 §10 / 03 DATA-30) or recompute them each run?
  Recomputation is a background run per month end; freezing is recommended.
- Secondary and later tiers default off: a switch (as 06 §2.7) or stacked members?

## Insurance estimate accuracy - `insurance.estimate_accuracy_analysis`

financial - P2 - M - `reports_insurance_reports_screen_view_only` - interactive (background above 13 months) - APP

### Purpose

Insurance coordinator, office manager and owner, monthly and before a fee-schedule or coverage-table update: how close
the primary estimate given at the desk was to what each carrier paid and wrote off, by carrier, plan, procedure code and
code category, and how large the patient balance left after the EOB was against the patient estimate. Decisions: fix
coverage percentages, frequency and age rules or the contracted fee schedule of the plans that miss most, re-verify
benefits for those carriers, and give patients estimates they will not dispute.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `insurance.claims_list` (claim rows; estimate and payment are seen claim by claim) | Estimate against paid and written off per line, rolled up by carrier, plan, code and category; the signed error (over- or under-estimate); the share of lines outside a tolerance; lines the carrier paid nothing on; the patient balance after the EOB above or below the desk estimate |

`insurance.payer_mix_profitability` shows one accuracy column per carrier; this report explains it down to the code and
the plan. Called for by: KPI §3.3 RCM-11; 06 §2.7 tile "Payers" (`insurance_estimate_accuracy_pct`, header drill map).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Claim office |
| `date_range` | `date_range` | `last_quarter` | Fixed basis `first_paid_date` of the claim (as the 05 metric): a line enters once paid or closed, so no maturity cut is needed |
| `compare_to` | `enum` | `previous_period` | `previous_period`, `previous_year` |
| `carrier_ids` | `entity_multi` | `all` | |
| `provider_ids` | `entity_multi` | `all` | `provider_role = treating` |
| `procedure_category_codes`, `procedure_codes` | `entity_multi` | `all` | |
| `coverage_orders` | `enum_multi` | `primary` | `secondary` adds the secondary estimate against the secondary payment |
| `report_format` | `enum` | `summary` | `summary` (carrier, expanding to plan), `by_code` (code x carrier), `detail` (claim lines) |
| `group_by`, `sort_by`, `output_format` | filter card 3.9 | `carrier`, `bias_asc`, `pdf` | `group_by`: `carrier`, `plan`, `code`, `category`, `office`, `provider` |
| `accuracy_tolerance_pct` | `integer` NEW (04; default a NEW 05 setting) | 10 | a line whose paid amount differs from its estimate by more than this share is a miss |

### Data

| Dataset | Columns used |
|---|---|
| `rpt_claim_lines` | `claim_id`, `charge_id`, `tier`, `procedure_code`, `charged_fee`, `est_for_tier`, `ins_paid_amount`, `ins_writeoff_amount`, `status_class`, `is_preauth` |
| `rpt_claim_facts` | `carrier_id`, `ins_plan_id`, `office_id`, `treating_provider_id`, `first_paid_date`, `claim_family_no` |
| `rpt_charges` | `est_patient`, `patient_estimate_stored` (the desk estimate) |
| `rpt_insurance_coverage`, `rpt_procedure_code_dim` | plan label (group number + employer; plans have no name), `coverage_category` |

Calculation, per line of a primary claim with `status_class IN ('paid', 'closed')`, not a pre-authorisation, dated by the
claim's `first_paid_date` (the population of `insurance_estimate_accuracy_pct`): estimate = `est_for_tier`, paid =
`ins_paid_amount`, error = paid − estimate. Rolled up: `insurance_estimate_accuracy_pct` (05: 1 − Σ |error| ÷ Σ
estimate); NEW `insurance_estimate_bias_amount` (Σ signed error: negative = the carrier paid less than estimated); NEW
`estimate_miss_pct` (lines with |error| above `accuracy_tolerance_pct` of the estimate ÷ lines); NEW
`patient_balance_surprise_amount` (Σ of the positive part of (`charged_fee` − paid − `ins_writeoff_amount`) −
`est_patient`: the patient owed more after the EOB than the desk said) and `patient_balance_relief_amount` (the negative
part), requested from 05 §5.3. A line paid 0 on a paid claim is a miss with its whole estimate, so a frequency or age
limit missing from the coverage table shows on its code.

```
ln := SELECT l.*, cf.carrier_id, cf.ins_plan_id, cf.office_id, cf.treating_provider_id,
             l.ins_paid_amount - l.est_for_tier AS err,
             (l.charged_fee - l.ins_paid_amount - l.ins_writeoff_amount) - c.est_patient AS pat_diff
      FROM rpt_claim_lines l JOIN rpt_claim_facts cf USING (tenant_id, claim_id) JOIN rpt_charges c ON c.charge_id = l.charge_id
      WHERE l.tier = 'primary' AND l.status_class IN ('paid','closed') AND NOT l.is_preauth
        AND cf.first_paid_date BETWEEN :date_from AND :date_to AND <scope>
SELECT <member>, count(*), sum(est_for_tier), sum(ins_paid_amount), sum(err) AS bias, sum(abs(err)) AS abs_err,
       count(*) FILTER (WHERE abs(err) > :tol * est_for_tier) AS misses,
       sum(greatest(pat_diff, 0)) AS surprise, sum(least(pat_diff, 0)) AS relief
FROM ln GROUP BY <member>                                        -- accuracy := 1 - abs_err / est by the banding step
```

| Era | What works |
|---|---|
| Migrated history | Nothing: migrated claims carry no lines and no estimate until the claim backfill; migrated secondary claims have no resolvable estimate (`expected_basis = 'none'`) |
| App era | Every column from remittance lines. The estimate is the one stored at posting (`est_ins_primary` / `est_ins_secondary`, never decremented), which is what the patient was told |
| Waits for | DATA-49 (P4: estimate frozen at claim creation, so a re-estimate between posting and claim can be told apart); DATA-10 (claim backfill) |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `member_label` | Carrier / plan / code / category / office / provider | text | `aggregate`; `provider_comp` by provider | label |
| `paid_lines` | Paid lines | integer | `aggregate` | sum |
| `estimate_amount` | Estimated | money | `financial_practice` | sum |
| `ins_paid_amount` | Paid | money | `financial_practice` | sum |
| `ins_writeoff_amount` | Written off | money | `financial_practice` | sum |
| `insurance_estimate_bias_amount` | Paid − estimated | money | `financial_practice` | sum |
| `insurance_estimate_accuracy_pct` | Accuracy | percent | `financial_practice` | ratio (1 − Σ abs error ÷ Σ estimate) |
| `estimate_miss_pct` | Lines outside tolerance | percent | `aggregate` | ratio |
| `zero_paid_lines` | Paid nothing | integer | `aggregate` | sum |
| `patient_balance_surprise_amount` | Patient owed more than told | money | `financial_practice` | sum |
| `patient_balance_relief_amount` | Patient owed less than told | money | `financial_practice` | sum |

Grouping: office band (multi-office); level 1 `group_by` (carrier, expanding to plan); grand total. `by_code`: matrix code
x carrier (top 15 carriers), value `insurance_estimate_accuracy_pct` with line count; cells below `rate_min_denominator`
lines greyed. Detail: claim lines (claim number, patient `phi_identified`, carrier, plan, code, tooth, service date,
estimate, paid, written off, patient portion after the EOB, desk estimate; amounts `financial_patient`). Summary cards:
`insurance_estimate_accuracy_pct`, `insurance_estimate_bias_amount`, `estimate_miss_pct`,
`patient_balance_surprise_amount`. `reconciles_with`: `insurance_estimate_accuracy_pct` (carrier rows equal the 06
"Payers" scorecard column).

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Bars | Accuracy by carrier (top 15), bias as a signed bar beside it |
| Heat table | Code x carrier accuracy (format `by_code`) |

| Click | Target |
|---|---|
| Carrier or plan row | `kind = rows` (lines of the member); plan: the plan's coverage setup (route key owned by 07) |
| Code cell | `kind = rows` (lines of that code and carrier) |
| Detail row | Claim record (EOB); patient ledger for the balance |

### Actions

None on rows (fixes happen in plan setup). Monthly schedule to the insurance coordinator; shipped views "Last quarter by
carrier", "Codes most underestimated". Alert suited: `insurance_estimate_accuracy_pct` of a carrier more than N points
below the organisation value (ENG-52, P4).

### Open questions

- Measure against the estimate at posting (proposed: what the patient was told) or against the estimate the coverage
  rules would give today (a later what-if)?
- Secondary claims depend on the primary payment; offered under `coverage_orders`, off by default.

## Statement and collections effectiveness - `statements.statement_collection_effectiveness`

financial - P2 - M - `reports_statements_screen_view_only` - interactive (background above 13 months) - APP

### Purpose

Office manager, billing lead and owner, monthly after each statement run and in the month-end A/R review: do statements
bring money in, how fast, for which balances, and does handing an account to collections recover anything. Decisions:
statement cycle and message (bring the run forward, change the over-60 message), e-mail against paper, when to call
instead of mailing again, when to send an account to collections and whether the agency is worth its fee.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `lists.responsible_party_statements_sent` (statements sent by date); `lists.responsible_party_sent_to_collection` (roster of accounts flagged "sent to collection") | The payment outcome of every statement run: accounts and amount billed, accounts paying and amount collected within 30 and 60 days, days to first payment, by run, delivery method, balance age and office; failed deliveries; accounts sent to collections and the recovery afterwards |

`statements.statement_run` produces the statements and `worklists.patient_ar` holds the follow-up; nothing measures
whether a statement led to a payment. Called for by: KPI §6 (end of month: generate batch statements, review A/R per
account), §3.2 COL-10 (patient A/R past due); 06 §2.6 "Over 90 days" (header drill map).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Account home office (statements are home-office documents, PD-4) |
| `date_range` | `date_range` | `last_quarter` | Fixed basis `statement_date`; response windows run past `date_to`, and a run younger than the window is `is_provisional` for that column |
| `compare_to` | `enum` | `previous_period` | |
| `time_grain` | `enum` | `month` | statement-month rows of format `trend` |
| `report_format` | `enum` | `summary` | `summary` (by run), `trend` (statement month x measure), `collections` (accounts sent to collections and recovery), `detail` (statement rows) |
| `group_by`, `sort_by`, `output_format` | filter card 3.9 | `none`, `statement_date` descending, `pdf` | `group_by`: `none`, `office`, `delivery_method`, `balance_age_band`, `run` |
| `response_windows_days` | `enum_multi` NEW (04) | `30`, `60` | the "collected within N days" columns |

### Data

| Dataset | Columns used |
|---|---|
| `patient_statements` (passthrough, DATA-52) | `account_id`, `batch_id`, `statement_date`, `closing_balance`, `delivery_method`, `delivery_status`, `delivered_at` |
| `statement_runs` (DATA-22, NEW header over `batch_id`) | `batch_id`, run criteria, creator, office; `delivery_error` on the statement rows |
| `rpt_payments` | `payer = 'patient'`, `counts_as_collection`, `account_id`, `transaction_date`, `txn_class` (`collection_agency_payment`) |
| `rpt_ar_open_items()` | age of the account balance at the statement date (`balance_age_band`: current, 31-60, 61-90, over 90 days) |
| `rpt_account_dim` | `home_office_id`, `balance_status_code`, `sent_to_collections_at`, `collection_agency_id`, `send_collections` (DATA-35) |

Calculation, per statement row (one account in one run) with `closing_balance > 0`: a patient payment counts for the
latest statement before it only, so two runs never claim the same money; collected within N days = patient collections
of the account with `transaction_date` in (`statement_date`, `statement_date` + N], capped at the statement balance. NEW
measures requested from 05 §5.2: `statement_paid_within_30d_pct` (statements with a payment within 30 days ÷
statements), `statement_collected_30d_amount`, `statement_collected_60d_amount`, `statement_collected_30d_pct`
(collected ÷ billed), `statement_days_to_first_payment` (median), `statement_delivery_failed_count`. Format
`collections`: accounts with `sent_to_collections_at` in the range, their balance at that date, NEW
`collections_recovered_amount` (payments with `txn_class = 'collection_agency_payment'` and patient payments within 180
days after the referral) and `collections_recovery_pct`.

```
st  := SELECT s.*, lead(s.statement_date) OVER (PARTITION BY s.account_id ORDER BY s.statement_date) AS next_statement
       FROM patient_statements s WHERE s.statement_date BETWEEN :date_from AND :date_to AND s.closing_balance > 0
pay := SELECT st.account_id, st.batch_id, min(p.transaction_date) AS first_paid,
              least(-sum(p.amount) FILTER (WHERE p.transaction_date <= st.statement_date + 30), st.closing_balance) AS c30,
              least(-sum(p.amount) FILTER (WHERE p.transaction_date <= st.statement_date + 60), st.closing_balance) AS c60
       FROM st JOIN rpt_payments p ON p.account_id = st.account_id AND p.counts_as_collection AND p.payer = 'patient'
        AND p.transaction_date > st.statement_date AND (st.next_statement IS NULL OR p.transaction_date <= st.next_statement)
       GROUP BY 1, 2
```

| Era | What works |
|---|---|
| Migrated history | Nothing: no statement was migrated; accounts sent to collections before the app carry the flag `send_collections` without a date |
| App era | Every statement generated in the app with its delivery outcome; statement balances equal the ledger only for statements generated after DATA-07 (R-18, printed) |
| Waits for | DATA-22 (run header and delivery error, SCHEMA(22), P1); DATA-35 (collection stage and date, SCHEMA(35), P2) |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `run_label` / `member_label` | Run (date, office) / member | text | `aggregate` | label |
| `statements` | Statements with a balance | integer | `aggregate` | sum |
| `statement_billed_amount` | Billed | money | `financial_practice` | sum |
| `statement_paid_within_30d_pct` | Paid within 30 days | percent | `aggregate` | ratio |
| `statement_collected_30d_amount`, `statement_collected_60d_amount` | Collected within 30 / 60 days | money | `financial_practice` | sum |
| `statement_collected_30d_pct` | Collected share (30 days) | percent | `financial_practice` | ratio |
| `statement_days_to_first_payment` | Days to first payment (median) | decimal | `aggregate` | none (builder: median per grouping set) |
| `statement_delivery_failed_count` | Delivery failed | integer | `aggregate` | sum |
| `accounts_sent_to_collections` | Sent to collections (format `collections`) | integer | `aggregate` | sum |
| `collections_referred_amount` | Balance referred | money | `financial_practice` | sum |
| `collections_recovered_amount`, `collections_recovery_pct` | Recovered / share | money, percent | `financial_practice` | sum / ratio |

Grouping: office band (multi-office); level 1 `group_by`; grand total. Detail (`phi_identified`, `financial_patient`):
account, guarantor, statement date, method, delivery status, balance, balance age, first payment date, collected within
30 and 60 days, next appointment of any member. Summary cards: `statement_paid_within_30d_pct`,
`statement_collected_30d_pct`, `statement_days_to_first_payment`, `collections_recovery_pct`. `reconciles_with`: none (no
05 metric yet; collected amounts are a subset of `patient_collections` for the same accounts and dates).

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Cumulative curve | Share of the billed amount collected by day after the statement, one line per run |
| Bars | Paid within 30 days by balance age band and delivery method |

| Click | Target |
|---|---|
| Run row | `lists.responsible_party_statements_sent` (`statement_date`, office) |
| Not paid within 60 days | `worklists.patient_ar` (accounts of the cell) |
| Delivery failed | `lists.responsible_party_email_statement_error_report` (same run) |
| Collections row | `lists.responsible_party_sent_to_collection`; account ledger |

### Actions

Detail rows not paid within 60 days: bulk `create_task` handed to `worklists.patient_ar` ("call after statement").
Monthly schedule the day after each run's 30-day mark; shipped views "Last quarter by run", "Collections recovery this
year".

### Open questions

- Count any patient payment on the account after the statement (proposed) or only payments that reduce the statement's own
  balance? The latter needs allocation (DATA-26).
- Insurance payments after a statement reduce the balance but are not a response to it: excluded (proposed).

## Domain: Schedule, hygiene, treatment, patients and providers

## Schedule utilisation and capacity - `appointment.schedule_utilization`

operations - P3 - L - `reports_appointment_reports_screen_view_only` - interactive (background above 13 months or above the engine limits) - READY

### Purpose

Office managers (weekly) and regional managers (monthly) decide whether provider and chair hours match demand: add or
trim provider days, open or close hygiene columns, move a provider to another operatory, and decide where confirmation
and short-call effort goes. The look-ahead format answers "how much bookable time is still open in the next 10 open days,
for whom" and every cell opens that Scheduler day, so the front desk fills it.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `appointment.appointment_list` (appointment rows for a range) | Capacity side (template hours, chair capacity), open time, utilisation, hours lost to breaks, production per hour and per visit, provider x day and operatory x day matrices, a forward window |

Called for by: KPI §3.4 SCH-01, SCH-02, SCH-13; CT §5 TS-7; 06 §2.8 tiles "Provider utilisation", "Chair utilisation",
"Open time ahead" and §2.2 `provider_scheduled_hours` (no drill target in 06; header drill table chose this key).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Appointment office (data card 5.1); calendar functions get the same office list |
| `date_range` | `date_range` | `last_month` | Fixed basis `appointment_date`; ignored by `look_ahead` (window starts at the office's `local_today`) |
| `compare_to` | `enum` | `none` | `previous_period`, `previous_year`; comparison columns on utilisation and production per hour |
| `time_grain` | `enum` | `week` | `day`, `week`, `month`; adds period sub-rows inside each member |
| `provider_ids` | `entity_multi` | `all` | `provider_role = appointment` (`rpt_appointment_facts.provider_id`); the same ids go to `rpt_provider_calendar_days()` |
| `production_group` | `enum` | `all` | Providers of the group (`rpt_provider_dim.production_group`) |
| `operatory_ids` | `entity_multi` | `all` | Shared key (filter card 3.7) |
| `report_format` | `enum` | `summary` | `summary`, `detail` (provider-day rows), `look_ahead` (named format) |
| `group_by` | `enum` | `provider` | `provider`, `operatory`, `day_of_week`, `provider_kind`, `office` |
| `sort_by`, `page_break_by`, `output_format` | as filter card 3.9 | first option, `none`, `pdf` | |
| `capacity_basis` | `enum` | `provider` | NEW (04): `provider` = `provider_scheduled_hours` is the denominator (`provider_utilization_pct`); `chair` = `chair_capacity_hours` (`chair_utilization_pct`); `chair` is forced when `group_by = operatory` |
| `look_ahead_open_days` | `integer` | 10 | NEW (04), 1-60, open days of each office (`rpt_office_calendar_days().is_open`); the 06 §2.8 header filter |

Settings printed in the criteria echo, not parameters: `clinical_hours_source`, `working_day_basis` (05 §2.10).

### Data

| Dataset | Columns used |
|---|---|
| `rpt_provider_calendar_days()` | `provider_id`, `office_id`, `calendar_date`, `is_scheduled`, `scheduled_minutes`, `hours_source`, `holiday_name` |
| `rpt_office_calendar_days()` | `office_id`, `calendar_date`, `is_open`, `open_minutes`, `chair_capacity_minutes`, `hours_source` |
| `rpt_appointment_facts` | `appointment_id`, `office_id`, `provider_id`, `provider_kind`, `operatory_id`, `appointment_date`, `duration_minutes`, `status_class`, `is_kept`, `is_block`, `is_deleted`, `is_legacy_archive`, `is_confirmed` |
| `rpt_appointment_procedures` | `appointment_id`, `scheduled_fee` (look-ahead value) |
| `rpt_charges`, `rpt_provider_visits` | through the metric builders of `production_per_hour`, `production_per_visit` (P = organisation production basis; treating provider, office of service) |
| `rpt_dates`, `rpt_provider_dim`, `rpt_office_dim` | `day_of_week`, `week_start`, `month_start`; labels; `local_today` |

Calculation, per provider-office-day: capacity = `scheduled_minutes` of scheduled days (chair basis: `chair_capacity_minutes`
of open days); booked = `Σ duration_minutes` of live appointments (not cancelled, not no-show, not block, not deleted,
archive policy); kept = `Σ duration_minutes [is_kept]` (`chair_hours`); broken = `Σ duration_minutes` of cancelled and
no-show appointments; open = `greatest(capacity − booked, 0)`; utilisation = booked ÷ capacity, recomputed from summed
minutes at every level. Booked time on a day with no template row counts as booked and flags `overbooked`. Production
per hour = P ÷ `clinical_hours`; per visit = P ÷ `patient_visits`. Look-ahead: the same per provider-day for the next
`look_ahead_open_days` open days, plus `scheduled_production` and `unconfirmed_appointments`.

```
WITH cal AS (SELECT provider_id, office_id, calendar_date AS d, scheduled_minutes, hours_source
             FROM rpt_provider_calendar_days(:tenant_id, :provider_ids, :date_from, :date_to, :office_ids) WHERE is_scheduled),
     ap  AS (SELECT provider_id, office_id, appointment_date AS d,
                    sum(duration_minutes) FILTER (WHERE status_class NOT IN ('cancelled','no_show')) AS booked_min,
                    sum(duration_minutes) FILTER (WHERE is_kept)                                    AS kept_min,
                    sum(duration_minutes) FILTER (WHERE status_class IN ('cancelled','no_show'))    AS broken_min
             FROM rpt_appointment_facts
             WHERE NOT is_block AND NOT is_deleted AND <archive policy> AND appointment_date BETWEEN :date_from AND :date_to
             GROUP BY 1, 2, 3),
     pr  AS (<metric builder P and patient_visits by provider_id, office_id, service_date>)
SELECT ... FROM cal FULL JOIN ap USING (provider_id, office_id, d) FULL JOIN pr USING (provider_id, office_id, d)
```

| Era | What works |
|---|---|
| Migrated history | Booked, kept and broken hours (H); production per hour and per visit (H; D(12) when P = net, k1). Capacity uses today's template for past months (k10). Kept status of migrated visits comes from the same-day charge (data card 2.15) |
| Both eras | Offices that never configured hours have `hours_source = 'default'`: capacity columns render "schedule not configured" (`no_data`), never 0 |
| Waits for | DATA-43 (capacity history per month); DATA-16, DATA-55 (P1, in place) |

Unknowable: capacity actually in force in a past month before DATA-43; time an operatory was out of service.

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `office_name` | Office | text | `aggregate` | label |
| `provider_label` | Provider | text | `provider_comp` (block has money columns) | label |
| `operatory_name` | Operatory | text | `aggregate` | label (group_by operatory) |
| `period_label` | Period | text | `aggregate` | label |
| `working_days` | Working days | decimal | `aggregate` | sum (office-days above one office, 05 §2.10) |
| `capacity_hours` | Scheduled hours / Chair capacity | decimal | `aggregate` | sum; `provider_scheduled_hours` or `chair_capacity_hours` |
| `booked_hours` | Booked hours | decimal | `aggregate` | sum |
| `chair_hours` | Kept hours | decimal | `aggregate` | sum |
| `broken_hours` | Lost to breaks | decimal | `aggregate` | sum; NEW measure (05 §5.4) |
| `open_hours` | Open hours | decimal | `aggregate` | sum of per-day values; NEW measure (05 §5.4) |
| `utilization_pct` | Utilisation | percent | `aggregate` | ratio(`booked_hours`, `capacity_hours`) |
| `appointments_booked` | Appointments | integer | `aggregate` | sum |
| `patient_visits` | Visits | integer | `aggregate` | count_distinct (patient-office-days of `rpt_visits`; provider rows are non-additive) |
| `production` | Production | money | `financial_practice` (`provider_comp` by provider) | sum |
| `production_per_hour` | Per hour | money | as above | ratio(`production`, clinical hours) |
| `production_per_visit` | Per visit | money | as above | ratio(`production`, `patient_visits`) |
| `hours_source` | Hours source | enum | `aggregate` | label (`mixed` on totals) |

Grouping: fixed outer `Office : <name>` when multi-office; level 1 = `group_by`; level 2 = period when `time_grain` is set;
grand total. Detail format: provider-office-day rows with `day_of_week`, the columns above and `holiday_name`.
Look-ahead format: `shape = matrix`, rows provider, columns open days (`max_columns` 60), value `open_hours`, with row
columns `capacity_hours`, `booked_hours`, `open_time_pct`, `scheduled_production`, `unconfirmed_appointments`.
Summary cards: `provider_utilization_pct` (or `chair_utilization_pct`), `booked_hours`, `broken_hours`,
`production_per_hour`; look-ahead: `open_time_pct`, `scheduled_production`. `reconciles_with`: `booked_hours`,
`provider_scheduled_hours`, `chair_capacity_hours`, `provider_utilization_pct`, `open_time_pct`, `production_per_hour`.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Bars | Utilisation by provider with the 75-90 % band (05 target); stacked kept / broken / open hours |
| Heatmap | Chair utilisation operatory x day; look-ahead open hours provider x day |

| Click | Target |
|---|---|
| `booked_hours`, `appointments_booked` | `appointment.appointment_list` (`{std}`, `operatory_ids`) |
| `broken_hours` | `appointment.broken_appointment_analysis` (same `{std}`) |
| `production`, per-hour, per-visit | `daily.production_report` (`group_by = provider`, `date_basis = service_date`); visits: `lists.patients_seen` |
| Look-ahead cell, detail row | Scheduler day (route key `scheduler_day`, 07; `openSchedulerAtAppointment` pattern) |
| `hours_source = default` | Office schedule setup (route key owned by 07) |

### Actions

Row action `open_scheduler_day` (`navigate`). No bulk actions (aggregate rows). Shipped views: "Next 10 open days" (look-
ahead, Monday 07:00 schedule to office managers), "Last month by provider". Suited to the metric alert
`open_time_pct` above a threshold for the next 5 open days (ENG-52, P4).

### Open questions

- Blocks: the data card subtracts `is_block` time from capacity, `provider_utilization_pct` does not. Proposed: show
  `blocked_hours` as information and keep the metric formula until 05 decides.
- Double booking (two chairs, one provider) pushes utilisation above 100 %: keep the value with warning `overbooked`.
- No hour-of-day dimension (06 D-8): no weekday x hour heatmap.

## Cancellations, no-shows and recovery - `appointment.broken_appointment_analysis`

operations - P3 - M - `reports_appointment_reports_screen_view_only` - interactive - READY

### Purpose

Office managers (monthly) and owners decide the confirmation and deposit policy: which weekdays, lead times, patient
kinds and providers break most; whether broken time is won back and how fast; who the repeat offenders are (deposit,
short-call list only, dismissal policy). It also shows whether cancellation reasons are being captured.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `appointment.appointment_list` Cancelled and Missed lists | Rates against all past appointments, split by weekday, lead time, notice, patient kind, provider, reason and appointment kind; recovery % and days to the next appointment; value never recovered; repeat-patient view |

`worklists.broken_appointments` is the queue of unrecovered appointments; this report is the analysis behind it.
Called for by: KPI §2.7, §3.4 SCH-03, SCH-04, SCH-05; CT §5 TS-7; 06 §2.8 "Broken appointments", "Recovery",
"By weekday and patient kind" (which drill to the legacy list today).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Appointment office |
| `date_range` | `date_range` | `last_month` | Basis `appointment_date`; only days before the office's today enter (05 §2.7 denominator) |
| `compare_to` | `enum` | `none` | `previous_period`, `previous_year` |
| `time_grain` | `enum` | `month` | trend block |
| `provider_ids` | `entity_multi` | `all` | `provider_role = appointment` |
| `production_group` | `enum` | `all` | |
| `operatory_ids` | `entity_multi` | `all` | |
| `cancellation_reason_codes` | `entity_multi` | `all` | Shared; only app rows after DATA-17 carry a reason |
| `report_format` | `enum` | `summary` | `summary`, `detail` (broken appointments), `repeat_patients` |
| `group_by` | `enum` | `day_of_week` | `day_of_week`, `lead_time_band`, `notice_band`, `patient_kind`, `appointment_kind`, `provider`, `cancellation_reason`, `office`, `month` |
| `sort_by`, `page_break_by`, `output_format` | as filter card 3.9 | | |
| `broken_class` | `enum` | `both` | NEW (04): `both`, `cancelled`, `no_show` (detail and repeat formats) |
| `repeat_threshold` | `integer` | 2 | NEW (04): broken appointments in the 12 months ending `date_to` that make a patient "repeat" |

Settings echoed: `late_cancel_hours`, `broken_recovery_window_days`, `no_show_includes_late_cancel` (05 §2.7, §3).

### Data

| Dataset | Columns used |
|---|---|
| `rpt_appointment_facts` | `appointment_id`, `patient_id`, `office_id`, `provider_id`, `provider_kind`, `operatory_id`, `appointment_date`, `start_time`, `status_class`, `is_block`, `is_deleted`, `is_legacy_archive`, `is_patientless`, `is_placeholder_patient`, `has_hygiene_code`, `is_new_patient`, `scheduled_fee`, `cancellation_reason`, `created_date`, `created_at_reliable`, `lead_days`, `era`; after DATA-17 `cancelled_at`, `missed_at`, `reschedule_count` |
| `rpt_patient_activity` | `first_visit_date`, `missed_count`, `cancelled_count`, `next_appointment_date` |
| `rpt_dates` | `day_of_week` |

Population: `APPT AND PAST` (05 §2.7: not block, not deleted, archive policy, dated before the office's today). Broken =
`status_class IN ('cancelled', 'no_show')`. Rates: the status-based pair and `broken_appointment_rate_pct` (H); the
notice-based pair (G(17)) from `hours_before = start (office-local) − cancelled_at`. Bands (NEW dimensions for 05 §1.5):
`lead_time_band` on `appointment_date − created_date` (0-1, 2-7, 8-30, 31-90, over 90 days, `unknown`);
`notice_band` on `hours_before` (under 24 h, 24-48 h, over 48 h, no-show, `unknown`). `patient_kind` = `new` when the
patient has no visit before the appointment date (`first_visit_date IS NULL OR first_visit_date >= appointment_date`,
or patientless / placeholder), else `existing`. `appointment_kind` = `hygiene` (`has_hygiene_code`, 05 setting
`hygiene_appointment_rule`), `new_patient`, `other`. Recovery (05 §2.7): the first later live appointment of the patient
recovers the broken one when dated within `broken_recovery_window_days`, or any future one. Days to the next appointment
= its `appointment_date` − broken date (H); days to rebook = its `created_date` − broken date (A). Value lost =
`Σ scheduled_fee` of unrecovered broken appointments.

```
b   AS (SELECT f.* FROM rpt_appointment_facts f WHERE <APPT AND PAST> AND f.appointment_date BETWEEN :date_from AND :date_to),
nxt AS (SELECT b.appointment_id, n.appointment_date AS next_date, n.created_date AS next_created
        FROM b LEFT JOIN LATERAL (SELECT appointment_date, created_date FROM rpt_appointment_facts n
                                  WHERE n.patient_id = b.patient_id AND <LIVE> AND n.appointment_date > b.appointment_date
                                  ORDER BY n.appointment_date LIMIT 1) n ON true
        WHERE b.status_class IN ('cancelled','no_show'))
SELECT <dimension>, count(*), count(*) FILTER (broken), ..., count(*) FILTER (recovered), sum(scheduled_fee) FILTER (NOT recovered) ...
```

| Era | What works |
|---|---|
| Migrated history | Status rates, recovery %, days to next appointment, weekday, patient kind, repeat patients (H; k9, k14 for patient kind) |
| App era | Lead time, days to rebook (A); value lost (A, k7: booked lines exist on about 6 % of migrated appointments) |
| Waits for | DATA-17: notice band, notice-based rates, cancellation reason, reschedule counts |

Unknowable for history: notice, reason, whether the office or the patient cancelled, reschedules made in place.

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `dimension_label` | (group) | text | `aggregate` | label |
| `appointments_past` | Appointments | integer | `aggregate` | sum (denominator) |
| `appointments_cancelled` | Cancelled | integer | `aggregate` | sum |
| `appointments_no_show` | No-shows | integer | `aggregate` | sum |
| `cancellation_rate_pct` | Cancellation % | percent | `aggregate` | ratio of sums (resolved variant named in the header) |
| `no_show_rate_pct` | No-show % | percent | `aggregate` | ratio of sums |
| `broken_appointment_rate_pct` | Broken % | percent | `aggregate` | ratio of sums |
| `broken_share_pct` | Share of broken | percent | `aggregate` | `share_of_parent` |
| `late_cancellations` | Late cancellations | integer | `aggregate` | sum; G(17) |
| `broken_appointment_recovery_pct` | Recovered % | percent | `aggregate` | ratio of sums |
| `days_to_next_appointment_median` | Days to next appt (median) | decimal | `aggregate` | none (builder: median per grouping set; NEW measure, 05) |
| `broken_appointment_value_lost` | Value not recovered | money | `financial_practice` | sum |
| `repeat_patients` | Repeat patients | integer | `aggregate` | count_distinct (patients) |

Detail: date, time, weekday, provider, operatory, patient (`phi_identified`), patient kind, status, lead days, notice
hours, reason, `scheduled_fee` (`financial_patient`), recovered, next appointment date, days to next. Repeat format: one
row per patient: broken count (12 months), cancelled, no-shows, kept, last broken date, next appointment, lifetime
`missed_count` / `cancelled_count`. Summary cards: `broken_appointment_rate_pct`, `no_show_rate_pct`,
`broken_appointment_recovery_pct`, `broken_appointment_value_lost`. `reconciles_with`: the five rate and recovery metrics.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Stacked bars | Cancelled and no-show rate by the `group_by` member (weekday by default) |
| Trend | Broken % and recovered % by month, PY dashed |

| Click | Target |
|---|---|
| Any count | `kind = rows`: detail format filtered to the member |
| `appointments_past` (denominator) | `appointment.appointment_list` (`{std}`) |
| Unrecovered, value lost | `worklists.broken_appointments` (`date_range`, `appointment_provider_ids`, `cancellation_reason_codes`) |
| Detail or repeat row | Patient record; appointment opens in the Scheduler |

### Actions

Detail and repeat formats: bulk `send_sms` (invite to schedule; `requires = [sms_consent]`, `no_auto_sms` excluded),
`send_email`, `letters`, `create_task` (lands in `worklists.my_followups`), `export_selection`. Shipped view "Last month
by weekday"; monthly schedule. Suited to the alert `broken_appointment_rate_pct` above its band (ENG-52).

### Open questions

- Office-initiated cancellations (provider sick) inflate the rate; no flag exists. Request a reason class `office` in the
  DATA-17 reason group.
- A recovering appointment that later breaks still recovers the first one (05 rule); confirm.
- Legacy fee codes D9986 / D9987 posted on the day: DI treats them as overriding the status; we keep the status class.

## Patient flow and wait times - `appointment.patient_flow_times`

operations - P3 - M - `reports_appointment_reports_screen_view_only` - interactive - APP

### Purpose

Office managers and the clinical lead (weekly) see where patients wait and which providers or appointment kinds run
late or overrun their booked length. Decisions: change template durations, add check-in staff at peak weekdays, coach a
provider, reorder the day. The report also shows whether staff use check-in and check-out at all (stamp coverage).

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `appointment.appointment_time_stamps` (stamps per appointment) | Durations (arrival offset, wait to be seated, chair time, overrun), medians and 90th percentiles by provider, operatory, weekday and appointment kind, late-start share, stamp coverage |

Called for by: CT §3.1 (huddle anatomy: today's schedule by provider and operatory); KPI §3.4 (SCH-01 pitfall "booked is
not productive", SCH-02 template accuracy).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Appointment office |
| `date_range` | `date_range` | `last_month` | Basis `appointment_date` |
| `compare_to` | `enum` | `none` | |
| `time_grain` | `enum` | `week` | |
| `provider_ids` | `entity_multi` | `all` | `provider_role = appointment` |
| `operatory_ids` | `entity_multi` | `all` | |
| `report_format` | `enum` | `summary` | `summary`, `detail` |
| `group_by` | `enum` | `provider` | `provider`, `operatory`, `day_of_week`, `appointment_kind`, `appointment_type` (enabled after DATA-43), `office` |
| `sort_by`, `page_break_by`, `output_format` | as filter card 3.9 | | |
| `late_start_threshold_minutes` | `integer` | 10 | NEW (04; default proposed as a 05 setting) |
| `statistic` | `enum` | `median` | NEW (04): `median`, `average`, `p90` for the duration columns |

### Data

| Dataset | Columns used |
|---|---|
| `rpt_appointment_facts` | `appointment_id`, `office_id`, `provider_id`, `operatory_id`, `patient_id`, `appointment_date`, `start_time`, `duration_minutes`, `status_class`, `is_kept`, `has_hygiene_code`, `is_new_patient`, `checked_in_on`, `checked_out_on`, `era`; after DATA-17 `seated_on`; after DATA-43 `appointment_type_id` |
| `rpt_office_dim` | `timezone` (stamps are UTC, data card 4.3) |

Population: kept appointments (`is_kept`), not block, not deleted, app era. Measures (all NEW, requested from 05 §5.4),
each on office-local times:

| Measure | Rule | Availability |
|---|---|---|
| `arrival_offset_minutes` | `checked_in_on − (appointment_date + start_time)`; negative = early | A |
| `wait_to_seat_minutes` | `seated_on − checked_in_on` | G(17) |
| `late_start_minutes` | `seated_on − greatest(scheduled start, checked_in_on)` (time lost by the office, not by a late patient) | G(17) |
| `chair_time_minutes` | `checked_out_on − seated_on` | G(17) |
| `visit_time_minutes` | `checked_out_on − checked_in_on` (the only duration before DATA-17) | A |
| `overrun_minutes` | `chair_time_minutes − duration_minutes` (before DATA-17: `visit_time_minutes − duration_minutes`, labelled "incl. waiting") | A |
| `late_start_pct` | late starts above `late_start_threshold_minutes` ÷ appointments with both stamps | G(17) |
| `stamp_coverage_pct` | kept appointments with check-in and check-out ÷ kept appointments | A |

Exclusions, counted in `stamp_anomalies`: missing stamp, negative duration, a duration above 240 minutes (NEW setting
`flow_max_minutes`), stamps on another date than the appointment (stamps are overwritten, never cleared, data card 2.15).
`appointment_kind` until DATA-43: `hygiene`, `new_patient`, `other`. Percentiles are computed by the builder per grouping
set (`percentile_cont` under `GROUPING SETS`), because `total.fn` has no median: NEW request to 02 §3.3.

```
SELECT <group keys>, count(*) AS kept, count(*) FILTER (WHERE checked_in_on IS NOT NULL AND checked_out_on IS NOT NULL) AS stamped,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY <arrival_offset>) ..., count(*) FILTER (WHERE <late_start> > :threshold) ...
FROM rpt_appointment_facts f JOIN rpt_office_dim o USING (tenant_id, office_id)
WHERE f.is_kept AND NOT f.is_block AND NOT f.is_deleted AND f.era = 'app' AND f.appointment_date BETWEEN :date_from AND :date_to
GROUP BY GROUPING SETS ((<level 1>, <level 2>), (<level 1>), ())
```

Migrated history: no stamp exists (data card 4.2): every period before the first app-era stamp renders "history starts
on <date>". Unknowable for history: everything in this report.

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `member_label` | (group) | text | `aggregate` | label |
| `kept_appointments` | Kept | integer | `aggregate` | sum |
| `stamped_appointments` | With stamps | integer | `aggregate` | sum |
| `stamp_coverage_pct` | Stamp coverage | percent | `aggregate` | ratio of sums |
| `arrival_offset` | Arrival vs start (min) | duration | `aggregate` | none (builder: the chosen `statistic` per grouping set) |
| `wait_to_seat` | Wait to be seated (min) | duration | `aggregate` | none (builder: `statistic`); G(17) |
| `late_start_pct` | Late starts | percent | `aggregate` | ratio of sums; G(17) |
| `chair_time` | Chair time (min) | duration | `aggregate` | none (builder: `statistic`); G(17) |
| `visit_time` | Check-in to check-out (min) | duration | `aggregate` | none (builder: `statistic`) |
| `overrun` | Over booked length (min) | duration | `aggregate` | none (builder: `statistic`) |
| `stamp_anomalies` | Excluded stamps | integer | `aggregate` | sum |

Detail: appointment rows: date, start, provider, operatory, patient (`phi_identified`), kind, booked length, check-in,
seated, check-out, the durations, anomaly flag. Summary cards: `stamp_coverage_pct`, median `wait_to_seat` (or
`visit_time` before DATA-17), `late_start_pct`. No `reconciles_with` (no dashboard tile shows these measures yet).

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Bars | Median wait and chair time by provider; 90th percentile as a tick |
| Distribution | Appointments by `wait_band` (0-5, 6-10, 11-20, 21-30, over 30 min; NEW dimension) |

| Click | Target |
|---|---|
| Any count or statistic | `kind = rows` (detail filtered to the member) |
| Detail row | Appointment in the Scheduler (route key owned by 07) |
| `stamp_coverage_pct` below 50 % | help text: check-in and check-out are not being used; no drill |

### Actions

Row action: open the appointment. No bulk actions (operational, not outreach). Weekly schedule to office managers.
Suited to the alert `late_start_pct` above a threshold (ENG-52) once DATA-17 is live.

### Open questions

- Check-out is often pressed at the desk after payment, so chair time includes paying time unless the Scheduler records
  "Available" (`available_on`, DATA-17). Proposal: use `available_on` as the end of chair time when present.
- Seated stamp capture: the Scheduler status "In Operatory" must write `seated_on` (DATA-17 writer, request to 03).
- Visits with two providers (hygienist then doctor): one stamp set per appointment; doctor exam time is not measurable.

## Hygiene reappointment and recall effectiveness - `recall.recare_effectiveness`

operations - P3 - L - `reports_recall_reports_screen_view_only` - interactive (format `retention` background) - READY

### Purpose

The hygiene coordinator, hygienists and the office manager (monthly hygiene meeting) see whether hygiene patients leave
with their next visit, whether those bookings hold, how big and how old the recall backlog is, and whether child, adult,
SRP and perio-maintenance patients come back. Decisions: coach the hygienist or visit kind that does not rebook, staff
recall outreach by overdue band, fix the perio-maintenance drop-off, check carriers whose frequency limits block rebooking.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `recall.scheduled_recall_report`, `recall.recall_due_report`, `recall.procedural_recall_report` (patient lists) | The four reappointment variants side by side by hygienist, visit kind and carrier; pre-appointment %; recall position by overdue band; 12-month retention by code group |

`worklists.recall_due` and `worklists.not_reappointed` are the queues; this report measures them. Called for by: KPI
§2.5, §3.5 HYG-02 to HYG-06; CT §6 I-39; 06 §2.9 "Reappointment", "Recall position", "Retention".

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Office of the hygiene visit; `recall_position` uses the patient's home office (as `rpt_recall_due()`) |
| `date_range` | `date_range` | `last_month` | Hygiene visit date (service). Format `retention`: the cohort is this range shifted back 12 months (`hygiene_retention_12m_pct`), printed |
| `report_date` | `date` (`as_of`) | `today` | Format `recall_position`; a past date is recomputed from procedure history and labelled `recomputed` (future-appointment state is today's, k12) |
| `compare_to` | `enum` | `previous_year` | |
| `time_grain` | `enum` | `month` | |
| `provider_ids` | `entity_multi` | `all` | `provider_role = hygienist`: `coalesce(hygienist_id, provider_id)` of the hygiene-visit line, per `hygiene_credit_policy` (05 §2.1); hygienists listed first |
| `carrier_ids` | `entity_multi` | `all` | Primary dental carrier today (k12) |
| `recall_procedure_codes` | `entity_multi` | `all` | Recall codes; default set = code group `recall_hygiene` |
| `preferred_hygienist_ids` | `entity_multi` | `all` | Format `recall_position` |
| `include_inactive_patients` | `boolean` | `false` | |
| `report_format` | `enum` | `summary` | `summary` (reappointment), `recall_position`, `retention`, `detail` |
| `group_by` | `enum` | `hygienist` | `hygienist`, `visit_kind`, `carrier`, `office`, `month` |
| `sort_by`, `page_break_by`, `output_format` | as filter card 3.9 | | |

Settings echoed: `hygiene_reappointment_basis`, `hygiene_appointment_rule`, `hygiene_return_code_group`,
`active_patient_window_months`.

### Data

| Dataset | Columns used |
|---|---|
| `rpt_charges` + `rpt_code_in_group()` | hygiene-visit lines (`g:hygiene_visit`, `prophy_child`, `prophy_adult`, `srp`, `perio_maintenance`, `perio`), `patient_id`, `office_id`, `service_date`, `provider_id`, `hygienist_id` |
| `rpt_visits` | hygiene visits = patient-office-days with a `hygiene_visit` charge |
| `rpt_appointment_facts` | `patient_id`, `appointment_date`, `created_date`, `status_class`, `has_hygiene_code`, `provider_kind`, `line_count` |
| `rpt_patient_activity` | `next_appointment_date`, `last_hygiene_date`, `first_visit_date` |
| `rpt_recall_due(:tenant_id, :report_date, :office_ids)` | `recall_status`, `due_date`, `is_scheduled`, `procedure_code`, `source`, `preferred_hygienist_id`, `patient_is_active`, `account_send_collections` |
| `rpt_insurance_coverage` | primary dental `carrier_id`, `carrier_name` |

Calculation: summary = the five metrics of 05 §2.8 per member (`hygiene_reappt_at_visit_pct`,
`hygiene_reappt_holds_now_pct`, `hygiene_return_12m_pct`, `hygiene_reappt_any_at_visit_pct`,
`hygiene_pre_appointment_pct`) plus the resolved alias `hygiene_reappointment_pct`; `visit_kind` = the code group of the
visit's hygiene line (`prophy_child`, `prophy_adult`, `srp`, `perio_maintenance`, `perio_other`) crossed with new /
existing. Recall position = `rpt_recall_due()` rows with codes in the selected set, earliest due date per patient,
banded `scheduled`, `not_due`, `due` (within 30 days), overdue 0-30, 31-90, 91-180, over 180 days, `no_due_date`
(`overdue_band` of 06 §6.6), plus `recall_overdue_pct`, `recall_due_unscheduled_patients`, `recare_active_pct`.
Retention = `hygiene_retention_12m_pct` by `code_group` (child prophy, adult prophy, SRP, perio maintenance), and the
provisional forward reading `hygiene_return_12m_pct` of the requested range beside it.

```
hv AS (SELECT DISTINCT c.patient_id, c.office_id, c.service_date, coalesce(c.hygienist_id, c.provider_id) AS hyg_id, <visit_kind>
       FROM rpt_charges c WHERE rpt_code_in_group(c.tenant_id, 'hygiene_visit', c.procedure_code, c.service_date) AND <range>)
SELECT hyg_id, count(*) AS hygiene_visits,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM rpt_appointment_facts f WHERE f.patient_id = hv.patient_id AND <hygiene appt>
                        AND f.appointment_date > hv.service_date AND f.created_date <= hv.service_date AND f.status_class <> 'cancelled')) ...
```

| Era | What works |
|---|---|
| Migrated history | Hygiene visits, holds-now variant (k12), returned-within-12-months and retention (H); recall position from derived intervals (`source = derived`) |
| App era | Booked-at-visit variants 1 and 4 (`created_date`): a migrated-only period returns `not_available` with `history_starts_on`, never a substitute (05 §2.8) |
| Waits for | DATA-41 (maintained recall rows; until then interval units are unverified, data card 2.24); DATA-43 (appointment type instead of `hygiene_appointment_rule`); SCHEMA(33) for the carrier on the visit date |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `member_label` | Hygienist / visit kind / carrier | text | `aggregate` (`provider_comp` by hygienist) | label |
| `hygiene_visits` | Hygiene visits | integer | `aggregate` | sum |
| `hygiene_patients` | Hygiene patients | integer | `aggregate` | count_distinct (patients) |
| `hygiene_reappt_at_visit_pct` | Booked at visit | percent | `aggregate` | ratio of sums |
| `hygiene_reappt_holds_now_pct` | Holds one now | percent | `aggregate` | ratio of sums |
| `hygiene_return_12m_pct` | Returned in 12 months | percent | `aggregate` | ratio of sums; provisional marker |
| `hygiene_reappt_any_at_visit_pct` | Any appointment at visit | percent | `aggregate` | ratio of sums |
| `hygiene_pre_appointment_pct` | Pre-appointed | percent | `aggregate` | ratio of sums |
| `not_reappointed` | Not reappointed | integer | `aggregate` | sum (complement of the resolved variant) |

`recall_position` columns: member (office, preferred hygienist), patients in recall, one integer per band,
`recall_overdue_pct`, `recall_due_unscheduled_patients`, `recare_active_pct`. `retention` columns: code group, cohort
patients, returned, `hygiene_retention_12m_pct`, forward `hygiene_return_12m_pct` (provisional). Detail: patient rows
(`phi_identified`): last hygiene date, kind, hygienist, reappointed (each variant), next appointment, recall due date,
band, carrier. Summary cards: `hygiene_reappointment_pct` (variant named), `hygiene_pre_appointment_pct`,
`recall_overdue_pct`, `hygiene_retention_12m_pct`. `reconciles_with`: every variant key and the recall-position metrics.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Grouped bars | The four variants per hygienist with the 85 / 90 band |
| Stacked bar | Recall position by band (trend from `rpt_metric_values` snapshots once DATA-30 runs) |
| Bars | Retention by code group, PY marker |

| Click | Target |
|---|---|
| Not reappointed, any variant numerator / denominator | `worklists.not_reappointed` (`visit_kind = hygiene`, `{std}`); denominator: `kind = rows` |
| Hygiene visits | `daily.production_report` (`procedure_codes` = `hygiene_visit` codes) |
| Overdue band | `worklists.recall_due` (`overdue_band`, `recall_procedure_codes`); print `recall.recall_due_report` |
| Retention cohort | `kind = rows` (cohort patients not returned) |
| Hygienist row | `dashboards.provider` for that provider |

### Actions

Detail rows: bulk `send_sms` / `send_email` (message type `recall`, consent required), `postcards`, `labels`,
`create_task`, `export_selection`. Monthly schedule "Last month by hygienist"; suited to the alert
`hygiene_reappointment_pct` below its band.

### Open questions

- Perio patients on 3-4 month intervals pass the 12-month return test easily; a per-interval "returned on time" test
  needs maintained recall intervals (DATA-41).
- A patient handed to another hygienist counts as reappointed for the first one (any hygiene appointment counts).
- Carrier is today's coverage until DATA-33; label "carrier today".

## Procedure and perio mix - `analytics.clinical_mix`

operations - P3 - M - `reports_daily_reports_screen_view_only` - interactive - READY

### Purpose

The clinical director and owner (quarterly per provider, monthly per office) compare clinical habits as per-visit and
per-exam rates: perio diagnosis, SRP volume, adjuncts and fluoride, bitewings at recare, FMX or pano for new patients,
crowns, root canals, implants and extractions per 100 exams. Each provider is shown against the office and the
organisation. Decisions: calibration sessions, protocol reminders, under- or over-diagnosis review. Not a pay input.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `daily.production_analysis_report` (counts and fees per code) | Rates with a defined denominator (visits, hygiene visits, recare exams, new patients, exams), by provider, with office and organisation comparators and variance in points |

Called for by: KPI §3.5 HYG-10 to HYG-12, §3.9 CLN-02, CLN-05, CLN-06; CT §6 I-39; 06 §2.9 "Perio and adjuncts".

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Office of service |
| `date_range` | `date_range` | `last_month` | Service date; shipped view "Last quarter" (rates need volume) |
| `compare_to` | `enum` | `previous_year` | |
| `provider_ids` | `entity_multi` | `all` | `provider_role = treating` (hygiene rows: `hygiene_credit_policy`) |
| `production_group` | `enum` | `all` | |
| `report_format` | `enum` | `summary` | `summary` (metric x member), `detail` |
| `group_by` | `enum` | `provider` | `provider`, `office` |
| `sort_by`, `page_break_by`, `output_format` | as filter card 3.9 | | |
| `mix_set` | `enum` | `all` | NEW (04): `hygiene` (perio, SRP, adjuncts, fluoride, bitewings), `restorative` (crowns, RCT, implants, extractions, fillings, sealants per 100 exams), `imaging` (FMX / pano, bitewings), `all` |
| `detail_metric` | `enum` | none | NEW (04): required for `detail`; one metric of the set; the detail lists its denominator rows with an `in_numerator` flag |

Setting echoed: `perio_age_min`, `rate_min_denominator`.

### Data

| Dataset | Columns used |
|---|---|
| `rpt_charges` + `rpt_code_in_group()` | `patient_id`, `office_id`, `provider_id`, `hygienist_id`, `service_date`, `procedure_code`, `tooth`, `is_production` |
| `rpt_visits`, `rpt_provider_visits` | visit denominators |
| `rpt_patient_activity`, `rpt_patient_dim` | `first_visit_date` (new patients), `dob` (age for `perio_patient_pct`, aggregated only) |
| working-days builder | `srp_quadrants_per_working_day` |

Rows (metric keys of 05): `perio_patient_pct`, `perio_visit_share_pct`, `srp_quadrants_per_working_day`,
`adjunctive_therapy_pct` (and by `code_group` laser, irrigation, antimicrobial), `fluoride_rate_pct`,
`bitewing_recare_pct`, `fmx_pano_new_patient_pct`, and NEW `procedures_per_100_exams` (05 §5.9) =
`procedure_count [g] ÷ count of g:exam_all lines × 100` by `code_group` `crown`, `rct`, `implant_placement`,
`extraction`, `filling`, `sealant`. Comparators: office value and organisation value (ratio of sums over all members of
the readable scope); variance = member − office in points. Peer median and quartile join in P4 (ENG-51, SC-1). A member
below `rate_min_denominator` shows the value greyed and unranked.

```
SELECT m.metric_key, m.provider_id, m.numerator, m.denominator, ratio(m.numerator, m.denominator) AS value,
       office.value AS office_value, org.value AS org_value
FROM <metric builder per key, grouped by provider_id, office_id> m
JOIN <same builder grouped by office_id> office USING (office_id) CROSS JOIN <same builder, no grouping> org
```

| Era | What works |
|---|---|
| Migrated history | All rows (H). `hygienist_id` is NULL on migrated charges: hygiene work is credited to the treating provider (k2); k8, k9, k14 apply |
| Waits for | Content review of the [I] groups (MET-03); DATA-04 typed flags (P0) |

Unknowable: perio diagnosis without a code (charting without treatment), procedures refused by the patient.

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `metric_label` | Measure | text | `aggregate` | label |
| `provider_label` | Provider | text | `provider_comp` | label (column members when `group_by = provider`) |
| `numerator` | Count | integer | `aggregate` | sum |
| `denominator` | Of | integer | `aggregate` | sum |
| `value` | Rate | percent / decimal | `aggregate` (`provider_comp` by provider) | ratio of sums |
| `office_value` | Office | percent / decimal | `aggregate` | none (builder: office value, ratio of sums) |
| `org_value` | Organisation | percent / decimal | `aggregate` | none (builder: organisation value, ratio of sums) |
| `variance_pp` | vs office | decimal | as `value` | none (computed `difference(value, office_value)` per row) |

Shape `matrix`: rows metric, columns provider, value `value` (`max_columns` 30), with the office and organisation columns
at the right. Detail (per `detail_metric`): patient-day rows (`clinical` per header rule for code detail): date, patient,
provider, the codes that qualified, `in_numerator`. Summary cards: `perio_patient_pct`, `fluoride_rate_pct`,
`bitewing_recare_pct`, `fmx_pano_new_patient_pct`. `reconciles_with`: each metric at office level.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Dot plot | One row per metric, a dot per provider, office and organisation markers |
| Bars | Adjunctive therapy by code group |

| Click | Target |
|---|---|
| Numerator count | `daily.production_report` (`procedure_codes` = the group's codes, `provider_ids`, `{std}`) |
| Rate cell | `kind = rows` with `detail_metric` = that metric (numerator and denominator lists separately) |
| Provider column header | `dashboards.provider` |

### Actions

No bulk actions (clinical review happens in the chart). Row action on detail: open the patient chart (route key owned by
07). Quarterly schedule "Last quarter by provider" to the clinical director.

### Open questions

- Per-visit or per-patient denominators for adjuncts (05 uses patients for `adjunctive_therapy_pct`, visits for
  fluoride); both are kept as defined in 05.
- Coverage frequency limits depress bitewing and fluoride rates for some carriers; a carrier split is not offered (no
  payer on the service date before DATA-33).
- Specialists distort office comparators; proposal: the office value excludes `provider_kind = specialist` (setting).

## Clinical follow-through gaps - `treatment_plan.clinical_follow_through_gaps`

operations - P3 - M - `reports_treatment_plan_reports_screen_view_only` - interactive (background when the look-back exceeds 24 months) - READY

### Purpose

Treatment coordinators and doctors (monthly) find patients for whom a clinically expected follow-on was never done and
is not booked: root canal without a crown, SRP without perio maintenance, extraction without a replacement, crown prep
without a seat. They review the chart, add the missing plan item, and invite the patient. The summary rate per pair and
provider is a quality signal for the clinical director.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `treatment_plan.treatment_plan_status` (planned items by status) | Finds follow-ons that were never planned, from completed charges, so it works on migrated history (migrated plans are 674 undated headers); per-pair rates, open value, plan and booking status of the follow-on, bulk outreach |

`worklists.unscheduled_treatment` lists planned items only. Called for by: CT §6 I-13 (has / lacks a code, P0) and §5
TS-5; 06 §12.5 ideas 13-14 "partly: has / lacks a code logic is not offered".

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Office of service of the A procedure; the B search is organisation-wide |
| `date_range` | `date_range` | `trailing_12_months` | Service date of A (one year of A events gives closed 6-month windows for most rows) |
| `provider_ids` | `entity_multi` | `all` | `provider_role = treating` of A |
| `include_inactive_patients` | `boolean` | `false` | |
| `report_format` | `enum` | `summary` | `summary`, `detail` |
| `group_by` | `enum` | `pair` | `pair`, `provider`, `office` |
| `sort_by`, `page_break_by`, `output_format` | as filter card 3.9 | detail default sort: open value descending | |
| `pair_keys` | `entity_multi` | `all` | NEW (04): source `lookup:follow_through_pairs` (enabled pairs) |
| `follow_through_statuses` | `enum_multi` | `open_gap`, `in_window` | NEW (04), detail only: `followed`, `followed_late`, `scheduled`, `planned`, `referred_out`, `resolved_other`, `open_gap`, `in_window` |

### Data

Pair definitions are data, not report code: NEW table `follow_through_pairs` owned by 05 §4 (versioned like code
groups; columns `pair_key`, `group_a`, `group_b`, `window_months`, `match` = `same_tooth` · `same_quadrant` ·
`same_arch` · `patient`, `exclude_teeth[]`, `is_enabled`, `valid_from`, `valid_to`, tenant override). Shipped defaults
([I], to be confirmed by the clinical lead):

| `pair_key` | A (`group_a`) | B (`group_b`) | Window | Match | Note |
|---|---|---|---|---|---|
| `rct_without_crown` | `rct` | `crown` + `prefab_crown` | 6 months | `same_tooth` | Anterior teeth excluded by default (`exclude_teeth` 6-11, 22-27) |
| `srp_without_perio_maintenance` | `srp` | `perio_maintenance` | 6 months | `patient` | |
| `extraction_without_replacement` | `extraction` | NEW group `tooth_replacement` = `implant_services` + `bridge` + `denture` | 12 months | `same_arch` | Third molars excluded (1, 16, 17, 32) |
| `crown_prep_without_seat` | NEW group `crown_prep` (tenant in-house code; empty by default) | `crown` | 2 months | `same_tooth` | `not_available` "no crown-prep code configured" while the group is empty |

| Dataset | Columns used |
|---|---|
| `rpt_charges` + `rpt_code_in_group()` | A and B lines: `charge_id`, `patient_id`, `office_id`, `provider_id`, `service_date`, `procedure_code`, `tooth`, `quadrant` |
| `rpt_appointment_procedures` | a future live booked B line (same match) → `scheduled` |
| `rpt_treatment_item_facts` | a pending B item (`is_pending`, same match) → `planned` |
| `rpt_referral_facts` | `outbound_item` with a B code → `referred_out` |
| `rpt_patient_dim`, `rpt_patient_activity` | phones, `no_auto_sms`, `no_correspondence`, `is_active`, `next_appointment_date`, `last_visit_date` |
| `rpt_benefit_usage()`, `rpt_fee_schedule_fees` | remaining annual maximum and benefit-year end; B fee on the patient's fee schedule (else the office UCR schedule) for the open value |

Status of each A event (first match wins): `followed` (B within the window), `followed_late` (B after the window),
`resolved_other` (same tooth extracted later, for `rct` and `crown_prep`), `scheduled`, `planned`, `referred_out`,
`in_window` (window not yet closed), `open_gap`. Rate (NEW `follow_through_gap_pct`, 05 §5.9) = `open_gap` ÷ A events
whose window has closed (`in_window` is outside the denominator). Open value (NEW `follow_through_open_value`) = Σ B fee
of `open_gap` rows, labelled "estimated".

```
a AS (SELECT c.*, p.pair_key, p.window_months, p.match FROM rpt_charges c JOIN follow_through_pairs p ON p.is_enabled
      WHERE rpt_code_in_group(c.tenant_id, p.group_a, c.procedure_code, c.service_date) AND <range> AND <exclude_teeth>)
SELECT a.*, b.first_b_date, CASE WHEN b.first_b_date <= a.service_date + window THEN 'followed' ... END AS status
FROM a LEFT JOIN LATERAL (SELECT min(c2.service_date) AS first_b_date FROM rpt_charges c2
                          WHERE c2.patient_id = a.patient_id AND c2.service_date > a.service_date AND <match>
                            AND rpt_code_in_group(c2.tenant_id, <group_b>, c2.procedure_code, c2.service_date)) b ON true
```

| Era | What works |
|---|---|
| Migrated history | Everything that reads charges (H). k14: about 6 % of migrated charges were skipped at load, so a B done in Denticon may be missing and show a false gap (printed with the measured gap); k9: archived charges follow the tenant policy |
| App era | `planned` and `referred_out` statuses (treatment items and referral items are app-era) |
| Waits for | DATA-57 (reload of skipped charges), MET-03 (pair content) |

Unknowable: a follow-on done at another practice; the clinical reason a crown was not indicated. `tooth` on migrated
charges is assumed loaded as stored [I]; the data-readiness checker should count A lines without a tooth (request to 03).

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `pair_label` | Follow-through pair | text | `aggregate` | label |
| `a_events` | Procedures (A) | integer | `aggregate` | sum |
| `windows_closed` | Window closed | integer | `aggregate` | sum |
| `followed` | Followed in window | integer | `aggregate` | sum |
| `followed_late` | Followed late | integer | `aggregate` | sum |
| `scheduled_or_planned` | Booked or planned | integer | `aggregate` | sum |
| `referred_out` | Referred out | integer | `aggregate` | sum |
| `open_gaps` | Open gaps | integer | `aggregate` | sum |
| `follow_through_gap_pct` | Gap % | percent | `aggregate` (`provider_comp` by provider) | ratio(`open_gaps`, `windows_closed`) |
| `follow_through_open_value` | Open value (estimated) | money | `financial_practice` | sum |
| `median_months_to_b` | Months to follow-on (median) | decimal | `aggregate` | none (builder: median per grouping set) |

Detail (`clinical` for the code pair, `phi_identified` for identity, `financial_patient` for amounts): patient, phones
flags, A date, A code, tooth, A provider, status, months since A, B booked date, planned item, next appointment,
remaining maximum, benefit-year end, estimated B fee. Summary cards: `open_gaps`, `follow_through_gap_pct`,
`follow_through_open_value`. No `reconciles_with` (no tile yet; 06 may add one).

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Stacked bars | Status mix per pair |
| Bars | Gap % by provider per pair, office value marker |

| Click | Target |
|---|---|
| Any count | `kind = rows` (detail with `pair_keys` and `follow_through_statuses` of the cell) |
| `a_events` | `daily.production_report` (`procedure_codes` = group A, `{std}`) |
| Detail row | Patient chart (restorative); treatment plan to add the B item; booking hand-off `openSchedulerForBooking` (07) |

### Actions

Detail: bulk `send_sms` / `send_email` (`requires = [sms_consent]`; `no_correspondence` excluded with a count), `letters`,
`create_task` (follow-ups in `worklists.my_followups`), `export_selection`; row actions `open_chart`, `open_treatment_plan`,
`schedule`. Monthly schedule with `skip_if_empty` ("Open gaps, last 12 months").

### Open questions

- Should this become a worklist (`worklists.clinical_gaps`) with follow-up state and outcomes? Recommended for P4 (06).
- Crown billed at prep or at seat is practice policy; `crown_prep_without_seat` only works with an in-house prep code.
- Pair content, windows and exclusions need clinical sign-off before shipping (05 MET-03).

## Case acceptance funnel - `treatment_plan.case_acceptance_funnel`

operations - P3 - L - `reports_treatment_plan_reports_screen_view_only` - background (cohorts) - APP

### Purpose

Doctors, treatment coordinators and office managers (monthly) see, for each month of presented treatment, how much was
accepted, scheduled and completed and how long each step took, by provider, counsellor and category. Decisions: is the
problem presentation, acceptance, scheduling or completion; who needs coaching; which backlog to work first (age,
acceptance state, remaining benefits, benefit-year end).

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `treatment_plan.treatment_plan_analysis` (status totals for one range) | Presentation per exam and diagnostic % by provider (the stage before the funnel, for doctor calibration); presentation-month cohorts with windowed acceptance and completion, strict stage hierarchy, time to schedule and to complete, provider / counsellor / category comparison, backlog ageing with remaining benefits |

The unscheduled backlog queue is `worklists.unscheduled_treatment`; its ageing summary is format `backlog` here (header,
candidates left out). Called for by: KPI §2.6, §3.6 TXA-04 to TXA-10; CT §6 I-40, §5 D-13; 06 §2.10 "Funnel",
"Acceptance", "Completion", "Unscheduled treatment".

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Item office (`treatment_item_office`: plan office, else home office until DATA-39) |
| `date_range` | `date_range` | `trailing_12_months` | Cohort basis `presented_date`; cohorts younger than the windows are `is_provisional` |
| `report_date` | `date` (`as_of`) | `today` | Format `backlog` |
| `compare_to` | `enum` | `previous_year` | Same cohorts a year earlier |
| `time_grain` | `enum` | `month` | Cohort grain: `month`, `quarter` |
| `provider_ids` | `entity_multi` | `all` | Item provider |
| `tx_counselor_ids` | `entity_multi` | `all` | Key of `catalog/treatment_plan_reports.md` (Tx Counselor) |
| `procedure_category_codes`, `procedure_codes` | `entity_multi` | `all` | |
| `benefits_remaining_min` | `decimal` | `0.00` | Format `backlog`; key of 06 §6.5 (NEW in 04 if not yet there) |
| `report_format` | `enum` | `funnel` | `funnel` (cohort x stage), `presentation` (provider x month: exams, presented per exam, diagnostic %), `by_member`, `backlog`, `detail` |
| `group_by` | `enum` | `provider` | `by_member`: `provider`, `counselor`, `category`, `office` |
| `sort_by`, `page_break_by`, `output_format` | as filter card 3.9 | | |

Settings echoed: `case_acceptance_unit`, `case_acceptance_window_days` (30), `case_completion_window_days` (180),
`unscheduled_tx_max_age_months`.

### Data

| Dataset | Columns used |
|---|---|
| `rpt_treatment_item_facts` | `item_id`, `plan_id`, `patient_id`, `office_id`, `provider_id`, `counselor_user_id`, `procedure_code`, `status_norm`, `exclusive_status`, `presented_date`, `is_accepted`, `accepted_date_effective`, `is_scheduled`, `scheduled_date`, `is_completed`, `completed_date`, `is_pending`, `is_unscheduled`, `fee`, `insurance_estimate`, `est_patient`, `preauth_status`, `era` |
| `rpt_procedure_code_dim` | `code_category` |
| `rpt_benefit_usage(:report_date)` | `max_remaining_effective`, benefit-year end |
| `rpt_user_dim`, `rpt_provider_dim` | counsellor and provider labels |
| `rpt_patient_activity` | `next_appointment_date` |
| `rpt_charges` + `rpt_code_in_group()` | exams (`g:exam_all`) by treating provider and service date, format `presentation` |

Cohort (05 §2.9): `era = 'app'` items presented in the period, excluding `alternative`, `referred_out`,
`external_referral`, `existing`. Stages by strict hierarchy (data card 3.2): completed, scheduled, accepted, presented
only. Metrics: `treatment_presented_amount`, `patients_presented`, `case_acceptance_dollars_pct` (window),
`case_acceptance_plans_pct`, `case_acceptance_patients_pct`, `treatment_funnel_amount` / `_pct` by `funnel_stage`,
`case_completion_pct`, `avg_accepted_per_patient`; NEW (05 §5.6) `days_to_schedule_median` (`scheduled_date −
presented_date` of items with a booking) and `days_to_complete_median` (`completed_date − presented_date`). Undated
acceptance is reported as the warning amount `accepted_undated_amount` (05 §2.9). Backlog: `is_unscheduled` items as of
`report_date` by age band (0-30, 31-90, 91-180, 181-365, over 365 days since presentation) x `acceptance_state`
(accepted, diagnosed / unaccepted, hold) with `unscheduled_treatment_amount`, `unscheduled_treatment_patients`,
`preauthorized_pct`, `benefits_remaining_amount`, and the amount of patients whose benefit year ends within 3 months.
Format `presentation`: per provider and month, exams, `treatment_presented_per_exam` (restorative and elective dollars
presented per exam), `diagnostic_pct` (exam visits on which new treatment was presented), presented amount and patients
presented, with the office value (ratio of sums) beside each provider; members below `rate_min_denominator` exams are
greyed and unranked. Exams work on history; the presented side is app era, so a migrated-only month renders
`history starts on <date>`.

```
SELECT date_trunc(:grain, presented_date) AS cohort, <member>,
       sum(fee) AS presented, sum(fee) FILTER (WHERE is_accepted AND accepted_date_effective <= presented_date + :acc_window) AS accepted_w,
       sum(fee) FILTER (WHERE stage IN ('scheduled','completed')) AS scheduled, sum(fee) FILTER (WHERE is_completed AND completed_date <= presented_date + :cmp_window) AS completed_w,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY scheduled_date - presented_date) FILTER (WHERE scheduled_date IS NOT NULL) ...
FROM rpt_treatment_item_facts WHERE era = 'app' AND presented_date BETWEEN :date_from AND :date_to AND <cohort filter> GROUP BY 1, 2
```

| Era | What works |
|---|---|
| Migrated history | Nothing (674 plan headers without dates or provider): periods before the first app-era item render "history starts on <date>" |
| App era | Every column; acceptance and stages are current state until DATA-25 dates each transition (an item set back to unaccepted no longer counts) |
| Waits for | DATA-56 (item facts), DATA-25 (exact time to accept / schedule), DATA-39 (item office, accepted stamp, SCHEMA(39)), DATA-32 (benefit remainders on migrated plan limits) |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `cohort_label` / `member_label` | Presented in / member | text | `aggregate` (`provider_comp` by provider) | label |
| `patients_presented` | Patients | integer | `aggregate` | count_distinct (patients) |
| `treatment_presented_amount` | Presented | money | `financial_practice` | sum |
| `treatment_accepted_amount` | Accepted (window) | money | `financial_practice` | sum |
| `case_acceptance_pct` | Acceptance | percent | `financial_practice` | ratio of sums (unit named) |
| `scheduled_amount` | Scheduled or done | money | `financial_practice` | sum (funnel stage) |
| `completed_amount` | Completed (window) | money | `financial_practice` | sum |
| `case_completion_pct` | Completion | percent | `financial_practice` | ratio of sums |
| `acceptance_completion_gap` | Gap (points) | decimal | `financial_practice` | none (computed `difference`; equals `acceptance_completion_gap_pp` from P4) |
| `days_to_schedule_median` | Days to schedule | decimal | `aggregate` | none (builder: median per grouping set) |
| `days_to_complete_median` | Days to complete | decimal | `aggregate` | none (builder: median per grouping set) |
| `unaccepted_amount` | Not accepted | money | `financial_practice` | sum |
| `is_provisional` | Provisional | boolean | `aggregate` | none (hidden; dashed cell style) |

`backlog`: matrix age band x acceptance state, value amount, with patients and `benefits_remaining_amount` columns.
`presentation`: rows provider (`provider_comp`), columns `exams`, `treatment_presented_amount`,
`treatment_presented_per_exam`, `diagnostic_pct`, `patients_presented`, with an office row.
Detail: item rows (`financial_patient`, `phi_identified`): patient, plan, code, tooth, presented, accepted, scheduled,
completed, stage, days to schedule, fee, estimates, counsellor. Summary cards: `treatment_presented_amount`,
`case_acceptance_pct`, `case_completion_pct`, `unscheduled_treatment_amount`. `reconciles_with`: the acceptance,
funnel, completion and unscheduled metrics; `treatment_presented_per_exam`, `diagnostic_pct` (format `presentation`).

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Funnel | Presented, accepted, scheduled, completed amounts of the run |
| Cohort bars | Stage % per cohort month, provisional cohorts dashed |
| Heat table | Backlog age band x acceptance state |

| Click | Target |
|---|---|
| Stage amount | `treatment_plan.treatment_plan_status` (`date_basis = diagnosed_date`, `treatment_plan_status` = stage, `{std}`) |
| Backlog cell | `worklists.unscheduled_treatment` (`acceptance_state`, presented-date range of the band, `benefits_remaining_min`) |
| `presentation` cell | presented: `treatment_plan.treatment_plan_status` (`provider_ids`, `date_basis = diagnosed_date`); exams: `daily.production_report` (`exam_all` codes, `provider_ids`) |
| Member row | `kind = rows` (detail of that member) |

### Actions

None of its own (the backlog is worked in `worklists.unscheduled_treatment`; the drill passes the filters). Detail row
actions: open treatment plan, print proposal (`treatment_plan.treatment_plan_proposal`). Shipped views: "Last 12 months
by provider", "Accepted, benefits ending this year" (backlog, October-December). Monthly schedule to treatment
coordinators.

### Open questions

- Cohort per item (fees) or per plan: the funnel uses item fees; plan and patient units are the acceptance variants.
- Same-day completed items have no booking: days to schedule = 0 or excluded? Proposed: excluded, counted separately.
- Counsellor is NULL on most items until the plan screen requires it.

## New patient acquisition and conversion - `analytics.new_patient_acquisition`

operations - P3 - L - `reports_lists_patient_list_screen_view_only` - interactive (format `cohort` background) - READY

### Purpose

Owners, marketing and office managers (monthly) see where new patients come from (source, booking channel, zip, office,
first provider), what the first visit produced, whether imaging and reappointment happened at the first visit, and how
many became patients of record (a second visit within 6 and 12 months). Decisions: which sources and areas to invest in,
first-visit script and protocol, follow-up of new patients who did not return.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `lists.patient_list_new_patient` (roster); `referral.referral_summary_report` (counts by source) | Conversion: reappointed at the first visit, second visit within 6 / 12 months; first-visit production and imaging; channel, zip and first-provider splits; cohort view |

Money and cost per source over 12 and 24 months stay in `referral.referral_source_return`; this report has no cost or
return columns. Conversion by source is only here; that report links back with `group_by = referral_source`. Called for by: KPI §3.7 PAT-01, PAT-08; CT §5 TS-6; 06 §2.11 "New patients", "First-visit quality",
"Where new patients come from".

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Office of the first visit (`first_visit_office_id`, 05 §5.7) |
| `date_range` | `date_range` | `last_month` (summary, detail); `matured_12m_cohorts` (format `cohort`) | First-visit date (cohort); conversion windows run past `date_to` and are printed. In the summary of a recent range the second-visit columns are `is_provisional`; the cohort format defaults to cohorts whose 12-month window has closed, stated in the criteria echo |
| `compare_to` | `enum` | `previous_year` | |
| `time_grain` | `enum` | `month` | Format `cohort` |
| `provider_ids` | `entity_multi` | `all` | Providers of the first visit: every provider who charged a visit code on the first-visit date (`rpt_provider_visits`); a patient seen by two providers counts under both and the total is deduplicated. `rpt_visits.primary_provider_id` serves only the additive doctor / hygiene split |
| `referral_type_codes` | `entity_multi` | `all` | Shared |
| `carrier_ids` | `entity_multi` | `all` | Primary dental carrier today (k12) |
| `report_format` | `enum` | `summary` | `summary`, `cohort`, `detail` |
| `group_by` | `enum` | `source_category` | `source_category`, `referral_source`, `booking_channel`, `zip_code`, `office`, `provider`, `first_visit_kind`, `payer_type`, `month` |
| `sort_by`, `page_break_by`, `output_format` | as filter card 3.9 | | |

Setting echoed: `new_patient_basis` (the summary counts `new_patients_first_visit` whatever the alias resolves to, and
prints the resolved headline beside it).

### Data

| Dataset | Columns used |
|---|---|
| `rpt_patient_activity` | `first_visit_date`, `first_visit_office_id`, `visit_days` |
| `rpt_visits`, `rpt_provider_visits` | first and second visit dates; providers who charged a visit code on the first-visit date; `primary_provider_id` for the doctor / hygiene split only |
| `rpt_patient_dim` | `zip5`, `dob`, `home_office_id`, `referral_source_id`, `referral_source_name`, `is_placeholder_patient`, `created_at_reliable` |
| `rpt_referral_facts` | `inbound_source`: `source_category`, `referral_source_id`, `source_type_label` |
| `rpt_appointment_facts` | first kept appointment: `booking_source`, `lead_days`, `created_date`, `is_new_patient`; later appointments for reappointment |
| `rpt_charges` + `rpt_code_in_group()` | production on the first-visit date; `radiograph_fmx`, `radiograph_pano`; `exam_new_patient`, `exam_emergency` (first-visit kind) |
| `rpt_insurance_coverage` | primary dental coverage today (`payer_type`, NEW dimension mapped from `plan_type`, `network_type`, `is_prepaid` through `rpt_value_map`: `self_pay`, `ppo`, `capitation`, `medicaid`, `other`) |

Measures: `new_patients_first_visit`, `new_patients_missing_source_pct`, `patient_referral_share_pct`,
`fmx_pano_new_patient_pct`, `new_patient_reappointment_pct`, `new_patient_lead_days`; NEW (05 §5.7)
`first_visit_production_avg` (P on the first-visit date ÷ new patients), `new_patient_second_visit_6m_pct` and
`new_patient_second_visit_12m_pct` (cohort = `new_patients_first_visit` by `first_visit_date` and first-visit office; a
visit on a later date within 6 / 12 months of the first; `is_provisional` until the window has passed - the one 05
definition of conversion, also by source), `emergency_first_visit_pct`. Dimension `first_visit_kind`: `comprehensive`, `emergency`, `hygiene`,
`other` from the first-visit codes. Zip: top 15 members plus `other`.

```
np AS (SELECT pa.patient_id, pa.first_visit_date, pa.first_visit_office_id FROM rpt_patient_activity pa
       WHERE pa.first_visit_date BETWEEN :date_from AND :date_to
         AND (:all_providers OR EXISTS (SELECT 1 FROM rpt_provider_visits pv WHERE pv.patient_id = pa.patient_id
              AND pv.visit_date = pa.first_visit_date AND pv.office_id = pa.first_visit_office_id
              AND pv.provider_id = ANY(:provider_ids))))
SELECT <dimension>, count(*), avg(<P on first visit>),
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM rpt_visits v2 WHERE v2.patient_id = np.patient_id
                                      AND v2.visit_date > np.first_visit_date AND v2.visit_date <= np.first_visit_date + interval '6 months')) ...
```

| Era | What works |
|---|---|
| Migrated history | New patients, first-visit production, imaging, second-visit conversion (H; k9: an archived old charge excluded by policy makes a long-standing patient look new; k14). Source for migrated patients through the legacy id (H; `source_category` inferred) |
| App era | Reappointment at the first visit, lead days, created-record basis (A); booking channel `appoint_now` (A) |
| Waits for | DATA-40 (source link for app patients, who hold free text until then: member `Unmatched text`), DATA-17 (`appoint_now_api` vs `appoint_now`) |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `member_label` | (group) | text | `aggregate`; `zip_code` member: class of `zip5` per 08 §5.2 rule 13 | label |
| `new_patients_first_visit` | New patients | integer | `aggregate` | sum |
| `share_pct` | Share | percent | `aggregate` | `share_of_parent` |
| `new_patients_missing_source_pct` | No source | percent | `aggregate` | ratio of sums |
| `first_visit_production_avg` | First-visit production (avg) | money | `financial_practice` | ratio of sums |
| `fmx_pano_new_patient_pct` | FMX / pano within 30 days | percent | `aggregate` | ratio of sums |
| `new_patient_reappointment_pct` | Reappointed at first visit | percent | `aggregate` | ratio of sums (A) |
| `new_patient_second_visit_6m_pct` | Second visit in 6 months | percent | `aggregate` | ratio of sums; provisional marker |
| `new_patient_second_visit_12m_pct` | Second visit in 12 months | percent | `aggregate` | ratio of sums; provisional marker |
| `new_patient_lead_days` | Lead days (avg) | decimal | `aggregate` | weighted_avg (new patients) |
| `emergency_first_visit_pct` | Emergency first visit | percent | `aggregate` | ratio of sums |

Format `cohort`: first-visit month rows x the conversion columns. Detail (`phi_identified`, `financial_patient`):
patient, first visit date, office, provider, source, channel, zip, first-visit kind, production, imaging, reappointed,
second visit date, next appointment. Summary cards: `new_patients_first_visit`, `new_patient_reappointment_pct`,
`new_patient_second_visit_6m_pct`, `new_patients_missing_source_pct`. `reconciles_with`: `new_patients_first_visit`,
`new_patients_missing_source_pct`, `fmx_pano_new_patient_pct`, `new_patient_reappointment_pct`.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Bars | New patients by the `group_by` member (top 15 + `other`), second-visit % as a dot |
| Cohort line | Second-visit 6 / 12 month % by first-visit month, provisional dashed |

| Click | Target |
|---|---|
| New patients | `lists.patient_list_new_patient` (`{std}`) |
| Not reappointed at first visit | `worklists.not_reappointed` (`visit_kind = new_patient`) |
| Source member | `referral.referral_source_return` (`referred_from_ids` = clicked source) |
| `booking_channel = appoint_now` | `analytics.online_booking_funnel` |
| Detail row | Patient record |

### Actions

Detail: bulk `send_sms` / `send_email` (second-visit invitation; consent required), `letters`, `create_task`,
`export_selection`. Monthly schedule "Last month by source".

### Open questions

- Emergency-only new patients: counted (05 default) but shown as a member so they can be excluded by a saved view.
- Zip members are small places: confirm with 08 whether `zip_code` grouping needs `phi_identified` or a small-cell rule.
- Duplicate patient records across offices create false new patients (`management.data_quality_exceptions` lists them).

## Retention, attrition and the active base - `analytics.patient_retention_cohorts`

operations - P3 - L - `reports_lists_patient_list_screen_view_only` - background - READY

### Purpose

Owners, office managers and regional managers (quarterly) see whether the patient base grows or only replaces losses,
how each first-visit cohort holds up at 6, 12, 18 and 24 months, and which office or provider loses patients. Decisions:
size reactivation campaigns, find a provider or office with abnormal attrition, check the active-window setting, set
the new-patient target needed to replace attrition (KPI PAT-03).

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `lists.patient_list` (status today) | Flow over time (bridge), cohort retention curves, attrition and reactivation by office and provider, at-risk and lapsed counts |

Called for by: KPI §2.4, §3.7 PAT-02 to PAT-07; CT §6 I-18; 06 §2.11 "Base", "Flow", "Retention".

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Bound by `office_attribution` |
| `office_attribution` | `enum` | `visit_office` | Header vocabulary: `visit_office` (rows on `rpt_visits`; non-additive across offices, organisation total deduplicated) or `home_office` |
| `date_range` | `date_range` | `trailing_12_months` (bridge, by member, detail); `matured_24m_cohorts` (format `cohort`) | Bridge: the periods; cohort: first-visit dates of the cohorts. The cohort default holds twelve cohorts whose 24-month cell has closed, so the whole triangle is filled; a later range leaves the unclosed cells blank and `is_provisional`, stated in the criteria echo |
| `compare_to` | `enum` | `previous_year` | |
| `time_grain` | `enum` | `month` | `month`, `quarter` (bridge rows; cohort grain) |
| `provider_ids` | `entity_multi` | `all` | Last-visit provider (`rpt_patient_activity.last_visit_provider_id`) as of the period end |
| `report_format` | `enum` | `bridge` | `bridge`, `cohort`, `by_member`, `detail` (patients lost in the range) |
| `group_by` | `enum` | `office` | `by_member`: `office`, `provider`, `first_visit_kind`, `age_band` |
| `sort_by`, `page_break_by`, `output_format` | as filter card 3.9 | | |

Settings echoed: `active_patient_window_months` (W), `at_risk_from_months`, `at_risk_to_months`,
`active_requires_active_flag`.

### Data

| Dataset | Columns used |
|---|---|
| `rpt_visits` | `patient_id`, `office_id`, `visit_date` (the only input of `L_asof`, 05 §5.7) |
| `rpt_patient_activity` | `first_visit_date`, `first_visit_office_id`, `last_visit_provider_id` |
| `rpt_patient_dim` | `is_active`, `dob`, `home_office_id` |
| P4 | `rpt_patient_activity_summary` (DATA-48) replaces the per-date laterals |

Bridge per period: start = `active_patients` as of the day before the period; + `new_patients_first_visit`; +
`reactivated_patients`; − `patients_lost`; residual row `status_changes` = end − (start + new + reactivated − lost)
(flag changes; measured only from DATA-44, labelled); end = `active_patients` as of the period end; plus
`net_patient_growth_pct`, `attrition_rate_pct` (trailing 12 months), `at_risk_patients`, `lapsed_patients`. The identity
is the MET-16 test. Cohort: NEW metric `cohort_retention_pct` (05 §5.7) with `months_after` N ∈ {6, 12, 18, 24}: cohort
patients with a visit in (first visit + N − 6 months, first visit + N months] ÷ cohort; a cell whose window has not
closed is blank and `is_provisional`. `by_member`: `active_patients`, `at_risk_patients`, `lapsed_patients`,
`patients_lost`, `reactivated_patients`, `attrition_rate_pct`, `patient_retention_12m_pct` per office or provider.

```
lv AS (SELECT patient_id, visit_date, lead(visit_date) OVER (PARTITION BY patient_id ORDER BY visit_date) AS next_visit FROM rpt_visits)
-- lost in a period: visits L with L + W inside the period and next_visit IS NULL OR next_visit > L + W
-- reactivated in a period: visits with visit_date in the period and the previous visit more than W before
SELECT period, count(*) FILTER (lost), count(*) FILTER (reactivated), ... FROM lv JOIN rpt_dates ...
```

| Era | What works |
|---|---|
| Migrated history | Every column from visit history (H). k14: skipped migrated charges make some patients look lost or new; k9: the archive policy moves first-visit dates |
| Waits for | DATA-44 (inactivation date and reason: losses by status change, the residual row); DATA-48 (P4 summary table for speed) |

Unknowable: why a patient left (moved, deceased, dissatisfied) before DATA-44 `inactive_reason`.

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `period_label` | Period | text | `aggregate` | label |
| `active_start` | Active at start | integer | `aggregate` | none (builder: first period's value; non-additive) |
| `new_patients` | New | integer | `aggregate` | sum |
| `reactivated_patients` | Reactivated | integer | `aggregate` | sum |
| `patients_lost` | Lost | integer | `aggregate` | sum |
| `status_changes` | Status changes (residual) | integer | `aggregate` | sum |
| `active_end` | Active at end | integer | `aggregate` | none (builder: last period's value) |
| `net_patient_growth_pct` | Net growth | percent | `aggregate` | none (builder: (end − start) ÷ start over the range) |
| `attrition_rate_pct` | Attrition (12 months) | percent | `aggregate` | none (builder: as of the range end) |
| `at_risk_patients`, `lapsed_patients` | At risk, lapsed | integer | `aggregate` | none (builder: as of the range end) |

Format `cohort`: shape `matrix`, rows cohort, columns N (6, 12, 18, 24), value `cohort_retention_pct`, with cohort size.
Detail (`phi_identified`): lost patients: last visit, last provider, office, months since, account balance flag, next
appointment (none). Summary cards: `active_patients` (end), `net_patient_growth_pct`, `attrition_rate_pct`,
`patients_lost`. `reconciles_with`: `active_patients`, `new_patients_first_visit`, `reactivated_patients`,
`patients_lost`, `attrition_rate_pct`, `net_patient_growth_pct`.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Bridge bars | Gained above the axis (new, reactivated), lost below, end-of-period line |
| Cohort heatmap | Cohort x months after, retention %; retention curves per cohort year |

| Click | Target |
|---|---|
| Lost, at risk, lapsed | `worklists.reactivation` (`months_since_last_visit_band`, `{std}`) |
| New | `lists.patient_list_new_patient` |
| Active | `lists.patient_list` (`patient_status = active`) |
| Cohort cell | `kind = rows` (cohort patients not retained at N) |

### Actions

Detail: bulk `send_sms` / `send_email`, `letters`, `postcards` (reactivation campaign; `no_correspondence`,
`no_auto_sms` excluded with counts), `create_task`, `export_selection`. Quarterly schedule "Trailing 12 months by
office".

### Open questions

- Windowed retention (a visit in the 6 months ending at N) or cumulative (any return by N): 05 owns the choice; the
  windowed reading is proposed because cumulative retention never decays.
- Exclude one-visit emergency patients from cohorts? Proposed as a 05 setting, default include.
- `visit_office` counts a patient seen at two offices in both; the organisation total is deduplicated (05 §5.7).

## Patient and family value - `analytics.patient_value`

operations - P4 - L - `reports_monthly_reports_screen_view_only` - background - READY

### Purpose

Owners, DSO finance and marketing (quarterly, annually) learn what a patient and a guarantor account (family) are worth
per year and over their lifetime, by first-visit cohort, source, payer type and office, and which accounts are the most
valuable. Decisions: the ceiling for acquisition cost per source, which payer mix to pursue, retention priority for top
accounts, the dollar value of the reactivation and new-patient targets.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `referral.referral_production_list` (production of referred patients by source) | Value per patient and per account, annual and lifetime, production and collections side by side, by cohort, payer type and office; a ranked top-accounts list |

Called for by: KPI §3.7 PAT-09, PAT-10; DSO §14.4 (scorecard rows by referral source and payer); 06 §2.11 "Value" (P4
tile, which drills to `daily.production_report` today).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Bound by `office_attribution` |
| `office_attribution` | `enum` | `home_office` | NEW in 04: `home_office` (patient or account home office) or `transaction_office` (office of service / of payment) |
| `report_date` | `date` (`as_of`) | `today` | End of every value window |
| `compare_to` | `enum` | `previous_year` | Same values as of a year earlier |
| `provider_ids` | `entity_multi` | `all` | Last-visit provider; restricted callers are forced (PD-11) |
| `carrier_ids` | `entity_multi` | `all` | Primary dental carrier today (k12) |
| `report_format` | `enum` | `summary` | `summary`, `top_accounts`, `detail` |
| `group_by` | `enum` | `cohort_year` | `cohort_year` (first visit), `source_category`, `payer_type`, `office`, `age_band` |
| `sort_by`, `page_break_by`, `output_format` | as filter card 3.9 | | |
| `value_unit` | `enum` | `patient` | NEW (04): `patient` or `account` (guarantor account, current membership) |
| `value_window` | `enum` | `trailing_12_months` | NEW (04): `trailing_12_months` or `lifetime` |
| `top_n` | `integer` | 50 | NEW (04), 10-500; format `top_accounts` |

### Data

| Dataset | Columns used |
|---|---|
| `rpt_charges`, `rpt_adjustments` | production metric P (organisation basis) by `patient_id`, `account_id`, `service_date` |
| `rpt_payments` | `patient_id`, `account_id`, `amount`, `counts_as_collection`, `transaction_date` (collections on the payment row) |
| `rpt_payment_allocations` | after DATA-26: collections allocated to the patient's charges (`allocation_target = 'production'`) |
| `rpt_patient_activity` | `first_visit_date`, `last_visit_date`, `visit_days`, `next_appointment_date` |
| `rpt_patient_dim`, `rpt_account_dim` | `home_office_id`, `dob`, `account_id`; `member_count`, `active_member_count`, guarantor names, `home_office_id` |
| `rpt_referral_facts` | `inbound_source.source_category` |
| `rpt_insurance_coverage` | `payer_type` (dimension NEW, as in `analytics.new_patient_acquisition`) |
| P4 | `rpt_patient_activity_summary` (DATA-48) for lifetime sums |

Measures: `patient_value_annual` (05: P of the 12 months ending `report_date` ÷ `active_patients`); NEW (05 §5.7)
`collections_per_active_patient` (net collections of the same window ÷ active patients),
`patient_lifetime_production_avg` and `patient_lifetime_collections_avg` (since first visit ÷ patients of the group),
`account_value_annual` (P of the account's current members ÷ active accounts), `visits_per_patient_year`,
`tenure_months_avg`. A lifetime-value formula (PAT-10) is not computed: its inputs are shown, not multiplied
(assumption-sensitive). Collections per patient use the patient on the payment row; the allocated reading is a column
from DATA-26 and labelled "allocation derived" before it.

```
v AS (SELECT patient_id, sum(<P>) FILTER (WHERE service_date > :report_date - interval '12 months') AS p12, sum(<P>) AS plife
      FROM rpt_charges WHERE service_date <= :report_date GROUP BY patient_id),
k AS (SELECT patient_id, -sum(amount) FILTER (WHERE counts_as_collection AND transaction_date > :report_date - interval '12 months') AS c12 ... FROM rpt_payments GROUP BY patient_id)
SELECT <group>, count(*) FILTER (WHERE <ACTIVE as of :report_date>), sum(p12), ratio(sum(p12), count active) ... FROM rpt_patient_activity pa JOIN v ... JOIN k ...
```

| Era | What works |
|---|---|
| Migrated history | Production and payment-row collections (H) with k14 (incomplete ledger: lifetime too low for migrated patients, printed with the measured gap), k9 (archived charges excluded by policy shorten the lifetime), k11, k15, k16 on payments |
| Both eras | Account value uses current membership (data card 5.3): a family's history before a guarantor change follows the patients, not the account as it was |
| Waits for | DATA-26 (allocated collections per patient), DATA-48 (summary table; until then the run is background and capped by the engine limits), SCHEMA(33) for payer type on the service date |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `member_label` | Cohort / source / payer type / office | text | `aggregate` | label |
| `patients` | Patients (or accounts) | integer | `aggregate` | sum |
| `active_patients` | Active | integer | `aggregate` | sum |
| `production_window` | Production (window) | money | `financial_practice` | sum |
| `collections_window` | Collections (window) | money | `financial_practice` | sum |
| `patient_value_annual` | Annual value (production) | money | `financial_practice` | ratio of sums |
| `collections_per_active_patient` | Annual value (collections) | money | `financial_practice` | ratio of sums |
| `patient_lifetime_production_avg` | Lifetime production (avg) | money | `financial_practice` | ratio of sums |
| `patient_lifetime_collections_avg` | Lifetime collections (avg) | money | `financial_practice` | ratio of sums |
| `visits_per_patient_year` | Visits a year | decimal | `aggregate` | ratio of sums |
| `tenure_months_avg` | Tenure (months) | decimal | `aggregate` | weighted_avg (patients) |

`top_accounts` (`phi_identified`, `financial_patient`): rank, account number, responsible party, home office, members,
active members, production and collections of the window, lifetime production and collections, current balance, next
appointment of any member, source of the first member. `detail`: the same per patient. Summary cards:
`patient_value_annual`, `collections_per_active_patient`, `patient_lifetime_production_avg`. `reconciles_with`:
`patient_value_annual`, `active_patients`.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Bars | Annual value by cohort year, production and collections side by side |
| Ranked bars | Top accounts by window production |

| Click | Target |
|---|---|
| Production of a member | `daily.production_report` (`{std}`, `date_basis = service_date`, window dates) |
| Collections of a member | `daily.collection_report` (window dates) |
| Account row | `ledger.ledger_report` (`report_type = account_ledger`, `account_id`) |
| Patient row | Patient record |

### Actions

`export_selection` and `create_task` on top accounts and detail. No outreach actions (a value ranking is not a campaign
list). Quarterly schedule "Trailing 12 months by cohort year" to owners.

### Open questions

- Value basis: production (default, matches 05) or collections; both are shown, the headline follows 05.
- Should insurance payments count in a patient's collections value? Yes (patient row), but the split is shown.
- Top accounts print patient identities to financial roles; confirm the class combination with 08.

## Provider scorecard - `analytics.provider_scorecard`

operations - P4 - L - `analytics_provider_scorecards_view` - interactive (background for 12 months x all providers) - READY

### Purpose

Owners, clinical directors and regional managers hold the monthly one-to-one with each doctor and hygienist from one
sheet: the provider's values for the doctor or hygienist metric set, with the previous period, last year, the office
value, peer median and top quartile, the goal and the band. Providers open their own sheet (self-restricted). Decisions:
the two or three coaching areas of the month, goal changes. It is not a pay statement (`management.provider_pay_basis`).

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `my_reports.production_report`, `monthly.income_allocation` (one measure, one provider) | The whole metric set of 05 §5.8 per provider, comparators (office, peers, goal), bands, availability per cell, a printable review sheet per provider |

Called for by: CT §6 I-7, §5 TS-10, D-12; KPI §3.8; 06 §3.4 (scorecard v2), §2.9 "Hygienist scorecard" (drills to
`dashboards.provider` today).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Each metric's own office attribution (05) |
| `date_range` | `date_range` | `last_month` | Each metric's own basis, printed per row |
| `compare_to` | `enum` | `previous_year` | `previous_period`, `previous_year`, `goal` |
| `provider_ids` | `entity_multi` | `all` | Forced to `current_user_report_provider` under PD-11 (`provider_restriction = self_unless_privileged`) |
| `report_format` | `enum` | `matrix` | `matrix` (providers x metrics), `review_sheet` (one page per provider) |
| `page_break_by` | `enum` | `provider` on `review_sheet` | `layout` |
| `sort_by`, `output_format` | as filter card 3.9 | | |
| `scorecard_set` | `enum` | `doctor` | NEW (04): `doctor`, `hygienist` (05 §5.8 sets); the team-member set is `user_activity` and is not offered here |
| `metric_keys` | `entity_multi` | the whole set | NEW (04): subset of the set; the engine requests at most 12 metrics per call (06 §3.4) |
| `peer_basis` | `enum` | `same_production_group` | NEW (04): peers = providers of the same `production_group` in the caller's readable offices; `same_office` |

### Data

Values come from the metric registry (05), one request per metric batch, with `provider_id` as the member dimension; the
datasets are those of each metric (`rpt_charges`, `rpt_visits`, `rpt_provider_visits`, `rpt_appointment_facts`,
`rpt_treatment_item_facts`, `rpt_payment_allocations`, `rpt_provider_calendar_days()`, `rpt_time_clock` and
`user_time_clock_config` for the wage ratio). Goals: `provider_production_goals` (DATA-24, 05 §8). Closed months read
`rpt_metric_values` (DATA-30); peers and roll-ups come from ENG-51 / ENG-50 on DATA-47. The builder is a
`python_builder` over the metric service (02 §4.2 whitelist: NEW entry requested). Per cell: value, numerator /
denominator (tooltip), comparison value, office value (ratio of sums), peer median and top quartile (normalised metrics
only, members below `rate_min_denominator` unranked), goal and % of goal (`production_vs_goal_pct` rows), band from
`metric_targets`, availability (`D(n)` cells get no band and no rank; `A` cells in migrated-only months are
`not_available`).

| Era | What works |
|---|---|
| Migrated history | Production, visits, hygiene and clinical rows (H); net rows degraded (k1) |
| App era | Case acceptance, at-visit reappointment, notice-based rates, `provider_utilization_pct` (k10) |
| Waits for | ENG-51 (peer median and quartile), DASH-38 (scorecard v2), DATA-24 goals, DATA-26 (`provider_income`), class `payroll_wage` for `hygienist_production_to_wage_ratio` |

Visibility (08 PR-8, SC-1): a provider-restricted caller receives the own row only; the office value is returned only
when at least `min_peer_group` (5) other providers contribute, peer median / quartile only from
`min_peer_group_quantiles` (10); below that the cell is `suppressed`; minimum and maximum of others are never returned.

### Output

`matrix`: rows provider (`provider_comp`), one column per metric (value with band), footer rows: office value (ratio of
sums, labelled), peer median and top quartile (v2), residual `Unassigned` row (never ranked).

`review_sheet` columns, one row per metric of the set:

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `metric_label` | Measure | text | `aggregate` | label |
| `value` | This period | per metric format | `provider_comp` | none (metric value) |
| `compare_value` | Comparison | per metric | `provider_comp` | none |
| `change` | Change | per metric | `provider_comp` | none (computed `difference`) |
| `office_value` | Office | per metric | `provider_comp` | none; suppressed under SC-1 |
| `peer_median`, `peer_top_quartile` | Peers | per metric | `provider_comp` | none; v2, suppressed under SC-1 |
| `goal`, `goal_pct` | Goal, % of goal | money, percent | `provider_comp` | none |
| `band` | Band | enum | `aggregate` | none |
| `trend_12m` | 12 months | text (sparkline series) | `provider_comp` | none |
| `availability_note` | Note | text | `aggregate` | none |

Summary cards (review sheet): `net_production`, `production_vs_goal_pct`, `production_per_hour` (doctor) or
`hygiene_production_per_hour` (hygienist), `case_acceptance_pct` or `hygiene_reappointment_pct`. `reconciles_with`: each
cell equals the metric for the same provider and parameters (the provider dashboard tile).

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Scorecard | Band colour and icon per cell, trend arrow, rank among ranked members (v2) |
| Sparklines | 12-month trend per metric on the review sheet |

| Click | Target |
|---|---|
| Cell | The metric's drill target of 06 §2.0.4 with `provider_ids` = the row's provider and `{std}` |
| Row | `dashboards.provider` for the provider |

### Actions

No row or bulk actions. Schedules: "Monthly review sheet" per provider; delivery follows the recipient's rights (a
provider receives only the own sheet, 08 §8). No alerts (bands are shown, alerts are metric conditions elsewhere).

### Open questions

- Hygiene credit (hygienist, dentist or both) changes the hygienist rows: `hygiene_credit_policy` is printed per sheet.
- Associates working in several offices: peers across offices or within the office (`peer_basis`)? Default across.
- Free-text coaching notes on the sheet would need storage that does not exist; out of scope.

## Lab case performance - `appointment.lab_case_performance`

operations - P3 - M - `reports_appointment_reports_screen_view_only` - interactive - APP

### Purpose

Office managers and doctors (quarterly lab review, monthly per provider) compare labs on turnaround, lateness, cases not
back before the seating appointment and cost per case, and see lab cost as a share of each provider's production.
Decisions: which lab to use for which work, renegotiate due-date terms, reduce reschedules caused by late cases.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `appointment.lab_cost_report` (cost per case for a date basis); `appointment.lab_report` (case list) | Turnaround, late share, cases missing for the visit, cost per case, lab cost % by provider, lab x provider comparison and trend |

`worklists.lab_cases_due` is the daily queue of cases not yet back. Called for by: KPI §3.9 (lab cost about 8 % of
collections, `DE-OH`); 06 §2.0.4 lab metrics (`lab_cost_amount`, `lab_cost_pct`, `lab_turnaround_days`).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Appointment office |
| `date_range` | `date_range` | `last_month` | On `date_basis` |
| `date_basis` | `enum` | `appointment_date` | Shared values `appointment_date`, `lab_sent_date`, `lab_due_date`, `lab_received_date` (the legacy Lab Cost Report REPORT TYPE) |
| `compare_to` | `enum` | `previous_year` | |
| `time_grain` | `enum` | `month` | |
| `provider_ids` | `entity_multi` | `all` | `provider_role = appointment` |
| `lab_ids` | `entity_multi` | `all` | Shared |
| `report_format` | `enum` | `summary` | `summary`, `detail` |
| `group_by` | `enum` | `lab` | `lab`, `provider`, `office`, `month` |
| `sort_by`, `page_break_by`, `output_format` | as filter card 3.9 | | |

### Data

| Dataset | Columns used |
|---|---|
| `rpt_lab_cases` | `appointment_id`, `office_id`, `provider_id`, `patient_id`, `appointment_date`, `lab_vendor_id`, `lab_dds`, `lab_cost`, `lab_short_notice`, `lab_sent_on`, `lab_due_on`, `lab_received_on`, `lab_status`, `turnaround_days`, `days_late`, `is_missing_for_visit` |
| `labs` (passthrough catalog) | lab name |
| production metric P | `rpt_charges` by treating provider and office of service, for `lab_cost_pct` |

Measures: `lab_cost_amount`, `lab_cost_pct` (provider and office rows only: production has no lab dimension, so lab rows
leave it blank), `lab_turnaround_days`; NEW (05 §5.9) `lab_cases` (count), `lab_late_pct` (the late share of 05:
`days_late > 0` ÷ received), `lab_missing_for_visit_pct` (`is_missing_for_visit` ÷ cases whose appointment date has
passed), `lab_cost_per_case`, `lab_cost_coverage_pct` (cases with a cost entered ÷ cases). Cases without a sent or
received date are outside turnaround and counted; a case without a due date is `late unknown`.

```
SELECT <group>, count(*) AS cases, count(*) FILTER (WHERE lab_status = 'received') AS received,
       avg(turnaround_days) FILTER (WHERE turnaround_days IS NOT NULL), count(*) FILTER (WHERE days_late > 0) AS late,
       count(*) FILTER (WHERE is_missing_for_visit AND appointment_date < <local_today>) AS missing, sum(lab_cost), count(lab_cost) ...
FROM rpt_lab_cases WHERE <date_basis column> BETWEEN :date_from AND :date_to AND <scope> GROUP BY <group>
```

Migrated history: 18 cases, 14 in the archive partition; vendor, DDS and short-notice are app-era: periods before the
first app case render "history starts on <date>". Unknowable: remakes (no field), case units.

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `member_label` | Lab / provider / office / month | text | `aggregate` (`provider_comp` by provider: block has money) | label |
| `lab_cases` | Cases | integer | `aggregate` | sum |
| `received` | Received | integer | `aggregate` | sum |
| `lab_turnaround_days` | Turnaround (days) | decimal | `aggregate` | weighted_avg by received cases |
| `lab_late_pct` | Late | percent | `aggregate` | ratio of sums |
| `lab_missing_for_visit_pct` | Not back for the visit | percent | `aggregate` | ratio of sums |
| `lab_cost_amount` | Lab cost | money | `financial_practice` | sum |
| `lab_cost_per_case` | Per case | money | `financial_practice` | ratio of sums (cases with a cost) |
| `lab_cost_pct` | Lab cost % of production | percent | `financial_practice` | ratio of sums (blank on lab rows) |
| `lab_cost_coverage_pct` | Cost entered | percent | `aggregate` | ratio of sums |

Detail (`phi_identified`; `clinical` for lab instructions, not selected): appointment date, patient, provider, lab, DDS,
sent, due, received, turnaround, days late, missing flag, cost, short notice. Summary cards: `lab_turnaround_days`,
`lab_late_pct`, `lab_missing_for_visit_pct`, `lab_cost_pct`. `reconciles_with`: `lab_cost_amount`, `lab_cost_pct`,
`lab_turnaround_days`.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Bars | Turnaround by lab with late share as a dot |
| Trend | Lab cost % by month, PY dashed |

| Click | Target |
|---|---|
| Cases, turnaround, late | `appointment.lab_report` (`date_basis`, `lab_ids`, `{std}`) |
| Cost | `appointment.lab_cost_report` (`date_basis`, `lab_ids`) |
| Not back for the visit | `kind = rows`; open cases with a future appointment: `worklists.lab_cases_due` |
| Detail row | Appointment in the Scheduler |

### Actions

Row action: open the appointment. No bulk actions (labs are contacted outside the system). Quarterly schedule "Last
quarter by lab".

### Open questions

- Lab cost is typed by staff and often blank: `lab_cost_coverage_pct` makes the gap visible; should the lab cost be
  required when a case is received?
- Multi-unit cases are one row: cost per case is not cost per unit.
- Remakes are not recorded (header: candidates left out).

## Ortho starts, debonds and contract health - `ortho.ortho_contract_health`

operations - P3 - L - `reports_ortho_reports_view_only` - interactive (background above 13 months) - APP

### Purpose

Orthodontists, ortho coordinators and office managers (monthly) see whether the active base grows (starts per debond),
how exams convert, which patients run past their planned end or have no next appointment, how much contract money is
still to bill, which instalments are due and not posted, and which contracts are delinquent, by month and orthodontist.
Decisions: consult follow-up, chasing patients lost in treatment, running the posting sweep, collection calls.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `ortho.patients_by_ortho_status_with_time_in_treatment` (status roster); `ortho.ortho_report`, `ortho.ortho_compliance_report`, `ortho.missing_ortho_visits` (lists) | Monthly flow (exams, starts, debonds, conversion), active base as of each month end, compliance shares, contract money (remaining to bill, unposted, delinquent) by orthodontist |

Called for by: KPI §3.11 ORT-01 to ORT-13; 06 §2.13 (all four tiles drill to the legacy lists today).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Contract office (`rpt_ortho_contracts.office_id`) |
| `date_range` | `date_range` | `trailing_12_months` | Start and debond dates; exams on service date |
| `report_date` | `date` (`as_of`) | `today` | Contract states of format `contracts`; month-end states for `monthly` |
| `compare_to` | `enum` | `previous_year` | |
| `time_grain` | `enum` | `month` | |
| `provider_ids` | `entity_multi` | `all` | Orthodontist = contract provider; exams: treating provider |
| `ortho_status_codes` | `entity_multi` | `all` | Shared; G(42) |
| `report_format` | `enum` | `monthly` | `monthly` (metric x month), `by_orthodontist`, `contracts` (detail) |
| `sort_by`, `page_break_by`, `output_format` | as filter card 3.9 | | |

Settings echoed: `ortho_visit_interval_weeks`, `payment_plan_grace_days`.

### Data

| Dataset | Columns used |
|---|---|
| `rpt_ortho_contracts` | `ortho_plan_id`, `patient_id`, `office_id`, `provider_id`, `banding_date`, `treat_start_date`, `treat_end_date`, `months_in_treatment`, `is_past_planned_end`, `total_ortho_amt`, `unbilled_amount`, `overdue_count`, `next_due_date`, `weeks_since_last_visit`, `ortho_status_code`, `debond_date` |
| `rpt_contract_installments` | `contract_kind = 'ortho'`, `plan_side`, `due_date`, `periodic_amount`, `is_billed`, `charge_id` |
| `rpt_charges` + `rpt_code_in_group()` | `ortho_exams` (`g:ortho_exam`), ortho production; posting date of instalment charges (`service_date`) |
| `rpt_patient_activity` | `next_appointment_date` |
| `rpt_ar_open_items()` | open debits of contract charges (delinquency proxy) |

Monthly rows per month end M: `ortho_exams`, `ortho_starts`, `ortho_conversion_pct`, `ortho_avg_contract_amount`,
`ortho_debonds` (G(42)), starts per debond (`ortho_starts ÷ ortho_debonds`), `ortho_active_patients` as of M (from start
and debond dates), `ortho_patients_beyond_ecd_pct` as of M (`treat_end_date < M`), `ortho_remaining_to_bill_amount` as of
M (instalments not posted by M: `NOT is_billed OR charge service_date > M`), `ortho_installments_unposted_amount` and NEW
(05 §5.11) `ortho_delinquent_contracts` as of M on the shared contract definitions of
`management.payment_plan_portfolio` (unposted = due on or before M and not posted by M; delinquent = a posted
patient-side instalment due on or before M − `payment_plan_grace_days` with an open amount at M; proxy: no
payment-to-instalment link exists, data card 2.25; labelled "proxy"), so the ortho rows of that report equal these
values for the same date. Current-state only, shown in the `report_date` column, never for past months (k12):
`ortho_active_no_appointment_pct`, `ortho_missing_visit_patients`.

```
m AS (SELECT DISTINCT (month_start + interval '1 month' - interval '1 day')::date AS month_end FROM rpt_dates WHERE date_key BETWEEN :date_from AND :date_to),
SELECT m.month_end,
       count(*) FILTER (WHERE coalesce(oc.banding_date, oc.treat_start_date) <= m.month_end AND (oc.debond_date IS NULL OR oc.debond_date > m.month_end)) AS active,
       sum(ci.periodic_amount) FILTER (WHERE ci.due_date <= m.month_end AND (NOT ci.is_billed OR ch.service_date > m.month_end)) AS unposted ...
FROM m CROSS JOIN rpt_ortho_contracts oc LEFT JOIN rpt_contract_installments ci USING (tenant_id, ortho_plan_id) LEFT JOIN rpt_charges ch ON ch.charge_id = ci.charge_id
```

| Era | What works |
|---|---|
| Migrated history | Ortho exams from charges only (H); every contract measure has no history (no contract was migrated): months before the first app contract render "history starts on <date>" |
| App era | Starts, conversion, active base, beyond planned end, money columns |
| Waits for | DATA-42 (debond date, status, visit log, SCHEMA(42)), DATA-37 (contract id on the charge, the contract credit; until then a plan set up over charged treatment double-debits A/R and inflates delinquency, data card 2.25 #33, #34) |

`rpt_ortho_contracts` lists active contracts only until `contract_status` exists (05 §5.11): debonded contracts may be
missing from past months.

### Output

`monthly`: shape `matrix`, rows metric, columns month (+ `report_date` column for current-state rows), with PY comparison.

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `metric_label` | Measure | text | `aggregate` | label |
| `month_value` | (month) | per metric | `financial_practice` for money, `aggregate` otherwise (`provider_comp` by orthodontist) | flows: sum over months; stocks: none (builder: last month of the range); rates: ratio of components |
| `compare_value` | PY | per metric | as above | as above |

`by_orthodontist`: rows provider, columns starts, debonds, starts per debond, conversion, active, beyond planned end %,
no next appointment %, remaining to bill, unposted, delinquent contracts. `contracts` (`phi_identified`,
`financial_patient`): patient, orthodontist, start, planned end, months in treatment, beyond end, last visit, weeks since,
next appointment, total, billed, remaining, unposted due, overdue amount, card on file, status. Summary cards:
`ortho_starts`, `ortho_active_patients`, `ortho_remaining_to_bill_amount`, `ortho_installments_unposted_amount`.
`reconciles_with`: the 05 §5.11 keys for the range end.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Combo | Starts and debonds as bars by month, active base as a line |
| KPI group | Beyond planned end, no next appointment, unposted amount |

| Click | Target |
|---|---|
| Starts, active base | `ortho.patients_by_ortho_status_with_time_in_treatment` (`ortho_start_date` range, `provider_ids`) |
| Exams | `daily.production_report` (`procedure_codes` = `ortho_exam` codes) |
| Missing visits, no next appointment, beyond end | `ortho.missing_ortho_visits`; `ortho.ortho_compliance_report` |
| Unposted instalments | `management.payment_plan_charges` (`plan_type = ortho`) |
| Delinquent contracts | `worklists.payment_plan_overdue` |
| Contract row | Patient ortho screen (route key owned by 07) |

### Actions

`contracts`: bulk `send_sms` (appointment invitation to patients without a next appointment; consent required),
`letters`, `create_task`, `export_selection`. Monthly schedule; the unposted amount suits a `skip_if_empty` weekly
delivery to the ortho coordinator until the posting sweep is scheduled.

### Open questions

- Start = banding date or contract signature date (`coalesce(banding_date, treat_start_date)` follows 05).
- Phase 1 / phase 2 and observation flows need statuses (DATA-42) to separate starts by type.
- The delinquency proxy depends on FIFO allocation of family payments; confirm the rule with the ortho billing lead.

## Revenue opportunity - `analytics.revenue_opportunity`

operations - P4 - M - category rights (opens with any one category family: `reports_treatment_plan_reports_screen_view_only`, `reports_recall_reports_screen_view_only`, `reports_appointment_reports_screen_view_only`, `reports_insurance_reports_screen_view_only`, `reports_monthly_reports_screen_view_only`) - interactive - READY

### Purpose

Office managers and owners (weekly) see the recoverable revenue of the practice in one ranked list: unscheduled
treatment, recall due and not booked, broken appointments not rebooked, unbilled work, outstanding claims and patient
balances past due, each with its count, value and an expected recovery at a what-if rate. Decision: which queue the team
works first this week, and how much the effort is worth. Each row opens its worklist.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| none (each dashboard shows its counter separately) | One ranked view across the six opportunity pools, comparable values, what-if recovery, split into production to book and cash to collect, by office |

Called for by: CT §6 I-12 ("Revenue Finder", Practice by Numbers Revenue IQ, Eaglesoft Revenue Opportunities); KPI §8
(leading indicators). Challenge recorded: 06 §12.5 lists idea 12 (revenue what-if) as "not in this plan"; the header
adopted this report, so 06 should update that row.

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Each category keeps its worklist's attribution (home office for recall and A/R, item office, appointment office, claim office) |
| `report_date` | `date` (`as_of`) | `today` | A past date is served only for categories with snapshots (`rpt_metric_values`, DATA-30); others are `not_available` (k12) |
| `compare_to` | `enum` | `none` | `previous_period` from snapshots (P4) |
| `report_format` | `enum` | `summary` | `summary` (category rows), `by_office` (office x category) |
| `output_format` | as filter card 3.9 | `pdf` | |
| `opportunity_categories` | `enum_multi` | all the caller may see | NEW (04): `unscheduled_treatment`, `recall_due`, `broken_appointments`, `unbilled`, `outstanding_claims`, `patient_ar_past_due` |
| `broken_window_days` | `integer` | 90 | NEW (04): look-back of broken appointments |
| `what_if_rate_<category>` | `integer` (percent), one per category | organisation setting | NEW (04); defaults are a NEW 05 §3 setting `revenue_opportunity_default_rates` (product decision; proposed 20, 30, 40, 80, 85, 50) |

### Data

| Category | Kind | Value (metric key, 05) | Items | Dataset | Worklist |
|---|---|---|---|---|---|
| `unscheduled_treatment` | production to book | `unscheduled_treatment_amount` | `unscheduled_treatment_patients` | `rpt_treatment_item_facts` | `worklists.unscheduled_treatment` |
| `recall_due` | production to book | NEW `recall_opportunity_amount` = `recall_due_unscheduled_patients` x `hygiene_production_per_visit` of the trailing 12 months (office) | `recall_due_unscheduled_patients` | `rpt_recall_due()`, `rpt_charges` | `worklists.recall_due` |
| `broken_appointments` | production to book | `broken_appointment_value_lost` over `broken_window_days` | unrecovered broken appointments | `rpt_appointment_facts` | `worklists.broken_appointments` |
| `unbilled` | cash to claim | `unbilled_production_amount` + `procedures_on_hold_amount` + NEW `claims_unsent_amount` | lines and unsent claims | `rpt_unclaimed_charge_tiers`, `rpt_charges`, `rpt_claim_facts` | `worklists.unbilled_procedures` |
| `outstanding_claims` | cash to collect | `outstanding_claims_amount` | `outstanding_claims_count` | `rpt_claim_facts` | `worklists.outstanding_claims` |
| `patient_ar_past_due` | cash to collect | `patient_ar_past_due_amount` | accounts with a past-due patient balance | `rpt_ar_open_items()` | `worklists.patient_ar` |

Expected recovery = value x what-if rate. The two kinds are never added together: production to book is chair work not
yet done, cash to collect is money owed for work done. Inside a kind the pools are disjoint by construction for cash
(unbilled lines have no claim; patient A/R excludes the insurance portion). Production pools can share a patient
(recall due and unscheduled treatment); a broken appointment's lines that belong to a plan item now unscheduled are
counted in `unscheduled_treatment` only. The column `overlap_patients` gives the patients counted in more than one
production pool, and the kind subtotal is labelled "may overlap".

```
SELECT 'unscheduled_treatment' AS category, 'production' AS kind, <metric value>, <item count> FROM <metric service, as_of>
UNION ALL ... -- one branch per permitted category; a category whose family the caller lacks returns state 'restricted'
```

| Era | What works |
|---|---|
| Migrated history | Recall (derived intervals), outstanding claims (k5, `outstanding_quality = 'unknown'` rows excluded and counted), patient A/R past due (derived allocation) |
| App era | Unscheduled treatment (migrated plans excluded), broken value (k7), unbilled (history N(10)) |
| Waits for | DATA-26 / DATA-27 (organisation-wide A/R), DATA-30 (past dates), DATA-47 roll-ups (multi-office speed); the worklists themselves (P3) |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `category_label` | Opportunity | text | `aggregate` | label |
| `kind` | Kind | enum | `aggregate` | label (group key; subtotal per kind, no grand total) |
| `items` | Items | integer | `aggregate` | sum within kind |
| `patients` | Patients / accounts | integer | `aggregate` | none (pools overlap) |
| `value` | Value | money | `financial_practice` | sum within kind |
| `avg_per_item` | Per item | money | `financial_practice` | ratio of sums |
| `what_if_rate` | What-if rate | percent | `aggregate` | none |
| `expected_recovery` | Expected | money | `financial_practice` | sum within kind |
| `share_of_kind` | Share | percent | `financial_practice` | `share_of_parent` |
| `overlap_patients` | In other pools | integer | `aggregate` | none |
| `availability_note` | Note | text | `aggregate` | none |

`by_office`: shape `matrix`, rows office, columns category, value `value`. Summary cards: production-to-book value,
cash-to-collect value, expected recovery of each kind. `reconciles_with`: each `value` equals its metric for the same
scope and date (the dashboard counters).

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Ranked bars | Value per category, expected recovery overlaid, one colour per kind |

| Click | Target |
|---|---|
| Category row | Its worklist with the scope and the category's filters (`broken_window_days` → `date_range`); before a worklist ships, its print counterpart (06 §2.0.4 fall-back) |
| `by_office` cell | Same worklist with `office_ids` = the clicked office |

### Actions

None: follow-up state lives in the worklists. Weekly schedule (Monday) to office managers; suited to the digest of 06 §7.

### Open questions

- Default what-if rates are a product decision (05 §3 setting).
- Reactivation (`unscheduled_active_patients` x `patient_value_annual`) and credit balances as further categories?
  Proposed: reactivation as an optional category from P4, off by default; credit balances are not revenue.
- The report needs an "any of these rights" rule: NEW engine field (02 §3.1 `right_codes_any[]`), checked with 08.

## Domain: Multi-office, executive, marketing, staff and control

## Office comparison and same-store growth - `analytics.office_comparison`

enterprise - P4 - L - `analytics_office_comparison_view` (+ `office_scope_view_all_offices` for `all`) - interactive on roll-ups (background on live views above 13 months or the engine limits) - READY

### Purpose

Owner, executive and regional manager, monthly (5th business day) and quarterly: which offices are off track, on which
metric, and by how much against the organisation, the median office and the top quartile. Decisions: where a regional
manager spends the next visit, which office's practice to copy, whether growth is organic (same-store) or bought (new
offices). The same-store format is the number an owner reports to a board or lender, with every excluded office named.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `monthly.executive_summary` run office by office | One run over all readable offices; office-group subtotal rows; ranks and rank movement on normalised metrics; median, top-quartile and average-office comparators; per-working-day values; a same-store set with named exclusions and three growth aggregates; a months x offices trend for one metric |

Called for by: DSO §14.2 (three-view convention, drill region > office), §14.3 (same-store, three aggregates), §14.4
(top / bottom tails, quartile bands); KPI §3.13 DSO-01..DSO-05; CT I-22; 06 §2.14 "Office scorecard", "Same-store growth"
(drill target "office scorecard"), §5.1-§5.4.

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `all` | Readable offices only (06 §5.4); without `office_scope_view_all_offices` the run compares the assigned offices and the criteria echo says so. At least 2 offices, else 422 `comparison_needs_offices` |
| `date_range` | `date_range` | `last_month` | Each metric keeps its own basis (production: service date); printed per metric in the criteria echo |
| `compare_to` | `enum` | `previous_year` | `previous_period`, `previous_year`; forced to `previous_year` in `same_store` |
| `time_grain` | `enum` | `month` | Used by format `trend` only (`month`, `quarter`) |
| `production_group` | `enum` | `all` | Restricts production-family metrics to doctor, hygiene or other |
| `report_format` | `enum` | `summary` | `summary` (scorecard), `same_store`, `trend` |
| `group_by` | `enum` | `office_group` | `office_group` (subtotal rows, `No group` member), `none` |
| `sort_by`, `page_break_by`, `output_format` | filter card 3.9 | `rank`, `none`, `pdf` | `sort_by` options `rank`, `office_name`, `office_group` |
| `metric_pack` | `enum` | `core` | NEW (04): `core`, `rcm`, `clinical`, `custom`; members below (NEW pack registry requested of 06 §2.14) |
| `metric_keys` | `enum_multi` | pack members | NEW (04); enabled when `metric_pack = custom`; options = metrics whose `dims` allow `office_id`; `max_items` 12 |
| `rank_metric_key` | `enum` | `production_per_working_day` | NEW (04); options = normalised metrics only (05 §9.3 rule 2) |
| `comparators` | `enum_multi` | `organisation`, `median_office`, `top_quartile_office` | NEW (04); add `average_office`, `office_group`, `own_trailing_12m` |
| `per_working_day` | `boolean` | `false` | NEW (04): volume metrics divided by `working_days` of each office (05 §9.3 rule 7) |

| `metric_pack` | Members (`metric_key`) |
|---|---|
| `core` | `net_production`, `production_per_working_day`, `production_vs_goal_pct`, `net_collections`, `collection_pct`, `ar_over_90_pct`, `new_patients`, `case_acceptance_pct`, `hygiene_reappointment_pct`, `no_show_rate_pct`, `provider_utilization_pct` (the 06 §2.14 scorecard plus the rank default) |
| `rcm` | `net_collection_pct`, `ar_days`, `ar_over_90_pct`, `otc_collection_pct`, `bad_debt_rate_pct`, `claim_days_to_payment`, `same_day_claim_rate_pct`, `denial_rate_pct` (proxy). `rcm_health_score` is not a pack member: it is offered only under `custom`, and then always with its five components (06 §2.7) |
| `clinical` | `hygiene_production_share_pct`, `perio_patient_pct`, `fluoride_rate_pct`, `bitewing_recare_pct`, `treatment_presented_per_exam`, `diagnostic_pct`, `case_acceptance_pct`, `production_per_operatory`, `specialty_production_share_pct` |

Settings printed, not parameters: `same_store_min_months` (13), `rate_min_denominator`, `goal_production_basis`.

### Data

| Source | Use |
|---|---|
| Metric service (ENG-32 on live datasets; ENG-50 on `rpt_daily_*` roll-ups, DATA-47) | Every value: one metric query per key with `dims = [office_id]`, a second with `[office_group_id]` and a third with none (organisation), period and `compare_to` in one transaction |
| ENG-51 overlays | Rank, rank in the comparison period, median, top quartile, average office, goal values |
| `rpt_office_dim` | `office_name`, `office_group_id`, `office_group_name`, `is_active`, `opening_date`, `active_operatory_count` |
| `rpt_office_calendar_days()` | `working_days` per office for `per_working_day` (`is_open`; `hours_source`) |
| `rpt_charges` | First production date per office when `opening_date` is empty (same-store rule) |

Calculation: group and organisation rows are recomputed by the metric service (ratio of sums, distinct counts), never
summed from office rows. Comparators are computed over the ranked offices of the run's scope only: an office below
`rate_min_denominator` on a rate is listed unranked and uncoloured; median, quartiles and dispersion need 3 ranked
offices, else `no_data`. Top quartile is the 75th (direction `up`) or 25th (direction `down`) percentile. Ranks use the
metric's `direction`; ties share a rank. Same-store set: active, `P > 0` in both periods, opened at least
`same_store_min_months` before `date_to` (05 §9.3 rule 5); every other office gets `exclusion_reason`.

```
v    := metric_query(:metric_keys, dims => ['office_id'], range => (:date_from, :date_to), compare => :compare_to, offices => :office_ids)
g    := metric_query(:metric_keys, dims => ['office_group_id'], ...) UNION ALL metric_query(:metric_keys, dims => [], ...)
cmp  := SELECT metric_key, percentile_cont(0.5) WITHIN GROUP (ORDER BY value) AS median_value,
               percentile_cont(CASE direction WHEN 'up' THEN 0.75 ELSE 0.25 END) WITHIN GROUP (ORDER BY value) AS top_quartile_value, avg(value)
        FROM v WHERE is_ranked GROUP BY metric_key HAVING count(*) >= 3
rank := rank() OVER (PARTITION BY metric_key ORDER BY value DESC|ASC) on v.value and on v.compare_value
ss   := SELECT od.office_id, CASE WHEN NOT od.is_active THEN 'inactive' WHEN coalesce(od.opening_date, fp.first_date) > :date_to - :same_store_min_months * interval '1 month' THEN 'opened_too_recently'
                                   WHEN p_cur <= 0 OR p_py <= 0 THEN 'no_production_in_period' END AS exclusion_reason FROM rpt_office_dim od ...
```

| Era | What works |
|---|---|
| Migrated history | Production, visits, new patients, utilisation (k10), reappointment: H. Net production = charged production until DATA-12 (k1); collection % per the `assumed` tender share (k15) |
| App era only | Goal column (DATA-24, no migrated goals), denial and claim-cycle members (DATA-25, DATA-31), allocation-based members (DATA-26) |
| Both | Office groups exist only once created (`office_groups` empty after migration); without groups `group_by = office_group` collapses to `No group` with a notice. `production_per_operatory` uses today's chair count |

Unknowable: an office's group membership in a past month (one current `office_group_id`); opening dates of migrated
offices unless entered.

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `office_group_name` | Office group | text | `aggregate` | label (hidden key `office_group_id`) |
| `office_name` | Office | text | `aggregate` | label (hidden key `office_id`) |
| `metric_label` | Metric | text | `aggregate` | label (pivot column; key `metric_key`) |
| `value` | Value | per metric (`money`, `percent`, `decimal`, `integer`) | `financial_practice` for money and money-based rates; `aggregate` otherwise | none (builder: metric service per level; not additive) |
| `compare_value` | PY / PP | as `value` | as `value` | none (builder: metric service per level) |
| `change_pct` | Change | percent | as `value` | none (computed `difference(value, compare_value)` ÷ `compare_value`; points for rates) |
| `rank` | Rank | integer | `aggregate` | none (`Unranked` when below the volume guard) |
| `rank_change` | Movement | integer | `aggregate` | none (computed `rank_prev - rank`) |
| `vs_median` | vs median | as `value` | as `value` | none (computed `difference(value, median_value)`) |
| `vs_top_quartile` | vs top quartile | as `value` | as `value` | none (computed `difference(value, top_quartile_value)`) |
| `band` | Band | enum | `aggregate` | none (from `metric_targets` (MET-21); `none` without one) |
| `working_days` | Working days | decimal | `aggregate` | sum |

Grouping: level 1 office group (subtotal = group value), level 2 office, comparator rows after the grand total
(`Organisation`, `Median office`, `Top-quartile office`, `Average office`, labelled). Summary format: `shape = matrix`, rows
office, columns `metric_key`, value columns as selected (`max_columns` 12). `same_store` format (table): `office_name`,
`is_comparable`, `exclusion_reason`, `production_current`, `production_prior`, `growth_pct`, `growth_band` (`< -10 %`,
`-10..0 %`, `0..10 %`, `> 10 %`); summary cards `same_store_growth_pct` (weighted, simple mean, trimmed mean - trimmed
only with 10 or more offices), `offices_growing_pct`, comparable count of total. `trend` format: `shape = matrix`, rows
office, columns periods, value = `rank_metric_key`. Summary cards (summary format): organisation value of
`rank_metric_key`, `metric_dispersion_cv` of it, offices in the top and bottom fifth (only with 5 or more ranked offices).
`reconciles_with`: the organisation row of each member equals its metric for the same parameters; `same_store_growth_pct`,
`offices_growing_pct`.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Ranking bars | `rank_metric_key` by office, sorted, reference lines at median and top quartile; top and bottom fifth tinted (06 §5.1 rule 7) |
| Scorecard heat | Matrix cells coloured by `band`; arrows for `rank_change` |
| Distribution | Same-store growth by `growth_band` (bars); excluded offices listed under the chart |

| Click | Target |
|---|---|
| Office row | `dashboards.main` for the office (`office_ids`, period) |
| Value cell | The metric's drill report (05 family drill, for example `daily.production_report`, `monthly.aging_report`) with `{std}` and `office_ids = [office]` |
| Group subtotal | This report with `office_scope = {office_group_id}`, `group_by = none` |
| `exclusion_reason = opened_too_recently` with blank `opening_date` | Office setup (route key owned by 07) |

### Actions

No row or bulk actions (aggregate rows). Shipped views: "Last month by office" (core), "Revenue cycle by office" (rcm),
"Same-store year to date". Schedule: monthly, 5th of the month 07:00, executives (link-only e-mail, PD-12). Suited to the
metric alert "office below the median of `rank_metric_key` for two consecutive months" (ENG-52).

### Open questions

- Regions and brands need many-to-many office groups (06 D-3); until then one grouping dimension only.
- `production_vs_goal_pct` in `core` is `no_data` for offices without goals; keep it in the pack (recommended) or move it
  to a goals pack.
- Same-store on months of different working days: offer growth per working day beside the total (proposed, not default).
- Acquired practices: their migrated history makes them comparable at once; an "acquired on" date per office would be
  NEW in 03 (no rule found, DSO §14.3).

## Cross-office patient flow - `analytics.cross_office_patient_flow`

enterprise - P4 - M - `analytics_office_comparison_view` (+ `office_scope_view_all_offices` for `all`) - interactive (background above 13 months on live views) - READY

### Purpose

Owner, executive and regional manager, quarterly: how patients move between the organisation's offices - who is seen
away from the home office, which offices serve whose patients, how much production that is, and whether internal
referrals to a sister office (specialist, second opinion, overflow) are completed there or lost. Decisions: where to
place a specialist or open hygiene days, whether home-office attribution distorts office goals and comparisons, which
referral paths between offices leak.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `lists.patients_seen` (patients seen by office; no office pairs, no home-office view) | Home office x office of service matrix of patients, visits and production; patients seen at two or more offices; the share of a home office's patients' production done elsewhere; internal referrals to sister offices and their completion there |

`analytics.office_comparison` compares offices side by side; this report shows the flows between them. Called for by:
DSO §14.2 (consolidated roll-ups across locations); KPI §3.13; 05 dimension `office_pair` and metric
`cross_office_patients` (§5.13); 06 §2.11 "Across offices" (header drill map).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `all` | Readable offices only (06 §5.4); a pair is shown when both offices are readable, otherwise the other office is `Other offices`. At least 2 offices, else 422 `comparison_needs_offices` |
| `date_range` | `date_range` | `trailing_12_months` | Visit (service) date |
| `compare_to` | `enum` | `previous_year` | |
| `report_format` | `enum` | `summary` | `summary` (per office: own and visiting patients), `pairs` (home office x office of service), `referrals` (internal referral paths), `detail` (patients seen at two or more offices) |
| `pair_measure` | `enum` NEW (04) | `patients` | format `pairs`: `patients`, `patient_visits`, `charged_production` |
| `referral_window_months` | `integer` NEW (04) | 6 | format `referrals`: an internal referral is completed when the referred code is charged at another office within the window |
| `sort_by`, `output_format` | filter card 3.9 | `office_name`, `pdf` | |

### Data

| Dataset | Columns used |
|---|---|
| `rpt_visits` | `patient_id`, `office_id`, `visit_date`, `charged_production` (office of service; the pair dimension `office_pair`) |
| `rpt_patient_dim` | `home_office_id` |
| `rpt_provider_visits`, `rpt_provider_dim` | providers seen at each office (a provider working at two offices explains a pair) |
| `rpt_treatment_item_facts` | `status_norm = 'internal_referral'`, `procedure_code`, `office_id`, `presented_date` (app era) |
| `rpt_charges` | the referred code charged later at another office (completion) |

Calculation: per office O, patients seen at O whose home office is O (own) and whose home office is another office
(visiting), with visits and charged production of each; per home office H, the share of its patients' production done at
other offices (NEW `cross_office_production_share_pct`, 05 §5.13). Pairs: home office x office of service, value
`pair_measure`. `cross_office_patients` (05) = patients with visits at two or more offices in the range, the organisation
total deduplicated. Referrals: internal referral items presented at office A in the range; completed = the item's code
charged for the patient at another office within `referral_window_months` (NEW `internal_referral_completed_pct`, 05),
with the office that completed it; not completed and an external referral (`referred_out`) for the same code =
`referred_outside`.

```
v     := SELECT v.patient_id, v.office_id AS service_office, p.home_office_id, count(*) AS visits, sum(v.charged_production) AS prod
         FROM rpt_visits v JOIN rpt_patient_dim p USING (tenant_id, patient_id)
         WHERE v.visit_date BETWEEN :date_from AND :date_to AND v.office_id = ANY(:office_ids) GROUP BY 1, 2, 3
pairs := SELECT home_office_id, service_office, count(DISTINCT patient_id), sum(visits), sum(prod) FROM v GROUP BY 1, 2
multi := SELECT patient_id FROM v GROUP BY 1 HAVING count(DISTINCT service_office) >= 2
ref   := SELECT i.*, (SELECT min(c.service_date) FROM rpt_charges c WHERE c.patient_id = i.patient_id
                      AND c.procedure_code = i.procedure_code AND c.office_id <> i.office_id
                      AND c.service_date BETWEEN i.presented_date AND i.presented_date + :window) AS completed_on
         FROM rpt_treatment_item_facts i WHERE i.status_norm = 'internal_referral' AND i.presented_date BETWEEN :date_from AND :date_to
```

| Era | What works |
|---|---|
| Migrated history | Visits, pairs, production and patients seen at two or more offices (H; k9, k14). Home office is today's value: a patient who changed home office is paired with the new one for all history |
| App era | Internal referrals (treatment items are app era; migrated plans are undated headers) |
| Waits for | DATA-47 roll-ups (multi-office speed); DATA-39 (item office instead of plan office) |

Unknowable: why a patient was seen elsewhere (convenience, provider, overflow) - no reason is stored.

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `office_name` | Office | text | `aggregate` | label |
| `patients_seen_own`, `patients_seen_visiting` | Own / visiting patients | integer | `aggregate` | count_distinct (organisation total deduplicated) |
| `visits_own`, `visits_visiting` | Visits | integer | `aggregate` | sum |
| `production_own`, `production_visiting` | Production | money | `financial_practice` | sum |
| `cross_office_production_share_pct` | Home patients' production done elsewhere | percent | `financial_practice` | ratio |
| `cross_office_patients` | Seen at two or more offices | integer | `aggregate` | count_distinct |
| `internal_referrals`, `internal_referral_completed_pct` | Internal referrals / completed at a sister office | integer, percent | `aggregate` | sum / ratio |
| `referred_outside` | Referred outside instead | integer | `aggregate` | sum |

`pairs`: shape `matrix`, rows home office, columns office of service (`max_columns` 30), value `pair_measure`, diagonal
shaded. `referrals`: rows referring office x completing office, counts and completion share. `detail`
(`phi_identified`): patients seen at two or more offices - home office, offices visited, visits and production per
office, last provider per office. Summary cards: `cross_office_patients`, `cross_office_production_share_pct`,
`internal_referral_completed_pct`. `reconciles_with`: `cross_office_patients`; per office own + visiting = its
`patients_seen`.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Heat matrix | Home office x office of service, diagonal shaded |
| Bars | Visiting share of patients seen per office |

| Click | Target |
|---|---|
| Matrix cell | `kind = rows` (patients of the pair) |
| Office row | `lists.patients_seen` (`office_ids`, range) |
| Referral cell | `kind = rows` (referral items with outcome); item row: treatment plan |
| Detail row | Patient record |

### Actions

None (an aggregate analysis; patients are not contacted from it). Quarterly schedule to executives; shipped view "Last
12 months, all offices".

### Open questions

- Should home-office attribution follow the office of most visits instead of the stored home office? This report gives
  the evidence; the rule belongs to 05 (PD-4).
- Pairs with very few patients: suppress cells below a minimum count for patient-level classes (08)?

## Goal attainment and pacing - `analytics.goal_attainment`

enterprise - P3 - M - `analytics_goals_view` - interactive - APP

### Purpose

Office managers daily and weekly, owners and regional managers monthly: who is on pace for the month and the year, how
much each provider and office must produce per remaining working day, and whether the booked schedule closes the gap.
Actions: open more hygiene columns or fill the doctor's open time when the forecast is short, reset unrealistic goals,
coach a provider who is behind. The provider-restricted version is a doctor's own monthly sheet.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `daily.scheduled_production` (the "Estimated Prod." column only) | Goal against actual for month and year to date by provider, office and group; percent of goal through yesterday; needed per remaining working day; forecast (done + scheduled); run-rate projection; providers without a goal; goal history version used |

Called for by: KPI §7.1-§7.4; CT TS-10, I-3, I-8; DSO §14.8 (goal cascade, over / under columns per location); 06 §4.4,
goal rows of §2.1, §2.2, §2.5 "Production to goal" (drill target "goal rows", key chosen in the header).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Office of service |
| `report_date` | `date` (`as_of`) | `today` | The month and year of pacing; production counted through the day before (05 §8.4) |
| `provider_ids` | `entity_multi` | `all` | `provider_role = treating`; forced to `current_user_report_provider` under PD-11 (`self_unless_privileged`) |
| `production_group` | `enum` | `all` | `doctor`, `hygiene`, `other` |
| `report_format` | `enum` | `month` | NEW formats: `month` (pacing for the month of `report_date`), `year_to_date` (months January..current as columns), `detail` (provider-office-day rows) |
| `group_by` | `enum` | `provider` | `provider`, `office`, `office_group`, `production_group` |
| `sort_by`, `page_break_by`, `output_format` | filter card 3.9 | `pct_of_goal` ascending, `none`, `pdf` | |
| `include_no_goal_rows` | `boolean` | `true` | NEW (04): list producing providers without a goal row (warning `providers_without_goal`) |

Settings printed: `goal_production_basis`, `goal_working_days_fallback`, `schedule_completion_factor`.

### Data

| Source | Columns / metrics |
|---|---|
| `provider_production_goals` (DATA-24) through the goal resolver (MET-17, 05 §8.3) | `provider_id`, `office_id`, `goal_month`, `daily_goal`, `working_days`, `monthly_goal`, `production_basis`, `source`, `version` |
| Metrics | `production_goal`, `production_vs_goal_pct`, `daily_avg_needed_to_goal`, `production_forecast`, `net_production` (or the goal row's basis), `scheduled_production`, `working_days` |
| `rpt_provider_calendar_days()`, `rpt_office_calendar_days()` | elapsed and remaining working days, `hours_source` |
| `rpt_appointment_procedures` | scheduled production from today to month end (`status_class NOT IN ('cancelled','no_show')`) |
| `rpt_provider_dim`, `rpt_office_dim` | labels, `production_group`, groups |

Calculation (all formulas are 05 §8.3-§8.4): goal to date = provider-day goal amounts from the first of the month through
yesterday; percent of goal = `P_goal` through yesterday ÷ goal to date; needed per day = (month goal − `P_goal` to
yesterday) ÷ remaining working days from today; forecast = `P` to yesterday + `schedule_completion_factor` ×
`scheduled_production` today..month end; run-rate = `project_period_end(net_production)`. Year to date sums closed months
(frozen `month_end` rows once DATA-30 runs) plus the open month. Office row = the office goal row if one exists, else the
sum of its providers (05 §8.3); a provider goal with `office_id` NULL is apportioned by scheduled days.

```
g  := goal_days(:tenant_id, :office_ids, :provider_ids, month_start(:report_date), month_end(:report_date))   -- provider x office x day amounts (MET-17)
p  := metric_query(['net_production'], dims => ['provider_id','office_id'], range => (month_start, :report_date - 1))
s  := SELECT provider_id, office_id, sum(scheduled_fee) FROM rpt_appointment_procedures
      WHERE appointment_date BETWEEN :report_date AND month_end AND status_class NOT IN ('cancelled','no_show') AND NOT is_block GROUP BY 1, 2
SELECT ... FROM g FULL JOIN p USING (provider_id, office_id) LEFT JOIN s USING (provider_id, office_id)
```

| Era | What works |
|---|---|
| Migrated history | Production through yesterday (H; net = charged until DATA-12, k1). No goal was migrated: every month before the first entered goal is `no_data` ("No goal set"), never 0 % |
| App era | Goals, versions, forecast (scheduled lines exist on new appointments; about 6 % of migrated appointments have lines, k7) |
| Waits for | DATA-24, MET-17 (P3); frozen past months DATA-30; goal overlay for non-production targets ENG-51 (P4, not used here) |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `group_label` | Provider / Office / Group | text | `provider_comp` when provider (money block), else `aggregate` | label |
| `month_goal` | Month goal | money | `provider_comp` by provider, else `financial_practice` | sum (office row may be its own goal row, 05 §8.3) |
| `goal_to_date` | Goal to date | money | as above | sum |
| `production_to_date` | Production to date | money | as above | sum |
| `pct_of_goal` | % of goal | percent | as above | ratio(`production_to_date`, `goal_to_date`) |
| `pace_status` | Pace | enum | `aggregate` | none (`behind` / `on_pace` / `ahead` from bands on `production_vs_goal_pct`) |
| `working_days_elapsed`, `working_days_remaining` | Days done / left | decimal | `aggregate` | sum (office-days above one office) |
| `needed_per_day` | Needed per day | money | as money | none (builder: `daily_avg_needed_to_goal` per level) |
| `avg_per_day_to_date` | Average per day | money | as money | ratio(`production_to_date`, `working_days_elapsed`) |
| `scheduled_remaining` | Scheduled to month end | money | as money | sum |
| `forecast` | Forecast | money | as money | sum (`production_forecast`) |
| `forecast_gap` | Forecast vs goal | money | as money | none (computed `difference(forecast, month_goal)`) |
| `run_rate_projection` | Run-rate | money | as money | sum |
| `goal_source` | Goal source | enum | `aggregate` | label (`manual`, `auto_seed`, `hours_based`, `import`; `mixed` on totals) |

Grouping: fixed outer office band when multi-office; level 1 `group_by`; grand total. `year_to_date`: `shape = matrix`,
rows member, columns months, values `goal`, `production`, `pct_of_goal`, row total = YTD. `detail`: provider-office-day rows
with `goal_amount`, `production`, `scheduled_fee`, `is_working_day`. Summary cards: `production_goal`,
`production_vs_goal_pct`, `daily_avg_needed_to_goal`, `production_forecast`. `reconciles_with`: those four metrics.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Pacing chart (06 §4.4) | Cumulative production by working day (solid) vs cumulative goal (dashed), scheduled stacked from today, forecast and run-rate markers |
| Bullet bars | % of goal per member with 85 / 95 % bands |

| Click | Target |
|---|---|
| `production_to_date` | `daily.production_report` (`{std}`, `group_by = provider`, `date_basis = service_date`) |
| `scheduled_remaining` | `daily.scheduled_production` (today..month end, same providers) |
| `month_goal`, `goal_source` | Goals page, production tab, for that provider and month (route key owned by 07); `analytics_goals_manage` to edit |
| Remaining open time | `appointment.schedule_utilization` format `look_ahead` |

### Actions

Row action `edit_goal` (`navigate`, right `analytics_goals_manage`). No bulk actions. Shipped views: "This month by
provider", "Year to date by office". Schedules: weekdays 07:00 to office managers; Monday to providers (own row, PD-11).
Alert: `production_vs_goal_pct` below 85 % after the 10th working day (ENG-52, P4).

### Open questions

- Office goal rows and provider rows for the same office and month: the office row wins (05 §8.3); show the provider
  sum beside it as information (proposed).
- Goals on collections or new patients are `metric_targets` (P4): this report stays production-only until then.
- Today's production is excluded on both sides; a live "today so far" column is possible but breaks the 05 rule.

## Referral and marketing source return - `referral.referral_source_return`

enterprise - P3 (cost columns P4) - M - `reports_referral_reports_screen_view_only` - background (cohort report) - SCHEMA(40)

### Purpose

Owner and marketing lead, quarterly and before every budget decision: which sources (referring doctors, patients,
campaigns, online) bring patients who show up, stay and pay, and what each new patient costs. Actions: move spend between
channels, thank or visit high-value referring doctors, stop a campaign whose patients never return, chase the front desk
when the source is not recorded.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `referral.referral_production_list` (production of referred patients for a range) | Cohorts by first-visit month; production and collections of each cohort over fixed 12- and 24-month windows (comparable across sources, matured cohorts only) beside the value to date; missing-source share; referral cost per source, cost per new patient and return on spend once spend is entered. Conversion by source (second visit) is in `analytics.new_patient_acquisition`, which this report links to |

Called for by: CT D-14, I-41 (matchback, referral-source scorecards); KPI §3.10 MKT-05..MKT-08; DSO §14.4 (scorecard rows =
referral sources); 06 §2.12 "Value by source", "Cost per new patient" (no drill target in 06; header drill table chose
this key).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Office of the first visit (`rpt_patient_activity.first_visit_office_id`) |
| `date_range` | `date_range` | `matured_12m_cohorts` | Cohort date = `first_visit_date` (the cohort of `new_patients_first_visit`, as in `analytics.new_patient_acquisition`); the value windows run from that date. The default holds twelve cohorts whose 12-month window has closed, so `value_12m`, value per new patient and return are filled; a later range shows `value_to_date` and keeps the immature cohorts out of the window columns |
| `referred_from_ids` | `entity_multi` | `all` | Shared 06 §2.12 filter: `referrals` sources (lookup owned by 04) |
| `referral_type_codes` | `entity_multi` | `all` | Shared key (filter card 3.7) |
| `report_format` | `enum` | `summary` | `summary` (source rows), `cohort` (source x first-visit month), `detail` (patients) |
| `group_by` | `enum` | `source` | `source`, `source_category`, `source_type`, `office` |
| `sort_by`, `page_break_by`, `output_format` | filter card 3.9 | `value_12m` descending, `none`, `pdf` | |
| `value_window_months` | `enum` | `12` | NEW (04): `12`, `24`; both columns print, this one drives sort and return |
| `value_basis` | `enum` | `net_production` | NEW (04): `charged_production`, `net_production`, `net_collections` |

### Data

| Dataset | Columns |
|---|---|
| `rpt_referral_facts` (`referral_kind = 'inbound_source'`) | `patient_id`, `referral_source_id`, `source_name`, `source_category`, `source_type_label`, `referral_date`, `office_id` |
| `rpt_patient_dim` | `home_office_id`, `referred_by_raw` |
| `rpt_patient_activity` | `first_visit_date`, `first_visit_office_id` |
| `rpt_charges`, `rpt_ledger_entries` | production (`ledger_bucket` production / production adjustments) and collections (`collection`, `collection_adjustment`) of the cohort patients, by `patient_id`, inside the window |
| `referrals` (registered passthrough of the existing table, as `referral.referral_source_list` reads it) | `cost` (no period: printed as "recorded cost", not a period spend) |
| `marketing_spend` (NEW, 05 §5.10 request; owner 03) | `source_id` or `campaign_code`, `office_id`, `period_month`, `amount`, `entered_by` |

Calculation: cohort = patients whose `first_visit_date` falls in the range; source = their inbound source (none →
`Source not recorded`, the residual row). Value 12 / 24 = Σ value of the patient's legs with service (or allocation)
date in [first visit, first visit + N months), over cohorts whose window has closed (mature); `value_to_date` = the same
sum up to the run date over every cohort of the range. Cost per new patient = spend of the source's periods in the range
÷ new patients of the source; return on spend = (`value_12m` − spend) ÷ spend over mature cohorts
(`cost_per_new_patient`, 05 §5.10).

```
c  := SELECT pa.patient_id, pa.first_visit_date, pa.first_visit_office_id AS office_id, f.referral_source_id, f.source_category,
             pa.first_visit_date + interval '12 months' <= :run_date AS mature_12,
             pa.first_visit_date + interval '24 months' <= :run_date AS mature_24
      FROM rpt_patient_activity pa
      LEFT JOIN rpt_referral_facts f ON f.patient_id = pa.patient_id AND f.referral_kind = 'inbound_source'
      WHERE pa.first_visit_date BETWEEN :date_from AND :date_to
val := SELECT c.patient_id,
              sum(e.amount) FILTER (WHERE c.mature_12 AND e.service_date_effective < c.first_visit_date + interval '12 months') AS v12,
              sum(e.amount) FILTER (WHERE c.mature_24 AND e.service_date_effective < c.first_visit_date + interval '24 months') AS v24,
              sum(e.amount) AS v_to_date
       FROM c JOIN rpt_ledger_entries e ON e.patient_id = c.patient_id AND e.ledger_bucket IN (<basis buckets>)
       WHERE e.service_date_effective >= c.first_visit_date GROUP BY c.patient_id
```

| Era | What works |
|---|---|
| Migrated history | Source links of migrated patients by legacy id (H; `source_category` inferred until DATA-40); production H (net = charged, k1); collections by patient H with `assumed` tender share (k15) |
| App era | Patients registered in the app hold free text until DATA-40 (`Source not recorded` or `free text` rows); campaign codes on appointments (A) |
| Waits for | DATA-40 (P3); `marketing_spend` (P4): cost columns render `not_available` with "needs marketing spend input" |

Unknowable: spend in any past period (no dated spend exists); the source of patients registered without one.

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `source_label` | Source | text | `aggregate`; `phi_identified` when the source is a patient or free text (rule 13: neutral `source_type_label` otherwise) | label |
| `source_category` | Category | enum | `aggregate` | label |
| `new_patients_first_visit` | New patients (first visit) | integer | `aggregate` | sum |
| `new_patient_share_pct` | Share | percent | `aggregate` | `share_of_parent(new_patients_first_visit)` |
| `value_12m`, `value_24m` | Value 12 / 24 months (mature cohorts) | money | `financial_practice` | sum of mature cohorts |
| `value_to_date` | Value to date (every cohort of the range) | money | `financial_practice` | sum |
| `value_per_new_patient` | Value per new patient | money | `financial_practice` | ratio(`value_12m`, mature `new_patients_first_visit`) |
| `recorded_cost` | Recorded referral cost | money | `financial_practice` | sum (`referrals.cost`, undated) |
| `spend` | Marketing spend | money | `financial_practice` | sum (P4) |
| `cost_per_new_patient` | Cost per new patient | money | `financial_practice` | ratio(`spend`, `new_patients_first_visit`) |
| `return_on_spend` | Return on spend | decimal | `financial_practice` | ratio(`value_12m` − `spend`, `spend`) |
| `mature_share_pct` | Mature cohorts | percent | `aggregate` | ratio (new patients of mature cohorts ÷ new patients) |

Grouping: fixed outer office band when multi-office; level 1 `group_by`; grand total; residual rows `Source not recorded`
and `Other` (top 25 + other). `cohort`: `shape = matrix`, rows source, columns first-visit month, value `value_12m` or
`new_patients_first_visit`. `detail`: patient rows (`patient_name`, `chart_no`, `first_visit_date`, `value_12m`,
`value_24m`, `value_to_date`) - `phi_identified`, money `financial_patient`. Summary cards: `new_patients_first_visit`,
`new_patients_missing_source_pct`, `patient_referral_share_pct`, `referral_source_production`, `cost_per_new_patient`.
`reconciles_with`: `new_patients_first_visit`, `new_patients_missing_source_pct`.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Bubble or bars | Sources: x = new patients, y = value per new patient (bars fallback); `Source not recorded` always shown |
| Cohort heat | Source x cohort month, value 12 months |

| Click | Target |
|---|---|
| `new_patients_first_visit` | `detail` rows (`kind = rows`); legacy print: `referral.referral_summary_report` |
| Conversion of a source | `analytics.new_patient_acquisition` (`group_by = referral_source`, `referred_from_ids`, same cohort range) |
| `value_12m` | `referral.referral_production_list` (`referred_from_ids`, patients of the cohort) |
| `Source not recorded` | `management.data_quality_exceptions` (`check_keys = ['new_patient_missing_source']`) |
| Patient row | Patient overview (route key owned by 07) |

### Actions

Row action `open_source` (Referral Source setup, `navigate`). Bulk action `letters` on referring-doctor rows (thank-you
letter, handler of the correspondence feature, PD-15). Shipped views: "Matured cohorts by source" (the default range), "Last 12 months by source, value to date".
Schedule: quarterly to the owner. Not an alert source.

### Open questions

- Attribution when a patient has two sources (patient record and referral case): first touch (recommended) or last.
- Family value: count only the referred patient (proposed) or the whole guarantor account.
- `marketing_spend` entry: monthly per source and office, with an office-less "organisation" row; screen owned by 07.

## Online booking funnel - `analytics.online_booking_funnel`

enterprise - P3 - M - `reports_appointment_reports_screen_view_only` - interactive - APP

### Purpose

Office manager weekly, owner and marketing monthly: does online booking turn into kept visits and new patients, and where
it leaks - requests expiring unanswered, declines, slow responses, no-shows of online-booked patients, emergency requests
handled late. Actions: change who answers the inbox and how fast, open more online slots or reasons, change the payment
or deposit requirement, decide whether the channel is worth promoting.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `lists.online_registered_patients` (registrations) | Stage counts from request to approved, appointment, kept, new patient and first-visit production; decline and expiry reasons; response time distribution; by office, reason, emergency flag, hour and weekday received, lead time |

Called for by: KPI §3.10 MKT-02, MKT-10; CT I-42; 06 §2.12 "Online booking", §2.8 "Booking activity".

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | `booking_requests.office_id` |
| `date_range` | `date_range` | `last_month` | Fixed basis: request created date (office-local) |
| `compare_to` | `enum` | `previous_period` | `previous_period`, `previous_year` |
| `provider_ids` | `entity_multi` | `all` | Requested provider (`booking_requests.provider_id`; NULL = `Any provider`) |
| `report_format` | `enum` | `summary` | `summary` (stage table), `detail` (request rows) |
| `group_by` | `enum` | `none` | `none`, `office`, `reason`, `is_emergency`, `hour_received`, `day_of_week`, `is_new_patient`, `response_band` |
| `sort_by`, `page_break_by`, `output_format` | filter card 3.9 | first option, `none`, `pdf` | |
| `include_rescheduled` | `boolean` | `true` | NEW (04): follow a request whose approved slot was moved (`reschedule_count > 0`) to its current appointment |

### Data

| Source | Columns |
|---|---|
| `booking_requests` (registered passthrough of the existing table, as `lists.online_registered_patients` reads it; no new schema) | `id`, `office_id`, `status` (`pending`, `awaiting_payment`, `approved`, `declined`, `expired`), `reason_id`, `reason_label`, `is_emergency`, `is_new_patient`, `provider_id`, `slot_date`, `start_time`, `created_at`, `actioned_at`, `actioned_by`, `decline_reason`, `appointment_id`, `patient_id`, `requires_payment`, `payment_status`, `reschedule_count` |
| `rpt_appointment_facts` | `appointment_id`, `status_class`, `is_kept`, `appointment_date` (join on `appointment_id`) |
| `rpt_patient_dim`, `rpt_visits` | `first_visit_date`; production of the first visit (`charged_production`) |
| `rpt_office_calendar_days()` | open hours, for response time in open hours |

Stages (each a subset of the previous): received → actioned (approved or declined) → approved → appointment linked → kept
(`is_kept`) → new patient seen (request `is_new_patient` and the kept appointment is the patient's first visit) →
first-visit production. Side outcomes: `declined` (by `decline_reason` text, top phrases not parsed: count only),
`expired`, `awaiting_payment`, appointment later `cancelled` / `no_show`. Response time = `actioned_at − created_at`, in
hours and in open hours; bands `< 1 h`, `1-4 h`, `4-24 h`, `> 24 h`. Lead time = `slot_date − created date`.

```
SELECT br.office_id, br.is_emergency, extract(hour FROM <local created_at>) AS hour_received, br.status,
       a.status_class, a.is_kept, (a.appointment_date = p.first_visit_date) AS is_first_visit,
       v.charged_production, br.actioned_at - br.created_at AS response_interval
FROM booking_requests br
LEFT JOIN rpt_appointment_facts a ON a.appointment_id = br.appointment_id AND NOT a.is_deleted
LEFT JOIN rpt_patient_dim p ON p.patient_id = br.patient_id
LEFT JOIN rpt_visits v ON v.patient_id = br.patient_id AND v.visit_date = a.appointment_date AND v.office_id = a.office_id
WHERE br.tenant_id = :tenant_id AND br.office_id = ANY(:office_ids) AND <created_date> BETWEEN :date_from AND :date_to
```

| Era | What works |
|---|---|
| Migrated history | None: AppointNow did not exist; ranges before the first request render "history starts on <date>" |
| App era | All stages. Appointments booked by staff for an online request without linking it are invisible to the funnel |
| Waits for | DATA-17 (`booking_source = appointnow_api` separately); the passthrough registration ships with this report |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `stage_label` | Stage | text | `aggregate` | label (fixed order) |
| `requests` | Requests | integer | `aggregate` | count at the stage |
| `stage_pct` | Of previous stage | percent | `aggregate` | ratio(stage, previous stage) |
| `of_received_pct` | Of received | percent | `aggregate` | ratio(stage, received) |
| `median_response_hours` | Median response | decimal | `aggregate` | none (builder: median per grouping set) |
| `responded_in_1h_pct` | Answered within 1 hour | percent | `aggregate` | ratio |
| `median_lead_days` | Median lead time | decimal | `aggregate` | none (builder: median per grouping set) |
| `first_visit_production` | First-visit production | money | `financial_practice` | sum |
| `compare_requests` | PP / PY | integer | `aggregate` | count |

Grouping: summary block = stages (rows) per `group_by` member (column groups); fixed outer office band when multi-office.
`detail`: one row per request - `created_at`, `requested_slot`, `reason_label`, `is_emergency`, `status`,
`response_hours`, `appointment_status`, `is_first_visit`, requester name (patient name when linked) - `phi_identified`.
Summary cards: `online_booking_requests`, `online_booking_conversion_pct`, kept share of received (NEW 05),
`median_response_hours` (NEW 05). `reconciles_with`: `online_booking_requests`, `online_booking_conversion_pct`.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Funnel | Stages with drop-off counts; declined and expired as side bars |
| Heat | Requests by weekday x hour received (this report has the hour from `created_at`, unlike 05 dimensions) |

| Click | Target |
|---|---|
| Any stage | `detail` rows of that stage (`kind = rows`) |
| Request row | AppointNow inbox item (route key owned by 07); linked appointment: Scheduler (`openSchedulerAtAppointment`) |
| New patients stage | `lists.online_registered_patients` (same range) |

### Actions

Row action `open_request` (`navigate`). No bulk action (requests are worked in the inbox). Shipped view "Last month".
Schedule: weekly to office managers. Alert: median response above 4 open hours in a week (ENG-52).

### Open questions

- Requests from existing patients that create a new patient record (duplicates) inflate "new patient"; the duplicate
  check of `management.data_quality_exceptions` lists them.
- Response time in open hours needs `open_time` / `close_time` per office-day (NEW columns requested of 03 for
  `rpt_office_calendar_days()`); elapsed hours ship first.

## Reminder, confirmation and campaign effectiveness - `analytics.communication_effectiveness`

enterprise - P3 - M - `reports_appointment_reports_screen_view_only` - interactive - SCHEMA(43)

### Purpose

Office manager monthly, and whoever configures reminders: do reminders and confirmations reach patients and change
attendance, at which lead time and channel, and which contacts are bad. Actions: change reminder lead times and channels,
fix phone numbers and e-mails, stop campaigns that book nothing, decide whether unconfirmed patients get a call.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `appointment.appointments_confirmed_via_vendors` (confirmed appointments list) | Sent → delivered → replied / confirmed → kept funnel by channel, message type and lead time; no-show rate of confirmed against unconfirmed visits; recall messages to bookings within 14 days; campaign appointments kept and value; patients with undeliverable contacts or opt-outs |

Called for by: CT D-14, I-42 (communication funnel, undeliverable contact data); KPI §3.10 MKT-10; 06 §2.12
"Communication funnel", "Campaigns", §2.8 "Confirmations".

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Message office (`rpt_communication_facts.office_id`); appointment office for the outcome block |
| `date_range` | `date_range` | `last_month` | Fixed basis: `sent_date` (funnel); appointment date (outcome block) |
| `compare_to` | `enum` | `previous_period` | |
| `report_format` | `enum` | `summary` | `summary`, `outcomes` (confirmed vs unconfirmed no-shows), `campaigns`, `contacts` (undeliverable and opted-out patients), `detail` (messages) |
| `group_by` | `enum` | `message_type` | `message_type`, `channel`, `lead_band`, `office`, `is_automated` |
| `sort_by`, `page_break_by`, `output_format` | filter card 3.9 | first option, `none`, `pdf` | |
| `channels` | `enum_multi` | `all` | NEW (04): `sms`, `email` |
| `message_types` | `enum_multi` | `all` | NEW (04): values of `rpt_communication_facts.message_type` (`reminder`, `confirmation`, `recall`, `campaign`, `other`) |

### Data

| Dataset | Columns |
|---|---|
| `rpt_communication_facts` (DATA-43) | `channel`, `message_id`, `office_id`, `patient_id`, `appointment_id`, `message_type`, `sent_at_utc`, `sent_date`, `is_delivered`, `replied_at_utc`, `reply_intent`, `reminder_lead_hours`, `is_automated`, `era`; NEW `delivery_status` (`queued`, `sent`, `delivered`, `failed`, `undeliverable`) requested of 03 |
| `rpt_appointment_facts` | `appointment_id`, `status_class`, `is_kept`, `is_no_show`, `is_cancelled`, `is_confirmed`, `confirmed_on`, `campaign_code`, `scheduled_fee`, `created_date` |
| `rpt_patient_dim` | `cell_phone`, `email`, `no_auto_sms`, `no_auto_email`, `sms_opt_out_at`, `no_correspondence` |

Calculation: delivered = `is_delivered` among sent (log-only gateways stay `queued` and are reported as `not_sent`, not as
undelivered); confirmed = `reply_intent = 'confirm'`; outcome = the status of the linked appointment. Recall yield = a
live appointment created within 14 days after a delivered recall message (`recall_outreach_yield_pct`). Outcomes block:
live past appointments split by `is_confirmed` with `confirmed_on` before the start → no-show rate in each half.
Campaigns: appointments with `campaign_code`, count, kept, value (`campaign_appointments`). Contacts: patients with a
future appointment whose last message failed or who opted out (`sms_opt_out_at`), or who have no cell phone and no e-mail.
Lead bands: `< 24 h`, `24-48 h`, `2-7 days`, `> 7 days`.

```
SELECT m.message_type, m.channel, lead_band(m.reminder_lead_hours), count(*) AS sent,
       count(*) FILTER (WHERE m.is_delivered) AS delivered, count(*) FILTER (WHERE m.reply_intent = 'confirm') AS confirmed,
       count(*) FILTER (WHERE a.is_kept) AS kept, count(*) FILTER (WHERE a.is_no_show) AS no_show
FROM rpt_communication_facts m LEFT JOIN rpt_appointment_facts a ON a.appointment_id = m.appointment_id AND NOT a.is_deleted
WHERE m.sent_date BETWEEN :date_from AND :date_to AND m.office_id = ANY(:office_ids) GROUP BY 1, 2, 3
```

| Era | What works |
|---|---|
| Migrated history | 5,425 migrated texts with back-filled type, direction and time (heuristic, labelled); no e-mail history; outcome block uses `is_confirmed` without a channel |
| App era | Full funnel. AppointNow notifications are not logged; vendor confirmations are not stored (DATA-17) |
| Waits for | DATA-43 (P3); `delivery_status` (NEW 03); confirmation channel DATA-17 |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `group_label` | Type / Channel / Lead time | text | `aggregate` | label |
| `sent`, `delivered`, `replied`, `confirmed` | Sent / Delivered / Replied / Confirmed | integer | `aggregate` | sum |
| `message_delivery_pct` | Delivered | percent | `aggregate` | ratio(`delivered`, `sent`); on `appointment_reminder` rows equals `reminder_delivery_rate_pct` |
| `message_confirmation_pct` | Confirmed | percent | `aggregate` | ratio(`confirmed`, `delivered`); on `appointment_reminder` rows equals `reminder_confirmation_rate_pct` |
| `kept`, `no_show`, `cancelled` | Kept / No-show / Cancelled | integer | `aggregate` | sum (linked appointments) |
| `linked_no_show_pct` | No-show rate of linked appointments | percent | `aggregate` | ratio(`no_show`, linked appointments) |
| `booked_within_14d` | Booked within 14 days | integer | `aggregate` | sum (recall messages) |
| `recall_yield_pct` | Recall yield | percent | `aggregate` | ratio = `recall_outreach_yield_pct` |
| `not_sent` | Not sent (gateway) | integer | `aggregate` | sum |

`outcomes` format: rows `confirmed` / `unconfirmed` and a total row, columns `appointments`, `kept`, `no_show_rate_pct`
and `cancellation_rate_pct` computed by the 05 builders on the live past appointments of the range (the total row equals
the 05 metrics), and `confirmation_rate_pct` (05: confirmed share of live appointments). The 05 keys appear only in this
block; the message block uses its own keys. `campaigns`: rows `campaign_code` (name from `campaigns`), `appointments`, `kept`, `value`
(`financial_practice`). `contacts`: patient rows with `reason` (`failed_last_message`, `opted_out`, `no_contact`),
`next_appointment_date` - `phi_identified`. Summary cards: `reminder_delivery_rate_pct`,
`reminder_confirmation_rate_pct` (message funnel), `confirmation_rate_pct` and `no_show_rate_pct` (outcomes block,
appointment-based), `recall_outreach_yield_pct`, `campaign_appointments`. `reconciles_with`: `reminder_delivery_rate_pct`,
`reminder_confirmation_rate_pct`, `recall_outreach_yield_pct`, `campaign_appointments` (message block);
`confirmation_rate_pct`, `no_show_rate_pct` (outcomes total row).

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Funnel | Sent → delivered → confirmed → kept per message type |
| Grouped bars | No-show rate confirmed vs unconfirmed by office |

| Click | Target |
|---|---|
| `sent`, `delivered` | `detail` rows (`kind = rows`) |
| Unconfirmed upcoming | `worklists.unconfirmed_appointments` |
| Recall rows | `worklists.recall_due` |
| `campaigns` row | `appointment.appointment_list` (campaign filter) |
| Contact row | Patient overview, contact section (route key owned by 07) |

### Actions

Bulk action `create_task` on `contacts` rows ("fix contact data", assigned to the front desk; handler of the task
feature). Shipped views "Last month by type", "Contacts to fix". Schedule `contacts` weekly with `skip_if_empty`.

### Open questions

- A confirmed appointment confirmed by phone (not by reply) counts as confirmed only through `is_confirmed`; the
  message funnel cannot see it. Keep both blocks separate (proposed).
- Attribution of a kept visit to a reminder is correlation, not cause: print "linked, not attributed".

## Outreach results - `analytics.outreach_results`

enterprise - P4 - M - any of the worklist families (`recall`, `treatment_plan`, `insurance`, `monthly`, `appointment`, `daily`) - interactive - APP

### Purpose

Office manager weekly, owner monthly: does the follow-up work pay - attempts, contacts, outcomes and money scheduled or
collected per worklist, per team member and per channel. Decisions: staffing of the call desk, which lists to automate,
coaching a team member with many attempts and few results, dropping outcome codes nobody uses.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| none (the legacy Task Manager lists open tasks, not results) | Listed → attempted → contacted → resolved counts per worklist, user and channel; outcome distribution; days to resolve; value at listing against value realised inside the attribution window |

Called for by: CT D-6, I-11 ("Team Tasks Results"); KPI §3.12 FRO-02, FRO-03; 06 §6.1 (follow-up state and attribution),
DASH-43 "Outreach results view" (key chosen in the header).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | `worklist_followups.office_id` |
| `date_range` | `date_range` | `last_month` | Fixed basis: `first_listed_on` (cohort of listed items); event counts use `worklist_events.created_at` local date in format `activity` |
| `compare_to` | `enum` | `previous_period` | |
| `user_ids` | `entity_multi` | `all` | `credited_user_id` (results) or event `created_by` (activity) |
| `report_format` | `enum` | `summary` | `summary` (worklist x stage), `activity` (user x channel attempts per day), `outcomes` (outcome codes), `detail` (follow-up rows) |
| `group_by` | `enum` | `worklist` | `worklist`, `user`, `channel`, `outcome`, `office` |
| `sort_by`, `page_break_by`, `output_format` | filter card 3.9 | `result_value` descending, `none`, `pdf` | |
| `worklist_keys` | `enum_multi` | `all` | NEW (04): worklists the caller may open (06 §6) |

Setting printed: `worklist_attribution_window` (30 days).

### Data

| Dataset (passthrough, DASH-29) | Columns |
|---|---|
| `worklist_followups` | `worklist_key`, `subject_type`, `subject_id`, `cycle_no`, `office_id`, `status`, `assigned_user_id`, `first_listed_on`, `value_at_listing`, `attempts`, `resolved_at`, `resolution`, `resolution_reason`, `credited_user_id`, `result_value` |
| `worklist_events` | `followup_id`, `event_type`, `channel`, `outcome_code`, `created_by`, `created_at`, `ref_type`, `ref_id`, `promise_value` |
| `worklist_outcome_codes` | `code`, `label`, `counts_as_contact`, `is_terminal` |
| `rpt_appointment_facts`, `rpt_ledger_entries` | for `realised_produced`: kept appointments referenced by events (`ref_type = 'appointment'`) and their charged production |

Calculation: listed = cycles with `first_listed_on` in range; attempted = cycles with at least one `contact`,
`message_sent` or `letter_sent` event; contacted = an event whose outcome `counts_as_contact`; resolved = `status =
'resolved'` (auto or manual); dismissed apart. Completion = `follow_up_completion_pct`. Value realised = `result_value`
(fee booked on scheduling worklists, amount collected on financial ones, 06 §6.1); `realised_produced` (scheduling
worklists) = charged production of the booked appointment once kept. Days to resolve = `resolved_at − first_listed_on`.
A cycle resolved `auto` with no contact event is "resolved without outreach" (the base rate that outreach must beat).

```
SELECT f.worklist_key, f.credited_user_id, count(*) AS listed,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM worklist_events e WHERE e.followup_id = f.id AND e.event_type IN ('contact','message_sent','letter_sent'))) AS attempted,
       count(*) FILTER (WHERE f.status = 'resolved') AS resolved, sum(f.value_at_listing), sum(f.result_value)
FROM worklist_followups f WHERE f.tenant_id = :tenant_id AND f.first_listed_on BETWEEN :date_from AND :date_to AND f.office_id = ANY(:office_ids)
GROUP BY 1, 2
```

| Era | What works |
|---|---|
| Migrated history | None; ranges before the first sync render "history starts on <date>" |
| App era | All columns from DASH-29; `realised_produced` once the booked visit is kept |
| Waits for | DASH-28, DASH-29 (P3), DASH-43 (P4) |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `worklist_label` | Worklist | text | `aggregate` | label |
| `user_label` | Team member | text | `user_activity` (06 §2.16 rule: a member sees only the own row) | label |
| `listed`, `attempted`, `contacted`, `resolved`, `resolved_without_outreach`, `dismissed` | counts | integer | `aggregate` (`user_activity` by user) | sum |
| `attempts` | Attempts | integer | as above | sum of events |
| `completion_pct` | Completion | percent | as above | ratio(`resolved`, `listed`) |
| `contact_rate_pct` | Contact rate | percent | as above | ratio(`contacted`, `attempted`) |
| `median_days_to_resolve` | Days to resolve | decimal | as above | none (builder: median per grouping set) |
| `value_at_listing` | Value listed | money | `financial_practice` | sum |
| `result_value` | Value realised | money | `financial_practice` | sum |
| `realised_produced` | Produced from bookings | money | `financial_practice` | sum |
| `yield_pct` | Yield | percent | `financial_practice` | ratio(`result_value`, `value_at_listing`) |

Grouping: level 1 `group_by`, level 2 worklist when grouped by user; grand total. `detail`: follow-up rows with subject
label, status, attempts, last outcome, credited user, values - `phi_identified`, money `financial_patient`. A worklist whose
family the caller lacks shows one `restricted` row. Summary cards: `follow_up_completion_pct`, `result_value`,
`attempts`, `contact_rate_pct`. `reconciles_with`: `follow_up_completion_pct`.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Stacked bars | Per worklist: resolved with outreach, resolved without, open, dismissed |
| Scatter | Per user: attempts vs value realised (team view, managers only) |

| Click | Target |
|---|---|
| Worklist row | The worklist (06 §6) filtered to the same office |
| `result_value` | `detail` rows (`kind = rows`) |
| Follow-up row | Its subject (patient, claim, appointment; route keys owned by 07) |

### Actions

No bulk action (state changes belong to the worklist). Shipped views "Last month by worklist", "My results" (own user).
Schedule monthly to office managers.

### Open questions

- Credit goes to the last contact inside the window (06 §6.1); a split credit among several users is not proposed.
- Automated messages (no `created_by`) appear as user `Automation` so automation and staff can be compared.

## Staff hours against production - `management.staff_productivity`

enterprise - P3 - M - `reports_management_reports_screen_view_only` (+ class `payroll_time`; wage ratio `payroll_wage`) - interactive (background above 13 months) - READY

### Purpose

Owner and office manager monthly, regional manager quarterly: are clocked staff hours in line with what the office
produces and handles - production, collections, visits and appointments created per clocked hour, by office-day, weekday
and role, and the hygienist production-to-wage ratio. Decisions: trim or add staff hours on slow weekdays, rebalance
front-desk coverage across offices, review hygiene compensation (target about 3x wages, KPI §7.2).

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `management.time_clock_report` (punches, totals, overtime) | The output side: production, collections, visits and appointments created against clocked hours per office-day and role; production per clocked hour; provider-linked users' own production per clocked hour; hygienist production ÷ wages |

Called for by: KPI §3.8 PRV-08, §3.5 HYG-09, §3.12, §3.13 DSO-11 (provider and hygienist hours per location); 06 §2.9
"Wages", §2.1 "Clocked hours". Phase P3: hours (DATA-23, P1), production and collections (P2) and `appointments_created`
(05, P3); format `wage_ratio` ships in P4 with `hygienist_production_to_wage_ratio` (MET-27).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | `rpt_time_clock.office_id` for hours; office of service for production; legacy punches with NULL office form `Office not recorded` |
| `date_range` | `date_range` | `last_month` | Hours by `work_date`; production by service date; collections by transaction date |
| `compare_to` | `enum` | `previous_period` | |
| `time_grain` | `enum` | `none` | `day`, `week`, `month` |
| `user_ids` | `entity_multi` | `all` | Forced to the caller without class `payroll_time` (UR-2, `self_unless_privileged`) |
| `report_format` | `enum` | `summary` | `summary` (office x role), `office_days` (office-day rows), `providers` (provider-linked users), `wage_ratio` (hygienists; P4) |
| `group_by` | `enum` | `office` | `office`, `role`, `day_of_week`, `user` |
| `sort_by`, `page_break_by`, `output_format` | filter card 3.9 | first option, `none`, `pdf` | |
| `include_wages` | `boolean` | `false` | Shared rule (08 §5.2 rule 8): needs `payroll_wage`; enables `wage_ratio` |

### Data

| Dataset | Columns |
|---|---|
| `rpt_time_clock` (DATA-23) | `user_id`, `office_id`, `work_date`, `total_hours`, `entry_type`, `is_paid`, `auto_closed`, `clock_basis`, `era` |
| `rpt_user_dim` | `user_label`, `role` (free text, normalised through `rpt_value_map` to `staff_role`, NEW vocabulary in 03), `linked_provider_id` |
| `rpt_provider_dim` | `provider_kind`, `production_group`, `user_id` |
| Metrics | `clocked_hours`, `net_production`, `net_collections`, `patient_visits`, `appointments_created`, `working_days`, `production_per_hour` (clinical hours) |
| Wages (P4, `payroll_wage`) | `time_clock_service.build_report` wages through the engine adapter (ENG-34) - pay rate from `user_time_clock_config.pay_rate`, overtime from `time_clock_settings` |

Calculation, per office-day: clocked hours = Σ `total_hours` of paid entries; output = the office-day's metrics; per
clocked hour = output ÷ clocked hours (ratio of sums at every level). Role rows split hours only; output is an office
figure and is not split by role (a "production per front-desk hour" is office production ÷ front-desk hours, labelled
as such). `providers`: users linked to a provider - own production ÷ own clocked hours, beside `production_per_hour`
on clinical hours. `wage_ratio`: hygienist (`provider_kind = 'hygienist'`) production ÷ wages of the linked user (NEW
metric `hygienist_production_to_wage_ratio`, 05 §5.8; 06 §2.9 names it).

```
h := SELECT office_id, work_date, staff_role, sum(total_hours) FILTER (WHERE is_paid) AS clocked_hours
     FROM rpt_time_clock t JOIN rpt_user_dim u USING (tenant_id, user_id) WHERE work_date BETWEEN :date_from AND :date_to GROUP BY 1, 2, 3
o := metric_query(['net_production','net_collections','patient_visits','appointments_created'], dims => ['office_id','date'])
SELECT ... FROM h FULL JOIN o ON o.office_id = h.office_id AND o.date = h.work_date
```

| Era | What works |
|---|---|
| Migrated history | 31,756 migrated punches (wall-clock basis, office may be NULL; 856 auto-closed rows count 0 hours); production H (k1); appointments created A only (k7) |
| App era | All columns; provider rows only for providers linked to a punching user |
| Waits for | DATA-23 (P1); wage ratio needs pay rate history - only today's `pay_rate` exists, so past months are labelled `current_rate` |

Unknowable: planned shifts (none stored in either era); wages before a rate was entered; benefits and payroll taxes.

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `office_name` | Office | text | `aggregate` | label |
| `staff_role` | Role | enum | `aggregate` | label (`Role not recorded` residual) |
| `user_label` | User | text | `payroll_time` | label (format `user` / `providers`) |
| `clocked_hours` | Clocked hours | decimal | `payroll_time` | sum |
| `working_days` | Working days | decimal | `aggregate` | sum |
| `production` | Production | money | `financial_practice` (`provider_comp` in `providers`) | sum (office-level, not split by role) |
| `collections` | Collections | money | `financial_practice` | sum |
| `patient_visits` | Visits | integer | `aggregate` | count_distinct (patient-office-days of `rpt_visits`) |
| `appointments_created` | Appointments created | integer | `aggregate` | sum |
| `production_per_clocked_hour` | Production per clocked hour | money | most restrictive of inputs | ratio |
| `visits_per_clocked_hour` | Visits per clocked hour | decimal | `payroll_time` | ratio |
| `wages` | Wages | money | `payroll_wage` | sum (`wage_ratio` only) |
| `production_to_wage_ratio` | Production ÷ wages | decimal | `payroll_wage` | ratio |

Grouping: fixed outer office band; level 1 `group_by`; level 2 period when `time_grain`; grand total. Summary cards:
`clocked_hours`, production per clocked hour, `hygienist_production_to_wage_ratio` (when allowed). `reconciles_with`:
`clocked_hours`, `net_production`, `net_collections`.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Combo | Bars clocked hours by weekday, line production per clocked hour |
| Bars | Hygienist production ÷ wages with the 3x reference line |

| Click | Target |
|---|---|
| `clocked_hours` | `management.time_clock_report` (`{std}`, `user_ids`) |
| `production` | `daily.production_report` (`{std}`) |
| `appointments_created` | `appointment.appointment_detail` (created date, office) |
| Low-hours anomalies | `management.time_clock_exceptions` (same range) |

### Actions

No actions. Shipped view "Last month by office and role". Schedule monthly to owners (payroll classes are checked per
recipient, so a recipient without `payroll_time` is `skipped_not_authorized`).

### Open questions

- 06 §2.9 classes the wage ratio `payroll_time`; the header and 08 §5.2 rule 8 require `payroll_wage` for wage values.
  This specification follows `payroll_wage` (challenge to 06).
- Role vocabulary: `users.role` is free text; a `staff_role` mapping (front desk, clinical assistant, hygienist,
  dentist, management, billing) is requested of 03.

## Time-clock exceptions - `management.time_clock_exceptions`

enterprise - P2 - S - `reports_management_reports_screen_view_only` (+ class `payroll_time`) - interactive - READY

### Purpose

Office manager before each payroll run, owner or payroll monthly: the punches that need a decision before hours are
paid - missing clock-outs, shifts still open, after-the-fact edits (with who edited and why), deleted punches, overtime,
punches on closed days or outside office hours. Action: correct or approve each one, talk to the user, before the pay
period is exported.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `management.time_clock_report` (lists punches; exceptions must be found by eye) | One row per exception with a type taxonomy, the editor and reason of every change, tests against the office calendar and the overtime thresholds, grouped by pay period and user, empty when nothing needs review (`skip_if_empty`) |

Called for by: KPI §3.12 (front-office controls), §6 (payroll review routine); DSO §14.7 (pay review before publishing).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Punch office; NULL-office punches are listed under `Office not recorded` for report-unrestricted callers |
| `date_range` | `date_range` | `last_2_weeks` | On the payroll week (`week_start: payroll`, 04 §7.4: `time_clock_settings.week_start_day`); basis `work_date` |
| `user_ids` | `entity_multi` | `all` | Forced to the caller without `payroll_time` (UR-2) |
| `include_inactive_users` | `boolean` | `false` | Shared key |
| `report_format` | `enum` | `detail` | `detail` (exception rows), `summary` (type x user counts) |
| `group_by` | `enum` | `user` | `user`, `exception_type`, `office`, `pay_period` |
| `sort_by`, `page_break_by`, `output_format` | filter card 3.9 | `work_date`, `none`, `pdf` | |
| `exception_types` | `enum_multi` | `all` | NEW (04): values of the table below |
| `pay_period_grain` | `enum` | per `time_clock_settings` | NEW in 04 (header vocabulary): `week`, `biweekly`, `semi_monthly`, `month` |
| `outside_hours_tolerance_minutes` | `integer` | 30 | NEW (04), 0-180 |

| `exception_type` | Test |
|---|---|
| `missing_clock_out` | `auto_closed` or issue `missing_clock_out` (open longer than `auto_close_after_hours`) |
| `open_shift` | `is_open` and within `auto_close_after_hours` (still running) |
| `clock_out_before_clock_in` | issue of `time_clock_service._entry_issues` |
| `long_shift` | issue `long_shift` |
| `edited` | a `time_clock_entry_edits` row; `edited_by <> user_id` marked `edited_by_other`, edit after the pay period end marked `after_period` |
| `deleted` | `is_active = false` with `deleted_by`, `delete_reason` |
| `overtime_daily`, `overtime_weekly` | paid hours above `daily_threshold_hours` / `weekly_threshold_hours` per `overtime_method` |
| `closed_day` | punch on a day where `rpt_office_calendar_days().is_open = false` (holiday or closed weekday) |
| `outside_office_hours` | clock-in earlier or clock-out later than the office's open window ± tolerance |
| `no_office` | `office_id` NULL |

### Data

| Dataset | Columns |
|---|---|
| `rpt_time_clock` | `entry_id`, `user_id`, `office_id`, `clock_in`, `clock_out`, `total_hours`, `work_date`, `entry_type`, `is_paid`, `source`, `clock_basis`, `is_edited`, `auto_closed`, `is_open`, `era` |
| `time_clock_entry_edits` (through `rpt_audit_events`, DATA-36, which already unions the table, data card §2.27) | `entry_id`, `action`, `edited_by`, `edited_at`, `edit_reason`, `original_clock_in`, `original_clock_out`, `new_clock_in`, `new_clock_out` |
| `time_clock_entries` deleted rows | `deleted_at`, `deleted_by`, `delete_reason` (`rpt_time_clock` lists active rows only: NEW `rpt_time_clock_all` requested of 03) |
| `time_clock_settings`, `user_time_clock_config` | thresholds, `overtime_method`, `auto_close_after_hours`, `week_start_day` |
| `rpt_office_calendar_days()` | `is_open`, NEW `open_time`, `close_time` (requested of 03) |

Calculation: one row per (entry, exception type); overtime rows per user-day or user-week with the hours above the
threshold. Wall-clock legacy rows are compared as stored local times; UTC rows are converted to the office zone first.

```
SELECT t.entry_id, t.user_id, t.office_id, t.work_date, x.exception_type, x.detail
FROM rpt_time_clock_all t
JOIN LATERAL (VALUES ('missing_clock_out', t.auto_closed), ('open_shift', t.is_open AND NOT <stale>),
                     ('closed_day', NOT cal.is_open), ('outside_office_hours', <local clock_in> < cal.open_time - :tol OR <local clock_out> > cal.close_time + :tol),
                     ('deleted', NOT t.is_active), ('no_office', t.office_id IS NULL)) x(exception_type, hit) ON x.hit
LEFT JOIN rpt_office_calendar_days(:tenant_id, :office_ids, :date_from, :date_to) cal ON cal.office_id = t.office_id AND cal.calendar_date = t.work_date
UNION ALL <edits from time_clock_entry_edits> UNION ALL <overtime per user-day / user-week>
```

| Era | What works |
|---|---|
| Migrated history | Punch tests (H); 856 auto-closed legacy rows show as `missing_clock_out`; no edit history before the app |
| App era | Edits with editor and reason, deletes, auto-close policy outcomes |
| Both | Closed-day and hours tests use today's office template for past days (k10) |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `user_label` | User | text | `payroll_time` | label |
| `office_name` | Office | text | `aggregate` | label |
| `work_date` | Work date | date | `payroll_time` | label |
| `exception_type` | Exception | enum | `payroll_time` | count by type |
| `clock_in`, `clock_out` | In / Out | datetime (`tz = office`) | `payroll_time` | none |
| `hours` | Hours | decimal | `payroll_time` | sum |
| `hours_over_threshold` | Over threshold | decimal | `payroll_time` | sum |
| `edited_by_label` | Edited by | text | `user_activity` | label |
| `edited_at`, `edit_reason` | Edited at / Reason | datetime, text | `user_activity` | none |
| `original_value`, `new_value` | Before / After | text | `payroll_time` | none |

Grouping: level 1 `group_by` (default user), level 2 pay period; count per type in each subtotal. `summary`: matrix user x
`exception_type` counts. `empty_when` = `no_detail_rows`. Summary cards: exceptions, users with exceptions, overtime hours,
edits by others. `reconciles_with`: none (no metric; hours equal `management.time_clock_report` for the same entries).

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Bars | Exceptions by type, stacked by office |

| Click | Target |
|---|---|
| Row | Time Clock editor at the entry (route key owned by 07; right `utilities_time_clock_editor_full_control` to change) |
| User subtotal | `management.time_clock_report` (`user_ids`, pay period) |

### Actions

Row action `open_entry` (`navigate`). No bulk approve: corrections stay in the time-clock feature with its own audit.
Shipped view "Last pay period". Schedule: the day after each pay period end, office managers, `skip_if_empty`.

### Open questions

- Whether an "approved" state per exception is needed (not stored anywhere today); without it a corrected punch stays
  listed under `edited`, which is the intended audit view.
- Users who punch at two offices on one day: the outside-hours test uses each punch's own office.

## Report access log - `management.report_access_log`

enterprise - P1 - M - `reports_audit_reports_view_only` (key class `user_activity`) - interactive - APP

### Purpose

Compliance officer, practice owner or privacy officer, monthly review and on demand after an incident: who ran, viewed,
exported, printed, downloaded or delivered which report, with how many patients, for which offices, and who holds a leaked
file (watermark). It is the documented periodic activity review (08 O-2, CR-10) and the first stop when a file turns up
outside the practice.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| none (`management.audit_trail` covers record changes, not report access) | Every report event of the engine audit with user, report, scope, row and patient counts, PHI flags, format, recipient and watermark; an export summary by user; all downloads and prints of one watermarked file |

Called for by: 08 §6.8 #4 (filters and formats fixed there); DSO §15 #21; 08 §7.1 X-6 (watermark resolver), X-13.

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `my_offices` | Office rule S-14: an event is visible when `scope_office_ids` ⊆ the caller's allowed offices; NULL-office events only for report-unrestricted viewers |
| `date_range` | `date_range` | `last_7_days` | Basis `occurred_at` (office-local of the working office; UTC printed in `detail`) |
| `user_ids` | `entity_multi` | `all` | Actor (`user_id`) |
| `report_format` | `enum` | `detail` | `detail`, `export_summary`, `downloads_by_watermark` (08 §6.8 #4) |
| `group_by`, `sort_by`, `page_break_by`, `output_format` | filter card 3.9 | `none`, `occurred_at` descending, `none`, `pdf` | |
| `report_keys` | `enum_multi` | `all` | NEW (04): registry keys, custom definitions by id |
| `event_types` | `enum_multi` | `report.run`, `report.view`, `report.export`, `report.download`, `report.print`, `report.deliver`, `report.action` | NEW (04): every event type of 08 §6.2 |
| `output_formats` | `enum_multi` | `all` | NEW (04): `pdf`, `xlsx`, `csv` |
| `has_phi`, `has_sensitive` | `boolean` | `false` | NEW (04): only events with those flags |
| `external_recipient_only` | `boolean` | `false` | NEW (04): `recipient` declared (export dialog `external`) |
| `watermark_id` | `text` | none | NEW (04); required by `downloads_by_watermark`; pattern `^W[0-9A-HJKMNP-TV-Z]{12}$` |

### Data

| Source | Columns |
|---|---|
| `report_audit_events` (08 §6.3) | `occurred_at`, `event_type`, `outcome`, `user_id`, `run_as_user_id`, `source`, `working_office_id`, `ip_address`, `user_agent`, `object_type`, `object_key`, `report_key`, `run_id`, `artifact_id`, `schedule_id`, `delivery_id`, `scope`, `scope_office_ids`, `row_count`, `patient_count`, `data_classes_present`, `has_phi`, `has_sensitive`, `output_format`, `size_bytes`, `watermark_id`, `recipient_user_id`, `recipient`, `channel`, `purpose_code`, `reason_code` |
| `rpt_user_dim` | `user_label` for actor and recipient |
| Registry | report titles (definition version at the event) |

Calculation: a filtered read of the events (index `(tenant_id, occurred_at)`, `(tenant_id, user_id, occurred_at)`,
`(tenant_id, report_key, occurred_at)`; watermark by the partial index). `export_summary`: per user and day, counts of
`report.export` / `download` / `print` / `deliver` events and the distinct patients of their manifests (through
`report_audit_patient_index` rows with `has_egress`). `downloads_by_watermark`: the `report.export` event of the
artifact, then every `report.download` and `report.print` with `artifact_id` of it, by user.

```
SELECT e.occurred_at, e.event_type, e.user_id, e.report_key, e.output_format, e.row_count, e.patient_count, e.has_phi, e.watermark_id
FROM report_audit_events e
WHERE e.tenant_id = :tenant_id AND e.occurred_at >= :from_utc AND e.occurred_at < :to_utc
  AND e.event_type = ANY(:event_types) AND (:all_users OR e.user_id = ANY(:user_ids))
  AND (e.scope_office_ids <@ :allowed_offices OR (:unrestricted AND e.scope_office_ids IS NULL))   -- S-14
ORDER BY e.occurred_at DESC, e.id DESC
```

| Era | What works |
|---|---|
| Before go-live | Nothing: client-side exports of the old reports were never audited (brief §2) |
| From go-live | Every engine event; legacy patient feeds only after D-03 / D-04 wrap them (`object_type = feed`) |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `occurred_at` | When | datetime (`tz = office`) | `user_activity` | none |
| `user_label` | User | text | `user_activity` | count_distinct |
| `event_type` | Event | enum | `user_activity` | count by type |
| `report_title` | Report | text | `aggregate` | label (hidden `report_key`) |
| `scope_label` | Offices | text | `user_activity` | none |
| `row_count`, `patient_count` | Rows / Patients | integer | `user_activity` | sum (patients: per event, not distinct) |
| `has_phi`, `has_sensitive` | PHI / Sensitive | boolean | `user_activity` | count true |
| `output_format`, `size_bytes` | Format / Size | enum, integer | `user_activity` | sum size |
| `recipient_label`, `channel` | Recipient / Channel | text, enum | `user_activity` | none |
| `watermark_id` | Watermark | text | `user_activity` | none |
| `ip_address`, `source` | IP / Source | text, enum | `user_activity` | none |

`export_summary`: user x day rows, `exports`, `downloads`, `prints`, `deliveries`, `distinct_patients_out`.
`downloads_by_watermark`: header block (artifact, report, generated by, generated at) + download rows. No patient
identifiers in any format (counts only); parameters of another office's runs are hidden per S-14. Summary cards: events,
users, PHI exports, distinct patients exported.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Bars | Events by day, stacked by type |

| Click | Target |
|---|---|
| `run_id` | The run page with its criteria echo (read-only, route key owned by 07, `reports_runs_view_all`) |
| `user_label` | `management.user_activity_review` (`user_ids`, same range) |
| `watermark_id` | this report, format `downloads_by_watermark` |

### Actions

No actions. Shipped views "Last 7 days, PHI exports", "External recipients this month". Schedule: monthly to the
compliance reviewer (`skip_if_empty` off: an empty month is evidence too). Alerts are SEC-31 rules (X-13), not this report.

### Open questions

- Reviewer segregation (CR-17): the default grants exclude posting groups; a reviewer who appears in the log reviews
  their own activity - print a note when the caller's own events are in the result.

## Patient report access - `management.patient_report_access`

enterprise - P2 - S - `reports_audit_reports_view_only` (classes `phi_identified`, `user_activity`) - background (index search, 02 §15.6) - APP

### Purpose

Privacy officer answering a patient's question or investigating a complaint ("who looked at my records in reports, and
where did they go"): for one patient, every report run, view, export, print, download, delivery and action that
contained the patient, over up to 366 days. It completes the accounting of disclosures (external) with internal uses.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| none | A per-patient reverse look-up over every report manifest; egress (files, deliveries, actions) separated from on-screen use; bulk runs listed for manual check |

Called for by: 08 §6.8 #6 (source, limits), §6.4 (patient index).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `patient_ids` | `entity_multi` | required | One patient (`max_items` 1); passes `report_scope.assert_patient_visible()` (S-10 c); needs `phi_identified` |
| `date_range` | `date_range` | `last_90_days` | `max_span_days` 366; basis event time |
| `office_scope` | `office_scope` | `my_offices` | Office rule S-14 on the events found |
| `user_ids` | `entity_multi` | `all` | |
| `report_format` | `enum` | `detail` | `detail`, `by_user` (counts per user and event type) |
| `egress_only` | `boolean` | `false` | NEW (04): only runs with `has_egress` |
| `sort_by`, `output_format` | filter card 3.9 | `occurred_at` descending, `pdf` | |

### Data

| Source | Use |
|---|---|
| `report_audit_patient_index` | `patient_ids @> ARRAY[:patient_id]` on the partitions of the range → `run_id`, `part_no`, `has_egress` |
| `report_audit_events` | events with those `run_id`s (or `manifest_run_id`) of types `report.run`, `report.view`, `report.export`, `report.download`, `report.print`, `report.deliver`, `report.action`, `report.drill` |
| `report_audit_events` (`object_type = feed`) | legacy feed reads with `details.patient_ids` containing the patient |
| `report_patient_manifests` | bulk runs (no index row above 50,000 patients): listed as "bulk runs to check" |
| `report_disclosures`, `report_disclosure_patients` | flag events that are also recorded disclosures |

```
WITH r AS (SELECT run_id, bool_or(has_egress) AS has_egress FROM report_audit_patient_index
           WHERE tenant_id = :tenant_id AND created_at >= :from_utc AND created_at < :to_utc AND patient_ids @> ARRAY[:patient_id] GROUP BY run_id)
SELECT e.* FROM report_audit_events e JOIN r ON r.run_id = coalesce(e.manifest_run_id, e.run_id)
WHERE e.event_type IN (...) AND <S-14 predicate>
UNION ALL <feed events> UNION ALL <bulk runs in range: report_runs.patient_count > 50000, from events>
```

| Era | What works |
|---|---|
| Before SEC-29 | Nothing (no index); migrated activity has no report audit |
| From SEC-29 | Complete for engine runs; reads outside reports (chart screens) are not audited (data card §2.27) |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `patient_label` | Patient | text | `phi_identified` | label (header block, key column) |
| `occurred_at` | When | datetime | `user_activity` | none |
| `user_label` | User | text | `user_activity` | count_distinct |
| `event_type` | Event | enum | `user_activity` | count by type |
| `report_title` | Report | text | `aggregate` | label |
| `row_count` | Rows in run | integer | `user_activity` | none |
| `is_egress` | Left the screen | boolean | `user_activity` | count true |
| `output_format`, `recipient_label`, `watermark_id` | Format / Recipient / Watermark | enum, text, text | `user_activity` | none |
| `is_disclosure` | Recorded disclosure | boolean | `user_activity` | count true |

Blocks: `main` (events), `report_end` "Bulk runs to check" (run, user, time, patient count, manifest reference).
`by_user`: user x event type counts. The run writes its own audit event (an access to the patient). Summary cards: users,
events, files and deliveries containing the patient.

### Visuals and drill-through

| Click | Target |
|---|---|
| `user_label` | `management.user_activity_review` (`user_ids`, same range) |
| `watermark_id` | `management.report_access_log` (`downloads_by_watermark`) |
| `is_disclosure` | `management.accounting_of_disclosures` (same patient) |

No chart (a timeline list is the display).

### Actions

No actions. No shipped view or schedule: a saved view or schedule would store a patient id in configuration, so the
definition is `schedulable = false` (header identity rule).

### Open questions

- Whether to include `report.view` events of runs the user only listed, not opened (no row read): proposed no - only
  `report.view` with rows read and `report.run` by the requester.

## Transaction exceptions - `management.transaction_exceptions`

enterprise - P2 - L - `reports_audit_reports_view_only` (classes `user_activity`, `financial_patient`) - interactive - SCHEMA(14)

### Purpose

Owner, office manager without posting rights, or an outside accountant, daily and at month end (KPI §6: "deleted-
transaction reports"; FRO-08 adjustment audit): the money entries that need a second look - deleted, voided, changed and
back-dated entries, corrections after a day was closed, large or unusual adjustments and refunds, charges posted at a fee
other than the schedule in force, and entries keyed outside office hours. Action: question the user, reverse an error,
tighten rights, find embezzlement patterns (void after collection, write-off to own family).

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `management.audit_trail` (raw change events by module and type) | A money-exception taxonomy over the ledger, not raw events: amounts before and after, business date versus keyed date, close status, adjustment class, fee in force; by user and office with counts and amounts; formats that ship as their data ships |

Called for by: 08 §6.8 #10 (source and formats); KPI §3.12 FRO-07, FRO-08, §6; research compliance §27.3 via 08.
Formats `fee_overrides` and `after_hours` are the header's additions (fee overrides as a control view; the price view is
`analytics.fee_realization`).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Transaction office (`rpt_ledger_entries.office_id`); events without an office follow S-14 |
| `date_range` | `date_range` | `yesterday` | Basis per format (below), printed |
| `user_ids` | `entity_multi` | `all` | Entering or acting user (`user_key`; `audit_logs` user for events) |
| `report_format` | `enum` | `deleted_voided` | `deleted_voided`, `changed`, `backdated`, `post_close`, `adjustments_refunds`, `fee_overrides`, `after_hours`, `summary` (all formats as counts and amounts by user) |
| `group_by` | `enum` | `user` | `user`, `office`, `entry_type`, `code`, `none` |
| `sort_by`, `page_break_by`, `output_format` | filter card 3.9 | `amount` descending, `none`, `pdf` | |
| `transaction_types` | `enum_multi` | `all` | Shared key: charge, payment, adjustment, refund, transfer |
| `min_amount` | `decimal` | `0` | NEW (04): absolute amount floor |
| `large_adjustment_threshold` | `decimal` | setting | NEW (04 / 05 §3 setting, default 500.00): flags rows in `adjustments_refunds` |

Settings printed: `backdated_threshold_days`, `after_hours_tolerance_minutes` (NEW, 30).

| Format | Basis | Rows | Phase / data |
|---|---|---|---|
| `deleted_voided` | void date (transaction date until DATA-14) | `rpt_ledger_entries_all` with `is_void`, plus `delete` events on money resources (`rpt_audit_events`) | P2; who and when SCHEMA(14); count H |
| `changed` | event date | `rpt_audit_events` `audit_type = 'edit'` on money resources with `original_amount` / `updated_amount`, `original_date` / `updated_date`, patient and insurance amounts | P2; charge before / after SCHEMA(14) |
| `backdated` | created (keyed) date | entries with `created_date − business date > backdated_threshold_days` (`backdated_entries_count`) | P2; exact with `posting_date` SCHEMA(13); app rows before DATA-13 by `created_at_utc` |
| `post_close` | keyed / event date | entries, voids or edits whose business date is on or before an `office_day_closes` date of the office and that were keyed after the close; lock overrides of `financial_period_locks` | P2 with DATA-29 (`not_available` before) |
| `adjustments_refunds` | transaction date | adjustment and refund legs by user, class (`txn_class`), code; flags `large`, `patient_not_seen_in_month` (no `rpt_visits` row in the month), `no_linked_charge` | P2; class on history REPAIR(12), user on history k6 |
| `fee_overrides` | service date | production charges whose `charged_fee` differs, above or below, from the fee in force (`fee_in_force`, the builder of `analytics.fee_realization`: `schedule_fee` of the charge's schedule, else the patient's current schedule, else the office default, on the service date); `schedule_source` printed; a code without an entry is `no_schedule_entry` in `analytics.fee_realization`, not an override | P2 with DATA-51; exact where the charge carries `fee_schedule_id` (app rows); migrated rows use the patient's current schedule (`schedule_source = patient_current`, k12) |
| `after_hours` | keyed time | money entries and voids keyed before the office's open time or after its close (± tolerance) or on closed days | P2; app rows (`created_at_reliable`) only |

### Data

| Dataset | Columns |
|---|---|
| `rpt_ledger_entries_all` | `entry_id`, `entry_type`, `ledger_bucket`, `txn_class`, `code`, `amount`, `service_date_effective`, `transaction_date`, `created_date`, `created_at_utc`, `created_at_reliable`, `office_id`, `posting_office_id`, `patient_id`, `account_id`, `procedure_id`, `user_key`, `is_void`, `era`; after DATA-14 `voided_at`, `voided_by`, `void_reason`, and after DATA-13 `posted_at`, `posting_date` (NEW columns requested on the view; until then keyed time = `created_at_utc`) |
| `rpt_audit_events` (DATA-36) | `event_id`, `occurred_at_utc`, `user_id`, `office_id`, `patient_id`, `audit_type`, `module_type`, `resource_type`, `resource_id`, `original_amount`, `updated_amount`, `original_patient_amount`, `original_insurance_amount`, `updated_patient_amount`, `updated_insurance_amount`, `original_date`, `updated_date` |
| `office_day_closes`, `financial_period_locks` (DATA-29, passthrough) | office, business date, `closed_at`, `closed_by`, reopen and override rows |
| `rpt_charges`, `rpt_fee_schedule_fees` (DATA-51), `rpt_patient_dim`, `rpt_office_dim` | fee in force through the shared `fee_in_force(charge)` builder |
| `rpt_visits`, `rpt_office_calendar_days()` (NEW `open_time`, `close_time`) | seen-in-month test; office hours |
| `rpt_user_dim` | `user_label`, `is_legacy_login` |

```
-- post_close (keyed time = created_at_utc until DATA-13 exposes posted_at on the view)
SELECT e.*, c.closed_at, c.closed_by FROM rpt_ledger_entries_all e
JOIN office_day_closes c ON c.office_id = e.office_id AND c.business_date >= e.transaction_date AND c.is_current_close
WHERE e.created_at_utc > c.closed_at AND <office-local date of e.created_at_utc> BETWEEN :date_from AND :date_to
-- fee_overrides (fee_in_force: the builder of analytics.fee_realization)
SELECT ch.*, s.schedule_id, s.schedule_source, s.schedule_fee, ch.charged_fee - s.schedule_fee AS fee_difference
FROM rpt_charges ch LEFT JOIN LATERAL fee_in_force(ch) s ON true
WHERE ch.is_production AND s.schedule_fee IS NOT NULL AND ch.charged_fee <> s.schedule_fee
  AND ch.service_date BETWEEN :date_from AND :date_to
```

| Era | What works |
|---|---|
| Migrated history | Voided rows (count, amount; no who or when); fee comparison (H, patient's current schedule, `schedule_source` printed); adjustments unclassified (k1) and their user only as legacy login (k6). No audit events before go-live |
| App era | All formats as their DATA items ship |
| Waits for | DATA-13, DATA-14 (P1), DATA-29 (P2), DATA-36 (P2), DATA-51 (P1) |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `user_label` | User | text | `user_activity` | label / count distinct |
| `office_name` | Office | text | `aggregate` | label |
| `exception_type` | Exception | enum | `user_activity` | count by type (`summary`) |
| `patient_name`, `chart_no` | Patient | text | `phi_identified` | none (hidden `patient_id`, `entity = patient`) |
| `entry_type`, `code` | Type / Code | enum, text | `phi_identified` | label |
| `business_date` | Business date | date | `phi_identified` | none |
| `keyed_at` | Keyed / changed at | datetime (`tz = office`) | `user_activity` | none |
| `amount` | Amount | money | `financial_patient` | sum |
| `original_amount`, `updated_amount` | Before / After | money | `financial_patient` | sum |
| `original_date`, `updated_date` | Date before / after | date | `phi_identified` | none |
| `schedule_fee`, `fee_difference` | Schedule fee / Difference | money | `financial_patient` | sum |
| `days_late` | Days after business date | integer | `user_activity` | max |
| `closed_at`, `closed_by_label` | Closed at / by | datetime, text | `user_activity` | none |
| `reason` | Reason | text | `phi_identified` | none |
| `flags` | Flags | text | `user_activity` | none (`large`, `patient_not_seen_in_month`, `no_linked_charge`, `legacy_login`) |

Grouping: fixed outer office band; level 1 `group_by` (default user) with count and amount subtotals; grand total.
`summary`: matrix user x format, values count and Σ |amount|. `empty_when` = `no_detail_rows`. Summary cards:
`voided_entries_count`, `backdated_entries_count`, `adjustments_posted_amount`, post-close corrections, fee overrides.
`reconciles_with`: `voided_entries_count`, `backdated_entries_count`, `adjustments_posted_amount`.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Bars | Count and amount by user per format (management by exception, no trend) |

| Click | Target |
|---|---|
| Row | Patient ledger at the entry (route key owned by 07; right `transactions_patient_ledger_screen_full_control` or the D-29 alternatives) |
| `user_label` | `management.user_activity_review` (same user, range) |
| Audit event | `management.audit_trail` (resource, date) |
| Closed day | `daily.day_close_reconciliation` (`report_date` = business date) |

### Actions

No bulk actions. Shipped views: "Yesterday's voids and changes", "Month-end adjustments by user", "Fee overrides last
month". Schedules: daily 07:00 `summary` to the owner with `skip_if_empty`; monthly `adjustments_refunds`.

### Open questions

- Segregation: the users under review should not receive this report (CR-17); the shipped schedule recipients default to
  the owner and holders of the `audit` family without posting rights.
- Adjustment to the user's own family account cannot be tested (no user-to-patient link); proposed NEW
  `users.patient_id` link owned by the Users feature.

## User activity review - `management.user_activity_review`

enterprise - P2 - M - `reports_audit_reports_view_only` (key class `user_activity`) - interactive (background above 92 days) - APP

### Purpose

Owner or compliance reviewer, monthly and when a user leaves or is suspected: for each user and day, how much they
changed, printed and exported and how many patients they touched, with flags for activity after hours, on closed days,
at offices they are not assigned to, and above the user's own baseline. It turns two raw logs into a review that takes
minutes per user (08 O-2 "regular activity review").

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `management.audit_trail` (events by user, no baseline or time test) | One row per user-day across record writes and report access; distinct patients changed, viewed in reports and exported; after-hours, closed-day and other-office tests; deviation from the user's own trailing baseline |

Called for by: 08 §6.8 (review reports, O-2), §7.1 X-13 (volume watch); KPI §6 (end-of-day audit reports).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `my_offices` | Event office; S-14 for report events; NULL-office write events (prints) follow the user's working office |
| `date_range` | `date_range` | `last_month` | Event date, office-local |
| `user_ids` | `entity_multi` | `all` | |
| `include_inactive_users` | `boolean` | `true` | Shared key; leavers are the main review case |
| `report_format` | `enum` | `summary` | `summary` (user rows), `user_days` (user-day rows), `flagged` (flagged user-days only) |
| `sort_by`, `page_break_by`, `output_format` | filter card 3.9 | `flag_count` descending, `none`, `pdf` | |
| `flag_types` | `enum_multi` | `all` | NEW (04): `after_hours`, `closed_day`, `unassigned_office`, `above_baseline`, `bulk_export` |
| `baseline_days` | `integer` | 90 | NEW (04), 30-365: trailing window before `date_from` |

Settings: `activity_baseline_z` (NEW, 3.0), `activity_baseline_min_events` (NEW, 20), `after_hours_tolerance_minutes`
(30), `daily_export_patient_alert` (5000, 08 §7.2).

### Data

| Source | Columns |
|---|---|
| `rpt_audit_events` | `user_id`, `occurred_at_utc`, `occurred_date`, `office_id`, `patient_id`, `audit_type`, `resource_type` |
| `report_audit_events` | `user_id`, `occurred_at`, `event_type`, `working_office_id`, `scope_office_ids`, `patient_count`, `has_phi`, `run_id` |
| `report_audit_patient_index` | distinct patients viewed (runs the user ran or paged) and exported (`has_egress`) |
| `user_offices` (passthrough) | assignments; `rpt_user_dim.home_office_id`, `role`, `is_active`, `last_login_at` |
| `rpt_office_calendar_days()` | `is_open`, NEW `open_time`, `close_time` |

Calculation, per user-day: changes = write events by type (create, edit, delete, status change); prints = `print` events
and `report.print`; exports = `report.export` + `report.download`; patients changed = distinct `patient_id` of write
events; patients viewed / exported = distinct ids of the index rows. Flags: `after_hours` = any event outside the office
window ± tolerance (office = event office, else working office, else home office); `closed_day` = the office was closed;
`unassigned_office` = event office not in the user's assignments (assignment is enforced, so this finds privileged users
and users with no assignment); `above_baseline` = day total > mean + z × sd of the user's trailing `baseline_days` with at
least `activity_baseline_min_events` events in the window (NEW measure, 05 §5.12); `bulk_export` = patients exported above
`daily_export_patient_alert`.

```
w := SELECT user_id, occurred_date AS d, office_id, count(*) AS changes, count(DISTINCT patient_id) AS patients_changed,
            bool_or(<outside window>) AS after_hours FROM rpt_audit_events WHERE occurred_date BETWEEN :date_from - :baseline_days AND :date_to GROUP BY 1, 2, 3
r := SELECT user_id, <local date> AS d, count(*) FILTER (WHERE event_type IN ('report.export','report.download')) AS exports, ... FROM report_audit_events ...
b := SELECT user_id, avg(total), stddev_samp(total) FROM (w ∪ r) WHERE d < :date_from GROUP BY 1
SELECT ... FROM (w FULL JOIN r USING (user_id, d)) JOIN b USING (user_id) WHERE d BETWEEN :date_from AND :date_to
```

| Era | What works |
|---|---|
| Before go-live | Nothing (no audit of migrated activity; legacy logins have no account) |
| App era | Writes (`audit_logs`), prints, report events. Reads of chart screens, failed requests and logins are not audited: "patients touched" means changed, printed or in a report, never "looked at in the chart" |
| Waits for | DATA-36 (P2), SEC-29 (patient index, P2); office hours columns (NEW 03) |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `user_label` | User | text | `user_activity` | label (key column) |
| `role`, `is_active` | Role / Active | text, boolean | `user_activity` | label |
| `activity_date` | Date | date | `user_activity` | label (`user_days`) |
| `changes`, `deletes`, `prints`, `exports`, `report_runs` | counts | integer | `user_activity` | sum |
| `patients_changed`, `patients_viewed_in_reports`, `patients_exported` | Distinct patients | integer | `user_activity` | count_distinct (patients over the group) |
| `baseline_daily_mean` | Usual per day | decimal | `user_activity` | none |
| `after_hours_events`, `closed_day_events`, `unassigned_office_events` | Flagged events | integer | `user_activity` | sum |
| `flag_count` | Flags | integer | `user_activity` | sum |
| `flags` | Flags | text | `user_activity` | none |

Grouping: level 1 user; `user_days` adds day rows; grand total. No patient identifiers (counts only). Summary cards: users
reviewed, users with flags, flagged user-days, distinct patients exported. `reconciles_with`: none.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Heat | User x day, colour = activity relative to baseline, dot = flag |

| Click | Target |
|---|---|
| `changes`, `deletes` | `management.audit_trail` (`user_ids`, day) |
| `exports`, `report_runs` | `management.report_access_log` (`user_ids`, day) |
| Money-related flags | `management.transaction_exceptions` (`user_ids`, day, `summary`) |

### Actions

No actions. Shipped views "Last month, flagged only", "Leaver review" (one user, last 90 days). Schedule: monthly
`flagged` to the compliance reviewer, `skip_if_empty`.

### Open questions

- Baseline for new users (fewer than `activity_baseline_min_events`): no `above_baseline` flag, marked `no_baseline`.
- Shared logins defeat every per-user test (KPI FRO-05 pitfall); list users with simultaneous sessions from two IPs as
  a later flag (needs `session_jti` on write events, not stored in `audit_logs`).

## Record data-quality exceptions - `management.data_quality_exceptions`

enterprise - P2 - M - `reports_management_reports_screen_view_only` - interactive - READY

### Purpose

Office manager weekly, and the data owner before a dashboard rollout: the records whose gaps distort reports or block
work - patients without a responsible party or with incomplete insurance, new patients without a source, appointments
without procedures, visits without a note, possible duplicate patients, unpriced charges, patients unreachable for
outreach. Action: fix each record (every row opens it), measure the rate by office and by the user who created the
record, and retrain.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `daily.daily_audit` (visit completeness for one day) | Record-level checks across patients, coverage, appointments, visits and charges for any range; rates by office and creating user; the gaps that make other reports wrong (`Source not recorded`, unpriced production, scheduled production without lines, duplicates) |

Called for by: KPI §3.12 FRO-09 (data completeness), §3.10 MKT-05; 06 §2.5 "Data quality" (`unpriced_charge_count`),
§2.12 `new_patients_missing_source_pct`.

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Per check: patient home office, appointment office, office of service |
| `date_range` | `date_range` | `last_month` | Per check basis (below); a `custom` range from 1990-01-01 serves all-time patient checks |
| `user_ids` | `entity_multi` | `all` | Creating user (app rows only) |
| `report_format` | `enum` | `summary` | `summary` (check x office counts and rates), `detail` (records) |
| `group_by` | `enum` | `check` | `check`, `office`, `user` |
| `sort_by`, `page_break_by`, `output_format` | filter card 3.9 | first option, `none`, `pdf` | |
| `check_keys` | `enum_multi` | `all` | NEW (04): keys below |
| `include_inactive_patients` | `boolean` | `false` | Shared key |

| `check_key` | Basis | Test | Era |
|---|---|---|---|
| `patient_no_responsible_party` | patient created / visit in range | `rpt_patient_dim.account_id` NULL or `rpt_account_dim.guarantor_kind = 'unresolved'` | H (until 03 §6 #11 is applied) |
| `insured_missing_details` | coverage slot of a patient seen in range | `rpt_insurance_coverage` slot without `subscriber_id`, `carrier_id` or `ins_plan_id`, or `relationship` blank | H |
| `new_patient_missing_source` | new-patient date | no `referral_source_id` and blank `referred_by_raw` (`new_patients_missing_source_pct`) | H; app patients SCHEMA(40) |
| `appointment_without_procedures` | appointment date | live, not block, `line_count = 0` | H (94 % of migrated appointments: shown as one summary row for history) |
| `visit_without_note` | visit date | `rpt_visit_audit()` with `has_ledger_transaction AND NOT has_progress_note` | H (`daily_audit_exceptions_count` subset) |
| `possible_duplicate_patient` | patient created in range (all time with a `custom` range) | another active patient with equal normalised last name, first name and `dob`, or equal `dob` and `cell_phone` | H |
| `unpriced_charge` | service date | production charge with `charged_fee` 0 or NULL (`unpriced_charge_count`) | H |
| `patient_no_contact` | patient with a future appointment | no `cell_phone`, no `email` | H |
| `placeholder_patient` | appointment date | `is_placeholder_patient` older than 7 days | H |

### Data

Datasets: `rpt_patient_dim`, `rpt_account_dim`, `rpt_insurance_coverage`, `rpt_referral_facts`, `rpt_appointment_facts`,
`rpt_visit_audit()`, `rpt_charges`, `rpt_user_dim`. Each check is a registered builder in the DATA-02 checker registry
(`rpt_data_quality` keeps the nightly counts; this report lists the rows), so the dashboard counter and the list share one
predicate. Rate = failing records ÷ records tested.

```
SELECT 'possible_duplicate_patient' AS check_key, a.patient_id, b.patient_id AS other_patient_id, a.home_office_id AS office_id
FROM rpt_patient_dim a JOIN rpt_patient_dim b ON b.tenant_id = a.tenant_id AND b.patient_id > a.patient_id
 AND lower(btrim(b.last_name)) = lower(btrim(a.last_name)) AND lower(btrim(b.first_name)) = lower(btrim(a.first_name)) AND b.dob = a.dob
WHERE a.is_active AND b.is_active
UNION ALL SELECT 'appointment_without_procedures', f.patient_id, NULL, f.office_id FROM rpt_appointment_facts f
WHERE NOT f.is_block AND NOT f.is_deleted AND f.line_count = 0 AND f.appointment_date BETWEEN :date_from AND :date_to
UNION ALL ...
```

Unknowable: who created migrated records (k6); whether a migrated "duplicate" is a twin (shown, not merged).

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `check_label` | Check | text | `aggregate` | label |
| `office_name` | Office | text | `aggregate` | label |
| `records_tested` | Tested | integer | `aggregate` | sum |
| `exceptions` | Exceptions | integer | `aggregate` | sum |
| `exception_rate_pct` | Rate | percent | `aggregate` | ratio |
| `compare_rate_pct` | Previous period | percent | `aggregate` | ratio |
| `patient_name`, `chart_no` | Patient | text | `phi_identified` | none (`detail`; hidden `patient_id`) |
| `record_label` | Record | text | `phi_identified` | none (appointment date, charge code, coverage slot) |
| `other_record_label` | Possible duplicate of | text | `phi_identified` | none |
| `created_by_label` | Created by | text | `aggregate` (operational user, 08 rule 12) | label |
| `amount` | Amount | money | `financial_patient` | sum (unpriced: 0; appointment: scheduled fee) |

Grouping: summary = check x office (matrix), grand total; detail = rows grouped by check. Summary cards:
`new_patients_missing_source_pct`, `unpriced_charge_count`, possible duplicates, appointments without procedures.
`reconciles_with`: `new_patients_missing_source_pct`, `unpriced_charge_count`.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Bars | Exception rate per check and office, with previous period |

| Click | Target |
|---|---|
| Patient checks | Patient overview / responsible party / insurance tab (route keys owned by 07) |
| Appointment row | Scheduler (`openSchedulerAtAppointment`) |
| `visit_without_note` | `daily.daily_audit` (that day) |
| `unpriced_charge` | Patient ledger at the charge |

### Actions

Bulk action `create_task` (assign records to a user to fix; task handler). Row actions `open_record` (`navigate`).
Shipped views "This week, all checks", "Duplicates all time". Schedule weekly to office managers, `skip_if_empty`.

### Open questions

- Duplicate merging is a patient-feature workflow; the report only lists candidates.
- Configurable required fields (FRO-09 pitfall): checks are fixed here; an organisation-level enable list is proposed.

## Setup integrity - `management.setup_integrity`

enterprise - P1 - M - `reports_management_reports_screen_view_only` - interactive - READY

### Purpose

System administrator and implementation lead, at go-live and monthly: the setup problems that make whole categories of
reports wrong - codes in use that are inactive or unflagged, payment and adjustment codes without a class, providers
without `provider_kind`, offices without a schedule template or opening date, fee schedules with gaps, carriers without a
payer id, producing providers not linked to a punching user. Each row names the screen that fixes it.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `lists.procedure_codes_list`, `lists.credit_codes_report` (setup listings) | In-use tests (only problems that touch posted or booked data), gap tests across catalogs, the money or volume affected, and the reports each problem distorts |

Called for by: 03 §6 readiness checks (#10, #13, #22, #24); 06 §2.8 "schedule not configured", §2.1
`unclassified_adjustments`; 05 caveats k2, k8, k10.

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `all` | Organisation-level (`office_mode = none` requested; office checks still list the office as an attribute) |
| `date_range` | `date_range` | `trailing_12_months` | In-use window for code, provider and carrier tests |
| `report_format` | `enum` | `summary` | `summary` (check rows with counts and impact), `detail` |
| `sort_by`, `output_format` | filter card 3.9 | `impact_amount` descending, `pdf` | |
| `check_keys` | `enum_multi` | `all` | NEW (04): keys below |

| `check_key` | Test | Distorts |
|---|---|---|
| `inactive_code_in_use` | `rpt_procedure_code_dim.is_active = false` and the code on charges, booked lines or plan items in the window | catalog lists, fee realisation |
| `code_unmapped_category` | code in use with `coverage_category` NULL or `code_type` NULL | insurance estimates, mix by category |
| `code_flags_default` | code in use whose visit, ledger or AR flag still follows the default rule (k8; NEW `flags_reviewed_at` on `procedure_codes`, 03) | Patients Seen, Daily Audit, visits |
| `unclassified_transaction_code` | posted payment or adjustment code without a `transaction_codes` row (03 check #13), amount | net production, net collections (k1) |
| `transaction_code_missing_class` | `rpt_transaction_code_dim` row with `txn_class` or (payments) `tender_class` NULL | deposit, collections mix |
| `provider_kind_unrecognised` | producing provider whose `provider_kind` is not in the vocabulary (03 check #10) | doctor / hygiene splits (k2) |
| `office_no_schedule_template` | active office with `hours_source = 'default'` | capacity, goals, working days (k10) |
| `provider_no_schedule_template` | producing provider without template rows (falls back to office hours) | provider utilisation, goal working days |
| `office_missing_opening_date` | active office with `opening_date` NULL | same-store comparison |
| `fee_schedule_gap` | code posted in the window on a fee schedule (patient's or office default) with no `rpt_fee_schedule_fees` entry in force; office without `default_fee_schedule_id` / `default_ucr_fee_schedule_id` | gross production (k3), fee overrides |
| `carrier_no_payer_id` | carrier with active coverage slots and blank `payer_id` | claims, payer mix |
| `provider_no_user_link` | provider with production in the window and `user_id` NULL | clocked hours, provider-restricted reporting |

### Data

Datasets: `rpt_procedure_code_dim`, `rpt_transaction_code_dim`, `rpt_provider_dim`, `rpt_office_dim`,
`rpt_office_calendar_days()`, `rpt_provider_calendar_days()`, `rpt_fee_schedule_fees`, `rpt_charges`,
`rpt_appointment_procedures`, `rpt_ledger_entries`, `rpt_insurance_coverage`, and `insurance_carriers` (`payer_id`)
through a registered passthrough of the existing table (as `lists.carrier_list` reads it), registered with this report
in P1 (request to 03: register it ahead of the P3 list datasets of DATA-45). Each check is a builder of the DATA-02 checker registry; `rpt_data_quality` holds the nightly count and the
report the rows. Impact = Σ amount or count of posted rows touched in the window.

```
SELECT 'unclassified_transaction_code' AS check_key, e.code AS item_key, count(*) AS rows_affected, sum(abs(e.amount)) AS impact_amount
FROM rpt_ledger_entries e WHERE e.ledger_bucket = 'unclassified_adjustment' AND e.transaction_date BETWEEN :date_from AND :date_to GROUP BY e.code
UNION ALL SELECT 'carrier_no_payer_id', c.id::text, count(DISTINCT s.slot_id), NULL FROM insurance_carriers c
JOIN rpt_insurance_coverage s ON s.carrier_id = c.id WHERE coalesce(btrim(c.payer_id), '') = '' GROUP BY c.id
UNION ALL ...
```

| Era | What works |
|---|---|
| Both | Every check (catalogs are shared by both eras). Every migrated adjustment code is `unclassified` until DATA-12: shown as one aggregated row with the migrated amount, apart from app-era codes |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `check_label` | Check | text | `aggregate` | label |
| `item_label` | Item | text | `aggregate` (code, office, provider, carrier, fee schedule) | count |
| `office_name` | Office | text | `aggregate` | label |
| `rows_affected` | Rows affected | integer | `aggregate` | sum |
| `impact_amount` | Amount affected | money | `financial_practice` | sum |
| `distorts` | Reports affected | text | `aggregate` | none |
| `fix_screen` | Fix in | text | `aggregate` | none (link) |

Summary: check rows with item counts; detail: item rows grouped by check. Summary cards: checks failing, unclassified
amount (`unclassified_adjustments`), offices without a schedule. `reconciles_with`: `unclassified_adjustments`.

### Visuals and drill-through

| Click | Target |
|---|---|
| Item row | The setup screen of the item (procedure codes, credit codes, provider, office schedule, fee schedule, carrier; route keys owned by 07) |
| Code rows | `lists.procedure_codes_list` / `lists.credit_codes_report` (that code) |
| Fee gaps | `lists.procedure_codes_by_fee_schedule` (schedule) |

No chart (a check list).

### Actions

Row action `open_setup` (`navigate`). Shipped view "All checks". Schedule monthly to administrators, `skip_if_empty`.

### Open questions

- `office_mode = none` for this report is not in the S-10 list of 08 (three groups only): request to add it as an
  organisation-level setup report (header rule).
- Flag review (`code_flags_default`) needs a NEW `flags_reviewed_at` column; until then the check lists codes whose flags
  equal the default rule, which is noisy.

## Report usage and health - `management.report_usage`

enterprise - P2 - S - `reports_management_reports_screen_view_only` + `reports_runs_manage_all` - interactive - APP

### Purpose

Reporting administrator and the implementation team, monthly and after each release: which reports and saved views are
used and which are not, which runs are slow, fail or time out, which schedules fail, pause or skip, and which formats are
exported. Decisions: retire or promote reports and views, index or reclassify slow definitions (02 §16.2: above 5 %
promotions or timeouts), fix broken schedules before their owners notice, train users who never open the hub.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| none | Usage, performance and delivery health of the module itself, from the engine's own tables, as a report with export and schedule (the API `GET /reports/stats` serves numbers, not a reviewed output) |

Called for by: DSO §15 #21; 02 §13 row 22 (`GET /reports/stats`), §16.1-§16.3.

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `all` | Runs whose `scope_office_ids` ⊆ the caller's offices (S-14 applied to runs); tenant-wide runs for report-unrestricted callers |
| `date_range` | `date_range` | `last_30_days` | Basis `report_runs.created_at`; beyond 400 days the `usage` format reads `report.run` events |
| `user_ids` | `entity_multi` | `all` | Requesting user; any user dimension needs `user_activity` |
| `report_format` | `enum` | `usage` | `usage` (by report and view), `performance`, `schedules`, `exports`, `saved_views` |
| `group_by` | `enum` | `report` | `report`, `category`, `source`, `user`, `day` |
| `sort_by`, `output_format` | filter card 3.9 | `runs` descending, `pdf` | |
| `report_keys` | `enum_multi` | `all` | NEW (04, shared with `management.report_access_log`) |
| `unused_days` | `integer` | 90 | NEW (04): saved views and favorites not used for this many days |

### Data

| Table (engine, 02) | Columns |
|---|---|
| `report_runs` | `report_key`, `definition_version`, `report_format`, `source`, `requested_by`, `saved_view_id`, `schedule_id`, `cost_class`, `execution_mode`, `status`, `error_code`, `promoted_at`, `promotion_reason`, `cache_hit`, `row_count`, `duration_ms`, `queue_ms`, `query_ms`, `render_ms`, `scope_office_ids`, `created_at` |
| `report_artifacts` (02 §7.5) | output format, size, run |
| `report_schedules`, `report_deliveries` | `is_active`, `paused_reason`, `last_status`, `consecutive_failures`, `next_run_at`; delivery `status` (`sent`, `failed`, `skipped_*`), `first_opened_at` |
| `report_saved_views`, `report_favorites`, `report_recents` | `use_count`, `last_used_at`, `visibility`, `is_archived`, `open_count` |
| `report_audit_events` | `report.run`, `report.view` counts older than 400 days; `dashboard.view` |

These engine tables are read through internal passthrough datasets registered for this report (NEW, 02 §4.2
whitelist), never by tenants' custom reports.

```
SELECT r.report_key, count(*) AS runs, count(DISTINCT r.requested_by) AS users,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY r.duration_ms) AS p95_ms,
       count(*) FILTER (WHERE r.status = 'failed') AS failures, count(*) FILTER (WHERE r.error_code = 'timeout') AS timeouts,
       count(*) FILTER (WHERE r.promoted_at IS NOT NULL) AS promotions, avg(r.cache_hit::int) AS cache_hit_rate
FROM report_runs r WHERE r.tenant_id = :tenant_id AND r.created_at >= :from_utc AND r.created_at < :to_utc AND r.source <> 'preview'
GROUP BY r.report_key
```

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `report_title` | Report | text | `aggregate` | label (hidden `report_key`; `Never run` rows for registered reports without runs) |
| `category` | Category | enum | `aggregate` | label |
| `runs`, `users`, `views`, `scheduled_runs`, `drill_runs` | counts | integer | `aggregate` (`user_activity` when grouped by user) | sum (users: distinct) |
| `p50_ms`, `p95_ms` | Duration p50 / p95 | integer | `aggregate` | none (builder: percentile per grouping set) |
| `failures`, `timeouts`, `promotions` | Failures / Timeouts / Promotions | integer | `aggregate` | sum |
| `failure_rate_pct`, `promotion_rate_pct`, `cache_hit_rate_pct` | Rates | percent | `aggregate` | ratio |
| `exports_pdf`, `exports_xlsx`, `exports_csv` | Exports | integer | `aggregate` | sum |
| `last_run_at` | Last run | datetime | `aggregate` | max |

`schedules`: schedule rows (name, report, owner label - `user_activity`, `last_status`, `paused_reason`,
`consecutive_failures`, deliveries sent / failed / skipped, open rate). `saved_views`: views unused for `unused_days`
(owner, visibility, last used). `performance`: slowest runs with `error_code`, `promotion_reason`. Summary cards: runs,
active users, failure rate, schedules paused. `reconciles_with`: none.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Bars | Runs by report (top 20 + `other`); p95 duration with the class budget line (02 §15.6) |

| Click | Target |
|---|---|
| Report row | The report's run history (route key owned by 07, `reports_runs_view_all`) |
| Schedule row | Schedule management (route key owned by 07, `reports_schedules_manage_all`) |
| Failure | The failed run's diagnostics page (operations; `reports_runs_manage_all`) |

### Actions

No bulk actions (pausing and taking over schedules stay in schedule management). Shipped views "Last 30 days",
"Failing schedules". Schedule weekly to reporting administrators.

### Open questions

- Whether practice users (not only operations) should see `performance`; proposed: yes for administrators, without SQL
  diagnostics (those stay on the operations page).

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-NEW-10 | Production trend and mix (`analytics.production_trend_mix`): matrix builder, five mix dimensions, `production_basis`, `payer_basis`, PY compare, detail legs | P2 | M | DATA-06, DATA-33, DATA-12 (net on history), MET-26, NEW parameters in 04 | Grand totals equal `gross_production`, `charged_production`, `net_production` for 3 fixture ranges; a category expands to codes whose sum equals the category; a migrated month shows net = charged with the unclassified amount beside it; a charge without stamped carrier is labelled `current_coverage` |
| RPT-NEW-11 | Actual versus scheduled production (`analytics.production_vs_schedule`) and the appointment-grain start-of-day snapshot request | P4 | M | DATA-48, NEW `rpt_scheduled_production_snapshot_lines` (requested of 03 as a DATA-48 acceptance criterion), DATA-16, DATA-17 (moved out) | For a fixture day with 5 booked, 1 cancelled, 1 added and 1 walk-in appointment, the bridge closes to the produced amount; without the appointment-grain table the lost, added and kept columns render `not_available` and the office x provider bridge still closes; a day before the snapshot go-live renders `history starts on <date>` |
| RPT-NEW-12 | Collections trend and mix (`analytics.collections_trend_mix`) with the rates format | P2 | M | DATA-06, DATA-12, DATA-26 (provider by allocation), DATA-33 (carrier) | Totals equal `gross_collections`, `net_collections`; net = gross − collection adjustments with refunds printed only as the "of which" sub-column; the seven rate variants equal their 05 metrics per month; the assumed-tender share prints on migrated months; a carrier slice of migrated payments is `Carrier not recorded` |
| RPT-NEW-13 | Service-to-payment lag (`analytics.payment_lag`): payment and service cohort formats, `payment_lag` bucket set | P2 | M | DATA-20, DATA-26, NEW bucket set in 03 | `days_to_payment` equals the 05 metric; bucket amounts sum to the allocated collections; a derived-only range prints "allocation derived"; the insurance side of a migrated month is `not_available` and shows `claim_days_to_payment`; a service month younger than 90 days is provisional |
| RPT-NEW-14 | Adjustments and write-offs (`analytics.adjustment_writeoff_analysis`) with NEW `adjustment_report_class` | P2 | M | DATA-03, DATA-12, NEW column in 03, `discount_rate_pct` in 05 | Class sums equal production plus collection plus unclassified adjustments; transfers and opening balances are outside every rate; production rates exist only for the production-side classes and class `refund` has only a collections rate; rates equal `writeoff_rate_pct`, `contractual_writeoff_rate_pct`, `bad_debt_rate_pct` |
| RPT-NEW-15 | A/R trend (`monthly.ar_trend`): frozen and recomputed month ends, both attributions, bridge format | P2 | L | DATA-27, DATA-30, ENG background runs, `last_12_month_ends` preset (04) | The default range yields twelve month-end columns; a month end with a snapshot returns the frozen values after a later back-dated edit; a recomputed month is labelled; the bridge difference is 0 on the fixture (I-2); office totals sum to the organisation per month end under both attributions with credits included and are never summed across months |
| RPT-NEW-16 | Time-of-service collection (`management.time_of_service_collection`) with later recovery, still-open amount, pro-rata provider split and one credited user per unit | P2 | M | DATA-06, NEW recovery metrics, provider binding and user-credit rule in 05 | `otc_collection_pct` and `uncollected_copay_amount` equal the 05 metrics; a unit paid 10 days later counts as recovered with 10 days; provider shares of a two-provider unit sum to the unit; user rows of a unit posted by two users sum to the office total |
| RPT-NEW-17 | Payment plans and financing (`management.payment_plan_portfolio`) and the shared contract definitions (unposted instalment, delinquent contract) | P2 | M | DATA-37, DATA-20, NEW plan metrics and contract definitions in 05 §5.11, `plan_type = both` in 04 | A fixture contract with one unposted and one posted-unpaid instalment shows both; delinquency follows `payment_plan_grace_days`; the delinquent contracts equal the rows of `worklists.payment_plan_overdue`; ortho rows equal `ortho.ortho_contract_health` for the same `report_date`; financing share equals financing payments ÷ patient collections |
| RPT-NEW-18 | Fee schedule and UCR realisation (`analytics.fee_realization`) with the four realisation tests and the shared `fee_in_force` builder | P2 | M | DATA-51, NEW `fee_in_force(charge)` builder (03, with DATA-51), DATA-26 (collected per line), NEW metrics in 05 | For a code with two dated schedule entries the schedule fee follows the service date (half-open `effective_date` / `effective_to`); a migrated line uses the patient's schedule with `schedule_source = patient_current`; unpriced count equals `unpriced_charge_count`; the below-schedule lines equal the below-schedule rows of `fee_overrides` for the same range |
| RPT-NEW-19 | Payer mix and plan profitability (`insurance.payer_mix_profitability`) | P2 | L | DATA-33, DATA-21, DATA-32, DATA-26; chair-hour column P3 (DATA-16) | Carrier production sums to charged production with `Self-pay` and `Payer not recorded`; yield columns read only service months older than `maturity_days` and money collected by day 90, and print the cut date; claim speed and denial columns equal the 05 metrics filtered by carrier; the current-coverage share is printed |
| RPT-NEW-20 | Claim cycle and first-pass performance (`insurance.claim_cycle_performance`) and NEW `rpt_claim_status_events` | P2 | M | DATA-21, DATA-25, DATA-31, NEW dataset in 03 | Four headline rates equal their 05 metrics; a claim sent twice counts as a resubmission; secondary lag is computed within a claim family; pre-authorisations are excluded |
| RPT-NEW-21 | Denial analysis (`insurance.denial_analysis`) with recovery outcomes | P3 | M | DATA-31, RPT-NEW-20 (status events), DATA-38 for ERA codes | A denied claim paid after resubmission is `recovered_paid` with its days; open amount equals the `worklists.denied_claims` total; before DATA-31 the recovery format is `not_available` and the summary is labelled proxy |
| RPT-NEW-22 | Eligibility verification compliance (`insurance.eligibility_verification_compliance`) | P3 | M | DATA-34 (`rpt_eligibility_checks`), DATA-16, NEW metrics in 05 | An appointment verified 2 days ahead inside a 30-day window counts in time; one verified after the start does not; past periods before DATA-34 render `history starts on <date>` |
| RPT-NEW-23 | Day close and deposit reconciliation (`daily.day_close_reconciliation`) with the deposit and close passthroughs | P2 | L | DATA-28, DATA-29, DATA-30, DATA-13, DATA-14, DATA-55 | R-09 holds per office-day (posted = deposited + undeposited); a payment voided after close appears as a post-close correction; compliance equals `day_close_compliance_pct`; a locked month is shown locked |
| RPT-NEW-24 | Cash-conversion waterfall (`analytics.cash_conversion_waterfall`) with the overlap rule and stage detail lists | P4 | M | DATA-30, RPT-NEW-14, RPT-NEW-16, `cash_conversion_waterfall_amount` and the overlap rule in 05 §5.13 (challenge) | Stages 1, 2 and 4 equal the metric for their `waterfall_stage`; a fixture patient portion not collected at the visit and still open 120 days later counts once, in stage 3, and is netted from stage 5; estimated cash = gross minus the four stages; each stage's detail rows sum to the stage |
| RPT-NEW-25 | Provider pay basis (`management.provider_pay_basis`) with the statement format | P2 | L | DATA-26, DATA-29, DATA-30, DATA-23, NEW reversal and lab metrics in 05, `pay_period_grain` in 04 | Components equal `net_production` and `provider_income` by provider; a locked period returns the frozen values after a back-dated payment; an open period is marked `open`; a restricted caller receives only own rows and no office total |
| RPT-NEW-26 | Claims backlog trend (`insurance.claims_backlog_trend`): month-end matrix by carrier, age bucket and tier, movement bridge | P2 | M | DATA-30, DATA-31, DATA-25, RPT-NEW-20 (status events), NEW month-end rows by carrier and age bucket (05 §10 / 03), `last_12_month_ends` preset (04) | A frozen month end returns its stored values after a later payment; a recomputed month end equals `insurance.outstanding_claims` run for that `report_date`; the movement closes (difference 0) on the fixture; `unknown`-quality claims are excluded and counted |
| RPT-NEW-27 | Insurance estimate accuracy (`insurance.estimate_accuracy_analysis`) with bias, miss share and patient-balance surprise | P2 | M | DATA-21, DATA-10, NEW metrics (05 §5.3), `accuracy_tolerance_pct` (04 / 05); DATA-49 (P4, estimate at claim creation) | Carrier rows equal `insurance_estimate_accuracy_pct`; a fixture line estimated 80.00, paid 50.00 and written off 0 gives bias −30.00, counts as a miss at 10 % tolerance and adds 30.00 to the patient surprise; pre-authorisations are excluded |
| RPT-NEW-28 | Statement and collections effectiveness (`statements.statement_collection_effectiveness`) | P2 | M | DATA-22, DATA-35, DATA-52 (`patient_statements`), NEW statement and collections metrics (05 §5.2) | A fixture account paying 20 days after its statement counts in the 30-day columns of that run only; a payment after a second statement counts for the second; a failed e-mail appears in `statement_delivery_failed_count`; agency payments after `sent_to_collections_at` form the recovery |
| RPT-NEW-40 | `appointment.schedule_utilization` definition: summary, detail and look-ahead formats, capacity basis switch, Scheduler-day drill | P3 | L | DATA-16, DATA-55, ENG matrix pivot, 05 NEW `open_hours` / `broken_hours`, 04 NEW `capacity_basis` / `look_ahead_open_days` | For a fixture office-month, `booked_hours`, `provider_scheduled_hours`, `provider_utilization_pct` and `production_per_hour` equal the `dashboards.schedule_capacity` tiles; a provider-day without template renders "schedule not configured"; a look-ahead cell opens that Scheduler day |
| RPT-NEW-41 | `appointment.broken_appointment_analysis` definition: rates by weekday, lead time, notice, patient kind, provider, reason; recovery, days to next appointment, value lost, repeat patients | P3 | M | DATA-16, DATA-17 (notice, reason), 05 NEW `lead_time_band` / `notice_band` / `days_to_next_appointment_median`, `worklists.broken_appointments` | Status rates and recovery % equal the 05 metrics on the fixture; a migrated-only month shows rates and "history starts on" for value lost and notice; the unrecovered count drills to the worklist with the same rows |
| RPT-NEW-42 | `appointment.patient_flow_times` definition: stamp durations with median / p90 per grouping set, coverage and anomaly counts | P3 | M | DATA-17 (`seated_on`, `available_on`), 02 total `median` / `percentile` request, 05 NEW flow measures | On fixture appointments with known stamps the medians per provider and per total match a hand computation; a stamp on another date is excluded and counted; before DATA-17 only arrival offset and check-in to check-out are served |
| RPT-NEW-43 | `recall.recare_effectiveness` definition: four variants by hygienist, visit kind, carrier; recall position by overdue band; retention by code group | P3 | L | DATA-41 (maintained rows, optional), `rpt_recall_due()`, DATA-16, 05 §2.8 variants | Each variant equals its metric for the same hygienist and range; at-visit variants return `not_available` with `history_starts_on` for a migrated-only month; band counts sum to the patients in recall; the not-reappointed drill returns the complement rows |
| RPT-NEW-44 | `analytics.clinical_mix` definition: metric x provider matrix with office and organisation comparators, per-metric detail | P3 | M | DATA-04, MET-03 (clinical review of [I] groups), 05 NEW `procedures_per_100_exams` | Every rate equals its 05 metric at office level; the provider columns recompute to the office value as a ratio of sums; a member below `rate_min_denominator` is greyed; the numerator drill lists exactly the counted lines |
| RPT-NEW-45 | `treatment_plan.clinical_follow_through_gaps` definition with the `follow_through_pairs` table (05 §4) and bulk outreach | P3 | M | DATA-04, DATA-51, DATA-57 (completeness caveat), 05 NEW `follow_through_pairs`, `tooth_replacement`, `crown_prep` | Fixture patients with an RCT and no crown on the same tooth after 6 months are `open_gap`; with a crown booked they are `scheduled`; an anterior RCT is excluded; a gap rate excludes `in_window` events; the SMS action skips patients without consent and reports the count |
| RPT-NEW-46 | `treatment_plan.case_acceptance_funnel` definition: cohort funnel, presentation per exam by provider, by member, backlog ageing with benefits | P3 | L | DATA-56, DATA-25, DATA-39, DATA-32, 05 NEW `days_to_schedule_median` / `days_to_complete_median` | Stage amounts of a cohort sum to the presented amount under the strict hierarchy; acceptance and completion equal the 05 metrics; format `presentation` equals `treatment_presented_per_exam` and `diagnostic_pct` per provider and recomputes the office row as a ratio of sums; provisional cohorts are flagged; a backlog cell drills to `worklists.unscheduled_treatment` with the same item total |
| RPT-NEW-47 | `analytics.new_patient_acquisition` definition: source, channel, zip, office, provider splits; first-visit quality; second-visit conversion (the one 05 definition) and cohort format | P3 | L | DATA-19, DATA-40, DATA-17, 05 NEW `first_visit_production_avg` / second-visit keys / `payer_type` dimension, 08 zip class, `matured_12m_cohorts` preset (04) | `new_patients_first_visit` equals the 05 metric; second-visit 6-month % of a fixture cohort matches a hand count and is provisional until the window closes; a patient seen by two providers at the first visit counts under both and once in the total; app patients with free-text source fall into `Unmatched text` |
| RPT-NEW-48 | `analytics.patient_retention_cohorts` definition: bridge, cohort triangle, by member, lost-patient detail | P3 | L | DATA-19, DATA-44 (residual), DATA-48 (P4 speed), 05 NEW `cohort_retention_pct`, MET-16 identity, `matured_24m_cohorts` preset (04) | start + new + reactivated − lost + residual = end for every fixture period; `attrition_rate_pct` equals the metric; the default cohort range fills every cell up to 24 months; immature cohort cells are blank and provisional; the lost drill opens `worklists.reactivation` with the same patients |
| RPT-NEW-49 | `analytics.patient_value` definition: annual and lifetime value per patient and account, top accounts | P4 | L | DATA-48, DATA-26 (allocated reading), 05 NEW value keys | `patient_value_annual` equals the metric; patient-level lifetime production equals `rpt_patient_activity.lifetime_charged_production` on the charged basis; account totals equal the sum of current members; the k14 caveat prints for migrated periods |
| RPT-NEW-50 | `analytics.provider_scorecard` definition: matrix and review sheet over the metric registry, peers and suppression | P4 | L | ENG-51, ENG-50, DASH-38, DATA-24, DATA-30, 02 `python_builder` whitelist entry | Every cell equals the provider-dashboard metric for the same parameters; a restricted caller receives only the own row and no office value below 5 other providers; a degraded cell has no band and no rank; the review-sheet PDF breaks per provider |
| RPT-NEW-51 | `appointment.lab_case_performance` definition: turnaround, late share, missing for visit, cost per case, lab cost % | P3 | M | DATA-23, 05 NEW lab keys | `lab_cost_amount`, `lab_cost_pct`, `lab_turnaround_days` equal the 05 metrics; lab rows leave `lab_cost_pct` blank; cases without a due date are counted as late unknown; counts drill to `appointment.lab_report` with the same cases |
| RPT-NEW-52 | `ortho.ortho_contract_health` definition: monthly matrix, by orthodontist, contracts detail | P3 | L | DATA-37, DATA-42, the shared contract definitions of RPT-NEW-17 (05 §5.11) | Month-end active base and unposted amounts of a fixture contract set match a hand computation; delinquent contracts equal the ortho rows of `management.payment_plan_portfolio` for the same date; current-state rows appear only in the `report_date` column; months before the first contract render "history starts on" |
| RPT-NEW-53 | `analytics.revenue_opportunity` definition: six categories, what-if rates, kind subtotals, per-category rights | P4 | M | the six worklists (06 §6), DATA-26, DATA-27, DATA-30, 05 NEW `recall_opportunity_amount` / `claims_unsent_amount` / `revenue_opportunity_default_rates`, 02 `right_codes_any[]` | Each category value equals its metric for the same scope and date; a caller without the insurance family sees the two insurance rows as `restricted`; no total adds production and cash; each row drills to its worklist (or print counterpart before it ships) |
| RPT-NEW-70 | Office comparison and same-store growth (`analytics.office_comparison`): three formats, metric packs, comparator rows, rank movement, same-store set with exclusions | P4 | L | ENG-50, ENG-51, MET-23, MET-21, DATA-47, NEW pack registry (06), NEW parameters (04), office groups setup (06 §5.2) | Group and organisation rows equal the metric service for the same scope (never summed ratios); a newly opened office is excluded as `opened_too_recently` and named; weighted, simple and trimmed growth equal hand-computed fixture values; an office below `rate_min_denominator` is unranked; no shipped pack contains `rcm_health_score`; a caller with two assigned offices gets comparators over those two only |
| RPT-NEW-71 | Goal attainment and pacing (`analytics.goal_attainment`): month, year-to-date and detail formats over the goal resolver | P3 | M | DATA-24, MET-17, DATA-55, `analytics_goals_view` (SEC) | The 05 §8.4 edge cases render as specified (no goal → `No goal set`, goal met → needed 0, today excluded both sides); an office row uses its office goal row when one exists; a provider-restricted caller sees only the own row and no office total |
| RPT-NEW-72 | Referral and marketing source return (`referral.referral_source_return`) and the `marketing_spend` input (cost columns P4) | P3 | M | DATA-40, DATA-19, NEW `marketing_spend` (03, P4), NEW metrics (05 §5.10), `matured_12m_cohorts` preset (04) | New patients per source sum to `new_patients_first_visit` with a `Source not recorded` row; with the default range every cohort is mature and `value_12m` is filled; a later range fills `value_to_date` and keeps immature cohorts out of the window columns; the conversion drill opens `analytics.new_patient_acquisition` with the same cohort; with spend entered, `cost_per_new_patient` equals the 05 metric |
| RPT-NEW-73 | Online booking funnel (`analytics.online_booking_funnel`) and the registered `booking_requests` passthrough | P3 | M | registered passthrough of the existing `booking_requests` table (03), DATA-16, DATA-17 | Fixture: 10 requests (7 approved, 2 declined, 1 expired; 6 kept, 4 first visits) yield those stage counts; conversion equals `online_booking_conversion_pct`; a range before the first request renders `history starts on <date>` |
| RPT-NEW-74 | Reminder, confirmation and campaign effectiveness (`analytics.communication_effectiveness`) with NEW `delivery_status` | P3 | M | DATA-43, DATA-17, NEW column (03) | On `appointment_reminder` rows `message_delivery_pct` and `message_confirmation_pct` equal `reminder_delivery_rate_pct` and `reminder_confirmation_rate_pct`; the outcomes total row equals `confirmation_rate_pct` and `no_show_rate_pct`; log-only `queued` messages count as `not_sent`, not undelivered; the confirmed / unconfirmed split sums to all live past appointments |
| RPT-NEW-75 | Outreach results (`analytics.outreach_results`) over the follow-up tables | P4 | M | DASH-29, DASH-43, MET-19, NEW outreach metrics (05) | For a fixture campaign the realised value equals the fees booked inside the attribution window; completion equals `follow_up_completion_pct`; a team member sees only the own row; a worklist of a family the caller lacks is one `restricted` row |
| RPT-NEW-76 | Staff hours against production (`management.staff_productivity`); format `wage_ratio` (hygienist production-to-wage ratio) in P4 | P3 | M | DATA-23, ENG-34, NEW `staff_role` vocabulary (03), MET-27 and the NEW metric (05 §5.8) for `wage_ratio` | Clocked hours equal `management.time_clock_report` for the same users and range; production per clocked hour is a ratio of sums at every level; without `payroll_wage` the wage columns and `wage_ratio` format are absent; past months print `current_rate` |
| RPT-NEW-77 | Time-clock exceptions (`management.time_clock_exceptions`) with `rpt_time_clock_all` and office open and close times | P2 | S | DATA-23, DATA-36 (`time_clock_entry_edits` through `rpt_audit_events`), NEW columns (03), `pay_period_grain` (04) | Fixture punches produce exactly one row per exception type (auto-closed, edited by another user, deleted, closed day, outside hours, weekly overtime); a caller without `payroll_time` sees only own punches; an empty pay period skips delivery |
| RPT-NEW-78 | Report access log (`management.report_access_log`): `detail`, `export_summary`, `downloads_by_watermark` | P1 | M | SEC-08, SEC-20, ENG-10 | Each filter of 08 §6.8 #4 narrows the fixture events; an event of another office's run is hidden from a restricted viewer (S-14); a watermark lists its export and every download and print |
| RPT-NEW-79 | Patient report access (`management.patient_report_access`) with bulk-run list | P2 | S | SEC-29, SEC-28 | A fixture patient in 3 runs (one exported, one delivered) returns those events with `is_egress`; a run above 50,000 patients appears under "bulk runs to check"; the run writes its own audit event; span above 366 days is rejected; the definition is `schedulable = false` and refuses a saved view with a patient id |
| RPT-NEW-80 | Transaction exceptions (`management.transaction_exceptions`): seven formats and the summary, each gated on its data item | P2 | L | DATA-13 (with `posted_at` exposed on the views), DATA-14, DATA-29, DATA-36, DATA-51, the `fee_in_force` builder of RPT-NEW-18 | Counts equal `voided_entries_count`, `backdated_entries_count`; a payment voided after the day close is a `post_close` row; a charge at a fee other than the fee in force is a `fee_overrides` row with its `schedule_source`, and the below-schedule rows equal the `below_schedule` lines of `analytics.fee_realization` for the same range; a format whose data item is missing renders `not_available` |
| RPT-NEW-81 | User activity review (`management.user_activity_review`) with baseline and time tests | P2 | M | DATA-36, SEC-29, NEW office hours columns (03), NEW baseline measure and settings (05) | A fixture user with a 4x-baseline day, an after-hours edit and a closed-day print gets exactly those three flags; distinct patients exported equal the index; a new user gets `no_baseline` |
| RPT-NEW-82 | Record data-quality exceptions (`management.data_quality_exceptions`) as DATA-02 checker builders | P2 | M | DATA-02, DATA-18, DATA-21, DATA-40 | Each check returns its fixture rows and its rate; the summary count of `unpriced_charge` equals `unpriced_charge_count` and of `new_patient_missing_source` the numerator of `new_patients_missing_source_pct`; a duplicate pair is listed once |
| RPT-NEW-83 | Setup integrity (`management.setup_integrity`) with fix-screen links | P1 | M | DATA-02, DATA-03, DATA-04, DATA-05, DATA-51, DATA-55, registered `insurance_carriers` passthrough (03, P1) | Each of the 12 checks fires on its fixture defect and is quiet on a clean fixture; the unclassified amount equals `unclassified_adjustments`; every item row resolves a setup route key |
| RPT-NEW-84 | Report usage and health (`management.report_usage`) over engine tables | P2 | S | ENG-43, ENG-44, ENG-47, NEW internal passthroughs (02) | Runs, failures and p95 per report equal `GET /reports/stats` for the same window; a paused schedule shows its `paused_reason`; registered reports without runs appear as `Never run`; a caller without `reports_runs_manage_all` is refused |
| RPT-NEW-85 | Cross-office patient flow (`analytics.cross_office_patient_flow`): summary, pairs, referrals, detail | P4 | M | DATA-47, DATA-39, 05 `cross_office_patients`, NEW `cross_office_production_share_pct` / `internal_referral_completed_pct` (05 §5.13), NEW parameters (04) | `cross_office_patients` equals the 05 metric; own + visiting patients of an office equal its `patients_seen`; a fixture patient seen at two offices appears once in the organisation total; an internal referral charged at the sister office within the window is completed |
