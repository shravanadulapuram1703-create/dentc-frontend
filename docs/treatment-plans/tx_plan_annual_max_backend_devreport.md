# Tx Plan — insurance estimate ignores the annual maximum (TX-MAX-1..6)

**Reported:** 2026-11-21 · **Screen:** Patient → Treatment Plan (add procedure, print)
**Repro patient:** 142 (Kristina Wilder), plan `74eb0cb2-2e55-4c61-890a-d12ea8b11fb1`,
primary slot `patient_insurance.id = 22` → `max_remaining = 1000.00`, `deductible_remaining = 50.00`.

## Symptom

The printed plan showed **Est Ins 1,689.20** on a plan whose remaining annual max is **$1,000**, and
the $50 deductible was taken on **three** lines (D2740, D2950, D3330):

| Code | Fee | Shown Est Ins | How it was computed |
|---|---|---|---|
| D2740 | 1,102.00 | 526.00 | (1102 − **50**) × 50% |
| D2950 | 204.00 | 77.00 | (204 − **50**) × 50% |
| D3330 | 1,114.00 | 851.20 | (1114 − **50**) × 80% |
| **Total** | 3,205.00 | **1,689.20** | > $1,000 max |

## Root cause

`treatment_service._fill_item_split` → `estimate_service.apply_split(price_fee=False)` →
`_fill_split` builds a **fresh** `coverage_context(db, patient_id)` for every item create / fee PATCH.
Each line is therefore split against the patient's *full* remaining deductible and annual max; the
plan's other lines never consume the running balances. (The frontend `/estimate` preview had the same
per-line shape, but the server overwrites the client figure on create anyway.)

The server's own docstring says the per-line value is *provisional* and `re_estimate` is the
authoritative plan-level figure — but nothing ran `re_estimate` after an add, so the provisional
numbers were what users saw and printed.

## Frontend fix (shipped in this change)

`TreatmentPlanPage.tsx` → `netPlanEstimates(planIds)` calls
`POST /treatment-plans/{id}/re-estimate` after every change that adds, removes, re-prices or re-orders
lines: Add procedure(s), Copy as New Plan, Delete, Change IDs (plan / phase / order), and Edit Treatment
when fee / priority / plan changed **and** no Est Ins was typed (a re-estimate would overwrite a manual
override, TX-EST-1). Failure → warning toast, provisional figures kept.

Dry run of `re_estimate` on the repro plan (rolled back, not committed):

```
D0150 72.00   ins 72.00     D3330 1114.00 ded 50 ins 215.00  (capped: max reached)
D0330 104.00  ins 104.00    D2950 204.00  ins 0.00
D0274 59.00   ins 59.00     D2740 1102.00 ins 0.00
D0367 550.00  ins 550.00    D2392 / D2140 ×3 ins 0.00
TOTAL fee 3792.00  ins 1000.00  pat 2792.00  max_left 0.00  ded_left 0.00
```

Existing plans saved before this fix stay wrong until the user clicks **Re-Estimate** (or touches the plan).

## Backend gaps

### TX-MAX-1 (P1) — net the split server-side on item write
Item create / fee PATCH should not return a figure that breaks the annual max. On
`_fill_item_split`, seed the tier balances from the plan's *other* non-archived lines (priority,
created_at order) before splitting the new line — or simply run the plan-level re-estimate inside the
same transaction after the write. Then the FE call becomes redundant (keep it harmless).

### TX-MAX-2 (P1) — two estimate engines disagree
`treatment_service.re_estimate` has its own arithmetic and rule matcher (`match_coverage_rule`);
charges / `/estimate` / item writes use `estimate_service._split_amounts` + `_match_rule`. Observed on
the repro plan: **D0367** → 0% via `/estimate`, **100%** via `re_estimate`. `re_estimate` also lacks:
copay (Model B) schedules, `exempt_from_dental_max`, ortho max (`ortho_remaining`), secondary tier,
and checks the deductible *before* the max (estimate_service checks max first — an exhausted benefit
burns no deductible). **Fix:** rewrite `re_estimate` to loop the plan lines through
`estimate_service.estimate_lines(tiers=coverage_context(...))` with one shared running balance.

