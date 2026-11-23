# Backend data map — identity, security, audit, setup / reference data, and report-level access control

_Static analysis only (code + docs read; nothing executed against a server / database / API; no existing file modified). Snapshot 2026-11-21 — `dentc-backend` branch `feature/uat-realse` @ `9183df0` (2026-11-16) + 16 uncommitted paths; `dentc-frontend` branch `feature/uat-realse-v5` @ `4007890`._

**Legend** — **[V]** verified by reading the cited file / lines. **[D]** stated in a repo doc, comment or docstring about live data or infrastructure that static analysis cannot confirm. **[I]** inference. Paths are relative to `dentc-backend/` unless prefixed `FE:`.

**Scope** — who the users are, what they may do, where they work, what is logged, and every setup / reference catalog behind the legacy "Lists" reports (Provider / Security / Setup lists), plus the state of report-level access control. Mechanics of auth, tenant resolution, the office-scope engine and the permission dependencies are in the sibling `be_platform.md` §1.2–1.5 and §7; they are restated here only where a data-map conclusion depends on them. Fact tables (ledger, claims, appointments, patients) belong to the other `be_data_*.md` documents.

**Read for this document** — models `identity.py`, `access.py`, `office_assignment.py`, `audit.py`, `platform.py`, `staff.py`, `office_setup.py`, `provider_setup.py`, `procedure_setup.py`, `codes.py`, `aux_codes.py`, `reference.py` (+ column dumps of `insurance.py`, `scheduling.py`, `comms.py`, `account.py`, `imaging.py`, `restorative.py`, `appointnow.py` for the catalogs); routers `users.py`, `users_extended.py`, `groups.py`, `office_assignment.py`, `audit.py`, `office_setup.py`, `provider_setup.py`, `procedure_codes.py`, `icd_codes.py`, `fee_schedules.py`, `pick_lists.py`, `prescription_library.py`, `utilities.py`, `registry.py`, `auth.py`, `reports.py`, `dashboard.py`, `deps.py`; services `permission_service`, `group_rights_service`, `access_rights_catalog`, `office_scope_service`, `user_admin_service`, `auth_service`, `audit_service`, `print_service`, `provider_directory_service`, `provider_taxonomy_service`, `procedure_setup_service`, `office_calendar_service`, `utility_service`, `time_clock_service`; `app/middleware/audit.py`, `app/core/audit_context.py`, `app/core/password_policy.py`, `app/crud/base.py`, `app/crud/router_factory.py`; `schema.sql`; `data/Groups.txt`; `scripts/seed_permissions.py`, `seed_account_definitions.py` and sibling seeders; backend docs `docs/users`, `docs/setup/**`, `docs/providers`, `docs/office-scope`, `docs/procedure_code`, `docs/pick-list`, `docs/onboarding`; frontend docs `FE:docs/setup/**`, `FE:docs/security/**`; the first-party reference PDFs `security_list_reports.pdf` (4 screens), `providers_list_reports.pdf` (4), `setup_list_reports.pdf` (20), `my_reports.pdf` (5) for the legacy criteria in §5.3.

---

## 0. TL;DR for planners

| # | Finding | Evidence |
|---|---|---|
| 1 | Rights model = `permissions` (global catalog, key = `code`) × `user_groups` × `user_group_memberships` × `user_group_rights`. Raw legacy import **529** codes → curated **363** (210 deleted, 44 added, 4 renamed). | [V] `access_rights_catalog.py` L1-32, L40, L253, L313; recomputed from `data/Groups.txt` |
| 2 | **56** `Reports`-category rights survive (8 screen pairs, Statements ×3, Letters ×4, Lists ×16, My Reports ×2, Pat-Reg forms ×2, Group Reports ×13). **64** report / analytics rights were deleted, including Recall Reports, Ortho Reports, Labels, Postcards, Excel Reports, the 4 Batch-Schedule-Report rights and all 10 Practice-Analytics rights. | §1.5 |
| 3 | **No backend code references any `reports_*`, `dashboard_view` or `my_page_access` code.** 37 right codes are referenced by backend code in total; none concerns reporting. `/reports/*` and `/dashboard/summary` check no right (valid token only; the dashboard additionally resolves the office scope). | [V] AST scan of `app/**/*.py`; `reports.py` L26-31; `dashboard.py` L30-35 |
| 4 | `/reports/*` takes a bare `office_id` and never validates it against `user_offices`; omitting it returns the whole tenant without the `office_scope_view_all_offices` check. `/dashboard/summary` does it correctly through `OfficeScopeDep`. | [V] `reports.py` L33-110 vs `dashboard.py` L44-63 |
| 5 | `users.report_access_provider_id` (the legacy "Report Access Provider") is stored and editable but **read by no query**. A second, independent link `providers.user_id` feeds `MeFull.provider_id`. The legacy My Reports → Production Report shows a read-only "Corresponding Provider" field. | [V] `identity.py` L70-72, L249; `my_page_service.py` L78-81; grep; `my_reports.pdf` p5 |
| 6 | `users.patient_access_level`, `user_login_restrictions`, `user_ip_rules`, `account_settings.password_expiration_days`, `users.must_change_password` are **storage only** — nothing in the login or request path reads them. `patient_access_ssn_value` exists in the catalog but no backend code checks it. | [V] grep (§1.8, §7.2) |
| 7 | No login history. Login success updates `users.last_login_at` only; failures live in a Redis counter (`login:fail:<username>`); `/auth/login` is **not** written to `audit_logs` (the audit middleware needs a decoded bearer token). | [V] `auth_service.py` L44-63, L106-111; `middleware/audit.py` L45-50 |
| 8 | `audit_logs` records successful **mutations** by authenticated callers (+ explicit `PRINT` rows + imaging binary reads). Reads / PHI views, failed requests, logins and the `/reports/*` roll-ups are not logged. No retention or purge exists. | §2 |
| 9 | Existing run-recording precedents: `print_service.record_print` (`audit_logs.action='PRINT'`, 4 call sites), `utility_runs` (job + audit row), `letter_batch_runs` / `letter_batch_items`. No saved-report, favorite, schedule or report-run table exists. | [V] `print_service.py` L320-339; `platform.py` L40-57; grep |
| 10 | Office grouping exists but is minimal: flat `office_groups` + a single FK `offices.office_group_id` (one group per office, no hierarchy / type / region). `?office_group_id=` is already resolved by the office-scope engine. | [V] `identity.py` L169, L308-320; `office_scope_service.py` L120-127, L334-340 |
| 11 | Doctor vs hygienist = `providers.role` (free text, canonicalised on write to `dentist \| hygienist \| assistant \| specialist \| staff`) with `providers.title` as fallback. The derived `provider_kind` is computed in Python on read — it is **not a column**. `specialty` is free text; `is_ortho_provider` is a boolean. | [V] `provider_directory_service.py` L46-104; `enrich_service.py` L281-305 |
| 12 | Every legacy Security / Provider / Setup list has a backing table, but several legacy criteria have no data (procedure-code Production Type, Bill-to-Insurance and code type; provider licence state / expiry; drug-list user on migrated rows). Generic list endpoints cap at 200 rows and sort only by `created_at` / `id` unless declared. | §5.3 |
| 13 | Tenancy: column `tenant_id`, one tenant per client database in production [D]. Benchmarking is possible only across offices of one tenant. Several tables in this scope have no `tenant_id` and are unfiltered by the generic CRUD engine (`user_offices`, `operatories`, `tenants`). | §6 |
| 14 | Security defects that a report-permission model would inherit: `POST /user-group-memberships`, `POST/PATCH/DELETE /user-groups`, `PUT /offices/{id}/users` are open to any authenticated user; the two time-clock rights the code checks were deleted from the catalog. | §7.4 |

---

## 1. Identity and access

### 1.1 Table inventory [V] `app/db/models/identity.py`, `access.py`; constraints from `schema.sql`

| Table | Model | Tenant column | Key columns | Delete | Notes for reporting |
|---|---|---|---|---|---|
| `tenants` | `identity.py` L30 | — | `id`, `legacy_id` UQ, `name`, `code` UQ, `is_active`, `created_at` | `is_active` | No parent / organisation / brand column |
| `users` | L39 | `tenant_id` | §1.2 | `is_active` | `email` and `username` unique across the whole database; `(tenant_id, short_id)` unique |
| `user_offices` | L300 | **none** | `user_id`, `office_id`, `is_primary`, `created_at`; UQ `(user_id, office_id)` | hard | Home office = the `is_primary` row |
| `user_groups` | `access.py` L74 | `tenant_id` | `name`, `description`, `is_active`, `created_at` | `is_active` | No `updated_at` / `updated_by`; no legacy group code column (the Denticon code 100…268 is not stored) |
| `user_group_memberships` | L83 | `tenant_id` | `user_id`, `group_id`, `created_at`; UQ `(user_id, group_id)` | hard | No "added by" |
| `permissions` | L92 | none (global by design) | `id`, `code` UQ ≤255, `label`, `category`, `is_active`, `created_at` | — | `id` is a serial assigned at seed time (differs per database); `code` is the stable key |
| `user_group_rights` | L110 | `tenant_id` | `group_id`, `permission_id`, `created_at`; UQ `(group_id, permission_id)` | hard | No "granted by" |
| `user_ip_rules` | L128 | `tenant_id` | `user_id`, `ip_address`, `rule_type` (`allow` / `deny`), `description`, `is_active` | `is_active` | Storage only |
| `user_login_restrictions` | L162 | `tenant_id` | `user_id` UQ, `is_24_7`, `allowed_days` (CSV), `start_time`, `end_time` | — | Storage only |
| `user_preferences` | L64 | `tenant_id` | `user_id`, `pref_key`, `pref_value` TEXT; UQ `(user_id, pref_key)` | hard | `pref_key='ui_prefs'` holds one JSON blob per user (`GET/PUT /users/me/preferences`) |
| `user_time_clock_config` | L139 | `tenant_id` | `user_id` UQ, `pay_rate`, `overtime_method`, `overtime_rate`, thresholds | — | Wage data |
| `user_tasks`, `notifications` | L32, L46 | `tenant_id` | per-user to-dos; per-user inbox (`category`, `title`, `body`, `ref_type`, `ref_id`, `is_read`, `read_at`) | — | `notifications` has no producers yet [V docstring L46-49] |
| `auth_action_tokens` | `identity.py` L121 | none | `user_id`, `token_hash` UQ, `purpose` (`password_reset` / `legacy_activation`), `expires_at`, `used_at`, `created_at` | — | The only durable trace of password-reset / activation events |
| `refresh_tokens` | L112 | none | `user_id`, `token_hash`, `expires_at`, `revoked` | — | **Unused** — the refresh whitelist is in Redis [V grep] |
| `user_presence` | `messaging.py` | `tenant_id` (PK part) | `user_id`, `status`, `last_seen_at`, `updated_at` | — | Messaging presence; `last_seen_at` written on going offline |

### 1.2 `users` columns [V] `identity.py` L39-109

| Group | Columns |
|---|---|
| Identity | `id`, `tenant_id`, `legacy_id`, `email`, `username`, `first_name`, `last_name`, `phone`, `short_id` (≤6), `image_url`, `custom_1`, `custom_2` |
| Authorisation | `role` VARCHAR(50) default `staff`; `patient_access_level` VARCHAR(50) (unenforced); `report_access_provider_id` VARCHAR(50) FK `providers.id` (unenforced); `is_active` |
| Credential state | `password_hash`, `must_change_password`, `password_created_at`, `is_legacy_user`, `legacy_activation_completed`, `last_login_at` |
| Working context | `current_office_id` FK `offices.id` (ON DELETE SET NULL), `last_patient_id` FK `patients.id` |
| Row audit | `created_at`, `created_by`, `updated_at`, `updated_by` (FK `users.id`) |
| Signature block | `signature_data` (base64 image), `signature_len`, `signature_device_*`, `signature_sig_string` (encrypted), `signature_point_count`, `signature_stroke_count`, `signature_signed_at`, `signature_updated_at`, `signature_captured_user_agent` |

Absent [V]: deactivation date / reason / actor, termination or hire date, job title, employee id, MFA fields, failed-login count, lock state, last password change by an admin, last activity time.

`UserRead` (`app/schemas/auth.py` L29-63) returns the identity, authorisation, credential-state (no hash), working-context and row-audit columns, **`signature_data`** and `image_url`, plus resolved `created_by_name` / `updated_by_name`; it omits `legacy_id` and the Topaz capture block.

### 1.3 Roles and privileged semantics [V]

