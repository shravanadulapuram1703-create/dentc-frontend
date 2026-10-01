# Patient Medical History — backend gap report

**Module:** Patient Medical History (`/patient/:patientId/medical-history`)
**Legacy screen:** Denticon "Patient Medical History" — Medical Alerts · Dental Questionnaire ·
Medical Questionnaire · Signature, plus the `***Copy Medical History***` picker.
**Frontend status:** shipped and live-verified against the local backend (`:8000`).
**Date:** 2026-08-29 · **updated 2026-09-10** (Created / Modified stamps + change log — MH-17..MH-22, MH-8 revisited)

---

## 0. What the frontend now does

One screen owns all four legacy tabs. Before it existed, medical alerts and the questionnaires
could only be entered while *registering* a patient — anything skipped at intake could never be
filled in afterwards, from anywhere in the app.

| Tab | Backend resource | Verb usage |
|---|---|---|
| Medical Alerts | `/api/v1/patient-medical-alerts` | list / create / update / delete per row |
| Dental Questionnaire | `/api/v1/patient-questionnaire-responses` (`questionnaire_type=dental`) | list / create / update / delete per row |
| Medical Questionnaire | same resource (`questionnaire_type=medical`) | as above |
| — Emergency Contact block | `/api/v1/patient-emergency-contacts` | mirrored (see MH-11) |
| Signature | `/api/v1/patient-signatures` | list / create |
| Header strip | `/api/v1/patients/{id}/overview` | single aggregate read |
| Catalogs | `/api/v1/definition-groups` + `/api/v1/definitions` | see MH-1 |

Answers are reconciled by row id: answered rows are created or patched, rows reset to **Not
Answered** are deleted. Repeated saves are idempotent.

**Added 2026-09-10 — Created / Modified stamps and change log.** The legacy header prints when the
history was created and last modified, and by whom. The backend already stamps every row
(`created_at` / `created_by(_name)` on insert; `updated_at` / `updated_by(_name)` on PATCH **and** on
the soft DELETE), so the screen now:

- prints **Created** (earliest row) and **Modified** (latest write, removals included) in the header
  strip, plus a per-section table and a row-level **Change Log** panel — every value is the server's
  own stamp, the client never writes a timestamp;
- reads the soft-deleted rows too (`is_active=false`, sorted by `updated_at desc`), because a
  cleared answer is often the most recent modification and the active list cannot see it;
- **diffs before PATCHing**: an unchanged answer is no longer re-sent on Save. The backend bumps
  `updated_at` / `updated_by` on a no-op PATCH (MH-20), so the old "PATCH everything" save would have
  re-stamped all 88 alerts as "modified now" every time anyone pressed Save. Live check: toggling one
  alert on a fully answered chart now sends **1** PATCH instead of 88.
- re-reads the stamps after a save that wrote anything (`changed` flag or a signature), so the
  header shows the server's clock and user, not a guess.

**Everything below was reproduced against the running backend, not inferred from the schema.**

---

## Priority 1 — clinical-record integrity

### MH-6 · A signature is not linked to what was signed  🔴 **highest priority**

`patient_signatures` rows carry only:

```
patient_id, legacy_id, signature_data, signature_len, device_source,
is_user_sig, created_by, id, created_at
```

*(verified: `GET /api/v1/patient-signatures?patient_id=83867`)*

There is **no reference to the medical-history content that was signed** — no version id, no
snapshot hash, no "answers as of" timestamp. A patient can sign, staff can then change any answer,
and nothing in the data records that the signature predates the change. For a medical history —
a legal record used to justify treatment decisions — this is the gap that matters most.

There is also no `signature_type`, so a medical-history signature, a consent signature and a
financial-policy signature are indistinguishable rows on the same patient.

**Asks**
1. Add a signable snapshot: either version the medical history and store
   `medical_history_version_id` on the signature, or store a content hash + `signed_at`.
2. Add `signature_type` (`medical_history` | `consent` | `financial` | …).
3. Add `signed_by_user_id` distinct from `created_by` (who operated the pad vs who is attesting).

### MH-8 · No audit trail on answers  — ✅ partly resolved 2026-09-10

`patient_medical_alerts` and `patient_questionnaire_responses` both expose `created_by` and
`updated_at`, but **no `updated_by`** *(verified — see key lists in §Appendix)*, and no history.
Legacy prints "Modified By / Modified On" on this screen; we can render the timestamp but have to
leave the person blank.

**Ask:** `updated_by` on both resources, and ideally an append-only change log — for a medical
record, "who changed this answer and when" should be answerable.

