# Design summaries

Generated from the results returned by the authors and revisers of each plan document. One block per document:
what it specifies, its key decisions, the decisions still open, and the size of its review. Use it to find your way;
the documents themselves are the source of truth.

## 02_architecture.md

02_architecture.md specifies the server-side report engine: code-first definitions served as JSON, a 15-step run pipeline, scoped dataset handles (relations, table functions, join-only dimensions), and one REPEATABLE READ read-only transaction per run, metric query and dashboard call. Runs are per-requester rows (executor or follower) with attempt fencing, heartbeat thread, lazy reaping, and a Cloud Tasks worker; a Cloud Run Job tick reaps, sweeps, schedules, refreshes dirty roll-up slices and purges. Snapshots hold display-final values in one print stream; PDF, XLSX and CSV render from them with per-format inline caps and object storage from P0. Security: engine-owned office rule, strict rights, data classes on columns and parameters, explicit can_view_run, audit events written transactionally with patient manifests. Also covered: saved views, schedules, metric and dashboard APIs, custom definitions, fail-closed configuration, 64-route API, test tiers, 63 work items.

Review: 50 findings from 2 independent reviewers; 41 applied, 10 rejected with reasons. Lines: 2407.

**Key decisions**

- One REPEATABLE READ, READ ONLY transaction per run, metric query and dashboard call on a dedicated report_engine pool (3+2, pool timeout 2 s -> 429); data_as_of = its transaction timestamp.
- The engine computes its own office scope: tenant-wide only with the view-all right, otherwise assigned offices, none -> 403; the platform's zero-assignment (ungated) hatch is not inherited (flag REPORT_UNGATED_OFFICE_ACCESS for staged rollout).
- working_office_id is an explicit body field; X-Office-ID is audit-only; 'today' resolves in the reported office's zone and reference_date is part of params_hash.
- Every request has its own report_runs row; executor and follower rows share a snapshot through snapshot_run_id; can_view_run is an explicit subset predicate re-checked on rows, drill, actions, export, download and delivery.
- attempt is the fencing token: heartbeat on its own thread, FOR SHARE fence per snapshot batch, claim deletes old rows; the engine owns retries, the queue only delivery; task names carry attempt and enqueue count; enqueue sweep recovers lost tasks.
- The tick is a Cloud Run Job started by Cloud Scheduler from P0 (reap, enqueue sweep, due schedules, dirty-slice refresh, purge, audit-outbox drain) with advisory locks and time slices.
- Admission limits, lazy reaping of inline runs, inline cancel and object-storage artifacts with patient manifests are P0 deliverables, not P2.
- Snapshots store display-final values (rounded once, zones converted once) in one print stream with block_no per row; summary cards come only from block totals of the same run.
- Rendering never shares the run request: per-format inline caps (PDF 1,500 / XLSX 10,000 / CSV 50,000 rows), one render per process, queue task above; statements and slips split into PDF volumes; XLSX limited by cells.
- Data classes are mandatory on every column, derived for computed columns, and applied to parameters (hidden and forced when the class is missing).
- Dataset contract: Table objects on a separate rpt_metadata; relations and table-valued functions (p_tenant_id first, explicit office array); dimensions are join-only; python_builder only for whitelisted service-backed reports with per-row scope checks.
- Run cache is off by default: data-version markers come from SQLAlchemy session events with a poison stamp on a failed touch; balancing reports stay uncached; metrics are TTL-only until P2.
- Audit events are written in the same transaction as the state change (report_audit_outbox); a PHI run without a manifest is not succeeded; read-type POSTs skip the generic audit row.
- Side-effecting runs (statements) write through a commit_builder inside the terminal transaction, are never cached or shared, and need a commit right and rerun confirmation.
- Fail-closed configuration: SERVICE_ROLE default api, dev-only inprocess queue and local storage, REDIS_NAMESPACE for Pub/Sub channels, always-mounted public routers so the OpenAPI document is identical everywhere; deploy order worker -> job -> API with a definition check at claim.

**Open decisions**

- Challenge to the brief's phase skeleton: Statements parity is P1 but background runs are P2; a large statement batch cannot fit the 45 s inline budget and P1 PDF exports are capped at 1,500 rows. Either statements move to P2 or the db_poll drain job (ENG-63) with the claim/heartbeat part of ENG-38 moves to P1. Default: written against the brief; oversized P1 runs fail with report_too_large_for_inline.
- Office rule for callers without any office assignment: strict (this document) versus the platform's ungated rule that 04 §6.2/§6.6 transcribe. Default: strict, REPORT_UNGATED_OFFICE_ACCESS per client. Owner: 08 (and 04). Needed in P0.
- Reference time zone when working office and reported office differ: reported office's zone (this document, AD-9) versus working office (04 §7.5). Needed in P0.
- Queue transport after the ENG-21 spike: Cloud Tasks push to a worker service (default, AD-5) or db_poll as a drain job / worker pool.
- Run-cache invalidation: Redis markers fed by session events (default, cache off by default), TTL-only reuse, or database-side markers written by the triggers 03 plans for rpt_dirty_keys. Needed in P2.
- Tick as a Cloud Run Job every 5 minutes (default, 288 executions per client and day) or an endpoint on a worker service with one reserved instance. Needed in P0.
- Connection budget: max_connections of the shared Cloud SQL instance and the share reserved for reporting (worst case 34 connections per client with the defaults); read replica later. Needed in P2.
- Retention defaults (24 h / 7 d / 30 d snapshots and files, 400 d run log) and manifest retention; product owner and counsel. Needed in P1.
- PDF above 10,000 rows: refuse with XLSX/CSV for tabular layouts and 500-document volumes for statements and slips (default), or volumes for every layout. Needed in P1.
- Dedicated read-only database role per client (REPORT_DATABASE_URL) or read-only transactions on the application role (default: optional role, read-only transactions always); also decides which role issues pg_cancel_backend. Needed in P0.

## 03_data_foundation.md

The document defines the reporting data layer: rpt_* dimensions, a canonical ledger of every money leg, allocations, ageing, scheduling, claims, coverage, clinical and list datasets, each with columns, SQL and era caveats. After revision every leg carries the patient's current account; one function (rpt_fifo_core) caps real links, pairs transfers, and produces allocations and open items for two units (account, account-and-office). Ledger buckets come from the code class, parity columns from the legacy Sub Type. Migrated-data risks are explicit: sign policy, incomplete charge load, unclassified adjustments, claim status mapping. Section 6 has 39 readiness checks, section 7 DDL for every addition, section 10 24 invariants including an external control-total gate (R-21). Section 11 rates all 118 legacy reports by default mode (READY 78, REPAIR 4, SCHEMA 19, APP 17) and traces the 31 reference dashboard rows. 57 work items, 15 open decisions.

Review: 50 findings from 2 independent reviewers; 49 applied, 7 rejected with reasons. Lines: 4344.

**Key decisions**

- One A/R unit: account_id on every ledger leg is the patient's current account (patients.account_id); the posting-time stamp is exposed only as posted_account_id.
- One allocation computation, rpt_fifo_core(), returns allocations, unallocated credits and open debits, so allocations and ageing cannot disagree; real links are capped inside it, not trusted from the write path.
- Two allocation units: 'account' (Aging by Home Office, statements, allocations, provider income) and 'account_office' (legacy Aging Report, A/R by transaction office); both snapshotted; per-office ageing must equal the per-office ledger balance (R-14b).
- ledger_bucket (analytics) is derived from the code class first; journal_column (legacy parity) from the legacy Sub Type; opening balances, contract movements, sales tax, transfers and non-cash payment codes never enter production or collections.
- Legacy data policies are tenant settings shared by screens and datasets and default to today's screen behaviour: legacy_archive_policy = exclude, legacy_positive_payment_policy = credit.
- A payment reversed with a refund stays live in the ledger (money in on its date, money out on the refund date); balance_service gets the same rule in DATA-07.
- Financial reports are gated on R-01..R-06, R-10a, R-12, R-13, R-14b and on R-21 (Denticon control totals) passing or being waived with the gap printed; the 87,585 skipped charges are reloaded in P0 (DATA-57).
- Unallocated means method = 'unallocated' only; a persisted remainder (DATA-26) is never re-applied; the legacy Unallocated report exists only on persisted allocations (app era).
- Joins never multiply money: lookups on unique keys or LATERAL LIMIT 1, group membership through rpt_code_in_group() EXISTS, transaction code versions protected by an exclusion constraint.
- Every ledger leg has service_date_effective, transaction_date and (payments) payment_date; the Deposit Slip 'Payment Date' basis becomes distinct with DATA-13.
- Claims: line roll-ups resolve through the claim family; expected and outstanding are per tier; migrated claims count as receivable only while submitted or pending (outstanding_quality).
- Visits have two grains: rpt_visits (patient-office-day, additive) and rpt_provider_visits (per provider, for filters, dashboards and PD-11); the Daily Audit keeps whole-day flags and filters on provider arrays.
- Recall is scheduled only when the recall code is on a future booked line; the function excludes nobody and returns flags for inactive patients and Send-to-Collection accounts.
- P1 collections by provider use the credited provider (labelled) and are restated when tenant-wide allocations arrive in P2; calendar functions and rpt_treatment_item_facts are P1 so both reference dashboards have sources.
- Capitation payments get their own table (capitation_payments) and two ledger legs without a patient; the responsible-party type moves onto accounts (DATA-53).

**Open decisions**

- O-11 Challenge to PD-4: account-level oldest-first allocation yields only the home-office view; the document uses two units (account, account_office) so the legacy Aging Report and per-office A/R tie to the office ledger. Owner: product owner + accountant.
- O-12 Challenge to the phase skeleton (PD-7 in P1): tenant-wide allocations are P2, so P1 collections by provider use the credited provider and are restated in P2; alternative is to build rpt_derived_allocations nightly in P1.
- O-13 Positive migrated payment rows: payments stored positive or legacy reversals? Default policy 'credit' (screen behaviour) until an accountant samples check #1 against Denticon.
- O-14 Incomplete migrated ledger: reload the 87,585 skipped charges (default, DATA-57) or accept and print the gap; R-21 gates financial reports on migrated periods.
- O-2 Class, Sub Type, is_income, counts_as_collection and legacy Class of each payment / adjustment code; one Sub Type decision for the insurance write-off (AINSO and INS_WRITE_OFF); whether COLPY and AD900 count; bad debt inside or beside net production.
- O-1 Legacy archive partitions (ledger and appointments): include or exclude; default exclude until check #6 is run per tenant.
- O-6 Allocation for app payments: persist at posting with the legacy rule (insurance to claim line, patient payment to oldest open patient portion, explicit unallocated remainder) or require explicit splits.
- O-8 Is the Denticon export still available for a re-read (DATA-12, DATA-50, DATA-57), and can offices still run Denticon reports for the R-21 control totals?
- O-9 Challenge to AD-3 / phase skeleton: rpt_derived_allocations and the close snapshots are step-B tables needed in P2, not P4.
- O-10 Challenge to PD-3 wording: refunds exist both as patient_refunds rows and as collection-side adjustment codes; datasets expose entry_type = 'refund' so the metric catalog nets them once.

