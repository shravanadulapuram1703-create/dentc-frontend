## Domain: Multi-office, executive, marketing, staff and control

## Office comparison and same-store growth - `analytics.office_comparison`

enterprise - P4 - L - `analytics_office_comparison_view` (+ `office_scope_view_all_offices` for `all`) - interactive on roll-ups (background on live views above 13 months or the engine limits) - READY (k1 on net production; office groups only once created; goal column needs DATA-24; `rcm` pack inherits SCHEMA(26), SCHEMA(30) of its metrics)

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
| `rcm` | `net_collection_pct`, `ar_days`, `ar_over_90_pct`, `otc_collection_pct`, `bad_debt_rate_pct`, `claim_days_to_payment`, `same_day_claim_rate_pct`, `denial_rate_pct` (proxy), `rcm_health_score` |
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
| `metric_label` | Metric | text | `aggregate` | pivot column label (key `metric_key`) |
| `value` | Value | per metric (`money`, `percent`, `decimal`, `integer`) | `financial_practice` for money and money-based rates; `aggregate` otherwise | recomputed by the metric service (not additive) |
| `compare_value` | PY / PP | as `value` | as `value` | recomputed |
| `change_pct` | Change | percent | as `value` | `difference(value, compare_value)` ÷ `compare_value` (points for rates) |
| `rank` | Rank | integer | `aggregate` | none (`Unranked` when below the volume guard) |
| `rank_change` | Movement | integer | `aggregate` | `rank_prev - rank` |
| `vs_median` | vs median | as `value` | as `value` | `difference(value, median_value)` |
| `vs_top_quartile` | vs top quartile | as `value` | as `value` | `difference(value, top_quartile_value)` |
| `band` | Band | enum | `aggregate` | from `metric_targets` (MET-21), `none` without one |
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

## Goal attainment and pacing - `analytics.goal_attainment`

enterprise - P3 - M - `analytics_goals_view` - interactive - APP (goals exist only once entered, DATA-24, MET-17; production side READY, k1)

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
| `pace_status` | Pace | enum | `aggregate` | `behind` / `on_pace` / `ahead` from bands on `production_vs_goal_pct` |
| `working_days_elapsed`, `working_days_remaining` | Days done / left | decimal | `aggregate` | sum (office-days above one office) |
| `needed_per_day` | Needed per day | money | as money | recomputed (`daily_avg_needed_to_goal`) |
| `avg_per_day_to_date` | Average per day | money | as money | ratio(`production_to_date`, `working_days_elapsed`) |
| `scheduled_remaining` | Scheduled to month end | money | as money | sum |
| `forecast` | Forecast | money | as money | sum (`production_forecast`) |
| `forecast_gap` | Forecast vs goal | money | as money | `difference(forecast, month_goal)` |
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

enterprise - P3 (cost columns P4) - M - `reports_referral_reports_screen_view_only` - background (cohort report) - SCHEMA(40) for app-era patients (migrated links H); cost and return on spend need NEW `marketing_spend` (P4)

### Purpose

Owner and marketing lead, quarterly and before every budget decision: which sources (referring doctors, patients,
campaigns, online) bring patients who show up, stay and pay, and what each new patient costs. Actions: move spend between
channels, thank or visit high-value referring doctors, stop a campaign whose patients never return, chase the front desk
when the source is not recorded.

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `referral.referral_production_list` (production of referred patients for a range) | Cohorts by first-visit month; conversion from new patient to kept first visit and to a second visit; production and collections of the cohort over fixed 12- and 24-month windows (comparable across sources); missing-source share; referral cost per source, cost per new patient and return on spend once spend is entered |

