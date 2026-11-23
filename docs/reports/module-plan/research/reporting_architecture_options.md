# Reporting & Analytics Engine - Reference-Architecture Options

Research date: 2026-11-22. Audience: backend / frontend engineers and product designers planning the Reports &
Analytics module. Scope: how to build the engine (definitions, data layer, metrics, async runs, exports, schedules,
builder, AI, governance) on PostgreSQL + FastAPI (sync SQLAlchemy) + Redis + React, for a small team.
KPI formulas live in `dental_kpi_dictionary.md`; competitor features live in `competitor_analytics_teardown.md`;
the platform facts quoted here come from `../analysis/be_platform.md`.

## 0. How to read this

| Tag | Meaning |
|---|---|
| (D) | Primary documentation / vendor page / regulation text fetched and read during this research |
| (R) | Project repository README or licence page fetched and read |
| (S) | Search-result snippet or secondary article only; the primary page was not opened. Lower confidence |
| (B) | Vendor API reference bundled with the tooling used for this research; the web page itself was not re-fetched |
| (L) | Local sibling analysis in this folder tree (static code analysis of our own backend), not a web source |
| [unverified] | General engineering knowledge not confirmed from a source in this session. Verify before relying on it |
| *Recommended* | This document's judgement, not a sourced fact |

- Source keys such as `[PG-1]` resolve in section 15.
- Version numbers and prices are as shown on the pages on the research date; re-check before purchase or pinning.
- The shared web-search budget ran out part-way through. After that point only direct fetches of known primary URLs
  were possible, so a few sub-topics (commercial embedded-BI vendors, Azure / AWS LLM compliance pages, forecasting
  libraries) are marked [unverified] rather than researched.

---

## 1. Decisions at a glance

| Layer | *Recommended* for this platform | Main reason | Defer / avoid |
|---|---|---|---|
| Report definition | Code-first declarative registry (Python objects) published as data through a catalog endpoint; one generic UI renders every standard report | Same pattern as the existing CRUD registry (L); definitions are reviewable, versioned, testable | Admin-authored SQL templates; a visual report designer |
| SQL execution | SQLAlchemy Core builders with bound parameters; identifiers only through whitelist maps; the engine injects tenant / office / provider predicates | Bind parameters cannot name a column; `order_by` string injection was CVE-2019-7164 `[SA-2]` | `text()` built with f-strings; Jinja SQL templating |
| Paging | Keyset on `(sort_key, id)` for live OLTP lists; "snapshot the run, page the snapshot" for anything sorted / pivoted / exported | Offset degrades with depth and drifts `[UIL-1]`; a snapshot keeps totals, pages and exports identical | `count(*)` per page; offset paging on fact tables |
| Data layer, step 1 | Missing composite indexes + a dedicated read-only report role with its own timeouts | Fact tables have no index on date / office / provider today (L) | Partitioning, columnar engines |
| Data layer, step 2 | `rpt` schema in the same Postgres: date dimension, daily fact / summary tables, periodic snapshots, refreshed by a worker (full nightly rebuild + intraday delta) | ~1.4 M-row facts (L) are small; summary tables give sub-second dashboards and stable "as of" history | Materialized views as the core mechanism; pg_ivm on ledger tables; ClickHouse / Timescale / Citus |
| Metrics | In-house metric registry (measure / dimension / metric objects compiled to SQL), exported as metadata | One definition feeds dashboards, reports, builder, alerts and AI; no extra runtime | Running Cube or a hosted semantic layer now |
| Async runs | `report_runs` table in Postgres as the source of truth; Cloud Tasks -> internal handler on a dedicated Cloud Run worker service; Cloud Run Jobs for ETL / bulk | No broker to operate; per-queue concurrency caps; Memorystore basic is not durable (L) | Celery + Redis; in-process threads on the API service |
| Exports | ReportLab banded renderer (existing kit), XlsxWriter `constant_memory`, streamed CSV; artifacts in GCS behind an authenticated download | Existing kit (L); constant-memory XLSX `[XW-1]`; 32 MiB non-streamed response cap `[CR-4]` | HTML-to-PDF for large tables; e-mail attachments containing PHI |
| Schedules | One scheduler tick per client -> due schedules -> same run pipeline; e-mail carries a login-gated link, never data | Cloud Scheduler quota and per-client multiplication `[CS-2]`; HIPAA transmission security `[HIPAA-1]` | One Cloud Scheduler job per schedule |
| Builder | JSON query over curated datasets compiled by the metric registry; hard limits | Avoids the "multiple paths, different numbers" complaint seen in competitor builders (teardown doc) | Free SQL for end users |
| Embedded BI | Not for the core. Optional later pilot (Superset, or Metabase guest embeds) reading only `rpt` with a read-only role | BI tools cannot produce the legacy print catalog; second permission model; per-client ops | Making a BI tool the system of record for KPIs |
| AI | Natural language -> structured semantic query validated against the registry; numbers only from query results; BAA-covered model endpoint | Semantic-layer answers fail loudly instead of silently `[DBT-4]`; +17 to +23 pp accuracy from business context `[ARX-1]` | Raw text-to-SQL for end users; sending row-level PHI to a model |
| Governance | Audit every run / view / export / delivery; scope-aware cache keys; row caps, timeouts, cost gate | HIPAA audit controls `[HIPAA-1]`; the current report cache ignores caller scope (L) | Relying on UI-only permission checks |

---

## 2. Platform facts that constrain every option (L)

All rows are from `../analysis/be_platform.md` (static analysis, snapshot 2026-11-21).

| Fact | Consequence for the report engine |
|---|---|
| Cloud Run service per client organisation (`us-central1`), one database per client on a **shared** Cloud SQL PostgreSQL 15.18 instance (`us-east1`), shared Memorystore (basic tier, no AUTH), own buckets per client | Every new piece of infrastructure (worker, scheduler, queue, bucket prefix, migration) multiplies by client. Cross-organisation benchmarking is impossible in-database |
| `statement_timeout` 30 s and `idle_in_transaction_session_timeout` 60 s on every pooled connection; gunicorn `--timeout 120`; Cloud Run request timeout 120 s; 2 vCPU / 2 GiB; pool 10 + 20 per worker process | Synchronous reports must finish well under 30 s per statement. Rendering after fetching must not sit inside an open transaction for more than 60 s |
| No job queue, scheduler or worker tier. Four cron-style scripts whose scheduler binding is not in the repo | Async runs, schedules and ETL need a new execution tier |
| Core fact tables (`patient_procedures`, `patient_payments`, `insurance_claims`, `appointments`, `treatment_plan_items`, ...) carry **no `tenant_id`**; tenant comes from a join to `patients` | Every aggregate needs that join, or the mart must denormalise `tenant_id` and `office_id` onto each row |
| Reporting indexes missing: none on `date_of_service` alone / `office_id` / `provider_id` for procedures; none on `payment_date` alone / `office_id` for payments; none on `adjustment_date`; none on claim office / dates | First fix is plain indexing |
| Documented volumes: ~1.37 M procedures, ~1.33 M payments, ~96 k claims, ~84 k patients, 15 offices | Small by analytics standards; a full nightly rebuild of summary tables is plausible (measure it) |
| Zero views, materialized views, functions, triggers, partitions or extensions in the schema; app SQL is SQLAlchemy Core / ORM; `ruff` rule set `S` flags string-built SQL | Introducing Postgres-only objects is a deliberate convention change |
| Tests run on in-memory SQLite; no Postgres test tier; no test step in CI | Postgres-only SQL (`date_trunc`, `ROLLUP`, `AT TIME ZONE`, materialized views) would ship untested unless a Postgres test tier is added |
| PDF = ReportLab kit `app/services/pdf_report.py` (headers, tables, `Page x of y`); no Excel writer declared (`openpyxl` used but undeclared); CSV via stdlib | Reuse the kit; declare an XLSX writer |
| GCS store with V4 signed URLs (15 min) but a patient-keyed layout; two e-mail stacks with no attachments / templates / multi-recipient | Need a non-patient artifact layout and a report-delivery mailer |
| `audit_logs` + `print_service.record_print` (no `office_id`, no row counts; read API lacks action / date filters) | Extend audit for runs and exports |
| Redis `report:*` cache keys omit caller scope and are never invalidated | The cache key must include the resolved scope before office scoping is wired in |
| Existing `/reports/*` roll-ups and `/dashboard/summary` skip office-scope validation and have no rights guard | Do not copy that pattern |
| Naive-UTC timestamps; per-office time-zone column; business dates are `DATE` | "Created date" reports need per-office conversion; store local business dates in the mart |
| `payment_allocations` amounts are all zero for migrated data | Collections cannot be attributed to a producing provider from allocations for history |

---

## 3. Report definitions, safe execution, paging, streaming (topic 1)

### 3.1 How existing systems define a report

| System | Definition model | Parameter model | Lesson |
|---|---|---|---|
| Frappe / ERPNext "Script Report" `[FR-1]` (D) | Python `execute(filters)` returns `columns` and `data`, optionally `message`, `chart`, `report_summary`, `skip_total_rows`; a column is a dict of `fieldname`, `label`, `fieldtype`, `options` | Filters declared separately (`fieldname`, `label`, `fieldtype`, `options`, `default`, `depends_on`), passed as a dict, used in SQL as named binds | Closest prior art to a legacy-style parameterised catalog: one function + declared columns + declared filters drives a generic UI |
| Redash query parameters `[RD-1]` (D) | SQL text with `{{ param }}` placeholders | Typed: Text, Number, Dropdown, Query-based dropdown, Date, Date range (with dynamic values such as "Last 90 days") | "Text parameters are not safe from SQL injection"; text parameters are barred from embeds. Use typed, enumerated parameters only |
| Metabase SQL questions `[MB-5]` (D) | SQL with variables | Field filters (smart widgets bound to a real column), basic text / number / date, time-grouping parameter, table variable | Bind a filter to a known column so the engine, not the author, generates the predicate |
| Apache Superset `[SUP-3]` (D), `[SUP-4]` (R) | Datasets (physical or virtual SQL) + metrics; Jinja templating only when `ENABLE_TEMPLATE_PROCESSING` is on | Dashboard filters | Docs say Superset's safeguards are a supplement, not a database firewall; use least-privilege DB accounts |
| LookML `[LK-1]` (D) | Views (dimensions, measures) and explores (join graph); Looker generates the SQL | Filters on fields | Separate query structure (joins) from query content (selected fields); authors never write joins per report |
| MetricFlow `[DBT-3]` (D) | Semantic models + metric types (simple, ratio, cumulative, derived, conversion) | Dimension / time-dimension filters, grains | Metric types worth copying (section 5) |
| Banded report designers (JasperReports, SSRS, Crystal) | Title, page header, column header, group header / footer, detail, summary bands | Prompted parameters | [unverified] The band vocabulary is the right model for the PDF renderer (section 7) |

### 3.2 *Recommended* definition schema

One `ReportDefinition` per catalog entry, written in Python and serialised to snake_case JSON by
`GET /reports/catalog` and `GET /reports/catalog/{report_key}`. Standard reports need no per-report frontend code.

| Block | Fields | Notes |
|---|---|---|
| Identity | `report_key`, `title`, `category`, `description`, `legacy_ref`, `definition_version`, `tags`, `status` (active / beta / deprecated) | `definition_version` participates in cache keys and audit rows |
| Access | `required_rights[]`, `scope_mode` (office set / all offices / home office), `provider_restriction`, `contains_phi`, `column_classes_used[]` | Evaluated at catalog listing, run creation, result read, export and schedule execution |
| Parameters | list of `{key, label, type, required, default, options_source, depends_on, validation}` | Types: `date_range` (absolute or relative preset), `as_of_date`, `office_multi`, `provider_multi`, `enum`, `enum_multi`, `bool`, `int_range`, `money_range`, `code_range`, `patient_picker`, `carrier_picker`, `text_whitelisted` |
| Date basis | `date_basis_options[]` (service date, entry / posting date, payment date, ...) and a default | The legacy "transaction date vs created date" switch; resolves to a whitelisted column |
| Columns | list of `{key, label, type, format, align, width_hint, sortable, default_visible, column_class, total, drill}` | `type`: text, int, money, percent, date, datetime, duration. `column_class`: phi / financial / provider_comp (column-level permission). `total`: sum / avg / count / weighted / none. `drill`: target report + parameter mapping |
| Grouping | `group_by_options[]`, `default_group_by[]`, `max_group_levels`, `subtotals`, `page_break_on_group` | Subtotals via `ROLLUP` + `GROUPING()` `[PG-4]` or in the renderer |
| Sorting | `sort_options[]`, `default_sort[]`, implicit unique tie-breaker | Sort keys map to column objects server-side |
| Output modes | `detail`, `summary`, `summary_and_detail`, `pivot` (allowed row / column / value keys), `chart_hints` | One dataset function per mode |
| Execution policy | `sync_budget_ms`, `max_rows_interactive`, `max_rows_export`, `timeout_tier`, `cache_ttl_s`, `freshness_source` (oltp / `rpt` table), `always_async` | Drives the sync-vs-async decision (section 6.2) |
| Export | `formats[]` (pdf / xlsx / csv); `pdf` (`orientation`, `font_size`, `repeat_header`, `totals_on_last_page`); `xlsx` (`freeze_header`, `number_formats`) | Section 7 |
| Dataset binding | reference to a registered builder `build(params, scope) -> Select` (plus optional `totals(params, scope)`) | Not serialised |

### 3.3 Three execution styles

| Style | How | Pros | Cons | Use for |
|---|---|---|---|---|
| A. Query-builder functions (SQLAlchemy Core) | A Python function composes `select()` from model columns; values are bound parameters; optional clauses are added with `if` | Type-checked, composable, same style as the code base (L), testable; statements can be inspected before they run | Each report needs code; complex SQL (window frames, `GROUPING SETS`) is verbose | The legacy catalog (most reports) |
| B. Whitelisted SQL templates | Stored SQL text with named binds and marked optional blocks; the engine substitutes only identifiers from a per-template whitelist | Reads like SQL; quick to port a legacy report | Needs a mini template language and a validator; drifts into string building; `ruff S` flags it (L) | A few very complex reports (aging matrices), engineers only |
| C. Semantic compiler | The request names metrics / dimensions / filters; a compiler emits SQL from the metric registry (section 5) | No per-report SQL; powers dashboards, builder, alerts, AI | Only as expressive as the model; needs the mart | KPI dashboards, scorecards, custom builder, AI |

*Recommended*: A for the catalog, C for analytics surfaces, B only as an escape hatch.

### 3.4 Safety rules for parameterised SQL

| Rule | Detail | Source |
|---|---|---|
| Values are always bound parameters | Never interpolate user values into SQL text. Maintainer position: a literal SQL string is only safe if it contains no user-entered text | `[SA-2]` (S) |
| Identifiers come from server-side maps | Bind parameters fill values, not column names; map request keys (`sort=provider_name`) to column objects; reject unknown keys | `[SA-2]` (S) |
| No raw `order_by` / `group_by` / `filter` strings | SQLAlchemy through 1.2.17 / 1.3.0b2 allowed injection via `order_by` (CVE-2019-7164); the fix made textual coercion an error. Semgrep ships a rule for raw SQL in those clauses | `[SA-2]` (S) |
| Scope is injected by the engine | Tenant, office set and provider restriction are added by the executor after the builder returns, not by each definition | *Recommended* |
| Read-only execution | Dedicated role with `SELECT` on reporting objects only, plus `default_transaction_read_only`; no DML is possible even if a statement is wrong | `[PG-5]` (D) |
| Per-run timeouts | `SET LOCAL statement_timeout` per transaction, or a role-level setting; the docs advise against setting it globally in `postgresql.conf` | `[PG-5]` (D) |
| Row cap | Always `LIMIT max_rows + 1`; if the extra row arrives, mark the result truncated and offer an async export | *Recommended* |
| Validate any stored SQL | If style B or admin SQL is ever allowed: parse with `sqlglot` (MIT, pure Python, AST with table / column discovery), allow `SELECT` only, whitelisted schemas / tables / functions, single statement | `[SQG-1]` (R) |
| The database is the last line of defence | Superset's own docs treat application safeguards as a supplement and recommend least-privilege accounts plus database-level auditing | `[SUP-3]` (D) |

