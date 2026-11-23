# Backend platform — capabilities and constraints for a report engine

_Static analysis only (code + docs read; nothing executed, no server / DB / API touched, no existing file modified). Snapshot 2026-11-21 — `dentc-backend` branch `feature/uat-realse` @ `9183df0` (2026-11-16) plus 16 uncommitted paths (treatment-plan annual-max work; nothing report-related). Backend-root `openapi.json` = OpenAPI 3.1.0, 564 paths / 935 operations / 975 schemas / 25 tags._

**Legend** — **[V]** verified by reading the cited file / lines. **[D]** stated in a repo doc or comment but describing live infrastructure that static analysis cannot confirm. **[I]** inference (reasoned from code, config, or library / platform semantics; not executed). Paths are relative to `dentc-backend/`. Line numbers are of the working tree on the snapshot date.

**Scope split** — this document covers the platform underneath a report engine (request lifecycle, DB access, background work, Redis, e-mail, storage, PDF / Excel, audit, deployment, performance, conventions). The existing report / dashboard endpoints are cited only as platform precedents; their business content and the data model belong to the sibling backend analyses.

---

## 0. TL;DR for planners

| # | Finding | Evidence |
|---|---|---|
| 1 | **No job queue, scheduler or worker tier exists.** No Celery / RQ / APScheduler / Cloud Tasks in `requirements.txt` or `app/`. Everything long-running (PDFs, CSV, statement batch, letter batch, imports, SMS / e-mail sends) runs **inline in the HTTP request**. FastAPI `BackgroundTasks` is used exactly once (password-reset mail). Four `python -m scripts.*` entry points are "cron" jobs whose scheduler is not in the repo. | [V] §3 |
| 2 | Hard per-statement ceiling **30 s** (`SET statement_timeout`), **60 s idle-in-transaction** kill, sync psycopg2 sessions, pool 10 + 20 overflow per worker process, **no read replica**, no per-request timeout override anywhere. | [V] `app/db/session.py` L18-35; §2 |
| 3 | Deployment = **Cloud Run, one service + one database + own buckets per client organisation**, same image, shared Cloud SQL instance (PostgreSQL 15.18, `us-east1`) and shared Memorystore; Cloud Run is in `us-central1` (cross-region DB). Documented service shape: 2 vCPU / 2 GiB / request timeout 120 s / 1-10 instances; gunicorn 2 uvicorn workers, `--timeout 120`. | [V] `Dockerfile`, `.github/workflows/deploy-cloud-run.yml`; [D] `docs/deployment/BACKEND_DEPLOY_GCP.md` §5, `docs/onboarding/NEW_CLIENT_DATABASE.md` |
| 4 | Tenancy is column-based but the **core fact tables carry no `tenant_id`** (`patient_procedures`, `patient_payments`, `insurance_claims`, `appointments`, `treatment_plans`, `treatment_plan_items`, `patient_recalls`, `payment_allocations`, `ledger_insurance_details`, `patient_insurance`). Every aggregate must join `patients.tenant_id`. The generic CRUD engine does **not** tenant-filter those tables. | [V] `schema.sql`; `app/crud/base.py` L91-94; `app/services/report_service.py` L7-10 |
| 5 | A complete office-scope engine exists and has a report mode: `OfficeScopeDep` + `resolve_list_office_filter(..., reports=True)` + `require_all_offices(scope, reports=True)` (403 `office_not_assigned`). It is wired into the CRUD engine, `/dashboard/summary` and `/reports/time-clock`, but **not** into `/reports/*` (5 roll-ups), `/offices/{id}/financial-summary` and siblings, `/transactions`, lab reports, statements batch — those take `office_id` with tenant check only. | [V] §1.4 |
| 6 | Rights: `require_permission(*codes)` / `require_read_access(*codes)` dependencies exist; an ungated user (in no group) passes the first and fails the second; `admin` / `super_admin` hold everything. **No backend guard references any `reports_*` code**; every existing report endpoint is guarded by `get_current_user` only. Migration `8e4a6a8e5ab0` deleted the Recall / Ortho / Labels / Postcards / Excel / Batch-Schedule report rights and all `denticon_practice_analytics_*`. | [V] §1.5 |
| 7 | Schema has **zero** extensions, materialized views, views, functions, triggers, partitions, GIN / GiST indexes (174 tables, 343 btree indexes, 3 partial / expression indexes). App SQL is SQLAlchemy Core / ORM; one window function in the whole app, no CTE, no `date_trunc`; raw `text()` SQL only in one Postgres-only backfill module and in scripts. | [V] §2.2, §2.3 |
| 8 | Reporting indexes are missing: `patient_procedures` has no index on `date_of_service` alone, `office_id`, `provider_id`, `procedure_code` or `created_at`; `patient_payments` none on `payment_date` alone / `office_id` / `provider_id`; `patient_adjustments` none on `adjustment_date`; `insurance_claims` none on `office_id` / status dates. Documented volumes: ≈1.37 M procedures, ≈1.33 M payments, 96 k claims, 84 k patients, 877 k coverage rules, 15 offices. | [V] `schema.sql`; [D] §9.1 |
| 9 | Tests run on **in-memory SQLite** (`Base.metadata.create_all`), Redis / GCS / e-mail off, caller = seeded `super_admin`. No Postgres test tier, and the deploy workflow has no test step. Postgres-only SQL (`date_trunc`, `AT TIME ZONE`, `GROUPING SETS`, matviews, `DISTINCT ON`, `percentile_cont`) cannot be exercised by the suite; existing code buckets dates in Python instead. | [V] `tests/conftest.py`; §2.6 |
| 10 | PDF = **reportlab only** (lazy import, in-memory, Helvetica core fonts). Reusable layout kit `app/services/pdf_report.py` (`ReportHeader`, `PatientReport.data_table()` …, `Page x of y`) already supports office-wide reports (`show_patient=False`, landscape). **No Excel writer is declared**: `openpyxl` is imported by one service and one test but is absent from `requirements.txt`. CSV = stdlib `csv` into `io.StringIO`. No Jinja / HTML-to-PDF / charting dependency. | [V] §6 |
| 11 | E-mail: two unrelated stacks, **neither supports attachments, CC / BCC, multiple recipients or templates**. (a) `app/integrations/email.py` Graph → SMTP → log-only, plain text, used for password reset + the office service-e-mail verification code; (b) SendGrid `send_mail` (HTML + text) behind a patient-bound `email_messages` log. Statement "e-mail delivery" only records intent. | [V] §5.1 |
| 12 | File storage: GCS via `app/integrations/object_storage.py` (V4 signed URLs, 15 min TTL, proxy fallback) + `app/services/document_store.py`, but the store API and key layout are **patient-scoped** (`{prefix}/{tenant_id}/{patient_id}/{uuid}`) and bound to `patient_documents` rows. Local-disk fallback is ephemeral on Cloud Run. | [V] §5.2 |
| 13 | Audit: `audit_logs` (BIGINT, JSON `details`) is written automatically only for 2xx `POST/PUT/PATCH/DELETE`. Reads / exports are audited by hand through `print_service.record_print(...)` (`action='PRINT'`, `details.params`) — used by 4 routers. `record_print` does not stamp `office_id`; `GET /audit-logs` has no `action` or date-range filter. | [V] §7 |
| 14 | Redis (Memorystore basic, private IP, per-client `REDIS_DB` index) = token whitelist / blacklist, TTL JSON cache (`balance:*` 30 s, `report:*` 60 s), atomic counters (login lockout, SMS + public-booking rate limits), Pub/Sub fan-out for the messaging WebSocket, presence. All helpers degrade silently. No lock, queue or stream helper. Report cache keys are not user-scoped and are never invalidated on writes. | [V] §4 |
| 15 | Reusable run-record precedents already in the schema: `utility_runs` (status / parameters / logs, **no execution engine — rows are written `completed` immediately**), `letter_batch_runs` + `letter_batch_items` (inline, ≤ 500 patients), `notifications` (inbox with **no producers**), `user_preferences` (one JSON blob per user), `stored_objects` (generic bucket-object registry), and a per-user / per-tenant WebSocket push (`messaging_events.publish`). | [V] §3.3, §11 |
| 16 | A push to `feature/uat-realse` or `feature/phase_data_migration` builds the image, runs `alembic upgrade head` against the main production DB, then deploys. Only the main client DB / service is automated; other client DBs are migrated by hand. Alembic uses its own `NullPool` engine, so migrations are not bound by the 30 s statement timeout. | [V] `.github/workflows/deploy-cloud-run.yml`, `alembic/env.py` L41-50; [D] onboarding §14 |

---

## 1. Request lifecycle

### 1.1 Middleware stack [V] `app/main.py` L87-103

Starlette runs the last-added middleware outermost. All three custom layers are `BaseHTTPMiddleware`.

| Order (outer → inner) | Class | File | Behaviour | Relevance to reports |
|---|---|---|---|---|
| 1 | `CORSMiddleware` | `app/main.py` L93-103 | `allow_origins=settings.CORS_ORIGINS`, `allow_origin_regex`, `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`, `expose_headers=["X-Request-ID","X-Process-Time"]` | `Content-Disposition` is not in `expose_headers`, so cross-origin JS cannot read a server-chosen export file name [I] |
| 2 | `CatchAllMiddleware` | `app/middleware/catch_all.py` | Any unhandled exception → 500 `{"error":{"code":"internal_error","message":"An unexpected error occurred","details":{"request_id"}}}` (so the 500 still carries CORS headers) | A cancelled statement (30 s) is an `OperationalError`, which no handler maps → this generic 500 [I] |
| 3 | `AuditMiddleware` | `app/middleware/audit.py` L40-81 | After the handler: if method ∈ `{POST,PUT,PATCH,DELETE}` and status 2xx and `request.state.token_payload` is set → `audit_service.write_audit(...)` in its own `SessionLocal()` (sync call inside the async `dispatch`) | **GET report reads are not audited here.** A `POST` that streams `application/json` without `Content-Length` is fully buffered by `_read_json_ids` (L142-176) |
| 4 | `RequestContextMiddleware` | `app/middleware/request_context.py` | `X-Request-ID` (incoming or `uuid4().hex`), contextvars `request_id_ctx`, `client_ip_ctx` (first hop of `X-Forwarded-For`), `user_agent_ctx`, `request_base_url_ctx`; response headers `X-Request-ID`, `X-Process-Time`; access-log line, WARNING when elapsed > `SLOW_REQUEST_SECONDS = 1.0` | Built-in slow-request signal; no metrics / tracing library |

