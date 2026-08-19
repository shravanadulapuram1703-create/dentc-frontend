# Letters — backend dev report

Module: **Letters (New)** — legacy Denticon print-menu → Letters dialog, Report Viewer,
"Save PDF file".
Frontend: `src/features/letters/**`, route `/patient/:patientId/letters`.
Verified live against the local backend (tenant 1) on 2026-08-18 with patient 83867.

---

## 1. What is already there (no work needed)

The backend covers this module better than most. All four resources exist and are seeded:

| Resource | Endpoint | State |
| --- | --- | --- |
| Letter catalog | `GET/POST/PATCH/DELETE /api/v1/letter-templates` (tag *Communications*) | **153 rows seeded**, real `body_html` |
| Per-office assignment | `GET/PUT /api/v1/offices/{office_id}/letter-templates` (tag *Office Assignment*) | endpoint works, **table empty** — see LTR-7 |
| Consent audit record | `GET/POST/PATCH/DELETE /api/v1/patient-consents` (tag *Patients*) | works; verified a real POST |
| Binary store | `GET/POST /api/v1/patient-documents` (tag *Patients*) | works; verified a real 92 KB PDF upload |

`letter_type` splits the catalog into the legacy "Letter Group" dropdown:

```
C 79  Patient Consent          I 23  Insurance & Treatment
F 17  Financial / Collection   E 13  Email Templates
S  8  Statements & Disclosures A  7  Appointment Letters
M  4  Marketing Letters        D  2  Referral Letters
```

Template bodies use `#TOKEN#` merge fields (56 distinct across the corpus) and a small
HTML subset (`br div strong u span ul ol li`), with `div.dvfrom` / `div.dvto` marking the
return- and recipient-address blocks that drive Envelope Printing.

**Verified end to end:** dialog → merge → preview → PDF → `POST /patient-documents`
(`document_type=consent-form`, id 27) → `POST /patient-consents` (id 1, `document_id=27`,
`status="printed"`, `rendered_html` retained).

---

## 2. Gaps

### LTR-1 — Consent PDFs are written to local disk, not `gs://reco-documents/consent-forms/` **(blocking for production)**

The practice keeps all consent forms in the cloud-storage bucket
**`reco-documents/consent-forms`**. `POST /api/v1/patient-documents` currently writes to
the app server's local filesystem and returns a server-relative path:

```json
{
  "id": 27,
  "document_type": "consent-form",
  "file_name": "a01-informed-consent-for-extraction-83867-2026-08-18.pdf",
  "file_url": "/uploads/patient_documents/83867/44b426dedc44432fa954015de19619ff.pdf"
}
```

Consequences: the PDFs do not survive a container restart on Cloud Run, they are not in
the bucket the practice actually reads, and nothing else in the estate can find them.

**Asks:**

1. Back `patient-documents` with GCS. Route `document_type=consent-form` to
   `gs://reco-documents/consent-forms/{tenant_id}/{patient_id}/{uuid}.pdf`; keep other
   document types on their existing prefix.