### 3.5 Server-side paging and sorting of large results

| Topic | Fact | Source |
|---|---|---|
| Offset paging | Two drawbacks: pages drift when rows are inserted, and the database must count all skipped rows, so response time grows with depth | `[UIL-1]` (D) |
| Keyset (seek) paging | `WHERE (sale_date, sale_id) < (?, ?) ORDER BY sale_date DESC, sale_id DESC FETCH FIRST n ROWS ONLY`; needs a deterministic order (add a unique column) and a matching composite index; stays fast on deep pages | `[UIL-1]` (D) |
| PostgreSQL support | Row-value comparison is supported and usable as an index access predicate; an index scan with `ROW(a,b,c) > ROW(...)` as index condition is shown on the PostgreSQL mailing list | `[UIL-1]` (D), `[UIL-2]` (S) |
| Limits | Cannot jump to an arbitrary page; backward paging reverses comparisons; mixed ASC / DESC keys need workarounds | `[UIL-1]` (D), `[UIL-2]` (S) |

*Recommended* rules:

1. Live OLTP lists (worklists, registers): keyset with an opaque cursor encoding `(sort values, id)`; expose only sorts
   backed by an index; no total page count (return `has_more`); totals come from a separate aggregate query.
2. Anything the user can re-sort on any column, pivot, or export: run once, store the result snapshot (section 6.7),
   then page / sort / filter the snapshot. Screen totals, page N and the exported file then come from the same rows,
   and re-sorting never re-runs the expensive query.
3. Do not issue `SELECT count(*) FROM (<filtered stmt>)` on every page as the generic CRUD list does today (L).

### 3.6 Streaming and large exports

| Mechanism | Fact | Source |
|---|---|---|
| Server-side cursor in SQLAlchemy | `execution_options(yield_per=N)` gives a fixed-size batch buffer and is described as usually more straightforward than `stream_results` + `partitions()`; with plain `stream_results` the buffer grows up to 1000 rows (`max_row_buffer`). PostgreSQL drivers use client-side (fully buffered) cursors by default | `[SA-1]` (D) |
| psycopg2 named cursors | `itersize` default 2000 rows per round trip; psycopg2 raises if a server-side cursor is used with DML / DDL | `[PG2-1]` (D), `[SA-1]` (D) |
| `COPY ... TO STDOUT` | `cursor.copy_expert(sql, file)` streams a user-composed `COPY` to a file-like object; compose dynamic parts with `psycopg2.sql` | `[PG2-1]` (D) |
| FastAPI `StreamingResponse` + session dependency | Version-dependent. 0.106.0 moved yield-dependency exit code to before the response is sent (a streamed body could no longer use the request session). 0.118.0 reverted to "after the response is sent". 0.121.0 added `Depends(scope="function")` / `scope="request"`; the default for yield dependencies is `request` | `[FA-1]` `[FA-2]` (D) |
| Cloud Run limits | HTTP/1 response limited to 32 MiB unless chunked / streamed; request timeout default 5 min, maximum 60 min | `[CR-1]` `[CR-4]` (D) |
| Signed URLs | V4 signed URLs are bearer credentials valid for up to 7 days; anyone holding the URL can use it | `[GCS-1]` (D) |

*Recommended*:

- Small results (interactive): fetch, close the transaction, return JSON.
- Large exports: always in the worker, written to GCS, downloaded through an authenticated endpoint that either
  streams the object or issues a short-lived signed URL after a permission check. Do not stream a database cursor
  through the API service: it pins a pooled connection and a threadpool thread for the whole download, the backend
  does not pin its FastAPI version (L), and the 60 s idle-in-transaction limit applies between fetches.
- In the worker, read with `yield_per` (or `COPY` for raw CSV) and write the file incrementally (constant memory).
- With a server-side cursor each `FETCH` is its own statement, so `statement_timeout` should bound each fetch rather
  than the whole export [unverified - inferred from the "measured from the time a command arrives" wording in
  `[PG-5]`; test before relying on it].

---

## 4. Data layer options (topic 2)

### 4.1 Option matrix

"Cloud SQL" column = availability on Cloud SQL for PostgreSQL per the supported-extensions page `[CSQL-3]` (D).

| # | Option | What it is | Freshness | Effort / ops | Cloud SQL | Warranted when | Main risks |
|---|---|---|---|---|---|---|---|
| 1 | OLTP + proper indexes | Composite / covering / partial indexes matching report predicates | Live | Low | Yes | Always first. Detail registers, worklists, single-patient or single-day reports | Write overhead per index; all-time aggregates still scan |
| 2 | Plain views | Named `SELECT`s forming a stable reporting contract | Live | Low | Yes | To hide joins (tenant via `patients`), sign conventions, soft-delete rules | No speed-up; complex views hide cost |
| 3 | Materialized views | Stored query result, re-computed by `REFRESH` | As of last refresh | Low-medium | Yes | Medium-size aggregates that tolerate hours of staleness | Full recompute each refresh; one refresh at a time; `CONCURRENTLY` needs a unique index `[PG-1]` |
| 4 | Incremental view maintenance (`pg_ivm`) | Trigger-maintained materialized views (IMMV) | Live (same transaction) | Medium | Yes (1.9) | Small, simple aggregates over low-write tables | Slows base-table writes; `ExclusiveLock` on the IMMV; many SQL restrictions `[IVM-1]` |
| 5 | Roll-up / summary tables | Ordinary tables (for example daily facts by office / provider / procedure) filled by our own job | Minutes (job cadence) | Medium | Yes | KPI dashboards, trends, scorecards, benchmarking across offices | Correctness under edits / voids / back-dating; double counting; reconciliation needed |
| 6 | Star-schema mart in the same Postgres | Facts + conformed dimensions + date dimension + snapshots in an `rpt` schema | Minutes to nightly | Medium-high | Yes | A broad metric catalog, a custom builder, "as of" history, AI | Modelling effort; ETL to operate per client DB |
| 7 | Read replica | Physical streaming replica used for reads | Seconds behind (async) | Low-medium, extra instance cost | Yes | Report load visibly hurts chairside latency | No speed-up per query; lag; cannot hold replica-only tables `[CSQL-1]` |
| 8 | Partitioning | Declarative range / list / hash partitions | Live | Medium-high | Yes (`pg_partman` 5.4.3) | Tables larger than RAM; bulk retention by partition `[PG-3]` | Keys must include the partition key; planning overhead |
| 9 | Columnar engine inside Postgres-compatible service | AlloyDB columnar engine (in-memory column store) | Live | Migration to AlloyDB | Not Cloud SQL | Scan-heavy analytics on raw facts at tens of millions of rows | Platform migration; memory cost `[ALLOY-1]` |
| 10 | DuckDB / `pg_duckdb` | Vectorised engine embedded in Postgres (`pg_duckdb`) or in a worker process (DuckDB + `postgres` extension) | Live (reads Postgres) | Medium | `pg_duckdb` not listed | Heavy ad-hoc pivots / exports without building a mart | Not on Cloud SQL; reads the row store, so no columnar benefit `[DUCK-1]` |
| 11 | Timescale continuous aggregates | Incrementally refreshed time-bucket aggregates | Near-live | Self-host / vendor cloud | Not listed | Time-series ingest workloads | Licence (TSL) and hosting `[TS-1]` |
| 12 | Citus | Distributed Postgres + columnar access method | Live | High | Not listed | Hundreds of GB, many tenants in one database | AGPL; columnar tables cannot `UPDATE` / `DELETE` `[CIT-1]` |
| 13 | ClickHouse via CDC | Separate OLAP database fed by Postgres logical replication | Seconds | High (second system + pipeline) | External | Billions of rows, sub-second slice-and-dice | CDC edge cases, second security / BAA boundary `[CH-1]` |
| 14 | BigQuery | Warehouse fed by Datastream CDC or queried through federation | Seconds to minutes | Medium | External (same cloud, BAA-listed) | Cross-organisation benchmarking, open data access for DSOs, ML | Cost model; another permission system; latency for interactive use |

### 4.2 Option 1 - indexes first

| Topic | Guidance | Source |
|---|---|---|
| What to add | Composite indexes that lead with the scope column and follow with the date: `patient_procedures (office_id, date_of_service)`, `(provider_id, date_of_service)`; `patient_payments (office_id, payment_date)`; `patient_adjustments (office_id, adjustment_date)`; `insurance_claims (office_id, status)` plus the claim date columns used by aging; `audit_logs (tenant_id, created_at)` | (L) section 9.2 lists what is missing |
| Partial / covering indexes | Partial indexes for the common predicate (`WHERE NOT is_void`), `INCLUDE` columns to allow index-only scans on money columns | [unverified] |
| BRIN | Block-range indexes suit very large, append-ordered date columns; unlikely to matter at ~1.4 M rows | [unverified] |
| Rollout | `CREATE INDEX CONCURRENTLY` cannot run inside the transaction Alembic opens; use an autocommit block. Migrations run inside the auto-deploy step against the main production DB | (L) section 9.2 |
| Duplicates | Two identical `(patient_id, date_of_service)` and two `(patient_id, payment_date)` indexes exist; drop one of each | (L) section 9.2 |
| Limit of this option | Indexes fix range lookups. All-time sums (A/R, aging) and wide trend queries still touch most rows; that is what options 5-6 are for | *Recommended* |

### 4.3 Option 3 - materialized views

| Rule | Text | Source |
|---|---|---|
| `CONCURRENTLY` | Refreshes "without locking out concurrent selects"; without it a large refresh uses fewer resources and completes faster but can block readers; it "may be faster in cases where a small number of rows are affected" | `[PG-1]` (D) |
| Unique index | Allowed only if there is at least one `UNIQUE` index on the materialized view "which uses only column names and includes all rows" (no expression index, no `WHERE`) | `[PG-1]` (D) |
| Populated first | `CONCURRENTLY` only works on an already populated view and cannot be combined with `WITH NO DATA` | `[PG-1]` (D) |
| Concurrency | "Only one `REFRESH` at a time may run against any one materialized view" | `[PG-1]` (D) |
| Cost | Every refresh re-runs the whole defining query; cost grows with the base data | `[CIT-2]` (D) |
| Scheduling | `pg_cron` 1.6.4 is available on Cloud SQL (`cloudsql.enable_pg_cron`), or call `REFRESH` from the worker | `[CSQL-3]` (D) |
| Row security | Row-level security policies attach to tables, not to materialized views | [unverified] |