Other app-level facts [V] `app/main.py`: routers mounted under `settings.API_V1_PREFIX = "/api/v1"`; `/health`, `/health/redis`, `/health/messaging`; only `UPLOAD_PUBLIC_SUBDIRS` (`logos`, `office_logos`, `provider_watermarks`) are static-mounted; `_assert_unique_operation_ids` raises at import on a duplicate `operation_id`; `install_utc_json_encoder()` makes plain-dict responses emit offset-bearing datetimes.

### 1.2 Authentication

| Item | Fact | Evidence |
|---|---|---|
| Scheme | `HTTPBearer(auto_error=False)`; one global `BearerAuth` scheme in OpenAPI | [V] `app/api/deps.py` L27; `app/main.py` L196-203 |
| Token | JWT `HS256`, secret `JWT_SECRET_KEY`, library `python-jose` | [V] `app/core/security.py` L43-62 |
| Access-token claims | `sub` (user id as string), `type="access"`, `jti` (uuid4 hex), `iat`, `exp`, `tenant_id`, `role` | [V] `security.py` L52-60; `app/services/auth_service.py` L95-96 |
| Refresh-token claims | `sub`, `type="refresh"`, `jti`, `iat`, `exp`, `tenant_id` | [V] `auth_service.py` L97 |
| TTL | access 60 min (`ACCESS_TOKEN_EXPIRE_MINUTES`), refresh 14 days (`REFRESH_TOKEN_EXPIRE_DAYS`) | [V] `app/core/config.py` L55-56 |
| Revocation | access blacklist `blacklist:access:{jti}`, refresh whitelist `refresh_token:{user_id}:{jti}`; both fail-open when Redis is down | [V] `app/integrations/redis_store.py` L99-163 |
| Per-request chain | `get_token_payload` (decode, blacklist check, cached on `request.state.token_payload`) → `get_current_user` (`db.get(User, int(sub))`, must be `is_active`) → `get_tenant_id` | [V] `deps.py` L32-74 |
| 401 codes | `missing_token`, `invalid_token`, `token_revoked`, `invalid_user` | [V] `deps.py`, `security.py` |
| Not in the token | office assignments and rights — resolved from the DB on every request, no caching (user 1 query, rights 2 queries, assigned offices 1 query; `office_rights()` re-runs `effective_permissions`) | [V] `permission_service.py` L154-180; `office_scope_service.py` L109-117, L149-154 |
| Header-less auth precedents | messaging WebSocket `?token=<JWT>`; imaging `<img>` assets use an HMAC asset token (`make_asset_token`, keyed on `JWT_SECRET_KEY`, TTL `IMAGING_ASSET_TOKEN_TTL_SECONDS` = 24 h, authorises one asset for one tenant) | [V] `app/integrations/object_storage.py` L221-249 |

Token validity is checked at request start only; nothing re-checks during a long handler [V].

### 1.3 Tenant resolution

| Item | Fact | Evidence |
|---|---|---|
| Source | `get_tenant_id` returns `current_user.tenant_id`; header `X-Tenant-ID` is honoured only for role `super_admin` (else 403 `forbidden`) | [V] `deps.py` L64-74 |
| Aliases | `DbSession`, `CurrentUser`, `TenantId`, `PageParams` (`page ≥ 1`, `size ≤ 200`, `sort`, `order`, `search`) | [V] `deps.py` L25, L61, L77, L144-154 |
| Enforcement | `CRUDBase._scope_tenant` adds `WHERE tenant_id = :t` **only when the model has a `tenant_id` column**; 8 CRUD subclasses override it with a patient join; the rest of the tenant-less tables are unfiltered in generic lists | [V] `app/crud/base.py` L91-94; overrides in `insurance_plan_service.py` L424, `medical_history_service.py` L1899, `perio_service.py` L163 / L217, `progress_notes_service.py` L149, `signature_service.py` L672, `treatment_service.py` L719 / L842 |
| Hand-written aggregates | join `patients` and filter `patients.tenant_id` (`report_service`), or load the tenant's patient-id set into Python (`transactions_service.transaction_feed` L330-335) | [V] |
| Audit tenant | `AuditMiddleware` records `payload["tenant_id"]` from the token, not the `X-Tenant-ID` target | [V] `audit.py` L66 |
| Practical topology | one database per client organisation, each starting at `tenant_id = 1` | [D] `docs/onboarding/NEW_CLIENT_DATABASE.md` |

### 1.4 Office scope ("office = working context, tenant = fence")

Engine: `app/services/office_scope_service.py` [V].

| Symbol | Kind | Behaviour |
|---|---|---|
| `OfficeContext` = `Annotated[OfficeScope, Depends(get_office_context)]` (L444-465) | dependency | Builds `OfficeScope(user, tenant_id, _db)`; validates header `X-Office-ID` against `user_offices` (403 `office_not_assigned`); stores `x_office_id`; sets `office_id_ctx` and `audit_context.record(office_id=…)` |
| `OfficeScopeDep` = `Depends(get_office_scope)` (L468-498) | dependency | `OfficeContext` + OpenAPI-visible query params `all_offices: bool = False`, `office_ids: list[int]` (repeated keys), `office_group_id: int`, `include_global: bool \| None` |
| `resolve_list_office_filter(scope, *, column, kind, explicit_value, patient_scoped=False, reports=False, default_narrow=True)` (L301-352) | function | Returns `OfficeListFilter(column, office_ids: list[int] \| None, include_null)`. Precedence: explicit single office → `office_ids[]` → `office_group_id` (∩ assigned unless unrestricted) → `all_offices` → default (assigned offices; `None` = tenant-wide for unrestricted callers) |
| `validate_target_office(scope, office_id, field=…)` (L241-250) | function | 403 `office_not_assigned`, `details = {office_id, field, assigned_office_ids}` |
| `require_all_offices(scope, reports=True)` (L277-298) | function | 403 unless the caller holds the view-all right (or is ungated); `REPORTS_ALL_OFFICES` is an alias of the same master code |
| `assert_office_path_access(db, user, tenant_id, office_id)` (L269-274) | function | For `/offices/{office_id}/*` paths |
| `assigned_office_ids(db, user_id, tenant_id) -> set[int]` (L109-117) | function | `user_offices ⋈ offices`, narrowed to the tenant |
| `office_group_office_ids(db, tenant_id, group_id)` (L120-127) | function | `offices.office_group_id = :group_id` (one group per office; table `office_groups(id, tenant_id, name, …)`) |
| `OfficeScope.unrestricted()` (L172-178) | method | `not settings.OFFICE_SCOPE_ENFORCED or can_view_all() or is_ungated()` |

Rules and switches [V]:

| Rule | Detail |
|---|---|
| Privileged bypass | Roles `owner`, `admin`, `manager`, `super_admin` (`OFFICE_ADMIN_ROLES`) or a group right `office_scope_view_all_offices`; legacy alias `appointments_add_appointment_in_other_office` also bypasses narrowing / targeting (`permission_service.py` L74-120) |
| Ungated bypass | A caller with **zero** `user_offices` rows is tenant-wide (`is_ungated`, L168-170) |
| Kill switch | `OFFICE_SCOPE_ENFORCED: bool = True` (`config.py` L457); `OFFICE_REQUIRE_POS_OFFICE = False` (L465) |
| `X-Office-ID` | Never filters reads; write default-stamp + audit only (`docs/office-scope/office_scope_backend_response_r2.md` FE-OFF-9) |
| Array encoding | `?office_ids=1&office_ids=2` (repeated keys), not CSV (same doc, FE-OFF-5) |
| Error body | `{"error":{"code":"office_not_assigned","message":…,"details":{…}}}` — code at `error.code` |

Where the engine is applied [V by grep of `app/api/v1/*.py` and `app/services/*.py`]:

| Applied | Not applied (accept `office_id` / `{office_id}` with a tenant check only) |
|---|---|
| Generic CRUD engine (33 registry entries set `office_scope=`), `app/api/v1/dashboard.py` (`_resolve_targets` L44-63), `app/api/v1/time_clock.py` report router (`build_report` uses `resolve_list_office_filter(..., reports=True)`, `time_clock_service.py` L1356-1361), `office_assignment.py`, `sms.py`, `utility_service.submit_run`, `appointment_service`, `patient_service`, `my_page_service` | `app/api/v1/reports.py` (all 5 roll-ups), `transactions.py` (`/offices/{office_id}/financial-summary`, `/collections`, `/insurance-receivables`, `/adjustment-summary`, `/transactions`), `lab_tracking.py` (+ service), `statements.py`, `letters.py`, `scheduler.py`, `billing.py`, `refunds.py`, `fee_schedules.py`, `patients_extra.py`, `audit.py` |

Consequence [I]: the statement "the backend validates every `office_id`" holds for the CRUD engine but not for the existing aggregate / report routes; a restricted user can read another office's roll-ups by editing `office_id`. A report engine must take `OfficeScopeDep` and resolve the office set once.

### 1.5 Roles, rights and the dependencies available

| Dependency / helper | Semantics | Evidence |
|---|---|---|
| `require_roles(*roles)` | 403 `forbidden` unless `user.role` ∈ roles or `super_admin`. Used 9× with `"admin"` | [V] `deps.py` L80-88 |
| `require_permission(*codes, action=…)` | Passes when the caller holds **any** code. `admin` / `super_admin` hold everything; a user in **no group is ungated and passes**. 403 `permission_denied`, `details = {required_any_of, groups}` | [V] `deps.py` L91-104; `permission_service.py` L138-144, L183-190 |
| `require_read_access(*codes)` | Same, but an ungated non-admin does **not** pass (`has_strict`) — for data that was admin-only | [V] `deps.py` L107-133 |
| `permission_service.effective_permissions(db, user) -> EffectivePermissions(codes, groups, full_access, enforced)` | Union of rights over the user's active groups; 2 statements | [V] `permission_service.py` L123-180 |
| `permission_service.assert_permission(perms, *codes)`, `assert_actor_permission(db, actor_id, *codes)` | For service code | [V] L183-228 |
| `CrudConfig.write_permissions / create_permissions / update_permissions / delete_permissions` | Per-verb rights on generated routes; reads are never gated there | [V] `app/crud/router_factory.py` L82-97, L320-341 |
| `reject_unknown_query_params` (`RejectUnknownQuery`) | Opt-in per route: 422 `unknown_query_parameter` for an undeclared query param (FastAPI otherwise ignores it silently). Gated by `DOCUMENT_LIST_REJECT_UNKNOWN_PARAMS` | [V] `deps.py` L157-188 |