| Role value | Where recognised | Effect |
|---|---|---|
| `super_admin` | `deps.py` L29, L64-74, L80-88; `permission_service.py` L45 | Holds every right; passes every `require_roles(...)`; may target another tenant with header `X-Tenant-ID` |
| `admin` | `permission_service.FULL_ACCESS_ROLES` L45 | Holds every right inside its tenant; `GET /auth/me-full` lists the whole active catalog for it; may reset other users' passwords |
| `owner`, `manager` | `OFFICE_ADMIN_ROLES` L98; `time_clock_service.py` L102-104 | Hold the master office right without a group; time-clock managers. **Not** full-access for rights (`FE:src/features/access-control/rights.ts` says the same). `owner` (not `manager`) may see wages |
| `provider`, `front_desk`, `staff` | `user_admin_service._DEFAULT_ROLES` L44 | No intrinsic rights |
| any other string | — | `users.role` is free text; the option list comes from `/definitions` group `user_role` with the 5 defaults as fallback. `owner` / `manager` are **not** in the default list |

Two "ungated" escape hatches [V]:

| Condition | Consequence | Code |
|---|---|---|
| Non-admin user in **no active group** | `EffectivePermissions.enforced = False`; passes `require_permission` (write gates); fails `require_read_access` | `permission_service.py` L138-151; `deps.py` L91-133 |
| User with **zero `user_offices` rows** | Office scope treats the caller as tenant-wide (`is_ungated`) | `office_scope_service.py` L168-178 |

### 1.4 Rights resolution and its API [V]

| Item | Fact |
|---|---|
| Effective rights | Union of `permissions.code` over the caller's **active** groups, restricted to `permissions.is_active` (`permission_service.effective_permissions` L154-180, 2 statements, no cache) |
| Client view | `GET /auth/me-full` → `permissions[]`, `permissions_enforced`, `groups[]` (names), `offices[]`, `current_office_id`, `provider_id`, `can_reset_user_passwords` (`auth.py` L104-172) |
| Catalog read | `GET /permissions` → `[{code, label, category}]`, active rows only, ordered by category then label; **no `id`** in the payload; any authenticated user (`groups.py` L31-42) |
| Group rights | `GET /user-groups/{id}/rights` → `list[str]` codes (view / full right on the Groups screen); `PUT` replaces the full set, unknown codes → 422 `unknown_right_codes`; `POST /user-groups/{id}/copy` (admin) |
| Adding a right | Append to `ADDED_RIGHTS` in `access_rights_catalog.py` + an Alembic revision calling `apply_curation` (idempotent). The catalog is global, so a right cannot be tenant-specific |
| Frontend seam | `FE:src/features/access-control/` (`useRights`, `RequireRight`, `rightCodes.ts`). `RIGHTS_ENFORCED_DEFAULT = false` (dark; `localStorage["dentc:rights_enforced"]="1"` turns it on). `rightCodes.ts` names no `reports_*` code; only `dashboard_view` and `my_page_access` from the home family |

### 1.5 The rights catalog — every right related to reports, lists, statements, exports or analytics

Key = `permissions.code` (slug of the legacy label, `scripts/seed_permissions.py` L47-49). `permissions.id` is environment-specific; the ids the dev database held for the 210 deleted rows are preserved in `docs/setup/implement/_dev_db_access_rights_backup.json` and shown below as "dev id". "Legacy groups" = how many of the 13 seeded Denticon groups held the right (abbreviations in §1.5.5).

#### 1.5.1 Catalog size by category [V] recomputed from `data/Groups.txt` + `access_rights_catalog.py`

| Category | Raw | Kept | Added | Curated |
|---|---:|---:|---:|---:|
| Setup | 121 | 99 | 4 | 103 |
| Patient | 71 | 63 | 12 | 75 |
| **Reports** | 106 | **56** | 0 | **56** |
| Transactions (+ singleton `Transaction`) | 54 | 48 | 3 | 51 |
| Appointments | 32 | 30 | 1 | 31 |
| Utilities | 94 | 22 | 0 | 22 |
| Charting | 1 | 0 | 7 | 7 |
| Imaging | 0 | 0 | 5 | 5 |
| Help (+ `HelpAndSupport`) | 3 | 1 | 3 | 4 |
| AppointNow | 0 | 0 | 4 | 4 |
| Messaging | 0 | 0 | 2 | 2 |
| Dashboard | 0 | 0 | 2 | 2 |
| General | 20 | 0 | 1 | 1 |
| `Report` (singleton), Denticon Practice Analytics, EHR, MyTooth, AthenaNet | 27 | 0 | 0 | 0 |
| **Total** | **529** | **319** | **44** | **363** |

#### 1.5.2 Report rights present in the curated catalog (56) [V]

| `permissions.code` | Label (after "Reports - ") | Legacy groups | Held by |
|---|---|---:|---|
| `reports_appointment_reports_screen_full_control` | Appointment Reports Screen Full Control | 7 | Adm,Adm2,Asst,Cler,Clin,OM,VBSins |
| `reports_appointment_reports_screen_view_only` | Appointment Reports Screen View Only | 2 | Adm2,Asst |
| `reports_custom_letter_full_control` | Custom Letter Full Control | 3 | Adm,Adm2,OM |
| `reports_custom_letter_screen_view_only` | Custom Letter Screen View Only | 3 | Adm2,Cler,Clin |
| `reports_daily_reports_screen_full_control` | Daily Reports Screen Full Control | 6 | Adm,Adm2,Cler,Clin,OM,VBSins |
| `reports_daily_reports_screen_view_only` | Daily Reports Screen View Only | 1 | Adm2 |
| `reports_group_reports_appointment_reports_full_control` | Group Reports - Appointment Reports Full Control | 9 | Adm,Adm2,Asst,Cler,Clin,OM,TC,VBScc,VBSins |
| `reports_group_reports_appointment_reports_view_only` | Group Reports - Appointment Reports View Only | 9 | Adm,Adm2,Asst,Cler,Clin,OM,TC,VBScc,VBSins |
| `reports_group_reports_batch_reports_full_control` | Group Reports - Batch Reports Full Control | 8 | Adm,Adm2,Cler,Clin,OM,TC,VBScc,VBSins |
| `reports_group_reports_batch_reports_view_only` | Group Reports - Batch Reports View Only | 8 | Adm,Adm2,Cler,Clin,OM,TC,VBScc,VBSins |
| `reports_group_reports_daily_screen_full_control` | Group Reports Daily Screen Full Control | 1 | Adm |
| `reports_group_reports_ins_screen_full_control` | Group Reports Ins Screen Full Control | 4 | Adm,Adm2,OM,VBSins |
| `reports_group_reports_ins_screen_view_only` | Group Reports Ins Screen View Only | 1 | Adm2 |
| `reports_group_reports_mang_screen_full_control` | Group Reports Mang Screen Full Control | 3 | Adm,Adm2,VBSins |
| `reports_group_reports_mang_screen_view_only` | Group Reports Mang Screen View Only | 1 | Adm2 |
| `reports_group_reports_other_reports_full_control` | Group Reports - Other Reports Full Control | 8 | Adm,Adm2,Cler,Clin,OM,TC,VBScc,VBSins |
| `reports_group_reports_other_reports_view_only` | Group Reports - Other Reports View Only | 8 | Adm,Adm2,Cler,Clin,OM,TC,VBScc,VBSins |
| `reports_group_reports_referral_reports_full_control` | Group Reports - Referral Reports Full Control | 8 | Adm,Adm2,Cler,Clin,OM,TC,VBScc,VBSins |
| `reports_group_reports_referral_reports_view_only` | Group Reports - Referral Reports View Only | 8 | Adm,Adm2,Cler,Clin,OM,TC,VBScc,VBSins |
| `reports_insurance_reports_screen_full_control` | Insurance Reports Screen Full Control | 6 | Adm,Adm2,Cler,FD,OM,VBSins |
| `reports_insurance_reports_screen_view_only` | Insurance Reports Screen View Only | 2 | Adm2,FD |
| `reports_ledger_reports_screen_full_control` | Ledger Reports Screen Full Control | 5 | Adm,Adm2,Cler,OM,VBSins |
| `reports_ledger_reports_screen_view_only` | Ledger Reports Screen View Only | 1 | Adm2 |
| `reports_letters_screen_full_control` | Letters Screen Full Control | 4 | Adm,Adm2,Cler,OM |
| `reports_letters_screen_view_only` | Letters Screen View Only | 1 | Adm2 |
| `reports_lists_employer_list_screen_full_control` | Lists - Employer List Screen Full Control | 5 | Adm,Adm2,Cler,OM,VBSins |
| `reports_lists_employer_list_screen_view_only` | Lists - Employer List Screen View Only | 1 | Adm2 |
| `reports_lists_office_list_screen_full_control` | Lists - Office List Screen Full Control | 5 | Adm,Adm2,Cler,OM,VBSins |
| `reports_lists_office_list_screen_view_only` | Lists - Office List Screen View Only | 1 | Adm2 |
| `reports_lists_patient_list_screen_full_control` | Lists - Patient List Screen Full Control | 5 | Adm,Adm2,Cler,OM,VBSins |
| `reports_lists_patient_list_screen_view_only` | Lists - Patient List Screen View Only | 1 | Adm2 |
| `reports_lists_prescription_list_screen_full_control` | Lists - Prescription List Screen Full Control | 4 | Adm,Adm2,OM,VBSins |
| `reports_lists_prescription_list_screen_view_only` | Lists - Prescription List Screen View Only | 1 | Adm2 |
| `reports_lists_procedure_fee_list_screen_full_control` | Lists - Procedure/Fee List Screen Full Control | 5 | Adm,Adm2,Cler,OM,VBSins |
| `reports_lists_procedure_fee_list_screen_view_only` | Lists - Procedure/Fee List Screen View Only | 1 | Adm2 |
| `reports_lists_provider_list_screen_full_control` | Lists - Provider List Screen Full Control | 5 | Adm,Adm2,Clin,OM,VBSins |
| `reports_lists_provider_list_screen_view_only` | Lists - Provider List Screen View Only | 1 | Adm2 |
| `reports_lists_responsible_party_list_screen_full_control` | Lists - Responsible Party List Screen Full Control | 5 | Adm,Adm2,Cler,OM,VBSins |
| `reports_lists_responsible_party_list_screen_view_only` | Lists - Responsible Party List Screen View Only | 1 | Adm2 |
| `reports_lists_security_list_rpts_screen_full_c` | Lists - Security List Rpts Screen Full C | 2 | Adm,Adm2 |
| `reports_lists_setup_list_rpts_screen_full_cont` | Lists - Setup List Rpts Screen Full Cont | 2 | Adm,Adm2 |
| `reports_management_reports_screen_full_control` | Management Reports Screen Full Control | 4 | Adm,Adm2,OM,VBSins |
| `reports_management_reports_screen_view_only` | Management Reports Screen View Only | 1 | Adm2 |
| `reports_monthly_reports_screen_full_control` | Monthly Reports Screen Full Control | 1 | Adm |
| `reports_monthly_reports_screen_view_only` | Monthly Reports Screen View Only | 1 | Adm |
| `reports_my_reports_full_control` | My Reports - Full Control | 5 | Adm,Adm2,Cler,Clin,OM |
| `reports_my_reports_view` | My Reports - View | 3 | Adm,Cler,OM |
| `reports_pat_reg_medical_info_forms_full_control` | Pat Reg./Medical Info Forms Full Control | 8 | Adm,Adm2,Cler,Clin,OM,TC,VBScc,VBSins |
| `reports_pat_reg_medical_info_forms_view_only` | Pat Reg./Medical Info Forms View Only | 8 | Adm,Adm2,Cler,Clin,OM,TC,VBScc,VBSins |
| `reports_referral_reports_screen_full_control` | Referral Reports Screen Full Control | 5 | Adm,Adm2,Cler,OM,VBSins |
| `reports_referral_reports_screen_view_only` | Referral Reports Screen View Only | 2 | Adm2,Clin |
| `reports_statement_allow_updating_statement_dates` | Statement - Allow updating statement dates | 8 | Adm,Adm2,Cler,Clin,OM,TC,VBScc,VBSins |
| `reports_statements_screen_full_control` | Statements Screen Full Control | 3 | Adm,Adm2,OM |
| `reports_statements_screen_view_only` | Statements Screen View Only | 2 | Adm2,Cler |
| `reports_treatment_plan_reports_screen_full_control` | Treatment Plan Reports Screen Full Control | 5 | Adm,Adm2,Cler,OM,VBSins |
| `reports_treatment_plan_reports_screen_view_only` | Treatment Plan Reports Screen View Only | 2 | Adm2,Clin |

Shape notes [V]: the two list rights with truncated codes (`…security_list_rpts_screen_full_c`, `…setup_list_rpts_screen_full_cont`) and `reports_group_reports_daily_screen_full_control` have no view-only twin. There is no right for Interactive Reports, My Favorites or Search Report (they never had one in the export).

#### 1.5.3 Report / analytics rights deleted by the curation (64) [V] `REMOVED_ROWS` L40-251

