# BE current state — existing reporting / dashboard / statement / PDF code (analysis for the Reports & Analytics module plan)

_Static analysis only (code + docs read; no server started, no DB connection, no API call). Snapshot: 2026-11-21. Backend `<workspace>/dentc-backend`, branch `feature/uat-realse`, HEAD `9183df0` (2026-11-16) + 16 uncommitted files; `openapi.json` = 564 paths._

**Legend** — **[V]** verified by reading the cited file/lines. **[I]** inference (reasoned from the code or library semantics, not executed). **[D]** a number/claim taken from a backend code comment or doc, not re-measured. Paths are relative to `dentc-backend/` unless prefixed `dentc-frontend/`. All names are snake_case as in the code.

---

## 0. TL;DR for planners

| # | Finding | Evidence |
|---|---|---|
| 1 | The reporting surface is small and entirely hand-written: 5 `/reports/*` KPI routes (router 110 LOC + service 456 LOC), 1 `/dashboard/summary`, 4 office roll-ups + 2 cross-patient feeds (498 LOC), statements (412 LOC), 4 patient PDFs (1,104 LOC) on one PDF kit (610 LOC), lab (1 JSON + 2 PDF + 1 CSV), time clock (JSON + CSV + PDF). **No report registry, no shared filter model, no engine.** | [V] §1 |
| 2 | **Money lives in 7 stores with no unified ledger**: `patient_procedures.fee`; `patient_payments` (legacy P/I/A rows + app patient payments, two sign conventions); `patient_adjustments`; `patient_refunds`; `ledger_insurance_details` (app insurance remittances + write-offs); `patient_opening_balances`; `insurance_claims.total_paid/opening_paid/write_off_amount`. | [V] §2.1 |
| 3 | **In-app insurance payments and insurance write-offs are invisible to every balance / A/R / collections / statement / ledger computation.** `billing_service.record_insurance_payment[_batch]` writes only `ledger_insurance_details`; no reporting service reads that table. | [V] `app/services/billing_service.py` L411-530; grep of `LedgerInsuranceDetail` in report/transactions/balance/ledger/statement services = 0 hits |
| 4 | **"Collections" is overstated**: `sum_payment_credit()` counts every credit row of `patient_payments`, including `payment_type='adjustment'` credits (migrated write-offs) and balance-transfer rows; refunds are not netted. | [V] `app/services/ledger_sign.py` L88-111, `report_service.py` L84-99, migration `s29_patient_payments.py` L81 |
| 5 | **Six different balance / A/R formulas** coexist (per-patient balance, practice A/R, office split, statement, account ledger, scheduler badge). They disagree on opening balances, `patient_adjustments`, refunds, debit adjustments and archived payments. | [V] §2.4 |
| 6 | **Aging is gross-charge dating**: `/reports/aging` buckets `Σ fee` by `date_of_service` age with no payments applied, so `aging.total` = all-time gross charges, not `total_ar`. The backend response doc's example (`total` = `total_ar` = 96120) is not what the code returns. | [V] `report_service.py` L243-284; `tests/test_reports_module.py` L91-100 |
| 7 | **Five insurance-receivable definitions and five service-level claim-status lists** (plus the seeded `claim_status` group and the migration map). Pre-authorisation claims (`is_preauth`) are not excluded anywhere. `insurance_ar` = `min(Σ all-time insurance_estimate, total_ar)` — degenerates to `total_ar` on a practice with history. | [V] §2.3, §2.6; [I] for the degeneration |
| 8 | **Office scope and permissions are not applied to reports.** Only `/dashboard/summary` and `/reports/time-clock*` use `OfficeScopeDep`. `/reports/*`, the five `/offices/{id}/…` roll-ups (`financial-summary`, `collections`, `insurance-receivables`, `adjustment-summary`, `transactions`), `/transactions`, lab report routes and the statement batch accept any `office_id` and need only a valid token. No `reports_*` right is enforced by any route. | [V] §1.4 |
| 9 | The generic CRUD list is tenant-filtered only when the model has a `tenant_id` column. `patient_procedures`, `patient_payments`, `insurance_claims`, `appointments`, `treatment_plans` have none, so their list endpoints rely on office narrowing alone; an unrestricted caller with no office filter is not tenant-narrowed. | [V] `app/crud/base.py` L91-94; [I] for the cross-tenant consequence — not executed |
| 10 | PDF = `reportlab` only, two generations (platypus `PatientReport` kit vs hand-positioned canvas). **No XLSX writer** (`openpyxl` is import-only and not in `requirements.txt`). CSV exists in two places. Everything is built in memory inside the request; no streaming, no stored artifact. Office logo/letterhead is applied only by the 4 patient PDFs. | [V] §3 |
| 11 | **No job runner, no scheduler, no email attachments.** "Jobs" are inline loops that write a run row (`utility_runs`, `letter_batch_runs`). Recurring work is OS cron calling `scripts/*.py`. Statement "email" delivery only records intent. | [V] §3.6 |
| 12 | Performance: aggregates are all-time scans of ~1.37M procedure / ~1.33M payment rows [D] with no `(office_id, date)` index; several endpoints aggregate in Python; `transaction_feed` loads the whole tenant's ledger as ORM objects per request. | [V] code, [I] cost; §1.5 |
| 13 | Date semantics are thin: money is filtered by `date_of_service` / `payment_date` only — no created-date basis (the legacy "Transaction Date vs Created Date" criterion). "Today" is UTC in aggregates but office-local in PDFs. `patients.created_at` was not migrated, so `new_patients` is meaningless for pre-migration history; no backend code sets `patients.first_visit`. | [V] §2.5 |
| 14 | Tests run on in-memory SQLite as a super-admin; `report_service` deliberately avoids Postgres-only SQL (`date_trunc`, etc.) for that reason. A real analytics layer will need Postgres-backed tests. | [V] `tests/conftest.py`, `report_service.py` L12-14 |
| 15 | **Verdict: a new report-engine layer is needed.** Keep the building blocks (sign rule, PDF kit, letterhead, print audit, office-scope resolver, the time-clock `build → JSON/CSV/PDF` pattern, run-record shapes); replace the metric functions and the in-memory feeds. | §5 |

---

## 1. Inventory of report-ish endpoints

### 1.1 KPI / aggregate JSON endpoints

**A. `/reports/*`** — router `app/api/v1/reports.py` L26-110 (tag `Reports`), service `app/services/report_service.py`, schemas `app/schemas/reports.py`. Router dependency: `get_current_user` only. [V]

| Path (`operation_id`) | Params | Response model (fields) | Statements executed |
|---|---|---|---|
| `GET /reports/summary` (`get_report_summary`) | `date_from` (req), `date_to` (req), `office_id?` | `ReportSummary`: `production`, `collections`, `new_patients`, `active_patients`, `scheduled_appointments`, `insurance_receivables`, `outstanding_ar`, `office_id`, `date_from`, `date_to`, `as_of` | 9: production, collections, new patients, active patients, appointments, claims `GROUP BY status`, plus 3 for A/R as of `date_to` (L288-312) |
| `GET /reports/trends` (`get_report_trends`) | `date_from` (req), `date_to` (req), `interval` = `day\|week\|month` (default `day`), `office_id?` | `ReportTrends`: `interval`, `buckets[]` of `TrendBucket{period, production, collections, new_patients}`, `office_id`, `date_from`, `date_to`, `as_of` | 3: `GROUP BY patient_procedures.date_of_service`; `GROUP BY patient_payments.payment_date`; raw `SELECT patients.created_at` bucketed in Python (L334-417) |
| `GET /reports/accounts-receivable` (`get_report_accounts_receivable`) | `office_id?`, `as_of?` (date, default UTC today) | `AccountsReceivable`: `total_ar`, `patient_ar`, `insurance_ar`, `office_id`, `as_of` | 3 all-time sums ≤ `as_of` (L172-239) |
| `GET /reports/aging` (`get_report_aging`) | `office_id?`, `as_of?` | `Aging`: `current`, `d30`, `d60`, `d90`, `d120_plus`, `total`, `office_id`, `as_of` | 1: `CASE` on `date_of_service` `GROUP BY bucket` (L243-284) |
| `GET /reports/insurance-verification-summary` (`get_insurance_verification_summary`) | `office_id?` | `InsuranceVerificationSummary`: `by_status{}`, `total`, `verified`, `pending`, `office_id`, `as_of` | 1: `GROUP BY coalesce(nullif(elig_status,''),'unknown')` on `insurance_subscribers` (L421-456) |