| Item | Fact | Evidence |
|---|---|---|
| Role vocabulary | `users.role` VARCHAR(50), default `staff`; defaults `admin`, `provider`, `front_desk`, `staff`, `super_admin` (overridable via `/definitions` group `user_role`); `owner` / `manager` recognised by office + time-clock code | [V] `user_admin_service.py` L44, L75; `permission_service.py` L45, L98; `time_clock_service.py` L102-104 |
| Rights tables | `permissions` (global catalog, curated to 363 codes), `user_groups`, `user_group_memberships`, `user_group_rights` | [V] `permission_service.py` L42; `app/services/access_rights_catalog.py` L1-32 |
| Client view | `GET /auth/me-full` → `MeFull.permissions[]`, `permissions_enforced`, `groups[]`, `offices[]`, `current_office_id`, `provider_id` (provider row linked to the user) | [V] `app/schemas/auth.py` L103-128 |
| Report rights kept in the catalog | Legacy labels in `data/Groups.txt` slugified by `scripts/seed_permissions.py` (`slugify`): Daily / Monthly / Ledger / Management / Insurance / Appointment / Treatment Plan / Referral Reports "Screen Full Control" + "Screen View Only", Statements (+ `reports_statement_allow_updating_statement_dates`), Lists (Patient, Provider, Office, Employer, Prescription, Procedure/Fee, Responsible Party, Security, Setup), Letters, Custom Letter, My Reports, Group Reports | [V] `data/Groups.txt`; `scripts/seed_permissions.py` L44-58 |
| Report rights deleted | `report_batch_schedule_report_*` (4), `reports_excel_reports_*`, `reports_recall_reports_screen_*`, `reports_ortho_reports_*`, `reports_labels_screen_*`, `reports_postcards_*`, `reports_custom_postcard_*`, `reports_batch_collection_letters_*`, `reports_blank_insurance_form_screen_*`, `reports_dha_reports_screen_*`, all `reports_office_reports_*`, all 10 `denticon_practice_analytics_*` | [V] `access_rights_catalog.py` `REMOVED_ROWS` L45-55, L90-143 |
| Rights added by DentC | `dashboard_view`, `my_page_access` (category `Dashboard`) | [V] `access_rights_catalog.py` L295-296 |
| Enforcement today | No file under `app/` (outside the catalog module) references a `reports_*` or `dashboard_*` code; `/reports/*`, `/dashboard/summary`, `/patients/{id}/reports/*`, lab and time-clock reports depend on `get_current_user` only (time clock adds its own caller-role rules) | [V] grep |
| Adding a right | Append to `ADDED_RIGHTS` in `access_rights_catalog.py` + an Alembic revision calling `apply_curation` (idempotent); `code` is immutable | [V] `access_rights_catalog.py` L1-32 |
| Unenforced per-user columns | `users.report_access_provider_id` (FK `providers.id`, editable in Security → Users) and `users.patient_access_level` are stored but read by no query | [V] `app/db/models/identity.py` L56, L70-72; grep |

---

## 2. Database access

### 2.1 Engine and session [V] `app/db/session.py`

| Item | Value |
|---|---|
| Driver | `postgresql+psycopg2` (sync). No async engine, no `asyncpg` |
| Engine | one module-level `engine`; `pool_size=DB_POOL_SIZE` (10), `max_overflow=DB_MAX_OVERFLOW` (20), `pool_timeout=DB_POOL_TIMEOUT` (30 s), `pool_recycle=DB_POOL_RECYCLE` (3600 s), `pool_pre_ping=True` (`config.py` L45-50) |
| Per-connection settings | `SET statement_timeout = DB_STATEMENT_TIMEOUT_MS` (**30 000 ms**) and `SET idle_in_transaction_session_timeout = 60000` on every pool connect (L30-35) |
| Session | `SessionLocal(autocommit=False, autoflush=False, expire_on_commit=False)`; `get_db()` yields one session per request and closes it in `finally` (L38-52) |
| Read replica / second bind | none; a single `DATABASE_URL` (`config.py` L37) |
| Per-request override | none: no `SET LOCAL statement_timeout`, no `execution_options(stream_results / yield_per)` in `app/` (only `scripts/report_pricing_calculation_correctness.py` L98 uses `stream_results=True, yield_per=20000`) |
| Handlers | ≈431 hand-written route decorators under `app/api` (plus the generated CRUD routes), 16 `async def` functions; sync `def` handlers run in Starlette's threadpool (not tuned — library default limiter [I]) |
| Server | PostgreSQL **15.18** (`schema.sql` header); Cloud SQL instance `reckon-dental:us-east1:recon-dental-db`, reached over the unix socket `/cloudsql/…` from Cloud Run in `us-central1` (workflow L14-20) |

Derived constraints [I]:

- One SQL statement > 30 s is cancelled → `OperationalError` → generic 500 (`app_error_from_db` only maps `IntegrityError` / `DataError`, `app/core/exceptions.py` L316-327).
- A handler that keeps its transaction open and then spends > 60 s without touching the DB (building a large PDF / XLSX from already-fetched rows) has its connection terminated; the next statement in that request fails. Long render phases must end the transaction first.
- Up to 30 connections per worker process × 2 workers × up to 10 instances per client service, against a Cloud SQL instance shared by every client.
- A report holds one threadpool thread and one pooled connection for its whole duration; N+1 patterns pay a cross-region round trip each (≈105 ms warm from a dev workstation, `docs/patients/patient_search_backend_response.md` L20-23 [D]).
- `requirements.txt` pins only `passlib` / `bcrypt`; `fastapi>=0.110`. Whether a `StreamingResponse` generator may still use the request's `db` session after the handler returns depends on the FastAPI version resolved at image build; the existing streaming endpoints read from GCS / disk, not from the session [V].

### 2.2 Query style in the app [V by grep]

| Pattern | Occurrence |
|---|---|
| SQLAlchemy 2.x `select()` Core / ORM | everywhere |
| Raw SQL `text()` | only `app/services/account_backfill.py` (Postgres-only: `CREATE TEMP TABLE`, `UPDATE … FROM`, `~` regex, `::int` casts; run by a migration and `scripts/backfill_patient_accounts.py`) and offline scripts (`scripts/report_pricing_*.py`, `validate_pricing_against_history.py`) |
| Window function | one: `func.row_number().over(partition_by=…)` in `signature_service.py` L658 |
| CTE, `date_trunc`, `to_char`, `extract`, `string_agg`, `array_agg`, `generate_series`, `LATERAL`, `DISTINCT ON`, `percentile_*`, `GROUPING SETS` | none |
| Upsert | `pg_insert … on_conflict_do_nothing` with a dialect branch to `sqlite_insert` (`office_setup_service.py` L20-21, L92) |
| Row locks | `with_for_update()` on precondition writes (`crud/base.py` L106-107) |
| Free-text search | `column.ilike('%term%')` OR-ed across declared columns (`crud/base.py` L183-196); no trigram index |
| List count | `SELECT count(*) FROM (<filtered stmt>)` on every list call (`crud/base.py` L198); offset / limit paging (L213); keyset paging only in messaging (UUIDv7 ids) |
| Sign helper for money | `app/services/ledger_sign.py`: `payment_delta_sql()`, `payment_credit_sql()`, `payment_debit_sql()`, `sum_payment_credit()` — the one rule for `patient_payments.amount` (migrated rows are stored negative, app rows positive, `payment_type='adjustment'` is two-way) |
| Money on the wire | `float` in the report schemas ("the established balance / ledger contract", `app/schemas/reports.py` L7); `Decimal` in transactions / dashboard |

### 2.3 Postgres features in the schema [V] `schema.sql` (pg_dump of 15.18, 2026-10-11; predates revision `9435491c1d19`, so `accounts` is missing from it)

| Object | Count |
|---|---|
| Tables / sequences | 174 tables (ORM: ≈172 mapped classes in `app/db/models/`) |
| Indexes | 343, all btree |
| Partial / expression indexes | 3: `uq_fee_schedule_assignments_target` (COALESCE expression), `uq_sms_messages_reminder_dedupe` (`WHERE reminder_lead_hours IS NOT NULL`), `uq_time_clock_entries_open_shift` (`WHERE clock_out IS NULL AND is_active AND NOT auto_closed`) |
| Foreign keys | 603 |
| Extensions (`pg_trgm`, `btree_gin`, …) | 0 |
| Materialized views / views | 0 / 0 |
| Functions / triggers | 0 / 0 |
| Partitioned tables / custom types | 0 / 0 |
| GIN / GiST / BRIN / hash indexes | 0 |
| `json` / `jsonb` columns | 33 / 1 |
| Timestamps | 330 `timestamp without time zone`, 2 `timestamp with time zone` |
| Money | 167 `numeric(…)` columns |

Global (not per-tenant) uniques exist, e.g. `offices.office_code`, `insurance_claims.claim_number`, `users.email`, `users.username` [V] — consistent with the one-DB-per-client topology.

### 2.4 Tenancy and scoping columns on the fact tables [V] `schema.sql`

| Table | `tenant_id` | `office_id` | `provider_id` | `created_at` | `created_by` |
|---|---|---|---|---|---|
| `patient_procedures` (46 cols) | no | yes | yes | yes | yes |
| `patient_payments` (22) | no | yes (+ `created_office_id`) | yes | yes | yes |
| `patient_adjustments` (14) | **yes** | yes | yes | yes | yes |
| `patient_refunds` (19) | **yes** | yes | no | yes | yes |
| `insurance_claims` (53) | no | yes | no (`billing_provider_id`, `treating_provider_id`) | yes | yes |
| `ledger_insurance_details` (38) | no | yes | no | yes | yes |
| `payment_allocations` (13) | no | no | yes | yes | no |
| `appointments` (40) | no | yes | yes | yes | yes |
| `appointment_procedures` (21) | no | no | yes | yes | no |
| `treatment_plans` (9) | no | yes | no | yes | yes |
| `treatment_plan_items` (44) | no | no | yes | yes | yes |
| `patient_recalls` (18) | no | yes | no | yes | yes |
| `referrals` (24) | **yes** | yes | no | yes | yes |
| `patient_insurance` (19) | no | no | no | yes | no |
| `insurance_subscribers` (39) | **yes** | yes | no | yes | no |
| `time_clock_entries` (27) | **yes** | yes | no | yes | yes |
| `sms_messages` (34) | **yes** | yes | no | yes | yes |
| `patient_statements` (26) | **yes** | yes | no | yes | yes |
| `progress_notes` (23), `prescriptions` (24), `perio_exams` (12), `chart_conditions` (31) | no | yes | mixed | yes | mixed |