Verdict: useful for slow-moving flattening (provider / office / procedure-code dimension views, last night's aging),
not as the core aggregate mechanism: there is no incremental refresh, no row security, and the SQLite test suite
cannot see them (L).

### 4.4 Option 4 - `pg_ivm`

| Aspect | Fact | Source |
|---|---|---|
| Mechanism | `create_immv` creates an incrementally maintainable materialized view; triggers apply base-table changes in the same transaction | `[IVM-1]` (R) |
| Supported | Inner joins, restricted outer joins, `DISTINCT`, built-in `count` / `sum` / `avg` / `min` / `max`, simple subqueries, `EXISTS`, non-recursive CTEs | `[IVM-1]` (R) |
| Not supported | `HAVING`, `ORDER BY`, `LIMIT`, set operations, window functions, user-defined aggregates; base tables must be plain tables (no views, no partitioned tables) | `[IVM-1]` (R) |
| Locking | Under READ COMMITTED a base-table change takes an `ExclusiveLock` on the IMMV (except single-table inserts into a view without `DISTINCT` / `GROUP BY`); `create_immv` / `refresh_immv` take `AccessExclusiveLock` | `[IVM-1]` (R) |
| Write cost | Base-table modifications get slower; the README says IVM suits small, infrequent changes. `sum` / `avg` on floats can drift (use `numeric`); deleting the current min / max can force recomputation | `[IVM-1]` (R) |
| Cloud SQL | Version 1.9 on PostgreSQL 13+; incompatible with in-place major-version upgrade, data export and Database Migration Service - remove it before those operations | `[CSQL-3]` (D) |

Verdict: do not put IMMVs on the ledger tables. Every chairside write would pay trigger cost and serialise on the
IMMV lock, and the export / upgrade incompatibility on Cloud SQL is an operational trap.

### 4.5 Option 5 - roll-up tables (the workhorse)

| Design point | Guidance | Source |
|---|---|---|
| Basic pattern | An ordinary table with a unique key on the grain, filled by `INSERT ... SELECT ... GROUP BY ... ON CONFLICT (...) DO UPDATE`; the job remembers where it stopped and aggregates only newer rows | `[CIT-2]` (D) |
| Why the append-only form is not enough here | The pattern assumes insert-only sources. Ledger rows are voided, edited and back-dated, so `views = views + EXCLUDED.views` style increments double count or go stale | `[CIT-2]` (D), `[CIT-3]` (S) |
| *Recommended* refresh | (a) Nightly full rebuild of every summary table (build into a new table, swap) - at ~1.4 M fact rows this is likely seconds to minutes; measure. (b) Intraday "recompute the slice": find `(office_id, business_date)` slices touched since the last watermark (by `updated_at`, soft-delete flags, or a small dirty-keys table written by the service layer) and replace each slice idempotently (`DELETE` + `INSERT` in one transaction). (c) A trailing-window recompute (last 60-90 days) as the safety net for back-dated edits | *Recommended* |
| Live tail | For "today so far" tiles, union the summary through yesterday with an on-the-fly query over today's OLTP rows | `[CIT-3]` (S) |
| Additivity | Sums and counts add up across days / offices / providers. Distinct counts (active patients, new patients) and medians do not: keep a patient-grain table and count at query time, or store sketches (`hll` 2.18 is available on Cloud SQL) | `[CSQL-3]` (D) |
| Ratios | Store numerators and denominators, never the ratio; compute the ratio after summing | *Recommended* |
| Date basis | Carry both the service date and the entry / posting date (office-local) so the legacy "transaction date vs created date" switch is a column choice | (L) section 2.5 |
| Freshness contract | A `rpt.refresh_log` row per table (watermark, started, finished, rows, status); every response carries `data_as_of` | *Recommended* |
| Reconciliation | Daily control totals: summary totals vs direct OLTP sums per office and month; alert on mismatch. This is what keeps dashboards and reports from disagreeing (the top complaint about overlay analytics tools, see teardown doc) | *Recommended* |

### 4.6 Option 6 - star-schema mart in the same Postgres

Kimball technique names `[KIM-1]` (D):

| Technique | Definition | Dental mapping |
|---|---|---|
| Transaction fact table | One row per measurement event | Ledger line (procedure, payment, adjustment, refund); appointment event; claim event |
| Periodic snapshot fact table | A row "summarizes many measurement events occurring over a standard period"; "the grain is the period, not the individual transaction"; uniformly dense `[KIM-2]` (D) | Daily A/R balance by guarantor / patient / office; month-end aging buckets; daily schedule utilisation by operatory and provider. Needed because the OLTP ledger is mutable, so "A/R as of 31 March" cannot be re-derived reliably later |
| Accumulating snapshot fact table | A row "summarizes the measurement events occurring at predictable steps between the beginning and the end of a process", with "a date foreign key ... for each critical milestone"; the row "is revisited and updated" `[KIM-3]` (D) | Claim lifecycle (created -> sent -> acknowledged -> paid / denied -> closed); treatment-plan item (presented -> accepted -> scheduled -> completed); recall (due -> contacted -> scheduled -> seen) |
| Factless fact table | Events or coverage with no measure | Recall due, appointment capacity slots, provider-office assignment days |
| Aggregate fact tables | Pre-summarised facts | The roll-ups of section 4.5 |
| Calendar date dimension | One row per day with calendar and business attributes | Fiscal periods, week numbering, business-day flag, per-office closure flags |
| Role-playing dimensions | One dimension used in several roles | Date as service date / entry date / payment date; provider as treating / billing / hygienist |
| Degenerate / junk dimensions | Identifiers and flag bundles kept on the fact | Claim number, transaction id; void / insurance / pre-auth flags |
| Conformed dimensions | Shared dimensions so facts can be combined ("drilling across") | office, provider, patient, procedure code (with category), carrier / plan, payment type, adjustment type, referral source, operatory, appointment status |
| Slowly changing dimensions | Type 0 retain original, Type 1 overwrite, Type 2 add new row, Type 3 add new attribute, Types 4-7 mini-dimension and hybrids | Type 2 for provider specialty / status and office hierarchy when history must be reported as it was; Type 1 for corrections; snapshot the patient's home office and primary carrier on facts rather than versioning the patient dimension |

Build notes (*Recommended*):

- Plain SQL `INSERT ... SELECT` steps orchestrated by the Python worker, DDL managed by Alembic like the rest of the
  schema. dbt Core would add tests and lineage but also a second toolchain [unverified licence / fit].
- Put `tenant_id`, `office_id` and local business dates on every fact row (the OLTP fact tables lack `tenant_id`, L).
- Money stays `numeric`; apply the ledger sign helper once in the load step so every consumer sees one convention (L).
- Keep natural keys (source table + id) on facts for drill-through to the OLTP record and for idempotent reloads.
- The mart lives in each client database, so every load job runs per client.

### 4.7 Option 7 - read replica

| Fact | Source |
|---|---|
| Read replicas offload read / analytics traffic; replication is asynchronous; a replica is billed like a standard instance (cross-region adds transfer charges) | `[CSQL-1]` (D) |
| Replicas may have different vCPU / memory; undersized replicas risk out-of-memory events | `[CSQL-1]` (D) |
| User tables cannot be changed on a replica; all changes go through the primary. So no replica-only indexes or scratch tables | `[CSQL-1]` (D) |
| Up to 10 direct replicas; Cloud SQL does not load-balance between replicas; read replicas do not fail over automatically | `[CSQL-1]` (D) |
| Monitoring: Replication Lag (time) and Lag Bytes metrics | `[CSQL-1b]` (D) |
| Read pools (single endpoint over up to 20 nodes, autoscaling GA 2026) need Enterprise Plus edition | `[CSQL-2]` (S) |
| Long reads on a hot standby can be cancelled by recovery conflicts unless standby delay / feedback settings are tuned | [unverified] |

*Recommended*: not a first step. The instance is shared by all client databases (L), so one replica would cover every
client, but it does not make a slow query fast. Add it when measured report load on the primary is a problem, and
point the report role's engine at it; mart tables are still built on the primary and replicate.

### 4.8 Option 8 - partitioning

- Benefits are "normally worthwhile only when a table would otherwise be very large"; rule of thumb: "the size of the
  table should exceed the physical memory of the database server" `[PG-3]` (D).
- Pruning is driven only by partition-key constraints; unique / primary keys must include all partition-key columns;
  too many partitions increases planning time and memory; detaching / dropping a partition is far cheaper than a bulk
  `DELETE` `[PG-3]` (D).
- *Recommended*: do not partition OLTP tables at ~1.4 M rows. Revisit for mart fact tables (by month) or audit / run
  history (retention by partition drop) only when they reach tens of millions of rows.

### 4.9 Options 9-14 - columnar and external OLAP

| Technology | Verified facts | Fit |
|---|---|---|
| AlloyDB columnar engine | In-memory column store alongside the row store; accelerates scans, aggregates (`SUM`, `MIN`, `MAX`, `AVG`, `COUNT`), and hash joins; auto-columnarisation or manual; default 30 % of instance memory; enabling requires a restart; frequent updates invalidate columnar blocks; works on read pools. Google's "up to 100x" is a vendor upper bound `[ALLOY-1]` (D)(S) | Only via migration from Cloud SQL to AlloyDB. Keep as a scale-up path, not a plan |
| `pg_duckdb` | MIT; PostgreSQL 14-18; `duckdb.force_execution` routes analytical `SELECT`s to DuckDB; 1.0 announced by MotherDuck (September 2025 per secondary coverage). Vendor benchmark: up to ~4x vs fully indexed PostgreSQL on a TPC-H-like set, larger gains where indexes cannot help. Postgres tables are still read from row storage (no columnar / compression benefit); must be installed on the primary as well as replicas; one DuckDB instance per connection `[DUCK-1]` `[DUCK-2]` (D)(R) | Not in the Cloud SQL extension list `[CSQL-3]`. Not usable today |
| DuckDB in the worker (`postgres` extension) | `ATTACH ... (TYPE postgres, READ_ONLY)`; binary `COPY` reads by default, parallel scans by ctid ranges, filter pushdown enabled by default, `postgres_query()` to push a whole query down; statement / idle timeouts configurable `[DUCK-3]` (D) | Optional helper for huge pivots / Parquet extracts to GCS without touching the database server. Adds a dependency; pulls rows over the wire |
| Timescale | Continuous aggregates, columnstore and retention policies are Community (TSL) edition only; the Apache-2 edition has basic hypertables; "You cannot sell TimescaleDB Community Edition as a service" `[TS-1]` (D). Not in the Cloud SQL list `[CSQL-3]` | No |
| Citus | AGPL-3.0; distributed tables, schema-based sharding (12.0+), columnar storage where "update, delete, and foreign keys are currently unsupported"; managed as Azure elastic clusters `[CIT-1]` (R) | No (wrong cloud, wrong scale) |
| ClickHouse | Postgres CDC connector in ClickPipes (PeerDB engine) reported GA in May 2025; vendor reports 400+ companies replicating 200+ TB / month `[CH-1]` (S) | No. A second database + CDC + BAA boundary for ~1 M-row tables is unjustified |
| BigQuery | Datastream PostgreSQL -> BigQuery CDC (GA 2023) `[DS-1]` (S); federated `EXTERNAL_QUERY` runs the inner statement on Cloud SQL (docs recommend pointing it at a read replica) `[BQ-1]` (D); BigQuery, Datastream, Cloud SQL and AlloyDB are on the Google Cloud HIPAA BAA list `[GCP-HIPAA]` (D) | The natural home for a later cross-organisation benchmark store and for "bring your own BI" data access, because one database per client blocks in-database cross-org analytics (L) |

### 4.10 Multi-tenant considerations

| Topic | Guidance | Source |
|---|---|---|
| Today's isolation | Database per client + `tenant_id` column; fact tables rely on a join to `patients` | (L) |
| Mart keys | Stamp `tenant_id` and `office_id` on every `rpt` row; lead every index with them | *Recommended* |
| Row-level security as a backstop | When enabled, a table is default-deny without policies. Superusers and `BYPASSRLS` roles always bypass; table owners bypass unless `FORCE ROW LEVEL SECURITY`; referential-integrity checks bypass (covert-channel caution); simple column-vs-value policies are "the simplest and best-performing case" | `[PG-2]` (D) |
| RLS performance | Index the policy columns; wrap function calls in `(select ...)` so the planner evaluates them once (initPlan); name roles in policies; still add explicit filters in queries | `[SB-1]` (D) |
| How to pass scope | `SET LOCAL app.tenant_id = ...` / `app.office_ids = ...` at the start of the report transaction, policies compare columns to `current_setting(...)`; run as a non-owner `report_reader` role | [unverified pattern detail] |
| Backups and RLS | `row_security = off` makes queries error instead of silently filtering (pg_dump does this) | `[PG-5]` (D) |
| Partition by tenant | Unnecessary with a database per client. If tenants are ever pooled: hash / list partition by tenant only for very large tables `[PG-3]` | *Recommended* |
| Shared instance | All client databases share one Cloud SQL instance and connection budget (L): cap worker concurrency globally, not just per client | *Recommended* |
| Cross-organisation benchmarks | Need a central store fed by opt-in, de-identified aggregates (section 10.4) | *Recommended* |

---

## 5. Semantic / metrics layer (topic 3)

### 5.1 Why define each KPI once

- The top complaint about dental analytics overlays is "numbers do not match the PMS" (teardown doc, takeaway 2). A
  native module can avoid it only if dashboards, reports, the builder, alerts and AI all compute from one definition.
- With a semantic layer the model's failure mode changes from silent wrong answers to explicit refusals `[DBT-4]`.

### 5.2 Options

| Option | Licence / cost | What it gives | Multi-tenant / security | Runtime to operate | Fit here |
|---|---|---|---|---|---|
| Cube (Cube Core) | Backend Apache-2.0, client MIT `[CUBE-1]` (S); Cube Cloud is the paid managed tier | Data model in YAML / JS (cubes, views, measures, dimensions, joins); pre-aggregations (rollup tables with scheduled refresh); REST / GraphQL / SQL APIs `[CUBE-1]` (S) | Security context from JWT; `query_rewrite` adds row filters; `context_to_app_id` compiles a model per tenant; `driver_factory` picks a database per tenant; `context_to_orchestrator_id` isolates queues / cache; each tenant id costs "single-digit to dozens of MBs" `[CUBE-2]` (D). Data access policies: `member_level`, `row_level`, `member_masking`, combined by documented union / intersection rules; in Cube Core groups are mapped manually via `context_to_groups` `[CUBE-3]` (D) | A Node service + Cube Store + refresh workers, per client or one multi-tenant deployment with a driver factory | Strong feature set, but a second runtime and a second permission model. Revisit only if the in-house compiler becomes a bottleneck |
| dbt Semantic Layer / MetricFlow | MetricFlow is Apache-2.0 since v0.209.0 (14 Oct 2025; earlier BSL) `[DBT-1]` (S). The hosted Semantic Layer APIs remain a dbt platform feature on paid plans `[DBT-2]` (S) | Metric types: simple, ratio, cumulative (window / grain-to-date), derived (including `offset_window` period-over-period), conversion; time grains; `fill_nulls_with`; filters with `Dimension()` / `TimeDimension()` `[DBT-3]` (D) | Delegated to the warehouse and to the hosted service | dbt project + MetricFlow library (and the hosted service if APIs are wanted) | Good vocabulary to copy; adopting it means adopting dbt. MetricFlow as an embedded SQL compiler is possible in principle [unverified fit with a FastAPI service] |
| Malloy | MIT; described as "a semantic modeling and query language built on top of SQL"; supports PostgreSQL among others; "Publisher" is an open-source semantic model server with REST and MCP APIs `[MAL-1]` (R) | A modelling + query language | Via the server | Malloy runtime / Publisher (Node) | Interesting for AI agents; small ecosystem; new language for the team |
| LookML | Proprietary to Looker `[LK-1]` (D) | Views, explores, dimensions, measures; generated SQL; Git-managed | Looker's model | Looker | Not applicable (commercial BI). Useful as a design reference |
| Lightdash | Open-source core (MIT per secondary sources) with a separately licensed enterprise area; works from dbt projects or standalone Lightdash YAML; "context layer" of metrics, dimensions, joins, access rules; embedding SDK with row-level security and user attributes `[LD-1]` (R)(S) | BI tool with its own metrics layer | Its own | Node service + Postgres | A BI product, not a library |
| Superset datasets + metrics | Apache-2.0 `[SUP-4]` (R) | Thin semantic layer (dataset metrics / calculated columns) | Dataset RLS filters `[SUP-3]` | Section 9 | Thin; tied to Superset |
| Open Semantic Interchange (OSI) | Specification in an Apache-2.0 repository; MetricFlow used as an initial reference implementation; backed by dbt Labs, Snowflake, Salesforce, Atlan, Alation and others `[DBT-1]` (S) | Vendor-neutral metric interchange format | - | - | Keep the in-house registry shaped so it can be exported to OSI later [unverified - spec maturity not reviewed] |
| In-house metric registry | Our code | Exactly what we need | Reuses the existing office-scope and rights engine (L) | None (inside the API / worker) | *Recommended* |

### 5.3 *Recommended* lightweight metric registry

| Object | Fields | Notes |
|---|---|---|
| `Dataset` (subject area) | `key`, `label`, base table / view in `rpt`, grain description, `tenant_column`, `office_column`, default date dimension, allowed joins (to conformed dimensions only) | The join graph is a whitelist; no arbitrary joins |
| `Dimension` | `key`, `label`, dataset, column expression, `type` (category / date / number / bool), `hierarchy` (office -> region; code -> category), `column_class` (phi / financial / none), `cardinality_hint`, `drill_report` | `column_class` drives column-level permission and AI exposure |
| `Measure` | `key`, `label`, dataset, SQL expression (SQLAlchemy column expression), `aggregation` (sum / count / count_distinct / min / max / avg), `additivity` (additive / semi-additive over time / non-additive), `format`, `unit` | Semi-additive = balances and snapshots (take last value in period, do not sum across days) |
| `Metric` | `key`, `label`, `definition_text`, `type` (simple / ratio / derived / cumulative / snapshot), inputs, `filters`, `default_date_basis`, `time_grains[]`, `allowed_dimensions[]`, `good_direction` (up / down), `goal_supported`, `benchmark_refs[]`, `owner`, `version`, `tests[]` | Types follow MetricFlow `[DBT-3]`; `definition_text` feeds tooltips, glossary and the AI prompt |
| Query contract | `{metrics[], dimensions[], filters[], date_range, grain, compare_to, order_by[], limit}` | The same JSON is used by dashboards, the builder, alerts and AI tools |
| Compiler | Resolves keys -> SQLAlchemy `select()` against `rpt` tables with bound parameters; injects tenant / office / provider scope; computes ratios from summed components; period-over-period by a second aligned query | Ratio of sums, never average of ratios |
| Metadata endpoint | `GET /analytics/metadata` returns datasets, dimensions, measures, metrics (snake_case) | Frontend pickers, tooltips, the glossary page |
| Governance | Metric changes are code-reviewed and versioned; "golden number" tests compare each metric with the legacy report for fixed periods | Needs a Postgres test tier (L) |

Costs to accept: no caching layer beyond our own run cache; no SQL API for third-party BI; pivot and advanced
window metrics must be coded. Benefits: zero new runtime per client, one permission model, Python end to end.

---

## 6. Asynchronous execution (topic 4)

### 6.1 Report-run lifecycle

`queued -> running -> succeeded | failed | cancelled`, plus `cancelling` (requested while running) and `expired`
(artifact purged). The existing `utility_runs` and `letter_batch_runs` tables already have this shape (L).

| Column group | Columns |
|---|---|
| Identity | `id` (UUID), `tenant_id`, `report_key`, `definition_version`, `source` (interactive / schedule / api / ai), `schedule_id`, `requested_by`, `run_as_user_id` |
| Request | `params` (JSON, normalised), `params_hash`, `scope` (resolved office ids, provider restriction, column-class profile), `scope_hash`, `cache_key`, `formats[]`, `priority` |
| State | `status`, `queued_at`, `started_at`, `finished_at`, `heartbeat_at`, `attempt`, `worker_id`, `db_backend_pid`, `cancel_requested_at`, `error_code`, `error_message` |
| Result | `row_count`, `patient_count`, `truncated`, `data_as_of`, `result_ref` (inline / table / object), `artifacts[]` (format, object key, bytes, sha256), `expires_at`, `cache_hit_of` |

### 6.2 Sync or async?

| Path | When | Behaviour |
|---|---|---|
| Inline | Definition marked fast (summary tables, single-day registers) and the request is interactive | Execute with a short timeout (for example 10 s); return rows; still write a `report_runs` row for audit |
| Promote | Inline attempt exceeds its budget, or the definition is `always_async`, or an export of a large result is requested | Return `202` with `run_id`; the client polls `GET /reports/runs/{id}` and / or receives a WebSocket event and an inbox notification (both exist without producers today, L) |
| Scheduled / bulk | Schedules, statements, labels, ETL | Always async |

### 6.3 Queue and scheduler options

| Option | Verified facts | Assessment for this platform |
|---|---|---|
| Celery (5.7 stable docs) | Redis broker visibility timeout defaults to 1 hour; unacknowledged tasks (ETA / long tasks, `acks_late`) are redelivered after it `[CEL-2]` (S). Revoked ids are kept in worker memory (lost if all workers restart unless `--statedb`); `terminate=True` "is a last resort for administrators" and kills the process, not just the task; soft / hard time limits; per-task rate limits; `--max-tasks-per-child`, `--max-memory-per-child` `[CEL-1]` (D). Beat must run in exactly one place to avoid duplicate deliveries `[SUP-2]` (D) | Powerful but heavy: broker + result backend + beat + flower-style monitoring, per client. Memorystore basic has no persistence guarantee (L) |
| RQ (2.x) | Needs Redis >= 5 or Valkey >= 7.2; workers require `fork()` (Windows needs WSL); `result_ttl` default 500 s, `failure_ttl` one year; `unique=True` with a `job_id` raises `DuplicateJobError`; `on_success` / `on_failure` / `on_stopped` callbacks `[RQ-1]` (D). `send_stop_job_command()` stops a running job; `SpawnWorker` (2.2.0), worker pools `[RQ-2]` (D). Built-in cron scheduling from 2.5 `[RQ-1]` (S) | Simplest Redis queue; same durability concern; workers cannot run natively on a Windows development machine (WSL needed) |
| Dramatiq (2.2.0) | LGPL; Python 3.10+; RabbitMQ (default) or Redis; assumes idempotent actors; retries with exponential backoff (default `max_retries` 20, min backoff 15 s, max 7 days); default `time_limit` 10 minutes; dead-letter retention 7 days; rate limiters, results and aborting are cookbook / middleware topics `[DRA-1]` `[DRA-2]` (D) | Clean design; still a broker to run; licence review (LGPL) |
| arq | asyncio + Redis; README states the project is in maintenance-only mode; v0.28.0 `[ARQ-1]` (S) | Avoid for new work; backend is sync |
| Procrastinate (3.x) | PostgreSQL-backed: stores tasks, manages locks, dispatches; `LISTEN` / `NOTIFY` with a polling fallback; `SELECT FOR UPDATE` claim through stored procedures; locks (ordered / mutex), queueing locks, priorities, periodic tasks, scheduling in the future; `cancel_job_by_id(job_id, abort=True)` with `context.should_abort()` for sync tasks; async core, sync tasks run in threads; Python 3.11+, PostgreSQL 13+. The authors note missing monitoring tools and are looking for maintainers `[PROC-1]` `[PROC-2]` (D) | Best library fit for "Postgres is the queue": transactional enqueue, no broker. Needs an always-on worker process (Cloud Run worker pool) and an async connector alongside the sync app |
| PgQueuer | MIT; Python 3.11+, PostgreSQL 14+; `FOR UPDATE SKIP LOCKED`, `LISTEN` / `NOTIFY`, cron-style scheduling, per-entrypoint concurrency limits, asyncpg / psycopg drivers, dashboard CLI `[PGQ-1]` (R) | Alternative to Procrastinate; examples are asyncio-first |
| Hand-rolled `SKIP LOCKED` loop over `report_runs` | Standard pattern | [unverified] ~100 lines; full control; we own retries, heartbeats and the reaper |
| APScheduler | 4.0 is still a pre-release (4.0.0a5) with an unstable store schema and no migration path from 3.x `[APS-1]` (S) | In-process schedulers duplicate under multiple workers / instances; do not use on Cloud Run |
| Cloud Tasks -> Cloud Run | HTTP target tasks: dispatch deadline default 10 min, range 15 s to 30 min; success = any 2xx; back-off on 429 / 503 `[CT-1]` (D). Queue settings `maxDispatchesPerSecond`, `maxConcurrentDispatches` (limit concurrent work), retry config (`maxAttempts` default 100, back-off 0.1 s to 3600 s) `[CT-2]` (D). Limits: task size 1 MiB, schedule up to 30 days ahead, retention 31 days, de-duplication by task name for up to 24 h after deletion, 500 dispatches / s per queue, 1,000 queues per region by default `[CT-3]` (D). OIDC token for calling Cloud Run `[CT-4]` (S) | *Recommended* transport: no broker, built-in retry and concurrency caps, pay per use, on the BAA list `[GCP-HIPAA]` |
| Cloud Run Jobs | Run-to-completion containers: task timeout default 10 min, maximum 168 hours; retries default 3 (0-10); up to 10,000 tasks; "no explicit timeout for a job execution" `[CR-2]` (D). Per-execution overrides of args, env vars, task count and timeout via gcloud, REST (`:run` with `overrides`) and client libraries; executions can be cancelled `[CR-3]` (D) | *Recommended* for ETL, backfills, statement / label batches and anything over 30 minutes. Container cold start per execution makes it clumsy for many small interactive runs |
| Cloud Scheduler | Unix-cron (5 fields) with a time zone; wall-clock DST caveats (UTC recommended); `X-CloudScheduler-ScheduleTime` header helps de-duplicate retried requests `[CS-1]` (D). Quota 5,000 jobs per region; HTTP attempt deadline default 3 min, max 30 min; payload 1 MB `[CS-2]` (D) | Use for a few ticks per client (ETL, schedule tick), not one job per user schedule |
| Cloud Run worker pools | For continuous background work without an endpoint; manual instance count, no autoscaling `[CR-5]` (D); reported GA in April 2026, instance-based billing `[CR-5b]` (S) | The place to run a Procrastinate / PgQueuer / RQ worker if a pull model is chosen |
| Background threads in the API service | With request-based billing "CPU is only allocated during request processing"; background work needs instance-based billing and minimum instances `[CR-6]` (D) | Avoid: ties report load to chairside API instances |

### 6.4 *Recommended* shape

1. Postgres owns run state (`report_runs`); the transport only says "process run X".
2. Enqueue = insert the run row, then create a Cloud Tasks task named after the run id (idempotent) targeting
   `POST /internal/report-runs/{run_id}/execute` on a separate Cloud Run **worker service** built from the same image:
   private ingress, OIDC-verified caller, concurrency 1-2 per instance, request timeout up to 30 minutes (the Cloud
   Tasks maximum `[CT-1]`; Cloud Run allows 60 `[CR-1]`), its own DB engine (separate pool, report role, longer
   `statement_timeout`).
3. The handler is idempotent: it claims the run (`UPDATE ... WHERE status = 'queued'`), heartbeats, renders, stores
   artifacts, marks the terminal state. A redelivered task for a finished run returns 200 immediately. Cloud Tasks
   may deliver more than once [unverified - at-least-once wording not fetched].
4. Runs expected to exceed 30 minutes, nightly ETL, backfills and batch documents run as Cloud Run Jobs, started by
   Cloud Scheduler or by the API with per-execution overrides `[CR-3]`.
5. One queue per priority lane and client (interactive / scheduled / bulk) with small `maxConcurrentDispatches`.

| Candidate | Extra infrastructure | Latency to start | Concurrency control | Per-client cost | Verdict |
|---|---|---|---|---|---|
| Cloud Tasks + worker service | Queues (config only) + one more Cloud Run service | Seconds (plus cold start if scaled to zero) | Queue-level caps, back-off | Scales to zero | *Recommended* |
| Worker pool + Postgres queue (Procrastinate / PgQueuer / own loop) | An always-on worker pool | Sub-second (`LISTEN` / `NOTIFY`) | Library locks / our code | At least one instance always running per client | Good alternative if push delivery proves awkward |
| Cloud Run Job per run | Job definition | Tens of seconds (container start) | Parallelism quota | Pay per run | Only for long / bulk work |
| Celery / RQ / Dramatiq on Memorystore | Broker + workers (+ beat) | Sub-second | Library features | Always-on worker; non-durable basic-tier Redis (L) | Not recommended on the current topology |

Start-latency entries are engineering estimates, not measurements [unverified].

### 6.5 Cancellation, retries, stuck runs

| Concern | Mechanism |
|---|---|
| Cancel while queued | Set `status = cancelled`; delete the Cloud Tasks task (or let the handler no-op) |
| Cancel while running | Set `cancel_requested_at`; the worker checks between phases, and a canceller issues `pg_cancel_backend(db_backend_pid)` to stop the SQL statement [unverified - required role membership on Cloud SQL]; render loops check the flag per batch |
| Retries | Retry only transient classes (connection loss, deadlock, serialization). Never auto-retry timeouts or validation errors. Cap attempts in our row, not only in the queue config |
| Stuck runs | A reaper marks `running` rows with a stale `heartbeat_at` as `failed (worker_lost)`; Cloud Tasks redelivery then finds a terminal row |
| Idempotent delivery | Schedule runs use an idempotency key `(schedule_id, scheduled_for)`; e-mail sends are recorded before sending and never repeated on retry |

### 6.6 Per-tenant concurrency and fairness

| Level | Control |
|---|---|
| User | Max concurrent runs per user (queued + running) enforced at enqueue; duplicates coalesce (section 6.8) |
| Client | Queue `maxConcurrentDispatches` per lane `[CT-2]`; worker service max instances |
| Shared database instance | A global ceiling across clients, since all client databases share one Cloud SQL instance (L): sum of lane caps <= safe connection budget; report role with a connection limit and its own `work_mem` / timeouts [unverified - role-level settings not fetched] |
| Lanes | Interactive ahead of scheduled ahead of bulk; schedules spread with jitter to avoid top-of-hour spikes |
| Back-pressure | When the queue depth or database load crosses a threshold, new non-interactive runs get `429` / delayed; show the queue position in the UI |

### 6.7 Result storage and expiry

| Result size | Store | Paging / re-sort | Expiry |
|---|---|---|---|
| Small (dashboard tiles, <= a few thousand rows) | JSON in the `report_runs` row or a Redis key | In memory | Minutes to hours |
| Medium (up to ~50 k rows) | `report_run_rows (run_id, row_no, data jsonb)` in Postgres | SQL over the snapshot (keyset on `row_no`, or sort on extracted keys) | Delete by `run_id` after 24 h - 7 d (partition by day for cheap purge) |
| Large (exports) | Objects in GCS under a non-patient layout such as `reports/{tenant_id}/{yyyy}/{mm}/{run_id}/result.ndjson.gz` plus rendered `pdf` / `xlsx` / `csv` | Not browsed; download only (first N rows previewed) | Bucket lifecycle rule + `expires_at` reaper [unverified - lifecycle rule details not fetched]; scheduled-report artifacts kept longer (for example 30-90 d, configurable per client) |

Artifacts are read through an authenticated endpoint that re-checks rights and writes an audit row, then streams or
redirects to a short-lived signed URL (existing TTL 15 minutes, L). Signed URLs are bearer tokens valid up to 7 days
at most `[GCS-1]`, so never store or e-mail them.

### 6.8 Caching identical runs

| Rule | Detail |
|---|---|
| Cache key | Hash of `report_key`, `definition_version`, normalised parameters (relative dates resolved to absolute), resolved tenant + office set + provider restriction + column-class profile, and the data watermark of the tables read |
| Scope must be in the key | The current Redis report cache omits caller scope and is never invalidated (L); copying it after office scoping lands would leak one user's scope to another |
| Reuse | A `succeeded` run with the same key and an unexpired artifact is returned (`cache_hit_of`), with its `data_as_of`; a "Refresh" action bypasses |
| In-flight coalescing | Unique partial index on `cache_key` where `status in ('queued','running')`: the second requester attaches to the first run |
| TTL policy | By report class: live OLTP registers minutes; mart-backed reports until the next refresh watermark; closed-period reports (prior months) long |
| Audit | A cache hit is still an access: write the audit row |

---

## 7. Export generation (topic 5)

### 7.1 PDF engines

| Engine | Verified facts | Strengths | Weaknesses | Use |
|---|---|---|---|---|
| ReportLab (open-source toolkit) | BSD licence; the commercial ReportLab PLUS adds RML `[RL-2]` (S). Platypus tables: `LongTable` "uses a greedy algorithm when calculating column widths and is intended for long tables where speed counts"; `repeatRows` repeats header rows on each page (tuple form selects rows); setting column widths manually "draws faster"; `rowSplitRange`, `NOSPLIT`, `splitfirst` / `splitlast` style indices control page splits; no column-wise splitting `[RL-1]` (D) | Already in the code base with a layout kit and two-pass `Page x of y` (L); fast; low memory; deterministic; pure Python wheel | Layout is code, not HTML / CSS; core fonts only today, so non-Latin-1 glyphs need a registered TTF (L); charts need `reportlab.graphics` or images | *Recommended* default for tabular catalog reports, statements, labels |
| WeasyPrint (docs for 70.0) | HTML / CSS to PDF. "WeasyPrint is often slower than other web engines"; "Tables are known to be slow, especially when they are rendered on multiple pages"; large CSS frameworks inflate cascade time; supports PDF/A and PDF/UA output and attachments `[WP-1]` (D). A user report cites ~3 GB for a 1,500-page document; maintainers acknowledge it is slow and memory-hungry on big documents `[WP-2]` (S) | Templates in HTML / Jinja, CSS paged media, accessible PDFs | Exactly our worst case (long multi-page tables) is its slow path; needs system libraries in the image [unverified]; no JavaScript [unverified] | Letter-style or short documents if HTML templating is wanted; not for long registers |
| Headless Chromium (Playwright `page.pdf`) | PDF generation is Chromium-only; header / footer templates need `display_header_footer`, do not run scripts and do not see page styles; `prefer_css_page_size` lets `@page` size win `[PW-1]` (S). Chrome 131 added `@page` margin boxes (16 boxes) for custom headers / footers `[CHR-1]` (S) | Pixel-identical to the web UI including charts | Heavy image and memory per render [unverified]; slow start; concurrency limits; another moving part | "Print this dashboard" PDFs in a later phase |
| Gotenberg 9 | MIT; Docker API wrapping Chromium and LibreOffice; converts URLs / HTML / Markdown and office formats; PDF/A / PDF/UA validation and remediation; Cloud Run image variants (amd64) `[GOT-1]` (D) | Chromium rendering as a separate stateless service; keeps the API image slim | A service to deploy per environment; PHI passes through it (keep it private in the VPC) | The way to add Chromium rendering if needed |
| wkhtmltopdf | Status page: built on QtWebKit, which has no upstream; "Do not use wkhtmltopdf with any untrusted HTML"; suggests WeasyPrint or Prince for controlled HTML and Puppeteer for JavaScript sites `[WK-1]` (D) | - | Unmaintained engine | Avoid |

### 7.2 Printable-layout requirements and how to meet them

| Requirement | Mechanism (ReportLab) |
|---|---|
| Title band: report title, office / "All offices", parameter echo, printed by / at (office time zone) | Existing `ReportHeader` with `show_patient=False` and letterhead resolver (L) |
| Repeating column header on every page | `repeatRows=1` (or a tuple) `[RL-1]` |
| Group header / footer with subtotals | Compute in SQL with `GROUP BY ROLLUP (...)` and `GROUPING()` to tell subtotal rows from data `[PG-4]` (D), or accumulate in the renderer while streaming; style subtotal rows via `TableStyle` |
| Page break per group (legacy "new page per provider / office") | Emit one table per group separated by `PageBreak`; keep header + first rows together |
| Do not orphan a subtotal or split a row badly | `rowSplitRange`, `NOSPLIT` `[RL-1]` |
| Grand totals on the last page; "continued" markers | Final summary table; `splitfirst` / `splitlast` styles `[RL-1]` |
| `Page x of y`, confidentiality footer | Existing two-pass canvas (L) |
| Wide reports | Landscape automatically above N columns; fixed column widths from `width_hint` (faster than auto-width `[RL-1]`); wrap long text in `Paragraph` cells only where needed |
| Unicode names | Register a TTF font once; fall back safely [unverified - font registration not fetched] |
| Size limits | Cap PDF at a row / page budget (for example 10 k rows); above it offer XLSX / CSV. A 50 k-row PDF is not a usable artefact |
| Transaction hygiene | Fetch rows, end the transaction, then render: an open transaction idle for 60 s is killed (L) |

### 7.3 Excel

| Library | Verified facts | Use |
|---|---|---|
| XlsxWriter | Default mode holds all cell data in memory. `constant_memory` flushes each row when the next begins. Published benchmark (N rows x 50 columns): 12,800 rows take 27.6 s and ~129 MB in normal mode vs 23.6 s and ~62 KB in `constant_memory`; time is linear in both. Restrictions in `constant_memory`: rows must be written in order, `add_table()` does not work, `merge_range()` / `set_row()` only for the current row, strings are written inline `[XW-1]` (D) | *Recommended* writer (formatting, number formats, freeze panes, autofilter, constant memory) |
| openpyxl | Write-only mode exports "unlimited" rows "while keeping memory usage under 10Mb"; append-only, one save only, no default sheet; `WriteOnlyCell` for styles; lxml advised for large dumps. Read-only mode for large inputs `[OX-1]` (D) | Keep for reading uploads (it is already imported but undeclared, L); usable as a second writer |
| Worksheet row limit | Metabase caps attachments at 1,048,575 data rows (one header row short of the sheet limit) `[MB-3]` (D) | Split across sheets or refuse above the limit |

Practical rules: write real numbers and dates with number formats (not pre-formatted strings); freeze the header;
totals as values (same numbers as the screen); write untrusted text as strings so it is never interpreted as a
formula; generate in the worker straight to a file / GCS object.

### 7.4 CSV

| Topic | Guidance | Source |
|---|---|---|
| Streaming | Iterate a server-side cursor and write with the stdlib `csv` module, or `COPY (SELECT ...) TO STDOUT WITH (FORMAT csv, HEADER)` through `copy_expert` when formatting can be done in SQL | `[PG2-1]` (D) |
| Encoding | UTF-8 with BOM so Excel detects the encoding (the existing server-side CSV has no BOM handling, L) | [unverified] |
| Formula (CSV) injection | "CSV Injection, also known as Formula Injection, occurs when websites embed untrusted input inside CSV files." Cells starting with `=`, `+`, `-`, `@`, tab, carriage return or line feed (and full-width variants) can be read as formulas. Mitigations: quote every field, escape embedded quotes by doubling, prefix risky cells with a single quote (or a tab inside the quoted field for Excel). Caveat: Excel may drop the protection after save and re-open | `[OW-1]` (D) |
| Dates and money | ISO dates or office-locale dates consistently per file; plain decimals without currency symbols | *Recommended* |
| Big files | gzip to GCS; download via the authenticated endpoint | *Recommended* |

### 7.5 One snapshot, many formats

Render PDF, XLSX and CSV from the stored result snapshot of the run, not from fresh queries. The screen, the PDF and
the spreadsheet then show identical rows and totals, exports cost no extra database load, and the audit row can name
the exact row count delivered. The API must expose `Content-Disposition` to the browser through CORS (L).

---

## 8. Scheduling, subscriptions and alerts (topic 6)

### 8.1 How reference products do it

| Product | Schedules / subscriptions | Alerts | Notes |
|---|---|---|---|
| Metabase (docs v65) | Dashboard subscriptions by e-mail or Slack; hourly / daily / weekly / monthly; CSV / XLSX attachments (row limit 1,048,575) and a server-rendered PDF; per-subscription filter values (Pro / Enterprise); "skip if no results"; recipients may be non-users; admins can restrict to approved domains (Pro / Enterprise) `[MB-3]` (D) | Results alert, goal-line alert, progress-bar alert; by minute / hourly / daily / weekly / monthly / custom cron; every time or first time only; e-mail, Slack, webhook; CSV omitted above 10 MB; alerts keep working after the creator is deactivated `[MB-4]` (D) | Useful vocabulary: "skip if empty", "first time only", approved domains |
| Apache Superset | Reports on a schedule (PNG / PDF for dashboards and charts; CSV / XLSX / text for charts) by e-mail, Slack or webhook; requires a Celery worker + a single beat + a broker + headless Chromium (Playwright-only since 7.0.0); execution budget default 3600 s; dry-run flag in dev `[SUP-2]` (D) | Alerts fire when a SQL condition is met; "run as" executor per schedule | Shows the operational weight of screenshot-based delivery |
| Dental analytics tools | Daily / weekly / monthly auto-e-mails, morning huddle and end-of-day mails (teardown doc) | KPI goal tracking | Thinly documented market-wide: a solid subscription engine is a cheap differentiator |

### 8.2 *Recommended* schedule model

| Element | Design |
|---|---|
| `report_schedules` | `id`, `tenant_id`, `owner_user_id`, target (`report_key` + parameters, or a saved report), `formats[]`, recurrence (cron expression or simple preset + time), `time_zone` (office), `skip_if_empty`, recipients, `active`, `next_run_at`, `last_run_id`, `consecutive_failures`, `paused_reason` |
| Relative dates | Parameters store presets ("previous business day", "month to date", "last full month") resolved in the office time zone when the run is created |
| Tick | One Cloud Scheduler job per client (UTC, every 5 minutes) calls `/internal/schedules/tick`; the handler selects due schedules, inserts runs with idempotency key `(schedule_id, scheduled_for)`, advances `next_run_at`. Avoids one Cloud Scheduler job per schedule (quota 5,000 per region, and one set per client) `[CS-2]`; retried ticks are harmless (`X-CloudScheduler-ScheduleTime` can also de-duplicate) `[CS-1]` |
| Cron evaluation | `croniter` 7.0.0 (MIT; maintained under the Pallets community ecosystem; `get_next`, DST-aware with zoneinfo) `[CRON-1]` (D); compute next occurrences in the schedule's own time zone, since Cloud Scheduler itself warns about DST anomalies `[CS-1]` |
| Run-as | The run executes with the owner's **current** rights and office scope. If the owner is deactivated or loses the right, pause the schedule and notify an admin (unlike Metabase, where alerts continue after deactivation `[MB-4]`) |
| Recipients | Internal users / roles by default. Each recipient opens the result under their **own** permissions: either restrict recipients to users whose scope covers the run, or render per distinct scope |
| Failure policy | Notify the owner; auto-pause after N consecutive failures; never retry sends that may have gone out |
| Delivery log | `report_deliveries` (run, recipient, channel, status, timestamps) - a non-patient log; the existing e-mail log is patient-bound (L) |

### 8.3 PHI-safe delivery

| Fact / rule | Source |
|---|---|
| Transmission security standard: "Implement technical security measures to guard against unauthorized access to electronic protected health information that is being transmitted over an electronic communications network"; encryption is an addressable specification | `[HIPAA-1]` (D) |
| HHS guidance: the Security Rule does not prohibit e-mailing ePHI but requires it to be adequately protected | `[HHS-1]` (S) |
| Minimum-necessary standard for uses, disclosures and requests | `[HIPAA-2]` (D) |
| The proposed Security Rule overhaul (January 2025 NPRM) is not final; reports in July 2026 put final action around July 2027. Until then the current rule applies | `[HIPAA-3]` (S) |

*Recommended* design:

1. The e-mail contains no patient data: report title, period, generated time, optionally a row count, and a link
   to `/reports/runs/{run_id}` in the app. Opening it requires login and re-checks rights and scope.
2. No attachments by default. A client-level policy may allow attachments only for definitions flagged
   `contains_phi = false` (pure aggregates), still subject to small-cell rules (section 10.4).
3. Never put signed storage URLs in e-mail: they are bearer credentials valid for up to 7 days `[GCS-1]`.
4. Link lifetime = artifact retention; an expired link offers "run again".
5. In-app inbox notification + WebSocket push for every completed run (both exist without producers, L).
6. External recipients (accountant, owner without an account) only through an explicit, audited "external viewer"
   account or an allow-listed domain; never an anonymous link.

### 8.4 KPI threshold alerts

| Element | Design |
|---|---|
| `alert_rules` | Metric key (from the registry), slice (office / provider / none), comparator (above / below threshold; percent change vs prior period; vs goal; anomaly), evaluation grain and window, minimum-volume guard, cooldown, severity, recipients, snooze, "first time only" vs "every time" (Metabase vocabulary `[MB-4]`) |
| Evaluation | After each mart refresh, against summary tables - never by polling OLTP |
| Noise control | Require persistence (2 consecutive periods) for anomaly rules; daily digest instead of one e-mail per event; cap per user per day; auto-resolve when back in range |
| Output | `alert_events` row -> inbox notification -> optional e-mail (same PHI-free link pattern) -> drill-down to the report that explains the number |
| Anomaly method | Robust modified z-score first (section 10.6) |

---

## 9. Custom report builder and embedded BI (topic 7)

### 9.1 Builder design

| Aspect | Design |
|---|---|
| Model | Curated subject areas (datasets) over the mart: Production, Collections, Adjustments, A/R, Claims, Appointments, Patients, Treatment plans, Recall, Referrals. Fields are registry dimensions / measures with business labels and descriptions |
| Steps | Pick dataset -> columns (dimensions + measures) -> filters (typed operators per field type) -> group by (up to 3 levels) -> aggregates and subtotals -> sort -> optional pivot (rows x columns x values) -> chart -> save / share / schedule / export |
| Contract | The same JSON query as section 5.3; the server validates every key against the registry and the caller's rights, then compiles SQL. Users never write SQL |
| Templates | Every legacy catalog report that fits the model is also offered as a starting template ("open in builder") |
| Saved reports | `saved_reports` (owner, definition JSON, visibility: private / office / role / client, version); shareable, unlike the per-user preference blob used today (L) |
| Detail vs summary | Detail queries (patient-level rows) need the PHI right and a bounded date range; summary queries work for "aggregate-only" roles |
| Competitor lesson | Custom builders attract the most complaints (confusing, several paths giving different numbers - teardown doc, takeaway 8): one semantic model, visible definitions, guard-rails |

Safety limits (*Recommended* starting values, tune with data):

| Limit | Value |
|---|---|
| Rows returned to the grid | 50,000 (truncate flag + async export above) |
| Rows per export | 500,000 or the sheet limit, async only |
| Group-by levels | 3 |
| Pivot columns | 200 distinct values; error "too many columns, add a filter" above |
| Date range on detail datasets | Required; max 24 months per run |
| Timeout | Interactive 15 s then promote to async; async 5 min |
| Cost gate | Pre-flight `EXPLAIN` estimate; route to async or reject above thresholds (section 11.3) |
| Concurrency | 2 builder runs per user |
| Small cells | Optional suppression of counts below a client-configured threshold on shared outputs |

Grid / pivot UI: AG Grid's Server-Side Row Model is an Enterprise-module feature (docs flag it `enterprise`, imports
`ag-grid-enterprise`) `[AG-1]` (D); TanStack Table is the usual MIT alternative with manual server-side modes
[unverified]. Either way grouping and pivoting are done in SQL (`ROLLUP` / `GROUPING SETS` `[PG-4]`, conditional
aggregation, or `crosstab` from `tablefunc`, which Cloud SQL supports `[CSQL-3]`) and the server returns shaped rows.

