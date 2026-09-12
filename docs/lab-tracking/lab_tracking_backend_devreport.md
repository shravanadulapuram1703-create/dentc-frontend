# Lab Tracking (M12) — Backend Gap Report

**Status 2026-09-11 (evening):** the backend team shipped every gap below in migration
`587baa6a0ba7` (see [`lab_tracking_backend_response_1.md`](lab_tracking_backend_response_1.md)).
The frontend has been wired to the new contract and re-verified live against the restarted
backend (`127.0.0.1:8000`, 480 paths). Two **new** gaps surfaced during that verification —
**LAB-12 (blocker)** and LAB-13 — see §4.

Frontend surfaces:

- **Add / Edit Appointment → LAB section** (`src/components/modals/AddEditAppointmentForm.tsx`,
  `src/services/schedulerApi.ts`): Lab ✓ · **Lab (vendor)** · DDS · Lab Cost · Sent On · Due On ·
  Recvd On · **Short Notice**.
- **Patient → Lab Tracking tab** (`src/features/lab-tracking/**`): server lab view
  (`GET /appointments/lab-cases?patient_id=`), vendor / DDS / cost / short notice / dates,
  Check-in, **Remove Lab** (`has_lab:false`), Lab Report (server PDF), Cost Report (local),
  **Export CSV** (server).
- **Setup → Lab Tracking → Labs** (`src/components/setup/labs/**`, `/setup/lab-tracking/labs`):
  the `labs` catalog (CRUD, soft delete, duplicate-name override).

## 1. Contract (as shipped)

| Field / endpoint | Notes |
| --- | --- |
| `lab_dds` | The **dentist** the case is for (free text ≤ 100) — appointment form "DDS". |
| `lab_vendor_id` (+ `lab_vendor_name` on reads) | FK into `labs`; Lab Tracking "Lab" and the appointment form "Lab" picker. |
| `lab_short_notice` | bool, default false. |
| `lab_status` on reads | `not_sent | sent | overdue | received`; FE keeps `deriveStatus` only as fallback. |
| `GET /appointments/lab-cases` | Denormalised, paged, `counts` + `total_cost`; `include_archived=false` default. |
| `GET /appointments/lab-cases/report.pdf`, `…/export.csv` | Same filters incl. `patient_id`. |
| `GET /appointments/lab-cases/cost-report(.pdf)` | `date_basis`, `group_by`, `office_id`, `provider_id`, `lab_vendor_id` — **no `patient_id`** (LAB-13). |
| `GET/POST/PATCH/DELETE /labs`, `GET /labs/name-availability` | DELETE = `is_active=false`. Duplicate active name → **409** `{error:{code:"conflict", details:{code:"duplicate_lab_name", matches:[…]}}}` — note the code sits under `details`, not `error.code` as the response doc implies; `allow_duplicate_name:true` overrides. |
| Write rules | `has_lab:false` clears the block; lab data on a non-lab row derives `has_lab:true`; `lab_cost` `ge=0`, 2 dp, **no rounding** (FE rounds before sending); 422 `lab_date_order`; `extra="forbid"`. |

## 2. Verified live (2026-09-11, after restart)

| Check | Result |
| --- | --- |
| Setup → Labs: create "Probe Dental Lab" (code, phone, city, 5-day turnaround) | 201 after the LAB-12 workaround; listed in the rail; detail view renders |
| Lab Tracking tab loads `/lab-cases?patient_id=83700` | 200; counts `{all:1, received:1}`, `total_cost 100.00`, Lab/DDS columns, status pill |
| Select case → Lab = Probe Dental Lab, DDS "Dr Meer", Short Notice ✓ → Save | PATCH 200; GET shows `lab_vendor_id:4`, `lab_vendor_name`, `lab_dds`, `lab_short_notice:true`, `lab_status:"received"` |
| Due-on helper | label shows "5-day turnaround" from the vendor's `default_turnaround_days` |
| `report.pdf?patient_id=` / `export.csv?patient_id=` | 200 `application/pdf` 2.7 KB / 200 `text/csv` with the full column set |
| `cost-report?patient_id=` | 200 but **tenant-wide** (4 cases, `(no lab)` bucket) — param ignored → LAB-13 |
| Add/Edit Appointment DDS round-trip (earlier today) | typed → PATCH 200 → reopened with value |

All probe data reverted (case fields nulled; "Probe Dental Lab" deactivated — it remains as an
inactive row, id 4, because DELETE is soft).

## 3. Resolved gaps