### 2.5 Time zones [V]

| Fact | Evidence |
|---|---|
| Every `created_at` / `updated_at` is a naive `TIMESTAMP` holding **UTC** (`datetime.now(timezone.utc)` writers) | `app/core/datetimes.py` L1-20 |
| Each office has `offices.timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York'`; helpers `office_tz()`, `office_today()`, `as_utc()`, `isoformat_utc()`, `UtcDatetime` | `datetimes.py` L31-73; `schema.sql` |
| Business dates (`date_of_service`, `payment_date`, `appointments.date`) are `DATE` columns | `report_service.py` |
| `report_service._today()` uses the **UTC** date; time clock and lab tracking use the office-local date | `report_service.py` L56-57; `time_clock_service.py` L1344-1375; `lab_tracking_service.py` L81-88 |
| Legacy `time_clock_entries` rows are `clock_basis='wall_clock'` (office wall time stored with a `Z`) | `CLAUDE.md` L1945 (TC-BE-9) [D] |

Consequence [I]: "by created date" (legacy criterion "Created Date" vs "Transaction Date") needs a UTC → office-local conversion per office. In SQL that is `AT TIME ZONE` (Postgres-only); existing code converts in Python.

### 2.6 Tests on SQLite — what breaks and how the code copes [V] `tests/conftest.py`

| Item | Fact |
|---|---|
| Engine | `create_engine("sqlite://", StaticPool)` + `Base.metadata.create_all(engine)` per test (L80-105). Anything not in ORM metadata (matviews, extensions, functions, raw-DDL migrations) does not exist in tests |
| Caller | `get_db`, `get_current_user`, `get_tenant_id` overridden → seeded `super_admin` of tenant "test" (L139-150); rights and office checks therefore pass. Restricted-user precedent: the `scoped` fixture in `tests/test_office_scope.py` (role `front_desk`) |
| Externals | `REDIS_ENABLED=False`, `GCS_BUCKET_DOCUMENTS=None`, Jira / RingCentral / SendGrid / Graph / SMTP cleared (L26-77) |
| FKs | SQLite FK enforcement is opt-in per module (`pytestmark = pytest.mark.enforce_fks`; 3 test modules: AppointNow, responsible-party accounts, time clock) |
| Size | 96 test files, ≈1,299 test functions; `tests/test_crud_contract.py` parametrises over `ALL_CONFIGS` |
| CI | No test job: `.github/workflows/deploy-cloud-run.yml` builds, migrates, deploys, probes `/health/redis` |
| Postgres tier | none (no container fixture, no skip markers); `account_backfill.py` is untested by the suite |

| Postgres-only construct | On SQLite | Existing coping pattern |
|---|---|---|
| `date_trunc`, `to_char`, `AT TIME ZONE`, interval arithmetic | unsupported | group by the raw `DATE` column and bucket week / month in Python (`report_service._bucket_start`, L326-331; module docstring L12-14) |
| `CAST(ts AS DATE)` in `GROUP BY` / filters | mis-parses under SQLite's numeric date affinity | half-open datetime range `[date_from 00:00, date_to + 1 day)` (`report_service.py` L104-112) |
| `DATE` results | may come back as ISO strings | `_as_date()` coercion (`report_service.py` L316-323) |
| `INSERT … ON CONFLICT` | different dialect object | dialect branch `pg_insert` / `sqlite_insert` |
| Partial unique index | different predicate syntax | twin `postgresql_where` / `sqlite_where` (`app/db/models/staff.py` L33-47) |
| `BIGINT` autoincrement PK | not auto-incrementing | `BigInteger().with_variant(Integer, "sqlite")` (`app/db/models/audit.py` L24-26) |
| `SELECT … FOR UPDATE` | silently dropped by the dialect | accepted |
| `now()` precision | whole seconds | version stamps written app-side with µs (`crud/base.py` L287-294) |
| Driver error text | no SQLSTATE / `diag` | `app_error_from_db` parses both (`app/core/exceptions.py` L147-269) |
| `GROUPING SETS / ROLLUP / CUBE`, `DISTINCT ON`, `percentile_cont`, `LATERAL`, arrays, `jsonb` operators, materialized views | unsupported | not used anywhere |
| Window functions, CTEs, `FILTER (WHERE …)` | supported by modern SQLite [I] | one window function exists and is tested |

---

## 3. Background work

### 3.1 What exists [V by grep over `app/`, `scripts/`, `requirements.txt`, config files]

| Mechanism | Present? | Detail |
|---|---|---|
| Celery / RQ / Dramatiq / Huey / arq | no | not in `requirements.txt`; `ecosystem.config.js` has a commented-out PM2 entry for `celery -A app.core.celery_app` and no such module exists |
| APScheduler / in-process scheduler | no | — |
| Cloud Tasks / Pub/Sub / Cloud Scheduler client | no | only `google-cloud-storage` is declared |
| FastAPI `BackgroundTasks` | 1 use | `POST /auth/forgot-password` offloads `send_password_reset` (`app/api/v1/auth.py` L191-194; `auth_extras_service.py` L106-120) |
| `run_in_threadpool` | yes | wraps sync DB / GCS work inside the `async def` handlers (uploads, webhooks, WS gateway) |
| `asyncio.create_task` | 1 use | Redis Pub/Sub reader started in `lifespan` (`app/integrations/redis_pubsub.py` L91) |
| Cron entry points | 4 scripts | `scripts/run_sms_reminders.py` (every 10-15 min), `scripts/expire_booking_requests.py` (5-15 min), `scripts/auto_close_time_clock.py` (hourly), `scripts/purge_sms_messages.py`; each opens `SessionLocal()` and calls a service function (`sms_service.run_reminders` L1160, `appointnow_service.expire_all` L1795, `time_clock_service.auto_close_stale` L676, `sms_service.purge_expired` L1276) |
| Scheduler for those scripts | not in repo | "create one Cloud Scheduler job per client per script" (`docs/onboarding/NEW_CLIENT_DATABASE.md` §11) [D]; how a job invokes the script (Cloud Run Job, HTTP trigger) is not defined anywhere |
| Admin HTTP kick | yes | e.g. `POST /api/v1/sms/reminders/run` runs the same service inline |

Backend's own statement on reports [D] `docs/reports/reports_backend_response.md` "Gap 4": server-rendered PDF / XLSX, e-mail delivery and scheduled reports are deferred because they "require a rendering pipeline + a persisted job runner (e.g. Redis/RQ or Celery) and delivery config". Proposed, unbuilt contract: `POST /api/v1/reports/{report}/export` (`{format: "pdf"|"xlsx", params}`), `POST` / `GET /api/v1/reports/schedules`.

### 3.2 How long tasks run today [V]

| Task | Execution | Limits / notes | Evidence |
|---|---|---|---|
| Server PDFs (patient overview / ledger / transactions / insurance, statements, ADA claim form, payment-plan contract, medical history, lab reports, time-clock report) | inline; whole document built in memory; returned as `Response(content=bytes, media_type="application/pdf")` | no size cap; 13 `application/pdf` responses in OpenAPI | `app/api/v1/patient_reports.py` L36-41; `pdf_report.py` L550-610 |
| CSV exports (lab cases, time clock) | inline; `csv.writer` into `io.StringIO`; `Response(content=str, media_type="text/csv")` | 2 `text/csv` responses in OpenAPI | `lab_tracking_service.py` L591; `time_clock_service.py` L1470 |
| Time-clock hours report | inline; loads all entries in range, aggregates in Python | `MAX_REPORT_DAYS = 366` → 422 `range_too_large` | `time_clock_service.py` L113, L1324-1364 |
| Statement batch `POST /offices/{id}/statements/batch` | inline loop over every active patient of the office calling `balance_service.get_patient_balance` per patient | no cap; a single office holds up to 7,781 patients [D] | `statement_service.py` L201-231; `docs/patients/patients_audit.md` L50 |
| Letter batch `POST /letters/render-batch` | inline; durable `letter_batch_runs` + `letter_batch_items`; one failed patient does not stop the run | `LETTERS_BATCH_MAX_PATIENTS = 500` → 422 `batch_too_large` | `letter_service.py` L731-776; `config.py` L259 |
| Fee-schedule import | `async def` + `run_in_threadpool`; row-level report, `dry_run`, `all_or_nothing` | `MAX_IMPORT_BYTES = 5 MiB`, `MAX_IMPORT_ROWS = 20000` | `app/api/v1/fee_schedules.py` L339-361; `fee_schedule_wizard_service.py` L65-66 |
| SMS / patient e-mail send | inline: persist row `queued` → provider HTTP call (httpx, 15 s timeout) → update row; provider failure = 502 with the row stored `failed` | idempotent per `client_id` | `email_service.py` L63-144 |
| Webhooks (SendGrid, RingCentral, Stripe) | `async def`, verify signature, then `run_in_threadpool` | — | `app/api/v1/email.py` L62-84 |
| Utilities `POST /utilities/{utility_id}/run` | **stub**: writes a `utility_runs` row with `status="completed"` and a log line "no records were processed" | per-(utility, office) duplicate guard, admin only | `utility_service.py` L32-84 |
| DICOM capture ingest | `run_in_threadpool` inline | — | `app/api/v1/imaging.py` L105 |

### 3.3 Run / job record shapes already in the schema [V]

