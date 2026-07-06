# Responsive Layout Stabilization — Foundation + Shells

**Date:** 2026-06-25
**Branch:** `feature/phase_data_migration`
**Scope chosen:** Foundation + shells first; graceful (not pixel-perfect) mobile.
**Verified live:** `http://localhost:5173` at 1440×900, 768×1024 (tablet), 375×812 (mobile).

---

## 1. Root cause found

The app rendered a **`fixed` GlobalNav** whose height is **not constant** — it grows as the
top bar and icon sub-nav wrap at smaller widths. Measured live:

| Viewport width | Actual nav height |
|----------------|-------------------|
| 1440px         | **147px**         |
| 768px (tablet) | **167px**         |
| 375px (mobile) | **179px**         |

Every page reserved space with a hard-coded **`pt-[120px]`**. So the nav overlapped page
content by ~27px even on desktop, and by ~47–59px on laptop/tablet/mobile. Worse, the nav was
rendered **13 separate times** from independent entry points, each managing (or forgetting) its
own offset, so the bug manifested differently per screen — including pages with **no offset at
all** and pages with a **duplicated nav**.

## 2. The fix — single source of truth

1. **Self-measuring nav height.** `GlobalNav` now measures its own rendered height with a
   `ResizeObserver` and publishes it to a CSS variable `--app-nav-height` on `:root`
   (`src/components/GlobalNav.tsx`). It self-corrects across breakpoints, line-wrap, and browser
   zoom — no pixel constant can drift out of sync again. Default fallback `120px` lives in
   `src/styles/globals.css`.
2. **One shared layout — `AppShell`** (`src/components/layout/AppShell.tsx`). Renders the fixed
   `GlobalNav` exactly once and reserves space with `pt-[var(--app-nav-height)]`. Every top-level
   route now goes through it instead of hand-rolling `<GlobalNav/>` + `pt-[120px]`.
3. **Sticky elements keyed to the variable.** The Scheduler header and the patient context bar use
   `top-[var(--app-nav-height)]`, so they pin flush under the nav at any size.

## 3. Screens fixed

| Screen / entry point | Problem before | After |
|---|---|---|
| `Patient.tsx` (patient search list) | **No top offset** — list sat behind the nav | AppShell — clean offset |
| `Help.tsx`, `MyPage.tsx` | `<div className="p-6">` with **no offset** — content under nav | AppShell |
| `Setup.tsx`, `Utilities.tsx` | **Double nav** — wrapped by `AdminPageWrapper` *and* rendered their own `GlobalNav` | Self-wrap via AppShell; redundant `AdminPageWrapper` removed from their routes (verified `navCount: 1`) |
| `Dashboard.tsx` | `pt-[120px]` under-reserved (~27px overlap) | AppShell |
| `Scheduler.tsx` | `pt-[120px] md:pt-[136px]` + sticky header at fixed `top-[120/136px]` | AppShell + sticky `top-[var(--app-nav-height)]` |
| `AddNewPatient.tsx` | `pt-[120px]` | AppShell |
| `PatientShellLayout.tsx` (all patient detail tabs) | `pt-[120px]`; loading/error branches had **no offset** | AppShell on all 3 branches; patient context bar now **sticky** below the nav |
| `AdminPageWrapper` (Reports + all Setup/Utilities sub-routes) | `pt-[120px]` | AppShell |

All `pt-[120px]` / `pt-[136px]` / `top-[120px]` / `top-[136px]` literals were removed from live
code (only references left are in explanatory comments).

## 4. Verification results

- **No nav/content overlap** on any tested viewport.
- **No page-level horizontal scroll** at 1440 / 768 / 375 (`body.scrollWidth == innerWidth`).
- Nav fixed at `top: 0`; only the page content scrolls (no nested-scroll surprises introduced).
- Nav icon sub-row scrolls horizontally on narrow screens instead of wrapping/ballooning
  (`overflow-x-auto whitespace-nowrap`, items `flex-shrink-0`).
- KPI grids and cards reflow gracefully (3-col → 2-col → stacked).
- `npx tsc -b` — **clean**. `eslint` on touched files — **0 errors** (17 pre-existing warnings,
  none introduced).
- Only runtime console errors are pre-existing **AI Chat WebSocket** failures (WS backend not
  running in dev) — unrelated to layout.

## 5. Remaining UI issues / follow-ups

- **Mobile org/office selector (≤~420px):** the Organization/Office pills in the nav top bar sit
  at the right edge and are partially clipped on phones. Page doesn't overflow, but the control is
  awkward to reach. *Fix idea:* collapse the selectors into a single dropdown, or hide the
  "Practice Management System" subtitle and let the top bar scroll-x below a breakpoint.
- **Dead legacy pages** `src/components/pages/Charting.tsx` and `src/components/pages/Transactions.tsx`
  are **not routed anywhere** (live screens are `RestorativeChart`/`PerioChart` and
  `TransactionsEntryPage`). They still render their own nav without a proper offset. Recommend
  **deleting** them (and the unused `src/components/GlobalNavWrapper.tsx`).
- **Per-screen density (deferred by scope):** dense clinical grids (perio/restorative charting,
  scheduler day grid, wide tables) remain horizontally scrollable on small screens rather than
  reflowed — intended for this desktop-first clinical app per the chosen "graceful mobile" scope.
  A future pass could add card/stacked layouts for true mobile use.

## 6. Backend issues affecting rendering

None specific to layout. Note the dev backend's CORS only allows origin `:5173`, so the preview
**must** bind to 5173 (free the port first). The AI Chat WebSocket backend is not running in this
dev environment (cosmetic console noise only).

## 7. Recommendations for further UI improvements

1. **Adopt `AppShell` for any new top-level route** — never hand-roll `<GlobalNav/>` + a padding
   offset again. The variable + shell is the contract.
2. **Delete the dead legacy pages and `GlobalNavWrapper`** to remove the last hand-rolled navs.
3. **Consolidate z-index** into a small named scale (nav `z-50`, sticky context `z-30`, dropdowns
   currently use inline `zIndex: 9999`) to prevent future stacking collisions.
4. **Standardize page content width/padding** via the `AppShell contained` option (already built
   in) so dashboards/setup/forms share one max-width + responsive padding instead of ad-hoc
   `max-w-7xl mx-auto p-6`.
5. **Mobile nav** — a future hamburger/drawer pattern for the icon sub-nav would be cleaner than
   horizontal scroll if real phone usage is expected.
