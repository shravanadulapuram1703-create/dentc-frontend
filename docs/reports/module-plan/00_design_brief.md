# Reports & Analytics module — design brief

This brief fixes the decisions, names and document boundaries that every other document in
`docs/reports/module-plan/` follows. It exists so that documents written in parallel agree with each
other. If a later document finds strong evidence against a decision here, it records a **challenge** in its
own "Open decisions" section and still writes against this baseline.

Evidence for every statement below is in `analysis/*.md` (current code and data), `research/*.md`
(external research) and `legacy/*.json` (the verified legacy criteria inventory).

## 1. What we are building

A Reports & Analytics module for DentC that does two things:

1. **Legacy parity.** Every report, filter and option of the legacy tool (Denticon by Planet DDS) exists in
   DentC. The legacy inventory is 118 reports in 16 screenshot categories (119 screenshots), plus 13 menu
   entries for which no screenshots exist.
2. **Analytics beyond the legacy tool.** KPI dashboards, provider scorecards, drill-down to the underlying
   record, saved views and favorites, scheduled delivery, worklists that lead to action, multi-office
   comparison, a custom report builder and an assistant that explains numbers.

| Legacy category (folder key) | Reports | New home in the hub |
|---|---|---|
| Daily Reports (`daily_reports`) | 12 | Financial › Daily |
| Monthly Reports (`montly_reports`) | 9 | Financial › Month-end |
| Ledger Reports (`ledger_reports`) | 4 | Financial › Ledger |
| Management Reports (`management_reports`) | 4 | Management |
| Insurance Reports (`insurance_reports`) | 13 | Insurance |
| Appointment Reports (`appointment_reports`) | 9 | Scheduling |
| Treatment Plan Reports (`treatmentplan_reports`) | 4 | Clinical › Treatment plans |
| Referral Reports (`refferal_reports`) | 8 | Patients › Referrals |
| Recall Reports (`recall_reports`) | 4 | Clinical › Recall |
| Ortho Reports (`ortho_reports`) | 5 | Clinical › Ortho |
| Statements (`statements_reports`) | 1 screen | Financial › Statements |
| Lists › Patient (`patients_list_reports`) | 12 | Lists |
| Lists › Provider (`providers_list_reports`) | 4 | Lists |
| Lists › Security (`security_list_reports`) | 4 | Lists |
| Lists › Setup (`setup_list_reports`) | 20 | Lists |
| My Reports (`my_reports`) | 5 | My Reports |

Legacy menu entries without screenshots, and how the plan treats them:

| Legacy entry | Treatment |
|---|---|
| Interactive Reports | Becomes **Worklists** (Eligibility Verification, Unsigned Progress Notes, plus new ones). |
| Office Reports | Customer-specific in the legacy tool. Becomes tenant-defined **custom reports** built with the report builder. |
| My Favorites, Search Report | Hub features (favorites, saved views, search across names, legacy aliases and descriptions). |
| Letters, Postcards, Labels, Custom Letter, Advanced Custom Letter, Custom Postcard | Stay with the correspondence features. The hub links to them, and report results can feed them as bulk actions. |
| Blank Insurance Forms, Pat Reg/Medical Info Forms | Stay with their owning features. The hub links to them. |
| Reports (Old) | Not replicated. Its content is superseded by the catalog above. |

## 2. Where we start from (verified facts that shape the design)

**Frontend.** Six client-executed reports in `src/components/reports/**` page CRUD list endpoints and
aggregate in the browser, capped at 600–1,600 rows, so totals are wrong above the cap. `ReportDefinition`
holds functions, so it cannot be served by the backend. No data grid, virtualisation, XLSX writer or date
library is installed. Saved views live in `localStorage`, which is cleared on logout. Rights gating is built
but switched off. The app renders at `html{zoom:0.75}`.