| `permissions.code` | Legacy label | dev id | Legacy groups |
|---|---|---:|---:|
| `denticon_practice_analytics_collection_analysis_full_control` | Denticon Practice Analytics - Collection Analysis Full Control | 36 | 1 |
| `denticon_practice_analytics_executive_dashboard_full_control` | Denticon Practice Analytics - Executive Dashboard Full Control | 37 | 1 |
| `denticon_practice_analytics_front_office_full_control` | Denticon Practice Analytics - Front Office Full Control | 38 | 1 |
| `denticon_practice_analytics_hygiene_recall_full_control` | Denticon Practice Analytics - Hygiene Recall Full Control | 39 | 1 |
| `denticon_practice_analytics_morning_huddle_full_control` | Denticon Practice Analytics - Morning Huddle Full Control | 40 | 1 |
| `denticon_practice_analytics_patient_visit_analysis_full_control` | Denticon Practice Analytics - Patient Visit Analysis Full Control | 41 | 1 |
| `denticon_practice_analytics_production_analysis_full_control` | Denticon Practice Analytics - Production Analysis Full Control | 42 | 1 |
| `denticon_practice_analytics_provider_breakdown_full_control` | Denticon Practice Analytics - Provider Breakdown Full Control | 43 | 1 |
| `denticon_practice_analytics_referral_analytics_full_control` | Denticon Practice Analytics - Referral Analytics Full Control | 44 | 1 |
| `denticon_practice_analytics_treatment_plan_analysis_full_control` | Denticon Practice Analytics - Treatment Plan Analysis Full Control | 45 | 1 |
| `report_batch_schedule_report_access_full_control` | Report - Batch Schedule Report Access Full Control | 119 | 1 |
| `report_batch_schedule_report_add_schedule` | Report - Batch Schedule Report - Add Schedule | 117 | 1 |
| `report_batch_schedule_report_delete_schedule` | Report - Batch Schedule Report - Delete Schedule | 118 | 1 |
| `report_batch_schedule_report_view_only` | Report - Batch Schedule Report View Only | 120 | 1 |
| `reports_batch_collection_letters_full_control` | Reports - Batch Collection Letters Full Control | 122 | 8 |
| `reports_batch_collection_letters_view_only` | Reports - Batch Collection Letters View Only | 123 | 8 |
| `reports_blank_insurance_form_screen_full_control` | Reports - Blank Insurance Form Screen Full Control | 124 | 5 |
| `reports_blank_insurance_form_screen_view_only` | Reports - Blank Insurance Form Screen View Only | 426 | 1 |
| `reports_custom_postcard_full_control` | Reports - Custom Postcard Full Control | 126 | 3 |
| `reports_custom_postcard_screen_view_only` | Reports - Custom Postcard Screen View Only | 428 | 3 |
| `reports_dha_reports_screen_full_control` | Reports - DHA Reports Screen Full Control | 128 | 4 |
| `reports_dha_reports_screen_view_only` | Reports - DHA Reports Screen View Only | 430 | 1 |
| `reports_excel_reports_full_control` | Reports - Excel Reports Full Control | 129 | 4 |
| `reports_excel_reports_view_only` | Reports - Excel Reports View Only | 431 | 1 |
| `reports_labels_screen_full_control` | Reports - Labels Screen Full Control | 142 | 4 |
| `reports_labels_screen_view_only` | Reports - Labels Screen View Only | 435 | 1 |
| `reports_ortho_reports_access_full_control` | Reports - Ortho Reports Access Full Control | 185 | 9 |
| `reports_ortho_reports_view_only` | Reports - Ortho Reports View Only | 451 | 8 |
| `reports_postcards_full_control` | Reports - Postcards Full Control | 188 | 8 |
| `reports_postcards_view_only` | Reports - Postcards View Only | 189 | 8 |
| `reports_recall_reports_screen_full_control` | Reports - Recall Reports Screen Full Control | 190 | 6 |
| `reports_recall_reports_screen_view_only` | Reports - Recall Reports Screen View Only | 452 | 1 |
| `reports_voice_charting_adoption_full_control` | Reports - Voice Charting Adoption Full Control | 195 | 13 |
| 31 client-specific "Office Reports" rights — `code` (dev id; legacy groups): `reports_office_reports_abbeydental_full_control` (183; 1); `reports_office_reports_adrpts_screen_full_con` (159; 3); `reports_office_reports_adrpts_screen_view_only` (446; 1); `reports_office_reports_bnrpts_screen_full_cont` (160; 3); `reports_office_reports_bnrpts_screen_view_only` (447; 1); `reports_office_reports_chi_st_joseph_children_s_health_reports_full_control` (161; 8); `reports_office_reports_chi_st_joseph_children_s_health_reports_view_only` (162; 9); `reports_office_reports_dental_care_access` (163; 1); `reports_office_reports_greathillsrpts_access` (164; 1); `reports_office_reports_hawaiirpts_full_control` (165; 3); `reports_office_reports_hawaiirpts_view_only` (448; 1); `reports_office_reports_healthcare_network_access_full_control` (166; 1); `reports_office_reports_healthysmileskids_full_co` (184; 1); `reports_office_reports_kane_dental_access` (167; 1); `reports_office_reports_kane_dental_view` (168; 1); `reports_office_reports_kansas_rpts_full_contro` (169; 2); `reports_office_reports_lumina_reports_full_control` (170; 7); `reports_office_reports_lumina_reports_view_only` (171; 7); `reports_office_reports_nedmrpts_screen_full_co` (172; 3); `reports_office_reports_nedmrpts_screen_view_on` (449; 1); `reports_office_reports_ohc_reports_full_contro` (173; 2); `reports_office_reports_ottawareports_access` (174; 1); `reports_office_reports_premier_perio_full_cont` (175; 1); `reports_office_reports_sgkreports_screen_full_control` (176; 2); `reports_office_reports_sgkreports_screen_view_only` (177; 1); `reports_office_reports_tru_family_rpts_full_control` (178; 1); `reports_office_reports_uop_reports_full_contro` (179; 2); `reports_office_reports_vhrpts_screen_full_con` (180; 3); `reports_office_reports_vhrpts_screen_view_only` (450; 1); `reports_office_reports_village_family_dental_reports_full_control` (181; 8); `reports_office_reports_village_family_dental_reports_view_only` (182; 8) | Reports - Office Reports - <client> (Full Control / View Only / Access) | 159–184, 446–450 | 1–9 |

#### 1.5.4 Adjacent rights (print, export, statements, close-out, dashboards, office scope, security screens)

| Status | `permissions.code` | Label | Legacy groups |
|---|---|---|---:|
| ADDED | `dashboard_view` | Dashboard - View | – |
| ADDED | `my_page_access` | My Page - Access | – |
| ADDED | `office_scope_view_all_offices` | General - View Data Across All Offices | – |
| ADDED | `appointments_scheduler_print` | Appointments - Scheduler Print | – |
| ADDED | `charting_perio_print` | Charting - Perio Chart Print | – |
| ADDED | `transactions_claims_ada_direct_print` | Transactions - Claims ADA Direct Print | – |
| ADDED | `imaging_export` | Imaging - Export / Download Image | – |
| KEPT | `appointments_dps_ins_verification_reports` | Appointments - DPS Ins Verification - Reports | 10 |
| KEPT | `appointments_add_appointment_in_other_office` | Appointments - Add Appointment In Other Office (office-scope alias) | 4 |
| KEPT | `patient_responsible_party_statement_collection_rights` | Patient - Responsible Party - Statement/Collection Rights | 9 |
| KEPT | `patient_unclose_account_statement_screen_full_control` | Patient - Unclose Account Statement Screen Full Control | 2 |
| KEPT | `patient_access_ssn_value` | Patient - Access SSN Value | 8 |
| KEPT | `patient_assign_to_restricted_user_full_control` / `_view_only` | Patient - Assign To Restricted User | 11 / 10 |
| KEPT | `transactions_patient_ledger_screen_full_control` / `transactions_patient_ledger_view_only` | Transactions - Patient Ledger | 7 / 3 |
| KEPT | `transactions_pre_authorizations_list_full_control` / `_view_only` | Transactions - Pre-Authorizations List | 6 / 4 |
| KEPT | `transactions_allow_add_delete_backdated_payment_between_closeout_date_and_yesterday` | Back-dated payment vs close-out date | 6 |
| KEPT | `setup_close_out_full_control` / `setup_close_out_view_only` / `setup_close_out_all_offices` | Setup - Close Out | 2 / 1 / 2 |
| KEPT | `setup_office_groups_screen_full_control` / `_view_only` | Setup - Office Groups Screen | 2 / 1 |
| KEPT | `setup_security_users_screen_full_control` / `_view_only` | Setup - Security Users Screen | 3 / 1 |
| KEPT | `setup_security_groups_screen_full_control` / `_view_only` | Setup - Security Groups Screen | 2 / 2 |
| KEPT | `setup_security_user_per_office_screen_full_control` / `_view_only` | Setup - Security User Per Office Screen | 3 / 1 |
| KEPT | `utilities_text_message_details_full_control` / `_view_only` | Utilities - Text Message Details | 9 / 9 |
| KEPT | `utilities_referral_management_full_control` / `_view_only` / `_edit_status` | Utilities - Referral Management | 1 / 1 / 1 |
| REMOVED | `utilities_time_clock_editor_full_control` / `_view_only`, `utilities_time_clock_full_control` / `_view_only` | Utilities - Time Clock (Editor) | 2 / 1 / 5 / 5 |
| REMOVED | `setup_provider_goals_screen_full_control` / `_view_only` | Setup - Provider Goals Screen | 1 / 8 |
| REMOVED | `setup_collection_agencies_screen_full_control` / `_view_only` | Setup - Collection Agencies Screen | 3 / 1 |
| REMOVED | `utilities_access_to_dentilytics_enterprise` | Utilities - Access to Dentilytics Enterprise | 1 |
| REMOVED | `utilities_ehr_ehrreport_fullcontrol`, `mytooth_check_the_activity_report_full_control` | EHR report; MyTooth activity report | 1 / 13 |
| REMOVED | `utilities_dldfeeschexls_download_*`, `utilities_denticon_download_*`, `utilities_dentigram_download_*`, `setup_dentigram_downloads_*`, `utilities_encounter_download_*`, `utilities_encounterdownload_*`, `utilities_download837_*`, `utilities_office_specific_dha_statementxmldld_full` / `_view` | Download / export utilities (fee-schedule XLS, encounter, 837, statement XML) | 1–3 each |
| REMOVED | `utilities_automated_campaigns_dashboard_*`, `utilities_automated_campaigns_mailing_list_*` | Campaign dashboard / mailing lists | 1–12 |
| REMOVED | `appointments_short_call_list`, `appointments_short_notice_list`, `utilities_scheduled_reallocation_list`, `utilities_tickler_*`, `utilities_task_manager_*` (6) | Work lists | 1–9 |
| REMOVED | `setup_security_multi_pgid_users_screen_full_control` | Setup - Security Multi PGID Users Screen | 2 |

#### 1.5.5 Legacy seed groups [V] `data/Groups.txt` parsed with the seeder's own rules

`scripts/seed_permissions.py` seeds these 13 groups (matched by name) with the curated subset of their legacy rights; run per tenant in onboarding step 4 [D] `docs/onboarding/NEW_CLIENT_DATABASE.md` L161.

| Group (abbr.) | Denticon code | Raw rights | Curated rights | of which `Reports` |
|---|---:|---:|---:|---:|
| Administrators (Adm) | 100 | 408 | 246 | 37 |
| Administrators 2 (Adm2) | 106 | 378 | 261 | 52 |
| Assistant (Asst) | 161 | 146 | 113 | 4 |
| Billing (Bill) | 183 | 40 | 23 | 0 |
| Claims (Clm) | 268 | 11 | 5 | 0 |
| Clerical (Cler) | 104 | 192 | 153 | 27 |
| Clinical (Clin) | 105 | 171 | 130 | 18 |
| Doctor (Doc) | 149 | 83 | 58 | 0 |
| FrontDesk (FD) | 182 | 149 | 113 | 2 |
| Office Manger → "Office Manager" (OM) | 101 | 237 | 183 | 31 |
| Time clock only (TC) | 109 | 92 | 57 | 11 |
| VBS-call center (VBScc) | 107 | 154 | 116 | 11 |
| VBS-iNSURANCE DEPARTMENT (VBSins) | 108 | 198 | 143 | 27 |

Consequence [I]: on a tenant seeded this way, a `Doctor`, `Billing` or `Claims` group member holds no report right, so turning enforcement on unchanged would lock those users out of every report.

#### 1.5.6 Legacy Reports menu vs rights available