### 9.2 Embedded-BI alternatives

| Tool | Licence and price (as published) | Embedding and row-level security | Operating it | Notes |
|---|---|---|---|---|
| Metabase | Open Source edition: AGPL, free, self-hosted. Starter $100 / month + $6 / user (5 included), cloud only. Pro $575 / month + $12 / user (10 included), cloud or self-hosted. Enterprise from $20,000 / year `[MB-1]` (D). Embedding under OSS requires complying with AGPL, or keeping the "Powered by Metabase" logo, or buying a commercial licence `[MB-6]` (D) | Guest embeds (all plans): signed JWT, locked parameters, view-only - no drill-through, query builder or AI. SSO embeds, the React SDK, full-app embedding, white-label, row- and column-level permissions, tenant isolation and native one-database-per-tenant support require Pro / Enterprise. Signed-in embedded viewers count as billable users; guest viewers do not `[MB-1]` `[MB-2]` (D) | JVM service + application database | HIPAA / BAA is not mentioned on the pricing page `[MB-1]`. Guest embeds = free fixed dashboards with a badge; anything interactive is per-user priced |
| Apache Superset | Apache-2.0 `[SUP-4]` (R) | `@superset-ui/embedded-sdk` + guest tokens minted by our backend (default lifetime 5 minutes) carrying RLS clauses; allowed domains per dashboard; guests cannot use SQL Lab. Dataset RLS filters (regular / base, group keys) are part of the open-source product; RLS applies in SQL Lab only with `RLS_IN_SQLLAB` `[SUP-1]` `[SUP-3]` (D). A user reported guest-token RLS not applied after a 4.1 -> 5.0 upgrade `[SUP-5]` (S) | Flask app + metadata DB + Redis cache + Celery worker / beat + headless Chromium for reports `[SUP-2]` (D) | Free and capable, but the heaviest to run; theming options for embeds are limited in the docs reviewed |
| Lightdash | Open-source core (MIT per secondary sources) plus licensed enterprise features (licence key); cloud pricing not verified `[LD-1]` (R)(S) | Embedding SDK with row-level security and user attributes | Docker / Kubernetes; works from dbt or Lightdash YAML against Postgres and others | Assumes its own semantic layer |
| Evidence | Evidence Core is MIT; builds a static site from SQL + Markdown; Evidence Studio (hosted) adds access rules, scheduled reports and embedded analytics `[EV-1]` (D) | Static builds are not per-user row-secured by themselves [unverified] | Static hosting | Good for internal analyst reports, not per-tenant in-app analytics |
| Cube + custom UI | Section 5.2 | Row / member policies in the model | Node + Cube Store | We still build every screen |
| Power BI Embedded | The legacy vendor's analytics add-on is Power BI Embedded with 8 fixed dashboards and a nightly refresh (teardown doc, takeaway 4) | - | - | The bar to beat |
| Commercial embedded analytics (other vendors) | Not researched | - | - | [unverified] Would each need a BAA and per-viewer pricing review |

