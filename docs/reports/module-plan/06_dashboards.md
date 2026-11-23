# 06 — Dashboards, worklists and insight features

Owns (per `00_design_brief.md` §7): dashboards, scorecards, goals (entry and display), comparison inside one organisation,
alerts and subscriptions on metrics, worklists, the assistant, and the user's view of tenant custom reports. Does not define:
metric formulas, settings, code groups, benchmarks (`05_metric_catalog.md`) · `rpt_*` datasets and snapshots
(`03_data_foundation.md`) · the metric-query and dashboard execution contract, runs, snapshots, exports, saved views,
schedules, the custom-definition store (`02_architecture.md`) · parameter types and components (`04_filter_framework.md`) ·
routes, page chrome, runner, drill panel, builder screens (`07_ux_blueprint.md`) · right codes, data-class grants, audit
store (`08_security_compliance.md`) · legacy report specifications and their final `report_key`s (`catalog/*`).

Static work only: code and documents were read, nothing was executed. Backend paths are relative to `dentc-backend/`;
`FE:` = `dentc-frontend/`. API paths are relative to `/api/v1`, as in 02 §13.

**Tags** — **[V]** read by the author in the cited file · **[A]** verified in the cited analysis document · **[R]** from a
research document · **[I]** inference · **NEW** does not exist yet. AD-*, PD-*, P0..P5 refer to the brief; `ENG-nn` to 02
§17, `DATA-nn` to 03 §12, `FLT-nn` to 04 §14, `MET-nn` to 05 §11, `SEC-nn` to 08 §12. Work items of this document are `DASH-nn` (section 11).

**Verified for this document [V].** Frontend: `FE:src/components/dashboard/components/KpiStat.tsx` (props `label`, `value`,
`icon`, `tone`, `hint`, `onClick`, `loading`), `WidgetCard.tsx` (loading / error / empty / `awaitingBackend` states);
`FE:src/components/dashboard/widgets/` (10 widgets) and `lib/` (`aggregate.ts`, `useDashboardData.ts`, `useMetrics.ts`,
`dashboardUtils.ts` with `roleBucket()` → `front_desk` · `dentist` · `manager` · `admin`); `FE:src/components/Dashboard.tsx`
`layoutForRole()` (role changes widget order only); `FE:src/components/my-page/widgets/` (`MyStatsStrip`, `MyAlertsWidget`,
`MyTasksWidget`, …); `FE:src/components/reports/components/ReportChart.tsx` (bar and pie only: `ChartSpec.kind` in
`FE:src/components/reports/types.ts` L94); `FE:src/components/ui/chart.tsx` (unused wrapper); `FE:src/contexts/AuthContext.tsx`
L60-68 (`UserRole` union); `FE:src/features/office-scope/index.ts` (`useOfficeScope`, `useReadScope`, `ScopeToggle`, `OfficeBadge`,
`ProviderOptionGroups`, `officeFilter`); `FE:src/utils/uiZoom.ts`; `FE:src/services/schedulerHandoff.ts`
(`openSchedulerForBooking`, `openSchedulerAtAppointment`); `FE:src/features/progress-notes/progressNotesService.ts` (`signNote` →
generated `signProgressNote`); `FE:src/features/signature/SignatureCapture.tsx`; `FE:src/features/letters/LetterDialog.tsx`;
`FE:src/features/sms/`; generated `verifySubscriberEligibility` has no importer outside `src/api/generated`. Backend:
`POST /insurance-subscribers/{subscriber_id}/verify-eligibility` (`app/api/v1/insurance.py` L100-117, body `elig_status`,
`notes`); `POST /progress-notes/{note_id}/sign` (`progress_notes.py` L49); `PATCH /appointments/{appointment_id}/status`
(`scheduler.py` L57; body `status`, `cancellation_reason`, `cancellation_note`, `add_to_call_list`); `POST /sms/send`
(`sms.py` L64-87: one patient per call; 400 `patient_opted_out` / `consent_override_required`, 409 `duplicate_client_id`, 429
`sms_rate_limited`); `POST /letters/render-batch`, `GET /letters/batches` (`letters.py` L70-104);
`GET /insurance-claims/{claim_id}/status-history` (`billing.py` L251); `user_tasks` (`app/db/models/access.py` L32-43: `title`,
`priority`, `is_done`, `due_date`, `notes` — a personal to-do with no assignee, entity link or outcome); `notifications`
(L46-61; no code constructs a `Notification` row); `app/services/access_rights_catalog.py`: `REMOVED_ROWS` (L40-252) contains
`setup_provider_goals_screen_full_control` / `_view_only` (L158-159), so the legacy goal rights are **deleted** by the
curation migration (05 §8.1 reads them as surviving); `ADDED_RIGHTS` (L253-299) contains `dashboard_view`, `my_page_access`,
`office_scope_view_all_offices` (L295-297). Absent in both repositories (grep): any goals table, service or screen; any
assigned-task or follow-up model; any alert rule on metrics; any model-provider client library in the backend.

**Keys.** A dashboard is identified by `dashboards.<name>`, a worklist by `worklists.<name>`; both follow the `report_key`
grammar of 02 §3.1, so favorites, recents, saved views, search, audit and drill targets treat reports, worklists and
dashboards alike. The full dotted key is the value of `{dashboard_key}` in the 02 routes and of `object_key` in
`report_saved_views` / `report_favorites`.

---

## 1. Principles

| # | Rule | How it is enforced |
|---|---|---|
| 1 | **One definition.** A tile, scorecard column, alert, digest line and assistant answer name `metric_key`s of 05 and nothing else: no formula, code list, status list or date rule lives in this layer | Dashboard lint (DASH-01): a tile holds a `MetricQueryRequest` template or a report reference; any key outside the registry fails the build. Two places that show the same key with the same scope and period show the same number because both go through `POST /analytics/metrics/query` |
| 2 | **Visible date basis.** Every value states its period as resolved dates and its basis ("service date", "transaction date", "as of 11/22/2026"); ratios whose components use different bases (collections ÷ production) say so in the definition popover | Period chip on every tile from `periods[]` and the metric's `default_date_basis`; popover from `MetricDefinitionRead.glossary_md` |
| 3 | **As-of time.** A dashboard prints one `data_as_of` (the oldest stamp among its tiles) and the source class (`live`, `rollup`, `snapshot`); a tile whose stamp or `freshness[].status` differs prints its own | `data_as_of`, `freshness[]`, `cache{hit, stale}` of 02 §10.3. `stale` / `failed` render a warning icon and the age; an old number is never shown as current |
| 4 | **Path to rows.** Every value opens the report or worklist whose total reconciles with it; for a ratio the numerator list and the denominator list are offered separately; when a value cannot be decomposed the panel says why | `POST /analytics/metrics/drill` (02 §10.1) with the metric's `drill_report` or the tile's `drill` override (2.0.4); reconciliation = `reconciles_with` (02 §15.3 R5) |
| 5 | **No data is never zero.** `no_data`, `not_available`, `restricted`, `suppressed`, not-configured and tile `error` / `timeout` / `busy` each have their own rendering (3.1); a literal `0` appears only when the metric is `ok` and equals zero | One cell renderer for cards, matrix, scorecards and exports |
| 6 | **Parts sum to totals.** A split always shows its residual member: `other_*` slices, `Unassigned`, `Unallocated`, `other` after a top-N | Identities I-3, I-5, I-6, I-10 of 05 §5.0.3; `include_other` on ranked queries |
| 7 | **Scope is explicit, never a fence.** The office scope is a visible parameter sent with every call; the default is the working office; `all` means every office the caller may read; provider pickers list the office roster first and exclude nobody | `office_scope` of 04 §6; `working_office_id` in the request body (02 §10.4); `ProviderParam` (FLT-13) |
| 8 | **Rights, scope and data classes are decided on the server.** A dashboard opens with its right; a tile is served when the caller also holds a right for the metric's family and its data class, otherwise its points come back `restricted` (the tile degrades, the dashboard does not fail); a provider-restricted caller (PD-11) never receives a total from which another provider's value can be derived | `authorize()` of 02 §10.1; rights and metric-family rule of 08 §2.2 D and §2.3; classes of 08 §5; provider rules PR-1 to PR-9 of 08 §4.2 |
| 9 | **Labels come from the registry** and say gross, charged or net. A dashboard may choose `short_label`, never a different name. The reference labels that hide "net" are not reproduced (05 §6.1 rows 6, 10) | Lint: tile titles are optional and may not contain a metric noun different from the label |
| 10 | **Open, locked and frozen periods are distinguishable.** The open period is marked (MTD, QTD, YTD) with elapsed and total working days; a locked period (PD-9) shows a lock; a frozen value computed under an older definition or settings version shows "definition changed" (05 §10) | `is_partial`, `is_locked` of `periods[]`; `definition_version`, `settings_version` |
| 11 | **Every list leads to an action and every action leaves a record.** Opportunity numbers drill to a worklist, not to a print report; outcomes are stored and measured (section 6) | `worklist_followups`, `worklist_events` (NEW) and `follow_up_completion_pct` |
| 12 | **Colour is never the only signal; every chart has a table.** Direction and band are also an icon and a word; charts offer "show as table" | 3.5; WCAG rules in `research/analytics_ux_patterns.md` §9.1 |

---

## 2. Dashboard catalog

### 2.0 Conventions

#### 2.0.1 Definition model

Dashboards are code-registered definitions (`app/analytics/dashboards/definitions/<name>.py`, NEW; model in
`app/analytics/dashboards/model.py`, NEW), served by `GET /analytics/dashboards/{dashboard_key}` and evaluated by
`POST /analytics/dashboards/{dashboard_key}/data` (02 §10.4). Fields beyond the `{tile_key, kind, title, query, drill}` that 02 names:

| Object | Field | Meaning |
|---|---|---|
| Dashboard | `dashboard_key`, `title`, `description`, `audience[]`, `right_code`, `phase`, `status`, `definition_version` | `audience` ∈ `front_office`, `office_manager`, `provider`, `billing`, `owner`, `executive`; `status` as 02 §3.1 |
| Dashboard | `parameters[]` | 04 parameter objects (2.0.2); same validation pipeline as reports (ENG-06) |
| Dashboard | `views[]` | Optional tabs (`view_key`, `title`, fixed parameter overrides): the Morning Huddle has four. A view is a filter of the tile list, not a second dashboard |
| Dashboard | `sections[]` | `section_key`, `title`, `order`, `collapsed_by_default` |
| Dashboard | `export_report` | `true` (every dashboard of 2.0.6): a twin report definition with the same key is generated for Print / Export / Subscribe (3.6) |
| Tile | `tile_key`, `section_key`, `view_keys[]`, `kind`, `title`, `size` | `kind` per 2.0.3; `size` = columns × rows of a 12-column grid |
| Tile | `query` | A `MetricQueryRequest` template: `metrics[]`, `dimensions[]`, `time_grain`, `include[]`, `order_by[]`, `limit`, `include_other`, plus `bind{}` naming which dashboard parameters feed `date_*`, `as_of`, `compare_to`, scope and `filters{}`. A tile may fix its own window (`date_preset`) and then says so on screen (rule of `analytics_ux_patterns.md` §5.8) |
| Tile | `list_report` | Instead of `query` for `list` tiles: `{report_key, params, block, limit, sort_by}`; evaluated as an `instant` run or a live page of a worklist |
| Tile | `drill` | Override of the metric's `drill_report`: `{report_key, param_map}` (2.0.4) |
| Tile | `matrix_key`, `block_key` | For `matrix_block`: blocks with the same `matrix_key` render as one grid (3.3) |
| Tile | `visible_when` | Expression of the 02 §3.2 grammar (`["ctx", "multi_office"]`, `["ctx", "provider_restricted"]`, parameter tests) |
| Tile | `hide_when_restricted` | When every point of the tile is `restricted` the tile is not drawn (used by the money tiles of the Morning Huddle); default false: the tile shows the restricted state |
| Tile | `phase`, `requires[]` | A tile joins a shipped dashboard when its metrics ship. `requires` names availability codes of 05 §1.7; an unavailable tile renders the "history starts on" state, it is not removed |

Lint (DASH-01): every metric key, dimension and filter key exists and is allowed for the metric (05 §1.2); every drill
target exists in the report registry, is served no later than the tile's phase (otherwise the phase fall-back of 2.0.4
applies) and every `param_map` key is a parameter of the target; a ratio is never requested as
`sum`; a tile with a ranking sets `include_other`; `matrix_block` tiles hold at most 12 metrics (02 §10.1) and one grain.

#### 2.0.2 Header parameters shared by all dashboards

| Parameter (value keys) | 04 type / component | Default | Applies to |
|---|---|---|---|
| `office_scope` (`office_ids`, `office_group_id`, `all_offices`) | `office_scope` / `OfficeScopeParam` | `current_office` | Every tile. Offices dropped by rights are listed in a notice ("3 of 5 offices included") |
| `date_range` (`date_from`, `date_to`, `date_preset`) | `date_range` / `DateRangeParam` | per dashboard (2.0.6) | Flow metrics; trends use it as the trend range |
| `as_of` | `date` | `today` | Point-in-time metrics (05 §1.3). A past date is served from snapshots (05 §10) and labelled |
| `compare_to` | enum → `MetricQueryRequest.compare_to` | `previous_year` on trends, `previous_period` on day and week cards | `none` · `previous_period` (`align = calendar` or `weekday`) · `previous_year` · `goal` · `custom` |
| `provider_ids` | `entity_multi` / `ProviderParam` | `all` | Dashboards with provider slices; forced to the caller's provider under PD-11 |
| `production_group` | enum `all` · `doctor` · `hygiene` · `other` | `all` | Filter `production_group` of the O/P dimension set (05 §1.5) |
| `time_grain` | enum | `month` | Matrix and trend tiles; allowed grains per metric (05 `time_grains[]`) |
| `periods_back` | integer 6 · 12 · 13 · 24 | 12 | Matrix |

Dashboards apply parameter changes live with a 400 ms debounce; multi-selects apply when the popover closes
(`analytics_ux_patterns.md` §3.1). State is in the URL as value keys only (FLT-19).

#### 2.0.3 Tile kinds

| `kind` | Component (section 3) | Query shape |
|---|---|---|
| `kpi` | `KpiCard` | 1 metric, `time_grain = none`, `include[] = sparkline, definition`, optional `compare_to`. Goal values: in P3 the tile also queries `production_goal`, `production_vs_goal_pct`, `daily_avg_needed_to_goal` as ordinary metrics (MET-17); `include[] = goal` (target and band of any metric) arrives with the goal overlay of ENG-51 in P4 |
| `kpi_group` | row of `KpiCard`s sharing one request | ≤ 12 metrics, `time_grain = none` |
| `matrix_block` | `MetricMatrix` | ≤ 12 metrics, `time_grain` = month (week, quarter), `include[] = total` plus the summary values of 3.3, `compare_to = previous_year` on demand; the Goal column is the `production_goal` metric row in P3 and `include[] = goal` from P4 |
| `trend` | `TrendChart` | 1-4 metrics over time, optional 1 dimension |
| `bars` | `BarsChart` (grouped, stacked, horizontal ranking) | 1-3 metrics by 1 dimension, `order_by`, `limit`, `include_other` |
| `aging` | `AgingBars` | `ar_aging_amount` or `outstanding_claims_amount` by `aging_bucket` / `claim_age_bucket` |
| `funnel` | `FunnelChart` | 1 metric by a stage dimension (`funnel_stage`, `waterfall_stage`) |
| `heatmap` | `HeatmapGrid` | 1 metric by 2 dimensions or dimension × time grain |
| `scorecard` | `Scorecard` | N metrics by 1 member dimension (`provider_id`, `office_id`, `user_key`, `carrier_id`); v1 from P2 without rank or peers, v2 from P4 (3.4) |
| `ranking` | `RankingTable` | 1 normalised metric by `office_id` or `provider_id` with `rank`, peers (P4, ENG-51) |
| `list` | embedded result table, at most 10 rows + "open" | `list_report` |
| `narrative` | insight strip (P5) | assistant summary of the dashboard's own tile results (8.4) |

#### 2.0.4 Drill targets

Parameter mapping applied by every drill (the metric's `param_map`, 05 §1.2): clicked period → `date_from` / `date_to` (or
`report_date` for an as-of value) · dashboard scope narrowed to the clicked office member → `office_ids` / `office_group_id`
/ `all_offices` · clicked provider → `provider_ids` · clicked carrier → `carrier_ids` · clicked category or code →
`procedure_category_codes` / `procedure_codes` · clicked user → `user_ids` · the tile's `date_basis` → `date_basis`. A slice
by `production_group` drills with `provider_ids` = the providers of that group. Written `{std}` in the tile tables.
Legacy `report_key`s below are the expected keys (final keys and option values are owned by `catalog/*`; the lint of
DASH-01 runs against the registry).

| Metric family (keys of 05) | Drill target | Extra parameters |
|---|---|---|
| `gross_production`, `charged_production`, `net_production`, their slices, `production_per_visit`, `production_per_hour`, `production_per_working_day`, `procedures_done`, `procedure_count`, `revenue_per_procedure`, `category_production_share_pct`, hygiene, perio, fluoride and exam counts | `daily.production_report` | `date_basis = service_date`; `group_by` = the clicked dimension; code-group tiles pass the group's codes |
| `production_adjustments`, `collection_adjustments`, `unclassified_adjustments`, `refunds`, `bad_debt_amount` | `daily.special_transaction_report` | `payment_adjustment_codes` = codes of the clicked `txn_class` |
| `scheduled_production`, its slices, the scheduled part of `production_forecast` | `daily.scheduled_production` | appointment-date range |
| `gross_collections`, `net_collections`, `patient_collections`, `insurance_collections`, their slices, numerator of `collection_pct` | `daily.collection_report` | `date_basis = transaction_date`; `payment_types` for a payer or tender member |
| `provider_income`, `provider_collection_pct`, allocation-attributed slices (P2) | `monthly.income_allocation` | — |
| `otc_collection_pct`, `uncollected_copay_amount` | `management.uncollected_copay` | — |
| `undeposited_payments_amount` | `daily.deposit_slip` | — |
| `total_ar`, `ar_debit_balance`, `patient_ar`, `insurance_ar_estimated`, `ar_aging_amount`, `ar_over_90_amount`, `ar_over_90_pct`, `ar_days` | `monthly.aging_report`; `monthly.aging_report_by_home_office` when `ar_office_attribution = home_office` | `report_date`; `aging_buckets` = clicked bucket |
| `patient_ar_past_due_amount`, `ar_of_todays_patients` | `worklists.patient_ar` | `aging_buckets`; today's-patients filter |
| `credit_balances` | `worklists.unallocated_credits` | `only_credit_balances = true` |
| `outstanding_claims_amount`, `outstanding_claims_count`, `claims_over_90_pct`, `claim_days_to_payment` | `worklists.outstanding_claims` (print: `insurance.outstanding_claims`) | `carrier_ids`, `coverage_orders`, `aging_buckets` |
| `claims_unsent_count`, `unbilled_production_amount`, `unbilled_production_pct`, `procedures_on_hold_amount` | `worklists.unbilled_procedures` (print: `insurance.claims_created_not_sent`, `insurance.claims_not_created`, `insurance.procedures_on_hold`) | stage |
| `claims_submitted_count`, `same_day_claim_rate_pct`, `claim_submission_lag_days`, `denial_rate_pct`, `first_pass_claim_rate_pct`, `insurance_estimate_accuracy_pct` | `insurance.claims_list` | `claim_status` |
| `eligibility_verified_pct` | `worklists.eligibility_verification` | appointment-date range |
| `benefits_remaining_amount` | `insurance.benefits_used_unused` | — |
| `appointments_scheduled`, `appointments_booked`, `appointments_kept`, `appointments_cancelled`, `appointments_no_show`, the three rate metrics, `booked_hours`, `chair_hours`, `provider_utilization_pct`, `chair_utilization_pct`, `open_time_pct`, `scheduled_exams` | `appointment.appointment_list` | `appointment_statuses` = clicked class; `operatory_ids` |
| `broken_appointment_recovery_pct`, `broken_appointment_value_lost` | `worklists.broken_appointments` | — |
| `unresolved_past_appointments` | `worklists.unresolved_appointments` (print: `appointment.missed_appointments_not_marked_as_missed`) | — |
| `unconfirmed_appointments`, `confirmation_rate_pct` | `worklists.unconfirmed_appointments` | — |
| `patient_visits`, `patients_seen`, `visits_per_working_day`, `recare_patients_seen` | `lists.patients_seen` | — |
| `reappointment_pct`, `reappt_at_visit_pct`, `reappt_holds_now_pct`, the hygiene reappointment keys, `new_patient_reappointment_pct`, `treatment_reappointment_pct` | `worklists.not_reappointed` | `visit_kind` = `any` · `hygiene` · `new_patient` · `treatment` |
| `pre_appointment_pct`, `unscheduled_active_patients`, `at_risk_patients`, `lapsed_patients`, `patients_lost`, `attrition_rate_pct` | `worklists.reactivation` | `months_since_last_visit_band` |
| `recall_overdue_patients`, `recall_overdue_pct`, `recall_due_unscheduled_patients`, `recare_active_pct` | `worklists.recall_due` (print: `recall.recall_due_report`) | — |
| `treatment_presented_amount`, `patients_presented`, the case-acceptance keys, `treatment_funnel_amount`, `case_completion_pct` | `treatment_plan.treatment_plan_status` | `date_basis = diagnosed_date`; `treatment_plan_status` = clicked stage |
| `unscheduled_treatment_amount`, `unscheduled_treatment_patients`, `pending_treatment_of_todays_patients`, `preauthorized_pct` | `worklists.unscheduled_treatment` | `acceptance_state` |
| `new_patients` and its variants, `new_patients_projected` | `lists.patient_list_new_patient` | — |
| `new_patients_scheduled` | `appointment.new_patients_via_appointments` | — |
| `active_patients`, `insured_patient_share_pct`, demographic slices | `lists.patient_list` | `patient_status` |
| `referral_source_production`, source shares | `referral.referral_production_list` | — |
| `outbound_referrals`, `referral_out_rate_pct` | `referral.referred_out_list` | — |
| `online_booking_requests`, `online_booking_conversion_pct` | `lists.online_registered_patients` | — |
| `lab_cost_amount`, `lab_cost_pct`, `lab_turnaround_days` | `appointment.lab_cost_report`, `appointment.lab_report` | — |
| Ortho keys (05 §5.11) | `ortho.ortho_report`; `ortho.missing_ortho_visits`; `ortho.ortho_compliance_report`; instalments → `management.payment_plan_charges` | — |
| `payments_posted_amount`, `charges_posted_amount`, `adjustments_posted_amount` | `daily.daily_journal` | `user_ids` |
| `voided_entries_count`, `backdated_entries_count` | `management.audit_trail` | — |
| `missing_progress_notes_count`, `daily_audit_exceptions_count` | `daily.daily_audit` | — |
| `unsigned_progress_notes_count` | `worklists.unsigned_progress_notes` | — |
| `clocked_hours`, `hygienist_production_to_wage_ratio` | `management.time_clock_report` | — |
| `follow_up_completion_pct` | `worklists.my_followups` | supervisor view |
| Organisation and group values of any metric | the same dashboard with `office_ids` = the clicked office | — |
| Denial counts and amounts (P3, after DATA-31) | `worklists.denied_claims` (print: `insurance.claims_list`, `claim_status` = denied) | `carrier_ids` |

**Drill fall-back by phase.** A tile that ships before its worklist drills to the worklist's print counterpart until the
worklist ships; the drill map switches by the installed phase, the tile does not change.

| Worklist target | Served from | Until then, tiles drill to |
|---|---|---|
| `worklists.not_reappointed` | P1 as a read-only list (DASH-53: ordinary `instant` run, row click opens the patient, no follow-up state); worklist actions from P3 | — |
| `worklists.outstanding_claims` | P3 | `insurance.outstanding_claims` (P2) with `carrier_ids`, `coverage_orders`, `aging_buckets` |
| `worklists.unbilled_procedures` | P3 | by clicked stage: `insurance.claims_not_created` (unbilled), `insurance.procedures_on_hold` (hold), `insurance.claims_created_not_sent` (unsent) |
| `worklists.patient_ar` | P3 | `monthly.aging_report_by_home_office` (`aging_buckets`); `monthly.aging_report` under transaction-office attribution |
| `worklists.unallocated_credits` | P3 | `monthly.unallocated_payment_adjustments` |
| `worklists.day_close_checklist` | P2 | — |
| Every other worklist of section 6 | P3 | — (every tile that drills to them is P3 or later) |

#### 2.0.5 Rights

The codes are owned by 08 §2.2 (catalog revision 2); this table maps the dashboards of this document to them, which 08
left provisional. Rule of 08 §2.3 and §5.6: the dashboard right opens the dashboard; a tile is served when the caller also
holds a right that lists the metric's family (the dashboard right of that family, or the View Only code of the report family
with the same name) and the metric's data class; otherwise its points come back `restricted`. The ten legacy
`denticon_practice_analytics_*` codes stay deleted [A] (`analysis/fe_cross_cutting.md` §5.5 D).

