## Insurance Plan List - `lists.insurance_plan_list`

Lists - Setup, `2.PNG` (group INSURANCE, row 1 right) - P3 - M - `lists_setup` alone - interactive - PARTIALLY DOCUMENTED

### Purpose

| Who | When | Task it supports |
|---|---|---|
| Insurance coordinator | Daily / weekly (default run = plans modified today) | Audit of plan entry: which plans were created or changed, by whom; catch a wrong group number or carrier before claims go out |
| Insurance coordinator | Before `Utilities > Consolidate Duplicate Insurance Plans` | Find duplicate plans (same carrier + employer + group number, the vendor's plan identity) |
| Office manager / compliance | On demand | Review who changed shared plan rows (one plan row is shared by every patient linked to it) |

The created / modified / user filters make this the only Setup list that doubles as a change audit (research 8, [I]).

### Legacy output

Confidence PARTIALLY DOCUMENTED: purpose `[P9]`, plan fields from the single-plan document `[P47·img]`; no sample of the
list itself exists, so the layout below is a reconstruction (INFERRED) to confirm on the live tool.

| Element | Legacy (as far as known) | DentC |
|---|---|---|
| Printed title | `Insurance Plan List` | same; no title template |
| Header line 1 | Practice-group name (account-wide list) | organisation name (header page furniture) |
| Columns, in order [I] | Plan ID, carrier, employer, group number, plan type, created on / by, modified on / by, used or not used | the same order (Output) |
| Grouping | Probably banded by the SORT BY key (carrier or employer) [I] | flat table sorted by `sort_by`; banding only if the live check shows bands (open question 2) |
| Totals | Row count [I] | `Plans : n` |
| Orientation | unknown | landscape (header page furniture) |

Quirks kept: (1) the default run (Modified On ticked, `today` .. `today`) lists only plans modified today, even though the
date boxes were captured greyed - AD-8 keeps the default; the screen says "Modified today" in the criteria chips so an empty
result is not mistaken for an empty catalog. (2) A plan has no name: it is identified by carrier + employer + group
number. Quirk fixed: legacy users exist only as login strings on migrated plans; DentC prints the user label and keeps the
legacy string as label (never a filter value).

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r02 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Screen preview, then PDF (landscape). Rows unchanged |
| PRINT FORMAT `Excel` | Screen preview, then XLSX (flat typed table). Rows unchanged; `csv` added |
| SORT BY `Carrier` (default) | Rows ordered carrier name, employer name, group number, plan id |
| SORT BY `Employer` | Rows ordered employer name, carrier name, group number, plan id |
| DATE RANGE `Created On` ticked | Range applies to the plan's created date (`created_date` member of `date_basis_set`) |
| DATE RANGE `Created On` unticked (default) | Created date not tested |
| DATE RANGE `Modified On` ticked (default) | Range applies to the plan's last-modified date (`modified_date` member) |
| DATE RANGE `Modified On` unticked | Modified date not tested |
| Both ticked | Plan kept when created OR modified in the range (INFERRED, 04 11.5) |
| Neither ticked | No date restriction; Start / End Date disabled (INFERRED, 04 11.5) |
| Start Date (default today) | Inclusive lower bound, office-local date of the working office |
| End Date (default today) | Inclusive upper bound |
| EMPLOYER `ALL` (default) | No employer predicate; plans without an employer kept |
| EMPLOYER selection | `insurance_plans.employer_id IN (...)`; plans without an employer dropped |
| USER `Include User in Filters` ticked (default) | USER picker applies |
| USER `Include User in Filters` unticked | USER picker disabled; `user_ids` forced to `all` |
| USER `ALL` (default) | No user predicate |
| USER selection | Plans whose creator (Created On only), modifier (Modified On only) or either (both / neither) is a selected user; migrated legacy-string users match only under `ALL` |
| CARRIER `ALL` (default) | No carrier predicate |
| CARRIER selection | `insurance_plans.carrier_id IN (...)` |
| GROUP # empty (default) | No predicate |
| GROUP # text | Case-insensitive contains match on `group_number` (INFERRED: exact versus partial to confirm) |

Dependency rules: `date_from`, `date_to` `enabled_when ["not_empty", "date_basis_set"]`; `user_ids` `enabled_when ["truthy",
"include_user_in_filters"]`; the user role follows `date_basis_set` (above). `group_number` is a `text` value: never written to
the URL (04 12). No dynamic rule in the parity file.

### Parameters - enhancements

| Key (type) | Default | Effect | Owner |
|---|---|---|---|
| `date_range` presets (`last_7_days`, `this_month`, `this_year`) | `today` | Saved view "Plans changed this week" = `modified_date`, `last_7_days` | 04 7.4 |
| `user_ids` token `current_user` | `all` | Saved view "Plans I changed" | 04 2.3 |
| `plan_usage_status` (`enum`: `all`, `used`, `unused`) | `all` | `unused` = the Inactive Plans List rule (no live `patient_insurance` link); `used` = at least one | NEW, 04 section 15 |
| `duplicates_only` (`boolean`) | `false` | Keeps plans whose (`carrier_id`, `employer_id`, normalised `group_number` = `upper(btrim)` without spaces and dashes) is shared by another plan of the tenant; adds `duplicate_set_no` column; default sort becomes duplicate set, then plan id | NEW, 04 section 15 |
| `insurance_plan_types` (`entity_multi`, `lookup:definitions:PLANTYPE`) | `all` | `insurance_plans.plan_type` normalised through `rpt_value_map` domain `plan_type`. Not `plan_type` (that key is the payment-plan type) | NEW, 04 section 15 |
| `plan_coverage_type` (`enum`: `both`, `dental`, `medical`) | `both` | `insurance_plans.coverage_type` | NEW, 04 section 15 |
| `employer_ids`, `carrier_ids` multi-select | `all` | Legacy single SELECT dialog becomes a list | 04 12 |

### Data

| Item | Rule |
|---|---|
| Datasets | `insurance_plans` (passthrough, DATA-45) joined to `insurance_carriers` (name) and `employers` (name) on their ids; `rpt_user_dim` for `updated_by`; `patient_insurance` for usage (`EXISTS` / correlated count, never a join that multiplies rows) |
| Created date | Migrated plan (`legacy_id` not null): `created_on::date` as stored (legacy wall clock, data card 4.3). App plan: `created_at` converted to the working office's time zone |
| Modified date | `updated_by IS NOT NULL` (edited in DentC): `updated_at` office-local; else `modified_on::date`; else (app plan never edited) the created date. Not `coalesce(updated_at, modified_on)`: `updated_at` holds the migration time on every unedited migrated plan, so that rule would mark every migrated plan "modified on the migration day" (parity concern r02.s03.c02) |
| Created by | Migrated: `created_by` (legacy string). App: **no stamp exists** - `CRUDBase.create` writes an actor only into integer `created_by` columns and this one is text [V `app/crud/base.py` L244-247]; the creator is only in `audit_logs`. NEW `insurance_plans.created_by_user_id` stamp plus backfill from the create audit event (RPT-STLIST-41) |
| Modified by | `updated_by` -> `rpt_user_dim.user_label`, else `modified_by` (legacy string) - same rule as `GET /insurance-plans/{id}/history` [V `insurance_plan_edit_service.py` L466-469] |
| `user_ids` | `plan_audit_user` role (header): `created_by_user_id` / `updated_by` `IN (:user_ids)` per `date_basis_set`; legacy strings never match a selection |
| `group_number` | `group_number ILIKE '%' || :v || '%'` on a trigram index (RPT-STLIST-03; today's `group_number_contains` takes about 20 s on 31k plans) |
| Usage | `used` = `EXISTS (patient_insurance WHERE ins_plan_id = plan AND is_active)` - the rule of `GET /insurance-plans/{id}/usage` [V `insurance_plan_edit_service.py` L121-126] |
| Scope | `scope.office_mode = none` (plans are tenant catalog rows); no provider attribution; `date_basis` null (basis chosen by `date_basis_set`) |
| Availability | READY (coverage matrix row 96: creator / modifier are legacy strings). `availability[]`: `legacy_plan_users` (migrated creator / modifier printed as legacy text, not selectable); `app_plan_creator_missing` until RPT-STLIST-41 |
| History | Only the last modification is known; earlier edits of migrated plans are unknowable. App edits after DATA-36 are in `rpt_audit_events` (enhancement drill) |

### Output

One format `standard`, one block `main` (table).

| key | label | type | data_class | total / subtotal |
|---|---|---|---|---|
| `plan_id` | Plan ID | id | aggregate | count -> `Plans : n` |
| `legacy_plan_id` | Legacy ID | text | aggregate | none (default hidden) |
| `carrier_name` | Carrier | text | aggregate | none |
| `employer_name` | Employer | text | phi_identified (header rule; family open question 1) | none |
| `group_number` | Group # | text | aggregate | none |
| `plan_type_label` | Plan Type | text | aggregate | none |
| `coverage_type` | Dental/Medical | enum | aggregate | none |
| `created_on` | Created On | date (`M/D/YYYY`) | user_activity | none |
| `created_by_label` | Created By | text | user_activity | none |
| `modified_on` | Modified On | date | user_activity | none |
| `modified_by_label` | Modified By | text | user_activity | none |
| `usage_label` | Used | enum `Used` / `Not Used` | aggregate | count of `Not Used` in summary card |
| `patient_count` | Patients | integer | aggregate | none (default hidden) |
| `is_active` | Active | boolean | aggregate | none (default hidden) |
| `duplicate_set_no` | Dup. Set | integer | aggregate | visible only when `duplicates_only` |
| hidden: `carrier_id`, `employer_id`, `employer_sort` | - | id / text | aggregate / phi_identified | row_id_column `plan_id` |

Sort options: `carrier` (`carrier_name`, `employer_name` nulls last, `group_number`, `plan_id`), `employer` (`employer_name` nulls
last, `carrier_name`, `group_number`, `plan_id`). A caller without `phi_identified` loses `employer_name` and the `employer` sort
option (02 3.3); `sort_by = employer` from a saved view falls back to `carrier` with a warning. No group levels; page-break
options none. Summary cards (block totals, no metric keys): `Plans` (count), `Not used` (count of `usage_label = Not Used`).

### Visuals and drill-through

None - a list.

| Click | Leads to |
|---|---|
| Row | `record`: Insurance Plan Details (Setup > Insurance > Plans), entity `insurance_plan`, `route_key` owned by 07, plan-setup feature right in `right_code` (08) |
| `carrier_name` | `report` `lists.carrier_list` with `carrier_ids = [{"column": "carrier_id"}]` |
| `patient_count` | `report` `lists.patient_list_grouped_by` with `report_by = insurance_plan` and the plan as filter (parameter key owned by the patient-list catalog); needs `phi_identified` |
| `modified_on` (P2+, after DATA-36) | `record`: the plan's change history panel (`/insurance-plans/{id}/history`) |

### Actions

| Action | Scope | Kind | Right |
|---|---|---|---|
| Open plan | row | `navigate` | plan-setup feature right |
| Export selection | bulk | `export_selection` | Full Control + `reports_export_data_files` |
| Consolidate selected duplicates | bulk (2+ rows of one `duplicate_set_no`) | `navigate` to `Utilities > Consolidate Duplicate Insurance Plans` with the plan ids pre-filled (route owned by 07) | utilities feature right |

Doubles as a worklist with `duplicates_only = true` (clean-up queue); not `kind = worklist` (snapshot paging is enough).

### Export and print

PDF landscape, `banded_table`, header line 1 organisation name, line 2 `Insurance Plan List`, footer echo `Sort By :`,
`Created On / Modified On`, `From :` / `Thru :`, `Employer :`, `Users :` (`ALL` when the gate is off), `Carrier :`, `Group # :`,
then enhancements; tail per header. XLSX one sheet `Insurance Plan List`, frozen header, autofilter, criteria sheet. CSV main
block. `cost_class = interactive` (31k plans with a contains filter); `escalate_when` to background when the estimate exceeds
`max_rows_inline` (all plans, no date filter).

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | What enables the greyed Start / End Date boxes; does the default run (Modified On, today) filter at all? | Live tool: run with defaults after editing one plan |
| 2 | Does the print band by carrier / employer, and which columns print (used / not used)? | Generate one sample |
| 3 | Both / neither of Created On and Modified On: OR / no restriction? | Live tool |
| 4 | USER relation: creator, modifier, either? | Live tool with two users |
| 5 | GROUP # exact or partial match? | Live tool with a partial number |
| 6 | Is Plan ID the legacy plan number or an internal id? DentC prints `plan_id` and offers `legacy_plan_id` | Sample |
| 7 | Product: is the modified-date rule (app edit, else legacy, else created) acceptable? | Product owner |

## Inactive Plans List - `lists.inactive_plans_list`

Lists - Setup, `4.PNG` (group INSURANCE, row 2 right) - P3 - S - `lists_setup` alone - instant - PARTIALLY DOCUMENTED

### Purpose

Insurance coordinator, after `Consolidate Duplicate Insurance Plans` has moved patients to the surviving plan and before
deleting the leftovers (vendor: duplicates then show "Not Used" in plan setup `[P48]`); also yearly catalog hygiene and after a
conversion. Decision supported: which plans can be retired without touching a patient record.

### Legacy output

Confidence PARTIALLY DOCUMENTED: definition `[P9]`, clean-up use `[P48]`; layout INFERRED.

| Element | Legacy | DentC |
|---|---|---|
| Title | `Inactive Plans List` | same; alias `Unused Plans List` in `legacy_names[]` search keywords only |
| Population | Plans in the plan database not in use on any patient record (vendor-doc correction) | `NOT EXISTS` live `patient_insurance` link (Data) |
| Columns [I] | Plan ID, carrier, employer, group number | same, in that order |
| Totals | count [I] | `Plans : n` |

Quirk kept and named: "Inactive" means **unused**, not `insurance_plans.is_active = false` (the analysis map's
`is_active = false` reading is superseded, header population rules). The help text of the report says so.

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r04 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Output format only; `csv` added |
| CARRIER `ALL` (default) | Unused plans of every carrier |
| CARRIER selection | Unused plans whose `carrier_id` is selected |

No dependency rules. Population rule without a control: unused (above).

### Parameters - enhancements

| Key (type) | Default | Effect | Owner |
|---|---|---|---|
| `carrier_ids` multi-select | `all` | List instead of one carrier | 04 12 |
| `employer_ids` (`entity_multi`, shared) | `all` | Plan's employer, as on Insurance Plan List | 04 3.5 |
| `group_number` (`text`, report-specific key of r02) | empty | Contains match, trigram index | 04 section 15 |
| `count_inactive_links_as_used` (`boolean`) | `false` | `true`: a deactivated `patient_insurance` slot (removed from the patient) also counts as use | NEW, 04 section 15 |
| `exclude_plans_with_claims` (`boolean`) | `false` | Drops unused plans that are still referenced by a claim (`insurance_claims.ins_plan_id` or `other_ins_plan_id`) - the safe-to-retire subset | NEW, 04 section 15 |

### Data

| Item | Rule |
|---|---|
| Datasets | `insurance_plans` (passthrough, DATA-45) + `insurance_carriers`, `employers` labels; `patient_insurance` and `insurance_claims` in `EXISTS` subqueries only |
| Population | `NOT EXISTS (SELECT 1 FROM patient_insurance pi WHERE pi.ins_plan_id = p.id AND pi.is_active)` - same test as the "Patients" figure of `GET /insurance-plans/{id}/usage`, so the list agrees with "Not Used" in plan setup. Header wording "attached to no `patient_insurance` row" is read as "no live row"; the enhancement switch covers the stricter reading (open question 2) |
| Subscribers | `insurance_subscribers.ins_plan_id` also references plans; not part of the legacy rule, printed as a count |
| Index | `patient_insurance.ins_plan_id` has no index [V `app/db/models/patients.py` L175]; RPT-STLIST-45 adds one so the anti-join stays instant |
| Scope | `office_mode = none`; no date, no provider |
| Availability | READY (coverage matrix row 97). History: current state only; when a plan stopped being used is unknowable |

### Output

| key | label | type | data_class | total |
|---|---|---|---|---|
| `plan_id` | Plan ID | id | aggregate | count -> `Plans : n` |
| `carrier_name` | Carrier | text | aggregate | none |
| `employer_name` | Employer | text | phi_identified (family open question 1) | none |
| `group_number` | Group # | text | aggregate | none |
| `plan_type_label` | Plan Type | text | aggregate | none (default hidden) |
| `created_on` | Created On | date | user_activity | none (default hidden) |
| `claim_count` | Claims | integer | aggregate | none (default visible: a plan with claims is unused but not deletable) |
| `subscriber_count` | Subscribers | integer | aggregate | none (default hidden) |
| `is_active` | Active | boolean | aggregate | none |
| hidden `carrier_id`, `employer_id` | | id | aggregate / phi_identified | row_id_column `plan_id` |

Default sort carrier name, employer name, group number, plan id. No grouping, no page breaks. Summary card `Unused plans`
(count).

### Visuals and drill-through

None - a list. Row -> `record` Insurance Plan Details. `claim_count` -> `report` `insurance.claims_list` filtered to the plan
(plan parameter key owned by the insurance catalog; needs `phi_identified`). Carrier -> `lists.insurance_plan_list` with
`carrier_ids` and `plan_usage_status = unused`.

### Actions

| Action | Scope | Kind | Right / guard |
|---|---|---|---|
| Open plan | row | `navigate` | plan-setup right |
| Deactivate selected plans | bulk | `custom:deactivate_insurance_plans`, handler owned by Insurance setup; re-checks "unused" per plan inside the handler, skips used ones and reports them; `confirm` text names the count; idempotent per `(run_id, action_key, plan_id)` | plan-setup Full Control + report Full Control |
| Export selection | bulk | `export_selection` | `reports_export_data_files` |

The report is a clean-up worklist. A deactivated plan is still unused, so it stays on the list with `Active = No` (the
legacy population rule does not look at `is_active`); the screen's column filter on `is_active` hides finished rows
without changing the parameters.

### Export and print

PDF portrait, `banded_table`, footer echo `Carrier :` then enhancements. XLSX single table plus criteria sheet. CSV. Instant.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Does the legacy list print employer and group number, and a count? | Sample on the live tool |
| 2 | Does a plan still on an inactive patient (or a removed slot) count as used? | Live tool: remove a plan from a test patient and run |
| 3 | Are plans referenced only by claims listed? | Live tool |
| 4 | Product: should DentC offer the deactivate action from the report or only from plan setup? | Product owner |

## Explosion Codes List - `lists.explosion_codes_list`

Lists - Setup, `7.PNG` (group PROCEDURE, row 1 right) - P3 - S - `lists_setup` any-of `lists_procedure_fee` - instant - DOCUMENTED (Summary); Detail INFERRED

### Purpose

Office manager / clinical lead after setting up or editing explosion codes (shortcuts that add a predefined set of procedure
codes to an appointment or treatment plan `[P45]`), at code-year updates (a retired CDT code inside a bundle) and when
training staff. On demand.

### Legacy output

Summary DOCUMENTED (2022 sample `[P45·img]`):

| Element | Content |
|---|---|
| Header | Practice-group name; title `Explosion Codes List (Summary)` |
| Columns | `Exp. Code Short Descr` (unique short code, sample `CRNPFM`), `Exp. Code Descr` (name, `Crown PFM`), `Default Same Tooth` (`Yes` / `No`) |
| Rows | One per explosion code; order not alphabetical (creation order assumed); no grouping, no totals visible; footer cropped |

Detail INFERRED (basis `[P45]`, Dentrix Enterprise `Multi-Code List`): title `Explosion Codes List (Detail)`, each explosion code
followed by its member procedure codes in stored sequence. Older legacy name `Explosion Code List` (alias).

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r07 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Output format only; `csv` added |
| SUMMARY/DETAIL `Summary` (default) | One row per explosion code: short code, name, same-tooth flag; title `(Summary)` |
| SUMMARY/DETAIL `Detail` | Each code as a group header with its member lines (sequence, procedure code, description, tooth, surface, quadrant); title `(Detail)` |

No dependency rules. `title_templates`: `[["eq","report_format","summary"] -> "Explosion Codes List (Summary)"]`,
`[["eq","report_format","detail"] -> "Explosion Codes List (Detail)"]`.

### Parameters - enhancements

| Key (type) | Default | Effect | Owner |
|---|---|---|---|
| `procedure_codes` (`entity_multi`, shared) | `all` | Explosion codes that contain at least one selected member code (`EXISTS` on items); in Detail all members of a matching code still print, the matching lines marked | 04 3.6 |
| `available_office_ids` (`entity_multi`, `lookup:offices`) | `all` | Codes available in the selected offices: no `office_code_bundles` row (whole-catalog rule) or a row for the office | NEW, 04 section 15 (shared with r19) |
| `inactive_member_codes_only` (`boolean`) | `false` | Explosion codes with at least one member whose `rpt_procedure_code_dim.is_active = false` - the retired-code clean-up view | NEW, 04 section 15 |
| `catalog_status` | not offered | `code_bundles` is hard-deleted and has no `is_active` [V `codes.py` CodeBundle]; offered only if the source becomes `explosion_codes` (parity concern) | header |

### Data

| Item | Rule |
|---|---|
| Source catalog | `code_bundles` + `code_bundle_items` (passthrough, DATA-45). Basis: the DentC Explosion Codes setup screen edits `/api/v1/code-bundles` [V `src/components/setup/procedure-codes/ExplosionCodeSetup.tsx` L15] and the sample columns match `display_code`, `name`, `same_tooth`. `explosion_codes` (+ items, with `office_id`, `is_active`, `default_fee`) is a second catalog with no setup screen; proposed answer to family open question 3, confirm with 03 on a migrated tenant |
| Summary | One row per `code_bundles` row of the tenant |
| Detail | `code_bundle_items` ordered by `sort_order`, `id`; description from `rpt_procedure_code_dim` joined on `procedure_code` (unique key; `procedure_codes` is global) |
| Office availability | `office_code_bundles` aggregated to a label (`All offices` or short ids) |
| Tenant scope | `code_bundle_items` has no `tenant_id`: scoped through `code_bundles.tenant_id` |
| Scope | `office_mode = none`; no date |
| Availability | READY (coverage matrix row 101). Two catalogs: until 03 confirms, the definition reads `code_bundles` only |

### Output

Format `summary`, block `main`:

| key | label | type | data_class | total |
|---|---|---|---|---|
| `display_code` | Exp. Code Short Descr | text | aggregate | count -> `Explosion Codes : n` |
| `bundle_name` | Exp. Code Descr | text | aggregate | none |
| `same_tooth` | Default Same Tooth | boolean `Yes` / `No` | aggregate | none |
| `description` | Description | text | aggregate | none (default hidden; the long description) |
| `member_count` | Codes | integer | aggregate | none (default hidden) |
| `office_label` | Offices | text | aggregate | none (default hidden) |
| `created_at` | Created | date | aggregate | none (default hidden, family "changed-since") |
| hidden `bundle_id` | | id | aggregate | row_id_column |

Format `detail`, block `main`, group level `bundle` (`key_columns` `bundle_id`; header `{display_code} - {bundle_name} - Same
Tooth: {same_tooth}`; subtotal `{member_count} codes`):

| key | label | type | data_class | total |
|---|---|---|---|---|
| `sort_order` | Seq | integer | aggregate | none |
| `procedure_code` | Code | text | aggregate | count per group |
| `procedure_description` | Description | text | aggregate | none |
| `tooth` | Tooth | text | aggregate | none |
| `surface` | Surface | text | aggregate | none |
| `quadrant` | Quad | text | aggregate | none |
| `member_is_active` | Code Active | boolean | aggregate | none (default hidden) |

Grand total `Explosion Codes : n`, `Codes : n`. Default sort `display_code` (documented default; creation order is family open
question 5); detail rows by `sort_order`. Page break option (enhancement, `page_break_by`: `none` / `group`, default `none`) on
Detail only.

### Visuals and drill-through

None - a list. Row / group header -> `record` Explosion Codes setup (`route_key` owned by 07). `procedure_code` -> `record`
Procedure Codes setup. `member_count` -> same report, `detail`, filtered to the bundle (`kind = rows`).

### Actions

Row: open in setup (`navigate`). Bulk: `export_selection`. With `inactive_member_codes_only` the report is the code-year
clean-up worklist (open each bundle and replace the retired code).

### Export and print

PDF portrait, `banded_table`; title per format; footer echo `Report Format :` then enhancements. XLSX: Summary one table;
Detail one flat table with the bundle columns repeated on every member line (no merged cells, outline groups by bundle). CSV
per format. Instant.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Detail layout: which member columns print (fee, tooth, surface)? | Generate a Detail sample |
| 2 | Row order (sample not alphabetical) | Live tool with three codes |
| 3 | Which DentC catalog holds the migrated explosion codes (family question 3)? | 03 on a migrated tenant |
| 4 | Is office availability printed? | Sample |

## Credit Codes Report - `lists.credit_codes_report`

Lists - Setup, `9.PNG` (group PROCEDURE, row 2 right) - P3 - S - `lists_setup` any-of `lists_procedure_fee` - instant - PARTIALLY DOCUMENTED

### Purpose

Accounting / office manager when mapping payment and adjustment codes to the general ledger, checking that adjustment sub
types (production versus collection) are right before month end, and after conversion (DATA-12 review of migrated codes).
The vendor's instruction: run with TYPE = ALL and CLASS = ALL for the complete list `[P46]`.

### Legacy output

Confidence PARTIALLY DOCUMENTED: purpose and record fields `[P46]`; layout INFERRED.

| Element | Content |
|---|---|
| Title | `Credit Codes Report` |
| Columns [I] | Code, Description, Type, Sub Type, Sign, Class |
| Grouping [I] | By Type (Payment, then Adjustment) |
| Values | Type `Payment` / `Adjustment`; Sub Type payments `None`, `Cash`, `Check`, `Credit Card`, `Care Credit`, `Direct Deposit`, adjustments `Collection`, `Production`; Sign `+` / `-` (forced `-` for payments); Class: data card 3.3 literal vocabulary |

Sign is printed as text and never applied to anything. It sits in the PROCEDURE group for historical reasons.

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r09 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Output format only; `csv` added |
| TYPE `ALL` (default) | Payment and adjustment codes |
| TYPE `Payment` (candidate, unknown_legacy) | `code_kind = payment` |
| TYPE `Adjustment` (candidate) | `code_kind = adjustment` |
| CLASS `ALL` (default) | No class predicate |
| CLASS one class (candidate list: payments `None`, `Insurance Payment`, `Capitation Payment`, `Insurance Prev. Bal`, `Collection Agency Payment`; adjustments `None`, `Write-Off`, `Finance Charge`, `Contract Down Payment`, `Balance Moved to Contract`, `Periodic Contract billing`, `Late Charge`, `Capitation Adjustment`, `Sales Tax`, `Insurance Adjustment`, `Move Patient (Debit)`, `Move Patient (Credit)`, `Previous Balance (Debit)`, `Previous Balance (Credit)`, `Credit Card Refund`, `Treatment plan discount`, `Collection Agency Adjustment`) | `legacy_class = :value`; `None` is one value per kind (with TYPE = ALL it matches payment and adjustment `None` codes) |

Dependency rule (candidate, to confirm): CLASS options `enabled_when ["in", "credit_code_type", ["all", <kind of the class>]]`;
choosing a TYPE that excludes the selected class resets CLASS to `all`. Option values are snake_case of the labels
(`insurance_payment`, `move_patient_debit`, ...), final once FLT-23 records the lists.

### Parameters - enhancements

| Key (type) | Default | Effect | Owner |
|---|---|---|---|
| `credit_code_sub_types` (`entity_multi`, static list of the Sub Type values) | `all` | `legacy_sub_type IN (...)` - e.g. every adjustment marked Production | NEW, 04 section 15 |
| `include_inactive_codes` (`boolean`) | `true` | `false` drops `is_active = false` codes; the legacy behaviour is unknown, so the default keeps them | NEW, 04 section 15 |
| `show_analytic_mapping` (`boolean`, `role: query`) | `false` | Adds `txn_class`, `ledger_bucket`, `deposit_group`, `is_income`, `counts_as_collection`: shows where each code lands in DentC's production / collection figures | NEW, 04 section 15 |
| `show_versions` (`boolean`) | `false` | One row per version (`valid_from`, `valid_to`) instead of the current version: audit of sign / class changes | NEW, 04 section 15 |
| `include_usage` (`boolean`) | `false` | Adds `usage_count_12m` and `last_used_on` from `rpt_ledger_entries` (last 12 months by `transaction_date`); raises `cost_class` to `interactive` | NEW, 04 section 15 |

### Data

| Item | Rule |
|---|---|
| Dataset | `rpt_transaction_code_dim` (DATA-03, P0): `code`, `code_kind`, `description`, `sign`, `legacy_sub_type`, `legacy_class`, `txn_class`, `deposit_group`, `is_income`, `counts_as_collection`, `is_system`, `valid_from`, `valid_to`, `is_active` |
| Version | Current version per code: `DISTINCT ON (tenant_id, code) ... ORDER BY valid_from DESC` with `valid_from <= local_today` |
| Population | `is_system = false` (header RPT-STLIST-06: system alias codes are not selectable and not printed) |
| Usage (enhancement) | `count(*)`, `max(transaction_date)` of `rpt_ledger_entries` legs resolved to the code. Migrated legs carry no code until DATA-12 (REPAIR): usage counts app-era rows only; `availability[]` `migrated_codes_unmapped` |
| Scope | `office_mode = none` (tenant catalog); usage counts are tenant-wide, restricted to the caller's offices when the caller is office-restricted (ledger office attribution `transaction_office`) |
| Availability | READY (coverage matrix row 102); `CLASS` values beyond the seeded ones confirmed against the legacy setup screen (O-2); seeded `legacy_class` is `None` on most adjustment codes until reviewed |

### Output

Block `main`, `fixed_outer` level `code_kind` (header `Type : {code_kind_label}`, subtotal `Codes : n`), INFERRED grouping:

| key | label | type | data_class | total |
|---|---|---|---|---|
| `code` | Code | text | aggregate | count per type, grand count |
| `description` | Description | text | aggregate | none |
| `code_kind_label` | Type | enum `Payment` / `Adjustment` | aggregate | group label |
| `legacy_sub_type` | Sub Type | text | aggregate | none |
| `sign` | Sign | text `+` / `-` | aggregate | none |
| `legacy_class` | Class | text | aggregate | none |
| `is_active` | Active | boolean | aggregate | none |
| `txn_class`, `ledger_bucket`, `deposit_group`, `is_income`, `counts_as_collection` | (analytic mapping) | text / boolean | aggregate | visible when `show_analytic_mapping` |
| `valid_from`, `valid_to` | Valid From / To | date | aggregate | visible when `show_versions` |
| `usage_count_12m` | Used (12 m) | integer | aggregate | sum per type |
| `last_used_on` | Last Used | date | aggregate | none |
| hidden `code_version_id` | | id | aggregate | row_id_column |

Default sort within a type: `code`. Page break option none. Summary cards: `Payment codes`, `Adjustment codes` (counts).

### Visuals and drill-through

None - a list. Row -> `record` Payment / Adjustment code setup (route owned by 07; the screen that replaces
`transactionCodes.ts`, DATA-03). `usage_count_12m` -> `report` `daily.special_transaction_report` with the code as its code
filter (`payment_adjustment_codes`, key to confirm with the Daily catalog) and `date_range` = last 12 months.

### Actions

Row: open code setup. Bulk: `export_selection`. With `show_analytic_mapping` it is the O-2 review worklist (codes whose
`legacy_class` is `None`).

### Export and print

PDF portrait, banded by type; footer echo `Type :`, `Class :` then enhancements. XLSX one flat table (type as a column),
criteria sheet. CSV. Instant (interactive with `include_usage`).

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | TYPE and CLASS entries and order; does CLASS depend on TYPE? (unknown_legacy, FLT-23) | Expand both dropdowns on the live tool |
| 2 | Grouping by type and column order | Sample |
| 3 | Are inactive codes printed? | Live tool |
| 4 | Is the vendor-suffixed class text (`Collection Agency Payment (Transworld)`) printed with the suffix? | Sample; DentC prints the data card literal |

## Capitation Fee Schedule - `lists.capitation_fee_schedule`

Lists - Setup, `11.PNG` (group FEE SCHEDULE, right) - P3 - S - `lists_setup` any-of `lists_procedure_fee` - instant - PARTIALLY DOCUMENTED

### Purpose

Office manager / insurance coordinator printing a managed-care schedule (capitation, dental HMO, HMO, Medicaid `[P43]`) for
the front desk to quote co-pays, at contract renewal and when an HMO sends new co-pay tables. Formerly `Reports (Old) >
Insurance Reports > Capitation Fee Schedule` `[P44]` (alias).

### Legacy output

PARTIALLY DOCUMENTED: purpose `[P43]`, `ED` suffix `[P44]`; columns INFERRED.

| Element | Legacy [I] | DentC |
|---|---|---|
| Title | `Capitation Fee Schedule` | same |
| Band | per schedule (name with effective date) | `fixed_outer` level `fee_schedule`, header `{fee_schedule_name} [ED: {effective_date}]` |
| Columns | code, description, managed-care amounts (patient co-pay and, where kept, the production / plan value); exact columns unknown | code, description, `Co-Pay` (patient), `Plan Pays` (insurance), `No Charge` |
| Totals | none known | `Codes : n` per schedule; no money totals |

Money sign: positive amounts as stored, 2 decimals, never inverted.

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r11 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Output format only; `csv` added |
| CAPITATION FEE SCHEDULE `ALL` (default) | Every managed-care (`pricing_model = copay`) schedule the caller may read, one band each |
| CAPITATION FEE SCHEDULE one schedule (`<name> [ED: m/d/yyyy]`) | That schedule only; the list holds only `copay` schedules |

Shared rule (parity file): `office_scope` hidden (`visible_when false`, default `all`) - catalog rule: schedules of offices the
caller may read plus schedules without an office; the option source applies the same rule. No dynamic rule.

### Parameters - enhancements

| Key (type) | Default | Effect | Owner |
|---|---|---|---|
| `fee_schedule_ids` multi-select | `all` | Several schedules side by side as bands (legacy single-select) | 04 12 |
| `fee_as_of_date` (`date`) | `today` | Entry version in force on that date (`effective_date <= d < effective_to`); prints next year's co-pays before they start | NEW, 04 section 15 |
| `include_ucr` + `compare_fee_schedule_id` (shared, 3.6) | `false` / `office_default_ucr_fee_schedule` | Adds `Compare Fee` from the chosen schedule and `Patient Saves` = compare fee - co-pay: what the HMO patient saves versus the office fee | 04 3.6 |
| `procedure_category_codes` (shared) | `all` | Codes of the chosen ADA categories | 04 3.6 |
| `catalog_status` (family) | `both` | `fee_schedules.is_active` | header |
| `page_break_by` (`enum`: `none`, `group`) | `none` | New PDF page per schedule | 04 8 |

### Data

| Item | Rule |
|---|---|
| Dataset | `rpt_fee_schedule_fees` (DATA-51, P1): `fee_schedule_id`, `fee_schedule_name`, `pricing_model`, `fee_type`, `procedure_code`, `effective_date`, `effective_to`, `patient_fee`, `insurance_fee`, `is_no_charge` |
| Schedule label | `fee_schedules.name` + `fee_schedules.effective_date` (each schedule version is its own `fee_schedules` row with `version` / `parent_schedule_id`); option source `lookup:fee_schedules` filtered `pricing_model = copay` |
| Rows | Entries of the schedule in force on `fee_as_of_date` (default the working office's `local_today`); codes without an entry are not printed |
| Descriptions | `rpt_procedure_code_dim` on `procedure_code` |
| Compare (enhancement) | Second lookup in `rpt_fee_schedule_fees` for `compare_fee_schedule_id` on the same date (`schedule_fee`) |
| Scope | Hidden `office_scope = all`, catalog rule (header) |
| Availability | READY (coverage matrix row 104). Entries carry one `effective_date` and no end date: a deleted entry rewrites the past (data card 2.29), so an as-of date in the past is the current catalog's view of it |

### Output

Block `main`, `fixed_outer` level `fee_schedule` (`key_columns` `fee_schedule_id`; header above; subtotal `Codes : n`;
`page_break_allowed`):

| key | label | type | data_class | total |
|---|---|---|---|---|
| `procedure_code` | Code | text | aggregate | count per schedule, grand count |
| `procedure_description` | Description | text | aggregate | none |
| `code_category` | Category | text | aggregate | none (default hidden) |
| `patient_fee` | Co-Pay | money (2 dp) | financial_practice | none |
| `insurance_fee` | Plan Pays | money | financial_practice | none |
| `is_no_charge` | No Charge | boolean | aggregate | none |
| `entry_effective_date` | Effective | date | aggregate | none (default hidden) |
| `compare_fee` | Compare Fee (`{compare_fee_schedule_name}`) | money | financial_practice | visible when `include_ucr` |
| `patient_saves` | Patient Saves | money, computed `difference(compare_fee, patient_fee)` | financial_practice | visible when `include_ucr` |
| hidden `fee_schedule_id`, `entry_id` | | id | aggregate | row_id_column `entry_id` |

Money columns are non-key: a caller without `financial_practice` gets the code list without amounts (header). Sort:
schedule name, effective date, then `procedure_code`. Summary card `Schedules` (count of bands).

### Visuals and drill-through

None - a list. Band header -> `report` `insurance.capitation_utilization` with its `compare_fee_schedule_id` = the schedule
(Fee Schedule To Compare). Row -> `record` Fee Schedules setup on that schedule and code.

### Actions

Row: open schedule in setup. Bulk: `export_selection` (front-desk co-pay sheet).

### Export and print

PDF portrait, banded by schedule, optional page break per schedule; footer echo `Capitation Fee Schedule :` (names with `ED`)
then enhancements. XLSX: one flat table with schedule name and effective date as columns (`sheet_per_page_break` when page
break by schedule). CSV. Instant.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Exact columns (co-pay only, or co-pay and plan amount)? | Generate a sample |
| 2 | Does the dropdown hold exactly the managed-care schedules, one entry per version? | Expand on the live tool |
| 3 | Does ALL print every schedule or every version of every schedule? | Live tool; DentC prints every `copay` `fee_schedules` row (each version is a row) |
| 4 | Are codes without a co-pay entry printed? | Sample |

## Office Holidays - `lists.office_holidays`

Lists - Setup, `13.PNG` (group OFFICE, row 1 right) - P3 - S - `lists_setup` any-of `lists_office` - instant - INFERRED

### Purpose

Office manager / scheduler lead: yearly holiday planning, checking that every office has the same closures before the
schedule is opened, and confirming no appointments are booked on a closed day. Typical: yearly schedule, ad hoc before
holiday weeks.

### Legacy output

INFERRED: criteria `[L4]`, Holidays tab `[P39]`; no comparable report.

| Element | Legacy [I] | DentC |
|---|---|---|
| Title | `Office Holidays` | same |
| Header line 1 | office name for a one-office run | per header page furniture |
| Band | office | `fixed_outer` level `office`, `Office : {office_name}`, when multi-office |
| Columns | office, date or range, description, type, recurrence, hours | date, day, description, status, type, recurring, scope; hours not stored (Data) |
| Account-wide (enterprise) holidays | unknown whether included | included under each office with scope `Account` (header attribution `holiday_office`, INFERRED) |

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r13 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Output format only; `csv` added |
| OFFICE/GROUP `Office` (default) | Picker lists offices; holidays of the selected offices (+ account-wide rows) |
| OFFICE/GROUP `Office Group` | Picker lists office groups; holidays of every office of the groups; no groups defined = all offices of the account (vendor rule `setup_list_reports.r12.d01`) |
| Picker default (`108` = the working office) | `working_office` token |
| Picker selection | The chosen offices / groups; `all` = every office the caller may read |
| Start Date (default today) | First holiday date of the range, inclusive |
| End Date (default today) | Last holiday date, inclusive; a recurring holiday contributes each yearly occurrence in the range (INFERRED) |

Dependency rule `setup_list_reports.r12.d01` (holds for r12-r14, header): mode decides whether the picker lists offices or
office groups. Default run = holidays falling today in the working office.

### Parameters - enhancements

| Key (type) | Default | Effect | Owner |
|---|---|---|---|
| `date_range` presets `this_year`, `next_month`, `next_12_months` | `today` | Saved view "Holidays this year, all my offices" (`office_ids = my_offices`) | 04 7.4 |
| `holiday_scope` (`enum`: `all`, `office`, `account`) | `all` | `office` = only rows with an `office_id`; `account` = only tenant-wide rows | NEW, 04 section 15 |
| `holiday_statuses` (`enum_multi`: `closed`, `open`, `half_day`; `min_items 1`, `no_predicate`) | all ticked | `account_holidays.status` | NEW, 04 section 15 |
| `show_booked_appointments` (`boolean`, `role: query`) | `false` | Adds `booked_count`: live appointments of the office on that date (`rpt_appointment_facts`, appointment office) - the conflict check | NEW, 04 section 15 |
| `office_ids = my_offices` | - | Every assigned office at once | 04 12 |

### Data

| Item | Rule |
|---|---|
| Dataset | `account_holidays` (passthrough, DATA-45): `office_id` (NULL = tenant-wide), `holiday_date`, `holiday_name`, `status` (`CLOSED` / `OPEN` / `HALF_DAY`), `holiday_type` (`FEDERAL` / `CUSTOM`), `is_recurring`, `created_by` [V `app/db/models/account.py` L227-240]; `rpt_office_dim` for labels and `local_today` |
| Attribution | `holiday_office` (header): office rows of the resolved offices plus account rows repeated under every resolved office; an office row beats the account row of the same date |
| Date basis | fixed `holiday_date` (04 7.2 #36). One-time: `holiday_date BETWEEN :date_from AND :date_to`. Recurring: occurrence `make_date(y, month, day)` for each year `y` of the range, through `rpt_dates` (RPT-STLIST-04); 29 February recurs only in leap years (DentC rule, to confirm) |
| Office group | `rpt_office_dim.office_group_id`; `office_groups` is empty after migration, so group mode with no groups = all offices |
| Booked (enhancement) | `count(*)` of `rpt_appointment_facts` live, not cancelled, `office_id` = band office, `appointment_date` = occurrence |
| Hours | Legacy `Office Open` with hours: `account_holidays` has no time columns. NEW `open_time`, `close_time` (owner 03, extension of DATA-45; RPT-STLIST-54); until then the status prints without hours |
| Availability | READY (coverage matrix row 107), empty until configured: nothing migrated or seeded (`availability[]` `no_holidays_configured`) |

### Output

Block `main`, `fixed_outer` level `office` (`when ["ctx", "multi_office"]`, header `Office : {office_name}`, subtotal
`Holidays : n`), grand total `Holidays : n`:

| key | label | type | data_class | total |
|---|---|---|---|---|
| `occurrence_date` | Date | date (`M/D/YYYY`) | aggregate | count |
| `day_name` | Day | text | aggregate | none |
| `holiday_name` | Description | text | aggregate | none |
| `status_label` | Status | enum `Closed` / `Open` / `Half Day` | aggregate | none |
| `holiday_type_label` | Type | enum `Federal` / `Custom` | aggregate | none |
| `is_recurring` | Recurring | boolean | aggregate | none |
| `scope_label` | Scope | enum `Office` / `Account` | aggregate | none |
| `hours_label` | Hours | text | aggregate | visible once RPT-STLIST-54 lands |
| `booked_count` | Booked Appts | integer | aggregate | sum per office; visible when `show_booked_appointments` |
| hidden `office_id`, `holiday_id` | | id | aggregate | row_id_column `holiday_id` + `occurrence_date` |

Sort: office name, `occurrence_date`, `holiday_name`. Page break option (enhancement `page_break_by` `none` / `office`,
default `none`). Summary cards: `Holidays`, `Booked on holidays` (sum of `booked_count`).

### Visuals and drill-through

None - a list (a year calendar view per office is a 07 view option, not a chart). Row -> `record` Office Setup > Holidays
of the office (account rows: Setup > Account > Holidays). `booked_count` -> `report` `appointment.appointment_list` with
`office_scope = [{"column": "office_id"}]`, `date_range = {"column": "occurrence_date"}` both ends; needs `phi_identified`.

### Actions

Row: open holiday setup. Bulk: `export_selection`. With `show_booked_appointments` it is a conflict worklist; rescheduling
happens in the Scheduler (drill), not from the report.

### Export and print

PDF portrait, banded by office; header line 1 office name for a one-office run, else organisation; footer echo `Offices :` /
`Office Group :`, `From :`, `Thru :`. XLSX one flat table with office name column. CSV. Instant.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Are account-wide (enterprise) holidays included, and how labelled? | Live tool: add one, run |
| 2 | Date-range test for recurring holidays (occurrence in range?) | Live tool with a recurring holiday of last year |
| 3 | Which columns print (hours, type)? | Sample |
| 4 | Product: should hours become columns of `account_holidays`? | Product owner / 03 |

## Default Ins Plan Coverage Category List - `lists.default_ins_plan_coverage_category_list`

Lists - Setup, `16.PNG` (group MISC, row 1 right) - P3 - S - `lists_setup` alone - instant - PARTIALLY DOCUMENTED

### Purpose

Insurance coordinator / office manager reviewing the coverage table every new plan starts with (Coverage and Limitations
section of plan entry), before changing the defaults and when onboarding a practice. On demand. Changing the defaults
affects only plans added afterwards `[P59]`.

### Legacy output

PARTIALLY DOCUMENTED: six fields `[P26]`, rendered on the plan document `[P47·img]`; list layout INFERRED.

| Legacy field | Content | DentC source |
|---|---|---|
| `Coverage Key` | up to 10 characters, two digits of the code category plus a letter (`01`, `01A`) | `definitions.key1` (`DEFCOVERAGE`) |
| `Pct. Coverage` | default % | `definitions.key2` (integer text) |
| `Description` | category label | `definitions.description` |
| `Frequency Limitation` | default frequency | built-in `DEFAULT_CATEGORY_FREQUENCIES` (ordinal) [V `insurance_plan_service.py` L142-145], label via `FREQUENCYLIMITATIONS`; not tenant data |
| `Age Limitation` | through-age | not stored (`age_min` / `age_max` None in `default_coverage_rules`) [V L616-621] |
| `Waiting Period` | months | not stored (`wait_months` None) |

Title `Default Ins Plan Coverage Category List`; one row per category; count. The plan document prints the same data as
`Category`, `Ded. Waived`, `%Coverage`, `Frequency Limitation`, `Age Limitation`, `Waiting Period (Months)`.

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r16 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Screen preview, then PDF |
| PRINT FORMAT `Excel` | Screen preview, then XLSX; `csv` added |

No filters, no dependency rules: the report prints the whole default table.

### Parameters - enhancements

| Key (type) | Default | Effect | Owner |
|---|---|---|---|
| `catalog_status` (family) | `both` | `definitions.is_active` | header |
| `show_mapped_codes` (`boolean`, `role: query`) | `false` | Adds a detail block: under each category the procedure codes whose `rpt_procedure_code_dim.coverage_category` equals the key (code, description) - answers "which codes does 03A cover" | NEW, 04 section 15 |
| `show_unmapped_codes` (`boolean`) | `false` | Adds a trailer block of active procedure codes with `coverage_category` NULL (they get no coverage % on a new plan) | NEW, 04 section 15 |

### Data

| Item | Rule |
|---|---|
| Builder | `python_builder` on the engine whitelist (ENG-34) calling `insurance_plan_service.default_coverage_rules(db, tenant_id)`: the tenant's `DEFCOVERAGE` rows (one per `key1`, first seen; duplicates collapsed) or, when none, the built-in table. The report therefore always equals what a new plan receives; `source` column says `Tenant` / `Built-in` |
| Dataset declared | `definitions` (`DEFCOVERAGE`) passthrough (DATA-45), one row per (`tenant_id`, `group_code`, `key1`) |
| Mapped codes | `rpt_procedure_code_dim.coverage_category` (global catalog; no tenant column) |
| Gaps | Frequency is one code constant for every tenant; age limitation and waiting period have no storage. NEW per-tenant columns (`frequency_ordinal`, `age_through`, `waiting_months` on the `DEFCOVERAGE` definition, or a `default_coverage_categories` table - owner 03, RPT-STLIST-56); until then they print `-` with `availability[]` `default_coverage_limits_not_stored` |
| Scope | `office_mode = none` |
| Availability | READY where seeded (coverage matrix row 111) for key, % and description; frequency READY from the constant; age and waiting period SCHEMA (NEW, not yet numbered in `data_work_items.md`) |

### Output

Block `main`:

| key | label | type | data_class | total |
|---|---|---|---|---|
| `coverage_key` | Coverage Key | text | aggregate | count -> `Categories : n` |
| `coverage_pct` | Pct. Coverage | percent (0 dp; stored as whole number, served as fraction) | aggregate | none |
| `description` | Description | text | aggregate | none |
| `frequency_label` | Frequency Limitation | text | aggregate | none |
| `age_limitation` | Age Limitation | integer | aggregate | none |
| `waiting_months` | Waiting Period | integer | aggregate | none |
| `source_label` | Source | enum `Tenant` / `Built-in` | aggregate | none (default hidden) |
| `is_active` | Active | boolean | aggregate | none (default hidden) |
| `mapped_code_count` | Codes | integer | aggregate | none (default hidden) |
| hidden `definition_id` | | id | aggregate | row_id_column (`coverage_key` for built-in rows) |

Block `mapped_codes` (`placement: after_group` of level `coverage_key`, when `show_mapped_codes`): `procedure_code`,
`procedure_description` (aggregate). Block `unmapped_codes` (`report_end`). Sort `coverage_key` (string order, `01` < `01A` <
`02`). No page breaks.

### Visuals and drill-through

None - a list. Row -> `record` Setup > Insurance default coverage table (route owned by 07). `mapped_code_count` -> same
report with `show_mapped_codes = true` (`kind = rows`).

### Actions

Row: open default coverage setup. Bulk: `export_selection`. Not a worklist.

### Export and print

PDF portrait, `banded_table`; footer echo none beyond enhancements. XLSX `main` table; `mapped_codes` and `unmapped_codes`
on sheets of their own (02 3.8). CSV main block. Instant.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Column order and whether a deductible-waived column prints | Sample |
| 2 | Are frequency / age / waiting per tenant in the legacy tool (editable defaults)? | Live Setup > Default Coverage screen |
| 3 | Product: add per-tenant storage for the three limits (RPT-STLIST-56)? | Product owner |

## Notes Macro Category List - `lists.notes_macro_category_list`

Lists - Setup, `18.PNG` (group MISC, row 2 right) - P3 - S - `lists_setup` alone - instant - PARTIALLY DOCUMENTED

### Purpose

Clinical lead / office manager tidying the categories that organise notes macros (a category is only a Description; the
standard list follows the ADA code categories plus a few extras `[P26][P50]`), before adding macros or after a conversion.
On demand.

### Legacy output

PARTIALLY DOCUMENTED (table fields); layout INFERRED: title `Notes Macro Category List`, one column `Description` (possibly with
an internal ID), one row per category, count.

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r18 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Screen preview, then PDF |
| PRINT FORMAT `Excel` | Screen preview, then XLSX; `csv` added |

No filters, no dependency rules.

### Parameters - enhancements

| Key (type) | Default | Effect | Owner |
|---|---|---|---|
| `catalog_status` (family) | `both` | `definitions.is_active` | header |
| `include_macro_counts` (`boolean`, `role: query`) | `true` | Adds `macro_count` per category and a trailer row `(No category)` / `(Unknown category)` for macros whose `category` matches no definition | NEW, 04 section 15 |

### Data

| Item | Rule |
|---|---|
| Dataset | `definitions` group `NOTESMACROS` (passthrough, DATA-45), one row per (`tenant_id`, `group_code`, `key1`); category code = `key1` (migrated code also in `legacy_id`) - the source of `GET /note-macros/categories` and of option source `note_macro_categories` (04 13.3) |
| Macro count | `note_macros.category` (free text, seeded as numeric category codes) matched to `key1`, `btrim`, case-insensitive; a value matching neither a code nor a description = unknown |
| Scope | `office_mode = none`; `note_macros` and the definitions are tenant catalogs |
| Availability | READY (coverage matrix row 112) |

### Output

| key | label | type | data_class | total |
|---|---|---|---|---|
| `category_code` | ID | text | aggregate | count -> `Categories : n` |
| `description` | Description | text | aggregate | none |
| `macro_count` | Macros | integer | aggregate | sum (all macros) |
| `is_active` | Active | boolean | aggregate | none (default hidden) |
| hidden `definition_id` | | id | aggregate | row_id_column |

Default sort `sort_order` nulls last, then `category_code` (ADA order; family open question 5). No grouping, no page break.

### Visuals and drill-through

None - a list. Row / `macro_count` -> `report` `lists.notes_macros_list` with `note_macro_category_codes =
[{"column": "category_code"}]` (header cross-report drill). The `(No category)` trailer drills with the `no_category`
value of that parameter (enhancement of r19).

### Actions

Row: open Setup > Notes Macros categories. Bulk: `export_selection`.

### Export and print

PDF portrait, `banded_table`, footer criteria echo empty except enhancements. XLSX one table. CSV. Instant.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Is an ID printed beside the description? | Sample |
| 2 | Row order (alphabetical or setup order)? | Live tool |

## Notes Macros List - `lists.notes_macros_list`

Lists - Setup, `19.PNG` (group MISC, row 3 left) - P3 - S - `lists_setup` alone - instant - INFERRED

### Purpose

Clinical lead reviewing the note templates (macros) staff insert into progress and other notes: content review, removing
stale macros, checking which offices see which macro, and finding macros that reference a retired data tag. On demand,
after setup changes and before audits.

### Legacy output

INFERRED (setup screen `[P50]`; no comparable): title `Notes Macros List`; likely category heading, then macro name and
probably the macro text; whether the full template prints is unknown. Underlying fields: `Macro Name`, `Macro Category`,
template body of data tags and questions (free text or pick list, optionally required), availability all offices or per
office assignment.

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r19 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Output format only; `csv` added |
| MACRO CATEGORY `ALL` (default) | Every macro, including macros without a category |
| MACRO CATEGORY one category | Macros whose `category` matches that category code; macros without a category dropped |

No dependency rules.

### Parameters - enhancements

| Key (type) | Default | Effect | Owner |
|---|---|---|---|
| `note_macro_category_codes` multi-select | `all` | Several categories; source row `no_category` selects macros without (or with an unknown) category (pattern of `no_type_defined`, 04 3.4) | 04 12 / section 15 |
| `available_office_ids` (`entity_multi`, `lookup:offices`) | `all` | Macros available in the selected offices: no `office_note_macros` rows (whole catalog) or a row for the office | NEW, 04 section 15 (shared with r07) |
| `macro_search_text` (`text`) | empty | Case-insensitive contains on `name` and `content` - e.g. every macro using a given data tag; never written to the URL | NEW, 04 section 15 |
| `include_macro_text` (`boolean`, `role: query`) | `true` | `false` = names only (one line per macro) | NEW, 04 section 15 |
| `page_break_by` (`enum`: `none`, `group`) | `none` | New PDF page per category | 04 8 |

### Data

| Item | Rule |
|---|---|
| Dataset | `note_macros` (passthrough, DATA-45): `name`, `content`, `category`, `created_by`, `updated_by`, `updated_at`; `office_note_macros` for availability; category label from `definitions` `NOTESMACROS` (one row per `key1`) |
| Category match | `btrim(note_macros.category)` = `key1` (codes as seeded); a value equal to a description also matches (free text); else unknown |
| Text | `content` rendered to plain text on the server: HTML tags stripped, data tags shown as `[tag name]`, line breaks kept; any legacy-escaped markup goes through the same decoder the notes feature uses (owner of the decoder: notes feature, 03 to confirm migrated macro encoding) |
| Deletes | `note_macros` is hard-deleted: no status filter (header) |
| Scope | `office_mode = none`; availability is an attribute / enhancement filter, not office scope |
| Availability | READY (coverage matrix row 110); migrated macros have `created_by` NULL |

### Output

Block `main`, `fixed_outer` level `category` (`key_columns` `category_code`; header `Category : {category_description}`; subtotal
`Macros : n`; `page_break_allowed`); grand total `Macros : n`:

| key | label | type | data_class | total |
|---|---|---|---|---|
| `macro_name` | Macro Name | text | aggregate | count |
| `macro_text` | Macro Text | text (multi-line) | aggregate (setup template content, header; see open question 4) | none; visible when `include_macro_text` |
| `office_label` | Offices | text (`All offices` or short ids) | aggregate | none |
| `updated_at` | Modified | date | aggregate | none (default hidden) |
| `updated_by_label` | Modified By | text | user_activity | none (default hidden) |
| hidden `macro_id`, `category_code` | | id / text | aggregate | row_id_column `macro_id` |

Sort: category description (unknown category last), then `macro_name`. PDF wraps `macro_text` in a full-width sub-row under
the name (like the legacy `Prescription Note:` sub-rows of the neighbour report).

### Visuals and drill-through

None - a list. Row -> `record` Setup > Notes Macros on that macro (route owned by 07). Category band -> `lists.notes_macro_category_list`.

### Actions

Row: open macro in setup. Bulk: `export_selection`. With `macro_search_text` it serves as a review worklist (open each match).

### Export and print

PDF portrait, banded by category, optional page break per category; footer echo `Macro Category :` then enhancements. XLSX one
flat table (category, name, text, offices; text in one wrapped cell, no merges). CSV with the text column (formula guard on).
Instant.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Does the legacy list print the template text, and grouped by category? | Sample |
| 2 | Are office assignments printed? | Sample |
| 3 | MACRO CATEGORY entries (standard list) | Expand on the live tool |
| 4 | 08: is setup template text `aggregate` (setup content, 5.1) or must free text follow rule 4 of 5.2? | Decision of 08 |

## Patient Types List - `lists.patient_types_list`

Lists - Setup, `20.PNG` (group MISC, row 3 right) - P3 - S - `lists_setup` alone - instant - PARTIALLY DOCUMENTED

### Purpose

Office manager reviewing the optional patient markers used as report filters and alerts (`CH - Child`, `CP - Collection
Problem, See Notes`, `CQ - Queued For Collections`, ... `[P23·img]`), especially which types raise a flash alert and block
charges. Before configuring report filters (Include / Exclude Patient Type) and after a conversion.

### Legacy output

PARTIALLY DOCUMENTED: four fields `[P26][P25]`; layout INFERRED: title `Patient Types List`; columns `Type Code`
(two characters), `Description`, flash alert, block charges (meaningful only when the alert is on); one row per type; count.

### Parameters - legacy parity

<!-- PARITY:setup_list_reports.r20 -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Screen preview, then PDF |
| PRINT FORMAT `Excel` | Screen preview, then XLSX; `csv` added |

No filters, no dependency rules.

### Parameters - enhancements

| Key (type) | Default | Effect | Owner |
|---|---|---|---|
| `catalog_status` (family) | `both` | `definitions.is_active` | header |
| `flash_alert_only` (`boolean`) | `false` | Types with `is_flash_alert` | NEW, 04 section 15 |
| `include_patient_counts` (`boolean`, `role: query`) | `false` | Adds active / all patient counts per type and a trailer of unmapped patient-type values | NEW, 04 section 15 |

### Data

| Item | Rule |
|---|---|
| Dataset | `definitions` group `patient_type` (passthrough, DATA-45), one row per (`tenant_id`, `group_code`, `key1`): `key1` (type code), `description`, `is_flash_alert`, `blocks_charges`, `is_active` [V `app/db/models/reference.py` L15-50] |
| Patient counts | `rpt_patient_dim.patient_type_codes` (array: JSON `patient_types` plus the single `patient_type` mapped through `rpt_value_map` domain `patient_type`, data card 3.5); `count(*)` per code, active = `is_active` |
| Unmapped trailer | Raw `patient_type` / `patient_types` values with no `rpt_value_map` entry and no catalog code (DATA-02 readiness) |
| Not this list | The General / Ortho `PATIENT TYPE` criterion is a different concept (data card 3.5) |
| Scope | `office_mode = none`; counts are tenant-wide, limited to patients the caller may see when office-restricted (patient home office) |
| Availability | READY (coverage matrix row 113). Counts on migrated patients depend on the `rpt_value_map` patient-type map |

### Output

| key | label | type | data_class | total |
|---|---|---|---|---|
| `type_code` | Type Code | text | aggregate | count -> `Patient Types : n` |
| `description` | Description | text | aggregate | none |
| `is_flash_alert` | Flash Alert | boolean `Yes` / `No` | aggregate | none |
| `blocks_charges` | Block Charges | boolean; blank when `is_flash_alert` is false | aggregate | none |
| `is_active` | Active | boolean | aggregate | none (default hidden) |
| `active_patient_count` | Active Patients | integer | aggregate | sum; visible when `include_patient_counts` |
| `patient_count` | All Patients | integer | aggregate | sum; visible when `include_patient_counts` |
| hidden `definition_id` | | id | aggregate | row_id_column |

Trailer block `unmapped_values` (`report_end`, when `include_patient_counts`): `raw_value`, `patient_count` (aggregate). Sort
`type_code`. No grouping, no page breaks.

### Visuals and drill-through

None - a list. Row -> `record` Setup > Patient Types. `patient_count` / `active_patient_count` -> `report`
`lists.patient_list_grouped_by` with `report_by = patient_type` and `include_patient_type_codes = [{"column": "type_code"}]`
(needs `phi_identified`).

### Actions

Row: open type in setup. Bulk: `export_selection`. Not a worklist.

### Export and print

PDF portrait, `banded_table`; XLSX one table (+ `unmapped_values` sheet); CSV. Instant.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Are flash alert and block charges printed, and as Yes / No? | Sample |
| 2 | Are inactive types printed (family question 2)? | Live tool |

<!-- WORK-ITEMS -->
| RPT-STLIST-40 | Insurance Plan List definition `lists.insurance_plan_list`: `date_basis_set` + range with the enabling rule, `include_user_in_filters` gate, `plan_audit_user` role, carrier / employer sort options, landscape layout, summary cards | P3 | M | RPT-STLIST-01, RPT-STLIST-02, RPT-STLIST-03, RPT-STLIST-07, RPT-STLIST-08, FLT-01 | Default run lists exactly the plans modified today (office-local); Created On + Modified On = union; unticking the gate removes the user predicate from `params`; a caller without `phi_identified` gets no Employer column and no `employer` sort |
| RPT-STLIST-41 | Plan audit stamps: NEW `insurance_plans.created_by_user_id` written on create, backfill from the create audit event, modified-date rule (`updated_by` set -> `updated_at`, else `modified_on`, else created) in the dataset | P3 | S | DATA-45, DATA-36 | A plan created in the app shows its creator; an unedited migrated plan shows its legacy modified date, never the migration day |
| RPT-STLIST-42 | Plan clean-up enhancements: `plan_usage_status`, `duplicates_only` with `duplicate_set_no`, `patient_count`, `insurance_plan_types`, `plan_coverage_type`; consolidate-duplicates navigate action | P3 | S | RPT-STLIST-40, ENG-49 | Two plans with carrier + employer + group `12-34` / `1234` share one set number; `unused` count equals the Inactive Plans List row count for the same carrier filter |
| RPT-STLIST-43 | Inactive Plans List definition `lists.inactive_plans_list`: live-link anti-join, claim and subscriber counts, `employer_ids` / `group_number` / `count_inactive_links_as_used` / `exclude_plans_with_claims` | P3 | S | RPT-STLIST-02, RPT-STLIST-03, RPT-STLIST-45 | Every listed plan returns patients = 0 from `GET /insurance-plans/{id}/usage`; a plan on one active patient slot is absent |
| RPT-STLIST-44 | Bulk action `custom:deactivate_insurance_plans` (handler in Insurance setup): re-check unused per plan, skip and report used ones, confirm, idempotent, audited | P3 | S | ENG-49, SEC-03 | A selection of 10 where one became used deactivates 9, reports 1; a repeated call changes nothing |
| RPT-STLIST-45 | Index `patient_insurance(ins_plan_id)` (Alembic) for the usage anti-join | P3 | S | DATA-45 | Inactive Plans List over 31k plans runs inside the `instant` budget |
| RPT-STLIST-46 | Explosion Codes List definition `lists.explosion_codes_list` on `code_bundles` + items: Summary / Detail formats, title templates, bundle group level, tenant scope through `code_bundles` | P3 | S | RPT-STLIST-01, RPT-STLIST-02, ENG-11 | Default run prints `Explosion Codes List (Summary)` with the three sample columns; Detail lists members in `sort_order`; no member of another tenant can appear |
| RPT-STLIST-47 | Explosion code enhancements: `procedure_codes` containment filter, `available_office_ids` (whole-catalog rule, shared with r19), `inactive_member_codes_only`, Offices column | P3 | S | RPT-STLIST-46, FLT-09 | Filtering on a code returns every bundle containing it; a bundle without office rows is listed for every office |
| RPT-STLIST-48 | Credit Codes Report definition `lists.credit_codes_report`: current version per code, `is_system` excluded, type band, provisional TYPE / CLASS options with the candidate CLASS rule | P3 | S | RPT-STLIST-06, DATA-03 | TYPE = ALL, CLASS = ALL count equals the selectable codes of the tenant; CLASS `Write-Off` with TYPE `Payment` is refused or reset per the rule |
| RPT-STLIST-49 | Credit code extras: `credit_code_sub_types`, `include_inactive_codes`, `show_analytic_mapping`, `show_versions`, `include_usage` (12-month counts, escalation to interactive) and the drill to Special Transaction Report | P3 | S | RPT-STLIST-48, DATA-06, ENG-30 | A code with two versions prints two rows under `show_versions`; the usage drill returns exactly `usage_count_12m` legs |
| RPT-STLIST-50 | Capitation Fee Schedule definition `lists.capitation_fee_schedule`: `copay` option source with `[ED: m/d/yyyy]` labels, schedule bands, in-force entry rule, hidden catalog office scope, `financial_practice` fees | P3 | S | RPT-STLIST-05, DATA-51 | ALL prints one band per `copay` schedule the caller may read; a code with two dated entries prints the one in force today; no `percentage` schedule is offered |
| RPT-STLIST-51 | Capitation extras: `fee_as_of_date`, `include_ucr` + `compare_fee_schedule_id` with `patient_saves`, `procedure_category_codes`, page break per schedule, drill to Capitation Utilization | P3 | S | RPT-STLIST-50, ENG-30 | `patient_saves` = compare fee - co-pay on every row; the band drill opens Capitation Utilization with the schedule as Fee Schedule To Compare |
| RPT-STLIST-52 | Office Holidays definition `lists.office_holidays`: `holiday_office` attribution, recurring expansion, office band, `holiday_scope`, `holiday_statuses`, presets | P3 | S | RPT-STLIST-04, RPT-STLIST-08 | Default run lists today's holidays of the working office (account rows included, office row wins on the same date); `this_year` lists a recurring holiday once |
| RPT-STLIST-53 | Holiday conflict column `show_booked_appointments` and drill to Appointment List for office + date | P3 | S | RPT-STLIST-52, DATA-16, ENG-30 | `booked_count` equals the rows of the drilled Appointment List; cancelled and archived appointments are not counted |
| RPT-STLIST-54 | Holiday hours: request NEW `account_holidays.open_time`, `close_time` (03), bind `hours_label` | P3 | S | DATA-45 | A `HALF_DAY` holiday with hours prints `8:00 AM - 12:00 PM`; rows without hours print the status only |
| RPT-STLIST-55 | Default Ins Plan Coverage Category List: `python_builder` over `default_coverage_rules()` (whitelist), `source` column, `show_mapped_codes` / `show_unmapped_codes` blocks | P3 | S | ENG-34, RPT-STLIST-02 | Output equals the 28 rows a new plan receives (tenant or built-in); a tenant with five duplicate DEFCOVERAGE copies prints each key once |
| RPT-STLIST-56 | Per-tenant default coverage limits: NEW storage for frequency, age limitation and waiting period of each default category (03), read by plan seeding and the report | P3 | M | DATA-45, RPT-STLIST-55 | Editing a default waiting period changes the report and the next new plan, not existing plans |
| RPT-STLIST-57 | Notes Macro Category List definition `lists.notes_macro_category_list` with `macro_count`, unknown-category trailer and the drill to Notes Macros List | P3 | S | RPT-STLIST-02, ENG-30 | Sum of `macro_count` plus the trailer equals the number of macros; the drill returns exactly that category's macros |
| RPT-STLIST-58 | Notes Macros List definition `lists.notes_macros_list`: category band, category match rule, server-side plain-text rendering of `content`, Offices column | P3 | S | RPT-STLIST-02, RPT-STLIST-08 | ALL lists macros without a category under `(No category)`; macro text in PDF, XLSX and CSV is identical plain text with data tags as `[tag]` |
| RPT-STLIST-59 | Notes macro extras: multi-category with `no_category`, `available_office_ids`, `macro_search_text`, `include_macro_text`, page break per category | P3 | S | RPT-STLIST-58, RPT-STLIST-47 | Searching a tag name returns every macro containing it; `include_macro_text = false` prints one line per macro |
| RPT-STLIST-60 | Patient Types List definition `lists.patient_types_list`: four legacy fields, `flash_alert_only`, block-charges display rule | P3 | S | RPT-STLIST-02 | Every `patient_type` definition key prints once; block charges is blank where flash alert is off |
| RPT-STLIST-61 | Patient type usage: `include_patient_counts`, unmapped-value trailer, drill to Patient List - Grouped By | P3 | S | RPT-STLIST-60, DATA-02, DATA-05, ENG-30 | Count of a type equals the rows of the drilled Patient List - Grouped By run; values missing from `rpt_value_map` appear in the trailer |
<!-- /WORK-ITEMS -->
