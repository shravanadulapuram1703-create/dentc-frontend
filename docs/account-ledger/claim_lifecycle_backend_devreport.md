# Claim lifecycle (Draft / Delete / Secondary claims) — backend dev report

**Screens:** Patient → Ledger / Account Ledger → **CREATE CLAIM** → claim screen
(`src/components/patient/ClaimDetail.tsx`, shared helpers in
`src/components/patient/claimLifecycle.ts`, ledger feed in
`src/features/account-ledger/accountLedgerService.ts`)

**Legacy reference:** on-prem "Primary Dental Insurance Claim" window — top row
`VIEW SECONDARY · CREATE TERTIARY · CREATE QUATERNARY`, bottom row
`DELETE CLAIM · … · SAVE · CANCEL`; ledger rows `CLM-P / CLM-S / CLM-T` "Pri/Sec Claim - Draft/Sent".

**Status:** Shipped on the frontend with the workarounds below. **Last updated:** 2026-09-11

---

## 1. What was reported

1. Creating a claim from the ledger opens the claim window. Pressing **DELETE** there and
   returning to the ledger still showed the claim as a `CLM-P  Pri Claim - Draft (85.00)` row.
   The claim should disappear from the ledger; a separate **draft** action should exist for
   users who want to keep it.
2. When a primary claim exists and the patient carries a secondary (tertiary, quaternary)
   insurance, the user must be able to create / open the subsequent claim from the same window,
   as in legacy (`VIEW SECONDARY` …).

## 2. Root causes (verified against the running backend, patient 83433)

| # | Finding | Evidence |
| --- | --- | --- |
| 1 | `DELETE /api/v1/insurance-claims/{id}` is a **soft delete**: it sets `is_active=false` and leaves `status` untouched (`"draft"`). | Claim `225ae725…` after DELETE: `status=draft, is_active=false`; still returned by `GET /insurance-claims?patient_id=83433`. |
| 2 | `GET /insurance-claims` returns inactive claims by default (`hide_soft_deleted` is not enabled for this resource) and offers no `is_deleted` filter. | Same list call returns 10 rows incl. the deleted one; `?is_active=true` drops it **and** the closed claim `29f37dc5…`. |
| 3 | Closing a claim (`POST …/status {"status":"closed"}`) **also** sets `is_active=false`. Deleted and closed claims are therefore indistinguishable by flag alone. | `set_claim_status` in `app/services/patient_extra_service.py`. |
| 4 | Deleting a claim does not release its procedures: `patient_procedures.claim_id` keeps pointing at the deleted claim, so the charges never return to *unbilled* and cannot be re-claimed. | Procedure `c34f3a00…` still had `claim_id=225ae725…` after the delete. |
| 5 | A procedure has **one** `claim_id`; `GET /insurance-claims/{id}/detail` selects procedures by it. There is no `parent_claim_id` on `insurance_claims` and no claim↔procedure link table, so a secondary claim has no procedures and no server-side link to its primary. | `get_claim_detail` → `select(PatientProcedure).where(PatientProcedure.claim_id == claim_id)`. |
| 6 | `POST /insurance-claims` does not default `carrier_id` / `ins_plan_id` from the patient's insurance, so the claim screen showed Carrier `-`, Group Plan `-`, Subscriber `-`. | New claims created by the ledger had `carrier_id=null, ins_plan_id=null`. |

## 3. Frontend behaviour shipped (workarounds)

- **Ledger hides deleted claims.** A claim is treated as deleted when
  `is_active === false && status !== 'closed' && !close_date` (`isDeletedClaim`). Closed claims
  (`is_active=false` + `close_date`) stay on the ledger with their "Closed:" suffix.
- **DELETE on the claim screen** now (a) refuses when insurance payments are posted
  (`total_paid > 0`, payment rows, or any paid/adjust coverage amount), (b) refuses on a primary
  while a secondary/tertiary/quaternary claim still exists, (c) `PATCH /patient-procedures/{id}
  {claim_id: null, billing_status: "not_billed"}` for every procedure billed on the claim, then
  (d) `DELETE /insurance-claims/{id}`, and returns to the ledger that opened it.
- **SAVE AS DRAFT** button (shown only while the claim is unsent: no `submitted_date`, status
  draft/empty) — `PATCH /insurance-claims/{id} {status:"draft", notes}` then back to the ledger,
  where the row reads `Pri Claim - Draft (…)`.
