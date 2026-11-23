# 11 - Frontend implementation plan

Work breakdown of the frontend (`dentc-frontend`) for the Reports & Analytics module, phase by phase. The design
documents decide WHAT (`00_design_brief.md` AD-1..AD-12, PD-1..PD-15; `07_ux_blueprint.md` for routes, components and
structure; `04_filter_framework.md` for parameter components; `06_dashboards.md` for tiles and worklists; `02_architecture.md`
for the API; `08_security_compliance.md` for gating). This plan decides ORDER, grouping, milestones, checks and risks.
Work items are quoted by id from `work_items.md` / `work_items.json`; an item keeps its register phase and size.
Counts come from `plan_inputs/facts.md`. Where the design is silent or contradicts itself, section 9 says so.

| Convention | Value |
|---|---|
| Effort unit | Engineer-days from the register sizes, converted as in the register's rough table: S = 2, M = 5, L = 10, XL = 20. An order of magnitude, not an estimate |
| Weeks | The formula of `10_backend_plan.md` §1.2: **weeks = engineer-days / (engineers x 5 days x 0.7 focus)**, i.e. 3.5 register-days per engineer-week |
| Staffing assumption | Up to three frontend engineers on the module (FE-A shell, navigation and results; FE-B criteria and parameters; FE-C dashboards, worklists and quality) and one QA engineer half time on Playwright specs and the manual playbook. The number of engineers per phase follows the staffing curve of 1.4, because the backend bounds P1-P3. Every duration below assumes this staffing |
| "Frontend-only" items | UX items and the purely frontend FLT / DASH components: the 70 items that `10_backend_plan.md` §1.1 leaves to this plan |
| "Shared" items | Items whose register entry covers both a backend and a frontend half (FLT-04, FLT-05, FLT-16, FLT-24, FLT-25, FLT-26, FLT-28, most DASH content items, the RPT items of section 1.3). Their full size is counted here and in `10_backend_plan.md`; the split is agreed per item at sprint planning |
| Plan tasks (`FT-n`, `FV-<family>`) | Frontend work this plan needs that has no register item (CI, gates, inventories, per-family verification). Sized like register items, listed in 1.4 and recorded in section 9 (G-31) so that the register can adopt them |
| Checks before "done" | `npx tsc -b`, the module type gate of FT-1, `npx eslint`, `npm test`, the API drift step and the bundle check (FT-3) of `.github/workflows/ci.yml`, the route-mock Playwright specs in the CI e2e job (FT-2), and the live Playwright specs named per phase, run locally against the UAT backend with the test users of FT-2 |

---

## 1. Scope, assumptions and the shape of the frontend work

### 1.1 What the frontend builds

| Part | Where | Phase of first delivery |
|---|---|---|
| One feature folder `src/features/reports/` (layout of 07 §9.1: `model/`, `params/`, `services/`, `hooks/`, `components/`, `pages/`, `nav/`, `tray/`, `styles/reports.css`, `__fixtures__/`, `__tests__/`) | NEW | P0 |
| One lazy route `/reports/*` in `src/App.tsx` replacing the seventeen report routes at L253-298 (07 §2.3) | `src/App.tsx` | P0 |
| The Reports menu of `src/components/GlobalNav.tsx` rebuilt from the catalog (`nav/reportsNav.ts`, `nav/ReportsNavMenu.tsx`) | `GlobalNav.tsx` | P0 |
| A generic runner in two frames (classic `/reports/c/:category`, enhanced `/reports/r/:report_key`) rendering any served `ReportDefinitionRead` | `src/features/reports/` | P0 |
| Dashboards, worklists, schedules, administration, goals, glossary, builder and assistant pages | same | P1..P5 |
| Touches outside the module: `src/services/api.ts` (silent refresh, return-to), `src/shared/config/queryClient.ts` (`silent_error`), `src/contexts/AuthContext.tsx` (`removeReportCaches`), `src/pages/LoginPage.tsx`, `server.js` (404 for missing `/assets/*`), `src/components/PatientSecondaryNav.tsx`, `src/services/schedulerHandoff.ts`, `src/features/time-clock/components/HoursReport.tsx`, `src/components/dashboard/lib/useMetrics.ts`, `src/components/my-page/lib/useMyDay.ts`, the insurance dashboard, the ADA claim print modal, the Scheduler menus; build and test configuration for FT-1..FT-3 (`.github/workflows/ci.yml`, `package.json`, `vite.config.ts`, `playwright.config.ts`, NEW `tsconfig.reports.json`, NEW `scripts/check_bundle_size.mjs`) | existing files | P0..P3 |

### 1.2 Assumptions

| # | Assumption | Consequence for the plan |
|---|---|---|
| FA-1 | Frontend and backend deploy independently per client. `.github/workflows/deploy-cloud-run.yml` bakes `VITE_API_BASE_URL` into the `dentc-frontend` image, so there is one source version and one build per client; the engine probe of 07 §2.3 (catalog 200 = `on`, any 404 = `off`, 503 = `misconfigured`) lets the same source version ship to clients whose backend has the engine off | Frontend increments can ship to production before the backend of a client enables the engine. Switching the engine on is gated per client database (X0-10: DATA-08 applied, DATA-10 and DATA-57 run, DATA-09 reconciliation green); the old pages stay reachable until the deletion of section 6.1 |
| FA-2 | The backend publishes response models before handlers are complete: ENG-01 mounts every router (also when `REPORTS_ENGINE_ENABLED = false`). ENG-19's snapshot of the `/reports` and `/analytics` part is the backend's contract test, not an input of Orval | Every sync point Cx is the **full** `openapi.json` fetched by `npm run api:sync` from a backend running the branch (local or UAT); no partial schema is spliced in (section 3.3). The frontend never hand-writes API types |
| FA-3 | Definition fixtures (`tests/contract/definitions/*.json`) and golden `ReportResultPage` payloads come from the backend (ENG-19) at a pinned backend commit and are copied by the fixture sync of UX-13 | They are the only mock data; no frontend-authored fixture may contain a field the backend model lacks |
| FA-4 | No API mocking library is added (07 §10.1 adds only `jsdom` and Testing Library). Mocks are vitest fakes of the service modules and Playwright `page.route` handlers serving the synced fixtures | Section 3.3; flagged in section 9 because 07 §9.10 assumes a live backend for e2e |
| FA-5 | The six client-executed reports keep working for every client until that client has the engine. They read cross-patient lists (`/patient-procedures`, `/patient-payments`, `/patient-adjustments`, `/insurance-claims`) that SEC-43 (P1) answers with 403 for callers without a listed right | The fallback holds only if SEC-43 is switched on for a client after its engine is `on`, or after the users of the old reports hold a right SEC-43 accepts; FT-4 inventories the remaining callers (P1). `src/components/reports/**` is deleted only on the trigger of section 6.1 |
| FA-6 | Product defaults PD-1..PD-15 and the open-decision defaults of 07 §13.2 (OD-1..OD-11) hold until decided | Section 8.2 lists the phase that needs each decision |

### 1.3 The shape: one generic runner, few exceptions

AD-2: a report is a served definition; the runner renders parameters (FLT components), runs (`POST /reports/runs`), pages
the snapshot (`GET /reports/runs/{run_id}/rows`), exports through artifacts and drills through `POST /reports/runs/{run_id}/drill`.
The 118 legacy reports and the 49 new analytics reports need **no per-report frontend code** apart from the exceptions
below. A report family adds definitions on the backend; the frontend adds a Playwright spec and, when a family introduces a
new `route_key`, an entry in `model/recordRoutes.ts`.

| Exception (per-report or per-feature frontend code) | Why it is not generic | Items | Phase |
|---|---|---|---|
| `StatementCriteriaLayout` for `statements.statement_run` (registered in `criteriaLayoutRegistry`) | The legacy Statements screen is two criteria tables with three actions and no report list | UX-28, RPT-STMT-01, FLT-28 | P1 |
| Patient Print launcher and compact print dialog (Walkout, Superbill, Patient Ledger, Account Ledger, Audit Trail) in `PatientSecondaryNav.tsx` | Entry from the patient shell with context passing (`context{patient_id}`) | UX-29, RPT-LEDGER-03, RPT-MGMT-15 | P1, P2 |
| My Reports hub group with restriction banner | Provider restriction (PD-11) changes which pickers render | RPT-MY-03 | P1 |
| Routing Slip and Walkout entries in the Scheduler appointment menu | Entry from the Scheduler with `appointment_ids` | RPT-DAILY-51 | P1 |
| ADA claim print capture (`AdaClaimPrintModal.tsx` and batch paper print post a print event; `dentc:claim_print_log:v1:` retired) | A claims-feature change that feeds `insurance` reports | RPT-DAILY-76 | P1 |
| Time Clock screen rebound to the server report; "Open in Reports" link | `HoursReport` is an editor and stays | UX-30, RPT-MGMT-18 | P1, P2 |
| Walkout signatures captured in the viewer with `SignatureCapture` (`src/features/signature/`) | Signature stamping into a stored artifact | RPT-LEDGER-14 | P2 |
| Insurance dashboard rebinding (`getReportAccountsReceivable` caller) | Last caller of a legacy roll-up | UX-37 | P2 |
| Capitation payment entry screen (transactions feature) | Data entry screen that a P2 insurance report needs | RPT-INS-44 | P2 |
| Correspondence: search and favorites of the eight anchors, template authoring, blank insurance forms, workspace launchers, collection letter series, registration forms, advanced templates | Owning features of PD-15, delivered by the reports programme | RPT-MENU-02, RPT-MENU-05, RPT-MENU-12, RPT-MENU-09, RPT-MENU-10, RPT-MENU-13, RPT-MENU-11 | P1..P4 |
| Scheduler flow status menu (In Reception, Available, In Operatory, Checked Out) | Time-stamp capture the Time Stamps report needs | RPT-APPT-52 | P3 |
| Treatment plan "present and sign" dialog and "book from plan" row actions | Hand-off into the treatment-plan feature | RPT-TX-12 | P3 |
| Batch Claims Processing hand-off from Claims Created Not Sent | Hand-off into a utility | RPT-INS-16 | P3 |
| Group header printing of declared hidden columns | Renderer extension of `BandRow` | RPT-RECALL-15 | P3 |
| New `route_key` targets in `recordRoutes.ts` (`patient_transactions`, `patient_edit`, Provider Setup tabs, Office Setup operatory, Security Users / Groups, every setup screen of the lists, `time_clock_entry`, `patient_payment_plans`, setup fix screens) | Navigation targets are frontend routes | RPT-NEW-83 (F1.4), RPT-MGMT-18 (F2.7), RPT-MGMT-11 (F2.7, held to wave 3b by UX-39), RPT-APPT-16, RPT-APPT-18, RPT-PRLIST-07, RPT-SLIST-07, RPT-STLIST-08 (F3.9) | P1..P3 |
| Missing Progress Notes row action to `/patient/:id/progress-notes` with the date of service (P1); its bulk task to an assistant waits for UX-39 | Row action and bulk hand-off are frontend | RPT-MY-15 (F1.4; bulk part held to wave 3b) | P1, P3 |
| Office Reports of the organisation as seeded custom reports | Content in the builder, no own screen | RPT-MENU-15 | P5 |

### 1.4 Frontend effort per phase

One reconciled table for both plans. "Frontend-only" equals the column "Frontend items" of `10_backend_plan.md` §1.2
(22 / 26 / 7 / 8 / 4 / 3 = 70); "shared" items are counted in full in both plans.

| Phase | Frontend-only items (d) | Shared items (d) | Register items in this plan (d) | Plan tasks (d) | Frontend days | Frontend weeks at 3 engineers | Backend weeks at 6 engineers (10 §1.2) | Longest chain (weeks) | Phase length bound | Frontend engineers that fill the phase |
|---|---|---|---|---|---|---|---|---|---|---|
| P0 | 22 (122) | 2 (7) | 24 (129) | FT-1, FT-2, FT-3 (9) | 138 | 13.1 | 17 | Backend 55 d = 15.7; frontend: C2 (ENG-03 → ENG-06 → ENG-10 → ENG-12 → ENG-13, 35 d = 10) + UX-03 → FLT-10 → FLT-15 → UX-07 → UX-12 (32 d = 9.1) = **19.1** | about 19 weeks, frontend-bound (about 17 if G-26 splits UX-03) | 3 |
| P1 | 26 (110) | 14 (46) | 40 (156) | FT-4, FV ×4 (10) | 166 | 15.8 | 35 | Backend 42 d = 12 | about 35 weeks, backend-bound | 2 (166 d = 23.7 weeks) |
| P2 | 7 (39) | 17 (72) | 24 (111) | FV ×3 (6) | 117 | 11.1 | 41 | Backend 65 d = 18.6 | about 41 weeks, backend-bound | 1 full time (117 d = 33 weeks) plus QA |
| P3 | 8 (41) | 26 (139) | 34 (180) | FV ×9 (18) | 198 | 18.9 | 56 | Backend 42 d = 12 | about 56 weeks, backend-bound | 2 (198 d = 28.3 weeks) |
| P4 | 4 (25) | 9 (62) | 13 (87) | — | 87 | 8.3 | 11 | Backend 45 d = 12.9; frontend DASH-44 → UX-41 15 d = 4.3 | about 13 weeks, backend chain | 3 |
| P5 | 3 (27) | 4 (20) | 7 (47) | — | 47 | 4.5 | 4 | Backend 30 d = 8.6; frontend DASH-51 → UX-43 25 d = 7.1 | about 9 weeks, backend chain | 3 |
| Total | 70 (364) | 72 (346) | 142 (710) | 43 | 753 | | 164 | | | |

Phase length = max(frontend load, backend load at 6 engineers, the longest backend and frontend chains). The staffing
curve 3 / 2 / 1 / 2 / 3 / 3 follows from it. Where a phase still leaves frontend capacity, it goes to named work: the
per-family verification tasks FV-<family> (spec, visual baselines, classic-frame pairing against the legacy rows, frame
fixes, S each) and the verification of served definitions of shared DASH content items (DASH-04, DASH-12..DASH-15,
DASH-23..DASH-27, DASH-32..DASH-35) in the generic dashboard and worklist frames as the backend lands them. QA half time
(about 1.75 register-days per week) covers the 16 FV specs (32 d) with room over P1-P3. Risk RF-12 covers the waits.

---

## 2. Workstreams (tracks)

