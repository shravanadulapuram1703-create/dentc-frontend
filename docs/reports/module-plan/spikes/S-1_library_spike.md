# Spike S-1 (UX-02) - library checks under the 0.75 zoom

Answers the twelve checks of [07_ux_blueprint.md](../07_ux_blueprint.md) §10.2. Run on 2026-11-23 in the dev server
(:3000) and a production build served by `server.js`, Chromium (the desktop app's browser pane) at `html { zoom: 0.75 }`,
logged in as the UAT test user, engine off. Edge was not tested separately (same Chromium engine); 60 fps was judged
by eye, not measured with a profiler.

Harness: `src/features/reports/__spike__/SpikePage.tsx` (dev-only route `/reports/__spike`, never emitted in builds),
removed after the spike; the table wrapper moved to `src/features/reports/results/useResultTable.ts`.

## Versions pinned (exact, `package.json`)

| Package | Version | Why |
|---|---|---|
| `@tanstack/react-table` | **9.3.1** (candidate A) | Check 1 passed; v8 fallback not needed |
| `@tanstack/react-virtual` | **3.14.28** | Latest at install (07 §10.1 named 3.14.26) |
| `@radix-ui/react-dialog` | **1.1.15** | Was installed only transitively; now a direct dependency |
| Already present, unchanged | `@radix-ui/react-popover` 1.1.15, `react-tooltip` 1.2.8, `react-day-picker` 9.13.0, `cmdk` 1.1.1, `recharts` 3.6.0, React 19.2.3 | |

## Results

| # | Check | Result | Evidence | Consequence |
|---|---|---|---|---|
| 1 | TanStack Table v9 + React 19.2, column visibility / order / pinning / sizing / row selection, `strict` + `noUncheckedIndexedAccess` | **Pass** | Wrapper `useResultTable` = 91 lines, no casts; `tsc` clean with `noUncheckedIndexedAccess` added. v9 API: features registered explicitly with `tableFeatures({...})`; pinning state is `{ start, end }` (not left / right); `column.getStart("start")` gives the sticky offset | Use v9. Note the API differs from v8 examples (`useTable`, `createColumnHelper<typeof features, Row>()`, `table.FlexRender`) |
| 2 | TanStack Virtual, 50,000 fixed rows, scroll to any index, sticky `thead` | **Pass** | With `observeElementRect` reporting `offsetWidth/offsetHeight` (layout px): at the top 29 rows rendered for a 461 px box (16.5 visible + overscan 12); mid-scroll and at the last row the rendered rows cover the box with no blank band (last row 49,999 ends at the box's bottom edge minus the horizontal scrollbar). `scrollToIndex` settles one frame later (read the DOM after a frame) | Keep the layout-px rect observer from 07 §9.5; fixed row height, no `measureElement` |
| 3 | Sticky header + pinned left column + horizontal scroll in one box | **Pass** | Scrolled 9,000 px down and 500 px right: header top = box top; selection column at the box's left edge; pinned Code column right after it in header and body; focused checkbox stays below the header | The pinned column's `left` must add the widths of the fixed leading columns (selection) to `getStart("start")`; a focus `scroll-padding-top` equal to the header height is recommended |
| 4 | Column resize by pointer | **Pass** | Dragging 75 viewport px widened the column by exactly 100 layout px (75 / 0.75); the handle followed the pointer | Delta ÷ `uiZoom()`, size set through `table.setColumnSizing` |
| 5 | Radix popover / tooltip anchored to a table header and inside a dialog; collision at the window edge | **Fail as shipped, pass with fix** | Without a fix the popover lands at 0.75 × the anchor position (anchor bottom 196 px, popover top 150 px): Floating UI computes viewport px and writes them as a `transform` inside the zoomed `html`, so they are scaled again. **Fix:** counter-zoom the popper wrapper - `[data-radix-popper-content-wrapper]` `zoom: calc(1 / var(--app-zoom))` and its child `zoom: var(--app-zoom)`. With it: popover top = anchor bottom + 4 px, centred within 2 px; collision at the left edge shifts it correctly | UX-15 ships the fix, scoped to module layers (`:has(> .rpt-layer)`). Finding outside the module: the messaging `EmojiPicker` uses the same popover and is probably misplaced today (not verified) |
| 6 | Radix dialog over the nav, under nav dropdowns and the messaging panel | **Pass** | Dialog overlay `z-index` 60 covers the nav (50); below nav dropdowns (9999) and messaging (10000) | Layer tokens of 07 §9.5 kept as they are |
| 7 | `react-day-picker` 9 range calendar in a popover, with the global `!important` control styles | **Fail as shipped, pass with fix** | The global `select` rule turns rdp's hidden caption `select`s into visible 48 px boxes ("November November"). A rule inside `@layer base` with `!important` and higher specificity (`select.rpt-select.rdp-dropdown`) restores rdp's overlay select (opacity 0, absolute); the range 3-10 Nov selects correctly; popover above the dialog | UX-15 ships the layered rule; rdp gets `classNames={{ dropdown: "rpt-select" }}` |
| 8 | Recharts tooltip and legend; resize when the messaging panel toggles | **Pass (tooltip, window resize)**; panel case not reproducible | Tooltip renders beside the pointer; `ResponsiveContainer` follows a viewport change (1,333 -> 1,368 px). The messaging panel **overlays** the content at 1,024 and 1,700 px viewports instead of shrinking it with `marginRight`, so a panel toggle does not change the chart width | 07 §9.5 "the messaging panel shrinks the content width" is not what the app does today; container queries still apply to window width |
| 9 | `cmdk` with 300 entries, keyboard navigation, global input styles | **Pass with the layered input rule** | Typing "option 16" filters to 17 items without visible lag; ArrowDown moves the selection; its input carries `rpt-input`, and the layered `input.rpt-input:not([type=checkbox]):not([type=radio])` rule wins over the global one (26 px high, 2 x 6 px padding) | UX-15 layered control rules |
| 10 | Lazy route + error boundary + failed dynamic import after a deploy | **Pass** | Playwright (`e2e/reports-shell.spec.ts`): a 404 on the routes chunk shows "A new version is available" with Reload. Production `server.js`: a missing `/assets/js/routes-<old>.js` answers 404 `text/plain` (not the index.html fallback); app paths still get index.html | The login-gated production flow was not exercised end to end (the production server on another port is not an allowed CORS origin) |
| 11 | Blob download and print tab under the production CSP | **Pass for CSP; save / print not executed** | Production page: a blob PDF loads in an `iframe` (`frame-src 'self' blob:`), a blob CSV link carries its `download` name; no `securitypolicyviolation`. No file was actually saved and no print dialog opened during the spike | Use blob + `download` for files; PDF preview in an in-app `iframe` dialog or a new tab both pass the CSP |
| 12 | Bundle effect | **Pass** | Production build: module chunk `routes` 2.0 kB gzip; today's report pages moved out of the main chunk into lazy chunks (Reports 4.4, runner 7.5, catalog 4.2 kB gzip), so the main chunk shrinks rather than grows; the spike is not emitted. Table + virtual as used by the wrapper: 25.7 kB gzip (both packages whole: 43.7 kB) - the future `reports` chunk stays far below 180 kB gzip | - |

## Decisions recorded

- OD-2: **TanStack Table 9.3.1** adopted (07 §10.1 candidate A).
- New mandatory rules for UX-15 (`styles/reports.css`): popper counter-zoom (check 5), layered control rules for
  `rpt-input`, `rpt-select`, react-day-picker's caption selects (checks 7, 9).
- Plan corrections to carry into 07 §9.5: the messaging panel overlays the content (no `marginRight` shrink); the
  "Radix placement under the zoom is assumed from the messaging feature" assumption is wrong without the counter-zoom.
