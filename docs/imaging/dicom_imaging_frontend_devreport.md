# DICOM Imaging — Frontend Integration Report & Backend Gaps

Module: **Imaging** · Screen: **Patient Imaging → Images tab**
(`/patient/{patientId}/imaging`) · Feature: `src/features/imaging/**`

This report covers the frontend wiring of the **DICOM archive** viewer against
[`DICOM_IMAGING_API_CONTRACT.md`](./DICOM_IMAGING_API_CONTRACT.md), and logs the
backend gaps that remain **open in the running environment** so the backend team
can close them. It complements (does not replace)
[`imaging_backend_devreport.md`](./imaging_backend_devreport.md), whose Phase-1
gaps #3–#6 (imaging-native binary endpoint, thumbnails, signed URLs, view-audit)
are **superseded by the DICOM contract** — the contract already specifies all of
them. The remaining issues below are about *deployment* and a few contract nits.

---

## 1. What the frontend now does

The Images tab renders two sections:

1. **Scanned Imaging** (new) — the patient's DICOM archive from cloud storage:
   - Loads `GET /api/v1/patients/{patient_id}/imaging` (study → series → instance).
   - Groups images **by study** (visit/date) as collapsible cards with modality,
     image-count, `identity_review_required` and re-identified badges.
   - **Modality / tooth / date-range filters** wired to the §3.1 query params.
   - Thumbnail grid from `assets.thumbnail_url`; placeholders for `pending`/`failed`.
   - **Full viewer** (zoom / pan / rotate / fit / fullscreen, prev/next, keyboard):
     full-res `assets.web_url`, falls back to the thumbnail while `pending` and
     re-polls `GET /dicom-instances/{sop}` until the web JPEG appears; **Download
     DICOM** uses `assets.original_url`; a 401/`invalid_image_token` shows a
     Refresh action that re-fetches the tree for fresh 24h tokens.
2. **Uploaded Images** (existing Phase-1 gallery) — unchanged.

**Files added:** `services/dicomService.ts`, `hooks/useDicomImaging.ts`,
`utils/dicomAssets.ts`, `components/{DicomStudySection,DicomStudyCard,
DicomInstanceThumbnail,DicomViewer,DicomFilters}.tsx`, DICOM types in `types.ts`.
`tsc -b` + `eslint` clean.

---

## 2. Status update (2026-07-29, second pass — backend redeployed)

### ✅ GAP DICOM-1 — RESOLVED: endpoints are now deployed
- `GET /api/v1/patients/{id}/imaging`, `.../imaging/summary`,
  `GET /api/v1/dicom-instances/{sop}` (+ `/thumbnail` `/web` `/original`) are now
  in `openapi.json` and return **200** with the contract shapes.
- `npm run api:sync` regenerated the `Imaging`-tag Orval client:
  `getPatientImaging` / `useGetPatientImaging`, `getPatientImagingSummary`,
  `getDicomInstance`, `getDicomThumbnail`, `getDicomWebImage`,
  `downloadDicomOriginal`, plus models `PatientImagingResponse`, `DicomStudyOut`,
  `DicomSeriesOut`, `DicomInstanceOut`, `InstanceAssets`, `PatientImagingSummary`.

### ✅ GAP DICOM-2 — RESOLVED: swapped to the generated client
- The hand-written `dicomService.ts` was **deleted**; the feature now calls the
  generated `useGetPatientImaging` (via a thin `useDicomImaging` wrapper that
  cleans empty filters + sets staleTime) and the generated `getDicomInstance`
  (viewer re-poll). `types.ts` re-exports the generated model types. `tsc -b` +
  `eslint` clean.

---

## 2b. Backend gaps still open

