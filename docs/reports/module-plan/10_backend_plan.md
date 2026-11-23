# 10 — Backend implementation plan

Work breakdown of the Reports & Analytics module for `dentc-backend`, phase by phase. The design documents decide
**what** is built (`00_design_brief.md` and `02`..`09`, `catalog/*`); this plan decides **order, grouping, milestones,
checks and risks**. Every work-item id is taken from the register (`work_items.json`, generated); phases and sizes are
the register's. Where the design looks wrong or incomplete, the point is listed in section 9 and the plan keeps the
register's phase.

Conventions: sizes S, M, L, XL as the register (S up to 2 days, M up to 1 week, L up to 2 weeks, XL more); engineer-days
use the register's rough weights S = 2, M = 5, L = 10, XL = 20 (an order of magnitude, not an estimate). "BE" = this
repository (`<workspace>/dentc-backend`, read-only for this plan), "FE" = `dentc-frontend` and
`11_frontend_plan.md`. `[V]` facts were read in code or in the analysis files, `[I]` is inference.

---

## 1. Scope, assumptions and the shape of the backend work

### 1.1 What the backend owns

The backend owns every DATA, ENG, MET, SEC and RPT item and the backend parts of FLT and DASH: 755 of the 825 register
items. The 70 others are UX items and the purely frontend FLT / DASH components; they are listed per phase in the
appendix (section 10) so that the two plans meet, and are scheduled by `11_frontend_plan.md`.

| Area | P0 | P1 | P2 | P3 | P4 | P5 | Backend total | Frontend-only items of the area |
|---|---|---|---|---|---|---|---|---|
| DASH |  | 6 | 8 | 16 | 7 | 5 | 42 | DASH-02, DASH-03, DASH-06..DASH-08, DASH-11, DASH-19, DASH-20, DASH-30, DASH-37, DASH-44, DASH-49, DASH-54 |
| DATA | 12 | 20 | 13 | 9 | 3 |  | 57 | - |
| ENG | 24 | 19 | 12 | 2 | 3 | 3 | 63 | - |
| FLT | 10 | 5 | 2 | 2 | 1 |  | 20 | FLT-10..FLT-15, FLT-19, FLT-21 |
| MET | 4 | 5 | 4 | 8 | 4 | 2 | 27 | - |
| RPT-APPT |  |  |  | 36 |  |  | 36 | - |
| RPT-DAILY |  | 46 | 4 | 3 | 2 |  | 55 | - |
| RPT-INS |  |  | 37 | 7 |  |  | 44 | - |
| RPT-LEDGER |  | 16 | 3 |  |  |  | 19 | - |
| RPT-MENU | 1 | 2 | 3 | 7 | 1 | 1 | 15 | - |
| RPT-MGMT |  |  | 13 |  |  |  | 13 | - |
| RPT-MONTHLY |  |  | 34 | 2 |  |  | 36 | - |
| RPT-MY |  | 15 |  |  |  |  | 15 | - |
| RPT-NEW |  | 2 | 21 | 18 | 8 |  | 49 | - |
| RPT-ORTHO |  |  |  | 15 |  |  | 15 | - |
| RPT-PLIST |  |  |  | 36 |  |  | 36 | - |
| RPT-PRLIST |  |  |  | 17 | 1 |  | 18 | - |
| RPT-RECALL |  |  |  | 17 |  |  | 17 | - |
| RPT-REF |  |  |  | 29 | 4 |  | 33 | - |
| RPT-SLIST |  |  |  | 16 |  |  | 16 | - |
| RPT-STLIST |  |  |  | 47 |  |  | 47 | - |
| RPT-STMT |  | 19 | 3 | 1 |  |  | 23 | - |
| RPT-TX |  |  |  | 13 | 1 |  | 14 | - |
| SEC | 16 | 13 | 10 | 2 | 2 | 2 | 45 | - |

Mixed items (a backend contract plus a frontend part, scheduled here because the backend part comes first): FLT-04,
FLT-05 (shared test vectors), FLT-25, FLT-28, DASH-05, DASH-21, DASH-31, DASH-36, DASH-38, DASH-39, DASH-40, DASH-43,
DASH-51, DASH-52, RPT-MENU-02, RPT-MENU-05, RPT-MENU-12, RPT-MENU-13. Report items that are frontend-led but carry a
backend hook (definition field, context token or endpoint) stay in their report family epic and are marked "FE-led"
there: RPT-DAILY-76, RPT-LEDGER-03, RPT-LEDGER-14, RPT-MY-03, RPT-MGMT-02, RPT-MGMT-15, RPT-STMT-01, RPT-MENU-09.

### 1.2 Effort and staffing assumption

| Phase | Backend items | S | M | L | XL | Engineer-days (register weights) | Weeks with 6 backend engineers | Weeks with 10 backend engineers | Bound by (6 / 10) | Frontend items (11_frontend_plan.md) |
|---|---|---|---|---|---|---|---|---|---|---|
| P0 | 67 | 15 | 39 | 13 | 0 | 355 | 20 | 16 | T6+T7 / critical path | 22 |
| P1 | 168 | 73 | 72 | 23 | 0 | 736 | 39 | 24 | T4, T5 / T4 | 26 |
| P2 | 167 | 52 | 83 | 30 | 2 | 859 | 46 | 27 | T4 / T4 | 7 |
| P3 | 303 | 162 | 110 | 31 | 0 | 1184 | 60 | 36 | T4 / T4 | 8 |
| P4 | 37 | 6 | 20 | 10 | 1 | 232 | 13 | 13 | critical path / critical path | 4 |
| P5 | 13 | 1 | 9 | 3 | 0 | 77 | 9 | 9 | critical path / critical path | 3 |
| **Total** | **755** | | | | | **3443** | **187** | **125** | | 70 |

Staffing assumption used for every duration in this plan: a backend engineer delivers **3.5 register-days per week**
(5 days x 0.7 focus, after reviews, support and per-client operations). Engineers are **not interchangeable inside a
phase**: each is assigned to one track (or splits time between two tracks, shown as 0.5) for the whole phase, and is
re-assigned only at a phase boundary. Duration of a phase = **max over tracks of (track engineer-days / (engineers on
the track x 3.5))**, and never less than the phase's critical path / 3.5. Track days come from the appendix (section 10).
No calendar date is implied.

| Phase | Team of 6: engineers per track (weeks) | Team of 10: engineers per track (weeks) |
|---|---|---|
| P0 | T1 1.5 (15.6), T2+T3 2 (17.1), T4 0.5 (14.3), T5 0.5 (14.3), T6+T7 1.5 (19.6) | T1 2 (11.7), T2+T3 3 (11.4), T4 1 (7.1), T5 1 (7.1), T6+T7 3 (9.8); critical path 15.7 |
| P1 | T1 1 (32.9), T2+T3 1 (28.0), T4 3 (38.7), T5 0.5 (38.9), T6+T7 0.5 (28.0) | T1 1.5 (21.9), T2+T3 1.5 (18.7), T4 5 (23.2), T5 1 (19.4), T6+T7 1 (14.0) |
| P2 | T1 1 (34.9), T2+T3+T6+T7 1 (32.6), T4 3.5 (45.4), T5 0.5 (38.3) | T1 1.5 (23.2), T2+T3+T6+T7 1.5 (21.7), T4 6 (26.5), T5 1 (19.1) |
| P3 | T1+T2+T6 0.5 (52.6), T4 4.5 (59.0), T5 1 (46.3) | T1+T2+T6 1 (26.3), T4 7.5 (35.4), T5 1.5 (30.9) |
| P4 | T1+T3 1.5 (10.9), T4 2.5 (10.6), T5 2 (11.7); critical path 12.9 | T1+T3 3, T4 4, T5 3 (all below 8); critical path 12.9 |
| P5 | T2 3 (3.3), T5 3 (4.0); critical path 8.6 | as the team of 6; the other four engineers take release support and per-client rollout |

Re-assignment this implies: from P1 the engine engineers of P0 move to report definitions (T4), which holds 58 % of all
backend effort (2,010 of 3,443 engineer-days); with a fixed role mix (2 engine, 1 data, 1 security / platform, 2 report
definitions, no metrics engineer) T4 alone would need about 287 weeks. T5 has at least half an engineer in every phase
of both teams. Critical paths (longest chain of the register's `depends_on` inside each phase; "cross-team" includes
frontend items) bound the phase from below whatever the team size:

| Phase | Longest in-phase dependency chain | Chain engineer-days |
|---|---|---|
| P0 | ENG-03 (M) → ENG-06 (M) → ENG-10 (L) → ENG-12 (L) → ENG-57 (M) → ENG-14 (M) → ENG-58 (M) → SEC-08 (M) → SEC-12 (M) | 55 |
| P1 | ENG-22 (M) → ENG-23 (L) → ENG-25 (L) → RPT-DAILY-02 (M) → RPT-DAILY-79 (L) → RPT-DAILY-81 (S) | 42 |
| P2 | DATA-26 (XL) → DATA-27 (L) → DATA-30 (L) → MET-10 (L) → RPT-MONTHLY-10 (L) → RPT-MONTHLY-11 (M) | 65 |
| P3 (cross-team) | ENG-49 (M) → SEC-36 (S) → DASH-28 (L) → DASH-30 (L, frontend) → DASH-33 (L) → DASH-21 (L) | 47 |
| P4 | ENG-50 (L) → ENG-51 (M) → MET-23 (L) → DASH-38 (L) → DASH-39 (L) | 45 |
| P5 | ENG-55 (M) → SEC-41 (L) → DASH-46 (L) → DASH-48 (M) | 30 |

P3 holds 303 backend items (34 % of all backend effort); it is planned as three report waves plus a worklist stream
(section P3), as `plan_inputs/facts.md` suggests.

### 1.3 One service and one database per client organisation

Deployment is Cloud Run, one API service and one PostgreSQL database per client organisation, on a shared Cloud SQL
instance and a shared Memorystore [V] `analysis/be_platform.md` §8. The CI workflow
(`.github/workflows/deploy-cloud-run.yml`) migrates and deploys only the main client; every other client database is
migrated by hand from the onboarding runbook [V]. That shapes the backend work as follows.

| Consequence | Rule of this plan | Items |
|---|---|---|
| Every Alembic revision runs N times, mostly by hand | Deploy revisions are additive and nullable only, idempotent, and never contain a back-fill or a large index build. **Operations steps** (index builds, back-fills, repairs, NOT NULL tightening) are never Alembic revisions: they are idempotent scripts `scripts/ops/<ops_id>.py` [NEW], run per client from the runbook ahead of the release that needs them, because the CI step runs one linear `alembic upgrade head` inside the main client's deploy [V] `deploy-cloud-run.yml` L90 and `alembic/env.py` wraps every revision in `begin_transaction()` [V]. A release that needs an operations step lists it in `scripts/ops/required.json` [NEW]; the preflight `scripts/ops/assert_applied.py` [NEW] (catalog check: `pg_index.indisvalid`, `pg_constraint.convalidated`, `attnotnull`) runs in the deploy workflow before `alembic upgrade head` and fails the deploy when a step is missing. A per-client **change ledger** (client registry row: ops id or revision id, run date, check result) is kept from the first P0 release | DATA-01, DATA-08, ENG-17, ENG-46 |
| Repair state differs per database and cannot be read from the repository | The readiness checker writes `rpt_data_quality` per database; financial reports, metric availability and basis availability read it; nothing is "done" until each client's checks are recorded | DATA-02, DATA-10, DATA-11, DATA-57, MET-06 |
| Reference data is per database | Rights catalog revision 2 is an Alembic data revision (SEC-01); default grants are a per-tenant script (SEC-02); the transaction-code seed (DATA-03) and the code-group seed (MET-03) run per database and are re-runnable | SEC-01, SEC-02, DATA-03, MET-03 |
| Infrastructure is per client | P0: Cloud Scheduler job `rpt-<c>-tick` and Cloud Run Job `dentc-report-job[-<c>]` (ENG-58), created by hand from a P0 runbook entry that is part of ENG-58's acceptance (job, scheduler, service account, one observed drain) until the script exists (gap G-17). P2: worker service `dentc-report-worker[-<c>]`, three Cloud Tasks queues, invoker service account, bucket `rd-<c>-reports`, all from `scripts/provision_reporting.sh` [NEW] (ENG-46). Deploy order per client: worker, job, API | ENG-58, ENG-39, ENG-46 |
| Flags are per client | Every phase gate is a `Settings` flag in `deploy/clients/<client>.env.yaml` [NEW]; that directory does not exist yet (08 RC-5) and today's environment push is `scripts/push_env_to_cloud_run.sh` reading `.env` [V]. P0 step (under ENG-01 and SEC-12): create `deploy/clients/*.env.yaml` from the client registry, extend `push_env_to_cloud_run.sh` to take a client file, run `scripts/check_client_configs.py` [NEW] (RC-5) in the deploy workflow (gap G-18). A client is switched on only after its own data checks and rights readiness (section 7) | ENG-01, SEC-12 |
| Shared Redis | `REDIS_NAMESPACE` reaches every client before the engine publishes anything; report caches carry the client namespace | ENG-56, SEC-45 |
| Shared database instance | Worst case 34 reporting connections per client (02 §16.4); the connection share is reviewed whenever a client is enabled, and background lane caps are per client | ENG-37, ENG-47 |
| A second tenant can exist in a client database | Open signup is closed (SEC-11) and the tenant predicate is added on tenant-less generic routes (SEC-42) before any report ships; every `report_*` lookup filters `tenant_id` | SEC-11, SEC-42, DATA-15, DATA-46 |
| New clients are restored from a schema dump | The dump is refreshed after every index or view release; the PostgreSQL test tier is built the same way (baseline dump `tests/pg/baseline_schema.sql` [NEW] + the operations steps of `required.json` + `alembic upgrade head`) | ENG-17, DATA-08 |

Rollout order for every phase: (1) the shared UAT database and the UAT service, (2) the main client (CI-automated),
(3) each further client in its own window, in the order of the client registry. A phase is "done" for the product when
it has passed its exit criteria on the main client; it is "done" for a client when that client's checks are recorded.

### 1.4 Assumptions

| # | Assumption | If wrong |
|---|---|---|
| A-1 | Product defaults PD-1..PD-15 of the brief hold until the product owner decides otherwise | The affected items are re-planned; section 8 lists the decisions per phase |
| A-2 | Cloud Tasks push to a private Cloud Run worker with OIDC works as 02 assumes (ENG-21 spike started on day 1, written findings by the end of week 2; a provisional transport decision BD-10 is recorded at the P0 mid-point so that the claim / heartbeat columns of `report_runs` (ENG-12) fit both Cloud Tasks and `db_poll`) | `db_poll` drain job (ENG-63) becomes the transport; P2 effort unchanged, latency up to a minute |
| A-3 | The client database user may run `CREATE EXTENSION btree_gist` (needed by the exclusion constraint of DATA-03) and create views, functions and, in P4, triggers | An instance administrator runs the extension step per client before the DATA-03 revision; see risk BR-3 |
| A-4 | The Denticon export is still available for the `LEDGER` re-read (DATA-12, DATA-50, DATA-57) and offices can still print Denticon control totals (R-21), open decision O-8 of 03 | DATA-57 ends in a written waiver; financial reports on migrated periods carry the completeness caveat |
| A-5 | Index and back-fill timing uses a **Cloud SQL clone** of the main client database in the same project and region, reachable only by named operators, never copied to laptops or CI, deleted after the timing session, its use recorded in the change ledger (gap G-19). The read-only checks of 03 §6 run on the client databases themselves; performance budgets use the synthetic `golden_large` (02 §15.2), not PHI | Index builds and back-fills are timed on the first client instead, off-hours |
| A-6 | The existing suite (94 test modules in 96 files, about 1,335 test functions at the time of writing [V]) is not a deploy gate until it is green in CI; `tests/reports/**` and the lint are a gate from P0 (02 §15.1) | — |

---

## 2. Workstreams

| Track | Scope | Skills | Areas that feed it | Items P0 / P1 / P2 / P3 / P4 / P5 | Engineer-days |
|---|---|---|---|---|---|
| T1 Data foundation | `rpt_*` views, table functions, roll-ups, schema additions, repairs, back-fills, reconciliation invariants | PostgreSQL 15 SQL (window functions, `GROUPING SETS`, exclusion constraints, `CONCURRENTLY`), Alembic, dental ledger and A/R semantics, Denticon export, batch scripts | DATA | 12 / 20 / 13 / 9 / 3 / 0 | 419 |
| T2 Engine core | Definition schema and registry, parameter pipeline and type handlers, option sources, executor, banding, drill, pivot, saved views, live paging, actions, builder | Python 3.12, FastAPI, SQLAlchemy 2 Core, Pydantic v2, expression evaluation, query compilation | ENG (definition and executor items), FLT backend items | 18 / 8 / 2 / 5 / 0 / 6 | 188 |
| T3 Runs, exports, schedules | Run lifecycle, snapshots, artifacts, PDF / XLSX / CSV, background path, schedules, delivery, cache, alerts | State machines and fencing, ReportLab, XlsxWriter, GCS, Cloud Tasks, `croniter`, e-mail transports | ENG (run, render, schedule items), FLT-18, SEC-25, SEC-39, DASH-41, DASH-42 | 5 / 10 / 10 / 0 / 4 / 0 | 169 |
| T4 Report definitions | Every legacy and new report definition, its builders, layouts, golden cases, parity tests and live verification | Python + SQL on the engine API, legacy report reading, dental front-office and billing domain, test design | RPT-*, ENG-20, FLT-20, FLT-22, FLT-23, FLT-28 | 4 / 102 / 118 / 264 / 17 / 0 | 2010 |
| T5 Metrics and dashboard API | Metric registry, metric service, dashboard API, metric packs, dashboard and worklist definitions, goals, roll-up sources, assistant | Metric semantics (05), SQL compilation, caching and single flight, worklist service integration | MET, ENG-32, ENG-33, ENG-35, ENG-50, ENG-51, ENG-55, FLT-26, DASH backend parts | 4 / 14 / 12 / 24 / 13 / 7 | 446 |
| T6 Security and audit | Rights catalog, principal and `authorize()`, office / provider / user rules, data classes, audit store and manifests, export controls, existing defects | Authorisation design, HIPAA audit and disclosure rules, PostgreSQL triggers, security testing | SEC, ENG-14, ENG-16 | 18 / 13 / 9 / 1 / 0 / 0 | 168 |
| T7 Platform and operations | Configuration and flags, dependencies, CI test tier and contracts, Cloud spike, Redis namespace, worker role, provisioning, performance, observability | Cloud Run services and jobs, Cloud Scheduler, IAM / OIDC, GitHub Actions, Docker, load measurement | ENG-01, ENG-02, ENG-17, ENG-19, ENG-21, ENG-37, ENG-39, ENG-46, ENG-47, ENG-56 | 6 / 1 / 3 / 0 / 0 / 0 | 43 |

Track interfaces that need one named owner on each side:

| Interface | Producer track | Consumer tracks | Contract |
|---|---|---|---|
| Dataset declarations | T1 (`app/reporting/sql/`, `rpt_metadata` tables) | T2, T4, T5 | ENG-09 binding contract; the lint compares declared columns with `information_schema` (ENG-18) |
| Parameter types and option sources | T2 (FLT handlers) | T4, FE | Definition JSON (`ReportDefinitionRead`), definition fixtures for the FE (ENG-19) |
| Rights, scope, classes | T6 | T2, T4, T5 | `authorize()`, `report_scope.allowed_offices()`, class lint (SEC-04, SEC-05, SEC-07) |
| Snapshot and artifact | T3 | T4, T5, FE | `report_run_rows`, `ReportResultPage`, `ReportArtifactRead` |
| Metric registry | T5 | T4 (`reconciles_with`), dashboards, assistant | `metric_key`, `MetricQueryRequest` |
| Generated client | T7 (OpenAPI snapshot) | FE | `scripts/export_openapi`, frontend `npm run api:sync` |

Backend items that wait on a frontend item (hand-off milestones agreed with `11_frontend_plan.md`):

| Frontend item (phase) | Backend items waiting on it | Effect |
|---|---|---|
| DASH-30 worklist screens (P3, L) | DASH-32, DASH-33, DASH-34, DASH-35, DASH-36, RPT-ORTHO-11; through DASH-33 also DASH-21 | On the P3 cross-team critical path (47 days) |
| DASH-11 chart tiles (P2, M) | DASH-12, DASH-22, RPT-PLIST-15 and the other chart-bearing dashboard and report items | Must land early in P2; P3 items need it at phase start |
| DASH-44 customisation v2 (P4, L) | DASH-51 (P5) | P5 builder content waits for the P4 frontend item |

---

## 3. The walking skeleton

### 3.1 The slice

**Report:** `daily.production_report` — the old frontend `production` report (first of the six of ENG-20, redirect
`production` → `daily.production_report` in 07 §2.2) and the worked example of 02 §3.11. **Cut:** format `summary`,
`report_by = code`, parameters `office_ids` (office scope), `date_from` / `date_to` (date range with presets), one enum;
source `rpt_charges` only. **Path:** catalog → definition JSON → validate → inline run → snapshot → screen page →
CSV artifact → PDF artifact → download, with the run audited and the office rule enforced.

The PDF step is the one gap of the slice: the banded renderer ENG-23 is P1. The skeleton renders its PDF through the
existing kit `app/services/pdf_report.py` (office-wide table, `show_patient=False`, landscape;
[V] `be_platform.md` §0, finding 10) behind the artifact request of ENG-15; the adapter is thrown away when ENG-23 lands (section 9, G-04).

Paths marked [NEW] do not exist in the backend repository today.