- **VIEW / CREATE SECONDARY · TERTIARY · QUATERNARY** on the claim screen. A tier can be created
  when the previous tier exists **and** the patient has that dental (or medical) insurance slot
  on file (`GET /patient-insurance?patient_id=` × `insurance_type` / `legacy_plan_type`).
  The subsequent claim is `POST /insurance-claims` with `billing_order` = tier,
  `claim_number` = primary number + `-S` / `-T` / `-Q`, `ins_plan_id` / `carrier_id` from that
  slot, same DOS range / office / providers / `total_billed`. Title switches to
  "Secondary Dental Insurance Claim"; the ledger row becomes `CLM-S  Sec Claim - Draft (…)`.
- **Family linkage is by `claim_number` suffix** (unique column, derivable both ways) because
  the backend has no parent link. A subsequent claim renders — and posts insurance payments
  against — the **primary's** procedures/coverage, fetched with a second `…/detail` call.
- **Create Claim (ledger)** now sends `status:"draft"`, `ins_plan_id` and `carrier_id` from the
  patient's primary dental slot, so Carrier / Group Plan / Subscriber / Employer populate on the
  claim screen (joined client-side from plan + carrier + employer + subscriber).

## 4. Backend gaps

### CLM-LC-1 (critical) — Claim DELETE is a soft delete that leaves the claim listed as a draft
- **Where:** `DELETE /api/v1/insurance-claims/{id}` (generic CRUD, `soft_delete_field="is_active"`),
  `GET /api/v1/insurance-claims`.
- **Impact:** every deleted claim came back on the ledger as "Pri Claim - Draft". The frontend
  now filters `is_active=false && !closed`, but that rule is fragile (see CLM-LC-2) and every
  other consumer of the list (reports, dashboard counts, outstanding claims) has to repeat it.
- **Suggested (pick one):**
  1. Give `insurance_claims` a real `is_deleted` / `deleted_at` column, set it on DELETE, and
     hide deleted rows by default on list / detail / outstanding-claims (`include_deleted=true`
     to see them); **or**
  2. make DELETE a hard delete for claims that have no posted payments (409 otherwise).
- **Acceptance:** after `DELETE`, `GET /insurance-claims?patient_id=` no longer returns the row;
  `GET /insurance-claims/{id}` → 404 (or `is_deleted:true`).

### CLM-LC-2 (critical) — Deleted and closed claims are indistinguishable
- **Where:** `set_claim_status(... "closed")` sets `is_active=False`; DELETE sets the same flag.
- **Impact:** `?is_active=true` cannot be used to hide deleted claims without also hiding closed
  ones (which legacy keeps on the ledger with a "Closed:" suffix). A closed claim that is later
  deleted cannot be detected at all.
- **Suggested:** stop overloading `is_active` for "closed" (status + `close_date` already say
  it), or add the dedicated deleted marker from CLM-LC-1.

### CLM-LC-3 (critical) — Deleting a claim does not release its procedures
- **Where:** `DELETE /api/v1/insurance-claims/{id}`.
- **Impact:** `patient_procedures.claim_id` keeps pointing at the deleted claim, so the charges
  stay "billed" (`unbilled=false` on the ledger feed) and can never be put on a new claim. The
  frontend now PATCHes each procedure back to `claim_id=null, billing_status="not_billed"`
  before deleting (N extra calls; partial failure is reported to the user).
- **Suggested:** on claim delete, null out `claim_id` / reset `billing_status` /
  `billing_order` on its procedures in the same transaction; refuse (409) when
  `ledger_insurance_details` rows with paid/adjust amounts exist for the claim.

### CLM-LC-4 (critical) — No secondary / tertiary / quaternary claim model
- **Where:** `insurance_claims` has `billing_order` but no `parent_claim_id`;
  `patient_procedures.claim_id` is a single FK; `GET /insurance-claims/{id}/detail` resolves
  procedures only by that FK.
- **Impact:** a secondary claim created through the API has zero procedures, its detail is
  empty, and nothing ties it to the primary. Frontend convention: `claim_number` =
  `<primary number>-S|-T|-Q`, and the screen reads the primary's procedures/coverage.
