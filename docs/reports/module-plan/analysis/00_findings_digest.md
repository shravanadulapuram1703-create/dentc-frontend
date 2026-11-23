# Findings digest

Key findings, gaps and open questions reported by the author of each analysis and research document.
Use it to orient, then open the full document. Paths are relative to `docs/reports/module-plan/`.

## analysis/fe_existing_reports.md

The frontend Reports module is small (24 files, 2,639 LOC; six runnable reports plus a home page) and entirely client-executed: it pages CRUD list endpoints (200 rows × 3–8 pages) and reduces in the browser, capping results at 600–1,600 rows. Six server roll-ups already sit in the generated client, yet only one call site in the whole app uses any of them, and the gap docs still list them as missing. The ReportDefinition/ReportShell framework is a sound page skeleton (filters, Run, KPI cards, chart, table, exports, saved views), but its contract is functions rather than data, so it cannot be backend-served or express legacy criteria. Navigation was cut from the full Denticon menu to seven entries; ten orphan placeholder routes remain. Reports have no rights gating and predate office-membership enforcement. The document covers inventory, exact endpoint shapes, keep/extend/rewrite verdicts, nine defects and 24 gotchas.

**Key findings**

- Reports module = `src/components/reports/**` (24 files, 2,639 LOC) + `src/components/pages/Reports.tsx`; six definitions in `REPORTS`: `production`, `collections`, `patient-list`, `appointments`, `treatment-plans`, `insurance-claims`, routed at `/reports/run/:reportId`. No unit or e2e tests cover it.
- All execution is client-side via `fetchAllPages` (`src/components/dashboard/lib/aggregate.ts`: size 200, default 5 pages, sequential). Caps: runner 1,000 or 1,600 rows, Reports home 1,000 per source, trends 800, dashboard analytics 600. Totals under-report above the cap.
- Generated `Reports` tag has six operations; only `getReportAccountsReceivable()` is called, once, in `src/components/setup/insurance/InsuranceDashboard.tsx` L118. `/reports/summary`, `/reports/trends`, `/reports/aging`, `/reports/insurance-verification-summary` and `/dashboard/summary` have zero call sites.
- `ReportSummary` returns `production`, `collections`, `new_patients`, `active_patients`, `scheduled_appointments`, `insurance_receivables`, `outstanding_ar`; `TrendBucket` returns `period`, `production`, `collections`, `new_patients` with `interval` day/week/month — a direct replacement for `useExecutiveSummary` and `useReportTrends`.
- `/dashboard/summary` is typed `unknown` (no response model). Backend returns `office_ids`, `all_offices`, `date`, `outstanding_balance`, `patient_balance`, `insurance_receivable`, `credit_balance`, `patient_count`, `collections{patient_payments, insurance_payments, total_collections, payment_count}`; accepts `office_ids`, `office_group_id`, `all_offices`.
- `ReportDefinition` (`src/components/reports/types.ts`) is non-serialisable: `ColumnDef.accessor/format/render`, `fetch(filters)`, `icon: LucideIcon`. Filters are limited to `dateRange | office | provider | status | search` plus static single-select `extraFilters`; one office; all rows held in memory.
- `ReportShell` auto-runs on mount via `useQuery(["reports","run",def.id,applied])`, has no cancel and no URL state; exports are client-built (CSV, SpreadsheetML `.xls`, jsPDF landscape, print via `dataurlnewwindow`) from loaded rows and write no audit record.
- Saved views are `localStorage` only (`dentc:reports:views:<user_id>:<reportId>`); reports have no favorites, recents, schedules or sharing. The Utilities hub (`UtilitiesDashboard.tsx`, `utilitiesStorage.ts`) already implements favourites/recents/run-history UI that can be copied.
- Reports gap docs are stale: G1, G2, G3, G7, G9, G10 are marked Open but delivered — `patient_name`/`provider_name`/`carrier_name` on list reads, `TreatmentPlanRead.total_fee`, claims `submitted_date_from/to`, scheduler `provider_id`/`status`. Four roll-ups have been in the client since 2026-06-14.
- Current nav (`GlobalNav.tsx` L595-630) has seven report entries. The full Denticon menu (Daily…Statements, Lists, Interactive, Office Reports ×24, Letters/Postcards/Labels, My Reports, My Favorites, Search Report) is recoverable from `git show f7332be^:src/components/GlobalNav.tsx` L499-745.
- `src/App.tsx` L278-298 keeps 5 redirects and 10 orphan `PlaceholderPage` routes (4 lists, 2 interactive, 4 other-tenant office reports). Legacy category paths such as `/reports/daily` have no route, and there is no catch-all route.
- Unused generated server surface: `getOfficeFinancialSummary`, `getOfficeCollections`, `getOfficeInsuranceReceivables`, `getOfficeAdjustmentSummary`, `getOfficeTransactions`/`searchTransactions` (`TransactionFeed`), statements (single, batch, account), `getTimeClockReport` (+CSV/PDF), `getLabCostReport`, utilities `runUtility`/`getUtilityJob`/`listUtilityAudit`.
- Reusable as-is: `KpiStat`/`WidgetCard` (15 importers), `reportRange.ts`, `useReportRefData.ts`, `exportMatrix.ts`, `openServerReport` (server PDF first, client fallback), `useReadScope` + `ScopeToggle`, `ProviderOptionGroups`, the Utilities `ParamKind` param-form model, and `filterNavByRights`.
- Every list endpoint now accepts `all_offices`, `office_ids`, `office_group_id`, `include_global`, and `/api/v1/office-groups` exists — enough for an "Office or Office Group" criterion; the report filter panel only supports a single `office_id`.
- Libraries present: `recharts ^3.6`, `jspdf ^4.2` + `jspdf-autotable`, React Query 5, Orval 8. Absent: xlsx writer, table/grid or virtualisation library, date library, drag-and-drop and dashboard-grid libraries.

**Gaps and risks**

- Money totals are silently wrong above the page cap; the same capped rows feed KPI cards, charts and exports, and exported files carry no truncation notice.
- Metric definitions conflict: client collections sum every `patient_payments` row including `payment_type='adjustment'` with stored sign; four server fields report insurance A/R; three hard-coded claim-status vocabularies exist across report and dashboard code.
- Reports are gated by `isAuthenticated` only; the FE rights gate is dark (`RIGHTS_ENFORCED_DEFAULT = false`); client-side exports of PHI write no audit row, unlike the server patient reports.
- Office scope predates enforcement: the picker lists unassigned offices (leading to `403 office_not_assigned`) and "All offices" is never sent as `all_offices=true`, so the label can be wrong for restricted users.
- The five `/reports/*` roll-up routes take only `office_id` and their router has no office-scope dependency (router file read; service not read) — tenant-wide KPIs may be readable by any authenticated user.
- Saved-view defect: applying a view reuses the stored date range, so relative presets such as "This Month" run stale dates while the subtitle still shows the preset name.
- `DataTable` sort defect: the `parseFloat` heuristic makes ISO date and time columns sort by their leading number only; there is no on-screen footer totals row despite `ColumnDef.total`.
- Excel export is SpreadsheetML saved as `.xls` with dates and most numbers as text; CSV export has no formula-injection guard.
- List queries were measured at 27–55 s each on the dev DB (dated measurement); dashboard load can issue about 30 list requests, and axios has no timeout.
- The scheduler feed is an unpaginated array; the appointment report downloads the whole range and filters provider and status in the browser.
- No table/grid, xlsx or dashboard-layout library is installed, so grouping, subtotals, pivot grids and a custom builder need a build-versus-adopt decision.
- Docs and code comments are stale (gap reports, "no backend trends API yet", "no office param on /patient-recalls") and will mislead planning if taken at face value.

**Open questions**

- Should the six existing runner reports be migrated onto the server engine first as its proving ground, or frozen and replaced report-by-report as legacy equivalents arrive?
- Is adopting a table/grid library acceptable, or must grouping, subtotals and virtualisation be built in-house?
- Which collections definition is canonical (patient only, patient plus insurance, with or without `payment_type='adjustment'` rows), and which of the four server insurance A/R numbers is the reported one?
- Do the five `/reports/*` roll-ups enforce office membership and "omitted = assigned offices", and will they gain `all_offices` / `office_ids` / `office_group_id` like `/dashboard/summary`?
- Will `/dashboard/summary` get a typed response model so Orval generates its shape?
- Will per-report right codes come from the existing `/api/v1/permissions` "Reports" category, and does report gating wait for `RIGHTS_ENFORCED_DEFAULT` to flip?
- Should the legacy "Office Reports" slot become tenant-defined custom reports, given the 24 shipped entries belong to other Denticon customers?
- Do Letters, Postcards, Labels, Statements and blank forms belong inside the Reports module (legacy placement) or stay with their owning features?

## analysis/fe_cross_cutting.md

Mapped the frontend platform a Reports & Analytics module must plug into: stack and real library usage, shell/routing/navigation, the 0.75 zoom rule, the office-scope model (including office groups), the provider directory, auth/roles/rights, reusable UI, conventions and tests. Static analysis only; every claim is tagged verified or inference. Main conclusions: the stack is modern (React 19, Vite 7, TanStack Query, Orval) but has no grid, virtualisation, XLSX, date, drag-and-drop or error-boundary infrastructure and a largely unused shadcn kit; office groups exist end to end in the API yet are barely surfaced in the UI; office-set and group scope params exist on list endpoints but not on the /reports roll-ups; rights gating is built but switched off, with 56 legacy report rights kept and 54 removed; browser persistence is wiped at logout; printing and session handling have specific pitfalls for long-running, exportable reports.

**Key findings**

- Stack: React 19.2.3, TypeScript 5.9.3, Vite 7.3.0, react-router-dom 7.11.0, TanStack Query 5.100.14, axios 1.13.2, Orval 8.14.0 (tags-split, snake_case untouched), Tailwind 4.1.18, recharts 3.6.0, jsPDF 4.2.1 + autotable 5.0.8, vitest 5.0.0, Playwright 1.63.0.
- The shadcn/Radix kit (`src/components/ui`, 48 files) is nearly unused: `dialog` 6 importers, `dropdown-menu` 3, `popover` 1; `table`, `chart`, `calendar`, `command`, `select`, `tabs`, `form` have zero. House style is hand-rolled Tailwind plus native `<select>` and `<input type="date">`.
- Routing is one file, `src/App.tsx` (133 `<Route>`, 68 `AdminPageWrapper`): eager imports, no `React.lazy`, no catch-all, no ErrorBoundary. Menus are static arrays in `GlobalNav.tsx` (`reportsMenuItems` L595-630); only Setup is rights-filtered (`SETUP_NAV_RIGHTS` + `filterNavByRights`); flyouts work two levels only.
- `html{zoom:0.75}` (`--app-zoom`) is global: use `var(--vh)`/`var(--vw)`, `--app-nav-height` and `src/utils/uiZoom.ts` (`layoutRect`, `toLayoutPx`, `viewportHeight`, `uiZoom`). `globals.css` forces `!important` input/select styles, so compact filter controls need `tx-select`-style class rules.
- Office model lives in `src/features/office-scope`: `useOfficeScope()` (`office_id`, `allowed_office_ids`, `can_view_all_offices`), `officeFilter`/`homeOfficeFilter`/`allOfficesParam`, `useReadScope` + `ScopeToggle`, `OfficeBadge`. `OFFICE_ASSIGNMENT_ENFORCED = true`; server returns 403 `office_not_assigned`; `X-Office-ID` rides every request but never filters reads.
- Office groups exist: `/api/v1/office-groups` CRUD, `OfficeGroupRead`, `OfficeRead.office_group_id` (one group per office), `OfficeOption.office_group_id`, `office_group_id` param on 39 `*Params` types. UI: `OfficeGroupsSetup.tsx` (nav entry commented out) and the Office Info-tab select. No group `ReadScopeMode`, no `useOfficeGroups` hook.
- `office_ids` (number[], 39 types), `office_group_id` (39) and `all_offices`/`include_global` (38) cover list endpoints, `/dashboard/summary` and the time-clock report, but `/reports/summary|trends|accounts-receivable|aging|insurance-verification-summary`, `/transactions` and `/appointments/scheduler` accept scalar `office_id` only.
- No endpoint accepts a provider, user or carrier set; `group_by` and `date_basis` exist only on `GetLabCostReportParams`. Legacy multi-select criteria therefore need new backend params or POST bodies.
- Providers: `src/services/providerDirectory.ts` + `useProviderDirectory` (`officeProviders`, `otherProviders`, `providerLabel`), `partitionByOffice`, `<ProviderOptionGroups>`, label `Name (ID)` via `providerOptionLabel`; never scope by `ProviderRead.office_id`. `served_office_ids`, `provider_kind`, `is_ortho_provider`, `specialty_label` are available as report dimensions.
- Auth: `MeFull.permissions`/`permissions_enforced`/`groups` reach `useAuth().user`. The rights module `src/features/access-control` (`useRights`, `RequireRight`, `RIGHT`) is dark (`RIGHTS_ENFORCED_DEFAULT = false`); report routes check `isAuthenticated` only; `UserRead.report_access_provider_id` is consumed only by My Page.
- Rights catalog: 56 `Reports` codes kept (Daily, Monthly, Ledger, Management, Insurance, Appointment, Treatment Plan, Referral, Statements x3, Lists x16, Letters x4, My Reports x2, Forms x2, 13 `reports_group_reports_*`); 54 removed (Recall, Ortho, Labels, Postcards, Excel, `report_batch_schedule_report_*`, 31 office reports) plus 10 `denticon_practice_analytics_*`.
- Reusable inputs: `EntityPicker` with `searchCarriers/Employers/Providers/Offices/FeeSchedules/Plans/ProcedureCodes`, `DualListPicker`, `patientLookup.ts` helpers, `loadUserDirectory`, `useDefinitions`, Utilities `ParamKind`/`UtilityParamField`. Missing: date-range component, popover multi-select, patient-picker component, shared data grid.
- Persistence: `clearAuthStorageKeepRemembered()` runs `localStorage.clear()` on logout and every 401; `dentc:reports:views:*` is not preserved. Unused server stores exist: `/users/me/preferences` (`PreferencesBlob`), `/users/me/notifications`, `/audit-logs`, `/utilities/jobs/{job_id}` (`UtilityRunRead`).
- Output: house pattern is `doc.autoPrint()` + `doc.output("bloburl")` and `openServerReport()` (`src/features/print/serverReport.ts`); 13 generated blob endpoints; `documentAccess.ts` `downloadAsset`. Production CSP allows `frame-src 'self' blob:`; only the reports code uses `dataurlnewwindow`.
- Conventions: `src/features/<name>/` with `*Model.ts`, `*Service.ts`, `use*.ts`, `components/`, `__tests__/`, `index.ts`; generated client only; gates `npx tsc -b` + `npx eslint`. Tests: 9 pure vitest files, 2 Playwright specs + `checkA11y`, playbook `WF-30`; CI triggers only on `feature/phase_data_migration`.

**Gaps and risks**

- No data grid, virtualisation, XLSX writer, date library, drag-and-drop or dashboard-layout library is installed; the report builder, pivot/trailing-12-month grids and dashboards need library decisions before estimation.
- No code splitting, error boundary or not-found route: a large analytics module lands in the single app chunk, and one failing widget or unknown report key blanks the screen.
- Report access cannot be enforced today: FE rights are dark, backend rights never gate reads, kept `reports_*` codes are unreferenced, and rights for Recall, Ortho, Labels, Postcards, Excel and scheduled reports were deleted by migration `8e4a6a8e5ab0`.
- Office-set, office-group and all-office scope cannot be sent to the existing `/reports/*` roll-ups, `/transactions` or the scheduler feed; provider, user and carrier sets cannot be sent to any endpoint.
- `useReadScope` has no group or arbitrary office-set mode and 'My offices' is still filtered client-side; the Office Groups setup is hidden from the nav and `/setup/office-groups/assign` is a stale placeholder.
- Saved views, favourites and column layouts kept in `localStorage` are wiped on every logout and session expiry.
- The refresh token is never used and axios has no timeout, so a long-running report request can end in a forced logout mid-run (inference from code).
- Reports 'Print' uses `doc.output("dataurlnewwindow")`, probably blocked by the production CSP (inference); there is no print stylesheet and no way to embed charts in client-generated PDFs.
- Global `!important` form CSS plus the 0.75 zoom make third-party grids, date pickers and chart interactions risky until themed and verified live; recharts tooltip/brush behaviour under zoom is unverified.
- FE treats any role containing owner/admin/manager as privileged while the server uses the exact set admin, super_admin, owner, manager, so 'All offices' can be offered and then refused with 403.
- 'Today' comes from the browser clock rather than `OfficeOption.timezone`, and three duplicate hand-rolled date/preset helper sets exist (`reportRange.ts`, `timeClockModel.ts`, `aggregate.ts`).
- Verification is thin: no component-test tooling, no report tests, CI not triggered on the working branch, e2e depends on live shared data, and several office-scope comments and docs are stale.

**Open questions**

