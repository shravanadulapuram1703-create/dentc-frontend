# ADA Dental Claim Form (2024) — DIRECT PRINT: UI gaps report

> **Audience:** UI / frontend team
> **Date:** 2026-09-11
> **Screen:** Patient → Ledger → claim → **DIRECT PRINT** (`/patient/:patientId/claim/:claimId`)
> **Spec:** *ADA Dental Claim Form Completion Instructions, Version 2024* (© American Dental
> Association, instructions dated 2023 Jun 02) — the paper form data content must be in harmony with
> the HIPAA 837D electronic claim.
> **Backend gaps:** `docs/claims/ada_claim_form_2024_backend_devreport.md` (ADA-BE-1…14)

## 1. What shipped

DIRECT PRINT used to raise `alert("Claim form printing is not available yet")`. It now opens a
**pre-flight window** and prints the **ADA Dental Claim Form, Version 2024** (front side, Items
1–58) as a PDF in the browser's print dialog.

| Piece | File |
|---|---|
| Form model — one field per ADA item, code lists (area of oral cavity, surfaces, provider taxonomy, POS), formatting helpers, and the completion-rule checker | `src/features/claims/ada/adaClaimFormModel.ts` |
| Assembler — reads the claim, patient, subscriber, carrier, other-coverage slot, office, providers, chart, history and fill-out record and maps each to its item | `src/features/claims/ada/adaClaimFormData.ts` |
| Renderer — jsPDF layout of the 2024 form on US Letter; "form" (plain paper) and "overlay" (pre-printed stock) modes; splits >10 lines into fully completed forms (rule E) | `src/features/claims/ada/adaClaimFormPdf.ts` |
| Pre-flight modal — summary of what prints, the four 2024 switches, the completion checklist with "where to fix" hints, PRINT | `src/features/claims/ada/AdaClaimPrintModal.tsx` |
| Wiring — `handleDirectPrint` opens the modal | `src/components/patient/ClaimDetail.tsx` |
| Fill-out record gains `is_epsdt`, `is_locum_tenens`, `date_last_srp` | `src/components/patient/claimFillOut.ts` |

### Rules from the instructions that the print enforces automatically

| Rule | Implementation |
|---|---|
| Item 1 — actual services vs predetermination | `claim.is_preauth` → "Request for Predetermination"; otherwise "Statement of Actual Services". EPSDT is a switch. |
| Item 3 in the #9 window-envelope position | Payer name/address block is the first box in the left column, same position as the paper form. |
| Items 4–11 apply to the *other* plan (COB) | Primary claim → the secondary dental plan; secondary claim → the primary plan; medical plan marks "Medical?" and is used only when no other dental plan exists. |
| Item 18 "Self" — the policyholder is the patient | Blank subscriber address / DOB / gender fall back to the patient row. |
| Item 24 blank on a predetermination | Dates suppressed when `is_preauth`. |
| Item 25 conditional | Printed only for quadrant/arch codes (`requires_quadrant` / catalog anatomy mode) and never for codes whose nomenclature names the arch (denture family D51xx/D52xx/D58xx…). Tokens UR/UL/LL/LR/UA/LA/FM → 10/20/30/40/01/02/00. |
| Item 26 "JP" only when Item 27 is reported | Automatic. |
| Item 28 no separators, single letters | "m-o-d" → `MOD`; letters outside B D F I L M O flagged. |
| Item 29b default "01" | Automatic (no quantity column exists — see UI-6). |
| Item 32 = Σ Item 31 + 31a, per form | Computed per printed form. |
| Item 33 missing teeth | Derived from the restorative chart (`chart_conditions` + completed extractions/implants via `toothStatusBridge`), permanent teeth only; unerupted / impacted teeth are not marked. |
| Item 34 qualifier "AB" | Printed automatically when any of ICD 1–4 is filled. |
| Item 35 COB note | Secondary/tertiary claims append "Primary carrier paid $x — EOB attached." |
| Items 36/37 "Signature on File" | Printed with today's date when the switch is on (PMS-inserted, as the instructions permit). |
| Item 39 Y/N | "Y" when any fill-out enclosure count or readiness enclosure (`/readiness`) is > 0. |
| Item 39a Date Last SRP | Most recent completed D4341/D4342 in the patient's history; overridable. |
| Item 43 "NO" when no prosthesis on the claim | Automatic; prosthesis codes with an unanswered fill-out print neither box and are flagged. |
| Item 50 blank for a corporation | Blank when the office has a `corporate_name` and `use_billing_license` is off. |
| Item 56 street address, not a P.O. Box | P.O. Box pattern is an error in the checklist. |
| Item 56a taxonomy code | Free-text `providers.specialty` mapped to the Healthcare Provider Taxonomy code (Endodontics → 1223E0200X …), default 122300000X "Dentist". |
| General rule D — four-digit years | Every date is re-formatted to MM/DD/CCYY. |
| General rule E — more than 10 procedures | Extra, fully completed forms with their own Item 32; remarks carry "Form n of m". |