| Step | Work item (thin part taken in the skeleton) | Done check of the thin part (share of the register size) | Deferred to the full item |
|---|---|---|---|
| 1 | ENG-01: package `app/reports/` [NEW], router `app/api/v1/report_engine.py` [NEW] mounted always, `REPORTS_ENGINE_ENABLED` gate (404 `reports_engine_disabled`), `SERVICE_ROLE=api` | Catalog route answers 404 with the flag off, 200 with it on (about 40 %) | Fail-closed start-up checks beyond storage |
| 2 | ENG-02: `XlsxWriter`, `croniter`, `google-cloud-tasks`, `openpyxl` in `requirements.txt`; `fastapi` pinned; `Content-Disposition` exposed; `GUNICORN_TIMEOUT` in `Dockerfile` | Image builds; header visible from the FE origin (100 %) | — (whole item) |
| 3 | ENG-17: `postgres:15` in `docker-compose.yml`, `tests/pg/baseline_schema.sql` [NEW] restored into a template, `alembic upgrade head`, CI job before the migration step | CI fails on a deliberately failing PostgreSQL test (about 60 %) | Fault-injection harness |
| 4 | DATA-01: `app/reporting/sql/` [NEW] package and the Alembic view helper | One view = one SQL file + one revision; downgrade removes it (100 %) | — |
| 5 | DATA-02 (thin): table `rpt_data_quality` only | Row written by a hand-run check (about 20 %) | Checker for #1-#39, other tables |
| 6 | DATA-04 (thin): nullable `procedure_codes.is_production`, `code_type` | Columns exist; `rpt_charges` reads them through `coalesce` (about 20 %) | Other flags, code groups, `rpt_code_in_group()` |
| 7 | DATA-05 (thin): `rpt_dates`, `rpt_office_dim`, `rpt_provider_dim`, `rpt_procedure_code_dim` | One row per entity on `golden_small` (about 40 %) | Patient, account and user dimensions, list columns |
| 8 | DATA-06 (thin): `rpt_charges` with the sign and void rules of 03 for the charge leg; production flag read from `rpt_procedure_code_dim.is_production` = `coalesce(pc.is_production, pc.category <> 'Account')` (03 §2.5), so the thin view already has the final shape | R-01 for the charge leg on the tier (about 25 %) | Other legs, `rpt_ledger_entries` |
| 9 | ENG-03, ENG-04, FLT-01 (three types), FLT-04 (date presets), ENG-06 (pipeline for those types) | `daily.production_report` validates; expression vectors green in pytest (about 30 % each) | The other 14 types, tokens, forced values |
| 10 | SEC-01 (codes of the `daily` family only), SEC-03, SEC-05 (`report_scope.allowed_offices()`), ENG-07, SEC-04 (single `authorize()`) | Restricted user refused with 403 `office_not_assigned`; zero-assignment hatch ignored (about 30 %) | Full catalog revision, grants, provider restriction |
| 11 | ENG-05: `GET /reports/catalog`, `GET /reports/definitions/{report_key}`, `POST .../validate` | `criteria_echo[]` returned (about 60 %) | Options route |
| 12 | ENG-08, ENG-09, ENG-10, ENG-11: read-only REPEATABLE READ session, scoped handle on `rpt_charges`, executor, group-by-code subtotals and grand total | Golden case of step 15 passes (about 30 %) | Pivot, row caps beyond the default |
| 13 | ENG-12, ENG-13: `report_runs` (with nullable claim / heartbeat columns for both transports), inline run `POST /reports/runs`, snapshot inline mode, `GET /reports/runs/{run_id}/rows` | Run row reaches `succeeded`; rows page from the snapshot (about 30 %) | Admission limits, de-duplication, table mode |
| 14 | ENG-57, ENG-14: `report_artifacts`, documents bucket fallback, `report_audit_outbox` event in the state transaction | Every run writes one outbox row (about 40 %) | Manifests upload, drain (ENG-58, SEC-08) |
| 15 | ENG-15: CSV with the injection guard, `POST /reports/runs/{run_id}/artifacts`, proxy download; golden case `tests/reports/golden/daily.production_report/summary_by_code.json` [NEW], **provisional** until DATA-04 is complete (re-baselined then) | CSV totals equal screen totals (about 80 %) | — |
| 16 | Throwaway PDF adapter over `pdf_report.py` (no work item; removed by ENG-23) | PDF totals equal screen totals | Replaced by ENG-23 in P1 |
| 17 | ENG-18 first rules: (a) the **phase map** `app/reports/legacy_index/phase_map.json` [NEW], generated from 09 §2 (`report_key` → parity phase) as the first lint input, so the coverage rule exempts the 117 reports not yet registered until their parity phase; (b) **interim mode**: a definition whose parity phase is later than the current release carries `phase` = its parity phase and `interim = true`; control-mapping and default rules are checked against the parity file only from that phase on (gap G-15). Sync of the parity files by `scripts/sync_legacy_index.py` [NEW], owned by ENG-18. ENG-19: OpenAPI snapshot and the definition fixture | Removing a `legacy_control_ids` entry from a non-interim fixture definition fails the lint; an interim definition passes (about 30 %) | All other lint rules |
| 18 | ENG-20 (first of six): the old `production` report runs on the engine with totals over the full population, as an interim definition (parity in P1) | Old id redirects; totals over the full population (about 20 %) | Five other reports |

Entry criteria of the skeleton: BD-01 and BD-03 recorded (the plan's defaults accepted at least provisionally); the
timing environment of A-5 approved; the UAT database reachable; three backend engineers and one frontend engineer named.

What the skeleton proves: the definition JSON serialises and the generated client builds from the OpenAPI snapshot; the
parity lint can fail the build; an `rpt_*` view is deployed by Alembic and validated on the PostgreSQL tier; the
engine's own office rule refuses an unassigned office (403 `office_not_assigned`) and ignores the zero-assignment hatch;
one read-only transaction yields one snapshot that the screen page, the CSV and the PDF all print with the same totals
(invariants R1, R4, R9 of 02 §15.3); every run writes its audit event in the state transaction; the flag hides the
module on every client where it is off. It also produces the first measured numbers: statement time of the production
query with and without the first DATA-08 index, and pool behaviour of the report session.

### 3.2 Day-by-day: the first three weeks

Staffing assumption for the skeleton: three backend engineers — **A** engine (T2 / T3), **B** data (T1, then artifacts
and lint), **C** security / platform (T6 / T7) — plus one frontend engineer on the runner against the definition fixture
(`11_frontend_plan.md`). The skeleton takes 15 working days; every row respects the register's `depends_on`.

| Day | A (engine) | B (data) | C (security / platform) | Demo / check at end of day |
|---|---|---|---|---|
| 1 | ENG-03 dataclasses | DATA-01 SQL package, Alembic helper; DATA-02 thin (`rpt_data_quality`) | ENG-01 package, router, flag gate; ENG-21 spike started | `GET /reports/catalog` answers 404 `reports_engine_disabled` with the flag off |
| 2 | ENG-03 `ReportDefinitionRead` for one definition | DATA-04 thin (nullable `is_production`, `code_type`) | ENG-02 dependencies, Dockerfile timeout; ENG-17 `postgres:15` service, baseline dump restore | Baseline dump restored, then `alembic upgrade head` creates the DATA-02 table and the DATA-04 columns on the tier |
| 3 | ENG-04 evaluator and shared vectors | DATA-05 thin: four dimension views | ENG-17 template database, CI job before the migration step | CI red on a deliberately failing PostgreSQL test |
| 4 | FLT-01 three types | DATA-06 thin: `rpt_charges` | SEC-01 codes of the `daily` family; SEC-05 `allowed_offices()` | `rpt_charges` deployed on the tier through the helper |
| 5 | FLT-04 date presets | `golden_small` seed subset: 2 tenants, 3 offices in 2 zones, charges both eras | SEC-03 rights registry; ENG-07 caller profile | Restricted-user fixture refused for an unassigned office |
| 6 | ENG-06 pipeline for the three types | Provisional hand-computed totals `summary_by_code.json` | SEC-04 single `authorize()` | — |
| 7 | ENG-05 catalog, definition, validate | First DATA-08 index (`ix_patient_procedures_office_dos`) as `scripts/ops/` step on the timing clone (A-5); size and duration recorded | ENG-19 OpenAPI snapshot | Definition JSON of `daily.production_report` served; validate returns `criteria_echo[]` |
| 8 | ENG-08 report session, ENG-09 scoped handle | R-01 for the charge leg on the tier | ENG-19 definition fixture handed to the FE | — |
| 9 | ENG-10 executor for the summary format | ENG-18: phase map generated from 09 §2; `scripts/sync_legacy_index.py` | ENG-17 nightly migration smoke | — |
| 10 | ENG-12 `report_runs`, state machine (inline), inline run endpoint | ENG-18: coverage and control-mapping rules, interim mode | ENG-21 written findings (end of week 2) | `POST /reports/runs` returns the first page |
| 11 | ENG-11 group-by-code subtotals and grand total | Golden case wired into `tests/reports/` | Office rule and `authorize()` wired into the run endpoint | Golden case passes; removing a `legacy_control_ids` entry from the non-interim lint fixture fails the lint |
| 12 | ENG-13 inline snapshot, rows paging | ENG-57 artifact table, documents-bucket fallback | Throwaway PDF adapter | Rows page from the snapshot |
| 13 | ENG-20 thin: `production` redirect, full-population totals | ENG-15 CSV, artifact request, proxy download | ENG-14 outbox event in the state transaction (after ENG-57) | Each run writes one outbox row; CSV and PDF totals equal the screen totals |
| 14 | Integration on the UAT service with the flag on for UAT only | EXPLAIN plans of the reference query before / after the index kept in the pull request | Provisional BD-10 transport decision drafted from the ENG-21 findings | End-to-end run on UAT |
| 15 | Fixes from integration | Fixes; change-ledger rows for the UAT and timing runs | Fixes | End-to-end demo; skeleton retrospective; P0 plan re-cut with measured numbers |

---

## 4. Phase plans

The six phase sections below follow one pattern: goal, entry criteria, epics, build order, database changes in apply
order, API endpoints, reports, tests, exit criteria. "Depends on epics" is computed from the register's dependencies
and means "has at least one item that depends on an item of": it can form cycles (for example E0.08 ↔ E0.09, E0.12 ↔
E0.13) and therefore does **not** order the epics; the item-level build order of each phase governs. "Later phase"
marks a register phase inversion (section 9). Check references: `#n` = check n of 03 §6, `R-nn` = invariant
of 03 §10, `Rn` = engine invariant of 02 §15.3, `I-n` = metric identity of 05.

## P0 - Foundations and correctness

### Goal and user outcome

Canonical ledger reconciled with on-screen balances, reporting indexes, server-side code catalogs, report rights and the
engine's office rule, the existing report-like endpoints secured, the engine skeleton (registry, executor, runs,
snapshots, artifacts, audit, tick) and the first three existing frontend reports moved onto the engine. **A user can**
open the new hub, run `production`, `collections` and `patient-list` on the engine with totals over the full population
(no 600-1,600-row cap) and export them as CSV and interim PDF; `appointments`, `treatment-plans` and `insurance-claims`
stay on the old runner, with its client-side CSV, XLS and PDF export, until DATA-16, DATA-21 and DATA-56 land in P1
(G-03); Excel export of the three engine reports stays reachable through the old runner until ENG-27 ships XLSX in P1
(G-16). Users see balances that include in-app insurance payments and write-offs (PD-2). An administrator can see the
rights readiness report. No legacy-parity report ships in P0.

### Entry criteria

