# Restorative ⇄ Perio Charting Integration — Backend Dev Report (`INTEG-*`)

**Modules:** Patient → Restorative Chart (`src/features/restorative/**`, `/patient/:id/restorative`) and
Patient → Perio Chart (`src/features/perio/**`, `/patient/:id/perio`).
**Shared seam:** `src/features/charting/toothStatusBridge.ts` (new).
**Date:** 2026-09-04 · **Verified against:** live backend `127.0.0.1:8000` (OpenAPI 1.0.0), patient `83867`, exam `2847`.

This report is the hand-off for the backend team. Section 1 explains what the frontend now does so the
gaps make sense; Section 3 is the list of backend changes requested. IDs `INTEG-*` are stable — please
reference them in tickets/PRs. Earlier reports (`perio_charting_backend_devreport.md`,
`../restorative/restorative_charting_backend_devreport.md`) still apply; this one only covers the
*integration* between the two charts.

---

## 1. What is integrated now (frontend, shipped)

Both charts read the **same persisted rows** — `chart_conditions` and `patient_procedures` — so a change
made on one screen is visible on the other on its next load, on any workstation, without a client-side
message bus. Nothing new is stored outside the existing backend resources.

### 1.1 Restorative → Perio (tooth status, derived at read time)

| Restorative action | Source rows | Effect on the Perio Chart |
|---|---|---|
| Missing / Missing (space closed) / Congenitally Missing / Avulsion | `chart_conditions.condition_code` | Tooth column **locked**: number struck-through and labelled (MISS / EXTR / …), every measurement cell hatched and non-editable, keyboard and number-pad entry refused, auto-advance **skips** the tooth, carry-forward to a new exam drops the tooth, Graphical view greys the tooth and breaks the FGM/MGJ lines at the space, Print shows `(N)` + `X` cells, Compare greys the header. |
| Extraction charted as Pre-existing/Completed (`chart_as ≠ tx-plan`), or a completed extraction procedure (CDT D7111–D7251) | `chart_conditions` / `patient_procedures` | Same as missing (reason "Extracted"). A **planned** extraction (tx-plan) does *not* lock the tooth. |
| Bridge Pontic (incl. bridge/denture templates) | `chart_conditions` | Locked (reason "Bridge pontic"). |
| Impacted / Missing → "Unerupted Permanent" | `chart_conditions` (+ `tooth_status`/`sub=unerupted`) | Locked (not probeable). |
| Implant (condition, or completed D6010/6011/6012/6013/6040/6050) | `chart_conditions` / `patient_procedures` | Tooth stays probeable (peri-implant probing) and is marked **`Nⁱ`** (Open Dental / Dentrix convention); the **Furcation** row is locked for it; Graphical view draws the implant post; carry-forward drops furcation values on it. An implant placed in a previously missing/extracted site makes the site probeable again. |
| Crown / bridge abutment | `chart_conditions` / D2710–D2799, D6058–D6094 | Tooltip hint on the tooth number only. |
| Mobility charted by hand on the restorative chart | `chart_conditions` MOBILITY + `grade` | Shown as a grey *ghost* grade in the perio Mobility cell when the exam has no value (nothing is stored). |
| Dentition band ≠ Full Permanent, or Edentulous toggle | restorative chart settings (localStorage, REST-3) | Teeth outside the band / all teeth are locked (reason "Not in current dentition" / "Edentulous"). |

A status strip under the perio toolbar summarises this ("1 not probeable · 1 implant") with a tooltip
listing the teeth, plus a link to the Restorative Chart.

### 1.2 Perio → Restorative (clinical findings, written as `chart_conditions`)

After every debounced save of a tooth on the **latest live exam** (older or voided exams never write
back), the perio chart mirrors that tooth's findings onto the restorative chart:

| Perio finding | `chart_conditions` row written | Rendered on the restorative tooth |
|---|---|---|
| Mobility (max of buccal/lingual, 0.5-steps rounded up) | `MOBILITY`, `area=whole`, `grade=m1..m3` | `M1`/`M2`/`M3` badge on the crown |
| Furcation (max class over 6 sites) | `FURCATION` (new code), `area=root`, `grade=f1..f4` | Triangle at the furcation + `F<n>` |
| Recession (max positive FGM, mm) | `RECESSION`, `area=junction`, `grade=<n>mm` | Gingival-margin line drawn apical to the CEJ + `<n>mm` |

Rules: value > 0 → create, or update the grade of the tooth's existing row; value cleared → the
perio-managed row is set `is_inactive=true`; a hand-charted row of the same code on the tooth is
*adopted* (updated + tagged) rather than duplicated. Rows are tagged **`region="grade=m2;src=perio"`**
(interim, see INTEG-3) and carry `description="Mobility grade 2 (Perio exam 2026-06-22)"`,
`activity_date = exam_date`, `chart_as='pre-existing'`.