| ID | Gap | Resolution |
| --- | --- | --- |
| APPT-5 | `lab_dds` on create/update | Shipped earlier (`f0a1b2c3d4e5`); FE mapper fixed 2026-09-11 |
| LAB-1 | Lab vendor / Short Notice / catalog | `labs` + `lab_vendor_id` + `lab_short_notice` — **blocked by LAB-12 until fixed** |
| LAB-2 | List filters | `has_lab`, `lab_status`, `lab_*_on_from/_to` on `GET /appointments` |
| LAB-3 | Scheduler feed | full lab block + `lab_vendor_name` + `lab_status` |
| LAB-4 | Reports | `report.pdf`, `cost-report(.pdf)`, `export.csv` |
| LAB-5 | Office-wide view | `GET /appointments/lab-cases` |
| LAB-6 | `lab_dds` > 100 → 500 | 422 (schema factory now propagates `String(n)` API-wide) |
| LAB-7 | `lab_cost` validation | `ge=0`, `max_digits=10`, `decimal_places=2` → 422 |
| LAB-8 | `has_lab=false` orphans | clears the block; lab data derives `has_lab=true` |
| LAB-9 | Date order | 422 `lab_date_order` (merge of payload + stored row) |
| LAB-10 | Unknown keys | `extra="forbid"` |
| LAB-11 | Archived rows in list | hidden by default; `?is_archived=true` opts in |

## 4. Open gaps

### LAB-12 — `POST /labs` fails: `labs.updated_at` is NOT NULL  · **Blocker**
Migration `587baa6a0ba7` creates `labs.updated_at` as `NOT NULL DEFAULT now()`, but the ORM
`TimestampMixin` (`app/db/base.py`) declares `updated_at` nullable with `onupdate` only, so
the INSERT sends an explicit `NULL` and Postgres rejects it:

```
POST /api/v1/labs {"name":"Probe Minimal Lab"}
409 {"error":{"code":"conflict","message":"Lab violates a uniqueness or reference constraint",
     "details":"null value in column \"updated_at\" of relation \"labs\" violates not-null constraint …"}}
```

Every other table (`appointments`, …) has `updated_at` nullable. Consequence: **no lab can be
created**, so the vendor picker is always empty and LAB-1 is unusable. The 33 tests presumably
run against a `create_all` schema (nullable) rather than the migration.

**Workaround applied on the local dev DB (`recondental_migrated`) so the FE could be verified:**
`ALTER TABLE labs ALTER COLUMN updated_at DROP NOT NULL;` — please ship it as a migration
(`nullable=True`, matching the mixin), or set `updated_at` on insert. Also worth mapping the
IntegrityError to a 500/422 rather than a 409 `conflict` — the message misled the UI into a
"duplicate" reading.

### LAB-13 — Cost report has no `patient_id` filter  · Low
`GET /appointments/lab-cases/cost-report(.pdf)` accepts `office_id` / `provider_id` /
`lab_vendor_id` only; `patient_id` is silently ignored (the call for patient 83700 returned the
tenant-wide 4-case report). The patient tab therefore keeps the client-side jsPDF cost report;
the server one is reserved for a future office-wide screen. **Ask:** accept `patient_id`
(and, like `/lab-cases`, ignore unknown params with a 422 rather than silently).

### Notes (not gaps)
- 409 duplicate shape: `error.code` is `"conflict"`; the discriminator is
  `error.details.code === "duplicate_lab_name"`. FE handles both.
- `GET /offices?size=200` takes ~10 s on this tenant; the Labs setup rail waits on it for
  the office picker. Not lab-specific.

## 5. Frontend changes (2026-09-11)

- `npm run api:sync` — client regenerated (renamed schedule types fixed in
  `officeScheduleApi.ts` / provider `SchedulesTab.tsx`).
- `src/features/lab-tracking/**` rewritten on `/lab-cases`, `labs`, server reports, `Remove Lab`,
  inline LAB-9 check, vendor turnaround pre-fill.
- `schedulerApi.ts` + `AddEditAppointmentForm.tsx`: `lab_vendor_id`, `lab_short_notice`
  round-trip; `lab_cost` rounded to 2 dp before sending (server no longer rounds).
- New `Setup → Lab Tracking → Labs` screen (`/setup/lab-tracking/labs`).
- Known FE limitation unchanged: the Add/Edit Appointment form cannot *clear* a saved DDS/cost/date
  (`value || undefined`); un-ticking Lab now clears everything server-side (LAB-8), which covers
  the common case.