### GAP DICOM-3 — **No DICOM imaging has been migrated for any patient (blocks real-data validation)**
- **Observed:** scanned **854 patient ids** via `GET .../imaging/summary`
  (incl. the contract's example **74115**): **845 → 200 with `image_count: 0`**,
  9 → 404 (nonexistent id), **0 patients with any imaging**. Both the summary and
  tree for 74115 return the empty state (`study_count: 0`, `studies: []`).
- **Analysis:** matches contract §8 — the endpoints are live but images only
  appear after (1) the **migration run** loads the study/series/instance index +
  uploads originals to GCS and (2) the **derivative worker** generates JPEGs.
  Neither appears to have run in this environment yet.
- **Impact:** the frontend is verified end-to-end against an **injected,
  contract-shaped mock** (gallery grouping, all three `assets.status` states,
  viewer zoom/rotate/prev-next/download/metadata, pending re-poll) — see §5 — but
  the parts that depend on **real GCS asset delivery** cannot be exercised:
  actual thumbnail/web JPEG bytes, the **307 → signed-URL redirect** path, and
  **24h token expiry / refetch recovery**.
- **Ask:** run the migration + derivative worker for at least one patient
  (ideally **74115**) so we can validate against real assets and confirm the
  redirect/token behaviour.

---

## 3. Contract clarifications (non-blocking)

- **`InstanceAssets.status` is un-enumerated.** The generated model types it as
  `string`, not `"ready" | "pending" | "failed"` (the OpenAPI schema didn't emit
  an enum). The frontend still switches on those three literals. **Ask:** declare
  `status` (and ideally `modality` = `IO|PX|XC`) as enums in the schema so the
  generated client is strongly typed and typos are caught at build time.
- **Many response fields are optional in the schema** (`studies?`, `series?`,
  `instances?`, `image_count?`, `identity_review_required?`). The frontend guards
  all of these, but if the backend always populates them, tightening the schema
  (`required`) would remove the ambiguity.

- **`derivative_status` vs `assets.status`.** Each instance carries a top-level
  `derivative_status: string` *and* an `assets.status: ready|pending|failed`. The
  frontend keys entirely off `assets.status` (per §4). Please confirm
  `derivative_status` is informational/redundant so we don't need to reconcile the
  two, or document when they can disagree.
- **Route-missing vs unknown-patient.** Both surface as 404. Once deployed this is
  moot, but a distinct error `code` for unknown-patient (the contract shows
  `not_found` with a patient-specific message) vs a bare router 404 helps the UI
  avoid alarming users when the service is simply down.
- **Token refresh cost.** Asset tokens live 24h; on a 401 we re-fetch the **whole
  tree** to refresh every URL (per §6). Confirm there's no per-request rate limit
  that would make a full-tree refresh costly for large libraries, or expose a
  lighter "refresh tokens only" path.

---

## 4. Enhancement requests (nice-to-have, not blocking)

- **Derivative-ready signal.** While `web_url` is `pending` the viewer polls
  `GET /dicom-instances/{sop}` (≤10× at 3 s). A push/SSE or an ETag/`Retry-After`
  hint would remove client polling. Optional.
- **Write paths.** The contract is read-only. If clinicians must act on
  `identity_review_required` (confirm/correct identity) or hide/withdraw a study,
  those need endpoints. Flag for product before we build any mutating UI.

---

## 5. Verification status

| Check | Result |
|---|---|
| `npx tsc -b` (full project, after Orval swap) | ✅ clean |
| `npx eslint src/features/imaging` | ✅ clean |
| Live endpoints return 200 + contract shapes (patient 74115) | ✅ |
| Empty state renders (real 200, `studies: []`) | ✅ |
| Populated gallery: study grouping, dates, modality/tooth/identity badges | ✅ (mock, §2b) |
| Thumbnails: ready image / `pending` "Preparing" / `failed` placeholder | ✅ (mock) |
| Viewer: web image, zoom/rotate/FIT, prev-next, position, metadata, DICOM download | ✅ (mock) |
| Viewer pending path: thumbnail fallback + "Preparing…" banner + re-poll | ✅ (mock) |
| Uploaded-images section still works | ✅ |
| Real GCS asset bytes + 307 signed-URL redirect + 24h token expiry | ⛔ **blocked on GAP DICOM-3 (no migrated data)** |

_Screenshots on file: `scratchpad/dicom_populated.png` (gallery, 3 derivative
states), `scratchpad/dicom_viewer.png` (viewer, ready), `dicom_viewer_pending.png`
(viewer, pending). The populated checks used a contract-shaped response injected
at the XHR layer because no patient has migrated imaging yet (GAP DICOM-3)._