The restorative chart additionally reads the latest live exam (`/perio-exams` + `/perio-exam-details`)
to show a per-tooth **perio flag** on the tooth-number cell (red = PD ≥ 4 mm, bleeding, suppuration,
mobility ≥ 2 or furcation ≥ 2; green = probed and healthy; tooltip = "Perio 06/22/2026: PD max 6 mm ·
BOP 1 site · Mobility 1") and a **Perio** tab in Tooth History.

### 1.3 Live verification (2026-09-04, patient 83867)

- Restorative: tooth #3 → Missing → `POST /chart-conditions` 201. Perio: column #3 locked (16 hatched
  cells, tooltip "Missing — not probeable (Restorative Chart)"), strip "1 not probeable".
- Perio: Mobility on #2 = 1 → auto-advance **skipped #3** → landed on #4 = 2. Saves went to
  `/perio-exam-details` (201/200) and the write-back created `chart_conditions` 77711 (`tooth 2, MOBILITY,
  grade m1, region grade=m1;src=perio`) and 77712 (`tooth 4, m2`). Restorative chart then showed `M1`/`M2`
  badges, the grid rows "Mobility grade 2 (Perio exam 2026-06-22)", and Tooth History → Perio for #4.
- API-seeded `IMPLANT` on #30 → perio label `30ⁱ`, Furcation cells locked ("Furcation not applicable on an
  implant"), Graphical view drew the post and greyed #3 with the FGM line broken at the space.
- Test rows were removed afterwards (conditions 77710–77713 soft-deleted; exam 2847 restored).

---

## 2. Backend features already delivered that this work relies on (do not regress)

- `chart_conditions` first-class columns `grade`, `group_id`, `tooth_status`, `segment`, `root_segment`,
  `rct_fill`, `watch_*`, `updated_by/at` (REST-1/7/9) — the bridge writes `grade` first-class **and** the
  `region` encoding for backward compatibility; `toToothStates` prefers the column.
- `PerioExamDetailRead` now exposes `cal1..6`, audit columns and `created_by_name` (PERIO-BE-4/5/6);
  `PUT /perio-exams/{exam_id}/details` bulk upsert (BE-8); `GET /perio-exams/compare` (BE-10);
  `GET/PUT /perio-chart-settings/me` (BE-11). The frontend does not consume these yet (follow-up, not a gap).
- `mobility_buccal/lingual` are decimal now (returned as strings `"1.0"`, `"0.5"` accepted) — PERIO-BE-2 delivered.

---

## 3. Gaps & requested backend changes (prioritised)

### Priority 1 — integrity of the integration

**INTEG-1 — No canonical per-tooth status; presence is derived client-side.**
- Today the frontend decides "is tooth N in the mouth / an implant" by scanning `chart_conditions` codes
  (`MISSING`, `MISSING_CLOSED`, `CONGENITALLY_MISSING`, `AVULSION`, `EXTRACTION` when not tx-plan,
  `BRIDGE_PONTIC`, `IMPACTED*`, `IMPLANT`) **and** a hard-coded CDT range list over `patient_procedures`
  (`D7111–D7251` = extraction, `D6010/6011/6012/6013/6040/6050` = implant, `D2710–D2799`/`D6058–D6094` = crown)
  — see `toothStatusBridge.ts` `deriveToothStatuses`.