| Legacy menu entry | Right(s) in the curated catalog | Status |
|---|---|---|
| Daily / Monthly / Ledger / Management / Insurance / Appointment / Treatment Plan / Referral Reports | `reports_<name>_reports_screen_full_control` + `_view_only` | present |
| Recall Reports | deleted `reports_recall_reports_screen_*` | **missing** |
| Ortho Reports | deleted `reports_ortho_reports_access_full_control`, `reports_ortho_reports_view_only` | **missing** |
| Statements | `reports_statements_screen_*`, `reports_statement_allow_updating_statement_dates` | present |
| Lists → Patient / Resp. Party | `reports_lists_patient_list_screen_*`, `reports_lists_responsible_party_list_screen_*` | present |
| Lists → Provider | `reports_lists_provider_list_screen_*` | present |
| Lists → Security | `reports_lists_security_list_rpts_screen_full_c` | present, full-control only |
| Lists → Setup | `reports_lists_setup_list_rpts_screen_full_cont` + per-list `…employer_list…`, `…office_list…`, `…prescription_list…`, `…procedure_fee_list…` | present |
| Interactive Reports, My Favorites, Search Report | none | **missing** (never existed) |
| Office Reports | 31 client-specific rights deleted | missing by design |
| Letters | `reports_letters_screen_*`, `reports_custom_letter_*` (+ DentC `patient_letters_*`) | present |
| Postcards / Labels | deleted `reports_postcards_*`, `reports_custom_postcard_*`, `reports_labels_screen_*` | **missing** |
| My Reports | `reports_my_reports_full_control`, `reports_my_reports_view` | present |
| "Office Group" runs | `reports_group_reports_*` (13) — reading the name as "run for an office group" is [I] | present |
| Scheduled reports | deleted `report_batch_schedule_report_*` (access / view / add schedule / delete schedule) | **missing** |
| Excel output | deleted `reports_excel_reports_*` | **missing** |
| Analytics dashboards | 10 `denticon_practice_analytics_*` deleted (executive dashboard, production / collection analysis, provider breakdown, hygiene recall, morning huddle, front office, patient visit, referral, treatment plan) → one `dashboard_view` | one coarse right |

#### 1.5.7 Enforcement today [V]

| Fact | Evidence |
|---|---|
| 37 distinct right codes are referenced by backend code (35 present in the catalog + 2 deleted ones) | AST scan of string constants in `app/**/*.py` against the catalog |
| None is a `reports_*`, `dashboard_*` or `my_page_*` code | same scan |
| The 2 deleted-but-referenced codes: `utilities_time_clock_editor_full_control`, `utilities_time_clock_editor_view_only` | `time_clock_service.py` L105-106 vs `access_rights_catalog.py` `REMOVED_ROWS` |
| Report-like endpoints and their guard | `/reports/summary`, `/trends`, `/accounts-receivable`, `/aging`, `/insurance-verification-summary`: token only. `/dashboard/summary`: token + office scope. `/reports/time-clock*`: token + office scope + caller rule (own card unless manager) + wages only for `owner` / `admin` / `super_admin`. `/patients/{id}/reports/*`: token only |

### 1.6 User ↔ office assignment [V]

