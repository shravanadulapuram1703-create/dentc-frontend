# Pricing hierarchy — Frontend gap report

> Companion to [`pricing_hierarchy_architecture.md`](./pricing_hierarchy_architecture.md) (backend, 2026‑09‑12).
> This document maps the **frontend** against that architecture: what the browser does today, what the
> target requires, the concrete gaps, and a strictly‑ordered plan to close them without breaking the
> numbers on screen. Written 2026‑09‑16.
>
> **The one‑sentence summary:** today the browser *is* the pricing engine; the target makes the server
> the only place a fee or a split is computed, and the frontend must stop computing money, post no money
> fields, and render the provenance the server returns. That is a coupled swap — it cannot be half‑done.

---

## 0. Read this first — sequencing reality

Three facts from the backend report change *when* we can do the frontend work, not just *what*:

1. **The backend engine is still dark.** `PRICING_ENGINE_V2` defaults **off**. With the flag off, a
   charge posted **without** a `fee` is priced server‑side for the *fee only* — `insurance_estimate` /
   `patient_estimate` stay at their defaults (0). So if the frontend stops sending money **before** the
   flag is on, every split on every screen regresses to 0. **"Stop sending money" is coupled to the flag
   flip**, not something we can ship early.
2. **The flag flip (backend R3) is not scheduled and is gated on a human decision**, not a code
   milestone. Historical parity plateaued at ~84 % and the report concludes the ≥97 % gate is the wrong
   gate; R3 now waits on a fee‑schedule‑owner sign‑off of the precedence card (UCR‑vs‑contracted posting
   behaviour). We should plan the frontend to be **merged and dormant behind a mirror flag**, flipped in
   lock‑step with the backend — not blocked, but not live either.
3. **The new server surface is not in our `openapi.json` yet.** Our generated Orval client still reflects
   the *pre‑architecture* (v1) backend: `getPatientProcedureFee` returns a `FeeQuote` whose `fee_source`
   enum is the retired `assignment | plan_schedule | office_default | code_default`, and none of the new
   endpoints/fields exist. **`npm run api:sync` against an R1 backend is a hard prerequisite** for most of
   the work below.

**Recommendation:** introduce a frontend mirror flag (env/config `PRICING_ENGINE_V2`) so the charge
screens can carry both code paths and flip together with the server. Everything in this report is scoped
against that flag except the items explicitly marked "safe now".

---

## 1. The inversion, in one table

| Concern | Today (the browser decides) | Target (the server decides) |
|---|---|---|
| Which fee schedule prices a code | `feeScheduleResolver.loadFeeScheduleContext` walks assignments → office default → `default_fee` in the client | Server precedence card (`resolve_procedure_fee`); client sends context, reads the result |
| Coverage % for a code | `coverageResolver` with a **hard‑coded** `CDT_CATEGORIES` ADA→category table | `insurance_coverage_rules` matched server‑side; client never maps categories |
| The patient/insurance split | `procedurePricing.priceProcedure` (fee × %, or `insurance_fee` beats %; **no deductible/max**) | `estimate_service` split engine (cap→deductible, COB, cross‑line consumption) |
| What posts on a charge | `postCompletedProcedure` sends `fee`, `insurance_estimate`, `patient_estimate`, `ucr_fee` | Client sends `date_of_service` + context; **no money**; server stamps fee + split + provenance |
| Provenance ("why this number") | Not stored; a client‑built `reason` string shown transiently | Server returns `fee_source`, `fee_schedule_id`, `fee_effective_date`, `coverage_pct`, `ucr_fee`, `expected_write_off`, warnings — client renders it |
| Re‑estimate consistency | Client numbers differ from server; pressing *Re‑estimate* visibly changes them | One engine; a single‑line post equals one line of `/estimate` |

---

## 2. Correctness defects the architecture attributes to the current frontend

These are *why the numbers can be wrong today*, straight from the report, each now tied to our code:

- **`insurance_fee` beats the coverage %.** [`procedurePricing.ts:49`](src/services/procedurePricing.ts:49) — if a
  schedule entry has any `insurance_fee`, it wins over the plan's percentage. The architecture says
  `insurance_fee` is a **copay‑list‑only** fixed amount and must **never** beat a percentage (§1.5, "Do not
  let `insurance_fee` beat a coverage %"). On a normal PPO plan this produces the wrong insurance figure.
- **Deductible, annual max, frequency, age, waiting are all ignored.** [`coverageResolver.ts:24`](src/services/coverageResolver.ts:24)
  computes `fee × coverage_pct` flat. The server model caps at the remaining max *before* burning the
  deductible and nets both across the benefit year. Client estimates are systematically high for patients
  who have consumed benefits.
- **`$0`/blank fee entries can post \$0 charges.** The resolver treats a blank `patient_fee` as usable in
  some paths; 3,866 legacy entries are `0.00` blanks. The server distinguishes a real \$0 (`is_no_charge`)
  from a blank (skip and keep walking).
- **Two conflicting practice‑wide defaults.** Only the 8 all‑NULL assignment rows fire today (FEE‑2 in
  memory); the resolver's "newest row wins" tiebreak makes the price depend on a migration artifact. The
  server deletes those rows (backfill §3.8 step 9) and uses office pointers.
- **Hard‑coded category map drifts from the backend.** [`coverageResolver.ts:42`](src/services/coverageResolver.ts:42)
  `CDT_CATEGORIES` is a client copy of a mapping the server owns; any backend change to banding silently
  diverges. The architecture explicitly lists this table under §3.9 "Retired".
- **`ucr_fee` and the write‑off are client‑guessed** rather than the office UCR list resolved in parallel
  with `expected_write_off = ucr_fee − fee` (§1.4).

None of these are fixable *in the client* — the fix is to stop pricing in the client. That is the point.

---

## 3. Gap inventory

Priority: **P0** blocks correct numbers once live · **P1** needed for the migrated Setup model · **P2**
polish/cleanup. Depends‑on: **sync** = needs `api:sync`; **flag** = lands with `PRICING_ENGINE_V2`;
**now** = safe today.

### Group A — Charge write path: stop sending money (P0, flag)

The single choke point is [`procedureEntryService.ts`](src/features/procedures/procedureEntryService.ts). It puts money on the wire in three places:
`createPatientProcedure` body [`:254`](src/features/procedures/procedureEntryService.ts:254) (`fee`, `insurance_estimate`, `patient_estimate`, `ucr_fee`),
`createTreatmentPlanItem` body [`:347`](src/features/procedures/procedureEntryService.ts:347) (`fee`, `insurance_estimate`), and `postPlanItemToLedger` [`:404`](src/features/procedures/procedureEntryService.ts:404).
But several screens **bypass the choke point** and send money directly — those must be found and fixed too.

| ID | Site | Current | Change |
|---|---|---|---|
| FE‑PR‑01 | `procedureEntryService.postCompletedProcedure` | sends fee/ins/pat/ucr | Under the flag, send `date_of_service` + context only; drop the four money fields; add `fee_override`/`fee_override_reason` when a permitted user overrides |
| FE‑PR‑02 | `procedureEntryService.planProcedure` | sends fee/ins | Drop `insurance_estimate`; server split‑fills the item (`apply_split` split‑only mode). Keep an explicit fee only as an override |
| FE‑PR‑03 | `procedureEntryService.postPlanItemToLedger` | re‑prices client‑side, passes fee/ins override | Server re‑prices at posting office/date; drop the client re‑price |
| FE‑PR‑04 | [`TxPlansTab.tsx:203`](src/components/modals/TxPlansTab.tsx:203) | calls `createTreatmentPlanItem` directly with fee/ins (bypasses `planProcedure`) | Route through `planProcedure`; stop sending `insurance_estimate` |
| FE‑PR‑05 | [`EditTreatmentModal.tsx:261`](src/features/treatment-plans/EditTreatmentModal.tsx:261) | hand‑edited `fee`/`insurance_estimate` in `TreatmentPlanItemUpdate` | Fee edit → server re‑splits; drop client `insurance_estimate`. Fee stays editable only as override |
| FE‑PR‑06 | [`EditTransactionModal.tsx:186`](src/features/account-ledger/EditTransactionModal.tsx:186) | `updatePatientProcedure` sends fee/ins on unclaimed charges | PATCH re‑runs split‑only server‑side; drop client `insurance_estimate` |
| FE‑PR‑07 | [`appointmentProceduresApi.ts:114`](src/services/appointmentProceduresApi.ts:114) (`toBody`) | appointment lines send fee/ins/est_patient | Price via `/pricing/quote` for preview; persist without money (or accept the server’s quoted values echoed back) |

> **Note:** these are the *only* seven request bodies that carry procedure money. Removing money from
> FE‑PR‑01…03 covers the shared path; FE‑PR‑04…07 are the direct bypasses the map found.

### Group B — Preview + provenance via server endpoints (P0, sync+flag)

Every charge screen currently previews from the client resolvers. Target: preview from
`POST /patients/{id}/estimate` (a patient in context) or `POST /pricing/quote` (no patient/DOS yet), and
render the returned provenance string + warnings.

| ID | Screen | File | Change |
|---|---|---|---|
| FE‑PR‑10 | Transactions Entry (+ Ledger Add Proc) | [`AddProceduresTab.tsx`](src/features/transactions/AddProceduresTab.tsx) (hosted by [`TransactionEntryModal.tsx:206`](src/features/account-ledger/TransactionEntryModal.tsx:206)) | Replace `loadFeeScheduleContext`/`loadCoverageContext`/`priceProcedure` with an estimate call; render `fee_source`/`coverage_pct`/`ucr_fee`/write‑off/warnings |
| FE‑PR‑11 | Restorative chart | [`RestorativeChart.tsx`](src/features/restorative/RestorativeChart.tsx), [`AddAdaCodeModal.tsx`](src/features/restorative/AddAdaCodeModal.tsx), [`PostToLedgerDialog.tsx`](src/features/restorative/PostToLedgerDialog.tsx) | Same swap; `AddAdaCodeModal` builds `AdaEntry` with client money — repoint to the estimate result |
| FE‑PR‑12 | Treatment Plan | [`TreatmentPlanPage.tsx`](src/features/treatment-plans/TreatmentPlanPage.tsx), [`EditTreatmentModal.tsx`](src/features/treatment-plans/EditTreatmentModal.tsx) | Preview via estimate; keep server `reEstimateTreatmentPlan` (already server‑side) as the plan‑level number |
| FE‑PR‑13 | Scheduler appointment | [`AddEditAppointmentForm.tsx:838`](src/components/modals/AddEditAppointmentForm.tsx:838), [`AppointmentProcedurePicker.tsx:122`](src/components/modals/AppointmentProcedurePicker.tsx:122) | Preview via `/pricing/quote` (no ledger charge); drop `resolveProcedureFee` |
| FE‑PR‑14 | Shared provenance UI | new | One small component that renders the estimate line’s provenance ("44.00 from CP‑40 · patient list · Ins 80 % Diagnostic · ded 0 · UCR 50.00 · write‑off 6.00" + warnings), reused by all of the above |

> **Caveat:** the currently‑generated `estimatePatientCharges` / `getPatientProcedureFee` return **v1**
> results (no real coverage %, retired `fee_source` values, no `date_of_service` in the request). Wiring
> previews to them is only correct **after** `api:sync` against an R1 backend **and** the flag is on. Build
> the components now behind the flag; do not point production previews at the dark engine.

### Group C — Delete the client resolvers (P1, flag; after Groups A & B)

Once nothing consumes them, remove — per §3.9 "Retired":

- [`src/services/feeScheduleResolver.ts`](src/services/feeScheduleResolver.ts) (incl. dead export `clearFeeScheduleCache` — already no importer)
- [`src/services/coverageResolver.ts`](src/services/coverageResolver.ts) (incl. the hard‑coded `CDT_CATEGORIES`)
- [`src/services/procedurePricing.ts`](src/services/procedurePricing.ts) and the re‑export shim [`src/features/restorative/procedurePricing.ts`](src/features/restorative/procedurePricing.ts)
- Any dead poster the architecture names (`components/patient/AddProcedure.tsx` if present)

Keep `money2` (a pure formatter) by relocating it — it is used widely and is not pricing logic.

### Group D — Setup: Fee Schedules (P1, sync)

File: [`src/components/setup/insurance/FeeScheduleSetup.tsx`](src/components/setup/insurance/FeeScheduleSetup.tsx) + [`feeScheduleData.ts`](src/components/setup/insurance/feeScheduleData.ts).

| ID | Current | Target (§3.5) |
|---|---|---|
| FE‑PR‑20 | `fee_type` is a **free‑text** input + datalist ([`FeeScheduleSetup.tsx:661`](src/components/setup/insurance/FeeScheduleSetup.tsx:661)) | Enum picker from `GET /fee-schedules/metadata` (`ucr`/`standard`/`plan`/`carrier`) |
| FE‑PR‑21 | No `pricing_model` field | Add `pricing_model` (percentage/copay), selectable only for plan/carrier types |
| FE‑PR‑22 | "Insurance Fee" column always shown ([`:510`](src/components/setup/insurance/FeeScheduleSetup.tsx:510)) | Render **Plan Pays** (`insurance_fee`) **only on copay lists**; label Fee as *Patient Copay* there; never show a percentage |
| FE‑PR‑23 | Bulk Increase/Decrease is a **client loop of `updateFeeScheduleEntry`** that overwrites entries in place ([`:729`](src/components/setup/insurance/FeeScheduleSetup.tsx:729)) — loses price history | Call `PUT /fee-schedules/{id}/entries/bulk` / `POST /fee-schedules/{id}/adjust` with an `effective_date` (the "New Effective Date" workflow inside one schedule) |
| FE‑PR‑24 | No "Where used" / retire guard | Add a *Where used* panel (`GET /fee-schedules/{id}/usage`); use `POST /fee-schedules/{id}/retire`; block delete while referenced |
| FE‑PR‑25 | No `is_no_charge`, no *Try it* box | Add No‑charge flag on the entry editor; add a *Try it* box in "View by Codes" (patient+office+date → which tier wins) via `GET /patients/{id}/fee` |

### Group E — Setup: Fee Schedule Assignments (P1, sync)

File: [`src/components/setup/insurance/FeeScheduleAssignments.tsx`](src/components/setup/insurance/FeeScheduleAssignments.tsx).

| ID | Current | Target |
|---|---|---|
| FE‑PR‑30 | Rows are **create + delete only** (no edit) | Make rows editable (PATCH); needs a backend update endpoint for assignments |
| FE‑PR‑31 | Helper text "Leave a target blank to make it apply broadly" ([`:389`](src/components/setup/insurance/FeeScheduleAssignments.tsx:389)) | Replace with "Office‑wide defaults are set in Office Setup"; refuse a scope‑only (office/group) row — server returns 422 `assignment_needs_target` |
| FE‑PR‑32 | No Office Group / rank display; Specialty is free‑text | Office Group + Specialty as pickers; show the resolved **rank** per row; duplicate target → surface 409 `assignment_duplicate_target` |

### Group F — Setup: Procedure Codes (P1, sync)

Files under [`src/components/setup/procedure-codes/`](src/components/setup/procedure-codes/).

| ID | Current | Target (§3.5) |
|---|---|---|
| FE‑PR‑40 | **Insurance tab** CRUDs `procedure_insurance_rules` ([`tabs/InsuranceTab.tsx`](src/components/setup/procedure-codes/tabs/InsuranceTab.tsx)) | **Remove the tab** — the resource is retired (410). This is also a `coverageResolver` input; verify nothing else reads it |
| FE‑PR‑41 | `default_fee` field shown ([`tabs/MainTab.tsx:116`](src/components/setup/procedure-codes/tabs/MainTab.tsx:116)) | Hide `default_fee` (retired as a pricing input; column kept one release) |
| FE‑PR‑42 | **No `coverage_category` field anywhere** | Add `coverage_category`, labelled "Insurance coverage category — the band plans price against" |
| FE‑PR‑43 | Fee Schedules tab already read‑only ([`tabs/FeeSchedulesTab.tsx`](src/components/setup/procedure-codes/tabs/FeeSchedulesTab.tsx)) | Keep read‑only; add a one‑line statement of the ownership boundary |

### Group G — Setup: Insurance Plans (P1, sync)

Files under [`src/components/setup/insurance/plan-details/`](src/components/setup/insurance/plan-details/).

| ID | Current | Target (§3.5) |
|---|---|---|
| FE‑PR‑50 | `is_prepaid` = "Prepaid Plan" checkbox | Relabel "Capitation / copay plan (prices from a copay list)" |
| FE‑PR‑51 | `fees_to_print` select exposes an extra `carrier_fees` option | Relabel "Fees printed on claims (printing only)"; reconcile options to `office_ucr | plan_fees` per §1.2 |
| FE‑PR‑52 | `is_non_dup_benefits` **not exposed** | Add the field (COB non‑duplication) — needs the model field synced |
| FE‑PR‑53 | No fee‑binding panel | Add read‑only *Fee schedule in effect* panel via `GET /insurance-plans/{id}/fee-binding`, deep‑linking to Assignments; the wizard never picks a schedule |

### Group H — Setup: Office Setup (P1, partly now)

File: [`src/components/setup/offices/tabs/InfoTab.tsx`](src/components/setup/offices/tabs/InfoTab.tsx) + [`OfficeSetup.tsx`](src/components/setup/offices/OfficeSetup.tsx).

| ID | Current | Target |
|---|---|---|
| FE‑PR‑60 | Already edits `default_ucr_fee_schedule_id` + `default_fee_schedule_id` (saved via `updateOffice`) — **good, this is close to target** | Keep; optionally move to `PATCH /offices/{id}/fee-defaults` when synced. Filter pickers by `fee_type` |
| FE‑PR‑61 | Inline "+ Add New" creates a schedule with free‑text `fee_type:"UCR"/"STANDARD"` | Align to the enum once metadata lands |
| FE‑PR‑62 | No `unpriced_charge_policy` | Add the policy control (`flag`/`refuse`) — needs the `OfficeRead/Update` field synced |

### Group I — Patient default fee schedule + the `CP-50` literal (P1, safe now)

| ID | Current | Target (§3.5) |
|---|---|---|
| FE‑PR‑70 | Add Patient defaults the fee schedule by **name "CP‑50", else the first schedule** ([`AddNewPatient.tsx:509`](src/components/pages/AddNewPatient.tsx:509)); the office’s `default_fee_schedule_id` pointer is **never read** | Default from the home office’s `default_fee_schedule_id`; delete the `'CP-50'` literal (single hit). Tooltip: "Used when no plan/carrier list applies; posted charges never change" |
| FE‑PR‑71 | Patient fee schedule wired as nested `fee_schedule: { fee_schedule_id }` on create/edit ([`AddNewPatient.tsx:1006`](src/components/pages/AddNewPatient.tsx:1006), [`EditPatientModal.tsx:669`](src/components/modals/EditPatientModal.tsx:669)) | Move to one flat `fee_schedule_id` wire shape for create and edit (per §3.5 "one flat wire shape") |
| FE‑PR‑72 | No bulk *Change Patient Fee Schedule* utility | Add one backed by `POST /fee-schedules/{id}/reassign-patients` — this is what makes retiring a list possible |

> FE‑PR‑70 (reading the office default instead of a hard‑coded name) is a real correctness fix that is
> **safe to do now** — it does not depend on the flag and improves behaviour under the current engine too.

### Group J — Pricing health + precedence card surfacing (P2, sync)

- **FE‑PR‑80** — Render the precedence card and coded findings on the Setup landing page from
  `GET /fee-schedules/metadata` and `GET /setup/pricing-health` (per‑office work queues:
  `office_without_ucr`, `zero_fee_entries`, `codes_needing_a_price`, …). Each finding names the owning
  screen. This is the "sync between the three maintainers" the report calls out (§3.6).

### Group K — Orval client / model sync (P0 prerequisite, sync)

`npm run api:sync` against an R1 backend, then adopt the new shapes. Absent today (confirmed against
`openapi.json` + the generated client):

- **Endpoints absent:** `POST /pricing/quote`, `GET /fee-schedules/metadata`, `GET /fee-schedules/{id}/usage`,
  `PUT /fee-schedules/{id}/entries/bulk`, `POST /fee-schedules/{id}/adjust`, `POST /fee-schedules/{id}/retire`,
  `POST /fee-schedules/{id}/reassign-patients`, `GET /setup/pricing-health`,
  `GET /insurance-plans/{id}/fee-binding`, `PATCH /offices/{id}/fee-defaults`.
  *(Present already: `getPatientProcedureFee`, `estimatePatientCharges`, `restoreFeeSchedule`.)*
- **Model fields absent:** `pricing_model` (FeeSchedule); `is_no_charge` (FeeScheduleEntry);
  `unpriced_charge_policy` (Office); `is_non_dup_benefits`, `legacy_prepaid_code` (InsurancePlan);
  `fee_source`, `fee_effective_date`, `coverage_pct`, `coverage_rule_id`, `estimated_deductible`,
  `sec_insurance_estimate`, `fee_override`, `fee_override_reason` (PatientProcedure);
  `ucr_fee`, `coverage_pct`, `fee_source` (TreatmentPlanItem).
- **Write‑model shrink (R3):** the backend will drop `insurance_estimate`/`patient_estimate`/`ucr_fee`/
  `fee_schedule_id` from `PatientProcedureCreate/Update` and add the two override fields. After the sync,
  those fields disappear from our generated types — code that still sets them won’t compile, which is the
  forcing function for Group A. **Sequence the sync to land with the flag work, not before Group B is
  ready.**
- **Note:** the `FeeQuote`/`EstimateResult` response DTOs *already* expose `fee_source`, `coverage_pct`,
  `estimated_deductible`, `fee_schedule_id` — so the provenance‑rendering components (FE‑PR‑14) can be
  designed against real generated types now, even though the flat procedure models lag.

---

## 4. Phased frontend plan (ordered; never regress a live number)

Mirrors the backend phases; the frontend is backend "R4" but splits cleanly into safe‑now and flag‑coupled.

**Phase F0 — safe now, no flag, no sync**
- FE‑PR‑70: default the patient fee schedule from the office pointer; delete `'CP-50'` (correctness win today).
- Inventory freeze: confirm the seven money‑bodies in Group A are the complete set (they are, per the map) and add a lint/guard note so no new screen adds an eighth.
- Build the shared provenance component (FE‑PR‑14) against the existing `EstimateLineResult` type, behind the mirror flag, not yet wired to production previews.

**Phase F1 — after `api:sync` against R1 (Setup, read‑only + additive)**
- Groups D–H Setup alignment that doesn’t change live pricing: metadata‑driven enums, copay‑only Plan Pays
  rendering, Where‑used/retire, bulk endpoints, assignment edit + rank, remove the Procedure‑Codes
  Insurance tab, hide `default_fee`, add `coverage_category`, plan relabels + fee‑binding panel,
  `unpriced_charge_policy`, the flat patient wire shape (FE‑PR‑71/72).
- Group J: precedence card + pricing‑health surfacing.

**Phase F2 — with the flag flip (backend R3 ⇄ frontend mirror flag) — the coupled swap**
- Group A: stop sending money everywhere (FE‑PR‑01…07); add the override control where permitted.
- Group B: point previews at `/estimate` and `/pricing/quote`; render provenance + warnings.
- Verify a single‑line post equals one line of `/estimate` on screen (the report’s acceptance test).

**Phase F3 — cleanup, one release later**
- Group C: delete the three resolvers + shim + dead poster.
- Rewrite `docs/INSURANCE/fee_schedule_setup.md` and the FEE section of the transactions devreport (the
  "office owns the fee" example is mis‑attributed — 44.00 is CP‑40, the patient’s list).

---

## 5. Risks and open questions

- **Do not ship Phase F2 before the backend flag is on.** It is the one hard ordering constraint: money‑off
  + dark engine = zero splits on every screen. The mirror flag exists to make F2 mergeable but dormant.
- **The estimate endpoints are the migrated frontend’s only server‑pricing path today and they’re dark.**
  Any preview we wire to them before R3 shows v1 numbers (coverage % 0). Gate them behind the flag.
- **Appointment procedures (FE‑PR‑07)** price before a patient/DOS may exist → they need `/pricing/quote`,
  which is absent. Their persistence currently carries money; confirm with the backend whether appointment
  lines are in scope for the money‑off rule or stay client‑estimated (the architecture lists scheduler
  pickers under "preview via estimate/quote, post without money").
- **Assignment edit (FE‑PR‑30)** assumes a backend PATCH for assignments; today it’s create+delete only.
  Confirm the endpoint exists post‑sync or keep delete‑and‑recreate.
- **Fee‑binding vs `fees_to_print` `carrier_fees` option (FE‑PR‑51):** our UI has a third print option the
  architecture’s §1.2 doesn’t list. Confirm the enum before relabeling.
- **Decision owner dependency:** the backend R3 flip waits on a fee‑schedule‑owner sign‑off of the
  precedence card (UCR‑vs‑contracted posting per office). The frontend cannot unblock this; plan F2 to
  follow it.

---

## 6. Quick reference — files this touches

**Delete (Phase F3):** `src/services/feeScheduleResolver.ts`, `src/services/coverageResolver.ts`,
`src/services/procedurePricing.ts`, `src/features/restorative/procedurePricing.ts`.

**Stop sending money (Phase F2):** `src/features/procedures/procedureEntryService.ts`,
`src/components/modals/TxPlansTab.tsx`, `src/features/treatment-plans/EditTreatmentModal.tsx`,
`src/features/account-ledger/EditTransactionModal.tsx`, `src/services/appointmentProceduresApi.ts`.

**Rewire previews (Phase F2):** `src/features/transactions/AddProceduresTab.tsx`,
`src/features/restorative/{RestorativeChart,AddAdaCodeModal,PostToLedgerDialog}.tsx`,
`src/features/treatment-plans/TreatmentPlanPage.tsx`,
`src/components/modals/{AddEditAppointmentForm,AppointmentProcedurePicker}.tsx`.

**Setup (Phase F1):** `src/components/setup/insurance/{FeeScheduleSetup,FeeScheduleAssignments}.tsx`,
`src/components/setup/procedure-codes/**`, `src/components/setup/insurance/plan-details/**`,
`src/components/setup/offices/{OfficeSetup,tabs/InfoTab}.tsx`.

**Patient default (Phase F0):** `src/components/pages/AddNewPatient.tsx` (the `CP-50` literal at :509),
`src/components/modals/EditPatientModal.tsx`, `src/features/add-patient/editMode.ts`, `src/api/feeSchedules.ts`.
