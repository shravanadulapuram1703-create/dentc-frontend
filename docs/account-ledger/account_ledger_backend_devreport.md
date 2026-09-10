# Patient / Account Ledger — Backend Gap Report

**Screen:** Patient Ledger + Account Ledger (one screen, "Show All" grid in the legacy app)
**Routes:** `/patient/:patientId/ledger` (Patient scope) · `/patient/:patientId/account-ledger` (Account scope)
**Frontend:** `src/features/account-ledger/` (`LedgerPage.tsx`, `accountLedgerService.ts`, `accountLedgerModel.ts`)
**Status:** Shipped & live-verified at `:5173`
**Last updated:** 2026-08-22

The two legacy ledgers are **the same screen**; only the feed's scope differs:

| Toggle | Feed |
| --- | --- |
| **Patient Ledger** | transactions belonging to the selected patient |
| **Account Ledger** | transactions of every patient sharing the patient's `responsible_party_id` |

Both render one chronological grid mixing procedure charges, payments, adjustments and
claim transactions, with a per-row running balance, a Grand-Total footer, a `Prn`
row-selection column driving Create Claim, transaction-level drill-down hyperlinks,
date-range + type filtering, sorting, pagination, a legacy BALANCES table and a
CONTRACTS (payment-plan) panel.

---

## 1. How it is wired

The grid is now sourced from the **denormalised** `GET /patients/{id}/account-ledger`
feed the backend delivered for AL-1/2/4/5/7 — one call per account member — rather than
the previous client-side merge of `/patient-procedures` + `/patient-payments` +
`/patient-adjustments`:

| Legacy column | Source (snake_case, bound directly) |
| --- | --- |
| Prn | derived — checkbox enabled only on a `charge` row that is `unbilled` **and** not on Hold Claim |
| Date | `AccountLedgerRow.entry_date` |
| Patient | account member name (`GET /patients?responsible_party_id=`) |
| Office | `office_short_id` (falls back to `GET /offices` for claim rows) |
| A | `apply_to` |
| Code | `code` (`procedure_code` · `PMT` · `PATADJ` · `CLM-P/S/T` for claims) |
| TH / Surf | `tooth` / `surface` |
| T | `transaction_kind` (`P` debit / `C` credit) |
| N | `unbilled` |
| Description | `$<amount> <description>` |
| Bill | `"H"` when the charge is on Hold Claim, else `billing_status` (claim rows: claim number) |
| Provider | `provider_name` |
| Est Pat / Est Ins | `patient_estimate` / `insurance_estimate` |
| Amount | signed: `charge` minus the absolute `credit` — see **AL-9** |
| Balance | running balance recomputed across the merged feed |
| User | `user_label` → `user_id` → `GET /users` |

- **Claim rows** (`CLM-P`) are merged in from `GET /insurance-claims?patient_id=` — the
  account-ledger feed does not carry them (**AL-8**). They are informational and do not
  move the running balance.
- **Account scope** fans the feed out over `GET /patients?responsible_party_id=<rp>`;
  the running balance and Grand Total are recomputed across the merged multi-patient feed.