| Track | Scope | Lead | Items | Main existing code touched or reused |
|---|---|---|---|---|
| T1 Hub shell, routing, navigation | `ReportsEntry`, lazy `routes.tsx`, error boundaries, stale-deploy detection, engine probe, `legacyRedirects.ts`, hub home, search, command palette, Library, correspondence page, Reports menu, run tray, return-to-after-login, unsaved-changes guard, access gating | FE-A | P0: UX-01, UX-05, UX-11, UX-45 · P1: UX-20, UX-27, UX-31, UX-48, UX-49, RPT-MENU-02, RPT-MY-03 · P2: UX-33 (tray), UX-36 · P3: UX-40 (titles) | `src/App.tsx`, `GlobalNav.tsx` (`reportsMenuItems`, `handleNavClick`), `AppShell`, `AccessDenied`, `useUnsavedGuard`, `LoginPage.tsx`, `server.js`, `cmdk`, `@radix-ui/react-dropdown-menu` |
| T2 Criteria panel and parameter components | `params/` (models, codec, expressions, tokens, form, controls, pickers, layouts), classic and enhanced frames, chips, Clear Criteria, presentation preference, patient context, Statements layout, code picker extras, comparison period | FE-B | P0: FLT-04, FLT-05, FLT-10..FLT-15, UX-06, UX-07 · P1: FLT-16, FLT-19, FLT-21, FLT-28, UX-28, UX-29, UX-32, RPT-STMT-01, RPT-LEDGER-03 · P2: FLT-24, RPT-MGMT-15 · P3: FLT-25 · P4: FLT-26 | `useOfficeScope()`, `useOfficeOptions()`, `listOfficeGroups`, `patientLookup.ts`, `formatIsoDateOnly`, `ProviderOptionGroups` (visual), `DualListPicker` (visual), `theme.ts` section header tokens |
| T3 Results | `ResultTable` over the print stream, bands, inset blocks, server paging and virtualisation, result chrome, column chooser and layout, grouping, drill panel, `PivotMatrix`, chart view, row and bulk actions on snapshots | FE-A | P0: UX-08, UX-09 · P1: UX-16, UX-17, UX-22, UX-23, UX-24, UX-26, RPT-NEW-83, RPT-MY-15 · P2: RPT-MGMT-11 (held to P3) · P3: UX-39, RPT-RECALL-15, record-route items of section 1.3 | `@tanstack/react-table`, `@tanstack/react-virtual` (after UX-02), `TxPlanGrid` resize pattern, `uiZoom.ts`, Recharts, `schedulerHandoff.ts` |
| T4 Export, print, saved views, favorites, schedules | CSV and artifact flow, export dialog, `openReportArtifact`, purpose prompt, step-up, saved views, URL state, snapshot page, favorites and recents, sharing, schedules, alerts list | FE-A (P0-P1), FE-C (P2+) | P0: UX-10 · P1: UX-18, UX-19, UX-21 · P2: UX-34, UX-35, UX-46, DASH-17 · P4: UX-47 | `openServerReport` contract (`src/features/print/serverReport.ts`), `getMyPreferences` / `setMyPreferences` |
| T5 Dashboards and KPI components | Dashboard frame, tile registry, `KpiCard`, `MetricMatrix`, header, drill, charts, scorecards, goals and pacing, huddle, heatmap, customisation, alerts UI, comparison | FE-C | P1: UX-25, DASH-02..DASH-08, DASH-10 · P2: DASH-11..DASH-16, DASH-52 · P3: UX-42, DASH-19..DASH-27, DASH-54 · P4: UX-41, DASH-37..DASH-45 | `KpiStat`, `WidgetCard` (states model), Recharts palette of `ReportChart`, `react-markdown` |
| T6 Worklists | Worklist page shell, live keyset paging, selection, action bar, outcome and assignment dialogs, bulk outreach hand-off, per-worklist screens, my follow-ups | FE-C | P1: DASH-53 · P2: DASH-55 · P3: UX-38, DASH-30..DASH-36 | `OfficeBadge`, `ResultTable` cells, SMS and letters features |
| T7 Builder and assistant | Builder screens, template gallery content, assistant slots, ask bar, answer card, insight strip, explain panel | FE-B + FE-C | P5: UX-43, UX-44, DASH-47, DASH-48, DASH-49, DASH-51, RPT-MENU-15 | `ParamForm` controls, `ResultTable` preview, `SidePanel` |
| T8 Migration and touches outside the module | Six reports onto the engine, old home, saved views in `localStorage`, time clock, insurance dashboard, home and My Page widgets, patient Print, ADA print log, correspondence features, Scheduler statuses, capitation screen, lab tab link | FE-B (patient and Scheduler), FE-A (rest) | P0: UX-12 · P1: UX-30, DASH-08, FT-4 (SEC-43 caller inventory), RPT-DAILY-51, RPT-DAILY-76 · P2: UX-37, RPT-INS-44, RPT-MENU-05, RPT-MENU-12, RPT-MGMT-02, RPT-MGMT-18, RPT-LEDGER-14 · P3: RPT-APPT-52, RPT-MENU-09, RPT-MENU-10, RPT-MENU-13, RPT-INS-16, RPT-TX-12 · P4: RPT-MENU-11 | `src/components/reports/**`, `src/components/pages/Reports.tsx`, `HoursReport.tsx`, `InsuranceDashboard.tsx`, `src/features/letters/`, `src/features/claims/`, Scheduler |
| T9 Quality | Spike S-1, service layer, contract fixtures, test tooling, session continuity, `reports.css`, accessibility and responsive pass, bundle budgets | FE-C + QA | P0: UX-02, UX-03, UX-04, UX-13, UX-14, UX-15, FT-1 (module type gate), FT-2 (CI e2e job, test users), FT-3 (bundle check) · P1: FLT-21 · P1-P3: FV-<family> · P3: UX-40 | `e2e/support/axe.ts`, `playwright.config.ts`, `vitest.config.ts`, `.github/workflows/ci.yml`, `vite.config.ts` `manualChunks` |

---

## 3. The walking skeleton on the frontend side

### 3.1 Target

The first report rendered by the generic runner from a served definition is **`daily.production_report`** (Summary format,
legacy defaults), the first of the six proving-ground definitions of ENG-20. It exercises `office_scope`, `date_range`, an
`enum` with `forced_when`, a banded multi-block print stream (02 §6.1, the risk R9 of 07) and the golden result fixture that
07 §13.1 names. The skeleton is done when a signed-in user opens `/reports/r/daily.production_report`, sees the criteria
generated from `GET /reports/definitions/daily.production_report`, presses Run, reads the banded result paged from the
snapshot, and downloads the CSV of the same run.

### 3.2 Exact work items in order

