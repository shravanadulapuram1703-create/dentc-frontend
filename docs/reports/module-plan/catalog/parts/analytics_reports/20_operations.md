## Domain: Schedule, hygiene, treatment, patients and providers

## Schedule utilisation and capacity - `appointment.schedule_utilization`

operations - P3 - L - `reports_appointment_reports_screen_view_only` - interactive (background above 13 months or above the engine limits) - READY (booked and kept hours, production); capacity of past months uses today's template (k10), capacity history SCHEMA(43)

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
| `patient_visits` | Visits | integer | `aggregate` | recomputed from `rpt_visits` (provider rows are non-additive) |
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

operations - P3 - M - `reports_appointment_reports_screen_view_only` - interactive - READY (status rates, recovery, repeat patients); value lost APP (k7); notice and reason SCHEMA(17)

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
| `days_to_next_appointment_median` | Days to next appt (median) | decimal | `aggregate` | recomputed (NEW measure, 05) |
| `broken_appointment_value_lost` | Value not recovered | money | `financial_practice` | sum |
| `repeat_patients` | Repeat patients | integer | `aggregate` | recomputed distinct |

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

operations - P3 - M - `reports_appointment_reports_screen_view_only` - interactive - APP; seated stamp SCHEMA(17); appointment type SCHEMA(43)

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
| `arrival_offset` | Arrival vs start (min) | duration | `aggregate` | statistic recomputed per level |
| `wait_to_seat` | Wait to be seated (min) | duration | `aggregate` | statistic; G(17) |
| `late_start_pct` | Late starts | percent | `aggregate` | ratio of sums; G(17) |
| `chair_time` | Chair time (min) | duration | `aggregate` | statistic; G(17) |
| `visit_time` | Check-in to check-out (min) | duration | `aggregate` | statistic |
| `overrun` | Over booked length (min) | duration | `aggregate` | statistic |
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

operations - P3 - L - `reports_recall_reports_screen_view_only` - interactive (format `retention` background) - READY (variants 2 and 3, recall position from derived intervals); at-visit variants APP; maintained recall rows SCHEMA(41)

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
| `hygiene_patients` | Hygiene patients | integer | `aggregate` | recomputed distinct |
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