### 9.3 Build vs buy

| Criterion | Build on our registry | Metabase guest embeds (OSS) | Metabase Pro | Superset (self-host) | Cube + custom UI |
|---|---|---|---|---|---|
| Legacy catalog parity (filters, grouping, subtotals, print layouts, statements / labels) | Yes | No | No | No | No (API only) |
| KPI dashboards and scorecards | Yes (we build) | Fixed, view-only | Yes | Yes | We build UI |
| Ad-hoc exploration | Builder in a later phase | No | Yes (query builder) | Yes (Explore) | We build UI |
| Fit with the office-scope model ("working context, not a fence"; per-user office sets; privileged users) | Native (L) | Our backend sets locked parameters | Sync users / groups / attributes | Our backend mints RLS clauses per token | Security context per request |
| Second permission system to keep in sync | No | Minimal | Yes | Yes | Yes |
| PHI boundary | Inside our services | Self-hosted inside the VPC | Self-hosted, or vendor cloud with a BAA question | Self-hosted inside the VPC | Self-hosted |
| Per-client topology cost | One code path | One BI instance with N databases, or N instances | Same + per-user fees | Same + heavy stack | Same |
| Look and feel | Native | iframe / web component with badge | Themable | Limited | Native |
| Licence cost | Engineering time | Free (badge) | $575 / month + $12 / user and up | Free | Free core |
| One set of numbers | Yes | Only if it reads `rpt` views | Same | Same | Yes if it becomes the registry |
| AI readiness | Registry = tool schema | Vendor AI (paid) | Vendor AI | Limited | Vendor / own |