| Dashboard or feature | Right that opens it (08 §2.2) | Notes |
|---|---|---|
| `dashboards.main` | `dashboard_view` [V, exists; granted to every seeded group by 08 §2.4] | Rows of a metric family the caller holds no right for show `restricted` |
| `dashboards.executive_summary` | `dashboard_view` | Mapping accepted by 08 §13.3; `dashboard_view` serves no tile by itself, so each tile needs its family right |
| `dashboards.provider` | `analytics_provider_dashboard_view` | `self_unless_privileged`: other providers only for privileged roles or holders of `reports_view_all_providers` (08 §4.2) |
| `dashboards.my` | family `my_reports`: `reports_my_reports_view` / `reports_my_reports_full_control` [A, kept codes] | `self_always`; the caller's own values carry `provider_comp` implicitly (08 PR-6) |
| `dashboards.production` | `analytics_production_dashboard_view` | — |
| `dashboards.collections_ar` | any of `analytics_collections_dashboard_view`, `analytics_ar_dashboard_view` | Collections tiles and A/R tiles each follow their own family |
| `dashboards.insurance_rcm` | `analytics_insurance_dashboard_view` | — |
| `dashboards.morning_huddle` | `analytics_morning_huddle_view` | Production and A/R tiles only for holders of those families. 08 §2.4 derives the code from the `appointment` family, which the seeded Front Desk group and the Doctor preset lack; granting it to every seeded group, like `dashboard_view`, is requested (12.4) |
| `dashboards.front_office`, `dashboards.schedule_capacity` | `analytics_scheduling_dashboard_view` | — |
| `dashboards.hygiene_recall` | `analytics_hygiene_recall_dashboard_view` | — |
| `dashboards.treatment` | `analytics_treatment_plan_dashboard_view` | — |
| `dashboards.patients`, `dashboards.referrals_marketing` | `analytics_patients_dashboard_view` | — |
| `dashboards.ortho` | View Only code of the report family `ortho` (`reports_ortho_reports_view_only`, restored by 08) | Mapping accepted by 08 §13.3 |
| `dashboards.multi_office` | `analytics_office_comparison_view`; `all_offices` also needs `office_scope_view_all_offices` [V, exists] | Needs more than one office in scope |
| Scorecards across providers (3.4) | `analytics_provider_scorecards_view` | Class `provider_comp` |
| Goals (section 4) | `analytics_goals_view`, `analytics_goals_manage` | The legacy `setup_provider_goals_screen_*` codes are deleted [V] and are not restored by 08 |
| Alerts and digests (section 7) | `reports_schedule_own`; naming other recipients needs `reports_share` | Action rights of 08 §2.2 B |
| Assistant (section 8) | `analytics_assistant_use` | Off by default (08 §9 L-1) |
| Print and export of a dashboard | The capability table of 08 §2.1 applied to the twin report (3.6); XLSX and CSV also need `reports_export_data_files` | The analytics codes have one level: whether it includes print and subscribe is a request to 08 (12.4) |
| Worklists (section 6) | The report family of the legacy counterpart (08 §2.3), listed per worklist in section 6 | Actions need their own right (6.2) |

Open point between 05 and 08: 08 §2.3 keys the tile rule on `metric_family` (`production`, `collections`, `ar`, `insurance`,
`scheduling`, `treatment_plan`, `recall`, `patients`, `referrals`, `payroll`), while 05 §1.2 classifies metrics by `group`
(13 values). The two must become one vocabulary before the lint of DASH-01 can check tiles against rights (12.4).

#### 2.0.6 Catalog

Freshness: **live** = computed from the `rpt_*` views with the 60 s metric cache (02 §10.3); **snapshot** = point-in-time
trends from the nightly rows of 05 §10; **rollup** = P4 sources (ENG-50) with a live tail, same tiles.

| `dashboard_key` | Title | Audience | Default period | Freshness (P1-P3 → P4) | Right (2.0.5) | Phase |
|---|---|---|---|---|---|---|
| `dashboards.main` | Main Dashboard | owner, office manager | trailing 12 months + month to date | live → rollup; closed months frozen from P2 | `dashboard_view` | P1 |
| `dashboards.provider` | Provider Dashboard | owner, office manager | trailing 12 months | live → rollup | `analytics_provider_dashboard_view` | P1 |
| `dashboards.my` | My Dashboard | provider, team member | month to date + trailing 12 months | live | family `my_reports` | P1 |
| `dashboards.production` | Production analysis | owner, office manager | month to date | live → rollup | `analytics_production_dashboard_view` | P2 |
| `dashboards.collections_ar` | Collections and A/R | office manager, billing, owner | month to date; A/R as of today | live; A/R trend snapshot | `analytics_collections_dashboard_view` or `analytics_ar_dashboard_view` | P2 |
| `dashboards.insurance_rcm` | Insurance and revenue cycle | billing, office manager | as of today; flows last 90 days | live; backlog trend snapshot | `analytics_insurance_dashboard_view` | P2 |
| `dashboards.executive_summary` | Executive summary | owner, executive | last closed month, with year to date | frozen month-end rows; live for the open month | `dashboard_view` | P2 |
| `dashboards.morning_huddle` | Morning Huddle | whole office team | yesterday · today · next two working days · month to date | live | `analytics_morning_huddle_view` | P3 |
| `dashboards.front_office` | Front office | front office, office manager | today and the next 7 days | live | `analytics_scheduling_dashboard_view` | P3 |
| `dashboards.schedule_capacity` | Schedule and capacity | office manager, front office | last 30 days and next 10 open days | live; state trends snapshot | `analytics_scheduling_dashboard_view` | P3 |
| `dashboards.hygiene_recall` | Hygiene and recall | hygienists, office manager | month to date and trailing 12 months | live; recall trend snapshot | `analytics_hygiene_recall_dashboard_view` | P3 |
| `dashboards.treatment` | Treatment plans and case acceptance | doctors, treatment coordinators | last 90 days presented | live | `analytics_treatment_plan_dashboard_view` | P3 |
| `dashboards.patients` | Patients | owner, office manager, marketing | trailing 12 months; counts as of today | live; state trend snapshot | `analytics_patients_dashboard_view` | P3 |
| `dashboards.referrals_marketing` | Referrals and marketing | owner, marketing | trailing 12 months | live | `analytics_patients_dashboard_view` | P3 |
| `dashboards.ortho` | Ortho | orthodontists, office manager | month to date; contracts as of today | live | report family `ortho` | P3 |
| `dashboards.multi_office` | Multi-office comparison | executive, regional manager | last closed month and trailing 12 months | rollup | `analytics_office_comparison_view` | P4 |

Coverage of the legacy analytics product (`research/denticon_analytics_and_dso.md` §8.5; metric mapping in 05 §7): Morning
Huddle → `dashboards.morning_huddle` · Production Analysis → `dashboards.production` · Collections Analysis →
`dashboards.collections_ar` + `dashboards.insurance_rcm` · Provider Breakdown → `dashboards.provider` and the scorecards of
3.4 · Treatment Plan Analysis → `dashboards.treatment` · Front Office → `dashboards.front_office` · Hygiene Recall →
`dashboards.hygiene_recall` · Patient Visit Analysis → `dashboards.patients` + `dashboards.schedule_capacity`. The two
reference dashboards (`analysis/reference_screenshots.md` §2-§3) → `dashboards.main` and `dashboards.provider`.

Comparison codes used in the tile tables: **PP** previous period · **PP-wd** previous period aligned by weekday · **PY** same
period last year · **G** goal or target band (section 4) · **PEER** organisation value, median office and top-quartile office
(section 5) · **B** shipped band colour only · **—** none. "Ph" = first phase in which the tile is served (the phase of its
metric in 05).

### 2.1 Main Dashboard — `dashboards.main`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| Owner, office manager | The reference "Main Dashboard" with every reference row, the third bucket the reference hides, and the rows it lacks; one screen that answers "how is the practice trending" | `office_scope`, `periods_back`, `time_grain`, `production_group` (for non-slice rows), matrix options of 3.3 | 12 months ending with the open month, newest first (reference order) | P1 (v1), P2 and P3 rows join as their metrics ship |

Header strip (`kpi_group`, period = month to date, `compare_to = previous_year` on the same calendar days):

| Tile | `metric_key` | Visual | Comparison | Drill target | Ph |
|---|---|---|---|---|---|
| Net production | `net_production` | KPI card + 12-month sparkline | PY, G (`production_vs_goal_pct`, P3) | `daily.production_report` {std} | P1 |
| Net collections | `net_collections` | KPI card | PY | `daily.collection_report` {std} | P1 |
| Collection % | `collection_pct` with `collection_pct_rolling_90d` beside it (P2) | KPI card | B 95 / 98 | numerator `daily.collection_report`, denominator `daily.production_report` | P1 |
| New patients | `new_patients` | KPI card | PY | `lists.patient_list_new_patient` {std} | P1 |
| Hygiene reappointment % | `hygiene_reappointment_pct` | KPI card | B 85 / 90 | `worklists.not_reappointed` (`visit_kind = hygiene`) | P1 |
| Total A/R | `total_ar` with `ar_over_90_pct` | KPI card, as of today | PP (month-end snapshot) | `monthly.aging_report` (`report_date`) | P2 |

Matrix (`matrix_key = main`; visual = `MetricMatrix` row; per-cell comparison PY and G on demand, 3.3). "Ref" = row number
in `analysis/reference_screenshots.md` §2.3; "+" = added by us. Range summary: **Σ** sum of the periods · **R** ratio
recomputed over the range from summed components · **D** distinct count recomputed over the range · **PIT** value at each
period end, range column = latest value.

| Block | Row label | `metric_key` | Ref | Range | Drill target | Ph |
|---|---|---|---|---|---|---|
| Production | Gross production (office fee) | `gross_production` | 1 | Σ | `daily.production_report` {std}, `include_ucr = true` | P1 |
| Production | Doctor / Hygiene / Other gross production | `doctor_gross_production`, `hygiene_gross_production`, `other_gross_production` | 2, 3, + | Σ | same, providers of the group | P1 |
| Production | Charged production | `charged_production` | + | Σ | `daily.production_report` {std} | P1 |
| Production | Production adjustments | `production_adjustments` | + | Σ | `daily.special_transaction_report` {std} | P1 |
| Production | Net production | `net_production` | 4 | Σ | `daily.production_report` {std} | P1 |
| Production | Doctor / Hygiene / Other net production | `doctor_net_production`, `hygiene_net_production`, `other_net_production` | 5, 6, + | Σ | same, providers of the group | P1 |
| Production | Unclassified adjustments (row shown only when not zero in the range) | `unclassified_adjustments` | + | Σ | `daily.special_transaction_report` {std} | P1 |
| Collections | Gross collections | `gross_collections` | 7 | Σ | `daily.collection_report` {std} | P1 |
| Collections | Doctor / Hygiene / Other gross collections | `doctor_gross_collections`, `hygiene_gross_collections`, `other_gross_collections` | 8, 9, + | Σ | same, providers of the group (P1: payment provider; P2: `monthly.income_allocation`) | P1 |
| Collections | Net collections (reference "Total Collection") | `net_collections` | 10 | Σ | `daily.collection_report` {std} | P1 |
| Collections | Doctor / Hygiene / Other net collections | `doctor_net_collections`, `hygiene_net_collections`, `other_net_collections` | 11, 12, + | Σ | as rows 8-9 | P1 |
| Collections | Collection % · rolling 90 days | `collection_pct`, `collection_pct_rolling_90d` | + | R | both component lists | P1 · P2 |
| Capacity and schedule | Booked hours (reference "Working Hours") | `booked_hours` | 13 | Σ | `appointment.appointment_list` {std} | P1 |
| Capacity and schedule | Clocked hours | `clocked_hours` | + | Σ | `management.time_clock_report` {std} | P2 |
| Capacity and schedule | Working days | `working_days` | + | Σ | — (calendar; popover lists the days) | P1 |
| Capacity and schedule | Production per visit · per hour · per working day | `production_per_visit`, `production_per_hour`, `production_per_working_day` | 14, +, + | R | numerator `daily.production_report`, denominator `lists.patients_seen` / `appointment.appointment_list` | P1 |
| Capacity and schedule | Scheduled production | `scheduled_production` | 15 | Σ | `daily.scheduled_production` {std} | P1 |
| Capacity and schedule | Doctor / Hygiene / Other scheduled production | `doctor_scheduled_production`, `hygiene_scheduled_production`, `other_scheduled_production` | 17, 16, + | Σ | same, providers of the group | P1 |
| Rates | Case acceptance % | `case_acceptance_pct` | 18 | R | `treatment_plan.treatment_plan_status` {std} | P1 (DATA-56) |
| Rates | Hygiene reappointment % | `hygiene_reappointment_pct` | 19 | R | `worklists.not_reappointed` (`visit_kind = hygiene`) | P1 |
| Rates | Treatment reappointment % | `treatment_reappointment_pct` | 20 | R | `worklists.not_reappointed` (`visit_kind = treatment`) | P1 (DATA-56) |
| Patients and visits | Patient visits · Patients seen | `patient_visits`, `patients_seen` | + | Σ · D | `lists.patients_seen` {std} | P1 |
| Patients and visits | New patients | `new_patients` | + | Σ | `lists.patient_list_new_patient` {std} | P1 |
| Patients and visits | Active patients | `active_patients` | + | PIT | `lists.patient_list` (`patient_status = active`) | P1 (past month ends recomputed from visit history and marked `recomputed`; frozen rows from P2) |
| Patients and visits | Hygiene visits | `hygiene_visits` | + | Σ | `daily.production_report` (hygiene-visit codes) | P1 |
| Schedule quality | Appointments kept | `appointments_kept` | + | Σ | `appointment.appointment_list` | P1 |
| Schedule quality | No-show rate · Cancellation rate | `no_show_rate_pct`, `cancellation_rate_pct` | + | R | `appointment.appointment_list` (`appointment_statuses`) | P1 |
| Schedule quality | Provider utilisation | `provider_utilization_pct` | + | R | `appointment.appointment_list` | P3 |
| Receivables | Total A/R · A/R over 90 days % · Days in A/R | `total_ar`, `ar_over_90_pct`, `ar_days` | + | PIT | `monthly.aging_report` (`report_date` = period end) | P2 |
| Receivables | Outstanding claims | `outstanding_claims_amount` | + | PIT | `worklists.outstanding_claims` (P2: `insurance.outstanding_claims`, 2.0.4 fall-back) | P2 |
| Goal | Production goal · Production versus goal | `production_goal`, `production_vs_goal_pct` | + | Σ · R | goal rows (section 4) | P3 |

Rules specific to this dashboard: doctor, hygiene, other is the row order in every block (the reference swaps block 5; 05
§6.1 row 16). The three slices of a family sum to the family row in every cell (I-3); the metric service checks it and
returns the warning `parts_mismatch` (request 12.4), and the grid shows a data-quality marker on the family label when the
warning is present. Rows whose metric is app-era only render "history
starts on <date>" for earlier months (05 §1.7), never 0. Closed months come from frozen `month_end` rows once MET-12 runs
(P2); before that every month is live and labelled "open period — live figures" (03 §9.3).

### 2.2 Provider Dashboard — `dashboards.provider`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| Owner, office manager; a provider for their own block (PD-11) | The reference "Provider Dashboard": the same matrix per provider, aligned, with the rows the reference lacks | `office_scope`, `provider_ids` (roster first), `production_group`, hide-inactive (default on), `periods_back`, mode `by_provider` · `compare` | 12 months, providers of the working office with a non-zero row in the range | P1 |

Modes: **by provider** — one provider at a time (switcher) or a stack of blocks with shared column positions (print layout:
one block per provider, page break per provider); **compare** — one metric, rows = providers plus `Unassigned` and the
office value, columns = periods (3.3 compare mode). A provider with no non-zero value in the range is hidden while
hide-inactive is on and stays selectable (legacy scorecard visibility rule `[DPA]`). Provider attribution is the metric's
(05 §1.5); the header prints it ("credited provider: hygienist when recorded").

| Block | Row label | `metric_key` (by `provider_id`) | Ref | Range | Drill target | Ph |
|---|---|---|---|---|---|---|
| Money | Gross production · Charged production | `gross_production`, `charged_production` | 1, + | Σ | `daily.production_report` {std}, `provider_ids` | P1 |
| Money | Net production | `net_production` | 2 | Σ | same | P1 |
| Money | Net collections (reference "Total Collection") | `net_collections` | 3 | Σ | `daily.collection_report` (P1, payment provider) → `monthly.income_allocation` (P2, allocation) | P1 |
| Money | Provider income · Provider collection % · Adjustment rate | `provider_income`, `provider_collection_pct`, `provider_adjustment_rate_pct` | + | Σ · R · R | `monthly.income_allocation`; `daily.special_transaction_report` | P2 |
| Volume | Appointments on the books | `appointments_booked` | 4 | Σ | `appointment.appointment_list` (`appointment_provider_ids`) | P1 |
| Volume | Patients seen · Patient visits · New patients | `patients_seen`, `patient_visits`, `new_patients` | 5, +, + | D · Σ · Σ | `lists.patients_seen`; `lists.patient_list_new_patient` | P1 |
| Productivity | Scheduled hours (reference "Working Hours") | `provider_scheduled_hours` | 6 | Σ | — (schedule template; "schedule not configured" when `hours_source = 'default'`; DATA-55) | P1 |
| Productivity | Working days · Clinical hours | `provider_working_days`, `clinical_hours` | + | Σ | `appointment.appointment_list` | P1 |
| Productivity | Production per visit | `production_per_visit` | 7 | R | component lists | P1 |
| Productivity | Scheduled production | `scheduled_production` | 8 | Σ | `daily.scheduled_production` | P1 |
| Productivity | Production per hour (reference "Hourly Production") · per working day | `production_per_hour`, `production_per_working_day` | 9, + | R | component lists; the popover names the hours source | P1 |
| Productivity | Utilisation | `provider_utilization_pct` | + | R | `appointment.appointment_list` | P3 |
| Same day | Same-day treatment | `same_day_treatment_amount` | 10 | Σ | `daily.production_report` filtered to unplanned same-day lines (drill-only parameter, 12.4) | P1 |
| Rates | Treatment reappointment % (doctors) / Hygiene reappointment % (hygienists) | `treatment_reappointment_pct` / `hygiene_reappointment_pct` | 11 | R | `worklists.not_reappointed` | P1 |
| Rates | Case acceptance % | `case_acceptance_pct` | + | R | `treatment_plan.treatment_plan_status` | P1 |
| Rates | Retention of recare patients (12 months) | `provider_retention_12m_pct` | + | R | `lists.patients_seen` (cohort) | P3 |
| Rates | No-show rate · Cancellation rate | `no_show_rate_pct`, `cancellation_rate_pct` | + | R | `appointment.appointment_list` | P1 |
| Goal | Production versus goal | `production_vs_goal_pct` | + | R | goal rows | P3 |

Restricted caller: `provider_ids` is forced to `users.report_access_provider_id`, the switcher and compare mode are hidden,
and no office value, rank or share is returned (02 §10.1; 08 §4.2 PR-4, PR-8). All values
sliced by provider are class `provider_comp` (05 §1.6).

### 2.3 My Dashboard — `dashboards.my`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| A user linked to a provider; any other user for the team-member view | "How am I doing": the provider dashboard locked to the caller, today's and this month's position, own open work | `office_scope` (offices where the provider works; default working office), `date_range` | month to date; matrix 12 months | P1 (provider view), P3 (team-member view, own work tiles) |

Definition `scope.provider_restriction = self_always`: `provider_ids` is the provider behind `report_access_provider_id`
for every caller, privileged roles included (they use `dashboards.provider` for others). A user with no provider link gets
the team-member view; a user with neither production nor user-level activity gets an explanation, not an empty grid. The
tiles are also embedded in the existing My Page (`FE:src/components/my-page/`), replacing the client-computed
`MyStatsStrip`.

| Tile | `metric_key`(s), sliced to the caller | Visual | Comparison | Drill target | Ph |
|---|---|---|---|---|---|
| My production | `net_production`, `production_per_working_day` | KPI cards | PY; G (`production_vs_goal_pct`, `daily_avg_needed_to_goal`) from P3 | `my_reports.production_report` | P1 |
| My schedule value | `scheduled_production` for today, next working day, rest of month | KPI group | G (daily goal) from P3 | `daily.scheduled_production` | P1 |
| My patients | `patients_seen`, `patient_visits`, `new_patients` | KPI group | PY | `lists.patients_seen` | P1 |
| My rates | doctor: `case_acceptance_pct`, `treatment_reappointment_pct`, `same_day_treatment_amount`; hygienist: `hygiene_reappointment_pct`, `hygiene_production_per_visit`, `perio_patient_pct`, `fluoride_rate_pct` | KPI group | B; peer values follow 08 PR-8 and SC-1: a peer mean only when at least `min_peer_group` (default 5) other providers contribute, the caller not counted; a median or quartile tick only from `min_peer_group_quantiles` (default 10) others; below that the point is `suppressed`; minimum and maximum of others are never returned | `worklists.not_reappointed`; `treatment_plan.treatment_plan_status` | P1 (doctor set, `hygiene_reappointment_pct`) / P3 (other hygienist rates) |
| My matrix | rows of 2.2 | `MetricMatrix` | PY | as 2.2 | P1 |
| My open work | `unsigned_progress_notes_count`, `missing_progress_notes_count`; own follow-ups | counters + `list` | — | `worklists.unsigned_progress_notes`; `my_reports.missing_progress_notes`; `worklists.my_followups` | P3 |
| Team-member view | own `user_key` slices: `appointments_created`, `payments_posted_amount`, `charges_posted_amount`, `follow_up_completion_pct` | KPI group | PP | `my_reports.daily_journal`; `worklists.my_followups` | P3 |

### 2.4 Morning Huddle — `dashboards.morning_huddle`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| The whole office team, on a wall screen, a tablet or a phone | The daily 10-minute meeting: what happened yesterday, what today holds, what the next days need, where the month stands; every opportunity number opens a worklist | `office_scope` (one office by default; an office set shows the per-office table), `provider_ids` with the legacy "active providers" toggle (providers with a live appointment today / this month), reference date (default `today`) | four views; reference date = office-local today | P3 |

Sources: canonical huddle set of `research/dental_kpi_dictionary.md` §5.2; legacy definitions in 05 §7.1. "Yesterday" = the
previous working day of the office (`working_days` calendar), compared with the same weekday of the previous week. Money tiles
degrade to `restricted` for callers without the `production` or `ar` family or the class `financial_practice`; they set
`hide_when_restricted`, so they are not drawn at all (the "hide production figures" mode of
`research/competitor_analytics_teardown.md` §6 idea 45).

| View | Tile | `metric_key`(s) | Visual | Comparison | Drill target | Ph |
|---|---|---|---|---|---|---|
| Yesterday | Production | `net_production` against `production_goal` (day) | KPI card with goal bar | G, PP-wd | `daily.production_report` | P3 |
| Yesterday | Collections | `net_collections`; `patient_collections`, `insurance_collections`, `collection_adjustments` | KPI card + 3 sub-values | PP-wd | `daily.collection_report` | P3 |
| Yesterday | Patients | `patients_seen`, `new_patients_first_visit`, `recare_patients_seen` | KPI group | PP-wd | `lists.patients_seen` | P3 |
| Yesterday | Unplanned and schedule variance | `same_day_treatment_amount`; `actual_vs_scheduled_production_pct` | KPI group | — | `daily.production_report` | P3 · P4 |
| Yesterday | Presented and accepted | `treatment_presented_amount`, `case_acceptance_dollars_same_day_pct` | KPI group | B | `treatment_plan.treatment_plan_status` | P3 |
| Yesterday | Left without a next visit | `reappointment_pct`, `hygiene_reappointment_pct`, `new_patient_reappointment_pct` + list of patients, groupable by carrier | KPI group + `list` | B 85 / 95 | `worklists.not_reappointed` | P3 |
| Yesterday | Broken appointments | `appointments_no_show`, `appointments_cancelled`, `broken_appointment_value_lost` | KPI group | PP-wd | `worklists.broken_appointments` | P3 |
| Yesterday | Money at the desk | `otc_collection_pct`, `uncollected_copay_amount` | KPI group | B 80 / 95 | `management.uncollected_copay` | P3 |
| Yesterday | Day hygiene | `unsigned_progress_notes_count`, `missing_progress_notes_count`, `daily_audit_exceptions_count`, `claims_unsent_count`, `unpriced_charge_count` | counter row (0 = green) | — | `worklists.unsigned_progress_notes`; `daily.daily_audit`; `worklists.unbilled_procedures` | P3 |
| Today | Provider table: daily goal, scheduled today, average daily production MTD, needed per day | `production_goal`, `scheduled_production`, `production_per_working_day`, `daily_avg_needed_to_goal`, `appointments_booked`, `provider_utilization_pct` by `provider_id` | `scorecard` with office total | G | `daily.scheduled_production` | P3 |
| Today | Exams and new patients | `scheduled_exams` by `exam_type`, `new_patients_scheduled` | KPI group | — | `appointment.appointment_list` | P3 |
| Today | Opportunities | `ar_of_todays_patients`, `pending_treatment_of_todays_patients`, `srp_opportunities`, `unscheduled_family_members` | KPI group | — | `worklists.todays_patients` (flag filter) | P3 |
| Today | Readiness | `unconfirmed_appointments`, `eligibility_verified_pct`, `open_time_pct` | KPI group | B | `worklists.unconfirmed_appointments`; `worklists.eligibility_verification` | P3 |
| Today | Today's patients | per-patient flags (6.12) | `list` | — | `worklists.todays_patients` | P3 |
| Next days | Scheduled production next working day · second working day, against goal; open time; unconfirmed | `scheduled_production` (windows `next_working_day`, `second_working_day`), `open_time_pct`, `unconfirmed_appointments` | KPI group per day | G | `daily.scheduled_production`; `worklists.unconfirmed_appointments` | P3 |
| Where we stand | Month to date | `net_production`, `production_vs_goal_pct`, `daily_avg_needed_to_goal`, `production_forecast`, `collection_pct`, `case_acceptance_pct`, `provider_utilization_pct` | KPI group + pacing chart (4.4) | G, PY | per metric (2.0.4) | P3 |
| Where we stand | Patients | `patients_seen`, `new_patients`, `new_patients_projected`, `recare_patients_seen` | KPI group | PY | `lists.patients_seen` | P3 |
| Where we stand | Receivables | `total_ar` (toggle `office_attribution = home_office`, the legacy huddle basis), `ar_over_90_pct` | KPI group | PP | `monthly.aging_report_by_home_office` | P3 |
| Where we stand | Year to date | `production_vs_goal_pct`, `net_collections`, `collection_pct`, `new_patients` with `date_preset = year_to_date` | KPI group | PY | per metric | P3 |
| Previous month | The month-to-date tiles frozen at the last month end | same keys from `month_end` rows of `rpt_metric_values` | KPI group, marked "as closed" | G | — (frozen; "open live report" link) | P3 |