**Backend.** Five `/reports/*` roll-ups, `/dashboard/summary`, a time-clock report and a lab cost report
exist. There is no report registry, shared filter model, job queue, worker, scheduler, XLSX writer or saved
definitions. Limits: 30 s statement timeout, 120 s request timeout. Deployment is Cloud Run with one
service and one database per client organisation.

**Data.** There is no ledger table. Money sits in eight stores with two sign conventions. In-app insurance
payments (`ledger_insurance_details`) are missing from every balance, collections and A/R figure. Legacy
payment and adjustment codes were not migrated. Six balance formulas disagree. Fact tables have no
`tenant_id` and no reporting indexes (about 1.37 M charges, 1.33 M payments). Appointment and claim status
are free text in several vocabularies with no history. Migrated rows carry the migration timestamp as
`created_at`. No deposit, day-close, period-lock or snapshot entity exists.

**Security.** No backend code enforces any report right. `/reports/*` accept any `office_id` and return the
whole tenant when it is omitted. Report runs and client-side exports are not audited.

## 3. Baseline decisions

| ID | Decision |
|---|---|
| AD-1 | **One server-side report engine.** All reports execute on the server. The browser never aggregates. |
| AD-2 | **Declarative definitions.** Each report is a backend-registered definition (parameters, columns, grouping, totals, outputs, rights, cost class) served to the frontend as JSON. One generic runner renders any definition. Per-report frontend code is the exception. |
| AD-3 | **Data layer in two steps, same PostgreSQL.** Step A: a canonical reporting layer of `rpt_*` views over indexed OLTP tables (normalised ledger entries, appointment facts, claim facts, patient activity). Step B: `rpt_*` roll-up and snapshot tables refreshed nightly and incrementally, feeding dashboards. No external OLAP or BI product in the core plan. |
| AD-4 | **Governed metric registry.** Every KPI is defined once (key, formula, dataset, date basis, attribution, format, direction, targets, data class, availability) and reused by dashboards, reports, alerts, the builder and the assistant. Definitions that practices disagree on are organisation-level settings. |
| AD-5 | **Run lifecycle.** Fast reports return inline. Slow ones become a `report_runs` row executed by a worker (Cloud Tasks to a Cloud Run worker service). Results are stored as a snapshot so screen, PDF and XLSX show the same rows. Nightly refresh and schedule ticks use Cloud Scheduler and Cloud Run Jobs. |
| AD-6 | **Server-side exports.** PDF through the existing ReportLab kit, XLSX through XlsxWriter, CSV with formula-injection guards. Files are stored in a tenant-level GCS class with expiry and are downloaded through login-gated links. |
| AD-7 | **Security on every run.** Each report and dashboard has a right code. The backend enforces rights, office scope (`office_ids`, `office_group_id`, `all_offices` through `OfficeScopeDep`), provider restriction (`report_access_provider_id`) and column data classes. Every run, export, print and delivery is audited with parameters, row count and a patient manifest. |
| AD-8 | **Legacy parity is literal.** Every legacy report keeps its legacy name as a searchable alias. Every legacy criteria control maps to a parameter with the same options and the same default. Enhancements are additive. Parity is checked mechanically against `legacy/*.json`. |
| AD-9 | **Explicit date and attribution semantics.** Reports state their date basis (service, transaction, created, deposit, appointment date) and their office and provider attribution. "Today" is the office's local date. |
| AD-10 | **Correctness before breadth.** The first phase builds the canonical ledger layer and reconciles it with on-screen balances before any financial report ships. |
| AD-11 | **Frontend stack.** A new feature folder `src/features/reports/`. TanStack Table plus TanStack Virtual for tables, Recharts (already installed) for charts, pivots computed on the server. Route-level code splitting and an error boundary for the module. Saved views, favorites, schedules and layouts are stored on the server. |
| AD-12 | **Conventions.** snake_case for every data field, end to end. Services wrap the generated Orval client. Office context comes from `useOfficeScope()` and is passed per call. Providers are preferred by office, never excluded. |

