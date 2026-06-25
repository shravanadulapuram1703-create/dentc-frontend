# Patient Imaging — Backend Dev Report

Module: **Imaging** · Screen: **Patient Imaging** (`/patient/{patientId}/imaging`)
Frontend feature: `src/features/imaging/**` · Phase 1 (backend-integrated workspace)

This report documents (1) how the imaging workspace maps onto existing backend
contracts, (2) the backend gaps that force compromises, and (3) an analysis of
the teammate prototype (`XRayImaging.tsx`) we evaluated but did not adopt.

---

## 1. What the frontend uses today

| Capability | Endpoint | Generated symbol | Notes |
|---|---|---|---|
| Store image bytes | `POST /api/v1/patient-documents` (multipart) | `uploadPatientDocument` | Only binary store that returns a served `file_url`. Category → `document_type`. |
| List images | `GET /api/v1/patient-documents?patient_id=` | `useListPatientDocuments` | Filtered client-side to `content_type` `image/*` (+ category/extension fallback). |
| Delete image | `DELETE /api/v1/patient-documents/{id}` | `deletePatientDocument` | |
| Tooth/notes metadata | `GET/POST/PATCH /api/v1/image-details` | `useListImageDetails` / `createImageDetail` / `updateImageDetail` / `deleteImageDetail` | Metadata only — no binary, no URL. |
| Patient image group | `GET/POST /api/v1/image-groups?patient_id=` | `useListImageGroups` / `createImageGroup` | One lazily-created group per patient; the only patient-scoped handle imaging exposes. |

**Correlation model (the central compromise):** `image-details` rows are linked
to their stored binary by `image_detail.tile_id === String(patient_document.id)`,
under one per-patient imaging `image-group`. There is no first-class relationship
between the two tables — see gap #1.

---

## 2. Backend gaps

### Gap 1 — No relationship between image binary and image metadata
- **Business need:** attach a tooth/notes record to a specific stored image.
- **Current status:** `patient-documents` (binary) and `image-details` (metadata)
  are unrelated tables. `ImageDetailCreate` has no `patient_document_id` and no
  `patient_id`; we stuff the document id into the free-text `tile_id`.
- **Suggested change:** add a nullable `patient_document_id` FK on `image-details`
  (+ a `patient_document_id` filter on `GET /image-details`). Removes the
  string-keyed join and lets the DB cascade deletes.
- **Impact:** correctness/integrity of tooth associations; eliminates orphan rows.

### Gap 2 — `image-details` is not patient-scoped
- **Need:** list all imaging metadata for a patient.
- **Current status:** `GET /image-details` filters only by `image_group_id`;
  there is no `patient_id`. We must first resolve the patient's image-group.
- **Suggested change:** add `patient_id` to `image-details` + a list filter, or
  fold metadata into a patient-scoped imaging endpoint (see Gap 3).

### Gap 3 — No imaging-native binary endpoint
- **Need:** upload/retrieve an actual radiograph/photo with imaging semantics.
- **Current status:** images ride the generic `patient-documents` store; imaging
  metadata is a parallel write. Two writes, two tables, manual correlation.
- **Suggested change:** `POST /api/v1/patients/{patient_id}/images` (multipart)
  returning `{ id, file_url, thumbnail_url, image_type, teeth, created_at }`, with
  matching `GET` (list) / `DELETE` / `PATCH` (metadata). Collapses the dual-write.

### Gap 4 — No thumbnails
- **Need:** fast gallery loading for large libraries.
- **Current status:** the gallery loads full-resolution originals into `<img>`
  thumbnails. Acceptable at small scale; will not scale to hundreds of images.
- **Suggested change:** server-side thumbnail generation + a `thumbnail_url`
  (or `GET .../images/{id}?variant=thumb`).

### Gap 5 — No expiring / signed URLs for PHI imagery
- **Need:** HIPAA-safe, non-guessable, time-limited image access.
- **Current status:** documents are served from a stable `file_url`. Confirm
  whether access is authenticated; long-lived/guessable URLs are a PHI risk.
- **Suggested change:** short-lived signed URLs (e.g. `GET .../images/{id}/access`)
  scoped to the authenticated tenant/user.

### Gap 6 — No image view/audit trail
- **Need:** HIPAA "who viewed which image when".
- **Current status:** uploads/deletes are recorded via standard row audit; image
  **views** are not captured.
- **Suggested change:** record access events on the signed-URL/access endpoint.

### Gap 7 — No device-scan persistence endpoint
- **Need:** persist a hardware-captured acquisition with modality/capture metadata.
- **Current status:** captured bytes are funneled through the generic
  `patient-documents` upload (no modality, exposure, or DICOM fields). The device
  itself is reached only via an env-gated local bridge (off by default).