| # | Criterion |
|---|---|
| EN0-1 | Design documents 00-09 accepted as the baseline; product owner has acknowledged the defaults PD-1..PD-15 used |
| EN0-2 | The timing clone of A-5 is approved (same project and region, named operators, deleted after use); the shared UAT database is reachable |
| EN0-3 | Cloud project access to create a scheduler job, a Cloud Run Job and service accounts for the main client and, by the runbook entry of ENG-58, for every client that enables the engine in P0 / P1 |
| EN0-4 | An accountant and the product owner are named for the class seed of the 46 codes (03 risk 7), the sign policy (#1) and the balance-change sign-off (DATA-07); the O-8 answer (Denticon export still available, office printouts of control totals obtainable) is recorded, because DATA-57 needs it while its decision item DATA-50 sits in P1 (G-21) |

### Epics

| Epic | Name | Track | Work items | Size total | Depends on epics |
|---|---|---|---|---|---|
| E0.01 | Platform base, flags, dependencies, cloud spike, Redis namespace | T7 | ENG-01, ENG-02, ENG-21, ENG-56 | 1M 3S = 11 d | - |
| E0.02 | PostgreSQL test tier, CI test job, contract snapshot | T7 | ENG-17, ENG-19 | 1L 1S = 12 d | E0.09 |
| E0.03 | Reporting SQL package, view helper, readiness state | T1 | DATA-01, DATA-02 | 2M = 10 d | - |
| E0.04 | Transaction-code catalog, code flags and groups, core dimensions | T1 | DATA-03..DATA-05 | 2L 1M = 25 d | E0.03 |
| E0.05 | Reporting indexes on money and claim tables | T1 | DATA-08 | 1M = 5 d | - |
| E0.06 | Migrated-data repairs, policy decisions, ledger completeness | T1 | DATA-10, DATA-11, DATA-57 | 2M 1S = 12 d | E0.03, E0.07 |
| E0.07 | Canonical ledger, balance unification, reconciliation suite | T1 | DATA-06, DATA-07, DATA-09 | 3L = 30 d | E0.04 |
| E0.08 | Rights catalog revision 2, principal, office and provider rules, data classes | T6 | SEC-01..SEC-07, SEC-13 | 6M 2S = 34 d | E0.09, E0.10 |
| E0.09 | Definition schema, registry endpoints, parameter pipeline, type handlers | T2 | ENG-03..ENG-06, FLT-01..FLT-05 | 7M 2S = 39 d | E0.08, E0.10 |
| E0.10 | Caller profile, report session, dataset binding, executor, banding | T2 | ENG-07..ENG-11 | 1L 3M 1S = 27 d | E0.09 |
| E0.11 | Option sources and payment / adjustment code sources | T2 | FLT-06, FLT-07 | 1L 1M = 15 d | E0.04, E0.08, E0.09 |
| E0.12 | Runs, snapshots, artifact store, CSV, tick job | T3 | ENG-12, ENG-13, ENG-15, ENG-57, ENG-58 | 1L 3M 1S = 27 d | E0.10, E0.13 |
| E0.13 | Audit outbox, append-only audit store, patient manifests | T6 | ENG-14, SEC-08, SEC-09 | 2M 1S = 12 d | E0.12 |
| E0.14 | Existing-surface defects, legacy route security, shadow rollout, security suite | T6 | ENG-16, SEC-10..SEC-12, SEC-14, SEC-42, SEC-45 | 1L 4M 2S = 34 d | E0.01, E0.02, E0.08, E0.10, E0.13 |
| E0.15 | Definition lint with the parity files | T2 | ENG-18, FLT-27 | 1L 1S = 12 d | E0.09, E0.10 |
| E0.16 | Parity tooling and live legacy verification | T4 | FLT-22, FLT-23, RPT-MENU-01 | 3M = 15 d | - |
| E0.17 | Metric registry, organisation settings, code groups, base measures | T5 | MET-01..MET-04 | 1L 3M = 25 d | E0.03, E0.04, E0.07, E0.09 |
| E0.18 | Proving ground: the six existing reports on the engine | T4 | ENG-20 | 1L = 10 d | E0.10, E0.12, E0.13 |
| **Total** | 67 backend items | | | **13L 39M 15S = 355 d** | |

Frontend-only items of the phase (`11_frontend_plan.md`): FLT-10..FLT-15, UX-01..UX-15, UX-45.

### Build order

Lanes run in parallel; "→" is a hard order inside a lane.

1. **Week 1, all lanes start:** (a) E0.01 ENG-01, ENG-02, ENG-56 and the ENG-21 spike; (b) E0.02 ENG-17; (c) E0.14
   SEC-11 and SEC-42 — the outside door and the tenant predicate are P0 entry conditions of 08 and need no engine code;
   (d) E0.03 DATA-01 → DATA-02; (e) E0.08 SEC-01. The walking skeleton (section 3) runs across lanes (a), (b), (d) and
   the engine lane.
2. **Read-only checks per database (parallel with 1):** run the **P0 check list of section 5.4** on the main client
   database (read-only) and on UAT; record the results in `rpt_data_quality` as soon as DATA-02 exists. DATA-02 writes
   a row for every check #1-#39 (its acceptance), but only the P0 list gates P0. Their outcome drives E0.06 and the
   class seed review.
3. **Data lane:** DATA-03 (needs `btree_gist`, A-3) ‖ DATA-04 ‖ DATA-05 → DATA-06 → DATA-09 → DATA-57 → DATA-07.
   DATA-10 and DATA-11 run beside DATA-03..05 (repairs and decisions; #7, #28, #29 must be clean before DATA-07).
   DATA-08 indexes run as operations steps (`scripts/ops/`, section 5.2) on the main client as soon as DATA-01 exists,
   one table per step.
4. **Engine lane (a DAG):** {ENG-03 ‖ ENG-04} → ENG-06 → ENG-10 → {ENG-11 ‖ ENG-12} → {ENG-13 ‖ ENG-57} → {ENG-14
   (after ENG-57) ‖ ENG-15 (after ENG-13, ENG-57)} → ENG-58 (after ENG-13, ENG-14) → SEC-08 → SEC-12. The longest chain
   ENG-03 → ENG-06 → ENG-10 → ENG-12 → ENG-57 → ENG-14 → ENG-58 → SEC-08 → SEC-12 is the phase's critical path (55
   engineer-days). ENG-07, ENG-08, ENG-09 run beside ENG-03..06 so that ENG-10 can start on time; ENG-05 follows ENG-03
   and ENG-07. ENG-58's acceptance includes the manual runbook entry for the tick infrastructure of each P0 / P1 client
   (job, scheduler, service account, one observed drain).
5. **Filter lane:** FLT-01, FLT-04, FLT-05 (after ENG-03, ENG-04) → FLT-03 (after SEC-05) → FLT-02 → FLT-06 → FLT-07
   (after DATA-03). FLT-22 and FLT-23 run from week 1 on the analyst side; RPT-MENU-01 follows FLT-23.
6. **Security lane:** SEC-01 → SEC-02, SEC-03 → SEC-04 → SEC-06, SEC-07; SEC-05 early (the skeleton needs it);
   SEC-08 after ENG-58; SEC-09 after SEC-08; ENG-16 + SEC-10 after ENG-07 and SEC-05; SEC-45 after ENG-56; SEC-12 after
   SEC-04 and SEC-08; SEC-13 after ENG-05; SEC-14 after ENG-17.
7. **Metrics lane:** MET-01 (after DATA-01, ENG-05) → MET-02, MET-03 (after DATA-04), MET-04 (after DATA-03, DATA-06).
8. **Lint:** ENG-18 after ENG-03 and ENG-09, with the phase map (from 09 §2) as its first input and the interim mode
   for definitions whose parity phase is later (section 3.1 step 17); FLT-27 after ENG-18; ENG-19 with ENG-05.
9. **Proving ground last:** ENG-20 after ENG-10..ENG-15, split across P0 and P1 (G-03): `production`, `collections`,
   `patient-list` in P0 on the P0 datasets, as interim definitions (parity in P1, P1 and P3); `appointments`,
   `treatment-plans`, `insurance-claims` at the start of P1 on DATA-16, DATA-56, DATA-21. Then the shadow deploy on the
   main client (section 7, step 3).

### Database changes in apply order

| # | Change | Kind | Item | Check |
|---|---|---|---|---|
| 1 | Rights catalog revision 2: restore 6 codes, add 41, deactivate 13 | Alembic data revision (deploy) | SEC-01 | 410 rows, 397 active, second run changes nothing |
| 2 | `rpt_data_quality`, `rpt_tenant_settings`, `rpt_value_map`, `rpt_legacy_logins` | Alembic revision (deploy), additive | DATA-02 | Tables exist; the P0 check list of section 5.4 recorded |
| 3 | Engine state tables of P0: `report_runs`, `report_run_rows`, `report_artifacts`, `report_patient_manifests`, `report_audit_outbox`, `report_audit_events` with the immutability triggers on events and outbox | Alembic revision (deploy), additive; model module `app/db/models/reporting.py` | ENG-12, ENG-13, ENG-57, ENG-14, SEC-08 | Two-tenant isolation test; an UPDATE on `report_audit_events` is refused |
| 4 | `CREATE EXTENSION IF NOT EXISTS btree_gist`; `transaction_codes` with `legacy_sub_type`, `legacy_class`, the validity exclusion constraint; seed of the 18 payment and 46 adjustment codes | Alembic revision (deploy) + seed (data revision or `scripts/seed_*`) | DATA-03 | #13 (every value has a row), #38 overlap query empty |
| 5 | `procedure_codes` reporting flags (`is_production`, `is_visit_code`, `is_ledger_code`, `is_ar_code`, `code_type`, `bill_to_insurance`, `production_type_id`); `providers.provider_kind`; `rpt_code_groups`, `rpt_code_group_members`, `rpt_code_in_group()` | Alembic revision (deploy), nullable | DATA-04, DATA-05 | #10, #22 |
| 6 | Code-group seed (section 4 of 05) | Seed per database | MET-03 | Groups dated; `[I]` groups signed off |
| 7 | Views and functions batch 1 through the DATA-01 helper, in dependency order: `rpt_dates`, dimensions, `rpt_transaction_code_dim`, `rpt_charges`, `rpt_payments`, `rpt_adjustments`, `rpt_remittance_lines`, `rpt_ledger_entries` (and `_all`) | View deployment revision(s), one SQL file per object under `app/reporting/sql/` | DATA-05, DATA-06 | R-01 per leg, R-13, #38 (`count(*) = count(DISTINCT entry_id)`) |
| 8 | Reporting indexes of 03 §8, one table per revision, largest first: `patient_procedures`, `patient_payments`, other money tables, claims; drop of the duplicate `idx_proc_patient_dos` | Operations steps `scripts/ops/` (`CREATE INDEX CONCURRENTLY`, autocommit connection, section 5.2), off-hours, per client, listed in `required.json` | DATA-08 | `pg_index.indisvalid` true; the five reference `EXPLAIN (ANALYZE, BUFFERS)` plans use them |
| 9 | Repair batch 1: `backfill_ledger_source_fields --restore-created-at` and `claim_id` / `created_by` fields; `offices.timezone` and database `timezone = UTC`; `normalize_provider_roles.py` + `provider_kind`; `import_legacy_responsible_parties --apply`; `backfill_patient_accounts.py`; `dedupe_definitions.py`; inconsistent appointment links set NULL; `rpt_legacy_logins` built; duplicate join keys merged | Scripts per client (dry run, then `--apply`) | DATA-10 | #2, #3, #4, #8, #9, #10, #11, #12, #21, #38 re-run and recorded `pass` |
| 10 | Decisions recorded as tenant settings: `legacy_positive_payment_policy`, `legacy_archive_policy`; fee sanity, opening-balance twins, link caps, null payment dates (`payment_date = created_at::date`, then NOT NULL through the check-constraint protocol of section 5) | Settings rows + small repairs | DATA-11 | #1, #5, #6, #24, #30, #31, #32, #39 |
| 11 | Reload of the 87,585 skipped migrated charges (missing codes seeded inactive, placeholder provider, re-run of `s28`); Denticon control totals stored as `legacy_control_*` | Migration re-run per client + data entry | DATA-57 | #35; R-21 passes or is waived in writing |
| 12 | Balance unification: the six balance paths read the canonical ledger behind a tenant-level flag; bridge report per account | Code release + per-client flag | DATA-07 | #7 (four parts), #28, #29 clean; R-02, R-03 on fixtures and a 1,000-patient sample; product owner sign-off |
| 13 | Organisation metric settings store (keys, versions, change log) | Alembic revision (deploy) | MET-02 | Round trip of every key; refused without the administration right |

### API endpoints delivered

| Rows of 02 §13 | Endpoints | Item |
|---|---|---|
| 1-4 | `GET /reports/catalog`, `GET /reports/definitions/{report_key}`, `POST /reports/definitions/{report_key}/validate`, `GET /reports/definitions/{report_key}/options/{param_key}` (merged with `GET /reports/lookups/{lookup_key}` when the surface is frozen) | ENG-05, FLT-06, FLT-07 |
| 5-9 | `POST /reports/runs`, `GET /reports/runs`, `GET /reports/runs/{run_id}`, `GET /reports/runs/{run_id}/rows`, `POST /reports/runs/{run_id}/cancel` | ENG-12, ENG-13 |
| 15-18 | `POST /reports/runs/{run_id}/artifacts` (CSV inline), `GET /reports/runs/{run_id}/artifacts`, `GET /reports/artifacts/{artifact_id}`, `GET /reports/artifacts/{artifact_id}/download` | ENG-15, ENG-57 |
| 23 (read) | `GET /reports/settings`: configuration errors, builds, shadow mode and end date | ENG-01, SEC-12 |
| 54 | `GET /analytics/metadata` | MET-01 |
| — | `GET` / `PUT /analytics/settings` (named by MET-02, absent from 02 §13: gap G-08) | MET-02 |
| Secured, unchanged shape | `/reports/summary`, `/reports/trends`, `/reports/accounts-receivable`, `/reports/aging`, `/reports/insurance-verification-summary`, `/dashboard/summary`, `/offices/{office_id}/financial-summary`, `/collections`, `/insurance-receivables`, `/adjustment-summary`, `/transactions`, `GET /transactions`, lab-case report routes, `POST /offices/{office_id}/statements/batch`: office rule, field-group rights with `restricted[]`, scope-aware cache key | ENG-16, SEC-10 (D-01..D-06) |
| Closed or narrowed | `POST /auth/signup` → 404 unless `ALLOW_SIGNUP` (dev only); strict gates on `user-groups`, `user-group-memberships`, `/offices/{office_id}/users`, `/user-offices`, `/tenants`, `/user-preferences`; `UserListRead` without `signature_data`; parent-join tenant predicate in `CRUDBase` | SEC-11, SEC-42 (D-09..D-13, D-16, D-23, D-27, D-28) |

### Reports delivered

| Category | Count | report_keys |
|---|---|---|
| Existing reports on the engine (interim definitions, parity in P1 / P2 / P3; final columns per `catalog/`) | 3 in P0 + 3 at the start of P1 (G-03) | P0: `daily.production_report` (parity P1), `daily.collection_report` (P1), `lists.patient_list` (P3); start of P1: `appointment.appointment_list` (P3), `treatment_plan.treatment_plan_status` (P3), `insurance.claims_list` (P2) (provisional mapping of 07 §2.2) |
| Administration | 1 | `management.report_access_readiness` (SEC-12) |
| Legacy parity | 0 | — |

### Tests and reconciliation checks that must be green

| Check | Source | Gate |
|---|---|---|
| Unit, PostgreSQL and fault-injection tiers in CI before the migration step | ENG-17, 02 §15.1 | Deploy gate |
| Definition lint (coverage, control mapping, options and defaults, keys, references, security, builders, datasets, versioning, classes) incl. FLT-27 rules | ENG-18, FLT-27 | Deploy gate |
| OpenAPI snapshot with default settings, definition fixtures, expression vectors in pytest and vitest | ENG-19, ENG-04, FLT-04, FLT-05 | Deploy gate |
| Engine invariants R1-R4, R6, R8, R9 for each of the three P0 ENG-20 definitions on `golden_small` | 02 §15.3 | Exit |
| 03 invariants R-01, R-02, R-03, R-04, R-10a, R-12, R-13 on fixtures and as nightly control queries; R-21 recorded or waived | DATA-09, DATA-57 | Exit; the allocation invariants R-05, R-06, R-14, R-14b need DATA-20 (P1) |
| Metric identities I-1..I-12 on the two-era fixture | MET-04 | Exit |
| Security matrix: scope x right x class, two tenants, `can_view_run` truth table, platform cases of 02 §15.7 | SEC-14, SEC-10 | Exit |
| Fault cases: lost / duplicated task (sync queue), crash between commit and enqueue, two overlapping ticks, tick of another `node_scope` | ENG-17, ENG-58 | Exit |

### Exit criteria

| # | Verifiable statement |
|---|---|
| EX0-1 | On the main client, `POST /auth/signup` answers 404 and the database holds only the tenants of the client registry (SEC-11) |
| EX0-2 | A restricted user receives 403 `office_not_assigned` for an unassigned office on every route of D-01..D-06 and on `POST /reports/runs`; cached values never cross scopes (ENG-16) |
| EX0-3 | `GET /patients/{id}/balance` equals `sum(amount)` of `rpt_ledger_entries` for every fixture patient and a 1,000-patient sample (R-02), with the product owner's sign-off on the bridge (DATA-07) |
| EX0-4 | Every P0 index of DATA-08 (03 §8 money and claim tables, excluding the `(tenant_id, office_id, posting_date)` indexes that need DATA-13 and DATA-15 in P1) is valid on the main client and UAT, and the five reference plans use them |
| EX0-5 | `production`, `collections` and `patient-list` run on the engine on the main client with totals over the full population and match their golden cases; the other three of ENG-20 still run on the old runner (ENG-20 split across P0 and P1, G-03); CSV and interim PDF from the engine, XLS through the old runner until ENG-27 (G-16) |
| EX0-6 | Every run writes a `report_audit_outbox` row in its state transaction and the tick drains it into `report_audit_events`; a PHI run without a manifest is not `succeeded` (ENG-14, SEC-08, SEC-09) |
| EX0-7 | Expired runs lose rows and files within two ticks on the main client and on every client with `REPORTS_ENGINE_ENABLED=true`; the tick infrastructure of each was created from the ENG-58 runbook entry (ENG-58) |
| EX0-8 | `GET /permissions` lists 397 active codes; the grant script has run per tenant; the readiness report lists checks (a)-(k) (SEC-01, SEC-02, SEC-12) |
| EX0-9 | The CI workflow fails on a failing PostgreSQL test and on a lint violation; the lint passes with the phase map generated from 09 §2 and the six ENG-20 keys declared interim (parity in P1, P1, P3, P3, P3, P2); the deploy preflight `assert_applied.py` fails on a missing operations step (ENG-17, ENG-18) |
| EX0-10 | `rpt_data_quality` holds a recorded result (`pass` or `waived`) for every check of the P0 check list of section 5.4 on the main client and UAT |

---

## P1 - Daily financial core

### Goal and user outcome

Daily, Ledger, My Reports and Statements at legacy parity with PDF and XLSX export, server-side saved views and
favorites, drill-through, the metric service and the first Main, Provider and My Dashboards. **A user can** run any of
the 22 legacy reports of these four categories with the legacy criteria and defaults, print them in the legacy layouts
(day sheet, journal, slips, statements), save and share views, drill from a total to its rows, and open dashboards whose
every number comes from the metric service. Front-desk users can print routing slips and walkouts from the patient and
the Scheduler; billing can run a statement batch that fits the inline budget.

### Entry criteria

| # | Criterion |
|---|---|
| EN1-1 | P0 exit criteria met on the main client; R-01..R-04, R-10a, R-12, R-13 green as nightly control queries |
| EN1-2 | `REPORT_RIGHTS_ENFORCED=false` with a shadow end date on the main client, or enforced (section 7) |
| EN1-3 | Decisions needed in P1 recorded: retention defaults, PDF above 10,000 rows, and **BD-02** (statements challenge, section 8); without BD-02 the P1 statements scope is the inline budget with the name-range split (EX1-5) |
| EN1-4 | 03 O-2 class seed signed off by the accountant (the Daily family prints Sub Type and Class columns) |

### Epics

| Epic | Name | Track | Work items | Size total | Depends on epics |
|---|---|---|---|---|---|
| E1.01 | Ledger re-read, posting stamps, void metadata, tenant_id batch 1 | T1 | DATA-12..DATA-15, DATA-50 | 2L 2M 1S = 32 d | earlier: E0.04, E0.05, E0.07 |
| E1.02 | Scheduling, visit, patient-activity, calendar and treatment-item facts | T1 | DATA-16..DATA-19, DATA-55, DATA-56 | 2L 4M = 40 d | earlier: E0.04, E0.07 |
| E1.03 | FIFO allocation core, claim and coverage facts, early event capture | T1 | DATA-20, DATA-21, DATA-25 | 2L 1M = 25 d | earlier: E0.07 |
| E1.04 | Statement runs, time clock and lab adapters, goals table, fees, alerts, resp. party type | T1 | DATA-22..DATA-24, DATA-51..DATA-53 | 2M 4S = 18 d | E1.03; earlier: E0.04, E0.06 |
| E1.05 | Artifact lifecycle, PDF kit and layouts, XLSX, logos, criteria echo | T3 | ENG-22..ENG-27, ENG-60, FLT-18 | 4L 3M 1S = 57 d | earlier: E0.09, E0.12 |
| E1.06 | Saved views, favorites, drill, pivot, python_builder, function datasets, context sources | T2 | ENG-28..ENG-31, ENG-34, ENG-59, FLT-16, FLT-17 | 6M 2S = 34 d | earlier: E0.08, E0.09, E0.10, E0.11, E0.12; FE: FLT-13 |
| E1.07 | Runs with side effects; retention classes and tenant settings | T3 | ENG-36, ENG-61 | 1M 1S = 7 d | earlier: E0.12 |
| E1.08 | Metric service v1, dashboard API v1, legacy roll-up adapters | T5 | ENG-32, ENG-33, ENG-35 | 1L 2M = 20 d | earlier: E0.10 |
| E1.09 | P1 metric pack, availability gating, adapters map, glossary, metric tests | T5 | MET-05..MET-09 | 1L 2M 2S = 24 d | E1.02, E1.08; earlier: E0.03, E0.06, E0.07, E0.17 |
| E1.10 | Dashboard model and Main / Provider / My Dashboard v1 definitions, twins, landing, first worklist | T5 | DASH-01, DASH-04, DASH-05, DASH-09, DASH-10, DASH-53 | 4M 2S = 24 d | E1.02, E1.05, E1.06, E1.09, E1.11; earlier: E0.04, E0.08, E0.09, E0.17; FE: DASH-03 |
| E1.11 | Export controls, dashboard authorisation, access log, seals, P1 security review, defects D-07/D-08/D-22/D-29 | T6 | SEC-15..SEC-24, SEC-26, SEC-43, SEC-44 | 6M 7S = 44 d | E1.05, E1.06, E1.07, E1.08; earlier: E0.08, E0.10, E0.12, E0.13, E0.18 |
| E1.12 | Performance tier, golden_large, Cloud Run measurement | T7 | ENG-37 | 1M = 5 d | earlier: E0.02 |
| E1.13 | Daily Reports family (12 reports) (FE-led inside: RPT-DAILY-76) | T4 | RPT-DAILY-01..RPT-DAILY-21, RPT-DAILY-22a, RPT-DAILY-23, RPT-DAILY-40, RPT-DAILY-41, RPT-DAILY-44, RPT-DAILY-45, RPT-DAILY-47..RPT-DAILY-55, RPT-DAILY-70..RPT-DAILY-73, RPT-DAILY-75, RPT-DAILY-76, RPT-DAILY-78..RPT-DAILY-81 | 6L 17M 23S = 191 d | E1.01, E1.02, E1.03, E1.04, E1.05, E1.06, E1.08, E1.11, E1.17; earlier: E0.03, E0.04, E0.06, E0.07, E0.08, E0.09, E0.10, E0.11, E0.13, E0.15, E0.16; **later phase: E2.03 (DATA-33)**; FE: FLT-12 |
| E1.14 | Ledger Reports family (4 reports) (FE-led inside: RPT-LEDGER-03) | T4 | RPT-LEDGER-01..RPT-LEDGER-13, RPT-LEDGER-16..RPT-LEDGER-18 | 1L 6M 9S = 58 d | E1.02, E1.03, E1.04, E1.05, E1.06, E1.08, E1.11, E1.17; earlier: E0.02, E0.07, E0.08, E0.09, E0.10, E0.12, E0.13, E0.14, E0.16; FE: UX-07, UX-29 |
| E1.15 | My Reports family (5 derived reports) (FE-led inside: RPT-MY-03) | T4 | RPT-MY-01..RPT-MY-06, RPT-MY-10..RPT-MY-18 | 1L 5M 9S = 53 d | E1.01, E1.02, E1.03, E1.04, E1.05, E1.06, E1.11, E1.17; earlier: E0.02, E0.06, E0.07, E0.08, E0.09, E0.14, E0.16; FE: UX-05..UX-07, UX-22, UX-29 |
| E1.16 | Statements screen and finance charges (FE-led inside: RPT-STMT-01) | T4 | FLT-28, RPT-STMT-01..RPT-STMT-07, RPT-STMT-09..RPT-STMT-20 | 3L 6M 11S = 82 d | E1.01, E1.03, E1.04, E1.05, E1.06, E1.07, E1.11, E1.17; earlier: E0.02, E0.04, E0.06, E0.07, E0.08, E0.09, E0.12, E0.13, E0.14, E0.16; FE: FLT-14, UX-28 |
| E1.17 | Parity default tests, access log and setup integrity reports, correspondence anchors | T4 | FLT-20, RPT-MENU-02, RPT-MENU-03, RPT-NEW-78, RPT-NEW-83 | 4M 1S = 22 d | E1.02, E1.04, E1.06, E1.11; earlier: E0.03, E0.04, E0.08, E0.09, E0.10, E0.13, E0.15; FE: UX-05 |
| **Total** | 168 backend items | | | **23L 72M 73S = 736 d** | |

Frontend-only items of the phase: DASH-02, DASH-03, DASH-06..DASH-08, FLT-19, FLT-21, UX-16..UX-32, UX-48, UX-49.

### Build order

1. **Start of phase, parallel:** E1.01 DATA-13, DATA-14 (deploy revisions, nullable) then the posting-stamp back-fill;
   DATA-15 (the NOT NULL protocol of section 5); DATA-50 decision → DATA-12 (needs the Denticon export, A-4).
   E1.03 DATA-25 and E1.02 DATA-17 **first, in parallel** — event history cannot be back-filled, so claim status,
   treatment-item and appointment events must start recording as early as possible (gap G-20 recommends moving their
   additive capture parts to P0). DATA-17 depends on DATA-16: DATA-16's schema revision (appointment stamps) goes first,
   then the DATA-17 event writer immediately, in parallel with DATA-16's views. E1.03 DATA-20 → DATA-21. E1.02
   DATA-18 → DATA-19; DATA-55, DATA-56 beside them. E1.04 in parallel. The three remaining ENG-20 reports
   (`appointments`, `treatment-plans`, `insurance-claims`) follow DATA-16, DATA-56 and DATA-21 (G-03).
2. **Engine and render lanes:** E1.05 ENG-22 → ENG-23 → ENG-24 / ENG-25 / ENG-26 / ENG-27 (the phase's critical path,
   42 engineer-days to RPT-DAILY-81); ENG-60 before ENG-23 (ENG-23 depends on it); ENG-27 (XLSX) after ENG-22; FLT-18 after ENG-23. E1.06 ENG-28, ENG-29, ENG-30, ENG-31,
   ENG-59, ENG-34 in parallel; FLT-16, FLT-17 after ENG-06 / SEC-06. E1.07 ENG-61 (Statements need it), ENG-36.
3. **Metric lane:** ENG-32 → ENG-33 → ENG-35; MET-05 (after DATA-16, 18, 19, 55, 56 and ENG-32) → MET-06, MET-07,
   MET-08; MET-09 beside MET-05. Then E1.10: DASH-01 → DASH-04 → DASH-05, DASH-09, DASH-10, DASH-53.
4. **Report families** (T4, two to four engineers): Daily first in this order — family pieces RPT-DAILY-01..RPT-DAILY-09;
   Production and Collection (RPT-DAILY-16, 17, 19, 20, 21, 22a, 23); Daily Journal (13, 14, 15); Peg Board Day Sheet
   (10, 11, 12); Deposit Slip (40, 41); Scheduled Production (44, 45); Routing Slip (47..51); Progress Notes (52..55);
   Production Analysis (70, 71); Daily Audit (72, 73); Claims Printed (75, 76, 78); Special Transaction (79, 80, 81).
   Ledger family after DATA-20, DATA-21 and ENG-25. My Reports after the daily counterpart of each derived report
   (RPT-MY-10 after RPT-DAILY-13, RPT-MY-17 after RPT-DAILY-16). Statements after DATA-20, DATA-21, DATA-22, ENG-26,
   ENG-61; RPT-STMT-04 (account statement lock) before RPT-STMT-15. RPT-DAILY-18 and RPT-DAILY-71 ship their interim
   carrier resolution because DATA-33 is P2 (G-01).
5. **Financial gate:** no report of the Daily, Ledger or Statements families is enabled for a client before R-05, R-06,
   R-14 and R-14b pass there (they need DATA-20), in addition to the P0 gates (AD-10).
6. **Security:** SEC-15 → SEC-16, SEC-23; SEC-17 after ENG-28; SEC-18 after ENG-32 / ENG-33; SEC-19 after ENG-34;
   SEC-20, SEC-21, SEC-26 after SEC-08; SEC-22, SEC-44 any time; SEC-43 after ENG-20 and the inventory of remaining
   frontend callers; SEC-24 per family, before the family is enabled.
7. **Performance:** ENG-37 from the start of the phase so that the first family is measured from a Cloud Run instance.

### Database changes in apply order

| # | Change | Kind | Item | Check |
|---|---|---|---|---|
| 1 | `posted_at`, `posting_date` on the five money tables; `transaction_date` on `patient_procedures`, `patient_payments`, `ledger_insurance_details`; `voided_at`, `voided_by`, `void_reason`; `updated_at`, `updated_by` on `patient_adjustments` | Deploy revision, nullable; writers set them | DATA-13, DATA-14 | New rows stamped; R-19 bridge defined |
| 2 | Back-fill of posting stamps for existing rows (id batches of 10,000-20,000) | Operations script per client | DATA-13 | Null count 0 on app rows |
| 3 | `treatment_plan_item_events`, `claim_status_history` | Deploy revision; writers | DATA-25 | Capture date recorded per client (history starts there) |
| 4 | `tenant_id` on `patient_procedures`, `patient_payments`, `ledger_insurance_details`, `payment_allocations`, `insurance_claims`, `claim_submissions`, `appointments`, `appointment_procedures`; `patient_procedures.account_id` (posted account) | Deploy revision (nullable) + insert hooks → batched back-fill (operations script) → `CHECK ... NOT VALID` → `VALIDATE` → `SET NOT NULL` (operations steps, section 5.2) | DATA-15 | DATA-15 acceptance; `attnotnull` true on every client database of the client registry; the SEC-42 predicate is switched to the column only in the release after every client's change ledger shows the constraint |
| 5 | Final created-date indexes `(tenant_id, office_id, posting_date)` replacing the two `..._office_created_at`: build the new indexes concurrently, check `indisvalid` and the reference plans, then `DROP INDEX CONCURRENTLY` the old ones in a later operations step | Operations steps, concurrent | DATA-15, DATA-08 | `indisvalid` true for the new names; reference plans use them; old names absent after the drop step |
| 6 | `patient_payments.transaction_code`, `card_brand`, `card_last4`; app-row back-fill; migrated rows from the `LEDGER` re-read | Deploy revision + operations back-fill | DATA-12, DATA-50 | #14, #36 |
| 7 | `appointment_events`; appointment stamps (`deleted_at`, `cancelled_at`, `missed_at`, `seated_on`, `available_on`, `confirmed_by`, `confirmed_via`, `checked_in_by`, `checked_out_by`, `booking_source`, `reschedule_count`); cancellation reasons; scheduling views and their indexes | Deploy revision + view deployment + operations indexes | DATA-16, DATA-17 | #18; R-15 |
| 8 | `progress_notes.provider_id`, `appointment_id`; `rpt_visits`, `rpt_provider_visits`, `rpt_visit_audit()`, `rpt_appointment_note_audit()`, `rpt_progress_note_facts` | Deploy revision + view deployment | DATA-18 | Fixture visits |
| 9 | Maintained `patients.first_visit` / `last_visit` + back-fill; `rpt_patient_activity` | Deploy revision + operations back-fill | DATA-19 | Back-fill equals the view on a sample |
| 10 | `rpt_explicit_allocations`, `rpt_fifo_core()`, `rpt_fifo_allocations()`, `rpt_ar_open_items()` | Function deployment | DATA-20 | R-05, R-06, R-14, R-14b; #31 |
| 11 | Claim columns `sent_method`, `print_count`, `first_printed_at`, `last_printed_at`; `claim_print_events`; `rpt_claim_facts`, `rpt_claim_lines`, `rpt_unclaimed_charge_tiers`, `rpt_insurance_coverage` | Deploy revision + view deployment | DATA-21 | Claims Printed golden case |
| 12 | `statement_runs`; `patient_statements.delivery_error`; `accounts.last_statement_date`, `statement_locked_through`; statement-history back-fill; account statement lock write guard | Deploy revision + operations back-fill + code | DATA-22, RPT-STMT-05, RPT-STMT-04 | R-18 (control) |
| 13 | `accounts.resp_party_type` + back-fill (`No Type Defined` default) | Deploy revision + operations back-fill | DATA-53 | #37 |
| 14 | `provider_production_goals`; `rpt_time_clock`, `rpt_lab_cases`, `rpt_fee_schedule_fees`, `rpt_patient_alerts` and note passthroughs, `rpt_office_calendar_days()`, `rpt_provider_calendar_days()`, `rpt_treatment_item_facts` | Deploy revision + view / function deployment | DATA-23, DATA-24, DATA-51, DATA-52, DATA-55, DATA-56 | #25 |
| 15 | Engine tables `report_saved_views`, `report_shares`, `report_favorites`, `report_recents`, `report_tenant_settings`; security settings of `/reports/settings` | Deploy revision | ENG-28, ENG-29, ENG-36, SEC-15 | Tables exist and `information_schema.columns` equal the model; two-tenant isolation test; `PATCH /reports/settings` round trip (SEC-15) |
| 16 | Logos moved to `branding/` objects with back-fill of stored URLs | Operations script per client | ENG-60 | Every office letterhead resolves through `logo_bytes()` |

### API endpoints delivered

| Rows of 02 §13 | Endpoints | Item |
|---|---|---|
| 10-13 | `POST /reports/runs/{run_id}/rerun`, `PATCH` / `DELETE /reports/runs/{run_id}`, `POST /reports/runs/{run_id}/drill` | ENG-61, ENG-36, ENG-30 |
| 14 (statements only) | `POST /reports/runs/{run_id}/actions/{action_key}` for the `legacy_actions` of Statements (`update_statement_dates`, `undo_statement_dates`) | ENG-61, RPT-STMT-15, RPT-STMT-18 |
| 15 (PDF, XLSX) | Artifact formats `pdf` and `xlsx` with inline caps 1,500 / 10,000 rows | ENG-22..ENG-27 |
| 23 (write) | `PATCH /reports/settings` incl. the security block | ENG-36, SEC-15 |
| 24-36 | Saved views, resolve, shares; favorites, order; recents | ENG-28, ENG-29, SEC-17 |
| 55-61, 63 | `GET /analytics/metrics/{metric_key}`, `POST /analytics/metrics/query`, `POST /analytics/metrics/drill`, `GET /analytics/dashboards`, `GET /analytics/dashboards/{dashboard_key}`, `POST .../data`, `GET` / `PUT .../layout`, `GET /analytics/freshness` | ENG-32, ENG-33, DASH-01 |
| Adapters, deprecated | `/reports/summary`, `/reports/trends`, `/dashboard/summary`, office roll-ups over the metric service; `/transactions` feeds rewritten on `rpt_ledger_entries` with keyset paging; patient ledger PDF aligned with `ledger.ledger_report` | ENG-35, MET-07, RPT-LEDGER-08 |
| Deprecated | `POST /offices/{office_id}/statements/batch` (synchronous batch) | RPT-STMT-07 |
| New service endpoint | Claim print event (ADA direct print and batch paper print) | DATA-21, RPT-DAILY-76 |
| Hardened | Patient PDFs (`assert_patient_visible`, `office_id` on print rows), print rows on statement / contract / medical-history PDFs, masked `ssn`, strict read right on cross-patient money and claim lists | SEC-22, SEC-44, SEC-43 |

### Reports delivered

| Category | Count | report_keys |
|---|---|---|
| Daily Reports | 12 | `daily.peg_board_day_sheet`, `daily.daily_journal`, `daily.production_report`, `daily.collection_report`, `daily.deposit_slip`, `daily.scheduled_production`, `daily.routing_slip`, `daily.progress_notes`, `daily.production_analysis_report`, `daily.daily_audit`, `daily.claims_printed`, `daily.special_transaction_report` |
| Ledger Reports | 4 | `ledger.ledger_report`, `ledger.walkout_report`, `ledger.super_bill`, `ledger.account_allocation` |
| My Reports | 5 | `my_reports.daily_journal`, `my_reports.time_clock_report`, `my_reports.missing_progress_notes`, `my_reports.appointment_detail_by_user`, `my_reports.production_report` |
| Statements | 1 (+1 companion) | `statements.statement_run`; companion `statements.finance_charges` (RPT-STMT-17) |
| New control reports | 2 | `management.report_access_log` (RPT-NEW-78), `management.setup_integrity` (RPT-NEW-83) |
| Worklist (read-only) | 1 | `worklists.not_reappointed` (DASH-53) |
| Dashboards | 3 | `dashboards.main`, `dashboards.provider`, `dashboards.my`, with hidden twin report definitions (DASH-09) |

### Tests and reconciliation checks that must be green

| Check | Source | Gate |
|---|---|---|
| R-05, R-06, R-14, R-14b on fixtures and on each client before its first financial report | DATA-20, DATA-09 | Per-client enablement |
| R-07, production part of R-08, ledger part of R-09, R-15, R-19, R-20 (exceptions), R-22; R-18 as control | 03 §10 | Exit |
| Engine invariants R1-R9 for each of the 22 definitions on `golden_small`, one golden case per format and per column-selecting value | 02 §15.2-15.3 | Exit |
| Parity default tests: each definition's defaults equal its parity file; the untouched form validates | FLT-20, RPT-DAILY-06, RPT-LEDGER-09, RPT-MY-05, RPT-STMT-19 | Deploy gate (lint + pytest) |
| Family reconciliation: day sheet A/R proof, Ledger closing balance = account balance, Daily totals = metric registry (`reconciles_with`, R5) | RPT-DAILY-07, RPT-DAILY-11, RPT-LEDGER-06 | Exit |
| Metric harness: two-era fixtures, ratio and no-data properties, alias and slice identities | MET-09 | Deploy gate |
| Performance budgets of 02 §15.6 for the P1 cost classes, measured from a Cloud Run instance with round-trip counts | ENG-37 | Exit |
| Security review of the P1 definitions; export controls (watermark id, attribution line, purpose prompt) | SEC-24, SEC-16 | Exit |
| Legacy output comparison for the same period (section 6.6) on the main client: Daily Journal, Production, Collection, Deposit Slip, Ledger, Statement | Section 6 | Exit |

### Exit criteria

| # | Verifiable statement |
|---|---|
| EX1-1 | Each of the 22 P1 legacy reports runs on the main client with the legacy default criteria and prints the legacy layout; its parity default test passes |
| EX1-2 | For one closed month on the main client, Daily Journal, Production Report and Collection Report totals equal the corresponding Denticon prints within the documented differences (migrated periods carry the completeness caveat unless R-21 passed) |
| EX1-3 | PDF, XLSX, CSV and screen of the same run carry the same rows and totals (R4, R9), with watermark id and attribution line |
| EX1-4 | `dashboards.main` returns a value or a named state for each of the 20 reference rows on the UAT database (DASH-04) |
| EX1-5 | A statement run of an office inside the inline budget writes `statement_runs` and one `patient_statements` row per account in the terminal transaction; a rerun asks for confirmation; a larger batch fails with `report_too_large_for_inline` and the hint names the responsible-party name-range split. **Known P1 parity gap** (unless BD-02 moves ENG-63 and the claim / heartbeat part of ENG-38 to P1): an office above the inline budget runs its statements in name-range slices (saved views `A-L` / `M-Z`, `catalog/statements.md`) until RPT-STMT-08 (P2) |
| EX1-6 | `/reports/summary` and `/dashboard/summary` return the metric-service values and are marked deprecated in the OpenAPI document |
| EX1-7 | Saved views and favorites survive logout and are visible across devices |
| EX1-8 | `tenant_id` is NOT NULL on the eight fact tables of DATA-15 on every client database in the client registry, whether or not reporting is enabled there (one image runs everywhere) |
| EX1-9 | `management.report_access_log` (RPT-NEW-78) and `management.setup_integrity` (RPT-NEW-83) pass their golden cases and are active on the main client |
| EX1-10 | `dashboards.provider` and `dashboards.my` return a value or a named state for every reference row on the UAT database (DASH-05); `worklists.not_reappointed` row count equals the denominator minus the numerator of `hygiene_reappointment_pct` (DASH-53) |
| EX1-11 | `appointment.appointment_list`, `treatment_plan.treatment_plan_status` and `insurance.claims_list` (interim) run on the engine with totals over the full population on the main client, completing ENG-20 (G-03) |
| EX1-12 | Known P1 parity gaps recorded with the item that closes them: RPT-DAILY-18 and RPT-DAILY-71 interim carrier resolution → DATA-33 (P2); statements above the inline budget → RPT-STMT-08 (P2) |

---

## P2 - Month-end, A/R and insurance

### Goal and user outcome

Monthly, Management and Insurance at legacy parity; background runs on the worker; scheduled delivery; day close,
period lock and deposits; frozen month-end figures; Collections and A/R, Insurance and Executive dashboards. **A user
can** run tenant-wide ageing and allocation reports in the background and be notified, schedule a report to colleagues
with a login-gated link, close a day and lock a month, see an ageing that reproduces for a closed month, and work the
insurance reports. Large statement batches run as one background job.

### Entry criteria

| # | Criterion |
|---|---|
| EN2-1 | P1 exit met on the main client |
| EN2-2 | ENG-21 findings accepted; queue transport decided (Cloud Tasks or `db_poll`) |
| EN2-3 | Decisions needed in P2 recorded: allocation for app payments (03 O-6), period-lock basis (O-7), run-cache invalidation, connection budget, two export keys (08 OD-2), external recipients (08 OD-9) |
| EN2-4 | Per-client provisioning approved for the cloud project (queues, worker service, bucket, service accounts) |

### Epics

| Epic | Name | Track | Work items | Size total | Depends on epics |
|---|---|---|---|---|---|
| E2.01 | Tenant-wide persistent allocations, A/R open items and ageing, collection fields | T1 | DATA-26, DATA-27, DATA-35 | 1XL 1L 1S = 32 d | earlier: E1.01, E1.03 |
| E2.02 | Deposits and remittance header, day close and period lock, close snapshots | T1 | DATA-28..DATA-30 | 1XL 2L = 40 d | E2.01; earlier: E1.01 |
| E2.03 | Claim model additions, benefit usage, payer stamps, eligibility history, capitation and ERA | T1 | DATA-31..DATA-34, DATA-38 | 3L 2M = 40 d | earlier: E0.04, E1.01, E1.03 |
| E2.04 | Audit events dataset; contract instalments | T1 | DATA-36, DATA-37 | 2M = 10 d | E2.02; earlier: E0.07, E1.01, E1.02, E1.03 |
| E2.05 | Background path, reaper and retries, progress push, job mode, db_poll drain | T3 | ENG-38, ENG-40, ENG-42, ENG-45, ENG-63 | 1L 2M 2S = 24 d | earlier: E0.01, E0.12 |
| E2.06 | Worker service role, per-client provisioning, observability | T7 | ENG-39, ENG-46, ENG-47 | 3M = 15 d | E2.05; earlier: E0.12 |
| E2.07 | Schedules, delivery, schedule and delivery controls | T3 | ENG-43, ENG-44, SEC-25 | 1L 2M = 20 d | E2.05; earlier: E0.12, E1.06 |
| E2.08 | Run cache with data-version markers; dirty-slice refresh step | T3 | ENG-41, ENG-62 | 1L 1S = 12 d | earlier: E0.12 |
| E2.09 | Collections and A/R, insurance and P2 production packs; snapshot writer | T5 | MET-10..MET-12, MET-26 | 2L 2M = 30 d | E2.01, E2.02, E2.03; earlier: E1.01, E1.03, E1.09 |
| E2.10 | P2 dashboards, scorecard v1, subscriptions, day-close checklist (backend parts) | T5 | DASH-12..DASH-17, DASH-52, DASH-55 | 7M 1S = 37 d | E2.01, E2.02, E2.07, E2.09; earlier: E0.08, E1.09, E1.10; FE: DASH-02, DASH-06, DASH-11 |
| E2.11 | Write-once manifests, disclosure log, patient access index, audit profile, step-up, off-boarding | T6 | SEC-27..SEC-35 | 7M 2S = 39 d | E2.04, E2.05, E2.06; earlier: E0.13, E1.11 |
| E2.12 | P2 option sources and run estimate | T2 | FLT-08, FLT-24 | 2S = 4 d | E2.03; earlier: E0.09, E0.11 |
| E2.13 | Monthly Reports family (9 reports) | T4 | RPT-MONTHLY-01..RPT-MONTHLY-20, RPT-MONTHLY-22, RPT-MONTHLY-23, RPT-MONTHLY-40..RPT-MONTHLY-46, RPT-MONTHLY-48..RPT-MONTHLY-52 | 4L 15M 15S = 145 d | E2.01, E2.02, E2.04, E2.05, E2.07, E2.09; earlier: E0.02, E0.03, E0.04, E0.06, E0.07, E0.08, E0.09, E0.10, E0.11, E0.15, E0.16, E1.01, E1.02, E1.03, E1.04, E1.05, E1.06, E1.07, E1.09, E1.17; **later phase: E3.02 (DATA-40), E4.02 (FLT-26)**; FE: FLT-14, FLT-15 |
| E2.14 | Management Reports family (4 reports) (FE-led inside: RPT-MGMT-02, RPT-MGMT-15) | T4 | RPT-MGMT-01..RPT-MGMT-04, RPT-MGMT-10..RPT-MGMT-18 | 2L 5M 6S = 57 d | E2.01, E2.04, E2.11; earlier: E0.03, E0.04, E0.07, E0.08, E0.09, E0.15, E0.16, E1.01, E1.02, E1.03, E1.04, E1.06, E1.11; **later phase: E3.03 (ENG-49)**; FE: UX-05, UX-06, UX-29, UX-30, UX-39 |
| E2.15 | Insurance Reports family (13 reports) | T4 | RPT-INS-01..RPT-INS-15, RPT-INS-17, RPT-INS-18, RPT-INS-40, RPT-INS-41, RPT-INS-43, RPT-INS-44, RPT-INS-46, RPT-INS-47, RPT-INS-49..RPT-INS-53, RPT-INS-70, RPT-INS-72..RPT-INS-79 | 7L 17M 13S = 181 d | E2.02, E2.03, E2.09, E2.10, E2.12; earlier: E0.04, E0.06, E0.07, E0.09, E0.10, E0.11, E0.15, E0.16, E1.01, E1.02, E1.03, E1.04, E1.05, E1.06, E1.17; **later phase: E3.01 (DATA-41), E3.03 (ENG-49), E3.03 (SEC-36), E3.05 (DASH-28)**; FE: FLT-13 |
| E2.16 | P2 follow-ups of the Daily, Ledger and Statements families (FE-led inside: RPT-LEDGER-14) | T4 | RPT-DAILY-22b, RPT-DAILY-42, RPT-DAILY-43, RPT-DAILY-77, RPT-LEDGER-14, RPT-LEDGER-15, RPT-LEDGER-19, RPT-STMT-08, RPT-STMT-21, RPT-STMT-22 | 4M 6S = 32 d | E2.01, E2.02, E2.03, E2.04, E2.05; earlier: E1.05, E1.13, E1.14, E1.16; **later phase: E3.03 (ENG-49), E3.03 (SEC-36)** |
| E2.17 | New analytics and control reports, P2 (21) | T4 | RPT-NEW-10, RPT-NEW-12..RPT-NEW-20, RPT-NEW-23, RPT-NEW-25..RPT-NEW-28, RPT-NEW-77, RPT-NEW-79..RPT-NEW-82, RPT-NEW-84 | 5L 13M 3S = 121 d | E2.01, E2.02, E2.03, E2.04, E2.06, E2.07, E2.09, E2.11; earlier: E0.03, E0.04, E0.06, E0.07, E1.01, E1.02, E1.03, E1.04; **later phase: E3.02 (DATA-40), E4.01 (DATA-49)** |
| E2.18 | Correspondence parity: merge engine, templates, blank insurance forms | T4 | RPT-MENU-04, RPT-MENU-05, RPT-MENU-12 | 1L 2M = 20 d | earlier: E1.17 |
| **Total** | 167 backend items | | | **2XL 30L 83M 52S = 859 d** | |

Frontend-only items of the phase: DASH-11, UX-33..UX-37, UX-46.

### Build order

1. **Background first:** ENG-38 → ENG-39 → ENG-46 on the main client (worker, queues, bucket `rd-<c>-reports`) →
   ENG-40, ENG-45, ENG-63 (if `db_poll` was chosen or as fallback), ENG-42, ENG-47. `REPORT_BACKGROUND_ENABLED` per
   client after ENG-46 has run there. RPT-STMT-08 follows immediately (statement batches above the inline budget).
2. **Data, critical path (65 engineer-days):** DATA-26 (XL; allocation at posting, 03 O-6) → DATA-27 → DATA-30 →
   MET-10 → RPT-MONTHLY-10 → RPT-MONTHLY-11. In parallel: DATA-28, DATA-29 (XL; write guards on every money writer);
   DATA-31, DATA-32 (coverage repairs #15, #16, #23), DATA-33, DATA-34, DATA-38; DATA-35, DATA-36, DATA-37.
3. **Schedules:** ENG-43 → ENG-44 → SEC-25 → DASH-17; `REPORT_SCHEDULES_ENABLED`, `REPORT_EMAIL_ENABLED` per client
   after `APP_BASE_URL` and the transport check.
4. **Cache:** ENG-41 after the write-route test; `REPORT_CACHE_ENABLED` only with background enabled; ENG-62 with the
   P2 snapshot tables.
5. **Families start as soon as their data is ready, in parallel** (the arrows below are data-readiness gates, not a
   sequence of families): Executive Summary and Day Sheet (RPT-MONTHLY-10..16) start the day MET-10 lands (with ENG-24
   from P1), because RPT-MONTHLY-10 → RPT-MONTHLY-11 is the tail of the phase's critical path; Insurance (RPT-INS on
   DATA-21 from P1, then DATA-31, DATA-32, DATA-34, DATA-38); Management (RPT-MGMT-10 on DATA-37, RPT-MGMT-12 on DATA-27,
   RPT-MGMT-14 on DATA-36, RPT-MGMT-17 on ENG-34); Monthly ageing (RPT-MONTHLY-02, 03, 17..22 on DATA-27); allocation
   reports (RPT-MONTHLY-04, 40..52 on DATA-26); RPT-MONTHLY-09 last (background, month-end schedules, frozen periods).
   The P2 follow-ups of E2.16 slot in after their dependencies; new analytics (E2.17) after their datasets.
6. **Held parts (register inversions, G-01):** the bulk-action parts of RPT-DAILY-77, RPT-INS-07, RPT-INS-77,
   RPT-MGMT-11, RPT-MGMT-13 wait for ENG-49 / SEC-36 / DASH-28 (P3); RPT-INS-05 ships without the recall mode until
   DATA-41; RPT-MONTHLY-12 and RPT-NEW-82 use the interim referral attribution until DATA-40; RPT-MONTHLY-14 without the
   comparison period until FLT-26; RPT-NEW-27 ships only with the estimate caveat until DATA-49 (or moves, G-02).
7. **Metrics and dashboards:** MET-11 after DATA-31 / DATA-32; MET-12 after DATA-30; MET-26 after DATA-13, DATA-14,
   DATA-28, DATA-29; then DASH-52, DASH-12..DASH-16, DASH-55.
8. **Security:** SEC-27 after ENG-46; SEC-28, SEC-29 → SEC-31, RPT-NEW-79; SEC-30 after DATA-36; SEC-32..SEC-35.

### Database changes in apply order

| # | Change | Kind | Item | Check |
|---|---|---|---|---|
| 1 | `report_schedules`, `report_schedule_recipients`, `report_deliveries` | Deploy revision | ENG-43, ENG-44 | Tables exist, `information_schema.columns` equal the model; two-tenant isolation test |
| 2 | `payment_allocations` columns (`office_id`, `allocated_at`, `allocation_method`, `unallocated_reason`, `created_by`, `reversed_at`, `reversed_by`); `patient_payments.aged_from_date`; `rpt_derived_allocations` | Deploy revision + writer change (allocate at posting) + nightly table | DATA-26 | R-06, R-08 (collections part) |
| 3 | `rpt_aging_bucket_sets`; tenant-wide `rpt_ar_open_items` for both units | View / function deployment | DATA-27 | R-05, R-14, R-14b tenant-wide |
| 4 | `accounts.balance_status_code`, `sent_to_collections_at`; definitions group `balance_status` | Deploy revision | DATA-35 | Columns exist (`information_schema`); every account has a `balance_status_code` value or the documented NULL default |
| 5 | `deposits`, `deposit_items`, `insurance_remittances`; `ledger_insurance_details.remittance_id` | Deploy revision + writers | DATA-28 | R-09 deposit part |
| 6 | `office_day_closes`, `financial_period_locks`; write guards on every money writer | Deploy revision + code | DATA-29 | Write into a closed day rejected; override audited |
| 7 | `rpt_ar_snapshot`, `rpt_ar_snapshot_accounts`, `rpt_day_close_snapshot`, `rpt_metric_values`, `rpt_snapshot_variances` with the insert-only trigger | Deploy revision | DATA-30, MET-12 | R-17 |
| 8 | Claim columns (`deleted_at`, `deleted_by`, `parent_claim_id`, `denied_date`, `denial_reason_code`, `denial_remark_code`, `denied_amount`, `appeal_date`, `updated_at`, `updated_by`); recompute guard; `_sum_coverage` ignores migrated rows; `rpt_claim_facts_as_of()` | Deploy revision + code + function | DATA-31 | #17; R-11 |
| 9 | Coverage repairs: `backfill_insurance_source_fields.py`, `backfill_pricing_hierarchy.py --only slots`, claim plan and status re-map; `rpt_benefit_usage()` | Operations scripts per client + function | DATA-32 | #15, #16, #23 |
| 10 | Payer and bill-tier stamps on `patient_procedures` and `patient_payments` | Deploy revision + writer | DATA-33 | New charges stamped |
| 11 | `eligibility_verifications` (orphan `eligibility_checks` adopted or dropped); `offices.rte_sweep_days_before` | Deploy revision | DATA-34, RPT-INS-79 | Table and column exist; `eligibility_checks` row count before = adopted + dropped (recorded) |
| 12 | `rpt_audit_events` dataset and taxonomy | View deployment | DATA-36 | Lint Datasets rule: declared columns equal `information_schema.columns` (ENG-18) |
| 13 | `ledger_id varchar(50)` on the two insurance instalment tables; `patient_procedures.ortho_plan_id`, `payment_plan_id`; contract credit writer; `rpt_contract_installments`, `rpt_payment_plan_contracts` | Deploy revision + code + views | DATA-37 | #26, #33, #34 |
| 14 | `capitation_payments`; `era_files`, `era_claim_payments`, `era_adjustments`; `era_service_lines` and `era_adjustments.era_service_line_id`; `era_reason_codes`; `patient_procedures.hold_reason`, `hold_set_at`, `hold_set_by` | Deploy revision | DATA-38, RPT-INS-72, RPT-INS-76, RPT-INS-18 | Tables and columns exist (`information_schema`); two-tenant isolation test on the ERA tables |
| 15 | Disclosure log, patient access index, write-once storage for manifests | Deploy revision + bucket policy | SEC-28, SEC-29, SEC-27 | UPDATE / DELETE probe on the log refused; overwrite of a manifest object refused by the bucket policy |
| 16 | Dedicated reports bucket per client with lifecycle rule on `reports/` | Provisioning script | ENG-46 | `GET /reports/settings` shows no configuration error |

### API endpoints delivered

| Rows of 02 §13 | Endpoints | Item |
|---|---|---|
| 5 (`mode = background`), 7 | Background runs, promotion keeping `run_id`, `queue_position`, `poll_after_ms` | ENG-38, ENG-40 |
| 19-20 | `POST` / `GET /reports/runs/{run_id}/deliveries` | ENG-44, SEC-25 |
| 22 | `GET /reports/stats` | ENG-47 |
| 37-46 | Schedules CRUD, pause / resume / sync-from-view, run-now, take-over, schedule runs, `GET /reports/deliveries` | ENG-43, ENG-44 |
| Internal (worker only, not in the client) | `POST /internal/reports/runs/{run_id}/execute`, `POST /internal/reports/artifacts/{artifact_id}/render` | ENG-39 |
| Retired | `/reports/accounts-receivable`, `/reports/aging` (with `monthly.aging_report`); office roll-ups `/financial-summary`, `/collections`, `/insurance-receivables`, `/adjustment-summary`; `/reports/summary`, `/reports/trends` once the FE dashboards read `/analytics` | 02 §14, ENG-35 |
| New service endpoints | Day close and period lock actions, deposit creation (bulk action of RPT-DAILY-43), capitation payment entry (RPT-INS-44), verification request (RPT-INS-41), per-patient financial record export (SEC-34) | DATA-29, DATA-28, RPT-INS-44, RPT-INS-41, SEC-34 |

### Reports delivered

| Category | Count | report_keys |
|---|---|---|
| Monthly Reports | 9 | `monthly.executive_summary`, `monthly.executive_day_sheet`, `monthly.aging_report_by_home_office`, `monthly.aging_report`, `monthly.income_allocation`, `monthly.allocation_detail`, `monthly.unallocated_payment_adjustments`, `monthly.daily_journal_summary_by_allocation`, `monthly.waterfall_report` |
| Management Reports | 4 | `management.payment_plan_charges`, `management.uncollected_copay`, `management.audit_trail`, `management.time_clock_report` |
| Insurance Reports | 13 | `insurance.claims_list`, `insurance.capitation_utilization`, `insurance.claims_created_not_sent`, `insurance.procedures_on_hold`, `insurance.dps_eligibility_report`, `insurance.capitation_payment`, `insurance.benefits_used_unused`, `insurance.outstanding_claims`, `insurance.claims_not_created`, `insurance.unbilled_report_due_to_no_insurance`, `insurance.eob_835_claims_reconcile_report`, `insurance.835_denial_report`, `insurance.rte_sweep_details` |
| New analytics and control reports | 21 | `analytics.production_trend_mix` (RPT-NEW-10), `analytics.collections_trend_mix` (RPT-NEW-12), `analytics.payment_lag` (RPT-NEW-13), `analytics.adjustment_writeoff_analysis` (RPT-NEW-14), `monthly.ar_trend` (RPT-NEW-15), `management.time_of_service_collection` (RPT-NEW-16), `management.payment_plan_portfolio` (RPT-NEW-17), `analytics.fee_realization` (RPT-NEW-18), `insurance.payer_mix_profitability` (RPT-NEW-19), `insurance.claim_cycle_performance` (RPT-NEW-20), `daily.day_close_reconciliation` (RPT-NEW-23), `management.provider_pay_basis` (RPT-NEW-25), `insurance.claims_backlog_trend` (RPT-NEW-26), `insurance.estimate_accuracy_analysis` (RPT-NEW-27), `statements.statement_collection_effectiveness` (RPT-NEW-28), `management.time_clock_exceptions` (RPT-NEW-77), `management.patient_report_access` (RPT-NEW-79), `management.transaction_exceptions` (RPT-NEW-80), `management.user_activity_review` (RPT-NEW-81), `management.data_quality_exceptions` (RPT-NEW-82), `management.report_usage` (RPT-NEW-84) |
| Worklist | 1 | `worklists.day_close_checklist` (DASH-55) |
| Dashboards | 4 + v2 | `dashboards.production`, `dashboards.collections_ar`, `dashboards.insurance_rcm`, `dashboards.executive_summary`; Main and Provider v2 (DASH-16) |

### Tests and reconciliation checks that must be green

| Check | Source | Gate |
|---|---|---|
| R-08 collections part, R-09 deposit part, R-11, R-17 | 03 §10 | Exit |
| I-4..I-6 under both allocation units; outstanding claims = all-tier report total | MET-10, MET-11 | Exit |
| Cross-report reconciliation: Executive Summary Show AR = Aging Report total; Income Allocation roll-forward | RPT-MONTHLY-08, RPT-MONTHLY-42 | Exit |
| Fault tier for the background path: lost / duplicated task, worker killed mid-run, 120 s statement while the tick runs twice, render killed mid-file, definition-version mismatch at claim | ENG-38, ENG-40, 02 §15.1 | Deploy gate |
| A 500 k-row export completes without an API instance; a 7,800-account statement office yields 16 PDF volumes | ENG-38, RPT-STMT-08 | Exit |
| Schedules: catch-up with recorded misses, auto-pause, scope lost pauses delivery, e-mail carries no PHI | ENG-43, SEC-25 | Exit |
| Parity default tests and live-legacy checklists of the three families | RPT-MONTHLY-07, RPT-INS-09, RPT-MGMT-01..04 | Deploy gate |
| Legacy output comparison for a closed month: Executive Summary, Aging Report, Aging by Home Office, Outstanding Claims (section 6.6) | Section 6 | Exit |

### Exit criteria

| # | Verifiable statement |
|---|---|
| EX2-1 | Each of the 26 P2 legacy reports runs on the main client with legacy defaults; parity default tests pass, except the known gaps of EX2-1b |
| EX2-1b | Known P2 parity gaps, each recorded with the item that closes it: CREATE TASK of Outstanding Claims (RPT-INS-07) and the bulk part of RPT-INS-77 → DASH-28, ENG-49, SEC-36 (P3); bulk parts of RPT-DAILY-77, RPT-MGMT-11, RPT-MGMT-13 → ENG-49 / SEC-36 (P3); recall mode of Benefits Used/Unused (RPT-INS-05) → DATA-41 (P3); referral block of the Executive Summary (RPT-MONTHLY-12) and RPT-NEW-82 → DATA-40 (P3); comparison period of RPT-MONTHLY-14 → FLT-26 (P4) |
| EX2-2 | For a locked month, Aging Report and Aging by Home Office reproduce their month-end snapshot after a later back-dated edit; the difference appears in `rpt_snapshot_variances` |
| EX2-3 | A tenant-wide ageing runs in the background and the requester gets an in-app notification; the API instance is not used for execution |
| EX2-4 | A scheduled report delivers an in-app notification and a link-only e-mail; a recipient without the right receives nothing |
| EX2-5 | A write into a closed day is rejected; an administrator override is audited |
| EX2-6 | `/reports/aging` and `/reports/accounts-receivable` answer from the canonical-ledger metrics and carry the `deprecated` mark; they are removed in the first release after every client in the client registry has `monthly.aging_report` enabled and has passed its legacy output comparison (7.3) |
| EX2-7 | Worker, queues and bucket exist on every client where `REPORT_BACKGROUND_ENABLED` is true, created by `scripts/provision_reporting.sh` |
| EX2-8 | Each of the 21 new analytics and control reports of E2.17 has its golden cases green and is active on the main client; RPT-NEW-27 carries the estimate caveat until DATA-49 (G-02) |
| EX2-9 | `dashboards.production`, `dashboards.collections_ar`, `dashboards.insurance_rcm`, `dashboards.executive_summary` and Main / Provider v2 return a value or a named state for every tile on the UAT database (DASH-12..DASH-16 acceptance) |
| EX2-10 | `worklists.day_close_checklist` lists each unclosed office-day with its checks and closing the day removes the row (DASH-55) |

---

## P3 - Scheduling, clinical, patients and lists

### Goal and user outcome

Appointment, Treatment Plan, Referral, Recall, Ortho and all Lists at parity; Morning Huddle; worklists with follow-ups
and bulk outreach. **A user can** run the 70 remaining legacy reports, work recall, unscheduled-treatment, claims and
A/R worklists with outcomes and assignments, send bulk texts, e-mails and letters from a list, and open the Morning
Huddle and the topic dashboards. P3 is the heaviest phase (303 backend items); it runs as three report waves beside a
worklist stream. The waves' definitions are independent of the worklist stream; their action tails are not (build
order step 2a).