Notes [V]: money fields are `float`. Response `as_of` is the UTC timestamp of computation, not the `as_of` date that was requested (the requested date is not echoed). No `date_from ≤ date_to` validation and no maximum window. `trends` is sparse (buckets exist only where data exists; no zero-fill); week = ISO Monday, month = first of month, bucketed in Python. No `provider_id`, `office_ids`, `office_group_id`, patient-type or transaction-type filter on any of the five.

**B. `/dashboard/summary`** — `app/api/v1/dashboard.py` L66-109 (`get_dashboard_summary`, tag `Reports`). [V]

| Params | Response | Approach |
|---|---|---|
| `office_id?`, `date?` (collections day, default today) + `OfficeScopeDep` params `all_offices`, `office_ids[]`, `office_group_id`, `include_global`, header `X-Office-ID` | **No `response_model`** (untyped in OpenAPI): `{office_ids[], all_offices, date, outstanding_balance, patient_balance, insurance_receivable, credit_balance, patient_count, collections{patient_payments, insurance_payments, total_collections, payment_count}}` | `_resolve_targets` (L44-63): explicit office → `office_ids` → `office_group_id` (∩ assigned unless unrestricted) → `all_offices` (needs `office_scope_view_all_offices`) → default = caller's assigned offices (whole tenant when unrestricted). Then **loops per office** calling `transactions_service.office_financial_summary` + `collections_summary` and sums. |

**C. Office roll-ups and cross-patient feed (DASH-1..5, SRCH-1/3)** — `app/api/v1/transactions.py` L40-171 (tag `Billing`), service `app/services/transactions_service.py`, schemas `app/schemas/transactions.py` L27-103. Money is `Decimal` (JSON string). [V]

| Path (`operation_id`) | Params | Response model | Approach |
|---|---|---|---|
| `GET /offices/{office_id}/financial-summary` (`get_office_financial_summary`) | — | `OfficeFinancialSummary`: `office_id`, `outstanding_balance`, `patient_balance`, `insurance_receivable`, `credit_balance`, `patient_count`, `as_of` | 5 all-time sums + 4 `GROUP BY patient_id` queries reduced in Python (L85-175) |
| `GET /offices/{office_id}/collections` (`get_office_collections`) | `period` = `today\|week\|month\|year\|custom` (default `today`), `date_from?`, `date_to?` | `CollectionsSummary`: `office_id`, `period`, `date_from`, `date_to`, `patient_payments`, `insurance_payments`, `total_collections`, `payment_count`, `as_of` | Fetches every `(payment_type, amount)` row in the window, classifies in Python (L179-212) |
| `GET /offices/{office_id}/insurance-receivables` (`get_office_insurance_receivables`) | — | `InsuranceReceivables`: `office_id`, `total_outstanding`, `open_claim_count`, `by_carrier[]` of `CarrierReceivable{carrier_id, carrier_name, outstanding, claim_count}`, `as_of` | Loads **all active claims of the office as ORM rows**, filters/groups in Python (L216-260) |
| `GET /offices/{office_id}/adjustment-summary` (`get_office_adjustment_summary`) | `period` (default `month`), `date_from?`, `date_to?` | `AdjustmentSummary`: `office_id`, `period`, `date_from`, `date_to`, `adjustment_total`, `write_off_total`, `refund_total`, `write_off_by_type{}`, `as_of` | Row fetch of `patient_adjustments` + one sum of `patient_refunds` (L264-307) |
| `GET /offices/{office_id}/transactions` (`get_office_transactions`), `GET /transactions` (`search_transactions`) | `search`, `type` = `all\|charge\|payment\|adjustment\|refund\|claim`, `status`, `office_id` (tenant feed), `date_from`, `date_to`, `amount_min`, `amount_max`, `transaction_number`, `page`, `size ≤ 200` | `TransactionFeed`: `rows[]` of `TransactionRow{transaction_number, transaction_type, source_id, entry_date, patient_id, patient_name, office_id, provider_id, provider_name, code, description, amount, status}`, `total`, `page`, `size`, `pages`, `as_of` | Loads **every** non-void procedure, payment, adjustment, refund and active claim of the tenant, then applies office / date / status / amount / search filters, sort and paging **in Python** (L311-475) |

**D. Patient / account aggregates** [V]

| Path (`operation_id`) | File | Notes |
|---|---|---|
| `GET /patients/{id}/balance` (`get_patient_balance`) | `app/api/v1/balances.py`, `app/services/balance_service.py` L188-280 | `PatientBalance` (float): `total_charged`, `total_paid`, `balance`, `account_balance`, `patient_balance_total`, `account_id`, `account_member_count`, `estimated_insurance`, `estimated_patient`, `patient_balance`, `insurance_balance`, `today_charges`, `opening_balance`, `total_refunded`, `total_payment_debits`, `credit_balance`, `aging{current,b30,b60,b90,b120}`, `recent_activity{today,last_ins,last_pat,last_ins_amount,last_pat_amount}`, `as_of`. Redis key `balance:{tenant_id}:{patient_id}`, TTL 30 s, **invalidated on writes** (9 `cache_delete("balance:…")` call sites in the billing, refund, payment-plan, intake and AppointNow-payment services, plus `family_account_service.py` L86). |
| `GET /patients/{id}/account-balance` (`get_patient_account_balance`) | `balance_service.py` L284-344 | `AccountBalance` = aggregate + `members[]` (one `patient_balance_core` per member). |
| `GET /patients/{id}/ledger`, `GET /patients/{id}/account-ledger` | `app/api/v1/ledger.py`, `app/services/ledger_service.py` L445-529 | Running-balance feed; `size ≤ 5000` (`MAX_FEED_SIZE`); `scope=patient\|account`, `date_from/to`, `transaction_type`, `include_claims`, `include_archived`, `sort_by`, `order`. Whole window computed in memory, then sliced. |
| `GET /patients/{id}/day-totals` (`get_patient_day_totals`) | `app/api/v1/patient_reports.py` L132-142, `print_service.day_totals` L863-908 | `DayTotals`: `transaction_count`, `total_charges`, `insurance_estimate`, `patient_estimate`, `estimated_deductible`, `has_active_coverage`; runs the estimate engine over the day's charges. |
| `GET /patients/{id}/outstanding-claims`, `GET /patients/{id}/insurance-summary`, `GET /patient-procedures/{id}/allocations-summary` | `app/api/v1/billing.py`, `billing_service.py` L679, `procedure_totals_service.py` | Per-claim `total_charges/est_insurance/deductible_used/ins_paid/ins_adjusted/remaining`; per-procedure applied money. With the claim-total recompute (`billing_service._sum_coverage` L221) these are the only code paths that read `ledger_insurance_details` money. |

**E. Domain reports with a JSON payload** [V]

| Path (`operation_id`) | Params | Response | Approach |
|---|---|---|---|
| `GET /reports/time-clock` (`get_time_clock_report`) — `app/api/v1/time_clock.py` L405-419, `time_clock_service.build_report` L1324-1465 | `from` (req), `to` (req), `user_id?`, `office_id?`, `overtime_method?` (`none\|weekly\|daily\|daily_weekly`), `include_wages?`, `include_entries?` + `OfficeScopeDep` params | `TimeClockReport`: `date_from`, `date_to`, `timezone_note`, `overtime_method_override`, `include_wages`, `users[]` (`ReportUser` → `days[]` `ReportDay` → `entries[]` `ReportEntry`, `totals` `ReportTotals`), `totals`, `generated_at` | One `SELECT` of `time_clock_entries` for `[from − 8 d, to + 2 d)`; office-local day bucketing, overtime split and wages in Python. Guards: `to ≥ from`, max 366 days (`MAX_REPORT_DAYS`). |
| `GET /appointments/lab-cases/cost-report` (`get_lab_cost_report`) — `app/api/v1/lab_tracking.py` L118-141, `lab_tracking_service.lab_cost_report` L516-578 | `date_from?`, `date_to?`, **`date_basis`** = `appointment\|sent\|due\|received`, **`group_by`** = `vendor\|provider\|office\|month\|dds`, `office_id?`, `provider_id?`, `lab_vendor_id?`, `include_archived?` | `LabCostReport`: `date_from`, `date_to`, `date_basis`, `group_by`, `rows[]` of `LabCostReportRow{key, label, case_count, total_cost}`, `case_count`, `total_cost` | Joined `SELECT appointments ⋈ offices ⟕ providers ⟕ labs`, all rows loaded, **grouped in Python** |
| `GET /appointments/lab-cases` (`list_lab_cases`) | 16 filters via `lab_case_filters` (office, patient, provider, vendor, short notice, `lab_status`, 4 date ranges, `include_archived`, `as_of`) + `PageParams` | `LabCaseListResponse`: `items[]`, `meta`, `counts{all,not_sent,sent,overdue,received,not_received}`, `total_cost`, `as_of` | **Best SQL in the codebase**: one conditional aggregate for per-status counts + cost, then a paged, sorted, denormalised page (L423-489) |
| `GET /treatment-plans/{plan_id}/report` (`get_treatment_plan_report`), `/treatment-plans/{plan_id}/summary`, `GET /treatment-plan-items/pending-summary` | plan id / `patient_ids` (≤ 200) | `TreatmentPlanReport` (items + totals + coverage netting), `PendingTreatmentSummaryBatch` | Per-plan composition, `treatment_service.plan_report` L1436 |

