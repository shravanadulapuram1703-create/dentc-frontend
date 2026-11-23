# BE data map — the FINANCIAL model (everything money-related that reports aggregate)

_Static analysis only: code + docs read; no server started, no DB connection, no API call, no source-export file opened. Snapshot 2026-11-21. Backend `<workspace>/dentc-backend` (branch `feature/uat-realse`, HEAD `9183df0`), frontend `<workspace>/dentc-frontend` (branch `feature/uat-realse-v5`). `schema.sql` is a dump dated 2026-10-11 and predates the family-account tables (those are read from Alembic `9435491c1d19`)._

**Legend** — **[V]** verified by reading the cited file/lines. **[I]** inference (reasoned, not executed). **[D]** a number/claim quoted from a code comment or backend doc, not re-measured. Paths are relative to `dentc-backend/` unless prefixed `FE:` (= `dentc-frontend/`). Names are snake_case exactly as in the code.

Companion document: `be_existing_reporting.md` (same folder) covers the existing KPI endpoints and their formula inconsistencies. This document is the **data map**: where each money fact lives, what its columns mean, and how to compute report metrics correctly from it.

---

## 0. TL;DR for planners

| # | Finding | Evidence |
|---|---|---|
| 1 | **There is no ledger table.** Money is spread over 8 stores: `patient_procedures` (charges), `patient_payments` (legacy P/I/A rows + app patient payments + app debit adjustments + balance transfers + unallocated insurance cheques), `patient_adjustments` (app credit adjustments), `ledger_insurance_details` (app insurance remittances: paid + write-off per procedure), `patient_refunds`, `patient_opening_balances`, `insurance_claims` (claim totals), `payment_allocations` (links). Denticon's ledger tables were removed by design. | [V] models; `denticon_migration/schema_guide.md` L53-59 |
| 2 | Legacy `LEDGER.LTYPE` routing: `C` → `patient_procedures` (`id = PROC-{LEDGERID}`); `P` / `I` / `A` → `patient_payments` (`id = PAY-{LEDGERID}`, `payment_type` = `patient` / `insurance` / `adjustment`). | [V] `denticon_migration/migration/utils/parsers.py` L167-183; `steps/s28` L1-7, `s29` L1-7 |
| 3 | **Two sign conventions in `patient_payments.amount`**: migrated rows keep the Denticon signed delta (payment **negative**), app rows store a positive magnitude; `payment_type='adjustment'` rows are signed in both eras. `app/services/ledger_sign.py` is the only arbiter. | [V] `ledger_sign.py` L55-68; `s29` L74 |
| 4 | **In-app insurance payments ("pays off claims") exist only in `ledger_insurance_details`** — no `patient_payments` row is written — and no balance / ledger / collections / A/R / statement code reads that table. | [V] `billing_service.py` L411-530; `FE:src/components/patient/InsurancePaymentModal.tsx` L266-339; grep of `LedgerInsuranceDetail` = only `billing_service`, `procedure_totals_service`, `patient_extra_service` |
| 5 | **Adjustments live in 3 places, refunds in 2.** Credit ("−") adjustments → `patient_adjustments`; debit ("+") adjustments, all legacy adjustments and balance transfers → `patient_payments` with `payment_type='adjustment'`; insurance write-offs → `ledger_insurance_details.*_ins_adjust`. Refunds → `patient_refunds` (API only, no FE caller found) **or** `patient_payments` adjustment rows with codes `AR001…AR008`, `SUNBR`. | [V] `FE:src/features/transactions/AdjustmentsTab.tsx` L139-166; `transactionCodes.ts` L236-283; grep of FE for refund endpoints = 0 callers |
| 6 | **The legacy payment / adjustment code was not migrated.** `s29` keeps only `TYPE2` reduced to `cash / check / card / ach / NULL`. The 18 payment codes and 46 adjustment codes (with sign and Production/Collection group) are compiled into the **frontend** only. | [V] `s29` L18-24, L82; `parsers.py` L203-216; `FE:transactionCodes.ts` |
| 7 | **Dates are thin.** One business date per row (`date_of_service`, `payment_date`, `adjustment_date`, `refund_date`) plus `created_at` (naive UTC). On migrated rows `created_at` is the migration-run timestamp unless `backfill_ledger_source_fields.py --restore-created-at` was run. `LEDGER.TRANDATE` is dropped for charges that have a `DOSDATE`. No void date, no deposit date. | [V] `s28` L85; `scripts/backfill_ledger_source_fields.py` L38-42; models |
| 8 | **Payment → procedure allocation is unusable for history**: the export holds 6,951 allocation rows for ~1.33M payments, every amount 0.0000. What survives is `patient_procedures.pat_paid` / `pat_adjust` (scalar per charge). | [D] `docs/account-ledger/account_ledger_backend_response.md` L329-385; [V] `clinical.py` L85-90 |
| 9 | **Entities that do not exist**: deposit / deposit slip / payment batch, day close, financial period lock, A/R snapshot, finance-charge or late-charge engine, sales-tax engine, insurance-remittance header, first-class signed adjustment. Settings columns for several exist but nothing reads them. | [V] grep (§1.13) |
| 10 | `patient_procedures.fee` is the **charged / contracted** fee (`LEDGER.AMOUNT`); `ucr_fee` is the office UCR (`LEDGER.UCRFEE`). `UCRFEE > AMOUNT` on 32,440 sampled 2025 charges (mean $143.85/line; "53 % of 2025 legacy lines" per the `offices` model comment), so the PPO write-off is largely **embedded in the fee**, not posted as an adjustment. Gross (UCR) vs net production must be defined on these two columns. | [D] `docs/pricing/pricing_hierarchy_architecture.md` L164-171; [V] `s28` L108-109 |
| 11 | Attribution columns exist for provider (`provider_id`, `hygienist_id`; claim `billing_provider_id` / `treating_provider_id`), office (`office_id`; `created_office_id` on payments), user (`created_by` FK + `created_by_legacy` string), and guarantor (`patients.account_id` → `accounts`; `patient_payments.account_id`). | [V] §2 |
| 12 | `patient_procedures`, `patient_payments`, `insurance_claims`, `payment_allocations`, `ledger_insurance_details` have **no `tenant_id`**; every tenant-scoped aggregate must join `patients`. | [V] models |
| 13 | **No index supports an office/provider/date report.** The only date indexes are `(patient_id, date_of_service)` and `(patient_id, payment_date)` (each created twice). | [V] `schema.sql` L11069-11097, L12294, L12329; Alembic grep |
| 14 | Write audit: `audit_logs.details.before/after` is recorded for generic CRUD writes (`patient-payments`, `patient-adjustments`) but **not** for `patient-procedures` (custom CRUD never calls `_audit`). Voids carry no timestamp / user / reason except on `ledger_insurance_details`. | [V] `app/crud/base.py` L232-316; `patient_procedure_service.py` L107-248 |

---

## 1. Where each money concept is stored

### 1.0 Store inventory

| Store (table) | Model | Role | Tenant column | PK | Volume |
|---|---|---|---|---|---|
| `patient_procedures` | `app/db/models/clinical.py` L30-134 | posted charges = production | none (via `patients`) | `String(50)`: `PROC-{LEDGERID}` migrated, `PP-{uuid7}` plan instalment, else generated | 1,372,616 rows [D] (`clinical.py` L96); 71 % of charges predate 2020 [D] |
| `patient_payments` | `billing.py` L31-76 | legacy P / I / A + app payments + app debit adjustments + transfers | none | `String(50)`: `PAY-{LEDGERID}`, `AP-{uuid7}` account-payment slice, `XF-{uuid7}` balance transfer, `AN-{uuid7}` AppointNow, else client `genId()` | source export 1,333,623 P/I/A rows [D]; a 2026-08-22 measurement reported 185,885 negative + 14,606 positive rows [D] — **re-measure** (§8 Q7) |
| `patient_adjustments` | `patient_extra.py` L80-99 | app-era credit adjustments (never migrated into) | `tenant_id` | int | app-era only [I] |
| `ledger_insurance_details` | `billing.py` L190-245 | per-procedure carrier remittance (paid / adjust / deductible / estimate) | none | int | 12,191 migrated archive rows, 216 attached to a claim, none carrying a paid amount [D] (`alembic/versions/a6b7c8d9e0f1_*.py` L11-15) + app rows |
| `patient_refunds` | `billing.py` L531-561 | first-class refund | `tenant_id` | int | probably empty — API exists, no FE caller [I] |
| `payment_allocations` | `billing.py` L248-268 | payment/adjustment → procedure split | none | int | 6,951 migrated rows, all amount 0 [D] + app rows |
| `patient_opening_balances` | `patients.py` L587-605 | seeded opening A/R buckets, one row per patient | `tenant_id` | int | — |
| `insurance_claims` | `billing.py` L79-173 | claim header + money totals | none | `String(50)`: `CLM-{CLAIMID}` or generated | 96,314 claims, 79,038 with non-zero `total_paid` [D] |
| `claim_submissions` | `billing.py` L176-187 | one row per send (has `batch_id`) | none | int | — |
| `patient_payment_plans`, `ortho_plans`, `patient_reg_plans` | `billing.py` L271-325, L401-490, L378-398 | contract headers | `tenant_id` | int | — |
| `patient_ins_payment_plans`, `patient_sec_ins_payment_plans`, `patient_plan_installments` | `billing.py` L328-375, L493-528 | instalment schedules (ins / sec ins / patient side) | `tenant_id` | int | — |
| `patient_statements` | `billing.py` L564-603 | frozen statement snapshot | `tenant_id` | int | probably empty — no FE caller of the generate endpoints [I] |
| `accounts`, `account_parties`, `account_change_events` | `accounts.py` L62-158 | guarantor accounts | `tenant_id` | int | — |
| `procedure_fee_provenance` | `clinical.py` L137-201 | write-once archive of Denticon `LEDGERINSD` pricing per charge (1.45M source rows) | via procedure | int | loaded only if `scripts/load_procedure_fee_provenance.py` was run [I] |

