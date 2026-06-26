# Reckon Dental PMS (dentc-frontend) — End-to-End UI Test & Application Assessment

**Role:** Senior QA Testing Engineer
**Build under test:** branch `feature/phase_data_migration`
**Frontend:** Vite 7 + React + react-router-dom, dev server `http://localhost:5173`
**Backend:** FastAPI/Orval client, `http://127.0.0.1:8000` (running during test)
**Test account:** `udayk` (System Administrator, Org "Exl Dental of Moon Township", Office "Cranberry Dental Arts" [id 9])
**Date:** 2026-06-25

> **Methodology.** Findings come from three complementary sources:
> 1. **Live testing** — logged into the running app and exercised core journeys (auth, dashboard, scheduler, patient context, reports, utilities, setup) via the in-browser preview, capturing console errors, network failures, and rendered DOM.
> 2. **Static route/UI analysis** — full route map from `src/App.tsx` and the navigation components.
> 3. **Backend gap corpus** — 27 existing per-module `*_backend_devreport.md` files under `docs/**`, which already enumerate API/data-model gaps confirmed against the live backend.
>
> Each finding is tagged **[LIVE]** (observed running), **[CODE]** (verified by reading source/routes), or **[DOC]** (sourced from a devreport). The app is large (~60 implemented screens + ~60 "Coming Soon" placeholder routes); this report covers every module group, with representative live verification rather than a click of all 120+ routes.

---

## 1. Executive Summary

### Overall application health: **Functional core, broad placeholder perimeter, backend-gapped depth**

The application is a feature-rich multi-tenant dental Practice Management System. The **core daily-driver workflows are implemented and working** — login, dashboard, scheduler, patient context shell, clinical charting (restorative/perio), transactions/ledger, treatment plans, prescriptions, lab tracking, imaging, and an extensive Setup area. These render against the real backend with live data.

However, three structural realities cap production-readiness:

1. **A large "Coming Soon" perimeter.** Roughly **60 routes render the `PlaceholderPage` ("Coming Soon")** — essentially the *entire* Utilities module (claims batching, eligibility, contract-charge generation, PGID tools, office-specific tools, ticklers/timeclock), most Reports sub-reports, and several Setup extras. These are navigable from menus but have no functionality.

2. **Implemented ≠ backend-complete.** The 27 devreports document that even "finished" modules lean on missing/under-spec backend endpoints (no aggregation/trends/AR/export APIs, soft-delete-only deletes, repurposed `definitions` tables standing in for absent resources, phantom paths, etc.). Much business logic is computed **client-side** as a stopgap.

3. **Navigation/runtime defects in the shipped surface.** Several patient nav icons point at routes that do not exist (blank screens), an AI-chat WebSocket retries forever and floods the console, the scheduler can hang on "Loading operatories…", and large lists load unvirtualized.

### Estimated completion (by route, not effort)

| Layer | Implemented | Placeholder / Broken | Approx. complete |
|---|---|---|---|
| Authentication | 5 | 0 | ~95% (forgot/reset/legacy backends 404 — [DOC]) |
| Global modules (Dashboard/Scheduler/Patient/Reports) | 5 | Reports sub-reports (11), Utilities (33) | Core ~80%, Utilities ~0% |
| Patient clinical (15 modules) | 15 | 5 dead nav links + 4 patient placeholders | ~75% frontend, backend-gapped |
| Setup (~35 screens) | ~30 | ~12 placeholders | ~70% |
| **Whole app (route-weighted)** | **~60** | **~60** | **~50–55% of routes; ~70–75% of core-workflow surface** |

### Major findings (headline)
- **[Critical]** None that crash the whole app. The app is stable end-to-end on the happy path.
- **[High]** 5 patient-shell nav links lead to **nonexistent routes → blank content** (Letters, Messages, SMS/Email, Referrals, Members); "Recent" collides with the `:patientId` route param.
- **[High]** **AI Chat WebSocket** reconnect storm — hundreds of console errors per session, no backoff cap, runs on every screen.
- **[High]** Entire **Utilities module** and most **Reports sub-reports** are non-functional placeholders behind live menu items.
- **[Medium]** Scheduler stuck on **"Loading operatories…"** on direct navigation; office shows raw code (`OFF-9`) before the offices list resolves.
- **[Medium]** **No code-splitting** — `App.tsx` eagerly imports every screen; cold first paint ~15s, and large lists (1113 procedure codes) render unvirtualized.
- **[Medium/High]** Pervasive **backend gaps** (per 27 devreports): no reporting/aggregation/export APIs, soft-delete semantics, repurposed definition tables, missing per-entity endpoints.