**Re-verified 2026-09-10:** both resources now return `updated_by`, `updated_by_name`,
`created_by_name` and `answered_at`; PATCH sets `updated_by = 1 / "Admin User"`, and the soft
DELETE stamps `updated_at` / `updated_by` as well. The header stamps and "Modified By" are live.
What is still missing is the *history* (only the latest write per row survives) — tracked as
**MH-19** below.

### MH-16 · No "when was this questionnaire last completed"

`patient_questionnaire_responses` timestamps each *row*, not each *completion*. Practices
re-verify medical history at recall intervals; there is no field that says "the patient reviewed
and confirmed this on DD/MM/YYYY". Row `updated_at` is not the same thing — editing one answer
does not mean the whole form was reviewed.

**Ask:** a per-patient, per-questionnaire `last_completed_at` / `last_reviewed_by`, or fold it
into the versioning from MH-6.

---

## Priority 1b — Created / Modified stamps & change log (added 2026-09-10)

All reproduced live on 2026-09-10 against `:8000` (tenant 1, `admin`).

### MH-17 · Row timestamps are serialised as naive UTC (no `Z`)

```jsonc
// GET /api/v1/patient-medical-alerts?patient_id=83927   (row 352)
"created_at": "2026-09-09T23:59:16.527087",   // no designator — but it IS UTC
"answered_at": "2026-09-09T23:59:16.690461"
// GET /api/v1/audit-logs                                  (row 3885)
"created_at": "2026-09-10T21:39:37.574353Z"   // same backend, designator present
```

`new Date("2026-09-09T23:59:16")` is parsed as **local** time by every browser, so a naive value
displays hours off (7:59 PM EDT would print as 11:59 PM). The screen pins naive values to UTC
before parsing (`parseServerDateTime` in `src/utils/datetime.ts`), but every other client has to
know to do the same. Same defect as PN-10 in the Progress Notes report.

**Ask:** serialise every `datetime` as timezone-aware ISO-8601 (`…Z` or `+00:00`), consistently
with `/audit-logs`.

### MH-18 · No patient-level "medical history" record → stamps are derived client-side

There is no row that says *this patient's medical history was created on X by Y and last modified
on Z by W*. The header stamps are computed as `min(created_at)` / `max(updated_at ?? created_at)`
across four resources, which costs:

| When | Calls (per patient) |
|---|---|
| open screen | 2 active lists + 2 inactive lists + signatures (+ emergency contacts, catalogs) |
| after a save that wrote anything | 5 list calls to re-read the stamps |

The inactive lists are capped at one page (`size=200`), so a chart with more than 200 cleared
answers would lose the oldest removals from the stamp/log. Acceptable today; not a design.

**Ask (pick one):**
1. `GET /api/v1/patients/{id}/medical-history/audit` →
   `{ overall: {created_at, created_by_name, updated_at, updated_by_name}, sections: { alerts: {…},
   dental: {…}, medical: {…}, signature: {…} } }`; or
2. add the same block to `GET /patients/{id}/overview`, which the header already reads.

Either one should also carry `last_reviewed_at` / `last_reviewed_by` (MH-16) — the two asks are
the same table.

### MH-19 · Only the latest write per row survives — no before/after, no history

A row keeps one `updated_at` / `updated_by`. After a second edit the first one is gone, and the
*previous value* is never stored, so the change log can say "Codeine changed to YES on 09/10 by
Admin User" but never "from NO". Intermediate edits are unrecoverable.

`/api/v1/audit-logs` does not fill the gap:

```jsonc
// POST creates have no resource id, so a create cannot be tied to a patient or a row
{"action":"POST","resource_type":"patient-medical-alerts","resource_id":null,"details":null, …}
// PATCH / DELETE carry the row id but no payload, no patient_id, no before/after
{"action":"PATCH","resource_type":"patient-medical-alerts","resource_id":"353","details":null, …}
```

and the endpoint is **admin-only** with no `patient_id` filter, so a front-desk user (or the
screen) cannot list "everything that happened to this chart".

**Ask:**
1. Persist `details` on mutating audit entries: at least `{patient_id, row_id, before, after}`.
2. Set `resource_id` on POST from the 201 body's `id`.
3. A patient-scoped, non-admin read: `GET /patients/{id}/audit-logs?resource_type=…`, or a
   `history` sub-resource on each answer row.

### MH-20 · A no-op PATCH re-stamps `updated_at` / `updated_by`

```http
PATCH /api/v1/patient-questionnaire-responses/17   {"answer": "Dr Parity"}   // identical value
→ 200  "updated_at": "2026-09-10T21:39:35.655488", "updated_by": 1          // was null before
```

