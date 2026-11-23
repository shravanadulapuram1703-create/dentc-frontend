# FE cross-cutting infrastructure — what a Reports & Analytics module must plug into

_Static analysis only (code + docs read; no server started, no DB / API touched, no existing file modified). Snapshot 2026-11-21, branch `feature/uat-realse-v5`, working tree incl. the uncommitted API sync. `openapi.json` = OpenAPI 3.1.0, 564 paths / 935 operations / 975 schemas / 25 tags._

**Legend** — **[V]** verified by reading the cited file / lines. **[I]** inference (reasoned from code or library semantics, not executed). Paths are relative to `dentc-frontend/` unless prefixed `dentc-backend/`. All field / param names are the backend's snake_case.

**Scope split** — the existing Reports / Dashboard / My Page code, the `ReportDefinition` framework and the server report endpoints are inventoried in `docs/reports/module-plan/analysis/fe_existing_reports.md`. This document covers the platform underneath (stack, shell, office scope, providers, auth / rights, shared UI, conventions, tests) and does not repeat that inventory.

---

## 0. TL;DR for planners

| # | Finding | Evidence |
|---|---|---|
| 1 | Stack: React 19.2.3, TypeScript 5.9.3, Vite 7.3.0, `react-router-dom` 7.11.0 (declarative `<BrowserRouter>`), TanStack Query 5.100.14, axios 1.13.2, Orval 8.14.0 (`tags-split`, react-query client, snake_case untouched), Tailwind 4.1.18 (CSS-first), recharts 3.6.0, jsPDF 4.2.1 + autotable 5.0.8, sonner 2.0.7, vitest 5.0.0, Playwright 1.63.0. | [V] `package.json`, `package-lock.json` |
| 2 | The shadcn / Radix kit is installed (`src/components/ui/*`, 48 files) but almost unused: only `dialog` (6 importers), `dropdown-menu` (3), `popover` (1), `avatar` (1), `sonner` (1). `react-hook-form`, `cmdk`, `react-day-picker`, `ui/table`, `ui/chart`, `ui/calendar`, `ui/select`, `ui/tabs` have **zero** app importers. House style = hand-rolled Tailwind with hex colours + native `<select>` / `<input type="date">`. | [V] §1.2 |
| 3 | Not installed: data-grid / table library, virtualisation, XLSX writer, date library, drag-and-drop, dashboard grid layout, decimal math, error boundary, component-test tooling (no jsdom / Testing Library / MSW). | [V] §1.3 |
| 4 | Routing = one file, `src/App.tsx` (577 LOC, 133 `<Route>`), every page imported eagerly (no `React.lazy`), auth by ternary per route, no catch-all route, no `ErrorBoundary`. Menus = static arrays inside `src/components/GlobalNav.tsx`; only the Setup menu is rights-filtered; nav flyouts work for 2 levels only. | [V] §2.3, §2.4 |
| 5 | `html { zoom: 0.75 }` is global. Raw `vh` / `vw`, `getBoundingClientRect`, `clientX/Y`, `innerWidth/Height` are off by 0.75 — use `var(--vh)` / `var(--vw)` and `src/utils/uiZoom.ts`. No `@media print` rule exists; the print convention is "generate a PDF", never `window.print()`. | [V] §2.5, §2.8 |
| 6 | `src/styles/globals.css` forces `!important` styles on every `<input>`, `<select>`, `<textarea>`, checkbox and radio (2 px border, `0.75rem 1rem` select padding). A dense filter panel must use the escape class `tx-select` (or add its own class-qualified rule). | [V] §2.6 |
| 7 | Office = working context, never a fence. One model in `src/features/office-scope/`; membership IS enforced (`OFFICE_ASSIGNMENT_ENFORCED = true`, server `403 office_not_assigned`). Reads carry the office as explicit params (`officeFilter` / `homeOfficeFilter` / `allOfficesParam`); `X-Office-ID` is attached to every non-login request but never filters reads. | [V] §3 |
| 8 | **An office-group entity exists end to end**: `GET/POST /api/v1/office-groups`, `GET/PATCH/DELETE /api/v1/office-groups/{item_id}`, `OfficeRead.office_group_id` (one group per office), `office_group_id` query param on 39 generated `*Params` types, `OfficeOption.office_group_id` in the shared office catalog. Missing on the FE: a "group" read-scope mode, a shared `useOfficeGroups` hook, a nav entry (commented out). | [V] §3.4 |
| 9 | Server office-set params (`office_ids`, `office_group_id`, `all_offices`, `include_global`) exist on list endpoints + `/dashboard/summary` + time-clock report, but **not** on the five `/reports/*` roll-ups, `/transactions` or `/appointments/scheduler` (scalar `office_id` only). No endpoint accepts a provider / user / carrier **set**; `group_by` and `date_basis` exist only on the lab cost report. | [V] §3.2, §4.4 |
| 10 | Providers: `src/services/providerDirectory.ts` + `src/hooks/useProviderDirectory.ts` are the single source. Rule "prefer, never exclude": render the office roster first, everyone else below (`<ProviderOptionGroups>`), label always `Name (ID)`. Existing report filter violates it (`fetchProvidersForOffice` → `scopeToOffice`). | [V] §4 |
| 11 | Four independent gates: authentication (enforced), role (ad hoc), rights (`src/features/access-control/`, kill-switch `RIGHTS_ENFORCED_DEFAULT = false` → everything granted), office membership (enforced). Report routes are gated by `isAuthenticated` only. | [V] §5.2, §5.4 |
| 12 | Curated rights catalog: **56** `Reports`-category codes kept (Daily / Monthly / Ledger / Management / Insurance / Appointment / Treatment Plan / Referral / Statements / Lists / Letters / My Reports / 13 "Group Reports"). **54** `reports_*` / `report_*` codes were removed by backend migration `8e4a6a8e5ab0` — including Recall, Ortho, Labels, Postcards, Excel Reports, Batch Schedule Report — plus all 10 `denticon_practice_analytics_*`. None of the kept codes is referenced by FE or backend guards. | [V] §5.5 |
| 13 | Browser persistence is not durable: logout and every 401 run `localStorage.clear()` (`src/features/auth/rememberMe.ts` L30-51) and `dentc:reports:views:*`, `dentc:utilities:*`, `dentc:my-page:*` are not on the preserve list. Server-side stores exist but are unused by the FE: `GET/PUT /api/v1/users/me/preferences` (JSON blob), `/users/me/notifications`, `/users/me/tasks`, `/audit-logs`, `/utilities/jobs/{job_id}`. | [V] §6.4, §6.5 |
| 14 | Print / export house pattern = `doc.autoPrint(); window.open(doc.output("bloburl"), "_blank")` (9 feature folders) and `openServerReport()` (server PDF first, jsPDF fallback). Production CSP allows `frame-src 'self' blob:` only; the Reports module is the lone user of `doc.output("dataurlnewwindow")`. | [V] code; effect [I] §2.8 |
| 15 | Session: the refresh token is stored but never used (`refreshToken()` has no caller); axios has no timeout. A slow report that outlives the access token ends in a forced logout + storage wipe. | [V] code; effect [I] §5.1 |
| 16 | Tests: 9 vitest files (pure logic only), 2 Playwright specs / 5 tests / 3 visual baselines, a manual 38-workflow HTML playbook (`docs/qa/DentC_E2E_Test_Workflows.html`, WF-30 = Reports). CI (`.github/workflows/ci.yml`) triggers only on branch `feature/phase_data_migration` and runs lint + API-drift + build — no unit or e2e tests. | [V] §7.4, §7.6 |

---

## 1. Tech stack and libraries

### 1.1 Versions (`package.json` range → `package-lock.json` resolved) [V]