Scale context [D]: 83,861 patients, 15 offices, ~97 providers (about 80 dentists / 17 hygienists after role normalisation), 1,122 procedure codes, 31,337 insurance plans, 1,340 carriers, 876,732 coverage rules, 43 tenants, 2,793,786 `LEDGER` rows.

### 1.1 Charges / completed procedures — `patient_procedures` [V]

| Column | Meaning for reports |
|---|---|
| `procedure_code` → `procedure_codes.code` | CDT/CPT/account code. Category via `procedure_codes.category` / `coverage_category` / `is_ortho` |
| `date_of_service` (DATE, NOT NULL) | the single business date. Migrated = `DOSDATE`, falling back to `TRANDATE` (`s28` L85). App = the screen's transaction date |
| `fee` (NUMERIC 12,2 NOT NULL) | charged amount = `LEDGER.AMOUNT`; app = server-resolved contracted fee or an override |
| `ucr_fee` | office UCR for the code (`LEDGER.UCRFEE`; app: office `default_ucr_fee_schedule_id`). `ucr_fee − fee` = implied contractual write-off |
| `insurance_estimate` | **primary** payer estimate at posting (`LEDGER.ESTINS`). Never reduced when paid |
| `sec_insurance_estimate` | secondary payer estimate (app-era only) |
| `patient_estimate` | patient share. **0.00 on 1,372,558 of 1,372,574 migrated rows** [D] → derive `fee − insurance_estimate − sec_insurance_estimate` |
| `estimated_deductible`, `coverage_pct`, `coverage_rule_id` | pricing provenance (app-era); `coverage_rule_id → insurance_coverage_rules.ins_plan_id` identifies the plan that priced the line |
| `pat_paid`, `pat_adjust` | `LEDGER.PATPAID` / `PATADJUST`: patient money applied to this charge in Denticon. The only per-charge applied amounts for history |
| `provider_id` (NOT NULL) | treating provider |
| `hygienist_id` | second (hygiene) provider recorded with the charge (app-era, CHG-6) |
| `office_id` (NOT NULL) | office of service |
| `claim_id` → `insurance_claims.id` | set when billed; backfillable from `LEDGER.CLAIMID` for 297,671 rows [D]. `claim_id IS NULL` = unbilled |
| `billing_status` | `not_billed` (default) \| `billed` (set by `submit_claim`, `billing_service.py` L842) \| `paid` (migration only: `PATPAID > 0`, `s28` L113) |
| `apply_to`, `billing_order`, `resp_type` | `LEDGER.APPLYTO` (`P`/`I`); `primary`/`secondary`/`tertiary` from `BILLINGORDER`; `resp_type` unused |
| `hold_claim` | held back from insurance (legacy "H") |
| `quantity` | ADA Item 29b units, default 1. Whether `fee` is per unit or line total is not stated in code (§8 Q8) |
| `treatment_plan_id`, `treatment_plan_item_id` | planned → completed lineage (case-acceptance joins) |
| `appointment_id` | link to the visit (migrated from `APPTDID`/`APPTID`) |
| `fee_schedule_id`, `fee_source`, `fee_effective_date`, `fee_override_reason` | which list priced the charge; `fee_source` vocabulary in §3.8. NULL on migrated rows [I] |
| `is_void`, `is_archived` | void flag (DELETE = void, `registry.py` L984); `is_archived` = row came from `Ledger_archive.txt` |
| `created_by` / `created_by_legacy` / `created_at` / `updated_by` / `updated_at` | poster FK, raw Denticon login, timestamps |
| `duration_minutes` | `LEDGER.DURATION`; non-zero on 7 of 1.46M source rows [D] → useless for history |

Not on the row: account id, patient type, carrier, tender, transaction date distinct from DOS, void metadata, ICD/CPT cross-codes (`LEDGER.ICD1-4`, `CPTCODE`, `MODIFIER` exist in the export and are dropped [D]).

Charges created by payment-plan posting: `payment_plan_service._post_row` (L276-356) writes a real `patient_procedures` row with `id = PP-{uuid7}`, the plan's billing code (`ACBIL`, `ACBILO` — `procedure_codes.category = 'Account'` — or a `D8xxx` periodic code), `insurance_estimate = fee` for the insurance sides. No FE caller of the post endpoints was found [I].

### 1.2 Patient payments — `patient_payments` [V]

| Column | Meaning |
|---|---|
| `payment_type` (String 20, NOT NULL, **no enum**) | `patient` \| `insurance` \| `adjustment`. Migrated from `LTYPE` P / I / A (`s29` L81). App: `patient` or `insurance` = the screen's "Apply To"; `adjustment` = a debit adjustment or a balance transfer |
| `amount` (NUMERIC 12,2) | sign depends on era and type — §2.1 |
| `payment_date` (DATE, NOT NULL) | business date. Migrated = `TRANDATE` (`s29` L63) |
| `payment_method` (String 50) | tender **or** code — overloaded, §3.2 |
| `check_number`, `bank_number`, `eob_number`, `eft_trace_number` | identifiers captured on the row (`CHECKNO` migrated; the rest app-era) |
| `provider_id` (nullable) | provider credited. Migrated from `LEDGER.PROVIDERID`; app: optional picker |
| `office_id` (nullable) | operational office (migrated `LEDGER.OID`) |
| `created_office_id` | posting (working) office stamped from `X-Office-ID` (OFF-SCOPE-11); app-era only |
| `account_id` | account the payment was posted against — stamped at insert by the hook in `accounts.py` L408-425 and backfilled from the patient for history (`account_backfill.py` L157) |
| `account_payment_id` | groups the slices of one guarantor payment (`ACCT-{uuid7}`) or a balance-transfer pair (`XFER-{uuid7}`) |
| `is_void`, `is_archived` | void flag (DELETE = void); archive flag |
| `created_by`, `created_by_legacy`, `created_at`, `updated_by`, `updated_at` | as charges |
| `notes` | free text. A reversed payment gets `\n[REVERSED] {reason}` appended (`refund_service.py` L208). Card reference is folded in as `CC ****1234 exp MM/YYYY` (gap PAY-2) |

Not on the row: carrier / plan / claim for an insurance payment, card type, deposit reference, tender category, void metadata.

Writers [V]: generic CRUD `POST /patient-payments` (Payments tab, Adjustments tab "+" codes, Insurance Payment window in "check to previous balance" mode); `family_account_service.post_account_payment` L1094-1196 (N rows, one per member); `_transfer_balance` L612-634 (two `adjustment` rows, `payment_method='balance_transfer'`); `appointnow_payment_service.post_payment_to_ledger` L104-135.

### 1.3 Insurance payments [V]

| Era / path | Stored in | Granularity | Carrier linkage |
|---|---|---|---|
| Migrated (`LTYPE='I'`) | `patient_payments`, `payment_type='insurance'` | one row per ledger line | **none** on the row |
| Migrated claim totals | `insurance_claims.total_paid` (= `CLAIMH.RECVDAMT`), mirrored into `opening_paid` | per claim | `carrier_id`, `ins_plan_id` |
| App "pays off claims" | `ledger_insurance_details`: `prim_ins_paid` / `sec_ins_paid` / `ter_ins_paid`, `*_ins_adjust`, `*_deductible`, `*_estimated`, `payment_date`, `payment_method`, `check_number`, `bank_number`, `eob_number`, `eft_trace_number`, `notes` | one row **per procedure line** per remittance; no header row | `claim_id → insurance_claims.carrier_id`; `prim/sec/ter_ins_plan_id` |
| App "insurance check to previous balance" | `patient_payments`, `payment_type='insurance'`, no allocation | one row | none |

`insurance_claims.total_paid` is **derived**: `opening_paid + Σ live coverage rows` (`billing_service._recompute_claim_totals` L244-275). The FE posts one `POST /ledger-insurance-details/payment` per line (not the batch route), so the claim-level `write_off_amount` / `write_off_mode` / `write_off_value` (set only by the batch route, L533-554) stay NULL for those posts [V][I] — sum the lines instead.

### 1.4 Adjustments [V]

| Kind | Stored in | Sign | Code column | Group |
|---|---|---|---|---|
| App **credit** ("−" codes: write-off, courtesy, discount…) | `patient_adjustments` | positive `amount` = credit | `adjustment_type` = legacy code (`AC013`…) | `write_off_type` (see §3.4) |
| App **debit** ("+" codes: finance/late charge, NSF fee, refund, reinstate, transfer-to, sales tax, previous balance) | `patient_payments`, `payment_type='adjustment'` | positive = debit | `payment_method` = code (`AD003`…) | none stored |
| Balance transfer between members | `patient_payments`, `payment_type='adjustment'`, `payment_method='balance_transfer'` | pair: `−X` on one patient, `+X` on the other, shared `account_payment_id` | — | — |
| **Legacy** adjustments (`LTYPE='A'`) | `patient_payments`, `payment_type='adjustment'` | as posted in Denticon (negative = credit) | **lost** — `payment_method` holds mapped `TYPE2` or NULL | lost |
| Insurance write-off (app) | `ledger_insurance_details.prim_ins_adjust` / `sec_ins_adjust` / `ter_ins_adjust` | non-negative = credit (`_reject_negative`, `billing_service.py` L365-377) | none | — |
| Contractual write-off embedded in the fee | not a row: `patient_procedures.ucr_fee − fee` | — | — | — |

`patient_adjustments` columns: `tenant_id`, `patient_id`, `office_id`, `provider_id`, `procedure_id` (optional single target), `adjustment_date`, `amount`, `adjustment_type`, `write_off_type`, `notes`, `is_void`, `created_by`, `created_at`. No `updated_at` / `updated_by`, no sign column.

### 1.5 Refunds [V]

`patient_refunds`: `tenant_id`, `patient_id`, `office_id`, `refund_date`, `amount` (> 0), `refund_method` (`check | eft | credit_card | cash`), `reason`, `reason_code` (`overpayment | duplicate | cancellation`; `reversal` written by `reverse_payment`), `source_payment_id`, `reversed_type` (`payment | adjustment`), `reversed_id`, `check_number`, `reference_number`, `authorized_by`, `notes`, `is_void`, `created_by`. Written only by `POST /patients/{id}/refunds` and `POST /patient-payments/{id}/reverse` with a `refund_method` (`refund_service.py` L119-258).