- **Create Claim** acts on the **checked rows only**. Rows spanning several account
  members produce one claim per patient. Uses `createInsuranceClaim` +
  `updatePatientProcedure` (the charge row's `source_id` *is* the `patient_procedures.id`).
- **Drill-down** (legacy hyperlink behaviour — the window depends on BOTH the column
  clicked and the transaction type):

  | Column | charge | payment | adjustment | claim |
  | --- | --- | --- | --- | --- |
  | **Date** | *Edit Treatment* | *Edit Payment* | — | full *Primary Dental Insurance Claim* screen |
  | **Description** | — | — | — | *Claim Details* popup |
  | **Amount** | *Payment Allocation Detail* | *Payment Allocation Detail* | *Payment Allocation Detail* | — (a claim row carries no amount) |

  - *Edit Treatment* / *Edit Payment* → `EditTransactionModal.tsx`. Re-fetches the source
    record by id (`GET /patient-procedures/{id}` / `GET /patient-payments/{id}`) rather
    than reusing the denormalised feed row; Save/Delete call the matching PATCH/DELETE.
    Fee and Est Ins lock once a procedure carries a `claim_id`.
  - *Primary Dental Insurance Claim* → the existing `components/patient/ClaimDetail.tsx`
    at `/patient/:id/claim/:claimId`, reused unchanged (its CANCEL already returns to
    `/patient/:id/ledger`).
  - *Claim Details* → `ClaimDetailsModal.tsx`. The compact legacy summary: Claim Info /
    Claim Status / Claim Amount / Insurance Payment blocks over `GET /insurance-claims/
    {id}/detail`, plus "Transactions Associated With This Claim" and Unclose Claim
    (`POST /insurance-claims/{id}/status`). Total UCR is summed from the claim's
    procedures; Check #/Bank #/EOB # come off the coverage row.
  - *Payment Allocation Detail* → `PaymentAllocationModal.tsx`. For a charge,
    `GET /patient-procedures/{id}/allocations-summary`; for a payment/adjustment,
    `GET /payment-allocations?payment_id=|adjustment_id=`. Each line's counterpart is
    resolved against the ledger feed already in memory, so it shows the same patient /
    office / provider / description text the grid does.

  Both popups render their transaction grid with the **shared `LedgerGrid.tsx`**, so a
  transaction looks identical wherever it appears. Closing any of them returns to the
  ledger with its filters, sort, page and selection intact.
- **Hold Claim** — the legacy per-procedure hold. The checkbox lives in the *Edit
  Treatment* window (`hold_claim` on `patient_procedures`, saved with the rest of the
  form). A held charge renders a red **H** in the Bill column, its `Prn` checkbox is
  disabled with an explanatory tooltip, and it is therefore excluded from Create Claim.
  Clearing the hold makes it claim-eligible again on the next refresh. The flag is joined
  client-side because the feed does not carry it — see **AL-17**.

  The hold is enforced on **both** claim-creation paths: the ledger's Create Claim (which
  can only act on selected, selectable rows) and
  `features/transactions/TransactionsEntryPage.tsx`, which bills every unbilled procedure
  at once — that one now filters held charges out and tells the user how many were left
  off before it proceeds.
- **BALANCES** renders the legacy table (aggregate "Account Balance" row + one row per
  account member) from `GET /patients/{id}/balance`, except the Balance column — see AL-9.
- **CONTRACTS** ← `GET /patient-payment-plans`, `/patient-ins-payment-plans`,
  `/patient-sec-ins-payment-plans`.
- Payments/Adjustments + Add Procedure open `TransactionEntryModal`, which embeds the
  Transactions Entry tabs; the ledger refreshes after every post.

---

## 2. Backend gaps

### DELIVERED — AL-1 / AL-2 / AL-4 / AL-5 / AL-7
`GET /patients/{id}/account-ledger` now returns fully-denormalised rows
(`office_short_id`, `provider_name`, `user_label`, `patient_estimate`,
`insurance_estimate`, `apply_to`, `billing_status`, `unbilled`,
`source_type` + `source_id`, `charge`/`credit`/`amount`, `running_balance`) with
`date_from`/`date_to`, `transaction_type`, `sort_by`/`order` and `page`/`size`
(max 500). The frontend has been migrated onto it. Remaining notes:
- `size` still caps at 500 per patient; the screen warns when a patient's feed is
  truncated. Account scope multiplies this by the number of members but paginates
  client-side, because the feed is per-patient (see AL-11).
- `office_short_id` populates correctly (AL-7 closed for feed rows).

### AL-9 (critical) — Payment amounts are signed backwards, so balances are wrong
- **Observed:** migrated payments are stored with a **negative**
  `patient_payments.amount` (e.g. `PAY-90372704` = `-266.25`). Downstream arithmetic
  then double-negates:
  - `/patients/{id}/account-ledger` returns `credit: "-500.00"` **and**
    `amount: "500.00"` (positive) for a $500 payment, so its `running_balance`
    *increases* on a payment.
  - `/patients/{id}/balance` computes `balance = total_charged - total_paid`
    = `1093.00 - (-417.50)` = **1510.50** for patient 80024, where the legacy answer
    is `1093.00 - 417.50` = **675.50**.
- **Impact:** every consumer of `/balance` (patient header chip, dashboards, aging)
  overstates the balance by twice the payments on migrated accounts.
- **Frontend workaround:** the ledger derives each row's signed amount as
  `charge - |credit|` (correct under either sign convention) and computes the header
  balance and the BALANCES *Balance* column from its own feed, so the grid, the Grand
  Total and the balances panel reconcile. The aging/estimate columns still come from
  `/balance` and therefore still carry the backend's number.