operations - P3 - M - `reports_daily_reports_screen_view_only` - interactive - READY (code groups DATA-04; groups marked [I] in 05 §4.1 need the clinical lead's review, MET-03)

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
| `office_value` | Office | percent / decimal | `aggregate` | recomputed |
| `org_value` | Organisation | percent / decimal | `aggregate` | recomputed |
| `variance_pp` | vs office | decimal | as `value` | difference(`value`, `office_value`) |

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

operations - P3 - M - `reports_treatment_plan_reports_screen_view_only` - interactive (background when the look-back exceeds 24 months) - READY (works on migrated charges; k9, k14)

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
| `median_months_to_b` | Months to follow-on (median) | decimal | `aggregate` | recomputed |

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

operations - P3 - L - `reports_treatment_plan_reports_screen_view_only` - background (cohorts) - APP (DATA-56; dated transitions DATA-25; item office SCHEMA(39))

### Purpose

Doctors, treatment coordinators and office managers (monthly) see, for each month of presented treatment, how much was
accepted, scheduled and completed and how long each step took, by provider, counsellor and category. Decisions: is the
problem presentation, acceptance, scheduling or completion; who needs coaching; which backlog to work first (age,
acceptance state, remaining benefits, benefit-year end).

### Why it is new

| Closest legacy | What this adds |
|---|---|
| `treatment_plan.treatment_plan_analysis` (status totals for one range) | Presentation-month cohorts with windowed acceptance and completion, strict stage hierarchy, time to schedule and to complete, provider / counsellor / category comparison, backlog ageing with remaining benefits |

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
| `report_format` | `enum` | `funnel` | `funnel` (cohort x stage), `by_member`, `backlog`, `detail` |
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
| Waits for | DATA-25 (exact time to accept / schedule), DATA-39 (item office, accepted stamp), DATA-32 (benefit remainders on migrated plan limits) |

### Output

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `cohort_label` / `member_label` | Presented in / member | text | `aggregate` (`provider_comp` by provider) | label |
| `patients_presented` | Patients | integer | `aggregate` | recomputed distinct |
| `treatment_presented_amount` | Presented | money | `financial_practice` | sum |
| `treatment_accepted_amount` | Accepted (window) | money | `financial_practice` | sum |
| `case_acceptance_pct` | Acceptance | percent | `financial_practice` | ratio of sums (unit named) |
| `scheduled_amount` | Scheduled or done | money | `financial_practice` | sum (funnel stage) |
| `completed_amount` | Completed (window) | money | `financial_practice` | sum |
| `case_completion_pct` | Completion | percent | `financial_practice` | ratio of sums |
| `acceptance_completion_gap` | Gap (points) | decimal | `financial_practice` | difference; equals `acceptance_completion_gap_pp` from P4 |
| `days_to_schedule_median` | Days to schedule | decimal | `aggregate` | recomputed |
| `days_to_complete_median` | Days to complete | decimal | `aggregate` | recomputed |
| `unaccepted_amount` | Not accepted | money | `financial_practice` | sum |
| `is_provisional` | Provisional | boolean | `aggregate` | none (hidden; dashed cell style) |

`backlog`: matrix age band x acceptance state, value amount, with patients and `benefits_remaining_amount` columns.
Detail: item rows (`financial_patient`, `phi_identified`): patient, plan, code, tooth, presented, accepted, scheduled,
completed, stage, days to schedule, fee, estimates, counsellor. Summary cards: `treatment_presented_amount`,
`case_acceptance_pct`, `case_completion_pct`, `unscheduled_treatment_amount`. `reconciles_with`: the acceptance,
funnel, completion and unscheduled metrics.

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

operations - P3 - L - `reports_lists_patient_list_screen_view_only` - interactive (format `cohort` background) - READY for visits and conversion (k9, k14); source SCHEMA(40); booking channel SCHEMA(17)

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
return columns. Called for by: KPI §3.7 PAT-01, PAT-08; CT §5 TS-6; 06 §2.11 "New patients", "First-visit quality",
"Where new patients come from".

### Parameters

| Parameter key | Type | Default | Notes |
|---|---|---|---|
| `office_scope` | `office_scope` | `working_office` | Office of the first visit (`first_visit_office_id`, 05 §5.7) |
| `date_range` | `date_range` | `last_month` | First-visit date (cohort); conversion windows run past `date_to` and are printed |
| `compare_to` | `enum` | `previous_year` | |
| `time_grain` | `enum` | `month` | Format `cohort` |
| `provider_ids` | `entity_multi` | `all` | Provider of the first visit (`rpt_visits.primary_provider_id` on the first-visit row) |
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
| `rpt_visits` | first and second visit dates, `primary_provider_id` |
| `rpt_patient_dim` | `zip5`, `dob`, `home_office_id`, `referral_source_id`, `referral_source_name`, `is_placeholder_patient`, `created_at_reliable` |
| `rpt_referral_facts` | `inbound_source`: `source_category`, `referral_source_id`, `source_type_label` |
| `rpt_appointment_facts` | first kept appointment: `booking_source`, `lead_days`, `created_date`, `is_new_patient`; later appointments for reappointment |
| `rpt_charges` + `rpt_code_in_group()` | production on the first-visit date; `radiograph_fmx`, `radiograph_pano`; `exam_new_patient`, `exam_emergency` (first-visit kind) |
| `rpt_insurance_coverage` | primary dental coverage today (`payer_type`, NEW dimension mapped from `plan_type`, `network_type`, `is_prepaid` through `rpt_value_map`: `self_pay`, `ppo`, `capitation`, `medicaid`, `other`) |

Measures: `new_patients_first_visit`, `new_patients_missing_source_pct`, `patient_referral_share_pct`,
`fmx_pano_new_patient_pct`, `new_patient_reappointment_pct`, `new_patient_lead_days`; NEW (05 §5.7)
`first_visit_production_avg` (P on the first-visit date ÷ new patients), `new_patient_second_visit_6m_pct` and
`new_patient_second_visit_12m_pct` (a visit on a later date within 6 / 12 months of the first; `is_provisional` until the
window has passed), `emergency_first_visit_pct`. Dimension `first_visit_kind`: `comprehensive`, `emergency`, `hygiene`,
`other` from the first-visit codes. Zip: top 15 members plus `other`.

```
np AS (SELECT pa.patient_id, pa.first_visit_date, pa.first_visit_office_id, v.primary_provider_id FROM rpt_patient_activity pa
       JOIN rpt_visits v ON v.patient_id = pa.patient_id AND v.visit_date = pa.first_visit_date AND v.office_id = pa.first_visit_office_id
       WHERE pa.first_visit_date BETWEEN :date_from AND :date_to)
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
| `new_patient_lead_days` | Lead days (avg) | decimal | `aggregate` | recomputed |
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

operations - P3 - L - `reports_lists_patient_list_screen_view_only` - background - READY (visit history; k9, k14); losses by status change SCHEMA(44)

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
| `office_attribution` | `enum` | `visit_office` | NEW in 04 (header): `visit_office` (rows on `rpt_visits`; non-additive across offices, organisation total deduplicated) or `home_office` |
| `date_range` | `date_range` | `trailing_12_months` | Bridge: the periods; cohort: first-visit dates of the cohorts |
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
| `active_start` | Active at start | integer | `aggregate` | first period's value (non-additive) |
| `new_patients` | New | integer | `aggregate` | sum |
| `reactivated_patients` | Reactivated | integer | `aggregate` | sum |
| `patients_lost` | Lost | integer | `aggregate` | sum |
| `status_changes` | Status changes (residual) | integer | `aggregate` | sum |
| `active_end` | Active at end | integer | `aggregate` | last period's value |
| `net_patient_growth_pct` | Net growth | percent | `aggregate` | recomputed over the range |
| `attrition_rate_pct` | Attrition (12 months) | percent | `aggregate` | as of the range end |
| `at_risk_patients`, `lapsed_patients` | At risk, lapsed | integer | `aggregate` | as of the range end |

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

operations - P4 - L - `reports_monthly_reports_screen_view_only` - background - READY for production (k9, k14) and for collections on the payment row (k11, k15, k16); collections allocated to the patient's own production SCHEMA(26) (derived oldest-first until then, k4)

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
| `tenure_months_avg` | Tenure (months) | decimal | `aggregate` | recomputed |

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

operations - P4 - L - `analytics_provider_scorecards_view` - interactive (background for 12 months x all providers) - as its metrics (READY / APP / SCHEMA per metric, each cell carries its own availability); peers ENG-51

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
| `change` | Change | per metric | `provider_comp` | difference |
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

operations - P3 - M - `reports_appointment_reports_screen_view_only` - interactive - APP (DATA-23; 18 migrated lab cases)

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

operations - P3 - L - `reports_ortho_reports_view_only` - interactive (background above 13 months) - APP; debonds, statuses and the visit log SCHEMA(42)

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
M (instalments not posted by M: `NOT is_billed OR charge service_date > M`), `ortho_installments_unposted_amount` as of M
(due on or before M, not posted by M), NEW (05 §5.11) `ortho_delinquent_contracts` = contracts with an open patient-side
contract charge older than `payment_plan_grace_days` (proxy: no payment-to-instalment link exists, data card 2.25;
labelled "proxy"). Current-state only, shown in the `report_date` column, never for past months (k12):
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
| Waits for | DATA-42 (debond date, status, visit log), DATA-37 (contract id on the charge, the contract credit; until then a plan set up over charged treatment double-debits A/R and inflates delinquency, data card 2.25 #33, #34) |

`rpt_ortho_contracts` lists active contracts only until `contract_status` exists (05 §5.11): debonded contracts may be
missing from past months.

### Output

`monthly`: shape `matrix`, rows metric, columns month (+ `report_date` column for current-state rows), with PY comparison.

| key | label | type | data_class | total rule |
|---|---|---|---|---|
| `metric_label` | Measure | text | `aggregate` | label |
| `month_value` | (month) | per metric | `financial_practice` for money, `aggregate` otherwise (`provider_comp` by orthodontist) | flows: sum over months; stocks: last month; rates: recomputed |
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

operations - P4 - M - category rights (opens with any one category family: `reports_treatment_plan_reports_screen_view_only`, `reports_recall_reports_screen_view_only`, `reports_appointment_reports_screen_view_only`, `reports_insurance_reports_screen_view_only`, `reports_monthly_reports_screen_view_only`) - interactive - as its worklists' datasets: unscheduled treatment APP; recall READY (derived); broken appointments APP (k7); unbilled APP (history REPAIR(10)); outstanding claims READY (k5); patient A/R past due READY (organisation-wide SCHEMA(26))

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
| `kind` | Kind | enum | `aggregate` | group key (subtotal per kind, no grand total) |
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

<!-- WORK-ITEMS -->
| RPT-NEW-40 | `appointment.schedule_utilization` definition: summary, detail and look-ahead formats, capacity basis switch, Scheduler-day drill | P3 | L | DATA-16, DATA-55, ENG matrix pivot, 05 NEW `open_hours` / `broken_hours`, 04 NEW `capacity_basis` / `look_ahead_open_days` | For a fixture office-month, `booked_hours`, `provider_scheduled_hours`, `provider_utilization_pct` and `production_per_hour` equal the `dashboards.schedule_capacity` tiles; a provider-day without template renders "schedule not configured"; a look-ahead cell opens that Scheduler day |
| RPT-NEW-41 | `appointment.broken_appointment_analysis` definition: rates by weekday, lead time, notice, patient kind, provider, reason; recovery, days to next appointment, value lost, repeat patients | P3 | M | DATA-16, DATA-17 (notice, reason), 05 NEW `lead_time_band` / `notice_band` / `days_to_next_appointment_median`, `worklists.broken_appointments` | Status rates and recovery % equal the 05 metrics on the fixture; a migrated-only month shows rates and "history starts on" for value lost and notice; the unrecovered count drills to the worklist with the same rows |
| RPT-NEW-42 | `appointment.patient_flow_times` definition: stamp durations with median / p90 per grouping set, coverage and anomaly counts | P3 | M | DATA-17 (`seated_on`, `available_on`), 02 total `median` / `percentile` request, 05 NEW flow measures | On fixture appointments with known stamps the medians per provider and per total match a hand computation; a stamp on another date is excluded and counted; before DATA-17 only arrival offset and check-in to check-out are served |
| RPT-NEW-43 | `recall.recare_effectiveness` definition: four variants by hygienist, visit kind, carrier; recall position by overdue band; retention by code group | P3 | L | DATA-41 (maintained rows, optional), `rpt_recall_due()`, DATA-16, 05 §2.8 variants | Each variant equals its metric for the same hygienist and range; at-visit variants return `not_available` with `history_starts_on` for a migrated-only month; band counts sum to the patients in recall; the not-reappointed drill returns the complement rows |
| RPT-NEW-44 | `analytics.clinical_mix` definition: metric x provider matrix with office and organisation comparators, per-metric detail | P3 | M | DATA-04, MET-03 (clinical review of [I] groups), 05 NEW `procedures_per_100_exams` | Every rate equals its 05 metric at office level; the provider columns recompute to the office value as a ratio of sums; a member below `rate_min_denominator` is greyed; the numerator drill lists exactly the counted lines |
| RPT-NEW-45 | `treatment_plan.clinical_follow_through_gaps` definition with the `follow_through_pairs` table (05 §4) and bulk outreach | P3 | M | DATA-04, DATA-51, DATA-57 (completeness caveat), 05 NEW `follow_through_pairs`, `tooth_replacement`, `crown_prep` | Fixture patients with an RCT and no crown on the same tooth after 6 months are `open_gap`; with a crown booked they are `scheduled`; an anterior RCT is excluded; a gap rate excludes `in_window` events; the SMS action skips patients without consent and reports the count |
| RPT-NEW-46 | `treatment_plan.case_acceptance_funnel` definition: cohort funnel, by member, backlog ageing with benefits | P3 | L | DATA-56, DATA-25, DATA-39, DATA-32, 05 NEW `days_to_schedule_median` / `days_to_complete_median` | Stage amounts of a cohort sum to the presented amount under the strict hierarchy; acceptance and completion equal the 05 metrics; provisional cohorts are flagged; a backlog cell drills to `worklists.unscheduled_treatment` with the same item total |
| RPT-NEW-47 | `analytics.new_patient_acquisition` definition: source, channel, zip, office, provider splits; first-visit quality; second-visit conversion and cohort format | P3 | L | DATA-19, DATA-40, DATA-17, 05 NEW `first_visit_production_avg` / second-visit keys / `payer_type` dimension, 08 zip class | `new_patients_first_visit` equals the 05 metric; second-visit 6-month % of a fixture cohort matches a hand count and is provisional until the window closes; app patients with free-text source fall into `Unmatched text` |
| RPT-NEW-48 | `analytics.patient_retention_cohorts` definition: bridge, cohort triangle, by member, lost-patient detail | P3 | L | DATA-19, DATA-44 (residual), DATA-48 (P4 speed), 05 NEW `cohort_retention_pct`, MET-16 identity | start + new + reactivated − lost + residual = end for every fixture period; `attrition_rate_pct` equals the metric; immature cohort cells are blank and provisional; the lost drill opens `worklists.reactivation` with the same patients |
| RPT-NEW-49 | `analytics.patient_value` definition: annual and lifetime value per patient and account, top accounts | P4 | L | DATA-48, DATA-26 (allocated reading), 05 NEW value keys | `patient_value_annual` equals the metric; patient-level lifetime production equals `rpt_patient_activity.lifetime_charged_production` on the charged basis; account totals equal the sum of current members; the k14 caveat prints for migrated periods |
| RPT-NEW-50 | `analytics.provider_scorecard` definition: matrix and review sheet over the metric registry, peers and suppression | P4 | L | ENG-51, ENG-50, DASH-38, DATA-24, DATA-30, 02 `python_builder` whitelist entry | Every cell equals the provider-dashboard metric for the same parameters; a restricted caller receives only the own row and no office value below 5 other providers; a degraded cell has no band and no rank; the review-sheet PDF breaks per provider |
| RPT-NEW-51 | `appointment.lab_case_performance` definition: turnaround, late share, missing for visit, cost per case, lab cost % | P3 | M | DATA-23, 05 NEW lab keys | `lab_cost_amount`, `lab_cost_pct`, `lab_turnaround_days` equal the 05 metrics; lab rows leave `lab_cost_pct` blank; cases without a due date are counted as late unknown; counts drill to `appointment.lab_report` with the same cases |
| RPT-NEW-52 | `ortho.ortho_contract_health` definition: monthly matrix, by orthodontist, contracts detail | P3 | L | DATA-37, DATA-42, 05 NEW `ortho_delinquent_contracts` | Month-end active base and unposted amounts of a fixture contract set match a hand computation; current-state rows appear only in the `report_date` column; months before the first contract render "history starts on" |
| RPT-NEW-53 | `analytics.revenue_opportunity` definition: six categories, what-if rates, kind subtotals, per-category rights | P4 | M | the six worklists (06 §6), DATA-26, DATA-27, DATA-30, 05 NEW `recall_opportunity_amount` / `claims_unsent_amount` / `revenue_opportunity_default_rates`, 02 `right_codes_any[]` | Each category value equals its metric for the same scope and date; a caller without the insurance family sees the two insurance rows as `restricted`; no total adds production and cash; each row drills to its worklist (or print counterpart before it ships) |
<!-- /WORK-ITEMS -->