In practice the UI posts refunds as debit adjustments (§1.4: `AR001` REFUND - Patient, `AR002` Credit Card, `AR003` Insurance, `AR004` State, `AR007` 3rd Party Finance, `SUNBR` Sunbit Refund; reversals `AR005`, `AR006`, `AR008`; `AI001` REFUND - Voided is a credit). A refund report must union both.

### 1.6 Allocations / splits — `payment_allocations` [V]

Columns: `patient_id`, `procedure_id`, `payment_id` **xor** `adjustment_id`, `claim_id`, `ins_plan_id`, `provider_id`, `alloc_date`, `amount`, `alloc_type` (legacy `LTYPE` string; `'ADJ'` for adjustment splits; NULL for app payment splits), `legacy_id`, `created_at`. No void flag, no office, no user.

| Source | State |
|---|---|
| Migrated | 6,951 rows, `AMOUNT = 0.0000` on all, `PROCLEDGERID` on 1,753 [D] → no information |
| App payment | optional: the Payments tab calls `POST /patient-payments/{id}/allocate` only when the user enters per-procedure amounts; lines carry `procedure_id`, `amount`, `alloc_date` only (`FE:PaymentsTab.tsx` L190-196) |
| App adjustment | `POST /patient-adjustments/{id}/allocate` (`alloc_type='ADJ'`), or one `patient_adjustments` row per procedure via the scalar `procedure_id` |
| Guard | `Σ allocations ≤ payment.amount` — compared against the **raw signed** amount (`billing_service.py` L70), so it cannot be used on a migrated (negative) payment |

Per-charge roll-up used by the UI: `procedure_totals_service.applied_totals` (L161-187) = allocations where present, else the legacy scalars `pat_paid` / `pat_adjust`; insurance = insurance-linked allocations + `ledger_insurance_details` paid columns.

### 1.7 Payment plans [V]

| Table | Contract kind | Key money columns |
|---|---|---|
| `patient_payment_plans` (`plan_type` `regular` \| `ortho`) | canonical regular contract | `plan_bal_amt`, `tx_plan_amt`, `amt_financed`, `down_payment`, `apr`, `fin_charge`, `total_of_payments`, `interval_type`, `num_payments`, `periodic_amt`, `first_due_date`, `setup_date`, `rem_payments`, `rem_total_amt`, `billing_code`, `treatment_plan_id`, `office_id`, `is_active`, `created_by_id`, `updated_by` |
| `ortho_plans` | ortho contract, three sub-plans | `total_ortho_amt`, `ins_share_amt`, `pat_share_amt`; `pat_*` (financed, down pay, apr, fin charge, interval, num payments, periodic, rem, first due, setup date); `ins_*` and `sec_ins_*` (plan amount, down pay, interval, num payments, periodic, rem, first due, months remaining); `banding_date`, `treat_start_date`, `treat_end_date`, `tx_duration_months`, `months_remaining`; `procedure_code` (periodic), `initial_procedure_code`, `pref_provider_id`, `ins_plan_id`, `sec_ins_plan_id`, `office_id`, `created_office_id`, `is_active` |
| `patient_ins_payment_plans`, `patient_sec_ins_payment_plans` | insurance instalments | `ortho_plan_id`, `periodic_order`, `periodic_date`, `periodic_amt`, `plan_amount`, `down_payment`, `rem_total_amt`, `rem_payments`, `is_billed`, `billing_code`, `ledger_id` |
| `patient_plan_installments` (`plan_side` `patient` \| `ins` \| `sec_ins`) | patient-side instalments for both kinds | same shape + `ortho_plan_id` xor `payment_plan_id` |
| `patient_reg_plans` | migration-only landing table (PP-4) | legacy copy; do not report from it once reconciled |

Facts that matter for reports: (a) `is_billed` + `ledger_id` (= the posted `patient_procedures.id`) are the only posted/unposted state; (b) on contract headers `rem_payments` / `rem_total_amt` / `pat_rem_amt` / `ins_rem_amt` are **stored inputs that posting never decrements**; on instalment rows they are the scheduled balance-after values written at generation (`payment_plan_service.py` L161-162) — derive the live remaining from unbilled instalment rows; (c) **no link exists between a payment and a plan or instalment**, so "paid vs due" per contract cannot be read, only inferred from the patient balance; (d) DELETE is a soft delete (`is_active=false`), hidden from default lists; (e) card data is token-only (`payment_token_id`, `card_last4`).

### 1.8 Statements [V]

`patient_statements`: `patient_id`, `account_id`, `statement_scope` (`patient | account`), `office_id`, `statement_date`, `period_start`, `period_end`, `opening_balance`, `total_charges`, `total_payments`, `total_adjustments`, `closing_balance`, `aging_current / aging_30 / aging_60 / aging_90 / aging_120`, `message`, `batch_id`, `delivery_method` (`print | email | download`), `delivery_status` (`generated | printed | emailed | downloaded`), `delivered_to`, `delivered_at`, `snapshot` (JSON), `created_by`. Office messages per aging bucket: `office_statement_settings.message_current / _30 / _60 / _90 / _120 / message_general`. "Email" delivery only records intent (`statement_service.py` L286-288).

### 1.9 Balances / aging [V]

Nothing is materialised. `balance_service.patient_balance_core` (L218-280) computes on read and caches 30 s in Redis (`balance:{tenant}:{patient}`); report endpoints cache 60 s. Aging everywhere is **gross charge dating** (Σ `fee` bucketed by age of `date_of_service`, payments not applied) plus `patient_opening_balances` buckets. Keys: `current, b30, b60, b90, b120`. `patient_opening_balances`: `as_of_date`, `current`, `over_30`, `over_60`, `over_90`, `over_120`, `notes`, one row per patient (unique index).

### 1.10 Unapplied credits [V]

No table. `refund_service.refundable_balance` (L87-115) returns `credit_balance = −balance` when the patient balance is negative, and `unallocated_payments = Σ payment credits − Σ payment_allocations.amount`. The second figure is unreliable: migrated allocations are all zero, and the subtraction also includes **adjustment** allocations (no `payment_id IS NOT NULL` filter, L99-103).

### 1.11 Family / guarantor accounts [V]

| Table / column | Meaning |
|---|---|
| `accounts` | `tenant_id`, `account_no` (Denticon RPID for migrated accounts), `legacy_key`, `primary_guarantor_patient_id` xor `primary_guarantor_party_id`, `home_office_id`, `send_statements`, `no_email_statement`, `send_collections`, `collection_agency_id`, `is_finance_charge`, `statement_message`, `financial_notes`, `is_active`, `merged_into_account_id`, `merged_at` |
| `account_parties` | up to two additional responsible parties: `role` (`secondary`, `billing_contact`), `responsibility_pct`, `receives_statements` |
| `account_change_events` | append-only: `action` (`change_guarantor`, `merge`, `party_added`, `party_updated`, `party_removed`, `primary_changed`, `account_updated`, `account_payment`), `old_account_id`, `new_account_id`, `moved_balance`, `effective_date`, `user_id` |
| `patients.account_id` | the account a patient belongs to **now** (every ORM-inserted patient gets one; nullable only for raw-SQL imports until `scripts/backfill_patient_accounts.py` runs) |
| `patients.guarantor_patient_id` / `guarantor_party_id` | typed guarantor (`= id` means Self); both NULL = migrated unresolved |
| `patients.responsible_party_id` (String) | deprecated alias — never group by it |
| `responsible_parties` | non-patient guarantor demographics + billing flags |
| `collection_agencies` | agency catalog (`imaging.py` L66-79) |

Charges have **no** `account_id`: a charge follows the patient's current account, while a payment keeps the account it was posted against. Moving a patient between accounts therefore moves historical charges but not historical payments, unless the balance-transfer pair was written.

### 1.12 Pricing reference [V]

`fee_schedules` (`fee_type`, `pricing_model`, `effective_date`, `version`), `fee_schedule_entries` (`patient_fee`, `insurance_fee`, `is_no_charge`, `effective_date`), `fee_schedule_assignments` (plan / carrier / provider / specialty, narrowed by office / office group), `offices.default_fee_schedule_id`, `offices.default_ucr_fee_schedule_id`, `offices.unpriced_charge_policy`, `patients.fee_schedule_id`. `settings.PRICING_ENGINE_V2 = True` (`app/core/config.py` L425): on create the server stamps `fee`, `ucr_fee`, `fee_schedule_id`, `fee_source`, `fee_effective_date`, `insurance_estimate`, `sec_insurance_estimate`, `patient_estimate`, `estimated_deductible`, `coverage_pct` (`estimate_service.apply_split` L842-886).

Planned-work money (for case acceptance): `treatment_plan_items.fee`, `ucr_fee`, `insurance_estimate`, `sec_insurance_estimate`, `discount`, `estimated_deductible`, `status`, `diagnosed_date`, `accepted_date`, `scheduled_date`, `provider_id`, `counselor_user_id`, `is_archived` (`treatment.py` L30-121); scheduled production: `appointment_procedures.fee`, `insurance_estimate`, `est_patient` (`scheduling.py` L105-135).

### 1.13 What does not exist [V] (grep over `app/**`)

| Concept | State |
|---|---|
| Deposit / deposit slip / payment batch | no table, no column. Only per-row `check_number`, `bank_number`, `eft_trace_number`, `eob_number` |
| Insurance remittance header | none. One cheque = N `ledger_insurance_details` rows sharing header values; the batch route creates no header entity |
| Day close / end of day / financial period lock | none. Only `time_clock_periods` locks. Any charge / payment can be edited, back-dated or voided at any time |
| A/R or production snapshot | none. Every figure is recomputed from live rows |
| Finance / late charge, sales tax, auto periodic posting | columns only: `office_advanced_settings.finance_charge_pct`, `min_balance`, `min_charge`, `days_before_charge`, `sales_tax_pct`; `account_settings.auto_post_periodic_charges`, `statement_close_out_individual`, `statement_close_out_all`, `show_booked_production`, `credit_ins_overpayment_to_patient`, `default_write_off_code`, `default_transfer_code`, `default_fee_increase_code`, `default_fee_decrease_code`. No reader in any service. (`min_balance` is reused as a refund-approval threshold, `refund_service.py` L74-77) |
| Collection-agency transfer | flags only (`accounts.send_collections`, `collection_agency_id`); no transfer transaction, no agency balance |
| Signed first-class adjustment | no (gap ADJ-2) |

