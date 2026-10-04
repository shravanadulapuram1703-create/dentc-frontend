# Patient Photo (take / upload) — Backend Dev Report

**Date:** 2026-10-03 · **Module:** Patient shell header + Patient Overview "Photo" box · **Parent gap:** PO-10

## 1. What shipped (frontend)

Staff can now take a patient's picture with a desktop webcam or an iPad / Android tablet camera,
or upload an existing image, and it becomes the patient's photo wherever the generic person
icon used to be:

- **Patient header avatar** (expanded and minimized header) — `src/components/PatientShellLayout.tsx`
- **Patient Overview → Patient Information → Photo box** — `src/features/patient-overview/panels/PatientInformationPanel.tsx`

Click either one → **Patient Photo** dialog (`src/features/patient-photo/`):

| Mode | Behaviour |
|------|-----------|
| **Take Photo** | Live camera via `getUserMedia` with a face guide; **Switch** front/rear camera when the device has more than one (tablets default to the rear camera, desktops to the webcam); Capture → Retake / Save. |
| **Fallback** | Live camera needs https or localhost. When it is blocked (permission denied, plain-http LAN on a tablet, no camera), **Use device camera** opens the tablet's native camera app via `<input type="file" capture>`. |
| **Upload** | Any image file (JPG/PNG/WEBP/HEIC on Safari, max 25 MB source). |
| **Remove photo** | Unlinks the photo from the patient. |

Every image is center-cropped to a square and re-encoded client-side as a **640×640 JPEG
(~15–100 KB)**, so a 10 MB tablet photo never reaches the server.

### Wire protocol (works today, no backend change needed)

```
1. POST  /api/v1/patient-documents        multipart: file, patient_id, office_id (posting office),
                                           document_type=PH ("Patient Photo"), description="Patient photo"
2. PATCH /api/v1/patients/{id}             { "photo_document_id": <new doc id> }
   Remove:                                 { "photo_document_id": null }
3. GET   /api/v1/patient-documents/{id}/content   (bearer-auth blob; cached once in react-query,
                                                    shared by header + Overview)
```

Verified live on local dev (patient 83938): doc 95 created as `PH`, `image/jpeg`, 14,896 bytes,
`office_id=1`; `photo_document_id` set to 95, then cleared to `null` by Remove. No console errors.

---

## 2. Backend gaps

| ID | Gap | Impact | Ask | Priority |
|----|-----|--------|-----|----------|
| **PHOTO-BE-1** | No atomic photo endpoint — save is two calls (upload doc, then PATCH patient) | If the PATCH fails after the upload succeeds, an orphan `PH` document is left behind and the patient keeps the old photo. | `PUT /api/v1/patients/{id}/photo` (multipart, returns `PatientRead`) + `DELETE /api/v1/patients/{id}/photo`, mirroring the existing `POST/DELETE /users/me/photo` (MP-2). | Medium |
| **PHOTO-BE-2** | `PATCH /patients/{id}` doesn't validate `photo_document_id` | FK check only: it accepts another patient's document, a PDF, or a soft-deleted row. A wrong id would show the wrong person's face / a broken image in the chart header. | On write, require the document to belong to the same patient + tenant, `is_deleted = false`, and `content_type` `image/*`; else `422 invalid_photo_document`. | **High** (PHI) |
| **PHOTO-BE-3** | No `photo` upload `context` | `DOCUMENT_CONTEXTS = ("note",)`; any other value 422s, so photos land in `documents/general/…` mixed with scans and letters. | Add `CONTEXT_PHOTO = "photo"` → `GCS_PHOTOS_PREFIX` (e.g. `documents/photos/`), and list it in `GET /patient-documents/limits.allowed_contexts`. FE will send `context=photo` as soon as it appears there. | Low |
| **PHOTO-BE-4** | Replaced photos pile up in Documents | Each retake creates a new `PH` row; the previous one is not soft-deleted and still appears in the patient's Documents list. FE deliberately does not delete it (history is a user decision). | Either soft-delete the previous photo doc when `photo_document_id` changes (in the PHOTO-BE-1 endpoint), or add `exclude_document_type` / an `is_profile_photo` flag so Documents can hide superseded photos. Product decision needed: keep photo history or not. | Low |
| **PHOTO-BE-5** | Printed Overview skips cloud-stored photos (PRINT-10 follow-up) | `print_service._photo_path` only embeds photos with `storage_backend = local`; in GCS-backed environments (Cloud Run) the PDF header has no photo. | Fetch the (small, ≤100 KB) object from the bucket for the report header, or store a thumbnail locally/inline. | Medium |
| **PHOTO-BE-6** | `GET /patient-documents/{id}/content` sends no cache headers | The photo is re-downloaded on every chart open / tab refresh. FE caches per session only. | `Cache-Control: private, max-age=86400` + `ETag` (documents are immutable — a new photo is a new id). | Low |
| **PHOTO-BE-7** | No thumbnail / photo URL on list feeds | `PatientRead` + scheduler feed carry `photo_document_id`, but showing faces in patient search results or on appointment cards would mean one authenticated blob fetch per row. | Optional `photo_url` (short-lived signed URL) or `GET /patients/{id}/photo?size=64` thumbnail endpoint. Not needed for the current screens. | Low |
| **PHOTO-BE-8** | No audit trail entry for photo changes | Changing a patient's identifying photo is a PHI-relevant edit; only `modified_by` on the patient row changes. | Record photo set/cleared in the patient change log (old → new document id, user, timestamp). | Low |

### Not a backend gap (deployment note)

- **Live camera needs HTTPS.** Browsers only allow `getUserMedia` on `https://` or `localhost`. UAT/prod
  are HTTPS, so tablets get the live camera there. On a plain-http LAN address the dialog falls back to the
  tablet's native camera app automatically.
- The `document_type` definitions group already has **`PH` = Patient Photo** seeded — no data change needed.

---

## 3. Suggested order

1. **PHOTO-BE-2** (validation — prevents a wrong face on the wrong chart).
2. **PHOTO-BE-1** (atomic endpoint; fold PHOTO-BE-4 and PHOTO-BE-8 into it).
3. **PHOTO-BE-5** (print in cloud environments).
4. PHOTO-BE-3 / 6 / 7 as housekeeping.
