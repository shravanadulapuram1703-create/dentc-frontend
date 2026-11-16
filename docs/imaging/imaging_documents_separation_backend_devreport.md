# Imaging ↔ Documents separation — Backend Dev Report

**Date:** 2026-11-16 · **Area:** Patient → Documents, Patient → Imaging (X-ray) · **Gap IDs:** IMG-DOC-1..6
**Severity:** High. Patient files show up on the wrong clinical screen (an insurance card or photo ID
shows up among a patient's radiographs).

## 1. Symptom (as reported)

A file uploaded on **Patient → Documents** also shows up on **Patient → Imaging** (the X-ray gallery).
It should only show on Documents.

## 2. Root cause

There are two causes. The frontend one is **fixed**. The backend one is **open** and needs this team.

### 2a. Frontend cause (FIXED in this change)

Both screens read **the same list**, `GET /api/v1/patient-documents?patient_id=…`. The Imaging gallery
used to keep any row that *looked like an image*:

```
content_type starts with "image/"   OR   document_type in imaging categories   OR   extension jpg/png/tif/webp
```

So every JPG/PNG in the patient's file store showed up in X-rays. That includes Documents-tab uploads
(insurance cards, photo IDs), note attachments, the patient photo (`PH`) and restorative drawings
(`restorative-drawing`).

**Fix:** `src/features/imaging/utils/imageFilters.ts → isImagingDocument()`. A row now belongs to
Imaging only when its `document_type` is one of the Imaging-only categories (`X-Ray`, `Bitewing`,
`Panoramic`, `Periapical`, `Intraoral Photo`, `Treatment Photo`, `Other Image`). Older Imaging rows
saved as generic `Other`/`Document` stay visible only if they also have an Imaging `image-details` row.
The Imaging upload picker no longer offers the generic `Document`/`Other` labels.

This is a **workaround**. Which module owns a row is now inferred from a free-text label, which
breaks as soon as any other screen reuses one of those strings. The backend needs to model it
properly (IMG-DOC-1/2).

### 2b. Backend cause (OPEN)

`patient_documents` is one shared table/bucket that **at least 8 features** write to, and nothing
on the row says which module owns it:

| Writer (frontend) | `document_type` sent | `context` | Lands under |
|---|---|---|---|
| Patient → Documents tab | free text: `Insurance Card`, `Identification`, `X-Ray / Radiograph`, `Other`… | — | `documents/general/` |
| Patient → Imaging (upload + device scan) | `X-Ray`, `Bitewing`, … | — | `documents/general/` |
| Patient Notes attachment | definition codes `CF`, `IC`, `ID`, `XR`, `PH`, `OT`… | `note` | `documents/notes/` |
| Patient Photo | `PH` | — | `documents/general/` |
| Letters / Consent | `letter` / `consent-form` | — | `documents/consent-forms/` |
| Progress Notes | `progress_note` | — | `documents/general/` |
| Restorative chart drawing | `restorative-drawing` | — | `documents/general/` |
| Treatment Plan | `treatment-plan` | — | `documents/general/` |

Verified against the local backend (UAT DB `Test_Dental_Group`, 2026-11-16):

- `GET /patient-documents/limits` → `allowed_contexts: ["note"]`. There is no `imaging` or
  `documents` context, so Imaging and Documents uploads both land in the same `documents/general/` folder.
- `GET /patient-documents?document_type=…` is a **single, exact, case-sensitive** match:
  - `document_type=Insurance Card` → 3 rows; `insurance card` → 0 rows.
  - `document_type=Insurance Card&document_type=CF` → returns only the `CF` rows (the last value wins).
  - `document_type=Insurance Card,CF` → 0 rows (comma lists are not supported).
- `GET /patient-documents?context=note` → the parameter is **silently ignored** (all 10 rows come back).
- `PatientDocumentRead` has no `context`/`source`/`module` field, so a client can't tell where a row
  came from.
- `document_type` is free text (`String(50)`). It is not validated against the `document_type`
  definitions group, so the same meaning shows up as `X-Ray / Radiograph`, `XR`, and `X-Ray`.

Code references: `app/services/document_store.py` (`DOCUMENT_CONTEXTS = (CONTEXT_NOTE,)`,
`prefix_for`), `app/db/models/patient_extra.py` (`PatientDocument`), `app/api/v1/patients_extra.py`
(list filters).

## 3. Gaps / asks

### IMG-DOC-1 — Persist and return the upload `context` (owning module) — **P0**
- Add a `context` (or `source_module`) column to `patient_documents`, and set it from the existing
  `context` upload form field.
- Expand `DOCUMENT_CONTEXTS` to a closed set, at least:
  `documents`, `imaging`, `note`, `patient_photo`, `letter`, `consent`, `progress_note`,
  `restorative`, `treatment_plan`.
- Return `context` on `PatientDocumentRead`.
- Map each context to its own storage prefix (e.g. `documents/imaging/…`), so radiographs are
  physically separated too. That matters for retention, a later DICOM migration, and access audits.

### IMG-DOC-2 — Filter the list by owner — **P0**
- `GET /patient-documents?context=imaging` (and `context=documents`, …) must filter rows. Today an
  unknown query param is silently ignored, which is how this bug went unnoticed.
- Support several values: `context=documents&context=note` (repeated param), or an explicit
  `exclude_context=`.
- Once this ships, the frontend will swap its client-side filter for `context=imaging` on Imaging
  and `context=documents` on the Documents tab.

### IMG-DOC-3 — Backfill `context` on existing rows — **P1**
Rows created before IMG-DOC-1 have no owner. Suggested backfill rules, in this order:
1. `storage_path` under `documents/notes/` → `note`; under `documents/consent-forms/` → `consent`/`letter`.
2. The row's id is the `tile_id` of an `image-details` row → `imaging`.
3. `patients.photo_document_id` points at it, or `document_type = 'PH'` → `patient_photo`.
4. `document_type` in (`X-Ray`, `Bitewing`, `Panoramic`, `Periapical`, `Intraoral Photo`,
   `Treatment Photo`, `Other Image`) → `imaging`.
5. `document_type` in (`progress_note`, `restorative-drawing`, `treatment-plan`, `letter`,
   `consent-form`) → the matching context.
6. Everything else → `documents`.

Please share the counts per bucket after a dry run, so the frontend team can review rows that fall
through to `documents` but might be radiographs (e.g. `X-Ray / Radiograph`, `XR`).

### IMG-DOC-4 — Make `document_type` a validated vocabulary — **P2**
Validate `document_type` against the `document_type` definitions group (`key1` codes), with separate
code sets per context (Documents: `IC`, `ID`, `CF`, …; Imaging: `BW`, `PA`, `PAN`, `FMX`, `IO`, …).
Migrate the free-text values. The frontend will then read the picker options from `/definitions`
instead of the hard-coded lists in `PatientDocuments.tsx` and `features/imaging/constants.ts`.

### IMG-DOC-5 — Optional: allow moving a document between Documents and Imaging — **P3**
Front-desk staff sometimes upload a radiograph on the Documents tab. A
`PATCH /patient-documents/{id} { context, document_type }` (there is no PATCH today) would let staff
move it to Imaging without deleting and re-uploading. Keep an audit entry for the change.

### IMG-DOC-6 — Reject unknown query params on list endpoints — **P3 (hardening)**
`?context=note` returning everything with a 200 hid this bug. Consider returning 422 for unknown
filter params on `patient-documents` (or at least logging a warning).

## 4. Frontend follow-up once the backend ships
- `useImagingGallery` → `useListPatientDocuments({ patient_id, context: 'imaging' })`; remove `isImagingDocument`.
- `imagingService.uploadImage` and the device scan → send `context: 'imaging'`.
- `PatientDocuments.tsx` → upload with `context: 'documents'`; list with `context=documents`
  (decide with product whether note/letter attachments also belong on that tab).
- Run `npm run api:sync`, then `npx tsc -b`.

## 5. How to reproduce (pre-fix frontend, or any API client)
1. Open a patient → **Documents** → Type "Insurance Card" → upload a `.jpg` → Upload.
2. Open the same patient → **Imaging** → **Images** tab: the insurance card shows up in the gallery.
3. API check: `GET /api/v1/patient-documents?patient_id=<id>&context=documents` returns the Imaging
   uploads too (the filter is ignored).