## 4. Names every document uses

| Thing | Name |
|---|---|
| Report identifier | `report_key`, dotted: `<category>.<report>` — for example `daily.production_report`, `monthly.aging_report`, `lists.patient_list` |
| Category keys | `daily`, `monthly`, `ledger`, `management`, `insurance`, `appointment`, `treatment_plan`, `referral`, `recall`, `ortho`, `statements`, `lists`, `my_reports`, `worklists`, `custom` |
| API roots | `/api/v1/reports/...` (catalog, definitions, runs, saved views, favorites, schedules) and `/api/v1/analytics/...` (metrics, dashboards, goals) |
| Engine state tables | prefix `report_` — `report_runs`, `report_artifacts`, `report_saved_views`, `report_favorites`, `report_schedules`, `report_deliveries` (exact list is owned by `02_architecture.md`) |
| Reporting data objects | prefix `rpt_` — `rpt_ledger_entries`, `rpt_appointment_facts`, `rpt_claim_facts`, `rpt_patient_activity`, `rpt_treatment_item_facts` (exact list is owned by `03_data_foundation.md`) |
| Metric identifier | `metric_key`, snake_case — `gross_production`, `net_production`, `gross_collections`, `net_collections`, `collection_pct` (exact list is owned by `05_metric_catalog.md`) |
| Common parameters | `office_ids`, `office_group_id`, `all_offices`, `provider_ids`, `user_ids`, `date_from`, `date_to`, `date_basis`, `report_format`, `output_format`, `group_by`, `sort_by`, `page_break_by` (exact list is owned by `04_filter_framework.md`) |
| Phases | `P0` … `P5`, see section 6 |
| Work items | `<AREA>-<nn>` with a phase, a size (S up to 2 days, M up to 1 week, L up to 2 weeks, XL more) and dependencies. Areas: `ENG` engine, `DATA` data foundation, `FLT` filter framework, `MET` metrics, `DASH` dashboards, `UX` frontend, `SEC` security, `RPT` individual reports |

## 5. Product decisions with recommended defaults

These need the product owner's confirmation. Each design document uses the recommended default.

| ID | Question | Recommended default |
|---|---|---|
| PD-1 | Production basis | Keep both. `gross_production` = office (UCR) fee, `charged_production` = posted fee, `net_production` = charged production plus signed production adjustments. Legacy parity reports show the posted fee, with UCR where the legacy option asks for it. |
| PD-2 | In-app insurance payments missing from balances | Fix in P0: one canonical ledger layer feeds both the on-screen balance and every report. |
| PD-3 | Collections | Patient plus insurance payments, excluding adjustments and balance transfers, net of refunds. Net collections = gross collections plus signed collection adjustments. |
| PD-4 | A/R aging | Credits applied to the oldest charges first, at guarantor-account level. Legacy bucket edges for parity reports, configurable for dashboards. Both "transaction office" and "home office" views. |
| PD-5 | Active patient window | Organisation setting, default 18 months, with 12 and 24 available. |
| PD-6 | Office attribution | Production: office of service. Collections: office where the payment was applied. A/R: transaction office, with a home-office variant. Selectable where the legacy report offers it. |
| PD-7 | Provider attribution | Production: treating provider, hygienist when recorded. Collections by provider: allocation-based, with an explicit "Unallocated" bucket. |
| PD-8 | Date basis | Operational dashboards: service date. Day sheet, journals and deposit: transaction date. Created date only where the data supports it. |
| PD-9 | Day close and period lock | New operational features: day close and month-end lock, reversible by an administrator with an audit record. Snapshots for point-in-time KPIs. |
| PD-10 | Report rights | Per category (the legacy screen rights), with per-report override and separate action rights for export, schedule, share and build. View Only = run and view. Full Control = also print, export and schedule. |
| PD-11 | Provider-restricted reporting | `users.report_access_provider_id` restricts My Reports and provider dashboards. Privileged roles are unrestricted. |
| PD-12 | Scheduled delivery | E-mail carries a login-gated link, never PHI attachments. |
| PD-13 | Benchmarking | Across offices and office groups inside one organisation. Cross-organisation percentiles are out of scope for now. |
| PD-14 | Assistant | Questions are answered through the metric registry, never free SQL. Aggregates only by default. |
| PD-15 | Letters, postcards, labels, forms | Stay with their owning features. The hub links to them. |

