# Analytics and Reporting UX Patterns (2024-2026) - Reference for the Reports & Analytics Module

Research date: 2026-11-22. Audience: product designers and engineers planning the Reports & Analytics module.
Scope: how current reporting / analytics products let people find, parameterise, read, act on, share, build and
question reports; which React table and chart technology fits; and a recommended UX blueprint for our module.
Not repeated here: KPI formulas (`dental_kpi_dictionary.md`), competitor feature inventories
(`competitor_analytics_teardown.md`), engine choices (`reporting_architecture_options.md`), the reference screenshots
(`../analysis/reference_screenshots.md`) and the current frontend (`../analysis/fe_existing_reports.md`,
`../analysis/fe_cross_cutting.md`).

## 0. How to read this

| Tag | Meaning |
|---|---|
| (D) | Primary documentation, help-center or guideline page fetched and read in this session |
| (R) | npm registry metadata, or a repository README / manifest, read in this session (2026-11-22) |
| (T) | Fact carried over from the sibling teardown; its source key is kept and listed in section 13.11. Not re-fetched here |
| (L) | Local analysis documents under `../analysis/` (static analysis of our own code) or project conventions |
| [unverified] | Not confirmed from a source in this session (general knowledge, or the page blocked retrieval). Verify before relying on it |
| *Recommended* | This document's judgement, not a sourced fact |

- Source keys such as `[MB-5]` resolve in section 13.
- **Web search was not available.** The search budget shared by this workflow was already used up before this
  agent's first query, so every external fact comes from a direct fetch of a known primary URL. Not verified as a
  result: QuickBooks Online (HTTP 403), SAP Fiori (HTTP 403), the Looker scheduler page (HTTP 404), the Polaris
  date-picking pattern (redirected to an unrelated page), Power BI Copilot / Q&A, Toast, Salesforce report builder.
  Anything said about them is tagged [unverified].
- Pages were read through an automated page-to-text step. UI labels are reproduced as reported; confirm a label in
  the product before copying it into a spec.
- Versions, limits and licence terms are as shown on 2026-11-22.

---

## 1. Findings at a glance

1. **Two interaction models coexist everywhere: parameterised reports with an explicit run, and dashboards that
   apply filters live.** The deciding variable is response time: live filtering is acceptable when results return
   in under about one second; batch apply wins when people set several criteria or the system is slow
   `[NNG-1][CBN-1][PP-3]`. Metabase exposes the choice as a per-dashboard switch `[MB-5]`; Looker Explores require
   Run `[LK-2]`; Dental Intelligence scorecards use an Apply button `[DI-6]`.
2. **Findability = categories + search + personal lists.** Favorites, Recents, "shared with me" and pinned items
   recur in Power BI, Stripe, Metabase and Dental Intelligence `[PBI-4][ST-3][MB-9][DI-6]`. The legacy menu already
   has My Reports, My Favorites and Search Report (L).
3. **"Standard vs custom" must be visible.** Shopify labels default reports as authored by Shopify and makes edits
   temporary until saved as a copy `[SH-5]`; Metabase has a verified badge that is removed when the query is edited
   `[MB-7]`. This is the direct answer to the top builder complaint in dental (different paths, different
   numbers) (T) `[ASC-R1]`.
4. **Date controls are presets + rolling ranges + custom + comparison, with explicit inclusive / time-zone
   semantics** `[SH-6][ST-2][MB-5]`. Dental adds a date basis (service / posting / payment) and an "as of" mode.
5. **Saved views must keep relative dates and an explicit office policy.** Grafana makes "lock time range" an
   explicit choice when sharing `[GF-1]`; the legacy tool's favourites silently keep the office they were saved in
   (T) `[DEN-12]`; our current runner freezes dates in saved views (L).
6. **Totals must cover the whole result even when rows are capped, and the cap must be stated.** Shopify shows at
   most 1,000 rows while totals cover all rows `[SH-4]`; Power BI writes a notice into the exported file when the
   export limit is hit and lists the applied filters in the first row `[PBI-1]`. Our current totals are silently
   wrong above the client-side cap (L).
7. **Every aggregate must open the records behind it** - Metabase drill-through menu, Power BI drillthrough pages
   with an automatic Back button, Linear Insights filtering the underlying list, Mixpanel "view users"
   `[MB-3][PBI-3][LIN-1][MP-1]`. A non-modal side panel keeps the table in view `[NNG-2]`.
8. **Lists must lead to actions and outcomes.** Bulk text / e-mail from patient lists, follow-up tasks with
   recorded outcomes and reports on dollars scheduled per task exist in dental overlays (T)
   `[DI-8][PBN-2][DI-11][DEN-8]`.
9. **A KPI is a number plus context**: delta, target, benchmark, trend `[PP-2][GB-1]`. Shopify targets show percent
   complete, current vs target, status, days remaining and a pacing line `[SH-8]`; Practice by Numbers shows a
   percentile ladder on hover `[PBN-6]`.
10. **The dental "main dashboard" is a metric x trailing-12-months matrix** (L). The reference implementation has
    no totals, goals, comparison, filters or drill-down (L) - each is an improvement opportunity.
11. **Subscriptions are a solved pattern**: side-panel creation from the report, frequency + time zone, per-
    subscription parameters, skip-when-empty, test send, expiry, admin take-over `[MB-1][PBI-2][ST-2]`. A snapshot
    rendered with the owner's data scope and mailed to others is a documented leak risk `[PBI-2]`.
12. **Builders that work are stepwise, previewed and curated**: Metabase previews 10 rows after each step and can
    restrict the data picker to curated library content `[MB-6]`; Looker's field picker shows a description per
    field `[LK-2]`; Shopify and Dental Intelligence start from editable templates `[SH-5][DI-6]`.
13. **Trustworthy AI answers are grounded in a semantic layer, not free SQL.** Looker composes the query from the
    model `[LK-1]`; Snowflake and Looker use verified question-query pairs `[SF-1][LK-1]`; Tableau Pulse computes
    insights statistically and uses the language model only to summarise `[TB-1]`. NN/g finds citations and
    step-by-step "reasoning" inflate trust without being reliable `[NNG-8]`.
14. **Accessibility has concrete, testable requirements**: 3:1 contrast for chart marks unless the data is also
    available as text / table, 24 px targets, status messages announced without moving focus, sticky headers that
    never fully hide the focused element `[W3C-1][W3C-3][W3C-4][W3C-5]`.
15. **Technology facts that change decisions** (R): TanStack Table v9 is stable (9.0.0 on 2026-08-04); AG Grid's row
    grouping, aggregation, pivoting, server-side row model and Excel export are Enterprise-only `[AG-1][AG-3]`;
    `@tremor/react` has had no npm release since 2025-01-13 and its peer range stops at React 18; Tremor's
    copy-paste components target Recharts 2 `[TR-4]` while the shadcn chart component targets Recharts 3 `[SC-1]`;
    Glide Data Grid's published 6.0.3 (2024-02-03) declares React peers up to 18; react-grid-layout 2 ships a
    position strategy for scaled containers `[RGL-1]`.

---

## 2. Report hub / catalog

### 2.1 What reference products do

| Product | Hub mechanics | Source |
|---|---|---|
| Shopify Analytics | Reports index filtered by category (Acquisition, Inventory, Sales ...) and by creator (creator = Shopify shows the default reports). Default reports can be adjusted in place; changes are temporary until saved as a custom exploration. Every dashboard metric card links to its report | `[SH-1][SH-4][SH-5]` (D) |
| Stripe Dashboard | Reports hub of prebuilt reports; sidebar **Shortcuts** lists pinned and most recently visited pages; the `?` key opens the keyboard-shortcut list | `[ST-1][ST-3]` (D) |
| Metabase | Collections as folders with teammates' pinned items on top; personal bookmarks in the sidebar that also rank higher in the user's own search; Ctrl/Cmd+K command palette; search filters for content type, creator, last editor, dates and verified-only; admin-set verified badge | `[MB-7][MB-9]` (D) |
| Power BI scorecards hub | "Recommended" strip (items the user is assigned to, edited or checked in on) plus tabs Recent, Favorites, Shared with me, All | `[PBI-4]` (D) |
| Linear Insights | Analytics is not a destination: a right-side panel on any list view (Cmd/Ctrl+Shift+I), scoped to that view's filters | `[LIN-1]` (D) |
| Dental Intelligence Scorecards | Three entry tiles (My Scorecards, Scorecards shared with me, Scorecard Templates - 24 templates); name search; sortable list (Name, Focus, Created by, Permissions, Creation date, Shared with Others); row actions Rename / Duplicate / Share / Delete | `[DI-6]` (D) |
| Square Dashboard | Flat list of report types (sales summary, sales trends, payment methods, item / category / modifier sales, discounts / comps / voids, taxes / fees, transaction status and history, gift cards, disputes, cash drawers, custom report) | `[SQ-1]` (D) |
| Legacy tool (Denticon) | 26 menu entries in 11 groups, including My Reports, My Favorites and Search Report. The newer menu merges summary / detail / group variants into one report with criteria | (L) reference_screenshots section 1; (T) `[DEN-7][DEN-12]` |
| Reference product (Oryx) | Category band Financial / Patient / Clinical / Other / Saved; each category lists its reports in a dropdown | (L) reference_screenshots sections 2 and 5 |
| Eaglesoft, Dentrix Ascend | 180 reports in 9 categories plus a published "find the right report" guide; an interactive guide that recommends a report by action and topic | (T) `[ES-1][ES-3][ASC-9]` |
| QuickBooks Online | Standard / Custom / Management report tabs, star-to-favourite, report groups with an e-mail schedule | [unverified] |

### 2.2 Patterns and rules