### Development readiness assessment
**Not production-ready as a whole**, but the **core clinical + front-office workflow is demo/pilot-ready** with the fixes in §6.1–6.2. The gating work is (a) removing or hiding non-functional menu entries, (b) closing the navigation defects, (c) the backend endpoints catalogued in §5, and (d) performance hardening.

---

## 2. Phase 1 — UI Testing Plan

### 2.1 Application module inventory

**Authentication (public):** Login, Forgot Password, Reset Password, Legacy Account Activation (4-step wizard), Sign Up.

**Global (authenticated, GlobalNav):** Dashboard, Scheduler, Patient (search/landing), Add New Patient, Reports (+ Lists/Interactive/Office sub-reports), Utilities (7 sub-groups), Setup (12 sub-groups), Help, My Page, Logout, Organization/Office switcher, global AI Chat assistant.

**Patient context shell (`/patient/:patientId/*`, PatientSecondaryNav 27 actions):** Overview, Transaction Entry, Account Ledger, Patient Ledger, Insurance (Dental ×4 / Medical ×3 slots), Restorative chart, Perio chart, Imaging (X-Ray), Progress Notes (list/editor), Patient Notes (list/add/edit/view), Treatment Plans, Prescriptions, Lab Tracking, Documents, Emergency Contacts, Claim Detail, Payment Plans (regular/ortho — placeholder), Insurance Forms (placeholder); nav-only actions: New Patient, New Member, Recent, Search, Search RP, Letters, Messages, SMS/Email, Referrals, Websites, Members, Print.

**Setup:** Account Info; Offices (Office Setup, Office Assignment, Vendor API ×2); Office Groups (Manage, Assign); Tenant; Security (Users, Groups, Change My Password); Providers (Provider Setup, Per-Office Settings); Insurance (Dashboard, Plans, Custom Coverage, Dental/Medical Carriers, Employers, Employees); Referrals (Sources, Custom Demographics); Procedure Codes (Codes, Explosion, ICD, Modifier, Place/Type of Service, CDT↔CPT↔ICD maps); Fee Schedules (Setup, Assignments); Charting (Colors, Materials, Perio Templates); Medical (Alerts, Medical Q, Dental Q); Pick List (Manage, Custom); Custom Toolbar; Prescriptions; Notes Macros; Scheduler (View, Template).

### 2.2 User workflows / navigation paths to validate
- **Auth:** login success/failure, remember-me, forgot→reset, legacy activation, logout, route guards (unauth → `/login`).
- **Front office:** dashboard KPIs → scheduler → new appointment → patient search → open patient → overview.
- **Clinical:** patient → restorative chart add/edit condition; perio exam entry; progress note create/sign; treatment plan add/print; imaging upload/associate tooth; prescriptions add/print.
- **Financial:** transaction entry (procedure/payment/adjustment) → account ledger running balance → claim creation/detail; insurance plan add/edit.
- **Setup CRUD:** for each setup resource — list/search/filter, create, edit, (soft) delete, validation.
- **Cross-cutting:** office/org switch, state persistence across refresh, persistent patient resume.

### 2.3 Test scenario checklists (applied per screen)
- **Functional:** features work; forms submit; CRUD persists & reloads; validation enforced; correct navigation; error handling present.
- **UI/UX:** layout/alignment/spacing consistency; typography; icons; loading states; empty states; success/error toasts; responsive (desktop primary); accessibility (labels, focus, contrast, keyboard).
- **Navigation:** every menu item, tab, button, link, modal, popup reachable and wired; no dead/orphan targets.
- **Backend:** request fires, correct method/path, snake_case mapping, 2xx, data mapped to UI, persistence, auth headers, performance, network-failure handling.
- **State/Edge:** refresh resilience, deep-link/direct-URL load, empty datasets, large datasets, concurrent edits, pagination caps (size ≤ 200).

---

## 3. Phase 2 — Module-by-Module Results

Legend: **✅ Complete (frontend)** · **🟡 Partial / backend-gapped** · **🔴 Placeholder / broken**