Verdict (*Recommended*): build the catalog engine, dashboards, scorecards, schedules and the metric registry in-house.
Treat embedded BI as an optional power-user add-on, piloted only after the mart exists, connected with a read-only
role to `rpt` views so it cannot define its own numbers. Superset is the candidate if row-secured interactive
exploration is wanted at zero licence cost; Metabase guest embeds are the candidate for a handful of fixed dashboards.

---

## 10. Natural-language and AI analytics (topic 8)

### 10.1 What the evidence says about text-to-SQL

| Evidence | Numbers | Source |
|---|---|---|
| BIRD benchmark (12,751 question-SQL pairs, 95 databases) | Human performance 92.96 % execution accuracy; best system on the test set 83.40 % (22 Oct 2026), next 82.95 % and 82.39 % | `[BIRD-1]` (D) |
| Benchmark reliability | A January 2026 study estimates annotation error rates of ~52.8 % (BIRD Mini-Dev) and ~62.8 % (Spider 2.0-Snow); correcting BIRD Dev moves accuracy by up to 19 points | `[BIRD-2]` (S) |
| Enterprise-style tasks (Spider 2.0) | Reported success rates roughly 21-35 % depending on protocol | `[BIRD-2]` (S) |
| dbt Labs re-run (7 Apr 2026; 11 questions x 20 runs; insurance schema; vendor-run) | On a modelled project: text-to-SQL 90.0 % / 84.1 % vs semantic layer 98.2 % / 100.0 % for the two models tested. Unmodelled schema: 64.5 % vs 72.7 %. Text-to-SQL "fails silently" (plausible wrong answer); the semantic layer fails loudly (refuses out-of-scope questions). Text-to-SQL was given the entire schema in context, "which isn't practical for larger datasets" | `[DBT-4]` (D) |
| Independent paired benchmark (100 questions, 3 frontier models, retail data) | A 4 KB hand-written business-context document raised accuracy from 45.5-50.5 % to 67.7-68.7 % (+17 to +23 points, p < 0.01); model choice within the tier made no significant difference | `[ARX-1]` (D) |
| Market | Natural-language assistants shipped across dental analytics vendors in 2026 (teardown doc, takeaway 6) | (L) |

Takeaways: (1) context and modelling matter more than the model; (2) even the best raw text-to-SQL is wrong often
enough to be unacceptable for financial KPIs; (3) route questions through the metric registry and refuse the rest.

### 10.2 Architecture patterns, safest first

| Pattern | Flow | Risk | Use |
|---|---|---|---|
| A. Navigate | Question -> pick an existing report / dashboard + fill its parameters -> open it | None beyond normal report rights | First release: "show production by provider last month for Downtown" |
| B. Semantic query | Question -> model emits the JSON query of section 5.3 (schema-constrained) -> server validates keys, rights, limits -> compiler -> result -> chart + templated explanation | Low: the model cannot invent joins or columns; out-of-scope = refusal | Core of "ask your data" |
| C. Agentic analysis | Tool loop over read-only tools (`list_metrics`, `query_metrics`, `compare_periods`, `top_contributors`, `open_report`) with step and token budgets | Medium: cost, latency, compounding errors | "Why did collections drop in March?" |
| D. Validated text-to-SQL | Model writes SQL over `rpt` views -> parse (sqlglot `[SQG-1]`), allow single `SELECT`, whitelisted relations / functions, forced `LIMIT` -> read-only role + RLS + timeout + cost gate | Highest: silent wrong answers `[DBT-4]` | Admin / analyst preview only, clearly labelled, never for end users by default |

### 10.3 Guard-rails (mapped to the OWASP Top 10 for LLM Applications 2025 `[OW-2]` (D))

| OWASP item | Control |
|---|---|
| LLM01 Prompt injection | Only the user question and our own metadata enter the prompt. Query results returned to the model are aggregates; free-text columns (notes, names) are never sent. Tool outputs are data, not instructions |
| LLM02 Sensitive information disclosure | The model sees the metric catalog and aggregated results only; the permission check happens in the server on every tool call with the caller's scope; small-cell suppression |
| LLM05 Improper output handling | Model output must validate against the query JSON schema; unknown keys are rejected; nothing the model writes is executed as SQL in patterns A-C; rendered text is escaped |
| LLM06 Excessive agency | Read-only tools; no writes, no schedule or share creation without explicit user confirmation in the UI |
| LLM09 Misinformation | The model never computes numbers. Every figure shown comes from a tool result and is displayed with "how this was calculated" (metric definition, filters, period, `data_as_of`) and a link to the underlying report |
| LLM10 Unbounded consumption | Per-user and per-client quotas, token and step budgets, timeouts, cached answers for repeated questions |

### 10.4 PHI handling with LLM APIs

| Topic | Fact / guidance | Source |
|---|---|---|
| Minimum necessary | Send the question, the metric catalog and aggregated results. Do not send row-level patient data. A question may itself name a patient: route patient-specific questions to ordinary search, or make sure the endpoint is BAA-covered | `[HIPAA-2]` (D) |
| De-identification | Two methods: Expert Determination (risk "very small", documented) and Safe Harbor (remove 18 identifier categories, including names, geography smaller than a state, all date elements except year, ages over 89; and no actual knowledge of re-identifiability). Aggregates over small groups can still identify people | `[HIPAA-2]` (D) |
| Google Cloud | The HIPAA BAA product list includes Cloud Run, Cloud SQL, Cloud Tasks, Cloud Scheduler, BigQuery and generative-AI entries ("Generative AI on Agent Platform", "Gemini Enterprise Agent Platform"); pre-GA offerings must not be used with PHI unless expressly noted; compliance is a shared responsibility | `[GCP-HIPAA]` (D) |
| Anthropic (Claude API) | "HIPAA readiness": a signed BAA plus a HIPAA-enabled organisation (self-serve in the Console for eligible organisations; permanent once enabled; use a separate organisation for non-HIPAA workloads). Eligible: Messages API, structured outputs, prompt caching, citations, token counting, thinking, PDF input. Not eligible: Batch processing, Files API, code execution, MCP connector, web fetch, Managed Agents, beta features in general; non-eligible features return HTTP 400. "Do not include PHI in JSON schema definitions" (schemas are cached separately). Not available on Claude Platform on AWS; on Amazon Bedrock and Google-managed Vertex AI the cloud provider is the processor and its compliance terms apply. Some top-tier models require 30-day retention and are unavailable under zero data retention; flagged content may be retained up to 2 years regardless | `[ANT-1]` `[ANT-2]` (D) |
| OpenAI API | Eligibility requires an executed BAA and zero-data-retention or modified-abuse-monitoring provisioning; published endpoint lists differ between pages - check the BAA | `[OAI-1]` (S) |
| Azure OpenAI, Amazon Bedrock | Not verified in this session | [unverified] |
| Simplest path here | The backend already runs on Google Cloud: a model reached through the same cloud's BAA-covered endpoint, or a HIPAA-enabled Anthropic organisation, behind a provider-neutral interface so it can be swapped. Confirm that a BAA is executed for each service used | *Recommended* |
| Our own logs | Prompts, tool calls and answers are stored in our audit store (they can contain PHI in the question), with the same retention and access rules as other audit data | *Recommended* |

API design facts that affect the implementation (Claude API; `[ANT-2]` (D), `[ANT-3]` (B)):

- Structured outputs (`output_config.format`) and strict tool definitions guarantee schema-valid JSON; the newest
  models reject forced tool choice, so use structured output or `auto` + strict tools for the semantic-query step.
- Prompt caching is a prefix match (tools -> system -> messages): put the static metric catalog first and the
  volatile parts (date, user scope, question) last; verify with the cache-read token counters.
- Handle the `refusal` stop reason and `max_tokens` truncation before parsing.
- Batch processing would suit nightly narrative generation, but it is not HIPAA-eligible `[ANT-2]`; with PHI-free
  aggregate inputs this is a policy question for counsel, not an engineering one.

### 10.5 Narrative insights

| Step | Method |
|---|---|
| 1. Facts | Computed in SQL / Python from the mart: value, change vs prior period / same period last year / goal / peer offices, rank, streaks |
| 2. Drivers | Contribution analysis: decompose the change by dimension (office, provider, procedure category, payer), separating volume from rate / mix effects for ratio metrics [unverified - no source fetched; standard variance-decomposition technique] |
| 3. Text | Deterministic templates first ("Collections were $X, down Y % vs last month; 62 % of the drop came from ..."). Optionally an LLM rewrites the facts JSON into prose, instructed to use only the supplied numbers |
| 4. Verification | Post-check that every number in the generated text appears in the facts payload; otherwise fall back to the template |
| 5. Caching | Per (metric, slice, period, data watermark); regenerate only when the data changes |

### 10.6 Anomaly detection (start simple)

| Method | Detail | Source |
|---|---|---|
| Modified z-score | `M = 0.6745 * (x - median) / MAD`; Iglewicz and Hoaglin recommend flagging observations whose absolute `M` exceeds 3.5. More robust than the mean / standard-deviation z-score, which is bounded in small samples | `[NIST-1]` (D) |
| Caveats | Assumes roughly normal data (log-transform skewed money series); masking and swamping with multiple outliers; flagged points are candidates for investigation, not errors | `[NIST-1]` (D) |
| Like-for-like baselines | Compare a day with the same weekday over the trailing 8-12 weeks; business days only; office closure calendar; minimum-volume guard for small offices / providers | *Recommended* |
| Rates | For percentages (no-show rate, case acceptance) use proportion-based control limits rather than raw z-scores | [unverified] |
| Later | Seasonal decomposition or forecasting models; supervised risk scores (no-show, acceptance) as a separate ML track (competitors already ship these - teardown doc, takeaway 7) | [unverified] |

### 10.7 Open-source helpers - status check

| Project | Status | Source |
|---|---|---|
| Vanna (text-to-SQL agent framework) | MIT; repository archived by its owner on 29 March 2026 (read-only) | `[VAN-1]` (R) |
| sqlglot | MIT; pure-Python SQL parser / transpiler / optimizer, 30+ dialects; optional compiled build roughly 3-5x faster | `[SQG-1]` (R) |
| Malloy Publisher | Open-source semantic model server exposing REST and MCP APIs | `[MAL-1]` (R) |
| MCP exposure | Competitors expose PMS data to assistants through MCP (teardown doc). Our registry tools can be exposed the same way later | (L) |

---

## 11. Observability and governance (topic 9)

### 11.1 Audit of runs, views, exports and deliveries

| Requirement | Detail | Source |
|---|---|---|
| Regulatory basis | Audit controls: "Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use electronic protected health information." Unique user identification is a Required specification | `[HIPAA-1]` (D) |
| Events to record | `report.run`, `report.view` (opening a stored result), `report.export` (each format), `report.download` (each artifact fetch), `report.deliver` (each recipient), schedule create / update / delete, saved-report share changes, definition and metric version changes, AI question / tool call | *Recommended* |
| Fields | who (`user_id`, `run_as_user_id`), when, `tenant_id`, resolved office set, `report_key` + `definition_version`, parameters, `row_count`, `patient_count`, formats, artifact ids, recipients, source (ui / schedule / api / ai), cache hit, duration, outcome, IP, request id | *Recommended* |
| Gaps today | `record_print` rows carry no `office_id`, row counts or format; `GET /audit-logs` cannot filter by action or date; no `(tenant_id, created_at)` index; JSON roll-ups write no audit row | (L) |
| Retention | Keep at least as long as the client's HIPAA documentation retention policy (six years is the figure usually cited) | [unverified] |
| Database-level audit | `pgaudit` is available on Cloud SQL `[CSQL-3]`; session logging by class (READ, WRITE, ...) or object-level logging through an audit role; output goes to the PostgreSQL log; volume can be very large and logging is "best-effort and not transactional" | `[PGA-1]` (R) |
| Review | An admin "Report access log" screen (filter by user, report, patient-containing, export) is itself a report definition | *Recommended* |

### 11.2 Row-, column- and action-level permissions

| Level | Control | Enforcement point |
|---|---|---|
| Report | `required_rights[]` per definition; categories as coarse rights. Today no backend guard references any `reports_*` right and several report rights were deleted by a migration (L) | Catalog listing, run creation, result read, export, schedule execution |
| Rows - tenant | `tenant_id` predicate injected by the executor (+ RLS backstop on `rpt`) | Executor |
| Rows - office | Existing office-scope engine in report mode (`resolve_list_office_filter(..., reports=True)`, `require_all_offices`) (L) | Executor; the resolved set is stored on the run |
| Rows - provider | Per-user provider restriction (`users.report_access_provider_id` exists but is unenforced, L): provider-scoped users see only their own production / schedule | Executor |
| Columns | `column_class` on every column / dimension / measure: `phi`, `financial`, `provider_comp`. A user without the class gets the column dropped or masked. Reference model: Cube policies with `member_level` and `member_masking` `[CUBE-3]` | Catalog (hide), executor (drop), exports (same) |
| Aggregate-only role | Can run summary modes and dashboards but not patient-level detail or drill-through | Definition `output_modes` + rights |
| Actions | run, export (per format), schedule, share, build custom, view others' runs, manage definitions | API guards |
| Shared artefacts | A shared or scheduled result is always re-authorised against the **viewer**; never "whoever has the link" | Result-read endpoint |
| Cache | Scope and column profile are part of the cache key (section 6.8) | Run cache |

