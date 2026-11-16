# Edit Treatment — Est Ins / Est Pat override: backend gaps (TX-EST-1..5)

_Reported 2026-10-30, branch `feature/uat-realse-v5`._

## 1. The reported bug

On **Patient → Treatment → Edit Treatment** (row double-click), typing a new **Est Ins**
and pressing Save had no effect: the grid kept the old Est Ins.

**Root cause (server-side, worked around on the frontend):**
`PATCH /api/v1/treatment-plan-items/{id}` → `TreatmentPlanItemCRUD.update` →
`_fill_item_split` → `estimate_service.apply_split(price_fee=False)` →
`_fill_split_only`. With `PRICING_ENGINE_V2 = True`, `_fill_split_only` recomputes the
coverage split **whenever the PATCH body contains the `fee` key** (even when it is
unchanged), and `_fill_split` then unconditionally overwrites
`data["insurance_estimate"]` with the computed value. The modal always sent `fee`, so
every hand-entered estimate was silently replaced.

**Frontend fix (shipped in this change):**
- `EditTreatmentModal` sends `fee` only when it actually changed, and sends the
  estimate separately as `EditTreatmentSave.insurance_estimate` (null when untouched).
- `TreatmentPlanPage.onSaveEdit`: an estimate-only edit rides in the main PATCH (no
  `fee` → no re-split, value persists). Fee **and** estimate changed → main PATCH
  with `fee` (server re-splits), then a second PATCH `{insurance_estimate}` so the
  manual value wins.
- New **Est Pat** box under Est Ins. Est Pat has no column (it is `fee −
  insurance_estimate` everywhere, incl. the grid), so editing Est Pat sets Est Ins to
  the remainder; editing Fee or Est Ins updates Est Pat live.

## 2. Backend gaps

| ID | Severity | Gap | Ask |
|---|---|---|---|
| **TX-EST-1** | High | No supported way to override an item's `insurance_estimate`: any PATCH carrying `fee` overwrites it, even if `fee` is unchanged. The FE now needs **two PATCHes** for fee + estimate edits (non-atomic; second can fail after the first commits). | Honour an explicit `insurance_estimate` in the same PATCH (treat it as an override, like `fee_override` on charges), and only re-split when `fee` **changes** versus `current.fee`, not when the key is merely present. |
| **TX-EST-2** | Medium | No override flag/provenance on the item. A manual estimate looks identical to a computed one, and the next plan **Re-Estimate** (and *Re-Estimate At Posting*) silently overwrites it. | Add `insurance_estimate_source` (`computed` / `override`) or `is_estimate_override`; let `re_estimate` skip (or report) overridden lines; expose it on `TreatmentPlanItemRead`. |
| **TX-EST-3** | Medium | The per-item insurance-detail row (`treatment-plan-insurance-details`: `estimated_ins`, `estimated_pat`) is only written by plan-level `re_estimate`. After a manual override, the **ADVANCED** panel still shows the old figures. | Update (or invalidate) the item's detail row when `insurance_estimate` changes on PATCH. |
| **TX-EST-4** | Low | No `patient_estimate` on `TreatmentPlanItemRead`/`Update` (`_fill_split_only` pops it). Est Pat is always derived client-side as `fee − insurance_estimate`, so **Discount %** and the estimated deductible are not reflected in Est Pat anywhere. | Expose a server-computed `patient_estimate` (fee − discount − ins) on the read model so grid, modal, print and scheduler agree. |
| **TX-EST-5** | Low | No validation that `insurance_estimate ≤ fee` (or ≥ 0). The FE clamps Est Pat at 0, but the API would accept an estimate larger than the fee. | 422 `insurance_estimate_exceeds_fee` (or clamp) on create/PATCH. |

## 3. Verification status

- `npx tsc -b` and `npx eslint` on the two touched files: clean (2026-10-30).
- **Live-verified 2026-10-31** against the UAT DB (`Test_Dental_Group`, patient 2,
  D6057 item `0f5e7307…`, fee 457.81), then restored to Est Ins 0.00 (no diff):
  - old shape `{fee: 457.81 (unchanged), insurance_estimate: 100}` → saved **0.00** (bug reproduced, TX-EST-1)
  - `{insurance_estimate: 100}` → **100.00**
  - `{fee: 500}` then `{insurance_estimate: 150}` → **150.00**
  - UI: Est Ins 100 → Est Pat 357.81; Est Pat 300 → Est Ins 157.81; Save sent one PATCH
    without `fee`, server returned 157.81, grid row showed 300.00 / 157.81 / 457.81.
