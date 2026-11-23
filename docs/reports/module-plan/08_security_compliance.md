# 08 — Security, access and compliance

Design document for the rights, scope, data classes, audit, export controls and retention of the Reports & Analytics
module. Written against `00_design_brief.md` (AD-7, AD-12, PD-10, PD-11, PD-12, PD-14; phases P0..P5) and on top of
`02_architecture.md`, whose tables, fields, endpoints and flags are used here by their exact names. Where a rule of this
document needs something 02 does not hold yet, or differs from what 02 states, the item is listed as a request in §13.3.

| Owns | Does not define (owner) |
|---|---|
| Right codes and their semantics, the mapping of every report category and dashboard family to a right, default grants, the authorisation rules behind `report_authz.authorize()` and `can_view_run()`, report-mode office / provider / user scope rules, the data-class vocabulary and its grants, masking and suppression rules, the audit store (`report_audit_events`, seals, patient index, disclosure log), purpose prompts, retention and legal hold, export / download / delivery rules, sharing rules, assistant and LLM rules, the security defects to close, the compliance mapping | Engine mechanics: pipeline, `report_runs`, snapshots, artifacts, cache, schedules, API shapes (`02_architecture.md`) · datasets and their columns (`03_data_foundation.md`) · parameter types and option sources (`04_filter_framework.md`) · metric formulas (`05_metric_catalog.md`) · dashboard, worklist and assistant content (`06_dashboards.md`) · screens (`07_ux_blueprint.md`) · per-report columns (`catalog/<category>.md`) |

**Evidence tags.** **[V]** read in the code or data file while writing this document (path and lines given; backend paths
are relative to `dentc-backend/`, `FE:` = `dentc-frontend/`). **[A]** taken from an analysis document (cited). **[R]** taken
from a research document (cited). **[I]** design judgement of this document. **NEW** = does not exist today. Snapshot:
backend branch `feature/uat-realse` @ `9183df0` plus uncommitted paths; frontend branch `feature/uat-realse-v5` @ `4007890`.
Nothing was executed against a server, database or API. The only computation is a local parse of `data/Groups.txt` with
the seeder's own rules to list which seeded group holds which right (results in §2.4).

Verified for this document [V]: `app/services/permission_service.py`, `app/api/deps.py`,
`app/services/access_rights_catalog.py`, `scripts/seed_permissions.py`, `tests/test_access_rights_catalog.py`,
`alembic/versions/8e4a6a8e5ab0_curate_access_rights_catalog.py`, `app/services/office_scope_service.py`,
`app/db/models/audit.py`, `app/services/audit_service.py`, `app/middleware/audit.py`, `app/core/audit_context.py`,
`app/services/print_service.py` L320-338, `app/api/v1/audit.py`, `app/api/v1/reports.py`, `app/api/v1/dashboard.py`,
`app/services/report_service.py` L58-60, `app/api/v1/groups.py`, `app/services/group_rights_service.py` L52-81,
`app/api/v1/office_assignment.py` L57-67 and L188-201, `app/api/v1/utilities.py`, `app/api/v1/registry.py` L316-317,
L373-374, L1430-1438, `app/crud/router_factory.py` L82-97 and L312-341, `app/crud/base.py` L91-94,
`app/services/time_clock_service.py` L102-106, L226-239, L1336-1361, `app/db/models/identity.py` L56, L70, L75, L249,
`app/schemas/auth.py` L29-63, `app/services/user_admin_service.py` L44-45, `app/api/v1/auth.py` L45-53 and L104-172,
`app/services/auth_service.py` L114-145, `app/crud/router_factory.py` L400-421, `app/api/v1/registry.py` L391-427, L586-588,
the model classes without a `tenant_id` column (`app/db/models/billing.py` L31, L79, L176, L190, L248, `clinical.py` L30,
`scheduling.py` L53, L105, `identity.py` L287, L300), the eight `_scope_tenant` overrides, `app/core/config.py` L31,
L103-107, `.github/workflows/deploy-cloud-run.yml` L21-28, `docs/onboarding/NEW_CLIENT_DATABASE.md` L9-18, L255-270,
L338-346, router guards of `transactions.py`, `lab_tracking.py`, `statements.py`, `patient_reports.py`, `users.py`;
`app/integrations/email.py` L181-200; `data/Groups.txt`; `FE:src/features/access-control/rights.ts` and `useRights.ts`;
frontend callers of the user, group and office-assignment read routes (`FE:src/features/users/useUsersGrid.ts`,
`FE:src/services/userApi.ts`, `officeUserAssignmentApi.ts`, `officeDeleteApi.ts`, the Security modals).

The checklist of `research/compliance_and_financial_semantics.md` §11 labels its rows P0 / P1 / P2. Those are priorities of
that document, not the phase ids of the brief; §11 below maps each row to a phase.

---

## 1. Threat and obligation summary

### 1.1 Obligations

Not legal advice: retention periods, business-associate clauses and state law need counsel ([R]
`compliance_and_financial_semantics.md` §30).

| # | Obligation | Source | Consequence in this design |
|---|---|---|---|
| O-1 | We are a business associate; minimum necessary applies to nearly every report, because reports are uses for payment and health care operations, not treatment disclosures | [R] compliance §2.1, §3.1 | Role × data-class matrix (§5), report rights (§2), office and provider scope (§4) |
| O-2 | Unique user identification, audit controls and regular activity review are required today | [R] compliance §2.2, §5.1 | Every run, view, export, print, download and delivery is an audit event tied to one user (§6); review reports and alerts (§6.8, SEC-31) |
| O-3 | A breach notice must identify each individual; an accounting of disclosures must give date, recipient, description and purpose for six years | [R] compliance §1 items 4-5, §6.1 | Patient manifest per run and per artifact (§6.4); disclosure log (§6.5) |
| O-4 | Disposal of ePHI is required; at contract end PHI is returned or destroyed | [R] compliance §2.1, §7 | TTL purge with audit, legal hold (§7.4), off-boarding path (SEC-35) |
| O-5 | Unencrypted e-mail is sanctioned only for individuals asking for their own PHI; a signed storage URL is a bearer credential | [R] compliance §7 | Link-only delivery, login-gated downloads, no storage URL ever stored or mailed (§7; PD-12) |
| O-6 | Vendors that receive PHI from us are subcontractor business associates (cloud host, mail gateway, LLM vendor) | [R] compliance §2.1, §9 | No PHI in e-mail; the assistant is gated on a recorded vendor arrangement (§9) |
| O-7 | Financial control: audit-trail and exception reports, segregation of duties, closed periods | [R] compliance §27.2-27.3 | Class `user_activity`, audit report family, legacy Audit Trail / Daily Audit / Special Transaction (§6.8), pinned business records (§7.4) |
| O-8 | Rules in motion: Security Rule NPRM (mandatory encryption, MFA, real-time log monitoring) is not final; a Privacy Rule final rule shortens patient access to 15 days (dates computed by the ADA, unverified) | [R] compliance §2.3 | Step-up authentication and per-patient financial record export are designed and scheduled late (SEC-32, SEC-34); nothing here depends on the NPRM |

### 1.2 Threats

| # | Threat | State today | Control |
|---|---|---|---|
| T-1 | Any authenticated user reads tenant-wide financial totals | `/reports/*` router depends on `get_current_user` only; `office_id` optional and unvalidated [V] `app/api/v1/reports.py` L26-31, L33-110 | Report right + report-mode scope on every route (§3, §10 D-01) |
| T-2 | A user raises their own privileges: joins a group, or adds an office assignment for themselves | Generic CRUD for `user-groups`, `user-group-memberships`, `user-offices` has no write right [V] `registry.py` L373-374, L1432-1436; `PUT /offices/{office_id}/users` has no admin guard [V] `office_assignment.py` L193-201 | §10 D-09..D-11, fixed in P0 before any right is enforced (SEC-11) |
| T-3 | Cross-office read by editing an office id | Office roll-ups, `/transactions`, lab reports and the statement batch check the tenant only [A] `be_existing_reporting.md` §1.4 | §4.1; ENG-16 with the dependencies of §3.1 |
| T-4 | Scope widening through a scheduling right, a missing assignment or a role string | `OfficeScope.unrestricted()` is true for the alias `appointments_add_appointment_in_other_office`, for zero `user_offices` rows and for the roles `owner` / `manager`; it decides explicit ids, path offices, office groups and the default set [V] `office_scope_service.py` L156-178, L241-250, L269-274, L336-350 | One report-mode function for every report surface; alias, missing assignment and role `manager` do not widen (§4.1 S-2..S-7) |
| T-5 | A stored result is read by someone other than its runner (cache hit, shared view, delivery, schedule, artifact link) | No stored results exist; the 60 s Redis cache has no caller scope [V] `report_service.py` L58-60 | `can_view_run()` on every read (§4.5); `scope_hash` in every cache key |
| T-6 | Column over-exposure in lists and exports (SSN, subscriber id, wages, signature image, provider income) | `PatientRead` returns `ssn` and `ssn` is a list filter [A] `be_data_identity_setup.md` §7.2 P9, [V] `registry.py` L401; `UserRead` returns `signature_data` [V] `app/schemas/auth.py` L51; wages gated by role only [V] `time_clock_service.py` L104, L1336-1338; cross-patient lists of charges, payments and claims need a token only [A] `be_existing_reporting.md` §1.3 | Data class on every column, identical on screen and in every file (§5). The same fields behind platform routes are closed by D-13, D-22, D-28, D-29 (§10): a class is advisory while the generic route returns the column to every signed-in user |
| T-7 | A provider-restricted user derives other providers' numbers by subtraction | `users.report_access_provider_id` is read by no query [A] `be_data_identity_setup.md` §1.7 | The restriction follows the right the caller came through, not the shape of the request (§4.2 PR-10); filter before aggregation, no practice totals, peer threshold (PR-8) |
| T-8 | Data leaves the audited system without a trace | Client-built CSV / XLS / PDF exports write no audit row [A] `fe_existing_reports.md` §2.7; no manifest anywhere | One server export pipeline, audit event and manifest per artifact (§6, §7) |
| T-9 | PHI in e-mail, notification text, URLs, file names or log lines | `send_email` logs recipient and subject, and the whole body in log-only mode [V] `app/integrations/email.py` L189, L196 | Fixed content allow-list for mail and notifications, ids only in URLs, no patient data in file names (§7.3) |
| T-10 | A schedule keeps disclosing after its owner lost rights or left | No schedules exist | Run-as owner re-checked at every tick; recipients re-checked at delivery and at open (§8) |
| T-11 | Audit gaps or tampering | Reads are not audited; audit writers swallow errors [V] `audit_service.py` L57-59; no retention [A] | Append-only store written in the state transaction, hash seals, six-year retention (§6) |
| T-12 | A report bypasses a screen right, or a platform route bypasses the report right (security lists, time-clock wages, audit trail, SSN) | `GET /users` and group rights are gated by their screen rights [V] `users.py` L37-40, `groups.py` L25-28. The same content is readable with a token only through `GET /offices/{office_id}/users` (full `UserRead`) and the generic `GET /user-groups`, `/user-group-memberships`, `/user-offices`, `/user-ip-rules` [V] `office_assignment.py` L188-190, `registry.py` L373-374, L1430-1438; `GET /patients/{patient_id}/audit-logs` returns the patient-filtered audit trail to every signed-in user [V] `audit.py` L81-122 | A class is granted by the screen right where one exists (§5.3); the open reads get the same gate (D-21, D-28) |
| T-13 | LLM use: PHI in prompts, answers with numbers the user may not see, vendor retention | No LLM client exists [A] `be_platform.md` §11 | §9 |
| T-14 | Injection through parameters, CSV formulas, custom definitions | — | Owned by `02_architecture.md` §4.3, §7.4, §11; tested by SEC-14 |
| T-15 | Read from outside the organisation: a second tenant in the client database, then tables without `tenant_id` | `POST /auth/signup` needs no authentication, creates a tenant plus a user with `role = "admin"` and returns tokens [V] `app/api/v1/auth.py` L45-53, `auth_service.py` L114-145, `NEW_CLIENT_DATABASE.md` L338-340. Generic lists filter the tenant only when the model has `tenant_id` [V] `app/crud/base.py` L91-94; charges, payments, claims, appointments, operatories and `user_offices` have none [V], and an `admin` is office-unrestricted [V] `permission_service.py` L98-111. Anyone who finds a client's API URL can therefore page the organisation's fact rows [I, not exercised] | Signup closed on client deployments (D-27) and a parent-join tenant predicate on the tenant-less resources (D-23), both P0 and entry conditions of §3.5. Builders read only `rpt_*` datasets with a mandatory `tenant_column` (02 §4.2); two-tenant tests (SEC-14) |
| T-16 | Report data or authorisation state crosses client organisations through the shared Redis | One basic-tier Memorystore instance without AUTH on the shared VPC; clients are separated only by a hand-assigned `REDIS_DB` index (code default 0); every client database starts at `tenant_id = 1`, `user_id = 1` [V] `deploy-cloud-run.yml` L21-28, `config.py` L105, `NEW_CLIENT_DATABASE.md` L9-18, L263, L346; [A] `be_platform.md` §4 | No authorisation state in Redis, client namespace on every key, self-describing cache values, configuration check (§7.5) |

---

## 2. Rights catalog

### 2.1 Model

| Topic | Rule | Basis |
|---|---|---|
| Storage | Rights stay in the global `permissions` catalog (key `code`), granted to `user_groups` through `user_group_rights`; effective rights = union over the caller's active groups (most permissive wins) | [V] `permission_service.effective_permissions` L154-180 |
| Strict rule | Every report, dashboard, metric and action check uses `EffectivePermissions.has_strict`: a user in no group holds nothing. `require_permission` (ungated users pass) is never used for reporting | [V] `permission_service.py` L138-151; 02 §4.1 |
| Full-access roles | `REPORT_FULL_ACCESS_ROLES` (NEW constant) = `FULL_ACCESS_ROLES` (`admin`, `super_admin`) ∪ `{"owner"}`. They hold every right and every data class of this document, are report-unrestricted for offices (§4.1 S-3) and exempt from provider restrictions (§4.2 PR-3). These are the "privileged roles" of PD-11 | [V] `permission_service.py` L45; `owner` rule is [I] (open decision 4) |
| Role `manager` | Holds nothing of this document by role: report rights, classes, all-office scope and the provider exemption come from its groups and its `user_offices`, as for any user. The platform added `owner` / `manager` to `OFFICE_ADMIN_ROLES` only "until the rights model is set up" [V] `permission_service.py` L93-98, and this module sets it up; `users.role` is free text and `manager` is not in the default role list [A] `be_data_identity_setup.md` §1.3. One exception: class `payroll_time`, because the Time Clock screen already shows a `manager` every user's punches (§5.3). A regional manager gets `office_scope_view_all_offices` and `reports_view_all_providers` through a group (preset in §2.4) | [V] `time_clock_service.py` L102-104; [I] (open decision 4b) |
| Object right | Each report definition names one `right_code` (02 §3.1). It identifies a **right family**: a pair of codes, View Only and Full Control. Holding the Full Control code implies the View Only capability | PD-10 |
| Per-report override | A definition may name the family of another category, an any-of list of families, or per-action codes in `action_right_codes` (02 §3.1). Overrides are listed in §2.3 | PD-10 |
| Action rights | Module-wide rights for data-file export, bulk export, scheduling, sharing, building, pinning, managing and administering. They are required **in addition to** the family level of the report (two keys). This is the legacy model: `Reports - Excel Reports` and the four `Report - Batch Schedule Report` rights were separate from the screen rights | PD-10; [R] `denticon_analytics_and_dso.md` §10.2; [V] `access_rights_catalog.py` L90-93, L102-103 |
| Data classes | A class is a right too (§5.3). A report right says *which reports*; a class says *which columns* | [R] compliance §3.2 |
| No per-tenant codes | The catalog is global and code-defined; a tenant-built report cannot own a right. A custom report needs three things together: the `custom` family, object visibility (owner, `report_shares` of 02 §8.1, organisation) and one of the report families of the dataset it reads (`report_families[]`, §5.6), so that the builder is not a way around the category rights | [A] `be_data_identity_setup.md` §7.2 P4 |