| # | Pattern | Rule | Evidence |
|---|---|---|---|
| H1 | Catalog is data | One definition record per report drives the card, the search index, the runner header, rights and help. Today's contract is functions, not data, and cannot be served by the backend | (L) fe_existing_reports TL;DR 5 |
| H2 | Shallow taxonomy | At most about 8 top categories; one category per report plus free tags (audience, output type). Map the legacy families into the cleaner Financial / Patient / Clinical / Insurance / Scheduling / Management / Daily set | (L) reference_screenshots section 7; *Recommended* |
| H3 | Search first | Search matches name, legacy aliases, description, metric names and column names; favourites and recently used rank first; reachable from anywhere through a command palette (`cmdk` is installed and unused) | `[MB-9]`; (L) |
| H4 | Personal lists | Favorites (star on every card and header), Recents (automatic), My saved views, Shared with me, Scheduled | `[PBI-4][ST-3][MB-9][DI-6]` |
| H5 | Trust badge | Standard (vendor-maintained, verified) vs Custom (user-built). Editing a standard report always produces a copy; a custom report can never carry the standard badge | `[SH-5][MB-7]` |
| H6 | Question-led descriptions | Each card answers "what question does this answer", names its key parameters and the nearest sibling ("use X instead when ...") | (T) `[ES-3][ASC-9]`; *Recommended* |
| H7 | Legacy aliases | Typing a legacy report name finds the merged modern report, with a note explaining which criteria reproduce the old variant | (T) `[DEN-7]`; *Recommended* |
| H8 | Card content | Name, badge, one-line description, category, output type, my last run ("2 d ago - Last month - 3 offices"), freshness class (live / nightly), schedule indicator, star | *Recommended* |
| H9 | Teaching empty states | Empty Favorites / Recents / Schedules explain what will appear and how to populate it, with a direct action | `[NNG-6]` |
| H10 | Rights-aware | Reports the user cannot run are hidden; the catalog shows only what the role can open. Reports are gated by authentication only today; 56 report right codes exist and none is enforced | (L) fe_cross_cutting TL;DR 11-12 |
| H11 | Guide | A "Which report should I use?" helper: pick a task (balance the day, chase claims, fill tomorrow's schedule) and get 1-3 reports | (T) `[ASC-9][ES-3]` |
| H12 | Analytics in context | Beyond the hub, surface a small insights panel on operational lists (schedule, claims, ledger) scoped to that list's filters | `[LIN-1]`; *Recommended* later phase |

### 2.3 Catalog metadata per report definition (illustrative, snake_case)

| Field | Purpose |
|---|---|
| `report_key` | Stable id used in URLs, favourites, schedules and audit |
| `name`, `short_description`, `long_description` | Card, header, help drawer |
| `category`, `tags[]`, `audience[]` | Browsing and the role-based home |
| `legacy_aliases[]` | Search by legacy names (H7) |
| `output_kind` | `list`, `summary`, `matrix`, `statement`, `worklist`, `letter_batch` |
| `is_standard`, `verified_at`, `definition_version` | Trust badge and change notes |
| `parameters[]` | Drives the parameter bar: `key`, `kind`, `default`, `required`, `is_advanced`, `depends_on` |
| `default_view` | Default columns, grouping, sort, density |
| `drill_targets[]` | What a row or cell opens (patient, claim, appointment, ledger entry, another report) |
| `row_actions[]`, `bulk_actions[]` | Worklist actions (section 4.6) |
| `exports[]` | `csv`, `xlsx`, `pdf` |
| `freshness` | `live`, `intraday`, `nightly` plus the source table family |
| `cost_class` | `instant`, `interactive`, `background` - decides auto-run, explicit run or background run (section 3.1) |
| `required_rights[]` | Gating |
| `metrics_used[]`, `related_reports[]` | Glossary links and cross-navigation |

### 2.4 Role-based home

| Persona | Questions | Default home content | Default dashboard |
|---|---|---|---|
| Front desk | Who is coming today, who owes, who must be called | Huddle, today's schedule lists, unconfirmed appointments, balances of today's patients, recall and unscheduled-treatment worklists | Today |
| Office manager | Did we hit the day and the month; what is stuck in A/R and claims | Day sheet and deposit, production and collections MTD vs goal, aging, claims aging, adjustments, schedules I own | Office performance |
| Dentist / owner | How am I and the practice trending | Trailing-12-month grid, own scorecard, case acceptance, hygiene reappointment, new patients | Practice overview + My scorecard |
| Multi-office executive | Which offices and providers are off track, and why | Office comparison and ranking, goal attainment, benchmarks, exceptions | Group overview |

Evidence that role-grouped report sets and dashboards are market practice: (T) `[DI-9][PBN-3][JAR-2]`; huddle
anatomy: sibling teardown section 3.1. The home is a default, never a fence: every user can browse the full
catalog their rights allow (*Recommended*).

---

## 3. Parameters and filters

### 3.1 Explicit run vs live apply

| Source | Guidance or behaviour |
|---|---|
| NN/g | Interactive filtering suits exploration and needs results in under about 1 s; batch suits people with several known criteria and slow systems, and is recommended on mobile. When updating live, dim the old results and show a spinner instead of letting the page flicker `[NNG-1]` |
| Carbon | Batch when selections span several categories or data returns slowly; instant for a single category or a single selection `[CBN-1]` |
| Pencil & Paper | Three fetch models: live; per-filter (apply when the dropdown closes); batch with one Apply for heavy data `[PP-3]` |
| Metabase | Auto-apply is on by default; switching it off gives viewers an Apply button. A filter can be made mandatory to guard expensive unfiltered queries `[MB-5]` |
| Looker Explore | Adding, removing, pivoting or reordering fields needs Run `[LK-2]` |
| Shopify reports | Changes in the configuration panel apply; edits in the query editor need Run `[SH-5]` |
| Dental Intelligence | Locations / Metrics / Time Range / Comparison dropdowns, then Apply `[DI-6]` |
| Reference product | A report generates automatically with default filters; an "Apply Filters" button re-runs it (L, search-snippet evidence) |
| SAP Fiori filter bar | "Go" button vs live mode [unverified] |

Decision rule (*Recommended*):

| Surface | Behaviour |
|---|---|
| Dashboard on pre-aggregated data (p95 under 1 s) | Live apply, debounced; multi-selects apply when the popover closes |
| Report, `cost_class = instant` | Auto-run once on open with defaults; later parameter changes mark the result stale and need Run |
| Report, `cost_class = interactive` | Opens in a "ready" state showing the parameter summary and a primary Run button; no auto-run |
| Report, `cost_class = background` | Run queues a background run; the page shows queue and progress and the user may leave (section 9.3) |
| Mobile | Always batch (Apply) |

Stale rule: when parameters differ from the last run, keep the old result visible but dimmed under a banner
"Parameters changed - Run to update". Never show new parameters above old rows without that banner.

### 3.2 Date range, presets and comparison

Evidence:

- **Shopify**: preset list (for example Today, Yesterday, Last 7 days, Month to date, quarters, a retail-season
  preset); fixed custom range with start / end fields, calendar and optional times; rolling range "last N units"
  with an include-current-period switch (on by default); comparison menu with previous period, previous year,
  custom range or a target; the comparison series is drawn dotted or faded and appears in chart and table
  `[SH-5][SH-6]`.
- **Stripe**: reports open on the prior month; options are previous months, month-to-date or custom. The page
  states that both selected dates are inclusive and lets the user switch between the account time zone and UTC
  `[ST-2]`.
- **Metabase**: distinct widget types (month and year, quarter and year, single date, date range, relative date,
  all options) and a separate "time grouping" parameter that changes granularity without filtering `[MB-5]`.
- **Mixpanel**: "Compare to past" (previous period or custom) and guardrails tying granularity to range (hourly up
  to 31 days, daily up to 12 months) `[MP-1]`.
- **Pencil & Paper**: presets plus custom, immediate validation of start/end order, the selected range shown as
  text, typed entry for keyboard users `[PP-3]`.
- **Square**: reporting hours are configurable and the start time decides the calendar day sales belong to
  `[SQ-1]` - the same question as a dental business day for late postings.
- **Legacy analytics (DPA)**: yesterday vs the same weekday last week; MTD / YTD vs prior year or month (T)
  `[DEN-1]`.
- **Our app**: two divergent preset sets (`RangePreset`, `PeriodKey`), native date inputs, an unused
  react-day-picker wrapper (L).

| Topic | Rule (*Recommended* unless sourced) |
|---|---|
| Anatomy | Trigger shows the resolved range ("Last month - Oct 1 to Oct 31, 2026"). Popover: preset list, two-month calendar, typed start / end inputs, Apply / Cancel `[PP-3][SH-6]` |
| Preset set | Today, Yesterday, This week, Last week, Month to date, Last month, Quarter to date, Last quarter, Year to date, Last year, Trailing 12 months, Last N days / weeks / months, Custom. One implementation replaces `RangePreset` and `PeriodKey` (L) |
| Relative vs absolute | Store the token (`last_month`), not resolved dates; resolve at run time in the office time zone. Saved views and schedules keep the token (section 3.5) |
| Inclusive semantics | End date inclusive; always print the resolved dates next to the token `[ST-2]`. Do not build dates with `new Date("YYYY-MM-DD")` (L) |
| Date basis | Separate control where supported: service date / posting date / payment date / deposit date. Echo the basis in the header, the export and the PDF |
| As-of reports | Aging and balance reports take one as-of date, not a range |
| Open period | Label the in-progress period ("MTD", "partial") in headers, cards and charts; the reference dashboard does not (L) |
| Comparison | None / Previous period / Same period last year / Custom / Goal. Comparison drawn dashed or lighter; show absolute and percent delta `[SH-6][SH-8]` |
| Fair comparison | Offer weekday alignment and per-working-day normalisation for partial periods (T) `[DEN-1]` |
| Granularity | Derived from the range (day up to about a month, week up to about half a year, month beyond) with an override; block unreadable combinations `[MP-1]` |
| Time zone | Office time zone by default; show it in the footer. Multi-office runs spanning zones resolve dates per office |

### 3.3 Entity pickers

| Entity | Pattern | Notes |
|---|---|---|
| Office / office group | One scope control with modes: Working office, My offices, Office group, Selected offices, All offices | Maps to `office_id`, `office_ids`, `office_group_id`, `all_offices` (L, fe_cross_cutting 3.5). Stripe's equivalent defaults to all accounts and opens a searchable selection drawer for a subset `[ST-2]`; Dentrix Ascend defaults to all accessible locations (T) `[ASC-6]`; the legacy tool defaults to include-all with a select override (T) `[DEN-7]` |
| Provider | Multi-select popover grouped "This office" / "Other offices", role facet (dentist / hygienist), include-inactive switch for historical periods | Project rule "prefer, never exclude"; label `Name (ID)`; "All providers" omits the parameter rather than enumerating ids (L, fe_cross_cutting 4.3) |
| Provider role split | Segmented control Doctor / Hygiene / All where the metric supports it | The reference dashboard splits by provider role with an unshown residual (L). Always show an "Other / unassigned" bucket so parts sum to the total |
| Carrier, plan, employer | Async typeahead multi-select with chips; never preload | About 31k plans; list endpoints cap `size` at 200 (L) |
| Procedure codes | Three entry modes: ADA category tree, code range ("D2000-D2999"), saved code sets | Dental Intelligence offers preset or custom ADA-code filters (T) `[DI-3]`; about 1,100 codes are cached client-side (L) |
| Patient | Typeahead by name, chart number or id; chip shows the name, the URL carries only the id | Privacy (section 3.6) |
| Enumerations (appointment status, patient type, transaction type, claim status) | Checkbox multi-select with an "All" default | Start all-selected when users usually exclude a few; start empty when they usually pick one `[CBN-1]` |
| Users (entered by, collector) | Async multi-select | Duplicate display names need an id suffix (L) |

Cross-cutting picker rules:

- Typeahead once a list exceeds about 10 items `[PF-1]`; values OR within a facet, AND across facets `[PF-1]`.
- The closed control shows what is selected (name for one, count for many) and can be cleared without reopening
  `[CBN-1][PP-3]`.
- Multi-selects apply when the popover closes, not per click `[PP-3]`.
- Ids from a saved view that are no longer permitted or no longer exist stay visible as "(not available)", are
  excluded from the run and trigger a notice (L, fe_cross_cutting 4.3).
- Office choice cascades to the provider list (union of rosters), with a "show others" switch (L).

### 3.4 Applied-filter summary, reset, defaults, required parameters

| Rule | Evidence |
|---|---|
| Show applied non-default values as removable chips under the bar; long values collapse to a count ("Carriers (4)") | `[PP-3][PF-1]` |
| One "Clear all" plus a per-control clear; "Reset to defaults" is separate from "Clear" | `[CBN-1][MB-5]` |
| The bar never hides active filters, including on mobile | `[PP-3]` |
| Mandatory parameters are marked and block Run with an inline message; expensive reports require a date range | `[MB-5][LK-3]` |
| Per-user last-used values are remembered; precedence is URL, then saved view, then last-used, then definition default | `[MB-5]`; *Recommended* ordering |
| Validation is immediate (range order, code-range syntax, maximum selections) | `[PP-3][PF-1]` |
| Before running, show an estimate when cheap to compute ("about 48,000 rows - will run in the background") | `[PP-3]` (result preview on Apply); *Recommended* |
| Every result header restates the parameters used; exports and PDFs carry the same block | `[PBI-1]` |

### 3.5 Saved views (filter sets)

Evidence: Dental Intelligence saves a customised template as a new scorecard, private until shared, read-only for
recipients `[DI-6]`; Shopify saves a customised default report as a custom exploration `[SH-5]`; Power BI
subscriptions can capture the viewer's filters, slicers and drill state `[PBI-2]`; Pencil & Paper recommends a
strong default view, per-user favourites and saved queries `[PP-3]`; the legacy tool's favourites keep the office
they were saved in, a known gotcha (T) `[DEN-12]`; our saved views freeze dates and live in `localStorage`,
which is wiped on logout and on every session-expiry 401 (L).

| Rule | Detail |
|---|---|
| A view = parameters + layout | Parameters (tokens, not resolved dates), columns, order, pinning, grouping, sort, density, chart choice |
| Office policy is explicit | `follow_working_office` (default for office staff) or `fixed` (explicit office set / group). Show the policy in the view chip |
| Ownership and sharing | Private by default; share with roles, offices or the organisation; recipients get a read-only view they can duplicate |
| Default view | Each user may mark one view per report as default; admins may set an organisation default |
| Dirty state | Changing anything shows "Modified" with Save / Save as / Revert |
| Versioning | A view stores `definition_version`; when the report definition changes incompatibly, open with a migration notice instead of failing |
| Storage | Server-side only. A user-preferences endpoint and a key-value preferences resource already exist and are unused (L, fe_cross_cutting 6.5) |

### 3.6 URL-shareable state

Evidence: Metabase applies filter values found in the link and falls back to defaults (not last-used values) for
filters absent from the link `[MB-5]`; Grafana share links carry the time range with an explicit lock option and
can be shortened `[GF-1]`; Linear offers a copy-link action per insight `[LIN-1]`.

- Every parameter and the view layout are reflected in the query string with stable snake_case keys; arrays use
  repeated keys, matching the axios serializer (L).
- "Copy link" offers two variants: **live link** (relative tokens; recipient sees current data within their own
  rights) and **snapshot link** (immutable run, section 6.4).
- No patient names, phone numbers or other personal data in URLs - ids only; labels are resolved after load.
- A link never widens access: values outside the recipient's rights are dropped with a visible notice.
- Illustrative shape (*Recommended*):

```
/reports/r/production_by_provider
  ?date_range=last_month&compare_to=prior_year&date_basis=service_date
  &office_scope=group&office_group_id=4
  &provider_ids=12&provider_ids=31
  &group_by=provider&group_by=category&detail_level=summary
  &sort=-net_production&view_id=218
```

### 3.7 Progressive disclosure

- Basic row: date range, scope (office), the one or two parameters that define the report. Everything else sits
  behind "More options (n)", where n counts non-default advanced values `[PP-3][CBN-1]`.
- Dependent parameters render only when relevant (`depends_on`); the legacy menu already shows options dynamically
  (T) `[DEN-7]`.
- A dense panel must opt out of the global `!important` input styles (L, fe_cross_cutting TL;DR 6).
- An "Adapt filters" dialog to choose which parameters are pinned to the basic row [unverified - SAP Fiori
  pattern]; defer.

### 3.8 Legacy criteria mapped to modern controls

| Legacy criterion (L)(T) | Modern control | Note |
|---|---|---|
| Office OR Office Group | Scope control with modes (3.3) | Office-group entity exists end to end; a "group" read-scope mode does not (L) |
| "Include All" with a select list (providers, carriers, codes) | Multi-select popover defaulting to All, chips for selections | (T) `[DEN-7]` |
| Date from / to plus date type | Date-range picker plus date-basis control | 3.2 |
| Detail vs Summary | Detail-level switch on the result (re-run only if the server cannot return both) | (T) `[DEN-7]` merged these variants |
| Group by (code, provider, category, carrier) | Multi-level group-by control above the table, saved in the view | (T) `[DEN-7]` |
| Sort by | Column-header sort, multi-sort with a modifier key | [unverified as a legacy criterion - confirm against the legacy criteria screens] |
| Page break per group | Option in the PDF export dialog | [unverified as a legacy criterion - confirm against the legacy criteria screens] |
| Output PDF / Excel / web page | On-screen first; Export menu (PDF, XLSX, CSV) | (T) `[DEN-12]` |
| Patient type, status and transaction-type checklists | Enumeration multi-selects under More options | (L) |
| My Favorites (saved criteria) | Saved views with relative dates and explicit office policy | 3.5 |

---

## 4. Results

### 4.1 Anatomy (top to bottom)

1. **Run context line**: as-of timestamp, data freshness class, row count, run time, parameters summary, Refresh.
2. **KPI header**: 3-6 totals computed by the server over the full result (never over the loaded page).
3. **View switch**: Table / Chart / Pivot where the definition allows; group-by, detail level, density, columns.
4. **Table** with sticky header, frozen identifier column(s), subtotals and a grand-total footer.
5. **Footer**: range of loaded rows, total rows, statement that totals reflect all rows, export shortcuts.
6. **Side panel** (non-modal) for row detail and drill lists.

### 4.2 Table behaviours

| Behaviour | Rule | Evidence |
|---|---|---|
| Identifier first | First column is a human-readable identifier (patient name + chart number, claim number), frozen during horizontal scroll | `[NNG-2][PP-1]` |
| Sticky header | Header (and the totals footer) stay visible; frozen elements get a subtle shadow | `[NNG-2][PP-1]` |
| Alignment | Text left; quantities right with aligned decimals and tabular numerals; headers follow their column; never centre | `[PP-1]` |
| Units | Currency symbol and percent sign in the header or cell consistently; the reference dashboard mixes decimals and hides units (L) | (L) |
| Density | Three row heights (40 / 48 / 56 px in the cited guide) behind one control; preference stored per user | `[PP-1]` |
| Row separation | Light dividers plus hover highlight. Sources disagree on zebra striping (NN/g lists it as a place-keeping aid; Pencil & Paper advises against it because it collides with hover / selected / disabled states). Use dividers on screen; allow striping in PDF | `[NNG-2][PP-1]` |
| Column chooser | Show / hide / reorder / pin without relying on drag alone; show how many columns are hidden; prominent reset | `[NNG-2][PP-1][MB-2]` |
| Resize | Drag handle on header edges; widths saved in the view | `[PP-1][MB-2]` |
| Sort | Sensible default sort; multi-sort; indicator that does not break alignment; `aria-sort` on the sorted header only | `[PP-1][W3C-7]` |
| In-table search | Highlight matches inside rows | `[PP-1]` |
| Copy | Select cells and copy with headers; raw-value variant | `[MB-2]` |
| Hidden columns are not security | Sensitive columns are removed server-side by permission, not hidden in the grid | `[MB-2]` |
| Row detail | Lightest first: tooltip, inline expansion, side panel; avoid modals for anything that needs the neighbouring rows | `[NNG-2][PP-1]` |

### 4.3 Grouping, subtotals, pivot

- Group rows by one to three dimensions with a subtotal row per group, expand / collapse per group and an
  expand-all control in the header `[DI-6]`. State in the footer whether exports include collapsed rows -
  Dental Intelligence's scorecard CSV contains only the rows that are expanded `[DI-6]`, an easy trap.
- Subtotals and totals come from the server. Looker computes row totals in a separate query and warns that totals
  can look too high when filters or row limits hide rows `[LK-2]`; Power BI CSV exports omit subtotal and total rows
  `[PBI-1]`.
- Pivot view (rows x columns x measures) for summary reports: cap pivot columns (Looker allows up to 200 pivoted
  values `[LK-2]`), show a null symbol for missing cells `[LK-2]`, offer "pivoted" and "unpivoted" exports
  `[MB-4]`.
- Metric x period matrices (section 5.2) are a pivot with period on columns; build one component for both.
- Auto-pivot heuristics (one measure and two groupings pivot automatically `[MB-2]`) are optional.

### 4.4 Conditional formatting

| Type | Rule | Evidence |
|---|---|---|
| Threshold rules | Single-colour highlight by comparison or text match, optionally the whole row; ordered rules, first match wins | `[MB-2]` |
| Colour range | Sequential tint from low to high for numeric columns; shade relative to the row for matrices | `[MB-2][MP-2]` |
| In-cell bars | Mini bar in numeric cells for magnitude | `[MB-2]` |
| Goal bands | Named bands per metric with the thresholds visible in the legend; the legacy analytics uses below 85% red, 85-95% yellow, above 95% green for goal attainment, with ambiguous band edges noted as a weakness | (T) `[DEN-1]` |
| Not colour alone | Pair colour with an icon, sign or text; chart marks need 3:1 contrast unless values are labelled | `[PP-2][W3C-1]` |
| Polarity | Each metric declares whether up is good (production) or bad (A/R days, no-shows); colours follow polarity, not sign | *Recommended* |

### 4.5 Drill-down and drill-through

Definitions: **drill-down** moves through hierarchy levels inside one visual; **drill-through** navigates to a
detail page filtered to the selected entity `[PBI-3]`.

| Product | Mechanism | Source |
|---|---|---|
| Metabase | Click menu on cells, chart points and legends: filter by this value, view details, view related records, view these records, break out by time / location / category, zoom in, see this period by a smaller period, automatic insights; drag across a continuous axis to filter. Dashboards can instead send the click to a custom destination (dashboard, saved question, URL) with the clicked value passed as a filter, or update a dashboard filter (cross-filter); tables can set click behaviour per column | `[MB-3][MB-10]` |
| Power BI | Right-click a data point, choose a drillthrough page; target opens filtered to that entity with an automatic Back button; cross-report drillthrough exists | `[PBI-3]` |
| Linear | Selecting a bar, segment, table row, column or cell temporarily filters the underlying list; hover cross-highlights chart and table | `[LIN-1]` |
| Mixpanel | Click a segment to view the users or events behind it and save them as a cohort | `[MP-1]` |
| Dental Intelligence | Magnifier icon per metric opens source data; unavailable when several locations are selected (a documented limitation) | (T) `[DI-4][DI-5]` |
| Legacy analytics (DPA) | Drill-through on most tiles and aging bars to responsible-party and claim detail; missing on one page | (T) `[DEN-1]` |

Rules (*Recommended*):

- Every aggregate cell, KPI and chart mark has a primary click = "see the records behind this number", carrying
  all current parameters plus the clicked dimension values.
- Drill lists open in the side panel first (rows, count, total that reconciles to the clicked number, export) with
  "open as full report" to continue in the runner.
- Record links go to the real screen: patient shell, claim detail, appointment in the scheduler, ledger entry.
  Offer open-in-new-tab so the report keeps its place.
- A breadcrumb or Back restores the previous state, including scroll position.
- Drill must work for multi-office selections; if a number cannot be decomposed, say why.
- Reconciliation line: the drill total equals the clicked value, or the difference is itemised (rounding,
  unassigned provider).

### 4.6 Row actions and bulk actions - closing the loop

Evidence: per-record actions inline for one or two actions, otherwise a menu; batch actions via checkboxes with
action buttons above or below the table and a select-all shortcut `[NNG-2]`; bulk-action bar appears only after a
selection, optionally fixed to the window bottom `[PP-1]`. Dental overlays: bulk text / e-mail, print, CSV and
saved filters on patient lists; "invite to schedule" from cancellation and no-show lists; payment-request batches
with follow-ups from the collections board; follow-up tasks bucketed overdue / due today / upcoming with recorded
outcomes; a report of dollars scheduled and collected per task and team member; a send e-mail / SMS button on the
lapsed-patient list (T) `[DI-4][DI-5][DI-8][PBN-2][DI-11][DEN-8]`.

| Rule | Detail |
|---|---|
| Worklist reports declare actions | `row_actions[]` and `bulk_actions[]` in the definition: send SMS, send letter / e-mail, add to follow-up list, create task, open record, mark contacted |
| Selection scope | Checkbox per row; header checkbox selects the page; a banner offers "select all N matching rows" |
| Confirmation shows exclusions | "212 selected - 187 will receive a text - 25 skipped (no mobile number or opted out)" before sending |
| Long actions run as jobs | Progress, result summary, failures downloadable; the run/job shell used by Utilities is a UI precedent (L) |
| Write back | The list shows last-contact date, channel and outcome; filters include "not contacted in N days" |
| Outcome tracking | Task outcomes (no answer, left voicemail, scheduled) feed an effectiveness report (T) `[PBN-2][DI-11]` |
| Rights | Acting needs its own right in addition to viewing; every bulk action is audited |

### 4.7 States

| State | Presentation | Evidence |
|---|---|---|
| Idle (not run) | Parameter summary, Run button, what the report answers, estimated size | `[NNG-6]` |
| Running, under 1 s | No indicator | `[NNG-3][NNG-4]` |
| Running, 1-10 s | Skeleton for the page or spinner for a module; dim previous results | `[NNG-4][NNG-1]` |
| Running, over 10 s | Determinate progress or step text, time estimate, Cancel, and "notify me when ready" | `[NNG-3][NNG-5]` |
| Partial / truncated | Banner: "Showing the first N of M rows. Totals reflect all M rows. Export for the full list." | `[SH-4][PBI-1]` |
| Empty | "No records match" plus the applied parameters and one-click relaxations (widen dates, clear provider); never a blank table, never "no records" while still loading | `[NNG-6]` |
| Error | Plain reason, Retry, reference id; keep the last good result if any. The global query-error toast would duplicate an inline error and must be suppressed for report runs (L) | (L) |
| Stale | Dimmed result with "Parameters changed" or "Data refreshed since this run" | 3.1 |
| Limited by rights | "3 of 5 selected offices included - 2 are outside your access" | *Recommended* |
| Data-quality notice | Per-metric info / warning icons when inputs are incomplete (unmapped providers, missing hours) instead of a silent zero | `[SH-5]`; (L) |

### 4.8 Large results and export limits in comparable products

| Product | On-screen cap | Export cap | How the user is told |
|---|---|---|---|
| Shopify | 1,000 rows displayed; totals cover all rows | Export returns every row (CSV, XML, JSONL, Parquet) | Documented behaviour `[SH-4][SH-7]` |
| Metabase | 2,000 rows unaggregated, 10,000 aggregated in table views | First 1,048,575 rows; XLSX cells capped at 32,767 characters; clipboard copy up to 1,000,000 cells | `[MB-4][MB-6]` |
| Power BI | - | XLSX 150,000 rows; CSV 30,000 rows; matrix "current layout" 150,000 cell intersections | Notice written into the file; first row lists applied filters `[PBI-1]` |
| Looker | Up to 200 pivoted values; row totals from a separate query capped at 30,000 rows; conversational answers capped at 50,000 rows | - | Warning that totals may not match visible rows `[LK-2][LK-1]` |
| Mixpanel | 40 metric blocks; "View N" segments | - | `[MP-1]` |
| Dental Intelligence | - | Patient Finder export capped at 500 patients; scorecard CSV holds only expanded rows | (T) `[DI-8]`; `[DI-6]` |
| Legacy tool | - | Large runs can fail with a file-size error | (T) `[DEN-12]` |
| Our app today | Client caps of 600-1,600 rows; totals silently wrong above the cap | Exports carry no truncation notice | (L) |

Rules (*Recommended*): server paging with virtualised rows; page a stored run snapshot so sort, totals, pages and
exports stay consistent (see the architecture document); exports above a threshold run in the background and
arrive as a notification; every cap is stated on screen and inside the exported file.

---

## 5. Dashboards

### 5.1 KPI card anatomy

```
+--------------------------------------------------+
| Net production  (i)                    MTD  ...  |   label, definition icon, period chip, menu
| $182,400                                         |   value: rounded; exact value on hover
| +6.2% vs same days last month   [up icon]        |   delta: absolute or percent, icon + colour by polarity
| [sparkline: trailing 12 periods]                 |   trend
| Goal $250k  [=========>      ] 73%  pace: behind |   target progress and pace
| as of 09:12 - live ledger                        |   freshness
+--------------------------------------------------+
```

| Element | Rule | Evidence |
|---|---|---|
| Value | Large, rounded for scanning, exact on hover and in drill | `[GB-1][PP-2]` |
| Context | Never a bare number: prior period, target, average or threshold | `[GB-1][PP-2]` |
| Delta | Relative for change over time, absolute for distance to a benchmark; positive / neutral / negative shown by icon and text, not colour alone | `[PP-2]` |
| Comparison styling | Comparison series dashed or faded | `[SH-6]` |
| Target | Percent complete, current vs target, status, days remaining; cumulative chart with a dashed pacing line | `[SH-8]` |
| Pace | "On / off track to meet the goal by period end" as its own insight | `[TB-1]` |
| Benchmark | Percentile ladder (10 / 25 / 50 / 75 / 90) with a marker for this office; state how the benchmark is built and that it is not size-adjusted if so | `[PBN-6]` |
| Definition | Info icon on every metric opening definition, formula, date basis and version | (L); `[LK-2]` |
| Click | Whole card opens the matching report or drill list | `[SH-1][PP-2]` |
| Sparkline, bullet bar | Compact trend and target marks | [unverified - general practice; Tremor ships spark charts and progress marks `[TR-1]`] |
| Count | Show only metrics someone can influence; group by subject with section titles; most important top-left | `[GB-1][CBN-2][PP-2]` |

### 5.2 Trailing-12-month grid (metrics as rows, months as columns)

What the references do: the reference product shows 20+ metric rows in blocks by 12 month columns, newest first,
with an info icon per row and only Print / CSV; no totals, goals, comparison, filters, drill-down or month-to-date
marker; numbers are left-aligned with inconsistent decimals; the per-provider version stacks one unaligned table
per provider (L). Jarvis builds trailing-twelve-month trends and prior year into its operations views; Dentrix
Ascend's collection report shows the current month plus the past 11 (T) `[JAR-2][ASC-6]`.

| Aspect | Rule (*Recommended*) |
|---|---|
| Structure | Sticky first column (metric + info icon), sticky header (months), metric blocks with headings (Production, Collections, Patients, Schedule, Hygiene, Treatment) |
| Order | Toggle oldest-to-newest / newest-first; remember per user |
| Open period | Current month marked "MTD" with a distinct header style; optional projected month-end |
| Extra columns | Total or average (per metric type), YTD, prior-year same month, goal, variance, sparkline |
| Grain and range | Month by default; switch to week or quarter; range 6 / 12 / 13 / 24 periods |
| Formatting | Right-aligned tabular numerals, unit per row, central formatters; "no data" and "not configured" never render as 0 |
| Heat shading | Optional, relative to each row (as retention grids do `[MP-2]`), respecting polarity |
| Reconciliation | Parts sum to totals; show "Other / unassigned" rows instead of hiding residuals (L) |
| Period status | Closed, open and restated periods are distinguishable; a restated cell carries a note (L) |
| Drill | Every cell opens the records for that metric and month |
| Provider variant | One grid with provider as an outer row group or a provider switcher, aligned columns, hide-inactive switch, practice total row |
| Compare mode | Side-by-side offices or providers for one metric (rows = entities, columns = months) |
| Output | CSV, XLSX and PDF that keep the block structure and the parameter block |

### 5.3 Provider scorecards and leaderboards

| Source | What it shows |
|---|---|
| Dental Intelligence Provider Pulse | Per provider: production, production per hour / day / visit, same-day share, collections, perio and acceptance rates, hygiene reappointment (T) `[DI-3]` |
| Dental Intelligence Scorecards | User-built scorecards with a focus dimension (locations, providers, procedure codes, referral sources, carriers, team members); rows expand into drill-downs; toggles for goal indicators, trend indicators (linear regression, green / red), rounding on screen while exports keep decimals, industry benchmarks; chart tabs for performance and trends; defaults "last week" with 3 previous periods `[DI-6]` |
| Jarvis | Scorecards highlighting the top and bottom 20% (T) `[JAR-1]` |
| Legacy analytics (DPA) | Provider breakdown with Top 15 / Bottom 15 / All (T) `[DEN-1]` |
| Practice by Numbers | Provider leaderboard on the huddle page (T) `[PBN-5]` |

Rules (*Recommended*): normalise before ranking (per hour, per day, per visit) and show the denominator; let the
viewer choose the rank metric; show rank movement vs the prior period; keep a "peer median" reference line; decide
visibility explicitly (a provider sees own numbers and anonymised peers unless granted more); always include an
unassigned row; a provider scorecard links to that provider's trailing-12-month grid.

### 5.4 Chart patterns for dental questions

| Pattern | Dental use | Design rules | Evidence |
|---|---|---|---|
| Heatmap | Schedule utilisation: weekday x hour, or provider / operatory x day | Single-hue sequential scale, darkest = highest in light theme; value and denominator on hover; a table alternative; click a cell to open that slot list | `[CBN-3][W3C-8]`; *Recommended* |
| Funnel | Treatment acceptance: diagnosed, presented, accepted, scheduled, completed, collected | Bars show converted (solid) and dropped (lighter) per step; table with step counts, overall conversion and average time between steps; trend view dashes periods whose conversion window is still open; click a step to list the patients behind it (the way Mixpanel opens the users behind a chart segment) | `[AMP-1][MP-3][MP-1]`; diagnosed / accepted / scheduled / completed stages per (T) `[DEN-1]`; presented and collected stages are *Recommended* additions |
| Cohort / retention grid | New-patient cohorts by first-visit month x months since: returned for recare, still active | Rows = cohorts with a size column; columns = periods; shading relative to the row; in-progress cells marked and excluded from averages; weighted average row | `[MP-2]` |
| Aging stacked bars | A/R by bucket (current, 30, 60, 90, 120+) split patient / insurance; claims aging | Ordered buckets; status colours with labels; click a segment for responsible-party or claim detail | (T) `[DEN-1]`; `[CBN-3]` |
| Expected-range band | Daily production, no-shows, new patients | Shaded normal band from history; outlier points get a "why" entry | `[MP-1][TB-1]` |
| Comparison bars | Offices or providers vs goal | Same colour per series across the dashboard; legends in the same place on every chart | `[CBN-2]` |
| Annotations | Fee-schedule change, provider leave, office closure, system migration | Markers on time axes with a list panel to create, edit, filter; must not hide data | `[SH-5][MP-1][CBN-2]` |

Chart selection: prefer the fastest-read form; avoid pie and area for comparisons; do not vary chart type for
variety `[GB-1]`. Categorical palettes are applied in a fixed order designed for neighbour contrast; alert colours
(red, orange, yellow, green) are reserved for status `[CBN-3]`.

### 5.5 Customisable layouts

| Product | Mechanism | Source |
|---|---|---|
| Shopify | Customize mode with a metrics-library sidebar (grouped by category, searchable, sortable); drag or click to add; drag handle to move; drag the corner to resize; remove with X; named sections that can be added, renamed, reordered, collapsed and deleted; Reset to default; Save. Each card can be added once. Editing is desktop-only; the result also appears on mobile | `[SH-3]` |
| Stripe | Home overview: Add, tick widgets, Apply; Edit to remove | `[ST-3]` |
| Dental Intelligence | Templates are editable; saving creates a personal copy; column order by dragging headers | `[DI-6]` |
| Pencil & Paper | Drag-and-drop reorder and show / hide for dashboards people live in; personalisation pays off when personas diverge | `[PP-2]` |

Rules (*Recommended*): ship role defaults first; phase 1 customisation = show / hide and reorder cards within fixed
sections; phase 2 = free grid with resize; standard dashboards are locked and duplicated to customise; layouts are
stored per user on the server with an organisation default; an explicit edit mode with Save / Cancel / Reset; no
editing on mobile.

### 5.6 Role-based default dashboards

See section 2.4. Each default is a template record with an audience; users may pick any template their rights
allow and set it as home. Access can be provisioned by module, brand, office or region as in Jarvis (T) `[JAR-2]`.

### 5.7 Goals and targets

| Source | Mechanism |
|---|---|
| Shopify targets | Create target: metric (plus one optional filter), amount, time period (weeks, months, quarters, years or custom; default current month), auto-generated name, live preview gauge, add to dashboard. Statuses Draft / In progress / Achieved / Not achieved / Upcoming. Fixed amounts only (no growth rates or ratios); duplicates rejected `[SH-8]` |
| Power BI goals | A goal needs a current value and a final target; check-ins with notes; sub-goals up to four levels; goal-level permissions; daily snapshots of history `[PBI-4]` |
| Tableau Pulse | Goals from a data field or a manual value; thresholds with an unfavourable range that triggers alerts; pace-to-goal insight `[TB-1]` |
| Dental Intelligence | Automatic production goal = provider production-per-hour goal x scheduled clinical hours (T) `[DI-3][DI-4]` |
| Legacy Dentilytics | Provider daily goals entered up to 13 months ahead, with autofill of working days from the provider schedule (T) `[DEN-6]` |
| Legacy analytics (DPA) | Goal-attainment colour bands; collections target of 95% of production (T) `[DEN-1]` |

Rules (*Recommended*): a Goals page with a matrix editor (rows = office or provider, columns = months) and fill
tools (copy last year plus x%, spread an annual figure by working days, derive from scheduled hours); goal types
amount, rate and count; an inline "set goal" on any KPI card with a preview gauge; bands and polarity declared per
metric; goal history kept so past periods are judged against the goal in force at the time; who may edit goals is
a separate right.

### 5.8 Dashboard filters, cross-filtering, freshness

- Global filters (scope, period, comparison, provider role) in a fixed header; local filters inside a module only
  when that module needs a different scope; every card must respond to a global filter or say that it does not
  `[PP-2][PP-3]`.
- Cross-filtering: clicking a chart value updates a dashboard filter `[MB-10]`; filtering or zooming one chart
  updates related charts `[CBN-2]`.
- Freshness is visible: Shopify states the dashboard is updated within about a minute and report pages show a
  last-refreshed time with a 60-second auto-refresh `[SH-2][SH-6]`.
- Insight strip above the cards for generated callouts (section 8).

---

## 6. Scheduling, sharing, export, print

### 6.1 Subscriptions in comparable products

| Capability | Metabase `[MB-1][MB-8]` | Power BI `[PBI-2]` | Stripe `[ST-2]` |
|---|---|---|---|
| Entry point | Dashboard menu, right sidebar | Subscribe button, side pane | Schedule on a report page |
| Frequency | Hourly, daily, weekly, monthly (alerts down to every minute or cron) | Hourly, daily, weekly, monthly (incl. last day), after data refresh; start and end date, default one year | Daily, weekly, monthly |
| Recipients | Users or any e-mail address; domain allow-list on paid plans; Slack | Users, mail-enabled groups; external recipients only on certain capacities | The user (e-mail notification, then download) |
| Parameters | Per-subscription filter values (paid) | "Include my changes" (filters, slicers, drill state, bookmarks); per-subscription parameters for paginated reports | Columns and currency per schedule |
| Content | Charts in body; tables show the first 20 rows; CSV / XLSX attachments; optional PDF of the dashboard; attachments-only mode | Snapshot image and link; optional full-report PDF or PowerPoint (up to 50 pages, under 25 MB); toggles for link, preview image and granting view permission | CSV download |
| Conditions | Skip when there are no results; alerts for "has results", goal-line crossing, progress goal | Delivery after refresh | - |
| Test | Send now | Run now (rate-limited per hour) | - |
| Limits | Attachment default 1,048,575 rows; alert CSV over 10 MB omitted | 24 subscriptions per item; 60-minute execution limit | - |
| Governance | All subscriptions visible in usage analytics (paid); alerts keep working if the creator is deactivated | Workspace admins can edit and take over; audit log fields; warning that the mailed image reflects the owner's row-level access; sensitivity labels not applied to the preview image | - |

Other evidence: Tableau Pulse sends digests by e-mail, Slack and Teams daily, weekly or monthly, plus off-cycle
alerts when a followed metric crosses an unfavourable threshold `[TB-1]`; Square e-mails daily, monthly and annual
sales summaries, configurable by the account owner `[SQ-1]`; Dental Intelligence e-mails daily / weekly / monthly
role reports and Jarvis e-mails the huddle and end-of-day report (T) `[DI-9][JAR-1]`. Looker schedule conditions
("send if there are results", "results changed") [unverified].

### 6.2 Rules for our subscriptions (*Recommended*)

| # | Rule |
|---|---|
| S1 | Subscribe from the report or dashboard header; the panel pre-fills from the current view and shows a plain summary ("Every Monday 7:00, office time - Last week - 3 offices - PDF") |
| S2 | A schedule references a saved view (tokens, not dates), so "last week" stays last week |
| S3 | Recipients are users, roles or offices; each recipient's copy is evaluated with that recipient's rights, or delivery is limited to recipients whose scope covers the owner's. Never mail a snapshot rendered with the owner's wider scope `[PBI-2]` |
| S4 | The e-mail carries a non-PHI summary and a login-gated link to the stored run; attachments are an explicit organisation-level policy (see the architecture document) |
| S5 | Options: skip when empty, format, time zone, start / end date with expiry reminders, pause |
| S6 | "Send test to me" before saving; every delivery is logged with status and a link to its snapshot |
| S7 | A Schedules page lists mine; admins see all, can pause, edit and take over; deactivating a user triggers an ownership prompt rather than silently continuing `[PBI-2][MB-8]` |
| S8 | Alerts are schedules with a condition: any rows, metric crosses a threshold, goal off pace `[MB-8][TB-1]` |
| S9 | In-app delivery too: a notification entry "report ready" with a link; a notifications endpoint exists and no notification centre is in the nav yet (L) |

### 6.3 Export

| Rule | Evidence |
|---|---|
| Three shapes: current view (visible columns, grouping, pivot), full detail (all columns), summary only | `[SH-7][PBI-1]` |
| Formatted vs raw values as an option | `[MB-4]` |
| The file starts with a parameter block: report, run time, as-of, parameters, user, row count | `[PBI-1]` |
| The file states truncation when a limit was hit | `[PBI-1]` |
| CSV text beginning with `=`, `@`, `+` or `-` is neutralised against formula injection | `[PBI-1]` |
| Exports honour rights and are audited; export can be disabled per report or role | `[PBI-1]` |
| Formats: CSV, XLSX, PDF first; machine formats later | `[SH-7]` |
| Large exports run in the background and are delivered as a notification and link | `[ST-2]`; section 9.3 |

### 6.4 Snapshot links

Grafana snapshots are copies that strip queries and keep only visible values, with expiry choices of 1 hour, 1
day, 1 week or never, and a list where they can be deleted `[GF-1]`. For us (*Recommended*): a snapshot is a
stored run - immutable rows, parameters and as-of time - viewable only by signed-in users whose rights cover it,
with an expiry and a banner "Snapshot of <date> - open live report".

### 6.5 Print-friendly output

- House convention: generate a PDF (server first), never call the browser print dialog; there is no print
  stylesheet in the app (L, fe_cross_cutting TL;DR 5 and 14).
- PDF layout: report title and parameter block, column headers repeated on each page, group headers kept with
  their rows, optional page break per group, subtotals and grand totals, "page n of m", run time and user.
- Options dialog: orientation, paper size, detail level, page break per group, include charts.
- Shopify and Metabase rely on browser or screenshot PDFs `[SH-7][MB-4]`; Metabase notes server-side PDF generation
  can take a minute or more `[MB-1]` - treat PDF as a background-capable export.
- CSS paged media (`@page` size, margins, margin boxes) exists but margin-box support varies `[MDN-1]`; use only
  as a fallback.

---

## 7. Custom report builder

### 7.1 What comparable builders look like

| Product | Flow and notable details | Source |
|---|---|---|
| Metabase query builder | Ordered steps: data (table, model, metric or saved question), join, custom column, filter, summarise with breakouts, sort, row limit. Each step has a preview of the first 10 rows. One click visualises; the generated SQL can be viewed. A curated library can be the default data picker | `[MB-6]` |
| Looker Explore | Field picker grouped by view into dimensions and measures, with search over labels and descriptions and an info icon showing type, description and field name; "fields in use" tab; pivots, totals and subtotals as switches; Run to update; query progress tracker | `[LK-2]` |
| Shopify | Default reports are the templates; a right-hand configuration panel (metrics, dimensions, filters, visualisation) stays in sync with a query editor; up to 4 metrics per supported visualisation; an assistant can write the query from a prompt | `[SH-5]` |
| Dental Intelligence Scorecards | Pick a focus dimension, then metrics, time range and comparison; 24 templates; save as a new scorecard | `[DI-6]` |
| Dentrix Ascend Power Reporting | Two builder families: pivot-style analysis and row-level interactive reports, each with pre-built starting points; reviewers find it confusing and report different numbers from different paths | (T) `[ASC-3][ASC-R1]` |
| Stripe Sigma | SQL environment with templates and an assistant; results can become tracked metrics (up to 20 reports across metric groups) | `[ST-4]` |
| Mixpanel Insights | Metrics, filter (global or per metric), breakdown; at most 40 blocks; saved metrics and behaviours | `[MP-1]` |
| Salesforce report builder | Report types, bucket fields, preview on limited rows [unverified] | - |

### 7.2 Rules for our builder (*Recommended*)

| # | Rule | Why |
|---|---|---|
| B1 | Start from a template: "Customise" on any standard report opens the builder on a copy | `[SH-5][DI-6]` |
| B2 | Two modes only: **List** (row-level) and **Summary** (group + measures, optional pivot) | (T) `[ASC-3]` two-mode builder; keeps the mental model small |
| B3 | Curated datasets (patients, appointments, procedures, ledger transactions, claims, treatment plans, recall, payments), each with a described field list; no free SQL for end users | `[MB-6][LK-2]`; architecture document |
| B4 | Field picker: dimensions vs measures, search over name and description, info icon with definition, "in use" tab | `[LK-2]` |
| B5 | Measures come from the governed metric registry; custom formulas are limited to arithmetic on measures at first | (T) `[ASC-R1]`; `[LK-1]` |
| B6 | Live preview on a small sample after every change; full run only on Run | `[MB-6]` |
| B7 | Filters reuse the runner's parameter controls; any filter can be promoted to a run-time parameter | consistency |
| B8 | Guardrails: mandatory date filter on fact datasets, row and pivot caps, at most 4 measures per chart, a cost estimate before Run, timeouts with a "narrow your filters" message | `[MB-5][LK-3][LK-2][SH-5][MP-1]` |
| B9 | Saved custom reports carry a Custom badge, an owner, sharing and the dataset version; they appear in the catalog under My reports and can be favourited and scheduled like standard reports | `[MB-7][SH-5]` |
| B10 | Sensitive fields are governed in the dataset, not hidden in the UI | `[MB-2]` |
| B11 | An AND / OR group editor only in an advanced filter mode | `[PP-3]` |
| B12 | "Explain" affordance: show the structured definition of what will be queried, in words | section 8 |

---

## 8. AI and natural-language UX

### 8.1 What shipped products do

| Product | Behaviour | Source |
|---|---|---|
| Looker Conversational Analytics | Grounded in the semantic model: the engine composes the query from the model, so the assistant does not write SQL; authors add instructions, glossaries and verified question-answer examples; dashboard-scoped agents; thumbs feedback; explicit caution to validate output. Limits: questions answerable by one visualisation; no forecasting, correlation or anomaly detection; 50,000 rows per query | `[LK-1]` |
| Snowflake Cortex Analyst | Verified query repository: question + query pairs inside the semantic model, with who verified and when; some are flagged as onboarding (suggested) questions; the API reports when a verified query was used | `[SF-1]` |
| Databricks Genie | Thumbs feedback routed to authors; benchmark questions to score accuracy; prefer example queries and expressions over long text instructions; start with few tables (five or fewer recommended, 50 maximum) | `[DBX-1]` |
| Tableau Pulse | Insights are detected statistically (pace to goal, unexpected values with an expected band, record-level outliers, correlated metrics, a contributor breakdown showing 7 members expandable to 50); a language model writes the summary of followed metrics; an Ask button searches detected insights and offers suggested follow-ups; a forecast is hidden when confidence is low | `[TB-1]` |
| Metabase Metabot | Answers by building a normal query-builder chart the user can open and edit; generates and fixes SQL; analyses a chart; scope can be limited to a collection; suggested prompts; documented limits and a verify-the-output caution | `[MB-11]` |
| Shopify | Assistant generates or edits the report query; automatically generated insights on the dashboard | `[SH-5][SH-2]` |
| Mixpanel | Expected-range band with a root-cause entry point on outliers | `[MP-1]` |
| Dental Intelligence | Scorecard assistant limited to the open scorecard, with suggested questions or free text; a conversational explorer with an explicit accuracy caveat; patient-list "AI filters" that translate a sentence into existing filters | `[DI-6]`; (T) `[DI-7][DI-8]` |
| Dentrix Ascend, Practice by Numbers, reference product | Plain-language "ask" features announced or shipped; scope of the reference product's assistant is undocumented | (T) `[ASC-8][PBN-7]`; (L) |
| Power BI Copilot / Q&A | [unverified] | - |

Research on trust: citations make answers look more reliable while users rarely open them; step-by-step
"reasoning" is often after-the-fact rationalisation; disclaimers in footers or behind icons are skipped;
first-person, human-sounding narration inflates trust. Recommended: put the source next to the claim it supports,
label it descriptively, state limits in plain language near the input, keep the tone neutral `[NNG-8]`.

### 8.2 Pattern catalogue

| Pattern | Rule (*Recommended* unless sourced) |
|---|---|
| Ask bar | On Reports Home (whole catalog) and on each dashboard / report (scoped to what is open). Scoped assistants are easier to trust `[DI-6][LK-1]` |
| Suggested questions | 4-6 curated starters per scope, drawn from verified question-query pairs; follow-up suggestions after each answer `[SF-1][TB-1][MB-11]` |
| Sentence to filters | First AI feature: translate a sentence into the existing parameter controls and show them filled in for confirmation before Run (T) `[DI-8]` |
| Answer anatomy | (1) the question as understood, (2) the result, (3) metric definition used, (4) parameters applied (dates, offices, providers, date basis), (5) data freshness, (6) "open as report" to inspect and edit, (7) feedback |
| Verified marker | Answers produced from a registered metric or a verified question show a Verified marker with who verified and when; everything else is labelled Exploratory `[SF-1][MB-7]` |
| How calculated | Show the structured query in words and as chips, not a narrated chain of thought `[NNG-8][LK-1]` |
| Explain this number | On any KPI or cell: definition, top contributors, change vs prior period, drivers. Computed deterministically; the model only phrases it `[TB-1]` |
| Anomaly callouts | Expected-range bands and threshold alerts; show only above a confidence bar; each callout links to its drill list `[MP-1][TB-1]` |
| Narrative summary | A short digest at the top of the home and in subscriptions, built from pre-computed insights; every sentence links to its number `[TB-1]` |
| Fail loudly | If the question cannot be mapped to registered metrics, say so and offer the nearest reports instead of guessing (rationale and sources in the architecture document; Looker's design of composing the query from the model rather than writing SQL is the same idea `[LK-1]`) |
| Disclaimers | One plain sentence beside the input and during onboarding, not in a footer `[NNG-8]` |
| Tone | Neutral and factual; no first-person "thinking" `[NNG-8]` |
| Privacy | Send definitions and aggregates to the model; row-level patient data stays out unless a compliant endpoint and policy say otherwise (architecture document) |
| Feedback loop | Thumbs with reason; negative feedback creates a review item; a benchmark set of questions is re-run on every model or registry change `[DBX-1]` |

---

## 9. Accessibility, responsive, perceived performance, freshness, definitions

### 9.1 Accessibility (WCAG 2.2 AA and ARIA practices)

| Requirement | Application to this module | Source |
|---|---|---|
| 1.4.11 Non-text contrast: 3:1 for UI components and for the parts of graphics needed to understand them; exception when labels / values or a table provide the same information | Bars, lines, slices, heatmap cells and focus rings need 3:1 against neighbours, or the chart ships with visible values or a "show as table" switch | `[W3C-1]` |
| Complex images need a short description plus a long description; a data table is an accepted long form | Every chart has a generated one-line summary and a table view of the same data | `[W3C-8]` |
| 1.4.10 Reflow at 320 CSS px: data tables are exempt as two-dimensional content, but headings, filters, pagination and cell contents are not | The parameter bar, chips, KPI header and pager must reflow; the table scrolls inside its own container | `[W3C-2]` |
| 2.5.8 Target size: at least 24 x 24 CSS px, with spacing and inline exceptions | Sort buttons, chips' remove buttons, row checkboxes, expand toggles, column-menu triggers | `[W3C-3]` |
| 4.1.3 Status messages announced without moving focus | "Running", "1,284 rows returned", "No results", "Export ready" in a polite live region; errors as alerts only when they do not take focus | `[W3C-4]` |
| 2.4.11 Focus not obscured: a focused element must not be fully hidden by author content | Sticky headers, sticky total footers and the bulk-action bar need scroll padding | `[W3C-5]` |
| Table vs grid | The grid role is for interactive or editable cells, with one tab stop and arrow-key navigation; read-only results should stay native tables (our reading of the pattern). When rows are virtualised, expose total row / column counts and indices | `[W3C-6]` |
| Sortable headers | Header text inside a button; `aria-sort` on the sorted column only; sort glyphs hidden from assistive tech; the caption explains sorting once | `[W3C-7]` |
| Charts | Recharts 3 turns its accessibility layer on by default `[RC-1]`; ECharts can generate an aria description and apply decal patterns, both opt-in `[EC-2]`; audit with the Chartability heuristics (50 tests, 14 in the quick set) `[CH-1]` | as cited |
| Colour | Do not encode meaning by colour alone; add icons, text, patterns or line styles | `[PP-2]`; WCAG 1.4.1 [unverified in this session] |
| Motion | Skeleton shimmer and chart animation respect reduced-motion settings | `[NNG-4]` notes animation can cause problems; *Recommended* |

### 9.2 Responsive and mobile

| Element | Mobile behaviour | Evidence |
|---|---|---|
| Dashboards | Single column; top section first; cards keep value, delta and sparkline; charts simplify | `[PP-2]` |
| Customisation | Not available on mobile; desktop layout is inherited | `[SH-3]` |
| Tables | Locked header row and locked first column, horizontal scroll signalled by a cut-off column, a column chooser, accordions for attribute groups; never require rotation | `[NNG-7]` |
| Worklists | Row-as-card with the primary action (call, text) exposed | `[NNG-7]`; *Recommended* |
| Filters | Collapsed behind a filter button showing the active count; batch apply | `[PF-1][NNG-1][PP-3]` |
| Push and digest | Notifications for threshold crossings; home-screen widget for favourite metrics | `[TB-1]` |
| Huddle on phones | Dental Intelligence's mobile app exposes the huddle; treat the huddle as the first mobile surface | (T) `[DI-2]`; *Recommended* |

App-specific: the global compact scale (`html { zoom: 0.75 }`) shrinks effective target and text sizes and breaks
raw viewport and pointer maths; size and position must go through the existing helpers (L). Treat the 24 px
target rule as 24 effective px after scaling (*Recommended*; interpretation, not sourced).

### 9.3 Perceived performance

| Wait | Feedback | Source |
|---|---|---|
| Up to 0.1 s | None; feels instantaneous | `[NNG-3]` |
| Up to 1 s | None needed; flow of thought preserved | `[NNG-3]` |
| 1-10 s | Skeleton for a full page; spinner for a single module; avoid indicators under 1 s | `[NNG-4][NNG-5]` |
| Over 10 s | Percent-done or step indicator with explanatory text and a time estimate; a clear way to cancel; let people do something else | `[NNG-3][NNG-5]` |

Patterns:

- **Background runs**: after about 10 s, or immediately for `cost_class = background`, the run detaches. The user
  sees it in a "Runs" tray, gets an in-app notification and can open the stored result later. Stripe's scheduled
  reports follow the same notify-then-download model `[ST-2]`. Our API client has no request timeout and the access
  token can expire during a long call, which today ends in a forced logout (L) - long reports must not be a single
  blocking request.
- **Streaming rows**: render the first page as soon as it arrives, keep the KPI header in skeleton until totals
  land, never reorder rows already shown.
- **Cached result first**: reopening a report shows the last run with its as-of time and a Refresh button instead
  of blocking.
- **Optimistic layout changes**: column, density and grouping changes apply instantly on the client when the data
  is already loaded; only parameter changes need the server.
- Progress indicators raise tolerance for waiting but do not replace making the report fast `[NNG-5][NNG-4]`.

### 9.4 Data freshness indicators

| Product | Indicator | Source |
|---|---|---|
| Shopify | Dashboard updated within about a minute; report pages show a last-refreshed time and auto-refresh every 60 seconds; icons on metrics during data disruptions | `[SH-2][SH-6][SH-5]` |
| Stripe | Financial reports: a day's data is normally available by noon the next day (stated as within 12 hours); custom SQL exposes the timestamp data is loaded through | `[ST-2][ST-4]` |
| Dentrix Ascend | "Data as of" control showing last and next sync (T, snippet) | `[ASC-10]` |
| Dental overlays and legacy analytics | Nightly sync; mismatches with the practice system are the top complaint (T) | `[DI-13][DEN-2][DEN-4]` |

Rules (*Recommended*): every result and card shows "as of" time and source class (live ledger, intraday summary,
nightly summary); summary-backed numbers offer "open live report"; open periods are marked; when a summary refresh
is late or failed, cards show a warning icon instead of stale numbers presented as current.

### 9.5 Metric definitions

- An info icon on every metric label opens: name, plain-language definition, formula, date basis, attribution rule
  (which provider / office gets credit), inclusions and exclusions, version and last change. The reference
  dashboards carry an icon per row but the text is not public (L); Looker's field info shows type, description and
  field name `[LK-2]`; Practice by Numbers puts value, status, target and percentiles in a hover panel `[PBN-6]`.
- A glossary page lists every metric with search and "used in" links.
- Labels say gross or net explicitly; the reference labels hide "net" (L).
- Reconciliation notes ("why this differs from the day sheet") live with the definition; vendors publish separate
  reconciliation articles for exactly this (T) `[DI-13][DI-14][DEN-4]`.
- Definition versions are shown when a period was computed under an older definition (L).

---

## 10. React technology options

Versions and licences from the npm registry on 2026-11-22 (R) unless another key is given. Our stack: React
19.2.3, Tailwind 4, Recharts ^3.6.0, no table library, no virtualisation, no grid layout, no drag-and-drop
library, shadcn / Radix wrappers installed but mostly unused, global `zoom: 0.75` (L).

### 10.1 Charts

| Library | Latest (published) | Licence | React peer | Notes |
|---|---|---|---|---|
| Recharts | 3.11.0 (2026-11-17); 3.0.0 on 2025-06-23 | MIT | 16.8-19 | Already in the app (L). v3 rewrote internal state, turns the accessibility layer on by default, lets wrapped custom components work, adds a tooltip portal, automatic Y-axis width and (from 3.4) a z-index system `[RC-1]`. Runtime dependencies include Redux Toolkit, react-redux, immer and a d3 vendor bundle (R). SVG rendering; heatmap / calendar primitives absent [unverified] |
| shadcn/ui chart | copy-paste, no package | - | - | Thin container, config, tooltip and legend around Recharts; targets Recharts 3; themed by CSS variables; the container needs an explicit height `[SC-1]`. A copy already sits unused in the app (L) - check that it matches the Recharts 3 version of the snippet |
| Apache ECharts | 6.1.0 (2026-05-19); 6.0.0 on 2025-07-30 | Apache-2.0 | none (framework-agnostic); wrapper `echarts-for-react` 3.1.0, MIT | v6 adds a token-based default theme, runtime theme switching, a matrix coordinate system, chord and beeswarm series, broken axes and reusable custom series `[EC-1]`. Opt-in aria descriptions and decal patterns `[EC-2]`. Canvas rendering and a broad type catalogue (heatmap, calendar, funnel, sankey, treemap) [unverified - not re-read] |
| visx | 4.0.0 (2026-06-11); 3.12.0 on 2024-11-07 | MIT | 18-19 | Low-level, unopinionated primitives picked per package (`@visx/heatmap` exists) `[VX-1]`. Most control, most work |
| Nivo | 0.99.0 (2025-05-23); nothing newer in about 18 months | MIT | 16.14-19 | Ready-made heatmap and calendar packages; depends on react-spring, d3, lodash (R). Release-cadence risk |
| Tremor npm (`@tremor/react`) | 3.18.7 (2025-01-13); nothing newer | Apache-2.0 | `^18.0.0` only | Peer range excludes React 19 (R) |
| Tremor copy-paste | repository, no npm version | Apache-2.0 | manifest: React ^18.3.1, Tailwind ^4.1.3, Recharts ^2.15.2 | 35+ dashboard components on Tailwind + Radix; joined Vercel on 2025-01-22; blocks made free `[TR-1][TR-2][TR-3][TR-4]`. Chart code targets Recharts 2, so it needs porting to our Recharts 3. Good design reference for KPI cards, bar lists, trackers, spark charts |
| MUI X Charts | 9.18.1 (2026-11-16) | MIT core; Pro / Premium commercial | 17-19 | Needs MUI Material and Emotion as peers (R) - heavy for a Tailwind codebase |
| AG Charts | community 14.3.0 MIT; enterprise 14.3.0 commercial | - | - | Powers AG Grid integrated charts `[AG-1]` |
| Others | Chart.js 4.6.1 MIT; Highcharts 13.1.1 commercial; Observable Plot 0.6.19 ISC; uPlot 1.6.32 MIT; Victory 38.1.1 MIT | - | - | Not evaluated |

### 10.2 Tables and grids

| Library | Latest (published) | Licence | React peer | Capability notes |
|---|---|---|---|---|
| TanStack Table (`@tanstack/react-table`) | 9.3.1 (2026-10-12); 9.0.0 on 2026-08-04; last v8 is 8.21.3 (2025-04-14) | MIT | 18+ | Headless: sorting, pagination, filtering, faceting, grouping, aggregation, row expansion, row and cell selection, cell spanning, row and column pinning, column ordering, visibility, resizing. v9 registers features individually (tree-shakable) and backs state with TanStack Store. Works with client-side processing or server-supplied rows `[TS-1][TS-2]`. No pivot UI. Virtualise with `@tanstack/react-virtual` 3.14.26 (MIT) |
| AG Grid Community | 36.3.0 (2026-11-04); a major roughly every six months (33 in 2024-12, 34 in 2025-06, 35 in 2025-12, 36 in 2026-06) | MIT | 16.8-19 | Sorting, filtering, pagination, cell rendering, theming, accessibility, row and column virtualisation; client-side and infinite row models `[AG-1][AG-3]` |
| AG Grid Enterprise | 36.3.0 | Commercial | - | Adds row grouping, aggregation, pivoting, master / detail, server-side row model (lazy groups, server aggregation), viewport row model, range selection, enhanced clipboard, Excel export, tool panels, custom context menu; integrated charts via the Enterprise bundle `[AG-1][AG-3]`. Licensing: every front-end developer on the project needs a licence; perpetual with one year of updates; the online store covers 1-10 developers for internal applications; customer-facing applications must contact sales; 30-day trial; prices are not on the page `[AG-2]` |
| MUI X Data Grid | 9.18.0 (2026-11-13) | MIT core; Pro and Premium commercial, annual | 17-19 plus MUI and Emotion | Pro adds multi-filter, multi-sort, column pinning; Premium adds row grouping and Excel export; a missing or invalid key shows a watermark `[MUI-1]`. Pivoting in Premium [unverified] |
| Glide Data Grid | 6.0.3 (2024-02-03); only alpha tags since | MIT | published peers: React 16.12 / 17 / 18, plus lodash, marked, a carousel package | Canvas grid for very large row counts with native scrolling, editing, merged cells, frozen columns; the authors state accessibility may have flaws. The README on the main branch says React 16-19, the published package does not `[GDG-1]` (R) |
| react-data-grid | 7.0.0-beta.64 (2026-11-05); the "latest" tag is a beta | MIT | ^19.2 | (R) |
| Material React Table / Mantine React Table | 3.2.1 (2025-03) / 1.3.4 (2025-02) | MIT | 18+ | Tied to MUI / Mantine (R) [unverified details] |
| Handsontable | 18.1.3 (2026-11-20) | custom licence | - | Spreadsheet-style; not evaluated (R) |

### 10.3 Pivot options

| Option | Licence | Notes |
|---|---|---|
| Pivot on the server, render with TanStack Table | MIT | Columns generated from the response; one code path for pivots and metric x period grids; totals and caps enforced server-side. *Recommended* |
| AG Grid Enterprise pivoting | Commercial | Client-side or with the server-side row model `[AG-1][AG-3]` |
| Perspective (`@perspective-dev/client` 5.9.4, 2026-11-20; earlier `@finos/perspective` 3.8.0) | Apache-2.0 | WebAssembly query engine, custom-element UI with drag-and-drop configuration, WebGL charts, virtual servers that push queries to DuckDB, ClickHouse, PostgreSQL or Polars; React wrapper `[PSP-1]` (R). Powerful, but its own UI idiom and a large payload |
| react-pivottable 0.11.1 (2026-03-13; previous release 2020-11-19) | MIT | Client-side drag-and-drop pivot (R); long release gap [unverified features] |
| WebDataRocks 1.4.9 (2023-11-07) | Proprietary free licence | Flexmonster-owned; filtering, grouping, formatting, export to PDF / Excel / HTML; React wrapper `[WDR-1]` (R); data-size limits [unverified] |
| Flexmonster 2.9.143 (2026-11-16) | Commercial | (R) |
| MUI X Data Grid Premium | Commercial | [unverified] |

### 10.4 Supporting libraries

| Need | Option | Facts (R) unless keyed |
|---|---|---|
| Dashboard grid | react-grid-layout 2.3.0 (2.0.0 on 2025-12-09), MIT | TypeScript rewrite; hooks for container width, layout and responsive layouts; per-breakpoint layouts; serialise and restore; a position strategy for scaled containers; `/legacy` entry for the v1 API; React 18+ `[RGL-1]` |
| Dashboard grid (alt) | gridstack 14.1.1, MIT | Framework-agnostic |
| Drag and drop | `@dnd-kit/core` 6.3.1 (2024-12), MIT; `@dnd-kit/react` 0.5.3 (2026-10-31), pre-1.0, React 18 / 19 | For column chooser, card reorder, builder |
| Date range | react-day-picker 10.0.2 (10.0.0 on 2026-05-08), MIT; the app has ^9.13 (L) | Depends on date-fns |
| Date maths | date-fns 4.4.0, MIT | Only transitive in the app today (L) |
| URL state | react-router search params (in the app) or nuqs 2.10.3, MIT | nuqs features [unverified] |
| Advanced filter builder | react-querybuilder 8.28.0, MIT, React 18+ | Pulls in Redux Toolkit |
| Command palette / search | cmdk | Installed, unused (L) |
| Split panes | react-resizable-panels 4.24.1, MIT | Installed (L) |
| Client spreadsheet writer | exceljs 4.4.0, MIT; SheetJS on npm is 0.18.5 from 2022-03-24 | Prefer server-side XLSX (architecture document) |
| Chart to image | html-to-image 1.11.13, MIT | Only if charts in PDFs are not rendered server-side |
| Accessible primitives (alt) | react-aria-components 1.22.1, Apache-2.0 | [unverified features] |

### 10.5 Recommendation (*Recommended*)

1. **Tables**: TanStack Table rendering native table markup, plus TanStack Virtual for long lists. It fits the
   hand-rolled Tailwind style, keeps table semantics, and leaves sort / filter / group / pivot / paging on the
   server. Decide between v9 (current, but only months old, so pin an exact version) and the last v8.
2. **Charts**: stay on Recharts 3 behind one chart wrapper (adopt the shadcn container already in the repo).
   Hand-roll the simple marks - sparkline, bullet / progress bar, CSS-grid heatmap, funnel bars - as small
   accessible components. Add ECharts 6 lazily only if a spike shows a real need (dense heatmaps, thousands of
   points).
3. **No AG Grid Enterprise by default.** It would give grouping, pivoting, server-side rows and Excel export in
   one package, but needs a commercial licence for every front-end developer, a sales quote for a customer-facing
   product, and a second visual system. Re-evaluate only if the TanStack build exceeds its estimate.
4. **Dashboard layout**: begin with fixed sections plus show / hide and reorder; add react-grid-layout 2 for free
   placement later, after a spike under the compact scale.
5. **Tremor and shadcn blocks**: design references, not dependencies.
6. **Spike before committing**: anything that measures pointers or elements (drag, resize, canvas hit-testing,
   tooltips, virtualisation) must be tested under `zoom: 0.75`; canvas libraries are the highest risk
   [unverified - no source covers this combination].

---

## 11. Recommended UX blueprint

Route names are illustrative; align them with the existing `/reports/*` routes inventoried in
`../analysis/fe_existing_reports.md` section 1.1.

| Page type | Route (illustrative) | Purpose |
|---|---|---|
| Reports Home | `/reports` | Find and launch: catalog, search, role-based start, ask bar |
| Report Runner | `/reports/r/:report_key` | Parameterise, run, read, drill, act, export, save view, subscribe |
| Run snapshot | `/reports/runs/:run_id` | Immutable stored result |
| Dashboards | `/reports/dashboards/:dashboard_key` | Monitor KPIs, trailing-12-month grid, scorecards |
| Builder | `/reports/builder/:custom_report_id?` | Create or customise a report |
| Schedules | `/reports/schedules` | Manage subscriptions and alerts, delivery history |
| My reports | `/reports/mine` | Favorites, saved views, recents, shared with me, custom reports |
| Goals | `/reports/goals` | Targets per office / provider / period |
| Glossary | `/reports/glossary` | Metric definitions |

### 11.1 Reports Home

```
+------------------------------------------------------------------------------------------------+
| Reports                    [ Search reports, metrics, legacy names        Ctrl+K ]  [ Ask ... ] |
+----------------------+-------------------------------------------------------------------------+
| Favorites        (7) | For you  (role: Office manager)                        [change start]   |
| Recents              | [Day sheet] [Production MTD vs goal] [A/R aging] [Claims aging] [...]   |
| My saved views       | Continue: last runs - name - parameters - as of - [Re-run] [Open]       |
| Shared with me       |-------------------------------------------------------------------------|
| Scheduled        (3) | Catalog   [All] [Daily] [Financial] [Insurance] [Patients] [Clinical]   |
| -------------------- |           [Scheduling] [Management] [Lists and letters]                 |
| Dashboards           | Filters: audience v  output v  standard/custom v      Sort v   List|Grid|
| Builder              |-------------------------------------------------------------------------|
| Goals                | [star] Production by Provider     Standard   Financial - Summary        |
| Glossary             |        What did each provider produce, by code or category?             |
| Which report? guide  |        Also known as: Production by Provider Detail / Summary           |
|                      |        Last run by you 2 d ago - Last month - 3 offices   [Run] [...]   |
+----------------------+-------------------------------------------------------------------------+
```

- Left rail = personal lists and module destinations; main = role start + catalog.
- Search results group as Reports, Dashboards, Metrics (glossary), My saved views.
- Card menu: Run, Open with last parameters, Favorite, Schedule, Customise (copy to builder), Definition.
- Rules: H1-H12.

### 11.2 Report Runner

```
[< Reports]  Production by Provider  [star]  Standard   (i)        View: Month-end by office v  [Modified]
                                                    [Save v] [Share] [Schedule] [Export v] [...]
--------------------------------------------------------------------------------------------------------
[Date: Last month v] [Compare: Prior year v] [Scope: 3 offices v] [Providers: All v] [More options (2)]
                                                                                   [Reset]  [ Run ]
Chips: Date basis: service date x | Include inactive providers x | Clear all
--------------------------------------------------------------------------------------------------------
As of Nov 22 09:12 - live ledger - 1,284 rows - 2.1 s - office time zone                    [Refresh]
+----------------+ +----------------+ +----------------+ +----------------+ +----------------+
| Gross prod.    | | Adjustments    | | Net production | | Collections    | | Collection %   |
+----------------+ +----------------+ +----------------+ +----------------+ +----------------+
[Table] [Chart] [Pivot]   Group by: Provider > Category v   Detail: Summary v   Density v  Columns (3 hidden) v
+------------------------------------------------------------------------------+------------------+
| Provider / Category        |   Gross |    Adj. |     Net |  vs PY |  % total | Drill / row      |
| v Dr. A (12)               |  84,210 |  -6,120 |  78,090 |  +4.1% |    31.2% | side panel       |
|     Restorative            |  ...                                             | (records behind  |
|   Subtotal                 |                                                  |  the clicked     |
| ...                        |                                                  |  number, export) |
| Grand total (sticky)       | 269,880 | -19,440 | 250,440 |  +2.7% |   100.0% |                  |
+------------------------------------------------------------------------------+------------------+
Rows 1-200 of 1,284 - totals reflect all rows                                  [Export CSV] [XLSX] [PDF]
```

Zones and rules: header (identity, view, actions); parameter bar (section 3); chips; run context line; KPI header;
view controls; table; footer; side panel. States per section 4.7. For worklist reports a selection bar replaces
the footer when rows are selected ("187 selected - Send text - Send letter - Add to follow-up - Create task").

### 11.3 Dashboards

```
[Dashboard: Practice overview v]   Scope v   Period: MTD v   Compare: Prior year v   Role: All v
                                                 Updated 09:10 - intraday   [Customize] [Subscribe] [...]
[Insights: Hygiene reappointment is 6 pts below goal - 14 patients left without a next visit >]
+-------------+ +-------------+ +-------------+ +-------------+ +-------------+ +-------------+
| Net prod.   | | Collections | | Coll. %     | | New pts     | | Case accept.| | A/R > 90    |
+-------------+ +-------------+ +-------------+ +-------------+ +-------------+ +-------------+
Trailing 12 months                                   [Months v] [12 v] [Oldest first v] [Export]
| Metric (i)              | Dec | Jan | ... | Oct | Nov MTD | Avg | YTD | Goal | Var | Trend |
| Production                                                                                    |
|   Gross production      |                                                                     |
|   Net production        |                                                                     |
| Collections ...                                                                               |
Providers                 [Rank by: Net prod. per hour v]      Schedule utilisation (heatmap)
| # | Provider | value | vs peers | trend |                    weekday x hour
Treatment acceptance (funnel)                                 A/R aging (stacked bars)
```

- Global filter header applies to every card; a card that cannot honour a filter says so (5.8).
- Standard dashboards: Today (huddle), Office performance, Practice overview, Provider scorecard, Group overview,
  Hygiene / recall, A/R and claims, Treatment.
- Customize enters an explicit edit mode (5.5).

### 11.4 Builder

```
[< My reports]  Untitled report   Custom      Mode: (List) (Summary)      [Run] [Save v]   est. 12k rows
+---------------------------+----------------------------------------------+-----------------------+
| Dataset: Procedures v     | 1 Columns     [Patient] [Date] [Code] [+]    | Visualise             |
| Search fields ...         | 2 Filters     Date: Last month (required)    |  Table | Bar | Line   |
| Dimensions                |               Office: working office   [+]   |  Pivot                |
|   Patient (i)             | 3 Group by    Provider > Category     [+]    | Format                |
|   Provider (i)            | 4 Measures    Net production, Count   [+]    |  columns, totals,     |
| Measures                  | 5 Sort/limit  Net production desc            |  conditional rules    |
|   Net production (i)      |----------------------------------------------|                       |
|   Procedure count (i)     | Preview (first 10 rows, sample)              |                       |
+---------------------------+----------------------------------------------+-----------------------+
```

Rules B1-B12. Saving lands the report in My reports with a Custom badge; Run opens it in the normal runner.

### 11.5 Schedules

```
Schedules   [Mine | All (admin)]   Status v   Report v                              [New schedule]
| Name | Target and view | Owner | Recipients | When | Next run | Last run | Format | On/Off | ... |
| Monday production | Production by Provider - Month-end by office | me | 2 roles | Mon 07:00 | ... |
Row menu: Send test to me, Edit, Pause, Transfer ownership, Delete, Delivery history
Detail panel: history (time, status, recipients, link to snapshot), failure reason, edit form
```

Rules S1-S9.

### 11.6 My reports (Favorites and saved content)

Tabs: **Favorites** (starred reports, dashboards and views), **Saved views** (mine, with report, parameter
summary, default flag, sharing), **Recents**, **Shared with me**, **Custom reports**. Row actions: Open, Run,
Rename, Duplicate, Share, Set as default, Schedule, Delete. This page is the modern form of the legacy My Reports
and My Favorites entries (L). Favorites also appear in the left rail of Reports Home and in the command palette.

### 11.7 Cross-cutting interaction rules

| # | Rule |
|---|---|
| R1 | One parameter component set for runner, dashboards, builder, schedules and AI confirmations |
| R2 | Reports run on explicit Run unless `cost_class = instant`; dashboards apply live (3.1) |
| R3 | Parameters are tokens; resolved values are always displayed (3.2) |
| R4 | Office scope uses the app's single office model, is sent explicitly per call, and is never a hidden filter (L) |
| R5 | URL carries full state; ids only, no personal data (3.6) |
| R6 | Precedence: URL, saved view, last-used, definition default (3.4) |
| R7 | Views, favourites, layouts and schedules are stored server-side (3.5) |
| R8 | Totals are computed by the server over the full result; caps are stated on screen and in files (4.8) |
| R9 | Every aggregate drills to records; every record links to its real screen (4.5) |
| R10 | Old results stay visible but dimmed while parameters are stale; never mix (3.1) |
| R11 | Waits over 10 s detach into background runs with notification (9.3) |
| R12 | Every number has an info icon with its definition and an as-of time (9.4, 9.5) |
| R13 | Standard vs Custom is always visible; editing a standard report creates a copy (2.2) |
| R14 | Colour follows metric polarity and is never the only signal (4.4) |
| R15 | Missing data renders as "no data" or "not configured", never as zero (5.2) |
| R16 | Parts reconcile to totals; residuals appear as an explicit row (5.2) |
| R17 | Deliveries respect each recipient's rights; e-mails carry links, not patient data, unless policy allows (6.2) |
| R18 | Actions from lists are confirmed with counts and exclusions, run as jobs and write back outcomes (4.6) |
| R19 | Read-only results use native table semantics; status changes are announced; focus is never hidden under sticky regions (9.1) |
| R20 | AI answers come from registered metrics, show definition, parameters and freshness, and can be opened as a normal report (8.2) |
| R21 | All sizes and pointer maths go through the compact-scale helpers; PDFs are generated, not printed from the browser (L) |
| R22 | Runs, views, exports, deliveries and bulk actions are audited (architecture document) |

### 11.8 Shared component inventory

| Component | Used by | Existing starting point (L) |
|---|---|---|
| Parameter bar, date-range picker, scope picker, entity multi-selects, chips | Runner, dashboards, builder, schedules | Schema-driven params form in Utilities; async `EntityPicker`; `DualListPicker`; `ScopeToggle`; provider option groups; `reportRange.ts` presets |
| Results table (sticky, grouped, pivot, virtualised) | Runner, drill panel, grid, scorecards | None shared today; closest is the treatment-plan grid |
| KPI card, sparkline, progress / bullet bar | Runner header, dashboards, home | `KpiStat`, `WidgetCard` |
| Chart wrapper | Everywhere | `ReportChart`, unused shadcn chart wrapper |
| Metric x period grid | Dashboards, provider scorecards | New (reuse the results table) |
| Drill side panel | Runner, dashboards | New |
| Run tray and notifications | Global | Utilities run shell and status badge; notifications endpoint; messaging socket for "run finished" |
| Save view / share / schedule dialogs | Runner, dashboards | New; preferences endpoints for storage |
| Definition popover and glossary | Everywhere | New |
| Ask bar and answer card | Home, dashboards | Markdown renderer exists |

### 11.9 Suggested UX delivery order

| Step | Scope |
|---|---|
| 1 | Catalog as data, Reports Home (search, categories, favourites, recents), Report Runner with shared parameter components, server-paged table with totals, export, URL state, server-side saved views |
| 2 | Drill side panel, grouping and subtotals, pivot / matrix component, definitions popover and glossary, freshness line |
| 3 | Dashboards: KPI cards, trailing-12-month grid, provider scorecards, goals page, role defaults |
| 4 | Background runs, run tray, notifications, schedules, snapshots, PDF layouts |
| 5 | Worklist actions (bulk SMS / letter / task) with outcome tracking |
| 6 | Builder (List and Summary) on curated datasets |
| 7 | AI: sentence-to-filters, explain-this-number, insight strip, ask bar |
| 8 | Dashboard customisation, benchmarks across offices, mobile huddle |

---

## 12. Gaps, risks and unverified items

1. No web search in this session; coverage is limited to pages whose URLs were known. QuickBooks Online, SAP
   Fiori, Looker scheduling, Polaris date-range pattern, Power BI Copilot / Q&A, Toast and Salesforce were not
   verified.
2. Tableau Pulse facts come from a release-notes style page reached by redirect; the dedicated insight-type
   reference was not read.
3. Some vendor facts are summaries produced by an automated reader; exact UI labels may differ.
4. AG Grid's price and its licence terms for a customer-facing SaaS are not public on the pricing page.
5. Behaviour of chart, grid and drag libraries under the app's global `zoom: 0.75` is untested and undocumented.
6. TanStack Table v9 has been stable for about three months; API stability beyond that is unproven. The feature
   list was read from the project site, not from the v9 guides.
7. Glide Data Grid, Tremor npm, Nivo and react-pivottable show long release gaps; registry dates are facts, the
   maintenance outlook is an inference.
8. Recharts and ECharts chart-type coverage, renderers and performance ceilings were not re-read in this session.
9. Mobile dashboard patterns in Power BI (separate phone layout) and several BI products were not verified.
10. WCAG 1.4.1 (use of colour) and reduced-motion guidance were not fetched; the colour rule is supported here by
    a secondary design article.
11. Zebra striping guidance conflicts between two reputable sources; the rule in 4.2 is a judgement.
12. Consent and regulatory rules for bulk text messages launched from report lists were not researched.

---

## 13. Sources

### 13.1 Usability research and design systems
- [NNG-1] https://www.nngroup.com/articles/applying-filters/
- [NNG-2] https://www.nngroup.com/articles/data-tables/
- [NNG-3] https://www.nngroup.com/articles/response-times-3-important-limits/
- [NNG-4] https://www.nngroup.com/articles/skeleton-screens/
- [NNG-5] https://www.nngroup.com/articles/progress-indicators/
- [NNG-6] https://www.nngroup.com/articles/empty-state-interface-design/
- [NNG-7] https://www.nngroup.com/articles/mobile-tables/
- [NNG-8] https://www.nngroup.com/articles/explainable-ai/
- [CBN-1] https://carbondesignsystem.com/patterns/filtering/
- [CBN-2] https://carbondesignsystem.com/data-visualization/dashboards/
- [CBN-3] https://carbondesignsystem.com/data-visualization/color-palettes/
- [PF-1] https://www.patternfly.org/patterns/filters/design-guidelines
- [PP-1] https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables
- [PP-2] https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards
- [PP-3] https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering
- [GB-1] https://www.geckoboard.com/best-practice/dashboard-design/

### 13.2 Shopify
- [SH-1] https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports
- [SH-2] https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/overview-dashboard
- [SH-3] https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/overview-dashboard/customizing-overview-dashboard
- [SH-4] https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types
- [SH-5] https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/reports-overview
- [SH-6] https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/custom-reports/time-ranges
- [SH-7] https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/report-types/custom-reports/export-reports
- [SH-8] https://help.shopify.com/en/manual/reports-and-analytics/shopify-reports/overview-dashboard/targets

### 13.3 Stripe, Square
- [ST-1] https://docs.stripe.com/reports
- [ST-2] https://docs.stripe.com/reports/options
- [ST-3] https://docs.stripe.com/dashboard/basics
- [ST-4] https://docs.stripe.com/data/how-sigma-works
- [SQ-1] https://squareup.com/help/us/en/article/5072-summaries-and-reports-from-the-online-square-dashboard

### 13.4 Metabase
- [MB-1] https://www.metabase.com/docs/latest/dashboards/subscriptions
- [MB-2] https://www.metabase.com/docs/latest/questions/visualizations/table
- [MB-3] https://www.metabase.com/learn/metabase-basics/querying-and-dashboards/questions/drill-through
- [MB-4] https://www.metabase.com/docs/latest/questions/exporting-results
- [MB-5] https://www.metabase.com/docs/latest/dashboards/filters
- [MB-6] https://www.metabase.com/docs/latest/questions/query-builder/editor
- [MB-7] https://www.metabase.com/docs/latest/exploration-and-organization/content-verification
- [MB-8] https://www.metabase.com/docs/latest/questions/alerts
- [MB-9] https://www.metabase.com/docs/latest/exploration-and-organization/exploration
- [MB-10] https://www.metabase.com/docs/latest/dashboards/interactive
- [MB-11] https://www.metabase.com/docs/latest/ai/metabot

### 13.5 Power BI, Looker, Tableau, Snowflake, Databricks, Grafana
- [PBI-1] https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-export-data
- [PBI-2] https://learn.microsoft.com/en-us/power-bi/collaborate-share/end-user-subscribe
- [PBI-3] https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-drillthrough
- [PBI-4] https://learn.microsoft.com/en-us/power-bi/create-reports/service-goals-introduction
- [LK-1] https://docs.cloud.google.com/looker/docs/conversational-analytics-overview
- [LK-2] https://docs.cloud.google.com/looker/docs/creating-and-editing-explores
- [LK-3] https://docs.cloud.google.com/looker/docs/reference/param-explore-always-filter
- [TB-1] https://docs.salesforce.com/tableau/current/en-us/online/pulse_intro.md (redirect target of https://help.tableau.com/current/online/en-us/pulse_intro.htm)
- [SF-1] https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-analyst/verified-query-repository
- [DBX-1] https://docs.databricks.com/aws/en/genie/best-practices
- [GF-1] https://grafana.com/docs/grafana/latest/dashboards/share-dashboards-panels/

### 13.6 Product analytics tools
- [MP-1] https://docs.mixpanel.com/docs/reports/insights
- [MP-2] https://docs.mixpanel.com/docs/reports/retention
- [MP-3] https://docs.mixpanel.com/docs/reports/funnels/funnels-quickstart
- [AMP-1] https://amplitude.com/docs/analytics/charts/funnel-analysis/funnel-analysis-interpret
- [LIN-1] https://linear.app/docs/insights

### 13.7 Dental products read directly in this session
- [DI-6] https://intercom.help/dental-intel/en/articles/12002695-scorecards
- [PBN-6] https://help.practicenumbers.com/en/articles/9980232-cross-practice-statistics-panel

### 13.8 Accessibility and web platform
- [W3C-1] https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- [W3C-2] https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- [W3C-3] https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- [W3C-4] https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- [W3C-5] https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- [W3C-6] https://www.w3.org/WAI/ARIA/apg/patterns/grid/
- [W3C-7] https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/
- [W3C-8] https://www.w3.org/WAI/tutorials/images/complex/
- [CH-1] https://chartability.fizz.studio/
- [MDN-1] https://developer.mozilla.org/en-US/docs/Web/CSS/@page

### 13.9 Technology
- (R) npm registry, package documents at https://registry.npmjs.org/<package> read on 2026-11-22 for: recharts,
  echarts, echarts-for-react, @visx/visx, @visx/heatmap, @nivo/core, @nivo/heatmap, @nivo/calendar, @tremor/react,
  @tanstack/react-table, @tanstack/react-virtual, ag-grid-community, ag-grid-react, ag-grid-enterprise,
  ag-charts-community, ag-charts-enterprise, @glideapps/glide-data-grid, react-data-grid, @mui/x-data-grid,
  @mui/x-data-grid-pro, @mui/x-data-grid-premium, @mui/x-charts, @mui/x-charts-pro, material-react-table,
  mantine-react-table, handsontable, react-pivottable, webdatarocks, flexmonster, @finos/perspective,
  @perspective-dev/client, react-grid-layout, gridstack, @dnd-kit/core, @dnd-kit/react, react-day-picker, date-fns,
  nuqs, react-querybuilder, react-resizable-panels, exceljs, xlsx, html-to-image, react-aria-components, chart.js,
  highcharts, @observablehq/plot, uplot, victory
- [RC-1] https://github.com/recharts/recharts/wiki/3.0-migration-guide
- [SC-1] https://ui.shadcn.com/docs/components/chart
- [EC-1] https://echarts.apache.org/handbook/en/basics/release-note/v6-feature/
- [EC-2] https://echarts.apache.org/handbook/en/best-practices/aria/
- [VX-1] https://github.com/airbnb/visx
- [TR-1] https://www.tremor.so/
- [TR-2] https://vercel.com/blog/vercel-acquires-tremor
- [TR-3] https://github.com/tremorlabs/tremor
- [TR-4] https://raw.githubusercontent.com/tremorlabs/tremor/main/package.json
- [TS-1] https://tanstack.com/table/latest
- [TS-2] https://github.com/TanStack/table
- [AG-1] https://www.ag-grid.com/react-data-grid/community-vs-enterprise/
- [AG-2] https://www.ag-grid.com/license-pricing/
- [AG-3] https://www.ag-grid.com/react-data-grid/row-models/
- [MUI-1] https://mui.com/x/introduction/licensing/
- [GDG-1] https://github.com/glideapps/glide-data-grid
- [RGL-1] https://github.com/react-grid-layout/react-grid-layout
- [PSP-1] https://github.com/perspective-dev/perspective
- [WDR-1] https://www.webdatarocks.com/

### 13.10 Attempted, not retrievable (claims about these are [unverified])
- https://www.sap.com/design-system/fiori-design-web/ui-elements/filter-bar/ (HTTP 403)
- https://quickbooks.intuit.com/learn-support/en-us/help-article/report-management/customize-reports-quickbooks-online/L4TLIQ5GZ_US_en_US (HTTP 403)
- https://docs.cloud.google.com/looker/docs/looker-scheduler (HTTP 404)
- https://polaris.shopify.com/patterns/date-picking/date-range (redirects to an unrelated page)
- https://tanstack.com/table/latest/docs/introduction (HTTP 404)

### 13.11 Carried over from the sibling teardown (T) - not re-fetched here
- [DI-2] https://intercom.help/dental-intel/en/articles/12002688-morning-huddle
- [DI-3] https://intercom.help/dental-intel/en/articles/12002677-provider-pulse
- [DI-4] https://intercom.help/dental-intel/en/articles/12002675-performance-board
- [DI-5] https://intercom.help/dental-intel/en/articles/12002668-collections-board
- [DI-7] https://educate.dentalintel.com/en/articles/15192785-explorer
- [DI-8] https://educate.dentalintel.com/en/articles/14111673-patient-finder-filters-and-common-searches
- [DI-9] https://intercom.help/dental-intel/en/articles/12003267-general-reports
- [DI-11] https://educate.dentalintel.com/en/articles/16149827-september-1-2026-product-updates
- [DI-13] https://intercom.help/dental-intel/en/articles/635747-reports-in-dentrix
- [DI-14] https://intercom.help/dental-intel/en/articles/909502-reports-in-eaglesoft
- [PBN-2] https://practicenumbers.com/business-analytics/revenue-iq/
- [PBN-3] https://practicenumbers.com/business-analytics/enterprise-dashboard/
- [PBN-5] https://help.practicenumbers.com/en/articles/10630289-updated-huddle-page
- [PBN-7] https://practicenumbers.com/pbn-ai/ops-ai/
- [JAR-1] https://jarvisanalytics.com/
- [JAR-2] https://www.jarvisanalytics.com/how-to-use-jarvis/
- [ASC-3] https://learn.dentrixascend.com/courses/administrative-essentials/lessons/power-reporting/topic/power-reporting-overview/
- [ASC-6] https://learn.dentrixascend.com/production-collection-and-growth-how-did-you-do-last-year/
- [ASC-8] https://www.henryscheinone.com/about-us/press-release/dentrix-ascend-opens-mcp-layer/
- [ASC-9] https://learn.dentrixascend.com/courses/administrative-essentials/lessons/power-reporting/topic/deciding-which-report-to-use-in-dentrix-ascend/
- [ASC-10] https://learn.dentrixascend.com/tag/power-reports
- [ASC-R1] https://www.capterra.com/p/177828/Dentrix-Ascend/reviews/
- [ES-1] https://pattersonsupport.custhelp.com/euf/assets/Eaglesoft/Reports/Reporting_and_Date_Based_Reporting_Attendee_Handout.pdf
- [ES-3] https://pattersonsupport.custhelp.com/app/answers/detail/a_id/13796/~/guide-to-finding-the-optimal-eaglesoft-report
- [DEN-1] https://support.planetdds.com/hc/en-us/articles/49789717199771-Understanding-the-Denticon-Practice-Analytics-Dashboards-A-Complete-Guide-to-Metrics-and-Reports
- [DEN-2] https://support.planetdds.com/hc/en-us/articles/13934611697947
- [DEN-4] https://support.planetdds.com/hc/en-us/articles/49834771623067
- [DEN-6] https://support.planetdds.com/hc/en-us/articles/360003797371-How-am-I-able-to-understand-the-information-within-Dentilytics-Basic
- [DEN-7] https://support.planetdds.com/hc/en-us/articles/4408457645723-How-to-understand-the-new-reports-menu
- [DEN-8] https://support.planetdds.com/hc/en-us/articles/43708103359259
- [DEN-12] Planet DDS help-center articles on My Favorites, the file-size error and named reports; article ids are
  listed in `competitor_analytics_teardown.md` section 9

### 13.12 Local documents (L)
- `../analysis/fe_existing_reports.md` - current Reports / Dashboard / My Page code, runner defects, server endpoints
- `../analysis/fe_cross_cutting.md` - stack, compact scale, office scope, provider directory, rights, reusable pieces
- `../analysis/reference_screenshots.md` - legacy menu and the reference "Main Dashboard" / "Provider Dashboard"
- `competitor_analytics_teardown.md`, `reporting_architecture_options.md`, `dental_kpi_dictionary.md` - sibling research