- Risk: three consumers (perio, claims' "missing teeth" box on the ADA form, scheduler/tx-plan gating)
  can drift; a new extraction code or a legacy-migrated row with a different code is silently "present".
- Ask: a server-owned per-tooth status, e.g. `GET /api/v1/patients/{id}/tooth-status` →
  `[{tooth:"3", status:"missing"|"present"|"implant"|"unerupted"|"pontic", reason_code, source:{type,id}, as_of}]`,
  recomputed whenever `chart_conditions` / `patient_procedures` change (or a `chart_teeth` table
  maintained by the same service). The frontend swaps `deriveToothStatuses` for this in one file.

**INTEG-2 — Perio details accept values for teeth that are charted missing; no "skipped" flag.**
- Evidence: `POST /perio-exam-details {exam_id:2847, tooth_no:"3", pd1:5}` succeeded while #3 carried an
  active `MISSING` condition (see probe result in §4). The lock is frontend-only.
- Ask: (a) validate against INTEG-1 status — reject (422) or at least flag probing rows on a missing
  tooth; (b) add `is_skipped boolean` (+ optional `skip_reason`) to `perio_exam_details` so a tooth a
  hygienist manually skips (Open Dental "Skip Teeth") persists across workstations instead of living in
  the browser.

**INTEG-3 — Perio → restorative write-back has no first-class provenance.**
- The mirrored `MOBILITY` / `FURCATION` / `RECESSION` rows are tagged with the interim `region`
  key-value `src=perio` and a free-text description naming the exam. The backend cannot tell them from
  hand-charted rows, and the sync logic (latest-exam-only, adopt-or-create, clear-on-zero) lives in the
  browser (`planPerioSync`).
- Ask: add `source_module string?` (`perio`) and `source_exam_id int? (fk perio_exams)` to
  `chart_conditions` (create/read/update) **and** add `FURCATION` to the documented `condition_code` enum
  (REST-1 list). Ideally own the sync server-side: on `perio-exam-details` create/update/bulk-upsert for
  the patient's latest non-voided exam, upsert those three condition rows; the frontend seam
  (`syncToothToRestorative` in `PerioChart.tsx`) is then deleted.

### Priority 2 — fidelity

**INTEG-4 — Dentition band / Edentulous are localStorage (REST-3), so their perio locks are per-workstation.**
- The perio chart reads the restorative `chart_settings` seam (`restorative:settings:<patient_id>`) to
  lock teeth outside the selected dentition band and all teeth when Edentulous is set. On another
  workstation the same patient shows all 32 teeth probeable.
- Ask: deliver REST-3 (`chart_settings` per patient: `dentition`, `edentulous`, `numbering_system`, …).
  This unblocks both charts at once.

**INTEG-5 — Mobility half-grades (PERIO-BE-2) — DELIVERED, closed.**
- Probe: `PATCH /perio-exam-details/78316 {mobility_buccal: 0.5}` → **200**, read back `"0.5"`. The
  frontend integer-only guard in `perioModel.detailBody` has been removed for `mobility_*` today, so
  half-grades now persist. `pd/fgm/mgj/furc` are still integer-only on the client (never needed).
  The mirrored `MOBILITY` grade rounds up (`0.5 → m1`, `1.5 → m2`, `2.5 → m3`) by design.

**INTEG-6 — Procedure codes carry no "tooth effect" metadata.**
- `procedure_codes` has `draw_as` (glyph) but nothing that says "this code makes the tooth missing /
  an implant / crowned". The frontend keeps CDT range regexes for that (INTEG-1).
- Ask: `tooth_effect string?` on `procedure_codes` (`extraction | implant | crown | pontic | none`),
  seeded for the D7xxx / D6xxx / D2xxx ranges — the same idea as Open Dental's *paint type*.

### Priority 3 — convenience

**INTEG-7 — `GET /perio-exams/compare` and any server print payload ignore tooth status.**
- Once INTEG-1 exists, comparison deltas and print output should mark/exclude teeth missing at each
  exam date rather than reporting a delta against an empty column.

**INTEG-8 — No change notification between screens.**
- Both charts refetch on mount; a perio tab left open while a colleague charts an extraction elsewhere
  stays stale until reload. Low priority: an `updated_since` filter on `chart-conditions` /
  `perio-exam-details` (or a websocket event) would let the screens poll cheaply.

---

## 4. Probe results (live, 2026-09-04)

| Probe | Result |
|---|---|
| `PATCH /perio-exam-details/78316 {mobility_buccal: 0.5}` | **200**, read back `"0.5"` ⇒ PERIO-BE-2 delivered (INTEG-5 closed) |
| `POST /perio-exam-details {exam_id:2847, tooth_no:"3", pd1:5}` with #3 charted `MISSING` | **accepted (201)** → INTEG-2 |
| `POST /chart-conditions {condition_code:"FURCATION", grade:"f2"}` (via UI write-back path) | accepted — code is free-text, not in the documented enum → INTEG-3 |

---

## 5. Frontend files touched (for reference)

- **New:** `src/features/charting/toothStatusBridge.ts` — `deriveToothStatuses`, `cellEnabled`,
  `statusTooltip`, `summariseDraft`, `planPerioSync`, `isPerioManaged`.
- Perio: `PerioChart.tsx` (status derivation, locks, skip, carry-forward, write-back, status strip),
  `PerioGrid.tsx`, `PerioGraphicalView.tsx`, `perioPrint.ts`, `CompareDatesModal.tsx`, `perioModel.ts`
  (`buildCellOrder` skip predicate).
- Restorative: `RestorativeChart.tsx` (latest-exam read, perio flags, Tooth History perio tab),
  `ToothHistoryPopup.tsx`, `chartModel.ts` (`src` region qualifier; `grade` column preferred),
  `conditionTaxonomy.ts` (`FURCATION`), `chartGlyphs.tsx` (Mobility badge, Furcation mark, new
  `JunctionMarks` for Recession), `ToothShape.tsx`, `glyphFills.ts`, `legendCatalog.tsx`.
