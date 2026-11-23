# 03 — Reporting data foundation

Owns (per `00_design_brief.md` §7): the `rpt_*` datasets and roll-ups, money and status normalisation, date and
attribution rules, data repairs, schema additions, indexes and reconciliation tests. Does not define engine internals
(`02_architecture.md`), parameter types (`04_filter_framework.md`), metric formulas (`05_metric_catalog.md`) or rights and
data classes (`08_security_compliance.md`).

Static work only: code and documents were read, nothing was executed. Snapshot: `dentc-backend` branch
`feature/uat-realse` @ `9183df0`, `dentc-frontend` branch `feature/uat-realse-v5`. Backend paths are relative to
`dentc-backend/`; `FE:` = `dentc-frontend/`. The models live in `app/db/models/*.py` (172 tables), not `app/models/`.

**Reading order.** Sections follow the order requested for this document. Section 2 (datasets, with SQL) is about
60 % of the text; the legacy coverage matrix and the reference-dashboard trace are section 11 and the work items are
section 12, near the end — search for `## 11.` and `## 12.`.

**Tags** — **[V]** read by the author of this document in the cited file · **[A]** verified in the cited analysis
document, not re-read · **[D]** a number quoted from a code comment or backend doc, never re-measured · **[I]** inference ·
**NEW** does not exist yet. Phase ids, AD-* and PD-* refer to the brief. Work items are `DATA-nn` (section 12).

Verified for this document [V]: every table and column named below against `app/db/models/*.py` (AST dump of all 172
models); `denticon_migration/migration/steps/s10`, `s26`, `s28`, `s29`, `s30`, `s32`, `s33`, `s52` and
`utils/parsers.py`; `app/services/ledger_sign.py`, `balance_service.py` L40-285, `provider_directory_service.py` L36-116,
`treatment_service.py` L296-345 and L900-930, `scheduler_service.py` L48-64; `family_account_service.py` L612-634,
L696-739 and L862-864 (guarantor move, balance transfer, merge); `app/db/models/accounts.py` L408-425 (account stamp on
insert); `billing_service.py` L56-135 (allocation guard), L221-270 (`_sum_coverage`, `_recompute_claim_totals`) and
L365-442 (remittance posting); `refund_service.py` L197-232 (`reverse_payment`); `payment_plan_service.py` L326-355;
`office_setup_service.py` L311-337 (`SMART_ASSIST_CATALOG`); `statement_service.py` L98-130; `scripts/backfill_ledger_source_fields.py`,
`import_legacy_responsible_parties.py`, `normalize_provider_roles.py`, `seed_payment_plan_codes.py`; `alembic/env.py`;
`app/db/session.py`; `.github/workflows/deploy-cloud-run.yml`; index names in `schema.sql`;
`FE:src/features/transactions/transactionCodes.ts` (18 payment + 46 adjustment codes), `AdjustmentsTab.tsx` L125-175,
`FE:src/components/patient/insurancePayment.ts` L262-280 and `InsurancePaymentModal.tsx` L262-345; `legacy/*.json` through a
compact outline; the cited sections of `research/legacy_report_outputs_*.md` and `research/compliance_and_financial_semantics.md`.

---

## 1. Principles

| # | Principle | Consequence for implementers |
|---|---|---|
| P-1 | **One canonical layer.** Reports, dashboards, statements and the on-screen balance read `rpt_*` objects (AD-3, AD-10, PD-2). No service re-derives a money or status predicate. | The six balance formulas (`analysis/be_existing_reporting.md` §2.4) are replaced by `rpt_ledger_entries` (DATA-07). |
| P-2 | **Two eras, one shape.** Every fact row carries `era` = `migrated` (loaded from Denticon; test = `legacy_id IS NOT NULL` on the source row) or `app`. Columns that cannot be known for an era are NULL, never 0 or a default. | Each dataset has an "Era caveats" line. The engine prints the caveat when a run touches `migrated` rows. |
| P-3 | **One sign.** `amount` is the signed effect on accounts receivable: debit positive (charge, debit adjustment, refund, opening balance), credit negative (payment, credit adjustment, write-off). `debit` and `credit` are the two non-negative halves. | Balance of any scope = `SUM(amount)`. Section 3.1 gives the rule per stored column. |
| P-4 | **Dates are named by basis.** `service_date`, `transaction_date`, `payment_date`, `created_date`, `deposit_date`, `appointment_date` (AD-9). A dataset never exposes a column called `date`. | `date_basis` (owned by `04_filter_framework.md`) selects a column; section 4 says which bases exist per fact and era. Every ledger leg also has `service_date_effective`, so a service-basis total never drops a leg. |
| P-5 | **Attribution is named by role.** `office_id` (the row's own office), `posting_office_id`, `home_office_id`; `provider_id` (treating / credited), `hygienist_id`, `billing_provider_id`, `appointment_provider_id`; `account_id` (the patient's current guarantor account — the one A/R unit of every leg) and `posted_account_id` (the account at posting). | Section 5. A report definition declares one attribution; the dataset offers all. |
| P-6 | **Classify by catalog, never by name.** Sign, side (production / collection), class and tender of a payment or adjustment come from the server-side `transaction_codes` table (NEW, DATA-03), versioned. The class decides the analytic bucket; the legacy Sub Type decides the legacy report column. | No report branches on a code string. Rows whose code is unknown are `unclassified` and are reported, not hidden. |
| P-7 | **Tenant first.** `tenant_id` is the first column of every dataset and the first predicate of every query; fact tables without the column are scoped through `patients` or `offices` until DATA-15 denormalises it. | Guards against the latent cross-tenant read (`analysis/be_platform.md` key findings). |
| P-8 | **Live by default.** `<dataset>` returns live rows; `<dataset>_all` adds voided / deleted / archive rows with flags, for audit reports only. | A consumer cannot forget the void filter. |
| P-9 | **Stable contract across step A and step B.** Step A objects are views and SQL functions; step B replaces hot ones with tables of the same name and columns (AD-3). | Report definitions do not change when a view becomes a table. |
| P-10 | **Exact money.** `numeric(14,2)` end to end; no `float` (`analysis/be_data_financial.md` §4.8 #23). | |
| P-11 | **Unknown is visible.** Every dimension has an explicit unassigned member (NULL office, NULL provider, `Unallocated`, `unclassified`), so parts always sum to the total. | Reconciliation invariants in section 10. |
| P-12 | **Data readiness is measured, not assumed.** The state of each migrated-data repair differs per client database and is unknown from the repository. | Section 6 check queries run as a job that writes `rpt_data_quality` (DATA-02); availability of bases and reports reads that table. |
| P-13 | **A join never multiplies money.** Dimension and catalog lookups are on a unique key or through `LATERAL ... LIMIT 1`; group membership is an `EXISTS`. | R-01 checks `count(*) = count(DISTINCT entry_id)`; section 6 #38 lists the duplicate keys. |
| P-14 | **Internal consistency is not correctness.** The layer is also reconciled with figures taken from the legacy system itself. | R-21 and the control totals of section 6; financial reports on migrated periods are gated on it. |

**Unknowable for migrated history unless a repair or re-export says otherwise** (sources: the six `analysis/be_data_*.md`):

| Area | Not recoverable from the current database | Recoverable by |
|---|---|---|
| Money | payment / adjustment code, production-vs-collection side, card brand, carrier / claim of an insurance payment, transaction date of a charge that has a service date, payment-to-procedure allocation (export has 6,951 rows, all amount 0 [D]), deposit grouping, void date / user | DATA-12 re-read of `LEDGER` (codes, `TRANDATE`); allocations only as derived oldest-first |
| Ledger completeness | 87,585 source charges (6 %) were skipped at load (code not in the catalog, unknown provider, no date [V] `s28` L78-95) while every payment and adjustment of the same patients was loaded [V] `s29` L59-66: balances are too low, phantom credit balances exist, and derived allocation spends those credits on other charges | DATA-57: seed the missing codes and re-run the charge step (idempotent, `ON CONFLICT (id) DO NOTHING` [V] `s28` L64-66); legacy control totals (R-21) prove the result |
| Created date / user | `created_at` = migration timestamp unless restored; 2.23M of 2.79M ledger rows name a login with no `users` row [D] | DATA-10 (`--restore-created-at`, `created_by_legacy`) |
| Appointments | created date and user, confirmation / check-in / check-out stamps, new-patient flag, cancellation reason, reschedules, scheduled production (10,125 lines for 176,453 appointments [D]) | not recoverable (DATA-50 asks whether a re-export carries them) |
| Claims | service dates, estimate, providers, close date, reliable plan id; status history; denial data | DATA-10 (`claim_id` backfill gives lines), DATA-32 |
| Patients | real creation date, first / last visit (derive from charges), preferred provider / hygienist, language, inactivation date | DATA-19 (derive), DATA-50 |
| Clinical | treatment-plan dates and history (674 derived plans [D]), recalls (0 rows), ortho contracts (0 rows), note author and signature | derive recall due dates (DATA-41); the rest is app-era only |

---

## 2. Canonical datasets (`rpt_*`)

### 2.0 Conventions and index

| Convention | Rule |
|---|---|
| Object kinds | **view** (default, step A) · **function** `rpt_x(p_tenant_id, ...)` returning a table, used where a predicate must be applied inside the query (as-of dates, FIFO, full outer joins) · **table** (step B roll-ups and snapshots, section 9) |
| Location | PostgreSQL schema `public`, prefix `rpt_` (brief §4). SQL text lives in `app/reporting/sql/<object>.sql` (NEW) and is applied by Alembic revisions through one helper that drops and recreates dependants in order (DATA-01). PostgreSQL-only: the SQLite test database never sees these objects (needs the Postgres test tier owned by `02_architecture.md`). |
| Common columns | `tenant_id int` first; `era text`; keys keep the OLTP type (`patient_id int`, `provider_id varchar(50)`, `office_id int`, ids of charges / payments / claims / appointments `varchar(50)`) |
| Live filter | `x` = `SELECT * FROM x_all WHERE NOT is_void AND (NOT is_archived OR include_legacy_archive)`; the policy flag is per tenant (`rpt_tenant_flags`, section 3.6) |
| Created date | app rows: `(created_at AT TIME ZONE 'UTC' AT TIME ZONE office.timezone)::date`; migrated rows: `created_at::date` as stored (legacy wall clock, not UTC — [I], section 4.3). After DATA-13 both read the stored `posting_date`. Written `<created_date>` in the sketches. |
| Entry ids | `<leg>:<source pk>[:<tier or bucket>]`, stable across runs, used for drill-down and allocations |
| Naming | snake_case; booleans `is_*` / `has_*`; money `*_amount` or the business name (`charged_fee`, `office_fee`) |

| Dataset | Kind | Grain | Phase | Work item |
|---|---|---|---|---|
| `rpt_dates` | table | calendar day | P0 | DATA-05 |
| `rpt_office_dim`, `rpt_provider_dim`, `rpt_user_dim`, `rpt_patient_dim`, `rpt_account_dim` | view | one per entity | P0 | DATA-05 |
| `rpt_procedure_code_dim`, `rpt_code_groups`, `rpt_code_group_members`, `rpt_code_in_group()` | view, tables, function | code; group membership | P0 | DATA-04 |
| `rpt_transaction_code_dim` | view | payment / adjustment code version | P0 | DATA-03 |
| `rpt_charges`, `rpt_payments`, `rpt_adjustments`, `rpt_remittance_lines` | view | money leg | P0 | DATA-06 |
| `rpt_ledger_entries` (+ `_all`) | view | money leg, all kinds | P0 | DATA-06 |
| `rpt_appointment_facts`, `rpt_appointment_procedures` | view | appointment; booked line | P1 | DATA-16 |
| `rpt_visits`, `rpt_provider_visits`, `rpt_visit_audit()`, `rpt_appointment_note_audit()`, `rpt_progress_note_facts` | view, view, function, function, view | patient-office-day; patient-office-provider-day; appointment; note | P1 | DATA-18 |
| `rpt_patient_activity` | view (table in P4) | patient | P1 | DATA-19 |
| `rpt_explicit_allocations`, `rpt_fifo_core()`, `rpt_fifo_allocations()`, `rpt_payment_allocations` | view, function, function, view over a table | credit leg x debit leg | P1 / P2 | DATA-20, DATA-26 |
| `rpt_ar_open_items()`, `rpt_aging_bucket_sets` | function, table | open debit leg / unallocated credit as of a date, per allocation unit | P1 / P2 | DATA-20, DATA-27 |
| `rpt_claim_facts`, `rpt_claim_lines`, `rpt_unclaimed_charge_tiers`, `rpt_insurance_coverage` | view | claim; claim line; charge x coverage tier without a claim; coverage slot | P1 | DATA-21 |
| `rpt_time_clock`, `rpt_lab_cases` | view | punch; lab case | P1 | DATA-23 |
| `rpt_fee_schedule_fees` | view | fee schedule x code x effective period | P1 | DATA-51 |
| `rpt_patient_alerts` (+ passthrough `patient_notes`, `account_notes`, `patient_statements`, `provider_route_slips`) | view | alert | P1 | DATA-52 |
| `rpt_office_calendar_days()`, `rpt_provider_calendar_days()` | function | office-day; provider-office-day | P1 | DATA-55 |
| `rpt_treatment_item_facts` | view | treatment-plan item | P1 | DATA-56 (item office and stamps: DATA-39, P3) |
| `rpt_benefit_usage()` | function | coverage slot x benefit year | P2 | DATA-32 |
| `rpt_claim_facts_as_of()` | function | claim as of a date | P2 | DATA-31 |
| `rpt_audit_events` | view | audited change | P2 | DATA-36 |
| `rpt_contract_installments`, `rpt_payment_plan_contracts` | view | contract instalment; contract header | P2 | DATA-37 |
| `rpt_referral_facts` | view | referral event | P3 | DATA-40 |
| `rpt_recall_due()` | function | patient x recall code | P3 | DATA-41 |
| `rpt_ortho_contracts` | view | ortho contract | P3 | DATA-42 |
| `rpt_communication_facts` | view | message | P3 | DATA-43 |
| `rpt_smart_assist_checks()` | function | appointment x checklist | P3 | DATA-54 |
| Roll-ups and snapshots | table | section 9 | P2 / P4 | DATA-30, DATA-47, DATA-48 |

Setup, security and provider **lists** read the dimension views where one exists and otherwise the catalog table itself
through a registered passthrough dataset (DATA-45); they need no normalisation beyond tenant scope and labels. The
dimension views carry every column a legacy list prints or filters (`research/legacy_report_outputs_lists.md`), not only
the analytic attributes.

**Joins never multiply rows.** A dimension or catalog is joined on a declared unique key, or through
`LEFT JOIN LATERAL (... ORDER BY ... LIMIT 1)` when the key is not unique in the schema (`transaction_codes` versions,
`referrals.legacy_id`, `responsible_parties.legacy_id` — neither `legacy_id` has a unique constraint [V]). Membership tests
use `EXISTS` (`rpt_code_in_group()`), never a join inside an aggregate. Invariant R-01 checks `count(*) = count(DISTINCT entry_id)`.

### 2.1 `rpt_dates`

Purpose: zero-fill and period grouping. Grain: one row per day, 1990-01-01 to 2045-12-31. No tenant column.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `date_key` | date PK | `d::date` | the day |
| `year`, `quarter`, `month` | int | `extract(...)` | calendar parts |
| `month_start`, `week_start` | date | `date_trunc('month', d)`, `date_trunc('week', d)` | week starts Monday (ISO) |
| `day_of_week` | int | `extract(isodow FROM d)::int - 1` | 0 = Monday ... 6 = Sunday, the convention of `office_schedule_days.day_of_week` [A] |
| `is_weekend` | bool | `extract(isodow FROM d) >= 6` | |
| `year_month` | char(7) | `to_char(d, 'YYYY-MM')` | label |

```sql
CREATE TABLE rpt_dates AS
SELECT d::date AS date_key, extract(year FROM d)::int AS year, extract(quarter FROM d)::int AS quarter,
       extract(month FROM d)::int AS month, date_trunc('month', d)::date AS month_start,
       date_trunc('week', d)::date AS week_start, extract(isodow FROM d)::int - 1 AS day_of_week,
       extract(isodow FROM d) >= 6 AS is_weekend, to_char(d, 'YYYY-MM') AS year_month
FROM generate_series(DATE '1990-01-01', DATE '2045-12-31', interval '1 day') d;
ALTER TABLE rpt_dates ADD PRIMARY KEY (date_key);
```

Working days are not a calendar property: they come from `rpt_office_calendar_days()` (2.28). Era caveats: none.

### 2.2 `rpt_office_dim`

Purpose: office attributes, office group, time zone and the office-local today. Grain: office. Rows: all offices of the
tenant, including inactive and deleted ones (history must still label them).

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `office_id` | int | `offices.tenant_id`, `offices.id` | |
| `office_name`, `short_id`, `office_code` | text | same-named columns | never render the legacy `OFF-<id>` key |
| `office_group_id`, `office_group_name` | int, text | `offices.office_group_id` -> `office_groups.name` | one group per office [A] |
| `timezone` | text | `offices.timezone` | default `America/New_York` on every migrated office until edited (section 6 #9) |
| `local_today` | date | `(now() AT TIME ZONE o.timezone)::date` | "today" for every report (AD-9) |
| `city`, `state`, `zip`, `opening_date` | | | `opening_date` drives same-store rules later |
| `is_active`, `is_deleted` | bool | `is_active`, `deleted_at IS NOT NULL` | deleted and inactive both have `is_active = false` |
| `billing_provider_id`, `default_ucr_fee_schedule_id`, `default_fee_schedule_id` | | | used by Super Bill and fee comparison |
| `active_operatory_count` | int | count of `operatories` with `is_active` | chair count (current state only) |

```sql
CREATE VIEW rpt_office_dim AS
SELECT o.tenant_id, o.id AS office_id, o.name AS office_name, o.short_id, o.office_code,
       o.office_group_id, g.name AS office_group_name, o.timezone,
       (now() AT TIME ZONE o.timezone)::date AS local_today,
       o.city, o.state, o.zip, o.opening_date, o.is_active, (o.deleted_at IS NOT NULL) AS is_deleted,
       o.billing_provider_id, o.default_ucr_fee_schedule_id, o.default_fee_schedule_id,
       (SELECT count(*) FROM operatories op WHERE op.office_id = o.id AND op.is_active) AS active_operatory_count
FROM offices o LEFT JOIN office_groups g ON g.id = o.office_group_id;
```

Era caveats: `office_groups` is empty after migration (`OGROUP.txt` was empty [V] `s52`); groups exist only once staff create them.

### 2.3 `rpt_provider_dim`

Purpose: provider attributes and the doctor / hygiene split. Grain: provider (all, including inactive).

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `provider_id` | int, varchar(50) | `providers.tenant_id`, `providers.id` | group by id; names repeat |
| `provider_name`, `first_name`, `last_name`, `short_id`, `title` | text | same-named | label = `Name (short_id)` |
| `role_raw` | text | `providers.role` | free text |
| `provider_kind` | text | `providers.provider_kind` (NEW column, DATA-05), fallback `lower(btrim(role))` | `dentist`, `hygienist`, `assistant`, `specialist`, `staff` or an unrecognised string (section 3.4) |
| `production_group` | text | `hygienist` -> `hygiene`; `dentist`, `specialist` -> `doctor`; else `other` | the three buckets that always sum to the total |
| `specialty`, `taxonomy_code`, `is_ortho_provider`, `is_billing_provider` | | same-named | `specialty` is blank on 96 of 97 migrated rows [D] |
| `npi`, `license`, `tax_id`, `dea_id` | text | same-named | Provider Registration (registration numbers); data class set by `08_security_compliance.md` |
| `address_line1`, `city`, `state`, `zip`, `phone`, `email` | text | same-named | Provider List columns; the `STATE` criterion reads `state` |
| `default_operatory_id` | varchar(50) | same-named | Provider Operatory |
| `home_office_id` | int | `providers.office_id` | never use to scope a report |
| `served_office_ids` | int[] | `provider_offices` union home office | roster (prefer, never exclude) |
| `user_id` | int | `providers.user_id` | provider-restricted reporting uses `users.report_access_provider_id` (PD-11) |
| `is_active` | bool | | |

```sql
CREATE VIEW rpt_provider_dim AS
SELECT p.tenant_id, p.id AS provider_id, p.name AS provider_name, p.first_name, p.last_name, p.short_id, p.title,
       p.role AS role_raw, k.provider_kind,
       CASE WHEN k.provider_kind = 'hygienist' THEN 'hygiene'
            WHEN k.provider_kind IN ('dentist', 'specialist') THEN 'doctor' ELSE 'other' END AS production_group,
       p.specialty, p.taxonomy_code, p.is_ortho_provider, p.is_billing_provider, p.npi, p.license, p.tax_id, p.dea_id,
       p.address_line1, p.city, p.state, p.zip, p.phone, p.email, p.default_operatory_id,
       p.office_id AS home_office_id,
       ARRAY(SELECT po.office_id FROM provider_offices po WHERE po.provider_id = p.id
             UNION SELECT p.office_id) AS served_office_ids,
       p.user_id, p.is_active
FROM providers p
CROSS JOIN LATERAL (SELECT coalesce(p.provider_kind, nullif(lower(btrim(p.role)), '')) AS provider_kind) k;
```

Era caveats: migrated roles contain casing and spelling variants (`Dentist`, `Hygenist`) [D]; without DATA-05 and the
role repair (section 6 #10) those providers fall into `other`.

### 2.4 `rpt_user_dim`

Purpose: the user behind `created_by`, including Denticon logins that have no `users` row. Grain: user key.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id` | int | `users.tenant_id` | |
| `user_key` | text | `'u:' + users.id`, or `'l:' + lower(login)` for a legacy login | the join key on every fact: `coalesce('u:' + created_by, 'l:' + lower(btrim(created_by_legacy)))` |
| `user_id` | int | `users.id` (NULL for legacy logins) | |
| `user_label` | text | `coalesce(nullif(short_id, ''), username)`; the login string for legacy logins | printed "User" column |
| `user_name`, `role`, `is_active` | | `last_name, first_name`; `role`; `is_active` | |
| `email`, `phone`, `patient_access_level` | text | `users.*` | User List columns |
| `group_names` | text[] | names of `user_groups` joined through `user_group_memberships` | User List "Group Membership"; the membership list itself is the passthrough `user_group_memberships` |
| `home_office_id` | int | `user_offices.office_id` where `is_primary` | |
| `report_access_provider_id`, `linked_provider_id` | varchar(50) | `users.report_access_provider_id`; `providers.id` where `providers.user_id = users.id` | the two independent user-provider links [A] |
| `last_login_at`, `created_at` | timestamp | | the only login data that exists |
| `is_legacy_login` | bool | | true = no account, cannot be a filter default |

```sql
CREATE VIEW rpt_user_dim AS
SELECT u.tenant_id, 'u:' || u.id AS user_key, u.id AS user_id,
       coalesce(nullif(btrim(u.short_id), ''), u.username) AS user_label,
       btrim(concat_ws(', ', u.last_name, u.first_name)) AS user_name, u.role, u.is_active,
       u.email, u.phone, u.patient_access_level,
       ARRAY(SELECT g.name FROM user_group_memberships m JOIN user_groups g ON g.id = m.group_id
             WHERE m.user_id = u.id ORDER BY g.name) AS group_names,
       (SELECT uo.office_id FROM user_offices uo WHERE uo.user_id = u.id AND uo.is_primary LIMIT 1) AS home_office_id,
       u.report_access_provider_id,
       (SELECT min(p.id) FROM providers p WHERE p.user_id = u.id) AS linked_provider_id,
       u.last_login_at, u.created_at, false AS is_legacy_login
FROM users u
UNION ALL
SELECT l.tenant_id, 'l:' || l.login_key, NULL, l.login, NULL, NULL, false, NULL, NULL, NULL, NULL,
       NULL, NULL, NULL, NULL, NULL, true
FROM rpt_legacy_logins l;   -- NEW table (DATA-10): distinct lower(created_by_legacy) values with no users row
```

Era caveats: a legacy login is a bare string (no name, role, office or active flag); migrated appointments, claims and
notes carry no user at all; `last_login_at` is the only login history in either era.

### 2.5 `rpt_procedure_code_dim`, `rpt_code_groups`, `rpt_code_group_members`

Purpose: category, reporting flags and versioned code groups. Grain: procedure code. `procedure_codes` is global (PK
`code`, no `tenant_id`) [V], so the dimension has no tenant column.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `procedure_code`, `description` | text | `code`, `description` | |
| `code_category` | text | `procedure_codes.category` | the 12 ADA labels plus `Medical`, `Account` [A] |
| `coverage_category`, `coverage_category_parent` | text | `coverage_category`, `left(coverage_category, 2)` | `01`..`12` with sub-codes; NULL = unmapped |
| `code_type` | text | `coalesce(code_type` NEW`, CASE)`: `D` + 4 digits -> `dental`; category `Medical` -> `medical`; else `other` | legacy "Code type Dental / Medical / Other" |
| `is_cdt`, `is_z_code`, `is_ortho_code` | bool | regex `^D[0-9]{4}$`; `code ILIKE 'Z%'`; `is_ortho OR code LIKE 'D8%'` | |
| `is_production` | bool | `coalesce(is_production` NEW`, category <> 'Account')` | false for contract-billing codes `ACBIL`, `ACBILO` |
| `is_visit_code`, `is_ledger_code`, `is_ar_code` | bool | `coalesce(` NEW boolean`, default)`; defaults: CDT pattern, true, true | the three legacy code flags behind Patients Seen, Procedures Done and Daily Audit |
| `is_post_op` | bool | `procedure_codes.is_post_op` | Post-Op Report (the column exists [V]; false on every code until the office flags its post-op codes) |
| `requires_tooth`, `requires_surface`, `billing_order` | bool, bool, text | same-named [V] | Procedure Codes List "Include Only Tooth Required / Surface Required"; default bill order of the code |
| `bill_to_insurance`, `production_type_id` | bool, int | NEW columns (DATA-04) | Procedure Codes List "Include Only Bill to Insurance" and `PRODUCTION TYPE`; NULL until filled in setup |
| `recall_interval`, `recall_unit`, `recall_interval_span` | int, text, interval | normalised: unit starting `y` -> years, `w` -> weeks, `d` -> days, else months | migrated from `RECALLINT` / `RECALLUNIT` [V] `s10`; unit vocabulary unverified (section 6 #22) |
| `taxable`, `default_fee`, `default_duration_minutes`, `is_active` | | same-named | |

```sql
CREATE VIEW rpt_procedure_code_dim AS
SELECT pc.code AS procedure_code, pc.description, pc.category AS code_category,
       pc.coverage_category, left(pc.coverage_category, 2) AS coverage_category_parent,
       coalesce(pc.code_type, CASE WHEN pc.code ~ '^D[0-9]{4}$' THEN 'dental'
                                   WHEN pc.category = 'Medical' THEN 'medical' ELSE 'other' END) AS code_type,
       (pc.code ~ '^D[0-9]{4}$') AS is_cdt, (pc.code ILIKE 'Z%') AS is_z_code,
       (pc.is_ortho OR pc.code LIKE 'D8%') AS is_ortho_code,
       coalesce(pc.is_production, pc.category <> 'Account') AS is_production,
       coalesce(pc.is_visit_code, pc.code ~ '^D[0-9]{4}$') AS is_visit_code,
       coalesce(pc.is_ledger_code, true) AS is_ledger_code, coalesce(pc.is_ar_code, true) AS is_ar_code,
       pc.is_post_op, pc.requires_tooth, pc.requires_surface, pc.billing_order,
       pc.bill_to_insurance, pc.production_type_id,                        -- NEW columns (DATA-04)
       pc.recall_interval, pc.recall_unit,
       CASE WHEN coalesce(pc.recall_interval, 0) <= 0 THEN NULL
            WHEN lower(pc.recall_unit) LIKE 'y%' THEN make_interval(years => pc.recall_interval)
            WHEN lower(pc.recall_unit) LIKE 'w%' THEN make_interval(weeks => pc.recall_interval)
            WHEN lower(pc.recall_unit) LIKE 'd%' THEN make_interval(days => pc.recall_interval)
            ELSE make_interval(months => pc.recall_interval) END AS recall_interval_span,
       pc.taxable, pc.default_fee, pc.default_duration_minutes, pc.is_active
FROM procedure_codes pc;
```

Verified gap [V]: `procedure_codes.visit_code`, `ledger_code`, `ar_code` are free `String(50)` columns added by Alembic
`c6d7e8f9a0b1`; neither `s10` nor any script fills them and no service reads them; `is_post_op` defaults to false and is
not migrated. The typed flags are NEW (DATA-04). Era caveats: none for the code attributes themselves (the catalog is
shared by both eras), but until the flags are filled every flag-dependent figure uses the default rule in the view.

Code groups (NEW tables, DATA-04). A group is a named, dated set of codes or code ranges; `tenant_id IS NULL` rows are
the shipped defaults, a tenant row for the same `group_key` replaces the default set for that tenant.

```sql
CREATE TABLE rpt_code_groups (group_key varchar(40) PRIMARY KEY, label varchar(120) NOT NULL, description text);
CREATE TABLE rpt_code_group_members (
  id bigserial PRIMARY KEY, group_key varchar(40) NOT NULL REFERENCES rpt_code_groups(group_key),
  tenant_id int REFERENCES tenants(id),              -- NULL = system default
  code_from varchar(20) NOT NULL, code_to varchar(20) NOT NULL,   -- a single code has code_from = code_to
  valid_from date NOT NULL DEFAULT DATE '1900-01-01', valid_to date, source varchar(60), note text);

-- The one membership test. EXISTS cannot multiply rows, whatever overlaps the member rows have
-- (two dated versions of a range, or a single code that also sits inside a range).
CREATE FUNCTION rpt_code_in_group(p_tenant_id int, p_group_key varchar, p_code varchar, p_on date)
RETURNS boolean LANGUAGE sql STABLE AS $$
SELECT EXISTS (
  SELECT 1 FROM rpt_code_group_members g
  WHERE g.group_key = p_group_key AND p_code BETWEEN g.code_from AND g.code_to
    AND p_on >= g.valid_from AND (g.valid_to IS NULL OR p_on < g.valid_to)
    AND g.tenant_id IS NOT DISTINCT FROM (           -- the tenant's own set when it has one, else the shipped default
          SELECT max(t.tenant_id) FROM rpt_code_group_members t
          WHERE t.group_key = p_group_key AND t.tenant_id = p_tenant_id));
$$;
```

Every dataset and metric tests membership through `rpt_code_in_group(tenant_id, group_key, procedure_code, <service or
appointment date>)`; a view never joins `rpt_code_group_members` inside an aggregate (a booked line matching two member
rows would double `line_count` and the scheduled fee).

| `group_key` | Default members | Source |
|---|---|---|
| `hygiene_visit` | D1110, D1120, D4341, D4342, D4346, D4355, D4910 | `research/dental_kpi_dictionary.md` §2.3 |
| `prophy`; `perio_maintenance`; `srp` | D1110, D1120; D4910; D4341, D4342 | same |
| `perio` | D4341, D4342, D4346, D4355, D4910 | same |
| `exam_new_patient`; `exam_recare`; `exam_emergency` | D0150; D0120, D0145; D0140, D0160 | same (Denticon Practice Analytics rule) |
| `fluoride`; `adjunctive` | D1206, D1208; D1206, D1208, D4999, D7465, D4921, D4381 | same §3.5 HYG-12 |
| `recall_default` | D0120, D0210, D0330, D1110, D1120, D4910 | `FE:src/features/add-patient/legacyCatalogs.ts` L299-306 [A] |
| `ortho`; `ortho_periodic_visit` | D8000-D8999; D8670 | CDT range; confirm with the clinical lead [I] |
| `contract_billing` | ACBIL, ACBILO | `analysis/be_data_financial.md` §1.1 |

Further groups (crowns, radiographs, sealants, implants) are added the same way by `05_metric_catalog.md` when a metric
needs them; the table, not code, is the definition, and every change is a new dated row.

### 2.6 `rpt_transaction_code_dim`

Purpose: resolve a payment or adjustment code to sign, side, class and tender. Grain: `(tenant_id, code, valid_from)`.
A projection of `transaction_codes` (NEW, section 3.3 gives columns, vocabulary and seed). Columns: `tenant_id`, `code`,
`code_kind`, `description`, `sign`, `legacy_sub_type`, `legacy_class` (the literal legacy `Sub Type` and `Class`, bound by
the Credit Codes Report), `txn_side`, `txn_class` (the analytic roll-ups of the two), `tender_class`, `deposit_group`,
`card_brand`, `is_income`, `counts_as_collection`, `is_system`, `valid_from`, `valid_to`, `is_active`. Versions of one code
never overlap (exclusion constraint, 3.3); fact views still resolve a code through `LATERAL ... ORDER BY valid_from DESC
LIMIT 1`, so a constraint that was not yet applied cannot duplicate a ledger leg.

```sql
CREATE VIEW rpt_transaction_code_dim AS SELECT * FROM transaction_codes;
```

Era caveats: migrated rows carry no code today (`s29` keeps only `TYPE2` mapped to `cash`, `check`, `card`, `ach` or NULL
[V]); they resolve to the system alias codes and to `unclassified` until DATA-12.

### 2.7 `rpt_patient_dim`

Purpose: patient attributes with normalised vocabularies. Grain: patient (`patients.id` is the only safe key; `chart_no`
is not unique in the real database [A]).

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `patient_id`, `chart_no`, `era` | | `patients.*`; `legacy_id IS NOT NULL` | |
| `title`, `first_name`, `middle_initial`, `last_name`, `preferred_name`, `dob` | | same-named | Patient List prints `Title`; age is computed at run time from `dob` |
| `gender_code` | char(1) | first letter upper-cased: `M`, `F`, other -> `O`, blank -> NULL | stored values `Male` / `M` etc. [A] |
| `address_line1`, `address_line2`, `city`, `state`, `zip5` | text | `left(regexp_replace(zip, '\D', '', 'g'), 5)` | Patient List `Address`; Zip Code modes |
| `phone`, `cell_phone`, `work_phone`, `email` | | | data class set by `08_security_compliance.md` |
| `marital_status`, `preferred_language`, `preferred_contact` | text | same-named (mapped through `rpt_value_map` where a domain exists) | list columns |
| `home_office_id`, `account_id` | int | same-named | home office is a badge, not a fence; `account_id` = current account membership (5.3) |
| `fee_schedule_id` | int | `patients.fee_schedule_id` | Patient List - Grouped By `Fee Schedule` |
| `hipaa_agreement` | bool | `patients.hipaa_agreement` | Patient List - Grouped By `HIPAA Agreement`; SmartAssist `HIPAA` |
| `is_active` | bool | `patients.is_active` | inactive and deleted are indistinguishable until DATA-44 |
| `is_placeholder_patient` | bool | `patients.registration_status = 'placeholder'` (NEW, DATA-44); interim rule [I]: app row with no address line, no visit and no coverage slot | a scheduler quick-save record not yet completed into a full patient record (legacy "New Patient Thru Appointment"); the interim rule over-counts patients registered with a name and phone only |
| `patient_type_raw`, `patient_type_codes` | text, text[] | raw column; union of the JSON array `patient_types` and the mapped raw value (`rpt_value_map`, NEW) | legacy "Include / Exclude Patient Type" pickers |
| `is_ortho_patient` | bool | tag rule OR an active `ortho_plans` row (section 3.5) | legacy "Patient Type: Both / General / Ortho" |
| `preferred_provider_id`, `preferred_hygienist_id` | varchar(50) | same-named | NULL on migrated rows [A] |
| `referral_type_raw`, `referred_by_raw` | text | `referral_type`, `referred_by` | |
| `referral_source_id`, `referral_source_name` | int, text | the `referrals` row whose `legacy_id = btrim(referred_by)` in the same tenant (lowest id when the key repeats), else NULL and the raw text | after DATA-40: `patients.referral_source_id` |
| `first_visit_date`, `last_visit_date` | date | `patients.first_visit`, `last_visit` | NULL until DATA-19 maintains them |
| `created_at_utc`, `created_at_reliable` | timestamp, bool | `created_at`; `legacy_id IS NULL` | migrated = load time [A] |
| `no_correspondence`, `no_auto_email`, `no_auto_sms`, `sms_opt_out_at` | | | mandatory exclusions for outreach lists |

```sql
CREATE VIEW rpt_patient_dim AS
SELECT p.tenant_id, p.id AS patient_id, p.chart_no, CASE WHEN p.legacy_id IS NOT NULL THEN 'migrated' ELSE 'app' END AS era,
       p.title, p.first_name, p.middle_initial, p.last_name, p.preferred_name, p.dob,
       CASE upper(left(btrim(coalesce(p.gender, '')), 1)) WHEN 'M' THEN 'M' WHEN 'F' THEN 'F' WHEN '' THEN NULL ELSE 'O' END AS gender_code,
       p.address_line1, p.address_line2, p.city, p.state, left(regexp_replace(coalesce(p.zip, ''), '\D', '', 'g'), 5) AS zip5,
       p.phone, p.cell_phone, p.work_phone, p.email, p.marital_status, p.preferred_language, p.preferred_contact,
       p.home_office_id, p.account_id, p.fee_schedule_id, p.hipaa_agreement, p.is_active,
       (p.legacy_id IS NULL AND nullif(btrim(coalesce(p.address_line1, '')), '') IS NULL AND p.first_visit IS NULL
          AND NOT EXISTS (SELECT 1 FROM patient_insurance pi WHERE pi.patient_id = p.id AND pi.is_active))
          AS is_placeholder_patient,                    -- after DATA-44: p.registration_status = 'placeholder'
       p.patient_type AS patient_type_raw, t.patient_type_codes,
       (t.is_ortho_tag OR EXISTS (SELECT 1 FROM ortho_plans op WHERE op.patient_id = p.id AND op.is_active)) AS is_ortho_patient,
       p.preferred_provider_id, p.preferred_hygienist_id,
       p.referral_type AS referral_type_raw, p.referred_by AS referred_by_raw, rs.id AS referral_source_id,
       coalesce(rs.practice_name, nullif(btrim(concat_ws(', ', rs.last_name, rs.first_name)), ''),
                nullif(btrim(p.referred_by), '')) AS referral_source_name,
       p.first_visit AS first_visit_date, p.last_visit AS last_visit_date,
       p.created_at AS created_at_utc, (p.legacy_id IS NULL) AS created_at_reliable,
       p.no_correspondence, p.no_auto_email, p.no_auto_sms, p.sms_opt_out_at
FROM patients p
LEFT JOIN LATERAL (SELECT r.id, r.practice_name, r.last_name, r.first_name FROM referrals r   -- legacy_id is not unique [V]:
                   WHERE r.tenant_id = p.tenant_id AND r.legacy_id = btrim(p.referred_by)     -- one row, never a fan-out
                   ORDER BY r.id LIMIT 1) rs ON true
CROSS JOIN LATERAL (
  SELECT (upper(btrim(coalesce(p.patient_type, ''))) IN ('OR', 'ORTHO') OR p.patient_type ILIKE 'ortho%'
          OR coalesce(p.patient_types::jsonb, '[]'::jsonb) ? 'OR') AS is_ortho_tag,
         ARRAY(SELECT upper(x) FROM jsonb_array_elements_text(
                 CASE WHEN jsonb_typeof(p.patient_types::jsonb) = 'array' THEN p.patient_types::jsonb ELSE '[]'::jsonb END) x
               UNION
               SELECT vm.canonical_value FROM rpt_value_map vm
               WHERE vm.domain = 'patient_type' AND vm.raw_value = lower(btrim(p.patient_type))) AS patient_type_codes) t;
```

Era caveats: `referred_by` matches a source row only for migrated patients (legacy id); app patients hold free text until
DATA-40. `patients.patient_types` is `json`, hence the cast [A]. `referrals` has no index (DATA-08 adds
`(tenant_id, legacy_id)`); duplicate keys are counted by section 6 #38. A placeholder state is not stored today: Quick Save
posts a normal `patients` row through `/patients/register` [V] (`patient_intake_service.py` L157), hence the interim rule.

### 2.8 `rpt_account_dim`

Purpose: the guarantor (responsible party) account. Grain: `accounts.id`. Rows: all accounts; merged ones keep
`merged_into_account_id`.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `account_id`, `account_no`, `legacy_key` | | `accounts.*` | `legacy_key` = Denticon `RPID` on migrated accounts [A] |
| `home_office_id` | int | `accounts.home_office_id` | home-office attribution of A/R and statements (PD-4) |
| `guarantor_kind` | text | `patient` / `party` / `unresolved` from the two typed columns | `unresolved` until section 6 #11 is applied |
| `guarantor_last_name`, `guarantor_first_name`, address, phones | text | guarantor patient, else responsible party, else the first member (flagged by `guarantor_kind`) | printed "Resp Party" |
| `resp_party_type` | text | `coalesce(accounts.resp_party_type` (NEW, DATA-53)`, type of the guarantor party, type of the party whose legacy_id = accounts.legacy_key)` | the one mandatory billing type per account of the legacy tool (`Cash`, `Collections`, `Discount Plan`, `No Type Defined`, ...): "Exclude Resp. Party Type", "Include Resp. Party Type", Routing Slip `Billing Type` |
| `send_statements`, `no_email_statement`, `send_collections`, `collection_agency_id`, `is_finance_charge` | | `accounts.*` | statement and collection criteria; `send_collections` is the legacy "Sent to Collection" flag (recall and ageing exclusions) |
| `financial_notes`, `statement_message` | text | | Uncollected Copay prints `financial_notes`; Patient's Notes type `Financial Notes` |
| `member_count`, `active_member_count` | int | count of `patients` with this `account_id` | "inactive account" = no active member |
| `is_active`, `merged_into_account_id`, `created_at_utc` | | | `created_at` of migrated accounts = backfill time |
| `balance_status_code`, `sent_to_collections_at`, `last_statement_date` | | NEW columns (DATA-35, DATA-22) | NULL until then |

```sql
CREATE VIEW rpt_account_dim AS
SELECT a.tenant_id, a.id AS account_id, a.account_no, a.legacy_key, a.home_office_id,
       CASE WHEN a.primary_guarantor_patient_id IS NOT NULL THEN 'patient'
            WHEN a.primary_guarantor_party_id IS NOT NULL THEN 'party' ELSE 'unresolved' END AS guarantor_kind,
       a.primary_guarantor_patient_id, a.primary_guarantor_party_id,
       coalesce(gp.last_name, rp.last_name, m.last_name) AS guarantor_last_name,
       coalesce(gp.first_name, rp.first_name, m.first_name) AS guarantor_first_name,
       coalesce(gp.address_line1, rp.address_line1, m.address_line1) AS address_line1,
       coalesce(gp.city, rp.city, m.city) AS city, coalesce(gp.state, rp.state, m.state) AS state,
       coalesce(gp.zip, rp.zip, m.zip) AS zip,
       coalesce(gp.phone, rp.home_phone, m.phone) AS home_phone, coalesce(gp.cell_phone, rp.cell_phone, m.cell_phone) AS cell_phone,
       coalesce(a.resp_party_type,                          -- NEW column (DATA-53); the two fallbacks cover the time before its back-fill
                rp.resp_party_type, rpl.resp_party_type) AS resp_party_type,
       a.send_statements, a.no_email_statement, a.send_collections, a.collection_agency_id, a.is_finance_charge,
       a.financial_notes, a.statement_message, mc.member_count, mc.active_member_count,
       a.is_active, a.merged_into_account_id, a.created_at AS created_at_utc
FROM accounts a
LEFT JOIN patients gp ON gp.id = a.primary_guarantor_patient_id
LEFT JOIN responsible_parties rp ON rp.id = a.primary_guarantor_party_id
LEFT JOIN LATERAL (SELECT x.resp_party_type FROM responsible_parties x          -- legacy_id is indexed, not unique [V]
                   WHERE x.tenant_id = a.tenant_id AND x.legacy_id = a.legacy_key
                   ORDER BY x.id LIMIT 1) rpl ON true
LEFT JOIN LATERAL (SELECT count(*) AS member_count, count(*) FILTER (WHERE is_active) AS active_member_count,
                          min(id) AS first_member_id FROM patients WHERE account_id = a.id) mc ON true
LEFT JOIN patients m ON m.id = mc.first_member_id
                    AND a.primary_guarantor_patient_id IS NULL AND a.primary_guarantor_party_id IS NULL;
```

Verified gap [V]: `resp_party_type` exists only on `responsible_parties` (`app/db/models/patients.py` L652); an account
whose guarantor is a patient — the normal self-guarantor case — has no party row, and `family_account_service` returns
the type only for `kind == 'responsible_party'` (L164). Without DATA-53 the type is NULL for every such account, which
empties the ten legacy criteria that filter or print it (section 11). Section 6 #37 measures the coverage.

Era caveats: account membership is `patients.account_id`, a current-state column. A guarantor change
(`family_account_service.change_guarantor`) and an account merge reassign that column only [V] (L696-703, L862-864): no
money row is rewritten, and the stamp on `patient_payments.account_id` keeps the account at posting time. Every dataset
therefore attributes all legs of a patient to the patient's **current** account (`account_id`) and exposes the stamp
separately (`posted_account_id`, 5.3). Account history "as it was on a date" does not exist before
`account_change_events` (app era only).

### 2.9 `rpt_charges`

Purpose: production lines (posted charges). Grain: one `patient_procedures` row. `rpt_charges` = live rows of
`rpt_charges_all`. Source facts: `analysis/be_data_financial.md` §1.1.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id` | int | `patients.tenant_id` via `patient_id` (own column after DATA-15) | |
| `charge_id`, `entry_id` | varchar(50), text | `pp.id`; `'chg:' + pp.id` | `PROC-{LEDGERID}` migrated, `PP-{uuid7}` plan or instalment posting |
| `era` | text | `pp.legacy_id IS NOT NULL` -> `migrated` | |
| `patient_id`, `account_id` | int | `pp.patient_id`; `patients.account_id` | `account_id` = the patient's **current** account: the A/R unit of every leg (5.3) |
| `posted_account_id` | int | NULL today; `pp.account_id` after DATA-15 stamps it at posting | account at posting time, for "as posted" reports only; never the A/R unit |
| `office_id` | int | `pp.office_id` (NOT NULL) | office of service (PD-6) |
| `provider_id`, `hygienist_id` | varchar(50) | `pp.provider_id` (NOT NULL), `pp.hygienist_id` | treating provider; second (hygiene) provider, app era only (PD-7) |
| `service_date` | date | `pp.date_of_service` | `DOSDATE`, else `TRANDATE` on migrated rows [V] `s28` L85 |
| `transaction_date` | date | `coalesce(pp.transaction_date, pp.date_of_service)` | `transaction_date` is NEW (DATA-13); equal to `service_date` until then |
| `created_at_utc`, `created_date`, `created_at_reliable` | timestamp, date, bool | `pp.created_at`; `<created_date>`; app row or `created_at_restored` | created-date basis |
| `user_key` | text | `coalesce('u:' + created_by, 'l:' + lower(created_by_legacy))` | poster |
| `procedure_code`, `code_category`, `coverage_category` | text | `pp.procedure_code` -> `procedure_codes` | |
| `tooth`, `surface`, `quadrant`, `quantity`, `duration_minutes` | | same-named | `duration_minutes` = legacy "Dur. (Units)"; `fee` is treated as the line total whatever `quantity` is (section 6 #24) |
| `charged_fee` | numeric | `pp.fee` | posted / contracted fee: `charged_production` (PD-1). Can be negative on migrated rows (`AMOUNT` is loaded verbatim [V] `s28` L108; section 6 #24) |
| `office_fee` | numeric | `sgn * abs(coalesce(nullif(pp.ucr_fee, 0), pp.fee))`, `sgn` = -1 when `fee < 0`, else 1 | office (UCR) fee: `gross_production` (PD-1); carries the sign of the line |
| `implied_writeoff` | numeric | `sgn * greatest(abs(office_fee) - abs(fee), 0)` | contractual write-off embedded in the fee; a separate measure, never subtracted from `charged_fee` |
| `fee_above_office_fee` | numeric | `sgn * greatest(abs(fee) - abs(office_fee), 0)` | the part of a fee above the stamped UCR (override, or `quantity > 1`: `ucr_fee` is the schedule price of one unit and is never multiplied [V] `estimate_service.py` L642-643). Identity on every row: `office_fee - implied_writeoff + fee_above_office_fee = charged_fee` (R-22) |
| `est_ins_primary`, `est_ins_secondary` | numeric | `pp.insurance_estimate`, `coalesce(pp.sec_insurance_estimate, 0)` | estimates at posting; never decremented |
| `est_insurance`, `est_patient` | numeric | `least(greatest(fee, 0), greatest(primary + secondary, 0))`; `fee - est_insurance` | the legacy `Est. Ins.` / `Est. Pat.` split; **always** sums to `charged_fee` (R-20) |
| `patient_estimate_stored` | numeric | `pp.patient_estimate` | the stored value, shown beside the derived one when it differs; never used in the journal block |
| `is_production`, `is_visit_code`, `is_ledger_code`, `is_ar_code`, `is_cdt`, `is_ortho_code` | bool | as `rpt_procedure_code_dim` | Executive Summary: Procedures Done = `is_ledger_code`; "Non visit code transactions" = `is_ledger_code AND NOT is_visit_code` |
| `is_contract_billing` | bool | `pp.id` is a `ledger_id` of one of the three instalment tables | the `PP-` id prefix alone cannot tell (shared with plan-item posting [A]) |
| `appointment_id`, `appointment_link_reliable` | varchar(50), bool | `pp.appointment_id`; `legacy_id IS NULL` | migrated link came from `APPTDID or APPTID` looked up in a header-id map [V] `s28` L98-102 |
| `claim_id`, `hold_claim`, `billing_state` | | `on_claim` when `claim_id` set, `hold` when `hold_claim`, else `unbilled` | never read `billing_status` (it means "patient paid" on migrated rows [V] `s28` L113) |
| `apply_to` | text | `pp.apply_to` | legacy "A" column (`APPLYTO`) |
| `bill_tier`, `bill_tier_source` | text | stored: `lower(btrim(pp.billing_order))` when not blank. Derived (app rows without a stored value): `secondary` when a secondary estimate exists, `primary` when a primary estimate or a `coverage_rule_id` exists, else `none`. Migrated rows without a value: `none` | the legacy `Bill` value of the line: `none` = billing order None (the population of Unbilled Report Due to No Insurance), `primary` / `secondary` / `tertiary` = the deepest tier to bill. Migrated from `BILLINGORDER` [V] `s28` L111-112, but every value starting with `D` was folded into `primary` at load [V] `parsers.py` L153-163, so the legacy `DD` / `DDD` depth is lost for history until DATA-12 re-reads it. In the app only a posting from a treatment-plan item copies the item's billing order [V] `treatment_service.py` L1140-1141; charge entry sends none, hence the derived rule until DATA-33 stamps it at posting |
| `treatment_plan_id`, `treatment_plan_item_id`, `is_planned` | | same-named; item id present | unplanned (same-day) work = `NOT is_planned`, app era only |
| `fee_schedule_id`, `fee_source`, `is_unpriced` | | `fee_source = 'unpriced' OR fee = 0` | silent production loss; exception report |
| `primary_ins_plan_id`, `primary_carrier_id` | int | claim plan / carrier, else `coverage_rule_id` -> plan -> carrier | payer of the charge; stamped at posting after DATA-33 |
| `legacy_pat_paid`, `legacy_pat_adjust` | numeric | `pp.pat_paid`, `pp.pat_adjust` | Denticon's applied amounts, undated, patient side only |
| `amount` | numeric | `pp.fee` | ledger amount (debit) |
| `is_void`, `is_archived` | bool | same-named | `is_archived` = row came from `Ledger_archive.txt`; the app never sets it on charges [V] |

```sql
CREATE VIEW rpt_contract_charge_ids AS
SELECT ledger_id FROM patient_plan_installments WHERE ledger_id IS NOT NULL
UNION SELECT ledger_id FROM patient_ins_payment_plans WHERE ledger_id IS NOT NULL
UNION SELECT ledger_id FROM patient_sec_ins_payment_plans WHERE ledger_id IS NOT NULL;

CREATE VIEW rpt_charges_all AS
SELECT pt.tenant_id, pp.id AS charge_id, 'chg:' || pp.id AS entry_id,
       CASE WHEN pp.legacy_id IS NOT NULL THEN 'migrated' ELSE 'app' END AS era,
       pp.patient_id, pt.account_id,                      -- current membership: the same unit as GET /patients/{id}/account-balance
       NULL::int AS posted_account_id,                    -- pp.account_id after DATA-15
       pp.office_id, pp.provider_id, pp.hygienist_id,
       pp.date_of_service AS service_date,
       pp.date_of_service AS transaction_date,            -- coalesce(pp.transaction_date, pp.date_of_service) after DATA-13
       pp.created_at AS created_at_utc,
       CASE WHEN pp.legacy_id IS NOT NULL THEN pp.created_at::date
            ELSE (pp.created_at AT TIME ZONE 'UTC' AT TIME ZONE coalesce(o.timezone, 'America/New_York'))::date
       END AS created_date,                               -- this CASE is <created_date> in every later sketch
       (pp.legacy_id IS NULL OR f.created_at_restored) AS created_at_reliable,
       coalesce('u:' || pp.created_by, 'l:' || lower(btrim(pp.created_by_legacy))) AS user_key,
       pp.procedure_code, pc.category AS code_category, pc.coverage_category,
       pp.tooth, pp.surface, pp.quadrant, pp.quantity, pp.duration_minutes,
       pp.fee AS charged_fee, v.office_fee,
       v.sgn * greatest(abs(v.office_fee) - abs(pp.fee), 0) AS implied_writeoff,
       v.sgn * greatest(abs(pp.fee) - abs(v.office_fee), 0) AS fee_above_office_fee,
       pp.insurance_estimate AS est_ins_primary, coalesce(pp.sec_insurance_estimate, 0) AS est_ins_secondary,
       v.est_insurance, pp.fee - v.est_insurance AS est_patient, pp.patient_estimate AS patient_estimate_stored,
       coalesce(pc.is_production, pc.category <> 'Account') AS is_production,
       coalesce(pc.is_visit_code, pp.procedure_code ~ '^D[0-9]{4}$') AS is_visit_code,
       coalesce(pc.is_ledger_code, true) AS is_ledger_code, coalesce(pc.is_ar_code, true) AS is_ar_code,
       (pp.procedure_code ~ '^D[0-9]{4}$') AS is_cdt, (pc.is_ortho OR pp.procedure_code LIKE 'D8%') AS is_ortho_code,
       (ci.ledger_id IS NOT NULL) AS is_contract_billing,
       pp.appointment_id, (pp.legacy_id IS NULL) AS appointment_link_reliable,
       pp.claim_id, pp.hold_claim,
       CASE WHEN pp.claim_id IS NOT NULL THEN 'on_claim' WHEN pp.hold_claim THEN 'hold' ELSE 'unbilled' END AS billing_state,
       pp.apply_to,
       coalesce(nullif(lower(btrim(pp.billing_order)), ''),
                CASE WHEN pp.legacy_id IS NOT NULL THEN 'none'
                     WHEN coalesce(pp.sec_insurance_estimate, 0) > 0 THEN 'secondary'
                     WHEN pp.insurance_estimate > 0 OR pp.coverage_rule_id IS NOT NULL THEN 'primary'
                     ELSE 'none' END) AS bill_tier,
       CASE WHEN nullif(btrim(coalesce(pp.billing_order, '')), '') IS NOT NULL THEN 'stored' ELSE 'derived' END AS bill_tier_source,
       pp.treatment_plan_id, pp.treatment_plan_item_id, (pp.treatment_plan_item_id IS NOT NULL) AS is_planned,
       pp.fee_schedule_id, pp.fee_source, (pp.fee_source = 'unpriced' OR pp.fee = 0) AS is_unpriced,
       coalesce(cl.ins_plan_id, cr.ins_plan_id) AS primary_ins_plan_id,
       coalesce(cl.carrier_id, ip.carrier_id) AS primary_carrier_id,
       pp.pat_paid AS legacy_pat_paid, pp.pat_adjust AS legacy_pat_adjust,
       pp.fee AS amount, pp.is_void, pp.is_archived
FROM patient_procedures pp
JOIN patients pt ON pt.id = pp.patient_id
JOIN procedure_codes pc ON pc.code = pp.procedure_code
JOIN rpt_tenant_flags f ON f.tenant_id = pt.tenant_id
LEFT JOIN offices o ON o.id = pp.office_id
LEFT JOIN insurance_claims cl ON cl.id = pp.claim_id
LEFT JOIN insurance_coverage_rules cr ON cr.id = pp.coverage_rule_id
LEFT JOIN insurance_plans ip ON ip.id = coalesce(cl.ins_plan_id, cr.ins_plan_id)
LEFT JOIN rpt_contract_charge_ids ci ON ci.ledger_id = pp.id
CROSS JOIN LATERAL (SELECT CASE WHEN pp.fee < 0 THEN -1 ELSE 1 END AS sgn) s
CROSS JOIN LATERAL (SELECT s.sgn,
                           s.sgn * abs(coalesce(nullif(pp.ucr_fee, 0), pp.fee)) AS office_fee,
                           least(greatest(pp.fee, 0),
                                 greatest(pp.insurance_estimate + coalesce(pp.sec_insurance_estimate, 0), 0)) AS est_insurance) v;

CREATE VIEW rpt_charges AS
SELECT c.* FROM rpt_charges_all c JOIN rpt_tenant_flags f USING (tenant_id)
WHERE NOT c.is_void AND (NOT c.is_archived OR f.include_legacy_archive);
```

Every join is on a primary key (`patients.id`, `procedure_codes.code`, `offices.id`, `insurance_claims.id`,
`insurance_coverage_rules.id`, `insurance_plans.id`) or on a `UNION`-deduplicated id list, so the view has exactly one row
per `patient_procedures` row.

Era caveats (migrated rows): `patient_estimate` is 0 on 1,372,558 of 1,372,574 rows [D], which is why `est_patient` is
always derived; `hygienist_id`, plan links, `fee_source`, `coverage_rule_id` are NULL; `claim_id` is NULL until check #3
of section 6 is applied; `transaction_date` equals `service_date` (`TRANDATE` was dropped when `DOSDATE` existed). **The migrated
charge set is incomplete**: 87,585 source charges were skipped (code not in the catalog, unknown provider or no date) [D]
[V] `s28` L78-95, while the payments and adjustments of the same patients were loaded. The effect is not only missing
production: balances are too low, some accounts carry a credit that Denticon never showed, and derived allocation
applies those credits to other charges (wrong provider, wrong age). DATA-57 reloads the skipped rows and R-21 compares
the result with Denticon control totals; until both pass, every financial report on migrated periods prints the
completeness caveat with the measured gap (section 6 #35). Era caveat (app rows): the screen's "transaction date" is
stored in `date_of_service`, so a back-dated charge is visible only through `created_date` until DATA-13.

### 2.10 `rpt_payments` and `rpt_remittance_lines`

Purpose: every payment leg, from both stores. Grain: one row per `patient_payments` row whose `payment_type` is not
`adjustment`, plus one row per (app `ledger_insurance_details` row, tier) with a paid amount, plus (after DATA-38) one row
per capitation payment. `rpt_remittance_lines` is the unpivot of `ledger_insurance_details` (one row per row and tier with
any money) and also feeds write-offs (2.11), allocations (2.13) and claim facts (2.20).

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `entry_id`, `source_table`, `source_id`, `era` | | `'pay:' + py.id`, `'rpay:' + lid.id + ':' + tier_col`, `'cap:' + capitation_payments.id` | |
| `payer` | text | `patient_payments.payment_type` starting `ins` -> `insurance`, else `patient`; remittance and capitation = `insurance` | |
| `amount` | numeric | section 3.1: `-abs(amount)`; a positive migrated row only when the tenant policy is `reversal`; remittance `-paid` | credit negative; money in = `-amount` |
| `is_sign_anomaly` | bool | migrated row with `amount > 0`, or app row with `amount < 0` | the rows whose stored sign contradicts their type (section 6 #1); listed, never silently reinterpreted |
| `code`, `code_description` | text | `upper(btrim(coalesce(py.transaction_code, py.payment_method)))`; remittance: its `payment_method`, default `INSURANCE` | `transaction_code` is NEW (DATA-12) |
| `txn_class` | text | catalog class, default `insurance_payment` / `patient_payment` by payer | special classes: `capitation_payment`, `collection_agency_payment`, `financing_payment`, `opening_balance` |
| `tender_class`, `deposit_group`, `card_brand` | text | catalog; defaults `unknown`, `none`, NULL | Deposit Slip sections |
| `counts_as_collection`, `collection_class_quality` | bool, text | catalog value, else true; `catalog` when a code version matched, else `assumed` | `false` for conversion credits (`APBAC`, `APBIC`) and for `COLPY` (3.3). A row without a catalog match (every migrated payment whose tender was not exported) is counted as a collection and labelled `assumed`; reports print the assumed share |
| `transaction_date` | date | `coalesce(py.transaction_date, py.payment_date)`; remittance likewise | the ledger date of the line. `patient_payments.transaction_date` and `ledger_insurance_details.transaction_date` are NEW (DATA-13); until then equal to `payment_date`. Migrated = `TRANDATE` [V] `s29` L63 |
| `payment_date` | date | `py.payment_date`; `coalesce(lid.payment_date, lid.created_at::date)` | the date the payment applies to (legacy Deposit Slip "Payment Date"); on a remittance row the column is nullable [V], hence the fallback |
| `created_at_utc`, `created_date`, `created_at_reliable`, `user_key` | | as 2.9 | |
| `deposit_id`, `deposit_date` | bigint, date | NEW (DATA-28) | NULL until then |
| `office_id` | int | `py.office_id` (nullable); remittance `coalesce(lid.office_id, charge office, patient home office)` | office where the payment was applied (PD-6) |
| `posting_office_id` | int | `py.created_office_id` | working office of the poster; app era only |
| `provider_id` | varchar(50) | `py.provider_id` (nullable); remittance = provider of the paid charge | "credited provider"; NULL = unassigned |
| `patient_id`, `account_id` | int | `py.patient_id`; `patients.account_id` | the patient's **current** account, as on charges (5.3). NULL on capitation rows |
| `posted_account_id` | int | `py.account_id` (stamped on insert when the client sends none [V] `accounts.py` L408-414) | account at posting time; differs from `account_id` after a guarantor change or merge (section 6 #28) |
| `claim_id`, `carrier_id`, `ins_plan_id`, `tier` | | remittance: claim, `coalesce(claim.carrier_id, plan.carrier_id)`, tier plan, tier | NULL on `patient_payments` rows until DATA-33; tier comes from the claim, not the column family (a tertiary payment is stored in `prim_*` [A]) |
| `procedure_id`, `service_date` | | remittance only: paid charge and its service date | |
| `check_number`, `bank_number`, `eob_number`, `eft_trace_number`, `account_payment_id` | | same-named | |
| `payment_group_key` | text | `account_payment_id`, else for remittances `check / EFT / EOB number + payment_date + office_id`, else `source_id` | one physical payment = one key (a cheque is N rows [A]); heuristic until the remittance header exists (DATA-28). Counted with `count(DISTINCT ...)` at query time, never stored in a roll-up |
| `is_void`, `is_reversed_by_refund`, `is_archived` | bool | `py.is_void AND NOT is_reversed_by_refund`; a non-void `patient_refunds` row with `reversed_type = 'payment'` names this payment | see "Reversal with refund" below. Remittance rows also expose `voided_at`, `voided_by`, `void_reason` in `rpt_remittance_lines` |

```sql
CREATE VIEW rpt_remittance_lines AS            -- app-era carrier money, one row per (row, tier)
SELECT pt.tenant_id, l.id AS remittance_line_id, t.tier_col,
       coalesce(nullif(lower(btrim(c.billing_order)), ''), t.tier_col) AS tier,
       l.patient_id, pt.account_id, l.claim_id, l.procedure_id,
       coalesce(l.office_id, pp.office_id, pt.home_office_id) AS office_id,
       pp.provider_id, pp.date_of_service AS service_date,
       coalesce(l.payment_date, l.created_at::date) AS payment_date,   -- nullable column; a NULL would fall out of every
       (l.payment_date IS NULL) AS payment_date_is_fallback,           -- "transaction_date <= :d" filter and break R-05
       l.created_at, l.created_by,
       upper(btrim(coalesce(l.payment_method, ''))) AS payment_method,
       l.check_number, l.bank_number, l.eob_number, l.eft_trace_number,
       coalesce(t.ins_plan_id, c.ins_plan_id) AS ins_plan_id, coalesce(c.carrier_id, ip.carrier_id) AS carrier_id,
       coalesce(t.paid, 0) AS paid_amount, coalesce(t.adj, 0) AS writeoff_amount,
       coalesce(t.ded, 0) AS deductible_amount, t.est AS estimate_at_posting,
       l.is_void, l.voided_at, l.voided_by, l.void_reason
FROM ledger_insurance_details l
JOIN patients pt ON pt.id = l.patient_id
LEFT JOIN patient_procedures pp ON pp.id = l.procedure_id
LEFT JOIN insurance_claims c ON c.id = l.claim_id
CROSS JOIN LATERAL (VALUES
   ('primary',   l.prim_ins_plan_id, l.prim_ins_paid, l.prim_ins_adjust, l.prim_deductible, l.prim_estimated),
   ('secondary', l.sec_ins_plan_id,  l.sec_ins_paid,  l.sec_ins_adjust,  l.sec_deductible,  l.sec_estimated),
   ('tertiary',  l.ter_ins_plan_id,  l.ter_ins_paid,  l.ter_ins_adjust,  l.ter_deductible,  l.ter_estimated)
) AS t(tier_col, ins_plan_id, paid, adj, ded, est)
LEFT JOIN insurance_plans ip ON ip.id = coalesce(t.ins_plan_id, c.ins_plan_id)
WHERE l.legacy_ledger_id IS NULL                 -- migrated archive rows carry no money (section 6 #5)
  AND (coalesce(t.paid, 0) <> 0 OR coalesce(t.adj, 0) <> 0 OR coalesce(t.ded, 0) <> 0);

CREATE VIEW rpt_payments_all AS
SELECT pt.tenant_id, 'pay:' || py.id AS entry_id, 'patient_payments' AS source_table, py.id AS source_id,
       CASE WHEN py.legacy_id IS NOT NULL THEN 'migrated' ELSE 'app' END AS era,
       CASE WHEN k.ptype LIKE 'ins%' THEN 'insurance' ELSE 'patient' END AS payer,
       CASE WHEN py.legacy_id IS NOT NULL AND py.amount > 0 AND f.legacy_positive_payment_policy = 'reversal'
            THEN py.amount ELSE -abs(py.amount) END AS amount,           -- default policy 'credit' = ledger_sign (3.1)
       ((py.legacy_id IS NOT NULL AND py.amount > 0) OR (py.legacy_id IS NULL AND py.amount < 0)) AS is_sign_anomaly,
       k.code, tc.description AS code_description,
       coalesce(tc.txn_class, CASE WHEN k.ptype LIKE 'ins%' THEN 'insurance_payment' ELSE 'patient_payment' END) AS txn_class,
       coalesce(tc.tender_class, 'unknown') AS tender_class, coalesce(tc.deposit_group, 'none') AS deposit_group,
       tc.card_brand, coalesce(tc.counts_as_collection, true) AS counts_as_collection,
       CASE WHEN tc.code IS NULL THEN 'assumed' ELSE 'catalog' END AS collection_class_quality,
       py.payment_date AS transaction_date,               -- coalesce(py.transaction_date, py.payment_date) after DATA-13
       py.payment_date,
       py.created_at AS created_at_utc, <created_date>,
       (py.legacy_id IS NULL OR f.created_at_restored) AS created_at_reliable,
       coalesce('u:' || py.created_by, 'l:' || lower(btrim(py.created_by_legacy))) AS user_key,
       NULL::bigint AS deposit_id, NULL::date AS deposit_date,
       py.office_id, py.created_office_id AS posting_office_id, py.provider_id,
       py.patient_id, pt.account_id, py.account_id AS posted_account_id,
       NULL::varchar AS claim_id, NULL::int AS carrier_id, NULL::int AS ins_plan_id, NULL::text AS tier,
       NULL::varchar AS procedure_id, NULL::date AS service_date,
       py.check_number, py.bank_number, py.eob_number, py.eft_trace_number, py.account_payment_id,
       coalesce(py.account_payment_id, py.id) AS payment_group_key,
       (py.is_void AND NOT rv.is_reversed_by_refund) AS is_void, rv.is_reversed_by_refund, py.is_archived
FROM patient_payments py
JOIN patients pt ON pt.id = py.patient_id
JOIN rpt_tenant_flags f ON f.tenant_id = pt.tenant_id
LEFT JOIN offices o ON o.id = coalesce(py.created_office_id, py.office_id, pt.home_office_id)
CROSS JOIN LATERAL (SELECT lower(btrim(coalesce(py.payment_type, ''))) AS ptype,
                           upper(btrim(coalesce(py.payment_method, ''))) AS code) k   -- py.transaction_code first after DATA-12
LEFT JOIN LATERAL (SELECT c.code, c.description, c.txn_class, c.tender_class, c.deposit_group, c.card_brand, c.counts_as_collection
                   FROM transaction_codes c                 -- the version valid on the row's date; LIMIT 1 = never a fan-out
                   WHERE c.tenant_id = pt.tenant_id AND c.code = k.code AND c.code_kind = 'payment'
                     AND py.payment_date >= c.valid_from AND (c.valid_to IS NULL OR py.payment_date < c.valid_to)
                   ORDER BY c.valid_from DESC LIMIT 1) tc ON true
CROSS JOIN LATERAL (SELECT EXISTS (SELECT 1 FROM patient_refunds r
                                   WHERE r.reversed_type = 'payment' AND r.reversed_id = py.id AND NOT r.is_void)
                           AS is_reversed_by_refund) rv
WHERE k.ptype <> 'adjustment'
UNION ALL
SELECT r.tenant_id, 'rpay:' || r.remittance_line_id || ':' || r.tier_col, 'ledger_insurance_details',
       r.remittance_line_id::text, 'app', 'insurance', -r.paid_amount, false,
       k.code, tc.description,
       coalesce(tc.txn_class, 'insurance_payment'), coalesce(tc.tender_class, 'unknown'),
       coalesce(tc.deposit_group, 'none'), tc.card_brand, coalesce(tc.counts_as_collection, true),
       CASE WHEN tc.code IS NULL THEN 'assumed' ELSE 'catalog' END,
       r.payment_date, r.payment_date,                    -- coalesce(l.transaction_date, payment_date) after DATA-13
       r.created_at, (r.created_at AT TIME ZONE 'UTC' AT TIME ZONE coalesce(o.timezone, 'America/New_York'))::date,
       true, 'u:' || r.created_by, NULL, NULL, r.office_id, NULL, r.provider_id,
       r.patient_id, r.account_id, NULL, r.claim_id, r.carrier_id, r.ins_plan_id, r.tier,
       r.procedure_id, r.service_date, r.check_number, r.bank_number, r.eob_number, r.eft_trace_number, NULL,
       'rm:' || coalesce(r.check_number, r.eft_trace_number, r.eob_number, r.remittance_line_id::text)
             || ':' || r.payment_date::text || ':' || coalesce(r.office_id::text, ''),
       r.is_void, false, false
FROM rpt_remittance_lines r
LEFT JOIN offices o ON o.id = r.office_id
CROSS JOIN LATERAL (SELECT coalesce(nullif(r.payment_method, ''), 'INSURANCE') AS code) k
LEFT JOIN LATERAL (SELECT c.code, c.description, c.txn_class, c.tender_class, c.deposit_group, c.card_brand, c.counts_as_collection
                   FROM transaction_codes c                 -- same rule as above: the version valid on payment_date
                   WHERE c.tenant_id = r.tenant_id AND c.code = k.code AND c.code_kind = 'payment'
                     AND r.payment_date >= c.valid_from AND (c.valid_to IS NULL OR r.payment_date < c.valid_to)
                   ORDER BY c.valid_from DESC LIMIT 1) tc ON true
WHERE r.paid_amount <> 0;
-- after DATA-38, a third branch with the same column list: one row per capitation_payments row —
--   entry_id 'cap:' || id, payer 'insurance', amount = -amount, code = upper(payment_code), class 'capitation_payment',
--   tender 'capitation', transaction_date = payment_date, office_id, provider_id, carrier_id; patient_id, account_id,
--   claim_id, procedure_id = NULL; payment_group_key = entry_id
-- rpt_payments = live rows, same filter as rpt_charges
```

**Reversal with refund.** `POST /patient-payments/{id}/reverse` with a `refund_method` voids the payment **and** writes a
`patient_refunds` row (`reversed_type = 'payment'`, `reason_code = 'reversal'`) [V] `refund_service.py` L207-219. Read
literally (payment gone, refund `+X`) the balance ends `X` too high, the original deposit day loses the payment and net
collections show `-X`; `balance_service` has the same defect today [V] (L176-185, L247-248: void payments are skipped and
every non-void refund is added). The money did come in and did go out, so the layer keeps both legs: the payment stays
live on its date (`is_void = false`, `is_reversed_by_refund = true`) and the refund is a `rfd` leg on its own date linked
to it (2.11). A reversal **without** a refund method is a posting error and stays void. DATA-07 applies the same rule in
`balance_service`; no frontend caller of the endpoint exists today, so the case is latent (section 6 #29 counts it).

**Capitation payments (DATA-38).** A capitation payment is a carrier-level lump sum with no patient: the legacy tool posts
a payment and an offsetting adjustment on a dedicated ledger "Account, Capitation"
(`research/legacy_report_outputs_insurance_txplan_ortho.md`, Capitation Payment), and `patient_payments.patient_id` is NOT
NULL [V], so the row has nowhere to live today. `capitation_payments` (section 7) holds it; the ledger shows two legs per
row, `cap` (payment, `-amount`) and `capa` (offsetting adjustment, `+amount`, 2.11), both with NULL `patient_id` and
`account_id`. Treatment: collections include the `cap` leg (tender `capitation`, `counts_as_collection` from its code);
the pair nets to zero on every date, so it never enters a patient balance (R-02 is per patient), an account, FIFO or
ageing (those read legs with a patient only) and leaves R-04 / R-05 unchanged; the day sheet prints both lines.

Era caveats: migrated payments have tender only as `cash`, `check`, `card`, `ach` or NULL (card brand lost), no code, no
carrier, plan or claim, and `office_id` / `provider_id` may be NULL (unknown `OID` / `PROVIDERID` in the map [V] `s29`).
App insurance payments posted as "insurance check to previous balance" are `patient_payments` rows without a carrier
[A]. A deposit date exists for no row. `payment_date` and `transaction_date` are one stored date in both eras until
DATA-13 (only `TRANDATE` was loaded for migrated rows).

### 2.11 `rpt_adjustments`

Purpose: every money leg that is neither a charge nor a payment: adjustments from the three stores, balance transfers and
refunds from both stores, and (after DATA-38) the offsetting leg of a capitation payment. Grain: one source row (one row
per tier for remittance write-offs).

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `entry_id`, `source_table`, `source_id`, `era` | | prefixes `adjp:` (adjustment row in `patient_payments`), `adja:` (`patient_adjustments`), `rwo:` (remittance write-off), `rfd:` (`patient_refunds`), `capa:` (capitation offset) | |
| `entry_type` | text | from the class: `transfer` -> `transfer`; `opening_balance` -> `opening_balance`; `refund_*` -> `refund`; else `adjustment` | a refund report filters `entry_type = 'refund'` across stores; an opening balance posted by code (`APBAL`, `APBAI`) is the same entry type as a `patient_opening_balances` row |
| `amount` | numeric | section 3.1 | signed A/R effect |
| `code`, `code_description` | text | `adjp`: `payment_method`; `adja`: `adjustment_type`; `rwo`: tenant write-off code (default `INS_WRITE_OFF`); `rfd`: `REFUND` | upper-cased, trimmed |
| `txn_side` | text | catalog (the legacy `Sub Type`); `adja` fallback: `write_off_type` when it holds `production` / `collection` (what the UI writes [V] `AdjustmentsTab.tsx` L156); else `unknown` | `production`, `collection`, `none`, `unknown`. Decides the legacy report column; the analytic bucket is derived from the class first (2.12) |
| `txn_class` | text | catalog; fallback `unclassified` (`transfer` for `BALANCE_TRANSFER`) | section 3.3 vocabulary |
| `is_transfer`, `is_income` | bool | class = `transfer`; catalog `is_income` (default true) | transfers move a balance between patients or accounts and are excluded from totals |
| `transaction_date`, `created_*`, `user_key` | | `payment_date` / `adjustment_date` / remittance `payment_date` / `refund_date` | |
| `linked_service_date` | date | `date_of_service` of the charge named by `procedure_id` (`adja` with a target, `rwo`); else NULL | lets a service-basis total include the adjustment (2.12 `service_date_effective`) |
| `office_id`, `posting_office_id`, `provider_id` | | row columns; write-off: charge provider; refund: provider of the refunded payment | |
| `patient_id`, `account_id`, `posted_account_id` | | `patients.account_id`; the stamp of the row (`adjp`), of the refunded payment (`rfd`), else NULL | current account, as on every leg (5.3) |
| `procedure_id`, `claim_id`, `carrier_id` | | `patient_adjustments.procedure_id`; write-off: line, claim, carrier | the charge an adjustment targets |
| `linked_payment_id` | varchar(50) | `patient_refunds.source_payment_id` | refund -> payment; the allocation layer ties the refund to that payment before anything else (2.13 `refund_link`) |
| `aged_from_date` | date | NEW `patient_payments.aged_from_date` (DATA-26), written on the debit leg of a balance transfer | the age the moved balance had before the transfer; NULL = unknown, the leg ages from its own date and is flagged `age_reset` (2.14) |
| `write_off_type_raw` | text | `patient_adjustments.write_off_type` | two vocabularies, never used for classification [A] |
| `is_void`, `is_archived` | bool | | |

Shorthands in the sketch: `<created_date>` as in 2.9; `<tc: code, date>` = the catalog lateral written out in branch (1)
with `code_kind = 'adjustment'` and the given code and date; `<entry_type>` =
`CASE WHEN x.txn_class = 'transfer' THEN 'transfer' WHEN x.txn_class = 'opening_balance' THEN 'opening_balance' WHEN x.txn_class LIKE 'refund%' THEN 'refund' ELSE 'adjustment' END`.

```sql
CREATE VIEW rpt_adjustments_all AS
-- (1) adjustment rows held in patient_payments: legacy LTYPE 'A', app "+" codes, balance transfers
SELECT pt.tenant_id, 'adjp:' || py.id AS entry_id, 'patient_payments' AS source_table, py.id AS source_id,
       CASE WHEN py.legacy_id IS NOT NULL THEN 'migrated' ELSE 'app' END AS era,
       <entry_type> AS entry_type,
       py.amount AS amount,                                   -- stored sign is the intent in both eras
       k.code, tc.description AS code_description,
       coalesce(tc.txn_side, CASE WHEN k.code = 'BALANCE_TRANSFER' THEN 'none' ELSE 'unknown' END) AS txn_side,
       x.txn_class, (x.txn_class = 'transfer') AS is_transfer, coalesce(tc.is_income, true) AS is_income,
       py.payment_date AS transaction_date, py.created_at AS created_at_utc, <created_date>,
       (py.legacy_id IS NULL OR f.created_at_restored) AS created_at_reliable,
       coalesce('u:' || py.created_by, 'l:' || lower(btrim(py.created_by_legacy))) AS user_key,
       py.office_id, py.created_office_id AS posting_office_id, py.provider_id,
       py.patient_id, pt.account_id, py.account_id AS posted_account_id,
       NULL::varchar AS procedure_id, NULL::varchar AS claim_id, NULL::int AS carrier_id,
       NULL::varchar AS linked_payment_id, NULL::text AS write_off_type_raw,
       py.account_payment_id, NULL::date AS linked_service_date,
       NULL::date AS aged_from_date,                          -- py.aged_from_date after DATA-26
       py.is_void, py.is_archived
FROM patient_payments py
JOIN patients pt ON pt.id = py.patient_id
JOIN rpt_tenant_flags f ON f.tenant_id = pt.tenant_id
LEFT JOIN offices o ON o.id = coalesce(py.created_office_id, py.office_id, pt.home_office_id)
CROSS JOIN LATERAL (SELECT upper(btrim(coalesce(py.payment_method, ''))) AS code) k
LEFT JOIN LATERAL (SELECT c.description, c.txn_side, c.txn_class, c.is_income
                   FROM transaction_codes c
                   WHERE c.tenant_id = pt.tenant_id AND c.code = k.code AND c.code_kind = 'adjustment'
                     AND py.payment_date >= c.valid_from AND (c.valid_to IS NULL OR py.payment_date < c.valid_to)
                   ORDER BY c.valid_from DESC LIMIT 1) tc ON true
CROSS JOIN LATERAL (SELECT coalesce(tc.txn_class, CASE WHEN k.code = 'BALANCE_TRANSFER' THEN 'transfer' ELSE 'unclassified' END) AS txn_class) x
WHERE lower(btrim(coalesce(py.payment_type, ''))) = 'adjustment'
UNION ALL
-- (2) patient_adjustments: app-era credit adjustments (stored positive = credit)
SELECT a.tenant_id, 'adja:' || a.id, 'patient_adjustments', a.id::text, 'app',
       <entry_type>, -a.amount,
       k.code, tc.description,
       coalesce(tc.txn_side, CASE WHEN lower(a.write_off_type) IN ('production', 'collection') THEN lower(a.write_off_type) END, 'unknown'),
       x.txn_class, (x.txn_class = 'transfer'), coalesce(tc.is_income, true),
       a.adjustment_date, a.created_at,
       (a.created_at AT TIME ZONE 'UTC' AT TIME ZONE coalesce(o.timezone, 'America/New_York'))::date, true,
       'u:' || a.created_by,
       a.office_id, NULL, a.provider_id,
       a.patient_id, pt.account_id, NULL,
       a.procedure_id, pp.claim_id, NULL,
       NULL, a.write_off_type,
       NULL, pp.date_of_service, NULL,
       a.is_void, false
FROM patient_adjustments a
JOIN patients pt ON pt.id = a.patient_id
LEFT JOIN offices o ON o.id = coalesce(a.office_id, pt.home_office_id)
LEFT JOIN patient_procedures pp ON pp.id = a.procedure_id
CROSS JOIN LATERAL (SELECT upper(btrim(coalesce(a.adjustment_type, ''))) AS code) k
LEFT JOIN LATERAL <tc: k.code, a.adjustment_date> tc ON true
CROSS JOIN LATERAL (SELECT coalesce(tc.txn_class, 'unclassified') AS txn_class) x
UNION ALL
-- (3) write-off entered with a carrier remittance, one leg per (row, tier)
SELECT r.tenant_id, 'rwo:' || r.remittance_line_id || ':' || r.tier_col, 'ledger_insurance_details',
       r.remittance_line_id::text, 'app',
       'adjustment', -r.writeoff_amount,
       f.ins_write_off_code, tc.description,
       coalesce(tc.txn_side, 'unknown'), coalesce(tc.txn_class, 'contractual_writeoff'), false, coalesce(tc.is_income, true),
       r.payment_date, r.created_at,
       (r.created_at AT TIME ZONE 'UTC' AT TIME ZONE coalesce(o.timezone, 'America/New_York'))::date, true,
       'u:' || r.created_by,
       r.office_id, NULL, r.provider_id,
       r.patient_id, r.account_id, NULL,
       r.procedure_id, r.claim_id, r.carrier_id,
       NULL, NULL,
       NULL, r.service_date, NULL,
       r.is_void, false
FROM rpt_remittance_lines r
JOIN rpt_tenant_flags f ON f.tenant_id = r.tenant_id
LEFT JOIN offices o ON o.id = r.office_id
LEFT JOIN LATERAL <tc: f.ins_write_off_code, r.payment_date> tc ON true
WHERE r.writeoff_amount <> 0
UNION ALL
-- (4) patient_refunds: money returned (stored positive = debit)
SELECT r.tenant_id, 'rfd:' || r.id, 'patient_refunds', r.id::text, 'app',
       'refund', r.amount,
       'REFUND', tc.description,
       coalesce(tc.txn_side, 'collection'),
       CASE WHEN lower(coalesce(sp.payment_type, '')) LIKE 'ins%' THEN 'refund_insurance'
            ELSE coalesce(tc.txn_class, 'refund_patient') END,
       false, coalesce(tc.is_income, true),
       r.refund_date, r.created_at,
       (r.created_at AT TIME ZONE 'UTC' AT TIME ZONE coalesce(o.timezone, 'America/New_York'))::date, true,
       'u:' || r.created_by,
       coalesce(r.office_id, pt.home_office_id), NULL, sp.provider_id,
       r.patient_id, pt.account_id, sp.account_id,
       NULL, NULL, NULL,
       r.source_payment_id, NULL,
       NULL, NULL, NULL,
       r.is_void, false
FROM patient_refunds r
JOIN patients pt ON pt.id = r.patient_id
LEFT JOIN patient_payments sp ON sp.id = r.source_payment_id
LEFT JOIN offices o ON o.id = coalesce(r.office_id, pt.home_office_id)
LEFT JOIN LATERAL <tc: 'REFUND', r.refund_date> tc ON true;
-- after DATA-38, branch (5) with the same column list: one row per capitation_payments row —
--   entry_id 'capa:' || id, entry_type 'adjustment', amount = +amount, code = upper(adjustment_code),
--   class 'capitation_writeoff', is_income false, transaction_date = payment_date, office_id, provider_id, carrier_id;
--   patient_id, account_id = NULL
-- rpt_adjustments = live rows, same filter as rpt_charges
```

A refund written by a payment reversal (2.10) is an ordinary branch-(4) row: its payment stays live, so the two legs net
to zero across their two dates. Era caveats: every migrated adjustment is `unclassified` with `txn_side = 'unknown'` (the
code was not migrated), so net production and net collections cannot be split for history until DATA-12; legacy refunds
and legacy transfers are indistinguishable from other `A` rows (they are outside every transfer and refund test until
then); a void has no date or user except on remittance rows (DATA-14).

### 2.12 `rpt_ledger_entries`

Purpose: the missing ledger — the normalised union of every money leg (AD-10, PD-2). Grain: one money leg.
`SUM(amount)` over any scope is that scope's balance. `rpt_ledger_entries_all` adds voided and archive rows.

| Column | Type | Meaning |
|---|---|---|
| `tenant_id`, `entry_id`, `source_table`, `source_id`, `era` | | identity; `entry_id` is unique across legs (R-01) |
| `entry_type` | text | `charge`, `patient_payment`, `insurance_payment`, `adjustment`, `refund`, `transfer`, `opening_balance` |
| `ledger_bucket` | text | the **analytic** class of a row, derived from the code's class first and its side second (vocabulary below) |
| `journal_column` | text | the **legacy report column** of a row: `charges`, `payment` or `adjust`, derived from the legacy Sub Type (`txn_side`) alone |
| `txn_side`, `txn_class`, `code`, `code_kind` | text | `code_kind` = `procedure`, `payment`, `adjustment`, `system` |
| `payer`, `tender_class`, `counts_as_collection`, `is_transfer`, `is_income` | | payment / adjustment attributes, NULL where not applicable |
| `amount`, `debit`, `credit` | numeric(14,2) | signed; `debit = greatest(amount, 0)`, `credit = greatest(-amount, 0)` |
| `office_fee`, `est_patient`, `est_insurance` | numeric | charges only (journal `UCR`, `Est. Pat.`, `Est. Ins.` columns) |
| `service_date` | date | the leg's own service date: charges, remittance payments, opening rows; NULL elsewhere |
| `service_date_effective`, `service_date_source` | date, text | `coalesce(own service_date, date_of_service of the linked charge, transaction_date)`; `own`, `linked_charge` or `transaction_date` |
| `transaction_date`, `payment_date`, `created_date`, `created_at_utc`, `created_at_reliable`, `deposit_date` | | section 4; `payment_date` on payment legs only |
| `office_id`, `posting_office_id` | int | the row's own (transaction) office; the poster's working office |
| `provider_id`, `hygienist_id` | varchar(50) | section 5 |
| `patient_id`, `account_id`, `posted_account_id` | int | `account_id` = the patient's current account on **every** leg; `posted_account_id` = the stamp where one exists (5.3) |
| `claim_id`, `procedure_id`, `carrier_id`, `linked_payment_id` | | links for drill-down |
| `user_key`, `check_number`, `account_payment_id`, `aged_from_date`, `is_sign_anomaly` | | |
| `is_void`, `is_archived` | bool | `_all` only meaningful there |

`service_date_effective` is the column a `date_basis = service` aggregate binds to. Without it a service-basis total of
the ledger would silently drop every adjustment and payment (their own `service_date` is NULL) and net production by
service date would equal charged production.

| Leg (`entry_id` prefix) | Source | `entry_type` | `amount` | `service_date_effective` | `transaction_date` |
|---|---|---|---|---|---|
| `chg` | `rpt_charges_all` | `charge` | `+fee` | `date_of_service` (own) | same (NEW column after DATA-13) |
| `pay` | `rpt_payments_all`, `patient_payments` rows | `patient_payment` / `insurance_payment` by `payer`; `opening_balance` for that class | `-abs(amount)`; `+amount` for a positive migrated row under policy `reversal` | `transaction_date` | `payment_date` (own ledger date after DATA-13) |
| `rpay` | `rpt_payments_all`, remittance rows | `insurance_payment` | `-paid_amount` | service date of the paid charge | `payment_date` |
| `cap` | `rpt_payments_all`, capitation rows (DATA-38) | `insurance_payment` | `-amount` | `transaction_date` | `payment_date` |
| `adjp` | `rpt_adjustments_all` (1) | `adjustment` / `refund` / `transfer` / `opening_balance` | `amount` verbatim | `transaction_date` | `payment_date` |
| `adja` | `rpt_adjustments_all` (2) | same | `-amount` | charge date through `procedure_id`, else `transaction_date` | `adjustment_date` |
| `rwo` | `rpt_adjustments_all` (3) | `adjustment` | `-writeoff_amount` | charge date through `procedure_id` | `payment_date` |
| `rfd` | `rpt_adjustments_all` (4) | `refund` | `+amount` | `transaction_date` | `refund_date` |
| `capa` | `rpt_adjustments_all` (5) (DATA-38) | `adjustment` | `+amount` | `transaction_date` | `payment_date` |
| `open` | `patient_opening_balances`, one row per non-zero bucket | `opening_balance` | `+bucket amount` | `as_of_date - 0 / 31 / 61 / 91 / 121` days | `as_of_date` |

The opening offsets put each stored bucket inside the matching bucket of every shipped set on the as-of date (`legacy`
30-59 / 60-89 / 90-119 / 120+ and `common` 31-60 / 61-90 / 91+, 2.14); from there the leg ages like any other debit.

**`ledger_bucket` vocabulary** (ten values, exactly one per row):

| Bucket | Rows | In net production (PD-1) | In collections (PD-3) |
|---|---|---|---|
| `production` | charges whose code has `is_production` | yes | |
| `non_production_charge` | charges whose code has `is_production = false` (`ACBIL`, `ACBILO` instalment billing) | no | |
| `production_adjustment` | adjustments of class `contractual_writeoff` (both eras, whatever Sub Type the tenant gave the code — O-2), and every other income adjustment whose side is `production` | yes | |
| `collection` | payment legs with `counts_as_collection` | | gross |
| `non_collection_payment` | payment legs with `counts_as_collection = false` (`COLPY` and other non-cash payment codes) | | no |
| `collection_adjustment` | income adjustments whose side is `collection`: refunds, payment reversals, other collection-side codes | | net |
| `non_income_adjustment` | adjustments with `is_income = false` or class `contract_movement` / `sales_tax` (and the `capa` offset of a capitation payment) | no | no |
| `unclassified_adjustment` | adjustments whose code has no catalog row (every migrated adjustment until DATA-12) | shown beside both nets | |
| `transfer` | class `transfer` | no | no |
| `opening_balance` | class `opening_balance` on any leg (`open` rows, `APBAL` / `APBAI` debits, `APBAC` / `APBIC` credits) | no | no |

Why the class comes first: with a side-only rule the previous-balance codes (`APBAL`, `APBAI`: `+`, Production) would be
production adjustments, the conversion credits (`APBAC`, `APBIC`) collections, the contract movements (`AFEED`, `AFEEI`,
`ACCNN`, `ACCNC`) and `ATAX` production or collection adjustments — net production would contain previous balances and be
reduced by every financed contract, and net collections would be reduced by sales tax
(`research/compliance_and_financial_semantics.md` §14.1: opening balance excluded from production, sales tax never
production, contract movement its own class). `txn_side` is kept unchanged as the legacy Sub Type, so parity reports still
print each code in the column the legacy tool prints it in. A consumer that enumerates buckets (the A/R movement identity
of `05_metric_catalog.md`) must cover all ten; the five that are neither production nor collections —
`non_production_charge`, `non_collection_payment`, `non_income_adjustment`, `transfer`, `opening_balance` — move A/R only.

```sql
CREATE VIEW rpt_ledger_entries_all AS
SELECT c.tenant_id, c.entry_id, 'patient_procedures' AS source_table, c.charge_id AS source_id, c.era,
       'charge' AS entry_type,
       CASE WHEN c.is_production THEN 'production' ELSE 'non_production_charge' END AS ledger_bucket,
       CASE WHEN c.is_production THEN 'charges' ELSE 'adjust' END AS journal_column,
       'production' AS txn_side, 'charge' AS txn_class, c.procedure_code AS code, 'procedure' AS code_kind,
       NULL::text AS payer, NULL::text AS tender_class, NULL::bool AS counts_as_collection, false AS is_transfer, true AS is_income,
       c.amount, c.office_fee, c.est_patient, c.est_insurance,
       c.service_date, c.service_date AS service_date_effective, 'own' AS service_date_source,
       c.transaction_date, NULL::date AS payment_date,
       c.created_date, c.created_at_utc, c.created_at_reliable, NULL::date AS deposit_date,
       c.office_id, NULL::int AS posting_office_id, c.provider_id, c.hygienist_id,
       c.patient_id, c.account_id, c.posted_account_id,
       c.claim_id, c.charge_id AS procedure_id, c.primary_carrier_id AS carrier_id,
       c.user_key, NULL::varchar AS check_number, NULL::varchar AS account_payment_id, NULL::varchar AS linked_payment_id,
       NULL::date AS aged_from_date, false AS is_sign_anomaly, c.is_void, c.is_archived
FROM rpt_charges_all c
UNION ALL
SELECT p.tenant_id, p.entry_id, p.source_table, p.source_id, p.era,
       CASE WHEN p.txn_class = 'opening_balance' THEN 'opening_balance'
            WHEN p.payer = 'insurance' THEN 'insurance_payment' ELSE 'patient_payment' END,
       CASE WHEN p.txn_class = 'opening_balance' THEN 'opening_balance'
            WHEN p.counts_as_collection THEN 'collection' ELSE 'non_collection_payment' END,
       'payment',
       'collection', p.txn_class, p.code, 'payment',
       p.payer, p.tender_class, p.counts_as_collection, false, true,
       p.amount, NULL, NULL, NULL,
       p.service_date, coalesce(p.service_date, p.transaction_date),
       CASE WHEN p.service_date IS NOT NULL THEN 'linked_charge' ELSE 'transaction_date' END,
       p.transaction_date, p.payment_date,
       p.created_date, p.created_at_utc, p.created_at_reliable, p.deposit_date,
       p.office_id, p.posting_office_id, p.provider_id, NULL,
       p.patient_id, p.account_id, p.posted_account_id,
       p.claim_id, p.procedure_id, p.carrier_id,
       p.user_key, p.check_number, p.account_payment_id, NULL,
       NULL, p.is_sign_anomaly, p.is_void, p.is_archived
FROM rpt_payments_all p
UNION ALL
SELECT a.tenant_id, a.entry_id, a.source_table, a.source_id, a.era, a.entry_type,
       CASE WHEN a.is_transfer THEN 'transfer'
            WHEN a.txn_class = 'opening_balance' THEN 'opening_balance'
            WHEN NOT a.is_income OR a.txn_class IN ('contract_movement', 'sales_tax') THEN 'non_income_adjustment'
            WHEN a.txn_class = 'contractual_writeoff' OR a.txn_side = 'production' THEN 'production_adjustment'
            WHEN a.txn_side = 'collection' THEN 'collection_adjustment'
            ELSE 'unclassified_adjustment' END,
       CASE WHEN a.txn_side = 'production' THEN 'charges' ELSE 'adjust' END,
       a.txn_side, a.txn_class, a.code, 'adjustment', NULL, NULL, NULL, a.is_transfer, a.is_income,
       a.amount, NULL, NULL, NULL,
       NULL, coalesce(a.linked_service_date, a.transaction_date),
       CASE WHEN a.linked_service_date IS NOT NULL THEN 'linked_charge' ELSE 'transaction_date' END,
       a.transaction_date, NULL,
       a.created_date, a.created_at_utc, a.created_at_reliable, NULL,
       a.office_id, a.posting_office_id, a.provider_id, NULL,
       a.patient_id, a.account_id, a.posted_account_id,
       a.claim_id, a.procedure_id, a.carrier_id,
       a.user_key, NULL, a.account_payment_id, a.linked_payment_id,
       a.aged_from_date, false, a.is_void, a.is_archived
FROM rpt_adjustments_all a
UNION ALL
SELECT ob.tenant_id, 'open:' || ob.id || ':' || b.bucket, 'patient_opening_balances', ob.id::text, 'app',
       'opening_balance', 'opening_balance', 'adjust',
       'none', 'opening_balance', 'OPENING_BALANCE', 'system',
       NULL, NULL, NULL, false, false,
       b.bucket_amount, NULL, NULL, NULL,
       d.as_of - b.age_offset, d.as_of - b.age_offset, 'own',
       d.as_of, NULL,
       ob.created_at::date, ob.created_at, true, NULL,
       pt.home_office_id, NULL, NULL, NULL,
       ob.patient_id, pt.account_id, NULL,
       NULL, NULL, NULL,
       'u:' || ob.created_by, NULL, NULL, NULL,
       NULL, false, false, false
FROM patient_opening_balances ob
JOIN patients pt ON pt.id = ob.patient_id
CROSS JOIN LATERAL (SELECT coalesce(ob.as_of_date, ob.created_at::date) AS as_of) d
CROSS JOIN LATERAL (VALUES ('current', ob."current", 0), ('over_30', ob.over_30, 31), ('over_60', ob.over_60, 61),
                           ('over_90', ob.over_90, 91), ('over_120', ob.over_120, 121)) AS b(bucket, bucket_amount, age_offset)
WHERE b.bucket_amount <> 0;

CREATE VIEW rpt_ledger_entries AS
SELECT e.*, greatest(e.amount, 0) AS debit, greatest(-e.amount, 0) AS credit
FROM rpt_ledger_entries_all e JOIN rpt_tenant_flags f USING (tenant_id)
WHERE NOT e.is_void AND (NOT e.is_archived OR f.include_legacy_archive);
```

Reading the ledger (dataset semantics; the metric formulas themselves belong to `05_metric_catalog.md`):

| Legacy column / figure | Rows |
|---|---|
| Journal `Charges`; Executive Day Sheet `Production` rows (`Services` plus one row per production adjustment code) | `journal_column = 'charges'`: production charges, and adjustments whose legacy Sub Type is Production — they print with charges by design (`research/legacy_report_outputs_daily_my.md` §3.2) |
| Journal `Payment`; day-sheet payment rows | `journal_column = 'payment'`; printed negative. A row with `counts_as_collection = false` keeps its own code line |
| Journal `Adjust`; day-sheet collection-adjustment rows | `journal_column = 'adjust'`: adjustments whose Sub Type is Collection or unknown, transfers, opening rows, and **contract-billing charges** (`non_production_charge`), which the legacy journal prints in `Adjust` with a positive amount as "Periodic Contract Billing" (`research/legacy_report_outputs_daily_my.md` L238-240; `legacy_report_outputs_monthly_mgmt_ledger_statements.md` L321-323). They are never added to `Charges` or to day-sheet `Production` |
| `A. R. Impact` | `amount` of every row |
| Estimated patient / insurance split of the summary block | charges: `est_patient`, `est_insurance` (they always sum to the fee); payments: by `payer` |
| Gross / charged production base | `rpt_charges.office_fee` / `charged_fee` where `is_production` |
| Net production, collections (analytics) | by `ledger_bucket`, table above — never by `journal_column` |

Row filters: none beyond live. Opening balances, transfers, contract movements and conversion credits are in the ledger
(they move balances) and are kept out of production and collections by their bucket, not by omission, whichever store or
code they were posted with.

Era caveats: for migrated rows `ledger_bucket` is exact for charges, `collection` (labelled `assumed`, 2.10) for payments
and `unclassified_adjustment` for every adjustment — a migrated previous-balance, transfer or contract row cannot be told
from any other `A` row until DATA-12; `created_date` is reliable only when `created_at_reliable`; `posting_office_id`,
`deposit_date` are NULL; `transaction_date` equals `service_date` on charges, so a transaction-versus-service bridge
(R-19) is zero for charges until DATA-13. The app-era in-app insurance legs (`rpay`, `rwo`) are the money that no balance
reads today (PD-2).

### 2.13 `rpt_payment_allocations` (with `rpt_explicit_allocations`, `rpt_fifo_core()`, `rpt_fifo_allocations()`)

Purpose: tie each credit leg (payment, credit adjustment, write-off) to the debit leg it pays, so that collections can be
attributed to the producing provider and office (PD-7), shown by service month (WaterFall) and so that open items can be
aged (PD-4). Real links where they exist, derived oldest-first elsewhere, plus an explicit `unallocated` remainder.

| Object | Kind | Content |
|---|---|---|
| `rpt_explicit_allocations` | view | the raw real links: app splits in `payment_allocations`, the single target of a `patient_adjustments` row, remittance lines (a carrier payment or write-off is posted on a charge), refund -> refunded payment, and (after DATA-26) remainders the writer parked as unallocated. **Input of the function only** — it tests neither voids, dates nor over-application, and no report reads it |
| `rpt_fifo_core(p_tenant_id, p_account_ids, p_as_of, p_unit)` | function | the one computation: validates and caps the real links, pairs transfers, applies every remaining credit to the remaining debits of the same unit oldest first, and returns three row kinds — `allocation`, `unallocated_credit`, `open_debit` |
| `rpt_fifo_allocations(p_tenant_id, p_account_ids, p_as_of, p_unit DEFAULT 'account')` | function | the `allocation` and `unallocated_credit` rows; called directly for one account (Account Allocation, Walkout, Statement, Routing Slip) |
| `rpt_ar_open_items(...)` | function | the `open_debit` and `unallocated_credit` rows with ageing attributes (2.14) |
| `rpt_payment_allocations` | view = `SELECT * FROM rpt_derived_allocations` | tenant-wide dataset. The table (DATA-26) holds the **complete** output of `rpt_fifo_allocations(tenant, NULL, current_date, 'account')` — every method from `explicit` to `unallocated` — with the credit and debit attributes stored at build time; nothing is unioned to it, so a link can never be served twice or uncapped. Rebuilt nightly and per touched account |

**Allocation unit (`p_unit`).** PD-4 fixes the guarantor account as the unit; the legacy tool has a second one.

| `p_unit` | Unit | Used by |
|---|---|---|
| `account` (default) | `coalesce(account_id, -patient_id)` — the current account of the patient; a patient without an account is its own unit | Aging Report by Home Office, Statements, Walkout, Account Allocation, Routing Slip, every allocation report, provider income |
| `account_office` | (the same, `office_id` of the leg) — only legs recorded in one office see each other; a real link is kept only when both legs sit in the same office | Aging Report (legacy: "evaluates only the transactions recorded in the selected office(s)"), A/R by transaction office (PD-6 default), the per-office A/R block of the Executive Summary |

With one account-level pass a charge at office A and a payment at office B simply cancel, so the legacy Aging Report
(A owes 100, B holds a 100 credit — the vendor's own example,
`research/legacy_report_outputs_monthly_mgmt_ledger_statements.md` L104, L432-452) could not be produced and per-office
ageing would not equal the per-office ledger balance that the day sheet and the Executive Summary roll forward. The
office unit restores both (invariant R-14b). This narrows PD-4: account-level allocation holds for the home-office view
only (challenge O-11).

Columns of `rpt_payment_allocations` (`rpt_derived_allocations`):

| Column | Type | Meaning |
|---|---|---|
| `tenant_id`, `account_id` | int | the unit (`account`); negative `account_id` = `-patient_id` of a patient without an account |
| `allocation_id` | text | stable id: the source id for real links (`pa:`, `at:`, `rl:`, `rf:`), `tp:<credit_entry_id>:<debit_entry_id>` for transfer pairs, `fifo:<credit_entry_id>:<debit_entry_id>` for derived rows, `un:<credit_entry_id>[:held]` for remainders |
| `method` | text | `explicit`, `adjustment_target`, `remittance_line`, `refund_link`, `transfer_pair`, `derived_fifo`, `unallocated` |
| `is_derived` | bool | true for `derived_fifo` and for an `unallocated` remainder the function computed; false for real links and for a remainder persisted by the writer. Every report that uses derived rows prints "allocation derived (oldest first)" |
| `unallocated_reason` | text | `unallocated` rows only: `credit_balance` (derived: the unit has no open debit left), or the writer's reason (`prepayment`, `overpayment`, `no_open_patient_portion`, `manual_hold`) |
| `credit_entry_id`, `debit_entry_id` | text | `rpt_ledger_entries.entry_id`; `debit_entry_id` is NULL for `unallocated` |
| `amount` | numeric | positive; per credit leg the rows (including `unallocated`) sum to the credit amount, per debit leg they never exceed the debit (R-06) |
| `allocation_date` | date | explicit: `payment_allocations.alloc_date` (else created date); remittance: `payment_date`; refund link: `refund_date`; derived: the later of the two transaction dates; NULL for `unallocated` |
| credit attributes | | `credit_entry_type`, `credit_class`, `credit_ledger_bucket`, `payer`, `tender_class`, `counts_as_collection`, `credit_transaction_date`, `credit_created_date`, `credit_office_id`, `credit_provider_id`, `credit_patient_id` |
| debit attributes | | `debit_entry_type`, `debit_ledger_bucket`, `service_date` (`service_date_effective` of the debit), `allocation_office_id` (office of the debit), `allocation_provider_id` (provider of the debit; NULL = "Unassigned provider", which is not "Unallocated"), `allocation_hygienist_id`, `procedure_code`, `debit_patient_id`, `claim_id` |
| `allocation_target` | text | what the credit paid: `production` (production charge), `non_production_charge`, `debit_adjustment` (finance charge, NSF fee, payment reversal, other debit adjustment), `refund`, `opening_balance`, `transfer`, `unallocated` |

Reading rules: **provider income** = rows whose credit is a payment (`credit_ledger_bucket = 'collection'`) and whose
`allocation_target IN ('production', 'non_production_charge', 'debit_adjustment')`, grouped by `allocation_provider_id`;
**refunded** = target `refund` (the payment was returned, so it is nobody's income — a refund reverses the allocations it
came from, `research/compliance_and_financial_semantics.md` §25); **Unallocated** = `method = 'unallocated'` only. A payment
matched to an opening balance or to a transfer-in is neither provider income nor unallocated. Invariant R-08: by provider
+ unallocated + refunded + opening / transfer = the sum of the payments.

```sql
CREATE VIEW rpt_explicit_allocations AS            -- raw links; validated and capped by rpt_fifo_core()
SELECT pt.tenant_id, 'pa:' || pa.id AS allocation_id, 'explicit' AS method,
       CASE WHEN pa.adjustment_id IS NOT NULL THEN 'adja:' || pa.adjustment_id
            WHEN lower(coalesce(py.payment_type, '')) = 'adjustment' THEN 'adjp:' || pa.payment_id
            ELSE 'pay:' || pa.payment_id END AS credit_entry_id,
       'chg:' || pa.procedure_id AS debit_entry_id, pa.amount,
       coalesce(pa.alloc_date, pa.created_at::date) AS allocation_date, NULL::text AS unallocated_reason
FROM payment_allocations pa
JOIN patients pt ON pt.id = pa.patient_id
LEFT JOIN patient_payments py ON py.id = pa.payment_id
WHERE pa.amount > 0 AND pa.procedure_id IS NOT NULL     -- the 6,951 migrated rows all have amount 0 [D]
                                                        -- after DATA-26: AND pa.reversed_at IS NULL
UNION ALL
SELECT a.tenant_id, 'at:' || a.id, 'adjustment_target', 'adja:' || a.id, 'chg:' || a.procedure_id, a.amount, a.adjustment_date, NULL
FROM patient_adjustments a
WHERE a.procedure_id IS NOT NULL AND a.amount > 0
  AND NOT EXISTS (SELECT 1 FROM payment_allocations x WHERE x.adjustment_id = a.id)
UNION ALL
SELECT r.tenant_id, 'rl:' || r.remittance_line_id || ':' || r.tier_col || ':pay', 'remittance_line',
       'rpay:' || r.remittance_line_id || ':' || r.tier_col, 'chg:' || r.procedure_id, r.paid_amount, r.payment_date, NULL
FROM rpt_remittance_lines r WHERE r.procedure_id IS NOT NULL AND r.paid_amount > 0
UNION ALL
SELECT r.tenant_id, 'rl:' || r.remittance_line_id || ':' || r.tier_col || ':wo', 'remittance_line',
       'rwo:' || r.remittance_line_id || ':' || r.tier_col, 'chg:' || r.procedure_id, r.writeoff_amount, r.payment_date, NULL
FROM rpt_remittance_lines r WHERE r.procedure_id IS NOT NULL AND r.writeoff_amount > 0
UNION ALL                                          -- a refund is tied to the payment it returns
SELECT r.tenant_id, 'rf:' || r.id, 'refund_link', 'pay:' || r.source_payment_id, 'rfd:' || r.id, r.amount, r.refund_date, NULL
FROM patient_refunds r WHERE r.source_payment_id IS NOT NULL AND r.amount > 0;
-- after DATA-26, one more branch: remainders parked by the writer —
--   SELECT tenant_id, 'un:' || pa.id, 'unallocated', <credit entry id as above>, NULL, pa.amount, pa.allocated_at::date,
--          pa.unallocated_reason FROM payment_allocations pa
--   WHERE pa.allocation_method = 'unallocated' AND pa.procedure_id IS NULL AND pa.reversed_at IS NULL

CREATE FUNCTION rpt_fifo_core(p_tenant_id int, p_account_ids int[], p_as_of date, p_unit text DEFAULT 'account')
RETURNS TABLE (row_kind text,                      -- allocation | unallocated_credit | open_debit
               account_id int, unit_office_id int, allocation_id text, credit_entry_id text, debit_entry_id text,
               amount numeric, method text, allocation_date date, is_derived bool, unallocated_reason text,
               age_date date, age_reset bool)
LANGUAGE sql STABLE AS $$
WITH e0 AS (      -- live ledger legs of the scope as of the date, each tagged with its unit
  SELECT l.entry_id, l.amount, l.transaction_date, l.is_transfer,
         coalesce(l.account_id, -l.patient_id) AS unit_id,
         CASE WHEN p_unit = 'account_office' THEN coalesce(l.office_id, 0) ELSE 0 END AS unit_office,
         coalesce(l.aged_from_date, l.service_date, l.transaction_date) AS age_date,
         (l.is_transfer AND l.amount > 0 AND l.aged_from_date IS NULL) AS age_reset,
         coalesce(l.account_payment_id, 'd:' || l.transaction_date) AS pair_key
  FROM rpt_ledger_entries l
  WHERE l.tenant_id = p_tenant_id AND l.patient_id IS NOT NULL AND l.amount <> 0 AND l.transaction_date <= p_as_of
    AND (p_account_ids IS NULL OR coalesce(l.account_id, -l.patient_id) = ANY (p_account_ids))),
tr AS (           -- transfer legs, numbered so that equal and opposite legs of one unit pair off one to one
  SELECT e0.*, row_number() OVER (PARTITION BY unit_id, unit_office, pair_key, abs(amount), sign(amount)
                                  ORDER BY entry_id) AS rn
  FROM e0 WHERE is_transfer),
tp AS (           -- a pair inside one unit moves nothing: it is matched to itself and takes no part in ageing
  SELECT c.unit_id, c.unit_office, c.entry_id AS credit_entry_id, d.entry_id AS debit_entry_id, d.amount,
         greatest(c.transaction_date, d.transaction_date) AS allocation_date
  FROM tr c JOIN tr d ON d.unit_id = c.unit_id AND d.unit_office = c.unit_office AND d.pair_key = c.pair_key
                     AND d.amount = -c.amount AND d.rn = c.rn
  WHERE c.amount < 0),
e AS (SELECT * FROM e0
      WHERE entry_id NOT IN (SELECT tp.credit_entry_id FROM tp UNION ALL SELECT tp.debit_entry_id FROM tp)),
x0 AS (           -- real links: both legs live and in scope, right signs, same unit, made on or before the date
  SELECT a.allocation_id, a.method, a.credit_entry_id, a.debit_entry_id, a.amount, a.allocation_date,
         c.unit_id, c.unit_office, d.amount AS debit_amount, -c.amount AS credit_amount
  FROM rpt_explicit_allocations a
  JOIN e c ON c.entry_id = a.credit_entry_id AND c.amount < 0
  JOIN e d ON d.entry_id = a.debit_entry_id AND d.amount > 0 AND d.unit_id = c.unit_id AND d.unit_office = c.unit_office
  WHERE a.tenant_id = p_tenant_id AND a.debit_entry_id IS NOT NULL AND a.allocation_date <= p_as_of),
x1 AS (           -- cap per debit, in allocation order: the links on a charge never exceed the charge
  SELECT x0.*, greatest(least(amount, debit_amount - coalesce(sum(amount) OVER (
                 PARTITION BY debit_entry_id ORDER BY allocation_date, allocation_id
                 ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)), 0) AS amt_d
  FROM x0),
x AS (            -- cap per credit; a refund link is served first (the refund takes the payment back)
  SELECT x1.*, greatest(least(amt_d, credit_amount - coalesce(sum(amt_d) OVER (
                 PARTITION BY credit_entry_id ORDER BY (method = 'refund_link') DESC, allocation_date, allocation_id
                 ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)), 0) AS amt
  FROM x1),
xd AS (SELECT debit_entry_id, sum(amt) AS amt FROM x GROUP BY 1),
xc AS (SELECT credit_entry_id, sum(amt) AS amt FROM x GROUP BY 1),
h AS (            -- remainders the writer parked as unallocated (DATA-26); the derivation never re-applies them
  SELECT a.credit_entry_id, sum(a.amount) AS held_amt, min(a.unallocated_reason) AS unallocated_reason
  FROM rpt_explicit_allocations a
  WHERE a.tenant_id = p_tenant_id AND a.method = 'unallocated' AND a.allocation_date <= p_as_of
  GROUP BY 1),
d AS (            -- debit legs: what the capped links leave open (never negative)
  SELECT e.unit_id, e.unit_office, e.entry_id, e.age_date, e.age_reset, e.transaction_date,
         e.amount - coalesce(xd.amt, 0) AS open_amt
  FROM e LEFT JOIN xd ON xd.debit_entry_id = e.entry_id WHERE e.amount > 0),
c AS (            -- credit legs: held part and free part (the excess of an over-linked credit stays free)
  SELECT e.unit_id, e.unit_office, e.entry_id, e.transaction_date, h.unallocated_reason,
         least(coalesce(h.held_amt, 0), -e.amount - coalesce(xc.amt, 0)) AS held_amt,
         -e.amount - coalesce(xc.amt, 0) - least(coalesce(h.held_amt, 0), -e.amount - coalesce(xc.amt, 0)) AS free_amt
  FROM e LEFT JOIN xc ON xc.credit_entry_id = e.entry_id LEFT JOIN h ON h.credit_entry_id = e.entry_id
  WHERE e.amount < 0),
dq AS (SELECT d.*, sum(open_amt) OVER w - open_amt AS lo, sum(open_amt) OVER w AS hi
       FROM d WHERE open_amt > 0 WINDOW w AS (PARTITION BY unit_id, unit_office ORDER BY age_date, entry_id)),
cq AS (SELECT c.*, sum(free_amt) OVER w - free_amt AS lo, sum(free_amt) OVER w AS hi
       FROM c WHERE free_amt > 0 WINDOW w AS (PARTITION BY unit_id, unit_office ORDER BY transaction_date, entry_id)),
tot AS (SELECT unit_id, unit_office, max(d_hi) AS total_open, max(c_hi) AS total_free
        FROM (SELECT unit_id, unit_office, hi AS d_hi, NULL::numeric AS c_hi FROM dq
              UNION ALL SELECT unit_id, unit_office, NULL, hi FROM cq) s GROUP BY 1, 2)
SELECT 'allocation', x.unit_id, nullif(x.unit_office, 0), x.allocation_id, x.credit_entry_id, x.debit_entry_id, x.amt,
       x.method, x.allocation_date, false, NULL::text, NULL::date, NULL::bool
FROM x WHERE x.amt > 0
UNION ALL         -- transfer pairs that cancel inside the unit
SELECT 'allocation', tp.unit_id, nullif(tp.unit_office, 0), 'tp:' || tp.credit_entry_id || ':' || tp.debit_entry_id,
       tp.credit_entry_id, tp.debit_entry_id, tp.amount, 'transfer_pair', tp.allocation_date, false, NULL, NULL, NULL
FROM tp
UNION ALL         -- oldest debit first: overlap of the two cumulative intervals
SELECT 'allocation', cq.unit_id, nullif(cq.unit_office, 0), 'fifo:' || cq.entry_id || ':' || dq.entry_id,
       cq.entry_id, dq.entry_id, least(cq.hi, dq.hi) - greatest(cq.lo, dq.lo), 'derived_fifo',
       greatest(cq.transaction_date, dq.transaction_date), true, NULL, NULL, NULL
FROM cq JOIN dq ON dq.unit_id = cq.unit_id AND dq.unit_office = cq.unit_office AND dq.lo < cq.hi AND cq.lo < dq.hi
UNION ALL         -- credit parked by the writer
SELECT 'unallocated_credit', c.unit_id, nullif(c.unit_office, 0), 'un:' || c.entry_id || ':held', c.entry_id, NULL,
       c.held_amt, 'unallocated', NULL, false, c.unallocated_reason, c.transaction_date, NULL
FROM c WHERE c.held_amt > 0
UNION ALL         -- free credit beyond every open debit of the unit
SELECT 'unallocated_credit', cq.unit_id, nullif(cq.unit_office, 0), 'un:' || cq.entry_id, cq.entry_id, NULL,
       cq.hi - greatest(cq.lo, coalesce(tot.total_open, 0)), 'unallocated', NULL, true, 'credit_balance',
       cq.transaction_date, NULL
FROM cq LEFT JOIN tot USING (unit_id, unit_office)
WHERE cq.hi > coalesce(tot.total_open, 0)
UNION ALL         -- debit not reached by any free credit
SELECT 'open_debit', dq.unit_id, nullif(dq.unit_office, 0), NULL, NULL, dq.entry_id,
       dq.hi - greatest(dq.lo, coalesce(tot.total_free, 0)), NULL, NULL, NULL, NULL, dq.age_date, dq.age_reset
FROM dq LEFT JOIN tot USING (unit_id, unit_office)
WHERE dq.hi > coalesce(tot.total_free, 0);
$$;

CREATE FUNCTION rpt_fifo_allocations(p_tenant_id int, p_account_ids int[], p_as_of date, p_unit text DEFAULT 'account')
RETURNS TABLE (account_id int, unit_office_id int, allocation_id text, credit_entry_id text, debit_entry_id text,
               amount numeric, method text, allocation_date date, is_derived bool, unallocated_reason text)
LANGUAGE sql STABLE AS $$
SELECT account_id, unit_office_id, allocation_id, credit_entry_id, debit_entry_id, amount, method, allocation_date,
       is_derived, unallocated_reason
FROM rpt_fifo_core(p_tenant_id, p_account_ids, p_as_of, p_unit) WHERE row_kind <> 'open_debit';
$$;

-- nightly and per touched account (DATA-26): the table is the function's complete output plus leg attributes
INSERT INTO rpt_derived_allocations
SELECT p_tenant_id, a.account_id, a.allocation_id, a.method, a.is_derived, a.unallocated_reason,
       a.credit_entry_id, a.debit_entry_id, a.amount, a.allocation_date,
       c.entry_type, c.txn_class, c.ledger_bucket, c.payer, c.tender_class, c.counts_as_collection,
       c.transaction_date, c.created_date, c.office_id, c.provider_id, c.patient_id,
       b.entry_type, b.ledger_bucket, b.service_date_effective, b.office_id, b.provider_id, b.hygienist_id,
       CASE WHEN b.entry_type = 'charge' THEN b.code END, b.patient_id, b.claim_id,
       CASE WHEN a.debit_entry_id IS NULL THEN 'unallocated'
            WHEN b.entry_type = 'charge' AND b.ledger_bucket = 'production' THEN 'production'
            WHEN b.entry_type = 'charge' THEN 'non_production_charge'
            WHEN b.entry_type IN ('refund', 'opening_balance', 'transfer') THEN b.entry_type
            ELSE 'debit_adjustment' END
FROM rpt_fifo_allocations(p_tenant_id, :account_ids, current_date, 'account') a
JOIN rpt_ledger_entries c ON c.tenant_id = p_tenant_id AND c.entry_id = a.credit_entry_id
LEFT JOIN rpt_ledger_entries b ON b.tenant_id = p_tenant_id AND b.entry_id = a.debit_entry_id;
CREATE VIEW rpt_payment_allocations AS SELECT * FROM rpt_derived_allocations;
```

Rules of the computation:

| Rule | Detail |
|---|---|
| Legs | debit legs are every positive leg (charge, debit adjustment, refund, opening balance, transfer in); credit legs are every negative leg. Legs without a patient (capitation) are outside. A link whose "credit" is a debit (a `+` adjustment named in `payment_allocations`) or whose "debit" is a credit is dropped by the sign tests in `x0` |
| Order | debits by `coalesce(aged_from_date, service_date, transaction_date)`, credits by `transaction_date`; `entry_id` breaks ties |
| Real links are capped **inside the function** | Nothing in the write path caps a link at the fee: `allocate_payment` compares the split only with the payment amount [V] `billing_service.py` L64-78, a remittance is checked for sign only [V] L365-377, and the frontend caps a carrier line against the remaining insurance **estimate** [V] `FE:insurancePayment.ts` L272. A charge can therefore carry more links than its fee (patient prepaid by split and the carrier paid later; primary plus secondary; adjustment target plus remittance). `x1` caps the links per debit in allocation order; the excess is not lost — it stays in the credit's free amount and flows to the next open debit or to `unallocated`. Example: fee 800, patient payment 800 split to the charge, carrier later pays 400 on the line: the charge is closed by the 800, the 400 becomes a free credit (unallocated when nothing else is open), balance `-400` = ledger |
| Refunds | a refund with a `source_payment_id` takes its payment back first (`refund_link`), ahead of that payment's splits, which are then capped by what is left; the charge they covered is open again. A refund without a source is an ordinary debit |
| Transfers | a pair of transfer legs in one unit (same `account_payment_id`, or same date and opposite equal amounts) is matched to itself (`transfer_pair`) and removed from ageing — moving a balance between two members of one account must not reset its age. A transfer debit that arrives from another unit ages from `aged_from_date` (the oldest open age of the moved balance, written by the transfer writer after DATA-26); without it the leg ages from the transfer date and carries `age_reset = true`, which ageing reports print |
| Parked remainders | a remainder the writer stored as `unallocated` (DATA-26) is returned as such (`is_derived = false`) and is **not** re-applied, even when the unit has open debits — that is the row the legacy Unallocated report exists to list |
| As-of | every input is cut at `p_as_of` (leg date, link date); the result is a consistent re-computation as of that date, not a record of when money was applied. It changes when a back-dated entry arrives, so pay runs and closed periods read the frozen copy (DATA-26 persists allocations for app rows; DATA-30 snapshots) |
| Cost | set-based: two window sorts per unit and hash joins, no per-row subquery. One account is index-driven; a tenant-wide run (about 2.7M legs [D]) is a background job |

**What "Unallocated" means, and what P1 shows.** While allocations are only derived, a credit is `unallocated` exactly
when its unit has no open debit left — it equals the unit's credit balance by construction. The legacy
**Unallocated Payment/Adjustments** report asks a different question: credits that sit unapplied while the account still
owes (prepayments, a patient payment that may only cover patient portions while the insurance portion is open, wrong
patient or provider); its `Exclude Credit Balances` option isolates exactly those, and on derived rows that run is empty
by construction. The report is therefore meaningful only on persisted allocations (rating SCHEMA(26), section 11), and
the `Unallocated` row of Income Allocation on derived rows equals the credit balances — the catalog entry prints that.

DATA-26 persists allocation at posting for app rows, with the legacy rule
(`research/legacy_report_outputs_monthly_mgmt_ledger_statements.md` L539-540): an insurance payment goes to its claim
line; a patient payment goes to the oldest charges of the account that have an open **patient portion** (`est_patient`
minus patient credits already applied), unless the user chose lines; whatever is left is stored as a `payment_allocations`
row with `allocation_method = 'unallocated'` and an `unallocated_reason`. When a later charge or a re-allocation absorbs
it, the writer closes that row (`reversed_at`) and inserts dated rows — history is never rewritten. Fixture test: an
account with an open insurance portion and a patient overpayment lists the overpayment under `Exclude Credit Balances`.

Collections **by provider** are allocation-based (PD-7), and tenant-wide allocations exist from P2 (DATA-26), while the
brief ships the Collection Report and the first Main and Provider Dashboards in P1. P1 therefore reads the **credited
provider** (`rpt_payments.provider_id`, labelled "provider on payment", NULL = "Unassigned") — the column the legacy
Collection Report "by Provider" prints anyway. From P2 the dashboards switch to `allocation_provider_id` and the earlier
months are restated (`rpt_metric_values.is_restated`). Per-account reports call the function from P1. Building
`rpt_derived_allocations` nightly already in P1 is the alternative (open decision O-12).

Era caveats: every migrated row is `derived_fifo`, `transfer_pair` or `unallocated`. Denticon allocated at entry time,
patient payments oldest-first and insurance payments to their claim line; a derived result will not reproduce a legacy
Income Allocation print line by line, and the Unallocated report cannot be reproduced for migrated history at all. App
rows are real links only when the user split the payment, for remittances and for refunds with a source payment, until
DATA-26.

### 2.14 `rpt_ar_open_items()` and ageing

Purpose: accounts receivable as of a date, by open item, for ageing (PD-4). Kind: function over `rpt_fifo_core()` (2.13)
— the same computation that produces the allocations returns the remainders, so allocations and ageing can never
disagree. Grain: one open debit leg, or one unallocated part of a credit leg, per allocation unit.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `account_id`, `patient_id` | int | ledger leg | `account_id` = current account (5.3) |
| `unit_office_id` | int | the office of the unit under `p_unit = 'account_office'`; NULL under `account` | equals `office_id` of the leg in the office unit |
| `item_kind` | text | `open_debit` or `unallocated_credit` | credits are reported separately, never netted into a bucket |
| `entry_id`, `entry_type`, `procedure_code` | text | ledger leg | drill-down |
| `office_id`, `home_office_id` | int | leg's own office; `accounts.home_office_id` | transaction-office and home-office attribution (PD-4, PD-6) |
| `provider_id` | varchar(50) | leg's provider | "Transaction Provider" grouping; "Preferred Provider" comes from `rpt_patient_dim` |
| `age_date`, `age_days`, `age_reset` | date, int, bool | charge: `service_date`; other debits: `transaction_date`; transfer in: `aged_from_date`, else its own date with `age_reset`; opening rows: synthetic date (2.12); credit: `transaction_date`; `p_as_of - age_date` | ageing starts when the procedure is completed (legacy rule) |
| `original_amount`, `open_amount` | numeric | leg amount; debit: the part no credit reached (always > 0); credit: the unallocated part as a negative number | Σ `open_amount` over both kinds = ledger balance of the scope (R-05) |
| `open_insurance_est`, `open_patient` | numeric | split rule below; `open_patient = open_amount - open_insurance_est` | the legacy `Ins:` / `Pat:` lines |
| `split_quality` | text | `exact` (not a charge, or an app-era charge), `estimate` (migrated charge with a claim), `unknown` (migrated charge without `claim_id`, or whose claim has `outstanding_quality = 'unknown'`) | printed as a footnote when not `exact` |
| `claim_status_basis` | text | `current` until `claim_status_history` exists (DATA-25) | for a past `p_as_of` the money is cut at the date but the claim status is today's; reports print "claim status as of today" |
| `is_derived`, `unallocated_reason` | bool, text | from the core | a parked remainder (`is_derived = false`) versus a credit balance |

```sql
CREATE FUNCTION rpt_ar_open_items(p_tenant_id int, p_as_of date, p_account_ids int[] DEFAULT NULL,
                                  p_unit text DEFAULT 'account')
RETURNS TABLE (tenant_id int, account_id int, unit_office_id int, patient_id int, item_kind text, entry_id text,
               entry_type text, procedure_code varchar, office_id int, home_office_id int, provider_id varchar,
               age_date date, age_days int, age_reset bool, original_amount numeric, open_amount numeric,
               open_insurance_est numeric, open_patient numeric, split_quality text, claim_status_basis text,
               is_derived bool, unallocated_reason text)
LANGUAGE sql STABLE AS $$
WITH i AS (
  SELECT k.row_kind, k.unit_office_id, coalesce(k.debit_entry_id, k.credit_entry_id) AS entry_id,
         CASE WHEN k.row_kind = 'open_debit' THEN k.amount ELSE -k.amount END AS open_amount,
         k.age_date, coalesce(k.age_reset, false) AS age_reset, k.is_derived, k.unallocated_reason
  FROM rpt_fifo_core(p_tenant_id, p_account_ids, p_as_of, p_unit) k
  WHERE k.row_kind <> 'allocation')
SELECT p_tenant_id, l.account_id, i.unit_office_id, l.patient_id, i.row_kind, i.entry_id, l.entry_type,
       CASE WHEN l.entry_type = 'charge' THEN l.code END, l.office_id, ac.home_office_id, l.provider_id,
       i.age_date, p_as_of - i.age_date, i.age_reset, l.amount, i.open_amount,
       s.ins, i.open_amount - s.ins,
       CASE WHEN ch.charge_id IS NULL OR ch.era = 'app' THEN 'exact'
            WHEN ch.claim_id IS NULL OR pc.outstanding_quality = 'unknown' THEN 'unknown' ELSE 'estimate' END,
       'current', i.is_derived, i.unallocated_reason
FROM i
JOIN rpt_ledger_entries l ON l.tenant_id = p_tenant_id AND l.entry_id = i.entry_id   -- the implementation carries these
LEFT JOIN accounts ac ON ac.id = l.account_id                                         -- columns through the core CTEs
LEFT JOIN rpt_charges ch ON ch.tenant_id = p_tenant_id AND ch.entry_id = i.entry_id AND i.row_kind = 'open_debit'
LEFT JOIN LATERAL (                        -- carrier money already on the charge, per tier, up to the date
  SELECT coalesce(sum(r.paid_amount + r.writeoff_amount) FILTER (WHERE r.tier = 'primary'), 0) AS settled_primary,
         coalesce(sum(r.paid_amount + r.writeoff_amount) FILTER (WHERE r.tier <> 'primary'), 0) AS settled_other
  FROM rpt_remittance_lines r
  WHERE r.procedure_id = ch.charge_id AND NOT r.is_void AND r.payment_date <= p_as_of) rm ON true
LEFT JOIN rpt_claim_facts pc ON pc.claim_id = ch.claim_id          -- the claim that owns the line (primary)
LEFT JOIN LATERAL (SELECT f.status_class, f.outstanding_quality    -- the secondary claim of the same family, if created
                   FROM rpt_claim_facts f
                   WHERE f.tenant_id = p_tenant_id AND f.patient_id = ch.patient_id AND f.claim_family_no = pc.claim_family_no
                     AND f.tier = 'secondary' AND f.status_class NOT IN ('deleted', 'void')
                   ORDER BY f.claim_id LIMIT 1) sc ON true
LEFT JOIN LATERAL (SELECT true AS has_slot FROM rpt_insurance_coverage v
                   WHERE v.patient_id = ch.patient_id AND v.category = 'dental' AND v.tier = 'secondary' LIMIT 1) sl ON true
CROSS JOIN LATERAL (SELECT
     CASE WHEN ch.charge_id IS NULL OR pc.outstanding_quality = 'unknown'
               OR (ch.era = 'migrated' AND ch.claim_id IS NULL) THEN 0   -- migrated charge without a claim link: unknown
          WHEN (ch.claim_id IS NULL AND NOT ch.hold_claim)        -- billable, claim not created yet
            OR pc.status_class IN ('unsent', 'sent', 'partially_paid')
          THEN greatest(ch.est_ins_primary - rm.settled_primary, 0) ELSE 0 END
   + CASE WHEN ch.charge_id IS NULL OR ch.est_ins_secondary <= 0 OR sc.outstanding_quality = 'unknown' THEN 0
          WHEN sc.status_class IN ('unsent', 'sent', 'partially_paid')
            OR (sc.status_class IS NULL AND sl.has_slot)           -- secondary claim not created yet
          THEN greatest(ch.est_ins_secondary - rm.settled_other, 0) ELSE 0 END AS expected) x
CROSS JOIN LATERAL (SELECT CASE WHEN i.row_kind = 'open_debit' THEN least(i.open_amount, x.expected) ELSE 0 END AS ins) s;
$$;
```

Split rule in words (every term is defined by the SQL above):

- The insurance portion still **expected** on an open charge is the sum over tiers of
  `greatest(estimate of the tier - carrier payments and write-offs posted on the charge for that tier up to p_as_of, 0)`.
- The primary tier counts while the charge has no claim yet and is not on hold (a charge with no primary estimate
  contributes 0), or its claim is `unsent`, `sent` or `partially_paid`. The secondary tier counts while the secondary
  claim of the same claim family is `unsent`, `sent` or `partially_paid`, or has not been created while the patient holds
  a secondary dental slot and the line carries a secondary estimate. Tertiary and later tiers carry no stored estimate
  and count as 0. This
  is why the legacy `Ins:` line (which includes secondary insurance) is not the Outstanding Claims total (which omits
  claims not yet created) — `research/legacy_report_outputs_monthly_mgmt_ledger_statements.md` L417-418.
- "Paid on the charge" = non-void `rpt_remittance_lines` with `procedure_id` = the charge and `payment_date <= p_as_of`,
  all tiers; write-offs likewise. Claim status is the current one.
- `open_insurance_est = least(open_amount, expected)`; `open_patient` is the rest. Every other debit leg is 100 % patient.
- Migrated charges: carrier payments are not linked to charges, so only the claim status can retire the expectation. A
  migrated claim counts only while its stored status is submitted or pending (2.20 `outstanding_quality`); without the
  `claim_id` backfill (section 6 #3) `open_insurance_est` is 0 and `split_quality` is `unknown`.

```sql
CREATE TABLE rpt_aging_bucket_sets (
  set_key varchar(20) NOT NULL, bucket_key varchar(20) NOT NULL, label varchar(30) NOT NULL,
  min_days int NOT NULL, max_days int, sort_order int NOT NULL, PRIMARY KEY (set_key, bucket_key));
-- legacy          : current 0-29 | over_30 30-59 | over_60 60-89 | over_90 90-119 | over_120 120+
-- legacy_extended : as legacy up to over_90, then 120-149 | 150-179 | 180-269 | 270-364 | 365+   (the Excel-only option)
-- common          : d0_30 0-30 | d31_60 31-60 | d61_90 61-90 | d90_plus 91+

-- Aging Report (:unit = 'account_office', office = unit_office_id)
-- Aging Report by Home Office (:unit = 'account', office = home_office_id)
WITH i AS (SELECT * FROM rpt_ar_open_items(:tenant_id, :report_date, NULL, :unit)
           WHERE CASE WHEN :unit = 'account' THEN home_office_id ELSE unit_office_id END = ANY (:office_ids))
SELECT i.account_id, b.bucket_key,                         -- debits only: a bucket never contains a credit
       sum(i.open_amount) AS balance, sum(i.open_insurance_est) AS est_insurance, sum(i.open_patient) AS est_patient
FROM i JOIN rpt_aging_bucket_sets b ON b.set_key = :bucket_set
     AND i.age_days >= b.min_days AND (b.max_days IS NULL OR i.age_days <= b.max_days)
WHERE i.item_kind = 'open_debit'
GROUP BY 1, 2;
-- credit balance: one figure per account (and office in the office unit), no bucket join
SELECT account_id, sum(open_amount) AS credit_balance FROM i WHERE item_kind = 'unallocated_credit' GROUP BY 1;
-- "Total Bal." of a row = sum of its buckets + credit_balance. "Include Credit Balance" keeps the rows whose total is
-- negative; "Show only credit balances" keeps only those. Credits of one account never reduce a bucket of another.
```

The vendor's two bucket definitions differ by one day (0-29 vs 0-30); the `legacy` set fixes the article definition
(`research/legacy_report_outputs_monthly_mgmt_ledger_statements.md` §2.6). Edges are data, not code (PD-4).

**The two legacy ageing reports are two units, not two groupings of one result.**

| | Aging Report | Aging Report by Home Office |
|---|---|---|
| `p_unit` | `account_office` | `account` |
| Transactions considered | only those recorded at the office | all transactions of the account |
| Account listed under | each office where it has a non-zero office balance | the account's home office |
| Vendor example: charge 100 at A, payment 100 at B | A shows 100 due, B shows a 100 credit (with credits included) | account not listed (0) |
| Charges 100 at A (older) and 100 at B, payment 100 at B | A = 100, B = 0 | one account row of 100, aged from A's service date |
| Sum over all offices | organisation A/R only when credits are included | organisation A/R |
| Ties to | per-office ledger balance `sum(amount) GROUP BY office_id` (R-14b) — the A/R the day sheet and the Executive Summary roll forward | account balance (R-03, R-05) |

Era caveats: correct for both eras as a total, subject to the completeness of the migrated ledger (2.9, R-21); the
per-item split and the provider of the paying credit are derived for history. Migrated transfers are unclassified, so a
balance moved between accounts before the migration ages from the date of its debit leg. An as-of date in the past is
recomputed from today's rows (later voids and edits rewrite it) until day close and snapshots exist (DATA-29, DATA-30);
both units are snapshotted (`rpt_ar_snapshot.attribution`). Tenant-wide runs are background runs.

### 2.15 `rpt_appointment_facts`

Purpose: one classification of appointments from flags and stamps. Grain: one `appointments` row, block-outs, deleted
rows and the legacy archive partition included and flagged. Base: `v_appointment_fact` in
`analysis/be_data_scheduling.md` §8.1; changes are the single `status_class`, the archive / delete separation, the
same-day charge test and the booked-production roll-up.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id` | int | `offices.tenant_id` via `office_id` (own column after DATA-15) | `appointments` has no `tenant_id` [V] |
| `appointment_id`, `era` | | `a.id`; `a.legacy_id IS NOT NULL` | |
| `office_id`, `office_group_id`, `office_local_today` | | `a.office_id`; office; `(now() AT TIME ZONE timezone)::date` | appointment office |
| `provider_id`, `provider_kind`, `operatory_id`, `patient_id`, `patient_home_office_id` | | `a.*`; provider dimension; `patients.home_office_id` | the one provider on the visit; legacy "Include Patient Home Office" |
| `appointment_date`, `start_time`, `end_time`, `duration_minutes` | date, time, time, int | `a.date`, `a.start_time`, `a.end_time`, `a.duration` | office-local; use `duration`, not `end_time - start_time` [A] |
| `is_block` | bool | `a.is_blocked` | excluded from counts, subtracted from capacity |
| `is_patientless`, `is_placeholder_patient` | bool | `a.patient_id IS NULL AND NOT a.is_blocked`; `rpt_patient_dim.is_placeholder_patient` | an appointment without a patient record is not a block: it is counted as an appointment and listed by New Patients via Appointments, together with appointments of placeholder patients (2.7) |
| `is_deleted` | bool | `a.deleted_at IS NOT NULL` (NEW, DATA-17); until then `a.is_archived AND (a.legacy_id IS NULL OR an audit_logs row with resource_type 'appointments', resource_id = a.id, method 'DELETE' exists)` | true delete |
| `is_legacy_archive` | bool | `a.is_archived AND a.legacy_id IS NOT NULL AND NOT is_deleted` | loaded from `APPTH_ARCHIVE` [V] `s26` L36-39; the legacy "Appointment Type: Regular / Archived" criterion |
| `status_raw`, `status_norm` | text | `a.status`; lower-cased, trimmed, spaces and hyphens to `_` (section 3.2) | never filter on the raw string |
| `is_cancelled`, `is_no_show`, `is_completed`, `is_arrived`, `is_confirmed` | bool | flag OR stamp OR normalised status | flags, stamps and string can disagree [A]; they are OR-ed |
| `status_class` | text | first match: `cancelled`, `no_show`, `completed`, `past_unresolved` (date before the office's today), `in_office`, `confirmed`, `unconfirmed`, `scheduled` | exactly one class per row |
| `has_charge_same_day`, `is_kept` | bool | a live **visit-code production** charge for the same patient, office and date; `completed OR (past_unresolved AND has_charge_same_day)` | "Missed Appointments Not Marked As Missed" = `past_unresolved AND NOT has_charge_same_day`. A broken-appointment fee, a `Z` code or a contract-billing code posted that day does not make the visit kept — legacy rule: an appointment whose only posted codes are not visit codes still counts as missed (`research/legacy_report_outputs_appointment_recall_referral.md` L264-265) |
| `is_new_patient` | bool | `a.is_new_patient` | false on every migrated row [A] |
| `line_count`, `scheduled_fee`, `scheduled_est_insurance` | int, numeric | lateral sum over live `appointment_procedures` | scheduled production; `line_count = 0` is reported, not hidden |
| `has_hygiene_code` | bool | a booked line in group `hygiene_visit` on the appointment date, through `rpt_code_in_group()` | appointment typing until DATA-43 adds `appointment_type_id` |
| `procedure_label`, `campaign_code`, `treatment_plan_id` | | `a.procedure_label`, `a.campaign_id`, `a.treatment_plan_id` | `campaign_id` holds `campaigns.code`, not an id [A] |
| `booking_source`, `booking_request_id` | text, varchar(40) | `a.booking_source` (NEW, DATA-17: `staff`, `appointnow`, `appointnow_api`, `sms`, `vendor`); until then `appointnow` when a `booking_requests` row names the appointment (`booking_requests.appointment_id` [V]), else `staff` | legacy "Only AppointNow Appointments: Both / Appoint Now / Appoint Now API"; the API value cannot be told apart before DATA-17 |
| `notes`, `cancellation_note`, `cancellation_reason`, `add_to_call_list` | | same-named | Appointment Detail `Notes`; Cancelled List prints reason and note. Reason and call-list flag are effectively empty until the Scheduler sends them (DATA-17) |
| `confirmed_on`, `checked_in_on`, `checked_out_on`, `posted_on` | timestamp | same-named (naive UTC) | app era only; overwritten, never cleared. `In Operatory`, `Available`, the acting users and the confirmation channel do not exist before DATA-17 |
| `created_at_utc`, `created_date`, `created_at_reliable`, `created_by_user_id`, `lead_days` | | `a.created_at`; local date; `a.legacy_id IS NULL`; `a.created_by`; `appointment_date - created_date` | NULL / unreliable on migrated rows |
| `has_lab` | bool | `a.has_lab` | detail in `rpt_lab_cases` |

```sql
CREATE VIEW rpt_appointment_facts AS
SELECT o.tenant_id, a.id AS appointment_id, CASE WHEN a.legacy_id IS NOT NULL THEN 'migrated' ELSE 'app' END AS era,
       a.office_id, o.office_group_id, t.office_local_today, a.provider_id, pr.provider_kind, a.operatory_id,
       a.patient_id, pd.home_office_id AS patient_home_office_id,
       a.date AS appointment_date, a.start_time, a.end_time, a.duration AS duration_minutes,
       a.is_blocked AS is_block, (a.patient_id IS NULL AND NOT a.is_blocked) AS is_patientless,
       coalesce(pd.is_placeholder_patient, false) AS is_placeholder_patient, x.is_deleted,
       (a.is_archived AND a.legacy_id IS NOT NULL AND NOT x.is_deleted) AS is_legacy_archive,
       a.status AS status_raw, s.status_norm,
       c.is_cancelled, c.is_no_show, c.is_completed, c.is_arrived, c.is_confirmed,
       CASE WHEN c.is_cancelled THEN 'cancelled'
            WHEN c.is_no_show THEN 'no_show'
            WHEN c.is_completed THEN 'completed'
            WHEN a.date < t.office_local_today THEN 'past_unresolved'
            WHEN c.is_arrived THEN 'in_office'
            WHEN c.is_confirmed THEN 'confirmed'
            WHEN s.status_norm IN ('unconfirmed', 'left_message') THEN 'unconfirmed'
            ELSE 'scheduled' END AS status_class,
       v.has_charge_same_day,
       (c.is_completed OR (a.date < t.office_local_today AND NOT c.is_cancelled AND NOT c.is_no_show AND v.has_charge_same_day)) AS is_kept,
       a.is_new_patient, l.line_count, l.scheduled_fee, l.scheduled_est_insurance, l.has_hygiene_code,
       a.procedure_label, a.campaign_id AS campaign_code, a.treatment_plan_id,
       CASE WHEN br.booking_request_id IS NOT NULL THEN 'appointnow' ELSE 'staff' END AS booking_source,   -- coalesce(a.booking_source, ...) after DATA-17
       br.booking_request_id, a.notes, a.cancellation_note, a.cancellation_reason, a.add_to_call_list,
       a.confirmed_on, a.checked_in_on, a.checked_out_on, a.posted_on,
       a.created_at AS created_at_utc,
       CASE WHEN a.legacy_id IS NULL THEN (a.created_at AT TIME ZONE 'UTC' AT TIME ZONE o.timezone)::date END AS created_date,
       (a.legacy_id IS NULL) AS created_at_reliable, a.created_by AS created_by_user_id, a.has_lab
FROM appointments a
JOIN offices o ON o.id = a.office_id
JOIN rpt_tenant_flags fl ON fl.tenant_id = o.tenant_id
LEFT JOIN rpt_provider_dim pr ON pr.provider_id = a.provider_id
LEFT JOIN rpt_patient_dim pd ON pd.patient_id = a.patient_id     -- the implementation reads the two columns from patients
CROSS JOIN LATERAL (SELECT (now() AT TIME ZONE o.timezone)::date AS office_local_today) t
CROSS JOIN LATERAL (SELECT lower(regexp_replace(btrim(coalesce(a.status, '')), '[ -]+', '_', 'g')) AS status_norm) s
CROSS JOIN LATERAL (SELECT
     (a.is_cancelled OR s.status_norm IN ('cancelled', 'canceled')) AS is_cancelled,
     (a.is_missed OR s.status_norm IN ('missed', 'no_show')) AS is_no_show,
     (a.checked_out_on IS NOT NULL OR a.is_posted OR s.status_norm IN ('checked_out', 'completed')) AS is_completed,
     (a.checked_in_on IS NOT NULL OR s.status_norm IN ('in_reception', 'arrived', 'checked_in', 'available', 'in_operatory', 'in_chair')) AS is_arrived,
     (a.confirmed_on IS NOT NULL OR s.status_norm = 'confirmed') AS is_confirmed) c
CROSS JOIN LATERAL (SELECT (a.is_archived AND (a.legacy_id IS NULL OR EXISTS (
       SELECT 1 FROM audit_logs al WHERE al.resource_type = 'appointments' AND al.resource_id = a.id AND al.method = 'DELETE'))) AS is_deleted) x
LEFT JOIN LATERAL (SELECT b.id AS booking_request_id FROM booking_requests b
                   WHERE b.appointment_id = a.id ORDER BY b.created_at LIMIT 1) br ON true
LEFT JOIN LATERAL (SELECT count(*) AS line_count, coalesce(sum(ap.fee), 0) AS scheduled_fee,
                          coalesce(sum(ap.insurance_estimate), 0) AS scheduled_est_insurance,
                          coalesce(bool_or(rpt_code_in_group(o.tenant_id, 'hygiene_visit', ap.procedure_code, a.date)), false)
                            AS has_hygiene_code          -- EXISTS inside the function: one row per booked line, never two
                   FROM appointment_procedures ap
                   WHERE ap.appointment_id = a.id AND (NOT ap.is_archived OR (a.is_archived AND a.legacy_id IS NOT NULL))) l ON true
CROSS JOIN LATERAL (SELECT EXISTS (
       SELECT 1 FROM patient_procedures pp JOIN procedure_codes pc ON pc.code = pp.procedure_code
       WHERE pp.patient_id = a.patient_id AND pp.date_of_service = a.date AND pp.office_id = a.office_id
         AND NOT pp.is_void AND (NOT pp.is_archived OR fl.include_legacy_archive)
         AND coalesce(pc.is_visit_code, pp.procedure_code ~ '^D[0-9]{4}$')        -- the visit rule of rpt_charges
         AND coalesce(pc.is_production, pc.category <> 'Account')) AS has_charge_same_day) v;
```

Row filters applied by consumers: `NOT is_block AND NOT is_deleted`, and `NOT is_legacy_archive` unless the report's
"Archived" option is chosen. Fixture rows required by DATA-16: an appointment with a same-day non-visit fee code stays
`past_unresolved` and not kept; an appointment whose booked code sits in two dated member rows of `hygiene_visit` has
`line_count = 1`. Era caveats: created date and user, confirmation, arrival and check-out stamps, the new-patient flag,
booking source and cancellation reasons do not exist on migrated rows; a kept migrated visit that was never checked out
is `past_unresolved` and becomes `is_kept` only through the same-day charge; an unknown source `OID` fell back to the
first office [A], so a slice of migrated appointments may sit in the wrong office. No history exists in either era:
"status as of", reschedule counts and cancel lead time need `appointment_events` (DATA-17).

### 2.16 `rpt_appointment_procedures`

Purpose: scheduled production. Grain: one booked line (`appointment_procedures`) of a non-deleted appointment.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `appointment_procedure_id`, `appointment_id`, `era` | | `ap.id`; from the appointment | |
| `office_id`, `appointment_date`, `start_time`, `patient_id`, `status_class`, `is_block`, `is_legacy_archive` | | appointment facts | filter `status_class NOT IN ('cancelled', 'no_show')` for scheduled production |
| `provider_id`, `appointment_provider_id` | varchar(50) | `coalesce(ap.provider_id, appointment provider)`; the appointment's provider | per-line provider; the provider the recall reports print as `Prdr` |
| `procedure_code`, `tooth`, `surface` | | `ap.*` | |
| `scheduled_fee`, `est_insurance`, `est_patient` | numeric | `ap.fee`; `ap.insurance_estimate`; `coalesce(ap.est_patient, greatest(fee - insurance_estimate, 0))` | a client or plan-item snapshot, never priced by the server [A] |
| `duration_minutes` | int | `coalesce(ap.duration_minutes, procedure_codes.default_duration_minutes)` | |
| `treatment_plan_item_id` | varchar(50) | `ap.treatment_plan_item_id` | booking of planned treatment |
| `line_status_raw` | text | `ap.status` | not a completion flag (`TP`, `Planned`, `Completed`, `Existing`) [A] |

```sql
CREATE VIEW rpt_appointment_procedures AS
SELECT f.tenant_id, ap.id AS appointment_procedure_id, ap.appointment_id, f.era, f.office_id, f.appointment_date,
       f.start_time, f.patient_id, f.status_class, f.is_block, f.is_legacy_archive,
       coalesce(ap.provider_id, f.provider_id) AS provider_id, f.provider_id AS appointment_provider_id,
       ap.procedure_code, ap.tooth, ap.surface,
       ap.fee AS scheduled_fee, ap.insurance_estimate AS est_insurance,
       coalesce(ap.est_patient, greatest(ap.fee - ap.insurance_estimate, 0)) AS est_patient,
       coalesce(ap.duration_minutes, pc.default_duration_minutes) AS duration_minutes,
       ap.treatment_plan_item_id, ap.status AS line_status_raw
FROM appointment_procedures ap
JOIN rpt_appointment_facts f ON f.appointment_id = ap.appointment_id
JOIN procedure_codes pc ON pc.code = ap.procedure_code
WHERE NOT f.is_deleted AND (NOT ap.is_archived OR f.is_legacy_archive);
```

Era caveats: 10,125 lines for 176,453 migrated appointments [D], so historical scheduled production is absent; lines are
not re-priced when coverage changes; "scheduled at the start of the day" needs the daily snapshot of section 9.

### 2.17 `rpt_visits`, `rpt_provider_visits`, `rpt_visit_audit()` and `rpt_appointment_note_audit()`

`rpt_visits` — purpose: the one definition of a visit: a patient-office-day with at least one live production charge
whose code is a visit code. Grain: `(tenant_id, patient_id, office_id, visit_date)`. Replaces the two disagreeing
last-visit derivations in `patient_intake_service._visits` and `letter_service._appointments` [A].

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `patient_id`, `office_id`, `visit_date` | | `rpt_charges` grouped; `visit_date = service_date` | legacy `Patient Visits` = row count; `Patients Seen` = distinct patients |
| `primary_provider_id` | varchar(50) | provider with the highest charged fee that day | one provider per visit, for additive doctor / hygiene splits only; **not** a provider filter |
| `procedure_count`, `charged_production`, `gross_production` | int, numeric | `count(*)`, `sum(charged_fee)`, `sum(office_fee)` | |
| `has_planned_work`, `era` | bool, text | `bool_or(is_planned)`; `min(era)` | |

`rpt_provider_visits` — purpose: who saw whom. Grain: `(tenant_id, patient_id, office_id, provider_id, visit_date)`: a
patient treated by a hygienist and a dentist on one day is one row for each. Every provider-filtered or provider-grouped
visit figure reads this view: Patients Seen with a `PROVIDER` filter, Executive Summary grouped by provider, the provider
dashboards (Seen Patients, Production Per Visit), provider-restricted runs (PD-11). Counts are not additive across
providers (the same patient-day can appear under two); the practice total comes from `rpt_visits`.

```sql
CREATE VIEW rpt_visits AS
SELECT c.tenant_id, c.patient_id, c.office_id, c.service_date AS visit_date,
       (array_agg(c.provider_id ORDER BY c.charged_fee DESC, c.charge_id))[1] AS primary_provider_id,
       count(*) AS procedure_count, sum(c.charged_fee) AS charged_production, sum(c.office_fee) AS gross_production,
       bool_or(c.is_planned) AS has_planned_work, min(c.era) AS era
FROM rpt_charges c
WHERE c.is_visit_code AND c.is_production
GROUP BY c.tenant_id, c.patient_id, c.office_id, c.service_date;

CREATE VIEW rpt_provider_visits AS
SELECT c.tenant_id, c.patient_id, c.office_id, c.provider_id, c.service_date AS visit_date,
       count(*) AS procedure_count, sum(c.charged_fee) AS charged_production, sum(c.office_fee) AS gross_production,
       bool_or(c.is_planned) AS has_planned_work, min(c.era) AS era
FROM rpt_charges c
WHERE c.is_visit_code AND c.is_production
GROUP BY c.tenant_id, c.patient_id, c.office_id, c.provider_id, c.service_date;
```

`rpt_visit_audit(p_tenant_id, p_office_ids, p_date_from, p_date_to, p_provider_ids DEFAULT NULL)` — purpose: the legacy
Daily Audit: which of appointment, ledger transaction, note and signed note exist for a patient-office-day. A function
because the three sources are full-outer-joined and the date predicate must be applied to each side. Matching is same
office and same day, as in the legacy report.

| Column | Type | Meaning |
|---|---|---|
| `tenant_id`, `patient_id`, `office_id`, `visit_date` | | the unit |
| `has_appointment`, `has_ledger_transaction`, `has_progress_note`, `has_signed_note` | bool | legacy `Appt`, `Ledger Transaction`, `PN`, `PN With Sig`; always evaluated for the whole patient-office-day |
| `appointment_provider_ids`, `charge_provider_ids`, `note_provider_ids` | varchar(50)[] | **every** provider on the day's appointments, visit-code charges and notes (note author's provider) |
| `appointment_count`, `procedure_count`, `charged_production` | | sizes |

Provider semantics: `p_provider_ids` keeps a patient-office-day when one of those providers is on its appointments or on
its visit-code charges; the four flags stay whole-day, so a day worked by a hygienist and a dentist appears in both
providers' lists and never shows a false "missing appointment" because the appointment sits under the other provider.
`GROUP BY Provider` unnests the two arrays (distinct), one section per provider.

```sql
CREATE FUNCTION rpt_visit_audit(p_tenant_id int, p_office_ids int[], p_date_from date, p_date_to date,
                                p_provider_ids varchar[] DEFAULT NULL)
RETURNS TABLE (tenant_id int, patient_id int, office_id int, visit_date date, has_appointment bool,
               has_ledger_transaction bool, has_progress_note bool, has_signed_note bool,
               appointment_provider_ids varchar[], charge_provider_ids varchar[], note_provider_ids varchar[],
               appointment_count bigint, procedure_count bigint, charged_production numeric)
LANGUAGE sql STABLE AS $$
WITH ap AS (SELECT patient_id, office_id, appointment_date AS d, array_agg(DISTINCT provider_id) AS provider_ids, count(*) AS n
            FROM rpt_appointment_facts
            WHERE tenant_id = p_tenant_id AND office_id = ANY (p_office_ids) AND appointment_date BETWEEN p_date_from AND p_date_to
              AND NOT is_block AND NOT is_deleted AND NOT is_legacy_archive AND patient_id IS NOT NULL
              AND status_class NOT IN ('cancelled', 'no_show')
            GROUP BY 1, 2, 3),
     ch AS (SELECT patient_id, office_id, service_date AS d, array_agg(DISTINCT provider_id) AS provider_ids,
                   count(*) AS n, sum(charged_fee) AS fee
            FROM rpt_charges
            WHERE tenant_id = p_tenant_id AND office_id = ANY (p_office_ids) AND service_date BETWEEN p_date_from AND p_date_to
              AND is_visit_code
            GROUP BY 1, 2, 3),
     pn AS (SELECT patient_id, office_id, note_date AS d, bool_or(is_signed) AS any_signed,
                   array_remove(array_agg(DISTINCT author_provider_id), NULL) AS provider_ids
            FROM rpt_progress_note_facts
            WHERE tenant_id = p_tenant_id AND office_id = ANY (p_office_ids) AND note_date BETWEEN p_date_from AND p_date_to
              AND NOT is_struck_off
            GROUP BY 1, 2, 3)
SELECT p_tenant_id, patient_id, office_id, d, ap.n IS NOT NULL, ch.n IS NOT NULL, pn.any_signed IS NOT NULL,
       coalesce(pn.any_signed, false),
       coalesce(ap.provider_ids, '{}'), coalesce(ch.provider_ids, '{}'), coalesce(pn.provider_ids, '{}'),
       coalesce(ap.n, 0), coalesce(ch.n, 0), coalesce(ch.fee, 0)
FROM ap FULL JOIN ch USING (patient_id, office_id, d) FULL JOIN pn USING (patient_id, office_id, d)
WHERE p_provider_ids IS NULL
   OR coalesce(ap.provider_ids, '{}') && p_provider_ids
   OR coalesce(ch.provider_ids, '{}') && p_provider_ids;
$$;
```

`rpt_appointment_note_audit(p_tenant_id, p_office_ids, p_date_from, p_date_to, p_provider_ids DEFAULT NULL)` — purpose:
the appointment-grain twin, for My Reports › Missing Progress Notes and Progress Notes › `Missing` (`PROVIDER` picker,
`APPOINTMENT DATE RANGE`, `APPOINTMENTS TO INCLUDE`: Only with Missing Progress Notes / ALL): one row per live appointment,
filtered by the **appointment's** provider.

```sql
CREATE FUNCTION rpt_appointment_note_audit(p_tenant_id int, p_office_ids int[], p_date_from date, p_date_to date,
                                           p_provider_ids varchar[] DEFAULT NULL)
RETURNS TABLE (tenant_id int, appointment_id varchar, patient_id int, office_id int, provider_id varchar,
               appointment_date date, start_time time, status_class text,
               has_progress_note bool, has_signed_note bool, has_ledger_transaction bool)
LANGUAGE sql STABLE AS $$
SELECT f.tenant_id, f.appointment_id, f.patient_id, f.office_id, f.provider_id, f.appointment_date, f.start_time,
       f.status_class, coalesce(n.any_note, false), coalesce(n.any_signed, false), f.has_charge_same_day
FROM rpt_appointment_facts f
LEFT JOIN LATERAL (SELECT true AS any_note, bool_or(x.is_signed) AS any_signed
                   FROM rpt_progress_note_facts x          -- after DATA-18: prefer x.appointment_id = f.appointment_id
                   WHERE x.tenant_id = f.tenant_id AND x.patient_id = f.patient_id AND x.office_id = f.office_id
                     AND x.note_date = f.appointment_date AND NOT x.is_struck_off
                   HAVING count(*) > 0) n ON true
WHERE f.tenant_id = p_tenant_id AND f.office_id = ANY (p_office_ids) AND f.appointment_date BETWEEN p_date_from AND p_date_to
  AND NOT f.is_block AND NOT f.is_deleted AND NOT f.is_legacy_archive AND f.patient_id IS NOT NULL
  AND f.status_class NOT IN ('cancelled', 'no_show')
  AND (p_provider_ids IS NULL OR f.provider_id = ANY (p_provider_ids));
$$;
```

Era caveats: a posted procedure counts as a ledger transaction only when its code is a visit code, which is the legacy
rule and depends on the code flags (DATA-04); migrated notes are all unsigned and carry no author, so
`note_provider_ids` is empty for history; the appointment side of migrated days excludes the archive partition unless
the tenant policy includes it. A note belongs to a patient and a date only until DATA-18 links it to an appointment and
a provider, so two appointments of one patient on one day share the same note test.

### 2.18 `rpt_progress_note_facts`

Purpose: notes for the Progress Notes report (Detail, Unsigned) and for `rpt_visit_audit`. Grain: one non-deleted
`progress_notes` row.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `note_id`, `era` | | `patients.tenant_id`; `n.id`; `n.legacy_id IS NOT NULL` | `progress_notes` has no `tenant_id` [V] |
| `patient_id`, `office_id` | int | `n.patient_id`; `coalesce(n.office_id, patients.home_office_id)` | |
| `note_date` | date | `n.note_date` | date of service of the note (`DOS Date` basis) |
| `created_at_utc`, `created_date` | | `n.created_at`; `<created_date>` | `Created On Date` basis; load time on migrated rows |
| `author_user_id`, `author_provider_id` | int, varchar(50) | `n.created_by`; provider whose `user_id` = author (after DATA-18: `n.provider_id`) | most migrated providers have no linked user [A] |
| `is_signed`, `signed_at`, `signed_by_user_id` | | `n.signed_at IS NOT NULL`; `n.signed_at`; `n.signed_by` | |
| `is_struck_off`, `is_locked` | bool | `n.is_struck_off`; signed, or created before the office's today | lock is computed, as in `progress_notes_service` [A] |
| `note_length` | int | `length(coalesce(n.notes, ''))` | the text itself is a clinical data class; read on demand |

```sql
CREATE VIEW rpt_progress_note_facts AS
SELECT pt.tenant_id, n.id AS note_id, CASE WHEN n.legacy_id IS NOT NULL THEN 'migrated' ELSE 'app' END AS era,
       n.patient_id, coalesce(n.office_id, pt.home_office_id) AS office_id, n.note_date,
       n.created_at AS created_at_utc, d.created_date, n.created_by AS author_user_id,
       (SELECT min(p.id) FROM providers p WHERE p.user_id = n.created_by) AS author_provider_id,
       (n.signed_at IS NOT NULL) AS is_signed, n.signed_at, n.signed_by AS signed_by_user_id, n.is_struck_off,
       (n.signed_at IS NOT NULL OR d.created_date < (now() AT TIME ZONE coalesce(o.timezone, 'America/New_York'))::date) AS is_locked,
       length(coalesce(n.notes, '')) AS note_length
FROM progress_notes n
JOIN patients pt ON pt.id = n.patient_id
LEFT JOIN offices o ON o.id = coalesce(n.office_id, pt.home_office_id)
CROSS JOIN LATERAL (SELECT CASE WHEN n.legacy_id IS NOT NULL THEN n.created_at::date
     ELSE (n.created_at AT TIME ZONE 'UTC' AT TIME ZONE coalesce(o.timezone, 'America/New_York'))::date END AS created_date) d
WHERE NOT n.is_deleted;
```

Era caveats: 35,286 migrated notes have no author and no signature [D]; "missing note by provider" is exact only where
`providers.user_id` is set; a note belongs to a patient and a date only (no appointment or procedure link).

### 2.19 `rpt_patient_activity`

Purpose: first / last visit, next appointment and the counters behind active-patient and new-patient logic. Grain:
patient. Step A is a view built from laterals (cheap for one patient, a few seconds for a tenant); list reports filter
on the maintained columns `patients.first_visit` / `last_visit` (DATA-19) and the P4 table `rpt_patient_activity_summary`.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `patient_id` | int | `patients` | |
| `first_visit_date`, `last_visit_date`, `visit_days` | date, date, int | `min`, `max`, `count` over `rpt_visits` | new patient = `first_visit_date` in the period; active patient = `last_visit_date` inside the organisation window (PD-5; the window is a metric setting) |
| `first_visit_office_id`, `last_visit_provider_id` | | first / last `rpt_visits` row | office of the first visit; derived "attached provider" when `preferred_provider_id` is NULL |
| `lifetime_charged_production` | numeric | `sum(charged_production)` | |
| `last_hygiene_date` | date | last charge whose code was in group `hygiene_visit` on its service date (`rpt_code_in_group()`: dated versions and the tenant's own set are honoured) | recall and reappointment logic |
| `next_appointment_date`, `last_appointment_date` | date | `rpt_appointment_facts`, not cancelled, not no-show, not block, not deleted; on or after / before the office's today | |
| `last_missed_date`, `missed_count`, `cancelled_count` | | `status_class` `no_show` / `cancelled` | Routing Slip `Last Missed`, `#Missed`, `#Cancelled` |
| `last_patient_payment_date`, `last_insurance_payment_date` | date | last `rpt_payments` row by `payer` | Routing Slip, ageing `Lst Pay Date` (the amount is read from that row) |

```sql
CREATE VIEW rpt_patient_activity AS
SELECT p.tenant_id, p.id AS patient_id, v.*, h.last_hygiene_date, a.*, pay.*
FROM patients p
LEFT JOIN LATERAL (SELECT min(visit_date) AS first_visit_date, max(visit_date) AS last_visit_date, count(*) AS visit_days,
                          sum(charged_production) AS lifetime_charged_production,
                          (array_agg(office_id ORDER BY visit_date))[1] AS first_visit_office_id,
                          (array_agg(primary_provider_id ORDER BY visit_date DESC))[1] AS last_visit_provider_id
                   FROM rpt_visits WHERE tenant_id = p.tenant_id AND patient_id = p.id) v ON true
LEFT JOIN LATERAL (SELECT max(c.service_date) AS last_hygiene_date
                   FROM rpt_charges c
                   WHERE c.tenant_id = p.tenant_id AND c.patient_id = p.id
                     AND rpt_code_in_group(p.tenant_id, 'hygiene_visit', c.procedure_code, c.service_date)) h ON true
LEFT JOIN LATERAL (SELECT min(appointment_date) FILTER (WHERE appointment_date >= office_local_today AND status_class NOT IN ('cancelled', 'no_show')) AS next_appointment_date,
                          max(appointment_date) FILTER (WHERE appointment_date < office_local_today AND status_class NOT IN ('cancelled', 'no_show')) AS last_appointment_date,
                          max(appointment_date) FILTER (WHERE status_class = 'no_show') AS last_missed_date,
                          count(*) FILTER (WHERE status_class = 'no_show') AS missed_count,
                          count(*) FILTER (WHERE status_class = 'cancelled') AS cancelled_count
                   FROM rpt_appointment_facts f
                   WHERE f.patient_id = p.id AND NOT f.is_block AND NOT f.is_deleted AND NOT f.is_legacy_archive) a ON true
LEFT JOIN LATERAL (SELECT max(transaction_date) FILTER (WHERE payer = 'patient') AS last_patient_payment_date,
                          max(transaction_date) FILTER (WHERE payer = 'insurance') AS last_insurance_payment_date
                   FROM rpt_payments y WHERE y.tenant_id = p.tenant_id AND y.patient_id = p.id) pay ON true;
```

Era caveats: works for both eras because `date_of_service` was migrated for all charges; depends on the visit-code flags
(DATA-04) and on the archive policy (old charges in `Ledger_archive.txt` are excluded by default, which can make a
long-standing patient look new). `patients.created_at` is never used for new-patient logic on migrated rows.

### 2.20 `rpt_claim_facts`, `rpt_claim_lines` and `rpt_unclaimed_charge_tiers`

Purpose: one normalised row per claim (status class, tier, payer, line and remittance roll-ups, age date), one row per
claim line, and one row per billable charge and coverage tier that has no claim. Grain of `rpt_claim_facts`:
`insurance_claims` row. Only the claim that owns the procedures has lines of its own — secondary and later claims own
none [A] — so every line roll-up resolves the lines through the **claim family** (`claim_family_no`). Base: CTEs `c`, `cs`,
`ln`, `rt` in `analysis/be_data_insurance.md` §4.0; laterals replace the grouped CTEs so that a claim filter is pushed down.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `claim_id`, `claim_number`, `claim_family_no`, `era` | | `patients.tenant_id`; `regexp_replace(claim_number, '-[STQ]$', '')`; `legacy_id IS NOT NULL` | the family number ties secondary / tertiary / quaternary claims to the primary (no `parent_claim_id` until DATA-31) |
| `patient_id`, `account_id`, `office_id` | int | `coalesce(cl.office_id, patients.home_office_id)` | |
| `carrier_id`, `carrier_name`, `carrier_phone`, `ins_plan_id` | | `coalesce(cl.carrier_id, plan.carrier_id)` -> `insurance_carriers`; `cl.ins_plan_id` | plan id is NULL or wrong on migrated claims [A] (section 6 #16); carrier band `Carrier : <name> Ph : <phone>` |
| `tier`, `category`, `is_preauth` | text, text, bool | `billing_order`, else `claim_type` when it holds a tier, else `primary`; `claim_type LIKE 'med%'` -> `medical` else `dental` | `claim_type` is overloaded [V] `s30` |
| `status_norm`, `status_class` | text | section 3.2 | `unsent`, `sent`, `partially_paid`, `paid`, `closed`, `denied`, `void`, `deleted` |
| `submitted_date`, `first_paid_date`, `last_payment_date`, `close_date` | date | `cl.submitted_date`, `cl.paid_date`, last remittance `payment_date`, `cl.close_date` | server-stamped dates are UTC dates [A] |
| `created_at_utc`, `created_at_reliable`, `created_by_user_id` | | `cl.created_at`; `legacy_id IS NULL`; `cl.created_by` | "Created On" / "generated" criteria are app-era only: no created date was loaded for migrated claims [V] `s30` L16-23 |
| `service_from`, `service_to` | date | header, else min / max service date of the family lines | NULL on migrated claims until the `claim_id` backfill |
| `treating_provider_id`, `billing_provider_id` | varchar(50) | header, else the majority provider of the family lines; header | section 5 |
| `line_count`, `billed_amount`, `ucr_amount` | int, numeric | family lines: count, Σ `charged_fee` (else header `total_billed`), Σ `office_fee` | the legacy `Claim $` and `UCR` columns (they can differ). The header total is client-supplied and is zeroed by the recompute on a claim without own lines [V] `billing_service.py` L251-268 (section 6 #17), so it is only the fallback |
| `expected_amount`, `expected_basis` | numeric, text | primary: Σ primary estimate of the lines, else header `est_insurance`, else billed (`billed`); secondary: Σ secondary estimate of the family lines; tertiary and later: 0 (`none` — no estimate is stored) | `estimate`, `billed` or `none`; rows not on `estimate` are flagged |
| `paid_amount`, `legacy_paid_amount`, `remittance_paid_amount` | numeric | `total_paid`; `opening_paid`; Σ this claim's own remittance rows | `total_paid` already contains `opening_paid`; legacy `I` rows in `patient_payments` are the same money and are never added to it |
| `writeoff_amount`, `deductible_amount` | numeric | Σ this claim's own remittance rows | |
| `outstanding_amount`, `outstanding_quality` | numeric, text | `greatest(expected - paid - writeoff, 0)`; forced to 0 for a migrated claim whose stored status is not submitted / pending / sent. Quality: `exact` (app claim on the estimate basis), `estimate` (app claim on the billed basis; migrated claim still submitted or pending), `unknown` (every other migrated claim) | a migrated claim has no write-off rows and, before the backfill, a gross `expected`; paid below billed it would stay an open receivable for ever (79,038 migrated claims carry a payment [D]). Every open-receivable figure excludes `unknown` rows and prints their count |
| `age_date_sent` | date | `coalesce(submitted_date, service_to, created date)` | claim ageing clock (date sent); balance ageing uses the service date (2.14) |
| `submission_count`, `first_submitted_at`, `sent_method` | | `claim_submissions`; NEW `insurance_claims.sent_method` (DATA-21), else the carrier default (`insurance_carriers.claim_type`: `1` -> `eclaim`, `0` -> `paper`) | "Claim Sent Type: EClaim / Paper" |
| `print_count`, `last_printed_at` | | NEW columns (DATA-21); until then `audit_logs` rows with `action = 'PRINT'`, `resource_type = 'claim_report'`, `resource_id = claim id` | "Claims Printed"; the FE prints client-side today and logs to `localStorage` [A] |
| `subscriber_id`, `sub_member_id`, `group_number`, `subscriber_name`, `subscriber_dob` | | the patient's coverage slot for the claim's plan (same tier preferred) | Outstanding Claims `Group:`, `Sub ID:`, `Subscriber Name / DOB`; Claims List `Sub ID` |
| `claim_note` | text | `cl.notes` | Outstanding Claims (Excel) `Claim Note` |

```sql
CREATE VIEW rpt_claim_facts AS
SELECT pt.tenant_id, cl.id AS claim_id, cl.claim_number, n.family_no AS claim_family_no, n.era,
       cl.patient_id, pt.account_id, coalesce(cl.office_id, pt.home_office_id) AS office_id,
       coalesce(cl.carrier_id, ip.carrier_id) AS carrier_id, ic.name AS carrier_name, ic.phone AS carrier_phone,
       cl.ins_plan_id, n.tier, n.category, cl.is_preauth,
       n.st AS status_norm,
       CASE WHEN cl.is_active = false AND n.st <> 'closed' AND cl.close_date IS NULL THEN 'deleted'   -- deleted_at after DATA-31
            WHEN n.st IN ('void', 'voided', 'cancelled', 'canceled') THEN 'void'
            WHEN n.st IN ('denied', 'rejected') THEN 'denied'
            WHEN n.st = 'closed' THEN 'closed'
            WHEN n.st = 'paid' OR (n.st IN ('draft', '') AND coalesce(cl.total_paid, 0) > 0)
                 THEN CASE WHEN n.era = 'app' AND e.expected_basis = 'estimate' AND m.outstanding_amount > 0
                           THEN 'partially_paid' ELSE 'paid' END     -- a paid migrated claim is never "partially paid"
            WHEN n.st IN ('sent', 'submitted', 'pending', 'resubmitted', 'accepted', 'preauth_sent')
                 OR cl.submitted_date IS NOT NULL THEN 'sent'
            ELSE 'unsent' END AS status_class,
       cl.submitted_date, cl.paid_date AS first_paid_date, rm.last_payment_date, cl.close_date,
       cl.created_at AS created_at_utc, (cl.legacy_id IS NULL) AS created_at_reliable, cl.created_by AS created_by_user_id,
       coalesce(cl.date_of_service_from, ln.service_from) AS service_from,
       coalesce(cl.date_of_service_to, ln.service_to) AS service_to,
       coalesce(cl.treating_provider_id, ln.majority_provider_id) AS treating_provider_id, cl.billing_provider_id,
       coalesce(ln.line_count, 0) AS line_count, coalesce(ln.billed_lines, cl.total_billed) AS billed_amount,
       ln.ucr_lines AS ucr_amount, e.expected_amount, e.expected_basis,
       coalesce(cl.total_paid, 0) AS paid_amount, coalesce(cl.opening_paid, 0) AS legacy_paid_amount,
       coalesce(rm.remit_paid, 0) AS remittance_paid_amount, coalesce(rm.remit_writeoff, 0) AS writeoff_amount,
       coalesce(rm.remit_deductible, 0) AS deductible_amount, m.outstanding_amount, m.outstanding_quality,
       coalesce(cl.submitted_date, ln.service_to, cl.date_of_service_to, cl.created_at::date) AS age_date_sent,
       coalesce(sb.submission_count, 0) AS submission_count, sb.first_submitted_at,
       CASE ic.claim_type WHEN '1' THEN 'eclaim' WHEN '0' THEN 'paper' END AS sent_method,   -- coalesce(cl.sent_method, ...) after DATA-21
       pr.print_count, pr.last_printed_at,                                                 -- cl.print_count, cl.last_printed_at after DATA-21
       su.subscriber_id, su.sub_member_id, su.group_number, su.subscriber_name, su.subscriber_dob,
       cl.notes AS claim_note
FROM insurance_claims cl
JOIN patients pt ON pt.id = cl.patient_id
LEFT JOIN insurance_plans ip ON ip.id = cl.ins_plan_id
LEFT JOIN insurance_carriers ic ON ic.id = coalesce(cl.carrier_id, ip.carrier_id)
CROSS JOIN LATERAL (SELECT lower(btrim(coalesce(cl.status, ''))) AS st,
     CASE WHEN cl.legacy_id IS NOT NULL THEN 'migrated' ELSE 'app' END AS era,
     regexp_replace(cl.claim_number, '-[STQ]$', '') AS family_no,
     coalesce(nullif(lower(btrim(cl.billing_order)), ''),
              CASE WHEN lower(cl.claim_type) IN ('primary', 'secondary', 'tertiary', 'quaternary') THEN lower(cl.claim_type) END,
              'primary') AS tier,
     CASE WHEN lower(cl.claim_type) LIKE 'med%' THEN 'medical' ELSE 'dental' END AS category) n
LEFT JOIN LATERAL (                      -- the lines of the family: this claim's own, or the primary's
     SELECT count(*) AS line_count, sum(c.charged_fee) AS billed_lines, sum(c.office_fee) AS ucr_lines,
            sum(c.est_ins_primary) AS est_primary, sum(c.est_ins_secondary) AS est_secondary,
            min(c.service_date) AS service_from, max(c.service_date) AS service_to,
            mode() WITHIN GROUP (ORDER BY c.provider_id) AS majority_provider_id
     FROM rpt_charges c
     WHERE c.patient_id = cl.patient_id
       AND c.claim_id IN (SELECT o.id FROM insurance_claims o
                          WHERE o.patient_id = cl.patient_id
                            AND regexp_replace(o.claim_number, '-[STQ]$', '') = n.family_no)
     HAVING count(*) > 0) ln ON true
LEFT JOIN LATERAL (SELECT sum(r.paid_amount) AS remit_paid, sum(r.writeoff_amount) AS remit_writeoff,
                          sum(r.deductible_amount) AS remit_deductible, max(r.payment_date) AS last_payment_date
                   FROM rpt_remittance_lines r WHERE r.claim_id = cl.id AND NOT r.is_void) rm ON true
LEFT JOIN LATERAL (SELECT count(*) AS submission_count, min(s.created_at) AS first_submitted_at
                   FROM claim_submissions s WHERE s.claim_id = cl.id) sb ON true
LEFT JOIN LATERAL (SELECT count(*) AS print_count, max(al.created_at) AS last_printed_at FROM audit_logs al
                   WHERE al.action = 'PRINT' AND al.resource_type = 'claim_report' AND al.resource_id = cl.id) pr ON true
LEFT JOIN LATERAL (SELECT v.subscriber_id, v.sub_member_id, v.group_number, v.subscriber_name, v.subscriber_dob
                   FROM rpt_insurance_coverage v
                   WHERE v.patient_id = cl.patient_id AND v.ins_plan_id = cl.ins_plan_id
                   ORDER BY (v.tier = n.tier) DESC, v.slot_id LIMIT 1) su ON true
CROSS JOIN LATERAL (SELECT
     CASE WHEN n.tier = 'primary' THEN
               CASE WHEN coalesce(ln.est_primary, 0) > 0 THEN ln.est_primary
                    WHEN cl.est_insurance > 0 THEN cl.est_insurance
                    ELSE coalesce(ln.billed_lines, cl.total_billed, 0) END
          WHEN n.tier = 'secondary' THEN coalesce(ln.est_secondary, 0)
          ELSE 0 END AS expected_amount,
     CASE WHEN n.tier = 'primary' AND (coalesce(ln.est_primary, 0) > 0 OR cl.est_insurance > 0) THEN 'estimate'
          WHEN n.tier = 'primary' THEN 'billed'
          WHEN n.tier = 'secondary' AND ln.line_count > 0 THEN 'estimate'
          ELSE 'none' END AS expected_basis) e
CROSS JOIN LATERAL (SELECT
     CASE WHEN n.era = 'migrated' AND n.st NOT IN ('submitted', 'pending', 'sent') THEN 0
          ELSE greatest(e.expected_amount - coalesce(cl.total_paid, 0) - coalesce(rm.remit_writeoff, 0), 0) END AS outstanding_amount,
     CASE WHEN n.era = 'migrated' AND n.st NOT IN ('submitted', 'pending', 'sent') THEN 'unknown'
          WHEN n.era = 'app' AND e.expected_basis = 'estimate' THEN 'exact' ELSE 'estimate' END AS outstanding_quality) m;

CREATE VIEW rpt_claim_lines AS           -- one row per claim and line of its family
SELECT f.tenant_id, f.claim_id, f.claim_family_no, f.tier, f.status_class, f.carrier_id, f.ins_plan_id,
       f.submitted_date, f.is_preauth, c.charge_id, c.patient_id, c.office_id, c.provider_id, c.service_date,
       c.procedure_code, c.tooth, c.surface, c.charged_fee, c.office_fee, t.est_for_tier,
       coalesce(r.paid, 0) AS ins_paid_amount, coalesce(r.writeoff, 0) AS ins_writeoff_amount,
       coalesce(r.deductible, 0) AS deductible_amount,
       greatest(t.est_for_tier - coalesce(r.paid, 0) - coalesce(r.writeoff, 0), 0) AS line_outstanding
FROM rpt_claim_facts f
JOIN insurance_claims o ON o.patient_id = f.patient_id
     AND regexp_replace(o.claim_number, '-[STQ]$', '') = f.claim_family_no        -- every claim of the family
JOIN rpt_charges c ON c.claim_id = o.id                                           -- only the owner has lines
CROSS JOIN LATERAL (SELECT CASE f.tier WHEN 'primary' THEN c.est_ins_primary
                                       WHEN 'secondary' THEN c.est_ins_secondary ELSE 0 END AS est_for_tier) t
LEFT JOIN LATERAL (SELECT sum(x.paid_amount) AS paid, sum(x.writeoff_amount) AS writeoff, sum(x.deductible_amount) AS deductible
                   FROM rpt_remittance_lines x
                   WHERE x.procedure_id = c.charge_id AND x.claim_id = f.claim_id AND NOT x.is_void) r ON true;

CREATE VIEW rpt_unclaimed_charge_tiers AS    -- one row per billable charge and coverage tier of the patient
SELECT c.tenant_id, c.charge_id, c.patient_id, c.office_id, c.provider_id, c.service_date, c.transaction_date,
       c.procedure_code, c.charged_fee, c.bill_tier, c.bill_tier_source, c.hold_claim,
       v.tier, v.ins_plan_id, v.carrier_id,
       CASE v.tier WHEN 'primary' THEN c.est_ins_primary WHEN 'secondary' THEN c.est_ins_secondary ELSE 0 END AS est_for_tier,
       k.claim_id AS tier_claim_id, (k.claim_id IS NOT NULL) AS has_claim,
       coalesce(pk.status_class IN ('paid', 'closed'), false) AS is_primary_closed
FROM rpt_charges c
JOIN rpt_insurance_coverage v ON v.patient_id = c.patient_id AND v.category = 'dental'   -- today's slots (no slot history)
LEFT JOIN rpt_claim_facts pk ON pk.claim_id = c.claim_id                                -- the claim that owns the line
LEFT JOIN LATERAL (SELECT f.claim_id FROM rpt_claim_facts f
                   WHERE f.patient_id = c.patient_id AND f.tier = v.tier AND f.status_class NOT IN ('deleted', 'void')
                     AND ((v.tier = 'primary' AND f.claim_id = c.claim_id)
                       OR (v.tier <> 'primary' AND f.claim_family_no = pk.claim_family_no))
                   ORDER BY f.claim_id LIMIT 1) k ON true
WHERE c.is_production AND c.bill_tier <> 'none';
```

`rpt_claim_facts_as_of(p_tenant_id int, p_as_of date)` (P2, DATA-31) returns the columns of `rpt_claim_facts` as of a
date: remittance sums and `last_payment_date` only from rows with `payment_date <= p_as_of`, `paid_amount` =
`opening_paid` (when `paid_date <= p_as_of`) plus those remittances, and `status_norm` = the last `claim_status_history`
row (DATA-25) on or before the date. It is exact from the day history capture starts; before that day it returns the
current status with `status_basis = 'current'`.

Consumer rules:

| Rule | Detail |
|---|---|
| Pre-authorisations | exclude `is_preauth` from every money aggregate |
| Family | `billed_amount` and `ucr_amount` describe the same lines on every claim of a family: never sum them across a family (group by `claim_family_no`). `expected_amount`, `paid_amount`, `writeoff_amount` and `outstanding_amount` are **per tier** and additive across the claims of a family — a report on receivables must not restrict to `tier = 'primary'` |
| Date basis | a criterion: sent, paid, closed, created (app era), service |
| Outstanding Claims | `status_class IN ('sent', 'partially_paid')`, `outstanding_quality <> 'unknown'`, aged on `age_date_sent` into the legacy buckets; the bucket columns carry `outstanding_amount`. `Report Date` is as-of: until `rpt_claim_facts_as_of()` exists the definition accepts today only for a parity run and prints the limitation |
| Claims Not Created | `rpt_unclaimed_charge_tiers WHERE NOT has_claim`, `tier` in the ticked `CLAIM TYPE` set; for a non-primary tier additionally `is_primary_closed` and a `bill_tier` at least as deep as the tier (legacy: a secondary claim is created only when the procedure carries `DD` and the primary claim is closed). Held procedures are included (legacy behaviour). No quaternary coverage slot exists, so that tick returns no rows |
| Unbilled Report Due to No Insurance | `rpt_charges WHERE bill_tier = 'none' AND claim_id IS NULL` and the patient holds an active dental slot today — procedures posted before insurance was attached |

Era caveats: migrated claims carry 15 columns only [A] and no lines, estimate or service dates until the `claim_id`
backfill; days from sent to first payment are reliable in both eras; denial analysis, clean-claim rate, acknowledgements
and status history do not exist in either era (DATA-25, DATA-31). The status of migrated claims was mapped from six codes
and every other code became `draft` [V] `parsers.py` L188-199 — if the export uses the vendor letters (`A` = closed, `Q` =
created not sent), closed claims sit in `draft` and, with a sent date, classify as `sent`; they carry
`outstanding_quality = 'unknown'` and are excluded from receivables until section 6 #15 confirms the codes (DATA-32).
Migrated secondary claims have no resolvable estimate (`expected_basis = 'none'`). `bill_tier` on app charges is derived
(2.9), so the Claims Not Created and Unbilled lists are exact only from DATA-33.

### 2.21 `rpt_insurance_coverage` and `rpt_benefit_usage()`

Purpose: who is covered by which plan and carrier, with eligibility and benefit figures. Grain: one active
`patient_insurance` slot = (patient, category, tier). Base: CTE `sl` in `analysis/be_data_insurance.md` §4.0.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `slot_id`, `patient_id` | | `patients.tenant_id`; `patient_insurance.id` | the slot table has no `tenant_id` |
| `category`, `tier` | text | `legacy_plan_type` first letter `M` -> `medical` else `dental`; `lower(insurance_type)` | migrated tiers are wrong until the slot repair (section 6 #23) |
| `ins_plan_id`, `carrier_id`, `carrier_name`, `carrier_phone`, `employer_id`, `employer_name`, `group_number`, `plan_type`, `coverage_type`, `network_type`, `is_prepaid`, `reporting_subtype` | | `insurance_plans` -> `insurance_carriers`, `employers` | plan-type vocabularies differ by era; map through `rpt_value_map`. `reporting_subtype` = Special Transaction Report "INSURANCE PLANS/SUB TYPES" |
| `individual_max`, `individual_deductible`, `family_max`, `family_deductible`, `ortho_max`, anniversary month / day | | `insurance_plans` | plan limits; 0 means "not migrated" unless the source-field backfill ran |
| `subscriber_id`, `sub_member_id`, `subscriber_name`, `subscriber_dob`, `relationship`, `effective_date`, `term_date`, `plan_term_date` | | `insurance_subscribers` (`sub_last_name`, `sub_first_name`, `sub_dob`), `patient_insurance.relationship` | Routing Slip `Subscriber`, `Sub ID`, `Sub DOB`, `Rel To Sub`. The slot has no dates of its own: coverage "as of a date" is not answerable |
| `elig_status_class`, `elig_verified_on`, `elig_verified_by` | text, timestamp, text | `verified` when the lower-cased status is in (`verified`, `active`, `confirmed`, `eligible`, `yes`); `not_eligible` for (`inactive`, `ineligible`, `termed`, `terminated`, `denied`, `no`, `not_eligible`); else `unknown` | one stamp per subscriber marks every dependant [A] |
| `max_remaining_stored`, `deductible_remaining_stored`, `ortho_remaining` | numeric | slot columns (`patient_insurance`) | individual remainders: stale snapshots; the effective figures come from `rpt_benefit_usage()` |
| `family_max_remaining_stored`, `family_ded_remaining_stored` | numeric | `insurance_subscribers.family_max_remaining`, `family_ded_remaining` | family remainders: stored per subscriber, never recomputed |
| `slot_written_on` | date | `coalesce(pi.updated_at, pi.created_at)::date` | age of the stored figures |

```sql
CREATE VIEW rpt_insurance_coverage AS
SELECT p.tenant_id, pi.id AS slot_id, pi.patient_id,
       CASE WHEN upper(left(coalesce(pi.legacy_plan_type, 'D'), 1)) = 'M' THEN 'medical' ELSE 'dental' END AS category,
       lower(pi.insurance_type) AS tier, pi.ins_plan_id, pl.carrier_id, ic.name AS carrier_name, ic.phone AS carrier_phone,
       pl.employer_id, em.name AS employer_name, pl.group_number,
       pl.plan_type, pl.coverage_type, pl.network_type, pl.is_prepaid, pl.reporting_subtype,
       pl.individual_max, pl.individual_deductible, pl.family_max, pl.family_deductible, pl.ortho_max,
       pl.anniversary_month, pl.anniversary_day, pl.anniversary_date,
       s.id AS subscriber_id, s.sub_member_id,
       nullif(btrim(concat_ws(', ', s.sub_last_name, s.sub_first_name)), '') AS subscriber_name, s.sub_dob AS subscriber_dob,
       pi.relationship, s.effective_date, s.term_date, s.plan_term_date,
       CASE WHEN lower(btrim(coalesce(s.elig_status, ''))) IN ('verified', 'active', 'confirmed', 'eligible', 'yes') THEN 'verified'
            WHEN lower(btrim(coalesce(s.elig_status, ''))) IN ('inactive', 'ineligible', 'termed', 'terminated', 'denied', 'no', 'not_eligible') THEN 'not_eligible'
            ELSE 'unknown' END AS elig_status_class, s.elig_verified_on, s.elig_verified_by,
       pi.max_remaining AS max_remaining_stored, pi.deductible_remaining AS deductible_remaining_stored, pi.ortho_remaining,
       s.family_max_remaining AS family_max_remaining_stored, s.family_ded_remaining AS family_ded_remaining_stored,
       coalesce(pi.updated_at, pi.created_at)::date AS slot_written_on
FROM patient_insurance pi
JOIN patients p ON p.id = pi.patient_id
JOIN insurance_plans pl ON pl.id = pi.ins_plan_id
LEFT JOIN insurance_carriers ic ON ic.id = pl.carrier_id
LEFT JOIN employers em ON em.id = pl.employer_id
LEFT JOIN insurance_subscribers s ON s.id = pi.subscriber_id
WHERE pi.is_active;
```

`rpt_benefit_usage()` — one row per dental slot with the benefit year and the remainders as of a date.

```sql
CREATE FUNCTION rpt_benefit_usage(p_tenant_id int, p_as_of date)
RETURNS TABLE (tenant_id int, slot_id int, patient_id int, tier text, ins_plan_id int, carrier_id int,
               benefit_year_start date, benefit_year_end date, claim_count bigint, benefits_used numeric,
               individual_max numeric, max_remaining_effective numeric, max_remaining_source text,   -- claims | stored | plan
               individual_deductible numeric, deductible_applied numeric,
               deductible_remaining_effective numeric, deductible_remaining_source text,             -- remittances | stored | plan
               family_max numeric, family_max_remaining_stored numeric,
               family_deductible numeric, family_ded_remaining_stored numeric, slot_written_on date)
```

The body is the set-based port of `benefit_usage_service.slot_benefits` written out in `analysis/be_data_insurance.md`
§4.12 (CTEs `yr`, `y`, `used`), with these changes: claims are taken from `rpt_claim_facts` with
`status_class NOT IN ('deleted', 'void', 'denied')` and `NOT is_preauth` (the service counts soft-deleted drafts); the
anniversary day is clamped to the month's last day; `deductible_applied` = Σ `deductible_amount` of the non-void
remittance lines of those claims for the slot's tier in the benefit year, and `deductible_remaining_effective` =
`greatest(individual_deductible - deductible_applied, 0)` when such lines exist, else the stored slot value when it was
written inside the benefit year, else the plan deductible.

The legacy benefits grid (Benefits Used/Unused, Treatment Plan Proposal) prints eight columns per coverage:

| Legacy column | Source | Kind |
|---|---|---|
| `Ind Max`, `Ind Ded`, `Fam Max`, `Fam Ded` | plan limits | stored on the plan |
| `Ind Max Rem` | `max_remaining_effective` | recomputed from claims of the benefit year, falling back to the stored slot value, then to the plan limit |
| `Ind Ded Rem` | `deductible_remaining_effective` | recomputed from remittance deductibles (app era), falling back likewise |
| `Fam Max Rem`, `Fam Ded Rem` | `family_max_remaining_stored`, `family_ded_remaining_stored` | **stored snapshots** per subscriber, printed with `slot_written_on`; nothing in the system maintains them |

Era caveats: `elig_status` is uniformly `unknown` on the 65k migrated subscribers [D]; plan limits and group numbers
are right only after `backfill_insurance_source_fields.py`; no deductible was applied to any migrated row, so
`Ind Ded Rem` is the stored or plan value for history; family remainders are whatever was last typed or migrated.

### 2.22 `rpt_treatment_item_facts`

Purpose: the treatment funnel (presented, accepted, scheduled, completed), unscheduled treatment, and the legacy
two-layer status. Grain: one non-archived `treatment_plan_items` row. Base: the `item` CTE and the pending rule in
`analysis/be_data_patients_clinical.md` §6.5 and §6.6 (the server rule is `treatment_service.pending_item_clauses`).
The view needs no schema change and ships in P1 (DATA-56): the Main and Provider Dashboards read Case Acceptance and
Treatment Reappointment from it. Item office and acceptance stamps follow in P3 (DATA-39).

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `item_id`, `plan_id`, `era` | | via `treatment_plans.patient_id` -> `patients`; `treatment_plans.legacy_id IS NOT NULL` | items have no `tenant_id`, `office_id` or `patient_id` [V] |
| `patient_id`, `office_id` | int | plan patient; `coalesce(treatment_plans.office_id, patients.home_office_id)` | own `office_id` after DATA-39 |
| `provider_id`, `counselor_user_id`, `diagnosed_by_raw` | | `i.provider_id`, `i.counselor_user_id`, `i.diagnosed_by` | "Tx Counselor" criterion; `diagnosed_by` is a legacy provider id on migrated rows |
| `procedure_code`, `description`, `tooth`, `surface`, `quadrant`, `phase_id`, `priority` | | `i.*` | legacy `Code`, `Description`, `Th`, `Surf`, Phase ID / Order ID |
| `status_norm` | text | `lower(btrim(status))` folded through `LEGACY_ITEM_STATUS_MAP` (section 3.2) | the stored status: 10 values + `existing`. `scheduled` and `completed` overwrite the status the item had before |
| `exclusive_status`, `exclusive_status_inferred` | text, bool | `status_norm`, except for `scheduled` / `completed` items: `status_before_scheduled` (folded the same way), else `accepted` with the flag set | the legacy **exclusive** status (`D`, `A`, `U`, `H`, `L`, `R`), independent of the Scheduled and Completed flags — the `Sts` column and the `TREATMENT PLANS` / `EXCLUDE TREATMENT PLANS` criteria (3.2). `status_before_scheduled` is written by `schedule_item` [V] `treatment_service.py` L308; an item completed without ever being booked has none, hence the inferred fallback |
| `preauth_status`, `preauth_number`, `preauth_date`, `preauth_expires` | | primary `treatment_plan_insurance_details` row | legacy statuses "Pre-Authorized Sent / Closed" (`PA Sts`) |
| `diagnosed_date`, `presented_date` | date | `i.diagnosed_date`; `coalesce(i.diagnosed_date, i.created_at::date)` | "Diagnosed Date Range" binds to `presented_date`; the report prints `diagnosed_date` (`Diag. Dt`) |
| `accepted_date`, `accepted_date_effective` | date | `i.accepted_date`; `coalesce(i.accepted_date, i.scheduled_date, first charge date, i.end_date)` | the stored date (`Accept Dt`) is stamped only on a client `accepted` write [A]; metrics use the effective one |
| `start_date`, `end_date` | date | same-named | legacy `Start Dt / End Dt` |
| `scheduled_date`, `completed_date`, `completing_charge_id` | | `i.scheduled_date`; first live charge with `treatment_plan_item_id = i.id` | |
| `is_accepted`, `is_scheduled`, `is_completed` | bool | `status_norm IN ('accepted', 'scheduled', 'completed')` or an accepted date or a charge; a live booking line exists; a live charge exists | additive flags (legacy `Sch`, `Com`); funnel classes are not exclusive — report with a strict hierarchy |
| `is_pending`, `is_unscheduled` | bool | the server pending rule; `is_pending AND NOT is_scheduled` | unscheduled treatment |
| `fee`, `ucr_fee`, `insurance_estimate`, `est_patient`, `discount` | numeric | `i.fee`, `i.ucr_fee`, `i.insurance_estimate + coalesce(sec, 0)`, `fee - insurance_estimate`, `i.discount` | discount is reported, not subtracted |
| `referral_id`, `referral_type` | | `i.referral_id`, `i.referral_type` (`in` / `out`) | feeds 2.23 |

```sql
CREATE VIEW rpt_treatment_item_facts AS
SELECT pt.tenant_id, i.id AS item_id, i.plan_id, CASE WHEN tp.legacy_id IS NOT NULL THEN 'migrated' ELSE 'app' END AS era,
       tp.patient_id, coalesce(tp.office_id, pt.home_office_id) AS office_id, i.provider_id, i.counselor_user_id,
       i.diagnosed_by AS diagnosed_by_raw, i.procedure_code, i.description, i.tooth, i.surface, i.quadrant,
       i.phase_id, i.priority,
       st.status_norm,
       CASE WHEN st.status_norm IN ('scheduled', 'completed') THEN coalesce(st.before_norm, 'accepted')
            ELSE st.status_norm END AS exclusive_status,
       (st.status_norm IN ('scheduled', 'completed') AND st.before_norm IS NULL) AS exclusive_status_inferred,
       pa.preauth_status, pa.preauth_number, pa.preauth_date, pa.preauth_expires,
       i.diagnosed_date, coalesce(i.diagnosed_date, i.created_at::date) AS presented_date,
       i.accepted_date, coalesce(i.accepted_date, i.scheduled_date, ch.first_dos, i.end_date) AS accepted_date_effective,
       i.start_date, i.end_date,
       i.scheduled_date, ch.first_dos AS completed_date, ch.charge_id AS completing_charge_id,
       (st.status_norm IN ('accepted', 'scheduled', 'completed')
          OR i.accepted_date IS NOT NULL OR ch.first_dos IS NOT NULL) AS is_accepted,
       bk.is_booked AS is_scheduled, (ch.first_dos IS NOT NULL) AS is_completed,
       pd.is_pending, (pd.is_pending AND NOT bk.is_booked) AS is_unscheduled,
       i.fee, i.ucr_fee, i.insurance_estimate + coalesce(i.sec_insurance_estimate, 0) AS insurance_estimate,
       i.fee - i.insurance_estimate AS est_patient, i.discount, i.referral_id, i.referral_type
FROM treatment_plan_items i
JOIN treatment_plans tp ON tp.id = i.plan_id
JOIN patients pt ON pt.id = tp.patient_id
LEFT JOIN rpt_value_map sm ON sm.domain = 'treatment_item_status' AND sm.raw_value = lower(btrim(i.status))
LEFT JOIN rpt_value_map sb ON sb.domain = 'treatment_item_status' AND sb.raw_value = lower(btrim(i.status_before_scheduled))
CROSS JOIN LATERAL (SELECT coalesce(sm.canonical_value, lower(btrim(i.status))) AS status_norm,
                           coalesce(sb.canonical_value, nullif(lower(btrim(i.status_before_scheduled)), '')) AS before_norm) st
LEFT JOIN LATERAL (SELECT min(pp.date_of_service) AS first_dos, min(pp.id) AS charge_id FROM patient_procedures pp
                   WHERE pp.treatment_plan_item_id = i.id AND NOT pp.is_void) ch ON true
LEFT JOIN LATERAL (SELECT EXISTS (SELECT 1 FROM appointment_procedures ap JOIN appointments a ON a.id = ap.appointment_id
                                  WHERE ap.treatment_plan_item_id = i.id AND NOT ap.is_archived
                                    AND NOT a.is_archived AND NOT a.is_cancelled) AS is_booked) bk ON true
LEFT JOIN LATERAL (SELECT d.preauth_status, d.preauth_number, d.preauth_date, d.preauth_expires
                   FROM treatment_plan_insurance_details d WHERE d.plan_item_id = i.id AND NOT d.is_archived
                   ORDER BY (lower(coalesce(d.billing_order, 'primary')) = 'primary') DESC, d.id LIMIT 1) pa ON true
CROSS JOIN LATERAL (SELECT (i.end_date IS NULL AND ch.first_dos IS NULL
                            AND st.status_norm NOT IN ('completed', 'referred_out', 'external_referral')) AS is_pending) pd
WHERE NOT i.is_archived;
```

`rpt_value_map` has primary key (`domain`, `raw_value`), so the two map joins return at most one row each.

Era caveats: migrated plans are 674 headers derived from appointment lines, with no dates and no provider [D]; restrict
every acceptance metric to `era = 'app'`. The measure is current-state in both eras: an item accepted and later set back
to `unaccepted` counts as not accepted until `treatment_plan_item_events` exists (DATA-25). Plan headers are
hard-deleted, so deleted plans leave no trace.

### 2.23 `rpt_referral_facts`

Purpose: referral events in both directions. Grain: one referral event. `referral_kind` distinguishes the four
sources; the source catalog itself (`referrals`) is read directly by Referral Source List.

| `referral_kind` | Source | Key columns | Era |
|---|---|---|---|
| `inbound_source` | `patients` with a non-blank `referred_by` or `referral_type` | `patient_id`, `referral_source_id` / `referral_source_name` (as `rpt_patient_dim`), `source_type_label` (label of `patients.referral_type` through definitions group `REFTYPE` for a code or `referral_type` for a label, via `rpt_value_map`), `referral_date` (NEW `patients.referral_date`, else the first visit date) | both; app patients hold free text until DATA-40 |
| `outbound_patient` | `patients.referred_to`, `referral_to_date` | `patient_id`, `target_name` (text), `referral_date` | app |
| `outbound_item` | `treatment_plan_items` with `status_norm IN ('referred_out', 'external_referral', 'internal_referral')` or `referral_type = 'out'` | `patient_id`, `referral_source_id = i.referral_id`, `procedure_code`, `provider_id`, `specialty` (of the `referrals` row), `is_internal` | app; no date for the status change (uses `presented_date`) |
| `case` | `referral_cases` (NEW, DATA-40) | direction, from / to office and provider, status, internal Tx status, contact status, reason code, appointment, users — read through `case_id` | app, after DATA-40 |

Common columns: `tenant_id`, `referral_kind`, `direction` (`in` / `out` / `internal`), `patient_id` (NULL for an incoming
case whose patient record does not exist yet), `office_id` (patient home office; the plan office for items; the
receiving office for an incoming case, the referring office otherwise), `referral_source_id`, `source_name`,
`source_type_label`, `source_category` (`doctor` when the source row has an `npi` or `specialty`, `patient` when it names
a patient, else `other` — [I]; the stored `referrals.source_category` after DATA-40), `specialty`, `referral_date`,
`status`, `procedure_code`, `provider_id`, `case_id`.

```sql
CREATE VIEW rpt_referral_facts AS
SELECT d.tenant_id, 'inbound_source' AS referral_kind, 'in' AS direction, d.patient_id, d.home_office_id AS office_id,
       d.referral_source_id, d.referral_source_name AS source_name,
       coalesce(vm.canonical_value, nullif(btrim(d.referral_type_raw), '')) AS source_type_label,
       sc.source_category, rs.specialty, d.first_visit_date AS referral_date, NULL::text AS status,
       NULL::varchar AS procedure_code, NULL::varchar AS provider_id, NULL::bigint AS case_id
FROM rpt_patient_dim d
LEFT JOIN referrals rs ON rs.id = d.referral_source_id
LEFT JOIN rpt_value_map vm ON vm.domain = 'referral_type' AND vm.raw_value = lower(btrim(d.referral_type_raw))
CROSS JOIN LATERAL (SELECT CASE WHEN rs.id IS NULL THEN NULL             -- rs.source_category after DATA-40
                                WHEN nullif(btrim(coalesce(rs.npi, '')), '') IS NOT NULL
                                  OR nullif(btrim(coalesce(rs.specialty, '')), '') IS NOT NULL THEN 'doctor'
                                WHEN rs.patient_id IS NOT NULL THEN 'patient' ELSE 'other' END AS source_category) sc
WHERE nullif(btrim(coalesce(d.referred_by_raw, '')), '') IS NOT NULL OR nullif(btrim(coalesce(d.referral_type_raw, '')), '') IS NOT NULL
UNION ALL
SELECT p.tenant_id, 'outbound_patient', 'out', p.id, p.home_office_id, NULL, p.referred_to, NULL, NULL, NULL,
       p.referral_to_date, NULL, NULL, NULL, NULL
FROM patients p WHERE nullif(btrim(coalesce(p.referred_to, '')), '') IS NOT NULL
UNION ALL
SELECT t.tenant_id, 'outbound_item', CASE WHEN t.status_norm = 'internal_referral' THEN 'internal' ELSE 'out' END,
       t.patient_id, t.office_id, t.referral_id, coalesce(rs.practice_name, concat_ws(', ', rs.last_name, rs.first_name)),
       NULL,
       CASE WHEN rs.id IS NULL THEN NULL
            WHEN nullif(btrim(coalesce(rs.npi, '')), '') IS NOT NULL OR nullif(btrim(coalesce(rs.specialty, '')), '') IS NOT NULL THEN 'doctor'
            WHEN rs.patient_id IS NOT NULL THEN 'patient' ELSE 'other' END,
       rs.specialty, t.presented_date, t.status_norm, t.procedure_code, t.provider_id, NULL
FROM rpt_treatment_item_facts t LEFT JOIN referrals rs ON rs.id = t.referral_id
WHERE t.status_norm IN ('referred_out', 'external_referral', 'internal_referral') OR t.referral_type = 'out';
-- after DATA-40, a fourth branch with the same column list, one row per non-deleted referral_cases row:
--   SELECT c.tenant_id, 'case', CASE c.direction WHEN 'external_in' THEN 'in' WHEN 'internal' THEN 'internal' ELSE 'out' END,
--          c.patient_id, CASE WHEN c.direction = 'external_in' THEN c.to_office_id ELSE c.from_office_id END,
--          c.external_referral_id, coalesce(rs.practice_name, concat_ws(', ', rs.last_name, rs.first_name)),
--          NULL, rs.source_category, coalesce(c.specialty, rs.specialty), c.referral_date,
--          CASE WHEN c.direction = 'internal' THEN c.tx_status ELSE c.status END,
--          c.procedure_codes[1], coalesce(c.to_provider_id, c.from_provider_id), c.id
--   FROM referral_cases c LEFT JOIN referrals rs ON rs.id = c.external_referral_id WHERE c.deleted_at IS NULL
-- Case-only columns (contact status, reason code, appointment date / time / operatory, prospect name, both offices and
-- providers, deleting user) are read from referral_cases through case_id; "Exclude Deleted Referrals" unticked reads
-- the deleted rows from the table.
```

Production, collections and adjustments per source are joins from `inbound_source` rows to `rpt_charges`, `rpt_payments`
and `rpt_adjustments` on `patient_id` (Referral Production List, Referral Summary, Referral Count Summary: `Production`,
`Collection`, `Adjs` columns). Era caveats: 665 migrated source rows, all direction "referred by" [D];
`referrals.patient_id` on migrated rows may point at the wrong patient [A] and is used only for the coarse
`source_category`; `referrals.cost` has no period; `referrals` rows are hard-deleted, which breaks the string link.

### 2.24 `rpt_recall_due()`

Purpose: who is due for recall, derived from procedure history and per-code intervals, merged with the recall rows
staff created in the app. Kind: function
`rpt_recall_due(p_tenant_id int, p_as_of date, p_office_ids int[] DEFAULT NULL, p_include_no_recall bool DEFAULT false)`.
Grain: (patient, recall code); with `p_include_no_recall`, plus one row per patient who has no recall at all.
`p_office_ids` scopes by the patient's home office, so the charge scan is not tenant-wide.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `patient_id`, `procedure_code` | | | the recall code; NULL on a `none` row |
| `source` | text | `recall_row` when an active `patient_recalls` row exists for the pair, `derived` from procedure history, `none` for a patient with neither | |
| `last_completed_date` | date | last `rpt_charges.service_date` for that code and patient | |
| `interval_span` | interval | recall row: `interval_months` with `interval_unit` (`year` multiplies, the column name is a misnomer [A]); derived: `rpt_procedure_code_dim.recall_interval_span` | |
| `due_date` | date | recall row `due_date`, else `last_completed_date + interval_span` | NULL = "No Recall Date" |
| `scheduled_basis` | text | `exact` = a live future appointment of the patient carries **that code** on a booked line; `any` = only some other live future appointment exists; NULL = none | legacy rule: a recall counts as scheduled only when the recall code is on the future appointment (`research/legacy_report_outputs_appointment_recall_referral.md` L66-70) |
| `scheduled_appointment_id`, `scheduled_date`, `scheduled_time`, `scheduled_provider_id` | | the earliest appointment of the basis; the appointment's provider | legacy code line `Scheduled Date`, `Time`, `Prdr`. Parity reports print them only when `scheduled_basis = 'exact'`; never the hand-typed `patient_recalls.scheduled_date` |
| `is_scheduled`, `has_any_future_appointment` | bool | `scheduled_basis = 'exact'`; `scheduled_basis IS NOT NULL` | `SCHEDULED/NOT SCHEDULED` binds to `is_scheduled`; worklists may use the looser flag |
| `recall_status` | text | `inactive` (row status), `scheduled` (exact), `no_due_date`, `overdue` (`due_date < p_as_of`), `due` (within 30 days), `not_due` | section 3.2 |
| `preferred_provider_id`, `preferred_hygienist_id`, `office_id` | | patient columns, falling back to the provider of the last completed recall procedure; patient home office | "Preferred Provider / Hygienist" criteria |
| `patient_is_active`, `account_send_collections` | bool | `patients.is_active`; `accounts.send_collections` of the patient's account | the function excludes nobody: "Include Inactive Patients" and the legacy exclusion of accounts flagged Send to Collection are filters of the report definition |

```sql
CREATE FUNCTION rpt_recall_due(p_tenant_id int, p_as_of date, p_office_ids int[] DEFAULT NULL,
                               p_include_no_recall bool DEFAULT false)
RETURNS TABLE (tenant_id int, patient_id int, procedure_code varchar, source text, last_completed_date date,
               interval_span interval, due_date date, scheduled_basis text, scheduled_appointment_id varchar,
               scheduled_date date, scheduled_time time, scheduled_provider_id varchar, is_scheduled bool,
               has_any_future_appointment bool, recall_status text, preferred_provider_id varchar,
               preferred_hygienist_id varchar, office_id int, patient_is_active bool, account_send_collections bool)
LANGUAGE sql STABLE AS $$
WITH pat AS (
  SELECT p.id, p.home_office_id, p.is_active, p.preferred_provider_id, p.preferred_hygienist_id, p.account_id
  FROM patients p
  WHERE p.tenant_id = p_tenant_id AND (p_office_ids IS NULL OR p.home_office_id = ANY (p_office_ids))),
last_done AS (
  SELECT c.patient_id, c.procedure_code, max(c.service_date) AS last_completed_date,
         (array_agg(c.provider_id ORDER BY c.service_date DESC))[1] AS last_provider_id
  FROM rpt_charges c JOIN pat ON pat.id = c.patient_id
  JOIN rpt_procedure_code_dim d ON d.procedure_code = c.procedure_code
  WHERE c.tenant_id = p_tenant_id AND c.service_date <= p_as_of AND d.recall_interval_span IS NOT NULL
  GROUP BY 1, 2),
rows_ AS (
  SELECT r.patient_id, r.procedure_code, r.due_date, lower(btrim(r.status)) AS row_status,
         CASE WHEN lower(coalesce(r.interval_unit, 'month')) LIKE 'y%' THEN make_interval(years => r.interval_months)
              ELSE make_interval(months => r.interval_months) END AS interval_span
  FROM patient_recalls r JOIN pat ON pat.id = r.patient_id
  WHERE r.is_active AND r.procedure_code IS NOT NULL),
u AS (
  SELECT coalesce(r.patient_id, l.patient_id) AS patient_id, coalesce(r.procedure_code, l.procedure_code) AS procedure_code,
         CASE WHEN r.patient_id IS NOT NULL THEN 'recall_row' ELSE 'derived' END AS source, l.last_completed_date,
         coalesce(r.interval_span, d.recall_interval_span) AS interval_span,
         coalesce(r.due_date, (l.last_completed_date + coalesce(r.interval_span, d.recall_interval_span))::date) AS due_date,
         r.row_status, l.last_provider_id
  FROM rows_ r FULL JOIN last_done l USING (patient_id, procedure_code)
  LEFT JOIN rpt_procedure_code_dim d ON d.procedure_code = coalesce(r.procedure_code, l.procedure_code)
  UNION ALL       -- "No Recall Date": patients with no recall row and no recall-code history
  SELECT pat.id, NULL, 'none', NULL, NULL, NULL, NULL, NULL
  FROM pat
  WHERE p_include_no_recall
    AND NOT EXISTS (SELECT 1 FROM rows_ r WHERE r.patient_id = pat.id)
    AND NOT EXISTS (SELECT 1 FROM last_done l WHERE l.patient_id = pat.id))
SELECT p_tenant_id, u.patient_id, u.procedure_code, u.source, u.last_completed_date, u.interval_span, u.due_date,
       CASE WHEN sx.appointment_id IS NOT NULL THEN 'exact' WHEN sa.appointment_id IS NOT NULL THEN 'any' END,
       coalesce(sx.appointment_id, sa.appointment_id), coalesce(sx.appointment_date, sa.appointment_date),
       coalesce(sx.start_time, sa.start_time), coalesce(sx.provider_id, sa.provider_id),
       (sx.appointment_id IS NOT NULL), (sx.appointment_id IS NOT NULL OR sa.appointment_id IS NOT NULL),
       CASE WHEN u.row_status = 'inactive' THEN 'inactive'
            WHEN sx.appointment_id IS NOT NULL THEN 'scheduled'
            WHEN u.due_date IS NULL THEN 'no_due_date'
            WHEN u.due_date < p_as_of THEN 'overdue'
            WHEN u.due_date <= p_as_of + 30 THEN 'due' ELSE 'not_due' END,
       coalesce(pat.preferred_provider_id, u.last_provider_id), pat.preferred_hygienist_id, pat.home_office_id,
       pat.is_active, coalesce(ac.send_collections, false)
FROM u JOIN pat ON pat.id = u.patient_id
LEFT JOIN accounts ac ON ac.id = pat.account_id
LEFT JOIN LATERAL (                 -- exact: the earliest live future booked line of the patient with this code
  SELECT ap.appointment_id, ap.appointment_date, ap.start_time, ap.appointment_provider_id AS provider_id
  FROM rpt_appointment_procedures ap
  WHERE ap.patient_id = u.patient_id AND ap.procedure_code = u.procedure_code AND ap.appointment_date >= p_as_of
    AND NOT ap.is_block AND NOT ap.is_legacy_archive AND ap.status_class NOT IN ('cancelled', 'no_show')
  ORDER BY ap.appointment_date, ap.start_time LIMIT 1) sx ON true
LEFT JOIN LATERAL (                 -- any: the earliest live future appointment of the patient
  SELECT f.appointment_id, f.appointment_date, f.start_time, f.provider_id
  FROM rpt_appointment_facts f
  WHERE f.patient_id = u.patient_id AND f.appointment_date >= p_as_of
    AND NOT f.is_block AND NOT f.is_deleted AND NOT f.is_legacy_archive AND f.status_class NOT IN ('cancelled', 'no_show')
  ORDER BY f.appointment_date, f.start_time LIMIT 1) sa ON true;
$$;
```

Report bindings: Recall Due — `RECALL DATE RANGE` on `due_date`; `No Recall Date` = `due_date IS NULL` (app recall rows
with a blank due date, plus the `none` rows of patients with no recall and no recall-code history, requested with
`p_include_no_recall`); `Scheduled` / `Not Scheduled` on `is_scheduled`. Scheduled Recall — `SCHEDULED DATE RANGE` on
`scheduled_date` where `scheduled_basis = 'exact'`. Both drop `account_send_collections` rows and, unless Include
Inactive Patients is ticked, `NOT patient_is_active` rows. The Recall mode of Benefits Used/Unused reads the same rows.

Era caveats: `patient_recalls` has 0 migrated rows and no engine [A]; for migrated patients every row is `derived`. The
derivation is only as good as `procedure_codes.recall_interval` / `recall_unit` (migrated from `RECALLINT` /
`RECALLUNIT` [V] `s10`, read by no service, unit vocabulary unverified — section 6 #22) and treats every recall code
independently (a patient alternating D1110 and D4910 has two rows; the legacy tool has the same stale-code quirk).
Booked lines exist for 6 % of migrated appointments [D], so `exact` matches are app-era in practice. DATA-41 turns the
derived rows into maintained ones.

### 2.25 `rpt_contract_installments`, `rpt_payment_plan_contracts` and `rpt_ortho_contracts`

`rpt_contract_installments` — purpose: periodic charges of regular and ortho contracts (Payment Plan Charges, contract
balances on Walkout / Statement / ageing). Grain: one instalment row of the three instalment tables.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `installment_key`, `patient_id` | | table prefix + id | |
| `contract_kind`, `plan_side` | text | `ortho` when `ortho_plan_id` is set else `regular`; `patient`, `ins`, `sec_ins` | legacy "Plan Type: Regular / Ortho" and "Ortho Patient / Primary / Secondary" |
| `ortho_plan_id`, `payment_plan_id`, `office_id`, `provider_id` | | contract header (`ortho_plans.office_id`, `pref_provider_id`; `patient_payment_plans.office_id`) | |
| `due_date`, `periodic_amount`, `periodic_order` | | `periodic_date`, `periodic_amt`, `periodic_order` | "Billing Date" |
| `is_billed`, `charge_id` | | `is_billed`; `ledger_id` | the only posted / unposted state [A]; the posting date is the `service_date` of that charge in `rpt_charges` |
| `has_card_on_file` | bool | `card_last4 IS NOT NULL` on the header | "Credit Card On File" |

```sql
CREATE VIEW rpt_contract_installments AS
SELECT i.tenant_id, 'ppi:' || i.id AS installment_key, i.patient_id,
       CASE WHEN i.ortho_plan_id IS NOT NULL THEN 'ortho' ELSE 'regular' END AS contract_kind, i.plan_side,
       i.ortho_plan_id, i.payment_plan_id, coalesce(o.office_id, r.office_id) AS office_id, o.pref_provider_id AS provider_id,
       i.periodic_date AS due_date, i.periodic_amt AS periodic_amount, i.periodic_order, i.is_billed, i.ledger_id AS charge_id,
       (coalesce(o.card_last4, r.card_last4) IS NOT NULL) AS has_card_on_file
FROM patient_plan_installments i
LEFT JOIN ortho_plans o ON o.id = i.ortho_plan_id
LEFT JOIN patient_payment_plans r ON r.id = i.payment_plan_id
UNION ALL
SELECT i.tenant_id, 'ipp:' || i.id, i.patient_id, 'ortho', 'ins', i.ortho_plan_id, NULL, o.office_id, o.pref_provider_id,
       i.periodic_date, i.periodic_amt, i.periodic_order, i.is_billed, i.ledger_id, false
FROM patient_ins_payment_plans i LEFT JOIN ortho_plans o ON o.id = i.ortho_plan_id
UNION ALL
SELECT i.tenant_id, 'spp:' || i.id, i.patient_id, 'ortho', 'sec_ins', i.ortho_plan_id, NULL, o.office_id, o.pref_provider_id,
       i.periodic_date, i.periodic_amt, i.periodic_order, i.is_billed, i.ledger_id, false
FROM patient_sec_ins_payment_plans i LEFT JOIN ortho_plans o ON o.id = i.ortho_plan_id;
```

`rpt_payment_plan_contracts` — purpose: the contract header list (Patients on Payment Plan: `PLAN TYPE` Regular / Ortho,
`PLAN SETUP DATE RANGE`, `CREDIT CARD ON FILE`). Grain: one `patient_payment_plans` or `ortho_plans` row, in one shape.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `contract_kind`, `contract_key`, `payment_plan_id`, `ortho_plan_id` | | `regular` / `ortho`; `'pp:' + id` / `'op:' + id` | |
| `patient_id`, `office_id`, `provider_id` | | header columns; ortho `pref_provider_id` (a regular plan has no provider: the report's `PREFERRED PROVIDER` reads `rpt_patient_dim`) | group header `Provider : ...` |
| `setup_date`, `ins_setup_date` | date | regular `setup_date`; ortho `pat_setup_date`, `ins_setup_date` | `Pat Plan Setup Dt`, `Ins Plan Setup Dt`; the date-range criterion binds to `setup_date` |
| `total_amount` | numeric | regular `coalesce(total_of_payments, amt_financed)`; ortho `total_ortho_amt` | `Total Ortho Amt.` |
| `pat_plan_amount`, `pat_periodic_amount`, `pat_payments_total` | | regular `amt_financed`, `periodic_amt`, `num_payments`; ortho `pat_share_amt`, `pat_periodic_amt`, `pat_num_payments` | `Pat Amount Total Pln.`, `Periodic Amt.`, `Pat No. of Pay Total` |
| `pat_payments_remaining`, `pat_amount_remaining` | | count and sum of the contract's unbilled patient-side instalments | `Rem.` columns, **recomputed**; the stored `rem_payments` / `*_rem_amt` are stale client snapshots [A] and are exposed as `pat_payments_remaining_stored` for comparison only |
| `ins_plan_amount`, `ins_periodic_amount`, `ins_payments_total`, `ins_payments_remaining`, `ins_amount_remaining` | | ortho `ins_plan_amount`, `ins_periodic_amt`, `ins_num_payments`; unbilled `ins` instalments; NULL on a regular plan | the insurance block of the ortho layout |
| `has_card_on_file`, `is_active` | bool | `card_last4 IS NOT NULL`; header flag | `CC On File` |

```sql
CREATE VIEW rpt_payment_plan_contracts AS
SELECT r.tenant_id, 'regular' AS contract_kind, 'pp:' || r.id AS contract_key, r.id AS payment_plan_id, NULL::int AS ortho_plan_id,
       r.patient_id, r.office_id, NULL::varchar AS provider_id, r.setup_date, NULL::date AS ins_setup_date,
       coalesce(r.total_of_payments, r.amt_financed) AS total_amount,
       r.amt_financed AS pat_plan_amount, r.periodic_amt AS pat_periodic_amount, r.num_payments AS pat_payments_total,
       x.pat_n AS pat_payments_remaining, x.pat_amt AS pat_amount_remaining, r.rem_payments AS pat_payments_remaining_stored,
       NULL::numeric AS ins_plan_amount, NULL::numeric AS ins_periodic_amount, NULL::int AS ins_payments_total,
       NULL::bigint AS ins_payments_remaining, NULL::numeric AS ins_amount_remaining,
       (r.card_last4 IS NOT NULL) AS has_card_on_file, r.is_active
FROM patient_payment_plans r
LEFT JOIN LATERAL (SELECT count(*) FILTER (WHERE NOT i.is_billed) AS pat_n,
                          coalesce(sum(i.periodic_amount) FILTER (WHERE NOT i.is_billed), 0) AS pat_amt
                   FROM rpt_contract_installments i WHERE i.payment_plan_id = r.id) x ON true
UNION ALL
SELECT o.tenant_id, 'ortho', 'op:' || o.id, NULL, o.id,
       o.patient_id, o.office_id, o.pref_provider_id, o.pat_setup_date, o.ins_setup_date,
       o.total_ortho_amt,
       o.pat_share_amt, o.pat_periodic_amt, o.pat_num_payments,
       x.pat_n, x.pat_amt, o.pat_rem_payments,
       o.ins_plan_amount, o.ins_periodic_amt, o.ins_num_payments,
       x.ins_n, x.ins_amt,
       (o.card_last4 IS NOT NULL), o.is_active
FROM ortho_plans o
LEFT JOIN LATERAL (SELECT count(*) FILTER (WHERE NOT i.is_billed AND i.plan_side = 'patient') AS pat_n,
                          coalesce(sum(i.periodic_amount) FILTER (WHERE NOT i.is_billed AND i.plan_side = 'patient'), 0) AS pat_amt,
                          count(*) FILTER (WHERE NOT i.is_billed AND i.plan_side = 'ins') AS ins_n,
                          coalesce(sum(i.periodic_amount) FILTER (WHERE NOT i.is_billed AND i.plan_side = 'ins'), 0) AS ins_amt
                   FROM rpt_contract_installments i WHERE i.ortho_plan_id = o.id) x ON true;
```

`rpt_ortho_contracts` — purpose: ortho status lists. Grain: one active `ortho_plans` row.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `ortho_plan_id`, `patient_id`, `office_id`, `provider_id` | | `ortho_plans.*`; `pref_provider_id` | |
| `banding_date`, `treat_start_date`, `treat_end_date` | date | same-named | "Ortho Start Date" criterion = `coalesce(banding_date, treat_start_date)` |
| `months_in_treatment`, `months_remaining`, `is_past_planned_end` | int, int, bool | derived from the dates as of the office's today | the stored `months_remaining`, `*_rem_payments`, `*_rem_amt` are stale client snapshots [A] |
| `total_ortho_amt`, `ins_share_amt`, `pat_share_amt` | numeric | same-named | contract totals |
| `unbilled_count`, `unbilled_amount`, `overdue_count`, `next_due_date` | | `rpt_contract_installments` rows of the contract | remaining to bill; instalments due and not posted |
| `last_visit_date`, `weeks_since_last_visit` | | last charge with `is_ortho_code` (after DATA-42: last `ortho_visits` row) | Ortho Compliance "weeks since last visit"; the next appointment comes from `rpt_patient_activity` |
| `ortho_status_code`, `debond_date` | | NEW columns (DATA-42) | NULL until then |

```sql
CREATE VIEW rpt_ortho_contracts AS
SELECT o.tenant_id, o.id AS ortho_plan_id, o.patient_id, o.office_id, o.pref_provider_id AS provider_id,
       o.banding_date, o.treat_start_date, o.treat_end_date,
       (extract(year FROM age(k.today, k.start_date)) * 12 + extract(month FROM age(k.today, k.start_date)))::int AS months_in_treatment,
       CASE WHEN o.treat_end_date IS NOT NULL THEN
            greatest(0, (extract(year FROM age(o.treat_end_date, k.today)) * 12
                       + extract(month FROM age(o.treat_end_date, k.today)))::int) END AS months_remaining,
       (o.treat_end_date < k.today) AS is_past_planned_end,
       o.total_ortho_amt, o.ins_share_amt, o.pat_share_amt,
       x.unbilled_count, x.unbilled_amount, x.overdue_count, x.next_due_date,
       lv.last_visit_date, (k.today - lv.last_visit_date) / 7 AS weeks_since_last_visit,
       NULL::varchar AS ortho_status_code, NULL::date AS debond_date         -- o.ortho_status_code, o.debond_date after DATA-42
FROM ortho_plans o
LEFT JOIN offices f ON f.id = o.office_id
CROSS JOIN LATERAL (SELECT (now() AT TIME ZONE coalesce(f.timezone, 'America/New_York'))::date AS today,
                           coalesce(o.banding_date, o.treat_start_date) AS start_date) k
LEFT JOIN LATERAL (SELECT count(*) FILTER (WHERE NOT i.is_billed) AS unbilled_count,
                          sum(i.periodic_amount) FILTER (WHERE NOT i.is_billed) AS unbilled_amount,
                          count(*) FILTER (WHERE NOT i.is_billed AND i.due_date < k.today) AS overdue_count,
                          min(i.due_date) FILTER (WHERE NOT i.is_billed) AS next_due_date
                   FROM rpt_contract_installments i WHERE i.ortho_plan_id = o.id) x ON true
LEFT JOIN LATERAL (SELECT max(c.service_date) AS last_visit_date FROM rpt_charges c
                   WHERE c.patient_id = o.patient_id AND c.is_ortho_code) lv ON true
WHERE o.is_active;
```

Era caveats: no ortho contract, regular plan or instalment was migrated (empty exports [V] `s52`); all contract
reporting is app-era. No payment-to-instalment link exists, so "paid vs due" per contract is not readable; the periodic
posting sweep is not scheduled anywhere [A], so unposted instalments are an exception list, not a rarity. A charge id
written for an insurance-side instalment is 39 characters and the two insurance tables hold `ledger_id varchar(20)` [V]
(section 6 #26). **Contract billing can debit A/R twice**: posting an instalment writes a charge and nothing else [V]
`payment_plan_service.py` L335-355 — no "balance moved to contract" credit exists anywhere in the application, and only
the two billing codes are seeded [V] `scripts/seed_payment_plan_codes.py` L22-25. A regular plan set up over treatment
that is already on the ledger therefore bills the same money a second time, and an ortho contract whose initial charge
carried the full fee is over-billed by its periodic charges. Section 6 #33 and #34 list both cases; they are data
defects to correct in the ledger, not something a report can net out.

### 2.26 `rpt_time_clock` and `rpt_lab_cases`

`rpt_time_clock` — grain: one active `time_clock_entries` row. Purpose: hours by user, office and local work date for
analytics; the Time Clock Report itself keeps calling `time_clock_service.build_report` (overtime, wages, issue flags,
caller rule and audit already exist [A]) through an engine adapter.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `entry_id`, `user_id`, `office_id` | | `time_clock_entries.*` | `office_id` can be NULL on legacy rows [A] |
| `clock_in`, `clock_out`, `total_hours` | timestamp, timestamp, numeric | same-named | `total_hours` is derived on every write |
| `work_date` | date | `wall_clock` rows: `clock_in::date`; otherwise the office-local date of `clock_in` | the day a shift belongs to |
| `entry_type`, `is_paid` | text, bool | `entry_type`; `entry_type = 'work'` | breaks and lunch are unpaid |
| `source`, `clock_basis`, `is_edited`, `auto_closed`, `is_open`, `era` | | same-named; `clock_out IS NULL`; `legacy_id IS NOT NULL` | issue flags |

```sql
CREATE VIEW rpt_time_clock AS
SELECT e.tenant_id, e.id AS entry_id, e.user_id, e.office_id, e.entry_type, e.source, e.clock_basis,
       e.clock_in, e.clock_out, e.total_hours,
       CASE WHEN e.clock_basis = 'wall_clock' THEN e.clock_in::date       -- legacy rows hold office wall time [A]
            ELSE (e.clock_in AT TIME ZONE 'UTC' AT TIME ZONE coalesce(o.timezone, 'America/New_York'))::date END AS work_date,
       (e.entry_type = 'work') AS is_paid, e.is_edited, e.auto_closed, (e.clock_out IS NULL) AS is_open,
       CASE WHEN e.legacy_id IS NOT NULL THEN 'migrated' ELSE 'app' END AS era
FROM time_clock_entries e LEFT JOIN offices o ON o.id = e.office_id
WHERE e.is_active;
```

Era caveats (`rpt_time_clock`): the 31,756 migrated punches are `wall_clock` rows [D]; 856 open legacy rows were flagged
`auto_closed` and count 0 hours [D]; there is no planned-shift data in either era.

`rpt_lab_cases` — purpose: Lab Report and Lab Cost Report. Grain: one non-deleted appointment with `has_lab`.

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `appointment_id`, `office_id`, `provider_id`, `patient_id`, `appointment_date` | | `rpt_appointment_facts` | tenant, delete and archive flags come from there |
| `lab_vendor_id`, `lab_dds`, `lab_cost`, `lab_short_notice` | | `appointments.*` | vendor -> `labs`; `lab_dds` is free text |
| `lab_sent_on`, `lab_due_on`, `lab_received_on` | date | same-named | with the appointment date, the four legacy date bases |
| `lab_status` | text | `received`, `overdue`, `sent`, `not_sent` — the rule of `lab_tracking_service.derive_lab_status` [A] with "today" = the office's local date | |
| `turnaround_days`, `days_late` | int | `lab_received_on - lab_sent_on`; `lab_received_on - lab_due_on` | vendor performance |
| `is_missing_for_visit` | bool | `lab_received_on IS NULL AND appointment_date <= office_local_today` | the case is not back for the visit that needs it |

```sql
CREATE VIEW rpt_lab_cases AS
SELECT f.tenant_id, a.id AS appointment_id, f.office_id, f.provider_id, f.patient_id, f.appointment_date,
       a.lab_vendor_id, a.lab_dds, a.lab_cost, a.lab_short_notice, a.lab_sent_on, a.lab_due_on, a.lab_received_on,
       CASE WHEN a.lab_received_on IS NOT NULL THEN 'received'
            WHEN a.lab_sent_on IS NOT NULL AND a.lab_due_on < f.office_local_today THEN 'overdue'
            WHEN a.lab_sent_on IS NOT NULL THEN 'sent' ELSE 'not_sent' END AS lab_status,
       a.lab_received_on - a.lab_sent_on AS turnaround_days, a.lab_received_on - a.lab_due_on AS days_late,
       (a.lab_received_on IS NULL AND f.appointment_date <= f.office_local_today) AS is_missing_for_visit
FROM appointments a JOIN rpt_appointment_facts f ON f.appointment_id = a.id
WHERE a.has_lab AND NOT f.is_deleted;
```

Era caveats (`rpt_lab_cases`): 18 migrated lab cases, 14 of them in the archive partition [D]; vendor, DDS and
short-notice are app-era.

### 2.27 `rpt_audit_events`

Purpose: Audit Trail and the exception reports (deleted, changed, back-dated transactions). Grain: one audited change.
Source: `audit_logs` (successful authenticated mutations and `PRINT` rows only [A]) plus, as further branches of the
same shape, `time_clock_entry_edits`, `account_change_events`, `signature_audit_events`, and the NEW tables
(`appointment_events`, `claim_status_history`, `treatment_plan_item_events`, `office_day_closes`,
`financial_period_locks`).

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `event_id`, `occurred_at_utc`, `occurred_date` | | `audit_logs.tenant_id`, `id`, `created_at`; office-local date | legacy `Updated Date`, `Time` |
| `user_id`, `office_id`, `patient_id` | int | same-named | `office_id` is NULL on `PRINT` rows |
| `audit_type` | text | the five legacy values `edit`, `delete`, `close_out`, `reschedule`, `cut_copy_paste`, plus the additive `create`, `print`, `status_change`, `restore` (rules below) | legacy "Audit Type" (Edit, Delete, Close out, Reschedule Appointment, Cut / Copy - Paste Appointment); the additive values are offered beside them, never instead |
| `module_type` | text | `resource_type` mapped through `rpt_value_map` domain `audit_module` (`appointments` -> `appointments`; `patients`, `patient-*` -> `patient`; `patient-procedures`, `patient-payments`, `patient-adjustments`, `insurance-claims`, `ledger-insurance-details` -> `transactions`; `treatment-plan*` -> `treatment_plan`; other -> `setup`) | legacy "Module Type" |
| `resource_type`, `resource_id`, `path` | text | same-named | drill-down |
| `before`, `after` | jsonb | `details::jsonb -> 'before'`, `-> 'after'` | present for generic CRUD writes; absent for `patient-procedures` writes and for `/status` endpoints until DATA-14 [A] |
| `original_amount`, `updated_amount` | numeric | keys `fee`, `amount` of `before` / `after` | legacy `Original Amt`, `Tran Amt.` |
| `original_patient_amount`, `original_insurance_amount`, `updated_patient_amount`, `updated_insurance_amount` | numeric | keys `patient_estimate`, `insurance_estimate` | legacy `Original Amt / Ins Amt` and `Updated Pat Amt / Ins Amt` |
| `original_date`, `updated_date` | date | keys `date_of_service`, `payment_date`, `adjustment_date` | legacy `Original Date`; a changed transaction date |

| `audit_type` | Rule today (`audit_logs`) | Source after the event tables exist |
|---|---|---|
| `delete` | `method = 'DELETE'` | plus `appointment_events.event_type = 'deleted'` |
| `edit` | `PUT` / `PATCH` not matched below | plus `time_clock_entry_edits`, `account_change_events` |
| `reschedule` | an `appointments` `PUT` / `PATCH` whose `before` / `after` differ in `date` or `start_time` | `appointment_events.event_type = 'rescheduled'` (DATA-17) |
| `cut_copy_paste` | not distinguishable (a cut-paste is an ordinary update, a copy an ordinary create) | `appointment_events.event_type IN ('moved_cut_paste', 'copied')` (DATA-17) |
| `close_out` | no source | `office_day_closes` rows (close and reopen), `financial_period_locks` rows (DATA-29) |
| `create`, `print`, `status_change`, `restore` | `POST`; `action = 'PRINT'`; path suffix `/status`; path suffix `/restore` | `claim_status_history`, `treatment_plan_item_events`, appointment status events |

```sql
CREATE VIEW rpt_audit_events AS
SELECT l.tenant_id, 'al:' || l.id AS event_id, l.created_at AS occurred_at_utc,
       (l.created_at AT TIME ZONE 'UTC' AT TIME ZONE coalesce(o.timezone, 'America/New_York'))::date AS occurred_date,
       l.user_id, l.office_id, l.patient_id,
       CASE WHEN l.action = 'PRINT' THEN 'print'
            WHEN l.method = 'DELETE' THEN 'delete'
            WHEN l.path LIKE '%/status' THEN 'status_change'
            WHEN l.path LIKE '%/restore' THEN 'restore'
            WHEN l.resource_type = 'appointments' AND l.method IN ('PUT', 'PATCH')
                 AND (b.j ->> 'date' IS DISTINCT FROM a.j ->> 'date' OR b.j ->> 'start_time' IS DISTINCT FROM a.j ->> 'start_time')
                 AND a.j ? 'date' THEN 'reschedule'
            WHEN l.method = 'POST' THEN 'create' ELSE 'edit' END AS audit_type,
       coalesce(vm.canonical_value, 'setup') AS module_type, l.resource_type, l.resource_id, l.path,
       b.j AS before, a.j AS after,
       coalesce(b.j ->> 'fee', b.j ->> 'amount')::numeric AS original_amount,
       coalesce(a.j ->> 'fee', a.j ->> 'amount')::numeric AS updated_amount,
       (b.j ->> 'patient_estimate')::numeric AS original_patient_amount,
       (b.j ->> 'insurance_estimate')::numeric AS original_insurance_amount,
       (a.j ->> 'patient_estimate')::numeric AS updated_patient_amount,
       (a.j ->> 'insurance_estimate')::numeric AS updated_insurance_amount,
       coalesce(b.j ->> 'date_of_service', b.j ->> 'payment_date', b.j ->> 'adjustment_date')::date AS original_date,
       coalesce(a.j ->> 'date_of_service', a.j ->> 'payment_date', a.j ->> 'adjustment_date')::date AS updated_date
FROM audit_logs l
LEFT JOIN offices o ON o.id = l.office_id
LEFT JOIN rpt_value_map vm ON vm.domain = 'audit_module' AND vm.raw_value = l.resource_type
CROSS JOIN LATERAL (SELECT l.details::jsonb -> 'before' AS j) b
CROSS JOIN LATERAL (SELECT l.details::jsonb -> 'after' AS j) a;
-- UNION ALL branches with the same column list are added as their tables arrive (table above); the casts are guarded in
-- the implementation, because audit values are truncated to 500 characters and some keys are masked [A].
```

Era caveats: nothing predates the migration; reads, failed requests and logins are not audited; `close_out` and
`cut_copy_paste` return no rows until DATA-29 and DATA-17; the patient / insurance amount columns are empty for charge
writes until DATA-14 adds before / after there. Report runs and exports are audited by the engine (`02`, `08`), not here.

### 2.28 `rpt_office_calendar_days()`, `rpt_provider_calendar_days()` and `rpt_communication_facts`

The two calendar functions ship in P1 (DATA-55): the first Main and Provider Dashboards need Working Hours, Provider
Working Hours and Provider Hourly Production (section 11.2), and neither function needs a schema change.

`rpt_office_calendar_days()` — purpose: the one calendar for working days, open minutes and chair capacity. Grain:
(office, day). Mirrors `office_calendar_service.calendar()` (office holiday row beats the account row; a NULL status
counts as closed; `HALF_DAY` does not close) — CTEs `days`, `hol`, `open_min`, `chairs` of
`analysis/be_data_scheduling.md` §8.6.

```sql
CREATE FUNCTION rpt_office_calendar_days(p_tenant_id int, p_office_ids int[], p_date_from date, p_date_to date)
RETURNS TABLE (tenant_id int, office_id int, calendar_date date, is_open bool, open_minutes int,
               hours_source text,                 -- stored | default (no schedule rows: Monday-Friday 08:00-17:00 assumed)
               holiday_name text, active_operatory_count int, chair_capacity_minutes int)
LANGUAGE sql STABLE AS $$
WITH days AS (SELECT o.id AS office_id, d::date AS d, extract(isodow FROM d)::int - 1 AS dow     -- 0 = Monday, as stored
              FROM offices o CROSS JOIN generate_series(p_date_from, p_date_to, interval '1 day') d
              WHERE o.tenant_id = p_tenant_id AND o.id = ANY (p_office_ids)),
hol AS (SELECT DISTINCT ON (dd.office_id, dd.d) dd.office_id, dd.d, upper(coalesce(h.status, 'CLOSED')) AS status, h.holiday_name
        FROM days dd JOIN account_holidays h ON h.tenant_id = p_tenant_id
         AND (h.office_id = dd.office_id OR h.office_id IS NULL)
         AND (h.holiday_date = dd.d OR (h.is_recurring AND to_char(h.holiday_date, 'MMDD') = to_char(dd.d, 'MMDD')))
        ORDER BY dd.office_id, dd.d, (h.office_id IS NULL)),
om AS (SELECT dd.office_id, dd.d, hol.holiday_name, (s.id IS NULL) AS assumed,
              CASE WHEN hol.status = 'CLOSED' THEN 0
                   WHEN s.id IS NULL THEN CASE WHEN dd.dow >= 5 THEN 0 ELSE 540 END
                   WHEN s.is_closed OR s.start_time IS NULL OR s.end_time IS NULL THEN 0
                   ELSE (extract(epoch FROM (s.end_time - s.start_time)) / 60
                         - coalesce(extract(epoch FROM (s.lunch_end - s.lunch_start)) / 60, 0))::int END AS minutes
       FROM days dd
       LEFT JOIN LATERAL (SELECT x.* FROM office_schedule_days x                  -- one row per office and weekday
                          WHERE x.office_id = dd.office_id AND x.day_of_week = dd.dow ORDER BY x.id DESC LIMIT 1) s ON true
       LEFT JOIN hol ON hol.office_id = dd.office_id AND hol.d = dd.d)
SELECT p_tenant_id, om.office_id, om.d, om.minutes > 0, om.minutes,
       CASE WHEN om.assumed THEN 'default' ELSE 'stored' END, om.holiday_name, ch.n, om.minutes * ch.n
FROM om CROSS JOIN LATERAL (SELECT count(*)::int AS n FROM operatories op
                            WHERE op.office_id = om.office_id AND op.is_active) ch;
$$;
```

`rpt_provider_calendar_days()` — purpose: scheduled hours of a provider at an office, per day. Grain: (provider, office,
day). Order of rules: the provider's weekly template in force on the day (`provider_schedule_days`, honouring
`effective_from`; a row with NULL `office_id` applies to every office the provider works at [V]), closed when the office
is closed that day (account and office holidays) or the provider has a closing `provider_holidays` row; a provider with
no template rows at all falls back to the office hours.

```sql
CREATE FUNCTION rpt_provider_calendar_days(p_tenant_id int, p_provider_ids varchar[], p_date_from date, p_date_to date,
                                           p_office_ids int[] DEFAULT NULL)
RETURNS TABLE (tenant_id int, provider_id varchar, office_id int, calendar_date date, is_scheduled bool,
               scheduled_minutes int,
               hours_source text,                 -- provider_schedule | office_hours | default
               holiday_name text)
LANGUAGE sql STABLE AS $$
WITH po AS (      -- provider x office pairs: the roster plus the provider's home office (prefer, never exclude)
  SELECT p.id AS provider_id, x.office_id,
         EXISTS (SELECT 1 FROM provider_schedule_days z WHERE z.provider_id = p.id) AS has_template
  FROM providers p
  CROSS JOIN LATERAL (SELECT r.office_id FROM provider_offices r WHERE r.provider_id = p.id UNION SELECT p.office_id) x
  WHERE p.tenant_id = p_tenant_id AND (p_provider_ids IS NULL OR p.id = ANY (p_provider_ids))
    AND (p_office_ids IS NULL OR x.office_id = ANY (p_office_ids))),
oc AS (SELECT * FROM rpt_office_calendar_days(p_tenant_id, ARRAY(SELECT DISTINCT office_id FROM po), p_date_from, p_date_to))
SELECT p_tenant_id, po.provider_id, po.office_id, oc.calendar_date, m.minutes > 0, m.minutes,
       CASE WHEN po.has_template THEN 'provider_schedule'
            WHEN oc.hours_source = 'default' THEN 'default' ELSE 'office_hours' END,
       coalesce(ph.holiday_name, oc.holiday_name)
FROM po JOIN oc ON oc.office_id = po.office_id
LEFT JOIN LATERAL (SELECT s.* FROM provider_schedule_days s              -- the template row in force on the day
                   WHERE s.provider_id = po.provider_id AND (s.office_id = po.office_id OR s.office_id IS NULL)
                     AND s.day_of_week = extract(isodow FROM oc.calendar_date)::int - 1
                     AND coalesce(s.effective_from, DATE '1900-01-01') <= oc.calendar_date
                   ORDER BY (s.office_id IS NULL), s.effective_from DESC NULLS LAST, s.id DESC LIMIT 1) s ON true
LEFT JOIN LATERAL (SELECT h.holiday_name, upper(coalesce(h.status, 'CLOSED')) AS status FROM provider_holidays h
                   WHERE h.provider_id = po.provider_id
                     AND (h.holiday_date = oc.calendar_date
                          OR (h.is_recurring AND to_char(h.holiday_date, 'MMDD') = to_char(oc.calendar_date, 'MMDD')))
                   ORDER BY h.id LIMIT 1) ph ON true
CROSS JOIN LATERAL (SELECT
     CASE WHEN NOT oc.is_open OR ph.status = 'CLOSED' THEN 0
          WHEN NOT po.has_template THEN oc.open_minutes
          WHEN s.id IS NULL OR s.is_closed OR s.start_time IS NULL OR s.end_time IS NULL THEN 0
          ELSE (extract(epoch FROM (s.end_time - s.start_time)) / 60
                - coalesce(extract(epoch FROM (s.lunch_end - s.lunch_start)) / 60, 0))::int END AS minutes) m;
$$;
```

Three different hour measures exist and are never mixed (the reference Provider Dashboard shows two sources that
disagree, `analysis/reference_screenshots.md` §3.5):

| Measure | Source | Meaning |
|---|---|---|
| scheduled hours | `rpt_provider_calendar_days().scheduled_minutes`; office: `open_minutes` | planned availability; `hours_source` is printed |
| booked hours | `sum(rpt_appointment_facts.duration_minutes)` of live appointments (blocks excluded) | time on the book |
| clocked hours | `rpt_time_clock.total_hours` of paid entries, through `providers.user_id` | attendance; exists only for providers linked to a user who punches |

Era caveats: schedules and holidays are unmigrated and unseeded, only the current office template is stored (provider
templates carry `effective_from`), and unconfigured offices fall back to an assumed Monday-Friday 08:00-17:00 [A]: past
months use today's template. Capacity history needs DATA-43.

`rpt_communication_facts` (P3, DATA-43) — purpose: reminder and confirmation funnel. Grain: one outbound message (the
reply sits on the outbound row [A]). Columns: `tenant_id`, `channel` (`sms`, `email`), `message_id`, `office_id`,
`patient_id`, `appointment_id`, `message_type`, `sent_at_utc`, `sent_date` (office-local), `is_delivered`,
`replied_at_utc`, `reply_intent`, `reminder_lead_hours`, `is_automated` (`created_by IS NULL`), `era`.

```sql
CREATE VIEW rpt_communication_facts AS
SELECT m.tenant_id, 'sms' AS channel, m.id AS message_id, m.office_id, m.patient_id, m.appointment_id, m.message_type,
       m.sent_at AS sent_at_utc, (m.send_status = 'delivered') AS is_delivered, m.reply_received_on AS replied_at_utc,
       m.reply_intent, m.reminder_lead_hours, (m.created_by IS NULL) AS is_automated,
       CASE WHEN m.legacy_id IS NOT NULL THEN 'migrated' ELSE 'app' END AS era
FROM sms_messages m WHERE coalesce(m.direction, 'outbound') = 'outbound'
UNION ALL
SELECT e.tenant_id, 'email', e.id, e.office_id, e.patient_id, e.appointment_id, e.message_type, e.sent_at,
       (e.delivered_at IS NOT NULL), NULL, NULL, NULL, (e.created_by IS NULL), 'app'
FROM email_messages e;
```

Era caveats: `message_type`, `direction` and `sent_at` of the 5,425 migrated texts were back-filled by heuristics [A];
AppointNow notifications are not logged in either table; in log-only gateway mode `send_status` stays `queued`. No
vendor or confirmation channel is stored on an appointment in either era (DATA-17).

### 2.29 `rpt_fee_schedule_fees`

Purpose: the fee of a code on a chosen fee schedule on a date — the compare-fee column of the Production Report (Daily
and My Reports: `Include UCR` + `Fee Schedule To Compare`, compare value = count x schedule fee), Capitation Utilization
(`Fee Schedule To Compare`; its `Co - Pay` and `Sup. Fee.` columns are the patient and insurance amounts of the
managed-care schedule), Procedure Codes by Fee Schedule and Capitation Fee Schedule. `rpt_charges.office_fee` is only the
UCR snapshot stored on the charge and cannot serve a schedule chosen at run time. Grain: (fee schedule, code, effective
period). Phase P1 (DATA-51).

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `fee_schedule_id`, `fee_schedule_name`, `pricing_model`, `fee_type` | | `fee_schedules` | `pricing_model = 'copay'` = a managed-care list holding both dollar parts |
| `procedure_code`, `effective_date`, `effective_to` | | `fee_schedule_entries`; `lead(effective_date)` over the code's entries of the schedule | half-open validity `[effective_date, effective_to)`; NULL `effective_to` = in force |
| `patient_fee`, `insurance_fee`, `is_no_charge` | | same-named | Capitation Utilization `Co - Pay` / `Sup. Fee.` |
| `schedule_fee` | numeric | the rule of `pricing_service._entry_fee` [V] L509-518: 0 when `is_no_charge`; on a `copay` list `patient_fee` when positive, else `insurance_fee`; otherwise `patient_fee` | the single compare fee |

```sql
CREATE VIEW rpt_fee_schedule_fees AS
SELECT fs.tenant_id, e.fee_schedule_id, fs.name AS fee_schedule_name, fs.pricing_model, fs.fee_type, e.procedure_code,
       e.effective_date,
       lead(e.effective_date) OVER (PARTITION BY e.fee_schedule_id, e.procedure_code
                                    ORDER BY e.effective_date, e.id) AS effective_to,
       e.patient_fee, e.insurance_fee, e.is_no_charge,
       CASE WHEN e.is_no_charge THEN 0
            WHEN fs.pricing_model = 'copay' AND coalesce(e.patient_fee, 0) > 0 THEN e.patient_fee
            WHEN fs.pricing_model = 'copay' THEN coalesce(e.insurance_fee, 0)
            ELSE coalesce(e.patient_fee, 0) END AS schedule_fee
FROM fee_schedule_entries e JOIN fee_schedules fs ON fs.id = e.fee_schedule_id;

-- compare column of a production row (one fee per charge: the lateral cannot fan out)
SELECT c.procedure_code, count(*) AS performed, sum(c.charged_fee) AS charges, sum(f.schedule_fee) AS compare_fee
FROM rpt_charges c
LEFT JOIN LATERAL (SELECT x.schedule_fee FROM rpt_fee_schedule_fees x
                   WHERE x.fee_schedule_id = :compare_fee_schedule_id AND x.procedure_code = c.procedure_code
                     AND x.effective_date <= c.service_date AND (x.effective_to IS NULL OR c.service_date < x.effective_to)
                   ORDER BY x.effective_date DESC LIMIT 1) f ON true
WHERE c.tenant_id = :tenant_id AND c.is_production AND c.service_date BETWEEN :date_from AND :date_to
GROUP BY 1;
```

Era caveats: none for the schedules themselves; entries carry one `effective_date` each and no end date, so a deleted
entry rewrites the past. The lookup is served by an existing index [V] (`schema.sql`:
`ix_fee_schedule_entries_schedule_code_date` on `(fee_schedule_id, procedure_code, effective_date DESC)`).

### 2.30 `rpt_patient_alerts` and the note passthroughs

Purpose: alerts printed or filtered by legacy reports — Routing Slip `Med Alerts` and `Flash Alerts` (`Message`,
`Block Charge`), Procedural Recall `Med. Alerts`, Patients Seen by medical alert, Patient List - Grouped By
`Medical Alert`. Grain: one alert of a patient. Phase P1 (DATA-52). Clinical data class (`08_security_compliance.md`).

| Column | Type | Source expression | Meaning |
|---|---|---|---|
| `tenant_id`, `patient_id`, `alert_key`, `alert_kind` | | `'pa:' + patient_alerts.id` (`alert`), `'ma:' + patient_medical_alerts.id` (`medical`) | free-text banner alerts versus Yes-answers to a medical-alert item |
| `alert_code`, `alert_label` | text | medical: `alert_code`, `coalesce(alert_label, alert_code)`; alert: NULL, `alert` | the medical-alert picker binds to `alert_code` |
| `is_flash_alert`, `blocks_charges` | bool | row flags; a medical answer with a NULL flag takes the flag of its `MEDALERT` definition | Routing Slip `Flash Alerts` box |
| `is_active` | bool | alert: `is_active`; medical: `is_active` and `response = 'yes'` | `no` / `unknown` answers and missing rows are not alerts |
| `era` | text | `patient_alerts.legacy_id IS NOT NULL` -> `migrated` | 46,680 migrated `patient_alerts` rows [A] |

```sql
CREATE VIEW rpt_patient_alerts AS
SELECT pt.tenant_id, a.patient_id, 'pa:' || a.id AS alert_key, 'alert' AS alert_kind,
       NULL::varchar AS alert_code, a.alert AS alert_label, a.is_flash_alert, a.blocks_charges, a.is_active,
       CASE WHEN a.legacy_id IS NOT NULL THEN 'migrated' ELSE 'app' END AS era
FROM patient_alerts a JOIN patients pt ON pt.id = a.patient_id
WHERE a.source_medical_alert_id IS NULL            -- a banner copied from a medical alert is listed once, from its source
UNION ALL
SELECT m.tenant_id, m.patient_id, 'ma:' || m.id, 'medical', m.alert_code, coalesce(m.alert_label, m.alert_code),
       coalesce(m.is_flash_alert, df.is_flash_alert, false), coalesce(m.blocks_charges, df.blocks_charges, false),
       (m.is_active AND lower(coalesce(m.response, '')) = 'yes'), 'app'
FROM patient_medical_alerts m
LEFT JOIN LATERAL (<flags of the MEDALERT definition of m.alert_code, one row>) df ON true;
```

Passthrough datasets registered in P1 with it (they feed the P1 Routing Slip and Ledger Report, not only the P3 lists):

| Dataset | Table | Used by |
|---|---|---|
| `patient_notes` | `patient_notes` (non-deleted) | Routing Slip `Pat Notes`; Patient's Notes type `Patient Notes` |
| `account_notes` | `account_notes` (4,518 migrated rows [A]; scoped through `patients`) | Ledger Report "Print all transactions (includes statements, ledger notes)" note lines; Patient's Notes types `Responsible Party Notes`, `Financial Notes` (with `accounts.financial_notes`) |
| `patient_statements` | `patient_statements` | Ledger Report `Statement Sent - $X.XX` lines; Responsible Party - Statements Sent |
| `provider_route_slips` | `provider_route_slips` (`provider_id`, `procedure_code`, `num_times`) | Routing Slip: the appointment provider's default codes when the appointment has no booked line |

The Routing Slip counters `# of Ref` / `Lst Ref` are the count and latest `referral_date` of `rpt_referral_facts`
`inbound_source` rows whose source row names this patient; they are unreliable for migrated sources (2.23).

### 2.31 `rpt_smart_assist_checks()`

Purpose: the SmartAssist Report Card — a per-appointment compliance checklist computed at run time against the office's
SmartAssist setup, not a stored result and not a communication report. The setup exists [V]:
`office_smart_assist_items` (`item_code`, `frequency`, `include_unpaid_balance`, `is_enabled`) with the catalog
`payment`, `email`, `cell_phone`, `eligibility`, `medical_history`, `hipaa`, `consent_form_1` .. `consent_form_4`,
`progress_note`, `ledger_posting` (`office_setup_service.SMART_ASSIST_CATALOG` L314-337; nothing reads it to run today).
Grain: one appointment. Phase P3 (DATA-54).

```sql
CREATE FUNCTION rpt_smart_assist_checks(p_tenant_id int, p_office_ids int[], p_date_from date, p_date_to date)
RETURNS TABLE (tenant_id int, appointment_id varchar, office_id int, provider_id varchar, patient_id int,
               appointment_date date, start_time time, status_class text,
               payment text, email text, cell_phone text, eligibility text, medical_history text, hipaa text,
               consent_form_1 text, consent_form_2 text, consent_form_3 text, consent_form_4 text,
               progress_note text, ledger_posting text, next_appointment text,      -- each: pass | fail | not_enabled
               checked_in_by_user_id int, checked_out_by_user_id int)               -- NULL until DATA-17
```

| Check | `pass` when (item enabled for the appointment's office; otherwise `not_enabled`) | Source |
|---|---|---|
| `payment` | the patient's ledger balance is not positive; with `include_unpaid_balance`, additionally no charge of that appointment date has an open amount | `rpt_ledger_entries`; `rpt_fifo_core()` open debits of the account |
| `email`, `cell_phone` | a value is on file | `rpt_patient_dim` (a recorded bypass reason does not exist) |
| `eligibility` | the primary dental slot has `elig_status_class = 'verified'` | `rpt_insurance_coverage` (current stamp: an expired stamp turns history to fail, as in the legacy tool) |
| `medical_history` | the latest of `alerts_completed_at`, `dental_completed_at`, `medical_completed_at` falls inside the item's frequency window ending on the appointment date | `patient_medical_history` |
| `hipaa` | `patients.hipaa_agreement`, or a signed consent of the item's template inside the frequency window | `rpt_patient_dim`; `patient_consents` |
| `consent_form_1` .. `4` | a non-deleted `patient_consents` row of the item's template with `signed_at` inside the frequency window | `patient_consents`; the template of an item is NEW (`office_smart_assist_items.consent_template_id`, DATA-54) — an item without a template reports `not_enabled` and the report header lists it |
| `progress_note` | a non-struck note of the patient in the same office on the appointment date | `rpt_progress_note_facts` |
| `ledger_posting` | a visit-code charge of the patient in the same office on the appointment date | `rpt_appointment_facts.has_charge_same_day` |
| `next_appointment` | a later live appointment of the patient in the **same office** | `rpt_appointment_facts` |

Frequency windows: `EVERY_VISIT` = the appointment date; `EVERY_YEAR` = the 365 days before it; `EVERY_TWO_YEARS` =
730 days; `EVERY_CALENDAR_YEAR` = the calendar year of the appointment; `ONCE` = any earlier date. Every check reads
only data of the appointment's office where the legacy tool does so (note, posting, next appointment). Row filters of
the report: missed and cancelled appointments are included only with their checkboxes. Era caveats: consents, medical
history completion and eligibility stamps are app-era, so migrated appointments fail those checks by construction; the
`Checked In By / Out By` columns need the acting users of DATA-17.

---

## 3. Normalisation rules

### 3.1 Money sign

| Stored column | Stored sign [V] / [A] | `amount` in `rpt_ledger_entries` |
|---|---|---|
| `patient_procedures.fee` | positive | `+fee` |
| `patient_payments.amount`, `payment_type` not `adjustment`, app row | positive magnitude | `-abs(amount)` (the rule of `app/services/ledger_sign.py` [V]) |
| same, migrated row | Denticon signed delta: a payment is negative [V] `s29` L73-74 | `-abs(amount)` by default — the convention of `ledger_sign` and of every screen [V] (`ledger_sign.py` L63-68, `balance_service.py` L144-150), so R-02 holds. A positive legacy `P` / `I` row is **either** a payment stored positive **or** a legacy reversal; which one is not knowable from the repository. Tenant policy `legacy_positive_payment_policy` (3.6): `credit` (default) or `reversal` (`+amount`), decided per database from section 6 #1. The row is flagged `is_sign_anomaly` under both policies |
| same, app row with `amount < 0` | the pre-refund workaround (an "unvalidated negative payment", `refund_service.py` L3-4) | `-abs(amount)` (money in), flagged `is_sign_anomaly`; section 6 #1 lists the rows for correction into `patient_refunds` |
| `patient_payments.amount`, `payment_type = 'adjustment'` (both eras) | signed: negative = credit, positive = debit | `amount` verbatim |
| `patient_adjustments.amount` | positive = credit | `-amount` |
| `ledger_insurance_details.*_ins_paid`, `*_ins_adjust` | non-negative (a negative value is rejected with 422 [A]) | `-value` |
| `patient_refunds.amount` | positive | `+amount`. When the row reverses a payment (`reversed_type = 'payment'`) that payment stays live in the ledger although it is flagged void in the table (2.10): money in on its date, money out on the refund date |
| `capitation_payments.amount` (NEW, DATA-38) | positive | two legs: `cap` `-amount`, `capa` `+amount` (2.10) |
| `patient_opening_balances` buckets | positive | `+value`, one leg per bucket |
| `payment_allocations.amount` | positive on app rows, 0 on migrated rows | not a ledger leg |
| `insurance_claims.total_billed`, `total_paid`, `est_insurance`, `opening_paid` | positive | informational only; never a ledger leg (the money is already in the ledger through payments and remittances) |

`ledger_sign.sum_payment_credit()` must not be used for collections: it also returns the credit side of adjustment rows
(migrated write-offs, balance transfers) [A]. After DATA-07 `ledger_sign` remains the Python twin of the `pay` and `adjp`
rules only, and takes the tenant policy as a parameter. A sign policy changes a balance by **twice** the amount of every
affected row, which is why it is one tenant setting read by the screens and by every dataset alike, never a per-report
choice.

### 3.2 Status vocabularies

One normalised vocabulary per entity. The normalisation is `lower(btrim(value))`, with spaces and hyphens replaced by `_`
for appointments. Flags and stamps outrank the string wherever both exist.

**Appointments** (`rpt_appointment_facts.status_class`; stored values from `analysis/be_data_scheduling.md` §1.3):

| Stored value (after normalisation) | Evidence that outranks it | `status_class` |
|---|---|---|
| `cancelled`, `canceled` | `is_cancelled` | `cancelled` |
| `missed`, `no_show` | `is_missed` | `no_show` |
| `checked_out`, `completed` | `checked_out_on`, `is_posted` | `completed` |
| `in_reception`, `arrived`, `checked_in`, `available` (a patient-flow status, not an open slot), `in_operatory`, `in_chair` | `checked_in_on` | `in_office` (today) / `past_unresolved` (earlier date) |
| `confirmed` | `confirmed_on` | `confirmed` / `past_unresolved` |
| `unconfirmed`, `left_message` | — | `unconfirmed` / `past_unresolved` |
| `scheduled`, `rescheduled`, NULL, anything else | — | `scheduled` / `past_unresolved` |

Priority when several apply: cancelled, no_show, completed, past_unresolved, in_office, confirmed, unconfirmed,
scheduled. "Broken" = cancelled or no_show. A no-show is not "scheduled" (the existing `/reports/summary` counts it [A]).

**Claims** (`rpt_claim_facts.status_class`; stored values from `analysis/be_data_insurance.md` §2.3 and
`be_existing_reporting.md` §2.6):

| Stored value | Extra condition | `status_class` | Open receivable? |
|---|---|---|---|
| any | `is_active = false AND status <> 'closed' AND close_date IS NULL` (after DATA-31: `deleted_at IS NOT NULL`) | `deleted` | no |
| `void`, `voided`, `cancelled`, `canceled` | | `void` | no |
| `denied`, `rejected` | | `denied` | no |
| `closed` | | `closed` | no |
| `paid`; or `draft` / blank with `total_paid > 0` | app-era claim on the estimate basis with `outstanding_amount > 0` | `partially_paid` | yes |
| same | every other case, including every migrated claim (no write-off rows and no reliable estimate exist to call it partial) | `paid` | no |
| `sent`, `submitted`, `pending`, `resubmitted`, `accepted`, `preauth_sent`; or any other value with a `submitted_date` | | `sent` | yes, when `outstanding_quality <> 'unknown'` (2.20): a migrated claim counts only while its stored status is submitted or pending |
| `draft`, `ready`, `hold`, blank, anything else | | `unsent` | not yet |

A reopened claim (`submitted` with a stale `close_date` and `is_active = false` [A]) is `sent`. `is_preauth` is a separate
flag, not a status. The legacy Audit Trail prints claim status letters `Q` (created, not sent), `S`, `A` (closed), `P`
(partial payment), `PS`, `PC`, while the migration mapped the codes `S`, `P`, `R`, `H`, `D`, `C` and turned every other
code into `draft` [V]; which set the export really holds is unknown (section 6 #15). If it holds the vendor letters, a
closed claim (`A`) is stored as `draft` and, having a sent date, classifies as `sent` — hence the `outstanding_quality`
guard: such rows are listed but never counted as a receivable.

**Treatment-plan items** (`rpt_treatment_item_facts.status_norm`): the ten values of `app/schemas/treatment.py` —
`diagnosed`, `accepted`, `unaccepted`, `hold`, `alternative`, `referred_out`, `internal_referral`, `external_referral`,
`scheduled`, `completed` — after folding legacy spellings with `treatment_service.LEGACY_ITEM_STATUS_MAP` [V] (seeded into
`rpt_value_map`, domain `treatment_item_status`: `d`, `dx`, `planned` -> `diagnosed`; `a` -> `accepted`; `u`, `rejected`
-> `unaccepted`; `h`, `on hold` -> `hold`; `alt`, `alternate` -> `alternative`; `ro`, `referred out` -> `referred_out`;
`s`, `sch` -> `scheduled`; `c`, `done`, `complete` -> `completed`; `ir`, `er`). `existing` (migrated) is kept as its own
value and excluded from the funnel. Funnel hierarchy for reports: completed, scheduled, accepted, then `diagnosed` /
`hold` / `unaccepted`; `alternative`, `referred_out`, `external_referral` are outside the denominator. The legacy picker
values "Pre-Authorized Sent" and "Pre-Authorized Closed" are `preauth_status` `sent` / `closed`, not item statuses.

The legacy status is two-layered (`research/legacy_report_outputs_insurance_txplan_ortho.md` L76-78): one exclusive status
plus additive Scheduled / Completed flags and the pre-auth status. The `TREATMENT PLANS` radio and the
`EXCLUDE TREATMENT PLANS` picker bind to this mapping, never to `status_norm`:

| Legacy letter | Legacy label | Predicate on `rpt_treatment_item_facts` |
|---|---|---|
| `D` | Diagnosed | `exclusive_status = 'diagnosed'` |
| `A` | Accepted | `exclusive_status = 'accepted'` |
| `U` | Unaccepted | `exclusive_status = 'unaccepted'` |
| `H` | Hold | `exclusive_status = 'hold'` |
| `L` | Alternative | `exclusive_status = 'alternative'` |
| `R` | Referred Out | `exclusive_status IN ('referred_out', 'external_referral', 'internal_referral')` |
| `S` | Scheduled (flag) | `is_scheduled` |
| `C` | Completed (flag) | `is_completed` |
| `PS` / `PC` | Pre-Authorized Sent / Closed | `preauth_status = 'sent'` / `'closed'` |

Report columns: `Sts` = the letter of `exclusive_status`; `Sch`, `Com` = the two flags; `PA Sts` = `preauth_status`.
Treatment Plan Analysis counts Diagnosed ... Alternative only among items with `NOT is_scheduled AND NOT is_completed`,
and the vendor recipe "Accepted, exclude S and C" is `exclusive_status = 'accepted' AND NOT is_scheduled AND NOT
is_completed`.

**Recalls** (`rpt_recall_due.recall_status`): stored `patient_recalls.status` values `due`, `Due`, `Scheduled`,
`Completed`, `Inactive` [A] are lower-cased; only `inactive` is trusted. The class is derived: `inactive`, `scheduled` (a
live future appointment carries the recall code — `scheduled_basis = 'exact'`; any other future appointment does not make
a recall scheduled), `no_due_date`, `overdue`, `due` (due within 30 days), `not_due`.

**Eligibility**: `verified`, `not_eligible`, `unknown` (2.21). **Plan-item pre-authorisation**: `sent`, `closed`.

### 3.3 Payment and adjustment code catalog on the server (`transaction_codes`, NEW, DATA-03)

Today the 18 payment codes (with tender category) and the 46 adjustment codes (with sign and Production / Collection
group) exist only in `FE:src/features/transactions/transactionCodes.ts` [V]; the database holds 11 + 12 generic
`definitions` rows without a sign [A]. The catalog moves to a tenant table; the frontend reads it and drops its copy.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;        -- needed by the exclusion constraint below
CREATE TABLE transaction_codes (
  id serial PRIMARY KEY, tenant_id int NOT NULL REFERENCES tenants(id),
  code varchar(20) NOT NULL,                      -- stored upper-case
  code_kind varchar(12) NOT NULL,                 -- payment | adjustment   (legacy "Type")
  description varchar(255) NOT NULL,
  sign smallint,                                  -- adjustments: +1 raises the balance, -1 lowers it; NULL for payments
  legacy_sub_type varchar(30),                    -- literal legacy "Sub Type" (value lists below)
  legacy_class varchar(40),                       -- literal legacy "Class" (value lists below)
  txn_side varchar(12),                           -- production | collection | none: normalised Sub Type of an adjustment
  txn_class varchar(30),                          -- analytic roll-up of legacy_class (vocabulary below); NULL on a plain
                                                  -- payment code (class follows the payer)
  tender_class varchar(20),                       -- cash | check | card | ach | financing | insurance_check | insurance_eft | capitation | non_cash | unknown
  deposit_group varchar(20),                      -- cash | check | credit_card | care_credit | direct_deposit | internal_financing | none
  card_brand varchar(12),                         -- visa_mc | amex | discover | debit
  is_income boolean NOT NULL DEFAULT true,        -- legacy IsIncome flag (Income Allocation "Non Income" column)
  counts_as_collection boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false, is_selectable boolean NOT NULL DEFAULT true, is_active boolean NOT NULL DEFAULT true,
  valid_from date NOT NULL DEFAULT DATE '1900-01-01', valid_to date,
  created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp, updated_by int REFERENCES users(id),
  UNIQUE (tenant_id, code_kind, code, valid_from),
  CONSTRAINT ex_transaction_codes_validity          -- two versions of one code can never be valid on the same day
    EXCLUDE USING gist (tenant_id WITH =, code_kind WITH =, code WITH =, daterange(valid_from, valid_to) WITH &&));
```

Rules: (1) `description` and `is_active` are editable; `sign`, `txn_side`, `txn_class`, `tender_class`, `deposit_group`,
`is_income`, `counts_as_collection` of a code that has ledger rows change only by closing the row (`valid_to`) and
inserting a new version — the legacy tool allows only the description of a used code to change
(`research/compliance_and_financial_semantics.md` §14.2). (2) Every ledger leg — payments, adjustments and remittances
alike — resolves the version valid on its own `transaction_date`; the lookup is `LATERAL ... ORDER BY valid_from DESC
LIMIT 1`, and the exclusion constraint guarantees that at most one version matches, so an unclosed old version cannot
duplicate ledger legs. (3) No report user re-classifies per run. (4) The `definitions` groups `payment_method` and
`adjustment` become a read-only projection of this table. (5) A posted amount whose sign contradicts the code's `sign` is
reported by the readiness checker, not corrected.

**Literal legacy vocabulary** (`research/legacy_report_outputs_lists.md` L1094-1103). The Credit Codes Report binds
`TYPE` to `code_kind` and `CLASS` to `legacy_class`, and prints `legacy_sub_type` and `sign`; behaviours keyed on a legacy
class (periodic contract billing, previous balance, capitation) keep their key.

| Field | Payments | Adjustments |
|---|---|---|
| `legacy_sub_type` | `None`, `Cash`, `Check`, `Credit Card`, `Care Credit`, `Direct Deposit` (the Deposit Slip screen adds `Internal Financing`) — normalised in `deposit_group` | `Production`, `Collection` — normalised in `txn_side` |
| `legacy_class` | `None`, `Insurance Payment`, `Capitation Payment`, `Insurance Prev. Bal`, `Collection Agency Payment` | `None`, `Write-Off`, `Finance Charge`, `Contract Down Payment`, `Balance Moved to Contract`, `Periodic Contract billing`, `Late Charge`, `Capitation Adjustment`, `Sales Tax`, `Insurance Adjustment`, `Move Patient (Debit)`, `Move Patient (Credit)`, `Previous Balance (Debit)`, `Previous Balance (Credit)`, `Credit Card Refund`, `Treatment plan discount`, `Collection Agency Adjustment` |

`txn_class` is derived from `legacy_class` where the legacy class is specific, and is the finer per-code class of the
seed where the legacy class is `None`:

| `legacy_class` | `txn_class` |
|---|---|
| `Insurance Payment`; `Capitation Payment`; `Collection Agency Payment` | `insurance_payment`; `capitation_payment`; `collection_agency_payment` |
| `Insurance Prev. Bal`; `Previous Balance (Debit)` / `(Credit)` | `opening_balance` |
| `Write-Off`; `Insurance Adjustment` | `contractual_writeoff`, unless the code's seed class is `discount`, `bad_debt` or `charge_correction` |
| `Treatment plan discount` | `discount` |
| `Finance Charge`; `Late Charge` | `finance_or_late_charge` |
| `Contract Down Payment`; `Balance Moved to Contract`; `Periodic Contract billing` | `contract_movement` |
| `Capitation Adjustment` | `capitation_writeoff` |
| `Sales Tax` | `sales_tax` |
| `Move Patient (Debit)` / `(Credit)` | `transfer` |
| `Credit Card Refund` | `refund_patient` |
| `Collection Agency Adjustment` | `collection_agency` |
| `None` | the seed class of the code (adjustments); follows the payer (payments) |

`deposit_group` values are the seven Deposit Slip checkboxes of the legacy criteria screen (Cash, Check, Credit Card,
CareCredit, Direct Deposit, Internal Financing, None — `legacy/daily_reports.json`).

**Class decides the analytic bucket; Sub Type decides the legacy column** (2.12):

| Class | `ledger_bucket` | `is_income` seed |
|---|---|---|
| `transfer` | `transfer` | false |
| `opening_balance` (adjustment or payment code) | `opening_balance` | false |
| `contract_movement`, `sales_tax`, `capitation_writeoff` | `non_income_adjustment` | false |
| `contractual_writeoff` | `production_adjustment`, in both eras and whatever Sub Type the code carries | true |
| every other adjustment class | by `txn_side`: `production_adjustment` / `collection_adjustment`; no catalog row: `unclassified_adjustment` | true |
| payment codes | `collection` when `counts_as_collection`, else `non_collection_payment` | true |

Class vocabulary and seed of the 46 adjustment codes. Sign and Sub Type are the frontend catalog's [V]; the class is
assigned here [I] and needs the product owner's review (O-2). The frontend catalog carries no legacy Class, so
`legacy_class` is seeded only where the description names it; every other code starts as `None` and is confirmed against
the tenant's Denticon `Setup > Payment/Adjustment Types` screen (collected with DATA-12):

| `txn_class` | Codes (sign, Sub Type: P = production, C = collection) | `legacy_class` seed [I] |
|---|---|---|
| `contractual_writeoff` | `AC015` (-, P) · `AD002` (+, P) · `AINSO` (+, C) | `Write-Off`; `AINSO`: `Insurance Adjustment` |
| `capitation_writeoff` | `AD900` (+, C) | `Capitation Adjustment` — the offsetting code of a capitation payment (2.10), not a per-procedure write-off |
| `discount` | `AC006`, `AC014`, `AC005` (-, P) | `None` |
| `charge_correction` | `AC003`, `AC004`, `AC002` (-, P) · `AD004` (+, P) | `None` |
| `finance_or_late_charge` | `AC001` (-, P) · `AFCHG`, `ALCHG` (+, P) | `Finance Charge` (`AFCHG`); `Late Charge` (`AC001`, `ALCHG`) |
| `nsf_fee` | `AD003` (+, P) | `None` |
| `bad_debt` | `AC009`, `AC008` (-, P) | `Write-Off` |
| `collection_agency` | `AC012`, `AC007` (-, P) · `COLFE` (-, C) | `Collection Agency Adjustment` |
| `refund_patient` | `AR001`, `AR002` (+, C) · `AI001` (-, C; a voided refund) | `Credit Card Refund` (`AR002`); else `None` |
| `refund_insurance` | `AR003`, `AR004` (+, C) | `None` |
| `refund_financing` | `AR007`, `SUNBR` (+, C) | `None` |
| `payment_reversal` | `AR005`, `AR006`, `AR008` (+, C) | `Credit Card Refund` (`AR005`); else `None` |
| `transfer` | `AC010` (-, P) · `AD010` (+, P) · `AR010` (+, C) · `AI010` (-, C) | `Move Patient (Credit)` (`AC010`, `AI010`); `Move Patient (Debit)` (`AD010`, `AR010`) |
| `opening_balance` | `APBAL`, `APBAI` (+, P) | `Previous Balance (Debit)` |
| `contract_movement` | `AFEED` (-, P) · `AFEEI` (+, P) · `ACCNN` (-, C) · `ACCNC` (+, C) | to confirm (`Balance Moved to Contract` / `Contract Down Payment`) |
| `sales_tax` | `ATAX` (+, C) | `Sales Tax` |
| `other_production` | `AC013`, `AC011` (-, P) · `AD001` (+, P) | `None` |
| `other_collection` | `ACRED` (-, C) · `ADEBT` (+, C) | `None` |

The insurance write-off exists under two codes: `AINSO` on migrated rows (`+`, Collection in the frontend catalog,
although the vendor's own day-sheet sample lists "AUTO - Insurance Adjustment(P)" among production adjustments) and the
system code `INS_WRITE_OFF` on app remittances. They are one event and are seeded as one: same class
(`contractual_writeoff`, hence the same bucket in both eras) and the **same Sub Type** — `INS_WRITE_OFF.txn_side` is
seeded with the Sub Type of the tenant's `AINSO` row, so the day sheet prints the write-off in the same column before and
after the cut-over. Whether that Sub Type is Collection (frontend catalog) or Production (vendor sample) is decided once
for both codes (O-2).

Seed of the 18 payment codes (`legacy_sub_type` / `deposit_group` from the frontend tender category [V]; class and
`counts_as_collection` [I]):

| `deposit_group` | Codes (`tender_class`, `card_brand`, class) |
|---|---|
| `cash` | `PP005` (cash) |
| `none` | `APBAC` (non_cash, class `opening_balance`) · `APBIC` (non_cash, class `opening_balance`, `legacy_class` `Insurance Prev. Bal`) — conversion credits filed under Cash in the frontend, `counts_as_collection = false` · `COLPY` "PT Paymt To Collections Agency" (non_cash, class `collection_agency_payment`, `counts_as_collection = false` pending O-2: the money went to the agency, and the agency's remittance arrives as `PP004`, so counting both would double the collection) |
| `check` | `PP009` (check) · `PP002` (ach, e-check) · `PP004` (check, class `collection_agency_payment`, `legacy_class` `Collection Agency Payment`) |
| `credit_card` | `PP006` (card, amex) · `PP001` (card, debit) · `PP007` (card, discover) · `PP008` (card, visa_mc) |
| `direct_deposit` | `PA001`, `PA005` (ach) · `PA002` (card, visa_mc) · `PA003` (card, amex) · `PA004` (card, discover) |
| `care_credit` | `PF001`, `PF005` (financing, class `financing_payment`) |

System codes (`is_system = true`, `is_selectable = false`), so that every value found in `payment_method` /
`adjustment_type` resolves: migrated tender values `CASH`, `CHECK`, `CARD`, `ACH`; the generic definition keys
`CREDIT_CARD`, `DEBIT_CARD`, `MONEY_ORDER`, `CARE_CREDIT`, `EFT`, `INSURANCE`, `INSURANCE_CHECK`, `INSURANCE_EFT` and the
insurance-window fallbacks `AUTO_DEPOSIT`, `OTHER` [A]; the twelve generic adjustment keys (`WRITE_OFF`, `COURTESY`,
`DISCOUNT`, `CONTRACTUAL`, `SENIOR_DISCOUNT`, `EMPLOYEE_DISCOUNT`, `PROMPT_PAY_DISCOUNT`, `CHARGE_CORRECTION`, `BAD_DEBT`,
`NSF`, `COLLECTION_AGENCY`, `ACCOUNT_TRANSFER`); and `BALANCE_TRANSFER` (class `transfer`), `INS_WRITE_OFF` (class
`contractual_writeoff`, Sub Type as `AINSO`, replaceable per tenant by `account_settings.default_write_off_code`, which is
stored and read by nothing today [A]), `REFUND` (class `refund_patient`), `OPENING_BALANCE`. A migrated payment whose
tender was not exported has no code at all: it matches no catalog row, is counted as a collection and is labelled
`collection_class_quality = 'assumed'` (2.10) — a conversion credit hidden among those rows is found only by DATA-12.

A capitation payment is **not** a `patient_payments` row with a class: it is a carrier-level lump sum without a patient
and lives in `capitation_payments` (DATA-38, 2.10). Its payment code carries class `capitation_payment`, tender
`capitation`, and its offsetting adjustment code class `capitation_writeoff` (`AD900`), `is_income = false`.

### 3.4 `provider_kind`

Single source of truth: `provider_directory_service.provider_kind(role, title)` [V] — a clinical role (`dentist`,
`hygienist`, `assistant`, `specialist`, after the alias map) wins; otherwise the licence title decides (`DDS`, `DMD`,
`DDH`, `MD` -> dentist; `RDH`, `RDHAP` -> hygienist; `RDA`, `CDA` -> assistant); otherwise the lower-cased role. The rule
is not re-implemented in SQL: DATA-05 adds `providers.provider_kind varchar(20)`, filled by a script that calls the
function and kept current by `ProviderCRUD` on create and update. `production_group` (`doctor`, `hygiene`, `other`)
follows from it. Hygiene production by procedure code instead of by provider is a code-group question
(`hygiene_visit`), offered as an alternative split by `05_metric_catalog.md`.

### 3.5 Patient type and the General / Ortho criterion

Two different legacy concepts share the word "patient type" (`research/legacy_report_outputs_daily_my.md` §3.3):

| Legacy control | Dataset column | Rule |
|---|---|---|
| `PATIENT TYPE`: Both / General / Ortho | `rpt_patient_dim.is_ortho_patient` | Ortho = the patient carries the ortho tag (`patient_type` equal to `OR` or starting with `ortho`, case-insensitive, or `OR` in the JSON array `patient_types`) **or** has an active `ortho_plans` contract. General = not Ortho. The frontend's own rule misses the bare `OR` code [A]. Whether the contract alone should make a patient Ortho is open decision O-3. |
| `INCLUDE / EXCLUDE PATIENT TYPE` pickers, `Pat Type` column | `rpt_patient_dim.patient_type_codes` | the user-defined types (`CH`, `CP`, `EF`, `OR`, `SN`, `SR`, `SS`, `UP`): the JSON array plus the single `patient_type` value mapped to a code through `rpt_value_map` (migrated rows hold a `PATTYPE` code or a description; app rows hold `General` / `Ortho`) |

Ortho **production** is a property of the charge (`is_ortho_code`), not of the patient.

### 3.6 Deleted, inactive, archived

| Entity | Inactive | Deleted | Archived | Rule in the datasets |
|---|---|---|---|---|
| `patient_procedures`, `patient_payments` | — | `is_void` (DELETE = void) | `is_archived` = loaded from `Ledger_archive.txt`; the app never sets it [V] | live = not void and (not archived or the tenant includes the archive) |
| `patient_adjustments`, `patient_refunds`, `ledger_insurance_details` | — | `is_void` (remittances also carry `voided_at`, `voided_by`, `void_reason`) | — | live = not void |
| `appointments` | — | `is_archived` on an app row, or on a migrated row with an audited DELETE | `is_archived` on a migrated row from `APPTH_ARCHIVE` | three separate flags in 2.15; `is_cancelled` is a status, not a delete |
| `appointment_procedures` | — | `is_archived` | same flag, archive lines of archive headers | follows the header |
| `insurance_claims` | — | `is_active = false` and not closed | — | `status_class = 'deleted'`; closed claims also have `is_active = false` [A] |
| `patients` | `is_active = false` | the same flag | — | not separable until DATA-44 (`deleted_at`); lists label the state "inactive or deleted" |
| `treatment_plan_items` / `treatment_plans` | — | `is_archived` / hard delete | — | deleted plans are unrecoverable |
| `progress_notes` | — | `is_deleted` | — | `is_struck_off` is a visible state, not a delete |
| `patient_recalls`, `ortho_plans`, `patient_payment_plans`, `time_clock_entries` | — | `is_active = false` (soft delete) | — | excluded |
| `providers`, `users`, `offices` | `is_active = false` | offices only: `deleted_at` | — | dimensions keep every row so history is labelled |
| `referrals`, `office_groups`, `employers` | — | hard delete | — | a deleted source breaks the string link from patients |

The archive policy is one tenant setting, read by every `*_all` -> live filter through a one-row-per-tenant view:

```sql
CREATE TABLE rpt_tenant_settings (
  tenant_id int NOT NULL REFERENCES tenants(id), key varchar(60) NOT NULL, value text NOT NULL,
  updated_at timestamp NOT NULL DEFAULT now(), updated_by int REFERENCES users(id), PRIMARY KEY (tenant_id, key));
-- keys owned by this document: legacy_archive_policy (exclude | include), legacy_positive_payment_policy (credit | reversal),
--                               ins_write_off_code, aging_bucket_set
CREATE VIEW rpt_tenant_flags AS
SELECT t.id AS tenant_id,
       coalesce((SELECT s.value = 'include' FROM rpt_tenant_settings s WHERE s.tenant_id = t.id AND s.key = 'legacy_archive_policy'), false) AS include_legacy_archive,
       coalesce((SELECT s.value FROM rpt_tenant_settings s WHERE s.tenant_id = t.id AND s.key = 'legacy_positive_payment_policy'), 'credit') AS legacy_positive_payment_policy,
       coalesce((SELECT q.status = 'pass' FROM rpt_data_quality q WHERE q.tenant_id = t.id AND q.check_key = 'created_at_restored'), false) AS created_at_restored,
       coalesce((SELECT s.value FROM rpt_tenant_settings s WHERE s.tenant_id = t.id AND s.key = 'ins_write_off_code'), 'INS_WRITE_OFF') AS ins_write_off_code
FROM tenants t;
```

Both legacy policies default to what every screen does today, so that the reporting layer and the on-screen balance agree
from the first day (R-02); each is changed only on the evidence of its section 6 check, for the screens and the datasets
together.

| Policy | Default | Alternative | Decided by |
|---|---|---|---|
| `legacy_archive_policy` | `exclude` | `include` | section 6 #6 |
| `legacy_positive_payment_policy` | `credit` (`-abs(amount)`, the `ledger_sign` rule) | `reversal` (`+amount` on a positive migrated `P` / `I` row) | section 6 #1, broken down by year, `payment_method` and `created_by_legacy` |

Default `exclude` reproduces what every screen does today (all balance paths drop archived charges [V]). The migration
notes call both archive files history ("include for complete financial history", `denticon_migration/migration_mapping.md`
L502-504 [V]) and the legacy Appointment Detail report has an "Appointment Type: Regular / Archived" criterion
(`legacy/appointment_reports.json`), so `include` may be the correct setting — section 6 #6 decides per tenant.

### 3.7 Other vocabularies (`rpt_value_map`, NEW)

```sql
CREATE TABLE rpt_value_map (
  domain varchar(40) NOT NULL, raw_value varchar(120) NOT NULL,   -- raw_value stored lower-case, trimmed
  canonical_value varchar(120) NOT NULL, note text,
  PRIMARY KEY (domain, raw_value));                               -- one mapping per database (one database per organisation)
```

Domains: `patient_type` (raw value -> type code), `treatment_item_status`, `referral_type` (`REFTYPE` code or label ->
label), `audit_module`, `plan_type` (`PPO`, `HMO`, `Medicaid`, `Indemnity`, `Prepaid`, `DISCOUNT`, `MEDICAID`, ... -> one
set), `preferred_contact`, `state` (free text -> USPS code). Gender, coverage category / tier, claim tier and eligibility
are normalised by expression in their datasets. `definitions` rows can repeat per `key1` (up to five copies on the
migrated tenant [A]); every label lookup takes one row per (`tenant_id`, `group_code`, `key1`).

---

## 4. Date bases and time zones

### 4.1 Bases per fact

| Fact | `service_date` | `transaction_date` | `created_date` | `deposit_date` | `appointment_date` | Other dates |
|---|---|---|---|---|---|---|
| Charge | `date_of_service` | NEW column (DATA-13); equals service date today | `created_at` -> office-local | — | through `appointment_id` (app era) | — |
| Payment (`patient_payments`) | effective only: `transaction_date` (exact by service month through allocations) | NEW column `transaction_date` (DATA-13), the ledger date; equals `payment_date` today | `created_at` | NEW (DATA-28) | — | `payment_date` = the date the payment applies to (basis `payment_date`) |
| Remittance line | service date of the paid charge | as payments (NEW column, DATA-13) | `created_at` | NEW | — | `payment_date`; `voided_at` |
| Adjustment | effective only: service date of the charge named by `procedure_id`, else `transaction_date` | `payment_date` / `adjustment_date` | `created_at` | — | — | — |
| Refund | effective only: `transaction_date` | `refund_date` | `created_at` | — | — | — |
| Appointment | — | — | `created_at` (app era) | — | `appointments.date` (office-local) | `confirmed_on`, `checked_in_on`, `checked_out_on` (UTC) |
| Claim | `date_of_service_from` / `_to`, else the lines | `submitted_date` (sent), `paid_date`, `close_date` | `created_at` (app era) | — | — | per-send `claim_submissions.created_at` |
| Treatment item | completing charge date | `diagnosed_date`, `accepted_date`, `scheduled_date` | `created_at` (app era) | — | booking appointment date | `end_date` |
| Progress note | `note_date` | — | `created_at` | — | — | `signed_at` |
| Time clock | work date (office-local date of `clock_in`) | — | `created_at` | — | — | edit log |
| Lab case | — | — | — | — | appointment date | `lab_sent_on`, `lab_due_on`, `lab_received_on` |

Binding of `date_basis` (vocabulary owned by `04_filter_framework.md`) on the money datasets:

| `date_basis` | Column | Notes |
|---|---|---|
| `service_date` | `service_date_effective` on `rpt_ledger_entries` (2.12); `service_date` on `rpt_charges` | every leg has a value, so a service-basis total contains its adjustments and payments; `service_date_source` says how each was dated |
| `transaction_date` | `transaction_date` | the ledger date |
| `payment_date` | `rpt_payments.payment_date` | the legacy Deposit Slip radio "Transaction Date / Payment Date". Until DATA-13 stores a separate ledger date the two options select the same rows, and the report prints that |
| `created_date` | `created_date` (`posting_date` after DATA-13) | offered only where reliable (4.2) |
| `deposit_date` | `deposit_date` | after DATA-28 |

PD-8: day sheet, journals and deposit default to `transaction_date`; operational dashboards to `service_date`.

### 4.2 What exists per era

| Basis | App-era rows | Migrated rows |
|---|---|---|
| Service date (charges) | yes | yes (`DOSDATE`, else `TRANDATE`) |
| Transaction date (charges) | equal to the service date until DATA-13 adds the column | lost for charges that had a `DOSDATE` (DATA-12 re-reads `TRANDATE`) |
| Transaction date (payments, adjustments) | yes | yes (`TRANDATE`) |
| Payment date (the date a payment applies to) | one stored date today; distinct from the ledger date only after DATA-13 | equal to the transaction date: only `TRANDATE` was loaded |
| Service date (adjustments, payments) | `service_date_effective`: the linked charge's date where a link exists (targeted adjustments, remittances), else the transaction date | the transaction date (no links were migrated) |
| Created date (money) | yes (`created_at`, UTC) | only after `backfill_ledger_source_fields.py --restore-created-at`; otherwise the load timestamp (section 6 #2) |
| Created date (appointments, claims, patients, notes, plans) | yes | no — load timestamp; never offered |
| Deposit date | after DATA-28 | never |
| Appointment stamps (confirm, arrive, check-out) | yes | never |
| Claim sent / paid dates | yes | yes (`CLAIMSENTDATE`, `PAIDDATE` or `RECVDDATE`) |

The engine greys out a basis that is not available for the era the range touches, using `rpt_data_quality` and the
tenant's migrated-through date (`max(transaction_date)` of migrated ledger rows).

### 4.3 Time-zone rules

| Rule | Detail |
|---|---|
| Storage | every timestamp is `timestamp without time zone` holding UTC [A]; business dates (`date_of_service`, `payment_date`, `appointments.date`, ...) are office-local calendar dates as entered |
| Conversion | `(ts AT TIME ZONE 'UTC' AT TIME ZONE offices.timezone)::date`; the office is the row's own office, else the posting office, else the patient's home office, else `America/New_York` (the constant in `app/core/datetimes.py` [V]) |
| Office-local today | `(now() AT TIME ZONE offices.timezone)::date` = `rpt_office_dim.local_today`; a relative range ("today", "month to date") is resolved per office; a multi-office run across zones uses each office's own today (AD-9) |
| Migrated `created_at` | once restored it holds Denticon's `CREATEDON` wall-clock value, not UTC [I]; it is used as stored (`created_at::date`) and never shifted. Check: the share of migrated payments whose `created_at::date` equals `payment_date` should be high |
| Created-date ranges | the predicate is on the timestamp, with per-office UTC bounds: `created_at >= ((:date_from::timestamp AT TIME ZONE tz) AT TIME ZONE 'UTC') AND created_at < (((:date_to + 1)::timestamp AT TIME ZONE tz) AT TIME ZONE 'UTC')`; the engine groups offices by time zone (one branch per zone). After DATA-13 the predicate is the plain indexed column `posting_date` |
| Session time zone | must be UTC on every database: `created_at` defaults to `now()` and several services write tz-aware values into naive columns [A] (section 6 #9) |
| Exceptions | `time_clock_entries.clock_in` with `clock_basis = 'wall_clock'` is office wall time; `booking_requests.hold_expires_at` is office-local [A]; server-stamped claim dates are UTC dates, so an evening action lands on the next day (DATA-31 switches them to the office's today) |
| Period ends | date ranges are inclusive on both ends; weeks start on Monday in `rpt_dates`; the organisation's week start for payroll stays in `time_clock_settings` |

---

## 5. Attribution rules

### 5.1 Office

| Attribution | Column | Default use (PD-6) | Legacy reports that fix it |
|---|---|---|---|
| Office of service | `rpt_charges.office_id` | production, visits, provider productivity | Production Report, Daily Journal, Executive Summary |
| Transaction office | `rpt_ledger_entries.office_id` (each leg's own office; for a payment the office where it was applied) | collections; A/R (default, allocation unit `account_office`); day sheet | Collection Report, Aging Report, Executive Day Sheet |
| Posting office | `coalesce(posting_office_id, office_id)` (`patient_payments.created_office_id`, from `X-Office-ID`; the transaction office where no posting office was recorded) | cash handling, user productivity, **deposits**: the cheque is physically in the drawer of the office that keyed it | Deposit Slip, deposit pack, R-09 |
| Home office | `rpt_account_dim.home_office_id` for A/R and statements; `rpt_patient_dim.home_office_id` for patient lists and new-patient counts | A/R home-office variant (PD-4), statements, lists | Aging Report by Home Office, Statements, Executive Summary new patients |
| Allocation office | `rpt_payment_allocations.allocation_office_id` (office of the charge that was paid) | collections for provider income | Income Allocation, Allocation Detail, WaterFall |
| Appointment office | `rpt_appointment_facts.office_id` | schedule, huddle | Appointment reports, SmartAssist Report Card |

Rules: (1) a report definition declares exactly one office attribution and prints it. The two ageing reports are not two
groupings of one result: Aging Report by Home Office allocates per account (`p_unit = 'account'`) and files the account
under its home office; Aging Report allocates per account **and office** (`p_unit = 'account_office'`), because the legacy
report evaluates only the transactions recorded in the selected office (2.14). (2) Totals by transaction office and totals
by home office both sum to the organisation total when credits are included (R-14), and the transaction-office figure of
every office equals that office's ledger balance (R-14b); a charge at office A paid at office B shows a debit at A and a
credit at B under the office unit — by design, as in the legacy tool. (3) A
NULL `office_id` (migrated payments whose source office was unknown) is the member "Unassigned office": included in
organisation totals for callers who may see all offices, excluded for callers restricted to an office set. (4) The
provider's home office (`providers.office_id`) is never an attribution.

### 5.2 Provider

| Attribution | Column | Default use (PD-7) |
|---|---|---|
| Treating provider | `rpt_charges.provider_id` (NOT NULL) | production, clinical KPIs, scorecards |
| Hygienist | `rpt_charges.hygienist_id` (app era) | hygiene production when recorded; the choice between crediting the hygienist, the dentist or both is a metric setting owned by `05_metric_catalog.md` — the dataset carries both ids |
| Credited provider of a payment | `rpt_payments.provider_id` (nullable) | legacy Collection Report "by Provider" (the provider on the payment line); the P1 dashboards, labelled "provider on payment" (2.13) |
| Producing provider of a payment | `rpt_payment_allocations.allocation_provider_id` on rows with `allocation_target IN ('production', 'non_production_charge', 'debit_adjustment')`; `method = 'unallocated'` = `Unallocated`; target `refund` = refunded | collections by provider (PD-7), provider income net of refunds, compensation — from P2 |
| Provider of a visit | `rpt_provider_visits.provider_id` (every provider who charged a visit code that day); `rpt_visits.primary_provider_id` only for additive splits | Patients Seen by provider, provider dashboards, provider-restricted runs |
| Billing / treating provider of a claim | `rpt_claim_facts.billing_provider_id`, `treating_provider_id` | claim and payer reports |
| Appointment provider | `rpt_appointment_facts.provider_id` | schedule reports, utilisation |
| Preferred provider / hygienist | `rpt_patient_dim.preferred_provider_id`, `preferred_hygienist_id`; fallback `rpt_patient_activity.last_visit_provider_id` | reports whose picker is labelled "Preferred Provider" (Progress Notes, Recall, ageing "Group by Provider: Preferred Provider") |
| Note author | `rpt_progress_note_facts.author_provider_id` | missing / unsigned notes |

"Provider" means a different thing in almost every legacy report (`research/legacy_report_outputs_daily_my.md` §3.3);
each report specification in `catalog/` names the column it uses. Provider-restricted runs (PD-11) filter the report's
own provider column by `users.report_access_provider_id`.

### 5.3 Guarantor account

The account is the unit for A/R, ageing, statements and allocation (PD-4; the office unit of 2.13 subdivides it for the
transaction-office view).

| Column | On | Value | Use |
|---|---|---|---|
| `account_id` | every leg (charge, payment, adjustment, refund, opening row) | `patients.account_id` — the patient's **current** account | the one A/R unit: balances, FIFO, ageing, statements, R-03. It is exactly the membership `GET /patients/{id}/account-balance` sums [V] (`balance_service.py` L200-213, `account_scope.py` L44-53) |
| `posted_account_id` | payments and adjustment rows in `patient_payments` (the stamp written on insert [V] `accounts.py` L408-414); charges after DATA-15; refunds through their source payment | the account at posting time | "account as posted" reports and audits only |

Why one unit and not the stamp: a guarantor change moves a patient by rewriting `patients.account_id` and, with the
default `move_open_balance = true`, writes no money row; a merge does the same for every member [V]
(`family_account_service.py` L696-703, L730-739, L862-864). If debits followed the current account and credits the
stamped one, the new account would age the patient's lifetime charges as fully open while the old — often retired —
account kept the matching credit, and R-03 could never pass. When the balance is left behind (`move_open_balance =
false`) the service writes a transfer pair whose two legs are both stamped with the **old** account (L621-628): under
current membership the credit leg follows the moved patient and the debit leg stays with the member who remained, which
is the intended effect. Section 6 #28 counts the payments whose stamp differs from the current account.

"Account AR" (insurance and patient portions of the whole account) and "Patient AR" (patient portion only) are two
measures over the same open items, not two attributions. Family size and the "inactive account" criterion come from
`rpt_account_dim`.

### 5.4 User

`user_key` (2.4) is the poster of a ledger leg (`created_by`, else the legacy login string). It drives "Report By: User",
"Group By: User" and My Reports. Appointments, claims and notes have `created_by_user_id` for app rows only. A void, an
edit and a status change have an actor only in `audit_logs` until DATA-14 and DATA-17 add stamps.

---

## 6. Data repairs and backfills for migrated data

The state of each repair is per client database and cannot be read from the repository. The team runs the check first
(we did not), records the result in `rpt_data_quality` (DATA-02), then applies the fix. All checks are read-only.

| # | Check query (run per database) | Healthy result | Fix | What breaks if skipped | Item |
|---|---|---|---|---|---|
| 1 | (a) `SELECT payment_type, extract(year FROM payment_date) AS yr, payment_method, created_by_legacy, count(*), sum(amount) FROM patient_payments WHERE legacy_id IS NOT NULL AND lower(payment_type) <> 'adjustment' AND amount > 0 AND NOT is_void GROUP BY 1, 2, 3, 4`; (b) `SELECT count(*), sum(amount) FROM patient_payments WHERE legacy_id IS NULL AND lower(payment_type) <> 'adjustment' AND amount < 0 AND NOT is_void` | (a) no rows — an earlier measurement reported 14,606 positive rows in the table, adjustments included [D]; (b) no rows | (a) none in the data: set `legacy_positive_payment_policy` (3.6) per database after an accountant has sampled the rows against Denticon ledgers — `credit` (default) if they are payments stored positive, `reversal` if they are reversals; the choice applies to screens and datasets together; (b) re-post each as a `patient_refunds` row | each misread row moves a balance by **twice** its amount and turns a collection into a debit or the reverse | DATA-11 |
| 2 | `SELECT created_at::date, count(*) FROM patient_procedures WHERE legacy_id IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 5` (same on `patient_payments`) | no day holds more than a few percent of the rows | `python -m scripts.backfill_ledger_source_fields --restore-created-at`; then set check `created_at_restored` to `pass` | the Created Date basis puts all history on the migration day (Daily Journal, Appointment / allocation reports by entry date) | DATA-10 |
| 3 | `SELECT count(*), count(claim_id) FROM patient_procedures WHERE legacy_id IS NOT NULL` | about 297,671 rows with a claim [D] | same script, field `claim_id` | every migrated charge reads unbilled; migrated claims have no lines, service dates or estimate; the insurance / patient split of ageing is unknown | DATA-10 |
| 4 | `SELECT count(*), count(created_by), count(created_by_legacy) FROM patient_payments WHERE legacy_id IS NOT NULL` (same on `patient_procedures`) | `created_by_legacy` filled on nearly every row | same script, field `created_by`; then build `rpt_legacy_logins` | "User" filters and grouping return nothing for history | DATA-10 |
| 5 | `SELECT count(*), sum(coalesce(prim_ins_paid,0) + coalesce(sec_ins_paid,0) + coalesce(ter_ins_paid,0)) AS paid, sum(coalesce(prim_ins_adjust,0) + coalesce(sec_ins_adjust,0) + coalesce(ter_ins_adjust,0)) AS adjusted, count(payment_date) FROM ledger_insurance_details WHERE legacy_ledger_id IS NOT NULL` | paid and adjusted sums 0, no payment dates [D] | if not: decide which store is authoritative before any insurance figure ships | legacy insurance money (payments or write-offs) counted twice | DATA-11 |
| 6 | `SELECT is_archived, min(date_of_service), max(date_of_service), count(*), sum(fee) FROM patient_procedures WHERE legacy_id IS NOT NULL GROUP BY 1` (same on `patient_payments.payment_date`, `appointments.date`); duplicates: `SELECT count(*) FROM appointments a JOIN appointments b ON b.patient_id = a.patient_id AND b.date = a.date AND b.start_time = a.start_time AND NOT b.is_archived WHERE a.is_archived AND a.legacy_id IS NOT NULL` | archive rows are older than live rows and have no live twin -> history | set `legacy_archive_policy` = `include`; twins or overlapping dates -> keep `exclude` | balances, first-visit dates and old-period counts are wrong in one direction or the other | DATA-11 |
| 7 | A cheque is N remittance rows (one per procedure line [V] `billing_service.py` L446-530, `FE:InsurancePaymentModal.tsx` L291-341) while a manual duplicate is **one** `patient_payments` row for the cheque total, possibly a day apart — so the comparison is on grouped sums. (a) per patient and cheque: `WITH rm AS (SELECT l.patient_id, l.payment_date, nullif(btrim(l.check_number), '') AS chk, sum(coalesce(prim_ins_paid,0) + coalesce(sec_ins_paid,0) + coalesce(ter_ins_paid,0)) AS paid FROM ledger_insurance_details l WHERE l.legacy_ledger_id IS NULL AND NOT l.is_void GROUP BY 1, 2, 3) SELECT p.id, rm.* FROM patient_payments p JOIN rm ON rm.patient_id = p.patient_id AND rm.paid > 0 AND abs(p.amount) = rm.paid AND (rm.chk = nullif(btrim(p.check_number), '') OR p.payment_date BETWEEN rm.payment_date - 7 AND rm.payment_date + 7) WHERE p.legacy_id IS NULL AND NOT p.is_void AND lower(p.payment_type) LIKE 'ins%'`; (b) the same with `rm` grouped by (`check_number`, `payment_date`) across patients against payments with that check number; (c) the write-off twin: `sum(*_ins_adjust)` per patient and day against `sum(patient_adjustments.amount)` of that patient within 7 days; (d) app remittances on migrated claims: `SELECT c.id FROM insurance_claims c WHERE c.legacy_id IS NOT NULL AND c.total_paid > c.total_billed AND EXISTS (SELECT 1 FROM ledger_insurance_details l WHERE l.claim_id = c.id AND l.legacy_ledger_id IS NULL AND NOT l.is_void)` | no rows | review each match with the office; void the manual duplicate before DATA-07 goes live | staff who worked around the missing balance effect by posting the payment (or the write-off) twice get it counted twice | DATA-07 |
| 8 | `SELECT count(*), count(*) FILTER (WHERE a.patient_id = pp.patient_id AND a.date = pp.date_of_service) FROM patient_procedures pp JOIN appointments a ON a.id = pp.appointment_id WHERE pp.legacy_id IS NOT NULL` | both counts equal | set inconsistent links to NULL (the datasets already flag `appointment_link_reliable`) | scheduled-versus-completed joins attach the wrong visit | DATA-10 |
| 9 | `SELECT id, name, state, timezone FROM offices`; `SELECT timezone FROM offices WHERE timezone NOT IN (SELECT name FROM pg_timezone_names)`; `SHOW timezone` | each office on its real zone; session zone `UTC` | set `offices.timezone` per office; set the database `timezone` to `UTC` | created dates and "today" are a day off for evening entries; every migrated office starts on `America/New_York` [A] | DATA-10 |
| 10 | `SELECT lower(btrim(role)), lower(btrim(title)), count(*) FROM providers GROUP BY 1, 2` | canonical roles only | apply `scripts/normalize_provider_roles.py`, then fill `provider_kind` | hygienists filed as `Hygenist` or `staff` fall into the `other` production group | DATA-05 |
| 11 | `SELECT count(*), count(*) FILTER (WHERE primary_guarantor_patient_id IS NULL AND primary_guarantor_party_id IS NULL) FROM accounts` | no unresolved accounts | `python -m scripts.import_legacy_responsible_parties --apply` | responsible-party names and types missing on ageing, statements and lists | DATA-10 |
| 12 | `SELECT count(*), count(*) FILTER (WHERE office_id IS NULL), count(*) FILTER (WHERE provider_id IS NULL), count(*) FILTER (WHERE account_id IS NULL) FROM patient_payments WHERE NOT is_void`; `SELECT count(*) FROM patients WHERE account_id IS NULL` | small shares; no patient without an account | `scripts/backfill_patient_accounts.py`; NULL offices stay as "Unassigned office" | office and provider totals have a large unexplained remainder | DATA-10 |
| 13 | `SELECT upper(btrim(payment_method)), lower(payment_type), count(*) FROM patient_payments WHERE legacy_id IS NULL GROUP BY 1, 2`; `SELECT upper(btrim(adjustment_type)), lower(write_off_type), count(*) FROM patient_adjustments GROUP BY 1, 2` | every value has a `transaction_codes` row | add the missing catalog rows | app-era rows fall into `unclassified` | DATA-03 |
| 14 | `SELECT payment_type, payment_method, count(*) FROM patient_payments WHERE legacy_id IS NOT NULL GROUP BY 1, 2` | after DATA-12: `transaction_code` filled | re-read `LEDGER` | no adjustments by type, no production / collection split, no deposit sections for history | DATA-12 |
| 15 | `SELECT lower(btrim(status)), is_active, close_date IS NOT NULL, legacy_id IS NOT NULL, count(*), sum(total_paid) FROM insurance_claims GROUP BY 1, 2, 3, 4` | migrated `draft` claims have no paid amount and no sent date | confirm the real `CLAIMSTATUS` codes in the export and re-map | "Claims Created Not Sent" and outstanding claims are inflated by mis-mapped closed claims | DATA-32 |
| 16 | `SELECT count(*), count(c.carrier_id), count(c.ins_plan_id), count(*) FILTER (WHERE p.carrier_id <> c.carrier_id) FROM insurance_claims c LEFT JOIN insurance_plans p ON p.id = c.ins_plan_id WHERE c.legacy_id IS NOT NULL` | carrier filled; no plan whose carrier differs | re-read `CLAIMH` (`RESPPLANID` was looked up in the plan-id map [V] `s30`) | claim reports by carrier or plan and benefits used are wrong for history | DATA-32 |
| 17 | `SELECT count(*) FROM insurance_claims WHERE total_billed = 0 AND total_paid > 0` | 0 | guard `_recompute_claim_totals` against claims without lines | header amounts zeroed by a payment on a secondary or un-backfilled claim [A] | DATA-31 |
| 18 | `SELECT status, is_cancelled, is_missed, checked_out_on IS NOT NULL, is_archived, legacy_id IS NOT NULL, count(*) FROM appointments GROUP BY 1, 2, 3, 4, 5, 6`; `SELECT count(*) FROM appointments WHERE patient_id IS NULL AND NOT is_blocked` | every string appears in 3.2; the patient-less count is small and understood | add unmapped strings to the mapping | unmapped rows count as `scheduled`; patient-less appointments are listed as placeholders (2.15) | DATA-16 |
| 19 | `SELECT status, count(*) FROM treatment_plan_items GROUP BY 1` | the ten canonical values | apply `scripts/normalize_treatment_item_statuses.py`; add leftovers to `rpt_value_map` | funnel classes miss rows | DATA-39 |
| 20 | `SELECT patient_type, count(*) FROM patients GROUP BY 1` (same for `gender`, `referral_type`, `state`, `preferred_contact`, `marital_status`) | — (inventory) | fill `rpt_value_map` | group-bys split one category into several | DATA-44 |
| 21 | `SELECT tenant_id, group_code, key1, count(*) FROM definitions GROUP BY 1, 2, 3 HAVING count(*) > 1` | no rows | `scripts/dedupe_definitions.py` | label joins multiply rows | DATA-10 |
| 22 | `SELECT recall_unit, count(*), min(recall_interval), max(recall_interval) FROM procedure_codes WHERE recall_interval IS NOT NULL GROUP BY 1`; `SELECT count(*), count(visit_code), count(ledger_code), count(ar_code), count(*) FILTER (WHERE is_post_op) FROM procedure_codes` | a small unit vocabulary; (flags are expected to be empty) | map units in the dimension; fill the typed flags | wrong recall due dates; Patients Seen, Daily Audit and Post-Op Report use default rules | DATA-04 |
| 23 | `SELECT lower(insurance_type), legacy_plan_type, count(*) FROM patient_insurance WHERE is_active GROUP BY 1, 2`; `SELECT count(*), count(*) FILTER (WHERE coalesce(individual_max, 0) > 0), count(group_number) FROM insurance_plans` | secondary slots exist (the source has 954 [D]); limits filled on about 31k plans [D] | `scripts/backfill_insurance_source_fields.py`; slot repair `scripts/backfill_pricing_hierarchy.py --only slots` (held [D]) | no secondary coverage; unused-benefit figures read 0 | DATA-32 |
| 24 | `SELECT count(*), count(*) FILTER (WHERE quantity > 1), count(*) FILTER (WHERE fee = 0), count(*) FILTER (WHERE fee < 0) AS negative_fee, sum(fee) FILTER (WHERE fee < 0), count(*) FILTER (WHERE coalesce(ucr_fee, 0) = 0), count(*) FILTER (WHERE ucr_fee > 0 AND ucr_fee < fee) AS fee_above_ucr, count(*) FILTER (WHERE ucr_fee > 0 AND ucr_fee < fee AND quantity > 1) AS fee_above_ucr_multi FROM patient_procedures WHERE NOT is_void` | — (inventory); negative fees only on migrated rows | decide whether `fee` is a line total when `quantity > 1` (assumed yes) and, from `fee_above_ucr_multi`, whether `office_fee` must become `ucr_fee x quantity`; zero-fee and unpriced charges go to an exception report; negative fees are kept with their sign (2.9) | production silently low; gross production below charged production where the stamped UCR is a unit price | DATA-11 |
| 25 | `SELECT clock_basis, source, count(*) FROM time_clock_entries GROUP BY 1, 2` | legacy rows are `wall_clock` | none needed: `rpt_time_clock` branches on the basis (`scripts/backfill_time_clock_utc.py` is optional) | — | DATA-23 |
| 26 | `SELECT table_name, character_maximum_length FROM information_schema.columns WHERE column_name = 'ledger_id' AND table_name IN ('patient_ins_payment_plans', 'patient_sec_ins_payment_plans')` | 50 | widen to `varchar(50)` | posting an insurance-side instalment fails or truncates the 39-character charge id [A] | DATA-37 |
| 27 | `SELECT legacy_id IS NOT NULL, lower(payment_type), count(*), sum(amount) FROM patient_payments GROUP BY 1, 2`; the same count by era on `patient_procedures`, `appointments`, `insurance_claims` | — (inventory) | — | index and refresh sizing rests on quoted numbers (documents quote both 1.33M and about 200k payment rows [A]) | DATA-02 |
| 28 | `SELECT count(*), sum(py.amount) FROM patient_payments py JOIN patients p ON p.id = py.patient_id WHERE py.account_id IS DISTINCT FROM p.account_id AND NOT py.is_void` | small; equals the payments of patients whose guarantor changed or whose account was merged | none needed: every dataset uses the current account (5.3); the count sizes the difference between `account_id` and `posted_account_id` | — (information); a non-zero count with a dataset that mixed the two columns would break R-03 | DATA-07 |
| 29 | `SELECT count(*), sum(r.amount) FROM patient_refunds r JOIN patient_payments p ON p.id = r.reversed_id WHERE r.reversed_type = 'payment' AND NOT r.is_void AND p.is_void` | 0 today (no frontend caller of the endpoint) | none in the data: the layer keeps the payment live (2.10); DATA-07 fixes `balance_service` the same way | each such pair overstates the on-screen balance by the refund amount and shows negative net collections | DATA-07 |
| 30 | `SELECT count(*) FROM patient_opening_balances ob WHERE EXISTS (SELECT 1 FROM patient_payments p WHERE p.patient_id = ob.patient_id AND upper(btrim(p.payment_method)) IN ('APBAL', 'APBAI', 'APBAC', 'APBIC') AND NOT p.is_void)` | 0 | keep one of the two entries per patient after review | the opening balance is in A/R twice | DATA-11 |
| 31 | (a) links beyond the fee: `SELECT debit_entry_id, sum(amount) FROM rpt_explicit_allocations WHERE debit_entry_id IS NOT NULL GROUP BY 1 HAVING sum(amount) > (SELECT amount FROM rpt_ledger_entries e WHERE e.entry_id = debit_entry_id)`; (b) links beyond the credit, same per `credit_entry_id`; (c) links of void legs: `SELECT count(*) FROM payment_allocations pa JOIN patient_payments p ON p.id = pa.payment_id WHERE p.is_void AND pa.amount > 0` (same against void `patient_procedures`) | (a), (b) a known, explained set (prepaid charges later paid by a carrier; primary plus secondary); (c) 0 | none in the data: the function caps the links and returns the excess as free credit (2.13); (c) delete or reverse the orphan links | without the cap the excess credit vanishes and aged A/R no longer equals the ledger | DATA-11 |
| 32 | `SELECT count(*), sum(coalesce(prim_ins_paid,0) + coalesce(sec_ins_paid,0) + coalesce(ter_ins_paid,0)) FROM ledger_insurance_details WHERE legacy_ledger_id IS NULL AND NOT is_void AND payment_date IS NULL` | 0 (the column is nullable and the generic create sets no default [V] `billing.py` L225) | set `payment_date = created_at::date`; make the column NOT NULL | the row is in the balance but outside every dated filter; the view falls back to the created date and flags it (2.10) | DATA-11 |
| 33 | per regular plan: `SELECT pl.id, pl.patient_id, (SELECT coalesce(sum(c.charged_fee), 0) FROM rpt_charges c JOIN rpt_contract_installments i ON i.charge_id = c.charge_id WHERE i.payment_plan_id = pl.id) AS billed, (SELECT coalesce(-sum(e.amount), 0) FROM rpt_ledger_entries e WHERE e.patient_id = pl.patient_id AND e.txn_class = 'contract_movement' AND e.amount < 0) AS moved FROM patient_payment_plans pl WHERE pl.is_active` | `billed <= moved` for every plan set up over treatment that is already on the ledger | post the missing "balance moved to contract" credit, or void the duplicate charges; the writer of DATA-37 posts the credit with the contract | instalment billing debits A/R a second time for work already charged | DATA-37 |
| 34 | per ortho contract: `SELECT o.id, o.total_ortho_amt, (SELECT coalesce(sum(c.charged_fee), 0) FROM rpt_charges c WHERE c.patient_id = o.patient_id AND (c.is_ortho_code OR c.is_contract_billing) AND c.service_date >= coalesce(o.banding_date, o.treat_start_date, o.pat_setup_date)) AS charged FROM ortho_plans o WHERE o.is_active` | `charged <= total_ortho_amt` | review contracts whose initial charge carried the full fee and which are also billed periodically | ortho production and A/R overstated by the periodic charges | DATA-37 |
| 35 | migrated-ledger completeness: `SELECT count(*), sum(b) FROM (SELECT patient_id, sum(amount) AS b FROM rpt_ledger_entries WHERE era = 'migrated' GROUP BY 1) s WHERE b < 0`; count and `sum(AMOUNT)` of `LTYPE = 'C'` rows in the `LEDGER` export versus `SELECT count(*), sum(fee) FROM patient_procedures WHERE legacy_id IS NOT NULL`; the skip reasons of `s28` (code not in catalog, unknown provider, no date) counted separately | loaded = source; the migrated credit-balance total equals the credit total of Denticon's Aging Report by Home Office (credits included) at the cut-over | seed the missing codes as inactive `procedure_codes`, map the unknown providers to a placeholder provider, re-run `s28` (idempotent); then record the Denticon control totals of R-21 | 87,585 charges (6 %) missing [D]: balances too low, phantom credits, wrong ageing and provider income | DATA-57 |
| 36 | `SELECT legacy_id IS NOT NULL AS migrated, billing_order, apply_to, count(*) FROM patient_procedures WHERE NOT is_void GROUP BY 1, 2, 3` | migrated: `primary` / `secondary` / `tertiary` or NULL; app: mostly NULL (only plan postings carry it) | DATA-12 re-reads the `DD` / `DDD` depth; DATA-33 stamps the tier on new charges | Claims Not Created for secondary tiers and Unbilled Due to No Insurance rest on the derived rule (2.9) | DATA-12, DATA-33 |
| 37 | `SELECT guarantor_kind, count(*), count(resp_party_type) FROM rpt_account_dim GROUP BY 1` | every account has a type | DATA-53: add `accounts.resp_party_type`, back-fill from the party row matched by `legacy_key`, default `No Type Defined` | the ten criteria that filter or print the responsible-party type return nothing for self-guarantor accounts | DATA-53 |
| 38 | duplicate join keys: `SELECT tenant_id, legacy_id, count(*) FROM referrals WHERE legacy_id IS NOT NULL GROUP BY 1, 2 HAVING count(*) > 1` (same on `responsible_parties`); overlapping code versions: `SELECT a.tenant_id, a.code FROM transaction_codes a JOIN transaction_codes b ON b.tenant_id = a.tenant_id AND b.code_kind = a.code_kind AND b.code = a.code AND b.id > a.id AND daterange(a.valid_from, a.valid_to) && daterange(b.valid_from, b.valid_to)`; `SELECT count(*), count(DISTINCT entry_id) FROM rpt_ledger_entries_all` | no rows; the two counts are equal | merge the duplicate source rows; the views already take one row (2.0), so duplicates cannot multiply amounts | — (the lateral joins make this a data-hygiene check, R-01 proves the ledger) | DATA-10 |
| 39 | user-posted transfers without a partner: `SELECT e.account_id, date_trunc('month', e.transaction_date) AS m, sum(e.amount) FROM rpt_ledger_entries e WHERE e.is_transfer AND e.account_payment_id IS NULL GROUP BY 1, 2 HAVING sum(e.amount) <> 0` | no rows, or transfers that legitimately cross accounts | the office completes or corrects the pair | a one-legged transfer moves a balance instead of transferring it (control R-10b; never a ship gate) | DATA-11 |

Not repairable inside the database (need a Denticon re-export, DATA-50): treatment-plan history (`TREATPLAN`,
`TREATPLANINSD`), recalls (`PATRECALL`), ortho contracts and contract billing, appointment created / confirmation stamps,
a patient creation date, and per-line legacy insurance paid / adjusted amounts. The skipped charges are **not** in this
list: the migration report itself says they "can be recovered by first importing the missing codes" [V]
(`docs/gen_migration_report.js` L215) and recommends checking balances against Denticon before go-live (L223) —
DATA-57 does both.

**External control totals (R-21).** Every other invariant of section 10 is internal: it passes on an incomplete ledger.
DATA-57 therefore records, per client database and per office, figures read from Denticon itself and stores them in
`rpt_data_quality` (`check_key` `legacy_control_<measure>`, `measured` = the figure and its source report): total A/R at
the cut-over date from Aging Report by Home Office with credit balances included, and charges, payments and adjustments
by month from the Executive Day Sheet for the last 24 migrated months. The layer must reproduce them (R-21) before a
financial report on migrated periods ships without the completeness caveat.

---

## 7. Schema additions

`A` = additive column or table (no behaviour change until written); `B` = needs writer changes in services. Every new
column is nullable at first; large tables are back-filled in batches outside the deploy migration (section 8).

| Item | Change | Why | Phase | Unlocks |
|---|---|---|---|---|
| DATA-02 | `rpt_data_quality`, `rpt_tenant_settings`, `rpt_value_map`, `rpt_legacy_logins` (A) | readiness state, legacy policies, vocabularies | P0 | every dataset's caveat logic |
| DATA-03 | `transaction_codes` with `legacy_sub_type`, `legacy_class` and the validity exclusion constraint (3.3) (B: pickers and validation read it) | sign, side, class, tender on the server | P0 | Executive Day Sheet, Deposit Slip, Collection Report, Special Transaction, Credit Codes Report, net production / collections |
| DATA-04 | `procedure_codes.is_production`, `is_visit_code`, `is_ledger_code`, `is_ar_code`, `code_type`, `bill_to_insurance`, `production_type_id`; `rpt_code_groups`, `rpt_code_group_members`, `rpt_code_in_group()` (A) | typed code flags; versioned groups | P0 | Patients Seen, Procedures Done, Daily Audit, Post-Op, hygiene / exam metrics, Procedure Codes List criteria |
| DATA-05 | `providers.provider_kind` (B: `ProviderCRUD`) | one doctor / hygiene rule | P0 | every doctor-versus-hygiene split |
| DATA-12 | `patient_payments.transaction_code`, `card_brand`, `card_last4` (B) | retire the overloaded `payment_method` | P1 | codes and tender for history; card sections of the Deposit Slip |
| DATA-13 | `posted_at`, `posting_date` on the five money tables; `transaction_date` on `patient_procedures`, `patient_payments` and `ledger_insurance_details` (B) | immutable entry date as an indexed column; ledger date distinct from service date and from the date a payment applies to | P1 | Created Date basis without time-zone arithmetic; "Transaction Date vs Service Date" (Special Transaction, Patients Seen, Claims Not Created) and "Transaction Date vs Payment Date" (Deposit Slip) criteria; back-dated-entry exception report |
| DATA-14 | `voided_at`, `voided_by`, `void_reason` on charges, payments, adjustments, refunds; `updated_at`, `updated_by` on `patient_adjustments`; before / after audit on `patient-procedures` writes (B) | who voided what, when | P1 | Audit Trail, deleted-transaction report, incremental refresh, R-17 |
| DATA-15 | `tenant_id` on `patient_procedures`, `patient_payments`, `ledger_insurance_details`, `payment_allocations`, `insurance_claims`, `claim_submissions`, `appointments`, `appointment_procedures`; `account_id` on `patient_procedures` = the account at posting, exposed as `posted_account_id` (B: insert hooks) | tenant-leading indexes; safe generic lists; the posting-time account of a charge | P1 | tenant safety; "account as posted" audits (the A/R unit stays the current account, 5.3) |
| DATA-17 | `appointment_events`; `appointments.deleted_at`, `deleted_by`, `cancelled_at`, `cancelled_by`, `missed_at`, `seated_on`, `available_on`, `confirmed_by`, `confirmed_via`, `checked_in_by`, `checked_out_by`, `booking_source`, `reschedule_count`; cancellation reason as a definitions group; the Scheduler sends reason, note and call-list flag (B, includes a frontend fix) | appointment history does not exist | P1 | Appointment Time Stamps, Appointments Confirmed Via Vendors, Cancelled List by reason, Cancelled From Automated Campaigns, Call List, AppointNow API filter, Audit Trail reschedule / cut-copy-paste, same-day cancellation and status-as-of metrics |
| DATA-18 | `progress_notes.provider_id`, `appointment_id` (B) | notes link only to patient and date | P1 | Missing / Unsigned Progress Notes exact per appointment and provider |
| DATA-21 | `insurance_claims.sent_method`, `print_count`, `first_printed_at`, `last_printed_at`; `claim_print_events` (B) | per-claim channel and print tracking are not stored | P1 | Claims Printed, Claims List "EClaim / Paper" |
| DATA-22 | `statement_runs` (header of the existing `patient_statements.batch_id`); `patient_statements.delivery_error`; `accounts.last_statement_date`, `statement_locked_through` (B). The row-level columns `batch_id`, `delivery_method`, `delivery_status`, `delivered_to`, `delivered_at` already exist [V] and are reused | statement run criteria, lock and e-mail error text | P1 | Statements screen, Email Statement Error Report |
| DATA-24 | `provider_production_goals` (A) | no goals table exists [A] | P1 | Scheduled Production "Estimated Prod."; goal semantics are owned by `05_metric_catalog.md` §8 and `06_dashboards.md` |
| DATA-25 | `treatment_plan_item_events`, `claim_status_history` (B) | history cannot be back-filled, so capture starts before the reports | P1 | case acceptance over time, claim status as of a date, turnaround by stage |
| DATA-26 | `payment_allocations.tenant_id`, `office_id`, `allocated_at`, `allocation_method`, `unallocated_reason`, `created_by`, `reversed_at`, `reversed_by`; `patient_payments.aged_from_date`; `rpt_derived_allocations` (B: allocate at posting) | persistent dated allocations with an explicit unallocated remainder; age of a transferred balance | P2 | Income Allocation, Allocation Detail, Unallocated Payment/Adjustments, WaterFall, collections by producing provider, reproducible pay runs |
| DATA-28 | `deposits`, `deposit_items`, `insurance_remittances`; `ledger_insurance_details.remittance_id` (B) | no deposit or remittance header exists | P2 | deposit date basis, "Group Batch Checks", one cheque = one line, bank reconciliation |
| DATA-29 | `office_day_closes`, `financial_period_locks`; write guards (B) | closed periods must not change (PD-9) | P2 | frozen day sheet, month-end reports that reproduce, Audit Trail `close_out` |
| DATA-30 | `rpt_ar_snapshot`, `rpt_ar_snapshot_accounts`, `rpt_day_close_snapshot`, `rpt_metric_values`, `rpt_snapshot_variances` (A) | point-in-time figures | P2 | month-end ageing that reproduces; frozen KPIs |
| DATA-31 | `insurance_claims.deleted_at`, `deleted_by`, `parent_claim_id`, `denied_date`, `denial_reason_code`, `denial_remark_code`, `denied_amount`, `appeal_date`, `updated_at`, `updated_by`; office-local date stamps; recompute guard; `_sum_coverage` ignores migrated rows (B) | delete versus close; denial data; R-11 | P2 | Outstanding Claims as of a date (`rpt_claim_facts_as_of()`), denial analysis, secondary-claim tracking |
| DATA-33 | `patient_procedures.primary_ins_plan_id`, `primary_carrier_id`, `secondary_ins_plan_id`, and the writer stamps `billing_order` on every new charge; `patient_payments.claim_id`, `carrier_id`, `ins_plan_id` (B) | payer and bill tier at the time of service; carrier of an unallocated insurance payment | P2 | production and collections by carrier, payer mix, Claims Not Created and Unbilled Due to No Insurance on stored tiers |
| DATA-34 | `eligibility_verifications` (adopt or drop the orphan `eligibility_checks` table that exists only in the dump [A]) (B) | one overwritable stamp per subscriber today | P2 | DPS Eligibility Report with history and "On Hold", RTE Sweep Details |
| DATA-35 | `accounts.balance_status_code`, `sent_to_collections_at`; definitions group `balance_status` (B) | no collections stage or date | P2 | ageing "Include Balance Status", Responsible Party - Sent to Collection |
| DATA-37 | `ledger_id varchar(50)` on the two insurance instalment tables; `patient_procedures.ortho_plan_id`, `payment_plan_id`; the contract writer posts the "balance moved to contract" credit (class `contract_movement`) (B) | defect; contract link on the charge; contract billing must not debit A/R twice | P2 | Payment Plan Charges, contract balances |
| DATA-38 | `capitation_payments`; `era_files`, `era_claim_payments`, `era_adjustments` (A; the ERA tables are filled only by a clearinghouse integration outside this module) | a capitation payment has no patient and cannot be a `patient_payments` row; no ERA / 835 entity | P2 | Capitation Payment, EOB 835 Claims Reconcile, 835 Denial Report |
| DATA-39 | `treatment_plan_items.office_id`; `accepted_date` stamped on any transition into an accepted state; `treatment_plans.is_deleted` (B) | office filter; reliable acceptance date | P3 | Treatment Plan Status / Analysis / Detail by office |
| DATA-40 | `patients.referral_source_id`, `referral_date`; `referrals.source_category`, `is_active`, `updated_at`; `referral_cases` (B) | referral attribution is a string; no referral case entity | P3 | the three Referral Management reports, Referred Out List, referral production for app patients |
| DATA-41 | `patient_recalls.tenant_id`, `appointment_id`, `source`; engine that maintains rows on charge posting and booking (B) | no recall engine | P3 | Recall Due / Scheduled Recall on maintained rows (the derived function and the hygiene-reappointment metric do not wait for it) |
| DATA-42 | `ortho_plans.contract_status`, `ortho_status_code`, `debond_date`; `ortho_visits` (B) | no ortho status, debond date or visit record | P3 | all five Ortho reports |
| DATA-43 | `appointments.appointment_type_id` -> `production_types`; `office_schedule_days.effective_from` / `effective_to` or a daily capacity snapshot (B) | no appointment type; capacity is current-state only | P3 | type breakdowns, utilisation over time |
| DATA-44 | `patients.deleted_at`, `deleted_by`, `inactivated_at`, `inactive_reason`, `registration_source`, `registration_status`, `activated_at` (B) | inactive and deleted share one flag; a quick-save placeholder is not marked | P3 | patient lists by status, Online Registered Patients, New Patients via Appointments, attrition |
| DATA-45 | `providers.updated_at`, `license_state`, `license_expires_on`, `dea_expires_on`; `operatories.operatory_type` (A) | list columns that have no data | P3 | Provider Registration, Provider List criteria |
| DATA-46 | `tenant_id` on `treatment_plans`, `treatment_plan_items`, `progress_notes`, `patient_recalls`, `patient_insurance`, `perio_exams`, `prescriptions`, `operatories`, `user_offices` (B) | batch 2 of DATA-15 | P3 | tenant safety on clinical datasets |
| DATA-49 | `claim_line_snapshots` (estimate, write-off estimate and patient portion frozen at claim creation) (B) | write-off timing variants | P4 | net production with estimate at claim date and adjustment at payment date |
| DATA-53 | `accounts.resp_party_type`; definitions group `RESP_PARTY_TYPE` gains the member `No Type Defined` (B: guarantor edit screens write it) | the type lives only on `responsible_parties`; self-guarantor accounts have none | P1 | the ten legacy criteria on responsible-party type (section 11) |
| DATA-54 | `office_smart_assist_items.consent_template_id` (A) | a consent item names no template | P3 | SmartAssist Report Card consent columns |

```sql
-- DATA-02
CREATE TABLE rpt_data_quality (
  tenant_id int NOT NULL REFERENCES tenants(id), check_key varchar(60) NOT NULL,
  status varchar(10) NOT NULL,                    -- unknown | pass | fail | waived
  measured jsonb, checked_at timestamp NOT NULL DEFAULT now(), checked_by int REFERENCES users(id), note text,
  PRIMARY KEY (tenant_id, check_key));
CREATE TABLE rpt_legacy_logins (tenant_id int NOT NULL, login_key varchar(60) NOT NULL, login varchar(60) NOT NULL,
  PRIMARY KEY (tenant_id, login_key));

-- DATA-04 / DATA-05 (all nullable: NULL = use the default rule of the dimension view)
ALTER TABLE procedure_codes
  ADD COLUMN is_production boolean, ADD COLUMN is_visit_code boolean, ADD COLUMN is_ledger_code boolean,
  ADD COLUMN is_ar_code boolean, ADD COLUMN code_type varchar(10),          -- dental | medical | other
  ADD COLUMN bill_to_insurance boolean, ADD COLUMN production_type_id int;
ALTER TABLE providers ADD COLUMN provider_kind varchar(20);

-- DATA-12
ALTER TABLE patient_payments
  ADD COLUMN transaction_code varchar(20),        -- the code; payment_method keeps the tender for old readers until retired
  ADD COLUMN card_brand varchar(12), ADD COLUMN card_last4 varchar(4);
-- app rows, in id batches:   UPDATE patient_payments SET transaction_code = upper(btrim(payment_method))
--                            WHERE legacy_id IS NULL AND transaction_code IS NULL AND id BETWEEN :lo AND :hi;
-- migrated rows: from the LEDGER re-read, joined on legacy_id = LEDGERID (code, card type, TRANDATE, BILLINGORDER depth)

-- DATA-13 / DATA-14 (repeat the stamp and void columns on patient_adjustments and patient_refunds;
--                    ledger_insurance_details already has the void columns)
ALTER TABLE patient_procedures
  ADD COLUMN transaction_date date,               -- NULL = date_of_service
  ADD COLUMN posted_at timestamp, ADD COLUMN posting_date date,   -- set once by the server: UTC instant and office-local date
  ADD COLUMN voided_at timestamp, ADD COLUMN voided_by int REFERENCES users(id), ADD COLUMN void_reason varchar(255);
ALTER TABLE patient_payments
  ADD COLUMN transaction_date date,               -- ledger date: server default = the office's today, editable until the
                                                  -- period is locked; NULL = payment_date. payment_date stays the date the
                                                  -- payment applies to
  ADD COLUMN posted_at timestamp, ADD COLUMN posting_date date,
  ADD COLUMN voided_at timestamp, ADD COLUMN voided_by int REFERENCES users(id), ADD COLUMN void_reason varchar(255);
ALTER TABLE ledger_insurance_details
  ADD COLUMN transaction_date date, ADD COLUMN posted_at timestamp, ADD COLUMN posting_date date;

-- DATA-15
ALTER TABLE patient_procedures ADD COLUMN tenant_id int, ADD COLUMN account_id int;   -- account_id = account at posting
ALTER TABLE patient_payments ADD COLUMN tenant_id int;
ALTER TABLE appointments ADD COLUMN tenant_id int;           -- likewise the other tables of the item
-- back-fill in primary-key batches (section 8), then NOT NULL through a validated CHECK:
--   UPDATE patient_procedures pp SET tenant_id = p.tenant_id FROM patients p
--   WHERE p.id = pp.patient_id AND pp.tenant_id IS NULL AND pp.id BETWEEN :lo AND :hi;
--   UPDATE appointments a SET tenant_id = o.tenant_id FROM offices o WHERE o.id = a.office_id AND a.tenant_id IS NULL ...;
-- patient_procedures.account_id is stamped on insert only (the same before_insert hook as patient_payments [V]
-- accounts.py L408-414); it is NOT back-filled: the account an older charge was posted against is not knowable.

-- DATA-17
CREATE TABLE appointment_events (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, appointment_id varchar(50) NOT NULL REFERENCES appointments(id),
  office_id int NOT NULL, patient_id int,
  event_type varchar(24) NOT NULL,   -- created | status_changed | confirmed | arrived | available | seated | checked_out
                                     -- | cancelled | no_show | rescheduled | moved_cut_paste | copied | deleted | restored | edited
  from_value jsonb, to_value jsonb,  -- {status, date, start_time, operatory_id, provider_id}
  reason_code varchar(50), note text,
  source varchar(20) NOT NULL,       -- staff | sms | appointnow | appointnow_api | vendor | campaign | system
  vendor varchar(50), occurred_at timestamp NOT NULL DEFAULT now(), actor_user_id int REFERENCES users(id));
ALTER TABLE appointments
  ADD COLUMN booking_source varchar(20),          -- staff | appointnow | appointnow_api | sms | vendor
  ADD COLUMN deleted_at timestamp, ADD COLUMN deleted_by int, ADD COLUMN cancelled_at timestamp, ADD COLUMN cancelled_by int,
  ADD COLUMN missed_at timestamp, ADD COLUMN available_on timestamp, ADD COLUMN seated_on timestamp,
  ADD COLUMN confirmed_by int, ADD COLUMN confirmed_via varchar(20), ADD COLUMN checked_in_by int, ADD COLUMN checked_out_by int,
  ADD COLUMN reschedule_count int NOT NULL DEFAULT 0;
-- written by every path: PATCH /appointments/{id}/status, generic PATCH / PUT, DELETE / restore, the SMS reply webhook,
-- AppointNow approval, plan booking, scheduler cut / copy / paste. Events from before go-live are not reconstructable.

-- DATA-21
ALTER TABLE insurance_claims
  ADD COLUMN sent_method varchar(10),             -- eclaim | paper
  ADD COLUMN print_count int NOT NULL DEFAULT 0, ADD COLUMN first_printed_at timestamp, ADD COLUMN last_printed_at timestamp;
CREATE TABLE claim_print_events (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, claim_id varchar(50) NOT NULL REFERENCES insurance_claims(id),
  office_id int, printed_at timestamp NOT NULL DEFAULT now(), printing_date date NOT NULL,   -- office-local
  printed_by int REFERENCES users(id), channel varchar(12) NOT NULL);                        -- print | batch_print | eclaim

-- DATA-22
CREATE TABLE statement_runs (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, batch_id varchar(50) NOT NULL UNIQUE,    -- = patient_statements.batch_id
  office_id int, statement_date date NOT NULL, criteria jsonb NOT NULL, statement_count int, total_balance numeric(14,2),
  status varchar(12) NOT NULL DEFAULT 'running',  -- running | done | failed
  started_by int REFERENCES users(id), started_at timestamp NOT NULL DEFAULT now(), finished_at timestamp);
ALTER TABLE patient_statements ADD COLUMN delivery_error text;
ALTER TABLE accounts ADD COLUMN last_statement_date date, ADD COLUMN statement_locked_through date;

-- DATA-24 (columns agreed with 05_metric_catalog.md §8.2)
CREATE TABLE provider_production_goals (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, provider_id varchar(50) NOT NULL REFERENCES providers(id),
  office_id int,                                  -- NULL = every office the provider works at
  goal_month date NOT NULL,                       -- first day of the month
  daily_goal numeric(12,2), working_days numeric(4,1), monthly_goal numeric(14,2),
  production_basis varchar(10) NOT NULL DEFAULT 'net',   -- net | charged | gross
  source varchar(12) NOT NULL DEFAULT 'manual',   -- manual | auto_seed | hours_based | import
  version int NOT NULL DEFAULT 1, valid_from timestamp NOT NULL DEFAULT now(), superseded_at timestamp,
  created_by int REFERENCES users(id), created_at timestamp NOT NULL DEFAULT now());
CREATE UNIQUE INDEX uq_provider_production_goals_live ON provider_production_goals
  (tenant_id, provider_id, coalesce(office_id, 0), goal_month) WHERE superseded_at IS NULL;

-- DATA-25
CREATE TABLE claim_status_history (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, claim_id varchar(50) NOT NULL REFERENCES insurance_claims(id),
  from_status varchar(30), to_status varchar(30) NOT NULL, changed_at timestamp NOT NULL DEFAULT now(),
  changed_by int REFERENCES users(id), source varchar(20), reason text);
CREATE TABLE treatment_plan_item_events (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, item_id varchar(50) NOT NULL, plan_id varchar(50) NOT NULL, patient_id int NOT NULL,
  from_status varchar(20), to_status varchar(20) NOT NULL, fee_at_event numeric(10,2),
  occurred_at timestamp NOT NULL DEFAULT now(), actor_user_id int REFERENCES users(id),
  source varchar(20) NOT NULL);      -- client | charge | booking | release | system

-- DATA-26
ALTER TABLE payment_allocations
  ADD COLUMN tenant_id int, ADD COLUMN office_id int,
  ADD COLUMN allocated_at timestamp,              -- immutable entry instant; alloc_date stays the business date
  ADD COLUMN allocation_method varchar(24),       -- manual | claim_line | fifo_patient_portion | reallocation | unallocated
  ADD COLUMN unallocated_reason varchar(30),      -- prepayment | overpayment | no_open_patient_portion | manual_hold
  ADD COLUMN created_by int REFERENCES users(id), ADD COLUMN reversed_at timestamp, ADD COLUMN reversed_by int REFERENCES users(id);
-- an unallocated remainder is a row with procedure_id IS NULL and allocation_method = 'unallocated'; absorbing it later
-- sets reversed_at and inserts new dated rows. Guard added to allocate_payment: a split may not exceed the open amount of
-- the charge (the function caps older rows, 2.13).
ALTER TABLE patient_payments ADD COLUMN aged_from_date date;   -- debit leg of a balance transfer: oldest open age moved
CREATE TABLE rpt_derived_allocations (
  tenant_id int NOT NULL, account_id int NOT NULL, allocation_id text NOT NULL,
  method varchar(20) NOT NULL, is_derived boolean NOT NULL, unallocated_reason varchar(30),
  credit_entry_id text NOT NULL, debit_entry_id text, amount numeric(14,2) NOT NULL CHECK (amount > 0), allocation_date date,
  credit_entry_type varchar(20), credit_class varchar(30), credit_ledger_bucket varchar(24), payer varchar(10),
  tender_class varchar(20), counts_as_collection boolean, credit_transaction_date date, credit_created_date date,
  credit_office_id int, credit_provider_id varchar(50), credit_patient_id int,
  debit_entry_type varchar(20), debit_ledger_bucket varchar(24), service_date date, allocation_office_id int,
  allocation_provider_id varchar(50), allocation_hygienist_id varchar(50), procedure_code varchar(20),
  debit_patient_id int, claim_id varchar(50), allocation_target varchar(24) NOT NULL,
  built_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, allocation_id));
CREATE INDEX ix_rpt_derived_allocations_account ON rpt_derived_allocations (tenant_id, account_id);
CREATE INDEX ix_rpt_derived_allocations_credit ON rpt_derived_allocations (tenant_id, credit_entry_id);
CREATE INDEX ix_rpt_derived_allocations_provider_date ON rpt_derived_allocations (tenant_id, allocation_provider_id, allocation_date);

-- DATA-28
CREATE TABLE insurance_remittances (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, office_id int NOT NULL, carrier_id int, ins_plan_id int,
  payment_date date NOT NULL, transaction_code varchar(20), check_number varchar(100), bank_number varchar(100),
  eob_number varchar(100), eft_trace_number varchar(100), total_amount numeric(14,2) NOT NULL,
  posted_at timestamp NOT NULL DEFAULT now(), posting_date date NOT NULL, created_by int REFERENCES users(id),
  is_void boolean NOT NULL DEFAULT false, voided_at timestamp, voided_by int, void_reason varchar(255));
CREATE TABLE deposits (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, office_id int NOT NULL,       -- the office that holds the money (posting office)
  deposit_date date NOT NULL,
  deposit_group varchar(20) NOT NULL, bank_account_label varchar(100), batch_reference varchar(100),
  status varchar(12) NOT NULL DEFAULT 'open',     -- open | deposited | reconciled
  total_amount numeric(14,2) NOT NULL DEFAULT 0, created_by int, created_at timestamp NOT NULL DEFAULT now(),
  deposited_by int, deposited_at timestamp);
CREATE TABLE deposit_items (
  deposit_id bigint NOT NULL REFERENCES deposits(id), payment_id varchar(50) REFERENCES patient_payments(id),
  remittance_id bigint REFERENCES insurance_remittances(id), amount numeric(14,2) NOT NULL,
  CHECK ((payment_id IS NULL) <> (remittance_id IS NULL)), UNIQUE (payment_id), UNIQUE (remittance_id));

-- DATA-29
CREATE TABLE office_day_closes (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, office_id int NOT NULL REFERENCES offices(id), business_date date NOT NULL,
  status varchar(12) NOT NULL DEFAULT 'closed',   -- closed | reopened
  closed_at timestamp NOT NULL DEFAULT now(), closed_by int NOT NULL REFERENCES users(id),
  reopened_at timestamp, reopened_by int REFERENCES users(id), reopen_reason text,
  control_totals jsonb NOT NULL,                  -- production, adjustments by side, collections by deposit group, A/R open and close
  UNIQUE (office_id, business_date));
CREATE TABLE financial_period_locks (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, office_id int REFERENCES offices(id),   -- NULL = all offices
  locked_through date NOT NULL, locked_at timestamp NOT NULL DEFAULT now(), locked_by int NOT NULL REFERENCES users(id),
  unlocked_at timestamp, unlocked_by int REFERENCES users(id), unlock_reason text);
-- Guard (one function called by every ledger writer): reject insert, update or void of a money row whose
-- transaction_date <= the effective locked_through of its office, unless the caller holds the override right;
-- an override writes an audit row and marks the slice dirty. Service dates may be older (late charges).

-- DATA-30 (frozen kinds are insert-only: a BEFORE UPDATE OR DELETE trigger raises for every snapshot_kind other than
--          'daily' / 'live', and the primary keys below make a second write of the same snapshot fail)
CREATE TABLE rpt_ar_snapshot (
  tenant_id int NOT NULL, snapshot_date date NOT NULL,
  snapshot_kind varchar(12) NOT NULL,             -- daily | month_end | day_close | period_lock
  attribution varchar(20) NOT NULL,               -- transaction_office (unit account_office) | home_office (unit account)
  office_id int NOT NULL DEFAULT 0,               -- 0 = unassigned office
  bucket_set varchar(20) NOT NULL,
  bucket_key varchar(20) NOT NULL,                -- a bucket of the set, or 'credit' for the credit balances of the office
  open_amount numeric(14,2) NOT NULL, open_insurance_est numeric(14,2) NOT NULL DEFAULT 0,
  open_patient numeric(14,2) NOT NULL DEFAULT 0, account_count int NOT NULL, created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, snapshot_date, snapshot_kind, attribution, office_id, bucket_set, bucket_key));
CREATE TABLE rpt_ar_snapshot_accounts (           -- month ends and lock dates only; unit account
  tenant_id int NOT NULL, snapshot_date date NOT NULL, snapshot_kind varchar(12) NOT NULL, account_id int NOT NULL,
  home_office_id int, current_amount numeric(14,2), over_30 numeric(14,2), over_60 numeric(14,2), over_90 numeric(14,2),
  over_120 numeric(14,2), insurance_est numeric(14,2), patient_amount numeric(14,2), credit_amount numeric(14,2),
  total_balance numeric(14,2) NOT NULL,
  PRIMARY KEY (tenant_id, snapshot_date, snapshot_kind, account_id));
CREATE TABLE rpt_day_close_snapshot (
  tenant_id int NOT NULL, office_id int NOT NULL, business_date date NOT NULL,
  day_close_id bigint NOT NULL REFERENCES office_day_closes(id),
  control_totals jsonb NOT NULL, report_run_id bigint, created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, office_id, business_date, day_close_id));
CREATE TABLE rpt_metric_values (
  tenant_id int NOT NULL, metric_key varchar(60) NOT NULL, metric_version int NOT NULL, settings_version int NOT NULL DEFAULT 0,
  period_grain varchar(8) NOT NULL,               -- day | month
  period_start date NOT NULL,
  office_id int NOT NULL DEFAULT 0,               -- 0 = organisation
  provider_id varchar(50) NOT NULL DEFAULT '',    -- '' = all providers
  member_key varchar(60) NOT NULL DEFAULT '',     -- one extra dimension member, e.g. tier=primary
  snapshot_kind varchar(12) NOT NULL,             -- live | day_end | month_end | period_lock
  value numeric, numerator numeric, denominator numeric,
  computed_at timestamp NOT NULL DEFAULT now(), is_restated boolean NOT NULL DEFAULT false,
  PRIMARY KEY (tenant_id, metric_key, period_grain, period_start, office_id, provider_id, member_key, snapshot_kind));
CREATE TABLE rpt_snapshot_variances (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, snapshot_kind varchar(12) NOT NULL, office_id int, business_date date NOT NULL,
  measure varchar(40) NOT NULL, frozen_value numeric(14,2) NOT NULL, live_value numeric(14,2) NOT NULL,
  detected_at timestamp NOT NULL DEFAULT now());

-- DATA-31
ALTER TABLE insurance_claims
  ADD COLUMN deleted_at timestamp, ADD COLUMN deleted_by int REFERENCES users(id),
  ADD COLUMN parent_claim_id varchar(50) REFERENCES insurance_claims(id),
  ADD COLUMN denied_date date, ADD COLUMN denial_reason_code varchar(20), ADD COLUMN denial_remark_code varchar(20),
  ADD COLUMN denied_amount numeric(12,2), ADD COLUMN appeal_date date,
  ADD COLUMN updated_at timestamp, ADD COLUMN updated_by int REFERENCES users(id);
-- service changes: _sum_coverage adds "legacy_ledger_id IS NULL" (R-11); _recompute_claim_totals leaves total_billed and
-- est_insurance alone when the claim owns no procedures (section 6 #17); date stamps use the office's today.

-- DATA-33
ALTER TABLE patient_procedures
  ADD COLUMN primary_ins_plan_id int, ADD COLUMN primary_carrier_id int, ADD COLUMN secondary_ins_plan_id int;
ALTER TABLE patient_payments ADD COLUMN claim_id varchar(50), ADD COLUMN carrier_id int, ADD COLUMN ins_plan_id int;

-- DATA-34
CREATE TABLE eligibility_verifications (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, office_id int NOT NULL, appointment_id varchar(50), patient_id int NOT NULL,
  subscriber_id int, ins_plan_id int, carrier_id int, tier varchar(12),
  method varchar(12) NOT NULL,                    -- manual | rte_sweep | service
  verify_type varchar(30),                        -- e.g. Re-verification
  is_on_hold boolean NOT NULL DEFAULT false,
  status varchar(16) NOT NULL,                    -- requested | verified | not_eligible | unknown | error
  payer_name varchar(255), error_text text,
  checked_at timestamp NOT NULL DEFAULT now(), checked_by int REFERENCES users(id),   -- NULL = automatic sweep
  created_at timestamp NOT NULL DEFAULT now());

-- DATA-35 / DATA-37
ALTER TABLE accounts ADD COLUMN balance_status_code varchar(10), ADD COLUMN sent_to_collections_at timestamp;
ALTER TABLE patient_ins_payment_plans ALTER COLUMN ledger_id TYPE varchar(50);
ALTER TABLE patient_sec_ins_payment_plans ALTER COLUMN ledger_id TYPE varchar(50);
ALTER TABLE patient_procedures ADD COLUMN ortho_plan_id int, ADD COLUMN payment_plan_id int;

-- DATA-38
CREATE TABLE capitation_payments (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, office_id int NOT NULL, carrier_id int NOT NULL, fee_schedule_id int,
  payment_date date NOT NULL, amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_code varchar(20) NOT NULL, adjustment_code varchar(20) NOT NULL,     -- "Use Payment Code Of" / "Use Adjustment Code Of"
  check_number varchar(100), bank_number varchar(100), eob_number varchar(100), provider_id varchar(50), notes text,
  posted_at timestamp NOT NULL DEFAULT now(), posting_date date NOT NULL, created_by int REFERENCES users(id),
  is_void boolean NOT NULL DEFAULT false, voided_at timestamp, voided_by int REFERENCES users(id), void_reason varchar(255));
CREATE TABLE era_files (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, carrier_id int, payer_id varchar(50), check_or_eft_number varchar(100),
  payment_date date, received_at timestamp NOT NULL, total_amount numeric(14,2), file_name varchar(255));
CREATE TABLE era_claim_payments (
  id bigserial PRIMARY KEY, era_file_id bigint NOT NULL REFERENCES era_files(id), tenant_id int NOT NULL, office_id int,
  claim_id varchar(50) REFERENCES insurance_claims(id),          -- NULL = unmatched
  is_matched boolean NOT NULL DEFAULT false, patient_id int, payer_claim_control_number varchar(50), service_date date,
  billed_amount numeric(14,2), paid_amount numeric(14,2), patient_responsibility numeric(14,2),
  is_posted boolean NOT NULL DEFAULT false, posted_at timestamp, not_posted_reason text,
  claim_status_after varchar(20));                               -- partial_closed | closed
CREATE TABLE era_adjustments (                                   -- one row per service line and reason code
  id bigserial PRIMARY KEY, era_claim_payment_id bigint NOT NULL REFERENCES era_claim_payments(id),
  procedure_code varchar(20), charge_submitted numeric(14,2), actual_allowed numeric(14,2), paid_amount numeric(14,2),
  group_code varchar(4),                                         -- CO | PR | OA | PI
  reason_code varchar(10), remark_code varchar(10), amount numeric(14,2));

-- DATA-40
CREATE TABLE referral_cases (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, direction varchar(16) NOT NULL,   -- external_out | external_in | internal
  patient_id int REFERENCES patients(id),         -- NULL on an incoming referral until a patient record exists (legacy "N/A")
  prospect_first_name varchar(100), prospect_last_name varchar(100), prospect_phone varchar(20), prospect_dob date,
  referral_date date NOT NULL,
  from_office_id int, to_office_id int, from_provider_id varchar(50), to_provider_id varchar(50),
  external_referral_id int REFERENCES referrals(id), specialty varchar(100), procedure_codes text[],
  treatment_plan_item_id varchar(50),
  appointment_id varchar(50) REFERENCES appointments(id),        -- Appt Date / Time / Op on the internal and incoming grids
  reason_code varchar(20),                                       -- External Incoming "Referral Reason Code"
  status varchar(16) NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected | cancelled | completed | in_progress | not_needed | expired
  tx_status varchar(12),                          -- internal referrals: incomplete | completed
  contact_status varchar(24),                     -- no_response | patient_to_call | appointment_scheduled | referral_refused
  contact_status_at timestamp,
  created_by int REFERENCES users(id), created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp,
  deleted_at timestamp, deleted_by int REFERENCES users(id),
  CHECK (patient_id IS NOT NULL OR prospect_last_name IS NOT NULL));
-- status, tx_status and contact_status values are the checkbox labels of the legacy Referral Management criteria
-- (legacy/refferal_reports.json); every printed column of the three grids binds to a column above.

-- DATA-42
CREATE TABLE ortho_visits (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, ortho_plan_id int NOT NULL REFERENCES ortho_plans(id), patient_id int NOT NULL,
  office_id int NOT NULL, visit_date date NOT NULL, visit_provider_id varchar(50), assistant_user_id int REFERENCES users(id),
  appointment_id varchar(50), charge_id varchar(50),
  upper_archwire varchar(60), lower_archwire varchar(60),        -- Ortho Daily Journal UAW / LAW
  compliance_code varchar(20), oral_hygiene_code varchar(20), elastics varchar(60), appliance varchar(60),
  notes text, created_by int REFERENCES users(id), created_at timestamp NOT NULL DEFAULT now());
ALTER TABLE ortho_plans ADD COLUMN contract_status varchar(16), ADD COLUMN ortho_status_code varchar(20), ADD COLUMN debond_date date;

-- DATA-44
ALTER TABLE patients
  ADD COLUMN deleted_at timestamp, ADD COLUMN deleted_by int, ADD COLUMN inactivated_at timestamp, ADD COLUMN inactive_reason varchar(50),
  ADD COLUMN registration_source varchar(20),     -- staff | quick_save | appointnow | online_registration | import
  ADD COLUMN registration_status varchar(12),     -- placeholder | complete
  ADD COLUMN activated_at timestamp;              -- when a placeholder became a full record

-- DATA-49
CREATE TABLE claim_line_snapshots (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, claim_id varchar(50) NOT NULL REFERENCES insurance_claims(id),
  charge_id varchar(50) NOT NULL, tier varchar(12) NOT NULL, fee numeric(12,2) NOT NULL, estimate_amount numeric(12,2) NOT NULL,
  writeoff_estimate numeric(12,2) NOT NULL, patient_portion numeric(12,2) NOT NULL, created_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (claim_id, charge_id));

-- DATA-53 / DATA-54
ALTER TABLE accounts ADD COLUMN resp_party_type varchar(20);     -- code of definitions group RESP_PARTY_TYPE
--   UPDATE accounts a SET resp_party_type = coalesce(
--            (SELECT rp.resp_party_type FROM responsible_parties rp WHERE rp.id = a.primary_guarantor_party_id),
--            (SELECT rp.resp_party_type FROM responsible_parties rp
--             WHERE rp.tenant_id = a.tenant_id AND rp.legacy_id = a.legacy_key ORDER BY rp.id LIMIT 1),
--            'NONE')                              -- "No Type Defined"
--   WHERE a.resp_party_type IS NULL;
ALTER TABLE office_smart_assist_items ADD COLUMN consent_template_id int REFERENCES letter_templates(id);

-- DATA-39 / DATA-41 / DATA-43 / DATA-45 (column-only items)
ALTER TABLE treatment_plan_items ADD COLUMN office_id int;
ALTER TABLE treatment_plans ADD COLUMN is_deleted boolean NOT NULL DEFAULT false;
ALTER TABLE patient_recalls ADD COLUMN tenant_id int, ADD COLUMN appointment_id varchar(50),
  ADD COLUMN source varchar(12);                  -- engine | manual
ALTER TABLE appointments ADD COLUMN appointment_type_id int;             -- -> production_types
ALTER TABLE office_schedule_days ADD COLUMN effective_from date, ADD COLUMN effective_to date;
ALTER TABLE providers ADD COLUMN updated_at timestamp, ADD COLUMN license_state varchar(2),
  ADD COLUMN license_expires_on date, ADD COLUMN dea_expires_on date;
ALTER TABLE operatories ADD COLUMN operatory_type varchar(20);
```

DATA-46 repeats the `tenant_id` pattern of DATA-15 on the clinical tables. Every table follows the same conventions
(`tenant_id`, `office_id`, actor, UTC timestamp, office-local date). Acceptance for every item that serves a legacy
report is "every criterion **and every documented output column** of the report binds to a column"
(`research/legacy_report_outputs_*.md`), not criteria alone.

---

## 8. Indexes

Existing indexes are in `schema.sql` (the real set; client databases are restored from that dump [A]). No money table has
an index that leads with `office_id`, `provider_id`, a business date or `created_at` [V]. Statements below are exact;
names follow the Alembic convention `ix_<table>_<columns>` and collide with no existing name [V].

```sql
-- patient_procedures (about 1.37M rows [D])
CREATE INDEX CONCURRENTLY ix_patient_procedures_office_dos ON patient_procedures (office_id, date_of_service)
  INCLUDE (provider_id, hygienist_id, procedure_code, patient_id, fee, ucr_fee, insurance_estimate) WHERE NOT is_void;
CREATE INDEX CONCURRENTLY ix_patient_procedures_provider_dos ON patient_procedures (provider_id, date_of_service) WHERE NOT is_void;
CREATE INDEX CONCURRENTLY ix_patient_procedures_hygienist_dos ON patient_procedures (hygienist_id, date_of_service)
  WHERE hygienist_id IS NOT NULL AND NOT is_void;
CREATE INDEX CONCURRENTLY ix_patient_procedures_code_dos ON patient_procedures (procedure_code, date_of_service) WHERE NOT is_void;
CREATE INDEX CONCURRENTLY ix_patient_procedures_dos_patient ON patient_procedures (date_of_service, patient_id) WHERE NOT is_void;
CREATE INDEX CONCURRENTLY ix_patient_procedures_office_created_at ON patient_procedures (office_id, created_at);
CREATE INDEX CONCURRENTLY ix_patient_procedures_created_by_created_at ON patient_procedures (created_by, created_at);
CREATE INDEX CONCURRENTLY ix_patient_procedures_unbilled ON patient_procedures (office_id, date_of_service)
  WHERE claim_id IS NULL AND NOT is_void;
CREATE INDEX CONCURRENTLY ix_patient_procedures_appointment_id ON patient_procedures (appointment_id) WHERE appointment_id IS NOT NULL;
DROP INDEX CONCURRENTLY IF EXISTS idx_proc_patient_dos;          -- duplicate of ix_patient_procedures_patient_dos

-- patient_payments
CREATE INDEX CONCURRENTLY ix_patient_payments_office_date ON patient_payments (office_id, payment_date)
  INCLUDE (payment_type, payment_method, provider_id, patient_id, amount) WHERE NOT is_void;
CREATE INDEX CONCURRENTLY ix_patient_payments_payment_date ON patient_payments (payment_date) WHERE NOT is_void;
CREATE INDEX CONCURRENTLY ix_patient_payments_provider_date ON patient_payments (provider_id, payment_date) WHERE NOT is_void;
CREATE INDEX CONCURRENTLY ix_patient_payments_office_created_at ON patient_payments (office_id, created_at);
CREATE INDEX CONCURRENTLY ix_patient_payments_created_by_created_at ON patient_payments (created_by, created_at);
DROP INDEX CONCURRENTLY IF EXISTS idx_payment_patient_date;      -- duplicate of ix_patient_payments_patient_date

-- other money tables
CREATE INDEX CONCURRENTLY ix_patient_adjustments_office_date ON patient_adjustments (tenant_id, office_id, adjustment_date) WHERE NOT is_void;
CREATE INDEX CONCURRENTLY ix_patient_adjustments_type_date ON patient_adjustments (adjustment_type, adjustment_date) WHERE NOT is_void;
CREATE INDEX CONCURRENTLY ix_patient_refunds_office_date ON patient_refunds (tenant_id, office_id, refund_date) WHERE NOT is_void;
CREATE INDEX CONCURRENTLY ix_ledger_insurance_details_office_payment_date ON ledger_insurance_details (office_id, payment_date)
  WHERE NOT is_void AND legacy_ledger_id IS NULL;
CREATE INDEX CONCURRENTLY ix_ledger_insurance_details_patient_id ON ledger_insurance_details (patient_id);   -- declared in the model, absent from the dump
CREATE INDEX CONCURRENTLY ix_ledger_insurance_details_check_number ON ledger_insurance_details (check_number) WHERE check_number IS NOT NULL;
CREATE INDEX CONCURRENTLY ix_payment_allocations_claim_id ON payment_allocations (claim_id) WHERE claim_id IS NOT NULL;
DROP INDEX CONCURRENTLY IF EXISTS idx_alloc_proc;                -- duplicate of ix_payment_allocations_procedure_id
CREATE INDEX CONCURRENTLY ix_patient_plan_installments_ledger_id ON patient_plan_installments (ledger_id) WHERE ledger_id IS NOT NULL;
CREATE INDEX CONCURRENTLY ix_patient_plan_installments_due ON patient_plan_installments (periodic_date) WHERE NOT is_billed;
-- the same two indexes on patient_ins_payment_plans and patient_sec_ins_payment_plans

-- claims
CREATE INDEX CONCURRENTLY ix_insurance_claims_office_submitted ON insurance_claims (office_id, submitted_date);
CREATE INDEX CONCURRENTLY ix_insurance_claims_carrier_submitted ON insurance_claims (carrier_id, submitted_date);
CREATE INDEX CONCURRENTLY ix_insurance_claims_paid_date ON insurance_claims (paid_date);
CREATE INDEX CONCURRENTLY ix_insurance_claims_close_date ON insurance_claims (close_date);
CREATE INDEX CONCURRENTLY ix_insurance_claims_created_at ON insurance_claims (created_at);
CREATE INDEX CONCURRENTLY ix_insurance_claims_patient_dos ON insurance_claims (patient_id, date_of_service_from);
CREATE INDEX CONCURRENTLY ix_claim_submissions_created_at ON claim_submissions (created_at);

-- scheduling
CREATE INDEX CONCURRENTLY ix_appointments_office_date ON appointments (office_id, date)
  INCLUDE (provider_id, operatory_id, patient_id, duration, is_cancelled, is_missed, is_blocked, is_archived);
CREATE INDEX CONCURRENTLY ix_appointments_created_at ON appointments (created_at) WHERE legacy_id IS NULL;
CREATE INDEX CONCURRENTLY ix_appointments_created_by_created_at ON appointments (created_by, created_at);
CREATE INDEX CONCURRENTLY ix_appointment_procedures_procedure_code ON appointment_procedures (procedure_code);
CREATE INDEX CONCURRENTLY ix_sms_messages_appointment_id ON sms_messages (appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX CONCURRENTLY ix_time_clock_entries_office_clock_in ON time_clock_entries (office_id, clock_in);

-- patients, clinical, audit
CREATE INDEX CONCURRENTLY ix_patients_tenant_home_office_active ON patients (tenant_id, home_office_id) WHERE is_active;
CREATE INDEX CONCURRENTLY ix_patients_tenant_created_at ON patients (tenant_id, created_at);
CREATE INDEX CONCURRENTLY ix_patients_tenant_birthday ON patients (tenant_id, (extract(month FROM dob)), (extract(day FROM dob)));
CREATE INDEX CONCURRENTLY ix_patients_tenant_first_visit ON patients (tenant_id, first_visit);
CREATE INDEX CONCURRENTLY ix_patients_tenant_last_visit ON patients (tenant_id, last_visit);
CREATE INDEX CONCURRENTLY ix_referrals_tenant_legacy_id ON referrals (tenant_id, legacy_id);
CREATE INDEX CONCURRENTLY ix_treatment_plan_items_diagnosed_date ON treatment_plan_items (diagnosed_date) WHERE NOT is_archived;
CREATE INDEX CONCURRENTLY ix_treatment_plan_items_provider_id ON treatment_plan_items (provider_id);
CREATE INDEX CONCURRENTLY ix_treatment_plans_office_id ON treatment_plans (office_id);
CREATE INDEX CONCURRENTLY ix_progress_notes_note_date_patient ON progress_notes (note_date, patient_id) WHERE NOT is_deleted;
CREATE INDEX CONCURRENTLY ix_patient_recalls_office_due ON patient_recalls (office_id, due_date) WHERE is_active;
CREATE INDEX CONCURRENTLY ix_patient_insurance_plan_patient ON patient_insurance (ins_plan_id, patient_id) WHERE is_active;
CREATE INDEX CONCURRENTLY ix_audit_logs_tenant_created_at ON audit_logs (tenant_id, created_at);
CREATE INDEX CONCURRENTLY ix_audit_logs_resource_method_created ON audit_logs (resource_type, method, created_at);

-- lookups introduced by the datasets of section 2
CREATE INDEX CONCURRENTLY ix_patient_refunds_reversed ON patient_refunds (reversed_id)
  WHERE reversed_type = 'payment' AND NOT is_void;                          -- "payment reversed by a refund" test (2.10)
CREATE INDEX CONCURRENTLY ix_patient_refunds_source_payment_id ON patient_refunds (source_payment_id)
  WHERE source_payment_id IS NOT NULL;                                      -- refund_link (2.13)
CREATE INDEX CONCURRENTLY ix_insurance_claims_patient_claim_number ON insurance_claims (patient_id, claim_number);   -- claim family (2.20)
CREATE INDEX CONCURRENTLY ix_booking_requests_appointment_id ON booking_requests (appointment_id)
  WHERE appointment_id IS NOT NULL;                                         -- booking_source (2.15)
CREATE INDEX CONCURRENTLY ix_responsible_parties_tenant_legacy_id ON responsible_parties (tenant_id, legacy_id);     -- rpt_account_dim
CREATE INDEX CONCURRENTLY ix_patient_consents_patient_template ON patient_consents (patient_id, template_id, signed_at)
  WHERE NOT is_deleted;                                                     -- rpt_smart_assist_checks (P3)
```

Already present in the dump and relied on by section 2 [V]: `ix_fee_schedule_entries_schedule_code_date`
(`fee_schedule_id, procedure_code, effective_date DESC`), `idx_ledger_ins_proc` (`ledger_insurance_details.procedure_id`),
`ix_ledger_insurance_details_claim_id_is_void`, `idx_claim_patient_status` (`insurance_claims (patient_id, status)`).

After DATA-13 and DATA-15 the created-date and tenant paths get their final shape:
`(tenant_id, office_id, posting_date)` on `patient_procedures` and `patient_payments`, replacing the two
`..._office_created_at` indexes. The money indexes are partial on `NOT is_void` only (not on `is_archived`), so they
serve both archive policies.

| Step | How to build safely |
|---|---|
| Statement form | `CREATE INDEX CONCURRENTLY IF NOT EXISTS`; it takes no write-blocking lock but cannot run inside a transaction. `alembic/env.py` wraps every revision in `context.begin_transaction()` [V], so each statement goes inside `with op.get_context().autocommit_block():`. No revision in the repository uses `CONCURRENTLY` or `autocommit_block` yet [V]. |
| Where it runs | `alembic upgrade head` runs inside the deploy workflow before the new image rolls out [V]; an index revision therefore delays the deploy. Ship index revisions separately from code revisions, one table per revision, and run them as an operations step (same Alembic command, executed ahead of the release) on each client database. |
| Session settings | Alembic opens its own connection, so the application's 30 s `statement_timeout` (`app/db/session.py` [V]) does not apply; set `SET lock_timeout = '5s'` (fail fast on the short catalog lock and retry) and `SET maintenance_work_mem = '512MB'` at the start of the revision. |
| Failure handling | A failed concurrent build leaves an `INVALID` index. Each revision first runs `DROP INDEX CONCURRENTLY IF EXISTS <name>` when `pg_index.indisvalid` is false for that name, then creates; `downgrade` drops concurrently. |
| Long transactions | A concurrent build waits for transactions older than its start; application sessions idle in a transaction are killed after 60 s [V], reporting worker sessions must use the same limit. |
| Order and load | Largest tables first, off-hours, one index at a time; at about 1.4M rows each build is expected to take tens of seconds [I] — measure the first one and record size and duration. Run `ANALYZE <table>` afterwards. |
| Verification | `EXPLAIN (ANALYZE, BUFFERS)` of five reference queries (production by office and month; collections by office and day; journal by user and created date; outstanding claims by carrier; appointments by office and day) before and after; keep the plans in the pull request. |
| Model parity | Declare each index in the SQLAlchemy model (`postgresql_where`, `postgresql_include`) so Alembic autogenerate does not propose dropping it; the SQLite test schema ignores both options. |
| New client databases | They are restored from the schema dump and then migrated [A]; on empty tables the same revisions finish instantly. Refresh the dump after the index release. |
| Back-fill of new NOT NULL columns | Add the column nullable (metadata-only); back-fill by primary-key ranges of 10,000-20,000 rows per transaction from a script or job, not from the deploy migration; add `CHECK (col IS NOT NULL) NOT VALID`, `VALIDATE CONSTRAINT`, then `SET NOT NULL` (PostgreSQL uses the validated check and skips the table scan) and drop the check. |

---

## 9. Roll-ups and snapshots (step B)

Step A views are always correct but scan; step B tables make dashboards, trailing-12-month grids and point-in-time
figures cheap and reproducible. Roll-ups keep sums and counts only (ratios are computed after summing); distinct counts
(patients seen, active patients) are never stored per day — they are counted from a patient-grain table at query time.
Every table carries `tenant_id` first and `era` where a caveat depends on it.

### 9.1 Tables

| Table | Grain | Columns (beyond the grain) | Source | Phase |
|---|---|---|---|---|
| `rpt_daily_production` | `date_basis` (`service`, `transaction`, `created`), `business_date`, `office_id`, `provider_id`, `hygienist_id`, `code_category`, `era` | `procedure_count`, `charged_production`, `gross_production`, `implied_writeoff`, `fee_above_office_fee`, `est_insurance`, `est_patient`, `unplanned_production`, `non_production_charges` | `rpt_charges` | P4 |
| `rpt_daily_adjustments` | `date_basis` (`service`, `transaction`, `created`), `business_date`, `office_id`, `provider_id`, `ledger_bucket`, `txn_side`, `txn_class`, `code`, `era` | `amount`, `entry_count`. The `service` basis uses `service_date_effective` (2.12), so net production by service date contains its adjustments | `rpt_ledger_entries` (adjustment legs) | P4 |
| `rpt_daily_collections` | `date_basis` (`transaction`, `payment`, `created`, `deposit`), `business_date`, `office_id`, `posting_office_id`, `provider_id` (credited), `payer`, `tender_class`, `deposit_group`, `code`, `counts_as_collection`, `collection_class_quality`, `era` | `amount` (sums only). **No payment count**: one cheque spans several rows of this grain, so `count(DISTINCT payment_group_key)` is computed from `rpt_payments` at query time | `rpt_payments` | P4 |
| `rpt_daily_allocated_collections` | `allocation_date`, `allocation_office_id`, `allocation_provider_id` (NULL = unassigned provider), `allocation_target`, `credit_entry_type`, `counts_as_collection`, `payer`, `service_month`, `is_derived` | `allocated_amount`. Gross versus total collection by provider reads `credit_entry_type` / `counts_as_collection`; Unallocated is the member `allocation_target = 'unallocated'` | `rpt_payment_allocations` | P4 |
| `rpt_daily_appointments` | `appointment_date`, `office_id`, `provider_id`, `provider_kind` | one count per `status_class`, `kept_count`, `new_patient_count`, `booked_minutes`, `scheduled_fee`, `appointments_without_lines` | `rpt_appointment_facts` | P4 |
| `rpt_daily_visits` | `visit_date`, `office_id`, `primary_provider_id` | `visit_count`, `new_patient_visit_count`, `charged_production` — one row of `rpt_visits` counted once, so the counts are additive across offices and providers (practice totals, doctor / hygiene splits) | `rpt_visits`, `rpt_patient_activity` | P4 |
| `rpt_daily_provider_visits` | `visit_date`, `office_id`, `provider_id` | `provider_visit_count`, `procedure_count`, `charged_production`, `gross_production` — every provider who charged a visit code that day; a patient-day shared by two providers is in both rows, so the table serves provider filters and provider dashboards and is never summed across providers (distinct patients are counted from `rpt_provider_visits` at query time) | `rpt_provider_visits` | P4 |
| `rpt_patient_activity_summary` | `patient_id` | the columns of 2.19 | `rpt_patient_activity` | P4 |
| `rpt_ar_snapshot` | `snapshot_date`, `snapshot_kind` (`daily`, `month_end`, `day_close`, `period_lock`), `attribution` (`transaction_office` = unit `account_office`, `home_office` = unit `account`), `office_id`, `bucket_set`, `bucket_key` (a bucket, or `credit`) | `open_amount`, `open_insurance_est`, `open_patient`, `account_count` — both units are snapshotted | `rpt_ar_open_items()` | P2 |
| `rpt_ar_snapshot_accounts` | `snapshot_date` (month ends and lock dates only), `snapshot_kind`, `account_id` | `home_office_id`, the five legacy buckets, their insurance / patient split, `credit_amount`, `total_balance` | `rpt_ar_open_items()` unit `account` | P2 |
| `rpt_day_close_snapshot` | `office_id`, `business_date`, `day_close_id` | control totals: production, adjustments by side, collections by deposit group, opening and closing A/R; `report_run_id` of the stored day sheet (run storage is owned by `02_architecture.md`) | `rpt_ledger_entries` at close | P2 |
| `rpt_scheduled_production_snapshot` | `snapshot_date`, `appointment_date`, `office_id`, `provider_id` | `scheduled_fee`, `appointment_count`, `line_count` — taken at the start of each office day for that day and the next 30 days | `rpt_appointment_procedures` | P4 |
| `rpt_metric_values` | `metric_key`, `metric_version`, `settings_version`, `period_grain` (`day`, `month`), `period_start`, `office_id` (0 = organisation), `provider_id` ('' = all), `member_key`, `snapshot_kind` (`live`, `day_end`, `month_end`, `period_lock`) | `value`, `numerator`, `denominator`, `computed_at`, `is_restated` | metric registry (`05_metric_catalog.md` owns the keys) | P2 |
| `rpt_derived_allocations` | credit leg x debit leg, as of today, unit `account` (2.13) | the complete output of `rpt_fifo_allocations()` plus leg attributes and `allocation_target` | `rpt_fifo_allocations()` | P2 |

Keys and DDL of the P2 tables are in section 7 (DATA-26, DATA-30). `rpt_ar_snapshot_accounts` is the frozen ageing
detail: about 61k accounts [D] x 12 month ends is under a million rows a year; daily A/R is kept only at office and
bucket grain. `rpt_metric_values` exists because point-in-time KPIs (pre-appointment %, unscheduled treatment, A/R days,
scheduled production at the start of the day) cannot be recomputed later (`research/dental_kpi_dictionary.md` gaps).

### 9.2 Refresh design

```sql
CREATE TABLE rpt_refresh_log (
  id bigserial PRIMARY KEY, tenant_id int NOT NULL, object_name varchar(60) NOT NULL,
  refresh_kind varchar(10) NOT NULL,              -- full | slice | snapshot
  started_at timestamp NOT NULL, finished_at timestamp, status varchar(10) NOT NULL,   -- running | ok | failed
  rows_written bigint, slices_processed int, error text);
CREATE TABLE rpt_dirty_keys (
  id bigserial PRIMARY KEY, tenant_id int, key_kind varchar(16) NOT NULL,   -- office_date | account | patient
  office_id int, business_date date, entity_id int, marked_at timestamp NOT NULL DEFAULT now());
CREATE UNIQUE INDEX uq_rpt_dirty_keys ON rpt_dirty_keys
  (key_kind, coalesce(office_id, 0), coalesce(business_date, DATE '1900-01-01'), coalesce(entity_id, 0));
CREATE VIEW rpt_freshness AS                      -- the "data as of" stamp printed by the engine
SELECT l.tenant_id, l.object_name, max(l.finished_at) FILTER (WHERE l.refresh_kind = 'full' AND l.status = 'ok') AS last_full_at,
       max(l.finished_at) FILTER (WHERE l.status = 'ok') AS last_refresh_at,
       (SELECT count(*) FROM rpt_dirty_keys k WHERE k.tenant_id = l.tenant_id) AS pending_keys
FROM rpt_refresh_log l GROUP BY l.tenant_id, l.object_name;
```

| Mechanism | Design |
|---|---|
| Nightly full rebuild | per client database, after midnight in the latest office time zone: for each roll-up, `DELETE` the tenant's rows and `INSERT ... SELECT` from the step A object inside one transaction (readers keep the previous rows until commit), then `ANALYZE`; one `rpt_refresh_log` row per object. Volumes (about 1.4M charges, 1.3M payments [D]) make a full rebuild a matter of minutes at most [I] — measure on production-size data before committing; fall back to a trailing 400-day rebuild plus a weekly full one if it is not. |
| Touched slices during the day | row-level `AFTER INSERT OR UPDATE OR DELETE` triggers insert into `rpt_dirty_keys` (`ON CONFLICT DO NOTHING`): `office_date` for the old and the new (`office_id`, each date column), `account` and `patient` for the affected account and patient — always for the **old and the new** value of the key. Tables: the money rows `patient_procedures`, `patient_payments`, `patient_adjustments`, `patient_refunds`, `ledger_insurance_details`, `capitation_payments`; `payment_allocations` (a split is deleted and re-inserted, which changes allocations and ageing without touching a money row [V] `billing_service.py` L125-129); `patient_opening_balances` (the upsert moves A/R [V] `patient_intake_service.py` L71-95); `patients` on change of `account_id` or `home_office_id` (both accounts, and the patient); `accounts` on change of `home_office_id`; `insurance_claims` on change of `status`, `is_active`, `close_date` (the insurance / patient split of ageing, for the claim's patient and account); `appointments`, `appointment_procedures`. A worker tick (every 5 minutes; scheduling is owned by `02_architecture.md`) claims keys with `DELETE ... RETURNING` and, per slice, deletes and re-inserts that slice of every roll-up — and per `account` key the rows of `rpt_derived_allocations` — in one transaction. |
| Why triggers | money rows are written by the generic CRUD engine, at least six services, scripts and raw SQL [A]; no single service hook sees them all. An `updated_at` watermark does not work: `patient_adjustments` and `insurance_claims` have no `updated_at` [V] and a void is an in-place update. These would be the first triggers in the schema [A]; bulk loads switch them off with `SET LOCAL rpt.skip_dirty = 'on'`, which the trigger function checks. |
| Freshness | a response built from roll-ups carries `data_as_of` = `rpt_freshness.last_refresh_at` and the pending-key count; a response built from views is live. Tiles for "today so far" read the views for the office's today and the roll-ups for earlier dates. |
| Snapshots | `rpt_ar_snapshot` daily rows are written by the nightly job for the previous office day, for both allocation units; `month_end`, `day_close` and `period_lock` rows are written by the close action (DATA-29) and never rewritten — enforced by the primary keys and the insert-only trigger of section 7. `rpt_metric_values` `live` rows are overwritten nightly; `day_end`, `month_end` and `period_lock` rows are frozen. |
| Control totals | after each full rebuild the job compares every roll-up with its view per office and month (invariant R-16) and writes the result to `rpt_data_quality`; a mismatch fails the refresh and keeps the previous rows. |

### 9.3 Back-dated edits, voids and definition changes

| Event | Handling |
|---|---|
| Edit or void of a row in an open period | the trigger marks the old and the new slice; both are recomputed within one tick; the nightly rebuild is the safety net |
| Back-dated insert (a `transaction_date` or `service_date` in the past, open period) | the past slice is marked and recomputed; month-to-date and prior-month roll-up figures move, and the report header says "open period — live figures" |
| Write into a closed day or locked period (after DATA-29) | rejected by the write guard. An override by an administrator writes an audit row and marks the slice; the roll-up is recomputed, the frozen snapshot is not, and the difference is stored in `rpt_snapshot_variances` (`snapshot_kind`, `office_id`, `business_date`, `measure`, `frozen_value`, `live_value`, `detected_at`) and listed on a post-close corrections report |
| Guarantor or account change of a patient; account merge | the trigger on `patients.account_id` marks the old and the new account; allocations and A/R of both are rebuilt. Every leg of the patient — charges, payments, adjustments, refunds — moves to the new account together, because every dataset uses current membership (5.3); nothing is left behind on the old account unless the service wrote a transfer pair. Frozen snapshots keep the membership of their date |
| New version of a transaction code or code group | classification changes from the version's `valid_from`; a full rebuild from that date; frozen `rpt_metric_values` rows keep their `metric_version` and are not restated, live rows get `is_restated = true` |
| Hard delete (plans, referrals) | no trigger key is needed for roll-ups that do not read them; the nightly rebuild removes the rows |
| Before day close exists (P0-P1) | no figure is frozen; every period is live and labelled so |

---

## 10. Reconciliation invariants and tests

Each invariant is a test on a PostgreSQL fixture and a nightly control query on real data whose result is stored in
`rpt_data_quality` under `inv_<id>` (DATA-09). `:t` = tenant. Fixture content: both eras; negative and positive migrated
payments under both sign policies; `A` rows; archive rows; remittances; a charge with more links than its fee (patient
prepaid by split, carrier paid later; primary plus secondary); refunds with and without a source payment; a payment
reversed with a refund; system and user-posted transfers, paired and one-legged; opening balances by table and by code;
a guarantor change with and without the balance, and an account merge; the vendor's two-office examples (charge at A,
payment at B); a persisted unallocated remainder beside an open insurance portion; contract billing; a capitation
payment; two offices in different time zones; two tenants.

| Id | Invariant | Query sketch |
|---|---|---|
| R-01 | Every source row is in the ledger exactly once | `SELECT count(*), sum(fee) FROM patient_procedures pp JOIN patients p ON p.id = pp.patient_id WHERE p.tenant_id = :t AND NOT pp.is_void AND (NOT pp.is_archived OR :include_legacy_archive)` = `SELECT count(*), sum(amount) FROM rpt_ledger_entries WHERE tenant_id = :t AND entry_type = 'charge'`, with `:include_legacy_archive` = the tenant's policy (the view follows it); the same pair per leg (`patient_payments` by `payment_type`, counting a void payment that a refund reverses; `patient_adjustments`; non-void app `ledger_insurance_details` paid and adjust sums; `patient_refunds`; opening buckets; capitation rows twice). Uniqueness: `SELECT count(*) = count(DISTINCT entry_id) FROM rpt_ledger_entries_all WHERE tenant_id = :t` — a row-multiplying join fails here |
| R-02 | Ledger balance = on-screen balance | **Preconditions**: `legacy_positive_payment_policy = 'credit'` and `legacy_archive_policy = 'exclude'` (the screen behaviour), and section 6 #29 = 0. Before DATA-07, per sampled patient: `sum(amount) - sum(amount) FILTER (WHERE source_table IN ('patient_adjustments', 'ledger_insurance_details'))` over `rpt_ledger_entries` = `balance_service.patient_balance_core().balance` (that formula omits both stores [V]). After DATA-07 the screens read the layer and take the same policies: `GET /patients/{id}/balance` `.balance` = `sum(amount)` exactly, for every patient and every policy value |
| R-03 | Account balance = sum of its current members | `SELECT count(*) FROM rpt_ledger_entries e JOIN patients p ON p.id = e.patient_id WHERE e.tenant_id = :t AND e.account_id IS DISTINCT FROM p.account_id` = 0 (every leg — debit and credit — carries the patient's current account); hence `sum(amount) GROUP BY account_id` = the sum of the member balances = `GET /patients/{id}/account-balance` (after DATA-07; before it, less the two omitted stores). Fixture: after a guarantor change with the default `move_open_balance = true` the new account holds the patient's charges **and** payments and the old account is unchanged for its remaining members |
| R-04 | Roll-forward | for any scope and `D1 < D2`: `sum(amount) FILTER (WHERE transaction_date <= D2) - sum(amount) FILTER (WHERE transaction_date <= D1)` = `sum(amount) FILTER (WHERE transaction_date > D1 AND transaction_date <= D2)`; tested on report and roll-up output (closing A/R = opening A/R + charges + debit adjustments - credit adjustments - payments), for the organisation **and for every office** |
| R-05 | Aged A/R total = A/R | for both units: `SELECT sum(open_amount) FROM rpt_ar_open_items(:t, :d, NULL, :unit)` = `SELECT sum(amount) FROM rpt_ledger_entries WHERE tenant_id = :t AND patient_id IS NOT NULL AND transaction_date <= :d`; open debits (all positive) plus unallocated credits (negative) = net A/R. Legs without a patient net to zero per capitation payment |
| R-06 | Allocations conserve money | per credit leg: `SELECT credit_entry_id, sum(amount) FROM rpt_fifo_allocations(:t, NULL, :d) GROUP BY 1` (unallocated rows included) = `-amount` of that leg; per debit leg the allocated sum is `<=` the debit and `debit - allocated` = its `open_amount`; `method = 'unallocated'` total = `-sum(open_amount) FILTER (WHERE item_kind = 'unallocated_credit')`. The over-linked fixture charge (fee 800, split 800, carrier 400) yields allocated 800, free credit 400, balance `-400` |
| R-07 | Production by provider = production by office = total | `SELECT sum(x) FROM (SELECT provider_id, sum(charged_fee) x FROM rpt_charges WHERE tenant_id = :t AND is_production AND service_date BETWEEN :a AND :b GROUP BY 1) s` = the same grouped by `office_id` = the ungrouped sum; no row has a NULL provider or office (`NOT NULL` columns [V]) |
| R-08 | Parts sum to the total | production: the R-07 sum grouped by `rpt_provider_dim.production_group` has exactly the three members and adds up. Collections: for payment credits (`credit_ledger_bucket = 'collection'`) in `rpt_payment_allocations`, `sum(amount)` by provider over targets `production`, `non_production_charge`, `debit_adjustment` + target `unallocated` + target `refund` + targets `opening_balance`, `transfer` = `-sum(amount)` of those payments in `rpt_payments` |
| R-09 | Day sheet ties to the ledger and to the deposit | ledger: for an office and day, day-sheet collections = `SELECT -sum(amount) FROM rpt_payments WHERE office_id = :o AND transaction_date = :d AND counts_as_collection`; by `deposit_group` the parts add up to it. Deposit (after DATA-28), on the **posting office**: `sum(deposit_items.amount)` + undeposited = `-sum(amount)` of `rpt_payments` with `coalesce(posting_office_id, office_id) = :o` for those dates; each payment is on at most one deposit (unique constraints). The Deposit Slip is defined on the same office expression |
| R-10a | System balance transfers net to zero (**gate**) | per `account_payment_id` of `patient_payments` rows with `payment_method = 'balance_transfer'`: `sum(amount)` = 0 (the service writes both legs in one transaction [V] `family_account_service.py` L612-634) |
| R-10b | User-posted transfers pair off (**control, not a gate**) | `sum(amount)` of `is_transfer` legs without `account_payment_id`, per account and month = 0; the rows of section 6 #39 are an exception list for the office. Codes `AC010` / `AD010`, `AR010` / `AI010` are keyed one leg at a time into two stores (the sign decides the store [V] `FE:AdjustmentsTab.tsx` L133-166), so a data-entry gap must not block reports. Migrated transfers are unclassified and outside both tests |
| R-11 | Claim paid = legacy baseline + remittances | `insurance_claims.total_paid` = `coalesce(opening_paid, 0) + (SELECT sum(paid_amount) FROM rpt_remittance_lines WHERE claim_id = c.id AND NOT is_void)`; ledger `rpay` legs by claim = `total_paid - opening_paid`. Holds once `_sum_coverage` ignores migrated rows (`legacy_ledger_id IS NULL`, DATA-31); before that the service sums every non-void row of the claim [V] `billing_service.py` L229-241, so the test compares against all non-void rows on both sides |
| R-12 | No insurance money is counted twice | no `rpay` / `rwo` leg has a migrated source (`legacy_ledger_id IS NULL` by construction); section 6 #5 and #7 (all four parts) return nothing |
| R-13 | Classification is complete | `SELECT era, ledger_bucket, count(*) FROM rpt_ledger_entries WHERE tenant_id = :t GROUP BY 1, 2`: no NULL bucket and no value outside the ten; `unclassified_adjustment` is 0 for `era = 'app'`; its migrated share and the `assumed` share of collections are printed on affected reports |
| R-14 | Both office attributions sum to the organisation | credits included: `rpt_ar_open_items(..., 'account_office')` summed over `unit_office_id` (NULL included) = `rpt_ar_open_items(..., 'account')` summed over `home_office_id` = the R-05 total |
| R-14b | Transaction-office ageing = office ledger balance | for every office `:o`: `SELECT sum(open_amount) FROM rpt_ar_open_items(:t, :d, NULL, 'account_office') WHERE unit_office_id IS NOT DISTINCT FROM :o` = `SELECT sum(amount) FROM rpt_ledger_entries WHERE tenant_id = :t AND patient_id IS NOT NULL AND office_id IS NOT DISTINCT FROM :o AND transaction_date <= :d`. Fixture: charge 100 at A, payment 100 at B gives A = 100 open, B = 100 credit; charges 100 at A (older) and 100 at B with payment 100 at B give A = 100, B = 0 |
| R-15 | One status class per appointment | `SELECT count(*) FROM rpt_appointment_facts WHERE tenant_id = :t` = the sum of the counts by `status_class`; `is_deleted` and `is_legacy_archive` are never both true |
| R-16 | Roll-ups equal views | per office and month: `rpt_daily_production` sums = `rpt_charges` sums; same for collections, adjustments (each basis), appointments |
| R-17 | A frozen snapshot equals a recomputation that ignores later rows | `rpt_day_close_snapshot` control totals = the ledger sums for that office and day over the rows that were live at `closed_at`: `posted_at <= closed_at AND (NOT is_void OR voided_at > closed_at)` on `rpt_ledger_entries_all`. Needs `posted_at` (DATA-13) and `voided_at` (DATA-14); a difference exists only with a `rpt_snapshot_variances` row |
| R-18 | Statement balance = ledger | for statements **generated after DATA-07** (earlier ones were computed with the old formula: `patient_adjustments` in, remittances out [V] `statement_service.py` L105-127): `patient_statements.closing_balance` of an account statement = `sum(amount)` of that account with `transaction_date <= statement_date`, for accounts without an `account_change_events` row after the statement date |
| R-19 | Basis bridge | for a period: total by `transaction_date` - total by `service_date_effective` = `sum(amount)` of the legs whose two dates fall in different periods (the bridge report). Defined for every leg; identically zero for charges until DATA-13 stores a separate transaction date |
| R-20 | Estimate split | on every charge `est_patient + est_insurance = charged_fee` (by construction); rows whose `patient_estimate_stored` differs from `est_patient` are reported |
| R-21 | The migrated ledger reproduces Denticon's control totals | per office: `sum(amount)` of `rpt_ledger_entries` with `era = 'migrated'` and `transaction_date <= :cutover` = the A/R total of Denticon's Aging Report by Home Office with credit balances (grouped by the account's home office); per office and month: charges, payments and adjustments = the Executive Day Sheet totals, for the months recorded in `rpt_data_quality` (`legacy_control_*`, section 6). The only invariant with an external reference — every other one passes on an incomplete ledger |
| R-22 | Fee identity | on every charge: `office_fee - implied_writeoff + fee_above_office_fee = charged_fee`; hence gross production - implied write-offs + fees above UCR = charged production for any scope |

Financial reports ship only when R-01 to R-06, R-10a, R-12, R-13 and R-14b pass on the client database (AD-10), and R-21
passes — or is waived by the product owner with the measured gap, which is then printed on every financial report that
touches migrated periods. R-10b, R-18 and R-20 are controls with exception lists, not gates.

---

## 11. Legacy coverage matrix and reference dashboard coverage

### 11.1 Legacy reports

Rating of the report's **default run** — the legacy default of every criterion, named in the column "Default basis /
mode": **READY** = computable from current data once the P0 datasets exist; **REPAIR(n)** = needs repair DATA-n of
migrated data; **SCHEMA(n)** = needs new schema DATA-n; **APP** = meaningful only for data created in the app (no
migrated history can exist). DATA-03 to DATA-07 are assumed throughout, so no row is rated on them; where a code flag or
a catalog value must first be filled in setup the last column says so. The last column lists what a specific option or
the history additionally needs. For the five reports whose list-type or `REPORT BY` selector changes the dataset, every
mode has its own line (43a, 43b, ...): the report's rating is that of its default mode (the `a` line) and only that
line enters the totals. Dataset names are written without the `rpt_` prefix; names in backticks are OLTP tables read
through a passthrough dataset. A report that ships in an earlier phase than one of its datasets (for example the Routing
Slip's recall and benefit blocks in P1) reads that block from the existing per-patient service and switches to the
dataset when it lands. `SCHEMA(53)` in the last column marks the ten criteria screens that filter or print the
responsible-party type (and the Routing Slip field `Billing Type`).

**Daily Reports**

| # | Report | Default basis / mode | Datasets | Rating | Options / history that need more |
|---|---|---|---|---|---|
| 1 | Peg Board Day Sheet | transaction date | ledger_entries, patient_dim, account_dim | READY | previous and new balance are ledger sums as of the day; a frozen sheet: SCHEMA(29) |
| 2 | Daily Journal | Detail; Transaction Date | ledger_entries (`journal_column`), charges, patient_dim, account_dim, user_dim, transaction_code_dim | READY | Created Date basis and User on history: REPAIR(10); Include Resp. Party Type: SCHEMA(53); code-level lines for migrated payments and adjustments: REPAIR(12) |
| 3 | Production Report | Production by Code | charges, adjustments, procedure_code_dim, provider_dim, claim_facts, insurance_coverage, fee_schedule_fees | READY | Include UCR + Fee Schedule To Compare: fee_schedule_fees; production-adjustment list on history: REPAIR(12); by Carrier: REPAIR(10) for history, SCHEMA(33) for unbilled lines; duration units on history: REPAIR(10) |
| 4 | Collection Report | transaction date | payments, adjustments, payment_allocations | READY | "by Provider" = the provider on the payment line; by Code uses derived allocations (P2); by Carrier: APP (remittances), SCHEMA(33) otherwise; payment-type picker on history: REPAIR(12) |
| 5 | Deposit Slip | Transaction Date; Cash | payments (posting office), transaction_code_dim | READY | Payment Date basis: SCHEMA(13) — until then both options select the same rows and the report says so; history has four tender values and no card brand: REPAIR(12); Group Batch Checks and a deposit date: SCHEMA(28) |
| 6 | Scheduled Production | appointment date | appointment_facts, appointment_procedures, charges | APP | migrated booked lines cover 6 % of appointments [D]; "Estimated Prod.": SCHEMA(24) |
| 7 | Routing Slip | one slip per appointment | appointment_facts, patient_dim, patient_activity, account_dim, ar_open_items, insurance_coverage, benefit_usage, recall_due, contract_installments, treatment_item_facts, patient_alerts, referral_facts, `patient_notes`, `provider_route_slips` | READY | `Med Alerts` / `Flash Alerts`: patient_alerts (clinical class); `Billing Type`: SCHEMA(53); first / last visit: REPAIR(19); last statement date: SCHEMA(22); recall block is derived (maintained rows: SCHEMA(41)); ortho block: APP |
| 8 | Progress Notes | Detail; DOS Date | progress_note_facts, appointment_note_audit, patient_dim | READY | Unsigned: APP (every migrated note is unsigned); Missing = a live appointment without a note on its day (no code flag is involved), exact per appointment and provider: SCHEMA(18) |
| 9 | Production Analysis Report | service date | charges, procedure_code_dim, provider_dim, claim_facts, payments | READY | Carrier variant: REPAIR(10), SCHEMA(33); collection per carrier: APP |
| 10 | Daily Audit | PATIENT HAS = ALL | visit_audit | READY | `PROVIDER` and `GROUP BY Provider` read the provider arrays; the visit-code flags are reviewed in setup (DATA-04); signed-note test: APP |
| 11 | Claims Printed | print date | claim_facts, `claim_print_events` | SCHEMA(21) | prints are not recorded today; APP afterwards |
| 12 | Special Transaction Report | Transaction Date | ledger_entries, charges, insurance_coverage (`reporting_subtype`), patient_dim | READY | payment / adjustment codes on history: REPAIR(12); Service vs Transaction date on charges: SCHEMA(13); insurance-plan grouping uses today's coverage until SCHEMA(33) |

**Monthly Reports**

| # | Report | Default basis / mode | Datasets | Rating | Options / history that need more |
|---|---|---|---|---|---|
| 13 | Executive Summary | date range; by office | charges, ledger_entries, visits, provider_visits, appointment_facts, patient_activity, patient_dim, provider_dim, ar_open_items | READY | `GROUP BY Provider`: provider_visits; Procedures Done / Non visit code transactions: `is_ledger_code`, `is_visit_code` (reviewed in setup); "New Patients" by created date does not exist for migrated patients; chair hours use `is_kept`; A/R per office = unit `account_office` |
| 14 | Executive Day Sheet | transaction date | ledger_entries (`journal_column`), transaction_code_dim | READY | one row per code on history: REPAIR(12) (migrated adjustments print as unclassified) |
| 15 | Aging Report by Home Office | Detail; report date | ar_open_items (unit `account`), account_dim, patient_dim, patient_activity, contract_installments | READY | derived oldest-first; Ins / Pat split and names on history: REPAIR(10); Exclude Resp. Party Type: SCHEMA(53); Balance Status: SCHEMA(35); Last Statement Date: SCHEMA(22); a past report date reproduces only with SCHEMA(30); completeness of migrated A/R: REPAIR(57) |
| 16 | Aging Report | Detail; report date | ar_open_items (unit `account_office`), same dimensions | READY | as 15; each office ties to its ledger balance (R-14b) |
| 17 | Income Allocation | allocation date | payment_allocations, ledger_entries, provider_dim | READY | derived for history (legacy prints are not reproducible line by line); on derived rows the `Unallocated` row equals the credit balances; real allocations: SCHEMA(26); `is_income` on history: REPAIR(12); entry-date basis on history: REPAIR(10) |
| 18 | Allocation Detail | allocation date | payment_allocations, payments | READY | derived; payment-type sections on history: REPAIR(12) |
| 19 | Unallocated Payment/Adjustments | as of today | payment_allocations, account_dim, patient_dim | SCHEMA(26) | meaningful only on persisted allocations (APP from DATA-26): on derived rows it equals the credit-balance list and `Exclude Credit Balances` returns nothing; not reproducible for migrated history |
| 20 | Daily Journal Summary by Allocation | transaction date | ledger_entries, payment_allocations | READY | derived; no legacy output sample exists |
| 21 | WaterFall Report | service month | payment_allocations, charges | READY | derived |

**Ledger Reports**

| # | Report | Default basis / mode | Datasets | Rating | Options / history that need more |
|---|---|---|---|---|---|
| 22 | Ledger Report | Account Ledger | ledger_entries (`_all` for voided rows), claim_facts, account_dim, `patient_statements`, `account_notes` | READY | "Print all transactions": statement lines from `patient_statements` (APP), ledger-note lines from `account_notes` (migrated rows exist) |
| 23 | Super Bill | one visit | ledger_entries, charges, office_dim, provider_dim | READY | — |
| 24 | Walkout Report | one visit | ledger_entries, ar_open_items, contract_installments, appointment_facts, account_dim | READY | contract balances: APP |
| 25 | Account Allocation | one account | fifo_allocations (one account) | READY | derived for history |

**Management Reports**

| # | Report | Default basis / mode | Datasets | Rating | Options / history that need more |
|---|---|---|---|---|---|
| 26 | Payment Plan Charges | billing date | contract_installments, payment_plan_contracts | APP | no contract was migrated |
| 27 | Uncollected Copay | appointment date | appointment_facts, charges, payments, ledger_entries, account_dim | READY | patient portion is derived on history |
| 28 | Audit Trail | updated date; all types | audit_events | APP | nothing predates the migration; Close out: SCHEMA(29); exact Reschedule and Cut / Copy-Paste: SCHEMA(17); before / after of charges and the `Pat Amt` / `Ins Amt` columns: SCHEMA(14) |
| 29 | Time Clock Report | pay period | time_clock (existing `build_report`) | READY | legacy punches are wall-clock values (handled) |

**Insurance Reports**

| # | Report | Default basis / mode | Datasets | Rating | Options / history that need more |
|---|---|---|---|---|---|
| 30 | Claims List | claims generated (created) in the range | claim_facts, patient_dim | APP | the range is the claim's created date, which was not loaded for migrated claims (as 32); service dates and estimate on history: REPAIR(10); carrier / plan and status mapping: REPAIR(32); EClaim / Paper per claim: SCHEMA(21) (carrier default until then) |
| 31 | Capitation Utilization | Detail; transaction date | charges, insurance_coverage, procedure_code_dim, fee_schedule_fees | REPAIR(32) | capitation plans are identifiable only after the prepaid code is decoded; `Co - Pay` / `Sup. Fee.` and Fee Schedule To Compare: fee_schedule_fees; payer on the charge: SCHEMA(33); "Facility ID" is free text printed in the header |
| 32 | Claims Created Not Sent | created date | claim_facts | APP | the created date of migrated claims is the load time; mis-mapped statuses: REPAIR(32) |
| 33 | Procedures on Hold | — | charges | READY | — |
| 34 | DPS Eligibility Report | appointment date | appointment_facts, insurance_coverage | READY | current stamp only; history, verify type and "On Hold": SCHEMA(34); migrated stamps are `unknown` |
| 35 | Capitation Payment | payment date | payments (`cap` legs), `capitation_payments` | SCHEMA(38) | a carrier-level payment has no patient and no table today; APP afterwards |
| 36 | Benefits Used/Unused | Treatment Plan mode | benefit_usage, insurance_coverage, treatment_item_facts, recall_due, account_dim | REPAIR(32) | plan limits and tiers; the four family columns are stored snapshots; pending treatment: APP; Recall mode: recall_due; Exclude Responsible Party Type: SCHEMA(53) |
| 37 | Outstanding Claims | Report Date = today | claim_facts | REPAIR(32) | a migrated claim counts only while submitted or pending, and closed claims may sit in `draft` until the legacy status codes are confirmed (section 6 #15); estimate on history: REPAIR(10); a past Report Date: SCHEMA(31), exact from the start of DATA-25 capture |
| 38 | Claims Not Created | REPORT DATE = ALL; Primary | unclaimed_charge_tiers, charges, insurance_coverage | APP | the bill tier of app charges is derived until SCHEMA(33); history: REPAIR(10) for claim links and REPAIR(12) for the `DD` / `DDD` depth; DOS vs Transaction date: SCHEMA(13); coverage is today's |
| 39 | Unbilled Report Due to No Insurance | date range | charges (`bill_tier = 'none'`), insurance_coverage | READY | the billing order was migrated; app rows use the derived tier until SCHEMA(33); coverage is today's, not on the service date |
| 40 | EOB 835 Claims Reconcile Report | By Payment Date | `era_files`, `era_claim_payments` | SCHEMA(38) | needs ERA ingestion from a clearinghouse (outside this module) |
| 41 | 835 Denial Report | Excel detail | `era_claim_payments`, `era_adjustments` | SCHEMA(38) | same; claim-level denial fields: SCHEMA(31) |
| 42 | RTE Sweep Details | created date | `eligibility_verifications` | SCHEMA(34) | needs a real-time eligibility integration |

**Appointment Reports**

| # | Report | Default basis / mode | Datasets | Rating | Options / history that need more |
|---|---|---|---|---|---|
| 43a | Appointment List | Confirmation Call List (default) | appointment_facts, patient_dim, account_dim, ledger_entries | READY | Include Patient Balance: ledger; Exclude Resp. Party Type: SCHEMA(53) |
| 43b | — | Call List | appointment_facts | SCHEMA(17) | `add_to_call_list` is not sent by the Scheduler today; "replaced" needs events |
| 43c | — | Pull Chart List | appointment_facts, patient_dim | READY | — |
| 43d | — | Cancelled List | appointment_facts | READY | prints `cancellation_reason` and `cancellation_note` where stored; the reason picker: SCHEMA(17) |
| 43e | — | Cancelled From Automated Campaigns | appointment_facts, `appointment_events` | SCHEMA(17) | cancel source and time are not stored |
| 43f | — | Missed List | appointment_facts | READY | — |
| 44 | Missed Appointments Not Marked As Missed | appointment date | appointment_facts | READY | Exclude Resp. Party Type: SCHEMA(53) |
| 45 | New Patients via Appointments | appointment date | appointment_facts (`is_placeholder_patient`, `is_patientless`), patient_dim | SCHEMA(44) | until `registration_status` exists the interim rule [I] of 2.7 over-counts; the new-patient flag is APP |
| 46 | Lab Report | appointment date | lab_cases | READY | Exclude Resp. Party Type: SCHEMA(53) |
| 47 | SmartAssist Report Card | Detail; appointment date | smart_assist_checks, appointment_facts | READY | consents, medical-history completion and eligibility stamps are APP; consent columns need the template mapping: SCHEMA(54); `Checked In By / Out By`: SCHEMA(17) |
| 48 | Appointments Confirmed Via Vendors | appointment date | appointment_facts, `appointment_events` | SCHEMA(17) | no vendor or confirmation channel is stored in either era |
| 49 | Appointment Time Stamps | appointment date | appointment_facts, `appointment_events` | SCHEMA(17) | only check-in and check-out stamps exist; `Available`, `In Operatory` and the three durations need events |
| 50 | Appointment Detail | Regular; Appointment Date; group by Provider | appointment_facts, appointment_procedures, user_dim, patient_dim, insurance_coverage | READY | Created On and User: APP; Only AppointNow: APP (`booking_requests` link), `Appoint Now API`: SCHEMA(17); cancellation reason: SCHEMA(17) |
| 51 | Lab Cost Report | appointment date | lab_cases | READY | Exclude Resp. Party Type: SCHEMA(53) |

**Treatment Plan Reports**

| # | Report | Default basis / mode | Datasets | Rating | Options / history that need more |
|---|---|---|---|---|---|
| 52 | Treatment Plan Proposal | one patient | treatment_item_facts, patient_dim, account_dim, benefit_usage | APP | benefits grid: the family columns are stored snapshots |
| 53 | Treatment Plan Status | diagnosed date; ALL | treatment_item_facts | APP | `Sts` of a scheduled or completed item = `exclusive_status` (inferred when the item was never booked); status as of a date: SCHEMA(25) |
| 54 | Treatment Plan Analysis | diagnosed date | treatment_item_facts | APP | — |
| 55 | Treatment Plan Detail | diagnosed date | treatment_item_facts | APP | — |

**Referral Reports**

| # | Report | Default basis / mode | Datasets | Rating | Options / history that need more |
|---|---|---|---|---|---|
| 56 | Referral Production List | date range | referral_facts (inbound), patient_dim, charges, payments, adjustments, patient_activity | READY | migrated patients only; app patients: SCHEMA(40); first-visit filter: REPAIR(19) |
| 57 | Referred Out List | date range | referral_facts (outbound) | APP | structured target and specialty: SCHEMA(40) |
| 58 | Referral Source List | — | `referrals` | READY | — |
| 59 | External Outgoing Referral Management | referral date | referral_facts (case), `referral_cases` | SCHEMA(40) | — |
| 60 | Referral Summary Report | date range | as 56 | READY | as 56 |
| 61 | Referral Count Summary | date range | as 56 | READY | as 56 |
| 62 | Internal Referral Management | referral date | referral_facts (case), `referral_cases` | SCHEMA(40) | items with status `internal_referral` exist (APP) without a case or `Tx Status` |
| 63 | External Incoming Referral Management | referral date | referral_facts (case), `referral_cases` | SCHEMA(40) | — |

**Recall Reports**

| # | Report | Default basis / mode | Datasets | Rating | Options / history that need more |
|---|---|---|---|---|---|
| 64 | Procedural Recall Report | procedure date | charges, procedure_code_dim, patient_dim, patient_alerts | READY | `Med. Alerts` column: patient_alerts (clinical class) |
| 65 | Scheduled Recall Report | scheduled date | recall_due, appointment_procedures, patient_dim | READY | derived; exact scheduling needs booked lines (app era in practice); preferred provider / hygienist are not migrated; maintained rows: SCHEMA(41) |
| 66 | Recall Due Report | Recall Date Range; ALL | recall_due, insurance_coverage | READY | derived; interval units to verify (section 6 #22); `No Recall Date` also lists patients without any recall |
| 67 | Post-Op Report | procedure date | charges, procedure_code_dim | READY | returns rows once the office flags its post-op codes: `procedure_codes.is_post_op` exists [V] and is false on every code (setup, not schema) |

**Ortho Reports**

| # | Report | Default basis / mode | Datasets | Rating | Options / history that need more |
|---|---|---|---|---|---|
| 68 | Ortho Compliance Report | as of today | ortho_contracts, patient_activity | APP | — |
| 69 | Ortho Daily Journal | visit date | ortho_contracts, `ortho_visits` | SCHEMA(42) | interim: charges with ortho codes (no archwire, compliance or hygiene fields) |
| 70 | Patients by Ortho Status with Time in Treatment | as of today | ortho_contracts | SCHEMA(42) | — |
| 71 | Ortho Report | ortho start date | ortho_contracts, patient_activity | SCHEMA(42) | — |
| 72 | Missing Ortho Visits | appointment date | appointment_facts, charges, `ortho_visits` | SCHEMA(42) | — |

**Statements**

| # | Report | Default basis / mode | Datasets | Rating | Options / history that need more |
|---|---|---|---|---|---|
| 73 | Statements | statement date | account_dim, ar_open_items (unit `account`), ledger_entries, claim_facts, contract_installments, `patient_statements` | SCHEMA(22) | run header and lock; Exclude Responsible Party Type: SCHEMA(53); the finance-charge run is a posting engine, not a dataset; "open claim" exclusion is READY |

**Lists > Patient**

| # | Report | Default basis / mode | Datasets | Rating | Options / history that need more |
|---|---|---|---|---|---|
| 74 | Patient List | Active | patient_dim, patient_activity | READY | `Title`, `Address` and the other printed columns are in patient_dim; provider criterion uses the derived last provider for migrated patients |
| 75a | Patient List - New Patient | Appointment (default) | appointment_facts, patient_dim | SCHEMA(44) | placeholders by the interim rule [I] until `registration_status` |
| 75b | — | Carrier | patient_activity, insurance_coverage | READY | today's coverage |
| 75c | — | Created Date / First Visit Date | patient_dim, patient_activity | READY | first-visit definition: derived, REPAIR(19); the created-date definition is APP |
| 75d | — | Referral | patient_activity, referral_facts | READY | app patients: SCHEMA(40) |
| 75e | — | Referral Type | patient_activity, referral_facts | READY | as 75d |
| 76a | Patients Seen | Day (default); Summary; Transaction Date | visits, provider_visits (with a `PROVIDER` filter) | READY | Transaction Date equals DOS Date until SCHEMA(13); visit-code flags reviewed in setup |
| 76b | — | by age | visits, patient_dim | READY | — |
| 76c | — | by medical alert | visits, patient_alerts | READY | clinical data class |
| 76d | — | by zip code | visits, patient_dim | READY | — |
| 77 | Patient's Notes | one patient; created date | `patient_notes`, `account_notes`, account_dim (`financial_notes`) | READY | on migrated notes the created date is the load time (their `note_date` is used where present) and the creating user is unknown |
| 78a | Patient List - Grouped By | Attached to Provider (default) | patient_dim, provider_dim, patient_activity | APP | no provider is attached to migrated patients; history uses the derived last-visit provider, labelled |
| 78b | — | Preferred Provider | patient_dim, provider_dim | APP | as 78a |
| 78c | — | Birthdate; Zip Code; Patient Type; Last Visit | patient_dim, patient_activity | READY | Last Visit: REPAIR(19) |
| 78d | — | Carrier; Employer; Insurance Plan; Uninsured | patient_dim, insurance_coverage | READY | today's coverage; tiers on history: REPAIR(32) |
| 78e | — | Fee Schedule; HIPAA Agreement | patient_dim | READY | — |
| 78f | — | Medical Alert | patient_dim, patient_alerts | READY | clinical data class |
| 79 | Patients on Payment Plan | Regular; setup date | payment_plan_contracts | APP | no contract was migrated |
| 80 | Online Registered Patients | created date | `booking_requests`, patient_dim | APP | a registration source on the patient: SCHEMA(44) |
| 81 | Update Patient Insurance (Conversion) List - By Appointment | appointment date | patient_dim (type `UP`), appointment_facts, insurance_coverage | READY | — |
| 82a | Responsible Party List | Created Date (default) | account_dim | REPAIR(10) | the created date of migrated accounts is the backfill time; Exclude Responsible Party Type: SCHEMA(53) |
| 82b | — | Balance; Balance Aged Over X Days | account_dim, ar_open_items (unit `account`) | READY | derived ageing |
| 82c | — | Resp. Party Type | account_dim | SCHEMA(53) | — |
| 82d | — | Send Statement Status; Zip | account_dim | READY | — |
| 83 | Responsible Party - Statements Sent | statement date | `patient_statements`, account_dim | APP | `statement_date`, `delivery_method`, `delivery_status`, `delivered_to`, `delivered_at` and `batch_id` exist [V]; no statement was migrated |
| 84 | Responsible Party - Sent to Collection | — | account_dim, ledger_entries | READY | the date sent: SCHEMA(35) |
| 85 | Responsible Party - Email Statement Error Report | statement sent date | `patient_statements` | SCHEMA(22) | `delivery_status` exists; the error text does not |

**Lists > Provider, Security, Setup**

| # | Report | Default basis / mode | Datasets | Rating | Options / history that need more |
|---|---|---|---|---|---|
| 86 | Provider List | — | provider_dim | READY | specialty and state are sparse |
| 87 | Provider Holidays | — | `provider_holidays` | READY | empty until configured |
| 88 | Provider Operatory | — | `operatories`, provider_dim | READY | — |
| 89 | Provider Registration | — | provider_dim (`npi`, `license`, `tax_id`, `dea_id`), `provider_insurance_ids` | READY | licence state and expiry: SCHEMA(45) |
| 90 | User List | — | user_dim (`email`, `phone`, `patient_access_level`, `group_names`) | READY | no login history exists |
| 91 | Group List | — | `user_groups` | READY | — |
| 92 | Group Rights List | — | `user_group_rights`, `permissions` | READY | — |
| 93 | User-Group Membership | — | `user_group_memberships`, user_dim, office_dim | READY | — |
| 94 | Employer List | — | `employers` | READY | — |
| 95 | Carrier List | — | `insurance_carriers` | READY | — |
| 96 | Insurance Plan List | — | `insurance_plans` | READY | creator / modifier are legacy strings |
| 97 | Inactive Plans List | — | `insurance_plans` | READY | — |
| 98 | Drug List | — | `prescription_library` | READY | user is NULL on migrated rows |
| 99 | Procedure Codes List | Both statuses | procedure_code_dim | READY | Tooth / Surface Required: existing columns; `PRODUCTION TYPE` and Bill to Insurance read the DATA-04 columns, empty until filled in setup |
| 100 | Procedure Codes by Fee Schedule | — | procedure_code_dim, fee_schedule_fees | READY | code type by the default rule until the flags are reviewed |
| 101 | Explosion Codes List | Summary | `explosion_codes`, `code_bundles` | READY | — |
| 102 | Credit Codes Report | TYPE = ALL; CLASS = ALL | transaction_code_dim (`legacy_class`, `legacy_sub_type`, `sign`) | READY | `CLASS` values beyond the seeded ones are confirmed against the legacy setup screen (O-2) |
| 103 | Fee Schedule List | — | `fee_schedules` | READY | — |
| 104 | Capitation Fee Schedule | — | fee_schedule_fees (`pricing_model = 'copay'`) | READY | — |
| 105 | Office List | — | office_dim | READY | — |
| 106 | Operatory List | — | `operatories` | READY | — |
| 107 | Office Holidays | — | `account_holidays` | READY | — |
| 108 | ADA Categories List | — | procedure_code_dim | READY | — |
| 109 | Document Types List | — | `definitions` (`document_type`) | READY | — |
| 110 | Notes Macros List | — | `note_macros` | READY | — |
| 111 | Default Ins Plan Coverage Category List | — | `definitions` (`DEFCOVERAGE`) | READY | where seeded |
| 112 | Notes Macro Category List | — | `definitions` (`NOTESMACROS`) | READY | — |
| 113 | Patient Types List | — | `definitions` (`patient_type`) | READY | — |

**My Reports**

| # | Report | Default basis / mode | Datasets | Rating | Options / history that need more |
|---|---|---|---|---|---|
| 114 | Daily Journal | Transaction Date; own entries | ledger_entries | READY | the user on history: REPAIR(10) |
| 115 | Time Clock Report | pay period | time_clock | READY | — |
| 116 | Missing Progress Notes | Only with Missing Progress Notes | appointment_note_audit | READY | by the appointment's provider; exact note-to-appointment link: SCHEMA(18) |
| 117 | Appointment Detail by User | created date | appointment_facts | APP | — |
| 118 | Production Report | Production by Code | charges, fee_schedule_fees | READY | restricted to `users.report_access_provider_id` (PD-11); compare column: fee_schedule_fees |

Totals by default-run rating: READY 78 · REPAIR 4 · SCHEMA 19 · APP 17 = 118. "READY" means the numbers can be produced,
not that migrated history is complete: the last column is part of every report's specification in `catalog/`, and every
financial row is subject to the completeness gate R-21.

### 11.2 Reference dashboard coverage

The 31 rows of the two reference dashboards (`analysis/reference_screenshots.md` §2.3, §3.3) traced to datasets. The brief
ships both dashboards in P1; every row below has its source in P1, with the stated P1 limitation where a later phase
improves it. Formulas are owned by `05_metric_catalog.md`; `group` = `rpt_provider_dim.production_group` of the row's
provider (`doctor`, `hygiene`, `other`).

| # | Dashboard row | Dataset and columns | Phase | Era availability and limits |
|---|---|---|---|---|
| M1-M3 | Gross Production; Doctor / Hygiene Gross Production | `rpt_charges.office_fee` where `is_production`, by `service_date`, `provider_id` -> group | P1 | both eras; migrated rows without a UCR fee fall back to the charged fee; migrated completeness R-21; group needs the provider-kind repair (section 6 #10) |
| M4-M6 | Net Production; Doctor Net Production; Hygiene Production | `rpt_ledger_entries`, buckets `production` + `production_adjustment`, on `service_date_effective` or `transaction_date` per the metric setting; `provider_id` of the leg -> group | P1 | app era exact; every migrated adjustment is `unclassified_adjustment` until DATA-12, so net = charged production for history and the unclassified amount is shown beside it |
| M7 | Gross Collection | `rpt_payments` where `counts_as_collection`, `-amount`, by `transaction_date` | P1 | both eras; the `assumed` share (migrated rows without a tender) is printed |
| M8-M9 | Doctor / Hygiene Gross Collection | P1: `rpt_payments.provider_id` (credited provider, label "provider on payment") -> group. P2: `rpt_payment_allocations` rows with `credit_ledger_bucket = 'collection'` and an income target, `allocation_provider_id` -> group, plus the `Unallocated` member | P1 / P2 | P1 months are restated when P2 switches (`is_restated`); migrated history is derived allocation |
| M10 | Total Collection | buckets `collection` + `collection_adjustment` (signed) of `rpt_ledger_entries` | P1 | as M4: migrated collection adjustments are unclassified until DATA-12 |
| M11-M12 | Doctor / Hygiene Collection | as M8-M9, with collection adjustments by the adjustment's own `provider_id` (P1) or by allocation (P2; `rpt_daily_allocated_collections` carries `credit_entry_type` and `counts_as_collection`, so gross and total are both readable) | P1 / P2 | as M8-M9 |
| M13 | Working Hours | `rpt_office_calendar_days().open_minutes`, or the sum of `rpt_provider_calendar_days().scheduled_minutes` — the metric names which | P1 | not era-bound: today's templates applied to past months; `hours_source = 'default'` is printed for unconfigured offices |
| M14 | Production Per Visit | net production (M4) ÷ count of `rpt_visits` rows | P1 | both eras; visit-code flags by the default rule until reviewed |
| M15-M17 | Total / Hygiene / Doctor Scheduled Production | `rpt_appointment_procedures.scheduled_fee`, `status_class NOT IN ('cancelled', 'no_show')`, by `appointment_date`, line `provider_id` -> group | P1 | app era (6 % of migrated appointments have lines [D]); a past month shows the book as it stands today until the start-of-day snapshot (DATA-48) |
| M18 | Case Acceptance (%) | `rpt_treatment_item_facts`: `is_accepted` with `accepted_date_effective` over items by `presented_date`, by `fee` or count | P1 (DATA-56) | app era only; current state until `treatment_plan_item_events` (DATA-25) |
| M19 | Hygiene Reappointment (%) | hygiene visits = `rpt_charges` with `rpt_code_in_group(..., 'hygiene_visit', ...)`; reappointed = a later `rpt_appointment_facts` row with `has_hygiene_code`, `created_date` on or before the visit date | P1 | app era only (appointment created dates and booked lines); does not need the recall engine (DATA-41) |
| M20 | Treatment Reappointment (%) | patients seen (`rpt_visits`) with `rpt_treatment_item_facts.is_pending` items who hold a later live appointment (`rpt_appointment_facts`) booked by the visit date | P1 (DATA-56) | app era only; the definition is the metric catalog's working assumption |
| P1 | Provider Gross Production | as M1 by `provider_id` | P1 | as M1 |
| P2 | Provider Net Production | as M4 by `provider_id` | P1 | as M4 |
| P3 | Provider Total Collection | as M11 by provider | P1 / P2 | as M8-M9; a provider can show collections in months without production only under allocation (P2) |
| P4 | Provider Total Appointments | count of `rpt_appointment_facts` rows, `NOT is_block AND NOT is_deleted AND NOT is_legacy_archive`, by `provider_id` | P1 | both eras; migrated rows follow the archive policy |
| P5 | Provider Seen Patients | `count(DISTINCT patient_id)` of `rpt_provider_visits` | P1 | both eras |
| P6 | Provider Working Hours | `rpt_provider_calendar_days().scheduled_minutes` | P1 | today's templates; a provider without a template shows office hours (`hours_source`) |
| P7 | Provider Production Per Visit | P2 ÷ count of `rpt_provider_visits` rows | P1 | both eras |
| P8 | Provider Scheduled Production | as M15 by line `provider_id` | P1 | as M15 |
| P9 | Provider Hourly Production | P2 ÷ hours: scheduled (P6) or clocked (`rpt_time_clock`, through `providers.user_id`) — the two sources the reference shows; the metric names one | P1 | clocked hours exist only for providers who punch |
| P10 | Provider Same Day Treatment | `rpt_charges.charged_fee` where `is_production AND NOT is_planned` | P1 | app era only (plan links were not migrated) |
| P11 | Treatment Reappointment Per Dentist (%) | as M20 by provider | P1 (DATA-56) | app era only |

---

## 12. Work items

Sizes: S up to 2 days, M up to 1 week, L up to 2 weeks, XL more (brief §4). "Depends on" lists DATA items; `ENG` = the
PostgreSQL test tier and worker owned by `02_architecture.md`. Every item that changes a table is applied per client
database (one database per organisation). Ids are stable: items added later carry the next free number, so the table is
ordered by id, not by phase.

| Id | Title | Phase | Size | Depends on | Acceptance check |
|---|---|---|---|---|---|
| DATA-01 | Reporting SQL package and view deployment (`app/reporting/sql/`, Alembic helper) | P0 | M | ENG | `alembic upgrade head` on an empty PostgreSQL creates every P0 `rpt_*` object in dependency order and `downgrade` removes them; a view change is one SQL file plus one revision; the SQLite suite is unaffected |
| DATA-02 | Data readiness checker (`rpt_data_quality`, `rpt_tenant_settings`, `rpt_tenant_flags`, `rpt_value_map`) | P0 | M | 01 | one run writes a row per section 6 check (#1 to #39) and per invariant; `rpt_tenant_flags` returns exactly one row per tenant with both legacy policies |
| DATA-03 | Server-side transaction code catalog (`transaction_codes` with legacy Sub Type and Class, validity exclusion constraint, seed, `rpt_transaction_code_dim`) | P0 | L | 01 | 18 payment, 46 adjustment and the system codes exist per tenant; inserting an overlapping version of a code fails; check #13 finds no unmapped app code; the `definitions` projection keeps existing pickers working |
| DATA-04 | Procedure-code reporting flags, versioned code groups and `rpt_code_in_group()` | P0 | M | 01 | every code has the four flags and a `code_type`; `ACBIL` / `ACBILO` are not production; the default groups are seeded with dated rows; a code that matches two member rows counts once in every dataset |
| DATA-05 | Core dimensions (`rpt_dates`, office, provider with persisted `provider_kind`, user, procedure code, patient, account) including the columns the legacy lists print | P0 | L | 01, 02 | each dimension has exactly one row per entity, also when `referrals` / `responsible_parties` hold duplicate `legacy_id` values; `provider_kind` is filled for every provider and equals the Python rule on all rows; `production_group` has three members |
| DATA-06 | Ledger legs and canonical ledger (`rpt_charges`, `rpt_payments`, `rpt_adjustments`, `rpt_remittance_lines`, `rpt_ledger_entries`) | P0 | L | 03, 04, 05 | R-01 (count and distinct `entry_id`), R-10a, R-12, R-13, R-20, R-22 pass on the fixture and on the UAT database; every leg carries the patient's current account; a patient-scoped ledger query is index-driven (plan attached) |
| DATA-07 | Balance unification: the six balance paths read the canonical ledger — in-app insurance money, the reversal-with-refund rule and the tenant sign policy included (PD-2) | P0 | L | 06, 09 | R-02 and R-03 hold for every fixture patient and a 1,000-patient sample; a bridge lists the change per account and leg; checks #7 (all four parts), #28 and #29 are recorded and clean or explained; product owner signs off the changed balances |
| DATA-08 | Reporting indexes on money and claim tables; duplicate indexes dropped | P0 | M | — | every section 8 index for those tables is valid on each client database; the five reference plans use them |
| DATA-09 | Reconciliation suite and nightly control totals | P0 | L | 06, ENG | R-01 to R-22 exist as tests (for the datasets that exist) and as control queries; a failing gate invariant blocks financial reports; R-10b, R-18 and R-20 produce exception lists |
| DATA-10 | Migrated-data repair batch 1: apply and verify the existing scripts; time zones; `rpt_legacy_logins`; duplicate join keys | P0 | M | 02 | checks #2, #3, #4, #8, #9, #11, #12, #21, #38 pass or are waived with a note, per client database |
| DATA-11 | Sign-anomaly, fee-sanity, link-sanity and legacy-archive decisions | P0 | S | 02 | checks #1 (a, b), #5, #6, #24, #30, #31, #32, #39 recorded; `legacy_archive_policy` and `legacy_positive_payment_policy` set per tenant with a written rationale |
| DATA-12 | `LEDGER` re-read: transaction codes, `TRANDATE`, card type, billing-order depth, insurance links; legacy Class of each code | P1 | L | 03, 50 | at least 99 % of migrated payment and adjustment rows carry a `transaction_code`; the migrated `unclassified_adjustment` share is reported before and after; the `DD` / `DDD` depth is restored on charges (check #36) |
| DATA-13 | Posting stamps (`posted_at`, `posting_date`) and ledger dates (`transaction_date` on charges, payments and remittances) | P1 | M | 06 | every new money row is stamped by the server; back-fill complete; `created_date` reads the column and the created-date plan uses `(tenant_id, office_id, posting_date)`; a payment keyed with an applies-to date other than today is selected differently by the two Deposit Slip bases |
| DATA-14 | Void metadata and before / after audit on charge writes | P1 | M | — | a void through any path stamps user, time and reason; `audit_logs.details` carries before / after for `patient-procedures` writes |
| DATA-15 | `tenant_id` on fact tables, batch 1, and the posting-time account on charges | P1 | L | 08 | `tenant_id` is NOT NULL and equals the patient's / office's tenant on every row; generic CRUD lists filter by tenant; new charges carry their posted account; views read the columns and `account_id` of every dataset is still the current account |
| DATA-16 | Scheduling facts (`rpt_appointment_facts`, `rpt_appointment_procedures`) and their indexes | P1 | L | 04, 05 | R-15 passes; every stored status of check #18 is mapped; counts by class match a hand-checked day per office; a same-day non-visit fee code does not make an appointment kept; a doubled group member row does not double `line_count` |
| DATA-17 | Appointment event capture, delete / cancel stamps, acting users, cancellation reasons, booking source | P1 | L | 16 | each write path, scheduler cut / copy / paste included, produces an event (one test per path); the Scheduler's cancel persists reason, note and call-list flag; `is_deleted` reads `deleted_at` |
| DATA-18 | Visits, provider visits, the two audit functions and progress-note facts (`rpt_visits`, `rpt_provider_visits`, `rpt_visit_audit`, `rpt_appointment_note_audit`, `rpt_progress_note_facts`; note provider and appointment link) | P1 | M | 06, 16 | every "patient has / but missing" combination of the Daily Audit returns the expected fixture rows; a day worked by two providers appears in both providers' filtered lists; Missing Progress Notes returns one row per appointment of the selected provider |
| DATA-19 | Patient activity: maintained `patients.first_visit` / `last_visit`, `rpt_patient_activity` | P1 | M | 18 | the two columns equal `min` / `max` of `rpt_visits.visit_date` for all patients after the back-fill and after creating and voiding a charge |
| DATA-20 | Explicit allocations and the FIFO core for one account, both units (`rpt_explicit_allocations`, `rpt_fifo_core`, `rpt_fifo_allocations`, `rpt_ar_open_items`) | P1 | L | 06 | R-05, R-06 and R-14b pass on fixture accounts covering prepayment, overpayment, partial split, an over-linked charge, a refund with a source payment, a transfer pair and a cross-account transfer, and two offices; a 500-account call returns in under 2 s |
| DATA-21 | Claim and coverage facts (`rpt_claim_facts`, `rpt_claim_lines`, `rpt_unclaimed_charge_tiers`, `rpt_insurance_coverage`) with sent / print capture | P1 | L | 06 | R-11 passes; every claim has one `status_class`; a secondary claim shows the lines of its family and its own tier's expected amount; a paid migrated claim is `paid` with outstanding 0; a print or send through any path is recorded |
| DATA-22 | Statement run support (`statement_runs` over the existing `batch_id`, `delivery_error`, account statement dates) | P1 | M | 20 | R-18 passes; a run has one header row and one statement row per account with its delivery outcome; a failed e-mail stores its error text |
| DATA-23 | Time clock and lab adapters (`rpt_time_clock`, `rpt_lab_cases`) | P1 | S | 05 | hours by user and day equal `time_clock_service.build_report` for a pay period; lab status equals `derive_lab_status` |
| DATA-24 | Provider production goals table (columns of `05_metric_catalog.md` §8.2) | P1 | S | — | a versioned goal per provider, office and month can be stored and read by the Scheduled Production report |
| DATA-25 | Early event capture for treatment items and claims (`treatment_plan_item_events`, `claim_status_history`) | P1 | M | — | every status transition, including server-owned ones, writes a row |
| DATA-26 | Tenant-wide and persistent allocations (`rpt_derived_allocations`, `rpt_payment_allocations`; allocation at posting with explicit unallocated remainders; `aged_from_date` on transfers; split guard) | P2 | XL | 15, 20 | R-06 and R-08 pass tenant-wide; the nightly build time is recorded; every new app payment has persistent allocation rows or an unallocated remainder with a reason; the fixture account with an open insurance portion and a patient overpayment lists the overpayment with Exclude Credit Balances ticked; a split beyond the open amount of a charge is rejected |
| DATA-27 | A/R open items and ageing tenant-wide for both units (`rpt_ar_open_items`, `rpt_aging_bucket_sets`) | P2 | L | 26 | R-05, R-14 and R-14b pass tenant-wide; the legacy bucket set matches a hand-worked set of accounts; no credit appears inside a bucket |
| DATA-28 | Deposits and insurance remittance header | P2 | L | 13 | R-09 holds with deposits on the posting office; one cheque paying N claims is one remittance; a payment cannot be on two deposits |
| DATA-29 | Day close and period lock with write guards | P2 | XL | 13, 14 | a write into a locked period fails through every write path; an override is audited; closing writes the snapshot rows |
| DATA-30 | Close snapshots (`rpt_ar_snapshot` for both units, `rpt_ar_snapshot_accounts`, `rpt_day_close_snapshot`, `rpt_metric_values`, `rpt_snapshot_variances`) | P2 | L | 27, 29 | R-17 passes; a month-end ageing re-run after later edits returns the frozen figures under both attributions; an update of a frozen row fails |
| DATA-31 | Claim model additions (delete stamp, denial fields, parent claim, office-local dates, recompute guard, `_sum_coverage` filter) and `rpt_claim_facts_as_of()` | P2 | L | 21, 25 | delete and close are distinguishable by column; check #17 stays at 0 after payments on secondary claims; R-11 holds on claims with migrated coverage rows; Outstanding Claims for a past date uses the status of that date |
| DATA-32 | Benefit usage (`rpt_benefit_usage` with deductible and family columns) and coverage repairs (slot tiers, plan limits, claim plan and status mapping) | P2 | L | 21 | the function equals `benefit_usage_service.slot_benefits` on a sample apart from the documented changes; checks #15, #16, #23 pass or are waived |
| DATA-33 | Payer and bill-tier snapshot on charges and insurance payments | P2 | M | 15 | every new insured charge carries plan, carrier and `billing_order`; an insurance payment carries its carrier |
| DATA-34 | Eligibility verification history | P2 | M | — | each verification writes a row with subscriber, patient, appointment, status, method, verify type, hold flag, error text and user |
| DATA-35 | Account collection fields and balance status | P2 | S | — | status and date are editable and print on the ageing reports |
| DATA-36 | Audit events dataset and taxonomy (`rpt_audit_events`) | P2 | M | 14, 17, 25, 29 | every `resource_type` present maps to a legacy Module Type; each of the five legacy Audit Types returns its fixture events; the `(tenant_id, created_at)` index is used |
| DATA-37 | Contract instalments and headers (`rpt_contract_installments`, `rpt_payment_plan_contracts`), plan-posting defects and the contract credit | P2 | M | 06 | posting an insurance-side instalment succeeds on PostgreSQL (check #26); the charge carries its contract id; a plan set up over charged treatment posts the offsetting `contract_movement` credit; checks #33 and #34 are clean or listed |
| DATA-38 | Capitation payment entity and ERA 835 tables | P2 | L | 03 | one capitation payment = one `capitation_payments` row = two ledger legs that net to zero; it appears in collections and on the Capitation Payment report; the ERA tables are in place and the two 835 reports are marked "needs integration" in the catalog until data flows |
| DATA-39 | Treatment item office, acceptance stamps and plan delete flag | P3 | M | 25, 56 | items carry their office; `accepted_date` is stamped on every transition into an accepted state; a deleted plan stays readable |
| DATA-40 | Referral model and facts (`rpt_referral_facts`, `referral_cases`, source link on patients) | P3 | L | 05 | new patients store `referral_source_id`; migrated links are back-filled by legacy id; referral cases cover every legacy status and every printed column of the three grids; an incoming case without a patient record can be stored |
| DATA-41 | Recall engine and `rpt_recall_due` | P3 | L | 04, 16 | posting a recall procedure advances the due date; booking a line with the code makes the recall scheduled and any other appointment does not; inactive patients and Send-to-Collection accounts are returned flagged; derived rows exist for migrated patients |
| DATA-42 | Ortho status, visits and `rpt_ortho_contracts` | P3 | L | 37 | every criterion and every documented output column of the five ortho reports binds to a column |
| DATA-43 | Appointment type, capacity history and communication facts | P3 | L | 16, 17 | new appointments carry a type; capacity of a past month uses the template of that month; `rpt_communication_facts` returns one row per outbound message |
| DATA-44 | Patient lifecycle fields (deleted, inactivated, registration source and status) and vocabulary normalisation | P3 | M | 05 | deleted and inactive patients are distinguishable; a quick-save patient is `placeholder` until completed; every value of check #20 is mapped |
| DATA-45 | List datasets (security, provider, setup) and missing list columns | P3 | M | 05 | per legacy list: every criterion and every column documented in `research/legacy_report_outputs_lists.md` binds to a column or is documented as unavailable |
| DATA-46 | `tenant_id` on fact tables, batch 2, and the remaining indexes | P3 | M | 15 | as DATA-15 for the clinical tables |
| DATA-47 | Roll-up tables and refresh engine (`rpt_daily_*`, `rpt_refresh_log`, `rpt_dirty_keys`, triggers on every table of 9.2) | P4 | XL | 06, 16, 26, ENG | R-16 passes after a full rebuild and after a scripted sequence of edits, voids, back-dated inserts, a re-split, a guarantor change and a claim status change; `rpt_freshness` is correct |
| DATA-48 | Activity summary and daily point-in-time snapshots | P4 | L | 47 | the summary equals the view; a scheduled-production snapshot exists per office and day |
| DATA-49 | Claim estimate snapshot (write-off timing variants) | P4 | M | 31 | one immutable snapshot row per claim line at claim creation |
| DATA-50 | Legacy history recovery: re-export feasibility and decision | P1 | S | — | a written answer per item (ledger codes and `TRANDATE`, `CLAIMH`, `TREATPLAN`, `PATRECALL`, `PATORTHOPLAN`, appointment stamps, patient creation date) and a go / no-go |
| DATA-51 | Fee-schedule fee lookup (`rpt_fee_schedule_fees`) | P1 | S | 05 | for a schedule with two dated entries of one code, the compare column of a Production Report run equals count x the fee in force on each service date |
| DATA-52 | Patient alert dataset and note passthroughs (`rpt_patient_alerts`; `patient_notes`, `account_notes`, `patient_statements`, `provider_route_slips`) | P1 | S | 05 | a banner copied from a medical alert is listed once; `no` / `unknown` answers are not alerts; the Routing Slip fixture prints alerts, notes and the provider's default codes |
| DATA-53 | Responsible-party type on the account (`accounts.resp_party_type`, back-fill, writers) | P1 | M | 05, 10 | check #37: every account has a type; the guarantor screens write it; the ten criteria screens of section 11 filter and print it |
| DATA-54 | SmartAssist checks (`rpt_smart_assist_checks`, consent template mapping) | P3 | M | 16, 18, 21, 52 | each check returns `pass` / `fail` / `not_enabled` on fixture appointments according to the office setup; a consent item without a template is `not_enabled` and listed |
| DATA-55 | Office and provider calendar functions (`rpt_office_calendar_days`, `rpt_provider_calendar_days`) | P1 | M | 05 | the office function equals `office_calendar_service.calendar()` for a date range; a provider template with two `effective_from` rows returns the right hours on both sides of the date; a provider without a template returns office hours with `hours_source = 'office_hours'` |
| DATA-56 | Treatment item facts view (`rpt_treatment_item_facts`) | P1 | M | 05 | the pending flag equals `treatment_service.pending_item_clauses` on a sample; funnel classes are exclusive under the hierarchy; a scheduled item keeps its exclusive status |
| DATA-57 | Migrated-ledger completeness: reload of the skipped charges and Denticon control totals | P0 | M | 02, 06 | check #35 recorded; the skipped charges are reloaded or the gap is waived in writing; control totals are stored per office; R-21 passes or is waived with the measured gap |

---

## 13. Risks and open decisions

### 13.1 Risks

| # | Risk | Effect | Mitigation |
|---|---|---|---|
| 1 | Unifying the balance changes numbers users see (app adjustments enter `GET /patients/{id}/balance`, in-app insurance payments and write-offs lower balances) | support load; mistrust on release day | bridge report per account before the switch, tenant-level feature flag, release note, product sign-off (DATA-07) |
| 2 | Staff may have posted an insurance payment (or its write-off) twice to work around the missing balance effect | double count after unification | section 6 #7 (cheque-level and per-day comparison, four parts) before go-live; review list per office |
| 3 | The archive partitions may be history (migration notes) while every screen excludes them | balances, first visits and old counts wrong either way | section 6 #6; one tenant setting read by every dataset, so screens and reports move together |
| 4 | Repair state differs per client database and is unknown | a report is right in one organisation and wrong in the next | `rpt_data_quality` per database; availability of bases and reports reads it |
| 5 | View performance on about 2.7M ledger legs under a 30 s statement timeout | slow or failed tenant-wide runs before roll-ups | indexes first (DATA-08); functions for as-of work; background runs for tenant-wide ageing and allocation; reference plans in review |
| 6 | Derived oldest-first allocation is not what Denticon recorded | provider income for history differs from legacy prints; unsuitable for back-pay | every derived figure is labelled; compensation uses persistent allocations from go-live (DATA-26) and frozen snapshots |
| 7 | The class seed of the 46 codes is partly inferred | misclassified adjustments move net production or net collections | product owner review before P0 ends; versioned rows allow correction without rewriting history |
| 8 | The legacy `created_at` time base is assumed to be wall clock | created-date reports a day off for history | check in 4.3; the basis stays disabled for migrated rows until verified |
| 9 | Row-level triggers are new to the schema | write overhead; bulk loads fill the dirty table | one narrow insert per write; `rpt.skip_dirty` for loads; measure on the charge-entry path before P4 |
| 10 | `rpt_*` objects are PostgreSQL-only and invisible to the SQLite suite | report SQL ships untested | PostgreSQL test tier is a P0 dependency on `02_architecture.md`; DATA-09 cannot start without it |
| 11 | One database per organisation multiplies every migration, back-fill and index build | operations cost; drift between organisations | idempotent revisions, the readiness checker as the per-database gate, refreshed schema dump for new organisations |
| 12 | Schema changes on hot tables run inside the deploy step | a long migration blocks a release | additive nullable columns only in deploy revisions; back-fills and index builds as separate operations steps (section 8) |
| 13 | Visit-dependent figures rest on code flags that are empty today | Patients Seen, Daily Audit, chair hours use default rules | DATA-04 in P0 with a review of the non-CDT codes by the office |
| 14 | The migrated ledger is incomplete: 87,585 charges were skipped while their payments were loaded | balances too low, phantom credits, wrong ageing and provider income for history; every internal invariant still passes | DATA-57 reloads the rows and R-21 compares with Denticon control totals; the gap is printed on financial reports until it is closed or waived |
| 15 | Positive migrated payment rows are either payments or reversals; a wrong reading moves each balance by twice the amount | A/R and collections wrong for the affected patients | one tenant policy for screens and datasets, default = today's screen rule; accountant sample before changing it (section 6 #1) |
| 16 | Contract billing posts instalment charges without the offsetting contract credit | A/R debited twice for treatment already on the ledger; ortho production overstated | section 6 #33 and #34; the contract writer posts the credit (DATA-37) |
| 17 | Real links can exceed a charge (no cap in the write path) | without the cap in the function, excess credit vanishes and ageing no longer equals the ledger | capping in `rpt_fifo_core()`; fixture and section 6 #31; split guard in DATA-26 |
| 18 | The office allocation unit doubles the tenant-wide FIFO work (two runs per snapshot) | longer nightly job | both runs are background work and share the ledger scan; measure with DATA-27 before committing the daily cadence for the office unit |

### 13.2 Open decisions

| # | Decision | Default used in this document | Owner |
|---|---|---|---|
| O-1 | Legacy archive partitions: include or exclude (ledger and appointments) | `exclude` (today's screen behaviour) until section 6 #6 is run per tenant | product owner + data lead |
| O-2 | Class, Sub Type, `is_income` and `counts_as_collection` of each adjustment and payment code, and its legacy Class; the Sub Type of the insurance write-off — one decision for `AINSO` (migrated) and `INS_WRITE_OFF` (app); whether `COLPY` and the capitation offset `AD900` count; whether bad debt is shown inside or beside net production | the seed in 3.3: insurance write-offs are production adjustments in both eras by class, and print in the column of the tenant's `AINSO` Sub Type; `COLPY` does not count as a collection; `AD900`, sales tax and contract movements are non-income | product owner + accountant |
| O-3 | "Ortho patient" for the General / Ortho criterion: tag only, or tag or active contract | tag or active contract | product owner |
| O-4 | Contract-billing charges (`ACBIL`, `ACBILO`, ortho periodic codes): production or contract movement | codes in category `Account` are not production; `D8xxx` periodic charges are production | product owner |
| O-5 | Visit definition (visit-code charge or kept appointment) and the missing-note unit (patient-day or provider-day) | visit-code charge; patient-office-day for the Daily Audit (a provider filter keeps the days the provider worked on, flags stay whole-day); appointment grain for Missing Progress Notes | clinical lead |
| O-6 | Allocation for app payments: persist at posting (legacy behaviour) or require explicit splits | persist at posting with the legacy rule — insurance to its claim line, patient payments to the oldest open patient portion, the rest as an explicit unallocated remainder; an explicit split overrides (DATA-26) | product owner |
| O-7 | Period lock basis and reversibility | lock on `transaction_date`, reversible by an administrator with an audit record (PD-9) | product owner |
| O-8 | Is the Denticon export still available for a re-read (DATA-12, DATA-50, DATA-57), and can the offices still run Denticon reports for the control totals of R-21? | assumed yes for `LEDGER`; everything else unknown | operations |
| O-9 | **Challenge to AD-3 / phase skeleton.** Oldest-first allocation and as-of ageing cannot be plain views at tenant scale, and month-end ageing must reproduce: `rpt_derived_allocations` and the close snapshots are step-B style tables delivered in P2, not P4. General roll-ups stay in P4. | written as above; the brief's two-step model otherwise holds | architecture owner |
| O-10 | **Challenge to PD-3 wording.** "Collections ... net of refunds" and "net collections = gross collections plus signed collection adjustments" overlap, because refunds are posted both as `patient_refunds` rows and as collection-side adjustment codes. The datasets expose `entry_type = 'refund'` across both stores so that `05_metric_catalog.md` can net refunds exactly once. | refunds are one class (`refund_*`), netted once | metric catalog author |
| O-11 | **Challenge to PD-4.** "Credits applied to the oldest charges first, at guarantor-account level" produces the home-office view only. The legacy Aging Report nets only the transactions recorded in the selected office, and the per-office A/R that the day sheet and the Executive Summary roll forward is a per-office ledger balance; one account-level pass cannot produce either (a charge at A and a payment at B cancel). | two allocation units over one function: `account` for Aging Report by Home Office, statements and allocations; `account_office` for Aging Report and the PD-6 default "A/R by transaction office" (2.13, R-14b). Both are snapshotted | product owner + accountant |
| O-12 | **Challenge to the phase skeleton (PD-7 in P1).** Collections by provider are allocation-based, but tenant-wide allocations are a P2 deliverable (DATA-26) while the brief ships the Provider Dashboard and the Collection Report in P1. | P1 reads the credited provider (`rpt_payments.provider_id`, labelled "provider on payment") and is restated when P2 switches to allocations. Alternative: move the nightly build of `rpt_derived_allocations` (derived rows only, without persistence at posting) into P1 — about one extra week on DATA-20 and a nightly job in P1 | product owner + architecture owner |
| O-13 | Positive migrated payment rows (`P` / `I` rows with `AMOUNT > 0`): payments stored positive, or legacy reversals? | `legacy_positive_payment_policy = 'credit'` — the rule of every screen today — until an accountant has sampled the rows of section 6 #1 against Denticon; the setting moves screens and datasets together | accountant + data lead |
| O-14 | Incomplete migrated ledger: reload the 87,585 skipped charges (missing codes seeded as inactive, unknown providers mapped to a placeholder provider) or accept and print the gap? | reload (DATA-57); financial reports on migrated periods carry the completeness caveat until R-21 passes or is waived | product owner + operations |
| O-15 | `office_fee` when the stamped UCR is a unit price and `quantity > 1` | keep `office_fee` = the stamped UCR and expose `fee_above_office_fee`; switch to `ucr_fee x quantity` only if section 6 #24 shows the pattern is material | accountant |