### 11.3 Timeouts and cost guards

| Guard | Detail | Source |
|---|---|---|
| `statement_timeout` | "Abort any statement that takes more than the specified amount of time"; setting it in `postgresql.conf` "is not recommended because it would affect all sessions" - set per role or per transaction | `[PG-5]` (D) |
| `transaction_timeout` | Terminates sessions whose transaction exceeds the limit; present in current PostgreSQL docs. Our server is 15.18 (L), where it is not available | `[PG-5]` (D), [unverified version of introduction] |
| `idle_in_transaction_session_timeout` | Idle open transactions hold locks and block vacuum; already 60 s here (L) | `[PG-5]` (D) |
| `lock_timeout` | Only bounds lock waits; useful for ETL swaps so they never queue behind chairside transactions | `[PG-5]` (D) |
| Timeout tiers | Interactive report 10-15 s; async worker 2-5 min per statement; ETL / backfill on a separate engine without the 30 s ceiling (as Alembic already does, L) | *Recommended* |
| Session tagging | Set `application_name` to `report:{report_key}:{run_id}` so `pg_stat_activity` / logs identify the run | [unverified] |
| Top-query visibility | `pg_stat_statements` and `auto_explain` are available on Cloud SQL | `[CSQL-3]` (D) |
| Pre-flight cost gate | `EXPLAIN (FORMAT JSON)` before running builder / ad-hoc queries; above a cost or estimated-row threshold route to async or reject. Planner estimates are coarse: use as a gate, not a guarantee | *Recommended* |
| Structural limits | Mandatory bounded date range on fact datasets; `LIMIT n + 1`; max group levels / pivot columns; per-user and per-client concurrency; queue-depth back-pressure | Sections 6.6, 9.1 |
| Kill switch | A settings flag per report or per feature, following the existing `*_ENFORCED` convention (L) | *Recommended* |

### 11.4 Operational metrics

| Signal | Why |
|---|---|
| Run duration p50 / p95 per report, queue wait, failure rate by class (timeout, cancelled, worker lost, validation) | Find reports that need a summary table or an index |
| Cache hit rate, rows and bytes exported per client | Capacity and abuse detection |
| Mart freshness lag per table (`rpt.refresh_log`) shown in the UI as "Data as of ..." | Trust |
| Reconciliation deltas (mart vs OLTP control totals) | Catches ETL bugs before users do |
| Scheduler tick lag, deliveries sent / failed | Subscription reliability |
| AI: questions asked, refusal rate, tool errors, tokens per client | Cost and quality |

The backend has no metrics, tracing or error-tracking library today (L); structured log lines with `run_id` plus
SQL over `report_runs` are enough to start.

### 11.5 Governance of definitions

- Report definitions and metrics are code: reviewed, versioned, with a change log visible to admins.
- Each legacy report gets a "golden" test (fixed parameters, expected totals from the legacy system) run on a
  Postgres test tier in CI.
- Every metric shows its definition, owner and last-changed date in the UI glossary.
- Deprecation: a definition is marked deprecated for one release before removal; saved reports and schedules that
  reference it are flagged.

---

## 12. Three candidate end-to-end architectures

### 12.1 Architecture A - incremental / pragmatic ("engine on OLTP + a few roll-ups")

```
React report runner (generic, catalog-driven)
        |
FastAPI: catalog + executor (SQLAlchemy Core, read-only role, scope injection, audit)
        |                         \
  OLTP tables + new indexes        report_runs --> Cloud Tasks --> worker service --> GCS artifacts
  + a handful of daily summary tables (nightly rebuild + intraday slice refresh)
```

| Pros | Cons |
|---|---|
| Fastest route to legacy-catalog parity; each report ships independently | KPI logic lives inside individual report builders unless the registry is introduced early: risk of two answers for one KPI |
| Minimal new infrastructure (indexes, one role, one queue, one worker service) | Reports are coupled to OLTP schema details (sign rules, soft deletes, tenant-by-join) |
| One language, one repo, existing conventions (L) | "As of" history (A/R at a past date) is unreliable without snapshots |
| Live data for registers and day sheets | Heavy aggregates still compete with chairside traffic on the single primary (L) |
| Low risk: nothing to migrate later is thrown away | A custom builder and AI have nothing solid to stand on |

Breaks down when: the KPI catalog grows beyond a few dozen metrics, users ask for a builder, or dashboards need
many slices at sub-second speed.

### 12.2 Architecture B - analytics-first data mart ("star schema + metric registry + worker")

```
React: dashboards, scorecards, builder, catalog reports, AI panel
        |
FastAPI: metric registry + compiler | catalog executor | run API | schedules | alerts
        |                                   |
   rpt schema (same Postgres)          OLTP (live registers only)
   date dim, conformed dims,
   daily facts, snapshots, refresh_log
        ^
   ETL: Cloud Run Job (nightly full rebuild, backfills) + intraday slice refresh (tick)
   optional later: read replica, BigQuery export for cross-organisation benchmarks
```

| Pros | Cons |
|---|---|
| One set of numbers for dashboards, reports, builder, alerts, AI | Up-front modelling, ETL and reconciliation work before the first dashboard |
| Sub-second dashboards and cross-office benchmarks from summary tables | Freshness is minutes, not live: needs "Data as of" UX and a live tail for today |
| Reliable history through periodic and accumulating snapshots | ETL must run, be monitored and be migrated per client database (L) |
| Insulates reports from OLTP schema churn | Needs a Postgres test tier and CI (L) |
| The registry is the tool schema for AI and the field list for the builder | If done mart-first, legacy parity arrives later |

### 12.3 Architecture C - embedded-BI hybrid

```
React app --- in-house catalog engine (as in A) for legacy / print reports
     \
      embedded BI (self-hosted Superset or Metabase) for dashboards and exploration
             | guest token / signed JWT minted by FastAPI with tenant + office row filters
             v
        rpt views (read-only role)     <- still requires the mart of B to be fast and consistent
```

| Pros | Cons |
|---|---|
| Rich charting and ad-hoc exploration without building a builder | A second permission model to keep aligned with office scope, rights and provider restrictions |
| Dashboards can be assembled by analysts, not engineers | Second runtime per environment: Superset needs web + metadata DB + cache + Celery + headless Chromium `[SUP-2]`; Metabase interactive features are per-user priced `[MB-1]` |
| Proven subscription / alert features in the tool | PHI flows through another application (self-host inside the VPC; any vendor cloud needs a BAA) |
| | Look-and-feel mismatch; definitions live in the BI tool (lock-in); AI features outside our control |
| | Does not remove the mart work; cannot produce the legacy print catalog |

### 12.4 Comparison

| Criterion | A incremental | B mart-first | C embedded-BI hybrid |
|---|---|---|---|
| Time to first legacy reports | Shortest | Longer | Same as A for reports |
| Time to first KPI dashboard | Medium (hand-built on roll-ups) | Medium-long, then fast for each additional one | Short once `rpt` views exist |
| One set of numbers | At risk without the registry | Yes | Only if BI reads `rpt` and defines no metrics of its own |
| Dashboard performance | Good on roll-ups, poor on raw facts | Best | Depends on the mart |
| "As of" history | Weak | Strong (snapshots) | Depends on the mart |
| Custom builder | Hard | Natural (registry) | Provided by the tool |
| AI readiness | Low | High | Tool-dependent |
| New infrastructure per client | Queue + worker service | + ETL job + scheduler ticks | + BI stack |
| Permission model | One | One | Two |
| Licence cost | None | None | None (Superset / Metabase OSS guest) to per-user (Metabase Pro) |
| Biggest risk | Metric drift, OLTP coupling | Up-front effort, ETL correctness | Operational and security surface, divergence |

### 12.5 *Recommended* path

Start as A and grow into B: A's components (definition registry, executor, run pipeline, exports, audit) are a
strict subset of B, so nothing is discarded. Introduce the metric registry together with the first summary tables,
not after dozens of reports exist. Keep C as an optional pilot once `rpt` is stable and only if users demand
free-form exploration beyond the in-house builder.

---

## 13. Phased path

Sizes are relative (S / M / L), not calendar estimates. Each phase ships something usable.

| Phase | Deliverables | Exit criteria | Size | Depends on |
|---|---|---|---|---|
| 0. Foundations | Reporting indexes (`CREATE INDEX CONCURRENTLY`, drop duplicates); `report_reader` role + separate engine + timeout tiers; Postgres test tier and a CI test job; declare XlsxWriter / openpyxl; wire office-scope and rights guards into the existing roll-ups; fix the cache key; extend audit rows (office, counts, format) and audit filters | Existing roll-ups are scope-safe; baseline p95 timings recorded before / after indexes | S-M | - |
| 1. Report engine v1 | `ReportDefinition` registry, catalog endpoints, generic sync executor (parameters, date basis, grouping, subtotals, keyset paging, drill links); banded PDF renderer on the ReportLab kit; XLSX and CSV writers; audit; generic React report runner; first wave of legacy reports directly on OLTP | Wave-1 reports match legacy "golden" totals; no per-report frontend code | M-L | 0 |
| 2. Async runs and artifacts | `report_runs`, Cloud Tasks queues + worker service, cancel / heartbeat / reaper, GCS artifact layout + authenticated download, result snapshots with paging, run cache with scope-aware keys, inbox + WebSocket producers | A 500 k-row export completes without touching API instances; cancel works; identical runs coalesce | M | 1 |
| 3. Mart, metric registry, dashboards | `rpt` schema (date dimension, conformed dimensions, daily facts, A/R and schedule snapshots); ETL as a Cloud Run Job (nightly full rebuild) + intraday slice refresh; `refresh_log`; reconciliation checks; metric registry + compiler + metadata endpoint; KPI dashboards, provider scorecards, office benchmarking, goals; drill-down to catalog reports | Dashboard p95 under 1 s from summary tables; reconciliation deltas zero for a sustained period; every tile shows `data_as_of` | L | 0, 2 |
| 4. Schedules, subscriptions, alerts | Schedule model + per-client tick, relative-date presets, delivery log, PHI-free link e-mails, digests; KPI alert rules; anomaly v1 (modified z-score) | Scheduled runs are idempotent under retried ticks; no PHI leaves by e-mail; alert noise within the agreed budget | M | 2, 3 |
| 5. Custom report builder | Curated datasets, JSON query contract, builder UI with pivot, saved / shared reports, limits and cost gate, templates from the catalog | Builder output equals the equivalent catalog report for the same question | L | 3 |
| 6. AI assistance | Navigate-to-report, then semantic-query answers, then narrative insights; BAA-covered model endpoint; audit and quotas; glossary-grounded explanations | Refusal instead of guessing on out-of-scope questions; every number traceable to a query | M-L | 3 (5 helps) |
| 7. Scale-out options (trigger-based) | Read replica; BigQuery export for cross-organisation benchmarks and data sharing; AlloyDB / columnar; embedded-BI pilot; partitioning | See triggers below | - | 3 |

Triggers for phase 7 options:

| Option | Trigger |
|---|---|
| Read replica | Measured report / ETL load degrades chairside latency on the primary, after indexes and summary tables |
| BigQuery (Datastream or scheduled aggregate export) | Cross-organisation benchmarking, a customer data-share / "bring your own BI" request, or ML workloads |
| AlloyDB columnar or another columnar engine | Fact tables reach tens of millions of rows per client and summary tables no longer cover the builder's queries |
| Embedded-BI pilot | Persistent demand for free-form exploration that the builder cannot meet |
| Partitioning | A table exceeds server memory, or retention purges become expensive `[PG-3]` |
| Dedicated semantic-layer runtime (Cube) | The in-house compiler needs pre-aggregation management or a SQL API for external BI |

---

## 14. Verification backlog

Items marked [unverified] in this document, plus measurements to take before committing to designs.

| # | Item | How to settle |
|---|---|---|
| 1 | Full rebuild time of each summary table on production-size data | Time the `INSERT ... SELECT` on a restored copy |
| 2 | `statement_timeout` behaviour with server-side cursor fetches (per `FETCH` vs whole query) | Test with a named cursor and a 30 s timeout |
| 3 | Privileges needed for `pg_cancel_backend` from the report role on Cloud SQL | Test; read the Cloud SQL users / roles page |
| 4 | Cloud Tasks delivery semantics, OIDC to a private Cloud Run service, cold-start latency of a scale-to-zero worker | Prototype one queue + handler |
| 5 | Row-level security on materialized views; whether to use RLS as a backstop on `rpt` | Read CREATE POLICY docs; prototype with `SET LOCAL` settings |
| 6 | Recovery-conflict settings for long reads on Cloud SQL replicas | Read Cloud SQL flags documentation when a replica is considered |
| 7 | ReportLab TTF registration for Unicode names; WeasyPrint system dependencies and JavaScript support; Chromium image size | Library docs; build test images |
| 8 | XlsxWriter option names for disabling formula interpretation of strings | Library docs |
| 9 | GCS lifecycle rules for artifact expiry under the per-client bucket layout | Storage docs |
| 10 | HIPAA retention period for audit records; BAA status for every Google Cloud service used and for the chosen LLM endpoint | Counsel / compliance owner |
| 11 | dbt Core licence and fit; Cube Core vs Cube Cloud feature split; TanStack Table licence and server-side modes | Vendor pages, only if those options are revisited |
| 12 | Cloud Run worker pools: GA status and billing model stated in primary docs | Release notes |
| 13 | Azure OpenAI and Amazon Bedrock HIPAA eligibility; current OpenAI eligible endpoint list | Vendor compliance pages, only if those providers are considered |
| 14 | Proportion control limits, seasonal decomposition and forecasting libraries for anomaly detection | Statistics references when anomaly v2 is planned |
| 15 | Pin the FastAPI version before relying on any streaming-dependency behaviour | Backend `requirements.txt` |

---

## 15. Sources

Tags: (D) page fetched and read; (R) repository page fetched; (S) search snippet / secondary; (B) vendor API
reference bundled with the tooling, page not re-fetched. Local sources (L): `../analysis/be_platform.md`,
`competitor_analytics_teardown.md`, `dental_kpi_dictionary.md`.

### PostgreSQL and data layer