Not a metric (05 §5.14): "next available appointment" per provider. It is a slot search of the Scheduler; the huddle shows it
only if the scheduling feature exposes such a call (open decision D-7). Mobile and present mode: 3.6. Delivery by digest:
section 7.

### 2.5 Production analysis — `dashboards.production`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| Owner, office manager | Where production comes from (provider, category, code, payer), what was given up in write-offs, whether the schedule will carry the month to goal | `office_scope`, `date_range`, `compare_to`, `provider_ids`, `production_group`, `procedure_category_codes`, `carrier_ids` | month to date, PY | P2 |

| Tile | `metric_key`(s) | Visual | Comparison | Drill target | Ph |
|---|---|---|---|---|---|
| Headline | `net_production`, `charged_production`, `gross_production`, `production_adjustments` | KPI group | PY, G | `daily.production_report`; `daily.special_transaction_report` | P2 |
| Productivity | `production_per_working_day`, `production_per_visit`, `production_per_hour`, `production_per_procedure`, `procedures_done` | KPI group | PY | component lists | P2 |
| Estimated payer split | `estimated_patient_portion`, `estimated_insurance_portion` of the period's production | split bar | PY | `daily.production_report` | P2 |
| By day and provider type | `net_production` by day and `production_group` (toggle: one line per `specialty`) | `trend`, stacked | G: daily goal line (P3) | `daily.production_report` {std} | P2 |
| By provider | `net_production`, `production_per_working_day` by `provider_id`, `Unassigned` shown | `bars`, horizontal | G per provider (P3) | `daily.production_report` (`group_by = provider`) | P2 |
| By category, then code | `charged_production`, `procedure_count`, `revenue_per_procedure`, `category_production_share_pct` by `code_category`, expanding to `procedure_code` | `bars` with in-tile drill-down | PY | `daily.production_analysis_report` | P2 |
| By carrier | `charged_production` by `carrier_id`, top 10 + `other`; `insured_production_share_pct` | `bars` | PY | `daily.production_report` (`carrier_ids`) | P2 |
| Write-offs and adjustments | `implied_writeoff`; `production_adjustments` by `txn_class`; `net_production_before_bad_debt` (collectible production); `writeoff_rate_pct`, `contractual_writeoff_rate_pct` | stacked `bars` + KPI | PY | `daily.special_transaction_report` | P2 |
| Scheduled production ahead | `scheduled_production` by day, today to month end, with `daily_avg_needed_to_goal` as the reference line | `bars`; days under the line are marked | G | `daily.scheduled_production` | P2 (line P3) |
| Production to goal | `production_forecast` against `production_goal`; run-rate projection beside it | pacing chart (4.4) | G | goal rows | P3 |
| Same-day treatment | `same_day_treatment_amount` | KPI + `trend` | PY | `daily.production_report` (unplanned lines) | P2 |
| Consistency | `daily_production_volatility_cv`; `day_of_week_production_index` by `day_of_week` | KPI + `bars` | B | `daily.production_report` | P4, tile library (off by default) |
| Data quality | `unpriced_charge_count`, `unclassified_adjustments`, `non_production_charges` | counters (0 = quiet) | — | `daily.production_report`; `daily.special_transaction_report` | P2 |

### 2.6 Collections and A/R — `dashboards.collections_ar`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| Office manager, billing, owner | Cash received, what is owed, how old it is and who owes it | `office_scope`, `date_range` (flows), `as_of` (balances), `compare_to`, `provider_ids`, A/R attribution `transaction_office` · `home_office` (PD-4; passed as `office_attribution`) | month to date; balances as of today | P2 |

| Tile | `metric_key`(s) | Visual | Comparison | Drill target | Ph |
|---|---|---|---|---|---|
| Collections headline | `net_collections`, `gross_collections`, `collection_adjustments`, `refunds` | KPI group | PY | `daily.collection_report`; `daily.special_transaction_report` | P2 |
| Collection % | `collection_pct` (resolved variant named) with `collection_pct_rolling_90d` and `collection_pct_rolling_12m`; the fixed variants `net_collection_pct` and `net_collection_pct_after_bad_debt` side by side; `gross_collection_pct` as a secondary value, never the headline | KPI + `trend` | B 95 / 98; an external benchmark line only for the resolved variant (05 §9.1) | component lists | P2 |
| By payer and tender | `gross_collections` by `payer` per month; by `tender_class`; `patient_collection_share_pct` | stacked `bars` | PY | `daily.collection_report` (`payment_types`) | P2 |
| Time of service | `otc_collection_pct`, `uncollected_copay_amount` | KPI + `trend` | B 80 / 95 | `management.uncollected_copay` | P2 |
| Collected to date by service month | `cohort_collection_pct` by service month | `bars` | — | `monthly.waterfall_report` | P2 |
| Speed | `days_to_payment` by `payer`; `ar_days` | KPI group | PP | `monthly.aging_report` | P2 |
| A/R headline | `total_ar`, `patient_ar`, `insurance_ar_estimated`, `credit_balances` | KPI group, as of | PP (previous month end) | `monthly.aging_report`; `worklists.unallocated_credits` | P2 |
| Ageing | `ar_aging_amount` and `patient_ar` by `aging_bucket`; the insurance part of each bar is the difference, footnoted as such (`insurance_ar_estimated` has no bucket dimension in 05), with the `split_quality` footnote when not exact | `aging` | PP | `monthly.aging_report` (`aging_buckets`); patient part → `worklists.patient_ar` | P2 |
| Over 90 days | `ar_over_90_amount`, `ar_over_90_pct`, `patient_ar_past_due_amount` | KPI group | B 50 / 15 (05 §5.13) | `worklists.patient_ar` | P2 |
| A/R trend | `total_ar`, `ar_over_90_pct` at month ends | `trend` from snapshots; starts with the first snapshot | PY | `monthly.aging_report` (`report_date` = period end) | P2 |
| Bad debt | `bad_debt_amount`, `bad_debt_rate_pct` | KPI | B 5 / 1 (05 §5.13) | `daily.special_transaction_report` | P2 |
| By provider | `net_collections`, `provider_income`, `provider_collection_pct` by `provider_id`, `Unallocated` shown | `scorecard` (class `provider_comp`) | — | `monthly.income_allocation` | P2 |
| By office (scope with more than one office) | `net_collections`, `collection_pct`, `ar_days`, `ar_over_90_pct`, `otc_collection_pct` by `office_id` | `scorecard` | PEER (P4) | this dashboard for the office | P2 |
| Cash controls | `undeposited_payments_amount`, `day_close_compliance_pct`; office-days not yet closed (count of `worklists.day_close_checklist` rows) | counters | — | `daily.deposit_slip`; `worklists.day_close_checklist` | P2 |
| Work queues | open and overdue items of `worklists.patient_ar`, `worklists.unallocated_credits` and `worklists.payment_plan_overdue` | counters | — | the worklists | P3 |

### 2.7 Insurance and revenue cycle — `dashboards.insurance_rcm`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| Billing team, office manager | The claim pipeline from service to payment: what is not billed, not sent, not paid, and how fast and how cleanly payers respond | `office_scope`, `as_of`, `date_range` (rates), `carrier_ids`, `coverage_orders`, `provider_ids` | backlog as of today; rates over the last 90 days | P2 |

| Tile | `metric_key`(s) | Visual | Comparison | Drill target | Ph |
|---|---|---|---|---|---|
| Pipeline | `unbilled_production_amount` → `procedures_on_hold_amount` → `claims_unsent_count` → `outstanding_claims_amount` (primary tier) | KPI group drawn as four steps | PP | `worklists.unbilled_procedures`; `worklists.outstanding_claims` | P2 |
| Outstanding claims by age | `outstanding_claims_amount`, `outstanding_claims_count` by `claim_age_bucket`; `tier` as a switch, never summed across a claim family (05 §5.3) | `aging` | PP | `worklists.outstanding_claims` (`aging_buckets`, `coverage_orders`) | P2 |
| By carrier | `outstanding_claims_amount` by `carrier_id`, top 10 + `other`; `claims_over_90_pct`; `claim_days_to_payment` by carrier | `bars` + table | PP | `worklists.outstanding_claims` (`carrier_ids`) | P2 |
| Speed and quality | `same_day_claim_rate_pct`, `claim_submission_lag_days`, `claim_days_to_payment`, `first_pass_claim_rate_pct`, `denial_rate_pct` (both labelled "proxy", 05 §5.3) | KPI group + `trend` | B | `insurance.claims_list` | P2 |
| Unbilled | `unbilled_production_pct`, `unbilled_production_amount`, `procedures_on_hold_amount` by `provider_id`; `claims_unsent_count` by `user_key` (the only one of the four with a user dimension in 05) | KPI group + `bars` | PP | `worklists.unbilled_procedures` | P2 |
| Payers | `insured_production_share_pct`; `contractual_writeoff_rate_pct`, `insurance_collections`, `insurance_estimate_accuracy_pct` by `carrier_id` | `scorecard`, rows = carriers | PY | `daily.production_report` / `daily.collection_report` (`carrier_ids`) | P2 |
| Claims submitted | `claims_submitted_count` by `tier` | `trend` | PY | `insurance.claims_list` | P2 |
| Backlog trend | `outstanding_claims_amount`, `claims_unsent_count` per day | `trend` from `day_end` snapshots | — | — | P2 |
| Eligibility | `eligibility_verified_pct` for appointments of the next 7 days | KPI | B | `worklists.eligibility_verification` | P3 |
| Work queues | open, overdue and assigned-to-me counts of `worklists.outstanding_claims`, `worklists.unbilled_procedures` and `worklists.denied_claims` (open denials with their `denied_amount`) | counters | — | the worklists | P3 |
| Benefits at stake | `benefits_remaining_amount` | KPI | — | `insurance.benefits_used_unused` | P3 |
| Capitation | `capitation_value_of_services`, `capitation_utilization_pct` | KPI group | — | `insurance.capitation_utilization` | P3 |
| Cash conversion | `cash_conversion_waterfall_amount` by `waterfall_stage` | `funnel` drawn as a waterfall | — | stage lists (2.0.4) | P4 |
| Health score | `rcm_health_score`, never without its five component values; each component drills to its worklist | KPI + component `bars` | PEER | the components' worklists (2.0.4) | P4, tile library (off by default) |

Not offered (05 §5.14, DATA-38): true clean-claim rate, denial reasons, 835 reconciliation. The tiles for them appear with
the state "needs integration" only when the organisation has the clearinghouse feature flag.

### 2.8 Schedule and capacity — `dashboards.schedule_capacity`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| Office manager, front office | How the book performed (kept, broken, recovered) and how full the coming days are | `office_scope`, `date_range` (look-back), look-ahead window in open days, `provider_ids`, `production_group`, `operatory_ids` | last 30 days; next 10 open days | P3 |

| Tile | `metric_key`(s) | Visual | Comparison | Drill target | Ph |
|---|---|---|---|---|---|
| Appointment outcomes | `appointments_scheduled` by `status_class` per day or week | stacked `bars` | PP | `appointment.appointment_list` (`appointment_statuses`) | P3 |
| Broken appointments | `cancellation_rate_pct`, `no_show_rate_pct`, `broken_appointment_rate_pct` | KPI group + `trend` | B; PY | `appointment.appointment_list` | P3 |
| Recovery | `broken_appointment_recovery_pct`, `broken_appointment_value_lost` | KPI group | PP | `worklists.broken_appointments` | P3 |
| By weekday and patient kind | `no_show_rate_pct`, `cancellation_rate_pct` by `day_of_week`; by `patient_new_existing` | `bars` | — | `appointment.appointment_list` | P3 |
| Never resolved | `unresolved_past_appointments` | counter, target 0 | — | `worklists.unresolved_appointments` | P3 |
| Confirmations | `unconfirmed_appointments`, `confirmation_rate_pct`, `reminder_delivery_rate_pct`, `reminder_confirmation_rate_pct` | KPI group | — | `worklists.unconfirmed_appointments` | P3 |
| Provider utilisation | `provider_utilization_pct`, `booked_hours`, `provider_scheduled_hours` by `provider_id` | `bars` with the 75-90 band | B | `appointment.appointment_list` | P3 |
| Chair utilisation | `chair_utilization_pct` by `operatory_id` and day; `chair_capacity_hours` | `heatmap` | — | `appointment.appointment_list` (`operatory_ids`) | P3 |
| Open time ahead | `open_time_pct` by `provider_id` and day over the look-ahead window | `heatmap`; a cell opens that Scheduler day | — | Scheduler route (`openSchedulerAtAppointment` pattern, 07) | P3 |
| Scheduled value ahead | `scheduled_production` by day; `scheduled_exams`, `new_patients_scheduled` | `bars` | G | `daily.scheduled_production` | P3 |
| Booking pipeline | `pre_appointment_pct`, `reappointment_pct`, `new_patient_lead_days`; `unscheduled_active_patients` by `months_since_last_visit_band` | KPI group + `bars` | B | `worklists.not_reappointed`; `worklists.reactivation` | P3 |
| Throughput | `patient_visits`, `visits_per_working_day`, `working_days`, `chair_hours` | KPI group | PY | `lists.patients_seen` | P3 |
| Booking activity | `appointments_created` by `user_key`; `online_booking_requests`, `online_booking_conversion_pct` | `bars` + KPI | PP | `appointment.appointment_detail` | P3 |
| Schedule accuracy | `scheduled_production_start_of_day`, `actual_vs_scheduled_production_pct` | `trend`; no default band (05 §5.1) | — | `daily.scheduled_production` | P4 |

A weekday × hour heatmap is not offered: 05 §1.5 has no hour-of-day dimension (request D-8). When `hours_source = 'default'`
(03 §2.28) every capacity tile says "schedule not configured" and links to the office schedule setup.

### 2.9 Hygiene and recall — `dashboards.hygiene_recall`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| Hygienists, office manager, owner | Is the hygiene department full, productive, rebooking its patients and keeping them in recall | `office_scope`, `date_range`, `compare_to`, `provider_ids` (hygiene providers first) | month to date; cohort tiles trailing 12 months | P3 |

| Tile | `metric_key`(s) | Visual | Comparison | Drill target | Ph |
|---|---|---|---|---|---|
| Volume and production | `hygiene_visits`, `hygiene_visits_per_working_day`, `hygiene_net_production`, `hygiene_production_share_pct`, `hygiene_production_per_visit`, `hygiene_production_per_hour` | KPI group | PY; target range 25-35 % on the share | `daily.production_report` (hygiene-visit codes) | P3 |
| Reappointment | `hygiene_reappointment_pct` with the resolved variant named, and the four variants side by side: `hygiene_reappt_at_visit_pct`, `hygiene_reappt_holds_now_pct`, `hygiene_return_12m_pct`, `hygiene_reappt_any_at_visit_pct` | KPI + 4-row table | B 85 / 90 | `worklists.not_reappointed` (`visit_kind = hygiene`) | P3 |
| Pre-appointment | `hygiene_pre_appointment_pct`, `pre_appointment_pct` | KPI group | B | `worklists.reactivation` | P3 |
| Recall position | `recall_overdue_patients`, `recall_overdue_pct`, `recall_due_unscheduled_patients`, `recare_active_pct` | KPI group + `trend` from snapshots | PP | `worklists.recall_due` | P3 |
| Retention | `hygiene_retention_12m_pct` by `code_group` (child prophy, adult prophy, SRP, perio) | `bars` | PY | `daily.production_report` (cohort codes) | P3 |
| Perio and adjuncts | `perio_patient_pct`, `perio_visit_share_pct`, `srp_quadrants_per_working_day`, `fluoride_rate_pct`, `bitewing_recare_pct`; `adjunctive_therapy_pct` by `code_group`; `srp_opportunities` for today | KPI group + `bars` | PY | `daily.production_report` (codes); `worklists.todays_patients` | P3 |
| Hygienist scorecard | hygienist set of 05 §5.8 by `provider_id` | `scorecard` | G; PEER (P4) | `dashboards.provider` for the hygienist | P3 |
| Capacity | `open_time_pct` and `provider_utilization_pct` of hygiene providers | KPI group | B | Scheduler route | P3 |
| Outreach | `recall_outreach_yield_pct`; `follow_up_completion_pct` of `worklists.recall_due` | KPI group | PP | `worklists.recall_due` | P3 |
| Wages | `hygienist_production_to_wage_ratio` (class `payroll_time`) | KPI | — | `management.time_clock_report` | P4 |

### 2.10 Treatment plans and case acceptance — `dashboards.treatment`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| Doctors, treatment coordinators, office manager | What was presented, what was accepted, scheduled and completed, and what is still waiting | `office_scope`, `date_range` on the presented date, `provider_ids`, `tx_counselor_ids`, `procedure_category_codes` | last 90 days presented; backlog as of today | P3 |

Every tile is app-era only (05 §5.6); for an organisation with migrated history only, the dashboard shows "history starts on
<date>".

| Tile | `metric_key`(s) | Visual | Comparison | Drill target | Ph |
|---|---|---|---|---|---|
| Presented | `treatment_presented_amount`, `patients_presented`, `treatment_presented_per_exam`, `diagnostic_pct` | KPI group | PY | `treatment_plan.treatment_plan_status` | P3 |
| Acceptance | `case_acceptance_pct` with the resolved unit and window named; variants `case_acceptance_dollars_pct`, `case_acceptance_dollars_same_day_pct`, `case_acceptance_plans_pct`, `case_acceptance_patients_pct`; `treatment_accepted_amount`, `avg_accepted_per_patient` | KPI + table; cohorts younger than the window are drawn dashed (`is_provisional`) | B | `treatment_plan.treatment_plan_status` | P3 |
| Funnel | `treatment_funnel_amount`, `treatment_funnel_pct` by `funnel_stage` | `funnel` | PY cohort | same, stage as `treatment_plan_status` | P3 |
| Completion | `case_completion_pct`; `acceptance_completion_gap_pp` | KPI group | B | `treatment_plan.treatment_plan_analysis` | P3 · P4 |
| Unscheduled treatment | `unscheduled_treatment_amount`, `unscheduled_treatment_patients` by `acceptance_state`; `preauthorized_pct`; `benefits_remaining_amount` | KPI group + `trend` from snapshots | PP | `worklists.unscheduled_treatment` | P3 |
| Follow-through | `treatment_reappointment_pct`, `same_day_treatment_amount` | KPI group | PY | `worklists.not_reappointed` (`visit_kind = treatment`) | P3 |
| By provider, counselor, category | by `provider_id`: `treatment_presented_amount`, `case_acceptance_pct`, `avg_accepted_per_patient`; by `user_key` (counselor): `treatment_presented_amount`; by `code_category`: `treatment_presented_amount`, `case_acceptance_pct` (dimensions as declared in 05) | `scorecard` | PEER (P4) | `treatment_plan.treatment_plan_status` | P3 |
| Referred out | `outbound_referrals` by `specialty`; `referral_out_rate_pct` | `bars` + KPI | PY | `referral.referred_out_list` | P3 |

### 2.11 Patients — `dashboards.patients`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| Owner, office manager, marketing | Is the patient base growing, who is new, who is slipping away, who they are | `office_scope`, `date_range`, `as_of`, `compare_to`, `provider_ids` | trailing 12 months; counts as of today | P3 |

| Tile | `metric_key`(s) | Visual | Comparison | Drill target | Ph |
|---|---|---|---|---|---|
| Base | `active_patients` (window printed on the card), `at_risk_patients`, `lapsed_patients`, `insured_patient_share_pct` | KPI group, as of | PP from snapshots | `lists.patient_list`; `worklists.reactivation` | P3 |
| Flow | `new_patients`, `reactivated_patients`, `patients_lost`, `net_patient_growth_pct`, `attrition_rate_pct` | KPI group + monthly `bars` (gained above the axis, lost below) | PY | `lists.patient_list_new_patient`; `worklists.reactivation` | P3 |
| New patients | `new_patients` per month; variants `new_patients_first_visit`, `new_patients_first_appointment`, `new_patients_created`; `new_patients_projected`, `new_patients_scheduled`; `new_patients_per_doctor` (P4) | `trend` + table | PY; B 35 / 75 per office | `lists.patient_list_new_patient` | P3 |
| First-visit quality | `new_patient_reappointment_pct`, `fmx_pano_new_patient_pct`, `new_patient_lead_days` | KPI group | B | `worklists.not_reappointed` (`visit_kind = new_patient`) | P3 |
| Retention | `patient_retention_12m_pct`, `reappointment_pct`, `pre_appointment_pct` | KPI group | PY | `worklists.reactivation` | P3 |
| Visits by exam type | `patients_seen`, `patient_visits`; `new_patient_exams`, `recare_exams`, `emergency_exams` per month | stacked `bars` | PY | `lists.patients_seen` | P3 |
| Where new patients come from | `new_patients` by `zip5` (top 15 + `other`) and by `source_category`: where to aim referral and area campaigns | `bars` | PY | `lists.patient_list_new_patient` | P3 |
| Demographics | `patients_seen` by `age_band`, `gender_code`, `patient_type_code` | `bars` | — | `lists.patient_list` | P4, tile library (off by default) |
| Unscheduled | `unscheduled_active_patients` by `months_since_last_visit_band` | `bars` | PP | `worklists.reactivation` | P3 |
| Value | `patient_value_annual`, `production_per_visit` | KPI group | PY | `daily.production_report` | P4, tile library (off by default) |
| Across offices | `cross_office_patients` | KPI | — | `lists.patients_seen` | P4 |

### 2.12 Referrals and marketing — `dashboards.referrals_marketing`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| Owner, marketing, office manager | Which sources bring patients and production, what goes out to specialists, whether reminders and recalls produce visits | `office_scope`, `date_range`, `compare_to`, `referred_from_ids` (sources) | trailing 12 months | P3 |

| Tile | `metric_key`(s) | Visual | Comparison | Drill target | Ph |
|---|---|---|---|---|---|
| New patients by source | `new_patients` by `source_category` and `referral_source_id` (top 15 + `other`); `new_patients_missing_source_pct`; `patient_referral_share_pct` | `bars` + KPI | PY | `referral.referral_summary_report` | P3 |
| Value by source | `referral_source_production` by `referral_source_id` | table | PY | `referral.referral_production_list` | P3 |
| Referred out | `outbound_referrals` by `specialty` and direction; `referral_out_rate_pct` | `bars` + KPI | PY | `referral.referred_out_list` | P3 |
| Online booking | `online_booking_requests`, `online_booking_conversion_pct` | KPI group + `trend` | PP | `lists.online_registered_patients` | P3 |
| Campaigns | `campaign_appointments` by `campaign_code` (count, kept, value) | table | — | `appointment.appointment_list` | P3 |
| Communication funnel | `reminder_delivery_rate_pct` by `channel`; `reminder_confirmation_rate_pct`, `recall_outreach_yield_pct` per office (no channel dimension in 05) | KPI group | PP | `worklists.unconfirmed_appointments`; `worklists.recall_due` | P3 |
| Lead time | `new_patient_lead_days` | KPI | B | `appointment.new_patients_via_appointments` | P3 |
| Geography | `new_patients`, `patients_seen` by `zip5` | table (a map is out of scope) | — | `lists.patient_list` | P3 |
| Cost per new patient | `cost_per_new_patient` | KPI in the state "needs marketing spend input" until that input exists (05 §5.10, availability X) | — | — | P4 |

### 2.13 Ortho — `dashboards.ortho`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| Orthodontists, ortho coordinators, office manager | Exams to starts, the active base, compliance with visits and the contract money still to bill | `office_scope`, `date_range`, `as_of`, `provider_ids`, `ortho_status_codes` | month to date; contracts as of today | P3 |

App-era only: no contract was migrated; statuses, debond dates and the visit log exist from DATA-42 (05 §5.11).

| Tile | `metric_key`(s) | Visual | Comparison | Drill target | Ph |
|---|---|---|---|---|---|
| Exams to starts | `ortho_exams`, `ortho_starts`, `ortho_conversion_pct`, `ortho_avg_contract_amount` | KPI group + `trend` | PY; B | `ortho.ortho_report` | P3 |
| Active base | `ortho_active_patients`, `ortho_observation_patients`, `ortho_debonds` | KPI group | PP | `ortho.patients_by_ortho_status_with_time_in_treatment` | P3 |
| Compliance | `ortho_missing_visit_patients`, `ortho_active_no_appointment_pct`, `ortho_patients_beyond_ecd_pct` | KPI group | B | `ortho.missing_ortho_visits`; `ortho.ortho_compliance_report` | P3 |
| Money | `ortho_production`, `ortho_remaining_to_bill_amount`, `ortho_installments_unposted_amount` | KPI group + `trend` | PY | `ortho.ortho_daily_journal`; `management.payment_plan_charges` | P3 |

### 2.14 Multi-office comparison — `dashboards.multi_office`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| Executive, regional manager, owner of several offices | Which offices are off track and on what; rules in section 5 | `office_scope` (default: every office the caller may read), `office_group_id` as grouping, `date_range`, comparator, rank metric, same-store switch | last closed month and trailing 12 months | P4 |

