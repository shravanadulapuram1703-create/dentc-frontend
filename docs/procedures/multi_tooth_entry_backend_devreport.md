# Multi-tooth procedure entry — backend dev report (MT-1…8)

_2026-10-30 · frontend branch `feature/uat-realse-v5`_

## What the frontend now does

A user can pick a procedure code **once** and apply it to **many teeth** ("D7140, teeth 7–23"):

- **Add Procedure Details pop-up** (`src/features/procedures/ProcedureDetailsDialog.tsx`), which Transactions
  Entry, Ledger → Add Proc, Treatment Plan, and the Restorative chart all use. The Tooth# cell accepts `7-23`,
  `2, 4-6` or `A-E`. In the SELECT TOOTH NUMBER panel, a click adds or removes a tooth and Shift+click selects a
  range. Surfaces, quadrant and material apply to every tooth. Save reads "Save 17" and shows "Saves 17 separate
  procedure records".
- **Restorative chart**: Shift+click on a whole tooth selects a range. The Add ADA Codes pop-up has a new
  **Add to all N teeth** button next to the old one-tooth-at-a-time **Add Procedure →**.
- **Scheduler → Add Procedure to Appointment** (`AppointmentProcedurePicker` + `ToothSurfaceEnforcement`)
  takes multiple teeth (click, Shift+click or typed range) and appends one appointment line per tooth.

Parsing and range rules live in `src/features/procedures/multiTooth.ts`. Ranges follow Universal order, so 7–23
includes 7…16 and 17…23 (17 teeth). A range never mixes permanent, primary and supernumerary teeth.

**The data model is unchanged.** Each tooth is still saved as its own `patient-procedures`,
`treatment-plan-items` or `appointment-procedures` row, with the same body a single-tooth entry sends. The
ledger, claims, chart and plan↔charge reconciliation all see separate records. Nothing below blocks the
feature; these items are about speed, atomicity and safety.

## Gaps

| ID | Sev | Gap | Ask |
|---|---|---|---|
| MT-1 | 🔴 | **No bulk create for charges.** `POST /api/v1/patient-procedures` takes one row. A 17-tooth extraction is 17 sequential POSTs, each re-pricing, re-reconciling and re-computing the balance. A failure partway through leaves some teeth posted and others not. The frontend reports "Posted 9 of 17; stopped at D7140 tooth 16" and refreshes, but the user has to finish the rest by hand. | `POST /api/v1/patient-procedures/bulk {items: PatientProcedureCreate[]}`. Make it **all-or-nothing** in one transaction and return the created rows in input order. Run the per-row work (fee stamp, plan-item match/close, balance) once per batch. |
| MT-2 | 🟠 | **No bulk create for plan items.** `POST /api/v1/treatment-plan-items` is one row per call (same partial-failure risk). | `POST /api/v1/treatment-plan-items/bulk` with the same semantics as MT-1. |
| MT-3 | 🟡 | **No bulk create for appointment lines.** `appointment-procedures` lines are persisted one by one when the appointment saves. | `POST /api/v1/appointment-procedures/bulk`, or accept `procedures[]` on the appointment create/update. |
| MT-4 | 🟠 | **No link between rows entered together.** Nothing records that 17 charges came from one entry. "Undo that entry", an audit line ("D7140 ×17, teeth 7–23, by X") and a progress-note summary are not possible. | Optional `entry_group_id` (UUID) on all three create bodies and their read models, as `chart-conditions/bulk` already does with `group_id`. This is metadata only: rows stay fully independent for ledger, claims and edits. |
| MT-5 | 🟠 | **No server-side tooth guard.** The server does not check the tooth against `valid_teeth` / `tooth_area` (PROC-INT-8), or against chart state. A range makes it easy to charge an extraction on a tooth already charted missing or extracted, or to double-post the same code, tooth and date. | Validate `tooth` against the code rules (422 with tooth-level detail). Return a **409** for an already-missing or extracted tooth, or for a duplicate code+tooth+DOS, with `force: true` to override. In bulk, return per-item errors without writing anything. |
| MT-6 | 🟡 | **Coverage limits in one batch.** Frequency, age and per-quadrant limits are judged per row. When rows post one by one, each one sees only the rows already committed. A bulk call must count the earlier items in the same batch. | When MT-1 lands, evaluate coverage across the batch in order. |
| MT-7 | 🟡 | **More than 10 lines on one claim.** One DOS can now easily produce more than 10 service lines. The ADA 2024 form has 10 lines per claim. | Confirm the claim builder splits more than 10 lines into continuation claims, or document the cap so the frontend can warn. |
| MT-8 | 🟡 | **Readiness is one tooth per call.** `GET /patient-procedures/{id}/readiness` and the pre-post readiness check take one tooth. The pop-up checks code-wide when several teeth are selected. | Accept `teeth[]` (or a bulk readiness POST) and return a per-tooth result. |

## Frontend follow-ups when the backend lands

- MT-1/2/3: replace the per-tooth loops in `AddProceduresTab.postRows`, `TreatmentPlanPage.addPlannedProcedures`,
  `AddAdaCodeModal.addAll`/`onDetailsSave` and `AppointmentProcedurePicker.handleAdd` with one bulk call.
- MT-4: send one `entry_group_id` per dialog save. Show "Delete entry (17)" in the ledger and treatment-plan
  context menus.
- MT-5: show the 409 per tooth in the pop-up and offer "Post anyway".