| Step | Item | What lands | Backend needed | Data source |
|---|---|---|---|---|
| 1 | UX-02 | Spike S-1: the twelve checks of 07 §10.2, versions pinned in `package.json` | none | none |
| 2 | UX-01 | `src/features/reports/`, `ReportsEntry`, lazy `routes.tsx`, `ReportsErrorBoundary`, not-found page, engine probe with today's pages as `off` fallback, `server.js` 404 for `/assets/*` | ENG-01 (or none: a 404 is `off`) | none |
| 3 | UX-15 | `styles/reports.css` inside `@layer base`, layer tokens, container sizes, print sheet, `RptDialog` / `RptPopover` / `RptTooltip` / `SidePanel` | none | none |
| 4 | contract drop C0 | Full `openapi.json` from a backend running the branch (backend skeleton day 9); `npm run api:gen` **extends** the existing `src/api/generated/endpoints/reports/reports.ts` (it already holds the legacy roll-ups `getReportSummary`, `getReportAccountsReceivable`, `getDashboardSummary`) with the engine models | ENG-01 tags, ENG-03, ENG-19 (route declarations of ENG-05 may answer 501) | schema |
| 5 | UX-04 | `model/definitionModel.ts` (`parseDefinition` on zod), `iconMap.ts`, `recordRoutes.ts`, `formatters.ts`, `__fixtures__/` from the fixture sync | ENG-19 fixtures at a pinned backend commit | fixtures |
| 6 | UX-13 | `jsdom`, `@testing-library/react`, `@testing-library/user-event`; fixture sync script; `npm test` step in `ci.yml`; first Playwright reports spec with `wcag22aa` | ENG-19 | fixtures |
| 7 | FLT-04, FLT-05 (TypeScript halves) | `params/dateTokens.ts`, `params/paramExpr.ts` passing the shared vector files | ENG-04 vectors | vectors |
| 8 | UX-03 | `services/catalogService.ts`, `definitionService.ts`, `runService.ts` (client `run_id` UUID v7 through `newRunId()`), `reportKeys.ts` with user id and working office, per-call timeouts, polling cadence, rows queries, `silent_error` in `queryClient.ts`, `skip_scope_toast` in `api.ts`. One item, unblocked at C2 by its register dependencies (G-26) | ENG-05, ENG-12, ENG-13 | definition fixture of `daily.production_report` (ENG-19), then live |
| 9 | FLT-10, FLT-14, FLT-15 | `useParamForm`, `ParamForm` dispatch with single-column layout, simple controls, dependency behaviour | ENG-05 validate (#3); the served `daily.production_report` definition is the ENG-19 fixture until ENG-20 serves it | fixture, then live |
| 10 | FLT-12, FLT-11, FLT-13 | Date, office scope and entity controls; `useParamOptions` | FLT-03, FLT-06 options (#4) | fixture, then live |
| 11 | UX-07 | Enhanced runner `/reports/r/:report_key`: header, criteria bar, More options, chips, run lifecycle per cost class, `no_working_office` | ENG-12 (#5, #7, #9); ENG-20 with `daily.production_report` first, reading the thin DATA-05 and DATA-06 views of the backend skeleton | live at C2 |
| 12 | UX-08, UX-09 | `ResultTable` over the print stream, bands and inset blocks, paging with virtualisation; context line, criteria echo, notices, empty and failed states | ENG-10, ENG-11, ENG-13; ENG-20 (`daily.production_report`), DATA-05, DATA-06 | golden result pages, then live |
| 13 | UX-10 | CSV artifact request, follow, blob download with `file_name`, Blob error parsing | ENG-15, ENG-57 | live at C3 |
| **Skeleton done** | | `daily.production_report` end to end on a local backend with `REPORTS_ENGINE_ENABLED = true`, its definition served by ENG-20 over DATA-05 / DATA-06 | | |
| 14 | UX-05, UX-11, UX-45 | Hub, catalog-driven Reports menu, gating states (UX-45 after UX-07) | ENG-05, SEC-04, SEC-12 | live |
| 15 | UX-06 | Classic frame for the six reports | A-3 (`criteria_rows`) in the served definitions | live |
| 16 | UX-12 | Six reports on the runner, old ids redirected | ENG-20 (all six) | live |

### 3.3 Before the backend endpoints exist: contract-first

| Mechanism | How | Owner |
|---|---|---|
| OpenAPI stub | The backend lands the read and request models of 02 §13 with route declarations before the handlers (FA-2). Each sync point Cx runs `npm run api:sync` against a backend running the branch (local, or UAT when deployed) and commits the **full** `openapi.json`; a partial `/reports` + `/analytics` schema is never committed, because Orval reads one complete file and would drop every other generated endpoint. The CI drift step of `ci.yml` keeps `src/api/generated/**` equal to the committed schema | backend ENG-01, ENG-19; frontend T9 |
| Generated client only | Services in `src/features/reports/services/` import the generated functions and pass `signal` and `timeout`; no raw axios, no hand-written types (07 §9.2). Expected names, valid only once the backend fixes the operation ids of the engine routes (G-27): `listReportCatalog`, `getReportDefinition`, `validateReportParameters`, `listReportOptions`, `createReportRun`, `getReportRun`, `listReportRunRows`, `drillReportRun`, `createReportArtifact`, `getReportArtifact`. They share `endpoints/reports/reports.ts` (Orval `tags-split`) with the legacy roll-ups | T1..T5 |
| Mock handlers, unit level | vitest: `vi.mock` of the service modules returning the synced `__fixtures__` (definitions, `ReportResultPage` goldens, validate answers recorded from the backend contract tests) | T9 |
| Fixture source | The fixture sync of UX-13 copies `tests/contract/definitions/*.json` and the result-page fixtures from a backend checkout at a pinned commit, written to `src/features/reports/__fixtures__/SOURCE` together with a SHA-256 manifest of the copied files. CI has no backend checkout: its "fixture sync up to date" step recomputes the manifest of the committed fixtures and compares it with `SOURCE`; moving the pin is a reviewed frontend change at each Cx | T9 |
| Mock handlers, browser level | Playwright: `e2e/support/reportsRoutes.ts` (NEW) registers `page.route('**/api/v1/reports/**')` and `page.route('**/api/v1/analytics/**')` handlers that serve the same fixtures. Locally, login and the app shell use the real backend (`e2e/global-setup.ts`); in the CI e2e job of FT-2 a mocked storage state and route handlers for the auth, office and shell calls replace it. Used for specs that run ahead of the backend and for the engine-state specs (`off` = 404, `misconfigured` = 503) | QA |
| Manual work ahead of the backend | `npm run e2e:ui` with the route handlers above; no `VITE_*` mock flag (07 §2.3 forbids build flags for engine state) | all |
| Drift guard | `parseDefinition` over every fixture fails the suite on an unknown `type`, `kind`, `shape`, `layout`, `icon_key`, `route_key` or tile `kind` (UX-04, 02 §15.5); a fixture newer than the generated client fails `tsc -b` | T9 |
| Removal | A spec keeps its route mocks only while its endpoint is not deployed on the test backend; when the endpoint ships the spec switches to live data and the mock file shrinks | QA |

### 3.4 `api:sync` points

Each point is one frontend change: `npm run api:sync` against a backend at the named items, commit `openapi.json` and
`src/api/generated/**`, fix `npx tsc -b`, run the drift step.

| Point | Phase | Backend items in the schema | New generated operations (02 §13 rows) | Frontend items unblocked |
|---|---|---|---|---|
| C0 | P0 | ENG-01, ENG-03, ENG-19 (backend skeleton day 9) | models only (`ReportDefinitionRead`, `ReportCatalog`, `ReportResultPage`) | UX-04, UX-13 |
| C1 | P0 | ENG-05, FLT-01, FLT-06, SEC-04 | 1-4 | UX-05 and UX-11 wait for UX-03; FLT-10..FLT-15 wait for UX-03 (G-26) |
| C2 | P0 | ENG-10, ENG-11, ENG-12, ENG-13 | 5-9 | UX-03, then FLT-10..FLT-15, UX-05, UX-11, UX-07, UX-08, UX-09 |
| C3 | P0 | ENG-15, ENG-57, ENG-20 | 15-18 (CSV) | UX-10, UX-12 |
| C4 | P1 | ENG-22, ENG-23, ENG-27, ENG-28, ENG-29, ENG-30, ENG-31, ENG-61, RPT-STMT-15, RPT-STMT-18, SEC-16 | 10, 13, 14 (statements only: `update_statement_dates`, `undo_statement_dates`), 24-36, artifact options | UX-16..UX-24, UX-28 |
| C5 | P1 | ENG-32, ENG-33, ENG-34, ENG-35, DASH-01 | 54-61, 63; time-clock adapters | UX-25..UX-27, UX-30, DASH-02..DASH-08 |
| C6 | P2 | ENG-36, ENG-38, ENG-40, ENG-42, ENG-43, ENG-44, ENG-47, ENG-56, SEC-15, SEC-17, SEC-25, SEC-32 | 6, 11, 12, 19-23, 37-46, step-up | UX-33..UX-36, UX-46, DASH-17 |
| C7 | P3 | ENG-48, ENG-49, DASH-18, DASH-28, SEC-36 | 14 (generic row and bulk actions), 21, 62 | UX-38, UX-39, UX-42, DASH-19, DASH-30, DASH-31 |
| C8 | P4 | ENG-50, ENG-51, ENG-52, MET-21 | `include[]` additions of 56, condition schedules | DASH-37..DASH-41, UX-47 |
| C9 | P5 | ENG-53, ENG-54, ENG-55, DASH-46 | 47-53, 64 | UX-43, UX-44, DASH-49 |

---

## 4. Phase plans

Each phase section below lists goal, entry criteria, epics, build order, components, routes, report families, tests and
exit criteria. Epic ids `F<phase>.<n>` are local to this plan; backend dependencies are quoted by work-item id because the
backend epics of `10_backend_plan.md` are written in parallel.

Items of an earlier phase that a later phase's frontend work waits on (they keep their own phase; listed here so that the
phase sections can name them):

| Item | Own phase | Waited on by |
|---|---|---|
| SEC-06 | P0 | F1.7, F1.9 (provider restriction), F2.4 (Scorecard v1 visibility) |
| MET-02, MET-03 | P0 | UX-47 metric settings and code-group tab (P4) |
| RPT-MENU-01 | P0 | RPT-MENU-15 (P5) |
| FLT-22, FLT-23, FLT-27 | P0 | Parity files and lint rules that the classic frame and FLT-20 parity tests rely on (UX-06, family specs of P1..P3) |
| RPT-LEDGER-13 | P1 | RPT-LEDGER-14 (P2) |
| RPT-MENU-03 | P1 | RPT-MENU-05, RPT-MENU-12 (P2), RPT-MENU-13 (P3) |
| FLT-08 | P2 | Option sources of the P2 families (`denial_reason_codes`) |
| SEC-30 | P2 | RPT-SLIST-07 (P3) |
| RPT-INS-15 | P2 | RPT-INS-16 (P3) |
| DATA-40 | P3 | RPT-MENU-11 (P4) |

## P0 - Foundations and correctness

### Goal and what a user sees

A user of a client with the engine `on` opens Reports from the restored legacy menu (legacy order and labels, entries
filtered by the catalog), lands on the hub (groups, search over names and legacy aliases, correspondence links), and runs
the six reports of today on the server in the classic or the enhanced frame, with banded results paged from the snapshot
and CSV export. Totals cover the full population (no 600-1,600 row cap). A user without report access sees the
request-access state. A client with the engine `off` sees exactly today's pages.

### Entry criteria

| Needed for | Backend items | Endpoints (02 §13) |
|---|---|---|
| Start (steps 1-7 of 3.2) | none; C0 needs ENG-01, ENG-03 and ENG-19 | none |
| Hub, nav, criteria | ENG-01, ENG-05, ENG-07, SEC-04, FLT-01, FLT-02, FLT-03, FLT-06, FLT-07; the access object on #1 and #2 (served by the backend; SEC-13 is its UI acceptance, G-28) | #1 catalog, #2 definition, #3 validate, #4 options |
| Runs and results | ENG-10, ENG-11, ENG-12, ENG-13 | #5, #7, #8, #9 |
| CSV | ENG-15, ENG-57 | #15, #17, #18 |
| Six reports | ENG-20; `criteria_rows` on legacy definitions (07 A-3) | — |
| Gating states | SEC-12 (readiness report key), `module_access` and `rights_mode` on #1 (07 A-9) | #1 |
| Session | Decision OD-3 (silent refresh in this module) | `POST /api/v1/auth/refresh` (exists) |
| Financial correctness (gates the engine switch-on per client, X0-10; frontend work does not wait) | DATA-05, DATA-06, DATA-07, DATA-09; for migrated tenants DATA-10 and DATA-57; per client database DATA-08 (concurrent index builds on the tables of about 1.4 M rows, `10_backend_plan.md` §5.2); report-mode office rule and fixes on existing report endpoints SEC-05, SEC-10, SEC-11 (AD-10, PD-2) | — |
| Test users and CI e2e | FT-2: the role users of section 7.8 exist on the UAT backend | — |

### Epics

| Epic | Track | Work items | Size total | Depends on epics; backend items |
|---|---|---|---|---|
| F0.1 Module shell and Reports menu | T1 | UX-01, UX-11, UX-15 | 1S + 1M + 1L = 17 d | F0.2, F0.3; ENG-01, ENG-05, SEC-04 |
| F0.2 Contract, services, test tooling, session | T9 | UX-03, UX-04, UX-13, UX-14 | 1S + 3M = 17 d | ENG-19, ENG-05, ENG-12, ENG-13 |
| F0.3 Library and zoom spike | T9 | UX-02 | 1S = 2 d | none |
| F0.4 Parameter primitives and `ParamForm` | T2 | FLT-04, FLT-05, FLT-10, FLT-11, FLT-12, FLT-13, FLT-14, FLT-15 | 2S + 4M + 2L = 44 d (FLT-04, FLT-05 shared) | F0.2, F0.3; ENG-04, FLT-03, FLT-06 |
| F0.5 Runner frames and access gating | T2 | UX-06, UX-07, UX-45 | 1S + 2L = 22 d | F0.4, F0.8; ENG-12, SEC-12 |
| F0.6 Results v1 | T3 | UX-08, UX-09 | 1M + 1L = 15 d | F0.3; ENG-11, ENG-13 |
| F0.7 CSV export | T4 | UX-10 | 1S = 2 d | F0.6; ENG-15, ENG-57 |
| F0.8 Hub v1 | T1 | UX-05 | 1M = 5 d | F0.2; ENG-05 |
| F0.9 Six reports on the engine | T8 | UX-12 | 1M = 5 d | F0.5, F0.6; ENG-20 |
| **Total** | | 24 items | **129 d** | |

### Build order and parallel work

| Wave | FE-A | FE-B | FE-C | QA |
|---|---|---|---|---|
| 0 (no backend) | — | FLT-04 | UX-02, UX-15 (after UX-02), UX-14 | — |
| 1 (after backend day 9: C0) | UX-01 | FLT-05, UX-04 | FT-1, FT-3 | UX-13 tooling, route-mock helpers, FT-2 |
| 2 (after C2) | UX-03, then UX-05 | FLT-10 (after UX-03) | UX-08 on golden pages | hub spec on mocks |
| 3 | UX-11 | FLT-15, FLT-12, FLT-14 | FLT-11, FLT-13 (after FLT-10; needs FLT-06) | criteria a11y checks |
| 4 | UX-07 (after FLT-15) | UX-06 | UX-09 | runner spec on mocks, then live |
| 5 (after C3) | UX-45 (after UX-07), UX-12 (with FE-B) | UX-12 | UX-10 | six-report spec live; engine-off spec |

Loads from the register sizes: FE-A about 39.5 days (UX-01, UX-03, UX-05, UX-11, UX-07, UX-45, half of UX-12), FE-B about
43.5 (FLT-04, FLT-05, UX-04, FLT-10, FLT-15, FLT-12, FLT-14, UX-06, half of UX-12), FE-C about 41 (UX-02, UX-15, UX-14,
UX-08, FLT-11, FLT-13, UX-09, UX-10) plus 4 for FT-1 and FT-3, QA 5 (UX-13) plus 5 (FT-2). Critical path after C2:
UX-03 → FLT-10 → FLT-15 → UX-07 → UX-12, 32 days (about 9 weeks at 0.7 focus); FE-B's serial load after C2 (FLT-10,
FLT-15, FLT-12, FLT-14, UX-06, half of UX-12, 34.5 days) runs alongside. Before C2 the three engineers have about 27 days
of work in waves 0-1 (QA 10 more), so the time until the backend's ENG-12 and ENG-13 reach the schema is the P0 bound (1.4).
UX-14 changes `src/services/api.ts` for the whole app and ships behind its own review, separate from the module code.

### Components delivered

| Component (07 §8) | Reuses |
|---|---|
| `ReportsEntry`, `ReportsErrorBoundary`, `BlockErrorBoundary`, `ReportsNotFound` | `AppShell`; `AccessDenied` (`src/features/access-control/RequireRight.tsx`) |
| `ReportsNavMenu`, `useReportsNavItems` (`nav/`) | `@radix-ui/react-dropdown-menu`; icons already imported by `GlobalNav.tsx` |
| `HubLayout`, `HubSearchBox`, `ReportCard`, `CategoryGrid`, `CorrespondenceLinks` | `theme.ts` card tokens; favorites interaction of `UtilitiesDashboard` |
| `RequestAccessState`, `ObservationModeBanner`, `GatedButton` | `AccessDenied` layout; `RptTooltip` |
| `RptDialog`, `RptPopover`, `RptTooltip`, `SidePanel` | Radix primitives; `useBodyScrollLock` |
| `ParamForm`, `useParamForm`, `useParamOptions`, `paramModel`, `paramCodec`, `paramExpr`, `dateTokens` | precedent `UtilityParamsForm` (not reused) |
| `BooleanParam`, `EnumParam`, `EnumMultiParam`, `NumberParam`, `NumberRangeParam`, `TextParam`, `TextRangeParam`, `AmountComparisonParam`, `LookbackDaysParam`, `ScopedSelectionParam`, `DisplayParam`, `ActionParam` | native inputs with `rpt-` classes |
| `DateParam`, `DateRangeParam` | `formatIsoDateOnly` (`src/utils/datetime.ts`); `react-day-picker` only if spike check 7 passes |
| `OfficeScopeParam`, NEW `useOfficeGroups()` in `src/features/office-scope/` | `useOfficeScope()`, `useOfficeOptions()`, `listOfficeGroups` |
| `EntityMultiParam`, `EntitySingleParam`, `ProviderParam`, `EntityPickerDialog`, `OptionPopover` | `patientLookup.ts`; `ProviderOptionGroups` and `DualListPicker` as visual precedent only |
| `ClassicCriteriaLayout`, `CriteriaSection`, `ReportCategoryPage`, `ReportPicker`, `ClassicReportFrame`, `LegacyActionBar` | `components.sectionHeader` of `theme.ts`; `SectionHeader` |
| `EnhancedCriteriaLayout`, `CriteriaChips`, `ReportRunnerPage`, `RunnerHeader`, `RunControl`, `DefinitionInfoDrawer`, `RunStatusPanel` | `RunConsole` / `StatusBadge` visual language |
| `ReportResults`, `RunContextLine`, `ResultNotices`, `SummaryCards`, `ResultToolbar`, `ResultTable`, `BandRow`, `DetailRow`, `InsetBlockRow`, `GrandTotalBar`, `KeyValueBlock`, `EmptyResult`, `RunError` | TanStack Table and Virtual through `useResultTable()`; `TxPlanGrid` resize pattern; `KpiStat` for summary cards until `KpiCard` (P1) |
| `ArtifactStatus` (CSV only) | — |

### Routes delivered, redirected, retired

| Change | Detail |
|---|---|
| Delivered | `/reports` (row 1), `/reports/c/:category` (row 2), `/reports/r/:report_key` (row 3), `/reports/correspondence` (row 16), `/reports/*` not found (row 17) |
| Redirected (one table `legacyRedirects.ts`) | `/reports/run/:reportId` through `LEGACY_REPORT_ID_MAP`; `/reports/ledger`, `/reports/appointment`, `/reports/treatment-plan`, `/reports/insurance` to their category pages; `/reports/lists/*` to `/reports/c/lists?subcategory=…`; `/reports/interactive/*` and `/reports/office/*` to the hub search with an explanatory notice (G-12 default) until their targets exist (worklists in P3, `/reports/c/custom` in P5); the nineteen pre-`f7332be` paths of 07 §2.2 |
| Retired | The seventeen report routes of `src/App.tsx` L253-298, the ten `PlaceholderPage` routes; with the engine `off` the old home and runner stay through the probe fallback |

### Report families that become usable

The six proving-ground definitions, run on the server in both frames: `daily.production_report`, `daily.collection_report`,
`lists.patient_list`, `appointment.appointment_list`, `treatment_plan.treatment_plan_status`, `insurance.claims_list`. Screen
and CSV only. Legacy parity of their categories follows in P1 (daily), P2 (insurance) and P3 (lists, appointment,
treatment plan). Until a category's parity phase its P0 classic frame shows only the served `criteria_rows` of ENG-20
with the defaults of today's client report, and carries no parity badge.

### Tests that must be green

| Kind | Tests |
|---|---|
| Unit (vitest, node) | `paramExpr` and `dateTokens` against the shared vectors; `paramCodec` round trip per parameter type; `parseDefinition` over every synced fixture; `runModel` cadence and `error_code` message map; `newRunId()` vector; `catalogModel` ranking (alias "Production by Codes - Provider" finds Production Report); `mergeCatalog` with malformed and empty catalogs; `legacyRedirects` table; `formatters` (no arithmetic, string date parts) |
| Component (vitest, jsdom) | `ParamForm` from definition fixtures in both layouts; dependency behaviour (`enabled_when`, `forced_when`, `default_when`, `label_when`, reconciliation with `disabled[]`); `ResultTable` from the golden result pages (group headers, subtotals, inset block, key-value block); run lifecycle with a mocked service (instant auto-run, interactive Run, cancel, promotion polling, client timeout then poll); `GatedButton` reasons |
| End to end (Playwright, `e2e/reports/`) | `hub.spec.ts`: menu in legacy order, search by alias, correspondence page lists eight entries, request-access state (route mock with empty catalog); `runner.spec.ts`: each of the six reports opened from the nav, defaults shown, Run, bands visible, CSV downloaded with the artifact `file_name`; `engine_states.spec.ts`: 404 catalog gives today's pages and today's menu, 503 gives "Reports are not available"; `stale_deploy.spec.ts`: a missing hashed chunk shows "A new version is available"; `session.spec.ts`: two tabs receiving 401 both continue (UX-14) |
| Accessibility | `checkA11y` with `wcag22aa` added (`e2e/support/axe.ts`) on hub, classic frame, enhanced runner, a result without links (`scrollable-region-focusable`), the paged table view, the open Reports menu with a fly-out |
| Visual | Baselines (`npm run e2e:update`) for hub and classic frame of `daily.production_report` at zoom 0.75, messaging panel closed and open; baselines are generated and compared only in the Linux Playwright container of the FT-2 job, never on workstations |
| Contract and CI | `npm test` in `ci.yml`; API drift step green; fixture manifest equals `__fixtures__/SOURCE`; FT-1 type gate; FT-3 bundle check; CI e2e job of FT-2 runs the route-mock specs (`hub.spec.ts`, `engine_states.spec.ts`, `stale_deploy.spec.ts`, the mock half of `runner.spec.ts`) |

### Exit criteria

| # | Statement |
|---|---|
| X0-1 | `src/App.tsx` holds exactly one report route (`/reports/*`); an unknown `/reports/x` shows `ReportsNotFound`; every old `/reports/*` path lands on a real page or on the hub search with the notice of G-12 (`/reports/interactive/*`, `/reports/office/*`) |
| X0-2 | The six reports run on the engine in both frames with totals over the full population; the rows on screen equal the CSV rows of the same run; opened without URL values, each shows the defaults of today's client report |
| X0-3 | With a 404 on `GET /reports/catalog` the Reports menu and pages equal today's; with 503 every module path shows "Reports are not available" |
| X0-4 | No raw axios, no `jspdf` import and no `useRights()` / `hasRight()` / `isPrivilegedRole()` import under `src/features/reports/**` (ESLint rules fail the build); no implicit or explicit `any` in the module (FT-1 gate) |
| X0-5 | After logout and login as another user in the same tab no report query of the first user is served; an office switch never shows the previous office's cached result |
| X0-6 | With `office_id = null` no office-dependent call is sent and an unassigned user sees `OfficeRequiredBanner` |
| X0-7 | A View Only user sees Export disabled with its reason; an empty catalog shows the request-access state; in shadow mode an administrator sees the observation banner |
| X0-8 | Spike S-1 answers are written down and versions pinned; the bundle check of FT-3 passes in CI: the main chunk grew by at most 10 KB gzip, the `reports` chunk is under 180 KB gzip without charts |
| X0-9 | `npx tsc -b`, the FT-1 gate, `npx eslint`, `npm test`, the drift step, the fixture-manifest check and the route-mock P0 Playwright specs pass in CI (FT-2 job, triggered on `main` and the module branches); the live P0 specs pass locally against the UAT backend as `reports_full_admin`, `reports_view_only` and `reports_no_access` |
| X0-10 | The engine is switched on for a client only after that client's database has DATA-08 applied, DATA-10 and DATA-57 have run (migrated tenants), and the DATA-09 reconciliation is green for that database; recorded in the client's runbook row (`10_backend_plan.md` §7.1) before `REPORTS_ENGINE_ENABLED = true` |
| X0-11 | UX-12 closed with its runner, redirect and fallback part: the six reports run on the runner for clients `on` and on the old pages for clients `off`; the deletion of the old code is the open action of section 6.1 (G-29) |

## P1 - Daily financial core

### Goal and what a user sees

Daily (12 reports), Ledger (4), My Reports (5) and Statements (1 screen) at legacy parity in both frames, with PDF, XLSX
and CSV from the stored run, print through the server PDF, column layouts, grouping, drill-through to records and the
Scheduler, matrix blocks and chart views. Saved views, favorites and recents live on the server and survive logout; old
`localStorage` views are imported once. Main Dashboard, Provider Dashboard and My Dashboard v1 with KPI cards and the
trailing-12-month matrix; the application home and My Page widgets show metric-service values. The glossary is
searchable. A link to a snapshot opened while signed out lands on the snapshot after login.

### Entry criteria

| Needed for | Backend items | Endpoints |
|---|---|---|
| P0 exit | X0-1..X0-11 | — |
| Export and print | ENG-22, ENG-23, ENG-24, ENG-25, ENG-26, ENG-27, SEC-16; 07 A-7 fields on #15 | #15-#18 with options, purpose, `watermark_id` |
| Saved views, favorites, recents | ENG-28, ENG-29, SEC-17 | #24-#36 |
| Drill and matrix | ENG-30, ENG-31 | #13; matrix blocks in #8 |
| Statements | ENG-61, RPT-STMT-15, RPT-STMT-18 | #10 with `confirm_side_effects`; #14 for the statement `legacy_actions` only (`update_statement_dates`, `undo_statement_dates`), delivered by ENG-61 in P1 (`10_backend_plan.md` P1 endpoints, row 14 "statements only"); generic row and bulk actions arrive with ENG-49 in P3 (C7) |
| Patient context and restriction | FLT-16, FLT-17, SEC-06 | `context{patient_id}` on #3, #5, #29 |
| Criteria echo, parity defaults | FLT-18, FLT-20 | `criteria_echo[]` |
| Dashboards and metrics | ENG-32, ENG-33, ENG-35, SEC-18, DASH-01, DASH-09, MET-05, MET-06, MET-07, MET-08 | #54-#61, #63 |
| Time clock | ENG-34, RPT-MY-12, SEC-19 | time-clock adapters |
| Family definitions | RPT-DAILY-01 and the Daily, Ledger, My Reports and Statements definitions of the catalog | — |
| Grouping outline | 07 A-4 (group extent on `group_header`, row-kind filter) | #8 |
| Cross-patient list rights | SEC-43 is switched on for a client only after its engine is `on` (or after the users of the old reports hold an accepted right); FT-4 inventory delivered to the backend before SEC-43 ships | `/patient-procedures`, `/patient-payments`, `/patient-adjustments`, `/insurance-claims` |

### Epics

| Epic | Track | Work items | Size total | Depends on epics; backend items |
|---|---|---|---|---|
| F1.1 Results depth | T3 | UX-16, UX-17, UX-23, UX-24, UX-26 | 2S + 3M = 19 d | F0.6; ENG-28, ENG-31 |
| F1.2 Export dialog and print flow | T4 | UX-18 | 1M = 5 d | F0.7; ENG-22, ENG-23, ENG-27, SEC-16 |
| F1.3 Saved views, URL state, favorites, preferences | T4 | FLT-19, UX-19, UX-20, UX-21, UX-32 | 1S + 3M + 1L = 27 d | F0.4, F1.5 (UX-48); ENG-28, ENG-29 |
| F1.4 Drill-through and record routes | T3 | UX-22, RPT-NEW-83 (fix-screen `route_key`s), RPT-MY-15 (row action; bulk task held to P3 wave 3b, G-11) | 1S + 2M = 12 d | F0.6; ENG-30, RPT-MY-14 |
| F1.5 Shell additions | T1 | UX-31, UX-48, UX-49 | 3S = 6 d | F0.1, F0.8 |
| F1.6 Dashboard frame, KPI components, glossary | T5 | UX-25, UX-27, DASH-02, DASH-03, DASH-06, DASH-07 | 2S + 3M + 1L = 29 d | F1.1 (UX-23, UX-26), F1.3 (FLT-19), F1.4; ENG-32, ENG-33, SEC-18, DASH-01 |
| F1.7 First dashboards and the first list worklist | T5, T6 | DASH-04, DASH-05, DASH-10, DASH-53 | 2S + 2M = 14 d (shared content) | F1.6; MET-05, MET-06, DATA-55, DATA-56, FLT-17 |
| F1.8 Statements screen | T2 | UX-28, RPT-STMT-01, FLT-28 | 1S + 2M = 12 d | F0.5; ENG-26, ENG-61, RPT-STMT-15 |
| F1.9 Patient context and My Reports | T2 | FLT-16, UX-29, RPT-LEDGER-03, RPT-MY-03 | 3S + 1M = 11 d | F0.5; FLT-17, SEC-06 |
| F1.10 Migration and entry points | T8 | UX-30, DASH-08, RPT-DAILY-76, RPT-DAILY-51, RPT-MENU-02 | 2S + 3M = 19 d | F0.9, F1.6; ENG-34, ENG-35, MET-07, DATA-21, RPT-DAILY-47 |
| F1.11 Filter accessibility | T9 | FLT-21 | 1S = 2 d | F0.4 |
| **Total** | | 40 items | **156 d** | |
| Plan tasks | T8, T9 | FT-4 SEC-43 caller inventory (S); FV-daily, FV-ledger, FV-my_reports, FV-statements (S each) | 10 d | F1.10; family definitions |

### Build order and parallel work

| Wave | FE-A | FE-B | FE-C |
|---|---|---|---|
| 1 (after C4) | UX-48, UX-49, UX-18, UX-16 | FLT-19, FLT-21 | DASH-02 (on fixtures), UX-23 |
| 2 | UX-17, UX-22, UX-21 | UX-19, UX-32 | UX-26, DASH-03 |
| 3 (after C5) | UX-20, UX-31, UX-24, RPT-NEW-83, RPT-MY-15 (row action) | FLT-16, UX-29, RPT-LEDGER-03, RPT-MY-03 | UX-25, DASH-06, DASH-07 |
| 4 | UX-27, RPT-MENU-02, RPT-DAILY-76 | UX-28, FLT-28, RPT-STMT-01, RPT-DAILY-51 | DASH-04, DASH-05, DASH-10, DASH-53 |
| 5 | UX-30, FT-4 | FV-daily, FV-ledger, FV-my_reports, FV-statements | DASH-08 |

FV tasks run as each family's definitions land (Daily first, Ledger, My Reports, Statements last because of ENG-61);
each is the family's Playwright spec, its visual baselines, the classic-frame pairing check against the legacy rows and
the frame fixes it finds. The columns name work streams; with the P1 staffing of two engineers (1.4) FE-C's stream is
shared out as each wave closes, and the wave order holds.

### Components delivered

| Component | Reuses |
|---|---|
| `ColumnChooser`, layout blob (`model/layoutModel.ts`) | Radix popover |
| Group expand / collapse, outline, sort-by menu in `ResultTable` | — |
| `PivotMatrix` (static and interactive grid mode) | — |
| `ChartFrame` (lazy `reports-chart` chunk) | Recharts; palette of `ReportChart` |
| `DrillPanel`, NEW `openSchedulerAtDate` in `src/services/schedulerHandoff.ts` | `SidePanel`; `openSchedulerAtAppointment`, `openSchedulerForBooking` |
| `ExportDialog`, `PurposePromptDialog`, `ArtifactStatus` (all formats, volumes), `openReportArtifact` | contract of `openServerReport` |
| `SaveViewDialog`, `ManageViewsDialog`, `FavoriteStar`, `LibraryTabs`, `StartStrip`, `ContinueList`, `RunSnapshotPage` | `RptDialog` |
| `ReportCommandPalette` | `cmdk` |
| `PresentationToggle`, `useReportsUiPrefs` | `getMyPreferences` / `setMyPreferences` |
| `StatementCriteriaLayout`, `SideEffectConfirmDialog` | `ParamForm` controls |
| Patient Print launcher and compact print dialog | replaces the "Coming Soon" alert of `PatientSecondaryNav.tsx` L270 |
| `MetricValue`, `FreshnessBadge`, `MetricDefinitionPopover`, `KpiCard`, `Sparkline` | `KpiStat`; `react-markdown` |
| `MetricMatrix` | `PivotMatrix` interactive mode |
| `DashboardPage`, `DashboardGrid`, `DashboardViewTabs`, `DashboardTile`, `UnknownTile`, `ListTile`, `DashboardHeader`, `DashboardCatalogPage` | `WidgetCard` states as the model; `ParamForm` bar layout |
| `GlossaryPage` | `MetricDefinitionPopover` |
| Return-to-after-login (`LoginPage.tsx`, 401 handler), unsaved-changes guard in `GlobalNav.handleNavClick` | `useUnsavedGuard` registry |

### Routes delivered, redirected, retired

| Change | Detail |
|---|---|
| Delivered | `/reports/runs/:run_id` (row 5), `/reports/library/:tab?` with `favorites`, `recents`, `views` (row 6), `/reports/dashboards` (row 7), `/reports/dashboards/:dashboard_key` (row 8), `/reports/glossary` (row 14) |
| Populated | `/reports/c/daily`, `/reports/c/ledger`, `/reports/c/statements`, `/reports/c/my_reports`; menu entries Dashboards ▸ and My Favorites |
| Redirected | `/reports/my-favorites` to `/reports/library/favorites` (already in the P0 table, now a real page) |
| Retired | Saved-view writes to `localStorage` (import only); the patient "Print Reports - Coming Soon" alert |

### Report families that become usable

Daily (12), Ledger (4), My Reports (5) and Statements (1): the 22 legacy reports of P1 (facts). The P1 analytics
reports `management.report_access_log` (RPT-NEW-78) and `management.setup_integrity` (RPT-NEW-83, with fix-screen
`route_key`s). Dashboards `dashboards.main`, `dashboards.provider`, `dashboards.my`; worklist-as-list
`worklists.not_reappointed` (DASH-53), served as `kind = standard` and rendered in the runner until the worklist page
ships in P3 (G-10 default).

### Tests that must be green

| Kind | Tests |
|---|---|
| Unit | `layoutModel` version migration and unknown column keys; `viewModel` (office policy, dirty check); `urlState` underscore keys; `paramCodec` leaves out `url_safe = false` keys; `useReportsUiPrefs` read-merge-write never touches keys outside `reports_ui`; saved-view import mapping (section 6.2) |
| Component | `PivotMatrix` golden matrix fixture; interactive matrix keyboard (one tab stop, arrows, Enter drills); `KpiCard` states of 06 §3.1 (`no_data`, `not_available`, `restricted`, `suppressed`); `DashboardTile` retry while other tiles render; `ExportDialog` purpose flow; `StatementCriteriaLayout` renders every control of `legacy/index/statements_reports.controls.json` |
| End to end | One spec per family (`daily.spec.ts`, `ledger.spec.ts`, `my_reports.spec.ts`, `statements.spec.ts`, each the spec of its FV task): open from the nav, defaults equal the family parity file, run, drill (total equals the clicked number), export PDF / XLSX / CSV, save a view and reopen it after logout; `dashboards.spec.ts`: main, provider, my, tile drill reconciliation, layout restore after reload; `return_to.spec.ts` (UX-48); `print.spec.ts`: Print opens the tab at click time, 422 `purpose_required` closes it and succeeds after the prompt; `patient_print.spec.ts` (RPT-LEDGER-03); `statements.spec.ts` also runs `update_statement_dates` (confirmation, second confirmation for today, `balance_changed` skips listed) and `undo_statement_dates` as an administrator; `not_reappointed.spec.ts`: the list opens in the runner and a row click opens the patient |
| Accessibility | FLT-21 on every control type; dialogs trap and return focus; `MetricMatrix`; dashboard page; snapshot page |
| Visual | Classic frames of the 12 Daily reports (section pairing equals the legacy rows); Statements screen; Main Dashboard matrix at zoom 0.75 |

### Exit criteria

| # | Statement |
|---|---|
| X1-1 | Every Daily, Ledger, My Reports and Statements definition opens without URL values with exactly the legacy defaults (FLT-20 parity test green) and its FV spec passes locally against the UAT backend as `reports_full_admin` and `reports_provider_restricted` |
| X1-2 | Screen totals equal PDF and XLSX totals for the same run (backend R4 green; spot check in `daily.spec.ts`) |
| X1-3 | A "Month to date" view saved in one month runs the next month's dates; views and favorites survive logout and another browser |
| X1-4 | Reloading a runner URL restores criteria and the stored run without a stale overlay; no patient name appears in any URL |
| X1-5 | The drill total equals the clicked number; a drill to an appointment opens the Scheduler on that appointment |
| X1-6 | One data call fills all tiles of `dashboards.main`; a failing tile shows Retry while the others stay; the home dashboard and My Page tiles contain no browser-aggregated number |
| X1-7 | PRINT STATEMENTS asks for confirmation and is disabled with its reason without `access.can_commit`; `update_statement_dates` and `undo_statement_dates` run through #14 with their confirmations; no other action is offered on a statements run in P1 |
| X1-8 | The Time Clock screen and the runner show the same totals; no client crawl of punches remains |
| X1-9 | Opening `/reports/runs/<run_id>` while signed out shows the snapshot after login |
| X1-10 | `worklists.not_reappointed` opens in the runner as a standard list; a row click opens the patient; the Missing Progress Notes row action opens `/patient/:id/progress-notes` at the date of service; each setup-integrity fix link (RPT-NEW-83) opens its screen |
| X1-11 | The FT-4 inventory of cross-patient list callers is handed to the backend; with SEC-43 on for a test client whose engine is `on`, `/dashboard`, My Page and every screen in the inventory still load for their users |

## P2 - Month-end, A/R and insurance

### Goal and what a user sees

Monthly (9), Management (4) and Insurance (13) at parity. Long reports run in the background: the user leaves the page,
the run tray in the top bar shows progress and the finished result, and the run history lists every run. Schedules
deliver login-gated links; dashboards can be subscribed. Saved views can be shared. Administrators get settings, all
runs, all schedules and usage. Collections and A/R, Insurance and revenue cycle, Production analysis and Executive summary
dashboards, Scorecard v1, chart tiles and the day-close checklist arrive. Bulk exports may ask for the password again.

### Entry criteria

| Needed for | Backend items | Endpoints |
|---|---|---|
| P1 exit | X1-1..X1-11 | — |
| Background runs, tray, history | ENG-38, ENG-39, ENG-40, ENG-42, ENG-45, ENG-63; ENG-56 (`REDIS_NAMESPACE` on the shared Memorystore) released to the client before any envelope; socket envelopes `report.run.*`, `report.artifact.ready` | #6, #7 with `queue_position`, #11, #12 |
| Schedules, deliveries, subscriptions | ENG-43, ENG-44, SEC-25, DASH-09 | #19, #20, #37-#46 |
| Sharing | ENG-28 shares, SEC-17 | #30, #31 |
| Administration | ENG-36, ENG-47, SEC-15 | #22, #23 |
| Step-up | SEC-32 with its refusal code and re-check endpoint (07 A-7) | step-up route |
| Run estimate | FLT-24 backend half | `cost_class` and estimate on #3 |
| Dashboards | MET-10, MET-11, MET-12, MET-26, DATA-27, DATA-29, DATA-30 | #56, #60 |
| Insurance dashboard rebinding | ENG-35 | #56 |
| Family definitions | the Monthly, Management and Insurance definitions of the catalog; RPT-MGMT-01, RPT-MGMT-14, RPT-MGMT-17, RPT-LEDGER-13 | — |
| Outside screens | DATA-38 (capitation writer), RPT-MENU-03, RPT-MENU-04 | owning-feature routes |

### Epics

| Epic | Track | Work items | Size total | Depends on epics; backend items |
|---|---|---|---|---|
| F2.1 Background runs and run tray | T1, T4 | UX-33, FLT-24 | 1S + 1L = 12 d | F1.5 (UX-48); ENG-38, ENG-40, ENG-42 |
| F2.2 Schedules and dashboard subscriptions | T4 | UX-34, DASH-17 | 1M + 1L = 15 d | F1.3 (UX-19), F2.1; ENG-43, ENG-44, SEC-25, DASH-09 |
| F2.3 Sharing, administration, step-up | T4, T1 | UX-35, UX-36, UX-46 | 1S + 2M = 12 d | F1.2, F1.3; SEC-17, ENG-36, ENG-47, SEC-15, SEC-32 |
| F2.4 Chart tiles and Scorecard v1 | T5 | DASH-11, DASH-52 | 2M = 10 d | F1.6; SEC-06 |
| F2.5 P2 dashboards | T5 | DASH-12, DASH-13, DASH-14, DASH-15, DASH-16 | 1S + 4M = 22 d (shared content) | F2.4; MET-10, MET-11, MET-12 |
| F2.6 Insurance dashboard rebinding | T8 | UX-37 | 1S = 2 d | ENG-35 |
| F2.7 Family frontend touches, record routes and day-close list | T2, T3, T8, T6 | RPT-MGMT-02, RPT-MGMT-15, RPT-MGMT-18, RPT-LEDGER-14, DASH-55, RPT-MGMT-11 (route key `patient_payment_plans` and bulk hand-off; held to P3 wave 3b by UX-39 and ENG-49, G-11) | 4S + 2M = 18 d | F0.5, F1.9, F1.10; RPT-MGMT-01, RPT-MGMT-10, RPT-MGMT-14, RPT-MGMT-17, RPT-LEDGER-13, ENG-22 |
| F2.8 Screens of owning features | T8 | RPT-INS-44, RPT-MENU-05, RPT-MENU-12 | 2M + 1L = 20 d | DATA-03, DATA-38, RPT-MENU-03, RPT-MENU-04 |
| **Total** | | 24 items | **111 d** | |
| Plan tasks | T9 | FV-monthly, FV-management, FV-insurance (S each) | 6 d | family definitions |

### Build order and parallel work

| Wave | FE-A | FE-B | FE-C |
|---|---|---|---|
| 1 (after C6) | UX-33 (tray, history, shared socket from `AppointNowSocket`) | FLT-24, RPT-MGMT-02, RPT-MGMT-15 | DASH-11 |
| 2 | UX-36, UX-46 | RPT-LEDGER-14, RPT-MGMT-18 | DASH-52, UX-37 |
| 3 | UX-34 | RPT-INS-44, RPT-MENU-12 | DASH-12, DASH-13, DASH-14 |
| 4 | UX-35, DASH-17 | RPT-MENU-05 | DASH-15, DASH-16, DASH-55 |
| 5 | FV-monthly, FV-management, FV-insurance | — | — |

With the P2 staffing of one engineer (1.4) the columns run one after the other in the order FE-A wave 1, FE-C, FE-B,
FE-A waves 2-5; the phase is bounded by the backend chain DATA-26 → … → RPT-MONTHLY-11 (65 days), not by this order.
RPT-MGMT-11 is listed in F2.7 for its register phase; its work runs in P3 wave 3b-2.

The socket generalisation of UX-33 touches AppointNow (`src/features/appointnow/lib/appointnowSocket.ts`) and needs an
AppointNow regression run (its Playwright smoke and the manual workflow) before release.

### Components delivered

| Component | Reuses |
|---|---|
| `RunTrayButton`, `RunTrayPanel`, `RunHistoryTable`, `useRunTray`, `useRunEvents`, `notificationRoutes.ts` | AppointNow bell markup of `GlobalNav.tsx`; `listMyNotifications`, `markMyNotificationRead` |
| Shared tenant-topic socket | `AppointNowSocket` generalised |
| `RunControl` estimate, "Run in background instead" | — |
| `ScheduleDialog`, `ScheduleDetailPanel`, `SchedulesPage`, `scheduleModel.ts` | `EntityPickerDialog` for recipients; `SidePanel` |
| `ShareDialog`, Library tab `shared` | `RptDialog` |
| `ReportsAdminPage` tabs `settings`, `runs`, `schedules`, `usage`, `access` | `GatedButton` |
| `StepUpDialog` | — |
| `TrendChart`, `BarsChart`, `AgingBars`, `FunnelChart` | `ChartFrame` |
| `Scorecard` v1 | `PivotMatrix` |
| Capitation payment screen (transactions feature), template authoring list and editor (letters feature), blank insurance forms page | owning-feature code under `src/features/transactions/`, `src/features/letters/`, `src/features/claims/` |
| Walkout signature in the viewer | `SignatureCapture` (`src/features/signature/`) |

### Routes delivered, redirected, retired

| Change | Detail |
|---|---|
| Delivered | `/reports/runs` (row 4), `/reports/schedules` with `tab=mine\|delivered\|all`, `kind=report\|digest` (row 10), `/reports/admin/:tab?` (row 15), `/reports/library/shared` |
| Populated | `/reports/c/monthly`, `/reports/c/management`, `/reports/c/insurance`; menu entries Schedules, Run history, Administration |
| Retired | The `getReportAccountsReceivable` caller in the insurance dashboard; the deprecated roll-up functions have no importer |

### Report families that become usable

Monthly (9), Management (4) and Insurance (13): the 26 legacy reports of P2. 21 analytics reports of P2
(`catalog/analytics_reports.md`). Dashboards `dashboards.production`, `dashboards.collections_ar`,
`dashboards.insurance_rcm`, `dashboards.executive_summary`; Main and Provider v2. Worklist `worklists.day_close_checklist` (DASH-55), served as `kind = standard` in the runner until P3 (G-10 default).

### Tests that must be green

| Kind | Tests |
|---|---|
| Unit | `scheduleModel` preset to cron and back; `notificationRoutes` targets; tray polling only while a run of mine is active; `useRunEvents` drops an envelope whose `run_id` is not one of the caller's runs |
| Component | `RunTrayPanel` states; `ScheduleDialog` refuses "follow working office"; `StepUpDialog`; chart tiles with "Show as table" |
| End to end | `background.spec.ts`: a background run found in the tray after navigation and after a new login; tray updates by polling with the socket blocked; an injected `report.run.*` envelope for another organisation's `run_id` changes nothing; `schedules.spec.ts`: e-mail link opened while signed out lands on the run; paused schedule shows the fix; `sharing.spec.ts`: recipient runs and duplicates, cannot overwrite; `admin.spec.ts`: each tab absent without its right; family specs `monthly.spec.ts`, `management.spec.ts`, `insurance.spec.ts` (FV tasks); `dashboards_p2.spec.ts` (each P2 dashboard, Scorecard v1 as `reports_provider_restricted`); `day_close.spec.ts`; `estimate.spec.ts` (FLT-24); AppointNow regression |
| Accessibility | Schedules page, schedule dialog, tray panel, admin pages, chart tiles |
| Visual | Aging classic frame; Collections and A/R dashboard |

### Exit criteria

| # | Statement |
|---|---|
| X2-1 | Every Monthly, Management and Insurance definition opens with the legacy defaults and its FV spec passes locally against the UAT backend as `reports_full_admin`; `sharing.spec.ts` passes as `reports_share_recipient` |
| X2-2 | A background run started on one page is found in the tray after navigation and after a new login; AppointNow and the tray share one socket connection |
| X2-3 | A schedule summary sentence equals the stored recurrence; a recipient who opens the e-mail link while signed out lands on the run after login |
| X2-4 | A holder of `reports_runs_manage_all` can cancel another user's run; each admin tab is absent without its right |
| X2-5 | No importer of the deprecated `/reports/*` roll-up functions remains in `src/` |
| X2-6 | With `step_up_minutes` set, a bulk export asks for the password once and then proceeds |
| X2-7 | Saving a capitation payment shows it in Collection Report under tender capitation |
| X2-8 | Each P2 dashboard (`dashboards.production`, `dashboards.collections_ar`, `dashboards.insurance_rcm`, `dashboards.executive_summary`, Main and Provider v2) fills all tiles with one data call, and a tile total equals its drill report for the same period and scope |
| X2-9 | A provider-restricted user sees only the own row of Scorecard v1; chart tiles offer "Show as table" |
| X2-10 | `worklists.day_close_checklist` opens in the runner; every child-check link opens its target; the counters on Collections and A/R and Front office equal the list's count |
| X2-11 | A shared view opens for the recipient, who can run and duplicate it but not overwrite it |
| X2-12 | A run whose estimate exceeds the inline limit offers "Run in background instead" before it starts (FLT-24) |
| X2-13 | Deletion of the old report code (section 6.1): when every client's runbook row shows the engine `on` and the UX-19 import has run for one release, `src/components/reports/**` and `src/components/pages/Reports.tsx` are deleted, no importer remains and `npx tsc -b` is green; otherwise the open action moves to the next phase exit with the clients still `off` named |

## P3 - Scheduling, clinical, patients and lists

### Goal and what a user sees

Appointment (9), Treatment Plan (4), Referral (8), Recall (4), Ortho (5) and all Lists (12 + 4 + 4 + 20) at parity. The
Interactive Reports menu opens worklists with live lists, row and bulk actions, outcomes and assignments, and the user's
follow-ups. Report results feed letters, texts and tasks through bulk actions. The Morning Huddle (present mode, phone
layout), production goals with pacing, and the scheduling, hygiene, treatment, patients, referrals, ortho and front-office
dashboards arrive. The correspondence workspace launches letters, postcards and labels.

P3 holds 180 engineer-days of frontend work. It is delivered in two waves that keep every item in P3:

| Wave | Content | Why first |
|---|---|---|
| 3a | Worklist frame (F3.1), bulk outreach and bulk actions (DASH-31, UX-39), the schedule worklists DASH-33 that the huddle needs, finance worklists DASH-35 and DASH-32, goals (F3.4), huddle (F3.5), appointment, recall, treatment-plan families | 06 C-1 and C-5: the huddle and the billing queues are the most asked-for surfaces |
| 3b | Remaining worklists (DASH-34, DASH-36), remaining dashboards (F3.6), correspondence (F3.8), referral, ortho and the four list families, the held hand-offs of RPT-MGMT-11 and RPT-MY-15, UX-40 | Depend on 3a frames |

### Entry criteria

| Needed for | Backend items | Endpoints |
|---|---|---|
| P2 exit | X2-1..X2-12 (X2-13 is conditional) | — |
| Worklists | ENG-48, ENG-49, SEC-36, DASH-28, DASH-29; 07 A-5 (dry run), A-6 | #14, #21 |
| Goals | DASH-18, MET-17 | #62 |
| Dashboards | MET-13, MET-14, MET-15, MET-16, MET-18, MET-19 | #56, #60 |
| Options of P3 families | FLT-09 | #4 |
| Families | the catalog definitions of the six P3 categories; RPT-APPT-07, RPT-APPT-15, RPT-APPT-17, RPT-INS-15, RPT-TX-10, RPT-APPT-60 | — |
| Correspondence | RPT-MENU-06, RPT-MENU-07, RPT-MENU-08 | owning-feature routes |
| Scheduler statuses | DATA-17 | `PATCH /appointments/{appointment_id}/status` |

### Epics

| Epic | Track | Work items | Size total | Depends on epics; backend items |
|---|---|---|---|---|
| F3.1 Worklist page and screens | T6 | UX-38, DASH-30 | 1M + 1L = 15 d | F0.6, F1.4; ENG-48, ENG-49, SEC-36, DASH-28 |
| F3.2 Worklists content and my follow-ups | T6 | DASH-32, DASH-33, DASH-34, DASH-35, DASH-36 | 2M + 3L = 40 d (shared content) | F3.1, F3.3 (DASH-31); DASH-29 |
| F3.3 Bulk actions and hand-offs | T3, T6 | UX-39, DASH-31, RPT-INS-16, RPT-TX-12 | 2S + 1M + 1L = 19 d | F1.4, F3.1; ENG-38, ENG-49 |
| F3.4 Goals | T5 | UX-42, DASH-19, DASH-20 | 1S + 1M + 1L = 17 d | F1.5 (UX-49), F1.6; DASH-18, MET-17 |
| F3.5 Morning Huddle and heatmap | T5 | DASH-21, DASH-22 | 1M + 1L = 15 d | F3.4, F2.4, F3.2 (DASH-33); MET-13..MET-15 |
| F3.6 P3 dashboards and remaining tile re-pointing | T5 | DASH-23, DASH-24, DASH-25, DASH-26, DASH-27, DASH-54 | 1S + 5M = 27 d (shared content) | F2.4; MET-14, MET-15, MET-16, MET-18, MET-19, DASH-29 |
| F3.7 Code picker extras | T2 | FLT-25 | 1M = 5 d | F0.4 |
| F3.8 Correspondence workspace and forms | T8 | RPT-MENU-09, RPT-MENU-10, RPT-MENU-13 | 2M + 1L = 20 d | F3.3 (DASH-31), F3.2 (DASH-35); RPT-MENU-06, RPT-MENU-07, RPT-MENU-08 |
| F3.9 Scheduler status, group-header printing, record routes | T3, T8 | RPT-APPT-52, RPT-RECALL-15, RPT-APPT-16, RPT-APPT-18, RPT-PRLIST-07, RPT-SLIST-07, RPT-STLIST-08 | 6S + 1M = 17 d | F1.1 (UX-17), F1.4, F3.2 (DASH-33 for RPT-APPT-16), F3.3 (DASH-31 for RPT-APPT-18); DATA-17, SEC-30 |
| F3.10 Responsive and accessibility pass | T9 | UX-40 | 1M = 5 d | all P3 families |
| **Total** | | 34 items | **180 d** | |
| Plan tasks | T9 | FV-appointment, FV-treatment_plan, FV-referral, FV-recall, FV-ortho, FV-lists_patient, FV-lists_provider, FV-lists_security, FV-lists_setup (S each) | 18 d | family definitions |

### Build order and parallel work

| Wave | FE-A | FE-B | FE-C |
|---|---|---|---|
| 3a-1 (after C7) | UX-38, DASH-31 | RPT-APPT-52, FLT-25 | UX-42, DASH-19 |
| 3a-2 | DASH-30, UX-39 (after DASH-31) | RPT-TX-12, RPT-RECALL-15 | DASH-20, DASH-22 |
| 3a-3 | DASH-33 (after DASH-30) | RPT-APPT-18 (after DASH-31), RPT-INS-16 | DASH-32 (after DASH-30) |
| 3a-4 | DASH-35 | RPT-APPT-16 (after DASH-33), FV-appointment, FV-recall, FV-treatment_plan | DASH-21 (after DASH-33, DASH-20) |
| 3b-1 | DASH-34 | RPT-MENU-13, RPT-PRLIST-07, RPT-SLIST-07 | DASH-23, DASH-24, DASH-25 |
| 3b-2 | DASH-36, RPT-MGMT-11 (held part), RPT-MY-15 (bulk task) | RPT-MENU-09, RPT-STLIST-08 | DASH-26, DASH-27, DASH-54 |
| 3b-3 | UX-40, FV-referral, FV-ortho | RPT-MENU-10 (after DASH-35), FV-lists_patient, FV-lists_provider, FV-lists_security, FV-lists_setup | UX-40 |

The columns name work streams; with the P3 staffing of two engineers (1.4) FE-C's stream is shared out as each wave
closes, and the wave order holds. When UX-38 ships, the backend serves DASH-53 and DASH-55 as `kind = worklist`; FE
verifies them on the worklist page with DASH-33 (which adds the actions of DASH-53) and DASH-35 (DASH-55) (X3-7).

### Components delivered

| Component | Reuses |
|---|---|
| `WorklistPage`, `WorklistIndex`, `WorklistRowCard`, live keyset paging (`live_rows` infinite query), "List changed - Refresh" | `ResultTable` cells; `OfficeBadge` on rows |
| `RowActionMenu`, `BulkActionBar`, `BulkActionDialog`, outcome and assignment dialogs | dry-run counts of the action endpoint |
| Bulk outreach hand-off (text, e-mail, letters with consent exclusions, job progress) | SMS feature (`src/features/sms/`), letters feature |
| `GoalsPage` shell and production goal grid, `GoalBar`, pacing chart | `useUnsavedGuard` with UX-49 coverage |
| Morning Huddle views, present mode, single-column phone rendering | `DashboardTile`, `KpiCard` `lg` size |
| `HeatmapGrid` | `ChartFrame` table view |
| Code picker category tree, code ranges, saved code sets | `EntityPickerDialog` |
| Correspondence workspace launchers, recipient preview, batch history; collection letter series; registration and questionnaire forms on the patient Print menu | letters feature; `openServerReport` |
| Scheduler flow status menu entries | Scheduler status menu |
| `recordRoutes.ts` additions of section 1.3 | existing route patterns of `src/App.tsx` |

### Routes delivered, redirected, retired

| Change | Detail |
|---|---|
| Delivered | `/reports/worklists` and `/reports/worklists/:report_key` (row 9), `/reports/goals` with `tab=production\|history` (row 13); Setup › Providers › Provider Goals menu link |
| Populated | `/reports/c/appointment`, `/reports/c/treatment_plan`, `/reports/c/referral`, `/reports/c/recall`, `/reports/c/ortho`, `/reports/c/lists?subcategory=patient\|provider\|security\|setup`; menu entries Interactive Reports ▸ and Goals |
| Redirected | `/reports/interactive/unsigned-progress-notes` and `/reports/interactive/eligibility-verification` switch from the hub notice of G-12 to `worklists.unsigned_progress_notes` and `worklists.eligibility_verification` (DASH-36) |
| Retired | Client recall-due and insurance-receivable aggregation (`useRecallDue`) |

### Report families that become usable

Appointment (9), Treatment Plan (4), Referral (8), Recall (4), Ortho (5), Lists (12 + 4 + 4 + 20): the 70 legacy reports of
P3. 18 analytics reports of P3. Dashboards `dashboards.morning_huddle`, `dashboards.schedule_capacity`,
`dashboards.hygiene_recall`, `dashboards.treatment`, `dashboards.patients`, `dashboards.referrals_marketing`,
`dashboards.ortho`, `dashboards.front_office`. The worklists of 06 §6 (15 with My follow-ups).

### Tests that must be green

| Kind | Tests |
|---|---|
| Unit | Selection model (`mode = all` versus `row_nos[]`); live-list cursor reset on 422 `invalid_cursor`; goal grid copy and spread tools |
| Component | Worklist with a fixture definition renders its declared actions; confirmation shows selected, accepted and excluded counts before sending |
| End to end | `worklists.spec.ts` (live paging keeps scroll on "Load more", the 60-s tick never moves rows, outcome removes the row); `bulk_letters.spec.ts` (letters batch opens with exactly the selected patients); `goals.spec.ts` (guard on nav click, rail link, reload); `huddle.spec.ts` on a `mobile-chrome` project (Pixel 7) that DASH-21 enables in `playwright.config.ts` with `testMatch` restricted to the huddle and dashboard specs; family specs `appointment.spec.ts`, `treatment_plan.spec.ts`, `referral.spec.ts`, `recall.spec.ts`, `ortho.spec.ts`, `lists_patient.spec.ts`, `lists_provider.spec.ts`, `lists_security.spec.ts`, `lists_setup.spec.ts` (FV tasks); Scheduler status stamps (RPT-APPT-52); `dashboards_p3.spec.ts`; `code_sets.spec.ts` (FLT-25) |
| Accessibility | UX-40: axe `wcag22aa` on hub, runner, results (virtual and paged), worklists, goals, schedules, the open Reports menu; every route sets `document.title` |
| Visual | Huddle present mode and phone layout; worklist card layout below `@rpt-sm` |
| Manual | WF-30 of `docs/qa/DentC_E2E_Test_Workflows.html` rewritten for the hub, not forked |

### Exit criteria

| # | Statement |
|---|---|
| X3-1 | Every legacy report of the 16 categories is reachable from the menu and the hub under its legacy name; every family's FV spec passes locally against the UAT backend as `reports_full_admin` (and `reports_view_only` for the bulk-action refusals) |
| X3-2 | No placeholder route remains; both Interactive Reports entries and the `/reports/interactive/*` redirects open their worklists instead of the G-12 hub notice |
| X3-3 | A worklist action that resolves a row removes it after refetch; no bulk action is sent before the confirmation with counts |
| X3-4 | The Morning Huddle renders in one column on a phone-size viewport and in present mode on a wall screen |
| X3-5 | axe `wcag22aa` passes on every module route listed in UX-40 |
| X3-6 | Each of the 23 legacy correspondence items runs from its launcher and from a report selection with the same output |
| X3-7 | `worklists.not_reappointed` and `worklists.day_close_checklist` open on the worklist page with their row actions |
| X3-8 | The production goal grid saves and reloads; the pacing bar equals the goal minus month-to-date production; leaving the dirty grid asks first |
| X3-9 | Each P3 dashboard (DASH-23..DASH-27) fills all tiles with one data call and a tile total equals its drill report; the re-pointed home and My Page recall and insurance tiles (DASH-54) equal `dashboards.main`, and `useRecallDue` has no importer |
| X3-10 | Setting In Reception, Available, In Operatory and Checked Out in the Scheduler stamps the times that the Time Stamps report shows (RPT-APPT-52) |
| X3-11 | A saved code set and a code range in the code picker resolve to the same codes after reload (FLT-25) |
| X3-12 | The held hand-offs run: the RPT-MGMT-11 bulk hand-off to contract posting, the RPT-MY-15 bulk task, and the bulk actions of RPT-DAILY-77 and RPT-MGMT-13, each after its confirmation with counts |

## P4 - Analytics depth

### Goal and what a user sees

Targets and bands colour KPIs; Scorecard v2 ranks providers and offices with median and quartile rows; the Multi-office
comparison dashboard; matrix compare, prior-year, percent-of-goal and heat modes; "Alert me" on metrics with alerts in the
Schedules page and the tray; free-grid dashboard customisation with a keyboard alternative, a tile library and phone
layouts for every dashboard; outreach results; a comparison period on opted-in reports.

### Entry criteria

| Needed for | Backend items | Endpoints |
|---|---|---|
| P3 exit | X3-1..X3-12 | — |
| Roll-ups, overlays | ENG-50, ENG-51, MET-21, MET-22, MET-23, MET-27, SEC-38 | `include[] = goal, benchmark, rank` on #56 |
| Alerts | ENG-52, SEC-39, DASH-41 backend half, DASH-42 | condition schedules on #38; notifications |
| Metric settings tab | MET-02, MET-03 endpoints (07 A-11) | to be added to 02 §13 |

### Epics

| Epic | Track | Work items | Size total | Depends on epics; backend items |
|---|---|---|---|---|
| F4.1 Dashboard frame v2 and customisation | T5 | UX-41, DASH-44 | 1M + 1L = 15 d | F1.6, F3.5; ENG-51 |
| F4.2 Targets, scorecard v2, comparison, matrix modes, comparison period | T5, T2 | DASH-37, DASH-38, DASH-39, DASH-40, FLT-26 | 3M + 2L = 35 d | F3.4, F2.4; ENG-50, ENG-51, MET-21, MET-23, SEC-38 |
| F4.3 Alerts | T4, T5 | DASH-41, DASH-42, UX-47 | 2M + 1L = 20 d | F2.1, F2.2; ENG-52, SEC-39 |
| F4.4 Outreach results and snapshot trends | T5 | DASH-43, DASH-45 | 1S + 1M = 7 d | F3.2; DATA-48 |
| F4.5 Advanced letter templates | T8 | RPT-MENU-11 | 1L = 10 d | F2.8 (RPT-MENU-05); DATA-40 |
| **Total** | | 13 items | **87 d** | |

### Build order and parallel work

FE-C runs F4.1: its first step is the grid library spike named in the title of UX-41 (`react-grid-layout` 2.x and
`@dnd-kit/core` under the 0.75 zoom, 07 §10.1), then DASH-44 on the chosen library, then the rest of UX-41 (free grid
frame, keyboard alternative, present-mode shell, phone layout), which depends on DASH-44 in the register (G-30); FE-A
runs F4.3 (DASH-41 frontend parts, UX-47); FE-B runs FLT-26, DASH-40, DASH-37, then RPT-MENU-11; DASH-38 and DASH-39
follow ENG-51 with FE-C; F4.4 last.

### Components delivered

| Component | Reuses |
|---|---|
| Free grid with keyboard move and resize, tile library, present-mode shell, phone frame | grid library chosen by the UX-41 spike |
| Targets and bands editor, inline "Set target" | `GoalsPage` tab `targets` |
| `Scorecard` v2, `RankingTable` | `PivotMatrix` |
| Matrix cell modes and compare mode | `MetricMatrix` |
| `DateRangeParam` compare props | `DateRangeParam` |
| "Alert me" dialog, alert detail in `ScheduleDetailPanel`, alert notifications in the tray, `metric_settings` admin tab | `ScheduleDetailPanel`, `RunTrayPanel` |
| Outreach results view | dashboard frame |
| Advanced letter template block editor | letters feature |

### Routes delivered, redirected, retired

`/reports/schedules?kind=alert`, `/reports/goals?tab=targets`, `/reports/admin/metric_settings`; dashboard
`dashboards.multi_office`. Nothing is retired.

### Report families that become usable

`dashboards.multi_office`; Scorecard v2 on every scorecard tile; 8 analytics reports of P4 (among them
`analytics.provider_scorecard`, RPT-NEW-50, and `analytics.outreach_results`, RPT-NEW-75).

### Tests that must be green

| Kind | Tests |
|---|---|
| Unit | Band evaluation from `metric_targets` (thresholds, direction, missing target); compare-period codec of `DateRangeParam` (`compare_to` values, prior period and prior year resolution, URL round trip); matrix cell-mode formatting (percent of goal, variance) |
| Component | Scorecard v2 suppression states (`suppressed`, unranked below `rate_min_denominator`); band colour plus icon plus word |
| End to end | `dashboard_layout.spec.ts`: a customised layout restored on another device; every drag move possible by keyboard; `alerts.spec.ts`: an alert notification opens the alert page and its dashboard with the tile highlighted; acknowledgement in history |
| Accessibility | Free grid keyboard alternative (WCAG 2.5.7); heat shading contrast 3:1 or values shown |
| Visual | Compare modes and heat shading; multi-office dashboard |

### Exit criteria

| # | Statement |
|---|---|
| X4-1 | A customised layout is restored on another device; present mode hides the application chrome |
| X4-2 | A provider-restricted caller never receives another provider's row, rank or share in any scorecard (server test plus UI spec) |
| X4-3 | An alert fires, notifies, and can be acknowledged, snoozed and muted from the Schedules page |
| X4-4 | `compare_to = none` leaves every legacy report output unchanged (parity specs still green) |
| X4-5 | A KPI with a target shows its band as colour, icon and word; "Set target" saves and the band updates without reload (DASH-37) |
| X4-6 | `dashboards.multi_office` ranks the offices of the caller's scope with group subtotals; a user without the multi-office right does not see it (DASH-39) |
| X4-7 | The outreach results view totals per worklist equal the outcomes recorded on that worklist (DASH-43) |
| X4-8 | State-metric trend tiles read snapshots only; the start-of-day tile keeps its morning value after a later edit (DASH-45) |
| X4-9 | An advanced letter template with a referral data tag and a ledger date-range prompt prints for a selected patient (RPT-MENU-11) |

## P5 - Builder and assistant

### Goal and what a user sees

Authors with the build right create custom reports from datasets in List or Summary mode with a 10-row preview, publish
them under Custom with folder tags, and customise a standard report into a draft. Every published custom report runs in
the normal runner with exports, views and schedules. The assistant answers from the metric registry in the hub, the
dashboard header and the runner header, explains numbers and fills runner criteria without running them. The Office
Reports menu lists the organisation's custom reports.

### Entry criteria

| Needed for | Backend items | Endpoints |
|---|---|---|
| P4 exit | X4-1..X4-9 | — |
| Builder | ENG-53, ENG-54, SEC-40, MET-24, DASH-51 backend half | #47-#53, #54 with `dataset` |
| Assistant | ENG-55, DASH-46, DASH-47, DASH-50, MET-25, SEC-41; decision D-9 of 06 | #64 |

### Epics

| Epic | Track | Work items | Size total | Depends on epics; backend items |
|---|---|---|---|---|
| F5.1 Report builder | T7 | UX-43, DASH-51 | 1M + 1XL = 25 d | F0.4, F0.6, F4.1; ENG-53, ENG-54, SEC-40, MET-24 |
| F5.2 Assistant surfaces | T7 | DASH-49, UX-44, DASH-47, DASH-48 | 1S + 3M = 17 d | F1.6; DASH-46, ENG-55, SEC-41 |
| F5.3 Office Reports as custom reports | T7 | RPT-MENU-15 | 1M = 5 d | F5.1; RPT-MENU-01 |
| **Total** | | 7 items | **47 d** | |

### Build order and parallel work

FE-B builds UX-43 (pickers, steps, preview, spec errors, publish, share, Customise) with FE-A on `PublishDialog` and the
Library `custom` tab; FE-C builds DASH-49, then UX-44, DASH-47 and DASH-48; RPT-MENU-15 runs last as content work with the
product owner.

### Components delivered

| Component | Reuses |
|---|---|
| `BuilderHomePage`, `BuilderPage`, `DatasetPicker`, `FieldPicker`, `BuilderSteps`, `BuilderPreview`, `SpecErrors`, `PublishDialog`, template gallery | `ParamForm` controls for filters; `ResultTable` for the preview |
| `AssistantSlot`, `AskBar`, `AnswerCard`, insight strip, explain panel | `SidePanel`; `react-markdown` |

### Routes delivered, redirected, retired

`/reports/builder` (row 11), `/reports/builder/:custom_definition_id` (row 12), `/reports/library/custom`,
`/reports/c/custom` populated; menu entry Office Reports ▸ with Report builder. The `/reports/office/*` redirects switch from the hub
notice of G-12 to `/reports/c/custom`.

### Report families that become usable

Tenant custom reports (`custom.<slug>`); the organisation's Office Reports mapped by RPT-MENU-15.

### Tests that must be green

| Kind | Tests |
|---|---|
| Unit | Builder spec model (List / Summary spec built from picker state, serialisation equals the `errors[{path}]` paths, Customise from a standard definition keeps its parameters); assistant fill mapping (`fill_parameters` to `ParamForm` values through `paramCodec`, unknown keys dropped and named) |
| Component | `SpecErrors` maps each `errors[{path}]` to its step; preview debounced 800 ms and never sent while invalid |
| End to end | `builder.spec.ts`: a published custom report runs in the runner with export, view and schedule; an invalid spec cannot be published; `assistant.spec.ts`: a sentence fills the runner form and nothing runs until Run; with the organisation switch off no assistant entry point renders |
| Accessibility | axe `wcag22aa` on every builder step, `PublishDialog`, the `AskBar` and `AnswerCard`, the explain panel |
| Visual | Builder preview in List and Summary mode; `AnswerCard` with interpretation chips; insight strip |
| Bundle | `reports-builder` and `reports-assistant` chunks load only on their routes and slots (FT-3 budgets extended to both) |

### Exit criteria

| # | Statement |
|---|---|
| X5-1 | A custom report built from a dataset is published and runs in the normal runner with exports, saved views and schedules |
| X5-2 | `fill_parameters` never starts a run; the assistant slots render nothing without `analytics_assistant_use` or with the switch off |
| X5-3 | Every captured Office Reports entry runs in the hub under its legacy name or carries a signed "not needed" |
| X5-4 | Explain opens the metric definition and the inputs that sum to the value (DASH-47) |
| X5-5 | The insight strip shows only statements whose numbers equal the metric service values for the same scope and period, each with its Explain link (DASH-48) |
| X5-6 | `/reports/office/*` redirects land on `/reports/c/custom` instead of the G-12 hub notice |

---

## 5. Component build order across phases

```
UX-02 spike ─► UX-15 reports.css + Rpt* wrappers ─┬─► FLT-14 simple controls ─┐
UX-04 model (parseDefinition, formatters,          ├─► FLT-12 Date / DateRange ─┤
          iconMap, recordRoutes)                   ├─► FLT-11 OfficeScope ──────┤
FLT-04 dateTokens, FLT-05 paramExpr ───────────────┤                            ├─► FLT-10 ParamForm + FLT-15 dependencies
UX-03 services + reportKeys ───────────────────────┘   OptionPopover ─► EntityPickerDialog ─► FLT-13 Entity/Provider ─┘
                                                                                             │
   ┌───────────────────────────────────────────────────────────────────────────────────────┘
   ├─► UX-06 ClassicCriteriaLayout ─► UX-28 StatementCriteriaLayout
   ├─► UX-07 EnhancedCriteriaLayout + CriteriaChips ─► DASH-06 DashboardHeader bar ─► UX-43 builder filters
   └─► FLT-19 paramCodec URL / views ─► UX-19 saved views ─► UX-34 schedules

UX-08 ResultTable (print stream, virtual paging) ─► UX-09 ReportResults chrome ─► UX-16 ColumnChooser / layout
   ─► UX-17 grouping ─► UX-22 DrillPanel (compact ReportResults) ─► UX-23 PivotMatrix ─► UX-26 interactive mode
   ─► DASH-03 MetricMatrix ─► DASH-40 compare and cell modes
UX-08 cells ─► UX-38 worklist rows + BulkActionBar ─► DASH-30 dialogs ─► DASH-32..DASH-35 worklists

DASH-02 MetricValue + KpiCard + Sparkline ─► UX-25 DashboardTile frame ─► DASH-04 / DASH-05 dashboards v1
   ─► UX-24 ChartFrame ─► DASH-11 Trend / Bars / Aging / Funnel ─► DASH-52 Scorecard v1 ─► DASH-20 GoalBar
   ─► DASH-22 HeatmapGrid ─► DASH-21 Huddle ─► DASH-38 Scorecard v2 / RankingTable ─► UX-41 + DASH-44 free grid
   ─► DASH-51 custom scorecard tiles
```

| Level | Components | First phase | Gate before the next level |
|---|---|---|---|
| L0 Primitives | `reports.css`, `RptDialog`, `RptPopover`, `RptTooltip`, `SidePanel`, `GatedButton`, `formatters`, `parseDefinition`, `dateTokens`, `paramExpr`, services | P0 | Spike S-1 checks 5-7 and 9; vectors green |
| L1 Parameter controls | the 17 type components of 04 §13.4 plus `ActionParam` | P0 | Component tests per type; codec round trip |
| L2 Form | `ParamForm`, `useParamForm`, `useParamOptions` | P0 | Any fixture renders in legacy section order; `disabled[]` reconciliation |
| L3 Criteria layouts | Classic, Enhanced, Statement, dashboard bar, builder filters | P0, P1, P5 | Classic pairing equals the legacy rows of the Daily family |
| L4 Result table | `ResultTable`, row kinds, `GrandTotalBar`, toolbar | P0 | 50,000-row scroll; screen = CSV |
| L5 Result chrome and panels | `ReportResults`, `ColumnChooser`, grouping, `DrillPanel` | P0, P1 | Drill reconciliation line |
| L6 Matrix | `PivotMatrix`, interactive mode, `MetricMatrix` | P1 | Golden matrix fixture; keyboard grid |
| L7 KPI | `MetricValue`, `KpiCard`, `Sparkline`, `GoalBar` | P1, P3 | All value states of 06 §3.1 |
| L8 Dashboard frame | `DashboardPage`, `DashboardTile`, tile registry, header | P1 | One data call; per-tile retry |
| L9 Visuals and scorecards | chart tiles, `Scorecard`, `HeatmapGrid`, `RankingTable` | P2, P3, P4 | Table alternative for each chart |
| L10 Free grid | grid frame v2, tile library | P4 | Keyboard alternative to every drag |

---

## 6. Migration plan for what exists

### 6.1 When each piece moves

| Existing piece | Moves in | Item | How nothing regresses |
|---|---|---|---|
| Six client-executed reports (`src/components/reports/reports/*.ts`, `ReportRunnerPage`) | P0 | UX-12 with ENG-20 | Engine probe keeps the old runner for clients with the engine `off` (as long as SEC-43 is not on for them, FA-5); for clients `on`, old ids redirect through `LEGACY_REPORT_ID_MAP`. A comparison run on a seeded office below the old row cap: totals equal except the documented defects D1-D9 of `analysis/fe_existing_reports.md` (listed in the release note); above the cap the new totals are the correct ones |
| Old runner, exporters and helpers (`ReportShell`, `ReportFilterPanel`, `DataTable`, `ReportChart`, `exportCsv`, `exportExcel`, `exportPdf`, `exportMatrix`, `savedViews`, `reportRange`, `reportMetrics`) | Open action without a register item (G-29). Trigger: every client's row in the release runbook (`10_backend_plan.md` §7.1, client registry) shows the engine `on`, and the UX-19 import (P1) has run for one release. Target: checked at each phase exit from P2 (X2-13) | — | One deletion change; `npx tsc -b` proves no importer remains; Utilities build because `useOffices`, `useProviders`, `officeName` moved first |
| `src/components/reports/lib/useReportRefData.ts` | P0, before any deletion | UX-12 | Moved to `src/components/utilities/lib/`; Utilities Playwright smoke |
| Reports home `src/components/pages/Reports.tsx` | P0 hub replaces it; KPI content returns in P1 as `dashboards.main` | UX-05, DASH-04, DASH-08 | Between P0 and P1 the hub shows no KPI tiles rather than capped numbers; the old home remains the `off` fallback |
| Saved views in `localStorage` (`dentc:reports:views:<user_id>:<reportId>`) | P1 | UX-19 | One-time import on first hub load with the mapping of 6.2; created server views are listed in a notice; keys deleted only after a successful create |
| Time-clock report `/time-clock/report` (`HoursReport.tsx`) | P1 rebinding; P2 links and the management definition | UX-30, RPT-MY-12, RPT-MGMT-17, RPT-MGMT-18 | Screen stays; equality of totals between the screen and the runner is the acceptance of UX-30 |
| Lab report and lab cost report (`src/features/lab-tracking/`, `labReportPrint.ts`) | P3 | RPT-APPT-60, RPT-APPT-61, RPT-APPT-62 | Patient tab unchanged; "Open office-wide report" link and replacement of the client cost PDF by `getLabCostReport` have no own item (section 9, G-17) |
| Four patient PDFs (`openServerReport`) | P1 (listed in the Print launcher) | UX-29 | Unchanged endpoints |
| Patient "Print Reports - Coming Soon" alert | P1 | UX-29, RPT-LEDGER-03 | Replaced by the launcher |
| `/dashboard` and My Page widgets | P1, P3 | DASH-08, DASH-54 | Routes unchanged; each re-pointed tile equals `dashboards.main` for the same scope and day; recall and insurance tiles say "available in P3" / "available in P2" until then |
| `InsuranceDashboard.tsx` roll-up call | P2 | UX-37 | Rebound before ENG-35 adapters retire |
| ADA claim print log in `localStorage` (`dentc:claim_print_log:v1:`) | P1 | RPT-DAILY-76 | Read-once fallback, then retired |
| GlobalNav Reports menu (seven static leaves) | P0 | UX-11 | With the engine `off` the menu equals today's; malformed catalog falls back to the static skeleton |
| Ten placeholder routes | P0 delete and redirect (interactive and office paths to the hub notice of G-12); P3 interactive targets real; P5 office targets real | UX-11, DASH-36, RPT-MENU-15 | Every old path lands on a real page or the hub notice (X0-1, X3-2, X5-6) |
| Cross-patient list callers outside the module (`/dashboard`, My Page, ledger, claims screens) | P1 | FT-4 next to DASH-08 | Inventory handed to the backend before SEC-43 ships; X1-11 |
| `docs/reports/reports_backend_devreport.md`, WF-30 | P0 superseded note; P3 rewrite | UX-40 | Playbook extended, not forked |

### 6.2 Saved-view import mapping (07 §11, with one correction)

| Old field | New value |
|---|---|
| `preset` `today`, `yesterday` | `date_preset` of the same name |
| `preset` `this_week` (Monday to today in `reportRange.ts`) | `date_preset = week_to_date` (04 §7.4; 07 §11 says `this_week`, see G-9) |
| `preset` `this_month`, `this_quarter`, `this_year` | `month_to_date`, `quarter_to_date`, `year_to_date` |
| `preset` `custom` + range | `date_preset = custom`, `date_from`, `date_to` |
| `office` = working office or `null` | `office_policy = follow_working_office`; `null` → `assigned_offices` |
| `office` = another id | `office_policy = fixed`, `office_ids = [id]` |
| `provider` | `provider_ids: [id]` or `"all"` |
| `status`, `search`, `extra{}` | mapped where the definition has the parameter, else dropped and named in the notice |
| `reportId` | `object_key` through `LEGACY_REPORT_ID_MAP` |

---

## 7. Quality plan

### 7.1 Type safety with the generated client

| Rule | Check |
|---|---|
| Every API type is generated (`src/api/generated/model/**`); `model/definitionModel.ts` re-exports and narrows them with zod | `tsc -b` uses `tsconfig.json`, which has `noImplicitAny: false` and no project references, so it does not catch implicit `any`. FT-1 adds `tsconfig.reports.json` (extends `tsconfig.json`, `include: ["src/features/reports/**"]`, `noImplicitAny: true`, `strict: true`, `noUncheckedIndexedAccess: true`) run as `npx tsc -p tsconfig.reports.json --noEmit` in `ci.yml`, plus an ESLint override for `src/features/reports/**` with `@typescript-eslint/no-explicit-any: error`; CI drift step |
| Field names are the backend snake_case names end to end; the only allowed form-state exception is `{mode, selection}` of `office_scope` and `scoped_selection`, converted by `paramCodec` | Codec round-trip vectors per type (UX-13); review rule |
| Unknown served enum values (`type`, `kind`, `shape`, `layout`, chart `kind`, `icon_key`, `route_key`, tile `kind`) render a labelled fallback and fail the contract test | UX-04 suite over synced fixtures |
| Read-type POSTs (validate, drill, live rows, metric query, dashboard data) are called as queries through the generated functions, not the generated mutation hooks | `reportKeys` review; lint rule against importing generated `use*Mutation` hooks for these operations |
| Contract names that differ between 02, 04 and 07 are isolated in one file each (`paramModel.ts`, `paramCodec.ts`, `accessModel.ts`, `runModel.ts`) | A rename touches one file; section 9 lists the open ones |

### 7.2 Error and empty states

| State | Rule | Source |
|---|---|---|
| Hub load failed vs. request access | Load failure is checked before the empty-catalog state; never show the request-access text on a failed call | 07 §1.2 |
| Definition 403 / 404 / 409 | `AccessDenied` with `details.required_any_of[]` labels / not-found with search / "Disabled for your organisation" | 07 §4.3 |
| Run failures | One message per `error_code` of 07 §5.8, with `run_id` and `request_id`; the last good result stays below, labelled with its time | UX-09 |
| Empty result | "No records match" plus criteria echo plus relaxations; never an empty table, never while loading | UX-09 |
| Tiles | Per-tile error, timeout, busy with Retry; other tiles unaffected | UX-25, 06 §3.1 |
| Toast duplication | `silent_error` on module queries; `skip_scope_toast` on module calls | UX-03 |
| Blob error bodies | `artifactService` parses Blob errors before the message map | UX-03, UX-10 |

### 7.3 Long runs and token refresh

| Topic | Rule | Item |
|---|---|---|
| Client timeouts | 20 s for catalog, definition, validate, options, status, rows; 65 s for run creation; 30 s for artifact requests and dashboard data; downloads abortable without timeout | UX-03 |
| Lost response | Poll by the client-created `run_id`; 404 means not created | UX-07 |
| Polling | `poll_after_ms`, else 1 s / 2 s / 5 s; 30 s while hidden; stop on terminal states | UX-07, UX-33 |
| Silent refresh | One refresh on 401, single-flight per tab and across tabs (`navigator.locks`), replay of queued requests, today's logout on failure | UX-14 |
| Return after login | `state.from` and `auth:return_to` for `/reports/` paths only | UX-48 |
| Session survives the browser | Background runs are found in the tray and history after a new login | UX-33 |

### 7.4 Accessibility items (WCAG 2.2 AA)

| Item | Phase | Check |
|---|---|---|
| Reports menu with Radix sub-menus, roving focus, Escape | P0 | UX-11 keyboard spec |
| Native tables, `th scope`, labelled scroll region, "Skip table", focused-row retention, paged view | P0 | UX-08 specs; axe `scrollable-region-focusable` |
| Field errors with `aria-describedby` and a linked summary; "Undo clear" without time limit | P0 | FLT-10, UX-07 |
| One polite live region per page; `role="alert"` for failures without moving focus | P0 | UX-09 |
| Filter components by keyboard | P1 | FLT-21 |
| Matrix grid pattern (one tab stop) | P1 | UX-26; OD-5 |
| Chart "Show as table" and generated summary; series differ by more than colour | P1 | UX-24, DASH-11 |
| `document.title` per route; focus to the heading on route change | P3 | UX-40 |
| Keyboard alternative to every drag (columns, favorites order, tiles) | P1, P4 | UX-16, UX-41 |
| Targets at least 32 layout px (24 CSS px at zoom 0.75) | all | visual review in each spike and spec |

### 7.5 The zoom rules (`html{zoom:0.75}`)

| Rule | Where enforced |
|---|---|
| Heights through `calc(var(--vh) * N)` and `--app-nav-height`; never raw `vh`; never `overflow-x: hidden` on `body` | `reports.css` review; UX-15 |
| Measured geometry through `layoutRect()` / `toLayoutPx()`; drag deltas divided by `uiZoom()` | `src/utils/uiZoom.ts`; UX-16 resize test |
| Virtualiser with fixed row heights and `offsetHeight`-based scroll size | UX-02 check 2; UX-08 |
| Radix portals for every overlay; layer tokens `--rpt-z-*` below nav dropdowns and the messaging panel | UX-02 checks 5-6; UX-15 |
| Compact controls by `rpt-` classes inside `@layer base` with global specificity | UX-15 |
| Container queries `@rpt-sm`, `@rpt-md`, `@rpt-lg` instead of viewport breakpoints | UX-15, UX-40 |
| Print sheet resets `--app-zoom` and hides patient-level blocks | UX-15 |

### 7.6 Bundle size and code splitting

| Chunk | Budget | Checked by |
|---|---|---|
| main | +10 KB gzip at most (`ReportsEntry`, nav, tray button, `reportKeys`, catalog service) | FT-3: `scripts/check_bundle_size.mjs` reads the gzip sizes of `dist/assets/*.js` after `npm run build` and fails against `scripts/bundle_budgets.json` (baseline main size recorded at P0 start); runs in the CI build step on every push. `build:analyze` becomes `vite build --mode analyze` (the visualizer is enabled by `mode === 'analyze'` in `vite.config.ts`), because `ANALYZE=true npm run build` fails on Windows shells; the visualizer stays a diagnostic, not the gate |
| `reports` | under 180 KB gzip without charts | FT-3 |
| `table-vendor` | new `manualChunks` rule for TanStack Table and Virtual | `vite.config.ts` |
| `reports-chart`, `reports-dashboards`, `reports-schedules`, `reports-admin`, `reports-builder`, `reports-assistant` | lazy, loaded only by their routes or first use | Playwright network assertion in the P1, P2, P5 specs |
| `reports.css` | one shared CSS chunk for `reports` and `reports-dashboards` | build output |

### 7.7 Performance budgets for large results

| Budget | Target | Basis |
|---|---|---|
| Scroll | 50,000 fixed-height rows scroll to any index at 60 fps on a mid-range laptop; no blank band | 07 §10.2 check 2 |
| Rows memory | At most 50 pages (10,000 rows) per result in the query cache; `gcTime` 5 min; cleared on unmount | 07 §9.3 |
| First page | Rendered from the run response without a second request | 07 §5.2 |
| Direct page fetch | Any scroll position fetches its page directly in natural order (`after = p × size`) | 07 §5.2 |
| Server side | Snapshot page read ≤ 150 ms, `instant` run ≤ 2 s, dashboard data ≤ 3 s live (02 §15.6); the frontend shows nothing under 1 s, a skeleton from 1 s, `RunStatusPanel` from 10 s | 07 §5.9 |
| Preview only | Above 50,000 stored rows the screen shows 1,000 rows with totals and exports complete | 07 §5.2 |
| Dashboards | One data call per dashboard view; matrix without virtualisation up to about 60 × 30 cells | 06 §3.3 |

### 7.8 CI e2e job and test users (FT-2)

| Topic | Rule |
|---|---|
| Triggers | `.github/workflows/ci.yml` runs on `main` and the module branches (`feature/reports-*`), not only `feature/phase_data_migration` |
| e2e job | New job after `verify`: `npx playwright install --with-deps chromium`, `vite preview` on :5173, a mocked storage state (`e2e/.auth/mock.json`) and `e2e/support/reportsRoutes.ts` plus route handlers for auth, offices and shell calls; runs every spec tagged `@mock`. No backend container until the backend publishes an image with the `golden_small` seed (G-31) |
| Live specs | Tagged `@live`; run locally against the UAT backend before each phase exit; their result is attached to the phase exit record |
| Visual baselines | Generated and compared only inside the Linux Playwright container of the e2e job; workstation runs skip `toHaveScreenshot` |
| Test users on UAT | `reports_full_admin`, `reports_view_only`, `reports_provider_restricted`, `reports_no_access`, `reports_shadow_admin`, `reports_share_recipient`; created by the backend team with the rights of 08 for each role; credentials in the local `.env.e2e` only, never committed |
| `global-setup.ts` | Reads the user per spec from `E2E_USER_<ROLE>`; the default `admin` login is not used for report specs |

---

## 8. Frontend risks, mitigations and open decisions

### 8.1 Risks

| # | Risk | Effect | Mitigation |
|---|---|---|---|
| RF-1 | Contract names still differ between 02, 04, 06 and 07 (section 9) | Rework of controls and codec | Each difference isolated in one file (7.1); contract fixtures from the backend fail the build on drift; decide G-1..G-8 before FLT-10 starts |
| RF-2 | The P0 critical path waits for C2: UX-03 depends on ENG-12 and ENG-13, and FLT-10 on UX-03 (G-26); FLT-13 also waits for FLT-06 (backend, L) | P0 about 19 weeks instead of the backend's 17 | G-26 decided before P0 wave 2; waves 0-1 carry all work without a C2 dependency; FLT-13 starts on fixtures with route mocks |
| RF-3 | P3 holds 180 engineer-days and depends on other features' handlers (SMS, letters, claims, Scheduler) | Overrun; worklists with fewer actions | Two waves (P3 section); an action appears only when its handler is registered (06 risk 4); 06 C-1 and C-5 decisions taken before P2 ends |
| RF-4 | Two code paths while some clients have the engine `off` | Double maintenance, regressions in the old pages | Old code frozen; `engine_states.spec.ts` keeps the `off` path green; deletion criterion in 6.1 |
| RF-5 | UX-14 changes token handling for the whole application | Forced logouts or replay bugs outside reports | Separate change with its own review; two-tab spec; fall back to today's logout on any refresh failure |
| RF-6 | The 0.75 zoom with new libraries (virtualiser, popovers, day picker, grid library) | Misplaced overlays, blank bands | Spike S-1 before pinning (P0), grid spike before DASH-44 (P4); fallbacks of 07 §10.2 |
| RF-7 | `GlobalNav` now depends on the catalog and hosts the tray | A reports failure on every page | Idle fetch, static skeleton, small error boundaries in the main chunk (UX-11, UX-33) |
| RF-8 | Statements in P1 must fit the inline budget (02 §18.2-1) | Large statement batches fail until P2 background runs | `report_too_large_for_inline` message; roadmap decision on the statements sequencing |
| RF-9 | Route mocks drift from the deployed backend | Green specs against a stale contract | Mocks serve only synced backend fixtures; a spec switches to live data once its endpoint is deployed (3.3) |
| RF-10 | Shared DASH content items are sized once but split across two plans | Unclear ownership | Split agreed per item at sprint planning; the frontend share is the generic-frame verification named in each exit criterion |
| RF-11 | Owning-feature screens (capitation, letters templates, correspondence workspace, forms) land in this programme without a UX blueprint section | Inconsistent UX, scope creep | Each screen follows its feature folder's conventions; product owner review at the start of the epic (G-15, G-16) |
| RF-12 | The frontend waits on backend definitions: P1-P3 are 35, 41 and 56 backend weeks against 24, 33 and 28 frontend weeks at the 1.4 staffing | Idle engineers, or frontend work that runs ahead on fixtures and is reworked | Staffing curve of 1.4; FV tasks and generic-frame verification as each family lands; a family's frontend work starts only when its definitions are on UAT |
| RF-13 | SEC-43 ships before a client's engine is `on` | The six old reports, `useMetrics` and `useMyDay` answer 403 for users without a listed right | P1 entry criterion; FT-4 inventory; X1-11 |
| RF-14 | Playwright gates without a backend in CI | Live specs run only on workstations against a shared UAT database | FT-2 mock job in CI; named test users; live results attached to each phase exit; backend image with `golden_small` requested (G-31) |
| RF-15 | Engine switched on for a client whose ledger is not reconciled | Financial reports with wrong totals from day one | X0-10 gate per client database |

### 8.2 Open decisions that block frontend work

| Decision | Default used | Needed by phase |
|---|---|---|
| OD-2 TanStack Table v9 or v8.21.3 | v9 if spike S-1 passes | P0 (before UX-08) |
| G-26 Split UX-03 (or narrow FLT-10's dependency) | Not split: UX-03 whole at C2 | P0 (before wave 2) |
| G-29 Split UX-12 and give the deletion a phase | Deletion as open action, checked from P2 | P0 exit |
| OD-3 Silent token refresh inside this module's P0 | Yes (UX-14) | P0 |
| Final token and type names: `working_office` vs `current_office`, 17 vs 18 types, `account_id` vs `responsible_party_id` (G-1..G-3) | 04 names (04 states they are final) | P0 (before FLT-10) |
| Mock layer for frontend work ahead of the backend (FA-4, G-14) | Playwright route fixtures and vitest fakes, no new library | P0 |
| OD-1 Default frame for users who have not chosen | Classic until a category's parity sign-off | P1 |
| OD-5 Matrix keyboard model (grid pattern vs one button per cell) | Grid pattern | P1 |
| OD-8 Home of UI preferences (preferences blob vs engine endpoint) | Preferences blob with read-merge-write | P1 |
| OD-11 Registry-based unsaved-changes guard vs data router | Registry guard (UX-49) | P1 |
| OD-6 Default views may replace legacy defaults on open | Yes, visibly | P1 |
| OD-7 Reports tray as the only notification reader | Reports tray | P2 |
| 06 C-1 / C-5 Huddle v1 and a minimal worklist slice in P2 | Not moved (register phases kept) | P2 planning |
| OD-10 Mobile scope | Worklists and dashboards, huddle first | P3 |
| OD-9 Keep the legacy-named menu permanently | Keep | P3 |

---

## 9. Gaps found in the design

| # | Gap or contradiction | Where | Effect on the frontend | Proposed resolution (not applied here) |
|---|---|---|---|---|
| G-1 | Office token: 04 header table makes `working_office` final and renames 07's `current_office`; 07 §4.7, §5.10, §8.1 (`OfficeScopeParam` value) and §13.5 still use `current_office` | 04 §0, 07 | `paramCodec`, `OfficeScopeParam`, saved views | 07 adopts `working_office` |
| G-2 | Type count: 04 has 17 types with `ActionParam` rendering a definition action; 07 §4.5 and its header count 18 with `action` as a type | 04 §2.1, 07 §4.5 | `paramModel` type map | 07 follows 04 |
| G-3 | Account parameter: 04 uses `account_id`, tokens `current_account`, source `accounts`; 07 §4.5 fallback list and A-1 use `responsible_party_id`, `current_responsible_party*` | 04 §0, 07 §4.5, §13.4 | Enhanced bar fallback list, patient context | 07 follows 04 |
| G-4 | `ProviderParam`: 04 §13.4 builds it on `useProviderDirectory`; 07 §8.1 forbids that (one office id only) and uses the options endpoint | 04 §13.4, 07 §8.1 | FLT-13 design | 04 follows 07 |
| G-5 | `EntityPickerDialog`: 04 §13.4 builds it on `DualListPicker` and on `lookupService.ts` / `procedureCodeService.ts` until the options route exists; 07 §8.1 makes it a NEW server-paged virtualised listbox using only the options endpoint; FLT-13 size (L) may be low (07 §13.5) | 04 §13.4, 07 §8.1 | FLT-13 size and order | Re-size FLT-13 after the first sprint; keep 07's design |
| G-6 | `ParamForm` scope: 04 §13.4 says it renders the two-column layout, More options and Clear Criteria; 07 §8.1 / §13.5 assign those to UX-06 / UX-07 | 04 §13.4, 07 §13.5 | Double work between FLT-10 and UX-06 / UX-07 | 04 drops the wording (07 already asks) |
| G-7 | Date input: 04 §13.4 makes the typed box a text input in both frames (for `MM/DD/YYYY` and tokens); 07 §8.1 / §10.1 keep native `<input type="date">` as the baseline | 04 §13.4, 07 §10.1 | FLT-12 | Decide before FLT-12; 04's reasoning covers tokens |
| G-8 | KpiCard event prop `on_drill` (06 §3.2) versus `onDrill` (07); matrix cells as buttons (06 §3.3) versus grid pattern (07 OD-5) | 06, 07 | DASH-02, DASH-03, UX-26 | 06 follows 07 naming; OD-5 decides the matrix |
| G-9 | Saved-view import maps old `this_week` to `this_week`, but the old preset is Monday-to-today (`reportRange.ts` L58-59) and 04 §7.4 defines `this_week` as the whole week; the right target is `week_to_date` | 07 §11, 04 §7.4 | UX-19 import | Use `week_to_date` (section 6.2) |
| G-10 | DASH-53 (P1) and DASH-55 (P2) are worklists, but 07 routes every `kind = worklist` definition to the worklist page (row 9), which ships in P3 with UX-38 and live paging (ENG-48, P3) | 06 §11, 07 §2.1, §4.10 | Where these two render in P1 and P2 | Default applied in this plan: served as `kind = standard` lists in the runner until P3 (X1-10, X2-10), switched to `kind = worklist` once UX-38 ships (X3-7); the design should state it |
| G-11 | Phase inversions touching frontend surfaces: RPT-MGMT-11 (P2) depends on UX-39 and ENG-49 (P3); RPT-INS-07 and RPT-INS-77 (P2) depend on DASH-28 (P3); RPT-MY-15 (P1) offers a bulk task before ENG-49 / UX-39 (P3); RPT-DAILY-77 (P2) needs ENG-49 and SEC-36 (P3); RPT-MGMT-13 (P2) needs ENG-49 (P3); RPT-MONTHLY-14 (P2) depends on FLT-26 (P4, this plan) for its comparison columns | register, `plan_inputs/facts.md` | Bulk hand-offs and comparison columns promised before their UI | This plan builds: the held bulk parts of RPT-MGMT-11, RPT-MY-15, RPT-DAILY-77 and RPT-MGMT-13 in P3 wave 3b (X3-12); FLT-26 and the compare part of RPT-MONTHLY-14 in P4, its P2 part without comparison columns. Alternative for the roadmap: pull UX-39 (S) and ENG-49 into P2, or the compare props of `DateRangeParam` into P2 |
| G-12 | P0 redirects of `/reports/interactive/*` target `/reports/worklists`, which exists only from P3; `/reports/office/*` targets `/reports/c/custom`, empty before P5 | 07 §2.2 | Redirects to not-found or empty pages for two phases | Default applied in this plan: redirect to the hub search with an explanatory notice until the targets exist (P0 routes, X0-1), switched in P3 (X3-2) and P5 (X5-6); 07 §2.2 should adopt it |
| G-13 | `SummaryCards` (UX-09, P0) reuses `KpiCard`, which DASH-02 builds in P1 | 07 §8.3 | P0 summary cards | Use `KpiStat` in P0, swap in P1 (planned so) |
| G-14 | No design for a frontend mock layer: 07 §9.10 says e2e needs the backend and no API mocking exists, yet the phases need frontend work ahead of endpoints | 07 §9.10 | Contract-first work | Plan uses Playwright route fixtures and vitest fakes (3.3); confirm |
| G-15 | Owning-feature screens built in this programme have no UX section and no UX item: capitation payment entry (RPT-INS-44), letter and postcard template authoring (RPT-MENU-05), correspondence workspace (RPT-MENU-09), collection letter setup (RPT-MENU-10), advanced templates (RPT-MENU-11), blank forms (RPT-MENU-12) | catalogs, 07 | Unclear routes and owners; PD-15 says these stay with owning features | Product owner confirms scope; the owning feature specifies routes |
| G-16 | 03 asks the frontend plan for frontend pickers that read `transaction_codes` and a Scheduler cancel dialog that sends reason, note and call-list flag; no UX item exists (DATA-03 and DATA-17 acceptance imply them) | `plan_inputs/needs_from_other_docs.md`, DATA-03, DATA-17 | Unplanned changes in `transactionCodes.ts` and the Scheduler cancel dialog | Add frontend items next to DATA-03 (P0) and DATA-17 (P1) |
| G-17 | The lab patient tab link "Open office-wide report" and the replacement of the client cost PDF (`labReportPrint.ts`) by `getLabCostReport` (07 §11) have no work item | 07 §11 | Unplanned | Add to RPT-APPT-60's frontend share or a new UX item in P3 |
| G-18 | `route_key`s requested of 07 §5.5 by the catalogs (`time_clock_entry`, `patient_payment_plans`, `patient_edit`, `patient_transactions`, setup screens) are not in 07's `recordRoutes.ts` table | catalogs, 07 §5.5 | Unknown `route_key` fails the contract test | 07 extends the table; plan schedules them with their items (F3.9) |
| G-19 | UX-30 (P1) runs `management.time_clock_report` in the runner, but its definition RPT-MGMT-17 is P2; the "Open in Reports" link is P1 in 07 §1.7 but part of RPT-MGMT-18 (P2) | 07 §1.7, §11, register | P1 exit X1-8 | P1 uses `my_reports.time_clock_report` (RPT-MY-12); management variant and link in P2 |
| G-20 | DASH-08 (P1) acceptance names `src/components/reports/lib/reportMetrics.ts`, a file of the old home that UX-12 retires; 07 §11 says the hub shows no KPI tiles between P0 and P1 | 06 §11, 07 §11 | Re-pointing code that is being deleted | Re-point only the `off` fallback copy, or drop the file from DASH-08 |
| G-21 | DASH-36 (P3) says the two interactive placeholder routes open the worklists, but UX-11 (P0) already deletes those routes and redirects them | 06, 07 | Overlap | DASH-36 keeps only the redirect target change |
| G-22 | Dependencies that are not work items: UX-14 depends on OD-3; UX-28, UX-40 and FLT-20 depend on "RPT" without ids | register | Entry criteria cannot be checked mechanically | Replace by the family registration items (RPT-DAILY-01, RPT-STMT-15, …) |
| G-23 | `module_access`, `rights_mode` and the tray switches (07 A-9) are not in the 02 API table; the nav, tray and observation banner depend on them | 07 §13.4, 02 §13 | Menu entries shown to everyone until served | Add to row 1 of 02 §13 before UX-11 closes |
| G-24 | 07 C-1: saved-view chips of the six migrated reports disappear between P0 and P1 because ENG-28 is P1 | 07 §13.3 | Visible regression for clients that switch the engine on in P0 | Accept (views are wiped at logout today) or enable the engine for a client only after P1 |
| G-25 | 06 C-1 (Huddle v1 in P2) and C-5 (minimal worklist slice in P2) would need UX-38 and DASH-30 in P2; the register keeps them in P3 | 06 §12.3 | P2 scope if accepted | Roadmap decision; this plan keeps register phases |
| G-26 | UX-03 depends on ENG-12 and ENG-13, and FLT-10 depends on all of UX-03, so the parameter form waits for the run engine although it needs only the catalog, definition and validate services | register | P0 critical path C2 + 32 days, about 19 weeks against the backend's 17 (1.4) | Split UX-03 into catalog / definition / validate services (deps ENG-05, ENG-19) and run / rows services (ENG-12, ENG-13), or narrow FLT-10's dependency to the first part; this plan keeps UX-03 whole, unblocked at C2 |
| G-27 | No item fixes the operation ids of the engine routes; ENG-01 sets tags only, and the generated names in the shared `endpoints/reports/reports.ts` depend on them | 02 §13, ENG-01 | Generated function names may change at each Cx | Make stable `operation_id`s (names of 3.3) part of ENG-01's acceptance |
| G-28 | SEC-13 ("Frontend gating from the server access object") is a backend item whose acceptance is entirely frontend and repeats UX-45 and X0-7; `10_backend_plan.md` puts it in E0.08 | register, 08 | Ambiguous owner; not counted as a frontend entry blocker here | Restate SEC-13 as the served access object (`access`, `module_access`, `rights_mode` on #1 and #2); UX-45 keeps the UI acceptance |
| G-29 | UX-12 (P0) includes retiring the old runner, home and saved-view store, but its acceptance needs the last client on the engine, and the saved-view store must survive until UX-19's import (P1) | register UX-12, 07 §11 | UX-12 cannot close in P0 | Split UX-12 into "six reports on the runner" (P0) and "retire the old code" (from P2, trigger of 6.1); this plan closes UX-12 at X0-11 and tracks the deletion as an open action (X2-13) |
| G-30 | UX-41's title puts the grid library spike before DASH-44 ("for DASH-44"), but UX-41 depends on DASH-44 in the register | register | P4 order | Split the spike out of UX-41 (S, before DASH-44) or reverse the dependency; this plan runs the spike as the first step of F4.1 |
| G-31 | Frontend work without a register item: FT-1 module type gate (S, P0), FT-2 CI e2e job, triggers and test users (M, P0), FT-3 bundle check (S, P0), FT-4 SEC-43 caller inventory (S, P1), FV-<family> verification (16 × S, P1-P3). UX-13's acceptance stops at "passes locally"; UX-40 claims "Playwright spec per family" at size M; no item publishes a backend image with the `golden_small` seed for frontend CI | register UX-13, UX-40; `.github/workflows/ci.yml`; 07 §9.10 | 43 engineer-days outside the register (1.4) | Adopt the tasks as UX items; narrow UX-40 to the accessibility and responsive pass; add a backend item for a seeded test image |
| G-32 | The two plans count frontend scope differently: `10_backend_plan.md` §1.2 lists 70 frontend-only items; this plan schedules 142 register items (70 frontend-only, 72 shared) | 10 §1.2, 1.4 | Two totals for one scope | 1.4 is the reconciled table (same weeks formula); 10 §1.2 should quote it |
| G-33 | SEC-43 (P1) closes the cross-patient lists that the six client-executed reports read, while FA-5 keeps those reports for engine-off clients; D-29 orders SEC-43 after ENG-20 but not after the engine is `on` per client | 08 D-29, register SEC-43 | Engine-off fallback breaks | Per-client rule: SEC-43 on only after the engine is `on` or the users hold an accepted right (P1 entry criteria) |
| G-34 | 02 §13 row 14 (`POST /reports/runs/{run_id}/actions/{action_key}`) is delivered by ENG-49 (P3), but Statements need it in P1; `10_backend_plan.md` delivers a statements-only row 14 through ENG-61, which ENG-61's register title and acceptance do not state (`plan_inputs/needs_from_other_docs.md` asks to confirm) | 02 §13, register ENG-61, ENG-49 | P1 Statements actions | Add the statements-only row 14 to ENG-61's acceptance; this plan syncs it at C4 |

---

## 10. Appendix: frontend work items per phase and track

Shared items are marked (s). RPT items listed are those with bespoke frontend work (section 1.3); every other RPT item
reaches the user through the generic runner and is planned in `10_backend_plan.md`.

### P0

| Track | Items |
|---|---|
| T1 Hub, routing, nav | UX-01, UX-05, UX-11, UX-45 |
| T2 Criteria | FLT-04 (s), FLT-05 (s), FLT-10, FLT-11, FLT-12, FLT-13, FLT-14, FLT-15, UX-06, UX-07 |
| T3 Results | UX-08, UX-09 |
| T4 Export, views, schedules | UX-10 |
| T8 Migration | UX-12 |
| T9 Quality | UX-02, UX-03, UX-04, UX-13, UX-14, UX-15; plan tasks FT-1, FT-2, FT-3 |
| Backend items the frontend waits on | ENG-01, ENG-03, ENG-04, ENG-05, ENG-07, ENG-10, ENG-11, ENG-12, ENG-13, ENG-15, ENG-19, ENG-20, ENG-57, FLT-01, FLT-02, FLT-03, FLT-06, FLT-07, SEC-04, SEC-12 |
| Backend items that gate the engine switch-on per client (X0-10) | DATA-05..DATA-10, DATA-57, SEC-05, SEC-10, SEC-11 |

### P1

| Track | Items |
|---|---|
| T1 Hub, routing, nav | UX-20, UX-27, UX-31, UX-48, UX-49, RPT-MENU-02, RPT-MY-03 |
| T2 Criteria | FLT-16 (s), FLT-19, FLT-28 (s), UX-28, UX-29, UX-32, RPT-STMT-01, RPT-LEDGER-03 |
| T3 Results | UX-16, UX-17, UX-22, UX-23, UX-24, UX-26, RPT-NEW-83 (s, route keys), RPT-MY-15 (s, row action; bulk part in P3) |
| T4 Export, views, schedules | UX-18, UX-19, UX-21 |
| T5 Dashboards | UX-25, DASH-02, DASH-03, DASH-04 (s), DASH-05 (s), DASH-06, DASH-07, DASH-10 (s) |
| T6 Worklists | DASH-53 (s) |
| T8 Migration | UX-30, DASH-08, RPT-DAILY-51, RPT-DAILY-76; plan task FT-4 |
| T9 Quality | FLT-21; plan tasks FV-daily, FV-ledger, FV-my_reports, FV-statements |
| Backend items the frontend waits on | ENG-22, ENG-23, ENG-24, ENG-25, ENG-26, ENG-27, ENG-28, ENG-29, ENG-30, ENG-31, ENG-32, ENG-33, ENG-34, ENG-35, ENG-61, FLT-17, FLT-18, FLT-20, SEC-06, SEC-16, SEC-17, SEC-18, SEC-19, DASH-01, DASH-09, MET-05, MET-06, MET-07, MET-08, RPT-DAILY-01, RPT-DAILY-47, RPT-MY-12, RPT-MY-14, RPT-STMT-15, RPT-STMT-18, RPT-NEW-78, DATA-21; SEC-43 (switch-on order, FA-5) |

### P2

| Track | Items |
|---|---|
| T1 Hub, routing, nav | UX-33 (tray), UX-36 |
| T2 Criteria | FLT-24 (s), RPT-MGMT-15 |
| T3 Results | RPT-MGMT-11 (s, held to P3 wave 3b) |
| T4 Export, views, schedules | UX-34, UX-35, UX-46, DASH-17 (s) |
| T5 Dashboards | DASH-11, DASH-12 (s), DASH-13 (s), DASH-14 (s), DASH-15 (s), DASH-16 (s), DASH-52 (s) |
| T6 Worklists | DASH-55 (s) |
| T8 Migration and owning features | UX-37, RPT-MGMT-02, RPT-MGMT-18, RPT-LEDGER-14, RPT-INS-44, RPT-MENU-05, RPT-MENU-12 |
| T9 Quality | plan tasks FV-monthly, FV-management, FV-insurance |
| Backend items the frontend waits on | ENG-36, ENG-38, ENG-39, ENG-40, ENG-42, ENG-43, ENG-44, ENG-45, ENG-47, ENG-56 (P0), ENG-63, SEC-15 (P1), SEC-25, SEC-32, MET-10, MET-11, MET-12, MET-26, RPT-MGMT-01, RPT-MGMT-10, RPT-MGMT-14, RPT-MGMT-17, RPT-LEDGER-13, RPT-MENU-03 (P1), RPT-MENU-04 |

### P3

| Track | Items |
|---|---|
| T2 Criteria | FLT-25 (s) |
| T3 Results | UX-39, RPT-RECALL-15, RPT-APPT-16, RPT-APPT-18, RPT-PRLIST-07, RPT-SLIST-07, RPT-STLIST-08 |
| T5 Dashboards | UX-42, DASH-19, DASH-20, DASH-21, DASH-22, DASH-23 (s), DASH-24 (s), DASH-25 (s), DASH-26 (s), DASH-27 (s), DASH-54 |
| T6 Worklists | UX-38, DASH-30, DASH-31 (s), DASH-32 (s), DASH-33 (s), DASH-34 (s), DASH-35 (s), DASH-36 (s) |
| T8 Migration and owning features | RPT-APPT-52, RPT-MENU-09, RPT-MENU-10, RPT-MENU-13, RPT-INS-16, RPT-TX-12 |
| T9 Quality | UX-40; plan tasks FV-appointment, FV-treatment_plan, FV-referral, FV-recall, FV-ortho, FV-lists_patient, FV-lists_provider, FV-lists_security, FV-lists_setup |
| Backend items the frontend waits on | ENG-48, ENG-49, SEC-36, SEC-30 (P2), DASH-18, DASH-28, DASH-29, MET-13, MET-14, MET-15, MET-16, MET-17, MET-18, MET-19, FLT-09, RPT-APPT-07, RPT-APPT-15, RPT-APPT-17, RPT-APPT-60, RPT-INS-15, RPT-TX-10, RPT-MENU-06, RPT-MENU-07, RPT-MENU-08 |

### P4

| Track | Items |
|---|---|
| T2 Criteria | FLT-26 (s) |
| T4 Export, views, schedules | UX-47 |
| T5 Dashboards | UX-41, DASH-37, DASH-38 (s), DASH-39 (s), DASH-40, DASH-41 (s), DASH-42 (s), DASH-43 (s), DASH-44, DASH-45 (s) |
| T8 Owning features | RPT-MENU-11 |
| Backend items the frontend waits on | ENG-50, ENG-51, ENG-52, MET-21, MET-22, MET-23, MET-27, SEC-38, SEC-39, RPT-NEW-50, RPT-NEW-75 |

### P5

| Track | Items |
|---|---|
| T7 Builder and assistant | UX-43, UX-44, DASH-47 (s), DASH-48 (s), DASH-49, DASH-51 (s), RPT-MENU-15 |
| Backend items the frontend waits on | ENG-53, ENG-54, ENG-55, DASH-46, DASH-50, MET-24, MET-25, SEC-40, SEC-41 |