- **Suggested:** settle one convention - payments stored positive with
  `balance = charged - paid`, or stored negative with `balance = charged + paid` - and
  make `account-ledger.amount` genuinely signed (`+charge` / `-credit`) as documented.

### AL-8 (critical) — Claim transactions are absent from the account-ledger feed
- **Missing:** the legacy ledger interleaves claim rows (`CLM-P - Pri Claim - Sent
  (70.00) Closed: ...`) with charges and payments. `source_type` on the feed is only
  `charge | payment | adjustment`.
- **Impact:** claim rows are merged client-side from `GET /insurance-claims?patient_id=`,
  a second call per account member, and there is no claim *event* history in the feed
  (the legacy row reflects the send/close event, not the current claim record).
- **Suggested:** add `source_type: 'claim'` rows to the feed (code `CLM-P/S/T`, the
  claim number, status text, billed/paid amounts, `submitted_date` as `entry_date`),
  ideally one row per status transition.

### AL-10 (critical) — No user attribution on transactions
- **Observed:** `user_id` / `user_label` are `null` on every migrated feed row, and the
  underlying `patient_procedures.created_by` / `patient_payments.created_by` are `null`
  too. Only records created in the new app carry `created_by`.
- **Impact:** the legacy **User** column (which office staff use to see who posted a
  transaction) is blank for all historical activity.
- **Suggested:** backfill `created_by` from the legacy user/modified-by column during
  migration, and always populate `user_label` on the feed.

### AL-11 — Account (family) scope has no server-side feed
- **Missing:** the ledger feed is keyed by a single `patient_id`. The legacy **Account
  Ledger** is scoped to the *account* - every patient sharing a `responsible_party_id`.
- **Impact:** the frontend resolves the member list via
  `GET /patients?responsible_party_id=` and issues one feed call (plus one claims call
  and one balance call) **per member** - 5 members = 15 requests - then merges, sorts,
  recomputes the running balance and paginates in the browser.
- **Suggested:** accept `scope=patient|account` (or a `responsible_party_id` filter) on
  `/patients/{id}/account-ledger`, return `patient_id` + `patient_name` on each row, and
  server-paginate the merged feed. Same for `/patients/{id}/balance`.

### AL-13 — Edit Treatment / Edit Payment windows: fields with no backend column
The legacy detail windows carry fields the backend does not store. They render disabled,
with a shared "no backend column yet" footnote, for layout parity:

| Window | Field | Note |
| --- | --- | --- |
| Edit Treatment | Duration (mins) | no duration column on `patient_procedures` |
| Edit Treatment | ADVANCED (per-carrier estimate split) | no per-claim-order estimate breakdown on a charge |
| Edit Treatment | Contract PlanID | no contract-plan link on a posted charge |
| Edit Treatment | Referral Type / Referring Dentist | referral data is not carried per transaction |
| Edit Treatment | Fee Schedule Used | the applied schedule is not recorded on the charge |
| Edit Payment | EOB # | no `eob_number` column on `patient_payments` |
| Edit Payment | Apply To / Posted From | no allocation-origin field on the payment record |
| both | Modified By / Modified On | `patient_procedures` and `patient_payments` have `created_by`/`created_at` only — no modified audit pair (related to AL-10) |
| both | ICD-10 / Dental Cross Coding | no diagnostic-code resource |

"Transaction Date" is shown from `created_at`; the legacy window treats it as a distinct
posting date from DOS, which the backend does not model separately.

**Suggested:** add the audit pair (`modified_by`/`modified_at`) first — it is the field
office staff actually use — then `duration`, `eob_number` and the applied
`fee_schedule_id` on the charge.

### AL-14 — Feed descriptions are inconsistently money-prefixed
- **Observed:** `AccountLedgerRow.description` is a plain code description for procedures
  ("Bitewings - Four Radiographic Images") but arrives already money-prefixed for some
  migrated payments ("$-89 Payment - Insurance Check No: 78687655 Notes:").
- **Impact:** the grid composes the legacy `$<amount> <text>` string, which produced
  "$0 $-89 Payment - …" on those rows. The frontend now skips its prefix when the text
  already starts with `$`.
- **Suggested:** return `description` as plain text on every row and leave presentation to
  the client.

### AL-15 — `allocations-summary.remaining_amount` is always 0
- **Observed:** `GET /patient-procedures/PROC-90393354/allocations-summary` returns
  `fee: "75.00"` with no allocations, yet `remaining_amount: "0"`. `paid_to_date`,
  `insurance_paid_to_date` and `adjusted_to_date` are also `"0"` on procedures that do
  have allocations elsewhere.