### TX-MAX-3 (P1) — `max_remaining` is a static column
`patient_insurance.max_remaining` / `deductible_remaining` are imported/hand-entered values; nothing
decrements them when claims pay or charges post (no writer outside the estimate code). "Annual max
reached" therefore only works if staff edit the slot. **Fix:** derive
`benefits_used_ytd = Σ insurance paid (or estimated on open claims) for the slot in the current
benefit year` (plan's benefit-year start month) and use
`remaining = individual_max − benefits_used_ytd` (fall back to the column only when no claim history),
exposing `benefits_used_ytd` / `max_remaining_effective` on `PatientInsuranceRead`.

### TX-MAX-4 (P2) — which lines consume the max
`re_estimate` nets every non-archived item, including `completed` (already posted — double-counts once
TX-MAX-3 lands), `alternative`, `hold`, `referred_out`. Legacy nets only lines that will be performed.
**Fix:** exclude completed/alternative/referred-out from the running balance (still estimate them,
against what is left).

### TX-MAX-5 (P2) — cross-plan / benefit-year scope
Max is netted per plan only. Two active plans each get the full remaining max, and a plan spanning
two benefit years should reset at the year boundary (by `diagnosed_date`/`proposed_date`). Decide and
document the rule; legacy nets across the patient's open plans for the current benefit year.

### TX-MAX-6 (P3) — print header "Primary Insurance : —"
`plan_report` / the FE header pass no carrier, so the printed plan says "—" even with an active primary
slot (`TreatmentPlanPage.tsx` sets `primaryInsurance: ''`). Add `primary_insurance` (carrier name +
group) and `annual_max_remaining_after` to the `TreatmentPlanReport` payload so the print can show
"Annual max remaining" under the totals.

---

## Status — backend response received 2026-11-21

Response: `dentc-backend/docs/treatment plans/tx_plan_annual_max_backend_response.md` — **TX-MAX-1..6
all closed server-side** (local backend tree, uncommitted at time of writing; needs a backend restart /
deploy before the FE changes below are live).

Checked here: backend `tests/test_tx_plan_annual_max.py` 17/17 pass; rolled-back `re_estimate` dry run
on the repro plan → ins **1,000.00**, ded 50 once (D3330), `annual_max_remaining_after 0.00`,
`max_remaining_source slot`, benefit year 2026-01-01.

FE follow-up done:

| Gap | FE change |
|---|---|
| TX-MAX-1 | `netPlanEstimates` **removed** — the server re-nets on item create / PATCH / delete (skips a PATCH carrying `insurance_estimate`, TX-EST-1). `run()` now invalidates every `tx-item-ins-detail` row since one write rewrites the whole plan. **Deploy FE + BE together** — the FE alone no longer nets. |
| TX-MAX-3 | `PatientInsuranceRead.max_remaining_effective` / `deductible_remaining_effective` drive Patient Overview "Indi. Max (Rem.)", Restorative Insurance Benefits, the Transactions insurance strip; the patient Insurance → Benefit Information grid keeps the raw columns editable (staff override) and shows a "Used in estimates" note (effective max, used YTD, benefit year, source, stale-override warning). |
| TX-MAX-6 | Tx plan PDF header "Primary Insurance" = `report.primary_insurance.label`; each plan's totals add "Annual Max Remaining after this plan" / "Deductible Remaining" from `GET /treatment-plans/{id}/report`. |

Open (backend, from the response): re-net not triggered by charge posting / appointment booking status
changes; Insurance Details print + day totals still print the raw `max_remaining`; secondary not layered
into plan estimates (FE agrees — keep Prim-only to match posted charges).
