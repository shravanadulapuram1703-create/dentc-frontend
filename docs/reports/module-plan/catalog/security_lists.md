# Lists - Security - report specifications

Security administration lists of the legacy `Security List Reports` screen (4 reports, 11 legacy controls, none from vendor
documentation): the user roster, the security groups, the rights each group holds and the users in each group. They are the
practice's access-review documents. Hub area **Lists**, tab `security` (brief section 1; category key `lists`,
`subcategory = security`; the existing placeholder route `/reports/lists/security-list` in `src/App.tsx` becomes the
classic-frame entry of this tab). Default phase **P3**; no report of the family needs another phase.

## Overview

Legacy order. Size: S up to 2 days, M up to 1 week, L up to 2 weeks (brief section 4). Availability = rating of the default
run in `coverage_matrix.md` 11.1 (rows 90-93). Confidence = `research/legacy_report_outputs_lists.md` section 2 (rows
17-20). Only Group Rights List has a vendor sample (2016, Detail layout); the screen itself changed between the 2023 vendor
screenshots and our 2026 capture [conflict], so three of the four layouts are reconstructions.

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `lists.user_list` | User List | Roster of user accounts with role, contact, office assignments, provider links and group membership, for onboarding / offboarding checks and finding who holds administrator access | P3 | S | READY (no login history beyond `last_login_at`) | PARTIALLY DOCUMENTED |
| `lists.group_list` | Group List | The security groups of the organisation with description, status, member and right counts | P3 | S | READY | INFERRED |
| `lists.group_rights_list` | Group Rights List | Every right held by each security group, for reviewing a group before editing it and finding which groups hold a right | P3 | M | READY | DOCUMENTED (Detail, 2016 sample) |
| `lists.user_group_membership` | User-Group Membership | Members of each security group per office (detail) or member counts per group and office (summary), for periodic access reviews per location | P3 | M | READY | INFERRED |

## Shared rules

### Shared parameters and defaults

Exactly as in `catalog/parity/security_list_reports.parity.json` (PARITY VALID, 11 controls: 4 `replicated`, 7
`replicated_enhanced`, 1 dynamic rule). Every key is a parameter of `filter_card.md` section 3 or a shared vendor-doc /
signature parameter of `04_filter_framework.md` (`security_group_ids`, `include_inactive_users`); values are the legacy
defaults (AD-8).

| Parameter (type) | Reports | Default | Family rule |
|---|---|---|---|
| `output_format` (`enum`: `pdf`, `xlsx`, added `csv`) | all 4 | `pdf` | `role: output`; never changes the rows; PRINT / PREVIEW always shows the result on screen first, then renders the chosen format |
| `user_ids` (`entity_multi`, `lookup:users`) | r01 | `all` | The **listed** user account (`rpt_user_dim.user_id`), never a poster. The source returns id and label only (08 5.2 rule 9) and lists active and inactive users |
| `include_inactive_users` (`boolean`) | r01, r04 | `false` | `false` = `users.is_active = true` only. Applied after the pickers: a picked inactive user prints only when ticked (inferred, open question 2) |
| `report_format` (`enum`: `detail`, `summary`) | r04 | `detail` | Row grain of the same membership population (r04 section) |
| `security_group_ids` (`entity_multi`, `lookup:security_groups`) | r04 (legacy); r01, r02, r03 (enhancement) | `all` | `user_group_memberships.group_id` (r01, r04) or `user_groups.id` (r02, r03) `IN (...)`. Source `security_groups` (FLT-09, P3) returns active groups, id and name only, no class needed |
| `office_scope` (`office_scope`; legacy section `LOCATION`) | r04 only | `working_office` (mode `office`) | Rule `security_list_reports.r04.d01`; attribution `assigned_office` (below). r01-r03 have `scope.office_mode = none` (04 6.5, 08 S-10 a): users, groups and rights are organisation-level |

Family enhancement parameters (NEW, report-specific keys of this catalog; `04_filter_framework.md` section 15 should own them):

| Key (type) | Reports | Default | Meaning | Parity guard |
|---|---|---|---|---|
| `group_status` (`enum`: `active`, `inactive`, `both`) | r02, r03, r04 (and the group-name column of r01) | `active` | `user_groups.is_active`. In DentC `is_active = false` is the delete state of Security > Groups (the screen hides such groups) and an inactive group grants nothing (`permission_service.effective_permissions` filters `UserGroup.is_active` [V] L163). The legacy tool has no such state on these screens, so `active` reproduces "the groups that exist"; no legacy control exists, so no `default_differs_reason` is needed | Changing it widens only |
| `assigned_office_ids` (`entity_multi`, `lookup:offices`, `accepts_all`) | r01 | `all` | Users with at least one `user_offices` row in the list. Users with no office assignment (ungated) are selected with `access_flags = ["no_office_assignment"]`, not with this key. Not an `office_scope`: the report stays `office_mode = none`, so an office-restricted caller still sees the organisation roster, as the Security Users screen shows it | `all` adds no predicate |

### Office and provider attribution

| Item | Rule |
|---|---|
| Groups have no office | `user_groups` carries `tenant_id`, `name`, `description`, `is_active`, `created_at` and no office column [V] `app/db/models/access.py` L74-80. Legacy groups are defined per office (the same name repeats under every office; the 2016 Group Rights List sample prints `Office` as its first column). DentC prints each group once. The legacy `Office` column of r02 and r03 therefore has no data; it is printed as the organisation band (`All offices`), and the office dimension of r04 comes from the member's assignment. This is a deliberate model difference, not a gap: rights are evaluated per user over all active groups, not per office (08 2.1) |
| `assigned_office` (NEW attribution value, owner `03_data_foundation.md` 5.1) | `user_offices.office_id` (every assignment, primary or not). r04 band; r01 column `Offices` and filter `assigned_office_ids`. `user_offices` has no `tenant_id` until DATA-46 (P3): tenant scope through `users.tenant_id` of the joined user, never through the office alone |
| Users without assignment | A user with zero `user_offices` rows is ungated (CLAUDE.md office context; 08 S-4 escape hatch) and reaches every office. r01 prints `Offices` = `All offices (no assignment)`; r04 lists such members in a trailing band `No office assignment` on every run |
| Full-access roles | Users whose `role` is in `REPORT_FULL_ACCESS_ROLES` (`admin`, `super_admin`, `owner`; 08 2.1) hold every right whatever their groups. r01 and r04 print a `Full access role` flag so an access review does not read "no group" as "no access" |
| Provider attribution | None: no report of the family is about providers. r01 prints the two user-provider links (`report_access_provider_id`, `linked_provider_id`) as labels. `scope.provider_restriction = none` on all four (08 PR-2) |

### Datasets and freshness

| Dataset | Kind | Reports | Phase |
|---|---|---|---|
| `rpt_user_dim` (03 2.4; NEW columns below) | view (DATA-05) | r01, r04 | P0 |
| `rpt_office_dim` | view (DATA-05) | r01 (office labels), r04 (band) | P0 |
| `user_groups` | passthrough (DATA-45) | all 4 | P3 |
| `user_group_memberships` | passthrough (DATA-45) | r01, r02 (counts), r04 | P3 |
| `user_group_rights` + `permissions` | passthrough (DATA-45); `permissions` is global (no `tenant_id`), joined only through `user_group_rights.permission_id` | r02 (counts), r03 | P3 |
| `user_offices` | passthrough (DATA-45; tenant column DATA-46) | r01, r04 | P3 |

NEW `rpt_user_dim` columns requested from 03 (under DATA-45): `username`, `first_name`, `last_name`, `short_id`,
`must_change_password`, `is_legacy_user`, `legacy_activation_completed`, `updated_at`, `assigned_office_ids int[]`,
`active_group_names text[]` (the existing `group_names` also contains inactive groups - the view sketch has no
`is_active` filter), `has_login_restriction` (a `user_login_restrictions` row with `is_24_7 = false`),
`ip_rule_count` (active `user_ip_rules`), `is_full_access_role bool` (= `lower(users.role) IN ('admin', 'super_admin', 'owner')`,
the `REPORT_FULL_ACCESS_ROLES` of 08 2.1; the `owner` member follows open decision 4 of 08), `activation_state`
(`activated` = `is_legacy_user and legacy_activation_completed`, `pending` = `is_legacy_user and not
legacy_activation_completed`, `not_legacy`). Never columns: `password_hash`, `signature_*`, `image_url`, tokens (08 5.5, D-13).