| Area | Package | Range → resolved | Notes |
|---|---|---|---|
| UI runtime | `react`, `react-dom` | ^19.2.0 → 19.2.3 | `React.StrictMode` on (`src/main.tsx` L12) → effects run twice in dev |
| Language | `typescript` | ~5.9.3 → 5.9.3 | effective options in §1.4 |
| Build | `vite`, `@vitejs/plugin-react` | ^7.2.4 → 7.3.0, ^5.1.1 → 5.1.2 | alias `@` → `src`; terser, `drop_console`; manual vendor chunks |
| Router | `react-router-dom` | ^7.11.0 → 7.11.0 | `<BrowserRouter><Routes>`; no data router, loaders or `errorElement` |
| Server state | `@tanstack/react-query` | ^5.100.14 → 5.100.14 | `src/shared/config/queryClient.ts` L32-52: `staleTime 30_000`, `retry 1`, `refetchOnWindowFocus false`, global `QueryCache` + `MutationCache` `onError` toast (401 skipped) |
| HTTP | `axios` | ^1.13.2 → 1.13.2 | one instance `src/services/api.ts`; no `timeout`; `paramsSerializer: { indexes: null }` (arrays → repeated keys) |
| API codegen | `orval` (dev) | ^8.14.0 → 8.14.0 | `orval.config.ts`: `mode "tags-split"`, `client "react-query"`, `httpClient "axios"`, mutator `src/api/mutator/axiosInstance.ts` (`customInstance`), `clean: true`, `query.signal: true`. Output `src/api/generated/endpoints/<tag>/<tag>.ts` (25 tag folders) + `src/api/generated/model/*` (1,470 files) |
| CSS | `tailwindcss`, `@tailwindcss/postcss` (dev) | ^4.1.18 → 4.1.18 | CSS-first: `@import "tailwindcss"` + `@theme inline` in `src/styles/globals.css` L4, L139-164 |
| Primitives | 25 × `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, `cmdk`, `vaul`, `embla-carousel-react`, `input-otp`, `react-resizable-panels`, `next-themes` | — | wrapped by `src/components/ui/*` (48 files) |
| Icons | `lucide-react` | ^0.562.0 → 0.562.0 | own `icons-vendor` chunk |
| Charts | `recharts` | ^3.6.0 → 3.6.0 | brings `@reduxjs/toolkit` 2.11.2, `react-redux` 9.2.0, `immer`, `victory-vendor` (d3-scale 4.0.2), `decimal.js-light` transitively; own `chart-vendor` chunk |
| PDF | `jspdf`, `jspdf-autotable` | ^4.2.1 → 4.2.1, ^5.0.8 → 5.0.8 | optional transitive `html2canvas` 1.4.1, `canvg` 3.0.11, `dompurify` 3.4.11 (never imported directly) |
| Forms | `react-hook-form`, `@hookform/resolvers`, `zod` | ^7.71.1 → 7.71.1, ^5.4.0, ^4.4.3 → 4.4.3 | see §1.2 — effectively unused |
| Dates | `react-day-picker` | ^9.13.0 → 9.13.0 | brings `date-fns` 4.1.0 + `@date-fns/tz` 1.4.1 transitively (not direct deps) |
| Toasts | `sonner` | ^2.0.7 → 2.0.7 | `<Toaster richColors position="top-right" closeButton />` in `src/app/providers.tsx` L15 |
| Markdown | `react-markdown` | ^10.1.0 → 10.1.0 | 1 importer (`src/features/messaging/components/MessageBubble.tsx`) |
| Unit tests | `vitest` (dev) | ^5.0.0 → 5.0.0 | `vitest.config.ts` merges the Vite config, excludes `e2e/**`; default `node` environment |
| E2E | `@playwright/test`, `@axe-core/playwright` (dev) | ^1.63.0 → 1.63.0, ^4.13.0 → 4.13.0 | chromium project only |
| Lint | `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` (dev) | ^9.39.1 → 9.39.2, ^8.46.4 → 8.50.1, ^7.0.1 → 7.0.1 | flat config `eslint.config.js` |
| Prod server | `express`, `compression` | ^4.21.2 → 4.22.1 | `server.js` serves `dist/`, sets CSP (§2.8) |

Codebase size: 763 non-generated `.ts` / `.tsx` files, ~175.8k LOC; 35 folders under `src/features/`; 1,495 generated files [V].

### 1.2 Installed vs actually used [V]

Counts = files outside `src/components/ui/` and `src/api/generated/` that import the item.

| Capability | Installed | Real usage | Consequence for Reports |
|---|---|---|---|
| shadcn/Radix wrappers `src/components/ui/*` | 48 files | `dialog` 6 (`features/sms` ×3, `features/time-clock` ×2, `features/patient-photo`), `dropdown-menu` 3 + `popover` 1 + `avatar` 1 (all `features/messaging`), `sonner` 1 (`app/providers.tsx`), `PageHeader` 2 (`features/time-clock`), `TriStateToggle` 4. **0 importers**: `accordion`, `alert`, `alert-dialog`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `drawer`, `form`, `hover-card`, `input`, `label`, `menubar`, `navigation-menu`, `pagination`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `switch`, `table`, `tabs`, `textarea`, `toggle`, `toggle-group`, `tooltip` | The kit is available but adopting it for Reports makes Reports look different from every other screen unless themed to the hex palette; `docs/tech-stack.md` overstates its adoption |
| Direct `@radix-ui` import outside `ui/` | — | 1 (`src/features/messaging/components/MessagingDialog.tsx`, built because `ui/dialog.tsx` is fixed at `z-50`) | Dialog stacking must be handled explicitly (§2.7) |
| `react-hook-form` + `@hookform/resolvers` | yes | only `ui/form.tsx` (0 importers) | forms are hand-rolled `useState` objects; no schema-driven form precedent except Utilities params (§6.1) |
| `zod` | yes | only `src/shared/config/env.ts` | available for validating server-sent report definitions / params |
| `cmdk`, `react-day-picker`, `embla`, `vaul`, `react-resizable-panels`, `input-otp` | yes | only their unused `ui/*` wrapper | date pickers in practice = native `<input type="date">` (100 occurrences in 50 files) |
| `next-themes` | yes | only `ui/sonner.tsx` | no dark mode in practice [I] |
| `recharts` | yes | `src/components/dashboard/widgets/AnalyticsWidget.tsx`, `src/components/pages/Reports.tsx`, `src/components/reports/components/ReportChart.tsx` (+ unused `ui/chart.tsx`) | bar + pie only today |
| `jspdf` / `jspdf-autotable` | yes | 11 / 7 files | well-established client PDF path |
| Generated endpoint functions | — | imported by 185 files; generated React Query hooks used in 33; direct `useQuery` in 18; `useMutation` in 3 | most screens are imperative (`useEffect` + `await fn()`); React Query is the newer, preferred style |
| Raw axios (`api.get/post/...`) | — | 7 files (`AuthContext.tsx`, `services/authService.ts`, `features/auth/services/authExtrasService.ts`, `pages/SignUpPage.tsx`, `components/pages/setup/UserSetup.tsx`, messaging + SMS real transports) | new code must not add to this list |

### 1.3 Not installed — build-vs-adopt decisions [V absent from `package.json`]

| Need of an advanced reports module | Status today | Note |
|---|---|---|
| Data grid (server paging, grouping, subtotals, column chooser, pinning) | none — every table is a hand-rolled `<table>`; `ui/table.tsx` unused; `src/components/reports/components/DataTable.tsx` is client-only | closest precedent for resizable + sortable + persisted columns: `src/features/treatment-plans/TxPlanGrid.tsx` (zoom-aware drag L108-120) |
| Row virtualisation | none | lists rely on server paging (`size` ≤ 200) |
| XLSX writer | none — `src/components/reports/lib/exportExcel.ts` writes SpreadsheetML 2003 as `.xls`; `src/components/utilities/lib/feeScheduleTemplate.ts` emits CSV "because the project ships no xlsx writer" | real `.xlsx` should come from the server |
| Date library | none direct; `date-fns` 4.1.0 is only transitive via `react-day-picker` | must be added to `package.json` before importing; current helpers are hand-rolled (`src/utils/datetime.ts`, `src/components/dashboard/lib/aggregate.ts`, `src/features/time-clock/timeClockModel.ts`) |
| Drag-and-drop (report builder, dashboard layout) | none; native HTML5 DnD in 3 files (`components/pages/Scheduler.tsx`, imaging viewers) | pointer maths needs `uiZoom()` |
| Dashboard grid layout | none | — |
| Decimal / money math | none direct (`parseDecimal` → JS float in `aggregate.ts` L10-14) | totals must be computed server-side |
| Chart → image for PDF | none direct (`html2canvas` / `canvg` only as optional jsPDF deps) | charts inside exported PDFs need server rendering or jsPDF primitives [I] |
| Error boundary | none (no `ErrorBoundary` / `componentDidCatch` / `errorElement` anywhere) | a render error in one widget blanks the whole app [I] |
| Component tests | no jsdom / happy-dom / Testing Library / MSW | only pure-function tests are possible without adding tooling |
| i18n, state manager | none (React context + React Query) | — |

### 1.4 Build, lint and runtime configuration [V]

| Item | Fact | Source |
|---|---|---|
| TS options actually in effect | `tsc -b` builds the root `tsconfig.json` (it has no `references`): `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitAny: false`, `exactOptionalPropertyTypes: false`, `isolatedModules: true`, `noEmit: true`, `include: ["src"]`. `tsconfig.app.json` (`noUnusedLocals`, `erasableSyntaxOnly`, …) is **not** referenced → not enforced | `tsconfig.json`; build-mode behaviour [I] |
| `tsconfig.tsbuildinfo` | tracked in git and rewritten by every `tsc -b` | `git status` |
| Path alias | `@/*` → `src/*` (Vite + TS). Older files use relative imports with `.js` suffix (`"../styles/theme.js"`) | `vite.config.ts` L20-24 |
| ESLint errors vs warnings | `no-explicit-any` off; unused vars, `prefer-const`, hooks rules, `react-refresh/only-export-components` = **warn**. The one custom **error**: `no-restricted-syntax` on `parseInt/Number(currentOffice…)` and `currentOffice….match/replace(` outside `src/features/office-scope/**` and `src/services/officeLookup.ts` | `eslint.config.js` L11-24, L64-88 |
| ESLint ignores | `dist`, `src/api/generated/**`, `**/*.optimized.*`, `server.js`, `ecosystem.config.js`, `playwright-report`, `test-results`, `e2e/.auth`, `e2e/__screenshots__` | `eslint.config.js` L27-37 |
| Env vars | zod-validated once in `src/shared/config/env.ts` (`env.apiBaseUrl`, `env.appEnv`, `env.isProd`, `env.appVersion`, `env.jira`, `env.appointNowBackend`, imaging bridge). `VITE_*` are baked at **build** time and must be threaded through `Dockerfile` `ARG`/`ENV`, `cloudbuild.yaml` and `.github/workflows/deploy-cloud-run.yml`, otherwise the bundle silently uses the schema default (this already caused two production incidents, documented in `env.ts` L59-62 and L80-84; console guards L102-119) | `env.ts`, `Dockerfile` L10-28 |
| Dev server | `:5173`, `strictPort: true` (backend CORS allows only this origin); `PORT` env overrides | `vite.config.ts` L26-33 |
| Vendor chunks | `react-vendor`, `ui-vendor` (`@radix-ui`), `chart-vendor` (`recharts`), `icons-vendor`, `utils-vendor`; everything else is one app chunk because nothing is lazy-loaded | `vite.config.ts` L53-90 |
| API client workflow | `npm run api:sync` = `curl http://127.0.0.1:8000/api/v1/openapi.json -o openapi.json` + `orval`. Generated code is never hand-edited; CI regenerates and fails on diff | `package.json` L18-20, `.github/workflows/ci.yml` L39-47 |
| CI | triggers only on push / PR to `feature/phase_data_migration`; steps: `npm ci` → `npm run lint` → API drift check → `npm run build`. No `npm test`, no e2e. The current branch is not covered | `.github/workflows/ci.yml` L3-10 |
| Deploy | Docker (`node:20-slim`) → Express `server.js` on Cloud Run; also PM2 scripts | `Dockerfile`, `package.json` L21-29 |

---

## 2. App shell, layout, routing, navigation

### 2.1 Provider tree (`src/App.tsx` L557-575, L527-555) [V]

```
AppProviders            QueryClientProvider + <Toaster>           src/app/providers.tsx
└ AuthProvider          session, user, organizations, currentOffice  src/contexts/AuthContext.tsx
  └ OfficeScopeProvider numeric office_id, access set, switchOffice   src/features/office-scope/OfficeScopeContext.tsx
    └ ChatProvider      messaging panel + chatWidth
      └ AppointNowProvider
        └ BrowserRouter
          └ AppContent  wrapper div with marginRight = chatWidth
            ├ HelpProvider → AppRoutes
            ├ LogoutOverlay (z-[9999])
            └ Chat (slide-in panel)
```

Consequences: `useAuth()`, `useOfficeScope()`, `useRights()`, React Query and `toast` are available on every route. The content width shrinks when the messaging panel opens (`marginRight: chatWidth`, 0.3 s transition, L539-544) — charts and grids must be responsive, not sized once [I].

### 2.2 Layout primitives [V]

| Primitive | File | Contract | Use for Reports |
|---|---|---|---|
| `AppShell` | `src/components/layout/AppShell.tsx` L38-67 | props `onLogout`, `currentOffice`, `setCurrentOffice`, `bgClassName` (default `bg-[#F7F9FC]`), `contained` (→ `mx-auto max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6`), `contentClassName`. Renders `GlobalNav` once and reserves `pt-[var(--app-nav-height)]` | every top-level route renders through it |
| `AdminPageWrapper` | `src/App.tsx` L95-116 (local function, not exported) | `AppShell` with `bgClassName="bg-slate-50"`, no `contained`; used 68× | current wrapper of `/reports` and `/reports/run/:reportId` (L253-275). Pages still receive the legacy `onLogout` / `currentOffice` / `setCurrentOffice` props |
| `GlobalNav` | `src/components/GlobalNav.tsx` (1,904 LOC) | `fixed top-0 left-0 z-50`, `right: chatWidth`; publishes its own height to `--app-nav-height` from `offsetHeight` via `ResizeObserver` (L212-236, measurement L216-223); default fallback `120px` (`globals.css` L183) | never hard-code a top offset |
| `PatientShellLayout` | `src/components/PatientShellLayout.tsx` | the only nested-route layout: `/patient/:patientId/*` + `<Outlet context>` (L479); sticky context bar `sticky top-[var(--app-nav-height)] z-30` (L304) | pattern to copy for a `/reports/*` layout route with shared sub-navigation [I] |
| `PageHeader` | `src/components/ui/PageHeader.tsx` | `title`, `subtitle?`, `actions?`, `icon?`; navy gradient (`theme.components.pageHeader`) | 2 importers (time clock) |
| `WidgetCard`, `KpiStat` | `src/components/dashboard/components/` | card with loading / error / empty / `awaitingBackend` states; KPI tile with `tone`, `hint`, `loading`, `onClick` | already shared by dashboard + reports; `WidgetCard` root has `overflow-hidden` (clips absolutely-positioned dropdowns) |
| `PlaceholderPage` | `src/components/PlaceholderPage.tsx` | "Coming Soon" card; used 24× in `App.tsx` | — |
| Theme tokens | `src/styles/theme.ts` (`components.*`, `utils.cn`, `utils.getStatusBadge`, `utils.getAmountColor`) and CSS vars in `globals.css` L8-137 | palette: navy `#1F3A5F`, steel blue `#3A6EA5`, teal `#2FB9A7`, background `#F7F9FC`, border `#E2E8F0`, text `#1E293B` / `#475569` / `#64748B` | class tokens exist for tables (`tableHeader`, `tableRow`, `tableCellAmount`), tabs, badges, alerts |

### 2.3 Routing facts (`src/App.tsx`) [V]

| Fact | Detail |
|---|---|
| Registration | manual `<Route>` per page in one file: 133 `<Route>`, 68 `<AdminPageWrapper>`, 92 `<Navigate>`, 24 `<PlaceholderPage>`, 5 `<RequireRight>` |
| Auth guard | repeated ternary `isAuthenticated ? <Page/> : <Navigate to="/login" />`; no `ProtectedRoute` component; `isAuthenticated` = presence of `localStorage.access_token` (`AuthContext.tsx` L231-233) |
| Code splitting | none — all pages are static imports (L6-92); `Suspense` is imported (L1) but never rendered |
| Catch-all / not-found | none (no `path="*"`); an unknown URL renders an empty tree |
| Error isolation | no error boundary anywhere |
| Generated routes | one precedent: `utilityLegacyRedirects().map(...)` (L346-348) builds `<Route>` elements from a catalog (`src/components/utilities/utilityCatalog.ts`) |
| URL state | `useSearchParams` in 8 files (`Patient.tsx`, `MyPage.tsx`, `HelpCenter.tsx`, `TransactionsEntryPage.tsx`, …); report filters are not in the URL |
| Public route | `/book/:office_code` bypasses the shell (`AppContent` L533-536) — precedent for a chrome-less route (e.g. a printable / embedded report view) [I] |
| Existing report routes | `/reports`, `/reports/run/:reportId`, 5 redirects, 10 placeholders (L253-298); details in the companion document |

### 2.4 Navigation (`src/components/GlobalNav.tsx`) [V]