Called for by: CT D-14, I-41 (matchback, referral-source scorecards); KPI §3.10 MKT-05..MKT-08; DSO §14.4 (scorecard rows =
referral sources); 06 §2.12 "Value by source", "Cost per new patient" (no drill target in 06; header drill table chose
this key).

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Office of the first visit (`rpt_visits.office_id`) |
| `date_range` | `date_range` | `trailing_12_months` | Cohort date = the patient's new-patient date per the organisation basis (05 §2.4); the value windows run from that date |
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
| `rpt_patient_dim` | `first_visit_date`, `home_office_id`, `referred_by_raw`, `created_at_reliable` |
| `rpt_visits` | first and second visit dates and office per patient |
| `rpt_appointment_facts` | first appointment and `is_kept` for patients booked but not yet seen |
| `rpt_charges`, `rpt_ledger_entries` | production (`ledger_bucket` production / production adjustments) and collections (`collection`, `collection_adjustment`) of the cohort patients, by `patient_id`, inside the window |
| `referrals` (passthrough, DATA-45) | `cost` (no period: printed as "recorded cost", not a period spend) |
| `marketing_spend` (NEW, 05 §5.10 request; owner 03) | `source_id` or `campaign_code`, `office_id`, `period_month`, `amount`, `entered_by` |

Calculation: cohort = patients whose new-patient date falls in the range; source = their inbound source (none →
`Source not recorded`, the residual row). Kept first visit = a first visit exists within 90 days of the cohort date (or
the cohort date is itself the visit, by basis). Second visit within 12 months = NEW measure. Value 12 / 24 = Σ value of
the patient's legs with service (or allocation) date in [cohort date, cohort date + N months). A cohort younger than N
months is `provisional` and excluded from the return columns. Cost per new patient = spend of the source's periods in the
range ÷ new patients of the source; return on spend = (value − spend) ÷ spend (`cost_per_new_patient`, 05 §5.10).

