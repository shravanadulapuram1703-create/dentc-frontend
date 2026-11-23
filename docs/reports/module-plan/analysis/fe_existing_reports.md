# FE current state — Reports, Dashboard, My Page (analysis for the Reports & Analytics module plan)

_Static analysis only (code + docs read, nothing executed against a server/DB). Snapshot: 2026-11-21, branch `feature/uat-realse-v5`, working tree incl. the uncommitted API sync (`openapi.json` = 564 paths)._

**Legend** — **[V]** verified by reading the cited file/lines. **[I]** inference (reasoned from code or library semantics, not executed). Paths are relative to `dentc-frontend/` unless prefixed `dentc-backend/`. All API field names are snake_case as in the generated client.

---

## 0. TL;DR for planners

| # | Finding | Evidence |
|---|---|---|
| 1 | The Reports module is small: 24 files / 2,639 LOC in `src/components/reports/**` + `src/components/pages/Reports.tsx` (282 LOC). 6 runnable reports + 1 home page. No tests. | [V] `wc -l`; no `*.test.*` / e2e spec references it |
| 2 | **Every report and every KPI is computed in the browser** by paging CRUD list endpoints (`size` 200 × 3–8 pages) and reducing. Row caps: 600 / 800 / 1,000 / 1,600 depending on the hook. Totals are silently wrong above the cap (only a footer note). | [V] `src/components/dashboard/lib/aggregate.ts` L85-99 + callers |
| 3 | **Six server roll-up endpoints already exist in the generated client (tag `Reports`) and the UI consumes exactly one of them, once**: `getReportAccountsReceivable()` in `src/components/setup/insurance/InsuranceDashboard.tsx` L118. `/reports/summary`, `/reports/trends`, `/reports/aging`, `/reports/insurance-verification-summary`, `/dashboard/summary` have **zero** call sites. | [V] grep over `src` excluding `src/api/generated` |
| 4 | `docs/reports/reports_backend_devreport.md` is stale: G1, G2, G3, G7, G9, G10 are listed "Open" but are delivered in the current client; G8 is partly delivered. Four of the endpoints have been in the client since 2026-06-14 (commit `6c98daf`), i.e. before the doc's own "last updated 2026-07-05". | [V] §3.4 |
| 5 | The `ReportDefinition` / `ReportShell` framework is a good UX skeleton (catalog → filter → run → KPI cards + chart + table → export + saved views) but its contract is **functions, not data** (`accessor`, `format`, `render`, `fetch`, `icon`) — it cannot be served by a backend, cannot express legacy criteria (office group, multi-select, date basis, detail/summary, group-by, patient type, transaction types) and has no server pagination, async run, drill-down or audit. | [V] `src/components/reports/types.ts` |
| 6 | The legacy Denticon Reports menu (Daily … Statements, Lists, Interactive, Office Reports ×24, Letters/Postcards/Labels, My Reports, My Favorites, Search Report) was in the FE nav until commit `f7332be` (2026-07-05) and was then cut down to 6 entries. 10 orphan `PlaceholderPage` routes and 5 redirects remain in `src/App.tsx`. There is no catch-all route. | [V] §1.1, §1.2 |
| 7 | Reports are gated by `isAuthenticated` only — no right codes, no role check, nav not rights-filtered. The FE rights gate is dark anyway (`RIGHTS_ENFORCED_DEFAULT = false`). | [V] `src/App.tsx` L254-298, `src/features/access-control/rights.ts` |
| 8 | Office scope in reports predates enforcement: single-office `<select>` listing every active office to everyone, "All offices" = param omitted (never `all_offices=true`), no office-set / office-group support, although every list endpoint now accepts `all_offices`, `office_ids`, `office_group_id`, `include_global`. | [V] §2.3, §5 |
| 9 | Five concrete defects found in the runner (saved-view frozen dates, date-column sort, missing footer totals, provider picker excludes, exports without truncation notice). | [V] §2.11 |
| 10 | A lot of server reporting surface is generated but unused by the FE: office financial roll-ups, cross-patient transaction feed, statements (single/batch/account), time-clock report (JSON/CSV/PDF), lab cost report JSON, utilities run/job/audit. | [V] §3.3 |

---

## 1. Inventory

### 1.1 Routes (`src/App.tsx`)