---

## 2. Per-table attribute matrix

### 2.1 Amount and sign

| Table.column | Stored sign | Normalised delta (what the row adds to the balance) |
|---|---|---|
| `patient_procedures.fee` | positive | `+fee` |
| `patient_payments.amount`, `payment_type ≠ 'adjustment'`, migrated | Denticon signed delta: payment **negative** | `ledger_sign`: `−abs(amount)` |
| same, app-created | positive magnitude | `−abs(amount)` |
| `patient_payments.amount`, `payment_type = 'adjustment'` | signed: negative = credit, positive = debit | `amount` verbatim |
| `patient_adjustments.amount` | positive = credit | `−amount` |
| `ledger_insurance_details.*_ins_paid`, `*_ins_adjust` | non-negative | `−value` (**no consumer applies it today**) |
| `patient_refunds.amount` | positive | `+amount` |
| `patient_opening_balances.current … over_120` | positive | `+value` |
| `payment_allocations.amount` | positive on app rows; 0 on migrated | not a balance row |
| `insurance_claims.total_billed / total_paid / est_insurance / opening_paid / write_off_amount` | positive | informational |

Risk [I]: `−abs(amount)` turns **any** non-adjustment row into a credit. A migrated `LTYPE` P or I row with a **positive** `AMOUNT` (a legacy payment reversal) would be counted as money in. Check before trusting history: `SELECT payment_type, COUNT(*), SUM(amount) FROM patient_payments WHERE legacy_id IS NOT NULL AND payment_type IN ('patient','insurance') AND amount > 0 AND NOT is_void GROUP BY 1`. If non-trivial, use `amount` verbatim for `legacy_id IS NOT NULL` rows.

### 2.2 Dates

| Table | Business date | System timestamps | Other dates | Missing |
|---|---|---|---|---|
| `patient_procedures` | `date_of_service` | `created_at` (naive UTC, NOT NULL DEFAULT now()), `updated_at` | `fee_effective_date` | separate transaction/posting date; void date |
| `patient_payments` | `payment_date` | `created_at`, `updated_at` | — | deposit date; void date |
| `patient_adjustments` | `adjustment_date` | `created_at` | — | `updated_at`; void date |
| `patient_refunds` | `refund_date` | `created_at` | — | void date |
| `ledger_insurance_details` | `payment_date` (NULL on migrated rows — not in `s32` COLS) | `created_at`, `voided_at` | — | deposit date |
| `payment_allocations` | `alloc_date` | `created_at` | — | — |
| `insurance_claims` | `date_of_service_from` / `_to` | `created_at` | `submitted_date`, `paid_date`, `close_date`, `date_last_srp`, accident / ortho dates | `updated_at`; per-payment dates |
| `patient_statements` | `statement_date`, `period_start`, `period_end` | `created_at` | `delivered_at` (DATE) | — |
| plans / instalments | `setup_date`, `first_due_date`, `periodic_date`, `banding_date`, `treat_start_date`, `treat_end_date` | `created_at`, `updated_at` on headers | — | actual post date on the instalment (only via `ledger_id → patient_procedures.date_of_service`) |

Semantics [V]:
- **Migrated `created_at`**: `s28` / `s29` now carry `CREATEDON`, but rows loaded earlier hold the migration-run timestamp; `scripts/backfill_ledger_source_fields.py --restore-created-at` is the only repair and its application on each DB is unknown. Until verified, a "created date" basis is not trustworthy on history.
- **Migrated claims** (`s30` L16-22): only `submitted_date` (`CLAIMSENTDATE`) and `paid_date` (`PAIDDATE` or `RECVDDATE`) are loaded. `date_of_service_from/to`, `close_date`, `est_insurance`, `billing_provider_id`, `treating_provider_id` are **not** — they are NULL / 0 on migrated claims unless recomputed.
- **Timestamps** are `TIMESTAMP WITHOUT TIME ZONE` holding UTC (`app/core/datetimes.py` L1-21). Office-local date = `(created_at AT TIME ZONE 'UTC' AT TIME ZONE offices.timezone)::date`.
- **Business dates are whatever the client sent.** Server defaults differ: UTC today in `billing_service` (L427, L468), `refund_service._today`, `statement_service._today`, `payment_plan_service` (L329, L396); server-local `date.today()` in `family_account_service` (L1169, L1259); office-local in `appointnow_payment_service` and the patient PDFs.

### 2.3 Provider, office, patient / guarantor, void, user

| Table | Provider columns | Office columns | Patient / guarantor | Void / soft delete | User columns |
|---|---|---|---|---|---|
| `patient_procedures` | `provider_id` (treating, NOT NULL), `hygienist_id` | `office_id` (NOT NULL) | `patient_id`; account via `patients.account_id` | `is_void`, `is_archived` | `created_by`, `created_by_legacy`, `updated_by` |
| `patient_payments` | `provider_id` (nullable) | `office_id` (nullable), `created_office_id` | `patient_id`, `account_id`, `account_payment_id` | `is_void`, `is_archived` | `created_by`, `created_by_legacy`, `updated_by` |
| `patient_adjustments` | `provider_id` (nullable) | `office_id` (nullable; required on create) | `patient_id` | `is_void` | `created_by` |
| `ledger_insurance_details` | none (derive via `procedure_id → patient_procedures.provider_id`) | `office_id` (nullable, from the line) | `patient_id` | `is_void`, `void_reason`, `voided_at`, `voided_by` | `created_by` |
| `patient_refunds` | none | `office_id` (payload, else patient home office) | `patient_id` | `is_void` | `created_by`, `authorized_by` |
| `payment_allocations` | `provider_id` (nullable; unset by the FE on payment splits) | none | `patient_id` | none (rows deleted on re-split) | none |
| `insurance_claims` | `billing_provider_id`, `treating_provider_id` | `office_id` | `patient_id` | `is_active=false` = closed **or** deleted; `status` | `created_by` |
| `patient_statements` | none | `office_id` | `patient_id` (addressee), `account_id` | none | `created_by` |
| `patient_payment_plans` | none | `office_id` | `patient_id` | `is_active` | `created_by` (legacy text), `created_by_id`, `updated_by` |
| `ortho_plans` | `pref_provider_id` | `office_id`, `created_office_id` | `patient_id` | `is_active` | same |

Related dimensions [V]: `offices.office_group_id → office_groups` (one group per office), `offices.timezone`, `offices.billing_provider_id`; `providers.role` (canonicalised to `dentist | hygienist | assistant | specialist | staff`), `providers.specialty`, `providers.is_ortho_provider`, `providers.office_id` (home office — never use it to scope), `provider_offices` (M:N); `users.short_id`, `users.username`, `users.report_access_provider_id`; `patients.home_office_id`, `patients.patient_type` (definitions group `PATTYPE`) and `patients.patient_types` (JSON multi-tag `CH/CP/EF/OR/SN/SR/SS/UP`).

User attribution [D]: 2,229,533 of 2,793,786 legacy rows name a login with no `users` row — report the user as `COALESCE(users.short_id, users.username, created_by_legacy)`.

Office attribution of money follows each row's own `office_id`; nothing reconciles a charge at office A paid at office B.

---

## 3. Code vocabularies

### 3.1 Transaction type

| Layer | Values | Defined in |
|---|---|---|
| Denticon `LEDGER.LTYPE` | `C` charge, `P` patient payment, `I` insurance payment, `A` adjustment; other values skipped | `parsers.py` L167-183 |
| `patient_payments.payment_type` | `patient`, `insurance`, `adjustment` (free string) | model; gap PAY-3 |
| Account-ledger feed `source_type` | `charge`, `payment`, `adjustment`, `claim` | `ledger_service.py` L256-394 |
| Feed `transaction_kind` | `P` debit row, `C` credit row, `I` informational (claim event) | same |
| `/transactions` feed `transaction_type` | `charge`, `payment`, `adjustment`, `refund`, `claim` | `transactions_service.py` L311-475 |
| Source discriminator | `legacy_id IS NOT NULL` = migrated (charges, payments, claims); id prefixes in §1.0 | — |

### 3.2 Payment type / tender — `patient_payments.payment_method` is overloaded

| Row origin | What `payment_method` holds |
|---|---|
| Migrated | `LEDGER.TYPE2` mapped: `CA→cash`, `CK→check`, `CC/MC/VI/AM/DS→card`, `EFT→ach`, anything else → NULL (`parsers.py` L203-216). Card brand is lost |
| App payment (Payments tab) | the **legacy payment code** verbatim (table below) |
| App debit adjustment | the **adjustment code** (`AD003`, `AR001`, …) |
| Balance transfer | `balance_transfer` |
| Insurance Payment window | a `payment_method` definition key, or the fallback list `check`, `auto_deposit`, `credit_card`, `cash`, `other` (`FE:src/components/patient/insurancePayment.ts` L62-68) |
| AppointNow | `booking_requests.payment_method`, default `credit_card` |
| Account payment | request `tender` / `payment_method` |

Catalogs:

| Catalog | Where | Content |
|---|---|---|
| `definitions`, `group_code='payment_method'` | DB, per tenant; seeded by `scripts/seed_transaction_definitions.py` L59-72 | 11 generic rows: `cash`, `check`, `credit_card`, `debit_card`, `money_order`, `ach`, `care_credit`, `eft` (`key2='patient'`); `insurance`, `insurance_check`, `insurance_eft` (`key2='insurance'`). `key2` = who paid, **not** tender |
| Legacy payment codes (18) | **frontend only**: `FE:src/features/transactions/transactionCodes.ts` L61-80 | below |