## 2. UI gaps — status after the 2026-09-11 implementation pass

All 20 rows below were reported on 2026-09-11 and implemented the same day (except UI-11, which
turned out to already exist). Items whose backend column is still missing are held in the browser
(per-claim fill-out record or per-office/provider local store) and are labelled as such on screen;
the matching backend asks are ADA-BE-2/3/4/5/6/7/8/10/14 in the backend report.

| # | ADA item | Gap (original) | What shipped | Where |
|---|---|---|---|---|
| UI-1 | 53a, 1, 39a | 2024 boxes only on the print pre-flight | EPSDT / Title XIX, Locum tenens and Date Last SRP are now on the **Claim Fill-Out** window (left column) and on the pre-flight; one shared record. | `ClaimFillOutModal.tsx` |
| UI-2 | 29a | No per-procedure diagnosis pointer | **Procedure lines** grid in Claim Fill-Out with A–D checkboxes per line (enabled once ICD 1–4 are entered); prints in Item 29a. Stored per claim (`line_overrides`, ADA-BE-3). | `ClaimFillOutModal.tsx`, `adaClaimFormData.ts` |
| UI-3 | 5–11 | Other coverage not visible on the claim screen | Claim header gains **"Other coverage on file:"** (carrier · subscriber (relationship) · Dental/Medical), resolved from both insurance categories with the same COB rule the print uses. | `ClaimDetail.tsx` |
| UI-4 | 12, 20, 5 | No name suffix | **Name suffix — patient / subscriber** inputs in Claim Fill-Out; printed as the 4th name part. Backend column still missing (ADA-BE-10). | `ClaimFillOutModal.tsx` |
| UI-5 | 14, 22, 7 | Gender lists M/F/O, form needs U | **Unknown (U)** added to every gender pick list (patient wizard, responsible party, insurance subscriber, subscriber information); "Other" is labelled *"prints as U on claims"*. | `wizardModel.ts`, `insuranceModel.ts`, `InsuranceSlotStep.tsx`, `editMode.ts` |
| UI-6 | 29b | No quantity | **Qty (01–99)** per line in the Claim Fill-Out procedure grid; prints in Item 29b (ADA-BE-4). | `ClaimFillOutModal.tsx` |
| UI-7 | 31a | No other fees | **Other Fee(s)** input in Claim Fill-Out; prints in 31a and is added to Item 32 (ADA-BE-5). | `ClaimFillOutModal.tsx` |
| UI-8 | 36 | Signature on File not linked to captured signatures | Fill-out and pre-flight show **"captured <type> <date>"** from `patient-signatures` (active, non-user) or "no captured patient signature on file"; the switch defaults to the captured signature until staff change it (ADA-BE-7). | `adaClaimFormData.fetchConsentSignature` |
| UI-9 | 49–52a | No billing-entity panel in Office Setup | **Setup → Office → Info → Billing Configuration → "Insurance claim billing (ADA claim form Items 48–52)"**: Corporate / billing entity name (real `corporate_name` column, now bound), Entity NPI (Type 2) + entity taxonomy (browser store per office until ADA-BE-8), and a ✓/✗ readiness list for Items 48–52. The print uses the entity NPI before the provider's. | `offices/tabs/InfoTab.tsx`, `officeData.ts`, `OfficeSetup.tsx` |
| UI-10 | 54–58 | Free-text specialty; NPI/license not checked | **Setup → Providers → Info → Professional Credentials**: Business Phone (real `phone` column, now editable — Item 57), **Provider Taxonomy Code** pick list (browser store per provider until ADA-BE-14; blank = mapped from Specialty), and an "ADA claim form readiness (Items 54–57)" ✓/✗ block for dentists. | `providers/tabs/InfoTab.tsx`, `providerData.ts` |
| UI-11 | 52a, 58 | No editor for provider insurance IDs | **Already existed** — Setup → Providers → Insurance IDs tab (CRUD on `/provider-insurance-ids`). Report row was wrong; no change. | `providers/tabs/InsuranceIdsTab.tsx` |
| UI-12 | 33 | No way to mark missing teeth for a claim | **32-tooth picker** on the print pre-flight (chart values pre-selected; click to toggle; "Reset to chart"); stored per claim (`missing_teeth_override`, ADA-BE-6). | `AdaClaimPrintModal.tsx` |
| UI-13 | 38 | Hard-coded POS list | Place of Treatment reads **`/place-of-service-codes`** (20 seeded codes on this tenant) and falls back to the built-in list only when the table is empty. | `ClaimFillOutModal.tsx` |
| UI-14 | all | No overlay calibration | Overlay mode shows **Offset X / Y (pt)** inputs (saved per office) and a **Print alignment test** button (full form outline with markers + corner crosses at the offsets). | `AdaClaimPrintModal.tsx`, `adaClaimFormPdf.renderAdaCalibrationPage` |
| UI-15 | — | No print log | Every print / alignment test appends to a per-claim **print log** (when, who, mode, forms, must-fix count). Shown as **"ADA Form Last Printed"** in the CLAIM STATUS panel (hover = full history) and in the pre-flight title bar. Browser-only until ADA-BE-1. | `adaLocalStores.ts`, `ClaimDetail.tsx` |
| UI-16 | reverse | Only the front printed | **"Add reverse side (instructions page)"** switch — general instructions, COB, diagnosis coding, POS codes and the provider-specialty table on a second page. | `adaClaimFormPdf.renderInstructionsPage` |
| UI-17 | — | No preview | **Live PDF preview** pane in the pre-flight (re-renders on every switch; "show" toggle). | `AdaClaimPrintModal.tsx` |
| UI-18 | 2 | PA number re-typed after predetermination | Claim Fill-Out on an actual-services claim lists **"Predetermination on file: Use <number>"** buttons from the patient's preauthorization claims' fill-out records. | `adaClaimFormData.fetchPredeterminationNumbers` |
| UI-19 | 40–42 | Ortho dates not pre-filled | **"Pre-fill from ortho payment plan"** button (banding / treatment start date, months from treatment start→end or months remaining); the print also falls back to the plan when the boxes are blank. | `adaClaimFormData.fetchOrthoDefaults` |
| UI-20 | 30 | Long descriptions truncated | Item 30 now abbreviates common nomenclature (periodontal→perio, radiographic images→x-rays, …) and shrinks the font (7→5.4pt) before truncating. | `adaClaimFormPdf.abbreviateDescription` |

