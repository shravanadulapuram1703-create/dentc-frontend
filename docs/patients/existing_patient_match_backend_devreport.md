# Existing-patient match on New Patient / New Appointment — backend dev report

**Date:** 2026-10-30
**Frontend branch:** `feature/uat-realse-v5`
**Endpoint involved:** `POST /api/v1/patients/check-duplicate` (`check_patient_duplicate`), and the 409
`duplicate_patient` guard on `POST /api/v1/patients/register` / `POST /api/v1/patients`.
**Backend code:** `app/services/patient_extra_service.py` → `check_duplicate()`, `_is_strong()`,
`raise_if_duplicate()`.

## 1. Feature (what the front desk asked for)

> Maddy is already a patient but the user doesn't know that. When they start adding her as a **new**
> patient, as soon as name + date of birth are entered the system should find the existing record, show
> it, and let them pick it and go straight on to booking the appointment, instead of creating a
> duplicate patient.

## 2. What the frontend now does (shipped, no backend change required)

| Surface | Behaviour |
|---|---|
| Scheduler → New Appointment → **New Patient** (quick "New Patient Appointment" form) | Once First + Last name + a valid Birthdate are filled, it calls `check-duplicate` automatically (debounced 450 ms). Likely matches show inline with a **Use This Patient** button. Clicking it loads the existing patient into the normal Add/Edit Appointment form, carrying over the slot, provider, operatory, prod. type and notes already typed. No patient is created. |
| Scheduler → CONTINUE → full Add New Patient wizard (embedded) | Same inline panel under the identity fields, and the "Identical Patients Found" modal (manual *Check Patient* or a 409 on save) now has a **Use This Patient** button on every row. Both go to booking for that patient. |
| Patient → Add New Patient page | Same panel and modal; the button is **Open Patient** (goes to that patient's Overview). |
| Quick Save hits the 409 `duplicate_patient` | The user is asked to book for the existing patient (OK) or create a separate one (`force_create: true`). Before this change the 409 showed as a generic "Could not save" error. |

Which candidates count as a "likely match" on the client: `is_strong`, **or** at least two of
`{last_name, first_name, dob}` in `match_on`. Single-field hits (every "Smith", everyone born that day)
are hidden as noise.

Code: `src/features/patients/useExistingPatientMatches.ts`, `src/features/patients/ExistingPatientMatches.tsx`,
wired into `QuickNewPatientAppointment.tsx`, `NewAppointmentModal.tsx`, `AddNewPatient.tsx`.

## 3. Backend gaps

Checked against the live dev backend (:8000) and by calling `check_duplicate()` directly.

### PT-MATCH-1 — Name matching is exact only: nicknames, typos and spacing miss the real record (HIGH)

`check_duplicate` filters with `Patient.last_name.ilike(last)` / `first_name.ilike(first)`. There is no
`%` wildcard, so this is a **case-insensitive equality** test. The Python re-check is also strict
equality (`(p.last_name or "").lower() == last.lower()`).

Reproduced:

| Request | Result |
|---|---|
| `uday / krishna / 2021-06-12` | id 1, score 85, `[last_name, first_name, dob]`, strong ✅ |
| `Udai / Krishna / 2021-06-12` (one-letter typo) | score 55, `[last_name, dob]`, **not** strong |
| `uda / krishna` (prefix) | first name not matched |

The story's own example is a nickname: **"Maddy" vs. "Madison"**. Today that only matches on
last name + DOB. The frontend still shows it (2 of 3 fields), but if the last name is also mistyped
("Smyth" vs. "Smith") the real patient is invisible.

Also not handled: hyphenated or double surnames ("Garcia-Lopez" vs. "Garcia"), stored values with
leading/trailing spaces (legacy imports; the stored side is never trimmed), and accents ("José" vs. "Jose").

**Ask:**
- Normalise both sides: `lower(trim(...))`, strip punctuation and hyphens, unaccent.
- Add fuzzy matching on names. Use `pg_trgm` `similarity()` ≥ ~0.6, or soundex/metaphone through
  `fuzzystrmatch`, plus prefix matching (`first_name ILIKE 'mad%'`). Optionally add a small nickname table
  (Maddy↔Madison/Madeline, Bill↔William, Bob↔Robert, …).
- Report these as separate `match_on` values (e.g. `first_name_fuzzy`, `last_name_fuzzy`,
  `first_name_nickname`) with a lower score than an exact match, so the UI can label them. Fuzzy hits
  must **not** make `is_strong` true, because that would 409 legitimate registrations.

### PT-MATCH-2 — Candidates are truncated *before* scoring, so the real match can be dropped (HIGH)

The comment in `check_duplicate` says candidates are "scored, sorted and *then* truncated". But the SQL
`select(...).where(or_(*conds)).limit(_SCAN_LIMIT)` (200) has **no ORDER BY**, and the conditions are
OR-ed. Any single field qualifies: `last_name = 'Smith'` **or** `first_name = 'John'` **or**
`dob = X`. In a full-size tenant (≈31k patients after migration), a common first name or surname easily
returns more than 200 rows. Postgres then returns an arbitrary 200, and the exact same-person row may not
be one of them.

**Ask:** rank in SQL before `LIMIT`. For example, compute the score as a SQL `CASE` sum and
`ORDER BY score DESC`. Alternatively, run a first narrow query (`last_name AND dob`, `first_name AND dob`,
`ssn`, `chart_no`) and only then the broad OR. Add a regression test with more than 200 same-surname
patients.

### PT-MATCH-3 — No index supports the lookup; it now runs on every new-patient keystroke burst (MEDIUM)

The frontend now calls `check-duplicate` automatically (debounced) whenever name + DOB change, not only
when the user presses *Check Patient*. `patients` has no index on `lower(last_name)`, `lower(first_name)`
or `dob` (only `tenant_id`, `home_office_id`, `legacy_id`). `ILIKE` on unindexed columns scans the
tenant's whole patient table. That is fast on the 92-row dev tenant (≈0.1–0.2 s) but needs checking on
the migrated 31k-row tenant.

**Ask:** add `(tenant_id, lower(last_name), dob)` and `(tenant_id, lower(first_name), dob)` expression
indexes, plus GIN `gin_trgm_ops` indexes if PT-MATCH-1 uses trigram similarity. Target p95 under 300 ms on
the largest tenant.

### PT-MATCH-4 — Candidate rows lack the fields staff need to tell two people apart (MEDIUM)

`DuplicateCandidate` returns name, DOB, chart_no, email, phone, office short id, provider and active
flag. When two candidates share name + DOB (parent/child "Jr.", twins with similar names, migrated
duplicates), the front desk can't tell which record is right.

**Ask:** add these optional fields to `DuplicateCandidate`:
- `cell_phone`, `work_phone` (only `phone`, the home number, is matched and returned today; Quick Save
  usually stores a cell number)
- `address_line1`, `city`, `zip`
- `last_visit_date`, `next_appointment_at`
- `responsible_party_name`
- `photo_document_id` (thumbnail)
- `gender`

### PT-MATCH-5 — Cell and work phones are not matched (MEDIUM)

`_phone_expr()` only normalises `Patient.phone`. The scheduler quick form stores the number in
`cell_phone` or `work_phone` when the user picks Cell or Work (Cell is the default). A returning patient
who gives the same cell number under a different name spelling therefore gets no phone match.

**Ask:** match the normalised digits against `phone`, `cell_phone` and `work_phone`, and report which
one matched in `match_on`.

### PT-MATCH-6 — DOB-only request returns nothing (LOW)

The early return `if not any([first, last, ssn, chart_no, phone_digits, email]): return []` leaves
`dob` out of the list, so `{dob: "2021-06-12"}` alone always returns `[]`. This doesn't affect the
current UI, which always sends names. The inconsistency would still bite any caller that searches by DOB
first.

**Ask:** include `dob` in the guard, or document that DOB alone is not searchable.

### PT-MATCH-7 — Merged/deleted patients not excluded (LOW, verify)

`patients` has `is_active` but no merged/deleted marker. Inactive rows are returned, which is correct
(the UI shows an *Inactive* badge, and an inactive patient should be reactivated, not duplicated). If a
patient-merge feature exists or is planned, candidates already merged into another record should either
point to the surviving id (`merged_into_id`) or be excluded. Otherwise "Use This Patient" could book onto
a dead record.

### PT-MATCH-8 — `ILIKE` with user input treats `%` and `_` as wildcards (LOW)

A name containing `_` or `%` (rare, but typed by accident) widens the match. The Python re-check stops
false candidates from being *returned*, but they still use up the 200-row scan (see PT-MATCH-2).

**Ask:** escape LIKE metacharacters, or use `func.lower(col) == value.lower()`.

## 4. Contract the frontend relies on (please keep stable)

- `POST /patients/check-duplicate` request: `{first_name, last_name, dob}` (snake_case, `dob` = `YYYY-MM-DD`).
- Response `candidates[]`: `id` (the value "Use This Patient" books with), `match_on[]`, `is_strong`,
  `match_score`, `chart_no`, `dob`, `first_name`, `last_name`, `is_active`, `email`, `phone`,
  `home_office_short_id`, `preferred_provider_name`.
- 409 body: `error.code = "duplicate_patient"`, `error.details.candidates[]` (same shape),
  `override_field = "force_create"`.
- Search is **organisation-wide** (not fenced by the working office). That is intended per the office-scope
  model: a patient registered at another office must still be found.

## 5. Priority

| ID | Severity | Effort |
|---|---|---|
| PT-MATCH-1 fuzzy / nickname / normalised names | High | M |
| PT-MATCH-2 rank before LIMIT | High | S |
| PT-MATCH-3 indexes | Medium | S |
| PT-MATCH-4 richer candidate fields | Medium | S |
| PT-MATCH-5 match cell/work phone | Medium | S |
| PT-MATCH-6 DOB-only guard | Low | XS |
| PT-MATCH-7 merged/deleted handling | Low | S |
| PT-MATCH-8 escape LIKE input | Low | XS |