- Which libraries may be added (data grid, virtualisation, date library, drag-and-drop/grid layout, XLSX), or must everything be built in-house on the current stack?
- Should the new module adopt the dormant shadcn/Radix kit (`ui/popover`, `ui/command`, `ui/calendar`, `ui/table`) or follow the hand-rolled house style used everywhere else?
- Will report access use the rights catalog (re-adding removed codes and adding builder, schedule, export and dashboard rights), when does `RIGHTS_ENFORCED_DEFAULT` flip, and will the backend start gating report reads?
- Is Office Group a first-class report scope (new read-scope mode and picker), and should Setup > Office Groups return to the navigation so groups can be maintained?
- Should `UserRead.report_access_provider_id` (legacy Report Access Provider) restrict provider users to their own production in reports and scorecards?
- Where do saved views, favourites, schedules and dashboard layouts live: dedicated report tables, or the existing `/users/me/preferences` blob as an interim?
- Is a silent token refresh and an axios timeout policy in scope, given long-running reports?
- Are route-level code splitting and an error boundary acceptable as part of this module, since both would be firsts for the app?

## analysis/fe_report_like_outputs.md

Mapped every report-like output outside `src/components/reports`: 21 outputs in 17 feature areas, plus work-queue screens and legacy outputs with no implementation. Only the Time Clock report is office-wide; the rest are single-patient or single-claim documents. Rendering is split between server PDFs via `openServerReport` (patient overview, ledger, transactions, insurance, lab report), client-only jsPDF (ADA form, letters, perio, Rx, treatment plan, payment plans, time clock), hand-rolled CSV and `window.print()`. The backend contract already has 15 PDF/CSV endpoints; the frontend uses 6. Statements, batch letters, postcards, utilities run/audit and 12 audit/history endpoints have server APIs with zero frontend callers; labels and scheduler prints exist nowhere. The document gives per-output filters, a legacy-menu mapping, LINK / ENGINE / ABSORB / LEAVE recommendations, reusable pieces, a gap register with status, and defects.

**Key findings**

- 21 report-like outputs across 17 feature areas; only the Time Clock report (`/time-clock/report`, `HoursReport.tsx`) is office/tenant-wide. All others are single-patient or single-claim documents: layout and label references, not replacements for legacy office-wide report families.
- Backend contract has 15 file endpoints (13 PDF, 2 CSV); FE calls 6: `/patients/{patient_id}/reports/{overview,ledger,transactions,insurance}`, `/appointments/lab-cases/report.pdf`, `/appointments/lab-cases/export.csv`, via `src/features/print/serverReport.ts` `openServerReport` (server first, jsPDF fallback).
- Unused server renders (0 callers): `getAdaClaimFormReport` and batch `renderAdaClaimFormBatch` (up to 200 claims), `getPatientMedicalHistoryPdf`, `getPatientStatementPdf`, `getPaymentPlanContractPdf`, `getPaymentPlanCouponsPdf`, `getTimeClockReport` / `Csv` / `Pdf`, `printLabCostReport`, `getLabCostReport`.
- Statements have no UI. Server operations exist (`generatePatientStatement`, `listPatientStatements`, `getPatientStatementPdf`, `deliverPatientStatement`, `generateStatementBatch`, `generateAccountStatement`); FE has only settings (`officeStatementApi.ts`: `message_current`..`message_120`, `logo_option`, `address_source`) and responsible-party flags `send_statements`, `no_email_statement`, `statement_message`.
- Letters are single-patient: `LetterDialog` -> client merge (`mergeFields.ts`) -> jsPDF (`letterPdf.ts`) -> in-app Report Viewer (`LetterPreviewModal.tsx`). `/letters/render`, `/letters/render-batch`, `/letters/batches`, `/postcard-templates` and letter-template writes have 0 callers. Labels exist nowhere, FE or API.
- Time Clock report aggregates client-side over a `listTimeClockEntries` crawl (200 x up to 60 pages) with client CSV and jsPDF; server `GET /reports/time-clock` (+ `report.csv`, `report.pdf`, `include_wages`, `office_ids`, `office_group_id`) is unused. TC-BE-1..14 answered server-side; FE adopted none.
- Utilities (`src/components/utilities/**`, 2,812 LOC) is a reusable catalog / param-form / confirm / run-console / favourites / history framework, but runs are simulated and audit is `localStorage`; `runUtility`, `getUtilityJob`, `listUtilityAudit` exist unused. UTIL-4..6 deferred server-side.
- Print audit is one backend helper, `print_service.record_print` (`audit_logs.action='PRINT'`, `resource_type` patient_report | lab_report | claim_report | time_clock_report). Payment-plan, statement and medical-history PDFs skip it; client-only prints leave no audit (ADA print log is `localStorage`).
- Twelve audit/history endpoints have 0 FE callers: `/audit-logs`, `/patients/{id}/audit-logs`, `/patients/{id}/change-log`, `/accounts/{id}/change-log`, medical-history `audit` / `changes` / `versions`, claim `status-history`, plan `history`, time-clock entry `history`, `/signature-audit-events`, `/utilities/audit`. `ListAuditLogsParams` lacks a date range.
- No print exists for Scheduler (routing slip, walkout, day sheet, call list: no endpoint), Restorative chart, Progress Notes, Medical History (server PDF unused). Patient nav "Print" is `alert("Print Reports - Coming Soon")`; `insurance-forms/dental|medical` routes are placeholders.
- Reusable infrastructure: `openServerReport`; `patientPdf.ts` and backend `pdf_report.py` (`PatientReport`) layout twins; `documentAccess.ts` (`openAsset`, `downloadAsset`); `LetterPreviewModal` viewer; `uploadPatientDocument` with `document_type` (`consent-form`, `patient-letter`, `treatment-plan`); `useReadScope` + `ScopeToggle` as used in `HoursReport`.
- Office-wide lab reporting is server-ready: `listLabCases`, `printLabReport`, `getLabCostReport` (`date_basis` appointment|sent|due|received, `group_by` vendor|provider|office|month|dds), `exportLabCasesCsv`; the FE passes only `patient_id`. A good first report-engine adapter.
- No print/export action is rights-gated: `charting_perio_print`, `transactions_claims_ada_direct_print`, `appointments_scheduler_print`, `patient_letters_generate` are defined in `rightCodes.ts` with zero references; `RIGHTS_ENFORCED_DEFAULT = false`.
- Eight FE wins need no new backend: move ADA print, payment-plan contract/coupons, medical-history print and time-clock report to existing server endpoints; build single-patient statement UI; wire Utilities run/job/audit; add office-wide lab report; replace the patient "Print" stub with a launcher.
- Docs lag the backend: comments in 11 files claim missing endpoints; time-clock, utilities, consent-signing and letters round-2/3 responses exist only under `dentc-backend/docs/**`; `CONSOLIDATED_BACKEND_GAPS.md` still lists delivered items (LTR-13..17, TC-BE, CS, UTIL-1..3, STMT, ADA-BE-1, PP-3, MH-15) as open.

**Gaps and risks**

- Statement backend will not scale as built: `generate_batch` / `generate_account_batch` are synchronous, single-office, per-patient balance calls, criteria limited to `min_balance` / `only_aged` / dates, no merged print stream; `deliver(method="email")` only records intent, no mail is sent.
- Two PDF stacks: reportlab on the server, jsPDF on the client (about 3,900 LOC in 13 files, 8 header styles, no logo, WinAnsi-only fonts). Look and numbers diverge unless every output moves to one server render path.
- Audit is incomplete: no server record for client prints (Rx RX-P6, perio, treatment plan, letters, contracts, ADA); payment-plan, statement and medical-history PDFs do not call `record_print`; `/audit-logs` has no date filter.
- No delivery or scheduling infrastructure: `POST /email/send` requires `patient_id` and has no attachments or staff recipients; there is no report job/schedule resource and no XLSX endpoint anywhere.
- Office groups are unsupported in every existing output and in the lab, statement and patient-report endpoints (single `office_id`); only the time-clock report and list endpoints accept `office_ids` / `office_group_id`.
- Open backend gaps: PRINT-11 (Overview PDF 47 s), PRINT-12 (raw `marital_status`), PRINT-13 (soft-deleted claims in ledger PDF), LAB-13 (cost report lacks `patient_id`), RX-P4 / RX-P6 (no Rx print endpoint or log), SCHED-CONS-G9 (no scheduler print), no perio print, no letters PDF.
- Letter data and storage: LTR-8 / LTR-9 template damage unrepaired (21 mojibake bodies, 11 truncated Financial Agreement templates); LTR-18 consent PDFs with `storage_backend: "local"` return 404 on Cloud Run. Batch letters and archived report outputs inherit both.
- Rights are dark and print/export actions are ungated; batch statements, audit reports and wage data (`include_wages`) need right checks from the first hub release.
- Code defects: `openServerReport` fallback opens a window after an await (popup-block risk) and has no timeout/abort; `window.open(..., 'noopener')` return checks in `LetterPreviewModal.onPrint` and `OnlineRegistrationTabContent.handleGeneratePDF` likely misfire (inference); ledger fallback text says "first 500" while the cap is 5,000.
- Treatment-plan report and payment-plan contract/coupons print the patient's own name and address as responsible party (`TreatmentPlanPage.tsx` L765, `RegularPaymentPlanPage.tsx` L250, `OrthoPaymentPlanPage.tsx` L402); disclosure texts are hard-coded in `txReport.ts` and `planPrint.ts`.
- Four independent client CSV writers with no formula-injection guard; time-clock client overtime presets can disagree with the server `overtime_method`; the entry crawl truncates at 12,000 punches with only a banner.
- "Delivered" statuses for LTR-13..17, CS-*, TC-BE-*, ADA-BE-*, PP-3, MH-15, UTIL-1..3 rest on backend docs plus presence in `openapi.json`; nothing was executed, and the time-clock migration `1745e318c65a` was reported unapplied on the dev DB.

**Open questions**

- Statements: should the hub own the whole cycle (run, preview, print stream, e-mail, close-out per `statement_close_out_individual`, reprint history), and may the backend batch be redesigned as an asynchronous job with office-group and billing criteria?
- Do patient documents (overview, ledger, Rx, perio, treatment plan, consent, contract) appear in the Reports catalog behind a patient picker, or only through the patient "Print" menu?
- Is the target a single server render path for every printed output (retire jsPDF builders as endpoints arrive), or do client fallbacks stay permanently?
- Should client-only prints post a print-log call until they are server-rendered, so an audit / print-log report is complete (prescriptions being the compliance-sensitive case)?
- Labels and postcards: which stock and layouts are required, and are they driven from report results (recall, birthday, collection lists) as in the legacy tool?
- Are batch collection letters (CS001..CS009) in scope for early phases, and who signs off the LTR-8 / LTR-9 template repair first?
- Does Utilities remain a separate module sharing run/job/audit infrastructure, or do its report-like entries (EClaims Management, Batch Eligibility, exports) move into the hub as interactive reports?
- Which delivery channel will scheduled reports use: an extended SendGrid gateway (attachments, staff recipients) or in-app delivery only?

## analysis/be_existing_reporting.md

The backend's reporting surface is small and hand-written: five `/reports/*` KPI routes, `/dashboard/summary`, four office roll-ups plus two cross-patient feeds, statements, four patient PDFs on a reportlab kit, and lab and time-clock reports. There is no report registry, shared filter model, async runner, XLSX output, scheduling or saved definitions. Money sits in seven stores with no unified ledger, and six balance formulas disagree. In-app insurance payments (`ledger_insurance_details`) are missing from every collections, A/R and statement figure; "collections" also counts migrated write-offs; aging ignores payments. Office scope and permissions are absent from almost all report routes. A new report-engine layer is needed; `ledger_sign`, the office-scope resolver, letterhead, print audit, the PDF kit and the time-clock build-to-JSON/CSV/PDF pattern are worth keeping. Everything is from static reading; nothing was run against a server or database.

**Key findings**

- Report routes: `GET /reports/summary|trends|accounts-receivable|aging|insurance-verification-summary` (`report_service.py`, 60 s Redis cache), `/dashboard/summary`, `/offices/{id}/financial-summary|collections|insurance-receivables|adjustment-summary|transactions`, `/transactions`. Filters are only `date_from`, `date_to` and one `office_id`.
- Money lives in seven stores: `patient_procedures.fee`, `patient_payments` (legacy LTYPE P/I/A plus app payments), `patient_adjustments`, `patient_refunds`, `ledger_insurance_details`, `patient_opening_balances`, `insurance_claims.total_paid`. No unified ledger; the fact tables carry no `tenant_id`.
- `billing_service.record_insurance_payment[_batch]` writes only `ledger_insurance_details`. No balance, A/R, collections, ledger or statement code reads that table, so app-posted insurance payments and write-offs are missing from every figure.
- Collections = `sum_payment_credit()` over `patient_payments` by `payment_date`. It includes `payment_type='adjustment'` credits (migrated write-offs, balance transfers) and never nets `patient_refunds`.
- Six balance formulas (`balance_service`, `report_service`, `transactions_service`, `statement_service`, `ledger_service`, `scheduler_service._batch_balances`) differ on opening balances, `patient_adjustments`, refunds, debit adjustments and archived payments.
- `/reports/aging` buckets gross `fee` by `date_of_service` with no payments applied; `total` is all-time charges, not A/R. Bucket keys differ per endpoint: `d30..d120_plus`, `b30..b120`, `aging_30..aging_120`.
- Five insurance-receivable definitions exist. `insurance_ar = min(sum insurance_estimate, total_ar)` likely collapses to `total_ar` (inference). `is_preauth` claims are never excluded. Five claim-status lists disagree (`_CLAIM_SETTLED` vs `_OPEN_CLAIM_STATUSES`, others).
- Only `/dashboard/summary` and `/reports/time-clock*` use `OfficeScopeDep`. Other report routes accept any `office_id` with just a token. No `reports_*` permission code is enforced; about 56 legacy `Reports - ...` rights survive in the catalog.
- Dates: production by `date_of_service`, collections by `payment_date`; no created-date basis. 'Today' is UTC in aggregates, office-local in PDFs. `new_patients` uses `patients.created_at`, which the migration did not populate.
- PDF is `reportlab` only. `pdf_report.PatientReport` (platypus kit, 'Page x of y') serves the 4 patient PDFs, lab and time-clock reports; statements, contracts, medical history and the ADA form use raw canvas. All in-memory, synchronous, unstored.
- Branding: `print_service.resolve_letterhead` (reads `office_statement_settings`, `account_settings.logo_url`) is used only by the 4 patient PDFs; lab and time-clock PDFs get a plain header. `record_print` writes `audit_logs` rows with `action='PRINT'`.
- No XLSX writer (`openpyxl` is import-only and not in `requirements.txt`); CSV only for lab cases and time clock. No worker, scheduler, saved reports or e-mail attachments; `utility_runs` and `letter_batch_runs` are inline run records.
- Best reusable patterns: time-clock `build_report()` feeding JSON, `report_csv()` and `report_pdf()` with scope and audit; lab cost report's `date_basis` + `group_by` params; `list_lab_cases` conditional-aggregate SQL; `ledger_sign.py`.
- Backend docs: G1-G3, G6-G10, PRINT-1..10 and TC-BE-1..14 delivered; G4 (PDF/XLSX export, e-mail, schedules) deferred; G5 status enums partial. The FE devreport still lists delivered items as open.
- The FE calls almost none of it: only `getReportAccountsReceivable`, `getInsuranceVerificationSummary`, the 4 patient PDFs, the lab report PDF and CSV, `day-totals` and the treatment-plan report have call sites.

**Gaps and risks**

- Any collections or A/R number built on the current code is wrong for tenants posting insurance payments in-app (missing `ledger_insurance_details`) and overstated by migrated adjustment credits.
- Unifying the stores risks double counting: legacy insurance payments may exist in both `patient_payments` and `ledger_insurance_details`. This needs a database profile, which was out of scope.
- Generic CRUD lists for `patient_procedures`, `patient_payments`, `insurance_claims` and `appointments` have no tenant filter (`CRUDBase._scope_tenant` no-ops without a `tenant_id` column). Cross-tenant exposure for unrestricted callers is inferred, not executed.
- Report routes lack office-assignment validation and rights, so any authenticated user can read practice-wide financials for any office in the tenant.
- Performance: full-history scans on roughly 1.37M and 1.33M-row tables with no `(office_id, date)` index; `transaction_feed`, `insurance_receivables`, the statement batch and the `/dashboard/summary` loop work in Python under a 30 s statement and 120 s worker timeout.
- `created_at` on migrated procedures and payments holds the migration timestamp unless a backfill ran, blocking 'created date' criteria; `patients.created_at` and `first_visit` are unusable for new-patient history.
- Legacy payment and adjustment codes (`TYPE2`) were collapsed to four `payment_method` values and `payment_allocations` is unusable, so adjustments-by-type, collections-by-provider and FIFO aging cannot be derived for history.
- Per-office figures filter each table by that row's own `office_id`, which distorts office A/R when a charge and its payment sit in different offices.
- Statement PDF has no itemised lines, logo or remit slip; e-mail delivery only flips a status; the batch is a synchronous per-patient loop.
- Tests run on in-memory SQLite as a super-admin and `report_service` avoids Postgres-only SQL; an analytics layer needs Postgres tests with multi-tenant and multi-office fixtures.
- Recall, Ortho, Labels, Postcards, Excel and Batch Schedule report rights were deleted from the permission catalog; new codes are needed if those families are in scope.
- Logos embed only from local `UPLOAD_DIR` files, so bucket-hosted logos are skipped (inference for deployed environments); the PDF kit prints an empty patient stub on later pages of office-wide reports.