| Table (model) | Columns that matter | Reuse potential |
|---|---|---|
| `utility_runs` (`UtilityRun`, `app/db/models/platform.py` L40-57) | `tenant_id`, `utility_id`, `office_id`, `run_by`, `status` (submitted / running / completed / failed), `parameters` JSON, `processed`, `succeeded`, `failed`, `logs` JSON, `created_at`, `finished_at`; API `POST /utilities/{id}/run`, `GET /utilities/jobs/{job_id}`, `GET /utilities/audit` | shape of a `report_runs` table and its polling endpoint |
| `letter_batch_runs` / `letter_batch_items` (`app/db/models/comms.py` L197-240) | header counters (`requested`, `processed`, `succeeded`, `failed`, `status`, `options` JSON, `error`, `finished_at`, `created_by`) + per-item outcome rows | header + item split for large batch outputs (statements, labels, letters, postcards) |
| `notifications` (`Notification`, `app/db/models/access.py` L46-61) | `tenant_id`, `user_id`, `category`, `title`, `body`, `ref_type`, `ref_id`, `is_read`, `read_at`; API `GET /users/me/notifications`, `…/{id}/read`, `…/read-all` | "your report is ready" inbox — the table has **no producer** today |
| `user_preferences` (`UserPreference`, L64+) | unique (`user_id`, `pref_key`), `pref_value` TEXT; API `GET` / `PUT /users/me/preferences` reads / replaces one blob under key `ui_prefs` (`my_page_service.py` L24, L123-151) | per-user favourites; not shareable, whole-blob replace |
| `stored_objects` (`StoredObject`, `app/db/models/imaging.py` L105-122) | `tenant_id`, `bucket`, `object_key` (unique pair), `kind`, `content_type`, `size_bytes`, `sha256`, `ref_count` | registry for generated report files (today DICOM only) |

### 3.4 Constraints for any asynchronous design on this topology [I]

- Cloud Run request-scoped CPU: work continued in-process after the response (threads, `BackgroundTasks`) is not guaranteed CPU or instance lifetime unless the service is configured for always-allocated CPU and a minimum instance — neither is visible in the repo.
- Every client has its own service, database, secrets and Redis DB index, so a worker / scheduler must be provisioned (or parameterised) per client. The image already contains `scripts/` and `alembic/` (`COPY . .`; `.dockerignore` drops `docs/`, `legacy_app/`, `denticon_migration/`, `uploads/`, env files, caches and virtualenvs, not `scripts/`), so the same image can run a job entry point — the CI migration step already runs `alembic` inside it.
- Memorystore is basic tier without AUTH (workflow L21-27 comment) — single node, no persistence guarantee; unsuitable as the only durable store for job state. Job state belongs in Postgres (as `utility_runs` / `letter_batch_runs` already do).

---

## 4. Redis

### 4.1 Uses [V] `app/integrations/redis_store.py`, `redis_pubsub.py`

| Use | Keys | TTL | When Redis is down |
|---|---|---|---|
| Refresh-token whitelist | `refresh_token:{user_id}:{jti}` | refresh TTL | token accepted on signature alone |
| Access-token blacklist | `blacklist:access:{jti}` | remaining token life | treated as not revoked |
| Patient balance cache | `balance:{tenant_id}:{patient_id}` | 30 s (`balance_service._CACHE_TTL`); explicit `cache_delete` after payment / adjustment / claim / refund / instalment writes (10 call sites) | recomputed |
| Report roll-up cache | `report:{summary\|trends\|ar\|aging\|elig}:{tenant_id}:{office_id\|all}:{params…}` | 60 s (`report_service._CACHE_TTL`, L39, L60-62); **never invalidated** | recomputed |
| Public availability cache | `appointnow:avail:{office}:{day}:{provider}:{duration}:{operatory}` | `APPOINTNOW_AVAILABILITY_CACHE_SECONDS` = 30 | recomputed |
| Login lockout counter | lockout key per username | `LOGIN_LOCKOUT_MINUTES` × 60 | lockout disabled |
| SMS rate limit | `sms:rl:{tenant_id}` | 60 s window, `SMS_RATE_LIMIT_PER_MINUTE` = 60 | limit disabled |
| Public booking rate limit | per IP / office | `APPOINTNOW_RATE_LIMIT_WINDOW_MINUTES` | per-worker only |
| Messaging fan-out | Pub/Sub channels `msg:{tenant_id}:{user_id}` and `msg:{tenant_id}:tenant` | — | in-process delivery only (does not cross workers / instances) |
| Presence | status + socket refcount keys | `MESSAGING_PRESENCE_TTL_SECONDS` = 45 | everyone "offline" |

### 4.2 Helper API (all sync, all swallow `RedisError`) [V]

| Function | Signature / return |
|---|---|
| `cache_get(key) -> str \| None`, `cache_set(key, value: str, ttl_seconds)`, `cache_delete(*keys)` | string values only (callers `json.dumps` / `json.loads`); L167-198 |
| `incr_counter(key, ttl_seconds) -> int \| None`, `get_counter(key) -> int` | TTL set on first increment; `None` = Redis unavailable; L202-232 |
| `publish(channel, payload) -> bool` | `False` = unavailable (caller falls back in-process); L241-257 |
| `health() -> dict` | live set / get probe for `/health/redis`; L292-334 |
| Client | one lazy `redis.Redis(decode_responses=True, socket_connect_timeout=2, socket_timeout=2, retry=NoBackoff/0)`; 60 s cooldown after a failed connect; L57-85 |
| `app/services/messaging_events.py` | `publish(tenant_id, user_id, envelope)`, `publish_many(...)`, `publish_tenant(tenant_id, envelope)` — best-effort push to the user's open sockets on `/api/v1/messaging/ws?token=`; envelope convention `{"type": "<domain>.<event>", …ids as strings…, "at": ISO-8601}` (`procedure_events.py`, `sms_events.py`) |

Not available [V]: distributed lock, queue / stream helper, generic rate-limit dependency, key namespacing per deployment (isolation is by `REDIS_DB` index only — "1-15" per the onboarding doc [D]), pipeline / hash helpers, cache-aside decorator.

### 4.3 Topology

| Item | Fact |
|---|---|
| Production | Memorystore at private IP `10.48.189.19:6379`, reached by Cloud Run Direct VPC egress (`--network default --subnet default --vpc-egress private-ranges-only`); deploy fails unless `/health/redis` reports `connected: true` ([V] workflow L21-31, L132-141, L161-184) |
| Local | `docker-compose.yml` → `redis:7-alpine`, persistence off |
| Settings | `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`, `REDIS_PASSWORD`, `REDIS_ENABLED` (`config.py` L103-107) |
| Tests | Redis disabled; every cache call is a miss |

---

## 5. E-mail and file storage

### 5.1 E-mail [V]

| Stack | Entry point | Transport | Body | Recipients | Attachments | Persistence | Used by |
|---|---|---|---|---|---|---|---|
| Transactional | `app/integrations/email.py` `send_email(to, subject, body) -> bool` (L181-200), never raises | Microsoft Graph `POST /users/{sender}/sendMail` (client-credentials, `GRAPH_*`) → SMTP (`SMTP_*`, STARTTLS / SSL) → log-only | plain text only (`contentType: "Text"`) | one `to` | none | none (log line) | password reset (`send_password_reset`), the office service-e-mail verification code (`office_setup_service.py` L215) |
| Patient e-mail | `POST /api/v1/email/send` → `email_service.send(db, tenant_id, user_id, payload)` → `sendgrid_client.send_mail(*, to_email, subject, body_html, body_text, from_email, from_name, custom_args)` (L65-108) | SendGrid v3 `/v3/mail/send` (`SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`); log-only when unset | HTML and / or text | one `to_email`; **requires `patient_id`**, honours `patients.no_auto_email` | none (payload has no `attachments` key) | `email_messages` row (`send_status` queued → processed → delivered / bounce …) updated by the signed event webhook `POST /api/v1/email/webhooks/sendgrid` | Messages tab; `appointnow_notification_service` calls `sendgrid_client.send_mail` directly for office / contact mail |

Further facts [V]: no template engine (Jinja2 is not a dependency; letters use their own merge-field renderer in `letter_service`); statement delivery `statement_service.deliver` only sets `delivery_status="emailed"` / `delivered_to` — "No SMTP integration is wired; record intent for a downstream mailer/worker" (L276-297); per-client sender identity and transport are chosen at onboarding (Graph / SMTP / SendGrid) [D].

### 5.2 File storage [V]

| Item | Fact | Evidence |
|---|---|---|
| Object store | Google Cloud Storage via `google-cloud-storage` (lazy import); credentials = `GCS_CREDENTIALS_PATH` key file or ADC | `app/integrations/object_storage.py` L50-67 |
| Buckets | `GCS_BUCKET_DOCUMENTS` (patient documents / consents / notes), `GCS_BUCKET_ORIGINALS` + `GCS_BUCKET_DERIVED` (DICOM); production main service sets `GCS_BUCKET_DOCUMENTS=tdg-dicom-originals`; per-client buckets `rd-<client>-documents`, `rd-<client>-imaging` [D] | `config.py` L150-203; workflow L32-41; onboarding §5 |
| Primitives | `upload_bytes(bucket, object_key, data, *, content_type, create_only=False)`, `copy_object`, `delete_object`, `stream(bucket, key) -> (iterator, content_type, size)` (1 MiB chunks), `signed_url(bucket, key, *, ttl_seconds, download_name, url_mode)` → V4 signed GET URL or `None` | `object_storage.py` L80-217 |
| Signed URLs | V4, TTL `DOCUMENT_SIGNED_URL_TTL_SECONDS` = 900 s (`IMAGING_SIGNED_URL_TTL_SECONDS` = 900 s); on Cloud Run signing uses IAM `signBlob` (runtime service account needs `serviceAccountTokenCreator` on itself); `Content-Disposition` is forced `inline; filename=…`; modes `auto / gcs / proxy` (`DOCUMENT_URL_MODE`) | `object_storage.py` L80-138; `config.py` L247-251 |
| Proxy fallback | authenticated streaming endpoint `GET /api/v1/patient-documents/{id}/content` (`StreamingResponse`, tenant re-check) | `app/api/v1/patients_extra.py` L153-174 |
| Document store | `document_store.store(*, tenant_id, patient_id, document_type, file_name, content_type, data, context)` → `StoredObject(backend, bucket, path, url)`; key `{prefix}/{tenant_id}/{patient_id}/{uuid}{ext}`; prefixes `documents/notes`, `documents/consent-forms`, `documents/general` + `GCS_CONTEXT_PREFIXES` (`imaging`, `patient_photo`, `letter`, `progress_note`, `restorative`, `treatment_plan`); unknown context is rejected; `public_url(doc)`, `open_stream(doc)`, `absolute_url(path)` | `app/services/document_store.py` L118-277 |
| `storage_backend` | column on `patient_documents` (`local` or `gcs`) + `storage_bucket`, `storage_path`; GCS upload failure falls back to local disk with an error log | `document_store.py` L151-186 |
| Local disk | `UPLOAD_DIR` (`uploads/`), `filestore.save_file / open_stream / delete_file`; not public except the three branding subdirs; **ephemeral on Cloud Run** | `app/core/filestore.py`; `BACKEND_DEPLOY_GCP.md` §9 [D] |
| Upload rules | `DOCUMENT_MAX_BYTES` = 10 MiB; allowed types PDF + images only (`validate_upload`) — applies to uploads, not to server-generated files | `config.py` L226-246 |
| URL base | `PUBLIC_API_BASE_URL` or the request origin (`request_base_url_ctx`) | `document_store.py` L127-144 |

