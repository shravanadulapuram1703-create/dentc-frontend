# Charting Setup — Backend → Frontend Handoff (Perio Templates · Restorative Color · Restorative Materials)

> Companion to `charting_setup_backend_devreport.md`. Captures the legacy Denticon
> "Charting" setup screens as **screens to (re)build in our app**, in the existing
> application format — same master/list patterns as `ProcedureCodeSetup` /
> `ExplosionCodeSetup`. Data field names are **snake_case**, bound directly to the
> backend DTOs (no camelCase aliases).

Routes (Setup → Charting submenu — these are the **live paths in `App.tsx`**):

- `/setup/charting/colors` — Restorative Charting Color Setup ✅ **shipped**
  ([RestorativeColorSetup.tsx](../../src/components/setup/charting/RestorativeColorSetup.tsx))
- `/setup/charting/materials` — Restorative Charting Materials Setup ✅ **shipped**
  ([RestorativeMaterialSetup.tsx](../../src/components/setup/charting/RestorativeMaterialSetup.tsx))
- `/setup/charting/per-use-templates` — Perio Setup Templates ✅ **shipped**
  ([PerioTemplateSetup.tsx](../../src/components/setup/charting/PerioTemplateSetup.tsx))

| Screen | Data source | Build state |
|---|---|---|
| Restorative Colors | `chart-colors` (Orval tag **metadata**) | ✅ **shipped** |
| Restorative Materials | `chart-materials` (Orval tag **procedures**) | ✅ **shipped** |
| Perio Templates | `perio-chart-templates` (Orval tag **clinical**) | ✅ **shipped** — CHART-1 delivered |

> Shared FE-static catalogs live in
> [chartingAssets.ts](../../src/components/setup/charting/chartingAssets.ts) (colour
> palette + pattern catalog + `fmtDateTime`) and the render components in
> [chartingSwatches.tsx](../../src/components/setup/charting/chartingSwatches.tsx)
> (`ColorSwatch`, `PatternSwatch`).

---

## SCREEN 1 — Restorative Charting Color Setup  *(build now)*

A single-table read-grid with an inline "Edit Chart Colors" panel below it (no KPIs),
matching the legacy layout.

**Grid columns:** Condition · Stroke Color · Fill Color · Sample · Modified By · Modified On

**Data source:** `GET /api/v1/chart-colors` → `ChartColorRead`. Bind:

| Column | Field |
|---|---|
| Condition | `name` |
| Stroke Color | `stroke_color` |
| Fill Color | `fill_color` |
| Sample | render a swatch from `stroke_color` (border) + `fill_color` (fill) |
| Modified On | `updated_at` |
| Modified By | `created_by` *(see open question — not yet the true last editor)* |

**Edit panel:** select a row → Condition shown read-only, Stroke Color + Fill Color as
dropdowns, live Sample swatch, Save / Cancel. `PATCH /api/v1/chart-colors/{id}` with
`{ stroke_color, fill_color }`.

- The Stroke/Fill **color options are a fixed FE palette** (Blue, Green, Firebrick,
  Red, DarkGreen, HotPink, SpringGreen, Pink, Purple, Black, …). Keep this list in the
  FE — it's presentation, not business data. (Confirm with backend, see open questions.)
- No add/delete in the legacy screen — the condition set is fixed. Edit-only.
- Extra DTO fields (`fill_type`, `fill_color2`, `fill_pattern`, `gradient_angle`,
  `gradient_method`, `category_type`) belong to the chart renderer — **don't surface**
  on this screen.

---

## SCREEN 2 — Restorative Charting Materials Setup  *(build now)*

Single-table read-grid + an "Add New Chart Material" row below.

**Grid columns:** Name · Sample · Modified By · Modified On

**Data source:** `GET /api/v1/chart-materials` → `ChartMaterialRead`. Bind:

| Column | Field |
|---|---|
| Name | `name` |
| Sample | render the SVG fill pattern keyed by `pattern` (× `color`) |
| Modified On | `updated_at` *(⚠ not present yet — CHART-3a)* |
| Modified By | *(not present yet — CHART-3b)* |

**Add / edit:** Name text input + Sample = pattern dropdown (keys: `hash`, `round`,
`r5hash`, `r6hash`, `r2hash`, `r4hash`, `round1`, `crosshatch`, `r3hash`, `sealant`,
`veneer`, …). `POST /api/v1/chart-materials` `{ name, pattern }`;
`PATCH /{id}`; `DELETE /{id}` (hard delete — registered `soft_field=None`).