- **Suggested change:** a dedicated acquisition endpoint accepting capture
  metadata (modality, device id, exposure, optional DICOM), reusing Gap 3's store.

---

## 3. Teammate prototype analysis — `XRayImaging.tsx`

A standalone prototype (provided outside the repo) implemented device capture by
talking via raw `fetch` to a local Node bridge on `http://localhost:3001` and
pushing images directly to a Google Cloud Storage bucket. We reviewed it as a
workflow reference and **did not import it**.

**Adopted (workflow ideas):**
- The acquisition state machine: health-check → `scan/start` → poll
  `scan/{id}/status` → retrieve the captured file. Reproduced, typed, in
  `services/imagingDevice.ts`.
- Convergence: a captured image is treated exactly like a manual upload. In our
  build both paths call the same `uploadImage` → `patient-documents`.
- Graceful offline messaging when the bridge is down.

**Rejected (architecture/security):**
- **Hardcoded `localhost:3001` + raw `fetch`** — replaced with an env-gated
  (`VITE_IMAGING_BRIDGE_URL`, default-off) boundary that is the *only* non-backend
  network caller and never hardcodes a host.
- **Direct browser → GCS storage, bypassing the PMS** — images never reached the
  backend, were outside tenant scoping/access control, and contradicted
  "backend is the source of truth / no permanent frontend-only solutions". We
  persist through `patient-documents` instead.
- **No Orval / no tenant scoping** — all backend access now goes through the
  generated client.
- **No image↔patient persistence in the PMS** — associations now live in
  `image-details` keyed to the stored document.

**Net:** the prototype was a useful device-acquisition spike; its persistence
layer was replaced with the backend-integrated path. The hardware bridge remains
a legitimate, isolated seam (a browser cannot talk to a USB sensor directly) and
is the subject of Gap 7.

---

## 3b. Phase 2 — Integrated imaging agent (Vatech)

The prototype's device-acquisition idea is now a **first-class, in-repo agent**
(`imaging-agent/`) — a single Python/FastAPI process replacing the prototype's
Node-service + spawned-Python-watcher + in-memory/S3 storage.

**What it does:** detects EzDent-i, deep-links a patient (`VTEzBridge /main:chart_no`),
watches the EzDent-i export folder for a freshly captured image (`watchdog`), and
streams the bytes back to the browser. **It never persists images** — the web app
stores them through `patient-documents` (the same path as a manual upload).

**Contract (v1, snake_case, loopback `127.0.0.1:8765`):** `GET /status`,
`POST /launch`, `POST /scan/start`, `GET /scan/{id}/status`, `GET /scan/{id}/image`.
Consumed only by [`imagingDevice.ts`](../../src/features/imaging/services/imagingDevice.ts).

**Web changes:**
- Runtime auto-detect (default loopback URL; `imagingDeviceEnabled` only gates
  hard-disable). Connection-refused → `unavailable` → first-time **setup card**;
  reachable-but-5xx → `error`; reachable → `idle` with version/vendor info.
- Two-tab workspace — **Scan & Capture** (status banner, "Open in imaging
  software", capture) and **Images** (existing gallery/viewer/tooth-association).
- `imagingDevice` gained `launchSoftware` + richer `checkStatus` (`DeviceStatusResult`).

**Security:** loopback-only bind, CORS allow-list, optional `X-DentC-Agent-Token`,
PHI temp files served once then deleted, no cloud credentials.

**Packaging (planned, Phase 4):** PyInstaller single signed `.exe` + per-user
auto-start + installer; see `imaging-agent/BUILD.md`. This satisfies the spirit of
**Gap 7** on the frontend side; a backend acquisition endpoint with modality/DICOM
metadata is still the long-term fix.

**Verified:** agent `/status`, scan/start → folder-watch capture → status →
image fetch → temp cleanup (served-once → 404), all live; web two-tab UI with
both `unavailable` (setup card) and `idle` (connected) states live at :5173.

## 4. Validation checklist (Phase 1)

- [x] Gallery lists patient images from the backend (no mock data).
- [x] Manual upload (JPG/PNG/TIFF/WebP, ≤10 MB) → `patient-documents`.
- [x] Category organization via `document_type` + client-side filter.
- [x] Tooth association + notes persisted to `image-details` (joined by `tile_id`).
- [x] Image viewer: zoom / pan / rotate / fit / fullscreen / download.
- [x] Delete removes binary + metadata row.
- [x] Device scan behind an env-gated boundary with graceful "unavailable" state.
- [ ] Thumbnails, signed URLs, view-audit, device persistence — **blocked on Gaps 4–7**.