| Tender category | Codes |
|---|---|
| Cash | `PP005` PMT PAT-Cash · `APBAC` Previous Balance, Credit · `APBIC` Previous Balance, Ins Credit |
| Check | `PP009` PMT PAT-Check · `PP002` E Check · `PP004` Collection Agency - Check |
| Credit Card | `PP006` American Express · `PP001` Debit Card · `PP007` Discover · `PP008` Master Card / Visa |
| Direct Dep. | `PA001` AUTO/RECUR-Check · `PA002` Master Card/Visa · `PA003` American Express · `PA004` Discover · `PA005` EZPAY Check |
| Third-party Financing | `PF001` Care Credit · `PF005` Sunbit Payment |
| None | `COLPY` PT Paymt To Collections Agency |

The tender category lives only in that file; the DB cannot answer "is `PP008` a card?" (gap PAY-1).

### 3.3 Adjustment codes (46) — sign and group, frontend only [V]

Source: `FE:transactionCodes.ts` L236-283. Sign `+` raises the patient balance (debit), `−` lowers it (credit). Group decides which total the adjustment belongs to.

| Sign / group | Codes |
|---|---|
| **− Production** (16) | `AC013` Admin Adjustment · `AC009` Bankruptcy · `AC012` Collection Fee · `AFEED` Contract Adjustments · `AC006` Coupon · `AC014` Courtesy Discount · `AC003` Failed Treatment · `AC015` Ins Agreement · `AC001` Late Charge (off) · `AC004` Over Charged Revenue · `AC011` Reinstate Credit · `AC005` Special Promotion · `AC007` Tr to Coll Agency · `AC002` Treatment Incomplete · `AC008` Uncollectable Balance · `AC010` TRANSFER - Charges From |
| **− Collection** (5) | `ACCNN` Cancel Contract (−) · `COLFE` Collection Agency Fee For Serv · `ACRED` Credit Adjustment · `AI001` REFUND - Voided · `AI010` TRANSFER - Payment to |
| **+ Production** (10) | `AFEEI` Contract Adjustments (on) · `AD004` Increase Patient · `AD002` Ins Agreement (on) · `AD001` Reinstate Balance · `AFCHG` FEE - Finance Charge (Account) · `ALCHG` FEE - Late Charge · `AD003` FEE - NSF · `APBAL` Previous Balance · `APBAI` Previous Balance Insurance · `AD010` TRANSFER - Charges To |
| **+ Collection** (15) | `AD900` Capitation Adjustment · `AINSO` AUTO - Insurance Adjustment · `ACCNC` Cancel Contract (+) · `ADEBT` Debit Adjustment · `AR001` REFUND - Patient · `AR002` REFUND - Credit Card · `AR003` REFUND - Insurance · `AR004` REFUND - State · `AR007` REFUND - 3rd Party Finance · `AR005` REV PMT - TransFirst CC AutoRF · `AR006` REV PMT - Payment (corp) · `AR008` REV PMT - Non-sufficient funds · `ATAX` Sales Tax · `SUNBR` Sunbit Refund · `AR010` TRANSFER - Payment From |

DB catalog: `definitions`, `group_code='adjustment'` — 12 generic rows (`write_off`, `courtesy`, `discount`, `contractual`, `senior_discount`, `employee_discount`, `prompt_pay_discount`, `charge_correction` with `key2='production'`; `bad_debt`, `nsf`, `collection_agency`, `account_transfer` with `key2='collection'`). No sign anywhere in the DB; none of the 46 legacy codes is seeded (gaps ADJ-3, PAY-1). Definitions are per tenant and editable through `/api/v1/definitions`.

### 3.4 `patient_adjustments.write_off_type` — two conflicting vocabularies [V]

| Source | Values |
|---|---|
| Backend intent (model comment, `patient_extra.py` L93-96) | `contractual`, `provider`, `insurance`, `courtesy` |
| What the UI actually writes (`FE:AdjustmentsTab.tsx` L156) | the code's group lower-cased: `production` or `collection` |
| Consumer (`transactions_service.adjustment_summary` L279-286) | any non-NULL value counts as a "write-off" → every UI-posted credit adjustment is a write-off, keyed `production` / `collection` |

### 3.5 Procedure categories [V]

| Column | Values | Source |
|---|---|---|
| `procedure_codes.category` (display label, indexed) | `Diagnostic`, `Preventive`, `Restorative`, `Endodontics`, `Periodontics`, `Prosthodontics`, `Oral Surgery`, `Orthodontics`, `Adjunctive`, `Implant Services`, `Maxillofacial Prosthetics`, `Other`; plus `Medical` (CPT; ~167 codes [D]) and `Account` (`ACBIL`, `ACBILO`) | `steps/s10_procedure_codes.py` L13-26; `scripts/seed_payment_plan_codes.py` L22-25 |
| `procedure_codes.coverage_category` (indexed) | `01` Diagnostic (`01A` X-Rays, `01B` Panoramic, `01C` PAs, `01D` Bitewings, `01E` Cone Beam) · `02` Preventive (`02A` Sealants, `02B` Space Maint) · `03` Restorative (`03A` Crowns, `03B` Build Up) · `04` Endodontics (`04A` Molar) · `05` Periodontics (`05A` Osseous Surgery, `05B` Arestin) · `06` Oral Surgery (`06A` Impactions) · `07` Prosthodontics / Inlays / Onlays · `08` Maxillofacial Prosthetics · `09` Implants (`09A` Crowns) · `10` Orthodontics · `11` Gen Adjunctive (`11A` Anesthesia, `11B` Biteguard) · `12` Non-covered. NULL = unmapped (CPT, `Z*`, synthetic) | `app/services/coverage_category_service.py` L68-119; seeded by `scripts/seed_coverage_categories.py` (722 of 1,122 codes [D]) |
| `procedure_codes.is_ortho`, `chart_category`, `taxable`, `sales_tax_code`, `ledger_code`, `ar_code`, `visit_code` | flags and legacy "Main" codes; `ledger_code` / `ar_code` have no reader | `codes.py` L61-101 |
| `production_types` | appointment production types (scheduler), not linked to procedure codes | `office_assignment.py` L23-36 |

There is no hygiene / doctor production flag on a code; "hygiene production" must be defined by provider role, `hygienist_id`, or a code list.

### 3.6 Claim vocabularies [V]

| Column | Values | Note |
|---|---|---|
| `insurance_claims.status` (free String 30) | UI list: `draft`, `submitted`, `paid`, `denied`, `closed` (`FE:src/components/patient/claimStatus.ts`); also written: `sent`, `preauth_sent` (`submit_claim`), `pending` (migration), plus whatever history holds | migration map `S→submitted, P→pending, R→paid, H→draft, D→denied, C→closed`, unknown → `draft` (`parsers.py` L188-199). Five different open/settled lists in services — see `be_existing_reporting.md` §2.6 |
| `insurance_claims.claim_type` | **overloaded**: migrated = tier (`primary` / `secondary`, from `BILLINGORDER`, `s30` L58-59); app = category (`dental` / `medical`) | use `billing_order` for the tier |
| `insurance_claims.billing_order` | `primary`, `secondary`, `tertiary`, `quaternary` | linked claims share `claim_number` with `-S/-T/-Q` suffix [D] |
| `insurance_claims.is_preauth` | pre-authorisation, not a receivable | excluded by no existing aggregate |
| `insurance_claims.is_active` | false = closed (`set_claim_status`, `patient_extra_service.py` L713-726) **or** soft-deleted | cannot tell the two apart from the flag |
| `claim_submissions.submission_status`, `batch_id` | `sent` (app); legacy codes | `batch_id` = `BATCH-{uuid7}` or legacy `CLAIMBATCHID` |

### 3.7 Refund, plan and misc vocabularies [V]

| Column | Values |
|---|---|
| `patient_refunds.refund_method` | `check`, `eft`, `credit_card`, `cash` (examples, not enforced) |
| `patient_refunds.reason_code` | `overpayment`, `duplicate`, `cancellation`, `reversal` |
| `patient_payment_plans.plan_type` | `regular`, `ortho` (write-enforced; reads may hold legacy strings) |
| `interval_type` | `monthly`, `semi_monthly`, `weekly`, `bi_weekly`, `quarterly`, `annually` (`payment_plan_service.py` L62-90) |
| `plan_side` | `patient`, `ins`, `sec_ins` |
| definitions groups | `plan_type`, `insert_class` (`NONE/CL1/CL2/CL3`), `financial_disclosure` (`STD/NOFIN/ORTHO`), `claim_status`, `claim_type` (carrier: `1` EClaim, `0` Paper), `coverage_type` (`I/P/H/C/M/S/O`), `attachment_type`, `PATTYPE` |
| `payment_allocations.alloc_type` | legacy `LTYPE` (e.g. `A`), `ADJ`, NULL |

### 3.8 Pricing vocabulary [V] (`app/services/fee_vocab.py`)

| Column | Values |
|---|---|
| `fee_schedules.fee_type` | `ucr`, `standard`, `plan`, `carrier` |
| `fee_schedules.pricing_model` | `percentage`, `copay` |
| `patient_procedures.fee_source` / `treatment_plan_items.fee_source` | `override`, `client_legacy`, `assignment_plan`, `assignment_carrier`, `patient_schedule`, `assignment_provider`, `office_default`, `office_ucr`, `plan_item`, `unpriced`, `migrated`; retired: `assignment`, `plan_schedule`, `code_default` |
| `offices.unpriced_charge_policy` | `flag` (post at 0.00 and mark unpriced), `refuse` |

---

## 4. How to compute the metrics correctly

### 4.0 One normalised row shape (the missing ledger)

Every correct metric is an aggregate over this union. `debit` raises the balance, `credit` lowers it; both are non-negative.