### 3.1 Authentication — 🟡 (frontend ✅, some backends 404)
- **[LIVE]** Login page renders cleanly ("Reckon Dental PMS"), username/password/remember-me/forgot/Sign In/Activate Legacy. Login as `udayk` **succeeds** → `/dashboard`; tokens (`access_token`, `refresh_token`, `current_org`, `current_office`, `me_full`) persisted.
- **[CODE]** Route guards correct (`isAuthenticated` redirects to `/login`; authed users bounced from `/login`).
- **[DOC]** Forgot/Reset and Legacy verify+create backends return **404** (see `docs/authentication/`). The wizard UI exists but cannot complete server-side.
- **Issue:** pre-auth dashboard prefetch fires authenticated calls on `/login` → `401` (see BUG-005).

### 3.2 Dashboard — 🟡
- **[LIVE]** Renders with live data: Today's Appointments KPIs (Total 5 / Checked-in 0 / Scheduled 4 / Completed 1 / Cancelled 0 / No-shows 0), patient/revenue widgets, quick actions, schedule, activity.
- **[DOC]** **No backend aggregation endpoints** — all KPIs computed client-side from list endpoints (`docs/dashboard/`). Acceptable now; will not scale.

### 3.3 Scheduler — 🟡
- **[LIVE]** Toolbar (Prev/Today/Next, Day/Week/Month, New Appointment), full status & provider/operatory filters, time grid render. Scheduler feed endpoint (`/appointments/scheduler`) is the denormalized feed (good — killed N+1 per memory).
- **[LIVE] BUG-002:** On direct navigation/refresh, **"Loading operatories…" never resolves** (no operatory request observed) → grid has no columns/appointments. Office header shows raw code **"OFF-9"** instead of "Cranberry Dental Arts".
- **[DOC]** Print backend + inline-validation polish pending (`docs/scheduler/`).

