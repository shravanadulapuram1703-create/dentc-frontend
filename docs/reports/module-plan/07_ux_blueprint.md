# 07 — UX blueprint and frontend structure

Design document for the user interface of the Reports & Analytics module: hub, routes, navigation, the generic
runner, results, export, schedules, saved views, dashboards frame, component inventory, frontend structure and
libraries. Written against `00_design_brief.md` (AD-1..AD-12, PD-1..PD-15, phases P0..P5).

| Owns | Does not define (owner) |
|---|---|
| Hub information architecture, routes, GlobalNav changes, page types, runner behaviour per cost class, polling cadence, results UI, export / print / schedule / saved-view / share UX, dashboard and worklist page frames, builder and assistant UI frames, content of the saved-view `layout` blob, icon map, record-route map, `src/features/reports/` structure, React Query keys, library choices, UX work items | API shapes, read models, run states, error codes (`02_architecture.md`) · datasets (`03_data_foundation.md`) · parameter types, value keys, tokens, presets, dependency fields, the parameter components themselves (`04_filter_framework.md`, FLT-10..15, FLT-19, FLT-21) · metric fields (`05_metric_catalog.md`) · dashboard, worklist and assistant content (`06_dashboards.md`) · right codes, data classes, purpose-prompt rules (`08_security_compliance.md`) · per-report parameters and columns (`catalog/<category>.md`) |

**Evidence tags.** **[V]** read in the frontend code while writing (path given, relative to `dentc-frontend/`).
**[A]** analysis document. **[R]** research document. **[02 §n]**, **[04 §n]**, **[05 §n]**, **[06 §n]**, **[08 §n]** =
taken unchanged from that design document. **[I]** design judgement of this document. **NEW** = does not exist today.

**Contract baseline.** The sibling documents were revised on 2026-11-22 while this one was written. Names below follow
04 as of 14:10 (flat `params`, `value_keys`, 18 types, `EnumMultiParam`), 02 as of 14:47 (2,407 lines: print stream,
`working_office_id` in request bodies, runs with side effects, artifact rendering outside the run request), 08 as of
14:51 (1,212 lines: right codes, frontend gating, export controls, sharing rules) and 06 as of 15:12 (1,505 lines:
dashboard and worklist keys, tile kinds, tile components, twin reports, goals, alerts, assistant). "#n" is the row
number of the API table in 02 §13. §13.5 lists the points where these documents still differ. `05_metric_catalog.md`
was read for the metric fields and its work items. `catalog/*` did not exist; what this document assumes from other
documents is in §13.4.

**Naming.** Every data field, prop that carries API data, option-bag key, query-key segment, URL key and storage key
is snake_case and equals the backend name (AD-12). React components are PascalCase, hooks `useX`, event props `onX`,
`className` stays; file names follow the existing pattern (`reportModel.ts`, `ReportRunnerPage.tsx`). Function names
follow the code base majority (camelCase; 673 of 726 exported functions under `src/features/**` [V]).

---

## 1. Information architecture

### 1.1 Rules

