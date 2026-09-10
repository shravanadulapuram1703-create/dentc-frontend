# Claim Fill-Out Information — backend dev report

**Screen:** Ledger → CREATE CLAIM → claim screen → **CLAIM FILL-OUT**
(`/patient/:patientId/claim/:claimId`, `src/components/patient/ClaimFillOutModal.tsx`)

**Legacy reference:** on-prem "Dental Insurance Fill-out Form" window, opened from
*Claim Fill-Out Information* on the Create Claim screen.

## What shipped

The button used to raise `alert("Claim fill-out is not available yet.")`. It now opens the
Dental Insurance Fill-out Form as a modal over the claim screen, pre-filled from the claim
and the patient record, with SAVE / CANCEL.

Boxes implemented, matching the legacy window:

| Block | Fields |
| --- | --- |
| Header strip | patient name, age/sex/DOB, ID + home office, (C)/(H)/(W) phones, first/last visit, next recall, carrier + est. insurance + billed |
| Top left | First Visit Date, Prior Authorization Number, Other Dental or Medical coverages?, Assign Benefits to Patient, Signature on File |
| Top right | Place Of Treatment (CMS place-of-service), Insurance Ref. #, Student Status, School Name, ICD 1–4 |
| Number of Enclosures (00–99) | Radiograph(s), Oral Image(s), Model(s) |
| Treatment is Result Of | Other Accident, Occupational Illness, Auto Accident, Accident Date, Accident State |
| Treatment is for Orthodontics | Date Appliance Placed, Months Remaining (gated on the section checkbox) |
| Treatment is for Prosthesis | Replacement of Prosthesis, Date Prior Placement (gated on the section checkbox) |
| Remarks | 240-character textarea with counter + ADD NOTES MACRO (reuses the Setup → Notes Macros picker) |

## Where the values go today

`PATCH /api/v1/patients/{id}` — **really persisted**, verified live (patient 83700):

- `first_visit`
- `student_status`
- `school_name`
- `assign_benefits`

Everything else is held per claim in `localStorage` under `dentc:claim_fillout:v1:<claim_id>`
and the modal says so on-screen. This is a stop-gap: it does not survive a different browser
or workstation, and nothing on the claim carries it to a payer. (Logout and any 401 run
`localStorage.clear()`, so these keys are explicitly preserved alongside the "last patient"
keys in `clearAuthStorageKeepRemembered` — otherwise a session timeout would destroy them.)

## Gaps

### CLM-FO-1 — the claim resource has no fill-out columns

`InsuranceClaimRead` / `InsuranceClaimCreate` / `InsuranceClaimUpdate` expose only
`patient_id, office_id, claim_number, status, claim_type, billing_order,
date_of_service_from/to, total_billed, total_paid, est_insurance, submitted_date,
paid_date, close_date, billing_provider_id, treating_provider_id, carrier_id,
ins_plan_id, is_preauth, notes, is_active`.

None of the ADA-form boxes below exist anywhere in `openapi.json`:

| Requested column | ADA 2019 box | Type |
| --- | --- | --- |
| `prior_authorization_number` | 2 (Predetermination/Prior Auth Number) | string(40) |
| `has_other_coverage` | 4 | bool |
| `signature_on_file` | 36/37 | bool |
| `place_of_treatment` | 38 | string(2), CMS POS code |
| `insurance_reference_number` | — (payer reference) | string(40) |
| `enclosures_radiographs` | 39 | int 0–99 |
| `enclosures_oral_images` | 39 | int 0–99 |
| `enclosures_models` | 39 | int 0–99 |
| `is_other_accident` / `is_occupational_illness` / `is_auto_accident` | 45 | bool |
| `accident_date` | 46 | date |
| `accident_state` | 47 | string(2) |
| `is_orthodontic_treatment` | 40 | bool |
| `ortho_appliance_placed_date` | 41 | date |
| `ortho_months_remaining` | 42 | int |
| `is_prosthesis_treatment` / `is_replacement_of_prosthesis` | 43 | bool |
| `prosthesis_prior_placement_date` | 44 | date |
| `remarks` | 35 | string(240) |

**Ask:** add these to the insurance-claim row (or a 1:1 `insurance_claim_fillout` child
resource keyed by `claim_id`) and expose them on read/create/update. The frontend model in
`src/components/patient/claimFillOut.ts` already uses exactly these snake_case names, so
wiring is a one-file change once the columns land.

### CLM-FO-2 — `remarks` must be separate from `notes`

The claim screen's CLAIM NOTES field maps to `InsuranceClaimUpdate.notes`. The fill-out
REMARKS box is a different field: it is capped at 240 characters and is what prints in ADA
box 35 / goes out on the e-claim. Reusing `notes` would clobber staff notes, so remarks is
currently not written to the backend at all.

### CLM-FO-3 — the ICD library is unseeded

`GET /api/v1/icd-codes?is_active=true` returns `meta.total = 0` on the current tenant, so the
ICD 1–4 pick list is empty and the fields fall back to free text. The codes also have nowhere
to be stored per claim (see CLM-FO-1) or per procedure — legacy points each procedure line at
one of the four claim-level ICD pointers.

**Ask:** seed the ICD-10 library, and add `icd_1…icd_4` on the claim plus a diagnosis-pointer
column on the claim procedure line.

### CLM-FO-4 — no place-of-service definition list

`place_of_treatment` is rendered from a hard-coded CMS POS list in
`src/components/patient/claimFillOut.ts`. There is a `/api/v1/place-of-service-codes`
resource in the generated client but nothing links it to a claim; if it is the intended
source, seed it and say which code set/labels the practices expect.

### CLM-FO-5 — fill-out data is not carried into e-claim submission

`ClaimSubmissionCreate` carries `claim_id, batch_id, is_preauth, total_charges, num_lines,
submission_status, claim_text` only. Once CLM-FO-1 lands, the 837D/clearinghouse payload
builder must read the fill-out fields; until then the boxes are informational only and the
modal warns the user that they are not transmitted.

## Verification

Live-verified at `:5173` against the local backend, claim
`c35df002-1683-47f3-951c-6a941d809977` (patient 83700, Udayk, Paloju):

- CLAIM FILL-OUT opens the form populated with patient/claim context.
- Section checkboxes gate the orthodontics and prosthesis date fields.
- Enclosure inputs clamp to 00–99; remarks clamp to 240 characters with a live counter.
- ADD NOTES MACRO lists the real Setup → Notes Macros library and appends the macro text.
- SAVE → `PATCH /patients/83700` 200; re-reading the patient shows
  `first_visit 2026-01-17`, `student_status "Full-time"`, `school_name "Moon Township High"`,
  `assign_benefits true`. Reopening the form restores every other box from local storage.
- CANCEL closes without writing.