Gap for reports [I]: there is no tenant-level (non-patient) document class. Generated report files need a new prefix / context (for example `reports/{tenant_id}/{run_id}/…`), a row to track them (`stored_objects` or a new table) and a download route; `text/csv` and XLSX are not in the upload allow-list but that list is not consulted for server-written objects.

---

## 6. PDF / Excel / CSV libraries

| Capability | Library | Declared in `requirements.txt` | Where used | Notes |
|---|---|---|---|---|
| PDF | `reportlab>=4.0` | yes | `app/services/pdf_report.py` (platypus kit), `print_service.py`, `statement_service.py`, `payment_plan_service.py`, `medical_history_service.py`, `ada_claim_pdf.py` (canvas), `lab_tracking_service.py`, `time_clock_service.py` | always imported lazily (`_rl()`); core fonts only (`Helvetica`, `Helvetica-Bold`, `Helvetica-Oblique`), no TTF registered → non-Latin-1 glyphs unsupported [I]; output via `io.BytesIO` |
| Images | `Pillow>=10`, `numpy>=1.26`, `pydicom`, `pylibjpeg(-openjpeg)` | yes | DICOM derivatives, logos / photos in PDFs | — |
| CSV | stdlib `csv` | — | `lab_tracking_service.py` L35, L591; `time_clock_service.py` L30, L1470; fee import reader | no BOM handling server-side |
| Excel read | `openpyxl` | **no** | `fee_schedule_wizard_service.py` L590 (lazy `load_workbook`; any failure, including `ImportError`, becomes 422 `import_file_unreadable`); `tests/test_fee_schedule_wizard.py` L16 imports it at module level | an image built from `requirements.txt` has no `openpyxl` → `.xlsx` import cannot work there and that test module cannot be collected [I] |
| Excel write | — | no (`openpyxl` / `xlsxwriter` absent) | — | must be added |
| HTML → PDF | — | no (`weasyprint`, `pdfkit`, `wkhtmltopdf`, headless browser absent; base image `python:3.12-slim` installs no system packages) | — | — |
| Templating | — | no (`jinja2` not declared) | — | — |
| Charts in PDFs | — | no `matplotlib`; `reportlab.graphics` ships with reportlab [I] | unused | — |
| Dataframes / warehouse | — | no `pandas`, `pyarrow`, BigQuery client | — | — |
| HTTP client | `httpx>=0.27` | yes (listed under "Dev / test" but imported at runtime by `email.py`, `sendgrid_client.py`, Stripe / Jira / RingCentral clients) | — | — |

`app/services/pdf_report.py` API [V]: `ReportHeader(title, office_name, office_address, office_phone, patient_name, patient_id, chart_no, dob, extra: list[(label, value)], logo_path, photo_path, printed_at, show_patient=True)`; `PatientReport(header, *, landscape=False)` with `section_title(title)`, `key_value_table(rows)`, `data_table(...)`, `paragraph(label, text, red=False)`, `notice(text)`, `cards(...)`, `render() -> bytes` (two-pass numbered canvas for `Page x of y`; the whole story and every page state stay in memory); formatters `cell`, `money`, `money_or_dash`, `fmt_date` (MM/DD/YYYY), `fmt_time`, `age_from_dob`. Branding: `print_service.resolve_letterhead(db, office, tenant_id)` (L200+) decides logo / name / address from `office_statement_settings` + `account_settings.logo_url`. Office-wide precedent: `lab_tracking_service._office_header` (L598-613) builds `ReportHeader(..., show_patient=False)` with name "All offices" when no office is given.

---

## 7. Audit logging

### 7.1 Model [V] `app/db/models/audit.py` L17-47 (table `audit_logs`, Alembic `a1b2c3d4e5f6`)

| Column | Type | Index |
|---|---|---|
| `id` | BIGINT (INTEGER on SQLite) PK | pk |
| `tenant_id`, `user_id` | INTEGER | `ix_audit_logs_tenant_id`, `ix_audit_logs_user_id` |
| `action` | VARCHAR(20) | — |
| `resource_type` | VARCHAR(100) | `ix_audit_logs_resource_type`, `ix_audit_logs_resource (resource_type, resource_id)` |
| `resource_id` | VARCHAR(100) | (composite above) |
| `patient_id`, `office_id` | INTEGER | `ix_audit_logs_patient_id`, `ix_audit_logs_office_id` |
| `method` VARCHAR(10), `path` VARCHAR(500), `status_code`, `ip_address` VARCHAR(64), `request_id` VARCHAR(64) | — | — |
| `details` | JSON | — |
| `created_at` | TIMESTAMP default `now()` | `ix_audit_logs_created_at` |

No composite `(tenant_id, created_at)` or `(tenant_id, action, created_at)` index [V] `schema.sql`.

### 7.2 Writers [V]

| Writer | Trigger | Row content |
|---|---|---|
| `AuditMiddleware` → `audit_service.write_audit(...)` (`app/services/audit_service.py` L22-61) | every 2xx `POST / PUT / PATCH / DELETE` with a decoded token | `action = method`; `resource_type` / `resource_id` = first two path segments after `/api/v1` (or the id read back from a 201 JSON body); `patient_id` from audit context, body or `/patients/{id}/` path; `office_id` from validated `X-Office-ID`, row or body; `details = {patient_id, row_id, before, after, scope, changes}` recorded by the CRUD engine through `app/core/audit_context.py` (`record(**fields)`, `diff_fields`, values truncated to 500 chars, `REDACTED_FIELDS`) |
| `print_service.record_print(db, *, tenant_id, user_id, patient_id, report, path, params, resource_type="patient_report")` (`app/services/print_service.py` L320-340) | called explicitly by report handlers after rendering | `action="PRINT"`, `method="GET"`, `status_code=200`, `resource_type` ∈ `patient_report`, `claim_report`, `lab_report`, `time_clock_report`; `resource_id = report` name; `details = {"report": …, "params": {k: str(v)}}`; `ip_address` from `client_ip_ctx`, `request_id` from `request_id_ctx`; commits on the request session; exception-safe. **Does not set `office_id`** |
| `audit_service.write_audit` direct | imaging binary reads when `IMAGING_AUDIT_READS=True` (`app/api/v1/imaging.py` L155-164) | `action="GET"`, `resource_type="dicom_instance"`, `user_id=None` |
| Domain logs (separate tables) | medical-history change log, `signature_audit_events`, `time_clock_entry_edits` | not `audit_logs` |

Call sites of `record_print`: `app/api/v1/patient_reports.py` L45, `claim_forms.py` L63, `lab_tracking.py` L88, `time_clock.py` L399 [V]. The five `/reports/*` JSON roll-ups, `/dashboard/summary`, `/offices/{id}/…` dashboards and `/transactions` write no audit row [V].

### 7.3 Read API [V] `app/api/v1/audit.py`

| Endpoint | Guard | Filters |
|---|---|---|
| `GET /api/v1/audit-logs` (`list_audit_logs`) | `require_roles("admin")` | `user_id`, `resource_type`, `resource_id`, `patient_id`, `office_id`; sort `created_at` / `id`; paged (`size ≤ 200`) |
| `GET /api/v1/patients/{patient_id}/audit-logs` (`list_patient_audit_logs`) | any authenticated user of the tenant | `resource_type`, `resource_id`, `user_id`, `office_id` |

Missing for a "who exported what" trail [V]: no `action` filter, no `created_at` range filter, no export of the log itself.

---

## 8. Deployment topology and limits

| Item | Fact | Evidence |
|---|---|---|
| Runtime | Cloud Run service `dentc-backend`, project `reckon-dental`, region `us-central1`, `--allow-unauthenticated` (app does its own JWT auth; public booking + webhooks) | [V] workflow L14-17; [D] onboarding §9 |
| Image | `python:3.12-slim`; `pip install -r requirements.txt`; `COPY . .`; no system packages | [V] `Dockerfile` |
| Process | `gunicorn app.main:app -k uvicorn.workers.UvicornWorker --workers ${GUNICORN_WORKERS:-2} --timeout 120 --forwarded-allow-ips="*"` (the Docker CMD does **not** load `gunicorn_config.py`, so its `max_requests=1000`, `preload_app`, `workers = cpu*2+1` apply only to the PM2 path) | [V] `Dockerfile` L24-31; `gunicorn_config.py` |
| Service shape | first-deploy runbook flags `--cpu 2 --memory 2Gi --min-instances 1 --max-instances 10 --timeout 120`; the CI deploy sets none of them (retained from the service); concurrency and CPU-allocation mode are not stated | [D] `docs/deployment/BACKEND_DEPLOY_GCP.md` §5; [V] workflow L132-141 |
| Database | Cloud SQL PostgreSQL 15.18, instance `reckon-dental:us-east1:recon-dental-db`, main DB `recondental_migrated`; unix socket from Cloud Run; `DATABASE_URL` from Secret Manager | [V] workflow L18-20; `schema.sql` header |
| Redis | Memorystore `10.48.189.19:6379`, basic tier, no AUTH, Direct VPC egress | [V] workflow L21-31 |
| Multi-client | each client: own DB (`<client>_db`, own DB user), own buckets, own secrets (`<client>-JWT_SECRET_KEY`, `<client>-ENCRYPTION_KEY`, …), own Cloud Run service `dentc-backend-<client>`, own service account, own `REDIS_DB` index; shared Cloud SQL instance, Memorystore, VPC; same image | [D] `docs/onboarding/NEW_CLIENT_DATABASE.md` §0-§9, §13 |
| CI / CD | push to `feature/phase_data_migration` or `feature/uat-realse` → build → `alembic upgrade head` (inside the new image, via Cloud SQL Auth Proxy) → `gcloud run deploy` → `update-traffic --to-latest` → `/health/redis` gate. No lint / test step. Only the main DB / service; other clients are migrated and deployed by hand | [V] workflow; [D] onboarding §14 |
| Alternate path | PM2 `ecosystem.config.js` running gunicorn with `gunicorn_config.py` on a VM path — leftover of an earlier deployment [I] | [V] `ecosystem.config.js` |
| Secrets / config | env only (`pydantic-settings`, `extra="ignore"`); kill-switch convention `*_ENFORCED` | [V] `config.py` L21-27 |
| Observability | stdout logs (text or JSON via `LOG_JSON`) with `request_id`, `user_id`, `tenant_id`; `X-Process-Time`; slow-request WARNING > 1 s; no metrics, tracing or error-tracking library | [V] `app/core/logging.py`; `requirements.txt` |