| Aspect | Detail |
|---|---|
| Menu data | plain arrays declared inside the component: `patientMenuItems` L319, `transactionsMenuItems` L523, `chartingMenuItems` L567, `reportsMenuItems` L595-630, `utilitiesMenuItems` L633, `setupMenuItems` L893, `helpMenuItems` L1259. Item shape `{ label, path?, icon?, submenu?, type?: "divider" }` |
| Adding an entry | edit the array + add a `<Route>` in `App.tsx`; nothing is derived from a registry |
| Path tokens | `:patientId` is replaced by `activePatient.id`, else navigates to `/patient?switch=1` (`handleNavClick` L1298-1321) |
| Rights filter | `SETUP_NAV_RIGHTS: Record<path, RightCode[]>` (L96-130) + `filterNavByRights(items, hasAny)` (L134-146), applied **only** to Setup (L1252). Unmapped leaves are kept (default-allow); empty groups are dropped |
| Role filter | one inline case: Setup ▸ Tenant shown when `user.role === "owner"` or the email contains "superadmin" (L900) |
| Rendering | click-driven dropdown: `position: fixed`, `zIndex: 9999`, coordinates from `layoutRect(dropdownRefs.current[key])`, `max-h-[calc(var(--vh)*80)] overflow-y-auto` (Reports dropdown L1737-1762). Second level via `SubmenuPortal` (`src/components/navigation/SubmenuPortal.tsx`, `createPortal` to `document.body`) |
| Depth limit | a third level cannot open: the portal handler looks up `[data-submenu-key="…"]` (L1881) but no element renders that attribute |
| Menu row | `overflow-x-auto whitespace-nowrap` (L1646); order: Scheduler · Patient · Transactions · Charting · Reports · Utilities · Setup · Help · My Page · Logout |
| Top bar | time-clock button, chat launcher, Report-an-Issue, AppointNow bell (the only notification badge), organisation switcher, OFFICE switcher (L1533-1643) |
| Office switcher | "My offices" (assignments, home starred) + "Other offices (coverage)" when `showOtherOffices` (L299-303); always switches through `scope.switchOffice(id)` |

### 2.5 The compact-scale rule (`html { zoom: 0.75 }`) [V unless marked]

Defined in `src/styles/globals.css`: `--app-zoom: 0.75` (L74), `--vh` / `--dvh` / `--vw` = `calc(1vh / var(--app-zoom))` etc. (L75-77), `html { zoom: var(--app-zoom) }` (L198-199). Helpers in `src/utils/uiZoom.ts`: `uiZoom()` L18, `toLayoutPx(px)` L25, `viewportWidth()` L30, `viewportHeight()` L35, `layoutRect(el)` L40 (11 importers).

| Concern | Rule | Pattern to copy |
|---|---|---|
| Viewport units | raw `vh` / `vw` / `dvh` render at 75 % of the window | `calc(var(--vh) * N)`, `var(--vw)`, `var(--dvh)` (82 usages); Tailwind `h-screen` / `min-h-screen` / `max-h-screen` / `w-screen` are re-pointed (L806-809) |
| Measured geometry fed into styles | `getBoundingClientRect`, `clientX/Y`, `innerWidth/Height`, `scrollY` are viewport px; inline styles are layout px | `layoutRect()`, `toLayoutPx()`, `viewportHeight()` — e.g. `GlobalNav.tsx` L1341, `SubmenuPortal.tsx` L37-44 |
| Ratio maths | `(clientX - rect.left) / rect.width` needs no conversion | `uiZoom.ts` L13-14 |
| Drag deltas (column resize, chart brush, splitter) | divide the `clientX` delta by `uiZoom()` | `src/features/treatment-plans/TxPlanGrid.tsx` L108-120 |
| Element size for layout | read `offsetHeight` / `offsetWidth` (layout px) | `GlobalNav.tsx` L216-223 |
| Fill the rest of the viewport | measure top in layout px, subtract from `viewportHeight()` | `src/features/sms/hooks/useFillHeight.ts` |
| Full-height page with internal scroll | `h-[calc(calc(var(--vh)*100)-var(--app-nav-height))] overflow-hidden` | `src/components/pages/Scheduler.tsx` L2099 |
| Sticky under the nav | `sticky top-[var(--app-nav-height)]` | `PatientShellLayout.tsx` L304 |
| Overlay below the nav | `style={{ top: 'var(--app-nav-height, 0px)' }}` + `maxHeight: calc(var(--vh) * 100 - var(--app-nav-height, 0px) - Npx)` | `src/features/procedures/ProcedureDetailsDialog.tsx` L436-437 |
| Never | `overflow-x: hidden` on `body` (breaks every sticky header); contain horizontal overflow per component | `globals.css` L211-214 |
| Sticky table header + horizontal scroll | a table inside an `overflow-x-auto` wrapper cannot stick to the viewport; give the grid its own fixed height with `overflow: auto` and `sticky top-0` header (`sticky top-0` appears 40 times in 36 files) | [I] from CSS semantics |
| Popovers | Radix / floating-ui position correctly under the zoom per project notes (not re-verified here); hand-rolled popovers must use `layoutRect` | [I] |
| Charts | no zoom-specific code in the three recharts consumers; tooltip / brush behaviour under zoom is not verified statically. `ResponsiveContainer` needs a numeric `height` + `minWidth={0}` (`ReportChart.tsx` L33, L51) | [I] |
| Breakpoints | Tailwind breakpoints follow the real viewport, not the zoomed one (project notes) | [I] |

### 2.6 Global form CSS that constrains a filter panel (`src/styles/globals.css` L361-528) [V]

| Element | Forced with `!important` | Escape |
|---|---|---|
| `input` (not checkbox / radio) | background, color, `border: 2px solid var(--color-input-border)`, `font-weight` | none — Tailwind border / bg classes on inputs lose |
| `select` | same + `padding: 0.75rem 1rem`, `border-radius`, `cursor` | `select.tx-select` (`padding: 0 1.75rem 0 0.5rem`, 1 px border — for fixed-height `h-7` controls, L428-431); `select.sms-select`; `select.hdr-filter-select` (translucent on dark toolbars) |
| `select option:checked / :hover` | brand navy highlight (`--color-brand-primary: #3A6EA5`) | — |
| `textarea` | background, color, 2 px border | none |
| `input[type=checkbox]`, `[type=radio]` | `1.125rem` square, 2 px border, checked colour | none |
| `:root` | `accent-color: var(--color-brand-primary)` | — |

A reports-specific compact control needs a class-qualified rule in the same layer (the `tx-select` trick) — utility classes alone cannot override these.

### 2.7 Overlay and z-index conventions [V]

| Layer | Value | Source |
|---|---|---|
| Sticky patient bar | `z-30` | `PatientShellLayout.tsx` L304 |
| Feature dialogs under the nav | `z-40` … `z-[60]` | `restorative/AddAdaCodeModal.tsx` L359, `procedures/ProcedureDetailsDialog.tsx` L436 |
| `GlobalNav`, `ui/dialog.tsx` overlay + content | `z-50` | `GlobalNav.tsx` L1469, `ui/dialog.tsx` L41, L60 |
| Nav dropdowns / portal submenus | `zIndex: 9999` | `GlobalNav.tsx` L1756, `SubmenuPortal.tsx` L55 |
| Logout overlay | `z-[9999]` | `App.tsx` L513 |
| Messaging panel / its dialogs | `z-[10000]` / `z-[10060]`-`z-[10061]` | `features/messaging/components/ChatPanel.tsx` L36, `MessagingDialog.tsx` L38, L48 |

[I] A Radix `ui/dialog` (`z-50`) opened from a `z-[60]` feature dialog renders behind it — a Reports dialog (schedule editor, column chooser, drill-down) must pick its layer deliberately.

Modal practice: 86 files hand-roll `fixed inset-0` overlays; 13 use `createPortal`; `useBodyScrollLock` (`src/hooks/useBodyScrollLock.ts`, ref-counted, scrollbar-compensated) has 4 users; `window.confirm` is used in 65 files; `ui/dialog.tsx` (Radix) has 6 importers.

### 2.8 Printing and file output [V unless marked]