| Tile | `metric_key`(s) | Visual | Comparison | Drill target | Ph |
|---|---|---|---|---|---|
| Ranking | one normalised metric by `office_id` (default `production_per_working_day`; picker limited by rule 2 of 5.1) | `ranking` with rank change against the previous period | PEER | `dashboards.main` for the office | P4 |
| Office scorecard | `net_production`, `production_vs_goal_pct`, `collection_pct`, `ar_over_90_pct`, `new_patients`, `case_acceptance_pct`, `hygiene_reappointment_pct`, `no_show_rate_pct`, `provider_utilization_pct` by `office_id`, with office-group subtotal rows | `scorecard` | G, PEER | the matching dashboard for the office | P4 |
| Same-store growth | `same_store_growth_pct` in its three aggregates, `offices_growing_pct`; excluded offices named | KPI group + distribution `bars` | — | office scorecard | P4 |
| Scheduled, produced, collected | `scheduled_production`, `net_production`, `net_collections` by `office_id` | grouped `bars` | PY | `dashboards.main` for the office | P4 |
| Density | `production_per_office`, `production_per_operatory` | KPI + `bars` | B | `dashboards.production` | P4 |
| Dispersion | `metric_dispersion_cv` of the rank metric | KPI | — | ranking | P4, tile library (off by default) |
| Revenue cycle | `rcm_health_score` by `office_id`; `cash_conversion_waterfall_amount` | `bars`; `funnel` | PEER | `dashboards.insurance_rcm` for the office | P4 |
| Mix | `specialty_production_share_pct` by `specialty` | `bars` | PY | `dashboards.production` | P4 |
| Shared patients | `cross_office_patients` by office pair | table | — | `lists.patients_seen` | P4 |
| Trend compare | one metric, rows = offices, columns = months | `MetricMatrix` in compare mode (3.3) | PY | the office dashboards | P4 |

### 2.15 Executive summary — `dashboards.executive_summary`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| Owner, executive | One printable, subscribable page per closed month or quarter; the dashboard form of the legacy Executive Summary | `office_scope`, period (month, quarter, year), `compare_to` | last closed month with year to date | P2 |