Limits that bound a synchronous report or export:

| Limit | Value | Kind |
|---|---|---|
| Single SQL statement | 30 s | [V] |
| Idle inside an open transaction | 60 s | [V] |
| Pool wait | 30 s for a connection when 30 are busy in that worker | [V] |
| gunicorn worker timeout | 120 s | [V] |
| Cloud Run request timeout | 120 s | [D] |
| Instance memory | 2 GiB shared by 2 worker processes | [D] |
| Response assembly | whole PDF / CSV in memory; no streaming in any report endpoint | [V] |
| Non-streamed HTTP/1 response size on Cloud Run | 32 MiB platform cap | [I] (platform knowledge, not in repo) |
| List page size | `size ≤ 200` (`PageParams`); ledger feeds `MAX_FEED_SIZE = 5000` (`app/api/v1/ledger.py` L21) | [V] |
| Client | frontend axios instance has no timeout; access token lives 60 min | [V] sibling FE analysis; `config.py` L55 |

---

## 9. Performance facts

### 9.1 Documented volumes (migrated main tenant) [D]

| Table / entity | Rows | Source |
|---|---|---|
| `patients` | ≈83,900 (83,924 / 83,898 / 83,861 in three docs) | `docs/patients/patient_search_backend_response.md` L20, L29; `docs/scheduler/add_edit_appointment_backend_response.md` L262 |
| `patient_procedures` | 1,372,574 migrated rows | `CLAUDE.md` L1098 |
| `patient_payments` | "1.33M payments"; 185,885 rows stored negative (context of the two figures differs — verify with a count before sizing) | `CLAUDE.md` L1095, L1041 |
| Denticon `LEDGER` export | 2.79 M rows | `CLAUDE.md` L1076 |
| `insurance_claims` | 96,314 (79,038 with non-zero `total_paid`) | `CLAUDE.md` L944 |
| `insurance_coverage_rules` | 876,732 | `CLAUDE.md` L521 |
| `insurance_plans` | ≈31,334 | `CLAUDE.md` L921 |
| `patient_insurance` | ≈55,118 | `docs/patient-insurance/edit_insurance_plan_backend_response.md` L158 |
| `ledger_insurance_details` | 12,191 (216 attached to a claim) | `CLAUDE.md` L945 |
| `payment_allocations` | 6,951, every amount `0.0000` — the payment → procedure link was never exported | `CLAUDE.md` L1095 |
| Offices | 15; one office returned 7,781 patients | `docs/pricing/pricing_hierarchy_architecture.md` L37; `docs/patients/patients_audit.md` L50 |
| `appointments`, `treatment_plan_items`, `patient_recalls`, `referrals`, `audit_logs` | not documented anywhere in the repo | — |

### 9.2 Indexes on reporting-critical tables [V] `schema.sql`

| Table | Indexes present | Not indexed (typical report predicates / group keys) |
|---|---|---|
| `patient_procedures` | `(claim_id)`, `(legacy_id)`, `(patient_id, date_of_service)` **twice** (`idx_proc_patient_dos`, `ix_patient_procedures_patient_dos`), `(is_void)`, `(treatment_plan_item_id)` | `date_of_service` alone, `office_id`, `provider_id`, `hygienist_id`, `procedure_code`, `created_at`, `created_by` |
| `patient_payments` | `(legacy_id)`, `(patient_id, payment_date)` **twice** | `payment_date` alone, `office_id`, `created_office_id`, `provider_id`, `payment_type`, `created_at` |
| `patient_adjustments` | `(patient_id)`, `(procedure_id)`, `(tenant_id)` | `adjustment_date`, `office_id`, `provider_id` |
| `insurance_claims` | `(legacy_id)`, `(patient_id, status)`, `(ins_plan_id)`, unique `claim_number` | `office_id`, `carrier_id`, `status` alone, any claim date |
| `ledger_insurance_details` | `(legacy_ledger_id)`, `(procedure_id)`, `(claim_id, is_void)` | `office_id`, dates |
| `payment_allocations` | `(patient_id)`, `(payment_id)`, `(procedure_id)` ×2, `(adjustment_id)` | — |
| `appointments` | `(date, office_id)`, `(provider_id, date)`, `(operatory_id, date)`, `(patient_id, date)`, `(status)`, `(is_archived)`, `(legacy_id)`, `(lab_vendor_id)`, `(office_id, has_lab)` | `created_at`, `campaign_id` |
| `appointment_procedures` | `(appointment_id)`, `(treatment_plan_item_id)` | — |
| `patients` | `(tenant_id)`, `(home_office_id)`, `(last_name, first_name)`, `(legacy_id)` (+ unique twin) | `created_at`, `(tenant_id, is_active)` |
| `treatment_plans` / `treatment_plan_items` | `(patient_id)`, `(legacy_id)` / `(plan_id)` | status, dates, `provider_id` |
| `patient_recalls` | `(due_date, status)`, `(patient_id)` | `office_id` |
| `referrals` | none besides the PK | — |
| `audit_logs` | 7 single / composite indexes (§7.1) | `(tenant_id, created_at)` |

Index-related Alembic revisions [V]: baseline `72d534c666ec`; `587baa6a0ba7` (`ix_appointments_office_has_lab`, `ix_appointments_lab_vendor_id`); `7f483f6833a7` L55-60 (`ix_insurance_claims_ins_plan_id`, `ix_patient_insurance_ins_plan_id`, `ix_tp_insurance_details_ins_plan_id`, `ix_audit_logs_resource`, each guarded by an inspector "exists" check); `1745e318c65a` (`ix_time_clock_entries_tenant_clock_in` + partial unique open shift); `e4f5a6b7c8d9` (`ix_insurance_plans_tenant_group_number`); `e1f2a3b4c5d6` L194-199 (`ix_patient_procedures_patient_dos`, `ix_patient_payments_patient_date` — duplicates of the pre-existing `idx_proc_patient_dos` / `idx_payment_patient_date`). Alembic wraps a migration in a transaction (`context.begin_transaction()`, `alembic/env.py` L49-50), so `CREATE INDEX CONCURRENTLY` needs an explicit autocommit block [I].

### 9.3 Known slow paths and patterns that will not scale

| Path | Fact | Evidence |
|---|---|---|
| `GET /patients/{id}/balance` | 23.5 s cold / 0.6 s warm before the PP-5 rewrite (6 statements → 2); `letter-context?include_balance` ≈28 s cold | [D] `docs/payment-plans/payment_plans_backend_devreport.md` L66; `CLAUDE.md` L591 |
| Claims count by plan | 3.9 s — sequential scan over 96,327 rows until the `ins_plan_id` index | [D] `edit_insurance_plan_backend_response.md` L70, L157 |
| `report_service` roll-ups (`_production`, `_collections`, `_ar_components`, `get_aging`, `get_trends`) | join `patients` + filter on `date_of_service` / `payment_date` / `office_id` with no supporting index; AR and aging are all-time sums; `get_summary` issues 9 statements (6 window / point-in-time counts and sums + the 3 AR statements) | [V] `report_service.py` L66-312; §9.2 |
| `transactions_service.office_financial_summary` | 5 aggregate statements + 4 per-patient `GROUP BY` statements, all filtered by `office_id` (unindexed on procedures / payments / adjustments), merged in Python; `/dashboard/summary` calls it plus `collections_summary` once per target office (15 offices for a tenant-wide caller) with no cache | [V] `transactions_service.py` L85-178; `app/api/v1/dashboard.py` L93-102 |
| `transactions_service.transaction_feed` | loads every patient id of the tenant into a Python set, composes rows in memory | [V] L330-335 |
| Statement batch | per-patient balance computation in a loop inside one request | [V] `statement_service.py` L212-231 |
| Async upload handlers | nine `async def` handlers once ran sync DB + GCS work on the event loop and stalled every other request; fixed with `run_in_threadpool` | [D] `CLAUDE.md` L916-920 |
| Audit write | `write_audit` (sync DB insert, own connection) runs on the event loop inside `AuditMiddleware.dispatch` for every mutation | [V] `audit.py` L65 |
| Redis down | first request after each 60 s cooldown pays a 2 s connect timeout | [V] `redis_store.py` L22-37 |

---

## 10. Conventions for adding a module

