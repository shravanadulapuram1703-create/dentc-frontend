# Patient screen printing — backend dev report

> **Status 2026-09-11:** answered by the backend in `patient_print_backend_response.md`
> (PRINT-1/2/3/6 built, 4/5/7/8/9/10 already existed). Frontend wiring, live verification and the
> follow-up items PRINT-11..13 are in `patient_print_frontend_status.md`.

**Date:** 2026-09-10
**Screens:** Patient Overview · Transactions Entry · Account / Patient Ledger · Insurance Details
(Primary/Secondary Dental, Medical)
**Frontend:** `src/features/print/patientPdf.ts` (shared scaffolding) +
`patient-overview/overviewPrint.ts`, `transactions/transactionsPrint.ts`,
`account-ledger/ledgerPrint.ts`, `patient-insurance/insurancePrint.ts`

## 1. What was wrong and what changed

The Print buttons on the four screens called `window.print()` (the Insurance Details printer icon had
no handler at all), so the browser printed the **whole page** — navigation, patient banner, toolbars,
tab strips, form inputs, pagers and scroll boxes — instead of the patient's data.

Each screen now builds a structured PDF from the same data it renders (patient details, grids,
balances) with jsPDF + autotable, the same client-side approach Perio Charting, Treatment Plans,
Payment Plans and Lab Tracking already use, and opens it in the print dialog:

| Screen | Printed sections |
|---|---|
| Patient Overview | office / patient header, Patient Information (all rows incl. Patient Note + Medical Alerts), Responsible Party, Insurance (Dental + Medical, Pri/Sec), Account Members, Appointments, Recalls, Balances (KPIs + aging by member), Billing, Contract summary, Contracts detail, Referrals |
| Transactions Entry | Patient Dashboard block (Responsible / Balance / Est Ins / Est Pat / carriers / today's split) + the grid for the selected transaction date with totals (landscape) |
| Account / Patient Ledger | scope, date range, type filter, sort, balance; **every** row matching the current filter (not just the on-screen page) with running balance + grand total; BALANCES table; CONTRACTS cards (landscape) |
| Insurance Details | Insurance Plan / Carrier / Employer, Benefit Information, Eligibility, Subscriber Information, Notes |

Perio and Treatment Plan printing were not touched.

## 2. Backend gaps affecting the printouts

None of these block the feature — every print works today from screen data — but each one leaves a
blank, a dash or a client-side approximation on paper.

| # | Gap | Severity | Screen(s) |
|---|---|---|---|
| PRINT-1 | No server-side report/render endpoint for any patient screen | Medium | all four |
| PRINT-2 | No office logo / print branding on `OfficeRead` | Low | all four |
| PRINT-3 | Ledger feed is capped at 500 rows per patient (AL-2) — printed statement truncates silently past that | Medium | Ledger |
| PRINT-4 | `GET /patients/{id}/balance` disagrees with the ledger arithmetic (AL-9) — printed BALANCES mixes both | Medium | Ledger, Overview |
| PRINT-5 | No aggregate overview endpoint (PO-1); per-member enrichment is capped at 25 members (PO-3) | Low | Overview |
| PRINT-6 | Today's deductible portion not computed (CHG-7) — prints `0.00` | Low | Transactions |
| PRINT-7 | Subscriber Marital Status / Phone / Sec-Sub relationship have no columns (INS-PT-1/2/3) — print blank | Low | Insurance |
| PRINT-8 | Plan-level Effective / Term dates do not exist — Eligibility "Plan Date" column prints `-` | Low | Insurance |
| PRINT-9 | No ortho patient payment-plan resource (AL-3) — "Ortho - Patient Payment Plan" card prints all dashes | Low | Ledger |
| PRINT-10 | No patient photo storage (PO-10) — the legacy overview printout carried the photo | Low | Overview |

### PRINT-1 — No server-side report endpoint · Medium

**Current status.** There is no `…/reports/…` or `…/print` route for Patient Overview, the ledger
statement, the transactions day sheet or the insurance plan summary; `openapi.json` has no
`application/pdf` responses outside the letters module. Legacy Denticon rendered these as server
reports (fixed layout, office letterhead, page numbering, audit of who printed what).

**Impact.** The frontend rebuilds each report from the data already on screen, so a print only ever
contains what the browser has loaded (see PRINT-3/4/5). Layout lives in the frontend; nothing is
audited; a print cannot be produced without opening the screen (no batch / e-mail statement).

**Suggested change.**
```
GET /api/v1/patients/{id}/reports/overview            -> application/pdf
GET /api/v1/patients/{id}/reports/ledger?scope=account|patient&date_from&date_to&type
GET /api/v1/patients/{id}/reports/transactions?date=YYYY-MM-DD
GET /api/v1/patients/{id}/reports/insurance?category=D|M&order=primary|secondary
```
Same query params the screens already send, returning a PDF (or HTML) rendered from the canonical
data. When these land, each `*Print.ts` becomes a one-line `window.open(url)` and the client-side
builders can be deleted.

### PRINT-2 — No office logo / letterhead · Low

`OfficeRead` carries `name`, `address_line1/2`, `city`, `state`, `zip`, `phone`, `phone_2` (all
used in the printed header). There is no logo (Setup → Account gap #4 in `backend_devreport.md`)
and no per-office "statement header / footer" text (gap #12), so the printout header is text-only.

### PRINT-3 — Ledger feed cap · Medium

`GET /patients/{id}/ledger` returns at most 500 rows per call and the frontend does not page past
it (AL-2). The screen shows an amber "first 500 transactions" banner; the print repeats the same
notice under the section title, but an account with a long history still prints an incomplete
statement. Ask: raise the cap or support `page` on the feed so the print can walk every page.

### PRINT-4 — Balance endpoint vs ledger arithmetic · Medium

Migrated payments are stored with a negative `amount` and `GET /patients/{id}/balance` subtracts
them again (AL-9). The ledger screen therefore takes the **Balance** column from its own running
total and the aging / estimate columns from the endpoint; the printed BALANCES table inherits that
mix, and the Overview's Balances section (endpoint only) can show a different balance from the
printed ledger for the same patient. Fixing AL-9 makes both prints agree.

### PRINT-5 — Overview composition limits · Low

The Overview print is composed from ~12 resources (PO-1). Per-member balance / next-visit
enrichment stops at 25 members (PO-3), so on a very large account the Balances and Account Members
rows beyond the cap print `$0.00` / `-`.

### PRINT-6 — Today's Est Ded · Low

`Today's Est Ded` prints `0.00` because no endpoint computes the deductible applied to the day's
charges (CHG-7 / PLAN-3). The screen shows the same value with a † tooltip.

### PRINT-7 / PRINT-8 — Insurance fields with no backend column · Low

`marital_status`, `sub_phone`, `sec_rel_to_prim` (INS-PT-1/2/3) are local-only form fields, so they
print blank after a reload. `insurance_plans` has no `effective_date` / `term_date`, so the
Eligibility table's "Plan Date" column prints `-` for those two rows (only the plan
`anniversary_date` exists).

### PRINT-9 — Ortho patient plan · Low

The CONTRACTS card "Ortho - Patient Payment Plan" has no backend resource (AL-3); the print shows the
card with dashes, exactly like the screen.

### PRINT-10 — Patient photo · Low

The legacy Overview print carried the patient photo; there is no photo field or endpoint (PO-10), so
the printed identity block is text-only.

## 3. Frontend notes for whoever picks up PRINT-1

* Every builder takes the *already-formatted* screen values (e.g. `OverviewData`, `LedgerRow[]`,
  `InsuranceForm` + `PlanDisplay`), so a server report should reuse the same label set — the section
  titles and column headers in the four `*Print.ts` files are the legacy names.
* Ledger print uses `viewRows` (filtered + sorted, all pages) — a server route should accept the
  same `scope / date_from / date_to / type / sort` inputs.
* `printPatientPdf()` stamps `Page x of y` and calls `doc.autoPrint()`; a server PDF only needs to
  be opened in a new tab to get the same behaviour.