### Entry criteria

| # | Criterion |
|---|---|
| EN3-1 | P2 exit met on the main client; background runs enabled there |
| EN3-2 | Decisions needed in P3 recorded: visit definition (03 O-5), ortho patient rule (O-3), contract-billing codes (O-4), worklist bulk signing (06 D-11), next available appointment search (06 D-7), Reports (Old) entries (RPT-MENU-14) |
| EN3-3 | Live legacy verification answers of FLT-23 available for the P3 families |

### Epics

| Epic | Name | Track | Work items | Size total | Depends on epics |
|---|---|---|---|---|---|
| E3.01 | Treatment item stamps, recall engine, ortho, capacity and communication facts, SmartAssist | T1 | DATA-39, DATA-41..DATA-43, DATA-54 | 3L 2M = 40 d | earlier: E0.04, E1.02, E1.03, E1.04, E2.04 |
| E3.02 | Referral model, patient lifecycle, list datasets, tenant_id batch 2 | T1 | DATA-40, DATA-44..DATA-46 | 1L 3M = 25 d | earlier: E0.04, E1.01 |
| E3.03 | Live keyset paging, row and bulk actions, P3 option sources, code picker resolution | T2 | ENG-48, ENG-49, FLT-09, FLT-25, SEC-36 | 4M 1S = 22 d | E3.01, E3.02; earlier: E0.10, E0.11, E0.12, E0.13, E1.02; FE: FLT-13 |
| E3.04 | Scheduling, hygiene, case acceptance, patients, goals, clinical-mix and front-office packs; preset parity | T5 | MET-13..MET-20 | 3L 4M 1S = 52 d | E3.01, E3.02; earlier: E0.17, E1.02, E1.04, E1.09, E2.09 |
| E3.05 | Worklist backend, membership sync, bulk outreach, the 17 P3 worklists (backend parts) | T5 | DASH-28, DASH-29, DASH-31..DASH-36 | 5L 3M = 65 d | E3.01, E3.03, E3.04; earlier: E0.13, E1.02, E1.03, E1.04, E1.10, E2.01, E2.03, E2.04, E2.05, E2.07; FE: DASH-30 |
| E3.06 | Goals service; Morning Huddle and topic dashboards (definitions) | T5 | DASH-18, DASH-21..DASH-27 | 1L 7M = 45 d | E3.04, E3.05; earlier: E1.04, E2.10; FE: DASH-11, DASH-20 |
| E3.07 | Security review of the P3 definitions | T6 | SEC-37 | 1M = 5 d | earlier: E0.08 |
| E3.08 | Wave 3A: Appointment and Recall families (13 reports) | T4 | RPT-APPT-01..RPT-APPT-22, RPT-APPT-40..RPT-APPT-42, RPT-APPT-45, RPT-APPT-46, RPT-APPT-50..RPT-APPT-52, RPT-APPT-55..RPT-APPT-57, RPT-APPT-60..RPT-APPT-62, RPT-RECALL-01..RPT-RECALL-17 | 3L 19M 31S = 187 d | E3.01, E3.02, E3.03, E3.04, E3.05, E3.06; earlier: E0.02, E0.04, E0.07, E0.08, E0.09, E0.10, E0.11, E0.13, E0.14, E0.15, E0.16, E0.17, E1.02, E1.03, E1.04, E1.05, E1.06, E1.08, E1.09, E2.03, E2.07; FE: UX-17, UX-19, UX-22, UX-39 |
| E3.09 | Wave 3B: Treatment Plan, Ortho and Referral families (17 reports) | T4 | RPT-ORTHO-01..RPT-ORTHO-07, RPT-ORTHO-10..RPT-ORTHO-17, RPT-REF-01..RPT-REF-08, RPT-REF-10..RPT-REF-12, RPT-REF-14..RPT-REF-22, RPT-REF-40..RPT-REF-48, RPT-TX-01..RPT-TX-05, RPT-TX-10..RPT-TX-15, RPT-TX-17, RPT-TX-18 | 3L 17M 37S = 189 d | E3.01, E3.02, E3.03, E3.04, E3.05, E3.06, E3.07; earlier: E0.02, E0.04, E0.05, E0.07, E0.08, E0.09, E0.10, E0.11, E0.15, E0.16, E1.02, E1.03, E1.05, E1.06, E2.01, E2.03, E2.04; FE: DASH-30, FLT-13, UX-22 |
| E3.10 | Wave 3C: Patient, Provider, Security and Setup lists (40 reports) | T4 | RPT-PLIST-01..RPT-PLIST-20, RPT-PLIST-40..RPT-PLIST-55, RPT-PRLIST-01..RPT-PRLIST-13, RPT-PRLIST-15..RPT-PRLIST-18, RPT-SLIST-01..RPT-SLIST-16, RPT-STLIST-01..RPT-STLIST-25, RPT-STLIST-40..RPT-STLIST-61 | 3L 28M 85S = 340 d | E3.02, E3.03, E3.04, E3.05, E3.07, E3.11; earlier: E0.03, E0.04, E0.06, E0.07, E0.08, E0.09, E0.10, E0.11, E0.15, E0.16, E1.01, E1.02, E1.03, E1.04, E1.05, E1.06, E1.16, E2.01, E2.03, E2.04, E2.05, E2.07, E2.09, E2.11; FE: DASH-11, FLT-12, FLT-15, UX-22..UX-24 |
| E3.11 | Row and bulk actions on the P1 / P2 families | T4 | RPT-DAILY-25, RPT-DAILY-74, RPT-DAILY-82, RPT-INS-16, RPT-INS-19, RPT-INS-42, RPT-INS-45, RPT-INS-48, RPT-INS-54, RPT-INS-71, RPT-MONTHLY-21, RPT-MONTHLY-47, RPT-STMT-23 | 6M 7S = 44 d | E3.03, E3.05; earlier: E0.08, E0.13, E1.05, E1.13, E1.16, E2.07, E2.13, E2.15 |
| E3.12 | New analytics reports, P3 (18) | T4 | RPT-NEW-21, RPT-NEW-22, RPT-NEW-40..RPT-NEW-48, RPT-NEW-51, RPT-NEW-52, RPT-NEW-71..RPT-NEW-74, RPT-NEW-76 | 6L 12M = 120 d | E3.01, E3.02, E3.04; earlier: E0.04, E0.06, E0.17, E1.02, E1.03, E1.04, E1.06, E2.03, E2.04, E2.17; **later phase: E4.01 (DATA-48), E4.03 (MET-27)** |
| E3.13 | Correspondence print, labels, recipient lists, forms, Reports (Old) decisions (FE-led inside: RPT-MENU-09) | T4 | RPT-MENU-06..RPT-MENU-10, RPT-MENU-13, RPT-MENU-14 | 3L 4M = 50 d | E3.01, E3.03, E3.05; earlier: E0.04, E0.13, E0.16, E1.02, E1.04, E1.05, E1.17, E2.01, E2.05, E2.18; FE: FLT-10 |
| **Total** | 303 backend items | | | **31L 110M 162S = 1184 d** | |