Nothing changed, yet the row now reads "modified by Admin User on 09/10". The screen diffs before
sending (see §0), but any other writer — the register composite, a future import, the mobile
intake — will corrupt the stamps the same way.

**Ask:** compare incoming fields with stored values and skip the stamp (and ideally the UPDATE)
when nothing differs.

### MH-21 · `answered_at` is never set on questionnaire responses

`patient_medical_alerts` sets `answered_at` on create and PATCH; `patient_questionnaire_responses`
exposes the same field but it is `null` after both:

```jsonc
// rows 17 / 18 after PATCH on 2026-09-10
"answered_at": null, "updated_at": "2026-09-10T21:39:35.655488"
```

**Ask:** set `answered_at` on create and whenever `answer` changes, as the alerts resource does.

### MH-22 · PATCH latency (observation)

From the browser, `PATCH /patient-medical-alerts/268` took ~15 s to return 200 (the GETs around it
returned in < 1 s; the same PATCH via curl a few minutes earlier took ~1 s). Not reproduced
consistently, so no root cause is claimed here — but the same pattern is on record for
`/offices` PATCH (~30 s) in the Phone Assignments report. Worth a look at what the update path awaits
(audit middleware? outbound HTTP?).

---

## Priority 2 — the API shape forces N+1 traffic

### MH-2 · No composite read

Opening the screen currently costs, at minimum:

- `GET /patient-medical-alerts?patient_id=…`
- `GET /patient-questionnaire-responses?patient_id=…`
- `GET /patient-signatures?patient_id=…`
- `GET /patient-emergency-contacts?patient_id=…`
- `GET /patients/{id}/overview` (header strip)
- `GET /definition-groups?size=200` **× 3** (once per catalog type)
- `GET /definitions?group_code=…` **× N**, sequential, one per group

**Ask:** `GET /api/v1/patients/{id}/medical-history` returning alerts + both questionnaires +
signatures + the resolved catalogs in one payload. `/patients/{id}/overview` already proves this
shape works well.

### MH-3 · No composite write — "No to all alerts" is up to 88 HTTP requests

