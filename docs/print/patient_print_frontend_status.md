# Patient screen printing — frontend status after the backend response

**Date:** 2026-09-11
**In reply to:** `docs/print/patient_print_backend_response.md` (2026-09-11)
**Verified against:** the shared dev backend (`127.0.0.1:8000`, `openapi.json` 471 paths) on
patient 83433, live in the browser.

## 1. What the frontend now does

| Backend item | Frontend change | Live result |
|---|---|---|
| PRINT-1 server reports | Every Print button calls `GET /patients/{id}/reports/*` through the generated client (`responseType: 'blob'`) via `src/features/print/serverReport.ts`, opens the PDF in a pre-opened tab (popup-blocker safe, "Preparing…" placeholder while the server renders) and asks the viewer to print. The jsPDF builders are kept as the **fallback** when the route fails (older backend, network error), with a toast saying so. | Overview 2 pages (47 s, see §2), Transactions 1 page (5 s), Ledger 2 pages (2.4 s), Insurance 1 page (1 s) — all `ReportLab` PDFs, layout matches the screen builders |
| PRINT-2 letterhead | `officeHeader()` in `patientPdf.ts` prefers `OfficeRead.letterhead` (name / address / phone) for the fallback PDFs. `logo_url` is not drawn client-side (the server PDF embeds it). | header text identical to the server report |
| PRINT-3 feed cap | `accountLedgerService.FEED_SIZE` 500 → 5,000 (`size` max is now 5,000 on both feeds). The "first 500" banner logic is unchanged and now trips at 5,000. | — |
| PRINT-6 day totals | `TransactionsEntryPage` loads `GET /patients/{id}/day-totals?date=` for the applied date (re-read after every post). **Today's Est Ded** shows `estimated_deductible` (the † footnote is gone) and **Today's Est Pat Portion** shows `patient_estimate`; the client approximation remains only until the call returns. | `{"total_charges":"56.00","patient_estimate":"56.00","estimated_deductible":"0.00","has_active_coverage":true}` for 08/29/2026 |
| PRINT-7 subscriber columns | `InsuranceForm.sec_rel_to_prim` renamed to **`sec_sub_rel_to_prim_sub`** and sent on the `patient-insurance` create/update body; `marital_status` and `sub_phone` are read from and written to the subscriber. | save round-trip verified: values persist across reload |
| PRINT-8 plan dates | `plan_effective_date` / `plan_term_date` added to the form (subscriber), the Eligibility **Plan Date** column is now editable and printed. | persisted on save |
| PRINT-9 ortho plan | `loadPaymentPlans` also reads `/ortho-plans?patient_id=`; the two ortho CONTRACTS cards bind to `pat_*` / `ins_*` (legacy ins-plan rows remain the fallback for the insurance card). | request issued; 83433 has no ortho plan so the cards still show dashes |
| PRINT-10 photo | `PatientInformationPanel` renders `photo_document_id` through the authorised `/patient-documents/{id}/content` proxy; placeholder stays when there is none. | — |

The Ledger report is asked for `include_claims` whenever the grid's type filter is *Show All* or
*Claims*; without it the server omits every CLM row (16 rows printed vs 25 on screen for 83433).
With it the server prints **29** rows — see PRINT-13 below.

## 2. Findings for the backend

* **PRINT-11 — Overview report latency.** `GET /patients/83433/reports/overview` took **47 s** on
  the dev backend for a one-member account (Transactions 5 s, Ledger 2.4 s, Insurance 1 s). The
  frontend shows a "Preparing…" tab meanwhile, but this is the balance/enrichment fan-out
  (`balance_service` is ~20 s cold, see PP-5) — the report should reuse one balance pass per
  member or read a cached aggregate.
* **PRINT-12 — `marital_status` vocabulary.** The backfilled column holds legacy single-letter
  codes (`S` 535 · `M` 424 · `D` 22 · `W` 5 · null 14 on the first 1,000 rows). The frontend now
  stores the code and shows the word (`S/M/D/W` = Single/Married/Divorced/Widowed). The server
  Insurance PDF prints the raw letter (`Marital Status: M`) — please map it the same way, and
  confirm whether any other code (Separated?) is in use.
* **PRINT-13 — Ledger report lists soft-deleted claims.** With `include_claims=true` the
  statement for 83433 prints 11 CLM rows; the screen shows 7. The patient has 13 claims:
  7 active (6 draft, 1 submitted) and 6 with `is_active=false` (4 draft, 2 closed). The screen
  hides the inactive ones (`isDeletedClaim`, claim DELETE is a soft `is_active=false`); the report
  prints the 4 inactive drafts. Please apply the same `is_active` rule in `print_service` (and
  ideally in `ledger_service.get_account_ledger` so both feeds agree).
* **Observation — Overview screen vs server report.** The server Overview PDF lists the Dental
  Primary/Secondary carriers for 83433 (Cigna / test) while the on-screen Overview panel (and
  therefore the fallback PDF) shows the insurance rows blank. The screen composes
  `patient_insurance → insurance_plans → insurance_carriers` client-side (PO-1); the server report
  is the more complete of the two. Worth a look at the FE hook separately — not a backend gap.
* Ledger `include_claims` defaults to false; the screen's *Show All* includes claims, so callers
  must pass it explicitly (done).

## 3. Test data note

The save round-trip test on 83433's Primary Dental subscriber set Marital Status / Phone / Plan
Effective Date and was **restored** afterwards via `PATCH /insurance-subscribers/{id}`
(`marital_status: "M"`, `sub_phone: "9019076213"`, `plan_effective_date: null`).