Frontend-only items of the phase: DASH-19, DASH-20, DASH-30, DASH-54, UX-38..UX-40, UX-42.

### Build order

1. **First two weeks of the phase:** ENG-49 → SEC-36 (row and bulk actions; they also release the held action parts of
   five P2 items) and ENG-48 (live keyset paging). FLT-09 option sources. DATA-40, DATA-41, DATA-42, DATA-44, DATA-45
   start in parallel; DATA-46 (tenant batch 2) runs as an operations stream through the phase.
2. **Worklist stream (cross-team critical path, 47 engineer-days: ENG-49 → SEC-36 → DASH-28 → DASH-30 → DASH-33 →
   DASH-21):** ENG-49 → SEC-36 → DASH-28 → {DASH-29 (after ENG-43) ‖ DASH-31 (after ENG-38, ENG-49) ‖ **DASH-30 hand-off
   milestone** (frontend worklist screens, L, `11_frontend_plan.md` F3.1)} → DASH-32, DASH-33, DASH-35 (after DASH-30),
   DASH-34 (after DASH-30 and DASH-31) → DASH-36 (after DASH-30, DASH-32). RPT-ORTHO-11 also waits for DASH-30. The held
   P2 actions (RPT-DAILY-77, RPT-INS-07, RPT-INS-77, RPT-MGMT-11, RPT-MGMT-13) are completed right after DASH-28.
   2a. **Action tails of the waves** (one closing batch after DASH-31 / DASH-33 / DASH-34): RPT-APPT-07, RPT-APPT-14,
   RPT-RECALL-05, RPT-TX-14, RPT-PLIST-18 and the other wave items that depend on a DASH or MET item. Wave exit criteria
   (EX3-6) are set on the definitions part; the tails close with EX3-3.
3. **Wave 3A — Appointment and Recall** (on DATA-16, DATA-17 from P1, DATA-41, DATA-43, DATA-54): RPT-APPT-01..06 →
   the definitions; RPT-RECALL-01..04, RPT-RECALL-09 (back-fill of `appointment_procedures`) → definitions →
   RPT-RECALL-17; actions (RPT-APPT-07, RPT-APPT-14, RPT-RECALL-05) in the tail batch of step 2a.
4. **Wave 3B — Treatment Plan, Ortho, Referral** (on DATA-39, DATA-40, DATA-42): RPT-TX-01..04 → RPT-TX-10..18;
   RPT-ORTHO-01..04 → RPT-ORTHO-10..17; RPT-REF-01, 07, 08 → definitions → umbrellas RPT-REF-03 and RPT-REF-06.
5. **Wave 3C — Lists** (on DATA-05, DATA-44, DATA-45; mostly S items, suitable for parallel work): Setup lists
   (RPT-STLIST, 47 items), Patient lists (RPT-PLIST), Provider lists (RPT-PRLIST), Security lists (RPT-SLIST, after
   SEC-37 review of the security classes).
6. **Metrics and dashboards:** MET-13 (DATA-16, 17, 55), MET-14 (DATA-41), MET-15, MET-16, MET-17 (goals) → DASH-18 →
   DASH-22..DASH-27 → DASH-21 (Morning Huddle last: it needs DASH-33 and the goal metrics); MET-18, MET-19, MET-20.
7. **New analytics** (E3.12) after their datasets; RPT-NEW-48 and RPT-NEW-76 wait for P4 items (G-02).
8. **Correspondence** (E3.13): RPT-MENU-06, RPT-MENU-07, RPT-MENU-08 → RPT-MENU-09 (FE-led) → RPT-MENU-10; RPT-MENU-13,
   RPT-MENU-14 in parallel.

### Database changes in apply order

| # | Change | Kind | Item | Check |
|---|---|---|---|---|
| 1 | `worklist_followups`, `worklist_events`, `worklist_outcome_codes` | Deploy revision | DASH-28 | Unique cycle key |
| 2 | `treatment_plan_items.office_id`, `accepted_date` stamping, `treatment_plans.is_deleted`; status normalisation | Deploy revision + `normalize_treatment_item_statuses.py` | DATA-39, RPT-TX-02 | #19 |
| 3 | `patients.referral_source_id`, `referral_date`; `referrals.source_category`, `is_active`, `updated_at`, `source_type_code`; `referral_cases`; `rpt_referral_facts` | Deploy revision + writers + view | DATA-40, RPT-REF-18 | #38 (referral duplicates) |
| 4 | `patient_recalls.tenant_id`, `appointment_id`, `source`; recall engine; `rpt_recall_due()`; back-fill of `appointment_procedures` for migrated appointments | Deploy revision + code + function + operations back-fill | DATA-41, RPT-RECALL-02, RPT-RECALL-09 | Recall fixture set (RPT-RECALL-04) |
| 5 | `ortho_plans.contract_status`, `ortho_status_code`, `debond_date`; `ortho_visits`; `rpt_ortho_contracts`, `rpt_ortho_visit_audit()` | Deploy revision + views | DATA-42, RPT-ORTHO-02, RPT-ORTHO-16 | Ortho fixture set (RPT-ORTHO-04) |
| 6 | `appointments.appointment_type_id`; `office_schedule_days.effective_from` / `effective_to` or the daily capacity snapshot; `rpt_communication_facts` | Deploy revision + views | DATA-43 | Columns exist (`information_schema`); lint Datasets rule for `rpt_communication_facts`; I-7 on the capacity fixture |
| 7 | Patient lifecycle fields (`deleted_at`, `deleted_by`, `inactivated_at`, `inactive_reason`, `registration_source`, `registration_status`, `activated_at`); vocabulary normalisation | Deploy revision + `rpt_value_map` rows | DATA-44 | #20 |
| 8 | `providers.updated_at`, `license_state`, `license_expires_on`, `dea_expires_on`; `operatories.operatory_type`; list datasets; `insurance_plans.created_by_user_id` + back-fill; `account_holidays.open_time`, `close_time`; per-tenant default coverage limits | Deploy revision + views + back-fill | DATA-45, RPT-STLIST-41, RPT-STLIST-54, RPT-STLIST-56 | Columns exist (`information_schema`); lint Datasets rule for the list datasets; `created_by_user_id` null count after the back-fill recorded |
| 9 | Index `patient_insurance (ins_plan_id)` | Operations step `scripts/ops/`, concurrent | RPT-STLIST-45 | `indisvalid` true; plan of the usage anti-join uses it |
| 10 | `office_smart_assist_items.consent_template_id`; `rpt_smart_assist_checks()` | Deploy revision + function | DATA-54 | Column exists; function result on the SmartAssist fixture equals the hand-checked list |
| 11 | `tenant_id` on `treatment_plans`, `treatment_plan_items`, `progress_notes`, `patient_recalls`, `patient_insurance`, `perio_exams`, `prescriptions`, `operatories`, `user_offices`, and the remaining indexes | Same NOT NULL protocol as DATA-15 (operations steps) | DATA-46 | `attnotnull` true on every client database of the client registry; the tenant predicate is switched to the column only in the release after every client's change ledger shows the constraint |