### 3.4 Patient search / context shell — 🟡
- **[LIVE]** `/patient/:id/overview` loads rich data (demographics, balance $165.32, chart#, insurance, RP, members, appts, recalls). Restorative chart loads (143 tooth/glyph SVGs). Shell works for valid routes.
- **[LIVE] BUG-001 (High):** PatientSecondaryNav has **5 links to nonexistent routes** → blank/stuck screen: **Letters** `/letters`, **Messages** `/messages`, **SMS/Email** `/communication`, **Referrals** `/referrals`, **Members** `/family`. **"Recent"** navigates to `/patient/recent`, which matches `:patientId` → loads the shell with bogus patient id "recent".
- **[CODE] BUG-003:** Three nav buttons are `alert("… Coming Soon")` stubs: **Websites**, **Print**, **Search RP**.
- **[DOC]** Persistent-patient resume implemented (`dentc:last_patient:<userId>`); backend gaps PDP-1..5.

### 3.5 Patient clinical modules — ✅ frontend / 🟡 backend (per devreports)
| Module | State | Notes |
|---|---|---|
| Restorative chart | ✅ **[LIVE]** | Anatomical SVG teeth, surfaces, palette; writes to `chart-conditions`/`patient-procedures`. Delete = **soft-delete**. |
| Perio chart | 🟡 [DOC] | Legacy layout, perio-exams; gaps PERIO-1..7. |
| Treatment Plans | 🟡 [DOC] | TID=plan record, Print report client-side; Consent/Letters = gap; PLAN-1..8. |
| Progress Notes | 🟡 [DOC] | Editor + macros + signature; notes never deleted (strike-off); PN-1..7. |
| Prescriptions (patient) | 🟡 [DOC] | Library-driven; print client-side; RX-P1..5. |
| Lab Tracking | 🟡 [DOC] | "Lab case" = appointment fields; no vendor/report endpoints; LAB-1..5. |
| Imaging (X-Ray) | 🟡 [DOC] | Persists via patient-documents; device boundary env-gated off; IMG gaps. |
| Patient Insurance | 🟡 [DOC] | 6 slots over `patient_insurance`; INS-PT-1..6. |
| Account Ledger / Transactions | 🟡 [DOC] | Color-coded ledger, running balance; **ledgerApi raw-axios + ~17 phantom paths** (charge save/code lists 404); refunds/statements gaps; CHG-1..6. |
| Notes / Documents / Emergency / Claim | ✅/🟡 | Wired; PLAN-8 patient-documents list returns empty. |

### 3.6 Reports — 🟡 core / 🔴 sub-reports
- **[LIVE]** Executive dashboard renders: date ranges (Today…Custom), **Export CSV/PDF/Excel** buttons, client-side analytics (self-documents "no backend trends API yet, slow on large ranges").
- **[CODE/🔴]** All **Lists** (Patient/RP/Provider/Security/Setup), **Interactive** (Unsigned Progress Notes, Eligibility), and **Office** sub-report routes render `PlaceholderPage`.
- **[DOC]** No backend reporting/aggregation/export endpoints; AR/aging/export are gaps.

### 3.7 Utilities — 🔴 (essentially unimplemented)
- **[LIVE/CODE]** **All ~33 Utilities routes render "Coming Soon"** — Generate Contract Charges (3), Batch & Claims (6: eClaims, paper/med, management, batch eligibility, close-out managed care, referral mgmt), Insurance/Procedure tools (5), PGID (4), Office-Specific (8), User Functions (Tickler/Timeclock/Editor — confirmed "Coming Soon" live), Launch (4). Menu entries are live but lead nowhere functional.

### 3.8 Setup — 🟡 (most CRUD ✅; several placeholders)
- **[LIVE]** Procedure Code Setup loads **1113 codes** (Total 1113 / Active 1112 / Inactive 1 / 4 categories), KPI strip, filters, sort, Add Code. Functional but **slow & unvirtualized** (renders ~750+ rows; loads all pages at 200/page before display) — see BUG-006.
- **[DOC] Implemented CRUD:** Account Info, Office Setup, Office Assignment, Office Groups (manage), Users, Groups, Change Password, Providers, Insurance (Carriers/Plans/Coverage/Fee Schedules/Assignments/Dashboard/Employers), Procedure Codes (+ Explosion/ICD/Modifier/POS/TOS), Charting (Colors/Materials/Perio Templates), Referrals, Pick List, Notes Macros, Medical (Alerts/Med-Q/Dental-Q), Prescriptions, Custom Toolbar, Tenant.
- **🔴 Placeholders:** Vendor API Settings ×2, Office Groups → Assign, Providers → Per-Office Settings, Insurance → Employees, Referrals → Custom Demographics, Procedure Codes → CDT/CPT/ICD maps ×3, Pick List → Custom, Scheduler → View/Template ×2.
- **[DOC] Common Setup patterns to note:** several modules **repurpose `definition-groups`/`definitions`** in lieu of dedicated backend resources (Medical alerts/questionnaires, Custom Toolbar, some Pick List) — convention-based `group_type` filtering; start empty (no seed). Many deletes are **soft-deletes**. "Modified By" often shows an **id, not a name**.

---

## 4. Bug Report

> Severity: **Critical** (crash/data-loss/blocker) · **High** (broken feature/journey) · **Medium** (degraded UX/perf) · **Low** (cosmetic).

### BUG-001 — Patient nav links to nonexistent routes render blank — **High** — Functional/Navigation — [LIVE/CODE]
- **Module/Screen:** Patient context shell · `PatientSecondaryNav`
- **Repro:** Open any patient → click **Letters / Messages / SMS/Email / Referrals / Members**.
- **Expected:** The corresponding feature screen.
- **Actual:** Navigates to `/patient/:id/{letters|messages|communication|referrals|family}` — none exist as nested `<Route>`s in `App.tsx`, so the `<Outlet/>` renders nothing (content area blank; one case observed stuck on "Loading patient…").
- **Root cause:** Nav items declare `path:` segments with no matching route; no catch-all/redirect inside the patient shell.
- **Fix:** Either implement the screens, or remove/disable the icons, or add a nested 404/redirect. Add a `*` child route under the patient shell.

### BUG-002 — Scheduler stuck on "Loading operatories…" on direct load — **High** — Functional — [LIVE]
- **Repro:** Navigate directly to `/scheduler` (or refresh on it).
- **Expected:** Operatory columns + appointments.
- **Actual:** Perpetual "Loading operatories…"; no operatory request fired; office shows code `OFF-9`.
- **Root cause (suspected):** Operatory load depends on a resolved numeric office context that isn't hydrated from `localStorage` (`current_office = "OFF-9"`) on direct/refresh load before the offices list resolves.
- **Fix:** Resolve office id from persisted context before fetching operatories; add an empty/error state instead of infinite spinner.

### BUG-003 — Dead "Coming Soon" alert buttons in patient nav — **Medium** — Underdeveloped — [CODE]
- **Screen:** `PatientSecondaryNav` — **Websites**, **Print**, **Search RP** call `alert("… Coming Soon")`.
- **Fix:** Implement or hide; replace `alert()` with proper UI affordance.

### BUG-004 — AI Chat WebSocket reconnect storm — **High** — Functional/Perf — [LIVE]
- **Repro:** Any authenticated screen.
- **Actual:** `aiChatWebSocket.ts` fails to connect and retries continuously; **240+ console errors within a couple of screens** ("WebSocket connection error / Reconnection failed"). Floods console, hides real errors, wastes CPU/network.
- **Root cause:** No reachable WS endpoint in this environment; reconnect loop lacks a max-attempt/backoff cap and no feature flag to disable.
- **Fix:** Exponential backoff + max attempts; disable when WS URL unset/unreachable; gate the assistant behind a feature flag; downgrade logs.

### BUG-005 — Authenticated API prefetch on the login page → 401 — **Medium** — Functional — [LIVE]
- **Repro:** Load `/login` while unauthenticated.
- **Actual:** Dashboard/widget queries (`/offices`, `/patient-recalls`, `/patient-procedures`, `/patient-payments`, `/appointments/scheduler`, `/patients`) fire and return **401**; console logs "Error fetching offices count".
- **Root cause:** Eager data hooks / query prefetch run before the auth gate.
- **Fix:** Gate all authed queries on `isAuthenticated`; don't mount dashboard data hooks on public routes.

### BUG-006 — Unvirtualized large lists / load-all pagination — **Medium** — Perf — [LIVE]
- **Screen:** Procedure Code Setup (and likely Insurance Plans 31k per memory, fee schedules).
- **Actual:** Loads all pages (size ≤ 200 each → ~6 sequential calls for 1113 codes) then renders ~750+ rows into the DOM at once; multi-second load, heavy DOM.
- **Fix:** Server-side search/pagination in the grid; virtualize rows. (Insurance Plans already server-paginates per memory — apply the same pattern.)

### BUG-007 — No route-level code splitting; ~15s cold first paint — **Medium** — Perf — [LIVE/CODE]
- **Detail:** `App.tsx` statically imports **every** screen/feature. Initial load transforms the entire module graph (hundreds of modules) before first paint (~15s cold in dev; large prod bundle).
- **Fix:** `React.lazy` + `Suspense` per route group; the `Suspense` wrapper is already imported but unused for routes.

### BUG-008 — Office name shows raw code before offices list resolves — **Low/Medium** — UI — [LIVE]
- **Detail:** On direct load/refresh, the Org/Office switcher and page headers briefly (or persistently, on Scheduler) show `OFF-9` instead of "Cranberry Dental Arts". Inconsistent across pages depending on query timing.
- **Fix:** Render a skeleton until the offices list resolves; never display the raw code.

### BUG-009 — "Recent" patient action collides with `:patientId` — **Medium** — Navigation — [CODE]
- **Detail:** `navigate("/patient/recent")` matches `/patient/:patientId/*` with `patientId="recent"` → patient shell tries to load patient "recent".
- **Fix:** Use a reserved, non-colliding route (e.g. `/patients/recent`) or a modal.

### BUG-010 — Backend-gap-driven failures in shipped screens — **High (aggregate)** — Missing Features/Backend — [DOC]
- **Detail:** Multiple "complete" screens call endpoints that 404 or don't exist: e.g. **Account Ledger / Transactions** `ledgerApi.ts` uses raw axios with **~17 phantom paths** (charge save / code lists 404) — see `docs/transactions/`. Forgot/Reset/Legacy auth backends 404. See §5.
- **Fix:** Per §5 backend catalog; migrate `ledgerApi` to the generated client (already identified as the first transactions PR).

---

## 5. Backend Gap Report (synthesized from 27 devreports)

> Authoritative detail lives in each `docs/<module>/*_backend_devreport.md`. Summary of the **classes** of gaps and the highest-impact missing endpoints.

### 5.1 Missing API surface (no endpoint exists)
- **Reporting/Analytics:** no aggregation, trends, AR/aging, or export endpoints (Dashboard, Reports). All KPIs/trends computed client-side. *(docs/dashboard, docs/reports)*
- **Utilities (entire module):** no backends for batch claims/eClaims, eligibility, contract-charge generation, PGID conversions, office-specific tools, tickler/timeclock.
- **Transactions/Ledger:** refunds, statements, office-summary, audit-history; `ledgerApi` phantom paths for charge save/code lists. *(docs/transactions, docs/account-ledger — AL-1..8, CHG-1..6)*
- **Lab Tracking:** no `/labs` resource, no vendor field/list-filter/report endpoints (data piggybacks on appointment fields). *(LAB-1..5)*
- **Office↔Group membership:** no membership model (Assign Offices to Groups disabled). *(office_assignment devreport #18)*
- **Provider per-office settings, schedules, holidays, watermarks, referral-offices, carrier-login, user-link** — no models. *(provider_setup #20)*
- **Auth extras:** forgot-password, reset-password, legacy verify+create → 404. *(docs/authentication)*

### 5.2 Resources repurposed / convention-based (fragile)
- **Medical Alerts/Questionnaires, Custom Toolbar, parts of Pick List** repurpose `definition-groups`/`definitions` via `group_type` conventions (MEDALERT/MEDQUEST/DENTQUEST/TOOLBAR). No dedicated tables; start empty/unseeded. *(docs/pick-list consolidated report, custom-toolbar)*
- **Patient Imaging** stores binaries via `patient-documents`; imaging metadata tables joined by `tile_id=String(doc.id)`. *(docs/imaging)*

### 5.3 Data-model / mapping inconsistencies
- **No `id` on some reads** (e.g. `ProcedureCodeRead` — `item_id` is the `code`; locked on edit). *(procedure-codes)*
- **Insurance Plans have no name**; 31k rows force server pagination + entity-picker filters. Search-by-name not live in backend. *(insurance INS-9/10)*
- **"Modified By/Updated By" returns an id, not a name** in several modules (Charting CHART-1a, Prescriptions RX-1).
- **Codes-as-labels:** Notes Macro category seeded as numeric codes, not labels (NM-2); referral_type is a code ("0"/"1").

### 5.4 Delete / persistence semantics
- **Soft-delete only** in several modules (chart-conditions `is_inactive`, fee-schedule DELETE = soft-delete FEE-1, progress notes strike-off, prescriptions PATCH is_active:false). UI "delete" does not hard-delete — verify this is intended and labeled.
- **patient-documents list returns empty** even after upload (PLAN-8) — affects Treatment Plan "Save PDF to Notes" and Documents tab.

### 5.5 Validation / auth
- Inline validation polish pending in Scheduler and elsewhere.
- Pre-auth queries hit protected endpoints (401) — see BUG-005.
- Pagination `size` capped at **200** — clients must page; some grids load-all (perf, BUG-006).

---

## 6. Development Roadmap (prioritized)

### 6.1 Critical fixes (do first — cheap, high-impact, frontend-only)
1. **BUG-001 / BUG-009** — Remove or wire the 5 dead patient nav links + "Recent" collision; add a catch-all redirect inside the patient shell so no nav ever yields a blank screen.
2. **BUG-004** — Cap AI-chat WS reconnects (backoff + max attempts), feature-flag the assistant, and silence the error spam.
3. **BUG-002** — Fix Scheduler operatory hydration on direct load + add empty/error state.
4. **BUG-005** — Gate all authenticated queries on `isAuthenticated` (stop 401 prefetch on `/login`).

### 6.2 High-priority functional / UX
5. Hide or clearly badge the **~60 "Coming Soon"** menu entries so users aren't routed into dead ends (especially the entire **Utilities** menu and Reports sub-reports).
6. **BUG-003 / BUG-008** — Replace `alert()` stubs; never show raw office codes (skeleton until offices resolve).
7. **BUG-010** — Migrate `ledgerApi.ts` to the generated client; remove phantom paths (first Transactions PR).

### 6.3 Backend enhancements (unblocks shipped UI)
8. **Reporting/aggregation/export** endpoints (Dashboard + Reports) — replaces client-side aggregation; enables AR/aging/export.
9. **Transactions:** refunds, statements, office-summary, audit-history; fix charge-save/code-list endpoints.
10. **Auth:** forgot/reset/legacy-activation backends (currently 404).
11. Dedicated resources to replace repurposed `definitions` (medical, toolbar, pick-list) and absent models (labs, office-group membership, provider per-office settings).
12. Return **names not ids** for Modified/Updated-By; add plan names / search-by-name where missing.

### 6.4 UI/UX improvements
13. **BUG-006/BUG-007** — Route-level code splitting (`React.lazy`); virtualize/server-paginate large grids (procedure codes, fee schedules).
14. Accessibility pass (labels, focus rings, contrast, keyboard nav on the icon nav strips and grids).
15. Consistent empty/loading/error states (several screens use indefinite spinners with no empty state).

### 6.5 Feature completion (the placeholder perimeter)
16. Utilities module (claims/eligibility/contract-charges/PGID/office-specific) — largest single gap.
17. Reports sub-reports (Lists/Interactive/Office); Insurance Forms; Payment Plans (regular/ortho); Setup map editors (CDT↔CPT↔ICD), Vendor API, Custom Demographics, Scheduler View/Template.

### 6.6 Technical debt
18. Decouple eager imports; reduce the single mega-route file; consolidate duplicate `useDefinitions` hooks (`src/hooks`, `src/shared/hooks`).
19. Confirm/label soft-delete semantics everywhere; reconcile patient-documents empty-list bug.

### 6.7 Future enhancements
20. Real-time scheduler updates; native trends API; device-integration (imaging scan) productionization; print/PDF server-side rendering.

---

## 7. Orphan / dead-surface inventory (quick reference)
- **Dead nav (blank route):** patient Letters, Messages, SMS/Email, Referrals, Members; "Recent" (param collision). *(BUG-001/009)*
- **`alert()` stubs:** patient Websites, Print, Search RP. *(BUG-003)*
- **Placeholder ("Coming Soon") routes (~60):** all of Utilities (33); Reports Lists/Interactive/Office (11); Setup: Vendor API ×2, Office-Groups Assign, Provider Per-Office, Insurance Employees, Referral Custom-Demographics, CDT/CPT/ICD maps ×3, Pick-List Custom, Scheduler View/Template ×2; Patient Payment-Plan regular/ortho, Insurance-Forms dental/medical.
- **Legacy redirects present:** `/patient-overview` & `/patient-ledger` → hardcoded `/patient/12345/...` (dev artifact; 12345 likely invalid — verify/remove).

---

---

## 8. Appendix — Full Patient Lifecycle Walkthrough (live, end-to-end)

A complete new-patient journey was driven live (account `udayk`, office 9 "Cranberry Dental Arts"), with every step verified against the backend API. **Result: the core lifecycle works and persists, but the financial path is broken — estimates come out $0.00.**

| Step | Action | Result | Backend verification |
|---|---|---|---|
| 1. Register | New Patient form (`/patient/new`) — full identity, address, contact, demographics, provider, referral | ✅ Created | `GET /patients/83873` → Quincy Testpatient, DOB 1990-03-15, M, city Cranberry Township, office 9 — **all fields persisted** |
| 2. Appointment | Scheduler → New Appointment wizard → Existing Patient search → select → save | ✅ Created | `GET /appointments?patient_id=83873` → 1 appt, operatory op-9-4 ("255"), provider Arjun, status scheduled |
| 3. Treatment plan | Treatment tab → Diagnostic category → D0150 → Add Procedure → Save | ✅ Created | `GET /treatment-plans?patient_id=83873` → plan `38ef2e6b…` active; item D0150 "Compsve Oral Eval", status diagnosed, diagnosed_by Arjun |
| 4. Estimated bill | Plan totals / estimate | ⚠️ **$0.00** | item `fee=0.00, insurance_estimate=0.00`; **patient `fee_schedule_id=None`** |
| 5. Ledger | Account balance | ✅ (expected) | 0 posted charges, null balance — plan is an estimate, not yet posted to ledger |

### New defects found during the lifecycle

#### BUG-011 — Fee-schedule dropdown uses fake/fallback data → patient saved with no fee schedule → $0.00 estimates — **High** — Functional/Backend — [LIVE]
- **Chain:** `getFeeSchedules()` calls **`GET http://127.0.0.1:8000/fee-schedules?officeId=OFF-9` → 404** (missing `/api/v1` prefix; camelCase `officeId` param — violates snake_case convention). The New Patient form then falls back to **hardcoded fee schedules** ("CP-50", "Standard Fee Schedule", `FS-001`…`FS-007`). The **real** backend fee schedules are numeric ids (`GET /api/v1/fee-schedules` → id 76 "Test UN", 75 "UCB-50", 1 …). The chosen `FS-007` is not a valid id, so the created patient has **`fee_schedule_id = None`**.
- **Impact:** Every downstream fee/estimate is **$0.00** (treatment plan, and would affect transactions/claims). The entire financial estimation path is non-functional for patients created this way.
- **Fix:** Point `getFeeSchedules` (`src/api/feeSchedules.ts`) at the correct `/api/v1/fee-schedules` endpoint with snake_case params; remove the hardcoded fallback list; bind the dropdown to real numeric fee-schedule ids; ensure the selected id persists on the patient.
- **Compounding data gap:** even valid `fee-schedule-entries` for D0150 have `fee = None` in the seed data, so pricing would be 0 even with a correct schedule. Seed real fees to test estimates fully.

#### BUG-012 — Blocking native `alert()`/`confirm()` for save success & errors — **High** — UX/Reliability — [LIVE]
- **Repro:** Save a new patient, or save an appointment → a native `alert("…saved")` fires.
- **Impact:** Blocks the JS/render thread (froze the SPA in testing until the renderer was restarted); also breaks any automation/integration and is poor UX. Used across `AddNewPatient` (`handleQuickSave`, `handleCheckPatient`), appointment save, and patient-nav stubs.
- **Fix:** Replace all `alert()/confirm()` with the existing toast system (`sonner`) and in-page confirm dialogs.

#### BUG-013 — Appointment wizard drops the Date/Time entered in step 1 — **Medium** — Functional/Data integrity — [LIVE]
- **Repro:** In New Appointment, set Date `2026-06-26` + Time `10:00` on the first step, complete the wizard, save.
- **Actual:** Appointment persisted as **`2026-06-25` (scheduler's current date) `09:00`** — the entered date/time is not carried into the final saved record (a second date control later in the flow defaults to "today"/first slot and wins).
- **Fix:** Thread the wizard's initial date/time into the final appointment form, or remove the duplicate date control.

#### BUG-014 — Direct navigation to deep patient routes hangs on "Loading patient…" — **Medium** — Functional/Navigation — [LIVE]
- **Repro:** Hard-navigate/refresh to `/patient/:id/treatment` (or `/scheduler`).
- **Actual:** Shell stuck on "Loading patient…" (and Scheduler on "Loading operatories…") indefinitely; recovers only after a reload or by first landing on `/overview` and navigating in-app. Reinforces BUG-001/BUG-002 — the patient/office context doesn't hydrate on direct/deep loads.
- **Note:** `GET /api/v1/operatories?office_id=9` returns data fine via API and via the appointment modal's own operatory dropdown — so the **Scheduler grid simply never fires the operatory request** (BUG-002 confirmed root cause).

#### BUG-015 — Slow login with no timeout feedback — **Low/Medium** — UX — [LIVE]
- Cold-backend login took ~35s showing only "Signing In…", no spinner timeout or error path. Add a timeout + clearer progress.

### Lifecycle assessment
The **happy-path data flow is solid** — patient, appointment, and treatment-plan records all persist correctly with the right associations (provider, operatory, codes). The **blocking gap is financial**: because the fee-schedule wiring is broken (BUG-011), no fees/estimates resolve, so "give the estimated bill" yields **$0.00**. Fixing BUG-011 (plus seeding real fees) is the single highest-value change to make the lifecycle demo-complete. BUG-012 (blocking alerts) and BUG-013/014 (date carry-over, shell hydration) are the next tier.

> **Test data created (for cleanup):** patient **83873** "Quincy Testpatient", appointment `APPT-8b6c3421…` (2026-06-25), treatment plan `38ef2e6b…` with item D0150.

---

*Prepared from live testing at `localhost:5173` (account `udayk`), the route map in `src/App.tsx`, the 27 module devreports under `docs/**`, and a live end-to-end patient lifecycle verified against the backend API. For per-finding backend detail, see the referenced `*_backend_devreport.md` files.*