- The **pattern catalog is an FE asset** (key → SVG preview); `pattern` stores the key
  string. (Confirm, see open questions.)
- ⚠ Until CHART-3a/3b ship, the **Modified On / Modified By columns have no data** —
  either hide them or show "—" and unhide once the backend lands.

---

## SCREEN 3 — Perio Setup Templates  *(✅ shipped)*

A named-template manager: left rail list of templates (`+ ADD TEMPLATE`, search),
right pane "Template Info" + "Auto Advance Direction", footer `EDIT TEMPLATE` /
`DELETE TEMPLATE`, "Modified On / Modified By" stamp. Built as
[PerioTemplateSetup.tsx](../../src/components/setup/charting/PerioTemplateSetup.tsx),
reusing the `ReferralSetup` master-detail pattern (left rail + view/add/edit modes
in the detail pane). CHART-1 was delivered, so this is now live, not a placeholder.

**Data source:** `GET/POST/PATCH/DELETE /api/v1/perio-chart-templates` →
`PerioChartTemplateRead` / `…Create` / `…Update` (Orval tag **Clinical**). Full CRUD
live-verified at :5173.

**Binding (snake_case, direct to the DTOs):**

Template Info: `name` · `show_mgj` (checkbox) · `pd_warning_level` ·
`cal_warning_level` · `bp_level` · `ip_level` · `fgm_level` (level dropdowns
`PERIO_LEVEL_OPTIONS`) · `start_voice` (checkbox).
Auto Advance Direction: `auto_advance` JSON, 8 keys (`ur_facial`, `ul_facial`,
`ul_lingual`, `ur_lingual`, `ll_facial`, `lr_facial`, `lr_lingual`, `ll_lingual`),
each a `"01-08"`-style two-way radio toggle. The region structure / level option
list live FE-static in [chartingAssets.ts](../../src/components/setup/charting/chartingAssets.ts)
(`PERIO_AUTO_ADVANCE_REGIONS`, `PERIO_DEFAULT_AUTO_ADVANCE`, `fmtDirection`).
Stamp: `updated_at`/`created_at` (Modified On) + `updated_by`/`created_by` (Modified By).

- ⚠ **CHART-1a:** `created_by`/`updated_by` are numeric user FKs, so "Modified By"
  currently renders the **id**, not a name. Swap to a name once the backend exposes it.
- ⚠ **CHART-1b:** new tenants start with an empty list (no default template seeded);
  the empty state covers this until `seed_chart_defaults` lands.

---

## Action items for the frontend

1. ✅ **Done** — Setup → Charting submenu already wired (`GlobalNav.tsx`); routes in `App.tsx`.
2. ✅ **Done** — Screens 1 & 2 built against `chart-colors` / `chart-materials`, reusing the
   `PlaceOfServiceSetup` single-table master/edit pattern (snake_case, generated Orval client).
3. ✅ **Done** — color palette + pattern catalog kept as FE static assets in `chartingAssets.ts`.
4. ✅ **Done** — Materials screen shows `created_at` under "Modified On" and "—" for
   "Modified By" (annotated CHART-3a/3b); unhide once the audit columns ship.
5. ✅ **Done** — Perio Templates screen built against `perio-chart-templates` (CHART-1
   delivered); `PerioTemplateSetup` replaces the former `PlaceholderPage` in `App.tsx`.
   Full CRUD live-verified. Remaining: "Modified By" shows the user id (CHART-1a) and
   new tenants start empty (CHART-1b).

## Open questions back to backend

1. Color palette (Screen 1) and pattern catalog (Screen 2) — OK to keep FE-static, or
   do you want them backend-served (e.g. a `definitions` group)?
2. "Modified By" — will you add `modified_by` to `chart_colors` / `chart_materials`
   (CHART-2a / CHART-3b)? Until then we bind `created_by` / show "—".
3. ✅ Resolved — `perio-chart-templates` shipped with `auto_advance` as JSON (CHART-1).
   Open follow-ups: surface a user *name* for Modified By (CHART-1a) and seed a default
   template (CHART-1b).
4. Default seeding for new tenants (CHART-2c / CHART-3d) — will `seed_chart_defaults`
   ship so the grids aren't empty?