### API endpoints delivered

| Rows of 02 §13 | Endpoints | Item |
|---|---|---|
| 14 | `POST /reports/runs/{run_id}/actions/{action_key}` for every row and bulk action (snapshot-resolved selections, exclusion counts) | ENG-49, SEC-36 |
| 21 | `POST /reports/live/{report_key}/rows` (keyset paging for worklists and live lists) | ENG-48 |
| 62 | `GET` / `PUT /analytics/goals` | DASH-18 |
| Worklist actions | Log outcome, assign, snooze, resolve, bulk outreach hand-off through the owning service layers | DASH-28, DASH-31 |
| Retired / adapted | `/reports/insurance-verification-summary` replaced by the eligibility worklist; lab-case report routes become adapters of `appointment.lab_report` / `appointment.lab_cost_report` | 02 §14, RPT-APPT-61 |

### Reports delivered

| Category | Count | report_keys |
|---|---|---|
| Appointment Reports | 9 | `appointment.appointment_list`, `appointment.missed_appointments_not_marked_as_missed`, `appointment.new_patients_via_appointments`, `appointment.lab_report`, `appointment.smartassist_report_card`, `appointment.appointments_confirmed_via_vendors`, `appointment.appointment_time_stamps`, `appointment.appointment_detail`, `appointment.lab_cost_report` |
| Treatment Plan Reports | 4 | `treatment_plan.treatment_plan_proposal`, `treatment_plan.treatment_plan_status`, `treatment_plan.treatment_plan_analysis`, `treatment_plan.treatment_plan_detail` |
| Referral Reports | 8 | `referral.referral_production_list`, `referral.referred_out_list`, `referral.referral_source_list`, `referral.external_outgoing_referral_management`, `referral.referral_summary_report`, `referral.referral_count_summary`, `referral.internal_referral_management`, `referral.external_incoming_referral_management` |
| Recall Reports | 4 | `recall.procedural_recall_report`, `recall.scheduled_recall_report`, `recall.recall_due_report`, `recall.post_op_report` |
| Ortho Reports | 5 | `ortho.ortho_compliance_report`, `ortho.ortho_daily_journal`, `ortho.patients_by_ortho_status_with_time_in_treatment`, `ortho.ortho_report`, `ortho.missing_ortho_visits` |
| Lists › Patient | 12 | `lists.update_patient_insurance_conversion_list_by_appointment`, `lists.patient_list`, `lists.patient_list_new_patient`, `lists.patients_seen`, `lists.patients_notes`, `lists.patient_list_grouped_by`, `lists.patients_on_payment_plan`, `lists.online_registered_patients`, `lists.responsible_party_list`, `lists.responsible_party_sent_to_collection`, `lists.responsible_party_statements_sent`, `lists.responsible_party_email_statement_error_report` |
| Lists › Provider | 4 | `lists.provider_list`, `lists.provider_holidays`, `lists.provider_operatory`, `lists.provider_registration` |
| Lists › Security | 4 | `lists.user_list`, `lists.group_list`, `lists.group_rights_list`, `lists.user_group_membership` |
| Lists › Setup | 20 | `lists.employer_list`, `lists.insurance_plan_list`, `lists.carrier_list`, `lists.inactive_plans_list`, `lists.drug_list`, `lists.procedure_codes_list`, `lists.explosion_codes_list`, `lists.procedure_codes_by_fee_schedule`, `lists.credit_codes_report`, `lists.fee_schedule_list`, `lists.capitation_fee_schedule`, `lists.office_list`, `lists.office_holidays`, `lists.operatory_list`, `lists.ada_categories_list`, `lists.default_ins_plan_coverage_category_list`, `lists.document_types_list`, `lists.notes_macro_category_list`, `lists.notes_macros_list`, `lists.patient_types_list` |
| New analytics reports | 18 | `insurance.denial_analysis` (RPT-NEW-21), `insurance.eligibility_verification_compliance` (RPT-NEW-22), `appointment.schedule_utilization` (RPT-NEW-40), `appointment.broken_appointment_analysis` (RPT-NEW-41), `appointment.patient_flow_times` (RPT-NEW-42), `recall.recare_effectiveness` (RPT-NEW-43), `analytics.clinical_mix` (RPT-NEW-44), `treatment_plan.clinical_follow_through_gaps` (RPT-NEW-45), `treatment_plan.case_acceptance_funnel` (RPT-NEW-46), `analytics.new_patient_acquisition` (RPT-NEW-47), `analytics.patient_retention_cohorts` (RPT-NEW-48), `appointment.lab_case_performance` (RPT-NEW-51), `ortho.ortho_contract_health` (RPT-NEW-52), `analytics.goal_attainment` (RPT-NEW-71), `referral.referral_source_return` (RPT-NEW-72), `analytics.online_booking_funnel` (RPT-NEW-73), `analytics.communication_effectiveness` (RPT-NEW-74), `management.staff_productivity` (RPT-NEW-76) |
| Worklists | 17 new in P3 (19 in 06 §6 with `worklists.not_reappointed` of P1 and `worklists.day_close_checklist` of P2) | `worklists.eligibility_verification`, `worklists.unsigned_progress_notes` (DASH-32); `worklists.unconfirmed_appointments`, `worklists.broken_appointments`, `worklists.unresolved_appointments`, `worklists.todays_patients`, `worklists.lab_cases_due` (DASH-33); `worklists.unscheduled_treatment`, `worklists.recall_due`, `worklists.reactivation` (DASH-34); `worklists.outstanding_claims`, `worklists.denied_claims`, `worklists.patient_ar`, `worklists.unallocated_credits`, `worklists.unbilled_procedures`, `worklists.payment_plan_overdue` (DASH-35); `worklists.my_followups` view (DASH-36) |
| Dashboards | 8 | `dashboards.morning_huddle`, `dashboards.schedule_capacity`, `dashboards.hygiene_recall`, `dashboards.treatment`, `dashboards.patients`, `dashboards.referrals_marketing`, `dashboards.ortho`, `dashboards.front_office`; the goals page data (DASH-18) is not a dashboard. Across phases: 3 (P1) + 4 (P2) + 8 (P3) + 1 (P4) = 16 = `plan_inputs/facts.md` |

### Tests and reconciliation checks that must be green

| Check | Source | Gate |
|---|---|---|
| I-7 (appointment classes), I-8 (funnel), legacy preset parity of 05 §7 | MET-13, MET-15, MET-20 | Exit |
| R-15 on the extended appointment facts; recall and ortho fixture sets on the PostgreSQL tier | DATA-41, DATA-42, RPT-RECALL-04, RPT-ORTHO-04 | Exit |
| Live keyset paging over NULLs and mixed directions; tampered and foreign cursors | ENG-48, 02 §15.7 | Deploy gate |
| Bulk action caps (200 per job for status actions), consent exclusions, write-back to the event log | DASH-28, DASH-31 | Exit |
| Security review of the P3 definitions, security lists, single-patient and referral scope | SEC-37 | Exit |
| Parity default tests and live-verification checklists of all P3 families | FLT-20, family items | Deploy gate |
| Legacy output comparison: Appointment List, Recall Due, Treatment Plan Status, Patient List, Referral Summary for the same period | Section 6 | Exit |

### Exit criteria

| # | Verifiable statement |
|---|---|
| EX3-1 | All 118 legacy reports are registered and active; the lint's legacy-coverage rule passes with no phase-map exception |
| EX3-2 | Each worklist's total equals its metric (`unscheduled_treatment_amount`, `recall_due_unscheduled_patients`, outstanding total) for the same scope |
| EX3-3 | A bulk text to 500 selected patients skips the opted-out and no-number patients and writes one event per patient |
| EX3-4 | `dashboards.morning_huddle` returns a value or a named state for every tile at 07:00 office time on the UAT database |
| EX3-5 | `tenant_id` is NOT NULL on the nine tables of DATA-46 on every client database in the client registry |
| EX3-6 | Each P3 legacy definition (waves 3A-3C) passes its parity default test and golden cases and is active on the main client; each of the 18 new analytics reports of E3.12 has its golden cases green and is active, except RPT-NEW-48 and RPT-NEW-76 (G-02) |
| EX3-7 | Each of the seven topic dashboards of P3 returns a value or a named state for every tile on the UAT database (DASH-22..DASH-27 acceptance) |
| EX3-8 | The known P2 parity gaps of EX2-1b closed by P3 items are closed: CREATE TASK of RPT-INS-07 and the bulk parts of RPT-INS-77, RPT-DAILY-77, RPT-MGMT-11, RPT-MGMT-13 work on the main client; RPT-INS-05 offers the recall mode; RPT-MONTHLY-12 and RPT-NEW-82 use DATA-40 attribution |
| EX3-9 | Each of the 17 P3 worklists returns rows on the UAT database and passes its acceptance (DASH-32..DASH-36) |

---

## P4 - Analytics depth

### Goal and user outcome

Roll-ups and snapshots, goals overlays, targets and bands, ranked scorecards, multi-office comparison and alerts.
**A user can** compare offices with same-store growth, see ranked provider scorecards with peer markers, set targets
and bands, get alerted when a metric enters a bad band, and open dashboards that answer from roll-ups in about a second.

### Entry criteria

| # | Criterion |
|---|---|
| EN4-1 | P3 exit met on the main client |
| EN4-2 | Trigger overhead measured on the charge-entry path (03 risk 9) on a production-size copy |
| EN4-3 | Decisions: alert payload (06 D-4), benchmarks in product (05 D-9), peer thresholds (08 OD-15) |

### Epics

| Epic | Name | Track | Work items | Size total | Depends on epics |
|---|---|---|---|---|---|
| E4.01 | Roll-up tables and refresh engine, activity and point-in-time snapshots, claim estimate snapshot | T1 | DATA-47..DATA-49 | 1XL 1L 1M = 35 d | earlier: E0.07, E1.02, E2.01, E2.03 |
| E4.02 | Metric service on roll-ups, ranking and goal overlays, comparison period, roll-up sources | T5 | ENG-50, ENG-51, FLT-26, MET-22 | 1L 3M = 25 d | E4.01; earlier: E0.09, E1.08, E2.08 |
| E4.03 | Targets, bands, benchmarks; multi-office metrics; P4 analytics pack | T5 | MET-21, MET-23, MET-27 | 1L 2M = 20 d | E4.01, E4.02; earlier: E0.17, E1.09, E2.09 |
| E4.04 | Condition-based schedules, alerts and digests | T3 | DASH-41, DASH-42, ENG-52, SEC-39 | 1L 2M 1S = 22 d | E4.02, E4.03; earlier: E2.07, E2.09, E2.10 |
| E4.05 | Scorecard v2, office comparison, matrix compare, outreach results, snapshot trends (backend parts) | T5 | DASH-38..DASH-40, DASH-43, DASH-45, SEC-38 | 2L 3M 1S = 37 d | E4.01, E4.02, E4.03; earlier: E2.09, E2.10, E3.04, E3.05; FE: DASH-03, DASH-11 |
| E4.06 | P4 reports and enhancements | T4 | RPT-DAILY-24, RPT-DAILY-46, RPT-MENU-11, RPT-NEW-11, RPT-NEW-24, RPT-NEW-49, RPT-NEW-50, RPT-NEW-53, RPT-NEW-70, RPT-NEW-75, RPT-NEW-85, RPT-PRLIST-14, RPT-REF-09, RPT-REF-13, RPT-REF-49, RPT-REF-50, RPT-TX-16 | 4L 9M 4S = 93 d | E4.01, E4.02, E4.03, E4.05; earlier: E1.02, E1.04, E1.08, E1.13, E2.01, E2.02, E2.17, E2.18, E3.01, E3.02, E3.03, E3.04, E3.05, E3.09, E3.10 |
| **Total** | 37 backend items | | | **1XL 10L 20M 6S = 232 d** | |

Frontend-only items of the phase: DASH-37, DASH-44, UX-41, UX-47.

### Build order

1. DATA-47 (XL): roll-up tables, `rpt_refresh_log`, `rpt_dirty_keys`, `rpt_freshness`, triggers on every table of
   03 §9.2, nightly job `rpt-<c>-nightly` (`… refresh`), R-16 control after every rebuild. In parallel DATA-48, DATA-49.
2. ENG-50 → ENG-51 → MET-23 → DASH-38 → DASH-39 (critical path, 45 engineer-days); MET-22 after DATA-47 and ENG-50;
   FLT-26 after ENG-32; MET-21 early (targets and bands feed alerts and scorecards).
3. ENG-52 → SEC-39 → DASH-41 → DASH-42.
4. DASH-40 (switch dashboards to roll-up sources) only after R-16 has held for 14 nightly rebuilds on the client.
5. Reports of E4.06 after their datasets; RPT-NEW-50 and RPT-NEW-70 after ENG-51 / MET-23.

### Database changes in apply order

| # | Change | Kind | Item | Check |
|---|---|---|---|---|
| 1 | `metric_targets`, `metric_benchmarks` | Deploy revision | MET-21 | Mis-ordered bands rejected |
| 2 | `rpt_refresh_log`, `rpt_dirty_keys` (+ `uq_rpt_dirty_keys`), view `rpt_freshness` | Deploy revision | DATA-47 | Tables, unique index and view exist; a duplicate dirty key is absorbed by `uq_rpt_dirty_keys` |
| 3 | Roll-up tables of 03 §9.1 (`rpt_daily_production`, `rpt_daily_adjustments`, `rpt_daily_collections`, `rpt_daily_allocated_collections`, `rpt_daily_appointments`, `rpt_daily_visits`, `rpt_daily_provider_visits`, `rpt_patient_activity_summary`) | Deploy revision, empty | DATA-47 | Tables exist and `information_schema.columns` equal the lint declarations (ENG-18 Datasets rule) |
| 4 | First full rebuild per client (job), then `ANALYZE` | Operations job | DATA-47 | R-16 |
| 5 | Row-level dirty-key triggers on the money rows, `payment_allocations`, `patient_opening_balances` and the other tables of 03 §9.2 (first row-level triggers on OLTP write paths; `rpt.skip_dirty` honoured) | Deploy revision, per client after the overhead measurement | DATA-47 | R-16 after the scripted edit sequence |
| 6 | `rpt_scheduled_production_snapshot` and the activity snapshots | Deploy revision + job | DATA-48 | Tables exist; one snapshot row set per office-day after the first job run; insert-only probe |
| 7 | `claim_line_snapshots` | Deploy revision + writer | DATA-49 | Table exists; a new claim writes one snapshot row per line |
| 8 | `metric_alert_states` | Deploy revision | DASH-41 | Table exists; two-tenant isolation test; EX4-3 |
| 9 | `provider_holidays.end_date` and recurrence columns | Deploy revision | RPT-PRLIST-14 | Columns exist (`information_schema`); existing rows read as single-day holidays |

### API endpoints delivered

| Endpoints | Item |
|---|---|
| `POST /analytics/metrics/query` with roll-up source selection, freshness and pending keys; `include[]` for goal, target, rank and benchmark overlays | ENG-50, ENG-51 |
| Schedules with a `metric_test` condition and per-recipient scope runs; alert acknowledge and snooze | ENG-52, DASH-41 |
| `compare_to` on opted-in report definitions | FLT-26 |

### Reports delivered

| Category | Count | report_keys |
|---|---|---|
| New analytics reports | 8 | `analytics.production_vs_schedule` (RPT-NEW-11), `analytics.cash_conversion_waterfall` (RPT-NEW-24), `analytics.patient_value` (RPT-NEW-49), `analytics.provider_scorecard` (RPT-NEW-50), `analytics.revenue_opportunity` (RPT-NEW-53), `analytics.office_comparison` (RPT-NEW-70), `analytics.outreach_results` (RPT-NEW-75), `analytics.cross_office_patient_flow` (RPT-NEW-85) |
| Enhancements of existing reports | 8 items | RPT-DAILY-24, RPT-DAILY-46, RPT-REF-09, RPT-REF-13, RPT-REF-49, RPT-REF-50, RPT-TX-16, RPT-MENU-11 (advanced letter templates) |
| Dashboards | 1 | `dashboards.multi_office`; all dashboards switched to roll-up sources (DASH-40) |

### Tests and reconciliation checks that must be green

| Check | Source | Gate |
|---|---|---|
| R-16 after full rebuilds and after the scripted sequence of edits, voids, back-dated inserts, a re-split, a guarantor change and a claim status change | DATA-47 | Exit |
| Identical values from roll-ups and live datasets for the additive components | MET-22, DASH-40 | Exit |
| Peer suppression: mean from 5 other providers, quantiles from 10 | SEC-38, DASH-38 | Exit |
| Performance: metric query on roll-ups ≤ 500 ms, dashboard data call ≤ 1 s (02 §15.6) | ENG-37 harness | Exit |

### Exit criteria

| # | Verifiable statement |
|---|---|
| EX4-1 | R-16 has held for 14 consecutive nightly rebuilds on the main client |
| EX4-2 | `dashboards.main` returns the same values from roll-ups as from live datasets for a closed month |
| EX4-3 | An alert fires once on entering the bad band and not again inside it |
| EX4-4 | A newly opened fixture office is excluded from same-store growth and named |
| EX4-5 | Each of the 8 new analytics reports of P4 has its golden cases green and is active on the main client |
| EX4-6 | Each of the 8 enhancement items (RPT-DAILY-24, RPT-DAILY-46, RPT-REF-09, RPT-REF-13, RPT-REF-49, RPT-REF-50, RPT-TX-16, RPT-MENU-11) passes its acceptance, and the parity default tests of the enhanced reports still pass; RPT-MONTHLY-14 offers the comparison period (closes its EX2-1b gap) |
| EX4-7 | `dashboards.multi_office` returns a value or a named state for every tile on the UAT database; every dashboard reads roll-up sources (DASH-40) |

---

## P5 - Builder and assistant

### Goal and user outcome

Custom report builder, tenant custom reports (the legacy Office Reports), custom KPIs and the assistant. **A user can**
build a report from governed datasets and publish it to colleagues, define an organisation KPI over base measures, and
ask questions that the assistant answers only through the metric registry, with the numbers verified and cited.

### Entry criteria

| # | Criterion |
|---|---|
| EN5-1 | P4 exit met on the main client |
| EN5-2 | Assistant vendor route, covered endpoint and BAA decided (08 OD-11, CR-15); kill switch per client agreed |
| EN5-3 | Office Reports of the organisation captured (RPT-MENU-01) |

### Epics

| Epic | Name | Track | Work items | Size total | Depends on epics |
|---|---|---|---|---|---|
| E5.01 | Custom-definition store, builder limits and guardrails, custom KPIs, Office Reports | T2 | DASH-51, ENG-53, ENG-54, MET-24, RPT-MENU-15, SEC-40 | 1L 5M = 35 d | earlier: E0.16, E0.17, E1.08; FE: DASH-44 |
| E5.02 | Assistant tool endpoints, grounding, controls, service, explain-this-number, narratives, evaluation | T5 | DASH-46..DASH-48, DASH-50, ENG-55, MET-25, SEC-41 | 2L 4M 1S = 42 d | earlier: E1.08, E1.09, E1.11, E2.09, E4.02 |
| **Total** | 13 backend items | | | **3L 9M 1S = 77 d** | |

Frontend-only items of the phase: DASH-49, UX-43, UX-44.

### Build order

1. Builder: ENG-53 → ENG-54 → SEC-40 → MET-24 → DASH-51 → RPT-MENU-15.
2. Assistant (critical path, 30 engineer-days): ENG-55 → MET-25 → SEC-41 → DASH-46 → DASH-47, DASH-48, DASH-50.
3. Both streams are independent; the assistant stays behind its kill switch until DASH-50 passes on the evaluation set.

### Database changes in apply order

| # | Change | Kind | Item | Check |
|---|---|---|---|---|
| 1 | `report_custom_definitions` | Deploy revision | ENG-53 | Definition change audit (SEC-40) |
| 2 | Organisation custom KPI definitions (versioned per organisation) | Deploy revision | MET-24 | Table exists; two-tenant isolation test; a version change keeps the previous version readable |
| 3 | Assistant quota and audit records (contract of 06 §8.6) | Deploy revision | DASH-46, SEC-41 | Prompt logging per 08 §9 |

### API endpoints delivered

| Rows of 02 §13 | Endpoints | Item |
|---|---|---|
| 47-53 | `/reports/custom-definitions` list, create, read / update / archive, validate, preview, publish, shares | ENG-53, ENG-54 |
| 64 | `POST /analytics/assistant/query` | ENG-55, DASH-46 |

### Reports delivered

| Category | Count | report_keys |
|---|---|---|
| Custom | per organisation | `custom.*` definitions; each captured Office Report mapped to a standard report or a custom definition (RPT-MENU-15) |

### Tests and reconciliation checks that must be green

| Check | Source | Gate |
|---|---|---|
| Only schema-valid `MetricQueryRequest`s execute; a question outside the registry is declined | DASH-46 | Exit |
| Assistant evaluation set on every registry, prompt or model change | DASH-50 | Deploy gate for assistant changes |
| Builder EXPLAIN cost gate; preview runs as a run with the same scope and classes | ENG-54, SEC-40 | Exit |
| Contributor deltas sum to the total change | DASH-47 | Exit |

### Exit criteria

| # | Verifiable statement |
|---|---|
| EX5-1 | A custom report is created, validated, previewed, published and run by a colleague with the colleague's own scope |
| EX5-2 | Every number in an assistant answer exists in the facts payload of its queries |
| EX5-3 | The assistant kill switch removes the route's effect on a client within one deploy |
| EX5-4 | A custom KPI validates, is versioned per organisation, obeys the data classes of its components and appears in `GET /analytics/metadata` (MET-24) |
| EX5-5 | Every captured Office Report runs in the hub under its legacy name or carries a signed "not needed" (RPT-MENU-15) |

---
## 5. Database change management

### 5.1 Ordering rules

