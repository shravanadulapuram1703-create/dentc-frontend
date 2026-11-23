# BE data map — PATIENTS, REFERRALS, TREATMENT PLANS, ORTHO and CLINICAL activity

_Static analysis only: code + docs read; no server started, no DB connection, no API call, no existing file modified, no raw source-export file opened, no `logs/` folder opened, the legacy PDFs not opened (no renderer in this environment). Snapshot 2026-11-21. Backend `<workspace>/dentc-backend` (branch `feature/uat-realse`, HEAD `9183df0`, 2026-11-16, plus uncommitted treatment-plan annual-max work), frontend `<workspace>/dentc-frontend` (branch `feature/uat-realse-v5`). `schema.sql` is a schema-only dump of 2026-10-11; it predates Alembic `9435491c1d19` (family accounts: `accounts`, `account_parties`, `account_change_events`, `patients.account_id` / `guarantor_patient_id` / `guarantor_party_id`) and `03bbb54c0b12` (`patient_documents.context`) — those are read from the models. New client databases are created by restoring a schema-only dump of `recondental_migrated` and then running Alembic (`docs/onboarding/NEW_CLIENT_DATABASE.md` L72-98), so the dump's constraint / index set is the real one everywhere._

**Legend** — **[V]** verified by reading the cited file / lines. **[I]** inference (reasoned from code, not executed). **[D]** a number or claim quoted from a code comment, backend doc or script docstring, not re-measured. Paths are relative to `dentc-backend/` unless prefixed `FE:` (= `dentc-frontend/`). Names are snake_case exactly as in the code.

Companion documents (same folder): `be_data_financial.md` (charges / payments / A/R — owns the money columns of `patient_procedures`), `be_data_scheduling.md` (appointments, recall §3, communications §5, lab §7), `be_existing_reporting.md` (existing KPI endpoints), `be_platform.md` (tenancy, office scope, jobs, exports). This document is the **data map for the patient master, referral sources, treatment plans, ortho contracts and clinical records**: where each fact lives, who writes it, what the migration loaded, and how to compute report metrics from it.

Two very different data shapes exist and every report in this scope must be designed for both [D]:

| Environment | Shape | Evidence |
|---|---|---|
| Migrated practice (`recondental_migrated`, "dev DB", tenant 1) | 83,861 patients, deep clinical / ledger history, **thin metadata** (no real `created_at`, no preferred provider, no treatment-plan history, no recalls, no ortho contracts) | `docs/gen_migration_report.js` L155-177; `docs/patients/patient_search_backend_response.md` L20 (83,924 patients live) |
| New organisation (`Test_Dental_Group`, UAT) | 135 patients, 0 `responsible_parties`, 0 legacy keys, **full metadata, no history** | `docs/patients/responsible_party_backend_response.md` L4; `FE:docs/patients/responsible_party_backend_devreport.md` §1 |

---

## 0. TL;DR for planners

| # | Finding | Evidence |
|---|---|---|
| 1 | Patient master = one table `patients` (`id` int PK, `tenant_id`, `home_office_id`). **`patients.id` is the only safe key**: `chart_no` has **no unique constraint in the real database** (family members share a chart number in Denticon) although the ORM model declares one; `legacy_id` (Denticon `PATID`) is UNIQUE **across all tenants**. | [V] `schema.sql` L4895-4963 (one `chart_no` line, no constraint), L9145; `denticon_migration/migration/db/schema.sql` L381; `app/db/models/patients.py` L48-49 |
| 2 | **`patients.created_at` is the migration-run timestamp on every migrated patient**, and `first_visit` / `last_visit` / `next_recall` are written by no code. The existing KPIs are therefore wrong for history: `report_service._new_patients` counts `created_at`, `_active_patients` counts `is_active`. New-patient, active-patient and attrition metrics must be **derived** from the first / last live clinical charge (or kept appointment). | [V] `s17_patients.py` L28-38 (no `created_at` in `COLS`); `app/services/report_service.py` L102-125; grep of `first_visit` = read sites only |
| 3 | Patient status is one boolean `is_active` (plus `is_locked`). `DELETE /patients/{id}` sets the same flag, so "inactive" and "deleted" are indistinguishable; there is no inactivation date, reason, or status history, and no deceased / archived state. | [V] `app/crud/router_factory.py` L69-70, `app/crud/base.py` L302-311, `registry.py` L383-427 |
| 4 | There is **no typed ortho flag on the patient**. Ortho is signalled by `patients.patient_type` (`"Ortho"` written by the app, a legacy `PATTYPE` code such as `OR` on migrated rows), `"OR"` in the JSON array `patients.patient_types`, an `ortho_plans` contract, or ortho procedure codes (`procedure_codes.is_ortho`). | [V] §1.4 |
| 5 | Several patient columns hold **two or three vocabularies at once** (migrated legacy value vs what the app writes): `gender` (`Male` vs `M`), `patient_type` (`UP` / `OR` vs `General` / `Ortho`), `referral_type` (`RC01` vs `Existing Patient`), `referred_by` (legacy referral id vs free text), `preferred_contact`, `marital_status`. Group-by on the raw column splits one category into several. | [V] §1.2 |
| 6 | Not migrated on `patients`: `preferred_provider_id`, `preferred_hygienist_id`, `preferred_language` (every migrated row = default `English`), `responsible_party_relationship`, `patient_types`, `no_auto_sms`, `created_by`. "Patient list by provider / hygienist / language" works only for app-era rows unless derived. | [V] `s17_patients.py` L28-38 |
| 7 | Family model = `accounts` (one per Denticon `RPID`; 61,259 for 83,861 patients [D]) + typed guarantor (`guarantor_patient_id` \| `guarantor_party_id`) + `account_parties`. `patients.account_id` grouping is reliable; the **guarantor is unresolved (both columns NULL) on migrated accounts** until `scripts/import_legacy_responsible_parties.py --apply` is run. `patients.responsible_party_id` is a deprecated, overloaded string — never join on it. | [V] `app/db/models/accounts.py`, `app/services/account_backfill.py` L8-19, L64; [D] `docs/gen_migration_report.js` L202 |
| 8 | `referrals` is primarily a **tenant catalog of referral sources** (665 migrated rows, all direction `"0"` = Referred By [D]), not a per-patient referral log: `referrals.patient_id` is NULL on almost every row. A patient points at its source through the **string** `patients.referred_by` = `referrals.legacy_id` (migrated) or free text (app). No FK, no referral date, no source category column. | [V] `patients.py` L95-100, L388-413; `s24_referrals.py`; `letter_service.py` L229-240; [D] `docs/patients/patient_overview_backend_devreport.md` PO-6 |
| 9 | The name `referral_type` means three different things: `referrals.referral_type` = direction code `"0"` / `"1"`; `patients.referral_type` = lead-source type (`REFTYPE` code or a label); `treatment_plan_items.referral_type` = `in` / `out`. | [V] §2.2 |
| 10 | Referral ROI inputs exist: `referrals.cost` (one figure per source), production / collections per patient, and a second, appointment-level attribution `appointments.campaign_id` → `campaigns.code`. The weak link is patient → source (finding 8). | [V] `patients.py` L412; `comms.py` L243-269 |
| 11 | Treatment plans: the header `treatment_plans` is only a container ("Tx Plan ID"; `status` free text `Active` / `active`). **All lifecycle is on `treatment_plan_items`**: 10-value status enum, `diagnosed_date`, `accepted_date`, `scheduled_date`, `start_date`, `end_date`, `fee`, `insurance_estimate`, `provider_id`, `counselor_user_id`, `phase_id`, `priority`. `completed` and `scheduled` are server-owned (set by a charge / an appointment line). | [V] `app/db/models/treatment.py`; `app/schemas/treatment.py` L30-33; `treatment_service.py` L212-339 |
| 12 | Missing for case-acceptance analytics: no "presented" date, no rejection date, **no status history** (only `audit_logs.details` for client PATCHes), `accepted_date` is stamped only when a client sets `status='accepted'` (an item that goes diagnosed → scheduled / completed keeps it NULL), counselor is optional. | [V] `treatment_service.py` L603-610, L212-226, L302-313 |
| 13 | **Historical treatment-plan data is essentially absent**: only 674 plans [D] (775 items on the dev DB [D]) were derived from appointment-detail rows with a `TREATPLANID`; Denticon `TREATPLAN` / `TREATPLANINSD` had no export. Migrated items carry no dates, no fees beyond the appointment line, provider only as a legacy id in `diagnosed_by`. Case acceptance, unscheduled treatment and plan aging are app-era metrics. | [V] `s25_treatment_plans.py`, `s27b_treatment_plan_items.py`; [D] `docs/gen_migration_report.js` L170; `scripts/normalize_treatment_item_statuses.py` L12-14 |
| 14 | Plan ↔ execution links are first-class: `patient_procedures.treatment_plan_item_id` (the charge that completed an item) and `appointment_procedures.treatment_plan_item_id` (the booking). One server rule defines "pending treatment" (`treatment_service.pending_item_clauses`). Only per-patient readers exist (`/patients/{id}/treatment-plan-items?pending=true`, `/treatment-plan-items/pending-summary?patient_ids=` ≤ 200). | [V] `clinical.py` L61-70; `scheduling.py`; `treatment_service.py` L903-987 |
| 15 | Ortho: the schema is complete (`ortho_plans` with banding / start / end dates, three contract columns, three instalment tables, posting to the ledger) but **no ortho contract, payment plan or regular plan was migrated** (empty exports). Contract-level "remaining" fields are client-computed snapshots that posting never updates. No debond date, no treatment card / visit log. | [V] `billing.py` L401-528; `s52_empty_tables_stubs.py`; `payment_plan_service.py` L276-355 |
| 16 | Likely defect: posting an **insurance-side** ortho instalment writes `ledger_id = 'PP-' + uuid7` (39 chars) into `patient_ins_payment_plans.ledger_id` / `patient_sec_ins_payment_plans.ledger_id`, which are `varchar(20)`. Patient-side `patient_plan_installments.ledger_id` is `varchar(50)`. | [V] `payment_plan_service.py` L336, L354; `schema.sql` L4057, L4743, L4467. [I] for the runtime failure (tests run on SQLite, which ignores lengths) |
| 17 | Recall: `patient_recalls` has 0 migrated rows and no engine; see `be_data_scheduling.md` §3. `procedure_codes.recall_interval` / `recall_unit` were migrated and can drive a derived recall list. | [V] `s52_empty_tables_stubs.py` L27; `codes.py` L63-64 |
| 18 | Progress notes (35,286 migrated [D]) have **no provider, appointment or procedure link** — only `patient_id`, `note_date`, `office_id`, author `created_by` (user), `signed_by` / `signed_at`, `is_struck_off`, `is_deleted`. "Locked" is computed (signed, or after the office-local creation day). Migrated notes have no author, are all unsigned, and `created_at` = load time. A Missing Progress Notes report is an anti-join of clinical charges against notes on (patient, date). | [V] `clinical.py` L251-292; `progress_notes_service.py` L59-136; `s35_progress_notes.py` L38-41; [D] `docs/progress notes/progress_notes_backend_response.md` L33, L94 |
| 19 | Other clinical stores and migrated volumes [D]: `chart_conditions` 77,498; `perio_exams` 2,844 (+ 78,284 tooth rows); `prescriptions` 38,093; `patient_alerts` 46,680; `medical_history_records` 31,565 headers with **no** answer rows; `patient_signatures` 3,860; `account_notes` 4,518. `patient_notes`, `patient_medical_alerts`, `patient_questionnaire_responses`, `patient_consents`, `patient_documents`, `patient_emergency_contacts` are app-era only. | [D] `docs/gen_migration_report.js` L155-177; [V] `denticon_migration/source_to_table_map.md` |
| 20 | Letters: only **batch** runs are logged (`letter_batch_runs` / `letter_batch_items`, ≤ 500 patients); a single-letter render is stateless. Consents are persisted (`patient_consents`, status `pending` / `printed` / `signed` / `declined` / `voided`). | [V] `letter_service.py` L674-807; `app/core/config.py` L259; `patient_extra.py` L123-183 |
| 21 | Tenancy / attribution: `treatment_plans`, `treatment_plan_items`, `progress_notes`, `perio_exams`, `prescriptions`, `chart_conditions`, `patient_alerts`, `patient_recalls`, `patient_insurance`, `account_notes`, `patient_notes`, `patient_signatures` have **no `tenant_id`** — join `patients`. Items have no `office_id` either (office = `treatment_plans.office_id`, nullable). | [V] models |
| 22 | No office-wide endpoint exists for any patient-list, referral, treatment-plan, ortho or progress-note report. Generic lists cap `size` at 200, and `/treatment-plan-items`, `/referrals` expose no date-range parameter. Reporting indexes are missing throughout (`referrals` has none besides the PK). | [V] `app/api/deps.py` L146; `registry.py`; §7.2 |

---

## 1. Patients

### 1.1 `patients` — column map [V]

Model `app/db/models/patients.py` L34-152; DDL `schema.sql` L4895-4963; migration `denticon_migration/migration/steps/s17_patients.py` (source `PATIENT/*.txt` joined to `RespParty.txt` on `RPID`).