## 05_metric_catalog.md

The document defines 261 metric keys: 227 fixed-definition metrics, 9 aliases, 21 named slices and 4 synonyms. They are written as formulas on the 03 rpt_* datasets. Metrics carry two fields, aggregation and time_semantics, and availability codes H/A/D/G/N/X with caveats k1-k16. Formulas select by ledger_bucket only, use one credited provider per leg under hygiene_credit_policy, read A/R through an explicit allocation unit, and use an allocation component for collections by provider. There are 46 organisation settings (parameters echoed in resolved_settings{}, a legacy preset) and versioned code groups with a safe first override. Sections 6-7 map the reference dashboards and the legacy Practice Analytics, marking each difference as preset or fixed. Section 8 covers goals with office-level rows and pacing edge rules. Section 9 holds benchmarks gated by key and required_settings. Section 10 lists the snapshots on rpt_metric_values. There are 27 work items MET-01..27 and requests REQ-01..16 to 02/03/04/08.

Review: 25 findings from 1 independent reviewers; 25 applied, 0 rejected with reasons. Lines: 1865.

**Key decisions**

- Ledger buckets come from the class first (03 §3.3): AINSO/INS_WRITE_OFF are production adjustments; sales tax, contract movements and AD900 are outside both nets; COLPY is not a collection
- Alternatives that measure a different event or population are fixed-definition keys behind an alias; window, basis and credit settings are parameters echoed in resolved_settings{}
- Benchmarks are shown only for the resolved fixed key and matching required_settings
- A/R by transaction office = allocation unit account_office (unit_office_id); home office = unit account; never grouped by the leg office_id
- One credited provider per money leg and visit under hygiene_credit_policy (default hygienist); linked write-offs and allocations follow their charge
- Collections by provider use an allocation component that totals to gross_collections on the transaction basis, with members for Unassigned provider, Unallocated, Refunded and Opening/transfer
- Outstanding claims are summed over all tiers; claims of quality 'unknown' are excluded and reported in a warning
- The migrated net family is served degraded (D(12), is_degraded) and never substituted; app-era-only aliases return not_available for history
- Case acceptance, treatment reappointment and provider and office calendar hours ship in P1 on DATA-55/56
- Reference row 13 = office_open_hours with booked_hours added; Provider Total Appointments = appointments_booked; hourly production uses booked hours by default
- Every division is safe_div; zero denominators give no_data, including R = 0 in daily_avg_needed_to_goal
- Settings, code groups and transaction-code versions bump metric_settings_version through one settings service, gated by analytics_metric_settings_manage (reports_administer meanwhile)
- Goals: provider rows plus optional office-level rows; apportioned by schedule or calendar, never by production; pacing only for the current month

**Open decisions**

- D-1 collection % denominator (before or after bad debt) and production-adjustment dating
- D-2 case acceptance default unit and window
- D-3 hygiene reappointment default and hygiene-appointment test
- D-4 hygiene production credit and compensation rule (PD-7)
- D-5 new-patient basis and office attribution
- D-6 working-day basis and clinical-hours source
- D-7 challenge to brief phases: goals/pacing in P3, snapshot capture from P2
- D-8 collection levels and bucket assignment aligned with 03 O-2 (accountant sign-off)
- D-9 published benchmarks in product (permission, default off)
- D-10/D-11 Treatment Reappointment definition; metric API additions (REQ-12..14) and administration right (REQ-15) not yet in 02/08

## 06_dashboards.md

06 specifies 16 code-registered dashboards (Main and Provider in P1 with all 20 reference rows; Collections/A/R, Insurance and Executive summary in P2; Huddle and the topic dashboards in P3; multi-office in P4). Every tile names 05 metric keys and dimensions only, renders named states, and drills to a reconciling report, with a phase fall-back to print reports until the worklists ship. The server computes every figure: summary columns, parts check and goals (goal metrics in P3, include[]=goal in P4). Scorecards ship in two versions: v1 in P2 and ranked v2 in P4, which follows 08 PR-8 peer thresholds of 5 and 10. Section 6 defines 19 worklists: fixed membership predicates, follow-up and event tables, service-layer actions, safe signing, denials, day close. Then come alerts on the schedule engine, a registry-only assistant (P5), the builder user view, ordered role defaults, 55 work items, risks and challenges.

Review: 22 findings from 1 independent reviewers; 23 applied, 0 rejected with reasons. Lines: 1594.

**Key decisions**

- Dashboards are code-registered definitions keyed dashboards.<name>; print, export and subscribe go through a generated hidden twin report definition
- Tiles name only 05 metric keys and declared dimensions; the DASH-01 lint also checks that each drill target is served by the tile's phase
- The browser computes nothing: totals, averages, YTD, prior year, variance, projections and the I-3 parts check come from the metric service
- Main and Provider Dashboards in P1 cover all 20 reference rows (case acceptance and treatment reappointment on DATA-56)
- Before a worklist ships, its tiles drill to the print counterpart (2.0.4 fall-back table); worklists.not_reappointed ships read-only in P1
- Production goals in P3 are queried as goal metrics; include[] = goal (targets and bands for any metric) arrives with ENG-51 in P4
- Scorecard v1 (P2) has no rank or peers; v2 (P4) adds ranks, quartiles and peers under 08 PR-8 (mean from 5 others, distribution from 10)
- Worklists = report definitions of kind worklist plus NEW worklist_followups, worklist_events, worklist_outcome_codes; fixed membership predicates in organisation settings open and resolve cycles
- Record-changing worklist actions call the owning service layer (e.g. scheduler_service.update_status), never the HTTP route per row; status bulk actions capped at 200 per job
- Progress notes are signed one at a time from a read-only panel; bulk sign is off by default (worklist_bulk_sign_enabled, D-11)
- Denied claims get their own worklist; day close gets worklists.day_close_checklist in P2
- Role landing rows are evaluated in a fixed order and the first match wins; Billing is recognised by group membership; the landing is a default, never a fence
- Alerts are report_schedules rows with a metric_test condition plus NEW metric_alert_states; e-mail is link only
- Assistant (P5): registry-only plans, server-side execution, number verification, kill switch per 08 §9

**Open decisions**

- C-1 (challenge): Huddle v1 in P2 from P1/P2 metrics; written as P3
- C-5 (challenge): minimal billing-worklist slice (DASH-28/30 subset, DASH-35) in P2; written as P3 with print drill fall-back
- C-2: production goals in P3 rather than P4 (written so)
- D-4: whether alert notifications or e-mails may carry the office aggregate value
- D-6: who sees money on the huddle (decided by family and class; no separate switch)
- D-7: next available appointment needs a Scheduler slot-search call
- D-10: worklist versus print report in menus (both exist)
- D-11: bulk attestation of progress notes (off by default)
- Request to 08: grant analytics_morning_huddle_view to every seeded group and add it and the treatment-plan dashboard right to the Doctor preset
- Request to 02: include[] summary values, parts_mismatch warning, cache_bypass, and ENG-49 amended for live selections

## 07_ux_blueprint.md