```sql
-- rpt_ledger_entries (view or nightly fact table)
-- 1 charges
SELECT 'charge' AS txn_class, 'patient_procedures' AS src, pp.id AS src_id,
       pt.tenant_id, pp.office_id, NULL::int AS posting_office_id,
       pp.patient_id, pt.account_id,
       pp.provider_id, pp.hygienist_id,
       pp.date_of_service AS txn_date, pp.created_at, pp.created_by, pp.created_by_legacy,
       pp.procedure_code AS code, NULL AS payer, NULL AS tender,
       pp.fee AS debit, 0 AS credit, pp.claim_id,
       (pp.legacy_id IS NOT NULL) AS is_migrated
FROM patient_procedures pp JOIN patients pt ON pt.id = pp.patient_id
WHERE NOT pp.is_void AND NOT pp.is_archived
UNION ALL
-- 2 payments held in patient_payments (legacy P/I, app patient, unallocated ins cheque, AppointNow, account slices)
SELECT 'payment', 'patient_payments', py.id, pt.tenant_id, py.office_id, py.created_office_id,
       py.patient_id, COALESCE(py.account_id, pt.account_id), py.provider_id, NULL,
       py.payment_date, py.created_at, py.created_by, py.created_by_legacy,
       py.payment_method,
       CASE WHEN lower(py.payment_type) LIKE 'ins%' THEN 'insurance' ELSE 'patient' END,
       py.payment_method, 0, abs(py.amount), NULL, (py.legacy_id IS NOT NULL)
FROM patient_payments py JOIN patients pt ON pt.id = py.patient_id
WHERE NOT py.is_void AND NOT py.is_archived
  AND lower(coalesce(py.payment_type,'')) <> 'adjustment'
UNION ALL
-- 3 adjustments held in patient_payments (legacy A, app "+" codes, balance transfers)
SELECT 'adjustment', 'patient_payments', py.id, ..., py.payment_method AS code, NULL, NULL,
       GREATEST(py.amount, 0), GREATEST(-py.amount, 0), NULL, (py.legacy_id IS NOT NULL)
FROM patient_payments py JOIN patients pt ON pt.id = py.patient_id
WHERE NOT py.is_void AND NOT py.is_archived AND lower(py.payment_type) = 'adjustment'
UNION ALL
-- 4 app credit adjustments
SELECT 'adjustment', 'patient_adjustments', a.id::text, a.tenant_id, a.office_id, NULL,
       a.patient_id, pt.account_id, a.provider_id, NULL,
       a.adjustment_date, a.created_at, a.created_by, NULL,
       a.adjustment_type, NULL, NULL, 0, a.amount, NULL, false
FROM patient_adjustments a JOIN patients pt ON pt.id = a.patient_id
WHERE NOT a.is_void
UNION ALL
-- 5 app insurance remittances: money
SELECT 'payment', 'ledger_insurance_details', l.id::text, pt.tenant_id,
       COALESCE(l.office_id, pp.office_id), NULL, l.patient_id, pt.account_id, pp.provider_id, NULL,
       l.payment_date, l.created_at, l.created_by, NULL,
       l.payment_method, 'insurance', l.payment_method,
       0, COALESCE(l.prim_ins_paid,0)+COALESCE(l.sec_ins_paid,0)+COALESCE(l.ter_ins_paid,0),
       l.claim_id, false
FROM ledger_insurance_details l
JOIN patients pt ON pt.id = l.patient_id
LEFT JOIN patient_procedures pp ON pp.id = l.procedure_id
WHERE NOT l.is_void AND l.legacy_ledger_id IS NULL            -- migrated archive rows carry no paid money [D]
UNION ALL
-- 6 app insurance write-offs (same FROM/WHERE as 5)
SELECT 'adjustment', 'ledger_insurance_details', l.id::text || ':wo', ..., 'INS_WRITE_OFF', 'insurance', NULL,
       0, COALESCE(l.prim_ins_adjust,0)+COALESCE(l.sec_ins_adjust,0)+COALESCE(l.ter_ins_adjust,0), l.claim_id, false
UNION ALL
-- 7 refunds
SELECT 'refund', 'patient_refunds', r.id::text, r.tenant_id, r.office_id, NULL, r.patient_id, pt.account_id,
       NULL, NULL, r.refund_date, r.created_at, r.created_by, NULL,
       r.refund_method, NULL, r.refund_method, r.amount, 0, NULL, false
FROM patient_refunds r JOIN patients pt ON pt.id = r.patient_id WHERE NOT r.is_void
UNION ALL
-- 8 opening balances
SELECT 'opening', 'patient_opening_balances', ob.id::text, ob.tenant_id, pt.home_office_id, NULL,
       ob.patient_id, pt.account_id, NULL, NULL, ob.as_of_date, ob.created_at, ob.created_by, NULL,
       'OPENING', NULL, NULL, ob.current+ob.over_30+ob.over_60+ob.over_90+ob.over_120, 0, NULL, false
FROM patient_opening_balances ob JOIN patients pt ON pt.id = ob.patient_id;
```

Balance of any scope = `SUM(debit) − SUM(credit)`.

Decision required before building on legs 5 and 6: today no screen balance includes them, so a report that does will disagree with `GET /patients/{id}/balance` and the ledger screen until the product posts insurance remittances into the ledger as well (§7 N1).

### 4.1 Gross production

```sql
SELECT pp.office_id, pp.provider_id, pc.category,
       SUM(pp.fee)                                   AS production_charged,   -- posted fee (contracted)
       SUM(COALESCE(NULLIF(pp.ucr_fee,0), pp.fee))   AS production_ucr,       -- office fee before contractual write-off
       COUNT(*) AS procedure_count
FROM patient_procedures pp
JOIN patients pt ON pt.id = pp.patient_id
JOIN procedure_codes pc ON pc.code = pp.procedure_code
WHERE pt.tenant_id = :tenant AND NOT pp.is_void AND NOT pp.is_archived
  AND pp.date_of_service BETWEEN :from AND :to           -- "transaction date" basis
  AND pc.category <> 'Account'                           -- exclude contract-billing instalments (decision, §8 Q4)
GROUP BY 1,2,3;
-- "created date" basis: replace the date predicate with
--   pp.created_at >= :from_utc AND pp.created_at < :to_utc   (bounds computed from the office timezone)
```

Hygiene production [I]: `provider_id IN (providers WHERE role='hygienist')`, plus rows whose `hygienist_id` is set when the practice credits the second provider — the rule is a product decision.

### 4.2 Net production

```
net_production = Σ charges.debit
               + Σ debit  of adjustments in group Production      (finance/late charge, increase, reinstate…)
               − Σ credit of adjustments in group Production      (write-off, courtesy, discount…)
               − Σ insurance write-offs (leg 6)                   -- only if the practice treats them as production adjustments
```

The group comes from the code (§3.3). It is resolvable for app rows (`patient_adjustments.adjustment_type`; `patient_payments.payment_method` on `adjustment` rows) by joining a code catalog that today exists only in the frontend. For **migrated** adjustments the code is gone, so historical net production can only be shown as `charged production − all credit adjustments + all debit adjustments` unless the legacy code is re-imported (§7 N4).

Contractual write-off already inside the fee: `Σ GREATEST(COALESCE(ucr_fee,fee) − fee, 0)`. Report it as "fee-schedule discount", never subtract it again from `production_charged`.

### 4.3 Collections

```sql
-- patient collections
SELECT SUM(abs(amount)) FROM patient_payments
WHERE NOT is_void AND NOT is_archived AND lower(payment_type) NOT IN ('adjustment')
  AND lower(payment_type) NOT LIKE 'ins%' AND payment_date BETWEEN :from AND :to;

-- insurance collections = legacy / unallocated cheques + app remittances
SELECT SUM(abs(amount)) FROM patient_payments
WHERE NOT is_void AND NOT is_archived AND lower(payment_type) LIKE 'ins%' AND payment_date BETWEEN :from AND :to
UNION ALL
SELECT SUM(COALESCE(prim_ins_paid,0)+COALESCE(sec_ins_paid,0)+COALESCE(ter_ins_paid,0))
FROM ledger_insurance_details
WHERE NOT is_void AND legacy_ledger_id IS NULL AND payment_date BETWEEN :from AND :to;
```

```
net_collections = patient + insurance
                − Σ debit  of adjustments in group Collection   (refunds AR00x, payment reversals, NSF, sales tax…)
                + Σ credit of adjustments in group Collection   (credit adjustment, transfer payment to…)
                − Σ patient_refunds.amount
```

Never use `ledger_sign.sum_payment_credit()` for collections: it also returns the credit side of `payment_type='adjustment'` rows (legacy write-offs, balance transfers).

Reconciliation identity for any scope and period: `Δ A/R = net_production − net_collections`. A report set that does not satisfy it is double counting or missing a leg.

Collections by tender: group by a tender category resolved from `payment_method` through a catalog (§3.2). Migrated rows give only `cash / check / card / ach / NULL`.
Collections by provider: `patient_payments.provider_id` (nullable — define the NULL bucket), or `payment_allocations.provider_id` → procedure provider where an allocation exists; app remittances via `procedure_id → patient_procedures.provider_id`.
Collections by carrier: app remittances via `claim_id → insurance_claims.carrier_id` or `prim/sec/ter_ins_plan_id → insurance_plans.carrier_id`. Migrated insurance payments have no carrier on the row; the only historical carrier money is claim-level `insurance_claims.total_paid` dated by `paid_date`.

### 4.4 Adjustments and write-offs

```sql
SELECT src, code, SUM(debit) AS debit, SUM(credit) AS credit
FROM rpt_ledger_entries
WHERE txn_class = 'adjustment' AND tenant_id = :tenant AND txn_date BETWEEN :from AND :to
  AND COALESCE(code,'') <> 'balance_transfer'      -- nets to zero across two patients; list separately
GROUP BY 1,2;
```

Transfers appear twice by design (`AC010`/`AD010`, `AR010`/`AI010`, `balance_transfer`); exclude them from production and collection totals and show them in their own section.

### 4.5 Insurance vs patient portion of production

```
insurance_portion = insurance_estimate + COALESCE(sec_insurance_estimate, 0)
patient_portion   = CASE WHEN patient_estimate <> 0 THEN patient_estimate
                         ELSE GREATEST(fee − insurance_estimate − COALESCE(sec_insurance_estimate,0), 0) END
```

These are estimates at posting. `insurance_estimate` is not reduced when the carrier pays, so `Σ insurance_estimate` is not a receivable.

### 4.6 A/R as of a date, credit balances