- **Suggested:**
  - add `parent_claim_id` (FK `insurance_claims.id`, nullable) to `insurance_claims`; expose it on
    `InsuranceClaimRead/Create/Update` and as a list filter;
  - make `…/detail` return the parent's procedures when the claim has none of its own (or,
    better, a `claim_procedures(claim_id, procedure_id)` link table so one procedure can sit on
    the primary AND secondary claim);
  - a convenience `POST /insurance-claims/{id}/subsequent {billing_order}` that clones the
    primary into the next tier using the patient's insurance slot, so the four-call frontend
    sequence (patient-insurance → plan → create → detail) becomes one.
- **Acceptance:** `GET /insurance-claims/{secondary}/detail` lists the primary's procedures;
  `GET /insurance-claims?parent_claim_id=` returns the family.

### CLM-LC-5 — Secondary estimate is never computed
- **Where:** `est_insurance` on create; `ledger_insurance_details.sec_estimated` is only written
  by the payment endpoint.
- **Impact:** a new secondary claim carries `est_insurance=0.00` unless a primary payment with
  `sec_estimated` has already been posted. Legacy estimates secondary coverage from the plan's
  coverage rules net of the primary's payment.
- **Suggested:** compute `sec_estimated` per procedure when the secondary claim is created (or
  on `…/recalculate` for a `billing_order=secondary` claim) from the secondary plan's coverage
  rules minus `prim_ins_paid`.

### CLM-LC-6 — Insurance payment on a subsequent claim is keyed to the wrong claim
- **Where:** `POST /ledger-insurance-details/payment` (`claim_id` in body); `…/recalculate`.
- **Impact:** posting from the secondary screen writes coverage rows with `claim_id` =
  secondary claim and bumps only that claim's `total_paid`; the primary claim's "Other Ins"
  column (which reads `sec_ins_paid` off **its** coverage rows) stays 0, and vice versa.
- **Suggested:** once `parent_claim_id` exists (CLM-LC-4), write secondary/tertiary tiers onto
  the primary's coverage rows (one row per procedure, `sec_*` columns) and roll `total_paid` up
  per tier (`prim_paid`, `sec_paid`, …) or per claim through the parent.

### CLM-LC-7 — New claims are not tied to the patient's insurance
- **Where:** `POST /api/v1/insurance-claims`.
- **Impact:** `carrier_id` / `ins_plan_id` stay null unless the client looks them up, so the
  claim screen (and any claim report) shows no carrier. The ledger now resolves the primary
  dental slot before creating; the claim screen joins plan + carrier + employer + subscriber
  (4 calls) to fill Coverage Information.
- **Suggested:** default `ins_plan_id` / `carrier_id` from `patient_insurance`
  (`insurance_type` = `billing_order`, `legacy_plan_type` prefix = `claim_type`) when absent, and
  return `subscriber_name`, `sub_member_id`, `sub_dob`, `group_number`, `employer_name`,
  `carrier_name` on `ClaimDetailClaimRead` so the screen needs one call.

### CLM-LC-8 (minor) — "draft" is a free-text status, not a state
- **Where:** `insurance_claims.status` (see AL-18 in
  `account_ledger_backend_devreport.md`).
- **Impact:** the SAVE AS DRAFT button writes the literal `"draft"`; any other casing or
  synonym ("created", "new") is treated as draft by the frontend heuristic
  (`isDraftClaim`: no `submitted_date` and status draft/created/new/empty).
- **Suggested:** validate `status` against the enum from AL-18 and let `is_draft` be derived
  server-side (`status == draft && submitted_date is null`).

## 5. Reused vs new

| Piece | Reused / new |
| --- | --- |
| Claim family, draft/deleted rules, subsequent-claim creation, permanent delete | **new** `src/components/patient/claimLifecycle.ts` |
| Patient insurance slot lookup (plan/carrier/employer/subscriber) | reused `features/patient-insurance/patientInsuranceService.loadSlot` |
| Claim screen | `ClaimDetail.tsx` — tier buttons, SAVE AS DRAFT, guarded DELETE, dynamic title, coverage block from the slot, primary procedures on subsequent claims |
| Ledger | `accountLedgerService.ts` filters deleted claims; `LedgerPage.tsx` Create Claim sends plan/carrier/draft and a return path |
