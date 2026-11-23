# 05 — Metric (KPI) catalog

Owns (per `00_design_brief.md` §7): every KPI — its formula on `rpt_*` datasets, variants, organisation settings, code-group
content, benchmarks and availability (AD-4). Does not define datasets or their columns (`03_data_foundation.md`), the metric
service, its API or caching (`02_architecture.md` §10), parameter types (`04_filter_framework.md`), dashboards, goal entry
screens, worklists or the assistant (`06_dashboards.md`), right codes and data-class grants (`08_security_compliance.md`).

Static work only: code and documents were read, nothing was executed. Backend paths are relative to `dentc-backend/`;
`FE:` = `dentc-frontend/`.

**Tags** — **[V]** read by the author in the cited file · **[A]** verified in the cited analysis document · **[R]** from a
research document (external source, vendor tags kept, e.g. `DI-SOD26`, `PDDS-DD26`, `DPA`) · **[I]** inference · **NEW** does
not exist yet. AD-*, PD-*, P0..P5 refer to the brief; `DATA-nn`, `R-nn`, `O-n` to `03_data_foundation.md`; `ENG-nn` to
`02_architecture.md`. Work items of this document are `MET-nn` (section 11).

Verified for this document [V]: every dataset column used in a formula against the column tables and SQL of
`03_data_foundation.md` §2, §3.3, §5 and §9.1 — a column that 03 does not have yet is marked NEW and listed as a request in
12.3; `app/services/report_service.py` L60-315 (the seven keys of `GET /reports/summary` and how each is computed);
`app/api/v1/dashboard.py` L66-106; `app/db/models/clinical.py` L45-46 (`patient_procedures.hygienist_id` = "second (hygiene)
provider recorded alongside the treating provider"; `duration_minutes`); `FE:src/features/procedures/procedureEntryService.ts`
L195, L253 (charge entry sends `hygienist_id`); `app/db/models/scheduling.py` L105 with `app/db/base.py` L41-45
(`appointment_procedures.created_at` through `CreatedAtMixin`); `provider_setup.py` (`provider_schedule_days` with
`effective_from`, `provider_holidays`); `office_setup.py` (`office_schedule_days`, unique per office and weekday, no dates);
`account.py` (`account_holidays`); `staff.py` (`time_clock_entries`); `access.py` (`user_time_clock_config.pay_rate`);
`comms.py` (`sms_messages.message_type`, `reply_intent`; `campaigns` has no cost column); `patients.py` (`referrals.cost`,
no period); `appointnow.py` (`booking_requests.status`, `is_new_patient`); `app/services/sms_service.py` L77-87 (message
type and reply intent vocabularies); `provider_directory_service.py` L94-104; `access_rights_catalog.py` L40, L158-159 (the
rights `setup_provider_goals_screen_*` are entries of `REMOVED_ROWS`, the codes the catalog curation deletes; no goals
table, service or screen exists in either repository); `FE:src/components/reports/lib/reportMetrics.ts` and
`FE:src/components/dashboard/lib/` (the client-side KPI code this catalog replaces).

**Reading order.** Sections 1-4 define the model, the disputed base definitions, the settings and the code groups. Section 5
is the catalog (261 metric keys: 227 fixed-definition metrics, 9 aliases, 21 named slices, 4 synonyms). Sections 6-7 map the reference
dashboards and the legacy analytics product. Sections 8-10 cover goals, benchmarks and snapshots. Work items are section 11;
requests to other documents are `REQ-nn` (12.3).

---

## 1. The metric definition model

### 1.1 Registry objects

| Object | Key | Defined in | Stored as | Served by |
|---|---|---|---|---|
| Dataset exposure | `dataset` = the `rpt_*` name | 03 (columns), this document (which fields are exposed as dimensions or measures) | code | `GET /analytics/metadata` (02 #54) |
| Dimension | `dimension_key` | 1.5 | code | same |
| Base measure | `measure_key` | 5.0.2 | code | same; usable in the builder (`02` §11 `measures[]`) |
| Metric | `metric_key` | section 5 | code: `app/analytics/metrics/registry/<group>.py` (NEW), model in `app/analytics/metrics/model.py` (NEW) | `GET /analytics/metrics/{metric_key}`, `POST /analytics/metrics/query` |
| Organisation setting | `setting_key` | section 3 | rows of `rpt_tenant_settings` (03 §3.6, DATA-02) + NEW `metric_setting_changes` | `GET` / `PUT /analytics/settings` — NEW, not in the 02 API table (#54-64) yet: REQ-12 |
| Code group | `group_key` | section 4 | `rpt_code_groups`, `rpt_code_group_members` (03 §2.5, DATA-04) | `GET` / `PUT /analytics/code-groups/{group_key}` — NEW: REQ-12 |
| Target and band | (`metric_key`, scope, period) | 8.2 | NEW `metric_targets` | `/analytics/goals` (02 #62; payload shape owned by 06) |
| Benchmark | `benchmark_key` | section 9 | NEW `metric_benchmarks` (reference data) | `include[] = benchmark` of the metric query; the reference list through `GET /analytics/benchmarks` — NEW: REQ-12 |

The three NEW endpoints change what every figure of an organisation means, so they are gated by one administration right:
`analytics_metric_settings_manage` (NEW, requested from 08: REQ-15), and by `reports_administer` until 08 adopts it — the
interim rule `07_ux_blueprint.md` §13.4 A-11 already uses. Reading settings needs no right beyond a metric right.

Metric definitions are code: reviewed, versioned by `definition_version`, identical in every organisation. An organisation
changes results only through settings, code-group members, targets and (P5) custom KPIs built from base measures. This is
what makes dashboards, reports, exports and the assistant agree (AD-4, `research/competitor_analytics_teardown.md` §1 #2).

### 1.2 Fields every metric carries

| Field | Type | Meaning and rule |
|---|---|---|
| `metric_key` | snake_case, at most 60 chars | Stable and never reused. Suffixes: `_pct` = ratio displayed as a percentage (wire value is a fraction, 02 §3.3) · `_amount` = money where the bare noun is ambiguous · `_count` · `_days`, `_hours` · `_pp` = percentage points · `_cv`, `_index` = unit-free |
| `label`, `short_label` | text | The label says gross, charged or net explicitly (the reference product hides "net": `analysis/reference_screenshots.md` §2.5) |
| `aliases[]` | text[] | Legacy and vendor names ("Total Collection", "Collections as a % of Production", "Hygiene Re-Appointment %"). Indexed by hub search, the glossary and the assistant (PD-14) |
| `description` | one sentence | Tooltip text |
| `glossary_md` | markdown | "How this is calculated": formula in words, inclusions, exclusions, date basis, attribution, settings in force, caveats, the report that reconciles it |
| `group` | enum | `production`, `collections_ar`, `insurance_rcm`, `scheduling`, `hygiene`, `treatment`, `patients`, `providers`, `clinical_mix`, `marketing`, `ortho`, `front_office`, `multi_office` |
| `metric_family` | 08 §2.3 vocabulary | The family a right must list for the metric to be readable (08 metric-family rule): `production`, `collections`, `ar`, `insurance`, `scheduling`, `treatment_plan`, `recall`, `patients`, `referrals`, `ortho`, `payroll`. Default from `group`: `production`, `clinical_mix`, `multi_office` → `production` · `collections_ar` → `collections` (flows) or `ar` (the `ar` rows) · `insurance_rcm` → `insurance` · `scheduling`, `front_office` → `scheduling` · `hygiene` → `recall` · `treatment` → `treatment_plan` · `patients` → `patients` · `marketing` → `referrals` · `ortho` → `ortho` · `providers` → the family of the underlying metric; hours and wage ratios → `payroll` |
| `aggregation` | `simple` · `ratio` · `cumulative` · `derived` | How the value and its totals are formed (1.3) |
| `time_semantics` | `flow` · `state` | `flow` = activity of a period; `state` = a reading as of a date. Decides only `as_of`, snapshots and "last value of the period" (1.3, section 10) — never how members are totalled |
| `additivity` | `additive` · `non_additive` | `additive` = members can be summed (periods too when `time_semantics = flow`) and roll-up sources may be declared; everything else is recomputed (1.3) |
| `components[]` | list | `{key, dataset, agg, expr, filters[], date_columns{basis: column}, bindings{dimension_key: column}}` with `agg` in `sum`, `count`, `count_distinct`, `avg`, `min`, `max`; or `{key, metric}` reusing another metric; or `{key, builder}` naming a registered SQL builder (cohorts, look-ahead tests, FIFO functions, joins on a unique key) |
| `attribution_components{}` | `{attribution: component key}` | For a metric whose provider or office binding lives on another dataset (collections by producing provider, 2.2): the component the compiler uses when the query slices or filters by that dimension under the named attribution. Every such component returns the same total as the default one for the same scope and basis (I-12) |
| `expression` | text | Arithmetic over component keys, other metric keys, setting values and the functions of 1.4. Mandatory for `ratio`, `cumulative`, `derived` |
| `datasets[]` | text[] | Every `rpt_*` object read (derived by lint from the components); drives freshness and availability |
| `default_date_basis`, `allowed_date_bases[]` | 04 §7.3 vocabulary plus the metric-only bases of 5.0.4 | PD-8 defaults. Metrics with `time_semantics = state` take `as_of` instead |
| `time_grains[]` | subset of `none`, `day`, `week`, `month`, `quarter`, `year` | Cohort metrics exclude `day` |
| `allowed_dimensions[]` | dimension keys (1.5) | Any other dimension in a query returns 422 `dimension_not_allowed` |
| `office_attribution`, `provider_attribution` | `{default, allowed[]}` | Which column `office_id` / `provider_id` binds to (03 §5); the choice is echoed in the response and printed on exports (AD-9) |
| `allowed_filters[]` | 04 parameter keys | `provider_ids`, `procedure_codes`, `procedure_category_codes`, `carrier_ids`, `patient_type`, `user_ids` ... |
| `format` | `{type, decimals, unit}` | `type` in `money`, `integer`, `decimal`, `percent`, `duration` (02 §3.3). Money and decimals travel as strings, percentages as fractions |
| `direction` | `up` · `down` · `target_range` · `neutral` | Which way is good; drives delta colour and band order |
| `default_target`, `default_bands` | `{target, warn, good}` or `{range_low, range_high}` | Shipped defaults; `metric_targets` rows override (8.2) |
| `benchmark_keys[]` | refs | Shown only when the benchmark's `metric_key` equals the resolved key and its `required_settings` equal the values in force (9.1) |
| `settings[]` | setting keys | Settings that change the result (section 3). Their values are bound at compile time and echoed per metric as `resolved_settings{}`; `settings_version` is part of the cache key (02 §10.3). A metric whose formula takes a setting value without changing key is *parameterised* (section 2) |
| `resolves_by` | `{setting_key, map{value: metric_key}}` | Alias metrics only: no formula of their own, they resolve to a fixed-definition variant. The response names the resolved key |
| `synonym_of` | `{metric_key, fixed_dimensions[], cohort_offset_months}` | Synonym keys only (5.0.6): a second name for one formula, kept because dashboards, legacy labels and saved views use it. No formula of its own; the response names the resolved key |
| `slice_of` | `{metric_key, fixed_filters{}}` | Named slices only (5.0.5) |
| `data_class`, `data_class_by_dimension{}` | 08 vocabulary | 1.6 |
| `right_code` | 08 | Owned by 08. A metric has no right of its own: it is readable through any right that lists its `metric_family` (08 §2.3) |
| `availability` | `{eras[], requires[], since, caveats[]}` | 1.7 |
| `sources[]` | ordered list | Roll-up tables with their grain, then the live dataset (02 §10.2). Only for `additive` components |
| `drill_report` | `{report_key, param_map{}}` | The report or worklist whose rows explain a point (02 §10.1) |
| `reconciles_with[]` | `{report_key, block, column}` | Totals that must equal the metric (02 §15 R5) |
| `null_policy` | `{zero_denominator, min_denominator{value, unit}}` | 1.4 |
| `lead_lag` | `lead` · `lag` | From `research/dental_kpi_dictionary.md` §8 |
| `phase`, `status`, `definition_version`, `owner` | | `status` in `active`, `preview`, `deprecated`. Any change of formula, filter, default basis or component bumps `definition_version` |

### 1.3 Aggregation and time semantics

Two independent fields. `aggregation` says how a value and its totals are formed; `time_semantics` says whether the value
is the activity of a period or a reading as of a date. A state ratio such as `ar_over_90_pct` or `pre_appointment_pct` is
`aggregation = ratio` with `time_semantics = state`: its total across offices is the ratio of the summed components, and
its trend comes from snapshots. No type sums a ratio or a distinct count.

| `aggregation` | Meaning | `additivity` | Total across members | Roll-up source | Examples |
|---|---|---|---|---|---|
| `simple` | One aggregation over one dataset | `additive` for sums and row counts; `non_additive` for distinct counts | Sum; a distinct count is recomputed on the patient-grain dataset, never summed (03 §9) | yes for additive | sums: `gross_production`, `gross_collections`, `appointments_kept`, `total_ar`; distinct counts: `patients_seen`, `active_patients` |
| `ratio` | Numerator ÷ denominator, each a component | `non_additive` | Ratio of the summed components (02 §10.1), never a sum or an average of ratios. `rpt_metric_values` stores `numerator` and `denominator` (03 §9.1), so stored rows total the same way | components only | `net_collection_pct`, `no_show_rate_status_based_pct`, `production_per_visit`, `ar_over_90_pct`, `pre_appointment_pct` |
| `cumulative` | A running or rolling window over a simple or ratio metric | `non_additive` | As the underlying metric, over the window | components | `collection_pct_rolling_90d`, month-to-date and year-to-date forms (1.4 `to_date`) |
| `derived` | Expression over metrics, settings, goals and calendar functions; includes cohort metrics with a look-ahead window | `non_additive` | Recomputed | no | `production_forecast`, `daily_avg_needed_to_goal`, `hygiene_return_12m_pct`, `net_patient_growth_pct` |

| `time_semantics` | Period argument | Value across time | A past value | Examples |
|---|---|---|---|---|
| `flow` | `date_from` / `date_to` on the metric's date basis | additive flows sum over periods; every other flow is recomputed over the range | recomputable from history at any time; frozen at month end and period lock (section 10) | production, collections, visits, rates of a period |
| `state` | `as_of` (default: the office's today) | one value per period end ("last value of the period"); never summed over periods | from snapshots; recomputed only when every input is history (section 10) | `total_ar`, `active_patients`, `unscheduled_treatment_amount`, `ar_over_90_pct`, `pre_appointment_pct` |

### 1.4 Expression functions and rules that hold for every metric

| Function or rule | Definition |
|---|---|
| `safe_div(n, d)` | `d` equal to 0 or NULL gives point status `no_data` (02 §10.1), never 0 and never a substituted denominator. The legacy analytics product replaces a zero denominator by 1 `[DPA]`; we do not, in any formula. Every division of sections 5 and 8 is a `safe_div` (lint rule 8) |
| `min_denominator` | Declared per ratio with the unit of its denominator: `{value, unit}`, `unit` in `count`, `money`, `hours`, `days`. A count denominator defaults to setting `rate_min_denominator` (10); money, hour and day denominators default to 0 (no guard) unless the definition sets one. Below the minimum the value is returned with warning `low_denominator`, is not coloured and is left out of rankings |
| `rolling(m, n, unit)` | Metric `m` over the `n` units ending at the period end; for ratios both components use the same window |
| `to_date(m, grain)` | Month-to-date, quarter-to-date, year-to-date value of `m` at the period end; the year starts in `fiscal_year_start_month` |
| `prior(m, k, grain)` | `m` shifted back `k` grains (cohort bases, year over year) |
| `working_days(scope, from, to)`, `remaining_working_days(scope)` | 2.10 |
| `goal(scope, period)` | 8.3 |
| `share_of_total(m, dimension)` | Member value ÷ value over all members of the dimension (parts always sum to the total, 03 P-11) |
| `rank(m, dimension)`, `percentile(m, dimension)`, `variance_to_median(m, dimension)` | Post-aggregation transforms on normalised metrics only (9.3) |
| `project_period_end(m)` | `to_date(m) + safe_div(to_date(m), elapsed_working_days) × remaining_working_days` (the legacy projection `[DPA]`); `no_data` while no working day of the period has elapsed |
| Change | `(current − prior) ÷ abs(prior)`; prior equal to 0 or NULL gives no delta (the legacy product divides by 1) |
| Sign | Money metrics are positive in their natural sense (collections = money in, refunds = money out). The accounts-receivable sign of 03 P-3 stays inside the formulas |
| Exactness | Components are `numeric(14,2)` sums (03 P-10). Ratios are computed on unrounded components; rounding is a display concern |
| Unassigned members | Every dimension has an explicit unassigned member (NULL office, NULL provider, `Unallocated`, `unclassified`, `other`); additive metrics sum to the total, non-additive metrics return a directly computed total |
| Today and partial periods | "Today" is the office-local date (`rpt_office_dim.local_today`, AD-9). The open period is flagged `is_partial` by the engine; cohort metrics whose look-ahead window has not elapsed are flagged `is_provisional`; a point served for migrated history under availability code **D** (1.7) is flagged `is_degraded` (both point flags: REQ-14) |
| Resolved definition | The response names, per metric, the key an alias or synonym resolved to (`resolved_metric_key`) and the setting values the formula used (`resolved_settings{}`, for example `{production_basis_for_rates: net, visit_basis: visit_code_charge}`); tiles, exports and the glossary popover print both (REQ-14) |
| Live rows only | Every formula reads the live objects (`rpt_charges`, not `rpt_charges_all`) unless the row says otherwise (03 P-8) |
| Era | A metric marked app-era only adds `era = 'app'` to its components and returns `not_available` for periods that end before the organisation's first app-era row |

### 1.5 Dimension registry

`office_id` and `provider_id` are roles, not columns: each metric binds them to the column named by its attribution (03 §5).
Codes in the "Dims" column of section 5: **O** office set · **P** provider set · **C** code set · **Y** payer set · **N**
new-versus-existing · **A** demographic set · **S** source set · **U** user · **W** weekday. Time grains are always allowed.
A dimension is declared on a metric only where a binding exists, and a ratio is sliced by a dimension only when both of its
components bind it the same way (lint rule 3).

| Code | `dimension_key` | Binding (default → alternates) |
|---|---|---|
| O | `office_id`, `office_group_id` | production: `rpt_charges.office_id` (office of service) · collections: `rpt_payments.office_id` (where applied) → `posting_office_id`, `rpt_payment_allocations.allocation_office_id` · A/R: `ar.unit_office_id` of allocation unit `account_office` (transaction office, PD-6 default) → `ar.home_office_id` of unit `account` (section 3 #8) — never the leg's `office_id` of an account-unit run, which is a third attribution that ties to nothing · appointments: `rpt_appointment_facts.office_id` · patients: per metric (2.4, 5.7) · group through `rpt_office_dim.office_group_id` |
| P | `provider_id`, `provider_kind`, `production_group`, `specialty` | charges, linked adjustments and allocations: the credited provider of the leg (2.1) · unlinked adjustments: the leg's own `provider_id` · payments under `collections_provider_attribution = payment_provider`: `rpt_payments.provider_id` (section 3 #5) · visits: `rpt_provider_visits.provider_id` (2.6) · appointments: `rpt_appointment_facts.provider_id` · booked lines: `rpt_appointment_procedures.provider_id` · treatment: `rpt_treatment_item_facts.provider_id` · claims: `treating_provider_id` → `billing_provider_id` · A/R: `ar.provider_id` (provider of the open leg) · attributes through `rpt_provider_dim` |
| C | `procedure_code`, `code_category`, `coverage_category`, `code_group`, `visit_code_flag`, `ledger_code_flag`, `ortho_code_flag` | `rpt_charges` / `rpt_appointment_procedures` / `rpt_treatment_item_facts` columns (the flags are `is_visit_code`, `is_ledger_code`, `is_ortho_code` of `rpt_charges`); `code_group` = membership in a requested set of `group_key`s (section 4) |
| Y | `carrier_id`, `ins_plan_id`, `plan_type`, `payer_class` | **Row payer** — charge: `primary_carrier_id`, `primary_ins_plan_id` · payment and adjustment leg: `carrier_id` · claim: `carrier_id`, `ins_plan_id` · allocation: the payer of the paid charge, through `debit_entry_id`. **Patient payer** — appointment-, visit- and patient-grain metrics, whose datasets carry no carrier column (`rpt_appointment_facts`, `rpt_visits`, `rpt_patient_activity`): the patient's current primary dental slot, `rpt_insurance_coverage` with `category = 'dental'` and `tier = 'primary'`, joined on `patient_id`; a current-state attribute (k12). `payer_class` = `insured` / `uninsured` |
| N | `patient_new_existing` | `new` when the row's date is within `new_patient_window_days` of `rpt_patient_activity.first_visit_date` |
| A | `age_band`, `gender_code`, `zip5`, `patient_type_code`, `is_ortho_patient` | `rpt_patient_dim`; age at the row's date, bands from setting `patient_age_bands`; `patient_type_code` = `unnest(patient_type_codes)` — a patient with two types counts under both, so the members do not add up and the total is computed directly |
| S | `referral_source_id`, `source_category`, `source_type_label`, `campaign_code` | `rpt_referral_facts` (kind `inbound_source`) on `patient_id`; `rpt_appointment_facts.campaign_code` |
| U | `user_key` | The text key of `rpt_user_dim` on every dataset: `user_key` of ledger legs (`rpt_charges`, `rpt_payments`, `rpt_ledger_entries`); `'u:' + created_by_user_id` on appointments and claims, `'u:' + counselor_user_id` on treatment items (app era only) |
| W | `day_of_week` | `rpt_dates.day_of_week` (0 = Monday) |
| — | `payer`, `tender_class`, `deposit_group`, `txn_class`, `txn_side`, `ledger_bucket`, `transaction_code`, `entry_type`, `era` | ledger attributes (`transaction_code` = `rpt_ledger_entries.code`) |
| — | `status_class`, `claim_status_class`, `tier`, `claim_age_bucket`, `aging_bucket`, `funnel_stage`, `acceptance_state`, `recall_status`, `has_any_future_appointment`, `lab_vendor_id`, `operatory_id`, `contract_kind`, `plan_side` (`rpt_contract_installments.plan_side`), `channel` (`rpt_communication_facts.channel`), `direction` (`rpt_referral_facts.direction`), `office_pair` (ordered pair of `rpt_visits.office_id` values of one patient), `collection_member` (2.2), `months_since_last_visit_band`, `exam_type`, `waterfall_stage` | named per metric in section 5 |

### 1.6 Data class of a metric value

The class vocabulary and the grants are owned by 08 (working vocabulary: `research/compliance_and_financial_semantics.md`
§3.3). The registry supplies the class; it depends on the dimensions requested.

| Case | `data_class` |
|---|---|
| Counts and rates without money, at office level or above | `aggregate` |
| Money at office level or above | `financial_practice` |
| Any metric sliced by `provider_id` (money or rate) | `provider_comp` — a provider-restricted caller (PD-11) sees only their own member and no total from which another provider's value can be derived (rule enforced by 02 §10.1) |
| Any metric sliced by `user_key` | `user_activity` |
| Hours and wage ratios | `payroll_time` |
| Drill lists behind a point | the class of the target report (`phi_identified`) |

### 1.7 Availability codes used in section 5

| Code | Meaning |
|---|---|
| **H** | Computable for migrated history and for app-era data |
| **A** | App-era data only (the fact does not exist for migrated rows). A period that ends before the organisation's first app-era row returns `not_available` with `history_starts_on` |
| **D(n)** | Degraded for migrated history until `DATA-n`: a value is computable but is known to be incomplete or to coincide with another measure (net production equals charged production while migrated adjustments are unclassified). The point is served with `is_degraded = true` and its caveat, gets no band colour and no benchmark, and is left out of rankings and alerts. It will not match the legacy figure of the same name for those months |
| **G(n)** | Exists only from the go-live of capture or schema `DATA-n`; never back-fillable |
| **N(n)** | Needs `DATA-n` (repair, schema or dataset) before any value is right |
| **X** | Needs data that DentC does not hold (integration or manual input) |
| (k…) | Caveat that the engine prints when the range touches migrated rows |

"A; history D(12)" reads: exact for app-era rows, degraded for migrated rows until DATA-12. An alias takes the availability
of the variant it resolves to and never substitutes another variant for part of a range (2.8).

| Caveat | Text |
|---|---|
| k1 | Migrated adjustments are `unclassified` until DATA-12: for history net production equals charged production, collection adjustments are zero and the unclassified amount is shown beside both |
| k2 | The doctor / hygiene split needs `provider_kind` (DATA-05); `hygienist_id` is NULL on every migrated charge |
| k3 | `office_fee` falls back to `charged_fee` where no office fee was stored (03 §6 #24): gross equals charged on those lines |
| k4 | Allocation-based figures are derived oldest-first for history (03 §2.13) and labelled "allocation derived" |
| k5 | Migrated claims need DATA-10 (lines, service dates, estimate) and DATA-32 (status, carrier, plan) |
| k6 | Created date and user are unreliable on migrated rows until DATA-10 |
| k7 | Migrated appointments carry no created date, stamps, new-patient flag or cancellation reason; booked lines exist on about 6 % of them |
| k8 | Visit-code and ledger-code flags use the default rules of 03 §2.5 until the DATA-04 content is reviewed |
| k9 | Depends on `legacy_archive_policy` (03 O-1). One tenant flag, `rpt_tenant_flags.include_legacy_archive`, decides whether archived migrated charges **and** appointments are read (filter `APPT`, 5.0.1); first-visit dates and old counts move with it |
| k10 | Capacity comes from the current schedule template, applied to past months as well until DATA-43 keeps capacity history. `hours_source` says where the hours came from: `provider_schedule`, `office_hours` (a provider without a template), `default` (an office that never configured hours: Monday-Friday 08:00-17:00 assumed, 03 §2.28) |
| k11 | Migrated payments carry no carrier or claim, four tender values, and may have a NULL office or provider |
| k12 | Current-state measure: a past date is reproducible only from the snapshots of section 10 |
| k13 | `est_patient` is derived as `charged_fee − est_insurance` on migrated charges (03 §2.9) |
| k14 | The migrated ledger is incomplete until DATA-57 has reloaded the charges skipped at load and R-21 has passed or been waived: 87,585 charges (about 6 %) are missing while their payments were loaded (03 §2.9). Production, visits and first-visit dates of migrated periods are low; A/R is low and holds credit balances the legacy system never showed; derived allocations spend those credits on other charges. Blanket caveat, printed with the measured gap (03 §6 #35) for every metric that reads migrated rows of `rpt_charges`, `rpt_visits`, `rpt_patient_activity`, `rpt_ar_open_items()` or `rpt_payment_allocations` |
| k15 | A migrated payment whose tender was not exported matches no catalog row and is counted as a collection on assumption (`collection_class_quality = 'assumed'`, 03 §2.10); the assumed share is printed. A conversion credit hidden among those rows is found only by DATA-12 |
| k16 | Positive migrated payment rows follow the tenant's `legacy_positive_payment_policy` (03 §3.6, O-13): under `credit` (default) they count as payments, under `reversal` they reduce collections. A wrong reading moves the affected balances by twice the amount |

### 1.8 Shape of a definition

```python
# app/analytics/metrics/model.py (NEW) — abridged
@dataclass(frozen=True)
class Component:
    key: str
    dataset: str | None = None            # rpt_* object; None when a builder is named
    agg: str = "sum"                      # sum | count | count_distinct | avg | min | max
    expr: str | None = None               # column or SQL expression over the dataset's columns
    filters: tuple[str, ...] = ()         # named filters of 5.0.1 or predicates
    date_columns: Mapping[str, str] = field(default_factory=dict)   # date basis -> column
    bindings: Mapping[str, str] = field(default_factory=dict)       # dimension_key -> column
    metric: str | None = None             # another metric reused as a component
    builder: str | None = None            # registered selectable factory (cohort and look-ahead logic)

@dataclass(frozen=True)
class MetricDefinition:
    metric_key: str; label: str; group: str; metric_family: str
    aggregation: str; time_semantics: str; additivity: str
    definition_version: int; phase: str; status: str = "active"
    components: tuple[Component, ...] = (); expression: str | None = None
    attribution_components: Mapping[str, str] = field(default_factory=dict)   # attribution -> component key
    default_date_basis: str | None = None; allowed_date_bases: tuple[str, ...] = ()
    allowed_dimensions: tuple[str, ...] = (); settings: tuple[str, ...] = ()
    resolves_by: Resolver | None = None; synonym_of: Synonym | None = None; slice_of: Slice | None = None
    format: Format = MONEY; direction: str = "up"; data_class: str = "aggregate"
    null_policy: NullPolicy = NO_DATA_ON_ZERO          # zero_denominator, min_denominator{value, unit}
    availability: Availability = BOTH_ERAS; sources: tuple[Source, ...] = ()
    drill_report: Drill | None = None; reconciles_with: tuple[Reconcile, ...] = ()
```

`MetricDefinitionRead` (02 #55) is the same object as data (no callables), plus the resolved setting values:

```json
{"metric_key": "net_collection_pct", "label": "Net collection %", "group": "collections_ar",
 "aliases": ["Collection %", "Collections as a % of Production", "NCR", "Collection ratio"],
 "metric_family": "collections", "aggregation": "ratio", "time_semantics": "flow", "additivity": "non_additive",
 "definition_version": 1, "settings_version": 7,
 "components": [
   {"key": "net_collections", "metric": "net_collections"},
   {"key": "collectible_production", "metric": "net_production_before_bad_debt"}],
 "expression": "safe_div(net_collections, collectible_production)",
 "default_date_basis": "transaction_date", "allowed_date_bases": ["transaction_date", "created_date"],
 "time_grains": ["none", "month", "quarter", "year"],
 "allowed_dimensions": ["office_id", "office_group_id", "provider_id", "provider_kind", "production_group"],
 "format": {"type": "percent", "decimals": 1}, "direction": "up",
 "default_bands": {"warn": 0.95, "good": 0.98}, "benchmark_keys": ["ada_ms.collection_pct", "di_sod26.collection_pct"],
 "settings": ["production_adjustment_dating", "collections_provider_attribution", "hygiene_credit_policy"],
 "data_class": "financial_practice", "data_class_by_dimension": {"provider_id": "provider_comp"},
 "availability": {"eras": ["migrated", "app"], "requires": ["DATA-06"], "degraded_until": {"migrated": "DATA-12"},
                  "caveats": ["k1", "k14", "k15", "k16"]},
 "drill_report": {"report_key": "daily.collection_report", "param_map": {"date_from": "period.date_from", "date_to": "period.date_to"}},
 "null_policy": {"zero_denominator": "no_data", "min_denominator": {"value": 0, "unit": "money"}},
 "lead_lag": "lag", "phase": "P1"}
```

### 1.9 Registry lint (runs at import and in CI)

1. Keys are unique; an alias never equals another metric's key.
2. Every component column exists in the reporting SQL package (`app/reporting/sql/`, DATA-01); every `g:<group_key>` exists in `rpt_code_groups`; every setting key exists in section 3.
3. Every dimension binding names a column of the component's dataset, of a dataset joined to it on a declared unique key, or an output of its builder; the components of a ratio bind every allowed dimension the same way.
4. An alias (`resolves_by`) maps every allowed setting value to an existing fixed-definition key; a synonym names an existing key; a slice's parent allows the sliced dimension.
5. `drill_report.report_key` and `reconciles_with[].report_key` exist in the report registry.
6. Additive components that name a roll-up source use only columns of that roll-up (03 §9.1) and filter it exactly as the live component is filtered.
7. The glossary page is generated from the registry; a metric without `description` and `glossary_md` fails the build.
8. Every division in an expression is `safe_div`; no expression holds a literal that is a published or tunable figure (thresholds, targets and shares are `metric_targets` rows or settings).
9. A benchmark row names a fixed-definition key, never an alias or a synonym, and carries `required_settings` when that key is parameterised (9.1).
10. A fixed-definition key lists every setting its formula reads in `settings[]` (they are echoed in `resolved_settings{}`); a key with `resolves_by` or `synonym_of` has no components and no expression.

---

## 2. Base definitions that practices disagree on

Each matrix lists the variants found in the research (`research/dental_kpi_dictionary.md` §2, `compliance_and_financial_semantics.md`
§12-§21), our default and the setting that switches it. A setting acts in one of two ways, never both on one key:

| Mechanism | When | Effect |
|---|---|---|
| **Variants behind an alias** | The alternatives are different measures: another event, another numerator or denominator population | Each alternative is a fixed-definition key whose meaning never changes; the headline key is an alias (1.2 `resolves_by`) and the response names the key it resolved to. Used for collection %, days in A/R, new patients, cancellation and no-show rates, reappointment, case acceptance, clinical hours |
| **Parameter of one key** | The setting moves a window, a basis or a credit rule inside one measure: `production_basis_for_rates`, `visit_basis`, `per_visit_production_scope`, the windows of 2.5, 2.7 and 2.9, `hygiene_credit_policy`, `ar_office_attribution` | The key stays and is *parameterised*: its `settings[]` name the parameters, the response echoes `resolved_settings{}`, tiles and exports print them, and a published benchmark is shown only when its `required_settings` match the values in force (9.1) |

Either way a benchmark is only ever shown beside the definition it was published for.

### 2.1 Production: gross, charged, net

| Variant | Definition on the datasets | Who uses it | Our key | Default |
|---|---|---|---|---|
| Office-fee (UCR) production | `Σ rpt_charges.office_fee` where `is_production` | ADA "gross production"; the reference dashboard's "Gross Production" [I] | `gross_production` | shown (PD-1) |
| Posted-fee production | `Σ rpt_charges.charged_fee` where `is_production` | Denticon "Gross Production" and every legacy report (the ledger amount); Planet DDS network benchmarks ("expected collections, not UCR") | `charged_production` | shown (PD-1) |
| Net production | charged production + signed production adjustments | Denticon Practice Analytics, ADA "adjusted production" | `net_production` | **headline** (PD-1) |
| Net production before bad debt | net production with `bad_debt` and `collection_agency` write-offs added back | ADA "billable"; Open Dental excludes bad debt from provider adjustments | `net_production_before_bad_debt` | denominator of the default collection % (2.3) |

Naming trap: the legacy tool's "Gross Production" is our `charged_production`. Our `gross_production` (office fee) has no
legacy analytics equivalent; legacy reports print it only under "Include UCR". On migrated data about half of the sampled
2025 lines were charged below the office fee [A], so the contractual write-off is already inside `charged_production` on the service
date and `implied_writeoff` measures it.

**Which class enters which measure.** The analytic bucket of a ledger row is `rpt_ledger_entries.ledger_bucket`, which 03
assigns from the code's class first and its legacy Sub Type second (03 §2.12, §3.3). Classes, sides, `is_income` and
`counts_as_collection` are data (`transaction_codes`); the seed is under review (03 O-2). Every formula selects by bucket
(5.0.1) and never tests a code string or a side — the side (`txn_side`) only decides the column of a legacy parity report.

| `txn_class` (seeded codes, 03 §3.3) | `ledger_bucket` | `production_adjustments` | uncollectible (added back in `net_production_before_bad_debt`) | `collection_adjustments` | Notes |
|---|---|---|---|---|---|
| `contractual_writeoff` (`AC015`, `AD002`, `AINSO`, system `INS_WRITE_OFF`) | `production_adjustment`, in both eras and whatever Sub Type the code carries | yes | no | no | the largest adjustment of a PPO practice: `AINSO` on migrated rows and `INS_WRITE_OFF` on app remittances are one event in one bucket |
| `discount`, `charge_correction`, `other_production` | `production_adjustment` (side production) | yes | no | no | |
| `finance_or_late_charge`, `nsf_fee` | `production_adjustment` (side production) | yes | no | no | non-clinical income; read them alone through `production_adjustments` by `txn_class` |
| `bad_debt` | `production_adjustment` | yes | **yes** | no | own metric `bad_debt_amount` |
| `collection_agency` | by side: `AC012`, `AC007` → `production_adjustment`; `COLFE` → `collection_adjustment` | production-side rows | **yes** (production-side rows) | collection-side rows | |
| `refund_patient`, `refund_insurance`, `refund_financing` | `collection_adjustment` | no | no | yes | also `refunds` (entry type `refund`, both stores, netted once — 03 O-10) |
| `payment_reversal`, `other_collection` | `collection_adjustment` | no | no | yes | |
| `contract_movement`, `sales_tax`, `capitation_writeoff` (`AD900`) | `non_income_adjustment` | no | no | no | A/R movements only (I-2). Sales tax is never production or a collection adjustment; `AD900` is the offset of a capitation payment, not a per-procedure write-off |
| `transfer` | `transfer` | no | no | no | nets to zero (R-10a) |
| `opening_balance` (adjustment or payment code; `patient_opening_balances` rows) | `opening_balance` | no | no | no | previous balances `APBAL`, `APBAI`; conversion credits `APBAC`, `APBIC` |
| payment code with `counts_as_collection = false` (`COLPY`) | `non_collection_payment` | — | — | — | not a collection: the agency's remittance arrives as `PP004` (03 O-2) |
| no catalog row | `unclassified_adjustment` | no | no | no | `unclassified_adjustments`, shown beside both nets (k1): every migrated adjustment until DATA-12 |

**Dating of production adjustments** when the basis is the service date (setting `production_adjustment_dating`):

| Value | Rule | Trade-off | Phase |
|---|---|---|---|
| `transaction_date` (default) | Charges by `service_date`, adjustments by their own `transaction_date` | Closed periods never change; a write-off posted with a later insurance payment lands in the later period | P1 |
| `linked_service_date` | An adjustment with a `procedure_id` takes the `service_date` of that charge, otherwise its transaction date | Period-true, but past periods move when a payment posts; only app-era remittance write-offs and targeted adjustments are linked | P2 |
| `claim_estimate` | Estimated write-off on the claim date, the difference on the payment date | Stable and close to economic reality; needs `claim_line_snapshots` (DATA-49) | P4 |

**Who is credited** (PD-7; `rpt_charges` carries `provider_id` and `hygienist_id`, 03 §5.2; the app writes `hygienist_id`
at charge entry [V]). There is one credited provider per money leg, chosen by setting `hygiene_credit_policy`, so that a
charge, its write-off, its payment and its visit land on the same provider:

| Leg | `hygienist` (default; PD-7 "hygienist when recorded") | `treating_provider` (practices that credit the dentist of record) |
|---|---|---|
| Charge (`rpt_charges`) | `coalesce(c.hygienist_id, c.provider_id)` | `c.provider_id` |
| Adjustment linked to a charge (`e.procedure_id` set: remittance write-offs `rwo`, targeted `adja`) | the credited provider of that charge: `coalesce(e.linked_hygienist_id, e.linked_provider_id)` | `e.linked_provider_id` |
| Adjustment without a link; refund | the leg's own `e.provider_id` (NULL = `Unassigned provider`) | same |
| Payment under the allocation attribution (`rpt_payment_allocations`, 2.2) | `coalesce(al.allocation_hygienist_id, al.allocation_provider_id)` | `al.allocation_provider_id` |
| Payment under the `payment_provider` attribution (P1) | `p.provider_id`, the provider keyed on the payment line: it cannot follow the hygienist, and the tile says "provider on payment" | same |
| Visit (`rpt_provider_visits`, 2.6) | rows with `provider_role = 'credited'` | rows with `provider_role = 'treating'` |

`linked_provider_id` and `linked_hygienist_id` — the `provider_id` and `hygienist_id` of the charge named by `procedure_id` —
are NEW columns requested on the adjustment legs of `rpt_ledger_entries` (REQ-01): today `hygienist_id` is NULL on every
adjustment leg and a targeted `adja` row carries its own provider (03 §2.11, §2.12). `provider_role` is a NEW column
requested on `rpt_provider_visits` (REQ-02). Until 03 delivers them, the registered builders `ledger_adjustments_credited`
and `credited_provider_visits` produce the same rows by joining `rpt_charges` on its unique `charge_id`. Without the rule a
D1110 of 100 performed by a hygienist under a dentist, with a 40 insurance write-off, would show hygiene net production
100 instead of 60 and doctor net production −40 (identity I-11).

Third value `dual`: productivity metrics (production, visits, hours, per-visit and per-hour rates) follow `hygienist`;
compensation metrics — `provider_income`, collections by provider and every ratio whose numerator is collections
(`collection_pct` and its variants by `provider_id`) — follow `treating_provider` on **both** sides of the ratio. It avoids
forcing one answer on compensation (D-4).

**Doctor / hygiene split** (setting `doctor_hygiene_split_basis`): `provider_kind` (default) groups by
`rpt_provider_dim.production_group` of the credited provider (`doctor`, `hygiene`, `other` — always three members, R-08);
`code_group` puts charges whose code is in `hygiene_department` (section 4) under `hygiene` whoever performed them and the
rest under the credited provider's group. The reference dashboard splits by provider role and hides the third bucket
(`analysis/reference_screenshots.md` §2.5, §3.5); we show it.

### 2.2 Collections: gross, net

PD-3 says "patient plus insurance payments, excluding adjustments and balance transfers, net of refunds" and "net
collections = gross collections plus signed collection adjustments". Refunds are posted both as `patient_refunds` rows and
as collection-side codes (03 O-10), so the two sentences would net them twice. Three levels are named and each amount is
counted once:

| Level | Definition on the datasets | Key |
|---|---|---|
| Payments received | `−Σ rpt_payments.amount` where `counts_as_collection` — the ledger bucket `collection`: patient and insurance payments of both stores; the conversion credits `APBAC` / `APBIC` (bucket `opening_balance`) and the non-collection code `COLPY` (bucket `non_collection_payment`) are outside. A positive migrated payment row counts as a payment under the default `legacy_positive_payment_policy = credit` and reduces the total only under `reversal` (k16); migrated rows without a tender are counted on assumption (k15) | `gross_collections` |
| Refunds | `Σ amount` where `entry_type = 'refund'` | `refunds` (inside the next line) |
| Collection adjustments | `Σ amount` where `ledger_bucket = 'collection_adjustment'`: refunds, payment reversals and the other collection-side income codes (2.1) | `collection_adjustments` |
| Net collections | `gross_collections − collection_adjustments` | `net_collections` (**headline**) |

| Variant | Who | Ours |
|---|---|---|
| Net = gross + collection adjustment, shown as an absolute value | `[DPA]` | Same arithmetic; signed and labelled. Which rows are collection adjustments follows the class, not the legacy Sub Type: the insurance write-off is a production adjustment, and sales tax, contract movements and the capitation offset are in neither net (2.1; 03 O-2; decision D-8) |
| Only adjustment types configured as collection adjustments | Dental Intelligence | Same idea: the class and side come from the catalog |
| Cash inclusive of refunds | HFMA | `gross_collections − refunds` is derivable; not a separate key |
| Deposit basis | cash-basis books | `date_basis = deposit_date` after DATA-28 |
| By producing provider and office | Denticon Income Allocation | `collections_provider_attribution = allocation` (default from P2, PD-7): the allocation component below. Until DATA-26 the P1 dashboards use `payment_provider` (`rpt_payments.provider_id`, NULL = `Unassigned provider`) and say so |

**Collections by producing provider: the allocation component.** `gross_collections`, `patient_collections`,
`insurance_collections` and `net_collections` have two components that return the same total (I-12; 03 R-06, R-08): the
default one on `rpt_payments`, and an allocation component on `rpt_payment_allocations` that the compiler uses when the
query slices or filters by provider or by allocation office under the attribution `allocation` (1.2
`attribution_components`).

| Element | Allocation component |
|---|---|
| Dataset, filter, measure | `rpt_payment_allocations`, `al.credit_ledger_bucket = 'collection'`, `Σ al.amount` (stored positive); `payer` from the credit attributes |
| Date columns | `transaction_date` → `al.credit_transaction_date` (default: the same rows as `gross_collections` of the range, unallocated ones included) · `allocation_date` → `al.allocation_date` (NULL on unallocated rows, which therefore fall outside every range; used by `provider_income` only) · `service_date` → `al.service_date` (cohort metrics) |
| Members (dimension `collection_member`) | **provider** — `allocation_target IN ('production', 'non_production_charge', 'debit_adjustment')` with a credited provider (2.1) · **Unassigned provider** — the same targets with a NULL provider; this is not "Unallocated" (03 §2.13) · **Unallocated** — `allocation_target = 'unallocated'` · **Refunded** — `allocation_target = 'refund'` (the payment was returned: nobody's income) · **Opening / transfer** — `allocation_target IN ('opening_balance', 'transfer')` |
| Net collections by member | gross by member less the collection adjustments of the member: a refund-class leg belongs to **Refunded** (a refunded payment and its refund cancel there), every other collection-adjustment leg to its own `e.provider_id` (NULL = Unassigned provider) |
| Production-group slices | `doctor_*` and `hygiene_*` = the provider members of that group; `other_*` = providers of group `other` plus the four non-provider members, so the three slices add up to the total on the transaction basis (I-3) |
| Roll-up | `rpt_daily_allocated_collections` is keyed by `allocation_date` only (03 §9.1). The transaction-basis slices read `rpt_payment_allocations` — a table from DATA-26 — directly and declare no roll-up source until the roll-up carries a transaction basis (REQ-04) |

### 2.3 Collection percentage bases

| Variant | Formula | Who | Key | Default |
|---|---|---|---|---|
| Net ÷ collectible production | `net_collections ÷ net_production_before_bad_debt` | ADA 98 % of "billable / adjusted production"; DIQ ≥ 98 % | `net_collection_pct` | **default** of `collection_pct` |
| Net ÷ net | `net_collections ÷ net_production` | `[DPA]` target 95 %; Dental Intelligence on net production | `net_collection_pct_after_bad_debt` | legacy preset |
| Gross ÷ gross | `gross_collections ÷ gross_production` | Catalyst Index (72-75 % average, denominator unstated). The Planet DDS "gross basis" 80.4 % is computed on expected fees and is attached to no key (9.1 rule 4; the publisher says it "should not be benchmarked directly") | `gross_collection_pct` | never the headline |
| Net ÷ charged | `net_collections ÷ charged_production` | fee-schedule practices | `net_collection_pct_charged_base` | optional |
| Net ÷ office fee | `net_collections ÷ gross_production` | practices that manage to the office fee | `net_collection_pct_gross_base` | optional |
| Rolling | the resolved variant over 90 days / 12 months | Dental Intelligence 90-day; HFMA cash-to-revenue | `collection_pct_rolling_90d`, `collection_pct_rolling_12m` | shown beside the period value |
| Cohort ("collected to date") | allocations to the period's charges ÷ the period's collectible production | *Recommended* in `compliance_and_financial_semantics.md` §15.3 | `cohort_collection_pct` | P2 |

Setting: `collection_pct_base` = `net_production_before_bad_debt` (default) · `net_production` · `charged_production` ·
`gross_production` resolves the alias `collection_pct` to `net_collection_pct` · `net_collection_pct_after_bad_debt` ·
`net_collection_pct_charged_base` · `net_collection_pct_gross_base`, in that order: every setting value has a key (lint
rule 4). Why the default excludes bad debt from the denominator: a write-off of an uncollectible balance is the
result of not collecting; leaving it in the denominator raises the percentage when collection fails. A single period can
exceed 100 % because money pays earlier work; the tile always shows the rolling value beside the period value.

### 2.4 New patient

| Variant | Rule | Who | Key |
|---|---|---|---|
| First visit (default) | `rpt_patient_activity.first_visit_date` in the period — the first day with a production charge whose code is a visit code (D9986 and D9987 are never visit codes, section 4) | `[DPA]`, Dental Intelligence, legacy "New Patients by First Visit Date" | `new_patients_first_visit` |
| Record created | patient row created in the period (office-local date of `rpt_patient_dim.created_at_utc`, only where `created_at_reliable`) | legacy Executive Summary "New Patients"; the current `report_service._new_patients` [V] | `new_patients_created` (app era only) |
| First kept appointment | first appointment with `is_kept` in the period | Practice by Numbers "NP Seen" | `new_patients_first_appointment` |
| On the schedule | future appointment flagged `is_new_patient`, booked without a patient record (`is_patientless`, the scheduler quick save), or of a patient with no first visit | Morning Huddle | `new_patients_scheduled` |

Settings: `new_patient_basis` = `first_visit` (default) · `first_kept_appointment` · `record_created` resolves the alias
`new_patients`. `new_patient_office_attribution` = `first_visit_office` (default; `rpt_patient_activity.first_visit_office_id`,
the office that acquired the patient, consistent with production by office of service and with `rpt_daily_visits`) ·
`home_office` (`rpt_patient_dim.home_office_id`; the legacy Executive Summary rule, 03 §5.1 — the report definition selects
it). Organisation totals are identical under both; a patient is new once per organisation, never once per office.
`new_patient_window_days` (default 365) bounds how long a patient counts as new in the dimension `patient_new_existing`.

### 2.5 Active patient

| Variant | Rule | Who |
|---|---|---|
| 18 months (default, PD-5) | visit in the 18 months ending at the as-of date and `rpt_patient_dim.is_active` | Dental Intelligence, Practice by Numbers, Catalyst Index retention |
| 12 months | visit in 12 months; 12-24 months = "Danger Zone"; 24+ or never = inactive | `[DPA]` |
| 24 months | visit in 24 months | Jarvis, brokers |

Settings: `active_patient_window_months` = 12 · 18 (default) · 24; `active_requires_active_flag` (default true; it applies
to `active_patients`, `at_risk_patients` and `lapsed_patients` alike, written `(pd.is_active OR NOT
active_requires_active_flag)` in the formulas); `at_risk_from_months` (12) and `at_risk_to_months` (24) define
`at_risk_patients`, which is the legacy Danger Zone under the defaults. With an 18-month window a patient last seen 12-18
months ago is both active and at risk; that overlap is intended (it is the reactivation list). Every tile and report
header prints the window.

As of a past date the three counts are recomputed from `rpt_visits`: the last visit **on or before** the as-of date
(`max(v.visit_date) FILTER (WHERE v.visit_date <= :as_of)`), never `rpt_patient_activity.last_visit_date`, which is today's
value — with it a patient seen afterwards would drop out of the at-risk count of a date on which the patient was at risk.
Lifecycle events are dated the same way: a patient is lost on the day the window closes without a visit (5.7), whatever
happens later, so a later return is a reactivation and never rewrites the earlier period. The `is_active` flag is current
state until DATA-44.

### 2.6 Visit

| Variant | Rule | Who | Key |
|---|---|---|---|
| Visit-code charge (default) | one `rpt_visits` row: a patient-office-day with at least one live production charge whose code is a visit code (03 §2.17, O-5) | `[DPA]`, legacy "Patient Visits" | `patient_visits` |
| Kept appointment | appointment with `is_kept` | Practice by Numbers "$ per Appointment" | `appointments_kept` (also the value `kept_appointment` of `visit_basis`) |
| Unique patient | distinct patients among the visits | legacy "Patients Seen" | `patients_seen` |
| Provider visit | one `rpt_provider_visits` row: a patient-office-provider-day with a visit-code production charge (03 §2.17 — the view every provider-filtered or provider-grouped visit figure reads); the provider role follows `hygiene_credit_policy` (2.1) | Dental Intelligence provider scorecards; legacy Patients Seen by provider; the reference Provider Dashboard (visits 50, appointments 49, patients 46) | `patient_visits` and `patients_seen` by `provider_id` — non-additive across providers (a patient-day shared by two providers is in both); the practice total comes from `rpt_visits`; additive alternative `rpt_visits.primary_provider_id` for doctor / hygiene splits only |

Setting: `visit_basis` = `visit_code_charge` (default) · `kept_appointment` — a parameter: the denominator `V` of every
per-visit metric (5.0.1) is `patient_visits` or `appointments_kept`, and the value in force is echoed in
`resolved_settings{}`.

### 2.7 Broken appointment: cancellation versus no-show

| Variant | Rule | Who | Ours |
|---|---|---|---|
| Status based (**default**) | `status_class = 'cancelled'` and `status_class = 'no_show'` (03 §3.2: flags and stamps outrank the string) | `[DPA]` Missed %, Cancelled %; Dental Intelligence | `cancellation_rate_status_based_pct`, `no_show_rate_status_based_pct` |
| Combined | cancelled + no-show | ADA (at most 5 %); `[DPA]` labels this "No Show Appt %" | `broken_appointment_rate_pct` (label "Broken appointments") |
| Notice based | no-show = missed, or cancelled less than `late_cancel_hours` (24 or 48) before the start; cancellation = cancelled with at least that notice | Jarvis; Planet DDS reports ("cancelled in advance", "failed without prior notice") | `no_show_rate_notice_based_pct`, `cancellation_rate_notice_based_pct`; they need `appointments.cancelled_at` (NEW, DATA-17) and exist from its go-live |

Setting `no_show_includes_late_cancel` (default `false`) resolves the two aliases `no_show_rate_pct` and
`cancellation_rate_pct` to the status-based pair (`false`) or the notice-based pair (`true`); the four variants are
fixed-definition keys, so a published figure sits beside the definition it belongs to. Denominator for all rates:
appointments dated in the period **before** the office's today — today's appointments have not happened yet — that are not
block-outs, not deleted and inside the tenant's archive policy (filter `APPT`); cancelled and no-show appointments are
included. A reschedule (date changed in
place) is not a cancellation; counting reschedules needs `appointment_events` (DATA-17). Recovery: a broken appointment is
recovered when the patient holds a later non-broken appointment dated within `broken_recovery_window_days` (default 30)
of it, or any future one.

### 2.8 Hygiene reappointment: the four variants

Hygiene visit = a patient-office-day with a production charge in code group `hygiene_visit`. Hygiene appointment (setting
`hygiene_appointment_rule`, until `appointment_type_id` exists, DATA-43) = `has_hygiene_code OR (line_count = 0 AND
provider_kind = 'hygienist')`; `code_only` and `appointment_type` are the other values.

| # | Variant | Rule | Who and benchmark | Key | Data |
|---|---|---|---|---|---|
| 1 | Booked at the visit (**default**) | hygiene visits for which a later hygiene appointment had been created by the end of the visit day ÷ hygiene visits | Dental Intelligence "Hygiene Re-Appointment %": bottom 53, average 87, top 94 `[DI-SOD26]` | `hygiene_reappt_at_visit_pct` | app era (needs appointment `created_date`); a later cancellation is ignored only once DATA-17 dates it |
| 2 | Holds one now | hygiene patients of the period who hold a future hygiene appointment today ÷ hygiene patients of the period | `[DPA]`, Jarvis | `hygiene_reappt_holds_now_pct` | both eras; current state, decays for past periods (k12) |
| 3 | Returned within 12 months | hygiene patients of the period with another hygiene visit within 12 months ÷ hygiene patients of the period | Planet DDS reports: 63 % (2025); `[DPA]` "Hygiene Retention Rate % (12 Months)" | `hygiene_return_12m_pct` (synonym `hygiene_retention_12m_pct` for the cohort one year back) | both eras; final 12 months after the period |
| 4 | Any appointment booked at the visit | as 1 with any later appointment | Practice by Numbers "Hyg Pre-appoint %" | `hygiene_reappt_any_at_visit_pct` | app era |
| — | Pre-appointment (a different KPI) | active hygiene patients who hold a future hygiene appointment ÷ active hygiene patients | Dental Intelligence: bottom 26, average 59, top 80; ADA "90 % of recare patients scheduled for their next appointment at all times" — a point-in-time reading, which is this KPI and not variant 1 | `hygiene_pre_appointment_pct` | both eras; snapshot to trend |

Setting: `hygiene_reappointment_basis` = `booked_at_visit` (default) · `holds_future_now` · `returned_within_12m` ·
`any_appointment_at_visit` resolves the alias `hygiene_reappointment_pct`. `reappointment_basis` does the same for
`reappointment_pct` (all patients) and switches the appointment test of `treatment_reappointment_pct`.

An alias never changes definition inside a trend. For a period that ends before the organisation's first app-era
appointment the at-visit variants — and an alias that resolves to one — return `not_available` with `history_starts_on`;
the tile may show the history-capable variant `hygiene_return_12m_pct` beside it under its own name. The holds-now variants
are never substituted for a past period: they read today's appointment book, which says nothing about a month of two
years ago (k12).

Variant 3 is one metric with two presentations. `hygiene_return_12m_pct` looks forward from the hygiene patients of the
requested range and is `is_provisional` until 12 months after the range end. Its synonym `hygiene_retention_12m_pct`
(5.0.6) asks the same question of the cohort one year earlier (`cohort_offset_months = 12`) and is therefore always final:
the legacy presentation. Both use one cohort rule (`hygiene_visit`) and one return test, setting
`hygiene_return_code_group` = `hygiene_visit` (default) · `hygiene_return` (D1110, D1120, D4910: the legacy list, in the
preset) — one cohort never shows two return rates.

### 2.9 Case acceptance: unit and window

Cohort for every variant: `rpt_treatment_item_facts` rows of `era = 'app'` whose `presented_date` is in the period and whose
`status_norm` is not `alternative`, `referred_out`, `external_referral` or `existing` (03 §3.2). Cohorting by presentation
date is deliberate: the legacy product divides by every plan ever created, so an old backlog depresses its rate
(`research/denticon_analytics_and_dso.md` §13 #5).

| Variant | Rule | Who and benchmark | Key |
|---|---|---|---|
| Dollars within a window (**default**, window 30 days) | fees of cohort items with `is_accepted` and `accepted_date_effective ≤ presented_date + window` ÷ fees of the cohort | Practice by Numbers; stable once the window has passed | `case_acceptance_dollars_pct` |
| Dollars, same day | the same test with a fixed window of 0 days | Dental Intelligence: bottom 23, average 41, top 62 | `case_acceptance_dollars_same_day_pct` |
| Plans, to date | plans with at least one accepted item ÷ plans presented | `[DPA]`; Planet DDS 58 %; Catalyst Index 45 % average, 75 % top; ADA 75-80 % | `case_acceptance_plans_pct` |
| Patients | patients with at least one accepted item ÷ patients presented | Dental Intelligence "Patient Acceptance %" | `case_acceptance_patients_pct` |

Settings: `case_acceptance_unit` = `dollars` (default) · `plans` · `patients` resolves the alias `case_acceptance_pct`;
`case_acceptance_window_days` = 30 (default) · 90 · empty (to date) is a parameter of `case_acceptance_dollars_pct` (the
same-day reading is its own key, so the value 0 is not offered). A to-date rate keeps rising as old cohorts mature, so a
trailing-12-month row would always slope down; the windowed default does not. Cohorts younger than the window are
`is_provisional`. Acceptance is a current-state reading of the item until `treatment_plan_item_events` (DATA-25) dates
every transition. Completion uses `case_completion_window_days` (default 180).

Undated acceptance. `accepted_date_effective` is `coalesce(accepted_date, scheduled_date, first charge date, end_date)`
(03 §2.22) and is NULL for an item whose status is accepted but which carries no stamp, booking, charge or end date —
possible until DATA-39 stamps every transition into an accepted state. Such an item counts as accepted in the to-date
variants (plans, patients, dollars with an empty window). In a windowed variant the date test cannot be evaluated: the
item is left out of the numerator and its fee is returned as warning `accepted_undated_amount`, so the gap is visible
instead of silently lowering the headline rate.

The view `rpt_treatment_item_facts` ships in P1 (03 DATA-56), so the acceptance metrics of the reference dashboards are
served in P1. Until DATA-39 (P3) the item office is the plan's office, else the patient's home office.

### 2.10 Working day and hours

| Concept | Variants | Default and setting |
|---|---|---|
| Office working day | (a) open day of `rpt_office_calendar_days()`; (b) a day with production or a kept appointment (Dental Intelligence, legacy Executive Summary); (c) Monday-Friday (`[DPA]` A/R days); (d) fixed 20 per month (legacy Scheduled Production) | `working_day_basis` = `hybrid` (default): elapsed days by activity (b), future days by calendar (a). Other values: `calendar`, `activity`, `weekday`, `booked_hours_half_day` |
| Provider working day | (a) a day with a non-cancelled appointment or a credited production charge = 1.0; (b) `[DPA]`: per provider-day, booked appointment time up to 4 hours = 0.5, more = 1.0, cancelled, missed and blocked excluded | (a) by default; (b) under `booked_hours_half_day` |
| `working_days` above one office or one provider | — | One rule per level, so every per-working-day value has a defined unit. Office: the working days of that office. Office group and organisation: the **sum of office-days** (a per-day value there is per office-day; a distinct-date count would make a ten-office organisation look ten times as productive per day). Provider: the provider-days of that provider, counted per (provider, date), or per (provider, office, date) when sliced by office — a provider who works at two offices on one day then counts in both, so the office members do not add up. `production_group` or `provider_kind`: the sum of the provider-days of the group |
| Remaining working days | future open days of the office (or of the provider: schedule minus holidays) through the period end | calendar; when `hours_source = 'default'` the tile says "schedule not configured" |
| Clinical hours | `booked`: appointment minutes not cancelled, not no-show, not block (`[DPA]` "Provider Working Hours"); `kept`: minutes of kept appointments (legacy "Total Chair Hours"); `scheduled`: provider template hours minus holidays; `time_clock`: paid hours of the user linked to the provider | `clinical_hours_source` = `booked` (default; `booked` and `kept` exist for both eras without any configuration). The source is printed in the tooltip; a missing source gives `no_data`, never 0 (the reference dashboard shows 0 hours beside a non-zero hourly figure) |
| Available hours | provider: schedule, minus organisation holidays, minus office holidays, plus office-open exceptions, minus provider holidays (`[DPA]` order); chairs: `chair_capacity_minutes` | 03 §2.28, both functions in P1 (DATA-55). Provider: `rpt_provider_calendar_days(p_tenant_id, p_provider_ids, p_date_from, p_date_to, p_office_ids DEFAULT NULL)` returns `provider_id`, `office_id`, `calendar_date`, `is_scheduled`, `scheduled_minutes`, `hours_source` (`provider_schedule` · `office_hours` for a provider without a template · `default`), `holiday_name`. Chairs: `rpt_office_calendar_days(p_tenant_id, p_office_ids, p_date_from, p_date_to)` returns `is_open`, `open_minutes`, `chair_capacity_minutes`, `hours_source` (`stored` · `default`). Past months use today's template (k10) |

---

## 3. Organisation metric settings

**Storage.** Rows of `rpt_tenant_settings (tenant_id, key, value, updated_at, updated_by)` — the table 03 §3.6 creates in
DATA-02. 03 owns four keys: `legacy_archive_policy`, `legacy_positive_payment_policy`, `ins_write_off_code` and
`aging_bucket_set`; this document owns the keys below. A missing row means the default. Values are validated by
`app/analytics/metrics/settings.py` (NEW): type, allowed values, cross-field rules (`at_risk_from_months <
at_risk_to_months`).

**Versioning.** `metric_settings_version` (an integer row in the same table) is incremented by every write that changes
the value of **any** key of `rpt_tenant_settings` — the metric settings below and the four 03-owned policies, each of which
restates figures (archive policy: every count that reads migrated rows; positive-payment policy: collections and A/R;
write-off code: the class of app remittance write-offs; bucket set: ageing) — by every change of a tenant code-group
member and by every new version of a `transaction_codes` row. All of these writes go through one settings service
(REQ-11). It is the `settings_version` of 02 §10.1 and §10.3 (cache key, response field) and the "definition changed"
marker of frozen rows. Each change writes NEW `metric_setting_changes (id, tenant_id, settings_version, key, old_value,
new_value, changed_at, changed_by, reason)` and an audit event.

**Effect of a change.** Settings are bound when a query is compiled; no `rpt_*` view reads them. A change therefore
restates every live figure at once, including past open periods (one definition across a trend). Frozen
`rpt_metric_values` rows (`month_end`, `period_lock`, `day_end`) keep the version they were computed under and are shown
with a "definition changed" marker when it differs from the current one (03 §9.3). Settings are organisation-wide by
design: per-office values would break comparison between offices (PD-13).

**Preset.** `metric_preset` = `standard` (default) · `denticon_practice_analytics`. Applying a preset writes every setting
that has a value in the last column in one audited change set, plus tenant rows that give `hygiene_visit` the members of
`hygiene_visit_dpa` with `valid_from = 1900-01-01` (section 4.2: history is restated on purpose, as with any setting); it
is not a run-time switch, and single settings can be changed afterwards.

| # | `setting_key` | Values | Default | Metrics affected | Legacy preset |
|---|---|---|---|---|---|
| 1 | `production_basis_for_rates` | `net` · `charged` · `gross` | `net` | parameter: numerator `P` of the per-visit, per-hour, per-working-day, per-office, per-operatory, lab-cost, patient-value, forecast and growth metrics (goal metrics use setting 31) | `net` |
| 2 | `production_adjustment_dating` | `transaction_date` · `linked_service_date` · `claim_estimate` (P4) | `transaction_date` | `net_production`, `net_production_before_bad_debt` and every metric built on them, when the basis is the service date | `transaction_date` |
| 3 | `hygiene_credit_policy` | `hygienist` · `treating_provider` · `dual` | `hygienist` | parameter: the credited provider of every charge, linked adjustment, allocation and provider visit (2.1) — every production, adjustment, visit and allocation-based collection metric by `provider_id` or `production_group`; the named slices of 5.0.5 | `treating_provider` [I] |
| 4 | `doctor_hygiene_split_basis` | `provider_kind` · `code_group` | `provider_kind` | `doctor_*`, `hygiene_*`, `other_*` slices; `hygiene_production_share_pct`; both sides of the hygiene ratios of 5.5 | `provider_kind` |
| 5 | `collections_provider_attribution` | `allocation` · `payment_provider` | `allocation` (from P2); `payment_provider` until DATA-26 | which component serves collections metrics by `provider_id` / `production_group` (2.2); `provider_income` always reads allocations | `payment_provider` (legacy Collection Report) / `allocation` (Income Allocation) |
| 6 | `collections_office_attribution` | `transaction_office` · `allocation_office` · `posting_office` | `transaction_office` (PD-6) | collections metrics by `office_id` | `transaction_office` |
| 7 | `collection_pct_base` | `net_production_before_bad_debt` · `net_production` · `charged_production` · `gross_production` | `net_production_before_bad_debt` | alias `collection_pct` → `net_collection_pct` · `net_collection_pct_after_bad_debt` · `net_collection_pct_charged_base` · `net_collection_pct_gross_base`; the two rolling forms; synonym `provider_collection_pct` | `net_production` |
| 8 | `ar_office_attribution` | `transaction_office` · `home_office` | `transaction_office` (PD-6; 03 O-11) | parameter: the allocation unit of every A/R metric. `transaction_office` = unit `account_office`, office read from `unit_office_id`; `home_office` = unit `account`, office read from `home_office_id` (03 §2.13-2.14). `total_ar` of the organisation is equal under both (R-14). Debit balances, credit balances, every ageing bucket, `ar_over_90_pct`, `patient_ar` and the per-office split differ at **every** level, the organisation included: a charge at office A paid at office B is an open debit at A and a credit at B under the office unit and nothing under the account unit. The unit is printed on every A/R tile and export | `transaction_office` (Collections Analysis); the Morning Huddle tile uses `home_office` |
| 9 | `ar_days_basis` | `production_90d` · `collections_business_days` · `collections_calendar_days` | `production_90d` | alias `ar_days` → `ar_days_production_90d` · `ar_days_collections_business_days` · `ar_days_collections_calendar_days` | `collections_business_days` |
| 10 | `aging_bucket_set` (owned by 03) | `legacy` · `legacy_extended` · `common` | `legacy` | `ar_aging_amount`, `ar_over_90_amount`, `ar_over_90_pct`; dimensions `aging_bucket`, `claim_age_bucket` | `legacy` |
| 11 | `new_patient_basis` | `first_visit` · `first_kept_appointment` · `record_created` | `first_visit` | alias `new_patients`; `new_patients_projected`, `net_patient_growth_pct`, `new_patients_per_doctor` | `first_visit` |
| 12 | `new_patient_office_attribution` | `first_visit_office` · `home_office` | `first_visit_office` | new-patient metrics by `office_id` | `home_office` |
| 13 | `new_patient_window_days` | 0-730 | 365 | dimension `patient_new_existing` on production, collection and visit metrics | 365 |
| 14 | `active_patient_window_months` | 12 · 18 · 24 | 18 (PD-5) | `active_patients` and every metric with an active-patient denominator or cohort (`pre_appointment_pct`, `unscheduled_active_patients`, `patients_lost`, `reactivated_patients`, `attrition_rate_pct`, `net_patient_growth_pct`, `hygiene_pre_appointment_pct`, `perio_patient_pct`, `recare_active_pct`, `patient_value_annual`) | 12 |
| 15 | `active_requires_active_flag` | `true` · `false` | `true` | the same list, plus `at_risk_patients` and `lapsed_patients` | `false` [I] |
| 16 | `at_risk_from_months`, `at_risk_to_months` | integers, from < to | 12, 24 | `at_risk_patients`, `lapsed_patients` | 12, 24 |
| 17 | `visit_basis` | `visit_code_charge` · `kept_appointment` | `visit_code_charge` | parameter: denominator `V` of `production_per_visit`, `visits_per_working_day`, `hygiene_production_per_visit` (`patient_visits` or `appointments_kept`) | `visit_code_charge` |
| 18 | `no_show_includes_late_cancel` | `true` · `false` | `false` | aliases `no_show_rate_pct` and `cancellation_rate_pct` → the status-based (`false`) or notice-based (`true`) variants (2.7) | `false` |
| 19 | `late_cancel_hours` | 24 · 48 | 24 | parameter: the notice threshold of the two notice-based variants; needs `appointments.cancelled_at` (DATA-17) | — |
| 20 | `broken_recovery_window_days` | 1-180 | 30 | `broken_appointment_recovery_pct`, `broken_appointment_value_lost` | — |
| 21 | `reappointment_basis` | `booked_at_visit` · `holds_future_now` | `booked_at_visit` | alias `reappointment_pct`; the appointment test of `treatment_reappointment_pct` | `holds_future_now` |
| 22 | `hygiene_reappointment_basis` | `booked_at_visit` · `holds_future_now` · `returned_within_12m` · `any_appointment_at_visit` | `booked_at_visit` | alias `hygiene_reappointment_pct` | `holds_future_now` |
| 23 | `hygiene_appointment_rule` | `code_or_hygienist` · `code_only` · `appointment_type` (after DATA-43) | `code_or_hygienist` | every metric that tests for a hygiene appointment (`HYGA`, 2.8): the hygiene reappointment variants, `hygiene_pre_appointment_pct`, `treatment_reappointment_pct` | `code_or_hygienist` |
| 24 | `case_acceptance_unit` | `dollars` · `plans` · `patients` | `dollars` | alias `case_acceptance_pct`; unit of `case_completion_pct`, `acceptance_completion_gap_pp` | `plans` |
| 25 | `case_acceptance_window_days` | empty (to date) · 30 · 90 | 30 | parameter of `case_acceptance_dollars_pct`, `treatment_accepted_amount`, `avg_accepted_per_patient`; same day is the fixed key `case_acceptance_dollars_same_day_pct`, so 0 is not a value | empty |
| 26 | `case_completion_window_days` | 30-365 | 180 | `case_completion_pct`; the cohort age of `acceptance_completion_gap_pp` | 180 |
| 27 | `unscheduled_tx_max_age_months` | 0 (no cut-off) · 1-60 | 24 | the unscheduled family, through filter `UNSCH` (5.0.1): `unscheduled_treatment_amount`, `unscheduled_treatment_patients`, `pending_treatment_of_todays_patients`, `preauthorized_pct` | 0 |
| 28 | `working_day_basis` | `hybrid` · `calendar` · `activity` · `weekday` · `booked_hours_half_day` | `hybrid` | `working_days` and every per-working-day, pacing and projection metric | `booked_hours_half_day` |
| 29 | `clinical_hours_source` | `booked` · `kept` · `scheduled` · `time_clock` | `booked` | `clinical_hours`, `production_per_hour`, `hygiene_production_per_hour` | `booked` |
| 30 | `fiscal_year_start_month` | 1-12 | 1 | every year-to-date form | 1 |
| 31 | `goal_production_basis` | `net` · `charged` · `gross` | `net` | `production_vs_goal_pct`, `daily_avg_needed_to_goal` (8.4) | `net` |
| 32 | `goal_working_days_fallback` | `provider_calendar` · `office_calendar` · `fixed_20` | `provider_calendar` | goal amounts whose row has no `working_days` (8.3) | `provider_calendar`; the legacy Scheduled Production report uses `fixed_20` |
| 33 | `schedule_completion_factor` | 0.50-1.50 | 1.00 | `production_forecast` | 1.00 |
| 34 | `otc_collection_window_days` | 0 · 7 | 0 | `otc_collection_pct`, `uncollected_copay_amount` | 0 |
| 35 | `eligibility_valid_days` | 1-365 | 30 | `eligibility_verified_pct` | — |
| 36 | `backdated_threshold_days` | 1-30 | 3 | `backdated_entries_count` | — |
| 37 | `ortho_visit_interval_weeks` | 4-16 | 8 | `ortho_missing_visit_patients` | — |
| 38 | `perio_age_min` | 18-40 | 30 | `perio_patient_pct` | — |
| 39 | `patient_age_bands` | ordered list of upper bounds | `12,17,34,49,64` | dimension `age_band` | — |
| 40 | `same_store_min_months` | 12-36 | 13 | `same_store_growth_pct`, `offices_growing_pct` (9.3) | — |
| 41 | `rate_min_denominator` | 0-100 | 10 | every ratio with a count denominator (1.4) and every ranking of one; money, hour and day denominators carry their own minimum in the definition | 0 |
| 42 | `metric_preset` | `standard` · `denticon_practice_analytics` | `standard` | writes every setting that has a value in the "Legacy preset" column (rows 1-34, 41, 44, 45) and the `hygiene_visit` tenant rows | — |
| 43 | `show_external_benchmarks` | `true` · `false` | `false` until D-9 is settled | whether `include[] = benchmark` returns the published values of 9.2; the shipped default bands (`metric_targets`) are not affected | — |
| 44 | `per_visit_production_scope` | `all` · `visit_code` | `all` | parameter: numerator of `production_per_visit` and `hygiene_production_per_visit` — all production of the basis, or `visit_code_production` (5.1), which is the legacy rule | `visit_code` |
| 45 | `hygiene_return_code_group` | `hygiene_visit` · `hygiene_return` | `hygiene_visit` | parameter: the return test of `hygiene_return_12m_pct` and of its synonym `hygiene_retention_12m_pct` (2.8) | `hygiene_return` |
| 46 | `aged_ar_recovery_share` | 0.00-1.00 | 0.45 | stage "aged A/R at risk" of `cash_conversion_waterfall_amount`: the share of A/R over 90 days assumed to be recovered (the publisher's sizing assumption, `research/denticon_analytics_and_dso.md` §14.6) | — |

Not settings, on purpose: adjustment classes and sides (data in `transaction_codes`, versioned, 03 §3.3 rule 3: no
re-classification per run); the legacy archive and positive-payment policies (03 O-1, O-13: keys of the same table, owned
by 03 and versioned with the others); colour bands and targets (`metric_targets`, 8.2); which metrics a dashboard shows
(06).

---

## 4. Versioned code groups

Tables, membership test and tenant override are defined in 03 §2.5 (`rpt_code_groups`, `rpt_code_group_members`: `code_from`,
`code_to`, `valid_from`, `valid_to`, `tenant_id` NULL = shipped default). This section owns the content.

### 4.1 Groups

Source column: **03** = seeded by 03 §2.5 from `research/dental_kpi_dictionary.md` §2.3 · **[R]** = code list printed by the
named vendor source · **[I]** = assembled from CDT knowledge by the author, to be confirmed by the clinical lead before the
seed ships (MET-03). Ranges are inclusive.

| `group_key` | Default members | Used by | Source |
|---|---|---|---|
| `hygiene_visit` | D1110, D1120, D4341, D4342, D4346, D4355, D4910 | hygiene visits, all reappointment variants, `rpt_appointment_facts.has_hygiene_code`, `rpt_patient_activity.last_hygiene_date` | 03; Jarvis list |
| `hygiene_visit_dpa` | D1110, D1120, D4341, D4342, D4355, D4910 | legacy preset: replaces `hygiene_visit` (tenant rows) | [R] `[DPA]` hygiene patient codes |
| `hygiene_return` | D1110, D1120, D4910 | return test of `hygiene_return_12m_pct` when `hygiene_return_code_group = hygiene_return` (legacy preset) | [R] `[DPA]` Hygiene Recall |
| `hygiene_department` | `hygiene_visit` + D1206, D1208, D1330, D1351, D4381, D4921 | `doctor_hygiene_split_basis = code_group` | [I] |
| `prophy`; `prophy_adult`; `prophy_child` | D1110, D1120; D1110; D1120 | retention by patient type | 03; [R] `[DPA]` |
| `perio_maintenance`; `srp`; `perio` | D4910; D4341, D4342; D4341, D4342, D4346, D4355, D4910 | perio metrics | 03 |
| `perio_therapy` | D4341, D4342, D4910 | `perio_patient_pct`, `perio_visit_share_pct` | [R] `DE-HYG15` |
| `perio_dpa` | D4355, D4910 | legacy "Perio %" | [R] `[DPA]` |
| `srp_opportunity_exclusion` | D4341, D4342, D1110, D1120, D4355 | `srp_opportunities` (none of these in 24 months) | [R] `[DPA]` (newer guide) |
| `exam_new_patient`; `exam_recare`; `exam_emergency` | D0150; D0120, D0145; D0140, D0160 | exam counts, scheduled exams, provider retention | 03; [R] `[DPA]` |
| `exam_all` | D0120, D0140, D0145, D0150, D0160, D0170, D0180 | `diagnostic_pct`, `treatment_presented_per_exam` | [I] |
| `fluoride`; `adjunctive` | D1206, D1208; D1206, D1208, D4999, D7465, D4921, D4381 | fluoride and adjunctive rates | 03 |
| `adjunctive_laser`; `adjunctive_irrigation`; `adjunctive_antimicrobial` | D4999, D7465; D4921; D4381 | adjunctive breakdown | [R] `[DPA]` |
| `recall_default` | D0120, D0210, D0330, D1110, D1120, D4910 | recall code default of the criteria screens | 03 |
| `recall_hygiene` | D1110, D1120, D4910 | recall KPIs (a patient overdue only for a panoramic image is not "overdue for recall") | [I] |
| `radiograph_fmx`; `radiograph_pano`; `radiograph_bitewing` | D0210; D0330; D0270, D0272, D0273, D0274, D0277 | radiograph rates | [I] |
| `radiograph` | D0210-D0395 | key procedure counts | [I] |
| `sealant` | D1351, D1352, D1353 | key procedure counts | [I] |
| `filling` | D2140-D2394 | key procedure counts | [I] |
| `crown`; `prefab_crown` | D2710-D2799; D2928-D2934 | key procedure counts | [I] |
| `rct`; `rct_retreat`; `pulpotomy` | D3310, D3320, D3330; D3346, D3347, D3348; D3220, D3221, D3222 | key procedure counts | [I] |
| `extraction` | D7111, D7140, D7210-D7251 | key procedure counts | [I] |
| `implant_placement`; `implant_services` | D6010, D6012, D6013, D6040, D6050; D6000-D6199 | key procedure counts | [I] |
| `denture`; `bridge` | D5110-D5899; D6200-D6999 | key procedure counts | [I] |
| `space_maintainer`; `sedation`; `whitening`; `occlusal_guard` | D1510-D1575; D9222, D9223, D9230, D9239, D9243, D9248; D9972-D9975; D9944-D9946 | specialty and paediatric sets | [I] |
| `restorative_elective` | D2000-D3999, D4210-D4286, D5000-D7999, D9944-D9946, D9972-D9975 | `same_day_treatment_amount`, `treatment_presented_per_exam` | [I] |
| `non_visit_fee_codes` | D9986, D9987 | data check per client database: these codes must have `is_visit_code = false` (a missed or cancelled appointment fee is not a visit and never makes a patient new). The 03 default flags every CDT-pattern code as a visit code, so DATA-04 seeds `is_visit_code = false` for the two codes (REQ-05) and `rpt_data_quality` reports any member that is flagged as a visit code; whether they count as production follows the code's `is_production` flag | [R] Dental Intelligence new-patient rule |
| `ortho`; `ortho_periodic_visit` | D8000-D8999; D8670 | ortho production, visits | 03 |
| `ortho_exam`; `ortho_start`; `ortho_retention` | D8660; D8010-D8090; D8680 | ortho funnel until DATA-42 statuses exist | [I] |
| `contract_billing` | ACBIL, ACBILO | excluded from production (03 O-4) | 03 |

### 4.2 Maintenance rules

| Rule | Detail |
|---|---|
| Shipped defaults | Rows with `tenant_id IS NULL`, loaded by an Alembic data revision. A CDT revision (codes change every 1 January) is a new revision that closes rows with `valid_to` and inserts rows with `valid_from`; history is never edited, so a charge is classified by the members valid on its `service_date` |
| Tenant override | A tenant row set for a `group_key` replaces the default set for that tenant **on every date**: once a tenant has any row for a group, `rpt_code_in_group()` ignores the shipped rows of that group altogether (03 §2.5). An override therefore always holds the complete dated history of the group. Used for practice-specific codes (custom recall or in-house codes) and by the legacy preset (`hygiene_visit` := `hygiene_visit_dpa`) |
| Editing | `PUT /analytics/code-groups/{group_key}` takes the complete member list with an effective date. On the **first** override of a group the server copies the shipped rows of that group, with their own `valid_from` / `valid_to`, as tenant rows and then applies the change from the effective date (closes and inserts rows). Without the copy the group would be empty for every earlier date and the hygiene, exam and recall metrics of past periods would drop to zero. Later edits close and insert tenant rows only. Each edit increments `metric_settings_version` and is audited; it needs the right `analytics_metric_settings_manage` (REQ-15; `reports_administer` until 08 adopts it) |
| Preset rows | The legacy preset writes its tenant rows with `valid_from = 1900-01-01`: past periods are restated on purpose, as with any other setting (section 3) |
| Shipped revisions and overrides | A tenant with an override no longer receives shipped changes of that group. The Alembic data revision of a CDT update writes a `rpt_data_quality` row in every client database that overrides a changed group, so the override can be reviewed; it never edits tenant rows |
| Custom codes | Membership is a string comparison (`p_code BETWEEN code_from AND code_to`, 03 §2.5). A single-code member matches that code only; a range also matches a custom code that sorts inside it (`D2740B` falls in D2710-D2799 — normally what the practice means), and a code that sorts outside every range (an in-house code without the `D` prefix) matches nothing. Two nightly checks write to `rpt_data_quality` (DATA-02): "production not covered by a category or group" (the uncovered amount per code, so the office can map it) and "non-CDT code matched by a default range" (`rpt_procedure_code_dim.is_cdt = false`, listed for confirmation) |
| Overlap | Groups may overlap (a code can be in `hygiene_visit` and `perio`). Dimension `code_group` reports each requested group separately; it is not a partition |
| Lint | Every `g:<group_key>` used in section 5 exists; a default group may not be empty on any date after 2000-01-01. The `non_visit_fee_codes` rule is a data check per client database (4.1): the flags are data, not code, so a build cannot test them |
| Scope | Code groups classify procedures only. Payment and adjustment codes are classified by `transaction_codes` (03 §3.3), appointment and claim statuses by 03 §3.2 |

---

## 5. The catalog

### 5.0 How to read it

#### 5.0.1 Notation

Dataset aliases (columns exactly as in 03 §2; a column that 03 does not have yet is marked NEW where it is used): `c` =
`rpt_charges` · `e` = `rpt_ledger_entries` · `p` = `rpt_payments` · `al` = `rpt_payment_allocations` · `ar` =
`rpt_ar_open_items(:tenant_id, :as_of, NULL, :unit)` · `f` = `rpt_appointment_facts` · `ap` =
`rpt_appointment_procedures` · `v` = `rpt_visits` · `pvs` = `rpt_provider_visits` · `pa` = `rpt_patient_activity` · `pd` =
`rpt_patient_dim` · `pv` = `rpt_provider_dim` · `od` = `rpt_office_dim` · `d` = `rpt_procedure_code_dim` · `cl` =
`rpt_claim_facts` · `ln` = `rpt_claim_lines` · `u` = `rpt_unclaimed_charge_tiers` · `cov` = `rpt_insurance_coverage` · `bu` =
`rpt_benefit_usage(:tenant_id, :as_of)` · `ti` = `rpt_treatment_item_facts` · `rf` = `rpt_referral_facts` · `rd` =
`rpt_recall_due(:tenant_id, :as_of)` · `oc` = `rpt_ortho_contracts` · `ci` = `rpt_contract_installments` · `tc` =
`rpt_time_clock` · `lc` = `rpt_lab_cases` · `cal` = `rpt_office_calendar_days(...)` · `pcal` =
`rpt_provider_calendar_days(...)` (03 §2.28) · `cm` = `rpt_communication_facts` · `na` = `rpt_visit_audit(...)` · `ana` =
`rpt_appointment_note_audit(...)` · `pn` = `rpt_progress_note_facts`.

**A/R unit.** `:unit` of `ar` follows `ar_office_attribution` (section 3 #8): `account_office` with the office read from
`ar.unit_office_id` (default: A/R by transaction office), or `account` with the office read from `ar.home_office_id`. An
`ar` formula is never grouped by the leg's `ar.office_id`.

`Σ x [cond]` = `sum(x) FILTER (WHERE cond)` · `count x [cond]` = rows of `x` · `countd(k) [cond]` = distinct `k` ·
`avg(x) [cond]`. Every component also carries `tenant_id = :tenant_id`, the resolved office scope on the metric's office
column, and the period on its basis column (`BETWEEN :date_from AND :date_to`, both ends inclusive). `today` =
`od.local_today`. Two parameters appear in formulas and are echoed in `resolved_settings{}`: `P` = production on the basis
of `production_basis_for_rates` (default `net_production`; `charged_production`, `gross_production`), and `V` = visits on
the basis of `visit_basis` (default `patient_visits`; `appointments_kept`).

| Named filter | Predicate |
|---|---|
| `PROD` | `c.is_production` |
| `PADJ` | `e.ledger_bucket = 'production_adjustment'` |
| `UNCOLL` | `e.txn_class IN ('bad_debt', 'collection_agency')` |
| `COLL` | `p.counts_as_collection` (every `rpt_payments` row is a payment leg; equals ledger bucket `collection`, R-01) |
| `CADJ` | `e.ledger_bucket = 'collection_adjustment'` |
| `APPT` | `NOT f.is_block AND NOT f.is_deleted AND (NOT f.is_legacy_archive OR :include_legacy_archive)`; `:include_legacy_archive` = `rpt_tenant_flags.include_legacy_archive`, the one archive policy of ledger and appointments (03 O-1; caveat k9) |
| `LIVE` | `APPT AND f.status_class NOT IN ('cancelled', 'no_show')` |
| `LINE` | booked lines of live appointments: `ap.status_class NOT IN ('cancelled', 'no_show') AND NOT ap.is_block AND (NOT ap.is_legacy_archive OR :include_legacy_archive)` |
| `PAST` | `f.appointment_date < f.office_local_today` — today's appointments have not happened yet and stay out of every rate denominator |
| `HYGA` | hygiene appointment per `hygiene_appointment_rule`; default `f.has_hygiene_code OR (f.line_count = 0 AND f.provider_kind = 'hygienist')` |
| `CLM` | `NOT cl.is_preauth AND cl.status_class NOT IN ('deleted', 'void')` |
| `OPENCL` | `CLM AND cl.status_class IN ('sent', 'partially_paid') AND cl.outstanding_quality <> 'unknown'` — the Outstanding Claims rule of 03 §2.20. A migrated claim whose status was mis-mapped to `draft` but carries a sent date classifies as `sent` with quality `unknown`; it is in neither amount nor count, and the number of such rows is returned as warning `claims_unknown_quality_count` |
| `INSURED` | `c.bill_tier <> 'none'`: the line is billable to insurance (03 §2.9: the stored billing order, else derived from the estimates and the coverage rule) |
| `COH` | `ti.era = 'app' AND ti.status_norm NOT IN ('alternative', 'referred_out', 'external_referral', 'existing')` and `ti.presented_date` in the period |
| `UNSCH` | `ti.era = 'app' AND ti.is_unscheduled AND ti.status_norm NOT IN ('alternative', 'existing') AND (unscheduled_tx_max_age_months = 0 OR ti.presented_date >= :as_of − unscheduled_tx_max_age_months)`. `is_unscheduled` already leaves out completed and referred-out items (03 §2.22); the status test removes the items the acceptance cohort `COH` also leaves out |
| `ACTIVE` | the patient has a `v.visit_date` in `(:as_of − W, :as_of]`, `W` = `active_patient_window_months`, and `(pd.is_active OR NOT active_requires_active_flag)` |
| `g:<group_key>(x)` | `x.procedure_code` is a member of the group on the row's date (03 §2.5 test; tenant rows first) |
| `HV` | hygiene visits: distinct `(c.patient_id, c.office_id, c.service_date)` with `PROD AND g:hygiene_visit(c)` |
| `RH` | recall state of a patient in hygiene recall, one value per patient. Rows considered: `rd` rows with `g:recall_hygiene(rd)`, `rd.recall_status <> 'inactive'`, `rd.patient_is_active` and `NOT rd.account_send_collections` (the function excludes nobody, 03 §2.24; these are the defaults of the legacy report). State: `scheduled` when any such row is `scheduled`; otherwise the `recall_status` of the row with the latest `last_completed_date` (NULL last; tie: the earliest `due_date`). A patient who moved from D1110 to D4910 is judged on the D4910 row, not on the stale D1110 row |
| credited provider | per leg and `hygiene_credit_policy` (2.1): charge `coalesce(c.hygienist_id, c.provider_id)` or `c.provider_id`; a linked adjustment follows its charge; an allocation uses `allocation_hygienist_id` / `allocation_provider_id` the same way |

#### 5.0.2 Base measures (`measure_key`)

Additive building blocks, exposed to the builder and used by the roll-ups of 03 §9.1.

| `measure_key` | Expression | Roll-up column (P4) |
|---|---|---|
| `m_gross_production` | `Σ c.office_fee [PROD]` | `rpt_daily_production.gross_production` |
| `m_charged_production` | `Σ c.charged_fee [PROD]` | `rpt_daily_production.charged_production` |
| `m_implied_writeoff` | `Σ c.implied_writeoff [PROD]` | `rpt_daily_production.implied_writeoff` |
| `m_non_production_charges` | `Σ c.charged_fee [NOT c.is_production]` | `rpt_daily_production.non_production_charges` |
| `m_fee_above_office_fee` | `Σ c.fee_above_office_fee [PROD]` | `rpt_daily_production.fee_above_office_fee` |
| `m_visit_code_production` | `Σ c.charged_fee [PROD AND c.is_visit_code]` | `rpt_daily_visits.charged_production` (the same charges, summed per visit row) |
| `m_procedure_count` | `count c [PROD]` | `rpt_daily_production.procedure_count` |
| `m_production_adjustments` | `Σ e.amount [PADJ]` | `rpt_daily_adjustments.amount` where `ledger_bucket = 'production_adjustment'` |
| `m_collection_adjustments` | `Σ e.amount [CADJ]` | `rpt_daily_adjustments.amount` where `ledger_bucket = 'collection_adjustment'` |
| `m_payments` | `−Σ p.amount [COLL]` | `−rpt_daily_collections.amount` where `counts_as_collection` |
| `m_allocated_payments` | `Σ al.amount [al.credit_ledger_bucket = 'collection']` | `rpt_daily_allocated_collections.allocated_amount` where `counts_as_collection AND credit_entry_type IN ('patient_payment', 'insurance_payment')` — on the `allocation_date` basis only (2.2, REQ-04) |
| `m_visits` | `count v` | `rpt_daily_visits.visit_count` |
| `m_provider_visits` | `count pvs` (by `provider_id` only; never summed across providers) | `rpt_daily_provider_visits.provider_visit_count` |
| `m_new_patient_visits` | `count v [v.visit_date = pa.first_visit_date AND v.office_id = pa.first_visit_office_id]` — one row per patient, so the sum over a range equals `new_patients_first_visit` even when the first day was spent at two offices | `rpt_daily_visits.new_patient_visit_count` (REQ-07: counted once per patient) |
| `m_appointments` | `count f [APPT]` by `status_class` | `rpt_daily_appointments` (one count per class, `kept_count`) |
| `m_booked_minutes` | `Σ f.duration_minutes [LIVE]` | `rpt_daily_appointments.booked_minutes` |
| `m_scheduled_fee` | `Σ ap.scheduled_fee [LINE]` | `rpt_daily_appointments.scheduled_fee` |

The roll-up filter is the live filter: the two adjustment measures select `ledger_bucket`, never `txn_side` — the side
differs from the bucket for `AINSO` (side collection, bucket production adjustment) and for the transfer codes `AC010` /
`AD010` (side production, bucket transfer), so a side filter could not pass R-16.

#### 5.0.3 Identities (tests of MET-21; they hold for any scope and period)

| Id | Identity |
|---|---|
| I-1 | `charged_production = gross_production − implied_writeoff + Σ c.fee_above_office_fee [PROD]` (R-22). The three columns carry the sign of the line, so the identity also holds on negative migrated fees (fee −100 with a stored UCR of 120: −120 + 20 + 0) |
| I-2 | A/R movement on the transaction basis, over all ten buckets of 03 §2.12: `Σ e.amount` of the period `= charged_production + non_production_charges + production_adjustments + collection_adjustments − gross_collections + unclassified_adjustments + Σ e.amount [e.ledger_bucket IN ('non_collection_payment', 'non_income_adjustment', 'transfer', 'opening_balance')]`; closing `total_ar` = opening `total_ar` + that movement (R-04). The fixture holds `ATAX`, `AD900`, `AFEED` / `ACCNN`, `COLPY` and a transfer pair, so each of the four A/R-only buckets is exercised |
| I-3 | `doctor_x + hygiene_x + other_x = x` for the five sliced families of 5.0.5 (R-08). For the collection families under the allocation attribution `other_x` holds the non-provider members of 2.2 and the identity is tested on the transaction basis (R-06, R-08) |
| I-4 | `ar_debit_balance − credit_balances = total_ar = Σ e.amount [e.patient_id IS NOT NULL AND e.transaction_date <= :as_of]` for the organisation under both units (R-05, R-14). Per office it holds under unit `account_office` only, where each office's `total_ar` equals that office's ledger balance (R-14b); under unit `account` an office's figure is the balance of the accounts whose home office it is |
| I-5 | `patient_ar + insurance_ar_estimated = ar_debit_balance`; `Σ ar_aging_amount` over the buckets `= ar_debit_balance`, under either unit |
| I-6 | `patient_collections + insurance_collections = gross_collections`; `net_collections = gross_collections − collection_adjustments` |
| I-7 | `appointments_scheduled = Σ over status_class` (R-15); `appointments_booked = appointments_scheduled − appointments_cancelled − appointments_no_show` |
| I-8 | `Σ treatment_funnel_amount` over the four stages `= treatment_presented_amount` |
| I-9 | An alias or a synonym returns exactly the value of the key it resolves to; a slice never exceeds its parent |
| I-10 | The value over all offices equals the sum over offices including the unassigned member for additive metrics (R-07, R-14) |
| I-11 | An adjustment leg with a `procedure_id` has the credited provider, and therefore the `production_group`, of its charge under the policy in force (2.1): the net production of a slice = its charges + the adjustments linked to those charges + the unlinked adjustments that carry a provider of the slice |
| I-12 | The payment component and the allocation component of a collections metric return the same total for the same scope on the transaction basis (R-06, R-08) |

#### 5.0.4 Columns

`Basis` = default date basis (alternates in brackets); `as of` = a metric with `time_semantics = state`. `Dims` = codes of
1.5 plus named dimensions. `Fmt`: `money` · `int` · `dec` · `pct` (wire fraction) · `days` · `hours`. `Dir`: `up`, `down`,
`range`, `—` (neutral). `Avail.` = codes of 1.7; `N(12)` reads "needs DATA-12", `D(12)` "degraded for history until
DATA-12". `Ph` = first phase in which the metric is served. Benchmarks are quoted with their source tag; "bands a / b" are
the shipped default thresholds (below `a` = bad, `a`-`b` = warning, above `b` = good, reversed for direction `down`). A row
whose key is an alias has no formula of its own, and its availability is that of the variant it resolves to.

Basis labels and the `date_basis` value behind each:

| Label in the tables | `date_basis` | In 04 §7.3 |
|---|---|---|
| `service` | `service_date` — also the date of a visit: `rpt_visits.visit_date` is the service date of its charges. 04 reserves `visit_date` for the ortho visit log, so no metric uses that name | yes |
| `transaction`, `created`, `deposit`, `appointment`, `referral date` | `transaction_date`, `created_date`, `deposit_date`, `appointment_date`, `referral_date` | yes |
| `presented` | `diagnosed_date`, bound to `ti.presented_date` (03 §2.22) | yes |
| `submitted`, `first paid`, `allocation` | `submitted_date`, `first_paid_date`, `allocation_date` | no — REQ-16 |
| `work date`, `calendar date`, `business date`, `sent date`, `note date`, `action date` | `work_date`, `calendar_date`, `business_date`, `sent_date`, `note_date`, `action_date` | no — REQ-16 |
| `start date`, `debond date` | `ortho_start_date`, `debond_date` | no — REQ-16 (04 has `ortho_start_date` as an attribute range only) |

#### 5.0.5 Named slices (21 keys)

Slices of a parent metric with a fixed filter. They exist as keys because dashboards, legacy reports and the assistant
name them; every other cut by provider, office or code is a dimension, not a key. A slice takes basis, dimensions, format,
availability and phase from its parent (all parents are P1).

By `production_group` (2.1), 15 keys:

| `metric_key` | Slice of | Fixed filter | Note |
|---|---|---|---|
| `doctor_gross_production` | `gross_production` | `production_group = 'doctor'` | dentists and specialists |
| `hygiene_gross_production` | `gross_production` | `production_group = 'hygiene'` | |
| `other_gross_production` | `gross_production` | `production_group = 'other'` | the third bucket the reference dashboard hides |
| `doctor_net_production` | `net_production` | `'doctor'` | charges by their credited provider; a linked adjustment follows its charge, an unlinked one its own `provider_id` (2.1, I-11) |
| `hygiene_net_production` | `net_production` | `'hygiene'` | reference label "Hygiene Production" |
| `other_net_production` | `net_production` | `'other'`, or an unlinked adjustment without a provider | |
| `doctor_gross_collections` | `gross_collections` | group of the attributed provider (section 3 #5; allocation component of 2.2) `= 'doctor'` | |
| `hygiene_gross_collections` | `gross_collections` | `'hygiene'` | |
| `other_gross_collections` | `gross_collections` | `'other'` plus the members Unassigned provider, Unallocated, Refunded and Opening / transfer (2.2) | printed as "Other / unallocated"; the members are available through `collection_member` |
| `doctor_net_collections` | `net_collections` | `'doctor'` | reference label "Doctor Collection" |
| `hygiene_net_collections` | `net_collections` | `'hygiene'` | reference label "Hygiene Collection" |
| `other_net_collections` | `net_collections` | as `other_gross_collections`, less the collection adjustments of those members (refunds land in Refunded) | |
| `doctor_scheduled_production` | `scheduled_production` | group of the line provider `= 'doctor'` | |
| `hygiene_scheduled_production` | `scheduled_production` | `'hygiene'` | |
| `other_scheduled_production` | `scheduled_production` | `'other'` | |

By code set or code flag, 6 keys:

| `metric_key` | Slice of | Fixed filter | Note |
|---|---|---|---|
| `procedures_done` | `procedure_count` | `ledger_code_flag = true` | legacy "Total Procedures Done" (ledger-code flag; the visit flag is not considered). Equals the parent until an office unflags a code (k8) |
| `new_patient_exams` | `procedure_count` | `code_group = exam_new_patient` | comprehensive exams performed |
| `recare_exams` | `procedure_count` | `code_group = exam_recare` | periodic exams performed (transactions; distinct patients are `recare_patients_seen`) |
| `emergency_exams` | `procedure_count` | `code_group = exam_emergency` | limited and problem-focused exams performed |
| `ortho_exams` | `procedure_count` | `code_group = ortho_exam` | pre-orthodontic examinations; 633.5 exams per practice a year (2025 sample) `PDDS-DD26` |
| `ortho_production` | `charged_production` | `ortho_code_flag = true` | $9,419 per ortho practice per day `PDDS-DD26` |

Counts of crowns, implants, root canals, extractions, sealants and every other group of section 4 are `procedure_count` by
`code_group` and have no key.

#### 5.0.6 Synonym keys (4 keys)

A synonym is a second name for one formula (1.2 `synonym_of`). The response names the key it resolved to; benchmarks,
targets and snapshots belong to the resolved key, so one KPI never has two values.

| `metric_key` | Resolves to | Fixed request shape | Why the name is kept |
|---|---|---|---|
| `revenue_per_procedure` | `production_per_procedure` | — | the label "Revenue per procedure" on category and code-group tiles |
| `provider_working_days` | `working_days` | requires `provider_id` | provider scorecards; legacy "Total Doctor Days" (with `production_group = 'doctor'`) |
| `provider_collection_pct` | `collection_pct` | requires `provider_id`; both components on the provider binding of the policy in force (under `dual`: the treating provider on both sides, 2.1) | provider scorecards; legacy "Collection as a % of Production" per provider |
| `hygiene_retention_12m_pct` | `hygiene_return_12m_pct` | `cohort_offset_months = 12`: the cohort is the hygiene patients of the requested range shifted back 12 months, so the value is always final (2.8) | legacy "Hygiene Retention Rate % (12 Months)"; by `code_group` (child prophy, adult prophy, SRP, perio) the cohort is the patients with a code of that group |

### 5.1 Production

Class `financial_practice` (`provider_comp` by provider). Drill: `daily.production_report`; adjustments
`daily.special_transaction_report`; scheduled `daily.scheduled_production` (expected keys; final keys are owned by `catalog/*`).

| `metric_key` | Label | Definition | Formula | Basis | Dims | Fmt | Dir | Target or benchmark (source) | Avail. | Ph |
|---|---|---|---|---|---|---|---|---|---|---|
| `gross_production` | Gross production (office fee) | Office-fee value of completed production procedures, before any write-off | `Σ c.office_fee [PROD]` | service (transaction, created) | O P C Y N A W | money | up | context: $1.0M per doctor per year incl. hygiene `DE-LEV25` | H (k3) | P1 |
| `charged_production` | Charged production | Posted (contracted) fee of completed production procedures; the legacy "gross production" | `Σ c.charged_fee [PROD]` | service (transaction, created) | O P C Y N A W | money | up | $8,764 per practice per day, 2025 `PDDS-DD26` (expected-fee basis) | H | P1 |
| `implied_writeoff` | Fee-schedule write-off (implied) | Office fee minus posted fee on lines charged below the office fee | `Σ c.implied_writeoff [PROD]` | service | O P C Y | money | — | — | H (k3) | P1 |
| `production_adjustments` | Production adjustments | Signed production-side adjustments (negative lowers production) | `Σ e.amount [PADJ]` | transaction (created; service when linked, 2.1) | O P Y U, `txn_class`, `transaction_code` | money | — | contractual and insurance adjustments 7.8-8.2 % of expected-fee production `PDDS-DD26` | A; history N(12) (k1) | P1 |
| `net_production` | Net production | Charged production plus signed production adjustments (PD-1) | `charged_production + production_adjustments` | service for charges, adjustments per `production_adjustment_dating` (transaction, created) | O P N W; C on the charge part | money | up | $1M per practice per year baseline `PDDS-26` | A; history D(12) (k1) | P1 |
| `net_production_before_bad_debt` | Collectible production | Net production with uncollectible write-offs added back | `net_production − Σ e.amount [PADJ AND UNCOLL]` | as `net_production` | O P | money | up | — | A; history D(12) (k1) | P1 |
| `writeoff_rate_pct` | Write-off rate | Share of office-fee production given up by fee schedule, contract, discount or correction | `safe_div(gross_production − net_production_before_bad_debt, gross_production)` | service | O P Y C | pct | down | none on an office-fee basis; trend by payer | A; history D(12) (k1, k3) | P2 |
| `non_production_charges` | Non-production charges | Posted charges whose code is not production (contract billing) | `Σ c.charged_fee [NOT c.is_production]` | service | O C | money | — | — | H | P1 |
| `unclassified_adjustments` | Unclassified adjustments | Adjustments whose code has no class | `Σ e.amount [e.ledger_bucket = 'unclassified_adjustment']` | transaction | O P, `era` | money | down | 0 for app-era rows (R-13) | H | P1 |
| `estimated_patient_portion` | Estimated patient portion | Patient share of the period's production as estimated at posting | `Σ c.est_patient [PROD]` | service | O P | money | — | — | H (k13) | P2 |
| `estimated_insurance_portion` | Estimated insurance portion | Insurance share of the period's production as estimated at posting | `Σ c.est_insurance [PROD]` | service | O P Y | money | — | — | H (k13) | P2 |
| `visit_code_production` | Visit-code production | Charged production of visit-code procedures plus signed production adjustments: the legacy Executive Summary "Production" line | `Σ c.charged_fee [PROD AND c.is_visit_code] + production_adjustments` | as `net_production` | O P N | money | up | — | A; history D(12) (k1, k8) | P1 |
| `production_per_visit` | Production per visit | Production per patient visit | `safe_div(P_v, V)`; `P_v` = `P` under `per_visit_production_scope = all`, `visit_code_production` (on the basis of `P`) under `visit_code` | service | O P N (no Y: production binds the row payer, visits the patient payer, lint rule 3) | money | up | none published | H; D(12) when `P` = net (k1, k8) | P1 |
| `production_per_hour` | Production per hour | Production per clinical hour | `safe_div(P, clinical_hours)` | service | O P | money | up | consultant targets only (unverified); none shipped | H; D(12) when `P` = net (k1) | P1 |
| `production_per_working_day` | Production per working day | Production per day worked | `safe_div(P, working_days)` (unit per level: 2.10) | service | O P W | money | up | per provider-day 2025: general dentist $3,728, hygienist $1,091 `PDDS-DD26` (expected-fee basis; shown only when `production_basis_for_rates = charged`, 9.1) | H; D(12) when `P` = net (k1) | P1 |
| `production_per_procedure` | Production per procedure | Average posted fee per procedure (synonym `revenue_per_procedure`, 5.0.6) | `safe_div(charged_production, procedures_done)` | service | O P C | money | — | network 2025 by category: preventive $60, restorative $158, crowns $656, implants $1,305 `PDDS-DD26` (expected-fee basis) | H | P2 |
| `scheduled_production` | Scheduled production | Fees on the booked lines of appointments in the window that are not cancelled or missed | `Σ ap.scheduled_fee [LINE]` | appointment | O P C | money | up | compared with the goal of the same days (8.3) | A (k7) | P1 |
| `scheduled_production_start_of_day` | Scheduled production at start of day | Scheduled production as it stood when the office day began | `Σ s.scheduled_fee [s.snapshot_date = s.appointment_date]`, `s` = `rpt_scheduled_production_snapshot` | appointment | O P | money | — | — | G(48) | P4 |
| `actual_vs_scheduled_production_pct` | Actual versus scheduled production | Production of the day against what was scheduled at the start of the day | `safe_div(P, scheduled_production_start_of_day)` | service = appointment day | O P | pct | up | no default band: the vendor's own articles conflict (red below 70 % or below 135 %) `[DPA]` | G(48) | P4 |
| `same_day_treatment_amount` | Same-day treatment | Treatment produced that was neither planned before the day nor booked in advance | `Σ c.charged_fee [PROD AND c.era = 'app' AND g:restorative_elective(c) AND NOT planned_before AND NOT booked_before]`; `planned_before` := the charge's plan item has `ti.presented_date < c.service_date` (P1: `c.is_planned`); `booked_before` := a non-archived line of `c.appointment_id` with the same `procedure_code` whose own `ap.created_date` (NEW, REQ-03: office-local date of `appointment_procedures.created_at`) is before `c.service_date` — a line added during the visit to an appointment booked last week is same-day work; where the line date is missing the appointment's `created_date` is the documented fallback | service | O P C | money | up | same-day dollar acceptance average 31 %, top 50 % `DI-SOD26` (a rate, context only) | A | P1 (refined P3) |
| `production_goal` | Production goal | Goal amount for the scope and period | `goal(scope, period)` (8.3) | — | O P | money | — | — | G(24) | P3 |
| `production_vs_goal_pct` | Production versus goal | Production as a share of the goal of the same elapsed days | `safe_div(P_goal, production_goal)` (8.4) | service | O P | pct | up | bands 85 / 95 `[DPA]` | G(24) | P3 |
| `daily_avg_needed_to_goal` | Daily average needed | Production per remaining working day needed to reach the month's goal | 8.4 | service | O P | money | down | compare with the daily goal | G(24) | P3 |
| `production_forecast` | Production forecast | Production to date plus what is scheduled through the period end | `P [period start .. yesterday] + schedule_completion_factor × scheduled_production [today .. period end]` | service + appointment | O P | money | up | against `production_goal` | A (k7) | P3 |
| `daily_production_volatility_cv` | Daily production volatility | Consistency of day-to-day production | `safe_div(stddev_samp(daily P), avg(daily P))` over the working days of the range (at least 20) | service | O P | dec | down | warning above 0.5, target 0.3-0.5, elite below 0.3 `PDDS-DD26` | H (k1) | P4 |
| `day_of_week_production_index` | Day-of-week balance | Average production of each weekday against the best weekday | `safe_div(avg(daily P on weekday w), max over w of avg(daily P on weekday w))`, working days only | service | O P, W (required) | pct | up | Friday against the peak day: warning below 60 %, target 70-80 %, elite above 80 % `PDDS-DD26` | H (k1) | P4 |

Discounts, finance and late charges, NSF fees and each other class are `production_adjustments` by `txn_class`, not
separate keys. Every metric over `P` (here and in 5.4-5.13) takes the availability of the basis in force: for migrated
history D(12) with k1 when `production_basis_for_rates = net`, H when it is `charged` or `gross`. Caveats k14 (ledger
completeness), k15 and k16 (migrated payments) are blanket caveats (1.7) and are not repeated per row.

### 5.2 Collections and A/R

Class `financial_practice` (`provider_comp` by provider, `user_activity` by user). Drill: `daily.collection_report`,
`daily.deposit_slip`, `monthly.aging_report`, `monthly.income_allocation`, `management.uncollected_copay`.

| `metric_key` | Label | Definition | Formula | Basis | Dims | Fmt | Dir | Target or benchmark (source) | Avail. | Ph |
|---|---|---|---|---|---|---|---|---|---|---|
| `gross_collections` | Gross collections | Patient and insurance payments received; conversion credits and transfers excluded | `−Σ p.amount [COLL]` | transaction (created, deposit) | O P Y U, `payer`, `tender_class`, `deposit_group` | money | up | — | H (k11) | P1 |
| `patient_collections` | Patient collections | Payments from patients and their financing | `−Σ p.amount [COLL AND p.payer = 'patient']` | transaction (created, deposit) | O P U, `tender_class` | money | up | — | H (k11) | P1 |
| `insurance_collections` | Insurance collections | Payments from carriers, both stores (PD-2) | `−Σ p.amount [COLL AND p.payer = 'insurance']` | transaction (created, deposit) | O P Y | money | up | — | H; carrier on app remittances only (k11) | P1 |
| `refunds` | Refunds | Money returned to patients, carriers and finance companies | `Σ e.amount [e.entry_type = 'refund']` | transaction | O U, `txn_class` | money | down | — | A; history N(12) (k1) | P1 |
| `collection_adjustments` | Collection adjustments | Signed collection-side adjustments, refunds and reversals included (positive lowers net collections) | `Σ e.amount [CADJ]` | transaction (created) | O P U, `txn_class`, `transaction_code` | money | — | — | A; history N(12) (k1) | P1 |
| `net_collections` | Net collections | Gross collections less collection adjustments (PD-3, 2.2) | `gross_collections − collection_adjustments` | transaction (created, deposit) | O P Y, `payer` | money | up | — | A; history D(12) (k1, k11) | P1 |
| `collection_pct` | Collection % | Headline collection percentage on the organisation's base | alias by `collection_pct_base` → `net_collection_pct` (default) · `net_collection_pct_after_bad_debt` · `net_collection_pct_charged_base` · `net_collection_pct_gross_base` | transaction | O P | pct | up | bands 95 / 98 | as the resolved variant | P1 |
| `net_collection_pct` | Net collection % | Net collections against collectible production of the same window | `safe_div(net_collections, net_production_before_bad_debt)` | transaction for collections, service for production | O P | pct | up | 98 % `ADA-MS`; at least 98 %, below 95 % systemic `DIQ-RCM`; bottom 93 / average 102 / top 109 `DI-SOD26` | A; history D(12) (k1) | P1 |
| `net_collection_pct_after_bad_debt` | Net collection % (after bad debt) | Net collections against net production | `safe_div(net_collections, net_production)` | as above | O P | pct | up | target 95 %, bands 85 / 95 `[DPA]`; median 88.9 % `PDDS-DD26` | A; history D(12) (k1) | P1 |
| `net_collection_pct_charged_base` | Net collection % (charged base) | Net collections against charged production | `safe_div(net_collections, charged_production)` | as above | O P | pct | up | as `collection_pct` | A; history D(12) (k1) | P1 |
| `net_collection_pct_gross_base` | Net collection % (office-fee base) | Net collections against office-fee production | `safe_div(net_collections, gross_production)` | as above | O P | pct | up | — | A; history D(12) (k1, k3) | P2 |
| `gross_collection_pct` | Gross collection % | Payments received against office-fee production | `safe_div(gross_collections, gross_production)` | as above | O Y | pct | — | average 72-75 %, top 10 % 97 % `HSO-CL` (denominator not stated, context only); no Planet DDS figure (9.1 rule 4) | H (k3) | P2 |
| `collection_pct_rolling_90d` | Collection % (rolling 90 days) | The resolved collection % over the 90 days ending at the period end | `rolling(collection_pct, 90, day)` | as above | O P | pct | up | as `collection_pct` | as the resolved variant | P2 |
| `collection_pct_rolling_12m` | Collection % (rolling 12 months) | The resolved collection % over the 12 months ending at the period end | `rolling(collection_pct, 12, month)` | as above | O P | pct | up | as `collection_pct` | as the resolved variant | P2 |
| `cohort_collection_pct` | Collected to date | Share of a period's collectible production that has been paid so far | `safe_div(Σ al.amount [al.service_date in the period AND al.allocation_target = 'production' AND al.credit_ledger_bucket = 'collection'], net_production_before_bad_debt)` | service | O P Y | pct | up | — | A; H (k4) | P2 |
| `otc_collection_pct` | Time-of-service collection | Estimated patient portion collected on the day of service | `safe_div(Σ_u least(pay_u, est_u), Σ_u est_u)` over account-office-days `u` with `est_u > 0`; `est_u = Σ c.est_patient [PROD]`; `pay_u = −Σ p.amount [COLL AND p.payer = 'patient']` of the same account and office from the service day through `otc_collection_window_days`. The unit spans providers and the estimate has no poster, so no P; U = the user who posted the unit's charges (`c.user_key`, the front-office scorecard) | service | O U | pct | up | warning below 80 %, target 80-95 %, elite above 95 %; median 91.3 % `PDDS-DD26` | A; H (k13) | P2 |
| `uncollected_copay_amount` | Uncollected patient portion | Estimated patient portion not collected at the time of service | `Σ_u greatest(est_u − pay_u, 0)` over the same units | service | O U | money | down | — | A; H (k13) | P2 |
| `patient_collection_share_pct` | Patient share of collections | Patient payments as a share of all payments | `safe_div(patient_collections, gross_collections)` | transaction | O | pct | — | — | H | P2 |
| `days_to_payment` | Days to payment | Payment-weighted days from service to payment | `safe_div(Σ al.amount × (al.credit_transaction_date − al.service_date), Σ al.amount)` over `[al.allocation_target = 'production' AND al.credit_ledger_bucket = 'collection']` | transaction of the payment | O Y, `payer` | days | down | — | A; H (k4) | P2 |
| `total_ar` | Total A/R (net) | Receivables as of a date: debit balances less credit balances | `Σ ar.open_amount` (= `Σ e.amount [e.transaction_date <= :as_of]`, R-05) | as of | O P | money | down | below $350K per office `PDDS-26` | H | P2 (one account: P1) |
| `ar_debit_balance` | A/R (debit balances) | Open amount of unpaid debits after credits are applied oldest first per account (PD-4) | `Σ ar.open_amount [ar.item_kind = 'open_debit']` | as of | O P, `aging_bucket` | money | down | — | H | P2 |
| `credit_balances` | Credit balances | Credits that exceed every open debit of their account | `−Σ ar.open_amount [ar.item_kind = 'unallocated_credit']` | as of | O | money | down | — | H | P2 |
| `patient_ar` | Patient A/R | Patient-responsible part of the open debits | `Σ ar.open_patient [ar.item_kind = 'open_debit']` | as of | O P, `aging_bucket` | money | down | — | H (`split_quality` footnote; history N(10)) | P2 |
| `insurance_ar_estimated` | Insurance A/R (estimated) | Part of the open debits still expected from insurance | `Σ ar.open_insurance_est` | as of | O P | money | down | — | H (same footnote) | P2 |
| `ar_aging_amount` | A/R by age | Open debits by ageing bucket of the organisation's bucket set | `Σ ar.open_amount [ar.item_kind = 'open_debit']` grouped by the `rpt_aging_bucket_sets` row with `ar.age_days` between `min_days` and `max_days` | as of | O P, `aging_bucket` (required) | money | — | — | H | P2 |
| `ar_over_90_amount` | A/R over 90 days | Open debits in the buckets that start at 90 days or later | `Σ ar.open_amount [ar.item_kind = 'open_debit' AND bucket.min_days >= 90]` | as of | O P | money | down | below $50K per office `PDDS-26` | H | P2 |
| `ar_over_90_pct` | A/R over 90 days % | Share of the open debits older than 90 days | `safe_div(ar_over_90_amount, ar_debit_balance)` | as of | O P | pct | down | warning above 50 %, target 15-30 %, elite below 15 % `PDDS-DD26` | H | P2 |
| `ar_days` | Days in A/R | Headline days in A/R on the organisation's basis | alias by `ar_days_basis` → `ar_days_production_90d` (default) · `ar_days_collections_business_days` · `ar_days_collections_calendar_days` | as of | O | days | down | see the variants | as the resolved variant | P2 |
| `ar_days_production_90d` | Days in A/R (production, 90 days) | Days of net production that sit in receivables | `safe_div(total_ar, safe_div(net_production of the 90 days ending :as_of, 90))` | as of | O | days | down | bottom 74 / average 26 / top 5 `DI-SOD26` (formula not published: context only) | A; history D(12) (k1) | P2 |
| `ar_days_collections_business_days` | Days sales outstanding (business days) | Business days of net collections that sit in receivables: the legacy "Avg. Days Sales Outstanding" | `safe_div(total_ar, safe_div(net_collections, Monday-Friday days of the range))` | as of; range for the collections | O | days | down | — | A; history D(12) (k1) | P2 |
| `ar_days_collections_calendar_days` | Days in A/R (gross collections, calendar days) | Calendar days of payments received that sit in receivables | `safe_div(total_ar, safe_div(gross_collections, days of the range))` | as of; range for the collections | O | days | down | — | H | P2 |
| `patient_ar_past_due_amount` | Patient A/R past due | Patient-responsible open amount older than 30 days | `Σ ar.open_patient [ar.item_kind = 'open_debit' AND ar.age_days > 30]` | as of | O P | money | down | — | H | P2 |
| `bad_debt_amount` | Bad debt written off | Balances written off as uncollectible | `−Σ e.amount [PADJ AND e.txn_class = 'bad_debt']` | transaction | O P U | money | down | — | A; history N(12) | P2 |
| `bad_debt_rate_pct` | Bad-debt rate | Bad debt as a share of charged production | `safe_div(bad_debt_amount, charged_production)` | transaction / service | O | pct | down | warning above 5 %, target 1-3 %, elite below 1 %; median 3.6 % `PDDS-DD26` | A; history N(12) | P2 |
| `ar_of_todays_patients` | A/R of today's patients | Patient-responsible balance of the accounts of patients on today's schedule | `Σ over accounts of greatest(Σ ar.open_patient, 0)` for accounts with a patient having `f [LIVE AND f.appointment_date = today]` | as of today | O (appointment office) P (appointment provider) | money | down | — | H | P3 |

A/R rows (`total_ar` to `patient_ar_past_due_amount`) read `ar` with the allocation unit of `ar_office_attribution` (5.0.1,
section 3 #8): unit `account_office` with office column `unit_office_id` by default, unit `account` with `home_office_id`
under `home_office`. `total_ar` is equal under both units at organisation level (R-14); debit balances, credit balances,
every ageing bucket, `ar_over_90_pct` and `patient_ar` differ between the units at every level. Tiles and exports print the
unit. Past values come from `rpt_ar_snapshot`, whose `attribution` column holds both units (`transaction_office` = unit
`account_office`, `home_office` = unit `account`, 03 §9.1).

### 5.3 Insurance and revenue cycle

Class `financial_practice` for money, `aggregate` for counts and rates. Drill: `insurance.outstanding_claims`,
`insurance.claims_created_not_sent`, `insurance.claims_not_created`, `insurance.procedures_on_hold`,
`insurance.dps_eligibility_report`, worklist `worklists.eligibility_verification`.

| `metric_key` | Label | Definition | Formula | Basis | Dims | Fmt | Dir | Target or benchmark (source) | Avail. | Ph |
|---|---|---|---|---|---|---|---|---|---|---|
| `claims_submitted_count` | Claims submitted | Claims sent in the period | `count cl [CLM AND cl.submitted_date in the period]` | submitted | O Y, `tier` | int | — | — | H (k5) | P2 |
| `outstanding_claims_amount` | Outstanding claims | Amount still expected on sent claims | `Σ cl.outstanding_amount [OPENCL]` over every tier: the outstanding amount is per tier and additive across a claim family (03 §2.20); `tier` is an optional dimension. Only `billed_amount` and `ucr_amount` repeat across a family and are never summed. Excluded `unknown` rows: warning `claims_unknown_quality_count` | as of today | O Y P (treating → billing), `tier`, `claim_age_bucket` | money | down | — | H (k5, k12); rows with `expected_basis = 'billed'` footnoted | P2 |
| `outstanding_claims_count` | Outstanding claims (count) | Sent claims not yet settled | `count cl [OPENCL]` | as of today | O Y, `tier`, `claim_age_bucket` | int | down | — | H (k5, k12) | P2 |
| `claims_over_90_pct` | Insurance A/R over 90 days | Outstanding claim amount sent more than 90 days ago | `safe_div(Σ cl.outstanding_amount [OPENCL AND :as_of − cl.age_date_sent > 90], Σ cl.outstanding_amount [OPENCL])` | as of | O Y | pct | down | below 20 %; practices commonly 35-50 % `DIQ-RCM` | H (k5, k12) | P2 |
| `claims_unsent_count` | Claims created, not sent | Claims that exist and were never sent | `count cl [CLM AND cl.status_class = 'unsent']` | as of | O Y U | int | down | 0 at the end of the day | A (migrated `draft` statuses unreliable, k5) | P2 |
| `unbilled_production_amount` | Unbilled insured production | Billable production with no primary claim: the total of Claims Not Created for the primary tier | `Σ u.charged_fee [NOT u.has_claim AND u.tier = 'primary']` (`rpt_unclaimed_charge_tiers` holds production lines with `bill_tier <> 'none'` against today's dental slots; held lines included, as in the legacy report) | service | O P | money | down | — | A; history N(10) (coverage is today's, k12) | P2 |
| `unbilled_production_pct` | Unbilled share of insured production | Unbilled insured production as a share of insured production | `safe_div(unbilled_production_amount, Σ c.charged_fee [PROD AND INSURED])` | service | O P | pct | down | reviews found 5-15 % of production without a claim `DIQ-RCM` | A; history N(10) | P2 |
| `procedures_on_hold_amount` | Procedures on hold | Production held back from claims | `Σ c.charged_fee [PROD AND c.billing_state = 'hold']` | service | O P | money | down | — | A | P2 |
| `same_day_claim_rate_pct` | Same-day claim rate | Claims sent on or before the last service date | `safe_div(count cl [CLM AND cl.tier = 'primary' AND cl.submitted_date <= cl.service_to], count cl [CLM AND cl.tier = 'primary'])`, cohort by `service_to`: every primary claim of the cohort, sent or not, as the publisher divides | service | O Y U | pct | up | warning below 20 %, target 40-80 %, elite above 80 % `PDDS-DD26` | A; history N(10) | P2 |
| `claim_submission_lag_days` | Claim submission lag | Days from the last service date to sending | `avg(cl.submitted_date − cl.service_to)` over the same cohort | service | O Y U | days | down | 3.0 days in the top tier against 10.4 `PDDS-DD26` | A; history N(10) | P2 |
| `claim_days_to_payment` | Claim turnaround | Days from sending a claim to its first payment | `avg(cl.first_paid_date − cl.submitted_date) [CLM AND both dates present]`, cohort by `first_paid_date` | first paid | O Y | days | down | 92 % of US dental claims paid in under 20 days, 97 % under 30 `PDDS-25` | H | P2 |
| `contractual_writeoff_rate_pct` | Contractual write-off rate | Office-fee production conceded by contract | `safe_div(Σ c.implied_writeoff [PROD] − Σ e.amount [e.txn_class = 'contractual_writeoff'], gross_production)` (`AD900`, the capitation offset, is not a write-off: bucket `non_income_adjustment`, 2.1) | service / transaction | Y C P O | pct | — | none on an office-fee basis | H (k1, k3); carrier of explicit write-offs app era only | P2 |
| `insured_production_share_pct` | Insured share of production | Charged production of lines that carry a payer | `safe_div(Σ c.charged_fee [PROD AND INSURED], charged_production)` — the same INSURED filter as `unbilled_production_pct` | service | O P | pct | — | 57 % of patients insured `DE-LEV25` (patients, not production) | A; payer on the service date G(33) | P2 |
| `eligibility_verified_pct` | Eligibility verified | Insured appointments whose primary dental coverage was verified recently | `safe_div(count f [LIVE AND insured AND cov.elig_status_class = 'verified' AND cov.elig_verified_on >= f.appointment_date − eligibility_valid_days], count f [LIVE AND insured])`; `insured` := a `cov` row with `category = 'dental'` and `tier = 'primary'` | appointment (default: next 7 days) | O U Y | pct | up | verify 24-48 hours ahead `DIQ-RCM` | A (k12); history G(34) | P3 |
| `denial_rate_pct` | Denial rate (proxy) | Denied claims among adjudicated claims | `safe_div(count cl [CLM AND cl.status_class = 'denied'], count cl [CLM AND cl.status_class IN ('paid', 'partially_paid', 'closed', 'denied')])`, cohort by `submitted_date` | submitted | O Y | pct | down | at most 4 %; above 8 % risks payer review `DIQ-RCM` | A (status only); dated denials G(31); reason codes N(38) | P2 |
| `first_pass_claim_rate_pct` | First-pass claims (proxy for clean-claim rate) | Adjudicated claims that needed one submission | `safe_div(count cl [CLM AND cl.submission_count = 1 AND cl.status_class IN ('paid', 'partially_paid', 'closed')], count cl [CLM AND cl.status_class IN ('paid', 'partially_paid', 'closed', 'denied')])` | submitted | O Y U | pct | up | clean-claim rate above 98 % `DIQ-RCM` (the true rate needs clearinghouse acknowledgements, N(38)) | A | P2 |
| `insurance_estimate_accuracy_pct` | Estimate accuracy | Closeness of the primary estimate to what was paid | `1 − safe_div(Σ abs(ln.est_for_tier − ln.ins_paid_amount), Σ ln.est_for_tier)` over `ln.tier = 'primary' AND ln.status_class IN ('paid', 'closed') AND NOT ln.is_preauth`, dated by `cl.first_paid_date` joined on `claim_id` | first paid | Y C O | pct | up | none published | A (remittance lines) | P2 |
| `benefits_remaining_amount` | Unused benefits of patients with pending treatment | Remaining annual maximum of patients who still have treatment to do | `Σ bu.max_remaining_effective` over primary dental slots of patients with a `ti.is_pending` item | as of | O Y | money | — | — | A; plan limits N(32) | P3 |
| `capitation_value_of_services` | Value of services to capitation members | Office-fee value of work done for members of prepaid plans | `Σ c.office_fee [PROD AND the patient's primary dental cov.is_prepaid]` | service | O Y | money | — | — | N(32) (prepaid flag), G(33) | P3 |
| `capitation_utilization_pct` | Capitation utilisation | Capitation payments and member co-payments against the value of services | `safe_div(−Σ p.amount [p.txn_class = 'capitation_payment'] + patient_collections of capitation members, capitation_value_of_services)` | transaction / service | O Y | pct | — | — | G(33) | P3 |

### 5.4 Scheduling and capacity

Class `aggregate` (hours by provider: `provider_comp`). Drill: `appointment.appointment_list`, `appointment.appointment_detail`,
`appointment.missed_appointments_not_marked_as_missed`, `lists.patients_seen`.

| `metric_key` | Label | Definition | Formula | Basis | Dims | Fmt | Dir | Target or benchmark (source) | Avail. | Ph |
|---|---|---|---|---|---|---|---|---|---|---|
| `appointments_scheduled` | Appointments scheduled | Every appointment dated in the period, whatever its outcome | `count f [APPT]` | appointment | O P N W, `provider_kind`, `operatory_id`, `status_class` | int | — | — | H (k7, k9) | P1 |
| `appointments_booked` | Appointments on the books | Appointments that are not cancelled or missed | `count f [LIVE]` | appointment | O P W, `provider_kind`, `operatory_id` | int | — | — | H (k9) | P1 |
| `appointments_kept` | Appointments kept | Completed appointments, or past ones with a same-day charge | `count f [APPT AND f.is_kept]` | appointment | O P N W | int | up | — | H | P1 |
| `appointments_cancelled` | Cancelled appointments | Appointments cancelled | `count f [APPT AND f.status_class = 'cancelled']` | appointment | O P N W | int | down | — | H | P1 |
| `appointments_no_show` | No-shows | Appointments missed without cancelling | `count f [APPT AND f.status_class = 'no_show']` | appointment | O P N W | int | down | — | H | P1 |
| `cancellation_rate_pct` | Cancellation rate | Headline cancellation rate on the organisation's rule | alias by `no_show_includes_late_cancel` → `cancellation_rate_status_based_pct` (`false`, default) · `cancellation_rate_notice_based_pct` (`true`) | appointment | O P N Y W | pct | down | see the variants | as the resolved variant | P1 |
| `cancellation_rate_status_based_pct` | Cancellation rate (status) | Cancelled share of past scheduled appointments, whatever the notice | `safe_div(count f [APPT AND PAST AND f.status_class = 'cancelled'], count f [APPT AND PAST])` | appointment | O P N Y W | pct | down | warning above 20 %, target 10-15 %, elite below 10 % `PDDS-DD26` (similar: the publisher counts cancellations in advance only); average 5 % `HSO-CL` (context only) | H | P1 |
| `cancellation_rate_notice_based_pct` | Cancellation rate (with notice) | Appointments cancelled at least `late_cancel_hours` before the start | `safe_div(count f [APPT AND PAST AND f.status_class = 'cancelled' AND hours_before(f) >= late_cancel_hours], count f [APPT AND PAST])`; `hours_before(f)` := (`f.appointment_date` + `f.start_time` in the office zone) − `f.cancelled_at`, with `cancelled_at` NEW (DATA-17) | appointment | O P N Y W | pct | down | 12.9 %; warning above 20 %, target 10-15 %, elite below 10 % `PDDS-DD26` (same) | G(17) | P3 |
| `no_show_rate_pct` | No-show rate | Headline no-show rate on the organisation's rule | alias by `no_show_includes_late_cancel` → `no_show_rate_status_based_pct` (default) · `no_show_rate_notice_based_pct` | appointment | O P N Y W | pct | down | see the variants | as the resolved variant | P1 |
| `no_show_rate_status_based_pct` | No-show rate (status) | Missed share of past scheduled appointments | `safe_div(count f [APPT AND PAST AND f.status_class = 'no_show'], count f [APPT AND PAST])` | appointment | O P N Y W | pct | down | 6.9 % (2025) `PDDS-DD26` (similar: the publisher adds failures without prior notice); average 3 %, top 10 % below 1 % `HSO-CL` (context only) | H | P1 |
| `no_show_rate_notice_based_pct` | No-show rate (incl. late cancellations) | Missed, or cancelled less than `late_cancel_hours` before the start | `safe_div(count f [APPT AND PAST AND (f.status_class = 'no_show' OR (f.status_class = 'cancelled' AND hours_before(f) < late_cancel_hours))], count f [APPT AND PAST])` | appointment | O P N Y W | pct | down | 6.9 % (2025) `PDDS-DD26` (same: "failed without prior notice") | G(17) | P3 |
| `broken_appointment_rate_pct` | Broken appointments | Cancelled plus missed share | `safe_div(count f [APPT AND PAST AND f.status_class IN ('cancelled', 'no_show')], count f [APPT AND PAST])` | appointment | O P N W | pct | down | at most 5 % `ADA-MS` | H | P1 |
| `broken_appointment_recovery_pct` | Broken appointments recovered | Broken appointments followed by a new appointment | `safe_div(count f [broken AND recovered], count f [broken])`; `broken` := `APPT AND f.status_class IN ('cancelled', 'no_show')`; `recovered` := the patient holds a `LIVE` appointment dated after it and within `broken_recovery_window_days`, or any future one | appointment | O P U | pct | up | — | H | P3 |
| `broken_appointment_value_lost` | Value of unrecovered broken appointments | Scheduled fees of broken appointments never recovered | `Σ f.scheduled_fee [broken AND NOT recovered]` | appointment | O P | money | down | — | A (k7) | P3 |
| `unresolved_past_appointments` | Past appointments never resolved | Past appointments that are neither kept, cancelled nor missed and have no charge that day | `count f [APPT AND f.status_class = 'past_unresolved' AND NOT f.has_charge_same_day]` | appointment | O P | int | down | 0 | H | P3 |
| `unconfirmed_appointments` | Unconfirmed appointments | Upcoming appointments not yet confirmed (count; amount = `Σ f.scheduled_fee`) | `count f [LIVE AND NOT f.is_confirmed AND f.appointment_date BETWEEN today AND today + 7]` | as of today | O P | int | down | — | A | P3 |
| `confirmation_rate_pct` | Confirmation rate | Confirmed share of appointments on the books | `safe_div(count f [LIVE AND f.is_confirmed], count f [LIVE])` | appointment | O P U | pct | up | none published | A | P3 |
| `scheduled_exams` | Exams on the schedule | Appointments with a booked exam line, by exam type | `countd(ap.appointment_id) [ap.status_class NOT IN ('cancelled', 'no_show') AND the line is in g:exam_new_patient, g:exam_recare or g:exam_emergency]` | appointment | O P, `exam_type` | int | — | — | A (k7) | P3 |
| `booked_hours` | Booked hours | Appointment time that is not cancelled, missed or blocked | `Σ f.duration_minutes [LIVE] ÷ 60` | appointment | O P, `provider_kind`, `operatory_id` | hours | — | — | H | P1 |
| `chair_hours` | Chair hours | Appointment time of kept appointments | `Σ f.duration_minutes [APPT AND f.is_kept] ÷ 60` | appointment | O P | hours | — | — | H | P2 |
| `clinical_hours` | Clinical hours | The hours behind every per-hour metric | alias by `clinical_hours_source` → `booked_hours` (default) · `chair_hours` · `provider_scheduled_hours` · `clocked_hours` | — | O P | hours | — | 30.5 hours a week treating patients, general dentists `ADA-SDP` | H | P1 |
| `office_open_hours` | Office open hours | Hours the office is open on its open days: the reference "Working Hours" row (6.1) | `Σ cal.open_minutes [cal.is_open] ÷ 60` | calendar date | O | hours | — | — | H (k10: today's template; `hours_source` printed) | P1 |
| `chair_capacity_hours` | Chair capacity | Bookable chair time of the open office days (provider time is `provider_scheduled_hours`, 5.8) | `Σ cal.chair_capacity_minutes ÷ 60` | calendar date | O | hours | — | — | H (k10) | P1 |
| `provider_utilization_pct` | Provider utilisation | Booked share of available provider time | `safe_div(booked_hours, provider_scheduled_hours)` | appointment | O P, `provider_kind` | pct | range | 85-90 % common vendor target (unverified); band 75-90 | A (k10) | P3 |
| `chair_utilization_pct` | Chair utilisation | Booked share of chair capacity | `safe_div(Σ f.duration_minutes [LIVE AND f.operatory_id IS NOT NULL] ÷ 60, chair_capacity_hours)` | appointment | O, `operatory_id` | pct | range | 75-85 % of available hours (reference vendor article) | A (k10) | P3 |
| `open_time_pct` | Open time | Unbooked share of available provider time in a future window | `greatest(1 − provider_utilization_pct, 0)` over the next 10 open days (default window); an overbooked window shows 0 with warning `overbooked` | as of today | O P | pct | down | hygiene downtime at most 5-8 % `DE-HYG15` | A (k10, k12) | P3 |
| `working_days` | Working days | Days worked (elapsed) or open (future) per `working_day_basis`; office-days summed above one office, provider-days by provider (2.10). Synonym `provider_working_days` (5.0.6) | builder `working_days` (provider day under `booked_hours_half_day`: 0.5 when the booked minutes of the provider-day are at most 240, else 1.0) | — | O P | dec | — | — | H; future days k10 | P1 |
| `patient_visits` | Patient visits | Patient-office-days with a visit-code production charge | `count v`; by `provider_id`: `count pvs` of the role chosen by `hygiene_credit_policy` (2.1, 2.6), non-additive across providers; roll-ups `rpt_daily_visits` / `rpt_daily_provider_visits` | service | O P N Y A | int | up | 9-15 patients a day in a restorative practice `JAR-BM3` | H (k8, k9) | P1 |
| `patients_seen` | Patients seen | Distinct patients with a visit | `countd(v.patient_id)`; by `provider_id`: `countd(pvs.patient_id)` of the same role | service | O P N Y A | int | up | — | H (k8, k9) | P1 |
| `visits_per_working_day` | Visits per working day | Patient visits per day worked | `safe_div(V, working_days)` | service | O P | dec | up | hygienist 7-8 patients per 8-hour day `JAR-BM2` | H | P1 |
| `new_patient_lead_days` | New-patient lead time | Days from booking to the first appointment of a new patient | `avg(f.lead_days) [APPT AND f.is_new_patient AND f.created_at_reliable]`, cohort by `created_date` | created | O P | days | down | average 23 days, top 10 % 7 days `HSO-CL`; 12.0 business days `ADA-Q3-26` | A | P3 |
| `pre_appointment_pct` | Pre-appointment % | Active patients who hold a future appointment | `safe_div(count pa [ACTIVE AND pa.next_appointment_date IS NOT NULL], active_patients)` | as of today | O A | pct | up | bottom 28 / average 54 / top 75 `DI-SOD26` (18-month window) | H (k12) | P3 |
| `reappointment_pct` | Reappointment % | Patients seen who have a next appointment | alias by `reappointment_basis` → `reappt_at_visit_pct` (default) · `reappt_holds_now_pct` | service | O P N Y | pct | up | bands 85 / 95 `[DPA]` | as the resolved variant (no substitution for migrated-only periods, 2.8) | P3 |

| `reappt_at_visit_pct` | Reappointed at the visit | Visits after which a later appointment already existed by the end of the day | `safe_div(count v [EXISTS f: f.patient_id = v.patient_id AND APPT AND f.appointment_date > v.visit_date AND f.created_date <= v.visit_date AND f.status_class <> 'cancelled'], count v [v.era = 'app'])` | service | O P N Y | pct | up | average 76 %, top 10 % 92 % `HSO-CL` (definition not stated) | A; later cancellations dated only by DATA-17 | P3 |
| `reappt_holds_now_pct` | Holds a future appointment | Patients seen in the period who hold a future appointment today | `safe_div(countd(v.patient_id) [pa.next_appointment_date IS NOT NULL], countd(v.patient_id))` | service; state as of today | O P Y | pct | up | bands 85 / 95 `[DPA]` | H (k12) | P3 |
| `unscheduled_active_patients` | Unscheduled active patients | Active patients with nothing booked | `count pa [ACTIVE AND pa.next_appointment_date IS NULL]` | as of today | O P (last-visit provider), `months_since_last_visit_band` (0-6, 6-9, 9-12, 12-18) | int | down | implied average 46 % of active patients `DI-SOD26` | H (k12) | P3 |

### 5.5 Hygiene and recare

Class `aggregate` (money rows `financial_practice`; by provider `provider_comp`). Drill: `recall.recall_due_report`,
`recall.scheduled_recall_report`, `recall.procedural_recall_report`, worklist `worklists.recall_due`. `HV` and `HYGA` are
defined in 5.0.1.

| `metric_key` | Label | Definition | Formula | Basis | Dims | Fmt | Dir | Target or benchmark (source) | Avail. | Ph |
|---|---|---|---|---|---|---|---|---|---|---|
| `hygiene_visits` | Hygiene visits | Patient-office-days with a hygiene-visit code | `count HV` | service | O P N A | int | up | — | H | P1 |
| `hygiene_visits_per_working_day` | Hygiene visits per day | Hygiene visits per working day of hygiene providers | `safe_div(hygiene_visits of the hygiene slice, working_days of the hygiene slice)`; both sides use one split basis: under `provider_kind` the `HV` rows credited to a provider of group `hygiene` and that group's provider-days; under `code_group` every `HV` row and the provider-days with a `hygiene_department` charge | service | O P | dec | up | 7-8 patients per 8-hour day `JAR-BM2` | H (k2) | P3 |
| `hygiene_production_share_pct` | Hygiene share of production | Hygiene net production as a share of net production | `safe_div(hygiene_net_production, net_production)` | service | O | pct | range | 25 % `ADA-MS`; 25-35 % `DE-HYG15`; band 25-35 | H (k1, k2) | P1 |
| `hygiene_production_per_visit` | Hygiene production per visit | Production of the hygiene slice per hygiene visit | `safe_div(P_v of the hygiene slice, V of the hygiene slice)`; `V` = hygiene visits of the slice (as `hygiene_visits_per_working_day`), or kept `HYGA` appointments under `visit_basis = kept_appointment`; `P_v` per `per_visit_production_scope` | service | O P | money | up | none published | H (k2) | P3 |
| `hygiene_production_per_hour` | Hygiene production per hour | Production of the hygiene slice per clinical hour of hygiene providers | `safe_div(P of the hygiene slice, clinical_hours of the providers of the slice)`; under `code_group` the hours are those of appointments with `HYGA` | service | O P | money | up | $1,091 per hygienist-day `PDDS-DD26` (a per-day figure: context only); hourly targets unverified | H (k2) | P3 |
| `hygiene_reappointment_pct` | Hygiene reappointment % | Headline hygiene reappointment on the organisation's basis | alias by `hygiene_reappointment_basis` → the four keys below | service | O P N A Y | pct | up | bands 85 / 90 on the at-visit variant | as the resolved variant: an at-visit variant returns `not_available` with `history_starts_on` for migrated-only periods (2.8) | P1 |
| `hygiene_reappt_at_visit_pct` | Hygiene reappointed at the visit | Hygiene visits after which the next hygiene appointment already existed by the end of the day | `safe_div(count HV [EXISTS f: f.patient_id = HV.patient_id AND APPT AND HYGA AND f.appointment_date > HV.service_date AND f.created_date <= HV.service_date AND f.status_class <> 'cancelled'], count HV [app era])` | service | O P N A Y | pct | up | bottom 53 / average 87 / top 94 `DI-SOD26` | A | P1 |
| `hygiene_reappt_holds_now_pct` | Hygiene patients holding an appointment | Hygiene patients of the period who hold a future hygiene appointment today | `safe_div(countd(HV.patient_id) [EXISTS f: LIVE AND HYGA AND f.appointment_date >= today], countd(HV.patient_id))` | service; state as of today | O P A Y | pct | up | bands 85 / 95 `[DPA]`; 90 % of recare patients scheduled at all times `ADA-MS` (similar: a point-in-time reading) | H (k12) | P1 |
| `hygiene_return_12m_pct` | Hygiene patients who returned within 12 months | Hygiene patients of the period who had another hygiene visit within 12 months (synonym `hygiene_retention_12m_pct` for the cohort one year back, 5.0.6) | `safe_div(countd(HV.patient_id) [a charge in the group named by hygiene_return_code_group within 12 months after the patient's last hygiene visit of the period], countd(HV.patient_id))`; with `cohort_offset_months = 12` the cohort is the requested range shifted back 12 months; by `code_group` the cohort is the patients with a code of that group | service | O P A, `code_group` | pct | up | 63 % (2025), 60 % (2024) `PDDS-DD26` | H; `is_provisional` until 12 months after the cohort end | P3 |
| `hygiene_reappt_any_at_visit_pct` | Hygiene visit with any next appointment | As the at-visit variant, any later appointment counts | the at-visit formula without `HYGA` | service | O P | pct | up | none published (Practice by Numbers definition) | A | P3 |
| `hygiene_pre_appointment_pct` | Hygiene pre-appointment % | Active hygiene patients who hold a future hygiene appointment | `safe_div(count pa [pa.last_hygiene_date > :as_of − W AND EXISTS f: LIVE AND HYGA AND f.appointment_date >= today], count pa [pa.last_hygiene_date > :as_of − W])` | as of today | O | pct | up | bottom 26 / average 59 / top 80 `DI-SOD26` | H (k12) | P3 |
| `recall_overdue_patients` | Patients overdue for recall | Patients past a hygiene recall date with no future appointment carrying the recall code | `count patients [RH = 'overdue']` (`RH`, 5.0.1: active patients, accounts not in collection, one state per patient); the looser test "no future appointment at all" is the dimension `has_any_future_appointment` | as of | O P (preferred hygienist → provider), `has_any_future_appointment` | int | down | — | H (derived intervals, 03 §2.24); maintained rows N(41) | P3 |
| `recall_overdue_pct` | Recall overdue % | Overdue share of patients in hygiene recall | `safe_div(count patients [RH = 'overdue'], count patients [RH IS NOT NULL])` | as of | O P | pct | down | none published | as above | P3 |
| `recall_due_unscheduled_patients` | Recall due, not scheduled | Patients due within 30 days or overdue, with no future appointment carrying the recall code | `count patients [RH IN ('due', 'overdue')]` | as of | O P, `has_any_future_appointment` | int | down | — | as above | P3 |
| `recare_active_pct` | Patients active in recare | Active patients who are current or scheduled in hygiene recall | `safe_div(count patients [ACTIVE AND RH IN ('scheduled', 'not_due', 'due')], active_patients)`; `RH` gives one state per patient, so the overdue and active shares never overlap | as of | O | pct | up | at least 85 % `ADA-MS` | as above | P3 |
| `perio_patient_pct` | Perio patients (age 30+) | Active patients aged `perio_age_min` or more in ongoing periodontal care | `safe_div(countd(c.patient_id) [ACTIVE AND age >= perio_age_min AND g:perio_therapy(c) AND c.service_date > :as_of − W], count pd [ACTIVE AND age >= perio_age_min])` | as of | O P | pct | up | bottom 1 / average 11 / top 32 `DI-SOD26` | H | P3 |
| `perio_visit_share_pct` | Perio share of hygiene procedures | Periodontal therapy codes among hygiene-visit codes | `safe_div(count c [PROD AND g:perio_therapy(c)], count c [PROD AND g:hygiene_visit(c)])` | service | O P | pct | — | about one third `DE-HYG15` | H | P3 |
| `srp_quadrants_per_working_day` | SRP quadrants per day | Scaling and root planing lines per hygiene working day | `safe_div(count c [PROD AND g:srp(c)], working_days of hygiene providers)` | service | O P | dec | — | — | H | P3 |
| `fluoride_rate_pct` | Fluoride rate | Hygiene visits with fluoride | `safe_div(count HV [a g:fluoride charge for the same patient and day], count HV)` | service | O P A | pct | up | none published | H | P3 |
| `adjunctive_therapy_pct` | Adjunctive therapy | Hygiene patients who received an adjunctive service | `safe_div(countd(c.patient_id) [PROD AND g:adjunctive(c) AND c.patient_id IN HV.patient_id of the period], countd(HV.patient_id))` — only hygiene patients enter the numerator, so the rate cannot exceed 100 % |
 service | O P, `code_group` | pct | — | none published | H | P3 |
| `srp_opportunities` | SRP opportunities | Patients on today's schedule for periodontal maintenance with no therapy in 24 months | `countd(ap.patient_id) [ap.appointment_date = today AND ap.status_class NOT IN ('cancelled', 'no_show') AND g:perio_maintenance(ap) AND NOT EXISTS c: g:srp_opportunity_exclusion(c) in the 24 months before today]` | as of today | O P | int | — | — | H for charges; A for lines (k7) | P3 |

### 5.6 Case acceptance and treatment

Class `financial_practice` for money, `aggregate` for rates. Every row is app-era only: migrated plans are 674 headers
without dates or providers (03 §2.22). Drill: `treatment_plan.treatment_plan_status`,
`treatment_plan.treatment_plan_analysis`, worklist `worklists.unscheduled_treatment`.

| `metric_key` | Label | Definition | Formula | Basis | Dims | Fmt | Dir | Target or benchmark (source) | Avail. | Ph |
|---|---|---|---|---|---|---|---|---|---|---|
| `treatment_presented_amount` | Treatment presented | Fees of the items presented in the period | `Σ ti.fee [COH]` | presented (04 `diagnosed_date`) | O P (item provider) C N U (`counselor_user_id`) | money | up | — | A | P1 |
| `patients_presented` | Patients presented | Patients with at least one item presented | `countd(ti.patient_id) [COH]` | presented | O P N | int | up | — | A | P3 |
| `treatment_presented_per_exam` | Dollars presented per exam | Restorative and elective dollars presented per exam performed | `safe_div(Σ ti.fee [COH AND g:restorative_elective(ti)], count c [PROD AND g:exam_all(c)])` | presented / service | O P N | money | up | bottom $750 / average $1,716 / top $2,955 `DI-SOD26` | A | P3 |
| `diagnostic_pct` | Diagnostic % | Exam visits on which new treatment was presented | `safe_div(countd((c.patient_id, c.service_date)) [PROD AND g:exam_all(c) AND EXISTS ti: COH AND ti.patient_id = c.patient_id AND ti.presented_date = c.service_date], countd((c.patient_id, c.service_date)) [PROD AND g:exam_all(c)])` | service | O P N | pct | — | none published | A | P3 |
| `case_acceptance_pct` | Case acceptance % | Headline case acceptance in the organisation's unit | alias by `case_acceptance_unit` → `case_acceptance_dollars_pct` (default) · `case_acceptance_plans_pct` · `case_acceptance_patients_pct` | presented | O P N C | pct | up | see the variants | A | P1 |
| `case_acceptance_dollars_pct` | Case acceptance (dollars) | Presented dollars accepted within the window | `safe_div(Σ ti.fee [COH AND accepted_w], Σ ti.fee [COH])`; `accepted_w` := `ti.is_accepted AND ti.accepted_date_effective <= ti.presented_date + case_acceptance_window_days` (no date test when the setting is empty). An accepted item with NULL `accepted_date_effective` is left out of the windowed numerator and its fee is returned as warning `accepted_undated_amount` (2.9) | presented | O P N C | pct | up | none on a 30-day basis | A; exact dating G(25) | P1 |
| `case_acceptance_dollars_same_day_pct` | Case acceptance (dollars, same day) | Presented dollars accepted on the day of presentation | the dollars formula with a fixed window of 0 days (same undated rule) | presented | O P N C | pct | up | bottom 23 / average 41 / top 62 `DI-SOD26` | A | P1 |
| `case_acceptance_plans_pct` | Case acceptance (plans) | Plans with at least one accepted item, to date | `safe_div(countd(ti.plan_id) [COH AND ti.is_accepted], countd(ti.plan_id) [COH])` | presented | O P N | pct | up | 58 % (2025) `PDDS-DD26`; average 45 %, top 10 % 75 % `HSO-CL`; 75-80 % `ADA-MS` | A (k12) | P1 |
| `case_acceptance_patients_pct` | Case acceptance (patients) | Patients who accepted at least one item, to date | `safe_div(countd(ti.patient_id) [COH AND ti.is_accepted], countd(ti.patient_id) [COH])` | presented | O P N | pct | up | none published on this exact rule | A (k12) | P1 |
| `treatment_accepted_amount` | Treatment accepted | Fees of the cohort accepted within the window | `Σ ti.fee [COH AND accepted_w]` | presented | O P C N | money | up | — | A | P3 |
| `avg_accepted_per_patient` | Average accepted per patient | Accepted dollars per accepting patient | `safe_div(treatment_accepted_amount, countd(ti.patient_id) [COH AND accepted_w])` | presented | O P | money | up | — | A | P3 |
| `treatment_funnel_amount` | Treatment funnel | Fees of the cohort by the furthest stage reached | `Σ ti.fee [COH]` grouped by `funnel_stage` := `completed` when `ti.is_completed`, else `scheduled` when `ti.is_scheduled`, else `accepted` when `ti.is_accepted`, else `open` | presented | O P C, `funnel_stage` (required) | money | — | — | A (k12) | P3 |
| `treatment_funnel_pct` | Treatment funnel % | Share of presented fees at each stage | `share_of_total(treatment_funnel_amount, funnel_stage)` | presented | O P C, `funnel_stage` (required) | pct | — | — | A (k12) | P3 |
| `case_completion_pct` | Case completion | Presented treatment completed within the completion window | `safe_div(Σ ti.fee [COH AND ti.is_completed AND ti.completed_date <= ti.presented_date + case_completion_window_days], Σ ti.fee [COH])` (plans or patients when the unit setting says so) | presented | O P C | pct | up | 47 % (2025) `PDDS-DD26` (plans created in the first half-year and finished by year end) | A | P3 |
| `acceptance_completion_gap_pp` | Acceptance-completion gap | Acceptance minus completion, in points, both in the unit of `case_acceptance_unit`, both to date and on the same cohorts | `100 × (acceptance_to_date − completion_to_date)` over cohorts presented more than `case_completion_window_days` ago (younger cohorts are left out, so both sides have matured); `acceptance_to_date` = the unit's to-date acceptance (dollars with an empty window, plans, patients), `completion_to_date` = completed share in the same unit with no window | presented | O P | dec | down | warning above 30 points, target 10-30 `PDDS-DD26` | A | P4 |
| `unscheduled_treatment_amount` | Unscheduled treatment | Fees of pending items that are not booked | `Σ ti.fee [UNSCH]` (5.0.1: app era, `is_unscheduled`, `alternative` and `existing` items out, age cut-off) | as of today | O P C, `acceptance_state` (accepted, not accepted) | money | down | — | A (k12) | P3 |
| `unscheduled_treatment_patients` | Patients with unscheduled treatment | Patients behind the amount above | `countd(ti.patient_id) [UNSCH]` | as of today | O P, `acceptance_state` | int | down | — | A (k12) | P3 |
| `treatment_reappointment_pct` | Treatment reappointment % | Visits of patients with pending treatment after which a treatment appointment was booked | `safe_div(count v [pending_after AND EXISTS f: APPT AND NOT HYGA AND f.appointment_date > v.visit_date AND f.created_date <= v.visit_date AND f.status_class <> 'cancelled'], count v [pending_after AND v.era = 'app'])`; `pending_after` := the patient has a `ti` with `presented_date <= v.visit_date`, not completed on or before that day and outside the excluded statuses. Under `reappointment_basis = holds_future_now` the test is "holds a future non-hygiene appointment today" | service | O P (primary provider of the visit, `v.primary_provider_id`; doctors only) | pct | up | none published (reference range 33-52 %) | A | P1 |
| `pending_treatment_of_todays_patients` | Pending treatment of today's patients | Accepted, unbooked treatment of patients on today's schedule | `Σ ti.fee [UNSCH AND ti.is_accepted AND the patient has f [LIVE AND f.appointment_date = today]]` | as of today | O P | money | — | — | A | P3 |
| `preauthorized_pct` | Pre-authorised share of unscheduled treatment | Patients with unscheduled treatment whose items carry a pre-authorisation | `safe_div(countd(ti.patient_id) [UNSCH AND ti.preauth_status IN ('sent', 'closed')], countd(ti.patient_id) [UNSCH])` | as of today | O P Y | pct | — | — | A | P3 |


### 5.7 Patients: acquisition, retention, value

Class `aggregate`. Drill: `lists.patient_list_new_patient`, `lists.patients_seen`, `lists.patient_list`, worklist
`worklists.reactivation`. Office binding: rows computed on `rpt_visits` bind `office_id` to the office of the visit and are
non-additive across offices (a patient seen at two offices counts in both; the organisation total is deduplicated); the other
rows bind to `rpt_patient_dim.home_office_id`.

| `metric_key` | Label | Definition | Formula | Basis | Dims | Fmt | Dir | Target or benchmark (source) | Avail. | Ph |
|---|---|---|---|---|---|---|---|---|---|---|
| `new_patients` | New patients | Headline new-patient count on the organisation's basis | alias by `new_patient_basis` → `new_patients_first_visit` (default) · `new_patients_first_appointment` · `new_patients_created` | service | O P S Y A | int | up | per practice per month: warning below 35, target 35-75, elite 75+ `PDDS-DD26`; average 39, top 10 % 82 `HSO-CL`; +10-15 % a year `ADA-MS` | as the resolved variant | P1 |
| `new_patients_first_visit` | New patients (first visit) | Patients whose first visit falls in the period | `count pa [pa.first_visit_date in the period]` | service | O (first-visit office → home office) P (provider of the first visit: `v.primary_provider_id` of the `rpt_visits` row on (`patient_id`, `first_visit_date`, `first_visit_office_id`) until 03 adds `pa.first_visit_provider_id`, REQ-06) S Y A | int | up | as above | H (k8, k9, k14) | P1 |
| `new_patients_created` | New patients (record created) | Patient records created in the period | `count pd [office-local date of pd.created_at_utc in the period AND pd.created_at_reliable]` | created | O (home office) S A | int | — | — | A (k6) | P2 |
| `new_patients_first_appointment` | New patients (first kept appointment) | Patients whose first kept appointment falls in the period | `count of patients whose earliest f [APPT AND f.is_kept] is in the period` | appointment | O P | int | — | — | H (k7, k9) | P3 |
| `new_patients_scheduled` | New patients on the schedule | Patients with an upcoming first appointment | `countd(f.patient_id) [LIVE AND f.appointment_date >= today AND (f.is_new_patient OR pa.first_visit_date IS NULL)] + count f [LIVE AND f.appointment_date >= today AND f.is_patientless]` — a quick-save appointment without a patient record is a new patient on the schedule, counted per appointment | as of today (window parameter) | O P | int | up | — | A | P3 |
| `new_patients_projected` | New patients projected | Month-end projection from the month-to-date pace | `project_period_end(new_patients)` | service | O | int | up | — | H | P3 |
| `active_patients` | Active patients | Patients seen inside the active window | `countd(v.patient_id) [ACTIVE]` (visit in `(:as_of − W, :as_of]` and `(pd.is_active OR NOT active_requires_active_flag)`) | as of | O (offices where seen in the window → home office) P (providers seen in the window → preferred provider) A Y | int | up | 800-1,000 per full-time hygienist `DE-HYG15` | H (k8, k9); `is_active` is current state until DATA-44 | P1 |
| `at_risk_patients` | At-risk patients | Patients last seen between `at_risk_from_months` and `at_risk_to_months` ago | `count patients [L_asof <= :as_of − at_risk_from_months AND L_asof > :as_of − at_risk_to_months AND (pd.is_active OR NOT active_requires_active_flag)]`; `L_asof` := `max(v.visit_date) FILTER (WHERE v.visit_date <= :as_of)` (2.5), never `pa.last_visit_date` | as of | O P A Y | int | down | — | H | P3 |
| `lapsed_patients` | Lapsed patients | Patients flagged active who were not seen within `at_risk_to_months`, or never | `count pd [(pd.is_active OR NOT active_requires_active_flag) AND (L_asof IS NULL OR L_asof <= :as_of − at_risk_to_months)]` | as of | O A | int | down | — | H | P3 |
| `patients_lost` | Patients lost | Patients who crossed the inactivity threshold in the period | `count of patients having a visit L with L + W inside the period and no visit in (L, L + W]` (builder over `v`): the loss is dated when the window closes, and a later return is a reactivation that never rewrites the earlier period (2.5) | service + W | O P A Y | int | down | — | H; losses by status change G(44) | P3 |
| `attrition_rate_pct` | Attrition rate | Patients lost over 12 months against the active base a year ago | `safe_div(patients_lost over the 12 months ending :as_of, active_patients as of 12 months earlier)` | as of | O | pct | down | about 10 % a year `DE-4STEP`; 12-15 % `JAR-BM2`; 17 % average against 3 % top `DT-CLV` | H | P3 |
| `reactivated_patients` | Reactivated patients | Patients seen in the period after more than `W` without a visit | `countd(v.patient_id) [v.visit_date in the period AND the patient's previous visit is more than W before it]`; on the fixture `new + reactivated − lost` explains the change of `active_patients` between two dates, flag changes aside (MET-16) | service | O P | int | up | — | H | P3 |

| `net_patient_growth_pct` | Net patient growth | New plus reactivated minus lost, against the active base at the start | `safe_div(new_patients + reactivated_patients − patients_lost, active_patients as of the day before the period)` | service | O | pct | up | bottom −11 / average 3 / top 17 a year `DI-SOD26` | H | P3 |
| `patient_retention_12m_pct` | Patient retention (12 months) | Patients seen in the 12 months ending a year ago who were seen again since | `safe_div(countd(patient) [visit in (:as_of − 24 months, :as_of − 12 months] AND visit in (:as_of − 12 months, :as_of]], countd(patient) [visit in (:as_of − 24 months, :as_of − 12 months]])` | as of | O P A Y | pct | up | average 58-64 %, top 10 % 90-92 % `HSO-CL` (18-month rule, not comparable) | H | P3 |
| `new_patient_reappointment_pct` | New-patient reappointment | New patients who had a next appointment by the end of the first visit | `safe_div(count pa [first visit in the period AND EXISTS f: APPT AND f.appointment_date > pa.first_visit_date AND f.created_date <= pa.first_visit_date AND f.status_class <> 'cancelled'], count pa [first visit in the period, app era])` | service | O P S | pct | up | bottom 22 / average 50 / top 69 `DI-SOD26` | A | P3 |
| `patient_value_annual` | Annual value per patient | Production of the last 12 months per active patient | `safe_div(P over the 12 months ending :as_of, active_patients)` | as of | O | money | up | $600-800 per active patient (reference vendor article) | H | P4 |
| `insured_patient_share_pct` | Insured share of active patients | Active patients with primary dental coverage | `safe_div(count pd [ACTIVE AND a cov row with category 'dental' and tier 'primary'], active_patients)` | as of | O | pct | — | 57 % `DE-LEV25` | H (today's coverage; migrated tiers N(32)) | P3 |
| `unscheduled_family_members` | Unscheduled family members | Active members of the accounts of today's patients who hold no future appointment | `count pa [ACTIVE AND pa.next_appointment_date IS NULL AND pd.account_id IN (accounts of patients with f [LIVE AND f.appointment_date = today])]` | as of today | O | int | — | — | H | P3 |

### 5.8 Providers: doctor and hygienist

A provider scorecard is the `provider_id` slice of metrics defined elsewhere; only the rows below are provider-specific.
`provider_working_days` and `provider_collection_pct` are synonyms of `working_days` and `collection_pct` by provider
(5.0.6), not separate formulas.
Class `provider_comp` (`payroll_time` for hours and wage ratios). Drill: `daily.production_report` (by provider),
`monthly.income_allocation`, `my_reports.production_report`.

| `metric_key` | Label | Definition | Formula | Basis | Dims | Fmt | Dir | Target or benchmark (source) | Avail. | Ph |
|---|---|---|---|---|---|---|---|---|---|---|
| `provider_scheduled_hours` | Provider scheduled hours | Template hours of the provider net of holidays | `Σ pcal.scheduled_minutes [pcal.is_scheduled] ÷ 60` over `rpt_provider_calendar_days(:tenant_id, :provider_ids, :date_from, :date_to, :office_ids)` (03 §2.28, DATA-55); `hours_source` (`provider_schedule` · `office_hours` · `default`) is printed, and a provider whose every day is `default` returns `no_data` with "schedule not configured" | calendar date | P O | hours | — | — | H (k10: today's template) | P1 |
| `clocked_hours` | Clocked hours | Paid time-clock hours (provider through `pv.user_id`) | `Σ tc.total_hours [tc.is_paid]` | work date | U O P | hours | — | — | H (legacy punches are wall-clock; open legacy rows count 0) | P2 |
| `provider_income` | Provider income (allocated collections) | Collections allocated to the provider's work, dated when they were allocated | `Σ al.amount [al.credit_ledger_bucket = 'collection' AND al.allocation_target IN ('production', 'non_production_charge', 'debit_adjustment')]` on `al.allocation_date`, by the credited provider of the allocation (2.1; NULL = `Unassigned provider`). Refunds are not subtracted again: a refunded payment is allocated to target `refund` and never reaches a provider (2.2) | allocation | P O Y | money | up | — | A; H (k4); frozen at period lock (section 10) | P2 |

| `provider_adjustment_rate_pct` | Provider adjustment rate | Production adjustments attributed to the provider against the provider's charged production | `safe_div(−production_adjustments by provider, charged_production by provider)` | transaction / service | P O, `txn_class` | pct | down | — | A; history N(12) | P2 |
| `provider_retention_12m_pct` | Provider retention (12 months) | The provider's recare-exam patients of a year earlier who had a recare exam again within 12 months | `safe_div(countd(patient) [cohort AND a g:exam_recare charge within the following 12 months], countd(patient) [cohort])`; cohort := patients with a `g:exam_recare` charge credited to the provider in the range shifted back 12 months | service | P O | pct | up | none published | H (k2) | P3 |
| `new_patients_per_doctor` | New patients per doctor | New patients of the month per doctor who worked | `safe_div(new_patients, countd(provider) [production_group = 'doctor' AND provider_working_days > 0])` | service | O | dec | up | at least 20-25 per doctor per month `DE-HYG15` | H (k2) | P4 |
| `hygienist_production_to_wage_ratio` | Hygienist production to wages | Production of a hygienist against wages for the hours clocked | `safe_div(P of the hygienist, Σ tc.total_hours [tc.is_paid] × pay_rate)`; `pay_rate` from `user_time_clock_config` (passthrough dataset) | service / work date | P O | dec | up | about 3 times wages `DE-HYG15` | A (needs `pay_rate` and `providers.user_id`) | P4 |

Scorecard sets (the metric keys a provider scorecard may request with `provider_id`; layout is owned by 06):

| Scorecard | Metric keys |
|---|---|
| Doctor | `gross_production`, `charged_production`, `net_production`, `production_vs_goal_pct`, `production_per_working_day`, `production_per_hour`, `production_per_visit`, `same_day_treatment_amount`, `scheduled_production`, `actual_vs_scheduled_production_pct`, `net_collections`, `provider_income`, `provider_collection_pct`, `provider_adjustment_rate_pct`, `appointments_booked`, `patient_visits`, `patients_seen`, `new_patients`, `recare_patients_seen`, `cancellation_rate_pct`, `no_show_rate_pct`, `provider_utilization_pct`, `provider_working_days`, `treatment_presented_amount`, `diagnostic_pct`, `case_acceptance_pct`, `avg_accepted_per_patient`, `treatment_reappointment_pct`, `provider_retention_12m_pct` |
| Hygienist | `net_production`, `production_vs_goal_pct`, `production_per_working_day`, `hygiene_production_per_hour`, `hygiene_production_per_visit`, `hygiene_visits`, `hygiene_visits_per_working_day`, `hygiene_reappointment_pct`, `new_patient_reappointment_pct`, `hygiene_retention_12m_pct`, `perio_patient_pct`, `perio_visit_share_pct`, `srp_quadrants_per_working_day`, `fluoride_rate_pct`, `adjunctive_therapy_pct`, `treatment_presented_amount`, `open_time_pct`, `hygienist_production_to_wage_ratio` |
| Team member (front office) | the `user_key` slices of 5.12 plus `otc_collection_pct`, `same_day_claim_rate_pct`, `confirmation_rate_pct`, `eligibility_verified_pct` |

### 5.9 Clinical mix

Class `aggregate` (money `financial_practice`). Drill: `daily.production_analysis_report`, `daily.production_report` (by code
or category), `appointment.lab_report`, `appointment.lab_cost_report`. Counts of crowns, implants, root canals, extractions,
sealants and every other group of section 4 are `procedure_count` by `code_group`, not separate keys.

| `metric_key` | Label | Definition | Formula | Basis | Dims | Fmt | Dir | Target or benchmark (source) | Avail. | Ph |
|---|---|---|---|---|---|---|---|---|---|---|
| `procedure_count` | Procedures | Posted production procedure lines | `count c [PROD]` | service | O P C N A | int | — | — | H | P1 |
| `category_production_share_pct` | Production mix | Share of charged production by category or code group | `share_of_total(charged_production, code_category)` (or `code_group`) | service | O P, C (required) | pct | — | hygiene 25-35 % of production `DE-HYG15` | H | P2 |
| `recare_patients_seen` | Recare patients seen | Distinct patients with a recare exam | `countd(c.patient_id) [PROD AND g:exam_recare(c)]` | service | O P | int | up | — | H | P1 |
| `fmx_pano_new_patient_pct` | New patients with full-mouth or panoramic images | New patients imaged within 30 days of the first visit | `safe_div(count pa [first visit in the period AND a g:radiograph_fmx or g:radiograph_pano charge within 30 days of it], new_patients_first_visit)` | service | O P | pct | — | none published | H | P3 |
| `bitewing_recare_pct` | Bitewings at recare exams | Recare exam visits with bitewings the same day | `safe_div(countd((c.patient_id, c.service_date)) [g:exam_recare(c) AND a g:radiograph_bitewing charge the same day], countd((c.patient_id, c.service_date)) [PROD AND g:exam_recare(c)])` | service | O P | pct | — | none published | H | P3 |
| `referral_out_rate_pct` | Referred out | External referrals among all referrals of planned treatment | `safe_div(count rf [rf.direction = 'out'], count rf [rf.direction IN ('out', 'internal')])` over kinds `outbound_item` and `case` | referral date | O P, `specialty` | pct | down | "reduce outside referrals" `PDDS-25` | A; cases G(40) | P3 |
| `lab_cost_amount` | Lab cost | Lab fees of the cases on appointments in the period | `Σ lc.lab_cost` | appointment | O P, `lab_vendor_id` | money | — | — | A | P3 |
| `lab_cost_pct` | Lab cost % | Lab cost against production | `safe_div(lab_cost_amount, P)` | appointment / service | O P | pct | down | lab about 8 % of collections `DE-OH` | A | P3 |
| `lab_turnaround_days` | Lab turnaround | Days from sent to received (late share: `count lc [lc.days_late > 0] ÷ count lc [lc.lab_status = 'received']`) | `avg(lc.turnaround_days)` | appointment | O, `lab_vendor_id` | days | down | — | A | P3 |

### 5.10 Marketing and referrals

Class `aggregate` (money `financial_practice`). Drill: `referral.referral_production_list`, `referral.referral_summary_report`,
`referral.referred_out_list`, `lists.online_registered_patients`.

| `metric_key` | Label | Definition | Formula | Basis | Dims | Fmt | Dir | Target or benchmark (source) | Avail. | Ph |
|---|---|---|---|---|---|---|---|---|---|---|
| `new_patients_missing_source_pct` | New patients without a source | New patients with no referral source recorded | `safe_div(count pa [first visit in the period AND no rf row of kind 'inbound_source'], new_patients_first_visit)` | service | O U | pct | down | 0 | H | P3 |
| `patient_referral_share_pct` | Referred by a patient | New patients whose source is an existing patient | `safe_div(count pa [first visit in the period AND rf.source_category = 'patient'], new_patients_first_visit)` | service | O | pct | up | model value 0.25 referrals per patient `DT-CLV` | H (`source_category` inferred until DATA-40) | P3 |
| `referral_source_production` | Production of referred patients | Charged production of the patients of each source (collections on the same join: `−Σ p.amount [COLL]`) | `Σ c.charged_fee [PROD]` joined to `rf [rf.referral_kind = 'inbound_source']` on `patient_id` | service | S (required), O | money | — | — | H for migrated links; app patients G(40) | P3 |
| `outbound_referrals` | Referrals out | Referral events to other providers or offices | `count rf [rf.direction IN ('out', 'internal')]` | referral date | O P, `specialty`, direction | int | — | — | A; cases G(40) | P3 |
| `online_booking_requests` | Online booking requests | Requests received through online booking | `count of booking_requests rows created in the period` (passthrough dataset, DATA-45) | created | O N | int | up | — | A | P3 |
| `online_booking_conversion_pct` | Online booking conversion | Requests that became an appointment | `safe_div(count [appointment_id IS NOT NULL], online_booking_requests)` | created | O | pct | up | 57.1 % of inquiries convert `LIINE24` (phone and web; context only) | A | P3 |
| `campaign_appointments` | Campaign appointments | Appointments carrying a campaign code (kept: `f.is_kept`; value: `Σ f.scheduled_fee`) | `count f [APPT AND f.campaign_code IS NOT NULL]` | appointment | O, `campaign_code` | int | — | — | A | P3 |
| `reminder_delivery_rate_pct` | Reminder delivery rate | Appointment reminders delivered | `safe_div(count cm [cm.message_type = 'appointment_reminder' AND cm.is_delivered], count cm [cm.message_type = 'appointment_reminder'])` | sent date | O, `channel` | pct | up | — | A (log-only gateways stay `queued`) | P3 |
| `reminder_confirmation_rate_pct` | Reminder confirmation rate | Delivered reminders answered with a confirmation | `safe_div(count cm [cm.message_type = 'appointment_reminder' AND cm.reply_intent = 'confirm'], count cm [cm.message_type = 'appointment_reminder' AND cm.is_delivered])` | sent date | O | pct | up | — | A | P3 |
| `recall_outreach_yield_pct` | Recall outreach yield | Delivered recall messages followed by a new appointment within 14 days | `safe_div(count cm [cm.message_type = 'recall' AND cm.is_delivered AND EXISTS f: f.patient_id = cm.patient_id AND APPT AND f.created_date BETWEEN cm.sent_date AND cm.sent_date + 14], count cm [cm.message_type = 'recall' AND cm.is_delivered])` | sent date | O | pct | up | — | A | P3 |
| `cost_per_new_patient` | Cost per new patient | Marketing spend per new patient from marketing sources (return on spend = `(net collections of those patients − spend) ÷ spend`) | `safe_div(marketing spend of the period, new_patients from marketing sources)` | service | S O | money | down | $150-300 commonly quoted (unverified) | X: no dated spend exists (`referrals.cost` has no period, `campaigns` has no cost column) — NEW `marketing_spend` input | P4 |

### 5.11 Ortho

Class `aggregate` (money `financial_practice`). App-era only: no contract was migrated (03 §2.25). `rpt_ortho_contracts`
lists active contracts only until `contract_status` exists (DATA-42). Drill: `ortho.ortho_report`,
`ortho.ortho_compliance_report`, `ortho.missing_ortho_visits`, `management.payment_plan_charges`.

| `metric_key` | Label | Definition | Formula | Basis | Dims | Fmt | Dir | Target or benchmark (source) | Avail. | Ph |
|---|---|---|---|---|---|---|---|---|---|---|
| `ortho_starts` | Ortho starts | Contracts whose treatment started in the period | `count oc [coalesce(oc.banding_date, oc.treat_start_date) in the period]` | start date | O P | int | up | 203.5 starts per practice (2024) `PDDS-25`; +10 % a year `LEV-ORTHO` | A | P3 |
| `ortho_conversion_pct` | Ortho conversion | Starts per exam | `safe_div(ortho_starts, ortho_exams)` | service / start date | O P | pct | up | 68.3 % (2025) `PDDS-DD26`; close rate at least 85 % `LEV-ORTHO` | A | P3 |
| `ortho_avg_contract_amount` | Average contract amount | Contract total per start | `safe_div(Σ oc.total_ortho_amt [start in the period], ortho_starts)` | start date | O P | money | — | about $3,600 per comprehensive start `PDDS-DD26` | A | P3 |
| `ortho_active_patients` | Active ortho patients | Contracts started and not debonded | `count oc [coalesce(oc.banding_date, oc.treat_start_date) <= :as_of AND (oc.debond_date IS NULL OR oc.debond_date > :as_of)]` | as of | O P | int | up | — | A; debond date G(42) | P3 |
| `ortho_remaining_to_bill_amount` | Contract amount not yet billed | Instalments of active contracts not yet posted | `Σ oc.unbilled_amount` | as of | O P | money | — | — | A | P3 |
| `ortho_installments_unposted_amount` | Instalments due and not posted | Periodic charges whose date has passed without a posting | `Σ ci.periodic_amount [ci.contract_kind = 'ortho' AND NOT ci.is_billed AND ci.due_date <= today]` | as of today | O, `plan_side` | money | down | 0 | A | P3 |
| `ortho_patients_beyond_ecd_pct` | Patients beyond planned end | Active contracts past their planned end date | `safe_div(count oc [oc.is_past_planned_end], ortho_active_patients)` | as of | O P | pct | down | at most 2 % `LEV-ORTHO` | A | P3 |
| `ortho_active_no_appointment_pct` | Active ortho patients without an appointment | Active contracts whose patient holds no future appointment | `safe_div(count oc [active AND pa.next_appointment_date IS NULL], ortho_active_patients)` with `pa` joined on `oc.patient_id` (`rpt_ortho_contracts` carries no appointment date, 03 §2.25) | as of today | O P | pct | down | — | A (k12) | P3 |
| `ortho_missing_visit_patients` | Ortho patients missing visits | Active contracts with no ortho visit for longer than `ortho_visit_interval_weeks` | `count oc [oc.weeks_since_last_visit > ortho_visit_interval_weeks]` | as of today | O P | int | down | — | A; visit log G(42) | P3 |
| `ortho_debonds` | Debonds | Contracts debonded in the period (starts per debond = `ortho_starts ÷ ortho_debonds`) | `count oc [oc.debond_date in the period]` | debond date | O P | int | — | — | G(42) | P3 |
| `ortho_observation_patients` | Observation pool | Patients in an observation status | `count oc [oc.ortho_status_code is an observation status]` | as of | O P | int | up | +5 % a year `LEV-ORTHO` | G(42) | P3 |

### 5.12 Front office

Class `user_activity` by user, otherwise `aggregate` or `financial_practice`. Drill: `daily.daily_journal` (by user),
`daily.daily_audit`, `daily.progress_notes`, `management.audit_trail`, `my_reports.*`.

| `metric_key` | Label | Definition | Formula | Basis | Dims | Fmt | Dir | Target or benchmark (source) | Avail. | Ph |
|---|---|---|---|---|---|---|---|---|---|---|
| `appointments_created` | Appointments created | Appointments entered in the period (value: `Σ f.scheduled_fee`) | `count f [APPT AND f.created_date in the period AND f.created_at_reliable]` | created | U (`created_by_user_id`) O | int | up | — | A | P3 |
| `charges_posted_amount` | Charges posted | Posted fees by the user who entered them | `Σ c.charged_fee` by `c.user_key` | created | U O | money | — | — | A; history N(10) (k6) | P2 |
| `payments_posted_amount` | Payments posted | Payments by the user and office that keyed them | `−Σ p.amount [COLL]` by `p.user_key`, `p.posting_office_id` | created | U O, `tender_class` | money | — | — | A; history N(10) (k6) | P2 |
| `adjustments_posted_amount` | Adjustments posted | Adjustments and refunds by user and class (with count) | `Σ e.amount [e.entry_type IN ('adjustment', 'refund')]` by `e.user_key` | created | U O, `txn_class`, `txn_side` | money | — | — | A; history N(10), N(12) | P2 |
| `voided_entries_count` | Voided transactions | Ledger legs that were voided (amount: `Σ abs(x.amount)`) | `count x [x.is_void]` over `rpt_ledger_entries_all` | transaction until DATA-14, then the void date | O U, `entry_type` | int | down | — | H for the count; date and user G(14) | P2 |
| `backdated_entries_count` | Back-dated entries | Entries keyed more than `backdated_threshold_days` after their business date | `count e [e.created_at_reliable AND e.created_date − coalesce(e.service_date, e.transaction_date) > backdated_threshold_days]` | created | U O, `entry_type` | int | down | — | A; posting stamps G(13) | P2 |
| `unpriced_charge_count` | Unpriced charges | Production charges posted at zero or without a price | `count c [PROD AND c.is_unpriced]` | service | O P U | int | down | 0 | H | P1 |
| `missing_progress_notes_count` | Missing progress notes | Live appointments without a progress note: the legacy My Reports › Missing Progress Notes (appointment grain, filtered by the appointment's provider) | `count ana [NOT ana.has_progress_note]` over `rpt_appointment_note_audit(...)` | appointment | O P | int | down | 0 | H (k9: the archive is read only under the tenant policy) | P1 |
| `unsigned_progress_notes_count` | Unsigned progress notes | Notes that are not signed and not struck off | `count pn [NOT pn.is_signed AND NOT pn.is_struck_off AND pn.era = 'app']` | note date | O P (author) | int | down | 0 | A | P1 |
| `daily_audit_exceptions_count` | Daily audit exceptions | Patient-days missing an appointment, a ledger transaction, a note or a signed note: the Daily Audit unit (drill `daily.daily_audit`) | `count na [NOT (na.has_appointment AND na.has_ledger_transaction AND na.has_progress_note AND na.has_signed_note)]` | service | O | int | down | 0 (the legacy audit is clean when no rows appear) | H; signature test A | P1 |
| `day_close_compliance_pct` | Day-close compliance | Open office days that were closed | `safe_div(count cal [cal.is_open AND an office_day_closes row of that office and date in status 'closed'], count cal [cal.is_open])` — a close of a day the calendar marks closed is not counted | business date | O | pct | up | 100 % | G(29) | P2 |
| `undeposited_payments_amount` | Undeposited payments | Depositable payments not yet on a deposit | `−Σ p.amount [COLL AND p.deposit_id IS NULL AND p.deposit_group <> 'none']` | as of | O | money | down | 0 after the day's deposit | G(28) | P2 |
| `follow_up_completion_pct` | Follow-up completion | Worklist items resolved among the items listed | resolved items ÷ listed items from the worklist action log (owned by 06) | action date | U O | pct | up | — | G: starts with the worklist log | P3 |

### 5.13 Multi-office roll-ups

Class `financial_practice`. Every metric of 5.1-5.12 that allows `office_id` also allows `office_group_id` and the
organisation total; the rows below exist only at group or organisation level. Rules: 9.3.

| `metric_key` | Label | Definition | Formula | Basis | Dims | Fmt | Dir | Target or benchmark (source) | Avail. | Ph |
|---|---|---|---|---|---|---|---|---|---|---|
| `same_store_growth_pct` | Same-store growth | Year-over-year production growth of comparable offices | `safe_div(P this period − P same period last year, P same period last year)` over comparable offices (9.3); aggregates `weighted` (default, ratio of sums), `simple_mean`, `trimmed_mean` | service | organisation, `office_group_id` | pct | up | 2025: simple 6.6 %, trimmed 4.9 %, weighted 4.0 % `PDDS-DD26` | H (k1) | P4 |
| `offices_growing_pct` | Offices growing | Comparable offices with positive same-store growth | `safe_div(count offices [same-store growth > 0], count comparable offices)` | service | organisation, `office_group_id` | pct | up | 63 % (2025) `PDDS-DD26` | H | P4 |
| `production_per_office` | Production per office | Production per office with production (per working day on request) | `safe_div(P, count offices with production)` | service | organisation, `office_group_id` | money | up | $8,764 per practice per day `PDDS-DD26` | H | P4 |
| `production_per_operatory` | Production per chair (annualised) | Twelve months of production per active operatory | `safe_div(P over the 12 months ending :as_of, Σ od.active_operatory_count)` | service | O | money | up | warning below $100K, target $150-200K, elite $300K+ `PDDS-DD26` | H (chair count is current state) | P4 |
| `specialty_production_share_pct` | Specialty share of production | Production of specialist providers, by specialty | `share_of_total(P, specialty)` | service | organisation, O | pct | — | growth by portfolio mix `PDDS-DD26` (context) | H (`specialty` is sparse on migrated providers) | P4 |
| `cross_office_patients` | Cross-office patients | Patients seen at two or more offices in the period | `count of patients with v rows at two or more offices` | service | organisation, office pair | int | — | — | H | P4 |
| `cash_conversion_waterfall_amount` | Cash-conversion waterfall | From office-fee production to estimated cash, stage by stage, over the trailing 12 months ending `:as_of` (a fixed window, so the stock stage and the flow stages cover the same year) | by `waterfall_stage`: `gross_production` · contractual = `implied_writeoff − Σ e.amount [e.txn_class = 'contractual_writeoff']` · time-of-service gap = `uncollected_copay_amount` · `bad_debt_amount` · aged A/R at risk = `(1 − aged_ar_recovery_share) × ar_over_90_amount` as of `:as_of` (setting 46) · estimated cash = the remainder | trailing 12 months | O, `waterfall_stage` (required) | money | — | network 2025, shares of expected-fee production `PDDS-DD26`: chart values contractual 7.8 %, time-of-service gap 3.3 %, bad debt 3.6 %, aged A/R 4.8 %; summary table 8.2 %, 9.5 %, 2.9 %, 3.9 % — both sets stored, context only (the source's tables conflict) | A; H (k1, k13) | P4 |
| `rcm_health_score` | Revenue-cycle health score | Five components worth 20 points each, scored linearly between the warning and elite thresholds of `ar_over_90_pct`, `claim_days_to_payment` (the publisher's "Days in A/R" is claim turnaround), `otc_collection_pct`, `bad_debt_rate_pct`, `net_collection_pct` | `Σ over components of 20 × clamp(safe_div(value − warning, elite − warning), 0, 1)`; a component with `no_data` makes the score `no_data` | as of / trailing 90 days | O | dec | up | median 50.5, strong 75-100 `PDDS-DD26`: context only (the publisher scores against peers and includes a patient-pay rate; ours is absolute) | A | P4 |
| `metric_dispersion_cv` | Dispersion across offices | Spread of a chosen normalised metric `m` over the offices in scope (at least 3) | `safe_div(stddev_samp(m), avg(m))` | as `m` | organisation, `office_group_id` | dec | down | monthly-seasonality CV of the most stable offices at most 0.22 `PDDS-DD26` | as `m` | P4 |

Thresholds of `rcm_health_score` come from `metric_targets`. Shipped: `ar_over_90_pct` 50 % / 15 %, `otc_collection_pct` 80 % / 95 %,
`bad_debt_rate_pct` 5 % / 1 % (`PDDS-DD26` warning and elite), `net_collection_pct` 95 % / 98 % (our bands),
`claim_days_to_payment` 30 / 20 days (from the `PDDS-25` claim-payment distribution, [I]). Warning and elite of one
component may not be equal (validated on save).

### 5.14 Deliberately not in the catalog

| KPI family | Why | What would add it |
|---|---|---|
| Overhead ratio, EBITDA margin, staff-cost %, provider compensation ratio, marketing spend % | Expenses and payroll are not held in DentC | General-ledger or payroll import |
| New-patient inquiries, lead conversion, call answer rate, reasons not booked | No phone or web-lead data beyond online booking requests | Call-tracking integration |
| Reviews, satisfaction, NPS | No survey or review data | Review-platform integration |
| Fee-schedule gap against market percentiles | Needs licensed fee data | Third-party fee survey |
| Next available appointment | A slot search over schedules and appointments, not an aggregate of `rpt_*` rows | A scheduling service endpoint; the huddle tile can call it directly (06) |
| True clean-claim rate, denial reasons, 835 reconciliation | No clearinghouse acknowledgements or ERA data | DATA-38 integration |
| Forms completed before check-in | No form-completion timestamps in the datasets | A dataset over the intake tables |
| Dental Quality Alliance measures | Measure specifications were not opened in the research | Separate specification work |

---

## 6. Reference dashboard mapping

Source: `analysis/reference_screenshots.md` §2-§3 and §6 (every row label, value and the arithmetic that proves the
relations). The vendor publishes no definitions; "ambiguous" states what could not be proven. Dashboard layout, periods
and the extra columns are owned by `06_dashboards.md`; this section fixes the metric behind each row.

### 6.1 Main Dashboard (20 visible rows)

| # | Reference row label | Our `metric_key` | Formula we adopt | Where the reference is ambiguous |
|---|---|---|---|---|
| 1 | Gross Production | `gross_production` | `Σ c.office_fee [PROD]` by service date | Fee basis unknown (their net is 56-66 % of gross, so gross is probably the office fee [I]). We add `charged_production` as its own row |
| 2 | Doctor Gross Production | `doctor_gross_production` | slice `production_group = 'doctor'` of the credited provider | Proven to be a sum over doctor-type providers; whether a hygienist's line under a dentist counts for the dentist is unknown → `hygiene_credit_policy` |
| 3 | Hygiene Gross Production | `hygiene_gross_production` | slice `'hygiene'` | Split by provider role, not by procedure code (proven) → `doctor_hygiene_split_basis` offers both |
| — | (not shown; rows 1-3 differ by 50-150 in three months) | `other_gross_production` | slice `'other'` | The reference hides the third bucket; we print it so parts sum to the total (I-3) |
| 4 | Net Production | `net_production` | `charged_production + production_adjustments` | Which adjustments, and whether write-offs are dated by service or by posting, is unknown → `production_adjustment_dating` |
| 5 | Doctor Net Production | `doctor_net_production` | slice | as 4 |
| 6 | Hygiene Production | `hygiene_net_production` | slice; label corrected to "Hygiene Net Production" | The label drops "net"; the arithmetic proves it is the net figure |
| 7 | Gross Collection | `gross_collections` | `−Σ p.amount [COLL]` by payment date | Whether prepayments and financing payments count is unknown; ours counts every payment leg except conversion credits |
| 8 | Doctor Gross Collection | `doctor_gross_collections` | slice by the attributed provider's group: allocation from P2, payment provider in P1 | Attribution method unknown; collections persist in months without production, which fits allocation to the producing provider |
| 9 | Hygiene Gross Collection | `hygiene_gross_collections` | slice | as 8 |
| 10 | Total Collection | `net_collections` | `gross_collections − collection_adjustments`; label corrected to "Net Collections" | It is 0.5-5.1 % below Gross Collection; what is subtracted (refunds, reversals, adjustments) is inferred |
| 11 | Doctor Collection | `doctor_net_collections` | slice | as 10 |
| 12 | Hygiene Collection | `hygiene_net_collections` | slice | as 10 |
| 13 | Working Hours | `office_open_hours` | `Σ cal.open_minutes [cal.is_open] ÷ 60`, label "Office open hours" (03 §11.2 M13 cites this key) | 1,400-1,680 hours a month give 68-125 of net production per hour, too low for provider hours, and the value is nearly constant (1,612 in three of twelve months, the others 1,119-1,678; `analysis/reference_screenshots.md` §2.4): a calendar quantity, not bookings. `booked_hours` is added as its own row beside it; `clocked_hours` is available |
| — | (added) | `booked_hours` | `Σ f.duration_minutes [LIVE] ÷ 60` | The hours behind `production_per_hour` under the default `clinical_hours_source` |
| 14 | Production Per Visit | `production_per_visit` | `safe_div(P_v, V)` with the defaults: net production ÷ `patient_visits` | Live month = Net Production ÷ visits exactly; earlier months do not reconcile (frozen snapshots) and change precision and level in March 2026 (an unflagged formula change). Ours: live for open periods, frozen at month end with the definition version (section 10) |
| 15 | Total Scheduled Production | `scheduled_production` | `Σ ap.scheduled_fee` of appointments dated in the month that are not cancelled or missed | 92-110 % of net production, so valued near net fees and not a subset of completed work; when it was measured (start of month, start of day, now) is unknown. Ours is "as booked now"; `scheduled_production_start_of_day` arrives with snapshots (P4) |
| 16 | Hygiene Scheduled Production | `hygiene_scheduled_production` | slice by the line provider's group | Order differs from blocks 1-4 (hygiene before doctor); ours is doctor, hygiene, other everywhere |
| 17 | Doctor Scheduled Production | `doctor_scheduled_production` | slice | — |
| 18 | Case Acceptance (%) | `case_acceptance_pct` | alias; default `case_acceptance_dollars_pct` (dollars accepted within 30 days of presentation) | The vendor's own articles give two formulas (accepted value ÷ proposed value; accepted plans ÷ presented plans). Range 33-52 % fits neither exclusively |
| 19 | Hygiene Reappointment (%) | `hygiene_reappointment_pct` | alias; default `hygiene_reappt_at_visit_pct` | Vendor article: hygiene patients who rebook before leaving ÷ hygiene patients seen — our default. The code list behind "hygiene" is unknown |
| 20 | Treatment Reappointment (%) | `treatment_reappointment_pct` | visits of patients with pending treatment after which a non-hygiene appointment existed by the end of the day ÷ such visits | No public definition anywhere (vendor or peers). Working assumption, to confirm with the product owner (D-10) |
| — | rows below the fold | unknown | — | The capture is cut off after row 20; the matrix of 06 adds `collection_pct`, `new_patients`, `active_patients`, `no_show_rate_pct`, `cancellation_rate_pct`, `total_ar` |

### 6.2 Provider Dashboard (11 rows per provider)

Provider rows are the `provider_id` slice of the practice metrics — no `provider_*` copies exist except where the meaning
differs.

| # | Reference row label | Our `metric_key` (by `provider_id`) | Formula we adopt | Where the reference is ambiguous |
|---|---|---|---|---|
| 1 | Provider Gross Production | `gross_production` | credited provider (2.1) | Rolls up into "Doctor Gross Production" in 7 of 12 months; the other months hold another doctor |
| 2 | Provider Net Production | `net_production` | charges of the credited provider + adjustments carrying that provider | as Main row 4 |
| 3 | Provider Total Collection | `net_collections` | allocation provider (P2), payment provider (P1) | A provider with no production shows collections for months — consistent with allocation to the producing provider |
| 4 | Provider Total Appointments | `appointments_booked` | `count f [LIVE]` by appointment provider. Decided: live appointments, not every non-block appointment (03 §11.2 P4 is to cite this key, REQ-08) | 49 appointments against 50 visits and 46 patients in the live month: a count that included cancelled and missed appointments would normally exceed the visits |
| 5 | Provider Seen Patients | `patients_seen` | `countd(pvs.patient_id)` on `rpt_provider_visits` (2.6), role per `hygiene_credit_policy` | 76-94 % of appointments; unique patients [I]. Under the default `hygienist` a hygiene visit counts for the hygienist; `lists.patients_seen` by provider and the Executive Summary by provider read role `treating`, so they reconcile only under `treating_provider` (stated on the tile) |
| 6 | Provider Working Hours | `provider_scheduled_hours` | `Σ pcal.scheduled_minutes ÷ 60` (DATA-55, P1) | The row is 0 in all 12 months (unpopulated). We return `no_data` with "schedule not configured", never 0 |
| 7 | Provider Production Per Visit | `production_per_visit` | provider net production ÷ `count pvs` of the provider (non-additive, 2.6) | Live month = net production ÷ 50 visits; a third count, different from appointments (49) and patients (46). Earlier months look frozen. Same role rule and reconciliation remark as row 5 |
| 8 | Provider Scheduled Production | `scheduled_production` | by line provider | — |
| 9 | Provider Hourly Production | `production_per_hour` | provider net production ÷ `clinical_hours` (default `booked_hours`) | Live month = net production ÷ 120 hours from a source that is not row 6 (row 6 is always 0); two months show 0 where hours were missing. Decided: booked hours by default, `clocked_hours` under `clinical_hours_source = time_clock`; 03 §11.2 P9 is to cite `production_per_hour` with the source named (REQ-08). Ours returns `no_data` when the source is missing |
| 10 | Provider Same Day Treatment | `same_day_treatment_amount` | 5.1 | A currency amount (2-16 % of gross); gross or net is unknown. Ours is the charged fee; P1 tests `c.is_planned` only (03 §11.2 P10), the line-date test of `booked_before` follows REQ-03 |
| 11 | Treatment Reappointment Per Dentist (%) | `treatment_reappointment_pct` | by the primary provider of the visit | Shown for every provider type under a "Per Dentist" label. Ours is served for `production_group = 'doctor'` only; hygienists get `hygiene_reappointment_pct` |

Rows the reference lacks per provider and 06 should add from this catalog: `production_vs_goal_pct`, `provider_collection_pct`,
`case_acceptance_pct`, `provider_working_days`, `provider_utilization_pct`, `cancellation_rate_pct`, `no_show_rate_pct`.

---

## 7. Legacy Practice Analytics mapping

Source: `research/denticon_analytics_and_dso.md` §8.3-§8.6 (formulas, code lists, thresholds of the eight dashboards) and
`research/dental_kpi_dictionary.md` §2-§3 (`[DPA]` rows). "Preset" = reproduced by `metric_preset =
denticon_practice_analytics` (section 3). Differences that no preset removes are marked **fixed**.

Differences that apply to every dashboard: the legacy "Gross Production" is our `charged_production` (2.1); the legacy
product replaces a zero denominator or a zero prior value by 1, we return no data (**fixed**); legacy data is refreshed
nightly, ours is live with a `data_as_of` stamp; legacy tiles show the top five carriers, ours return every member plus
an explicit `other` member (02 §10.1 `include_other`).

### 7.1 Morning Huddle

| Legacy metric | Our `metric_key` and query shape | Difference |
|---|---|---|
| Net Production MTD vs. Goal | `production_vs_goal_pct`, month to date | Same formula. Goal 0: legacy forces year-to-date attainment to 100 %, ours returns no data (**fixed**) |
| Collection % of Prod MTD | `collection_pct` | Default denominator is before bad debt; preset = `net_collection_pct_after_bad_debt` |
| Total Patients Seen MTD | `patients_seen` | Same (distinct patients with a visit code) |
| New Patients Seen MTD | `new_patients_first_visit` | Same rule; first visit is derived from charges because the migrated `first_visit` was never stored |
| Recare Patients Seen MTD | `recare_exams` (transactions), `recare_patients_seen` (patients) | Legacy counts transactions in some views; both are published, tiles default to patients |
| Outstanding A/R | `total_ar` by office under unit `account` (`ar_office_attribution = home_office` for this tile) | Same (account A/R, credits included). Our default unit is `account_office`, A/R by transaction office (PD-6); the organisation total is equal under both |
| Case Acceptance Rate % MTD | `case_acceptance_plans_pct` | Legacy divides by every plan ever created; ours cohorts by presentation date (**fixed**) |
| Utilization MTD | `provider_utilization_pct` | Same structure; available hours from the 03 calendar |
| Avg Daily Production MTD | `production_per_working_day` | Preset: provider days by the 0.5 / 1.0 rule |
| Daily Goal · Daily Avg to Meet Monthly Goal | `production_goal` (day grain), `daily_avg_needed_to_goal` | Reproduced: gap at or below 0 gives 0. **Fixed** (8.4): zero goal gives no data instead of 0; zero remaining days gives no data instead of dividing by 1; "negative remaining days returns the daily goal" cannot occur (remaining days are counted from today and are never negative); providers with a goal but no month-to-date transactions stay in the goal (the legacy product drops them, which inflates attainment) |
| Scheduled Production Today / Next Working Day / 2nd Working Day | `scheduled_production` over the windows `today`, `next_working_day`, `second_working_day` | Same; each provider's own next working days come from `rpt_provider_calendar_days()` |
| Exams Today (new, recare, emergency, total) | `scheduled_exams` by `exam_type` | Legacy counts a new-patient exam only when First Visit Date is empty; ours counts the booked D0150 line and offers `new_patients_scheduled` beside it |
| Outstanding A/R of Today's Patients | `ar_of_todays_patients` | Same (whole account, patient portion above zero) |
| Pending Tx $ of Today's Scheduled Recare Exams | `pending_treatment_of_todays_patients` filtered to patients with a recare exam line today | Same |
| SRP Opportunities | `srp_opportunities` | Same code rule (newer guide) |
| Active Provider toggle | member filter of the query (providers with a `LIVE` appointment today, or this month) | Not a metric |
| Previous day: Net Production, Net Collections, patients seen, Daily Goal | same keys with `date_preset = yesterday`, `compare_to = {kind: previous_period, align: weekday}` | Same comparison (same weekday last week) |
| Same Day Net Production | `actual_vs_scheduled_production_pct − 1` | Legacy name mixes two ideas. Ours separates schedule variance (this) from unplanned work (`same_day_treatment_amount`) (**fixed**) |
| Reappointment % | `reappointment_pct` | Preset `holds_future_now`; default is booked at the visit |
| Count of Patients by Insurance Carrier (not reappointed) | drill list of `reappointment_pct` grouped by `carrier_id` | A list, not a metric |
| Total Production per Day Needed to Achieve Monthly Goal | `daily_avg_needed_to_goal` at office level | Same |
| Total New (or Recare) Patients Projected this Month | `new_patients_projected`; recare: `project_period_end(recare_patients_seen)` | Same formula |
| New / Recare Patients Seen YTD, year over year | same keys, `year_to_date`, `compare_to.kind = previous_year` | Same |
| Net Production YTD vs. Goal · Net Collections YTD · Collection % YTD | `to_date` forms of the same keys | Same |
| Previous Month's Performance | frozen `month_end` rows of `rpt_metric_values` (section 10) | Legacy froze the tiles on the last day of the month; ours stores them with their definition version |

### 7.2 Production Analysis

| Legacy metric | Our `metric_key` and query shape | Difference |
|---|---|---|
| Gross Production | `charged_production` | Name (2.1) |
| Production Adjustment | `production_adjustments` | Signed; bucket `production_adjustment` only: opening balances, contract movements, sales tax and the capitation offset `AD900` are A/R movements outside both nets, while `AINSO` is a production adjustment whatever its legacy Sub Type (**fixed**, 2.1, 03 O-2) |
| Net Production | `net_production` | Same arithmetic |
| Net Production vs. Goal · Daily Average to Meet Monthly Goal | `production_vs_goal_pct`, `daily_avg_needed_to_goal` | 7.1 |
| Avg. Daily Net Production | `production_per_working_day` | Preset for the working-day rule |
| Avg. Net Production per Visit | `production_per_visit` | Legacy numerator is production of visit-coded procedures only; ours is all net production by default (as the reference dashboard). Preset: `per_visit_production_scope = visit_code` (numerator `visit_code_production`) |
| Same Day Net Production % | `actual_vs_scheduled_production_pct − 1` | 7.1 |
| Net Production by Date and Provider Type | `net_production` by day and `provider_kind` (or `specialty`) | Same |
| Net Production by Procedure Category → ADA code | `charged_production` by `code_category` → `procedure_code` | Adjustments have no procedure code unless linked; the category view is on charges |
| Top Insurance Carriers by Net Production | `charged_production` by `carrier_id`, ordered, with `other` | Never truncated to five silently |
| Scheduled Production · Avg Daily Scheduled Production · per Visit · per Hour | `scheduled_production`; ÷ `working_days`; ÷ `appointments_booked`; ÷ `booked_hours` | Ratios are computed from these components in the tile |
| Scheduled Utilization % | `provider_utilization_pct` on future dates (complement: `open_time_pct`) | Same |
| Production to Goal | `production_forecast` against `production_goal` | Same construction (net production through yesterday + scheduled) |
| Production Detail by carrier: Patient Count, Gross Production, Production Adjustment, Net Production | `patients_seen`, `charged_production`, `production_adjustments`, `net_production` by `carrier_id` | Carrier of an adjustment exists for app-era remittance write-offs only (k11) |

### 7.3 Collections Analysis

| Legacy metric | Our `metric_key` and query shape | Difference |
|---|---|---|
| Collections as a % of Production (target 95 %) | `collection_pct` | 7.1 |
| Gross Collections | `gross_collections` | In-app insurance payments are included (PD-2) |
| Collections Adjustment | `collection_adjustments` | Legacy shows an absolute value; ours is signed and labelled |
| Net Collections | `net_collections` | Bucket `collection_adjustment` only: the insurance write-off `AINSO` is a production adjustment, and sales tax, contract movements and `AD900` are in neither net (**fixed**, 2.1, D-8) |
| Net Collections by Procedure Types | `m_allocated_payments` by `code_category` (allocation to the paid procedure) | Needs allocations (P2); derived for history (k4) |
| Top Insurance Carriers (payment and adjustment) | `insurance_collections` by `carrier_id` | Migrated payments carry no carrier (k11) |
| Collections Scorecard by office | the collection metrics by `office_id` | Same |
| Avg. Days Sales Outstanding | `ar_days` | Preset `collections_business_days`; default is production-based (section 3 #9) |
| % OTC Collections | `otc_collection_pct` | Legacy matches the payment's allocation date to the estimate's transaction date per day; ours works per account-office-day and caps at the estimate (**fixed**) |
| % Patient / Gross Collections | `patient_collection_share_pct` | Same |
| Total Outstanding A/R (transaction office) · patient versus insurance | `total_ar`, `patient_ar`, `insurance_ar_estimated` | Same attribution as our default |
| Top Carriers by Outstanding Insurance A/R | `outstanding_claims_amount` by `carrier_id` | Ours is claim based (open items carry no carrier) |
| A/R Aging: Current, 30+, 60+, 90+, 120+ | `ar_aging_amount` with `aging_bucket_set = legacy` | Same edges (03 §2.14) |
| Outstanding Claims: total, count, top carriers, by claim type, aging | `outstanding_claims_amount`, `outstanding_claims_count` by `carrier_id`, `tier`, `claim_age_bucket` | Same: the total covers primary, secondary and tertiary claims (outstanding amounts are per tier and additive); migrated claims of quality `unknown` are left out and counted in a warning |
| Provider Collections (per provider; aging to 180+, 270+, 360+) | collection metrics by `provider_id`; `aging_bucket_set = legacy_extended` | Legacy ignores the date range for A/R on this page; ours labels as-of values. Extended edges are 120-149, 150-179, 180-269, 270-364, 365+ (03) |

### 7.4 Provider Breakdown

| Legacy metric | Our `metric_key` (by `provider_id`) | Difference |
|---|---|---|
| Avg. Daily Net Production | `production_per_working_day` | Preset |
| Collection as a % of Production | `provider_collection_pct` | Allocation based (PD-7) |
| Case Acceptance % | `case_acceptance_pct` by item provider | 7.1 |
| Provider Utilization | `provider_utilization_pct` | Same |
| Total Doctor Days | `provider_working_days` for `production_group = 'doctor'` | Preset |
| Provider Retention Rate % (12 mo) | `provider_retention_12m_pct` | Same cohort rule (D0120 / D0145) |
| Avg. Daily Net Production vs. Daily Goal (Top 15, Bottom 15, All) | `production_per_working_day` with `include[] = goal`, `order_by`, `limit` | Ties and the remainder are explicit |
| Actual vs. Scheduled Production | `actual_vs_scheduled_production_pct` | No default band (vendor articles conflict) |
| Scheduled Production Today / Next / 2nd working day | 7.1 | — |
| Production / Visit · New Patients · Recare Patients | `production_per_visit`, `new_patients`, `recare_patients_seen` | — |
| Missed Appt % · Cancelled Appt % | `no_show_rate_pct`, `cancellation_rate_pct` | Same denominators (blocked excluded) |
| No Show Appt % (missed + cancelled) | `broken_appointment_rate_pct` | Label corrected (**fixed**) |

### 7.5 Treatment Plan Analysis

| Legacy metric | Our `metric_key` | Difference |
|---|---|---|
| Production Amount by Treatment Status (Diagnosed, Accepted, Scheduled, Completed) | `treatment_presented_amount`, `treatment_funnel_amount` by `funnel_stage` | Ours is item based with a strict hierarchy; legacy is plan-status based (**fixed**) |
| Average Production Per Visit | `production_per_visit` | 7.2 (preset `visit_code`) |
| Case Acceptance Rate | `case_acceptance_plans_pct` | Cohort (**fixed**) |
| Unscheduled Patients with Accepted / Unaccepted Treatment Plan | `unscheduled_treatment_amount`, `unscheduled_treatment_patients` by `acceptance_state` | Age cut-off `unscheduled_tx_max_age_months` (preset 0) |
| % Accepted · % Scheduled · % Completed | `treatment_funnel_pct` | Legacy divides status fees by diagnosed fees with overlapping statuses; ours uses exclusive stages of one cohort, so the shares add to 100 % (**fixed**) |
| Amount of Unscheduled Treatment Plans · % Unscheduled | `unscheduled_treatment_amount`; ÷ `treatment_presented_amount` | — |
| Top Referrals (internal + external by specialty) | `outbound_referrals` by `specialty` and direction | Structured cases need DATA-40 |

### 7.6 Front Office

| Legacy tile | Our `metric_key` | Difference |
|---|---|---|
| Net Production (amount, % of goal, 7-day trend) | `net_production`, `production_vs_goal_pct`, `include[] = sparkline` | — |
| Net Collection · collections % of production | `net_collections`, `collection_pct` | 7.1 |
| Outstanding AR of Today's Scheduled Patients · A/R by Patient versus Insurance | `ar_of_todays_patients`, `patient_ar`, `insurance_ar_estimated` | — |
| Provider Utilization (overall, by provider) | `provider_utilization_pct` | — |
| Appointments: New Patients · Recare Patients | `scheduled_exams` by `exam_type` | — |
| Hygiene appointments (D4910, D4341, D4342, D4355 or a hygienist provider) | `appointments_booked` filtered by `HYGA` | Our code list is `hygiene_visit`, which adds the prophylaxis codes D1110, D1120 and D4346 (the preset group `hygiene_visit_dpa` still holds D1110 and D1120): a prophylaxis appointment with a dentist is a hygiene appointment (**fixed**) |
| Daily Appointments by dentist and hygienist | `appointments_booked` by `provider_kind` | — |
| Patient Diagnosed · Unscheduled Patients with Tx Plan (count, amount) | `patients_presented`, `unscheduled_treatment_patients`, `unscheduled_treatment_amount` | — |
| Case Acceptance Rate · Percentage Preauthorized | `case_acceptance_plans_pct`, `preauthorized_pct` | — |
| Unconfirmed Appointments, next 7 days (count, amount) | `unconfirmed_appointments` | — |
| No Show Appts, last 7 days (count, amount, by date) | `appointments_no_show` (and `appointments_cancelled`), `broken_appointment_value_lost` | Whether the legacy tile includes cancellations is not stated |

### 7.7 Hygiene Recall

| Legacy metric | Our `metric_key` | Difference |
|---|---|---|
| Hygiene Retention Rate % (12 Months) | `hygiene_retention_12m_pct` | Same cohort and return rule (groups `hygiene_visit_dpa` under the preset, `hygiene_return`) |
| Total Hygiene Retention by patient type | same, by `code_group` in `prophy_child`, `prophy_adult`, `srp`, `perio_dpa` | The legacy guide lists D4355 under two types; ours keeps it under perio |
| Adjunctive Therapy % (fluoride, laser, irrigation, Arestin) | `adjunctive_therapy_pct` by `code_group` | Same code lists |
| Hygiene Reappointment % | `hygiene_reappointment_pct` | Preset `holds_future_now` |
| Perio % | `hygiene_retention_12m_pct` restricted to return group `perio_dpa` | Our `perio_patient_pct` is a different KPI (share of active adults in perio care) |
| Prod Per Visit | `hygiene_production_per_visit` | — |
| Avg Quad Per Day | `srp_quadrants_per_working_day` | Legacy counts distinct patients with a quadrant code; ours counts quadrant lines (**fixed**) |
| Avg Visits Per Day | `hygiene_visits_per_working_day` | — |
| Prod Chair Per Hour | `production_per_working_day` by hygienist (what the legacy formula computes) and `hygiene_production_per_hour` (what the name says) | Legacy divides by days under an "per hour" name (**fixed**) |
| Avg Daily Net Production vs Daily Goal by Hygienist | as 7.4 with `provider_kind = hygienist` | — |

### 7.8 Patient Visit Analysis

| Legacy metric | Our `metric_key` | Difference |
|---|---|---|
| Patient Visits · Total Patients Seen · Production Per Visit · Provider Utilization | `patient_visits`, `patients_seen`, `production_per_visit`, `provider_utilization_pct` | — |
| Reappointment % | `reappt_holds_now_pct` | Legacy divides by appointments and requires the next appointment at the same office; ours divides by patients seen and accepts any office of the organisation (**fixed**; the office is a working context, not a fence) |
| Active Patients (12 months) | `active_patients` | Preset 12; default 18 (PD-5) |
| Danger Zone Patients (12-24 months) | `at_risk_patients` | Same under the default bounds |
| Inactive Patients (24+ months or no visit) | `lapsed_patients` | Same |
| New vs Recare vs Emergency trend | `new_patient_exams`, `recare_exams`, `emergency_exams` by month | — |
| Patients by Zip Code | `patients_seen`, `net_production` by `zip5` | — |
| Missed, Cancelled, No Show Appointment % | 7.4 | — |

### 7.9 Legacy Executive Summary lines

The report itself is specified in `catalog/monthly.md`; its lines reconcile with these keys
(`research/legacy_report_outputs_monthly_mgmt_ledger_statements.md` §3, Executive Summary).

| Legacy line | Our `metric_key` | Note |
|---|---|---|
| New Patients | `new_patients_created` | Home office; app era only |
| New Patients by First Visit Date | `new_patients_first_visit` with `office_attribution = home_office` | |
| Patients Seen · Patient Visits | `patients_seen`, `patient_visits` | |
| Avg Patients Seen Per Day | `patients_seen ÷ working_days` with `working_day_basis = activity` | computed in the report |
| Total Procedures Done | `procedures_done` | |
| Total Chair Hours | `chair_hours` | The vendor sample behaves like minutes; unit unverified |
| Missed Appointments · Cancelled Appointments | `appointments_no_show`, `appointments_cancelled` | |
| Production (visit-code procedures, net of production adjustments) | `visit_code_production` | |
| Patient · Insurance (under Production) | `estimated_patient_portion`, `estimated_insurance_portion` with `visit_code_flag = true` | the same visit-code charges as the Production line |
| Non visit code transactions · Total | `charged_production` with `visit_code_flag = false`; `net_production` | |
| Collection · Patient · Insurance | `gross_collections`, `patient_collections`, `insurance_collections` | Printed negative (A/R sign) in the legacy layout |
| Adjustments (Collection) | `collection_adjustments` | |
| Dentist Production · Hygienist Production · Total | `doctor_net_production`, `hygiene_net_production`, `other_net_production`, `net_production` | Legacy has two rows; the third keeps the total tied |
| Average Production Per Patients Seen / Chair Hours / Procedures Done / Patient Visits | `safe_div(visit_code_production, x)` for `x` = `patients_seen`, `chair_hours`, `procedures_done`, `patient_visits`, computed in the report from the keys | every average divides the Production line (vendor sample: 157.04 per visit, 69.79 per procedure; `research/legacy_report_outputs_monthly_mgmt_ledger_statements.md` §3), not all net production or the charged fee, so the generic per-visit and per-procedure keys are not used here |
| Referrals block (New Patients, Production per source) | `new_patients_first_visit`, `referral_source_production` by `referral_source_id` | |
| MTD / YTD: Charges, Non-Visit code Transactions, Payments, Adjustments | `to_date` forms of the keys above | |
| A/R as of: Current … Over120, Total A/R, Estimated Insurance, Estimated Patient | `ar_aging_amount` (set `legacy`), `total_ar`, `insurance_ar_estimated`, `patient_ar` | Matches the Aging Report only with credit balances included on both (legacy quirk) |

### 7.10 KPI fields that exist in DentC today

For the adapters of ENG-35. Values change on the switch; each change is listed in the release note.

| Existing field [V] | Computed today as | Our `metric_key` | Change in value |
|---|---|---|---|
| `GET /reports/summary` `.production` | `Σ fee` of non-void, non-archived procedures by `date_of_service` | `charged_production` | Non-production codes leave (`non_production_charges`) |
| `.collections` | `sum_payment_credit()` over `patient_payments` | `gross_collections` | Adjustment credits leave; in-app insurance payments enter |
| `.new_patients` | `patients.created_at` in the range | `new_patients` | First-visit rule; migrated history becomes meaningful |
| `.active_patients` | count of `patients.is_active` | `active_patients` | Visit window applied |
| `.scheduled_appointments` | not cancelled, not blocked, not archived | `appointments_booked` | No-shows leave |
| `.insurance_receivables` | `Σ max(total_billed − total_paid, 0)` | `outstanding_claims_amount` | Estimate-based, write-offs netted |
| `.outstanding_ar` | `report_service` A/R components | `total_ar` | Canonical ledger (PD-2) |
| `GET /dashboard/summary` `.outstanding_balance`, `.patient_balance`, `.insurance_receivable`, `.credit_balance` | per-office Python loops | `total_ar`, `patient_ar`, `insurance_ar_estimated`, `credit_balances` | as above |
| `.collections.patient_payments`, `.insurance_payments`, `.total_collections` | `transactions_service.collections_summary` | `patient_collections`, `insurance_collections`, `gross_collections` | as above |
| FE dashboard tiles (`FE:src/components/dashboard/lib/`, `FE:src/components/reports/lib/reportMetrics.ts`) | browser aggregation capped at 600-1,600 rows | `appointments_*` by `status_class`, `new_patients`, `active_patients`, `recall_due_unscheduled_patients`, `scheduled_production`, `charged_production`, `gross_collections` | Totals become complete (AD-1) |

---

## 8. Goals model

### 8.1 Boundary and starting point

This section fixes what a goal means to the metric layer: the stored inputs, how a goal amount is resolved for any scope
and period, and the pacing formulas. Goal entry screens, the `/analytics/goals` payloads (02 #62) and alert rules are owned
by `06_dashboards.md`. Verified [V]: no goals table, service or screen exists in either repository; only the rights
`setup_provider_goals_screen_full_control` / `_view_only` survive in `app/services/access_rights_catalog.py` L158-159. The
legacy model is a daily production goal per provider per month, up to 13 months ahead, with working days autofilled from
the provider schedule (`research/denticon_analytics_and_dso.md` §8.6).

### 8.2 Tables

`provider_production_goals` (NEW, DATA-24, P1) — the columns the metric layer needs (the DDL is finalised in
`10_backend_plan.md`):

| Column | Type | Meaning |
|---|---|---|
| `id`, `tenant_id` | bigserial, int | |
| `provider_id` | varchar(50) NULL | NULL = an office-level goal (then `office_id` is required): used for an office that budgets at office level, never added to provider sums (8.3) |
| `office_id` | int NULL | NULL = every office the provider works at (the convention of `provider_schedule_days.office_id` [V]) |
| `goal_month` | date | first day of the month |
| `daily_goal` | numeric(12,2) | goal per working day |
| `working_days` | numeric(4,1) NULL | entered days (the legacy "Autofill" result); NULL = derive from the calendar (section 3 #32) |
| `monthly_goal` | numeric(14,2) NULL | entered month amount; NULL = `daily_goal × working_days` |
| `production_basis` | varchar(10) | `net` · `charged` · `gross`; default = `goal_production_basis` |
| `source` | varchar(12) | `manual` · `auto_seed` · `hours_based` · `import` |
| `version`, `valid_from`, `superseded_at` | int, timestamp, timestamp | a change inserts a new version; history is never rewritten |
| `created_by`, `created_at` | | |

One live row per (`tenant_id`, `provider_id`, `office_id`, `goal_month`), NULLs compared as equal (`UNIQUE NULLS NOT
DISTINCT`, PostgreSQL 15).

`metric_targets` (NEW, MET-21) — targets and colour bands for any metric:

| Column | Type | Meaning |
|---|---|---|
| `id`, `tenant_id` | bigserial, int NULL | `tenant_id` NULL = shipped default |
| `metric_key` | varchar(60) | a fixed-definition key or an alias |
| `scope_kind`, `scope_id` | varchar(16), varchar(50) NULL | `organisation` · `office_group` · `office` · `provider_kind` · `provider` |
| `period_grain`, `period_start` | varchar(8), date NULL | `any` · `day` · `month` · `quarter` · `year`; `period_start` NULL = every period |
| `target_value` | numeric NULL | the target for rate, count and money metrics other than production (collections, new patients, production per hour); money targets are amounts per `period_grain` |
| `band_warn`, `band_good` | numeric NULL | three zones: beyond `band_good` = good, between = warning, beyond `band_warn` = bad; order validated against the metric's `direction` |
| `range_low`, `range_high` | numeric NULL | for direction `target_range` |
| `source`, `benchmark_key` | varchar(12), varchar(80) NULL | `default` · `benchmark` · `manual` · `derived` |
| `valid_from`, `valid_to`, `created_by`, `created_at` | | versioned like code groups |

Resolution order for a point: `provider` → `provider_kind` → `office` → `office_group` → `organisation` → shipped default →
the definition's `default_bands`. Production goals are never stored in `metric_targets`; they come from
`provider_production_goals` because they need the working-day arithmetic below.

### 8.3 Resolving a production goal — `goal(scope, period)`

| Step | Rule | Source |
|---|---|---|
| Provider-month amount | `G(p, o, m)` = `monthly_goal` when entered, else `daily_goal × D(p, o, m)` | `[DPA]` "Monthly Goal = Daily Goal × provider working days configured for the month" |
| Working days `D(p, o, m)` | entered `working_days`; else the provider's scheduled days at the office in the month (`rpt_provider_calendar_days()`: schedule minus holidays); else per `goal_working_days_fallback` (office calendar, or fixed 20) | `[DPA]` Autofill; the legacy Scheduled Production report uses 20 |
| Provider-day amount | `safe_div(G, D)` on each working day of the provider, 0 on other days (a half day carries half under `booked_hours_half_day`). `D = 0` with an entered `monthly_goal`: the amount is spread over the open days of the office calendar; with no open day either, `no_data` | `[DPA]` 0.5 / 1.0 rule |
| Provider goal for a range | sum of the provider-day amounts over the days of the range | `[DPA]` "Goal Amount = Daily Goal × Provider Working Days" |
| Rows with `office_id` NULL | apportioned to offices in proportion to the provider's scheduled days per office in the month; without a schedule, by the open days of those offices (office calendar); never by production, which would make the goal follow the actuals it is compared with | [I] |
| Office goal | the office-level row (`provider_id` NULL) when one exists for the month; otherwise the sum over the providers working at the office. An office with neither has `no_data`; a provider without a goal adds nothing and is listed in warning `providers_without_goal` | `[DPA]` (sum); office row [I] |
| Office daily goal | sum of the provider-month amounts ÷ office working days of the month | `[DPA]` |
| Doctor / hygiene goal | sum by `production_group` | |
| Office group, organisation | sum over offices | `[DPA]` scorecards |
| Several months | amounts add; the average daily goal is `safe_div(Σ (daily_goal × D), Σ D)` | `[DPA]` |
| Basis | the numerator `P_goal` uses the row's `production_basis`; a mixed scope uses `goal_production_basis` and warns | Dental Intelligence: goal basis must match the numerator |

Derived goals (written as rows with their `source`, editable afterwards):

| Method | Formula | When |
|---|---|---|
| `auto_seed` | `daily_goal` = average over the last six months that have production of `safe_div(production, days worked)`; a negative average gives 0; a month with no days worked uses the provider's scheduled days, then the office's open days; a month with neither is skipped | Offered for a month in which no provider of the office has a goal (the legacy auto-population rule); never overwrites a non-zero goal |
| `hours_based` | amount = production-per-hour target × `provider_scheduled_hours` of the month, where the target is the `metric_targets` row on `production_per_hour` evaluated with `clinical_hours_source = scheduled` — the same hours it is multiplied by | Dental Intelligence model; needs configured schedules (k10) |
| Top-down (P4, optional) | organisation production goal = collections goal ÷ target `collection_pct`; spread over providers by scheduled days or prior production | consultant method (unverified); stored as ordinary rows |

### 8.4 Pacing metrics and edge rules

| Metric | Formula | Edge rules |
|---|---|---|
| `production_goal` | `goal(scope, period)` | No goal row for the scope (provider or office level) → `no_data` (reason `no_goal`), never 0 |
| `production_vs_goal_pct` | `safe_div(P_goal over the range, production_goal of the same days)` | Goal 0 or missing → `no_data` (the legacy product shows 100 %). A range that contains today is evaluated through yesterday on both sides, and future days are ignored: the legacy product counts the current day as a working day although its nightly data holds none of that day's production |
| `daily_avg_needed_to_goal` | `safe_div(G_month − P_goal [month start .. yesterday], R)`, `R` = working days of the scope from today through the month end | `R = 0` → `no_data` (reason `no_remaining_working_days`; the legacy product divides by 1); gap at or below 0 → 0 with status note `goal_met`; no goal → `no_data`; schedule not configured → `R` from the fallback, with warning `k10`. Defined for the current month only: for a closed month or a range of several months → `not_available` |
| `production_forecast` | `P [month start .. yesterday] + schedule_completion_factor × scheduled_production [today .. month end]` | Current month only (a closed month has its actual; a future month has no production to date) → `not_available` otherwise. A run-rate alternative is `project_period_end(net_production)`; the tile may show both |
| Pace status | bands on `production_vs_goal_pct`: below 85 % bad, 85-95 % warning, above 95 % good | Shipped default in `metric_targets` (`[DPA]` colours) |
| Count, rate and other money goals | `metric_targets.target_value`; pace for a count or amount = `safe_div(to_date(m), target × safe_div(elapsed working days, working days of the period))` | Rates compare directly with the target |

Live-data difference from the legacy product: its dashboards refresh at night, so "month to date" never contains today.
Ours does; the needed-per-day figure therefore uses production through yesterday and counts today as a remaining day.

---

## 9. Benchmarks

### 9.1 Storage and display rule

`metric_benchmarks` (NEW reference data, shipped by an Alembic data revision, no tenant column): `benchmark_key`,
`metric_key` (always a fixed-definition key, never an alias), `source_code`, `source_year`, `tier` (`bottom`, `average`,
`top`, `median`, `top_10_pct`, `target`, `warning`, `elite`), `value`, `unit`, `segment` (`all`, `dso`, `1_7_locations`,
`8_plus_locations`, `ortho`), `definition_basis` (the definition the publisher used), `required_settings` (jsonb
`{setting_key: value}`, empty for a key that no setting parameterises), `sample_note`, `comparability` (`same` ·
`similar` · `context_only`), `valid_from`, `retired_at`.

1. A benchmark is returned by `include[] = benchmark` only when its `metric_key` equals the key the query resolved to
   (after alias and synonym resolution) and every entry of its `required_settings` equals the value in force — the same
   values the response echoes in `resolved_settings{}`. A parameterised key without a match shows no benchmark.
2. `same` is drawn as a reference line; `similar` is drawn with a note stating the difference; `context_only` appears in
   the glossary only.
3. Setting `show_external_benchmarks` (off until D-9 is settled) switches all of them; the shipped default bands of section 5 are ours and stay. Published figures are stored with source and year
   and never hard-coded in a formula or a band; the three articles of the reference vendor alone give three numbers for
   one KPI (`analysis/reference_screenshots.md` §6.3).
4. Planet DDS figures are computed on expected collections, so they compare with `charged_production`, never with
   `gross_production` (`research/dental_kpi_dictionary.md` §2.1).

### 9.2 Values shipped as defaults

| `metric_key` | Values | Source (data year) | Definition it assumes | Comparability |
|---|---|---|---|---|
| `hygiene_reappt_at_visit_pct` | bottom 53 %, average 87 %, top 94 % | `DI-SOD26` (2025; more than 10,000 practices) | hygiene patients who leave with the next hygiene appointment booked | same |
| `hygiene_pre_appointment_pct` | 26 % / 59 % / 80 % | `DI-SOD26` | active patients (18 months) holding a future hygiene appointment | same; `required_settings` `{active_patient_window_months: 18}` |
| `hygiene_pre_appointment_pct`, `hygiene_reappt_holds_now_pct` | target 90 % | `ADA-MS` | "90 % of recare patients scheduled for their next appointment at all times" | similar (point-in-time reading; recare population not defined) |
| `pre_appointment_pct` | 28 % / 54 % / 75 % | `DI-SOD26` | active patients (18 months) holding any future appointment | same; `required_settings` `{active_patient_window_months: 18}` |
| `new_patient_reappointment_pct` | 22 % / 50 % / 69 % | `DI-SOD26` | new patients with a future appointment at the end of the first visit | same |
| `net_patient_growth_pct` | −11 % / 3 % / 17 % | `DI-SOD26` | new + reactivated − lost over a year, 18-month window | similar (period length); `required_settings` `{active_patient_window_months: 18}` |
| `treatment_presented_per_exam` | $750 / $1,716 / $2,955 | `DI-SOD26` | restorative dollars presented per exam | similar (code sets) |
| `case_acceptance_dollars_same_day_pct` | 23 % / 41 % / 62 % | `DI-SOD26` | treatment dollars scheduled or completed on the day presented | same |
| `perio_patient_pct` | 1 % / 11 % / 32 % | `DI-SOD26` | active patients over 30 in ongoing periodontal care | similar (code set); `required_settings` `{active_patient_window_months: 18, perio_age_min: 30}` |
| `net_collection_pct` | 93 % / 102 % / 109 % | `DI-SOD26` | collections ÷ net production | similar (their net production basis) |
| `net_collection_pct` | target 98 % | `ADA-MS` | of billable / adjusted production | same |
| `net_collection_pct_after_bad_debt` | target 95 %; median 88.9 % | `[DPA]`; `PDDS-DD26` (2025; 497 DSOs) | net collections ÷ net production | same |
| `gross_collection_pct` | average 72 % (8+ locations), 75 % (1-7), top 10 % 97 % | `HSO-CL` (2026 index) | denominator not stated | context only |
| `ar_days_production_90d` | 74 / 26 / 5 days | `DI-SOD26` | formula not published | context only |
| `ar_over_90_pct` | warning above 50 %, target 15-30 %, elite below 15 % | `PDDS-DD26` | share of A/R older than 90 days | same |
| `otc_collection_pct` | warning below 80 %, target 80-95 %, elite above 95 %; median 91.3 % | `PDDS-DD26` | patient-responsible balance collected at the point of service | similar (matching rule) |
| `bad_debt_rate_pct` | warning above 5 %, target 1-3 %, elite below 1 %; median 3.6 % | `PDDS-DD26` | bad-debt write-offs ÷ expected-fee production | same |
| `same_day_claim_rate_pct` | warning below 20 %, target 40-80 %, elite above 80 % | `PDDS-DD26` | claims sent on the date of service ÷ all claims | same (denominator: every primary claim of the service cohort) |
| `claims_over_90_pct` | below 20 % | `DIQ-RCM` | insurance A/R over 90 days | same |
| `denial_rate_pct` | at most 4 % | `DIQ-RCM` | denied ÷ adjudicated, from payer responses | similar (ours is a status proxy) |
| `cancellation_rate_notice_based_pct` | 12.9 %; warning above 20 %, target 10-15 %, elite below 10 % | `PDDS-DD26` (2025; 5,200+ practices) | cancelled in advance ÷ scheduled | same (the publisher's notice threshold is not stated, so no setting is required) |
| `cancellation_rate_status_based_pct` | the same values | `PDDS-DD26` | cancelled in advance ÷ scheduled | similar (ours counts every cancellation, late ones included) |
| `cancellation_rate_status_based_pct` | average 5 %, top 10 % below 1 % | `HSO-CL` | not stated | context only |
| `no_show_rate_notice_based_pct` | 6.9 % | `PDDS-DD26` | failed without prior notice | same (the publisher's notice threshold is not stated, so no setting is required) |
| `no_show_rate_status_based_pct` | 6.9 % | `PDDS-DD26` | failed without prior notice | similar (late cancellations are counted as cancellations) |
| `broken_appointment_rate_pct` | at most 5 % | `ADA-MS` | cancellations and no-shows combined | same |
| `hygiene_return_12m_pct` | 63 % (2025), 60 % (2024) | `PDDS-DD26` | hygiene reappointment "within 12 months" | same |
| `case_acceptance_plans_pct` | 58 % (2025), 57 % (2024) | `PDDS-DD26` | plans marked accepted, scheduled or completed | similar (ours cohorts by presentation date) |
| `case_acceptance_plans_pct` | target 75-80 %; average 45 %, top 10 % 75 % | `ADA-MS`; `HSO-CL` | "case presentations accepted"; not stated | context only |
| `case_completion_pct` | 47 % (2025), 42 % (2024) | `PDDS-DD26` | plans created in the first half-year and completed by year end | similar (window) |
| `acceptance_completion_gap_pp` | warning above 30 points, target 10-30 | `PDDS-DD26` | acceptance minus completion | similar |
| `new_patients_first_visit` | per practice per month: warning below 35, target 35-75, elite 75+; average 46 | `PDDS-DD26` | practices including specialty, DSO-heavy sample | similar (per office) |
| `hygiene_production_share_pct` | 25 %; 25-35 % | `ADA-MS`; `DE-HYG15` | hygiene department share of production | similar (split basis) |
| `recare_active_pct` | at least 85 % | `ADA-MS` | patients active in the recare system | similar |
| `daily_production_volatility_cv` | warning above 0.5, target 0.3-0.5, elite below 0.3 | `PDDS-DD26` | standard deviation ÷ mean of daily production | same |
| `day_of_week_production_index` | Friday: warning below 60 %, target 70-80 %, elite above 80 % | `PDDS-DD26` | Friday against Tuesday (the network's peak day) | similar (ours is against the office's best day) |
| `production_per_operatory` | warning below $100K, target $150-200K, elite $300K+ a year | `PDDS-DD26` | expected-fee production per chair | similar; `required_settings` `{production_basis_for_rates: charged}` |
| `production_per_working_day` | per provider-day: general dentist $3,728, hygienist $1,091 | `PDDS-DD26` | expected-fee production per day | similar (provider-days); `required_settings` `{production_basis_for_rates: charged}` |
| `production_per_office` | $8,764 per practice per day | `PDDS-DD26` | expected-fee production per practice-day | similar; `required_settings` `{production_basis_for_rates: charged}` |
| `cash_conversion_waterfall_amount` | stage shares 7.8 / 3.3 / 3.6 / 4.8 % (chart) and 8.2 / 9.5 / 2.9 / 3.9 % (summary) | `PDDS-DD26` | shares of expected-fee gross production | context only (the two sets conflict) |
| `same_store_growth_pct` | simple 6.6 %, trimmed 4.9 %, weighted 4.0 % | `PDDS-DD26` (2025 against 2024; 3,294 locations) | locations active in both years | same |
| `new_patient_lead_days` | average 23 days, top 10 % 7 days; 12.0 business days | `HSO-CL`; `ADA-Q3-26` | not stated; owner-reported wait | context only |
| `ortho_conversion_pct` | 68.3 % (2025), 64.4 % (2024) | `PDDS-DD26`, `PDDS-25` (ortho network) | starts ÷ exams | same |
| `ortho_patients_beyond_ecd_pct` | at most 2 % | `LEV-ORTHO` | overdue debonds | similar |

No published benchmark exists for `production_per_visit`, `production_per_hour`, `diagnostic_pct`, `fluoride_rate_pct`,
`adjunctive_therapy_pct`, `confirmation_rate_pct`, `insurance_estimate_accuracy_pct`
(`research/dental_kpi_dictionary.md` §12). For these the comparison is in-organisation only.

### 9.3 Comparison across offices inside one organisation (PD-13)

| # | Rule |
|---|---|
| 1 | Comparators: the organisation value (ratio of sums), the median office, the top-quartile office, the office-group value, the office's own trailing 12 months, the same period last year. "Average office" (mean of office values) is a different number from the organisation value and is labelled as such |
| 2 | Only normalised metrics are ranked: rates, per-day, per-visit, per-hour, per-operatory and per-provider values. Totals are listed but ranked only on request |
| 3 | One definition for all offices: settings and code-group overrides are organisation-wide (section 3), so no office can be compared on a different rule |
| 4 | Volume guard: a member below `rate_min_denominator` is listed unranked; a dispersion or percentile needs at least 3 ranked members |
| 5 | Same-store rule: an office is comparable for a period pair when it is active, has production in both periods and opened at least `same_store_min_months` before the end of the current period (`rpt_office_dim.opening_date`, or its first production date when that is empty). Excluded offices are named in the output |
| 6 | Growth aggregates: `weighted` (ratio of sums, default), `simple_mean`, `trimmed_mean` (top and bottom 10 % removed, at least 10 offices) — shown side by side because they differ (`PDDS-DD26`: 4.0 %, 6.6 %, 4.9 %) |
| 7 | Month comparisons of volume metrics are also offered per working day (months and offices differ in open days) |
| 8 | Peer sets are office groups. One group per office exists today [A]; regions and brands as overlapping sets need a many-to-many grouping that 03 does not define |
| 9 | Rankings never truncate silently: top-N and bottom-N carry ties and an explicit `other` member |
| 10 | Provider rankings follow 08: a provider-restricted caller receives their own value and an anonymous distribution (count, median, quartiles) only when at least 5 providers contribute |
| 11 | Cross-organisation percentiles are out of scope (PD-13). `definition_version` and `settings_version` travel with every stored value so that an aligned set could be built later |

---

## 10. Point-in-time metrics and the snapshots they need

A flow metric (production of March) can be recomputed at any time. A state metric answers "as of" and most of its inputs
keep no history: the appointment book, treatment-item status, claim status, the eligibility stamp, the patient active
flag. Its trend exists only from the day snapshots start, so capture begins in P2 even though the trend views arrive in
P3-P4 (same reasoning as DATA-25).

**Stores** (03 §9.1): `rpt_metric_values`, `rpt_ar_snapshot`, `rpt_ar_snapshot_accounts`, `rpt_scheduled_production_snapshot`,
`rpt_day_close_snapshot`. `rpt_metric_values` already carries what this section needs (03 §9.1): `snapshot_kind` `live`,
`day_end`, `month_end`, `period_lock`; `metric_version`, `settings_version`; `member_key` (one extra dimension member such
as `tier=primary`); `value`, `numerator`, `denominator`; `office_id` 0 = organisation. It has no office-group grain: a
group value of a ratio or an additive metric is recomputed from the stored office rows (sum of numerators ÷ sum of
denominators), but a distinct count (`active_patients`, `patients_seen`) cannot be, because patients overlap between
offices. An office-group grain is requested from 03 (REQ-09); until it exists, a past group value of a distinct-count
state metric is `not_available` unless its inputs are history (rule "Reading" below).

| Metrics | Why a past value cannot be recomputed | Snapshot | Cadence | Capture from |
|---|---|---|---|---|
| `total_ar`, `ar_debit_balance`, `credit_balances`, `patient_ar`, `insurance_ar_estimated`, `ar_aging_amount`, `ar_over_90_amount`, `ar_over_90_pct`, `patient_ar_past_due_amount` | Recomputable from the ledger, but later voids, edits and re-derived allocations rewrite the past | `rpt_ar_snapshot` (office × bucket; `attribution` `transaction_office` = unit `account_office`, `home_office` = unit `account`); `rpt_ar_snapshot_accounts` at month ends | daily, month end, day close, period lock | P2 (DATA-30) |
| the three `ar_days_*` variants, `collection_pct` and its variants, `production_per_visit`, `net_production`, `gross_collections` and the other headline flows | Recomputable; a closed month must not move (PD-9) | `rpt_metric_values`, kinds `month_end` and `period_lock`, with `metric_version` and `settings_version` | month end, lock | P2 |
| `outstanding_claims_amount`, `outstanding_claims_count`, `claims_over_90_pct`, `claims_unsent_count` | No claim status history until DATA-25 | `rpt_metric_values` `day_end`, `month_end` (by `tier`) | daily | P2 |
| `pre_appointment_pct`, `hygiene_pre_appointment_pct`, `unscheduled_active_patients`, `reappt_holds_now_pct`, `hygiene_reappt_holds_now_pct`, `unconfirmed_appointments`, `new_patients_scheduled` | They read today's appointment book | `rpt_metric_values` `day_end` | daily | P2 |
| `scheduled_production` for a past day, `scheduled_production_start_of_day`, `actual_vs_scheduled_production_pct`, `open_time_pct`, future-dated `provider_utilization_pct` | Bookings and schedules change | `rpt_scheduled_production_snapshot` (start of each office day: that day and the next 30); capacity history through DATA-43 | daily at the office day start | P4 in 03 (DATA-48); earlier start requested (REQ-10) |
| `unscheduled_treatment_amount`, `unscheduled_treatment_patients`, `treatment_funnel_amount`, `case_acceptance_plans_pct`, `case_acceptance_patients_pct` | Item status is current state until `treatment_plan_item_events` | `rpt_metric_values` `day_end` (unscheduled), `month_end` (all) | daily, month end | P3 |
| `active_patients`, `at_risk_patients`, `lapsed_patients`, `insured_patient_share_pct`, `perio_patient_pct` | Visit history is recomputable; the `is_active` flag and today's coverage slots are not | `rpt_metric_values` `month_end` | month end | P2 |
| `benefits_remaining_amount`, `preauthorized_pct`, `pending_treatment_of_todays_patients`, `treatment_funnel_pct` | Benefit usage, pre-authorisation and item status are current state | `rpt_metric_values` `day_end` (the first three), `month_end` (funnel) | daily, month end | P3 |
| `undeposited_payments_amount` | The deposit link is current state | `rpt_metric_values` `day_end`; day close (DATA-29) | daily | P2 |
| `production_per_operatory` (its chair count) | `rpt_office_dim.active_operatory_count` is today's count | `rpt_metric_values` `month_end` | month end | P4 |
| `recall_overdue_patients`, `recall_overdue_pct`, `recall_due_unscheduled_patients`, `recare_active_pct` | The scheduled state is current | `rpt_metric_values` `day_end`, `month_end` | daily | P3 |
| `eligibility_verified_pct` | One overwritable stamp per subscriber until DATA-34 | `rpt_metric_values` `day_end` | daily | P3 |
| `ortho_active_patients`, `ortho_active_no_appointment_pct`, `ortho_patients_beyond_ecd_pct`, `ortho_remaining_to_bill_amount`, `ortho_installments_unposted_amount`, `ortho_missing_visit_patients`, `ortho_observation_patients` | Contract state is current | `rpt_metric_values` `month_end` | month end | P3 |
| `provider_income`, `cohort_collection_pct`, `days_to_payment` | Derived allocations change when a back-dated entry arrives | persisted allocations (DATA-26) frozen at period lock (DATA-29) | per lock | P2 |
| `production_goal` and the pacing metrics | Goals are edited | versioned goal rows (8.2) | on change | P3 |

| Rule | Detail |
|---|---|
| Writer | MET-12: after the nightly refresh of each office day (03 §9.2), one row per metric, period, office and organisation (`office_id` 0), with numerator and denominator for ratios, and per provider for provider-level metrics; office-group rows once REQ-09 adds the grain; idempotent on the grain |
| Frozen rows | `day_end`, `month_end` and `period_lock` rows are written once. A definition or settings change does not restate them; a row whose `metric_version` or `settings_version` differs from the current one is marked "definition changed" in the response |
| Reading | A point-in-time metric asked for a past `as_of` is served from the snapshot (`freshness[].source = snapshot`). Without a snapshot it is recomputed when its inputs are history (the A/R, patient-window and recall families) and flagged `recomputed`; otherwise the point is `not_available` with the date history starts |
| Trend | A trend of a state metric uses snapshots only; it never back-fills a guess |
| Volume | About 60 state metrics × (offices + groups + 1) × 365 days — a few hundred thousand rows a year for a 10-office organisation [I]; provider-level rows only at month end |

---

## 11. Work items

Sizes: S up to 2 days, M up to 1 week, L up to 2 weeks, XL more (brief §4). "Depends on" names `MET`, `DATA` (03 §12) and
`ENG` (02 §17) items.

| Id | Title | Phase | Size | Depends on | Acceptance check |
|---|---|---|---|---|---|
| MET-01 | Metric registry model, loader and lint (`app/analytics/metrics/model.py`, `registry/`, `lint.py`) | P0 | L | DATA-01, ENG-05 | Each lint rule of 1.9 fails the build when violated; `GET /analytics/metadata` returns the datasets, dimensions, measures and metrics of this document |
| MET-02 | Organisation metric settings: keys, validation, versioning, change log, legacy preset, settings service | P0 | M | DATA-02, REQ-11, REQ-12 (02 endpoints), REQ-15 (08 right) | Every key of section 3 round-trips through `GET` / `PUT /analytics/settings`; a write without the administration right is refused; any change of an `rpt_tenant_settings` key, code-group member or `transaction_codes` version bumps `metric_settings_version`, writes `metric_setting_changes` and an audit event, and changes the cache key; applying the preset writes the documented values and `hygiene_visit` rows as one change set |
| MET-03 | Code-group content and maintenance (seed of section 4, tenant override with copy of the shipped rows, yearly CDT procedure, data checks) | P0 | M | DATA-04, REQ-05, REQ-12, REQ-15 | All groups are seeded with dated rows; the `[I]` groups are signed off by the clinical lead; a first override keeps every past period's members; D9986 / D9987 carry `is_visit_code = false`; the "production not covered" and "non-CDT code matched by a default range" checks write `rpt_data_quality` rows |
| MET-04 | Class-to-bucket rules, named filters and base measures (2.1, 5.0.1, 5.0.2) with identities I-1 to I-12 | P0 | M | DATA-03, DATA-06 | Identities pass on the two-era fixture, which holds `AINSO`, `INS_WRITE_OFF`, `ATAX`, `AD900`, `AFEED` / `ACCNN`, `COLPY` and a transfer pair; a code without a class lands in `unclassified_adjustments`; a new dated version of a code moves only rows on or after its `valid_from` |
| MET-05 | P1 pack: every row with Ph = P1, the 21 slices and the 4 synonyms (production, collections, visits, hours, scheduled production, broken-appointment rates, hygiene reappointment, case acceptance, treatment reappointment, exams, audit counts) | P1 | L | MET-01 to MET-04, ENG-32, DATA-16, DATA-18, DATA-19, DATA-55, DATA-56, REQ-01, REQ-02 (or the interim builders of 2.1) | Every reference Main Dashboard row and every Provider Dashboard row returns a value or a documented `no_data` on the UAT database; totals equal `daily.production_report` and `daily.collection_report` for the same parameters (02 R5); I-11 holds on the hygienist fixture |
| MET-06 | Availability and caveat gating (`not_available`, `is_degraded` for D(n), caveats k1-k16, no variant substitution inside a trend) | P1 | M | DATA-02, DATA-57, MET-01, REQ-14 | A range before the first app-era row returns `not_available` with `history_starts_on` for app-era metrics and for an alias resolving to one; a migrated-only month of `net_production` is served with `is_degraded = true` and k1; caveats appear in `warnings[]` when migrated rows are read |
| MET-07 | Adapter map for the existing KPI endpoints (7.10) | P1 | S | MET-05, ENG-35 | The old fields return the mapped metric values; the release note lists each change of value |
| MET-08 | Glossary content (`description`, `glossary_md`, aliases) and the generated glossary page | P1 | S | MET-01 | Every active metric has both texts; hub search finds each legacy alias of sections 6-7 |
| MET-09 | Metric test harness: two-era golden fixtures, ratio and no-data properties, alias, synonym and slice identities, reconciliation with reports | P1 | M | ENG (PostgreSQL test tier), DATA-09 | The suite runs in CI on PostgreSQL; a deliberate change of a fixture formula fails at least one test |
| MET-26 | P2 production, revenue-mix and front-office pack (Ph = P2 rows of 5.1, 5.9 and 5.12: `writeoff_rate_pct`, estimated portions, `production_per_procedure`, `category_production_share_pct`, posted amounts, voids, back-dated entries, day-close compliance, undeposited payments) | P2 | M | MET-05, DATA-13, DATA-14, DATA-28, DATA-29 | Every Ph = P2 row of the three sections returns a value on the fixture; user slices carry class `user_activity`; counts equal the audit reports for the same parameters |
| MET-10 | Collections and A/R pack (allocation component, A/R family under both units, ageing, the three days-in-A/R variants, time-of-service, bad debt) | P2 | L | DATA-26, DATA-27, DATA-30 | I-4 to I-6 hold organisation-wide under both units and I-4 per office under unit `account_office`; doctor + hygiene + other collections equal `gross_collections` on the transaction basis under the allocation attribution (I-3, I-12); `ar_aging_amount` equals the totals of `monthly.aging_report` for the same unit |
| MET-11 | Insurance and revenue-cycle pack | P2 | M | DATA-21, DATA-31, DATA-32 | `outstanding_claims_amount` equals the all-tier total of `insurance.outstanding_claims`; `unbilled_production_amount` equals the primary-tier total of `insurance.claims_not_created`; proxies are labelled as proxies in the glossary |
| MET-12 | Snapshot writer for state metrics (`day_end`, `month_end`, `period_lock` rows of `rpt_metric_values`) | P2 | L | DATA-30, MET-05, REQ-09 (group rows only) | After one nightly run a row exists per metric of section 10, scope and day, with numerator and denominator for ratios; a later edit leaves frozen rows unchanged; a trend query reads snapshots |
| MET-13 | Scheduling and capacity pack (utilisation, notice-based rates, recovery, confirmations, lead time, reappointment variants) | P3 | L | DATA-16, DATA-17, DATA-55 | I-7 holds; utilisation equals a hand-worked week for one provider; an unconfigured office renders "schedule not configured"; the four cancellation and no-show variants equal their hand counts |
| MET-14 | Hygiene and recare pack (the remaining reappointment variants, recall, retention cohorts, perio, adjunctive) | P3 | L | DATA-41, MET-03 | The four variants return four different values on the fixture and each equals its hand count; a patient who moved from D1110 to D4910 is judged on the D4910 row; inactive and collection accounts are not counted |
| MET-15 | Case acceptance and treatment pack (Ph = P3 rows of 5.6) | P3 | M | DATA-56, MET-05 | I-8 holds; unit and window behave as 2.9 on a fixture with late and undated acceptance; cohorts younger than the window are `is_provisional` |
| MET-16 | Patients pack (lifecycle, attrition, growth, retention) | P3 | M | DATA-19 | On the fixture, new + reactivated − lost explains the change of `active_patients` between two dates, flag changes aside; a later return does not change the losses of an earlier period |
| MET-17 | Goals: resolution, office-level rows, pacing metrics, auto-seed job | P3 | L | DATA-24, DATA-55, 06 | The edge cases of 8.4 return the documented results; an office goal equals its office row or the sum of its provider goals; a goal edit keeps the previous version |
| MET-18 | Clinical mix, marketing and referral, ortho packs | P3 | M | DATA-23, DATA-40, DATA-42 | Every row returns a value on a fixture holding one lab case, one referral source and one ortho contract |
| MET-19 | Front-office and audit pack, P3 rows (appointments created, follow-up completion) | P3 | S | MET-26, DATA-17 | User slices carry class `user_activity`; `appointments_created` by user equals the Appointment Detail by User report |
| MET-20 | Legacy preset parity tests against section 7 | P3 | M | MET-02, MET-13 to MET-15 | With the preset applied, every formula of 7.1-7.8 not marked fixed reproduces a hand-computed fixture value |
| MET-21 | Targets, bands and benchmark reference data (`metric_targets`, `metric_benchmarks` with `required_settings`, resolution order, display rule) | P4 | M | MET-01, 06, REQ-12, REQ-15 | A benchmark is returned only for the key and setting values it belongs to; overlapping or mis-ordered bands are rejected on save |
| MET-22 | Roll-up source declarations for additive components (5.0.2) | P4 | M | DATA-47, ENG-50, REQ-04, REQ-07 | The same query returns identical values from roll-ups and from live datasets (R-16), the two adjustment measures included |
| MET-27 | P4 analytics pack (Ph = P4 rows outside 5.13: volatility, day-of-week index, start-of-day scheduled production, actual versus scheduled, acceptance-completion gap, patient value, new patients per doctor, hygienist production to wages, cost per new patient) | P4 | M | MET-05, DATA-48, MET-21 | Every row returns a value or its documented `not_available` on the fixture |
| MET-23 | Multi-office metrics and transforms (same-store, rank, percentile, dispersion, waterfall, health score) | P4 | L | MET-10, MET-21, ENG-51 | The comparable-office rule excludes a newly opened fixture office; ranks skip members below their minimum denominator |
| MET-24 | Custom KPI definitions (organisation formulas over base measures and metrics) | P5 | M | MET-01, ENG-53 | A custom ratio validates, is versioned per organisation and obeys the data classes of its components |
| MET-25 | Assistant grounding: aliases, example questions and dimension phrases per metric (PD-14) | P5 | S | MET-08, ENG-55 | The assistant resolves each alias to its key and cites the definition and settings versions it used |

---

## 12. Risks and open decisions

### 12.1 Risks

| # | Risk | Effect | Mitigation |
|---|---|---|---|
| 1 | A settings or code-group change restates every live figure | Users see history move | Administration right (REQ-15), change log, "definition changed" marker, frozen month-end rows (section 10), a before-and-after preview on the last three months before saving (MET-02) |
| 2 | Defaults differ from the legacy analytics product (collection % base, case acceptance cohort, reappointment basis, active window) | Mismatch tickets after migration | The preset, the difference column of section 7, the glossary, and a side-by-side variant on every alias |
| 3 | Code groups marked [I] are wrong for a practice | Hygiene, exam and treatment metrics shift | Clinical sign-off in MET-03; versioned rows; tenant override; the "production not covered" check |
| 4 | The class seed of the 46 adjustment codes is partly inferred (03 risk 7, O-2) | Net production or net collections misstated | One class-to-bucket table (2.1) read by every formula; `unclassified_adjustments` always visible; D-1 and D-8 |
| 5 | App-era-only metrics are empty for a newly migrated organisation; the net family is degraded for history | Empty tiles for case acceptance, at-visit reappointment, confirmations; history that does not match the legacy net figures | `not_available` with "history starts on" and the history-capable variant shown beside it under its own name; `is_degraded` with k1 for D(12) rows; never a zero and never a silent change of definition inside a trend |
| 6 | Appointment-based metrics depend on booking discipline (lines missing, appointment type unknown) | Scheduled production and hygiene-appointment tests understate | Share of appointments without lines shown beside scheduled production; DATA-43 `appointment_type_id`; `hygiene_appointment_rule` |
| 7 | State metrics have no trend unless snapshots start early | Empty trend charts in P3-P4 | MET-12 in P2; REQ-10 to start the scheduled-production snapshot before P4 |
| 8 | Size of the catalog | Build and test load | Packs by phase; the P1 pack is the reference dashboards only; lint and identities catch drift |
| 9 | A benchmark is shown beside a metric computed differently | Wrong conclusions | Fixed-definition keys for every alternative event or population, `required_settings` and `comparability` gate the display (9.1) |
| 10 | Distinct counts and look-ahead builders on live datasets against the 5 s statement budget (02 §10.1) | Slow or failed tiles before roll-ups | Patient-grain summary (DATA-48); cohort metrics precomputed nightly into `rpt_metric_values`; background evaluation for 12-month cohort grids |
| 11 | Provider collections change attribution between P1 (`payment_provider`) and P2 (`allocation`) | A provider's number moves | The attribution is printed; both remain selectable; release note |
| 12 | Goals and utilisation rest on schedules that nobody configured (k10) | No pacing, wrong utilisation | Entered working days on the goal row; fallbacks; "schedule not configured" state |
| 13 | The migrated ledger is incomplete until DATA-57 (k14) | Low production and A/R for history; credit balances the legacy system never showed | Blanket caveat with the measured gap; MET-06 depends on DATA-57; the legacy parity tests (MET-20) run only after R-21 passes or is waived |

### 12.2 Open decisions

| # | Decision | Default used in this document | Owner |
|---|---|---|---|
| D-1 | Net production and collection % bases: denominator of `collection_pct` before or after bad debt; dating of production adjustments (transaction date, linked service date, claim estimate) | Before bad debt; transaction date | product owner + accountant (with 03 O-2) |
| D-2 | Case acceptance default: dollars within 30 days, dollars same day, or plans to date | Dollars within 30 days; plans to date under the legacy preset | product owner |
| D-3 | Hygiene reappointment default and the hygiene-appointment test before `appointment_type_id` | Booked at the visit; `code_or_hygienist`; migrated-only periods `not_available` (no substitution) | clinical lead |
| D-4 | Who is credited with hygiene production (PD-7) and whether compensation metrics follow a different rule | `hygienist` when recorded, carried to linked write-offs, allocations and provider visits; `dual` available | product owner |
| D-5 | New-patient basis and office: first-visit office (this document) or home office (03 §5.1, legacy Executive Summary) | First visit; first-visit office for dashboards, home office in the legacy report | product owner |
| D-6 | Working-day basis and clinical-hours source | `hybrid`; `booked` | product owner |
| D-7 | **Challenge to the phase skeleton (brief §6).** (a) The Morning Huddle (P3) needs goal and pacing metrics, which the brief lists under P4. (b) Snapshot capture must start in P2 so that state trends exist when the P3-P4 views arrive | Goals and pacing in P3 (MET-17); capture in P2 (MET-12). The reference dashboards' case acceptance and treatment reappointment rows are served in P1 on DATA-56 | roadmap owner |
| D-8 | **Resolution of 03 O-10 / PD-3 wording, aligned with 03 O-2.** Three collection levels with refunds counted once; buckets by class first: the insurance write-off (`AINSO`, `INS_WRITE_OFF`) is a production adjustment whatever its side; `sales_tax`, `contract_movement`, `capitation_writeoff` (`AD900`) and `opening_balance` are outside both nets; `COLPY` is not a collection | As stated in 2.1-2.2 | accountant |
| D-9 | Published benchmarks inside the product: attribution or permission needed for vendor figures; shown by default or opt-in | Stored as reference data; `show_external_benchmarks` off until cleared; our default bands stay on | product owner + counsel |
| D-10 | "Treatment Reappointment (%)" has no public definition | The working definition of 5.6 | product owner |
| D-11 | The metric API additions (REQ-12 to REQ-14) and the administration right (REQ-15) are not yet in 02 and 08 | Built behind `reports_administer` until 08 adopts `analytics_metric_settings_manage`; MET-02, MET-03 and MET-21 depend on them | architecture owner (02) + security owner (08) |

### 12.3 Requests to other documents

| Id | To | Request | Needed by |
|---|---|---|---|
| REQ-01 | 03 | `linked_provider_id`, `linked_hygienist_id` on the adjustment legs of `rpt_ledger_entries` (provider and hygienist of the charge named by `procedure_id`); until then the builder `ledger_adjustments_credited` joins `rpt_charges` on `charge_id` | MET-05 |
| REQ-02 | 03 | `provider_role` (`treating` · `credited`) on `rpt_provider_visits`, with the hygienist as a second provider row of the visit, and the same role in `rpt_daily_provider_visits`; until then the builder `credited_provider_visits` | MET-05 |
| REQ-03 | 03 | `created_date` (office-local date of `appointment_procedures.created_at`) on `rpt_appointment_procedures` | `same_day_treatment_amount` (P3 refinement) |
| REQ-04 | 03 | A transaction-date basis (`credit_transaction_date`) in the grain of `rpt_daily_allocated_collections`; until then the transaction-basis allocation slices are live-only | MET-22 |
| REQ-05 | 03 | DATA-04 seeds `is_visit_code = false` for D9986 and D9987 | MET-03 |
| REQ-06 | 03 | `first_visit_provider_id` on `rpt_patient_activity`; until then `rpt_visits.primary_provider_id` of the first visit | `new_patients_first_visit` by provider |
| REQ-07 | 03 | `rpt_daily_visits.new_patient_visit_count` counted once per patient (the first-visit office only) | MET-22 |
| REQ-08 | 03 | §11.2 cites the keys chosen in 6.1-6.2: M13 `office_open_hours` (with `booked_hours` added), P4 `appointments_booked`, P6 `provider_scheduled_hours`, P9 `production_per_hour` with its hours source | MET-05 |
| REQ-09 | 03 | An office-group grain in `rpt_metric_values` (group rows of distinct-count state metrics) | MET-12 |
| REQ-10 | 03 | Start the scheduled-production snapshot (DATA-48) in P2-P3 instead of P4 | MET-27 |
| REQ-11 | 02, 03 | One settings service through which every write to `rpt_tenant_settings`, tenant code-group rows and `transaction_codes` versions passes, so that `metric_settings_version` is bumped on each | MET-02 |
| REQ-12 | 02 | Endpoints `GET` / `PUT /analytics/settings`, `GET` / `PUT /analytics/code-groups/{group_key}`, `GET /analytics/benchmarks` in the API table (#54-64) | MET-02, MET-03, MET-21 |
| REQ-13 | 02 | `MetricQueryRequest` accepts `office_attribution`, `provider_attribution` and the windows `next_working_day`, `second_working_day` | MET-05, MET-13 |
| REQ-14 | 02 | The response carries per metric `resolved_metric_key`, `resolved_settings{}`, and per point `is_provisional`, `is_degraded`, plus the warning codes of this document (`low_denominator`, `accepted_undated_amount`, `claims_unknown_quality_count`, `providers_without_goal`, `overbooked`, caveats) | MET-06 |
| REQ-15 | 08 | Right `analytics_metric_settings_manage` (settings, code groups, targets, benchmark visibility), with an audit event per change | MET-02, MET-03, MET-21 |
| REQ-16 | 04 | The `date_basis` vocabulary accepts `submitted_date`, `first_paid_date`, `allocation_date`, `work_date`, `calendar_date`, `business_date`, `sent_date`, `note_date`, `action_date`, `debond_date` and `ortho_start_date` as a basis; `diagnosed_date` binds to `rpt_treatment_item_facts.presented_date`; a visit is dated by `service_date` | MET-01 |

Assumed without a request: 03 delivers `provider_production_goals` with the columns of 8.2 (DATA-24, P1, provider and
office-level rows); `rpt_ledger_entries_all` exposes the void stamp after DATA-14; passthrough datasets exist for
`booking_requests`, `user_time_clock_config` and `office_day_closes`; the class vocabulary keeps `capitation_payment`,
`payment_reversal`, `contract_movement`, `opening_balance`. 06 owns which metrics each dashboard shows, goal entry and the
`/analytics/goals` payload over the tables of 8.2, the worklist action log behind `follow_up_completion_pct` and alert
rules on `metric_targets`. 08 owns the grants for the classes of 1.6 and the provider-ranking visibility rule.
`catalog/*.md` owns the final `report_key`s of the drill targets and `reconciles_with` entries. `12_roadmap.md` settles
D-7.