```
c  := SELECT p.patient_id, np.new_patient_date, f.referral_source_id, f.source_category, v.office_id
      FROM new_patient_dates(:tenant_id, :basis) np JOIN rpt_patient_dim p USING (patient_id)
      LEFT JOIN rpt_referral_facts f ON f.patient_id = p.patient_id AND f.referral_kind = 'inbound_source'
      JOIN LATERAL (SELECT office_id FROM rpt_visits WHERE patient_id = p.patient_id ORDER BY visit_date LIMIT 1) v ON true
      WHERE np.new_patient_date BETWEEN :date_from AND :date_to
val := SELECT c.patient_id, sum(e.amount) FILTER (WHERE e.service_date_effective < c.new_patient_date + interval '12 months') ...
       FROM c JOIN rpt_ledger_entries e ON e.patient_id = c.patient_id AND e.ledger_bucket IN (<basis buckets>)
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
| `new_patients` | New patients | integer | `aggregate` | sum |
| `new_patient_share_pct` | Share | percent | `aggregate` | `share_of_parent(new_patients)` |
| `first_visit_kept_pct` | First visit kept | percent | `aggregate` | ratio; NEW measure (05 §5.10) |
| `second_visit_12m_pct` | Second visit in 12 months | percent | `aggregate` | ratio of mature cohorts; NEW measure (05 §5.7) |
| `value_12m`, `value_24m` | Value 12 / 24 months | money | `financial_practice` | sum of mature cohorts |
| `value_per_new_patient` | Value per new patient | money | `financial_practice` | ratio(`value_12m`, mature `new_patients`) |
| `recorded_cost` | Recorded referral cost | money | `financial_practice` | sum (`referrals.cost`, undated) |
| `spend` | Marketing spend | money | `financial_practice` | sum (P4) |
| `cost_per_new_patient` | Cost per new patient | money | `financial_practice` | ratio(`spend`, `new_patients`) |
| `return_on_spend` | Return on spend | decimal | `financial_practice` | ratio(`value_12m` − `spend`, `spend`) |
| `mature_share_pct` | Mature cohorts | percent | `aggregate` | share of new patients whose window has elapsed |

Grouping: fixed outer office band when multi-office; level 1 `group_by`; grand total; residual rows `Source not recorded`
and `Other` (top 25 + other). `cohort`: `shape = matrix`, rows source, columns first-visit month, value `value_12m` or
`new_patients`. `detail`: patient rows (`patient_name`, `chart_no`, `new_patient_date`, first and second visit,
`value_12m`, `value_24m`) - `phi_identified`, money `financial_patient`. Summary cards: `new_patients`,
`new_patients_missing_source_pct`, `patient_referral_share_pct`, `referral_source_production`, `cost_per_new_patient`.
`reconciles_with`: `new_patients`, `new_patients_missing_source_pct`.

### Visuals and drill-through

| Visual | Encoding |
|---|---|
| Bubble or bars | Sources: x = new patients, y = value per new patient (bars fallback); `Source not recorded` always shown |
| Cohort heat | Source x cohort month, value 12 months |

| Click | Target |
|---|---|
| `new_patients` | `detail` rows (`kind = rows`); legacy print: `referral.referral_summary_report` |
| `value_12m` | `referral.referral_production_list` (`referred_from_ids`, patients of the cohort) |
| `Source not recorded` | `management.data_quality_exceptions` (`check_keys = ['new_patient_missing_source']`) |
| Patient row | Patient overview (route key owned by 07) |

### Actions

Row action `open_source` (Referral Source setup, `navigate`). Bulk action `letters` on referring-doctor rows (thank-you
letter, handler of the correspondence feature, PD-15). Shipped view: "Last 12 months by source". Schedule: quarterly to the
owner. Not an alert source.

### Open questions

- Attribution when a patient has two sources (patient record and referral case): first touch (recommended) or last.
- Family value: count only the referred patient (proposed) or the whole guarantor account.
- `marketing_spend` entry: monthly per source and office, with an office-less "organisation" row; screen owned by 07.

## Online booking funnel - `analytics.online_booking_funnel`

enterprise - P3 - M - `reports_appointment_reports_screen_view_only` - interactive - APP (AppointNow is app-era only; `booking_requests` passthrough, DATA-45; booking source on appointments DATA-17)

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
| `booking_requests` (passthrough, DATA-45) | `id`, `office_id`, `status` (`pending`, `awaiting_payment`, `approved`, `declined`, `expired`), `reason_id`, `reason_label`, `is_emergency`, `is_new_patient`, `provider_id`, `slot_date`, `start_time`, `created_at`, `actioned_at`, `actioned_by`, `decline_reason`, `appointment_id`, `patient_id`, `requires_payment`, `payment_status`, `reschedule_count` |
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
| Waits for | DATA-45 passthrough; DATA-17 (`booking_source = appointnow_api` separately) |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `stage_label` | Stage | text | `aggregate` | label (fixed order) |
| `requests` | Requests | integer | `aggregate` | count at the stage |
| `stage_pct` | Of previous stage | percent | `aggregate` | ratio(stage, previous stage) |
| `of_received_pct` | Of received | percent | `aggregate` | ratio(stage, received) |
| `median_response_hours` | Median response | decimal | `aggregate` | recomputed median |
| `responded_in_1h_pct` | Answered within 1 hour | percent | `aggregate` | ratio |
| `median_lead_days` | Median lead time | decimal | `aggregate` | recomputed |
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

enterprise - P3 - M - `reports_appointment_reports_screen_view_only` - interactive - APP (SCHEMA(43) `rpt_communication_facts`; migrated texts heuristic)

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
| `delivery_rate_pct` | Delivered | percent | `aggregate` | ratio(`delivered`, `sent`) = `reminder_delivery_rate_pct` |
| `confirmation_rate_pct` | Confirmed | percent | `aggregate` | ratio(`confirmed`, `delivered`) = `reminder_confirmation_rate_pct` |
| `kept`, `no_show`, `cancelled` | Kept / No-show / Cancelled | integer | `aggregate` | sum (linked appointments) |
| `no_show_rate_pct` | No-show rate | percent | `aggregate` | ratio(`no_show`, linked appointments) |
| `booked_within_14d` | Booked within 14 days | integer | `aggregate` | sum (recall messages) |
| `recall_yield_pct` | Recall yield | percent | `aggregate` | ratio = `recall_outreach_yield_pct` |
| `not_sent` | Not sent (gateway) | integer | `aggregate` | sum |

`outcomes` format: rows `confirmed` / `unconfirmed`, columns `appointments`, `kept`, `no_show_rate_pct`,
`cancellation_rate_pct`. `campaigns`: rows `campaign_code` (name from `campaigns`), `appointments`, `kept`, `value`
(`financial_practice`). `contacts`: patient rows with `reason` (`failed_last_message`, `opted_out`, `no_contact`),
`next_appointment_date` - `phi_identified`. Summary cards: `reminder_delivery_rate_pct`,
`reminder_confirmation_rate_pct`, `confirmation_rate_pct`, `recall_outreach_yield_pct`, `campaign_appointments`.
`reconciles_with`: the same five.

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

enterprise - P4 - M - any of the worklist families (`recall`, `treatment_plan`, `insurance`, `monthly`, `appointment`, `daily`) - interactive - APP (`worklist_followups`, `worklist_events`, DASH-29; nothing before the first sync)

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
| `median_days_to_resolve` | Days to resolve | decimal | as above | recomputed |
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

enterprise - P4 - M - `reports_management_reports_screen_view_only` (+ class `payroll_time`; wage ratio `payroll_wage`) - interactive (background above 13 months) - READY for hours and output (k1, k6); wage ratio APP with today's pay rate only

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
"Wages", §2.1 "Clocked hours".

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | `rpt_time_clock.office_id` for hours; office of service for production; legacy punches with NULL office form `Office not recorded` |
| `date_range` | `date_range` | `last_month` | Hours by `work_date`; production by service date; collections by transaction date |
| `compare_to` | `enum` | `previous_period` | |
| `time_grain` | `enum` | `none` | `day`, `week`, `month` |
| `user_ids` | `entity_multi` | `all` | Forced to the caller without class `payroll_time` (UR-2, `self_unless_privileged`) |
| `report_format` | `enum` | `summary` | `summary` (office x role), `office_days` (office-day rows), `providers` (provider-linked users), `wage_ratio` (hygienists) |
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
| `patient_visits` | Visits | integer | `aggregate` | recomputed from `rpt_visits` |
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

enterprise - P2 - S - `reports_management_reports_screen_view_only` (+ class `payroll_time`) - interactive - READY (punch tests H); edit history APP (`time_clock_entry_edits`)

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
| `pay_period_grain` | `enum` | per `time_clock_settings` | NEW in 04 (requested by `management.provider_pay_basis`): `week`, `two_weeks`, `half_month`, `month` |
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
| `time_clock_entry_edits` (passthrough, DATA-45) | `entry_id`, `action`, `edited_by`, `edited_at`, `edit_reason`, `original_clock_in`, `original_clock_out`, `new_clock_in`, `new_clock_out` |
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

enterprise - P1 - M - `reports_audit_reports_view_only` (key class `user_activity`) - interactive - APP (engine audit `report_audit_events` from go-live; nothing earlier)

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
| `user_label` | User | text | `user_activity` | count distinct |
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

enterprise - P2 - S - `reports_audit_reports_view_only` (classes `phi_identified`, `user_activity`) - background (index search, 02 §15.6) - APP (`report_audit_patient_index` from SEC-29)

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
| `patient_label` | Patient | text | `phi_identified` | header block (key column) |
| `occurred_at` | When | datetime | `user_activity` | none |
| `user_label` | User | text | `user_activity` | count distinct |
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

No actions. No shipped view or schedule: a saved view or schedule would store a patient id in configuration (see open
questions).

### Open questions

- The header makes every report `schedulable = true`; for this single-patient report `schedulable = false` is proposed
  (challenge to the header, decision for 08), because a stored `patient_ids` value is PHI in a schedule row.
- Whether to include `report.view` events of runs the user only listed, not opened (no row read): proposed no - only
  `report.view` with rows read and `report.run` by the requester.

## Transaction exceptions - `management.transaction_exceptions`

enterprise - P2 to P4 - L - `reports_audit_reports_view_only` (classes `user_activity`, `financial_patient`) - interactive - SCHEMA(14) (void stamps), SCHEMA(13) (back-dating), SCHEMA(29) (post-close); `fee_overrides` exact only with the NEW fee-schedule stamp (P4)

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
| `fee_overrides` | service date | production charges whose `charged_fee` differs from `rpt_fee_schedule_fees` for the patient's fee schedule on the service date (`fee_above_office_fee`, below-schedule lines) | P2 with today's patient fee schedule (labelled `current_fee_schedule`, k12); exact with NEW `patient_procedures.fee_schedule_id` stamp (P4) |
| `after_hours` | keyed time | money entries and voids keyed before the office's open time or after its close (± tolerance) or on closed days | P2; app rows (`created_at_reliable`) only |

### Data

| Dataset | Columns |
|---|---|
| `rpt_ledger_entries_all` | `entry_id`, `entry_type`, `ledger_bucket`, `txn_class`, `code`, `amount`, `service_date_effective`, `transaction_date`, `created_date`, `created_at_utc`, `created_at_reliable`, `office_id`, `posting_office_id`, `patient_id`, `account_id`, `procedure_id`, `user_key`, `is_void`, `era`; after DATA-14 `voided_at`, `voided_by`, `void_reason` (NEW columns requested on the view) |
| `rpt_audit_events` (DATA-36) | `event_id`, `occurred_at_utc`, `user_id`, `office_id`, `patient_id`, `audit_type`, `module_type`, `resource_type`, `resource_id`, `original_amount`, `updated_amount`, `original_patient_amount`, `original_insurance_amount`, `updated_patient_amount`, `updated_insurance_amount`, `original_date`, `updated_date` |
| `office_day_closes`, `financial_period_locks` (DATA-29, passthrough) | office, business date, `closed_at`, `closed_by`, reopen and override rows |
| `rpt_charges`, `rpt_fee_schedule_fees` (DATA-51), `rpt_patient_dim.fee_schedule_id` | fee in force |
| `rpt_visits`, `rpt_office_calendar_days()` (NEW `open_time`, `close_time`) | seen-in-month test; office hours |
| `rpt_user_dim` | `user_label`, `is_legacy_login` |

```
-- post_close
SELECT e.*, c.closed_at, c.closed_by FROM rpt_ledger_entries_all e
JOIN office_day_closes c ON c.office_id = e.office_id AND c.business_date >= e.transaction_date AND c.is_current_close
WHERE e.posted_at > c.closed_at AND e.posted_at::date BETWEEN :date_from AND :date_to
-- fee_overrides
SELECT ch.*, f.patient_fee AS schedule_fee, ch.charged_fee - f.patient_fee AS fee_difference
FROM rpt_charges ch JOIN rpt_patient_dim p USING (tenant_id, patient_id)
JOIN LATERAL (SELECT patient_fee FROM rpt_fee_schedule_fees WHERE fee_schedule_id = p.fee_schedule_id AND procedure_code = ch.procedure_code
              AND ch.service_date BETWEEN valid_from AND coalesce(valid_to, 'infinity') ORDER BY valid_from DESC LIMIT 1) f ON true
