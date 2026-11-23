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

<!-- PARITY:security_list_reports.r01 -->

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
| `assigned_office_ids` (`entity_multi`, `lookup:offices`, family NEW; `accepts_none`) | `all` | Users assigned to one of the offices; `none` = users with no office assignment (they reach every office) |
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
| `assigned_office_ids` | `assigned_office_ids && :ids`; `none` = `cardinality(assigned_office_ids) = 0` |
| `not_signed_in_within_days` | `last_login_at IS NULL OR last_login_at < now() - :n days` (naive UTC as stored) |
| Office scope, date basis | `scope.office_mode = none` (08 S-10 a); `date_basis = null` (current state) |
| Availability | READY (coverage matrix row 90: "no login history exists"). `availability[]`: `last_login_only` - only the latest sign-in is stored (no history, no failed attempts); `migrated_created_at` - `Created` of migrated users is the migration time stamp |
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
with `user_ids = {column: user_id}`, `office_scope` = `all_offices`, `report_format = detail`; the `Full access :` total →
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

<!-- PARITY:security_list_reports.r02 -->

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
| `include_member_names` (`boolean`, NEW, `role: query`) | `false` | Adds the column `Members` (comma list of member labels) |

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
| `member_names` | Members | `text` | `security_groups` | only with `include_member_names` |
| `created_at` | Created | `date` | `security_groups` | `default_visible = false` |

Sort: `group_name`, `group_id` (default, no `sort_by`). No group levels, no page break. Summary header: cards over block
totals - groups listed, groups without members, distinct members.

### Visuals and drill-through

Chart: none - a list. Drill: a group cell → record `security_group` (`route_key = security_group_setup`, right
`setup_security_groups_screen_view_only` or `_full_control`); `Rights` → `lists.group_rights_list` with
`security_group_ids = [{column: group_id}]`; `Members` → `lists.user_group_membership` with `security_group_ids =
[{column: group_id}]`, `office_scope` = `all_offices`, `report_format = detail`.

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

<!-- PARITY:security_list_reports.r03 -->

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
| `report_format` (`enum`, NEW for this report: `detail`, `summary`, `matrix`) | `detail` | `detail` = legacy layout. `summary` (ours; the legacy Summary was never seen) = rights count per group and category. `matrix` = rights down, groups across, a tick where held (pivot, ENG-31, UX-23), `max_columns` 30 groups |
| `page_break_by` (`enum`: `none`, `group`; `role: layout`) | `none` | One group per PDF page |

### Data

| Item | Rule |
|---|---|
| Datasets | Passthrough `user_groups` x `user_group_rights` (UQ `group_id, permission_id`, so no row multiplication) x `permissions` (global catalog, joined on `id` only); members for `show_members` from `user_group_memberships` x `rpt_user_dim` |
| Default population | Active groups (`group_status = active`) x active rights (`permissions.is_active = true`), one row per pair |
| `security_group_ids` | `user_groups.id IN (...)` |
| `permission_codes`, `permission_categories`, `right_search` | `permissions.code IN (...)`, `permissions.category IN (...)`, `(label ILIKE :q OR code ILIKE :q)` with escaped wildcards |
| Office scope, date basis | `scope.office_mode = none`; `date_basis = null` |
| Availability | READY (coverage matrix row 92). `availability[]`: `groups_not_per_office`; `curated_catalog` - "Rights follow the DentC catalog (363 curated codes); legacy rights removed by the curation are not listed" |
| Not producible | Who granted a right and when (`user_group_rights` has `created_at` only, hard delete); rights per office (none exist in DentC) |
| Cost | About 2,000 rows by default on a seeded tenant; `cost_class = interactive`, `escalate_when` row estimate above 20,000 (tenants with many custom groups) |

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

<!-- PARITY:security_list_reports.r04 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Output file only; rows unchanged. Added `csv` |
| REPORT FORMAT `Detail` (default) | One row per office band x group x member |
| REPORT FORMAT `Summary` | One row per office band x group: `Members` (and `Inactive Members` when inactive users are included); title gains `(Summary)` |
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
| `office_basis` (`enum`, NEW: `all_assignments`, `primary_only`) | `all_assignments` | `primary_only` = only the `is_primary` assignment (home office): each user once |
| `include_unassigned_users` (`boolean`, NEW) | `true` | `false` drops the `No office assignment` band (a strict per-office review) |
| `group_by` (`enum`: `office`, `group`) | `office` | `office` = office → group bands (default layout); `group` = group bands only with the offices as a column (each membership once) |
| `page_break_by` (`enum`: `none`, `office`; `role: layout`) | `none` | One office per PDF page - one review sheet per office manager |

### Data

| Item | Rule |
|---|---|
| Datasets | Passthrough `user_group_memberships` (UQ `user_id, group_id`) x `user_groups` x `rpt_user_dim` (on `user_id`, `is_legacy_login = false`) x `user_offices` (left join) x `rpt_office_dim` (band label, office group) |
| Office scope | `scope.office_mode = optional`, attribution `assigned_office`: a membership row is repeated for each assignment `user_offices.office_id IN (:resolved_office_ids)`; with `include_unassigned_users` the members without any `user_offices` row form the trailing band. Office group mode resolves through `rpt_office_dim.office_group_id` (one group per office) |
| `security_group_ids`, `user_ids` | `group_id IN (...)`, `user_id IN (...)` |
| `include_inactive_users` | `false` adds `rpt_user_dim.is_active = true` |
| `group_status` | `active` adds `user_groups.is_active = true` |
| `office_basis` | `primary_only` adds `user_offices.is_primary = true` (users without a primary row fall to the unassigned band only when they have no assignment at all) |
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
(`integer`, `security_groups`, subtotal `sum` per office), `inactive_member_count` (`integer`, `security_groups`, only
with `include_inactive_users`). Grand totals: `count_distinct(user_id)` `Users :` and distinct memberships `Memberships :`
(totals builder, users repeat across bands). Sort: office name, group name, then `last_name`, `first_name`, `user_id`.
Summary header: users listed, groups listed, users without an office assignment.