07 is now the UX blueprint and frontend structure of the Reports module. It covers the hub IA (with load-failed and request-access states), the 26 legacy menu entries, the route table, and one lazy /reports/* route with an engine-state table and return-to-after-login. It specifies a catalog-driven Reports menu on a Radix dropdown with error containment and an idle catalog fetch, and two criteria frames over one useParamForm, with the classic layout driven by a served criteria_rows field. Also covered: runner page states (including no_working_office), the per-cost-class lifecycle, a virtualised accessible print-stream table with a paged view, drill, export with an openReportArtifact state table, schedules, saved views, favorites, sharing, the dashboard and worklist frames, and the component inventory with value-key binding. The frontend-structure part covers React Query keys, code splitting with stale-deploy detection, layered compact CSS, the session refresh across tabs, WCAG 2.2 mapping, named container sizes and a scoped print sheet. It closes with library choices, the migration, work items UX-01..UX-49, risks and open decisions.

Review: 25 findings from 1 independent reviewers; 25 applied, 1 rejected with reasons. Lines: 1676.

**Key decisions**

- One lazy /reports/* route; ReportsEntry in the main chunk; engine state on/off/misconfigured/unknown decides nav and routes; any 404 on the catalog = engine off
- Return to the requested /reports/* page after login through state.from and sessionStorage auth:return_to (UX-48)
- Catalog fetched once on idle after login; single source for nav, probe, tray and module_access; total mergeCatalog plus main-chunk error boundaries
- Reports dropdown rendered with Radix dropdown-menu; Search Report is a reports_search action item
- Classic layout from a served, lint-enforced criteria_rows + row_span; one column when it is absent, never a guessed pairing
- Classic frame never runs before PRINT / PREVIEW; instant auto-run only in the enhanced frame, drill panels and list tiles
- URL carries only url_safe value keys; frame switches carry form values in router state; _run hydrates the form from params_input
- Controls bind directly to declared value keys; only office_scope / scoped_selection keep the {mode, selection} form state of 04 §13.2
- EntityPickerDialog is a NEW server-paged virtualised listbox transfer list; ProviderParam options only from the options endpoint
- Result table: focusable region, Skip table, focused-row retention, optional paged view, single-line cells with Row details
- Token refresh is single-flight per tab and across tabs via navigator.locks (UX-14)
- Unsaved-changes guard extends the existing registry (nav clicks, links, beforeunload); Back unguarded (UX-49); data router deferred (OD-11)
- Preferences blob written by read-merge-write of the reports_ui subtree only
- Module CSS inside @layer base with global specificity; print rules scoped to .rpt-root and reset --app-zoom
- One shared tenant-topic socket generalised from AppointNowSocket; no third WebSocket

**Open decisions**

- OD-1 Default frame for users who have not chosen (default: classic until parity sign-off)
- OD-2 TanStack Table v9 or v8.21.3 (default: v9 if spike S-1 passes)
- OD-3 Silent token refresh inside this module's P0 or as a platform change (default: P0, UX-14)
- OD-4 Ctrl+K global or reports pages only (default: reports pages)
- OD-5 Matrix keyboard model: grid pattern or one button per cell (default: grid pattern)
- OD-6 May user or organisation default views replace the legacy defaults (default: yes, visibly)
- OD-7 Reports tray as the only notification reader or an app-wide centre (default: tray)
- OD-8 UI preferences: whole-blob PUT with read-merge-write or an engine endpoint with server-side merge (default: read-merge-write)
- OD-11 Unsaved changes: registry-based guard (UX-49) or a move to a data router for useBlocker (default: registry)
- Contract: may an unassigned caller with all-office access omit working_office_id; 04 to drop the two-column wording from its ParamForm note and to re-size FLT-13

## 08_security_compliance.md

08 defines rights, scope, data classes, audit, export controls and retention for Reports & Analytics. Rights catalog revision 2 (410 rows) with rule-based default grants per tenant group and a segregation exception. Strict authorisation through one principal; shadow is a time-limited grace list for surfaces that exist today. One report-mode office function for every report surface; provider restriction follows the right the caller came through; viewer-side checks on every stored run. Thirteen data classes, label classes for dimensions. Audit goes outbox to append-only store with triggers, seals from P1, a patient index for every run, and a disclosure log with amendments. Twenty-nine existing defects are scheduled, including open signup, missing tenant predicates and open identity reads as P0 entry conditions. 45 work items, 16 risks, 17 open decisions, lettered requests to 02 to 07.

Review: 25 findings from 1 independent reviewers; 25 applied, 5 rejected with reasons. Lines: 1451.

**Key decisions**

- Rights stay in the global catalog: revision 2 = 410 rows (6 restored, 41 new, 13 deactivated); strict rule (`has_strict`) for every report check.
- View Only runs and views; Full Control also prints, exports PDF and runs formats that write (`commit`); second keys for data files, bulk, schedule, share, build, pin, administer, disclosures.
- Full-access roles are `admin`, `super_admin`, `owner`; role `manager` holds nothing by role except class `payroll_time`.
- One office function, `report_scope.allowed_offices()`, for every report surface; the alias right, zero assignments and role `manager` never widen; `REPORT_UNGATED_OFFICE_ACCESS` is a separate staging switch.
- Provider restriction is a property of the grant path (PR-10); a self restriction satisfies `provider_comp` and `financial_practice`; peer mean needs 5 other providers, quantiles 10.
- Every `my_reports.*` definition and every `report_by` option carries a self restriction; `my_reports.production_report` is `self_unless_privileged` per PD-11.
- `can_view_run()` V-1..V-7 on every stored-run read, requester included; reduced run shape without result-bearing fields; a supplied `run_id` is returned only to its own requester.
- Data classes: 13-class vocabulary, security split into `security_users` and `security_groups`, dimension `label_class` / `llm_egress`, unknown `patient_access_level` treated as `none`.
- Default grants are evaluated per tenant group by rule; class `user_activity` and the audit family are withheld from groups with posting rights until an explicit decision.
- Shadow relaxes only the six migrated reports and legacy read routes, with a class ceiling and an end date; everything else is enforced from the first deploy.
- Audit events are outbox rows of the state transaction drained into `report_audit_events`; triggers on events and outbox; fail closed for PHI; manifest is part of success; seals in P1, external anchor in P2.
- Patient access index for every run with patients; disclosure log fed at export or recorded later, changed only by amendments.
- P0 entry conditions: open signup closed (`ALLOW_SIGNUP`), tenant predicate on tenant-less generic resources, strict gates on identity writes and reads.
- Shared Redis: no authorisation state, client namespace on every key, self-describing cache values, client configuration check.
- Legacy roll-ups are gated field by field with the metric-family right sets; custom reports need a report family of their dataset and the class of every referenced field.

**Open decisions**

- 1 Challenge to PD-10: legacy View Only lists reports but cannot generate; written against the brief (View Only runs and views).
- 2 Two keys for XLSX/CSV export and schedules versus Full Control alone; default two keys.
- 3 The 13 `reports_group_reports_*` codes: deactivate (default) or require them for multi-office runs.
- 4 / 4b Role `owner` holds everything; role `manager` follows its offices and groups (default) or keeps the platform role valve, which lets a one-office manager read all offices.
- 5 Callers without office assignments: refused from the first deploy, `REPORT_UNGATED_OFFICE_ACCESS` per client during its window.
- 6 / 7 Meaning of `patient_access_level` (ceiling of §4.4); date of birth as `phi_identified`, SSN never in full.
- 8 / 10 Retention 72 months for audit, 84 for pinned runs, write-once bucket; audit tables under a second database role or trigger and seals only (counsel).
- 9 / 16 / 11 / 12 External recipients: declared-recipient log only versus external-viewer accounts; own right for the disclosure log; assistant vendor route; export approval and step-up.
- 13 / 15 PD-11 versus literal parity on `my_reports.production_report` (default `self_unless_privileged`); peer thresholds 5 and 10.
- 14 Segregation default: withhold `user_activity` and the audit family from groups that post transactions until the administrator decides (default) or grant the legacy holders.

## 04_filter_framework.md

Revised `04_filter_framework.md` (2,243 lines) and regenerated `signature_map.json` from one generator; the validator prints SIGMAP VALID, 358/358 signatures, 1,025/1,025 controls. All 49 findings were verified: every one is applied (four blockers included), seven sub-points are rejected with reasons. Main changes: explicit office value shapes, per-control overrides, option-level rules and rules on enabled controls, the `unknown` marker, checkbox-group semantics, fixed date basis for 36 reports, `patient_id` / `account_id`, restriction parameters, 17 types (buttons become definition actions), pipeline order, option sources phased by first use. Aligned with 02, 07 and 08 as they stood; 08 was still being edited at 16:06, so its rule numbers may move. Cross-document tools on a scratch copy: no FLT work-item problem; the name check leaves only NEW `statements.finance_charges`. Tool changes and committing the generator remain FLT-22, because only two files were writable.

**Open decisions**

- 1. EXCLUDE PATIENT TYPE is an exclude filter (label, footer echo) or an include filter (one vendor article). Default: exclude on all 17 reports. Owner: product owner, after the live check.
- 2. Office Group: does the legacy dialog select several groups, and does ALL cover offices without a group. Default: several groups accepted (`office_group_ids`); `all` = offices that belong to a group. Owner: product owner, after the live check.
- 3. Does Office Group mode or a multi-office run need one of the 13 `reports_group_reports_*` rights. Default: no, as 08 (codes deactivated, office assignments govern). Owner: 08, product owner.
- 4. 'Today' when the selected offices span time zones: one range in the reference zone with warning `mixed_time_zones` (02) or each office's own today (03). Default: one range per run, as 02. Owner: product owner; 02 and 03 must agree.
- 5. Name ranges: prefix comparison on the sort name `Last, First`; visible sentinels AAAAA / ZZZZZ. Default: prefix rule, sentinels kept as open bounds. Owner: product owner, after the live check.
- 6. A narrowed age range and a missing birth date. Default: patient excluded; the open bounds 0 and 999 never exclude. Owner: product owner, after the live check.
- 7. Options endpoint for every lookup parameter or only for sources without an existing list endpoint (02 section 13 row 4). Default: every lookup parameter, gated by the report right. Owner: 02.
- 8. Ortho rule behind `patient_type`. Default: owned by 03 (candidates `patients.patient_type`, code OR in `patients.patient_types`). Owner: 03.
- 9. Signatures counted as `unknown_legacy` until read. Default: yes, 18 signatures / 22 controls stay open in the parity matrix. Owner: program lead.
- 10. Fee schedules and referral sources are office-pinned catalogs in DentC but organisation-wide in the legacy tool; 08 S-10 still lists those reports as `office_mode = none`. Default: `optional` with the catalog rule. Owner: 08.
- 11. `output_format` with `role: query` on four reports (a format change runs the report again). Default: literal behaviour kept. Owner: product owner.
- 12. Patient box of Patient's Notes: empty default (as captured) or the patient in context. Default: empty, patient in context as first suggestion. Owner: product owner, after the live check.
- 13. Who is report-unrestricted: `OfficeScope.can_view_all()` as 02 reuses it (accepts the scheduling alias) or the strict rule S-3 of 08. Default: the rule of 08. Owner: 02 and 08 must agree.
- 14. Patient context of a report opened from the Reports hub while a patient is active: sent (legacy pre-fills from the loaded patient) or only from the patient shell (07). Default: only from the patient shell. Owner: 07, product owner.
- 15. PAPER STATEMENT SENT: what the legacy button does and what enables it (report of paper statements sent, or the bulk action 02 section 5.9 names). Default: one definition action `paper_statement_sent` with `enabled_when: unknown`. Owner: product owner after the live check; 02.
- 16. Callers exempted by a `self_unless_privileged` definition (PD-11) on My Reports Production Report and the provider-type options of My Daily Journal. Default: the hidden `provider_ids` becomes a picker for an exempt caller (own link, else `all`). Owner: 08, product owner.
- Request 1 to 02: resolve the office scope inside the parameter step, before dependency rules and date tokens.
- Request 2 to 02: request field `context{patient_id}` on run, validate and saved-view resolve.
- Request 3 to 02: `display{}` and `ctx{}` in the validate response.
- Request 4 to 02: value key `office_group_ids`; value `"all"` for `office_ids` and `office_group_id`; `office_policy = assigned_offices` resolves to the token `my_offices`.
- Request 5 to 02: actions with `scope: criteria` and `enabled_when`.
- Request 6 to 02: definition field `week_start` (`iso`, `payroll`) and the context fact `ctx.user_restricted`.
- Request 7 to 02: the `Parameter` additions of 13.1 and the four expression additions of 9.1.
- Request 8 to 02: label resolution route `POST .../options/{param_key}/resolve`; option fields `sub_label`, `is_active`, `disabled_reason`.
- Request 9 to 03: date columns for the new bases (`lab_*_date`, `ortho_visit_date`, `work_date`, `claim_printed_date`), guarantor sort name on `rpt_account_dim`, a response model for `GET /provider-specialties`.
- Request 10 to 06, 07, 08: use the final names (`working_office`, `account_id` with source `accounts`, 17 types with `ActionParam`, `week_to_date`, explicit office values, `office_mode = none` on 18 reports).

## other_menu_entries.md

The document covers the 13 legacy Reports-menu entries without screenshots. Vendor help-centre articles and about 60 of their screenshots (public article API and attachments) gave item-level inventories: 2 interactive queues, 6 office reports in 3 customer folders, 7 letter groups, 4 postcard types, 12 label types, 6 blank claim forms, 3 registration forms, the My Favorites grid, Search Report results and the Reports (Old) tree. Each entry has the legacy description with sources, its landing place (worklists, custom reports, hub favorites and search, correspondence and form features behind hub links), the state of our code verified by file, a parity checklist and a capture list. Main findings: batch letters, postcards, labels and blank forms do not exist in our application; our Envelope Printing option and letter-group labels differ from the legacy tool; five functions exist only under Reports (Old). 15 work items (RPT-MENU-01 to 15) passed the plan's work-item collector on a scratch copy. 07_ux_blueprint.md did not exist, so routes and link keys are marked NEW.

## analytics_reports.md



## Report specifications (catalog)

### daily_reports

Audit: 60 findings (1 blockers, 22 majors), 13 mapping concerns; revised: True; checks: PARITY VALID category=daily_reports reports=12 controls=154 from_vendor_documentation=3 dynamic_rules=19 help_text=1 not_applicable=0 replicated=75 replicated_enhanced=70 superseded=5 unknown_legacy=3 / CATALOG VALID category=daily_reports doc=daily_reports.md reports=12 work_items=55 lines=2595

**Reports** (report_key | legacy name | phase | size | availability)

- daily.peg_board_day_sheet | Peg Board Day Sheet | P1 | M | READY (frozen sheet SCHEMA(29)); output INFERRED
- daily.daily_journal | Daily Journal | P1 | L | READY (Created Date/User on history REPAIR(10); Resp. Party Type SCHEMA(53); migrated code lines REPAIR(12))
- daily.production_report | Production Report | P1 | L | READY (by Carrier REPAIR(10), SCHEMA(33); adjustment list on history REPAIR(12))
- daily.collection_report | Collection Report | P1 | L | READY (by Code: per-account derived allocations inline in P1 with 31-day cap, table P2 DATA-26; by Carrier APP / SCHEMA(33); payment-type picker on history REPAIR(12))
- daily.deposit_slip | Deposit Slip | P1 | M | READY (Payment Date basis SCHEMA(13); Group Batch Checks Batch ID SCHEMA(28); tender on history REPAIR(12))
- daily.scheduled_production | Scheduled Production | P1 | M | APP (migrated booked lines 6 %; Estimated Prod. SCHEMA(24))
- daily.routing_slip | Routing Slip | P1 | XL | READY (Billing Type SCHEMA(53); first/last visit REPAIR(19); last statement SCHEMA(22); ortho block APP)
- daily.progress_notes | Progress Notes | P1 | M | READY (Unsigned APP; Missing exact per appointment SCHEMA(18))
- daily.production_analysis_report | Production Analysis Report | P1 | M | READY (Carrier variant REPAIR(10), SCHEMA(33); collection per carrier APP)
- daily.daily_audit | Daily Audit | P1 | M | READY (visit-code flags DATA-04; signed-note test APP)
- daily.claims_printed | Claims Printed | P1 | S | SCHEMA(21) (prints not recorded today; APP afterwards); output INFERRED
- daily.special_transaction_report | Special Transaction Report | P1 | L | READY (codes on history REPAIR(12); Service vs Transaction date SCHEMA(13); plan grouping on today's coverage until SCHEMA(33))

**Open questions**

- Production Report: is Include UCR greyed by PRODUCTION BY = Provider or only with REPORT FORMAT = Detail (taken: Provider + Detail only; challenge to filter_card 9.6)
- Daily Journal: what enables Show AR and does it print Total A/R as of the range end (taken, INFERRED)
- Collection Report: product sign-off of P1 By Code inline on per-account derived allocations with a 31-day cap versus O-12 alternative (nightly rpt_derived_allocations in P1)
- Collection Report By Code: does # Perf also count earlier-dated charges that received money; is UCR the stamped office_fee or the default UCR schedule fee
- Collection Report: do Payment Types restrict collection adjustments; what Page Break does under COLLECTION BY Code; is Page Break enabled for every value but None
- Provider meaning to confirm live: Collection Report (payment-line vs allocation), Scheduled Production (line vs appointment provider), Daily Audit (preferred vs transaction provider), Claims Printed (billing vs treating), Peg Board (ledger line)
- Production Report GROUP BY Carrier: does the legacy print a per-carrier adjustment list and how does it attribute adjustments to a carrier
- Production Report: PROVIDERS picker default and list; auto-tick of Page Break by Provider; SORT BY driver; Office Group bands vs consolidated rows
- Progress Notes: meaning of DOS / Created On / Appointment Date under Unsigned and Missing; does Unsigned unlock Appointment Date and APPOINTMENTS TO INCLUDE
- Routing Slip: completion meaning of appointment lines under Include Completed Procedures; Next Appointment fields under REPORT BY recall; Lst Ref Amt
- Production Analysis: does Practice Group $ stay office-wide under a provider filter; date bases of # of Claims and Avg. Collection per Pat
- Claims Printed (INFERRED report): are pre-authorisations, e-claims and void claims included; real layout and Summary content
- Special Transaction: Amount dropdown values and signed vs absolute comparison; Transaction Date = ledger date or entry date; Code/Category reset behaviour
- Deposit Slip: Payer display None = totals only or blank names; what enables GROUP BATCH CHECKS
- Owners of NEW items to accept: 04 (drill_procedure_codes, production_only, presets tomorrow/next_7_days/rest_of_month, patient_has, payment_adjustment_codes, insurance_plan_selection, provider_attribution, show_refund_legs, show_note_status), 03 (composite attributions, carrier_from_current_coverage, referral_counters_unreliable, remittance_id, operatory_label, system codes selectable in report pickers, rpt_visit_audit provider set), 02 (report_by key and compare-fee default in 3.11)

### my_reports

Audit: 17 findings (0 blockers, 7 majors), 0 mapping concerns; revised: True; checks: PARITY VALID category=my_reports reports=5 controls=48 from_vendor_documentation=0 dynamic_rules=1 help_text=1 not_applicable=0 replicated=21 replicated_enhanced=24 superseded=0 unknown_legacy=2 / CATALOG VALID category=my_reports doc=my_reports.md reports=5 work_items=15 lines=1038

**Reports** (report_key | legacy name | phase | size | availability)

- my_reports.daily_journal | Daily Journal | P1 | M | READY (the user on history: REPAIR(10))
- my_reports.time_clock_report | Time Clock Report | P1 | M | READY
- my_reports.missing_progress_notes | Missing Progress Notes | P1 | S | READY (exact note-to-appointment link: SCHEMA(18))
- my_reports.appointment_detail_by_user | Appointment Detail by User | P1 | L | APP (creating user and created date for app-era appointments only)
- my_reports.production_report | Production Report | P1 | M | READY (compare column DATA-51; production adjustments on history REPAIR(12); duration units on history REPAIR(10))

**Open questions**

- Daily Journal: values of the REPORT BY dropdown other than User; does Provider exist (live tool, RPT-MY-04)
- Daily Journal: adopt UR-5 (a self_always user restriction satisfies financial_practice for the caller's own summary blocks)? (08 section 4.3)
- Daily Journal: printed band header and footer labels under the Created Date basis (live tool)
- Daily Journal: how the ortho contract '- Patient' / '- Pri Ins.' split is stored and posted (contract-billing fixture, live tool)
- Daily Journal: exact PATIENT TYPE rule, tag only or also an active ortho contract (live tool; 03 decision O-3)
- Daily Journal: should a rpt_legacy_logins.user_id mapping be built so that the caller's migrated entries appear? (product owner, 03 DATA-10)
- Time Clock: adopt an own-row payroll_wage exemption so callers see their own Hourly Rate / Over time Rate as in the legacy Detail? (08 section 5.1)
- Time Clock: when is Group By Office enabled, and how are hours and overtime split by office (live tool)
- Time Clock: does the legacy tool limit the date span? The 366-day cap is new (live tool, product owner)
- Missing Progress Notes: how does the legacy tool restrict the PROVIDER picker, and can an unlinked user (assistant) run it with ALL? P1 blocker (live tool)
- Missing Progress Notes: does PROVIDER filter the appointment provider or the preferred provider (live tool)
- Missing Progress Notes: printed columns, title, totals; meaning of ALL; exclusion of cancelled and missed appointments (live tool)
- Appointment Detail by User: User band versus Provider band, and does 'by User' mean the creator (live tool)
- Appointment Detail by User: which phone numbers are printed and where, and the date labels under the Created On Date basis (live tool)
- Production Report: Fee Schedule enabling, default rule and tooltip; Category layout; PD-11 exempt picker versus self_always (live tool; 08 open decision 13)

### ledger_reports

Audit: 24 findings (0 blockers, 11 majors), 0 mapping concerns; revised: True; checks: PARITY VALID category=ledger_reports reports=4 controls=44 from_vendor_documentation=9 dynamic_rules=3 help_text=0 not_applicable=0 replicated=26 replicated_enhanced=12 superseded=6 unknown_legacy=0 / CATALOG VALID category=ledger_reports doc=ledger_reports.md reports=4 work_items=19 lines=918

**Reports** (report_key | legacy name | phase | size | availability)

- ledger.ledger_report | Ledger Report | P1 | M | READY (statement rows APP; Bill depth REPAIR(12) on migrated charges, derived until DATA-33; note/EOB indicators NEW, blank for migrated rows)
- ledger.walkout_report | Walkout Report | P1 | L | READY (contract balances APP, read from stored plan values in P1 with a warning, DATA-37 in P2)
- ledger.super_bill | Super Bill | P1 | M | READY
- ledger.account_allocation | Account Allocation | P1 | M | READY (derived account-wide oldest-first until DATA-26; the legacy patient-then-provider rule is not reproduced)

**Open questions**

- F-4 (08 owner): should a caller without financial_patient get the documents without amounts (current default), or should the run be refused (needs NEW required_data_classes[])?
- F-8 (08 owner): should payment_instrument be granted with the ledger family, or Check # exempted on one-account documents, for front-desk users at check-out?
- F-6 (08 owner): who may see the billing provider tax id on the Super Bill (class security_users)?
- F-3 / L-2 / W-2 / S-2 / A-2 (live tool): does any ledger report restrict lines or credits to the working office, and how does the Walkout explain activity at other offices?
- F-7 (live tool): with the same name in both boxes, does the run print every family whose sort name equals or starts with it?
- L-3 (live tool): exactly what does Print all transactions add (statements, notes, claim lines), and where do note rows sort?
- L-5 (live tool): printed title, columns and closing summary of the Ledger Report; does it start with a Previous Balance line; is the Patient Ledger balance the patient's or the account's; how do the note and EOB indicators print?
- W-1 (live tool): column set with only one option ticked, and which column holds the Previous Balance amount when the balance is positive and when it is a credit.
- W-4 (live tool): default text of the six walkout message boxes, and the rule that picks the aged message.
- W-5 (live tool): wording and target patient of the add-note option; does the appointment right-click entry print the whole account's day or only the appointment's patient?
- W-7 (live tool): is the next appointment the one after the run date or after date_to; is it for account members or the patient only; what is the source of Reason?
- S-6 (live tool): basis (DOS or transaction date) and office scope of the legacy Super Bill Previous Balance.
- S-7 (live tool): where does a contract-billing line (ACBIL / ACBILO) print on the Super Bill, and in which total?
- A-1 / A-3 (live tool): the whole Account Allocation printed layout, which date the range filters, and how post-dated credits are handled.
- A-6 (03 section 2.13 owner): should rpt_fifo_core follow the legacy order, patient payments per patient then provider and adjustments to their own patient, provider and location?

### statements_reports

Audit: 17 findings (0 blockers, 4 majors), 0 mapping concerns; revised: True; checks: PARITY VALID category=statements_reports reports=1 controls=33 from_vendor_documentation=7 dynamic_rules=1 help_text=6 not_applicable=0 replicated=21 replicated_enhanced=1 superseded=2 unknown_legacy=3 / CATALOG VALID category=statements_reports doc=statements.md reports=1 work_items=23 lines=513

**Reports** (report_key | legacy name | phase | size | availability)

- statements.statement_run | Statements | P1 | XL | SCHEMA(22); Exclude Responsible Party Type SCHEMA(53); open-claim exclusion READY for app-era claims (warning open_claim_quality_unknown for migrated); contract balances DATA-37 (P2, per-patient service before)

**Open questions**

- Default rule of Statement Date (previous day, today, stored date) and the info-icon tooltip text (live tool)
- Values of the days. dropdown, and whether 'within last n days' counts from the statement date or from today (live tool)
- PAPER STATEMENT SENT: what it does and what enables it (04 open decision 15; live tool, product owner)
- Real columns, title and totals of the PRINT STATEMENT REPORT list, which is INFERRED here (live tool sample)
- Meaning of Include Credit Balances, Suppress Aging (including whether contract balances are removed), Hide Insurance Shares and Hide Credit Card Section (live tool)
- Account Balance Over and Amount Due: account total or estimated patient portion (live tool, one insurance account)
- Which ageing drives the message bucket, and what Comments : contains (vendor sample, live tool)
- Whether an open claim includes created-not-sent claims and pending pre-auths; whether 'the Patient' means any member or only the guarantor patient (live tool)
- Why the six message boxes were not rendered in the capture; one counter per box or a shared one (live tool)
- FINANCE CHARGES dialog: control types, defaults, posting formula, and whether Provider filters or stamps (live tool)
- Does the legacy export hold each responsible party's Last Statement Date (RPT-STMT-05 cut-over; migration data)
- Which claim events print, and how an unallocated credit appears in the ageing grid (vendor sample)
- Contents of the SEARCH and Exclude Responsible Party Type SELECT dialogs; the legacy meaning of 'allocation issues'; whether an account whose patients are all inactive and that has a balance gets a statement (live tool)
- The per-patient Print Reports > Statement path and its options (live tool)
- Meaning of account_settings.statement_close_out_individual; 04 section 9.7 should declare role query for the Statements messages (product owner, 03 / 04)

### management_reports

Audit: 25 findings (0 blockers, 10 majors), 0 mapping concerns; revised: True; checks: PARITY VALID category=management_reports reports=4 controls=32 from_vendor_documentation=1 dynamic_rules=1 help_text=0 not_applicable=0 replicated=13 replicated_enhanced=17 superseded=1 unknown_legacy=1 / CATALOG VALID category=management_reports doc=management_reports.md reports=4 work_items=13 lines=806

**Reports** (report_key | legacy name | phase | size | availability)

- management.payment_plan_charges | Payment Plan Charges | P2 | M | APP (DATA-37)
- management.uncollected_copay | Uncollected Copay | P2 | M | READY (assumes P1 DATA-16, DATA-20, DATA-27 shipped before P2)
- management.audit_trail | Audit Trail | P2 | L | APP (close_out SCHEMA(29); reschedule / cut_copy_paste SCHEMA(17); charge before/after and Pat/Ins amounts SCHEMA(14))
- management.time_clock_report | Time Clock Report | P2 | M | READY

**Open questions**

- r01: printed columns, sections and totals of Payment Plan Charges (no sample exists) - live tool, Regular and Ortho with all three boxes
- r01: does Billing Date mean 'due on' or 'due as of' (backlog included), and are instalments already posted listed?
- r01: what enables the three Ortho boxes, and what does an empty group print with PLAN TYPE = Ortho?
- r01: does the insurance side print the carrier, and where does it come from?
- r01: should contracts flagged by checks #33 / #34 be hidden or only warned about (proposal: warn) - product owner
- r02: full Detail column list and order; layout of Summary
- r02: which appointments count as 'on the schedule' (cancelled / missed)?
- r02: is the threshold applied to the account's patient balance or to the patient's own balance, and is the balance as of the appointment day or the run time for a past range?
- r02: on a multi-day range, one row per patient-day or one per patient?
- r03: exact values and order of the Audit Type and Module Type dropdowns; does Audit Type depend on Module Type; does legacy ALL include status changes and re-activations?
- r03: default of the Account / Patient radios, office coverage of the dialog, and are events of former account members included?
- r03: do Original Amt / Updated Pat Amt hold the patient amount or the ledger amount for a payment edit?
- r04: does the legacy OFFICE/GROUP filter act on the punch or on the user's office assignment (confirms the user_offices predicate for NULL-office punches)?
- r04: when is Group By Office enabled, how are hours and overtime split by office, and what are the Summary / Employee Total Only columns (wages printed?)
- Family: default grant of user_activity to office-manager groups that also post transactions (08 R-15) - product owner

### montly_reports

Audit: 34 findings (1 blockers, 11 majors), 10 mapping concerns; revised: True; checks: PARITY VALID category=montly_reports reports=9 controls=108 from_vendor_documentation=2 dynamic_rules=4 help_text=0 not_applicable=0 replicated=67 replicated_enhanced=37 superseded=4 unknown_legacy=0 / CATALOG VALID category=montly_reports doc=monthly_reports.md reports=9 work_items=36 lines=1944

**Reports** (report_key | legacy name | phase | size | availability)

- monthly.executive_summary | Executive Summary | P2 | L | READY
- monthly.executive_day_sheet | Executive Day Sheet | P2 | M | READY (one row per code on history: REPAIR(12))
- monthly.aging_report_by_home_office | Aging Report by Home Office | P2 | L | READY (resp. party type SCHEMA(53), balance status SCHEMA(35), last statement date SCHEMA(22), past report date SCHEMA(30))
- monthly.aging_report | Aging Report | P2 | M | READY (same option ratings as the home-office report; ties to per-office ledger balance R-14b)
- monthly.income_allocation | Income Allocation | P2 | L | READY on derived allocations (real allocations SCHEMA(26); entry-date basis on history REPAIR(10); is_income on history REPAIR(12))
- monthly.allocation_detail | Allocation Detail | P2 | M | READY on derived allocations (payment-type sections on history REPAIR(12), tender fallback flagged tender_assumed)
- monthly.unallocated_payment_adjustments | Unallocated Payment/Adjustments | P2 | M | SCHEMA(26) (status beta until DATA-26; not reproducible for migrated history)
- monthly.daily_journal_summary_by_allocation | Daily Journal Summary by Allocation | P2 | M | READY on derived allocations (layout INFERRED)
- monthly.waterfall_report | WaterFall Report | P2 | M | READY on derived allocations (layout INFERRED)

**Open questions**

- Executive Summary: unit of Total Chair Hours on the live tool (sample behaves like minutes); default legacy_minutes until confirmed
- Executive Summary: which provider column limits each line; are collections limited by the ledger-leg provider or by allocation; is hygienist production credited to the treating provider or the recorded hygienist (PD-7 exceptions)
- Executive Summary Show AR: where unallocated credits print (inside a bucket or only in Total A/R), and the as-of date of the A/R row on a multi-day range
- Executive Summary / Day Sheet: is a consolidated all-offices block appended on multi-office runs
- Ageing reports: how the threshold and bucket boxes treat credit accounts when Include Credit Balance is ticked (proposal: debit accounts only)
- Ageing reports: Over 120+ default state and tooltip, whether it exists on Aging Report, and the bucket boundary day (0-29 versus 0-30)
- Ageing reports: Patient AR meaning (patient's own home office) and whether PATIENT TYPE / Provider filter items or whole accounts
- Ageing reports: Summary and GROUP BY PROVIDER layouts; is Summary available with PRINT FORMAT = Excel; Ort Cont. Bal. patient-only or patient + insurance
- Executive Day Sheet: grand-total row, row order and the legacy Excel layout
- Income Allocation: which columns the Unallocated row prints and its office; reading of Prev Alloc (-)
- Income Allocation: how a TRANSFER - Payment From / To pair moves provider Income and the Unallocated row (proposed rule [I])
- Allocation Detail: are credit adjustments listed; where insurance payments print; content of Show Datewise Summary; which codes map to internal_financing
- Unallocated Payment/Adjustments: meaning of Exclude Credit Balances, patient versus account test of Include Inactive Patients, whether opening-balance and transfer credits are listed
- Daily Journal Summary by Allocation: entire layout; allocated payments dated by transaction date or allocation date; production credits and transfer/opening credits by entry or allocation
- WaterFall: matrix orientation and column window; what the row amount is (production or charges, label); whether write-offs count under Adjustments only

### insurance_reports

Audit: 51 findings (0 blockers, 17 majors), 11 mapping concerns; revised: True; checks: PARITY VALID category=insurance_reports reports=13 controls=130 from_vendor_documentation=0 dynamic_rules=3 help_text=0 not_applicable=0 replicated=59 replicated_enhanced=66 superseded=4 unknown_legacy=1 / CATALOG VALID category=insurance_reports doc=insurance_reports.md reports=13 work_items=44 lines=2672

**Reports** (report_key | legacy name | phase | size | availability)

- insurance.claims_list | Claims List | P2 | M | APP (created date not loaded for migrated claims); REPAIR(10), REPAIR(32), SCHEMA(21) for options
- insurance.capitation_utilization | Capitation Utilization | P2 | L | REPAIR(32); SCHEMA(33) payer on the charge
- insurance.claims_created_not_sent | Claims Created Not Sent | P2 | S | APP; REPAIR(32) statuses
- insurance.procedures_on_hold | Procedures on Hold | P2 | S | READY
- insurance.dps_eligibility_report | DPS Eligibility Report | P2 | M | READY (current stamp); SCHEMA(34) for history, verify type and On Hold
- insurance.capitation_payment | Capitation Payment | P2 | M | SCHEMA(38); APP afterwards
- insurance.benefits_used_unused | Benefits Used/Unused | P2 | L | REPAIR(32); SCHEMA(53) Exclude Responsible Party Type; Recall mode needs derived rpt_recall_due() (P3 under DATA-41, requested for P2 by RPT-INS-47; known P2 parity gap until it ships)
- insurance.outstanding_claims | Outstanding Claims | P2 | L | REPAIR(32); REPAIR(10) estimates; SCHEMA(31) for a past Report Date
- insurance.claims_not_created | Claims Not Created | P2 | M | APP (derived bill tier until SCHEMA(33)); REPAIR(10), REPAIR(12) history; SCHEMA(13) DOS vs Transaction date
- insurance.unbilled_report_due_to_no_insurance | Unbilled Report Due to No Insurance | P2 | S | READY (stored billing orders); SCHEMA(33) for app rows; migrated blank orders flagged
- insurance.eob_835_claims_reconcile_report | EOB 835 Claims Reconcile Report | P2 | M | SCHEMA(38); data only with a clearinghouse ERA integration
- insurance.835_denial_report | 835 Denial Report | P2 | L | SCHEMA(38); SCHEMA(31) claim-level denial fields
- insurance.rte_sweep_details | RTE Sweep Details | P2 | S | SCHEMA(34); data only with a real-time eligibility integration

**Open questions**

- Claims List: does the default run list unsent (legacy Q) claims, and which statuses does Include Resolved Claims add (denied by default)? (FLT-23)
- Capitation Utilization: what Office Default prints and which cells Include Fees Charged switches (Co - Pay / Sup. Fee., a charged-fee column, or Office Default)? Default: compare fee with Include UCR, else 0.00.
- Capitation Utilization: which plan identifier the Plan ID band prints, and the Fee Schedule To Compare list content and default (CP-40 suggests copay schedules only).
- Product (02/06/08): accept moving ENG-49, the DASH-28 follow-up store and SEC-36 to P2 so that CREATE TASK ships in P2?
- Product (03): ship the derived rpt_recall_due() without the recall engine in P2, so the Benefits Used/Unused Recall mode is not a P2 parity gap?
- Product (03): accept the NEW columns this spec depends on: rpt_office_dim address/phone/tax_id, rpt_fee_schedule_assignments, max_remaining_with_posted, bill_tier_source = migrated_blank, era_claim_payments.posted_payment_entry_id, and the data card 2.20 bucket-rule amendment.
- Benefits Used/Unused: capture the Recall screen state (controls, types, defaults of Recall Date / Max Over / Recall Codes). Does Ind Max Rem net only posted, unclaimed estimates of the benefit year?
- Outstanding Claims: do the buckets carry Est. Ins or the remaining estimate on partially paid claims? What is the age basis (sent date or DOS)? Do the bucket boxes filter claims at all?
- Outstanding Claims: does a past Report Date reconstruct history or only shift the ageing?
- DPS Eligibility Report: whole layout (INFERRED). Does Both mean AND or OR? What does Include patients with no insurance mean (and are medical-only patients uninsured)? How are requests matched to slots?
- 835 Denial Report: does EXCLUDE REASON CODE drop whole lines or only adjustment rows? Is CLMChargeSubmitted the claim-level or the line charge? Is the Carrier ID the payer id or the vendor carrier id? Is the cap a calendar month or 31 days?
- EOB 835: what does Show Details UCR add? Is CLAIM STATUS the status left by this posting or the current status? What does the CARRIER dialog contain, and how are 835 payers mapped to carriers?
- Unbilled Report Due to No Insurance: are lines with a blank billing order listed, or only lines explicitly set to None? Is the insurance-now population rule right?
- Claims Not Created: do the CLAIM TYPE boxes choose coverage levels, and does the DOS / Transaction radio choose the compared column (both transcription / inference)?
- RTE Sweep Details: whole layout (INFERRED); how a payer-rejected inquiry is shown (Unknown, its own status, or omitted).

### treatmentplan_reports

Audit: 25 findings (0 blockers, 4 majors), 0 mapping concerns; revised: True; checks: PARITY VALID category=treatmentplan_reports reports=4 controls=50 from_vendor_documentation=0 dynamic_rules=0 help_text=0 not_applicable=0 replicated=20 replicated_enhanced=27 superseded=2 unknown_legacy=1 / CATALOG VALID category=treatmentplan_reports doc=treatment_plan_reports.md reports=4 work_items=14 lines=888

**Reports** (report_key | legacy name | phase | size | availability)

- treatment_plan.treatment_plan_proposal | Treatment Plan Proposal | P3 | L | APP (benefits grid family columns are stored snapshots; individual remainders need DATA-32, P2)
- treatment_plan.treatment_plan_status | Treatment Plan Status | P3 | M | APP (Sts of never-booked scheduled/completed items inferred A*; status as of a date SCHEMA(25))
- treatment_plan.treatment_plan_analysis | Treatment Plan Analysis | P3 | M | APP
- treatment_plan.treatment_plan_detail | Treatment Plan Detail | P3 | S | APP

**Open questions**

- Is the legacy Tx Plan ID a per-patient number in batch reports, and what does Include internal plan id print? (live r02, two patients with two plans)
- Does the diagnosed-date range select items or whole patients/plans? (live, patient with items on two dates)
- Does Treatment Plan Proposal print inactive patients? (live)
- Does a legacy item flagged Internal / External Referral match Referred Out (R), and which Sts letter does it print? (live, Diagnosed item flagged External Referral)
- Footer echo labels for CODES and TX COUNSELOR (Codes, Tx Counselor are NEW) (live r02)
- r01: content of the hidden third OTHER OPTIONS row (Print Account Name / Good Faith Estimate / X-Rays) (live)
- r01: effect of Itemize Prices unticked and which item statuses the batch prints by default (live)
- r01: ORDER ID meaning, Resp. Party address when unticked, Prop. Dt = diagnosed date? (live)
- r01: printed UCR = higher of office UCR and fee-schedule fee, or stored office UCR? (live, item with insurance fee above UCR)
- r01: one document or one per office for a patient whose items span offices, and which letterhead (live, office group)
- r01: which DentC letter_type holds Financial Disclosure letters, shared with payment-plan contracts? (product owner with 04)
- r02: Summary format layout and whether a grand total prints (live)
- r02: do Accepted (A) and Alternative (L) appear in the exclusion dialog (scroll to top)? (live)
- r03: row set (zero rows, Alternative / Referred Out / Pre-Auth Closed), Amount basis, and the five legacy ratio explanation lines (live)
- r04: does an empty CODES box mean all codes or must a code be picked, and the actual output layout? (live)

### ortho_reports

Audit: 12 findings (0 blockers, 3 majors), 0 mapping concerns; revised: True; checks: PARITY VALID category=ortho_reports reports=5 controls=36 from_vendor_documentation=0 dynamic_rules=0 help_text=0 not_applicable=0 replicated=8 replicated_enhanced=28 superseded=0 unknown_legacy=0 / CATALOG VALID category=ortho_reports doc=ortho_reports.md reports=5 work_items=15 lines=839

**Reports** (report_key | legacy name | phase | size | availability)

- ortho.ortho_compliance_report | Ortho Compliance Report | P3 | M | APP for the contract list; SCHEMA(42) for the 'active' population (contract_status) and visit-based weeks
- ortho.ortho_daily_journal | Ortho Daily Journal | P3 | M | SCHEMA(42) (interim: ortho-code charges without card fields)
- ortho.patients_by_ortho_status_with_time_in_treatment | Patients by Ortho Status with Time in Treatment | P3 | S | SCHEMA(42)
- ortho.ortho_report | Ortho Report | P3 | S | SCHEMA(42)
- ortho.missing_ortho_visits | Missing Ortho Visits | P3 | M | SCHEMA(42)

**Open questions**

- F1 Ortho status value list (seeds ortho_statuses); whether r03 groups by status
- F2 Printed titles, column order, grouping and totals of all five reports (no image exists)
- F3 Whether a sixth 'Ortho revenue report' exists in some builds
- F4 Content of the SELECT dialogs (inactive rows, short id or name)
- F5 Ortho Start Date = banding date, treatment start or plan setup date (03 vs 04 disagree)
- F6 Product: whether finished (debonded/retention) contracts belong on r03; the include_finished_contracts default true depends on it
- r01: which last visit counts, >= or >, same-day appointment as 'future', and whether a future appointment excludes the patient regardless of weeks
- r01: whether contracts without any visit are listed; which provider PROVIDER filters (contract provider assumed)
- r02: whether PROVIDER filters the visit Doctor or the contract provider; whether Procedures lists only the visit's codes or all ortho codes that day
- r03: whether blank is the true default of the four date boxes; rounding of Time in Treatment
- r04: how the two ranges combine, and the legacy meaning of 'visit but not started'; whether Next Appt is any or only an ortho appointment
- r05: how the MISSING ticks select rows (OR assumed); whether 'ledger transaction' means any ledger line or only the ortho visit code
- r05: which appointments are tested (cancelled, no-show, future, non-ortho appointments); whether VISIT DOCTOR filters only rows with a visit
- r05: whether 'ortho patient' is the patient flag or an active contract

### recall_reports

Audit: 18 findings (0 blockers, 6 majors), 0 mapping concerns; revised: True; checks: PARITY VALID category=recall_reports reports=4 controls=48 from_vendor_documentation=0 dynamic_rules=2 help_text=0 not_applicable=0 replicated=19 replicated_enhanced=29 superseded=0 unknown_legacy=0 / CATALOG VALID category=recall_reports doc=recall_reports.md reports=4 work_items=17 lines=817

**Reports** (report_key | legacy name | phase | size | availability)

- recall.procedural_recall_report | Procedural Recall Report | P3 | M | READY (Med. Alerts needs rpt_patient_alerts, DATA-52; archive policy caveat)
- recall.scheduled_recall_report | Scheduled Recall Report | P3 | M | READY (derived; exact scheduling app-era, migrated bookings via interim rule until RPT-RECALL-09; maintained rows SCHEMA(41))
- recall.recall_due_report | Recall Due Report | P3 | L | READY (derived; interval units unverified #22; migrated bookings via interim rule until RPT-RECALL-09; maintained rows SCHEMA(41))
- recall.post_op_report | Post-Op Report | P3 | S | READY (empty until offices flag is_post_op codes; setup, not schema)

**Open questions**

- F1 Send-to-Collection exclusion on Scheduled Recall, Recall Due and Post-Op (documented for Procedural Recall only)
- F2 Office of the Office: band and the OFFICE/GROUP filter on r02/r03: patient home office (assumed) or the appointment / last-visit office
- F3 SELECT dialog contents (inactive rows, short id or name, whether the r02 code list is limited to recallable codes)
- F5 Recall interval unit vocabulary migrated from RECALLUNIT (data card section 6 #22)
- F7 08 to grant a security card 5.2 rule 3 exception for the Post-Op provider band (provider label beside financial_patient money only, no provider money total)
- F8 Can the legacy preferred provider / hygienist and the booked lines of migrated future appointments be backfilled from the source data (03); product sign-off on the interim migrated-booking rule
- 04 owner: accept the derived per-patient fallback in the preferred_provider_ids dictionary row (it currently has no fallback)
- r01 Q1/Q2 Whether code-band and grand totals print; row order inside a code band
- r02 Q1 Does the patient line list unscheduled codes too (explains the two totals)
- r02 Q3 What a past SCHEDULED DATE RANGE lists on the legacy tool
- r03 Q1 Meaning of No Recall Date, whether the dates grey out, and whether patients with no recall still list when a code list is selected
- r03 Q2 Printed totals of Recall Due (page 2 of the sample not seen)
- r03 Q7 / r02 Q2 Which phone Phone# prints
- r04 Q2/Q3 What Referral prints; whether Amount is the posted fee or UCR
- Row order of patients inside the band on r02, r03, r04 (patient_last_name assumed)

### appointment_reports

Audit: 34 findings (0 blockers, 10 majors), 9 mapping concerns; revised: True; checks: PARITY VALID category=appointment_reports reports=9 controls=93 from_vendor_documentation=2 dynamic_rules=5 help_text=0 not_applicable=0 replicated=31 replicated_enhanced=60 superseded=1 unknown_legacy=1 / CATALOG VALID category=appointment_reports doc=appointment_reports.md reports=9 work_items=36 lines=1800

**Reports** (report_key | legacy name | phase | size | availability)

- appointment.appointment_list | Appointment List | P3 | L | READY (default confirmation_call_list); call_list, cancelled_from_automated_campaigns, cancellation_reason_codes SCHEMA(17); include_off_call_list SCHEMA(NEW appointments.call_list_removed_at); exclude_resp_party_type_codes SCHEMA(53)
- appointment.missed_appointments_not_marked_as_missed | Missed Appointments Not Marked As Missed | P3 | S | READY; exclude_resp_party_type_codes SCHEMA(53)
- appointment.new_patients_via_appointments | New Patients via Appointments | P3 | S | SCHEMA(44) (interim placeholder rule)
- appointment.lab_report | Lab Report | P3 | M | READY; exclude_resp_party_type_codes SCHEMA(53)
- appointment.smartassist_report_card | SmartAssist Report Card | P3 | M | READY; consent columns SCHEMA(54); Checked In By / Out By SCHEMA(17); consent, medical-history, eligibility checks APP
- appointment.appointments_confirmed_via_vendors | Appointments Confirmed Via Vendors | P3 | M | SCHEMA(17)
- appointment.appointment_time_stamps | Appointment Time Stamps | P3 | M | SCHEMA(17)
- appointment.appointment_detail | Appointment Detail | P3 | L | READY; Created On Date / User / only_appointnow_appointments APP; appoint_now_api and cancellation reason SCHEMA(17)
- appointment.lab_cost_report | Lab Cost Report | P3 | S | READY; exclude_resp_party_type_codes SCHEMA(53)

**Open questions**

- Appointment List: which criteria are enabled for call_list, pull_chart_list, cancelled_from_automated_campaigns and missed_list? With cancelled_list, are SORT BY and Include Patient Balance enabled?
- Appointment List: does Include Off Call List change anything on cancelled_list / missed_list?
- Appointment List: at which levels do the count line and the Total : Charges line print? Does a non-date SORT BY drop the date band?
- Appointment List: what are the values of APPOINTMENT TYPE > Length other than Any?
- Missed Not Marked: are today's appointments listed? (Product decision taken: only after their scheduled end.) Are checked-out appointments, or ones posted only with non-visit codes, listed?
- 03: in unresolved_past_appointments, is a completed row without a visit charge kept (status_class) or unresolved (is_kept)?
- New Patients via Appointments: accept '(no patient record)' or add NEW appointments.placeholder_name? Are cancelled placeholders listed?
- Lab Report: which REPORT TYPEs enable DUE DATE, and is APPOINTMENT DATE RANGE ignored with Due Date (parity: disabled)? Are cases on cancelled or missed appointments listed?
- SmartAssist: what is the Summary layout and the percentage denominator? Does a posted-but-not-checked-out or in_office visit appear without Include Missed?
- SmartAssist: does a credit balance pass Payment? Does a payment-only or non-visit-code posting pass Ledger Posting? Is Payment evaluated on the current balance?
- Vendors: is the date basis the appointment date or the confirmation date? What is the whole layout? Which DentC channels count as a vendor?
- Time Stamps: what is the page layout (patient / provider columns, grouping, totals)? How are negative waiting times and missing stamps printed? Are cancelled and missed appointments listed?
- Appointment Detail: what are the default and the effect of Include Patient Home Office? What does Archived mean? Does Include Cancelled unlock CANCELLATION REASON? Does PAGE BREAK BY User unlock with GROUP BY User?
- Lab Cost Report: what does REPORT TYPE All match? What does Exclude Lab Received drop? Are cancelled-appointment cases and archived cases listed?
- Product owner: should the Appointment List campaign format keep its created-date outer band, and should the interim campaign-cancel predicate (two reason strings) be used until DATA-17?

### refferal_reports

Audit: 35 findings (0 blockers, 9 majors), 11 mapping concerns; revised: True; checks: PARITY VALID category=refferal_reports reports=8 controls=91 from_vendor_documentation=0 dynamic_rules=2 help_text=0 not_applicable=0 replicated=38 replicated_enhanced=52 superseded=0 unknown_legacy=1 / CATALOG VALID category=refferal_reports doc=referral_reports.md reports=8 work_items=33 lines=1613

**Reports** (report_key | legacy name | phase | size | availability)

- referral.referral_production_list | Referral Production List | P3 | M | READY (app patients: SCHEMA(40); first-visit filter: REPAIR(19))
- referral.referred_out_list | Referred Out List | P3 | S | APP (structured target and specialty: SCHEMA(40))
- referral.referral_source_list | Referral Source List | P3 | S | READY (default run); REFERRAL TYPE filter, Referral Type column and Both: SCHEMA(NEW source_type_code / three-valued direction, extension of DATA-40)
- referral.external_outgoing_referral_management | External Outgoing Referral Management | P3 | M | SCHEMA(40)
- referral.referral_summary_report | Referral Summary Report | P3 | M | READY for Production / Collection; #Ref, Referral # columns and Avg Production: REPAIR(19) or SCHEMA(40) (patients.referral_date)
- referral.referral_count_summary | Referral Count Summary | P3 | S | READY (as Referral Production List)
- referral.internal_referral_management | Internal Referral Management | P3 | M | SCHEMA(40) (internal_referral plan items exist as APP without a case or Tx Status)
- referral.external_incoming_referral_management | External Incoming Referral Management | P3 | M | SCHEMA(40)

**Open questions**

- Do r01 / r05 / r06 accept several offices or an office group (vendor: limited to the office the report is run in)? - live legacy tool
- Is a payment applied in an office outside the selected set to a charge inside it counted as Collection (we count by allocation office)? - live legacy run, two offices
- Product: show_grand_total default false (legacy prints none), or approve a grand total as a default deviation? - product owner
- Product: Avg Production when #Ref = 0 - empty (default) or legacy (prints production)? - product owner
- Product: Pat ID / Patient ID for migrated patients - DentC id or Denticon legacy id (needs NEW rpt_patient_dim.legacy_patient_id)? - product owner with 03
- Which columns do the zip-layout Total for Zip code and Total for Referral subtotals print? - live legacy PDF
- What counts as 'seen' on Referral Count Summary: a visit-code day (default now), any posted procedure, or a kept appointment? - live legacy run
- #Ref meaning and the anchor of MTD / YTD / Last Year (date_to or run date; calendar year or 12 months) - live legacy run
- REFERRED TO/BY option labels and order; do Referred By / Referred To include Both sources? - live legacy tool
- Did the migration fold Both sources into Referred By, and does the legacy export carry source Type and Referred by/To for the back-fill? - legacy referral-source export, 03
- Is Expired stored by a job or computed, and only for Pending cases (r04 and r08)? - live legacy tool, a case older than 30 days
- CONTACT STATUSES: latest entry or any entry; does a case without an entry count as No Response? - live legacy tool
- GROUP BY options and legacy default on Internal Referral Management, and what follows the third STATUSES row on External Outgoing - live legacy tool, scroll the criteria panel
- Printed columns, grouping, totals and footer echo labels of the three case reports and of Referral Summary - live legacy runs, PDF and Excel
- Do the case reports also require Utilities - Referral Management Full Control? - live legacy tool with a View Only group

### patients_list_reports

Audit: 35 findings (2 blockers, 12 majors), 13 mapping concerns; revised: True; checks: PARITY VALID category=patients_list_reports reports=12 controls=90 from_vendor_documentation=5 dynamic_rules=4 help_text=0 not_applicable=0 replicated=33 replicated_enhanced=53 superseded=1 unknown_legacy=3 / CATALOG VALID category=patients_list_reports doc=patient_lists.md reports=12 work_items=36 lines=2335

**Reports** (report_key | legacy name | phase | size | availability)

- lists.update_patient_insurance_conversion_list_by_appointment | Update Patient Insurance (Conversion) List - By Appointment | P3 | S | READY
- lists.patient_list | Patient List | P3 | M | READY (provider criterion on history: derived last-visit provider, NEW role attached)
- lists.patient_list_new_patient | Patient List - New Patient | P3 | L | SCHEMA(44) default mode appointment; other modes APP with default new_patient_definition = created_date, READY on REPAIR(19) with first_visit_date; referral on app patients SCHEMA(40)
- lists.patients_seen | Patients Seen | P3 | M | READY (Transaction Date = DOS Date until SCHEMA(13))
- lists.patients_notes | Patient's Notes | P3 | S | READY for Responsible Party / Financial Notes (migrated account notes undated); APP for Patient Notes / Chart Notes
- lists.patient_list_grouped_by | Patient List - Grouped By | P3 | L | APP for default mode attached_to_provider; other modes READY (Last Visit REPAIR(19), coverage tiers REPAIR(32))
- lists.patients_on_payment_plan | Patients on Payment Plan | P3 | M | APP (no contract migrated)
- lists.online_registered_patients | Online Registered Patients | P3 | S | APP (registration source on patient SCHEMA(44))
- lists.responsible_party_list | Responsible Party List | P3 | L | REPAIR(10) default mode created_date; balance modes READY; resp. party type SCHEMA(53)
- lists.responsible_party_sent_to_collection | Responsible Party - Sent to Collection | P3 | S | READY (date sent SCHEMA(35))
- lists.responsible_party_statements_sent | Responsible Party - Statements Sent | P3 | S | APP (no statement migrated)
- lists.responsible_party_email_statement_error_report | Responsible Party - Email Statement Error Report | P3 | S | SCHEMA(22) (delivery_error, delivery_attempted_at)

**Open questions**

- Patient's Notes: does a legacy export of Patient Notes / Chart Notes exist (none migrated)? Does RESPNOTES.txt carry a note date and an author?
- Patient's Notes: does the legacy report print the account financial-notes field, and with which date? Whole account or only the patient's notes? Are struck-off notes printed?
- 08 owner: adopt the Chart Notes row-class rule (note text phi_identified, Chart Notes rows dropped with a notice) so front desk / treatment coordinators without clinical keep the run
- 08 owner: adopt the contract-list exception to rule 3 (preferred-provider band aggregate) or grant provider_comp to lists_patient holders
- Patients on Payment Plan: is PREFERRED PROVIDER the patient's preferred or the contract provider, and is the sample's 'Provider :' band the same provider? Count line = contracts or distinct patients?
- New Patient: how does 'Created Date / First Visit Date' choose the qualifying date, and which date do the Carrier / Referral / Referral Type modes filter (decides APP vs READY)?
- Grouped By mode Last Visit: legacy defaults of LAST VISIT DATE RANGE (interim today/today), provider_basis and the no-last-visit box; does Treating Provider switch the picker's role?
- Grouped By: how Attached to Provider differs from Preferred Provider, and what SPECIALTY applies to; criteria panels of the 11 uncaptured modes
- Responsible Party List: today's Balance Aged Over X Days panel (titles, labels, defaults 1.00/999999.99 and 30/60/90/120, created range kept?); population of mode Balance (non-zero, positive, credits)
- SEND STATEMENT STATUS default (interim yes) and the days-selector default; aged threshold > or >= days
- Statements Sent: are downloaded (portal) statements counted under Paper? Are generated-but-not-marked statements listed? Why are Email / Both greyed?
- Email Statement Error Report: is Statement Sent Date the send-attempt date or the statement date? Are asynchronous bounces included (default now excludes bounced)?
- 03 owner: confirm whether rpt_account_dim.account_no equals the Denticon RPID or whether legacy_key must be printed; correct coverage rows 75b/75d/75e and 77
- Patients Seen: REPORT BY values, legacy grand total (distinct vs sum), provider role, age-band edges / top band / age reference date
- Plan coordinator: confirm index ids (r01 = Update Patient Insurance ... r12) as the only ids used in briefs, findings and drills (open question 12)

### providers_list_reports

Audit: 16 findings (0 blockers, 4 majors), 0 mapping concerns; revised: True; checks: PARITY VALID category=providers_list_reports reports=4 controls=19 from_vendor_documentation=0 dynamic_rules=1 help_text=0 not_applicable=0 replicated=4 replicated_enhanced=15 superseded=0 unknown_legacy=0 / CATALOG VALID category=providers_list_reports doc=provider_lists.md reports=4 work_items=18 lines=763

**Reports** (report_key | legacy name | phase | size | availability)

- lists.provider_list | Provider List | P3 | S | READY (specialty/state sparse)
- lists.provider_holidays | Provider Holidays | P3 | S | READY (empty until holidays configured)
- lists.provider_operatory | Provider Operatory | P3 | S | READY
- lists.provider_registration | Provider Registration | P3 | M | READY (licence state/expiry, DEA expiry SCHEMA(45))

**Open questions**

- Do the four lists print inactive providers (provider_status default)
- Row order of each list (last name, first name, short id, provider id)
- Which office assignment OFFICE/GROUP reads: Works At offices, home office or both
- Is the PROVIDER picker list all providers or the office roster; inactive providers in it
- Is the Excel output a flat table or the PDF layout in cells
- Product / 08: are provider address, phone and e-mail class aggregate and not security_users
- Provider List: printed columns and order; does Provider ID print and is it the legacy sequential id
- Provider List: SPECIALTY value list/source; STATE reads address or licence state
- Provider Holidays: range = intersecting occurrences or created date; recurring expanded or printed once
- Provider Holidays: are office/enterprise holidays included; are legacy provider holidays per office
- Provider Operatory: provider->operatories or operatory->providers; are inactive operatories and providers without ops printed (operatory_status default)
- Product: adopt many-to-many provider-operatory assignment instead of the two DentC links
- Provider Registration: what the report prints at all (registration numbers vs enrolment), carrier ids, CS#/DPS/Ref ID/tax id type/licence state
- Product / 08: mask tax_id when it is an SSN; is license sensitive
- Product: store legacy holiday recurrence patterns and open-exception hours (RPT-PRLIST-14)

### security_list_reports

Audit: 16 findings (0 blockers, 0 majors), 0 mapping concerns; revised: True; checks: PARITY VALID category=security_list_reports reports=4 controls=11 from_vendor_documentation=0 dynamic_rules=1 help_text=0 not_applicable=0 replicated=4 replicated_enhanced=7 superseded=0 unknown_legacy=0 / CATALOG VALID category=security_list_reports doc=security_lists.md reports=4 work_items=16 lines=726

**Reports** (report_key | legacy name | phase | size | availability)

- lists.user_list | User List | P3 | S | READY (source tables; default output needs RPT-SLIST-03 dimension columns)
- lists.group_list | Group List | P3 | S | READY
- lists.group_rights_list | Group Rights List | P3 | M | READY
- lists.user_group_membership | User-Group Membership | P3 | M | READY

**Open questions**

- Family OQ1: where did REPORT FORMAT Detail/Summary of User List and Group Rights List go between the 2023 build and the 2026 capture, and can the old username-only Summary still be reached?
- Family OQ2: does a picked inactive user (USER / Group picker) print when Include Inactive Users is unticked?
- Family OQ3: what is the row order of each list?
- Family OQ4: are the vendor's own support users and groups listed?
- Family OQ5: is the Excel output a flat table or the PDF layout in cells?
- Family OQ6 (product owner): keep organisation-wide security groups, or add user_groups.office_id to match the legacy per-office groups?
- r01: what are the printed columns and their order in 2026? Is Primary Security Group printed (would need user_group_memberships.is_primary)? Is Group Membership still printed?
- r01: does the USER picker list inactive users?
- r02: printed columns (member count, description)? Is a group printed once per office or once per name? Are 'Offices: ALL' and the Office column printed? Should the constant Office column be kept (product owner)?
- r03: does the 2026 print still match the 2016 Office / Group / Rights portrait layout, are rights printed by label only, and in which order?
- r04 OQ1/OQ5: Detail and Summary layouts, the printed title ((Summary) suffix) and the footer criteria echo.
- r04 OQ2: does LOCATION filter on the office the security group is defined in, or on the user's office assignment?
- r04 OQ3: how are users without any office assignment treated? This decides whether the include_unassigned_users default stays true.
- r04 OQ4: does the Group picker list office-qualified group names?
- 08 open decision 4: does REPORT_FULL_ACCESS_ROLES include 'owner'? This affects is_full_access_role on r01 and r04.

### setup_list_reports

Audit: 30 findings (2 blockers, 12 majors), 8 mapping concerns; revised: True; checks: PARITY VALID category=setup_list_reports reports=20 controls=67 from_vendor_documentation=0 dynamic_rules=2 help_text=0 not_applicable=0 replicated=20 replicated_enhanced=43 superseded=0 unknown_legacy=4 / CATALOG VALID category=setup_list_reports doc=setup_lists.md reports=20 work_items=47 lines=2643

**Reports** (report_key | legacy name | phase | size | availability)

- lists.employer_list | Employer List | P3 | S | READY
- lists.insurance_plan_list | Insurance Plan List | P3 | M | READY (default run); Created By / creator USER role SCHEMA(1) until NEW insurance_plans.created_by_user_id (RPT-STLIST-41)
- lists.carrier_list | Carrier List | P3 | S | READY
- lists.inactive_plans_list | Inactive Plans List | P3 | S | READY
- lists.drug_list | Drug List | P3 | S | READY (user NULL on migrated drugs)
- lists.procedure_codes_list | Procedure Codes List | P3 | S | READY (PRODUCTION TYPE / Bill to Insurance DATA-04 columns empty until filled; per-tenant settings via NEW tenant_procedure_codes)
- lists.explosion_codes_list | Explosion Codes List | P3 | S | READY
- lists.procedure_codes_by_fee_schedule | Procedure Codes by Fee Schedule | P3 | M | READY (code type by DATA-04 default rule)
- lists.credit_codes_report | Credit Codes Report | P3 | S | READY (CLASS values to confirm, O-2)
- lists.fee_schedule_list | Fee Schedule List | P3 | S | READY (schedule_header_date_missing: ED falls back to latest entry date)
- lists.capitation_fee_schedule | Capitation Fee Schedule | P3 | S | READY
- lists.office_list | Office List | P3 | S | READY
- lists.office_holidays | Office Holidays | P3 | S | READY (empty until configured)
- lists.operatory_list | Operatory List | P3 | S | READY
- lists.ada_categories_list | ADA Categories List | P3 | S | READY
- lists.default_ins_plan_coverage_category_list | Default Ins Plan Coverage Category List | P3 | S | READY (key, %, description; Frequency from constant); Age Limitation, Waiting Period SCHEMA(2) (RPT-STLIST-56)
- lists.document_types_list | Document Types List | P3 | S | READY
- lists.notes_macro_category_list | Notes Macro Category List | P3 | S | READY
- lists.notes_macros_list | Notes Macros List | P3 | S | READY
- lists.patient_types_list | Patient Types List | P3 | S | READY (definitions group PATTYPE; flash alert / block charges on migrated rows unconfirmed, REPAIR if not migrated)

**Open questions**

- 08: class the setup employer catalog aggregate + allow (otherwise Employer List shows only neutral 'Employer' labels)
- 03: per-tenant procedure-code settings (NEW tenant_procedure_codes) or one catalog per tenant - drives STATUS, PRODUCTION TYPE, Bill to Insurance on r06/r08
- Live tool r02: what enables the greyed Start/End Date boxes, and does the default run (Modified On, today) filter at all
- Live tool r02: does unticking Include User in Filters grey the USER picker or only drop its predicate; USER relation creator/modifier/either
- Live tool r04: does an inactive patient slot or a subscriber-only reference count as use
- Live tool r08: preselected FEE SCHEDULE and default/order of EFFECTIVE DATE (unknown_legacy); are codes without an entry printed
- Live tool r10: does the legacy ED suffix show the latest or the earliest entry date; catalogue vs fees printout
- 04 / 03: rule replacing the no-op fee-schedule office scope (fee_schedule_assignments, office default/UCR pointers, or none) - RPT-STLIST-20
- 04: NEW insurance_plan_ids parameter for lists.patient_list_grouped_by and insurance.claims_list (r02/r04 drills pending)
- Live tool r11: printed columns and labels (Co - Pay / Sup. Fee.), one dropdown entry per version; product: which schedule the band drill passes to Capitation Utilization
- Live tool r09: TYPE and CLASS option lists (unknown_legacy) and whether CLASS narrows by TYPE
- 03: do migrated PATTYPE definitions carry flash alert / block charges values (else REPAIR, DATA-45 extension)
- 03 / product: per-tenant storage for default coverage frequency, age, waiting period, ded. waived (RPT-STLIST-56)
- Live tool r05: does Drug List print the prescription note
- Live tool family: are inactive rows printed (catalog_status default both), row order, Excel flat vs layout, multi-day holiday on one line