**F. Small counters** [V]: `GET /procedure-codes/stats`, `GET /sms/inbox/summary`, `GET /patients/{id}/imaging/summary`, `GET /patients/{id}/medical-alerts/summary`, `GET /medical-alerts/summary?patient_ids=`. Scheduler feed `GET /appointments/scheduler` (`date_from`, `date_to`, `office_id`, `provider_id`, `status`, `include_archived`; plain array, no paging) carries a batched per-patient balance.

**G. Statements and run records** [V]

| Path (`operation_id`) | File | Behaviour |
|---|---|---|
| `POST /patients/{id}/statements` (`generate_patient_statement`), `GET …/statements`, `GET …/statements/{sid}` | `app/api/v1/statements.py`, `app/services/statement_service.py` | Body `StatementCreate{office_id, statement_date, date_from, date_to, message}` → frozen `patient_statements` row: `opening_balance`, `total_charges`, `total_payments`, `total_adjustments`, `closing_balance`, `aging_current/30/60/90/120`, `message`, `batch_id`, `delivery_*`, `snapshot`. |
| `POST /accounts/{account_id}/statements` (`generate_account_statement`) | `app/api/v1/accounts.py` L167, `family_account_service.py` L1220-1283 | One statement per account, addressed to the guarantor; member sections in `snapshot.members[]`. |
| `POST /offices/{office_id}/statements/batch` (`generate_statement_batch`) | `statement_service.generate_batch` L201-243; account scope → `family_account_service.generate_account_batch` L1285 | Body `StatementBatchRequest{statement_date, date_from, date_to, min_balance=0.01, only_aged, scope=patient\|account}`. **Synchronous loop**: one `get_patient_balance` per active patient homed at the office, a statement for each that clears `min_balance` (and `only_aged`), single commit. |
| `GET …/statements/{sid}/pdf`, `POST …/statements/{sid}/deliver` | `statement_service.render_pdf` L316-412, `deliver` L276-297 | PDF from the snapshot; `deliver` (`email\|print\|download`) only updates `delivery_status` — "No SMTP integration is wired" (L286). |
| `POST /utilities/{utility_id}/run`, `GET /utilities/jobs/{id}`, `GET /utilities/audit` | `app/api/v1/utilities.py`, `utility_service.py` | Records a `utility_runs` row immediately marked `completed`, "no records were processed" (L74-81). Duplicate-run guard per (utility, office). Admin-only run. |
| `POST /letters/render-batch`, `GET /letters/batches[/{id}]` | `app/api/v1/letters.py`, `letter_service.run_batch` L731-807 | Inline HTML merge over ≤ `LETTERS_BATCH_MAX_PATIENTS` (500) patients; `letter_batch_runs` + `letter_batch_items`; no PDF. |

### 1.2 File outputs (PDF / CSV)

| Endpoint (`operation_id`) | Output | Renderer | PRINT audit row | FE call site today |
|---|---|---|---|---|
| `GET /patients/{id}/reports/overview` (`get_patient_overview_report`) | PDF, portrait | `print_service.render_overview` L391-659 → `PatientReport` | yes (`patient_report`) | `PatientOverviewPage.tsx` |
| `GET /patients/{id}/reports/ledger` (`get_patient_ledger_report`) — `scope`, `date_from/to`, `transaction_type`, `include_claims`, `include_archived`, `sort_by`, `order` | PDF, landscape | `render_ledger` L691-860 | yes | `LedgerPage.tsx` |
| `GET /patients/{id}/reports/transactions` (`get_patient_transactions_report`) — `date` | PDF, landscape | `render_transactions` L928-1012 | yes | `TransactionsEntryPage.tsx` |
| `GET /patients/{id}/reports/insurance` (`get_patient_insurance_report`) — `category=D\|M`, `order=primary…quaternary` | PDF, portrait | `render_insurance` L1021-1104 | yes | `InsurancePlanScreen.tsx` |
| `GET /appointments/lab-cases/report.pdf` (`print_lab_report`) | PDF, landscape | `lab_tracking_service.render_lab_report_pdf` L617-652 | yes (`lab_report`) | `LabTrackingPage.tsx` |
| `GET /appointments/lab-cases/cost-report.pdf` (`print_lab_cost_report`) | PDF, portrait | `render_lab_cost_report_pdf` L655-673 | yes | none — wrapper `fetchLabCostReportPdf` exists but the page prints client-side because the route has no `patient_id` filter (FE gap LAB-13, `LabTrackingPage.tsx` L215-220) |
| `GET /appointments/lab-cases/export.csv` (`export_lab_cases_csv`) | CSV | `lab_cases_csv` L589-595 | yes | `labTrackingService.ts` L114 |
| `GET /reports/time-clock/report.csv` (`get_time_clock_report_csv`) — `layout=summary\|detail` | CSV | `time_clock_service.report_csv` L1468-1503 | yes (`time_clock_report`) | none (FE aggregates `listTimeClockEntries` client-side) |
| `GET /reports/time-clock/report.pdf` (`get_time_clock_report_pdf`) — `detail` | PDF, landscape | `report_pdf` L1506-1553 | yes | none |
| `GET /patients/{id}/statements/{sid}/pdf` (`get_patient_statement_pdf`) | PDF | raw canvas, `statement_service.render_pdf` | **no** | none |
| `GET /payment-plans/{kind}/{id}/contract.pdf`, `…/coupons.pdf` | PDF | raw canvas, `payment_plan_service` L787, L894 | **no** | none |
| `GET /patients/{id}/medical-history/pdf` (`get_patient_medical_history_pdf`) | PDF | raw canvas, `medical_history_service.render_pdf` L1732 | **no** | none |
| `GET /insurance-claims/{id}/reports/ada-claim-form`, `POST /insurance-claims/reports/ada-claim-form` (batch) — `mode=form\|overlay`, `offset_x/y` | PDF | fixed-grid canvas, `ada_claim_pdf.render` L441 | yes (`claim_report`) | none (FE renders the ADA form client-side) |

FE call sites: [V] by grep over `dentc-frontend/src` excluding `src/api/generated` on this working tree. Of the JSON KPI endpoints only `getReportAccountsReceivable` and `getInsuranceVerificationSummary` are called (`dentc-frontend/src/components/setup/insurance/InsuranceDashboard.tsx`); `/reports/summary`, `/reports/trends`, `/reports/aging`, `/dashboard/summary`, DASH-1..5, `/transactions`, `/reports/time-clock`, the lab cost-report JSON and all statement routes have no caller.

### 1.3 Generic CRUD lists usable as row-level feeds

Engine: `app/crud/base.py` `CRUDBase.list` L113-216 + `app/crud/router_factory.py` L154-216. Every list issues a `COUNT(*)` over the filtered subquery, then `ORDER BY … OFFSET/LIMIT`; `size ≤ 200` (`get_pagination`, `app/api/deps.py` L144-151). [V]

| Resource | Equality filters | Range filters (`_from` / `_to`) | Sortable | Denormalised on read | Office scope spec |
|---|---|---|---|---|---|
| `GET /patient-procedures` (registry L969-995) | `patient_id`, `appointment_id`, `provider_id`, `procedure_code`, `claim_id`, `office_id`, `billing_status`, `treatment_plan_id`, `treatment_plan_item_id`, `hold_claim`, `fee_schedule_id`, `is_void` | `date_of_service` | `date_of_service`, `created_at` | `patient_name`, `provider_name` (G7) | `_DAY` |
| `GET /patient-payments` (L1143-1162) | `patient_id`, `payment_type`, `provider_id`, `office_id`, `is_void` | `payment_date` | `payment_date`, `created_at` | `patient_name`, `provider_name` | day-data, `created_office_id` stamp |
| `GET /insurance-claims` (L1164-1183) | `patient_id`, `status`, `claim_type`, `carrier_id`, `ins_plan_id`, `office_id`, `is_active` | `submitted_date`, `paid_date`, `created_at` (G10) | default `created_at` | `patient_name`, `carrier_name` | `_POS` |
| `GET /patient-adjustments` (L592-598) | `patient_id`, `office_id`, `provider_id`, `procedure_id` | `adjustment_date` | `adjustment_date`, `created_at` | — | `_POS` |
| `GET /treatment-plans` (L921-938) | `patient_id`, `office_id`, `status`, `ins_plan_id` (extra) | none (no date range) | default `created_at` | `patient_name`, `item_count`, `total_fee`, `est_insurance`, `est_patient` (G9) | `_POS` |
| `GET /appointments` (L846-) | `patient_id`, `provider_id`, `operatory_id`, `office_id`, `date`, `status`, `is_archived`, `treatment_plan_id`, `has_lab`, `lab_vendor_id`, `lab_short_notice`, `lab_status` (extra) | `date`, `lab_sent_on`, `lab_due_on`, `lab_received_on` | `date`, `start_time`, `created_at`, `updated_at`, lab dates, `lab_cost` | (names only on `/appointments/scheduler`) | day-data |