WHERE ch.is_production AND ch.charged_fee <> f.patient_fee AND ch.service_date BETWEEN :date_from AND :date_to
```

| Era | What works |
|---|---|
| Migrated history | Voided rows (count, amount; no who or when); fee comparison (H, current fee schedule); adjustments unclassified (k1) and their user only as legacy login (k6). No audit events before go-live |
| App era | All formats as their DATA items ship |
| Waits for | DATA-13, DATA-14 (P1), DATA-29 (P2), DATA-36 (P2); fee-schedule stamp on charges (NEW, P4) |

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

enterprise - P2 - M - `reports_audit_reports_view_only` (key class `user_activity`) - interactive (background above 92 days) - APP (writes from `audit_logs`, report events from go-live; reads are not audited)

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
| `patients_changed`, `patients_viewed_in_reports`, `patients_exported` | Distinct patients | integer | `user_activity` | recomputed distinct over the group |
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

enterprise - P2 - M - `reports_management_reports_screen_view_only` - interactive - READY (all checks on migrated rows; source check SCHEMA(40) for app patients)

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

enterprise - P1 - M - `reports_management_reports_screen_view_only` - interactive - READY (DATA-02 to DATA-05 checks; organisation-level)

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
`rpt_appointment_procedures`, `rpt_ledger_entries`, `rpt_insurance_coverage`, passthrough `insurance_carriers` (`payer_id`)
(DATA-45). Each check is a builder of the DATA-02 checker registry; `rpt_data_quality` holds the nightly count and the
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

enterprise - P2 - S - `reports_management_reports_screen_view_only` + `reports_runs_manage_all` - interactive - APP (engine tables from go-live; `report_runs` kept 400 days, longer counts from `report_audit_events`)

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
| `p50_ms`, `p95_ms` | Duration p50 / p95 | integer | `aggregate` | recomputed |
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

<!-- WORK-ITEMS -->
| RPT-NEW-70 | Office comparison and same-store growth (`analytics.office_comparison`): three formats, metric packs, comparator rows, rank movement, same-store set with exclusions | P4 | L | ENG-50, ENG-51, MET-23, MET-21, DATA-47, NEW pack registry (06), NEW parameters (04), office groups setup (06 §5.2) | Group and organisation rows equal the metric service for the same scope (never summed ratios); a newly opened office is excluded as `opened_too_recently` and named; weighted, simple and trimmed growth equal hand-computed fixture values; an office below `rate_min_denominator` is unranked; a caller with two assigned offices gets comparators over those two only |
| RPT-NEW-71 | Goal attainment and pacing (`analytics.goal_attainment`): month, year-to-date and detail formats over the goal resolver | P3 | M | DATA-24, MET-17, DATA-55, `analytics_goals_view` (SEC) | The 05 §8.4 edge cases render as specified (no goal → `No goal set`, goal met → needed 0, today excluded both sides); an office row uses its office goal row when one exists; a provider-restricted caller sees only the own row and no office total |
| RPT-NEW-72 | Referral and marketing source return (`referral.referral_source_return`) and the `marketing_spend` input (cost columns P4) | P3 | M | DATA-40, DATA-19, NEW `marketing_spend` (03, P4), NEW metrics (05 §5.7, §5.10) | New patients per source sum to `new_patients` with a `Source not recorded` row; a cohort younger than the window is provisional and outside the return; with spend entered, `cost_per_new_patient` equals the 05 metric |
| RPT-NEW-73 | Online booking funnel (`analytics.online_booking_funnel`) and the `booking_requests` passthrough | P3 | M | DATA-45, DATA-16, DATA-17 | Fixture: 10 requests (7 approved, 2 declined, 1 expired; 6 kept, 4 first visits) yield those stage counts; conversion equals `online_booking_conversion_pct`; a range before the first request renders `history starts on <date>` |
| RPT-NEW-74 | Reminder, confirmation and campaign effectiveness (`analytics.communication_effectiveness`) with NEW `delivery_status` | P3 | M | DATA-43, DATA-17, NEW column (03) | Delivery and confirmation rates equal `reminder_delivery_rate_pct`, `reminder_confirmation_rate_pct`; log-only `queued` messages count as `not_sent`, not undelivered; the confirmed / unconfirmed no-show split sums to all live past appointments |
| RPT-NEW-75 | Outreach results (`analytics.outreach_results`) over the follow-up tables | P4 | M | DASH-29, DASH-43, MET-19, NEW outreach metrics (05) | For a fixture campaign the realised value equals the fees booked inside the attribution window; completion equals `follow_up_completion_pct`; a team member sees only the own row; a worklist of a family the caller lacks is one `restricted` row |
| RPT-NEW-76 | Staff hours against production (`management.staff_productivity`) and the hygienist production-to-wage ratio | P4 | M | DATA-23, ENG-34, NEW `staff_role` vocabulary (03), NEW metric (05 §5.8) | Clocked hours equal `management.time_clock_report` for the same users and range; production per clocked hour is a ratio of sums at every level; without `payroll_wage` the wage columns and `wage_ratio` format are absent; past months print `current_rate` |
| RPT-NEW-77 | Time-clock exceptions (`management.time_clock_exceptions`) with `rpt_time_clock_all` and office open and close times | P2 | S | DATA-23, DATA-45 (`time_clock_entry_edits`), NEW columns (03), `pay_period_grain` (04) | Fixture punches produce exactly one row per exception type (auto-closed, edited by another user, deleted, closed day, outside hours, weekly overtime); a caller without `payroll_time` sees only own punches; an empty pay period skips delivery |
| RPT-NEW-78 | Report access log (`management.report_access_log`): `detail`, `export_summary`, `downloads_by_watermark` | P1 | M | SEC-08, SEC-20, ENG-10 | Each filter of 08 §6.8 #4 narrows the fixture events; an event of another office's run is hidden from a restricted viewer (S-14); a watermark lists its export and every download and print |
| RPT-NEW-79 | Patient report access (`management.patient_report_access`) with bulk-run list | P2 | S | SEC-29, SEC-28 | A fixture patient in 3 runs (one exported, one delivered) returns those events with `is_egress`; a run above 50,000 patients appears under "bulk runs to check"; the run writes its own audit event; span above 366 days is rejected |
| RPT-NEW-80 | Transaction exceptions (`management.transaction_exceptions`): seven formats and the summary, each gated on its data item | P2 | L | DATA-13, DATA-14, DATA-29, DATA-36, DATA-51, NEW fee-schedule stamp on charges (P4) | Counts equal `voided_entries_count`, `backdated_entries_count`; a payment voided after the day close is a `post_close` row; a charge at a fee other than the schedule in force is a `fee_overrides` row labelled `current_fee_schedule`; a format whose data item is missing renders `not_available` |
| RPT-NEW-81 | User activity review (`management.user_activity_review`) with baseline and time tests | P2 | M | DATA-36, SEC-29, NEW office hours columns (03), NEW baseline measure and settings (05) | A fixture user with a 4x-baseline day, an after-hours edit and a closed-day print gets exactly those three flags; distinct patients exported equal the index; a new user gets `no_baseline` |
| RPT-NEW-82 | Record data-quality exceptions (`management.data_quality_exceptions`) as DATA-02 checker builders | P2 | M | DATA-02, DATA-18, DATA-21, DATA-40 | Each check returns its fixture rows and its rate; the summary count of `unpriced_charge` equals `unpriced_charge_count` and of `new_patient_missing_source` the numerator of `new_patients_missing_source_pct`; a duplicate pair is listed once |
| RPT-NEW-83 | Setup integrity (`management.setup_integrity`) with fix-screen links | P1 | M | DATA-02, DATA-03, DATA-04, DATA-05, DATA-51, DATA-55 | Each of the 12 checks fires on its fixture defect and is quiet on a clean fixture; the unclassified amount equals `unclassified_adjustments`; every item row resolves a setup route key |
| RPT-NEW-84 | Report usage and health (`management.report_usage`) over engine tables | P2 | S | ENG-43, ENG-44, ENG-47, NEW internal passthroughs (02) | Runs, failures and p95 per report equal `GET /reports/stats` for the same window; a paused schedule shows its `paused_reason`; registered reports without runs appear as `Never run`; a caller without `reports_runs_manage_all` is refused |
<!-- /WORK-ITEMS -->