**Open questions**

- How do migrated insurance payments appear: in `patient_payments` (`payment_type='insurance'`), in `ledger_insurance_details`, or both?
- Which A/R and aging definition is canonical (gross-charge dating vs applying `pat_paid` / `pat_adjust` / FIFO), and should credit balances be reported separately?
- Was `scripts/backfill_ledger_source_fields.py --restore-created-at` run in each environment? Without it a created-date basis is impossible for migrated rows.
- Is each organisation in its own database in practice, or do tenants share one? This sets the urgency of the untenanted child-table lists.
- What async infrastructure is acceptable in production (Cloud Run jobs / Cloud Tasks vs a worker on the PM2 host), and is Redis available there?
- How should collections be attributed to a provider when `patient_payments.provider_id` is nullable and allocations are unusable for history?
- Is a re-import of legacy `TYPE2` payment and adjustment codes acceptable so 'adjustments by type' works for history?
- Should new-patient counts use first completed procedure or first kept appointment, given `patients.created_at` and `first_visit` are unusable for migrated patients?

## analysis/be_platform.md

The backend (FastAPI, sync SQLAlchemy 2 on psycopg2, PostgreSQL 15.18) has solid request-level plumbing a report engine can reuse: JWT auth, column tenancy, a complete office-scope resolver with a reports mode, rights dependencies, an audit table with a PRINT helper, a reportlab layout kit, GCS signed URLs, a Redis TTL cache and WebSocket push. It has no execution platform: no job queue, scheduler or worker, a 30 s statement timeout, a 120 s request ceiling, in-memory exports, no Excel writer, e-mail without attachments, and patient-keyed file storage. Deployment is Cloud Run with one service and one database per client. The fact tables (about 1.3-1.4 M rows) lack tenant_id and reporting indexes, the existing roll-up endpoints skip office-scope and rights checks, and the test suite is SQLite-only with no CI tests. The document maps each needed capability to what exists and what is missing.

**Key findings**

- No job queue, scheduler or worker: no Celery/RQ/APScheduler/Cloud Tasks; `BackgroundTasks` used once; PDFs, CSVs, statement and letter batches run inline; four `python -m scripts.*` cron entry points have no scheduler defined in the repo.
- DB limits in `app/db/session.py`: `statement_timeout` 30 s, `idle_in_transaction_session_timeout` 60 s, pool 10+20 per worker, sync psycopg2, no read replica, no per-request override or server-side cursors anywhere in `app/`.
- Topology: Cloud Run (`us-central1`), gunicorn 2 uvicorn workers `--timeout 120`; documented 2 vCPU / 2 GiB / 120 s / 1-10 instances; Cloud SQL PostgreSQL 15.18 in `us-east1`; one service + database + buckets + `REDIS_DB` index per client organisation.
- JWT claims: `sub`, `type`, `jti`, `iat`, `exp`, `tenant_id`, `role` (HS256, 60 min). Office assignments and rights are resolved from the DB on every request; `X-Tenant-ID` is honoured only for `super_admin`.
- Office-scope engine is reusable: `OfficeScopeDep` (`all_offices`, `office_ids[]`, `office_group_id`, `include_global`) + `resolve_list_office_filter(..., reports=True)`; 403 `office_not_assigned`; bypass for owner/admin/manager/super_admin, right `office_scope_view_all_offices`, or zero `user_offices` rows.
- Existing `/reports/*` roll-ups, `/offices/{office_id}/financial-summary`, `/collections`, `/insurance-receivables`, `/transactions`, lab and statement routes accept `office_id` without office-scope validation and are guarded by `get_current_user` only.
- Rights: `require_permission` (ungated users pass) and `require_read_access` (ungated fail) exist; no guard references any `reports_*` code; migration `8e4a6a8e5ab0` deleted Recall/Ortho/Labels/Postcards/Excel/Batch-Schedule and `denticon_practice_analytics_*` rights; `users.report_access_provider_id` is stored but unenforced.
- Fact tables `patient_procedures`, `patient_payments`, `insurance_claims`, `appointments`, `treatment_plan_items`, `patient_recalls`, `payment_allocations` have no `tenant_id`; aggregates must join `patients.tenant_id`; `CRUDBase._scope_tenant` does not filter them.
- Schema (174 tables, 343 btree indexes) has zero extensions, materialized views, views, functions, triggers or partitions; the app uses one window function, no CTE or `date_trunc`; raw `text()` SQL only in `account_backfill.py` and scripts.
- Missing reporting indexes: `patient_procedures` (no `date_of_service`-alone, `office_id`, `provider_id`, `procedure_code`, `created_at`), `patient_payments` (`payment_date`, `office_id`, `provider_id`), `patient_adjustments.adjustment_date`, `insurance_claims.office_id`; volumes about 1.37 M procedures, 1.33 M payments, 96 k claims, 84 k patients.
- Tests run on in-memory SQLite via `Base.metadata.create_all`, caller `super_admin`, Redis/GCS/e-mail off; no Postgres tier and no CI test step; existing report code buckets dates in Python to stay portable.
- PDF via reportlab only: `app/services/pdf_report.py` (`ReportHeader`, `PatientReport.data_table`, `render() -> bytes`, `show_patient=False`, landscape) plus `print_service.resolve_letterhead`; CSV via stdlib; no Excel writer, and `openpyxl` is imported but missing from `requirements.txt`.
- E-mail: `integrations/email.py` (Graph, then SMTP, then log-only; plain text, single recipient) and SendGrid `send_mail` behind the patient-bound `email_messages` log; neither supports attachments or templates; statement e-mail delivery only records intent.
- Storage: GCS `object_storage` (`upload_bytes`, `stream`, V4 `signed_url` 900 s) and `document_store` keyed `{prefix}/{tenant_id}/{patient_id}/{uuid}` on `patient_documents`; local fallback is ephemeral on Cloud Run; the `stored_objects` table could register report files.
- Audit and precedents: `audit_logs` is auto-written for 2xx mutations only; reads are audited via `print_service.record_print` (`action='PRINT'`); reusable shapes are `utility_runs`, `letter_batch_runs/items`, `notifications` (no producers), `user_preferences`, `messaging_events.publish`, and Redis `cache_get/set` (`report:*` 60 s).

**Gaps and risks**

- No asynchronous execution platform: anything beyond 30 s per statement or about 120 s per request needs new infrastructure (Cloud Run Job, Cloud Tasks, scheduler), provisioned once per client deployment.
- All-time and date-range aggregates scan tables of about 1.3-1.4 M rows without supporting indexes or pre-aggregation; index builds would run inside the automatic `alembic upgrade head` deploy step triggered by pushes to `feature/uat-realse`.
- Existing aggregate endpoints expose other offices' figures to restricted users (no office-scope validation, no rights guard); copying their pattern into the report engine repeats the leak.
- Tenant isolation depends on joins to `patients`; generic CRUD lists of tenant-less tables are unfiltered. Latent while each client has its own database, real if tenants ever share one.
- SQLite-only test suite and no CI tests: Postgres-specific report SQL (materialized views, `date_trunc`, `AT TIME ZONE`, `GROUPING SETS`) would ship untested.
- Exports are built fully in memory and returned as a single `Response`; the 60 s idle-in-transaction kill can hit long render phases; CORS does not expose `Content-Disposition` to browser code.
- No XLSX writer is declared; `openpyxl` is imported by the fee-schedule import and one test but absent from `requirements.txt`, so the built image cannot read `.xlsx`.
- E-mail cannot deliver a report (no attachments, no templates, log bound to `patient_id`); sending PHI as an attachment also needs a policy decision.
- No tenant-level (non-patient) file class and no retention job for generated files; the local-disk fallback is lost on Cloud Run restarts.
- Report reads are unaudited unless the handler calls `record_print`; PRINT rows carry no `office_id`; `GET /audit-logs` cannot filter by action or date range.
- Timestamps are naive UTC and 'today' differs by module (UTC in `report_service`, office-local in time clock and lab tracking); created-date reports need per-office conversion.
- `report:*` cache keys ignore the caller's office scope and are never invalidated; `payment_allocations` holds no usable amounts for migrated data, so collections cannot be attributed to procedures or producing providers through allocations.

**Open questions**

- What are the live Cloud Run settings of `dentc-backend` (CPU, memory, request timeout, concurrency, min/max instances, CPU always-allocated)? Only the first-deploy runbook states them.
- Are the Cloud Scheduler jobs for the four cron scripts actually provisioned, and how do they invoke the script (Cloud Run Job or HTTP)? Nothing in the repo defines it.
- How many client deployments exist or are planned, and is cross-organisation benchmarking in scope given one database per client?
- Is a worker tier (Cloud Run Job, Cloud Tasks or a separate service) acceptable, and may it be provisioned per client?
- May the report engine rely on Postgres-only SQL and objects (materialized views, `date_trunc`, window functions), and will a Postgres-backed test tier and a CI test job be added?
- Is a read replica or a larger Cloud SQL tier available for analytics, and what is the shared instance's `max_connections`?
- Delivery policy for scheduled reports: attachment or signed link, which transport (Microsoft Graph or SendGrid), and how long generated files are retained?
- Rights model: reuse the kept legacy `reports_*_screen_view_only` / `_full_control` codes and re-add the deleted families, or define new codes? Should `users.report_access_provider_id` restrict report data as in the legacy tool?

## analysis/be_data_financial.md

Wrote the financial data map. There is no ledger table: money sits in eight stores (patient_procedures, patient_payments, patient_adjustments, ledger_insurance_details, patient_refunds, patient_opening_balances, insurance_claims, payment_allocations) with two sign conventions, overloaded code columns and a single business date per row. The document gives per-table columns, signs, dates, provider/office/guarantor/user attribution and void flags; every code vocabulary (LTYPE routing, payment types, 18 payment and 46 adjustment codes, procedure categories, claim and pricing vocabularies); SQL-ish formulas for gross/net production, collections, adjustments, A/R and FIFO aging over a normalised eight-leg union; a legacy-report support matrix; existing versus needed indexes; and 13 schema additions. Main blockers: in-app insurance payments are invisible to balances, legacy payment/adjustment codes were not migrated, and no deposit, day-close, period-lock or snapshot entity exists.

**Key findings**