| # | Rule | Why |
|---|---|---|
| O-R1 | A deploy revision contains only additive, nullable columns, new tables, new views and functions, and seeds that are small and idempotent. It never back-fills, never builds an index on a large table and never sets NOT NULL on a populated column | `alembic upgrade head` runs inside the deploy workflow before the new image rolls out [V]; a long revision blocks a release (03 risk 12) |
| O-R2 | Order: (1) schema revision, (2) view / function revision that reads the new columns with `coalesce` defaults, (3) code that writes the columns, (4) operations back-fill, (5) constraint tightening, (6) code that relies on the constraint. Step (6) ships only in a release after **every client database in the client registry** shows step (5) in its change ledger, because one image runs on every client | Every step is safe to stop after; readers never see a column that is not there |
| O-R3 | Index builds, back-fills, repairs and NOT NULL tightening are operations steps `scripts/ops/<ops_id>.py` [NEW], never revisions under `alembic/versions/`: idempotent, run per client from the runbook ahead of the release that needs them, recorded in the client change ledger. The release lists them in `scripts/ops/required.json`; the deploy preflight `scripts/ops/assert_applied.py` checks the catalog (`pg_index.indisvalid`, `pg_constraint.convalidated`, `attnotnull`) before `alembic upgrade head` and fails the deploy when one is missing. Owner: ENG-17 (tier and preflight), DATA-01 (helper) | The linear chain and the single `alembic upgrade head` of the CI step would otherwise run them inside the main client's deploy (O-R1); 03 §8 asks for index work shipped separately from code (gap G-22) |
| O-R4 | A view or function that another object depends on is changed in one revision that drops and recreates the dependants in dependency order (the DATA-01 helper owns the order) | `CREATE OR REPLACE VIEW` cannot drop or retype a column |
| O-R5 | No dataset change without a definition lint run: the lint compares dataset declarations with `information_schema.columns` of the migrated test database and fails on a changed `sql_hash` without a version bump (ENG-18) | Definitions and views cannot drift apart |
| O-R6 | Triggers (P4) are enabled per client only after the overhead measurement on the charge-entry path; bulk loads set `SET LOCAL rpt.skip_dirty = 'on'` | First row-level triggers on OLTP write paths (money rows); P0 and P2 only add immutability / insert-only triggers on engine and snapshot tables (03 risk 9) |
| O-R7 | Writers that stamp new columns ship before reports that read them; a report that needs history the stamp cannot provide declares its availability (`history_starts_on`) instead of waiting | DATA-13, DATA-17, DATA-25 capture starts on a date per client |

### 5.2 Building indexes on tables of about 1.4 million rows without blocking

Procedure per index step (03 §8, an operations step `scripts/ops/<ops_id>.py` on each client, section 5.1 O-R3):

| Step | Action |
|---|---|
| 1 | One table per step; largest tables first (`patient_procedures` about 1.37 M, `patient_payments` about 1.33 M), off-hours in the latest office time zone; the step is listed in `required.json` of the release that needs the index |
| 2 | The script opens an autocommit connection (`CREATE INDEX CONCURRENTLY` cannot run inside the transaction that `alembic/env.py` opens for every revision [V]): `SET lock_timeout = '5s'`, `SET maintenance_work_mem = '512MB'`; on a lock timeout it retries up to five times with back-off, then stops and records the failure |
| 3 | If `pg_index.indisvalid` is false for the name, `DROP INDEX CONCURRENTLY IF EXISTS <name>` first; then `CREATE INDEX CONCURRENTLY IF NOT EXISTS <name> ...` |
| 4 | Watch for transactions older than the build start (`pg_stat_activity`); application sessions idle in transaction are killed after 60 s [V]; report worker sessions use the same limit |
| 5 | `ANALYZE <table>`; record size and duration in the change ledger; the first build on the production-size copy sets the expectation (03 estimates tens of seconds [I]) |
| 6 | `EXPLAIN (ANALYZE, BUFFERS)` of the five reference queries before and after, attached to the pull request |
| 7 | Declare the index in the SQLAlchemy model (`postgresql_where`, `postgresql_include`) so that autogenerate never proposes to drop it |
| 8 | The script's `--revert` drops concurrently; refresh the schema dump used for new clients and the test tier |

NOT NULL on a populated column (DATA-15, DATA-46, DATA-11 `payment_date`): add nullable (deploy revision) → back-fill
by primary-key ranges of 10,000-20,000 rows per transaction from a script → `ADD CONSTRAINT ... CHECK (col IS NOT NULL)
NOT VALID` → `VALIDATE CONSTRAINT` → `SET NOT NULL` (uses the validated check, no table scan) → drop the check. The
tightening steps are operations steps; `ADD CONSTRAINT ... NOT VALID`, `SET NOT NULL` and the drop take an ACCESS
EXCLUSIVE lock briefly, so each runs with `SET lock_timeout = '5s'` and the same retry rule as step 2, off-hours;
`VALIDATE CONSTRAINT` takes only SHARE UPDATE EXCLUSIVE.

### 5.3 View versioning

| Rule | Mechanism |
|---|---|
| One SQL file per `rpt_*` object under `app/reporting/sql/`, applied by the DATA-01 helper from a revision | A view change = one SQL file edit + one revision (DATA-01 acceptance) |
| Dataset declarations in `rpt_metadata` mirror the object's columns | Lint rule "Datasets" (02 §15.4) |
| Definitions pin `definition_version`, `definition_hash`, `sql_hash` in `app/reports/definitions/_locks.json` | Lint rule "Versioning"; parameter changes need `param_migrations` |
| Worker and API agree on the definition version at claim | Deploy order worker, job, API; `definition_version_mismatch` with a rerun hint (02 §12.1) |
| Classification changes (new transaction-code or code-group version) take effect from `valid_from` | Full roll-up rebuild from that date in P4; frozen `rpt_metric_values` keep their `metric_version` |
| Downgrade | Each view revision's `downgrade` restores the previous SQL file content (kept in the revision) |

### 5.4 Backfill and repair runbook per client

Every repair follows the same five steps; the client registry holds one row per step and client.

| Step | Action | Evidence |
|---|---|---|
| 1 Check | Run the read-only check query of 03 §6 (`#n`) | Result stored in `rpt_data_quality` (`check_key`, `status`, `measured`) |
| 2 Decide | Office, accountant or product owner decides where the check needs a policy (`#1`, `#5`, `#6`, `#24`, `#35`) | Decision recorded with the check (`note`, `checked_by`) |
| 3 Back up | Cloud SQL on-demand backup of the client database before any `--apply` | Backup id in the change ledger |
| 4 Apply | Script in dry-run mode first, then `--apply`, in batches, idempotent (pattern of `scripts/backfill_*.py`, `scripts/import_legacy_responsible_parties.py`) | Script output attached |
| 5 Re-check | Re-run the check; status `pass`, or `waived` with the measured gap | `rpt_data_quality` row updated |

Per-phase repair sets (the **P0 check list** referenced by P0 build order step 2, EX0-10 and the DATA-02 table row):
P0 — #1-#13, #21, #22, #24, #28-#32, #35, #38, #39 (DATA-03, DATA-04, DATA-05, DATA-07, DATA-10, DATA-11, DATA-57), with
#27 recorded as an inventory (no repair); DATA-02 writes a row for #1-#39 but only this list gates P0. P1 — checks #14,
#18, #25, #36 and #37 (DATA-12, DATA-16, DATA-23, DATA-53); P2 — #15, #16, #17, #23, #26, #33, #34 (DATA-31, DATA-32, DATA-37);
P3 — #19, #20 (DATA-39, DATA-44). Not repairable in the database without a Denticon re-export (DATA-50): treatment-plan
history, recalls, ortho contracts and contract billing, appointment created / confirmation stamps, patient creation
date, per-line legacy insurance amounts; those reports declare `history_starts_on`.

### 5.5 Rollback

| Change kind | Rollback |
|---|---|
| Additive column or table | Leave in place (no reader depends on it before the code that writes it); `downgrade` only on a failed release |
| View / function | Revision `downgrade` restores the previous SQL; definitions keep working because their `sql_hash` lock pins the expected shape |
| Index | `DROP INDEX CONCURRENTLY` (`--revert` of the operations step) |
| Constraint tightening (NOT NULL, validated checks) | Image rollback only to releases that already contain the writers / insert hooks of the column; otherwise `ALTER TABLE ... DROP CONSTRAINT` / `ALTER COLUMN ... DROP NOT NULL` first, recorded in the change ledger, then roll the image back |
| Behaviour change on existing screens (DATA-07 balance unification, DATA-29 write guards, RPT-STMT-04 statement lock) | Tenant-level flag per client, switched off without a deploy; the bridge report explains the delta |
| Data repair | Restore from the step-3 backup into a scratch database and re-apply the affected rows by primary key; scripts are idempotent, so a partial run is completed, not undone |
| Engine as a whole | `REPORTS_ENGINE_ENABLED=false` (router-level 404); engine tables stay |
| Rights enforcement | `REPORT_RIGHTS_ENFORCED=false` with a new `REPORT_RIGHTS_SHADOW_UNTIL` re-opens only the grace list (08 §3.5) |
| Triggers (P4) | `ALTER TABLE ... DISABLE TRIGGER`; roll-ups fall back to the nightly full rebuild |

---

## 6. Test strategy in delivery order

| Order | Layer | First phase | Content | Gate |
|---|---|---|---|---|
| 6.1 | PostgreSQL test tier | P0 (ENG-17) | `postgres:15` container, committed `tests/pg/baseline_schema.sql` restored into a template, stamped, `alembic upgrade head` (creates the `rpt_*` objects through the DATA-01 helper), per-session clone with `CREATE DATABASE ... TEMPLATE`; `Base.metadata.create_all` never used for real databases; nightly migration smoke against a refreshed dump of the main client's schema; fault-injection harness with a fake queue transport | CI job before the migration step; `tests/reports/**` and the lint gate the deploy |
| 6.2 | Golden datasets | P0 (`golden_small`), P1 (`golden_large`, ENG-37) | `golden_small`: 2 tenants, 3 offices in 2 zones, 6 providers, 6 users with different scopes, about 200 patients, both sign conventions, voids, back-dated rows, migrated-style rows; expected outputs `tests/reports/golden/<report_key>/<case>.json` hand-computed, at least one case per format and per column-selecting value. `golden_large`: about 1.4 M ledger entries, 180 k appointments, 96 k claims, 84 k patients, 15 offices. Family fixture sets (RPT-RECALL-04, RPT-ORTHO-04) extend `golden_small` | Each definition needs its golden cases before it is enabled |
| 6.3 | Reconciliation identities | P0 | Engine invariants R1-R9 (02 §15.3) run generically for every definition; data invariants R-01..R-22 (03 §10) as tests and nightly control queries stored as `inv_<id>` in `rpt_data_quality`; metric identities I-1..I-12 (MET-04) and the later packs; `reconciles_with` between report totals and the metric service (R5) | Gate invariants block financial reports per client (AD-10). P0 gate: R-01..R-04, R-10a, R-12, R-13 pass and R-21 is recorded or waived (the interim `production` and `collections` definitions). P1 gate, before any Daily, Ledger or Statements report is enabled: adds R-05, R-06, R-14, R-14b (they need DATA-20, G-05) |
| 6.4 | Definition lint against the parity files | P0 (ENG-18, FLT-27) | `python -m app.reports.lint`: vendored `legacy/index/*.controls.json` and `catalog/parity/<folder_key>.parity.json` (16 files, for example `montly_reports.parity.json`; 02 §15.4 writes `catalog/<category>.parity.json`, gap G-15) under `app/reports/legacy_index/` by `scripts/sync_legacy_index.py` [NEW] (owner ENG-18), plus the generated phase map; interim mode for definitions whose parity phase is later; coverage, control mapping, options and defaults, keys, references, security, builder dry builds on PostgreSQL (all branch combinations up to 64, pairwise beyond), datasets, versioning, classes; FLT-20 parity default tests from P1 | Deploy gate |
| 6.5 | Contract tests for the generated client | P0 (ENG-19) | OpenAPI snapshot of `/reports` and `/analytics` with default settings (engine flag off: every engine path present, no `/internal/` path); definition fixtures `tests/contract/definitions/*.json` serialised through the strict `ReportDefinitionRead` and parsed by the FE runner in vitest; shared expression and date-token vectors; golden `ReportResultPage` payloads | Deploy gate on both sides |
| 6.6 | Legacy output comparison for the same period | P1 | Per family and client: one closed month (and one day for daily reports) printed from Denticon and from DentC with the legacy default criteria; compared on totals per band, row counts and the key rows; differences classified as (a) DentC defect, (b) documented semantic change (PD-*, AD-*), (c) data gap (R-21, era caveat); stored with the family's live-verification checklist (RPT-DAILY-09, RPT-LEDGER-07, RPT-MY-04, RPT-STMT-09, RPT-MONTHLY-23, RPT-MONTHLY-52, RPT-INS-09, RPT-APPT-09, RPT-RECALL-06, RPT-ORTHO-06, RPT-REF-08, RPT-TX-04, RPT-PLIST-09, RPT-PRLIST-09, RPT-SLIST-09, RPT-STLIST-09) | Family exit; requires A-4 |
| 6.7 | Security tests | P0 (SEC-14) | Scope x right x class matrix, `can_view_run` truth table, sharing of executions, two-tenant isolation, injection fuzzing of every parameter, tampered live cursors (P3), CSV formula vectors, platform cases (internal routes 404 on the API role, refused local storage) | Deploy gate |
| 6.8 | Performance budgets | P1 (ENG-37) | 02 §15.6 on `golden_large` from a Cloud Run instance in `us-central1` against Cloud SQL in `us-east1`, with database round trips per endpoint; slow-run log and reclassification above 5 % promotions or timeouts | Exit of P1 (inline classes), P2 (background, exports), P4 (roll-ups) |
| 6.9 | Metric and assistant suites | P1 (MET-09), P5 (DASH-50) | Two-era metric fixtures, ratio and no-data properties, preset parity (MET-20); assistant evaluation set | Deploy gate for metric and assistant changes |

---

## 7. Rollout per client organisation

### 7.1 Flags

| Flag (per client, `deploy/clients/<client>.env.yaml` [NEW], section 1.3) | Default | Switched on when | Owner item |
|---|---|---|---|
| `ALLOW_SIGNUP` | `false` (`true` only with `ENV = dev`) | Never in staging / prod | SEC-11 |
| `REPORTS_ENGINE_ENABLED` | `false` | P0 exit checks recorded for the client; its tick job deployed and one drain observed (EX0-6, EX0-7); documents bucket set | ENG-01, ENG-58 |
| `REPORT_RIGHTS_ENFORCED` / `REPORT_RIGHTS_SHADOW` / `REPORT_RIGHTS_SHADOW_UNTIL` | `true` / `true` / unset | Enforced from the first deploy for new clients; existing clients pass through the shadow window (7.2) | SEC-12 |
| `REPORT_UNGATED_OFFICE_ACCESS` | `false` | Only while `REPORT_RIGHTS_ENFORCED=false`, for a client whose office assignments are not set up | SEC-05 |
| Tenant flag of DATA-07 (balance unification) | off | Bridge reviewed and signed by the product owner for that client | DATA-07 |
| `REPORT_BACKGROUND_ENABLED` | `false` | After `scripts/provision_reporting.sh` has run for the client and `GET /reports/settings` shows no error | ENG-38, ENG-46 |
| `REPORT_SCHEDULES_ENABLED`, `REPORT_EMAIL_ENABLED` | `false` | Background on, `APP_BASE_URL` set, transport check green | ENG-43, ENG-44 |
| `REPORT_CACHE_ENABLED` | `false` | Background on and the write-route test of ENG-41 green for the client | ENG-41 |
| `report_tenant_settings.disabled_report_keys` | empty | Used to hold back a family on a client whose data checks fail (for example financial reports while R-21 is open) | ENG-36 |

### 7.2 Enabling rights without locking users out (08 §3.5, per client)

| Step | Action | Exit check |
|---|---|---|
| 1 | SEC-11, SEC-42 deployed: open signup closed, tenant predicate on tenant-less resources, strict gates on group, membership and assignment writes | Anonymous signup 404; only registry tenants present |
| 2 | SEC-01 revision and SEC-02 grant script on the client | 397 active codes; the script's list of additions, undecided legacy rows and segregation conflicts handed to the tenant administrator |
| 3 | Engine deployed in shadow with an end date: `SHADOW_ELIGIBLE` (the six ENG-20 reports and the legacy read routes) relaxed, everything else enforced | `shadow_denied` events written; non-administrator 403 on `PATCH /reports/settings` |
| 4 | Readiness report `management.report_access_readiness` over 14 days (checks a-k) | Report produced for full-access roles |
| 5 | Tenant administrator clears the list (groups, presets, office assignments with `scripts/backfill_user_offices.py`, provider links) | Signed checklist in the client registry |
| 6 | `REPORT_RIGHTS_ENFORCED=true`, `REPORT_UNGATED_OFFICE_ACCESS=false` | Zero shadow denials for 7 days or each acknowledged; at the latest on the shadow end date |
| 7 | Clients onboarded after P1 start enforced | A user without the family gets 403 on every P1 report on day one |

Break-glass: full-access roles (`admin`, `super_admin`, `owner`) always pass; `REPORTS_ENGINE_ENABLED=false` removes the
module; neither widens access beyond what existed before the module.

### 7.3 Coexistence with and retirement of today's endpoints

| Existing surface | P0 | P1 | P2 | P3 |
|---|---|---|---|---|
| `GET /reports/summary`, `/reports/trends` | Secured (ENG-16): office rule, field-group rights, `restricted[]`, scoped cache key | Adapter over the metric service, `deprecated` (ENG-35, MET-07) | Retired once the FE dashboards read `/analytics` | — |
| `GET /reports/accounts-receivable`, `/reports/aging` | Secured | Values from canonical-ledger metrics | Retired with `monthly.aging_report` | — |
| `GET /reports/insurance-verification-summary` | Secured | — | — | Replaced by the eligibility worklist and its metric |
| `GET /dashboard/summary` | Right + office rule | Adapter over `POST /analytics/dashboards/{key}/data`, deprecated; retired after Main Dashboard v1 is the FE source | — | — |
| `/offices/{office_id}/financial-summary`, `/collections`, `/insurance-receivables`, `/adjustment-summary` | Path office checked by the report rule + right | Adapters over the metric service | Retired | — |
| `/offices/{office_id}/transactions`, `GET /transactions` | Scope + right; fail-closed feed audit event | Rewritten on `rpt_ledger_entries` with SQL filters and keyset paging, same response model | — | — |
| Time-clock report routes | Kept | Engine definitions `my_reports.time_clock_report` (P1) and `management.time_clock_report` (P2) through the `python_builder`; routes stay for the Time Clock screen | — | — |
| Lab-case report routes | Scope + right | — | — | Engine definitions `appointment.lab_report`, `appointment.lab_cost_report`; routes become adapters |
| Patient PDFs `/patients/{id}/reports/*` | — | Kept outside the catalog; patient visibility check, shared header, `logo_bytes()`, ledger PDF on the canonical ledger (SEC-22, ENG-60, RPT-LEDGER-08) | — | — |
| `POST /offices/{office_id}/statements/batch` | Path office + `statements` Full Control | Deprecated (RPT-STMT-07); `statements.statement_run` replaces it | Removed after every client runs statements on the engine (background, RPT-STMT-08) | — |
| `report_service._cache_key` | Scope hash + `REDIS_NAMESPACE` | Removed with the adapters | — | — |
| Messaging Pub/Sub channels | `REDIS_NAMESPACE` released to every client before any envelope (ENG-56) | — | — | — |

Retirement rule: a route is removed only when (a) no FE caller remains (grep of `src/` and the generated client),
(b) its replacement has passed the legacy output comparison on the main client, (c) one release has carried the
`deprecated` mark, and (d) every client in the client registry has the replacement enabled and has passed its legacy
output comparison. One image runs on every client, so removing a route removes it also where `REPORTS_ENGINE_ENABLED`
is false and the frontend still calls it (`11_frontend_plan.md` FA-1, FA-5); until (d) holds the route stays behind its
adapter. The P2 and P3 "Retired" entries above are therefore the earliest phase, not a fixed date.

---

## 8. Backend risks, mitigations and open decisions

### 8.1 Risks

| # | Risk | Effect | Mitigation | Phase |
|---|---|---|---|---|
| BR-1 | Engine critical path (ENG-03 → ... → SEC-12, 55 engineer-days) is serial, and the security / platform track (T6 + T7, 103 engineer-days) bounds P0 with a team of 6 | P0 slips regardless of team size | Walking skeleton first; engine lane run as a DAG (P0 build order step 4); ENG-07, ENG-08, ENG-09 parallel to ENG-03..06; 1.5 engineers on T6 + T7 (section 1.2) | P0 |
| BR-2 | Balance unification changes numbers users see on release day | Support load, mistrust | Bridge per account, tenant flag, release note, product sign-off (DATA-07); duplicate-posting review #7 first | P0 |
| BR-3 | `btree_gist` cannot be created by the client database user | DATA-03 blocks the whole data lane | Check on the UAT database in week 1; instance administrator step per client in the runbook | P0 |
| BR-4 | Migrated ledger incomplete; internal invariants still pass | Wrong A/R and income for history | DATA-57 reload + R-21 control totals; waiver printed on financial reports | P0 |
| BR-5 | Cloud Tasks push to a private worker does not behave as assumed | Background path redesign | ENG-21 spike from P0 day 1, findings by the end of week 2; provisional BD-10 at the P0 mid-point; `report_runs` claim / heartbeat columns fit both transports; `db_poll` drain (ENG-63) as fallback | P0 → P2 |
| BR-6 | Statements in P1 cannot exceed the inline budget, and the synchronous batch route is deprecated in P1 with no FE caller (RPT-STMT-07) | Large offices cannot run a whole batch in one run until P2 | BD-02 is a P1 entry decision (EN1-3): either ENG-63 and the claim / heartbeat part of ENG-38 move to P1, or the gap is a recorded P1 parity gap (EX1-5) with the name-range split as workaround | P1 |
| BR-7 | Connection budget of the shared Cloud SQL instance unknown (34 per client worst case) | Report load competes with chairside traffic | ENG-37 measurement; lane caps per client; budget review per enabled client; read replica as later option | P1 → P2 |
| BR-8 | Back-fills and index builds run N times by hand | Drift between clients | Change ledger in the client registry; readiness checker as the per-database gate; scripts idempotent | All |
| BR-9 | Event capture (DATA-17, DATA-25) starts late: every week of P0 (20 weeks with 6 engineers) is history lost for good | Reports depending on history are empty for months | DATA-25 and DATA-17 first and in parallel in P1; G-20 recommends their additive capture parts in P0; availability declared with `history_starts_on` | P0 → P1 |
| BR-10 | P3 size (303 items, 1,184 engineer-days; 930 in T4) | P3 dominates the programme | 4.5 (6) or 7.5 (10) engineers on T4 (section 1.2); three waves whose definitions are independent, with their action tails batched after DASH-31 / DASH-33 / DASH-34 (P3 build order step 2a); lists (mostly S items) parallelised; DASH-30 hand-off agreed with the frontend plan | P3 |
| BR-11 | Row-level triggers on hot tables | Write overhead on charge entry | Measurement before enabling; `rpt.skip_dirty`; nightly rebuild as fallback | P4 |
| BR-12 | Legacy tool access for live verification and output comparison ends | Parity unverifiable for `unknown_legacy` controls | FLT-23 in P0; capture printouts early per family | P0 → P3 |
| BR-13 | Shared Redis without namespace | Cross-client messages and caches | ENG-56 and SEC-45 before any publish | P0 |
| BR-14 | Rights enforcement locks users out | Lost productivity | Shadow window with readiness report; break-glass roles | P0 → P1 |