Legacy's **NO TO ALL ALERTS** button sets every unanswered row to No. With the ~88-item legacy
catalog and an empty patient, that is 88 sequential `POST /patient-medical-alerts` calls on Save.
Browsers cap ~6 connections per host, and this backend already saturates that (the Patient
Overview's per-member enrichment competes for the same pool), so the save visibly crawls.

**Ask:** `PUT /api/v1/patients/{id}/medical-history` accepting the whole document
(alerts[] + questionnaire_responses[] + comments) and reconciling server-side in one transaction.
This also removes the risk of a half-saved medical history when the tab is closed mid-save —
today each row is its own transaction.

### MH-4 · No server-side copy for "Copy Medical History"

Legacy's `***Copy Medical History***` picker is implemented client-side: read the source
patient's rows, then write them onto the target one row at a time. That means copying a fully
answered history is ~90 reads followed by ~90 writes from the browser, it is not atomic, and
nothing server-side records that chart B's history was copied from chart A.

**Ask:** `POST /api/v1/patients/{id}/medical-history/copy-from/{source_patient_id}`
with a `scope` of `all | alerts | dental | medical`, returning the new document, and writing an
audit entry naming the source patient. Copying medical answers between charts is exactly the kind
of operation that should be attributable.

---

## Priority 3 — data model / seeding

### MH-1 · Alert & questionnaire catalogs are not seeded

`GET /definition-groups` returns only stray test rows for all three types *(verified)*:

| group_code | group_type | description |
|---|---|---|
| `MEDALERT_TEST` | `MEDALERT` | "Test" |
| `DENTQUEST_TEST` | `DENTQUEST` | "test" |
| `MEDQUEST_TEST` | `MEDQUEST` | "test" |

Each holds fewer than 10 definitions, so the frontend rejects them (a `MIN_TENANT_CATALOG_ITEMS`
guard, or a single test row would replace ~90 real alerts) and renders the verbatim legacy
catalog from `src/features/add-patient/legacyCatalogs.ts` instead. The screen shows an
informational banner saying so.

**Consequence to resolve before go-live:** answers are keyed by a code the *frontend* derives
from the label (`toCode("Latex Rubber") → "latex_rubber"`). When the catalogs are finally seeded,
the seeded `key1` values **must match those derived codes**, or every already-answered row
silently orphans.

**Asks**
1. Seed `MEDALERT` / `DENTQUEST` / `MEDQUEST` from the legacy list (the frontend file is a
   verbatim transcription and can be handed over as the source of truth).
2. Use the same `toCode(label)` convention for `key1`, or tell us the codes you will use so we
   can migrate the existing rows.
3. `key2` carries the input kind (`text` | `date` | `textarea`, else Yes/No) — please keep it.

### MH-5 · `response = "unknown"` has no defined meaning

The enum is `yes | no | unknown`, but legacy models three states as **NO / NOT ANSWERED / YES**
and "not answered" is naturally the *absence* of a row. The frontend therefore never writes
`unknown`, and deletes the row when the user resets to Not Answered.

**Ask:** confirm whether `unknown` is meant to be an explicit third answer (in which case
"not answered" needs to stop being modelled as absence, so the two are distinguishable) or is
vestigial and can be dropped.

### MH-13 · "Additional Comments" is stored as a magic alert row

The Medical Alerts tab has a 100-character comments box with nowhere to live, so both this screen
and the Add-Patient wizard write it as an alert row with the reserved code
`ADDITIONAL_COMMENTS`. It is a convention shared by two modules with nothing enforcing it, and it
pollutes the alert list for any other consumer.

**Ask:** a first-class `comments` field on the medical-history document (or on a per-patient
medical-history header row).

### MH-14 · An answered patient alert cannot drive a flash alert or block charges

Three overlapping concepts exist and none of them connect:

| Resource | Has `blocks_charges` | Has `is_flash_alert` | Is a patient's answer |
|---|---|---|---|
| `patient_medical_alerts` | ✗ | ✗ | ✓ |
| `patient_alerts` | ✓ | ✗ | ✓ (free-text `alert`) |
| `definitions` (Setup catalog) | — | ✓ | ✗ (it is the catalog) |

So a patient answering **Yes** to "Latex Rubber" produces a row that no scheduler popover or
charge gate can act on, even though the Setup catalog can mark that alert as a flash alert.

**Ask:** either surface the catalog's `is_flash_alert` / `blocks_charges` on the patient's
answered rows, or have the backend propagate a Yes answer into `patient_alerts`.

### MH-11 · Emergency contact is stored in two places

The legacy Medical Questionnaire includes an Emergency Contact block, and there is also a real
`patient_emergency_contacts` resource that the rest of the app reads. The frontend currently
writes both and prefers the real resource on read, to stop the two drifting.

**Ask:** decide which is authoritative. Our preference: keep `patient_emergency_contacts`, and
drop those three questions from the questionnaire catalog.

### MH-12 · Nothing enforces contradictory alerts

"No Known Allergies = Yes" alongside "Penicillin = Yes", or "No Change Since Last Recorded = Yes"
alongside edits, are both storable. Legacy relies on the same honour system, so this is a
"worth knowing" rather than a regression — but a validation rule server-side would be safer than
each client re-implementing it.

---

## Priority 4 — patient search (blocks the Copy picker)

### MH-9 · `GET /patients?search=` has no relevance ranking  ⚠️ **verified reproduction**

Searching for the patient **`Rob, Leo` (id 83867)** by the term `Rob`:

```
GET /api/v1/patients?search=Rob&size=25&sort=last_name&order=asc
→ Abel, Robert #54553 · Aber, Robert #25122 · ABES, ROBIN #30446 · Abraham, Robert #69750 · …
→ does NOT contain #83867 within the first 50 results
```

The search matches hundreds of `Robert*` surnames and pages them alphabetically, so an exact
surname match is unreachable through any picker a user would tolerate. The Copy dialog had to
work around this on the client: bare numbers are resolved with a direct `GET /patients/{id}`,
`"Last, First"` input is split and re-filtered, and exact filters are merged ahead of name hits.

**Asks**
1. Rank results — exact `last_name` / `first_name` matches before substring matches.
2. Extend `search` to cover `chart_no`, `phone` and `cell_phone` (staff search by all three).

### MH-10 · The `phone` filter ignores `cell_phone`

```
Patient 83867: phone = null, cell_phone = "9092221234"
GET /api/v1/patients?phone=9092221234  →  0 results   (verified)
```

Most patients in this dataset have only a cell number, so the `phone` filter is close to useless
for lookup.

**Ask:** have `phone` match `phone` OR `cell_phone` OR `work_phone`, or add a `any_phone` filter.

---

## Priority 5 — nice to have

### MH-7 · Signatures are append-only with no supersede

There is no way to void or supersede a signature, and `PatientSignatureRead` has no `updated_at`.
The frontend takes "newest row of each `is_user_sig` value wins". A cleared signature therefore
cannot be represented at all.

**Ask:** an `is_active` / `superseded_by` field, consistent with the soft-delete pattern used
elsewhere in this API.

### MH-15 · No print/PDF endpoint

Legacy has a printer icon on this screen that renders the full medical history form. We can
generate it client-side (as done for Perio and Treatment Plans), but a server-rendered PDF would
be consistent for signed clinical records — and would be the natural place to embed the signature
snapshot from MH-6.

---

## Appendix — verified field lists

Captured live from the running backend on 2026-08-29.

```jsonc
// GET /api/v1/patient-medical-alerts?patient_id=83867
["id","tenant_id","patient_id","alert_code","alert_label","response",
 "comments","is_active","created_by","created_at","updated_at"]
// → no updated_by, no is_flash_alert, no blocks_charges

// GET /api/v1/patient-questionnaire-responses?patient_id=83867
["tenant_id","patient_id","questionnaire_type","question_code","question_text",
 "answer","is_active","created_by","id","created_at","updated_at"]
// → no updated_by, no answered_at / last_completed_at

// ── Re-captured 2026-09-10 ──
// GET /api/v1/patient-medical-alerts?patient_id=83927   (row 352)
["id","tenant_id","patient_id","alert_code","alert_label","response","comments",
 "answered_at","is_active","section","is_flash_alert","blocks_charges",
 "created_by","created_by_name","updated_by","updated_by_name","created_at","updated_at"]
// GET /api/v1/patient-questionnaire-responses?patient_id=83912   (row 17)
["id","tenant_id","patient_id","questionnaire_type","question_code","question_text","answer",
 "answered_at","is_active","created_by","created_by_name","updated_by","updated_by_name",
 "created_at","updated_at"]
// → updated_by(_name) present (MH-8 ✅); answered_at present but always null here (MH-21);
//   timestamps naive UTC (MH-17). DELETE is soft: is_active=false + updated_at/by stamped.

// GET /api/v1/patient-signatures?patient_id=83867
["patient_id","legacy_id","signature_data","signature_len","device_source",
 "is_user_sig","created_by","id","created_at"]
// → no signed_at, no signature_type, no link to the signed content, no updated_at
```

---

## Summary

| # | Gap | Priority | Verified |
|---|---|---|---|
| MH-6 | Signature not linked to the answers it signed | 🔴 P1 | ✓ |
| MH-8 | No `updated_by` / change history on answers — `updated_by` ✅ since 09-10, history → MH-19 | 🟠 P1 | ✓ |
| MH-17 | Row timestamps serialised as naive UTC (no `Z`) | 🟠 P1 | ✓ |
| MH-18 | No patient-level history record → Created/Modified derived client-side (5 GETs) | 🟠 P1 | ✓ |
| MH-19 | Only latest write per row; audit-logs have no details/patient link, admin-only | 🔴 P1 | ✓ |
| MH-20 | No-op PATCH re-stamps `updated_at` / `updated_by` | 🟡 P1 | ✓ |
| MH-21 | `answered_at` never set on questionnaire responses | 🟡 P3 | ✓ |
| MH-22 | PATCH latency ~15 s observed from browser | 🔵 obs | partial |
| MH-16 | No "questionnaire last completed" timestamp | 🟠 P1 | ✓ |
| MH-2 | No composite read (N+1 on every open) | 🟠 P2 | ✓ |
| MH-3 | No composite write (up to 88 POSTs per save) | 🟠 P2 | ✓ |
| MH-4 | No server-side Copy Medical History | 🟠 P2 | ✓ |
| MH-1 | MEDALERT/DENTQUEST/MEDQUEST catalogs unseeded | 🟡 P3 | ✓ |
| MH-5 | `response = "unknown"` undefined | 🟡 P3 | ✓ |
| MH-13 | Comments stored as a magic alert row | 🟡 P3 | ✓ |
| MH-14 | Answers can't drive flash alerts / charge blocks | 🟡 P3 | ✓ |
| MH-11 | Emergency contact duplicated | 🟡 P3 | ✓ |
| MH-12 | Contradictory alerts not validated | 🔵 P3 | ✓ |
| MH-9 | Patient search has no relevance ranking | 🟠 P4 | ✓ |
| MH-10 | `phone` filter ignores `cell_phone` | 🟠 P4 | ✓ |
| MH-7 | Signatures cannot be superseded/voided | 🔵 P5 | ✓ |
| MH-15 | No print/PDF endpoint | 🔵 P5 | — |