No `created_at` range on procedures / payments, no multi-value filters (`provider_id IN …`, `office_ids` only via the office scope), no aggregates, no group-by.

### 1.4 Scope and authorisation matrix

Building blocks that exist [V]: `TenantId` (`app/api/deps.py` L64-77, JWT tenant, `X-Tenant-ID` for `super_admin`); `OfficeScopeDep` / `OfficeContext` and `resolve_list_office_filter`, `validate_target_office`, `require_all_offices(scope, reports=True)`, `office_group_office_ids` (`app/services/office_scope_service.py` L109-353, L444-498); `require_roles`, `require_permission`, `require_read_access` (`deps.py` L80-133); `REPORTS_ALL_OFFICES = office_scope_view_all_offices` (`permission_service.py` L91). There is **no global middleware** that validates `office_id` (`app/main.py` L85-104; `app/middleware/` holds only audit, catch-all, request-context) — enforcement is per route.

| Endpoint family | Tenant isolation | Office assignment check (`user_offices`) | `all_offices` / `office_ids` / `office_group_id` | Permission / role | Cache |
|---|---|---|---|---|---|
| `/reports/summary`, `/trends`, `/accounts-receivable`, `/aging` | join `patients.tenant_id`; `patient_adjustments.tenant_id` | **none** — `office_id` not validated against assignments nor against the tenant | not supported (one `office_id` or all) | **none** (any authenticated user) | Redis `report:{summary\|trends\|ar\|aging}:{tenant_id}:{office_id\|all}:{…}`, TTL 60 s, never invalidated |
| `/reports/insurance-verification-summary` | `insurance_subscribers.tenant_id` | none | not supported | none | Redis `report:elig:…`, 60 s |
| `/dashboard/summary` | office ∈ tenant | **yes** (`validate_target_office`) | **yes**; `all_offices` needs `office_scope_view_all_offices` | no report right | none |
| `/offices/{id}/financial-summary`, `/collections`, `/insurance-receivables`, `/adjustment-summary`, `/transactions` | `_assert_office` (404 if office not in tenant) | **none** | n/a | none | none |
| `/transactions` | in-memory tenant patient-id set | none | n/a | none | none |
| `/reports/time-clock`, `.csv`, `.pdf` | `time_clock_entries.tenant_id` | **yes** (`resolve_list_office_filter(..., reports=True)`) | yes | caller-based: non-managers see only their own rows; managers = role `owner\|admin\|manager\|super_admin` or `utilities_time_clock_editor_full_control`; view-all via `utilities_time_clock_editor_view_only`; wages only `owner\|admin\|super_admin` | none |
| `/appointments/lab-cases*` | join `offices.tenant_id` | **none** | n/a | none | none |
| `/patients/{id}/reports/*`, `/balance`, `/ledger`, `/statements*` | `patients.tenant_id` | none (chart is organisation-wide by design; `assert_patient_visible` is not called) | n/a | none | balance only (30 s) |
| `/offices/{id}/statements/batch` | office ∈ tenant | **none** | n/a | none | none |
| `/utilities/{id}/run` | tenant | yes (inline) | n/a | `require_roles("admin")` | none |

Report rights in the permission catalog [V for the files, **[I]** for the DB state]: the curated catalog = `data/Groups.txt` minus `REMOVED_ROWS` (`app/services/access_rights_catalog.py` L40-252); codes are `slugify(label)` (`scripts/seed_permissions.py` L47-49).

- **Kept** (about 56 `Reports - …` labels): Daily, Monthly, Ledger, Management, Insurance, Appointment, Treatment Plan, Referral, Statements (+ "Statement - Allow updating statement dates"), Letters, Custom Letter, My Reports (Full Control / View), Pat Reg./Medical Info Forms, Lists (Employer, Office, Patient, Prescription, Procedure/Fee, Provider, Responsible Party, Security, Setup), Group Reports (Appointment, Batch, Other, Referral, Daily, Ins, Mang). Example code: `reports_daily_reports_screen_full_control` / `…_view_only`.
- **Removed**: Recall Reports, Ortho Reports, Labels, Postcards, Custom Postcard, Excel Reports, Batch Schedule Report (add / delete / view / full), Batch Collection Letters, Blank Insurance Form, DHA, Voice Charting, all client-specific "Office Reports - …", and every `denticon_practice_analytics_*` right.
- **Added**: `dashboard_view`, `my_page_access`, `office_scope_view_all_offices`.
- **None of these codes is referenced by any route** (grep of `reports_…`, `dashboard_view` under `app/` outside the catalog file = 0 hits).

### 1.5 Performance characteristics and risks

Environment [V]: sync SQLAlchemy / psycopg2; `statement_timeout` 30 s and `idle_in_transaction_session_timeout` 60 s per connection (`app/db/session.py` L30-35, `DB_STATEMENT_TIMEOUT_MS`); pool 10 + 20 overflow; gunicorn `timeout` 120 s. Scale [D]: 1,372,616 `patient_procedures`, about 1.33M `patient_payments`, 79,038 migrated claims with a paid total, 31,756 time-clock punches (tenant 1).

Indexes on the fact tables (from `schema.sql` and Alembic; [V] for the files, [I] that every environment matches): `patient_procedures` → `(patient_id, date_of_service)`, `claim_id`, `is_void`, `legacy_id`, `treatment_plan_item_id`; `patient_payments` → `(patient_id, payment_date)`, `legacy_id`, `account_id`, `account_payment_id`; `insurance_claims` → `(patient_id, status)`, `legacy_id`, `ins_plan_id`; `patient_adjustments` → `patient_id`, `procedure_id`, `tenant_id`; `appointments` → `(date, office_id)`, `(provider_id, date)`, `(operatory_id, date)`, `(patient_id, date)`, `status`, `(office_id, has_lab)`. **Nothing on `(office_id, date_of_service)`, `(office_id, payment_date)`, `provider_id`, `procedure_code`, `created_at`, `submitted_date` or `carrier_id` for the money tables.**

| Endpoint | Cost driver | Risk |
|---|---|---|
| `/reports/summary` | 9 statements; the 3 A/R ones scan all history joined to `patients` | [I] seconds per cold call on a migrated tenant; masked by the 60 s cache |
| `/reports/aging`, `/accounts-receivable` | full-history scans | same |
| `/reports/trends` | date `GROUP BY` without a supporting index; new-patient rows pulled to Python | grows with window; no cap |
| `/offices/{id}/financial-summary` | 9 statements over the office's whole history, 4 of them `GROUP BY patient_id` returned to Python; no cache | [I] slow per office |
| `/dashboard/summary` | the above × N offices, plus collections | [I] N-office fan-out inside one request; `patient_count` double-counts patients active in two offices |
| `/offices/{id}/insurance-receivables` | all active claims as ORM objects | [I] heavy for large offices |
| `/transactions`, `/offices/{id}/transactions` | whole tenant ledger as ORM objects + a tenant-wide `patient_id IN (…)` list | [I] unusable at migrated scale (memory, statement timeout) |
| `/offices/{id}/statements/batch` | per-patient loop (several SQL statements per patient, more per generated statement), one transaction | [I] will exceed the 120 s worker timeout for a large office |
| Overview PDF | per-member balance + visits + recall queries | FE comment: "can take tens of seconds on a large account" (`dentc-frontend/src/features/print/serverReport.ts` L24-25) |
| Ledger PDF | `size=1_000_000` pull, all rows as `Paragraph` cells | [I] slow / large for long accounts (594 rows → 20 pages [D]) |
| lab cost report | all matching appointments loaded and grouped in Python | fine today; pattern does not scale |