### 8.2 Open decisions that block backend work

| # | Decision | Default used by this plan | Owner | Needed by |
|---|---|---|---|---|
| BD-01 | Office rule for callers without assignments: strict (02, 08) or the platform's ungated rule (04 §6.2) | Strict, `REPORT_UNGATED_OFFICE_ACCESS` per client | Security owner, product owner | P0 (SEC-05, FLT-03) |
| BD-02 | Statements in P1 versus background in P2 (02 §18.2-1): move statements to P2, or ENG-63 + the claim / heartbeat part of ENG-38 to P1 | Brief kept; oversized P1 runs fail with `report_too_large_for_inline` | Product owner, architecture owner | P1 start |
| BD-03 | Reference time zone when working and reported office differ; "today" across zones (04 OD-4) | Reported office's zone, one range per run with `mixed_time_zones` | Product owner | P0 (FLT-04, ENG-06) |
| BD-04 | Dedicated read-only database role per client (`REPORT_DATABASE_URL`) or read-only transactions on the application role | Read-only transactions always; role optional | Operations | P0 (ENG-08) |
| BD-05 | Class, Sub Type and collection flags of the 64 codes; insurance write-off Sub Type; `COLPY`, `AD900`; bad debt (03 O-2, 05 D-8) | Seed of 03 §3.3 | Accountant | P0 exit (DATA-03, MET-04) |
| BD-06 | Positive migrated payments (03 O-13) and archive partitions (O-1) | `credit`, `exclude` | Accountant, data lead | P0 (DATA-11) |
| BD-07 | Reload the skipped charges or accept the gap (03 O-14); Denticon export availability (O-8) | Reload | Product owner, operations | P0 (DATA-57) |
| BD-08 | Allocation for app payments at posting (03 O-6) and P1 collections by provider on the credited provider (O-12) | Persist at posting; P1 credited provider, restated in P2 | Product owner | P1 (DATA-20 design), P2 (DATA-26) |
| BD-09 | Retention defaults (24 h / 7 d / 30 d / 400 d; audit 72 months) and PDF above 10,000 rows | As 02 §12.4 and 08 | Product owner, counsel | P1 (ENG-36, SEC-23) |
| BD-10 | Queue transport after ENG-21; run-cache invalidation source; tick as job or endpoint | Cloud Tasks; Redis markers, cache off by default; job every 5 minutes | Architecture owner | P0 (tick; provisional transport at the P0 mid-point so that ENG-12's columns fit both), P2 (final transport, cache) |

---

## 9. Gaps found in the design

| # | Gap or contradiction | Where | Effect on this plan | Recommendation |
|---|---|---|---|---|
| G-01 | Register phase inversions (19, `plan_inputs/facts.md`): RPT-DAILY-18 and RPT-DAILY-71 (P1) need DATA-33 (P2); RPT-DAILY-77, RPT-INS-07, RPT-INS-77, RPT-MGMT-11, RPT-MGMT-13 (P2) need ENG-49 (P3), and RPT-DAILY-77, RPT-INS-07 also SEC-36 (P3); RPT-INS-07, RPT-INS-77 need DASH-28 (P3); RPT-MGMT-11 needs UX-39 (P3); RPT-INS-05 needs DATA-41 (P3); RPT-MONTHLY-12 and RPT-NEW-82 need DATA-40 (P3); RPT-MONTHLY-14 needs FLT-26 (P4) | Register | Items kept at their register phase; their dependent parts are held (P2 build order step 6, P1 step 4) | Move ENG-49 and SEC-36 to P2 (both small, depend only on P0 items) — five P2 items need them; split RPT-DAILY-18 / RPT-DAILY-71 like RPT-DAILY-22a / RPT-DAILY-22b; move the action parts of RPT-INS-07 / RPT-INS-77 and the enhancement part of RPT-MONTHLY-14 to the phase of their dependency |
| G-02 | RPT-NEW-27 (P2) needs DATA-49 (P4); RPT-NEW-48 (P3) needs DATA-48 (P4); RPT-NEW-76 (P3) needs MET-27 (P4) | Register | The three reports cannot exit their phase as specified | Move RPT-NEW-27, RPT-NEW-48 and RPT-NEW-76 to P4 |
| G-03 | ENG-20 (P0) requires six reports with totals over the full population, but `appointments`, `treatment-plans` and `insurance-claims` need `rpt_appointment_facts` (DATA-16), `rpt_treatment_item_facts` (DATA-56) and `rpt_claim_facts` (DATA-21), all P1 | 02 §14, register | Plan adopts the second option: ENG-20 is split across P0 (three reports, EX0-5) and the start of P1 (three reports, EX1-11); the old runner stays for the other three until UX-12 completes in P1 | Either move the minimal views of DATA-16, DATA-21, DATA-56 to P0, or accept a P0 exit with three of six (UX-12 retires the old runner only after all six) |
| G-04 | The walking skeleton (criteria to PDF) has no PDF renderer in P0: ENG-23 is P1 | 02 §17 | Throwaway adapter over `pdf_report.py` in the skeleton | Accept the throwaway, or move a thin part of ENG-23 to P0 |
| G-05 | AD-10 gates financial reports on R-05, R-06, R-14b, which need `rpt_fifo_core()` / `rpt_ar_open_items()` (DATA-20, P1); the brief's P0 outcome "canonical ledger reconciled" therefore covers only R-01..R-04, R-10a, R-12, R-13 | 03 §10, brief §6 | DATA-20 is on the P1 critical path before any Daily / Ledger / Statements family is enabled | State the P0 reconciliation scope explicitly in `12_roadmap.md` |
| G-06 | Work items depend on the 05 requests to 02 / 03 / 04 / 08 (MET-02, MET-03, MET-05, MET-06, MET-12, MET-21, MET-22), which are not register items | 05 §11, register | Their effort and phase are unplanned | Register each request as an ENG / DATA / FLT / SEC item or fold it into an existing item's acceptance |
| G-07 | The exclusion constraint of DATA-03 needs `CREATE EXTENSION btree_gist`; the schema has no extension today and the per-client database user may lack the privilege | 03 §3.3, `be_platform.md` §0 #7 | Risk BR-3 | Add the extension step to the onboarding runbook and to ENG-46 |
| G-08 | MET-02 names `GET` / `PUT /analytics/settings`; 02 §13 (64 routes) has no such route, and no right for organisation metric settings is in 08's catalog revision (05 uses `reports_administer` meanwhile) | 02 §13, 05 MET-02, 08 §2.2 | Endpoint planned in P0 under MET-02 | Add the route to 02 §13 and the right to 08 |
| G-09 | Statements parity in P1 against background runs in P2 (02 §18.2-1) | Brief §6, 02 | BD-02 as a P1 entry decision (EN1-3); without it, large-office statements are a recorded P1 parity gap with the name-range split (EX1-5) | Decide before P1; ENG-63 acceptance already allows moving it to P1 |
| G-10 | Collections by provider are allocation-based (PD-7) but tenant-wide allocations are P2 (03 O-12); the close snapshots and `rpt_derived_allocations` are step-B tables in P2, not P4 (03 O-9) | Brief, 03 | P1 dashboards show "provider on payment", restated in P2 | Record the restatement in the P1 release note |
| G-11 | Goals and pacing are P3 (05 D-7, 06 C-2) while the brief lists goals in P4; Huddle v1 in P2 and a minimal billing-worklist slice in P2 are challenged (06 C-1, C-5) | Brief §6, 05, 06 | Plan follows the register | Product owner to confirm |
| G-12 | 04 and 02 disagree on who is report-unrestricted (`OfficeScope.can_view_all()` versus 08 rule S-3) and on the reference zone (04 OD-4, OD-13) | 02, 04, 08 | BD-01, BD-03 | Align before FLT-03 starts |
| G-13 | No work item owns the per-client change ledger and the legacy output comparison harness (section 6.6) | Register | Done inside ENG-46 and the family verification items | Add an ENG item (P0) for the change ledger and comparison tooling |
| G-14 | `management.report_access_readiness` (SEC-12) is a report definition in P0 but has no catalog specification or RPT item | 08 §3.5, catalog | Built inside SEC-12 | Add it to `catalog/analytics_reports.md` or `catalog/management_reports.md` |
| G-15 | The lint's control-mapping rule (02 §15.4) has no mode for interim definitions: the six ENG-20 definitions use final legacy `report_key`s but cover few legacy controls, which are replicated in the parity files and so cannot go to `legacy_unmapped[]` (its statuses are `help_text`, `superseded`, `not_applicable`, `unknown_legacy`). 02 §15.4 also names `catalog/<category>.parity.json`, while the files are `catalog/parity/<folder_key>.parity.json`, and names "a sync script" without an owner | 02 §15.4, §4 | Plan adds the phase map from 09 §2, an interim mode (`interim = true`, `phase` = parity phase, control and default rules checked from that phase on) and `scripts/sync_legacy_index.py` under ENG-18 | Add the interim mode, the real path and the sync script to 02 §15.4 and ENG-18's acceptance |
| G-16 | In P0 the three engine reports export CSV and an interim PDF only; XLSX (ENG-27) is P1, while today the six reports export CSV, XLS and PDF in the browser for every signed-in user (08 §3.5, `analysis/fe_existing_reports.md` §2.7) | 02, 08, 07 | No regression only because the old runner stays reachable for the six until UX-12 completes in P1 (G-03) | Confirm in 07 / 11 that the old runner's XLS export stays available for the three engine reports until ENG-27 ships |
| G-17 | P0 needs per-client tick infrastructure (ENG-58: Cloud Scheduler `rpt-<c>-tick`, Cloud Run Job), but the provisioning script ENG-46 is P2; without the job, audit outbox rows are not drained and snapshots are not purged (02 R16) | Register, 02 | Manual runbook entry under ENG-58's acceptance; `REPORTS_ENGINE_ENABLED` requires an observed drain | Move the tick-job part of ENG-46 to P0, or add the runbook entry to ENG-58's acceptance |
| G-18 | `deploy/clients/<client>.env.yaml` is the home of every flag (02, 08) but does not exist (08 RC-5) and no work item creates it; today's push is `scripts/push_env_to_cloud_run.sh` reading `.env` | 08 RC-5, register | P0 step under ENG-01 / SEC-12: create the files from the client registry, extend the push script, run `scripts/check_client_configs.py` in the deploy workflow | Register the step as part of ENG-01 or SEC-12 acceptance |
| G-19 | No work item covers the production-size data used for index timing and calibration (PHI): location, access, de-identification, audit; 02 already specifies a synthetic `golden_large` for performance | 02 §15.2, register | A-5: Cloud SQL clone in the same project and region, named operators, deleted after timing; performance on `golden_large` | Add an acceptance line to DATA-08 (timing environment) or a SEC item |
| G-20 | Event capture that cannot be back-filled (DATA-17 appointment events, DATA-25 claim and treatment-item events) starts in P1, after a P0 of about 20 weeks with 6 engineers | Register, 03 | DATA-17 and DATA-25 first in P1, in parallel | Move the additive capture parts of DATA-17 and DATA-25 (tables and writers, no reports) to P0, or start them in P0 week 1 as a pre-phase |
| G-21 | DATA-57 (P0) reloads the skipped migrated charges and stores Denticon control totals, which needs the Denticon source; its feasibility decision DATA-50 is P1 (03 O-8) | Register, 03 O-8 | EN0-4 requires the O-8 answer before DATA-57 starts | Move DATA-50 (S) to P0, or put the O-8 answer into DATA-57's acceptance as an entry condition |
| G-22 | 03 §8 asks to "ship index revisions separately from code revisions"; with one linear Alembic chain and a single `alembic upgrade head` in the CI step, any revision in the chain runs inside the main client's deploy | 03 §8, 02 C9 | Operations steps are scripts `scripts/ops/` with a deploy preflight (section 5.1 O-R3), not Alembic revisions | Record the mechanism in DATA-01 / DATA-08 / ENG-17 acceptance |
| G-23 | `payment_allocations.tenant_id` is added by both DATA-15 (P1) and DATA-26 (P2) | 03 §7 (DATA-15, DATA-26 rows) | Owned by DATA-15 (P1); removed from the P2 database change #2 | Drop `tenant_id` from DATA-26's column list in 03 |

---

## 10. Appendix: backend work items per phase and track

Every backend item (755) is in exactly one epic of section 4; this appendix lists the same ids per track. Frontend-only
items are listed per phase so that the two plans can be checked together.

### Appendix P0

| Track | Work items | Items | Engineer-days |
|---|---|---|---|
| T1 Data foundation | DATA-01..DATA-11, DATA-57 | 12 | 82 |
| T2 Engine core | ENG-03..ENG-11, ENG-18, FLT-01..FLT-07, FLT-27 | 18 | 93 |
| T3 Runs, exports, schedules | ENG-12, ENG-13, ENG-15, ENG-57, ENG-58 | 5 | 27 |
| T4 Report definitions | ENG-20, FLT-22, FLT-23, RPT-MENU-01 | 4 | 25 |
| T5 Metrics and dashboard API | MET-01..MET-04 | 4 | 25 |
| T6 Security and audit | ENG-14, ENG-16, SEC-01..SEC-14, SEC-42, SEC-45 | 18 | 80 |
| T7 Platform and operations | ENG-01, ENG-02, ENG-17, ENG-19, ENG-21, ENG-56 | 6 | 23 |
| Frontend-only (scheduled by 11_frontend_plan.md, listed for completeness) | FLT-10..FLT-15, UX-01..UX-15, UX-45 | 22 | - |

### Appendix P1

| Track | Work items | Items | Engineer-days |
|---|---|---|---|
| T1 Data foundation | DATA-12..DATA-25, DATA-50..DATA-53, DATA-55, DATA-56 | 20 | 115 |
| T2 Engine core | ENG-28..ENG-31, ENG-34, ENG-59, FLT-16, FLT-17 | 8 | 34 |
| T3 Runs, exports, schedules | ENG-22..ENG-27, ENG-36, ENG-60, ENG-61, FLT-18 | 10 | 64 |
| T4 Report definitions | FLT-20, FLT-28, RPT-DAILY-01..RPT-DAILY-21, RPT-DAILY-22a, RPT-DAILY-23, RPT-DAILY-40, RPT-DAILY-41, RPT-DAILY-44, RPT-DAILY-45, RPT-DAILY-47..RPT-DAILY-55, RPT-DAILY-70..RPT-DAILY-73, RPT-DAILY-75, RPT-DAILY-76, RPT-DAILY-78..RPT-DAILY-81, RPT-LEDGER-01..RPT-LEDGER-13, RPT-LEDGER-16..RPT-LEDGER-18, RPT-MENU-02, RPT-MENU-03, RPT-MY-01..RPT-MY-06, RPT-MY-10..RPT-MY-18, RPT-NEW-78, RPT-NEW-83, RPT-STMT-01..RPT-STMT-07, RPT-STMT-09..RPT-STMT-20 | 102 | 406 |
| T5 Metrics and dashboard API | DASH-01, DASH-04, DASH-05, DASH-09, DASH-10, DASH-53, ENG-32, ENG-33, ENG-35, MET-05..MET-09 | 14 | 68 |
| T6 Security and audit | SEC-15..SEC-24, SEC-26, SEC-43, SEC-44 | 13 | 44 |
| T7 Platform and operations | ENG-37 | 1 | 5 |
| Frontend-only (scheduled by 11_frontend_plan.md, listed for completeness) | DASH-02, DASH-03, DASH-06..DASH-08, FLT-19, FLT-21, UX-16..UX-32, UX-48, UX-49 | 26 | - |

### Appendix P2

| Track | Work items | Items | Engineer-days |
|---|---|---|---|
| T1 Data foundation | DATA-26..DATA-38 | 13 | 122 |
| T2 Engine core | FLT-08, FLT-24 | 2 | 4 |
| T3 Runs, exports, schedules | ENG-38, ENG-40..ENG-45, ENG-62, ENG-63, SEC-25 | 10 | 56 |
| T4 Report definitions | RPT-DAILY-22b, RPT-DAILY-42, RPT-DAILY-43, RPT-DAILY-77, RPT-INS-01..RPT-INS-15, RPT-INS-17, RPT-INS-18, RPT-INS-40, RPT-INS-41, RPT-INS-43, RPT-INS-44, RPT-INS-46, RPT-INS-47, RPT-INS-49..RPT-INS-53, RPT-INS-70, RPT-INS-72..RPT-INS-79, RPT-LEDGER-14, RPT-LEDGER-15, RPT-LEDGER-19, RPT-MENU-04, RPT-MENU-05, RPT-MENU-12, RPT-MGMT-01..RPT-MGMT-04, RPT-MGMT-10..RPT-MGMT-18, RPT-MONTHLY-01..RPT-MONTHLY-20, RPT-MONTHLY-22, RPT-MONTHLY-23, RPT-MONTHLY-40..RPT-MONTHLY-46, RPT-MONTHLY-48..RPT-MONTHLY-52, RPT-NEW-10, RPT-NEW-12..RPT-NEW-20, RPT-NEW-23, RPT-NEW-25..RPT-NEW-28, RPT-NEW-77, RPT-NEW-79..RPT-NEW-82, RPT-NEW-84, RPT-STMT-08, RPT-STMT-21, RPT-STMT-22 | 118 | 556 |
| T5 Metrics and dashboard API | DASH-12..DASH-17, DASH-52, DASH-55, MET-10..MET-12, MET-26 | 12 | 67 |
| T6 Security and audit | SEC-27..SEC-35 | 9 | 39 |
| T7 Platform and operations | ENG-39, ENG-46, ENG-47 | 3 | 15 |
| Frontend-only (scheduled by 11_frontend_plan.md, listed for completeness) | DASH-11, UX-33..UX-37, UX-46 | 7 | - |

### Appendix P3

| Track | Work items | Items | Engineer-days |
|---|---|---|---|
| T1 Data foundation | DATA-39..DATA-46, DATA-54 | 9 | 65 |
| T2 Engine core | ENG-48, ENG-49, FLT-09, FLT-25, SEC-36 | 5 | 22 |
| T4 Report definitions | RPT-APPT-01..RPT-APPT-22, RPT-APPT-40..RPT-APPT-42, RPT-APPT-45, RPT-APPT-46, RPT-APPT-50..RPT-APPT-52, RPT-APPT-55..RPT-APPT-57, RPT-APPT-60..RPT-APPT-62, RPT-DAILY-25, RPT-DAILY-74, RPT-DAILY-82, RPT-INS-16, RPT-INS-19, RPT-INS-42, RPT-INS-45, RPT-INS-48, RPT-INS-54, RPT-INS-71, RPT-MENU-06..RPT-MENU-10, RPT-MENU-13, RPT-MENU-14, RPT-MONTHLY-21, RPT-MONTHLY-47, RPT-NEW-21, RPT-NEW-22, RPT-NEW-40..RPT-NEW-48, RPT-NEW-51, RPT-NEW-52, RPT-NEW-71..RPT-NEW-74, RPT-NEW-76, RPT-ORTHO-01..RPT-ORTHO-07, RPT-ORTHO-10..RPT-ORTHO-17, RPT-PLIST-01..RPT-PLIST-20, RPT-PLIST-40..RPT-PLIST-55, RPT-PRLIST-01..RPT-PRLIST-13, RPT-PRLIST-15..RPT-PRLIST-18, RPT-RECALL-01..RPT-RECALL-17, RPT-REF-01..RPT-REF-08, RPT-REF-10..RPT-REF-12, RPT-REF-14..RPT-REF-22, RPT-REF-40..RPT-REF-48, RPT-SLIST-01..RPT-SLIST-16, RPT-STLIST-01..RPT-STLIST-25, RPT-STLIST-40..RPT-STLIST-61, RPT-STMT-23, RPT-TX-01..RPT-TX-05, RPT-TX-10..RPT-TX-15, RPT-TX-17, RPT-TX-18 | 264 | 930 |
| T5 Metrics and dashboard API | DASH-18, DASH-21..DASH-29, DASH-31..DASH-36, MET-13..MET-20 | 24 | 162 |
| T6 Security and audit | SEC-37 | 1 | 5 |
| Frontend-only (scheduled by 11_frontend_plan.md, listed for completeness) | DASH-19, DASH-20, DASH-30, DASH-54, UX-38..UX-40, UX-42 | 8 | - |

### Appendix P4

| Track | Work items | Items | Engineer-days |
|---|---|---|---|
| T1 Data foundation | DATA-47..DATA-49 | 3 | 35 |
| T3 Runs, exports, schedules | DASH-41, DASH-42, ENG-52, SEC-39 | 4 | 22 |
| T4 Report definitions | RPT-DAILY-24, RPT-DAILY-46, RPT-MENU-11, RPT-NEW-11, RPT-NEW-24, RPT-NEW-49, RPT-NEW-50, RPT-NEW-53, RPT-NEW-70, RPT-NEW-75, RPT-NEW-85, RPT-PRLIST-14, RPT-REF-09, RPT-REF-13, RPT-REF-49, RPT-REF-50, RPT-TX-16 | 17 | 93 |
| T5 Metrics and dashboard API | DASH-38..DASH-40, DASH-43, DASH-45, ENG-50, ENG-51, FLT-26, MET-21..MET-23, MET-27, SEC-38 | 13 | 82 |
| Frontend-only (scheduled by 11_frontend_plan.md, listed for completeness) | DASH-37, DASH-44, UX-41, UX-47 | 4 | - |

### Appendix P5

| Track | Work items | Items | Engineer-days |
|---|---|---|---|
| T2 Engine core | DASH-51, ENG-53, ENG-54, MET-24, RPT-MENU-15, SEC-40 | 6 | 35 |
| T5 Metrics and dashboard API | DASH-46..DASH-48, DASH-50, ENG-55, MET-25, SEC-41 | 7 | 42 |
| Frontend-only (scheduled by 11_frontend_plan.md, listed for completeness) | DASH-49, UX-43, UX-44 | 3 | - |
