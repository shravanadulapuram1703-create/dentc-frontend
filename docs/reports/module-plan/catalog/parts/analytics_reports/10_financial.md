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
- Closest legacy: `daily.production_analysis_report` - one date range, one cut, counts and fees per code. No period
  columns, no PY, no shares, no net basis, no payer.
- Also `daily.production_report` (`group_by` code / carrier): one range, no trend; stays the drill target for the rows.
- Called for by KPI §3.1 (PRD-01..04, PRD-10), §3.9 (mix); CT TS-1 ("by provider, office, procedure category/code and
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
- `rpt_charges` (`service_date`, `office_id`, `provider_id`, `procedure_code`, `code_category`, `office_fee`, `charged_fee`,
  `implied_writeoff`, `is_production`, `is_unpriced`, `primary_carrier_id`, `patient_id`, `entry_id`), `rpt_provider_dim`
  (`production_group`), `rpt_procedure_code_dim`, `rpt_insurance_coverage` (fallback carrier), `rpt_dates` (zero-fill).
- `rpt_ledger_entries` with `ledger_bucket = 'production_adjustment'` (`amount`, `procedure_id`, `provider_id`,
  `carrier_id`, `service_date_effective` or `transaction_date` per the 05 setting `production_adjustment_dating`).
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
- Migrated history: gross, charged, counts, category and code work (H, k3, k14). Net equals charged and the
  unclassified amount is shown beside it until DATA-12 (k1, REPAIR(12)). Carrier is today's coverage for every migrated
  row (k12); stamped payer from DATA-33 (SCHEMA(33)).

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
- Closest legacy: `daily.scheduled_production` - a forward look at booked fees; no start-of-day freeze, no comparison with
  what was produced. `daily.production_report` shows the produced side alone.
- Called for by KPI §3.1 PRD-12 / PRD-13 ("snapshot time of scheduled must be fixed (start of day)"); 06 §2.4 tile
  "Unplanned and schedule variance", §2.8 tile "Schedule accuracy" (drill target `daily.scheduled_production` is replaced
  by this report in the 06 drill map).

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
- `rpt_scheduled_production_snapshot` (DATA-48): rows with `snapshot_date = appointment_date` = the start-of-day book.
  Needs NEW appointment grain (`appointment_id`, `scheduled_fee`, `line_count` per appointment, request to 03 DATA-48) so
  that each start-of-day appointment can be followed to its outcome; the office x provider grain of today's design cannot
  separate "lost" from "moved".
- `rpt_appointment_facts` (`appointment_id`, `appointment_date`, `office_id`, `provider_id`, `status_class`, `is_kept`,
  `scheduled_fee`, `created_date`, `is_block`, `is_deleted`), `rpt_appointment_procedures`, `rpt_charges` (`service_date`,
  `charged_fee`, `is_planned`, `appointment_id`), `rpt_ledger_entries` (production adjustments for the net basis).
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
- Availability: nothing before the snapshot go-live (`history starts on <date>`, G(48)); migrated history never (no
  booked lines on 94 % of migrated appointments, k7). Booked fees are client snapshots, never re-priced.

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
- Closest legacy: `daily.collection_report` - one range, list or code grouping; no trend, no PY, no variants.
  `monthly.executive_summary` gives one month's gross collection without mix.
- Called for by KPI §3.2 COL-01..06, §2.8 (variant matrix); CT TS-1, I-38 ("collections analytics pack"); 06 §2.6 tiles
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
- `rpt_payments` (`amount`, `payer`, `tender_class`, `deposit_group`, `counts_as_collection`, `collection_class_quality`,
  `carrier_id`, `office_id`, `provider_id`, `transaction_date`, `payment_date`, `deposit_date`), `rpt_ledger_entries`
  (`ledger_bucket = 'collection_adjustment'`, `entry_type = 'refund'`), `rpt_payment_allocations` (provider by allocation,
  P2), `rpt_charges` / `rpt_ledger_entries` for the production denominators of the rate format.
- Calculation: `gross_collections`, `patient_collections`, `insurance_collections`, `collection_adjustments`, `refunds`,
  `net_collections`, `patient_collection_share_pct` per period x member. Rates format: `collection_pct` (resolved
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
- Migrated history: gross collections, payer split and office work (H, k11, k15, k16); tender only as cash / check / card /
  ach and code-level tender after DATA-12 (REPAIR(12)); collection adjustments and refunds are zero and net equals gross
  until DATA-12 (k1); carrier is NULL on every migrated payment and on app `patient_payments` rows until DATA-33
  (member `Carrier not recorded`); provider by allocation is derived for history (k4).

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `period_start` | Period | date | `aggregate` | label |
| `member_key`, `member_label` | Payer / carrier / tender / office / provider | text | `aggregate`; `provider_comp` by provider | label |
| `gross_collections` | Gross collections | money | `financial_practice` | sum |
| `patient_collections`, `insurance_collections` | Patient / insurance | money | `financial_practice` | sum |
| `collection_adjustments` | Collection adjustments | money | `financial_practice` | sum |
| `refunds` | Refunds | money | `financial_practice` | sum |
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
- Closest legacy: `monthly.waterfall_report` - collected to date by service month in one table; no lag distribution, no
  payer, carrier or provider split, no weighted days.
- Called for by KPI §3.2 COL-14 `days_to_payment` ("requires payment-to-procedure allocation"); DSO §14.6 ("payer mix with
  time to collect"); 06 §2.6 tile "Speed" (`days_to_payment` by `payer`) and "Collected to date by service month".

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
- `rpt_payment_allocations` rows with `credit_ledger_bucket = 'collection'` and `allocation_target = 'production'`:
  `amount`, `credit_transaction_date`, `service_date`, `payer`, `allocation_office_id`, `allocation_provider_id`,
  `credit_entry_id`, `is_derived`, `method`; carrier through `credit_entry_id` -> `rpt_ledger_entries.carrier_id`.
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
- Migrated history: every link is `derived_fifo` (oldest first; Denticon allocated at entry time), so lag by provider and
  service month is an estimate (k4, `is_derived`, printed); the incomplete migrated charge set makes derived allocation
  spend credits on the wrong charges (k14). Migrated insurance payments have no carrier (k11). Exact from DATA-26
  (persisted allocation at posting, SCHEMA(26)). A service month is `is_provisional` until 90 days after its end.

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
- Summary cards: `days_to_payment` (overall, patient, insurance), `collected_within_30_pct`, `lag_over_90_share_pct`.
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
- Closest legacy: `daily.special_transaction_report` - a transaction list by code for a range; no class roll-up, no rates,
  no carrier, no implied (fee-schedule) write-off.
- Called for by KPI §3.1 PRD-02 / PRD-04, §3.12 FRO-08; DSO §14.6 ("adjustments and write-offs by type, location and
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
- `rpt_adjustments` (`amount`, `entry_type`, `txn_class`, `txn_side`, `code`, `is_income`, `is_transfer`, `user_key`,
  `provider_id`, `carrier_id`, `procedure_id`, `office_id`, `transaction_date`, `linked_service_date`),
  `rpt_ledger_entries` (`ledger_bucket`), `rpt_charges` (`implied_writeoff`, `office_fee`, `charged_fee` for the implied
  class and the denominators), `rpt_transaction_code_dim`.
- NEW column `adjustment_report_class` on `rpt_transaction_code_dim` (from `rpt_value_map` domain
  `adjustment_report_class`, owned by 03; no code list in the definition): `contractual` (`contractual_writeoff` + the
  implied write-off of charges), `discretionary` (`discount`), `bad_debt` (`bad_debt`, `collection_agency`), `correction`
  (`charge_correction`), `refund` (`refund_patient`, `refund_insurance`, `refund_financing`, `payment_reversal`),
  `added_charge` (`finance_or_late_charge`, `nsf_fee`), `other` (`other_production`, `other_collection`), `unclassified`;
  `transfer`, `opening_balance`, `contract_movement`, `sales_tax`, `capitation_writeoff` form the block "not income"
  (shown, never in a rate).
- Rates: `writeoff_rate_pct`, `contractual_writeoff_rate_pct`, `bad_debt_rate_pct`, `provider_adjustment_rate_pct`;
  NEW `discount_rate_pct` (discretionary ÷ gross production) requested from 05. Amounts: `implied_writeoff`,
  `production_adjustments` by `txn_class`, `collection_adjustments`, `refunds`, `bad_debt_amount`,
  `adjustments_posted_amount` (by user), `unclassified_adjustments`.

```
adj := SELECT <member>, tc.adjustment_report_class AS cls, sum(a.amount) amt, count(*) n
       FROM rpt_adjustments a LEFT JOIN LATERAL (code version on a.transaction_date) tc ON true
       WHERE <range on basis column, scope, codes, users> GROUP BY ...
imp := SELECT <member>, 'contractual', -sum(c.implied_writeoff) FROM rpt_charges c WHERE c.is_production AND <service range>
den := gross_production, charged_production of the same scope (05 builders)
```
- Migrated history: every migrated adjustment is `unclassified` until DATA-12 (k1), so the class split, rates other than
  the implied write-off and bad debt are not available for migrated months (REPAIR(12)); carrier of explicit write-offs is
  app era only (remittance write-offs `rwo`); poster is the legacy login string (k6). Implied write-off works on history
  where an office fee was stored (k3).

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `adjustment_report_class` | Class | enum | `aggregate` | label |
| `member_key`, `member_label` | Code / provider / user / carrier | text | `aggregate`; `provider_comp` by provider; `user_activity` by user | label |
| `adjustment_amount` | Amount (signed, lowers production when negative) | money | `financial_practice` | sum |
| `adjustment_count` | Entries | integer | `aggregate` | sum |
| `share_of_class_pct` | Share of class | percent | `financial_practice` | share_of_parent |
| `rate_gross_pct` | Of office-fee production | percent | `financial_practice` | ratio |
| `rate_charged_pct` | Of charged production | percent | `financial_practice` | ratio |
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
- Closest legacy: `monthly.aging_report` and `monthly.aging_report_by_home_office` - one as-of date, account rows; no
  trend, no days in A/R, no bridge.
- Called for by KPI §2.8, §3.2 COL-07..11; CT TS-3, I-38; 06 §2.6 tile "A/R trend" (from snapshots), §2.1 receivables
  rows; replaces a separate DSO report (header "Candidates left out").

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | |
| `office_attribution` | `enum` NEW in 04 | `transaction_office` | `transaction_office` (unit `account_office`), `home_office` (unit `account`) |
| `date_range` | `date_range` | `trailing_12_months` | the month ends inside the range are the columns; fixed basis `as_of` |
| `compare_to` | `enum` | `previous_year` | same month end a year earlier |
| `time_grain` | `enum` | `month` | `month`, `quarter` (quarter ends) |
| `aging_bucket_set` | `enum` NEW | organisation setting | `legacy`, `legacy_extended`, `common` (03 bucket sets) |
| `aging_by` | `enum` | `account_ar` | `account_ar`, `patient_ar` (filter card §3.5) |
| `group_by`, `output_format` | §3.9 | `none`, `pdf` | `group_by`: `none`, `office` |
| `report_format` | `enum` | `summary` | `summary` (measures x month ends), `bridge` (A/R movement per month), `detail` (accounts at one month end) |

### Data
- Frozen month ends: `rpt_ar_snapshot` (`snapshot_kind IN ('month_end', 'period_lock')`, `attribution`, `office_id`,
  `bucket_set`, `bucket_key`, `open_amount`, `open_insurance_est`, `open_patient`, `account_count`) and
  `rpt_ar_snapshot_accounts` for the detail format.
- Month ends before the first snapshot: `rpt_ar_open_items(p_as_of = month end, p_unit)` recomputed from today's rows,
  labelled `recomputed` (later voids and back-dated entries rewrite them, claim status is today's).
- Flows for the bridge and the days-in-A/R denominators: `rpt_ledger_entries` by `ledger_bucket` on `transaction_date`
  (invariant I-2 of 05: opening + charged production + non-production charges + production adjustments + collection
  adjustments − gross collections + unclassified + other movements = closing).
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
- Migrated history: totals are right for both eras subject to the migrated-ledger completeness (k14, DATA-57); patient /
  insurance split is `unknown` without the claim backfill (split_quality footnote); the `ar_days` variants on net bases are
  degraded until DATA-12 (k1). Every recomputed month end of a tenant is a background run (about 2.7 M legs).

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `month_end` | Month end | date | `aggregate` | label |
| `source` | Frozen / recomputed | enum | `aggregate` | none |
| `total_ar`, `ar_debit_balance`, `credit_balances` | Net A/R / debits / credits | money | `financial_practice` | sum over offices; none over months |
| `bucket_<key>_amount` | One column per bucket of the set | money | `financial_practice` | sum over offices |
| `patient_ar`, `insurance_ar_estimated` | Patient / insurance (estimated) | money | `financial_practice` | sum over offices |
| `ar_over_90_amount`, `ar_over_90_pct` | Over 90 / share | money, percent | `financial_practice` | sum / ratio |
| `patient_ar_past_due_amount` | Patient past due | money | `financial_practice` | sum |
| `ar_days`, three variant columns | Days in A/R | decimal | `financial_practice` | ratio of components |
| `account_count` | Accounts with a balance | integer | `aggregate` | sum |
| bridge columns (bridge format) | Opening, production, adjustments, collections, other, closing, `difference` | money | `financial_practice` | sum over months for flows |

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

financial - P2 - M - `reports_management_reports_screen_view_only` - interactive - READY (k13)

### Purpose
Office manager and front-desk lead, weekly and at month end: how much of the estimated patient portion is collected on
the day of service, by office, provider, the user who posted the visit and weekday; how much was left uncollected, and
how much of that was recovered later and how fast. Drives desk coaching, pre-visit estimates and statement timing.

### Why it is new
- Closest legacy: `management.uncollected_copay` - a one-day list of patients who still owe after the visit; no rate, no
  trend, no user or weekday, no later recovery.
- Called for by KPI §3.2 COL-05, §3.12 FRO-05; DSO §14.6 (OTC collection rate); 06 §2.4 "Money at the desk", §2.6 "Time
  of service" (both drill to the legacy list today; the rate tiles drill here, the list stays the drill for one day).

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | office of the unit (account-office-day) |
| `date_range` | `date_range` | `last_month` | fixed `date_basis = service_date` |
| `compare_to` | `enum` | `previous_period` | |
| `time_grain` | `enum` | `month` | `day`, `week`, `month` |
| `provider_ids` | `entity_multi` | `all` | `provider_role = treating`; pro-rata split (below) |
| `user_ids` | `entity_multi` | `all` | user who posted the unit's charges (05 dimension U) |
| `report_format` | `enum` | `summary` | `summary`, `detail` (one row per unit) |
| `group_by`, `sort_by`, `output_format` | §3.9 | `none`, `rate_asc`, `pdf` | `group_by`: `none`, `office`, `provider`, `user`, `day_of_week` |
| `recovery_window_days` | `integer` NEW | 60 | horizon for "recovered later" |

### Data
- `rpt_charges` (`est_patient`, `account_id`, `office_id`, `service_date`, `provider_id`, `user_key`, `is_production`),
  `rpt_payments` (`payer = 'patient'`, `counts_as_collection`, `account_id`, `office_id`, `transaction_date`),
  `rpt_dates` (`day_of_week`), `rpt_user_dim`.
- Unit `u` = account-office-day with `est_u = Σ est_patient > 0` (05 `otc_collection_pct`). `pay_u` = patient collections
  of the account at that office from the service day through `otc_collection_window_days` (setting 34). Metrics
  `otc_collection_pct`, `uncollected_copay_amount`.
- Later recovery (NEW `uncollected_copay_recovered_amount`, `uncollected_copay_recovered_pct`, `uncollected_copay_recovery_days`
  requested from 05): patient collections of the account after the window up to `recovery_window_days`, capped at the
  unit's uncollected amount, oldest unit first when one account has several.
- By provider (NEW binding requested from 05, which today defines no P on this metric): a unit's `est_u`, `pay_u` and
  recovery are split pro rata to the provider shares of `est_patient` in the unit.

```
u   := SELECT account_id, office_id, service_date, sum(est_patient) est, array_agg(DISTINCT user_key) users
       FROM rpt_charges WHERE is_production AND service_date BETWEEN :from AND :to GROUP BY 1,2,3 HAVING sum(est_patient) > 0
pay := SELECT u.*, least(-sum(p.amount) FILTER (WHERE p.transaction_date <= u.service_date + :w), u.est) collected
       FROM u LEFT JOIN rpt_payments p ON p.account_id = u.account_id AND p.office_id = u.office_id
            AND p.payer = 'patient' AND p.counts_as_collection AND p.transaction_date >= u.service_date
rec := later patient payments (service_date + w, service_date + recovery_window] applied to uncollected, capped
```
- Migrated history: works (H) with the derived patient portion `charged_fee − est_insurance` (k13), which overstates the
  patient portion where insurance paid more than estimated; user is the legacy login string (k6). Prepayments before the
  service day are not counted as collected at the visit (they are payments on earlier days): footnote.

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
| `still_open_amount` | Still open after the window | money | `financial_practice` | sum |

- Grouping: office band; `group_by`; periods (matrix when `time_grain` spans several periods). Grand total.
- Detail: one row per unit (`service_date`, account, guarantor and patients `phi_identified`, estimate, collected,
  uncollected, recovered, recovery date, next appointment date; `financial_patient`), `row_id_column = unit_key`.
- Summary cards: `otc_collection_pct` (with the 80 / 95 band), `uncollected_copay_amount`,
  `uncollected_copay_recovered_pct`. `reconciles_with`: `otc_collection_pct`, `uncollected_copay_amount`.

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
- Closest legacy: `management.payment_plan_charges` (instalments due on one billing date) and
  `lists.patients_on_payment_plan` (roster by setup date). Neither has balances, paid amounts, delinquency or financing.
- Called for by KPI §3.2 (prepayments and plans as collection pitfalls), §3.11 (ortho contract money); CT I-37 (financial
  worklists); 06 §2.6 "Work queues" (`worklists.payment_plan_overdue` is the queue; this report is its analysis).

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
| `delinquency_grace_days` | `integer` NEW | 30 | a posted instalment with an open amount older than this is delinquent |

### Data
- `rpt_payment_plan_contracts` (`contract_kind`, `contract_key`, `patient_id`, `office_id`, `provider_id`, `setup_date`,
  `total_amount`, `pat_plan_amount`, `pat_amount_remaining`, `ins_amount_remaining`, `has_card_on_file`, `is_active`),
  `rpt_contract_installments` (`due_date`, `periodic_amount`, `is_billed`, `charge_id`, `plan_side`), `rpt_ortho_contracts`
  (`unbilled_amount`, `overdue_count`, `next_due_date`, `is_past_planned_end`).
- Paid per instalment: no payment-to-instalment link exists, so paid = allocations to the instalment's charge
  (`rpt_payment_allocations.debit_entry_id` = the charge's `entry_id`); open amount and age from `rpt_ar_open_items()` on
  that entry. Labelled `allocation derived` until DATA-26 (k4).
- Financing share: `rpt_payments` with `txn_class = 'financing_payment'` (or `tender_class = 'financing'`) against
  `patient_collections` of the range.
- Measures: `ortho_remaining_to_bill_amount`, `ortho_installments_unposted_amount` (05); NEW `payment_plan_contracts_active`,
  `payment_plan_remaining_amount`, `installments_due_amount`, `installments_posted_amount`, `installments_paid_amount`,
  `payment_plan_delinquent_pct`, `payment_plan_delinquent_days_avg`, `financing_collection_share_pct` requested from 05.

```
inst := SELECT i.*, ar.open_amount, ar.age_days FROM rpt_contract_installments i
        LEFT JOIN rpt_ar_open_items(:t, :offices, :as_of, 'account') ar ON ar.entry_id = 'chg:' || i.charge_id
k    := SELECT contract_key, sum(periodic_amount) FILTER (WHERE due_date BETWEEN :from AND :to) due,
             ... FILTER (WHERE is_billed) posted, ... unposted := due_date < :as_of AND NOT is_billed,
             max(age_days) FILTER (WHERE open_amount > 0 AND age_days > :grace) days_late
        FROM inst GROUP BY contract_key
```
- Availability: app era only - no contract, plan or instalment was migrated (APP). The periodic posting sweep is not
  scheduled, so unposted instalments are expected until it is (listed, not hidden). Contract billing can debit A/R twice
  until DATA-37 posts the `contract_movement` credit (03 §2.25); affected contracts carry the flag `double_billing_suspect`
  from 03 section 6 #33 / #34. Insurance-side instalments fail to post on PostgreSQL until DATA-37 (check #26).

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
| `delinquent_contracts`, `payment_plan_delinquent_pct` | Delinquent / share | integer, percent | `aggregate` | sum / ratio |
| `payment_plan_delinquent_days_avg` | Average days late | decimal | `aggregate` | weighted_avg (open amount) |
| `card_on_file_pct` | Card on file | percent | `aggregate` | ratio |
| `financing_collection_share_pct` | Financing share of patient collections | percent | `financial_practice` | ratio (organisation and office rows only) |

- Detail and delinquent formats: one row per contract (patient `phi_identified`, setup date, provider, kind, totals,
  next due, days late, card on file, `double_billing_suspect`; amounts `financial_patient`).
- Summary cards: `payment_plan_remaining_amount`, `installments_unposted_amount`, `payment_plan_delinquent_pct`,
  `financing_collection_share_pct`. `reconciles_with`: `ortho_remaining_to_bill_amount`,
  `ortho_installments_unposted_amount` (ortho rows).

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
- Closest legacy: `lists.procedure_codes_by_fee_schedule` - a setup listing of fees; no volume, no posted or collected
  amounts. `daily.production_report` with `include_ucr` compares one schedule for one range, without collections.
- Different from `management.transaction_exceptions` format `fee_overrides` (a control list of single entries): this is
  the price-level view per code and schedule.
- Called for by CT I-24 (the internal part; no external fee percentiles, PD-13); KPI §3.1 `implied_writeoff`, §3.3 RCM-07 /
  RCM-12; 06 §2.5 tile "Data quality" (`unpriced_charge_count`).

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | office of service |
| `date_range` | `date_range` | `trailing_12_months` | fixed `date_basis = service_date` |
| `provider_ids` | `entity_multi` | `all` | treating provider |
| `fee_schedule_ids` | `entity_multi` | `all` | schedule of the charge (`rpt_charges.fee_schedule_id`) |
| `carrier_ids` | `entity_multi` | `all` | through `payer_basis` |
| `procedure_category_codes`, `procedure_codes` | `entity_multi` | `all` | |
| `report_format` | `enum` | `summary` | `summary` (code x schedule), `exceptions` (rows failing a test), `detail` (charge lines) |
| `group_by`, `sort_by`, `output_format` | §3.9 | `code`, `volume_desc`, `pdf` | `group_by`: `none`, `code`, `fee_schedule`, `office` |
| `payer_basis` | `enum` NEW | `at_service` | as defined in `analytics.production_trend_mix` |
| `realization_tests` | `enum_multi` NEW | all ticked | `unpriced` (posted at zero or `is_unpriced`), `below_schedule` (posted fee < schedule fee in force), `above_ucr` (`fee_above_office_fee > 0`), `no_schedule_entry` (code has no entry on the charge's schedule) |
| `min_volume` | `integer` NEW | 5 | summary rows below the volume fold into `other` |

### Data
- `rpt_charges` (`procedure_code`, `fee_schedule_id`, `fee_source`, `is_unpriced`, `charged_fee`, `office_fee`,
  `implied_writeoff`, `fee_above_office_fee`, `quantity`, `service_date`, `office_id`, `provider_id`, `entry_id`),
  `rpt_fee_schedule_fees` (`schedule_fee` in force on the service date for the charge's schedule and for the office's
  `default_ucr_fee_schedule_id` from `rpt_office_dim`), `rpt_payment_allocations` (collected per line:
  `debit_entry_id = charge entry_id`, `credit_ledger_bucket = 'collection'`), `rpt_remittance_lines` (insurance paid and
  write-off per line, app era).
- Per code x schedule: volume, `avg_ucr_fee`, `avg_schedule_fee`, `avg_posted_fee` (`charged_fee` per line; `quantity > 1`
  lines are normalised per unit, 03 §6 #24), `avg_collected` (NEW `collected_per_procedure`), NEW `posted_to_schedule_pct`
  (posted ÷ schedule fee), NEW `fee_realization_pct` (collected ÷ UCR), `implied_writeoff`, `unpriced_charge_count`.
- Collected per line is cut at the run date: lines of the last 90 days are `is_provisional` (open claims).

```
f := SELECT c.*, s.schedule_fee AS sched, u.schedule_fee AS ucr
     FROM rpt_charges c
     LEFT JOIN LATERAL (SELECT schedule_fee FROM rpt_fee_schedule_fees WHERE fee_schedule_id = c.fee_schedule_id
          AND procedure_code = c.procedure_code AND c.service_date >= effective_date
          AND (effective_to IS NULL OR c.service_date < effective_to) ORDER BY effective_date DESC LIMIT 1) s ON true
     LEFT JOIN LATERAL (same on o.default_ucr_fee_schedule_id) u ON true
     WHERE c.is_production AND <range, scope>
col := SELECT debit_entry_id, sum(amount) FROM rpt_payment_allocations WHERE credit_ledger_bucket = 'collection' GROUP BY 1
out := GROUP BY procedure_code, fee_schedule_id ; tests evaluated per line, counted per group
```
- Migrated history: posted fees, volume and the UCR snapshot work (H, k3); `fee_schedule_id` is NULL on migrated charges,
  so the schedule is the patient's current schedule (`rpt_patient_dim.fee_schedule_id`, k12) or the office default,
  labelled `schedule_source`; schedule entries carry no end date, so a deleted entry rewrites the past (03 §2.29).
  Collected per line is derived oldest-first for history (k4) and exact for app rows from DATA-26 (SCHEMA(26)).

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
- Closest legacy: `daily.production_report` grouped by carrier - production only; no write-off, speed, yield or denial by
  payer. `insurance.claims_list` lists claims without economics.
- Called for by KPI §3.3 RCM-07 / RCM-08; DSO §14.6 ("payer mix with time to collect and write-offs by insurer"); 06 §2.7
  tile "Payers" scorecard (rows = carriers).

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | office of service |
| `date_range` | `date_range` | `trailing_12_months` | service-date cohort; speed and denial rates on claims of the cohort |
| `compare_to` | `enum` | `previous_year` | |
| `carrier_ids` | `entity_multi` | `all` | |
| `provider_ids` | `entity_multi` | `all` | treating provider |
| `report_format` | `enum` | `summary` | `summary` (carrier, expanding to plan), `detail` (charges of a carrier) |
| `group_by`, `sort_by`, `output_format` | §3.9 | `none`, `charged_desc`, `pdf` | `group_by`: `none`, `office` |
| `payer_basis` | `enum` NEW | `at_service` | as defined in `analytics.production_trend_mix`; self-pay = no dental coverage on the basis |
| `include_plans` | `boolean` NEW | `true` | second level per plan (`ins_plan_id`; plans have no name: label = group number + employer) |

### Data
- `rpt_charges` (payer by `payer_basis`, `charged_fee`, `office_fee`, `implied_writeoff`, `appointment_id`,
  `patient_id`), `rpt_adjustments` (`txn_class = 'contractual_writeoff'`, `carrier_id`), `rpt_payment_allocations`
  (collected on the payer's charges, all payers), `rpt_claim_facts` (`carrier_id`, `ins_plan_id`, `submitted_date`,
  `first_paid_date`, `status_class`, `is_preauth`), `rpt_claim_lines` / `rpt_remittance_lines` (estimate accuracy),
  `rpt_appointment_facts` (`duration_minutes`, `is_kept`) for chair hours, `rpt_insurance_coverage`.
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
       WHERE a.credit_ledger_bucket = 'collection' GROUP BY 1
hrs := SELECT payer_key, sum(f.duration_minutes * share) / 60 FROM rpt_appointment_facts f JOIN ch USING (appointment_id)
       WHERE f.is_kept GROUP BY 1                                   -- share = payer's fee share of the appointment
clm := SELECT carrier_id, ins_plan_id, <05 builders for claim_days_to_payment, denial_rate_pct, ...>
       FROM rpt_claim_facts WHERE NOT is_preauth AND service_to in range
```
- Migrated history: payer is today's coverage (k12) - a patient who changed carrier is attributed to the new one for all
  history; stamped payer from DATA-33 (SCHEMA(33)); migrated claims need DATA-10 / DATA-32 for plan and status (k5);
  explicit contractual write-offs have a carrier only on app remittances; collected per procedure is derived for history
  (k4). Chair hours rely on the charge-to-appointment link, which is unreliable on migrated rows
  (`appointment_link_reliable`); the column is served from P3 with the link quality printed.

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `carrier_id`, `carrier_name`; `ins_plan_id`, `plan_label` | Carrier / plan | id, text | `aggregate` | label |
| `payer_patients` | Patients | integer | `aggregate` | count_distinct (not additive across carriers) |
| `charged_production`, `gross_production` | Production | money | `financial_practice` | sum |
| `production_share_pct` | Share of production | percent | `financial_practice` | share_of_parent |
| `contractual_writeoff_rate_pct` | Contractual write-off | percent | `financial_practice` | ratio |
| `collected_amount` | Collected | money | `financial_practice` | sum |
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
- Closest legacy: `insurance.claims_list` - claim rows by status and date; no cycle statistics, no distribution, no user
  view.
- Called for by KPI §3.3 RCM-02 / RCM-04 / RCM-06, §3.12 FRO-06; DSO §14.6 (same-day claim rate); CT TS-4; 06 §2.7 tiles
  "Speed and quality", "Claims submitted" (drill target moves from `insurance.claims_list` to this report for the rates; the
  list stays the row target).

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
- `rpt_claim_facts` (`claim_id`, `claim_family_no`, `tier`, `carrier_id`, `office_id`, `treating_provider_id`,
  `service_to`, `submitted_date`, `first_submitted_at`, `first_paid_date`, `submission_count`, `status_class`,
  `created_by_user_id`, `is_preauth`, `sent_method`).
- `claim_status_history` (DATA-25, NEW dataset `rpt_claim_status_events` requested from 03: `claim_id`, `from_status`,
  `to_status`, `changed_at`, office-local `changed_date`, `changed_by`): sending user = `changed_by` of the first transition
  to `sent`; resubmissions = later transitions to `sent`; time in stage (created -> sent -> first paid).
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
- Availability: sent-to-first-payment works for both eras (H); submission lag and same-day rate need `service_to`, which
  migrated claims lack until the claim backfill (k5, history N(10)); first-pass and resubmissions from `submission_count`
  are app era; stage timing and sending user exist only from DATA-25 go-live (G(25), `history starts on <date>`);
  server-stamped claim dates are UTC dates until DATA-31 (an evening send lands on the next day). True clean-claim rate
  needs a clearinghouse (DATA-38) and is not offered.

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
- Closest legacy: `insurance.835_denial_report` - ERA 835 denials only, needs a clearinghouse, no recovery outcome.
- Called for by DSO §14.6 "Denial analytics"; KPI §3.3 RCM-03 (denial rate and denial recovery); CT I-37; 06 §2.0.4
  "Denial counts and amounts (P3, after DATA-31)", §2.7 "Work queues" (`worklists.denied_claims` is the queue; this is its
  analysis).

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
- `rpt_claim_facts` with NEW exposed columns from DATA-31 (`denied_date`, `denial_reason_code`, `denial_remark_code`,
  `denied_amount`, `appeal_date`, `parent_claim_id`; request to 03), `rpt_claim_lines` (codes), `rpt_claim_status_events`
  (NEW, see claim cycle: transitions after denial), `rpt_remittance_lines` (payments and write-offs after `denied_date`),
  `era_adjustments` through a NEW passthrough (DATA-38, only with a clearinghouse).
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
- Availability: app era only, from DATA-31 go-live (G(31)); before it a denial is only a current `status_class = 'denied'`
  with no date, amount or reason, so the report runs the summary on status only with the "proxy" label and `recovery` is
  `not_available`. Migrated claims carry no denial data. Reason codes are manual entries until an ERA integration
  (DATA-38); with ERA the CARC / RARC codes replace them.

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
- Closest legacy: `insurance.dps_eligibility_report` - the verification list for a date range; no compliance rate, lead
  time, user rate or visit outcome.
- Called for by KPI §3.3 RCM-09; CT TS-4; 06 §2.7 tile "Eligibility", §2.16 tile "Insurance desk" (both drill to
  `worklists.eligibility_verification` for the queue; the rate history drills here).

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
- `rpt_appointment_facts` (live, not blocks: `appointment_id`, `appointment_date`, `start_time`, `office_id`,
  `provider_id`, `patient_id`, `status_class`, `is_kept`), `rpt_insurance_coverage` (`category = 'dental'`,
  `tier = 'primary'`, `carrier_id`) for "insured", NEW `rpt_eligibility_checks` (owner 03, DATA-34; already requested by
  `catalog/insurance_reports.md`: `checked_at`, `checked_date`, `elig_status_class`, `method`, `checked_by`, `patient_id`,
  `appointment_id`, `tier`), `rpt_claim_facts` (later denial of the visit's claim, outcome column).
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
- Availability: app era only from DATA-34 go-live (G(34)); before it only one overwritable stamp per subscriber exists
  (`elig_verified_on`), so past appointments cannot be judged and the period renders `history starts on <date>`; the
  current-state `eligibility_verified_pct` stays on the dashboard. Insured is today's coverage (k12): a patient who
  gained or lost coverage since the visit is misclassified; one stamp per subscriber marks every dependant.

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

financial - P2 - L - `reports_daily_reports_screen_view_only` - interactive - SCHEMA(28), SCHEMA(29)

### Purpose
Office manager each morning ("Yesterday" view), owner and controller at month end: for each office-day, the payments
posted by tender against the amounts deposited, what is still undeposited, whether the day was closed, by whom and when,
what changed after the close, and whether the month is locked. The cash-control register that proves the day sheet, the
deposit and the ledger agree.

### Why it is new
- Closest legacy: `daily.deposit_slip` - the contents of one deposit; no ledger-to-deposit variance, no close history, no
  post-close corrections. `monthly.executive_day_sheet` prints a day's totals without the deposit side.
- Called for by KPI §6 routines (end of day: balance the deposit; end of month: close out), §3.12 FRO-07; CT TS-2; 06 §2.6
  tile "Cash controls", §2.16 "Day controls" (`worklists.day_close_checklist` is the queue for days not yet closed).

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
- `rpt_office_calendar_days()` (open days), `rpt_payments` (`posting_office_id`, `office_id`, `transaction_date`,
  `deposit_group`, `deposit_id`, `counts_as_collection`, `amount`, `posted_at` via `created_at_utc`).
- NEW passthrough datasets requested from 03 (DATA-28, DATA-29): `deposits` (`deposit_date`, `deposit_group`, `status`,
  `total_amount`, `deposited_by`, `deposited_at`), `deposit_items`, `office_day_closes` (`status`, `closed_at`,
  `closed_by`, `reopened_at`, `reopened_by`, `reopen_reason`, `control_totals`), `financial_period_locks`
  (`locked_through`, `locked_by`, `unlocked_at`); plus `rpt_day_close_snapshot`, `rpt_snapshot_variances`,
  `rpt_ledger_entries_all` (legs posted or voided after `closed_at` with `transaction_date` = the business date; needs
  `posted_at`, DATA-13, and `voided_at`, DATA-14), `rpt_user_dim`.
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
       WHERE e.posted_at > cls.closed_at OR (e.is_void AND e.voided_at > cls.closed_at)
lck := max(locked_through) of the effective lock rows (office or all offices) ; is_locked := day <= lck
```
- Availability: app era only - no deposit, close or lock exists before DATA-28 / DATA-29 go-live (APP; earlier days render
  `not_closed` only after the go-live date, `history starts on <date>` before it). Post-close corrections need DATA-13 and
  DATA-14 stamps. Migrated payments have no deposit.

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
- Closest legacy: `monthly.waterfall_report` - collections by service month (collected to date); not stage losses, no
  office comparison, no row lists per stage.
- Called for by DSO §14.6 (cash-conversion waterfall, recovery sizing); KPI §3.13 DSO-08; 06 §2.7 tile "Cash conversion"
  (drill target "stage lists", key chosen in the header), §2.14 tile "Revenue cycle".

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
- Metric `cash_conversion_waterfall_amount` by `waterfall_stage` (05 §5.13): `gross_production` (`rpt_charges.office_fee`,
  office of service) · contractual = `implied_writeoff − Σ contractual_writeoff adjustments` (`rpt_charges`,
  `rpt_adjustments`) · time-of-service gap = `uncollected_copay_amount` (units of `management.time_of_service_collection`)
  · `bad_debt_amount` (`rpt_adjustments`, class `bad_debt`) · aged A/R at risk = `(1 − aged_ar_recovery_share) ×
  ar_over_90_amount` as of `report_date` (`rpt_ar_snapshot` month-end row, transaction attribution; recomputed with
  `rpt_ar_open_items()` before the first snapshot) · estimated cash = the remainder.
- Beside the estimate (not a stage): actual `net_collections` of the same 12 months, so the estimate can be checked.
- Detail rows per stage: contractual -> charge lines with implied write-off and contractual adjustment legs; gap ->
  account-office-day units with uncollected amount; bad debt -> adjustment legs; aged A/R -> open items over 90 days.

```
s1 := gross_production(:window)          s2 := contractual(:window)       s3 := uncollected_copay_amount(:window)
s4 := bad_debt_amount(:window)           s5 := (1 - setting46) * ar_over_90_amount(:as_of)
out:= rows (stage, amount, share_of_gross) ; cash := s1 - s2 - s3 - s4 - s5 ; compare: same for :as_of - 1 year
```
- Availability: stages 1-3 work on history (H; k3, k13); bad debt and the explicit contractual part need DATA-12 for
  migrated months (k1: on history they are 0 and the unclassified amount is printed beside the stages); aged A/R is frozen
  only from the first month-end snapshot (SCHEMA(30)), recomputed and labelled before it. The time-of-service gap is a gap
  at the visit, partly recovered later (see the recovery columns of `management.time_of_service_collection`): the stage
  is not a loss. Shares are of office-fee production (the publisher uses expected-fee production: context only, 05).

### Output
| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `waterfall_stage`, `stage_label` | Stage | enum, text | `aggregate` | label |
| `stage_amount` | Amount | money | `financial_practice` | none (a waterfall: start, steps, end) |
| `share_of_gross_pct` | Share of gross production | percent | `financial_practice` | none |
| `stage_amount_compare`, `stage_variance_pct` | PY / variance | money, percent | `financial_practice` | none |
| `office_<id>_amount` (office columns) | Per office | money | `financial_practice` | none |
| `net_collections_actual` (card and footer row) | Actual net collections, same window | money | `financial_practice` | none |
| `stage_quality` | Frozen / recomputed / degraded | enum | `aggregate` | none |

- Detail: per stage the columns of its source rows (entry or unit id, date, patient `phi_identified`, code or account,
  amount `financial_patient`), `row_id_column` per stage.
- Summary cards: gross production, leakage total (stages 2-5), estimated cash, `net_collections_actual`. `reconciles_with`:
  each stage = `cash_conversion_waterfall_amount` with that `waterfall_stage`.

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

financial - P4 - L - `reports_management_reports_screen_view_only` - background - SCHEMA(26)

### Purpose
Owner, office manager or payroll administrator at each pay period: for every provider, pay period and office, the inputs
of any production-, collection- or lab-net pay formula side by side - production, adjusted (net) production, collections
allocated to the provider's work, lab fees, and refunds or reversals of money already credited. No pay is computed and no
pay rule is stored; the report gives one reproducible, frozen basis per period that payroll applies its formula to.

### Why it is new
- Closest legacy: `monthly.income_allocation` - allocated income only, one range; no production basis, no lab deduction,
  no reversal of earlier credits, no freeze per pay period. `daily.production_report` by provider gives production alone.
- Called for by DSO §14.7 (ADA models: total production, adjusted production, collections, lab-net), §15 #17 (provider
  compensation statements); KPI §3.2 COL-02 ("basis of collection-based provider pay").

### Parameters
| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | per-office breakdown (pay is often per location, DSO §14.7) |
| `date_range` | `date_range` | `last_month` | the pay period(s); bases fixed per column (below) |
| `pay_period_grain` | `enum` NEW | `month` | `week`, `biweekly`, `semi_monthly`, `month`; anchors of `biweekly` from `time_clock_settings` week start |
| `provider_ids` | `entity_multi` | `all` | `provider_restriction = self_unless_privileged` (PD-11): a restricted caller gets the own rows and no office total |
| `production_group` | `enum` | `all` | |
| `report_format` | `enum` | `summary` | `summary` (provider x period x office), `statement` (one provider, one period, every component with its rows), `detail` |
| `group_by`, `page_break_by`, `output_format` | §3.9 | `provider`, `provider`, `pdf` | |
| `hygiene_credit` | `enum` NEW | 05 setting | `hygienist`, `dentist`, `both` (05 hygienist crediting setting); printed |

### Data
- Production (service date): `rpt_charges` (`gross_production`, `charged_production` by treating provider; hygienist per
  setting) and `production_adjustments` attributed to the provider (`rpt_ledger_entries`, `production_adjustment`) ->
  `net_production`, `net_production_before_bad_debt`.
- Collections (allocation date): `provider_income` from `rpt_payment_allocations` (`allocation_provider_id`,
  `allocation_office_id`, `allocation_date`, targets `production`, `non_production_charge`, `debit_adjustment`);
  `Unassigned provider` and `Unallocated` rows shown.
- Reversals: money credited to the provider in an earlier period and taken back in this one (refund linked to the
  payment, payment reversal, re-allocation): NEW `provider_income_reversed_amount` requested from 05, read from persisted
  allocations with `reversed_at` in the period (DATA-26); on derived rows not computable (a recomputation rewrites the
  earlier period instead).
- Lab fees (appointment date): `rpt_lab_cases.lab_cost` by `provider_id` and office (NEW `provider_lab_cost_amount`, the
  P binding of `lab_cost_amount`, requested from 05).
- Freeze: periods inside a `financial_period_locks` lock read `rpt_metric_values` with `snapshot_kind = 'period_lock'`
  (05 §10 freezes `provider_income`); open periods are live and marked `open`.

```
prd := SELECT provider_id, office_id, period(service_date), sum(office_fee), sum(charged_fee) FROM rpt_charges ...
adj := SELECT provider_id, office_id, period(<dating>), sum(amount) FROM rpt_ledger_entries WHERE ledger_bucket='production_adjustment'
inc := SELECT allocation_provider_id, allocation_office_id, period(allocation_date), sum(amount)
       FROM rpt_payment_allocations WHERE credit_ledger_bucket='collection' AND allocation_target IN (...)
rev := SELECT ... FROM payment_allocations (persisted) WHERE reversed_at in period            -- DATA-26
lab := SELECT provider_id, office_id, period(appointment_date), sum(lab_cost) FROM rpt_lab_cases
out := FULL JOIN on (provider_id, office_id, period) ; frozen periods replaced by period_lock values
```
- Availability: production works on history (H; net degraded k1); collections are derived oldest-first for history and
  change when back-dated entries arrive (k4), so a pay basis is reproducible only for app-era periods with persisted
  allocations (SCHEMA(26)) frozen by a period lock (DATA-29); lab fees are app era (DATA-23, 18 migrated cases);
  reversals need DATA-26.

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

<!-- WORK-ITEMS -->
| RPT-NEW-10 | Production trend and mix (`analytics.production_trend_mix`): matrix builder, five mix dimensions, `production_basis`, `payer_basis`, PY compare, detail legs | P2 | M | DATA-06, DATA-33, DATA-12 (net on history), MET-26, NEW parameters in 04 | Grand totals equal `gross_production`, `charged_production`, `net_production` for 3 fixture ranges; a category expands to codes whose sum equals the category; a migrated month shows net = charged with the unclassified amount beside it; a charge without stamped carrier is labelled `current_coverage` |
| RPT-NEW-11 | Actual versus scheduled production (`analytics.production_vs_schedule`) and the appointment-grain start-of-day snapshot request | P4 | M | DATA-48 (appointment grain NEW), DATA-16, DATA-17 (moved out) | For a fixture day with 5 booked, 1 cancelled, 1 added and 1 walk-in appointment, the bridge closes to the produced amount; a day before the snapshot go-live renders `history starts on <date>` |
| RPT-NEW-12 | Collections trend and mix (`analytics.collections_trend_mix`) with the rates format | P2 | M | DATA-06, DATA-12, DATA-26 (provider by allocation), DATA-33 (carrier) | Totals equal `gross_collections`, `net_collections`; the seven rate variants equal their 05 metrics per month; the assumed-tender share prints on migrated months; a carrier slice of migrated payments is `Carrier not recorded` |
| RPT-NEW-13 | Service-to-payment lag (`analytics.payment_lag`): payment and service cohort formats, `payment_lag` bucket set | P2 | M | DATA-20, DATA-26, NEW bucket set in 03 | `days_to_payment` equals the 05 metric; bucket amounts sum to the allocated collections; a derived-only range prints "allocation derived"; a service month younger than 90 days is provisional |
| RPT-NEW-14 | Adjustments and write-offs (`analytics.adjustment_writeoff_analysis`) with NEW `adjustment_report_class` | P2 | M | DATA-03, DATA-12, NEW column in 03, `discount_rate_pct` in 05 | Class sums equal production plus collection plus unclassified adjustments; transfers and opening balances are outside every rate; rates equal `writeoff_rate_pct`, `contractual_writeoff_rate_pct`, `bad_debt_rate_pct` |
| RPT-NEW-15 | A/R trend (`monthly.ar_trend`): frozen and recomputed month ends, both attributions, bridge format | P2 | L | DATA-27, DATA-30, ENG background runs | A month end with a snapshot returns the frozen values after a later back-dated edit; a recomputed month is labelled; the bridge difference is 0 on the fixture (I-2); office totals sum to the organisation under both attributions with credits included |
| RPT-NEW-16 | Time-of-service collection (`management.time_of_service_collection`) with later recovery and pro-rata provider split | P2 | M | DATA-06, NEW recovery metrics and provider binding in 05 | `otc_collection_pct` and `uncollected_copay_amount` equal the 05 metrics; a unit paid 10 days later counts as recovered with 10 days; provider shares of a two-provider unit sum to the unit |
| RPT-NEW-17 | Payment plans and financing (`management.payment_plan_portfolio`) | P2 | M | DATA-37, DATA-20, NEW plan metrics in 05, `plan_type = both` in 04 | A fixture contract with one unposted and one posted-unpaid instalment shows both; delinquency follows `delinquency_grace_days`; financing share equals financing payments ÷ patient collections |
| RPT-NEW-18 | Fee schedule and UCR realisation (`analytics.fee_realization`) with the four realisation tests | P2 | M | DATA-51, DATA-26 (collected per line), NEW metrics in 05 | For a code with two dated schedule entries the schedule fee follows the service date; unpriced count equals `unpriced_charge_count`; a below-schedule line appears in the exceptions format and in the `fee_overrides` drill |
| RPT-NEW-19 | Payer mix and plan profitability (`insurance.payer_mix_profitability`) | P2 | L | DATA-33, DATA-21, DATA-32, DATA-26; chair-hour column P3 (DATA-16) | Carrier production sums to charged production with `Self-pay` and `Payer not recorded`; claim speed and denial columns equal the 05 metrics filtered by carrier; the current-coverage share is printed |
| RPT-NEW-20 | Claim cycle and first-pass performance (`insurance.claim_cycle_performance`) and NEW `rpt_claim_status_events` | P2 | M | DATA-21, DATA-25, DATA-31, NEW dataset in 03 | Four headline rates equal their 05 metrics; a claim sent twice counts as a resubmission; secondary lag is computed within a claim family; pre-authorisations are excluded |
| RPT-NEW-21 | Denial analysis (`insurance.denial_analysis`) with recovery outcomes | P3 | M | DATA-31, RPT-NEW-20 (status events), DATA-38 for ERA codes | A denied claim paid after resubmission is `recovered_paid` with its days; open amount equals the `worklists.denied_claims` total; before DATA-31 the recovery format is `not_available` and the summary is labelled proxy |
| RPT-NEW-22 | Eligibility verification compliance (`insurance.eligibility_verification_compliance`) | P3 | M | DATA-34 (`rpt_eligibility_checks`), DATA-16, NEW metrics in 05 | An appointment verified 2 days ahead inside a 30-day window counts in time; one verified after the start does not; past periods before DATA-34 render `history starts on <date>` |
| RPT-NEW-23 | Day close and deposit reconciliation (`daily.day_close_reconciliation`) with the deposit and close passthroughs | P2 | L | DATA-28, DATA-29, DATA-30, DATA-13, DATA-14, DATA-55 | R-09 holds per office-day (posted = deposited + undeposited); a payment voided after close appears as a post-close correction; compliance equals `day_close_compliance_pct`; a locked month is shown locked |
| RPT-NEW-24 | Cash-conversion waterfall (`analytics.cash_conversion_waterfall`) with stage detail lists | P4 | M | DATA-30, RPT-NEW-14, RPT-NEW-16, `cash_conversion_waterfall_amount` in 05 | Each stage equals the metric for its `waterfall_stage`; estimated cash = gross minus the four stages; each stage's detail rows sum to the stage |
| RPT-NEW-25 | Provider pay basis (`management.provider_pay_basis`) with the statement format | P4 | L | DATA-26, DATA-29, DATA-23, NEW reversal and lab metrics in 05, `pay_period_grain` in 04 | Components equal `net_production` and `provider_income` by provider; a locked period returns the frozen values after a back-dated payment; a restricted caller receives only own rows and no office total |
<!-- /WORK-ITEMS -->