---

## 2. How each metric is computed today

### 2.1 Where money is stored

| Store | What it holds | Tenant column | Office column | Dates | Notes |
|---|---|---|---|---|---|
| `patient_procedures` | posted charges: `fee`, `ucr_fee`, `insurance_estimate`, `patient_estimate`, `sec_insurance_estimate`, `estimated_deductible`, `pat_paid`, `pat_adjust`, `provider_id`, `hygienist_id`, `procedure_code`, `billing_status`, `claim_id`, `quantity` | none (via `patients`) | `office_id` | `date_of_service`, `created_at` | `is_void`, `is_archived`. `patient_estimate` is 0.00 on 1,372,558 of 1,372,574 migrated rows [D] |
| `patient_payments` | **legacy `LEDGER` rows `LTYPE` P / I / A** → `payment_type` `patient` / `insurance` / `adjustment` (migration `s29_patient_payments.py` L81, `parsers.py` L167-171) **plus** app-posted patient payments, unallocated insurance cheques, balance transfers (`payment_type='adjustment'`, `payment_method='balance_transfer'`) | none | `office_id`, `created_office_id` | `payment_date`, `created_at` | two sign conventions (§2.2); `payment_method` keeps only cash / check / card / ach — other legacy `TYPE2` codes map to NULL (`parsers.py` L203-216) |
| `patient_adjustments` | app-posted adjustments: `amount`, `adjustment_type`, `write_off_type` (`contractual\|provider\|insurance\|courtesy`), `procedure_id`, `provider_id` | `tenant_id` | `office_id` | `adjustment_date` | positive = credit |
| `patient_refunds` | `amount`, `refund_method`, `reason_code`, `source_payment_id`, `reversed_type/id` | `tenant_id` | `office_id` | `refund_date` | increases the balance |
| `ledger_insurance_details` | per-procedure carrier money: `prim/sec/ter_ins_paid`, `prim/sec/ter_ins_adjust`, `prim/sec/ter_deductible`, `prim/sec/ter_estimated`, remittance ids (`check_number`, `eob_number`, `eft_trace_number`) | none | `office_id` | `payment_date` | `is_void`; the **only** home of app-posted insurance payments and insurance write-offs |
| `patient_opening_balances` | seeded opening A/R by bucket: `current`, `over_30`, `over_60`, `over_90`, `over_120` | via patient | — | — | folded into a balance only by `balance_service` |
| `insurance_claims` | `total_billed`, `total_paid` (derived = `opening_paid` + live detail rows), `est_insurance`, `write_off_amount/mode/value`, `status`, `claim_type`, `is_preauth`, `carrier_id`, `billing_provider_id`, `treating_provider_id` | none | `office_id` | `submitted_date`, `paid_date`, `close_date`, `date_of_service_from/to`, `created_at` | `is_active=false` means closed **or** soft-deleted |

`payment_allocations` cannot link payments to charges for history: 6,951 rows for 1.33M payments, every amount 0 [D] (`procedure_totals_service.py` L22-30).

### 2.2 Sign conventions

| Row | Stored sign | Rule applied | Source |
|---|---|---|---|
| `patient_procedures.fee` | positive = debit | summed as-is | — |
| `patient_payments.amount`, `payment_type ≠ 'adjustment'` | legacy negative, app positive | `delta = −abs(amount)` → always a credit | `ledger_sign.py` L63-68, L88-95 |
| `patient_payments.amount`, `payment_type = 'adjustment'` | signed as posted | `delta = amount`; negative = credit, positive = debit (charge side) | same |
| derived | — | `credit = max(0, −delta)`, `debit = max(0, delta)`; SQL twins `sum_payment_credit()`, `sum_payment_debit()`, `sum_payment_delta()` | L98-119 |
| `patient_adjustments.amount` | positive = credit | subtracted | `ledger_service.py` L337 |
| `patient_refunds.amount` | positive | **added** to the balance | `balance_service.py` L176-185 |
| transaction feed `amount` | `+` debit / `−` credit | charge `+fee`; payment `delta`; adjustment `−amount`; refund `+amount`; claim `+total_billed` (informational) | `transactions_service.py` L364-438 |

`ledger_sign.py` is the one coherent rule in this area and is used by all six balance paths.

### 2.3 Metric by metric

| Metric | Formula (exact columns) | Date column | Filters | Where | Defects / caveats |
|---|---|---|---|---|---|
| **Production** | `Σ patient_procedures.fee` | `date_of_service` ∈ [`date_from`, `date_to`] | `is_void = false`, `is_archived = false`, optional `patient_procedures.office_id` | `report_service._production` L66-81; trends L344-355 | Gross at posted fee. No net production, no provider / code / category / patient-type split, `quantity` ignored, `billing_status` ignored. |
| **Collections** | `Σ credit(patient_payments)` | `payment_date` | `is_void = false`; **no `is_archived` filter** | `_collections` L84-99; trends L356-366 | Includes credit `adjustment` rows (legacy write-offs, balance transfers); **excludes `ledger_insurance_details`** (app insurance payments); refunds not netted. Schema text says "Σ patient payments" but all payment types are summed. |
| **Collections split** (DASH-2) | same rows; insurance if `payment_type` starts with `ins` or contains `insurance`, else patient | `payment_date`; presets relative to **UTC** today | `office_id`, `is_void = false` | `collections_summary` L179-212 | `adjustment` credits fall into `patient_payments`; `payment_count` counts every row including debits. |
| **Adjustments / write-offs** (DASH-4) | `adjustment_total = Σ patient_adjustments.amount`; `write_off_total` = rows with a `write_off_type`; `write_off_by_type{}`; `refund_total = Σ patient_refunds.amount` | `adjustment_date`, `refund_date` | `office_id`, `is_void = false` | `adjustment_summary` L264-307 | Ignores legacy adjustments in `patient_payments` and insurance write-offs in `ledger_insurance_details.*_ins_adjust` / `insurance_claims.write_off_amount`. No per-`adjustment_type` or per-provider split. |
| **New patients** | `COUNT(patients.id)` | `created_at ≥ date_from AND < date_to + 1 day` (naive-UTC timestamps) | `tenant_id`, optional `home_office_id` | `_new_patients` L102-115 | Migration `s17_patients.py` writes neither `created_at` nor `first_visit` → migrated patients carry the migration timestamp. No `is_active` filter. |
| **Active patients** | `COUNT` where `is_active = true` | none (now) | `tenant_id`, optional `home_office_id` | `_active_patients` L118-125 | A flag, not "seen in the last N months". Ignores the window. |
| **Scheduled appointments** | `COUNT(appointments.id)` | `appointments.date` | `is_cancelled = false`, `is_blocked = false`, `is_archived = false`, optional `office_id`; needs a `patient_id` | `_scheduled_appointments` L128-144 | Includes missed / no-show; `status`, `is_missed`, `checked_out_on`, `is_new_patient` unused. |
| **Outstanding A/R** | `total_ar = Σ fee(dos ≤ as_of) − [Σ credit(payments, payment_date ≤ as_of) + Σ patient_adjustments.amount(adjustment_date ≤ as_of)]` | as-of (default UTC today) | charges non-void, non-archived; payments non-void | `_ar_components` L172-213, `get_accounts_receivable` L216-239 | Omits debit adjustments, refunds, opening balances, `ledger_insurance_details`. Net of credit balances (no debit / credit split). |
| **A/R split** | `insurance_ar = max(0, min(Σ insurance_estimate(dos ≤ as_of), total_ar))` when `total_ar > 0`; `patient_ar = total_ar − insurance_ar` | as-of | same | L223-227 | `Σ insurance_estimate` is all-time gross, so on a practice with history it exceeds `total_ar` and the split collapses to `insurance_ar = total_ar`, `patient_ar = 0` [I]. This is the figure the FE Insurance Dashboard shows. |
| **Aging** | `Σ fee` per bucket: `current` = dos ≥ as_of − 30; `d30` = [as_of − 60, as_of − 30); `d60`; `d90`; `d120_plus` = dos < as_of − 120; `total` = Σ buckets | `date_of_service` vs `as_of` | charges non-void, non-archived, dos ≤ as_of | `get_aging` L243-284 | No payments applied; `total` = all-time gross charges. Not per patient / guarantor / carrier / provider. |
| **Per-patient aging** | same boundaries on that patient's charges + `patient_opening_balances` buckets | `date_of_service` vs UTC today | — | `balance_service._charges` L52-99 | No upper date bound; keys `current,b30,b60,b90,b120`. |
| **Insurance receivable A** (summary) | `Σ` over status groups of `max(Σ(total_billed − total_paid), 0)` for statuses ∉ `_CLAIM_SETTLED` | none (current state) | `is_active = true`, optional `office_id` | `_insurance_receivables` L147-168 | Clamp is per status group, not per claim. Uses `total_billed` rather than `est_insurance`. Pre-auths and secondary claims included. Mixed with as-of A/R in one response. |
| **Insurance receivable B** (DASH-3) | `Σ max(est_insurance − total_paid, 0)` per claim, by `carrier_id` | none | `is_active = true`, status ∈ `_OPEN_CLAIM_STATUSES` | `insurance_receivables` L216-260 | Uses `est_insurance`; whitelist instead of blacklist; pre-auths included. |
| **Insurance receivable C** (DASH-1) | `Σ patient_procedures.insurance_estimate`, all time | none | office, non-void, non-archived | `office_financial_summary` L88-97, L127 | Gross estimate ever posted, not outstanding. `patient_balance = max(outstanding − that, 0)` → usually 0 [I]. |
| **Insurance receivable D / E** | `insurance_ar` (above); per-patient `insurance_balance = Σ insurance_estimate` | — | — | `report_service`, `balance_service` L262-266 | Same gross-estimate issue; per-patient `patient_balance = balance − Σ insurance_estimate` can go negative [I]. |
| **Verification summary** | `COUNT(*)` by `elig_status` (blank → `unknown`); `verified` = status ∈ `{verified, active, confirmed, eligible}`; `pending = total − verified` | none | `insurance_subscribers.tenant_id`, `is_active = true`, optional `office_id` | L421-456 | Counts subscribers, not patients or upcoming appointments; `elig_verified_on` age ignored. |
| **Trends** | daily production, collections, new patients rolled up to day / ISO week / month | as above | as above | `get_trends` L334-417 | Inherits every caveat above; sparse buckets; no comparison period. |
| **Lab cost** | `Σ appointments.lab_cost`, `COUNT` by group | selectable `date_basis` | `has_lab = true`, not archived | `lab_cost_report` | Correct and the only report with a date-basis and group-by parameter. |
| **Hours / overtime / wages** | paid hours = `clock_out − clock_in` for `entry_type = 'work'`; overtime split daily / weekly / daily_weekly; `regular_pay = regular × pay_rate`, `overtime_pay = overtime × pay_rate × overtime_rate` | office-local date of `clock_in` | active rows; caller + office scope | `build_report` L1324-1465, `split_overtime` L1289 | The most complete report: rule metadata, issue flags, look-back for weekly overtime. |

