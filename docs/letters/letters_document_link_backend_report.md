# Letters → Letter History → document link: `missing_token` + stored consent PDFs unreachable on Cloud Run

Date: 2026-09-12 · Reporter: frontend (dentc-frontend `feature/uat-realse-v2`) · Patient used: 83928 ("Off, check test")

## 1. Summary for the backend team

Two separate things sit behind "clicking the PDF name in Letter History shows
`{"error":{"code":"missing_token","message":"Missing bearer token"}}`":

| # | Where | Owner | Status |
|---|-------|-------|--------|
| A | The link navigated the browser straight to `/api/v1/patient-documents/{id}/content`, which requires the `Authorization` header a plain link cannot send. | Frontend | **Fixed** in commit `c808622` (Letters) and this change (claim attachments). Any build older than 2026-09-12 02:01 EDT still shows the error. |
| B | Every consent PDF row in the shared DB is `storage_backend: "local"`. The Cloud Run backend answers **404 `not_found` "Document 'N' content is not available"** for all of them even with a valid token, because the bytes were written to the local disk of whichever server handled the upload. | **Backend** | **Open — needs investigation (LTR-18 below).** |

A is why the user saw the JSON error. B means that after A is deployed, the same
link on the Cloud Run environment will still fail, only with a different message.

## 2. What the hyperlink is supposed to do

The Document column shows `file_name` from `GET /api/v1/patient-documents?patient_id=…&document_type=consent-form`.
Clicking it opens the stored PDF in a new tab, using `file_url` from that row. Per LTR-1 the
backend returns one of:

1. a short-lived **signed GCS URL** (absolute `https://storage.googleapis.com/…`) — opens as-is, no header; or
2. the **proxy path** `/api/v1/patient-documents/{id}/content` — needs `Authorization: Bearer …`
   (OpenAPI: `security: [{HTTPBearer: []}]`, plus `X-Tenant-ID`).

Today every row is case 2, so the frontend must fetch the bytes through the authenticated
axios client and hand the browser a blob URL (`src/services/documentAccess.ts` → `openAsset`).
A bare `<a href={file_url} target="_blank">` cannot attach the header → `401 missing_token`.

## 3. Evidence (all probes run 2026-09-12, `admin` login)

### 3a. Local backend `http://127.0.0.1:8000` — works with a token

```bash
# no header → the error the user sees
curl -s http://127.0.0.1:8000/api/v1/patient-documents/69/content
# {"error":{"code":"missing_token","message":"Missing bearer token","details":null}}

# with header → the PDF streams
curl -s -o doc69.pdf -w "%{http_code} %{content_type} %{size_download}\n" \
  -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8000/api/v1/patient-documents/69/content
# 200 application/pdf 93126
# content-disposition: inline; filename="a01-informed-consent-for-extraction-83928-2026-09-12.pdf"
```

Rows for patient 83928 (`GET /patient-documents?patient_id=83928&document_type=consent-form`):

| id | file_name | storage_backend | file_url (local backend) | file_url (Cloud Run) |
|----|-----------|-----------------|--------------------------|----------------------|
| 64–69 | a01-… / a07-…-83928-2026-09-12.pdf | `local` | `https://dentc-backend-477406612596.us-central1.run.app/api/v1/patient-documents/{id}/content` | `/api/v1/patient-documents/{id}/content` |

Also: `mime_type: null` and `file_path: null` on every `PatientDocumentRead`.

### 3b. Cloud Run backend — same rows, bytes are NOT available

```bash
curl -s -o cr69.bin -w "%{http_code}\n" -H "Authorization: Bearer $CLOUD_TOKEN" \
  https://dentc-backend-477406612596.us-central1.run.app/api/v1/patient-documents/69/content
# 404  {"error":{"code":"not_found","message":"Document '69' content is not available","details":null}}
# doc 64 → identical 404
```

`GET /patient-documents?document_type=consent-form&size=200` on Cloud Run:
**total 20, storage_backend counts: {"local": 20}** — not a single bucket-backed row.

Both backends return the same document ids (64–70), i.e. they share one database, but the
PDF bytes only exist on the disk of the process that received the upload.

## 4. Backend items to investigate

### LTR-18 — consent PDFs are on local disk, not in the documents bucket (BLOCKER for Cloud Run)

- LTR-1 said `document_type=consent-form` uploads route to `gs://reco-documents/consent-forms/{tenant}/{patient}/{uuid}.pdf`
  once `GCS_BUCKET_DOCUMENTS` is configured. On both backends the rows come back `storage_backend: "local"`.
- Please check: is `GCS_BUCKET_DOCUMENTS` (or whatever gates the bucket path) set on the Cloud Run
  service? Does the service account have `storage.objects.create/get`? Is the local fallback being
  taken silently on a bucket error (a warning-level log would be enough to tell)?
- Cloud Run's filesystem is ephemeral and per-instance: anything written there is lost on
  redeploy / scale-to-zero, and a second instance never sees it. The upload should fail loudly
  or go to the bucket; a silent local fallback in that environment stores nothing recoverable.
- Existing 20 `local` rows: decide whether to backfill (copy the bytes to the bucket from the
  machine that has them, where that is still possible) or mark them so the API returns a
  clear `storage_backend`/`is_available` flag rather than a 404 on read.

### LTR-19 — `file_url` for the proxy path is absolutised inconsistently

- Local backend: `https://dentc-backend-477406612596.us-central1.run.app/api/v1/patient-documents/69/content`
  (its own `PUBLIC_API_BASE_URL` points at Cloud Run, so a local row advertises a host that
  cannot serve it).
- Cloud Run: `/api/v1/patient-documents/69/content` (relative).
- The frontend keys off the **path** (`/api/…` ⇒ authenticated fetch against its own API base),
  so this is not breaking, but one shape would be less surprising. Relative is preferred: the
  token is only valid at the host the client is configured against.

### LTR-20 — `PatientDocumentRead.mime_type` / `file_path` are always `null`

The stream endpoint sets `content-type: application/pdf` correctly, so the frontend does not
depend on this today; flagging so the read model does not advertise fields it never fills.

### Optional (nice-to-have, not required by the frontend)

A `?token=` / signed variant of the `/content` proxy (or always returning a signed bucket URL
once LTR-18 is fixed) would let plain `<a href>` / `<img src>` usages work without the blob
detour. The frontend already handles both shapes, so this is purely a convenience.

## 5. Frontend changes (for reference)

- `src/features/letters/LettersPage.tsx` — Document name is a button that calls `openAsset(file_url)`
  (commit `c808622`, 2026-09-12). Verified on `:5173` against the local backend: click →
  `GET /api/v1/patient-documents/69/content` **200** with the bearer header → PDF opens in a new tab.
- `src/components/patient/ClaimDetail.tsx` — claim attachments used the same raw
  `<a href={file_url} target="_blank">`; now routed through `openAsset` as well
  (`/insurance-claims/{id}/attachments/{id}/content` is also bearer-protected).
- Reproduce the *old* behaviour only on a stale build: `dist/` in this repo is dated 2026-09-01 and
  any Cloud Run frontend image built before 2026-09-12 predates the fix. Rebuild/redeploy
  (`gcloud builds submit --config cloudbuild.yaml …`).