### Visuals and drill-through

Chart (summary only): stacked bar `members_by_group` (category `group_name`, series per office, `top_n` 15). Drill: a
member → record `security_user`; a group header → `lists.group_rights_list` with `security_group_ids = [{group:
group_id}]`; a summary count → `rows` (`report_format = detail`, `office_ids = [{group: office_id}]`,
`security_group_ids = [{group: group_id}]`).

### Actions

| Action | Kind | Note |
|---|---|---|
| Open user setup | `navigate` (row) | Security > Users, groups tab |
| Show effective access | `navigate` (row) | `management.access_rights_matrix` for the user |
| Review task | `create_task` (bulk) | Task to the office manager per selected office band ("confirm these memberships") |
| Export selection | `export_selection` (bulk) | Full Control + `reports_export_data_files` |

Doubles as the periodic access-review worklist when scheduled with `page_break_by = office`.

### Export and print

PDF portrait, banded table (office band, group header, member rows), office or organisation header, footer echo with
`Offices :` / `Office Group :`, `Groups :`, `Format :`, `By :`. XLSX one sheet per format, office and group as columns (no
band rows), frozen header, autofilter, criteria sheet. CSV the same. Never background.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Detail and Summary layouts (columns, grouping, counts) | Print both formats |
| 2 | Which office LOCATION filters in the legacy tool: the office the group is defined in (legacy groups are per office) or the user's office assignment | Run for one office with a user assigned elsewhere but member of this office's group |
| 3 | How users without any office assignment are treated | Run for one office with such a user in a group |
| 4 | Does the Group picker list office-qualified group names | Open SELECT on a two-office account |

<!-- WORK-ITEMS -->
| RPT-SLIST-10 | `lists.user_list` definition: `detail` format, legacy parameters, `Group Membership` from `active_group_names`, `Full access` flag, legacy-login exclusion, drills to Security Users and to `lists.user_group_membership` | P3 | S | RPT-SLIST-01, RPT-SLIST-03, RPT-SLIST-06 | Default run lists every active account of the fixture tenant and no legacy login string; ticking Include Inactive Users adds exactly the inactive accounts; a caller without `security_groups` gets the list without `Group Membership` |
| RPT-SLIST-11 | `lists.user_list` enhancements: `summary` format, `security_group_ids`, `assigned_office_ids` (with `none`), `not_signed_in_within_days`, `access_flags`, `sort_by`, row and bulk actions | P3 | S | RPT-SLIST-10, RPT-SLIST-05, ENG-49 | `access_flags = ["no_group"]` returns exactly the fixture users without an active group; `not_signed_in_within_days = 90` includes never-signed-in users; `assigned_office_ids = none` returns the unassigned users |
| RPT-SLIST-12 | `lists.group_list` definition with member, active-member and right counts, `group_status`, `group_flags`, `include_member_names` | P3 | S | RPT-SLIST-01, RPT-SLIST-02 | Counts equal the fixture memberships and active rights; a deactivated group is absent by default and present with `group_status = both`; member grand total counts a user in two groups once |
| RPT-SLIST-13 | `lists.group_rights_list` `detail` format with the legacy layout, group subtotals, the filters `security_group_ids`, `permission_codes`, `permission_categories`, `right_search`, `include_inactive_rights`, `show_members` trailer block, option sources `permissions` and `permission_categories` | P3 | M | RPT-SLIST-01, RPT-SLIST-02, FLT-09, ENG-11 | Default run row count = sum over active groups of their active rights; `permission_codes = [one code]` lists exactly the groups holding it; deactivated codes appear only with `include_inactive_rights`; PDF repeats the group header on continued pages |
| RPT-SLIST-14 | `lists.group_rights_list` formats `summary` and `matrix` (pivot block, column split in PDF, typed XLSX grid), `escalate_when` to background above 20,000 rows | P3 | M | RPT-SLIST-13, ENG-31, UX-23, ENG-38 | Matrix cell set equals the detail rows of the same run; column totals equal the per-group subtotals of `detail`; a synthetic 25,000-row tenant runs in the background |
| RPT-SLIST-15 | `lists.user_group_membership` definition: `detail` / `summary`, LOCATION `office_scope` with attribution `assigned_office`, trailing `No office assignment` band, title template, drills and chart | P3 | M | RPT-SLIST-01, RPT-SLIST-02, RPT-SLIST-03, FLT-03, DATA-46 | Default run (working office) lists exactly the fixture memberships of users assigned to that office plus unassigned members; a user assigned to two selected offices appears in both bands and once in `Users :`; office-group mode with no groups resolves to every readable office; summary counts equal the detail rows |
| RPT-SLIST-16 | `lists.user_group_membership` enhancements: `user_ids`, `group_status`, `office_basis`, `include_unassigned_users`, `group_by`, `page_break_by`, review-task bulk action | P3 | S | RPT-SLIST-15, RPT-SLIST-05, ENG-49 | `office_basis = primary_only` lists each user at most once; `group_by = group` lists each membership once with the offices as a column; one PDF page per office with `page_break_by = office` |
<!-- /WORK-ITEMS -->