### 2.4 Inconsistency matrix — what each balance path includes

| Component | `balance_service` (patient) | `report_service` (practice A/R) | `transactions_service` (office split) | `statement_service` | `ledger_service` (account ledger) | `scheduler_service._batch_balances` |
|---|---|---|---|---|---|---|
| `+ Σ patient_procedures.fee` (non-void, non-archived) | yes | yes (dos ≤ as_of) | yes | yes (window) | yes (archived optional) | yes |
| `+ patient_opening_balances` | **yes** | no | no | no | no | no |
| `+` debit adjustments in `patient_payments` | yes | **no** | yes | yes | yes | yes |
| `−` payment credits | yes, excluding archived | yes, **including archived** | yes, including archived | yes, including archived | yes, excluding archived by default | yes, including archived |
| `− patient_adjustments.amount` | **no** | yes | yes | yes | yes | **no** |
| `+ patient_refunds.amount` | yes | **no** | yes | **no** | **no** | no |
| `− ledger_insurance_details` paid / adjust | no | no | no | no | no | no |
| Source lines | L218-280 | L172-213 | L137-175 | L77-137, L170 | L256-340, L492-499 | L81-107 |

Consequences [V]: an app-posted `patient_adjustments` row lowers the ledger total, the office split, the practice A/R and the statement but not `GET /patients/{id}/balance`; a refund raises the patient balance and the office split but not the practice A/R, the ledger or the statement; one statement row can store a `closing_balance` (statement formula) next to `snapshot.account_balance` (balance-service formula) that differ.

Office attribution [V]: every office-scoped figure filters each table by that row's own `office_id`. A charge at office A paid at office B shows as outstanding in A and as a credit in B (`_office_balance_split` nets per patient within one office).

### 2.5 Date and time semantics

| Area | Date used | "Today" | Timezone |
|---|---|---|---|
| Production / A/R / aging | `patient_procedures.date_of_service` (DATE) | `datetime.now(utc).date()` (`report_service._today` L56-57) | UTC |
| Collections | `patient_payments.payment_date` (DATE) | UTC (`transactions_service._period_window` L70-81) | UTC |
| Adjustments / refunds | `adjustment_date` / `refund_date` | UTC | UTC |
| New patients | `patients.created_at` (naive timestamp, stored UTC) compared with date bounds | — | UTC day boundaries |
| Appointments | `appointments.date` | — | — |
| Claims in the feed | `submitted_date`, else `date_of_service_from` | — | — |
| Lab | `date_basis`; status "as of" = office-local date when `office_id` is given, else UTC (`resolve_as_of` L81) | office-local / UTC | mixed |
| Time clock | office-local date of `clock_in`, per entry's office; legacy `clock_basis = wall_clock` rows read as local | — | office |
| Patient PDFs | `office_today(home office timezone)` (`app/core/datetimes.py` L46-53); printed timestamp in the office zone | office-local | office |

Gaps [V]: (a) no aggregate offers a **created / entry-date basis** — `patient_procedures.created_at` and `patient_payments.created_at` exist but are unused, and migrated rows hold the migration timestamp unless `scripts/backfill_ledger_source_fields.py --restore-created-at` was run (its docstring L38-42; DB state unknown); (b) no fiscal-period, month-end-close or "as posted" snapshot concept — every figure is recomputed from live rows, so a past month changes when a back-dated entry is posted; (c) `patients.first_visit` is read in three places (`patient_overview_service.py` L137, `print_service.py` L426, `scheduler_service.py` L427) and no backend code derives or sets it — only a client `PATCH /patients/{id}` could (grep).

### 2.6 Status vocabularies in use

| Where | Constant | Values |
|---|---|---|
| `report_service.py` L45 | `_CLAIM_SETTLED` (blacklist) | `paid, closed, denied, rejected, void, voided, cancelled, canceled` |
| `transactions_service.py` L52 | `_OPEN_CLAIM_STATUSES` (whitelist) | `draft, ready, sent, submitted, pending, resubmitted, hold` |
| `benefit_usage_service.py` L50-54 | `VOID_CLAIM_STATUSES`, `SETTLED_CLAIM_STATUSES` | `void, voided, cancelled, canceled, denied, rejected` / `paid, closed` |
| `insurance_plan_edit_service.py` L72 | `CLOSED_CLAIM_STATUSES` | `closed, paid, denied, rejected, void, voided, cancelled, canceled` |
| `billing_service.py` L700 | inline, `outstanding_claims` | not in `closed, void, denied` |
| `scripts/seed_account_definitions.py` L79-82 | definitions group `claim_status` | `draft, submitted, paid, denied, closed` |
| migration `parsers.py` L188-195 | `CLAIM_STATUS_MAP` | `S→submitted, P→pending, R→paid, H→draft, D→denied, C→closed` |
| `report_service.py` L49 | `_ELIG_VERIFIED` | `verified, active, confirmed, eligible` |

A claim with status `partial` or `appealed` is outstanding under the blacklist and ignored under the whitelist. `InsuranceClaimRead.status`, `AppointmentRead.status`, `TreatmentPlanRead.status` remain free strings.

### 2.7 Contract inconsistencies between endpoints

| Aspect | Variants found |
|---|---|
| Money on the wire | `float` (`/reports/*`, `/balance`); `Decimal` → JSON string (`/offices/*`, statements); raw `Decimal` through `jsonable_encoder` → number (`/dashboard/summary`, [I]) |
| Aging keys | `current,d30,d60,d90,d120_plus` (`Aging`) · `current,b30,b60,b90,b120` (`PatientBalance.aging`) · `aging_current,aging_30,aging_60,aging_90,aging_120` (`StatementRead`) · `current,over_30,over_60,over_90,over_120` (`patient_opening_balances`) |
| `as_of` | request = date; response = computation timestamp |
| Date-range params | `date_from` / `date_to` (reports, feeds, lab) · `from` / `to` (time clock) · `{field}_from` / `{field}_to` (CRUD lists) · `period` preset (office roll-ups) |
| Grouping param | `interval` (trends) · `group_by` (lab cost) · `layout` / `detail` (time-clock files) |
| Sort params | `sort` + `order` (CRUD, lab) · `sort_by` + `order` (account ledger) · `sort_by` + `sort_order` (patient ledger) |
| Type filter | `type` (transaction feed) · `transaction_type` (ledgers) |
| Office-wide header | "All offices" (lab / time-clock PDFs) vs letterhead (patient PDFs) |