| Area | Convention | Evidence |
|---|---|---|
| Layout | `app/api/v1/<module>.py` (routers) · `app/services/<module>_service.py` (logic; functions take `(db, tenant_id, …)`) · `app/schemas/<module>.py` (Pydantic v2) · `app/db/models/<domain>.py` (`Mapped[]`, mixins `IntPKMixin`, `TimestampMixin`, `CreatedAtMixin`, `TenantMixin`, `LegacyIdMixin`) · `tests/test_<module>.py` | [V] tree; `app/db/base.py` |
| Router registration | add `include_router` lines in `app/api/router.py`; literal paths must be mounted **before** `build_entity_router()` so they win over generic `/{item_id}` | [V] `router.py` L60-246 |
| Plain CRUD resource | one `_cfg(model, "Name", "url-prefix", "Tag", "singular", "plural", search=…, filters=…, ranges=…, office_scope=…, *_permissions=…)` row in `app/api/v1/registry.py` (≈97 entities); schemas generated by `build_schemas()`; `{field}_from` / `{field}_to` range params; typed OpenAPI filter params built with a dynamic `inspect.Signature` | [V] `registry.py`; `router_factory.py` L136-288 |
| `operation_id` | explicit, unique, snake_case: `list_{plural}`, `create_{singular}`, `get_{singular}`, `update_{singular}`, `delete_{singular}`; hand-written e.g. `get_report_summary`, `get_time_clock_report_csv`. A duplicate aborts start-up | [V] `router_factory.py` L352-482; `main.py` L178-183 |
| Tags | one domain tag per router → one generated Orval file per tag (`Reports` tag exists with 6 operations: `/reports/*` ×5 + `/dashboard/summary`; time-clock reports are tagged `Staff`) | [V] `reports.py` L28; `dashboard.py` L32; `time_clock.py` L51 |
| Naming | snake_case for every field, query param and JSON key; no `alias` / `by_alias`; ids of UUID-keyed resources serialise as strings | [V] `CLAUDE.md` L42-45 |
| Responses | list = `PaginatedResponse[T]` = `{items, meta: {page, size, total, pages}}`; named components; datetimes with offset (`UtcDatetime`); binary = `response_class=Response` + `responses={200: {"content": {"application/pdf": {}}}}` and `Content-Disposition` | [V] `app/schemas/common.py`; `patient_reports.py` L33-41 |
| Errors | `{"error": {"code", "message", "details"}}`; raise `NotFoundError` 404, `ConflictError` 409, `ValidationError` 422, `ForbiddenError` 403, `UnauthorizedError` 401, `LockedError` 423, `RateLimitError` 429, `PreconditionFailedError` 412 with a domain `code` (`office_not_assigned`, `permission_denied`, `invalid_date_range`, `range_too_large`, `batch_too_large`, …); declare `responses={4xx: {"model": ErrorResponse}}` | [V] `app/core/exceptions.py` |
| Published rules | server publishes vocabularies / limits as data: `GET /metadata/*-rules`, `GET /patient-documents/limits`, `GET /definitions?group_code=` | [V] `CLAUDE.md`; `app/api/v1/lab_tracking.py`, `patients_extra.py` |
| Flags | new behaviour behind a `Settings` field (kill-switch style) | [V] `config.py` |
| Migrations | `python -c "from alembic.config import main; main(['revision','--autogenerate','-m','<msg>'])"`, then hand-edit; additive / nullable; long explanatory docstring; data fixes via `op.execute`; naming convention `ix_/uq_/ck_/fk_/pk_` (`app/db/base.py` L15-21); 84 revisions, single head `9435491c1d19`; never run on app start-up; do not build a fresh DB with `upgrade head` (copy schema + stamp) | [V] `alembic/`; [D] onboarding §1.3 |
| Seeds | `python -m scripts.seed_*` per tenant, idempotent, usually `--tenant N` (+ `--apply` / dry-run default) | [V] `scripts/` |
| Lint | `ruff`, line length 100, rules `E, F, I, B, UP, ANN, S` — the `S` (bandit) set flags string-built SQL | [V] `pyproject.toml` |
| OpenAPI for Orval | `python -m scripts.export_openapi` writes `./openapi.json`; the frontend's `npm run api:sync` pulls `/api/v1/openapi.json` from a running backend | [V] `scripts/export_openapi.py` |
| Docs | per module: frontend gap report `docs/<module>/<x>_backend_devreport.md` with ids (`RPT-n`) + backend `…_backend_response.md`; a section appended to `CLAUDE.md` | [V] `docs/`, `CLAUDE.md` |
| One trap | `app/crud/router_factory.py` must not use `from __future__ import annotations` | [V] L8-10 |

---

## 11. Report-engine capability matrix (what exists / what is missing)

| Capability needed | Exists today | Reuse | Missing |
|---|---|---|---|
| Definition registry | `CrudConfig` registry + dynamic typed-signature technique; `/metadata/*-rules` publishing pattern; `/definitions?group_code=` vocabularies | same pattern for a declarative report catalog exposed as data | report definition model, parameter schema, catalog endpoint, saved-definition tables |
| Parameterised SQL execution | SQLAlchemy Core everywhere; `ledger_sign` SQL expressions; office-set resolver; `ruff S` discourages string SQL | build statements with Core + bound params; resolve tenant + office set once | executor with per-run timeout policy, row caps, Postgres-only path + SQLite-portable path (or a Postgres test tier), supporting indexes / summary tables |
| Tenant + office + rights enforcement | `TenantId`, `OfficeScopeDep`, `resolve_list_office_filter(reports=True)`, `require_permission`, `require_read_access` | all of it | wiring on the existing roll-ups; report right codes; provider-level restriction (`users.report_access_provider_id` is unenforced) |
| Async runs | `utility_runs`, `letter_batch_runs/items` shapes; `GET /utilities/jobs/{job_id}` polling contract | table + polling contract | the executor itself (worker / job runner), retries, cancellation, concurrency limits, per-client provisioning |
| Progress / completion signal | `notifications` inbox + API; WebSocket push `messaging_events.publish` | both | producers |
| Exports | reportlab kit; stdlib CSV; `Response` bytes | PDF layout kit, letterhead resolver | XLSX writer dependency, streaming for large outputs, `Content-Disposition` in CORS `expose_headers` |
| Artifact storage | GCS helpers, signed URLs, proxy streaming, `stored_objects` | primitives | non-patient key layout, artifact table, retention / deletion job |
| Schedules | 4 cron-style scripts + documented Cloud Scheduler intent | script entry-point pattern | schedule tables + API, scheduler binding per client, "run as" identity for office scope and rights at run time |
| E-mail delivery | Graph / SMTP / SendGrid senders | transports | attachments or signed-link mails, HTML templates, recipient lists, delivery log not tied to `patient_id` |
| Caching | Redis TTL cache helpers | helpers | key that includes the resolved office set and caller scope, invalidation strategy |
| Audit | `audit_logs`, `record_print`, automatic mutation audit | both | `office_id` + row counts / format on export rows, `action` + date filters on the read API |
| Saved views / favourites | `user_preferences` blob | per-user favourites | shareable saved reports (tenant / office / group visibility) |
| AI-assisted insights | none (no LLM client dependency or setting; `account_settings.ai_assist_*` are legacy stored credentials) | — | everything |
| Cross-organisation benchmarking | impossible in-database: one DB per client | — | a central store or an opt-in aggregate export |

---

## 12. Gaps and risks

| # | Gap / risk | Kind |
|---|---|---|
| R1 | No job runner; synchronous work is bounded by 30 s per statement, 60 s idle-in-transaction and a 120 s request | [V] / [D] |
| R2 | All-time and date-range aggregates over ≈1.3-1.4 M-row tables have no supporting index and no pre-aggregation; adding indexes on production runs inside the auto-deploy migration step | [V] |
| R3 | Existing aggregate endpoints skip office-scope validation and have no rights guard; copying their pattern leaks cross-office figures | [V] |
| R4 | Fact tables lack `tenant_id`; the generic CRUD list path does not tenant-filter them. Latent while each client has its own DB, real if two tenants ever share one | [V] / [I] |
| R5 | SQLite-only test suite and no CI tests: Postgres-specific report SQL would ship untested | [V] |
| R6 | No Excel writer declared; `openpyxl` is used but undeclared (the built image cannot import it) | [V] / [I] |
| R7 | E-mail cannot carry a report (no attachments, no templates, patient-bound log); sending PHI as an attachment also needs a policy decision | [V] |
| R8 | Storage layer is patient-keyed; local fallback is ephemeral; no retention job for generated files | [V] |
| R9 | Report reads are unaudited unless the handler calls `record_print`; PRINT rows carry no `office_id`; the audit read API cannot filter by action or date | [V] |
| R10 | Per-client topology multiplies every new infrastructure piece (worker, scheduler, bucket prefix, Redis DB, migration run); CI automates only the main client | [D] |
| R11 | Timestamps are naive UTC and report "today" differs by module (UTC vs office-local); created-date reports need per-office conversion | [V] |
| R12 | `payment_allocations` is empty of amounts for migrated data, so collections cannot be attributed to a procedure / producing provider from allocations | [D] |
| R13 | Report cache keys ignore the caller's office scope and are never invalidated; reusing them after adding office scoping would serve one user's scope to another | [V] / [I] |
| R14 | Unpinned dependencies (`>=`) make image builds non-reproducible; streaming behaviour of yield-dependencies varies by FastAPI version | [V] / [I] |
| R15 | Shared Cloud SQL instance and connection budget across all clients; a heavy report competes with chairside traffic on the same primary (no replica) | [V] / [I] |

---

## 13. Open questions

1. What are the live Cloud Run settings of `dentc-backend` (CPU, memory, request timeout, concurrency, min / max instances, CPU always-allocated)? Only the first-deploy runbook states them.
2. Are the Cloud Scheduler jobs for the four cron scripts actually provisioned, and how do they invoke the script (Cloud Run Job vs HTTP)? Nothing in the repo defines it.
3. How many client deployments exist or are planned, and is cross-organisation benchmarking in scope given one database per client?
4. Is a worker tier (Cloud Run Job / Cloud Tasks / separate service) acceptable, and may it be provisioned per client?
5. May the report engine rely on Postgres-only SQL and objects (materialized views, `date_trunc`, window functions), and will a Postgres-backed test tier and a CI test job be added?
6. Is a read replica or a larger Cloud SQL tier available for analytics, and what is the instance's `max_connections`?
7. Delivery policy for scheduled reports: attachment vs signed link, which transport (Graph or SendGrid), retention period of generated files.
8. Rights model: reuse the kept legacy `reports_*_screen_view_only / _full_control` codes and re-add the deleted families (Recall, Ortho, Labels, Postcards, Excel, Batch Schedule), or define new codes? Should `users.report_access_provider_id` restrict report data as in the legacy tool?
9. Which definition of "today" / day boundary should financial reports use (office-local vs UTC), and should "created date" be converted per office?
10. Is it acceptable to add reporting indexes and summary tables to production through the automatic `alembic upgrade head` deploy step, or must large index builds run out-of-band?