`freshness = live`, `cacheable = false` on all four: an access review must show a right removed a minute ago. Volumes: users
and groups in the tens to hundreds; r03 is groups x active rights (13 seeded groups; the catalog has 363 curated codes today, 410 rows / 397 active after
the 08 2.2 revision; at most 2,262 rows = the sum of the legacy rights of the 13 groups in `data/Groups.txt`, largest
`Administrators` 408, fewer after the curation - an estimate until counted on a seeded tenant; the legacy demo account printed 1,033 pages because groups repeated per office). Migrated history: none of these lists
is historical; they show the current state. Who granted or removed what, and when, is not stored (`user_group_rights` and
`user_group_memberships` have only `created_at`, no `granted_by`, hard delete [A] `be_data_identity_setup.md` P12): that
history exists only from SEC-21 on, in `management.access_change_log` (08 6.8 #8), never in this family.

### Sign conventions, sort and totals

No money column exists in this family. Counts only: `Users : n` (distinct `user_id`), `Groups : n`, `Rights : n`,
`Members : n`. A user listed under two offices or two groups is counted once in the grand total and once in each band.
Default sorts: users by `last_name`, `first_name`, `username`, tie-breaker `user_id`; groups by `name`, tie-breaker
`group_id`; rights by `permissions.category`, `permissions.label`, tie-breaker `permissions.code`. The legacy sort of these
lists is not documented (open question 3).

### Page furniture (all four)

From `research/legacy_report_outputs_lists.md` 3.2 (the 2016 `Security - Group Rights List` sample is the only one of this
family):

| Element | Rule |
|---|---|
| Header line 1 | Organisation (practice-group) name: r01-r03 are organisation-level. r04: office name when the run resolves to one office, organisation name otherwise |
| Header line 2 | Printed title `Security - <legacy name>`: `Security - User List`, `Security - Group List`, `Security - Group Rights List` (sample-confirmed for r03 only; the prefix on r01 and r02 follows the old menu names `[P31·img]`), `Security - User-Group Membership` (INFERRED). r04 adds the format: `title_templates[]` `[{when: ["eq", "report_format", "summary"], title: "Security - User-Group Membership (Summary)"}]`, as legacy lists print the format in the title (`Explosion Codes List (Summary)`, research 3.4) |
| Footer criteria echo | `criteria_echo = footer`: r01 `Users : ALL` or names, `* Excludes Inactive Users` when unticked (the wording of the patient-list echo `* Excludes Inactive Patients`, research 3.4 - inferred for users); r02 and r03 `Offices: ALL` (sample-confirmed on r03; printed on r02 for the same reason: groups are organisation-wide); r04 `Offices :` / `Office Group :`, `Groups :`, `Format :`, the inactive-users line and `* Includes users with no office assignment` while `include_unassigned_users = true` (the default). Non-default enhancements are echoed after the legacy criteria |
| Tail | Title repeated, `Printed : <m/d/yyyy h:mm:ss AM/PM>` in office time, `By : <user>` (sample-confirmed on r03), `Page : n of m`. The vendor line `PlanetDDS (c) 2003 - <year>` is not reproduced (DentC footer instead) |

### Rights and data classes

| Item | Rule |
|---|---|
| Right family | `lists_security` = `reports_lists_security_list_rpts_screen_full_c` only (security card 2.2; kept code, truncated legacy spelling). Full Control only: there is no View Only level, any use needs the code (security card 2.1). Print and PDF come with the code; XLSX / CSV also need `reports_export_data_files` |
| Key class per report | Security card 2.3: r01 `security_users`; r02 and r03 `security_groups`; r04 both. A caller without the key class is refused with 403 `data_class_denied` (02 3.3), so the report can never show more than the owning screen (T-12). The classes are granted by `setup_security_users_screen_view_only` / `_full_control` and `setup_security_groups_screen_view_only` / `_full_control` (security card 5.3) |
| Column classes | Account attributes (username, e-mail, phone, role, status, last login, office assignments, provider links, `patient_access_level`, login restrictions) = `security_users`. Group names, descriptions, rights, memberships = `security_groups`. On r02, r03 and r04 the member's id and label (`user_label`, `user_name`) are `security_groups` (the class covers "the member's id and label", security card 5.1). On r02 and r03 any other user attribute is `security_users` and is dropped for a caller without `security_users`; r04 requires both classes (key classes), so no column drop applies there. Office labels and counts = `aggregate` |
| Patient manifest | None: no column identifies a patient; runs write the run event only (ENG-14) |
| Never a column | `password_hash`, `signature_data` and every `signature_*` column, `auth_action_tokens`, refresh tokens, `user_time_clock_config` wages (08 5.5, 08 6.8 closing note, D-13) |
| Default grants | The code is held by the groups that held `Reports-Lists Security Rpts Screen Full C` in `data/Groups.txt` (seeded per tenant by SEC-02); which seeded groups those are is listed by the readiness report (`management.report_access_readiness`), not here |

### Family-wide enhancements

| Enhancement | Detail |
|---|---|
| Saved views and favorites | ADD TO MY FAVORITES = server-side saved view + favorite (ENG-28, ENG-29); legacy names `Security - User List`, `Security - Group List`, `Security - Group Rights List` are aliases (`legacy_names[]`) |
| Schedules | All four `schedulable = true`. Typical: r04 quarterly to the practice owner as the periodic access review; r01 monthly with `not_signed_in_within_days = 90` (dormant accounts). Delivery is a login-gated link (PD-12); a recipient without the key class is skipped (08 5.6) |
| Record drill | A user cell opens Security > Users (`/setup/security/users`, `route_key = security_user_setup`) and needs `setup_security_users_screen_view_only` or `_full_control` in `drill_targets[].right_code`; a group cell opens Security > Groups (`/setup/security/groups`, `route_key = security_group_setup`) with `setup_security_groups_screen_*`. Route keys are owned by 07 |
| Cross-links | Every report links to `management.access_rights_matrix` (08 6.8 #7: effective access per user, segregation conflicts) and `management.access_change_log` (#8: who changed what); this family stays the literal legacy lists |
| Export selection | Bulk `export_selection` on every report (Full Control + `reports_export_data_files`) |

### Family-wide open questions

| # | Question | How to confirm on the live legacy tool |
|---|---|---|
| 1 | Where did `REPORT FORMAT` (`Detail` / `Summary`) of User List and Group Rights List go between the c. 2023 build and the 2026 capture, and is the old Summary (usernames only) still reachable | Open Security List Reports on the current build; compare with the 2023 vendor screenshot |
| 2 | Does a user picked in the USER / Group pickers print when `Include Inactive Users` is unticked and the user is inactive | Inactivate a test user, pick it, run with the box unticked |
| 3 | Row order of each list | Run with three users / groups of different initials |
| 4 | Do the lists include the vendor's own support users and groups (the "vendor services group" of the preloaded set) | Run User List and Group List on a fresh account |
| 5 | Is the Excel output a flat table or the PDF layout in cells | Export each report to Excel once |
| 6 | Product decision: legacy groups are per office, DentC groups are organisation-wide (no office column). Keep (recommended: the rights model of 08 2.1 is per user, not per office) or add `user_groups.office_id`; the latter changes 08, the Security Groups screen and the seeder | Product owner; challenge recorded for `08_security_compliance.md` |

## User List - `lists.user_list`

Lists › Security List, screenshot `1.PNG` - P3 - S - right `reports_lists_security_list_rpts_screen_full_c` (family `lists_security`), key class `security_users` - instant - PARTIALLY DOCUMENTED

### Purpose

Account administrators and the practice owner, on demand and at each staff change: onboarding (the new account exists,
has the right groups and offices), offboarding (the leaver's account is inactive), periodic access reviews, and the
vendor's own use case - finding who has administrator access `[P32][P34]`. Before the two-stage login change the vendor
recommended printing the user list as a username reference `[P33]`; in DentC the same need arises at cut-over, when
migrated legacy users must activate their accounts (`is_legacy_user`, `legacy_activation_completed`).

### Legacy output

Confidence PARTIALLY DOCUMENTED: two content facts are vendor-documented, the column list is reconstructed from the
`Setup > Security > Users` fields `[P35]` and the comparable Dentrix Enterprise `Assigned Rights Report` `[C1]`.

| Item | Content | Basis |
|---|---|---|
| Printed title | `Security - User List` | old menu name `[P31·img]`; current print not seen |
| Header | Practice-group name (the list is account-wide) | family furniture, r03 sample |
| Columns (order is a proposal) | `Username`, name (`Last, First`), `Short ID`, e-mail, phone, `Primary Security Group`, `User Role/Type`, `Report Access Provider`, `Patient Access Level`, assigned offices, active flag, `Group Membership` (all groups, right-most column) | `Group Membership` on the right: `[P32]`; other fields `[P35]` `[I]` |
| Never printed | Passwords | `[P33]` |
| Grouping, totals | None documented; a user count is added | `[I]` |
| Variants | None in the 2026 capture. The c. 2023 build had `REPORT FORMAT` `Detail` (default) / `Summary`; `Summary` listed all usernames and no passwords `[P33·img][P33]` [conflict] | `[L3]` |

DentC differences: there is no primary security group (`user_group_memberships` has no `is_primary`; every active group
counts equally in `effective_permissions`), so `Primary Security Group` cannot be printed (open question 1). `Group
Membership` prints the user's **active** groups (`active_group_names`, NEW) - the existing `group_names` of `rpt_user_dim`
also lists inactive groups, which grant nothing. Quirk fixed: inactive users are visible with an `Active` column when the
checkbox is ticked instead of an unknown implicit rule; full-access roles are flagged so "no group" is never read as "no
access".

### Parameters - legacy parity

<!-- PARITY:security_list_reports.r01:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| USER | User (picker) | shown: ALL | `user_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction. Role on this report: the listed user account itself (rpt_user_dim.user_id IN (:user_ids)), not a poster or creator of records. Only real accounts are listed (rpt_user_dim rows with is_legacy_login = false); bare legacy login strings are never rows or options. The option source lookup:users returns active and inactive users with a status badge; a picked inactive user is printed only when include_inactive_users = true (inferred: the legacy precedence of the picker over the checkbox is not documented). Dialog content never captured - confirm list source and whether inactive users are listed on the live tool. |
| OTHER OPTIONS | Include Inactive Users (checkbox) | **unchecked** | `include_inactive_users` | boolean | - | `false` | replicated | false (legacy default) = users with users.is_active = true only; true = active and inactive users, with an Active column showing the state. Applied after user_ids (a picked inactive user is dropped while unticked; inferred). Inactive in DentC = the deactivated account of Security > Users (no separate deleted state for users). |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:security_list_reports.r01:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Screen result, then a PDF (`output_format = pdf`); rows unchanged |
| PRINT FORMAT `Excel` | Screen result, then an XLSX file (`xlsx`), one flat sheet; rows unchanged. Added `csv` |
| USER `ALL` (default) | No user predicate: every account of the tenant (`rpt_user_dim.is_legacy_login = false`) |
| USER one or more users | `rpt_user_dim.user_id IN (:user_ids)` |
| Include Inactive Users unticked (default) | `users.is_active = true` only; footer `* Excludes Inactive Users` |
| Include Inactive Users ticked | Active and inactive accounts; the `Active` column shows the state and the total line adds `Inactive : n` |
| CLEAR CRITERIA | Every parameter back to its default |
| ADD TO MY FAVORITES | Saved view + favorite with the current criteria |

Dependency rules: none in the capture (no control is greyed, no vendor rule). Precedence (inferred, family open
question 2): `include_inactive_users = false` also removes a picked inactive user.

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `report_format` (`enum`: `detail`, `summary`) | `detail` | Restores the documented c. 2023 variant: `summary` = `Username`, name, `Active` only (the username reference of `[P33]`). `detail` is the 2026 output. Title `Security - User List (Summary)` for `summary` |
| `security_group_ids` (`entity_multi`, `lookup:security_groups`) | `all` | Users who are members of at least one of the groups (`EXISTS` on `user_group_memberships`) |
| `assigned_office_ids` (`entity_multi`, `lookup:offices`, family NEW; `accepts_all`) | `all` | Users assigned to one of the offices. Unassigned users (they reach every office): `access_flags = ["no_office_assignment"]` |
| `not_signed_in_within_days` (`integer`, NEW; `validation.min` 1, empty = off) | empty | Users whose `last_login_at` is older than N days or empty: the dormant-account check of an access review |
| `access_flags` (`enum_multi`, NEW: `no_group`, `no_office_assignment`, `full_access_role`, `must_change_password`, `not_activated`, `login_restricted`; `min_items` 0, `semantics.full_selection = predicate`) | empty list = no restriction | Users matching any ticked flag. `no_group` = no active group (holds nothing under the strict rule, 08 2.1, unless a full-access role); `not_activated` = `is_legacy_user and not legacy_activation_completed`; `login_restricted` = `has_login_restriction or ip_rule_count > 0` |
| `sort_by` (`enum`: `last_name`, `username`, `role`) | `last_name` | Row order (keys in Output) |

### Data

| Item | Rule |
|---|---|
| Dataset | `rpt_user_dim` (03 2.4) with the NEW columns of the family header; `rpt_office_dim` for office labels; `rpt_provider_dim` (`provider_name`, `short_id`) for the two provider links, joined on `provider_id` |
| Population | `rpt_user_dim` rows with `is_legacy_login = false` (real accounts only; legacy login strings have no account and are never listed) |
| `user_ids` | `user_id IN (...)` |
| `include_inactive_users` | `false` adds `is_active = true` |
| `security_group_ids` | `EXISTS (SELECT 1 FROM user_group_memberships m JOIN user_groups g ON g.id = m.group_id AND g.is_active WHERE m.user_id = u.user_id AND m.group_id IN (...))` |
| `assigned_office_ids` | `assigned_office_ids && :ids` |
| `access_flags` `no_office_assignment` | `cardinality(assigned_office_ids) = 0` |
| `not_signed_in_within_days` | `last_login_at IS NULL OR last_login_at < now() - :n days` (naive UTC as stored) |
| Office scope, date basis | `scope.office_mode = none` (08 S-10 a); `date_basis = null` (current state) |
| Availability | READY (coverage matrix row 90: "no login history exists") in the source tables; the dimension view needs the RPT-SLIST-03 columns (`username`, `first_name`, `last_name`, `short_id`) before the default output can be built. `availability[]`: `last_login_only` - only the latest sign-in is stored (no history, no failed attempts); `migrated_created_at` - `Created` of migrated users is the migration time stamp |
| Migrated history | Migrated users carry `legacy_id`; `last_login_at` is empty until the first DentC sign-in, so a dormant-account run right after cut-over lists every migrated user (the run warning says so) |

### Output

Format `detail`, block `main`, shape `table`:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `user_id` | User ID | `id` | `security_users` | hidden; `row_id_column`; drill key |
| `username` | Username | `text` | `security_users` | key column; `count_distinct(user_id)` label `Users :` |
| `user_name` | Name | `text` | `security_users` | `Last, First` |
| `short_id` | Short ID | `text` | `security_users` | - |
| `email` | E-mail | `text` | `security_users` | - |
| `phone` | Phone | `text` | `security_users` | - |
| `role` | User Role/Type | `text` | `security_users` | free text as stored |
| `is_full_access_role` | Full Access Role | `boolean` | `security_users` | `count` of true, label `Full access :` |
| `report_access_provider_label` | Report Access Provider | `text` | `security_users` | `Name (short_id)` |
| `linked_provider_label` | Linked Provider | `text` | `security_users` | `default_visible = false` |
| `patient_access_level` | Patient Access Level | `text` | `security_users` | - |
| `home_office_name` | Home Office | `text` | `security_users` | primary `user_offices` row |
| `assigned_office_names` | Offices | `text` | `security_users` | comma list; `All offices (no assignment)` when empty |
| `active_group_names` | Group Membership | `text` | `security_groups` | comma list, right-most column; dropped for a caller without `security_groups` |
| `is_active` | Active | `boolean` | `security_users` | `count` of false, label `Inactive :` (only when inactive users are included) |
| `last_login_at` | Last Sign-in | `datetime` (`tz: office`) | `security_users` | `null_display` `Never` |
| `must_change_password` | Must Change Password | `boolean` | `security_users` | `default_visible = false` |
| `activation_state` | Activation | `enum` (`activated`, `pending` = legacy user not yet activated, `not_legacy`) | `security_users` | `default_visible = false` |
| `has_login_restriction` | Login Restricted | `boolean` | `security_users` | `default_visible = false` |
| `created_at` | Created | `date` | `security_users` | `default_visible = false` |

Format `summary`: `user_id` (hidden), `username`, `user_name`, `is_active`; same total. Sort options: `last_name` =
`last_name`, `first_name`, `username`, `user_id` (default); `username` = `username`, `user_id`; `role` = `role`,
`last_name`, `user_id`. No group levels; `grand_total.label = "All users"`. No page break. Summary header: three cards over
block totals - users listed, inactive users, users with a full-access role (no metric keys: block totals, not registry
metrics).

### Visuals and drill-through

Chart: none - a list. Drill: a user cell → record `security_user` (`route_key = security_user_setup`, right
`setup_security_users_screen_view_only` or `_full_control`); a `Group Membership` cell → `lists.user_group_membership`
with `param_map: {user_ids: [{column: user_id}], office_scope: {literal: {all_offices: true}}, report_format: {literal: detail}}`; the `Full access :` total →
`rows` (same report, `access_flags = ["full_access_role"]`).

### Actions

| Action | Kind | Note |
|---|---|---|
| Open user setup | `navigate` (row) | Security > Users on that user |
| Show effective access | `navigate` (row) | `management.access_rights_matrix`, format effective access per user, `user_ids` carried (08 6.8 #7; needs the `audit` family) |
| Message user | `custom:send_internal_message` (row, bulk) | Internal messaging feature; active users only |
| Review task | `create_task` (bulk) | One task per selected user for the administrator ("review access"), through the task feature |
| Export selection | `export_selection` (bulk) | Full Control + `reports_export_data_files` |

Doubles as a worklist with `not_signed_in_within_days` or `access_flags` set (dormant accounts, users without a group,
legacy users not yet activated): the row action opens the account to deactivate or fix it. The report itself never writes.

### Export and print

PDF landscape (up to 12 visible columns), banded table, letter size, repeat header, organisation header, footer criteria
echo and `By :` (family furniture). XLSX one sheet `User List`, one row per user, offices and groups as text columns,
frozen header, autofilter, criteria sheet. CSV the same table (formula guard on every text cell). Never background.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Printed columns and order of the 2026 User List; is `Primary Security Group` printed (DentC has no primary group: product decision whether `user_group_memberships.is_primary` is added, owner Security Users feature and 03) | Print one User List |
| 2 | Does the 2026 list still print `Group Membership` (family open question 1 covers the lost `REPORT FORMAT`) | Same print |
| 3 | Does the USER picker list inactive users | Open SELECT with an inactive user present |
| 4 | Are the vendor's support accounts listed | Family open question 4 |

## Group List - `lists.group_list`

Lists › Security List, screenshot `2.PNG` - P3 - S - right `reports_lists_security_list_rpts_screen_full_c` (family `lists_security`), key class `security_groups` - instant - INFERRED

### Purpose

Administrators, on demand: compare the group set before creating or renaming a group, check that every group has members
and rights, and clean up empty groups. In the legacy tool groups are copied to a new office only if the user accepts the
copy prompt (otherwise the office starts with `Administrators` alone `[P58]`), so the list was the check that every office
has its groups; in DentC groups are organisation-wide, so the check becomes "every group in use, none empty".

### Legacy output

Confidence INFERRED: name only `[P31·img][L3]`; old description pane text not captured. Comparable: Dentrix Enterprise
`Audit Rights Report - Group Names` (a change audit, not a current-state list).

| Item | Reconstruction | Basis |
|---|---|---|
| Printed title | `Security - Group List` | old menu name `[P31·img]` |
| Columns | `Office`, `Group`, possibly a member count | the r03 sample has exactly these two leading columns `[P31·img]`; count `[I]` |
| Population | Every group of every office (groups are per office in the legacy tool); preloaded `Clerical`, `Clinical`, `Office Manager`, `Time Clock Only`, a vendor services group, `Administrators` | `[P35][P31·img]` |
| Totals, variants | None documented | `[L3]` |

DentC difference: `user_groups` has no office column, so each group prints once under the organisation band (`Office`
column = `All offices`); the 13 seeded groups of `data/Groups.txt` are the typical content. Added (ours): description,
status, member counts and right counts - the facts an administrator checks next.

### Parameters - legacy parity

<!-- PARITY:security_list_reports.r02:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:security_list_reports.r02:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Screen result, then a PDF; rows unchanged |
| PRINT FORMAT `Excel` | Screen result, then an XLSX file, one flat sheet; rows unchanged. Added `csv` |
| CLEAR CRITERIA | Every parameter back to its default (only `output_format` and the enhancements) |
| ADD TO MY FAVORITES | Saved view + favorite |

Dependency rules: none. The report takes no filter in the legacy tool `[L3]`.

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `group_status` (`enum`, family) | `active` | `inactive` / `both` add the deleted (`is_active = false`) groups with the `Active` column |
| `security_group_ids` (`entity_multi`, `lookup:security_groups`) | `all` | Restricts to the picked groups |
| `group_flags` (`enum_multi`, NEW: `no_members`, `no_active_members`, `no_rights`; `min_items` 0, `semantics.full_selection = predicate`) | empty list = no restriction | Groups matching any ticked flag: the clean-up list |
| `include_member_names` (`boolean`, NEW, `role: query`) | `false` | Adds the column `Member Names` (comma list of member labels) |

### Data

| Item | Rule |
|---|---|
| Dataset | Passthrough `user_groups` (tenant scope); counts from `user_group_memberships` joined to `users` (for `is_active`) and from `user_group_rights` joined to `permissions` (`is_active = true`), each as a correlated count, never a join inside an aggregate (03 2.0 "joins never multiply rows") |
| `group_status` | `active` adds `user_groups.is_active = true` |
| `security_group_ids` | `user_groups.id IN (...)` |
| `group_flags` | `no_members`: member count 0; `no_active_members`: active member count 0; `no_rights`: active right count 0 |
| Office scope, date basis | `scope.office_mode = none` (04 6.5, 08 S-10 a); `date_basis = null` |
| Availability | READY (coverage matrix row 91). `availability[]`: `groups_not_per_office` - "Groups are organisation-wide in DentC; the legacy Office column prints All offices"; `migrated_created_at` - `Created` of seeded groups is the seeding time |
| Not producible | Legacy group code (100…268) is not stored [A]; who created or changed a group (no `updated_at` / `updated_by` on `user_groups`) |

### Output

One format `standard`, block `main`, shape `table`:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `group_id` | Group ID | `id` | `security_groups` | hidden; `row_id_column`; drill key |
| `office_label` | Office | `text` | `aggregate` | constant `All offices` (legacy column kept for layout parity) |
| `group_name` | Group | `text` | `security_groups` | key column; `count` label `Groups :` |
| `description` | Description | `text` | `security_groups` | - |
| `is_active` | Active | `boolean` | `security_groups` | shown when `group_status` ≠ `active` |
| `member_count` | Members | `integer` | `security_groups` | `sum` is not meaningful (users repeat): grand total = `count_distinct` of members across the listed groups, computed by the totals builder |
| `active_member_count` | Active Members | `integer` | `security_groups` | as above |
| `right_count` | Rights | `integer` | `security_groups` | none |
| `member_names` | Member Names | `text` | `security_groups` | only with `include_member_names` |
| `created_at` | Created | `date` | `security_groups` | `default_visible = false` |

Sort: `group_name`, `group_id` (default, no `sort_by`). No group levels, no page break. Summary header: cards over block
totals - groups listed, groups without members, distinct members.

### Visuals and drill-through

Chart: none - a list. Drill: a group cell → record `security_group` (`route_key = security_group_setup`, right
`setup_security_groups_screen_view_only` or `_full_control`); `Rights` → `lists.group_rights_list` with
`security_group_ids = [{column: group_id}]`; `Members` → `lists.user_group_membership` with `param_map: {security_group_ids:
[{column: group_id}], office_scope: {literal: {all_offices: true}}, report_format: {literal: detail}}`.

### Actions

| Action | Kind | Note |
|---|---|---|
| Open group setup | `navigate` (row) | Security > Groups on that group |
| Export selection | `export_selection` (bulk) | Full Control + `reports_export_data_files` |

With `group_flags` set the report is the group clean-up worklist (rows open the group to delete or fill it); it never
writes itself.

### Export and print

PDF portrait, banded table, organisation header, footer `Offices: ALL`, `By :`. XLSX one sheet `Group List`, CSV the same
table. Never background.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Printed columns (is there a member count, a description) | Print one Group List |
| 2 | Is a group printed once per office or once per name | Same print on an account with two offices |
| 3 | Product decision: keep the constant `Office` column (layout parity) or drop it (recommended default: keep, `default_visible = true`) | Product owner |
| 4 | Is the footer `Offices: ALL` printed on Group List (carried over from the r03 2016 sample), and is the leading `Office` column printed at all | Same print as question 1 |

## Group Rights List - `lists.group_rights_list`

Lists › Security List, screenshot `3.PNG` - P3 - M - right `reports_lists_security_list_rpts_screen_full_c` (family `lists_security`), key class `security_groups` - interactive - DOCUMENTED (Detail, 2016 sample)

### Purpose

Administrators and support staff, on demand: find which groups hold a given right (the vendor's own troubleshooting step
for a missing button `[P34]`), review a group's rights before editing it, and document access for audits `[P32]`. A
checklist of rights per group **(S)** `[P36]`.

### Legacy output

Confidence DOCUMENTED for the Detail layout (2016 sample, portrait) `[P31·img]`; the Summary layout of older builds was
never seen.

| Column | Content |
|---|---|
| `Office` | Office name, printed once per office |
| `Group` | Group name, printed once per group (`Administrators`) |
| `Rights` | One right per line, the right's label: `Appointments - Add New Appointment`, `Appointments - Daily View - Full Control`, `Patient - Add New Flash Alerts`, `Patient - Delete Prescriptions`, ... |

Header: practice-group name, title `Security - Group Rights List`. Footer: `Offices: ALL`, title, `Printed : <date time>`,
`By : <username>`, `Page : 1 of 1033`. No totals. Criteria changed between builds [conflict]: 2016 / 2019 `Detail` /
`Summary` + `Office` multi-select (default `ALL`); 2023 `PRINT FORMAT` + `REPORT FORMAT`; 2026 `PRINT FORMAT` only `[L3]`.

Quirks: volume (rights x groups x offices; 1,033 pages in the demo account) and no way to restrict to one group or one
right. Kept: the default run prints every right of every group, grouped by group, with the `Office` band reduced to the
organisation (groups are organisation-wide in DentC, family header). Fixed: group, right and category filters, a
"who holds this right" mode and a matrix format, all additive (research section 9 item 3).

### Parameters - legacy parity

<!-- PARITY:security_list_reports.r03:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:security_list_reports.r03:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Screen result, then a PDF; rows unchanged |
| PRINT FORMAT `Excel` | Screen result, then an XLSX file, one row per group x right; rows unchanged. Added `csv` |
| CLEAR CRITERIA | Every parameter back to its default |
| ADD TO MY FAVORITES | Saved view + favorite |

Dependency rules: none. The report takes no filter in the 2026 capture (family open question 1 for the lost office and
format controls).

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `security_group_ids` (`entity_multi`, `lookup:security_groups`) | `all` | Groups to print |
| `group_status` (`enum`, family) | `active` | Inactive groups grant nothing; `both` prints them flagged |
| `permission_codes` (`entity_multi`, NEW source `permissions`: active catalog codes, value `code`, label `label`, grouped by `category`; no class) | `all` | "Who holds this right": only the picked rights, so the result lists the groups that hold them |
| `permission_categories` (`entity_multi`, NEW source `permission_categories`: distinct `permissions.category`) | `all` | Rights of the picked areas (`Appointments`, `Patient`, `Reports`, ...) |
| `right_search` (`text`, NEW; `max_length` 100) | empty | Case-insensitive contains on `label` or `code` |
| `include_inactive_rights` (`boolean`, NEW) | `false` | `true` adds rows whose `permissions.is_active = false` (codes deactivated by the catalog curation but still linked); flagged `Inactive right`, they grant nothing |
| `show_members` (`boolean`, NEW, `role: query`) | `false` | Adds a trailing block per group listing its active members (`trailer_blocks`), so "who holds right X" reaches the users |
| `report_format` (`enum`: `detail`, `summary`, and the value `matrix` NEW, owner `04_filter_framework.md` section 15) | `detail` | `detail` = legacy layout. `summary` (ours; the legacy Summary was never seen) = rights count per group and category. `matrix` = rights down, groups across, a tick where held (pivot, ENG-31, UX-23), `max_columns` 30 groups |
| `page_break_by` (`enum`: `none`, `security_group` - value NEW, owner `04_filter_framework.md` section 15; `role: layout`) | `none` | `security_group` = one security group per PDF page (r03 has no `group_by`, so the dictionary value `group` does not apply) |

### Data

| Item | Rule |
|---|---|
| Datasets | Passthrough `user_groups` x `user_group_rights` (UQ `group_id, permission_id`, so no row multiplication) x `permissions` (global catalog, joined on `id` only); members for `show_members` from `user_group_memberships` x `rpt_user_dim` |
| Default population | Active groups (`group_status = active`) x active rights (`permissions.is_active = true`), one row per pair |
| `security_group_ids` | `user_groups.id IN (...)` |
| `permission_codes`, `permission_categories`, `right_search` | `permissions.code IN (...)`, `permissions.category IN (...)`, `(label ILIKE :q OR code ILIKE :q)` with escaped wildcards |
| Office scope, date basis | `scope.office_mode = none`; `date_basis = null` |
| Availability | READY (coverage matrix row 92). `availability[]`: `groups_not_per_office`; `curated_catalog` - "Rights follow the DentC catalog (363 curated codes today, 397 active after the 08 2.2 revision); legacy rights removed by the curation are not listed" |
| Not producible | Who granted a right and when (`user_group_rights` has `created_at` only, hard delete); rights per office (none exist in DentC) |
| Cost | At most 2,262 rows by default on a seeded tenant (estimate, family header); `cost_class = interactive`, `escalate_when` row estimate above 20,000 (tenants with many custom groups) |

### Output

Format `detail`, block `main`, shape `table`:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_label` | Office | `text` | `aggregate` | `fixed_outer` band, constant `All offices` |
| `group_id` | Group ID | `id` | `security_groups` | hidden group key |
| `group_name` | Group | `text` | `security_groups` | group level header `{group_name}`; subtotal `count` label `Rights :` |
| `permission_category` | Area | `text` | `security_groups` | `default_visible = false` (shown in `summary`) |
| `permission_label` | Rights | `text` | `security_groups` | key column |
| `permission_code` | Code | `text` | `security_groups` | `default_visible = false`; XLSX / CSV included |
| `is_right_active` | Active Right | `boolean` | `security_groups` | only with `include_inactive_rights` |
| `row_key` | - | `text` | `security_groups` | hidden `row_id_column` = `group_id:permission_code` |

Trailer block `members` (with `show_members`, `placement = after_group`): `user_label`, `user_name` (`security_groups`,
the member's label), `is_active`. Format `summary`: `group_name`, `permission_category`, `right_count` (`integer`,
`security_groups`, subtotal `sum` per group). Format `matrix`: `pivot{row_keys: [permission_category, permission_label],
column_key: group_id, column_label_key: group_name, value_columns: [held], row_totals: true (groups holding the right),
column_totals: true (rights per group)}`. Sort: category, label, code inside the group (default); grand total `Rights :`
distinct codes. Summary header: groups printed, distinct rights printed.

### Visuals and drill-through

Chart: none - a list (the `matrix` format is the visual). Drill: a group header → record `security_group`
(`route_key = security_group_setup`, rights tab); a right label → same report with `permission_codes = [{column:
permission_code}]`, `security_group_ids = all` (who else holds it); a member row → record `security_user`.

### Actions

| Action | Kind | Note |
|---|---|---|
| Open group setup | `navigate` (row, group header) | Security > Groups, rights tab |
| Compare groups | `navigate` (bulk, 2-30 groups) | Same report, `report_format = matrix`, `security_group_ids` = the selection |
| Export selection | `export_selection` (bulk) | Full Control + `reports_export_data_files` |

Not a worklist.

### Export and print

PDF portrait, banded table: group header repeated at the top of each continued page, organisation header, footer
`Offices: ALL`, `By :`, `Page : n of m`; `matrix` landscape with group columns split across pages above 12 groups. XLSX one
sheet per format, one row per group x right (no band rows), frozen header, autofilter, criteria sheet; `matrix` as a typed
grid (`1` / empty). CSV `detail` table. Background run when the escalation rule fires.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Does the 2026 print still match the 2016 layout (Office / Group / Rights, portrait) | Print one Group Rights List |
| 2 | Do rights print by label only, and in which order (alphabetical by label assumed) | Same print |
| 3 | Is the 2026 report really without any filter (family open question 1) | Compare the screen on another tenant |

## User-Group Membership - `lists.user_group_membership`

Lists › Security List, screenshot `4.PNG` - P3 - M - right `reports_lists_security_list_rpts_screen_full_c` (family `lists_security`), key classes `security_groups` and `security_users` - instant - INFERRED

### Purpose

Administrators, office managers and compliance reviewers: the periodic access review per location (quarterly or at audit
time) - for each office, which users sit in which security group; and the check after a role change that the user left
the old group. It takes over the question the vendor used to answer with the `Group Membership` column of User List
`[P32]`. It shows membership, not effective rights: where one group gives `View Only` and another `Full Control`, the
wider right wins `[P62]`; effective access per user is `management.access_rights_matrix`.

### Legacy output

Confidence INFERRED: the report is absent from the vendor's 2023 screenshots and from every article `[P37·img][L3]`.
Comparable: Dentrix Enterprise `Audit Rights Report - Users to Groups`.

| Item | Reconstruction | Basis |
|---|---|---|
| Printed title | `Security - User-Group Membership`, `(Summary)` appended in Summary | family furniture `[I]` |
| Detail | Office → group → member rows (username, name, active flag) | research "Likely output" `[I]` |
| Summary | Number of users per group per office | `[I]` |
| Repetition | A user in several groups appears under each group | `[P35]` |
| Totals | None documented; counts added | `[I]` |

DentC: the office of a row is the member's office assignment (`user_offices`), because groups carry no office (family
header). Users with no assignment are ungated and appear in the trailing band `No office assignment`.

### Parameters - legacy parity

<!-- PARITY:security_list_reports.r04:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| REPORT FORMAT | (no label) (radio_group) | **Detail** / Summary | `report_format` | enum | Detail -> `detail`, Summary -> `summary` | `detail` | replicated | Row grain of the same membership population: detail = one row per office band x security group x member user; summary = one row per office band x security group with member_count = all printed members of the band and group (active members, plus inactive members when include_inactive_users = true) and inactive_member_count = its inactive part (only when include_inactive_users = true). Both layouts are INFERRED (the report is absent from every vendor source) - confirm on the live tool. No dependency on PRINT FORMAT on this report: both formats export to PDF and Excel. |
| SECURITY GROUP | Group (picker) | shown: ALL | `security_group_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog becomes a searchable multi-select on lookup:security_groups (GET /user-groups, id and name only, needs no data class); ALL = no restriction. Filters user_group_memberships.group_id IN (:security_group_ids). Legacy groups are defined per office (the same name under several offices, vendor-documented); DentC user_groups are organisation-level (no office column), so the picker lists each group once and the office of a row comes from the member's office assignment, not from the group. Inactive groups (user_groups.is_active = false, the delete state of the Security Groups screen) are not offered and grant nothing (effective_permissions ignores them); enhancement group_status shows them. Dialog content never captured - confirm on the live tool whether the legacy list shows office-qualified group names. |
| LOCATION | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Deviation (model): the legacy tool presumably filters by the security group's own office (legacy groups are defined per office); DentC groups have no office, so the member's office assignment is used (office_attribution = assigned_office, NEW value for 03 5.1: user_offices.office_id) - confirm by r04 open question 2 (RPT-SLIST-09). Options and default unchanged: LOCATION is the OFFICE/GROUP section spelled differently, Office versus Office Group, see rule d01. |
| LOCATION | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (vendor-documented correction: the box defaults to the session office, SELECT picks others) -> token working_office. Offices (mode office) or office groups (mode office_group); the selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. On this report the office is the member's office assignment (user_offices.office_id, all assignments, not only the primary row): a user assigned to two selected offices is listed under both office bands and counted once in the grand total. Assignments are de-duplicated per (user_id, office_id) before the band join (user_offices has no unique constraint). Users with no office assignment at all (ungated: they reach every office) are listed in a trailing band 'No office assignment' (enhancement include_unassigned_users, default true, INFERRED) and the footer echoes '* Includes users with no office assignment'; the legacy handling of such users is unknown, confirm on the live tool (r04 open question 3). |
| OTHER OPTIONS | Include Inactive Users (checkbox) | **unchecked** | `include_inactive_users` | boolean | - | `false` | replicated | false (legacy default) = members whose users.is_active = true only; true = active and inactive members, with an Active column (detail) and an inactive-member count (summary). DentC keeps memberships of a deactivated user (user_group_memberships is hard-deleted only by an edit), so the checkbox decides whether those rows print. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| LOCATION = Office Group | The SELECT picker chooses office groups defined in Setup > Office Groups (for example regions) instead of offices; when no office groups are defined, a group run covers all offices of the account. This is the OFFICE/GROUP control of the other Lists screens, headed LOCATION on this report - the only Security List report that has it. The vendor documents the behaviour for the Office / Office Group control in general; the report itself is absent from vendor documentation, hence likely. | office_scope (legacy section LOCATION): office_scope.mode = office_group switches the picker to lookup:office_groups and the selection fills office_group_id (one group) or office_group_ids (several, enhancement); mode office fills office_ids (default working_office). A group resolves to its member offices intersected with the offices the caller may read. With no office groups defined (every migrated tenant: office_groups is empty) the group mode offers the single value all, which resolves to every office the caller may read - the legacy 'group run covers all offices'. The resolved office set filters the user's office assignment (office_attribution = assigned_office, NEW, user_offices.office_id), not the security group: DentC security groups are organisation-level and carry no office. Not offered on lists.user_list, lists.group_list, lists.group_rights_list (no LOCATION control, scope.office_mode = none). |
<!-- PARITY:security_list_reports.r04:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Output file only; rows unchanged. Added `csv` |
| REPORT FORMAT `Detail` (default) | One row per office band x group x member |
| REPORT FORMAT `Summary` | One row per office band x group: `Members` = all printed members (and `Inactive Members` = the inactive part, when inactive users are included); title gains `(Summary)` |
| SECURITY GROUP `ALL` (default) | Every active group |
| SECURITY GROUP one or more groups | `user_group_memberships.group_id IN (:security_group_ids)` |
| LOCATION `Office` (default) + box (default working office, legacy `108`) | `office_ids`: members assigned to the selected offices, one band per office |
| LOCATION `Office Group` + group picker | `office_group_id` / `office_group_ids`: offices of the group(s) intersected with the caller's offices; no groups defined → `all` = every readable office (rule d01) |
| Include Inactive Users unticked (default) | Members with `users.is_active = true` only |
| Include Inactive Users ticked | Inactive members added with `Active = no` |
| CLEAR CRITERIA / ADD TO MY FAVORITES | Defaults / saved view + favorite |

Dependency rules: d01 (LOCATION radio switches the picker source between offices and office groups). No control is
greyed; REPORT FORMAT does not depend on PRINT FORMAT.

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `user_ids` (`entity_multi`, `lookup:users`) | `all` | Listed members only (the drill target of User List) |
| `group_status` (`enum`, family) | `active` | `both` adds memberships of deleted groups (they grant nothing) |
| `office_basis` (`enum`, NEW: `all_assignments`, `primary_only`, `unassigned_only`) | `all_assignments` | `primary_only` = only the `is_primary` assignment (home office): each user once; `unassigned_only` = only members without any assignment (drill target of the `No office assignment` band; needs `include_unassigned_users = true`) |
| `include_unassigned_users` (`boolean`, NEW) | `true` (INFERRED: RPT-SLIST-09 flips it to `false` if the live tool lists only assigned users, r04 open question 3) | `false` drops the `No office assignment` band (a strict per-office review). While `true` the footer echoes `* Includes users with no office assignment` |
| `group_by` (`enum`: `office`, `security_group` - value NEW, owner `04_filter_framework.md` section 15) | `office` | `office` = office → group bands (default layout); `security_group` = group bands only with the offices as a column (each membership once) |
| `page_break_by` (`enum`: `none`, `group`; `role: layout`) | `none` | `group` = break on the `group_by` dimension: with the default `group_by = office` one office per PDF page - one review sheet per office manager |

### Data

| Item | Rule |
|---|---|
| Datasets | Passthrough `user_group_memberships` (UQ `user_id, group_id`) x `user_groups` x `rpt_user_dim` (on `user_id`, `is_legacy_login = false`) x `user_offices` (left join) x `rpt_office_dim` (band label, office group) |
| Office scope | `scope.office_mode = optional`, attribution `assigned_office`. Assignments are de-duplicated first (`SELECT DISTINCT user_id, office_id FROM user_offices`, `is_primary` = `bool_or`), because `user_offices` has no unique constraint on (`user_id`, `office_id`) [V] `app/db/models/identity.py` `UserOffice`; this keeps `row_key` unique. A membership row is repeated for each assignment `user_offices.office_id IN (:resolved_office_ids)`; with `include_unassigned_users` the members without any `user_offices` row form the trailing band. Office group mode resolves through `rpt_office_dim.office_group_id` (one group per office) |
| `security_group_ids`, `user_ids` | `group_id IN (...)`, `user_id IN (...)` |
| `include_inactive_users` | `false` adds `rpt_user_dim.is_active = true` |
| `group_status` | `active` adds `user_groups.is_active = true` |
| `office_basis` | `primary_only` adds `user_offices.is_primary = true` (users without a primary row fall to the unassigned band only when they have no assignment at all); `unassigned_only` keeps only the members without any `user_offices` row and ignores the resolved office set |
| Date basis | none (current state) |
| Availability | READY (coverage matrix row 93; "full in SQL; no endpoint joins them" [A]). `availability[]`: `groups_not_per_office`; `no_membership_history` - who added a member and when is not stored (hard delete, `created_at` only) |
| Tenant safety | `user_offices` has no `tenant_id` until DATA-46: the handle joins it only through `users` of the caller's tenant |

### Output

Format `detail`, block `main`, shape `table`:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `office_id`, `office_name` | Office | `id`, `text` | `aggregate` | `fixed_outer` band `Office : {office_name}` (always, also for one office; last band `No office assignment`); subtotal `count_distinct(user_id)` label `Users :` |
| `group_id`, `group_name` | Group | `id`, `text` | `security_groups` | key; level header `Group : {group_name}`; subtotal `count` label `Members :` |
| `user_id` | User ID | `id` | `security_groups` | hidden; drill key |
| `user_label` | Username | `text` | `security_groups` | key column (member label) |
| `user_name` | Name | `text` | `security_groups` | member label |
| `is_active` | Active | `boolean` | `security_users` | shown with `include_inactive_users` |
| `role` | User Role/Type | `text` | `security_users` | `default_visible = false` |
| `is_full_access_role` | Full Access Role | `boolean` | `security_users` | - |
| `is_primary_office` | Home Office | `boolean` | `security_users` | - |
| `row_key` | - | `text` | `security_groups` | hidden `row_id_column` = `office_id:group_id:user_id` |

Format `summary`, block `main`: `office_id`, `office_name` (band), `group_id`, `group_name` (key), `member_count`
(`integer`, `security_groups`: all printed members of the band and group - active, plus inactive with
`include_inactive_users`; office subtotals `sum` label `Memberships :` and `count_distinct(user_id)` label `Users :` from
the totals builder, as in detail), `inactive_member_count` (`integer`, `security_groups`: the inactive part of
`member_count`, only with `include_inactive_users`). Grand totals: `count_distinct(user_id)` `Users :` and distinct memberships `Memberships :`
(totals builder, users repeat across bands). Sort: office name, group name, then `last_name`, `first_name`, `user_id`.
Summary header: users listed, groups listed, users without an office assignment.

### Visuals and drill-through

Chart (summary only): stacked bar `members_by_group` (category `group_name`, series per office, `top_n` 15). Drill: a
member → record `security_user`; a group header → `lists.group_rights_list` with `security_group_ids = [{group:
group_id}]`; a summary count → `rows` (`report_format = detail`, `office_ids = [{group: office_id}]`,
`security_group_ids = [{group: group_id}]`); on the `No office assignment` band (`office_id` null) the count drills with
`office_scope: {literal: {all_offices: true}}`, `include_unassigned_users: {literal: true}`, `office_basis: {literal:
unassigned_only}` and the same `security_group_ids`.

### Actions

| Action | Kind | Note |
|---|---|---|
| Open user setup | `navigate` (row) | Security > Users, groups tab |
| Show effective access | `navigate` (row) | `management.access_rights_matrix` for the user |
| Review task | `create_task` (bulk) | Task to the office manager per selected office band ("confirm these memberships") |
| Export selection | `export_selection` (bulk) | Full Control + `reports_export_data_files` |

Doubles as the periodic access-review worklist when scheduled with `page_break_by = group` (`group_by = office`).

### Export and print

PDF portrait, banded table (office band, group header, member rows), office or organisation header, footer echo with
`Offices :` / `Office Group :`, `Groups :`, `Format :`, `* Includes users with no office assignment` (default), `By :`. XLSX one sheet per format, office and group as columns (no
band rows), frozen header, autofilter, criteria sheet. CSV the same. Never background.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Detail and Summary layouts (columns, grouping, counts) | Print both formats |
| 2 | Which office LOCATION filters in the legacy tool: the office the group is defined in (legacy groups are per office) or the user's office assignment | Run for one office with a user assigned elsewhere but member of this office's group |
| 3 | How users without any office assignment are treated | Run for one office with such a user in a group |
| 4 | Does the Group picker list office-qualified group names | Open SELECT on a two-office account |
| 5 | Printed title (`(Summary)` suffix) and footer criteria echo (`Format :`, `Office Group :`) of Detail and Summary | The same two prints as question 1 |

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-SLIST-01 | Family base module `app/reports/definitions/lists/security/_common.py`: shared declarations (`output_format`, `include_inactive_users`, `security_group_ids`, `group_status`), `scope.office_mode = none` with the S-10 justification note on r01-r03, organisation header, `Security - ` title prefix, footer echo labels, count totals, `legacy_names[]` aliases | P3 | M | DATA-05, ENG-03, ENG-11, ENG-23, FLT-01, FLT-03 | Lint passes for the four definitions; FLT-20 default-run test reproduces every legacy default of the parity file (r04 runs for the working office, the others for the organisation); a user in two groups is counted once in each grand total |
| RPT-SLIST-02 | Passthrough datasets `user_groups`, `user_group_memberships`, `user_group_rights` + `permissions` (join through `permission_id` only), `user_offices` with tenant scope through `users.tenant_id` (switch to the native tenant column once DATA-46 lands; not a blocker) | P3 | M | DATA-45, ENG-09 | Each handle returns only rows of the caller's tenant (two-tenant fixture); `permissions` is unreachable except through `user_group_rights`; no handle exposes `password_hash` or `signature_*` |
| RPT-SLIST-03 | NEW `rpt_user_dim` columns (`username`, `first_name`, `last_name`, `short_id`, `must_change_password`, `is_legacy_user`, `legacy_activation_completed`, `updated_at`, `assigned_office_ids`, `active_group_names`, `has_login_restriction`, `ip_rule_count`, `is_full_access_role`, `activation_state`) and the attribution value `assigned_office` (request to 03 2.4 and 5.1) | P3 | S | DATA-05, DATA-45 | Dimension still one row per `user_key`; `active_group_names` omits a group with `is_active = false` while `group_names` keeps it; `assigned_office_ids` equals the `user_offices` rows of the fixture |
| RPT-SLIST-04 | Option sources `security_groups` (active groups, id and name, no class) and `users` (accounts only, `is_legacy_login = false`, active and inactive with a status flag) used by the family | P3 | S | FLT-06, FLT-09 | A caller without `security_users` / `security_groups` still loads both pickers but receives id and label only; legacy login strings never appear as options |
| RPT-SLIST-05 | NEW enhancement keys `group_status`, `assigned_office_ids` and the report-specific keys of the sections registered in 04 section 15 with lint vectors | P3 | S | FLT-01, FLT-27 | Defaults add no predicate beyond the legacy run; `group_status = both` adds inactive groups and nothing else |
| RPT-SLIST-06 | Rights and classes of the family: `lists_security` Full Control code on the four definitions, key classes `security_users` (r01), `security_groups` (r02, r03), both (r04), export second key, removal of non-key user attributes for a caller with `security_groups` only | P3 | S | SEC-01, SEC-03, SEC-07, SEC-37 | A caller holding the family but not `setup_security_users_screen_*` gets 403 `data_class_denied` on r01 and r04; a caller with `security_groups` only runs r03; no caller reads more than the Security Users / Groups screens would show |
| RPT-SLIST-07 | Drill and actions: Security Users and Security Groups record drills with their screen rights, cross-links to `management.access_rights_matrix` and `management.access_change_log`, `export_selection` | P3 | S | ENG-30, ENG-49, UX-22, SEC-30 | Clicking a user opens Security > Users on that user; the drill is refused without the screen right; the cross-link opens the matrix with `security_group_ids` / `user_ids` carried over |
| RPT-SLIST-08 | PDF and XLSX layouts of the family: banded tables (portrait r02, r03, r04; landscape r01), organisation header, footer echo with `By :`, flat XLSX sheets with a criteria sheet | P3 | S | ENG-23, ENG-27 | Layout checklist per report passes; XLSX has no merged cells and typed date cells; r03 PDF prints group headers repeated on each page |
| RPT-SLIST-09 | Live legacy verification of the family's open questions (1-6 and per report) and update of the decisions file, the parity tables and the layouts | P3 | M | FLT-23 | Each INFERRED layout (r01 columns, r02, r04) is confirmed or corrected from one generated sample; the r04 LOCATION basis (group office versus member assignment, r04 open question 2) and the unassigned-band default (r04 open question 3) are confirmed by one run each, `include_unassigned_users` flipped to `false` if the legacy lists only assigned users; `build_parity.py` prints PARITY VALID after the update; r04 leaves `status = beta` only after this item |
| RPT-SLIST-10 | `lists.user_list` definition: `detail` format, legacy parameters, `Group Membership` from `active_group_names`, `Full access` flag, legacy-login exclusion, drills to Security Users and to `lists.user_group_membership` | P3 | S | RPT-SLIST-01, RPT-SLIST-03, RPT-SLIST-06 | Default run lists every active account of the fixture tenant and no legacy login string; ticking Include Inactive Users adds exactly the inactive accounts; a caller without `security_groups` gets the list without `Group Membership` |
| RPT-SLIST-11 | `lists.user_list` enhancements: `summary` format, `security_group_ids`, `assigned_office_ids`, `not_signed_in_within_days`, `access_flags`, `sort_by`, row and bulk actions | P3 | S | RPT-SLIST-10, RPT-SLIST-05, ENG-49 | `access_flags = ["no_group"]` returns exactly the fixture users without an active group; `not_signed_in_within_days = 90` includes never-signed-in users; `access_flags = ["no_office_assignment"]` returns exactly the unassigned users |
| RPT-SLIST-12 | `lists.group_list` definition with member, active-member and right counts, `group_status`, `group_flags`, `include_member_names` | P3 | S | RPT-SLIST-01, RPT-SLIST-02 | Counts equal the fixture memberships and active rights; a deactivated group is absent by default and present with `group_status = both`; member grand total counts a user in two groups once |
| RPT-SLIST-13 | `lists.group_rights_list` `detail` format with the legacy layout, group subtotals, the filters `security_group_ids`, `permission_codes`, `permission_categories`, `right_search`, `include_inactive_rights`, `show_members` trailer block, option sources `permissions` and `permission_categories` | P3 | M | RPT-SLIST-01, RPT-SLIST-02, FLT-09, ENG-11 | Default run row count = sum over active groups of their active rights; `permission_codes = [one code]` lists exactly the groups holding it; deactivated codes appear only with `include_inactive_rights`; PDF repeats the group header on continued pages |
| RPT-SLIST-14 | `lists.group_rights_list` formats `summary` and `matrix` (pivot block, column split in PDF, typed XLSX grid), `escalate_when` to background above 20,000 rows | P3 | M | RPT-SLIST-13, ENG-31, UX-23, ENG-38 | Matrix cell set equals the detail rows of the same run; column totals equal the per-group subtotals of `detail`; a synthetic 25,000-row tenant runs in the background |
| RPT-SLIST-15 | `lists.user_group_membership` definition: `detail` / `summary`, LOCATION `office_scope` with attribution `assigned_office`, trailing `No office assignment` band, title template, drills and chart | P3 | M | RPT-SLIST-01, RPT-SLIST-02, RPT-SLIST-03, FLT-03 | Default run (working office) lists exactly the fixture memberships of users assigned to that office plus unassigned members; a duplicated `user_offices` row (same user and office twice) lists the member once in the band; a user assigned to two selected offices appears in both bands and once in `Users :`; office-group mode with no groups resolves to every readable office; summary counts equal the detail rows |
| RPT-SLIST-16 | `lists.user_group_membership` enhancements: `user_ids`, `group_status`, `office_basis`, `include_unassigned_users`, `group_by`, `page_break_by`, review-task bulk action | P3 | S | RPT-SLIST-15, RPT-SLIST-05, ENG-49 | `office_basis = primary_only` lists each user at most once; `group_by = security_group` lists each membership once with the offices as a column; one PDF page per office with `page_break_by = group` and `group_by = office`; `office_basis = unassigned_only` lists exactly the `No office assignment` band |

<!-- ASSEMBLED from catalog/parts/security_list_reports/ (00_header.md, 10_reports.md). Edit this document directly from now on. -->
