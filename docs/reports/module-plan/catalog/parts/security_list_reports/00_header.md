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
| `assigned_office_ids` (`entity_multi`, `lookup:offices`) | r01 | `all` | Users with at least one `user_offices` row in the list; the token `none` = users with no office assignment (ungated). Not an `office_scope`: the report stays `office_mode = none`, so an office-restricted caller still sees the organisation roster, as the Security Users screen shows it | `all` adds no predicate |

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
`ip_rule_count` (active `user_ip_rules`). Never columns: `password_hash`, `signature_*`, `image_url`, tokens (08 5.5, D-13).

`freshness = live`, `cacheable = false` on all four: an access review must show a right removed a minute ago. Volumes: users
and groups in the tens to hundreds; r03 is groups x active rights (13 seeded groups x up to 261 curated rights, about 2,000
rows; the legacy demo account printed 1,033 pages because groups repeated per office). Migrated history: none of these lists
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
| Footer criteria echo | `criteria_echo = footer`: r01 `Users : ALL` or names, `* Excludes Inactive Users` when unticked (the wording of the patient-list echo `* Excludes Inactive Patients`, research 3.4 - inferred for users); r02 and r03 `Offices: ALL` (sample-confirmed on r03; printed on r02 for the same reason: groups are organisation-wide); r04 `Offices :` / `Office Group :`, `Groups :`, `Format :` and the inactive-users line. Non-default enhancements are echoed after the legacy criteria |
| Tail | Title repeated, `Printed : <m/d/yyyy h:mm:ss AM/PM>` in office time, `By : <user>` (sample-confirmed on r03), `Page : n of m`. The vendor line `PlanetDDS (c) 2003 - <year>` is not reproduced (DentC footer instead) |

### Rights and data classes

| Item | Rule |
|---|---|
| Right family | `lists_security` = `reports_lists_security_list_rpts_screen_full_c` only (security card 2.2; kept code, truncated legacy spelling). Full Control only: there is no View Only level, any use needs the code (security card 2.1). Print and PDF come with the code; XLSX / CSV also need `reports_export_data_files` |
| Key class per report | Security card 2.3: r01 `security_users`; r02 and r03 `security_groups`; r04 both. A caller without the key class is refused with 403 `data_class_denied` (02 3.3), so the report can never show more than the owning screen (T-12). The classes are granted by `setup_security_users_screen_view_only` / `_full_control` and `setup_security_groups_screen_view_only` / `_full_control` (security card 5.3) |
| Column classes | Account attributes (username, e-mail, phone, role, status, last login, office assignments, provider links, `patient_access_level`, login restrictions) = `security_users`. Group names, descriptions, rights, memberships = `security_groups`. On r02, r03 and r04 the member's id and label (`user_label`, `user_name`) are `security_groups` (the class covers "the member's id and label", security card 5.1); any other user attribute on those reports is `security_users` and is dropped for a caller without it. Office labels and counts = `aggregate` |
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

<!-- WORK-ITEMS -->
| RPT-SLIST-01 | Family base module `app/reports/definitions/lists/security/_common.py`: shared declarations (`output_format`, `include_inactive_users`, `security_group_ids`, `group_status`), `scope.office_mode = none` with the S-10 justification note on r01-r03, organisation header, `Security - ` title prefix, footer echo labels, count totals, `legacy_names[]` aliases | P3 | M | DATA-05, ENG-03, ENG-11, ENG-23, FLT-01, FLT-03 | Lint passes for the four definitions; FLT-20 default-run test reproduces every legacy default of the parity file (r04 runs for the working office, the others for the organisation); a user in two groups is counted once in each grand total |
| RPT-SLIST-02 | Passthrough datasets `user_groups`, `user_group_memberships`, `user_group_rights` + `permissions` (join through `permission_id` only), `user_offices` with tenant scope through `users.tenant_id` until DATA-46 lands | P3 | M | DATA-45, DATA-46, ENG-09 | Each handle returns only rows of the caller's tenant (two-tenant fixture); `permissions` is unreachable except through `user_group_rights`; no handle exposes `password_hash` or `signature_*` |
| RPT-SLIST-03 | NEW `rpt_user_dim` columns (`username`, `first_name`, `last_name`, `short_id`, `must_change_password`, `is_legacy_user`, `legacy_activation_completed`, `updated_at`, `assigned_office_ids`, `active_group_names`, `has_login_restriction`, `ip_rule_count`) and the attribution value `assigned_office` (request to 03 2.4 and 5.1) | P3 | S | DATA-05, DATA-45 | Dimension still one row per `user_key`; `active_group_names` omits a group with `is_active = false` while `group_names` keeps it; `assigned_office_ids` equals the `user_offices` rows of the fixture |
| RPT-SLIST-04 | Option sources `security_groups` (active groups, id and name, no class) and `users` (accounts only, `is_legacy_login = false`, active and inactive with a status flag) used by the family | P3 | S | FLT-06, FLT-09 | A caller without `security_users` / `security_groups` still loads both pickers but receives id and label only; legacy login strings never appear as options |
| RPT-SLIST-05 | NEW enhancement keys `group_status`, `assigned_office_ids` and the report-specific keys of the sections registered in 04 section 15 with lint vectors | P3 | S | FLT-01, FLT-27 | Defaults add no predicate beyond the legacy run; `group_status = both` adds inactive groups and nothing else |
| RPT-SLIST-06 | Rights and classes of the family: `lists_security` Full Control code on the four definitions, key classes `security_users` (r01), `security_groups` (r02, r03), both (r04), export second key, removal of non-key user attributes for a caller with `security_groups` only | P3 | S | SEC-01, SEC-03, SEC-07, SEC-37 | A caller holding the family but not `setup_security_users_screen_*` gets 403 `data_class_denied` on r01 and r04; a caller with `security_groups` only runs r03; no caller reads more than the Security Users / Groups screens would show |
| RPT-SLIST-07 | Drill and actions: Security Users and Security Groups record drills with their screen rights, cross-links to `management.access_rights_matrix` and `management.access_change_log`, `export_selection` | P3 | S | ENG-30, ENG-49, UX-22, SEC-30 | Clicking a user opens Security > Users on that user; the drill is refused without the screen right; the cross-link opens the matrix with `security_group_ids` / `user_ids` carried over |
| RPT-SLIST-08 | PDF and XLSX layouts of the family: banded tables (portrait r02, r03, r04; landscape r01), organisation header, footer echo with `By :`, flat XLSX sheets with a criteria sheet | P3 | S | ENG-23, ENG-27 | Layout checklist per report passes; XLSX has no merged cells and typed date cells; r03 PDF prints group headers repeated on each page |
| RPT-SLIST-09 | Live legacy verification of the family's open questions (1-6 and per report) and update of the decisions file, the parity tables and the layouts | P3 | M | FLT-23 | Each INFERRED layout (r01 columns, r02, r04) is confirmed or corrected from one generated sample; `build_parity.py` prints PARITY VALID after the update; r04 leaves `status = beta` only after this item |
<!-- /WORK-ITEMS -->