| # | Rule | Source |
|---|---|---|
| IA-1 | One hub at `/reports`. Every report is reachable three ways: search, category, personal lists | [R] `analytics_ux_patterns.md` §2.2 H2-H4 |
| IA-2 | The hub is data: `GET /reports/catalog` drives cards, search, navigation and category pages. No report is hard-coded in the frontend | AD-2; [02 §13 #1] |
| IA-3 | Hub taxonomy is the "New home in the hub" column of brief §1: seven groups plus My Reports, Worklists and Custom | brief §1 |
| IA-4 | Legacy names never disappear: each of the 26 legacy menu entries has a place (§1.6); each legacy report name and each older name is a search alias (`legacy_names[]`) | AD-8 |
| IA-5 | A report the caller may not run is absent from every list (the server filters the catalog by report right). The frontend never decides rights: it reads the served `access` object and evaluates no right code for report access | AD-7; [02 §3.1]; [08 §3.4] |
| IA-6 | "My Reports" keeps its legacy meaning (category `my_reports`: five reports restricted to the caller's Corresponding Provider, PD-11). Personal collections are called Library (Favorites, Recents, Saved views, Shared with me) | [R] `denticon_analytics_and_dso.md` §5 |
| IA-7 | Standard, Custom and Worklist are always labelled (`kind`). `status = beta` and `deprecated` are labelled | [02 §3.1]; [R] `analytics_ux_patterns.md` H5 |
| IA-8 | Reports are run explicitly; dashboards apply filters live; worklists page live rows (§1.4) | [R] same §3.1; [02 §4.9] |
| IA-9 | Letters, postcards, labels and forms stay with their owning features; the hub links to them and report results feed them through bulk actions | PD-15; [02 §3.10] |

### 1.2 Hub areas

Layout: left rail (areas) + main column. The rail collapses to icons below `@rpt-lg` and to a tab strip below
`@rpt-md` (container sizes of §9.8).

| Area | Route | Content | Data (row of 02 §13) | Phase |
|---|---|---|---|---|
| Search | `/reports?q=` and the command palette | Report names, legacy aliases, descriptions, keywords; dashboards; metrics; my saved views (§1.5) | #1, #58, #54, #24 | P0 reports; P1 the rest |
| Start strip | `/reports` | Favorites in the user's order; "Continue" = recents with their last run; role defaults: the caller's landing dashboard and the pinned dashboards and worklists of the caller's persona [06 §10] | #32, #36, #58 | P1; pinned worklists P3 |
| Categories | `/reports` | One tile per hub group with its sub-groups and report counts; opens the category page | #1 | P0 |
| Category page | `/reports/c/:category` | The legacy screen of that category: SELECT REPORT list + REPORT CRITERIA (§4.2) | #1, #2 | P0 for the six migrated reports; then with each category |
| My Reports | `/reports/c/my_reports` | Five provider-restricted reports | #1 | P1 |
| Library | `/reports/library/:tab` | `favorites`, `recents`, `views`, `shared`, `custom` | #24, #32, #36, #47 | P1; `shared` P2; `custom` P5 |
| Dashboards | `/reports/dashboards`, `/reports/dashboards/:dashboard_key` | The 16 dashboards of 06 §2.0.6 (keys `dashboards.<name>`): KPI, matrix, chart, scorecard and list tiles (§7) | #58-#61 | P1 (Main, Provider, My); the others per 06 |
| Worklists | `/reports/worklists`, `/reports/worklists/:report_key` | Definitions with `kind = worklist` (keys `worklists.<name>`; 15 in 06 §6, My follow-ups included) | #1, #21, #14 | P3 |
| Schedules | `/reports/schedules` | Tabs `mine`, `delivered`, `all`; kinds: report schedules, dashboard digests, metric alerts [06 §7] | #37-#46 | P2; alerts P4 |
| Runs | `/reports/runs`, `/reports/runs/:run_id` | Run history; one stored result | #6-#8 | snapshot page P1; history P2 |
| Builder | `/reports/builder`, `/reports/builder/:custom_definition_id` | Tenant custom reports (§1.8) | #47-#54 | P5 |
| Goals, Glossary | `/reports/goals`, `/reports/glossary` | Production goals, targets and bands, history (content 06 §4.2); metric definitions | #62; #54, #55 | P3 (targets P4); P1 |
| Administration | `/reports/admin/:tab` | Tenant settings, all runs, all schedules, usage, metric settings (§1.9) | #22, #23, #6, #37 | P2 |
| Correspondence and forms | `/reports/correspondence` | The eight legacy correspondence and form entries with their owning feature and state | static table `externalLinks.ts` | P0 |

Hub states:

| State | When | Shows |
|---|---|---|
| Load failed | The catalog call failed (network, 5xx, timeout; checked before the request-access state, because the call is `silent_error`) | "Reports could not be loaded." + Retry; the correspondence links stay. Never the request-access text |
| Request access | The catalog (#1) and the dashboard catalog (#58) both answered successfully and are both empty for the caller | "You do not have access to any report yet. Ask an administrator of your organisation to add you to a group with report rights." Never an empty grid [08 §3.4]. The correspondence links stay |
| Observation mode | Rights are evaluated but not enforced for this client (`REPORT_RIGHTS_ENFORCED = false`, `REPORT_RIGHTS_SHADOW = true` [08 §3.5]) and the caller may administer reporting | Banner on the hub and on `/reports/admin`: "Report access rules are being observed, not yet enforced, for this organisation." with a link to the readiness report `management.report_access_readiness` [08 §3.5 step 4]. The mode must be readable by the browser (§13.4 A-9) |
| Engine off or misconfigured | §2.3 | The old pages, or "Reports are not available" |

### 1.3 Taxonomy

| Hub group | Sub-group | `category` (`subcategory`) | Legacy screen title | Legacy reports | Parity phase |
|---|---|---|---|---|---|
| Financial | Daily | `daily` | Daily Reports | 12 | P1 |
| Financial | Month-end | `monthly` | Monthly Reports | 9 | P2 |
| Financial | Ledger | `ledger` | Ledger Reports | 4 | P1 |
| Financial | Statements | `statements` | Statements | 1 screen | P1 |
| Management | — | `management` | Management Reports | 4 | P2 |
| Insurance | — | `insurance` | Insurance Reports | 13 | P2 |
| Scheduling | — | `appointment` | Appointment Reports | 9 | P3 |
| Clinical | Treatment plans | `treatment_plan` | Treatment Plan Reports | 4 | P3 |
| Clinical | Recall | `recall` | Recall Reports | 4 | P3 |
| Clinical | Ortho | `ortho` | Ortho Reports | 5 | P3 |
| Patients | Referrals | `referral` | Referral Reports | 8 | P3 |
| Lists | Patient, Provider, Security, Setup | `lists` (`patient`, `provider`, `security`, `setup`) | Patient/Resp. Party List Reports, Provider List Reports, Security List Reports, Setup List Reports | 12 + 4 + 4 + 20 | P3 |
| My Reports | — | `my_reports` | My Reports | 5 | P1 |
| Worklists | — | `worklists` | Interactive Reports | 2 documented + 13 new (06 §6) | P3 |
| Custom | — | `custom` | Office Reports | tenant-defined | P5 |

Total legacy reports: 118. Group labels, sub-group labels, icons and order live in `catalogModel.ts` (`HUB_GROUPS`),
keyed by `category`; a category key the frontend does not know is listed under "Other" and fails the contract test.
Order inside a category: legacy reports in legacy order (numeric suffix of `legacy.report_id`, e.g.
`daily_reports.r03` → 3 [V `legacy/index/daily_reports.controls.json`]), then non-legacy definitions by title.

### 1.4 Page types

| Page type | Interaction model | Reads | Writes |
|---|---|---|---|
| Hub home | Browse and search; no data query beyond the catalog | catalog, favorites, recents | favorites |
| Category page (classic frame) | Pick a report from the legacy list, set criteria, PRINT / PREVIEW | catalog, one definition, validate, options | runs, saved views |
| Runner (enhanced frame) | Set criteria, Run, read, drill, act, export, save, schedule | definition, validate, options, run, rows | runs, artifacts, saved views, schedules |
| Run snapshot | Read-only stored result of one `run_id`; "Open live report" re-opens the runner with the run's `params_input` | run, rows | artifacts |
| Dashboard | Live apply of a small filter bar; every tile drills | dashboard definition, dashboard data | layout |
| Worklist | Live keyset pages (`paging_mode = live`), row and bulk actions, rows leave the list when resolved | live rows | actions |
| Schedules | List and detail panel | schedules, schedule runs, deliveries | schedules |
| Library | Tabs of personal objects | saved views, favorites, recents, custom definitions | same |
| Builder | Stepwise spec editing with a 10-row preview | analytics metadata, custom definitions, preview | custom definitions |
| Administration | Tables and forms | settings, stats, runs and schedules with `scope = all` | settings |

### 1.5 Search

| Topic | Rule |
|---|---|
| Index | Built in the browser from the cached catalog (`title`, `legacy_names[]`, `description`, `keywords[]`, `report_key`, hub group and sub-group labels), from `GET /analytics/dashboards` (title), from `GET /analytics/metadata` (metric `label`, `aliases[]` [05 §1.2]) and from my saved views (`name`, `description`). No search endpoint is needed: a tenant has a few hundred entries |
| Normalisation | Lower case; `/`, `-`, `(`, `)` and repeated spaces become one space; every query token must match (AND) |
| Ranking | exact title > title prefix > exact legacy alias > alias or title word > keyword > description word. Favorites and recents get a fixed boost. Ties by title |
| Result row | Icon, title, "Financial › Daily", kind badge, the matched alias ("Legacy name: Production by Codes - Provider"), my last run time. Enter opens the report in the user's preferred frame (§4.9) |
| Groups | Reports, Worklists, Dashboards, Metrics (open the glossary entry), Saved views |
| Entry points | Search box of the hub (`/reports?q=aging` is shareable); nav entry "Search Report"; command palette (`cmdk` is installed and unused [V `package.json`]) opened with Ctrl+K while a `/reports/*` page has focus (global shortcut: open decision OD-4) |
| Empty result | "No report matches" + the three nearest entries by token overlap + link to the full catalog. From P1: when nothing permitted matches, one catalog call with `include_unavailable=true` lists reports that exist but are refused to the caller (title and category only, `access.can_run = false` [08 §3.3]) under "Not available with your access — ask your administrator" |

### 1.6 The 26 legacy Reports-menu entries and their new place

Legacy order and labels: [A] `analysis/reference_screenshots.md` §1.2.

| # | Legacy entry | New place | Route | Phase |
|---|---|---|---|---|
| 1 | Daily Reports | Financial › Daily | `/reports/c/daily` | P1 |
| 2 | Monthly Reports | Financial › Month-end | `/reports/c/monthly` | P2 |
| 3 | Ledger Reports | Financial › Ledger | `/reports/c/ledger` | P1 |
| 4 | Management Reports | Management | `/reports/c/management` | P2 |
| 5 | Insurance Reports | Insurance | `/reports/c/insurance` | P2 |
| 6 | Appointment Reports | Scheduling | `/reports/c/appointment` | P3 |
| 7 | Treatment Plan Reports | Clinical › Treatment plans | `/reports/c/treatment_plan` | P3 |
| 8 | Referral Reports | Patients › Referrals | `/reports/c/referral` | P3 |
| 9 | Recall Reports | Clinical › Recall | `/reports/c/recall` | P3 |
| 10 | Ortho Reports | Clinical › Ortho | `/reports/c/ortho` | P3 |
| 11 | Statements | Financial › Statements: the runner of `statements.statement_run` with its own criteria layout (§4.10) | `/reports/c/statements` | P1 |
| 12 | Lists ▸ | Lists, four tabs = the four legacy list screens | `/reports/c/lists?subcategory=patient` (`provider`, `security`, `setup`) | P3 |
| 13 | Interactive Reports ▸ | Worklists: Eligibility Verification (`worklists.eligibility_verification`), Unsigned Progress Notes (`worklists.unsigned_progress_notes`) and the 13 further worklists of 06 §6 | `/reports/worklists` | P3 |
| 14 | Office Reports ▸ | Custom: tenant-defined reports made with the builder. The 24 legacy children belong to other customers of the legacy vendor and are not replicated [A] `fe_existing_reports.md` §1.1 | `/reports/c/custom` | P5 |
| 15 | Letters | Owning feature (`/patient/:patientId/letters` [V `src/App.tsx` L226]); bulk action `letters` on patient and responsible-party results | `/reports/correspondence#letters` | link P0; bulk action P3 |
| 16 | Postcards | Owning feature (no screen today [A] `fe_report_like_outputs.md` §3.3); bulk action `postcards` | `/reports/correspondence#postcards` | link P0; action with the feature |
| 17 | Labels | Owning feature (nothing exists today [A] same); bulk action `labels` | `/reports/correspondence#labels` | same |
| 18 | Custom Letter | Setup: letter template authoring (API exists, no screen [A] same) | `/reports/correspondence#custom_letter` | link P0 |
| 19 | Advanced Custom Letter | Same | `/reports/correspondence#advanced_custom_letter` | link P0 |
| 20 | Custom Postcard | Setup: postcard templates (API exists, no screen [A]) | `/reports/correspondence#custom_postcard` | link P0 |
| 21 | My Reports | My Reports | `/reports/c/my_reports` | P1 |
| 22 | Blank Insurance Forms | Owning feature (claims; placeholder routes `insurance-forms/dental`, `insurance-forms/medical` [V `src/App.tsx` L207-208]) | `/reports/correspondence#blank_insurance_forms` | link P0 |
| 23 | Pat Reg/Medical Info Forms | Owning feature (patient registration, medical history PDF) | `/reports/correspondence#registration_forms` | link P0 |
| 24 | My Favorites | Library › Favorites; star on every card and runner header; ADD TO MY FAVORITES on the classic frame | `/reports/library/favorites` | P1 |
| 25 | Search Report | Hub search and command palette | `/reports?q=` | P0 |
| 26 | Reports (Old) ▸ | Not replicated (brief §1). Old report names resolve through `legacy_names[]` in search | — | P0 (aliases) |

`/reports/correspondence` lists entries 15-20, 22 and 23 with: owning feature, what exists today, the launch link
when a target route exists (a patient-scoped target uses the active patient, as `handleNavClick` does for
`:patientId` [V `src/components/GlobalNav.tsx` L1310-1315]) and otherwise the text "Not available yet". The menu is
complete, nothing is a dead link, and no placeholder page is added per entry.

### 1.7 Entry points outside the hub

| Entry point | Today | Becomes | Phase |
|---|---|---|---|
| Patient secondary nav "Print" | `alert("Print Reports - Coming Soon")` [V `src/components/PatientSecondaryNav.tsx` L270]; toolbar function `PRINT_REPORTS` [V `src/components/setup/custom-toolbar/toolbarCatalog.tsx` L67] | Menu: the four patient PDFs (existing endpoints through `openServerReport`) and "Ledger reports…" → `/reports/c/ledger` with the patient as context (§4.7) | P1 |
| Notification row `ref_type = report_run` | No notification centre [A] `fe_cross_cutting.md` §6.5 | Run tray (§3.4) → `/reports/runs/:run_id` | P2 |
| E-mail of a schedule | — | `{APP_BASE_URL}/reports/runs/{run_id}` [02 §9.2]; a signed-out recipient signs in and is returned to the snapshot page (return-to-after-login, §2.3, UX-48) | P2 |
| KPI tile, matrix cell, chart mark | — | Drill panel, "Open as full report" → runner | P1 |
| My Page recall alerts, quick link and stats | Link to `/reports` [V `src/components/my-page/lib/useMyDay.ts` L125, L145]; stats computed in the browser | Recall alert → `/reports/worklists/worklists.recall_due`; the tiles of `dashboards.my` replace the client-computed stats [06 §2.3]; alerts read `notifications` (DASH-36) | P1 tiles; P3 the rest |
| Time Clock pages | Bespoke report at `/time-clock/report` [V `src/App.tsx` L334-343] | Stays; adds "Open in Reports" → `/reports/r/management.time_clock_report` | P1 |
| Application home `/dashboard` | Client-aggregated KPI widgets | Stays the home; its widgets are re-pointed to the metric service (DASH-08); gains a link to the caller's landing dashboard [06 §10] | P1 |
| Setup › Providers › Provider Goals (legacy location) | No screen | Menu link to `/reports/goals?tab=production` [06 §4.2] | P3 |

### 1.8 Builder and assistant (P5)

| Topic | Builder page `/reports/builder/:custom_definition_id` |
|---|---|
| Layout | Three panes: left = dataset and field picker (dimensions, measures, search over label and description, definition icon, "in use" tab); centre = numbered steps (Columns, Filters, Group by, Measures, Sort and limit) above a preview; right = visualisation and format |
| Modes | `list` and `summary` (`spec.mode` [02 §11]); pivot only in `summary` |
| Data | Field lists from `GET /analytics/metadata?dataset=` (#54), filtered by the author's data classes on the server; measures are registry keys (`measure_key`, `metric_key` [05 §1.1]) |
| Filters | The runner's parameter components (§8.1) bound to spec filters; "Ask at run time" turns a filter into `parameters[]` |
| Preview | `POST /reports/custom-definitions/preview` (#51): first 10 rows, debounced 800 ms after a change, never automatic while the spec is invalid |
| Validation | `POST /reports/custom-definitions/validate` (#50); each `errors[{path, code, message}]` is shown on the step that owns `path` |
| Guard rails shown in the UI | 30 columns, 3 group levels, 200 pivot columns, mandatory date range of at most 24 months on fact datasets [02 §11]; cost-gate refusal shown as a hint with the row estimate |
| Save and publish | Draft is saved with `PATCH` (#49); Publish (#52) bumps the version and lists the saved views and schedules that will be re-validated; share through #53 |
| Start | "Customise" in the runner menu creates a draft with `based_on_report_key` where the report's shape fits (the standard report is never changed); "New report" starts from a dataset; the template gallery opens a template as an editable draft [06 §9.3] |
| After publish | The report is `custom.<slug>`, appears under Custom with its organisation-defined folder tags [06 §9.3] and in the Library, carries the Custom badge and runs in the normal runner |

Assistant (P5; behaviour in 06 §8, request and response in 06 §8.6 on endpoint #64; `AskBar` and `AnswerCard` are built
by DASH-49). This document provides the slots (`AssistantSlot`, §8.7): on the hub home (`context.surface = home`), in a
dashboard header (`dashboard`) and in the runner header (`report`); the answer opens in the side panel. Mode
`fill_parameters` returns validated `params`, which are loaded into the form through `useParamForm` and wait for Run:
nothing runs by itself. With the organisation switch off, or without `analytics_assistant_use`, the slots render
nothing [06 §8.5].

### 1.9 Administration

| Tab | Content | Endpoint | Right |
|---|---|---|---|
| `settings` | `run_ttl_days_scheduled`, `max_concurrent_runs`, `max_schedules_per_user`, `disabled_report_keys`, `email_delivery_enabled`; health block: configuration errors, `api_build`, `worker_build` / `worker_seen_at`, `tick_build` / `tick_seen_at`, active e-mail transport, queue reachability [02 §12.4]; `security` block: `bulk_export_patient_threshold`, `bulk_export_requires_right`, `purpose_required_for[]`, `daily_export_patient_alert`, `audit_retention_months`, `pinned_retention_months`, `step_up_minutes`, assistant switches [08 §7.2]; `dashboard_role_defaults`, `worklist_attribution_window`, `alert_email_include_values` [06 §12.4] | #23 | `reports_administer` |
| `runs` | All runs of the organisation with requester, scope, status, duration; title and criteria only for runs the caller may view, otherwise the definition title [08 §3.3]; cancel, pin, legal hold, purge | #6 `scope = all`, #9, #11, #12 | List: `reports_runs_view_all`. Cancel, purge: `reports_runs_manage_all`. Pin: `reports_runs_pin`. Legal hold: `reports_administer` |
| `schedules` | All schedules, paused ones first; pause, resume, take over | #37 `scope = all`, #42, #44 | `reports_schedules_manage_all` |
| `usage` | Runs, failures, promotion rate, slowest definitions per report and day | #22 | `reports_runs_manage_all` |
| `metric_settings` | Organisation metric settings and code groups (content and endpoints proposed by 05 §1.1; not in the 02 table yet) | to be added to 02 | No code in 08 §2.2; `reports_administer` until one is named (§13.4 A-11) |
| `access` | Links to the audit-family reports an administrator needs, which run in the normal runner: Access readiness (`management.report_access_readiness`), Report access log (`management.report_access_log`) [08 §3.5, §6.8] | #1, #2 | `audit` family |

---

## 2. Routes

### 2.1 Route table

All paths are children of one lazy route `/reports/*` (§2.3). "Right" names what the server checks (families and codes
of 08 §2.2, §3.3). No route is wrapped in `RequireRight`: a route needs authentication only, the server decides, and
the page renders `AccessDenied` [V `src/features/access-control/RequireRight.tsx` L61] with the labels of
`details.required_any_of[]` on 403 `permission_denied` [08 §3.4].

| # | Path | Page (NEW) | Purpose | Right | Phase |
|---|---|---|---|---|---|
| 1 | `/reports` | `ReportsHomePage` | Hub: search, start strip, groups | Authenticated. Cards are the catalog entries the server returns; none → request-access state (§1.2) | P0 |
| 2 | `/reports/c/:category` | `ReportCategoryPage` | Classic frame. Query: `report=<report_key>` (default: first report of the category), `subcategory=` for `lists`, value keys of the selected report | Family of the category, View Only or Full Control [08 §2.2 A, §2.3]; in practice: at least one report of the category in the caller's catalog | P0 |
| 3 | `/reports/r/:report_key` | `ReportRunnerPage` | Enhanced frame. Query: value keys (FLT-19) and view-state keys (§5.10). A definition with `kind = worklist` redirects to row 9 | Family named by the definition's `right_code`, action `run` [08 §3.2] | P0 |
| 4 | `/reports/runs` | `RunHistoryPage` | My runs, active runs first; `scope=all` lists the runs of all users | Own runs; `scope=all`: `reports_runs_view_all` | P2 |
| 5 | `/reports/runs/:run_id` | `RunSnapshotPage` | Stored result (snapshot link, e-mail link, notification) | `can_view_run()`, rules V-1..V-7 [08 §4.5] | P1 |
| 6 | `/reports/library/:tab?` | `ReportLibraryPage` | `favorites` (default), `recents`, `views`, `shared`, `custom` | Authenticated | P1 |
| 7 | `/reports/dashboards` | `DashboardCatalogPage` | Dashboards the caller may open, the landing dashboard first: the home the user chose, else the persona default of 06 §10 | Authenticated; filtered by the dashboard rights | P1 |
| 8 | `/reports/dashboards/:dashboard_key` | `DashboardPage` | One dashboard. `dashboard_key` is the full key, for example `dashboards.main` [06]. Query: value keys of the header parameters, `_tab`, `_view`, `_tile` (§7.1) | The dashboard's right: codes of 08 §2.2 D, mapped per dashboard in 06 §2.0.5 | P1 |
| 9 | `/reports/worklists/:report_key?` | `WorklistPage` | Without a key: index of worklists with their counters. `report_key` is the full key, for example `worklists.recall_due` [06 §6] | The report family of the worklist's legacy counterpart [08 §2.3; 06 §2.0.5] | P3 |
| 10 | `/reports/schedules` | `SchedulesPage` | Query: `tab=mine\|delivered\|all`, `kind=report\|digest\|alert` [06 §7.2], `schedule_id=` opens the detail panel | `reports_schedule_own`; tab `all`: `reports_schedules_manage_all` | P2; alerts P4 |
| 11 | `/reports/builder` | `BuilderHomePage` | My custom definitions and drafts | `reports_build_custom`, or grantee of a shared definition | P5 |
| 12 | `/reports/builder/:custom_definition_id` | `BuilderPage` | `new` = unsaved draft | `reports_build_custom`; owner or `edit` grantee | P5 |
| 13 | `/reports/goals` | `GoalsPage` | Query: `tab=production\|targets\|history`. Page shell here; grids and editors by DASH-19 and DASH-37 [06 §4.2] | `analytics_goals_view`; editing: `analytics_goals_manage` | P3; targets P4 |
| 14 | `/reports/glossary` | `GlossaryPage` | Metric definitions; `metric=<metric_key>` opens one | Authenticated; metrics filtered by the metric-family rule [08 §2.3] | P1 |
| 15 | `/reports/admin/:tab?` | `ReportsAdminPage` | §1.9 | Per tab (§1.9): `reports_administer`, `reports_runs_view_all`, `reports_runs_manage_all`, `reports_schedules_manage_all` | P2 |
| 16 | `/reports/correspondence` | `CorrespondenceLinksPage` | §1.6 | Authenticated | P0 |
| 17 | `/reports/*` (anything else) | `ReportsNotFound` | Message + search box + link to the hub | Authenticated | P0 |

`report_key` contains a dot (`daily.production_report`). The Vite dev server falls back to `index.html` by `Accept`
header, not by extension, and the production server answers every unknown path with `index.html` [V
`node_modules/vite/dist/node/chunks/config.js` `htmlFallbackMiddleware`; `server.js` L110-113], so the key is used
verbatim in the path.

### 2.2 What happens to the routes that exist today

Existing routes: [V `src/App.tsx` L253-298].

| Existing path | Today | After |
|---|---|---|
| `/reports` | `Reports` home (client-aggregated KPIs + six-report library) | Hub (row 1). The old page stays reachable only through the engine probe fallback of §2.3 until every client has the engine |
| `/reports/run/:reportId` | Old runner for 6 ids; unknown id → `/reports` | Engine `on`: redirect through `LEGACY_REPORT_ID_MAP` to `/reports/r/<report_key>`; unknown id → `/reports`. Engine `off`: the old runner (§2.3) |
| `/reports/ledger` | Redirect to the production report (wrong meaning) | Redirect to `/reports/c/ledger` |
| `/reports/appointment`, `/reports/treatment-plan`, `/reports/insurance` | Redirects to single reports | Redirect to `/reports/c/appointment`, `/reports/c/treatment_plan`, `/reports/c/insurance` |
| `/reports/lists/patient-list`, `/reports/lists/responsible-party-list` | Redirect; placeholder | Redirect to `/reports/c/lists?subcategory=patient` |
| `/reports/lists/provider-list`, `/security-list`, `/setup-list` | Placeholders | Redirect to `/reports/c/lists?subcategory=provider`, `security`, `setup` |
| `/reports/interactive/unsigned-progress-notes`, `/eligibility-verification` | Placeholders | Redirect to `/reports/worklists/worklists.unsigned_progress_notes` and `/reports/worklists/worklists.eligibility_verification` (to `/reports/worklists` until P3) |
| `/reports/office/abbey-dental`, `/brightnow`, `/dha`, `/access-dental` | Placeholders for other customers' reports | Deleted. `/reports/office/*` redirects to `/reports/c/custom` |
| Paths of the pre-`f7332be` menu that have no route today: `/reports/daily`, `/monthly`, `/management`, `/referral`, `/recall`, `/ortho`, `/statements`, `/my-reports`, `/my-favorites`, `/search`, `/letters`, `/postcards`, `/labels`, `/custom-letter`, `/advanced-custom-letter`, `/custom-postcard`, `/blank-insurance-forms`, `/registration-forms`, `/old` [A] `fe_existing_reports.md` §1.2 | Blank shell (no catch-all route) | Redirects to the routes of §1.6 (`/old` → `/reports`) |
| `/time-clock/report` | Bespoke report | Unchanged (§11) |
| `/dashboard`, `/my-page`, `/setup/insurance/dashboard` | Outside the module | Routes unchanged. `/dashboard` stays the application home [06 §10]; its KPI widgets and the My Page stats are re-pointed to the metric service (DASH-08) |

All redirects come from one table, `legacyRedirects.ts`, rendered as `<Route>` elements inside the module, the pattern
`utilityLegacyRedirects()` already uses [V `src/App.tsx` L346-348].

`LEGACY_REPORT_ID_MAP` (provisional; final keys are owned by `catalog/*`, [02 §14] last row):

| Old `reportId` | `report_key` |
|---|---|
| `production` | `daily.production_report` |
| `collections` | `daily.collection_report` |
| `patient-list` | `lists.patient_list` |
| `appointments` | `appointment.appointment_list` |
| `treatment-plans` | `treatment_plan.treatment_plan_status` |
| `insurance-claims` | `insurance.claims_list` |

### 2.3 Implementation

| Item | Design |
|---|---|
| `src/App.tsx` | L253-298 (seventeen report routes) are replaced by one line: `<Route path="/reports/*" element={isAuthenticated ? <ReportsEntry onLogout={logout} currentOffice={currentOffice} setCurrentOffice={setCurrentOffice} /> : <Navigate to="/login" replace state={{ from: location }} />} />` (`useLocation` is already imported [V `src/App.tsx` L2]). No other report route is ever added to `App.tsx` |
| Return to the requested page after login (UX-48) | Today an unauthenticated route renders `<Navigate to="/login" />` without the origin, `LoginPage` always navigates to `/dashboard` or the password page [V `src/pages/LoginPage.tsx` L45-49], and a 401 hard-redirects to `/login` [V `src/services/api.ts` L89-92], so a signed-out recipient of an e-mail or notification link loses the target. Change: (1) the `/reports/*` element passes `state.from` (above); (2) the 401 handler writes `pathname + search` to `sessionStorage["auth:return_to"]` before the redirect (the URL carries ids only, §5.10); (3) `LoginPage` navigates to `state.from` or `auth:return_to` when it is a same-origin path starting with `/reports/`, else `/dashboard`; after a forced password change the same target is used; the key is removed once read. Hard dependency of the snapshot link (UX-21), the tray and notification targets (UX-33) and schedule e-mails (UX-34) |
| `ReportsEntry` (`src/features/reports/ReportsEntry.tsx`, main chunk, about 50 lines) | `AppShell` [V `src/components/layout/AppShell.tsx`] with `bgClassName="bg-slate-50"` (what `AdminPageWrapper` does; that wrapper is a local function of `App.tsx` and is not exported [V L95-116]) → `ReportsErrorBoundary` → `Suspense` with a page skeleton → `React.lazy(() => import("./routes"))` |
| `routes.tsx` (lazy chunk root) | Nested `<Routes>` with the table of §2.1 and the redirects of §2.2; dashboards, builder, administration and schedules pages are lazy children (§9.4) |
| Engine probe | `useEngineAvailable()` derives the engine state from the one catalog query of §3.2 (cached for the session). States and their effect are in the table below. 404 `reports_engine_disabled` is the switched-off engine (`REPORTS_ENGINE_ENABLED = false`; the routers are always mounted once ENG-01 is deployed [02 §12.4]); a plain 404 is a backend build without the engine package (frontend and backend deploy independently per client) and is treated the same. One build serves clients with and without the engine; a `VITE_*` build flag is not used because such flags are baked at build time and have caused two production incidents [A] `fe_cross_cutting.md` §1.4. The fallback and the old code are deleted when the last client has the engine (UX-12) |
| First `React.lazy` and first error boundary of the app | [A] `fe_cross_cutting.md` §2.3: no lazy import, no error boundary and no catch-all route exist today. A failed chunk load after a deploy is caught by the boundary, which offers "Reload" (detection: §9.4) |

| Engine state | Detected by | Reports nav (§3) | Routes |
|---|---|---|---|
| `on` | Catalog answers 200 | Rules of §3.1 / §3.2 | Table of §2.1; redirects of §2.2 including `LEGACY_REPORT_ID_MAP` |
| `off` | Any 404 on `GET /reports/catalog` | `useReportsNavItems()` returns today's seven-leaf array unchanged; the run tray renders nothing and issues no request | `/reports` and `/reports/run/:reportId` render the old home and old runner (lazy import of `src/components/reports/**`); every other `/reports/*` path redirects to `/reports`; `LEGACY_REPORT_ID_MAP` redirects are not registered |
| `misconfigured` | 503 `reports_engine_misconfigured` | Reports Home only | Every `/reports/*` path shows "Reports are not available" (with `details.missing[]` for administrators) |
| `unknown` | Network error, 5xx, timeout, or still loading | Static skeleton (§3.2) | Page skeleton + "Reports could not be loaded" with Retry once the call has failed; the old pages are not used |

---

## 3. Navigation changes in GlobalNav

Facts [V `src/components/GlobalNav.tsx`]: `reportsMenuItems` is a static array with seven leaves (L595-630), rendered
by `renderSubmenu(reportsMenuItems)` (L1755-1761) without a rights filter; only Setup is filtered, by
`filterNavByRights` + `SETUP_NAV_RIGHTS` (L96-146, L1252). A dropdown has one fly-out level; a third level cannot
open because the portal handler looks up `[data-submenu-key]` that no element renders (L1880-1882). The dropdown body
scrolls (`max-h-[calc(var(--vh)*80)] overflow-y-auto`, L1757).

### 3.1 The restored menu

Legacy labels and legacy order are kept, so a user of the legacy tool finds every entry where it was. Two entries
are added above and four below. Depth stays at two levels.

| # | Label | Target | Rendered when |
|---|---|---|---|
| — | Reports Home | `/reports` | always |
| — | Dashboards ▸ | Up to ten entries of `GET /analytics/dashboards` (home and pinned first [06 §10]) + "All dashboards" | the list is not empty (P1) |
| | divider | | |
| 1-10 | Daily Reports … Ortho Reports (ten entries, legacy labels) | `/reports/c/<category>` | the caller's catalog has a report of that category |
| | divider | | |
| 11 | Statements | `/reports/c/statements` | same |
| 12 | Lists ▸ | Patient/Resp. Party List, Provider List, Security List, Setup List → `/reports/c/lists?subcategory=…` | per subcategory |
| | divider | | |
| 13 | Interactive Reports ▸ | Up to ten worklists (the persona's pinned ones first [06 §10]) + "All worklists" | at least one worklist (P3) |
| | divider | | |
| 14 | Office Reports ▸ | Up to ten custom reports (favorites first) + "All custom reports" + "Report builder" | custom reports exist, or `module_access.can_build` (P5) |
| | divider | | |
| 15-17 | Letters, Postcards, Labels | `/reports/correspondence#…` | always |
| | divider | | |
| 18-20 | Custom Letter, Advanced Custom Letter, Custom Postcard | `/reports/correspondence#…` | always |
| | divider | | |
| 21 | My Reports | `/reports/c/my_reports` | catalog has `my_reports` entries |
| | divider | | |
| 22-23 | Blank Insurance Forms, Pat Reg/Medical Info Forms | `/reports/correspondence#…` | always |
| | divider | | |
| 24 | My Favorites | `/reports/library/favorites` | P1 |
| | divider | | |
| 25 | Search Report | Item `{action: "reports_search"}`, handled in `handleNavClick` like `REPORT_ISSUE_SENTINEL`: outside `/reports/*` it navigates to `/reports` with router state `focus_search` (the hub focuses its search box); inside `/reports/*` it opens the command palette (P1; before P1 it focuses the hub search box) | always |
| | divider | | |
| — | Schedules | `/reports/schedules` | `module_access.can_schedule` or `can_manage_schedules` (P2) |
| — | Run history | `/reports/runs` | P2 |
| — | Goals | `/reports/goals` | `module_access.can_view_goals` (P3) |
| — | Administration | `/reports/admin` | `module_access.can_administer`, `can_view_all_runs`, `can_manage_runs` or `can_manage_schedules` (P2) |

Entry 26 (Reports (Old)) is not rendered. The full menu is 31 rows of 36 layout px plus 11 dividers of 9 px, about
1,225 layout px [V row classes `px-4 py-2 text-sm` L1394, divider `h-px my-1` L1377]. The dropdown body is limited to
80 % of the viewport height in layout px and scrolls [V L1757]: with about 950 px of viewport on a 1080-pixel-high
display (1,270 layout px at zoom 0.75) roughly the last six rows are reached by scrolling. Entries that do not apply
to the caller are removed (§3.2), which shortens the menu for most users. `module_access` is the per-caller object
requested in §13.4 A-9.

### 3.2 Rights filter

| Rule | Detail |
|---|---|
| Source of truth | The catalog, already filtered by report right on the server ([02 §13 #1]), and the dashboard catalog (#58). A category entry is visible when the catalog holds at least one report of it. No right code is evaluated in the browser for report access [08 §3.4]: `hasRight()` grants everything while `RIGHTS_ENFORCED_DEFAULT` is `false` and for users with `permissions_enforced === false` [V `src/features/access-control/rights.ts` L27, L70-79], the opposite of the strict server rule |
| Loading | The static skeleton of §3.1 is rendered only while the catalog is still loading; once it has arrived the menu is built from it and does not re-flow while open. If the catalog call fails the skeleton stays (the server still refuses what is not allowed) |
| Fetch | Once after login, when the browser is idle (`requestIdleCallback`, fallback `setTimeout` 2 s), `staleTime` 10 minutes, key `reportKeys.catalog()` (holds the user id, §9.3), `silent_error`; refetched when the identity is reloaded. This one query is the single source for the nav, the engine probe (§2.3), the tray switches and `module_access` (§3.4, §13.4 A-9), and is shared with the hub. Hovering the Reports button refetches it only when stale |
| Containment | `mergeCatalog` is total: it parses its input with zod `safeParse`; on failure it returns the static skeleton and logs the error. The Reports dropdown body and `RunTrayButton` are each wrapped in a small error boundary that lives in the main chunk (fallback: static skeleton / render nothing), because `GlobalNav` renders on every authenticated page and lies outside `ReportsErrorBoundary`. A unit test feeds malformed and empty catalogs |
| Module-wide entries | Schedules, Goals, Administration and Report builder depend on module-wide rights that no catalog entry carries (`reports_schedule_own`, `reports_schedules_manage_all`, `reports_runs_view_all`, `reports_runs_manage_all`, `reports_administer`, `reports_build_custom` [08 §2.2 B]; `analytics_goals_view` [08 §2.2 D]). They follow a per-caller `module_access` object served with the catalog (requested, §13.4 A-9). Until it is served, they are rendered for every caller whose catalog is not empty and the page shows `AccessDenied` on 403. `filterNavByRights` with `useRights().hasAny` is not used for this menu |
| Empty menu | When only Reports Home, Search Report and the correspondence entries would remain, the hub shows the request-access state (§1.2) |

### 3.3 Code changes

| File | Change |
|---|---|
| `src/components/GlobalNav.tsx` | `reportsMenuItems` → `useReportsNavItems()` from `src/features/reports/nav/reportsNav.ts` (skeleton + catalog merge; no engine import, stays in the main chunk) rendered by `ReportsNavMenu` (`nav/ReportsNavMenu.tsx`, NEW, main chunk: the Radix dropdown below inside its own error boundary); `handleNavClick` gains the `reports_search` action (§3.1) and the unsaved-changes check of §4.7. `filterNavByRights` and `SETUP_NAV_RIGHTS` keep serving Setup only. Icons `BarChart3`, `DollarSign`, `Users`, `Calendar`, `Stethoscope`, `Shield` are already imported [V] |
| `src/features/reports/nav/reportsNav.ts` (NEW) | `REPORTS_NAV_SKELETON`, `mergeCatalog(skeleton, catalog, dashboards, module_access)`, `useReportsNavItems()` |
| Reports dropdown rendering | Today's fly-outs are portalled to `document.body` and opened by click [V `src/components/navigation/SubmenuPortal.tsx` L48; `GlobalNav.tsx` L1334-1360]: their items are not next in tab order, there is no Escape handling, no `aria-haspopup` / `aria-expanded`, and the position is captured once at click time while the dropdown body scrolls. With four fly-outs (Dashboards, Lists, Interactive Reports, Office Reports) this is not operable by keyboard. The Reports dropdown is therefore rendered with the installed `@radix-ui/react-dropdown-menu` 2.1.16 (sub-menus, roving focus, Escape returns focus to the trigger, ARIA state, collision handling) through a module wrapper in `nav/`; the other top-bar dropdowns keep today's mechanism. Layer: the nav dropdown layer of §9.5 |
| Not changed | The two-level limit; menu order of the top bar; the other dropdowns |

### 3.4 Run tray in the top bar (P2)

The top bar has one notification badge today, the AppointNow bell [V `src/components/GlobalNav.tsx` L1516-1528].
`RunTrayButton` (NEW, `src/features/reports/tray/`, main chunk, tiny; its panel is lazy) is placed beside it. It is
also the notification entry of the module in the application shell that 06 §12.4 asks for.

| Aspect | Design |
|---|---|
| Badge | Number of my `queued` + `running` runs, plus unread notifications of the module's categories: `report` [02 §5.7], `analytics_alert` [06 §7.2] and worklist assignments (DASH-36; category name: §13.4 A-6) |
| Panel | Runs: active runs with progress and Cancel; finished runs of the last 24 hours with Open, Download, Run again; "All runs" → `/reports/runs`. Notifications: each entry maps to a target in `notificationRoutes.ts` by `category` and `ref_type`: `report` with `report_run` → `/reports/runs/:run_id`; `analytics_alert` (its `ref_id` is the run of the firing [06 §7.2]) → the alert's page (`/reports/schedules?kind=alert&schedule_id=…`) and its home dashboard with `_tile` set, where Acknowledge · Snooze · Mute live (P4); a follow-up assignment → its worklist (P3) |
| Data | `GET /reports/runs?scope=mine&status=queued&status=running` and `listMyNotifications({ unread_only: true })` [V `src/api/generated/endpoints/users/users.ts` L852]; opening an entry calls `markMyNotificationRead` [V L945] |
| Polling | Runs: only while at least one of my runs is active, every 15 s, paused while the document is hidden. Notifications: fetched when the button mounts, on window focus (at most once a minute) and on a socket envelope; there is no idle timer, so an idle session issues no request. Socket envelopes `report.run.*` and `report.artifact.ready` [02 §5.7] trigger an immediate refetch (best effort) |
| Hidden when | The engine state is not `on` (§2.3), or the catalog response says neither background runs nor a notification category of the module is enabled for the client (§13.4 A-9). The tray reads these switches from the catalog query of §3.2 and issues no request of its own while hidden |

---

## 4. The runner

### 4.1 Two frames, one engine

| Piece | Classic frame | Enhanced frame |
|---|---|---|
| Route | `/reports/c/:category?report=<report_key>` | `/reports/r/:report_key` |
| Purpose | Mirrors the legacy screen: pick the report in the list, fill REPORT CRITERIA, PRINT / PREVIEW | Compact criteria bar, chips, Run, results first |
| Criteria state | `useParamForm(definition)` (04 §13.4) | The same hook: same value keys, same validation |
| Criteria layout | `ClassicCriteriaLayout` | `EnhancedCriteriaLayout` |
| Run lifecycle | `useReportRun()` (§4.3) | The same hook |
| Results | `ReportResults` (§5) | The same component |
| Switching | Link "Enhanced view": navigates to the runner route with the same query string and passes the complete form values in router state (`form_values`) | Link "Classic view": navigates back the same way. The target frame takes `form_values` from router state before the URL, so nothing is lost inside the app (including `url_safe = false` values) and nothing re-runs; a copied link omits `url_safe = false` keys (§5.10) |

### 4.2 Anatomy

Classic frame (legacy chrome: [V] observations in `legacy/daily_reports.json`: title bar with the screen title,
`SELECT REPORT` radio list in a two-column grid, `REPORT CRITERIA` with section header bars, `CLEAR CRITERIA` at the
right end of that bar, a collapse handle between the panels, action bar with `PRINT / PREVIEW` and
`ADD TO MY FAVORITES`):

```
+ Daily Reports ------------------------------------------------------------ [Enhanced view] --+
| SELECT REPORT                          || REPORT CRITERIA                    [CLEAR CRITERIA] |
| ( ) Peg Board Day Sheet ( ) Routing Slip|| REPORT FORMAT            | PRINT FORMAT             |
| ( ) Daily Journal       ( ) Progress N. ||  ( ) Detail (o) Summary  |  (o) PDF ( ) Excel       |
| (o) Production Report   ( ) Production A|| OFFICE/GROUP                                         |
| ( ) Collection Report   ( ) Daily Audit ||  (o) Office ( ) Office Group   [108      ] [SELECT]  |
| ( ) Deposit Slip        ( ) Claims Pr.  || DATE RANGE                                           |
| ( ) Scheduled Prod.     ( ) Special Tr. ||  Start Date [11/22/2026]  End Date [11/22/2026]      |
|                                        <>| PRODUCTION BY  (o) Code ( ) Provider ( ) Category ..  |
|                                         || ...                                                  |
|                                         ||                [PRINT / PREVIEW] [ADD TO MY FAVORITES]|
+-----------------------------------------++-----------------------------------------------------+
| ReportResults (same component as below); the page scrolls to it after PRINT / PREVIEW          |
+------------------------------------------------------------------------------------------------+
```

Enhanced frame:

```
[< Reports]  Financial > Daily   Production Report  [star] [Standard] (i)     View: Month-end v [Modified]
                                                 [Save v] [Share] [Schedule] [Export v] [Print] [...]
----------------------------------------------------------------------------------------------------
[Date range: Today v] [Office: Hamilton (108) v] [Report format: Summary v] [Production by: Code v]
[More options (2)]    Group by: Provider x | Include UCR x | Clear criteria          interactive  [ Run ]
----------------------------------------------------------------------------------------------------
As of 11/22/2026 09:12 CT - live - 44 rows - 1.8 s - Transaction date - Office of service  [Refresh]
[ notices: availability, hidden columns, stale criteria, preview only ]
[ Total production 48,210.50 ] [ Procedures 512 ]
[Table | Chart]  Expand all  Collapse all   Density v   Columns (2 hidden) v   Quick filter [.......]
+-------------------------------------------------------------------------------+------------------+
| banded table: sticky header, pinned first column, pinned grand total          | drill panel      |
+-------------------------------------------------------------------------------+------------------+
Rows 1-44 of 44 - totals cover all rows
```

Header menu `[...]`: Definition and legacy notes, Classic view, Restore last run, Run history of this report,
Customise (opens the builder, P5).

Classic report selection. Selecting another report in SELECT REPORT replaces the current history entry with
`report=<report_key>` only: every value key and view-state key of the previous report is removed and the new report
opens with its legacy defaults (shared keys such as `date_from` never leak into the next report). `ReportPicker` is a
radio group; arrow keys move the focus and the visual selection, and the selection is committed (definition loaded)
on Enter or Space, on click, or 400 ms after the last arrow key.

### 4.3 Page states and run lifecycle

Run states are those of 02 §5.1: `queued`, `running`, `cancelling`, `succeeded`, `failed`, `cancelled`, `expired`.

| Page state | Entered when | Shows |
|---|---|---|
| `definition_loading` | `GET /reports/definitions/{report_key}` pending | Page skeleton |
| `definition_denied` / `definition_missing` / `definition_disabled` | 403 `permission_denied` / 404 `report_not_found` / 409 `report_disabled` | `AccessDenied` / not-found with search / "Disabled for your organisation" |
| `no_working_office` | `useOfficeScope()` reports `office_id = null` [V `src/features/office-scope/OfficeScopeContext.tsx` L34-35; status `resolving` / `unassigned` in `officeScopeModel.ts` L168-172] | `resolving`: criteria skeleton; every office-dependent query (validate, options, run, live rows, dashboard data) is held with `enabled: office_id != null` and nothing auto-runs. `unassigned`: `<OfficeRequiredBanner action="run reports" />` [V `OfficeRequiredBanner.tsx`] above the criteria, Run disabled with that reason; hub, catalog, library and glossary stay usable. Whether `working_office_id` may be omitted for an unassigned caller with all-office access is a contract note (§13.5) |
| `idle` | Definition loaded, no run on screen | Criteria, what the report answers (`description`), date basis and attribution (AD-9), cost class, Run |
| `submitting` | `POST /reports/runs` in flight (inline execution happens inside this request) | Under 1 s: nothing. 1-10 s: results area skeleton, previous result dimmed. Over 10 s: `RunStatusPanel` with elapsed time and Cancel |
| `waiting` | The response or a poll says `queued`, `running` or `cancelling` | `RunStatusPanel`: phase, `progress_pct`, `progress_message`, `rows_processed`, `queue_position`; Cancel; "You can leave this page" (P2) |
| `succeeded` | `run.status = succeeded` | `ReportResults` |
| `failed` | `run.status = failed` | `RunError` with the message for `error_code` (§5.8), the run id, "Run again"; the previous good result stays below, marked as older |
| `cancelled` | `run.status = cancelled` | Notice + previous result if any |
| `expired` | 410 `run_expired` on rows or snapshot page | "This result has expired" + "Run again" with the returned `params_input` |
| overlay `stale` | Declared `query`-role values of the form differ from the `params_input` of the run on screen | Result dimmed under "Criteria changed — Run to update". A change of a `layout` or `output` parameter never makes a result stale [02 §3.2 `role`]. When the page opens with `_run`, the form is hydrated from that run's `params_input` (served behind `can_view_run`), so a reload never shows a false stale overlay; URL value keys only override keys the user edits afterwards |

| Step | Client behaviour | Endpoint |
|---|---|---|
| Identity | The client creates `run_id` (UUID v7, `newRunId()` in `runModel.ts`: hand-written on `crypto.getRandomValues`, about 15 lines with a test vector; no `uuid` package is installed and `crypto.randomUUID()`, which the app uses elsewhere, is v4 [V `package.json`; `src/components/patient/claimLifecycle.ts` L196]) before the request, so an inline run can be cancelled and a retried POST is idempotent [02 §5.2] | — |
| Start | Body: `run_id`, `report_key`, `working_office_id` = `useOfficeScope().office_id` [V `src/features/office-scope/OfficeScopeContext.tsx`], `params` (flat value keys, tokens allowed), `saved_view_id?`, `mode: "auto"`, `refresh?`, `render_output?`, `page_size`, `parent_run_id?`, `purpose_code?`, `purpose_note?` | `POST /reports/runs` (#5) → 201 `{run, result}` |
| Inline result | `result` is the first page of the main block; it seeds the rows cache of §9.3 | — |
| Promotion or background | `run.status = queued`: start polling | `GET /reports/runs/{run_id}` (#7) |
| Polling cadence | Wait `poll_after_ms` from the last response (1,000 → 5,000). Without the field: 1 s for 10 s, 2 s until 30 s, then 5 s. While the document is hidden: 30 s. Stop on `succeeded`, `failed`, `cancelled`, `expired`. A socket envelope for this `run_id` triggers an immediate poll | #7 |
| Client timeout of the POST | 65 s (inline budget 45 s until P2, 25 s after, plus margin [02 §5.3]). On a client timeout or network error the run may still exist: poll #7 with the same `run_id`; 404 means it was never created → show the error and keep the form | #7 |
| Cancel | Abort the pending request and call cancel; show `cancelling` until the poll returns a terminal state (`cancelling → succeeded` is possible: then show the result) | `POST /reports/runs/{run_id}/cancel` (#9) |
| Refresh | Same criteria, `refresh: true` (skips cache and de-duplication) | #5 |
| Cache hit | `run.cache_hit = true`: context line shows "Result of 09:12 (shared)" and Refresh | — |
| Run again from history | Body `{mode, working_office_id, confirm_side_effects?}`: `refresh_tokens` re-resolves presets, `same_values` repeats the resolved values. A run with `side_effects = writes` needs the confirmation of §4.10 | `POST /reports/runs/{run_id}/rerun` (#10) |
| 4xx without a run | 422 parameter errors → inline on the form (§4.7). 403 → message of §4.7. 429 `report_concurrency_limit` → "You already have {active} reports running (limit {limit})" with links to them; honours `Retry-After` | — |

### 4.4 Behaviour per cost class

`definition.cost_class` (or the one of the selected `report_formats[]` entry) decides the initial behaviour; the
`cost_class` returned by validate (after `escalate_when`) overrides it for the current criteria.

| `cost_class` | On open | On criteria change | Run control | Notes |
|---|---|---|---|---|
| `instant` | Enhanced frame: auto-run as soon as the definition, the defaults and the first validate are in and valid. Classic frame: `idle` | Enhanced: auto-run 600 ms after the last change; popovers and dialogs apply on close; the previous result is dimmed meanwhile. Classic: marks the result `stale` | Enhanced: "Refresh" (secondary). Classic: PRINT / PREVIEW | [02 §4.9] "auto-run on open and on change". Auto-run applies to the enhanced frame, drill panels and list tiles; in the classic frame nothing runs before PRINT / PREVIEW (legacy behaviour; every run is audited, AD-7). Never auto-run when a required value is missing, when `side_effects = writes`, without a working office, or on the snapshot page |
| `interactive` | `idle`; nothing runs | Marks the result `stale` | "Run" (primary) | Opening a favorite or saved view with "Run" from a card passes router state `run_on_open` and runs once; a reload does not run again |
| `background` | `idle` | `stale` | "Run in background" | Run → `queued`; the user may leave. Definitions declared `background` are absent from the catalog before P2 [02 §5.3] |
| escalated by the criteria | — | The Run label follows validate: "Run" ↔ "Run in background", with the row estimate when FLT-24 provides one | — | Before P2 an escalated run is tried inline and may end `failed` with `report_too_large_for_inline` [02 §4.9] |

### 4.5 Criteria panel generated from the definition

| Step | Rule |
|---|---|
| Sections | Parameters are grouped by `section` (the legacy section title, verbatim). Sections are ordered by the smallest `order` of their parameters, parameters by `order` [02 §3.2]. A section whose parameters are all hidden is not rendered |
| Section bar | Classic: the title verbatim, upper case, as a header bar; parameters and enum members with `placement: header` (GROUP BY PROVIDER = member `group_by.provider`, SHOW ONLY CREDIT BALANCES, GROUP BATCH CHECKS) are drawn inside the bar [04 §2.2, §2.4]. Placeholder titles that start with `[` (`[no header] LEFT TABLE`) produce no bar |
| Control | One component per `type` (table below); the `control` hint (`picker`, `dropdown`, `radio`, `checkbox_group`, `checkbox` with `member`, `lookup_text`; vocabulary requested in §13.4 A-3) selects the literal rendering in the classic frame |
| Labels | `label` (legacy label); `label_when[]` may replace it; `help_text` is an info icon with a popover; static legacy texts (`legacy_unmapped[]` with status `help_text`) are shown as notes under their section |
| Hidden by access | Parameters named in `access.hidden_parameters[]` are not served; the panel shows "n criteria are not available with your access" [02 §3.2 `data_class`] |
| Availability | Entries of `availability[]` whose `applies_to` holds for the current values are shown as an information notice above the action bar ("Carrier is the patient's current primary carrier…") and again with the result |
| Options | `options[]` in definition order; `is_enhancement` options are marked "added" in the classic frame; an option whose `enabled_when` is false is greyed, not removed |

| `type` [04 §2.1] | Component [04 §13.4] | Classic frame | Enhanced frame |
|---|---|---|---|
| `boolean` | `BooleanParam` | Checkbox with the legacy label; in the section bar when `placement: header` | Checkbox under More options; chip when not default |
| `enum` | `EnumParam` | Radio row (`control: radio`) or select (`control: dropdown`) | Segmented control up to 4 options, select above |
| `enum` member (`control: checkbox`, `member: <value>`) | `EnumParam` | One checkbox per member: ticked = that value, unticked = `none` [04 §2.2 "Layout checkbox of an enum"]; several members of one enum render as mutually exclusive checkboxes; valid with `placement: header`; `label_when[]` and `default_when[]` apply to it (Page Break beside GROUP BY, Page Break by Patient, Group By Office, GROUP BY PROVIDER, Group By Zip Code) | Under More options as the member's checkbox; chip when not default |
| `enum_multi` | `EnumMultiParam` | Checkbox row or grid, All box when `accepts_all` | Popover checklist; the trigger shows the count |
| `entity_multi` | `EntityMultiParam`; `ProviderParam` for `lookup:providers` | `control: picker`: read-only box (`ALL`, `None`, values or a count) + `SELECT` button → `EntityPickerDialog` (Include all, search, sort, transfer list: the legacy dialog [04 §5]). `control: dropdown` (SPECIALTY, STATE, REFERRAL TYPE, CATEGORY, PRODUCTION TYPE, FEE SCHEDULE, MACRO CATEGORY [04 §2.4]): native select (ALL + rows) while the value is `all` or exactly one value; automatic fallback to the read-only box + `SELECT` when it holds two or more values or `none` (from a saved view or URL). `control: lookup_text` (Patient): text box + `SEARCH` as for `entity_single`, chips for several values | Chip box + searchable popover; "Select…" opens the same dialog |
| `entity_single` | `EntitySingleParam` | Select (`control: dropdown`) or text box + `SEARCH` | Typeahead |
| `office_scope` | `OfficeScopeParam` | Radios Office / Office Group + read-only box + `SELECT` | One trigger "Office: Hamilton (108)" with the modes of 04 §6.1 |
| `scoped_selection` | `ScopedSelectionParam` | Radio row + box + `SELECT` | Segmented control + popover |
| `date` | `DateParam` | `MM/DD/YYYY` box with calendar icon | Same, plus a token menu (Today, Yesterday, …) |
| `date_range` | `DateRangeParam` | Start Date / End Date boxes; the `date_basis` radio above them when it shares the section; presets as a secondary menu | One trigger "Month to date · 11/01/2026 – 11/22/2026" opening presets and two inputs |
| `integer`, `decimal` | `NumberParam` | Number box | Same |
| `number_range` | `NumberRangeParam` | Gate checkbox (when declared) + From / To | Same, compact |
| `text` | `TextParam` | Text box | Same |
| `text_range` | `TextRangeParam` | Start Name / End Name, each with a lookup icon | Same |
| `amount_comparison` | `AmountComparisonParam` | Operator dropdown + amount box | Same |
| `lookback_days` | `LookbackDaysParam` | Checkbox + days dropdown in one sentence | Same |
| `action` | `ActionParam` | Button in the criteria area | Button under More options |
| `display` | `DisplayParam` | Read-only box | Read-only text |

Classic section grid. The legacy screens lay sections out in two columns, row by row, with some sections spanning
both and some pickers spanning the full width under a pair ([V] layout notes in
`legacy/index/insurance_reports.controls.json`: "[OFFICE/GROUP | PROVIDER] with the office picker row spanning the
full width underneath, [CREATED ON DATE RANGE | NAME RANGE], [CLAIM AMOUNT OVER OR EQUAL TO | CARRIER]"; `daily_reports`
r01: "PRINT FORMAT (full width), OFFICE/GROUP | PROVIDER (side by side), REPORT DATE (full width)"). No rule derived
from parameter types reproduces these pairings, so the layout is data: every definition with `legacy != null`
carries `criteria_rows: [[section_title], [section_title, section_title], …]` (one or two sections per row, in
display order) and an optional per-parameter `row_span: "full"` (a control drawn across both columns under its row,
e.g. the office picker row). Catalog authors transcribe it from the layout notes; the definition lint (02 §15.4)
fails a legacy definition without it (requested, §13.4 A-3). `ClassicCriteriaLayout` renders exactly these rows; a
section not named in `criteria_rows` is appended full width. When `criteria_rows` is absent (non-legacy
definitions): one column, every section full width, never a guessed pairing.

Enhanced bar. The basic row holds the parameters without `advanced: true` [04 §13.1]; when a definition marks none,
the fallback list is `office_scope`, the primary `date_range` or `report_date`, `report_format`, `report_type`,
`report_by`, `responsible_party_id`, `patient_ids` and every required parameter without a default. Everything else
is under "More options (n)", grouped by section title, where n counts values that differ from the default.
`CriteriaChips` lists every non-default value as a removable chip (long lists collapse to "Carriers (4)").
`output_format` is not shown in the enhanced criteria: it preselects the Export button.

### 4.6 Dependency rules

Fields and semantics: [04 §9.2]. Expressions are the JSON arrays of 02 §3.2, evaluated locally by `paramExpr.ts`
(FLT-05) for immediate feedback and by the server on validate.

| Field | In the form |
|---|---|
| `enabled_when` on a parameter | False: the control is greyed and keeps showing what the user entered; re-enabling restores it. The form may still send the entered value: the server replaces it by `disabled_value` before hashing and execution, so a greyed control never changes the result [04 §9.2] |
| `enabled_when` on an option | The option is greyed; if it was selected the value falls back to the default |
| `visible_when` | False: not rendered |
| `required_when`, `required` | Marked required; Run is blocked with an inline message |
| `forced_when[]` | While the condition holds the control shows the forced value, is locked, and a tooltip says why ("Summary only when Production by = Code") |
| `default_when[]` | Sets the value once when the condition becomes true; the user may change it (Daily Audit ticks Page Break when grouped by provider). Form-side only |
| `label_when[]` | Replaces the label ("Page Break" → "Page Break by Provider") |
| `depends_on[]` | The option list of the control is re-queried when one of the named value keys changes (providers, operatories, labs follow the office keys). A selected value that leaves the list is kept and flagged |
| `validation.allowed_modes`, unconditional `forced_when` | Locks of the office scope (the four Ledger reports, Routing Slip [04 §6.4]) |
| `ctx` facts (`multi_office`, `provider_restricted`, `feature.<flag>`) | Taken from the last validate response when it carries them (requested, §13.4 A-2); until then `multi_office` is derived from the form (group mode, `all`, or more than one office) and the server's `disabled[]` corrects the form |
| Reconciliation | After every validate the greyed set is made equal to `disabled[]` [04 §9.2 "one source of truth"]; a mismatch between local evaluation and `disabled[]` is logged in development builds |

### 4.7 Defaults, validation, Clear Criteria

| Topic | Rule |
|---|---|
| Precedence on open | 1. value keys in the URL; 2. the saved view being opened; 3. definition defaults [04 §10.1]. A user's default view counts as "the view being opened" only when the URL has no value key (§6.3) |
| Legacy defaults | A report opened without URL values and without a default view shows exactly the legacy defaults (AD-8) |
| Context | Working office: `useOfficeScope().office_id`, sent as `working_office_id` on validate, run, resolve, live page, metric query and dashboard data [02 §4.1]. Patient context for the tokens `current_patient*`, `current_responsible_party*` [04 §2.3]: the active patient of `useAuth()` when the report is opened from the patient shell; sent as `context.patient_id` (requested, §13.4 A-1). Without it the token resolves to empty and a required parameter reports `parameter_required` |
| Restore last run | Header menu; loads `params_input` of my most recent run of this report (`GET /reports/runs?scope=mine&report_key=…&size=1`). Never automatic [04 §10.1] |
| Local validation | On blur and on Run: required, date syntax, range order, number bounds, `min_items`, `max_items`. Messages of 04 §10.4 |
| Server validation | `POST /reports/definitions/{report_key}/validate` (#3) 400 ms after the last change. Run waits for the validate of the current values (normally already answered, §9.3) and stays blocked while it reports errors; the run request is validated again on the server in any case. If validate itself fails (network, 5xx, timeout), it is retried once; after a second failure Run is enabled and the run request does the validation. Response `{params, disabled[], errors[], warnings[], cost_class, title, criteria_echo[]}`: `errors[{param, value_key, code, reason, message}]` are shown at the control; resolved dates from `params` are shown beside presets and tokens; `title` updates the page title; `cost_class` drives §4.4 |
| Error placement | At the control (text + `aria-describedby`), plus a summary above the action bar listing each error as a link that focuses its control. The global query-error toast is suppressed for these calls (§9.3) |
| 403 on run | `office_not_assigned` → at the office control: "You are not assigned to {office}." The axios interceptor raises a "Switch to one of yours" toast for every such 403 with no opt-out [V `src/services/api.ts` L60-66], which is wrong for an office that is a report criterion and would repeat on each debounced validate; UX-03 adds a per-request axios config flag `skip_scope_toast: true`, read from `error.config` in the interceptor and set on every module call; with `details.reason = "no_office_assignment"`: "No office is assigned to your user. Ask your administrator." [08 §4.1 S-4]. `report_provider_not_linked` → banner "No Corresponding Provider is set for your user." [04 §10.4]. `permission_denied` → `AccessDenied` naming the labels of `details.required_any_of[]` [08 §3.2]. `data_class_denied` → "This report needs data that your role does not include." (class names are not shown; text fixed here, §13.5) |
| Clear Criteria | Resets every parameter to its definition default, including `output_format` and the office scope; does not empty the form; drops the "Modified" state and detaches the open saved view [04 §10.2]. No confirmation (the legacy has none). An "Undo clear" button stays in the chips row (enhanced) or beside CLEAR CRITERIA (classic) until the next edit or Run, so keyboard and screen-reader users can reach it without a time limit (WCAG 2.2.1); a toast with the same action is an addition. Present on every report, Statements included |
| Office switch | The runner is not remounted and registers no unsaved-changes guard: nothing is discarded. Values that held the token `current_office` follow the new office, explicit ids stay, and the result becomes `stale` |
| Unsaved changes | Applies to editors that would lose work on leaving: dashboard edit mode (§7.1), goal grids (UX-42), builder drafts (UX-43). The app uses `<BrowserRouter>` [V `src/App.tsx` L2], where react-router's `useBlocker` is unavailable, and `useUnsavedGuard` is consulted today only by `switchOffice()` [V `src/features/office-scope/useUnsavedGuard.ts` L42-52; `OfficeScopeContext.tsx` L128]. Decision (UX-49): extend the existing registry instead of moving the app to a data router: `GlobalNav.handleNavClick`, the hub rail links and the module's own in-app links call `confirmDiscardUnsaved("Leave page")` before navigating, and one `beforeunload` listener (installed by the registry while any guard is dirty) covers reload and tab close. The browser Back button is not guarded; editors keep their draft in component state only until saved. A data-router migration is OD-11 |

### 4.8 Run, Preview, favorites, output format

The classic action bar is generated from `legacy_actions[]` [02 §3.1]; the enhanced header offers the same
functions under modern names.

| Legacy action | `maps_to` | Classic frame | Enhanced frame | Calls |
|---|---|---|---|---|
| `PRINT / PREVIEW` | `print` | Button with the legacy label | "Run" (screen only); "Export ▾" and "Print" for files | Classic: run with `render_output: true`; the result appears on screen and the artifact of `output_format` comes back `pending` in `run.artifacts[]`, is followed to `ready` (§6.1), then opens (PDF: viewer tab opened at click time; XLSX, CSV: download) |
| `CLEAR CRITERIA` | `frontend` | Button in the REPORT CRITERIA bar | "Clear criteria" in the chips row | — |
| `ADD TO MY FAVORITES` | `saved_view` | Button; opens `SaveViewDialog` with "Add to favorites" ticked | Star (favorites the report) and "Save view" | `POST /reports/saved-views` (#25) + `PUT /reports/favorites/saved_view/{id}` (#33) |
| `UPDATE MY FAVORITES` | `saved_view` | The same button with this label when the screen was opened from a saved view the caller may edit [04 §9.5 last row] | "Update view" in the Save menu | `PATCH /reports/saved-views/{id}` (#27) |
| Any other entry (`run_format:<value>`, `action:<key>`) | as declared | A button per entry, legacy label | The same entries in the Run split button and the bulk-action bar | Run with `report_format = <value>`; or `POST /reports/runs/{run_id}/actions/{action_key}` (#14) |

| Topic | Rule |
|---|---|
| Output format | `output_format` has `role: output`: changing it never re-runs and never makes a result stale. Classic: the PRINT FORMAT radios in their legacy place decide what PRINT / PREVIEW opens. Enhanced: Export menu, preselected with the value |
| Run without file | The enhanced "Run" sends `render_output: false`. A file is requested afterwards from the stored run (§6.1), so screen, PDF and XLSX show the same rows (AD-5) |
| Rights | `access.can_run` false: the report is not in the catalog. `can_print`, `can_export`, `can_schedule`, `can_share`, `can_commit` false: the control stays visible and disabled, with the reason as tooltip and accessible description; it is never hidden [08 §3.4]. Reasons come from `accessModel.ts` (rules of 08 §2.1): no print → "Printing and exporting need Full Control of {category} reports."; PDF allowed but a data format missing from `access.export_formats[]` → "Excel and CSV need the right Reports - Export Data Files."; no schedule → "Scheduling needs Full Control and the right Reports - Schedule Reports."; no share → "Sharing needs the right Reports - Share Views and Results." A control that the definition itself rules out (`schedulable = false`, a format not enabled in `outputs`) is absent |
| Keyboard | Enter in a text or date field = Run (interactive) when the form is valid; Ctrl+Enter anywhere in the criteria = Run; Esc closes popovers before dialogs |

### 4.9 How the two presentations coexist

| Rule | Detail |
|---|---|
| Same contract | Both frames produce the same `params`, call the same endpoints and render the same result. Parity is tested once, on value keys |
| Navigation entries | The legacy-named menu entries and category tiles open the classic frame (they are category entries). Search results, favorites, recents, saved views and drill links open the frame of the user's preference |
| Preference | `reports_ui.presentation` = `classic` or `enhanced`, stored per user in the preferences blob (`getMyPreferences` / `setMyPreferences` [V `src/api/generated/endpoints/users/users.ts` L697]; survives logout, unlike `localStorage` [A] `fe_cross_cutting.md` §6.4). The blob is replaced as a whole by `PUT` (one stored row, no merge, no version [V `dentc-backend/app/services/my_page_service.py` L137-151]); `useReportsUiPrefs` therefore re-reads, merges and writes only the `reports_ui` subtree (OD-8). Default: `classic` until the organisation default says otherwise (OD-1; an organisation default needs a tenant setting, §13.4 A-8) |
| Per link | `ui=classic` or `ui=enhanced` in the URL wins over the preference; saved views store the frame they were saved in (`layout.presentation`) |
| Enhancements in the classic frame | Present but secondary: presets menu beside the date boxes, search inside the SELECT dialog, the added `csv` option. A run with untouched defaults is the legacy run [04 R5] |
| Legacy-only looks in the enhanced frame | None: `control`, `placement` and section bars are ignored there |

### 4.10 Special cases

| Case | Handling |
|---|---|
| Statements | The legacy screen is not the standard two-panel screen: two tables of criteria, three actions and two buttons, no report list [V observations of `legacy/statements_reports.json`]. `statements.statement_run` uses a registered criteria layout (`criteriaLayoutRegistry["statements.statement_run"]` → `StatementCriteriaLayout`) inside the same `ParamForm`; this is the one planned per-report layout (AD-2 exception). UPDATE STATEMENT DATES and PAPER STATEMENT SENT are bulk actions on the snapshot of a `statements` run (`bulk_actions[]` with `legacy_action` [02 §3.10, §14]), drawn as buttons with their legacy labels once that run exists; UPDATE STATEMENT DATES is served only to holders of `reports_statement_allow_updating_statement_dates` [08 §2.2 A]. FINANCE CHARGES is a parameter of the run |
| Runs with side effects | A format with `side_effects = writes` (format `statements` = legacy PRINT STATEMENTS; the list format `statement_report` = PRINT STATEMENT REPORT writes nothing [02 §5.9, §14]): the button needs `access.can_commit`; a confirmation dialog states what will be stored (number of accounts from validate when available); never auto-run, never "Refresh"; "Run again" from history asks again and sends `confirm_side_effects = true` (else 422 `side_effects_confirmation_required`); not schedulable |
| Provider-restricted reports | `scope.provider_restriction` ≠ `none`: banner "Restricted to {provider} (your Corresponding Provider)"; `corresponding_provider_id` is a `display` parameter |
| Document reports | Layouts `slip` and `statement` (`record_per_page` [02 §3.8]): the screen shows one row per document; "Preview" opens the PDF stream; volumes are listed as separate artifacts |
| Worklists | `kind = worklist` uses the worklist page (§7.5), not the runner |
| Deprecated definition | `status = deprecated`: banner with the replacement when `description` names one; saved views and schedules on it are flagged in the Library |
| Definition changed while open | A run answered with another `definition_version` than the loaded definition: reload the definition, re-apply the form values through validate, show "This report was updated" |

---

## 5. Results

One component, `ReportResults`, renders every succeeded run in both frames, on the snapshot page and (compact) in
the drill panel. It never queries a dataset and never computes a number (AD-1): everything comes from the run and
its stored rows.

### 5.1 What the result is made of

| Part | Source | Notes |
|---|---|---|
| Run context line | `run.data_as_of`, `definition.freshness`, `run.freshness`, `run.row_count`, `run.duration_ms`, `run.reference_time_zone`, `run.cache_hit`, date basis and attributions of the definition | "As of 11/22/2026 09:12 CT · live · 44 rows · 1.8 s · Transaction date · Office of service". Refresh button. A freshness entry with status `pending` adds "includes changes not yet summarised"; `stale` or `failed` shows a warning icon with the dataset and its `last_refresh_at` [02 §10.3] |
| Criteria echo | `run.criteria_echo[]` (`{label, value}`) | Collapsible "Criteria used" block; the same block is printed on PDF and XLSX [04 FLT-18] |
| Notices | `run.warnings[]`, `availability[]`, `access.hidden_data_classes[]`, `preview_only`, saved-view `notices[]` | §5.8 |
| Summary cards | `run.summary` (cards of the active report format) | 3 to 6 `KpiCard`s in compact mode. A card value is a block total of this run, nothing else [02 §3.7]; a card with `drill` is clickable |
| View switch | `charts[]` of the active report format; blocks of the run | Table · Chart (when `charts[]` is not empty). A block selector appears when the run has more than one block: "Print order" (default) or one block |
| Toolbar | — | Expand all, Collapse all (grouped), Density, Columns, Quick filter (flat main block only), Export, Print |
| Table | `GET /reports/runs/{run_id}/rows` → `ReportResultPage` | §5.2 |
| Grand total bar | `run.totals` (main block) | Pinned under the table, aligned to its columns, available before the last page is loaded |
| Footer | `page.row_count`, `page.snapshot_row_count` | "Rows 1-200 of 1,284 · totals cover all rows" |
| Side panel | Drill results, row detail | §5.5; non-modal, so the table stays in view |

### 5.2 The table

The stored result is one print stream [02 §6.1]: the rows of all blocks in print order, each row
`{n, b, k, l, g, c}` (`n` = `row_no`, `b` = block index into `blocks[]`, `k` ∈ `detail`, `group_header`, `subtotal`,
`grand_total`, `note`, `l` = group level, `g` = group key values, `c` = cells in the order of that block's columns).
`ResultTable` is a renderer of that stream.

| Topic | Design |
|---|---|
| Markup | A native `<table>` with `<thead>` for the main block's columns; results are read-only, so no grid role (§9.7). Virtualised rows keep `aria-rowcount` and `aria-rowindex` |
| Scroll box and bypass | The table's scroll box is `role="region"` with `aria-label` "{report title} results" and `tabindex="0"` (axe `scrollable-region-focusable`), scrollable by PageUp / PageDown / Home / End. A "Skip table" link before it moves focus to the grand total bar / footer (WCAG 2.4.1), so a keyboard user never tabs through every cell link, row checkbox and row menu to reach the footer or bulk bar |
| Focus and virtualisation | The virtualiser's rendered range always includes the index of the focused row, so focus is never dropped to `body` when that row scrolls out of the window |
| Paged view | Per-user preference `reports_ui.table_mode` = `virtual` (default) or `paged`: 200 rows per page with Previous / Next and no virtualisation, so screen-reader table navigation reaches every row of the page. Same rows endpoint and page maths |
| Rows by kind | `detail`: cells by column `type`. `group_header`: one spanning cell with the header text, indented by `l`, with the expand toggle. `subtotal`: label cell + totals in their columns, bold, top rule. `grand_total`: as subtotal, stronger rule. `note`: spanning text |
| Rows of another block | A change of `b` switches the column set, as it does for the PDF renderer. Rows with `b` ≠ 0 (`after_group` trailers such as "Total Production Adjustments", `report_start` / `report_end` blocks) are drawn as an inset band with that block's own column template; the `note` row that opens the band shows the block title and, on the same line, that block's column labels. `key_value` blocks draw label and value pairs |
| Cells | Values are display-final strings [02 §3.3]: the client never rounds, sums or converts a time zone. It only decorates: thousands separators and the `negative` style for `money` / `decimal`, `%` for `percent` with the decimal point shifted two places on the served fraction string (string operation, no floating-point arithmetic [02 §3.3]), `pattern` for `date` (string parts, never `new Date("YYYY-MM-DD")`), the zone already contained in a `datetime`, `labels` for `enum`. `null` shows `null_display` or an em dash, never 0. Numbers are right-aligned with tabular numerals; text left; headers follow their column. Cells are single-line with ellipsis (long texts of Progress Notes, Patient's Notes, Audit Trail); Enter on a focused row, or its "Row details" button, opens every column of the row untruncated in the side panel (§5.1), which also serves WCAG 1.4.12 text spacing |
| Links | A column with `entity` or `drill` renders a link-styled button (§5.5). Office columns render the served text (short id or name) as plain text, identical to the export. `OfficeBadge` [V `src/features/office-scope/OfficeBadge.tsx`], which prints "Other office: …" in amber for every non-working office (L33-42), is used only on worklist rows (§7.5) |
| Sticky parts | The scroll container is the table's own box with a fixed height (fill to the viewport bottom, §9.5); `thead` is `sticky top-0`; columns pinned left (default: the first visible column) are `sticky left-0` with a shadow; the grand total bar sits outside the scroll box |
| Paging | Server snapshot, never client paging over a partial set. Natural order: `row_no` is dense, so page `p` is `after = p × size` with `size = outputs.screen.default_page_size` (200; maximum 500): any scroll position can be fetched directly. With `sort`, `q` or `block`: sequential pages through `next_after`. The first page arrives with the run response |
| Virtualisation | One virtual item per stream row; fixed row height per density (no per-row measurement, §10.2); overscan 10 rows; unloaded rows render a skeleton line; a rows page that fails renders one inline band "Rows 401-600 could not be loaded — Retry" in its place. At most 50 pages (10,000 rows) are kept in memory; farther pages are dropped and re-fetched |
| Density | `compact` 32, `standard` 40, `comfortable` 48 layout px (24, 30, 36 px on screen at zoom 0.75; 32 layout px is the smallest row that keeps a 24 px target, §9.7). Default from `outputs.screen.density`, then the user's layout |
| Grouping | Bands come from the server (`group_header`, `subtotal`); the client never regroups. P0: all groups expanded. P1: expand / collapse per group and "Collapse all" (outline of headers and subtotals); needs the group extent on `group_header` rows and a row-kind filter on the rows endpoint (§13.4 A-4). Until then "Collapse all" is offered only when every row is loaded (`snapshot_row_count` ≤ 2,000). A further grouping level beyond `group_by` is not offered on screen in P0-P3 (it would be client aggregation); it arrives with the builder |
| Sorting | Flat main block (no group level, no other block) and `sortable` column: header button sends `sort` and `dir` to the rows endpoint; `aria-sort` on the sorted header only. Grouped or multi-block result: the header menu lists the report's `sort_options[]`; choosing one changes the `sort_by` parameter and re-runs (the menu says so). Sorting is never done in the browser |
| Quick filter | `q` on the rows endpoint, flat main block only; matches are highlighted; the footer says "Filtered: 37 of 1,284 rows · totals cover all rows" |
| Column chooser | Show / hide, order (move up / move down buttons; drag is an addition, never the only way), pin left, reset; shows "n hidden". Columns with `default_visible = false` start hidden. Widths by dragging the header edge (delta divided by `uiZoom()`, the pattern of `TxPlanGrid` [V `src/features/treatment-plans/TxPlanGrid.tsx` L108-120]) or by keyboard on the focused handle. State is the `layout` of §6.3. Hiding a column is presentation only: columns the caller may not see are never sent [02 §3.3] |
| Selection | A checkbox column appears when the definition has `bulk_actions[]`; header checkbox = loaded rows; a banner offers "Select all 1,284 rows" (`selection.mode = all`) |
| Copy | Ordinary text selection in cells works and is not restricted. The module offers no "Copy all rows" command: for a block with a patient-level class it is ruled out, and the user is pointed to Export, which is audited [08 §7.1 X-10] |
| Preview only | `preview_only = true` (result above 50,000 stored rows): the first 1,000 rows are on screen; totals, cards and exports are complete (§5.8) |

### 5.3 Chart view

| Topic | Rule |
|---|---|
| Source | `charts[]` hints of the report format (`{key, kind, block, category_column, value_columns[], top_n}`); the series are computed on the server from the snapshot and arrive in `run.summary`. The browser draws, it does not aggregate |
| Kinds | `bar`, `stacked_bar`, `line`, `area`, `pie`; an unknown `kind` shows the table and fails the contract test |
| Rendering | `ChartFrame` on Recharts, loaded lazily when the tab is first opened; numeric height and `minWidth={0}` ([A] `fe_existing_reports.md` §5 #8) |
| Accessibility | Every chart has "Show as table" (the Table tab is the same data) and a one-line generated summary; series differ by more than colour (dash or marker); values on hover and on keyboard focus |
| State | The active tab and chart key are view state (`_tab`, `_chart`) and part of the saved layout |

### 5.4 Matrix and key-value blocks

`shape = matrix` blocks arrive with dynamic columns in `run.blocks[].columns` (each with `pivot{member,
value_column}`) and optional row and column totals [02 §4.4]. They are rendered by `PivotMatrix` (§8.3): sticky row
header columns (`row_keys`), sticky column header, `null` cells as an em dash, row totals at the right, column totals
at the bottom, horizontal scroll inside the component. 422 `too_many_pivot_columns` is shown as "More than {max}
columns — narrow {column label}". The trailing-12-month grid of §7.4 is the same component fed by a metric query.

### 5.5 Drill-through

| Step | Design |
|---|---|
| Trigger | Click (or Enter) on a cell whose column has `drill`, on a subtotal or grand total of such a column, or on a summary card with `drill` |
| Resolution | `POST /reports/runs/{run_id}/drill` with `{drill_key, row_no, column_key}` (`row_no` is unique in the print stream); the server reads ids from the snapshot (hidden columns are never in the browser) and authorises the target |
| `kind = rows` or `report` | The response `{report_key, params}` is run with `parent_run_id` and shown in `DrillPanel`: title, criteria echo, a compact `ResultTable`, row count, and the reconciliation line "Total 12,431.00 = the number you clicked" (or the itemised difference when the target says so). "Open as full report" opens `/reports/runs/<drill run_id>`; "Edit criteria" opens the runner with the params. A target whose definition has `kind = worklist` (many metric drills, 06 §2.0.4) has no snapshot: the panel shows its first live page (#21) with the count, and "Open worklist" goes to `/reports/worklists/<report_key>` with the params; actions are offered on the worklist page only |
| `kind = record` | Navigate through `recordRoutes.ts` (`route_key` → target): `patient_overview` → `/patient/:patientId/overview`, `patient_ledger` → `/patient/:patientId/ledger`, `patient_account_ledger` → `/patient/:patientId/account-ledger`, `claim` → `/patient/:patientId/claim/:claimId`, `treatment_plan` → `/patient/:patientId/treatment`, `progress_note` → `/patient/:patientId/progress-notes/view/:noteId` (route patterns as they exist [V `src/App.tsx` L185-221]); `appointment` → `openSchedulerAtAppointment(navigate, {appointment_id, date, office_id})` and `scheduler_booking` → `openSchedulerForBooking(navigate, {patient_id, plan_item_ids, …})` [V `src/services/schedulerHandoff.ts` L134, L85]; `scheduler_day` → NEW `openSchedulerAtDate(navigate, {date, office_id})` in the same file (heatmap cells, 06 §2.8). Path targets open in a new tab on Ctrl-click or middle click (`onAuxClick`), so the report keeps its place: because the target is resolved by an async drill call and a `window.open` after an `await` is blocked [V `src/features/print/serverReport.ts` L10-11], the blank tab is opened synchronously in the click handler and navigated when the drill resolves, and closed on refusal or error; the three Scheduler targets pass router state and open in the same tab. Values a target needs beyond `id` (patient id, date, office) arrive in `params` of the drill or action response. An unknown `route_key` fails the contract test |
| Stack | A drill inside the panel pushes a level; the panel shows a breadcrumb; Back restores the previous level and its scroll position. The stack is view state (`_drill` = run id of the top level) |
| Refusal | 403 on the target → "You do not have access to the underlying list" in the panel; the clicked number stays |
| Multi-office | Drill works for any office selection because the target run inherits the resolved scope of the parent |

### 5.6 Row and bulk actions

| Topic | Design |
|---|---|
| Declaration | `row_actions[]`, `bulk_actions[]` of the definition (`kind` ∈ `navigate`, `create_task`, `send_sms`, `send_email`, `letters`, `postcards`, `labels`, `export_selection`, `custom:<handler>` [02 §3.10]) |
| Row actions | One action: an icon button in the last column; more: a menu button. `navigate` resolves through the action endpoint (ids are not in the browser) and then through `recordRoutes.ts` |
| Bulk bar | Appears above the footer when rows are selected: "187 selected · Letters · Labels · Send text · Create task · Clear" |
| Confirmation | `BulkActionDialog` shows the action's `confirm` text and the counts before anything is sent: "212 selected · 187 will receive a text · 25 skipped (no mobile number or no consent)". Counts come from a dry run of the action endpoint (§13.4 A-5). Above `max_selection` the action is disabled with the limit shown |
| Execution | `POST /reports/runs/{run_id}/actions/{action_key}` with `{selection{mode, row_nos[]}, payload{}}` → `{accepted, count, excluded[], result_ref}`; the hand-off screen of the owning feature (letters batch, SMS composer, task form) opens with `result_ref`. Long actions report through the owning feature's own job view |
| Rights | An action whose `right_code` the caller lacks is not served [08 §3.4]; nothing is disabled without an explanation. A caller whose patient access level is `read_only` is refused writing actions with 403 `permission_denied` (`details.reason = "patient_access_read_only"`): "Your access to patient records is read-only." [08 §4.4] |
| Worklists | After an action that resolves a row the live list refetches and the row leaves (§7.5) |

### 5.7 Export and print from the result

Covered in §6.1. The toolbar buttons act on the run on screen; they never start a new run.

### 5.8 Limits, notices and failure messages

There is no silent truncation: a result is complete or the run fails [02 §4.5]. The frontend adds no limit of its
own.

| Situation | Signal | Text and actions |
|---|---|---|
| Result larger than the screen store | `preview_only = true` | "Showing the first 1,000 of {snapshot_row_count} rows. Totals and exports cover all rows." · Export |
| Columns removed by access | `access.hidden_data_classes[]` not empty | "Some columns are hidden for your role." One notice; neither columns nor classes are named [08 §3.4] |
| Scope reduced | saved-view or schedule `notices[]` with `scope_reduced` | "3 of 5 saved offices are included; 2 are outside your access." |
| Saved values dropped or migrated | `notices[]` with `reference_removed`; `migrated = true` | "2 saved providers are no longer available." · "This view was adjusted to the current version of the report." |
| Migrated-history limits | `availability[]` entries that apply; `warnings[]` | The entry's `message` |
| Stale criteria | §4.3 | "Criteria changed — Run to update." |
| Empty result | `row_count = 0` | "No records match." + the criteria echo + one-click relaxations taken from the criteria (widen the dates to month to date, set providers to All); never an empty table and never while still loading |
| Run failed: `report_timeout` | `run.error_code` | "The report took too long. Narrow the dates or offices." · from P2: "Run in background" |
| `report_too_large_for_inline` (before P2) | same | "This selection is too large to run on screen. Narrow the criteria." |
| `row_limit_exceeded` | same | "More than {max_rows} rows. Narrow the criteria." |
| `transient_db`, `worker_lost`, `definition_version_mismatch` | same | "The run was interrupted. Run again." |
| `deadline_exceeded` | same | "Stopped after the time limit. Use a narrower range." |
| `enqueue_failed` | same | "The report could not be queued. Try again in a few minutes." |
| `definition_error`, `audit_unavailable` | same | "This report is unavailable right now." + run id for support |
| 429 `report_concurrency_limit` | HTTP | §4.3; for `details.kind = render`: "Another export is being prepared. Try again in {Retry-After} s." |
| Export refused | 422 `pdf_too_large`, `xlsx_too_large`, `export_too_large_for_inline` | "Too many rows for a PDF — use Excel or CSV." · "Too large for Excel — use CSV." · "This export needs background processing, which is not enabled yet — use CSV or narrow the criteria." |
| Export needs a purpose or a right | 422 `purpose_required` with `details.triggers[]`; 403 `bulk_export_not_permitted`; 409 `manifest_unavailable` [08 §7.2, SEC-09] | The purpose prompt of §6.1 opens and the request is repeated · "This export covers more patients than one file may hold with your access. It needs the right Reports - Bulk Patient Export." · "The export cannot be prepared right now. Try again." |
| Export failed | artifact `failed` (`render_error`, `storage_error`, `snapshot_gone`, `worker_lost`); 409 `run_layout_unavailable` | "The export failed. Try again." · for `snapshot_gone` and 409: "Run the report again to export." |
| Expired | 410 `run_expired`, `artifact_expired` | "This result has expired." · Run again |

Every failure panel shows the plain reason, the action, and the `run_id` (and `request_id` when the response has
`X-Request-ID`); the last good result stays on screen below it, labelled with its time.

### 5.9 Loading and waiting

| Wait | Feedback |
|---|---|
| Under 1 s | None |
| 1 to 10 s | Skeleton of cards and table; a previous result stays visible but dimmed; `aria-busy` on the results region |
| Over 10 s (inline) | `RunStatusPanel`: elapsed time, Cancel; from P2 also "Run in background instead" (cancels and starts the same criteria with `mode = background`) |
| Queued or running in the background | `RunStatusPanel`: queue position, phase (`query`, `snapshot`, `render`, `deliver`), `progress_pct` when determinate, rows processed; "You can leave this page — the result will be in your run tray" |
| Finished while away | Tray badge, notification entry, and a toast with "Open" when the user is still in the app |
| Announcements | "Running", "{row_count} rows returned", "No records match", "Export ready" go to one polite live region; failures use `role="alert"` without moving focus |

### 5.10 URL state

| Part | Keys | Owner |
|---|---|---|
| Criteria | Every value key with its declared value (lists as repeated keys, tokens and presets as written, ids only, never names); absent keys take the default; the `current_office` default is simply absent [04 §12]. Exception: value keys of a parameter served with `url_safe = false` are never written to the URL, because they can hold a patient name and URLs may carry ids only [08 §1.2 T-9]. `url_safe` defaults to `false` when the parameter's `data_class` is patient-identifying and to `true` otherwise (requested, §13.4 A-15), so id-like text keys (`treatment_plan_id`, `order_id`, `phase_id`, `facility_id`, `group_number`, `zip_code_from` / `zip_code_to`) stay in URLs while name ranges do not. A copied link opens with those keys at their defaults and the page names what was left out; in-app frame switches carry them in router state (§4.1); saved views store them | `paramCodec.ts` (FLT-19) |
| View state | Keys that start with an underscore, so they can never collide with a value key (parameter keys start with a letter [02 §3.2]): `_run` (run on screen), `_view` (saved view id), `_tab` (`table` or `chart`), `_chart`, `_block`, `_sort`, `_dir`, `_row` (first visible `row_no`), `_drill`. The quick-filter text stays in memory only (it can be a patient name) | `urlState.ts` (UX-21) |
| Frame | `ui` (`classic`, `enhanced`); `report` on the category page | routes |

| Rule | Detail |
|---|---|
| History | Criteria edits replace the current history entry; Run pushes one entry, so Back returns to the previous result. Opening a drill level pushes; closing pops |
| Reload | With `_run`: the stored run is shown at once ("cached result first") with its as-of time and Refresh, and the form is hydrated from the run's `params_input` (so `url_safe = false` values come back and the result is not falsely stale, §4.3); without it an `interactive` report opens `idle` with the criteria from the URL |
| Live link | "Copy link" without `_run`: the recipient sees the criteria and runs with their own rights; values outside their rights are dropped by validate with a notice. The URL holds keys, ids, tokens and presets; no name and no free text |
| Snapshot link | `/reports/runs/:run_id`: immutable rows and as-of time; viewable only when `can_view_run` holds; shows its expiry date and "Open live report" |
| Layout | Column layout is not in the URL (it can exceed safe lengths); it travels with a saved view |

---

## 6. Export, print, schedules, saved views, favorites, sharing

### 6.1 Export and print

| Topic | Design |
|---|---|
| Entry points | Export menu and Print button of the result toolbar; PRINT / PREVIEW of the classic frame; "Download" in the run tray and run history |
| Formats | Those enabled in `outputs` (`pdf`, `xlsx`, `csv`); the menu is preselected with `output_format`. A format the caller may not produce is shown disabled with its reason (§4.8) |
| Quick export | Menu items "PDF", "Excel", "CSV" export with `export_shape = full` and the report's defaults in one click, for use inside the organisation; "More options…" opens `ExportDialog`, where a recipient outside the organisation is declared |
| `ExportDialog` ("More options…") | `export_shape` from `export_shapes[]`: `current_view` (my sort, quick filter and column choice), `full`, `summary_only`; `orientation`; `page_break_by` (values of `page_break_options[]`); `include_criteria`; `block` for CSV when the run has more than one block. The dialog states the row count and, for `record_per_page` layouts, the number of volumes |
| Purpose prompt | Rules of 08 §7.2. The server answers 422 `purpose_required` with `details.triggers[]` (`bulk`, `sensitive`, `audit`, `wage`, `external`); `PurposePromptDialog` then collects `purpose_code` (vocabulary of 08 §6.5) and `purpose_note` (mandatory, at least 10 characters, for `bulk`) and the request is repeated. `ExportDialog` asks "Is this file for someone outside the organisation?"; yes makes a purpose and `external_recipient{name, organization, address}` mandatory before the request. For PRINT / PREVIEW the purpose travels on the run request (#5); on the artifact request (#15) the fields are requested by 08 from 02 (§13.5) |
| Export notice | `ExportDialog` and the "Export ready" message state: "A downloaded file is outside the system's control." with the artifact's `watermark_id`, which is also printed in the file and is part of `file_name` [08 §7.1 X-6, X-11, §7.3] |
| Step-up (P2) | When the tenant sets `step_up_minutes` above 0, a bulk export, a run of an `audit`-family report and a change of settings ask for the password again [08 SEC-32]. `StepUpDialog` is built with SEC-32, which defines the refusal code and the re-check endpoint (§13.4 A-7) |
| Request | `POST /reports/runs/{run_id}/artifacts` `{format, options{export_shape, block, orientation, page_break_by, columns[], include_criteria, sort, dir, q}}` → `ReportArtifactRead`. The same request returns the same artifact (idempotent), so a double click is harmless |
| PRINT / PREVIEW | The run was created with `render_output: true`, which only creates the `pending` artifact row; the runner then issues the request above with the same options and follows it [02 §7.1] |
| Following an artifact | `ready`: download at once. `pending` / `rendering`: poll `GET /reports/artifacts/{artifact_id}` (1 s, then 2 s, then 5 s; socket envelope `report.artifact.ready` short-cuts), show "Preparing PDF…" in the toolbar and in the tray; the user may continue working. `failed`: message of §5.8 |
| Download | `GET /reports/artifacts/{artifact_id}/download` as a blob through the generated client (bearer token in the header; no token or parameter value in a URL [08 §7.1 X-3]); saved with `ReportArtifactRead.file_name`. The Orval mutator returns the body only [V `src/api/mutator/axiosInstance.ts`], so the name is taken from the read model, not from `Content-Disposition`. The object URL is revoked after the save; a file is never kept in `localStorage`, `sessionStorage` or IndexedDB. With `responseType: blob` an error body (410 `artifact_expired`, 403 `bulk_export_not_permitted`, 409 `manifest_unavailable`) also arrives as a Blob, so `artifactService` parses it (`await blob.text()`, then `JSON.parse`) before the message map reads `error.code` |
| Print | Same endpoint with `intent=print`. A tab is opened at click time (popup blockers), shows "Preparing…", receives the blob URL and calls `print()` — the contract of `openServerReport` [V `src/features/print/serverReport.ts`], generalised as `openReportArtifact({ artifact_id, intent, label })` without a client fallback (the browser never renders a report, AD-1). Blob URLs are allowed in frames by the production CSP [A] `fe_cross_cutting.md` §2.8. States: table below |
| Volumes | An artifact with `volume_count` > 1 is listed as "Statements 1 of 16 … 16 of 16" with one Download each and "Download all" (sequential) |
| Same rows everywhere | Files are rendered from the stored run, so screen, PDF, XLSX and CSV agree (AD-5). The dialog never offers "re-run and export" |
| What the frontend does not do | No jsPDF, no SpreadsheetML, no client CSV in this module (lint rule in §9.2). No `window.print()` of a report page: the only `print()` call is in the tab that shows the server PDF. No "Copy all rows" (§5.2) |

`openReportArtifact` states (PDF viewer tab for PRINT / PREVIEW and Print; XLSX and CSV never open a tab):

| Situation | Behaviour |
|---|---|
| Before the click | A tab is opened at click time only for PDF, only when the last validate reported no error and the effective `cost_class` is not `background`; otherwise no tab is opened and the artifact follows §6.1 "Following an artifact" |
| `window.open` returns `null` (popup blocked) | No tab; when the artifact is ready an inline "Open PDF" button appears in the toolbar (a new user gesture) |
| 422 `purpose_required`, the step-up refusal (P2), 422 parameter errors, 403 | Close the tab, focus the opener, show the dialog or message there; the dialog's confirm click (a new gesture) opens a new tab and repeats the request |
| Run `queued` or promoted to background, or the artifact not `ready` after 10 s | Write "This report is being prepared — it will be in your run tray" into the tab and close it after 3 s; the artifact is then opened from the tray or the "Export ready" toast |
| Run `failed` / `cancelled`, artifact `failed` | Close the tab; message of §5.8 in the opener |
| `ready` | Navigate the tab to the blob URL; `intent = print` calls `print()` there |
| The runner unmounted meanwhile | The tab is closed, never navigated |

### 6.2 Scheduled delivery (P2)

| Topic | Design |
|---|---|
| Entry | "Schedule" in the runner header and in the Library row of a saved view; `definition.schedulable` must hold; without `access.can_schedule` (Full Control plus `reports_schedule_own` [08 §3.2]) the button is disabled with its reason (§4.8) |
| What is scheduled | The schedule's own copy of criteria and layout [02 §9.2]: the criteria on screen (`params` + `layout` in the create request) or those of a saved view (`saved_view_id`, kept as provenance). Editing the view later does not change the schedule; "Update from saved view" copies it again |
| `ScheduleDialog` fields | `name` (hint "Do not enter patient information": names appear in e-mails [08 §7.3]) · When: `recurrence_kind` (`daily`, `weekly` with weekdays, `monthly` with day or "last day", `cron` as an advanced text field) and time, stored as `cron_expression`; `time_zone` (default: the working office's zone) · Period: shown read-only from the date preset of the criteria ("Last week — resolved at each run"); a fixed date range triggers a warning "This schedule will send the same dates every time" · Offices: `office_policy` `fixed` (the resolved offices are listed) or `assigned_offices`; `follow_working_office` cannot be scheduled, so criteria that follow the working office make the user choose one of the two · `output_formats[]` · Recipients (`recipients[]`: users and groups, internal only) · `delivery_channels[]` (`in_app`, `email`) · `skip_if_empty` · `ends_on` (default one year) · `purpose_note` (why the report is sent regularly; mandatory when the definition holds a patient-level class [08 §7.2]) |
| Summary line | "Every Monday between 07:00 and 07:15, office time (America/Chicago) · Last week · Hamilton, Moon · PDF · 4 recipients". The 15-minute window is the load spreading of 02 §9.2. Presets are summarised locally by `scheduleModel.ts`; the sentence and next occurrences of a free `cron` schedule are taken from `ReportScheduleRead` (server-computed, requested §13.4 A-16), because no cron parser is added (§10.1) |
| Privacy text | Fixed sentence in the dialog: "E-mails contain a link and no patient data. Recipients sign in to open the report and see it only if their access covers it." (PD-12). After sign-in the recipient lands on the linked page (§2.3, UX-48) |
| Test | After saving: "Send test to me" = `POST /reports/schedules/{id}/run-now` |
| Schedules page | Tabs `mine`, `delivered` (`GET /reports/deliveries?scope=to_me`), `all` (`reports_schedules_manage_all`); kind filter Report · Digest · Alert [06 §7.2]. Columns: name, report and view, owner, recipients, when, next run, last run with status, formats, active. Row menu: Send test to me, Edit, Pause / Resume, Update from saved view (`POST /reports/schedules/{id}/sync-from-view`, owner only), Take over (`reports_schedules_manage_all`), Delete, History |
| Digests and alerts | Both are `report_schedules` rows and are listed here [06 §7.2]. "Subscribe" in a dashboard header opens `ScheduleDialog` on the dashboard's twin report (digest, P2, DASH-17). "Alert me" on a card, matrix cell or scorecard column opens the alert form of DASH-41 (P4). The detail panel of an alert lists its firings with the value at each firing, acknowledgements and snoozes |
| Paused schedules | A banner per `paused_reason`: `owner_inactive` / `right_revoked` / `scope_lost` → "Take over" for holders of `reports_schedules_manage_all`; `failures` → last error and "Resume"; `definition_changed` → the notices of resolve, "Review and resume" opens the criteria in the runner |
| History | `GET /reports/schedules/{id}/runs`: per occurrence the run status (including `schedule_missed`), `last_status` values `empty` and `scope_reduced` ("offices reduced: 3 of 5"), and per recipient and channel the delivery status: `sent`, `failed`, `skipped_empty`, `skipped_not_authorized`, `skipped_inactive`, `skipped_no_transport`, with a link to the stored run |
| Send a finished run | "Share → Send to people" (needs `reports_share` and `can_view_run()` [08 §8]): `POST /reports/runs/{run_id}/deliveries` `{user_ids[], channels[], note}`; recipients who cannot view the run are reported back and not notified |
| Limits | Minimum interval 60 minutes; 25 schedules per user: the dialog shows "12 of 25 used" |

### 6.3 Saved views (P1)

A saved view = criteria with tokens + office policy + layout, stored on the server [02 §8].

| Topic | Design |
|---|---|
| View chip | Runner header: "View: Month-end by office ▾"; "Modified" appears when criteria or layout differ from the stored view; menu: Save, Save as…, Revert, Rename, Set as my default, Manage views |
| `SaveViewDialog` | `name`, `description` (hint "Do not enter patient information" [08 §7.3]) · Dates: for each range "Keep relative: Month to date" (stores `date_preset`) or "Freeze: 11/01/2026 – 11/22/2026" (stores `date_from`, `date_to`, `date_preset = "custom"`); the default is relative whenever a preset is selected, which fixes defect D1 of the old runner [A] `fe_existing_reports.md` §2.11 · Offices: "Follow my working office" (`follow_working_office`), "Always these offices: Hamilton, Moon" (`fixed` + `office_scope`), "My assigned offices" (`assigned_offices`); the default follows the form state as mapped in 04 §6.1 · "Include column layout" · "Add to favorites" · "Make this my default view" |
| Opening a view | `GET /reports/saved-views/{id}` gives the declared values for the form; `POST /reports/saved-views/{id}/resolve` with `{working_office_id}` gives `{params, notices[], migrated}`. Values named in `notices[]` are removed from the form and listed in a banner (§5.8); nothing left → the 403 is shown as "This view no longer applies to your access" |
| Default view | When a report is opened with no value key in the URL: the user's `is_default` view, else the organisation's `is_org_default` view (when it resolves for the caller [08 §8]), else the legacy defaults. An applied default is always visible in the view chip ("default"), and Clear Criteria returns to the legacy defaults (OD-6) |
| Legacy buttons | ADD TO MY FAVORITES / UPDATE MY FAVORITES (§4.8). A view created this way follows the working office unless the user chose explicit offices in the form, which removes the legacy trap of favorites pinned to the office they were saved in [R] `denticon_analytics_and_dso.md` §5 |
| Delete | Owner only, after a confirmation. Schedules keep their own copy of the criteria [02 §9.2], so a view that schedules were created from can be deleted; the dialog names those schedules (`saved_view_id` of my schedules) |
| Versioning | A view of an older `definition_version` opens through `resolve`; the banner lists what was renamed, mapped or dropped |
| Dashboards and worklists | The same chip, dialog and rules apply to dashboards (`object_type = dashboard`; a dashboard view follows the working office by default [06 §3.6]) and to worklists, which are report definitions ("My queue" = a view with `assigned_user_ids = current_user` [06 §6.2]) |

Content of `layout` (owned by this document; at most 16 KB; the engine drops unknown column keys [02 §8.2]):

```json
{"layout_version": 1,
 "presentation": "enhanced",
 "density": "standard",
 "active_tab": "table", "chart_key": null,
 "criteria_collapsed": true,
 "blocks": {"main": {"columns": [{"key": "procedure_code", "visible": true, "width": 96, "pinned": "left"},
                                 {"key": "description", "visible": true, "width": 280, "pinned": null},
                                 {"key": "avg_duration", "visible": false, "width": null, "pinned": null}],
                     "sort": {"column": "charges", "dir": "desc"},
                     "collapsed_levels": []}}}
```

| Rule | Detail |
|---|---|
| Column keys live at `blocks.<block_key>.columns[].key` and `blocks.<block_key>.sort.column` | The only paths the engine inspects |
| Order of `columns[]` is the display order; columns of the run that the layout does not name are appended in definition order | Survives added columns |
| `width` in layout px; `null` = automatic | Zoom-independent |
| `layout_version` is migrated by `layoutModel.ts`; an unreadable layout is ignored with a console warning, never an error | — |
| A view saved without "Include column layout" stores `layout = null` | The user's last layout for that report then applies (kept in the preferences blob under `reports_ui.layouts[report_key]`, last 30 reports, column visibility, order and pinning only; written debounced 2 s by read-merge-write, §4.9, OD-8) |

Dashboards store a different blob through their own endpoint (§7.1).

### 6.4 Favorites and recents (P1)

| Topic | Design |
|---|---|
| Favorite | Star on every hub card, runner header, dashboard header, Library row. Object types `report`, `saved_view`, `dashboard`, `custom_report`: `PUT` / `DELETE /reports/favorites/{object_type}/{object_key}` with an optimistic update |
| Order | Library › Favorites: "Move up", "Move down" and drag; `PUT /reports/favorites/order`. The hub start strip shows the first eight. The first favorite of type `dashboard` is the user's home dashboard [06 §10] |
| Recents | Written by the server on run and on dashboard data [02 §8.2]. "Continue" rows show title, the criteria summary of the last run and its as-of time, with "Open result" (`last_run_id`, when not expired) and "Run again". "Clear recents" = `DELETE /reports/recents` |
| No longer available | A favorite or recent whose object has left the caller's catalog is greyed ("No longer available with your access") and can only be removed [08 §8] |
| Empty states | Each list explains what will appear and offers the action ("Star a report to pin it here") |

### 6.5 Sharing (P2)

| Way | Design |
|---|---|
| Share a saved view | `ShareDialog`: `visibility` `private`, `shared` (grantees: users and groups of the organisation; `permission` `view` or `edit`; needs `reports_share`) or `organization` (needs `reports_share_organization`); `PUT /reports/saved-views/{id}/shares`. Recipients find it under Library › Shared with me and may run and duplicate it. An `edit` grantee may change criteria and layout; ownership, visibility and the share list stay with the owner (SH-3). A shared view never widens access: `resolve` applies the recipient's rights and drops what they may not use. A view whose criteria name a patient or responsible party (`patient_ids`, `responsible_party_id`, a name range) cannot be published to the organisation or made the organisation default: the option is disabled with that reason (SH-1) [08 §8] |
| Copy link | Live link or snapshot link (§5.10) |
| Send a run | §6.2, row "Send a finished run" |
| Custom reports | Same dialog on `PUT /reports/custom-definitions/{id}/shares` (P5) |

---

## 7. Dashboards, worklists and the widget frame

Content is owned by `06_dashboards.md`: the 16 dashboards and their tiles (06 §2), the shared tile components (06 §3),
goals (06 §4), worklists (06 §6), alerts and digests (06 §7), the assistant (06 §8). This section fixes what 06 leaves
to this document: routes and page chrome, the tile frame, the generic primitives the tile bodies are built on, the
matrix interaction and the layout blob. Division of work: `UX-nn` items build the frame and the primitives
(`DashboardPage`, `DashboardTile`, `tileRegistry`, `PivotMatrix`, `ChartFrame`, `DrillPanel`, the worklist page shell);
`DASH-nn` items build the tile bodies, the dashboard header and the worklist dialogs (§7.3).

### 7.1 Dashboard page

| Part | Design |
|---|---|
| Key and route | `dashboard_key` is the full key (`dashboards.main`, `dashboards.provider`, … [06 §2.0.6]) and is used verbatim in `/reports/dashboards/:dashboard_key`, in favorites and in saved views (`object_type = dashboard`) |
| Definition | `GET /analytics/dashboards/{dashboard_key}`: `parameters[]`, `views[]`, `sections[]` and tiles `{tile_key, section_key, view_keys[], kind, title, size, query \| list_report, drill, matrix_key, block_key, visible_when, phase, requires[]}` [02 §10.4; 06 §2.0.1] |
| Header | The parameters of 06 §2.0.2 (`office_scope`, `date_range`, `as_of`, `compare_to`, `provider_ids`, `production_group`, `time_grain`, `periods_back`) rendered by the same `ParamForm` in bar layout. Live apply: a change triggers the data call after 400 ms; popovers apply on close. Below `@rpt-md` the bar collapses behind "Filters (n)" with an Apply button. Built by DASH-06 inside the page frame |
| View tabs | `views[]` as tabs under the header (`_tab` = `view_key`): a view filters the tile list and may fix parameters; the Morning Huddle has four |
| Data | One call `POST /analytics/dashboards/{dashboard_key}/data` with `{working_office_id, params}` → `{data_as_of, tiles{tile_key: {status, result \| error}}}`. A tile with `status = error`, `timeout` or `busy` shows its own state with Retry (`tiles: [tile_key]`); the others are unaffected; `busy` retries once by itself after `Retry-After`. 429 `analytics_busy` for the whole call: the previous data stays, "Busy — retrying" is shown and the call is repeated after `Retry-After` |
| Freshness | Header line "Updated 09:10 · live" from `data_as_of` (the oldest stamp among the tiles) and the source class; a tile whose stamp or freshness status differs prints its own [06 principle 3]. A dataset with status `pending` adds "includes changes not yet summarised"; `stale` or `failed` puts a warning icon and the age on the tiles that read it. No automatic polling; Refresh button; `staleTime` 60 s |
| Header actions | Dashboard switcher · view chip (saved views, §6.3) · favorite star · "Make this my home" (the first favorite of type `dashboard` [06 §10]) · Edit layout · Definitions (glossary filtered to the metrics on screen) · Print / Export / Subscribe (§7.6) · Present (P4, DASH-44) |
| Grid | 12 columns, titled collapsible sections, tile `size` = columns × rows; one column below 768 px of container width [06 §3.6]. A tile whose `visible_when` is false is not rendered; a tile whose `requires[]` is not met renders the "history starts on" state instead of disappearing [06 §2.0.1] |
| Personal layout (P1) | `GET` / `PUT /analytics/dashboards/{dashboard_key}/layout` (the `view_kind = layout` row of 02 §8.1). Content, owned by this document: `{layout_version, view_key, sections{<section_key>: {collapsed, tiles[{tile_key, visible}]}}, matrices{<matrix_key>: {order, hidden_rows[], pinned_rows[], summary_columns[], cell_mode}}}`; tile order = array order; unknown keys are ignored. Explicit edit mode with Save, Cancel, Reset; a changed edit mode registers the unsaved-changes guard of §4.7; reorder with "Move up" / "Move down" as well as by drag (WCAG 2.5.7). Editing UI: DASH-06. Organisation default layout: P2. Free grid and tile library: P4 (DASH-44), not below `@rpt-lg` |
| URL state | Value keys of the header parameters (FLT-19) plus `_tab` (view key), `_view` (saved view id) and `_tile` (tile to scroll to and highlight when the dashboard is opened from an alert [06 §7.2]) |
| States | Page skeleton with tile placeholders; 403 → `AccessDenied`. A tile the caller may not see is absent from the served definition and a point the caller may not see is `restricted` [06 principle 8]. My Dashboard without production or activity shows the explanation of 06 §2.3 |
| Embedding | `DashboardTile` and the tile bodies are also mounted outside `/reports/*`: the tiles of `dashboards.my` on My Page [06 §2.3] and the re-pointed KPI widgets of `/dashboard` (DASH-08) load the `reports-dashboards` chunk lazily, together with the shared `reports.css` chunk (§9.4). Outside `.rpt-root` there is no container query context, so `DashboardTile` declares its own `container-type: inline-size` |

### 7.2 The tile frame

`DashboardTile` gives every tile kind the same chrome and the same states; the body comes from `tileRegistry[kind]`.

| Element | Rule |
|---|---|
| Header | Title (the registry label unless the tile sets one; never another metric noun [06 principle 9]); info icon → definition popover; period chip with the resolved dates and the date basis ("Nov 1-22 · MTD · service date") [06 principle 2]; menu: Open report, Show as table, Definition, Alert me (P4), Explain (P5), Hide (edit mode) |
| Body | `tileRegistry[kind]` (§7.3); an unknown `kind` renders `UnknownTile` and fails the contract test |
| Values and point states | One renderer for cards, matrix, scorecards and chart tables: `MetricValue` (DASH-02) implements 06 §3.1 — `ok`, zero, `no_data`, `not_available`, `restricted`, `suppressed`, not configured, low denominator, provisional, partial period, recomputed, definition changed. A missing value is never drawn as 0 |
| Tile states | `ok`; `error` / `timeout` / `busy` → message + Retry inside the tile; loading → skeleton of the tile's shape; a response served stale (`cache.stale`) keeps the values and shows the older as-of time. Each tile sits in a `BlockErrorBoundary` |
| Click | The whole card, a point, a matrix cell or a chart mark calls `POST /analytics/metrics/drill` → `{report_key, params}` → `DrillPanel` with the reconciling total on top and "Open as full report" (wiring: DASH-07). A target with `kind = worklist` follows §5.5. For a ratio the numerator list and the denominator list are offered as two tabs; when a value cannot be decomposed the panel says why [06 principle 4] |
| Band and direction | Colour, icon and word from the resolved target and the metric's `direction` (`up`, `down`, `target_range`, `neutral` [05 §1.2]); never colour alone and never the sign alone [06 §3.1] |

### 7.3 Tile bodies (pointer to 06)

| `kind` [06 §2.0.3] | Component | Specified in | Built on (this document) | Work item |
|---|---|---|---|---|
| `kpi`, `kpi_group` | `KpiCard`, an extension of `KpiStat` [V `src/components/dashboard/components/KpiStat.tsx`]; `KpiStat` stays for the screens that use it | 06 §3.2 | `MetricValue`, `Sparkline`, `GoalBar` (plain SVG) | DASH-02; goal bar and pace DASH-20 |
| `matrix_block` | `MetricMatrix`: blocks with the same `matrix_key` merge into one grid | 06 §3.3 | `PivotMatrix` in interactive mode (§7.4) | DASH-03 |
| `trend`, `bars`, `aging`, `funnel` | `TrendChart`, `BarsChart`, `AgingBars`, `FunnelChart` | 06 §3.5 | `ChartFrame`: lazy Recharts chunk, "Show as table", generated summary line, reduced motion | DASH-11 |
| `heatmap` | `HeatmapGrid` | 06 §3.5 | `PivotMatrix` with shaded cells (plain table, value text in every cell); Recharts has no heat-map chart | DASH-22 |
| `scorecard`, `ranking` | `Scorecard`, `RankingTable` | 06 §3.4 | `PivotMatrix` with members as rows | DASH-38 |
| `list` | Embedded result table, at most 10 rows + "Open" | 06 §2.0.1 (`list_report`) | Compact `ReportResults` for an `instant` run; the first live page for a worklist | UX-25 |
| `narrative` | Insight strip (P5) | 06 §8.4 | `react-markdown` [V `package.json`] | DASH-48 |

Naming: 06 writes the event prop of `KpiCard` as `on_drill`. In code, event props follow React (`onDrill`) and data
props keep the snake_case names of 06 §3.2 (`metric_key`, `compare_label`, `sparkline[]`), as fixed in the header of
this document.

### 7.4 The trailing-12-month matrix

Specification of record: 06 §3.3. `MetricMatrix` (DASH-03) is `PivotMatrix` (UX-23) fed by `matrix_block` tiles; rows
are metrics, columns are periods. The interaction this document fixes:

| Aspect | Interaction |
|---|---|
| Structure | One native table. First column sticky (metric label, info icon, unit); header row sticky (period labels); rows in titled collapsible blocks; equal column widths in every block and provider block. At most about 60 rows × 30 columns, so no virtualisation |
| Order | Newest first by default (the reference layout [A] `reference_screenshots.md` §2.2; 06 D-1), toggle to oldest first; stored per user in `matrices.<matrix_key>.order` |
| Range and grain | Header parameters `periods_back` (6, 12, 13, 24) and `time_grain` (month, week, quarter) [06 §2.0.2] |
| Open period | Header "Nov 2026 · MTD" with a second line "22 of 30 days · 15 of 20 working days" (`is_partial`, working days); its cells are italic behind a vertical rule; locked periods (`is_locked`, PD-9) carry a lock icon |
| Summary columns and cell modes | Total, Average, Year to date, Prior year, Goal, Variance, Trend, each switchable (`summary_columns[]`); cell modes value, change against last year, percent of goal, heat shading (P4). Every figure comes from the response (`include[]`); the browser computes none of them |
| Drill | Click or Enter on a cell → drill for that metric, member and period (§7.2); a summary cell drills with the whole range. Cell menu: Open report, Definition, Alert me (P4), Explain (P5) |
| Keyboard | Refinement of 06 §3.3, which makes every drillable cell a button: with up to 1,800 cells, one tab stop per cell is not operable. The table keeps its native markup and header scopes and adds the grid pattern: one tab stop (roving `tabindex`), arrow keys between cells, Home / End within the row, Ctrl+Home / Ctrl+End to the corners, Enter or Space drills, Shift+F10 opens the cell menu. It is the one `role="grid"` of the module (OD-5) |
| Focus | `scroll-padding` equal to the sticky column and header, so the focused cell is never covered (WCAG 2.4.11) |
| Row tools | Info icon, expand a trend under the row, pin to top, hide; pinned and hidden rows are layout state (§7.1) |
| Provider variant and compare mode | Provider switcher or stacked blocks with shared column positions, an explicit "Unassigned" member and hide-inactive [06 §2.2]; compare mode (one metric, rows = members) in P4 (DASH-40) |
| Scroll and zoom | Horizontal scroll inside the component; the first column never scrolls out. Sticky positioning needs no pointer maths; anything measured goes through `src/utils/uiZoom.ts` |
| Print and export | Through the twin report (§7.6); states are exported as words, never as 0 |

### 7.5 Worklist page (P3)

A worklist is a report definition with `kind = worklist`, `paging_mode = live`, `cost_class = instant` and
`schedulable = false` (15 keys `worklists.<name>` in 06 §6). UX-38 builds the page shell; the follow-up columns, the
outcome and assignment dialogs and the behaviour of each worklist are DASH-30 to DASH-36.

| Part | Design |
|---|---|
| Index | `/reports/worklists` without a key: one card per worklist the caller may open, with the counters "Open · due today · overdue · assigned to me" from `worklist_followups` and the time of the last sync [06 §6.1]; the persona's pinned worklists first [06 §10] |
| Data | `POST /reports/live/{report_key}/rows` with `{working_office_id, params, cursor, size, sort_by}` → `{run_id, columns[], rows[], next_cursor, has_more, totals}`. Forward paging only ("Load more" and infinite scroll); there is no total row count unless `totals` gives one; 422 `invalid_cursor` restarts from the first page. `run_id` addresses actions and drill for the session |
| Criteria | The definition's parameters in bar layout with live apply; the common filters of 06 §6.2 (`office_scope`, `followup_status`, `assigned_user_ids`, `not_contacted_within`, `provider_ids`) are ordinary parameters. "My queue" is a saved view (§6.3) |
| Rows | Table on wide containers; one card per row with the primary action exposed below `@rpt-md`. Follow-up status, assignee, due date, last contact and attempts are served columns; `OfficeBadge` when the row's office is not the working office |
| Actions | Row and bulk actions of §5.6 with the kinds of 06 §6.2: Open record, Log outcome, Assign, Snooze / Resolve / Dismiss, Send text, Send e-mail, Letters, Schedule (`openSchedulerForBooking`), Export selection. Selection on a live list is sent as `row_ids[]` or `all` and re-evaluated on the server; an id that is no longer on the list comes back in `excluded[]`. The response returns the refreshed rows, so the list updates without a refetch (both requested by 06 §6.1 from 02; until then the affected rows are removed optimistically and the list refetches from the first cursor) |
| Refresh | Every 60 s while visible the first page and the counters are re-read (one request); when they differ from what is on screen a polite bar "List changed — Refresh" appears and nothing moves under the reader (WCAG 2.2.2). A full refetch happens on that button, on window focus after at least 5 minutes away, and after an action; never while a dialog of the page is open. The infinite query sets `maxPages` (10). When the focused row leaves after a refetch, focus moves to the next row and the change is announced; selected ids that left are dropped from the selection with a count ("3 selected rows left the list") |
| Export | "Export" creates a normal snapshot run of the same criteria [02 §4.6] and follows §6.1 |

### 7.6 Print, export and subscription of dashboards

Every dashboard has a twin report definition with the same key (`status = hidden`, absent from the catalog), generated
from the dashboard definition; its builder calls the metric service with the same tile queries [06 §3.6]. Print,
Export and Subscribe in the dashboard header therefore use the run and artifact path of §6.1 and the schedule path of
§6.2 with `report_key` = `dashboard_key` and the dashboard's current parameters: the file holds the values of a stored
run, is audited like any report, and charts are printed in their table form. P1 for dashboards with a matrix, P2 for
the others (DASH-09); digests are schedules on the twin (DASH-17). The frontend never builds a file from tile data and
never calls `window.print()` on a dashboard (AD-6).

---

## 8. Component inventory

All components are NEW and live under `src/features/reports/` (§9.1) unless a path is given. Props are outlines:
snake_case for data, `onX` for events. "Reuses" names existing code that was verified. Owner: `FLT-nn` = built by the
filter-framework work items of 04; `UX-nn` = work items of §12; `DASH-nn` = work items of 06 §11 (the component is
specified in 06 and listed here so that the inventory is complete).

### 8.1 Criteria (FLT components and the layouts around them)

Common contract of every parameter control (`ParamControlProps`):
`{ param, values: Record<value_key, unknown>, onChange(patch: Record<value_key, unknown>), disabled, locked_reason?, errors[], presentation, report_key, depends, resolved? }`
where `param` is the served parameter object, `values` is restricted to `param.value_keys[]` and every member is
addressed by its declared value key (`age_from`, `age_to`, `amount_operator`, `amount_value`, `date_preset`,
`date_from`, …) — no renamed members and no mapping layer (§9.2). The one exception is the form state of
`office_scope` and `scoped_selection` as 04 §13.2 defines it (`{mode, selection}`), which `paramCodec` turns into the
declared value keys. `errors[]` are `{value_key, code, reason, message}`, `depends` holds the current values of
`depends_on[]`, and `resolved` carries what validate resolved (dates, labels).

Ownership split with 04 (§13.5): FLT-10 builds `useParamForm`, `ParamForm`'s control dispatch and a plain
single-column layout; UX-06 and UX-07 own the classic and enhanced layouts, `criteria_rows`, More options, the chips
and the placement of Clear Criteria, and depend on FLT-10.

| Component | Additional props | Reuses | Owner |
|---|---|---|---|
| `ParamForm` | `definition, values, onChange, errors, disabled_keys, presentation, layout, working_office_id, context` | Precedent only: `UtilityParamsForm` [V `src/components/utilities/components/UtilityParamsForm.tsx`] (9 kinds, not reused) | FLT-10 |
| `ClassicCriteriaLayout` | `sections[], criteria_rows?, header_actions, footer_actions` | `components.sectionHeader`, `components.sectionHeaderTitle` [V `src/styles/theme.ts` L94-95] | UX-06 |
| `EnhancedCriteriaLayout` | `basic_params[], advanced_sections[], chips, run_control` | — | UX-07 |
| `CriteriaSection` | `title, header_controls, column: "left" \| "right" \| "full", children` (full-width `row_span` controls are drawn by the layout under the row) | Shape of `SectionHeader` (title + actions) [V `src/components/ui/SectionHeader.tsx`] | UX-06 |
| `CriteriaChips` | `definition, values, onClear(value_key), onClearAll()` | — | UX-07 |
| `DateRangeParam` | `values` keys `date_preset`, `date_from`, `date_to` (the declared prefixed keys for secondary ranges), `presets[]`, `max_span_days`, `resolved: {date_from, date_to, reference_time_zone}`, `date_basis?: {param, value, onChange}` (basis radio drawn in the same group), `compare?: {compare_to, compare_date_from, compare_date_to, onChange}` (P4, FLT-26) | Native date inputs (house standard); `dateTokens.ts`; `formatIsoDateOnly` [V `src/utils/datetime.ts`]; optional range calendar on `react-day-picker` after the spike | FLT-12 |
| `DateParam` | `value: string` (ISO date or token), `resolved` | Same | FLT-12 |
| `OfficeScopeParam` | `value: {mode: "office" \| "office_group", selection: "current_office" \| "my_offices" \| "all" \| number[]}` (form state; emits `office_ids`, `office_group_id`, `all_offices` through `paramCodec`), `allowed_modes[]`, `key_prefix?` (second scope), `locked?` | `useOfficeScope()`, `useOfficeOptions()` [V `src/features/office-scope/`]; NEW shared hook `useOfficeGroups()` in the same folder over `listOfficeGroups` [V `src/api/generated/endpoints/organization/organization.ts` L2208] | FLT-11 |
| `EntityMultiParam` | `value: "all" \| "none" \| (number \| string)[]`, `source_key`, `accepts_all`, `accepts_none`, `max_items`, `control`, `typeahead_only` | `EntityPickerDialog`, `OptionPopover`; options through `useParamOptions` | FLT-13 |
| `ProviderParam` | as `EntityMultiParam`; options grouped "Roster of the selected offices" / "Other providers", "Include inactive" switch | Options and their group come only from the options endpoint through `useParamOptions` (`depends_on` the office value keys, so multi-office and office-group criteria get the roster of every selected office first [04 §5, §13.3]); `useProviderDirectory` is not used, because it takes one office id [V `src/hooks/useProviderDirectory.ts` L70-73]. Grouping rule of `ProviderOptionGroups` [V] (prefer, never exclude) as the visual precedent | FLT-13 |
| `EntitySingleParam` | `value: number \| string \| null`, `source_key`, `allow_clear` | Behaviour of `EntityPicker` [V `src/components/setup/insurance/EntityPicker.tsx`] rebuilt on a portalled popover (its dropdown is clipped by `overflow-hidden` parents [A]); `patientLookup.ts` [V] for patient search | FLT-13 |
| `EntityPickerDialog` (NEW transfer list in `params/pickers/`) | `title, source_key, value, onApply(value), accepts_all, sort_options[]` | Server search and keyset paging through `useParamOptions` (procedure codes and carriers run to thousands); sort select; virtualised panes; panes are `role="listbox"` `aria-multiselectable` with Space / Shift+Arrow selection; INCLUDE ALL. `DualListPicker` [V `src/components/setup/offices/DualListPicker.tsx`] is the visual precedent only: it filters fully loaded arrays client-side, renders every row, has no sort, and its rows are buttons with no selected state and Ctrl+click multi-select (L179-187, L217-229, L261-281) | FLT-13 (size to re-check, §13.5) |
| `OptionPopover` | `options[], value, multiple, onChange, search, onSearch, loading, footer` | Radix popover primitive (§10.1) | FLT-13 |
| `TextRangeParam` (name range, zip range) | `values` keys `<key>_from`, `<key>_to` as declared, `lookup_source?`, `sentinels?: {from: "AAAAA", to: "ZZZZZ"}` | Lookup icon opens `EntitySingleParam` search and fills the box | FLT-14 |
| `NumberRangeParam` | `values` keys `<key>_range_enabled` (when declared), `<key>_from`, `<key>_to`, `value_type: "integer" \| "decimal"`, `min`, `max` | Native inputs | FLT-14 |
| `NumberParam` | `value`, `value_type`, `min`, `max` | Native input | FLT-14 |
| `EnumParam` | `values[key]`, `options[]`, `control`, `member?` (checkbox member rendering, §4.5) | Native radios / select with the class-qualified compact rule (§9.5) | FLT-14 |
| `EnumMultiParam` | `value: "all" \| string[]`, `options[]`, `accepts_all`, `min_items` | Native checkboxes | FLT-14 |
| `BooleanParam` | `value: boolean`, `placement` | Native checkbox | FLT-14 |
| `ScopedSelectionParam` | `value: {mode, selection}`, `mode_sources{}` | `EnumParam` + `EntityMultiParam` | FLT-14 |
| `AmountComparisonParam`, `LookbackDaysParam` | `values` keys `<key>_operator`, `<key>_value` · `<key>`, `<key>_days` [04 §2.1] | `EnumParam`, `NumberParam` | FLT-14 |
| `DisplayParam`, `ActionParam` | `value` (server value) · `action_key, label, onRun()` | — | FLT-14 |

### 8.2 Runner

| Component | Props (outline) | Reuses | Owner |
|---|---|---|---|
| `ReportCategoryPage` | route params `category`; query `report`, `subcategory` | `HubLayout` | UX-06 |
| `ReportPicker` (SELECT REPORT) | `reports[]` (catalog entries in legacy order), `selected_report_key`, `onSelect(report_key)` (committed on Enter / Space / click or 400 ms after the last arrow key, §4.2), `columns: 2` | — | UX-06 |
| `ClassicReportFrame` | `category, definition, form, run_state, legacy_actions[]` | `ClassicCriteriaLayout`, `ReportResults` | UX-06 |
| `LegacyActionBar` | `legacy_actions[], access, is_saved_view_open, onAction(maps_to)` | — | UX-06 |
| `ReportRunnerPage` | route param `report_key` | — | UX-07 |
| `RunnerHeader` | `definition, saved_view, is_modified, access, onSave, onShare, onSchedule, onExport, onPrint` | `FavoriteStar` | UX-07 |
| `RunControl` | `cost_class, run_state, estimate?, can_run, onRun(), onCancel()` | — | UX-07 |
| `DefinitionInfoDrawer` | `definition` (description, legacy names, date basis, attributions, freshness, availability, legacy notes) | `SidePanel` | UX-07 |
| `PresentationToggle` | `value, onChange` | — | UX-32 |
| `StatementCriteriaLayout` | `definition, form` (registered for `statements.statement_run`) | `ParamForm` controls | UX-28 |

### 8.3 Results

| Component | Props (outline) | Reuses | Owner |
|---|---|---|---|
| `ReportResults` | `run, definition, layout, onLayoutChange, mode: "full" \| "compact", onDrill, onAction` | — | UX-09 |
| `RunContextLine` | `run, definition, onRefresh` | — | UX-09 |
| `ResultNotices` | `run, definition, view_notices[]` | — | UX-09 |
| `SummaryCards` | `cards[], onDrill(card_key)` | `KpiCard` | UX-09 |
| `ResultToolbar` | `block, layout, density, q, access, onChange…` | `GatedButton` | UX-08 |
| `ResultTable` | `run_id, blocks[], total_rows, page_size, first_page?, sort, dir, q, block_key?, layout, onLayoutChange, density, selection, onSelectionChange, onCellActivate(cell), height_mode: "fill" \| "auto"` | TanStack Table + Virtual (§10); resize pattern of `TxPlanGrid` [V] | UX-08 |
| `BandRow`, `DetailRow`, `InsetBlockRow` | `row, columns[], level, expanded?, onToggle?` | — | UX-08 |
| `GrandTotalBar` | `totals, columns[], layout` | — | UX-08 |
| `ColumnChooser` | `columns[], layout, onChange, onReset` | Radix popover | UX-16 |
| `KeyValueBlock` | `block, rows[]` | — | UX-09 |
| `PivotMatrix` | `row_headers[], columns[] ({key, label, group?, is_partial?, is_locked?}), rows[] ({key, label, cells[], total?}), sticky_row_headers, order, onCellActivate(row_key, column_key), cell_state(cell), interactive: boolean` | — | UX-23 |
| `ChartFrame` | `kind, series[], category_labels[], format, height, summary_text` | Recharts; palette of `ReportChart` [A] `fe_cross_cutting.md` §6.2 | UX-24 |
| `DrillPanel` | `stack[] ({run_id, title}), onBack, onOpenFull, onClose` | `SidePanel`, `ReportResults` compact | UX-22 |
| `RowActionMenu`, `BulkActionBar`, `BulkActionDialog` | `actions[], selection, counts?, onConfirm` | — | UX-38 |
| `EmptyResult`, `RunError` | `run, criteria_echo[], relaxations[], onApply` · `run, onRunAgain, onRunInBackground?` | — | UX-09 |

### 8.4 Run status

| Component | Props (outline) | Reuses | Owner |
|---|---|---|---|
| `RunStatusPanel` | `run (status, phase, progress_pct, progress_message, rows_processed, queue_position), elapsed_ms, onCancel, onRunInBackground?` | Visual language of `RunConsole` / `StatusBadge` [V `src/components/utilities/components/`] | UX-07, UX-33 |
| `RunTrayButton`, `RunTrayPanel` | none (reads `useRunTray()`) | AppointNow bell markup [V `src/components/GlobalNav.tsx` L1516-1528] | UX-33 |
| `RunHistoryTable` | `scope, filters, onOpen, onRerun, onCancel, onPin` | — | UX-33 |
| `ArtifactStatus` | `artifact, onDownload, onPrint` | — | UX-18 |

### 8.5 Dialogs and panels

| Component | Props (outline) | Reuses | Owner |
|---|---|---|---|
| `SaveViewDialog` | `mode: "create" \| "update" \| "favorite", definition, values, layout, saved_view?, onSaved(view)` | `RptDialog` | UX-19 |
| `ManageViewsDialog` | `report_key, views[], onRename, onDelete, onSetDefault` | — | UX-19 |
| `ScheduleDialog` | `definition, source: {saved_view_id} \| {params, layout}, schedule?, onSaved(schedule)` | `EntityPickerDialog` for recipients | UX-34 |
| `ScheduleDetailPanel` | `schedule, runs[], deliveries[]`; for an alert also firings, acknowledgements and snoozes | `SidePanel` | UX-34, UX-47 |
| `ShareDialog` | `object_type, object_id, shares[], run_id?, onSaved` | — | UX-35 |
| `ExportDialog` | `run, definition, layout, onRequested(artifact)` | — | UX-18 |
| `PurposePromptDialog` | `triggers[], purpose_codes[], external, onConfirm({purpose_code, purpose_note, external_recipient?})` | — | UX-18 |
| `StepUpDialog` | `reason, onVerified()` (password re-check; P2) | — | UX-46 |
| `SideEffectConfirmDialog` | `definition, report_format, estimate?, onConfirm` | — | UX-28 |
| `RptDialog`, `RptPopover`, `RptTooltip`, `SidePanel` | `open, onOpenChange, title, size, children` | Radix primitives with the module layers (§9.5); not `src/components/ui/dialog.tsx`, which is fixed at `z-50` [V]; `useBodyScrollLock` [V `src/hooks/useBodyScrollLock.ts`] for `SidePanel` in overlay mode | UX-15 |
| `GatedButton` | `allowed, reason, children`: disabled with tooltip and `aria-describedby` instead of hidden (§4.8) | `RptTooltip`; reasons from `accessModel.ts` | UX-45 |

### 8.6 Hub

| Component | Props (outline) | Reuses | Owner |
|---|---|---|---|
| `HubLayout` | `children` (rail + outlet) | — | UX-05 |
| `HubSearchBox`, `ReportCommandPalette` | `query, onQueryChange, results[]` · `open, onOpenChange` | `cmdk` | UX-05, UX-31 |
| `ReportCard` | `entry (report_key, title, description, kind, category, legacy_names[], freshness, cost_class, is_favorite, last_run_at), matched_alias?, onOpen, onRun` | Card tokens of `theme.ts`; favourites / recents interaction of `UtilitiesDashboard` [V `src/components/utilities/pages/UtilitiesDashboard.tsx`] | UX-05 |
| `CategoryGrid`, `StartStrip`, `ContinueList` | `groups[]` · `favorites[], recents[]` | — | UX-05, UX-20 |
| `FavoriteStar` | `object_type, object_key, is_favorite` | — | UX-20 |
| `LibraryTabs` | `tab` | — | UX-20 |
| `CorrespondenceLinks` | `links[]` (from `externalLinks.ts`) | — | UX-05 |
| `RequestAccessState`, `ObservationModeBanner` | none · `rights_mode` (hub states of §1.2) | Layout of `AccessDenied` [V `src/features/access-control/RequireRight.tsx` L61] | UX-45 |

### 8.7 Dashboards, worklists, builder, assistant

| Component | Props (outline) | Reuses | Owner |
|---|---|---|---|
| `DashboardPage`, `DashboardGrid`, `DashboardViewTabs` | route param `dashboard_key` · `sections[], tiles[], layout, edit_mode` · `views[], view_key, onChange` | — | UX-25 |
| `DashboardHeader` | `definition, values, onChange, layout, onLayoutChange` (parameter bar, view chip, layout editing) | `ParamForm` bar layout; `SaveViewDialog` | DASH-06 |
| `DashboardTile`, `UnknownTile`, `ListTile` | `tile, state, onRetry, onDrill, edit_mode?, highlighted?` · `kind` · `list_report` | `WidgetCard` states as the model [V `src/components/dashboard/components/WidgetCard.tsx`] (its root clips popovers, so the tile is a new component); compact `ReportResults` | UX-25 |
| `MetricValue`, `FreshnessBadge`, `MetricDefinitionPopover` | `point, metric, warnings[]` · `freshness[]` · `metric_key` | `react-markdown` for `glossary_md` [V `package.json`] | DASH-02 |
| `KpiCard`, `Sparkline`, `GoalBar` | Props of 06 §3.2: `metric_key, metric, point, period, compare_label, goal, band, sparkline[], freshness, status, warnings[], size, onDrill` | `KpiStat` [V]; plain SVG, no chart library | DASH-02, DASH-20 |
| `MetricMatrix` | `blocks[]` (tile results merged by `matrix_key`), `layout`, `onLayoutChange`, `onDrill(metric_key, period, member)` | `PivotMatrix` in interactive mode | DASH-03 |
| `TrendChart`, `BarsChart`, `AgingBars`, `FunnelChart`, `HeatmapGrid` · `Scorecard`, `RankingTable` | 06 §3.5 · 06 §3.4 | `ChartFrame` · `PivotMatrix` | DASH-11, DASH-22 · DASH-38 |
| `GlossaryPage` | query `metric` | `MetricDefinitionPopover` | UX-27 |
| `GoalsPage` (shell with tabs) | query `tab` | `useUnsavedGuard` [V `src/features/office-scope/useUnsavedGuard.ts`] with the navigation and `beforeunload` coverage of UX-49 (§4.7); grids and editors by DASH-19, DASH-37 | UX-42 |
| `WorklistPage`, `WorklistIndex`, `WorklistRowCard` | route param `report_key` · none · `row, columns[], actions[]` | `ResultTable` cells, §8.3 actions; outcome and assignment dialogs by DASH-30 | UX-38 |
| `BuilderPage`, `DatasetPicker`, `FieldPicker`, `BuilderSteps`, `BuilderPreview`, `SpecErrors`, `PublishDialog` | `custom_definition_id` · `datasets[]` · `fields[], in_use[]` · `spec, onChange` · `page` · `errors[]` · `definition, affected` | `ParamForm` controls for filters; `ResultTable` for the preview | UX-43 |
| `AssistantSlot` | `surface, dashboard_key?, report_key?, onFillParameters(params)`; renders nothing when the assistant is off | `AskBar`, `AnswerCard` of DASH-49 inside `SidePanel` | UX-44 |
| `ReportsErrorBoundary`, `BlockErrorBoundary`, `ReportsNotFound` | `children, reset_key` | `AccessDenied` [V] for 403 | UX-01 |

---

## 9. Frontend structure

### 9.1 `src/features/reports/` layout

Follows the feature-folder pattern of `src/features/time-clock/` and `src/features/office-scope/` (pure model,
service, hooks, components, page, tests, barrel) [A] `fe_cross_cutting.md` §7.1. The `params/` folder is the one
proposed in 04 §13.4.

```
src/features/reports/
  index.ts                 public surface: ReportsEntry, useReportsNavItems, RunTrayButton, openReport()
  ReportsEntry.tsx         auth shell + Suspense + ReportsErrorBoundary + engine probe      (main chunk)
  routes.tsx               nested <Routes>: §2.1 table and §2.2 redirects                    (lazy root)
  reportKeys.ts            React Query key factory (§9.3)
  model/                   pure TypeScript, no React, unit-tested
    definitionModel.ts     generated types re-exported; parseDefinition() (zod); known-value guards
    catalogModel.ts        HUB_GROUPS, legacy order, search index and ranking
    runModel.ts            newRunId(), terminal states, poll cadence, error_code -> message key
    accessModel.ts         access object -> enabled or disabled-with-reason per control; PHI_CLASSES
    resultModel.ts         stream rows, row kinds, block switching, page maths
    formatters.ts          display of money / percent / date / datetime strings; no arithmetic
    layoutModel.ts         layout blob: schema, version migration, apply to resolved columns
    viewModel.ts           saved view <-> form state; office policy mapping; dirty check
    scheduleModel.ts       recurrence presets <-> cron_expression; summary sentence
    urlState.ts            underscore-prefixed view-state keys (§5.10)
    iconMap.ts             icon_key -> lucide icon
    recordRoutes.ts        route_key -> path or Scheduler hand-off
    notificationRoutes.ts  notification category + ref_type -> target (run, alert, follow-up)
    legacyRedirects.ts     old paths and old report ids -> new routes
    externalLinks.ts       correspondence and form entries
  params/                  04 §13.4: paramModel.ts, paramExpr.ts, dateTokens.ts, paramCodec.ts,
                           useParamForm.ts, useParamOptions.ts, ParamForm.tsx,
                           controls/*Param.tsx, pickers/EntityPickerDialog.tsx, pickers/OptionPopover.tsx,
                           layouts/ClassicCriteriaLayout.tsx, layouts/EnhancedCriteriaLayout.tsx,
                           layouts/StatementCriteriaLayout.tsx, CriteriaChips.tsx
  services/                thin wrappers over the generated client; snake_case in and out
    catalogService.ts definitionService.ts runService.ts artifactService.ts savedViewService.ts
    favoriteService.ts scheduleService.ts customDefinitionService.ts analyticsService.ts settingsService.ts
  hooks/
    useReportCatalog.ts useReportDefinition.ts useReportRun.ts useRunRows.ts useArtifact.ts
    useSavedViews.ts useFavorites.ts useRecents.ts useSchedules.ts useRunTray.ts useRunEvents.ts
    useDashboard.ts useMetricQuery.ts useReportsUiPrefs.ts useEngineAvailable.ts
  components/
    hub/ runner/ results/ run/ dialogs/ dashboards/ worklists/ builder/ assistant/ common/
  pages/                   one file per route of §2.1
  nav/reportsNav.ts        menu skeleton, catalog merge (total, zod), useReportsNavItems       (main chunk)
  nav/ReportsNavMenu.tsx   Radix dropdown of the Reports menu + its error boundary           (main chunk)
  tray/RunTrayButton.tsx   badge button                                                       (main chunk)
  styles/reports.css       compact control rules, layer tokens, container sizes, print rules (§9.5, §9.8, §9.9);
                           shared CSS chunk imported by the reports and reports-dashboards entries (§9.4)
  __fixtures__/            definition and result-page fixtures copied from the backend contract tests
  __tests__/               vitest suites (§9.10)
```

Shared code that other features already use moves out of the old reports folder before it is deleted:
`useOffices`, `useProviders`, `officeName` of `src/components/reports/lib/useReportRefData.ts` are imported by
Utilities [V `src/components/utilities/UtilityShell.tsx` L12, `components/UtilityParamsForm.tsx` L7] and move to
`src/components/utilities/lib/`. `useOfficeGroups()` is added to `src/features/office-scope/` (04 §6.3).

### 9.2 Rules for code in the module

| Rule | Detail |
|---|---|
| Generated client only | After `npm run api:sync` the engine operations are generated into `src/api/generated/endpoints/reports/reports.ts` (tag `Reports`; the file exists today with the six legacy roll-up operations [V]) and `src/api/generated/endpoints/analytics/analytics.ts` (tag `Analytics`, NEW). Services import those functions (`listReportCatalog`, `getReportDefinition`, `createReportRun`, `getReportRun`, `listReportRunRows`, … from the `operation_id`s of 02 §13). No raw axios (seven files do that today [A]; this module adds none) |
| Functions, not generated hooks | The module's hooks call the generated functions inside `useQuery` / `useMutation` with keys from `reportKeys`. Reasons: read-type POSTs (validate, drill, live rows, metric query, dashboard data) are generated as mutations but are queries here; keys must contain `working_office_id`; polling and timeouts are set per call |
| Signals and timeouts | Every generated function accepts request options and an `AbortSignal` [V signature of `refreshToken` in `src/api/generated/endpoints/auth/auth.ts` L185-189]; services pass React Query's `signal` and a `timeout` per call class (§9.6) |
| snake_case binding | Form values are the value keys of 04, and every control reads and writes them by their declared names (§8.1); run, view and schedule objects are used as generated. The one allowed exception is the `{mode, selection}` form state of `office_scope` and `scoped_selection` defined by 04 §13.2, converted by `paramCodec` with round-trip vectors per type (UX-13). No camelCase view model and no other mapping layer (the old module's `ReportFilters.office` / `provider`, `SavedView.createdAt` disappear with it [A] `fe_existing_reports.md` §4) |
| Office per call | `working_office_id` and the office value keys are explicit fields of each request. `X-Office-ID` is still attached by the axios interceptor [V `src/services/api.ts` L21-36] and is not a functional input [02 C15]. Never `office_id: null` in a key or a body |
| No client aggregation | No `reduce` over money, no totals, no grouping, no sorting of result rows, no paging over a partial set. Review rule; `formatters.ts` exposes no arithmetic |
| No client rendering of files | ESLint `no-restricted-imports` for `jspdf`, `jspdf-autotable` under `src/features/reports/**`; no `window.print()` of app UI (the only `print()` call is in the tab that shows a server PDF, §6.1) |
| Durable state on the server | Saved views, favorites, recents, schedules, layouts: engine endpoints. UI preferences: the preferences blob. Nothing the user expects to keep goes to `localStorage`, which is cleared on logout and on every 401 [V `src/features/auth/rememberMe.ts`] |
| Result data in memory only | Report rows, metric responses and downloaded blobs live in the query cache or in a variable; never in `localStorage`, `sessionStorage` or IndexedDB; removed on logout and on `auth:unauthorized` (§9.3) [08 §3.4] |
| Unknown served values | `parseDefinition` validates `type`, `kind`, `shape`, `layout`, chart `kind`, `icon_key`, `route_key`, tile `kind` against the frontend maps. Unknown: the affected part renders a labelled fallback, a console error names the key, and the contract test over the backend fixtures fails [02 §15.5] |
| Rights | UI gating reads the served `access` of catalog entries and definitions and `module_access` (§3.2). No `useRights()`, `hasRight()` or `isPrivilegedRole()` [V `src/features/office-scope/officeScopeModel.ts` L95] call decides report access [08 §3.4, SEC-13]; a lint rule forbids importing them under `src/features/reports/**`. The server 403 is the boundary |
| Providers and offices | Provider options of criteria come from the options endpoint (§8.1 `ProviderParam`); office labels through `useOfficeOptions`; provider lists prefer the roster and never exclude (project rule) |

### 9.3 React Query keys, cache policy, error surfacing

Factory `reportKeys` (hand-written keys; `p` = canonical JSON of the declared params, `wo` = `working_office_id`):

| Key | Endpoint | `staleTime` | Notes |
|---|---|---|---|
| `["reports","catalog"]` | `GET /reports/catalog` | 10 min | Shared by nav, hub and search; `is_favorite` and `last_run_at` are patched in place after a toggle or a run |
| `["reports","definition",report_key]` | `GET /reports/definitions/{report_key}` | 10 min | Refetched when a run comes back with another `definition_version` |
| `["reports","validate",report_key,wo,p]` | `POST …/validate` | 30 s | A query, with the previous data kept while the next loads |
| `["reports","options",report_key,param_key,wo,{search,depends,values}]` | `GET …/options/{param_key}` | 5 min | A `current_office` token inside `depends` is replaced by `wo` before the call (query strings carry no token objects) |
| `["reports","run",run_id]` | `GET /reports/runs/{run_id}` | terminal: `Infinity`; active: polled (§4.3) | Seeded by the `POST /reports/runs` response |
| `["reports","rows",run_id,{block,sort,dir,q},page_index]` | `GET /reports/runs/{run_id}/rows` | `Infinity` (the snapshot is immutable); `gcTime` 5 min | Page 0 seeded from the run response |
| `["reports","runs",{scope,status,report_key,page}]` | `GET /reports/runs` | 15 s | Tray and history |
| `["reports","artifacts",run_id]`, `["reports","artifact",artifact_id]` | artifact endpoints | `ready`: `Infinity`; else polled | |
| `["reports","saved_views",{object_type,object_key,scope}]`, `["reports","saved_view",id]`, `["reports","saved_view_resolved",id,wo]` | saved-view endpoints | 60 s | The resolved form depends on the working office |
| `["reports","favorites"]`, `["reports","recents"]` | | 60 s | Optimistic updates |
| `["reports","schedules",{scope,report_key,is_active}]`, `["reports","schedule",id]`, `["reports","schedule_runs",id,page]`, `["reports","deliveries",{scope,status,page}]` | schedule endpoints | 30 s | |
| `["reports","custom_definitions",{scope,status}]`, `["reports","custom_definition",id]` | | 60 s | |
| `["reports","settings"]`, `["reports","stats",{days,report_key}]` | | 60 s | |
| `["reports","live_rows",report_key,wo,p,sort_by]` | `POST /reports/live/{report_key}/rows` | 0 | Infinite query by `next_cursor`, `maxPages` 10; the 60-s tick reads the first page only (§7.5) |
| `["analytics","metadata"]`, `["analytics","metric",metric_key]` | | 30 min | |
| `["analytics","dashboards"]`, `["analytics","dashboard",dashboard_key]`, `["analytics","dashboard_layout",dashboard_key]` | | 10 min | |
| `["analytics","goals",{goal_kind,office_ids,year}]` | `GET /analytics/goals` | 60 s | A write returns the stored rows; 409 `goal_version_conflict` reloads the grid [06 §4.3] |
| `["analytics","dashboard_data",dashboard_key,wo,p]`, `["analytics","metric_query",wo,request]` | | 60 s | Equals `METRIC_CACHE_TTL_SECONDS_LIVE` [02 §10.3] |
| `["analytics","freshness"]` | | 60 s | |

| Rule | Detail |
|---|---|
| User in the key | The factory prefixes every key with the caller's user id (`["reports", user_id, …]`, `["analytics", user_id, …]`; left out of the table above). `logout()` neither reloads the page nor clears the query cache [V `src/contexts/AuthContext.tsx` L454-483], so without the prefix the next user of the same tab could be served the previous user's catalog or rows |
| Removal on logout | `logout()` gains one call, `removeReportCaches(queryClient)` exported by `reportKeys.ts`: it removes every `reports` and `analytics` query. The `auth:unauthorized` handler calls `logout()` [V L496-506], so a session expiry is covered as well [08 §3.4] |
| Working office in the key | Every key whose response depends on the working office contains it, so an office switch can never show the previous office's cached answer. The runner is not remounted with `key={office_id}` as the old one is [V `src/components/reports/pages/ReportRunnerPage.tsx`] |
| Retry | Global default is `retry: 1` [V `src/shared/config/queryClient.ts`]. Module: `retry: 0` for run creation, validate, drill, actions, artifact requests; `retry: 2` with back-off for idempotent GETs (run, rows, catalog, definition) |
| Error surfacing | The global `QueryCache` / `MutationCache` `onError` raises a toast for every failure and has no opt-out today [V same file]. Change (one line each): skip when `query.meta?.silent_error` / `mutation.meta?.silent_error` is true. Module calls that render their error in place (validate, run, rows, artifacts, dashboard data, options) set it; background refetches (tray, catalog) set it too and fail quietly. The axios interceptor's own 403 toasts are muted per request with `skip_scope_toast` (§4.7) |
| Invalidation | Run succeeded → `recents`, `runs`, patch catalog entry. Saved view created, changed, deleted → `saved_views`, `favorites`. Schedule changed → `schedules`. Favorite toggled → `favorites`, patch catalog entry. Layout saved → `dashboard_layout` or `saved_view` |
| Memory | Rows pages are the only large cache: 50 pages per result, `gcTime` 5 min, cleared when the runner unmounts |
| Windows and tabs | No cross-tab sync of data is needed: all durable state is on the server and read with `staleTime`. Two shared resources need care across tabs: the token refresh (single-flight, §9.6) and the preferences blob (read-merge-write, §4.9) |

### 9.4 Code splitting and error boundary

| Chunk | Loaded by | Contents |
|---|---|---|
| main (unchanged apart from about 10 KB) | app start | `ReportsEntry`, `nav/reportsNav.ts`, `tray/RunTrayButton.tsx`, `reportKeys.ts`, `catalogService.ts` |
| `reports` | first visit to `/reports/*` | hub, category page, runner, results, params, dialogs for save and export |
| `reports-chart` | first open of a Chart tab or a dashboard | `ChartFrame` (Recharts is already the separate `chart-vendor` chunk [V `vite.config.ts` L79]) |
| `reports-dashboards` | `/reports/dashboards/*`, goals, glossary; the embedded tiles on My Page and `/dashboard` (§7.1) | dashboard page, tile frame and tile bodies, `MetricMatrix` |
| `reports-schedules` | schedules page, `ScheduleDialog`, `ShareDialog` | |
| `reports-admin` | `/reports/admin/*`, run history | |
| `reports-builder` | `/reports/builder/*` | builder screens |
| `reports-assistant` | first use of an assistant slot (P5) | `AskBar`, `AnswerCard` (DASH-49) |
| `table-vendor` | with `reports` | `@tanstack/react-table`, `@tanstack/react-virtual` (new rule in `manualChunks`) |
| `reports.css` (shared CSS chunk) | with `reports` and with `reports-dashboards` (also when tiles are embedded outside `/reports/*`) | `styles/reports.css` (§9.5, §9.8, §9.9) |
| old `src/components/reports/**` | only through the engine-probe fallback | removed in UX-12 |

| Topic | Design |
|---|---|
| `ReportsErrorBoundary` | Class component (the first in the app [A]). Wraps the lazy module; `reset_key` = pathname, so navigation clears the error. Shows "Something went wrong in Reports", the error message in development, "Reload" and "Back to Reports" |
| Stale deploy (failed dynamic import) | On Vite 7.3 a failed dynamic import rejects with a `TypeError` ("Failed to fetch dynamically imported module") and Vite dispatches `vite:preloadError` on `window` [V `node_modules/vite/dist/node/chunks/config.js`]; the production server answers a missing hashed chunk with `index.html` and status 200 [V `server.js` L110-118], which surfaces as a MIME-type error. `React.lazy` caches the rejection, so no in-app reset recovers it. Detection: a `vite:preloadError` listener in `ReportsEntry` plus the message patterns `/dynamically imported module|Importing a module script failed|MIME type/` in the boundary. Shown: "A new version is available" with Reload only (a full page reload). UX-01 also changes `server.js` to answer 404 for unknown paths under `/assets/` instead of `index.html` |
| Nav containment | Reports code in `GlobalNav` (dropdown body, `RunTrayButton`) has its own small boundaries in the main chunk (§3.2 Containment); a reports error never unmounts the application |
| `BlockErrorBoundary` | Around each result block, each dashboard tile and the drill panel: a failing block shows its own error, the rest of the page works |
| Suspense fallbacks | Page-shaped skeletons (rail + header + table lines), never a spinner alone |
| Preloading | Hovering the Reports nav button preloads the `reports` chunk and refetches the catalog when it is stale |

### 9.5 Layout under the global 0.75 zoom

`html { zoom: var(--app-zoom) }` with `--app-zoom: 0.75` [V `src/styles/globals.css` L74, L199]; helpers in
`src/utils/uiZoom.ts` (`uiZoom`, `toLayoutPx`, `viewportWidth`, `viewportHeight`, `layoutRect`) [V].

| Concern | Rule in this module |
|---|---|
| Heights tied to the viewport | `calc(var(--vh) * N)`; the result table fills the rest of the window with `h-[calc(calc(var(--vh)*100)-var(--app-nav-height)-<header px>)]` and its own `overflow: auto`. Never raw `vh`, never `overflow-x: hidden` on `body` [A] `fe_cross_cutting.md` §2.5 |
| Sticky | Table header: `sticky top-0` inside the table's scroll box. Page-level bars (criteria bar, bulk bar): `sticky top-[var(--app-nav-height)]` |
| Measured geometry fed into styles | Always through `layoutRect()` / `toLayoutPx()`; element sizes through `offsetWidth` / `offsetHeight` (layout px) |
| Drag deltas (column resize, future splitters) | `clientX` delta divided by `uiZoom()` |
| Virtualiser | Fixed row heights from the density constant; no `measureElement`. The scroll element's size is supplied from `offsetHeight`, not from `getBoundingClientRect()`, through the virtualiser's rect observer option if the library default measures viewport pixels (spike, §10.2) |
| Popovers, dialogs, tooltips | Radix primitives in portals through the module wrappers (`RptPopover`, `RptTooltip`, `RptDialog`, `SidePanel`). Placement under the zoom is **not** correct out of the box (spike S-1 check 5): Floating UI computes viewport px and writes them as a `transform` inside the zoomed `html`, so a popover lands at 0.75 × the anchor position. `styles/reports.css` counter-zooms the popper wrapper of module content: `[data-radix-popper-content-wrapper]:has(> .rpt-layer) { zoom: calc(1 / var(--app-zoom)) }` and `> .rpt-layer { zoom: var(--app-zoom) }`; every module popover / tooltip content carries `rpt-layer` (the wrappers add it). Result: within 2 px of the anchor, collision handling intact. Other features' popovers are not changed by this rule (the messaging `EmojiPicker` likely has the same defect; unverified). Hand-rolled positioned elements are not written in this module |
| Layers | `--rpt-z-sticky: 10`, `--rpt-z-panel: 40` (side panel, below the nav at 50), `--rpt-z-dialog: 60`, `--rpt-z-popover: 80`, `--rpt-z-tooltip: 90`. All below nav dropdowns (9999) and the messaging panel (10000) [V `src/components/GlobalNav.tsx` L1756; A]. A popover opened from a dialog is above it by construction |
| Compact controls | The global stylesheet forces `!important` borders and padding on every `input`, `select`, `textarea`, checkbox and radio inside `@layer base` [V `src/styles/globals.css` L361-367]; only rules in the same layer with higher specificity escape (`select.tx-select` [V L428]). Because important declarations reverse layer order, an unlayered or `utilities`-layer `!important` rule loses to the base layer, and `.rpt-input` (0,1,1) loses to `input:not([type="checkbox"]):not([type="radio"])` (0,2,1). The module rules are therefore written inside `@layer base` in `styles/reports.css`, with `!important` and at least the global specificity: `input.rpt-input:not([type="checkbox"]):not([type="radio"])` (and its `:focus` / `:disabled` forms), `select.rpt-select`, `textarea.rpt-input`, `input.rpt-check[type="checkbox"]`, `input.rpt-radio[type="radio"]`. Module controls, `cmdk`'s input and `react-day-picker`'s caption selects carry these classes (spike checks 7 and 9). react-day-picker hides a native `select` over each caption label; the global `select` rule makes it a visible 48 px box, so `reports.css` adds `select.rpt-select.rdp-dropdown` (same layer, `!important`) restoring `opacity: 0; position: absolute; inset: 0` (verified in the spike). Under the zoom Chrome snaps 1 px and 2 px borders to the same 1.33 px, so tests compare padding and height, not border width |
| Target sizes | Interactive targets are at least 32 × 32 layout px (24 px on screen); see §9.7 |
| Charts | Numeric height, `minWidth={0}`; tooltip position verified in the spike |
| Width changes | The messaging panel **overlays** the content (`position: fixed`, `z-[10000]`); measured in the spike at 1,024 and 1,700 px viewports it does not shrink the content width (the `marginRight` of [A] `fe_cross_cutting.md` §2.1 was not observed). The content width still changes with the window: the reports root is a CSS container and layouts use container queries (§9.8); tables and charts re-measure through `ResizeObserver` (Recharts `ResponsiveContainer` verified) |

### 9.6 Long runs: timeouts, session, polling

Facts: axios has no timeout; the access token lives 60 minutes; the stored refresh token is never used
(`refreshToken()` is generated and has no caller); a 401 clears storage and hard-redirects to `/login` [V
`src/services/api.ts` L69-94; `src/api/generated/endpoints/auth/auth.ts` L185; A `fe_cross_cutting.md` §5.1].

| Topic | Design |
|---|---|
| No long blocking request | The longest request is run creation: 65 s client timeout against a 45 s inline budget (25 s from P2). Everything longer is a stored run that is polled [02 C15] |
| Timeouts per call class | Catalog, definition, validate, options, status, rows: 20 s. Run creation: 65 s. Artifact request: 30 s (inline render target 15 s). Download: none, abortable; the file is buffered in memory as a Blob (axios has no streaming on this client), so CSV exports above a size agreed with 02 (`file_size` on `ReportArtifactRead`, requested §13.4 A-16) show "Large file ({size}) — the download may take a while" before the request. Dashboard data: 30 s (server budget 20 s) |
| Losing the response | Client timeout or network error on run creation → poll by `run_id` (§4.3). The run exists on the server or it does not; the UI never assumes |
| Polling | §4.3 for a run, §6.1 for an artifact, §3.4 for the tray. All polling pauses or slows while the document is hidden and stops on terminal states |
| Session during long work | A run survives the browser: after a new login it is in the tray, the history and the notification [02 §18.1 R12]. To avoid the forced logout while a user waits, the 401 handler first tries one silent refresh (`POST /api/v1/auth/refresh` with the stored refresh token), replays the queued requests on success and falls through to today's logout on failure. This is a change to `src/services/api.ts` for the whole app (UX-14, OD-3) |
| Refresh rotation across tabs | The backend rotates refresh tokens: the presented one is revoked and a fresh pair is minted [V `dentc-backend/app/services/auth_service.py` L158]; each tab reads tokens from `localStorage` per request [V `src/services/api.ts` L21-25]. Two tabs that receive 401 in the same round trip would present the same token, the second would get `invalid_refresh` and today's logout would wipe the pair the first tab just stored. The refresh is therefore single-flight per tab (one promise, queued requests wait on it) and across tabs: `navigator.locks.request("dentc:auth_refresh", …)` (Chrome and Edge); inside the lock the tab re-reads `access_token` and, when it differs from the token the failed request carried, skips the refresh and replays; access and refresh token are both written before the lock is released; on `invalid_refresh` the tab re-reads storage once and replays with a newer token if one appeared before it logs out |
| Page left open | Tray polling runs only while a run of mine is active; an idle hub issues no request, so it does not keep a session artificially alive and does not hide an expired one |
| Socket | `AppointNowSocket` [V `src/features/appointnow/lib/appointnowSocket.ts`] already opens its own connection to `/api/v1/messaging/ws`, as messaging does; a third connection is not added. `AppointNowSocket` is generalised into one shared tenant-topic socket (lazy connect, reconnect with back-off, token read at each connect) with type-filtered subscribers; AppointNow and `useRunEvents()` (`report.run.updated`, `report.run.completed`, `report.run.failed`, `report.artifact.ready`) subscribe to it (UX-33). It only triggers refetches; polling stays the contract |
| Double submit | Run buttons are disabled while `submitting`; the client `run_id` makes a retried POST idempotent |

### 9.7 Accessibility (WCAG 2.2 AA)

| Criterion | Application |
|---|---|
| 1.3.1 Info and relationships | Results are native tables with `th scope`; group headers are row headers; the criteria panel uses `fieldset` / `legend` per section; the matrix is the only `role="grid"` |
| 1.4.1 Use of colour | Deltas, statuses and bands carry an icon or sign and text; chart series differ by dash or marker |
| 1.4.3, 1.4.11 Contrast | Text 4.5:1 on the house palette; chart marks, focus rings and heat shading 3:1, or values are shown |
| 1.4.10 Reflow | Criteria, chips, cards, pager and dialogs reflow at 320 CSS px; tables scroll inside their own container |
| 1.4.12 Text spacing | Single-line cells truncate with ellipsis and never clip without a path to the full text: "Row details" in the side panel (§5.2); controls and chips grow with the text |
| 1.4.13 Content on hover or focus | Tooltips and definition popovers are dismissible with Esc, hoverable and persistent |
| 2.1.1, 2.1.2 Keyboard | Every control, the Reports menu and its fly-outs (Radix dropdown, §3.3), the column chooser, the pickers (listbox panes, §8.1), the drill and the matrix are operable by keyboard; dialogs trap focus and return it; no trap elsewhere |
| 2.2.1, 2.2.2 Timing, moving content | Undo of Clear Criteria has no time limit (§4.7); worklists never move rows under the reader, they offer "List changed — Refresh" (§7.5) |
| 2.4.1 Bypass blocks | "Skip table" link before every result table (§5.2); the hub rail is a `nav` landmark; the results region is a labelled region |
| 2.4.2 Page titled | Every module route sets `document.title` = "{report or page title} - Reports" (validate's `title` updates it) and moves focus to the page heading on route change; the app sets no per-route title today (only `ChatContext.tsx`, `PublicBookingPage.tsx` [V]) |
| 2.4.3, 2.4.7 Focus order and visible focus | Order follows the legacy section order; the house focus ring is kept on module controls |
| 2.4.11 Focus not obscured | `scroll-padding` equal to the sticky header and footer heights inside the table scroll box; the bulk bar never covers the focused row |
| 2.5.7 Dragging movements | Column order, favorites order, column width and tile order have button or keyboard alternatives |
| 2.5.8 Target size | 24 CSS px minimum = 32 layout px at zoom 0.75 for sort buttons, chip removers, row checkboxes, expand toggles, menu triggers; this is why the compact density is 32 px |
| 3.2.2 On input | Auto-run of `instant` reports changes only the results region and is announced; focus never moves |
| 3.3.1, 3.3.3 Errors | Field errors as text next to the control with `aria-describedby`; a summary with links; messages of 04 §10.4 say how to fix |
| 3.3.7 Redundant entry | Restore last run, saved views, default view |
| 4.1.2 Name, role, value | Sort state through `aria-sort` on the sorted header only; expand toggles with `aria-expanded`; virtualised tables expose `aria-rowcount` / `aria-rowindex` |
| 4.1.3 Status messages | One polite live region per page for run progress and results; `role="alert"` for failures, without moving focus |
| Motion | Skeleton shimmer and chart animation are off under `prefers-reduced-motion` |
| Tests | `checkA11y` [V `e2e/support/axe.ts`] runs with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` today; reports specs add `wcag22aa` and do not disable `color-contrast`; the open Reports menu with a fly-out, a result table without interactive cells (`scrollable-region-focusable`) and the paged view are scanned |

### 9.8 Responsive behaviour

Tailwind breakpoints follow the real viewport, not the zoomed one [A]; the content width also changes when the
messaging panel opens. The reports root therefore declares `container-type: inline-size` and module layouts use
container queries (Tailwind 4 `@container` variants). Tailwind's own container sizes (`@md` = 28rem, `@lg` = 32rem)
and viewport breakpoints (`md` 48rem, `lg` 64rem) [V `node_modules/tailwindcss/theme.css` L280-290] do not match
the widths below, so `reports.css` defines three named container sizes once and the module uses only these
variants (`@rpt-sm`, `@rpt-md`, `@rpt-lg`):

```css
@theme { --container-rpt-sm: 600px; --container-rpt-md: 900px; --container-rpt-lg: 1280px; }
```

Portalled dialogs, popovers and side panels are outside `.rpt-root` and size by their own container (the dialog
root declares `container-type: inline-size`); embedded `DashboardTile`s declare their own container (§7.1).

| Container width (layout px) | Hub | Runner and classic frame | Results | Dashboards |
|---|---|---|---|---|
| ≥ 1280 (`@rpt-lg`) | Rail + main | Classic: list and criteria side by side. Enhanced: bar on one or two lines; side panel docked (560 px) | Full toolbar | 12-column grid as declared by tile `size`; matrix full |
| 900 – 1279 (`@rpt-md`) | Rail collapses to icons | Classic: list above criteria (two-column radio grid kept). Enhanced: bar wraps; More options as a sheet | Side panel overlays the table | Same grid; KPI groups wrap |
| 600 – 899 (`@rpt-sm`) | Tabs instead of rail | Criteria behind "Criteria (n)" with Apply / Run; single-column sections | Toolbar collapses into a menu; first column pinned | One column below 768 px [06 §3.6]; filter bar behind "Filters (n)" |
| < 600 | Single column | Same; dialogs full screen (by their own container) | Table scrolls horizontally with the first column pinned; worklists as cards; column chooser is the way to fit | Single column; KPI cards keep value, delta and sparkline; matrix scrolls with the metric column pinned; no layout editing [06 §3.6] |

Not supported on small containers: the builder (message "Open on a wider screen"), dashboard edit mode, column
resizing by drag. Mobile scope is OD-10.

### 9.9 Print stylesheet

House rule: output is a generated server document, never the browser print of app UI; no `@media print` rule exists
today [A] `fe_cross_cutting.md` §2.8. 08 §7.1 X-1 adds that a grid with a patient-level class is never printed from
the browser, because that print is not an audited export. Users still press Ctrl+P, which no page can prevent. The
module therefore ships a small print sheet with two jobs: keep patient-level rows off paper that the audit trail does
not know about, and make what may be printed (aggregate results, dashboards) legible instead of a cropped, zoomed
screenshot.

```css
/* src/features/reports/styles/reports.css */
/* Every rule is scoped to a page that renders the module: the lazy stylesheet stays loaded for the
   rest of the session, and other features print app UI (BillingDetailsModal.tsx L87 window.print()). */
@media print {
  html:has(.rpt-root) { --app-zoom: 1; }      /* reset the variable, so --vh / --vw follow as well */
  html:has(.rpt-root) .app-global-nav,
  html:has(.rpt-root) .app-messaging-panel { display: none !important; }
  .rpt-root :is(.rpt-rail, .rpt-criteria, .rpt-toolbar, .rpt-side-panel, .rpt-bulk-bar) { display: none !important; }
  .rpt-root { padding: 0; }
  .rpt-root .rpt-results-scroll { height: auto !important; overflow: visible !important; }
  .rpt-root .rpt-table thead { display: table-header-group; }   /* repeat the header on each sheet */
  .rpt-root .rpt-table tr { break-inside: avoid; }
  .rpt-root .rpt-block[data-patient-level="true"] .rpt-table { display: none !important; }   /* server PDF only */
  .rpt-root .rpt-print-notice { display: block; }               /* text per block: see the table below */
}
```

The zoom is undone by resetting `--app-zoom` (used by `html { zoom: var(--app-zoom) }` and by
`--vh: calc(1vh / var(--app-zoom))` [V `src/styles/globals.css` L74-77, L198-199]); setting `zoom: 1` alone would
leave every `calc(var(--vh) * N)` height a third too tall on paper. The run tray button lives in the nav and is
hidden with it.

| Rule | Detail |
|---|---|
| Role | Safety net only. The Print button always uses the server PDF (§6.1), which writes the `report.print` audit event |
| Patient-level blocks | `data-patient-level="true"` is set on a block when one of its served columns has a class of `PHI_CLASSES` = `phi_identified`, `phi_sensitive`, `clinical`, `financial_patient`, `payment_instrument` (the classes removed for aggregate-only access [08 §4.4]; column `data_class` [02 §3.3]; §13.4 A-14). On paper its rows are replaced by: "Patient-level rows are not printed from the screen. Use Print: the report is produced as a PDF and the print is recorded." Title, criteria echo and summary cards print |
| Other blocks | Print with the sheet. When the result has more rows than are loaded, the notice reads "Printed from the screen: loaded rows only. Use Print for the full report." |
| Nav class | `GlobalNav` and the messaging panel get a class used by the rule above (they have none that a stylesheet can target today) |
| Dashboards | Aggregate tiles print with the same sheet (SVG charts print); list tiles follow the patient-level rule; printing is not offered as a button (§7.6) |

### 9.10 Tests

| Layer | Tooling | Covers |
|---|---|---|
| Pure models | vitest, node environment (existing set-up [A]) | `paramExpr` and `dateTokens` against the shared vector files (FLT-04, FLT-05); `paramCodec` and `urlState` round trips; `parseDefinition` over every backend fixture; `layoutModel` migration; `scheduleModel` preset ↔ cron; `catalogModel` ranking; `runModel` cadence and message map; `formatters`; `legacyRedirects` |
| Components | vitest + `jsdom` + Testing Library (NEW dev dependencies, UX-13) | `ParamForm` from definition fixtures in both layouts; dependency behaviour; `ResultTable` from the golden `ReportResultPage` fixtures (group headers, subtotals, inset blocks, matrix) [02 §15.5]; run lifecycle with a mocked service; dialogs |
| Contract | Fixture sync script copies `tests/contract/definitions/*.json` and result pages from the backend repository into `__fixtures__/` | Unknown `type`, `kind`, `shape`, `layout`, `icon_key`, `route_key` fail the suite |
| End to end | Playwright [V `e2e/`], one spec per report family as it ships: open from the nav, defaults equal the parity file, run, drill, export, save a view; axe on runner and results | Needs backend and seeded data; no API mocking today [A] |
| Manual | Workflow WF-30 of `docs/qa/DentC_E2E_Test_Workflows.html` is rewritten for the hub, not forked [A] `fe_cross_cutting.md` §7.6 | |
| CI | `npm test` is added to the workflow, which today runs lint, API drift and build on one branch only [A] §1.4 | |

---

## 10. Library decisions

### 10.1 Decisions

Versions and licences: **[V]** read from `package.json` and `node_modules/*/package.json`; **[R]** from
`research/analytics_ux_patterns.md` §10 (npm registry on 2026-11-22). Updated after spike S-1 (2026-11-23, results in
`spikes/S-1_library_spike.md`): the three packages marked **installed** below are pinned exactly in `package.json`.

| Need | Decision | Package | Version | Licence | Notes |
|---|---|---|---|---|---|
| Table state: columns, order, pinning, sizing, selection | Adopt (AD-11) | `@tanstack/react-table` | **9.3.1, installed, exact pin** (candidate A chosen by spike S-1 check 1; candidate B 8.21.3 not needed) | MIT | Headless; the module keeps native table markup; sorting, grouping, totals and paging stay on the server, so only the column-state features are used. Wrapped in `useResultTable()` (`src/features/reports/results/useResultTable.ts`, 91 lines, no casts). v9 API notes: features are registered with `tableFeatures({...})`; pinning state is `{ start, end }`; `column.getStart("start")` is the sticky offset and must add the widths of fixed leading columns (selection) |
| Row virtualisation | Adopt (AD-11) | `@tanstack/react-virtual` | **3.14.28, installed, exact pin** (latest at install) | MIT | Fixed row heights (§5.2); `observeElementRect` reports `offsetWidth` / `offsetHeight` (layout px); `scrollToIndex` settles one frame later |
| Charts | Keep | `recharts` | `^3.6.0`, resolved 3.6.0 [V]; latest 3.11.0 [R] | MIT [V] | One wrapper `ChartFrame`; sparkline and goal bar are plain SVG. No second chart library; ECharts only if a later spike proves a need (dense heat maps) |
| Popover, dialog, tooltip, tabs, dropdown menu | Use the installed primitives through module wrappers | `@radix-ui/react-popover` 1.1.15, `react-dialog` 1.1.15 (now a direct dependency, exact pin), `react-tooltip` 1.2.8, `react-tabs` 1.1.13, `react-dropdown-menu` 2.1.16 | installed [V] | MIT [V] | The shadcn wrappers in `src/components/ui/` are not reused as they are: `dialog.tsx` is fixed at `z-50` and the kit's token classes differ from the house hex palette [A] |
| Command palette | Use | `cmdk` | 1.1.1 installed, unused [V] | MIT [V] | |
| Dates | Native `<input type="date">` plus presets; optional range calendar | `react-day-picker` | 9.13.0 installed, unused [V] | MIT [V] | No date library is added: `date-fns` 4.1.0 is only a transitive dependency [V]; token maths is `dateTokens.ts` with vectors shared with the backend |
| Definition parsing | Use | `zod` | 4.4.3 installed [V] | MIT [V] | |
| Markdown (glossary, assistant) | Use | `react-markdown` | 10.1.0 installed [V] | MIT [V] | |
| Icons, toasts | Keep | `lucide-react` 0.562.0, `sonner` 2.0.7 | installed [V] | ISC, MIT [V] | Icon keys → `iconMap.ts` |
| Resizable panes | Not used in P0-P2 (collapse handle only) | `react-resizable-panels` | 4.5.2 installed [V] | MIT [V] | The wrapper `src/components/ui/resizable.tsx` requires `PanelGroup` and `PanelResizeHandle`, which version 4 does not export (`Group`, `Panel`, `Separator`) [V `node_modules/react-resizable-panels/dist/react-resizable-panels.d.ts`]; it is unused and would fail at first use. If resizing is added later, import the v4 names directly after a zoom check |
| Drag and drop | Not before P4; buttons first (WCAG 2.5.7) | `@dnd-kit/core` | 6.3.1 [R] | MIT [R] | Pointer maths under the zoom is unverified |
| Dashboard free grid | Not planned before a P4 spike | `react-grid-layout` | 2.x [R] | MIT [R] | P1-P3 dashboards use fixed sections |
| Component tests | Add as dev dependencies | `jsdom`, `@testing-library/react`, `@testing-library/user-event` | pinned at install (not researched) | MIT (to confirm at install) | None installed today [A] |
| Forms, URL state, state manager, cron parsing, UUID | Nothing added | — | — | — | Hand-rolled form state (house style; `react-hook-form` is installed and unused [A]); react-router search params; React Query; schedule presets map to cron in `scheduleModel.ts`, the server validates free cron text and returns its summary sentence and next occurrences (§6.2); UUID v7 for `run_id` is the hand-written `newRunId()` on `crypto.getRandomValues` with a test vector (§4.3) |
| PDF, XLSX, CSV in the browser | Nothing | — | — | — | Server-side (AD-6). `jspdf` 4.2.1 [V] stays for other features and is forbidden in this module |

Not adopted: AG Grid Enterprise (row grouping, pivot and server-side rows are commercial, licensed per frontend
developer [R]), MUI X Data Grid (needs MUI and Emotion), Glide Data Grid (published peers stop at React 18 [R]),
`@tremor/react` (peer range stops at React 18 [R]), a client pivot library (pivots are computed on the server, AD-11).

### 10.2 Spike S-1 (UX-02): what must be verified before the versions are pinned

**Done 2026-11-23.** Outcome per check: [spikes/S-1_library_spike.md](spikes/S-1_library_spike.md) - 1-4, 6, 10, 12 pass;
5 and 7 fail out of the box and pass with the `reports.css` rules of §9.5; 8 passes for tooltip and window resize (the
messaging panel overlays, see §9.5); 9 passes with the layered input rule; 11 passes for the CSP (no file saved, no
print dialog opened during the spike).

All checks run in the app shell at `html { zoom: 0.75 }`, with the messaging panel opened and closed, in Chrome and
Edge (the browsers in use; others per the support policy).

| # | Check | Pass condition | Fallback |
|---|---|---|---|
| 1 | TanStack Table v9 with React 19.2: column visibility, order, pinning, sizing, row selection; TypeScript types under `strict` + `noUncheckedIndexedAccess` | Builds without casts; the wrapper `useResultTable()` is under 150 lines | v8.21.3 |
| 2 | TanStack Virtual: 50,000 fixed-height rows, scroll to any index, sticky `thead` inside the scroll box | Visible window filled (no blank band at the bottom from a viewport-pixel measurement); scroll position stable while pages arrive; 60 fps on a mid-range laptop | Rect observer based on `offsetHeight`; larger overscan |
| 3 | Sticky header + pinned left column + horizontal scroll in the same box | No jitter, shadows correct, focus never hidden | Pin only the first column |
| 4 | Column resize by pointer | Handle follows the pointer exactly (delta ÷ `uiZoom()`) | — |
| 5 | Radix popover, dropdown and tooltip anchored to a table header and to a control inside a dialog; collision at the window edge | Placement within 2 px of the anchor; layers as §9.5 | Fixed-position popover computed with `layoutRect()` |
| 6 | Radix dialog over the nav and under nav dropdowns and the messaging panel | Layer order as §9.5 | Adjust tokens |
| 7 | `react-day-picker` 9 range calendar inside a popover, with the global `!important` input and button styles | Usable and themed: its select and buttons carry the `rpt-` classes of §9.5 and the layered rules win | Native date inputs only (already the baseline) |
| 8 | Recharts tooltip and legend positions; chart resize when the messaging panel toggles | Tooltip at the pointer; no stale width | Fixed-position tooltip |
| 9 | `cmdk` list with 300 entries, keyboard navigation, global input styles | Themed (its input carries `rpt-input` and the layered rule wins), no lag | Plain filtered list |
| 10 | Lazy route + error boundary + failed dynamic import after a simulated deploy (deleted hashed chunk, served both as 404 and as the `index.html` fallback) | `vite:preloadError` or the boundary's message match shows "A new version is available" with Reload; no blank page | — |
| 11 | Blob download and print-tab flow with the production CSP of `server.js` | File saved with the right name; PDF opens in the tab and prints | In-app viewer dialog with a blob `iframe` |
| 12 | Bundle effect | Main chunk grows by no more than 10 KB gzip; `reports` chunk under 180 KB gzip without charts | Split further |

---

## 11. Migration of what exists

| Existing piece | State today | What happens | When |
|---|---|---|---|
| Six client-executed reports (`src/components/reports/reports/*.ts`, 24 files / 2,639 lines with the shell [A] `fe_existing_reports.md` §0) | Page list endpoints, aggregate in the browser, capped at 600-1,600 rows | Replaced by engine definitions run in the new runner (ENG-20). Old ids redirect (§2.2). Their defects D1-D9 [A] §2.11 are removed by replacement, not patched: frozen saved-view dates (D1), string sort of dates (D2), missing footer totals (D3), provider picker that excludes (D4), office list ignoring assignments (D5), exports without truncation notice (D6), three claim-status vocabularies (D7), adjustments counted as collections (D8) | P0 (UX-12) |
| Old runner files: `ReportShell`, `ReportFilterPanel`, `DataTable`, `ReportChart`, `ReportCatalog`, `ReportFilterBar`, `exportCsv` / `exportExcel` / `exportPdf` / `exportMatrix`, `savedViews`, `reportRange`, `reportMetrics`, `types`, `reportCatalog` | In use by `/reports` and `/reports/run/:reportId` | Kept only behind the engine-probe fallback (§2.3) while some client has no engine; then deleted in one change. `reportRange.ts` presets are superseded by `dateTokens.ts` (FLT-04); `exportPdf.ts` is the lone user of `dataurlnewwindow`, which the production CSP probably blocks [A] `fe_cross_cutting.md` §2.8, so it is not carried over | P0 (UX-12) |
| `useReportRefData.ts` | Also imported by Utilities [V] | Moved to `src/components/utilities/lib/` before the folder is deleted | P0 (UX-12) |
| Reports home `src/components/pages/Reports.tsx` | Seven KPI tiles and three charts computed in the browser from capped samples; "Outstanding A/R" hard-coded "Awaiting backend endpoint" [A] §1.3 | Replaced by the hub. Its KPI and chart content returns as `dashboards.main` on the metric service (P1, DASH-04). Between P0 and P1 the hub shows no KPI tiles rather than capped numbers | P0 hub; P1 dashboard |
| Saved views in `localStorage` (`dentc:reports:views:<user_id>:<reportId>` [V `src/components/reports/lib/savedViews.ts`]) | Per browser; wiped on logout and on every 401 | One-time import when server views exist: on first hub load, read the caller's keys, map each to `ReportSavedViewCreate` (table below), create it, delete the key; a name conflict gets the suffix " (imported)". Because storage is wiped at every logout, only views of the current session exist, so the volume is small. The new runner never writes views to `localStorage` | P1 (UX-19) |
| Time-clock report (`/time-clock/report`, `HoursReport.tsx`) | Bespoke screen with editor workflow; crawls up to 12,000 punches and computes overtime in the browser; client CSV and jsPDF [A] `fe_report_like_outputs.md` §3.4 | The screen stays (it is an editor, not only a report). Catalog entries `management.time_clock_report` and `my_reports.time_clock_report` run in the generic runner through the engine's `python_builder` [02 §14]. `HoursReport` is rebound to the server report (`getTimeClockReport`, `getTimeClockReportCsv`, `getTimeClockReportPdf` exist in the generated client with no caller [V `src/api/generated/endpoints/staff/staff.ts` L1503-1689]), which removes the crawl, the client CSV and the jsPDF print | P1 (UX-30) |
| Lab report and lab cost report (`src/features/lab-tracking/`) | Patient tab: server PDF and CSV for one patient, client jsPDF cost report [A] §1.1 O5-O7 | The patient tab stays a patient document. The office-wide reports become `appointment.lab_report` and `appointment.lab_cost_report` in the catalog (P3, [02 §14]); the tab gets "Open office-wide report" with the patient's office preselected. `getLabCostReport` [V `src/api/generated/endpoints/appointments/appointments.ts` L190] replaces the client cost PDF when the adapter ships | P3 |
| Four patient PDFs (`openServerReport` callers) | Server PDF with jsPDF fallback | Unchanged; listed in the patient Print launcher (§1.7) | P1 (UX-29) |
| `/dashboard`, My Page | Client-aggregated widgets | The routes stay. KPI widgets and My Page stats are re-pointed to the metric service and their client aggregation is deleted by DASH-08; My Page embeds the tiles of `dashboards.my`; links to `/reports` are retargeted (§1.7) [06 §2.3, §10] | P1 (DASH-08); links P3 |
| `InsuranceDashboard.tsx` | Only caller of a legacy roll-up (`getReportAccountsReceivable`, L118 [V]) | Rebound to the metric query before the roll-up is retired [02 §14] | P2 (UX-37) |
| GlobalNav Reports menu | Seven static leaves | §3 | P0 (UX-11) |
| Ten placeholder routes | "Coming Soon" pages | Deleted; redirects of §2.2 | P0 (UX-11) |
| Docs | `docs/reports/reports_backend_devreport.md` lists delivered endpoints as open [A] §3.4; QA playbook WF-30 covers the six old reports | Marked superseded by this plan; WF-30 rewritten | P0, P3 |

Mapping of an old saved view (`SavedView.filters: ReportFilters` [V `src/components/reports/types.ts`]):

| Old field | New value |
|---|---|
| `preset` `today`, `yesterday`, `this_week` | `date_preset` of the same name |
| `preset` `this_month`, `this_quarter`, `this_year` | `date_preset` `month_to_date`, `quarter_to_date`, `year_to_date` (same ranges: start of the period to today [V `src/components/reports/lib/reportRange.ts`]) |
| `preset` `custom` + `range.from` / `range.to` | `date_preset = "custom"`, `date_from`, `date_to` |
| `office` = the working office at save time, or `null` | `office_policy = follow_working_office`; `null` ("All offices") → `assigned_offices` |
| `office` = another office id | `office_policy = fixed`, `office_scope = {office_ids: [id]}` |
| `provider` (one id or empty) | `provider_ids: [id]` or `"all"` |
| `status`, `search`, `extra{}` | Mapped per report where the engine definition has an equivalent parameter; otherwise dropped and named in the import notice |
| `reportId` | `object_key` through `LEGACY_REPORT_ID_MAP` (§2.2) |

---

## 12. Work items

Sizes: S up to 2 days, M up to 1 week, L up to 2 weeks, XL more (brief §4). `ENG-nn` = 02 §17, `FLT-nn` = 04 §14;
`SEC-nn` = 08 §12, `MET-nn` = 05 §11, `DASH-nn` = 06 §11; `RPT` names the area of `catalog/*`, not yet written;
`A-n` = assumption of §13.4. Ids are stable and not ordered by phase: UX-45 to UX-49 were added, and UX-25, 26, 27, 38,
39, 41, 42 and 44 were re-scoped, when 08 and 06 became available. 06 specifies and builds the tile bodies, the
dashboard header and the worklist dialogs (DASH-02, 03, 06, 11, 30, 38, 49); the items below build the frames and
primitives they sit in (§7).

| ID | Title | Phase | Size | Depends on | Acceptance check |
|---|---|---|---|---|---|
| UX-01 | Feature skeleton: `src/features/reports/`, lazy `/reports/*` route, `ReportsEntry`, error boundaries, stale-deploy detection, not-found page, engine-state handling with fallback to the old pages, `server.js` 404 for unknown `/assets/*` | P0 | M | ENG-01 | `App.tsx` holds one report route; an unknown `/reports/x` shows the not-found page; a thrown render error shows the boundary, not a blank app; a deleted hashed chunk shows "A new version is available" with Reload; each engine state of §2.3 (`on`, `off` by any 404, `misconfigured`, `unknown`) gives the nav and routes of its row, and with the engine off the old pages still work |
| UX-02 | Library and zoom spike S-1 | P0 | S | — | The twelve checks of §10.2 are answered in writing; versions pinned in `package.json` |
| UX-03 | Service layer, `reportKeys` (user id and working office in the keys, removal on logout), per-call timeouts, `silent_error` opt-out in `queryClient.ts`, `skip_scope_toast` flag in the axios interceptor, Blob error-body parsing for downloads, generated-client wiring | P0 | M | ENG-05, ENG-12, ENG-13, ENG-19 | No raw axios in the module; a failed validate shows no toast; a 403 `office_not_assigned` on a report call raises no interceptor toast; a 410 on a download maps to "This result has expired"; an office switch never shows the previous office's cached result; after logout and a login as another user in the same tab no report query of the first user is served |
| UX-04 | Definition model: `parseDefinition`, icon map, record-route map, formatters, contract fixtures | P0 | S | ENG-03, ENG-19 | Every backend definition fixture parses; a fixture with an unknown column `type` fails the suite |
| UX-05 | Hub home v1: groups, cards, search over names, legacy aliases, descriptions and keywords; correspondence links page | P0 | M | UX-03 | Typing "Production by Codes - Provider" finds Production Report with the alias shown; the correspondence page lists the eight entries of §1.6 with their state |
| UX-06 | Classic frame: category page, SELECT REPORT list (commit on Enter / Space / 400 ms; a report change resets the query string), `ClassicCriteriaLayout` from `criteria_rows` / `row_span`, enum-member checkboxes, `entity_multi` dropdown and lookup-text renderings, legacy action bar | P0 | L | FLT-10, UX-04, A-3 | For each migrated report the classic screen shows the legacy sections in legacy order with legacy labels and defaults; the section pairing equals the legacy rows for all 12 Daily reports; Page Break beside GROUP BY ticks and unticks `page_break_by`; a SPECIALTY dropdown holding two values from a saved view shows the read-only box + SELECT; nothing runs before PRINT / PREVIEW; PRINT / PREVIEW produces the screen result and the file |
| UX-07 | Enhanced runner shell: header, criteria bar, More options, chips, run lifecycle per cost class, stale handling, page states including `no_working_office`, frame switch with form values in router state | P0 | L | FLT-10, FLT-15, UX-03 | `instant` auto-runs, `interactive` waits for Run; changing a criterion dims the result; cancel stops an inline run; a promoted run continues by polling under the same `run_id`; with `office_id = null` nothing is requested and an unassigned user sees the office banner; switching frame keeps a typed name range |
| UX-08 | Result table v1: print-stream rows, bands, inset blocks, sticky header, server paging with virtualisation, focusable scroll region, Skip table link, focused-row retention, paged view, row details, flat re-sort, quick filter, density, grand total bar | P0 | L | UX-02, ENG-13 | A 50,000-row result scrolls to any position and shows the same rows as the CSV; no number on screen is computed in the browser; one activation of "Skip table" reaches the footer; focus survives scrolling the focused row out of view; the paged view reaches every row by screen-reader table navigation; axe `scrollable-region-focusable` passes on a result without links |
| UX-09 | Result chrome: context line, criteria echo, summary cards, notices, empty / failed / expired states, key-value blocks | P0 | M | UX-08, ENG-11 | Every `error_code` of §5.8 has its message; an empty result offers relaxations; `preview_only` shows the notice |
| UX-10 | CSV export and artifact download flow | P0 | S | ENG-15, ENG-57 | A CSV of a run downloads with the artifact's `file_name`; a second click returns the same artifact |
| UX-11 | GlobalNav: legacy Reports menu restored, catalog-driven and rights-filtered, rendered with Radix dropdown-menu (sub-menus, roving focus, Escape, ARIA), `reports_search` item, total `mergeCatalog` and main-chunk error boundaries, idle catalog fetch; redirects; placeholder routes deleted | P0 | L | UX-03, ENG-05, SEC-04 | Every legacy category with at least one report in the caller's catalog is present, in legacy order; with the engine off the menu equals today's; a user whose groups hold only the Daily Reports family sees one category entry; every fly-out opens, moves and closes by keyboard with focus returned; a malformed catalog response leaves every other screen usable; every old `/reports/*` path lands on a real page |
| UX-12 | The six existing reports run on the engine runner; old runner, old home and old saved-view store retired; shared helper moved | P0 | M | ENG-20, UX-06..09 | `src/components/reports/**` and `pages/Reports.tsx` are deleted after the last client has the engine; Utilities still build |
| UX-13 | Test tooling: `jsdom` + Testing Library, fixture sync, vitest suites of §9.10, `paramCodec` round-trip vectors per parameter type, Playwright reports spec with `wcag22aa`, `npm test` in CI | P0 | M | ENG-19 | CI fails on a failing reports test; every parameter type has a codec round-trip vector; the first reports e2e spec passes locally |
| UX-14 | Session continuity: request timeouts, silent token refresh on 401, single-flight per tab and across tabs (`navigator.locks`), replay of queued requests | P0 | M | — (OD-3) | A session older than the access-token lifetime keeps working without a login prompt while the refresh token is valid; two tabs that receive 401 in the same second both keep working; an invalid refresh token logs out exactly as today |
| UX-15 | `reports.css`: compact control rules inside `@layer base`, layer tokens, named container sizes, scoped print sheet; module dialog / popover / side-panel wrappers | P0 | S | UX-02 | Module controls are compact despite the global `!important` rules; Ctrl+P on a report prints an aggregate result without nav and criteria and prints no patient-level rows; Ctrl+P on another screen after visiting Reports prints as before |
| UX-16 | Column chooser, widths, pinning, layout blob v1 | P1 | M | UX-08, ENG-28 | A layout saved with a view is restored; an unknown column key in a stored layout is ignored |
| UX-17 | Grouping: expand / collapse, outline mode, sort-by menu on grouped results | P1 | M | UX-08, A-4 | Collapsing a group hides its rows without loading them; choosing a sort option re-runs with `sort_by` |
| UX-18 | Export dialog (PDF, XLSX, CSV; shapes; options), print flow with the `openReportArtifact` state table, purpose prompt, outside-recipient question, export notice, artifact following, volumes | P1 | M | ENG-22, ENG-23, ENG-27, SEC-16 | Screen totals equal PDF and XLSX totals for the same run; a pending artifact finishes without blocking the page; Print opens the PDF in a tab that was opened at click time; an export answered with 422 `purpose_required` closes the blank tab and succeeds after the prompt; a queued run never leaves a waiting blank tab; a blocked popup offers "Open PDF" |
| UX-19 | Saved views: dialogs, relative-date and office-policy choices, resolve notices, default view, legacy ADD / UPDATE MY FAVORITES, import of `localStorage` views | P1 | L | ENG-28, FLT-19 | A "Month to date" view saved in one month runs the next month's dates; a view that follows the working office runs for the office the user is in; views survive logout |
| UX-20 | Favorites, recents, Library page, hub start strip | P1 | M | ENG-29 | Favorites keep their order across sessions and devices; "Continue" opens the last result when it has not expired |
| UX-21 | URL view state (`url_safe` rule), copy link (live and snapshot), run snapshot page, hydration from `_run`, restore last run | P1 | M | FLT-19, ENG-13, UX-48 | Reloading a runner URL restores criteria (including name ranges, from the run) and the stored run without a stale overlay; a snapshot link refuses a user whose access does not cover the run; opening a snapshot link while signed out shows the snapshot after login; no name appears in a URL |
| UX-22 | Drill-through: side panel, record navigation and Scheduler hand-offs, worklist and ratio targets, breadcrumb, reconciliation line | P1 | M | ENG-30 | The drill list total equals the clicked number; Back returns to the same scroll position; a drill to an appointment opens the Scheduler on that appointment |
| UX-23 | `PivotMatrix` for matrix blocks | P1 | M | ENG-31, UX-02 | The golden matrix fixture renders with sticky headers, nulls as dashes, totals from the payload |
| UX-24 | Chart view from `charts[]` (lazy chunk) | P1 | S | UX-09 | Opening the Chart tab loads the chart chunk once; the table alternative shows the same values |
| UX-25 | Dashboard page frame: routes, catalog page with the landing dashboard, view tabs, section grid, `DashboardTile` chrome and states, tile registry, one data call with per-tile retry, layout read and write, `list` tile | P1 | M | ENG-33, SEC-18, DASH-01 | One data call fills all tiles; a failing tile shows Retry and the others stay; an unknown tile `kind` renders `UnknownTile` and fails the contract test; a stored layout is applied after a reload |
| UX-26 | Interactive mode of `PivotMatrix` for `MetricMatrix` (DASH-03): grid pattern with one tab stop, arrow-key navigation, cell menu, focus kept clear of the sticky regions | P1 | S | UX-23 | One Tab enters the matrix and one Tab leaves it; arrow keys move between cells; Enter drills; the focused cell is never under a sticky region at zoom 0.75 |
| UX-27 | Glossary page and metric entries in the hub search | P1 | S | ENG-32, MET-08, DASH-02 | The glossary is searchable by label and alias; a metric result of the hub search opens its glossary entry |
| UX-28 | Statements screen: custom criteria layout, side-effect confirmation, statement actions, volumes | P1 | M | RPT, ENG-26, ENG-61, FLT-14 | The screen carries every control of `legacy/statements_reports.json`; PRINT STATEMENTS asks for confirmation and is disabled with its reason without `access.can_commit` |
| UX-29 | Patient-context entry points: patient Print launcher, context passing, provider-restriction banner | P1 | S | FLT-16, FLT-17, A-1 | Ledger Report opened from a patient is pre-filled with that account; the old "Coming Soon" alert is gone |
| UX-30 | Time clock: catalog entries in the runner; `HoursReport` rebound to the server report | P1 | M | ENG-34 | The bespoke page and the runner show the same totals; no client crawl of punches remains |
| UX-31 | Command palette and keyboard shortcuts | P1 | S | UX-05 | Ctrl+K on a reports page opens the palette; Enter opens the first result |
| UX-32 | Presentation preference per user, organisation default; `useReportsUiPrefs` read-merge-write of the `reports_ui` subtree | P1 | S | UX-06, UX-07, A-8 | The chosen frame is used on the next login from another browser; a change in one tab is not lost when another tab saves; keys outside `reports_ui` are never changed |
| UX-33 | Background runs: status panel, cancel, run tray in GlobalNav (the module's notification entry, own error boundary), shared tenant-topic socket generalised from `AppointNowSocket`, run history page | P2 | L | ENG-38, ENG-40, ENG-42, UX-48 | A background run started on one page is found in the tray after navigation and after a new login; without the socket the tray still updates by polling; AppointNow and the tray share one socket connection; a notification link opened while signed out lands on its target after login |
| UX-34 | Schedules: dialog, schedules page with kind filter, history, paused states, take-over, sync from view, send a run to people, Subscribe on dashboards through the twin report | P2 | L | ENG-43, ENG-44, SEC-25, UX-19, UX-48 | A schedule cannot be saved with "follow working office"; the summary sentence equals the stored recurrence (server sentence for free cron); a recipient who opens the e-mail link while signed out lands on the run after login; a paused schedule explains why and offers the fix |
| UX-35 | Sharing of saved views: visibility, shares dialog, Shared with me | P2 | M | ENG-28, SEC-17 | A recipient can run and duplicate but not overwrite a shared view; the view never shows offices outside the recipient's access; a view that names a patient cannot be published to the organisation |
| UX-36 | Administration pages: settings with the `security` block, all runs, all schedules, usage, access links | P2 | M | ENG-36, ENG-47, SEC-15 | A holder of `reports_runs_manage_all` can cancel another user's run; a holder of `reports_schedules_manage_all` can take over a schedule; each tab is absent without its right |
| UX-37 | Rebind `InsuranceDashboard`, the one caller of a legacy roll-up, and retarget the My Page links (the other client-aggregated widgets are re-pointed by DASH-08) | P2 | S | ENG-35 | No importer of the deprecated `/reports/*` roll-up functions remains |
| UX-38 | Worklist page shell: routes and index with counters, live keyset paging, selection model, action bar and confirmation frame, card layout on narrow containers (dialogs and per-worklist behaviour: DASH-30) | P3 | M | ENG-48, ENG-49, SEC-36, A-5 | A fixture worklist definition renders with its declared actions; "Load more" keeps the scroll position; 422 `invalid_cursor` restarts the list; the 60-s tick never moves rows under the reader and offers "List changed — Refresh"; the confirmation shows selected, accepted and excluded counts before anything is sent |
| UX-39 | Bulk actions on snapshot report results: selection, confirmation with exclusions, hand-off to the letters batch and to the handlers of DASH-31 | P3 | S | ENG-49, DASH-31 | "Letters" on a patient list opens the letters batch with exactly the selected patients |
| UX-40 | Responsive and accessibility pass for all report families; Playwright spec per family; WF-30 rewritten | P3 | M | RPT | axe with `wcag22aa` passes on hub, runner, results (virtual and paged), schedules and the open Reports menu with a fly-out; every route sets its `document.title`; every family has a spec |
| UX-41 | Dashboard frame v2 for DASH-44: grid library spike, free grid placement with a keyboard alternative, present-mode shell, phone layout of the frame | P4 | M | UX-25, ENG-51, DASH-44 | A customised layout is restored on another device; every move possible by drag is possible by keyboard; present mode hides the application chrome |
| UX-42 | Goals page shell: route, tabs `production` / `targets` / `history`, unsaved-changes guard, link from Setup › Providers | P3 | S | DASH-18, UX-49 | The page opens on the tab named in the URL; with a changed grid, a nav menu click, a hub rail link, a reload or closing the tab asks before discarding; a user without `analytics_goals_view` sees `AccessDenied` |
| UX-43 | Report builder screens: pickers, List / Summary, preview, spec errors by path, publish, share, Customise from a standard report (content of datasets, template gallery and folder tags: DASH-51) | P5 | XL | ENG-53, ENG-54, SEC-40, DASH-51 | A published custom report runs in the normal runner with exports, views and schedules; an invalid spec cannot be published |
| UX-44 | Assistant slots in the module chrome (hub, dashboard header, runner header), hand-over of `fill_parameters` into the form, hiding when the assistant is off | P5 | S | DASH-49, SEC-41 | A sentence fills the runner form and nothing runs until Run is pressed; with the organisation switch off no assistant entry point is rendered |
| UX-45 | Access gating UI (frontend half of SEC-13): `accessModel`, `GatedButton` reasons, request-access state, observation-mode banner, 403 texts | P0 | S | UX-05, UX-07, ENG-05, SEC-04, SEC-12 | A View Only user sees Print, Export and Schedule disabled with a reason; an empty catalog shows the request-access state; in shadow mode an administrator sees the banner with the link to the readiness report; no `useRights()` import exists under `src/features/reports/**` |
| UX-46 | Step-up re-authentication prompt (frontend half of SEC-32) | P2 | S | SEC-32, UX-18 | With `step_up_minutes` set, a bulk export asks for the password once and then proceeds; a wrong password leaves the export unrequested |
| UX-47 | Alerts and digests in the Schedules page (kind filter, firings, acknowledge, snooze, mute); alert and assignment notifications in the tray; metric settings and code-group administration tab | P4 | M | UX-33, UX-34, ENG-52, DASH-41, MET-02, MET-03 | An alert notification opens the alert's page, and from there its home dashboard with the tile highlighted; an acknowledgement appears in the alert's history; the settings tab is absent without its right |
| UX-48 | Return to the requested page after login: `state.from` on the `/reports/*` redirect, `auth:return_to` written by the 401 handler, `LoginPage` navigation (also after the forced password change) | P1 | S | UX-01 | Opening `/reports/runs/<run_id>` while signed out shows the snapshot page after login; an expired session on a runner URL returns to the same URL; a `return_to` outside `/reports/` or of another origin is ignored |
| UX-49 | Unsaved-changes navigation guard: `confirmDiscardUnsaved("Leave page")` in `GlobalNav.handleNavClick`, hub rail and module links, one registry-owned `beforeunload` listener while a guard is dirty | P1 | S | — | A dirty dashboard edit mode asks before a nav click, a rail link and a reload; a clean page never asks; the browser Back button is documented as unguarded |

---

## 13. Risks and open decisions

### 13.1 Risks

| # | Risk | Effect | Mitigation |
|---|---|---|---|
| R1 | Table, virtualiser, popovers and charts are unverified under the 0.75 zoom | Misplaced overlays, blank bands, wrong resize | Spike S-1 before any pin; fixed row heights; `offsetHeight`-based measurement; Radix instead of hand-rolled positioning |
| R2 | First lazy route and first error boundary of the app | Chunk-load errors after deploys; unfamiliar failure modes | Boundary with reload prompt; stale-deploy detection by `vite:preloadError` and message match, `server.js` 404 for missing assets (§9.4); chunks preloaded on nav hover; engine-state fallback (§2.3) |
| R3 | 02, 04, 06 and 08 were still changing while this was written | Field, state or code names here may lag | Contract fixtures (UX-04) fail the build on drift; §13.5 lists the points to re-check |
| R4 | Access token expiry during long work, no refresh today; refresh tokens rotate | Forced logout and storage wipe mid-task; two tabs refreshing at once log each other out | UX-14 with single-flight refresh across tabs (§9.6); runs are server-side and survive; nothing durable in `localStorage`; return to the page after login (UX-48) |
| R5 | The catalog becomes a dependency of the global nav | A slow or failing catalog call, or a render error in reports code inside `GlobalNav`, affects every page | One idle fetch after login, cached 10 minutes, static skeleton as fallback; total `mergeCatalog`; small error boundaries in the main chunk around the dropdown body and the tray (§3.2, §9.4) |
| R6 | Frontend rights are dark and the server decides | A button could be enabled and then refused | UI gating reads `access` computed by the server per caller; every 403 has a rendered state. If the challenge of 08 §13.2 #1 is accepted (View Only lists a report but cannot run it), such entries arrive with `access.can_run = false` and Run becomes a `GatedButton`; nothing else changes |
| R7 | Global `!important` form styles and the hex palette | Third-party widgets look foreign | `rpt-` classes; module wrappers; no adoption of the shadcn token theme |
| R8 | Hidden id columns are never in the browser | Any navigation or action needs a server round trip | Drill and action endpoints are the only path; optimistic UI is not used for them |
| R9 | The print stream mixes blocks in one table | Screen-reader and layout complexity of inset bands | Block selector to read one block at a time; inset bands announce their block title; fixtures for multi-block reports (Production Report) |
| R10 | Correspondence and form features do not exist yet (postcards, labels, template authoring, blank forms) | Eight legacy entries lead to an explanation, not a function | One honest links page; entries switch to launch links as the features ship |
| R11 | Double error surfacing (global toast + inline) | Two messages per failure | `silent_error` opt-out and the per-request `skip_scope_toast` flag for the axios interceptor (UX-03) |
| R12 | Large classic screens (Aging, Special Transaction Report, Statements) exceed one viewport | Action bar scrolls out of view | The classic action bar is sticky at the bottom of the criteria panel; the criteria collapse after a run |
| R13 | Mobile use of dense tables | Poor experience on phones | Worklists and dashboards get card layouts; reports are usable but not optimised (OD-10) |
| R14 | The query cache outlives a logout in the same tab [V `src/contexts/AuthContext.tsx` L454-483] | The next user could be served the previous user's catalog or rows | User id in every key and removal on logout (§9.3, UX-03) |
| R15 | Dashboard and worklist screens are described in two documents (frames here, tile bodies and dialogs in 06) | Double work, or a piece nobody builds | §7.3 and the work-item table name the owner of every component; the roadmap pairs UX-25 / UX-26 / UX-38 with DASH-02 / DASH-03 / DASH-06 / DASH-30 |
| R16 | The app has no return-to-after-login and no route-level unsaved-changes guard (`<BrowserRouter>`, no `useBlocker`) | Links in e-mails and notifications land on the Dashboard; edits are lost on navigation | UX-48 and UX-49 (registry-based guard, Back unguarded; data router as OD-11) |

### 13.2 Open decisions

| # | Decision | Default used in this document | Needed by |
|---|---|---|---|
| OD-1 | Which frame is the default for users who have not chosen: classic or enhanced | Classic until parity sign-off of a category, organisation setting afterwards | P1 |
| OD-2 | TanStack Table v9 (current line, months old) or v8.21.3 (mature, last of its line) | v9 if spike S-1 passes | P0 |
| OD-3 | Silent token refresh as part of this module's P0, or a platform change owned elsewhere | Part of P0 (UX-14) because long reports make the gap visible | P0 |
| OD-4 | Ctrl+K as a global shortcut or only on reports pages | Reports pages only | P1 |
| OD-5 | Keyboard model of the metric matrix: one tab stop with arrow-key navigation (grid pattern, §7.4) or one button per cell (06 §3.3) | Grid pattern | P1 (06, 07) |
| OD-6 | May a user's or the organisation's default view replace the legacy defaults when a report is opened | Yes, visibly, and Clear Criteria returns to the legacy defaults | P1 |
| OD-7 | Notification entry in the shell: the reports tray as the only reader of `notifications` (§3.4), or an application-wide notification centre that the tray feeds | Reports tray; revisit when a feature outside reporting produces notifications | P2 |
| OD-8 | Home of UI preferences (frame, density, table mode, last layouts): the user preferences blob or an engine endpoint. Constraint: `PUT /users/me/preferences` replaces the whole blob (one stored row, no merge, no version [V `users.ts` L787-796; `my_page_service.py` L137-151]); the module would be its first and most frequent writer | Preferences blob with read-merge-write in `useReportsUiPrefs`: re-read `getGetMyPreferencesQueryKey()` before each write, debounce 2 s, write only the `reports_ui` subtree, keep `reports_ui.layouts` to visibility, order and pinning of the last 30 reports. Alternative: an engine endpoint `GET` / `PATCH /reports/ui-preferences` with server-side merge (own `pref_key` `reports_ui`) | P1 |
| OD-9 | Keep the legacy-named menu permanently, or switch the menu to hub groups after a transition period | Keep; the hub shows the groups | P3 |
| OD-10 | Mobile scope: which pages must be fully usable on a phone | Worklists and dashboards (huddle first); reports usable, builder and editing excluded | P3 |
| OD-11 | Unsaved-changes protection: the registry-based guard of UX-49 (nav clicks, module links, `beforeunload`; Back unguarded) or a move of the app to a data router (`createBrowserRouter` + `RouterProvider`) so `useBlocker` works, an app-wide change with its own regression pass | Registry-based guard (UX-49) | P1 |

### 13.3 Challenge to the brief

| # | Point | Evidence | Written as |
|---|---|---|---|
| C-1 | The brief puts "existing reports moved onto the engine" in P0 and server-side saved views and favorites in P1. The six migrated reports therefore lose their saved-view chips between P0 and P1 | The old chips exist [V `src/components/reports/lib/savedViews.ts`]; ENG-28 and ENG-29 are P1 | Against the brief: no interim `localStorage` store in the new runner. The loss is small (old views are wiped at every logout [A]); pulling ENG-28 into P0 would remove it entirely |

### 13.4 Assumed from other documents

| # | Document | Assumption |
|---|---|---|
| A-1 | 02, 04 | Validate, run and saved-view resolve accept `context{patient_id}` so the tokens `current_patient*` and `current_responsible_party*` can resolve on the server; without it the frontend substitutes the active patient before sending |
| A-2 | 02 | The validate response also returns the `ctx` facts it used (`multi_office`, `provider_restricted`, `feature.<flag>`) so the form evaluates the same expressions |
| A-3 | 02 (ENG-03), `catalog/*` | Every definition with `legacy != null` carries `criteria_rows: [[section_title, section_title?], …]` and an optional per-parameter `row_span: "full"`, transcribed from the legacy layout notes; the definition lint (02 §15.4) fails a legacy definition without it. The `control` vocabulary includes `checkbox` with `member: <value>` (enum member), `dropdown` and `lookup_text` for `entity_multi`; `advanced`, `placement` and `control` are set per parameter by the catalog authors. Hard dependency of UX-06 |
| A-4 | 02 | `group_header` rows carry the `row_no` of the last row of their group, and the rows endpoint accepts a row-kind filter, so groups can be collapsed and outlined without loading their rows |
| A-5 | 02 | The action endpoint supports a dry run that returns `count` and `excluded[]` without acting |
| A-6 | 06 (and 02) | The dashboard layout blob of §7.1 is accepted as the content of the `view_kind = layout` row; a ratio drill returns two targets (numerator, denominator) or the component keys are served with `MetricDefinitionRead`; the category and `ref_type` of worklist-assignment notifications are named; selection by `row_ids[]` and refreshed rows on live lists land in 02 (06 §12.4 b); record targets return the values a Scheduler hand-off needs (`date`, `office_id`, `patient_id`) |
| A-7 | 02 (requests of 08 §13.3) | `access.export_formats[]`; `purpose_code`, `purpose_note`, `external_recipient{name, organization, address}` on the artifact request (#15) and 422 `purpose_required` with `details.triggers[]`; 403 `bulk_export_not_permitted`; 409 `manifest_unavailable`; `watermark_id` on `ReportArtifactRead`; `purpose_note` on `ReportScheduleCreate`. The step-up re-authentication of SEC-32 (P2) defines its error code and endpoint before a prompt is built |
| A-8 | 02 | A tenant setting for the default frame (`default_presentation`) in `report_tenant_settings` |
| A-9 | 02, 08 | A per-caller `module_access{can_schedule, can_manage_schedules, can_view_all_runs, can_manage_runs, can_pin, can_share_organization, can_build, can_administer, can_view_goals}` object computed with the strict rule, and the switches the UI must know (`background_enabled`, `schedules_enabled`, `email_delivery_enabled`, `rights_mode` = `enforced`, `shadow` or `off`), on a response any caller reads, for example the catalog (#1); `GET /reports/settings` needs `reports_administer` |
| A-10 | `catalog/*` | Final `report_key`s (the six migrated reports, statements, time clock, the drill targets named in 06 §2.0.4), legacy order through `legacy.report_id`, and `legacy_actions[]` per screen |
| A-11 | 02, 05, 08 | Endpoints for organisation metric settings and code groups (05 §1.1) join the API table before UX-42, and 08 names the right that administers them |
| A-12 | 02, 04 | The options endpoint carries the additions of 04 §13.3 (`values`, `include_inactive`, `mode`; option fields `sub_label`, `is_active`, `disabled_reason`) |
| A-13 | 02 | Catalog entries carry, besides the fields of #1: `kind`, `subcategory`, `status`, `icon_key`, `freshness` and `legacy.report_id` (badges, Lists tabs, icons, legacy order) |
| A-14 | 02, 08 | Served block columns keep `data_class`, so the browser can tell a patient-level block (§5.2 Copy, §9.9); class names are never shown to the user |
| A-15 | 02, 04 | Each parameter carries `url_safe` (default `false` when its `data_class` is patient-identifying, `true` otherwise); `paramCodec` writes only `url_safe` value keys to URLs (§5.10) |
| A-16 | 02 | `ReportScheduleRead` returns the server-computed summary sentence and next occurrences of a schedule (needed for free `cron`); `ReportArtifactRead` carries `file_size` so very large downloads can be announced (§9.6) |

### 13.5 Contract notes

Points where 02 and 04 differed, or changed, at the time of writing. The frontend isolates each in one module so a
late change touches one file.

| Topic | 02 | 04 | Isolated in |
|---|---|---|---|
| Parameter type names | Provisional list in §3.2 (`provider_multi`, `code_set`, `int_range`, …) | Final list of 18 (§2.1) | `paramModel.ts` (type → component map) |
| Token for the working office | `{"token": "working_office"}` | `current_office` | `paramCodec.ts` |
| Working office | `working_office_id` in the body of run, validate, rerun, resolve, live page, preview, metric query, dashboard data (§4.1, §13) | §6.2 still names the validated `X-Office-ID` header; 02 §18.3 states that the body field applies to both | services |
| Expression additions | Grammar of §3.2 | Adds `contains`, boolean literals, `ctx.feature.<flag>` (§9.1) | `paramExpr.ts` + shared vectors |
| Options endpoint | "for a lookup parameter that has no existing endpoint" (§13 #4); to become one route with 04's lookups when the API is frozen (ENG-05) | Every lookup parameter (§13.3, open decision 7) | `useParamOptions.ts` |
| Callers without an office assignment | Refused with 403 `office_not_assigned` unless they hold the view-all right; `REPORT_UNGATED_OFFICE_ACCESS` per client (§4.1, §18.2-13) | Platform rule: such a caller is tenant-wide (§6.2). 08 §4.1 S-4: refused once rights are enforced, old behaviour (logged) in shadow mode | The server decides; the hub and the office control show the 403 text |
| `working_office_id` without a working office | Required on every office-dependent call | — | To agree: whether a caller with all-office access and no assignment may omit it. Until then the runner holds every office-dependent call while `office_id = null` (§4.3 `no_working_office`) |
| Ownership of the criteria layout | — | FLT-10 depends on ENG-05, ENG-19, UX-03, UX-04, UX-15 (no cycle with UX-06 / UX-07), but its `ParamForm` note still says "sections in legacy order, two-column layout, More options, Clear Criteria" | This document: FLT-10 = `useParamForm` + control dispatch + a plain single-column layout; UX-06 / UX-07 own both layouts, `criteria_rows`, chips and Clear Criteria placement (§8.1). 04 to drop the two-column / More options wording from its `ParamForm` note |
| Picker and control scope | — | FLT-13 lists `EntityPickerDialog` as reuse-shaped; FLT-14 acceptance does not name enum-member checkboxes, `entity_multi` `dropdown` fallback or `lookup_text` | `EntityPickerDialog` is a NEW server-paged, virtualised listbox transfer list (§8.1): FLT-13 size to be re-checked. FLT-14 / FLT-13 acceptance to include the three renderings of §4.5 |
| Reference time zone | The reported office's zone (§18.2-15) | The working office's zone (§7.5) | The UI prints `run.reference_time_zone`, whichever rule produced it |
| Download file name | Read from `Content-Disposition` (§7.6) | — | This document uses `ReportArtifactRead.file_name`, because the Orval mutator drops headers [V] |
| Result page shape | One print stream with block index `b` (§6.1, §6.2) | — | `resultModel.ts`, `ResultTable` |
| PRINT / PREVIEW | `render_output` creates a `pending` artifact; the runner requests the render (§7.1) | `output_format` has `role: output` | `useReportRun.ts`, `useArtifact.ts` |
| Free text in the URL | — | Every value key is written to the query string (§12) | `paramCodec.ts` leaves out value keys of parameters with `url_safe = false` (§5.10, A-15; 08 §1.2 T-9: ids only in URLs) |

Points where 08 asks for more than 02 serves today (08 §13.3), and how the frontend copes until 02 follows:

| Topic | 02 | 08 | Isolated in |
|---|---|---|---|
| Export capability per format | One flag `access.can_export` (§3.1) | `access.export_formats[]` (subset of `pdf`, `xlsx`, `csv`): data files need a second right (§3.2) | `accessModel.ts`: without the list, `can_export` stands for every enabled format |
| Purpose of an export | `purpose_code`, `purpose_note` on the run request only (#5) | The same fields plus `external_recipient{}` on the artifact request (#15); 422 `purpose_required` (§7.2) | `artifactService.ts`, `PurposePromptDialog` |
| Export refusals | 422 `pdf_too_large`, `xlsx_too_large`, `export_too_large_for_inline`; 429 | Adds 403 `bulk_export_not_permitted` and 409 `manifest_unavailable` (§7.2, SEC-09) | Message map in `runModel.ts` |
| Module-wide capabilities and rights mode | Per-report `access` only | Module-wide rights (§2.2 B) and `REPORT_RIGHTS_SHADOW` (§3.5), neither with a served flag | `useReportCatalog.ts` reads `module_access` and `rights_mode` when present (§13.4 A-9) |
| Text of 403 `data_class_denied` | — | §3.4 points to 04 §10.4, which leaves the text to 08 | Message map in `runModel.ts` (text of §4.7) |

Points where 06 differs from 02, 08 or this document:

| Topic | 06 | Other document | Isolated in |
|---|---|---|---|
| Rights on a dashboard's twin report | An analytics right has one level; whether it includes print, PDF and subscribe is a request to 08 (§2.0.5, §12.4 b) | 08 §2.1: print and PDF need Full Control of a report family | `accessModel.ts` reads `access` of the twin definition, whatever the rule becomes |
| Selection on a live list | `row_ids[]` or `all`, re-evaluated on the server, refreshed rows in the response (§6.1) | 02 #14: `selection{mode: all \| rows, row_nos[]}` | Action call in `runService.ts` |
| Matrix cells | Every drillable cell is a button (§3.3) | This document: grid pattern with one tab stop (§7.4, OD-5) | `PivotMatrix` interactive mode |
| Event prop names | `on_drill` (§3.2) | This document: `onDrill`; data props snake_case | Component props |
| Category of dashboard twins | `dashboards` as a reserved category of the report registry; twins have `status = hidden` (C-3, §3.6) | Brief §4 lists no such category; 02 §3.1 has the status `hidden` but no reserved category yet (06 §12.4 a) | `catalogModel.ts`: twins never reach the catalog, so `HUB_GROUPS` needs no entry for them |
| Follow-up and bulk-message actions | Rights `worklists_followup_manage`, `worklists_bulk_message` requested (§6.2) | 08 has no code yet (SEC-36) | Nothing: the served definition lists only the actions the caller may use |