| Topic | Fact | Source |
|---|---|---|
| Print CSS | no `@media print` rule; Tailwind `print:` variants only in patient-overview and payment-plan screens. Nothing resets `html { zoom }` for print | `globals.css`; grep |
| Convention | never `window.print()` on app UI — build a document: server PDF first, client jsPDF fallback | `src/features/print/serverReport.ts` L1-11, `src/features/account-ledger/ledgerPrint.ts` L3 |
| Server-first helper | `openServerReport({ fetch_pdf: () => Promise<Blob>, fallback, label })`: opens the tab **before** the await (popup blockers), shows a "Preparing…" placeholder, navigates it to a blob URL, calls `tab.print()` after 1.2 s, revokes after 120 s, falls back with a toast on failure | `serverReport.ts` L39-70 |
| Client PDF scaffolding | `openPatientPdf(header, { orientation })`, `ensureSpace`, `sectionTitle`, `keyValueTable`, `dataTable(pdf, head, body, opts)`, `paragraph`, `cell`, `officeHeader(office, fallback)` (prefers `OfficeRead.letterhead`), `printPatientPdf(pdf)` = "Page x of y" + `doc.autoPrint()` + `window.open(doc.output('bloburl'), '_blank')`. The header type `PatientPrintHeader` is patient-specific (`patient_name`, `patient_id`, `chart_no`, `dob`) — a practice-level report header would be a sibling helper | `src/features/print/patientPdf.ts` L17-49, L72-262 |
| House output mode | `doc.output("bloburl")` in 9 feature folders (`claims`, `lab-tracking`, `letters`, `payment-plans`, `perio`, `prescriptions`, `print`, `time-clock`, `treatment-plans`); ledger, overview, transactions and insurance print go through `print/patientPdf.ts` | grep `.output(` |
| Outlier | `src/components/reports/lib/exportPdf.ts` L74-77 uses `doc.output("dataurlnewwindow")` | [V] |
| Production CSP | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss:; frame-src 'self' blob:; object-src 'self' blob:` + `X-Frame-Options: DENY` | `server.js` L33-66 |
| CSP effect on the outlier | `dataurlnewwindow` writes an `<iframe src="data:application/pdf…">` into a new window; `frame-src` allows only `'self' blob:` → likely blocked in production (works in `npm run dev`, which has no CSP) | [I] |
| Blob downloads from the API | 13 generated operations use `responseType: 'blob'` (patient reports, lab PDFs / CSV, statements, payment-plan PDFs, time-clock CSV / PDF) | `src/api/generated/endpoints/**` |
| Authenticated files | `src/services/documentAccess.ts`: `openAsset(url)`, `downloadAsset(url, file_name)`, `fetchAssetBlob`, `useAssetObjectUrl` — handles signed GCS URLs and API proxy paths | L44-116 |
| CSV | BOM built with `String.fromCharCode(0xfeff)`; writers in `src/components/reports/lib/exportCsv.ts`, `src/features/sms/smsCsv.ts`, `src/features/time-clock/timeClockModel.ts` (`summaryCsv`, `detailCsv`) | [V] |

---

## 3. Office context model

### 3.1 Pieces (`src/features/office-scope/`, barrel `index.ts`) [V]

| Symbol | File | Gives you |
|---|---|---|
| `useOfficeScope()` → `OfficeScope` | `OfficeScopeContext.tsx` L32-48, L161 | `office_id: number \| null` (working office), `office: OfficeOption \| null`, `office_key` (`OFF-<id>`), `home_office_id`, `assigned_office_ids`, `allowed_office_ids` (assigned, or every tenant office when unrestricted, L88-96), `can_view_all_offices`, `can_switch_any_office`, `permissions_enforced`, `office_assignment_enforced`, `status` (`resolving` / `ready` / `unassigned`), `office_options`, `office_options_loading`, `isAssigned(id)`, `switchOffice(id): Promise<boolean>` |
| `OFFICE_CHANGED_EVENT` | `OfficeScopeContext.tsx` L53 | `window` event `"office:changed"` (`detail.office_id`) after a successful switch |
| `deriveOfficeAccess`, `isOfficeAllowed`, `isMembershipRestricted`, `isPrivilegedRole`, `resolveInitialOffice` | `officeScopeModel.ts` L95-165 | pure rules (unit-tested) |
| `OFFICE_ASSIGNMENT_ENFORCED = true` | `officeScopeModel.ts` L54 | client mirrors the server's membership check |
| `PRIVILEGED_ROLES = ["owner","admin","manager"]` | `officeScopeModel.ts` L23 | matched as a **token** of the free-text role (`super_admin`, `office_manager`, `org_owner` all match, L95-101) |
| `PERMISSION_VIEW_ALL_OFFICES = "office_scope_view_all_offices"`, `LEGACY_PERMISSION_OTHER_OFFICE = "appointments_add_appointment_in_other_office"` | `officeScopeModel.ts` L32, L38 | the master office right + the coverage alias; counted only when `permissions_enforced === true` (L113) |
| `officeFilter(id)` → `{ office_id }` or `{}` | `officeParams.ts` L13-15 | read filter for most lists; never emits `office_id: null` |
| `homeOfficeFilter(id)` → `{ home_office_id }` or `{}` | `officeParams.ts` L18-20 | `GET /patients`, `/responsible-parties` |
| `allOfficesParam(all)` → `{ all_offices: true }` or `{}` | `officeParams.ts` L27-29 | deliberate tenant-wide read |
| `requireOfficeId(id, action)` / `OfficeRequiredError` | `officeParams.ts` L31-48 | writes that must carry an office |
| `OFFICE_HEADER = "X-Office-ID"`, `getActiveOfficeId`, `setActiveOfficeId` | `officeHeader.ts` L19-30 | header value kept outside React; attached in `src/services/api.ts` L21-36 |
| `useReadScope(screenKey, { allow, defaultMode? })` → `ReadScope` | `useReadScope.ts` L155-209 | per-screen breadth: `mode` (`office` / `my_offices` / `all`), `office_id` (when `office`), `office_ids` (assigned ∪ working, when `my_offices`), `setMode`, `canToggle`, `widestMode`, `modes`, `office_name`. Remembered in `sessionStorage` `dentc:read_scope:v1:<userId>:<screenKey>` (L52) |
| `ReadScopeAllow` | `useReadScope.ts` L27 | `everyone` (may always read all) / `privileged` (needs `can_view_all_offices`, else at most "my offices") / `never` |
| `<ScopeToggle scope={…} />` | `ScopeToggle.tsx` | segmented "This office · My offices · All offices"; renders nothing when only one mode is offered |
| `<OfficeBadge office_id variant? />` | `OfficeBadge.tsx` | neutral chip for the working office, amber "Other office: X" otherwise, grey "Unassigned" for null |
| `<ProviderOptionGroups providers keep_id? keep_label? />` | `ProviderOptionGroups.tsx` | `<optgroup>` "This office" / "Other offices" (§4) |
| `useOfficeOptions()` / `invalidateOfficeOptions()` | `useOfficeOptions.ts` | the ONE office catalog query (`["offices","options"]`, stale 10 min), never filtered |
| `listOfficeOptions()`, `OfficeOption`, `officeKeyToId()`, `officeKey()`, `resolveOffice()` | `src/services/officeLookup.ts` | `OfficeOption { key, id, name, short_id, office_code, is_active, default_fee_schedule_id, default_ucr_fee_schedule_id, timezone (IANA), office_group_id }` (L13-34); the only allowed parser of `OFF-<id>` (L44-52) |
| `OfficeRequiredBanner`, `OfficeUnassignedBanner` | `OfficeRequiredBanner.tsx` | banner, never a route gate |
| `usePatientOffice()` | `usePatientOffice.ts` | `home_office_id`, `posting_office_id`, `working_office_id`, `is_cross_office` inside the patient shell |
| `STAMP` / `resolveStamp(kind, ctx)` | `stampPolicy.ts` | which office a new record is stamped with (`utility_run: "working"` is the nearest analogue for a report run) |
| `useUnsavedGuard(isDirty, label)` | `useUnsavedGuard.ts` | registers a dirty form so `switchOffice()` asks before discarding |
| Storage | `officeScopeStorage.ts` | per-tab `sessionStorage` `dentc:office_scope:tab:<userId>`; per-user `localStorage` `dentc:last_office:<userId>` (survives logout) |

### 3.2 Server contract the FE must respect [V from `docs/office-scope/office_scope_backend_response.md` + `_r2.md` + generated params]

| Rule | Detail |
|---|---|
| Explicit office | any `?office_id=`, `?home_office_id=`, `office_ids`, `/offices/{id}/*` path, body office or `X-Office-ID` outside the caller's `user_offices` → `403 { error: { code: "office_not_assigned", details: { office_id, field, assigned_office_ids } } }` unless privileged (OFF-SCOPE-1) |
| Omitted office on a scoped list | non-privileged = the caller's assigned offices; privileged or zero assignments = tenant (OFF-SCOPE-2) |
| `all_offices=true` | tenant-wide; needs `office_scope_view_all_offices` (leadership roles hold it implicitly), else 403 |
| `office_ids` | repeated keys `?office_ids=1&office_ids=2` (matches the axios serializer) (OFF-SCOPE-8, FE-OFF-5) |
| `office_group_id` | restrict to an office group (OFF-SCOPE-8) |
| `include_global` | include `office_id IS NULL` rows; default true for catalogs, false for day-data (OFF-SCOPE-4) |
| Patient-scoped lists (`?patient_id=`) | never narrowed — chart and ledger are organisation-wide |
| `X-Office-ID` | validated, audited (`audit_logs.office_id`), default write stamp; never narrows a GET (FE-OFF-9). The interceptor attaches it to **every** non-login request, GETs included (`api.ts` L21-36) |
| Cross-office chart | `GET /patients/{id}` → `403 patient_not_in_office` without the master right (OFF-SCOPE-6); toast handled in `api.ts` L64-66 |
| Error envelope | always `{ error: { code, message, details } }` (`ErrorResponse` / `ErrorDetail`) |

Generated coverage of the scope params (204 `*Params` types):

| Param | # types | Where |
|---|---|---|
| `office_id` (scalar) | 71 | most lists |
| `all_offices` + `include_global` | 38 | 34 `list*Params` + `GetDashboardSummaryParams` + the three `GetTimeClockReport*Params` |
| `office_ids?: number[]` | 39 | the 38 above + `AppointnowListRequestsParams`. Two more types carry an `office_ids` typed **`string`** (not an array): `ListFeeScheduleAssignmentsParams`, `ListProvidersParams` |
| `office_group_id` | 39 | the 38 above + `ListFeeScheduleAssignmentsParams` |
| scalar only | — | `GetReportSummaryParams`, `GetReportTrendsParams`, `GetReportAccountsReceivableParams`, `GetReportAgingParams`, `GetInsuranceVerificationSummaryParams`, `SearchTransactionsParams`, `ListSchedulerAppointmentsParams` |

### 3.3 How a read must reach the API [V]

| Rule | Why | Source |
|---|---|---|
| Spread the office explicitly per call; never use an interceptor for filtering | Orval query keys are `[url, params]`; a filtering header would serve the previous office's rows after a switch | `officeParams.ts` L1-10, `officeHeader.ts` L6-11 |
| Never pass `office_id: null` | it changes the query key | `officeParams.ts` L12 |
| Send the office to the server, never filter after paging | a client filter after the 200-row page cap undercounts | header comments of `src/components/dashboard/lib/useMetrics.ts` |
| Labels come from the office catalog, never the raw key | `useOfficeOptions()` / `listOfficeOptions()` | `useOfficeOptions.ts` L15-19 |
| Rows from another office get `<OfficeBadge>` | visible, never hidden | `OfficeBadge.tsx` L11-15 |
| "Today" should be the office's day | `OfficeOption.timezone` is available; `todayIsoDate()` (`src/utils/datetime.ts` L110-115) uses the viewer's clock; office-zone helpers exist only in `src/features/time-clock/timeClockModel.ts` (`dayKey(date, time_zone)` L52, `wallTimeToIso` L468, `isoToWallTime` L479) | [V] helpers; need [I] |

Reference implementation of a scoped report screen: `src/features/time-clock/components/HoursReport.tsx` L67 (`useReadScope("time-clock-report", { allow: "privileged", defaultMode: "all" })`), L97-107 (maps `scope.office_id` / `scope.office_ids` / `scope.mode === "all"` into the query), `<ScopeToggle>` + `<OfficeBadge>`.

### 3.4 Is there an "office group" concept? — yes [V]

| Layer | Evidence |
|---|---|
| Entity + CRUD | `GET/POST /api/v1/office-groups`, `GET/PATCH/DELETE /api/v1/office-groups/{item_id}` (tag Organization) → `listOfficeGroups`, `createOfficeGroup`, `getOfficeGroup`, `updateOfficeGroup`, `deleteOfficeGroup` + hooks (`src/api/generated/endpoints/organization/organization.ts` L2208-2578) |
| Model | `OfficeGroupRead { id, tenant_id, legacy_id?, name, address?, address2?, city?, state?, zip?, phone?, created_by?, created_at }`; `OfficeGroupCreate` / `OfficeGroupUpdate`; `ListOfficeGroupsParams { page, size ≤ 200, sort, order, search }` |
| Membership | one group per office: `OfficeRead.office_group_id` / `OfficeCreate` / `OfficeUpdate` (`number \| null`); also on `OfficeAssignment` (so `MeFull.offices[]` carries it) and `LetterContextOfficeRead` |
| List a group's offices | `GET /api/v1/offices?office_group_id=` (`ListOfficesParams.office_group_id`) or filter `useOfficeOptions()` by `office_group_id` client-side |
| Read scope by group | `office_group_id` on 39 `*Params` types (§3.2); `ListPatientsParams.search_scope` = `current` / `all` / `group` (OFF-SCOPE-5, typed `string`) |
| Pricing | `FeeScheduleAssignmentRead.office_group_id`, `FeeQuoteContext.office_group_id`; `src/features/pricing/pricingContext.ts` L24 |
| FE setup screen | `src/components/setup/office-groups/OfficeGroupsSetup.tsx` at `/setup/office-groups/manage` (`App.tsx` L384) — list / add / edit / delete |
| FE assignment | Setup ▸ Offices ▸ Office Setup ▸ Info tab `<select>` "Office Group" (`src/components/setup/offices/tabs/InfoTab.tsx` L110-112, L481-494; hint text "Optional grouping for enterprise reporting") |
| FE catalog | `OfficeOption.office_group_id` (`src/services/officeLookup.ts` L33, L94) → available via `useOfficeScope().office` and `useOfficeOptions()` |
| Rights | `setup_office_groups_screen_full_control` / `_view_only` (kept); 13 kept `reports_group_reports_*` codes = legacy Denticon "Group Reports" (§5.5) |

What does **not** exist [V]:

| Gap | Detail |
|---|---|
| Group mode in the read-scope model | `ReadScopeMode` is `office` / `my_offices` / `all` only; `READ_SCOPE_LABELS` has no group label |
| Shared hook | no `useOfficeGroups`; three screens call `listOfficeGroups` directly (`InfoTab.tsx` L110, `FeeScheduleWizard.tsx` L146, `OfficeGroupsSetup.tsx` L74) |
| Nav entry | Setup ▸ Office Groups is commented out (`GlobalNav.tsx` L931-943); the screen is reachable only by URL |
| Stale placeholder | `/setup/office-groups/assign` still renders "Pending backend … gap #18" (`App.tsx` L385-386) although `OfficeUpdate.office_group_id` exists; `docs/setup/office-groups/OFFICE_GROUPS_INTEGRATION.md` §4 and `backend_devreport.md` #18 are stale (acknowledged in `docs/office-scope/office_scope_backend_devreport.md` L68) |
| Multiple groups per office, nested groups / regions, user ↔ group assignment | none (single nullable FK) |
| Group param on the report roll-ups | `/reports/summary`, `/trends`, `/accounts-receivable`, `/aging`, `/insurance-verification-summary` take `office_id` only |
| FE sender | no call site sends `office_ids` or `office_group_id` as a list filter today; "my offices" is filtered client-side (`Patient.tsx` L351, `AppointNowContext.tsx` L152-157, `timeClockService.ts` L83-84) |

Only other "group" resources in the API: `user-groups` (security), `insurance-plan-frequency-groups`, `definition-groups`, `image-groups` — none groups offices or providers [V `openapi.json` paths].

### 3.5 Mapping the legacy "Office OR Office Group" criterion [I]

| Legacy choice | FE state (snake_case) | Params to send | Privilege |
|---|---|---|---|
| One office | `office_id` | `...officeFilter(office_id)` (or `homeOfficeFilter`) | must be in `allowed_office_ids` |
| Several offices / "My offices" | `office_ids: number[]` | `office_ids` (repeated keys) | each id validated server-side |
| Office group | `office_group_id` | `office_group_id` | server intersects with the caller's assignments unless unrestricted (per `dentc-backend/app/api/v1/dashboard.py`, cited in the companion document) |
| All offices | `all_offices: true` | `...allOfficesParam(true)` | `can_view_all_offices` |
| (nothing chosen) | — | omit | server default = assigned offices |

A report criterion picker therefore needs a mode beyond today's `ScopeToggle` (single office / office set / office group / all), fed by `useOfficeOptions()` (grouped by `office_group_id`), `listOfficeGroups`, `allowed_office_ids` and `can_view_all_offices`.

### 3.6 Stale comments and docs in this area [V]

| Location | Says | Reality |
|---|---|---|
| `officeParams.ts` L22-26 | "FastAPI ignores the unknown param today" (`all_offices`) | enforced; 403 without the master right |
| `useReadScope.ts` L14-16, `Patient.tsx` L144-150, `timeClockService.ts` L83-84 | "no list endpoint takes an office SET yet" | 39 `*Params` types take `office_ids` |
| `rights.ts` L24-25 | "Mirrors the office-scope `OFFICE_ASSIGNMENT_ENFORCED = false` pattern" | the office flag is `true` |
| `AuthContext.tsx` L79-82 | permissions "empty until the backend defines office rights" | delivered |
| `docs/qa/DentC_E2E_Test_Workflows.html` (v1.0, 2026-09-02) | "assigned offices … stored and displayed but not enforced" | office membership and (server-side) rights are now enforced |
| `src/components/reports/components/ReportFilterPanel.tsx` L41-43 | "assignments are not enforced yet" | see companion document, defect D5 |

Role-matching difference: the FE treats any role containing the token `owner` / `admin` / `manager` as privileged; the server's `OFFICE_ADMIN_ROLES` is the exact set `{admin, super_admin, owner, manager}` (`dentc-backend/app/services/permission_service.py` L45, L98) [V]. A role such as `office_manager` would be offered "All offices" by the FE and refused by the server [I — depends on such role strings existing].

---

## 4. Provider selection

### 4.1 API of the provider directory [V]

| Function / hook | File | Returns | Notes |
|---|---|---|---|
| `fetchProviderRows()` | `src/services/providerDirectory.ts` L176-186 | every `ProviderRead` (active + inactive), name-sorted, all pages | 60 s in-flight / TTL cache (L194) for non-React callers |
| `fetchProviderDirectory()` | L220-222 | `ProviderOption[]` `{ id, name, short_id, office_id, role, title, is_active, scheduler_color, kind }` | picker shape |
| `fetchOfficeProviderIds(office_id)` | L233-246 | ids serving an office from `GET /offices/{id}/providers/effective` (`include_inactive: true`), fallback `GET /offices/{id}/providers`; `null` when neither answers | roster ∪ home office |
| `partitionByOffice(directory, office_id, assigned_ids)` | L254-264 | `{ in_office, others }` | **the** picker primitive |
| `scopeToOffice(...)` | L275-283 | roster, else everyone | explicitly discouraged for pickers (L271-273) |
| `fetchProvidersForOfficeGrouped(office)` | L308-317 | `{ in_office, others }` | accepts `OFF-4`, `"4"`, `4` |
| `fetchProvidersForOffice(office)` | L296-305 | `scopeToOffice` result | used by `src/components/reports/lib/useReportRefData.ts` L50-56 |
| `fetchProviders(officeId?)` | `src/services/schedulerApi.ts` L1029-1047 | every **active** provider, roster first, each flagged `in_office` | feed for `<ProviderOptionGroups>` |
| `useProviderDirectory(office_id?, { pinned? })` | `src/hooks/useProviderDirectory.ts` L68-132 | `providers`, `officeProviders`, `otherProviders`, `allProviders`, `providerRows`, `allProviderRows`, `providerLabel(id)`, `providerName(id)`, `isLoading` | keys `providerDirectoryKeys.all` / `.office(id)`, stale 5 min; 14 importers |
| `providerDisplayLabel(p)` = `providerOptionLabel(p)` | `providerDirectory.ts` L153-162 | `Name (ID)` where ID = `short_id` else backend id | mandatory label — the tenant has many same-name providers |
| `providerLabelFor(list)` / `providerLabelMap(list)` | L323-341 | id → `Name (ID)` resolver against the **full** directory | for grid cells and exports |
| `providerBareName(p)` / `providerNameFor(list)` | L139-143, L331-336 | name without id | patient-facing text only (letters, statements, SMS) |
| `providerKind(p)` → `dentist` / `hygienist` / `staff` / `other`; `isHygienist`, `isTreatingProvider` | L70-91 | normalises free-text `role` + licence `title` | never string-compare `role` |
| `invalidateProviderDirectoryCache()` | L198-200 | — | after provider edits |

`ProviderRead` fields useful as report dimensions: `office_id` (home office scalar), `served_office_ids?: number[]`, `role`, `provider_kind?`, `title`, `specialty`, `specialty_code?`, `specialty_label?`, `is_ortho_provider`, `is_billing_provider`, `is_active`, `user_id?`, `npi`, `short_id`, `legacy_id` (`src/api/generated/model/providerRead.ts`) [V]. `served_office_ids` has no FE reader.

### 4.2 Rules [V `providerDirectory.ts` L28-37, L248-253, L266-274]

| Rule | Reason |
|---|---|
| Never scope by the `ProviderRead.office_id` scalar | it is a single home office; rosters are sparse (comment: 92 of 97 providers sit on office 1, office 4 lists one test provider) |
| Prefer, never exclude | render "This office" first, every other provider below; a required picker must never be empty |
| Labels resolve against the full directory | historical rows reference out-of-office or deactivated providers |
| Keep a stored id selectable | `pinned` option of `useProviderDirectory`, `keep_id` of `<ProviderOptionGroups>` |

### 4.3 Building a multi-provider report filter [I]

| Step | Reuse |
|---|---|
| Source | `useProviderDirectory(office_id)`; include inactive providers behind a toggle for historical periods (`allProviders`) |
| Grouping | "This office" = `officeProviders`; "Other offices" = `otherProviders`. With several offices / a group selected, compute the union of rosters: `fetchOfficeProviderIds(id)` per office (pattern: `src/components/setup/insurance/FeeScheduleWizard.tsx` L176-199 + `feeScheduleWizardModel.ts` `buildProviderRows`, which derives the provider step from the selected offices and has a "show others" switch) |
| Option label | `providerOptionLabel(p)` |
| Extra facets | provider type via `providerKind` (dentist / hygienist), `is_ortho_provider`, `specialty_label` |
| "All providers" | omit the param — do not enumerate ids |
| Stored selections (saved view / schedule) | keep ids; resolve labels with `providerLabel`; keep unknown ids visible as "(not in list)" |
| Widget | no checkbox multi-select exists; options are `DualListPicker` (transfer list) or a new popover multi-select (§6.1) |

### 4.4 Server limits for provider / user / carrier criteria [V]

| Criterion | Generated support |
|---|---|
| Single `provider_id` | yes on `ListPatientProceduresParams`, `ListPatientPaymentsParams`, `ListSchedulerAppointmentsParams`, … |
| Provider set | none (`provider_ids` appears only on `ListFeeScheduleAssignmentsParams`) |
| User set | none (`user_ids` only on `GetMessagingPresenceParams`); `ListUsersParams { office_id, role, is_active, search }` for the picker |
| Carrier set, procedure-code range, amount range | none (`amount_min` / `amount_max` only on the transaction feed) |
| `group_by`, `date_basis` | only `GetLabCostReportParams` / `PrintLabCostReportParams` |
| Array query params in the whole client | `office_ids?: number[]` (39 types), `ComparePerioExamsParams.exam_ids: number[]`, `ListPatientDocumentsParams.context` / `exclude_context: string[]` — nothing else (the comment in `src/services/api.ts` L15-16 naming `exam_ids` as the only one is stale) |

---

## 5. Users, roles and permissions

### 5.1 Identity and session [V]

| Item | Detail | Source |
|---|---|---|
| Login | `POST /api/v1/auth/login` → `access_token`, `refresh_token` into `localStorage`; then `GET /api/v1/auth/me-full` | `AuthContext.tsx` L400-450 |
| `MeFull` | `{ user: UserRead, tenant?: TenantBrief, offices?: OfficeAssignment[], last_patient_id?, current_office_id?, provider_id?, permissions?: string[], permissions_enforced?: boolean, groups?: string[], can_reset_user_passwords?: boolean }` | `src/api/generated/model/meFull.ts` |
| `UserRead` (relevant) | `id`, `tenant_id`, `username`, `email`, `first_name`, `last_name`, `role` (free string), `patient_access_level?`, `is_active`, `short_id?`, **`report_access_provider_id?`**, `current_office_id?`, `last_login_at?` | `userRead.ts` |
| `OfficeAssignment` | `office_id`, `name?`, `office_code?`, `is_primary?`, `short_id?`, `is_active?`, `office_group_id?`, `timezone?` | `officeAssignment.ts` |
| `useAuth()` | `isAuthenticated`, `user`, `login`, `logout`, `organizations`, `currentOrganization` (`ORG-<id>`), `tenantId: number \| null`, `currentOffice` (`OFF-<id>`), `setCurrentOffice`, `activePatient`, `setActivePatient` | `AuthContext.tsx` L102-131 |
| `useAuth().user` | trimmed, partly camelCase legacy shape: `id: string`, `email`, `name`, `role: UserRole`, `isFirstLogin`, `isActive`, `isOrgOwner`, `organizationId`, `permissions`, `permissions_enforced`, `provider_id`, `groups`, `can_reset_user_passwords` | L70-92, L141-183 |
| `UserRole` union | `super_admin`, `owner`, `admin`, `manager`, `doctor`, `provider`, `front_desk`, `staff` (server value is a free string cast into it) | L60-68 |
| Full profile | `useMyProfile()` (`src/components/my-page/lib/useMyProfile.ts`) = `getMeFull` under `["my-page","me-full"]`, stale 5 min — the way to read `report_access_provider_id` | [V] |
| Identity refresh | `refreshIdentity()` re-reads me-full in the background on restore | L319-330 |
| Stored session | `access_token`, `refresh_token`, `me_full` (the trimmed user), `access_ctx` (organisations), `current_org`, `current_office` | L231-260, L410-422 |
| Refresh token | stored and sent on logout only; generated `refreshToken()` (`POST /api/v1/auth/refresh`) has **no** caller | grep |
| 401 handling | `api.ts` L69-94: clears storage, dispatches `auth:unauthorized`, hard-redirects to `/login` (except `/auth/login` and `/users/me/change-password`) | [V] |
| Tenant | one tenant per login (`organizations` has at most one entry); tenant id for `/tenants/{id}` paths = `useAuth().tenantId` | L163-180, L292-296 |
| `report_access_provider_id` | editable in Setup ▸ Security ▸ Users ("Report Access Provider", `src/components/modals/AddEditUserModal.tsx` L1437-1442); consumed only by My Page (`src/components/pages/MyPage.tsx` L51) — no report restricts by it | [V] |
| `patient_access_level` | stored and displayed; not enforced by the FE | [V] |

### 5.2 Four independent gates [V]

| Gate | Input | FE state today | Server |
|---|---|---|---|
| Authentication | token presence | enforced per route (ternary) | 401 |
| Role | `user.role` | ad hoc per feature (table below) | coarse role checks for ungated users |
| Rights | `user.permissions` + `user.permissions_enforced` | built, **dark**: `RIGHTS_ENFORCED_DEFAULT = false` (`src/features/access-control/rights.ts` L27) → every check grants | `403 permission_denied` (`details.required_any_of`) on a starter set of writes for callers who are in ≥ 1 active group; reads are never gated by rights (`docs/setup/security/ACCESS_RIGHTS_BACKEND_RESPONSE.md` §B2, §C1) |
| Office membership | `assigned_office_ids`, `can_view_all_offices` | enforced (`OFFICE_ASSIGNMENT_ENFORCED = true`) | `403 office_not_assigned` |

Role checks in the FE:

| Check | Rule | Source |
|---|---|---|
| Setup ▸ Tenant | `role === "owner"` or email contains "superadmin" | `GlobalNav.tsx` L900, `src/components/pages/setup/TenantSetup.tsx` L36 |
| Utilities | per-utility `roles?: UserRole[]` allow-list; `canRunUtility` / `authorizedUtilities` | `src/components/utilities/lib/rbac.ts` |
| Time-clock team report | `isPrivilegedRole(role)` | `src/features/time-clock/timeClockAccess.ts` |
| Dashboard | widget **order** only via `roleBucket(role)` | `src/components/dashboard/lib/dashboardUtils.ts` L36-51 |
| Rights bypass | `SUPER_ROLES = ["admin","super_admin"]` (= server `FULL_ACCESS_ROLES`) | `rights.ts` L54 |
| Office view-all | token match on `owner` / `admin` / `manager` | `officeScopeModel.ts` L95-101 |

### 5.3 The rights module (`src/features/access-control/`) [V]

| Export | Purpose |
|---|---|
| `useRights()` → `{ has(code), hasAny(codes), hasAll(codes), isSuperAdmin, enforced, ready, codes }` | primary hook; `ready` is false while me-full hydrates |
| `useHasRight(code \| codes, mode = "any")` | single boolean |
| `<RequireRight code mode? redirectTo? fallback?>` | element guard (default fallback `null`) or route guard (`redirectTo` or `fallback={<AccessDenied />}`) |
| `<AccessDenied title? message? />` | in-place denial panel |
| `RIGHT` (`rightCodes.ts`) | typed shortlist of codes actually gated — contains **no** `reports_*` code; `RIGHT.home.dashboardView = "dashboard_view"` and `RIGHT.general.viewAllOffices` are defined, never referenced |
| `rightsEnforced()` | `localStorage["dentc:rights_enforced"]` `"1"` / `"0"` overrides the default (QA switch) |
| Grant-everything conditions | kill-switch off, or super role, or `permissions_enforced === false` (`rights.ts` L70-79) |

Catalog and group plumbing: `GET /api/v1/permissions` → `PermissionRead { code, label, category? }`; `GET /api/v1/roles` → `Option[]`; `GET/PUT /api/v1/user-groups/{group_id}/rights` (`right_codes`, full replace); picker `src/components/setup/security/groups/AddEditGroupModal.tsx` (`useListPermissions` + `DualListPicker`) — a new code added to the backend catalog appears in the picker without FE work [V code; behaviour I].

### 5.4 How routes and menus are gated today [V]

| Surface | Gate |
|---|---|
| `/reports`, `/reports/run/:reportId`, all report placeholders | `isAuthenticated` only |
| Reports dropdown | none |
| `/dashboard`, `/my-page` | `isAuthenticated` only |
| `/setup/security/users`, `/setup/security/groups` | `<RequireRight code={[full, view]} fallback={<AccessDenied />}>` (`App.tsx` L395-396) — dark |
| Patient `restorative`, `perio`, `imaging` | `<RequireRight>` (L189, L211, L227) — dark |
| Setup dropdown leaves | `SETUP_NAV_RIGHTS` + `filterNavByRights` — dark |
| `/utilities/run/:utilityId` | role allow-list re-checked in `UtilityShell.tsx` L62 |
| `/time-clock/report` | role check inside the page (`TimeClockReportPage.tsx` L14) with an explanatory panel |
| In-screen buttons / tabs | `useRights()` / `useHasRight` / `<RequireRight>` in 16 files besides `App.tsx` and `GlobalNav.tsx` (delete procedure / payment / claim, post to ledger, AppointNow approve / decline, imaging delete, …) — dark |

### 5.5 Report-related rights — complete list

Sources: `docs/setup/security/handover/KEEP_codes.txt` (319), `REMOVE_codes.txt` (210), `ADD_rights.json` (44), cross-checked programmatically against `dentc-backend/app/services/access_rights_catalog.py`: all 210 removed and all 44 added codes are present there, and none of the 56 kept report codes is touched by it [V]. Whether a given database has migration `8e4a6a8e5ab0` applied is not verifiable statically [I].

**A. Kept — category `Reports` (56 codes).** Pattern `<stem>_full_control` / `<stem>_view_only` unless shown otherwise.

| Legacy menu area | Codes |
|---|---|
| Daily Reports | `reports_daily_reports_screen_full_control`, `reports_daily_reports_screen_view_only` |
| Monthly Reports | `reports_monthly_reports_screen_full_control`, `reports_monthly_reports_screen_view_only` |
| Ledger Reports | `reports_ledger_reports_screen_full_control`, `reports_ledger_reports_screen_view_only` |
| Management Reports | `reports_management_reports_screen_full_control`, `reports_management_reports_screen_view_only` |
| Insurance Reports | `reports_insurance_reports_screen_full_control`, `reports_insurance_reports_screen_view_only` |
| Appointment Reports | `reports_appointment_reports_screen_full_control`, `reports_appointment_reports_screen_view_only` |
| Treatment Plan Reports | `reports_treatment_plan_reports_screen_full_control`, `reports_treatment_plan_reports_screen_view_only` |
| Referral Reports | `reports_referral_reports_screen_full_control`, `reports_referral_reports_screen_view_only` |
| Statements | `reports_statements_screen_full_control`, `reports_statements_screen_view_only`, `reports_statement_allow_updating_statement_dates` |
| Lists | `reports_lists_patient_list_screen_full_control` / `_view_only`; `reports_lists_responsible_party_list_screen_full_control` / `_view_only`; `reports_lists_provider_list_screen_full_control` / `_view_only`; `reports_lists_employer_list_screen_full_control` / `_view_only`; `reports_lists_office_list_screen_full_control` / `_view_only`; `reports_lists_prescription_list_screen_full_control` / `_view_only`; `reports_lists_procedure_fee_list_screen_full_control` / `_view_only`; `reports_lists_security_list_rpts_screen_full_c` (truncated code, no view-only); `reports_lists_setup_list_rpts_screen_full_cont` (truncated code, no view-only) |
| Letters | `reports_letters_screen_full_control`, `reports_letters_screen_view_only`, `reports_custom_letter_full_control`, `reports_custom_letter_screen_view_only` |
| Forms | `reports_pat_reg_medical_info_forms_full_control`, `reports_pat_reg_medical_info_forms_view_only` |
| My Reports | `reports_my_reports_full_control`, `reports_my_reports_view` |
| Group Reports (office-group level, 13) | `reports_group_reports_daily_screen_full_control` (no view-only); `reports_group_reports_mang_screen_full_control` / `_view_only`; `reports_group_reports_ins_screen_full_control` / `_view_only`; `reports_group_reports_appointment_reports_full_control` / `_view_only`; `reports_group_reports_referral_reports_full_control` / `_view_only`; `reports_group_reports_batch_reports_full_control` / `_view_only`; `reports_group_reports_other_reports_full_control` / `_view_only` |

**B. Kept — other categories that mention reports, lists or statements.**

| Code | Category |
|---|---|
| `appointments_dps_ins_verification_reports` | Appointments |
| `patient_responsible_party_statement_collection_rights`, `patient_unclose_account_statement_screen_full_control` | Patient |
| `transactions_pre_authorizations_list_full_control`, `transactions_pre_authorizations_list_view_only` | Transactions |
| `utilities_copy_letters_full_control`, `utilities_copy_letters_view_control` | Utilities |
| `setup_picklist_full_control` (pick list — not a report) | Setup |
| Adjacent, likely needed by report features: `setup_close_out_full_control`, `setup_close_out_view_only`, `setup_close_out_all_offices`; `patient_recall_due_dates_screen_full_control` / `_view_only`; `utilities_referral_management_full_control` / `_view_only` / `_edit_status`; `setup_office_groups_screen_full_control` / `_view_only`; `transactions_allow_add_delete_backdated_payment_between_closeout_date_and_yesterday` | Setup / Patient / Utilities / Transactions |

**C. Removed from the catalog (migration `8e4a6a8e5ab0`) — 54 `reports_*` / `report_*` codes.**

| Legacy feature | Codes |
|---|---|
| Recall Reports | `reports_recall_reports_screen_full_control`, `reports_recall_reports_screen_view_only` |
| Ortho Reports | `reports_ortho_reports_access_full_control`, `reports_ortho_reports_view_only` |
| Labels | `reports_labels_screen_full_control`, `reports_labels_screen_view_only` |
| Postcards | `reports_postcards_full_control`, `reports_postcards_view_only`, `reports_custom_postcard_full_control`, `reports_custom_postcard_screen_view_only` |
| Excel Reports | `reports_excel_reports_full_control`, `reports_excel_reports_view_only` |
| Batch Schedule Report (scheduled reports) | `report_batch_schedule_report_access_full_control`, `report_batch_schedule_report_view_only`, `report_batch_schedule_report_add_schedule`, `report_batch_schedule_report_delete_schedule` |
| Batch Collection Letters | `reports_batch_collection_letters_full_control`, `reports_batch_collection_letters_view_only` |
| Blank Insurance Form | `reports_blank_insurance_form_screen_full_control`, `reports_blank_insurance_form_screen_view_only` |
| DHA Reports | `reports_dha_reports_screen_full_control`, `reports_dha_reports_screen_view_only` |
| Voice charting | `reports_voice_charting_adoption_full_control` |
| Office Reports — other Denticon tenants (31), prefix `reports_office_reports_` | `abbeydental_full_control`, `adrpts_screen_full_con`, `adrpts_screen_view_only`, `bnrpts_screen_full_cont`, `bnrpts_screen_view_only`, `chi_st_joseph_children_s_health_reports_full_control`, `chi_st_joseph_children_s_health_reports_view_only`, `dental_care_access`, `greathillsrpts_access`, `hawaiirpts_full_control`, `hawaiirpts_view_only`, `healthcare_network_access_full_control`, `healthysmileskids_full_co`, `kane_dental_access`, `kane_dental_view`, `kansas_rpts_full_contro`, `lumina_reports_full_control`, `lumina_reports_view_only`, `nedmrpts_screen_full_co`, `nedmrpts_screen_view_on`, `ohc_reports_full_contro`, `ottawareports_access`, `premier_perio_full_cont`, `sgkreports_screen_full_control`, `sgkreports_screen_view_only`, `tru_family_rpts_full_control`, `uop_reports_full_contro`, `vhrpts_screen_full_con`, `vhrpts_screen_view_only`, `village_family_dental_reports_full_control`, `village_family_dental_reports_view_only` |

**D. Removed — analytics and other report / list / statement mentions.**

| Group | Codes |
|---|---|
| Denticon Practice Analytics (10), prefix `denticon_practice_analytics_`, suffix `_full_control` | `executive_dashboard`, `production_analysis`, `collection_analysis`, `provider_breakdown`, `treatment_plan_analysis`, `patient_visit_analysis`, `hygiene_recall`, `referral_analytics`, `front_office`, `morning_huddle` |
| Other | `utilities_access_to_dentilytics_enterprise`; `utilities_ehr_ehrreport_fullcontrol`; `mytooth_check_the_activity_report_full_control`; `utilities_automated_campaigns_dashboard_full_control` / `_view_only`; `utilities_automated_campaigns_mailing_list_management` / `_user_specific` / `_view_only`; `utilities_office_specific_dha_statementxmldld_full` / `_view`; `utilities_scheduled_reallocation_list`; `appointments_short_call_list`; `appointments_short_notice_list` |

**E. Added (relevant to reporting).** `dashboard_view` (category Dashboard — the stated replacement for the analytics rights), `my_page_access`, `office_scope_view_all_offices` (General), `charting_perio_print`, `appointments_scheduler_print`, `transactions_claims_ada_direct_print`, `imaging_export`, `patient_letters_full_control` / `_view_only` / `_generate`.

**F. What the catalog does not have [V by absence].** No right for: Interactive Reports (Unsigned Progress Notes, Eligibility Verification), My Favorites, Search Report, a report builder, saved views, scheduling / emailing (the four `report_batch_schedule_report_*` codes were removed), export as a separate action, KPI dashboards beyond the single `dashboard_view`, provider scorecards, benchmarking, AI insights, per-report granularity (legacy rights are per menu category, full / view). No kept `reports_*` code is referenced by any FE file or backend route guard (grep over `src` and `dentc-backend/app`) [V].

Design note [I]: the legacy pairing "Full Control / View Only" maps naturally to "run + export / view on screen", and the 13 `reports_group_reports_*` codes map to office-group / multi-office scope — but running a tenant-wide report additionally requires `office_scope_view_all_offices` on the server.

---

## 6. Reusable building blocks for a report filter panel and results

### 6.1 Filter inputs [V]

| Need | Existing piece | Path | Verdict |
|---|---|---|---|
| Date range presets | `RangePreset` (7: today, yesterday, this_week Monday-start, this_month, this_quarter, this_year, custom), `resolveRange`, `granularityFor`, `bucketKey`, `bucketLabel` | `src/components/reports/lib/reportRange.ts` | keep + extend |
| Second preset set | `PeriodKey` (today, this_week, last_week, last_2_weeks, this_month, last_month, custom), `periodRange(period, today)` | `src/features/time-clock/timeClockModel.ts` L354-367 | duplicate logic — consolidate |
| Date input | native `<input type="date">` (house standard) | 50 files | no shared range component |
| Calendar widgets | `CalendarPicker` (Scheduler-specific, absolute `position` prop), `DatePickerCalendar` (MM/DD/YYYY strings, 1 importer), `ui/calendar.tsx` (react-day-picker 9, unused) | `src/components/CalendarPicker.tsx`, `src/components/modals/DatePickerCalendar.tsx` | a range calendar would be new work (`ui/calendar` + `ui/popover` are the unused base) [I] |
| Date helpers | `todayIsoDate`, `formatIsoDateOnly`, `parseServerDateTime` (naive timestamps are UTC), `formatUsDateTime`, `formatAuditDateTime`, `US_DISPLAY_TIME_ZONE` | `src/utils/datetime.ts` | reuse; never `new Date("YYYY-MM-DD")` |
| More date helpers | `isoOf`, `addDays`, `startOfMonth`, `dateRange`, `shortDayLabel`, `parseDecimal`, `formatCurrency`, `formatCurrencyExact` | `src/components/dashboard/lib/aggregate.ts` | reuse (`addDays` is duplicated in `timeClockModel.ts` L101) |
| Single select | native `<select>` | everywhere | subject to §2.6 |
| Multi-select (transfer list) | `DualListPicker` — props `available`, `assigned` (`DualListItem { id, primary, secondary?, meta? }`), `onChange(assignedIds)`, titles, `searchable`, `disabled`, `loading`; Ctrl / Cmd multi-select, bulk move, double-click | `src/components/setup/offices/DualListPicker.tsx` (5 consumers) | good for "selected offices / providers / codes"; heavy for a compact filter bar |
| Multi-select (checkbox list with all / specific radio, cascading) | `StepOffices`, `StepProviders` inside the Fee Schedule wizard | `src/components/setup/insurance/FeeScheduleWizard.tsx` + `feeScheduleWizardModel.ts` | precedent for office → provider cascade; not extracted as a component |
| Popover checkbox multi-select / combobox | none (`ui/command.tsx`, `ui/popover.tsx` unused) | — | to build |
| Async single-select typeahead | `EntityPicker` — props `valueId`, `valueLabel`, `onChange(id, label)`, `search(query): Promise<PickerOption[]>`, `placeholder`, `allowClear`, `disabled`; 250 ms debounce; dropdown is `absolute z-20` (not portalled) | `src/components/setup/insurance/EntityPicker.tsx` | reuse; clipped inside `overflow-hidden` parents |
| Search sources for `EntityPicker` (`PickerOption { id, label, sub? }`) | `searchCarriers(query, carrierType?)`, `searchEmployers`, `searchProviders`, `searchOffices`, `searchFeeSchedules`, `searchPlans`; `searchProcedureCodes` | `src/components/setup/insurance/lookupService.ts`, `procedureCodeService.ts` | reuse |
| Id → name caches | `ensureCarrierNames` / `carrierName`, `ensureEmployerNames` / `employerName`, `ensureProviderNames`, `ensureOfficeNames`, `ensureFeeScheduleNames`, `ensurePlanLabels` / `planLabel` | `lookupService.ts` | reuse for chips / saved-view summaries |
| Office picker | `useOfficeOptions()` + optgroups "My offices" / "Other offices" (pattern in `ReportFilterPanel.tsx`), `<ScopeToggle>` | §3 | extend for sets / groups |
| Provider picker | `useProviderDirectory` + `<ProviderOptionGroups>` | §4 | single-select today |
| User picker | `loadUserDirectory()` (crawls every `listUsers` page at 200 per page), `useUserNames()`, `userDisplayName(u)`; duplicate display names are disambiguated with `(#id)` in `HoursReport.tsx` L87-95 | `src/services/userDirectory.ts` | no shared component |
| Patient lookup | helpers only: `parse_patient_id`, `lookup_patient_by_id` (`GET /patients/{id}`), `lookup_patients_by_legacy_id` (detects an ignored `legacy_id` filter), `patient_in_offices`, `patient_matches_scope`; `useExistingPatientMatches` (name + DOB) | `src/features/patients/` | no reusable patient-picker component; search UIs are embedded in `components/pages/Patient.tsx`, `components/modals/NewAppointmentModal.tsx`, `components/dashboard/widgets/GlobalSearchWidget.tsx` |
| Plan search | `PlanSearchPanel` (group # / carrier / payer id) | `src/features/patient-insurance/PlanSearchPanel.tsx` | screen-specific; note ~31k plans, server-paginated |
| Procedure codes | `loadProcedureCodes()` (full map, ~1,100 codes, 5 min TTL), `codeDescription`, `cachedProcedureCode`, `searchProcedureCodes`; `AppointmentProcedurePicker` (modal, screen-specific) | `src/components/setup/insurance/procedureCodeService.ts` | reuse the service; code-range input is new |
| Definitions (lookup groups) | two hooks named `useDefinitions`: `src/shared/hooks/useDefinitions.ts` → `{ options: {value,label,raw}[], definitions, isLoading, isError }`; `src/hooks/useDefinitions.ts` → `{ ...query, definitions }` sorted by `sort_order` (new array every render — do not put it in effect deps) | — | prefer the `shared` one; group codes include `patient_type`, `payment_method`, `adjustment`, `appt_status`, `referral_type` |
| Schema-driven params | `ParamKind` = `office`, `provider`, `date`, `dateRange`, `text`, `number`, `select`, `checkbox`, `file`; `UtilityParamField { key, label, kind, required?, placeholder?, help?, options?, defaultValue?, accept? }`; `paramsComplete(def, values)`; `UtilityParamsForm` | `src/components/utilities/types.ts` L42-69, `lib/paramValidation.ts`, `components/UtilityParamsForm.tsx` | the only declarative-form precedent |

### 6.2 Results, feedback and output [V]

| Need | Existing piece | Path | Verdict |
|---|---|---|---|
| KPI tile | `KpiStat` (`label`, `value`, `icon?`, `tone`, `hint?`, `onClick?`, `loading?`) | `src/components/dashboard/components/KpiStat.tsx` | extend (delta, sparkline, target) |
| Card with states | `WidgetCard` (`isLoading`, `isError`, `errorMessage`, `isEmpty`, `emptyMessage`, `awaitingBackend`, `actions`, `footer`) | `…/WidgetCard.tsx` | reuse |
| Charts | recharts; `ReportChart` (bar / pie from a `ChartSpec`) | `src/components/reports/components/ReportChart.tsx` | extend; palette `#3A6EA5`, `#2FB9A7`, `#F59E0B`, `#8B5CF6`, `#EC4899`, `#10B981`, `#94A3B8` |
| Tables | reports `DataTable` (client-only); table class tokens in `theme.ts`; `TxPlanGrid` (resizable, sortable, widths persisted in `dentc:tx_plan_grid:col_widths`) | — | no shared grid |
| Pagination | envelope `{ items: T[], meta: PageMeta { page, size, total, pages } }`; adapter `toOffsetPagination(meta)` exists with no importer (`src/shared/lib/pagination.ts`) | — | server paging contract is uniform |
| Dialog | `ui/dialog.tsx` (Radix, `z-50`), hand-rolled overlays, `utilities/components/ConfirmDialog.tsx`, `useBodyScrollLock` | §2.7 | choose one for the module |
| Toasts | `toast` from `sonner` (98 files) | — | note the automatic error toast on every failed query / mutation → a screen that also renders an error state shows two messages |
| Error text | `apiErrorMessage(err)` | `src/features/progress-notes/progressNotesService.ts` L101 (also imported by `features/time-clock/useTimeClock.ts` and `TimeEntryDialog.tsx`) | no shared home; the only exported API-error-text helper |
| Print / PDF / CSV / Excel | §2.8 | — | — |
| Run / job UX | `UtilityShell` (params → confirm → progress → result), `RunConsole`, `StatusBadge`, `UtilityCard`, `useUtilityRun`; hub with favourites / recents / history `UtilitiesDashboard` | `src/components/utilities/**` | UI precedent; today simulated + `localStorage` |
| Markdown rendering | `react-markdown` | `MessageBubble.tsx` | usable for narrative insights |
| Realtime push | messaging WebSocket `/api/v1/messaging/ws?token=` carries tenant-topic envelopes (`appointnow.request`, `procedures.changed`, `sms.inbound`); clients `src/features/appointnow/lib/appointnowSocket.ts`, `src/features/messaging/transport/realTransport.ts`; best-effort, always paired with polling | — | reusable channel for "report run finished" [I] |
| Cross-tab sync | `BroadcastChannel` wrappers (`appointnowBus.ts`, `messagingBus.ts`) | — | — |

### 6.3 Reference-data caches and their lifetimes [V]

| Data | Loader | Cache |
|---|---|---|
| Offices | `listOfficeOptions()` / `useOfficeOptions()` | module promise for the session + React Query 10 min; `invalidateOfficeOptions()` |
| Office groups | `listOfficeGroups({ size: 200 })` | none (per-screen `useState`) |
| Providers | `fetchProviderRows()` / `useProviderDirectory` | 60 s module TTL + React Query 5 min |
| Office rosters | `fetchOfficeProviderIds(office_id)` | React Query 5 min per office |
| Users | `loadUserDirectory()` | module map until `invalidateUserDirectory()` |
| Procedure codes | `loadProcedureCodes()` | 5 min module TTL |
| Carriers / employers / plans / fee schedules | lazy by id (`ensure*`) + search | module maps, no expiry |
| Definitions | `useListDefinitions` | React Query default 30 s |

### 6.4 Browser persistence — not durable [V]

`clearAuthStorageKeepRemembered()` (`src/features/auth/rememberMe.ts` L30-51) runs `localStorage.clear()` on logout (`AuthContext.tsx` L469), on every session-expiry 401 (`api.ts` L79) and on a failed restore (`AuthContext.tsx` L391). Preserved keys only: `remembered_identifier`, `dentc:last_patient:*`, claim fill-out keys, ADA local stores, `dentc:last_office:*`.

| Key | Owner | Survives logout / 401 |
|---|---|---|
| `dentc:reports:views:<user_id>:<reportId>` | report saved views (`src/components/reports/lib/savedViews.ts`) | **no** |
| `dentc:utilities:{favorites,recents,history}:<userId>` | Utilities hub | **no** |
| `dentc:my-page:<bucket>:<userId>` | My Page tasks / quick links | **no** |
| `dentc:tx_plan_grid:sort`, `dentc:tx_plan_grid:col_widths` | grid preferences | **no** |
| `dentc:read_scope:v1:<userId>:<screenKey>` | read scope (`sessionStorage`) | per tab |
| `dentc:rights_enforced` | QA override | **no** |

Any report favourite, saved view, column layout or dashboard layout kept in `localStorage` is lost at the next session timeout.

### 6.5 Server-side stores that already exist and are unused by the FE [V generated client; no app importer]

| Endpoint | Generated fn | Shape | Possible use [I] |
|---|---|---|---|
| `GET` / `PUT /api/v1/users/me/preferences` | `getMyPreferences`, `setMyPreferences` | `PreferencesBlob { preferences?: { [key]: unknown } }` | interim home for favourites / recents / default filters |
| `GET/POST/PATCH/DELETE /api/v1/user-preferences` | `listUserPreferences`, … | `UserPreferenceRead { user_id, pref_key, pref_value? }` | key-value alternative (already read by `src/services/userApi.ts`) |
| `GET /api/v1/users/me/notifications`, `POST …/{notification_id}/read`, `POST …/read-all` | `listMyNotifications`, … | `NotificationList { unread_count, items: NotificationRead { id, category?, title, body?, ref_type?, ref_id?, is_read, read_at?, created_at } }` | "scheduled report ready" inbox; no notification centre exists in the nav |
| `GET/POST/PATCH/DELETE /api/v1/users/me/tasks` | `listMyTasks`, … | `UserTaskRead` | — |
| `GET /api/v1/audit-logs` (`user_id`, `resource_type`, `resource_id`, `patient_id`, `office_id`, `search`) | `listAuditLogs` | `AuditLogRead { action, resource_type?, resource_id?, patient_id?, office_id?, method, path, status_code?, details?, created_at }` | report run / export audit viewer |
| `POST /api/v1/utilities/{utility_id}/run`, `GET /api/v1/utilities/jobs/{job_id}`, `GET /api/v1/utilities/audit` | `runUtility`, `getUtilityJob`, `listUtilityAudit` | `UtilityRunRead { id, utility_id, office_id?, run_by?, status, parameters?, processed, succeeded, failed, logs?, created_at, finished_at? }` | precedent for an async run / job / audit contract |

---

## 7. Conventions a new feature module must follow

### 7.1 Folder layout [V from `src/features/*`]

The existing reports code lives in `src/components/reports/**` (older location). Newer modules live in `src/features/<kebab-name>/`:

| File / folder | Role | Seen in |
|---|---|---|
| `<name>Model.ts` | pure types + logic, no React, unit-testable | 17 features |
| `<name>Service.ts` | data access wrapping the generated client; snake_case in and out | 19 features |
| `use<Name>.ts` / `hooks/` | React Query hooks; exported key factory (e.g. `timeClockKeys = { all, active(id), range(q), config(id) }`) | root-level hook file in 7 features; `hooks/` folder in imaging, messaging, sms |
| `<Name>Page.tsx` | route component (no shell; the route wraps it in `AdminPageWrapper`) | most |
| `components/` | feature-local components | auth, imaging, messaging, sms, time-clock |
| `<name>Print.ts` / `<name>Pdf.ts` | jsPDF builders | 12 features |
| `__tests__/*.test.ts` | vitest on the pure model | office-scope, procedures, time-clock |
| `index.ts` | barrel of the public surface | 11 features |
| `transport/` (`api` vs `local`) | env-switched real / simulated backend | appointnow, messaging, sms |

Best single reference: `src/features/time-clock/` (model, service, hook, access, print, page, report page, tests, barrel) and `src/features/office-scope/` (pure model + tests + barrel).

### 7.2 Data access rules [V project `CLAUDE.md` + code]

| Rule | Detail |
|---|---|
| Backend first | search `openapi.json` and `src/api/generated/**` for an endpoint before writing client logic; sync with `npm run api:sync` (per project notes the dev backend runs without `--reload` — restart it before syncing) |
| Generated client only | import functions / hooks from `@/api/generated/endpoints/<tag>/<tag>` and types from `@/api/generated/model`; no raw axios |
| Never edit generated files | CI fails on drift |
| snake_case binding | state, form keys, params, column keys and saved-filter keys use the backend names (`office_id`, `provider_id`, `date_from`, `date_to`, `office_group_id`); no camelCase aliases or mapping layers. React components PascalCase, hooks `useX`, helper functions camelCase |
| List paging | `size` max 200; envelope `{ items, meta }` |
| Office | explicit spread (`officeFilter` / `homeOfficeFilter` / `allOfficesParam`), never `null`, never an interceptor |
| Providers | through `providerDirectory` / `useProviderDirectory`; label `Name (ID)` |
| Query keys | Orval keys are `[url, params]`; hand-written keys use a per-feature factory; the existing reports use `["reports","run",id,filters]` and `["reports","ref","offices"]` (the latter is invalidated by `invalidateOfficeOptions()`) |
| Cancellation | generated functions accept `signal`; pass React Query's `signal` through |
| Money | decimals arrive as strings on CRUD reads and as JSON numbers on `/reports/*`; no decimal library — do not sum money in the browser for authoritative totals |
| Timestamps | naive `created_at` / `updated_at` are UTC → `parseServerDateTime`; date-only values are formatted from parts |
| Errors | envelope `error.code` / `error.message` / `error.details` |
| Backend gaps | recorded in `backend_devreport.md` (root) and per-module `docs/<module>/*_backend_devreport.md` with gap ids (pattern `REPORTS-G1`, `TC-BE-4`, `OFF-SCOPE-8`); answers arrive as `*_backend_response.md` |
| Large renames | flag before doing them |

### 7.3 UI conventions [V]

| Topic | Convention |
|---|---|
| Styling | Tailwind utilities with literal hex colours (`text-[#1F3A5F]`, `border-[#E2E8F0]`); tokens in `src/styles/theme.ts`; fonts Inter / Poppins from Google Fonts (`globals.css` L2) |
| Icons | `lucide-react`; store icon **keys**, not components, when data is serialised |
| Helper placement | pure helpers in `.ts` files so fast refresh stays component-only (`react-refresh/only-export-components` is a warning) |
| Feedback | `toast.success` / `toast.error` / `toast.warning` |
| Honest gaps | show "Awaiting backend" (`WidgetCard.awaitingBackend`) or a labelled simulation — never mock data |
| Zoom | §2.5 |
| StrictMode | effects run twice in dev; start server work from user events or mutations, not mount effects [I] |

### 7.4 Verification gates [V]

| Gate | Command | Notes |
|---|---|---|
| Types | `npx tsc -b` | root `tsconfig.json`; does not cover `e2e/` or `vite.config.ts` |
| Lint | `npx eslint` (`npm run lint` = `eslint .`) | errors block; warnings do not |
| Unit | `npm test` (`vitest run`) | 9 files today: `src/features/office-scope/__tests__/*` (6), `src/features/procedures/__tests__/multiTooth.test.ts`, `src/features/time-clock/__tests__/timeClockModel.test.ts`, `src/components/setup/insurance/__tests__/feeScheduleWizardModel.test.ts`; none for reports |
| Build | `npm run build` (`tsc -b && vite build`) | — |
| E2E | `npm run e2e` | needs the backend on `:8000` and the dev server on `:5173` |
| CI | lint + API drift + build, only on `feature/phase_data_migration` | not on the current branch; no tests |

### 7.5 E2E conventions (`e2e/**`, `playwright.config.ts`) [V]

| Item | Detail |
|---|---|
| Config | `testDir ./e2e`; `fullyParallel`; `timeout 60_000`; `expect.timeout 10_000`; `toHaveScreenshot { maxDiffPixelRatio 0.02, animations "disabled" }`; snapshots `e2e/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}` (committed); `trace on-first-retry`, `screenshot only-on-failure`, `video retain-on-failure`; project `chromium` only |
| Web server | `npm run dev` at `http://localhost:5173`, `reuseExistingServer` outside CI |
| Auth | `e2e/global-setup.ts` logs in once through the real form (selectors `getByLabel('Username or Email Address')`, `getByLabel('Password', { exact: true })`, `getByRole('button', { name: 'Sign In' })`), waits for `/dashboard`, saves `e2e/.auth/state.json` (git-ignored); credentials and URL from `E2E_USERNAME`, `E2E_PASSWORD`, `E2E_BASE_URL` |
| Specs | `e2e/auth.spec.ts` (2 tests, unauthenticated via `test.use({ storageState: { cookies: [], origins: [] } })`), `e2e/smoke.spec.ts` (3 tests: dashboard desktop + mobile visual, scheduler renders); 3 baselines |
| Accessibility | `checkA11y(page, testInfo, { disableRules?, include? })` in `e2e/support/axe.ts` — WCAG 2.1 A / AA, fails on serious / critical only; `color-contrast` is disabled in the dashboard smoke test |
| Style | role / label selectors; bounded `waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})` because the app polls; assert no `pageerror` |
| Data | no API mocking (`page.route` unused) → tests depend on live backend data |
| AI authoring | Playwright MCP server in `.mcp.json`; specs are meant to be authored from the playbook |
| Dev-server landmine | `npm install` while the dev server runs → blank app with "504 Outdated Optimize Dep"; restart the server (project notes) [I] |

### 7.6 Manual QA playbook (`docs/qa/DentC_E2E_Test_Workflows.html`) [V]

| Item | Detail |
|---|---|
| Form | standalone HTML, data-driven: `const WORKFLOWS = [...]` (L308), `PHASES` 0-6 (L292-300), `GAPS` map (L1031), results in `localStorage` key `dentc_e2e_results_v1` (L1111), JSON / CSV export |
| Step helpers | `S(action, path, expected, opts)` plain, `U` setup, `T` trace (setup → module), `G` gap, `N` negative (L301-306) |
| Size | 38 workflow ids (`WF-00` … `WF-36` + `WF-26A`); roles `owner`, `admin`, `manager`, `front_desk`, `doctor`, `hygienist`, `billing`, `patient` |
| Reporting workflows | `WF-29` Dashboard (L902-915), `WF-30` "Reports — all six reports, filters, exports, saved views" (L917-934, 12 steps incl. gap `DASH-3` AR / aging) |
| Rule | extend this file (workflows + `GAPS`), bump the document version; do not fork a second playbook |
| Staleness | version 1.0 dated 2026-09-02 — its "what the UI enforces" table predates office-membership enforcement and the rights module |

---

## 8. Cross-cutting gaps and risks for the Reports module

| # | Gap / risk | Basis |
|---|---|---|
| R1 | No grid, virtualisation, XLSX, date, DnD or layout library → the report builder, pivot / trailing-12-month grids and dashboards need library decisions before estimation | [V] §1.3 |
| R2 | No code splitting: a large analytics module (charts, grid, builder) lands in the single app chunk and `chart-vendor` unless `React.lazy` is introduced (first use in the app) | [V] §2.3; impact [I] |
| R3 | No error boundary and no not-found route: one failing chart or an unknown report key blanks the screen | [V] |
| R4 | Global `!important` form CSS and the 0.75 zoom make third-party grid / date-picker / chart components look or position wrong until themed and verified | [V] rules; impact [I] |
| R5 | Report gating has no enforcement path today: FE rights are dark, backend rights never gate reads, kept report rights are unreferenced, and rights for Recall / Ortho / Labels / Postcards / Excel / scheduled reports were deleted | [V] §5 |
| R6 | Office-set, office-group and all-office scope cannot be expressed against the existing `/reports/*` roll-ups, the transaction feed or the scheduler feed; provider / user / carrier sets cannot be expressed anywhere | [V] §3.2, §4.4 |
| R7 | The read-scope UI model has no "group" or arbitrary "office set" mode; "My offices" is still client-filtered | [V] §3.4 |
| R8 | Saved views / favourites in `localStorage` are wiped on logout and session expiry; no server model is wired | [V] §6.4 |
| R9 | No token refresh + no axios timeout: long report requests risk a mid-run 401 → forced logout (and R8) | [V] code; effect [I] |
| R10 | Report "Print" uses `dataurlnewwindow`, which the production CSP probably blocks | [I] §2.8 |
| R11 | Charts cannot be embedded in client PDFs (no rasteriser); no print stylesheet | [V] absence; [I] |
| R12 | Double error surfacing (global toast + local state) and automatic `retry: 1` on heavy report queries | [V] `queryClient.ts`; impact [I] |
| R13 | FE / server privilege mismatch for composite role strings (`office_manager`, `org_owner`) on "All offices" | [V] code; occurrence [I] |
| R14 | Browser "today" vs office timezone; three hand-rolled date-helper sets | [V] §3.3, §6.1 |
| R15 | Test and CI coverage is thin: no component-test tooling, no report tests, CI not running on the working branch, e2e depends on live shared data | [V] §7 |
| R16 | Nav cannot show a three-level legacy Reports tree and menus are hard-coded arrays, so a catalog-driven menu needs nav changes | [V] §2.4 |
| R17 | Stale comments / docs in the office-scope area can mislead implementers (§3.6) | [V] |

---

## 9. Plug-in checklist for the new module [I]

| Concern | Use | Avoid |
|---|---|---|
| Location | `src/features/reports/` (+ `src/features/analytics/` if split) with model / service / hooks / components / `__tests__` / `index.ts` | growing `src/components/reports/**` |
| Routes | one nested `/reports/*` layout route (pattern: patient shell + `<Outlet>`), lazy-loaded, with not-found + `<AccessDenied>` states; keep `/reports/run/:reportId` redirects | more per-report `<Route>` lines and placeholders |
| Menu | generate the Reports dropdown from the catalog; filter with the `filterNavByRights` pattern; keep it ≤ 2 levels or replace it with a catalog page + search | a third nav level |
| Office criterion | `useOfficeScope()` + `useOfficeOptions()` + `listOfficeGroups`; send `office_id` / `office_ids` / `office_group_id` / `all_offices` explicitly; clamp to `allowed_office_ids` / `can_view_all_offices`; badge rows with `<OfficeBadge>` | interceptors, `office_id: null`, client-side office filtering |
| Provider criterion | `useProviderDirectory` + grouped options + `providerOptionLabel` | `fetchProvidersForOffice` / `scopeToOffice`, the `office_id` scalar |
| Rights | `useRights()` / `<RequireRight>` with codes added to `RIGHT`; expect them to be inert until the kill-switch flips; rely on server 403 for real enforcement | role string comparisons |
| Layout | `var(--vh)`, `--app-nav-height`, `uiZoom` helpers, per-grid scroll container | raw `vh`, `getBoundingClientRect` into styles, `body` overflow |
| Controls | class-qualified compact rules (the `tx-select` approach) | assuming Tailwind utilities override the global form CSS |
| Output | `openServerReport` + blob endpoints; client fallback via `bloburl` + `autoPrint`; `downloadAsset` for stored files | `window.print()`, `dataurlnewwindow` |
| Persistence | server-side (new report tables, or `/users/me/preferences` as an interim) | `localStorage` for anything the user expects to keep |
| Async runs | job contract like `UtilityRunRead` + polling (`refetchInterval`), optional push over the messaging WebSocket, `/users/me/notifications` for completion | long synchronous GETs |
| Tests | vitest on pure models (range resolution, param validation, definition parsing); a Playwright spec per report family; extend `WF-30` | a second playbook |
| Docs | `docs/reports/…_backend_devreport.md` with gap ids; update the stale items in §3.6 when touched | undocumented client-side workarounds |

---

## 10. Open questions

1. Which libraries may be added (data grid, virtualisation, date library, DnD / grid layout, XLSX) — or must everything be built in-house on the current stack?
2. Should the new module adopt the dormant shadcn / Radix kit (`ui/popover`, `ui/command`, `ui/calendar`, `ui/table`, `ui/tabs`) or follow the hand-rolled house style used everywhere else?
3. Will report access be enforced through the rights catalog — re-adding the removed codes (Recall, Ortho, Labels, Postcards, Excel, scheduling) and adding new ones (builder, schedule, export, dashboards) — and when does `RIGHTS_ENFORCED_DEFAULT` flip? Will the backend start gating report **reads**?
4. Is "Office Group" a first-class report scope (new `ReadScope` mode + picker), and should Setup ▸ Office Groups be restored to the nav so groups can be maintained?
5. Should `UserRead.report_access_provider_id` (legacy "Report Access Provider") restrict provider users to their own production in reports and scorecards?
6. Where do saved views, favourites, schedules and dashboard layouts live — dedicated report tables or the existing `/users/me/preferences` blob as an interim?
7. Is a silent token refresh (and an axios timeout policy) in scope, given long-running reports?
8. Is introducing route-level code splitting and an error boundary acceptable as part of this module, since both would be firsts for the app?