```sql
WITH bal AS (
  SELECT account_id, patient_id, SUM(debit) - SUM(credit) AS balance
  FROM rpt_ledger_entries
  WHERE tenant_id = :tenant AND txn_date <= :as_of
  GROUP BY 1,2)
SELECT SUM(GREATEST(balance,0)) AS receivable,
       SUM(GREATEST(-balance,0)) AS credit_balances,
       SUM(balance) AS net_ar
FROM bal;                       -- regroup by account_id for guarantor-level A/R
```

Insurance A/R (claim based):

```sql
SELECT c.carrier_id,
       SUM(GREATEST(
         (CASE WHEN c.est_insurance > 0 THEN c.est_insurance ELSE c.total_billed END)  -- est_insurance is 0 on migrated claims
         - c.total_paid - COALESCE(wo.adjusted, 0), 0)) AS insurance_ar
FROM insurance_claims c
JOIN patients pt ON pt.id = c.patient_id
LEFT JOIN LATERAL (
   SELECT SUM(COALESCE(prim_ins_adjust,0)+COALESCE(sec_ins_adjust,0)+COALESCE(ter_ins_adjust,0)) AS adjusted
   FROM ledger_insurance_details l WHERE l.claim_id = c.id AND NOT l.is_void) wo ON true
WHERE pt.tenant_id = :tenant AND NOT c.is_preauth
  AND lower(c.status) IN (<one agreed open-status list>)
GROUP BY 1;
-- + unbilled insurance: Σ insurance_estimate of charges with claim_id IS NULL, insurance_estimate > 0, NOT hold_claim
-- patient_ar = GREATEST(net_ar − insurance_ar, 0)
```

Age an insurance receivable from `submitted_date` (fallback `created_at`), not from the date of service.

### 4.7 Aging

| Method | Rule | Feasible today |
|---|---|---|
| Gross charge dating (what the code does) | bucket Σ `fee` by `:as_of − date_of_service`; payments ignored | yes, but the total equals all-time charges, not A/R |
| FIFO per patient or account | apply all credits to the oldest debits, bucket what remains | yes — the only method that works on migrated history |
| Allocation based | per charge: `fee − allocated payments − allocated adjustments − insurance paid − insurance adjust` | app-era only; on history only `pat_paid` / `pat_adjust` (patient side, undated) |

FIFO in SQL:

```sql
WITH d AS (
  SELECT patient_id, txn_date, src_id, debit,
         SUM(debit) OVER (PARTITION BY patient_id ORDER BY txn_date, src_id) AS cum_debit
  FROM rpt_ledger_entries WHERE tenant_id=:tenant AND debit > 0 AND txn_date <= :as_of),
c AS (
  SELECT patient_id, SUM(credit) AS total_credit
  FROM rpt_ledger_entries WHERE tenant_id=:tenant AND credit > 0 AND txn_date <= :as_of GROUP BY 1)
SELECT d.patient_id,
       CASE WHEN :as_of - d.txn_date <= 30 THEN 'current'
            WHEN :as_of - d.txn_date <= 60 THEN 'over_30'
            WHEN :as_of - d.txn_date <= 90 THEN 'over_60'
            WHEN :as_of - d.txn_date <= 120 THEN 'over_90' ELSE 'over_120' END AS bucket,
       SUM(LEAST(d.debit, GREATEST(d.cum_debit - COALESCE(c.total_credit,0), 0))) AS open_amount
FROM d LEFT JOIN c USING (patient_id)
GROUP BY 1,2;
```

Opening balances carry their own buckets and must be aged from `as_of_date`. Credits larger than debits leave a negative remainder → report as credit balance, not as negative aging.

### 4.8 Pitfall checklist

| # | Pitfall | Consequence if ignored |
|---|---|---|
| 1 | Two sign conventions in `patient_payments.amount` | payments raise balances / negative collections |
| 2 | `sum_payment_credit()` includes `adjustment` credits | collections overstated by legacy write-offs and transfers |
| 3 | In-app insurance payments and write-offs only in `ledger_insurance_details` | collections understated, A/R overstated for the app era |
| 4 | Migrated `ledger_insurance_details` rows (`legacy_ledger_id IS NOT NULL`, `payment_date` NULL) | double counting if included — the same money is in `patient_payments` `I` rows / claim totals |
| 5 | Positive migrated P / I rows forced to credit by `−abs()` | a legacy reversal counted as money in [I] |
| 6 | `is_void` **and** `is_archived` must both be excluded on charges and payments; existing code is inconsistent about archived payments | totals differ between endpoints |
| 7 | Void has no date; edits happen in place | a past period changes after it was reported; "as of" history is not reproducible |
| 8 | `created_at` on migrated rows may be the migration timestamp | "created date" reports put all history on one day |
| 9 | Naive UTC timestamps vs office-local dates; server defaults "today" in UTC or server-local | evening postings land on the next day |
| 10 | `patient_estimate` = 0 on history; `insurance_estimate` never decremented | patient/insurance split meaningless unless derived; insurance A/R inflated |
| 11 | `payment_allocations` empty for history; unset `provider_id` on app splits | collections by provider / procedure not derivable from allocations |
| 12 | One cheque = several rows (`account_payment_id` slices; N remittance lines) | payment counts and deposit slips overcount cheques |
| 13 | Balance transfers and transfer codes are paired debit + credit | inflate adjustment totals unless excluded |
| 14 | Refunds in two stores; adjustments in three | partial reports |
| 15 | Contract-billing charges (`PP-` ids, `ACBIL` / `ACBILO`) | production double counted for a regular payment plan [I] |
| 16 | `claim_type` overloaded; `is_active=false` = closed or deleted; `est_insurance` = 0 on migrated claims; pre-auths included | wrong tier, wrong insurance A/R |
| 17 | Row office vs posting office (`office_id` vs `created_office_id`); charge at A paid at B | per-office A/R does not net |
| 18 | No `tenant_id` on core tables | cross-tenant leakage if the `patients` join is forgotten |
| 19 | Unpriced charges post at 0.00 (`fee_source='unpriced'`, policy `flag`) | silent production loss — surface as an exception report |
| 20 | `payment_method` holds tender, code or NULL depending on origin | tender breakdown wrong without a mapping layer |
| 21 | Charges follow the patient's current account; payments keep the stamped account | account-level history shifts after a guarantor change |
| 22 | `procedure_totals_service._insurance_details` does not filter `is_void` (L93-105); `refundable_balance` subtracts adjustment allocations | do not reuse these helpers for reports |
| 23 | Money as `float` in `/reports/*` and `/balance` | rounding drift — use `NUMERIC` / `Decimal` end to end |

---

## 5. Legacy-style reports: supported today vs needs new data

| Report | What the data supports today | What is missing |
|---|---|---|
| **Day Sheet** (daily totals by office / provider / user) | charges by `date_of_service`, `office_id`, `provider_id`; patient payments by `payment_date`; adjustments; MTD / YTD by re-aggregation; user via `created_by` / `created_by_legacy` | normalised union (§4.0); app insurance remittances in the money legs; trustworthy created-date basis; frozen day totals (no day close); beginning / ending A/R requires an as-of balance per day |
| **Daily Journal** (every transaction entered) | row-level detail from the 5 transaction stores with patient, code, provider, office, amounts | `LEDGER.TRANDATE` for charges with a DOS; legacy payment / adjustment code; voided-row visibility with void date and user |
| **Production Report** | `Σ fee` and `Σ ucr_fee` by office / provider / date; estimates | agreed gross vs net definition; adjustment group for history; hygiene vs doctor rule; exclusion rule for account codes |
| **Collection Report** | patient vs insurance from `payment_type`; provider from `patient_payments.provider_id` | app remittances; tender category catalog server-side; carrier on legacy insurance payments; refund netting |
| **Deposit Slip** | per-payment `payment_method`, `check_number`, `bank_number`, `eft_trace_number`, `eob_number`; app remittance identifiers | deposit entity (slip number, deposit date, bank account, "deposited" flag), grouping of one cheque across rows, card brand, tender category, payer name for insurance cheques |
| **Production Analysis** (by code / category) | `procedure_code`, `procedure_codes.category`, `coverage_category`, counts, `Σ fee`, `Σ ucr_fee`, average fee, provider / office split | `quantity` semantics; a maintained reporting category (current `category` is a migration label); patient-type dimension rule |
| **Daily Audit** (edits / deletes) | `audit_logs` (`user_id`, `office_id`, `resource_type`, `resource_id`, `method`, `path`, `created_at`, `details.before/after` for generic CRUD); `is_void` rows; `ledger_insurance_details.void_reason / voided_at / voided_by` | before / after on `patient-procedures` writes; void timestamp / user / reason on charges, payments, adjustments, refunds; nothing at all for migrated history |
| **Special Transaction report** (selected payment / adjustment codes) | app-era rows by `adjustment_type` / `payment_method` code | codes for migrated rows; sign and group in the DB |
| **Month-end A/R aging** | as-of balance by date filters; gross aging; FIFO aging computable (§4.7); account grouping via `patients.account_id` | month-end snapshot table; period lock; payment application for true per-charge aging; insurance vs patient split for history; stable guarantor attribution |
| **Production / collection by provider** | production yes; collection partly (nullable provider) | allocation data or an attribution rule for unallocated payments |
| **… by office / office group** | yes for production and for payments with `office_id`; office group via `offices.office_group_id` | rule: operational vs posting office; NULL `office_id` on migrated payments |
| **… by procedure** | production yes | collection by procedure needs allocations |
| **… by carrier / plan** | production: via `claim_id → carrier_id`, or `coverage_rule_id → ins_plan_id` (app), or `procedure_fee_provenance.prim_ins_plan_legacy_id` (if loaded); collection: app remittances only | carrier snapshot on the charge; carrier on legacy insurance payments |
| **Adjustment reports** | all three stores listable; app codes known | first-class signed adjustment; code + group for history; one `write_off_type` vocabulary |
| **Payment-plan reports** (active contracts, schedule, due / past due) | contract terms; instalment rows with `periodic_date`, `periodic_amt`, `is_billed`, `ledger_id` | payment ↔ instalment link (delinquency); maintained remaining amounts; the posting sweep is not scheduled anywhere |
| **Refund report** | `patient_refunds` + adjustment codes `AR00x` / `SUNBR` | one store; legacy refunds indistinguishable from other `A` rows |
| **Credit-balance / unapplied-credit report** | negative balances per patient or account from §4.6 | per-payment unapplied amount (needs allocations); insurance overpayment vs patient credit split |
| **Insurance aging / outstanding claims** | `insurance_claims` status, `submitted_date`, `carrier_id`, totals; per-patient roll-up exists (`billing_service.outstanding_claims` L679-795) | one status vocabulary; `est_insurance` and service dates on migrated claims; pre-auth exclusion |
| **Statements run / history** | `patient_statements` snapshot rows with `batch_id`, delivery status | actual generation is not wired to the UI; snapshot stores totals + aging only, not lines |