| UI-21 | 36, 37, 53 | Signatures could only be "on file" text or wet ink | **Signatures (Topaz pad or on screen)** section on the print pre-flight: one row per item with the stored image, date, device and source (captured for this claim / latest on patient / provider's on-file signature), **Capture / Re-capture** opening the shared `SignatureCapture` pad (Topaz when connected, on-screen otherwise) and **Don't print**. Saved with `POST /patient-signatures`; the image prints on the signature line with the date. Item 53 also uses the provider's user-account signature. Row ids are kept on the claim's fill-out record (SIG-11). | `ClaimSignatureDialog.tsx`, `adaClaimSignatures.ts`, `adaClaimFormPdf.ts` |

### Still browser-held (needs the backend columns)

`line_overrides`, `other_fees`, `patient_name_suffix`, `subscriber_name_suffix`, `missing_teeth_override`,
`is_epsdt`, `is_locum_tenens`, `date_last_srp` (per-claim fill-out record); office entity NPI/taxonomy
and provider taxonomy (per office / provider store); print log and print offsets. All keys survive
logout (`clearAuthStorageKeepRemembered`).

## 3. Data-quality findings from the live verification (claim `ff1f14fe…`, patient 83928)

Not UI defects, but they explain blanks on the printed form for this tenant:

- Provider `PRV-100` has no `npi`, `license`, `phone`, `specialty` → Items 54/55/57 blank, 56a defaults to
  122300000X. Provider Setup should require NPI + license for treating dentists (UI-10).
- Office 2 has no `phone`, `tax_id`, `corporate_name`, `billing_provider_id` → Items 49/51/52 come from
  the treating provider's `tax_id` or print blank (UI-9).
- Subscriber 65312 has no `sub_dob` / `sub_gender`; relationship is *Self*, so the patient's values are
  used (instructions Item 18).
- Patient `middle_initial` = "test" — an initial field holding a word prints as "Off, check, test".
- `patient-insurance` for this patient has only a primary dental plan, so Items 4–11 are blank (correct).

## 4. Verification (2026-09-11, first pass)

- `npx tsc -b` and `npx eslint` clean on the new files.
- Rendered sample (12 lines → 2 forms, every item populated) and the live claim through the Browser
  pane: DIRECT PRINT → pre-flight assembled in ~8 s (patient, carrier, insurance slots ×2, subscriber,
  plan, employer, office, provider, chart conditions, procedure history, SRP history, provider-insurance
  ids, procedure code) → PRINT opened the PDF (35 KB, 1 page) with Items 1, 3, 3a, 12–18, 20–24, 29–32,
  38–40, 43, 48, 51, 53, 56, 56a filled from backend rows and the checklist naming the blanks.
- Pre-flight switches persist to the claim's fill-out record (`dentc:claim_fillout:v1:<claim_id>`).

### Verification of the implementation pass (2026-09-11, second pass)

Live on claim `ff1f14fe…` (patient 83928) at `:5173`, `npx tsc -b` + `npx eslint` clean:

- Claim header shows **Other coverage on file: None** (patient has one plan); CLAIM STATUS shows
  **ADA Form Last Printed** after a print (`09/11/2026, 09:29 PM · Admin User`).
- CLAIM FILL-OUT shows the 2024 boxes, other fees, suffixes, the procedure-lines grid (D0140, Qty 01,
  A–D disabled until an ICD is entered), the seeded POS list (02 Telehealth … 99), and
  "(no captured patient signature on file)".
- DIRECT PRINT pre-flight: preview iframe (blob URL), 32-tooth picker (tooth 19 toggled → stored as
  `missing_teeth_override: ["19"]`), overlay mode reveals Offset X/Y + "Print alignment test",
  PRINT produced a 7 KB overlay PDF and wrote the print log.
- Setup → Office (Excel Dental - Wexford) → Info shows the Insurance claim billing panel with the
  readiness list (✓ 48, ✗ 49 NPI, …); Setup → Providers → Info shows Business Phone,
  Provider Taxonomy Code and the readiness block.