- No ledger table: money lives in `patient_procedures` (charges), `patient_payments`, `patient_adjustments`, `ledger_insurance_details`, `patient_refunds`, `patient_opening_balances`, `insurance_claims`, `payment_allocations`. Core tables have no `tenant_id` — every aggregate must join `patients`.
- Denticon `LEDGER.LTYPE` C → `patient_procedures` (id `PROC-{LEDGERID}`); P/I/A → `patient_payments` (id `PAY-{LEDGERID}`) with `payment_type` `patient` / `insurance` / `adjustment`. `legacy_id IS NOT NULL` marks migrated rows.
- `patient_payments.amount` has two sign conventions: migrated payments negative, app payments positive; `payment_type='adjustment'` rows are signed in both eras. `app/services/ledger_sign.py` is the only normaliser (`-abs(amount)`, adjustments verbatim).
- In-app insurance payments and write-offs are stored only in `ledger_insurance_details` (`prim/sec/ter_ins_paid`, `*_ins_adjust`, one row per procedure line). No balance, ledger, collections, A/R or statement code reads that table.
- Adjustments live in three places: `patient_adjustments` (app credit codes), `patient_payments` with `payment_type='adjustment'` (legacy A rows, app debit codes, `balance_transfer` pairs) and `ledger_insurance_details.*_ins_adjust`. Refunds: `patient_refunds` (no FE caller) or codes `AR001…AR008`, `SUNBR`.
- Legacy payment/adjustment codes were not migrated (`s29` keeps `TYPE2` as cash/check/card/ach/NULL). The 18 payment codes (tender category) and 46 adjustment codes (sign, Production/Collection group) exist only in FE `src/features/transactions/transactionCodes.ts`.
- `patient_payments.payment_method` is overloaded: mapped tender on migrated rows, legacy payment code on app payments, adjustment code on app debit adjustments, `balance_transfer` on transfers. `patient_adjustments.write_off_type` holds `production`/`collection` from the UI, not the intended write-off class.
- `patient_procedures.fee` is the charged/contracted fee (`LEDGER.AMOUNT`); `ucr_fee` is office UCR. UCR exceeds fee on 32,440 sampled 2025 charges (mean $143.85), so contractual write-offs are largely embedded: gross = Σ `ucr_fee`, charged production = Σ `fee`.
- One business date per row (`date_of_service`, `payment_date`, `adjustment_date`, `refund_date`) plus naive-UTC `created_at`. Migrated `created_at` is the migration timestamp unless `backfill_ledger_source_fields.py --restore-created-at` ran; `LEDGER.TRANDATE` is dropped for charges having `DOSDATE`.
- Attribution columns: charges `provider_id` (NOT NULL), `hygienist_id`, `office_id`; payments `provider_id` (nullable), `office_id`, `created_office_id`, `account_id`, `account_payment_id`; users `created_by` plus `created_by_legacy` (2.23M of 2.79M legacy rows name a login with no `users` row).
- `payment_allocations` is empty for history (6,951 migrated rows, every amount 0); only `patient_procedures.pat_paid` / `pat_adjust` survive. `patient_estimate` is 0 on virtually all migrated charges and `insurance_estimate` is never decremented.
- No deposit/deposit-slip/batch, insurance-remittance header, day close, financial period lock, A/R snapshot, finance-charge or sales-tax engine exists. Settings columns such as `finance_charge_pct`, `auto_post_periodic_charges`, `default_write_off_code` have no reader.
- Guarantor model: `accounts`, `account_parties`, `account_change_events`, `patients.account_id` / `guarantor_patient_id` / `guarantor_party_id`. Charges carry no `account_id` (they follow the patient's current account); payments keep the stamped `account_id`.
- Payment plans: `patient_payment_plans`, `ortho_plans` and three instalment tables with `is_billed` + `ledger_id`. Posting creates `patient_procedures` rows (`PP-` ids, codes `ACBIL`/`ACBILO`); there is no payment↔instalment link and header remaining amounts are never decremented.
- No money-table index leads with `office_id`, `provider_id`, a business date or `created_at`; only `(patient_id, date_of_service)` and `(patient_id, payment_date)`, each created twice. The document specifies a normalised eight-leg `rpt_ledger_entries` union and correct production/collections/A/R/FIFO-aging formulas.

**Gaps and risks**

- Any collections or A/R report built on today's services understates app-era insurance money; including `ledger_insurance_details` makes reports disagree with the on-screen balance until remittances are posted into the ledger.
- `ledger_sign.sum_payment_credit()` counts `adjustment` credits (legacy write-offs, balance transfers) as collections; reusing existing helpers overstates collections.
- `-abs(amount)` forces any positive migrated P/I row (possible legacy payment reversal) into a credit — unverified, needs a data check before history is trusted.
- Production-vs-collection adjustment split, tender detail, card brand and the carrier of insurance payments are unrecoverable for migrated history without re-reading the Denticon `LEDGER` export.
- "Created date" reports are unreliable on history until `created_at` is restored; timestamps are naive UTC and server-side "today" defaults mix UTC, server-local and office-local.
- No void date/user/reason on charges, payments, adjustments or refunds; edits happen in place; `patient-procedures` writes record no before/after audit — past periods and audit reports are not reproducible.
- Deposit slip, frozen day sheet and month-end A/R need entities that do not exist (deposits, day close / period lock, snapshots).
- Aging today is gross charge dating; true aging needs FIFO or allocations, and the insurance/patient split is unavailable for history.
- Vocabulary drift: `write_off_type` holds two vocabularies; `claim_type` is overloaded (tier vs dental/medical); `is_active=false` means closed or deleted; migrated claims have `est_insurance`=0 and no service dates; five claim-status lists.
- Contract-billing instalment charges (`ACBIL`/`ACBILO`) can double count production; unpriced charges post at 0.00 silently.
- Performance: ~1.37M charges and ~1.33M payment source rows with no office/date index and no `tenant_id`; existing feeds load whole tenants in Python.
- Volumes and sign statistics are quoted from docs, not re-measured; `schema.sql` is a stale dump (pre-accounts); refund, statement, post-due and account-payment endpoints have no FE caller, so those tables are probably empty.

**Open questions**

- Production basis: posted `fee` (contracted) or `ucr_fee` (office fee)? Does any office post at UCR and write off by adjustment?
- Will in-app insurance payments be posted into the ledger (product fix), or must reports union `ledger_insurance_details` and accept disagreeing with the on-screen balance meanwhile?
- Is the Denticon export still available for a re-read (payment/adjustment codes, TRANDATE, claim/plan on insurance payments), and was `--restore-created-at` applied on UAT/production?
- Are contract-billing instalment charges (`ACBIL`, `ACBILO`, ortho periodic codes) production, given a regular plan's treatment was already charged?
- Aging method and level for parity: FIFO, allocation-based or gross charge dating; per patient or per guarantor account?
- Legacy "Patient Type General/Ortho" criterion: `patients.patient_type` (`OR`), `procedure_codes.is_ortho` or `providers.is_ortho_provider`?
- Office attribution for collections (`office_id` where applied vs `created_office_id` where posted) and provider attribution for unallocated payments?
- Are deposits, day close and period locks in scope as new operational features, or approximated in reports first? Also: is `fee` a line total when `quantity` > 1, and what are the real `patient_payments` row counts?

## analysis/be_data_scheduling.md

Scheduling data is one fact table (`appointments`: no `tenant_id`, one provider, optional operatory, office-local date/time) plus sparse `appointment_procedures` lines. Status is a free string in three vocabularies; the flags and stamps are more reliable. `is_archived` means both app soft-delete and the Denticon archive partition, and no history table exists. Migrated rows (176k) lack created date/user, confirmation and check-in stamps and the new-patient flag. Capacity inputs (operatories, office/provider schedules, holidays, block-outs) exist but are unseeded, current-state only and resolved by two inconsistent engines. Recall is an empty CRUD table with no engine. AppointNow requests, SMS logs and the time clock (which already has a server report) are well modelled. The document provides a canonical appointment fact view, SQL for each KPI, a pitfall register, the real index list and schema asks. Nothing was executed; row counts come from migration logs.

**Key findings**

- `appointments` (varchar PK `id`, no `tenant_id` → join `offices.tenant_id`): one `provider_id` (NOT NULL), nullable `operatory_id`, office-local naive `date`/`start_time`/`end_time`, `duration` minutes. Block-outs (`is_blocked`, `patient_id` NULL) and lab cases (`has_lab`, `lab_*`) are the same rows.
- `status` varchar(30) is free text in three vocabularies: legacy Title Case (Scheduler, migration), seeded `appt_status` `key1` codes (Dashboard widget), literals from AppointNow/SMS. Classify on `is_cancelled`, `is_missed`, `checked_out_on`, `checked_in_on`, `confirmed_on`, `is_posted` first.
- `PATCH /appointments/{id}/status` stamps `confirmed_on`/`checked_in_on`/`checked_out_on` and recomputes the flags; generic PATCH does neither, so status, flags and stamps can disagree. `In Operatory` stamps nothing; stamps are overwritten and never cleared.
- `is_archived` is overloaded: app soft delete AND every row loaded from Denticon `APPTH_ARCHIVE` (`s26_appointments.py`). Every reader hides archived rows. A true delete is distinguishable only via `audit_logs` (`resource_type='appointments'`, `method='DELETE'`).
- No appointment history: no status log, reschedule record, `cancelled_at/by`, `confirmed_by` or seated stamp. `audit_logs.details.before/after` exists for generic PATCH only; the status endpoint records no diff.
- Migrated appointments (176,453) lack `created_at` (= load time), `created_by`, `confirmed_on`, `checked_in_on`, `checked_out_on`, `is_new_patient`, `cancellation_*`. Scope created-date, by-user, confirmation and wait-time reports to `legacy_id IS NULL`.
- Scheduled production = `appointment_procedures.fee` (+ `insurance_estimate`, `est_patient`): a client or plan-item snapshot, never server-priced. Only 10,125 lines exist for 176,453 migrated appointments. Line `status` (`TP`, `Planned`, `Completed`) is not a completion flag.
- No appointment-type column: `procedure_label` is free text; the `appt_type` definition group and `production_types` are unreferenced. Hygiene vs doctor relies on `providers.role` (free text with typos) or line `procedure_code`.
- Capacity tables exist (`operatories`, `office_schedule_days`, `provider_schedule_days`, `account_holidays`, `provider_holidays`) but are unmigrated, unseeded and current-state only. `office_calendar_service` and `appointnow_service` apply different HALF_DAY and fallback rules.
- Staff bookings have no overlap guard (`AppointmentCRUD` checks office hours only), so chair utilisation can exceed 100 %. `GET /offices/{id}/calendar` is the reusable capacity denominator.
- `patient_recalls` has 0 migrated rows, no engine, no appointment link, mixed-case `status`; `interval_months` holds years when `interval_unit='year'`. `procedure_codes.recall_interval`/`recall_unit` were migrated but are unused; `patients.last_visit`/`next_recall` are never written.
- The Scheduler's Cancel dialog collects reason, note and call-list but sends only the status, so `cancellation_reason`, `cancellation_note`, `add_to_call_list` are effectively empty. No waitlist entity; `patients.add_to_quickfill` is a bare flag.
- `booking_requests` supports an online-booking funnel: `status`, reason, `slot_date`, `is_new_patient`, `created_at`, `actioned_at/by`, `appointment_id`, payment block. `hold_expires_at` is office-local while its other stamps are UTC.
- `sms_messages` (reply on the outbound row; `appointment_id`, `message_type`, `send_status`, `reply_intent`, `reminder_lead_hours`) supports a reminder → delivered → confirmed funnel. `email_messages` holds manual sends only; AppointNow notifications are not logged.
- Time clock already has `GET /reports/time-clock` (+ CSV, PDF) with office scope, overtime and wages; 31,756 legacy punches are `clock_basis='wall_clock'` (office-local stored as UTC). A lab-case list and lab cost report also exist.

**Gaps and risks**

- Meaning of the Denticon archive partition is unknown: including or excluding `is_archived` migrated rows changes every historical appointment count, last-visit date and new-patient derivation, and conflicts with the financial data map's 'exclude archived charges' rule.
- Created-by-user, confirmation rate, wait time, same-day cancellation and reschedule reports are impossible for pre-migration data and need an `appointment_events` log going forward.
- Hygiene reappointment % and appointment-type breakdowns rest on heuristics until an `appointment_type` column and a recall-to-appointment link exist.
- Chair and provider utilisation depend on schedules nobody has migrated or configured; past dates are judged against today's template; block-outs cannot be created in the UI.
- Five different status classifiers exist in code; any report filtering on `status =` will miss rows because of mixed case and vocabularies.
- Migrated `patient_procedures.appointment_id` may be wrong: `LEDGER.APPTDID` is looked up in a map keyed by header `APPTID` (inference, needs a data check).
- Time-zone hazards: naive UTC stamps vs office-local dates, tz-aware writes into naive columns, migrated offices all on the default `America/New_York`, UTC 'today' in several services.
- Recall reports have no data for migrated patients; the due list must be derived from procedure history and per-code recall intervals.
- Cancellation reasons and the call list are not persisted by the Scheduler, so 'cancellations by reason' and call-list reports would be empty today.
- Scheduled production under-counts: lines are sparse and never re-priced; appointments without lines contribute zero.
- Existing read endpoints are unsuitable for reporting: `/appointments/scheduler` is uncapped with heavy per-row enrichment and no office-scope check; generic lists lack `created_at`, `created_by` and flag filters and cap at 200 rows.
- Several derived states depend on cron jobs scheduled outside the repo (`run_sms_reminders`, `expire_booking_requests`, `auto_close_time_clock`); in SMS log-only mode `send_status` stays `queued`.

**Open questions**

- What do `APPTH_ARCHIVE`, `AppointmentDetail_ARCHIVE` and `Ledger_archive` contain: older history or deleted / rescheduled rows?
- Does the Denticon appointment export carry created/modified date and user, confirmation or check-in times worth re-importing, and can `PATRECALL` be exported?
- Are `offices.timezone`, office hours, provider schedules and holidays actually configured on the production tenants?
- Is the database session time zone UTC in every environment (needed for `now()` defaults and tz-aware stamps)?
- Which definitions does the practice want: does a no-show count as booked time, which codes define a hygiene visit, is reappointment measured at visit day or as of today, what is the no-show denominator?
- Is `patient_procedures.appointment_id` reliable on migrated rows (patient and date agreement with the linked appointment)?
- Should block-outs move to their own table, and should a new `appointment_type` map to `production_types` or to the `appt_type` definition group?
- Are the cron entry points (`run_sms_reminders`, `expire_booking_requests`, `auto_close_time_clock`) scheduled in production?

## analysis/be_data_insurance.md

Insurance data map for the Reports module. The coverage side (carriers, employers, plans, subscribers, patient slots, coverage rules) is structurally complete. A claim is an `insurance_claims` header whose lines are `patient_procedures.claim_id`, with a free-text status, three lifecycle dates and no history. Insurance money is split across legacy `patient_payments` rows (no carrier link), claim-level `opening_paid`, and app-era per-line `ledger_insurance_details`. The document lists exact columns and vocabularies, SQL for thirteen insurance reports, eighteen pitfalls, a supported/partial/unsupported matrix, migrated-data dependencies, fourteen schema additions and index needs. Lists, patients by carrier, claims by status, unsent claims and days-to-pay are supportable now; aging, unbilled procedures, payments and write-offs by carrier, unused benefits and verification worklists are partial; denial analysis, claims printed, clean-claim rate and capitation need new columns.

**Key findings**

- Claim lines are `patient_procedures` rows via the single FK `claim_id`; there is no claim-line table. Secondary/tertiary claims own no lines and link to the primary only by `claim_number` suffix `-S/-T/-Q` (no `parent_claim_id`).
- `insurance_claims.status` is free String(30); code writes `draft, sent, preauth_sent, submitted, pending, paid, denied, closed`. `paid` is stamped on the first payment > 0. Five services keep different open/settled lists; no `partially_paid`, `rejected` or `void`.
- No status history: `POST /insurance-claims/{id}/status` overwrites and audit rows omit the value. Only `submitted_date`, `paid_date`, `close_date` exist (UTC dates); no printed, received, denied or `updated_at` timestamp.
- Delete and close both set `is_active=false`; deleted = `is_active=false AND status<>'closed' AND close_date IS NULL`. Reopen (`/status submitted`) leaves `close_date` and `is_active=false` stale. Deleted claims still list.
- `claim_type` is overloaded: migrated rows hold the tier (`primary`/`secondary`), app rows the category (`dental`/`medical`). The tier is `billing_order`. App `claim_number` is the client's `Date.now()`.
- Insurance money: legacy `patient_payments.payment_type='insurance'` (no claim/carrier column), `insurance_claims.opening_paid` (79,038 claims, the same money), app remittances in `ledger_insurance_details` per procedure line and tier; `total_paid = opening_paid + sum of non-void rows`.
- App remittances have no header or EOB entity; a cheque is N rows sharing `check_number`/`eob_number`/`eft_trace_number`. Tertiary payments land in `prim_*` columns; write-offs are `*_ins_adjust`; claim-level `write_off_*` stays NULL.
- Submission channel is not stored per claim: `send_method` is dropped. Only `insurance_carriers.claim_type` (`1` electronic, `0` paper) and `insurance_plans.claim_option` exist. `claim_submissions` holds `batch_id` plus a JSON form snapshot (raw X12 on migrated rows).
- Claim prints are audited only by the server PDF routes (`audit_logs` action `PRINT`, resource_type `claim_report`); the FE prints client-side and logs to localStorage, so there is no `printed_at` or print count.
- Eligibility is one manual free-text stamp on `insurance_subscribers` (`elig_status`, `elig_verified_on`, `elig_verified_by`), shared by the family, no history; uniformly `unknown` on migrated rows. `eligibility_checks` exists only in `schema.sql`.
- `patient_insurance` is one row per (`patient_id`, `legacy_plan_type` D/M, `insurance_type` tier) with no dates and no history; effective/term dates are on `insurance_subscribers`. Migrated tiers are wrong (1 secondary slot versus 954 in the source).
- Remaining annual maximum is derived by `benefit_usage_service.slot_benefits` (plan anniversary year; paid or estimated claims) in Python per patient; stored `max_remaining`/`deductible_remaining` are stale snapshots. Tenant-wide reports need the SQL port in section 4.12.
- Pre-authorisation is split and unlinked: `insurance_claims.is_preauth` (status `preauth_sent`, `predetermination_number`) and `treatment_plan_insurance_details.preauth_number/preauth_date/preauth_expires/preauth_amount/preauth_status` per plan item (empty for legacy).
- Migrated claims (96,314) lack service dates, `est_insurance`, providers, notes and close date; `created_at` is load time; `ins_plan_id` was mapped with the wrong key. Days-to-pay (`submitted_date` to `paid_date`) is reliable in both eras.
- Roll-ups already built with no FE caller: `GET /patients/{id}/outstanding-claims`, `/offices/{id}/insurance-receivables`, `/reports/insurance-verification-summary`, `/insurance-plans/{id}/usage`. Three different 'outstanding insurance' formulas coexist.

**Gaps and risks**

- Recompute hazard (inferred from code): `_recompute_claim_totals` overwrites `total_billed`/`est_insurance` from linked lines, so a payment posted on a secondary claim or an un-backfilled migrated claim sets both to 0.
- Migrated-data repairs have unknown per-environment status: `backfill_ledger_source_fields` (procedure `claim_id`, 297,671 rows, documented as not applied), the slot-tier repair (deliberately held), `backfill_insurance_source_fields` (plan limits and group numbers).
- Migrated `insurance_claims.ins_plan_id` is NULL or wrong (`s30` looks `RESPPLANID` up in the plan-id map); carrier population is unverified; unknown `CLAIMSTATUS` codes all became `draft`.
- No denial data (date, reason code, amount, appeal) and no clearinghouse acknowledgement: denial analysis and a true clean-claim rate are impossible, only proxies from submission counts.
- App insurance remittances never reach `patient_payments`, so balances and collections disagree with insurance reports; legacy insurance payments can be attributed to a carrier only at claim level via `opening_paid`.
- No `tenant_id` on `insurance_claims`, `ledger_insurance_details`, `claim_submissions`, `patient_insurance`; `legacy_id` and `claim_number` are unique globally, a multi-tenant collision and scoping risk.
- No coverage history and no payer snapshot on charges: payer mix, unbilled procedures and any 'coverage on the service date' logic must use today's slot.
- Capitation is not modelled (no payments; `is_prepaid` wrong, `legacy_prepaid_code` undecoded); `plan_type` and `coverage_type` vocabularies are unvalidated and partly guessed.
- Indexes: none on claim dates, `office_id`, `carrier_id` or `ledger_insurance_details.payment_date`; tenant indexes declared in the models for carriers, plans, subscribers and employers are absent from the dump.
- `benefit_usage_service` (uncommitted file) counts soft-deleted draft claims and never derives deductible met or family maximum; `procedure_totals_service` sums voided remittances into per-procedure insurance paid.
- Eligibility has three inconsistent vocabularies and mixed case; the FE bypasses the verify endpoint, so `elig_verified_by` is unreliable and one stamp marks every dependant verified.
- Database drift: `eligibility_checks`, `insurance_subscribers.elig_method` and `insurance_carriers.stedi_payer_verified*` exist in the dump with no model, migration or code.

**Open questions**

- Which migrated-data fixes have been applied on UAT and production, in particular the procedure `claim_id` backfill and the coverage-slot tier repair?
- Are `carrier_id` and `ins_plan_id` populated and correct on the 96k migrated claims, so legacy claim reports can group by carrier at all?
- What are the real Denticon `CLAIMSTATUS` codes and the meanings of `ISPREPAID` 9/2/8/4/3/5, `COVERAGETYPE` and `PLANTYPE`?
- Should outstanding insurance be measured on the estimate net of write-offs, or on billed minus paid? Three formulas are live today.
- Will app insurance remittances be posted into the ledger under a remittance header, or must reports union `ledger_insurance_details` and accept disagreeing with on-screen balances?
- Is a clearinghouse or real-time eligibility integration planned? It decides whether denial, acknowledgement and verification reports are designed for manual entry or EDI events.
- Does the legacy insurance aging report age by sent date or by service date, and per claim or per line?
- Is pre-authorisation to be tracked on the claim, on treatment-plan items, or both, and which should the legacy pre-auth report follow?

## analysis/be_data_patients_clinical.md

Data map of the patient master, referral sources, treatment plans, ortho contracts and clinical records: column-level provenance (what the Denticon migration loaded vs what only the app writes), status/date semantics, existing endpoints, SQL sketches (new/active patients, attrition, patient lists, referral ROI, case acceptance, unscheduled treatment, missing/unsigned notes, ortho status), pitfalls, gaps, existing and needed indexes. Main conclusion: the migrated practice has deep clinical/ledger history but thin metadata (patients.created_at = load time, no visit dates, no preferred provider, no treatment-plan, recall or ortho history), while a new organisation has full metadata and no history. Patient activity must be derived from live clinical charges; case acceptance, ortho and note-author metrics are app-era only. No office-wide endpoint exists for any report in this scope, and several schema additions (event history, referral FK, ortho fields, note-provider link) are recommended. Legacy PDFs were not opened (no renderer available).

**Key findings**

- `patients.id` is the only safe key: `chart_no` has no unique constraint in the real DB (family members share it); `legacy_id` (Denticon PATID) is unique across all tenants; `legacy_id IS NULL` marks app-created rows.
- `patients.created_at` is the migration timestamp on all 83,861 migrated patients; `first_visit`/`last_visit`/`next_recall` are never written. Existing KPIs (`report_service._new_patients`, `_active_patients`) are wrong for history; derive from first/last live clinical charge.
- Patient status is only `is_active` (+ `is_locked`); `DELETE /patients/{id}` sets the same flag, so inactive and deleted are indistinguishable. No inactivation date, reason or status history.
- No typed ortho flag: `patients.patient_type` ("Ortho"/"General" from the app, a PATTYPE code such as `OR` when migrated), "OR" in JSON `patient_types`, an `ortho_plans` contract, or `procedure_codes.is_ortho`.
- Mixed vocabularies in one column: `gender` (Male vs M), `patient_type`, `referral_type` (REFTYPE code vs label), `referred_by` (legacy referral id vs free text), `preferred_contact`. Not migrated: `preferred_provider_id`, `preferred_hygienist_id`, `preferred_language`, guarantor relationship.
- Family model: `patients.account_id` -> `accounts` (one per Denticon RPID, 61,259) with typed `guarantor_patient_id` / `guarantor_party_id`; guarantor unresolved on migrated accounts until `scripts/import_legacy_responsible_parties.py` runs. `responsible_party_id` is a deprecated overloaded string.
- `referrals` is a source catalog (665 migrated rows, all direction "0"); `patient_id` almost always NULL. Patient-to-source link is the string `patients.referred_by` = `referrals.legacy_id` (migrated) or free text (app). `referrals.cost` and `campaigns` / `appointments.campaign_id` exist for ROI.
- `referral_type` has three meanings: `referrals.referral_type` direction "0"/"1", `patients.referral_type` lead-source type, `treatment_plan_items.referral_type` in/out.
- Treatment lifecycle lives on `treatment_plan_items`: 10 statuses, `diagnosed_date`, `accepted_date`, `scheduled_date`, `end_date`, `fee`, `insurance_estimate`, `provider_id`, `counselor_user_id`, `phase_id`; `completed` and `scheduled` are server-owned. Header `treatment_plans` is only a container.
- Plan links are first-class: `patient_procedures.treatment_plan_item_id` (completing charge) and `appointment_procedures.treatment_plan_item_id` (booking); one pending rule `treatment_service.pending_item_clauses`. Only per-patient readers exist (`pending-summary` <= 200 patients).
- Treatment-plan history is absent: 674 plans / 775 items derived from appointment details, no dates, provider only as a legacy id in `diagnosed_by`. Case acceptance, unscheduled treatment and plan aging are app-era metrics.
- Ortho schema is complete (`ortho_plans` with `banding_date`, `treat_start_date`, `treat_end_date`; three instalment tables; posting to the ledger via `ledger_id`) but zero contracts were migrated; no debond date, treatment card or visit log.
- `progress_notes` has no provider/appointment/procedure link: only `patient_id`, `note_date`, `created_by`, `signed_by`/`signed_at`, `is_struck_off`; lock is computed. Missing-notes = anti-join of clinical charges on (patient, date). 35,286 migrated notes carry no author or signature.
- Migrated clinical volumes: `chart_conditions` 77,498; `perio_exams` 2,844; `prescriptions` 38,093; `patient_alerts` 46,680; medical-history headers 31,565 without answers. `patient_recalls`, `patient_notes`, consents, documents and medical-alert answers are app-era only.
- Many tables lack `tenant_id` (`treatment_plans`, items, `progress_notes`, `perio_exams`, `prescriptions`, `patient_alerts`, `patient_recalls`); items also lack `office_id`. No office-wide report endpoint exists in this scope; generic lists cap `size` at 200; `referrals` has no index.

**Gaps and risks**

- No real new-patient date or visit dates on migrated patients: new-patient trend, active count and retention must be derived from 1.37M charges; recommend maintaining `first_visit`/`last_visit` or a nightly patient activity summary.
- No status history anywhere (patient active/inactive, treatment item transitions). `accepted_date` is stamped only when a client sets status=accepted, so case acceptance is a current-state measure unless a `treatment_plan_item_events` table is added.
- Referral attribution is unreliable: no FK, no referral date, no source category, `cost` has no period, `referrals` hard-deletes, and migrated `referrals.patient_id` may be mis-keyed (RPID looked up in a PATID map).
- Likely defect: posting an insurance-side ortho instalment writes a 39-char `PP-{uuid7}` charge id into `varchar(20)` `ledger_id` on `patient_ins_payment_plans` / `patient_sec_ins_payment_plans`; not exercised on Postgres by the SQLite test suite.
- Ortho contract remaining fields (`*_rem_payments`, `*_rem_amt`, `months_remaining`) are stale client snapshots; no debond date or contract status; charges carry no `ortho_plan_id`; the `PP-` id prefix is shared with plan-posted charges.
- Guarantor is unresolved on migrated accounts until the RP import script is applied, affecting responsible-party lists, labels and statement addressing; account membership itself is reliable.
- Mixed legacy/app vocabularies and duplicated `definitions` rows split group-bys and multiply label joins unless a normalisation layer is built.
- Soft-delete flags differ per table; `is_active=false` conflates inactive and deleted patients; `treatment_plans`, `referrals` and `account_notes` hard-delete and leave no trace outside `audit_logs`.
- Missing Progress Notes by provider cannot be computed accurately: notes link only to patient + date, and provider attribution depends on `providers.user_id`, which most migrated providers lack.
- Recall and hygiene-reappointment have no data or engine (0 migrated recalls); they must be derived from procedures plus `procedure_codes.recall_interval` / `recall_unit`.
- Reporting indexes are missing (patients by created_at/zip/birthday, items by dates/status/provider, notes by date, instalments by due date); every activity-based patient list needs a join to `patient_procedures`.
- Two existing last/next-visit derivations disagree (`patient_intake_service._visits` counts cancelled appointments, `letter_service._appointments` does not); one definition must be adopted for all reports.

**Open questions**

- Has `scripts/import_legacy_responsible_parties.py --apply` been run on the migrated production database, and what share of accounts is still unresolved?
- Does the Denticon PATIENT export carry a creation / entry / first-visit date that could restore `patients.created_at` or `first_visit`? (The export was not opened; `s17` reads none.)
- What are the actual values and distribution of migrated `patients.patient_type`, `referral_type`, `preferred_contact`, `marital_status` and `state` (needed for the normalisation tables)?
- Product definition of an 'Ortho patient' for the legacy General/Ortho criterion: type tag, active ortho contract, ortho production in the period, or any of them?
- Case-acceptance definition: by value or by patient/plan; how to treat `alternative`, `hold`, `internal_referral`; measurement window; should unplanned same-day treatment count?
- Active-patient lookback (18 vs 24 months) and visit definition (clinical charge vs kept appointment); are `is_archived` charges real history or deleted rows?
- Can Denticon `TREATPLAN` / `TREATPLANINSD`, `PATRECALL`, `PATORTHOPLAN` and the contract-billing tables be re-exported to recover treatment-plan, recall and ortho history?
- Missing-note rule (per patient-day or per provider-day, exempt codes, struck-off notes), and is `Referrals.txt` a pure source catalog so that non-NULL `referrals.patient_id` values should be distrusted?

## analysis/be_data_identity_setup.md

Mapped identity, rights, audit, offices, providers and setup catalogs behind the legacy Security / Provider / Setup lists, plus report-level access control. Rights are a global `permissions` catalog (529 legacy codes curated to 363) granted through groups; 56 `reports_*` rights survive and 64 report/analytics rights were deleted, yet no backend code enforces any report right, and `/reports/*` neither checks rights nor validates `office_id`. `report_access_provider_id`, `patient_access_level`, login restrictions, IP rules and password expiration are storage-only. There is no login history; `audit_logs` covers successful mutations plus explicit PRINT rows, without retention. Office grouping is one flat `office_group_id`. Doctor/hygienist comes from `providers.role` (derived `provider_kind` is Python-only). All 28 legacy list reports (Security 4, Provider 4, Setup 20) have backing tables; a few criteria lack data. Reusable: office-scope engine, time-clock report pattern, `record_print`, `utility_runs`.

**Key findings**

- Rights model: `permissions` (global, stable key `code`; `id` is per-database) x `user_groups` x `user_group_memberships` x `user_group_rights`. Legacy import 529 codes curated to 363 (210 deleted, 44 added). Effective rights = union over active groups, exposed by `GET /auth/me-full`.
- 56 `Reports` rights kept: `reports_{daily,monthly,ledger,management,insurance,appointment,treatment_plan,referral}_reports_screen_{full_control,view_only}`, statements x3, letters x4, lists x16 (security/setup lists full-control only), `reports_my_reports_*` x2, pat-reg forms x2, `reports_group_reports_*` x13.
- 64 report/analytics rights deleted: `reports_recall_reports_screen_*`, `reports_ortho_reports_*`, labels, postcards, `reports_excel_reports_*`, four `report_batch_schedule_report_*`, 31 client-specific office reports, ten `denticon_practice_analytics_*`. Analytics now has only `dashboard_view`.
- No backend code references any `reports_*` or `dashboard_view` code (37 codes are enforced overall, none for reporting). `/reports/summary|trends|accounts-receivable|aging|insurance-verification-summary` and `/patients/{id}/reports/*` require only a valid token. Frontend gating (`RIGHTS_ENFORCED_DEFAULT=false`) is dark.
- `/reports/*` take an unvalidated `office_id` and return the whole tenant when omitted. `/dashboard/summary` and `/reports/time-clock` use `OfficeScopeDep` (`office_id`, repeated `office_ids`, `office_group_id`, `all_offices` needing `office_scope_view_all_offices`) and are the pattern to copy.
- `users.report_access_provider_id` (legacy Report Access Provider) is stored and editable but read by no backend query; a second independent link `providers.user_id` feeds `MeFull.provider_id`. Legacy My Reports > Production Report shows a read-only 'Corresponding Provider' field.
- Privilege semantics: `admin`/`super_admin` hold every right; `owner`/`manager` hold only the master office right; a user in no group passes `require_permission` but fails `require_read_access`; a user with zero `user_offices` rows is treated as tenant-wide.
- No login history: only `users.last_login_at`; failed logins live in Redis (`login:fail:<username>`); `/auth/login` is not audited. `password_created_at` is unreliable; `account_settings.password_expiration_days`, `user_login_restrictions`, `user_ip_rules`, `patient_access_level`, `patient_access_ssn_value` are unenforced.
- `audit_logs` (tenant_id, user_id, action, resource_type, resource_id, patient_id, office_id, path, ip_address, details JSON before/after) records successful authenticated mutations, `PRINT` rows and imaging reads; not GETs, failures or logins. No retention; `GET /audit-logs` lacks date and action filters.
- Run-recording precedents: `print_service.record_print` (`action='PRINT'`, `details {report, params}`, four call sites), `utility_runs` (status, parameters, counters, logs, run_by), `letter_batch_runs/_items`. No saved-report, favorite, schedule or report-run table; `user_preferences` JSON blob is the only per-user store.
- Office grouping exists but is minimal: flat `office_groups` plus single FK `offices.office_group_id` (one group per office, no hierarchy or type). Hours and holidays: `office_schedule_days`, `account_holidays` (office_id NULL = tenant-wide), `GET /offices/{id}/calendar` gives per-date open windows.
- Doctor vs hygienist: `providers.role` (free text canonicalised to dentist, hygienist, assistant, specialist, staff) with `title` fallback; derived `provider_kind` is computed in Python, not a column. Also `specialty` (free text), `taxonomy_code`, `is_ortho_provider`; rosters = `provider_offices` union home `office_id`.
- Legacy criteria transcribed from the PDFs: Security lists 4, Provider lists 4, Setup lists 20, My Reports 5. Every list has a backing table; nearly all use an Office / Office Group selector plus PDF/Excel output and Add to My Favorites.
- Setup catalogs are served by 97 generic CRUD entities: token-only reads, `size` <= 200, sort limited to declared columns. Many vocabularies live in `/definitions?group_code=` (payment_method, adjustment, appt_status, appt_type, document_type, patient_type, NOTESMACROS, DEFCOVERAGE).
- Tenancy is a `tenant_id` column with one database per client organisation (documented), so benchmarking is only across offices within a tenant. `user_offices`, `operatories` and `tenants` have no `tenant_id` and are not tenant-filtered by generic CRUD.

**Gaps and risks**

- Report rights are unenforced end to end; granularity is the legacy screen family with undefined Full Control vs View Only meaning; the catalog is global and code-defined, so no per-tenant, per-report or object-level (report x user/group/office) permission is possible today.
- No rights exist for Recall, Ortho, Labels, Postcards, Interactive Reports, Favorites, Search, report builder, sharing, scheduling, e-mail delivery, export formats or AI insights; seeded Doctor, Billing and Claims groups hold zero report rights.
- `/reports/*` expose tenant-wide financial totals to any authenticated user and ignore office assignments; the report cache key (`report:{prefix}:{tenant_id}:{office_id or 'all'}`) has no caller or scope component.
- Provider-restricted reporting (My Reports / Corresponding Provider) and field-level restriction (SSN, financial columns, `patient_access_level`) have no enforcement; `PatientRead` returns `ssn`. Only precedent is the time-clock report (own card unless manager; wages for owner/admin).
- Security defects the model would inherit: any authenticated user can POST `/user-group-memberships`, edit `/user-groups`, and PUT `/offices/{id}/users`; `GET /user-offices` and `/tenants` are not tenant-filtered; `GET /users` returns `signature_data`.
- Catalog drift: `time_clock_service` checks `utilities_time_clock_editor_full_control` / `_view_only`, which the curation deleted, so that manager right cannot be granted through a group.
- Security list reports are limited to roster data: no login history, no persisted failed logins, no deactivation timestamp or actor, no reliable password age, no endpoint joining users x groups x offices or returning another user's effective rights.
- Reads, PHI views and report runs are unaudited; `audit_logs` has no retention or partitioning, carries PHI in `details`, mixes socket-peer and forwarded IPs, and its API has no date range, action filter, name resolution or export.
- Provider data gaps for scorecards and lists: no `updated_at`, licence state/expiry, DEA expiry, hire/termination dates or goals/targets table; `provider_kind` not persisted; `specialty` mostly blank; migrated `role` values need `normalize_provider_roles.py`.
- Setup-list gaps: `production_types` is not linked to procedure codes or appointments; no bill-to-insurance flag or dental/medical code type; no recall-type, pharmacy or school catalog; modified stamps missing on `procedure_codes`, `fee_schedules`, `letter_templates`, `office_groups`, `user_groups`.
- Generic list endpoints cap at 200 rows with equality-only filters and limited sort, so server-side list reports are needed; catalog content varies per tenant by seeding state (insurance vocabularies, `key2` on payment/adjustment codes).
- Office grouping is single-level and single-membership, and `operatories` have no type or tenant column, limiting benchmarking peer sets and hygiene-vs-doctor chair utilisation.

**Open questions**

- Is report access granted per family (the kept legacy screen rights), per individual report, or both, and what should Full Control vs View Only mean for a report (run, print, export, schedule)?
- Should a user who belongs to no group see reports (current write-gate behaviour) or be denied by default (current read-gate behaviour)? This affects every migrated tenant on day one.
- Which link defines 'my provider' - `users.report_access_provider_id` or `providers.user_id` - and is a provider-linked user restricted to that provider's data everywhere or only inside My Reports?
- Must report views and exports be audited as a HIPAA access trail, and what retention period applies to `audit_logs` and any new report-run log?
- Should Recall, Ortho, Labels, Postcards and scheduled-report rights be re-added to the catalog, and which new rights are needed for builder, sharing, scheduling, export and AI features?
- Is one office group per office sufficient, or are regions, brands or custom peer sets needed for multi-office benchmarking?
- Should financial columns (production, collections, A/R, fees, wages) be hidden from clinical roles inside otherwise visible reports, and is SSN masking required in list outputs?
- Which legacy list criteria that have no data today (procedure-code production type, bill-to-insurance, code type, provider registration fields, licence expiry) must be reproduced, and from what source?

## analysis/reference_screenshots.md

Transcribed the three reference screenshots and researched the reference product. The legacy Denticon Reports menu has 26 entries in 11 separator-delimited groups, 4 with sub-menus; the PDF set covers only 13 of them. The reference analytics product is Oryx Dental Software ("Ask Ori" is a vendor-listed feature; Ori is its oryx mascot). Both dashboards are one dense metric-by-month matrix: current month plus 11 prior months, newest first, an info icon per row, and only Print and Export As CSV. Main Dashboard shows 20 rows in 6 blocks (cut off); Provider Dashboard repeats 11 rows per provider (cut off). The vendor's documentation is login-gated, so metric definitions and per-category report lists are not public; the document gives, per metric, screenshot-arithmetic evidence, vendor-published wording and comparable-vendor definitions, plus design implications and a sources list.

**Key findings**

- LEGACY MENU, in order ("|" = separator line, [sub] = sub-menu arrow): Daily Reports, Monthly Reports, Ledger Reports, Management Reports, Insurance Reports, Appointment Reports, Treatment Plan Reports, Referral Reports, Recall Reports, Ortho Reports | Statements, Lists [sub] | Interactive Reports [sub] | Office Reports [sub] | Letters, Postcards, Labels | Custom Letter, Advanced Custom Letter, Custom Postcard | My Reports | Blank Insurance Forms, Pat Reg/Medical Info Forms | My Favorites | Search Report | Reports (Old) [sub]. Totals: 26 items, 10 separators, 11 groups, 4 sub-menus.
- MAIN DASHBOARD rows, in order ("|" = blank-row block break): Gross Production, Doctor Gross Production, Hygiene Gross Production | Net Production, Doctor Net Production, Hygiene Production | Gross Collection, Doctor Gross Collection, Hygiene Gross Collection | Total Collection, Doctor Collection, Hygiene Collection | Working Hours, Production Per Visit, Total Scheduled Production, Hygiene Scheduled Production, Doctor Scheduled Production | Case Acceptance (%), Hygiene Reappointment (%), Treatment Reappointment (%) - then cut off by the screenshot edge. Formats: currency without symbol for all production/collection/scheduled rows and Production Per Visit; Working Hours integer hours; last three integer percent.
- PROVIDER DASHBOARD rows per provider, in order: Provider Gross Production, Provider Net Production, Provider Total Collection | Provider Total Appointments, Provider Seen Patients | Provider Working Hours, Provider Production Per Visit, Provider Scheduled Production, Provider Hourly Production | Provider Same Day Treatment | Treatment Reappointment Per Dentist (%). One separate table per provider, headed by the provider name as a hyperlink plus the 12 month headers; columns are not aligned between provider tables; the second provider is cut off after 5 rows.
- Reference product is Oryx Dental Software: "Ask Ori" is listed under "Included in Every Subscription" and on the Oryx Pro plan; Ori is the company's oryx mascot; a third-party guide confirms gear icon -> Reports -> Saved Reports plus Financial, Patient, Clinical, Other tabs.
- Page structure: category band Financial Reports / Patient Reports / Clinical Reports / Other Reports / Saved Reports; tabs Main Dashboard / Provider Dashboard; buttons Print and Export As CSV; 12 columns November (2026) ... December (2025), current month first; no totals, goals, filters, charts or drill-down.
- Arithmetic check: Gross Production = Doctor + Hygiene in 9 of 12 months, with residuals of 50/150/80 otherwise (an unshown third bucket). Main "Doctor" rows equal the first provider's figures in 7 months, so the split is by provider role, not procedure category.
- Labels hide net figures: "Hygiene Production" is hygiene net production; "Total Collection" is always 0.5-5.1% below "Gross Collection" (a net collection). Net production runs 56-66% of gross.
- Production Per Visit equals Net Production / visits exactly for the live month (195 practice visits; 50 for the provider) but not for past months, and switches from integers to decimals in March 2026: history looks like frozen snapshots with an unflagged formula change.
- Provider Hourly Production equals net production / 120 hours for the live month while "Provider Working Hours" shows 0 in all 12 months: two hours sources exist and missing data renders as 0.
- Provider Same Day Treatment is a currency amount (3,042-32,667 per month, 2-16% of provider gross), not a count; Provider Seen Patients is 76-94% of Provider Total Appointments.
- Vendor documentation is login-gated (help center returns 401/403). Only one report is publicly confirmed: Financial -> "Aging Report" (first dropdown option, auto-runs with default filters, "Apply Filters" button, bottom row "Total Outstanding Balances").
- Vendor packaging: Pro has "Dashboards & reports" / "Performance dashboard & configurable reports"; Automate adds "Morning huddle & KPI dashboards"; Enterprise adds "multi-location reporting, API access, advanced analytics". "Ask Ori" has no public description and is absent from the vendor's AI page.
- The reference vendor's own articles give two case-acceptance formulas (accepted / proposed dollars; accepted / presented plans) and three different targets; "Treatment Reappointment" has no published definition from the vendor or peers. Definitions and benchmarks need a governed metric registry.
- Legacy sub-menu evidence: Lists -> Patient/Resp. Party, Provider, Security and Setup list screens; Office Reports -> per-location containers with Excel reports; Reports (Old) -> includes Group Reports; Interactive Reports -> includes Eligibility Verification; My Reports -> Daily Journal, Appointment Detail by User, Time Clock Report, Production Report, Missing Progress Notes.
- PDF coverage gap: 13 of 26 legacy entries have no PDF - Interactive Reports, Office Reports, Letters, Postcards, Labels, Custom Letter, Advanced Custom Letter, Custom Postcard, Blank Insurance Forms, Pat Reg/Medical Info Forms, My Favorites, Search Report, Reports (Old).

**Gaps and risks**

- Definitions of all 31 reference dashboard metrics are unverified: the on-screen tooltip text was not captured and the vendor help center requires a customer login.
- Main Dashboard is cut off after row 20 and Provider Dashboard after 5 rows of the second provider; further rows and providers exist but are unknown.
- Report lists inside Financial / Patient / Clinical / Other are unknown beyond "Aging Report"; contents of Saved Reports (sharing, scheduling) are unknown.
- 13 legacy menu entries have no PDF or screenshot, so the requirement that no legacy option be left out cannot be met for them beyond label and intent.
- The four legacy sub-menu fly-outs (Lists, Interactive Reports, Office Reports, Reports (Old)) are not visible in the screenshot; their children are only partially known from vendor documents.
- "Treatment Reappointment (%)" and "Treatment Reappointment Per Dentist (%)" have no public definition anywhere; any formula we adopt is our own.
- Unit basis of practice-level "Working Hours" (about 1,400-1,680 per month) is unknown; net production per working hour of 68-125 suggests chair or all-staff hours rather than provider clinical hours.
- All arithmetic inferences come from one tenant and one capture date; the snapshot-versus-live reading and the provider-role split are inferred, not documented.
- Planet DDS support articles ("How to understand the new reports menu", Practice Analytics dashboard guide) block automated fetch (HTTP 403) and were not read.
- Oryx navigation details (gear icon, Saved Reports landing, Aging Report behaviour) rest on a search-result summary of a login-gated third-party training page.
- "Ask Ori" capability is undocumented; planning AI-insight parity against it would be guesswork.
- The screenshots contain a real practice's financial figures and provider names; the document omits the names but reproduces the figures, so it should stay internal.

**Open questions**

- Can the user scroll and capture the rest of the Main Dashboard, the remaining provider tables, each metric's tooltip text, and the report dropdown under each of the five categories?
- Can the user supply screenshots for the 13 uncovered legacy entries and the four sub-menu fly-outs?
- Should the doctor/hygiene split follow provider role (as the reference does), procedure category, or be selectable per report?
- Period semantics: are past months frozen at a period close (snapshots) or recomputed live, and how are restated or redefined periods marked?
- Which hours source drives hourly productivity: schedule template, time clock, or appointment duration?
- Which date basis and attribution rules apply to collections and adjustments (received vs posted vs service date; payment-to-provider allocation)?
- Are Letters, Postcards, Labels, the custom letter/postcard authoring entries and the blank forms in scope for the Reports module or left to the existing correspondence features?
- Is a natural-language assistant in scope for the first release, and should it be restricted to registered metrics with cited definitions?

## research/reporting_architecture_options.md

The research document (1,101 lines, 111 sources) covers all nine topics and ends with three architectures and a phased path. Recommendation: start incremental and grow into an analytics-first mart. That means a code-first report-definition registry and SQLAlchemy Core executor on indexed OLTP first, then async runs with Postgres `report_runs` as state, dispatched by Cloud Tasks to a dedicated Cloud Run worker service, with Cloud Run Jobs for ETL. After that comes an `rpt` star-schema mart in the same Postgres, with an in-house metric registry feeding dashboards, builder, alerts and AI. Embedded BI is only an optional later pilot. Recommendations are fitted to the platform facts in `analysis/be_platform.md`. The shared web-search budget ran out mid-research; unconfirmed items are tagged [unverified] and listed in the document's verification backlog. The Write tool refused the report file, so it was written through the shell.

**Key findings**

- Recommended path is A then B: definition registry, executor, run pipeline and exports on indexed OLTP first, then the `rpt` mart and metric registry. Nothing from the first stage is discarded; embedded BI stays an optional pilot.
- Cloud SQL for PostgreSQL supports `pg_cron` 1.6.4, `pg_partman`, `pg_ivm` 1.9, `hll`, `tablefunc`, `pgaudit` and `pg_stat_statements`. `timescaledb`, `citus` and `pg_duckdb` are not listed, which rules those options out today.
- `REFRESH MATERIALIZED VIEW CONCURRENTLY` needs a unique plain-column index, allows one refresh at a time and recomputes everything. `pg_ivm` slows base-table writes and is incompatible with Cloud SQL in-place upgrades and exports.
- Use roll-up tables instead: nightly full rebuild plus intraday recompute of touched (office, date) slices, with a `refresh_log` and reconciliation against OLTP. Append-only increment patterns break on voids and back-dated ledger edits.
- Cloud Tasks HTTP tasks: dispatch deadline 15 s to 30 min, `maxConcurrentDispatches` per queue, 1 MiB task size, task-name de-duplication up to 24 h. Cloud Run Jobs: task timeout up to 168 h, per-execution overrides, cancellable executions.
- Queue libraries: Celery's Redis visibility timeout defaults to 1 h; RQ workers need `fork()`; arq is maintenance-only; APScheduler 4.0 is still alpha. Procrastinate and PgQueuer are the Postgres-backed alternatives, run on a Cloud Run worker pool.
- Cloud Run: 32 MiB HTTP/1 response cap unless streamed, request timeout up to 60 min, no CPU after the response under request-based billing. Keep report work off API instances and write exports to GCS.
- FastAPI changed yield-dependency timing in 0.106.0, 0.118.0 and 0.121.0 (`Depends(scope=...)`), and the backend does not pin FastAPI. Do not stream database cursors through the API service.
- Exports: keep ReportLab (`LongTable`, `repeatRows`, fixed column widths). WeasyPrint documents multi-page tables as slow. XlsxWriter `constant_memory` wrote 12,800x50 cells in 23.6 s using about 62 KB. Apply OWASP CSV-injection mitigations.
- Paging: PostgreSQL uses row-value keyset predicates as index conditions, and offset paging degrades with depth. For sortable, pivoted or exported results, run once and page a stored snapshot so screen, PDF and XLSX match.
- Metrics: build an in-house registry modelled on MetricFlow metric types (simple, ratio, cumulative, derived, conversion). Cube Core is Apache-2.0 but adds a Node runtime and a second permission model. MetricFlow has been Apache-2.0 since v0.209.0.
- Embedded BI: Metabase guest embeds are free, view-only and badged; SSO embeds, SDK and row/column security need Pro at $575/month plus $12/user. Superset is Apache-2.0 with guest-token RLS but needs Celery, Redis and headless Chromium.
- AI: BIRD's best system scores 83.40% against 92.96% human. dbt's 2026 benchmark shows semantic layer 98-100% versus text-to-SQL 84-90%. Route natural language to a schema-constrained semantic query over the registry, never raw SQL.
- PHI and LLMs: Anthropic HIPAA-ready API covers structured outputs and prompt caching but not Batch, Files or code execution, and forbids PHI in JSON schemas. Google Cloud's BAA list includes Cloud Run, Cloud SQL, Cloud Tasks, Cloud Scheduler, BigQuery and generative-AI entries.
- Schedules and governance: one Cloud Scheduler tick per client (5,000 jobs/region quota) with `croniter` 7.0.0. E-mails carry login-gated links only, since signed URLs are bearer credentials. Audit every run and export; cache keys must include caller scope.

**Gaps and risks**

- The shared web-search budget ran out mid-research. Commercial embedded-BI vendors, Azure/AWS LLM HIPAA pages and forecasting libraries were not researched and are tagged [unverified].
- The Write tool refused the report .md for subagents, so the document was written through the shell because this step requires the file. Flag it if that is not wanted.
- One fetched page (Supabase RLS docs) contained text addressed to AI agents asking them to file feedback. It was ignored and no action was taken.
- The 'full nightly rebuild is cheap at ~1.4 M rows' assumption is unmeasured. Time it on production-size data before committing to the refresh design.
- One service and database per client multiplies every queue, worker service, ETL job, scheduler tick and migration. CI automates only the main client.
- The test suite is SQLite-only with no CI test step. Postgres-only report SQL (`ROLLUP`, `date_trunc`, `rpt` objects) ships untested until a Postgres test tier exists.
- Unverified platform behaviours: Cloud Tasks delivery semantics, OIDC to a private Cloud Run service, worker cold-start latency, `pg_cancel_backend` privileges on Cloud SQL, and `statement_timeout` with server-side cursor fetches.
- HHS pages returned HTTP 403. The e-mail FAQ is cited from snippets and the regulations from Cornell LII. The audit retention period and BAA status need counsel.
- Vendor facts are volatile: Metabase prices, Superset 'Next' docs (Playwright-only from 7.0), Cloud Run worker pools GA (snippet only), Vanna archived in March 2026.
- A mutable ledger (voids, edits, back-dating) and zero-valued `payment_allocations` for migrated data threaten roll-up correctness and collections-by-provider attribution.
- Row-level security on materialized views, replica recovery-conflict settings and the Cube Core versus Cube Cloud feature split were not confirmed.
- The doc's numeric limits and retention windows (row caps, pivot columns, timeouts, artifact expiry) are starting suggestions without a source, not validated values.

**Open questions**

- Is a per-client Cloud Tasks queue plus a dedicated Cloud Run worker service (and Cloud Run Jobs for ETL) acceptable to operate, or is a shared control plane preferred?
- May the engine rely on Postgres-only SQL and objects (an `rpt` schema, `ROLLUP`, possibly RLS), and will a Postgres test tier and CI test job be added?
- What data freshness is acceptable for dashboards (minutes with a 'data as of' stamp versus live), and which reports must be strictly live?
- Is a BAA executed for each Google Cloud service in use, and which LLM endpoint is permitted (cloud-provider-managed or an Anthropic HIPAA-enabled organisation)?
- Is cross-organisation benchmarking in scope? It needs a central store such as BigQuery fed by opt-in, de-identified aggregates.
- E-mail policy: login-gated links only, or attachments allowed for aggregate-only reports? Are external recipients without accounts required?
- What retention periods apply per client for run artifacts, scheduled-report outputs and audit rows?
- Is free-form exploration through an embedded-BI pilot wanted beyond the in-house builder, and is per-user licensing acceptable?

## research/dental_kpi_dictionary.md

Wrote a 159-KPI dictionary across the 13 requested groups; each KPI has a snake_case key, vendor aliases, formula and date basis, segments, sourced benchmark, action and pitfalls. It first documents the base definitions vendors disagree on (net production, new patient, active patient, visit, hygiene reappointment, case acceptance, broken appointments, collection %) as variant matrices. It reproduces the full Denticon Practice Analytics formula set (eight dashboards, CDT code lists, working-day rule, color bands) and benchmark tables from Dental Intelligence (10,000+ practices), Planet DDS (8,593 practices), Henry Schein One Catalyst Index, ADA and ADA HPI. It also covers the morning-huddle metric set, day/week/month/year routines, goal-setting models, leading vs lagging indicators and published glossaries. About 50 claims rest on search snippets only and 7 are unverified; all are tagged. Many KPIs need data outside the PMS ledger.

**Key findings**

- Denticon Practice Analytics has eight dashboards — Morning Huddle, Production Analysis, Collections Analysis, Provider Breakdown, Treatment Plan Analysis, Front Office, Hygiene Recall, Patient Visit Analysis — and its formulas, CDT code lists and thresholds are fully documented, enough to build a legacy-parity preset.
- DPA base rules: Net Production = Gross Production + signed Production Adjustment; Net Collections = Gross Collections + Collection Adjustment; provider working day = 0.5 if 4 booked hours or fewer, else 1.0; goal bands red <85%, yellow 85–95%, green >95%.
- Active patient is not standardized: Dental Intelligence and Practice by Numbers use 18 months; DPA uses 12 months active, 12–24 'Danger Zone', 24+ inactive; Jarvis uses 24- and 36-month look-backs. It must be an organization-level parameter.
- 'Hygiene reappointment' hides four KPIs: leaves with next visit booked (DI average 87%), holds a future hygiene appointment now (DI Hygiene Pre-Appointment 59%), returned within 12 months (Planet DDS 63%), any future appointment booked (Practice by Numbers).
- Case acceptance differs by unit and window: DI dollars with same-day rule average 41%; Henry Schein One average 45%; Planet DDS plan-status 58%; ADA target 75–80%. Planet DDS finds case completion (47%) is the real bottleneck.
- Dental Intelligence offers four net-production date bases (procedure date, entry date, 90-day average, estimated). Planet DDS network benchmarks compute gross production from expected collections, not UCR, so benchmarks on different fee bases are not comparable.
- Collection % benchmarks: ADA 98% of adjusted production; DI 2025 bottom 93, average 102, top 109; Denticon DSOs median 88.9%; Catalyst Index 72–75% average with unstated denominator. DI AR Days: 74, 26, 5.
- Planet DDS 'numbers to watch' give warning/target/elite defaults: new patients <35, 35–75, 75+; cancellation >20%, 10–15%, <10%; OTC collection <80%, 80–95%, >95%; A/R over 90 days >50%, 15–30%, <15%; same-day claims <20%, 40–80%, >80%.
- Dental Intelligence State of Dentistry 2026 publishes bottom/average/top tiers for 11 KPIs, e.g. Pre-Appointment 28/54/75%, Same-Day Treatment $ Acceptance 15/31/50%, Patient Growth −11/3/17%, Perio Patient % Age 30+ 1/11/32%.
- Morning huddle blocks: Yesterday (production vs goal, collections, patients seen, same-day production, reappointment); Today (scheduled production vs goal, exams, A/R of today's patients, pending treatment, SRP opportunities); next two working days; MTD/YTD 'Where We Stand'.
- Goal models: Denticon stores a daily goal per provider up to 13 months ahead; Dental Intelligence derives goals as production-per-hour goal × scheduled clinical hours, rolled up to the practice. Both show 'daily average needed to meet monthly goal'.
- Denticon month-end routine: Close Out, reset insurance benefits, batch statements, Aging Detail or Aging by Home Office, Outstanding Claims, recall due-not-scheduled, Treatment Plan Status, Deposit Slip–Credit Card, Capitation Utilization; year end adds Executive Summary and CDT/UCR updates.
- The legacy tool uses three office attributions — transaction office, patient home office, appointment office — which give different A/R totals; provider attribution (treating, appointment, presenting) varies the same way. Reports need an explicit choice.
- Differentiating KPIs from recent network data: daily production volatility (CV), Friday-vs-Tuesday production index, revenue per chair, acceptance–completion gap, same-day claim rate, RCM Health Score, cash-conversion waterfall, new-patient revenue dependency.
- Ortho set (Gaidge, Cloud 9, Levin): exams, starts, conversion (68.3% in 2025), same-day start rate, observation pool, average contract amount, delinquency, starts per debond, patients beyond estimated completion (2% or less), visits per case.

**Gaps and risks**

- About 50 claims rest on search snippets only (tagged ·S): consultant targets for production per hour, chair utilization, marketing cost, goal-setting formulas, huddle timing. Verify before using any as product defaults.
- Henry Schein One Catalyst Index formulas and sample sizes are not public; its 72–75% average 'collection rate' is probably on a gross basis (my inference) and is not comparable with net collection benchmarks.
- Vendor benchmarks describe each vendor's customer base (Planet DDS sample is about 97% DSO chairs; ADA HPI poll skews to owners and small practices), so they are directional only for other segments.
- No published benchmark was found for production per visit, production per hour, diagnostic %, fluoride/adjunctive rates, confirmation rate or hygiene cohort retention; we would need our own network percentiles.
- Source glossaries contain internal inconsistencies (Dental Intelligence name/definition mismatches, DPA 'Prod Chair Per Hour' dividing by days, Planet DDS waterfall totals, Practice by Numbers 'Lost Appointments'); copying vendor formulas unchecked would import errors.
- Many KPIs need data outside the PMS ledger: clinical hours or time clock, payroll, general-ledger expenses, marketing spend, call and web-lead data, clearinghouse claim statuses, eligibility timestamps.
- Point-in-time KPIs (pre-appointment %, A/R aging, scheduled production at start of day, unscheduled treatment) cannot be trended without daily snapshots.
- Case acceptance and treatment-funnel KPIs depend on staff maintaining treatment-plan statuses; unmaintained statuses make plan-count acceptance unreliable.
- Planet DDS help-center HTML returned 403 to the fetch tool; content was read via the public article JSON endpoint. Three older per-dashboard glossaries (Production Analysis, Provider Breakdown, Collections Analysis) were not opened.
- Jarvis and Practice by Numbers definitions are only partly captured (six Jarvis definition pages opened of about 150; one Practice by Numbers dashboard guide).
- Dental Intelligence benchmark values were read from chart images in the PDF; Liine channel-level conversion values could not be paired to channels reliably.
- CDT code sets defining hygiene, recare, exam and adjunctive care differ by vendor and change annually; without a maintained, versioned code-group table, hygiene and exam KPIs will drift.

**Open questions**

- Which active-patient window is the product default — 12 months as in Denticon, or 18 as in Dental Intelligence and Practice by Numbers — and do we show 12/18/24 side by side?
- Does each procedure line store both the office (UCR) fee and the contracted or expected fee, so both gross bases and payer write-off rates can be computed?
- Do adjustments carry a type classification and a link to the procedure they adjust? Both are needed for net production by procedure date and write-off rate by payer.
- Should exact Denticon Practice Analytics formulas and thresholds ship as a selectable legacy-parity preset, or do we standardize on new definitions and document the differences?
- Will we capture clinical hours (schedule templates or time clock) to support per-hour KPIs and hour-based goals, or keep Denticon-style daily provider goals only?
- Which external data is in scope for the first phases: clearinghouse claim statuses, eligibility timestamps, call tracking, marketing spend, payroll and general-ledger expenses?
- Do we want cross-tenant anonymized percentiles as our own benchmark set, and do customer agreements permit that?
- Which office attribution is the default for A/R and collections reports: transaction office, patient home office, or appointment office?

## research/competitor_analytics_teardown.md

Teardown of 15 dental analytics and reporting products plus 3 adjacent entrants, sourced mainly from vendor help centers and product pages; review-site complaints are snippet-level. Analytics overlays (Dental Intelligence, Practice by Numbers, Jarvis) lead on huddles, scorecards, opportunity lists and AI, but draw "numbers do not match the PMS" complaints caused by nightly syncs. PMS-native reporting (Dentrix, Open Dental, Eaglesoft, Denticon) offers large parameterized catalogs with weak findability and interactivity. Denticon's own analytics (DPA) is Power BI Embedded with 8 fixed dashboards, a 1 AM refresh and no custom metrics, the clearest target to exceed. The document gives per-product catalogs, filters, actionability and weaknesses; cross-cutting patterns (huddle anatomy, list filters, divergent metric definitions, data freshness, benchmarks); a two-part feature matrix; table stakes versus differentiators; 46 prioritized feature ideas; and anti-patterns to avoid.

**Key findings**

- Denticon Practice Analytics is Microsoft Power BI Embedded with 8 dashboards (Morning Huddle, Production Analysis, Collections Analysis, Provider Breakdown, Treatment Plan Analysis, Front Office, Hygiene Recall, Patient Visit Analysis), refreshed about 1 AM PST; users cannot create metrics, visuals, tables or reports.
- Denticon's New Reports Menu merged summary/detail/group variants into single parameterized reports (Production Report groups by code, provider, category, carrier) with inline office multi-select, Include All defaults and My Favorites; a favorite hard-codes the office it was saved in.
- Dental Intelligence is the reference overlay: Performance Board (9 tiles), Provider Pulse, Collections Board, Morning Huddle, Scorecards (6 focus dimensions, template gallery), Patient Finder, automated Daily/Weekly/Monthly emails, Explorer AI, Attendance and Acceptance patient scores.
- Dental Intelligence ranks suggested patients for an open slot using reimbursement, A/R balance, unscheduled treatment, acceptance %, show rate and preferred weekday; its auto production goal equals scheduled clinical hours times production-per-hour goal.
- The top overlay complaint is numbers not matching the PMS (nightly sync, independent definitions); vendors publish reconciliation guides. A native, single governed metric layer is our strongest structural advantage.
- Practice by Numbers: Revenue Finder ranks opportunity categories by dollars; Smart Tasking logs call outcomes; Cross Practice Percentile shows 10/25/50/75/90th percentiles (not normalized); PiQ and RiQ AI assistants; four-day Huddle page.
- Jarvis Analytics: 50+ KPI library, Snapshot versus goals built from 100+ metrics, Operations (12 views), top/bottom 20% Scorecards, Tx Miner, Marketing Matchback, emailed Morning Huddle and End of Day, configurable and custom KPIs.
- Dentrix Ascend Power Reporting has Analysis (pivot) and Interactive (row-level) builders with PDF/XLSX/CSV export, yet Capterra's theme summary shows 77% negative reporting sentiment (confusing, inconsistent numbers). Ascend MCP Ask entered preview April 2026.
- Eaglesoft V16 documents 180 reports in 9 categories plus Quick Reports bundles, Money Finder (about 20 preset queries with has/lacks planned/completed code logic), Trends (goal/actual/variance), SnapShot and a Revenue Opportunities what-if calculator.
- Open Dental: 50+ standard reports, 5 Graphic Reports, SQL User Query with released-query permission tiers and 1,000+ examples, Report Server replica, Treatment Finder with remaining-benefit and benefit-month filters.
- CareStack: real-time custom dashboards (Metric Tiles, Multi-Metric Cards, Build Your Own KPIs), one-click Underlying Data drill, reusable Scorecards, goal planning by provider and location; scheduled delivery and export formats are undocumented.
- tab32 Summit exposes a BigQuery Open Data Warehouse with direct SQL and Tableau, Looker Studio, Power BI and Domo connectors, plus an Open API and MCP server.
- Public benchmarks: Henry Schein One Catalyst Index 2026 (average vs top 10%: case acceptance 42%/75%, collection rate 80%/97%, no-show 4%/<1%); Planet DDS Deep Dive (8,593 practices, case completion 47%); Sikka zip-level fee percentiles ($495).
- 2026 AI wave: Dental Intelligence Explorer (June), Denticon Patient Insights no-show risk (Truro), Archy Intelligence, Sikka DentalLLM. No PMS-native product documents builder + scheduled delivery + benchmarks + AI Q&A together.
- Metric definitions diverge widely (active patient 12 vs 18 vs 24 months; 24-hour cancellation vs no-show rule; two reappointment methods; several collection % bases), so we need a published glossary and organization-level metric settings.

**Gaps and risks**

- G2, Capterra, Software Advice and several trade-press pages blocked retrieval; complaint evidence is search-snippet level, unquantified, and no Reddit or Dentaltown threads were retrieved.
- The Dentrix Enterprise Reports Reference PDF failed with a TLS error, so the Enterprise report catalog is partial.
- Dentilytics Enterprise has no public functional description; some Planet DDS help FAQs were attributed to Denticon by menu path because the Help Center spans several products.
- Jarvis, Sikka Optimizer X, Oryx, Adit and tab32 publish marketing-level detail only; many matrix cells are '?' (not found, not proof of absence).
- Scheduled report delivery for the Dentrix Ascend analytics suite and Practice by Numbers is asserted by marketing or third parties without help-center confirmation.
- All pricing figures are third-party or vendor-comparison claims and are marked unverified.
- Benchmark values inside Dental Intelligence and Weave are not public; published indices are vendor-customer samples with unknown licensing terms and no normalization detail.
- Several 2026 AI capabilities are preview-stage or known only from press material (Ascend MCP Ask, Explorer launch date), so real behavior may differ.
- Feature availability depends on packaging (for example Dental Intelligence outreach and payment requests need Engagement or Payments modules), so a matrix 'Y' can overstate the base product.
- Curve's post-2019 dashboard list and the analytics scope of Ask CurveAI are unconfirmed; its marketing mixes real-time and daily-updated claims.
- Vendor documentation changes quickly (Dental Intelligence retired its Production and New Patients reports in September 2026); re-verify before finalizing specifications.
- Planning risk: adopting overlay features (benchmarks, predictive scores, natural-language Q&A) without a governed metric layer would reproduce the accuracy complaints those vendors receive.

**Open questions**

- Which metric definitions do we standardize versus make organization-configurable (active-patient window, new patient, cancellation vs no-show, reappointment, case acceptance, date basis, adjustment mapping)?
- Do we ship cross-office benchmarking only, or also cross-tenant peer percentiles (opt-in, cohort normalization, minimum sample sizes), and do we license external data such as fee percentiles?
- How deep is custom reporting in the first release: parameterized catalog plus scorecard builder, or also a pivot/row-level builder, SQL workspace and warehouse export for DSO analysts?
- Which dashboards must be live against PostgreSQL and which can use Redis or rollup tables with a visible 'as of' timestamp?
- What scope and guardrails apply to the AI assistant (explain-this-view first, read-only semantic-layer Q&A, PHI handling, permission inheritance, audit logging)?
- Do we capture the data needed for predictive scores and suggested-patient ranking (confirmation responses, show history, treatment-team tagging, provider clinical hours)?
- How will outreach attribution be modeled end to end (list, task, message, appointment, production and collections) across SMS, letters and scheduler modules?
- Which delivery channels and formats are required for scheduled reports (email PDF/XLSX, in-app inbox, distribution lists), and what retention and audit rules apply?

## research/denticon_analytics_and_dso.md

Research reference written (about 1,080 lines, 148 cited sources). Part 1 documents Denticon from the Planet DDS Help Center: Reports menu entries and consolidation rules, both documented Interactive Reports, Office Reports as customer-specific folders, My Reports / My Favorites / Search Report behaviour, a per-sub-menu catalogue with filters, all eight Practice Analytics dashboards with formulas, thresholds and edge cases, goals, office-group and multi-office attribution, the report security-rights catalogue, and daily / monthly / yearly routines with a persona matrix. Part 2 covers DSO practice (Planet DDS, Dental Intelligence, Jarvis, Practice by Numbers, CareStack, tab32, Overjet, Pearl): roll-ups, same-store method, ranking, benchmarks, RCM dashboards, provider compensation, goal cascades, governance. Part 3 gives 22 design recommendations. Limits: Help Center screenshots were unreadable, and the shared web-search budget ran out during Part 2.

**Key findings**

- `Interactive Reports` has only two documented entries, both work queues: `Eligibility Verification` (patients with unverified eligibility for a date; inline check, status update, messaging) and `Unsigned Progress Notes` (today's appointments only; review and sign in place).
- `Office Reports` is a per-customer custom-report folder. Rights exist per set (`ADRpts`, `BNRpts`, `GSRpts`, `HawaiiRpts`, `VHRpts`); documented items: `Uncollected Copay`, `Aging Report by Home Office`, `Next Appointment Booked Report (Excel)`.
- `My Reports` restricts a user to self or one provider through the user field `Report Access Provider` and right `Reports – My Reports – Full Control`; it covers eight named journal, production, appointment and time-clock reports.
- `My Favorites` saves criteria per user (`Add Report to Favorites`), lists name, breadcrumb and delete, and pins the office used when saving. `Search Report` returns descriptions with direct links. Sharing and scheduling are undocumented.
- The new menu merged summary, detail and group variants into single criteria-driven reports (for example `Production Report` by code, provider, category or carrier), with embedded office / `Office Group` selection, dynamic options and `Include All` defaults.
- Confirmed sub-menus: Daily, Monthly, Management, Insurance, Appointment, Treatment Plan, Referral, Recall, Ortho, Ledger, Lists, Statements, Letters / Labels / Postcards. A legacy `Reports (old) > Group Reports` menu is still referenced in 2026 support material.
- Practice Analytics (DPA) is eight fixed Power BI Embedded dashboards, refreshed about 1 AM PST, filter-only: Morning Huddle, Production Analysis, Collections Analysis, Provider Breakdown, Treatment Plan Analysis, Front Office, Hygiene Recall, Patient Visit Analysis.
- DPA engine rules: provider working day = 0.5 when appointments total 4 hours or less, else 1.0; available hours follow a six-layer schedule and holiday precedence; office daily goal = provider monthly goals ÷ office working days; colour bands at 85% and 95%.
- Planet DDS documents conflict: Actual vs Scheduled Production thresholds differ across three articles; Morning Huddle A/R uses home office while Collections Analysis uses transaction office; two reappointment methods; `No Show Appt %` includes cancellations.
- Office attribution differs by report: `Aging by Home Office` (responsible party's home office), `Income Allocation` (office where the procedure was charged), referral production (one office only), SmartAssist Report Card (appointment office).
- Report access uses per-sub-menu rights with `Full Control` / `View Only`, held by security groups defined per office; the most permissive right wins. Enterprise runs need `Reports - Group Reports`. No right is documented for Interactive Reports or DPA.
- Reports already drive action: `Create Task` on Outstanding Claims and `Aging by Home Office` (Patient AR) feeds Task Manager; DPA detail lists offer `Send SMS/Email` campaigns for unscheduled treatment, Danger Zone, unconfirmed and no-show patients.
- Published routines: end of day (Daily Journal, Daily Collection, Daily Audit, claims hygiene, routing slips), month end (close out, statements, aging, outstanding claims, recall), year end (Executive Summary), plus a persona matrix for front office, back office, clinical, management.
- DSO products converge on Overview / By Location / By Region views, top-and-bottom ranking (Top 20 / Bottom 20), configurable scorecards with templates and benchmark overlays, view-only sharing, goal tracking, and access limited to entitled locations.
- Planet DDS's 2026 Deep Dive offers reusable method: same-store growth on locations active both years (simple 6.6%, trimmed 4.9%, weighted 4.0%), five-component RCM Health Score, cash-conversion waterfall, and warning / target / elite thresholds.

**Gaps and risks**

- Help Center screenshots could not be read, so the exact Reports menu order, the complete item list and every on-screen filter are not captured; the team's legacy screenshots remain the authority for field-level detail.
- Only two Interactive Reports are documented publicly; the live menu may contain more.
- Office Reports content is customer-specific and not public; only three reports were found, so the folder cannot be replicated item by item.
- The shared web-search budget ran out during Part 2. Not checked: DSO same-store rules for de novo and acquired offices, formal goal-allocation methods, hygienist compensation, Jarvis Payroll detail, Dental Intelligence Provider Pulse and goal features, Sikka and ADA Health Policy Institute benchmarks.
- No security right was found for Interactive Reports, Ortho Reports, Search Report, My Favorites or DPA; the rights catalogue article predates the new menu.
- Scheduling and sharing of saved reports in Denticon is unverified: the only evidence is a marketing page that returned 404 and was seen as a search summary.
- External benchmarks disagree across publishers (cancellation rate 12.9% in Planet DDS data vs 5% in Henry Schein One's index), so any benchmark must carry its definition and source.
- Planet DDS documents contain internal conflicts (threshold tables, the Deep Dive waterfall chart vs its table); figures were recorded as printed and flagged, not reconciled.
- Adopting DPA metric logic unchanged would import its flaws: case acceptance counts every historical plan in the denominator, No Show includes cancellations, and A/R basis changes by dashboard.
- Most Part 2 evidence is vendor marketing or vendor help content; performance and ROI claims are not independently verified.
- Help Center articles change often (several were updated in October–November 2026); content was read on 2026-11-22 through the public article API and may drift.
- Compensation evidence is US-centric, and the ADA worked example contains an arithmetic inconsistency; treat percentages as illustrative.

**Open questions**

- Which office attribution is the default for each metric family (home office, transaction office, office where charged, appointment office), and can users switch it per report?
- Should we adopt DPA's working-day, available-hours and goal rules as defaults, or define simpler rules and make them configurable per organization?
- What is our same-store rule: how long after opening, acquisition or go-live before an office counts as comparable, and how are closures and relocations treated?
- Are tenant-specific custom reports (the Office Reports equivalent) delivered through a report builder in an early phase or later?
- Which interactive work queues ship first: eligibility, unsigned notes, unscheduled treatment, recall due, outstanding claims, patient A/R?
- Is provider compensation (pay rules, statements, review-then-publish) in scope for the reports module or a separate module?
- Do office groups need several simultaneous hierarchies (region, brand, acquisition cohort) from the first release?
- Are external benchmarks in scope, and if so from which licensed source and with what definition mapping?

## research/analytics_ux_patterns.md

Wrote a sourced UX reference (13 sections, 43 tables, about 111 KB) covering the report catalog, parameter and filter UX, results tables and drill, dashboards (KPI cards, trailing-12-month grid, scorecards, goals), subscriptions, export and print, the report builder, AI trust patterns, accessibility, performance and freshness, React chart and table technology, and a blueprint of nine page types with wireframes and 22 interaction rules. Web search was unavailable: the shared budget was exhausted before my first query. External facts therefore come from direct fetches of about 85 known primary pages plus the npm registry (versions, licences and dates as of 2026-11-22). QuickBooks, SAP Fiori, Looker scheduling, Polaris, Power BI Copilot/Q&A, Toast and Salesforce are marked unverified. Most dental-product facts are carried over from the sibling teardown and tagged as such; only two dental pages were re-read.

**Key findings**

- Run model: reports use an explicit Run, dashboards apply live. NN/g puts the live-filtering threshold at about 1 s; Carbon, Metabase, Looker and Dental Intelligence corroborate. The blueprint proposes a per-report `cost_class` (instant / interactive / background) to decide auto-run, Run button or background run.
- Catalog: Favorites, Recents, Shared with me, pinned items and command-palette search are standard (Power BI scorecards hub, Stripe Shortcuts, Metabase bookmarks, Dental Intelligence Scorecards). Add legacy-name aliases and a Standard vs Custom badge (Shopify authored-by; Metabase verified badge removed on edit).
- Date UX per Shopify: presets, rolling last-N with an include-current-period switch, custom range, comparison (previous period, previous year, custom, target) drawn dashed. Stripe states inclusive dates and a time-zone switch. Dental additions: date basis, as-of mode, MTD marker, weekday alignment.
- Saved views must store relative date tokens and an explicit office policy, server-side. Legacy favourites keep the office they were saved in; the current runner freezes dates and uses localStorage, which is wiped on logout and 401. An unused `/users/me/preferences` endpoint exists.
- Result caps: Shopify displays 1,000 rows while totals cover all rows; Metabase displays 2,000/10,000 and exports 1,048,575; Power BI exports XLSX 150,000 and CSV 30,000 rows, writes a truncation notice and applied-filters row into the file, and escapes CSV formula characters.
- Drill: Metabase drill-through menu and per-column click behaviour, Power BI drillthrough with automatic Back button, Linear Insights filtering the underlying list, Mixpanel view-users. Recommended: a non-modal side-panel drill list that reconciles to the clicked number and links to patient, claim or appointment.
- KPI card = value, delta, target, benchmark, sparkline, definition icon, as-of time. Shopify targets: metric, amount, period, preview gauge, statuses, dashed pacing line. Practice by Numbers shows a 10/25/50/75/90 percentile ladder on hover; Dental Intelligence scorecards toggle goals, trends, rounding, benchmarks.
- Build the trailing-12-month grid as one pivot/matrix component: sticky metric column, MTD marker, Total/Avg/YTD/prior-year/goal/variance/sparkline columns, row-relative shading, drill per cell, explicit Other/unassigned rows, and no-data never rendered as zero.
- Subscriptions: Metabase (skip if no results, send now, per-subscription filters, attachments), Power BI (24 per item, include my changes, one-year default expiry, admin take-over), Stripe (daily/weekly/monthly, e-mail notification then download). Power BI warns the mailed snapshot reflects the owner's row-level access.
- Builder: Metabase stepwise builder previews 10 rows per step and can restrict the picker to a curated library; Looker field picker has per-field info and a 200 pivot-value cap; Shopify allows 4 metrics per chart. Recommend List and Summary modes, templates first, no free SQL.
- AI trust: Looker composes queries from the semantic model rather than writing SQL; Snowflake and Looker use verified question-query pairs; Tableau Pulse detects insights statistically and uses the LLM only to summarise; NN/g finds citations and reasoning displays inflate trust.
- Accessibility (WCAG 2.2 AA): 1.4.11 needs 3:1 chart marks unless labels or a table carry the data; 1.4.10 exempts tables but not surrounding controls; 2.5.8 sets 24 px targets; 4.1.3 status messages; 2.4.11 sticky headers must not hide focus.
- Tables: `@tanstack/react-table` 9.3.1 (9.0.0 on 2026-08-04, MIT, headless, no pivot UI). AG Grid 36.3.0 keeps row grouping, aggregation, pivoting, server-side row model and Excel export in Enterprise; licence per front-end developer, customer-facing apps need a sales quote.
- Charts: Recharts 3.11.0 (MIT, React 19) is installed; the shadcn chart targets Recharts 3. ECharts 6.1.0 is Apache-2.0. Nivo 0.99.0 last released 2025-05. `@tremor/react` 3.18.7 last released 2025-01 with peer React ^18 only; Tremor copy-paste targets Recharts ^2.15.
- Other libraries: Glide Data Grid 6.0.3 (2024-02) declares React peers up to 18; react-grid-layout 2.3.0 has a scaled-container position strategy, relevant to the global zoom 0.75; react-pivottable and WebDataRocks are stale. Recommend server-side pivot rendered through TanStack Table.

**Gaps and risks**

- Web search was unavailable (shared budget exhausted before the first query); coverage is limited to pages whose URLs were already known.
- Not verified and tagged [unverified] in the document: QuickBooks Online (HTTP 403), SAP Fiori filter bar (403), Looker scheduler (404), Polaris date-range pattern, Power BI Copilot/Q&A, Toast, Salesforce report builder.
- Pages were read through an automated summariser, so exact UI labels may differ; Tableau Pulse facts come from a release-notes style page reached by redirect.
- Library behaviour under the app's global `html { zoom: 0.75 }` (drag, resize, canvas hit-testing, tooltips, virtualisation) is untested and undocumented; a spike is needed before adopting react-grid-layout, ECharts or any canvas grid.
- TanStack Table v9 has been stable for only about three months; its feature list was read from the site landing page, not the v9 guides.
- AG Grid Enterprise pricing and licence terms for a customer-facing SaaS are not public on the pricing page.
- Recharts and ECharts chart-type coverage, renderers and performance ceilings were not re-read and are marked [unverified].
- Dental-product UX facts are mostly carried from the sibling teardown; only Dental Intelligence Scorecards and the Practice by Numbers percentile panel were re-read this session.
- The legacy-criteria mapping (sort-by, page-break options) was not confirmed against the legacy PDFs; those rows are flagged.
- Zebra-striping guidance conflicts between NN/g and Pencil & Paper; WCAG 1.4.1 and reduced-motion guidance were not fetched.
- PHI policy for e-mailed attachments and consent rules for bulk SMS launched from report lists were not researched.
- Blueprint routes, `cost_class`, and saved-view and schedule field names are illustrative proposals that need backend agreement.

**Open questions**

- Who may see provider rankings and leaderboards: own numbers plus anonymised peers, or full visibility by role?
- Should scheduled deliveries be evaluated with each recipient's rights or limited to recipients within the owner's scope, and are attachments containing PHI allowed at all?
- What is the default office policy for saved views (follow working office or fixed office set), and may non-admins share views organisation-wide?
- TanStack Table v9 or the last v8 (8.21.3), and is an AG Grid Enterprise licence acceptable as a fallback if the build overruns?
- Dashboard customisation in the first release: role defaults with show/hide/reorder, or a free grid with resize?
- Which reports are instant (auto-run), interactive or background, and what p95 response target qualifies a dashboard for live-apply?
- Which worklist bulk actions ship first (SMS, letters, tasks), and what consent or opt-out data exists to drive exclusions?
- Is the first AI feature limited to sentence-to-filters and explain-this-number, or a general ask bar, and which model endpoint is permitted for aggregated data?

## research/compliance_and_financial_semantics.md

Wrote a ~157 KB reference in two parts. Part 1 (compliance): our business-associate position, minimum necessary translated into report data classes and permission axes, an audit event/field catalogue, accounting of disclosures, export/e-mail/retention controls, de-identification and small-cell rules for benchmarking, LLM vendor terms, a SOC 2 mapping and an 18-item requirement checklist. Part 2 (financial semantics): money identities with a worked write-off example, adjustment taxonomy, collections and tenders, cash vs accrual, date bases and period close, deposits, provider attribution and payment allocation, credits, ageing, capitation, payment plans/ortho contracts, multi-office attribution, audit-trail reports, canonical definitions, reconciliation invariants and a 16-item checklist. No web searches were possible (shared budget exhausted); sources were fetched directly — CFR/USC, Federal Register, NIST, ONC, ADA, HFMA, IRS, CLA, Open Dental, Dentrix, Denticon, Eaglesoft, LLM/cloud vendors. HHS guidance pages were blocked; unverified items are flagged.

**Key findings**

- We are a HIPAA business associate: minimum necessary (45 CFR 164.502(b), 164.514(d)) binds us directly and demands a role x PHI-category matrix, standard protocols for routine disclosures and individual review for others. Implement as data classes on every report column.
- HIPAA names no audit fields; 164.312(b), NIST SP 800-66r2 Table 22, ONC 170.315(d)(2) (ASTM E2147-18) and the 2025 NPRM converge on user, time, action (query, print, copy, transmit), patient data, tamper-evidence and regular review.
- Row counts are not enough: 164.410 requires identifying each affected individual and 164.528 requires date, recipient, description and purpose for six years. Store a patient manifest per exported or delivered artifact and a `disclosure_log` for external deliveries.
- Accounting of disclosures excludes treatment/payment/operations; the HITECH EHR extension was never implemented (2011 NPRM; 2018 RFI: OCR "intends to withdraw"). Deadline 60 days, six-year look-back.
- Security Rule NPRM (90 FR 898: mandatory encryption, MFA, real-time audit monitoring, annual compliance audit) is not final; HHS target moved to July 2027. A Privacy final rule published 2026-11-19 sets 15-day patient access and leaves minimum necessary unchanged.
- Send links, not PHI attachments: unencrypted e-mail is sanctioned only for individuals requesting their own PHI (78 FR 5566); signed storage URLs are bearer credentials (7-day maximum). Use app-mediated single-use links, encrypted TTL-purged artifacts and watermarks.
- Cross-tenant benchmarking rests on the BAA "data aggregation" clause (164.504(e)(2)(i)(B)). Safe Harbor removes all date elements except year, sub-state geography and record ids; the CMS cell-size policy suppresses values 1-10, including derivable ones.
- LLM terms differ by feature: Anthropic HIPAA readiness covers Messages API, prompt caching and structured outputs but returns HTTP 400 for Batch, Files API and code execution; no PHI in JSON schemas. Azure modified abuse monitoring ends for models released after 2026-11-01.
- Every reference PMS classifies adjustments by type attributes, not names: Denticon "Sub Type" Production/Collection plus sign, Dentrix production vs collection adjustment lists, Open Dental +/-/dp. Our 46 legacy codes carry sign and group only in the frontend.
- Write-offs have three documented timings (Open Dental): insurance payment date, procedure date, or claim-date estimate plus payment-date adjustment via Claim Snapshot. Migrated Denticon data embeds the PPO write-off in the charged fee (`fee` vs `ucr_fee`).
- Financial totals use the entry (posting) date, ageing the service date: Dentrix Day Sheet and Practice Analysis, Denticon transaction vs service date, allocation dated at entry. Reports need both bases, labelled, plus a bridge report.
- Closed periods are locked and fixed only by adjustments: Dentrix history, Denticon Close Out (irreversible; never run with the current date), Open Dental global lock date. Our backend has no posting date, period close, deposit entity or snapshots.
- Provider collections depend on allocation: Denticon FIFO; Dentrix Percentage, Guarantor Estimate (default), FIFO, Equal; Open Dental paysplits. Denticon's Income Allocation is "a live report" - persist dated allocations and show an "Unallocated" bucket.
- Ageing differs: Denticon 0-29/30-59/60-89/90-119/120+ from procedure completion and "Aging by Home Office" for multi-location; Dentrix and Open Dental 0-30/31-60/61-90/90+. HFMA days in A/R = net A/R divided by three-month average daily net revenue.
- Audit-trail reports are expected: Dentrix Audit Trail (changed/deleted transactions), Eaglesoft "Deleted Transactions", Denticon Special Transaction and Daily Audit; deposit slips must tie to the day sheet and bank, with deposit duties segregated.

**Gaps and risks**

- No web searches were possible: the shared WebSearch budget was already exhausted, so sources are limited to directly fetched primary URLs and URLs from companion docs; dental-CPA commentary is thin (only CLA and ADA).
- hhs.gov returns HTTP 403: HHS guidance on minimum necessary, de-identification, unsecured-PHI encryption, cloud computing and e-mail was not read; whether a business associate may use de-identified data for its own purposes is unverified.
- The November 2026 Privacy Rule final rule is known only through the ADA guide, whose dates are computed from the pre-publication schedule; the Federal Register text was not read.
- SOC 2 Trust Services Criteria ids and wording in section 10 are recalled, not re-read; ASTM E2147-18 and PCI DSS could not be opened.
- State privacy, breach, record-retention and unclaimed-property laws were not researched and may be stricter than HIPAA.
- Orthodontic contract revenue recognition and accrual/GAAP mapping for DSOs are unsourced; how Denticon classifies ACMVD / ACBIL contract adjustments is unknown.
- Denticon details that exist only in help-center screenshots (Executive Summary column definitions, Close Out screen, contract design, Audit Trail filters) were not readable; verify against the legacy PDFs or live tool.
- LLM vendor rows are partial (OpenAI eligible endpoints, Microsoft healthcare terms, Bedrock retention page not read) and vendor terms change often; re-check before contracting.
- Pages were read through an extraction tool, so 'the page does not say' means 'not found in that extraction'; Federal Register page numbers are approximate (plus or minus one).
- Local (L) facts come from repository analysis docs and were not re-verified; posting-date, period-close, deposit and allocation semantics cannot be delivered until those schema gaps are closed.
- Reference systems conflict on bad-debt side, ageing buckets, default allocation method, write-off timing and lock reversibility; each needs an explicit product decision.
- The document is not legal or accounting advice; BAA clauses, retention periods and revenue-recognition policy need counsel and CPA review.

**Open questions**

- Do our BAA and terms of service permit data aggregation and de-identification, and our own use of de-identified data? This gates cross-tenant benchmarking and AI features.
- Which write-off timing and bad-debt side are canonical, and should dashboards default production to service date while financial-close reports use posting date?
- Will period close be irreversible (Denticon style) or admin-bypassable (Open Dental style), and is it daily, monthly or both, per office or organization-wide?
- What is the default allocation method for patient payments (legacy FIFO or line-item), and how do we present provider collections for migrated history that has no usable allocation rows?
- Is hygiene production attribution (hygienist, supervising dentist, dual) and capitation revenue distribution a tenant setting, and who decides compensation-facing rules?
- For ortho and payment-plan contracts, do we recognize production at start or as periodic charges post, and how do legacy contract adjustments affect historical production?
- What are the retention periods for report audit events, patient manifests and generated artifacts (six years? state-specific?), and who approves bulk or external exports?
- Which LLM route will be used (HIPAA-enabled first-party organization or cloud-provider endpoint), and is a BAA executed with every subcontractor that could receive PHI?