---

## 3. PDF / CSV generation

### 3.1 Libraries

`reportlab>=4.0` is the only document library (`requirements.txt`; imported lazily in every renderer so the API boots without it). `csv` + `io.StringIO` for CSV. `openpyxl` is imported lazily in `fee_schedule_wizard_service.py` L590 for **import** only and is not declared in `requirements.txt`. No `xlsxwriter`, `pandas`, `weasyprint`, `jinja2`, or HTML-to-PDF path. `StreamingResponse` is used only for documents / imaging, never for reports. [V]

### 3.2 Two PDF generations

| Generation | Module | Technique | Used by |
|---|---|---|---|
| **Gen 2 — report kit** | `app/services/pdf_report.py` (610 LOC) | platypus `BaseDocTemplate` with two `PageTemplate`s (full first-page header, one-line later header), flowable story, custom `KeepTogether` subclass so a section bar is never orphaned, two-pass `_NumberedCanvas` for `Page x of y` (L588-607) | 4 patient reports (`print_service`), Lab Report, Lab Cost Report, Time Clock Report |
| **Gen 1 — raw canvas** | `statement_service.render_pdf`, `payment_plan_service.render_contract_pdf` / `render_coupons_pdf`, `medical_history_service.render_pdf`, `ada_claim_pdf.render` | hand-positioned `canvas.Canvas` on LETTER, manual `y` cursor and `showPage()` | statements, payment-plan contract + coupons, medical-history form, ADA 2024 claim form (fixed grid, `form` / `overlay` modes, calibration offsets) |

`PatientReport` API [V] (`pdf_report.py`): `ReportHeader{title, office_name, office_address, office_phone, patient_name, patient_id, chart_no, dob, extra[(label, value)], logo_path, photo_path, printed_at, show_patient}` (L178-195); `PatientReport(header, landscape=False)`; primitives `section_title(title)` L348, `key_value_table(rows)` (2- or 4-column) L363, `data_table(head, body, right=, center=, widths=, font_size=, foot=, foot_span=, empty=, bold_first_col=)` with `repeatRows=1` L401, `paragraph(label, text, red=)` L493, `notice(text)` L508, `cards([...])` L513, `render() -> bytes` L550. Formatters: `cell`, `money`, `money_or_dash`, `fmt_date` (MM/DD/YYYY), `fmt_time`, `age_from_dob`, `sex_word`, `sex_letter`. Palette mirrors the FE's `dentc-frontend/src/features/print/patientPdf.ts`.

Limits of the kit [V unless marked]: named and shaped for one patient — the later-page header always prints `"{title} · {patient_name} (ID {patient_id})"` (L325) even when `show_patient=False`, so office-wide reports show an empty patient stub from page 2; the PDF title is `"{title} - {patient_name}"` (L576). Helvetica built-ins only, no charts, no group headers / subtotals / page-break-per-group, no column auto-fit. Every cell is a `Paragraph`, so very long tables are slow [I].

Statement PDF specifically [V]: totals + aging + (account scope) one line per member; **no itemised transaction lines** (`_period_lines` returns no `lines`; `family_account_service.py` L1251 reads a key that is never set), no logo, no address block, no remit slip, message truncated to 110 characters, not audited.

### 3.3 Delivery mechanics

All renderers return `bytes` from an in-memory `io.BytesIO`; routes answer `Response(content=…, media_type="application/pdf", headers={"Content-Disposition": 'inline; filename="…"'})` (CSV: `text/csv`, `attachment`). Generation is synchronous inside the request (sync `def` routes run in the threadpool). Nothing is stored — no report artifact table, no object-storage write, no signed URL, no download centre. [V]

### 3.4 Branding

`print_service.resolve_letterhead(db, office, tenant_id)` (L200-266) is the single resolver [V]: reads `office_statement_settings` (`logo_option` = `office\|custom\|none`, `logo_url`, `address_source` = `office\|custom`, `statement_address_1/2`, `statement_city/state/zip`, `statement_phone`, `correspondence_name`) and `account_settings.logo_url`; returns `{name, address_line1, address_line2, city, state, zip, phone, logo_url, logo_source: custom|account|none, logo_path}`. The same values are published on `OfficeRead.letterhead` / `OfficeRead.logo_url` (PRINT-2). Constraints: only a file under `UPLOAD_DIR` is embedded — a remote (`http(s)://`, `gs://`) logo is never fetched (`_local_path` L185-197), so on bucket-backed deployments the header prints without a logo [I]; a corrupt image is swallowed.

Who uses it [V]: the 4 patient PDFs (via `_header` L269-295). **Not** the Lab or Time Clock PDFs — they use `lab_tracking_service._office_header` (L598-614): office name / address / phone, or the literal "All offices"; no logo, no statement-address override. Not the Gen-1 PDFs.

### 3.5 Audit of prints

`print_service.record_print(...)` (L320-338) writes one `audit_logs` row per file: `action='PRINT'`, `resource_type` ∈ `patient_report | lab_report | time_clock_report | claim_report`, `resource_id` = report name or claim id, `patient_id`, `user_id`, `method`, `path`, `ip_address`, `request_id`, `details={report, params}`; exception-safe. Readable through admin-only `GET /audit-logs?resource_type=` (`app/api/v1/audit.py` L46-78). Not audited: statement / payment-plan / medical-history PDFs and every JSON report call. [V]

### 3.6 Scheduling, jobs, e-mail

| Capability | State |
|---|---|
| Background worker / queue | none (no Celery, RQ, APScheduler, arq; the Celery block in `ecosystem.config.js` is commented out) [V] |
| Recurring work | OS cron invoking `scripts/auto_close_time_clock.py`, `scripts/run_sms_reminders.py`, `scripts/expire_booking_requests.py`, `scripts/purge_sms_messages.py` [V] |
| Run records | `utility_runs` (`status`, `parameters`, `processed`, `succeeded`, `failed`, `logs`, `finished_at`); `letter_batch_runs` + `letter_batch_items`; `patient_statements.batch_id` — all written inline [V] |
| Redis | cache + refresh-token store + pub/sub for messaging; `REDIS_ENABLED`; fail-open helpers `cache_get/set/delete` (`app/integrations/redis_store.py` L167-199) [V] |
| E-mail | `app/integrations/sendgrid_client.py` (`send_mail`) and `app/integrations/email.py` (Graph / SMTP, password reset) — **no attachment parameter in either** (grep) [V]; `email_messages` log with delivery webhooks exists |
| Saved report definitions / favourites / schedules | no table, no route [V] |

### 3.7 How the frontend fetches files

`dentc-frontend/src/features/print/serverReport.ts` `openServerReport({fetch_pdf, fallback, label})` [V]: opens a blank tab first (popup blockers), awaits the generated client call (blob, bearer token), `URL.createObjectURL` → `tab.location.href`, calls `tab.print()` after 1.2 s, revokes the URL after 120 s; on any error it closes the tab, toasts "Server report unavailable (status) — printing from screen data" and runs the client-side jsPDF builder. Lab reports follow the same pattern with `labReportPrint.ts` as fallback.

---

## 4. Delivered versus still open (per the backend response documents)