- `[PG-1]` (D) PostgreSQL docs, REFRESH MATERIALIZED VIEW - https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html
- `[PG-2]` (D) PostgreSQL docs, Row Security Policies - https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- `[PG-3]` (D) PostgreSQL docs, Table Partitioning - https://www.postgresql.org/docs/current/ddl-partitioning.html
- `[PG-4]` (D) PostgreSQL docs, Table Expressions (GROUPING SETS, CUBE, ROLLUP) - https://www.postgresql.org/docs/current/queries-table-expressions.html
- `[PG-5]` (D) PostgreSQL docs, Client Connection Defaults (timeouts, read-only, row_security) - https://www.postgresql.org/docs/current/runtime-config-client.html
- `[IVM-1]` (R) pg_ivm - https://github.com/sraoss/pg_ivm
- `[CIT-1]` (R) Citus - https://github.com/citusdata/citus
- `[CIT-2]` (D) Citus Data, "Materialized views vs. Rollup tables in Postgres" (2018) - https://www.citusdata.com/blog/2018/10/31/materialized-views-vs-rollup-tables
- `[CIT-3]` (S) Citus Data, "Scalable incremental data aggregation on Postgres and Citus" - https://www.citusdata.com/blog/2018/06/14/scalable-incremental-data-aggregation/ ; pgsql-general thread "Incremental aggregate/rollup strategy advice" - https://www.postgresql.org/message-id/20190708.172100.1413110719812606373.t-ishii%40sraoss.co.jp
- `[TS-1]` (D) TimescaleDB editions - https://www.tigerdata.com/docs/about/latest/timescaledb-editions
- `[DUCK-1]` (D) MotherDuck, "Announcing pg_duckdb Version 1.0" - https://motherduck.com/blog/pg-duckdb-release/
- `[DUCK-2]` (R) pg_duckdb - https://github.com/duckdb/pg_duckdb
- `[DUCK-3]` (D) DuckDB docs (2.0), PostgreSQL extension - https://duckdb.org/docs/2.0/core_extensions/postgres/overview.html
- `[ALLOY-1]` (D) AlloyDB columnar engine - https://docs.cloud.google.com/alloydb/docs/columnar-engine/about
- `[CH-1]` (S) ClickHouse, Postgres CDC connector for ClickPipes GA - https://clickhouse.com/blog/postgres-cdc-connector-clickpipes-ga ; year in review - https://clickhouse.com/blog/postgres-cdc-year-in-review-2025
- `[DS-1]` (S) Datastream overview and release notes - https://docs.cloud.google.com/datastream/docs/overview ; https://docs.cloud.google.com/datastream/docs/release-notes
- `[BQ-1]` (D) BigQuery, Cloud SQL federated queries - https://docs.cloud.google.com/bigquery/docs/cloud-sql-federated-queries
- `[CSQL-1]` (D) Cloud SQL for PostgreSQL, replication - https://docs.cloud.google.com/sql/docs/postgres/replication
- `[CSQL-1b]` (D) Cloud SQL, manage read replicas - https://docs.cloud.google.com/sql/docs/postgres/replication/manage-replicas
- `[CSQL-2]` (S) Cloud SQL read pools - https://docs.cloud.google.com/sql/docs/postgres/about-read-pools ; https://cloud.google.com/blog/products/databases/cloudsql-read-pools-support-autoscaling
- `[CSQL-3]` (D) Cloud SQL for PostgreSQL, supported extensions - https://docs.cloud.google.com/sql/docs/postgres/extensions
- `[KIM-1]` (D) Kimball Group, Dimensional Modeling Techniques - https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/
- `[KIM-2]` (D) Kimball Group, Periodic Snapshot Fact Tables - https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/periodic-snapshot-fact-table/
- `[KIM-3]` (D) Kimball Group, Accumulating Snapshot Fact Tables - https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/accumulating-snapshot-fact-table/
- `[SB-1]` (D) Supabase docs, Row Level Security performance - https://supabase.com/docs/guides/database/postgres/row-level-security-performance
- `[UIL-1]` (D) Use The Index, Luke, "Paging through results" - https://use-the-index-luke.com/sql/partial-results/fetch-next-page
- `[UIL-2]` (S) pgsql-performance thread "Efficient pagination using multi-column cursors" - https://postgresql.org/message-id/0bf497361892767b9e46df0928ed6554190ca1de.camel%40cybertec.at ; "Pagination Done the PostgreSQL Way" - https://wiki.postgresql.org/images/3/35/Pagination_Done_the_PostgreSQL_Way.pdf
- `[PGA-1]` (R) pgAudit - https://github.com/pgaudit/pgaudit

### Python, SQLAlchemy, FastAPI

- `[SA-1]` (D) SQLAlchemy 2.0, Working with Engines and Connections (server-side cursors) - https://docs.sqlalchemy.org/en/20/core/connections.html
- `[SA-2]` (S) CVE-2019-7164 - https://nvd.nist.gov/vuln/detail/CVE-2019-7164 ; https://ubuntu.com/security/CVE-2019-7164 ; Semgrep rule - https://registry.semgrep.dev/rule/python.sqlalchemy.security.sqlalchemy-sql-injection.sqlalchemy-sql-injection ; sqlalchemy list "Is Session.execute SQL injection safe?" - https://groups.google.com/g/sqlalchemy/c/RLtezuLDos4
- `[PG2-1]` (D) psycopg2 docs, cursor class - https://www.psycopg.org/docs/cursor.html
- `[FA-1]` (D) FastAPI, Dependencies with yield - https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/
- `[FA-2]` (D) FastAPI, Advanced Dependencies - https://fastapi.tiangolo.com/advanced/advanced-dependencies/
- `[SQG-1]` (R) sqlglot - https://github.com/tobymao/sqlglot
- `[CRON-1]` (D) croniter on PyPI - https://pypi.org/project/croniter/

### Google Cloud

- `[CR-1]` (D) Cloud Run, request timeout - https://docs.cloud.google.com/run/docs/configuring/request-timeout
- `[CR-2]` (D) Cloud Run, create jobs - https://docs.cloud.google.com/run/docs/create-jobs
- `[CR-3]` (D) Cloud Run, execute jobs (overrides, cancel) - https://docs.cloud.google.com/run/docs/execute/jobs
- `[CR-4]` (D) Cloud Run quotas and limits - https://docs.cloud.google.com/run/quotas
- `[CR-5]` (D) Cloud Run, deploy worker pools - https://docs.cloud.google.com/run/docs/deploy-worker-pools
- `[CR-5b]` (S) Worker pools GA reports - https://cloud.google.com/blog/products/serverless/cloud-run-worker-pools-at-estee-lauder-companies ; https://dev.classmethod.jp/articles/cloud-run-worker-pools-ga/
- `[CR-6]` (D) Cloud Run, billing settings - https://docs.cloud.google.com/run/docs/configuring/billing-settings
- `[CT-1]` (D) Cloud Tasks REST reference, tasks - https://docs.cloud.google.com/tasks/docs/reference/rest/v2/projects.locations.queues.tasks
- `[CT-2]` (D) Cloud Tasks, configure queues - https://docs.cloud.google.com/tasks/docs/configuring-queues
- `[CT-3]` (D) Cloud Tasks quotas and limits - https://docs.cloud.google.com/tasks/docs/quotas
- `[CT-4]` (S) Cloud Run, executing asynchronous tasks - https://docs.cloud.google.com/run/docs/triggering/using-tasks
- `[CS-1]` (D) Cloud Scheduler, cron job format and time zone - https://docs.cloud.google.com/scheduler/docs/configuring/cron-job-schedules
- `[CS-2]` (D) Cloud Scheduler quotas and limits - https://docs.cloud.google.com/scheduler/quotas
- `[GCS-1]` (D) Cloud Storage, signed URLs - https://docs.cloud.google.com/storage/docs/access-control/signed-urls
- `[GCP-HIPAA]` (D) Google Cloud, HIPAA compliance and covered products - https://docs.cloud.google.com/docs/security/compliance/hipaa

### Job queues

- `[CEL-1]` (D) Celery workers guide (5.7) - https://docs.celeryq.dev/en/stable/userguide/workers.html
- `[CEL-2]` (S) Celery, Using Redis (visibility timeout) - https://docs.celeryq.dev/en/main/getting-started/backends-and-brokers/redis.html
- `[RQ-1]` (D) RQ docs, jobs and queues - https://python-rq.org/docs/ ; (S) https://pypi.org/project/rq/
- `[RQ-2]` (D) RQ docs, workers - https://python-rq.org/docs/workers/
- `[DRA-1]` (D) Dramatiq - https://dramatiq.io/
- `[DRA-2]` (D) Dramatiq user guide - https://dramatiq.io/guide.html
- `[ARQ-1]` (S) arq on PyPI - https://pypi.org/project/arq
- `[PROC-1]` (D) Procrastinate docs - https://procrastinate.readthedocs.io/en/stable/
- `[PROC-2]` (D) Procrastinate, discussions - https://procrastinate.readthedocs.io/en/stable/discussions.html
- `[PGQ-1]` (R) PgQueuer - https://github.com/janbjorge/pgqueuer
- `[APS-1]` (S) APScheduler version history and 4.0 pre-release - https://apscheduler.readthedocs.io/en/master/versionhistory.html ; https://pypi.org/project/APScheduler/4.0.0a5

### Exports

- `[RL-1]` (D) ReportLab user guide, tables - https://docs.reportlab.com/reportlab/userguide/ch7_tables/
- `[RL-2]` (S) ReportLab toolkit README (licence) - https://sources.debian.org/src/python-reportlab/4.4.7-2/README.txt
- `[WP-1]` (D) WeasyPrint 70.0, common use cases - https://doc.courtbouillon.org/weasyprint/stable/common_use_cases.html
- `[WP-2]` (S) WeasyPrint issue 671 (memory on large documents) - https://github.com/Kozea/WeasyPrint/issues/671
- `[PW-1]` (S) Playwright Python `page.pdf` - https://playwright.dev/python/docs/api/class-page#page-pdf ; https://www.checklyhq.com/docs/learn/playwright/generating-pdfs/
- `[CHR-1]` (S) Chrome for Developers, page margin boxes - https://developer.chrome.com/blog/print-margins
- `[GOT-1]` (D) Gotenberg - https://gotenberg.dev/
- `[WK-1]` (D) wkhtmltopdf status - https://wkhtmltopdf.org/status.html
- `[XW-1]` (D) XlsxWriter, Working with Memory and Performance - https://xlsxwriter.readthedocs.io/working_with_memory.html
- `[OX-1]` (D) openpyxl, Optimised Modes - https://openpyxl.readthedocs.io/en/stable/optimized.html
- `[OW-1]` (D) OWASP, CSV Injection - https://community.owasp.org/attacks/CSV_Injection

### Semantic layers, BI and report-definition prior art

- `[CUBE-1]` (S) Cube repository and docs - https://github.com/cube-js/cube ; https://cube.dev/docs
- `[CUBE-2]` (D) Cube docs, multitenancy - https://docs.cube.dev/embedding/multitenancy
- `[CUBE-3]` (D) Cube docs, data access policies - https://docs.cube.dev/docs/data-modeling/data-access-policies
- `[DBT-1]` (S) dbt Labs on open-sourcing MetricFlow and OSI - https://www.getdbt.com/blog/open-source-metricflow-governed-metrics ; https://www.getdbt.com/blog/dbt-labs-affirms-commitment-to-open-semantic-interchange-by-open-sourcing-metricflow ; https://www.getdbt.com/blog/the-osi-spec-updates
- `[DBT-2]` (S) Atlan, MetricFlow Apache 2.0 licence explainer - https://atlan.com/know/ai-agent/semantic-layer/metricflow-apache-2-license-dbt-semantic-layer/
- `[DBT-3]` (D) dbt docs, metrics overview - https://docs.getdbt.com/docs/build/metrics-overview
- `[DBT-4]` (D) dbt developer blog, "Semantic Layer vs. Text-to-SQL: 2026" - https://docs.getdbt.com/blog/semantic-layer-vs-text-to-sql-2026
- `[MAL-1]` (R) Malloy - https://github.com/malloydata/malloy
- `[LK-1]` (D) Looker docs, What is LookML - https://docs.cloud.google.com/looker/docs/what-is-lookml
- `[LD-1]` (R) Lightdash - https://github.com/lightdash/lightdash ; (S) https://atlan.com/know/ai-agent/lightdash-open-source-bi-tool/
- `[MB-1]` (D) Metabase pricing reference - https://www.metabase.com/pricing.md
- `[MB-2]` (D) Metabase docs, embedding introduction - https://www.metabase.com/docs/latest/embedding/introduction
- `[MB-3]` (D) Metabase docs, dashboard subscriptions - https://www.metabase.com/docs/latest/dashboards/subscriptions
- `[MB-4]` (D) Metabase docs, alerts - https://www.metabase.com/docs/latest/questions/alerts
- `[MB-5]` (D) Metabase docs, SQL parameters - https://www.metabase.com/docs/latest/questions/native-editor/sql-parameters
- `[MB-6]` (D) Metabase licence overview - https://www.metabase.com/license/
- `[SUP-1]` (D) Superset docs, embedding - https://superset.apache.org/user-docs/using-superset/embedding
- `[SUP-2]` (D) Superset docs, alerts and reports - https://superset.apache.org/admin-docs/configuration/alerts-reports
- `[SUP-3]` (D) Superset docs, security (roles, RLS) - https://superset.apache.org/admin-docs/security/
- `[SUP-4]` (R) Apache Superset - https://github.com/apache/superset
- `[SUP-5]` (S) Superset discussion "[5.0] Guest token RLS not working" - https://go.mail-archive.com/notifications@superset.apache.org/msg235519.html
- `[EV-1]` (D) Evidence docs - https://docs.evidence.dev/
- `[AG-1]` (D) AG Grid, Server-Side Row Model datasource - https://www.ag-grid.com/react-data-grid/server-side-model-datasource/
- `[FR-1]` (D) Frappe Framework, Script Report - https://docs.frappe.io/framework/user/en/desk/reports/script-report
- `[RD-1]` (D) Redash, query parameters - https://redash.io/help/user-guide/querying/query-parameters

### AI analytics

- `[BIRD-1]` (D) BIRD-SQL benchmark leaderboard - https://bird-bench.github.io/
- `[BIRD-2]` (S) Annotation-error study and third-party leaderboard summary - https://arxiv.org/abs/2601.08778v1 ; https://awesomeagents.ai/leaderboards/text-to-sql-leaderboard/
- `[ARX-1]` (D) Rumiantsau and Fokeev, "Semantic Layers for Reliable LLM-Powered Data Analytics" (2026) - https://arxiv.org/abs/2604.25149
- `[ANT-1]` (D) Anthropic, Business Associate Agreements for commercial customers - https://privacy.claude.com/en/articles/8114513-business-associate-agreements-baa-for-commercial-customers
- `[ANT-2]` (D) Claude API docs, API and data retention - https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
- `[ANT-3]` (B) Claude API docs, structured outputs and prompt caching - https://platform.claude.com/docs/en/build-with-claude/structured-outputs ; https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- `[OAI-1]` (S) OpenAI help centre, HIPAA eligibility - https://help.openai.com/en/articles/8660679-are-openai-s-services-hipaa-eligible ; https://cdn.openai.com/osa/hipaa-endpoints.pdf
- `[OW-2]` (D) OWASP Top 10 for LLM Applications 2025 - https://genai.owasp.org/llm-top-10/
- `[NIST-1]` (D) NIST/SEMATECH e-Handbook of Statistical Methods, Detection of Outliers - https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h.htm
- `[VAN-1]` (R) Vanna - https://github.com/vanna-ai/vanna

### HIPAA

- `[HIPAA-1]` (D) 45 CFR 164.312, Technical safeguards (Cornell LII) - https://www.law.cornell.edu/cfr/text/45/164.312
- `[HIPAA-2]` (D) 45 CFR 164.514, De-identification and minimum necessary (Cornell LII) - https://www.law.cornell.edu/cfr/text/45/164.514
- `[HIPAA-3]` (S) Reports on the delayed Security Rule final action - https://www.fiercehealthcare.com/health-tech/feds-push-back-hipaa-security-rule-overhaul-july-2027 ; https://www.dwt.com/blogs/privacy--security-law-blog/2026/07/hhs-updates-hipaa-rulemaking-timeframes
- `[HHS-1]` (S) HHS FAQ, "Does the Security Rule allow for sending electronic PHI in an email?" (direct fetch returned HTTP 403) - https://www.hhs.gov/hipaa/for-professionals/faq/2006/does-the-security-rule-allow-for-sending-electronic-phi-in-an-email/index.html