| Item | Fact |
|---|---|
| Storage | `user_offices(user_id, office_id, is_primary)`; home office = `is_primary`; working office = `users.current_office_id` |
| Writers | `POST /users/complete`, `PUT /users/{id}/complete` (`assigned_offices[]`, `home_office_id`; admin); `PUT /offices/{office_id}/users` and `POST /offices/{office_id}/users/copy-from/{source_office_id}` (token + office path access, **no admin guard**); generic `/user-offices` CRUD (token only) |
| Readers | `GET /users?office_id=` (join); `GET /offices/{office_id}/users` → `list[UserRead]`; `GET /user-offices?user_id=&office_id=`; `GET /auth/me-full` → `offices[] {office_id, name, office_code, is_primary, short_id, is_active, office_group_id, timezone}` |
| Enforcement | `settings.OFFICE_SCOPE_ENFORCED = True` (`config.py` L457): on routes wired to the office-scope engine (not `/reports/*`, see §0 #4) an explicit office target outside the assignments is 403 `office_not_assigned`; unrestricted when the caller holds `office_scope_view_all_offices` / the legacy alias, is `owner` / `admin` / `manager` / `super_admin`, or has no assignments at all |
| Data hygiene | `scripts/backfill_user_offices.py` seeds assignments from evidence [D] `docs/office-scope/office_scope_backend_response.md` |

### 1.7 User ↔ provider link [V]

| Link | Column | Written by | Read by |
|---|---|---|---|
| "Report Access Provider" | `users.report_access_provider_id` → `providers.id` | Security → Users add / edit (`UserCreate`, `UserUpdate`, `UserCompleteCreate/Update`) | **Backend: nothing.** Frontend: `FE:src/components/pages/MyPage.tsx` L51 ("My Schedule"), user view / edit modals |
| "Linked user" | `providers.user_id` → `users.id` (indexed) | `PUT /providers/{provider_id}/user` | `my_page_service.linked_provider_id` → `MeFull.provider_id`; `GET /providers/{id}/user`; provider-signature fallback |

The two links are independent and can disagree [I]. Legacy use: My Reports → Production Report carries a read-only **"Corresponding Provider"** box, empty for the screenshot user [V PDF p5]. That the box is filled from the user's Report Access Provider and pins the report to that provider is [I].

### 1.8 Login history, lockout and password policy [V]

| Item | Fact | Evidence |
|---|---|---|
| Last login | `users.last_login_at` set on successful `/auth/login` only (not on token refresh) | `auth_service.py` L106-111 |
| Login history | None. No table, and no audit row: the middleware requires `request.state.token_payload`, which a login request never has | `middleware/audit.py` L45-50 |
| Logout | `POST /auth/logout` **is** audited (`resource_type='auth'`, `resource_id='logout'`) because it carries a token | same; `auth.py` L81-91 |
| Failed logins | Redis counter `login:fail:<lowercased identifier>`, TTL `LOGIN_LOCKOUT_MINUTES` (15); ≥ `LOGIN_MAX_FAILED_ATTEMPTS` (5) → 423 `account_locked`. Not persisted; counts read 0 when Redis is down | `auth_service.py` L44-63; `config.py` L60-61 |
| Username match | Case-sensitive `User.username == :u OR User.email == :u` | `auth_service.py` L68-70; [D] `FE:docs/security/users/users_login_reset_backend_devreport.md` |
| Password complexity | ≥8 chars, lowercase, uppercase, digit, symbol on every password write; kill switch `PASSWORD_POLICY_ENFORCED`; published at `GET /auth/password-policy` | `app/core/password_policy.py` L20-29 |
| Password expiration | `account_settings.password_expiration_days` (default 365, "0 = never" per FE doc) is stored; **no code reads it** | `app/db/models/account.py` L114; grep |
| `password_created_at` | Set only by forgot-password reset and legacy activation; **not** by user creation, admin reset or self-service change — unusable as "password age" | `auth_extras_service.py` L141-142, L202-203; `user_admin_service.py` L224-246, L347-353 |
| `must_change_password` | Stored; cleared by change / reset; login issues tokens regardless | `auth_service.py` L106-111 |
| Login window, IP rules | `user_login_restrictions`, `user_ip_rules` are never read outside the Users admin service | grep |
| Reset / activation trace | `auth_action_tokens` (`purpose`, `created_at`, `used_at`) | `identity.py` L121-136 |

### 1.9 Read endpoints usable for security lists [V]

| Endpoint | Guard | Filters / paging | Returns |
|---|---|---|---|
| `GET /users` | `require_read_access("setup_security_users_screen_view_only", "…_full_control")` | `office_id` (via `user_offices`), `role`, `is_active`, `search` (username, email, first / last name), `sort` ∈ created_at, id, username, last_login_at; `size` ≤ 200 | `PaginatedResponse[UserRead]` |
| `GET /users/{id}` | same | – | `UserRead` |
| `GET /users/{id}/security-settings` | admin | – | `patient_access_level` + `login_restrictions` |
| `GET /users/{id}/time-clock-config` | admin | – | pay rate, overtime rule |
| `GET /users/setup-metadata` | admin | – | `roles`, `patient_access_levels`, `overtime_methods`, preferences schema |
| `GET /roles` | token | – | `[{value, label}]` |
| `GET /permissions` | token | – | `[{code, label, category}]` |
| `GET /user-groups` | token (generic CRUD) | `is_active`, `search` (name) | group rows |
| `GET /user-groups/{id}/rights` | `require_read_access("setup_security_groups_screen_view_only", "…_full_control")` | – | `list[str]` |
| `GET /user-group-memberships` | token (generic CRUD) | `user_id`, `group_id` | id pairs, no names |
| `GET /user-offices` | token (generic CRUD, **no tenant filter**) | `user_id`, `office_id` | id pairs |
| `GET /offices/{office_id}/users` | token + office path access | – | `list[UserRead]` |
| `GET /user-ip-rules` | token (generic CRUD) | `user_id`, `rule_type`, `is_active` | rows |
| `GET /auth/me-full` | self | – | own effective rights, groups, offices |

Missing for list reports [V]: users × groups × offices in one response; a `group_id` filter on `/users`; all groups with their rights in one response; effective rights of **another** user; date filters on `last_login_at` / `created_at`.

---

## 2. Audit trail

### 2.1 `audit_logs` [V] `app/db/models/audit.py` L17-47; `schema.sql`

| Column | Type | Content |
|---|---|---|
| `id` | BIGINT | surrogate |
| `tenant_id` | int, nullable, no FK | from the token (`payload["tenant_id"]`), not the `X-Tenant-ID` target |
| `user_id` | int, nullable, no FK | token `sub`; NULL for imaging asset reads |
| `action` | VARCHAR(20) | `POST` / `PUT` / `PATCH` / `DELETE` (middleware); `PRINT` (`record_print`); `GET` (imaging read) |
| `resource_type` | VARCHAR(100) | first path segment after `/api/v1` (`patients`, `user-groups`, `users`, `auth`, …) or the writer's label (`patient_report`, `claim_report`, `lab_report`, `time_clock_report`, `dicom_instance`) |
| `resource_id` | VARCHAR(100) | row id from the CRUD engine, else the 201 body `id`, else the second path segment (can be a literal such as `me`, `complete`, `logout`); report name for `PRINT` rows |
| `patient_id` | int | audit context → 201 body → `/patients/{id}/…` path |
| `office_id` | int | validated `X-Office-ID` → touched row's `office_id` → raw header |
| `method`, `path`, `status_code` | | request line (path ≤500, no query string) |
| `ip_address` | VARCHAR(64) | middleware: socket peer (`request.client.host`; behind Cloud Run that is the proxy [I]); `record_print`: first hop of `X-Forwarded-For` |
| `request_id` | VARCHAR(64) | correlation id (`X-Request-ID`) |
| `details` | JSON | `{patient_id, row_id, before, after, scope, changes}`; values truncated to 500 chars; `password`, `password_hash`, `sig_string`, `signature_data`, `ssn`, `ein`, `ai_assist_secret`, `twilio_auth_token`, `api_token` masked as `***`; for prints `{report, params}` |
| `created_at` | timestamp (naive, server `now()`) | |

Indexes [V schema.sql]: `tenant_id`, `user_id`, `resource_type`, `(resource_type, resource_id)`, `patient_id`, `office_id`, `created_at` — all single-purpose; no `(tenant_id, created_at)` composite. No user-agent column.

### 2.2 What is and is not logged [V]

| Event | Logged? | Where |
|---|---|---|
| Successful (2xx) `POST` / `PUT` / `PATCH` / `DELETE` by an authenticated caller | yes | `AuditMiddleware` (`middleware/audit.py` L40-81) |
| Field-level before / after of a generic CRUD write | yes, when the write goes through `CRUDBase` | `crud/base.py` L252, L275, L306-321; `core/audit_context.py` |
| Server-rendered patient PDFs (overview, ledger, transactions day sheet, insurance), ADA claim form PDF, lab reports, time-clock CSV / PDF | yes, `action='PRINT'` | `print_service.record_print` L320-339; callers `patient_reports.py` L44-48, `claim_forms.py` L62-69, `lab_tracking.py` L87-91, `time_clock.py` L398-402 |
| DICOM binary reads | yes when `IMAGING_AUDIT_READS` (default true), `user_id` NULL | `imaging.py` L156-165 |
| Logout, self password change, admin user edits, group-rights changes, office-assignment changes | yes (they are authenticated mutations) | middleware |
| Login success / failure, token refresh | **no** | §1.8 |
| Forgot-password, reset, legacy activation, signup | **no** (anonymous) | middleware precondition |
| Any `GET`: chart opens, patient search, ledger views, `/reports/*`, `/dashboard/summary`, list exports built client-side | **no** | `AUDITED_METHODS` = POST / PUT / PATCH / DELETE (`audit_service.py` L19) |
| Failed (4xx / 5xx) mutations, permission denials (403) | **no** | middleware L45-48 |
| Public AppointNow bookings, Twilio / SendGrid webhooks | **no** (no user token) | same |
| WebSocket messaging | **no** | not HTTP |

### 2.3 Other history / event tables [V column dumps]

| Table | Grain | Key columns | Supports |
|---|---|---|---|
| `signature_audit_events` | signature lifecycle event | `tenant_id`, `entity_type`, `entity_id`, `patient_id`, `event`, `actor_id`, `occurred_at`, `ip`, `user_agent`, `device_*`, `signature_type`, `content_hash`, `reason`, `signer_name`, `signer_relationship` | signature capture / export / void trail |
| `patient_medical_history_events` | field change | `patient_id`, `entity_type`, `entity_id`, `code`, `label`, `action`, `old_value`, `new_value`, `changed_by`, `created_at` | medical-history change log |
| `account_change_events` | guarantor / account move | `patient_id`, `action`, `old_account_id`, `new_account_id`, `old_guarantor`, `new_guarantor`, `moved_balance`, `effective_date`, `user_id` | account-transfer audit |
| `time_clock_entry_edits` | punch change | `entry_id`, `action`, `edited_by`, `edited_at`, `edit_reason`, `original_clock_in/out`, `new_clock_in/out`, `changes` | time-clock edit report |
| `utility_runs` | utility execution | `utility_id`, `office_id`, `run_by`, `status`, `parameters` JSON, `processed`, `succeeded`, `failed`, `logs` JSON, `finished_at`, `created_at` | "who ran what, with which parameters" |
| `letter_batch_runs` / `letter_batch_items` | batch + per-patient item | `template_id`, `office_id`, `status`, `requested`, `processed`, `succeeded`, `failed`, `options`, `created_by`, `finished_at` / `patient_id`, `status`, `document_id`, `error` | batch-output history |
| `support_tickets` | ticket | `reporter_user_id`, `summary`, `status`, `module`, `jira_issue_key` | help-desk list |
| `auth_action_tokens` | reset / activation request | §1.1 | password-reset activity |
| `sms_messages`, `email_messages` | message | `created_by`, `send_status`, `sent_at`, … | communication logs (other analysts) |
| Row stamps | per row | `created_by` / `updated_by` / `updated_at` on most setup tables (§5.1 marks the exceptions) | "modified by / on" columns |

### 2.4 Read APIs [V]

| Endpoint | Guard | Filters | Limits |
|---|---|---|---|
| `GET /audit-logs` | `require_roles("admin")` | `user_id`, `resource_type`, `resource_id`, `patient_id`, `office_id`; `sort` ∈ created_at, id | `size` ≤ 200; **no date range, no `action` filter, no user / office name resolution, no export** (`audit.py` L46-78) |
| `GET /patients/{patient_id}/audit-logs` | any authenticated user | `resource_type`, `resource_id`, `user_id`, `office_id` | same |
| `GET /utilities/audit` | token only (running a utility is admin-gated, reading the history is not) | `utility_id`, `office_id`, `run_by`, `date_from`, `date_to` | hard `limit 100` (`utility_service.py` L95-112) |
| `GET /utilities/jobs/{job_id}` | token only | – | – |
| `GET /insurance-plans/{plan_id}/history` | token | – | per-plan aggregation of `audit_logs` (`insurance.py` L284) |

### 2.5 Retention [V]

No retention, archival, partitioning or purge exists for `audit_logs` (the only retention code in the repository is `SMS_RETENTION_DAYS` + `scripts/purge_sms_messages.py`). The table grows by one row per mutating request and carries PHI in `details.before/after`.

### 2.6 What could record report runs and exports

| Option | Exists | Fit | Gap |
|---|---|---|---|
| `print_service.record_print(db, tenant_id, user_id, patient_id, report, path, params, resource_type)` | yes | One call gives a `PRINT` row with report name + parameters; already the convention for 4 report families | No row count, format, office set, duration, destination (download / e-mail), run id; `resource_type` vocabulary is ad hoc; `params` values are stringified |
| `utility_runs` shape | yes | Proven job row: status lifecycle, parameters, counters, logs, `run_by`, `office_id`, duplicate-run guard | Single `office_id`; no output artefact pointer; runs are recorded as `completed` without executing anything (`utility_service.py` L74-81) |
| `letter_batch_runs` / `_items` | yes | Real batch with per-item status and stored document id | Letter-specific |
| `audit_logs` via middleware | automatic for a `POST /reports/{key}/run` style endpoint | Free audit of who ran what if the run is a POST | Body is not captured unless the handler calls `audit_context.record(...)` |
| Dedicated `report_runs` / `report_exports` | no | — | to be designed |

---

## 3. Offices, office groups, operatories, hours, holidays, statement settings

### 3.1 Tables [V]

| Table | Model | Tenant | Key columns | Notes |
|---|---|---|---|---|
| `offices` | `identity.py` L139 | `tenant_id` | `id`, `legacy_id` UQ, `office_code` UQ (global), `name`, `short_id`, `corporate_name`, address block, `phone`, `phone_2`, `fax`, `email`, `timezone` (default `America/New_York`), `slot_interval_minutes`, `schedule_start_hour`, `schedule_end_hour`, `is_active`, `tax_id`, `npi`, `taxonomy_code`, `billing_provider_id`, `use_billing_license`, **`office_group_id`**, `opening_date`, `default_fee_schedule_id`, `default_ucr_fee_schedule_id`, `unpriced_charge_policy`, treatment-address block, `appointnow_requires_payment`, `appointnow_payment_amount`, `deleted_at`, `deleted_by`, `deleted_operatory_ids`, `created_by`, `created_at`, `updated_at` | Deleted vs inactive: both `is_active=false`; only a delete stamps `deleted_at` |
| `office_groups` | L308 | `tenant_id` | `id`, `legacy_id`, `name`, `address`, `address2`, `city`, `state`, `zip`, `phone`, `created_by` (string), `created_at` | Flat; no type, parent, `is_active`, description; hard delete |
| `operatories` | L287 | **none** (`office_id`) | `id` VARCHAR PK (`op-{office_id}-{n}` or legacy `OPR-…`), `office_id`, `legacy_id`, `name`, `display_order`, `provider_id` (default column-header provider), `is_active`, `created_at` | No operatory type (hygiene / doctor / ortho chair), no `updated_at` |
| `office_schedule_days` | `office_setup.py` L91 | `tenant_id` | `office_id`, `day_of_week` (0 = Mon … 6 = Sun), `is_closed`, `start_time`, `end_time`, `lunch_start`, `lunch_end`; UQ `(office_id, day_of_week)` | Hours bind only when rows exist; otherwise default Mon–Fri 08:00–17:00 is reported, not enforced |
| `account_holidays` | `account.py` L227 | `tenant_id` | `office_id` (NULL = tenant-wide), `holiday_date`, `holiday_name`, `status` (`CLOSED` / `OPEN` / `HALF_DAY`), `holiday_type` (`FEDERAL` / `CUSTOM`), `is_recurring`, `created_by` | One table serves account and office holidays; an office row beats the account row for the same date |
| `office_statement_settings` | `office_setup.py` L36 | `tenant_id` | `office_id` UQ, `message_general`, `message_current`, `message_30`, `message_60`, `message_90`, `message_120`, `correspondence_name`, `logo_option`, `logo_url`, `address_source`, `statement_address_*`, `statement_phone`, `updated_by` | Dunning messages per aging bucket |
| `office_advanced_settings` | L105 | `tenant_id` | `office_id` UQ, `finance_charge_pct`, `min_balance`, `min_charge`, `days_before_charge`, `sales_tax_pct`, `default_appt_duration`, `scheduler_end_date`, `place_of_service`, `preferred_provider_id`, `is_ortho`, `effective_date` | Finance-charge parameters |
| `office_integrations`, `office_smart_assist`, `office_smart_assist_items` | L63, L136, L146 | `tenant_id` | integration settings / SmartAssist grid | not report sources |
| `account_settings` | `account.py` L35 | `tenant_id` (1:1) | `pgid`, `oid`, statement block (`statement_use_corporate`, `statement_address_*`, `statement_close_out_individual`, `statement_close_out_all`), `model_office_id`, `only_show_office_items`, `show_booked_production`, `show_production_colors`, `max_treatment_plan_discount`, `default_write_off_code`, `default_transfer_code`, `default_fee_increase_code`, `default_fee_decrease_code`, `password_expiration_days`, … | Tenant-level switches |
| Office ↔ catalog links | `office_assignment.py` | `tenant_id` + `office_id` | `office_procedure_codes`, `office_code_bundles`, `office_production_types`, `provider_offices`, `office_note_macros`, `office_prescription_library`, `office_letter_templates`; plus `office_phone_assignments` | "Unassigned = whole catalog" semantics on the `/effective` reads |

### 3.2 Office grouping [V]

| Question | Answer |
|---|---|
| Does a grouping of offices exist? | Yes: `office_groups` + `offices.office_group_id` (FK, nullable). Validated on write (`office_setup_service.py` L583-587, 422 `office_group_not_found`) |
| Cardinality | One group per office. No many-to-many, no hierarchy (region → district → office), no group type |
| Where it is honoured | `OfficeScopeDep` `?office_group_id=` on every office-scoped CRUD list, `/dashboard/summary`, `/reports/time-clock`; `fee_schedule_assignments.office_group_id`; pricing context; patient search `search_scope=group` (`patient_service.py` L153-186); `MeFull.offices[].office_group_id` |
| Non-privileged caller | group ∩ the caller's assigned offices (`office_scope_service.py` L334-340) |
| Other groupable attributes | `offices.state`, `city`, `zip`, `timezone`, `opening_date`, `tenant_id`; no region column |
| Legacy use | Almost every legacy criteria screen carries an "Office \| Office Group" radio + selector (§5.3) |
| Frontend | Manage Office Groups screen built; assignment is the Office Info tab's `office_group_id` field [D] `FE:docs/setup/offices/OFFICES_INTEGRATION.md` L368 |

### 3.3 Endpoints [V]

| Endpoint | Filters | Notes |
|---|---|---|
| `GET /offices` | `is_active`, `office_group_id`, `assigned_to_me`, `search` (name, office_code, city) | Tenant-wide by default (label table); `OfficeRead` adds `logo_url`, `letterhead`, `deleted_by_name` |
| `GET /office-groups` | `search` (name) | no `is_active` |
| `GET /operatories` | `office_id`, `is_active`, `search` (name) | office-scoped (day-data rule) |
| `GET /offices/{id}/schedule` | – | 7 rows (defaults synthesised when none stored) |
| `GET /offices/{id}/calendar?from_date&to_date` | ≤ 400 days | Per date: `is_open`, `start_time`, `end_time`, `lunch_start`, `lunch_end`, `hours_source` (`stored` / `default`), `closed_reason`, `holiday`, `holidays[]` — reusable as a working-day / open-hours denominator (`office_calendar_service.calendar`) |
| `GET /offices/{id}/holidays?from_date&to_date`, `GET /tenants/{id}/holidays` | date range | office and account level |
| `GET /offices/{id}/statement-settings`, `/advanced-settings`, `/integrations`, `/smart-assist` | – | 1:1 singletons |
| `GET /offices/{id}/{procedure-codes \| exp-codes \| production-types \| providers \| note-macros \| prescription-library \| letter-templates}[/effective]` | `include_inactive` on `/effective` | assignment grids and effective pick lists |
| `GET /offices/{id}/users` | – | §1.6 |
| `GET /offices/metadata`, `/offices/setup-rules` | – | dropdown metadata |

Guards [V]: every route in `office_setup.py`, `office_assignment.py`, `provider_setup.py`, `account.py` depends on `get_current_user` only (plus tenant / office-path checks); the one role check is inside `office_lifecycle_service.hard_delete` (`DELETE /offices/{id}?hard=true`). No Setup screen right (`setup_office_screen_*`, `setup_provider_screen_*`, …) is enforced server-side.

---

## 4. Providers

### 4.1 `providers` [V] `identity.py` L223-284

| Group | Columns |
|---|---|
| Identity | `id` VARCHAR(50) PK, `tenant_id`, `legacy_id`, `name`, `first_name`, `last_name`, `title`, `short_id` |
| Classification | **`role`** VARCHAR(50) default `dentist`; `specialty` VARCHAR(100) free text; `taxonomy_code` VARCHAR(10); `is_ortho_provider`; `is_billing_provider`; `is_active` |
| Credentials | `npi`, `license` (one string), `tax_id`, `dea_id`, `dosespot_user_id`, `denticon_user_id` |
| Placement | `office_id` (home office, NOT NULL), `default_operatory_id`, `scheduler_color`, `default_provider_time` (minutes), `visible_in_appointnow` |
| Letterhead | `address_line1/2`, `city`, `state`, `zip`, `phone`, `email` |
| Links / misc | `user_id` → `users.id`, `print_separate_claim_form`, `ortho_questionnaire_template`, `custom_1`, `custom_2`, `created_by`, `created_at` |

Absent [V]: `updated_at` / `updated_by` (the model uses `CreatedAtMixin` only), license state / number split / expiry, DEA expiry, hire / termination date, employment type, compensation or collection-percentage fields, production goals (no goals table anywhere; the `setup_provider_goals_screen_*` rights were deleted).

### 4.2 Doctor vs hygienist [V] `provider_directory_service.py` L14-104

| Item | Fact |
|---|---|
| Distinguishing column | `providers.role`; canonical values `dentist`, `hygienist`, `assistant`, `specialist`, `staff` (`PROVIDER_ROLES` L46-48, mirrored by `/definitions` group `provider_role`) |
| Canonicalisation | On every write through `ProviderCRUD` (alias map L52-61: `dds` / `dmd` / `doctor` / `provider` → `dentist`; `rdh` / `hygenist` / `hygiene` → `hygienist`; …). Unknown strings are stored lower-cased, not rejected |
| Migrated rows | Not rewritten on read; `scripts/normalize_provider_roles.py` repairs them (dry-run by default). Live tenant 1 held `dentist` 78, `hygienist` 16, `Dentist` 2, `Hygenist` 1, `staff` 2 [D] docstring L14-16 |
| Derived kind | `provider_kind(role, title)`: a clinical role wins, else the licence title (`DDS` / `DMD` / `MD` → dentist, `RDH` / `RDHAP` → hygienist, `RDA` / `CDA` → assistant), else the role. Exposed as `ProviderRead.provider_kind` by `enrich_provider` — **Python only, not a column** |
| Specialty | `specialty` free text, blank on 96 of 97 migrated rows [D]; `ProviderRead.effective_taxonomy_code` / `specialty_code` / `specialty_label` derive from `taxonomy_code`, else a keyword map (`provider_taxonomy_service.TAXONOMY_CODES`, 14 dental NUCC codes), else `122300000X`; `GET /provider-specialties` lists the taxonomy with the tenant's providers under each |
| Ortho | `is_ortho_provider` boolean |
| Patient-side split | `patients.preferred_provider_id` vs `patients.preferred_hygienist_id` (both list filters) |

Consequence [I]: a SQL aggregate "doctor production vs hygiene production" must reproduce `provider_kind` as a `CASE` over `lower(trim(role))` + `title`, or the kind must be persisted; a hygienist filed as `staff` with title `RDH` is a hygienist only through the title fallback.

### 4.3 Related provider tables [V]

| Table | Key columns | Endpoint | Use |
|---|---|---|---|
| `provider_offices` | `provider_id`, `office_id`, `tenant_id`; UQ `(office_id, provider_id)` | `GET /offices/{id}/providers` (assignment), `…/providers/effective` (assigned ∪ home), `GET /providers?office_id=` / `?office_ids=1,9` (same union), `ProviderRead.served_office_ids` | Office rosters. Rosters are sparse; `scripts/backfill_provider_offices.py` reconstructs them [D] |
| `provider_schedule_days` | `provider_id`, `office_id` (NULL = all offices), `day_of_week`, `is_closed`, `start_time`, `end_time`, `lunch_*`, `effective_from` | `GET /providers/{id}/schedule` | Scheduled hours (capacity denominator) |
| `provider_holidays` | `provider_id`, `holiday_date`, `holiday_name`, `status`, `holiday_type`, `is_recurring`, `created_by` | `GET /providers/{id}/holidays?from_date&to_date` | Time off — one call per provider |
| `fee_schedule_assignments` | `provider_id` or `specialty_id` and / or `ins_plan_id` / `carrier_id`, narrowed by `office_id` / `office_group_id`, → `fee_schedule_id` | `GET /fee-schedule-assignments?provider_id=&specialty_id=&office_id=&office_group_id=&carrier_id=&ins_plan_id=&has_provider=&has_specialty=&has_payer=&provider_ids=&office_ids=`; `GET /fee-schedules/{id}/scope` | Provider / specialty fee-schedule binding |
| `provider_procedure_codes` | `provider_id`, `procedure_code` | `GET /providers/{id}/procedure-codes`, `GET /procedure-codes/{code}/providers`, `GET /procedure-codes/eligibility` | Allowed codes per provider (empty = unrestricted) |
| `provider_insurance_ids` | `provider_id`, `carrier_id`, `ins_id`, `in_network` | `GET /provider-insurance-ids?provider_id=&carrier_id=&in_network=` | Per-carrier provider ids, network status |
| `provider_carrier_logins` | `provider_id`, `carrier_id`, `portal_name`, `portal_url`, `username`, `password_enc`, `is_active` | `GET /provider-carrier-logins?provider_id=` | Credentials (masked) — exclude from lists |
| `provider_referral_offices` | `provider_id`, `office_id` | `GET /providers/{id}/referral-offices` | Referral allow-list |
| `provider_route_slips` | `provider_id`, `procedure_code`, `num_times` | `GET /provider-route-slips?provider_id=` | Route-slip codes |
| `provider_signatures`, `provider_watermarks` | 1:1 | `GET /providers/{id}/signature`, `/watermarks` | Not report sources |
| `operatories.provider_id` / `providers.default_operatory_id` | – | `GET /operatories?office_id=` | Provider ↔ operatory (the legacy "Provider Operatory" list) |

`GET /providers` [V registry L348]: filters `office_id`, `office_ids`, `is_active`, `role`; `search` over name, specialty, npi; sortable `created_at`, `id` only; **no** `specialty`, `state`, `taxonomy_code`, `is_ortho_provider`, `user_id` filter. Not office-scoped (pickers prefer, never exclude).

---

## 5. Setup catalogs behind the legacy "Setup lists"

### 5.1 Catalog inventory [V] models + `app/api/v1/registry.py` (97 generic CRUD entities)

Generic list rules [V] `crud/base.py`, `crud/router_factory.py`, `deps.py` L144-151: `page` ≥ 1, `size` ≤ 200, `sort` honoured only for declared sortable columns (default `created_at`, `id`), `order`, `search` = `ILIKE %term%` over the declared columns, equality filters as listed, `{field}_from` / `{field}_to` for declared ranges. Reads are guarded by a valid token only. "Stamps" = modified-by / modified-on columns present.

| Catalog | Table(s) | Tenant / office | Key columns | List endpoint and filters | Stamps |
|---|---|---|---|---|---|
| Procedure codes | `procedure_codes` (PK `code`) | **global** | `description`, `category`, `coverage_category`, `default_fee`, `default_duration_minutes`, `requires_tooth`, `requires_surface`, `requires_quadrant`, `requires_lab`, `requires_attachment` / `_perio_chart` / `_photo` / `_xray` / `_missing_tooth_info`, `is_ortho`, `billing_order`, `recall_interval`, `recall_unit`, `chart_category`, `taxable`, `ledger_code`, `ar_code`, `visit_code`, `exempt_from_dental_max`, `amb_code`, `is_downgrade`, `alternate_of`, `default_provider_id`, `is_active` | `GET /procedure-codes?category=&is_active=&is_ortho=&chart_category=&coverage_category=&search=` (code, description, category); sort `code`, `category` | `created_at` only |
| Procedure categories | derived from `procedure_codes.category` | global | `category`, `code_count`, `active_code_count` | `GET /procedure-code-categories?active_only=`; `GET /procedure-codes/stats` (total / active / inactive / ortho / by_category) | – |
| Coverage (ADA) categories | `procedure_codes.coverage_category` + `/definitions` `coverage_category`, `DEFCOVERAGE` | global / tenant | category code ↔ CDT ranges, default coverage % in `key2` | `GET /metadata/coverage-categories`; `GET /definitions?group_code=DEFCOVERAGE` | definitions: yes |
| Per-code insurance rules | `procedure_insurance_rules` | tenant | `procedure_code`, `coverage_pct`, `frequency_limit`, `age_limit`, `wait_period`, `is_active` | `GET /procedure-codes/{code}/insurance-rules` | yes |
| Explosion codes | `explosion_codes` + `explosion_code_items` | tenant, `office_id` (catalog scope) | `code`, `description`, `is_active`; items `procedure_code`, `display_order`, `default_fee`, `tooth`, `surface`, `quadrant` | `GET /explosion-codes?office_id=&is_active=&search=`; `GET /explosion-code-items?explosion_code_id=&procedure_code=` | `created_by` only |
| Code bundles ("Exp Codes") | `code_bundles` + `code_bundle_items` | tenant | `name`, `display_code`, `description`, `same_tooth`; items as above | `GET /code-bundles?search=`; `GET /code-bundle-items?bundle_id=&procedure_code=`; `GET /offices/{id}/exp-codes[/effective]` | `created_by` only |
| Fee schedules | `fee_schedules` | tenant (catalog scope; `office_id` deprecated) | `name`, `fee_type` (`ucr` / `standard` / `plan` / `carrier`), `pricing_model` (`percentage` / `copay`), `effective_date`, `version`, `parent_schedule_id`, `is_active` | `GET /fee-schedules?is_active=&fee_type=&pricing_model=&parent_schedule_id=&effective_date_from/_to=&search=` (name); sort `name`, `effective_date`; `GET /fee-schedules/options`; `/{id}/usage`; `/{id}/scope`; `/metadata` | `created_at` only |
| Fee schedule entries | `fee_schedule_entries` | tenant (denormalised) | `fee_schedule_id`, `procedure_code`, `amb_code`, `patient_fee`, `insurance_fee` ("plan pays", copay lists only), `is_no_charge`, `effective_date` (NOT NULL); UQ `(fee_schedule_id, procedure_code, effective_date)` | `GET /fee-schedule-entries?fee_schedule_id=&procedure_code=` (page ≤ 200; a list holds ~900+ codes [D]) | yes |
| Fee schedule assignments | `fee_schedule_assignments` | tenant | §4.3 | §4.3 | `updated_by` |
| ICD codes | `icd_codes` | **global** | `code`, `description`, `icd9`, `icd10`, `snomed`, `is_active` | `GET /icd-codes?is_active=&search=` (code, description, icd10, snomed); sort `code` | `created_at` only |
| Place-of-service codes | `place_of_service_codes` | tenant, `office_id` | `code`, `type`, `name`, `tax_id`, `is_active` | `GET /place-of-service-codes?office_id=&is_active=&search=` | `created_at` only |
| Modifier / type-of-service codes | `/definitions` groups `MODIFIER`, `TYPEOFSERVICE` | tenant | `key1`, `description` | `GET /definitions?group_code=` | yes |
| Definitions (generic code tables) | `definitions`, `definition_groups` | tenant | `group_code`, `key1`, `key2`, `description`, `color`, `sort_order`, `section`, `is_active`, `is_flash_alert`, `blocks_charges`, `input_type`; groups: `group_code`, `description`, `key1_label`, `key2_label`, `is_editable`, `can_add`, `group_type` | `GET /definitions?group_code=&is_active=&search=` (description, key1); `GET /definition-groups?group_type=&search=` | yes (`updated_at`, `updated_by`) |
| Payment types / adjustment codes ("credit codes") | `/definitions` groups `payment_method` (`key2` = `patient` / `insurance`) and `adjustment` (`key2` = `production` / `collection`) | tenant | as above | `GET /definitions?group_code=payment_method` / `adjustment` | yes. `key2` was NULL on every live row before `scripts/seed_transaction_definitions.py` [D] |
| Appointment statuses / types | `/definitions` groups `appt_status` (10 seeded values with `color`), `appt_type` (7 seeded), `procedure_type` | tenant | – | `GET /definitions?group_code=appt_status` | yes |
| Production types | `production_types` (+ `office_production_types`) | tenant | `name`, `color`, `description`, `appointnow_visible`, `appointnow_duration`, `is_inactive`, `is_active` | `GET /production-types?is_active=&is_inactive=&search=`; `GET /offices/{id}/production-types[/effective]` | `created_at` only. **Not referenced by** `procedure_codes`, appointments or procedures |
| Pick lists | `questionnaire_headers` + `questionnaire_options` | tenant (options: none) | `description`, `is_multi_select`, `is_active`, `is_custom`; options `answer_code`, `sort_order`, `is_active` | `GET /questionnaire-headers?is_active=&is_custom=&search=`; `GET /questionnaire-options?questionnaire_id=&is_active=` | `created_at` only |
| Note macros | `note_macros` (+ `office_note_macros`) | tenant | `name`, `content`, `category`, `created_by`, `updated_by` | `GET /note-macros?category=&search=` (name, category); sort `name`, `category`; `GET /note-macros/categories` | yes |
| Note macro categories | `/definitions` group `NOTESMACROS` (code in `legacy_id`) | tenant | – | `GET /note-macros/categories` | – |
| Medical alerts / medical + dental questionnaires | `definition_groups.group_type` ∈ `MEDALERT`, `MEDQUEST`, `DENTQUEST` + their `definitions` | tenant | `key1` (code), `description`, `section`, `input_type`, `sort_order`, `is_flash_alert` | `GET /definition-groups?group_type=MEDALERT`, then `GET /definitions?group_code=` | yes. A built-in catalog is served until a tenant catalog is seeded [D] `scripts/seed_medical_history_catalogs.py` |
| Custom toolbars | `definition_groups.group_type='TOOLBAR'` + `definitions` | tenant | – | same pattern | yes [D] registry comment L1261 |
| Prescription library | `prescription_library` (+ `office_prescription_library`) | tenant | `drug_name`, `dispense`, `sig`, `refills`, `is_as_written`, `is_active`, `allergy_keys`, `created_by`, `updated_by` | `GET /prescription-library?is_active=&search=` (drug_name); sort `drug_name` | yes |
| Labs | `labs` | tenant, `office_id` (catalog scope) | `name`, `code`, `contact_name`, phone / fax / email / address, `default_turnaround_days`, `is_active` | `GET /labs?office_id=&is_active=&search=`; sort `name`, `code`, `city` | yes |
| Referral sources | `referrals` (+ `referral_demog_headers` / `_details`) | tenant, `office_id` | `referral_type` (code `"0"` referred-by / `"1"` referred-to), `patient_id`, name, `practice_name`, `specialty`, `npi`, `reason_code`, `cost`, `e_referral_id` | `GET /referrals?patient_id=&office_id=&referral_type=&reason_code=&legacy_id=&search=`; `GET /referral-demog-headers` | `created_by` only |
| Carriers | `insurance_carriers` | tenant | `name`, `carrier_type`, `insurance_type`, `payer_id`, `national_id`, `claim_type`, contact + address (`state`), `supports_realtime_eligibility`, `supports_claim_status`, `is_active` | `GET /insurance-carriers?is_active=&carrier_type=&insurance_type=&payer_id=&is_dental=&search=` (name, payer_id) | legacy `created_on/by`, `modified_on/by` (strings) + `updated_at`, `updated_by` |
| Insurance plans | `insurance_plans` | tenant | `carrier_id`, `employer_id`, `group_number`, `plan_type`, `coverage_type`, maxima / deductibles, `anniversary_*`, `network_type`, `is_locked`, `is_active` | `GET /insurance-plans?carrier_id=&employer_id=&is_active=&group_number=&coverage_type=&plan_type=&group_number_contains=&group_number_startswith=&carrier_name=&payer_id=&search=`; `/{id}/usage`, `/{id}/history`, `/metadata` | same as carriers. ~31k rows; `group_number` filter ~20 s [D FE memory] |
| Employers | `employers` | tenant | `name`, address (`state`), `phone`, `salesrep`, `contact_person` | `GET /employers?legacy_id=&search=` (name, city) | `created_by`, `updated_by`, `updated_at` |
| Custom coverage | `ins_custom_coverage`, `insurance_coverage_rules`, `insurance_plan_frequency_groups` | tenant / by plan | code ranges, `coverage_pct`, `freq_limit`, ages, waits | `GET /ins-custom-coverage`; `GET /insurance-coverage-rules?ins_plan_id=&category=&start_code=`; `GET /insurance-plan-frequency-groups?ins_plan_id=&code_group=` | partial |
| Collection agencies | `collection_agencies` | tenant | `name`, address, `phone` | `GET /collection-agencies?search=` | `created_by` (string) |
| Recall types | **no table** — `patient_recalls.recall_type` free text; `procedure_codes.recall_interval` / `recall_unit` | – | – | – | – |
| Letter templates | `letter_templates` (+ `office_letter_templates`); types in `/definitions` `LETTERTYPE`, `letter_channel` | tenant | `name`, `letter_type`, `channel`, `title`, `body_html`, `is_editable`, `is_active` | `GET /letter-templates?letter_type=&is_active=&search=` (name, title); `GET /offices/{id}/letter-templates/effective`; `GET /letters/merge-fields` | `created_at` only |
| Postcard templates | `postcard_templates` | tenant, `office_id` | `name`, `card_type`, `body` | `GET /postcard-templates?office_id=&search=` | `created_at` only |
| SMS templates, campaigns | `sms_templates`, `campaigns` | tenant, `office_id` | `name`, `message_type`, `body`, `is_active`; `code`, `name`, `channel`, `start_date`, `end_date` | `GET /sms-templates?office_id=&message_type=&is_active=`; `GET /campaigns?office_id=&channel=&is_active=&start_date_from/_to=` | partial |
| Chart templates | `chart_status_templates`, `perio_chart_templates`, `chart_colors`, `chart_materials` | tenant | names + drawing / threshold settings | `GET /chart-status-templates?template_type=&arch=&material=&is_active=`; `GET /perio-chart-templates`; `GET /chart-colors`; `GET /chart-materials` | yes |
| Imaging templates | `imaging_templates` | `office_id` only | `name`, `template_type`, `dentition` | `GET /imaging-templates?office_id=` | `created_at` only |
| AppointNow reasons | `appointnow_reasons` | tenant, `office_id` | `reason_code`, `label`, `duration_minutes`, `requires_provider`, `display_order`, `is_active` | `GET /appointnow-reasons?office_id=&is_active=&requires_provider=` | `updated_by` |
| Document / patient types and other person vocabularies | `/definitions` groups `document_type`, `imaging_document_type`, `patient_type`, `resp_party_type`, `referral_type`, `gender`, `title`, `marital_status`, `contact_pref`, `plan_type`, `claim_status`, `coverage_type`, `provider_role`, `user_role`, `patient_access_level`, `holiday_status`, `holiday_type`, … | tenant | – | `GET /definitions?group_code=` | yes |
| Insurance-plan vocabularies | `/definitions` groups `FREQUENCYLIMITATIONS`, `DEFCOVERAGE`, `INSLIMITATIONS`, `PLANTYPE`, `PLANSUBTYPE` | tenant | – | `GET /insurance-plans/metadata` (falls back to built-in lists) | yes. Present on the migrated tenant only until `scripts/seed_insurance_plan_definitions.py` runs [D] |
| Pharmacies, schools | **no table** (`patients.school_name` is free text) | – | – | – | – |
| Time-clock settings | `time_clock_settings` (1:1 tenant), `time_clock_periods` | tenant | overtime rule, thresholds, pay periods | `GET /time-clock/…` (hand-written) | yes |

### 5.2 Notes that affect list reports [V]

| Note | Detail |
|---|---|
| Soft-delete conventions differ | `is_active` (most, incl. `letter_templates`, `labs`, `user_groups`); `is_inactive` (`chart_conditions`; `production_types` carries both `is_active` and `is_inactive`); `is_deleted`, `is_archived`, `is_void` elsewhere; **hard delete** on `office_groups`, `employers`, `code_bundles`, `chart_materials`, `chart_colors`, `note_macros`, `postcard_templates`, `collection_agencies`, `definition_groups`, `user_offices`, `user_group_memberships` |
| Deprecated columns | `fee_schedules.ins_plan_id` / `office_id` are never read (`codes.py` L123-127); binding lives in `fee_schedule_assignments` + office / patient pointers |
| Migration duplicates | Unique keys `(tenant_id, legacy_id)` were added to `chart_materials`, `note_macros`, `code_bundles`, `prescription_library`, `chart_colors`, `fee_schedules`, and `(tenant_id, group_code, key1, description)` to `definitions`; dedupe scripts exist; whether every database has been deduped is [D] |
| "Capitation" lists | `fee_schedules.pricing_model = 'copay'` with `fee_schedule_entries.insurance_fee` = plan pays (`fee_vocab.py` L88-102, L136-146) |
| Office-specific catalogs | "Unassigned office = whole catalog": `office_assignment_service.get_effective`; tenant switch `account_settings.only_show_office_items` |

### 5.3 Legacy list reports → current data (criteria transcribed from the reference PDFs)

Every legacy list offers Print Format **PDF / Excel** and "Add to My Favorites". Coverage: **full** = table and every criterion exist; **partial** = table exists, a criterion or column is missing; **none** = no data.

**Security List Reports** (`security_list_reports.pdf`)

| Legacy report | Legacy criteria | Source today | Coverage |
|---|---|---|---|
| User List | User (all / select); Include Inactive Users | `users` (+ `user_offices`, memberships) | full for the roster; no login-history columns |
| Group List | – | `user_groups` | full |
| Group Rights List | – | `user_groups` × `user_group_rights` × `permissions` | full (one API call per group today) |
| User-Group Membership | Detail / Summary; Security Group (all / select); Location = Office \| Office Group; Include Inactive Users | `user_group_memberships` × `users` × `user_offices` × `offices.office_group_id` | full in SQL; no endpoint joins them |

**Provider List Reports** (`providers_list_reports.pdf`)

| Legacy report | Legacy criteria | Source today | Coverage |
|---|---|---|---|
| Provider List | Office \| Office Group; Provider; Specialty; State | `providers` (+ `provider_offices`) | partial — `specialty` is free text and mostly blank; `state` is the letterhead state; no API filter for either |
| Provider Holidays | Office \| Office Group; Provider; date range (labelled "Last Visit Date Range") | `provider_holidays` | full in SQL; API is per provider |
| Provider Operatory | Office \| Office Group; Provider | `operatories.provider_id`, `providers.default_operatory_id` | full |
| Provider Registration | Office \| Office Group | `providers` (`npi`, `license`, `dea_id`, `tax_id`, `taxonomy_code`), `provider_insurance_ids` | partial — content of the legacy output is unknown; no license state / expiry |

**Setup List Reports** (`setup_list_reports.pdf`, 20 lists)

| Section | Legacy report | Legacy criteria | Source today | Coverage |
|---|---|---|---|---|
| Insurance | Employer List | Employer; State | `employers` | full (no `state` API filter) |
| Insurance | Insurance Plan List | Sort by Carrier / Employer; Employer; Carrier; Group #; date range on Created On / Modified On; User (include user in filters) | `insurance_plans` + carriers + employers | partial — creator / modifier are legacy strings (`created_by`, `modified_by`) plus `updated_by` FK; `created_on` / `modified_on` legacy timestamps |
| Insurance | Carrier List | Carrier; State | `insurance_carriers` | full |
| Insurance | Inactive Plans List | Carrier | `insurance_plans.is_active = false` | full |
| Prescription | Drug List | User | `prescription_library` | partial — `created_by` / `updated_by` are NULL on migrated rows [D] `codes.py` L311-315 |
| Procedure | Procedure Codes List | Category; Production Type; Status Active / Inactive / Both; Include only Tooth Required / Surface Required / Bill to Insurance | `procedure_codes` | partial — **no production-type link, no bill-to-insurance flag** |
| Procedure | Explosion Codes List | Summary / Detail | `explosion_codes` + items (and `code_bundles` + items) | full; two parallel catalogs exist |
| Procedure | Procedure Codes by Fee Schedule | Code type Dental / Medical / Other; Category; Production Type; Fee Schedule; Effective Date; Status; same three options | `fee_schedule_entries` ⋈ `procedure_codes` | partial — no code-type column (leading `D` / `category='medical'` heuristic), no production type |
| Procedure | Credit Codes Report | Type; Class | `/definitions` `payment_method`, `adjustment` (`key2`) | partial — depends on `key2` being populated |
| Fee Schedule | Fee Schedule List | Fee Schedule | `fee_schedules` | full |
| Fee Schedule | Capitation Fee Schedule | Capitation fee schedule | `fee_schedules.pricing_model='copay'` + entries | full [I mapping] |
| Office | Office List | Office \| Office Group | `offices` | full |
| Office | Office Holidays | Office \| Office Group; date range | `account_holidays` | full |
| Office | Operatory List | Office \| Office Group | `operatories` | full |
| Misc | ADA Categories List | – | `procedure_codes.category` / `/procedure-code-categories` | full |
| Misc | Default Ins Plan Coverage Category List | – | `/definitions` `DEFCOVERAGE`, `/metadata/coverage-categories` | full where seeded |
| Misc | Document Types List | – | `/definitions` `document_type` | full |
| Misc | Notes Macro Category List | – | `/definitions` `NOTESMACROS`, `/note-macros/categories` | full |
| Misc | Notes Macros List | Macro Category | `note_macros` | full |
| Misc | Patient Types List | – | `/definitions` `patient_type` | full |

**My Reports** (`my_reports.pdf`; user-scoped family — criteria relevant to this scope)

| Legacy report | Scope-relevant criteria | Depends on |
|---|---|---|
| Daily Journal | "Report By" = User; Office \| Office Group; Transaction Date vs Created Date; Patient Type; transaction types; Patient ID vs Chart # | `created_by` → `users.id` on `patient_procedures`, `patient_payments`, `patient_adjustments` [V]; migrated rows carry the user only as the string `created_by_legacy` (procedures, payments); office scope |
| Time Clock Report | Detail / Summary / Employee Total Only; Office \| Office Group; date range; Group By Office (disabled) | exists: `/reports/time-clock` |
| Missing Progress Notes | Office \| Office Group; Provider; appointment date range; only missing / all | provider filter |
| Appointment Detail by User | Office \| Office Group; Provider; Appointment Date vs Created On; Operatory; include cancelled; include phone | `appointments.created_by` → `users.id` [V] |
| Production Report | Office \| Office Group; **Corresponding Provider (read-only)**; date range; Production by Code / Provider / Category; Codes; Include UCR; Fee Schedule to Compare | the user → provider link (§1.7) |

---

## 6. Multi-tenancy and cross-office reporting

| Topic | Fact | Evidence |
|---|---|---|
| Tenant model | Column-based: `tenant_id` from the JWT user; `X-Tenant-ID` honoured for `super_admin` only | [V] `deps.py` L64-74 |
| Deployment | One database per client organisation, each with tenant id 1, own buckets | [D] `docs/onboarding/NEW_CLIENT_DATABASE.md` L12-15, L120, L175 |
| Shared dev / UAT database | Holds many tenants ("the other 42 tenants") | [D] `scripts/seed_insurance_plan_definitions.py` docstring |
| Cross-tenant benchmarking | Not available through the application: no cross-tenant read path, and production tenants live in separate databases | [I] from the two rows above |
| Cross-office benchmarking inside a tenant | Supported by the data: every operational row carries `office_id`; the caller's office set resolves through `OfficeScopeDep` (`office_id`, repeated `office_ids`, `office_group_id`, `all_offices`) | [V] `office_scope_service.py` L301-352, L468-498 |
| Right needed for "all offices" | `office_scope_view_all_offices` (aliases `OFFICES_VIEW_ALL`, `REPORTS_ALL_OFFICES`, `PATIENTS_VIEW_CROSS_OFFICE`), or a leadership role, or zero assignments | [V] `permission_service.py` L74-98; `office_scope_service.py` L277-298 |
| No separate "all-office reports" right | The four colon-style codes of the first design collapsed into the one master right | [V] `permission_service.py` L59-91 |
| Tables in this scope without `tenant_id` | `user_offices`, `operatories`, `tenants`, `refresh_tokens`, `auth_action_tokens`, `imaging_templates`, `questionnaire_options`, `code_bundle_items`, `explosion_code_items`, `perio_chart_settings`; global by design: `permissions`, `procedure_codes`, `icd_codes` | [V] models |
| Effect on generic lists | `CRUDBase._scope_tenant` filters only models that have `tenant_id`, so `GET /user-offices`, `GET /tenants`, and (for an unrestricted caller) `GET /operatories` are not tenant-filtered. Harmless in a single-tenant database, a leak in a shared one | [V] `crud/base.py` L91-94; registry L316, L368, L373 |
| Global catalogs and benchmarking | `procedure_codes` (incl. `category`, `coverage_category`) is shared by all tenants of a database, which keeps code-level comparisons consistent across offices; `PATCH /procedure-codes/{code}` therefore changes it for every tenant in that database | [V] `codes.py` L29-32 |
| Office time zone | `offices.timezone` per office; timestamps are stored naive UTC | [V] `identity.py` L158; `be_platform.md` §2.5 |
| Provider across offices | A provider has one home `office_id` plus `provider_offices`; a provider-level benchmark must attribute by the transaction's `office_id`, not the provider's home office | [V] §4.3 |
| Office identity for display | `offices.name`, `short_id`, `office_code`; legacy `currentOffice` key `OFF-<id>` is a frontend concern | [V] |
| Group as a benchmark dimension | Only one group per office; peer sets such as "same region" and "same brand" cannot both be modelled | [V] §3.2 |

---

## 7. Gaps

### 7.1 List and security reporting

| # | Gap | Evidence |
|---|---|---|
| L1 | No login history and no persisted failed-login record; a "User Access / Last Login" report can show `last_login_at` only | §1.8 |
| L2 | Password-age and expiring-password lists are impossible: `password_created_at` is not maintained by create / admin reset / self change; `password_expiration_days` is unenforced | §1.8 |
| L3 | No deactivation timestamp / actor on `users`; recoverable only from `audit_logs` rows of `resource_type='users'` | §1.2 |
| L4 | No single query endpoint for user × group × office, group × rights, or another user's effective rights; the four legacy security lists need N+1 client calls or a new server report | §1.9 |
| L5 | Audit read API has no date range, no `action` filter, no name resolution, no export, max 200 rows per page | §2.4 |
| L6 | Reads are not audited: "who viewed this chart", "who ran this report", "who exported a list" are unanswerable except for the `PRINT` rows | §2.2 |
| L7 | `audit_logs.ip_address` is the socket peer for middleware rows and the forwarded client for print rows; no user-agent column | §2.1 |
| L8 | `providers` has no modified stamp, license state / expiry, DEA expiry, hire / termination date; `specialty` is free text; `provider_kind` is not a column | §4 |
| L9 | `operatories` has no type and no tenant column | §3.1 |
| L10 | Procedure codes lack a production-type link, a bill-to-insurance flag and a dental / medical / other type; `production_types` is an orphan catalog | §5.1, §5.3 |
| L11 | No recall-type, pharmacy or school catalog | §5.1 |
| L12 | Generic lists: 200-row page cap, sort limited to declared columns, equality filters only; several legacy criteria (provider state / specialty, employer state, created / modified ranges, user) have no API filter | §5.1 |
| L13 | Modified-by / modified-on missing on `procedure_codes`, `fee_schedules`, `icd_codes`, `letter_templates`, `postcard_templates`, `office_groups`, `user_groups`, `production_types`, `operatories`, `providers` | §5.1 |
| L14 | Catalog content differs per tenant by seeding state (insurance vocabularies, medical catalogs, `key2` on payment / adjustment codes) | §5.1 |
| L15 | No provider goals / targets / budgets table for scorecards | §4.1 |
| L16 | Office grouping is single-level, single-membership | §3.2 |

### 7.2 Report-permission model

| # | Gap | Evidence |
|---|---|---|
| P1 | Report rights are unenforced end to end: no backend dependency names a `reports_*` code and frontend gating is dark and names none | §1.4, §1.5.7 |
| P2 | Granularity is the legacy *screen family* (Daily, Monthly, …) with Full Control / View Only. There is no per-report right and no meaning defined for Full vs View on a report (run vs print vs export) | §1.5.2 |
| P3 | Families in the target scope have no right at all: Recall, Ortho, Labels, Postcards, Interactive, Search, Favorites, analytics dashboards (only `dashboard_view`), custom report builder, saved views, sharing, scheduling, e-mail delivery, Excel / CSV / PDF export, AI insights | §1.5.6 |
| P4 | The catalog is global and code-defined; a right cannot be created per tenant or per user-built report. Object-level sharing (report × user / group / role / office) has no table | §1.4 |
| P5 | Ungated semantics: `require_permission` lets a user in no group through. For tenant-wide financial reads the strict variant (`require_read_access` / `has_strict`) is the only existing behaviour that denies by default | §1.3 |
| P6 | Office dimension is missing on `/reports/*`: unvalidated `office_id`, tenant-wide when omitted, no `office_ids` / `office_group_id` / `all_offices` | §0 #4 |
| P7 | Provider-restricted reporting ("My Reports", "Corresponding Provider") has no enforcement: `report_access_provider_id` is unread; two user ↔ provider links exist | §1.7 |
| P8 | User-restricted reporting ("Report By = User", "Appointment Detail by User") has one precedent only: time clock's "own card unless manager" (`time_clock_service.caller_access` L226-240) | §1.5.7 |
| P9 | Field-level restriction is absent: `patient_access_level` and `patient_access_ssn_value` are unenforced (`PatientRead` returns `ssn`; `ssn` is also a list filter); no right separates financial columns from clinical ones. Only precedent: `include_wages` limited to `owner` / `admin` / `super_admin` | §1.2, §1.5.4; [V] `app/schemas/patient.py` L47-48 (read schema generated from every `patients` column, no exclusion), registry L384 (`ssn` filter); no masking code (grep) |
| P10 | Report caches are keyed `report:{prefix}:{tenant_id}:{office_id or 'all'}:…` with no caller or scope component; any per-user restriction must enter the key | [V] `report_service.py` L60-62 |
| P11 | Seeded legacy groups distribute report rights unevenly (Doctor / Billing / Claims hold none) | §1.5.5 |
| P12 | No audit of rights administration beyond the generic mutation row (no "granted by" on `user_group_rights` / `user_group_memberships`) | §1.1 |

### 7.3 Reusable building blocks

| Need | Existing piece |
|---|---|
| Office set resolution + 403 semantics | `OfficeScopeDep`, `resolve_list_office_filter(..., reports=True)`, `require_all_offices(scope, reports=True)`; reference use `dashboard.py` L44-63 |
| Right checks | `require_permission`, `require_read_access`, `permission_service.effective_permissions`, `assert_permission`; per-verb rights on CRUD configs |
| Caller-restricted report + field-level gate + CSV / PDF + audit in one module | `time_clock.py` `report_router` + `time_clock_service.caller_access` / `build_report` |
| Run / export audit | `print_service.record_print`; `utility_runs`; `letter_batch_runs` |
| Per-user storage for favorites / saved criteria (interim) | `user_preferences` (`GET/PUT /users/me/preferences`, one JSON blob) |
| In-app delivery target | `notifications` table + `/users/me/notifications` |
| Working-day / open-hours denominators | `office_calendar_service.calendar`, `provider_schedule_days`, `provider_holidays` |
| Provider classification | `provider_directory_service.provider_kind`, `provider_taxonomy_service` |
| Rights catalog change procedure | `access_rights_catalog.ADDED_RIGHTS` + Alembic `apply_curation` |
| Frontend gate | `FE:src/features/access-control` (`RequireRight`, `useRights`) |

### 7.4 Defects observed while mapping (relevant because report rights would ride on them)

| # | Defect | Evidence |
|---|---|---|
| D1 | `POST` / `DELETE /user-group-memberships` and `POST` / `PATCH` / `DELETE /user-groups` are generic CRUD with no write right: any authenticated user can join a group and inherit its rights [I — derived from code, not exercised] | registry L1432-1436; `router_factory.py` L319-341 |
| D2 | `PUT /offices/{id}/users` and `/users/copy-from/…` change office assignments without an admin guard | `office_assignment.py` L188-200 |
| D3 | `GET /user-offices`, `GET /tenants` are not tenant-filtered; `POST /tenants` is generic CRUD | registry L316, L373 |
| D4 | `time_clock_service` checks `utilities_time_clock_editor_full_control` / `_view_only`, which the curation deleted — the manager right cannot be granted through a group | §1.5.7 |
| D5 | `GET /users` and `GET /offices/{id}/users` return `signature_data` for every user | `app/schemas/auth.py` L51 |
| D6 | `/reports/*` returns tenant-wide financial totals to any authenticated user | `reports.py` |
| D7 | `GET /utilities/audit` and `/utilities/jobs/{id}` are readable by any authenticated user | `utilities.py` L39-59 |

---

## 8. Open questions

| # | Question | Why it matters |
|---|---|---|
| Q1 | Is report access per family (the 8 legacy screen rights + Lists + Statements), per individual report, or both (family default + per-report override)? What do Full Control and View Only mean for a report? | Decides whether the 56 kept codes are reused or replaced |
| Q2 | Should a user in no group see reports (current write-gate behaviour) or be denied by default (current read-gate behaviour)? | Affects every migrated tenant on day one |
| Q3 | Which link defines "my provider" — `users.report_access_provider_id` or `providers.user_id` — and does a provider-linked user see only that provider's production everywhere, or only in "My Reports"? | Provider-restricted reporting; the two links can disagree |
| Q4 | Must report views and exports be audited (HIPAA access trail), and for how long must `audit_logs` be retained? | Table growth, PHI in `details`, new run / export log |
| Q5 | Are Recall, Ortho, Labels, Postcards and scheduled-report rights to be re-added to the catalog, and are new rights needed for builder / share / schedule / export / AI? | Catalog migration scope |
| Q6 | Is one office group per office enough, or are regions / brands / custom peer sets needed for benchmarking? | Schema change to `office_groups` |
| Q7 | Should financial columns (production, collections, A/R, wages, fees) be hidden from clinical roles inside otherwise visible reports, and is SSN masking required in lists? | Field-level restriction design |
| Q8 | Which legacy list criteria without data (procedure-code production type, bill-to-insurance, provider registration fields, license expiry) must be reproduced, and from which source? | New columns vs dropping the criterion |
