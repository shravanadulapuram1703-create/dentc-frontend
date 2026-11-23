# New analytics reports - specifications

These 45 report definitions are things the legacy tool does not have. They turn the module from a parity catalog into an
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

### Financial and revenue cycle (16)

| report_key | Title | Purpose in one line | Closest legacy report (what is different) | Called for by | Phase |
|---|---|---|---|---|---|
| `analytics.production_trend_mix` | Production trend and mix | Gross, charged and net production per month, with PY, by category, then code, by doctor / hygiene / other and by payer, with shares and production per procedure | `daily.production_analysis_report` (one range and one cut; no period columns, PY, shares or net basis) | KPI §3.1, §3.9; CT TS-1; 06 §2.5 "By category, then code", "By carrier" | P2. H; production-adjustment codes on history REPAIR(12) |
| `analytics.production_vs_schedule` | Actual versus scheduled production | For each office-day and provider: production scheduled at start of day, what was added, what was lost to breaks and what was actually produced, so schedule accuracy and same-day additions show | `daily.scheduled_production` (forward look only; no start-of-day freeze, no comparison with what was produced) | KPI §3.1; 06 §2.4 "Unplanned and schedule variance", §2.8 "Schedule accuracy" | P4. APP; SCHEMA(48) start-of-day snapshot |
| `analytics.collections_trend_mix` | Collections trend and mix | Gross and net collections per month, with PY, by payer (patient, insurance, carrier), tender class and office, with patient share and the four collection % variants side by side | `daily.collection_report` (one range, list or code grouping; no trend, no PY, no variants) | KPI §3.2; CT TS-1, I-38; 06 §2.6 "By payer and tender", "Collection %" | P2. H; carrier on payments APP / SCHEMA(33); tender on history REPAIR(12) |
| `analytics.payment_lag` | Service-to-payment lag | How long money takes to arrive after service, by payer, carrier, provider and office: lag buckets (0, 1-30, 31-60, 61-90, over 90 days), payment-weighted days, share collected by day 30 and day 90 | `monthly.waterfall_report` (collected to date by service month, with no lag distribution by payer) | KPI §3.2 `days_to_payment`; DSO §14.6; 06 §2.6 "Speed" | P2. Derived oldest-first allocation on history (marked `is_derived`); persisted allocation SCHEMA(26) |
| `analytics.adjustment_writeoff_analysis` | Adjustments and write-offs | Adjustments by class (contractual, discretionary or courtesy, bad debt, correction, refund), code, provider, entering user and carrier, with write-off rates against office-fee and charged production | `daily.special_transaction_report` (a transaction list by code; no class roll-up, no rates, no carrier) | KPI §3.12 FRO-08; DSO §14.6; 06 §2.5 "Write-offs and adjustments", §2.6 "Bad debt" | P2. Class on history REPAIR(12); carrier of write-offs APP |
| `monthly.ar_trend` | A/R trend and days outstanding | A/R at each month end: ageing buckets, patient and insurance split, credit balances, over-90 %, days in A/R and DSO variants, by office (transaction or home attribution) | `monthly.aging_report` (one as-of date, no trend) | KPI §2.8, §3.2; CT TS-3, I-38; 06 §2.6 "A/R trend", §2.1 receivables rows | P2. Frozen from the first snapshot SCHEMA(30); earlier month ends recomputed and labelled `recomputed` |
| `management.time_of_service_collection` | Time-of-service collection | Estimated patient portion collected on the day of service, by office, provider, check-out user and weekday; uncollected amount and its later recovery | `management.uncollected_copay` (a one-day list of who still owes; no rate, no trend, no user) | KPI §3.2, §3.12 FRO-05; DSO §14.6; 06 §2.4 "Money at the desk", §2.6 "Time of service" | P2. H with derived patient portion (k13) |
| `management.payment_plan_portfolio` | Payment plans and financing | Regular and ortho contracts: count, remaining balance, instalments due against posted and paid, delinquency rate and days, financing-tender share of patient collections | `management.payment_plan_charges` (instalments due on one billing date) and `lists.patients_on_payment_plan` (roster) | KPI §3.2, §3.11; CT I-37; 06 §2.6 "Work queues" (`worklists.payment_plan_overdue`) | P2. APP (no contract migrated); SCHEMA(37) |
| `analytics.fee_realization` | Fee schedule and UCR realisation | Per code and fee schedule: UCR, scheduled fee, average posted fee, average collected per procedure, realisation %, volume. Lists codes posted at zero or unpriced, and codes billed below the schedule in force | `lists.procedure_codes_by_fee_schedule` (setup listing; no volume, no posted or collected amounts) | CT I-24 (internal part only); KPI §3.1 `implied_writeoff`; 06 §2.5 "Data quality" (`unpriced_charge_count`) | P2. Fee lookup DATA-51; collected per line SCHEMA(26); history H for fees |
| `insurance.payer_mix_profitability` | Payer mix and plan profitability | Per carrier and plan: patients, insured share of production, contractual write-off rate, collected per procedure and per chair hour, days to pay, denial rate | `daily.production_report` by carrier (production only; no write-off, speed or yield by payer) | KPI §3.3; DSO §14.6 "payer mix with time to collect"; 06 §2.7 "Payers" scorecard | P2. Payer on the service date SCHEMA(33) (history uses today's coverage, k12); chair hours P3 |
| `insurance.claim_cycle_performance` | Claim cycle and first-pass performance | Claims by carrier, office, provider and user: submission lag, same-day rate, turnaround to first payment, first-pass rate (proxy), resubmissions, secondary-claim lag after primary payment | `insurance.claims_list` (claim rows by status; no cycle statistics) | KPI §3.3; DSO §14.6; CT TS-4; 06 §2.7 "Speed and quality", "Claims submitted" | P2. Stage timing APP from DATA-25; migrated claims REPAIR (k5) |
| `insurance.denial_analysis` | Denial analysis | Denied claims and amounts by reason and remark code, carrier, procedure code, provider and office, with recovery after appeal or resubmission | `insurance.835_denial_report` (ERA denials only, needs a clearinghouse; no recovery outcome) | DSO §14.6 "Denial analytics"; CT I-37; 06 §2.0.4 "Denial counts", §2.7 "Work queues" | P3. APP; SCHEMA(31) manual denial fields; ERA reason codes only with DATA-38 |
| `insurance.eligibility_verification_compliance` | Eligibility verification compliance | Share of insured appointments verified within the validity window before the visit, by office, user, carrier and lead time; not-eligible findings and their visit outcome | `insurance.dps_eligibility_report` (verification list for a date; no compliance rate or outcome) | KPI §3.3 RCM; CT TS-4; 06 §2.7 "Eligibility", §2.16 "Insurance desk" | P3. APP; history of verifications SCHEMA(34) |
| `daily.day_close_reconciliation` | Day close and deposit reconciliation | For each office-day: posted payments by tender against deposited amounts, undeposited remainder, close status, who closed it and when, corrections after close; month-lock status | `daily.deposit_slip` (one deposit's contents; no ledger-to-deposit variance, no close history) | KPI §6 routines (end of day, end of month); CT TS-2; 06 §2.6 "Cash controls" | P2. APP; SCHEMA(28), SCHEMA(29) |
| `analytics.cash_conversion_waterfall` | Cash-conversion waterfall | From office-fee production to estimated cash over the trailing 12 months, stage by stage: contractual, time-of-service gap, bad debt, A/R over 90 at risk. Each stage lists its rows | `monthly.waterfall_report` (collections by service month, not stage losses) | DSO §14.6; KPI §3.13 DSO-08; 06 §2.7 "Cash conversion" (drill target "stage lists"), §2.14 "Revenue cycle" | P4. H for stages (k1, k13); A/R stage from snapshots SCHEMA(30) |
| `management.provider_pay_basis` | Provider pay basis | For each provider, pay period and office: production, adjusted (net) production, allocated collections, lab fees and refunds/reversals. These are the inputs of production-, collection- or lab-net pay, shown side by side | `monthly.income_allocation` (allocated income only; no production basis or lab deduction) | DSO §14.7, §15 #17 | P4. Allocations SCHEMA(26); lab fees DATA-23 (APP); pay rules not stored (no pay is computed) |

### Schedule, hygiene, treatment, patients and providers (14)

| report_key | Title | Purpose in one line | Closest legacy report (what is different) | Called for by | Phase |
|---|---|---|---|---|---|
| `appointment.schedule_utilization` | Schedule utilisation and capacity | For each provider, operatory and day: scheduled hours, booked hours, chair hours, open time, utilisation %, production per hour and per visit. Has a look-back format and a look-ahead (open time) format | `appointment.appointment_list` (appointment rows; no capacity or open time) | KPI §3.4; CT TS-7; 06 §2.8 "Provider utilisation", "Chair utilisation", "Open time ahead", §2.2 `provider_scheduled_hours` (no drill target in 06) | P3. Capacity uses today's template (k10); capacity history SCHEMA(43) |
| `appointment.broken_appointment_analysis` | Cancellations, no-shows and recovery | Broken-appointment rates by weekday, lead time, notice, patient kind, provider and reason; recovery %, days to rebook, value lost; repeat patients | `appointment.appointment_list` Cancelled / Missed lists (rows only; no rates, recovery or repeat view) | KPI §2.7, §3.4; CT TS-7; 06 §2.8 "Broken appointments", "Recovery", "By weekday and patient kind" | P3. H for status rates; reasons and notice APP / SCHEMA(17) |
| `appointment.patient_flow_times` | Patient flow and wait times | Check-in to seated, seated to check-out and late starts, by provider, operatory, weekday and appointment type | `appointment.appointment_time_stamps` (stamps per appointment; no durations or distributions) | CT §3.1 (huddle anatomy); KPI §3.4 | P3. APP; SCHEMA(17) stamps; type SCHEMA(43) |
| `recall.recare_effectiveness` | Hygiene reappointment and recall effectiveness | The four hygiene reappointment variants by hygienist, visit kind and carrier. Also pre-appointment %, recall overdue bands, and retention by code group (child prophy, adult prophy, SRP, perio) | `recall.scheduled_recall_report` and `recall.recall_due_report` (patient lists; no rates or retention) | KPI §2.5, §3.5; CT I-39; 06 §2.9 "Reappointment", "Recall position", "Retention" | P3. H via derived recall intervals; maintained recall SCHEMA(41); at-visit variants APP |
| `analytics.clinical_mix` | Procedure and perio mix | Procedure mix by code group and provider as per-visit rates: perio patient %, SRP per day, adjuncts, fluoride, bitewings at recare, FMX/pano for new patients, crowns and endo per exam. Compared with the office and organisation | `daily.production_analysis_report` (counts and fees per code; no per-visit ratios, no peer comparison) | KPI §3.5, §3.9; CT I-39; 06 §2.9 "Perio and adjuncts" | P3. H (code groups DATA-04) |
| `treatment_plan.clinical_follow_through_gaps` | Clinical follow-through gaps | Patients for whom code group A was completed with no follow-on group B within N months. Pairs: root canal without crown, SRP without perio maintenance, extraction without replacement, crown prep without seat. Has bulk outreach | `treatment_plan.treatment_plan_status` (planned items only; misses follow-ons never planned) | CT I-13 (has / lacks code logic, P0), §5 TS-5; 06 §12.5 ideas 13-14 "partly" | P3. H (works on migrated charges) |
| `treatment_plan.case_acceptance_funnel` | Case acceptance funnel | Cohorts by diagnosed month: presented to accepted to scheduled to completed, by provider, counsellor and category. Also time to schedule and complete, and ageing of the unscheduled backlog with remaining benefits | `treatment_plan.treatment_plan_analysis` (status totals for one range; no cohort stages or time to schedule) | KPI §2.6, §3.6; CT I-40, D-13; 06 §2.10 "Funnel", "Acceptance", "Completion", "Unscheduled treatment" | P3. APP; DATA-56, events DATA-25, office SCHEMA(39) |
| `analytics.new_patient_acquisition` | New patient acquisition and conversion | New patients by source, booking channel, zip, office and provider; first-visit production, imaging and reappointment; conversion to a second visit within 6 and 12 months | `lists.patient_list_new_patient` (roster) and `referral.referral_summary_report` (counts by source; no conversion) | KPI §3.7; CT TS-6; 06 §2.11 "New patients", "First-visit quality", "Where new patients come from" | P3. H for visits; source SCHEMA(40); channel SCHEMA(17) |
| `analytics.patient_retention_cohorts` | Retention, attrition and the active base | Retention curves by first-visit cohort at 6, 12, 18 and 24 months. Includes an active-base bridge per period (start + new + reactivated - lost = end), attrition and reactivation by office and provider | `lists.patient_list` (status today; no cohort or flow) | KPI §2.4, §3.7; CT I-18; 06 §2.11 "Base", "Flow", "Retention" | P3. H (visit history); losses by status change SCHEMA(44) |
| `analytics.patient_value` | Patient and family value | Annual and lifetime production and collections per patient and per guarantor account, by first-visit cohort, source, payer type and office. Has a top-accounts list | `referral.referral_production_list` (production by referral source, not per patient or account over time) | KPI §3.7; DSO §14.4; 06 §2.11 "Value" | P4. H for production; collections SCHEMA(26) |
| `analytics.provider_scorecard` | Provider scorecard | Providers x metric set (doctor or hygienist set of 05 §5.8) for a period, with office value, peer median and quartile, goal and band. The monthly review sheet per provider | `my_reports.production_report` and `monthly.income_allocation` (production or income alone, one provider) | CT I-7, TS-10, D-12; KPI §3.8; 06 §3.4, §2.9 "Hygienist scorecard" | P4. Metrics P1-P3; peers ENG-51 |
| `appointment.lab_case_performance` | Lab case performance | For each lab and provider: cases, turnaround, late share, cases not back before the appointment, lab cost and lab cost % of production | `appointment.lab_cost_report` (cost per case; no turnaround or lateness) | KPI §3.9; 06 §2.0.4 lab metrics | P3. APP (DATA-23) |
| `ortho.ortho_contract_health` | Ortho starts, debonds and contract health | Exams to starts, starts per debond, active base, beyond planned end, no next appointment, remaining to bill, unposted instalments, delinquent contracts, by month and orthodontist | `ortho.patients_by_ortho_status_with_time_in_treatment` (status roster; no flow, conversion or contract money) | KPI §3.11; 06 §2.13 | P3. APP; SCHEMA(42) |
| `analytics.revenue_opportunity` | Revenue opportunity | Recoverable revenue by category (unscheduled treatment, recall due, broken appointments, unbilled, outstanding claims, patient A/R past due), ranked by value, with a what-if rate. Each category opens its worklist | none (dashboards show the counters separately) | CT I-12; KPI §8 (leading indicators) | P4. As the worklists' datasets |

### Multi-office, executive, marketing, staff and control (15)

| report_key | Title | Purpose in one line | Closest legacy report (what is different) | Called for by | Phase |
|---|---|---|---|---|---|
| `analytics.office_comparison` | Office comparison and same-store growth | Offices and office groups x a metric pack (`core`, `rcm`, `clinical`) with group subtotals, ranks, rank movement, median and top-quartile comparators, and per-working-day values. The same-store format names the comparable offices and the reason for each exclusion | `monthly.executive_summary` run office by office (no ranking, comparators or same-store set) | DSO §14.2-§14.4; KPI §3.13; CT I-22; 06 §2.14 "Office scorecard", "Same-store growth" (drill target "office scorecard"), §5 | P4. H (k1); groups need office groups set up |
| `analytics.goal_attainment` | Goal attainment and pacing | Production against goal by provider, office and group for the month and year to date: percent of goal, needed per remaining working day, forecast (done + scheduled), run-rate projection | `daily.scheduled_production` ("Estimated Prod." column only; no attainment or pacing) | KPI §7; CT TS-10, I-3, I-8; DSO §14.8; 06 §4, §2.1 / §2.2 goal rows, §2.5 "Production to goal" (drill target "goal rows") | P3. Goals DATA-24 / MET-17 (no migrated goals) |
| `referral.referral_source_return` | Referral and marketing source return | By source (patient, doctor, campaign, online): new patients, first visits kept, production and collections of those patients over 12 and 24 months, referral cost. Cost per new patient and return on spend once spend is entered | `referral.referral_production_list` (production of referred patients; no conversion, cost or return) | CT D-14, I-41; KPI §3.10; DSO §14.4; 06 §2.12 "Value by source", "Cost per new patient" (no drill target in 06) | P3. Links SCHEMA(40); cost columns P4, NEW `marketing_spend` input (05 §5.10) |
| `analytics.online_booking_funnel` | Online booking funnel | Booking requests to approved to appointment to kept to new patient to first-visit production. Shown by office, request type, emergency flag, hour received and response time | `lists.online_registered_patients` (registrations; no request funnel) | KPI §3.10; CT I-42; 06 §2.12 "Online booking", §2.8 "Booking activity" | P3. APP; `booking_requests` passthrough (DATA-45) |
| `analytics.communication_effectiveness` | Reminder, confirmation and campaign effectiveness | Messages sent to delivered to replied or confirmed to kept or booked, by channel, message type, lead time and office. Shows no-show rate of confirmed against unconfirmed visits, undeliverable contacts and campaign appointments | `appointment.appointments_confirmed_via_vendors` (confirmed list; no funnel or outcome) | CT D-14, I-42; KPI §3.10; 06 §2.12 "Communication funnel", "Campaigns", §2.8 "Confirmations" | P3. APP; SCHEMA(43); migrated texts heuristic |
| `analytics.outreach_results` | Outreach results | Worklist attempts, outcomes, items resolved, and value scheduled and collected inside the attribution window. Shown by worklist, user, channel and outcome code | none (legacy Task Manager shows open tasks, not results) | CT D-6, I-11; 06 DASH-43 "Outreach results view" (no key in 06), §6.1 | P4. APP; `worklist_followups`, `worklist_events` (DASH-29) |
| `management.staff_productivity` | Staff hours against production | Clocked staff hours by office-day and role against production, collections, visits and appointments created. Also production per clocked hour and the hygienist production-to-wage ratio | `management.time_clock_report` (punches and totals; no output side) | KPI §3.8, §3.12, §3.13 DSO-11; 06 §2.9 "Wages", §2.1 "Clocked hours" | P4. Hours H (DATA-23); wage ratio needs class `payroll_wage` |
| `management.time_clock_exceptions` | Time-clock exceptions | Missed punches, open shifts, edits after the fact (with editor), overtime, punches on closed days or outside office hours, by user and pay period | `management.time_clock_report` (lists punches; exceptions must be found by eye) | KPI §3.12; DSO §14.7 (payroll review) | P2. H; edits from `time_clock_entry_edits` |
| `management.report_access_log` | Report access log | Who ran, viewed, exported, printed, downloaded or delivered which report, with patient counts and the watermark resolver | none | 08 §6.8 #4; DSO §15 #21 | P1. Engine audit (`report_audit_events`) |
| `management.patient_report_access` | Patient report access | For one patient: every report run, view, export, print, delivery and action that contained the patient | none | 08 §6.8 #6 | P2. Engine audit; `report_audit_patient_index` |
| `management.transaction_exceptions` | Transaction exceptions | Deleted, voided, changed and back-dated money entries; post-close corrections; adjustments and refunds by user. Adds formats `fee_overrides` (posted fee differs from the schedule in force) and `after_hours` | `management.audit_trail` (raw change events; no money-exception taxonomy) | 08 §6.8 #10; KPI §3.12 FRO-08; KPI §6 (deleted-transaction reports) | P2 to P4. SCHEMA(13), SCHEMA(14), SCHEMA(29); fee overrides DATA-51 |
| `management.user_activity_review` | User activity review | For each user: changes, prints, exports and patients touched per day. Flags activity after hours, on closed days, from other offices, or above the user's own baseline | `management.audit_trail` (events by user; no baseline or after-hours test) | 08 §6.8 (review reports, O-2); KPI §6 | P2. APP; writes and report events only (reads are not audited, data card §2.27) |
| `management.data_quality_exceptions` | Record data-quality exceptions | Record-level gaps that distort reports or block work: patients without responsible party or insurance details, new patients without source, appointments without procedures, visits without notes, possible duplicate patients (name + birth date), unpriced charges | `daily.daily_audit` (visit completeness for a day only) | KPI §3.12 FRO-09; 06 §2.5 "Data quality", §2.12 `new_patients_missing_source_pct` | P2. H; checks of DATA-02 |
| `management.setup_integrity` | Setup integrity | Organisation-level setup problems: inactive or unflagged procedure codes in use, unclassified payment and adjustment codes, providers without `provider_kind`, offices without a schedule template, fee schedules with gaps, carriers without a payer id | `lists.procedure_codes_list`, `lists.credit_codes_report` (listings; no in-use or gap tests) | 03 §6 readiness checks; 06 §2.8 "schedule not configured", §2.1 `unclassified_adjustments` | P1. H; DATA-02, DATA-03, DATA-04, DATA-05 |
| `management.report_usage` | Report usage and health | Most and least run reports and views, slowest runs, timeouts and failures, schedules failing or skipped, exports by format, unused saved views | none | DSO §15 #21; 02 `GET /reports/stats` | P2. Engine tables `report_runs`, `report_schedules`, `report_deliveries` |

## Shared rules

**Identity.**
- Every report here is `kind = standard`, `paging_mode = snapshot`, `side_effects = none` and `schedulable = true`.
- None is a worklist. Where rows need follow-up, the report drills to a worklist of 06 §6.
- `legacy = null` and `legacy_names = []`. AD-8 parity rules do not apply.
- `keywords[]` carry the market names of the concept (for example "Revenue Finder", "Provider Pulse", "matchback") so that
  hub search finds them.
- Category key `analytics` is NEW. Brief §4 lists no such key, so this is a challenge recorded against the brief. Its
  registry entry is owned by `02_architecture.md` §3.1 and its hub group "Analytics" by `07_ux_blueprint.md`.
- Keys in other categories sit in their subject's hub group.

**Standard parameters.** Keys come from `catalog/reference/filter_card.md` §3. NEW keys are owned by
`04_filter_framework.md`.

| Parameter (value keys) | Type | Default | Rule |
|---|---|---|---|
| `office_scope` (`office_ids`, `office_group_id`, `office_group_ids`, `all_offices`) | `office_scope` | `working_office`; `all` on `analytics.office_comparison` | A working context, never a fence. `all` = every office the caller may read. Office column = `scope.office_attribution` (PD-6). A multi-office run adds the `Office : <name>` outer band (`fixed_outer` with `["ctx", "multi_office"]`) and an organisation total |
| `office_attribution` | `enum` | per report (PD-6) | NEW in 04 (06 §2.6 request): `transaction_office` or `home_office` on A/R and patient reports; printed in the criteria echo |
| `date_range` (`date_from`, `date_to`, `date_preset`) | `date_range` | `last_month` on period and cohort reports, `month_to_date` on operational reports, `trailing_12_months` on trend reports | Inclusive, office-local. Fixed `date_basis` per report (AD-9, PD-8), printed. Cohort reports apply the range to the cohort date and state the window |
| `report_date` | `date` (role `as_of`) | `today` | Point-in-time reports and blocks. A past date is served from snapshots where they exist (DATA-30), otherwise recomputed and labelled `recomputed` |
| `compare_to` (`compare_date_from`, `compare_date_to`) | `enum` | `previous_year` on trend reports, `none` elsewhere | `none`, `previous_period`, `previous_year`, `goal` (P3, DATA-24), `custom` (filter card §12, `supports_comparison = true`). These reports use it from their own phase, not P4: request to 04 |
| `time_grain` | `enum` | `month` | NEW in 04 (06 §2.0.2): `day`, `week`, `month`, `quarter`, `year`; only grains the metrics allow (05 `time_grains[]`) |
| `provider_ids` | `entity_multi` | `all` | `provider_role` = `scope.provider_attribution` (PD-7). The office roster is listed first and nobody is excluded. Forced to `current_user_report_provider` under PD-11 on definitions with `provider_restriction = self_unless_privileged` |
| `production_group` | `enum` | `all` | NEW in 04 (06 §2.0.2): `all`, `doctor`, `hygiene`, `other` |
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
| `management.time_of_service_collection`, `management.payment_plan_portfolio`, `management.provider_pay_basis`, `management.time_clock_exceptions`, `management.staff_productivity` | `management` | `provider_pay_basis`: `provider_comp`. Time-clock reports: `payroll_time` (user restriction UR-2); the wage ratio needs `payroll_wage` |
| `insurance.*` of this list | `insurance` | `financial_practice`; detail rows `phi_identified` |
| `appointment.*`, `analytics.online_booking_funnel`, `analytics.communication_effectiveness` | `appointment` | `aggregate`; detail rows `phi_identified` |
| `recall.recare_effectiveness` | `recall` | `aggregate`, `provider_comp` by hygienist |
| `treatment_plan.*` | `treatment_plan` | `financial_practice`; `clinical` on code-pair detail |
| `analytics.new_patient_acquisition`, `analytics.patient_retention_cohorts` | `lists_patient` | `aggregate`; detail `phi_identified` |
| `referral.referral_source_return` | `referral` | `financial_practice` |
| `ortho.ortho_contract_health` | `ortho` | `financial_practice` |
| `analytics.provider_scorecard`, `analytics.goal_attainment` | `analytics_provider_scorecards_view`; `analytics_goals_view` | `provider_comp`; `provider_restriction = self_unless_privileged`; peer values follow SC-1 (mean from 5 other providers, median or quartile from 10; never minimum or maximum of others) |
| `analytics.office_comparison` | `analytics_office_comparison_view` (+ `office_scope_view_all_offices` for `all`) | comparators over the caller's readable offices only (06 §5.4) |
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

06 drill targets without a key, and the key chosen here:

| Drill target in 06 | Key chosen |
|---|---|
| goal rows (§2.1, §2.2, §2.5) | `analytics.goal_attainment` |
| stage lists (§2.7 cash conversion) | `analytics.cash_conversion_waterfall` |
| "office scorecard" (§2.14 same-store tile) | `analytics.office_comparison` |
| outreach results view (DASH-43) | `analytics.outreach_results` |
| `provider_scheduled_hours` and open time | `appointment.schedule_utilization`; a cell still opens the Scheduler day |
| `cost_per_new_patient` | `referral.referral_source_return` |

06 needs to add these keys to the drill map of 2.0.4 (DASH-01 lint).

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
| RCM health score by office | Metric pack `rcm` of `analytics.office_comparison` and `dashboards.insurance_rcm`; the score is off by default (06 §2.7) |
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
| Accounting of disclosures, access rights matrix, access change log, audit integrity check, access readiness | Compliance controls specified by 08 §6.8 (#5, #7, #8, #9, #11); not analytics, so they stay there |
| Treatment-team attribution | No assistant or coordinator per visit is stored (CT I-10) |
| Separate referring-doctor scorecard | Doctors are sources in `referral.referral_source_return` |
| Benefits-expiry campaign list | `worklists.unscheduled_treatment` filters (`benefits_remaining_min`, benefit year end) and `insurance.benefits_used_unused` |
| Short-call (ASAP) list | Scheduler call list; `worklists.broken_appointments` (`include_off_call_list`) |
| Forms completed before check-in | `appointment.smartassist_report_card` and the `forms_missing` flag of `worklists.todays_patients` (DATA-54) |
| Lab remakes | No remake field on lab cases |
| Payment-request (text-to-pay) results | No payment-request feature or data |
| Patient satisfaction and reviews | No survey or review data |