| Column(s) | Type | Meaning / writer | Loaded by `s17`? | Report use / caveat |
|---|---|---|---|---|
| `id` | int PK | surrogate | — | the patient key for every join |
| `tenant_id` | int NOT NULL | organisation | yes (`PGID`) | |
| `home_office_id` | int NULL FK `offices` | the chart's home office — a badge, not a fence (patients are organisation-wide) | yes (`OID`; NULL when the office is unknown) | office filter for patient lists; "seen at office" is a different concept (§1.8) |
| `legacy_id` | varchar(20), UNIQUE (global) | Denticon `PATID`. **`legacy_id IS NULL` = created in DentC** — the "is migrated" test | yes | a second migrated organisation with overlapping `PATID`s would collide [I] |
| `chart_no` | varchar(50), not unique | `CHARTNO`; app-created rows get `str(id)` (or `id-1`…) from `patient_service.assign_chart_no` L99-117 | yes | display only; never a join or group key |
| `first_name`, `last_name`, `preferred_name`, `title`, `middle_initial` | varchar | `FNAME`, `LNAME`, `NICKNAME`, `TITLE`, `MI` | yes | `middle_name`, `suffix` are app-only |
| `dob` | date | `BIRTHDATE` | yes | age and birthday are derived; no stored age |
| `gender` | varchar(20) | migrated `Male` / `Female` / NULL (`parsers.map_gender`); app writes `M` / `F` / `O` | yes | normalise (§1.2) |
| `ssn`, `medicaid_id`, `driver_license` | varchar | identifiers | `ssn`, `medicaid_id` yes | PHI — mask in every export |
| `marital_status` | varchar(20) | migrated raw `MSTATUS`; app = picker value | yes | vocabulary unverified |
| `phone`, `cell_phone`, `work_phone`, `email` | varchar | `HOMEPHONE`, `CELLPHONE`, `WORKPHONE`, `EMAIL`, stored unformatted | yes | most migrated patients have a cell number and no home number [D] `patient_service.py` L28-30 |
| `preferred_contact` | varchar(50) | migrated raw `PrefCntMethod`; app sends the form value, omitted for "No Preference" | yes | ≥ 2 vocabularies (§1.2) |
| `address_line1`, `address_line2`, `city`, `state`, `zip` | varchar | `ADDRESS`, `ADDRESS2`, `CITY`, `STATE`, `ZIP` (raw) | yes | `zip` is free text (ZIP+4 mixed) — compare on the first 5 digits |
| `preferred_provider_id`, `preferred_hygienist_id` | varchar(50) FK `providers.id` | primary dentist / hygienist | **no** | NULL on migrated rows — derive from history |
| `preferred_language` | varchar(50) NOT NULL DEFAULT `'English'` | | **no** | every migrated row reads `English`; the tag `SS` (Spanish Speaking) is the only other language signal |
| `first_visit`, `last_visit`, `next_recall` | date | denormalised dates | **no**, and no backend writer | always NULL — do not use (§1.5) |
| `is_finance_charge`, `send_statements`, `send_collections`, `is_locked` | bool | account-level flags from `RespParty` (`ISFINCHARGE`, `NOT NOEMAILSTMT`, `ISSENDCOLL`, `ISLOCKED`), copied onto **every member** of the account | yes | account statements read `accounts.*` instead (§1.6) |
| `no_auto_email`, `no_auto_sms`, `no_correspondence`, `sms_opt_out_at`, `sms_opt_in_at` | bool / timestamp | contact opt-outs; `no_correspondence` forces the two `no_auto_*` flags (`patient_rules_service.py` L49-56) | `no_auto_email` only (`NOAUTOEMAIL`) | mandatory exclusion filters for any marketing / recall list |
| `add_to_quickfill`, `assign_benefits`, `hipaa_agreement` | bool | short-notice list, assignment of benefits, HIPAA acknowledgement | `hipaa_agreement` (`ISHIPAA`) | |
| `guardian_name`, `guardian_phone` | varchar | `POANAME`, `POAPHONE` | yes | |
| `referral_type`, `referred_by` | varchar(50), varchar(255) | inbound referral (§2) | yes (`REFERRALTYPE`, `REFERREDBY`) | mixed vocabularies |
| `referred_to`, `referral_to_date` | varchar(255), date | outbound referral: label text + date | no | app-era only |
| `patient_notes`, `hipaa_sharing_notes` | text | free text | `patient_notes` (`NOTES`) | |
| `responsible_party_id` | varchar(50) | **deprecated alias** (Denticon `RPID` on migrated rows; the guarantor's key on app rows) | yes (`RPID`) | never join on it (§1.6) |
| `account_id`, `guarantor_patient_id`, `guarantor_party_id` | int FK | typed family model | backfilled by Alembic `9435491c1d19` | canonical |
| `responsible_party_relationship` | varchar(50) | code `S` / `SP` / `P` / `G` / `C` / `D` / `O` | **no** (`RELTORESP` is read only to rank the account's representative member, L129) | filled by the RP import script, step 2 |
| `patient_type` | varchar(50) | the single primary tag | yes (`PATTYPE`, else `PatTypeDescr`, L123) | §1.4 |
| `patient_types` | json (array of codes) | multi-tag `CH` / `CP` / `EF` / `OR` / `SN` / `SR` / `SS` / `UP` | no | `json`, not `jsonb` — cast before using `?` |
| `pronouns`, `student_status`, `school_name`, `fee_schedule_id`, `photo_document_id` | | Add-Patient extras | no | |
| `is_active` | bool | Active checkbox; also the soft-delete flag | yes (`ACTIVE`) | §1.3 |
| `created_at` | timestamp NOT NULL DEFAULT `now()` | row creation | **no → load time** | new-patient date for app-era rows only |
| `updated_at`, `created_by`, `updated_by` | timestamp, int FK `users` | audit | no | "User" criterion works for app-era rows only |

**Columns that do not exist** [V]: stored age; first-contact date; inactivation date / reason; deceased flag; a referral-source FK; campaign; race / ethnicity; occupation / employer on the patient (employer lives on `responsible_parties` and `insurance_plans`); online-registration flag; `is_ortho`; any status history.

### 1.2 Mixed vocabularies inside one column [V]

| Column | Migrated value | App-written value | Lookup (`definitions.group_code`) | Normalise as |
|---|---|---|---|---|
| `gender` | `Male` / `Female` / NULL (`denticon_migration/migration/utils/parsers.py` L220-226) | `M` / `F` / `O` (`FE:src/components/pages/AddNewPatient.tsx` L1113-1124) | `gender` (`M`, `F`, `O`, `U`) | `upper(left(gender,1))` → M / F / other |
| `patient_type` | Denticon `PATTYPE` code (`UP` → "Update Information" [D] `docs/patients/patient_overview_backend_devreport.md` §2), or `PatTypeDescr` text | `Ortho` or `General` (`AddNewPatient.tsx` L1108, L1159; AppointNow and quick-new-patient write `General`) | `PATTYPE` (legacy), `patient_type` (seeded, same 8 codes) | §1.4 predicate |
| `referral_type` | `REFTYPE` code, e.g. `RC01` → "Conversion" [D] | the **label** of a `referral_type` definition (`Existing Patient`, `Doctor`, `Insurance`, `Online`, `Walk-in`, `Other`; `AddNewPatient.tsx` L2481-2484 uses `type.name` as the value) | `REFTYPE` (legacy) vs `referral_type` (seeded, `scripts/seed_account_definitions.py` L164-167) | map both through one tenant table |
| `referred_by` | a legacy referral id, e.g. `13000412` = `referrals.legacy_id` | free text typed by the user (`AddNewPatient.tsx` L2494-2509) | — | resolve by `referrals.legacy_id`, else keep the text |
| `referred_to` | — | display label of a `referrals` row (`practice_name` or "Last, First"; `AddNewPatient.tsx` L2526-2545), not its id | — | text only |
| `preferred_contact` | raw `PrefCntMethod` | form value | `contact_pref` (`phone`, `email`, `sms`, `mail`); the print layer expects `home_phone` / `cell_phone` / `work_phone` / `email` / `text` / `mail` (`print_service.py` L92-95) | needs a mapping table; values unverified [I] |
| `responsible_party_relationship` | NULL | `S` / `SP` / `P` / `G` / `C` / `D` / `O`, folded on every write (`patient_rules_service.py` L73-99) | `resp_party_rel` | already canonical for app rows |
| `patient_insurance.relationship` | `S` or `Self` depending on vintage [D] PO-9 | code | `resp_party_rel` | fold |

`definitions` rows were duplicated up to 5× by the importer on the migrated tenant and are unique only on `(tenant_id, group_code, key1, description)` (`app/db/models/reference.py` L15-30): a label join must pick one row per `key1`, or it multiplies the result.

### 1.3 Status and lifecycle [V]

| Fact | Detail |
|---|---|
| Active / inactive | `patients.is_active`. Migrated from `PATIENT.ACTIVE` |
| Delete | generic `DELETE /patients/{id}` = soft delete on the same flag (`router_factory.py` L69-70; gated by right `patient_delete_patient_information`, `registry.py` L427). List reads do **not** hide these rows by default |
| Implication | `is_active = false` forces `add_to_quickfill = false` (`patient_rules_service.py` L57-62) |
| Locked | `is_locked` (account flag copied from `RespParty.ISLOCKED`) — semantics in the app unverified |
| History | none. `updated_at` / `updated_by` only; before / after values of a PATCH are in `audit_logs.details` |
| Existing "active patients" KPI | `report_service._active_patients` = `count(is_active)` by `home_office_id` — a roster size, not "patients seen in 18 / 24 months" |

### 1.4 How an ortho patient is identified [V]

| Signal | Where | Writer | On migrated rows |
|---|---|---|---|
| Primary type | `patients.patient_type` | app: `"Ortho"` when the OR box is ticked, else `"General"` | a `PATTYPE` code or description; `OR` = Ortho in the code list |
| Tag set | `"OR"` in `patients.patient_types` | app (multi-select; `CH` and `SR` are mutually exclusive, the rest orthogonal — `patient_rules_service.py` L43-45) | NULL |
| Contract | `ortho_plans` row with `is_active`; `patient_payment_plans.plan_type = 'ortho'` | Ortho Payment Plan screen | none (empty export) |
| Procedures | `patient_procedures.procedure_code` → `procedure_codes.is_ortho` (migrated from `Codes.ISORTHO`, `s10_procedure_codes.py`) or CDT `D8xxx` | charge entry | yes |
| Provider | `providers.is_ortho_provider` (`identity.py` L252) | Provider Setup | default false |
| Office | `office_advanced_settings.is_ortho` (`office_setup.py` L126) | Office Setup | default false |
| Claim | `insurance_claims.is_ortho`, `ortho_appliance_date`, `ortho_months_remaining` (`billing.py` L162-164) | claim fill-out | not loaded [I] |
| Benefit | `patient_insurance.ortho_remaining`, `insurance_plans.ortho_max` | insurance | plan-level |

The frontend's own read rule is `"OR" ∈ patient_types OR /ortho/i.test(patient_type)` (`FE:src/features/add-patient/editMode.ts` L284-286). That regex does not match a bare `OR` code, so a migrated ortho patient stored as `patient_type = 'OR'` is not recognised by the edit form [I]. Report predicate that covers both eras:

```sql
upper(btrim(pt.patient_type)) IN ('OR', 'ORTHO')
OR pt.patient_type ILIKE 'ortho%'
OR COALESCE(pt.patient_types::jsonb, '[]'::jsonb) ? 'OR'
```

"General" = NOT that predicate. Whether "Ortho patient" for the legacy *General / Ortho* report criterion should instead mean "has an active ortho contract" is a product decision (§8 Q4).

### 1.5 First visit / last visit / next appointment [V]

| Need | Stored column | Reality | Derivations that already exist in code |
|---|---|---|---|
| First visit | `patients.first_visit` | never written | none |
| Last visit | `patients.last_visit` | never written | `patient_intake_service._visits` L369-384: `max(appointments.date)` where `is_archived = false` and `date < today` — **counts cancelled and missed appointments**. `letter_service._appointments` L243-255 additionally requires `is_cancelled = false`. Two definitions already disagree |
| Next appointment | — | — | same two functions with `date >= today` |
| Next recall | `patients.next_recall` | never written | `_scheduled_recall` L386-391: `min(coalesce(scheduled_date, due_date))` over active `patient_recalls` |
| New-patient flag | `appointments.is_new_patient` | set by the quick new-patient booking and AppointNow; false on every migrated appointment (`be_data_scheduling.md` §1.1) | — |

Recommended single definition for the report layer [I]: a **visit** = a patient-day with at least one live clinical charge (`patient_procedures`, `NOT is_void AND NOT is_archived`, CDT code). First visit = `min`, last visit = `max`. It works for both eras because `date_of_service` was migrated for 1.37 M charges. Kept appointments are the alternative basis for app-era data (see `be_data_scheduling.md` §1.3 for the status predicate).

### 1.6 Account / guarantor / family [V]

`app/db/models/accounts.py` L62-158; insert hooks L320-425; `docs/patients/responsible_party_backend_response.md`.

| Concept | Column | Notes |
|---|---|---|
| Family / billing account | `patients.account_id` → `accounts.id` | migrated: one account per Denticon `RPID` (`accounts.legacy_key` = RPID, `account_no` = RPID when free); app: a new account for a Self patient, or the guarantor's account |
| Guarantor is a patient | `patients.guarantor_patient_id` | `= patients.id` means **Self** |
| Guarantor is a non-patient | `patients.guarantor_party_id` → `responsible_parties.id` | demographics + `resp_party_type` (`CA`, `CO`, `DI`, `IN`, `ST`, `WO`), employer, billing flags (`patients.py` L608-667) |
| Unresolved | both NULL | a migrated account whose guarantor row was never imported; CHECK allows at most one (`ck_patients_single_guarantor`) |
| Account's primary guarantor | `accounts.primary_guarantor_patient_id` \| `primary_guarantor_party_id` | |
| Additional parties | `account_parties` (`role` `secondary` \| `billing_contact`, `responsibility_pct`, `receives_statements`) | max 3 parties per account |
| Account billing flags | `accounts.send_statements`, `no_email_statement`, `send_collections`, `collection_agency_id`, `is_finance_charge`, `statement_message`, `financial_notes`, `is_active`, `merged_into_account_id`, `merged_at` | canonical for account statements; seeded from the guarantor at creation and never mirrored back to `patients.*` |
| Change history | `account_change_events` (`action`, `old_account_id`, `new_account_id`, `moved_balance`, `effective_date`, `user_id`) | app-era |
| Deprecated alias | `patients.responsible_party_id` (string) | holds a `responsible_parties.id`, a patient id, or a Denticon RPID — the id spaces collide (RP-1) |

Migrated state [V]/[D]: the Alembic backfill groups migrated patients by `RPID` and looks for the group's member whose relationship is `S` (`account_backfill.py` L64); `s17` never loaded the relationship, so migrated accounts stay **unresolved** until `scripts/import_legacy_responsible_parties.py --apply` imports `RespParty.txt`, fills `RELTORESP` and resolves the guarantor. That script was "not applied" on `Test_Dental_Group` (which holds no migrated patients) [D]; its state on the migrated database is unknown (§8 Q1). Account **membership** does not depend on it.

Report consequences: family size = `count(*) GROUP BY account_id`; "Responsible Party List" reports read `accounts` + guarantor (patient or party); there is **no date** for "sent to collections" (only the flag and `collection_agency_id`).

### 1.7 Patient satellites [V]

| Table | Key columns | Soft delete | Migrated rows [D] | Notes for reports |
|---|---|---|---|---|
| `patient_alerts` | `patient_id`, `alert` (text), `blocks_charges`, `is_flash_alert`, `source_medical_alert_id`, `is_active`, `deactivated_on`, `created_by` | `is_active` | 46,680 (`PatFlashAlerts.txt`) | free-text banner alerts; no category; `created_at` = load time on migrated rows |
| `patient_medical_alerts` | `tenant_id`, `patient_id`, `alert_code`, `alert_label`, `response` (`yes` \| `no` \| `unknown`), `section`, `answered_at`, `is_flash_alert`, `blocks_charges`, `is_active` | `is_active` | 0 | Medical History answers; a `yes` row is the alert. Catalog = definitions group `MEDALERT` |
| `patient_questionnaire_responses` | `questionnaire_type` (`dental` \| `medical`), `question_code`, `answer`, `answered_at` | `is_active` | 0 | catalogs `DENTQUEST` / `MEDQUEST` |
| `patient_medical_history` | one row per patient: `alerts_completed_at`, `dental_completed_at`, `medical_completed_at` (+ `_by`), `last_signature_id`, `last_version_id` | — | 0 | "medical history not updated in N months" lists |
| `medical_history_records` / `medical_history_details` | version header (`completed_at`, `signature_id`, `scope`, `content_hash`) / frozen answers | `is_archived` | 31,565 headers, **0 detail rows** (no export) | the only migrated table here whose `created_at` was restored from the source (`s23` L43-48) |
| `patient_medical_history_events` | field-level change log (`entity_type`, `action`, `old_value`, `new_value`, `changed_by`) | — | 0 | audit report |
| `patient_insurance` | `patient_id`, `ins_plan_id`, `subscriber_id`, `legacy_plan_type` (`D` \| `M`), `insurance_type` (`primary`…`quaternary`), `relationship`, `deductible_remaining`, `max_remaining`, `ortho_remaining`, `is_active` | `is_active` | 55,105 | slot key = (patient, plan type, ordinal). Join `insurance_plans` (`carrier_id`, `employer_id`, `group_number`, `plan_type`, `coverage_type`) → `insurance_carriers` for "patient list by insurance" |
| `patient_emergency_contacts` | `name`, `relationship`, `phone`, `email`, `is_primary` | `is_active` | 0 | |
| `patient_notes` | `note_date`, `note_type`, `notes`, `document_id`, `office_id`, `is_archived`, `is_deleted`, `created_by` | `is_deleted` | 0 (no export) | legacy "Patient's Notes" list — app-era only |
| `account_notes` | `patient_id`, `note_type`, `notes`, `is_struck_off` | hard delete | 4,518 (`RESPNOTES.txt`) | account-level notes attached to **one representative member** of the account (`s21_account_notes.py`) |
| `patient_signatures` | `signature_type` (`medical_history`, `progress_note`, `consent`, `financial`, claim items), `signed_at`, `signed_by_user_id`, `signer_provider_id`, `progress_note_id`, `consent_id`, `claim_id`, `is_active`, `voided_at` | `is_active` | 3,860, with no `signature_type` and no `signed_at` (`s22` L36-37) | |
| `patient_consents` | `tenant_id`, `patient_id`, `template_id`, `plan_id`, `title`, `status`, `signed_by`, `signed_at`, `signer_name`, `signer_relationship`, `signature_method`, `declined_reason`, `document_id`, `signed_document_id` | `is_deleted` | 0 | consent tracking; `plan_id` links a consent to a treatment plan |
| `patient_documents` | `tenant_id`, `patient_id`, `office_id`, `context` (`documents`, `imaging`, `note`, `patient_photo`, `letter`, `consent`, `progress_note`, `restorative`, `treatment_plan`), `document_type`, `procedure_id`, `claim_id`, `created_by`, `is_deleted` | `is_deleted` | 0 | "letter saved to chart" = `context = 'letter'` |
| `patient_opening_balances` | one row per patient: `as_of_date`, `current`, `over_30`…`over_120` | — | 0 | see `be_data_financial.md` |
| `caries_risk_assessments` | `risk_date`, `risk_level` + 36 boolean factors | — | 0 (empty export) | no frontend caller verified here |
| `booking_requests` (AppointNow) | `patient_id`, `is_new_patient`, `status`, `appointment_id`, `created_at` | — | 0 | the only source for "Online Registered Patients" |

### 1.8 Existing API surface for patient lists [V]

`GET /patients` (`registry.py` L383-427): filters `home_office_id`, `is_active`, `preferred_provider_id`, `preferred_hygienist_id`, `chart_no`, `dob`, `ssn`, `medicaid_id`, `email`, `phone` (spans the three phone columns), `gender`, `patient_type`, `responsible_party_id`, `fee_schedule_id`, `legacy_id`, `id`, `ids`, `account_id`, `guarantor_patient_id`, `guarantor_party_id`; ranges `created_at_from/_to`, `dob_from/_to`; extras `seen_at_office_id`, `search_scope` (`current` \| `group` \| `all`), `account_no`, `guarantor_name`; sort `created_at`, `id`, `last_name`, `first_name`, `dob`; `size` ≤ 200.

- `seen_at_office_id` = patients with **any** appointment or **any** procedure at that office (`patient_service.py` L165-168) — no date window, no void / cancel filter. It is not a "Patients Seen" report.
- No filter exists for zip, city, age, birthday month, insurance carrier, last visit, balance, patient-type tag, alert, or "no future appointment".
- Other read endpoints: `GET /patients/{id}/overview`, `/context`, `/account`, `/change-log`; `GET /accounts` (search by account no / RPID / member or guarantor name), `GET /accounts/{id}`; `GET /responsible-parties/{id}/patients`; `GET /appointments/family`; `POST /patients/check-duplicate`. All are per-patient or per-account.

---

## 2. Referrals

### 2.1 `referrals` [V]

Model `app/db/models/patients.py` L388-413; DDL `schema.sql` L6319-6344; migration `s24_referrals.py` (source `Referrals.txt`).

| Column | Type | Meaning | Migrated from |
|---|---|---|---|
| `id` | int PK | | |
| `tenant_id` | int NOT NULL | | `PGID` |
| `office_id` | int NULL | NULL = shared by every office (catalog scope) | `OID` |
| `legacy_id` | varchar(20) | Denticon `REFERRALID`, e.g. `13000001`; shown as "Referral ID" | yes |
| `referral_type` | varchar(10) | **direction code**: `"0"` = Referred By (source), `"1"` = Referred To (target) | `TYPE` or `REFERRALTYPE` |
| `reason_code` | varchar(20) | referral **type** (`REFTYPE` code, e.g. `R003`, `RC01`) | `TYPE2` |
| `patient_id` | int NULL | optional patient link (Overview → Referrals tab reads `WHERE patient_id = :p`) | `patient_map.get(RPID or PATID)` — NULL on ~all rows |
| `first_name`, `last_name`, `practice_name`, `contact_name` | varchar | the referrer / target | names yes; the last two are app-only |
| `address`, `city`, `state`, `zip`, `phone`, `email` | varchar | contact block | yes |
| `npi`, `specialty` | varchar | doctor identifiers | yes |
| `e_referral_id` | varchar(50) | | app-only |
| `cost` | numeric(12,2) | "Cost" on the Referral Info grid — one figure per source row, no period | app-only |
| `notes` | text | | yes |
| `created_at`, `created_by` | timestamp, int | load time on migrated rows | no |

No `updated_at`, no `is_active`: `DELETE /referrals/{id}` is a **hard delete** (`registry.py` L514-519), after which `patients.referred_by` dangles. No index other than the PK (§7.2). Volumes [D]: 665 migrated rows, all with direction `"0"` (`docs/refferals/referral_setup_backend_devreport.md`); 666 rows with 1 of the first 200 carrying `patient_id` (PO-6); "800+ rows" in a later frontend comment (`AddNewPatient.tsx` L589-591).

`s24` L34 looks the patient up with `RPID or PATID` in a map keyed by `PATID`. If `Referrals.txt` carries `RPID`, any non-NULL `referrals.patient_id` on a migrated row is a coincidental numeric match, i.e. possibly the wrong patient [I].

The table is used in two roles: (a) the **Setup → Referrals → Referral Sources** catalog (full CRUD; list filters `patient_id`, `office_id`, `referral_type`, `reason_code`, `legacy_id`; search on `first_name`, `last_name`, `specialty`, `practice_name`), and (b) per-patient referral rows on the Overview. Nothing distinguishes the two roles except `patient_id IS NOT NULL`.

### 2.2 The three meanings of `referral_type` [V]

| Column | Vocabulary | Source of truth |
|---|---|---|
| `referrals.referral_type` | `"0"` Referred By, `"1"` Referred To | definitions group `referral_direction`; `print_service.py` L96-97 |
| `patients.referral_type` | lead-source type: `REFTYPE` code (migrated) or the label of a `referral_type` definition (app) | groups `REFTYPE` and `referral_type` |
| `treatment_plan_items.referral_type` | `in` \| `out` | `treatment_service.REFERRAL_TYPES` L122, validated L486-493 |

### 2.3 Patient ↔ referral linkage, in / out, dates [V]

| Question | Where it lives | Quality |
|---|---|---|
| Which source referred this patient? | `patients.referred_by` (string) → `referrals.legacy_id` for migrated patients (`letter_service._referred_by` L229-240 resolves it exactly this way); free text for app patients | no FK; app rows are not resolvable to a source row; renaming or deleting a source breaks the link |
| What kind of source? | `patients.referral_type` (§1.2), or `referrals.reason_code` of the resolved source | two vocabularies; no "patient / doctor / marketing / other" category column — derive: `npi` or `specialty` present → doctor; `referrals.patient_id` present → patient; else map the `REFTYPE` label [I] |
| When was the patient referred in? | nothing | use first visit, or `patients.created_at` for app-era rows |
| Referred **out** (patient level) | `patients.referred_to` (label text), `patients.referral_to_date` | app-era only, text not id |
| Referred out (procedure level) | `treatment_plan_items.status` ∈ `referred_out`, `external_referral`, `internal_referral`; `treatment_plan_items.referral_id` → `referrals.id`, `referral_type` `in` \| `out` | app-era; no date for the status change |
| Referral targets catalog | `referrals` rows with `referral_type = '1'` | none migrated (all 665 are `"0"`) [D] |
| Providers who accept referrals | `provider_referral_offices` (provider × office allow-list) | Provider Setup |
| Referral demographics | `referral_demog_headers` (field catalog) + `referral_demog_details` (`referral_id`, `demog_header_id`, `data`) | empty exports; CRUD exists |

### 2.4 Referral ROI path [V]/[I]

```
referrals (source, cost)
   ^  patients.referred_by = referrals.legacy_id      (migrated; string match)
patients ──< patient_procedures (production)          NOT is_void AND NOT is_archived
         ──< patient_payments / ledger_insurance_details (collections — be_data_financial.md)
         ──< appointments.campaign_id = campaigns.code  (second, appointment-level attribution)
```

`campaigns` (`comms.py` L243-269): `tenant_id`, `office_id`, `code` (unique per tenant), `name`, `channel` (free text: mail / email / sms / referral / web / other), `start_date`, `end_date`, `is_active`. `appointments.campaign_id` stores the **code** (not an FK) and was migrated from `CAMPAIGN`. There is no campaign column on the patient and no cost column on the campaign.

---

## 3. Treatment plans

### 3.1 Tables [V]

`app/db/models/treatment.py`; DDL `schema.sql` L6954-7096.

**`treatment_plans`** (L18-27) — `id` varchar(50) PK (`TP-{TREATPLANID}` migrated; a client-generated UUID in the app), `patient_id`, `office_id` (nullable), `legacy_id`, `name` (`"Treatment Plan N"`), `status` varchar(20) (DB default `'Active'`; the app writes `'active'` — `FE:src/features/treatment-plans/TreatmentPlanPage.tsx` L320, `FE:src/features/procedures/procedureEntryService.ts` L146), `created_by`, `created_at`, `updated_at`. No `tenant_id`. The header is the legacy **Tx Plan ID** bucket (alternative plans = separate headers); it carries no dates, no provider, no totals. `DELETE` is a **hard delete** (`registry.py` L932). `treatment_service.CLOSED_PLAN_STATUSES` (L1192-1195) treats `completed`, `closed`, `inactive`, `archived`, `rejected`, `declined`, `cancelled` as closed, but no screen was found that writes them [I].

**`treatment_plan_items`** (L30-121) — `id` varchar(50) PK (`TPI-{APPTDYD}` migrated). No `tenant_id`, no `office_id`, no `patient_id` (reach them through `plan_id`).

| Group | Columns |
|---|---|
| Identity | `plan_id`, `procedure_code` (FK `procedure_codes.code`), `description`, `tooth`, `surface`, `quadrant`, `material_id` |
| Ordering | `priority` (legacy Order ID), `phase_id` (legacy Phase ID), `billing_order` |
| Lifecycle | `status` (§3.2), `status_before_scheduled`, `is_archived` (soft delete, hidden by default) |
| Dates | `diagnosed_date`, `accepted_date`, `scheduled_date`, `start_date`, `end_date`, `created_at`, `updated_at` (§3.3) |
| People | `provider_id` (performing provider, FK), `diagnosed_by` (free text — a provider id, or a Denticon `PROVIDERID` on migrated rows), `counselor_user_id` (treatment counselor, FK `users`), `created_by`, `updated_by` |
| Money | `fee`, `ucr_fee`, `discount`, `insurance_estimate` (primary), `sec_insurance_estimate`, `estimated_deductible`, `coverage_pct`, `coverage_rule_id`, `fee_schedule_id`, `fee_source`, `fee_effective_date`, `fee_override_reason` |
| Referral | `referral_id` (FK `referrals`), `referral_type` (`in` \| `out`) |
| Other | `notes`, `duration_minutes`, `update_end_date_at_posting`, `re_estimate_at_posting` |

**`treatment_plan_insurance_details`** (L139-160) — per item and insurance plan: `estimated_ins`, `estimated_pat`, `deductible`, `coverage_pct`, `annual_max_rem`, `preauth_number`, `preauth_date`, `preauth_expires`, `preauth_amount`, `preauth_status` (`sent` \| `closed`), `preauth_status_at`, `is_archived`. Written by re-estimate. No rows migrated (no export).

**`treatment_plan_item_icd_codes`** (L124-136) — item ↔ `icd_codes` with `ordinal`.

### 3.2 Item status model [V]

Enum `app/schemas/treatment.py` L30-33; rules `treatment_service.py`.

| `status` | Set by | Meaning | Pending? (`PENDING_EXCLUDED_STATUSES` L903) | Consumes benefit? (L1188-1190) | Proposed for case acceptance [I] |
|---|---|---|---|---|---|
| `diagnosed` (ORM default) | client | proposed / presented | yes | yes | presented, not accepted |
| `accepted` | client; also the fallback when a completing charge is voided (`RELEASED_STATUS` L116) or a booking is released with no remembered status | patient accepted | yes | yes | accepted |
| `unaccepted` | client (`rejected` folds to it) | patient declined | yes | yes | presented, rejected |
| `hold` | client | deferred | yes | yes | presented, undecided |
| `alternative` | client | alternative option for the same need | yes | no | exclude (would double count) |
| `referred_out` | client | leaves the practice | no | no | exclude |
| `internal_referral` | client | routed to another provider in the practice | yes | yes | presented |
| `external_referral` | client | leaves the practice | no | no | exclude |
| `scheduled` | **server** when an appointment line books the item (`schedule_item` L302-313); also settable by hand | on the schedule | yes (counted separately as `scheduled_count`) | yes | accepted |
| `completed` | **server only**, when a non-void charge references the item (`bind_item_to_charge` L212-226); a client write is refused with 422 `status_requires_charge` (L449-464) | treated | no | no | accepted |

Stored-value caveats: the DB default is `'Planned'` (`schema.sql` L7044) while the ORM default is `'diagnosed'`; migrated rows were written `Planned` / `Scheduled` / `Completed` / `Existing` (`s27b` L42-47). Reads fold legacy spellings through `LEGACY_ITEM_STATUS_MAP` (L903-928; `Existing` is not in the map), and `scripts/normalize_treatment_item_statuses.py` rewrites stored values. The server's pending rule compares the raw string, so report SQL should use `lower(btrim(status))`.

### 3.3 Dates on an item [V]

| Column | Type | Written by | Notes |
|---|---|---|---|
| `created_at` | timestamp | DB default | load time on migrated rows |
| `diagnosed_date` | date | client; the shared add-procedure path defaults it to the client's today (`FE:src/features/procedures/procedureEntryService.ts` L357); editable in Edit Treatment | the best "presented on" proxy; NULL on migrated rows |
| `accepted_date` | date | server `_stamp_accepted` (L603-610): office-local today the **first** time the status becomes `accepted`, unless the caller supplies a date | **not** stamped when an item goes straight to `scheduled` or `completed` |
| `scheduled_date` | date | server = date of the soonest live appointment that books the item; cleared when the last booking goes away (L316-339) | |
| `start_date` | date | client (planned start) | |
| `end_date` | date | server = the completing charge's `date_of_service` (only if blank, or always when `update_end_date_at_posting`); cleared when the charge is voided (L229-240) | "posted" marker used by the pending rule |
| `updated_at` | timestamp | CRUD engine | |

Not stored: a presentation event (who presented, when, to whom), a rejection date, a per-status timestamp, a plan-level acceptance date. Status history exists only as `audit_logs.details.before / after` for client PATCHes on `treatment-plan-items`; the server-driven transitions (`scheduled`, `completed`, release) happen inside an appointment or charge write and are not recorded as item changes [I].

### 3.4 Money on an item [V]

`fee` (priced by the server resolver when omitted; an explicit fee wins), `ucr_fee`, `discount`, `insurance_estimate` (primary only), `sec_insurance_estimate`, `estimated_deductible`. **Patient estimate is derived**: `fee − insurance_estimate` (`plan_report` L1436-1496, `enrich_service.enrich_treatment_plan`); the discount is reported separately and not subtracted. Since TX-MAX-1 the server re-nets a plan's lines against the annual maximum on every item write (`RENET_FIELDS` L1391-1394), so `insurance_estimate` is plan-consistent for app-era rows unless a user typed an override.

### 3.5 Links from an item [V]

| Link | Column | Semantics |
|---|---|---|
| Completed by a charge | `patient_procedures.treatment_plan_item_id` (indexed), plus plan-level `patient_procedures.treatment_plan_id` | the canonical planned → completed lineage; set by Post to Ledger (`post_item_to_ledger` L1056-1155) or by any charge that names the item. "Live" in the service = `is_void = false` (it does not test `is_archived`) |
| Booked on an appointment | `appointment_procedures.treatment_plan_item_id` (indexed), `appointment_procedures.treatment_plan_id`, `appointments.treatment_plan_id` | live = line `is_archived = false` AND appointment `is_archived = false AND is_cancelled = false` (`live_appointment_links` L248-277) |
| Consent | `patient_consents.plan_id` | a signed treatment consent is evidence of acceptance |
| Financing | `patient_payment_plans.treatment_plan_id` (indexed), `tx_plan_amt` | payment plan taken out for a plan |
| Referral | `referral_id`, `referral_type` | |
| Diagnosis | `treatment_plan_item_icd_codes` | |
| Chart | `chart_conditions.status = 'planned'` with the same code / tooth | charting twin, no FK |

Charges posted from a plan item get id `PP-{uuid7}` (L1127) — the **same prefix** payment-plan instalment charges use (`payment_plan_service.py` L336). The id prefix cannot tell the two apart.

### 3.6 What the migration loaded [V]/[D]

| Fact | Evidence |
|---|---|
| Plans are derived, not migrated: one `treatment_plans` row per distinct `TREATPLANID` found on an appointment-detail row; `name = 'Treatment Plan {id}'`, `status = 'Active'`, no `created_at`. 674 plans. | `s25_treatment_plans.py` L84-93; `docs/gen_migration_report.js` L170 |
| Items come from the same appointment-detail rows: `procedure_code`, `tooth`, `surface`, `fee`, `insurance_estimate`, `billing_order`, `status`, `priority = 1`, `diagnosed_by` = Denticon `PROVIDERID`. No dates, no `provider_id`, no counselor. 775 items on the dev DB (2026-10-03). | `s27b_treatment_plan_items.py` L80-113; `scripts/normalize_treatment_item_statuses.py` L12-14 |
| `provider_id` can be back-filled from `diagnosed_by` | `scripts/backfill_treatment_plan_item_providers.py` (opt-in inference modes) |
| Migrated charges carry no `treatment_plan_id` / `treatment_plan_item_id` | `s28_patient_procedures.py` L18-36 |
| Denticon `TREATPLAN`, `TREATPLAN_ARCHIVE`, `TREATPLANINSD` had no export file | `denticon_migration/source_to_table_map.md` rows 70-72; `s52_empty_tables_stubs.py` L26-29 |

### 3.7 Existing endpoints [V]

| Endpoint | Scope | Use |
|---|---|---|
| `GET /treatment-plans` | list; filters `patient_id`, `office_id`, `status`, `ins_plan_id`; read adds `patient_name`, `item_count`, `total_fee`, `est_insurance`, `est_patient` | not tenant-filtered by the engine (no `tenant_id`; see `be_platform.md` finding 4) |
| `GET /treatment-plan-items` | list; filters `plan_id`, `procedure_code`, `status`, `phase_id`, `provider_id`, `is_archived`, `tooth`, `material_id`, `counselor_user_id`, `referral_id`, `fee_schedule_id`; sort `priority`, `created_at`, `diagnosed_date`, `scheduled_date`; **no date-range and no office parameter**; tenant-scoped through the patient | `size` ≤ 200 |
| `GET /patients/{id}/treatment-plan-items` | one patient, all plans; `pending`, `include_completed`, `include_archived`, `status`, `procedure_code`; `size` ≤ 500 | |
| `GET /treatment-plan-items/pending-summary?patient_ids=` | ≤ 200 patients → `count`, `scheduled_count`, `total_fee` | the scheduler PT badge |
| `GET /treatment-plans/{id}/summary`, `/report` | one plan: totals, lines, primary insurance block, annual max remaining | print payload |
| `POST /treatment-plans/{id}/re-estimate`, `/book`; `POST /treatment-plan-items/{id}/post` | writes | |
| `GET /metadata/treatment-plan-rules` | status / referral / pre-auth vocabularies, the pending rule, the legacy status map | drive report filters from it |

### 3.8 What supports which metric

| Metric | Inputs | Migrated history | App-era data |
|---|---|---|---|
| Case acceptance % (by value) | `fee` of items presented in the period ÷ `fee` of those accepted | no | yes; "presented on" = `coalesce(diagnosed_date, created_at::date)`; "accepted" must be inferred for items that skipped `accepted` (§6.5) |
| Case acceptance % (by patient / plan) | distinct patients (or plans) with ≥ 1 accepted item ÷ presented | no | yes |
| Acceptance by provider / counselor | `provider_id`, `counselor_user_id` | no | `provider_id` mostly present (server defaults it, L532-554); counselor only when entered in Edit Treatment |
| Time to acceptance / schedule / completion | `accepted_date`, `scheduled_date`, `end_date` − `diagnosed_date` | no | yes, with the `accepted_date` caveat |
| Unscheduled treatment value | pending rule + no live booking | no | yes |
| Treatment-plan aging | today − presented date of pending items | no | yes |
| Scheduled production from plans | `appointment_procedures.fee` where `treatment_plan_item_id` is set | no | yes |
| Planned vs produced | item `fee` vs the completing charge's `fee` | no | yes |
| Pre-authorisation tracking | `treatment_plan_insurance_details.preauth_*` | no | yes |
| Same-day (unplanned) treatment | charges with `treatment_plan_item_id IS NULL` | cannot tell | yes — but a charge entered without choosing the plan item also lands here |

---

## 4. Ortho

### 4.1 Contract — `ortho_plans` [V]

Model `app/db/models/billing.py` L401-490; DDL `schema.sql` L3714-3790. One row per contract; `tenant_id`, `patient_id`, `office_id`, `created_office_id`, `is_active` (soft delete, hidden by default), `created_by` (legacy free text), `created_by_id`, `updated_by`, `created_at`, `updated_at`.

| Group | Columns |
|---|---|
| Treatment | `description`, `procedure_code` (the **periodic** billing code), `initial_procedure_code` (banding / comprehensive code), `pref_provider_id`, `insert_class`, `treat_start_date`, `treat_end_date`, `banding_date`, `tx_duration_months`, `months_remaining`, `remarks` |
| Totals | `total_ortho_amt`, `ins_share_amt`, `pat_share_amt` |
| Primary insurance column | `ins_plan_id`, `ins_setup_date`, `ins_plan_amount`, `ins_down_pay`, `ins_interval`, `ins_num_payments`, `ins_periodic_amt`, `ins_rem_payments`, `ins_rem_amt`, `ins_first_due_date`, `ins_months_remaining`, `ins_mon_claim_print_fee`, `ins_suppress_periodic_printing`, `ins_notes` |
| Secondary insurance column | `sec_ins_plan_id`, `sec_ins_setup_date`, `sec_ins_plan_amount`, `sec_ins_down_pay`, `sec_ins_interval`, `sec_ins_num_payments`, `sec_ins_periodic_amt`, `sec_ins_rem_payments`, `sec_ins_rem_amt`, `sec_ins_first_due_date`, `sec_ins_months_remaining`, `sec_ins_mon_claim_print_fee`, `sec_ins_suppress_periodic_printing`, `sec_ins_notes` |
| Patient column | `pat_setup_date`, `pat_amt_financed`, `pat_down_pay`, `pat_apr`, `pat_fin_charge`, `pat_interval`, `pat_num_payments`, `pat_periodic_amt`, `pat_rem_payments`, `pat_rem_amt`, `pat_first_due_date`, `pat_notes`, `financial_disclosure` |
| Payment method | `payment_code`, `payment_token_id`, `card_holder_name`, `card_last4`, `card_exp_month`, `card_exp_year`, `post_down_payment_with_card` |

List endpoint `GET /ortho-plans`: filters `patient_id`, `is_active`, `pref_provider_id`, `ins_plan_id`, `office_id`; ranges `banding_date`, `treat_start_date` (`registry.py` L1237-1251).

**Maintenance caveat** [V]: `*_rem_payments`, `*_rem_amt`, `months_remaining`, `ins_months_remaining` are computed by the frontend when the contract is saved; no service updates them when an instalment is posted (grep of `rem_payments` / `months_remaining` in `app/services` = schedule generation, contract print and the claim form only). Derive "remaining" from the instalment rows and the dates.

### 4.2 Charge schedule — three instalment tables [V]

| Table | Contract column | Link to the contract | `ledger_id` |
|---|---|---|---|
| `patient_plan_installments` (`billing.py` L493-528) | patient side of an ortho contract **and** every regular payment plan (`plan_side` `patient` \| `ins` \| `sec_ins`) | exactly one of `ortho_plan_id`, `payment_plan_id` | varchar(50) |
| `patient_ins_payment_plans` (L328-351) | primary insurance | `ortho_plan_id` (plus migrated free-text `legacy_plan_id`) | varchar(20) |
| `patient_sec_ins_payment_plans` (L354-375) | secondary insurance | `ortho_plan_id` | varchar(20) |

Common columns: `tenant_id`, `patient_id`, `periodic_order`, `periodic_date` (due date), `periodic_amt`, `plan_amount`, `down_payment`, `rem_total_amt`, `rem_payments` (schedule projections written at generation), `is_billed`, `billing_code`, `ledger_id`, `created_at`.

Posting (`payment_plan_service._post_row` L276-355): creates a `patient_procedures` charge with `id = 'PP-' + uuid7`, `procedure_code` = override → instalment `billing_code` → contract periodic code, `date_of_service` = override → `periodic_date` → today (UTC), `provider_id` = override → `ortho_plans.pref_provider_id` → `patients.preferred_provider_id`, `office_id` = override → contract office → patient home office, `fee` = `periodic_amt`; then sets `is_billed = true`, `ledger_id = charge id`. `POST /payment-plans/post-due` sweeps every unbilled instalment due on or before a date (`dry_run` supported) — nothing in the repository schedules it (`be_platform.md` finding 1).

Consequences for reports:

- Ortho charge schedule (due / billed / overdue) = the three tables filtered by `ortho_plan_id`.
- The instalment → ledger link is `ledger_id`; the charge carries **no** `ortho_plan_id`. Reverse lookup = `patient_procedures.id IN (SELECT ledger_id …)`.
- The 39-character charge id does not fit `varchar(20)` on the two insurance tables (TL;DR 16) [I].
- Which table is which contract: the **ortho** contract is `ortho_plans`; the **regular** contract is `patient_payment_plans` (`billing.py` L271-325: `plan_type` `regular` \| `ortho`, `setup_date`, `amt_financed`, `down_payment`, `apr`, `fin_charge`, `interval_type`, `num_payments`, `periodic_amt`, `first_due_date`, `total_of_payments`, `treatment_plan_id`, `billing_code`). `patient_reg_plans` is an older regular-plan store (empty) that the Overview / print code still reads as a fallback (`print_service.py` L605-606, L826-828: regular = the first `patient_payment_plans` row whose `plan_type` does not start with `o`, else `patient_reg_plans`; ortho = `ortho_plans`). A "patients on a payment plan" report must read all three.

### 4.3 Other ortho facts [V]

| Need | Source | Status |
|---|---|---|
| Banding date | `ortho_plans.banding_date`; claim `insurance_claims.ortho_appliance_date` | app-era |
| Debond date | none; nearest = `ortho_plans.treat_end_date` (planned end) | missing |
| Months in treatment | derive from `coalesce(banding_date, treat_start_date)` to today; stored `tx_duration_months` is the planned duration | derive |
| Months remaining | derive from `treat_end_date`, or count unbilled instalments; stored fields are stale | derive |
| Treatment card / visit log / appliance / wire sequence | none. `providers.ortho_questionnaire_template` and the "Setup - Ortho Questionnaire" rights exist with no data model | missing |
| Ortho flags on transactions | no flag on `patient_procedures`; use `procedure_codes.is_ortho`, CDT `D8%`, or the instalment `ledger_id` set; account settings `ortho_visit_code`, `ortho_claim_fee_mode` (`account.py` L85-86) | derive |
| Ortho benefit | `patient_insurance.ortho_remaining` (lifetime, never reset), `insurance_plans.ortho_max` | exists |
| Ortho provider / office | `providers.is_ortho_provider`, `office_advanced_settings.is_ortho` | config, default false |
| Migrated ortho contracts | none — `PATORTHOPLAN.txt`, `PatContractBilling.txt`, `PatInsContractBilling.txt`, `PATSECINSCONTRACTBILLING.txt`, `PatRegPlan.txt` were empty | `s52_empty_tables_stubs.py` L15-19 |

---

## 5. Clinical activity usable in reports

### 5.1 Inventory [V]

| Entity | Table (model) | Business date | Provider | Office | Author / audit | Soft delete | Migrated [D] |
|---|---|---|---|---|---|---|---|
| Completed procedures | `patient_procedures` (`clinical.py` L30-134) | `date_of_service` | `provider_id` (NOT NULL), `hygienist_id` | `office_id` (NOT NULL) | `created_by`, `created_by_legacy`, `updated_by` | `is_void` (+ `is_archived` = source archive file) | 1,372,534 |
| Charted conditions | `chart_conditions` (L204-248) | `activity_date` | `provider_id` | `office_id` | `updated_by` only | `is_inactive` | 77,498 |
| Progress notes | `progress_notes` (L251-292) | `note_date` | **none** | `office_id` (nullable) | `created_by`, `updated_by`, `signed_by` / `signed_at`, `struck_off_by` / `struck_off_at` | `is_deleted`; `is_struck_off` | 35,286 |
| Perio exams | `perio_exams` (L295-320) + `perio_exam_details` (L323-358) | `exam_date` | `provider_id` (nullable; NULL on migrated) | `office_id` | `created_by`, `updated_by` | `is_voided` | 2,844 / 78,284 |
| Prescriptions | `prescriptions` (L361-392) | `rx_date` | `provider_id` | `office_id` | `created_by`; alert acknowledgement block | `is_active` (strike-off) | 38,093 |
| Lab cases | columns on `appointments` + `labs` | appointment `date`, `lab_sent_on`, `lab_due_on`, `lab_received_on` | appointment `provider_id`; `lab_dds` text | `office_id` | appointment audit | appointment `is_archived` | see `be_data_scheduling.md` §7 |
| Medical alerts | `patient_alerts`, `patient_medical_alerts` (§1.7) | — | — | — | `created_by` | `is_active` | 46,680 / 0 |
| Consents | `patient_consents` (+ `consent_signatures`) | `signed_at` | countersigner `signer_provider_id` | none | `created_by`, `signed_by` | `is_deleted` | 0 |
| Documents | `patient_documents` | `created_at` | — | `office_id` | `created_by` | `is_deleted` | 0 |
| Letters | `letter_batch_runs` + `letter_batch_items`; `letter_templates` | `created_at`, `finished_at` | — | `office_id` | `created_by` | — | templates only (153 [D]) |
| SMS / e-mail | `sms_messages`, `email_messages` | `sent_at`, `reply_received_on` | — | `office_id` | `created_by` | — | 5,425 texts; see `be_data_scheduling.md` §5 |

### 5.2 Completed procedures as clinical facts [V]

Columns relevant to clinical (non-money) reports: `procedure_code` → `procedure_codes` (`category` display label, `coverage_category`, `is_ortho`, `recall_interval`, `recall_unit`, `requires_xray` / `requires_perio_chart` / `requires_photo` / `requires_attachment`), `tooth`, `surface`, `quadrant`, `material_id`, `appointment_id`, `treatment_plan_id`, `treatment_plan_item_id`, `duration_minutes`, `quantity`, `diagnosis_pointers`, `notes`.

- Every row is a posted charge — there is no "planned" or "in progress" state here; planned work lives in `treatment_plan_items`.
- Non-clinical codes (payment-plan periodic billing codes, account codes) are stored as charges too; a procedure-count report must restrict to CDT codes (`procedure_code LIKE 'D%'`) or a category list [I].
- Migrated rows carry `tooth` and `surface` but not `quadrant`, `hygienist_id`, or any plan link (`s28` L18-36); 87,585 source charges (6 %) were skipped because their code was not in the catalog [D] `docs/gen_migration_report.js` L215.
- `procedure_codes` has no `tenant_id` (the code is the PK).
- Supporting-record readiness per charge already exists as endpoints (`/patient-procedures/{id}/readiness`, `/insurance-claims/{id}/readiness`) — reusable for a "procedures missing x-ray / perio chart / narrative" report.

### 5.3 Progress notes [V]

| Fact | Detail |
|---|---|
| Columns | `patient_id`, `office_id`, `note_date` (date of service), `notes` (plain, searchable), `notes_html`, `tooth`, `surface`, `region`, `signed_by`, `signed_at`, `content_hash`, `is_struck_off`, `struck_off_at`, `struck_off_by`, `drawing_strokes`, `drawing_doc_id`, `is_deleted`, `created_by`, `updated_by`, `created_at`, `updated_at` |
| No link to | provider, appointment, procedure, treatment-plan item. A note belongs to a patient and a date only |
| Author | `created_by` (user). Provider attribution only through `providers.user_id` (`identity.py` L249), and most migrated providers have no linked user (`patients.py` L305-307 comment) |
| Signed | `signed_at IS NOT NULL`; `signed_by` = the caller, or another user verified by username + password (`sign_progress_note` L267-296). A signature row may also exist in `patient_signatures.progress_note_id`. Derived `signature_status` flags an edit after signing |
| Locked | not stored. Computed: signed, or the office-local date of `created_at` is before today (`_note_is_locked` L128-136; lock instant `note_lock_instant` L118-125). Text fields (`_TEXT_FIELDS` L59) reject edits once locked; `note_date` stays correctable until signed |
| Struck off | `is_struck_off` + audit stamps; a struck-off note should not satisfy "note present" |
| List endpoint | `GET /progress-notes`: filters `patient_id`, `office_id`, `is_struck_off`; range `note_date`; search `notes`. No filter for signed / unsigned, author, or "locked" |
| Migrated rows | `note_date` = `ACTDATE`, body decoded from the `~^^~` export encoding; no `created_by`, no signature, `created_at` = load time (so every migrated note is "locked" and "unsigned") |
| Attachments | `progress_note_attachments` (`progress_note_id`, file metadata, `is_deleted`) |

### 5.4 Perio, prescriptions, charting [V]

- Perio: one `perio_exams` row per exam date; `perio_exam_details` one row per tooth with six-site `pd`, `fgm`, `mgj`, `cal`, `bleed`, `supp`, `furc` and `mobility_buccal` / `mobility_lingual`. `GET /perio-exams/compare` returns per-exam summaries (teeth charted, sites measured, percentages) for **one patient**; nothing aggregates across patients. `perio_chart_activity` is a deprecated, empty legacy table.
- Prescriptions: `drug_name`, `dispense`, `sig`, `refills`, `is_as_written`, `library_rx_id`, `dosespot_rx_id` / `dosespot_status`, and the alert-acknowledgement audit (`alerts_acknowledged`, `acknowledged_alerts`, `alert_warnings`, `alerts_acknowledged_at` / `_by`). List filters `patient_id`, `provider_id`, `is_active`, `office_id`; **no `rx_date` range** on the endpoint.
- Chart conditions: `status` ∈ `existing` \| `completed` \| `planned` \| `condition`, `condition_code`, `procedure_code`, `tooth`, `surface`, `grade` (mobility), `tooth_status`. Useful for prevalence lists (missing teeth, implants, watch), not for production.

### 5.5 Letters, consents, signatures [V]

- `POST /letters/render` merges one template for one patient and returns HTML; it writes nothing (`letter_service.render_template` L674-728). The only trace is the `audit_logs` row for the POST [I]. A letter becomes a chart record only if the client then uploads it as a `patient_documents` row with `context = 'letter'`.
- `POST /letters/render-batch` writes `letter_batch_runs` (`template_id`, `office_id`, `status`, `requested`, `processed`, `succeeded`, `failed`, `options`, `created_by`, `finished_at`) and one `letter_batch_items` row per patient (`status` `rendered` \| `skipped` \| `failed`, `unresolved_tokens`, optional `rendered_html`). Inline, ≤ 500 patients. This is the model for recall / collection / birthday sweeps and the only "letters sent" log.
- `letter_templates.letter_type`: `A` appointment, `R` recall, `C` collection [D] (`denticon_migration/migration_mapping_complete.md` L487); `postcard_templates.card_type` similar. No label-printing model exists.
- `signature_audit_events` (`event`, `entity_type`, `entity_id`, `patient_id`, `actor_id`, `occurred_at`, device columns) is an append-only signature log — a ready-made source for a signature audit report.

---

## 6. Report logic (SQL sketches, PostgreSQL)

Not executed. `:tenant`, `:from`, `:to`, `:as_of`, `:n` are parameters. Shared predicates:

| Id | Predicate | Source |
|---|---|---|
| P0 | tenant scope: join `patients pt ON pt.tenant_id = :tenant` for every table without `tenant_id` | TL;DR 21 |
| P1 | live charge: `NOT pp.is_void AND NOT pp.is_archived` | the predicate used by the balance, ledger, statement and existing report services; `be_data_financial.md` |
| P2 | clinical charge: P1 `AND pp.procedure_code LIKE 'D%'` | [I] — confirm the non-clinical code list |
| P3 | live appointment: `NOT a.is_archived AND NOT a.is_cancelled AND NOT a.is_blocked` | `be_data_scheduling.md` §1.3 |
| P4 | app-era row: `legacy_id IS NULL` on `patients`, `treatment_plans`, `progress_notes`, `perio_exams`, `prescriptions`, `chart_conditions`, `patient_alerts`, `referrals`, `appointments`, `patient_procedures`. `treatment_plan_items` has no `legacy_id` — migrated ids start with `TPI-`, or test the parent plan | models; `s27b` L80 |

Shared CTE used below:

```sql
WITH visit AS (                       -- one row per patient per day seen
  SELECT pp.patient_id, pp.date_of_service AS visit_date
  FROM patient_procedures pp
  WHERE NOT pp.is_void AND NOT pp.is_archived AND pp.procedure_code LIKE 'D%'
  GROUP BY pp.patient_id, pp.date_of_service
), pv AS (                            -- per-patient visit summary
  SELECT patient_id, min(visit_date) AS first_visit, max(visit_date) AS last_visit, count(*) AS visit_days
  FROM visit GROUP BY patient_id
)
```

### 6.1 New patients by period and source

```sql
SELECT date_trunc('month', pv.first_visit)::date AS period,
       pt.home_office_id,
       COALESCE(rt.description, NULLIF(btrim(pt.referral_type), ''), '(none)') AS source_type,
       COALESCE(rs.practice_name,
                NULLIF(btrim(concat_ws(', ', rs.last_name, rs.first_name)), ''),
                NULLIF(btrim(pt.referred_by), ''), '(none)')                 AS source_name,
       count(*) AS new_patients
FROM pv
JOIN patients pt ON pt.id = pv.patient_id AND pt.tenant_id = :tenant
LEFT JOIN LATERAL (SELECT d.description FROM definitions d            -- migrated REFTYPE code -> label, one row
                   WHERE d.tenant_id = pt.tenant_id AND d.group_code = 'REFTYPE' AND d.key1 = pt.referral_type
                   ORDER BY d.is_active DESC, d.sort_order NULLS LAST, d.id LIMIT 1) rt ON true
LEFT JOIN referrals rs ON rs.tenant_id = pt.tenant_id                 -- migrated id -> source row
                      AND rs.legacy_id = btrim(pt.referred_by)
WHERE pv.first_visit BETWEEN :from AND :to
GROUP BY 1, 2, 3, 4;
```

Variants: *registration date* = `pt.created_at >= :from AND pt.created_at < :to + 1` with P4 (the existing `/reports/summary` figure, valid for app-era rows only); *new patients via appointments* = first live appointment per patient, or `appointments.is_new_patient` (app-era); *online* = `EXISTS booking_requests br WHERE br.patient_id = pt.id AND br.is_new_patient`. Attribute the new patient to the office of the first visit (`min(pp.office_id)` on that day) when the report is by treating office rather than home office.

### 6.2 Active patients and attrition

```sql
-- active patients as of :as_of with an :n-month lookback (18 or 24)
SELECT count(DISTINCT pp.patient_id) AS active_patients
FROM patient_procedures pp
JOIN patients pt ON pt.id = pp.patient_id
WHERE pt.tenant_id = :tenant AND pt.is_active
  AND NOT pp.is_void AND NOT pp.is_archived AND pp.procedure_code LIKE 'D%'
  AND pp.date_of_service >  CAST(:as_of AS date) - make_interval(months => :n)
  AND pp.date_of_service <= :as_of;

-- attrition over the 12 months ending :as_of
WITH base AS (   -- active at the start of the year
  SELECT DISTINCT pp.patient_id
  FROM patient_procedures pp JOIN patients pt ON pt.id = pp.patient_id
  WHERE pt.tenant_id = :tenant AND NOT pp.is_void AND NOT pp.is_archived AND pp.procedure_code LIKE 'D%'
    AND pp.date_of_service >  CAST(:as_of AS date) - interval '12 months' - make_interval(months => :n)
    AND pp.date_of_service <= CAST(:as_of AS date) - interval '12 months'),
seen AS (
  SELECT DISTINCT pp.patient_id FROM patient_procedures pp
  WHERE NOT pp.is_void AND NOT pp.is_archived AND pp.procedure_code LIKE 'D%'
    AND pp.date_of_service > CAST(:as_of AS date) - interval '12 months' AND pp.date_of_service <= :as_of),
booked AS (
  SELECT DISTINCT a.patient_id FROM appointments a
  WHERE NOT a.is_archived AND NOT a.is_cancelled AND NOT a.is_blocked AND a.date > :as_of)
SELECT count(*) AS base_patients,
       count(*) FILTER (WHERE s.patient_id IS NULL AND b.patient_id IS NULL) AS lost_patients
FROM base
LEFT JOIN seen s USING (patient_id)
LEFT JOIN booked b USING (patient_id);       -- attrition % = lost / base
```

Related: annual value per active patient = production ÷ active patients; patient lifetime = `pv.last_visit − pv.first_visit`; net patient flow = new − lost.

### 6.3 Patient lists by criteria

| Criterion | Predicate (alias `pt`) | Caveat |
|---|---|---|
| Birthday month / range | `extract(month FROM pt.dob) = :m`, or `to_char(pt.dob, 'MMDD') BETWEEN :mmdd_from AND :mmdd_to` (use OR for a range that wraps the year end) | needs an expression index (§7.3) |
| Age range | `pt.dob >  CAST(:as_of AS date) - make_interval(years => :max_age + 1) AND pt.dob <= CAST(:as_of AS date) - make_interval(years => :min_age)`; display `extract(year FROM age(:as_of, pt.dob))` | sargable on `dob` |
| ZIP | `left(regexp_replace(pt.zip, '\D', '', 'g'), 5) = ANY(:zips)` | raw text |
| City / state | `lower(btrim(pt.city)) = ANY(:cities)` | free text; state format unverified |
| Gender | `upper(left(pt.gender, 1)) = :g` | §1.2 |
| Status | `pt.is_active = :active` | includes deleted (§1.3) |
| Patient type | §1.4 predicate; tags `COALESCE(pt.patient_types::jsonb, '[]') ? :code OR upper(btrim(pt.patient_type)) = :code` | |
| Home office / office group | `pt.home_office_id = ANY(:office_ids)`; group via `offices.office_group_id` | no office groups were migrated (`OGROUP.txt` empty) |
| Seen at office in a period | `EXISTS (SELECT 1 FROM patient_procedures pp WHERE pp.patient_id = pt.id AND P1 AND pp.office_id = ANY(:office_ids) AND pp.date_of_service BETWEEN :from AND :to)` | legacy "Patients Seen" |
| Provider / hygienist | `pt.preferred_provider_id = :prov` (app-era); otherwise the provider of the most recent visit: `LATERAL (SELECT pp.provider_id … ORDER BY pp.date_of_service DESC LIMIT 1)` | not migrated |
| Insurance carrier / plan / employer | `EXISTS (SELECT 1 FROM patient_insurance pi JOIN insurance_plans ip ON ip.id = pi.ins_plan_id WHERE pi.patient_id = pt.id AND pi.is_active AND pi.legacy_plan_type = 'D' AND pi.insurance_type = 'primary' AND ip.carrier_id = ANY(:carriers))` | "no insurance" = `NOT EXISTS` an active slot |
| Last visit before / after | `pv.last_visit < :date` (LEFT JOIN `pv`; NULL = never seen) | |
| No future appointment | `NOT EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = pt.id AND P3 AND a.date >= :as_of)` | |
| Balance over X | no stored balance; compute one grouped aggregate per patient set as in `be_data_financial.md` (never call the per-patient balance service in a loop — ~23 s cold for one patient [D] `FE:docs/payment-plans/payment_plans_backend_devreport.md` PP-5) | |
| Account / guarantor | `pt.account_id`, `accounts.account_no`, guarantor name through `guarantor_patient_id` / `guarantor_party_id` | §1.6 |
| On a payment plan | `EXISTS patient_payment_plans (is_active) OR EXISTS ortho_plans (is_active)` | legacy "Patients on Payment Plan" |
| Needs information update | tag `UP` (§1.4 form) joined to upcoming appointments | legacy "Update Patient Insurance (Conversion) List - By Appointment" [I] |
| Medical alert | `EXISTS patient_medical_alerts ma WHERE ma.patient_id = pt.id AND ma.is_active AND ma.response = 'yes' AND ma.alert_code = :code` or an active `patient_alerts` row | |
| Contactable | `NOT pt.no_correspondence AND NOT pt.no_auto_email AND pt.email IS NOT NULL` (e-mail); `NOT pt.no_auto_sms AND pt.sms_opt_out_at IS NULL` (text) | always apply on outreach lists |

### 6.4 Referral analysis

```sql
WITH src AS (
  SELECT pt.id AS patient_id, rs.id AS referral_id, rs.cost,
         COALESCE(rs.practice_name, NULLIF(btrim(concat_ws(', ', rs.last_name, rs.first_name)), ''),
                  NULLIF(btrim(pt.referred_by), ''), '(none)') AS source_name,
         COALESCE(NULLIF(btrim(pt.referral_type), ''), rs.reason_code, '(none)') AS source_type_raw
  FROM patients pt
  LEFT JOIN referrals rs ON rs.tenant_id = pt.tenant_id AND rs.legacy_id = btrim(pt.referred_by)
  WHERE pt.tenant_id = :tenant)
SELECT s.source_type_raw, s.source_name, s.referral_id, max(s.cost) AS source_cost,
       count(DISTINCT s.patient_id) FILTER (WHERE pv.first_visit BETWEEN :from AND :to) AS new_patients,
       COALESCE(sum(pp.fee) FILTER (WHERE pp.date_of_service BETWEEN :from AND :to), 0) AS production_in_period,
       COALESCE(sum(pp.fee), 0) AS lifetime_production
FROM src s
LEFT JOIN pv ON pv.patient_id = s.patient_id
LEFT JOIN patient_procedures pp ON pp.patient_id = s.patient_id AND NOT pp.is_void AND NOT pp.is_archived
GROUP BY 1, 2, 3;
```

Collections per source = the same grouping over the payment stores (`be_data_financial.md`). ROI = (production or collections) ÷ `source_cost`; `cost` has no period, so ROI is only meaningful per source lifetime or with a new cost-by-period table. Referred-out report = `patients.referred_to` / `referral_to_date` UNION items with `lower(status) IN ('referred_out', 'external_referral', 'internal_referral')` or `referral_type = 'out'` joined to `referrals` on `referral_id`. Campaign report = first live appointment per patient joined on `appointments.campaign_id = campaigns.code AND campaigns.tenant_id = :tenant`.

### 6.5 Case acceptance

```sql
WITH item AS (
  SELECT i.id, tp.patient_id, i.plan_id,
         COALESCE(tp.office_id, pt.home_office_id) AS office_id,
         i.provider_id, i.counselor_user_id,
         lower(btrim(i.status)) AS st,
         COALESCE(i.diagnosed_date, i.created_at::date) AS presented_on,
         i.fee, i.insurance_estimate, i.fee - i.insurance_estimate AS patient_estimate,
         ch.first_dos,
         (lower(btrim(i.status)) IN ('accepted', 'scheduled', 'completed')
            OR i.accepted_date IS NOT NULL OR ch.first_dos IS NOT NULL) AS is_accepted,
         COALESCE(i.accepted_date, i.scheduled_date, ch.first_dos, i.end_date) AS accepted_on
  FROM treatment_plan_items i
  JOIN treatment_plans tp ON tp.id = i.plan_id
  JOIN patients pt ON pt.id = tp.patient_id AND pt.tenant_id = :tenant
  LEFT JOIN LATERAL (SELECT min(pp.date_of_service) AS first_dos FROM patient_procedures pp
                     WHERE pp.treatment_plan_item_id = i.id AND NOT pp.is_void AND NOT pp.is_archived) ch ON true
  WHERE NOT i.is_archived
    AND tp.legacy_id IS NULL                                   -- app-era plans only (TL;DR 13)
    AND lower(btrim(i.status)) NOT IN ('alternative', 'referred_out', 'external_referral'))
SELECT date_trunc('month', presented_on)::date AS period, office_id, provider_id,
       sum(fee)                                   AS presented_value,
       sum(fee) FILTER (WHERE is_accepted)        AS accepted_value,
       round(100.0 * sum(fee) FILTER (WHERE is_accepted) / NULLIF(sum(fee), 0), 1) AS acceptance_pct_by_value,
       count(DISTINCT patient_id)                             AS patients_presented,
       count(DISTINCT patient_id) FILTER (WHERE is_accepted)  AS patients_accepting
FROM item
WHERE presented_on BETWEEN :from AND :to
GROUP BY 1, 2, 3;
```

Design notes [I]: (a) this is a **current-state** measure — an item accepted and later set back to `unaccepted` counts as not accepted, because no status history exists; (b) "accepted within N days" uses `accepted_on − presented_on`; (c) treatment posted without a plan item never enters the denominator, which inflates acceptance in practices that do not plan before treating; (d) by-plan and by-patient variants need the same `is_accepted` flag aggregated with `bool_or`; (e) use `ucr_fee` instead of `fee` for a gross (UCR) variant.

### 6.6 Unscheduled treatment value and plan aging

```sql
SELECT tp.patient_id, COALESCE(tp.office_id, pt.home_office_id) AS office_id, i.provider_id,
       count(*) AS items, sum(i.fee) AS fee, sum(i.insurance_estimate) AS est_insurance,
       sum(i.fee - i.insurance_estimate) AS est_patient,
       min(COALESCE(i.accepted_date, i.diagnosed_date, i.created_at::date)) AS oldest_item_date
FROM treatment_plan_items i
JOIN treatment_plans tp ON tp.id = i.plan_id
JOIN patients pt ON pt.id = tp.patient_id AND pt.tenant_id = :tenant
WHERE NOT i.is_archived AND i.end_date IS NULL                                   -- the server pending rule …
  AND lower(btrim(COALESCE(i.status, ''))) NOT IN ('completed', 'referred_out', 'external_referral')
  AND NOT EXISTS (SELECT 1 FROM patient_procedures pp
                  WHERE pp.treatment_plan_item_id = i.id AND NOT pp.is_void)
  AND lower(btrim(COALESCE(i.status, ''))) <> 'scheduled'                         -- … minus what is booked
  AND NOT EXISTS (SELECT 1 FROM appointment_procedures ap
                  JOIN appointments a ON a.id = ap.appointment_id
                  WHERE ap.treatment_plan_item_id = i.id AND NOT ap.is_archived
                    AND NOT a.is_archived AND NOT a.is_cancelled)
GROUP BY 1, 2, 3;
```

Two lists are worth separating: *accepted but unscheduled* (`status = 'accepted'` — the call list) and *all unscheduled* (adds `diagnosed`, `hold`, `unaccepted`, `internal_referral`; decide whether `alternative` belongs). Aging buckets on `:as_of − COALESCE(accepted_date, diagnosed_date, created_at::date)`: 0-30 / 31-60 / 61-90 / 91-180 / 181+. Add `pt.is_active` and the "contactable" predicate for outreach.

### 6.7 Missing and unsigned progress notes

```sql
WITH seen AS (               -- one row per patient, day, treating provider with clinical work
  SELECT pp.patient_id, pp.date_of_service AS dos, pp.provider_id, min(pp.office_id) AS office_id,
         count(*) AS procedures, sum(pp.fee) AS production
  FROM patient_procedures pp
  JOIN patients pt ON pt.id = pp.patient_id AND pt.tenant_id = :tenant
  WHERE NOT pp.is_void AND NOT pp.is_archived AND pp.procedure_code LIKE 'D%'
    AND pp.date_of_service BETWEEN :from AND :to
  GROUP BY pp.patient_id, pp.date_of_service, pp.provider_id)
SELECT s.*
FROM seen s
WHERE NOT EXISTS (SELECT 1 FROM progress_notes n
                  WHERE n.patient_id = s.patient_id AND n.note_date = s.dos
                    AND NOT n.is_deleted AND NOT n.is_struck_off);

-- unsigned notes (app-era only: every migrated note is unsigned)
SELECT n.id, n.patient_id, n.office_id, n.note_date, n.created_by, n.created_at
FROM progress_notes n
JOIN patients pt ON pt.id = n.patient_id AND pt.tenant_id = :tenant
WHERE n.legacy_id IS NULL AND NOT n.is_deleted AND NOT n.is_struck_off
  AND n.signed_at IS NULL AND n.note_date BETWEEN :from AND :to;
```

Limits [I]: the match is per patient-day, not per provider (two providers treating the same patient on one day are both satisfied by one note). A provider-accurate variant adds `AND (n.created_by = pr.user_id OR n.signed_by = pr.user_id)` with `providers pr ON pr.id = s.provider_id` and is valid only where `pr.user_id IS NOT NULL`. The visit basis can be swapped for checked-out appointments on app-era data. Decide which codes are exempt (for example, radiographs only).

### 6.8 Ortho status lists

```sql
SELECT o.id AS ortho_plan_id, o.patient_id, o.office_id, o.pref_provider_id,
       o.banding_date, o.treat_start_date, o.treat_end_date,
       (extract(year  FROM age(:as_of, COALESCE(o.banding_date, o.treat_start_date))) * 12
      + extract(month FROM age(:as_of, COALESCE(o.banding_date, o.treat_start_date))))::int AS months_in_treatment,
       CASE WHEN o.treat_end_date IS NOT NULL THEN
            GREATEST(0, (extract(year FROM age(o.treat_end_date, :as_of)) * 12
                       + extract(month FROM age(o.treat_end_date, :as_of)))::int) END AS months_remaining,
       o.total_ortho_amt, o.ins_share_amt, o.pat_share_amt,
       x.unbilled_count, x.unbilled_amount, x.overdue_count, x.next_due_date
FROM ortho_plans o
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE NOT u.is_billed)                                AS unbilled_count,
         sum(u.periodic_amt) FILTER (WHERE NOT u.is_billed)                     AS unbilled_amount,
         count(*) FILTER (WHERE NOT u.is_billed AND u.periodic_date < :as_of)   AS overdue_count,
         min(u.periodic_date) FILTER (WHERE NOT u.is_billed)                    AS next_due_date
  FROM (SELECT is_billed, periodic_amt, periodic_date FROM patient_plan_installments     WHERE ortho_plan_id = o.id
        UNION ALL
        SELECT is_billed, periodic_amt, periodic_date FROM patient_ins_payment_plans     WHERE ortho_plan_id = o.id
        UNION ALL
        SELECT is_billed, periodic_amt, periodic_date FROM patient_sec_ins_payment_plans WHERE ortho_plan_id = o.id) u
) x ON true
WHERE o.tenant_id = :tenant AND o.is_active;
```

Other lists: patients flagged ortho (§1.4) **without** an active contract; contracts past `treat_end_date` still active (debond due); ortho production = P1 `AND (pc.is_ortho OR pp.procedure_code LIKE 'D8%')` with `procedure_codes pc`; contract billing posted = `patient_procedures.id IN (SELECT ledger_id FROM patient_plan_installments WHERE ortho_plan_id IS NOT NULL AND is_billed)`.

### 6.9 Pitfalls

| # | Pitfall | Consequence if ignored |
|---|---|---|
| 1 | `patients.responsible_party_id` is an overloaded string (RP id, patient id, or Denticon RPID) | a join attaches patients to the wrong family; use `account_id` and the typed guarantor columns |
| 2 | `chart_no` is not unique; family members share it | duplicate or merged rows when used as a key or in a `GROUP BY` |
| 3 | `created_at` on migrated patients, referrals, plans, items, notes, exams, prescriptions, alerts = the load timestamp | a huge false spike of "new" records on the migration date; "created date" criteria are valid only where `legacy_id IS NULL` |
| 4 | `is_active = false` on a patient means inactive **or** deleted | deleted charts appear in inactive-patient lists |
| 5 | Soft-delete flags differ per table: `is_archived` (items, plan insurance details, appointments), `is_void` (procedures), `is_deleted` (notes, documents, consents), `is_voided` (perio), `is_inactive` (chart conditions), `is_active` (alerts, recalls, prescriptions, contracts, signatures); `treatment_plans`, `referrals`, `account_notes` are hard-deleted | wrong counts; deleted plans and sources leave no trace outside `audit_logs` |
| 6 | Legacy and app vocabularies share one column (§1.2); treatment item status may be capitalised or a legacy letter code | split categories; missed rows in status filters |
| 7 | Three meanings of `referral_type` (§2.2) | wrong filters |
| 8 | `patients.referred_by` is a string match to `referrals.legacy_id` | app-era patients and renamed sources fall into "(none)" |
| 9 | Tables without `tenant_id` (TL;DR 21) | cross-tenant rows unless `patients` is joined |
| 10 | Items have no office; `treatment_plans.office_id` is nullable | office filters silently drop rows unless falling back to the patient's home office |
| 11 | `accepted_date` is NULL for items that were never set to `accepted` | acceptance under-reported when measured on the date column alone |
| 12 | The `PP-` id prefix is shared by plan-posted charges and contract instalment charges | wrong "contract billing" totals |
| 13 | Contract "remaining" columns on `ortho_plans` / `patient_payment_plans` are not maintained | stale remaining balances |
| 14 | `definitions` can hold several rows per `key1` | label joins multiply rows |
| 15 | Two "last / next visit" derivations already exist (one counts cancelled appointments) | figures differ between the Overview, letters and any new report unless one definition is adopted |
| 16 | `patient_types` is `json`, not `jsonb` | `?` / `@>` fail without a cast; no GIN index possible as is |
| 17 | Account-level notes and signatures sit on one representative member of a migrated account | per-patient counts mislead |
| 18 | Dates are mixed: business dates are office-local `date`; timestamps are naive UTC; `accepted_date` is the office-local day | off-by-one at day boundaries when a timestamp is cast to a date without the office time zone |

---

## 7. Data gaps and indexes

### 7.1 Data gaps

| # | Gap | Blocks | Suggested fix [I] |
|---|---|---|---|
| G1 | No real creation / first-visit date on migrated patients; `first_visit` / `last_visit` / `next_recall` unmaintained | new-patient trend, retention, recall lists | maintain `first_visit` / `last_visit` from charges (trigger, write hook or nightly job) and back-fill from history; restore `created_at` from the source if the export has it |
| G2 | No patient status history, inactivation date or reason; delete = inactive | attrition analysis, audit lists | `patient_status_events`, or `inactivated_at` / `inactive_reason` / `deleted_at` columns |
| G3 | No typed ortho flag; mixed `patient_type` vocabulary | General / Ortho report criterion | normalise `patient_type`, or add `patients.is_ortho` maintained from the tag and the contract |
| G4 | Referral attribution is free text; no `patients.referral_id`, no referral date, no source category, no cost by period; `referrals` hard-deletes; `referrals.patient_id` unreliable | referral reports, marketing ROI | add `patients.referral_source_id` + `referral_date`, a `source_category` on `referrals`, soft delete, and back-fill by `legacy_id` |
| G5 | Preferred provider / hygienist, language, relationship to guarantor not migrated | lists by provider, language, family role | back-fill from the source (`RELTORESP` via the RP import script) or derive from history |
| G6 | Guarantor unresolved on migrated accounts until the RP import script runs | responsible-party lists, statement addressing, labels | run and verify `scripts/import_legacy_responsible_parties.py` |
| G7 | Treatment-plan history not migrated; no presentation event, no status history, no rejection date, `accepted_date` gaps, optional counselor, plan headers hard-deleted | case acceptance, treatment-plan status / analysis reports | `treatment_plan_item_events` (status transitions with timestamp and actor) written on every transition including server-owned ones; stamp `accepted_date` on any transition into an accepted state; soft-delete plans; re-export Denticon `TREATPLAN` if history is required |
| G8 | Items have no `office_id` / `tenant_id`; header office nullable | multi-office treatment reports | denormalise `office_id` onto items or require it on the header |
| G9 | Recall: no data migrated, no engine, no link to appointments | recall reports, hygiene reappointment | see `be_data_scheduling.md` §3 |
| G10 | Ortho: no migrated contracts; no debond date, treatment card or visit log; "remaining" fields unmaintained; `ledger_id` too short on the insurance tiers; no `ortho_plan_id` on charges | ortho status, ortho production, contract ageing | add `debond_date` and `status` to `ortho_plans`; widen `ledger_id` to 50; compute remaining server-side; optional `ortho_visits` table |
| G11 | Progress notes have no provider / appointment / procedure link; legacy rows have no author | Missing Progress Notes by provider, unsigned notes by provider | add `provider_id` and `appointment_id` to `progress_notes` |
| G12 | Legacy medical-history answers were not exported; alerts are free text | medical-alert prevalence lists for history | app-era only, or text matching on `patient_alerts.alert` |
| G13 | Single letters are not logged; no label / postcard run model | "letters sent" reports, correspondence history | log every render (`letter_runs`), reuse the batch model |
| G14 | No date for "sent to collections"; no online-registration flag on the patient | Responsible Party - Sent to Collection, Online Registered Patients | `accounts.sent_to_collections_at`; `patients.registration_source` |
| G15 | `chart_no` uniqueness differs between the model and the real DB; `legacy_id` unique across tenants | data integrity for a second migrated organisation | drop the model's `unique=True` or add `(tenant_id, chart_no)` semantics deliberately; make `legacy_id` unique per tenant |
| G16 | No stored patient balance | patient lists by balance at scale | covered in `be_data_financial.md` (snapshot table) |

### 7.2 Existing indexes on the tables in scope [V]

From `schema.sql` (PK indexes omitted) plus Alembic `9435491c1d19`.

| Table | Indexes |
|---|---|
| `patients` | `(legacy_id)` unique + a duplicate non-unique twin, `(last_name, first_name)`, `(home_office_id)`, `(tenant_id)`; after `9435491c1d19`: `(account_id)`, `(guarantor_patient_id)`, `(guarantor_party_id)` |
| `referrals` | **none** |
| `responsible_parties` | `(legacy_id)`, `(tenant_id)` |
| `accounts` / `account_parties` / `account_change_events` | `(tenant_id)`, `(tenant_id, legacy_key)`, primary-guarantor columns, unique `(tenant_id, account_no)`; FK columns |
| `treatment_plans` | `(legacy_id)`, `(patient_id)` |
| `treatment_plan_items` | `(plan_id)` only |
| `treatment_plan_insurance_details` | `(plan_item_id)`, `(ins_plan_id)` |
| `patient_procedures` | `(patient_id, date_of_service)` (twice), `(claim_id)`, `(legacy_id)`, `(is_void)`, `(treatment_plan_item_id)` |
| `appointments` | `(patient_id, date)`, `(date, office_id)`, `(provider_id, date)`, `(operatory_id, date)`, `(status)`, `(is_archived)`, `(legacy_id)`, `(lab_vendor_id)`, `(office_id, has_lab)` |
| `appointment_procedures` | `(appointment_id)`, `(treatment_plan_item_id)` |
| `progress_notes` | `(patient_id, note_date)` |
| `perio_exams` / `perio_exam_details` | `(patient_id, exam_date)`, `(provider_id)` / `(exam_id)`, unique `(exam_id, tooth_no)` |
| `prescriptions` | `(patient_id, rx_date)` |
| `chart_conditions` | `(patient_id, tooth)`, `(patient_id, is_inactive)`, `(patient_id, procedure_code)`, `(group_id)` |
| `ortho_plans` | `(patient_id)` |
| `patient_payment_plans` | `(patient_id)`, `(treatment_plan_id)` |
| `patient_plan_installments` | `(patient_id)`, `(ortho_plan_id)`, `(payment_plan_id)`, `(tenant_id)` |
| `patient_ins_payment_plans` / `patient_sec_ins_payment_plans` | `(patient_id)`, `(ortho_plan_id)` |
| `patient_recalls` | `(due_date, status)`, `(patient_id)` |
| `patient_alerts` | `(patient_id)`, `(source_medical_alert_id)` |
| `patient_medical_alerts`, `patient_questionnaire_responses` | `(patient_id)`, `(tenant_id)` |
| `patient_insurance` | `(patient_id)`, `(ins_plan_id)`, `(legacy_id)`, unique `(patient_id, legacy_plan_type, insurance_type)` |
| `patient_consents` | `(patient_id)`, `(tenant_id)` |
| `patient_documents` | `(patient_id)`, `(patient_id, document_type)`, `(procedure_id)`, `(claim_id)`, `(tenant_id)`; after `03bbb54c0b12`: `(patient_id, context)` |
| `patient_notes` / `account_notes` | `(patient_id, note_date)`, `(document_id)` / `(patient_id)` |
| `letter_batch_runs` / `letter_batch_items` | `(tenant_id)`, `(template_id)` / `(batch_id)`, `(patient_id)` |
| `campaigns` | `(tenant_id)`, `(code)`, unique `(tenant_id, code)` |

Usable today: per-patient first / last visit (`patient_procedures (patient_id, date_of_service)`), per-patient notes, exams, prescriptions; plan item ↔ charge and ↔ appointment joins. Everything office-wide or period-wide scans.

### 7.3 Indexes needed for the reports in this scope [I]

| Index | Serves |
|---|---|
| `patients (tenant_id, home_office_id) WHERE is_active` | roster lists by office |
| `patients (tenant_id, created_at)` | app-era new-patient counts (the existing KPI scans) |
| `patients (tenant_id, (extract(month FROM dob)), (extract(day FROM dob)))` | birthday lists |
| `patients (tenant_id, zip)` and `(tenant_id, preferred_provider_id)` | list criteria |
| `patients (tenant_id, btrim(referred_by)) WHERE referred_by IS NOT NULL` + `referrals (tenant_id, legacy_id)` | patient → source join |
| `referrals (tenant_id, referral_type, reason_code)`, `referrals (patient_id) WHERE patient_id IS NOT NULL` | catalog filters, Overview tab |
| `patient_procedures (date_of_service, patient_id) WHERE NOT is_void AND NOT is_archived` | active patients, patients seen, attrition (period-first access); complements the office / date index proposed in `be_data_financial.md` |
| `treatment_plan_items (diagnosed_date) WHERE NOT is_archived`, `(accepted_date) WHERE NOT is_archived`, `(provider_id)`, `(counselor_user_id)`, `(status) WHERE NOT is_archived AND end_date IS NULL` | case acceptance, pending / unscheduled lists |
| `treatment_plans (office_id)` | office filter on plan reports |
| `progress_notes (note_date, patient_id) WHERE NOT is_deleted`, `progress_notes (office_id, note_date)`, partial `(note_date) WHERE signed_at IS NULL AND NOT is_deleted` | missing / unsigned notes |
| `ortho_plans (tenant_id, office_id) WHERE is_active`; `(periodic_date) WHERE NOT is_billed` on the three instalment tables | ortho status, due / overdue instalments |
| `perio_exams (office_id, exam_date)`, `prescriptions (office_id, rx_date)`, `prescriptions (provider_id, rx_date)` | clinical activity lists |
| `patient_consents (tenant_id, status, signed_at)` | consent tracking |
| `patient_alerts (patient_id) WHERE is_active`, `patient_medical_alerts (tenant_id, alert_code) WHERE is_active AND response = 'yes'` | alert lists |
| `patient_insurance (ins_plan_id, patient_id) WHERE is_active` | patient list by carrier / plan |

Volumes are modest except `patient_procedures` (1.37 M): 84 k patients, 78 k perio rows, 77 k chart conditions, 38 k prescriptions, 35 k notes [D]. Most lists in this scope are cheap once the visit summary (`pv`) is materialised per patient — a nightly `patient_activity_summary` (first / last visit, last hygiene date, next appointment, visit count, lifetime production) would remove the 1.37 M-row join from every patient list [I].

### 7.4 Legacy report criteria vs available columns

| Criterion (legacy) | Patients | Treatment items | Ortho contracts | Progress notes | Referrals |
|---|---|---|---|---|---|
| Office | `home_office_id`, or office of visits | `treatment_plans.office_id` (nullable) → patient home office | `office_id`, `created_office_id` | `office_id` (nullable) | `office_id` (nullable = all) |
| Office group | `offices.office_group_id` → `office_groups` (none migrated) | same | same | same | same |
| Provider | `preferred_provider_id` / `preferred_hygienist_id` (app-era) or derived | `provider_id`; `diagnosed_by` on migrated rows | `pref_provider_id` | none (via `providers.user_id`) | — |
| User | `created_by`, `updated_by` (app-era) | `created_by`, `updated_by`, `counselor_user_id` | `created_by_id`, `updated_by` | `created_by`, `signed_by` | `created_by` |
| Transaction (business) date | derived first / last visit | `diagnosed_date`, `accepted_date`, `scheduled_date`, `end_date` | `banding_date`, `treat_start_date`, instalment `periodic_date` | `note_date` | none |
| Created date | `created_at` (app-era) | `created_at` (app-era) | `created_at` | `created_at` (app-era) | `created_at` (app-era) |
| Patient type General / Ortho | §1.4 | through the patient | implicit | through the patient | through the patient |
| Group-by dimensions available | office, account, gender, age band, zip, city, type tags, carrier, referral source / type, preferred provider, active flag | plan, phase, status, provider, counselor, procedure code / category, office | provider, office, insurance plan, status (derived) | office, author, signed state | direction, type (`reason_code`), specialty, office |

Legacy list reports named in `reference_screenshots.md` and their sources: Patient List / Grouped By → `patients` + §6.3; Patient List - New Patient → §6.1; Patients on Payment Plan → `patient_payment_plans`, `ortho_plans`; Patients Seen → `visit` CTE; Online Registered Patients → `booking_requests`; Patient's Notes → `patient_notes` (app-era); Update Patient Insurance (Conversion) List → tag `UP` + appointments + `patient_insurance`; Responsible Party List → `accounts` + guarantor; Responsible Party - Sent to Collection → `accounts.send_collections`, `collection_agency_id` (no date); Treatment Plan Status / Analysis → §6.5-6.6; Progress Notes (detail / missing / unsigned) → §6.7; Lab Reports → existing lab endpoints.

---

## 8. Open questions

| # | Question | Why it matters |
|---|---|---|
| Q1 | Has `scripts/import_legacy_responsible_parties.py --apply` been run on the migrated production database? What share of accounts is still `unresolved`? | guarantor names on every account-level report, labels and statements |
| Q2 | Does the Denticon `PATIENT` export carry a creation / entry / first-visit date? (The export was not opened; `s17` reads none.) | whether `patients.created_at` can be restored, or first charge is the only new-patient date |
| Q3 | What do the migrated values of `patients.patient_type`, `referral_type`, `preferred_contact`, `marital_status`, `state` actually look like, and how are they distributed? | the normalisation tables in §1.2 and the General / Ortho criterion |
| Q4 | Product definition of an "ortho patient" for the General / Ortho criterion: the type tag, an active contract, ortho production in the period, or any of them? | every legacy financial report carries this criterion |
| Q5 | Is `Referrals.txt` a source catalog only (no patient key)? Are the few non-NULL `referrals.patient_id` values valid? | whether per-patient referral rows can be trusted at all |
| Q6 | Case-acceptance definition: by value or by patient / plan; treatment of `alternative`, `hold`, `internal_referral`; measurement window; should unplanned same-day treatment count? | the KPI varies widely across these choices (the legacy dashboard shows 33-52 %) |
| Q7 | Active-patient lookback (18 or 24 months) and visit definition (clinical charge vs kept appointment); are archived-file charges (`is_archived`) history or deleted rows? | active count, attrition, first-visit dates |
| Q8 | Is a re-export of Denticon `TREATPLAN` / `TREATPLANINSD`, `PATRECALL`, `PATORTHOPLAN` and the contract-billing tables possible? | the only way to get treatment-plan, recall and ortho history for the migrated practice |
| Q9 | Missing-note rule: per patient-day or per provider-day; which procedure codes are exempt; should a struck-off note count? | the Missing Progress Notes report in "My Reports" |
| Q10 | Should plan-level outcomes (accepted / rejected / completed) be recorded on `treatment_plans.status`, which today is only `active`? | plan-based acceptance and a Treatment Plan Status report |