- **Impact:** the legacy "Outstanding Amount" line on the Payment Allocation Detail popup
  cannot use it. The frontend computes it as `|transaction amount| - Σ|allocations|`.
- **Suggested:** compute `remaining_amount` as fee minus allocated (payments +
  adjustments), and populate the `*_to_date` roll-ups.

### AL-16 — Migrated payment allocations carry no procedure link
- **Observed:** most migrated `payment_allocations` rows have `procedure_id: null`,
  `amount: "0.00"` and `alloc_type: "A"` (e.g. ids 1-4, legacy ids 109207-109210). Only
  allocations created in the new app carry a real `procedure_id` and amount.
- **Impact:** the Payment Allocation Detail popup is empty for historical payments, so
  offices cannot see how a legacy payment was applied.
- **Suggested:** backfill `procedure_id` and `amount` from the legacy ledger-allocation
  table during migration.

### AL-17 — Hold Claim is invisible to the ledger feed
- **Missing:** `AccountLedgerRow` has no `hold_claim`, and `GET /patient-procedures`
  offers no `hold_claim` filter (only `billing_status`, `claim_id`, `is_void`, …).
- **Impact:** to render the legacy "H" indicator and to keep held charges out of Create
  Claim, the frontend walks `GET /patient-procedures?patient_id=…` (200 per page, capped
  at the feed's 500-row window) **per account member** and builds a Set of held ids. On a
  five-member account that is five extra list calls just to colour one column.
- **Suggested:** add `hold_claim` to `AccountLedgerRow` (cheapest fix — it is already on
  the underlying row), or failing that a `hold_claim` query filter on
  `GET /patient-procedures`.
- **Note:** the backend correctly persists `hold_claim` via
  `PATCH /patient-procedures/{id}`; it just is not exposed anywhere the ledger can read
  cheaply. Whether the backend *itself* excludes held procedures when a claim is built is
  unverified — the frontend currently enforces it by disabling selection.

### AL-18 — Claim status is an unvalidated free-text column with hidden date side-effects
- **Where:** `POST /api/v1/insurance-claims/{claim_id}/status`
  (`app/services/patient_extra_service.py::set_claim_status`), used by the claim screen's
  UPDATE STATUS button.
- **Missing:** `insurance_claims.status` is `String(30)` with no enum and no server-side
  validation, so any string is accepted and stored. The lifecycle dates are then derived
  from an **exact lowercase match** on that string:
  `"submitted"` → `submitted_date`, `"paid"` → `paid_date`,
  `"closed"` → `close_date` + `is_active = false`.
- **Impact:** a value the caller believes is valid — `"Submitted"`, `"SUBMITTED"`,
  `"submited"` — saves the literal text and silently skips the date stamp. On the claim
  screen the Claim Sent Date / Claim Close Date stay "-", which reads as "the status did
  not update" even though the row changed. Reported as a bug against the frontend; the
  frontend now sends only the five canonical lowercase values from a picker
  (`src/components/patient/claimStatus.ts`) and reads the claim back after the POST to
  confirm the write, but the column is still writable with anything by any other client.
- **Suggested:** validate `ClaimStatusUpdate.status` against an enum
  (`draft | submitted | paid | denied | closed`, plus whatever the clearinghouse
  lifecycle needs) and reject the rest with 422; normalise case on the way in.
- **Related:** the transitions only ever *set* dates. Moving a claim back to `draft`
  leaves `submitted_date` populated (the screen keeps showing a Claim Sent Date for a
  claim that is no longer sent), and reopening a closed claim (`ClaimDetailsModal` sets
  the status back to `submitted`) never restores `is_active = true` nor clears
  `close_date` — a claim closed once stays `is_active = false` forever and drops out of
  any list filtered on it. The status transitions should own both directions.
- **Verified:** with the frontend fix in place, `POST …/status {"status":"submitted"}`
  → 200 in ~0.7 s, claim reads back `status "submitted"`, `submitted_date "2026-08-29"`,
  and the Claim Status panel refreshes; the value survives a reload. Setting it back to
  `draft` also round-trips, but `submitted_date` is left behind as described above.

### AL-3 — "Ortho - Patient Payment Plan" has no backend resource
- **Missing:** the Contracts tab has three panels - Regular-Patient, Ortho-Patient,
  Ortho-Insurance. The backend exposes `patient-payment-plans` (maps cleanly to
  **Regular-Patient**: `amt_financed`, `down_payment`, `periodic_amt`, `first_due_date`,
  `rem_total_amt`, `rem_payments`) and `patient-ins-payment-plans` /
  `patient-sec-ins-payment-plans` (insurance schedules, only `periodic_amt` +
  `periodic_date`). There is **no ortho-flagged patient plan** and the insurance-plan
  models lack Plan Amount / Down Pay / Rem-Total / Rem-#-of-Pay fields.
- **Impact:** the Ortho-Patient panel renders all dashes; the Ortho-Insurance panel can
  only fill Next Per. Amt / Next Date.
- **Suggested:** add a plan-type discriminator (`plan_type: 'regular' | 'ortho'`) on
  `PatientPaymentPlan`, and add the financial summary fields to the insurance payment
  plan models.

### AL-6 — Columns with no backing data (rendered as "-")
- **`At` and the attachment column:** no per-transaction attachment/flag field on
  procedure, payment or adjustment records.
- **`Durati...` (duration):** no procedure-duration field on the feed.
- **`unbilled` reliability:** it is derived from "procedure has no `claim_id`". On
  migrated data every procedure has a null `claim_id`, so historical procedures with
  `billing_status: 'paid'` still report `unbilled: true` and appear claim-eligible in
  the `Prn` column. Procedures claimed through the new app behave correctly.
- **Suggested:** confirm the legacy meaning of `A` / `At` / attachment, expose a duration
  field, and backfill `claim_id` (or expose the legacy billed flag) so `unbilled` is
  trustworthy on migrated data.

### AL-12 (cosmetic) — Responsible party / Primary-insurance / Plan name not in context
- **Missing:** the legacy title row shows `Responsible: <name>`, `Prim. Ins` (link) and
  the active insurance plan name. The shared patient shell context
  (`PatientDisplayData`) does not carry responsible-party or active-insurance summary,
  so the new screen's title bar shows only the patient + account balance.
- **Suggested:** add responsible-party + active-primary-insurance summary to the patient
  context (or a `GET /patients/{id}/summary`) if this header detail is required.

---

## 3. Reused vs new

**Reused (no duplication):**
- `transactionsModel` helpers (`money`, `num`, `fmtDate`).
- `ledgerApi.getPatientBalances` - BALANCES table aging / estimates / recent activity.
- Transactions Entry tabs (`AddProceduresTab` / `PaymentsTab` / `AdjustmentsTab`) hosted
  in `TransactionEntryModal` - Add Procedure / Payments / Adjustments.
- `createInsuranceClaim` / `updatePatientProcedure` - Create Claim flow.
- `components/patient/ClaimDetail.tsx` - the claim drill-down target, unchanged.
- `useProviderDirectory` / `providerOptionLabel`, `useDefinitions('payment_method')`,
  `procedureCodeService.codeDescription`, `useBodyScrollLock` - inside the detail window.
- Generated Orval client for every call (no raw axios).

**New / changed:**
- `src/features/account-ledger/LedgerPage.tsx` - the single ledger screen used by both
  routes (`defaultScope="patient" | "account"`): scope toggle, toolbar, 21-column
  colour-coded grid with the `Prn` selection column, Grand Total, pagination, legacy
  BALANCES table, CONTRACTS panel, Balance-Stat modal.
- `accountLedgerModel.ts` - `LedgerRow`, `signedAmount`, `apiRow`, `claimRow`,
  running-balance computation, filter/sort helpers.
- `accountLedgerService.ts` - `loadAccountMembers`, `loadLedgerFeed`, `loadPaymentPlans`.
- `EditTransactionModal.tsx` - the legacy Edit Treatment / Edit Payment drill-down window.
- `ClaimDetailsModal.tsx` - the legacy Claim Details popup (claim-row Description).
- `PaymentAllocationModal.tsx` - the legacy Payment Allocation Detail popup (Amount).
- `LedgerGrid.tsx` - the grid extracted out of `LedgerPage` so the ledger, the Claim
  Details popup and any future consumer render a transaction identically.

**Removed:**
- `src/features/account-ledger/AccountLedgerPage.tsx` - folded into `LedgerPage`.
- `src/components/pages/PatientLedger.tsx` - the old divergent Patient Ledger screen
  (thin `/ledger` feed + a separate "Unbilled Procedures" table + a duplicate
  "PATIENT LEDGER" toolbar button). Both routes now render the same screen.