---

## 6. Indexes

### 6.1 Existing on money tables [V] (`schema.sql` 2026-10-11 dump + later Alembic)

| Table | Indexes |
|---|---|
| `patient_procedures` | PK `id`; `idx_proc_patient_dos (patient_id, date_of_service)` **and** `ix_patient_procedures_patient_dos` (same columns — duplicate); `idx_proc_claim (claim_id)`; `idx_proc_legacy (legacy_id)`; `idx_proc_void (is_void)`; `ix_patient_procedures_treatment_plan_item_id` |
| `patient_payments` | PK `id`; `idx_payment_patient_date (patient_id, payment_date)` **and** `ix_patient_payments_patient_date` (duplicate); `idx_payment_legacy (legacy_id)`; `ix_patient_payments_account_id`, `ix_patient_payments_account_payment_id` (Alembic `9435491c1d19`) |
| `patient_adjustments` | `(patient_id)`, `(procedure_id)`, `(tenant_id)` |
| `ledger_insurance_details` | `idx_ledger_ins_legacy (legacy_ledger_id)`, `idx_ledger_ins_proc (procedure_id)`, `ix_ledger_insurance_details_claim_id_is_void (claim_id, is_void)`. No `patient_id` index in the dump although the model declares one |
| `payment_allocations` | `idx_alloc_patient`, `idx_alloc_payment`, `idx_alloc_proc` and `ix_payment_allocations_procedure_id` (duplicate), `ix_payment_allocations_adjustment_id`. None on `claim_id` |
| `insurance_claims` | PK; `idx_claim_legacy (legacy_id)`; `idx_claim_patient_status (patient_id, status)`; `ix_insurance_claims_ins_plan_id`; unique `claim_number` |
| `patient_refunds` | `(patient_id)`, `(tenant_id)` |
| `patient_statements` | `(patient_id)`, `(tenant_id)`, `(batch_id)`, `(account_id)` |
| `patient_opening_balances` | unique `(patient_id)`, `(tenant_id)` |
| plan tables | `(patient_id)` each; `(ortho_plan_id)`; `(payment_plan_id)`; `(treatment_plan_id)`; `(tenant_id)` on `patient_plan_installments` |
| `accounts` | `(tenant_id)`, `(tenant_id, legacy_key)`, `(primary_guarantor_patient_id)`, `(primary_guarantor_party_id)`, unique `(tenant_id, account_no)`; `patients (account_id)`, `(guarantor_patient_id)`, `(guarantor_party_id)` |
| dimensions | `patients (tenant_id)`, `(home_office_id)`, `(last_name, first_name)`; `providers (office_id)`; `offices (tenant_id)`; `procedure_codes (category)`, `(coverage_category)`; `definitions (tenant_id, group_code)` |

No index on any money table leads with `office_id`, `provider_id`, a business date, `created_at`, `created_by`, `procedure_code`, `payment_type` or `carrier_id`.

### 6.2 Needed for reporting [I]

| Index | Serves |
|---|---|
| `patient_procedures (office_id, date_of_service) INCLUDE (provider_id, procedure_code, fee, ucr_fee, insurance_estimate) WHERE NOT is_void AND NOT is_archived` | production by office / period — the hot path |
| `patient_procedures (provider_id, date_of_service)` partial as above | production by provider |
| `patient_procedures (procedure_code, date_of_service)` partial | production analysis |
| `patient_procedures (date_of_service)` (BRIN is enough) and `(created_at)` | tenant-wide ranges; created-date basis |
| `patient_procedures (hygienist_id, date_of_service) WHERE hygienist_id IS NOT NULL` | hygiene production |
| `patient_payments (office_id, payment_date) INCLUDE (payment_type, payment_method, provider_id, amount) WHERE NOT is_void AND NOT is_archived` | collections, deposit listing |
| `patient_payments (provider_id, payment_date)`, `(payment_date)`, `(created_at)`, `(created_by, created_at)` | by provider / tenant-wide / created date / by user |
| `patient_adjustments (tenant_id, office_id, adjustment_date) WHERE NOT is_void`; `(adjustment_type, adjustment_date)` | adjustment reports |
| `patient_refunds (tenant_id, office_id, refund_date) WHERE NOT is_void` | refund report |
| `ledger_insurance_details (office_id, payment_date) WHERE NOT is_void`; `(payment_date)`; `(patient_id)` | insurance collections; restore the declared index |
| `insurance_claims (office_id, status)`, `(carrier_id, status)`, `(submitted_date)`, `(paid_date)` | insurance aging, carrier reports |
| `payment_allocations (claim_id)` | claim drill-down |
| `patient_plan_installments (is_billed, periodic_date)` and the same on the two insurance instalment tables | due / past-due schedules, posting sweep |
| `patients (tenant_id, id) INCLUDE (account_id, home_office_id)` | the tenant join every aggregate needs |
| drop `idx_proc_patient_dos` or its twin, `idx_payment_patient_date` or its twin, `idx_alloc_proc` or its twin | write cost on 1M-row tables |

Preferable to indexing eight tables: one reporting fact table / materialised view in the shape of §4.0, partitioned by month and indexed `(tenant_id, office_id, txn_date)`, `(tenant_id, provider_id, txn_date)`, `(tenant_id, account_id)`.

---

## 7. New columns / tables the report catalog depends on

| # | Need | Why (report) |
|---|---|---|
| N1 | Insurance remittance posted into the ledger: a remittance **header** (`payer`, `check_number`, `amount`, `payment_date`, `deposit_id`) with `ledger_insurance_details` as lines, and the money visible to balances | collections, A/R, deposit slip, carrier reports |
| N2 | First-class signed adjustment (`patient_adjustments.direction` or signed amount) + server-side code catalog with `sign`, `group` (production / collection), `category`; migrate `payment_type='adjustment'` rows | net production, net collections, adjustment and special-transaction reports |
| N3 | Server-side payment-code catalog with tender category and card brand; `tender_type`, `card_type`, `card_last4` on payments | collections by tender, deposit slip |
| N4 | Re-read `LEDGER` for dropped columns: payment / adjustment code, `TRANDATE` on charges, claim / plan on insurance payments, `CREATEDON` (restore `created_at`), `ICD1-4` / `CPTCODE` | historical parity for every legacy report |
| N5 | `deposits` (+ `deposit_id` on payments and remittances) | deposit slip, bank reconciliation |
| N6 | Day close / period lock (`office_day_closes`, `financial_periods`) and void metadata (`voided_at`, `voided_by`, `void_reason`) on charges, payments, adjustments, refunds | reproducible day sheet, month-end, daily audit |
| N7 | Month-end snapshots (`ar_snapshots` by patient / account / office / provider / carrier / bucket; production and collection period totals) | month-end A/R aging, trailing-12-month grids, benchmarking |
| N8 | Carrier / plan snapshot on the charge (`prim_ins_plan_id`, `carrier_id`) and `claim_id` / `ins_plan_id` on insurance payments | production and collection by carrier |
| N9 | Payment ↔ plan / instalment link; maintained remaining balances | payment-plan delinquency |
| N10 | `tenant_id` (and optionally `account_id`) denormalised onto `patient_procedures`, `patient_payments`, `insurance_claims`, `ledger_insurance_details`, `payment_allocations` | safe, index-friendly tenant scoping |
| N11 | Before / after audit on `patient-procedures` writes | fee-change and deleted-charge audit |
| N12 | One claim-status vocabulary (enum or definitions-driven) and `est_insurance` / service dates back-filled on migrated claims | insurance aging |
| N13 | Reporting category on procedure codes (hygiene / doctor / lab / product / account) | provider scorecards, hygiene KPIs |

---

## 8. Open questions

| # | Question |
|---|---|
| Q1 | Should "production" be the posted `fee` (contracted) or `ucr_fee` (office fee)? The data says contractual write-offs are embedded in the fee on most charges; does any office post at UCR and write off by adjustment? |
| Q2 | Will in-app insurance payments be posted into the ledger (product fix), or must reports union `ledger_insurance_details` and accept disagreeing with the on-screen balance meanwhile? |
| Q3 | Is the Denticon export still available for a re-read (N4), and has `--restore-created-at` been applied on UAT / production? Both decide whether historical "created date" and code-level reports are possible. |
| Q4 | Are contract-billing instalment charges (`ACBIL`, `ACBILO`, ortho periodic codes) production? For a regular payment plan the treatment was already charged. |
| Q5 | Aging method for parity: FIFO, allocation-based, or gross charge dating? Per patient or per guarantor account? |
| Q6 | Legacy "Patient Type General / Ortho" criterion: patient-level (`patients.patient_type` = `OR`), procedure-level (`procedure_codes.is_ortho`) or provider-level (`providers.is_ortho_provider`)? |
| Q7 | Actual row counts and sign distribution of `patient_payments` (docs quote both ~1.33M source rows and ~200k signed rows), and the count of positive migrated P / I rows (§2.1 risk). |
| Q8 | Is `patient_procedures.fee` a line total or a unit price when `quantity > 1`? |
| Q9 | Office attribution for collections: the row's `office_id` (where applied) or `created_office_id` (where posted)? Provider attribution for unallocated payments? |
| Q10 | Are deposits, day close and period locks in scope as new operational features, or should the first release approximate them in reports only? |