| Doc | Item | Doc status | Verified in code |
|---|---|---|---|
| `docs/reports/reports_backend_response.md` (2026-06-07) | Gap 1 roll-ups (`/reports/summary`, `/reports/trends`) | Done | [V] present, mounted `app/api/router.py` L111 |
| | Gap 2 practice A/R | Done | [V]; `insurance_ar` "best-effort" as documented |
| | Gap 3 aging | Done, "gross-charge buckets, not net-of-payment FIFO … planned" | [V]; the doc's example where `total` equals `total_ar` does not match the code |
| | Gap 6 `office_id` list filters | Done | [V] registry |
| | Gap 5 status enums | Partial — vocabulary documented; `/definitions` seeding planned | [V] `claim_status` / `appt_status` seeded; read models still `string`; services disagree (§2.6) |
| | Gap 4 PDF / XLSX export, e-mail, scheduled reports | **Deferred (infra)**; proposed `POST /reports/{report}/export`, `POST/GET /reports/schedules` | [V] nothing built |
| `docs/Final/BACKEND_IMPLEMENTATION_RESPONSE.md` (2026-07-05) | G7 denormalised names on procedures / payments / claims | Done | [V] `read_enrich` in registry |
| | G9 plan totals on `TreatmentPlanRead` | Done | [V] `enrich_service.py` L255 |
| | G10 claim date ranges | Done | [V] `range_fields` |
| | G8 scheduler feed `provider_id` + `status` | Done; "Pagination on the feed is still array-based" | [V] |
| | Scheduler G9 server-rendered appointment print (routing slip / day sheet) | Deferred, bundled with Reports G4 | [V] absent |
| `docs/print/patient_print_backend_response.md` (2026-09-11) | PRINT-1 four patient PDFs + audit; PRINT-2 letterhead; PRINT-3 ledger cap 5,000; PRINT-6 `day-totals` | Done | [V] |
| | PRINT-4, 5, 7, 8, 9, 10 | Already existed | [V] consumed by the renderers |
| `docs/time-clock/time_clock_backend_response.md` (2026-10-03) | TC-BE-1..14 incl. server report, CSV, PDF, wages, pay periods | Done | [V] code |
| | Alembic `1745e318c65a` | "Not applied to the dev DB" (revision chain) | cannot verify statically |
| | TC-BE-9 UTC back-fill script | Tooling only, "Not run" | — |
| | TC-BE-13 payroll vendor CSV (ADP / Gusto / Paychex) | Not built, awaiting spec | [V] absent |
| Lab Tracking (LAB-2/4/5) | lab cases view, cost report, PDFs, CSV | Shipped | [V] |
| OFF-SCOPE-18 | `/dashboard/summary` | Shipped | [V]; untyped response, no FE caller |
| UTIL-1 | batch engines behind `/utilities/{id}/run` | Run recorded only | [V] `utility_service.py` L74-81 |
| STMT-3 | statement e-mail delivery | Records intent only | [V] |

Doc drift [V]: `dentc-frontend/docs/reports/reports_backend_devreport.md` (2026-07-05) still lists G1, G2, G3, G7, G8, G9, G10 as Open; the backend delivered them. Conversely the FE project note that "the backend validates every `office_id` param/path/body" does not hold for the hand-written report, office roll-up and lab routes (§1.4).

---

## 5. Candid assessment

### 5.1 Can this code grow into a 100+ report engine?

No. Reasons, all [V] unless marked:

| Dimension | Today | Needed for the legacy catalogue + analytics |
|---|---|---|
| Report definition | one bespoke function + route + Pydantic schema each | a registry (id, category, parameters, columns, groupings, outputs, required right) the FE can render from data |
| Criteria | `date_from`, `date_to`, one `office_id` | office set / office group, provider(s), user, date basis (transaction vs created), patient type (general / ortho), transaction types, detail vs summary, group-by, sort, output format |
| Metric definitions | duplicated and divergent (§2.3-2.6) | one semantic layer with a single definition per metric |
| Data shape | 7 money stores, no tenant column on fact tables, no canonical transaction class | a unified ledger view / fact model with `tenant_id`, `office_id`, `provider_id`, `transaction_class`, `transaction_date`, `created_at`, signed amount |
| Row output | only single-row KPI objects or patient-scoped feeds | paged detail rows, group headers, subtotals, grand totals, drill-down keys |
| Execution | synchronous, in-request, Python-side aggregation in several places | SQL-side aggregation, async runs with status, row / time limits, cancellation |
| Outputs | PDF (patient-shaped kit), 2 ad-hoc CSVs | PDF, XLSX, CSV from one tabular result |
| Persistence | none | saved views, favourites, schedules, run history, stored artifacts |
| Delivery | browser tab only | e-mail with attachment, download centre |
| Scope / rights | absent on reports | office-scope resolver + per-report right on every run |
| Performance | no reporting indexes, 60 s cache with no invalidation | indexes, rollup tables or materialised views, cache keyed by the resolved office set |
| Tests | SQLite, super-admin | Postgres-backed tests, multi-tenant and multi-office fixtures, golden-number tests per metric |

### 5.2 Keep / rework / retire

| Verdict | Item | Why |
|---|---|---|
| **Keep as-is** | `app/services/ledger_sign.py` | the one correct, shared rule for `patient_payments` signs (Python + SQL twins) |
| **Keep as-is** | `office_scope_service`: `OfficeScopeDep`, `resolve_list_office_filter(..., reports=True)`, `require_all_offices`, `office_group_office_ids` | already models office / office set / office group / all offices with the right checks; reports just need to call it |
| **Keep as-is** | `print_service.resolve_letterhead`, `record_print` | single branding resolver and print audit; extend `resource_type` for reports |
| **Keep as-is** | `app/core/datetimes.py` (`office_today`, `office_tz`, `UtcDatetime`) | correct office-local "today" |
| **Keep as pattern** | Time-clock report: one `build_report()` dict → JSON, `report_csv()`, `report_pdf()`; caller + office scope; range guard; audit | the right shape for every report: one tabular result, several renderers |
| **Keep as pattern** | Lab cost report parameters `date_basis` + `group_by`; `list_lab_cases` conditional-aggregate counts | maps directly onto the legacy "date basis" and "group by" criteria; good SQL |
| **Keep as pattern** | `PatientStatement` frozen snapshot; `LetterBatchRun/Item` and `UtilityRun` run-record shapes | models for report runs / stored results |
| **Keep, generalise** | `pdf_report.PatientReport` | rename to a neutral report document; remove patient assumptions in the later-page header and title; add group headers, subtotals, repeat-header options, optional chart image |
| **Keep, extend** | `enrich_service` batch denormalisers; `procedure_totals_service.applied_totals`; `permission_service` + `require_permission` / `require_read_access`; `redis_store` cache helpers; SendGrid / Graph transports (add attachments); cron-script pattern until a worker exists | reusable plumbing |
| **Rework** | `report_service` metric functions | fold into the semantic layer; fix collections, A/R, aging, insurance receivable; add office scope and a right |
| **Rework** | `statement_service` | itemised lines, letterhead, remit slip, real e-mail, batch as a job |
| **Retire** | `transactions_service.transaction_feed`; `office_financial_summary` + the `/dashboard/summary` per-office loop; `insurance_receivables` (Python-side) | in-memory designs that cannot scale; replace with SQL on the unified ledger |
| **Retire over time** | Gen-1 canvas PDFs for statements | move onto the generalised kit |

### 5.3 Prerequisites the plan should schedule first

1. **Canonical ledger definition** (view or fact table) that unions the 7 stores with one sign rule and a `transaction_class` (charge, patient payment, insurance payment, patient adjustment by type, insurance write-off, refund, opening balance, balance transfer) — after profiling how legacy `LTYPE = 'I'` rows in `patient_payments` relate to `ledger_insurance_details` (double-count risk).
2. **One written definition per metric** (gross / net production, collections, adjustments, A/R, aging method, insurance A/R) agreed with the product owner, then implemented once.
3. **Tenant and office safety on fact reads**: every dataset joins `patients.tenant_id` or `offices.tenant_id`; office set resolved through `resolve_list_office_filter`.
4. **Report rights**: decide between the ~56 surviving legacy `reports_*` codes and a new compact set; add codes for the removed families that are in scope (recall, ortho, labels, postcards, Excel export, scheduling).
5. **Indexes / rollups** for `(office_id, date_of_service)`, `(office_id, payment_date)`, `provider_id`, `created_at`, claim dates.
6. **Async execution + artifact storage + XLSX dependency + e-mail attachments.**
7. **Postgres test fixture** so report SQL may use `date_trunc`, `FILTER`, window functions.

---

## 6. Open questions

1. How do migrated insurance payments appear — once in `patient_payments` (`payment_type='insurance'`), once in `ledger_insurance_details`, or both? Needs a DB profile before any collections figure is trusted.
2. Which A/R and aging definition is canonical (gross-charge dating vs applying `pat_paid` / `pat_adjust` / FIFO)? Should credit balances be reported separately?
3. Was `backfill_ledger_source_fields.py --restore-created-at` run in each environment? Without it a "created date" basis is impossible for migrated rows.
4. Is each organisation in its own database in practice, or do tenants share one? This sets the urgency of the untenanted child-table lists (§0 #9).
5. What async infrastructure is acceptable in production (Cloud Run jobs / Cloud Tasks vs a worker process on the PM2 host)? Is Redis available there?
6. How should collections be attributed to a provider when `patient_payments.provider_id` is nullable and allocations are unusable for history?
7. Legacy adjustment / payment codes (`TYPE2`) were collapsed to four payment methods at migration; is a re-import acceptable so "adjustments by type" works for history?
8. Should new-patient counts use first completed procedure / first kept appointment, given `patients.created_at` and `first_visit` are unusable for migrated patients?