| Route | Element | Kind | Gate | Lines |
|---|---|---|---|---|
| `/dashboard` | `Dashboard` (`src/components/Dashboard.tsx`, renders its own `AppShell`) | REAL | `isAuthenticated` | L135-142 |
| `/reports` | `Reports` (`src/components/pages/Reports.tsx`) inside `AdminPageWrapper` | REAL | `isAuthenticated` | L254-263 |
| `/reports/run/:reportId` | `ReportRunnerPage` → `ReportShell`; unknown id → `<Navigate to="/reports" replace>` | REAL (6 ids) | `isAuthenticated` | L266-275 |
| `/reports/ledger` | → `/reports/run/production` | REDIRECT | — | L278 |
| `/reports/appointment` | → `/reports/run/appointments` | REDIRECT | — | L279 |
| `/reports/treatment-plan` | → `/reports/run/treatment-plans` | REDIRECT | — | L280 |
| `/reports/insurance` | → `/reports/run/insurance-claims` | REDIRECT | — | L281 |
| `/reports/lists/patient-list` | → `/reports/run/patient-list` | REDIRECT | — | L284 |
| `/reports/lists/responsible-party-list` | `PlaceholderPage` "Responsible Party List" | PLACEHOLDER (orphan — no nav link) | `isAuthenticated` | L285 |
| `/reports/lists/provider-list` | `PlaceholderPage` "Provider List" | PLACEHOLDER (orphan) | same | L286 |
| `/reports/lists/security-list` | `PlaceholderPage` "Security List" | PLACEHOLDER (orphan) | same | L287 |
| `/reports/lists/setup-list` | `PlaceholderPage` "Setup List" | PLACEHOLDER (orphan) | same | L288 |
| `/reports/interactive/unsigned-progress-notes` | `PlaceholderPage` "Unsigned Progress Notes" | PLACEHOLDER (orphan) | same | L291 |
| `/reports/interactive/eligibility-verification` | `PlaceholderPage` "Eligibility Verification" | PLACEHOLDER (orphan) | same | L292 |
| `/reports/office/abbey-dental`, `/brightnow`, `/dha`, `/access-dental` | `PlaceholderPage` "<Name> Reports" | PLACEHOLDER (orphan; these are **other Denticon tenants'** bespoke reports — junk per `docs/setup/security/ACCESS_RIGHTS_CATALOG_AUDIT.md` L16, L70) | same | L295-298 |
| `/time-clock/report` | `TimeClockReportPage` (`src/features/time-clock/`) | REAL (bespoke, outside the report framework) | auth + client role check `canViewTeamTime(user.role)` | L334-343 |
| `/setup/insurance/dashboard` | `InsuranceDashboard` | REAL | auth; nav leaf hidden via `SETUP_NAV_RIGHTS` (dark) | L409 |
| `/my-page` | `MyPage` (`src/components/pages/MyPage.tsx`) | REAL | `isAuthenticated` | L480-486 |
| `/reports/daily`, `/monthly`, `/management`, `/referral`, `/recall`, `/ortho`, `/statements`, `/letters`, `/postcards`, `/labels`, `/custom-letter`, `/advanced-custom-letter`, `/custom-postcard`, `/my-reports`, `/blank-insurance-forms`, `/registration-forms`, `/my-favorites`, `/search`, `/old`, and 20 more `/reports/office/*` | — | **NO ROUTE** (and no `path="*"` catch-all in `App.tsx` → blank shell [I]) | — | — |

`PlaceholderPage` = `src/components/PlaceholderPage.tsx` (25 LOC, "Coming Soon" card) [V].

### 1.2 Navigation (`src/components/GlobalNav.tsx`)

**Current Reports dropdown** — `reportsMenuItems` L595-630, rendered L1737-1762 [V]:

| Label | Path | Kind |
|---|---|---|
| Reports Dashboard | `/reports` | REAL |
| Financial ▸ Production Report | `/reports/run/production` | REAL |
| Financial ▸ Collections Report | `/reports/run/collections` | REAL |
| Patient ▸ Patient List | `/reports/run/patient-list` | REAL |
| Appointment ▸ Appointment Report | `/reports/run/appointments` | REAL |
| Clinical ▸ Treatment Plan Report | `/reports/run/treatment-plans` | REAL |
| Insurance ▸ Insurance Claims Report | `/reports/run/insurance-claims` | REAL |

- There is **no** Lists / Interactive Reports / Office Reports sub-menu today — comment L592-594: "Legacy placeholder entries were removed." [V]
- The Reports dropdown is **not** rights-filtered. Only Setup is (`SETUP_NAV_RIGHTS` L96-130 + `filterNavByRights` L134-146, applied L1252) [V]. That path→right-codes map is the reusable pattern for report nav gating.
- Other report-ish nav leaves: Utilities ▸ User Functions ▸ "TimeClock Editor & Report" → `/time-clock/report` (L816-819); Setup ▸ Insurance ▸ Dashboard → `/setup/insurance/dashboard` (L981); top-bar "My Page" button (L1848-1854) [V].

**Legacy menu recoverable from git** — `git show f7332be^:src/components/GlobalNav.tsx` L499-745 held the Denticon-shaped menu (54 `/reports/` paths) [V]:

| Group | Entries (label → path) |
|---|---|
| Top level | Daily Reports `/reports/daily`, Monthly Reports `/reports/monthly`, Ledger Reports `/reports/ledger`, Management Reports `/reports/management`, Insurance Reports `/reports/insurance`, Appointment Reports `/reports/appointment`, Treatment Plan Reports `/reports/treatment-plan`, Referral Reports `/reports/referral`, Recall Reports `/reports/recall`, Ortho Reports `/reports/ortho`, Statements `/reports/statements` |
| Lists | Patient List, Responsible Party List, Provider List, Security List, Setup List (`/reports/lists/*`) |
| Interactive Reports | Unsigned Progress Notes, Eligibility Verification (`/reports/interactive/*`) |
| Office Reports | 24 tenant-specific entries (Abbey Dental, Access Dental, BrightNow, CHI St. Joseph, DCA, Dental Care, DHA, Great Hills, Hawaii Family Dental, Healthy Smiles for Kids, Healthcare Network, Kane Dental, Lumina, Kansas Head Start, Mid Atlantic, Nursing Home Dental Care, OnHealthCare, Ottawa, Pacific Center for Special Care, Premier Perio, Snodgrass-King, Tru Family Dental, Venture Health, Village Family Dental) |
| Correspondence | Letters `/reports/letters`, Postcards `/reports/postcards`, Labels `/reports/labels`, Custom Letter, Advanced Custom Letter, Custom Postcard |
| Personal / misc | My Reports `/reports/my-reports`, Blank Insurance Forms, Patient Registration / Medical Info Forms, My Favorites `/reports/my-favorites`, Search Report `/reports/search`, Reports (Old) `/reports/old` |

### 1.3 Screens → data sources

Mode key: **HOOK** = generated Orval hook bound directly; **CLIENT-AGG** = `fetchAllPages` over a list endpoint + reduce in browser; **SERVER-RPT** = server report/roll-up endpoint.

**Dashboard `/dashboard`** (`src/components/Dashboard.tsx` + `src/components/dashboard/**`, 1,975 LOC) [V]

| Widget (file under `dashboard/widgets/`) | Data hook → endpoint | Mode | Row cap |
|---|---|---|---|
| `DashboardHeader` | `useOfficeScope()` | local | — |
| `TodaysAppointmentsKpi` (Total / Checked In / Scheduled / Completed / Cancelled / No Shows) | `useTodayScheduler` → `useListSchedulerAppointments({date_from, date_to, ...officeFilter(office_id)})` → `GET /api/v1/appointments/scheduler`; bucketing `bucketAppointmentKpis` (`lib/dashboardUtils.ts` L127-156) from flags `is_blocked`, `is_cancelled`, `is_missed`, `checked_in_on`, `checked_out_on` | HOOK + client bucketing | unpaginated array |
| `TodaysScheduleWidget` | same feed (shared cache) + `useListDefinitions({group_code:"appt_status", is_active:true, size:200})` + `useUpdateAppointmentStatus` | HOOK | — |
| `PatientActivityWidget` | same feed + `useListPatients` ×2 (`created_at_from` count via `meta.total`; 15 most recent) | HOOK | — |
| `GlobalSearchWidget` | `useListPatients`, `useListAppointments`, `useListProviders`, `useListInsuranceCarriers` (size 6 each) + id lookups (`src/features/patients/patientLookup.ts`) | HOOK fan-out | — |
| `QuickActionsPanel` | none (deep links) | — | — |
| `PatientsKpi` (New Today / Active / Recall Due) | `useListPatients` ×2 with `size:1` → `meta.total`; `useRecallDue` → `fetchAllPages(listPatientRecalls({is_active:true, sort:"due_date", order:"asc"}), {maxPages:8})`, office filtered **client-side** | HOOK + CLIENT-AGG | 1,600 recalls |
| `ProductionCollectionKpi` (Scheduled = "—" "Awaiting backend" / Completed / Collection) | `useCompletedProductionToday` → `listPatientProcedures({date_of_service_from, date_of_service_to, is_void:false, ...officeFilter})`; `useCollectionToday` → `listPatientPayments({payment_date_from, payment_date_to, is_void:false, ...officeFilter})` | CLIENT-AGG | 1,000 each |
| `RevenueKpi` (Today / This Week / This Month — collections) | `useRevenue` → `listPatientPayments` over max(MTD, last 7 d), `{maxPages:8}` | CLIENT-AGG | 1,600 |
| `AnalyticsWidget` (Appointments bar, Daily Collections line, New Patients bar; 7/14/30 d; behind a "Load analytics" button) | `useAnalyticsSeries` → `listAppointments({is_archived:false})`, `listPatientPayments`, `listPatients({created_at_from/to, ...homeOfficeFilter})`, `{maxPages:3}` | CLIENT-AGG | 600 per source |

Worst case ≈ 30 list requests on dashboard load (sequential inside each `fetchAllPages`) [I]. Role personalisation = widget order only (`layoutForRole`, `Dashboard.tsx` L40-52); financial tiles are shown to every role [V]. `RIGHT.home.dashboardView` (`dashboard_view`) is defined but never referenced [V].

**Reports home `/reports`** (`src/components/pages/Reports.tsx`) [V]

| Block | Data hook → endpoint | Mode | Cap |
|---|---|---|---|
| Executive Summary — 7 tiles: Total Production, Total Collections, New Patients, Active Patients, Scheduled Appts, Insurance Receivables, **Outstanding A/R = hard-coded "—" / "Awaiting backend endpoint"** (L163-169) | `useExecutiveSummary` (`reports/lib/reportMetrics.ts` L68-143): 4× `fetchAllPages` (`listPatientProcedures`, `listPatientPayments`, `listInsuranceClaims({is_active:true})`, `listAppointments({is_archived:false})`) + 2× `listPatients({size:1})` for `meta.total` | CLIENT-AGG | 1,000 per source (claims are **not** date-scoped) |
| Analytics (opt-in "Load analytics"): Production vs Collections bar, Patient Growth bar, Procedure Distribution pie (top 6 `procedure_code` by Σ `fee` + "Other") | `useReportTrends` (L178-271), `{maxPages:4}`, bucket size from `granularityFor(range)` | CLIENT-AGG | 800 per source |
| Export CSV (6 KPI rows); PDF / Excel buttons permanently disabled (`ReportFilterBar.tsx` L86-102) | client | — | — |
| Report Library | `ReportCatalog` over the static `REPORTS` registry | static | — |

No office picker on the home page — it is bound to the working office (`currentOffice` → `toOfficeId`) [V].

**Report runner `/reports/run/:reportId`** — see §2.4 (all six are CLIENT-AGG).

**My Page `/my-page`** (`src/components/pages/MyPage.tsx` + `src/components/my-page/**`, 1,456 LOC) [V]

| Block | Source |
|---|---|
| `MyStatsStrip`, `MyScheduleWidget` | `useMySchedule` (`my-page/lib/useMyDay.ts`) = today's scheduler feed filtered to `MeFull.user.report_access_provider_id` (`getMeFull`, `GET /api/v1/auth/me/full`); unscoped (whole office) when the user has no provider link |
| `MyAlertsWidget` | today's feed + `useRecallDue`; the two recall alerts link to `/reports`, which has no recall report (dead end) |
| `MyTasksWidget`, `QuickLinksWidget`, notification prefs, collapsed state | `localStorage` `dentc:my-page:<bucket>:<userId>` (`my-page/lib/myPageStorage.ts`) — no backend |

**Insurance Dashboard `/setup/insurance/dashboard`** (`src/components/setup/insurance/InsuranceDashboard.tsx`) [V]: counts via list `meta.total` (`listInsurancePlans`, `listInsuranceClaims` per hard-coded status, `listInsuranceCarriers`, `listEmployers`, `listFeeSchedules`) + **SERVER-RPT `getReportAccountsReceivable()`** (no params → tenant-wide) reading `insurance_ar` (L118, L131). "Pending Verifications" still renders "—" / "Awaiting backend (INS-11)" (L200-207) although `getInsuranceVerificationSummary` exists.

**Time Clock Report `/time-clock/report`** (`src/features/time-clock/components/HoursReport.tsx`, 470 LOC) [V]: `fetchEntriesInRange` crawls `listTimeClockEntries` (200 × ≤60 pages, newest first) and computes regular / overtime client-side (`timeClockModel.ts`); CSV via `summaryCsv` / `detailCsv`; print via jsPDF (`timeClockPrint.ts`). Uses the standard `useReadScope("time-clock-report", {allow:"privileged", defaultMode:"all"})` + `<ScopeToggle>`. The server `GET /api/v1/reports/time-clock` (+ `/report.csv`, `/report.pdf`) is generated but unused.

### 1.4 Report-like outputs outside the Reports module

| Output | FE entry point | Source |
|---|---|---|
| Patient Overview / Ledger / Transactions / Insurance print | `openServerReport` (`src/features/print/serverReport.ts`) called from `PatientOverviewPage`, `LedgerPage`, `TransactionsEntryPage`, `InsurancePlanScreen` | **SERVER PDF** `GET /api/v1/patients/{patient_id}/reports/{overview,ledger,transactions,insurance}`; client jsPDF fallback (`src/features/print/patientPdf.ts`, `src/features/account-ledger/ledgerPrint.ts`); server writes a PRINT audit row (file comment L3-8) |
| Lab report, lab cost report, lab CSV | `src/features/lab-tracking/LabTrackingPage.tsx`, `labTrackingService.ts` | **SERVER** `GET /api/v1/appointments/lab-cases/report.pdf`, `/cost-report.pdf`, `/export.csv`; jsPDF fallback `labReportPrint.ts`. JSON `/cost-report` (`getLabCostReport`, `group_by` vendor/provider/office/month/dds, `date_basis` appointment/sent/due/received) unused |
| Treatment plan report | `src/features/treatment-plans/TreatmentPlanPage.tsx` L738 | SERVER JSON `GET /api/v1/treatment-plans/{plan_id}/report` → client jsPDF `txReport.ts` |
| ADA claim form | `src/features/claims/ada/adaClaimFormPdf.ts` | client jsPDF; server `GET /api/v1/insurance-claims/{claim_id}/reports/ada-claim-form` + batch `POST /api/v1/insurance-claims/reports/ada-claim-form` unused |
| Perio, Rx, payment plan, letters | `perioPrint.ts`, `rxPrint.ts`, `planPrint.ts`, `letterPdf.ts` | client jsPDF |
| Statements | no UI | server `POST /api/v1/patients/{patient_id}/statements`, `GET …/statements/{statement_id}/pdf`, `POST …/deliver`, `POST /api/v1/offices/{office_id}/statements/batch`, `POST /api/v1/accounts/{account_id}/statements` — 0 importers |

### 1.5 Libraries available (`package.json`) [V]

| Need | Present | Absent |
|---|---|---|
| Charts | `recharts ^3.6.0`; unused shadcn wrapper `src/components/ui/chart.tsx` | — |
| PDF | `jspdf ^4.2.1`, `jspdf-autotable ^5.0.8` (12 importers) | — |
| Spreadsheet | hand-rolled SpreadsheetML 2003 writer (`exportExcel.ts`) | any xlsx library |
| Tables | hand-rolled `DataTable.tsx`; shadcn `ui/table.tsx`, `ui/pagination.tsx` | `@tanstack/react-table`, virtualisation, grid |
| Data | `@tanstack/react-query ^5.100`, `axios ^1.13`, `orval ^8.14` | — |
| Forms / inputs | `react-hook-form`, `zod`, `react-day-picker ^9.13`, `cmdk`, Radix primitives, `DualListPicker` (`src/components/setup/offices/DualListPicker.tsx`) | date library (date-fns/dayjs), drag-and-drop, dashboard grid layout |

React Query defaults (`src/shared/config/queryClient.ts`): `staleTime 30 s`, `retry 1`, `refetchOnWindowFocus false`, and a **global `QueryCache.onError` toast** [V]. Axios (`src/services/api.ts`): no `timeout`, `paramsSerializer: { indexes: null }` (arrays → repeated keys, so `office_ids` works), `X-Office-ID` on every request [V].

---

## 2. The `ReportDefinition` / `ReportShell` framework

### 2.1 Type contract (`src/components/reports/types.ts`) [V]

| Type | Shape | Notes |
|---|---|---|
| `FilterKind` (L15) | `"dateRange" \| "office" \| "provider" \| "status" \| "search"` | closed set of 5 built-ins |
| `ExtraFilter` (L23-29) | `{ key, label, options: SelectOption[], defaultValue? }` | single-select `<select>` with static options only |
| `ReportFilters` (L32-45) | `{ preset: RangePreset, range: {from,to}, office: number \| null, provider: string, status: string, search: string, extra: Record<string,string> }` | fixed shape, one office, all strings |
| `ColumnDef<Row>` (L53-70) | `{ key, header, align?, accessor(row), render?(row), format?(row), sortable?, total?, currency?, pdfWidth? }` | functions → not serialisable; `total` = sum only |
| `SummaryCard` (L76-82) | `{ label, value: string, tone?, hint?, icon? }` | value is a pre-formatted string |
| `ChartSpec` (L93-100) | `{ kind: "bar" \| "pie", title, data: {label, value, value2?}[], currency?, seriesLabels?: [string,string] }` | max 2 series |
| `ReportData<Row>` (L102-108) | `{ rows: Row[], summary: SummaryCard[], chart?: ChartSpec, truncated: boolean }` | **all rows in memory** |
| `ReportCategory` (L114-119) | `"Financial" \| "Patient" \| "Appointment" \| "Clinical" \| "Insurance"` | closed union |
| `ReportDefinition<Row>` (L121-139) | `{ id, title, description, category, icon: LucideIcon, filters: FilterKind[], statusOptions?, extraFilters?, columns, defaultPreset?, fetch(filters): Promise<ReportData<Row>> }` | no rights, tags, version, outputs, grouping |
| `AnyReportDefinition` (L146) | `ReportDefinition<any>` | needed for the mixed registry |

Unused contract members across the six definitions: `ColumnDef.render`, `ColumnDef.sortable`, `ColumnDef.pdfWidth`, `SummaryCard.icon` [V].

Registry: `src/components/reports/reportCatalog.ts` — `REPORTS: AnyReportDefinition[]` (6), `getReport(id)`, `CATEGORIES` (5, with Tailwind accent), `reportsByCategory()` [V].

### 2.2 Run lifecycle (`components/ReportShell.tsx`, 325 LOC) [V]

1. `ReportRunnerPage` resolves `getReport(reportId)` and mounts `<ReportShell key={office_id ?? "none"}>` — an office switch remounts the shell (filters re-seeded, unsaved edits lost) (`pages/ReportRunnerPage.tsx` L19-25).
2. `initialDraft()` (L42-57): preset = `def.defaultPreset ?? "this_month"`; office = working office when the report has the `office` filter; extras from `defaultValue`.
3. Two states: `draft` (form) and `applied` (query). `applied` is seeded from the same initial draft → **the report auto-runs on mount** (L85-87).
4. `useQuery({ queryKey: ["reports","run", def.id, applied], queryFn: () => def.fetch(applied), staleTime: 60_000 })` (L94-98). `def.fetch` receives no `AbortSignal` → in-flight page fetches cannot be cancelled.
5. "Run report" → `setApplied(resolveFilters(draft))`; "Reset" re-seeds both.
6. Render order: header (back arrow, icon, title, description) → `ReportFilterPanel` → saved-views chips → `KpiStat` grid → `ReportChart` → `WidgetCard "Results"` with export buttons + `DataTable` + truncation footer.
7. Filter state is **not** in the URL (no deep link to a filtered run; refresh loses filters).

### 2.3 How filters render (`components/ReportFilterPanel.tsx`, 254 LOC) [V]

| Control | Rendered when | Widget | Option source |
|---|---|---|---|
| Date range | `filters` has `dateRange` | native `<select>` of 7 presets (`PRESET_LABELS`): Today, Yesterday, This Week (Mon-start), This Month, This Quarter, This Year, Custom Range | `lib/reportRange.ts` |
| From / To | preset = `custom` | two native `<input type="date">` | — |
| Office | `office` | native `<select>`: "All offices" + optgroups "My offices" / "Other offices" (+ a synthetic "Office <id>" option for a deactivated / saved office) | `useOffices()` = `useOfficeOptions()` filtered to `is_active` |
| Provider | `provider` | native `<select>` "All providers" + flat list; reset when office changes (L131) | `useProviders(office)` → `fetchProvidersForOffice` (`scopeToOffice`: roster, else everyone) |
| Status | `status` and `def.statusOptions` | native `<select>` "All statuses" + hard-coded options | definition |
| Extras | each `def.extraFilters` | native `<select>` | definition (static) |
| Keyword | `search` | text input → server `search` param | — |

4-column responsive grid, `<form onSubmit>` = Run. No required-field validation, no multi-select, checkbox, radio, number/amount range, async option loading, or dependent filters beyond office→provider.

### 2.4 The six definitions (`src/components/reports/reports/*.ts`) [V]

| `id` | Category | Filters (default preset) | Endpoint + params actually sent | Row cap | Columns | Summary cards | Chart |
|---|---|---|---|---|---|---|---|
| `production` | Financial | dateRange, office, provider, search (this_month) | `listPatientProcedures({date_of_service_from, date_of_service_to, office_id, provider_id, search, is_void:false, page, size})` + `loadProviderMap` | 1,000 | Date, **Patient ID**, Provider, Code, Tooth, Surface, Billing (`billing_status`), Est Ins (`insurance_estimate`), Fee (total) | Total Production, Procedures, Avg Fee | bar "Production over time" |
| `collections` | Financial | dateRange, office, provider, search (this_month) | `listPatientPayments({payment_date_from, payment_date_to, office_id, provider_id, search, is_void:false, page, size})` + `loadProviderMap` | 1,000 | Date, **Patient ID**, Provider, Type (`payment_type`), Method (`payment_method`), Check # (`check_number`), Amount (total) | Total Collections, Payments, Avg Payment | bar "Collections over time" |
| `patient-list` | Patient | office, status (active/inactive), search | `listPatients({home_office_id, is_active, search, page, size})`, `{maxPages:8}` | 1,600 | Pat ID, Chart # (`chart_no`), Patient, DOB, Phone (`cell_phone`/`phone`), Email, City, Status, Added (`created_at`) | Patients (`meta.total`), Active, Inactive (loaded rows only) | pie "Active vs inactive (loaded page)" |
| `appointments` | Appointment | dateRange, office, provider, status (this_week) | `listSchedulerAppointments({date_from, date_to, office_id})` + `fetchArchivedAppointmentIds` (pages `GET /appointments?is_archived=true`) + `loadProviderMap`; **provider and status filtered client-side** | none — whole array | Date, Time, Patient (`patient_name`), Provider, Operatory, Procedure (`procedure_label`), Min, Status (derived) | Appointments, Active, Cancelled, Missed | pie "By status" |
| `treatment-plans` | Clinical | office, status (proposed/accepted/active/completed/rejected), search | `listTreatmentPlans({office_id, status, search, page, size})`, `{maxPages:8}` | 1,600 | Plan ID, **Patient ID**, Plan Name, Status, Created | Plans (`meta.total`), Loaded, Statuses | pie "By status" |
| `insurance-claims` | Insurance | office, status (submitted/accepted/paid/denied/rejected/pending), search + extra `active` (Active only / Inactive only / All) | `listInsuranceClaims({office_id, status, search, is_active, page, size})`, `{maxPages:8}` | 1,600 | Claim # (`claim_number`), **Patient ID**, Type (`claim_type`), Status, Submitted (`submitted_date`), Billed (`total_billed`), Paid (`total_paid`), Outstanding (3 totals) | Claims (`meta.total`), Total Billed, Total Paid, Outstanding | pie "By status" |

Shared helpers `reports/helpers.ts`: `fmtDate`, `fmtTime`, `money`, `timeSeries` (bucket by `granularityFor`), `distribution` [V].

### 2.5 Pagination and truncation [V]

- `fetchAllPages(fetchPage, {size = 200, maxPages = 5})` (`dashboard/lib/aggregate.ts` L85-99): fetches page 1, then pages 2…min(`meta.pages`, `maxPages`) **sequentially**; returns `{ items, total: meta.total, truncated: meta.pages > maxPages }`.
- `truncated` surfaces only as a grey footer line. In `ReportShell` L312-318 the user-visible text literally cites `docs/reports/reports_backend_devreport.md`.
- Summary cards, chart series and footer totals are computed over the loaded rows, so a truncated run under-reports money with no marker on the number itself (the audit's own live check hit the cap: "Production over 2024-09 = 1,000 rows", `docs/reports/reports_audit.md` L127).

### 2.6 Results table (`components/DataTable.tsx`, 220 LOC) [V]

Client-side over the in-memory rows: global substring search across every column's `cellText`, single-column sort, page sizes `[25, 50, 100, 200]` (default 50), "n–m of N", Prev / Next. Rows keyed by index. No row click, selection, column chooser, grouping, subtotals, or footer totals.

### 2.7 Export paths [V]

| Format | Code | How | Limits |
|---|---|---|---|
| CSV | `lib/exportCsv.ts` | UTF-8 BOM + RFC-4180 quoting, `<a download>` blob | data rows only — no title/filter header, no totals row; no formula-injection neutralisation (`=`, `+`, `-`, `@` prefixes) |
| Excel | `lib/exportExcel.ts` | SpreadsheetML 2003 XML saved as **`.xls`**, one sheet, title + subtitle rows, styled header, totals row | only `currency` / `total` columns become numeric cells (L17-19) — other numbers and all dates export as text; not a real `.xlsx` |
| PDF | `lib/exportPdf.ts` (`buildReportPdf`) | jsPDF + autotable, landscape Letter, striped, title / subtitle / summary chips / "Generated <local time>", bold totals row | no page numbers, no office letterhead/logo, no group breaks; all rows rendered in the browser |
| Print | `openReportPdf` | same PDF via `doc.output("dataurlnewwindow")` | popup-blocker dependent [I]; not `window.print` |

All four share `lib/exportMatrix.ts` (`buildMatrix`, `cellText`) so content is identical. All export **only the rows the browser fetched** (so the cap applies) and write no audit record. File name = `<def.id>_<from>_<to>` even for reports without a date filter; the subtitle carries preset + range + office + status + keyword but **not** provider or extra filters (`ReportShell.tsx` L106-114, L126).

### 2.8 Saved views (`lib/savedViews.ts`, 72 LOC) [V]

- `localStorage` key `dentc:reports:views:<user_id>:<reportId>` → `SavedView[] = { id, name, filters: ReportFilters, createdAt }`.
- Per user, per browser; add / apply / remove chips in `ReportShell`; no rename, default view, sharing, or scheduling.
- Applying a view whose office is no longer in `allowed_office_ids` falls back to the working office with a warning toast (`ReportShell.tsx` L152-163).

### 2.9 Strengths worth keeping

| Strength | Where |
|---|---|
| One declarative unit per report; the shell owns all UI | `types.ts` L1-4, `ReportShell.tsx` L1-4 |
| Clear page anatomy users already know: filters → Run → KPI cards → chart → table → export bar → saved views | `ReportShell.tsx` |
| Truncation is surfaced rather than hidden | `aggregate.ts` L77, `ReportShell.tsx` L312-318 |
| One export matrix feeding every output format | `lib/exportMatrix.ts` |
| Rows bound directly to generated snake_case models (no camelCase mapping layer) | `reports/*.ts` |
| Office-aware seeding, remount on office switch, deactivated-office option kept selectable, saved-view office fallback | `ReportShell.tsx`, `ReportFilterPanel.tsx` L48-61 |
| Provider labels from the shared directory as "Name (ID)" (providers share names) | `lib/useReportRefData.ts`, `appointmentReport.ts` L67-68 |
| Timezone-safe date handling (`YYYY-MM-DD` parts, never `new Date("YYYY-MM-DD")`) | `reports/helpers.ts` L1-3, `lib/reportRange.ts` |
| Shared loading / error / empty / awaiting-backend card (`WidgetCard`) and KPI tile (`KpiStat`, already has `onClick` for drill-down) reused by 15 files | `src/components/dashboard/components/` |

### 2.10 Hard limits for a 100+ report catalog executed server-side

| Area | Limit today | Needed for the legacy catalog / engine |
|---|---|---|
| Definition transport | TS objects with functions and a component reference (`icon`) compiled into the bundle | JSON definitions served by the backend (`report_key`, params schema, column schema, outputs, rights) + a local icon map keyed by string |
| Parameters | 5 built-ins + static single-selects; one office; strings only | office **set** / office group, provider multi-select, user, date **basis** (transaction vs created date), patient type (General / Ortho), transaction-type checklist, carrier / plan, procedure-code range, amount range, detail vs summary, group-by, sort-by, page-break, output format; required/validation; async option sources; dependent params |
| Execution | synchronous `useQuery` running a client function; auto-run on mount; not cancellable | `POST` run → job id → poll/stream → paged result; cancel; run history; cached re-open |
| Result size | everything in memory, 1,000–1,600 row cap | server pagination + server sort + server totals over the full population |
| Columns | flat list; sum-only footer; no types | typed columns (date / money / int / percent / text / link), aggregates (sum / avg / count / min / max), group headers + subtotals, pivot/matrix (e.g. trailing-12-month grid), column chooser, frozen columns |
| Charts | bar / pie, ≤ 2 series, built client-side | line / area / stacked / combo / sparkline, N series, server-computed series |
| KPI cards | pre-formatted string | value + unit + prior-period delta + target + drill target |
| Drill-down | none (money reports show numeric `patient_id`) | row → patient / claim / appointment; KPI → filtered report |
| Categories | 5-value union | ~20 legacy menu groups + tags + search keywords + legacy report name/number |
| Security | route = `isAuthenticated`; no right codes | per-report rights, row-level office scope enforced server-side, PHI export audit |
| Saved state | `localStorage` per browser | server-side saved views, favorites, recents, defaults, sharing, schedules |
| Exports | client-built from loaded rows; `.xls` XML; no audit | server XLSX / PDF / CSV over the full result, letterhead, audit row, email delivery |
| Deep links | filters not in URL | shareable URL / run id |

### 2.11 Defects found while reading (all [V] in code; runtime effect [I])

| # | Defect | Location | Effect |
|---|---|---|---|
| D1 | Applying a saved view never re-resolves a relative preset: `applyView` calls `setApplied(f)` with the stored `f.range` | `ReportShell.tsx` L152-175 (contradicts the comment in `savedViews.ts` L12) | a "This Month" view saved in October runs October's dates in November while the subtitle says "This Month" |
| D2 | Sort compares `Number.parseFloat(String(value))` when both parse as finite | `DataTable.tsx` L52-56 | ISO dates (`"2024-09-03"` → 2024), times (`"14:30:00"` → 14) and UUID-ish ids sort by their leading number only → Date / Time / Added / Created columns do not sort correctly |
| D3 | `ColumnDef.total` is documented as "Sum this column into the table footer" but `DataTable` renders no `<tfoot>`; CSV has no totals row either | `types.ts` L64-65 vs `DataTable.tsx` | totals exist only in Excel / PDF |
| D4 | Provider filter uses `fetchProvidersForOffice` → `scopeToOffice` ("roster, else everyone") | `lib/useReportRefData.ts` L50-56; warned against in `src/services/providerDirectory.ts` L266-274 | a provider who produced in an office but is not on its sparse roster cannot be picked (violates "prefer, never exclude") |
| D5 | Office picker lists every active office to every user and labels the omitted-param case "All offices"; comment says "assignments are not enforced yet" | `ReportFilterPanel.tsx` L41-43, L134-151 | with `OFFICE_ASSIGNMENT_ENFORCED = true` a non-privileged user picking an unassigned office gets `403 office_not_assigned`; "All offices" is really "my assigned offices" on scoped lists and is never sent as `all_offices=true` |
| D6 | Exports carry no truncation notice and omit provider / extra filters from the subtitle | `ReportShell.tsx` L106-145 | a capped export looks complete |
| D7 | Three different hard-coded claim-status vocabularies | `reportMetrics.ts` L34-43 (outstanding = not in paid/denied/rejected/void/voided/closed/cancelled/canceled); `InsuranceDashboard.tsx` L42-43 (outstanding = submitted/pending/draft); `insuranceClaimReport.ts` L20-27 | "outstanding claims" differs per screen; `src/components/patient/claimLifecycle.ts` also uses `draft` / `created` / `new` / `closed` |
| D8 | Collections sums `amount` of every non-void `patient_payments` row | `collectionsReport.ts` L51, `reportMetrics.ts` L121, `useMetrics.ts` L52, L115 | includes `payment_type = 'adjustment'` rows (debit adjustments, `src/features/transactions/transactionCodes.ts` L353-360) and takes the stored sign as-is although other screens use `-Math.abs(amount)` (gap AL-9, `transactionsModel.ts` L298-299) |
| D9 | Stale comments now contradicted by the generated client: "feed takes only date + office", "carries no is_archived flag", "`/patient-recalls` has no office param", "no backend trends API yet" | `appointmentReport.ts` L1-4, L65-66; `useMetrics.ts` L10-11, L130-138; `Reports.tsx` L179-180; `AnalyticsWidget.tsx` L63-64 | misleads the next change |

---

## 3. Server report endpoints — consumption, params, shapes

### 3.1 The six `Reports`-tagged operations (`src/api/generated/endpoints/reports/reports.ts`, 604 LOC) [V]

| Endpoint | Generated fn / hook | In client since | App call sites (outside `src/api/generated`) |
|---|---|---|---|
| `GET /api/v1/reports/summary` | `getReportSummary` / `useGetReportSummary` | 2026-06-14 (`6c98daf`) | **none** |
| `GET /api/v1/reports/trends` | `getReportTrends` / `useGetReportTrends` | 2026-06-14 | **none** |
| `GET /api/v1/reports/accounts-receivable` | `getReportAccountsReceivable` / `useGetReportAccountsReceivable` | 2026-06-14 | **1**: `src/components/setup/insurance/InsuranceDashboard.tsx` L26, L118 — called with no params, reads `insurance_ar` only |
| `GET /api/v1/reports/aging` | `getReportAging` / `useGetReportAging` | 2026-06-14 | **none** |
| `GET /api/v1/reports/insurance-verification-summary` | `getInsuranceVerificationSummary` / `useGetInsuranceVerificationSummary` | 2026-06-16 (`e0daaf4`) | **none** |
| `GET /api/v1/dashboard/summary` | `getDashboardSummary` / `useGetDashboardSummary` (returns `unknown`) | 2026-09-20 (`b7175f5`) | **none** |

### 3.2 Exact request params and response shapes [V] (`src/api/generated/model/*`, cross-checked with `openapi.json`)

**`GET /api/v1/reports/summary`** — `GetReportSummaryParams { date_from: string (required), date_to: string (required), office_id?: number | null }`
→ `ReportSummary { production?: number, collections?: number, new_patients?: number, active_patients?: number, scheduled_appointments?: number, insurance_receivables?: number, outstanding_ar?: number, office_id?: number | null, date_from: string, date_to: string, as_of: string }`.
Doc comments: `production` = Σ procedure fees (non-void) in window; `collections` = Σ patient payments (non-void) in window; `active_patients` is point-in-time; `scheduled_appointments` = non-cancelled, non-blocked; `insurance_receivables` = Σ (`total_billed` − `total_paid`) of outstanding active claims; `outstanding_ar` is cumulative as of `date_to`, not bounded by `date_from`. Values are JSON **numbers** (not decimal strings).

**`GET /api/v1/reports/trends`** — `GetReportTrendsParams { date_from (req), date_to (req), interval?: "day" | "week" | "month" (default "day"), office_id?: number | null }`
→ `ReportTrends { interval: string, buckets: TrendBucket[], office_id?, date_from, date_to, as_of }`, `TrendBucket { period: string (ISO date of bucket start), production?: number, collections?: number, new_patients?: number }`.
`interval` matches the FE's `granularityFor()` values one-to-one. No procedure-mix, no appointments series.

**`GET /api/v1/reports/accounts-receivable`** — `GetReportAccountsReceivableParams { office_id?: number | null, as_of?: string | null }`
→ `AccountsReceivable { total_ar?: number, patient_ar?: number, insurance_ar?: number, office_id?, as_of: string }` (`total_ar` = charges − payments − adjustments all-time ≤ `as_of`; `patient_ar` = `total_ar` − `insurance_ar`; `insurance_ar` "best-effort").

**`GET /api/v1/reports/aging`** — `GetReportAgingParams { office_id?: number | null, as_of?: string | null }`
→ `Aging { current?: number (0–30), d30?: number (31–60), d60?: number (61–90), d90?: number (91–120), d120_plus?: number, total?: number, office_id?, as_of }`. Aged by each charge's `date_of_service` ("gross-charge dating, Option A"; net-of-payment FIFO is noted as a future refinement). Totals only — no per-patient / per-guarantor / per-carrier / per-provider rows.

**`GET /api/v1/reports/insurance-verification-summary`** — `GetInsuranceVerificationSummaryParams { office_id?: number | null }`
→ `InsuranceVerificationSummary { by_status?: { [elig_status: string]: number }, total?: number, verified?: number, pending?: number, office_id?, as_of }` (single GROUP BY over `insurance_subscribers`; NULL/blank status → `"unknown"`).

**`GET /api/v1/dashboard/summary`** — `GetDashboardSummaryParams { office_id?: number | null, date?: string | null (collections day, default today), all_offices?: boolean, office_ids?: number[] | null, office_group_id?: number | null, include_global?: boolean | null }` (+ `X-Office-ID` header).
OpenAPI 200 schema is `{}` → Orval types the response as `unknown`. Shape verified in `dentc-backend/app/api/v1/dashboard.py` L80-109 (route returns a dict, no `response_model`):
`{ office_ids: number[], all_offices: boolean, date: string | null, outstanding_balance, patient_balance, insurance_receivable, credit_balance, patient_count: number, collections: { patient_payments, insurance_payments, total_collections, payment_count: number } }` (money = `Decimal`).
Target-office resolution (same file L44-63): `office_id` → `office_ids` → `office_group_id` (∩ assigned unless unrestricted) → `all_offices=true` (requires the all-offices right) → default = caller's assigned offices (whole tenant when unrestricted). It loops the per-office roll-ups server-side.

**Scope note** — the five `/reports/*` routes accept only `office_id` ("omit for all offices") and their router has no office-scope dependency (`dentc-backend/app/api/v1/reports.py` L26-110) [V router file only; `report_service` not read]. So unlike `/dashboard/summary` and the list endpoints they have no `all_offices` / `office_ids` / `office_group_id`, and whether they validate `office_id` against the caller's assignments is an open question for the backend analysts.

### 3.3 Other server roll-up / report endpoints present in the generated client

| Endpoint | Generated fn | Response model | App call sites |
|---|---|---|---|
| `GET /api/v1/offices/{office_id}/financial-summary` (DASH-1) | `getOfficeFinancialSummary` | `OfficeFinancialSummary { office_id, outstanding_balance, patient_balance, insurance_receivable, credit_balance?, patient_count?, as_of }` (decimal strings) | none |
| `GET /api/v1/offices/{office_id}/collections` (DASH-2) — `period` today/week/month/year/custom, `date_from`, `date_to` | `getOfficeCollections` | `CollectionsSummary { office_id, period, date_from, date_to, patient_payments?, insurance_payments?, total_collections?, payment_count?, as_of }` | none |
| `GET /api/v1/offices/{office_id}/insurance-receivables` (DASH-3) | `getOfficeInsuranceReceivables` | `InsuranceReceivables { office_id, total_outstanding?, open_claim_count?, by_carrier?: CarrierReceivable[] {carrier_id, carrier_name, outstanding, claim_count}, as_of }` | none |
| `GET /api/v1/offices/{office_id}/adjustment-summary` (DASH-4) — `period`, `date_from`, `date_to` | `getOfficeAdjustmentSummary` | `AdjustmentSummary { office_id, period, date_from, date_to, adjustment_total?, write_off_total?, refund_total?, write_off_by_type?: {[type]: string}, as_of }` | none |
| `GET /api/v1/offices/{office_id}/transactions` (DASH-5) and `GET /api/v1/transactions` — `search`, `type` all/charge/payment/adjustment/refund/claim, `status`, `date_from`, `date_to`, `amount_min`, `amount_max`, `transaction_number`, `page`, `size` (+ `office_id` on the second) | `getOfficeTransactions`, `searchTransactions` | `TransactionFeed { rows: TransactionRow[], total, page, size, pages, as_of }`, `TransactionRow { transaction_number, transaction_type, source_id, entry_date?, patient_id?, patient_name?, office_id?, provider_id?, provider_name?, code?, description?, amount?, status? }` | none — closest existing source for a day-sheet style report |
| `GET /api/v1/reports/time-clock`, `/report.csv` (`layout` summary/detail), `/report.pdf` (`detail`) — `from`, `to` (required), `user_id`, `office_id`, `overtime_method`, `include_wages`, office-scope params | `getTimeClockReport`, `getTimeClockReportCsv`, `getTimeClockReportPdf` | `TimeClockReport { date_from, date_to, timezone_note, overtime_method_override?, include_wages, users: ReportUser[], totals: ReportTotals, generated_at }` | none (FE crawls entries instead) |
| `GET /api/v1/appointments/lab-cases/cost-report` | `getLabCostReport` | `LabCostReport { date_from?, date_to?, date_basis, group_by, rows: {key?, label, case_count, total_cost}[], case_count, total_cost }` | none (PDF + CSV variants are used) |
| `GET /api/v1/treatment-plans/{plan_id}/summary`, `GET /api/v1/treatment-plan-items/pending-summary` | `getTreatmentPlanSummary`, `listPendingTreatmentSummaries` | `TreatmentPlanSummary`, `PendingTreatmentSummary(Batch)` | none (the scheduler badge computes its own summary in `src/features/treatment-plans/pendingTreatment.ts`) |
| Statements: `POST /api/v1/patients/{patient_id}/statements`, `GET …/statements`, `GET …/{statement_id}/pdf`, `POST …/deliver`, `POST /api/v1/offices/{office_id}/statements/batch`, `POST /api/v1/accounts/{account_id}/statements` | `generatePatientStatement`, `listPatientStatements`, `getPatientStatementPdf`, `deliverPatientStatement`, `generateStatementBatch`, `generateAccountStatement` | `StatementRead`, `StatementBatchResult` | none |
| Utilities job pattern: `POST /api/v1/utilities/{utility_id}/run`, `GET /api/v1/utilities/jobs/{job_id}`, `GET /api/v1/utilities/audit` | `runUtility`, `getUtilityJob`, `listUtilityAudit` | `UtilityRunRead { id, utility_id, office_id?, run_by?, status, parameters?, processed, succeeded, failed, logs?, created_at, finished_at? }` | none (the FE Utilities hub still simulates + `localStorage`) — an existing run / job / audit precedent |
| `GET /api/v1/office-groups` (+ CRUD) | `listOfficeGroups` | `OfficeGroupRead { id, tenant_id, name, … }`; `OfficeRead.office_group_id` | used by Setup (`OfficeGroupsSetup.tsx`, `FeeScheduleWizard.tsx`, `InfoTab.tsx`) — available for an "Office Group" report criterion |

"None" = no importer of the generated function and no raw-path caller found by grep.

### 3.4 Drift: `docs/reports/reports_backend_devreport.md` (2026-07-05) vs the generated client today [V]

| Gap | Doc status | Actual |
|---|---|---|
| G1 aggregation endpoints | Open | `/reports/summary`, `/reports/trends` exist. Not delivered: `provider_id` param, procedure-mix endpoint |
| G2 practice-wide A/R | Open | `/reports/accounts-receivable` exists |
| G3 aging | Open | `/reports/aging` exists (totals only; the suggested `by_responsible_party` breakdown is absent) |
| G4 server export / email / schedules | Open | still open for generic reports; server PDF/CSV exist only for specific documents (§1.4, §3.3) |
| G5 status enums | Open | still free strings (`status: string` on claims, plans, appointments, recalls) |
| G6 `office_id` list filter | Resolved | plus `all_offices`, `office_ids`, `office_group_id`, `include_global` on `ListPatientProceduresParams`, `ListPatientPaymentsParams`, `ListInsuranceClaimsParams`, `ListTreatmentPlansParams`, `ListPatientRecallsParams`, `ListPatientsParams`, `ListAppointmentsParams` |
| G7 denormalised names | Open | delivered: `PatientProcedureRead.patient_name` / `provider_name` (+ `paid_to_date`, `insurance_paid_to_date`, `adjusted_to_date`, `remaining_amount`, `outstanding_amount`); `PatientPaymentRead.patient_name` / `provider_name`; `InsuranceClaimRead.patient_name` / `carrier_name`; `TreatmentPlanRead.patient_name`; `ListPatientsParams.ids` bulk lookup |
| G8 scheduler feed params | Open | partly: `ListSchedulerAppointmentsParams` now has `provider_id`, `status`, `include_archived`; `AppointmentSchedulerRead.is_archived` exists; still an unpaginated array |
| G9 plan totals | Open | delivered: `TreatmentPlanRead.item_count`, `total_fee`, `est_insurance`, `est_patient` |
| G10 claims date filter | Open | delivered: `submitted_date_from/to`, `paid_date_from/to`, `created_at_from/to` |
| (dashboard) recall office filter | "no office param" | `ListPatientRecallsParams.office_id` exists; still no `due_date_from/to` |

`docs/dashboard/dashboard_backend_devreport.md` ("no aggregation / reporting / analytics / stats / dashboard endpoints whatsoever") and `docs/CONSOLIDATED_BACKEND_GAPS.md` §5f (REPORTS-G1/G2/G3/G7/G9/G10 open) are stale in the same way.

### 3.5 Metric definitions that will not reconcile as-is

| Metric | Client today | Server fields available |
|---|---|---|
| Production | Σ `fee` of non-void `patient_procedures` by `date_of_service`, first ≤ 1,000 rows, any `billing_status` (gross; no net production anywhere) | `ReportSummary.production`, `TrendBucket.production` |
| Collections | Σ `amount` of non-void `patient_payments` by `payment_date`, all `payment_type`s incl. `adjustment`, stored sign (D8) | `ReportSummary.collections` ("patient payments"); `CollectionsSummary.patient_payments` / `insurance_payments` / `total_collections`; `/dashboard/summary.collections.*` |
| Insurance A/R | Σ max(0, `total_billed` − `total_paid`) on the first ≤ 1,000 active claims whose status is not terminal | `ReportSummary.insurance_receivables`; `AccountsReceivable.insurance_ar`; `OfficeFinancialSummary.insurance_receivable`; `InsuranceReceivables.total_outstanding` (+ `by_carrier`) — four server numbers |
| Total A/R | not computed | `ReportSummary.outstanding_ar`; `AccountsReceivable.total_ar`; `Aging.total`; `OfficeFinancialSummary.outstanding_balance` |
| Scheduled appointments | non-cancelled, non-blocked within the first ≤ 1,000 rows | `ReportSummary.scheduled_appointments` |
| Recall due | client bucket of active recalls by `due_date` (≤ 1,600), null-office rows reported as "Unassigned" | none |

One canonical metric dictionary (server-owned) is a prerequisite for KPI dashboards; the FE currently has two or three definitions for several of these.

---

## 4. Keep / extend / rewrite — per piece, for a server-driven report engine

| Piece | Verdict | What to do |
|---|---|---|
| `reports/types.ts` (`ReportDefinition`) | **Rewrite the contract, keep the idea** | Replace with a serialisable definition fetched from the backend: `report_key`, title, category, tags, rights, `params[]` (typed, with option sources and dependencies), `columns[]` (key, label, data type, format, align, aggregate, width, drill target), group-by / sort options, output formats, chart specs. Keep a thin adapter so the 6 legacy definitions keep working during migration. |
| `reports/reportCatalog.ts` | **Rewrite** | Catalog from the API, cached by React Query; icons via a string-keyed local map (pattern already used in `my-page/widgets/QuickLinksWidget.tsx` L29-58: "Icon keys are stored, not components"). |
| `components/ReportShell.tsx` | **Extend (keep layout, replace engine)** | Keep page anatomy. Swap `def.fetch` for a run lifecycle hook (start → poll → paged results → cancel), put params in the URL, add run history / "last run", server exports, schedule + favorite actions. Do not auto-run heavy reports on mount. |
| `components/ReportFilterPanel.tsx` | **Rewrite as a schema-driven param form** | Renderer per param kind. Start from the Utilities model (`src/components/utilities/types.ts` `ParamKind`: office, provider, date, dateRange, text, number, select, checkbox, file + `paramsComplete` validation) and add multi-select, radio, date-basis, office-group, user, carrier, code range, amount range. Use `useReadScope` + `<ScopeToggle>` and `<ProviderOptionGroups>` so reports follow the office-scope conventions (fixes D4, D5). |
| `components/DataTable.tsx` | **Rewrite** | Server pagination / sort / totals, grouping + subtotals, footer, column chooser, drill links, virtualisation. No table library is installed — decide build vs adopt. Fix D2/D3 either way. |
| `components/ReportChart.tsx` | **Extend** | Add line / area / stacked / combo and N series driven by server chart specs; keep numeric heights (§5). Consider the unused `src/components/ui/chart.tsx`. Deduplicate the chart code copied in `pages/Reports.tsx`. |
| `components/ReportCatalog.tsx` | **Extend** | Favorites, recents, tags, legacy menu grouping, global "Search Report", rights filter. `src/components/utilities/pages/UtilitiesDashboard.tsx` already implements favourites / recents / run-history UI to copy. |
| `components/ReportFilterBar.tsx` | **Drop** | Home-page-only bar with two permanently disabled buttons. |
| `lib/reportRange.ts` | **Keep + extend** | Add last week / month / quarter / year, MTD / QTD / YTD, trailing 12 months, last N days, prior-period comparison, fiscal year; resolve "today" in the office timezone; relative presets must be resolvable server-side for schedules. |
| `lib/exportMatrix.ts`, `exportCsv.ts`, `exportExcel.ts`, `exportPdf.ts` | **Keep as "export what is on screen" fallback only** | Primary exports move to the server (full result, real XLSX, letterhead PDF, audit row, email). Reuse the `openServerReport` contract (server first, client fallback, tab opened before the await). Neutralise CSV formula injection in whichever side keeps CSV. |
| `lib/savedViews.ts` | **Rewrite behind the same function signatures** | Server-backed saved views / favorites / defaults / sharing; one-time import of the `localStorage` views; store the preset, not the resolved dates (fixes D1). |
| `lib/useReportRefData.ts` | **Keep + extend** | Already shared with Utilities (`UtilityShell.tsx`, `UtilityParamsForm.tsx`). Add option sources for office groups, users, carriers, plans, procedure codes, definitions. |
| `lib/reportMetrics.ts` (`useExecutiveSummary`, `useReportTrends`) | **Rewrite now (quick win)** | Thin wrappers over `useGetReportSummary`, `useGetReportTrends`, `useGetReportAccountsReceivable`, `useGetReportAging`. Removes ~30 list calls and the "capped sample" notes, lights up Outstanding A/R and adds an aging widget. Only the procedure-distribution pie has no server source. |
| `reports/*.ts` (6 definitions) | **Rewrite as server definitions** | Interim fixes available today without backend work: show `patient_name` / `provider_name` / `carrier_name`, add plan totals, add the claims date range (`submitted_date_from/to`), push scheduler `provider_id` / `status` to the server. |
| `pages/ReportRunnerPage.tsx` | **Keep** | Add not-found / forbidden states instead of a silent redirect. |
| `pages/Reports.tsx` (home) | **Rewrite** | Becomes the analytics home (KPI dashboards, trailing-12-month grid, scorecards) on server endpoints. |
| `dashboard/lib/aggregate.ts` | **Keep helpers, retire the pattern** | `parseDecimal`, `formatCurrency`, `formatCurrencyExact`, `isoOf`, `addDays`, `startOfMonth` stay; `fetchAllPages` should stop being used for KPIs. |
| `dashboard/lib/useMetrics.ts`, `AnalyticsWidget` | **Rewrite** | Bind to `/dashboard/summary` (needs a typed `response_model`), `/reports/trends`, and a recall-due roll-up. |
| `dashboard/components/KpiStat.tsx`, `WidgetCard.tsx` | **Keep + extend** | Add delta vs prior period, sparkline, target; `onClick` drill already exists. |
| My Page | **Keep** | Later: personal provider scorecard from the same metric API; move tasks / quick links to server favorites. |
| `GlobalNav` `reportsMenuItems` | **Rewrite** | Generate from the catalog categories; apply the `filterNavByRights` pattern; restore the legacy grouping from `f7332be^`. |
| `App.tsx` report routes | **Replace** | One `/reports/*` sub-router (home, library, run by key, run result by id, schedules, builder, favorites); delete the 10 placeholders (especially the 4 other-tenant `/reports/office/*`) and add a not-found route. |
| `src/features/print/serverReport.ts` | **Keep + generalise** | The server-PDF-first pattern for every report export. |
| `src/features/time-clock` HoursReport | **Keep bespoke, list in catalog** | Switch its data to `GET /api/v1/reports/time-clock` + server CSV / PDF. |
| Camel-case view models (`ExecutiveSummary.newPatients` / `activePatients` / `scheduledAppointments` / `insuranceReceivables`, `TrendPoint.newPatients`, `ReportTrends.procedureDist`, `DayPoint.newPatients`, `AppointmentKpis.checkedIn` / `noShow`, `SavedView.createdAt`, `ReportFilters.office` / `provider`) | **Remove on rebind** | Bind directly to `ReportSummary` / `TrendBucket` snake_case fields and use `office_id` / `provider_id` / `date_from` / `date_to` as param keys (project naming rule). |

**Suggested order of FE work that needs no new backend** (each independently shippable): (1) rebind Reports home to the four `/reports/*` roll-ups; (2) Insurance Dashboard "Pending Verifications" → `pending` from `/reports/insurance-verification-summary`; (3) the interim fixes to the six definitions; (4) defects D1–D6; (5) rewrite the stale docs listed in §3.4.

---

## 5. Gotchas recorded in code comments, docs and phase notes

| # | Gotcha | Source |
|---|---|---|
| 1 | List `size` is capped at **200**; `fetchAllPages` defaults to 5 pages and pages sequentially | `dashboard/lib/aggregate.ts` L1-3, L85-99; project conventions |
| 2 | List endpoints were measured at **~27–55 s per query** on the dev DB (~61k patients), including `?size=1` count reads; logins ~10 s. This is why both analytics blocks are opt-in ("Load analytics") | `docs/dashboard/dashboard_backend_devreport.md` §0; `Reports.tsx` L174-190; `AnalyticsWidget.tsx` L57-76 (dated measurement — may have changed [I]) |
| 3 | A **client-side office filter after the page cap undercounts**; the office must go to the server on every list that accepts it | header comments of `dashboard/lib/useMetrics.ts` L5-11 and `reports/lib/reportMetrics.ts` L6-9 |
| 4 | Never pass `office_id: null` to an Orval hook — it poisons the `[url, params]` query key; spread `officeFilter(office_id)` / `homeOfficeFilter(office_id)` instead | `dashboard/lib/useDashboardData.ts` L19-22; `src/features/office-scope/officeParams.ts` |
| 5 | Office membership **is enforced**: the server returns `403 office_not_assigned` for an `office_id` outside the caller's assignments; omitted office = caller's assigned offices; tenant-wide reads must send `all_offices=true` and need `office_scope_view_all_offices` | `src/features/office-scope/officeScopeModel.ts` L40-54; `docs/office-scope/office_scope_backend_response.md` L34, L56-57; `src/services/api.ts` L56-68 |
| 6 | "My offices" has no server parameter in the FE model yet — callers filter on `office_ids` client-side, although list params now expose `office_ids` | `src/features/office-scope/useReadScope.ts` L14-16 vs generated `List*Params` |
| 7 | **Status fields are free strings** (claims, treatment plans, appointments, `billing_status`, `elig_status`). Prefer the booleans / timestamps (`is_cancelled`, `is_missed`, `is_blocked`, `checked_in_on`, `checked_out_on`, `confirmed_on`); resolve appointment statuses from `/definitions` group `appt_status` | devreport G5; `dashboard/lib/dashboardUtils.ts` L98-111; `TodaysScheduleWidget.tsx` L27-31 |
| 8 | **recharts v3**: `ResponsiveContainer` with `height="100%"` left the pie empty (`width(-1)/height(-1)`); use a numeric `height` + `minWidth={0}` (and `isAnimationActive={false}` on `Pie`). Bars tolerated `height="100%"` — the dashboard `AnalyticsWidget` still uses it | Reports phase notes; `ReportChart.tsx` L33, L51, L62; `Reports.tsx` L238, L276; `AnalyticsWidget.tsx` L133-134 |
| 9 | Global UI zoom: `html { zoom: 0.75 }` (`--app-zoom`); measured geometry fed back into styles must be converted (`src/utils/uiZoom.ts`), full-height layouts use `var(--vh)` | `src/styles/globals.css` L68-77; `src/utils/uiZoom.ts` — relevant to chart tooltips, sticky headers, popovers [I] |
| 10 | Soft-deleted appointments are only archived and still come back from feeds (SCHED-DEL-1): pass `is_archived:false` or subtract archived ids | `reportMetrics.ts` L99; `useMetrics.ts` L216-217; `appointmentReport.ts` L65-66 |
| 11 | The scheduler feed is an **unpaginated array** — a wide date range downloads everything | devreport G8; `listSchedulerAppointments` returns `AppointmentSchedulerRead[]` |
| 12 | Backend decimals arrive as **strings** on CRUD reads (`parseDecimal`) but as JSON **numbers** on the `/reports/*` roll-ups; browser float sums are not exact | `aggregate.ts` L10-14; `ReportSummary` model |
| 13 | Payment sign and adjustments: payments may be stored negative (AL-9) and debit adjustments live in `patient_payments` with `payment_type = 'adjustment'` | `src/features/account-ledger/accountLedgerModel.ts` L100-108; `src/features/transactions/transactionCodes.ts` L353-360 |
| 14 | Dates: never `new Date("YYYY-MM-DD")` (parses as UTC, shifts a day); format from parts. Ranges are local-time inclusive `YYYY-MM-DD`; weeks start Monday | `reports/helpers.ts` L1-3; `lib/reportRange.ts` L1-3, L30-36 |
| 15 | Providers share display names → always label "Name (ID)"; rosters are sparse → never scope providers by the `office_id` scalar | `appointmentReport.ts` L67-68; `src/services/providerDirectory.ts` L248-253, L266-274 |
| 16 | Money reports show numeric **Patient ID** because names were not on the list reads when written (now they are) | devreport G7; §3.4 |
| 17 | Report definition files are `.ts` (no JSX) → summary-card icons are omitted; the registry needs `AnyReportDefinition = ReportDefinition<any>`; `def.icon` must be aliased to a capitalised local before JSX | Reports phase notes; `types.ts` L141-146; `ReportShell.tsx` L179 |
| 18 | `ReportShell` seeds draft and applied filters in `useState` initialisers → it must be remounted (`key={office_id}`) on office switch | `pages/ReportRunnerPage.tsx` L19-25 |
| 19 | Popup blockers: open the tab **before** the await when showing a server PDF | `src/features/print/serverReport.ts` L10-11 |
| 20 | CSV BOM is written with `String.fromCharCode(0xfeff)` (a literal BOM character in source is fragile) | `lib/exportCsv.ts` L11-12 (the Excel writer still uses a literal, `exportExcel.ts` L124) |
| 21 | Every failing query also raises a global toast, so a failed report shows two errors (toast + card) | `src/shared/config/queryClient.ts` L41-46 |
| 22 | FE rights gating is dark (`RIGHTS_ENFORCED_DEFAULT = false`); the backend catalog has a "Reports" category of 106 legacy rights, ~31 of them other tenants' office reports | `src/features/access-control/rights.ts`; `docs/setup/security/ACCESS_RIGHTS_CATALOG_AUDIT.md` L16, L47, L70, L141 |
| 23 | Seed data is date-scattered (procedures ~2024, payments ~2015, patients created ~2026) → the default "This Month" often shows $0 in dev | Reports phase notes |
| 24 | Regenerate the client with `npm run api:sync`; the reports docs were not updated when the endpoints landed | project conventions; §3.4 |

---

## 6. Open questions

1. Should the six existing runner reports be migrated onto the server engine first (as its proving ground) or frozen and replaced report-by-report as legacy equivalents arrive?
2. Is a table/grid library acceptable (none is installed), or must grouping / subtotals / virtualisation be built in-house?
3. Which collections definition is canonical — patient payments only, patient + insurance, with or without `payment_type = 'adjustment'` rows — and which of the four server "insurance A/R" numbers is the reported one?
4. Do the five `/reports/*` roll-ups enforce office membership and "omitted = assigned offices", and will they gain `all_offices` / `office_ids` / `office_group_id` like `/dashboard/summary`?
5. Will `/dashboard/summary` get a typed `response_model` so Orval generates its shape?
6. Are per-report right codes going to come from the existing `/api/v1/permissions` "Reports" category, and does report gating wait for `RIGHTS_ENFORCED_DEFAULT` to flip?
7. Should the legacy "Office Reports" slot become tenant-defined custom reports (the 24 shipped entries belong to other Denticon customers)?
8. Do Letters / Postcards / Labels / Statements / blank forms belong in the Reports module (legacy placement) or stay with their owning features (`src/features/letters`, statements API)?