Closed periods read frozen `month_end` / `period_lock` rows (05 §10) and print "as closed on <date>"; the open month reads
live values and is marked. The legacy report itself stays `monthly.executive_summary` with literal criteria parity (AD-8)
and its own line keys (05 §7.9). The dashboard uses the modern headline keys, so some lines differ from the legacy page by
definition; a footnote under each affected tile names the difference: legacy Production = `visit_code_production` (here
`net_production`), legacy Collection = `gross_collections` (here `net_collections`), legacy New Patients =
`new_patients_created` (here `new_patients` on the organisation's basis), legacy averages divide `visit_code_production`
(here `production_per_visit`). The link tile runs the legacy report for the same period and scope.

| Tile | `metric_key`(s) | Visual | Comparison | Drill target | Ph |
|---|---|---|---|---|---|
| Production and collections | `net_production`, `net_collections`, `collection_pct` for the period and year to date | KPI group | PY; G (P3) | `daily.production_report`; `daily.collection_report` | P2 |
| Receivables | `total_ar`, `ar_over_90_pct`, `ar_days`, `outstanding_claims_amount`, `credit_balances` at the period end | KPI group | PP, PY | `monthly.aging_report` (`report_date`) | P2 |
| Patients | `new_patients`, `active_patients`, `patients_seen`, `patient_visits`, `production_per_visit` | KPI group | PY | `lists.patient_list_new_patient`; `lists.patients_seen` | P2 |
| Operations | `appointments_kept`, `appointments_no_show`, `appointments_cancelled`, `chair_hours`, `procedures_done`; `no_show_rate_pct`, `cancellation_rate_pct` | KPI group | PY | `appointment.appointment_list` | P2 |
| Clinical | `doctor_net_production`, `hygiene_net_production`, `other_net_production`; `hygiene_reappointment_pct`; `case_acceptance_pct` | split bar + KPI | PY | `daily.production_report` | P2 |
| Offices (scope with more than one office) | `net_production`, `net_collections`, `collection_pct`, `total_ar`, `new_patients` by `office_id` with the organisation row | `scorecard` | PY | this dashboard for the office | P2 |
| Twelve-month trend | `net_production`, `net_collections` | `trend` with the PY series dashed | PY | `dashboards.main` | P2 |
| Legacy report | link tile: run the legacy Executive Summary for the same period and scope | link | — | `monthly.executive_summary` | P2 |
| Summary text | generated from the tiles above (8.4) | `narrative` | — | — | P5 |

### 2.16 Front office — `dashboards.front_office`

| Audience | Purpose | Filters | Default | Phase |
|---|---|---|---|---|
| Front office team, office manager | The desk's own numbers and queues for today and the coming week (the legacy Front Office dashboard, 05 §7.6) | `office_scope`, reference date, `user_ids` (managers) | today and the next 7 days; look-back 7 days | P3 |

| Tile | `metric_key`(s) | Visual | Comparison | Drill target | Ph |
|---|---|---|---|---|---|
| Today | `net_production` (7-day sparkline), `production_vs_goal_pct`, `net_collections`, `collection_pct` | KPI group | G | `daily.production_report`; `daily.collection_report` | P3 |
| Desk collections | `ar_of_todays_patients`, `otc_collection_pct`, `uncollected_copay_amount`, `patient_ar`, `insurance_ar_estimated` | KPI group | — | `worklists.todays_patients`; `worklists.patient_ar` | P3 |
| Appointments | `scheduled_exams` by `exam_type`; `appointments_booked` by `provider_kind`; `provider_utilization_pct` | KPI + `bars` | — | `appointment.appointment_list` | P3 |
| Unscheduled treatment | `patients_presented`, `unscheduled_treatment_patients`, `unscheduled_treatment_amount`, `case_acceptance_plans_pct`, `preauthorized_pct` | KPI group | — | `worklists.unscheduled_treatment` | P3 |
| Opportunities | `unconfirmed_appointments` (count and value, next 7 days); `appointments_no_show` and `broken_appointment_value_lost` (last 7 days, by date); `recall_due_unscheduled_patients`; `unscheduled_family_members` | KPI group + `bars` | — | `worklists.unconfirmed_appointments`; `worklists.broken_appointments`; `worklists.recall_due` | P3 |
| Insurance desk | `eligibility_verified_pct`, `claims_unsent_count`, `unbilled_production_amount` | KPI group | B | `worklists.eligibility_verification`; `worklists.unbilled_procedures` | P3 |
| Work queues | per worklist: open, due today, overdue, assigned to me (6.1) | counters | — | the worklist | P3 |
| Team scorecard | team-member set of 05 §5.8 by `user_key`: `appointments_created`, `payments_posted_amount`, `charges_posted_amount`, `adjustments_posted_amount`, `otc_collection_pct`, `same_day_claim_rate_pct`, `confirmation_rate_pct`, `eligibility_verified_pct`, `follow_up_completion_pct` | `scorecard` (class `user_activity`: a team member sees only the own row) | PP | `daily.daily_journal` (`user_ids`) | P3 |
| Day controls | `daily_audit_exceptions_count`, `unsigned_progress_notes_count`, `voided_entries_count`, `backdated_entries_count`, `day_close_compliance_pct`; office-days not yet closed | counters | — | `daily.daily_audit`; `management.audit_trail`; `worklists.day_close_checklist` | P3 |

---

## 3. Shared components

Component names are proposals for `src/features/reports/` (AD-11; folder layout owned by 07 / 11). Starting points that
exist [V]: `KpiStat` and `WidgetCard` (extend), `ReportChart` (bar and pie only; replaced by the chart tiles below),
`ScopeToggle` / `OfficeBadge` / `ProviderOptionGroups` (reuse through the 04 components). Recharts 3 is installed and is
the chart library (AD-11); no chart, grid or drag library is added by this document.

### 3.1 Value rendering and states (one renderer for cards, matrix, scorecards and exports)

| Response state | Rendering | Tooltip / action |
|---|---|---|
| `status = ok` | Formatted from `format` (05 §1.2): money and decimals arrive as strings and are formatted without float arithmetic; percentages arrive as fractions; cards round money to whole units above 10,000 and show the exact value in the popover; right-aligned tabular numerals; unit shown once per row or card | Click = drill |
| `ok` and the value is zero | `0` | Drill still available (the empty list is the proof) |
| `no_data` | `—` | "No activity in this period" or, for a ratio, "No denominator: 0 visits" (the denominator's label) |
| `not_available` | `n/a` | "Not recorded before <date>" from the metric's `availability` (05 §1.7); a row or tile that is `not_available` for every period collapses to one line |
| `restricted` | lock icon | "Your access does not include this value" |
| `suppressed` | `•` | "Hidden: too few patients" (small-cell rule of 08) |
| Not configured (`reason = no_goal`, warning `k10`) | "Not set" | Link to the goal grid or the schedule setup when the caller holds the right |
| Warning `low_denominator` | Value in grey, no band colour, no rank | "Based on fewer than <n> cases" (`rate_min_denominator`) |
| `is_provisional` (cohort window still open) | Value with a dashed underline | "Provisional until <date>" |
| `is_partial` period | MTD / QTD / YTD marker (3.3) | Elapsed and total working days |
| Past as-of value without a snapshot (`recomputed`, 05 §10) | Value with a small "recomputed" marker | "Recomputed from today's records; later edits may have changed it" |
| Frozen value under an older `definition_version` or `settings_version` | Small "definition changed" marker | Popover shows both versions |
| Caveats k1-k13 | Footnote icon on the label | Text of 05 §1.7 |
| Tile `error`, `timeout`, `busy` | Message inside the tile with Retry; other tiles unaffected (02 §10.4) | `busy` retries once automatically after `Retry-After` |
| `freshness[].status` = `stale` or `failed` | Warning icon beside the as-of stamp | Age and source |

Band and direction: the band (bad, warning, good, or inside / outside a target range) comes from the resolved
`metric_targets` row (05 §8.2); it is drawn as colour **and** icon **and** word, following the metric's `direction`, never
its sign. A delta is green when it moves in the good direction. No band → neutral.

### 3.2 KPI card (`KpiCard`)

```
+----------------------------------------------------------+
| Net production (i)                        Nov 1-22 · MTD |  label, definition icon, resolved period
| $182,400                                                 |  value (exact on hover and in drill)
| ▲ 6.2 % vs same days last year            [sparkline]    |  delta: icon + text; 12-period trend
| Goal $250,000  [==========>      ] 73 %   behind pace    |  goal bar, pace word (4.4)
| service date · as of 09:12 · live                 [...]  |  date basis, as-of, source; menu
+----------------------------------------------------------+
```

| Element | Source in `MetricQueryResponse` (02 §10.1) | Rule |
|---|---|---|
| Label, info icon | `metrics[].label`; popover from `GET /analytics/metrics/{metric_key}` (`description`, `glossary_md`, settings in force, versions, aliases) | Never a hand-written label (principle 9); for an alias the popover names the resolved variant (`resolved_metric_key`, 05 §12.3) |
| Period chip | `periods[]`, `date_basis` | Resolved dates, never only "MTD"; basis word; office time zone in the popover |
| Value | `series[].points[].value` or `total.value` | 3.1 |
| Delta | `compare`, `delta` and its relative form | Relative change for flows, percentage points for rates, absolute for balances; prior value 0 or missing → no delta (05 §1.4); comparison label says what it is ("vs same weekday last week") |
| Sparkline | `include[] = sparkline` | Up to 12 closed periods; the open period is a hollow last point; no axis |
| Goal bar and pace | P3: the metrics `production_goal`, `production_vs_goal_pct`, `daily_avg_needed_to_goal` in the tile's request; P4: `goal` and band from `include[] = goal` (ENG-51) for any metric with a target | 4.4; hidden when there is no goal or target |
| Peer marker (P4) | `include[] = benchmark` and in-organisation comparators (5.1) | Median and top-quartile ticks on the goal bar; external benchmark only when the display rule of 05 §9.1 allows it |
| Freshness | `data_as_of`, `freshness[]`, `cache` | Principle 3 |
| Menu | — | Open report (drill) · Show as trend · Definition · Refresh · Add to my dashboard (P4) · Alert me (P4) · Explain (P5) · Copy value |
| Refresh (card and dashboard menus, beside the as-of stamp) | request flag `cache_bypass = true` (NEW, request 12.4) | Bypasses the 60 s metric cache once for that tile (dashboard menu: every tile); rate-limited per user (setting `metric_refresh_per_minute`, default 6); a `busy` answer keeps the cached value and says so |
| Whole-card click | `POST /analytics/metrics/drill` | Opens the drill panel of 07 with the reconciling total on top |

Props (extension of `KpiStat`): `metric_key`, `point`, `metric` (label, format, direction), `period`, `compare_label`,
`goal`, `band`, `sparkline[]`, `freshness`, `status`, `warnings[]`, `on_drill`, `size` (`sm` for KPI groups, `md`, `lg` for
present mode). The card computes nothing: every figure, including the delta and the percent of goal, is in the response.

### 3.3 The trailing-12-month matrix (`MetricMatrix`)

| Aspect | Specification |
|---|---|
| Structure | One native table. Sticky first column: metric label, info icon, unit. Sticky header row: period labels. Rows grouped in titled, collapsible blocks. Zebra rows, right-aligned tabular numerals, equal column widths in every block and in every provider block, so columns line up down the page (the reference tables do not, `analysis/reference_screenshots.md` §3.2) |
| Periods | `periods_back` closed periods plus the open one; grain month (default), week (13) or quarter (8). Order toggle newest-first (default, reference layout) / oldest-first, stored per user |
| Month-to-date marker | The open period's header reads "Nov 2026 · MTD" with a second line "22 of 30 days · 15 of 20 working days" (`is_partial`, `working_days`); its cells are italic behind a vertical rule. Optional column "Projected" for additive flow rows = `project_period_end()` of 05 §1.4, served as `include[] = projected`; never shown for ratios or balances |
| Summary columns | Total, Average, Year to date, Prior year, Goal, Variance, Trend — each can be switched off; rules in the next table. Every summary value is computed by the metric service and arrives in the response (`include[]` values `total`, `average_closed`, `to_date`, `prior_year_range`, `variance_to_goal`, `projected`; the last five are requested of 02, 12.4 c); the grid displays them and computes nothing. A column whose value the service does not yet serve is not offered |
| Cell modes | Value (default) · change against the same period last year (%) · percent of goal · heat shading relative to the row and to the metric's direction (P4) |
| Drill per cell | Click or Enter on a cell = `POST /analytics/metrics/drill` with the row's key, the member and the period → drill panel. Cell menu: Open report · Explain (P5) · Alert me (P4) · Definition. A summary cell drills with the whole range |
| No data | 3.1. A blank cell does not exist: every cell is a number or one of the named states |
| Period status | Lock icon on locked periods; "as closed" marker on frozen values; "definition changed" where versions differ; a live past period is labelled "open period — live figures" until day close and lock exist (03 §9.3) |
| Row tools | Info icon (definition) · expand a `trend` under the row with the prior-year series · pin to top · hide (layout) |
| Parts check | The metric service verifies doctor + hygiene + other = total per cell (I-3) and returns the warning `parts_mismatch` with the failing cells (request 12.4 c); the grid flags the family label from that warning |
| Compare mode | One metric; rows = members (`office_id` or `provider_id`) plus the unassigned member and the total row; columns = periods; optional rank column. Members below `rate_min_denominator` are listed unranked |
| Provider variant | Same grid with a provider switcher, or stacked provider blocks with shared columns (2.2) |
| Data | One `matrix_block` tile per block (at most 12 metrics, 02 §10.1); the grid merges blocks by `matrix_key`; a failed block shows its own error row and the others render. Prior-year values are requested only when a column or mode needs them |
| Accessibility | `<th scope="row">` / `scope="col"`; drillable cells are buttons; sticky regions keep scroll padding so focus is never hidden; status changes announced politely |
| Compact scale | Sticky positioning needs no pointer maths; any measured position goes through `FE:src/utils/uiZoom.ts` (`html{zoom:0.75}`) |
| Export | Through the twin report (3.6): PDF landscape with repeated header and block bands, XLSX with frozen first column and header and typed cells, CSV wide or long (`metric_key`, period, value, status). States are exported as words, never as 0 |
| Size | At most about 60 rows × 30 columns: no virtualisation |

Summary columns by metric type (the "Range" column of the tile tables):

Rules applied by the metric service per 05 §1.3-§1.4 (the `include[]` value in brackets):

| Column | Σ additive flow | R ratio | D distinct count | PIT point in time |
|---|---|---|---|---|
| Total (`total`) | Sum over the displayed periods | Recomputed over the range from summed components (never an average of ratios, 05 §1.3) | Recomputed over the range | Latest period-end value |
| Average (`average_closed`) | Mean of the closed periods (the open period is excluded) | not shown | Mean of the closed periods | Mean of the closed period ends |
| Year to date (`to_date`) | `to_date()` of 05 §1.4, fiscal year from `fiscal_year_start_month` | recomputed | recomputed | not shown |
| Prior year (`prior_year_range`) | Same displayed range one year earlier | same | same | Value one year before the latest period end |
| Goal (P3: `production_goal` row; P4: `goal`) | Sum of the goals of the displayed periods (production); target (other metrics, P4) | Target and band (P4) | not shown | Target (P4) |
| Variance (`variance_to_goal`) | Total − goal and percent of goal; the open period counts through yesterday on both sides (05 §8.4) | Difference in percentage points | not shown | Value − target |
| Trend | Sparkline of the period values, open period hollow | same | same | same |

### 3.4 Scorecards and rankings (`Scorecard`, `RankingTable`)

Two versions. **Scorecard v1** (P2, DASH-52): the member × metric table with the residual row, the ratio-of-sums footer
row, hide-inactive, row and cell navigation, and the visibility rules of `provider_comp` and `user_activity` (08 PR-8);
no rank column, no median or quartile footer rows, no PEER comparison. Every `scorecard` tile of P2 and P3 dashboards uses
v1. **Scorecard v2** (P4, DASH-38, on ENG-51): ranks, rank movement, median and top-quartile footer rows, peer markers,
`RankingTable`. Rows of the table below marked (v2) arrive with v2.

| Topic | Specification |
|---|---|
| Shape | Rows = members of one dimension (`provider_id`, `office_id`, `user_key`, `carrier_id`); columns = metrics; one request per at most 12 metrics |
| Shipped sets | Doctor, hygienist and team-member sets of 05 §5.8; office set of 2.14; payer set of 2.7 |
| Cell | Value, band colour with icon, trend arrow against the comparison period; rank among ranked members (v2); the denominator is in the tooltip ("42 visits") |
| Footer rows | Organisation or office value (ratio of sums, labelled as such); median member and top-quartile member (v2); "average office" is a different number and is not shown under the name "average" (05 §9.3 rule 1) |
| Residual | The unassigned member (`Unassigned`, `Unallocated`) is always a row and is never ranked |
| Ranking (v2) | Only normalised metrics rank (rates, per day, per visit, per hour, per chair); totals are listed and rank only on request. Members below `rate_min_denominator` are unranked; quartile marks need at least 3 ranked members; top and bottom fifth are highlighted only with at least 5 |
| Truncation | Top-N and bottom-N keep ties and add an explicit `other` row (`include_other`); "show all" is always offered |
| Visibility | Provider rows are class `provider_comp`. A provider-restricted caller receives the own row only: rank, share and practice totals are not returned. A peer mean (v2) is returned only when at least `min_peer_group` (default 5) other providers contribute, the caller not counted; a median or quartile tick only from `min_peer_group_quantiles` (default 10) others; below that the point is `suppressed`; minimum and maximum of others are never returned (08 §4.2 PR-8, §5.7 SC-1). User rows are class `user_activity`: a team member sees only the own row |
| Hide inactive | Members with no non-zero value in the range are hidden by default and stay selectable |
| Navigation | Row click = that member's dashboard (`dashboards.provider`, the office's `dashboards.main`); cell click = drill |
| Custom scorecards (P5) | A user-built scorecard = a saved view of the `scorecard` tile with a chosen member dimension and metric list (section 9) |

### 3.5 Trend, bar, funnel, ageing and heatmap visuals

All charts: Recharts; series colours in a fixed order from the existing palette (`#3A6EA5`, `#2FB9A7`, `#F59E0B`, `#8B5CF6`,
`#EC4899`, `#10B981`, `#94A3B8` [A]); red, amber and green are reserved for bands; a "show as table" switch and a generated
one-line summary on every chart; reduced-motion respected; every mark is clickable and drills.

| Component | Used for | Rules |
|---|---|---|
| `TrendChart` | Metric over time (lines; bars for counts) | Comparison series dashed and lighter; the open period is a dotted segment or hollow bar; goal as a horizontal or stepped line; at most 4 series; grain follows the range (day up to 45 days, week up to 6 months, month beyond) with an override among the metric's `time_grains[]` |
| `BarsChart` | Breakdown by one dimension: grouped, stacked or horizontal ranking | Sorted by value unless the dimension is ordered (buckets, weekdays); top-N + `other`; goal markers per bar; stacked bars only for additive metrics |
| `FunnelChart` | `treatment_funnel_amount` by `funnel_stage`; waterfall variant for `cash_conversion_waterfall_amount` | Stage value and share of the first stage; lighter segment = not converted; stages are exclusive (I-8); cohorts whose window is still open are hatched and excluded from the conversion figures |
| `AgingBars` | `ar_aging_amount`, `outstanding_claims_amount` by bucket | Buckets and their order from the organisation's bucket set (`rpt_aging_bucket_sets`, setting `aging_bucket_set`); each bar split patient / insurance where the metric has the split; neutral colour for the current bucket, amber from 60 days, red from 90 days; a zero bucket prints 0; credits are shown beside the bars, never netted into them (03 §2.14) |
| `HeatmapGrid` | Utilisation and open time by provider or operatory × day; rates by weekday × month | One-hue sequential scale, darkest = highest; for "lower is better" metrics the legend says so; value and denominator in the tooltip; a table view; cell click = list or Scheduler day |
| Pacing chart | Production against goal inside a period | 4.4 |

### 3.6 Layout, export, present mode, mobile

| Topic | Design | Phase |
|---|---|---|
| Grid | 12 columns, titled sections; tiles declare `size`; the grid reflows to one column below 768 px | P1 |
| Personal layout | Show / hide and reorder tiles inside a section; matrix options (hidden and pinned rows, summary columns, order, cell mode); the chosen view tab. Stored through `PUT /analytics/dashboards/{dashboard_key}/layout` as the `view_kind = layout` row of 02 §8.1. Explicit edit mode with Save / Cancel / Reset | P1 |
| Saved views | Named parameter sets (`report_saved_views`, `object_type = dashboard`), shareable; `office_policy = follow_working_office` by default so a view follows the user's office | P1 |
| Organisation default | An administrator stores the default layout and view per dashboard (`is_org_default`) | P2 |
| Free grid, tile library | Resize and move tiles; add a `kpi` or `trend` tile for any metric the caller may query, from a searchable metric library grouped by 05 `group`; the tiles marked "tile library (off by default)" in section 2 (consistency, dispersion, health score, demographics, patient value) live here and are on no default layout; standard dashboards stay locked and are duplicated to customise | P4 |
| Print / export / subscribe | Every dashboard has a **twin report definition** with the same key, generated from the dashboard definition by one generic builder (never hand-written): `kind = standard`, `status = hidden` (not in the report catalog), one `matrix` block per matrix, `key_value` blocks for KPI groups, `table` blocks for scorecards and chart tiles. Its `python_builder` calls the metric service with the same tile queries, so the run snapshot, the PDF, the XLSX and the screen show the same values (AD-5, AD-6), and schedules, deliveries and audit come from the engine unchanged. Charts are not drawn in PDFs; their table form is printed | P1 (matrix), P2 (others) |
| Present mode | Full screen, large type, optional rotation through the view tabs every 30 s, no menus; for the huddle on a wall screen | P3 (with the huddle, DASH-21) |
| Mobile | Single column; KPI cards keep value, delta and sparkline; the matrix keeps its sticky first column and scrolls sideways; no layout editing; the Morning Huddle is the first surface tested on a phone | P3 single-column rendering of the huddle (DASH-21); P4 for every other dashboard (DASH-44) |
| Insight strip | One line above the tiles for generated call-outs, each linking to its tile and drill (8.4) | P5 |

---

## 4. Goals and pacing

### 4.1 Scope of this section

Two stores, both defined in 05 §8.2: **production goals** (`provider_production_goals`: a daily goal per provider, office
and month; table from DATA-24) and **targets and bands** for any other metric (`metric_targets`, MET-21). How a goal amount
is resolved for a scope and a period and the pacing formulas are 05 §8.3-§8.4 and are not repeated. This section fixes
where goals are entered, the `/analytics/goals` payload (02 §13 row 62) and how progress is displayed. Nothing exists today
[V]: no table, service or screen; the two legacy rights `setup_provider_goals_screen_*` are rows of `REMOVED_ROWS` in
`access_rights_catalog.py`, that is, deleted by the catalog curation.

### 4.2 Where goals are set

| Entry point | What is edited | Phase |
|---|---|---|
| **Goals page**, tab "Production goals" (route owned by 07; also reachable as Setup › Providers › Provider Goals, the legacy location) | Grid per office: rows = providers (office roster first, then other providers who produced there in the last 12 months; nobody is excluded), columns = months of the current year and up to 13 months ahead (legacy horizon). Cell = `daily_goal`, `working_days`, resulting `monthly_goal`; row total; read-only office row = sum of its providers; doctor and hygiene subtotals; `production_basis` selector (default = setting `goal_production_basis`) | P3 |
| Grid tools | **Autofill working days** from the provider calendar (`rpt_provider_calendar_days()`: schedule minus holidays; "schedule not configured" when the template is the default) · **Seed from history** (the `auto_seed` rule of 05 §8.3; only fills empty cells, never overwrites a non-zero goal) · **Copy month across** · **Copy last year + x %** · **Spread an annual amount** by working days · paste from a spreadsheet (provider × month block) · from P4, **From hours**: the provider's `production_per_hour` target × scheduled hours (source `hours_based`, 05 §8.3) | P3 |
| Goals page, tab "Targets and bands" | Rows = metrics with a target or band; scope picker organisation → office group → office → provider kind → provider (the resolution order of 05 §8.2); fields `target_value`, `band_warn`, `band_good` or `range_low` / `range_high`; preview of the last 12 periods coloured with the proposed bands | P4 |
| Inline "Set target" on a KPI card or scorecard column | Opens the same form for that metric and scope | P4 |
| Goals page, tab "History" | Versions of each goal row (`version`, `valid_from`, `superseded_at`, author) and of each target row | P3 |
| Prompt on a dashboard | When no provider of the office has a goal for the open month, tiles that need one show "No goal set" with "Seed goals from history" (managers only). Nothing is seeded silently — the legacy product auto-populates | P3 |

Rules: saving writes new versions (history is never rewritten, 05 §8.2); a change to a month that is locked (PD-9) is
allowed, is marked "changed after close" and does not alter the frozen pacing values of that month; every save is audited
with before and after values; the grid uses the unsaved-changes guard of the app (`useUnsavedGuard` [V]). Rights:
`analytics_goals_view` to read and `analytics_goals_manage` to write (08 §2.2 D); a provider-restricted user (PD-11) sees
only the own row, read-only. Targets and bands need the metric-administration right (05 §12.3).

### 4.3 `/analytics/goals` payload

`GET /analytics/goals` — filters `goal_kind` (`production` · `target`), `office_ids`, `office_group_id`, `provider_ids`,
`year` or `month_from` / `month_to`, `metric_key`, `include[]` (`suggestions`, `history`), `page`, `size` →
`PaginatedResponse[GoalRead]`. `PUT /analytics/goals` — body `{goals: GoalWrite[], reason}`; all-or-nothing; upsert on the
natural key; returns the stored `GoalRead[]`.

| `GoalRead` field | Kind | Meaning |
|---|---|---|
| `goal_kind` | both | `production` or `target` |
| `id`, `version`, `valid_from`, `source`, `updated_by`, `updated_at` | both | `source` ∈ `manual`, `auto_seed`, `hours_based`, `import` (production); `default`, `benchmark`, `manual`, `derived` (target) |
| `provider_id`, `office_id`, `goal_month` | production | Natural key; `office_id` NULL = every office the provider works at (05 §8.2) |
| `daily_goal`, `working_days`, `monthly_goal`, `production_basis` | production | As stored; `working_days` or `monthly_goal` may be NULL |
| `working_days_resolved`, `working_days_origin`, `monthly_goal_resolved` | production, read-only | The values the metric layer will use: origin ∈ `entered`, `provider_calendar`, `office_calendar`, `fixed_20` (05 §8.3, setting `goal_working_days_fallback`) |
| `working_days_calendar`, `daily_goal_suggested` | production, with `include[] = suggestions` | Calendar days for Autofill and the auto-seed figure; also returned for provider-months that have no stored row, so the grid can offer both without another call |
| `metric_key`, `scope_kind`, `scope_id`, `period_grain`, `period_start` | target | Natural key (05 §8.2) |
| `target_value`, `band_warn`, `band_good`, `range_low`, `range_high`, `benchmark_key` | target | Validated against the metric's `direction`; overlapping or mis-ordered bands → 422 |

Errors: 422 `goal_invalid` with one entry per row and field (negative goal, `working_days` above the days of the month,
unknown provider or office, band order); 403 when a row is outside the caller's office scope; 409 `goal_version_conflict`
when a row changed since it was read (`version` is sent back on write).

### 4.4 How progress is shown

| Surface | Display | Keys |
|---|---|---|
| KPI card | Goal amount, bar to the goal, percent of goal, pace word: **behind** / **on pace** / **ahead** from the bands on `production_vs_goal_pct` (shipped 85 / 95, 05 §8.4); second line "needs $X per remaining working day (N left)" | `production_goal`, `production_vs_goal_pct`, `daily_avg_needed_to_goal` |
| Pacing chart | Cumulative production by working day of the period (solid) against the cumulative goal (dashed, stepping only on working days); from today on: scheduled production stacked on the actual (lighter) ending at the forecast marker; goal amount as the end label; a second marker for the run-rate projection | `net_production` by day, `production_goal` by day, `scheduled_production` by day, `production_forecast` |
| Matrix | Goal and Variance columns, percent-of-goal cell mode (3.3) | `production_goal`, `production_vs_goal_pct` |
| Huddle provider table and scorecards | Daily goal, scheduled today, average per day so far, needed per day; band colour on percent of goal | 2.4 |
| Rate and count targets | Band colour on the value; for counts the pace = month-to-date ÷ (target × elapsed working days ÷ working days) (05 §8.4) | any metric with a `metric_targets` row |

Edge rules shown to the user (the arithmetic is 05 §8.4): no goal row in the scope → "No goal set", never 0 % and never
100 %; goal reached → "Goal met" and the needed-per-day line disappears; a range that contains today is judged through
yesterday on both sides, and the card says "through <yesterday>"; working days from a fallback → footnote "schedule not
configured"; a scope that mixes production bases → warning from the metric layer, shown as a footnote.

---

## 5. Comparison and benchmarking inside one organisation

Rules of record: 05 §9.3 (PD-13). This section says how the product applies them.

### 5.1 Rules

| # | Rule | Where it shows |
|---|---|---|
| 1 | Comparators offered: organisation value (ratio of sums), median office, top-quartile office, the office group's value, the office's own trailing 12 months, the same period last year. Each is labelled with what it is | PEER comparison of KPI cards; footer rows of scorecards; reference lines on bars |
| 2 | Only normalised metrics are ranked: rates, per working day, per visit, per hour, per chair, per provider. The rank-metric picker lists only those; totals can be shown as columns and are ranked only when the user asks | `dashboards.multi_office` Ranking |
| 3 | One definition for every office: metric settings and code-group overrides are organisation-wide (05 §3), so no dashboard offers a per-office definition | — |
| 4 | Volume guard: a member below `rate_min_denominator` is listed unranked and uncoloured; median, quartiles and dispersion need at least 3 ranked members | rankings, scorecards, `metric_dispersion_cv` |
| 5 | Month and week comparisons of volume metrics offer "per working day" beside the total, because offices and months differ in open days | toggle on the office scorecard |
| 6 | Rankings never truncate silently: ties are kept and the remainder is an `other` row; "show all" always exists | 3.4 |
| 7 | Rank movement is shown against the comparison period; top and bottom fifth are highlighted only with at least 5 ranked offices | Ranking |
| 8 | Cross-organisation percentiles are out of scope (PD-13); published benchmarks stay off until `show_external_benchmarks` is enabled (05 D-9) | — |

### 5.2 Office groups and roll-ups

| Topic | Design |
|---|---|
| What exists | One group per office: `offices.office_group_id` → `office_groups` [A]; CRUD at `/office-groups` [A]; no row after migration (03 §2.2), so groups appear only once an organisation creates them; no shared hook or nav entry in the frontend [A] (`analysis/fe_cross_cutting.md` §3.4) |
| Roll-up | A group value = the metric computed over the member offices (sum for additive metrics, ratio of sums for ratios, recomputed distinct counts); offices without a group form the member "No group" |
| Views | **Organisation** (one value) → **by office group** (subtotal rows, expandable) → **by office**. Up to 10 offices render as cards with sparkline; more as a table |
| Scope | `office_group_id` is a scope value of 04 §6 and a grouping dimension (05 §1.5); a caller sees a group value only for the group's offices they may read, and the notice says "group value covers 4 of 6 offices" |
| Regions and brands | Overlapping groupings (region and brand at once) need a many-to-many membership that neither 03 nor the application has; not planned here (open decision D-3) |
| Setup dependency | Office groups need a setup screen entry and a shared `useOfficeGroups` hook before P4 (existing rights `setup_office_groups_screen_*` [A]) |

### 5.3 Same-store rule

| Topic | Design |
|---|---|
| Comparable office | Active, has production in both periods, and opened at least `same_store_min_months` (default 13) before the end of the current period, by `rpt_office_dim.opening_date` or, when that is empty, its first production date (05 §9.3 rule 5) |
| Switch | "Same-store only" on `dashboards.multi_office`: every comparison, growth and ranking tile then uses the comparable set |
| Transparency | Offices left out are listed with the reason: opened too recently, no production in the prior period, inactive |
| Aggregates | `same_store_growth_pct` is shown as weighted (ratio of sums, the headline), simple mean and trimmed mean (trimmed only with at least 10 offices) side by side, because they differ; `offices_growing_pct` beside them |
| Unverified | No published rule for the ramp of a new office or for acquired practices was found (`research/denticon_analytics_and_dso.md` §14.3); the 13-month default is a setting |

### 5.4 Rights and scope

`all_offices` needs `office_scope_view_all_offices` [V] or a privileged role (04 §6.6); without it the dashboard compares
the caller's assigned offices and says so. Provider rankings follow 3.4 (class `provider_comp`). A comparison never reveals
an office outside the caller's scope through a median or a rank: comparators are computed over the offices the caller may
read.

---

## 6. Worklists

The legacy menu entry "Interactive Reports" holds two documented work queues, Eligibility Verification and Unsigned
Progress Notes (`research/denticon_analytics_and_dso.md` §3); the two frontend routes for them are placeholders today [A]
(`analysis/fe_existing_reports.md` §1.1). A worklist here = a filtered queue + inline actions that change the record + a
recorded outcome + automatic removal when the condition clears.

| `report_key` | Title | Origin | Grain | Report family (08 §2.3) | Phase |
|---|---|---|---|---|---|
| `worklists.eligibility_verification` | Eligibility Verification | legacy Interactive Report | appointment × coverage slot | `insurance` or `appointments_dps_ins_verification_reports` | P3 |
| `worklists.unsigned_progress_notes` | Unsigned Progress Notes | legacy Interactive Report | progress note | any of `daily`, `my_reports` (`self_unless_privileged`) | P3 |
| `worklists.unscheduled_treatment` | Unscheduled treatment | legacy analytics detail list; Treatment Plan Status Detail | patient | `treatment_plan` | P3 |
| `worklists.recall_due` | Recall due and not scheduled | Recall Due Report | patient | `recall` | P3 |
| `worklists.outstanding_claims` | Outstanding claims follow-up | Outstanding Claims + `CREATE TASK` | claim | `insurance` | P3 |
| `worklists.denied_claims` | Denied claims: appeal, resubmit or write off | Claims List (denied status); competitor open-denials queue | claim | `insurance` * | P3 |
| `worklists.patient_ar` | Patient A/R follow-up | Aging Report by Home Office + `CREATE TASK` | guarantor account | `monthly` | P3 |
| `worklists.broken_appointments` | Missed and cancelled appointments not rescheduled | Appointment List (Cancelled, Missed); Scheduler call list | patient (latest broken appointment) | `appointment` * | P3 |
| `worklists.unconfirmed_appointments` | Unconfirmed appointments | legacy Front Office tile | appointment | `appointment` * | P3 |
| `worklists.unallocated_credits` | Unallocated payments and credits | Unallocated Payment/Adjustments | unallocated credit | `monthly` * | P3 |
| `worklists.reactivation` | At-risk and lapsed patients | legacy Danger Zone / Inactive list | patient | `lists_patient` * | P3 |
| `worklists.not_reappointed` | Left without a next appointment | legacy huddle list; "Next Appointment Booked" office report | patient visit | `appointment` * | P1 read-only list (DASH-53), P3 worklist |
| `worklists.unbilled_procedures` | Not billed, on hold, not sent | Claims Not Created; Procedures on Hold; Claims Created Not Sent | charge or claim | `insurance` * | P3 |
| `worklists.unresolved_appointments` | Past appointments never resolved | Missed Appointments Not Marked As Missed | appointment | `appointment` * | P3 |
| `worklists.todays_patients` | Today's patients (huddle list) | new | patient on today's schedule | `appointment` * | P3 |
| `worklists.day_close_checklist` | Days to close | new (PD-9 day close) | office-day not yet closed | `daily` * | P2 |
| `worklists.payment_plan_overdue` | Overdue payment-plan instalments | Payment Plan Charges | contract instalment | `management` * | P3 |
| `worklists.lab_cases_due` | Lab cases not back before the appointment | Lab Report | lab case | `appointment` * | P3 |
| `worklists.my_followups` | My follow-ups (and team follow-ups) | legacy Task Manager | follow-up | any family above that the caller holds | P3 |

Families without a mark are fixed by 08 §2.3; `*` = proposed here by the same rule (family of the legacy counterpart) and to be
confirmed by 08 (12.4). The View Only code of the family opens the worklist.

### 6.1 Model

**Definition.** Each worklist is a report definition of 02 §3.1 with `kind = worklist`, `paging_mode = live` (keyset pages
from the dataset, no snapshot, 02 §4.6), `cost_class = instant`, `schedulable = false`, `row_actions[]` and
`bulk_actions[]` (02 §3.10). Parameters, scope, rights, data classes, audit and the patient manifest are the engine's.
Exporting a worklist creates a normal snapshot run. Live keyset paging is ENG-48 (P3); the two lists served earlier
(`worklists.not_reappointed` read-only in P1, `worklists.day_close_checklist` in P2) run as ordinary `instant` runs with
snapshot paging until then, under the same key.

**Follow-up state and event log** (NEW business tables of the worklist feature; not engine state):

| Table | Columns | Notes |
|---|---|---|
| `worklist_followups` | `id`, `tenant_id`, `worklist_key`, `subject_type` (`patient`, `account`, `appointment`, `claim`, `note`, `charge`, `credit_entry`, `coverage_slot`), `subject_id`, `cycle_no`, `patient_id`, `account_id`, `office_id`, `status` (`open` · `in_progress` · `snoozed` · `resolved` · `dismissed`), `assigned_user_id`, `assigned_by`, `assigned_at`, `due_date`, `priority` (`high` · `normal` · `low`), `snoozed_until`, `first_listed_on`, `last_listed_on`, `value_at_listing`, `attempts`, `last_event_at`, `last_outcome_code`, `last_channel`, `resolved_at`, `resolution` (`auto` · `manual`), `resolution_reason`, `resolved_by`, `credited_user_id`, `result_value`, `created_at`, `updated_at` | Unique (`tenant_id`, `worklist_key`, `subject_type`, `subject_id`, `cycle_no`): a subject that returns to a list later starts a new cycle. An assigned follow-up with a due date **is** the task; the personal `user_tasks` table [V] is not used |
| `worklist_events` | `id`, `tenant_id`, `followup_id`, `event_type` (`listed`, `contact`, `note`, `assigned`, `snoozed`, `message_sent`, `letter_sent`, `inline_action`, `resolved`, `dismissed`, `reopened`), `channel` (`phone`, `sms`, `email`, `letter`, `in_person`, `none`), `outcome_code`, `note`, `ref_type`, `ref_id` (`sms_message`, `email_message`, `letter_batch`, `appointment`, `payment`, `statement`, `claim_submission`), `promise_date`, `promise_value`, `run_id`, `created_by`, `created_at` | Append-only. `note` is class `phi_identified` and never leaves the organisation boundary (8.5) |
| `worklist_outcome_codes` | `code`, `label`, `worklist_family`, `counts_as_contact`, `is_terminal`, `is_active`, `tenant_id` NULL = shipped | Shipped: `no_answer`, `left_voicemail`, `wrong_number`, `spoke_scheduled`, `spoke_will_call_back`, `spoke_declined`, `do_not_contact`; financial `promise_to_pay`, `payment_taken`, `payment_plan_set`, `disputed`, `statement_sent`, `referred_to_agency`; claims `carrier_called`, `in_process`, `info_requested`, `resubmitted`, `appealed`, `denied`, `paid_pending_posting`; eligibility `verified`, `not_eligible`, `coverage_updated` |

**Membership predicate.** Each worklist has one fixed membership predicate per organisation, stored as organisation
settings (02 §13 row 23, request 12.4 g) and distinct from the view filters. The predicate alone opens and resolves
follow-up cycles; view filters (thresholds, windows, providers, carriers) only narrow the displayed list and never create or
resolve a cycle.

| Worklist | Membership predicate | Settings (default) |
|---|---|---|
| `eligibility_verification` | appointment within the look-ahead, slot not verified within the validity window | `eligibility_lookahead_days` (7), `eligibility_valid_days` (05 §3) |
| `unsigned_progress_notes` | app-era note not signed and not struck off | — |
| `unscheduled_treatment` | pending unscheduled item presented within the age limit | `unscheduled_tx_max_age_months` (24) |
| `recall_due` | `recall_status IN ('due', 'overdue')` for the recall code group | `recall_worklist_code_group` (`recall_hygiene`) |
| `outstanding_claims` | `status_class IN ('sent', 'partially_paid')` and age at least the minimum | `outstanding_claim_min_age_days` (30) |
| `denied_claims` | `status_class = 'denied'`, or a denied line on a partially paid claim (DATA-31), no terminal outcome logged | — |
| `patient_ar` | patient-responsible open amount above the minimum and its oldest open item at least the minimum age | `patient_ar_min_balance` (25.00), `patient_ar_min_age_days` (30) |
| `broken_appointments` | latest cancelled or missed appointment within the look-back, no later live appointment | `broken_appt_lookback_days` (90) |
| `unconfirmed_appointments` | live, unconfirmed, within the look-ahead | `unconfirmed_lookahead_days` (7) |
| `unallocated_credits` | unallocated remainder above zero | — |
| `reactivation` | active patient, last visit beyond `at_risk_from_months`, no future appointment | `at_risk_from_months` (05 §3) |
| `not_reappointed` | visit within the look-back, no future appointment | `not_reappointed_lookback_days` (30) |
| `unbilled_procedures` | insured production unbilled or on hold, or claim unsent | — |
| `unresolved_appointments` | past appointment with `status_class = 'past_unresolved'` and no charge that day | — |
| `payment_plan_overdue` | instalment past due by the grace days and unpaid | `payment_plan_grace_days` (10) |
| `lab_cases_due` | lab case not received, appointment within the look-ahead | `lab_case_lookahead_days` (3) |
| `day_close_checklist`, `todays_patients` | informational: no follow-up state | — |

**Membership sync and automatic resolution** (job, DASH-29): after the nightly data refresh, and for the touched subjects
after every action, each worklist's membership predicate runs per organisation. New subjects get a
follow-up row (`listed` event, `value_at_listing`); subjects that no longer match are resolved with `resolution = auto` and
the worklist's exit reason (`appointment_booked`, `claim_paid`, `note_signed`, …). Attribution: `credited_user_id` = the
author of the last contact or message event inside the attribution window before the resolution (default 30 days, setting
`worklist_attribution_window`), `result_value` = the money realised (fee booked, amount collected) per worklist. A follow-up
row is created on the spot when a user acts on a subject the sync has not yet seen. Both tables are registered as
passthrough datasets (03 §2.0) so that `follow_up_completion_pct` (05 §5.12: follow-ups resolved ÷ follow-ups listed, by
`first_listed_on`) and the outreach results view (DASH-43) read them through the metric registry.

**Counters.** "Open · due today · overdue · assigned to me" on dashboards come from `worklist_followups` and carry the
time of the last sync; the list itself is always live.

**Engine contract this needs beyond 02 §3.10** (requests, 12.4): (a) selection on a live list by `row_ids[]` (values of the
block's `row_id_column`) or `all`, both re-evaluated on the server against the worklist query, the run's parameters and the
caller's scope — an id that is not on the list is returned in `excluded[]`, never acted on; (b) the action response returns
the refreshed rows so the list updates without a refetch. ENG-49 as planned resolves entity ids from a snapshot, so (a)
amends it for live lists. Until the amendment is accepted the fall-back is: a bulk action first creates an `instant`
snapshot run of the selection (the `export_selection` path) and acts on that run's ids through ENG-49; the result is the
same exclusion rule, at the cost of one extra run.

**Action execution.** Inline and bulk actions that change a record call the owning feature's service layer inside the
action handler or job (for example `scheduler_service.update_status`, `progress_notes_service.sign_progress_note`), not its
HTTP route: `PATCH /appointments/{appointment_id}/status` [V] rebuilds its response by listing every appointment of the
office, archived ones included, with no date filter (`app/api/v1/scheduler.py` L71-74, `scheduler_service.py` L142-172),
which a 200-row bulk action would repeat 200 times. Rights, audit and side effects are those of the service call.

### 6.2 Common columns, filters and actions

| Common to every worklist | Detail |
|---|---|
| Columns | Follow-up status, assignee, due date, last contact (date, channel, outcome), `attempts`, snoozed until; contactability flags of `rpt_patient_dim` (`no_correspondence`, `no_auto_sms`, `no_auto_email`, `sms_opt_out_at`); `OfficeBadge` when the row's office is not the working office |
| Filters | `office_scope` on the worklist's own office attribution (appointment office, claim office, patient home office, transaction or home office for A/R) — a working context, never a fence; `followup_status` (default `open` + `in_progress`; snoozed rows return on their date); `assigned_user_ids` (`all` · `current_user` · unassigned); `not_contacted_within` (04 type `lookback_days`); `provider_ids` |
| Sort options | Declared per worklist (each needs an index, 02 §4.6); default = most valuable or oldest first |
| Saved views | A worklist with parameters is saved like any report view; "My queue" = `assigned_user_ids = current_user` |

| Action | `kind` (02 §3.10) | Effect | Record written |
|---|---|---|---|
| Open record | `navigate` | Patient shell, claim, ledger, treatment plan, appointment in the Scheduler (`route_key`s owned by 07) | engine drill event |
| Log outcome | `custom:log_outcome` | Dialog: channel, outcome code, note, next step date (sets `due_date` or `snoozed_until`), promise fields where the family uses them | `worklist_events` (`contact`) |
| Assign / create task | `create_task` | Sets assignee, due date, priority; writes a `notifications` row [V table] for the assignee | `assigned` |
| Snooze · Resolve · Dismiss | `custom:snooze`, `custom:resolve` | Hide until a date; close by hand with a reason | `snoozed`, `resolved`, `dismissed` |
| Send text | `send_sms` | Handler of the SMS feature (PD-15): one `POST /sms/send` per patient [V]; a bulk send is a server job. Template with merge fields | `message_sent`, `ref_id` = `sms_messages.id` |
| Send e-mail | `send_email` | Handler of the e-mail feature | `message_sent` |
| Letters · postcards · labels | `letters`, `postcards`, `labels` | Correspondence features (PD-15). Letters: `POST /letters/render-batch` [V] with the resolved `patient_ids`; postcards and labels when those features exist | `letter_sent`, `ref_id` = batch id |
| Schedule | `navigate` | Scheduler booking hand-off `openSchedulerForBooking` [V] with the patient and, where known, the procedures | none at click; the booking resolves the item at the next sync |
| Export selection | `export_selection` | Snapshot run of the selected rows | run audit |

Bulk rules: selection = the page or "all N matching" (re-evaluated on the server, capped by `max_selection`, default 500;
bulk actions that change appointment status are capped at 200 per job and always run as a job with progress).
The confirmation states the exclusions before anything is sent ("212 selected · 187 will receive a text · 25 skipped: 14 no
mobile number, 9 opted out, 2 no-correspondence"); exclusions are computed on the server from `requires[]` (`sms_consent`,
`email_address`, `mailing_address`). Long actions run as jobs with progress and a downloadable failure list; the gateway's
429 `sms_rate_limited` [V] is absorbed by the job; a re-submitted action cannot send twice (`client_id` = hash of run, action
and subject; unique `uq_sms_messages_tenant_client_id` [V]). Rights (08 §2.1, §2.3): an action needs the right of the feature that
performs it (sign a note, verify eligibility, change an appointment status, send a text, generate letters). The follow-up
actions introduced here (log outcome, assign, snooze, resolve) and bulk messaging have no code in 08 yet:
`worklists_followup_manage` and `worklists_bulk_message` are requested (12.4, SEC-36). Every action is audited as
`report.action` with the entity ids (08 §6.2).

### 6.3 Eligibility Verification — `worklists.eligibility_verification`

| | |
|---|---|
| Rows | One per appointment and coverage slot: `rpt_appointment_facts` (live, `appointment_date` in the window) joined to `rpt_insurance_coverage` (`category = 'dental'`, tier per `coverage_orders`) where the slot is not currently verified: `elig_status_class <> 'verified'` or `elig_verified_on` older than `eligibility_valid_days` before the appointment (05 §3 setting 35). Legacy rule: appointment on the chosen date, eligibility not verified, date defaults to today |
| Columns | Appointment date and time, patient, provider, carrier and phone, plan and group number, subscriber and member id (class `phi_sensitive`, masked until revealed), tier, status class, last verified on and by, days to the appointment, latest eligibility note |
| Filters | `office_scope` (appointment office); `date_range` on `appointment_date` (default `today`; presets tomorrow, next 2 working days, next 7 days); `carrier_ids` (options limited to carriers in the result, as legacy); `coverage_orders` (default primary); `provider_ids`; verification state (`unknown` · `not_eligible` · expired); `eligibility_on_hold` |
| Inline actions | **Update status** (`custom:verify_eligibility` → `POST /insurance-subscribers/{subscriber_id}/verify-eligibility` [V] with `elig_status`, `notes`) · **View coverage** (patient insurance screen) · **Open carrier website** (when the carrier record holds a URL; to verify in carrier setup) · **Request updated insurance** from the patient (text or e-mail template) · **Run a real-time check**: hidden until a clearinghouse integration exists (none today; DATA-38) |
| Bulk actions | Text or e-mail request, assign, export. No bulk "mark verified": each verification is a deliberate act |
| Outcome and exit | Outcomes `verified`, `not_eligible`, `coverage_updated`, `carrier_called`. The row leaves when the slot is verified within the validity window, the appointment is cancelled or past, or the coverage is removed |
| Data notes | One stamp per subscriber marks every dependant [A]; per-verification history starts with DATA-34; `elig_status` is unknown on every migrated subscriber (03 §2.21), so at first nearly every insured appointment is listed — hence the one-day default. Metric: `eligibility_verified_pct` |

### 6.4 Unsigned Progress Notes — `worklists.unsigned_progress_notes`

| | |
|---|---|
| Rows | `rpt_progress_note_facts` where not `is_signed`, not `is_struck_off`, `era = 'app'`. Default `note_date` = today (the legacy queue lists today only); presets "last 7 days" and "all unsigned" |
| Columns | Note date, patient, author, provider (`author_provider_id`; the note's own provider after DATA-18), office, created at, locked or not, days unsigned |
| Filters | `office_scope`, `date_range` on the note date, `provider_ids`, `user_ids` (author), locked state. Opens with any of the families `daily`, `my_reports` (08 §13.3), so a Doctor-preset user who holds only My Reports opens it. Provider restriction `self_unless_privileged`: a provider sees the own notes (PD-11) |
| Inline actions | **Review and sign**: the note opens read-only in a side panel; signing calls `custom:sign_note` → `POST /progress-notes/{note_id}/sign` [V], whose body is only the optional `username` / `password` of another provider (`ProgressNoteSignRequest`, `app/schemas/progress_notes.py` L77-82); when the office requires a signature image, the provider's image is then saved through the existing patient-signatures call (`saveUserSignature` → `createPatientSignature` with `signature_type = 'progress_note'`, `FE:src/features/progress-notes/progressNotesService.ts` L257-267 [V]; captured with `SignatureCapture` [V]) · **Open note** in the patient's progress notes (text edits follow the server's lock rule) |
| Bulk actions | **Remind author** (in-app notification). **Sign selected** only when the organisation setting `worklist_bulk_sign_enabled` is on (default off; decision D-11): own notes only, at most 50, and the confirmation lists every note with patient, date and the first line of its text; every note is signed by its own audited call |
| Outcome and exit | The row leaves when the note is signed or struck off; no outcome codes |
| Data notes | 35,286 migrated notes have no author or signature (03 §2.18) and are excluded by `era`. Print counterpart: `daily.progress_notes` (Unsigned option). Metric: `unsigned_progress_notes_count` |

### 6.5 Unscheduled treatment — `worklists.unscheduled_treatment`

| | |
|---|---|
| Rows | One per patient with at least one `rpt_treatment_item_facts` row where `era = 'app'`, `is_unscheduled` and `presented_date` inside `unscheduled_tx_max_age_months`; items in an expandable sub-table |
| Columns | Patient, phones, last visit, next appointment of any kind, oldest and latest presented date, item count, total fee, accepted fee, estimated insurance and patient share, pre-authorisation state, remaining annual maximum (`rpt_benefit_usage()`) and benefit-year end, provider, counselor |
| Filters | `office_scope`, `provider_ids` (item provider), `tx_counselor_ids`, `acceptance_state`, `treatment_plan_status` / `exclude_treatment_plan_statuses`, presented-date range, `procedure_codes` / `procedure_category_codes`, `treatment_value_min`, `benefits_remaining_min`, benefit year ends within N months, future appointment (yes · no · any), `not_contacted_within` |
| Inline actions | **Schedule** (hand-off with the plan items preselected) · Open treatment plan · Log outcome · Text / e-mail · Print proposal (`treatment_plan.treatment_plan_proposal`) |
| Bulk actions | Text / e-mail campaign (for example unused benefits before the benefit year ends), letters, assign, export |
| Outcome and exit | Shared outcome codes. The row leaves when every pending item is booked, completed, declined or inactivated, or passes the age cut-off. `result_value` = fee of the items booked inside the attribution window |
| Data notes | Migrated plans (674 headers without dates) are excluded; `is_unscheduled` is current state (05 k12). Metrics: `unscheduled_treatment_amount`, `unscheduled_treatment_patients` |

### 6.6 Recall due and not scheduled — `worklists.recall_due`

| | |
|---|---|
| Rows | One per patient: `rpt_recall_due(:tenant_id, :as_of)` rows with `recall_status IN ('due', 'overdue')` for the selected recall codes (default code group `recall_hygiene`), earliest due date per patient |
| Columns | Patient, age, phones, due date, days overdue, last completed, recall code, preferred hygienist and provider, home office, last visit, family members also due, patient balance, remaining benefits |
| Filters | `office_scope` (home office), due-date range with `recall_date_mode`, `recall_procedure_codes`, `preferred_hygienist_ids`, `preferred_provider_ids`, `overdue_band` (0-30, 31-90, 91-180, over 180 days), `patient_status`, `not_contacted_within` |
| Inline actions | **Schedule** (hand-off) · Log outcome · Text / e-mail · Edit recall (due date, inactive) in the patient's recall screen |
| Bulk actions | Recall text / e-mail (message type `recall`), postcards, labels, letters, assign, export |
| Outcome and exit | The row leaves when a hygiene appointment is booked (`recall_status = 'scheduled'`), the recall is made inactive or the patient becomes inactive. `result_value` = `scheduled_fee` of the booked appointment |
| Data notes | For migrated patients every row is derived from procedure history and per-code intervals until DATA-41 maintains recall rows (03 §2.24). Print counterpart: `recall.recall_due_report`. Metrics: `recall_due_unscheduled_patients`, `recall_overdue_patients`, `recall_outreach_yield_pct` |

### 6.7 Outstanding claims follow-up — `worklists.outstanding_claims`

| | |
|---|---|
| Rows | `rpt_claim_facts` with `status_class IN ('sent', 'partially_paid')`; pre-authorisations through `claim_kind`. Shipped saved view "Pending pre-authorisations" = `claim_kind` preauth, sorted by date sent, so pre-authorisations awaiting the carrier form their own queue |
| Columns | Carrier and phone, patient, subscriber, claim number, tier, service dates, date sent, age bucket (from `age_date_sent`), billed, expected (flagged when `expected_basis = 'billed'`), paid, `outstanding_amount`, sent method, submissions, created by, last status entry |
| Filters | `office_scope`, `report_date`, `carrier_ids`, `coverage_orders`, `claim_kind`, `claim_type`, `claim_sent_types`, `claim_amount_min`, `aging_buckets`, `provider_ids` (treating, then billing), `user_ids` |
| Inline actions | Open claim · **Log carrier contact** (outcome, reference number, expected payment date → due date) · Status history (`GET /insurance-claims/{claim_id}/status-history` [V]) · Resubmit, close or mark denied in the claim screen |
| Bulk actions | **Create tasks** — parity with the legacy `CREATE TASK`: one follow-up per claim (outstanding claim or outstanding pre-authorisation), confirmation with the count, the follow-up closes itself when the claim is paid, closed or deleted · assign · export. Default grouping by carrier so one call covers several claims |
| Outcome and exit | Claim outcome codes. The row leaves when the status class becomes `paid`, `closed`, `void` or `deleted`; a claim that becomes `denied` moves to `worklists.denied_claims` (its open follow-up is resolved with reason `moved_to_denials` and a new cycle opens there). `result_value` = insurance payment posted inside the window |
| Data notes | Migrated claims need the repairs behind 05 caveat k5; amounts are never summed across a claim family. Print counterpart: `insurance.outstanding_claims` (P2) |

### 6.8 Patient A/R follow-up — `worklists.patient_ar`

| | |
|---|---|
| Rows | One per guarantor account that meets the membership predicate of 6.1 (`patient_ar_min_balance`, `patient_ar_min_age_days`): `rpt_ar_open_items(:tenant_id, :as_of)` (`item_kind = 'open_debit'`), `open_patient` summed by bucket; home-office attribution by default, transaction office selectable (PD-4) |
| Columns | Responsible party, phones, account number, home office, patient portion by bucket and in total, insurance still expected, last patient payment (date, amount), last statement date, balance status and collections flag (DATA-35), payment-plan flag, next appointment of any member, `financial_notes`, promise date |
| Filters | `office_scope`, `report_date`, `aging_buckets`, `patient_balance_over`, `exclude_insurance_expected_accounts`, `exclude_open_claim_accounts`, `exclude_sent_to_collection`, `include_balance_status`, `exclude_statement_sent_within`, `provider_basis` + `provider_ids`, a member has an appointment within N days, `not_contacted_within` |
| Inline actions | Open ledger · **Log outcome** (promise to pay with date and amount, dispute, payment taken) · Send statement (statement feature) · Balance reminder by text or e-mail · Set balance status / send to collections · Set up a payment plan |
| Bulk actions | Statements for the selection (the statement run of `catalog/statements`) · collection letters through `POST /letters/render-batch` [V] · text reminder · create tasks (the legacy "Patient AR Follow-Up" task) · export |
| Outcome and exit | Financial outcome codes; a promise sets the due date. The row leaves when the account no longer meets the membership predicate (the `patient_balance_over` view filter does not resolve it), is written off or the account is sent to collections. `result_value` = patient payments posted inside the window |
| Data notes | Organisation-wide evaluation needs the persisted allocations of DATA-26; the patient / insurance split is an estimate on migrated charges (`split_quality`). Metrics: `patient_ar`, `patient_ar_past_due_amount` |

### 6.9 Missed and cancelled appointments not rescheduled — `worklists.broken_appointments`

| | |
|---|---|
| Rows | One per patient: the latest `rpt_appointment_facts` row with `status_class IN ('cancelled', 'no_show')` in the window for which the patient holds no later live appointment (the "not recovered" test of `broken_appointment_recovery_pct`) |
| Columns | Appointment date and time, cancelled or missed, reason and note (app era, after DATA-17), provider, booked procedures, `scheduled_fee`, patient, phones, on the call list, lifetime `missed_count` and `cancelled_count`, patient balance |
| Filters | `office_scope`, `date_range` on the appointment date (default `last_30_days`), `appointment_statuses`, `cancellation_reason_codes`, `appointment_provider_ids`, `include_off_call_list`, `appointment_kind` (hygiene · new patient · other), value at least |
| Inline actions | **Reschedule** (hand-off with the same procedures) · Log outcome · Text "invite to schedule" · Do not reschedule (dismiss with reason) |
| Bulk actions | Text / e-mail invitation, letters, assign, export |
| Outcome and exit | The row leaves when a later live appointment exists. `result_value` = `scheduled_fee` of the new appointment |
| Data notes | Migrated appointments carry no cancellation reason or stamps (05 k7). Legacy counterparts: `appointment.appointment_list` (Cancelled List, Missed List) and the Scheduler call list. Metrics: `broken_appointment_recovery_pct`, `broken_appointment_value_lost` |

### 6.10 Unconfirmed appointments — `worklists.unconfirmed_appointments`

| | |
|---|---|
| Rows | `rpt_appointment_facts`, live, not `is_confirmed`, `appointment_date` from today through the window (default 7 days: the rule of metric `unconfirmed_appointments`) |
| Columns | Date, time, patient, phones, provider, operatory, procedures, `scheduled_fee`, status, last reminder (sent, delivered, `reply_intent` from `rpt_communication_facts`), new-patient flag, eligibility status class, patient balance |
| Filters | `office_scope`, appointment-date range, `appointment_provider_ids`, `operatory_ids`, reminder state (none sent · sent without reply · reply needs attention), new patients only |
| Inline actions | **Confirm** (`custom:confirm_appointment` → `scheduler_service.update_status` with `status = "confirmed"`, the service behind `PATCH /appointments/{appointment_id}/status` [V]) · Send confirmation text · Log call outcome · Open in the Scheduler (`openSchedulerAtAppointment` [V]) to move or cancel |
| Bulk actions | Send a confirmation request to the selection · Mark selected as confirmed (confirmation dialog; at most 200 per job with progress; one audited `scheduler_service.update_status` call per appointment, 6.1 action execution) · export |
| Outcome and exit | The row leaves when the appointment is confirmed, cancelled or its date has passed |
| Data notes | Confirmation stamps exist for app-era appointments only. Metrics: `unconfirmed_appointments`, `confirmation_rate_pct`, `reminder_confirmation_rate_pct` |

### 6.11 Unallocated payments and credits — `worklists.unallocated_credits`

| | |
|---|---|
| Rows | One per unallocated credit remainder: `rpt_ar_open_items()` rows with `item_kind = 'unallocated_credit'` (the `method = 'unallocated'` remainder of `rpt_payment_allocations`); with `only_credit_balances` the rows are grouped into account credit balances |
| Columns | Account and responsible party, patient, credit kind and code, transaction date, age, original amount, unallocated remainder, entry office, provider, entered by, open debits on the same account — which separates "can be allocated now" from "true credit, refund candidate" |
| Filters | `office_scope`, `report_date` or `date_range` with `print_all_unallocated_as_of_today`, `payment_types`, `payment_adjustment_codes`, `only_credit_balances`, `provider_ids`, `user_ids`, `credit_value_min`, age band |
| Inline actions | **Allocate** (the account's allocation screen; explicit split, DATA-26) · **Refund** (refund flow) · Transfer inside the family (ledger) · Log outcome · Assign |
| Bulk actions | Assign, export |
| Outcome and exit | The row leaves when the remainder is fully allocated or refunded |
| Data notes | For history the remainder comes from derived oldest-first allocation, so a credit can be an artefact of unlinked legacy payments; the row shows `is_derived`. Needs DATA-26 and DATA-27. Print counterpart: `monthly.unallocated_payment_adjustments`. Metric: `credit_balances` |

### 6.12 Further worklists

| Worklist | Rows | Main actions | Leaves when |
|---|---|---|---|
| `worklists.reactivation` | Patients flagged active whose last visit lies between `at_risk_from_months` and `at_risk_to_months` (at risk) or beyond (lapsed) and who hold no future appointment; `rpt_patient_activity` + `rpt_patient_dim`; band filter `months_since_last_visit_band` | Text / e-mail / letter campaign, schedule, log outcome, mark patient inactive | A visit or appointment exists, or the patient is inactivated |
| `worklists.not_reappointed` | Patients with a visit in the window (view default yesterday; membership look-back `not_reappointed_lookback_days`) who hold no future appointment; P1 read-only list without follow-up state (DASH-53), worklist from P3; `visit_kind` = `any` · `hygiene` · `new_patient` · `treatment`; groupable by primary carrier (legacy huddle list) | Schedule, log outcome, text | An appointment is booked |
| `worklists.unbilled_procedures` | Insured production with `billing_state` `unbilled` or `hold`, and claims with `status_class = 'unsent'`, shown as three stages | Create claim, release hold, send claim (claim feature), assign | The claim exists and is sent |
| `worklists.unresolved_appointments` | Past appointments with `status_class = 'past_unresolved'` and no charge that day | Mark missed, completed or cancelled (`scheduler_service.update_status`, the service of `PATCH /appointments/{appointment_id}/status` [V]; bulk at most 200 per job) | A status is recorded |
| `worklists.todays_patients` | One row per patient on today's schedule with flags: patient balance due, accepted unscheduled treatment, recall due, unscheduled family members, eligibility not verified, unconfirmed, new patient with referral source, medical alert present (flag only), lab case not received, SRP opportunity, `birthday_today` (`rpt_patient_dim` date of birth, class `phi_identified`), `forms_missing` and `medical_history_due` (the `hipaa`, `consent_form_*` and `medical_history` checks of `rpt_smart_assist_checks()`, 03 §2.31, DATA-54; `not_enabled` when the office has not set them up) | Open ledger, open treatment plan, schedule family member, verify eligibility, open medical history | Informational: no follow-up state |
| `worklists.denied_claims` | `rpt_claim_facts` with `status_class = 'denied'`, or partially paid with a denied line (DATA-31); columns `denied_date`, `denial_reason_code`, `denial_remark_code`, `denied_amount`, carrier and phone, patient, claim number, tier, `appeal_date`, last status entry; default sort `denied_amount` descending | Resubmit or appeal (claim screen; outcome `resubmitted` / `appealed`) · write off the denied amount (ledger) · log carrier contact · assign | The claim is resubmitted, paid or closed, or the denied amount is written off. `result_value` = insurance payment posted later inside the window |
| `worklists.day_close_checklist` | One row per office-day before today that is not closed (`office_day_closes`, NEW, DATA-29), with child checks: `undeposited_payments_amount`, `daily_audit_exceptions_count`, `claims_unsent_count`, `unsigned_progress_notes_count`, `unresolved_past_appointments` (from P3, when its metric ships) | Open `daily.deposit_slip`, `daily.daily_audit`, the claims screen, the unsigned-notes list; **Close day** (the PD-9 feature of DATA-29, its own right and audit) | The day is closed. Informational: no follow-up state |
| `worklists.payment_plan_overdue` | `rpt_contract_installments` rows past due by `payment_plan_grace_days` and unpaid, one per contract (DATA-37) | Text reminder, take payment (ledger), log promise to pay, assign | The instalment is paid or the contract is closed |
| `worklists.lab_cases_due` | `rpt_lab_cases` not received whose patient has an appointment within `lab_case_lookahead_days` (DATA-23) | Log a call to the lab, reschedule (Scheduler hand-off), assign | The case is received or the appointment is moved past the window |
| `worklists.my_followups` | Follow-ups assigned to the caller across every worklist; supervisor mode (managers): all users, with counts by status, user and age of the due date — the legacy Task Manager dashboard | Open the item in its worklist, reassign, change due date | The follow-up is resolved |

---

## 7. Alerts and subscriptions on metrics

Built on the schedule engine of 02 §9 (`report_schedules`, `report_deliveries`, tick, run-as-owner, recipient checks);
`report_schedules.condition` is the alert hook (ENG-52). Nothing exists today [V]; `notifications` [V] has no producer and
the My Page alert widget derives its alerts in the browser from today's schedule feed and the recall list [A].

### 7.1 Kinds

| Kind | Trigger | Examples | Phase |
|---|---|---|---|
| Dashboard digest | Time | Morning Huddle at 07:30 office time on open days · weekly office review on Monday · Executive summary on the first working day after month close | P2 (dashboards with a twin report), huddle P3 |
| Threshold alert | A metric crosses a value or enters its bad band (`metric_targets`) | `collection_pct_rolling_90d` enters the bad band · `ar_over_90_pct` above the warning band | P4 |
| Pace alert | Goal off pace | `production_vs_goal_pct` in the bad band after the tenth working day while `production_forecast` is below `production_goal` | P4 |
| Change alert | Change against a comparison beyond a limit | `no_show_rate_pct` of the last 4 weeks more than 3 points above the previous 8 weeks | P4 |
| Backlog alert | A count, amount or age of open work | `claims_unsent_count` above 0 at 17:00 · `unsigned_progress_notes_count` for notes older than 2 days · `undeposited_payments_amount` above 0 at day end · `unconfirmed_appointments` for tomorrow above N at 14:00 | P4 |
| Followed-metrics digest | Time; the metrics a user follows | Weekly list of followed metrics with value, band word and change | P4 |
| Anomaly call-out | Statistical outlier (8.4) | Daily `net_production` outside the expected band for that weekday | P5 |

Shipped templates (off until an administrator enables them per office or group): collection % rolling 90 days in the bad
band · production pace behind at mid-month · A/R over 90 days above the warning band · unsent claims at day end · unsigned
notes older than 2 days · unconfirmed appointments for tomorrow · no-show rate above band over 4 weeks · undeposited
payments at day end · recall overdue % rising 3 months in a row · hygiene reappointment below band.

### 7.2 Storage, evaluation and delivery

| Topic | Design |
|---|---|
| Record | One `report_schedules` row per alert or digest. `report_key` = the twin report of the alert's home dashboard (the dashboard whose tile it was created from), `params` = that dashboard's parameters with tokens, `office_policy` fixed or `assigned_offices` (02 §9.2), `condition` = the JSON below (NULL for a digest) |
| Condition | `{"kind": "metric_test", "metric_key": "collection_pct_rolling_90d", "query": {"date_preset": "last_90_days", "time_grain": "none", "dimensions": ["office_id"]}, "test": {"op": "enters_band", "band": "bad"}, "for_periods": 1, "each_member": true, "min_gap_minutes": 1440, "notify_on_recovery": true}`. `test.op` ∈ `lt`, `lte`, `gt`, `gte` (with `value`), `enters_band`, `leaves_range`, `change_pct_gt`, `change_pct_lt` (with `compare_to`), `off_pace`, `any_rows` (worklist or report has rows) |
| Evaluation | At each occurrence the tick evaluates the condition through the metric service as the owner (cheap, no run). Only when it holds does it create the run of the twin report and the deliveries ("delivers only when its condition holds", ENG-52). State metrics are normally evaluated after the nightly snapshot (MET-12); day metrics at a time of day chosen in the schedule; minimum interval 60 minutes (02 §9.2) |
| State | NEW `metric_alert_states`: `schedule_id`, `member_key` (the office or provider when `each_member`), `state` (`ok` · `alerting`), `since`, `last_value`, `last_evaluated_at`, `last_notified_at`, `acknowledged_by`, `acknowledged_at`, `snoozed_until`. An alert notifies on entering the state, again only after `min_gap_minutes` while it persists, and once on recovery when asked |
| Guards | No alert on a value with `low_denominator`, `no_data` or `not_available`; `for_periods` consecutive evaluations before firing; partial periods are tested only by pace and backlog kinds; the limits of 02 §9.2 (25 schedules per user, 200 per organisation) apply |
| Recipients and scope | Users and groups (02 §9.1); naming anyone but oneself needs `reports_share` (08 §2.2 B). Each recipient needs a right for the metric's family and its data class, otherwise `skipped_not_authorized`; with `scope_mode = per_recipient` (ENG-52) each recipient's alert is evaluated in the recipient's own office scope. Provider-level alerts go only to that provider and to holders of `provider_comp` |
| In-app delivery | A `notifications` row [V] with `ref_type = 'report_run'` and the run of the firing as `ref_id` (08 §7.3), `category = 'analytics_alert'`. Title and body stay inside the allow-list of 08 §7.3 (organisation, alert name, static title, period label, time, link) plus the metric's registry label. The value and its band are shown after opening: on the alert's page and on the home dashboard with the tile highlighted, where the actions Acknowledge · Snooze · Mute live |
| E-mail delivery | Link only (PD-12), same allow-list. Whether the office-level aggregate value that fired the alert (class `aggregate` or `financial_practice`) may be added under an organisation setting (`alert_email_include_values`, default off) is an open decision with 08 (D-4); provider-level values and patient data never |
| Creation | Needs `reports_schedule_own` (08 §2.2 B). "Alert me" on a KPI card, matrix cell or scorecard column: form prefilled with metric, current scope, a default test (enters the bad band when the metric has bands, else a threshold), frequency and recipients (the creator by default; others need the share right). "Subscribe" in the dashboard header creates a digest from the current view. Both appear in the Schedules page of 07 with a kind filter |
| History | Each firing is a run with deliveries (02 §9); the alert's page lists firings, acknowledgements and the value at each firing |
| Audit | `report.schedule.*` and `report.deliver` events of 02; acknowledgement and mute are audited |

---

## 8. The assistant

PD-14: questions are answered through the metric registry, never free SQL; aggregates only by default. P5. Nothing exists
today [V] (no model client in the backend; the frontend has a markdown renderer only). The security rules of record are
08 §9 (L-1 to L-14); this section is the product behaviour and repeats a rule only where it shapes the design. Evidence base:
`research/reporting_architecture_options.md` §10, `research/analytics_ux_patterns.md` §8,
`research/compliance_and_financial_semantics.md` §8.3 and §9.

### 8.1 Capabilities

| Capability | What the user gets | Model needed | Phase |
|---|---|---|---|
| Navigate | "Show production by provider last month for Hamilton" → the matching report or dashboard opened with its parameters filled, for confirmation | yes (intent and parameters) | P5 |
| Sentence to filters | On an open report or worklist: a sentence fills the parameter form of 04; the user reviews and presses Run | yes | P5 |
| Question to a registry query | A number, a small table or a chart for a question that maps to registered metrics, with the interpretation shown as editable chips | yes | P5 |
| Explain this number | Definition, components, change, top contributors, caveats for any card, cell or scorecard value (8.2) | no for the facts; optional for the wording | P5 |
| Narrative summary | A short text for a dashboard or a digest built from its tiles (8.4) | optional (templates first) | P5 |
| Anomaly call-outs | Unusual values detected statistically, ranked by impact (8.4) | no | P5 |
| Not offered | Free SQL, forecasts beyond the registry's pacing metrics, questions about one patient (routed to patient search), any write (creating schedules, sending messages, changing goals), cross-organisation comparison | — | — |

### 8.2 Explain this number

Entry: card menu, matrix cell menu, scorecard cell. The panel is computed by the server (tool `top_contributors`), not by a
model:

| Block | Content | Source |
|---|---|---|
| Definition | Formula in words, date basis, attribution, settings in force, `definition_version`, `settings_version`; for an alias the resolved variant | `MetricDefinitionRead` |
| Components | Numerator and denominator values of a ratio; the parts of a net figure (charged production, adjustments) | the metric's `components[]` queried as metrics |
| Change | Value, comparison value, absolute and relative change; elapsed working days of both periods | `compare_to` |
| Contributors | For each dimension the metric allows and the caller may see (office, provider, production group, code category, payer): members ranked by their contribution to the change, top 5 + `other`. Additive metrics: member deltas. Ratios: the change is split into a rate effect and a mix effect per member | extra metric queries with one dimension each, inside the tile budgets of 02 §10 |
| Related metrics | A fixed relation list per metric group (for example `net_production` ↔ `patient_visits`, `production_per_visit`, `working_days`, `production_adjustments`) with their own changes | registry field maintained with MET-25 |
| Caveats and freshness | Availability caveats, `low_denominator`, provisional cohorts, `data_as_of` | response warnings |
| Next steps | Drill list, reconciling report, worklist when one exists | 2.0.4 |

Optional wording: two or three sentences written by the model from this facts payload; every number in the text must occur
in the payload, otherwise the template sentence is shown instead.

### 8.3 Question to a registry query

| Step | Rule |
|---|---|
| 1 Input screening | Length limit. With the default `assistant_phi_questions = refuse` (08 §9 L-6) a question that names a patient — checked against the patient search index and chart-number and date-of-birth patterns — is not sent to the model: the user is pointed to patient search |
| 2 Context | The model receives: fixed instructions; a registry digest (metric keys, labels, aliases, one-line descriptions, allowed dimensions and grains, example questions — MET-25); the report and dashboard catalog titles the caller may open; the caller's current screen and filters; office names inside the caller's scope; providers under stable aliases that the server substitutes back (08 §9 L-5). No rows, no patient data, no user names |
| 3 Plan | The model returns one schema-validated object: `intent` (`query` · `navigate` · `explain` · `clarify` · `refuse`), up to 3 `MetricQueryRequest` objects, or a `{report_key, params}` / `dashboard_key`, or a clarification question. Unknown keys fail validation and the answer becomes a refusal with suggestions |
| 4 Execution | The server runs each query through the same code path as `POST /analytics/metrics/query`: rights, office scope, provider restriction, data classes, limits, cache, audit. At most 6 tool calls per question |
| 5 Answer | The model receives the results (aggregates; states as words) and writes a short answer; chart and table are rendered by our components from the results, not from model text |
| 6 Verification | Every number in the answer text must appear in a result; otherwise the text is replaced by a template. The answer is marked **Verified** when it used only registry queries and passed this check |
| 7 Presentation | Question as understood · result · metric definition links · chips for metric, period, scope, date basis (editable: changing a chip re-runs the query without the model) · `data_as_of` · "Open as report" / "Open dashboard" · thumbs feedback with reason |
| 8 Out of scope | "This cannot be answered from the registered metrics" plus the nearest metrics, reports and dashboards. No guess, no partial SQL |

Suggested questions: 4-6 per surface, taken from the verified example set (MET-25). Scope: the ask bar on the hub home
covers the whole registry; on a dashboard or report it is limited to that screen's metrics and parameters first.

### 8.4 Narrative summaries and anomaly call-outs

| Topic | Design |
|---|---|
| Narrative inputs | The dashboard's own tile results plus the facts of 8.2 for its headline metrics: value, change against previous period, last year and goal, rank among offices, streaks, top contributor |
| Text | Deterministic templates first ("Net production was $X, N % below the same days last year; most of the gap is in <category> at <office>"). Optionally the model rewrites the facts into prose under the verification rule of 8.3 step 6. Every sentence links to its tile and drill |
| Where | `narrative` tile on `dashboards.executive_summary` and `dashboards.morning_huddle` ("what changed since yesterday"); the insight strip of every dashboard; the in-app body of a digest. Not in e-mail (PD-12) |
| Caching | Per dashboard, scope, period and `data_as_of`; regenerated only when the data changes |
| Anomaly detection | Deterministic, run after the nightly snapshot: daily flows are compared with the same weekday over the trailing 8-12 weeks on open days only (modified z-score above 3.5, log scale for money); rates use proportion control limits and need `rate_min_denominator`; offices and providers below a minimum volume are skipped |
| Call-out | What moved, how unusual, the top contributor, link to the tile and drill. Ranked by money impact; at most 3 per dashboard. The user can dismiss with a reason ("office closed"), which is stored and suppresses the same call-out |
| Alerts | An anomaly can be delivered as an alert of section 7 (kind anomaly) to users who opt in |

### 8.5 Guardrails

| Guardrail | Rule |
|---|---|
| Registry only | The model can emit `MetricQueryRequest` objects, catalog look-ups and parameter sets, nothing else. No SQL is generated, stored or executed (PD-14). Tool surface: `search_catalog`, `get_metric_definition`, `list_dimension_members`, `query_metrics`, `top_contributors`, `open_report` (returns a validated link, no rows) |
| Rights and scope inherited | Every tool call runs as the asking user through `authorize()`: report and metric rights, office scope, provider restriction, data classes. A value the user could not see in a dashboard cannot appear in an answer; `restricted` and `suppressed` points reach the model as those words (08 §9 L-3) |
| Aggregates by default | Tool results are aggregates with at most 2 dimensions and 50 members; drill lists are opened in the product, never returned to the model. Small cells: a value built from 1 to 10 distinct patients, and the totals from which it could be derived, are suppressed before anything is sent (08 §5.7 SC-2, `small_cell_min_patients`) |
| No patient data leaves | No patient names, notes, phone numbers or free-text columns enter a prompt; `worklist_events.note` and report rows are never tool output. Office names are sent within the caller's scope, provider names only as aliases, user names never (08 §9 L-4, L-5) |
| Numbers come from results | The model computes nothing; figures are rendered from tool results and verified in any generated text |
| No writes | Read-only tools. Creating a schedule, alert, saved view or message from an answer is a normal product action the user confirms |
| Audit | Events `assistant.question` (committed before the vendor call), `assistant.tool_call` and `assistant.answer` in the audit store of 08 (§9 L-11), with the retention and access rules of report runs; feedback is stored with the answer; a report opened from an answer carries `source = assistant` on its run (02 §5.2) |
| Budgets | Per-user and per-organisation daily quotas, at most 6 tool calls and one retry per question, 30 s wall clock, answer length cap; identical questions in the same scope and data version are served from cache; the standard registry digest is the stable, tenant-neutral prefix of the prompt (the only part cached on the vendor side, 08 §9 L-8), with date, scope and question last |
| Isolation | One organisation per database and per request; cache keys include tenant, scope hash, class profile and data version; no organisation data in shared prompt prefixes |
| Provider | The model sits behind one interface (`app/analytics/assistant/provider.py`, NEW; 08 §9 L-13) so the vendor is configuration. The endpoint must be covered by a business-associate agreement and use only features eligible under it; schema-constrained output and strict tool definitions replace forced tool choice; refusal and truncation stop reasons are handled before parsing (`reporting_architecture_options.md` §10.4). The retention terms of the chosen model are checked against the agreement (`compliance_and_financial_semantics.md` §9.2). Vendor and model are chosen in P5 against the evaluation set, not in this plan |
| Evaluation | A versioned set of questions with the expected plan (metric keys, dimensions, period) is re-run on every registry, prompt or model change; release needs a pass rate agreed with the product owner; negative feedback creates review items (DASH-50) |
| Kill switch | Off by default: enabling needs the vendor attestation of 08 §9 L-1 and the right `analytics_assistant_use`. With the switch off every assistant entry point disappears; the deterministic parts (explain panel facts, anomaly detection) keep working |

### 8.6 Contract of `POST /analytics/assistant/query` (02 §13 row 64)

| Part | Fields |
|---|---|
| Request | `question`; `mode` (`ask` · `explain` · `summarize` · `fill_parameters`); `context{working_office_id, surface (home · dashboard · report · metric), dashboard_key, report_key, tile_key, metric_key, params, point{member, period}}`; `conversation_id` (follow-up questions keep the previous plan, not previous results) |
| Response | `answer_id`; `status` (`answered` · `needs_clarification` · `out_of_scope` · `refused` · `quota_exceeded`); `answer{blocks[]}` with block kinds `text`, `metric_result`, `link`, `suggestions`; `interpretation{metrics[], dimensions[], period, scope, date_basis, filters}`; `queries[]` (the executed `MetricQueryRequest`s); `results[]` (`MetricQueryResponse`s); `citations[]` (`metric_key`, `definition_version`, `settings_version`, `data_as_of`, drill `{report_key, params}`); `verified`; `warnings[]`; for `fill_parameters`: `params` validated by the definition's validate endpoint |

---

## 9. Tenant custom reports and the builder, from the user's point of view

The legacy "Office Reports" menu holds customer-specific reports built by the vendor in per-customer folders with their own
rights (`research/denticon_analytics_and_dso.md` §4); none of them belongs to this product's customers [A]. Its
replacement is the builder: an organisation defines its own reports (`custom.<slug>`, store and compilation in 02 §11;
screens in 07). P5.

### 9.1 Two modes

| Mode | Result | The user chooses | Typical question |
|---|---|---|---|
| **List** | One row per record of a dataset | Columns (up to 30), filters, sort, optional grouping with subtotals (up to 3 levels) | "Patients with an accepted crown and no appointment, with phone and remaining benefits" |
| **Summary** | One row per group | Group-by dimensions (up to 3), measures from the registry, optional pivot across one dimension (up to 200 columns), optional chart | "Net production and visits by provider and month for one payer" |

### 9.2 Datasets offered

Each dataset is a registered exposure of an `rpt_*` object (05 §1.1) with a described field list; fields carry data classes,
so a viewer without a class does not get the column (02 §3.3). Fact datasets require a date range of at most 24 months.

| Dataset (label in the builder) | Object | Row = | Date filter (required) | Measures offered |
|---|---|---|---|---|
| Procedures | `rpt_charges` | completed procedure | service, transaction or created date | `m_gross_production`, `m_charged_production`, `m_procedure_count`, production metrics |
| Ledger transactions | `rpt_ledger_entries` | money entry of any kind | transaction date | signed amount by class; collection and adjustment metrics |
| Payments | `rpt_payments` | payment | transaction or deposit date | `m_payments`, collections metrics |
| Payment allocations | `rpt_payment_allocations` | credit applied to a debit | allocation date | `m_allocated_payments` |
| Open receivables | `rpt_ar_open_items()` | open item as of a date | as-of date | A/R metrics by bucket |
| Appointments | `rpt_appointment_facts` | appointment | appointment date | `m_appointments`, `m_booked_minutes`, scheduling metrics |
| Booked procedures | `rpt_appointment_procedures` | booked line | appointment date | `m_scheduled_fee` |
| Visits | `rpt_visits` | patient-office-day | visit date | `m_visits`, `m_new_patient_visits` |
| Patients | `rpt_patient_dim` + `rpt_patient_activity` | patient | none (current state) | patient counts |
| Accounts | `rpt_account_dim` | guarantor account | none | account counts |
| Claims | `rpt_claim_facts` | claim | submitted, service or paid date | claim counts and amounts |
| Claim lines | `rpt_claim_lines` | claim line | service date | estimate and paid amounts |
| Insurance coverage | `rpt_insurance_coverage` | coverage slot | none | counts by carrier, plan |
| Treatment plan items | `rpt_treatment_item_facts` | plan item | presented date | treatment metrics |
| Recall | `rpt_recall_due()` | patient × recall code | as-of date | recall counts |
| Referrals | `rpt_referral_facts` | referral event | referral date | counts, referred production |
| Ortho contracts | `rpt_ortho_contracts` | contract | start date or as-of | ortho metrics |
| Lab cases | `rpt_lab_cases` | lab case | appointment, sent or due date | `lab_cost_amount`, turnaround |
| Time clock | `rpt_time_clock` | punch (class `payroll_time`) | work date | `clocked_hours` |
| Messages | `rpt_communication_facts` | outbound message | sent date | delivery and reply counts |
| Progress notes | `rpt_progress_note_facts` | note, without its text | note date | note counts, signed or not |
| Follow-ups | `worklist_followups` (passthrough) | follow-up | listed or resolved date | counts, `result_value` |

### 9.3 What the user does

| Step | Behaviour |
|---|---|
| Start | "Customise" on a standard report opens a copy in the builder where the report's shape fits; or "New report" from a dataset; or a template from the gallery (seeded with the list reports users ask for most: unscheduled accepted treatment with benefits, production by code and payer, patients by last visit) |
| Build | Searchable field list split into dimensions and measures, each with a description and an info icon; the "in use" tab; filters use the same components as report parameters (04) and any filter can be promoted to a run-time parameter |
| Preview | First 10 rows after every change (5 s budget); a row estimate and the cost class before the full run |
| Save and publish | Draft → published version; a published report has a Custom badge, an owner and a version; editing creates the next version and saved views or schedules on the old one are re-validated (02 §11) |
| Use | Runs in the normal runner with scope, rights, data classes, snapshots, exports, favorites, saved views and schedules; appears under the `custom` category with organisation-defined folder tags (the role the per-customer folders played in the legacy menu) |
| Share | Private by default; shared with users or groups (view or edit); organisation-wide needs the share right |

### 9.4 Limits and what is not offered

| Limit (02 §11) | Value |
|---|---|
| Columns · group levels · pivot columns | 30 · 3 · 200 |
| Date range on fact datasets | mandatory, at most 24 months |
| Definitions per organisation | 500 |
| Preview | 10 rows, 5 s |
| Cost gate | A run estimated above the threshold goes to the background or is refused with a hint |
| Formulas | Only registry measures and metrics. An organisation's own KPI is defined once by a metric administrator as arithmetic over measures (MET-24) and then appears in the builder, dashboards and assistant alike |
| Not offered | SQL, joins chosen by the user (datasets are already joined to their dimensions), free-text expressions, write-back, row-level patient data outside the caller's data classes. A SQL workspace, warehouse export or BI connector (`competitor_analytics_teardown.md` §5 differentiator 10) is outside the core plan (AD-3) and at most an optional P5 pilot |

Custom scorecards: a user-built scorecard is a `scorecard` tile added from the tile library to a duplicated dashboard (3.6)
with a chosen member dimension, up to 12 metrics, a period and a comparison. It is stored as that dashboard's layout and
view; there is no separate object.

---

## 10. Role-based defaults

Inputs that exist [V]: the role values of the `UserRole` union `super_admin`, `owner`, `admin`, `manager`, `doctor`, `provider`, `front_desk`,
`staff`; `roleBucket()` (four buckets); the provider link `users.report_access_provider_id`. Input that is NEW: the
provider's `provider_kind` (`providers.provider_kind`, DATA-05; values `dentist`, `hygienist`, `assistant`, `specialist`,
`staff`; read through `rpt_provider_dim.provider_kind`, 03 §2). There is no billing role: that persona is recognised by
membership of the seeded Billing or Claims group (08 §2.4 presets), never by the absence of a right.

Rows are evaluated top-down in the order of the table; the first row that matches wins.

| # | Persona | Recognised by | Lands on | Also pinned | Pinned worklists |
|---|---|---|---|---|---|
| 1 | Executive (several offices) | more than one readable office, and a privileged role or `office_scope_view_all_offices` | `dashboards.multi_office` (P4; before that `dashboards.executive_summary` with all readable offices) | `dashboards.main`, `dashboards.executive_summary` | — |
| 2 | Owner, administrator | role `owner`, `admin`, `super_admin` (also when linked to a provider) | `dashboards.main` | `dashboards.executive_summary`, `dashboards.provider`, `dashboards.production` | `worklists.my_followups` (team view) |
| 3 | Office manager | role `manager` | `dashboards.main` | `dashboards.morning_huddle`, `dashboards.collections_ar`, `dashboards.schedule_capacity` | `worklists.my_followups` (team view), `worklists.day_close_checklist`, `worklists.patient_ar`, `worklists.outstanding_claims` |
| 4 | Dentist | linked provider with `provider_kind IN ('dentist', 'specialist')` | `dashboards.my` (doctor set) | `dashboards.treatment`, `dashboards.morning_huddle` | `worklists.unsigned_progress_notes`, `worklists.unscheduled_treatment` |
| 5 | Hygienist | linked provider with `provider_kind = 'hygienist'` | `dashboards.my` (hygienist set) | `dashboards.hygiene_recall`, `dashboards.morning_huddle` | `worklists.unsigned_progress_notes`, `worklists.recall_due`, `worklists.not_reappointed` |
| 6 | Billing | member of the seeded Billing or Claims group (08 §2.4) | `dashboards.insurance_rcm` | `dashboards.collections_ar` | `worklists.outstanding_claims`, `worklists.denied_claims`, `worklists.unbilled_procedures`, `worklists.patient_ar`, `worklists.unallocated_credits`, `worklists.eligibility_verification` |
| 7 | Front office | role `front_desk`, `staff` | `dashboards.front_office` (P3; until then the existing home dashboard) | `dashboards.morning_huddle` | `worklists.unconfirmed_appointments`, `worklists.broken_appointments`, `worklists.recall_due`, `worklists.eligibility_verification`, `worklists.todays_patients`, `worklists.day_close_checklist` |

Rules: the landing dashboard is the first of the persona's list that exists in the installed phase and that the caller may
open; a pinned dashboard or worklist the caller may not open is not shown (on an unmodified seed the Front Desk group and the
Doctor preset hold neither `analytics_morning_huddle_view` nor `analytics_scheduling_dashboard_view`; the grant is requested
of 08, 12.4); a user can make any permitted dashboard the home (stored with the favorites order of 02 §8); an administrator can
change the mapping for the organisation (key `dashboard_role_defaults` in the engine's tenant settings, 02 §13 row 23). The
landing is a default, never a fence: every permitted dashboard and worklist is in the catalog and in search. `dashboard_view` is
granted to every seeded group (08 §2.4), so `dashboards.main` is the last fall-back; its rows degrade to `restricted` for the
families a caller lacks. The existing
operational home at `/dashboard` (today's schedule, quick actions, search [V]) stays the application home; its KPI widgets
and the tiles of the Reports home and My Page are re-pointed to the metric service (DASH-08) and it gains a link to the
persona's landing dashboard. `layoutForRole()` [V] keeps deciding the widget order of that page only.

---

## 11. Work items

Sizes: S up to 2 days, M up to 1 week, L up to 2 weeks, XL more (brief §4). "Depends on" names items of this document,
`ENG` (02 §17), `DATA` (03 §12), `FLT` (04 §14), `MET` (05 §11) and `SEC` (08 §12). Frontend items also depend on the hub
shell, drill panel and routes of `07_ux_blueprint.md`, which was not available when this document was written, so its work
items are not named.

| Id | Title | Phase | Size | Depends on | Acceptance check |
|---|---|---|---|---|---|
| DASH-01 | Dashboard definition model, registry, lint and drill map (`app/analytics/dashboards/model.py`, `definitions/`) | P1 | M | MET-01, ENG-03, ENG-05 | The definition JSON of 2.0.1 is served for `dashboards.main`; a tile naming an unknown metric, dimension, filter or drill target fails the build; a drill target served later than its tile fails unless the phase fall-back of 2.0.4 names a target; the drill map resolves for every P1 tile |
| DASH-02 | Value and state renderer, formatters, `KpiCard`, as-of stamp, definition popover | P1 | M | ENG-19, ENG-32, SEC-13 | Each state of 3.1 renders from a fixture response; money strings are formatted without float arithmetic; correct at `html{zoom:0.75}`; the accessibility scan passes |
| DASH-03 | `MetricMatrix`: sticky column and header, month-to-date marker, summary columns, cell states, order toggle, block merge, row tools | P1 | L | DASH-02, ENG-33 | A fixture with every point status renders without a blank cell or a false zero; summary columns follow 3.3 for Σ, R, D and PIT rows; a failed block leaves the other blocks intact |
| DASH-04 | Main Dashboard v1: definition with the P1 rows and header strip of 2.1 | P1 | M | DASH-01, MET-05, MET-06, SEC-18, DATA-55, DATA-56 | On the UAT database every one of the 20 reference rows and every other P1 row returns a value or a named state for 12 months; doctor + hygiene + other equals the family row in every cell; a month's totals equal `daily.production_report` and `daily.collection_report` for the same parameters (02 R5) |
| DASH-05 | Provider Dashboard v1 and My Dashboard (provider view): hide-inactive, aligned blocks, provider restriction | P1 | M | DASH-03, DASH-04, FLT-17, SEC-06, DATA-55, DATA-56 | Every reference row of 2.2 (rows 1-11) returns a value or a named state; a provider-restricted user sees only the own block and no office value; provider blocks share column positions; additive rows of all providers plus `Unassigned` equal the office value |
| DASH-06 | Dashboard header (scope, period, comparison, provider), URL state, personal layout, saved views | P1 | M | FLT-11, FLT-12, FLT-13, FLT-19, ENG-28, ENG-33 | Changing the office re-queries every tile with the new scope; Refresh bypasses the metric cache once per tile and is refused above the per-user rate; a reload restores the parameters from the URL; a saved layout survives logout; a view saved with "last month" resolves to the new month later |
| DASH-07 | Drill from cards, cells and chart marks into the drill panel and the runner | P1 | S | DASH-03, ENG-30, ENG-32 | Clicking a matrix cell opens the report with the cell's period, scope and member; the list total equals the cell value |
| DASH-08 | Re-point the existing home dashboard KPI widgets, the Reports home tiles and the My Page stats for production, collections, new patients, active patients and appointments to the metric service; the recall-due and insurance-receivable tiles show "available in P3" / "available in P2" instead of a client-computed value | P1 | M | ENG-32, ENG-35, MET-07 | The re-pointed hooks of `FE:src/components/dashboard/lib/useMetrics.ts`, `FE:src/components/my-page/lib/useMyDay.ts` and `FE:src/components/reports/lib/reportMetrics.ts` contain no `fetchAllPages` call; each re-pointed tile equals `dashboards.main` for the same scope and day; no tile shows a browser-aggregated number |
| DASH-09 | Twin report definitions for print, export and subscription (matrix first) | P1 | M | DASH-04, ENG-23, ENG-27, ENG-31 | PDF, XLSX and CSV of `dashboards.main` carry the same values and states as the screen for the same parameters; the run is audited; the twin is absent from the report catalog |
| DASH-10 | Dashboard catalog content and role-based landing | P1 | S | DASH-01, ENG-29, DATA-05 | Each persona of section 10 lands on its dashboard on a test tenant; an owner linked to a dentist and a front-desk user holding the insurance dashboard right land by the first matching row; a pinned entry the caller may not open is not shown; a user without the right does not see the entry; the chosen home persists |
| DASH-11 | Chart tiles `TrendChart`, `BarsChart`, `AgingBars`, `FunnelChart` with table view | P2 | M | DASH-02 | Each renders a fixture with no-data points and an open period; "show as table" lists the same values; marks drill |
| DASH-12 | Production analysis dashboard | P2 | M | DASH-06, DASH-11, MET-05, MET-10 | Category and carrier breakdowns sum to `charged_production` including `other`; scheduled-production bars equal `daily.scheduled_production` |
| DASH-13 | Collections and A/R dashboard | P2 | M | DASH-11, DASH-52, MET-10, MET-12, DATA-27 | Ageing bars equal the totals of `monthly.aging_report` under both attributions; patient plus insurance A/R equals the debit balances (I-5); the A/R trend reads snapshots only |
| DASH-14 | Insurance and revenue-cycle dashboard | P2 | M | DASH-11, DASH-52, MET-11 | Outstanding amounts equal `insurance.outstanding_claims`; before P3 every pipeline tile drills to its print counterpart (2.0.4 fall-back); no tile sums across a claim family; proxy metrics are labelled |
| DASH-15 | Executive summary dashboard with frozen month-end values | P2 | M | DASH-13, DASH-52, MET-12, DATA-30 | A closed month keeps its frozen values after a later back-dated edit; the open month is marked; each tile equals the metric of the same key for the same period and scope; the link tile runs `monthly.executive_summary` with that period and scope; the footnotes of 2.15 name every line whose legacy key differs |
| DASH-16 | Main and Provider Dashboard v2: receivables block, rolling collection %, allocation-based provider collections, period status markers, organisation default layout | P2 | S | DASH-04, DASH-05, MET-10, MET-12 | Locked and frozen periods are marked; switching the attribution changes provider collections and the header names the attribution in use |
| DASH-17 | Dashboard subscriptions: digest of a dashboard view through its twin report | P2 | M | DASH-09, ENG-43, ENG-44, SEC-25 | A weekly digest of `dashboards.main` delivers an in-app notification and a link-only e-mail; a recipient without the right is skipped |
| DASH-18 | Goals service and `/analytics/goals` payload over `provider_production_goals` (read, write, versions, suggestions) | P3 | M | DATA-24, MET-17 | Round trip of 4.3 including the resolved working days and the suggestions; a write keeps the previous version; rows outside the caller's scope return 403 |
| DASH-19 | Goals page: production goal grid, autofill, seed, copy and spread tools, history | P3 | L | DASH-18, FLT-11, SEC-01 | A manager enters a year of goals for an office in one grid; autofill equals the provider calendar; seeding never overwrites a non-zero goal; a restricted provider sees the own row read-only |
| DASH-20 | Goal and pacing display: goal bar and pace word on cards, pacing chart, matrix Goal and Variance columns (goal values queried as the metrics of MET-17; `include[] = goal` is P4, ENG-51) | P3 | M | DASH-03, DASH-11, DASH-18, MET-17 | No P3 tile requests `include[] = goal`; the edge rules of 4.4 render as specified (no goal, goal met, schedule not configured); percent of goal equals `production_vs_goal_pct` |
| DASH-21 | Morning Huddle dashboard: four views, provider table, opportunities, today's patients; present mode and single-column phone rendering of the huddle | P3 | L | DASH-20, DASH-33, DASH-52, MET-13, MET-14, MET-15, MET-17 | Every tile of 2.4 returns a value or a named state at 07:00 office time on the UAT database; "yesterday" is the previous working day; a user without the financial class sees no money tile; present mode rotates the views; the huddle is usable at 375 px width |
| DASH-22 | Schedule and capacity dashboard and `HeatmapGrid` | P3 | M | DASH-11, MET-13 | Appointment classes sum to scheduled (I-7); an unconfigured office shows "schedule not configured"; a heatmap cell opens the right day |
| DASH-23 | Hygiene and recall dashboard | P3 | M | DASH-11, DASH-52, MET-14 | The four reappointment variants appear side by side with their labels; recall counts equal the worklist's row count for the same scope |
| DASH-24 | Treatment plans and case acceptance dashboard | P3 | M | DASH-11, DASH-52, MET-15 | Funnel stages sum to presented (I-8); provisional cohorts are marked; migrated-only periods show "history starts on" |
| DASH-25 | Patients dashboard | P3 | M | DASH-11, MET-16 | On the fixture, new + reactivated − lost explains the change of active patients between two snapshot dates |
| DASH-26 | Referrals and marketing dashboard; Ortho dashboard | P3 | M | DASH-11, MET-18 | Every tile returns a value on a fixture with one referral source, one campaign and one ortho contract; the cost tile shows "needs marketing spend input" |
| DASH-27 | Front office dashboard with work-queue counters and team scorecard | P3 | M | DASH-11, DASH-29, DASH-52, MET-19 | A team member sees only the own scorecard row; counters equal the follow-up table and carry the sync time |
| DASH-28 | Worklist backend: `worklist_followups`, `worklist_events`, outcome codes, handlers for log outcome, assign, snooze, resolve; selection on live lists; record-changing actions through the owning service layer (6.1) | P3 | L | ENG-14, ENG-48, ENG-49 amended for live selections (12.4 b; until accepted, the snapshot-of-selection fall-back of 6.1), SEC-36 | An action on an id that is not on the list is refused and returned in `excluded[]`; the fall-back path gives the same exclusions; no bulk action calls an HTTP route of another feature per row; every action writes one event and one audit record with the patient manifest; re-submitting the same action changes nothing |
| DASH-29 | Membership sync, automatic resolution, attribution; follow-up tables registered as passthrough datasets | P3 | M | DASH-28, ENG-43 | After an appointment is booked for a listed patient the follow-up is resolved as `auto` with credited user and value at the next sync; `follow_up_completion_pct` returns a value |
| DASH-30 | Worklist screens: live list, row action bar, outcome dialog, bulk bar with exclusion counts, follow-up columns and filters | P3 | L | DASH-28, ENG-48, FLT-13 | "Log outcome" can be completed by keyboard alone; the list updates without reload; exclusion counts shown before a bulk send equal the server's result |
| DASH-31 | Bulk outreach hand-off: text, e-mail and letters with consent exclusions, job progress, write-back to the event log | P3 | L | DASH-28, ENG-38, ENG-49 | With 500 selected patients the opted-out and no-number patients are skipped and reported; a retried job sends nothing twice; each message is linked to its follow-up event |
| DASH-32 | Worklists: Eligibility Verification, Unsigned Progress Notes | P3 | M | DASH-30, DATA-18, DATA-21, DATA-34 | Updating a status stamps the subscriber through the existing endpoint and removes the row; signing from the read-only side panel removes the note and, where the office requires it, stores the signature image; a Doctor-preset user (My Reports only) opens the list and sees only own notes; "Sign selected" is absent while `worklist_bulk_sign_enabled` is off |
| DASH-33 | Worklists: unconfirmed, broken not rescheduled, unresolved past appointments, left without a next appointment (actions on DASH-53), today's patients with the birthday, forms and medical-history flags, lab cases due | P3 | L | DASH-30, DASH-53, DATA-16, DATA-17, DATA-23, DATA-43, DATA-54, MET-13 | Row counts equal `unconfirmed_appointments` and `unresolved_past_appointments` for the same scope; confirming 200 appointments in one job sets each confirmed through `scheduler_service.update_status` and finishes inside the job budget |
| DASH-34 | Worklists: unscheduled treatment, recall due, reactivation | P3 | L | DASH-30, DASH-31, DATA-19, DATA-32, DATA-39, DATA-41 | Totals equal `unscheduled_treatment_amount` and `recall_due_unscheduled_patients`; Schedule opens the Scheduler with patient and items; a booking resolves the row |
| DASH-35 | Worklists: outstanding claims, denied claims, patient A/R, unallocated credits, unbilled procedures, overdue payment-plan instalments | P3 | L | DASH-30, DATA-26, DATA-27, DATA-31, DATA-35, DATA-37 | The outstanding total equals `outstanding_claims_amount` (primary tier); create-tasks reports the count like the legacy action and a task closes when its claim is paid; a claim set to denied leaves the outstanding list and appears in `worklists.denied_claims`; patient A/R equals `patient_ar` for the scope; the 2.0.4 fall-back drills switch to the worklists |
| DASH-36 | My follow-ups and team view; assignee notifications; the two placeholder routes of the interactive reports open the worklists; My Page alerts read `notifications` | P3 | M | DASH-30, DASH-32 | An assignment produces a notification; the team view shows counts by user and due-date age; no placeholder route remains |
| DASH-37 | Targets and bands editor, inline "Set target", band colouring from `metric_targets` | P4 | M | DASH-19, MET-21 | Mis-ordered bands are rejected; a provider-level target overrides the office one; colours change on every surface after a save |
| DASH-38 | Scorecard v2 and `RankingTable`: ranks, rank movement, median and quartile rows, peer markers; doctor, hygienist and team sets | P4 | L | DASH-52, ENG-51, MET-21, MET-23, SEC-38 | Members under the minimum denominator are unranked; a restricted provider gets the own row, a peer mean only with 5 other contributing providers and median or quartiles only with 10, `suppressed` below, never the minimum or maximum of others; `other` and unassigned rows are present |
| DASH-39 | Multi-office comparison dashboard: ranking, office scorecard with group subtotals, same-store, dispersion | P4 | L | DASH-38, ENG-51, MET-23 | A newly opened fixture office is excluded from same-store and named; three growth aggregates are shown; a caller with 3 of 5 offices gets comparators over those 3 and a notice |
| DASH-40 | Matrix compare mode, prior-year and percent-of-goal cell modes, heat shading; dashboards switched to roll-up sources | P4 | M | DASH-03, ENG-50, FLT-26, MET-22 | The same dashboard returns identical values from roll-ups and from live datasets on the fixture; `freshness[]` names both sources |
| DASH-41 | Alerts: condition schema, evaluator, `metric_alert_states`, notifications, "Alert me", acknowledge and snooze | P4 | L | DASH-17, ENG-52, MET-12, MET-21, SEC-39 | An alert fires once on entering the bad band, not again inside the gap, and once on recovery; a low-denominator value never fires; notification and e-mail text stay inside the allow-list of 08 §7.3 |
| DASH-42 | Followed-metrics digest and shipped alert templates | P4 | M | DASH-41 | Enabling a template for an office creates the schedule with the documented test; the digest lists followed metrics with band words |
| DASH-43 | Outreach results view: attempts, outcomes, value scheduled and collected per worklist, user and channel | P4 | M | DASH-29, DASH-38, MET-19 | For a fixture campaign the scheduled value equals the fees of the appointments booked inside the attribution window |
| DASH-44 | Customisation v2 (free grid, tile library with the off-by-default tiles), mobile rendering of the other dashboards | P4 | L | DASH-06, DASH-21 | A duplicated dashboard accepts a new metric tile; library tiles are on no default layout; every dashboard renders in one column at 375 px width |
| DASH-45 | Snapshot-backed trends of state metrics; start-of-day and actual-versus-scheduled tiles | P4 | S | DASH-11, DATA-48, MET-12 | A trend of `unscheduled_treatment_amount` shows snapshot dates only; no back-filled point exists |
| DASH-46 | Assistant service: contract of 8.6, plan validation, tool loop, verification, quotas, audit, provider interface | P5 | L | ENG-55, MET-25, SEC-41 | Only schema-valid `MetricQueryRequest`s execute; a question outside the registry returns `out_of_scope`; a user never receives a value they cannot see in a dashboard; every call is audited |
| DASH-47 | Explain-this-number facts: components, change, contributor decomposition, related metrics | P5 | M | ENG-50, ENG-55 | Contributor deltas sum to the total change including `other`; rate and mix effects sum to the ratio's change on the fixture |
| DASH-48 | Narrative summaries and anomaly detection with the insight strip | P5 | M | DASH-46, DASH-47, MET-12 | Every number in a generated text exists in the facts payload, otherwise the template is used; a seeded outlier is detected and a low-volume office is skipped |
| DASH-49 | Ask bar, answer card, interpretation chips, sentence-to-filters, feedback | P5 | M | DASH-46 | Editing a chip re-runs the query without a model call; sentence-to-filters never runs a report by itself |
| DASH-50 | Assistant evaluation set and regression run | P5 | M | DASH-46, MET-25 | The suite runs on every registry, prompt or model change and reports plan accuracy per question group |
| DASH-51 | Builder content from the user's side: dataset labels and field descriptions, template gallery, folder tags, custom scorecard tiles | P5 | M | DASH-44, ENG-53, ENG-54, MET-24, SEC-40 | Every dataset of 9.2 is offered with described fields; a template opens as an editable draft; a custom report appears under `custom` with its folder tag |
| DASH-52 | Scorecard v1: member × metric table, residual row, ratio-of-sums footer, hide-inactive, navigation, `provider_comp` / `user_activity` visibility; no rank, quartile or PEER | P2 | M | DASH-02, DASH-11, SEC-06 | Additive columns of all members plus the residual equal the footer; a provider-restricted caller gets only the own row and no footer; a team member sees only the own `user_key` row; no rank column is rendered |
| DASH-53 | `worklists.not_reappointed` as a read-only list: `instant` run, row click opens the patient, `visit_kind` parameter | P1 | S | DASH-01, DATA-16, MET-05 | The row count for `visit_kind = hygiene` equals the denominator minus the numerator of `hygiene_reappointment_pct` for the same visit window and scope; the hygiene reappointment tiles drill to it |
| DASH-54 | Re-point the recall-due and insurance-receivable tiles of the home dashboard, Reports home and My Page; remove `useRecallDue` and the remaining client aggregation | P3 | S | DASH-08, MET-10, MET-14 | No `fetchAllPages` call remains under `FE:src/components/dashboard`, in `useMyDay.ts` or in `reportMetrics.ts`; the recall tile equals `recall_due_unscheduled_patients` |
| DASH-55 | `worklists.day_close_checklist`: office-days not closed with their child checks, links, Close day hand-off; counters on Collections and A/R and Front office | P2 | M | DASH-01, DATA-29, MET-10, MET-12 | Each unclosed office-day is listed with its five checks (the unresolved-appointment check from P3); closing the day removes the row; the counters equal the row count |

---

## 12. Risks and open decisions

### 12.1 Risks

| # | Risk | Effect | Mitigation |
|---|---|---|---|
| 1 | The P1 matrix runs about 40 metrics × 12 months on live views (about 1.4 M charges, 1.3 M payments [A]) inside 5 s per tile | Slow or timed-out blocks on the first dashboard users see | Blocks of at most 12 metrics; 60 s cache with single flight; closed months served from frozen rows from P2; reporting indexes (DATA-08); budgets measured in ENG-37 before P1 exit; fall-back default of 6 periods until P2 |
| 2 | Every goal tile is unavailable in P1 and P2, and the Morning Huddle arrives only in P3 | Owners run the daily meeting without goals or a huddle screen for two phases | C-1 and C-2; goal rows carry their phase and join without a layout change |
| 3 | App-era-only metrics are empty for a freshly migrated organisation (treatment funnel, at-visit reappointment, confirmations, created-by slices) | Tiles full of "history starts on" | Named states instead of zeros; alias fall-backs of 05 §2.8; role defaults put history-capable tiles first |
| 4 | Worklist actions depend on handlers of other features: bulk text job, letters batch, statement run, claim actions; postcards and labels do not exist [A] | A worklist ships with fewer actions than specified | An action is offered only when its handler is registered; P3 minimum = open record, log outcome, assign, schedule, single text, letters batch |
| 5 | Consent and regulatory rules for bulk texting from lists were not researched (`analytics_ux_patterns.md` §12 item 12) | Legal exposure | Exclusions enforced on the server; `worklists_bulk_message` off until counsel signs off; per-organisation switch; job rate caps |
| 6 | Follow-up state lags the live list between syncs | Counters differ from the list | Counters carry the sync time; sync after every action for touched subjects; rows are created on first touch |
| 7 | "Credited user" and attributed value are read as compensation figures | Disputes | Labelled "assisted"; rule and window visible; class `user_activity`; not offered as a payroll input |
| 8 | Alert fatigue | Alerts get muted and ignored | Templates off by default; fire on entry, gap between repeats, consecutive-period rule, low-denominator guard; per-user limits of 02 |
| 9 | Assistant gives a plausible wrong answer, or a question carries patient data to a vendor | Wrong decisions; compliance incident | 8.5: registry-only plans, server-side execution, number verification, input screening, evaluation set, kill switch |
| 10 | A dashboard and its twin report drift apart | Printed values differ from the screen | The twin is generated from the dashboard definition (one source); equality test in DASH-09 on every definition |
| 11 | Provider values can be derived in small offices (office value minus own value) | Leak of another provider's production | Restricted callers get no office value, rank or share (02 §10.1; 08 §4.2 PR-8); a peer mean only from 5 other providers and a median or quartiles only from 10 (SC-1); minimum and maximum of others never |
| 12 | Capacity, utilisation and goal tiles rest on schedules nobody configured (05 k10) | "Not configured" across the huddle | Entered working days on goal rows; setup prompts with deep links; `booked` hours as the default hours source |
| 13 | P3 holds 10 dashboards and 17 worklists | Phase overrun | Dashboards and worklist batches (DASH-21..27, DASH-32..35) are independently shippable; the roadmap may move later batches to P4 |
| 14 | 02 and 03 were being revised while this document was written, and 08 appeared late | A name or work-item id used here may have changed | Names were checked against the files as they stood; 2.0.5, 6 and 8.5 were aligned to 08; the lint of DASH-01 and the cross-document name check catch drift |

### 12.2 Open decisions

| # | Decision | Default used here | Owner |
|---|---|---|---|
| D-1 | Column order of the matrix: newest first (the reference) or oldest first (reads like a chart) | Newest first on `dashboards.main` and `dashboards.provider`, toggle per user | product owner |
| D-2 | Tasks: follow-ups as the only task model, or a general Task Manager as in the legacy tool | Follow-ups; `worklists.my_followups` is the task view; no separate module | product owner |
| D-3 | Office grouping: one group per office (exists) or overlapping region and brand tags | One group | product owner, 03 |
| D-4 | Whether an alert notification or e-mail may carry the office-level aggregate value that fired it (08 §7.3 allows no row value in either) | No value outside the application; `alert_email_include_values` off | product owner, 08, counsel |
| D-5 | Attribution of outreach results (last contact inside 30 days; value = fee booked or amount collected) and whether it is shown per user | As stated; shown to managers | product owner |
| D-6 | Who sees money on the Morning Huddle | Decided per user by metric family and data class (08 §2.3, §5.6); fully restricted money tiles are not drawn; no separate huddle switch | product owner, 08 |
| D-7 | "Next available appointment" on the huddle needs a slot-search call from the scheduling feature | Not in P3 | scheduling owner |
| D-8 | Hour-of-day dimension for a weekday × hour utilisation heatmap | Not offered; request to 05 | metric owner |
| D-9 | Assistant vendor and model (the conditions are fixed by 08 §9) | Provider-neutral interface; chosen in P5 against the evaluation set; patient-naming questions refused | 08, counsel, product owner |
| D-10 | Whether a worklist replaces its print report in menus (for example Outstanding Claims) | Both exist: the print report keeps literal parity (AD-8); dashboards drill to the worklist once it ships (2.0.4 fall-back before) | product owner |
| D-11 | Bulk attestation of progress notes ("Sign selected" on `worklists.unsigned_progress_notes`) | Off: organisation setting `worklist_bulk_sign_enabled` = false; when enabled, the confirmation lists every note with its first line, at most 50, own notes only | product owner, compliance |

### 12.3 Challenges to the brief (this document is still written against it)

| # | Brief statement | Evidence | Written as |
|---|---|---|---|
| C-1 | P3: "Morning Huddle" | The huddle is a table stake and the first idea of `research/competitor_analytics_teardown.md` §6 (P0); most Yesterday, Today and Next-days tiles use P1 metrics (`net_production`, `net_collections`, `patients_seen`, `scheduled_production`, `same_day_treatment_amount`, `unsigned_progress_notes_count`, `missing_progress_notes_count`, `daily_audit_exceptions_count`) | Written as P3 (DASH-21, with present mode and phone rendering). Proposed: a Huddle v1 in P2 with the four views from P1/P2 metrics, no goals, opportunities as counts drilling to print reports, single-column phone rendering; the full huddle (goals, worklists, flags) stays P3 |
| C-2 | P4: "goals, scorecards, multi-office comparison, alerts"; P3: "Morning Huddle" | The huddle's core tiles are goal, pace and needed-per-day (05 §7.1; D-7b); goals also carry `production_forecast` | Production goals (DASH-18 to DASH-20) are P3 with MET-17; targets and bands, scorecards, comparison and alerts stay P4 |
| C-3 | Category keys of §4 list `worklists` and `custom`, not dashboards | Print, export and subscription of a dashboard need a report definition (AD-5, AD-6); `report_schedules` schedules a `report_key` | Dashboards use keys `dashboards.<name>`; their hidden twin definitions need `dashboards` as a reserved category of the report registry |
| C-4 | Engine state tables use the prefix `report_`, reporting data `rpt_` | Follow-up state, outcome events and alert state are business data that outlive runs | NEW tables `worklist_followups`, `worklist_events`, `worklist_outcome_codes`, `metric_alert_states` outside both prefixes |
| C-5 | P3: "Worklists"; P2: "Collections, A/R and insurance dashboards" | The billing persona lands on P2 dashboards whose data (DATA-26, DATA-27, DATA-31) is ready in P2, but the queues behind them (`outstanding_claims`, `unbilled_procedures`, `patient_ar`, `unallocated_credits`) ship in P3 | Written as P3 with the print-report drill fall-back of 2.0.4. Proposed: move a minimal worklist slice (DASH-28 and DASH-30 limited to open record, log outcome, assign; DASH-35) into P2 with the insurance parity work |

### 12.4 Assumed from, and requested of, other documents

| Document | Assumption or request |
|---|---|
| `02_architecture.md` | (a) `dashboards` is accepted as a reserved category for hidden twin definitions built by a `python_builder` over the metric service, and a schedule may target them. (b) Actions on `paging_mode = live` lists accept `row_ids[]` or `all`, re-evaluated on the server, and return the refreshed rows. (c) `MetricQueryResponse` carries the resolved target and band with `include[] = goal`, the resolved key of an alias, `is_provisional`, warning codes, and accepts the windows `next_working_day` and `second_working_day` (also assumed by 05 §12.3); `include[]` also accepts `average_closed`, `to_date` (fiscal), `prior_year_range`, `variance_to_goal` and `projected` (`project_period_end`), computed per 05 §1.3-§1.4; the warning `parts_mismatch` (I-3) with the failing cells; a request flag `cache_bypass` for Refresh, rate-limited per user (`metric_refresh_per_minute`). Goal overlay: `include[] = goal` is ENG-51 (P4); P3 goal tiles query the goal metrics directly, so no earlier split of ENG-51 is needed. On (b): ENG-49 as planned resolves selections from a snapshot; (b) amends it for live lists, with the snapshot-of-selection fall-back of 6.1 until then. (d) A schedule's `condition` (shape of 7.2) is evaluated before the run is created, and an alert keeps its state between occurrences. (e) `/analytics/goals` takes the filters and `include[]` of 4.3 and answers 409 on a version conflict. (f) The assistant contract of 8.6. (g) The organisation keys `dashboard_role_defaults`, `worklist_attribution_window`, `alert_email_include_values`, `worklist_bulk_sign_enabled`, `metric_refresh_per_minute` and the worklist membership settings of 6.1 (`eligibility_lookahead_days`, `unscheduled_tx_max_age_months`, `recall_worklist_code_group`, `outstanding_claim_min_age_days`, `patient_ar_min_balance`, `patient_ar_min_age_days`, `broken_appt_lookback_days`, `unconfirmed_lookahead_days`, `not_reappointed_lookback_days`, `payment_plan_grace_days`, `lab_case_lookahead_days`) live in the engine's tenant settings (02 §13 row 23) |
| `03_data_foundation.md` | `provider_production_goals` with the columns of 05 §8.2 (DATA-24); the provider calendar function; the follow-up tables registered as passthrough datasets; an index for every declared worklist sort option; the account fields of DATA-35; the snapshot additions 05 §10 asks for |
| `04_filter_framework.md` | Dashboard header parameters `compare_to`, `periods_back`, `production_group`, `as_of` as parameter objects; NEW worklist parameters `followup_status`, `assigned_user_ids`, `not_contacted_within`, `visit_kind`, `overdue_band`, `appointment_kind`, `acceptance_state`, `treatment_value_min`, `benefits_remaining_min`, `credit_value_min` with types and components |
| `05_metric_catalog.md` | Correction: 05 §8.1 states that the rights `setup_provider_goals_screen_*` survive; they are listed in `REMOVED_ROWS` and are deleted by the curation [V]. `drill_report` of each metric agrees with 2.0.4; `follow_up_completion_pct` binds to the follow-up tables as in 6.1; the relation list for the explain panel is maintained with MET-25; an hour-of-day dimension (D-8). Tiles were limited to the dimensions 05 declares; declaring `user_key` on `case_acceptance_pct` and the unbilled keys, `channel` on `reminder_confirmation_rate_pct` and `recall_outreach_yield_pct`, and `aging_bucket` on `insurance_ar_estimated` would let 2.6, 2.7, 2.10 and 2.12 show those slices |
| `07_ux_blueprint.md` | Routes for dashboards, the Goals page, worklists and the alert list; the drill panel; `route_key`s of the navigate actions (patient shell, claim, ledger, treatment plan, Scheduler hand-off); the layout blob holds the matrix and tile options of 3.6; a notification entry in the application shell |
| `08_security_compliance.md` | Assumed (08 §13.3): the mapping of 2.0.5, including `dashboards.executive_summary` → `dashboard_view` and `dashboards.ortho` → the `ortho` family; `worklists.unsigned_progress_notes` opens with any of `daily`, `my_reports`; peer thresholds 5 and 10 (PR-8, SC-1). Requests: (a) grant `analytics_morning_huddle_view` to every seeded group, like `dashboard_view` (money tiles already degrade by family and class), and add it and `analytics_treatment_plan_dashboard_view` to the Doctor preset. (b) Whether an analytics right, which has one level, includes print, PDF and subscribe on the dashboard's twin report. (c) Rights for the follow-up actions (`worklists_followup_manage`) and bulk messaging (`worklists_bulk_message`) under SEC-36, and the families marked `*` in section 6. (d) The metric's registry label in alert notifications, and decision D-4. (e) Decision D-11 (bulk attestation of notes). (f) `metric_family` of 08 §2.3 versus `group` of 05 §1.2. (g) Retention of follow-up notes (`worklist_events.note`, class `phi_identified`). (h) Audit events for goal changes, alert acknowledgement and worklist outcomes beyond `report.action` |
| `catalog/*` | Final legacy `report_key`s and option values used in 2.0.4; drill-only parameters (unplanned same-day lines on `daily.production_report`); print counterparts of the worklists keep literal parity |
| Owning features outside this module | Bulk text job and message types for recall, reactivation, treatment and balance reminders (SMS); batch letters; statement run; claim create, send and close actions; a slot-search call (Scheduler); postcards and labels (do not exist). Scheduling owner: `PATCH /appointments/{appointment_id}/status` should build its response from the one appointment id instead of listing the whole office (`app/api/v1/scheduler.py` L71-74); worklist actions call `scheduler_service.update_status` meanwhile |

### 12.5 Coverage of the feature ideas of `research/competitor_analytics_teardown.md` §6

| Ideas (#) | Where | Status |
|---|---|---|
| 1, 3, 5, 43 | Morning Huddle 2.4; pacing 4.4; present mode and mobile 3.6 | covered |
| 2, 4 | `worklists.not_reappointed`, `worklists.broken_appointments`, `worklists.todays_patients` | covered |
| 7, 22 | Provider Dashboard 2.2; scorecards and rankings 3.4, 5.1 | covered |
| 8, 20 | Goal grid with autofill and seeding 4.2; targets and bands 4.2 | covered (hours-based goals: source `hours_based` of 05 §8.3) |
| 9, 27, 28 | Custom scorecards, custom KPIs, builder (section 9) | covered, P5 |
| 11, 16, 17, 37 | Follow-ups, outcomes, bulk actions, financial worklists including open denials and overdue payment-plan instalments (section 6); outreach results (DASH-43) | covered |
| 13, 14 | Worklist filters (benefits, benefit year); builder List mode on Patients | partly: "has or lacks a code" logic is not offered |
| 4 (forms, birthday), 44 (refresh) | Flags `birthday_today`, `forms_missing`, `medical_history_due` of `worklists.todays_patients` (6.12); Refresh on cards and dashboards (3.2) | covered |
| 15, 34, 35 | Assistant (section 8) | covered, P5 |
| 18, 38, 39, 40, 41, 42 | Patients 2.11; Collections 2.6; Hygiene 2.9; Treatment 2.10; Referrals and marketing 2.12 | covered (no map; marketing cost needs an input) |
| 19, 25, 44, 45, 46 | Principles 3, 4, 8; definition popover 3.2; saved views that follow the working office 3.6 | covered |
| 21, 23 | `compare_to` and weekday alignment 2.0.2; in-organisation comparators (section 5) | covered; external benchmarks off (05 D-9) |
| 26, 29, 32, 33 | Organisation metric settings (05 §3); parameterised reports (04, catalog); digests (section 7); favorites and saved views (02 §8) | owned by other documents; digests here |
| 6, 10, 12, 24, 30, 31, 36 | Suggested patients for an open slot; treatment-team attribution beyond the counselor; revenue what-if; fee benchmarking; SQL workspace; warehouse and BI connectors; predictive scores | not in this plan |