View Only versus Full Control (PD-10; the brief's default is used, see challenge 1 in §13.2):

| Capability | View Only | Full Control | Second key (module-wide right) |
|---|---|---|---|
| See the report in the catalog, read its definition, validate parameters, load option lists | yes | yes | — |
| Run a format with `side_effects = none`, view results on screen, page, sort, quick-filter | yes | yes | — |
| Run a format with `side_effects = writes` (action `commit`: the `statements` format writes `patient_statements` rows, 02 §5.9) | no | yes | — |
| Drill to rows or to a record | yes | yes | Right of the drill target; the record's own feature right |
| Save a private view, favorite, recents | yes | yes | — |
| Print (PDF with `intent=print`), PDF export | no | yes | — |
| XLSX or CSV export, including the bulk action `export_selection` | no | yes | `reports_export_data_files` |
| Export above the bulk threshold (§7.2) | no | yes | `reports_export_bulk` when the tenant setting requires it |
| Create and manage own schedules | no | yes | `reports_schedule_own`; every format in `output_formats` needs its export right at creation and at each change |
| Share a saved view or a custom definition with users or groups; send a finished run to internal users | yes | yes | `reports_share` |
| Publish a view or a custom definition to the organisation, set the organisation default | yes | yes | `reports_share_organization` |
| Pin a run as a business record | no | yes | `reports_runs_pin` |
| Row and bulk actions other than `export_selection` | yes | yes | The action's own feature right (`row_actions[].right_code`, 02 §3.10); actions that replace a legacy footer button name the right of §2.3 |

Families that exist only as Full Control (Security lists, Setup lists) have no View Only level: any use needs the code.
A View Only holder of `statements` can run the list format (`statement_report`) and cannot generate statements.

### 2.2 Catalog revision 2 (codes)

Totals after the revision: 363 curated rows today [V] `access_rights_catalog.py` L313 + 6 restored + 41 new = **410 rows**,
of which 13 are deactivated → **397 active**. `REMOVED_ROWS` 210 → 204; `ADDED_RIGHTS` 44 → 91. New codes: 4 family codes
(A), 12 action rights (B), 9 data-class rights (C), 15 analytics rights (D), 1 scope right (E).

**A. Report family rights.** "kept" = present in the curated catalog today [A] `be_data_identity_setup.md` §1.5.2;
"restored" = deleted by revision `8e4a6a8e5ab0` and re-added with the original code and label [V]
`access_rights_catalog.py` L137-142, L246-247.

| Family key | View Only code | Full Control code | Status |
|---|---|---|---|
| `daily` | `reports_daily_reports_screen_view_only` | `reports_daily_reports_screen_full_control` | kept |
| `monthly` | `reports_monthly_reports_screen_view_only` | `reports_monthly_reports_screen_full_control` | kept |
| `ledger` | `reports_ledger_reports_screen_view_only` | `reports_ledger_reports_screen_full_control` | kept |
| `management` | `reports_management_reports_screen_view_only` | `reports_management_reports_screen_full_control` | kept |
| `insurance` | `reports_insurance_reports_screen_view_only` | `reports_insurance_reports_screen_full_control` | kept |
| `appointment` | `reports_appointment_reports_screen_view_only` | `reports_appointment_reports_screen_full_control` | kept |
| `treatment_plan` | `reports_treatment_plan_reports_screen_view_only` | `reports_treatment_plan_reports_screen_full_control` | kept |
| `referral` | `reports_referral_reports_screen_view_only` | `reports_referral_reports_screen_full_control` | kept |
| `recall` | `reports_recall_reports_screen_view_only` | `reports_recall_reports_screen_full_control` | restored (labels `Reports - Recall Reports Screen View Only` / `... Full Control`) |
| `ortho` | `reports_ortho_reports_view_only` | `reports_ortho_reports_access_full_control` | restored (labels `Reports - Ortho Reports View Only` / `Reports - Ortho Reports Access Full Control`) |
| `statements` | `reports_statements_screen_view_only` | `reports_statements_screen_full_control` | kept; plus `reports_statement_allow_updating_statement_dates` for the legacy "Update Stmt Dates" server action |
| `lists_patient` | `reports_lists_patient_list_screen_view_only` | `reports_lists_patient_list_screen_full_control` | kept |
| `lists_responsible_party` | `reports_lists_responsible_party_list_screen_view_only` | `reports_lists_responsible_party_list_screen_full_control` | kept |
| `lists_provider` | `reports_lists_provider_list_screen_view_only` | `reports_lists_provider_list_screen_full_control` | kept |
| `lists_security` | — | `reports_lists_security_list_rpts_screen_full_c` | kept, Full Control only (truncated legacy code) |
| `lists_setup` | — | `reports_lists_setup_list_rpts_screen_full_cont` | kept, Full Control only (truncated legacy code) |
| `lists_employer` | `reports_lists_employer_list_screen_view_only` | `reports_lists_employer_list_screen_full_control` | kept |
| `lists_office` | `reports_lists_office_list_screen_view_only` | `reports_lists_office_list_screen_full_control` | kept |
| `lists_prescription` | `reports_lists_prescription_list_screen_view_only` | `reports_lists_prescription_list_screen_full_control` | kept |
| `lists_procedure_fee` | `reports_lists_procedure_fee_list_screen_view_only` | `reports_lists_procedure_fee_list_screen_full_control` | kept |
| `my_reports` | `reports_my_reports_view` | `reports_my_reports_full_control` | kept |
| `custom` | `reports_custom_reports_view_only` | `reports_custom_reports_full_control` | NEW (labels `Reports - Custom Reports View Only` / `... Full Control`) |
| `audit` | `reports_audit_reports_view_only` | `reports_audit_reports_full_control` | NEW (labels `Reports - Audit Reports View Only` / `... Full Control`) |

Worklists have no family of their own: each worklist definition names the family of its legacy counterpart (§2.3).

**B. Module-wide action rights (all NEW, category `Reports`).**

| Code | Label | Allows (with the family level of §2.1) | Legacy predecessor (deleted) |
|---|---|---|---|
| `reports_export_data_files` | Reports - Export Data Files (Excel / CSV) | XLSX and CSV artifacts | `reports_excel_reports_full_control` |
| `reports_export_bulk` | Reports - Bulk Patient Export | Exports above `bulk_export_patient_threshold` when `bulk_export_requires_right` is on (§7.2) | — |
| `reports_schedule_own` | Reports - Schedule Reports | Create, change, pause and delete own schedules | `report_batch_schedule_report_add_schedule`, `..._delete_schedule` |
| `reports_schedules_manage_all` | Reports - Manage All Schedules | List, pause, resume, delete and take over any schedule (02 §13 rows 37-45) | `report_batch_schedule_report_access_full_control`, `..._view_only` |
| `reports_share` | Reports - Share Views and Results | `PUT /reports/saved-views/{id}/shares`, `POST /reports/runs/{run_id}/deliveries`, custom-definition shares | — |
| `reports_share_organization` | Reports - Publish Organization Views | `visibility = organization` on a saved view or a custom definition; `is_org_default` | — |
| `reports_build_custom` | Reports - Build Custom Reports | Create, edit, validate, preview and publish `report_custom_definitions` | — |
| `reports_runs_view_all` | Reports - View Run History of All Users | `GET /reports/runs?scope=all`; opening a result still needs `can_view_run()` | — |
| `reports_runs_manage_all` | Reports - Manage Runs of All Users | Cancel or purge another user's run, `GET /reports/stats`, deliveries of any run | — |
| `reports_runs_pin` | Reports - Pin Report Results | `PATCH /reports/runs/{run_id}` with `retention_class = pinned` or back | — |
| `reports_administer` | Reports - Administer Reporting | `GET, PATCH /reports/settings`, legal hold, disabled report keys, the security settings of §7.2 | — |
| `reports_disclosures_manage` | Reports - Manage Disclosure Log | Record a disclosure after the fact, reclassify or suspend one (§6.5) | — |

**C. Data-class rights (NEW, category `Report Data`; classes are defined in §5).**

| Code | Label | Grants class |
|---|---|---|
| `report_data_phi_identified` | Report Data - Patient Identifiers | `phi_identified` |
| `report_data_phi_sensitive` | Report Data - Sensitive Identifiers | `phi_sensitive` |
| `report_data_clinical` | Report Data - Clinical Content | `clinical` |
| `report_data_financial_patient` | Report Data - Patient and Account Amounts | `financial_patient` |
| `report_data_financial_practice` | Report Data - Practice Financial Totals | `financial_practice` |
| `report_data_provider_comp` | Report Data - Provider Production and Income | `provider_comp` |
| `report_data_payroll_wage` | Report Data - Wages and Pay Rates | `payroll_wage` |
| `report_data_payment_instrument` | Report Data - Payment Instrument References | `payment_instrument` |
| `report_data_user_activity` | Report Data - User Activity and Audit | `user_activity` |

Three classes are granted by existing screen rights instead of a new code, so that a report can never show more than the
owning screen: `payroll_time` by `utilities_time_clock_editor_view_only` / `utilities_time_clock_editor_full_control`
(**restored**: the service checks both codes, but the curation deleted them [V] `time_clock_service.py` L105-106,
`access_rights_catalog.py` L246-247); `security_users` by `setup_security_users_screen_view_only` /
`setup_security_users_screen_full_control`; `security_groups` by `setup_security_groups_screen_view_only` /
`setup_security_groups_screen_full_control` (kept; they already gate `GET /users` and group rights [V] `users.py` L37-40,
`groups.py` L25-28). The two security classes are separate because the two screens are: a holder of one screen right
must not read the other screen's data through a list report.

**D. Analytics rights (category `Analytics`, NEW except `dashboard_view`).** The dashboard keys and their mapping to
these codes are fixed by `06_dashboards.md` §2.0.5; the legacy `denticon_practice_analytics_*` codes are not restored.
An analytics right has one level and opens a dashboard; which metric families it lets the caller query, and whether it
does so only for the caller's own provider, is in §2.3.

| Code | Label | Opens |
|---|---|---|
| `dashboard_view` (kept, category `Dashboard`) | Dashboard - View | The Main Dashboard page (P1). It lists no metric family: every tile needs a family right of §2.3 |
| `analytics_provider_dashboard_view` | Analytics - Provider Dashboard | Provider Dashboard (P1); a self-restricted right (§4.2 PR-10) |
| `analytics_production_dashboard_view` | Analytics - Production Dashboard | Production analysis |
| `analytics_collections_dashboard_view` | Analytics - Collections Dashboard | Collections analysis (P2) |
| `analytics_ar_dashboard_view` | Analytics - Accounts Receivable Dashboard | A/R and ageing (P2) |
| `analytics_insurance_dashboard_view` | Analytics - Insurance Dashboard | Claims and payer analysis (P2) |
| `analytics_scheduling_dashboard_view` | Analytics - Scheduling Dashboard | Front office and schedule utilisation (P3) |
| `analytics_morning_huddle_view` | Analytics - Morning Huddle | Morning Huddle (P3) |
| `analytics_treatment_plan_dashboard_view` | Analytics - Treatment Plan Dashboard | Case acceptance (P3) |
| `analytics_hygiene_recall_dashboard_view` | Analytics - Hygiene and Recall Dashboard | Recall and reappointment (P3) |
| `analytics_patients_dashboard_view` | Analytics - Patients and Referrals Dashboard | New patients, visits, referral sources (P3) |
| `analytics_office_comparison_view` | Analytics - Office Comparison | Multi-office comparison and internal benchmarks (P4, PD-13) |
| `analytics_provider_scorecards_view` | Analytics - Provider Scorecards | Scorecards across providers (P4); a self-restricted right: other providers only with `reports_view_all_providers` |
| `analytics_goals_view` | Analytics - Goals View | `GET /analytics/goals`. Office and organisation goals also need class `financial_practice`; provider goals need `provider_comp`, and a provider-restricted caller receives the own row only (PR-4, PR-6) |
| `analytics_goals_manage` | Analytics - Goals Manage | `PUT /analytics/goals` (successor of the deleted `setup_provider_goals_screen_full_control`); same classes as reading |
| `analytics_assistant_use` | Analytics - Assistant | `POST /analytics/assistant/query` (P5, §9) |

**E. Scope rights.**

| Code | Status | Effect |
|---|---|---|
| `office_scope_view_all_offices` | kept [V] `access_rights_catalog.py` L297 | Report-unrestricted office scope (§4.1). The only group-grantable way to read all offices |
| `reports_view_all_providers` | NEW (label `Reports - View All Providers`, category `Reports`) | Exempts the holder from `self_unless_privileged` provider restrictions (§4.2) |

**F. Deactivated (rows kept, `permissions.is_active = false`, so they leave the picker and `effective_permissions`).**
The 13 legacy enterprise codes `reports_group_reports_daily_screen_full_control`,
`reports_group_reports_mang_screen_full_control` / `_view_only`, `reports_group_reports_ins_screen_full_control` /
`_view_only`, `reports_group_reports_appointment_reports_full_control` / `_view_only`,
`reports_group_reports_referral_reports_full_control` / `_view_only`, `reports_group_reports_batch_reports_full_control` /
`_view_only`, `reports_group_reports_other_reports_full_control` / `_view_only`. Reason: a run over an office group or
several offices is governed by office assignments (§4.1); a second right would only gate a consolidation of data the caller
can already read office by office. This answers open decision 3 of `04_filter_framework.md` §11.7 (open decision 3 here).

**G. Existing rights reused unchanged.**

| Code | Use in this module |
|---|---|
| `patient_access_ssn_value` | Not used to unmask: reports never emit a full SSN (§5.5). Kept as the gate of the patient screen and, with D-22, of the `ssn` field of `PatientRead` |
| `setup_security_user_per_office_screen_view_only` / `_full_control` | Read and write gate of the office-assignment routes (D-10, D-28) |
| `transactions_transaction_entry_screen_full_control`, `transactions_patient_ledger_screen_full_control`, `transactions_insurance_claims_details_view_only` / `_full_control` | Alternative read rights for cross-patient lists of charges, payments, adjustments and claims (D-29) |
| `appointments_dps_ins_verification_reports` | Alternative right for `insurance.dps_eligibility_report` and the eligibility worklist (§2.3) |
| `patient_letters_generate`, `appointments_scheduler_print` and other feature rights | Rights of row and bulk actions; owned by the features |
| `setup_close_out_full_control`, `setup_close_out_view_only`, `setup_close_out_all_offices` | Day close and period lock (DATA-29, PD-9); named here only so that `03_data_foundation.md` §7 does not invent a new code |

### 2.3 Which right opens what

Report keys follow the brief (`<category>.<report>`); keys not yet fixed by `catalog/<category>.md` are provisional.

| Hub area (legacy category) | Family | Per-report overrides |
|---|---|---|
| Financial › Daily (Daily Reports, 12) | `daily` | `daily.progress_notes`: key class `clinical` (§5.2) |
| Financial › Month-end (Monthly Reports, 9) | `monthly` | — |
| Financial › Ledger (Ledger Reports, 4) | `ledger` | — |
| Management (Management Reports, 4) | `management` | `management.audit_trail`: `management` family and key class `user_activity`. `management.time_clock_report`: user restriction `self_unless_privileged` with exempting class `payroll_time` (§4.3 UR-2: without the class the run is the caller's own card and is stored as such); `include_wages` needs `payroll_wage` (§5.2) |
| Management › new audit and access reports (§6.8) | `audit` | — |
| Insurance (Insurance Reports, 13) | `insurance` | `insurance.dps_eligibility_report`: any of `insurance`, `appointments_dps_ins_verification_reports` |
| Scheduling (Appointment Reports, 9) | `appointment` | — |
| Clinical › Treatment plans (4) | `treatment_plan` | — |
| Patients › Referrals (8) | `referral` | — |
| Clinical › Recall (4) | `recall` | — |
| Clinical › Ortho (5) | `ortho` | — |
| Financial › Statements (1 screen) | `statements` | Format `statements` (legacy PRINT STATEMENTS, `side_effects = writes`): `action_right_codes.commit` = `reports_statements_screen_full_control`. Bulk action UPDATE STATEMENT DATES: `reports_statement_allow_updating_statement_dates`. Bulk action PAPER STATEMENT SENT: `reports_statements_screen_full_control` |
| Lists › Patient: Patient List, Patient List - New Patient, Patients Seen, Patient's Notes, Patient List - Grouped By, Patients on Payment Plan, Online Registered Patients, Update Patient Insurance (Conversion) List - By Appointment | `lists_patient` | — |
| Lists › Patient: Responsible Party List, Responsible Party - Statements Sent, Responsible Party - Sent to Collection, Responsible Party - Email Statement Error Report | `lists_responsible_party` | — |
| Lists › Provider (4) | `lists_provider` | `lists.provider_registration`: columns tax id and DEA number are class `security_users` |
| Lists › Security (4) | `lists_security` | Key class per list: User List `security_users`; Group List and Group Rights List `security_groups`; User-Group Membership both |
| Lists › Setup: Employer List | any of `lists_setup`, `lists_employer` | — |
| Lists › Setup: Office List, Operatory List, Office Holidays | any of `lists_setup`, `lists_office` | — |
| Lists › Setup: Drug List | any of `lists_setup`, `lists_prescription` | — |
| Lists › Setup: Procedure Codes List, Procedure Codes by Fee Schedule, Explosion Codes List, Credit Codes Report, Fee Schedule List, Capitation Fee Schedule, ADA Categories List | any of `lists_setup`, `lists_procedure_fee` | — |
| Lists › Setup: Carrier List, Insurance Plan List, Inactive Plans List, Default Ins Plan Coverage Category List, Document Types List, Notes Macros List, Notes Macro Category List, Patient Types List | `lists_setup` | — |
| My Reports (5) | `my_reports` | A self restriction on every definition and on every option of its discriminator parameter: table in §4.2 |
| Worklists | Family of the counterpart: eligibility verification → any of `insurance`, `appointments_dps_ins_verification_reports`; unsigned progress notes → any of `daily`, `my_reports`; unscheduled treatment → `treatment_plan`; recall due → `recall`; outstanding claims → `insurance`; patient A/R → `monthly`. The families `06_dashboards.md` §6 proposes for its further worklists follow the same rule and are accepted | Unsigned progress notes: `scope.provider_restriction = self_unless_privileged`, so a provider who holds only `my_reports` signs the own notes without receiving the Daily financial family. Actions need their feature right |
| Custom reports (legacy Office Reports) | `custom` | Plus visibility (owner, `report_shares` or organisation, 02 §11) and one report family of the dataset the definition reads (§5.6) |
| Letters, postcards, labels, forms | Not in this module (PD-15) | Rights stay with the owning features |

Rights that list a metric family (`metric_family` is a field of each metric, requested from `05_metric_catalog.md`).
Each such right carries `provider_restriction`, held in the family table of `app/reports/rights.py`:

| Dashboard (key of 06 §2.0.5) | Right that opens it | Metric families the right lists | `provider_restriction` of the right |
|---|---|---|---|
| `dashboards.main`, `dashboards.executive_summary` | `dashboard_view` | None. A tile is served only through another right that lists its family; every other tile shows `restricted` | — |
| `dashboards.provider` | `analytics_provider_dashboard_view` | `production`, `collections`, `scheduling`, `treatment_plan`, `recall` | `self_unless_privileged` |
| `dashboards.my` | `my_reports` family (`reports_my_reports_view` / `reports_my_reports_full_control`) | As `dashboards.provider` | `self_unless_privileged`; the dashboard definition itself is `self_always` (06 §2.3) |
| `dashboards.production` | `analytics_production_dashboard_view` | `production` | `none` |
| `dashboards.collections_ar` | any of `analytics_collections_dashboard_view`, `analytics_ar_dashboard_view` | `collections` / `ar`; each tile by its own family | `none` |
| `dashboards.insurance_rcm` | `analytics_insurance_dashboard_view` | `insurance` | `none` |
| `dashboards.front_office`, `dashboards.schedule_capacity` | `analytics_scheduling_dashboard_view` | `scheduling` | `none` |
| `dashboards.morning_huddle` | `analytics_morning_huddle_view` | `scheduling`; production and A/R tiles through their own rights; its patient lists are report runs (§3.3 rows 58-61) | `none` |
| `dashboards.treatment` | `analytics_treatment_plan_dashboard_view` | `treatment_plan` | `none` |
| `dashboards.hygiene_recall` | `analytics_hygiene_recall_dashboard_view` | `recall` | `none` |
| `dashboards.patients`, `dashboards.referrals_marketing` | `analytics_patients_dashboard_view` | `patients`, `referrals` | `none` |
| `dashboards.ortho` | View Only code of the `ortho` report family | `ortho` | `none` |
| `dashboards.multi_office` | `analytics_office_comparison_view` | None of its own: the families the caller holds; needs more than one office in scope | — |
| Scorecards across providers | `analytics_provider_scorecards_view` | As `dashboards.provider`; class `provider_comp` | `self_unless_privileged` |

| `metric_family` | Report families that also list it (the View Only code suffices) | `provider_restriction` of that path |
|---|---|---|
| `production`, `collections` | `daily`, `monthly` | `none` |
| `ar` | `monthly`, `management` | `none` |
| `insurance`, `treatment_plan`, `recall`, `ortho` | The report family of the same name | `none` |
| `scheduling` / `patients` / `referrals` | `appointment` / `lists_patient` / `referral` | `none` |
| `payroll` | `management`, plus class `payroll_time` | `none` (the user restriction of §4.3 applies) |
| `production`, `collections`, `scheduling`, `treatment_plan`, `recall` | `my_reports` | `self_unless_privileged` |

**Metric-family rule.** A metric may be read (`POST /analytics/metrics/query`, a dashboard tile, a metric drill, an
assistant tool call) when the caller strictly holds at least one right that lists its `metric_family`. Without one the
point `status` is `restricted` (02 §10.1), never an error for the whole tile set.

**Grant-path rule.** The provider restriction of a metric read is a property of the rights the caller holds for that
family, not of the request. For a (caller, `metric_family`) pair it is `none` only when the caller is exempt (§4.2 PR-3)
or holds at least one right with `provider_restriction = none` that lists the family. A caller who reaches the family
only through self-restricted rights receives every value of that family for the own provider, whatever `dimensions`
the request names, on every dashboard including `dashboards.main` (§4.2 PR-10).

### 2.4 Default grants for the seeded groups

Seeded groups [V] `data/Groups.txt` (13): Administrators (Adm), Administrators 2 (Adm2), Assistant (Asst), Billing (Bill),
Claims (Clm), Clerical (Cler), Clinical (Clin), Doctor (Doc), FrontDesk (FD), Office Manager (OM), Time clock only (TC),
VBS-call center (VBScc), VBS-iNSURANCE DEPARTMENT (VBSins). Kept category codes keep the grants the seeder made
([A] `be_data_identity_setup.md` §1.5.2). Principle [I]: **no narrowing at cut-over** — a group keeps what it could do in
the legacy tool; new codes are derived mechanically from what the group holds **in the tenant database when the grant
script runs**, so the first enforced day changes nothing for it. One deliberate exception: segregation of duties (rows
marked **S**).

How the table is applied (step 4 of §2.5):

| Rule kind | Applied to | Source |
|---|---|---|
| Derived ("holds …") | Every active group of the tenant, whatever its name | The group's current `user_group_rights`. A tenant that removed a family from a group gets no derived right for it; a tenant-created or renamed group that holds the family gets the same derived rights and classes as a seeded one |
| Legacy ("legacy holders") | Groups matched by name only | `data/Groups.txt`. The legacy assignment cannot be read from the tenant database: the codes were deleted by the curation, which cascades to `user_group_rights` [V] `access_rights_catalog.py` L328-339. `data/Groups.txt` is one legacy customer's export, so every other active group that holds the adjacent family named in the rule is listed for an administrator decision (readiness check (i)) and receives nothing automatically |
| **S** (segregation) | Every active group | Derived rule AND the group holds no posting right, i.e. no code `transactions_add_post_*` or `transactions_delete_*`. A group that passes the derived rule but holds a posting right is not granted; it is listed as a segregation conflict (readiness check (k)) for an explicit decision of the tenant administrator ([R] compliance §3.3, §4.2 rule 4; CR-17) |

The column "Unmodified seed" is the expected result on a tenant whose 13 groups still hold exactly the seeded rights. It is
the fixture of SEC-02, not a grant list; computed from `data/Groups.txt` [V].

| Code | Rule | Unmodified seed |
|---|---|---|
| `reports_recall_reports_screen_full_control` | legacy holders; adjacent family `appointment` | Adm, Adm2, Cler, Clin, OM, VBSins |
| `reports_recall_reports_screen_view_only` | legacy holders; adjacent family `appointment` | Adm2 |
| `reports_ortho_reports_access_full_control` | legacy holders; adjacent family `treatment_plan` | Adm, Adm2, Asst, Cler, Clin, OM, TC, VBScc, VBSins |
| `reports_ortho_reports_view_only` | legacy holders; adjacent family `treatment_plan` | Adm2, Asst, Cler, Clin, OM, TC, VBScc, VBSins |
| `utilities_time_clock_editor_full_control` / `_view_only` | legacy holders; adjacent family `management` | Adm, Adm2 / Adm2 |
| `reports_export_data_files` | legacy holders of `reports_excel_reports_full_control`; adjacent: any Full Control family | Adm, Adm2, OM, VBSins |
| `reports_export_bulk` | same as data files (not enforced by default) | Adm, Adm2, OM, VBSins |
| `reports_schedule_own`, `reports_schedules_manage_all` | legacy holders of the batch-schedule rights; adjacent: any Full Control family | Adm |
| `reports_share` | holds at least one Full Control family | Adm, Adm2, Asst, Cler, Clin, FD, OM, TC, VBScc, VBSins |
| `reports_share_organization`, `reports_build_custom`, `reports_runs_view_all`, `reports_runs_manage_all`, `reports_administer`, `reports_disclosures_manage` | holds `setup_security_groups_screen_full_control` (a group that edits group rights can grant itself any code, so the derived grant adds no power) | Adm, Adm2 |
| `reports_runs_pin`, `reports_custom_reports_full_control` | holds `setup_security_users_screen_full_control` | Adm, Adm2, OM |
| `reports_audit_reports_full_control` | **S**: holds `setup_security_groups_screen_full_control` | none; conflict: Adm, Adm2 |
| `reports_audit_reports_view_only` | **S**: holds `setup_security_users_screen_full_control` | none; conflict: Adm, Adm2, OM |
| `office_scope_view_all_offices` | none: a legacy run covered the offices a user could access; all-office reporting is an explicit grant (preset below) | — |
| `reports_view_all_providers` | holds `daily`, `monthly` or `management` (legacy: any provider could be picked) | Adm, Adm2, Cler, Clin, OM, VBSins |
| `report_data_phi_identified` | holds any patient-level family | Adm, Adm2, Asst, Cler, Clin, FD, OM, TC, VBScc, VBSins |
| `report_data_financial_patient` | holds `daily`, `monthly`, `ledger`, `management`, `insurance`, `treatment_plan`, `statements`, `ortho`, `lists_patient`, `lists_responsible_party` or `my_reports` | Adm, Adm2, Asst, Cler, Clin, FD, OM, TC, VBScc, VBSins |
| `report_data_financial_practice` | holds `daily`, `monthly`, `management`, `insurance` or `referral` | Adm, Adm2, Cler, Clin, FD, OM, VBSins |
| `report_data_phi_sensitive` | holds `insurance`, `lists_patient` or `lists_responsible_party` | Adm, Adm2, Cler, FD, OM, VBSins |
| `report_data_clinical` | holds `daily` (legacy Progress Notes report) | Adm, Adm2, Cler, Clin, OM, VBSins |
| `report_data_payment_instrument` | holds `daily`, `monthly`, `ledger` or `statements` | Adm, Adm2, Cler, Clin, OM, VBSins |
| `report_data_provider_comp` | holds `daily`, `monthly` or `management` | Adm, Adm2, Cler, Clin, OM, VBSins |
| `report_data_user_activity` | **S**: holds `management` (legacy Audit Trail) | none; conflict: Adm, Adm2, OM, VBSins |
| `report_data_payroll_wage` | none; roles `owner`, `admin`, `super_admin` keep it implicitly (shipped rule [V] `time_clock_service.py` L104) | — |
| `dashboard_view` | every active group (today `/dashboard` is open to every signed-in user [A] `fe_cross_cutting.md` §5.4). It opens the page; it lists no metric family (§2.3) | all 13 |
| `analytics_provider_dashboard_view` | holds `my_reports` | Adm, Adm2, Cler, Clin, OM |
| `analytics_production_dashboard_view`, `analytics_collections_dashboard_view` | holds `daily` or `monthly` | Adm, Adm2, Cler, Clin, OM, VBSins |
| `analytics_ar_dashboard_view`, `analytics_office_comparison_view`, `analytics_provider_scorecards_view` | holds `monthly` or `management` | Adm, Adm2, OM, VBSins |
| `analytics_insurance_dashboard_view` | holds `insurance` | Adm, Adm2, Cler, FD, OM, VBSins |
| `analytics_scheduling_dashboard_view`, `analytics_morning_huddle_view` | holds `appointment` | Adm, Adm2, Asst, Cler, Clin, OM, VBSins |
| `analytics_treatment_plan_dashboard_view` | holds `treatment_plan` | Adm, Adm2, Cler, Clin, OM, VBSins |
| `analytics_hygiene_recall_dashboard_view` | holds `recall` | Adm, Adm2, Cler, Clin, OM, VBSins |
| `analytics_patients_dashboard_view` | holds `referral` or `lists_patient` | Adm, Adm2, Cler, Clin, OM, VBSins |
| `analytics_goals_view` / `analytics_goals_manage` | legacy holders of `setup_provider_goals_screen_view_only` / `_full_control`; adjacent family `daily` or `monthly`. Which goal rows a holder sees is decided by the classes of §2.2 D | Adm, Adm2, Asst, Clin, OM, TC, VBScc, VBSins / Adm |
| `analytics_assistant_use` | none (P5, opt-in per organisation, §9) | — |

Until the tenant administrator decides the **S** conflicts, the `audit` family and class `user_activity` are held by
`REPORT_FULL_ACCESS_ROLES` only. That narrows nothing that exists in DentC today (`GET /audit-logs` is admin-only [V]
`audit.py` L46-51); it does withhold the legacy Audit Trail from the four groups that hold Management reports and post
transactions, until someone confirms that this is wanted.

Facts that shape the rollout [V] (same parse): Doctor, Billing and Claims hold **no** report right; no seeded group holds
`dashboard_view`, `office_scope_view_all_offices` or any other DentC-added code; Monthly Reports are held by Administrators
only; only Doctor and Time clock only hold no posting right, so the **S** rows grant nothing on an unmodified seed; the
migration leaves `user_group_memberships` out (`denticon_migration/schema_guide.md` L42) and no script writes
them — the only writers are the Users screen service and the generic CRUD route — so on a migrated database a user is in a
group only when someone assigned them by hand. Under the strict rule every other non-administrator holds nothing.

Recommended presets, applied by a tenant administrator from the readiness screen (§3.5), never by migration [I]:

| Group | Preset |
|---|---|
| Doctor | `reports_my_reports_full_control`, `analytics_provider_dashboard_view`, classes `phi_identified`, `clinical`, `financial_patient`; each member needs `users.report_access_provider_id`. Amounts of the member's own provider need no further class (§4.2 PR-6) |
| Regional manager (role `manager`, or any lead of several offices) | `office_scope_view_all_offices`, `reports_view_all_providers`, the families and classes of the persona row in §5.4 |
| Compliance, auditor (a group without posting rights) | `reports_audit_reports_full_control`, `management` View Only, classes `user_activity`, `phi_identified`, `financial_patient`; the screen rights `setup_security_users_screen_view_only` and `setup_security_groups_screen_view_only` for classes `security_users` and `security_groups` |
| Billing | `daily`, `ledger`, `insurance`, `statements` Full Control, `reports_export_data_files`, classes `phi_identified`, `phi_sensitive`, `financial_patient`, `financial_practice`, `payment_instrument` |
| Claims | `insurance` Full Control, classes `phi_identified`, `phi_sensitive`, `financial_patient` |
| FrontDesk | add `appointment` View Only, `reports_my_reports_full_control` |

### 2.5 Catalog change procedure

Verified against the code that owns the catalog; one change set, applied per client database.

| Step | Change | Evidence / reason |
|---|---|---|
| 1 | `app/services/access_rights_catalog.py`: remove the 6 restored rows from `REMOVED_ROWS`; append them and the 41 new rows to `ADDED_RIGHTS` with label and category exactly as in §2.2 (restored rows keep the legacy label and category, so the seeder and the curation write the same row); add `DEACTIVATED_CODES` (13) applied as the last step of `apply_curation` (`is_active = false`); `CURATED_TOTAL = 410` | `apply_curation` deletes every code in `REMOVED_CODES` and upserts `ADDED_RIGHTS` on each run [V] L316-379, so a restored code must leave `REMOVED_ROWS` or the next seed deletes it again |
| 2 | `scripts/seed_permissions.py`: `seed_catalog` skips `DEACTIVATED_CODES` when it re-activates rows; `seed_groups` deletes a group right only when its code comes from `data/Groups.txt` | Today `seed_groups` removes every right that is not in the legacy set of the 13 named groups [V] L143-155, so re-running the seeder would silently strip all DentC-added and report rights from those groups |
| 3 | NEW Alembic data revision (chained on the head at implementation time) calling `apply_curation(session, commit=False)`, as revision `8e4a6a8e5ab0` does | [V] `alembic/versions/8e4a6a8e5ab0_curate_access_rights_catalog.py` L36-40 |
| 4 | NEW `scripts/seed_report_rights.py` plus a second data revision, per tenant. (a) Derived and **S** rows of §2.4: for every active group, evaluate the rule against the group's current `user_group_rights` and insert the derived code. (b) Legacy rows: insert for groups matched by name (case-insensitive, with the seeder's `Office Manger` alias). Additive only (never deletes), idempotent. Output, also stored for the readiness report: rows added per group; group names of `data/Groups.txt` not found; groups that hold an adjacent family but got no legacy row; segregation conflicts | Grants are tenant data; the catalog is global. Name-matched static lists would widen a group whose rights the tenant reduced and would leave a tenant-created group that holds a family without any class |
| 5 | Update the handover files that the tests assert against: `docs/setup/implement/handover/REMOVE_codes.txt` (204), `ADD_rights.json` (91; the restored codes are listed here), `KEEP_codes.txt` unchanged (319), and the frontend copies under `FE:docs/setup/security/handover/`; update the constants in `tests/test_access_rights_catalog.py` (210 → 204, 44 → 91, 363 → 410) | [V] `tests/test_access_rights_catalog.py` L110-129 |
| 6 | NEW `app/reports/rights.py`: the family table of §2.2 A with the metric families and the `provider_restriction` of each right (§2.3), the action table of §3.2, the class grants of §5.3, `REPORT_FULL_ACCESS_ROLES`, `SHADOW_ELIGIBLE` and `SHADOW_CLASS_CEILING` (§3.5); start-up check that every code it names is an active catalog row | 02 §15.4 lint rule "a `right_code` missing from the rights catalog" |

The group-rights picker (`FE:src/components/setup/security/groups/AddEditGroupModal.tsx`) lists the active catalog by
category, so the new categories `Report Data` and `Analytics` appear without frontend work ([A] `fe_cross_cutting.md` §5.3).

---

## 3. Enforcement

### 3.1 Backend objects

All NEW. Module paths follow the engine package of 02 §2; this document fixes the rules they implement.
`ReportPrincipal` is the object 02 calls the caller profile (`RunCaller`, built by `load_run_caller` in
`app/reports/caller.py`, 02 §4.1): one class and one loader with the fields below; ENG-07 builds it and settles the name
and the module.

| Object | Location | Contract |
|---|---|---|
| `ReportPrincipal` | `app/reports/principal.py` | Frozen dataclass, built once per request or once per worker run. Fields below |
| `get_report_principal` → `ReportPrincipalDep` | same | **The dependency every report and analytics endpoint uses.** Wraps `CurrentUser`, `TenantId` and `OfficeContext` (validated `X-Office-ID`, [V] `office_scope_service.py` L444-465), makes one `permission_service.effective_permissions()` call and resolves classes (§5.3). Declared on the routers `app/api/v1/report_engine.py` and `app/api/v1/analytics.py` (`dependencies=[Depends(get_report_principal)]`), so a handler cannot be added without it |
| `build_principal(db, user_id, tenant_id, source)` | same | Same resolution without a request: worker, schedule tick (`run_as_user_id`), assistant tool calls. A schedule therefore runs with the owner's rights **as of the tick** |
| `report_authz.authorize(principal, obj, action, run=None) -> Decision` | `app/reports/authz.py` | Rule of §3.2 for a report definition, dashboard, metric, saved view, schedule or custom definition. Raises `ForbiddenError` when enforced; records `report.denied` |
| `report_authz.can_view_run(principal, run) -> bool` | same | Rules V-1..V-7 of §4.5; called on every read of a stored run, snapshot, artifact or delivery |
| `report_authz.access_for(principal, definition) -> dict` | same | The per-caller `access` object served with catalog entries and definitions (02 §3.1) |
| `report_scope.allowed_offices(principal) -> ALL \| set[int]` | `app/reports/scope.py` | **The one office decision of every report surface** (§4.1 S-3, S-4): engine runs, metric and dashboard calls, the legacy routes of §10.1, `/dashboard/summary`, `/reports/time-clock` |
| `report_scope.resolve_office_set(principal, office_ids, office_group_id, all_offices, path_office_id=None) -> list[int] \| None` | same | §4.1 S-2, S-5..S-7 on top of `allowed_offices()`; `None` = tenant-wide |
| `report_scope.resolve(principal, definition, params) -> ResolvedScope` | same | §4: office set, provider restriction, user restriction, class profile, `ctx` facts |
| `report_scope.assert_patient_visible(principal, patient_id)` | same | Report-mode chart visibility (§4.1 S-10): the caller is report-unrestricted, or the patient's home office is in `allowed_offices()`, or the patient has an appointment or a posted procedure at one of them; else 403 `patient_not_in_office`. Same test as the platform's `patient_is_visible` [V] `office_scope_service.py` L355-388 without its alias and zero-assignment valves |
| `require_report_access(right_set, action="run")` | `app/reports/deps.py` | Dependency factory for routes outside the engine (the legacy roll-ups, office dashboards, lab reports and statement batch of §10). Authorises against the named right set; the handler reads the three office keys through `OfficeScopeDep` (parameter parsing only) and decides them with `report_scope.resolve_office_set()`, the path office included |

| `ReportPrincipal` field | Source |
|---|---|
| `user`, `tenant_id`, `actor_tenant_id` | `CurrentUser`; `TenantId` (data tenant); token tenant, different only for `super_admin` with `X-Tenant-ID` [V] `deps.py` L64-74 |
| `role`, `perms`, `full_access` | `users.role` lower-cased; `EffectivePermissions`; `role in REPORT_FULL_ACCESS_ROLES` |
| `working_office_id`, `assigned_office_ids`, `office_unrestricted` | `working_office_id` of the request body (02 §4.1) or the `X-Office-ID` header on legacy routes, in both cases checked by S-2; `OfficeScope.assigned_ids` [V] L109-117; rule S-3 of §4.1 |
| `provider_link_id`, `can_view_all_providers` | `users.report_access_provider_id` [V] `identity.py` L70 (a `providers.id` string); rule PR-3 of §4.2 |
| `data_classes`, `patient_access_level` | §5.3 after the ceiling of §4.4 |
| `enforced`, `shadow` | `settings.REPORT_RIGHTS_ENFORCED` (02 §12.4), `settings.REPORT_RIGHTS_SHADOW` and `REPORT_RIGHTS_SHADOW_UNTIL` (NEW, §3.5) |
| `request_id`, `ip_address`, `user_agent`, `session_jti` | `request_id_ctx`, `client_ip_ctx`, `user_agent_ctx` ([A] `be_platform.md` §1.1), token `jti` |

Cost per request: the existing resolution cost (rights 2 statements, assigned offices 1 statement, [A] `be_platform.md`
§1.2). The profile is never stored in Redis (§7.5 RC-1). Run creation, export, download, delivery, drill and actions
load it fresh, so a revoked right takes effect on the next such request. Snapshot page reads and status polls of a run
may use a process-local copy of at most `REPORT_CALLER_CACHE_SECONDS` (30, 02 §12.4); that bounds the round trips of a
poll (02 C18) without putting authorisation state on the shared cache.

### 3.2 Decision rule

`authorize()` evaluates in this order and stops at the first refusal.

| # | Check | Refusal |
|---|---|---|
| 1 | Engine enabled; `report_key` not in `report_tenant_settings.disabled_report_keys` | 404 / 409 `report_disabled` (02 §4.1) |
| 2 | `principal.full_access` → allow every action (classes and scope are still resolved, and everything is audited) | — |
| 3 | Family level of the object for the action (table below), evaluated with `has_strict` on the family's codes; an any-of list passes with one family; an `action_right_codes` entry of the definition replaces the family code for that action | 403 `permission_denied`, `details{report_key, action, required_any_of[], groups[]}` |
| 4 | Module-wide action right of the action, when the table names one | 403 `permission_denied` with the action code in `required_any_of` |
| 5 | Object conditions: definition `schedulable`, `outputs.<format>.enabled`, visibility of a custom definition or saved view (owner, `report_shares`, organisation); for a custom definition also one report family of its dataset (§5.6) | 403 `permission_denied` or 404 for objects the caller may not know of |
| 6 | Shadow (§3.5), only while `REPORT_RIGHTS_ENFORCED = false`: a refusal of step 3, or of step 4 when the missing code is `reports_export_data_files`, is logged (`report.denied`, `outcome = shadow_denied`) and the call proceeds **only** when the object is in `SHADOW_ELIGIBLE` and the action is one of `catalog`, `run`, `validate`, `options`, `view`, `drill`, `save_view`, `print`, `export_pdf`, `export_xlsx`, `export_csv`. Every other refusal stands in shadow exactly as when enforced: the other module-wide rights of §2.2 B, step 5, `commit`, every object outside `SHADOW_ELIGIBLE` | — |

Scope and classes are resolved after `authorize()` (step 4 of the pipeline, 02 §4.1): 403 `office_not_assigned`,
403 `report_provider_not_linked`, 403 `data_class_denied` (`details{denied_classes[], block}`; raised when a key column
is denied, or when a custom definition references a field of a denied class outside its displayed columns, §5.6).

| Action | Family level | Module-wide right (AND) |
|---|---|---|
| `catalog`, `run`, `validate`, `options`, `view`, `drill`, `save_view` | View Only or Full Control | — |
| `commit` (a run whose resolved format has `side_effects = writes`, 02 §5.9) | Full Control; the definition names the code in `action_right_codes.commit` (lint of 02 §15.4) | — |
| `print`, `export_pdf` | Full Control | — |
| `export_xlsx`, `export_csv` | Full Control | `reports_export_data_files` |
| `schedule` | Full Control | `reports_schedule_own`, plus the export action of every format in `output_formats` |
| `share` (view shares, run deliveries, custom-definition shares) | View Only or Full Control | `reports_share` |
| `share_organization` (saved view or custom definition with `visibility = organization`; `is_org_default`) | View Only or Full Control | `reports_share_organization` |
| `pin` | Full Control | `reports_runs_pin` |
| `build`, `publish` | A report family of the dataset (§5.6) | `reports_build_custom` |
| `view_all_runs` / `manage_runs` | — | `reports_runs_view_all` / `reports_runs_manage_all` |
| `manage_schedules` | — | `reports_schedules_manage_all` |
| `administer`, `legal_hold` | — | `reports_administer` |
| `manage_disclosures` | — | `reports_disclosures_manage` |
| Bulk action of `kind = export_selection` | As `export_<format>` of the requested format: it is an artifact request (§7.1 X-1) with the purpose and bulk rules of §7.2 | As `export_<format>` |
| Any other row or bulk action | View Only or Full Control | The action's `right_code` (feature right), strict |

When an action is checked: `export_*` and `print` at the artifact request **and** at every download; for a run created
with `render_output = true` already at run creation, for the format in `output_format`; for a schedule at creation, at
every change of `output_formats` and at each tick. No artifact and no `report.export` event exists for a format the
requester may not export.

Served `access` object: `can_run`, `can_print`, `can_export`, `can_schedule`, `can_share`, `can_commit`,
`hidden_data_classes[]`, `hidden_parameters[]` as in 02 §3.1. Because PDF and data files have different rules, this
document needs one more field, `export_formats[]` (subset of `pdf`, `xlsx`, `csv`); `can_export` = the list is not
empty (request to 02, §13.3). `can_commit` = the caller passes action `commit`; a caller without it is served the
definition without its `writes` formats.

### 3.3 Checks per endpoint (rows of 02 §13)

| Rows | Endpoint group | Check |
|---|---|---|
| 1 | `GET /reports/catalog` | Entries filtered by action `catalog`. With `include_unavailable=true` a refused entry is listed with title and category only and `access.can_run = false` |
| 2-4 | Definition, validate, options | `authorize("run")`. The options endpoint also applies the caller's office scope and the class of the option source (§5.2 rule 9) |
| 5, 10, 21 | Create run, rerun, live rows | `authorize("run")`, then `report_scope.resolve()`; also `commit` when the resolved format writes, and the export action of `output_format` when `render_output = true`. Source `schedule` uses `build_principal(run_as_user_id)`. **Supplied `run_id`** (row 5; 02 §5.4 lookup step 1): an id that already exists is answered with that run only when `requested_by` = the caller and `report_key` and `params_hash` equal the request; otherwise 409 `run_id_conflict` with no run data. A run id is not a capability: it appears in notification links, browser history and the `scope=all` list |
| 6 | Run list | Own runs. `scope=all` needs `reports_runs_view_all`. A run that does not pass `can_view_run()` for the caller is returned in the reduced shape of §4.5 (no result-bearing field) |
| 7 | Run status | `can_view_run()` for every caller, the requester included; a caller who fails it but is the requester, or holds `reports_runs_view_all`, gets the reduced shape, anyone else 404. Polls may use the process-local profile of §3.1 |
| 8, 16, 17 | Rows, artifact list and status | `can_view_run()` |
| 9, 12 | Cancel, purge | Requester, or `reports_runs_manage_all` |
| 11 | Pin, unpin, legal hold | `pinned`: `can_view_run()` + action `pin`. `legal_hold`: `reports_administer`, reason mandatory |
| 13 | Drill | `can_view_run()` on the parent, then a full `authorize("run")` and scope resolution on the target with the viewer's own principal |
| 14 | Row and bulk actions | `can_view_run()` + the action right + the `read_only` rule of §4.4; ids come from the snapshot (02 §3.10). `kind = export_selection` is handled as row 15 |
| 15 | Request artifact | `can_view_run()` + action `print` / `export_*` + purpose and bulk rules (§7.2) |
| 18 | Download | Artifact `ready` and not expired + `can_view_run()` + the same action right, evaluated at fetch time |
| 19, 20 | Deliveries of a run | Sender: action `share` + `can_view_run()`. Each recipient: `can_view_run()`. Reading the delivery list: run requester or `reports_runs_manage_all`; it holds recipients and statuses, no result-bearing field |
| 22, 23 | Stats, settings | `reports_runs_manage_all`; `reports_administer`. Both are enforced in shadow |
| 24-36 | Saved views, favorites, recents | Owner or grantee. Create: `authorize("run")` on the object. Shares: action `share`; `visibility = organization` and `is_org_default`: action `share_organization` |
| 37-46 | Schedules, delivery log | Create: action `schedule` (every format of `output_formats` checked). Read, pause, resume, delete, change recipients: owner or `reports_schedules_manage_all`. Change of `report_key`, `params`, `office_policy`, `office_scope`, `output_formats`, `scope_mode` or `condition`: the owner only; a manager takes the schedule over first (SH-6). Take-over: `reports_schedules_manage_all`, and the new owner must pass action `schedule` on the report. Run-now by a non-owner (row 43): the run executes as the owner and is delivered to the caller only when the caller passes `can_view_run()`. Run history (row 45): each run in the full shape only when `can_view_run()` passes for the caller, else reduced (§4.5); delivery lists (row 46) carry no result-bearing field. In `per_recipient` mode the owner therefore sees delivery status, not other recipients' results |
| 47-53 | Custom definitions | Actions `build`, `publish` (the author holds a report family of the dataset and the class of every field referenced anywhere in `spec`); read by grantees; shares need `share`, `visibility = organization` needs `share_organization`; preview and run check the caller's own rights, scope and classes (§5.6, §8) |
| 54-57 | Analytics metadata, metric definition, query, drill | Metric-family rule and grant-path rule of §2.3, then classes; a restricted caller's query is compiled for the own provider (PR-10); drill adds `authorize("run")` on the report |
| 58-61 | Dashboards | Dashboard right; each metric tile by the rules of rows 54-57; a refused tile is `restricted`, not an error. A tile whose `query` is a report reference (02 §10.4), or that returns a column with `entity = patient` (huddle lists, worklist tiles), is executed as a run of that report: `authorize(report, "run")`, scope and classes of the report, `report.run` or live-page event with manifest, fail closed (§6.1 A-3). The dashboard right alone never opens patient rows |
| 62 | Goals | `analytics_goals_view` to read, `analytics_goals_manage` to write; office and organisation goals need class `financial_practice`, provider goals `provider_comp`; a provider-restricted caller gets the own row only, read-only |
| 64 | Assistant | `analytics_assistant_use` and §9 |
| NEW (request, §13.3) | `POST /reports/disclosures`, `POST /reports/disclosures/{disclosure_id}/amendments` | `reports_disclosures_manage`; a referenced run or artifact must belong to the tenant (§6.5) |
| — | `/internal/reports/*` (worker) | OIDC check of 02 §12.1; the principal is rebuilt from `report_runs.run_as_user_id`; nothing in a task body is trusted except the run or artifact id |

### 3.4 Frontend gating

| Surface | Rule |
|---|---|
| Source of truth | The server-computed `access` object of catalog entries and definitions, and the filtered dashboard catalog. The hub does not evaluate right codes for report access |
| Why not `useRights()` | `hasRight()` grants everything while `RIGHTS_ENFORCED_DEFAULT` is `false` and for users with `permissions_enforced === false` [V] `FE:src/features/access-control/rights.ts` L27, L70-79 — the opposite of the strict server rule. Row and bulk actions follow the same principle: the served definition lists only the actions the caller may use (strict check of each action's `right_code` in `access_for()`) |
| Navigation | The Reports and Analytics menus are built from `GET /reports/catalog` and `GET /analytics/dashboards` (query key includes the user id, refetched after an identity refresh). An empty catalog renders a request-access state that names the tenant administrator role, not an empty page |
| Routes | The module error boundary (AD-11) maps 403 `permission_denied` to `<AccessDenied>` (`src/features/access-control`) with the labels of `details.required_any_of`; 403 `data_class_denied`, `office_not_assigned`, `report_provider_not_linked` use the messages of `04_filter_framework.md` §10.4 |
| Buttons | Print, Export per format, Schedule, Share and Pin follow `access.can_print`, `access.export_formats[]`, `access.can_schedule`, `access.can_share`; a format that writes business rows (PRINT STATEMENTS) follows `access.can_commit`. A capability missing because the caller is View Only is shown disabled with the reason; it is not hidden |
| Hidden columns | `access.hidden_data_classes[]` produces one notice ("Some columns are hidden for your role"); column names are not listed |
| Office picker | Offered modes and offices come from the served definition (`validation.allowed_modes`, option `disabled_reason` of 04 §13.3), never from `isPrivilegedRole()`, whose token match differs from the server role set ([A] `fe_cross_cutting.md` §8) |
| Result caches | Report rows and metric responses live in memory only (TanStack Query); never in `localStorage`, `sessionStorage` or IndexedDB; dropped on logout and on `auth:unauthorized` |
| Client-built exports | The CSV, SpreadsheetML and jsPDF exporters of `src/components/reports/lib/` leave with the six migrated reports (ENG-20). No file of report data is built in the browser afterwards |

### 3.5 Switching enforcement on without locking users out

Deployment is one service per client organisation, so the flags below are per client. `REPORT_RIGHTS_ENFORCED` exists
in 02 §12.4 with default `true`; `REPORT_RIGHTS_SHADOW` (default `true`) and `REPORT_RIGHTS_SHADOW_UNTIL` (ISO date, no
default) are NEW. A client in its shadow window sets `REPORT_RIGHTS_ENFORCED=false` and an end date explicitly; a new
client without history starts enforced.

Shadow is a grace list for the surfaces every signed-in user can already reach today, not a second mode of the module.
It relaxes the family level for the objects in `SHADOW_ELIGIBLE`; everything else is enforced from the first deploy.

| `REPORT_RIGHTS_ENFORCED` | `REPORT_RIGHTS_SHADOW` | Behaviour |
|---|---|---|
| `false` | `false` | Off: no right or class check. Accepted only when `ENV = dev`; in `staging` and `prod` the pair is a configuration error and the engine routes answer 503 `reports_engine_misconfigured` (fail-closed checks of 02 §12.4) |
| `false` | `true` | Shadow, until `REPORT_RIGHTS_SHADOW_UNTIL`. A missing, unparsable or past date means enforced; `GET /reports/settings` shows the mode and the date |
| `true` | any | Enforced |

| Shadow element | Rule |
|---|---|
| `SHADOW_ELIGIBLE` (constant, `app/reports/rights.py`) | The six definitions that replace the client-side reports (ENG-20) and the legacy read routes of §10.1 D-01, D-03, D-04, D-06. Not the statement batch (D-05): it writes, has no frontend caller [A] `be_existing_reporting.md` §1.2, and is enforced from the first deploy. Nothing of P1 or later is ever added to the list |
| Relaxed | For an eligible object and the actions listed in §3.2 step 6: the family level, and the data-file key `reports_export_data_files` (the six reports export CSV, XLS and PDF for every signed-in user today [A] `fe_existing_reports.md` §2.7). A would-be refusal is a `report.denied` event with `outcome = shadow_denied` and the call proceeds |
| Class ceiling `SHADOW_CLASS_CEILING` | A class the caller lacks is added, for an eligible object only, when it is one of `aggregate`, `phi_identified`, `financial_patient`, `financial_practice`, `provider_comp`, `payment_instrument`: the classes of the columns those surfaces return today ([A] `fe_existing_reports.md` §2.4, `be_existing_reporting.md` §1.1). Never added: `phi_sensitive`, `clinical`, `payroll_time`, `payroll_wage`, `user_activity`, `security_users`, `security_groups` |
| Always enforced, shadow or not | The tenant predicate; the office rule of §4.1 on every surface (its own staging switch is `REPORT_UNGATED_OFFICE_ACCESS`, accepted only while `REPORT_RIGHTS_ENFORCED = false`); every module-wide right of §2.2 B other than the data-file key on eligible objects; object visibility of saved views and custom definitions; action `commit`; `can_view_run()` V-1..V-7; the `audit` family and every definition with key class `user_activity`, `security_users` or `security_groups`; the provider and user restrictions of §4.2 and §4.3; every definition, dashboard, metric and analytics endpoint outside `SHADOW_ELIGIBLE` (no entry in `disabled_report_keys` is needed: they are simply enforced); `PATCH /reports/settings`; legal hold; every audit event |

| # | Step | Exit check |
|---|---|---|
| 1 | Close the outside door and the self-escalation defects (SEC-11, SEC-42): D-27 open signup, D-23 tenant predicate on the tenant-less resources, D-09..D-12 group, membership, assignment and tenant writes, D-28 open reads of users and groups. Rights are worthless while anyone can create a tenant administrator or join a group | Anonymous `POST /auth/signup` answers 404; the client database holds only the tenants named in the client registry; a non-administrator gets 403 on membership, group and office-assignment writes |
| 2 | Apply catalog revision 2 and the additive grants (SEC-01, SEC-02) on the client database | `GET /permissions` lists 397 codes; the grant script prints what it added, the undecided legacy rows and the segregation conflicts |
| 3 | Deploy the engine in shadow with an end date. Eligible surfaces behave as today; every other surface is enforced | Shadow `report.denied` events are written; a non-administrator gets 403 on `PATCH /reports/settings`, on the readiness report and on another user's private saved view |
| 4 | Run the readiness report `management.report_access_readiness` (SEC-12): (a) active users in no active group; (b) users whose groups hold no report family; (c) shadow denials and `office_not_assigned` refusals by user, report and action over 14 days; (d) users with zero `user_offices` rows; (e) users who hold `appointments_add_appointment_in_other_office` without `office_scope_view_all_offices` (the alias gives no all-office view in reports); (f) users of `my_reports.*` without `report_access_provider_id`; (g) users whose `report_access_provider_id` differs from the provider linked through `providers.user_id`; (h) `patient_access_level` values outside `full`, `limited`, `read_only`, `none`; (i) groups that hold a report family but lack a class a key column of that family needs, and groups that hold an adjacent family but received no legacy row (§2.4); (j) users with role `manager` whose `user_offices` are a proper subset of the tenant's offices and who do not hold `office_scope_view_all_offices`; (k) segregation conflicts: groups that pass an **S** rule of §2.4 but hold a posting right | The report runs for `REPORT_FULL_ACCESS_ROLES` (its `audit` family is enforced in shadow) |
| 5 | The tenant administrator clears the list: group memberships, presets of §2.4, the undecided legacy rows, the segregation conflicts, office assignments (`scripts/backfill_user_offices.py` exists for the bulk case [V]), provider links | Signed checklist stored in the client registry |
| 6 | Set `REPORT_RIGHTS_ENFORCED=true` and `REPORT_UNGATED_OFFICE_ACCESS=false` for that client | Zero shadow denials for 7 consecutive days, or each remaining one acknowledged by the tenant administrator; at the latest on `REPORT_RIGHTS_SHADOW_UNTIL` |
| 7 | A client onboarded after P1 has shipped starts enforced. If it needs a window, the same grace list applies; P1..P5 surfaces are never relaxed for it | A user of that client without the family gets 403 on every P1 report on its first day |

Break-glass: full-access roles always pass, so a lock-out is repaired by grants. Setting a new
`REPORT_RIGHTS_SHADOW_UNTIL` with `REPORT_RIGHTS_ENFORCED=false` re-opens the grace list only;
`REPORTS_ENGINE_ENABLED=false` (02 §12.4) removes the module as a whole. Neither switch widens anything beyond what was
reachable before the module existed. The frontend flag `RIGHTS_ENFORCED_DEFAULT` is unrelated and is not touched by this
module.

---

## 4. Scope rules

`report_scope.resolve()` produces, once per run: the office set, the provider restriction, the user restriction and the
class profile. They are stored on `report_runs` (`scope_office_ids`, `scope_all_offices`, `scope_office_group_id`,
`scope_provider_ids`, `scope_data_classes`, `scope_hash`, `working_office_id`, 02 §5.2; `scope_user_ids` is requested,
§4.3 UR-3).

### 4.1 Office, office group and all offices

One function decides the office set of every report surface: `report_scope.allowed_offices(principal)` returns `ALL` or
a set of office ids, and `report_scope.resolve_office_set()` applies it to the request. This is the engine office rule
of 02 §4.1 (ENG-07); 02 computes it in `app/reports/scope.py` and does not call the platform resolver.

The platform functions are **not used on any report surface**, because each of them passes a caller for whom
`OfficeScope.unrestricted()` is true — the holder of the alias right, the caller with zero assignments, the roles
`owner` / `manager`, and everyone when `OFFICE_SCOPE_ENFORCED` is off [V] `office_scope_service.py` L156-178:
`validate_target_office` (explicit ids, L241-250), `assert_office_path_access` (path office, L269-274),
`require_all_offices` (L277-285; its `reports` flag only adds a right, it removes no valve) and the group and default
branches of `resolve_list_office_filter` (L336-350). `/dashboard/summary` has its own copy of the same logic [V]
`dashboard.py` L44-63. Reused from the platform: `OfficeScope.assigned_ids` and `office_group_office_ids` [V] L109-127;
`OfficeScopeDep` stays the reader of the three keys on GET routes (AD-7). `OfficeScope.can_view_all()` is not reused: it
accepts the alias (request to 02, §13.3).

| # | Rule | Detail |
|---|---|---|
| S-1 | Tenant | Every dataset handle adds `tenant_column = :tenant_id` (02 §4.2). Scope rules below never replace it |
| S-2 | Explicit offices | Each id of `office_ids`, a path office of `/offices/{office_id}/…`, a single `office_id` query value of a legacy route and the working office of the request must be in `allowed_offices()`: otherwise 403 `office_not_assigned` with `details{office_id, field, assigned_office_ids}` |
| S-3 | Who is report-unrestricted (NEW) | `allowed_offices() = ALL` only for a role in `REPORT_FULL_ACCESS_ROLES` or a strict holder of `office_scope_view_all_offices`. Not for: the alias `appointments_add_appointment_in_other_office` (held by Administrators, Clerical, FrontDesk and VBS-call center [V] `data/Groups.txt`; its stated intent is writing an appointment elsewhere, [V] `permission_service.py` L74-91), role `manager` (§2.1, open decision 4b), `OFFICE_SCOPE_ENFORCED = false` (the engine does not read it, 02 §4.1) |
| S-4 | Zero assignments (NEW) | For everyone else `allowed_offices()` = `assigned_office_ids`. An empty set is 403 `office_not_assigned` with `details.reason = "no_office_assignment"` on any surface that needs an office set, and pauses the caller's schedules with `scope_lost` (02 §9.2). `REPORT_UNGATED_OFFICE_ACCESS` (02 §12.4, default `false`) turns the empty set into `ALL` for a client whose assignments are not set up yet. It is a separate staging switch: rights shadow by itself never changes the office rule; the switch is accepted only during the client's shadow window and is off at step 6 of §3.5 (open decision 5) |
| S-5 | Office group | Group ∩ `allowed_offices()`. An empty result is 403 `office_not_assigned` with `details.reason = "office_group_outside_assignments"` (02 §4.1). A group id of another tenant resolves to nothing by construction (`Office.tenant_id` predicate, [V] L120-127) and is rejected earlier as 422 `unknown_reference`. No extra right is needed for group or multi-office runs (§2.2 F) |
| S-6 | All offices | `all_offices: true` needs S-3; otherwise 403 `office_not_assigned` with `details.required_any_of = ["office_scope_view_all_offices"]`. The form sends it only to report-unrestricted callers (04 §6.2) |
| S-7 | No office key | Restricted caller: `allowed_offices()`. Report-unrestricted caller: the tenant (`scope_office_ids = NULL`) |
| S-8 | Rows without an office | The "Unassigned office" member (03 §5.1 rule 3) is part of tenant-wide runs only |
| S-9 | Inactive and deleted offices | Remain valid read scope by assignment; history must stay reportable (03 §3.6). They are never the working office (existing 409 `office_inactive` rule for writes) |
| S-10 | `office_mode = none` | Allowed for exactly three groups; the lint requires a justification note (02 §15.4) and this list is the reviewer's reference. (a) Organisation-level catalogs: the 3 Lists › Security and 17 Lists › Setup reports of 04 §6.5 and Referral Source List (04 §6.4). They must not read office-attributed facts. (b) The organisation-level reports of §6.8: #7, #8, #9, #11. (c) Single-patient definitions (`lists.patients_notes`, `management.accounting_of_disclosures`): every patient parameter passes `report_scope.assert_patient_visible()` (§3.1), else 403 `patient_not_in_office` — a user who cannot open a chart cannot run a report on it. Statements, the 22nd report of 04 §6.5, is `office_mode = required` |
| S-11 | Meaning of the scope | The office set applies to the attribution column the definition declares (`scope.office_attribution`, 03 §5.1). A user assigned to office A therefore sees, under home-office attribution, an account's charges made at office B. That is the office model of the product (context, not a fence) and is printed in the criteria echo |
| S-12 | Not accepted | `include_global` and a bare `office_id` are not report parameters of an engine definition (unknown key → 422); the legacy routes of §10.1 keep their `office_id` and check it by S-2. `X-Office-ID` is context (today, time zone, default office), never a read filter |
| S-13 | Two office scopes (referral reports, 04 §6.7) | A referral row is readable when its referred-from office **or** its referred-to office is in `allowed_offices()`: a receiving office reads the referrals addressed to it. On `referral.internal_referral_management` both `referred_from_office_scope` and `referred_to_office_scope` are therefore checked by S-2, and the scoped handle matches either office column (a two-column `OR` attribution, requested from 02 and 03). The row carries its patient columns under class `phi_identified`; opening the chart goes through the chart's own visibility check |
| S-14 | Audit-family reports over `report_audit_events` (§6.8 #4, #6) | An event is visible to a restricted viewer only when `scope_office_ids` of the event ⊆ `allowed_offices()`. Events with a NULL office set (tenant-wide runs, settings, definition and seal events) need a report-unrestricted viewer. Parameters, scope and patient ids of another office's runs are PHI of that office |

### 4.2 Provider restriction (PD-11)

| # | Rule | Detail |
|---|---|---|
| PR-1 | The link | `users.report_access_provider_id` is the only link used for restriction. `providers.user_id` (the "linked user" that feeds `MeFull.provider_id`) is independent and can disagree ([A] `be_data_identity_setup.md` §1.7); the readiness report lists disagreements |
| PR-2 | Declaration | Two places. (a) A definition (report, worklist, dashboard) declares `scope.provider_restriction`: `none`, `self_unless_privileged`, `self_always` (02 §3.1). Standard reports are `none` (legacy: any user with the menu right may pick any provider, [R] `legacy_report_outputs_daily_my.md` §5); the definitions that restrict are in the table below. (b) A metric read has no definition: its restriction comes from the rights the caller holds for the metric family (PR-10). Where both apply, the stricter one wins |
| PR-3 | Exempt | Role in `REPORT_FULL_ACCESS_ROLES`, or strict holder of `reports_view_all_providers`. Role `manager` is not exempt by role (§2.1, open decision 4b). `self_always` has no exemption |
| PR-4 | Effect | `scope_provider_ids = [provider_link_id]`; the dataset handle adds the predicate on the column named by `scope.provider_attribution` (02 §4.2); `provider_ids` is forced to the link; `corresponding_provider_id` displays it (04 §10.3); `ctx.provider_restricted` is true. For an exempt caller of a `self_unless_privileged` definition `provider_ids` is an ordinary filter whose default is the caller's own link when one exists, else `all` |
| PR-5 | No link | A restricted run: 403 `report_provider_not_linked` (legacy shows an error when no Corresponding Provider is set). A restricted metric point or tile: `status = restricted` with reason `report_provider_not_linked` |
| PR-6 | Classes under restriction | While a self restriction is active (`scope_provider_ids = [provider_link_id]`) the classes `provider_comp` and `financial_practice` are satisfied for that run or query: every amount in it is the provider's own production, collections or rate, and 02 and 05 class that money `financial_practice` (02 §3.11, 05 §1.6). `financial_patient` (amounts on patient rows) and every other class still need their grant |
| PR-7 | Dual attribution | When a metric credits hygienist and dentist differently (setting owned by 05), the restricted provider sees a row when they are the credited provider under the active setting |
| PR-8 | No subtraction | Under restriction the filter is applied before aggregation, so every subtotal and total is the provider's own. Practice totals, "share of practice", rank and percentile are not returned. A peer **mean** (office or organisation) is returned only when at least `min_peer_group` (default 5) **other** providers contribute, the caller not counted; a median or quartiles only from `min_peer_group_quantiles` (default 10) others — the median of three is one colleague's exact value. Below the threshold the point is `suppressed`. Minimum and maximum of others are never returned |
| PR-9 | Same rule everywhere | Exports, schedules, cache keys (`scope_hash` holds the provider set), drill targets and assistant tool calls go through the same `report_scope.resolve()` |
| PR-10 | Grant path (metric queries, dashboard tiles, metric drills, assistant tool calls) | The restriction is a property of the rights the caller holds for the metric family (§2.3), not of the request: the metric endpoint cannot know which dashboard a query comes from. For a (caller, `metric_family`) pair it is `none` only when the caller is exempt (PR-3) or holds at least one right with `provider_restriction = none` that lists the family. Otherwise every read of that family is compiled with `provider_ids = [provider_link_id]`, whatever `dimensions` and `filters` the request names: `scope_provider_ids` is set, the response carries `provider_restricted: true`, PR-6 and PR-8 apply, and a metric without a provider attribution returns `restricted`. `dashboards.main` follows the same rule tile by tile. A restricted provider's unsliced `net_production` is therefore the provider's own value, and no office total of a family reached only through a self-restricted right is ever returned — counts and rates included |

Definitions that restrict (keys of `catalog/my_reports.md` and 06; `report_by` values are confirmed by the live check of
04 §11.1):

| Definition | Restriction | Rule |
|---|---|---|
| `my_reports.daily_journal` | By the option of `report_by` | `report_by = user` (legacy default): user restriction `self_always`, `user_ids` forced to `[current_user]`. Every other option of the collapsed REPORT BY list is treated as a provider-type value until the list is read ([R] `legacy_report_outputs_daily_my.md` §5 B1): provider restriction `self_unless_privileged`, `provider_ids` forced to `[provider_link_id]`. No option runs without one of the two |
| `my_reports.time_clock_report` | User, `self_always` | Own card only (legacy: no user picker). UR-2 |
| `my_reports.missing_progress_notes` | Provider, `self_unless_privileged` | The legacy PROVIDER picker (default ALL) is forced to the link and shown read-only for a restricted caller; an exempt caller keeps the picker |
| `my_reports.appointment_detail_by_user` | User, `self_always` | The creating user of the appointment is forced to `[current_user]` ([R] same §5 B4: the report lists appointments the caller entered). The Provider and Operatory pickers stay filters inside that set |
| `my_reports.production_report` | Provider, `self_unless_privileged` (PD-11) | Restricted caller: forced to the link, CORRESPONDING PROVIDER display-only, 403 `report_provider_not_linked` without a link (the legacy behaviour). Exempt caller: `provider_ids` is offered as a picker in place of the display box, default the own link, else `all` (open decision 13) |
| `worklists.unsigned_progress_notes` | Provider, `self_unless_privileged` | 06 §6.4. A provider sees and signs the own notes |
| `dashboards.provider`, scorecards across providers | Provider, `self_unless_privileged` | 06 §2.2, §3.4; values also follow PR-10 |
| `dashboards.my` | Provider, `self_always` | 06 §2.3: the caller's own provider for every caller; others use `dashboards.provider` |

### 4.3 User restriction

| # | Rule | Detail |
|---|---|---|
| UR-1 | Declaration | `scope.user_restriction` of the definition: `none`, `self_unless_privileged` (with `scope.user_restriction_exempt_class`), `self_always`; a field requested from 02 (§13.3). Effect: the user parameter is forced to the caller (`forced_when: [{when: true, value: {"token": "current_user"}}]`, token of 04 §2.3) and `scope_user_ids = [user_id]`. The definitions are in the table of §4.2 plus `management.time_clock_report` (`self_unless_privileged`, exempting class `payroll_time`) |
| UR-2 | Time clock | Who sees other users' cards is decided by the engine, not inside the builder: a caller without class `payroll_time` gets `scope_user_ids = [user_id]`, and the engine passes that id to the wrapped `build_report(user_id=…)`. Today the builder narrows silently — `if not caller.can_view_all: user_id = caller.id` [V] `time_clock_service.py` L1339-1342 — so two callers with equal parameters get different rows that `params_hash` and `scope_hash` cannot tell apart. `can_view_all` becomes: class `payroll_time` (§5.3) |
| UR-3 | Recorded | Precondition of SEC-06: `report_runs.scope_user_ids` (JSON NULL; `NULL` = no user restriction) exists and is part of `scope_hash`, like `scope_provider_ids`. Until it does, the lint forces `cacheable = false` on every definition with a user restriction; a `python_builder` definition with a user restriction stays uncacheable afterwards as well |
| UR-4 | Lint | A `my_reports.*` definition fails the lint unless, for every option of its discriminator parameter (`report_by`), at least one self restriction (user or provider) is active. A definition without a discriminator needs one restriction |

### 4.4 Patient access level

`users.patient_access_level` is stored and editable, read by no code; its option list is the definitions group
`patient_access_level` with the fallback `full`, `limited`, `read_only`, `none` [V] `user_admin_service.py` L45, L76-78.
No semantics exist, so the rule below is a design decision [I] (open decision 6). It is a **ceiling**: it can only remove.

| Value | Effect in this module |
|---|---|
| `full`, NULL | None |
| `limited` | Class `phi_sensitive` is removed from the caller's profile |
| `read_only` | Classes unchanged. Row and bulk actions that write (tasks, messages, letters, status updates) are refused with 403 `permission_denied`, `details.reason = "patient_access_read_only"` |
| `none` | Classes `phi_identified`, `phi_sensitive`, `clinical`, `financial_patient`, `payment_instrument` are removed: aggregate-only reporting. Definitions with a patient key column refuse with 403 `data_class_denied` |
| Any other tenant-defined value | Treated as `none` until an administrator maps it to one of the four values (fail closed: a tenant value meant to be stricter than `none` must not grant patient rows); listed by the readiness report, check (h) |

Full-access roles are not subject to the ceiling. Per-patient restrictions do not exist in the data model (the kept rights
`patient_assign_to_restricted_user_*` have no backing table). Chart visibility exists on one route only: the generic
`GET /patients/{item_id}` calls `assert_patient_visible` (403 `patient_not_in_office`) [V] `router_factory.py` L415-421,
`registry.py` L424, `office_scope_service.py` L355-404. That line is its only call site in `app/` [V]: the hand-written
patient routes (ledger, balance, patient change log, the four patient PDFs) do not check it. The module therefore does
not rely on the target screen:
a drill of `kind = record` and every single-patient definition call `report_scope.assert_patient_visible()` on the
server before an id or a row is returned (§4.1 S-10, §5.2 rule 10). The platform routes themselves are D-07 and
risk R-14.

### 4.5 Where scope is stored and when it is checked again

| Object | Scope material it carries | Checked again | Rule |
|---|---|---|---|
| Run cache key (`report_runs.cache_key`) and metric cache key (`rptm:*`) | `scope_hash` = tenant, office ids or `*`, provider ids or `*`, user ids or `*` (UR-3), granted classes, attributions (02 §5.4, §10.3) | Every lookup | Equal hash, then `can_view_run()`. Redis keys and values also follow §7.5. The legacy `report:*` keys get the same hash when ENG-16 secures those routes |
| Run row | The `scope_*` columns, `run_as_user_id`, `working_office_id` | Every read | V-1..V-7 |
| Snapshot (`report_run_rows`, `result.ndjson.gz`) | Only rows inside the scope and only columns of granted classes; no tenant column of its own (02 §6.1) | Through `SnapshotReader(run)` only | A viewer sees the whole run or nothing; a snapshot is never re-filtered for a narrower viewer |
| Saved view | `params` with tokens; office ids only when `office_policy = fixed` | At `resolve` and at run | Never widens: ids the caller may not use are dropped with `notices[]`; nothing left → 403 (02 §8.2) |
| Schedule | `office_policy` (`fixed` or `assigned_offices`), `office_scope`, `owner_user_id` | Each tick with the owner's current principal; each recipient at delivery and again at open | Pauses with `owner_inactive`, `right_revoked`, `scope_lost` (02 §9.2) |
| Artifact | `run_id`; no scope of its own | Every download | `can_view_run()` + action right at fetch time; expiry |
| Download and notification links | An artifact id or a run id. No token, no scope, no parameter values | When opened | Login, then the checks of the row above |
| Drill | Parent run id and row | At resolution | Parent `can_view_run()`, then full authorisation of the target for the viewer |
| Audit event | `scope` JSON (§6.3) | — | Record only |

`can_view_run(principal, run)`:

| # | Rule |
|---|---|
| V-1 | Same tenant |
| V-2 | The viewer passes `authorize(definition, "run")` now. The requester is checked like anyone else: a right revoked after the run closes the result. 02 §5.4 and row 7 of its §13 exempt the requester's own poll; the rule here is the stricter one (request, §13.3) |
| V-3 | `run.scope_office_ids` ⊆ the viewer's `allowed_offices()`; a tenant-wide run (`NULL`) needs a report-unrestricted viewer (S-3) |
| V-4 | Every data class of the columns stored in the run (`report_runs.blocks`) is in the viewer's profile. Subset, not equality: a viewer with more classes may open a run made with fewer |
| V-5 | The viewer's own restriction decides, not the way the run was made. (a) Provider: if the definition would restrict the viewer — `self_always`, or `self_unless_privileged` and the viewer is not exempt by PR-3 — the viewer passes only when `run.scope_provider_ids` is not NULL and ⊆ `{viewer.provider_link_id}`. An unrestricted run of such a definition is closed to a restricted viewer whoever made it, sent it or scheduled it. This is the predicate of 02 §5.4. (b) User: if the definition has a user restriction and the viewer lacks its exempting class (`payroll_time` for the time-clock reports; none exists for `self_always`), the viewer passes only when `run.scope_user_ids = [viewer.user_id]`. "Rows of other users" is a row rule, so V-4 cannot see it |
| V-6 | The run is not expired and its definition is not disabled |
| V-7 | Runs of definitions in the `audit` family or with key class `user_activity` are never served from the cross-user cache (`cacheable = false`), so each access is its own run and event |

**Result-bearing fields.** `ReportRunRead` (02 §13) has two shapes. Full: after `can_view_run()` passed for the caller.
Reduced: without `title`, `params`, `params_input`, `criteria_echo`, `totals`, `summary`, `warnings`, `blocks`,
`row_count`, `snapshot_row_count`, `patient_count`, `purpose_note`, `error_message` and `artifacts[]`; the definition's
static title stands in for `title`. A run title or criteria echo can hold a patient name, totals and summary cards are
the result itself. Every endpoint that returns a run uses the reduced shape for a caller who does not pass
`can_view_run()`: the run list with `scope=all`, the status of a run whose requester lost the right, the schedule run
history (02 §13 rows 6, 7, 45). Delivery rows (rows 20, 46) name the run by id and by the definition's static title
only.

---

## 5. Data classes

Every served column, hidden column, summary card, chart series and metric carries one `data_class` (02 §3.3; lint in
02 §15.4). The vocabulary below is final and replaces the working vocabulary of [R] `compliance_and_financial_semantics.md`
§3.3 used in the examples of 02.

### 5.1 Vocabulary

| Class | Contains | Does not contain |
|---|---|---|
| `aggregate` | Counts, sums and rates over a group; dimension labels that identify no person (office, procedure code and description, category, carrier, period, status); setup catalog content; a user or provider label used as an operational attribute | Any value on a row that identifies one patient or account. A dimension label that can name a person or a small place: a referral source that is a patient or free text, an employer, `zip5` (rule 13 of §5.2) |
| `phi_identified` | Identity and contact of a patient or responsible party: name, patient id, chart number, date of birth, age, sex, phone, e-mail, address. Service facts on a patient row: date of service, procedure code, tooth, surface, appointment date and status, claim number, patient type, referral source. Non-clinical note fields (appointment note, financial note) | Narrative clinical content; government and payer identifiers |
| `phi_sensitive` | Subscriber or member id, Medicaid id, SSN (last four only, §5.5), driver licence, guarantor employer on a patient row | — |
| `clinical` | Progress-note text, medical alerts and medical-history answers, diagnoses, prescriptions, perio measurements, image references, lab instructions | A procedure code on a ledger row (`phi_identified`) |
| `financial_patient` | Money on a row that identifies a patient, account or claim: charge, payment, adjustment, balance, estimate, write-off, statement amounts, fees of one treatment plan | Money aggregated beyond one account |
| `financial_practice` | Money aggregated beyond one account: totals by office, provider, period, carrier, code or category; KPI values; fee schedules and UCR comparisons; write-off and collection rates | — |
| `provider_comp` | Production, collections or income attributed to a named provider; compensation basis; provider ranking | A provider label on a schedule or appointment list (`aggregate`) |
| `payroll_time` | Time-clock punches and hours of other users | The caller's own punches (always visible to the caller) |
| `payroll_wage` | Pay rate, overtime rate, gross pay | — |
| `payment_instrument` | Check number, bank number, card brand and last four, EFT trace number, EOB number | Full card or account numbers (never stored, never shown) |
| `user_activity` | Audit and exception content: edits, deletes, voids, back-dated and post-close entries, overrides, report access and export logs, sign-in data | The posting user's label on an ordinary transaction row (operational, `aggregate`) |
| `security_users` | What the Security › Users screen holds: user accounts (username, e-mail, role, status, last login), office assignments, provider link, `patient_access_level`, sign-in rules; workforce identifiers such as a provider's tax id and DEA number | Groups and their rights |
| `security_groups` | What the Security › Groups screen holds: groups, group rights, group memberships | User account attributes other than the member's id and label |

Three deliberate differences from the research vocabulary [I]: date of birth is `phi_identified`, because staff verify
identity by name and birth date all day and every legacy patient list prints it (open decision 7); patient-level money
and practice-level money are separate classes, so that a front-desk or treatment-coordinator role can see amounts on a
patient row without receiving practice totals on dashboards; security administration is two classes, one per owning
screen (T-12).

### 5.2 Classification rules for definition and dataset authors

| # | Rule |
|---|---|
| 1 | Classify by the most identifying content the cell can hold. A dataset (03) declares a default class per column; a definition may keep or raise it, never lower it (lint) |
| 2 | Money: if the row carries a patient, account or claim key, shown or hidden, the column is `financial_patient`; otherwise `financial_practice`. Subtotals and totals inherit the class of their column |
| 3 | A row dimension or group key that names a provider in a block with money columns is `provider_comp` (as `provider_name` in the first worked example of 02 §3.11) |
| 4 | Free text is `clinical` (clinical notes) or `phi_identified` (other notes), never `aggregate`. Free-text columns are never sent to the assistant |
| 5 | Key columns: the row dimension, a group key, the patient name of a patient list. A denied key column refuses the run (02 §3.3). Money columns are never key columns: a caller without the money class receives the list without amounts |
| 6 | Hidden id columns (`patient_id`, `account_id`, `claim_id`) carry the class of their entity; without the class the caller gets neither the id nor the drill built on it |
| 7 | When the groups of a summary can be single patients (group by patient or by account), the group key is `phi_identified` |
| 8 | Parameters: a value that identifies a patient or account (`patient_ids`, name ranges, `responsible_party_id`) may be set only with `phi_identified`; `include_wages` and any option that adds wage columns only with `payroll_wage`; otherwise 403 `data_class_denied` at validation |
| 9 | Option sources (04 §13.3): `patients` and `responsible_parties` need `phi_identified`. `users` returns id and label only and needs no class; this settles open decision 7 of 04 §11.7. The option source that 04 names `security_groups` likewise returns id and name only and needs no class; it is not the data class of the same name |
| 10 | Drill targets that open patient rows need `phi_identified`. `kind = record` also needs the feature right of that record, named in `drill_targets[].right_code` (02 §3.9; lint: a `record` target on a ledger, claim or balance entity without a `right_code` fails), and the drill endpoint calls `report_scope.assert_patient_visible()` for the patient behind the record before it returns an id |
| 11 | `daily.progress_notes`: note text is a key column of class `clinical`. `daily.daily_audit` shows only whether a note and a signature exist: `phi_identified`, no `clinical` |
| 12 | A "User" column or "Group by Username" on a transaction report is operational (`aggregate`). The same user on a row about a change, deletion or void is `user_activity` |
| 13 | Dimension labels. Each dimension of the registry (05 §1.5) declares `label_class` and `llm_egress` ∈ `allow`, `alias`, `deny`; the default of an undeclared dimension is `phi_identified` and `deny`. `aggregate` + `allow`: office, office group, period, procedure code and category, coverage category, carrier, plan type, status and bucket dimensions. `aggregate` + `alias`: provider, user. `phi_identified` + `deny`: `referral_source_id` when the source is a patient or free text (`referrals.patient_id` set, lead-source type "Existing Patient", free-text `patients.referred_by` [A] `be_data_patients_clinical.md` §0 findings 8-9), employer, `zip5`, any free-text member. A caller without the label's class receives the member under its neutral label: `source_type_label` for a referral source, the three-digit ZIP area, "Employer" with a count |
| 14 | Custom definitions. The class of a field counts wherever `spec` references it: `columns`, `measures`, `filters`, `group_by`, `sort`, `pivot` (§5.6). A list filtered or ordered by a hidden attribute discloses the attribute |

### 5.3 How a class is granted

`principal.data_classes` = classes granted by rights and roles, minus the ceiling of §4.4. `aggregate` is implicit for any
caller who passed the object right.

| Class | Granted by (any of) | Implicit holders |
|---|---|---|
| `phi_identified`, `phi_sensitive`, `clinical`, `financial_patient`, `payment_instrument`, `user_activity` | The matching `report_data_*` right (§2.2 C) | `REPORT_FULL_ACCESS_ROLES` |
| `financial_practice`, `provider_comp` | `report_data_financial_practice`, `report_data_provider_comp` | `REPORT_FULL_ACCESS_ROLES`; any run or query restricted to the caller's own provider, for that run or query only (PR-6) |
| `payroll_time` | `utilities_time_clock_editor_view_only`, `utilities_time_clock_editor_full_control` (restored) | `REPORT_FULL_ACCESS_ROLES`, `manager` (existing `MANAGER_ROLES` [V] `time_clock_service.py` L102) |
| `payroll_wage` | `report_data_payroll_wage` | `REPORT_FULL_ACCESS_ROLES` (equals the shipped `PAYROLL_ROLES`: `owner`, `admin`, `super_admin` [V] L104); `manager` stays excluded |
| `security_users` | `setup_security_users_screen_view_only`, `setup_security_users_screen_full_control` | `REPORT_FULL_ACCESS_ROLES` |
| `security_groups` | `setup_security_groups_screen_view_only`, `setup_security_groups_screen_full_control` | `REPORT_FULL_ACCESS_ROLES` |

`time_clock_service.caller_access()` is aligned with this table (SEC-19): `can_view_all` and `can_view_wages` are computed
from the class profile, so the Time Clock screen, its legacy routes and the engine definitions give one answer.

### 5.4 Which roles see which class

Target matrix for role templates [I], following the personas of [R] compliance §4.2 rule 5. The migration applies the
mechanical defaults of §2.4; this matrix is the reference for administrators who narrow them afterwards and is printed by
the access rights matrix report (§6.8 #7) as the practice's minimum-necessary documentation.

| Persona | `phi_identified` | `phi_sensitive` | `clinical` | `financial_patient` | `financial_practice` | `provider_comp` | `payroll_time` | `payroll_wage` | `payment_instrument` | `user_activity` | `security_users` | `security_groups` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Owner, administrator | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Office manager | yes | yes | yes | yes | yes | yes | yes | no | yes | S | yes | yes |
| Regional manager | yes | no | no | yes | yes | no | no | no | no | no | no | no |
| Billing, central billing | yes | yes | no | yes | yes | no | no | no | yes | no | no | no |
| Insurance coordinator | yes | yes | no | yes | no | no | no | no | no | no | no | no |
| Front desk | yes | no | no | yes | no | no | no | no | yes | no | no | no |
| Treatment coordinator | yes | no | no | yes | no | no | no | no | no | no | no | no |
| Clinical staff | yes | no | yes | no | no | no | no | no | no | no | no | no |
| Provider | yes | no | yes | yes | own only | own only | no | no | no | no | no | no |
| Payroll | no | no | no | no | no | no | yes | yes | no | no | no | no |
| Compliance, auditor | yes | no | no | yes | no | no | no | no | no | yes | yes | yes |
| Wall display account | no | no | no | no | no | no | no | no | no | no | no | no |

"own only" = satisfied implicitly while a self restriction is active (PR-6), never granted as a code. **S** = only when
the role holds no posting right; otherwise an explicit, recorded decision of the tenant administrator.

A wall-display account holds dashboard rights and no class: aggregate-only tiles with neutral dimension labels (rule 13
of §5.2), no drill to rows. Segregation of duties ([R] compliance §3.3, §4.2 rule 4; CR-17): class `user_activity` and the
`audit` family are not for the users whose postings they review. Three controls, none of them a hard block, because in a
small practice the manager who posts may be the only reviewer besides the owner: the **S** default grants of §2.4; the
conflict list of the readiness report (check (k)) and the "segregation conflicts" format of the access rights matrix
(§6.8 #7), which name every group and user that holds a posting right together with `user_activity` or an `audit` code;
and the patient change log, which stops being a way around the class (§10 D-21).

### 5.5 Masking and fixed transformations

Applied inside the datasets (03), so no class and no output format can undo them.

| Field | Rule |
|---|---|
| SSN | Datasets expose `ssn_last4` only, rendered `***-**-1234`, class `phi_sensitive`. A full SSN is never a report column, filter or search key; `patient_access_ssn_value` does not change that |
| Card and bank data | Only card brand and last four exist (`card_brand`, `card_last4`, DATA-12). Check number, bank number and EFT trace are shown as entered under `payment_instrument` (deposit reconciliation needs them) |
| Subscriber or member id | Full value under `phi_sensitive`; the column is absent otherwise |
| Date of birth | `phi_identified`; `default_visible = false` wherever the report also offers age |
| Secrets | Password hashes, tokens, signature images (`users.signature_data`), `provider_carrier_logins` credentials are not columns of any dataset |
| Free text | Passed through the CSV formula guard (02 §7.4) like any text; never used as a group key |

### 5.6 What happens when a class is missing

| Surface | Behaviour |
|---|---|
| Run | Non-key column: dropped from the query, the snapshot and every export. Key column: 403 `data_class_denied` (02 §3.3) |
| Totals, cards, charts | A dropped column drops its totals and the summary cards and chart series built on it |
| Served definition | The column is absent; `access.hidden_data_classes[]` names the class |
| Drill and actions | Targets and actions that need the class are not offered |
| Dashboard tile, metric point | `status = restricted` (02 §10.1) |
| Saved view | Column keys of a missing class are dropped from `layout` at `resolve` |
| Schedule recipient, shared run | The run contains a class the recipient lacks → `skipped_not_authorized` / 403 (V-4) |
| Custom report | Author (save, publish, preview) and runner (run) are each checked for themselves. Each needs (a) one of the report families of the dataset: every dataset (03) declares `report_families[]`, the families whose standard reports print its rows, for example `rpt_ar_open_items` → `monthly`, `management` and `rpt_ledger_entries` → `daily`, `ledger`, `monthly` (the lists are fixed by 03); (b) the class of every field `spec` references in `columns`, `measures`, `filters`, `group_by`, `sort` or `pivot`. A missing class on a displayed, non-key column drops the column (02 §11). A missing class on any other reference — a fixed filter, a group key, a sort key, a pivot field — is 403 `data_class_denied`, never a silent drop: a patient list filtered by a medical alert the runner may not see would disclose the alert. Runtime filter parameters follow 02 §3.2 (hidden and forced to the disabled value) |
| Assistant | The tool result carries `restricted`; the model is told the value is not available to this user |

### 5.7 Suppression

| # | Rule | Applies to | Threshold | Result |
|---|---|---|---|---|
| SC-1 | Peer privacy | Provider-restricted callers (PR-8) | A mean: `min_peer_group` = 5 other contributing providers, the caller not counted. A median or quartiles: `min_peer_group_quantiles` = 10 | Point `status = suppressed` |
| SC-2 | Small patient cells | Every value sent to an LLM vendor (§9) and any output prepared for a recipient outside the organisation. Not applied to workforce viewers inside the tenant ([R] compliance §8.3) | A cell built from 1 to 10 distinct patients (`small_cell_min_patients` = 11), plus the totals from which it could be derived | `suppressed` |
| SC-3 | Office comparison | Offices of one organisation are compared by name (PD-13); cross-organisation output is out of scope | — | — |

---

## 6. Audit

### 6.1 Principles

| # | Principle |
|---|---|
| A-1 | Report activity is recorded in its own append-only store, `report_audit_events` (NEW). It is not `audit_logs` (generic mutation log [V] `app/db/models/audit.py`) and not the dataset `rpt_audit_events` (03 §2.27, changes to business records, source of the legacy Audit Trail) |
| A-2 | Two steps, as 02 §6.3 builds it. (1) The transactional write is a `report_audit_outbox` row, inserted in the same `SessionLocal` transaction as the state change it describes (terminal run update, artifact status, download count, delivery row, schedule, share or access change). Its `payload` holds every column of §6.3 that is not a column of the outbox itself; this is the writer contract of `app/reports/audit.py`. (2) The drain — tick step 6 and a best-effort call after commit (02 §9.3, ENG-58) — copies rows into `report_audit_events` in the same database: one transaction per batch inserts the events with their `outbox_id` and sets `drained_at`. `outbox_id` is unique in the store, so a repeated drain inserts nothing; `occurred_at` is the outbox row's `created_at`. The existing writers swallow failures [V] `audit_service.py` L57-59, `print_service.py` L336-338; that is not acceptable for report egress |
| A-3 | Fail closed for PHI. When the outbox row of an event with `has_phi = true` cannot be committed, the state transaction fails as a whole and nothing is served: the run is not `succeeded`, the artifact not `ready`, the download does not start (503 `audit_unavailable`). For a definition with a PHI class the patient manifest is part of success: no manifest, no `succeeded` run (02 §4.1 step 12, §6.3) — there is no state in which a PHI result can be viewed without its patient list. Read-type calls that return PHI without a state change (a live page, a legacy feed page, a metric query whose result holds a class other than `aggregate` or `financial_practice`) commit their outbox row in a short transaction before the response. Best effort: `dashboard.view`, `metric.query` with only `aggregate` and `financial_practice` values, `report.denied`, `artifact.purge` |
| A-4 | The generic `AuditMiddleware` row for engine POSTs stays as a pointer: handlers call `audit_context.record(resource_id=<run_id>, office_id=…)` (02 §1.3 C16); the engine event is the authority (02 §18.1 R11). No parameter values go into `audit_logs.details` |
| A-5 | The store is PHI (patient ids, parameters). Reading it is a report run of the `audit` family and is itself audited |
| A-6 | `print_service.record_print` stays for the patient documents that are outside the catalog (02 §14) and gains `office_id` (SEC-22) |

### 6.2 Events

| `event_type` | Emitted when | Patient data | Write |
|---|---|---|---|
| `report.run` | A run reaches `succeeded`, `failed` or `cancelled`; also a cache hit or an attach (`cache_hit = true`) | Run manifest when `patient_count > 0` | With the terminal `report_runs` update |
| `report.view` | Rows of a run are read: once per viewer and run per 15 minutes (02 §6.2); always on the first read by someone other than the requester; whenever a page read passes a further 1,000 stored rows of the run (a test on `after` and `size`, so paging through a 50,000-row snapshot leaves at most 50 more events); for each page of a `live` definition. `details{after, max_row_no}` records how far the viewer read. Also written with `object_type = feed` by each page of a legacy patient feed until it is wrapped (D-03, D-04) and by a cross-patient list read of D-29 | Reference to the run manifest; a live page references its manifest part (02 §6.3) and carries its patient count; a feed page carries its exact ids in `details.patient_ids` (page size ≤ 200) | Before the response |
| `report.drill` | A drill is resolved | `details{drill_key, target_report_key or entity, record_id}` | Before the response |
| `report.export` | An artifact becomes `ready` | Manifest reference (§6.4) | With the artifact status update |
| `report.download`, `report.print` | Each fetch of `GET /reports/artifacts/{artifact_id}/download` (`intent=print` → print) | Artifact reference | Committed before the first byte |
| `report.deliver` | Each recipient and channel of a delivery, with its final status (`sent`, `failed`, `skipped_empty`, `skipped_not_authorized`, `skipped_inactive`) | Run reference | With the `report_deliveries` row |
| `report.action` | A row or bulk action is handed to its feature | Exact entity ids in `details` up to 500, above that count and digest | Before the hand-off |
| `report.denied` | A refusal by `authorize()`, scope or class resolution or `can_view_run()`; `outcome` = `denied` or `shadow_denied` | — | Best effort |
| `report.schedule.created`, `.updated`, `.paused`, `.resumed`, `.deleted`, `.taken_over`, `.run_now` | Schedule lifecycle; `details{before, after}` with recipients added and removed | — | With the change |
| `report.share.created`, `.updated`, `.revoked`, `.visibility_changed` | Share list replaced; visibility or organisation default changed (saved views and custom definitions) | — | With the change |
| `report.run.pinned`, `.unpinned`, `.legal_hold_set`, `.legal_hold_cleared`, `.purged` | Retention changes; manual purge | — | With the change |
| `artifact.purge` | The purge job removed rows and files (02 §6.3) | Counts | Best effort, retried |
| `report.definition.published`, `.archived`, `.version_changed` | Custom-definition lifecycle; at start-up, a standard definition whose `definition_version` differs from the last recorded one (`details{old_hash, new_hash}`) | — | With the change |
| `report.settings.changed` | `PATCH /reports/settings`, security settings of §7.2 | — | With the change |
| `dashboard.view`, `metric.query` | One per dashboard load, one per direct metric query (02 §10.3). A tile that returns patient rows is not covered by `dashboard.view`: it is a run with its own event (§3.3 rows 58-61) | Aggregate, no manifest | Best effort while every value is `aggregate` or `financial_practice`. A query sliced by provider or user (`provider_comp`, `user_activity`, `payroll_time`) is committed before the response |
| `assistant.question`, `assistant.tool_call`, `assistant.answer` | §9 | — | Question event committed before any vendor call |
| `disclosure.recorded`, `disclosure.amended`, `disclosure.suspended`, `disclosure.accounting_provided` | §6.5 | Disclosure rows | With the change |
| `access.grant.changed` | A write changes what a user may see in reports: group rights, group membership, `user_offices`, `users.role`, `users.is_active`, `report_access_provider_id`, `patient_access_level`. `details{subject_type, subject_id, field, before, after, added[], removed[]}` | — | In the transaction of the write, fail closed (SEC-21) |
| `audit.seal.created`, `audit.integrity.failed` | §6.7 | — | Sealer |

Changes to user privileges are mutations of other features and keep their generic `audit_logs` row, but that store
swallows write errors, has no hash and no retention [V] `audit_service.py` L57-59. They are therefore also recorded as
`access.grant.changed` in the report audit store, through the outbox, in the transaction of the write. The writers are
the group-rights service (`PUT /user-groups/{group_id}/rights` records no before and after values today [V]
`group_rights_service.py` L52-81), the Users service, the office-assignment service and the membership CRUD
(`users.role` is the path to `owner`, which holds every class). The access change log (§6.8 #8) reads these events;
`rpt_audit_events` supplies the history from before SEC-21.

### 6.3 Table `report_audit_events`

NEW, model `app/db/models/report_audit.py`, writer `app/reports/audit.py` (02 §2). Naive-UTC timestamps as everywhere.
Rows are inserted by the outbox drain only (A-2); every column except `id`, `outbox_id`, `occurred_at`, `stored_at` and
`event_hash` arrives in the outbox row or its `payload`.

| Column | Type | Content |
|---|---|---|
| `id` | BIGINT identity, PK | |
| `outbox_id` | BIGINT NOT NULL UNIQUE | `report_audit_outbox.id` of the row this event was copied from: exactly-once drain, and the link the verifier follows |
| `event_uid` | UUID NOT NULL UNIQUE | `uuid7()` set by the writer; makes a retried write idempotent |
| `tenant_id`, `actor_tenant_id` | INTEGER NOT NULL; INTEGER NULL | Data tenant; token tenant when different (`super_admin` with `X-Tenant-ID`, a support access marker — the generic middleware records only the token tenant [V] `middleware/audit.py` L66) |
| `occurred_at`, `stored_at` | TIMESTAMP NOT NULL each | `occurred_at` = `created_at` of the outbox row: the database clock of the state transaction. `stored_at` = the clock of the drain transaction; the sealer waits 10 minutes after it, so that no slower drain can still commit a lower id |
| `event_type`, `outcome` | VARCHAR(40), VARCHAR(16) NOT NULL | §6.2; `success`, `denied`, `shadow_denied`, `failed`, `cancelled`, `skipped` |
| `user_id`, `run_as_user_id` | INTEGER NULL | Actor (NULL = system: tick, purge, sealer); schedule owner |
| `actor` | JSON NOT NULL | `{role, group_ids[], group_names[], full_access, enforced}` at the time of the event |
| `source` | VARCHAR(12) NOT NULL | `ui`, `schedule`, `drill`, `action`, `api`, `assistant`, `system` (values of `report_runs.source` plus `system`) |
| `working_office_id` | INTEGER NULL | The validated `working_office_id` of the request body (02 §4.1); on legacy routes the validated `X-Office-ID` |
| `ip_address`, `user_agent`, `request_id`, `session_jti` | VARCHAR(64), VARCHAR(255), VARCHAR(64), VARCHAR(64) NULL | `client_ip_ctx` (first forwarded hop, not the socket peer the middleware stores [V] `middleware/audit.py` L71), `user_agent_ctx`, `request_id_ctx`, token `jti` |
| `object_type`, `object_key` | VARCHAR(20) NOT NULL; VARCHAR(120) NULL | `report`, `dashboard`, `metric`, `feed`, `saved_view`, `schedule`, `artifact`, `custom_definition`, `settings`, `assistant`, `access`, `disclosure`, `audit`; key or id |
| `report_key`, `definition_version` | VARCHAR(120), INTEGER NULL | |
| `run_id`, `artifact_id`, `schedule_id`, `delivery_id` | UUID, UUID, INTEGER, BIGINT NULL | References without foreign keys: the event outlives the run row (02 §6.3) |
| `params` | JSON NULL | The normalised `report_runs.params` on `report.run`; other events reference the run |
| `scope` | JSON NULL | `{office_ids, all_offices, office_group_id, provider_ids, user_ids, data_classes, office_attribution, provider_attribution, date_basis}` |
| `scope_office_ids` | INTEGER[] NULL (`JSON().with_variant(ARRAY(Integer), "postgresql")`) | The resolved office set of the event, for the predicate of §4.1 S-14. `NULL` = tenant-wide run or an event without an office set. When no scope was resolved (a denial before scope, a schedule or share change) the writer stores `[working_office_id]` if one is known |
| `row_count`, `patient_count` | INTEGER NULL | Detail rows; distinct patients |
| `data_classes_present`, `has_phi`, `has_sensitive` | JSON NULL; BOOLEAN NOT NULL; BOOLEAN NOT NULL | Classes of the columns actually in the output; `has_phi` = any of `phi_identified`, `phi_sensitive`, `clinical`, `financial_patient`, `payment_instrument` is present; `has_sensitive` = `phi_sensitive` is present |
| `manifest_run_id`, `manifest_sha256` | UUID NULL; CHAR(64) NULL | Key and digest of the `report_patient_manifests` row (02 §6.3) that lists the patients: the event's own run, or the executor for a follower. Manifests are not artifact rows (§6.4) |
| `output_format`, `size_bytes`, `artifact_sha256`, `watermark_id` | VARCHAR(8), BIGINT, CHAR(64), VARCHAR(40) NULL | Export, download, print |
| `recipient_user_id`, `recipient`, `channel` | INTEGER NULL; JSON NULL; VARCHAR(8) NULL | Internal recipient; declared external recipient `{name, organization, address}`; `in_app`, `email` |
| `purpose_code`, `purpose_note` | VARCHAR(40) NULL; TEXT NULL | §7.2 |
| `cache_hit`, `duration_ms` | BOOLEAN NULL; INTEGER NULL | |
| `reason_code` | VARCHAR(60) NULL | `error_code` of the run, or the denial code with `details.required_any_of` |
| `details` | JSON NULL | Event-specific |
| `event_hash` | CHAR(64) NOT NULL | SHA-256 of the canonical JSON of all other columns except `id` |

Indexes: `(tenant_id, occurred_at)`; `(tenant_id, user_id, occurred_at)`; `(tenant_id, report_key, occurred_at)`;
`(tenant_id, event_type, occurred_at)`; `(run_id)`; `(artifact_id)`; partial `(watermark_id) WHERE watermark_id IS NOT
NULL`; GIN on `scope_office_ids` (built-in array operator class; PostgreSQL only). Volume estimate [I]: 2,000 runs,
3,000 views and 3,000 dashboard loads a day for a 15-office organisation → about 3 million rows a year, around 1 GB; no
partitioning at the start, revisit above 20 million rows.

### 6.4 Patient manifest

| Topic | Rule |
|---|---|
| Content | Every distinct patient id present in the snapshot: all blocks, hidden columns included; taken from columns with `entity = patient` and the dataset `patient_column` (02 §3.3, §4.2) |
| Storage | As 02 §6.3 and §7.5: one row of table `report_patient_manifests` per run (`run_id` PK without a foreign key, `tenant_id`, `storage_backend`, `bucket`, `object_key`, `part_count`, `patient_count`, `sha256`, `retention_until`) and the object `report-audit/{tenant_id}/{yyyy}/{mm}/{run_id}.manifest.json.gz`. A manifest is **not** a `report_artifacts` row. Content: `{run_id, tenant_id, report_key, definition_version, generated_at, patient_count, patient_ids[]}` sorted ascending. `report_patient_manifests.sha256` and `report_audit_events.manifest_sha256` hold the digest of the stored bytes; `retention_until` follows §6.6 |
| Per artifact | An export, print, download or delivery event references the run manifest (`manifest_run_id`) when the artifact holds at least one detail row with a patient entity. `summary_only` shapes, summary formats and outputs without a patient column have `manifest_run_id = NULL` and `patient_count = 0`. Over-inclusion is allowed (a `current_view` export of a filtered grid references the whole run manifest); under-inclusion is not |
| Exact set | A disclosure (§6.5) and every `report.action` need the exact set: computed from the rendered rows or the selection |
| Part of success | For a definition with a PHI class a run without a stored manifest is not `succeeded`: it fails with `audit_unavailable` (02 §4.1 step 12, §6.3; A-3). No result is viewable, exportable or deliverable without its patient list, so no separate gate on artifacts exists |
| Patient → access lookup | NEW table `report_audit_patient_index`: `tenant_id` INTEGER; `run_id` UUID; `part_no` SMALLINT (0 for a snapshot run, the manifest part number for a live page); `patient_count` INTEGER; `patient_ids` INTEGER[] (`JSON().with_variant(ARRAY(Integer), "postgresql")`); `has_egress` BOOLEAN NOT NULL DEFAULT false; `created_at` TIMESTAMP; primary key `(created_at, run_id, part_no)`; GIN index on `patient_ids` (built-in array operator class, no extension); range-partitioned by month on `created_at` (PostgreSQL declarative partitioning; the tick creates the next two partitions; the purge drops a whole expired partition; the SQLite unit tier uses a plain table). One row for **every** run and live page with `patient_count > 0`, written with the manifest. `has_egress` is set with the first `report.export`, `report.print`, `report.download`, `report.deliver` or `report.action` event of the run. The table is a derived look-up, rebuilt from manifests and events if lost; it is not part of the sealed record |
| What it answers | `patient_ids @> ARRAY[:id]` on the partitions of the date range, joined to the events by `run_id`: who ran or viewed a report that contained patient X (`report.run`, `report.view`), and which files and deliveries contained them (`has_egress`). Both are index look-ups, not scans of manifest objects: at the volume of §6.3 a 366-day search would otherwise open about 730,000 objects |
| Bulk runs | A run with more than 50,000 patients gets no index row; the patient access report lists such runs separately as "bulk runs to check" with their manifest reference |
| Size [I] | 2,000 runs a day × 200 patients ≈ 150 million ids a year: about 0.6 GB of arrays plus a GIN index of the same order per year, on the shared instance (R-7). Measured on `golden_large` in SEC-29 |
| Live definitions | No snapshot; every page writes a manifest part (`….p<n>.json.gz`, 02 §6.3) and its own index row and `report.view` event |
| Retention | As audit events (§6.6); never purged with the run (02 §6.3) |
| Write-once | Manifests and seal anchors must be immutable for the retention period: a separate bucket `GCS_BUCKET_REPORT_AUDIT` with a bucket retention policy (recommended), or per-object retention on the reports bucket (open decision 8; provisioning in ENG-46) |

### 6.5 Disclosure log and accounting of disclosures

Internal viewing by workforce is a use, not a disclosure, and stays in the audit events. A disclosure row is written when
data leaves the organisation ([R] compliance §6.2). Schedules and deliveries reach internal users only (02 §9.1), so until
external-viewer accounts exist (open decision 9) a disclosure enters the log in one of two ways.

| Source (`report_disclosures.source`) | When | Who | Patient set |
|---|---|---|---|
| `export_dialog` | At the artifact request: the dialog asks "Is this file for someone outside the organisation?"; a yes makes recipient name, organisation and purpose mandatory (§7.2 trigger `external`) | The exporting user | The exact patients of the rendered rows |
| `recorded_later` | Any time afterwards, for a file that already exists: handed to a board, an insurer or a court later, or sent to the wrong party. NEW `POST /reports/disclosures` with `{run_id \| artifact_id, recipient{name, organization, address}, purpose_code, purpose_note, disclosed_at, patient_ids?}` (API row requested from 02, §13.3) | A holder of `reports_disclosures_manage` | `patient_ids` when given (each must be in the run manifest), else the whole run manifest |

| Table (NEW) | Columns |
|---|---|
| `report_disclosures` | `id` BIGINT PK; `tenant_id`; `source` VARCHAR(16); `disclosed_at` TIMESTAMP; `recorded_by_user_id`; `audit_event_uid` UUID (the `disclosure.recorded` event; its id in the store exists only after the drain); `run_id` UUID NULL; `artifact_id` UUID NULL; `recipient_name` VARCHAR(255); `recipient_organization` VARCHAR(255) NULL; `recipient_address` VARCHAR(500) NULL; `description` VARCHAR(500) (report title and data classes); `purpose_code` VARCHAR(40); `purpose_note` TEXT NULL; `is_accountable` BOOLEAN; `patient_count` INTEGER; `created_at` |
| `report_disclosure_patients` | `disclosure_id` FK, `tenant_id`, `patient_id`; PK `(disclosure_id, patient_id)`; index `(tenant_id, patient_id)` |
| `report_disclosure_amendments` | `id` BIGINT PK; `tenant_id`; `disclosure_id` FK; `field` VARCHAR(40) (`purpose_code`, `suspended_until`, `recipient_name`, `recipient_organization`, `recipient_address`); `old_value` TEXT NULL; `new_value` TEXT NULL; `reason` TEXT NOT NULL; `user_id`; `created_at`. Append-only. The effective value of a field is its latest amendment, else the original row |

A disclosure row is never updated (§6.7). Reclassifying a past delivery, for example to `impermissible` after an
incident, and setting or lifting a suspension required by an oversight or law-enforcement agency ([R] compliance §6.1) are
amendments: NEW `POST /reports/disclosures/{disclosure_id}/amendments` `{field, new_value, reason}`, right
`reports_disclosures_manage`, events `disclosure.amended` and, for `suspended_until`, `disclosure.suspended`. The
`is_accountable` column holds the value at recording; the accounting report derives it again from the effective
`purpose_code`.

| `purpose_code` | Accountable (45 CFR 164.528 via [R] compliance §6.1) |
|---|---|
| `treatment`, `payment`, `operations`, `individual_request`, `authorization` | No |
| `public_health`, `health_oversight`, `legal_process`, `law_enforcement`, `research`, `required_by_law`, `other` | Yes |
| `impermissible` | Yes; set by an amendment or by a `recorded_later` row (incident handling), never offered in the export dialog |

Rows are written for every purpose, accountable or not, so a rule change is a filter change. The accounting report
(§6.8 #5) lists the accountable rows of one patient for a date range of up to six years, using the effective values
after amendments, collapses repeated disclosures to the same recipient and purpose (first date, count, last date),
leaves out rows under an active suspension (the copy the practice keeps notes that suspended rows exist; the copy for
the patient does not) and emits `disclosure.accounting_provided`.

### 6.6 Retention

Six years is the documentation and accounting look-back cited in [R] compliance §5.4; counsel confirms (open decision 8).

| Object | Retention | Mechanism |
|---|---|---|
| `report_audit_events`, `report_audit_seals`, `report_audit_patient_index` | `audit_retention_months`, default and minimum 72 | Purge job deletes whole sealed ranges older than the horizon and drops expired index partitions; nothing else may delete |
| `report_audit_outbox` | 7 days after `drained_at` | Purge step; a row is deletable only when an event with its `outbox_id` exists (§6.7) |
| Patient manifests (`report_patient_manifests` rows and objects) | Same as the events that reference them; `retention_until` is set from `audit_retention_months` | Deleted with their events; bucket retention policy as floor |
| `report_disclosures`, `report_disclosure_patients`, `report_disclosure_amendments` | 72 months from `disclosed_at` | Same purge job |
| Snapshots and artifacts | By retention class of 02 §6.3: `instant` 24 h, `adhoc` 7 days, `scheduled` 30-90 days | 02 purge; `artifact.purge` event |
| Pinned runs (`retention_class = pinned`) | Business records of a close (day sheet, deposit, ageing): 84 months from `finished_at`, then back to `scheduled` and purged | Pin and unpin need `reports_runs_pin` and are audited; the limit is the tenant setting `pinned_retention_months` |
| Legal hold | Until cleared | `reports_administer`, reason mandatory, events `report.run.legal_hold_set` / `.legal_hold_cleared`; a held run blocks the purge of its events and manifest |
| `report_runs` rows | 400 days (02 §6.3) | The audit event is the durable record |
| `audit_logs` (existing) | No purge exists today [A]; must not be purged before 72 months, because the legacy Audit Trail reads it | SEC-33 adds the policy; index `(tenant_id, created_at)` comes with DATA-36 (03 §8) |
| Assistant questions, tool calls, answers | As audit events | Stored in `details` |

### 6.7 Tamper evidence

| Layer | Design |
|---|---|
| Row immutability | PostgreSQL trigger on `report_audit_events`, `report_audit_seals`, `report_disclosures`, `report_disclosure_patients`, `report_disclosure_amendments`: `UPDATE` always raises; `DELETE` raises unless the session set `rpt.audit_purge = 'on'` and the row is older than the retention horizon. The SQLite unit tier has no trigger; the PostgreSQL tier tests it |
| Outbox | The same trigger family covers `report_audit_outbox`, where an event waits between the state transaction and the drain: `UPDATE` may change `drained_at` only, from NULL to a value; `DELETE` raises unless an event with that `outbox_id` exists. An event can therefore not be removed or rewritten before it reaches the store |
| Row hash | `event_hash` computed by the drain from the outbox payload; a changed row no longer matches |
| Seals (P1, SEC-26) | NEW table `report_audit_seals`: `id`, `tenant_id`, `seal_no`, `from_event_id`, `to_event_id`, `event_count`, `events_digest` (SHA-256 over the `event_hash` values in id order), `prev_seal_hash`, `seal_hash`, `sealed_at`, `anchor_object_key`. A step of the 5-minute tick, which exists from P0 (02 §9.3, ENG-58), seals all events stored more than 10 minutes ago (`stored_at`) that are not sealed yet; a deleted or altered event breaks its seal, a removed seal breaks the chain. Seals ship with the first PDF and XLSX exports, not with schedules |
| External anchor (P2, SEC-27) | Each seal is also written as a small object under `report-audit/{tenant_id}/seals/{seal_no}.json` in the write-once location of §6.4, so a database-level edit cannot rewrite both sides |
| Verification | Nightly job recomputes digests of the last 35 days and the whole chain of seal hashes, and checks the outbox: every row with `drained_at` has exactly one event with its `outbox_id`, and no row is undrained for more than 15 minutes (alert of 02 §16.3). A mismatch, a missing event or an event that appears inside an already sealed id range emits `audit.integrity.failed` and an operations alert. The integrity report (§6.8 #9) shows the last result |
| Role separation | Optional hardening: the audit tables owned by a second database role, the application role holding `INSERT` and `SELECT` only (open decision 10). The trigger and the seals are the baseline because each client database has one application role today |
| Clock | Database `now()`; Cloud SQL time is the reference for every event |

### 6.8 Audit reports the module offers

All are engine definitions, so they have criteria, scope, export and their own audit events. Keys are provisional until
the catalog documents fix them.

| # | Report (`report_key`) | Legacy | Source | Right and key class | Phase | Limits to state on the output |
|---|---|---|---|---|---|---|
| 1 | Audit Trail (`management.audit_trail`) | yes | `rpt_audit_events` (03 §2.27, DATA-36) | `management` family; `user_activity` | P2 | Criteria per legacy: office or group, user, updated-date range, patient, Audit Type, Module Type; the option lists of the two dropdowns are unknown (04 §11.1). Nothing predates the migration; no before / after for charge writes until DATA-14; logins and reads are not in `audit_logs` |
| 2 | Daily Audit (`daily.daily_audit`) | yes | `rpt_visit_audit()` (03 §2.17, DATA-18) | `daily` family; `phi_identified` | P1 | A visit-completeness report, not a user-activity log; depends on the visit-code flags of DATA-04 |
| 3 | Special Transaction Report (`daily.special_transaction_report`) | yes | `rpt_ledger_entries` | `daily` family; `phi_identified`, `financial_patient` | P1 | Payment and adjustment codes of migrated rows only after DATA-12 |
| 4 | Report access log (`management.report_access_log`) | NEW | `report_audit_events` | `audit` family; `user_activity` | P1 | Office rule S-14. Filters: user, report, event type, date range, office, output format, `has_phi`, `has_sensitive`, external recipient, `watermark_id`; formats `detail`, `export_summary` (exports, downloads and deliveries by user with patient counts) and `downloads_by_watermark` (every `report.download` and `report.print` of one file, by user) |
| 5 | Accounting of disclosures (`management.accounting_of_disclosures`) | NEW | `report_disclosures`, `report_disclosure_amendments` | `audit` family; `phi_identified` | P2 | One patient, up to six years; single-patient rule S-10 (c); §6.5 |
| 6 | Patient report access (`management.patient_report_access`) | NEW | `report_audit_patient_index` joined to `report_audit_events` by `run_id` | `audit` family; `phi_identified`, `user_activity` | P2 | One patient, at most 366 days per run; office rule S-14. Lists who ran or viewed a report containing the patient and every export, print, download, delivery and action; "bulk runs to check" separately (§6.4). An index search, inside the background budget of 02 §15.6 |
| 7 | Access rights matrix (`management.access_rights_matrix`) | NEW | `user_groups`, `user_group_rights`, `permissions`, `user_group_memberships`, `user_offices`, `users` | `audit` family; `security_users`, `security_groups` | P2 | Organisation-level (S-10 b). Formats: group × report family and action; group × data class; effective access per user (rights, classes, offices, provider link); **segregation conflicts** (groups and users that hold a posting right together with `user_activity` or an `audit` code). The minimum-necessary document of the practice |
| 8 | Access change log (`management.access_change_log`) | NEW | `access.grant.changed` events of `report_audit_events`; `rpt_audit_events` for writes before SEC-21 | `audit` family; `security_users`, `security_groups`, `user_activity` | P2 | Organisation-level (S-10 b). Before and after values exist from SEC-21 on |
| 9 | Audit integrity check (`management.audit_integrity`) | NEW | `report_audit_seals`, the outbox backlog and the last verification result | `audit` family; `user_activity` | P2 | Organisation-level (S-10 b) |
| 10 | Transaction exceptions (`management.transaction_exceptions`) | NEW | `rpt_audit_events`, `rpt_ledger_entries_all`, close and lock tables (DATA-13, DATA-14, DATA-29) | `audit` family; `user_activity`, `financial_patient` | P2 → P4 | Formats: deleted and voided transactions, changed transactions, back-dated entries, post-close corrections, adjustments and refunds by user ([R] compliance §27.3). Columns are specified by the catalog; each format ships when its data item ships |
| 11 | Access readiness (`management.report_access_readiness`) | NEW | `report.denied` events, the output of the grant script (§2.5 step 4), groups, memberships, `user_offices`, `users` | `audit` family; `security_users`, `security_groups` | P0 | Organisation-level (S-10 b). The checks (a) to (k) of §3.5 step 4 |

The security lists of the legacy menu (User List, Group List, Group Rights List, User-Group Membership) are ordinary
`lists.*` definitions with the `lists_security` family and the key class of their screen (`security_users`,
`security_groups`, §2.3); they never include `users.signature_data` (§10 D-13).

---

## 7. Export, download and delivery controls

### 7.1 Controls

| # | Control | Rule |
|---|---|---|
| X-1 | One pipeline | Every file of report data is a `report_artifacts` row rendered from the run snapshot (02 §7). Print is the PDF artifact fetched with `intent=print`. No browser-built export and no `window.print()` of a grid for a report with a PHI class |
| X-2 | Authorised twice | At request (action right, §3.2) and at every download (`can_view_run()` and the action right at fetch time, §3.3 rows 15 and 18) |
| X-3 | Login-gated | `GET /api/v1/reports/artifacts/{artifact_id}/download` needs the bearer token in the `Authorization` header; the frontend fetches a blob (02 §7.6). No token, signature or parameter value is ever part of a URL. Reports get no URL token of the kind imaging uses (`make_asset_token`, [A] `be_platform.md` §1.2) |
| X-4 | Transport | Default `REPORT_DOWNLOAD_URL_MODE = proxy`. Mode `signed` (60-second V4 URL minted after authorisation, 02 §7.6) is allowed only for artifacts with `has_sensitive = false` outside the `audit` family; the URL is never stored, logged or mailed. Row and download responses carry `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`; `Content-Disposition: attachment`, `inline` only for print |
| X-5 | Expiry | An artifact lives as long as its run's retention class (02 §6.3), then 410 `artifact_expired`. A link never outlives its artifact |
| X-6 | Watermark | Each artifact gets `watermark_id` = `W` plus 12 Crockford base-32 characters (60 random bits), stored on `report_artifacts.watermark_id` and on the `report.export` event; the report access log resolves it. PDF: the attribution line on every page — organisation, report title, generated at (reference time zone), generated by (`user_label`), `watermark_id`, and "Contains protected health information" when `has_phi` (02 §7.2). XLSX: the same line in the header block and as workbook properties. CSV: in the header block when `include_header_block` is on, and always in the file name. Limit: the watermark names the person who generated the file, not the person who holds a copy — every recipient of a delivered or shared run downloads the same artifact. A leaked copy is narrowed to a recipient through the `report.download` events of that `watermark_id` (report access log, format `downloads_by_watermark`), not through the file itself |
| X-7 | Encryption | In transit: TLS on every hop. At rest: private bucket with uniform bucket-level access and default server-side encryption ([R] compliance §7); customer-managed keys only when a client contract asks for them (provisioning, ENG-46). Snapshot rows live in the client database; its at-rest encryption is a platform setting that cannot be verified from the repository. No file-level password: the writer libraries do not encrypt, and a shared password protects little |
| X-8 | Column parity | A class-filtered column is not in the snapshot, so no file can contain it; columns the user hid are not serialised (02 §7.1) |
| X-9 | Spreadsheet safety | CSV formula guard always on (02 §7.4); XLSX with `strings_to_formulas: False` and `strings_to_urls: False` (02 §7.3) |
| X-10 | Copy from the grid | "Copy all rows" is not offered for a block with a PHI class; the user is pointed to Export, which is audited. Ordinary cell selection cannot be prevented and no control is claimed for it |
| X-11 | Local copies | The export dialog states that a downloaded file is outside system control and shows the watermark id |
| X-12 | Delivery targets | Internal users and groups only (02 §9.1). Each recipient passes `can_view_run()` at delivery and again at open. Statements sent to patients are patient correspondence, not report delivery (02 §14) |
| X-13 | Volume watch | Alerts (SEC-31): a user above `daily_export_patient_alert` distinct patients exported in one day; a user above `daily_view_patient_alert` distinct patients **viewed** on screen in one day (union of the indexed patient sets of the runs the user ran or paged, §6.4 — paging a large snapshot is an export by hand); the first export of a `phi_sensitive` column by a user; exports outside the office hours of the working office; five denials in ten minutes; a `run_id_conflict` |

### 7.2 Bulk, sensitive and external exports

NEW table `report_security_settings`, one row per tenant, read and changed through `GET, PATCH /reports/settings` as the
nested object `security` (right `reports_administer`; every change emits `report.settings.changed`).

| Column | Default | Meaning |
|---|---|---|
| `audit_retention_months` | 72 (72..120) | §6.6 |
| `pinned_retention_months` | 84 | §6.6 |
| `bulk_export_patient_threshold` | 500 | Distinct patients in one artifact from which an export counts as bulk |
| `bulk_export_requires_right` | `false` | When true a bulk export needs `reports_export_bulk`; otherwise 403 `bulk_export_not_permitted` |
| `purpose_required_for` | `["bulk", "sensitive", "audit", "wage", "external"]` | Triggers that demand a purpose |
| `daily_export_patient_alert`, `daily_view_patient_alert` | 5000, 10000 | X-13 |
| `min_peer_group`, `min_peer_group_quantiles`, `small_cell_min_patients` | 5 (minimum 3), 10, 11 | PR-8, SC-1, SC-2 |
| `step_up_minutes` | 0 (off) | SEC-32 |
| `assistant_enabled`, `assistant_vendor`, `assistant_vendor_attested_by`, `assistant_vendor_attested_at`, `assistant_phi_questions` | `false`, NULL, NULL, NULL, `refuse` | §9 |
| `updated_by`, `updated_at` | | |

| Trigger | Condition | Required |
|---|---|---|
| `bulk` | Artifact `patient_count` ≥ `bulk_export_patient_threshold` | `purpose_code` and a `purpose_note` of at least 10 characters |
| `sensitive` | The output holds a `phi_sensitive` column | `purpose_code` |
| `audit` | Definition of the `audit` family, or key class `user_activity`, `security_users` or `security_groups` | `purpose_code` |
| `wage` | The output holds a `payroll_wage` column | `purpose_code` |
| `external` | The requester declares a recipient outside the organisation | `purpose_code`, recipient name and organisation; a `report_disclosures` row is written (§6.5) |
| Schedule | A schedule on a definition with any PHI class | `report_schedules.purpose_note` at creation |

`purpose_code` values are those of §6.5 without `impermissible`. For a run with `render_output = true` the purpose travels in
`ReportRunRequest.purpose_code` / `purpose_note` and is stored on `report_runs` (02 §5.2, §13 row 5). An artifact requested
later has no purpose field in 02: this document requests `purpose_code`, `purpose_note` and
`external_recipient{name, organization, address}` on the body of `POST /reports/runs/{run_id}/artifacts`, outside
`options_hash` (§13.3). A missing purpose is 422 `purpose_required` with `details.triggers[]`; the frontend opens the prompt
and repeats the request. The purpose is recorded on the `report.export` event.

Approval by a second user is not built in P0-P3 [I]. If a client requires it, it becomes a gate before download (a
`report_export_approvals` table), not a new artifact status.

### 7.3 E-mail, notifications, URLs and file names

| Item | Rule |
|---|---|
| E-mail | Plain text through `send_email(to, subject, body)` (02 §9.2). Variables allowed in subject and body: organisation name, schedule name, the definition's static title, period label, generated time, the link. Never `report_runs.title` (a title template can include a patient name), never a row value, a count per patient, an attachment or a storage URL (PD-12). `send_email` writes recipient and subject to the log, and the whole body when no transport is configured [V] `app/integrations/email.py` L189, L196 — one more reason the content is fixed |
| In-app notification | Same allow-list for `notifications.title` and `body` (02 §5.7); `ref_type = 'report_run'`, `ref_id = <run_id>` |
| Link | `{APP_BASE_URL}/reports/runs/{run_id}`: an application route with an id. Opening it requires login and passes `can_view_run()` |
| Names typed by users | Saved-view, schedule and custom-report names are staff-facing labels and do appear in mail. The forms say "do not enter patient information"; the server validates length only |
| File names | `<report_key>_<date_from>_<date_to>_<watermark_id>.<ext>`: the scheme of 02 §7.5 plus the watermark id; no patient, account or user value |
| Logs | Structured log lines of runs carry ids, counts and durations (02 §16.1), never parameter values of a PHI class; `report_runs.diagnostics` stores bound parameter shapes, not values (02 §16.2) |
| Test | One unit test renders every mail and notification template against a fixture whose run title, parameters and rows contain marker strings and asserts that none appears (SEC-25) |

### 7.4 Retention, purge and legal hold

Periods are in §6.6. Rules for files: purge runs inside the tick and emits `artifact.purge`; the lifecycle rule on the
`reports/` prefix is the backstop (02 §6.3); the bucket soft-delete window is set to 0 days for `reports/` on purpose
(the platform default keeps deleted objects for seven days, [R] compliance §7), so that purged means gone; a pinned run is
a business record of a close and follows `pinned_retention_months`; a legal hold (`reports_administer`, reason mandatory)
suspends every purge of that run, its artifacts, its manifest and its events. At contract end the client database and
its buckets are exported or destroyed as one unit (SEC-35); because each organisation has its own database and buckets
[A] `be_platform.md` §8, no shared mart holds another copy. The one shared store is Redis: the client's keys under its
`REDIS_NAMESPACE` (`rptv:*`, `rptm:*`, locks, §7.5) are deleted in the same step, by prefix, never by flushing a
`REDIS_DB` index that another client could share.

### 7.5 Shared Redis

Facts [V]: all clients use one Memorystore instance without AUTH on the shared VPC; a client is separated from the others
only by its `REDIS_DB` index, a number written by hand into its configuration file (code default 0); every client
database starts at `tenant_id = 1` and `user_id = 1`. Two clients on one index — a registry mistake, or more clients than
indexes — share every key built from tenant and user ids. 02 puts three things there: metric responses
(`rptm:{tenant_id}:…`), data-version markers (`rptv:{tenant_id}:…`) and the caller profile
(`rptc:{tenant_id}:{user_id}`, 02 §5.4).

| # | Rule |
|---|---|
| RC-1 | No authorisation state in Redis: no rights, classes, office sets or caller profile. The profile comes from PostgreSQL; the only cache allowed is the process-local one of §3.1. `rptc` is dropped (request to 02, §13.3): with it, user 7 of one client could be served the rights and offices of user 7 of another |
| RC-2 | Every key the module writes or reads — `rptm:*`, `rptv:*`, single-flight locks, admission counters, and the legacy `report:*` keys once ENG-16 touches them — starts with `REDIS_NAMESPACE` (the client slug of 02 §12.4, ENG-56). While it is unset outside `ENV = dev`, the metric cache, the run-cache markers and the counters stay off, as publishing already does |
| RC-3 | A cached value is self-describing: `{namespace, tenant_id, scope_hash, payload}`. A reader discards it unless all three equal its own request. A wrong key can then cost a recomputation, never a disclosure |
| RC-4 | Only aggregate metric responses are cached (02 §10.3): no report rows, no patient-level value, and no parameter value in a key (keys hold hashes) |
| RC-5 | NEW `scripts/check_client_configs.py`, run in the deploy workflow over `deploy/clients/*.env.yaml` (the per-client files of the onboarding runbook [V] `NEW_CLIENT_DATABASE.md` L255-270; the directory is not in the repository yet): fails when two clients share `(REDIS_HOST, REDIS_DB)` or a `REDIS_NAMESPACE`, when a client has no namespace, when `ALLOW_SIGNUP` is true, when `REPORT_RIGHTS_ENFORCED=false` comes without a future `REPORT_RIGHTS_SHADOW_UNTIL`, or when `REPORT_UNGATED_OFFICE_ACCESS=true` comes with `REPORT_RIGHTS_ENFORCED=true` |
| RC-6 | Test (SEC-45): two service instances configured as two clients on **one** Redis index and separate databases never read each other's metric response, marker or counter |

Not solved here: the instance has no AUTH and no in-transit encryption, so any workload on the VPC can read every
client's keys, including the platform's own (refresh-token store, balance cache, messaging). That is risk R-13.

---

## 8. Sharing of saved views and schedules: whose rights apply

A share of a saved view, a run or a schedule transfers criteria or a pointer, never access. A share of a custom
definition is one of three keys the runner needs — visibility, the `custom` family and a report family of the dataset
(§5.6) — and is never sufficient alone.

| Object | Who acts | Whose rights, classes and scope apply | Checked | If the check fails |
|---|---|---|---|---|
| Private saved view | Owner | The owner's, now | At `resolve` and at run | Ids dropped with `notices[]`; 403 when nothing is left (02 §8.2) |
| Saved view shared with a user, a group or the organisation | The person applying it | That person's; the owner's scope is irrelevant | At `resolve` and at run | Same |
| Organisation default view | Any user | That user's | Same | The definition defaults are used |
| Favorite, recent | — | Pointers only | — | Greyed when the catalog no longer lists the object for the user |
| Schedule, `scope_mode = owner` | The tick | The owner's rights, classes and scope as of the tick (`build_principal(owner)`) | Every tick | Pause with `owner_inactive`, `right_revoked` or `scope_lost`; holders of `reports_schedules_manage_all` are notified (02 §9.2) |
| Schedule recipients | Delivery | Each recipient's own: `can_view_run(recipient, run)` | At delivery and at open | `skipped_not_authorized`; the owner is told. A recipient never sees more than they could run themselves in that scope |
| Schedule, `scope_mode = per_recipient` (P4, ENG-52) | The tick | Each recipient's own principal; one run per distinct `scope_hash` | Every tick | That recipient is skipped |
| Schedule taken over | Holder of `reports_schedules_manage_all` | The new owner's from then on | At take-over and every tick | Refused when the new owner fails action `schedule` on the report |
| Finished run sent to colleagues | Sender | Sender: `reports_share` and `can_view_run()`. Recipients: `can_view_run()` | At send and at open | Recipient skipped |
| Cache hit or attach | Any caller | Equal `scope_hash`, then `can_view_run()` | Every lookup | A new run |
| Artifact of a run | Any viewer | The viewer's `can_view_run()` and action right | Every download | 403 |
| Drill from a shared run | Viewer | The viewer's, on the target | At resolution | Target not offered |
| Shared custom definition | Runner | The runner's own: `custom` family, a report family of the dataset, office scope, and the class of every field `spec` references. The author's rights and classes were checked at save and publish and are not lent to anyone | Every run | A displayed non-key column of a missing class is dropped; any other missing right or class is 403 |
| Dashboard and saved layout | Viewer | The viewer's | Every data call | Tile `restricted` |
| Assistant | Asking user | The asking user's principal on every tool call | Every tool call | Value `restricted` |
| Run history with `scope=all`; schedule run history | Holder of `reports_runs_view_all`; schedule owner or manager | The reduced run shape of §4.5; every result-bearing field needs `can_view_run()` | Every list call | Reduced shape |
| Supplied `run_id` | Any caller of `POST /reports/runs` | An existing run is returned only to its own requester for the same `report_key` and `params_hash` (§3.3 row 5) | Every create | 409 `run_id_conflict` |

| # | Rule |
|---|---|
| SH-1 | A saved view whose `params` hold a patient-identifying value key (`patient_ids`, a patient or responsible-party name range, `responsible_party_id`) cannot be `visibility = organization` and cannot be an organisation default. It can be shared with named users or groups; a grantee without `phi_identified` gets those keys dropped at `resolve` (`reference_removed`) |
| SH-2 | Share targets are users and groups of the same tenant (`report_shares`, 02 §8.1). A share to someone without the report right is stored and simply never lists for them |
| SH-3 | Permission `edit` lets a grantee change `params` and `layout`; ownership, visibility and the share list stay with the owner |
| SH-4 | Deactivating a user: private views stay with the inactive owner; shared views keep working; schedules pause (`owner_inactive`). The Users deactivate path calls the schedule service (SEC-25) |
| SH-5 | No public or anonymous link exists for any object. External viewers are not part of P0-P5 (open decision 9) |
| SH-6 | A run executes with the principal of its schedule owner or, in `per_recipient` mode (P4), of the recipient it is delivered to; nobody else's. A holder of `reports_schedules_manage_all` who is not the owner may pause, resume and delete a schedule and change its recipients, but not what it runs: a change of `report_key`, `params`, `office_policy`, `office_scope`, `output_formats`, `scope_mode` or `condition` by a non-owner is refused until that person has taken the schedule over. Otherwise a manager could have chosen criteria executed under the owner's rights and attributed to the owner in the audit trail. Take-over changes the owner, visibly, with `report.schedule.taken_over` |
| SH-7 | A schedule is a standing use of PHI: definition version, column profile (`saved_view_id`), recipients and purpose are fixed at creation; changing any of them is `report.schedule.updated` with before and after values ([R] compliance §3.2) |

---

## 9. The assistant and any LLM use

No model is called in P0-P4. Reports, exports, schedules and dashboards never depend on one.

| # | Rule |
|---|---|
| L-1 | Off by default. `report_security_settings.assistant_enabled` can be set only after `assistant_vendor_attested_by` / `assistant_vendor_attested_at` record who confirmed that a business associate agreement covers the configured vendor route and the features used |
| L-2 | Tools only: `MetricQueryRequest` execution and catalog look-ups (02 §13 row 64, ENG-55). No SQL, no tool that returns report rows, no patient look-up tool (PD-14) |
| L-3 | Every tool call runs with `build_principal(asking_user, source="assistant")`: the user's rights, office scope, provider restriction and classes. The model cannot obtain a number the user could not see in a report |
| L-4 | May leave our boundary: the question text; metric and dimension metadata (keys, labels, definitions); aggregated tool results that passed the class checks and the suppression rules SC-1 and SC-2; period labels; member labels of dimensions whose registry entry says `llm_egress = allow` (office, period, procedure code and category, carrier, status; rule 13 of §5.2). The gate is the dimension's declaration, not the class of the value: class `aggregate` alone does not make a label safe to send |
| L-5 | Never leaves: patient-level rows; any value of class `phi_identified`, `phi_sensitive`, `clinical`, `financial_patient`, `payment_instrument`, `payroll_wage`, `user_activity`, `security_users`, `security_groups`; free text; ids of patients, accounts or claims; member labels of a dimension with `llm_egress = deny` (referral source, employer, `zip5`, any undeclared dimension) — the model receives the neutral label instead (`source_type_label`). Provider and user labels (`llm_egress = alias`) are replaced by stable aliases (`Provider 1`, `User 3`, …) in the prompt and substituted back on the server |
| L-6 | Question screening. With `assistant_phi_questions = refuse` (default) a question that names a patient is not sent: it is checked against the patient search index, chart-number and date-of-birth patterns, and the user is pointed to patient search. `allow` may be set only on a route attested for PHI in prompts |
| L-7 | Vendor features: only those the vendor lists as covered by the agreement. Never batch processing, file upload, code execution, web fetch or connector features; no tenant data in JSON schemas or tool definitions; no training or fine-tuning on tenant data ([R] compliance §9.2-9.3) |
| L-8 | Vendor-side prompt caching holds only the static, tenant-neutral prefix (tool definitions, standard metric catalog). Our own answer cache key includes tenant, `scope_hash` and the class profile |
| L-9 | The model never computes. Every figure in an answer must equal a value from a tool result of that conversation; a post-check rejects the answer otherwise and a template answer is used |
| L-10 | Output is escaped text plus references to metrics and reports. No HTML, no link other than application routes built by the server, and no action is executed from model output: no schedule, share or export |
| L-11 | Audit: `assistant.question` (question text, user, scope, vendor, model id) is committed before the vendor call; `assistant.tool_call` per call (request JSON, point statuses, digest of the result); `assistant.answer` (answer text, token counts, outcome). They follow §6.6 and appear in the report access log. The question is treated as PHI-bearing |
| L-12 | Limits: daily question quotas per user and per organisation, a token and step budget per question, timeouts, and a kill switch independent of the reports flags |
| L-13 | One provider interface (`app/analytics/assistant/provider.py`, NEW), so that a change in vendor terms is a configuration change. Each route is an entry in the risk analysis and asset inventory with the data it can reach ([R] compliance §9.1) |
| L-14 | Other model uses (sentence-to-filters, dashboard narratives, anomaly explanations) follow the same rules: aggregates only, the user's principal, the same audit. Narratives start from templates; a model may only rephrase supplied facts. They are practice-level text and are never stored in a patient record |

| Vendor condition | Evidence required before `assistant_enabled` is set |
|---|---|
| Agreement | Business associate agreement executed for the exact route (first-party API organisation or a cloud provider's managed endpoint) |
| Eligible features | The features used (messages, tool use or structured output, prompt caching) are on the vendor's covered list; every other feature is disabled in code |
| Retention | Vendor retention and abuse-monitoring terms recorded; zero retention where offered |
| Training | Contractual exclusion of training on our data |
| Re-check | Terms re-read at each model or vendor change and at least yearly; they change often ([R] compliance §9.2, §30.1) |

---

## 10. Existing security defects to fix before the module ships

Defects marked [I] were derived from the code and not exercised (static work only). "Family" names refer to §2.2 A.

### 10.1 Report-like routes

| # | Defect | Evidence | Fix | Work item |
|---|---|---|---|---|
| D-01 | `GET /reports/summary`, `/trends`, `/accounts-receivable`, `/aging`, `/insurance-verification-summary` need only a token; `office_id` is optional and never validated; omitted = whole tenant | [V] `app/api/v1/reports.py` L26-31, L33-110 | Office rule of §4.1 through `report_scope.resolve_office_set()`; `require_report_access` with the right sets of the table below, field by field; class `financial_practice` for money; `metric.query` audit event. `dashboard_view` alone opens nothing | ENG-16 (P0), accepted by SEC-10 |
| D-02 | The 60-second cache key is `report:{prefix}:{tenant_id}:{office_id or 'all'}:…`: no caller scope, no client namespace, never invalidated | [V] `app/services/report_service.py` L58-60 | Add the `scope_hash` of §4.5 and the `REDIS_NAMESPACE` prefix and value envelope of §7.5 | ENG-16 (P0), SEC-45 |
| D-03 | `/offices/{office_id}/financial-summary`, `/collections`, `/insurance-receivables`, `/adjustment-summary`, `/transactions` and `GET /transactions` check that the office is in the tenant and nothing else | [V] `app/api/v1/transactions.py` L27-31; [A] `be_existing_reporting.md` §1.4 | Path office and `office_id` checked by S-2 — not `assert_office_path_access`, which passes alias holders and callers without assignments [V] L269-274 (02 §14 says the same). Rights: roll-ups per the table below; the two transaction feeds = any of `daily`, `ledger` with classes `phi_identified`, `financial_patient`, and a fail-closed `report.view` event with `object_type = feed` and the page's patient ids, until the feed is an engine definition (P1) | ENG-16 (P0), SEC-10 |
| D-04 | Lab routes (`/appointments/lab-cases` and its `/report.pdf`, `/cost-report`, `/cost-report.pdf`, `/export.csv`) accept any `office_id` and need no right | [V] `app/api/v1/lab_tracking.py` L36-50; [A] same §1.4 | `office_id` checked by S-2; any of `appointment` family, `patient_lab_cases_view_only`, `patient_lab_cases_full_control` (codes exist [V] `access_rights_catalog.py` L266-267). The list writes a feed `report.view` event per page, the three file routes a `report.export` event with the patient ids, both fail closed, until the routes are engine definitions (P3) | ENG-16 (P0), SEC-10 |
| D-05 | `POST /offices/{office_id}/statements/batch` checks the tenant only; no right | [V] `app/api/v1/statements.py` L27, L128-146 | Path office checked by S-2; `statements` Full Control (the route writes statements: action `commit`) | ENG-16 (P0), SEC-10 |
| D-06 | `GET /dashboard/summary` uses `OfficeScopeDep`, but its own `_resolve_targets` passes alias holders and callers without assignments on explicit ids, on a group and on the default set; it needs no right, writes no audit row and has no response model | [V] `app/api/v1/dashboard.py` L30-35, L44-63, L66-109 | `_resolve_targets` replaced by `report_scope.resolve_office_set()`; rights per the table below; `dashboard.view` event | ENG-16 (P0), SEC-10 |
| D-07 | The four patient PDFs (`/patients/{id}/reports/*`) need only a token and skip the chart visibility check; their `PRINT` row has no `office_id` | [V] `app/api/v1/patient_reports.py` L28; `print_service.py` L320-338; [A] `be_existing_reporting.md` §1.4 | Call `assert_patient_visible`; stamp `office_id`. They stay patient documents outside the catalog (02 §14) | SEC-22 (P1) |
| D-08 | Statement, payment-plan contract and coupon, and medical-history PDFs write no `PRINT` row | [A] `be_existing_reporting.md` §1.2 | `record_print` on each | SEC-22 (P1) |

Right sets of the legacy roll-ups. They are the metric-family rule of §2.3 applied to fixed payloads, so that a legacy
route never returns a number the engine would mark `restricted` for the same caller. A field group whose right set or
class the caller lacks is returned as `null` and named in a NEW response field `restricted[]`; the route answers 403
only when the caller holds none of its sets. Payload fields per [A] `be_existing_reporting.md` §1.1.

| Right set | Any of |
|---|---|
| production | `daily`, `monthly`, `analytics_production_dashboard_view` |
| collections | `daily`, `monthly`, `analytics_collections_dashboard_view` |
| A/R | `monthly`, `management`, `analytics_ar_dashboard_view` |
| insurance | `insurance`, `analytics_insurance_dashboard_view` |
| patients / scheduling | `lists_patient`, `analytics_patients_dashboard_view` / `appointment`, `analytics_scheduling_dashboard_view` |

| Route | Field group → right set |
|---|---|
| `/reports/summary`, `/reports/trends` | `production` → production; `collections` → collections; `outstanding_ar` → A/R; `insurance_receivables` → A/R or insurance; `new_patients`, `active_patients` → patients; `scheduled_appointments` → scheduling |
| `/reports/accounts-receivable` | `total_ar`, `patient_ar` → A/R; `insurance_ar` → A/R or insurance (the Setup › Insurance dashboard reads it today [A] `be_existing_reporting.md` §1.2) |
| `/reports/aging` | all fields → A/R |
| `/reports/insurance-verification-summary` | any of `insurance`, `appointments_dps_ins_verification_reports` |
| `/dashboard/summary`, `/offices/{office_id}/financial-summary` | `outstanding_balance`, `patient_balance`, `credit_balance`, `patient_count` → A/R; `insurance_receivable` → A/R or insurance; the `collections` block → collections |
| `/offices/{office_id}/collections`, `/adjustment-summary` | collections |
| `/offices/{office_id}/insurance-receivables` | A/R or insurance |

A front-desk user who holds only the `insurance` family and `dashboard_view` therefore reads insurance receivables and
nothing of production, collections or total A/R, although the default grants give the group class `financial_practice`.

### 10.2 Identity, groups and office assignment

| # | Defect | Evidence | Fix | Work item |
|---|---|---|---|---|
| D-09 | Generic CRUD writes on `user-groups` (create, update, delete) and `user-group-memberships` (create, delete) carry no right: any signed-in user can add themselves to any group of the tenant and inherit its rights [I] | [V] `app/api/v1/registry.py` L1432-1436; write dependencies exist only when `write_permissions` is set, `router_factory.py` L319-341 | Strict gate: role `admin` / `super_admin`, or strict holder of `setup_security_groups_screen_full_control`. `CrudConfig.write_permissions` is not enough because `require_permission` lets a user in no group pass [V] `deps.py` L91-104: add a strict variant | SEC-11 (P0) |
| D-10 | `PUT /offices/{office_id}/users` and `POST /offices/{office_id}/users/copy-from/{source_office_id}` need a token and office path access only; a caller with zero assignments passes path access for every office | [V] `app/api/v1/office_assignment.py` L57-67, L193-201 | Strict gate: `admin`, or strict holder of `setup_security_user_per_office_screen_full_control` (kept right) | SEC-11 (P0) |
| D-11 | Generic CRUD `/user-offices` needs a token only; the model has no `tenant_id`, so reads and writes are not tenant-filtered. A user can add an office assignment for themselves and widen their report scope [I] | [V] `registry.py` L373-374; `app/crud/base.py` L91-94 | Remove the generic write routes (assignments only through the guarded user and office services); filter reads through `offices.tenant_id` | SEC-11 (P0) |
| D-12 | Generic CRUD `/tenants`: list not tenant-filtered, create open | [V] `registry.py` L316-317 | `super_admin` only | SEC-11 (P0) |
| D-13 | `GET /users` and `GET /offices/{office_id}/users` return `signature_data` for every user: the image that signs notes and consents | [V] `app/schemas/auth.py` L51; `office_assignment.py` L188-190 | List responses use a NEW `UserListRead` without `signature_data`; `GET /users/{id}` keeps it for the edit form (`FE:src/services/userApi.ts` L175, L237 read the field). Never a report column (§5.5) | SEC-11 (P0) |
| D-14 | The time-clock service checks `utilities_time_clock_editor_full_control` / `_view_only`, which the curation deleted: the manager right cannot be granted through a group | [V] `time_clock_service.py` L105-106; `access_rights_catalog.py` L246-247 | Restore both codes | SEC-01 (P0) |
| D-15 | `GET /utilities/audit` and `GET /utilities/jobs/{job_id}` are readable by any signed-in user | [V] `app/api/v1/utilities.py` L39-59 | `admin` or the `audit` family | SEC-33 (P2) |
| D-16 | Generic CRUD `/user-preferences`: any user can read and write another user's preference rows through the `user_id` filter [I] | [V] `registry.py` L1430-1431 | Own rows only. Reports store nothing there (02 §8) | SEC-11 (P0) |
| D-17 | A change of group rights leaves no before and after values in the audit row; no privilege change reaches a tamper-evident store | [V] `group_rights_service.py` L52-81; `audit_service.py` L57-59 | Record added and removed codes through `audit_context.record`, and write `access.grant.changed` (§6.2) for rights, membership, office-assignment, role, active-flag, provider-link and access-level changes | SEC-21 (P1) |
| D-27 | `POST /auth/signup` is open: no authentication, creates a tenant and a user with `role = "admin"` in the client database and returns tokens. With D-23 this is a read path into the organisation's fact rows from outside it [I, not exercised] | [V] `app/api/v1/auth.py` L45-53; `auth_service.py` L114-145; `NEW_CLIENT_DATABASE.md` L338-340 ("needs a small `ALLOW_SIGNUP` setting; not built yet") | NEW setting `ALLOW_SIGNUP`, default `false`; `true` is accepted only when `ENV = dev` (start-up validator, as for `SERVICE_ROLE = all` in 02 §12.4). When off, the route answers 404. Before the flag ships, each client database is checked for tenants that are not in the client registry; such a tenant and its users are deactivated and the case is handled as a possible incident | SEC-11 (P0) |
| D-28 | Security data is readable with a token only: `GET /offices/{office_id}/users` returns the full `UserRead` (username, e-mail, role, `patient_access_level`, `report_access_provider_id`, `last_login_at`); the generic `GET /user-groups`, `/user-group-memberships`, `/user-ip-rules` and `/user-offices` have no read gate | [V] `office_assignment.py` L57-67, L188-190; `registry.py` L373-374, L1430-1438; `router_factory.py` L319-324 ("reads do not"); [A] `be_data_identity_setup.md` §1.9 | Existing strict read gate `require_read_access` [V] `deps.py` L107-133: `GET /offices/{office_id}/users` and `/user-offices` → any of the Security Users screen rights or `setup_security_user_per_office_screen_view_only` / `_full_control`; `/user-groups`, `/user-group-memberships` → any of the Security Users or Security Groups screen rights; `/user-ip-rules` → the Security Users screen rights. Only Setup screens call these routes today [V] (FE callers listed in the header). Without this, `lists_security` and the two security classes are advisory | SEC-11 (P0) |

### 10.3 Scope, audit, data exposure, frontend

| # | Defect | Evidence | Fix | Work item |
|---|---|---|---|---|
| D-18 | The alias right `appointments_add_appointment_in_other_office` and the roles `owner` / `manager` make a caller office-unrestricted on report routes: `all_offices`, any explicit `office_ids`, any path office, a whole office group and the no-key default | [V] `office_scope_service.py` L156-160, L172-178, L241-250, L269-274, L277-285, L336-350; `dashboard.py` L44-63 | Rules S-2, S-3, S-5..S-7 through `report_scope.allowed_offices()`; no report surface calls the platform checks | SEC-05 (P0) |
| D-19 | A caller with zero `user_offices` rows is tenant-wide on the same five paths | [V] `office_scope_service.py` L168-178 | Rule S-4; `REPORT_UNGATED_OFFICE_ACCESS` for a client whose assignments are not set up; readiness check (d) | SEC-05, SEC-12 (P0) |
| D-20 | Reads and report calls are not audited; audit writers swallow errors; `audit_logs` has no retention; middleware rows store the socket peer as `ip_address` | [V] `audit_service.py` L19, L57-59; `middleware/audit.py` L45-50, L71; [A] `be_data_identity_setup.md` §2.5 | The audit store of §6; retention policy for `audit_logs` | SEC-08 (P0), SEC-33 (P2) |
| D-21 | `GET /audit-logs` is admin-only with no date range, no action filter and 200 rows per page; `GET /patients/{patient_id}/audit-logs` is open to every signed-in user | [V] `app/api/v1/audit.py` L46-78, L81-122 | Review moves to the audit reports of §6.8; add `created_from`, `created_to`, `action`. The patient change log returns every audited mutation of the patient for all resource types with before and after values and `user_id` — the patient-filtered Audit Trail without the `management` family or class `user_activity`. Fix: a caller without `user_activity` (strict) is limited to `resource_type` in `patient-medical-alerts`, `patient-questionnaire-responses`, `patients`, the three the route itself documents for the Medical History screen [V] `audit.py` L81-122; every other type needs the class | SEC-33 (P2) |
| D-22 | `PatientRead` returns `ssn` to every signed-in user; `ssn` is a patient list filter and a responsible-party search field, so a value can be confirmed by probing | [A] `be_data_identity_setup.md` §7.2 P9; [V] `registry.py` L401, L588 | `PatientRead.ssn` is returned masked (`***-**-1234`) unless the caller strictly holds `patient_access_ssn_value`; the `ssn` list filter and the `ssn` search field are removed (no frontend caller uses them [V], grep of `FE:src`). Datasets expose `ssn_last4` only (§5.5) | SEC-44 (P1) |
| D-23 | Generic list, get and write routes of resources whose model has no `tenant_id` are not tenant-filtered: `patient-procedures`, `patient-payments`, `insurance-claims`, `appointments`, `operatories`, `user-offices` and the other tenant-less tables. Only eight CRUD classes override the filter with a parent join | [V] `app/crud/base.py` L91-94; the models named in the header; [A] `be_platform.md` §1.3, `be_data_identity_setup.md` §6 | P0: a parent-join tenant predicate in `CRUDBase` for every registered resource without `tenant_id` (`patients.tenant_id` through `patient_id`, else `offices.tenant_id` through `office_id`, else the declared parent resource of a child table such as `appointment_procedures` or `payment_allocations`), the pattern of the eight existing `_scope_tenant` overrides; registry load fails for a tenant-less model that declares no parent. P1 / P3: DATA-15 and DATA-46 add the column and the predicate switches to it. Builders never read those lists (02 §4.2) | SEC-42 (P0); DATA-15 (P1), DATA-46 (P3) |
| D-24 | Frontend reports are gated by `isAuthenticated` only; exports of patient rows are built in the browser without an audit row; four CSV writers have no formula guard | [A] `fe_existing_reports.md` §2.7; `fe_report_like_outputs.md` §0 | Hub gated by the server `access` object; client exporters removed | SEC-13 (P0), ENG-20 (P0) |
| D-25 | The frontend treats any role containing the token `owner`, `admin` or `manager` as privileged; the server uses the exact role set | [A] `fe_cross_cutting.md` §8 | The hub takes permitted office modes from the served definition (§3.4) | SEC-13 (P0) |
| D-26 | `hasRight()` grants everything to a user with `permissions_enforced === false` and while the kill switch is off | [V] `FE:src/features/access-control/rights.ts` L27, L70-79 | Not used for report access (§3.4) | SEC-13 (P0) |
| D-29 | Cross-patient lists of money and claim rows need a token only: `GET /patient-procedures`, `/patient-payments`, `/patient-adjustments`, `/insurance-claims` without a patient filter return the rows the six client-side reports are built on, to any signed-in user of an assigned office | [A] `be_existing_reporting.md` §1.3; `fe_existing_reports.md` §2.4 | A list call without a `patient_id`, `account_id` or single-record filter needs a strict read right: the report family that prints the data (`daily` or `ledger`; `insurance` for claims) or the owning screen right (`transactions_transaction_entry_screen_full_control`, `transactions_patient_ledger_screen_full_control`; `transactions_insurance_claims_details_view_only` / `_full_control` for claims — all kept codes [V]), and writes a fail-closed feed `report.view` event with the page's patient ids. Ships after ENG-20 has moved the six reports off these lists; an inventory of the remaining frontend callers is the first task. `appointments` is excluded: the Scheduler reads it all day | SEC-43 (P1) |

---

## 11. Compliance checklist

Requirements CR-01..CR-18 of [R] `compliance_and_financial_semantics.md` §11. "Research priority" is that document's label.

| Id | Requirement | Research priority | Design | Work items | Phase |
|---|---|---|---|---|---|
| CR-01 | One authorisation function for run, view, drill, export, schedule, share and AI; stored results re-authorised against the viewer | P0 | §3.1-3.3, §4.5 | SEC-04, ENG-07 | P0 |
| CR-02 | Data classes on every column and measure; identical masking on screen and in every export | P0 | §5 | SEC-07, ENG-03, ENG-10 | P0 |
| CR-03 | Office and provider scope enforced in the executor and recorded on the run | P0 | §4.1-4.3 | SEC-05, SEC-06, ENG-07, ENG-09 | P0 |
| CR-04 | Audit events for run, view, drill, export, download, print, deliver, schedule, share, denied, with parameters and counts | P0 | §6.2, §6.3 | SEC-08, ENG-14; SEC-25 for deliver and schedule; SEC-17 for share | P0; P1; P2 |
| CR-05 | Patient manifest per exported or delivered artifact | P0 | §6.4 | SEC-09, ENG-14; SEC-29 for the patient index | P0; P2 |
| CR-06 | Tamper-evident append-only audit store, six-year retention, audited read | P0 | §6.6, §6.7 | SEC-08 (append-only triggers on events and outbox, row hash), SEC-26 (seals, verification), SEC-27 (external anchor, write-once), SEC-23, SEC-20 | P0; P1; P2. In P0 the store is append-only without seals, and CSV is the only export; seals arrive in P1 with PDF and XLSX |
| CR-07 | No PHI in e-mail bodies or attachments; app-mediated, short-lived, single-use download links | P0 | §7.1 X-3, X-4; §7.3 | SEC-16, SEC-25, ENG-22, ENG-44 | P1; P2. Proxy mode has no link credential at all, which is stronger than a single-use link; `signed` mode is 60 seconds, not single-use, and restricted (X-4) |
| CR-08 | Generated files encrypted at rest, private, TTL-purged with audit; legal hold | P0 | §7.1 X-7, §7.4, §6.6 | SEC-23, ENG-22, ENG-36 | P1 |
| CR-09 | Disclosure log fed by every external delivery; accounting-of-disclosures report | P1 | §6.5: declared at export or recorded later, amendments for reclassification and suspension | SEC-28 | P2 |
| CR-10 | Report access log report, alert rules, documented periodic review | P1 | §6.8 #4, §7.1 X-13 | SEC-20, SEC-31 | P1; P2 |
| CR-11 | Purpose prompt and optional approval for bulk or sensitive exports | P1 | §7.2 | SEC-16; approval not scheduled (open decision 12) | P1 |
| CR-12 | Watermark or header on every output, resolving to the audit event | P1 | §7.1 X-6 | SEC-16, ENG-23, ENG-27 | P1 |
| CR-13 | Per-patient financial record export within the access deadline | P1 | — | SEC-34 | P2 |
| CR-14 | Cross-tenant benchmarks only from pre-aggregated, small-cell-suppressed facts, with BAA clauses | P1, before any benchmark ships | §5.7 SC-2, SC-3 | None: cross-organisation benchmarking is out of scope (PD-13). SC-2 is the rule to apply when it enters scope | — |
| CR-15 | AI: aggregates only, covered endpoint and features, scope-inheriting tool calls, prompt logging | P1, before any AI ships | §9 | SEC-41, ENG-55 | P5 |
| CR-16 | MFA or step-up for export and audit-report access; idle timeout on viewers | P2 | §7.2 `step_up_minutes` | SEC-32 | P2 |
| CR-17 | Segregation: `user_activity` not visible to the users under review | P1 | (a) §2.4: `report_data_user_activity` and the `audit` codes are default-granted only to groups without a posting right; the others are listed as conflicts for an explicit decision. (b) §6.8 #7: "segregation conflicts" format of the access rights matrix. (c) §10 D-21: the patient change log no longer returns other resource types without the class. A conflict that the administrator accepts is recorded, not blocked | SEC-02, SEC-12 (a); SEC-30 (b); SEC-33 (c) | P0; P2; P2 |
| CR-18 | Return or destroy path for artifacts, marts and caches at off-boarding | P2 | §7.4 | SEC-35 | P2 |

SOC 2 evidence asked for in [R] compliance §10 comes from the same items: role × class matrix and effective access
(SEC-30), access-change events (SEC-21), export and delivery events (SEC-08, SEC-25), alert history (SEC-31), versioned
definitions (`report.definition.*`, SEC-40), artifact lifetimes and purge events (SEC-23), disclosure records (SEC-28).

---

## 12. Work items

Sizes: S up to 2 days, M up to 1 week, L up to 2 weeks (brief §4). `ENG`, `DATA`, `FLT`, `MET`, `DASH`, `UX`, `RPT` are the
areas of the other documents. ENG-07 (`authorize()`), ENG-14 (audit hooks, manifest) and ENG-16 (legacy routes) implement
the rules of SEC-04..SEC-09 inside the engine; FLT-17 (My Reports provider restriction) builds on SEC-06. Ids are stable
identifiers, not an order: the table is sorted by phase.

| ID | Title | Phase | Size | Depends on | Acceptance check |
|---|---|---|---|---|---|
| SEC-01 | Rights catalog revision 2: restore 6 codes, add 41, deactivate 13; handover files, tests, Alembic data revision | P0 | M | — | 410 rows and 397 active on a fresh seed and on an already curated database; a second run changes nothing; the time-clock editor right can be granted to a group |
| SEC-02 | Rule-based default grants (`scripts/seed_report_rights.py`) and non-destructive `seed_groups` | P0 | M | SEC-01 | On the unmodified seed the 13 groups hold exactly the column "Unmodified seed" of §2.4 on top of what they held. On a fixture where Clinical lost `reports_daily_reports_screen_full_control` the script grants Clinical no production or collections dashboard right; a tenant-created group that holds `daily` gets the derived classes; no group with a posting right receives `report_data_user_activity` or an `audit` code; re-running `seed_permissions` with groups removes nothing |
| SEC-03 | Rights registry `app/reports/rights.py` with start-up check | P0 | S | SEC-01 | A definition that names an unknown or inactive code fails the lint; the family table equals §2.2 A; every right that lists a metric family carries a `provider_restriction` |
| SEC-04 | `ReportPrincipal`, decision rules of `authorize()`, `access_for()`, error contract | P0 | M | SEC-03 | The table of §3.2 passes as a parametrised test: View Only, Full Control, `commit`, two-key actions, formats checked at run creation and schedule change, any-of families, full-access roles, role `manager` without groups, users in no group |
| SEC-05 | Report-mode office rule: `report_scope.allowed_offices()` and `resolve_office_set()` on every report surface (S-2..S-7, S-10, S-13, S-14) | P0 | M | — | An alias holder, a caller without assignments and a `manager` assigned to one office each get 403 for an unassigned explicit `office_ids`, for `/offices/{unassigned}/financial-summary`, for an office group outside their assignments and for `all_offices`; their no-key run resolves to their assigned offices (403 without any); `REPORT_UNGATED_OFFICE_ACCESS` restores the tenant-wide default for the caller without assignments only; the time-clock report and `/dashboard/summary` give the same answers; no report code path calls `validate_target_office`, `assert_office_path_access`, `require_all_offices`, `resolve_list_office_filter` or `can_view_all()` (lint) |
| SEC-06 | Provider and user restriction (PR-1..PR-10, UR-1..UR-4, V-5) | P0 | M | SEC-04, ENG-09; `scope.user_restriction` and `report_runs.scope_user_ids` in 02 (§13.3) | Invariant R6 of 02 §15.3 holds for a restricted provider. With the Doctor preset: amounts appear in `my_reports.production_report` and values on the Provider Dashboard; an unsliced `net_production` query equals the provider's own value; no response of the test set equals an office total or lets another provider's value be derived. An unrestricted run of a restricted definition is closed to a restricted viewer; a time-clock run made without `payroll_time` stores `scope_user_ids` and is not served to another user. An unlinked user gets 403 `report_provider_not_linked` |
| SEC-07 | Data classes: vocabulary, grants, patient-access ceiling, classification lint, dimension label classes | P0 | M | SEC-03, ENG-03 | Every column of every registered definition has a class of §5.1; dropping is identical on screen, CSV, XLSX and PDF; `patient_access_level = none` and any unmapped value yield aggregate-only results; a dimension without `label_class` is served under its neutral label |
| SEC-08 | Audit store `report_audit_events`: table, outbox payload contract, drain, immutability triggers on events and outbox, fail-closed rule | P0 | M | ENG-12, ENG-14, ENG-58 | Each P0 event of §6.2 is an outbox row of the state transaction and one event after the drain (`outbox_id` unique; a repeated drain adds nothing); `UPDATE` and `DELETE` fail on PostgreSQL for events, and for outbox rows except `drained_at`; a forced outbox failure returns 503 and serves no rows |
| SEC-09 | Patient manifest rules | P0 | S | SEC-08, ENG-13, ENG-57 | Manifest ids equal the patients of the snapshot; a PHI run whose manifest cannot be stored is not `succeeded`; events carry `manifest_run_id` and the digest held in `report_patient_manifests` |
| SEC-10 | Security acceptance for the legacy report routes (D-01..D-06) | P0 | S | SEC-04, SEC-05, ENG-16 | On every listed route a restricted user gets 403 for an unassigned office and a user without a right set gets 403. The field table of §10.1 holds: a user with only `insurance` and `dashboard_view` receives `null` and `restricted[]` for production, collections and total A/R. Each page of the transaction feeds and of the lab list writes a feed `report.view` event with its patient ids before the response. Cached values never cross `scope_hash` |
| SEC-11 | Close the open door and the identity defects (D-09..D-13, D-16, D-27, D-28) | P0 | L | — | Anonymous `POST /auth/signup` answers 404 on a client deployment and the service refuses to start with `ALLOW_SIGNUP=true` outside `ENV = dev`; every client database holds only its registered tenants. A non-administrator cannot create or delete a group, a membership, an office assignment or a tenant, nor read or write another user's preferences, nor read `GET /offices/{office_id}/users`, `/user-group-memberships`, `/user-ip-rules` or `/user-offices` without the screen right. No list response contains `signature_data` |
| SEC-12 | Shadow grace list, readiness report `management.report_access_readiness`, rollout runbook | P0 | M | SEC-04, SEC-08 | In shadow a would-be family refusal on an eligible surface yields a `shadow_denied` event and a normal response; a non-administrator still gets 403 on `PATCH /reports/settings`, on the readiness report, on another user's private saved view and on any object outside `SHADOW_ELIGIBLE`; no class outside `SHADOW_CLASS_CEILING` is added; past `REPORT_RIGHTS_SHADOW_UNTIL` the service enforces; `ENFORCED=false` with `SHADOW=false` is refused outside `ENV = dev`. The report lists the checks (a) to (k) of §3.5 |
| SEC-13 | Frontend gating from the server `access` object | P0 | S | UX, ENG-05 | A View Only user sees Export disabled with a reason; an empty catalog shows the request-access state; no `useRights()` call decides report access |
| SEC-14 | Security test suite and fixtures: non-admin principals, two tenants, scope × right × class matrix | P0 | M | ENG-17 | Tests of 02 §15.7 and the V-rules run in CI; a router test proves every `/reports` and `/analytics` route depends on `get_report_principal`. A second user who sends another user's `run_id` gets 409 `run_id_conflict` and no run data; a requester whose right was revoked gets the reduced run shape; the `scope=all` list and the schedule run history contain no result-bearing field of a run the caller may not view |
| SEC-42 | Tenant predicate on the generic routes of tenant-less resources (D-23, P0 part) | P0 | M | — | Two-tenant test on PostgreSQL: a caller of tenant B, role `admin`, gets no row and 404 by id from `/patient-procedures`, `/patient-payments`, `/insurance-claims`, `/appointments`, `/operatories` and `/user-offices` of tenant A, and cannot write to them; registry load fails for a tenant-less model without a declared parent; list latency on `golden_large` is unchanged within 10 % |
| SEC-45 | Redis isolation of report caches (§7.5) and the client configuration check | P0 | S | ENG-56 | Two service instances configured as two clients on one Redis index never read each other's metric response, marker or counter; no key holds rights, classes or offices; with `REDIS_NAMESPACE` unset outside `ENV = dev` the caches stay off; `scripts/check_client_configs.py` fails on a shared `(REDIS_HOST, REDIS_DB)` |
| SEC-15 | `report_security_settings` and the `security` block of `/reports/settings` | P1 | S | ENG-36 | The block is returned; a PATCH without `reports_administer` is 403; each change emits `report.settings.changed` |
| SEC-16 | Export controls: watermark id, attribution line, file names, response headers, purpose prompt, bulk threshold, export notice | P1 | M | ENG-22, ENG-23, ENG-27, SEC-15, UX | Every PDF page and XLSX header shows the watermark id and the id finds the export event; a bulk export without purpose is 422 `purpose_required`; downloads carry `Cache-Control: no-store` |
| SEC-17 | Saved-view sharing rules (SH-1..SH-3) and share events | P1 | S | ENG-28 | A view with `patient_ids` cannot be published to the organisation; a grantee gets ids outside their scope dropped with a notice; each share change has an event |
| SEC-18 | Dashboard and metric authorisation: metric-family rule, grant-path rule (PR-10), class-degrading tiles, patient tiles as runs, peer suppression SC-1 | P1 | M | ENG-32, ENG-33, MET, DASH, SEC-06 | A user without `financial_practice` gets `restricted` money tiles and values elsewhere; `dashboard_view` alone serves no tile; a provider who holds only self-restricted rights receives the own value for an unsliced query and for every `dashboards.main` tile, and no response of the test set equals an office total; a tile that returns patient rows has a `report.run` or live-page event with a manifest and is refused without the report family; a query sliced by provider or user is not answered when its event cannot be committed; a peer mean needs 5 other providers and a median 10, else `suppressed` |
| SEC-19 | Time clock and wage classes: `caller_access()` aligned with §5.3; the user restriction decided by the engine (UR-2) | P1 | S | ENG-34, SEC-06, SEC-07 | Engine output equals `GET /reports/time-clock` for manager, non-manager and wage cases; a group with the restored editor right sees all users; `include_wages` without `payroll_wage` is 403; a run by a caller without `payroll_time` carries `scope_user_ids` and the builder receives that user id |
| SEC-20 | Report access log (`management.report_access_log`) | P1 | M | SEC-08, ENG-10 | Filters by user, report, event type, date, format, `has_phi`, watermark id; a restricted viewer sees only events of the own offices (S-14); running it writes its own `report.run` event; the `export_summary` format totals patients per user; `downloads_by_watermark` lists every download of one file |
| SEC-21 | Access change events and before and after values for rights administration | P1 | S | SEC-08 | Group-rights, membership and office-assignment writes and changes of `users.role`, `users.is_active`, `report_access_provider_id` and `patient_access_level` write `access.grant.changed` with before and after values in the transaction of the write, and a write whose event cannot be stored fails; `audit_logs.details` carries the same values |
| SEC-26 | Audit seals and nightly verification | P1 | M | SEC-08, ENG-58 | The tick seals events stored more than 10 minutes ago; altering or deleting a sealed event in a test database, or deleting an undrained outbox row, makes the verification emit `audit.integrity.failed`; seal hashes chain |
| SEC-43 | Cross-patient list reads of money and claim resources (D-29) | P1 | M | ENG-20, SEC-08 | `GET /patient-procedures`, `/patient-payments`, `/patient-adjustments` and `/insurance-claims` without a patient, account or record filter answer 403 to a caller without a listed right and write a feed `report.view` event with the page's patient ids otherwise; every remaining frontend caller is inventoried and still works for its screen's users |
| SEC-44 | SSN in the patient API (D-22) | P1 | S | — | `PatientRead.ssn` is masked for a caller without `patient_access_ssn_value`; `GET /patients?ssn=` and the `ssn` search field of `/responsible-parties` no longer filter; the patient screen still shows the full value to a holder of the right |
| SEC-22 | Print audit completeness for patient documents (D-07, D-08) | P1 | S | — | Statement, payment-plan and medical-history PDFs write a `PRINT` row; every `PRINT` row carries `office_id`; the four patient PDFs call `assert_patient_visible` |
| SEC-23 | Retention policy: pin, legal hold, purge evidence, bucket soft-delete window | P1 | S | ENG-36, SEC-15 | Pin and unpin need `reports_runs_pin` and emit events; a held run survives the purge with its manifest and events; a purged object cannot be restored from the bucket |
| SEC-24 | Security review of the P1 definitions (Daily, Ledger, My Reports, Statements) | P1 | M | RPT, SEC-07 | Each definition has a reviewed family, restriction and class per column; every `my_reports.*` definition passes the lint of UR-4 for every `report_by` option; `my_reports.missing_progress_notes` lists only the linked provider for a restricted caller; a View Only holder of `statements` cannot run the `statements` format |
| SEC-25 | Schedule and delivery controls: purpose note, owner and recipient checks, non-owner change rule, template PHI test, user-deactivation hook | P2 | M | ENG-43, ENG-44 | A schedule whose owner lost the right pauses at the next tick; an unauthorised recipient is skipped and logged; a holder of `reports_schedules_manage_all` who is not the owner gets 403 on a change of `params` or `office_scope` until take-over; a schedule with a format its owner may not export is refused at creation; the template test finds no marker string; deactivating a user pauses their schedules |
| SEC-27 | Write-once storage for manifests; external seal anchors; integrity report | P2 | M | ENG-46, SEC-09, SEC-26 | The application's service account cannot delete or overwrite a manifest or seal object before its retention date; every seal has its anchor object; `management.audit_integrity` shows the last verification and the outbox backlog |
| SEC-28 | Disclosure log, later recording, amendments and the accounting-of-disclosures report | P2 | M | SEC-16, SEC-08 | A declared external export writes one `report_disclosures` row and the exact patient rows; `POST /reports/disclosures` records a disclosure for an existing artifact with the manifest as patient set; a reclassification to `impermissible` and a suspension are amendments and no disclosure row is ever updated; the accounting report uses the effective values, collapses repeats and records that it was provided |
| SEC-29 | Patient access index and the patient report access search | P2 | M | SEC-09, ENG-38 | The index has a row for every run and live page with patients; for a fixture patient the search returns every run and view and every export, print, download and delivery that contained them; the 366-day search for one patient finishes inside the background budget on `golden_large`; runs above 50,000 patients are listed as bulk runs; a backfill from stored manifests fills earlier runs |
| SEC-30 | Audit Trail security profile, access rights matrix with segregation conflicts, access change log, rights of the exception reports | P2 | M | DATA-36, SEC-21, RPT | `management.audit_trail` refuses a caller without `user_activity`; the matrix equals the catalog and group tables of the fixture and its conflict format lists a fixture group that posts and holds `user_activity`; a rights change appears with before and after values |
| SEC-31 | Alerts on audit activity (X-13) | P2 | M | ENG-47, SEC-08, SEC-29 | Each rule fires in a drill, the viewed-patients rule included, and notifies the holders of `reports_audit_reports_full_control` and the users with a role in `REPORT_FULL_ACCESS_ROLES` |
| SEC-32 | Step-up re-authentication and viewer idle policy | P2 | M | SEC-15 | With `step_up_minutes > 0` a bulk export, an `audit` family run and a settings change require a password re-check valid for that long; without Redis the re-check is required every time |
| SEC-33 | Audit read hardening: `/audit-logs` filters, patient change log by class, utilities audit gate, `audit_logs` retention policy | P2 | S | DATA-36 | `GET /audit-logs` accepts `created_from`, `created_to`, `action`; `GET /patients/{patient_id}/audit-logs` returns only the three Medical History resource types to a caller without `user_activity`; `/utilities/audit` needs `admin` or the `audit` family; a written policy forbids purging `audit_logs` before 72 months |
| SEC-34 | Per-patient financial record export | P2 | M | RPT, SEC-16 | One audited artifact with ledger, claims, statements and payment-plan schedule of a patient, purpose `individual_request` |
| SEC-35 | Tenant off-boarding path | P2 | S | ENG-46 | The runbook exports or destroys the client database, the report and audit buckets and the client's Redis keys; a dry run on a test client leaves nothing |
| SEC-36 | Worklist and bulk-action authorisation | P3 | S | ENG-49 | Each action checks its feature right strictly and the `read_only` rule; every hand-off has a `report.action` event with the exact ids; `export_selection` is refused to a View Only user and passes the purpose and bulk rules like any export; a provider with only `my_reports` sees and signs the own notes in the unsigned-notes worklist |
| SEC-37 | Security review of the P3 definitions; security lists; single-patient and referral scope | P3 | M | RPT, SEC-07 | User List refuses without `security_users`, Group List and Group Rights List without `security_groups`, User-Group Membership without both; `office_mode = none` appears only on the definitions of S-10 (a) to (c); `lists.patients_notes` answers 403 `patient_not_in_office` for a patient the caller cannot open; a receiving office reads its incoming rows of Internal Referral Management and no other office's (S-13) |
| SEC-38 | Privacy rules for scorecards and office comparison | P4 | M | ENG-51, DASH | Ranking and percentile tiles follow PR-8 and SC-1; a restricted provider sees their own value, a peer mean from 5 other providers and a distribution from 10, and `suppressed` below |
| SEC-39 | Per-recipient schedules and alert conditions | P4 | S | ENG-52 | One run per distinct `scope_hash`; a condition is evaluated on the recipient's scope and reveals nothing outside it; the owner's run history shows delivery status only for runs made with another recipient's scope |
| SEC-40 | Builder guardrails and definition change audit | P5 | M | ENG-53, ENG-54 | An author cannot save a spec on a dataset none of whose report families they hold, nor one that references a field of a class they lack; a runner who holds `custom` and a share but no report family of the dataset gets 403; a fixed filter, group key or sort on a field of a class the runner lacks is 403 `data_class_denied`, a displayed non-key column of that class is dropped; `visibility = organization` needs `reports_share_organization`; publish and archive emit `report.definition.*` |
| SEC-41 | Assistant controls (§9) | P5 | L | ENG-55, SEC-15, SEC-18 | With the feature off the endpoint is 404; a question naming a fixture patient is refused; a captured vendor payload holds only aggregates that passed SC-1 and SC-2 and no member label outside the dimensions declared `allow` or `alias` (a patient-named referral source appears as its source type; providers and users as aliases); question, tool calls and answer each have an event |

---

## 13. Risks and open decisions

### 13.1 Risks

| # | Risk | Effect | Mitigation |
|---|---|---|---|
| R-1 | Strict rights refuse users who are in no group (group memberships were not migrated [V]) or in a group without report rights (Doctor, Billing, Claims hold none [V]) | Most non-administrators of a migrated tenant are refused on the first enforced day | Shadow mode, readiness report, presets, per-client flip (§3.5) |
| R-2 | The open signup (D-27), the missing tenant predicate (D-23) or the self-escalation defects D-09..D-11 stay open | Any right can be self-granted, or bypassed from outside the organisation | SEC-11 and SEC-42 are entry conditions for enforcement (§3.5 step 1) |
| R-3 | Re-running the seeder strips non-legacy rights from the 13 named groups | Report rights vanish after an onboarding re-seed | SEC-02, with a test that a re-seed removes nothing |
| R-4 | Classes are assigned by hand on about 130 definitions | A mis-classified column leaks or hides data | Dataset default classes, "never lower" lint, phase reviews SEC-24 and SEC-37, golden tests with a class-less principal |
| R-5 | Mechanical default grants reproduce legacy over-grants (the Time clock only and call-centre groups receive ortho money columns) | More access than a least-privilege review would give | Accepted, to avoid narrowing at cut-over; the access rights matrix makes it visible; presets for narrowing |
| R-6 | Fail-closed audit ties report availability to audit writes and to the manifest store | A failing outbox insert blocks PHI reads; a PHI run cannot succeed while object storage refuses the manifest | The outbox is in the same database and transaction as the state change: no additional dependency there. The manifest dependency is the one of 02 §18.1 R16; aggregate-only definitions are unaffected |
| R-7 | Audit store growth on the shared database instance: about 3 million events a year, and a patient index for every run with patients of about 150 million ids a year with a GIN index of the same order [I] | Storage and index growth; GIN maintenance on a busy table | Views once per 15 minutes plus one per 1,000 rows read, aggregate events without parameters, monthly partitions of the index dropped whole at the horizon, no index row above 50,000 patients, measurement in SEC-29 |
| R-8 | The platform has no MFA, does not audit logins and does not enforce `user_ip_rules`, `user_login_restrictions` or password expiry; the access token lives 60 minutes ([A] `be_data_identity_setup.md` §1.8, `fe_cross_cutting.md` §8) | A stolen session reads reports like its owner | Step-up for bulk and audit actions (SEC-32); the platform gaps are outside this module and belong on the roadmap |
| R-9 | The two user-provider links disagree | A provider sees another provider's numbers | One link by rule (PR-1), readiness check (g) |
| R-10 | The report-mode office rule changes `/dashboard/summary` and the time-clock report, and is enforced from the first deploy | A user loses an all-office view obtained through the alias, zero assignments or role `manager` | Neither route has a frontend caller today ([A] `fe_existing_reports.md` §3.1, `fe_report_like_outputs.md` §3.4); readiness checks (c), (d), (e), (j) name who is affected; `REPORT_UNGATED_OFFICE_ACCESS` for a client without assignments; the Regional manager preset |
| R-11 | Legal inputs are unverified: retention periods, state law, agreement clauses for an LLM route ([R] compliance §30) | Rework of retention or assistant scope | Settings, not constants; counsel review before P1 exit (retention) and before P5 (assistant) |
| R-12 | Names typed by users (views, schedules) can contain patient data and appear in mail | PHI in an e-mail | Form guidance and fixed templates; accepted residual risk (§7.3) |
| R-13 | The shared Memorystore instance has no AUTH and no in-transit encryption; the `REDIS_DB` index is assigned by hand [V] | Any workload on the VPC reads every client's keys; two clients on one index mix keys built from tenant and user ids, the platform's own included (refresh tokens, balance cache, messaging) | For this module: §7.5 (no authorisation state, namespace, self-describing values, configuration check). Enabling AUTH and in-transit encryption, or one instance per client, is a platform decision outside this plan and belongs on the roadmap |
| R-14 | Hand-written patient routes (ledger, balance, account ledger, patient change log) do not apply chart visibility; only `GET /patients/{id}` does [V] | A user restricted to office A reads the ledger of an office-B patient by id | The module checks visibility itself for drills and single-patient reports (§4.4); the four patient PDFs are D-07 (SEC-22); the remaining routes are not scheduled in this plan |
| R-15 | The **S** default grants leave the `audit` family and class `user_activity` with full-access roles only until the administrator decides the conflicts | Nobody but the owner or an administrator reads the Audit Trail or receives the audit alerts on a tenant that never decides | Readiness check (k) is part of the signed checklist of §3.5 step 5; alerts also go to full-access roles (SEC-31) |
| R-16 | The parent-join tenant predicate (SEC-42) adds a join to the generic lists of the 1.3-million-row fact tables | Slower chairside lists | The join is on the primary key of `patients` or `offices`; acceptance on `golden_large`; DATA-15 replaces the join by a column in P1 |

### 13.2 Open decisions

| # | Decision | Default used in this document | Needed by |
|---|---|---|---|
| 1 | **Challenge to PD-10.** In the legacy tool View Only shows the report list and its parameters but cannot generate; only Full Control runs ([R] `denticon_analytics_and_dso.md` §10.1). The brief makes View Only "run and view". Seeded groups that hold a View Only code without its Full Control twin gain on-screen results: Clinical (Treatment Plan, Referral) and Clerical (Statements) [V] | Written against the brief: View Only runs and views | P0, product owner |
| 2 | Is Full Control alone enough for XLSX / CSV export and for scheduling? PD-10 says both "Full Control = also print, export and schedule" and "separate action rights for export, schedule" | Two keys for data files and schedules (the legacy model); Full Control alone for print and PDF | P0 |
| 3 | The 13 `reports_group_reports_*` codes: deactivate, or require them for office-group and multi-office runs (decision 3 of 04 §11.7) | Deactivate; office assignments govern | P0 |
| 4 | Role `owner` holds every report right and class without a group | As stated (§2.1) | P0 |
| 4b | Role `manager` in report mode. PD-11 says "privileged roles are unrestricted" without naming them; the platform treats `manager` as office-unrestricted | `manager` follows its `user_offices` and its groups: no all-office scope and no provider exemption by role; it keeps class `payroll_time`. If the product owner keeps the role valve instead, the consequence is: a `manager` assigned to one of ten offices reads all ten on every family held, in exports and in schedules, and opens other users' tenant-wide runs; `users.role` is free text | P0 |
| 5 | Callers without any office assignment in report mode: refused, or tenant-wide as elsewhere in the application (decision 13 of 02 §18.2) | Refused from the first deploy; `REPORT_UNGATED_OFFICE_ACCESS` per client during its window, off at enforcement | P0 cut-over |
| 6 | Meaning of `users.patient_access_level` for reports | The ceiling of §4.4 | P0 |
| 7 | Date of birth as `phi_identified` (research and the example of 02 §3.12 use `phi_sensitive`); subscriber id as `phi_sensitive`; SSN never in full | As §5.1, §5.5 | P0 |
| 8 | Retention: 72 months for audit events, manifests and disclosures, 84 months for pinned runs; write-once through a separate bucket or per-object retention | As §6.6; separate bucket | P1, counsel |
| 9 | Recipients outside the organisation: declared-recipient disclosure log only, or audited external-viewer accounts (named account, step-up, access to delivered runs only) | Declared recipient only; external accounts are not scheduled in P0-P5 | P2 |
| 10 | Audit tables owned by a second database role (application role with `INSERT` and `SELECT` only) or trigger and seals with the single role | Trigger and seals | P2 |
| 11 | Assistant: vendor route, whether a question that names a patient may be sent, provider aliasing | Route under an executed agreement; `refuse`; aliases on | P5 |
| 12 | Second-user approval of bulk exports; scope of step-up re-authentication | Approval not built; step-up off by default | P2 |
| 13 | **PD-11 against literal parity on `my_reports.production_report`.** The legacy screen limits every user to the linked provider and fails the run without a link (display-only CORRESPONDING PROVIDER, [R] `legacy_report_outputs_daily_my.md` §5 B5); 04 FLT-17 and `dashboards.my` of 06 are written that way. PD-11 says privileged roles are unrestricted | Written against the brief: `self_unless_privileged`; an exempt caller gets a provider picker with the own link as default. Alternative: `self_always`, exempt callers use `daily.production_report` | P1, product owner |
| 14 | Segregation default: grant class `user_activity` and the `audit` family to the legacy holders of Management reports, all of whom post transactions [V], or withhold them until the tenant administrator decides | Withhold; conflicts listed for an explicit, recorded decision (§2.4 **S**) | P0 cut-over |
| 15 | Peer thresholds for provider-restricted callers (05 §9.3 rule 10 says 5 for a distribution; 06 quotes 3) | A mean from 5 other providers, a median or quartiles from 10 | P1 |
| 16 | Disclosure log administration: a right of its own or `reports_administer` | `reports_disclosures_manage` | P2 |

### 13.3 Assumptions about and requests to other documents

| Document | Assumed or requested |
|---|---|
| `02_architecture.md` | **Additions.** (a) `access.export_formats[]` beside `can_export`; (b) `purpose_code`, `purpose_note`, `external_recipient` on `POST /reports/runs/{run_id}/artifacts`, and 422 `purpose_required`; (c) definition fields `scope.user_restriction` and `scope.user_restriction_exempt_class`, column `report_runs.scope_user_ids` inside `scope_hash` (precondition of SEC-06), and the user clause of V-5 in the `can_view_run` predicate of §5.4; (d) resolved columns in `report_runs.blocks` keep `data_class` (rule V-4); (e) the watermark id in `file_name`; (f) the `security` block of `GET, PATCH /reports/settings`, the settings `REPORT_RIGHTS_SHADOW`, `REPORT_RIGHTS_SHADOW_UNTIL` and `ALLOW_SIGNUP` with their start-up checks in §12.4; (g) served `row_actions[]` and `bulk_actions[]` filtered per caller; (h) a write-once location for `report-audit/` objects in ENG-46; (i) the example column `date_of_birth` of 02 §3.12 becomes `phi_identified`; (j) API rows `POST /reports/disclosures` and `POST /reports/disclosures/{disclosure_id}/amendments`; (k) tick steps for sealing (P1), index partitions and the audit purge; `report.view` also when a page read passes a further 1,000 rows, with `details{after, max_row_no}`; (l) a two-column `OR` office attribution on the scoped handle (S-13). **Changes to what 02 states.** (m) §2 and §4.1: `OfficeScope.can_view_all()` leaves the reuse list — it accepts the alias and the roles `owner` / `manager`; the view-all caller is a role in `REPORT_FULL_ACCESS_ROLES` or a strict holder of `office_scope_view_all_offices`, and the same function serves the legacy routes of §14; (n) §5.4 lookup step 1 and §13 row 5: a supplied `run_id` that exists is returned only to its requester for the same `report_key` and `params_hash`, else 409 `run_id_conflict`; (o) §5.4 and §13 rows 6, 7, 45: no ownership-only exemption for result-bearing fields — the reduced `ReportRunRead` shape of §4.5; (p) §5.4 and §12.1: no caller profile in Redis (`rptc` becomes a process-local cache); every `rpt*` key carries `REDIS_NAMESPACE` and every cached value the envelope of §7.5; (q) §6.3: the outbox `payload` carries the columns of §6.3 here and the drain writes `outbox_id`; (r) §10.1: the provider restriction applies to every read of a metric family reached only through a self-restricted right, not only to "provider dimensions and filters" (PR-10), the response carries `provider_restricted`, and the `metric.query` event is committed before the response when a value's class is beyond `aggregate` and `financial_practice`; (s) §10.4: a tile whose `query` is a report reference or that returns patient rows is executed as a run of that report; (t) §9 and §13 rows 38, 40, 43: every format of `output_formats` is authorised at creation and change, a non-owner may not change what a schedule runs (SH-6), and a run-now started by a non-owner reaches that caller only through `can_view_run()`; (u) §3.10: `export_selection` is an artifact request; (v) §11: a custom definition also needs a report family of its dataset, the class of every field `spec` references, and `reports_share_organization` for `visibility = organization` |
| `03_data_foundation.md` | A default `data_class` per dataset column; `report_families[]` per dataset (§5.6); `ssn_last4` instead of `ssn`; no dataset exposes `users.signature_data`, credentials or tokens; the referral datasets expose the referred-from and the referred-to office column (S-13); `rpt_audit_events` classifies rights, membership, office-assignment and user-security writes so the access change log can show the history before SEC-21; DATA-29 uses the kept `setup_close_out_*` rights for close, lock and override; DATA-15 and DATA-46 keep their scope and replace the parent-join predicate of SEC-42 by the column |
| `04_filter_framework.md` | §6.2 and §6.6 transcribe the platform resolver (`validate_target_office`, `require_all_offices`, the unrestricted default): the office rule of §4.1 here replaces it — the alias, a missing assignment and role `manager` do not widen. §6.5: Statements is `office_mode = required`; Patient's Notes is a single-patient definition (S-10 c). §6.7: answered by S-13. `office_scope.validation.allowed_modes` is narrowed from scope only; option sources carry `required_class` (`patients`, `responsible_parties` → `phi_identified`); `users` returns id and label. FLT-17 and §10.3: the forced provider and the 403 without a link apply to restricted callers; an exempt caller of `my_reports.production_report` gets `provider_ids` as a picker (open decision 13). `my_reports.missing_progress_notes`: `provider_ids` forced for restricted callers. My Reports user parameters are forced, not defaulted, to `current_user`; the `report_by` options of `my_reports.daily_journal` each carry a restriction (§4.2) |
| `05_metric_catalog.md` | Each metric has `metric_family` with the values of §2.3 (05 carries `group` today; `collections_ar`, `insurance_rcm`, `hygiene`, `treatment`, `providers` and the others do not map one to one) and `data_class`; each dimension of §1.5 declares `label_class` and `llm_egress` (rule 13 of §5.2); §9.3 rule 10 uses the thresholds of PR-8: a mean from 5 other providers, a distribution from 10, the caller not counted; provider-dimension results carry the number of contributing providers (SC-1); a distinct-patient count per cell is available when a value goes to the assistant (SC-2) |
| `06_dashboards.md` | The mapping of §2.0.5 is accepted, including `dashboards.executive_summary` → `dashboard_view` and `dashboards.ortho` → the `ortho` report family; `dashboard_view` serves no tile by itself; tiles degrade to `restricted`; patient lists on dashboards are report runs; `worklists.unsigned_progress_notes` opens with any of `daily`, `my_reports`; the peer thresholds are 5 and 10 (06 quotes 3); goals use `analytics_goals_view` / `analytics_goals_manage` plus the classes of §2.2 D; the assistant follows §9 and the label rule L-4 / L-5 |
| `07_ux_blueprint.md` | Gating from the server `access` object, `can_commit` included; request-access state; purpose prompt with the outside-recipient question; export notice; readiness banner in shadow mode with its end date; the run tray shows a run in the reduced shape without title and criteria; a provider picker on `my_reports.production_report` for exempt callers |
| `catalog/<category>.md` | Per report: family per §2.3, restriction, class per column; `catalog/my_reports.md` follows the table of §4.2; specifications of the NEW reports of §6.8 (#4 to #11) |
| `12_roadmap.md` | SEC-11 and SEC-42 are entry conditions of P0 enforcement; the readiness check gates the switch per client; shadow relaxes only the surfaces that exist today, so no P1 report needs to be disabled for a client in its window; SEC-26 (seals) is a P1 exit criterion |