## 6. Phase skeleton

`12_roadmap.md` refines this. Every work item carries one of these phase ids.

| Phase | Name | Outcome |
|---|---|---|
| P0 | Foundations and correctness | Canonical ledger layer reconciled with balances, reporting indexes, server-side code catalogs, report rights, office-scope fixes on existing endpoints, engine skeleton (registry, executor, runs, audit), hub shell with the generic runner and filter components, existing reports moved onto the engine. |
| P1 | Daily financial core | Daily, Ledger, My Reports and Statements at legacy parity. PDF and XLSX export. Server-side favorites and saved views. Main Dashboard and Provider Dashboard, first version. |
| P2 | Month-end, A/R and insurance | Monthly, Management and Insurance at parity. Background runs. Scheduled delivery. Day close and deposit. Collections, A/R and insurance dashboards. |
| P3 | Scheduling, clinical, patients and lists | Appointment, Treatment Plan, Referral, Recall, Ortho and all Lists at parity. Morning Huddle. Worklists. |
| P4 | Analytics depth | Roll-ups and snapshots, goals, scorecards, multi-office comparison, alerts. |
| P5 | Builder and assistant | Custom report builder, tenant custom reports, the assistant, optional pilots. |

## 7. Document map

| Document | Owns | Must not redefine |
|---|---|---|
| `01_legacy_inventory.md` | Every legacy report, section, control, option, default (generated from `legacy/*.json`) | — |
| `02_architecture.md` | Engine: registry, definition schema, executor, run lifecycle, exports, schedules, caching, API surface, engine tables, worker topology, testing strategy | Datasets, metrics, rights codes |
| `03_data_foundation.md` | `rpt_*` datasets and roll-ups, money and status normalisation, date and attribution rules, data repairs, schema additions, indexes, reconciliation tests | Engine internals, metric formulas |
| `04_filter_framework.md` | Canonical parameter types and components covering every legacy control, dependency rules, defaults | Report-specific columns |
| `05_metric_catalog.md` | Every KPI: formula on `rpt_*` datasets, variants, settings, benchmarks, availability | Dataset definitions |
| `06_dashboards.md` | Dashboards, scorecards, goals, comparison, alerts, worklists, assistant | Metric formulas |
| `07_ux_blueprint.md` | Hub information architecture, routes, page types, runner, results, saved views, schedules, builder UX, frontend structure, libraries | API shapes |
| `08_security_compliance.md` | Rights codes, scope rules, data classes, audit, export controls, retention | Engine internals |
| `catalog/<category>.md` | One specification per legacy report, plus `catalog/<category>.parity.json` mapping every legacy control | Shared parameter definitions |
| `09_parity_matrix.md` | Generated proof that every legacy control is mapped | — |
| `10_backend_plan.md`, `11_frontend_plan.md` | Work breakdown by phase | Design decisions |
| `12_roadmap.md` | Phases, milestones, dependencies, acceptance criteria, risks, decisions needed | — |

## 8. Writing rules for every document

- Dense and concrete: tables, exact file paths, exact table, column, endpoint and field names. No filler.
- Separate **verified** facts (read in code or in a cited source) from **inference**.
- snake_case for every field, parameter, key and table name.
- Each recommendation becomes a work item with an id, a phase, a size and its dependencies.
- State what is impossible for migrated history and what only works for data created in the app.
- When a product decision is needed, use the recommended default from section 5 and say so.