2. Return `file_url` as a **fully-qualified HTTPS URL** (signed URL, or a
   `GET /api/v1/patient-documents/{id}/content` proxy that streams the object with the
   caller's tenant/RBAC checks applied). The frontend must not hold bucket credentials
   and cannot address `gs://` from a browser.
3. Expose the bucket/prefix actually in use on the document row (e.g. `storage_bucket`,
   `storage_path`) so the UI can show provenance and so a migration of existing rows is
   auditable.
4. If blank consent-form masters already live in that bucket, add
   `GET /api/v1/consent-forms` (list the bucket's PDFs) — right now the letter catalog in
   `letter-templates` is the only source of consent content, and the two must not drift.

Until this lands the frontend sends the intended folder in `description`
(`"consent-forms/{template name}"`) so the mapping is recoverable.

### LTR-2 — `letter_type` codes have no `/definitions` group

`letter_type` is a bare single character (`A C D E F I M S`). There is no
`definition-groups` row that maps code → label, so the frontend hardcodes the eight group
names (`src/features/letters/lettersModel.ts`). **Ask:** seed a `LETTERTYPE` definition
group (`key1` = code, `description` = label) so Setup can rename/add groups.

### LTR-3 — Merge fields with no backend source

| Token(s) | Missing data | Current fallback |
| --- | --- | --- |
| `#PAT_PREF_PROV_Address/CITY/STATE/ZIP/PHONE#` | `ProviderRead` has no address or phone columns | the office's address/phone |
| `#MARKET_NAME/ADDRESS/CITY/STATE/ZIP/PHONE#` | no marketing/practice-address resource | the office block |
| `#OFFICE_CNAME#` | no corporate/DBA name on `OfficeRead` | `office.name` |

30 templates use the `#MARKET_*#` block and 10 use the provider letterhead block, so these
letters currently print the office address in place of the intended one.

### LTR-4 — `#TX_PLAN_TH_NUMBER#` has no context

One template interpolates a treatment-plan tooth number. The Letters dialog has no
treatment-plan or procedure context to bind it to; it renders blank and is listed in the
preview's "printed blank" warning. **Ask:** either drop the token from the template or
define how a letter is launched from a treatment plan.

### LTR-5 — No server-side render/merge/export endpoint

There is no `POST /api/v1/letter-templates/{id}/render`. Every letter is merged and
rendered to PDF in the browser (jsPDF, `src/features/letters/letterPdf.ts`). Two
consequences:

- The merge-field catalog is duplicated in the frontend and will drift from whatever the
  legacy engine did.
- **Batch letter runs are impossible.** Nine seeded templates are explicitly batch
  collection letters (`CS001…CS009 - Batch Coll N Letter`); running those over a
  collections queue needs a server-side job, not a per-patient click.

**Ask:** `POST /api/v1/letters/render` `{template_id, patient_id, options}` →
`{rendered_html, unresolved_tokens[]}`, plus a batch variant that takes a patient list and
returns a job id.

### LTR-6 — No aggregate letter-context endpoint

Building the merge context takes 2–6 round trips (`/patients/{id}`, `/offices/{id}`,
`/referrals`, `/appointments`, `/responsible-parties/{id}` or `/patients?responsible_party_id=`,
and `/patients/{id}/balance` for collection letters). The balance call alone is **~28 s
cold** (measured), so the frontend only issues it when the chosen template actually
contains `#RP_TOTAL_BAL#`. **Ask:** `GET /api/v1/patients/{id}/letter-context`.

### LTR-7 — Office ↔ letter-template assignment is unseeded

`GET /api/v1/offices/{id}/letter-templates` returns `[]` for **every** office checked
(1, 9). The dialog therefore falls back to the full tenant catalog and shows
"No letters are assigned to this office yet". **Ask:** seed the join from the legacy data,
or confirm that "unassigned = all" is the intended semantic.

### LTR-8 — Migrated `body_html` contains `?` mojibake

**21 of 153 templates** have curly quotes and apostrophes replaced by a literal `?`:

- `PC037`: `also known as ?bleaching?`
- `Post operative Letter`: `It?s been several months`, `We?re always here`

This prints on real patient-facing consent forms. **Ask:** re-run the migration with the
source encoding (cp1252 → utf-8), or repair in place. Affected: AP002, AP003, PC001,
PC012, PC027, CL022, CL024, IL003, OR003, OR004, OR005, OR007 and 9 more.

### LTR-9 — `channel` column polluted by the migration

```
L: 121   null: 17   D: 4
'policies': 9        'if needed please lea': 1        'or responsibilities ': 1
```

11 rows hold letter *body text* in `channel`, which means a field-offset error in the
importer — worth checking whether adjacent columns are shifted on those rows too.
Also: `title` is null on **103 of 153** rows, so only `name` is usable as a heading.

### LTR-10 — Consent signing is modelled but not implemented

`PatientConsentRead` carries `signature_data`, `signed_by`, `signed_at` and `status`, but
there is no endpoint to capture a signature, no defined `status` vocabulary, and no way to
attach a scanned wet-signed copy back to an existing consent row. The frontend writes
`status: "printed"` and leaves the signature fields null. **Ask:** publish the status enum
and add `POST /api/v1/patient-consents/{id}/sign` (base64 signature image or an uploaded
document id).

### LTR-11 — `created_at` is a naive timestamp that is actually UTC

`"created_at": "2026-08-19T02:05:11.828300"` — no `Z`, no offset. `new Date()` reads it as
local time, which dates a letter printed at 22:05 on the 18th as the 19th. The Letters
history pins it to UTC client-side (`fmt_stamp` in `LettersPage.tsx`). **Ask:** serialise
timezone-aware ISO-8601. This affects every module, not just Letters.

### LTR-12 — `/patient-documents` list has no filters or paging

`ListPatientDocumentsParams` is `{ patient_id }` only — no `document_type`, no `page`/
`size`, and the response is a bare array rather than the paginated envelope every other
list endpoint uses. The Letters history therefore fetches every document a patient has and
filters client-side. **Ask:** add `document_type` + standard paging, matching the rest of
the API.

---

## 3. Frontend notes for whoever picks this up

- `src/features/letters/mergeFields.ts` holds the **complete** 56-token catalog. Any token
  the backend adds must be registered there or it renders blank and is reported in the
  viewer's warning strip.
- Merged values are HTML-escaped and the preview is rebuilt from a whitelisted block
  structure (`letterHtml.blocks_to_html`), so a template row cannot inject markup into the
  app. Keep that property if the render moves server-side.
- jsPDF's built-in Helvetica is WinAnsi-only; `letterPdf.pdf_safe()` folds typographic
  punctuation to ASCII before drawing. Remove it only if a Unicode font gets embedded.
- Envelope Printing prepends a #10 landscape page (684 × 297 pt) built from the template's
  `dvfrom`/`dvto` blocks, falling back to the office/patient address.

---

# Addendum — backend response integrated (2026-08-19)

Answers received in [letters_backend_response.md](letters_backend_response.md); every
endpoint claimed there is live on the local backend and has been exercised. `openapi.json`
was re-fetched and the Orval client regenerated.

## Integration status

| ID | Backend | Frontend |
|----|---------|----------|
| LTR-1 | Object-store backed, `storage_backend/bucket/path`, `/content` proxy, `GET /consent-forms` | `description` no longer carries the folder hint; `file_url` used as-is when absolute, resolved against the API host when the row is local; a cloud-off marker flags `storage_backend === "local"` rows |
| LTR-2 | `LETTERTYPE` group seeded | Group labels + order come from `/definitions?group_code=LETTERTYPE`; the hardcoded table is now only the unseeded-tenant fallback |
| LTR-3 | Provider/office/marketing columns added | Nothing to do — the values arrive resolved |
| LTR-4 | Binds on `treatment_plan_id` | Treatment Plan picker, shown **only** for a template whose tokens include one flagged `requires_treatment_plan` |
| LTR-5 | `/letters/render`, `/render-batch`, `/merge-fields` | `/merge-fields` is the token catalog; see the note below on `/render` |
| LTR-6 | `/patients/{id}/letter-context` | **The single call** the dialog makes. `include_balance` passed only when the template uses a `requires_balance` token |
| LTR-7 | `/letter-templates/effective` | Dialog reads `/effective`; the local "unassigned = all" guess is gone |
| LTR-10 | Status vocabulary + `/patient-consents/{id}/sign` | New `ConsentSignDialog` — draw on screen, upload a scanned copy, verbal, decline (with reason) or void; history shows status, signer, method and date |
| LTR-11 | Offsets on every datetime | `fmt_stamp` deleted. Also fixed a latent bug in the shared `fmt_date`: its date-only regex was unanchored, so a timestamp took the "format from parts" path and printed the **UTC** calendar day. Anchored to `$` |
| LTR-12 | Filters + paginated envelope | Letters history queries `document_type` directly; the other three callers (`PatientDocuments`, `useImagingGallery`, `progressNotesService`) migrated to `{items, meta}` |

Also fixed, caused by the regen rather than by Letters: Orval swapped which schedule schema
carries the disambiguating prefix (office is now `AppSchemasOfficeSetupScheduleReplace` +
`ScheduleDayInput`, provider is `ScheduleReplace` + `AppSchemasProviderSetupScheduleDayInput`),
which broke `officeScheduleApi.ts` and the provider `SchedulesTab`.

### Why `/letters/render` is not the render path (yet) — see LTR-15

The dialog resolves values through `/letter-context` and does the placeholder
substitution client-side, rather than printing `render.rendered_html`. One reason:
`render` replaces an unresolved token with an empty string, so by the time the HTML comes
back `#DOC_LAST_NAME#` — which depends on the **Signing Provider chosen in the dialog**,
something the server cannot know — can no longer be filled. Every *value* still comes from
the backend catalog, so the drift you were guarding against is gone; only the substitution
mechanics are local, and `unknown_tokens` is computed against `/merge-fields` and shown in
the viewer.

## New gaps found while integrating

### LTR-13 — `#APPT_PRDR#` resolves blank when there is no *upcoming* appointment

`letter-context` returns `last_appointment` (with a valid `provider_id`) but leaves
`APPT_PRDR`, `APPT_DATE` and `APPT_DATETIME` in `unresolved_tokens`; only
`next_appointment_provider` feeds them. Reproduced on two patients:

```
GET /api/v1/patients/83867/letter-context
  last_appointment.provider_id = "prov-arjun-9"
  merge_fields.APPT_PRDR       = ""          ← blank

GET /api/v1/patients/83896/letter-context
  last_appointment.provider_id = "prov-23423-9"
  merge_fields.APPT_PRDR       = ""          ← blank
```

15 templates use `#APPT_PRDR#`, including the consent forms, so this prints

> "I Leo Rob hereby authorize and request that **Dr.**  and their assistants perform the
> specified teeth/tooth extraction(s)."

on a signed legal document. **Ask:** fall back to the last appointment's provider (and add
`last_appointment_provider` to the payload alongside `next_appointment_provider`). The
frontend fills this from `last_appointment.provider_id` today; that residual disappears
the moment the token stops arriving unresolved.

### LTR-14 — `#TODAY_DATE#` is the UTC date, not the office's

`letter-context.today` and `merge_fields.TODAY_DATE` are computed in UTC. Captured at
22:05 US-Eastern on 2026-08-18:

```
merge_fields.TODAY_DATE = "08/19/2026"     ← tomorrow, for the practice printing it
```

Every US practice is UTC-negative, so a consent form signed in the evening is dated the
next day for roughly a fifth of the working day. `offices.timezone` is already on the row
(`America/New_York` for office 108) — **ask:** compute `today` in the printing office's
timezone. The frontend currently overrides this token with the workstation's local date.

### LTR-15 — `/letters/render` cannot accept caller-supplied values

Add an `overrides: {token: value}` (or `signing_provider_id`) field to
`LetterRenderRequest`. With it, `rendered_html` becomes usable directly and the last of
the substitution logic leaves the frontend.

### LTR-16 — `/consent-forms` and `/patient-documents` are unverified against a real bucket

`GET /consent-forms` returns `{"items":[],"storage_bucket":null,"is_configured":false}`
locally because `GCS_BUCKET_DOCUMENTS` is unset, and uploads still land on local disk
(`file_url = /uploads/patient_documents/…`, `storage_backend = "local"`). The frontend
handles both shapes, but the **signed-URL path, the `/content` proxy and the consent-form
prefix have not been exercised end to end**. Someone needs to set the env vars in a
deployed environment and re-run: print a consent → Save to Chart → open the link.

## Still open from the original report

- **LTR-8 / LTR-9** need a human decision, not code. The repair script reports 27 rows
  repairable and 10 it refuses to touch; the 11 truncated `Financial Agreement` bodies
  need re-import from `LETTERS.txt`. Nothing has been applied. This is patient-facing
  legal copy — worth reading the `--show-diff` output before authorising `--apply`.
- **Batch letters (`CS001…CS009`)** — `/letters/render-batch` exists and is not wired to
  any screen. That belongs with a collections queue, not the per-patient dialog.

## Verified live (patient 83867, local backend)

- Group dropdown labelled and ordered from `LETTERTYPE` ("Financial / Collection (17)",
  "Insurance & Treatment (23)" — the backend's wording, not the fallback's).
- A01 consent rendered from `/letter-context`; `Dr. Arjun` present via the LTR-13
  residual; no blank and no unknown placeholders.
- Saved → `patient-documents` id 30 (`document_type=consent-form`) + `patient-consents`
  id 3.
- Signed on screen → `status="signed"`, `signature_method="drawn"`, `signed_by=1`,
  `signer_name="Rob, Leo"`, `signer_relationship="self"`, 18 KB PNG persisted; the row
  shows **Signed · Rob, Leo · Signed on screen · 08/19/2026** and loses its Sign action.
- Treatment Plan picker appears for `PC011 - Consent for Extraction` and for no other
  template.

---

# Addendum 2 — round-2 response received, NOT yet integrable (2026-08-19)

The round-2 answers for LTR-13…16 read correctly and the reasoning on LTR-13 (a consent is
printed at the chair, so the appointment that matters is the one in progress, stored as the
most recent past row) matches what the templates mean. **But none of it is deployed to any
backend this workspace can reach**, so it cannot be integrated or verified yet.

## Evidence — both reachable backends still serve the round-1 build

Local `http://127.0.0.1:8000` and the deployed
`https://dentc-backend-477406612596.us-central1.run.app` were both checked:

```
LetterRenderRequest properties   : template_id, patient_id, office_id, treatment_plan_id
                                   (no `overrides`, no `signing_provider_id`)
LetterContextResponse properties : … next_appointment_provider, last_appointment, …
                                   (no `last_appointment_provider`, no timezone field)
GET /api/v1/letters/merge-fields : 56 tokens, APPT_DATETIME absent
```

Behaviour on the LTR-13 reproduction patient is unchanged:

```
GET /api/v1/patients/83867/letter-context
  merge_fields.APPT_PRDR = ""        unresolved_tokens contains "APPT_PRDR"
  today                  = 2026-08-19   (no timezone reported)

POST /api/v1/letters/render {"template_id":114,"patient_id":83867,
                             "signing_provider_id":"prov-arjun-9",
                             "overrides":{"APPT_PRDR":"Dr. Arjun Mehta"}}
  → response has no applied_overrides / rejected_overrides (unknown keys silently dropped)
  → rendered_html still contains "request that Dr.  and their assistants perform"
```

**Ask:** deploy the round-2 build (at minimum to the local dev backend) and say so; the
integration below is a small, already-scoped change once the fields exist.

## What was changed now, so the deploy needs no second frontend change

`#TODAY_DATE#` was the one workaround that would *not* have retired itself: it was in an
unconditional override list, so it would have kept winning over the office-timezone date
that LTR-14 introduces — and the office's zone is more correct than the workstation's (a
remote biller's laptop is not in the practice's timezone).

It is now gated on a **version probe**: the presence of the timezone field that LTR-14 adds
to `letter-context` is taken as the marker that the server dates letters in the office's
zone, and the client override switches itself off. Several spellings are accepted
(`timezone`, `office_timezone`, `tz`, `today_timezone`) so the probe cannot be broken by a
naming choice — tell us the final name and it will be pinned to that one.

Exercised against both response shapes (`merge_letter` driven directly in the browser):

| Server response | `#TODAY_DATE#` printed | `#APPT_PRDR#` printed |
| --- | --- | --- |
| round-1 (`TODAY_DATE:"08/20/2026"` UTC, `APPT_PRDR:""`, no tz) | `08/19/2026` — client override | `Arjun` — client residual |
| round-2 (`TODAY_DATE:"08/18/2026"`, `APPT_PRDR:"Arjun Mehta"`, `timezone` present) | `08/18/2026` — **server wins** | `Arjun Mehta` — **server wins** |

The LTR-13 residuals (`APPT_PRDR`, `APPT_DATE`, `APPT_DATETIME`) already only fill tokens
the server returned empty, so they retire themselves with no gating.

## Answers to the two questions the response asked

**The third fallback (preferred provider) — keep it.** A blank doctor gets signed; a named
one gets read. But see LTR-17: it should be *visible* which tier produced the name.

**`signing_provider_id` re-pointing `#APPT_PRDR#`** — the semantics are right for the
common case but not for all of them, and this is a frontend decision, not a backend change.
The dialog's Signature Type can be Hygienist, Assistant or Office Manager; on an SRP or
surgical consent the countersigner is then *not* the doctor named in the body. The
integration will therefore send:

| Signature Type | Sent to `/letters/render` |
| --- | --- |
| Dentist | `signing_provider_id` — countersigner **is** the treating doctor |
| Hygienist / Assistant / Office Manager | `overrides: {"DOC_LAST_NAME": "…"}` only, so `#APPT_PRDR#` keeps the treating provider |
| Patient Only | neither |

No change needed on your side — both surfaces already support it.

## New gap

### LTR-17 — the appointment block should say which tier resolved it

With a three-tier fallback (next → last → preferred provider), `#APPT_PRDR#` can now name a
doctor who has no connection to the visit — for a patient with no appointment rows it is
simply the preferred provider. That is the right default, but the person at the chair has
no way to know which happened, and "caught at the chair" only works if it is visible.

**Ask:** report the tier used, e.g. `appointment_source: "next" | "last" | "preferred" | null`
on `letter-context` and `/letters/render` (or list such tokens in a `fallback_tokens` array
alongside `unresolved_tokens`). The preview would then show "provider taken from the
patient's preferred provider — no appointment on file" instead of silently printing a name.

## Also noted

`#APPT_DATETIME#` being added as a 57th, deliberately non-corpus token is fine — the
frontend classifies placeholders against whatever `/letters/merge-fields` returns, so the
catalog growing never produces a false "unrecognised placeholder" warning.
