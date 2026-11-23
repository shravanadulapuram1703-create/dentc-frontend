# Lists - Provider - report specifications

Provider setup lists of the legacy `Provider List Reports` screen (4 reports, 19 legacy controls, none from vendor
documentation): the provider roster, provider holidays, provider-to-operatory assignments and provider registration
numbers. Hub area **Lists**, tab `provider` (brief section 1; route `/reports/c/lists?subcategory=provider`, category key
`lists`, `subcategory = provider`). Default phase **P3**; no report of the family needs another phase (every dataset is a
P0 dimension or a P3 passthrough of DATA-45).

## Overview

Legacy order. Size: S up to 2 days, M up to 1 week, L up to 2 weeks (brief section 4). Availability = rating of the default
run in `coverage_matrix.md` 11.1 (rows 86-89). Confidence = `research/legacy_report_outputs_lists.md` section 2 (rows
13-16): no vendor article and no generated sample exists for any report of this family, so every printed layout below is
a reconstruction from the criteria screen and the Provider Setup tabs.

| report_key | Legacy name | Purpose | Phase | Size | Data availability | Legacy output confidence |
|---|---|---|---|---|---|---|
| `lists.provider_list` | Provider List | Roster of providers per office with type, specialty, billing flag, address and contact, filtered by specialty and state | P3 | S | READY (specialty and state are sparse: `specialty` blank on 96 of 97 migrated providers) | INFERRED |
| `lists.provider_holidays` | Provider Holidays | Provider time off (one-time and yearly recurring days) that falls in a date range, per office and provider | P3 | S | READY (empty until staff configure holidays: nothing was migrated or seeded) | INFERRED |
| `lists.provider_operatory` | Provider Operatory | Which operatories (schedule columns) each provider is assigned to, per office | P3 | S | READY | INFERRED |
| `lists.provider_registration` | Provider Registration | Registration and identification numbers per provider (NPI, licence, DEA, tax id, taxonomy) for credentialing | P3 | M | READY (licence state and expiry, DEA expiry: SCHEMA(45)) | INFERRED (low) - the content itself is unconfirmed |

## Shared rules

### Shared parameters and defaults

Exactly as in `catalog/parity/providers_list_reports.parity.json` (PARITY VALID, 19 controls: 4 `replicated`, 15
`replicated_enhanced`). Every key is a parameter of `filter_card.md` section 3; values are the legacy defaults (AD-8).

| Parameter (type) | Reports | Default | Family rule |
|---|---|---|---|
| `output_format` (`enum`: `pdf`, `xlsx`, added `csv`) | all 4 | `pdf` | `role: output`; never changes the rows; PRINT / PREVIEW always shows the result on screen first, then renders the chosen format |
| `office_scope` (`office_scope`: `office_ids`, `office_group_id`, `office_group_ids`, `all_offices`) | all 4 | `working_office` (mode `office`) | Rule `providers_list_reports.r01.d01` holds for the whole family: mode `office_group` switches the picker to `lookup:office_groups`; with no groups defined (every migrated tenant, `office_groups` empty) the group value `all` = every office the caller may read. Office attribution per report: table below |
| `provider_ids` (`entity_multi`, `lookup:providers`) | r01, r02, r03 | `all` | The **listed** provider, never a treating, appointment or preferred provider. Roster-first picker (prefer, never exclude), active and inactive providers. r04 has no provider control |
| `specialty_codes` (`entity_multi`, `lookup:specialties`) | r01 | `all` | Legacy single-select dropdown; a list is the enhancement |
| `state_codes` (`entity_multi`, `lookup:definitions:state`) | r01 | `all` | Legacy single-select dropdown; a list is the enhancement |
| `date_range` (`date_from`, `date_to`, `date_preset`) | r02 | `today` / `today` | Fixed basis `holiday_date` (04 7.2). Legacy header `LAST VISIT DATE RANGE` is a re-used string; the new label is "Holiday date range" with the legacy header as `legacy_label` |

Family enhancement parameters (NEW, report-specific keys of this catalog; the parameter dictionary of
`04_filter_framework.md` section 15 should own them):

| Key (type) | Reports | Default | Meaning | Parity guard |
|---|---|---|---|---|
| `provider_status` (`enum`: `active`, `inactive`, `both`) | all 4 | `both` | `rpt_provider_dim.is_active`. The legacy screens have no active / inactive control and no sample shows whether inactive providers print; `both` never hides a row the legacy run might print, and an `Active` column shows the state (`default_differs_reason` not needed: no legacy control exists). Open question 1 | Changing it narrows only |
| `provider_kinds` (`enum_multi`: `dentist`, `hygienist`, `assistant`, `specialist`, `staff`, `other`) | r01, r03, r04 | all ticked (`semantics.full_selection = no_predicate`, `min_items` 1) | `rpt_provider_dim.provider_kind` (03 3.4); `other` = unrecognised role strings. Full selection keeps providers whose kind is unrecognised | Default adds no predicate |

### Office and provider attribution

The family lists setup entities, not transactions, so none of the attributions of `data_card.md` 5.1 fits. Two NEW
attribution values are needed in 03 section 5.1 (owner `03_data_foundation.md`):

| Value (NEW) | Column | Reports | Rule |
|---|---|---|---|
| `served_office` | `rpt_provider_dim.served_office_ids` (`provider_offices` union the provider's home office, 03 2.3) | r01, r02, r04 | A provider is in scope when `served_office_ids && :office_ids`. The row is repeated under every **selected** office the provider serves (office band), so an office's roster is complete on its own page; the grand total counts distinct providers, not rows. The home office alone (`providers.office_id`) is never used to exclude (prefer, never exclude rule of CLAUDE.md and 03 2.3) |
| `operatory_office` | `operatories.office_id` | r03 | An assignment is in scope when its operatory belongs to a selected office |

Provider attribution value (NEW, 03 5.2): `listed_provider` = `rpt_provider_dim.provider_id` of the row itself (r01, r02,
r04) and `operatory_provider` = the provider linked to the operatory (r03). `scope.provider_restriction = none` on all four
(standard reports, 08 PR-2): a provider-restricted caller sees the whole roster, as in the legacy tool.

### Datasets and freshness

| Dataset | Kind | Reports | Phase |
|---|---|---|---|
| `rpt_provider_dim` | view (DATA-05) | all 4 | P0 |
| `rpt_office_dim` | view (DATA-05) | all 4 (office band label `office_name`, `short_id`) | P0 |
| `provider_holidays` | passthrough (DATA-45) | r02 | P3 |
| `account_holidays` | passthrough (DATA-45; NEW registration for the r02 enhancement `include_office_holidays`) | r02 | P3 |
| `operatories` | passthrough (DATA-45) | r03 | P3 |
| `provider_insurance_ids` + `insurance_carriers` | passthrough (DATA-45) | r04 | P3 |

`freshness = live` for every definition (dimension views and OLTP passthroughs). All four are `cost_class = instant` (a
tenant has tens to a few hundred providers; holidays and operatories are of the same order). `cacheable = false`: setup
edits must show immediately. Migrated history: none of these lists is historical - they show the setup as it stands now.
`providers` has no `updated_at` until DATA-45, so "changed since" filters are not offered before P3.

### Sign conventions, sort and totals

No money column exists in this family. Counts only: every report ends with a grand total `Providers : n` (distinct
`provider_id`) and, where relevant, a row count of its own (`Holidays : n`, `Assignments : n`). Default sort inside the
office band: provider last name, first name, then `provider_id` as the tie-breaker (`row_id_column`). The legacy tool
sorts some lists by first name (`research` section 9 item 2); for these reports the legacy sort is unknown, so the
documented default is last name (open question 2).

### Page furniture (all four)

From `research/legacy_report_outputs_lists.md` 3.2 (list-type samples of other reports, not of this family):

| Element | Rule |
|---|---|
| Header line 1 | Office name when the run resolves to one office; organisation (practice-group) name otherwise |
| Header line 2 | Printed title = legacy name (`Provider List`, `Provider Holidays`, `Provider Operatory`, `Provider Registration`); `title_templates[]` not needed |
| Office band | `fixed_outer` level `office` with header `Office : {office_name}`, `when ["ctx", "multi_office"]`; single-office runs print no band |
| Footer criteria echo | `criteria_echo = footer`: `Offices :` (names, or `ALL`), `Office Group :` in group mode, `Providers : ALL` or names, r01 `Specialty :` and `State :`, r02 `From :` / `Thru :` in `M/D/YYYY`; non-default enhancements are echoed after the legacy criteria |
| Tail | Title repeated, `Printed : <m/d/yyyy h:mm:ss AM/PM>` in office time, `By : <user>`, `Page : n of m`. The vendor line `PlanetDDS (c) 2003 - <year>` is not reproduced (DentC footer instead) |

### Rights and data classes

| Item | Rule |
|---|---|
| Right family | `lists_provider` = `reports_lists_provider_list_screen_view_only` / `reports_lists_provider_list_screen_full_control` (security card 2.2, kept codes). View Only = run and view on screen; Full Control = also print, PDF; XLSX / CSV also need `reports_export_data_files` (08 2.1) |
| Default grants | Full Control seeded for the groups `Adm`, `Adm2`, `Clin`, `OM`, `VBSins`; View Only for `Adm2` ([A] `analysis/be_data_identity_setup.md` L162-163) |
| Column classes | `aggregate` for every column of r01-r03 (provider and operatory labels as operational attributes, setup catalog content, 08 5.1). Provider address, phone and e-mail are practice letterhead data (LTR-3), classed `aggregate` (family open question 6 asks 08 to confirm) |
| Per-report override | `lists.provider_registration`: `tax_id` and `dea_id` (and the NEW `dea_expires_on`) are `security_users` (security card 2.3). They are non-key columns: a caller without the class gets the report without them (08 5.6) |
| Patient manifest | None: no column of the family identifies a patient, so runs write no manifest entries (ENG-14 still writes the run event) |
| Never a column | `provider_carrier_logins` (credentials), `provider_signatures`, `provider_watermarks`, `users.signature_data` (08 5.5) |

### Family-wide enhancements

| Enhancement | Detail |
|---|---|
| Saved views and favorites | ADD TO MY FAVORITES = server-side saved view + favorite (ENG-28, ENG-29); relative date presets on r02 (`next_30_days` NEW, `this_month`, `next_month` NEW, `this_year`; the NEW presets are defined in the Provider Holidays enhancements) |
| Office choices | `my_offices`, several office groups, `all` (filter card 12) |
| Schedules | All four `schedulable = true` (no patient context). Typical: r02 monthly "next month" to office managers; r04 monthly with `expiring_within_days = 60` once DATA-45 lands |
| Record drill | Every provider cell opens Provider Setup: `route_key = provider_setup` (NEW, request to 07 `recordRoutes.ts`: `/setup/providers/provider-setup?provider_id=:id&tab=:tab`, the tab named per report); operatory cells of r03 use `route_key = office_setup` (NEW, same request: `/setup/offices/office-setup?office_id=:id&tab=operatories`). Both keys are absent from the route map of 07 today and fail the contract test until RPT-PRLIST-07 lands them. The target needs the Provider Setup / Office Setup feature right in `drill_targets[].right_code` (code owned by 08) |
| Data-quality hints | Run warnings (`availability[]`) per report: blank specialty / state on r01, no holidays configured on r02, providers without any operatory link on r03, blank NPI / licence on r04 |
| Export selection | Bulk `export_selection` on every report (Full Control + `reports_export_data_files`) |

### Family-wide open questions

| # | Question | How to confirm on the live legacy tool |
|---|---|---|
| 1 | Do the four lists print inactive providers? (drives the `provider_status` default) | Inactivate a test provider, run each list |
| 2 | Row order of each list (last name, first name, short id, provider id) | Run with three providers of different initials |
| 3 | Which office assignment OFFICE/GROUP reads: `Works At` offices, home office, or both | Run for an office where a provider works but is not homed |
| 4 | Is the PROVIDER picker's list all providers or the office roster; are inactive providers in it | Open SELECT with an inactive provider present |
| 5 | Is the Excel output a flat table or the PDF layout in cells | Export each report to Excel once |
| 6 | Product / 08: confirm that provider address, phone and e-mail (LTR-3 letterhead) are class `aggregate` and not `security_users` | Decision for `08_security_compliance.md` |

## Provider List - `lists.provider_list`

Lists › Provider List Reports › Provider List, screenshot `1.PNG` - P3 - S - family `lists_provider` - instant - INFERRED

### Purpose

Office administrators and credentialing staff, on demand: after provider setup, before a payer credentialing or audit
submission, when an office opens or a provider joins or leaves. Answers "who works at this office, as what, with which
specialty, and how is each provider reached". Also the clean-up list for incomplete provider records (blank specialty,
state, phone) before the claim and letter features depend on them.

### Legacy output

No vendor sample, article or description exists (`research` section 6, confidence INFERRED). The content checklist
below is reconstructed from the `Setup > Providers > Provider Setup` `Info` tab fields `[P38]` and the comparables Dentrix
Enterprise `Practice Organization List` and SoftDent `Alphabetical Provider List Report` `[C1][C3]`.

| Item | Reconstruction | Basis |
|---|---|---|
| Printed title | `Provider List` | menu name; list samples print the report name `[I]` |
| Header | Office name (single office) or practice-group name | family page furniture (research 3.2) |
| Grouping | Office band, providers below | `[I]` from the OFFICE/GROUP criterion |
| Columns (order is a proposal) | `Provider ID`, `Short ID`, name `Last, First` with degree, `Provider Type` (`Dentist`, `Hygienist`, `Assistant`, `N/A`), `Billing Provider` (yes / no), `Specialty`, address, city, state, zip, phone, e-mail, `Active`, `Is Ortho Provider` | `[P38]` field list; `[I]` that each prints |
| Totals | none documented; a provider count is added | `[I]` |
| Variants | none (no REPORT FORMAT, REPORT BY or SORT control) | `[L2]` |

Quirks kept: SPECIALTY and STATE are single-value dropdowns in the legacy tool (kept as the default behaviour; a list is
allowed). Deliberate fixes: a stable sort with an id tie-breaker; one row per provider per office band, counted once in the
grand total; inactive providers are visible with an `Active` column instead of an unknown implicit rule (open question 1
of the family). The legacy `Provider ID` prints first as `provider_display_id` = `coalesce(legacy_id, provider_id)`, so a
converted practice sees its legacy numbers and a new provider its DentC id (whether it prints at all: open question 1).

### Parameters - legacy parity

<!-- PARITY:providers_list_reports.r01:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group; both options enabled on all four Provider List reports (rule d01). |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (legacy correction: the box defaults to the session office, SELECT picks others). Offices (mode office) or office groups (mode office_group); the selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. On this report the office is the provider's roster, not a transaction office: office_attribution = served_office (NEW value, owned by 03 5.1) = overlap of rpt_provider_dim.served_office_ids (provider_offices union home office) with the resolved office set; a provider serving two selected offices is listed under each office band. Which assignment the legacy filter reads (Works At offices assumed) is INFERRED - confirm on the live tool. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction; dialog content never captured - confirm list source and whether inactive providers are listed. Role on this report: the listed provider itself (provider_attribution = listed_provider, NEW value for 03 5.2): rpt_provider_dim.provider_id IN (:provider_ids). Not the treating, appointment or preferred provider. The option source lists the roster of the selected offices first, never excludes others (prefer-never-exclude); a picked provider outside the office set returns no row because the office filter still applies. |
| SPECIALTY | (no label) (dropdown) | shown: ALL | `specialty_codes` | entity_multi | - | `all` | replicated_enhanced | Lookup-fed dropdown captured collapsed (only ALL known; value list never captured). Options from lookup:specialties (GET /provider-specialties). Filters rpt_provider_dim.specialty, free text, blank on 96 of 97 migrated providers: matched to the catalog value case-insensitively through rpt_value_map domain specialty (NEW, 03 3.7). ALL adds no predicate and keeps providers with a blank specialty; a selected value drops them (null_policy drop). Legacy is single-select; a list is the enhancement. Confirm the list source on the live tool. |
| STATE | (no label) (dropdown) | shown: ALL | `state_codes` | entity_multi | - | `all` | replicated_enhanced | Lookup-fed dropdown captured collapsed (only ALL known). Options from lookup:definitions:state (50 states + DC). Filters rpt_provider_dim.state (provider letterhead address state, free text) normalised to the USPS code through rpt_value_map domain state (03 3.7). Which provider state the legacy filter reads (address state assumed, not licence state) is INFERRED. ALL keeps providers without a state. Legacy is single-select; a list is the enhancement. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |

| Legacy behaviour (vendor documentation): when | Effect | In the new module |
|---|---|---|
| OFFICE/GROUP = Office Group | The SELECT picker chooses office groups defined in Setup > Office Groups (for example regions) instead of offices; when no office groups are defined, a group run covers all offices of the account. Cross-cutting statement of the document for all Lists screens (vendor articles on office groups and on the new reports menu) - recorded once here; it applies to all four Provider List reports. | office_scope: the radio value office_scope.mode = office_group switches the picker to lookup:office_groups and the selection fills office_group_id (one group) or office_group_ids (several, enhancement); mode office fills office_ids (default working_office). A group resolves to its member offices intersected with the caller's readable offices. When the tenant has no office groups (every migrated tenant: office_groups is empty) the group mode offers the single value all, which resolves to every office the caller may read - the legacy 'group run covers all offices'. Same behaviour on lists.provider_holidays, lists.provider_operatory and lists.provider_registration (the rule is recorded once, on r01). |
<!-- PARITY:providers_list_reports.r01:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) | Screen result, then a PDF (`output_format = pdf`); rows unchanged |
| PRINT FORMAT `Excel` | Screen result, then an XLSX file (`xlsx`), one flat sheet; rows unchanged. Added `csv` |
| OFFICE/GROUP `Office` (default) + office box (default = working office, legacy `108`) | `office_ids`: providers whose roster (`served_office_ids`) overlaps the selected offices; one office band per selected office they serve |
| OFFICE/GROUP `Office Group` + group picker | `office_group_id` / `office_group_ids`: offices of the group(s) intersected with the caller's offices, then as above. No groups defined: `all` = every readable office (rule d01) |
| PROVIDER `ALL` (default) | No provider predicate |
| PROVIDER one or more providers | `rpt_provider_dim.provider_id IN (:provider_ids)`; a picked provider who serves none of the selected offices returns no row (the office filter still applies) |
| SPECIALTY `ALL` (default) | No predicate; providers with a blank specialty are listed |
| SPECIALTY one value | Providers whose normalised specialty equals the value; blank-specialty providers dropped |
| STATE `ALL` (default) | No predicate; providers without a state are listed |
| STATE one value | Providers whose address state (normalised to USPS code) equals the value |
| CLEAR CRITERIA | Every parameter back to its default |
| ADD TO MY FAVORITES | Saved view + favorite with the current criteria |

Dependency rules: d01 only (OFFICE/GROUP radio switches the picker source between offices and office groups). No control
is greyed in the capture; SPECIALTY and STATE are independent of the provider picker.

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `provider_status` (`enum`) | `both` | Family parameter (header): active / inactive / both |
| `provider_kinds` (`enum_multi`) | all ticked | Family parameter: dentist, hygienist, assistant, specialist, staff, other |
| `only_billing_providers` (`boolean`, NEW) | `false` | `true` = `is_billing_provider` only - the list a billing office checks against claim setup |
| `only_ortho_providers` (`boolean`, NEW) | `false` | `true` = `is_ortho_provider` only - matches the ortho reports' provider pickers |
| `missing_fields` (`enum_multi`, NEW: `specialty`, `state`, `address`, `phone`, `email`, `npi`, `short_id`; `min_items` 0) | empty list = no restriction | Providers missing at least one ticked field: the provider-record completeness worklist |
| `group_by` (`enum`: `none`, `provider_kind`, `specialty`) | `none` | Second level under the office band with a provider count per group |
| `sort_by` (`enum`: `provider_last_name`, `short_id`, `provider_kind`) | `provider_last_name` | Row order inside the innermost group |
| `specialty_codes` multi-select | `all` | Several specialties at once (legacy single) |
| `state_codes` multi-select | `all` | Several states at once - multi-state groups |

### Data

| Item | Rule |
|---|---|
| Dataset | `rpt_provider_dim` (03 2.3), joined to `rpt_office_dim` for the band label through `unnest(served_office_ids)` restricted to the resolved office set (one row per provider x selected served office; join on the unique key `office_id`) |
| Columns used | `provider_id`, `short_id`, `provider_name`, `first_name`, `last_name`, `title`, `provider_kind`, `role_raw`, `specialty`, `taxonomy_code`, `is_billing_provider`, `is_ortho_provider`, `address_line1`, `city`, `state`, `zip`, `phone`, `email`, `npi`, `is_active`, `served_office_ids`, `home_office_id` (label only) |
| NEW dimension columns | NEW `rpt_provider_dim` columns owned by `03_data_foundation.md` 2.3 / DATA-05 (not DATA-45): `address_line2` (exists on `providers`, not yet in the dimension), `legacy_id` (`providers.legacy_id`, legacy `Provider ID` of converted practices), `served_office_names` (`string_agg(rpt_office_dim.office_name, ', ' ORDER BY office_name)` over `served_office_ids`, for the XLSX column). Dependency of RPT-PRLIST-10 |
| Office scope | `served_office` attribution (header): `served_office_ids && :office_ids` |
| `provider_ids` | `provider_id IN (...)` |
| `specialty_codes` | `rpt_value_map('specialty', specialty) IN (...)` (domain NEW in 03 3.7; the source catalog is `GET /provider-specialties`); `specialty` is free text and blank on 96 of 97 migrated rows [D] |
| `state_codes` | `rpt_value_map('state', state) IN (...)`; `state` is the letterhead state added by LTR-3, empty on migrated providers until edited |
| Date basis | none (`date_basis = null`; current setup state) |
| Availability | READY (coverage matrix row 86). `availability[]`: `sparse_specialty` and `sparse_state` warnings when more than half of the listed providers have no value; no history (the list is current state; `providers.updated_at` only from DATA-45) |

### Output

One format `standard`, block `main`, shape `table`:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `provider_display_id` | Provider ID | `text` | `aggregate` | first column, `default_visible = true`; `coalesce(legacy_id, provider_id::text)` |
| `provider_id` | - | `id` | `aggregate` | hidden; `row_id_column`; drill key |
| `legacy_id` | Legacy ID | `text` | `aggregate` | `default_visible = false` |
| `short_id` | Short ID | `text` | `aggregate` | - |
| `provider_name` | Provider | `text` | `aggregate` | `count_distinct(provider_id)` label `Providers :` per band and grand total |
| `title` | Degree | `text` | `aggregate` | - |
| `provider_kind` | Provider Type | `enum` (`dentist` Dentist, `hygienist` Hygienist, `assistant` Assistant, `specialist` Specialist, `staff` Staff; a blank or unrecognised role (`other`) prints `N/A`, the legacy label) | `aggregate` | - |
| `role_raw` | Role (raw) | `text` | `aggregate` | hidden on screen and PDF; XLSX / CSV column only |
| `is_billing_provider` | Billing Provider | `boolean` | `aggregate` | `count` of true, label `Billing :` |
| `specialty` | Specialty | `text` | `aggregate` | `null_display` `-` |
| `taxonomy_code` | Taxonomy | `text` | `aggregate` | `default_visible = false` |
| `address_line1` | Address | `text` | `aggregate` | - |
| `address_line2` | Address 2 | `text` | `aggregate` | `default_visible = false` |
| `city` | City | `text` | `aggregate` | - |
| `state` | State | `text` | `aggregate` | - |
| `zip` | Zip | `text` | `aggregate` | - |
| `phone` | Phone | `text` | `aggregate` | - |
| `email` | E-mail | `text` | `aggregate` | - |
| `npi` | NPI | `text` | `aggregate` | `default_visible = false` (shown on r04) |
| `is_ortho_provider` | Ortho | `boolean` | `aggregate` | - |
| `is_active` | Active | `boolean` | `aggregate` | `count` of false, label `Inactive :` |
| `served_office_names` | Works At | `text` | `aggregate` | `default_visible = false`; XLSX and CSV only by default |
| `office_id`, `office_name` | Office | `id`, `text` | `aggregate` | hidden group key and label of the `fixed_outer` band |

| Item | Rule |
|---|---|
| Group levels | `fixed_outer` office band (`when ["ctx", "multi_office"]`), then optional `group_by` level (`provider_kind` or `specialty`) with a provider-count subtotal; `grand_total.label = "All offices"` |
| Sort options | `provider_last_name` = `last_name`, `first_name`, `provider_id` (default); `short_id` = `short_id`, `provider_id`; `provider_kind` = `provider_kind`, `last_name`, `provider_id` |
| Page break | Enhancement `page_break_by` (`none` default, `office` NEW value, owner 04 section 15): one office per page |
| Summary header | Three cards over block totals: providers listed, billing providers, inactive providers (no metric keys: the counts are block totals, not registry metrics) |

### Visuals and drill-through

Chart: none by default; optional `charts[]` hint `providers_by_kind` (bar, `category_column = provider_kind`, value =
provider count) for the multi-office comparison of staffing mix. Drill: a provider cell → record `provider` (`route_key =
provider_setup`, tab `Info`); a band subtotal → `lists.provider_registration` with `office_ids = {group: office_id}`;
a `provider_kind` subtotal → `rows` (same report filtered to that kind).

### Actions

| Action | Kind | Note |
|---|---|---|
| Open provider setup | `navigate` (row) | Provider Setup, `Info` tab |
| Export selection | `export_selection` (bulk) | Full Control + `reports_export_data_files` |
| Message provider | `custom:send_internal_message` (row) | Only for providers with a linked user (`user_id`), through the messaging feature; hidden otherwise |

Doubles as a worklist with `missing_fields` set: each row is a provider record to complete; the row action opens the
record on the tab that holds the missing field.

### Export and print

PDF landscape, banded table, letter size, repeat header, footer criteria echo (family page furniture). XLSX one sheet
`Provider List`, one row per provider x office, the office as a column (no band rows), frozen header, autofilter, criteria
sheet. CSV the same table. Never background (instant).

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Printed columns and their order (no sample exists); does `Provider ID` print, and is it the legacy sequential id | Print one Provider List |
| 2 | Value list and source of SPECIALTY (setup list `Specialty` of Provider Setup assumed) | Open the dropdown |
| 3 | Which state STATE reads: the provider address or the licence state (address assumed) | Set a provider's licence state different from the address state and filter |
| 4 | Does the STATE list show all states or only states used by providers | Open the dropdown on a one-state practice |
| 5 | Is a provider printed once per office of the group or once per run | Run an office group where a provider works at two offices |

## Provider Holidays - `lists.provider_holidays`

Lists › Provider List Reports › Provider Holidays, screenshot `2.PNG` - P3 - S - family `lists_provider` - instant - INFERRED

### Purpose

Office managers and schedulers, weekly or monthly ahead of the schedule: which providers are off on which days, so that
coverage is arranged, appointments on those days are moved and goals or payroll use the right working days. Also the
check after entering a provider's vacation that the days were recorded.

### Legacy output

No vendor description and no comparable report exist (INFERRED). Data behind it: `Provider Setup > Holidays` tab, list
"Holidays or Exceptions" `[P38][P39]`: each entry `One Time` or `Recurring` (every day, week, two, three or four weeks,
with `From Date` / `To Date`), type `Office Closed` or `Office Open` (with start, end and lunch times), and a description.

| Item | Reconstruction | Basis |
|---|---|---|
| Printed title | `Provider Holidays` | menu name `[I]` |
| Grouping | Office, then provider | `[I]` research "Likely output" |
| Columns | date or date range, description, type (`Office Closed` / `Office Open`), recurrence, hours (open-exception start / end / lunch) | `[P38]` fields; `[I]` that each prints |
| Population | entries intersecting the date range | `[I]` (the range header reads `LAST VISIT DATE RANGE`, a re-used string - vendor-documented correction) |
| Totals | none documented; a holiday count is added | `[I]` |

DentC stores less than the legacy Holidays tab: `provider_holidays` has whole days only (`holiday_date`), `status`
(`CLOSED`, `OPEN`, `HALF_DAY`), `holiday_type` (`FEDERAL`, `CUSTOM`), `is_recurring` (yearly on the same month and day,
as `office_calendar_service` and `appointnow_service._holiday_hits` apply it [V]), `holiday_name`, `created_by` and the
time stamps. Legacy weekly / n-weekly recurrence, `From Date` / `To Date` spans and open-exception hours have no column:
those legacy columns print empty until the schema gains them (NEW, request to 03: `provider_holidays.end_date`,
`recurrence_rule`, `open_start_time`, `open_end_time`, `lunch_start`, `lunch_end`). Quirk fixed: the misleading header is
relabelled "Holiday date range" (legacy header kept as `legacy_label` and as an alias in the help text).

### Parameters - legacy parity

<!-- PARITY:providers_list_reports.r02:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group; both options enabled on all four Provider List reports (rule d01). |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (legacy correction: the box defaults to the session office, SELECT picks others). Offices (mode office) or office groups (mode office_group); the selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. provider_holidays has no office column: the office set selects the providers through rpt_provider_dim.served_office_ids (office_attribution = served_office, NEW, 03 5.1); each holiday row is printed under every selected office the provider serves. INFERRED - confirm on the live tool whether legacy provider holidays are per office. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction; dialog content never captured - confirm list source and whether inactive providers are listed. Role: the provider who owns the holiday row (provider_holidays.provider_id; provider_attribution = listed_provider, NEW, 03 5.2). |
| LAST VISIT DATE RANGE | Start Date (date_input) | shown: 11/21/2026 | `date_from` | date_range | - | `today` | replicated_enhanced | Primary date range, start. Legacy header LAST VISIT DATE RANGE is a re-used string from Patient List - Grouped By (vendor-doc correction); the range is the holiday date (date_basis = holiday_date, fixed, 04 7.2). Row test (INFERRED, the document's reading): a one-time holiday whose holiday_date lies in the range; a recurring holiday (is_recurring) contributes its occurrences that fall in the range. Default = today in the office time zone (relative token); enhanced with presets. |
| LAST VISIT DATE RANGE | End Date (date_input) | shown: 11/21/2026 | `date_to` | date_range | - | `today` | replicated_enhanced | Primary date range, inclusive end; date_basis = holiday_date (legacy header is a re-used mislabel). Same intersection rule as the start date (INFERRED). Default = today in the office time zone; enhanced with presets and relative tokens. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:providers_list_reports.r02:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Output file only (`pdf` / `xlsx`, added `csv`); rows unchanged |
| OFFICE/GROUP `Office` (default, working office) / `Office Group` | Selects the providers whose roster overlaps the resolved offices; each holiday row is printed under every selected office the provider serves (holidays have no office column) |
| PROVIDER `ALL` (default) / list | `provider_holidays.provider_id IN (...)` |
| LAST VISIT DATE RANGE `Start Date` (default today) | Lower bound of the occurrence date, inclusive, office-local |
| LAST VISIT DATE RANGE `End Date` (default today) | Upper bound, inclusive. A one-time holiday is listed when `holiday_date` is in the range; a recurring holiday once per yearly occurrence in the range. Default run = the providers off **today** |
| CLEAR CRITERIA / ADD TO MY FAVORITES | Defaults / saved view + favorite |

Dependency rules: none captured besides family rule d01 (office versus office group). `date_from <= date_to` is validated
(422 otherwise); no maximum span (instant either way).

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `date_range` presets | `today` | `this_month`, `this_year`, and three NEW presets (owner 04 section 7.4): `next_7_days` = `today` / `today+6d`, `next_30_days` = `today` / `today+29d`, `next_month` = `start_of_next_month` / `end_of_next_month` - the useful planning windows; a saved view with `next_month` scheduled monthly |
| `holiday_statuses` (`enum_multi`, NEW: `closed`, `open`, `half_day`; `no_predicate` on full selection) | all ticked | Only closures, only in-office exceptions, or half days. A NULL `status` matches `closed` (the same rule as `rpt_office_calendar_days`) |
| `include_office_holidays` (`boolean`, NEW) | `false` | `true` adds the account-wide and office holidays of `account_holidays` for the selected offices as rows with `source = office` / `account`, so the list shows every day a provider is not available; `false` is the legacy population (provider rows only, `[I]`) |
| `only_with_appointments` (`boolean`, NEW) | `false` | `true` keeps closing holidays on which the provider still has live appointments (`rpt_appointment_facts`, P1) and adds the column `Appts` - the reschedule worklist |
| `provider_status`, `group_by` (`enum`: `none` default, `month`) | `both`, `none` | Family status filter; a month level for year-long runs |

### Data

| Item | Rule |
|---|---|
| Datasets | `provider_holidays` passthrough through the NEW function `rpt_provider_holiday_occurrences(p_tenant_id, p_from, p_to)` (DATA-55, owner 03 2.28; the ONE recurrence expansion: `rpt_provider_calendar_days()` consumes it for its closing-holiday test, so the two cannot drift): one row per (holiday row, occurrence date) - one-time rows when `holiday_date BETWEEN p_from AND p_to`; recurring rows for every year y with `make_date(y, month, day)` in the range (29 February only in leap years); `rpt_provider_dim` for labels and roster; `rpt_office_dim` for bands; enhancement: `account_holidays` passthrough, `rpt_appointment_facts` |
| Date basis | `holiday_date` (fixed, 04 7.2): the occurrence date, a plain `date` with no time zone (it is entered as an office-local calendar day); "today" = `rpt_office_dim.local_today` of the working office |
| Office scope | `served_office` (header); `holiday_type = FEDERAL` rows are provider rows like any other |
| `provider_ids` | `provider_id IN (...)` on the holiday row |
| `created_by` | `users.id` → user label (`aggregate`, operational) |
| Availability | READY (coverage row 87). `availability[]` code `no_provider_holidays_configured` when the tenant has no `provider_holidays` row at all (nothing was migrated or seeded [V] `be_data_scheduling.md` 2.1): the warning distinguishes "not set up" from "nobody is off". Recurrence other than yearly, date spans and open-exception hours: NEW columns (Legacy output) |

### Output

One format `standard`, block `main`, shape `table`:

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `holiday_id` | - | `id` | `aggregate` | hidden; with `occurrence_date` the `row_id_column` |
| `provider_id` | - | `id` | `aggregate` | hidden group key |
| `provider_label` | Provider | `text` | `aggregate` | group header `{provider_name} ({short_id})`; subtotal `count` label `Days off :` |
| `occurrence_date` | Date | `date` (`M/D/YYYY`) | `aggregate` | - |
| `day_of_week` | Day | `text` | `aggregate` | - |
| `holiday_name` | Description | `text` | `aggregate` | - |
| `status` | Type | `enum` (`CLOSED` Office Closed, `OPEN` Office Open, `HALF_DAY` Half Day; NULL counts as closed, as the calendar does) | `aggregate` | `count` per value in the summary header |
| `recurrence` | Recurrence | `enum` (`one_time` One Time, `yearly` Recurring - Yearly) | `aggregate` | - |
| `holiday_type` | Source type | `enum` (`FEDERAL` Federal, `CUSTOM` Custom) | `aggregate` | `default_visible = false` |
| `source` | Source | `enum` (`provider`, `office`, `account`) | `aggregate` | visible only when `include_office_holidays` |
| `open_hours` | Hours | `text` | `aggregate` | `null_display` empty; filled only after the NEW time columns |
| `appointment_count` | Appts | `integer` | `aggregate` | visible only when `only_with_appointments`; `sum` |
| `created_by_label`, `updated_at` | Entered by, Changed | `text`, `datetime` | `aggregate` | `default_visible = false` |
| `office_id`, `office_name` | Office | `id`, `text` | `aggregate` | `fixed_outer` band |

| Item | Rule |
|---|---|
| Group levels | Office band (multi-office), provider level (header, `Days off :` subtotal), optional `month` level outside the provider; grand total `Holidays : n` and `Providers : n` (distinct) |
| Sort | Fixed: provider last name, first name, `occurrence_date`, `holiday_id` (no legacy SORT control; `sort_by` not offered) |
| Page break | Enhancement `page_break_by` (`none` default, `office` NEW value owned by 04 section 15, `provider`) |
| Summary header | Providers off in the range, closed days (NULL status counted as closed), open exceptions, half days (block totals) |

### Visuals and drill-through

Chart (optional): a calendar heat strip by day (`kind = calendar`, value = providers off) for ranges over 7 days - shows
clustered absences. Drill: provider header → Provider Setup, `Holidays` tab; a date cell → the Scheduler day view for that
date and the provider's office (`route_key = scheduler_day`, date and `office_id` passed); `appointment_count` →
`appointment.appointment_detail` with `date_range` = that day and `provider_ids = [provider_id]`.

### Actions

| Action | Kind | Note |
|---|---|---|
| Open provider holidays | `navigate` (row) | Provider Setup, `Holidays` tab |
| Open schedule day | `navigate` (row) | `route_key = scheduler_day` (NEW `openSchedulerAtDate`, 07): date and office of the row; no booking state |
| Create task | `create_task` (bulk) | "Reschedule appointments of {provider} on {date}" per selected row with `appointment_count > 0` |
| Export selection | `export_selection` (bulk) | - |

Worklist use: with `only_with_appointments = true` the report is the "appointments on provider days off" worklist; it is a
candidate entry for 06 section 6 (NEW, owner `06_dashboards.md`).

### Export and print

PDF portrait, banded (office, provider), footer echo with `From :` / `Thru :`. XLSX one sheet `Provider Holidays`, one row
per occurrence with office and provider as columns, typed date cells. CSV the same. Never background.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Does the range select holidays that intersect it (document's reading) or holidays created in it | Enter a holiday next month, run with today / today |
| 2 | Are recurring entries expanded per occurrence or printed once with their pattern | Enter a weekly recurring holiday, run a month |
| 3 | Are office and enterprise holidays included (the holiday hierarchy) | Add an office holiday, run the report |
| 4 | Is a legacy provider holiday per office or for every office | Open Provider Setup > Holidays of a two-office provider |
| 5 | Product: should DentC store the legacy recurrence patterns and open-exception hours (NEW columns above) | Product decision; needed for migrated converted practices only if legacy holidays are ever imported |

## Provider Operatory - `lists.provider_operatory`

Lists › Provider List Reports › Provider Operatory, screenshot `3.PNG` - P3 - S - family `lists_provider` - instant - INFERRED

### Purpose

Administrators troubleshooting the Scheduler (an appointment shows the wrong provider, a provider is missing from a view,
column headers are wrong) and setting up a new office: which operatories each provider is assigned to. The vendor's best
practice is that providers do not share operatories `[P38]`; the list is where a shared or missing assignment is spotted.

### Legacy output

INFERRED, no comparable. Data behind it: `Provider Setup > Ops` tab - the operatories a provider is assigned to, per office
`[P38]`; operatories are schedule columns of `Setup > Offices > Operatories`, shown in alphanumeric order `[P39]`.

| Item | Reconstruction | Basis |
|---|---|---|
| Printed title | `Provider Operatory` | menu name `[I]` |
| Grouping | Office → provider (short ID, name) → operatory names | research "Likely output" `[I]` |
| Totals | none documented | - |

DentC has two provider-operatory links instead of the legacy many-to-many Ops tab: `operatories.provider_id` (the provider
shown in the operatory column header, one per operatory) and `providers.default_operatory_id` (the chair a booking for the
provider defaults to, one per provider, validated to lie in an office the provider serves) [V `identity.py`]. Both are
listed, with the link type named. A provider with several column-header operatories reproduces the legacy multi-row case.

### Parameters - legacy parity

<!-- PARITY:providers_list_reports.r03:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group; both options enabled on all four Provider List reports (rule d01). |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (legacy correction: the box defaults to the session office, SELECT picks others). Offices (mode office) or office groups (mode office_group); the selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. On this report the office is the office of the operatory (operatories.office_id; office_attribution = operatory_office, NEW, 03 5.1), not the provider's roster: an operatory assignment is listed only when its operatory belongs to a selected office. |
| PROVIDER | Provider (picker) | shown: ALL | `provider_ids` | entity_multi | - | `all` | replicated_enhanced | Legacy SELECT dialog (dual list with INCLUDE ALL, search, sort) becomes a searchable multi-select; ALL = no restriction; dialog content never captured - confirm list source and whether inactive providers are listed. Role: the provider assigned to the operatory - operatories.provider_id (column default provider) or providers.default_operatory_id (provider_attribution = operatory_provider, NEW, 03 5.2). Legacy reads the Provider Setup > Ops tab; which of the two DentC links equals it is INFERRED. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:providers_list_reports.r03:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Output file only; rows unchanged |
| OFFICE/GROUP `Office` (default, working office) / `Office Group` | Assignments whose **operatory** belongs to a resolved office (`operatories.office_id`), banded by that office |
| PROVIDER `ALL` (default) | Every provider with at least one operatory link in scope |
| PROVIDER list | Only assignments of the picked providers |
| CLEAR CRITERIA / ADD TO MY FAVORITES | Defaults / saved view + favorite |

Dependency rules: family rule d01 only.

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `link_types` (`enum_multi`, NEW: `column_provider`, `default_operatory`; `no_predicate` on full selection) | both ticked | Which DentC link is listed |
| `include_unassigned` (`boolean`, NEW) | `false` | `true` adds two population blocks - the setup gap list: (a) operatories of the selected offices with no provider link (provider column `Unassigned`, attribution `operatory_office`); (b) providers with no operatory link, selected by `served_office_ids && :office_ids` (attribution `served_office`) and labelled `No operatory`. The definition's `scope` names both attributions; block (b) exists only with this enhancement |
| `only_shared_operatories` (`boolean`, NEW) | `false` | `true` keeps operatories linked to more than one provider (a column-header provider plus other providers' default operatory) - the vendor best-practice check |
| `operatory_status` (`enum`, NEW, owner 04 section 15: `active`, `inactive`, `both`) | `both` | `operatories.is_active`; `both` adds no predicate and never hides a row the legacy run might print (same rule as `provider_status`). Default revisited after RPT-PRLIST-09 answers open question 2 |
| `provider_status`, `provider_kinds` | `both`, all | Family parameters |
| `operatory_ids` (`entity_multi`, shared key, `lookup:operatories`) | `all` | Restrict to some chairs; option list follows the office scope |
| `group_by` (`enum`: `provider` default, `operatory`) | `provider` | `operatory` turns the list around: office → operatory → providers (the Scheduler column view) |

### Data

| Item | Rule |
|---|---|
| Datasets | `operatories` passthrough (`id`, `office_id`, `name`, `display_order`, `provider_id`, `is_active`, `legacy_id`; NEW `operatory_type` from DATA-45) and `rpt_provider_dim` (`default_operatory_id`, labels, `served_office_ids`, `provider_kind`, `is_active`); `rpt_office_dim` for bands |
| Row set | `UNION` of (a) `operatories` with `provider_id IS NOT NULL` → link `column_provider` and (b) `rpt_provider_dim` with `default_operatory_id IS NOT NULL` joined to `operatories` on `id` → link `default_operatory`; one row per (provider, operatory) with `link_types` aggregated (`both` when the two links agree) |
| Office scope | `operatory_office` (header): `operatories.office_id IN (:office_ids)` |
| `provider_ids` | on the linked provider |
| Shared check | `provider_count_on_operatory` = `count(DISTINCT provider_id) OVER (PARTITION BY operatory_id)` |
| Date basis | none (current state) |
| Availability | READY (coverage row 88). `operatories` has no `tenant_id` [V]: tenant scope comes through `offices.tenant_id` in the passthrough (DATA-45). Operatories were migrated (`OPR-{OPERATORYID}` ids); the column-header provider and default operatory are app-era settings, so a migrated tenant may list few rows until the Scheduler setup is done - `availability[]` code `no_operatory_links` when the scope has operatories but no links |

### Output

Format `standard`, block `main`, shape `table`; the `group_by = operatory` variant uses the same columns with the levels swapped.

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `provider_id` | - | `id` | `aggregate` | hidden group key |
| `provider_label` | Provider | `text` | `aggregate` | level header `{short_id} - {provider_name}`; subtotal `count` label `Operatories :` |
| `provider_kind` | Type | `enum` | `aggregate` | - |
| `operatory_id` | Operatory ID | `id` | `aggregate` | `default_visible = false`; with `provider_id` the `row_id_column` |
| `operatory_name` | Operatory | `text` | `aggregate` | - |
| `display_order` | Column # | `integer` | `aggregate` | - |
| `link_type` | Assignment | `enum` (`column_provider` Column provider, `default_operatory` Default operatory, `both` Both) | `aggregate` | - |
| `provider_count_on_operatory` | Shared | `integer` | `aggregate` | rendered `Shared (n)` when > 1, blank otherwise |
| `operatory_is_active` | Active | `boolean` | `aggregate` | `default_visible = true` |
| `office_id`, `office_name` | Office | `id`, `text` | `aggregate` | `fixed_outer` band |

| Item | Rule |
|---|---|
| Group levels | Office band, provider (default) or operatory level; grand total `Providers : n`, `Operatories : n` (distinct), `Shared operatories : n` |
| Sort | Fixed: provider last name, first name, then `display_order`, operatory name (alphanumeric, the Scheduler column order). With `group_by = operatory`: `display_order`, operatory name, then provider last name, first name, `provider_id` |
| Page break | Enhancement `page_break_by` (`none`, `office` NEW value owned by 04 section 15) |
| Summary header | Providers with an operatory, operatories without a provider (with `include_unassigned`), shared operatories |

### Visuals and drill-through

Chart: none - a list. Drill: provider → Provider Setup `Ops` / scheduler-settings tab; operatory → Office Setup
`Operatories` tab (`route_key = office_setup`, NEW, see Family-wide enhancements); `Shared (n)` → `rows` of the same report with
`operatory_ids = [operatory_id]`; operatory → `appointment.appointment_detail` with `operatory_ids = [operatory_id]` and
`date_range = today`.

### Actions

| Action | Kind | Note |
|---|---|---|
| Open provider setup | `navigate` (row) | - |
| Open office operatories | `navigate` (row) | - |
| Open Scheduler for the office | `navigate` (row) | day view of today, office of the row |
| Export selection | `export_selection` (bulk) | - |

Worklist use: with `include_unassigned` or `only_shared_operatories` the rows are setup fixes; no write action (the fix is
made in setup).

### Export and print

PDF portrait, banded (office, provider), footer echo. XLSX one sheet `Provider Operatory`, one row per assignment with
office, provider and operatory as columns. CSV the same. Never background.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | Is the legacy output provider → operatories (assumed) or operatory → providers | Print once |
| 2 | Are inactive operatories and providers without operatories printed | Inactivate an operatory; add a provider without ops; run |
| 3 | Does the legacy Ops tab hold per-office assignments for every office of a provider, and is the office filter applied to the operatory's office (assumed) or the provider's office | Assign a two-office provider to ops of both offices; run one office |
| 4 | Product: should DentC adopt a many-to-many provider-operatory assignment (legacy Ops tab) instead of the two links | Product decision with the Scheduler owners |

## Provider Registration - `lists.provider_registration`

Lists › Provider List Reports › Provider Registration, screenshot `4.PNG` - P3 - M - family `lists_provider` (tax id and DEA columns: class `security_users`) - instant - INFERRED (low)

### Purpose

Credentialing and billing staff, monthly and before payer enrolment, licence renewal or an audit: one place with every
provider's registration numbers, so that claims (NPI, taxonomy, tax id), prescriptions (DEA) and licence renewals are
checked. With the expiry columns of DATA-45 it becomes the renewal reminder list. The legacy content is unconfirmed: the
report is built as specified here with `status = beta` until one legacy sample is obtained (RPT-PRLIST-09).

### Legacy output

INFERRED (low): no vendor page uses the term "Provider Registration"; criteria `[L2]` only. Most likely reading `[I]`: the
registration numbers on the provider `Info` tab `[P38]`; alternative reading [unverified]: enrolment status with connected
services (e-claims provider match, e-prescribing, online booking).

| Item | Reconstruction (most likely reading) | Basis |
|---|---|---|
| Printed title | `Provider Registration` | menu name |
| Grouping | Office, providers below (OFFICE/GROUP is the only criterion) | `[L2][I]` |
| Columns | provider, `License #`, `DEA #`, `NPI #`, `TaxID #` with its type (`EIN` / `SSN` / `HCFA Provider ID`), `CS #` (controlled substance number, District of Columbia), `DPS` (Texas), `Ref ID` | `[P38]` Info tab; Dentrix Enterprise `Practice Organization List` and `Provider IDs List` `[C1]` |
| Per-carrier ids | possibly; Denticon keeps per-carrier legacy ids on the `INS-IDS` tab `[P40]` | `[I]` |
| Totals | none | - |

DentC holds `npi`, `license`, `tax_id`, `dea_id`, `taxonomy_code` (the API also returns a derived
`effective_taxonomy_code`, computed in Python from free-text `specialty` by keyword, `provider_taxonomy_service.effective_code()`;
it is not a database column) and per-carrier ids in `provider_insurance_ids` (`carrier_id`, `ins_id`, `in_network`). Not stored: tax id type, `CS #`,
`DPS`, `Ref ID`, licence state, licence and DEA expiry. Licence state and both expiry dates are SCHEMA(45) (DATA-45 adds
`license_state`, `license_expires_on`, `dea_expires_on`). Tax id type, `CS #`, `DPS` and `Ref ID` are NEW columns not
covered by any DATA item: request to 03 (extend DATA-45) only if the live sample shows they print. Until then those columns
are absent, and the `availability[]` entry `registration_fields_partial` names them in the criteria echo.

### Parameters - legacy parity

<!-- PARITY:providers_list_reports.r04:BEGIN -->
| Legacy section | Legacy control | Legacy options (default bold) | Parameter | Type | New values | Default | Status | Enabled when / notes |
|---|---|---|---|---|---|---|---|---|
| PRINT FORMAT | (no label) (radio_group) | **PDF** / Excel | `output_format` | enum | PDF -> `pdf`, Excel -> `xlsx` | `pdf` | replicated_enhanced | PRINT / PREVIEW always previews on screen first. Enhanced with csv. Excel is a flat typed sheet, not the legacy merged layout. |
| OFFICE/GROUP | (no label) (radio_group) | **Office** / Office Group | `office_scope.mode` | office_scope | Office -> `office`, Office Group -> `office_group` | `office` | replicated | Office versus Office Group; both options enabled on all four Provider List reports (rule d01). |
| OFFICE/GROUP | (no label) (picker) | shown: 108 | `office_scope.selection` | office_scope | - | `working_office` | replicated_enhanced | 108 = id of the office the user was working in (legacy correction: the box defaults to the session office, SELECT picks others). Offices (mode office) or office groups (mode office_group); the selection becomes exactly one of office_ids / office_group_id / office_group_ids; tokens working_office, my_offices; all = every office (or group) the caller may read. Office of the provider roster (office_attribution = served_office, NEW, 03 5.1) via rpt_provider_dim.served_office_ids; this report has no provider picker, so the office set is the only population filter. INFERRED (low) - the whole report content must be confirmed on the live tool. |

| Legacy action button | In the new module |
|---|---|
| CLEAR CRITERIA | Clear criteria: resets every parameter of the report to its default value. |
| PRINT / PREVIEW | Run: preview on screen, then print or export in the chosen output format. |
| ADD TO MY FAVORITES | Add to favorites: saves the report with the current criteria as a favorite (saved view). |
<!-- PARITY:providers_list_reports.r04:END -->

| Legacy option | Effect on the result |
|---|---|
| PRINT FORMAT `PDF` (default) / `Excel` | Output file only; rows unchanged |
| OFFICE/GROUP `Office` (default, working office) | Providers whose roster overlaps the selected offices, banded per office |
| OFFICE/GROUP `Office Group` | Same over the offices of the group(s); `all` when no groups exist (rule d01) |
| CLEAR CRITERIA / ADD TO MY FAVORITES | Defaults / saved view + favorite |

No PROVIDER control exists on the legacy screen (confirmed by the exact-colour sweep): the definition declares no
`provider_ids` parameter in its legacy section; the enhancement below adds one under "More options".

### Parameters - enhancements

| Key (type) | Default | Effect |
|---|---|---|
| `provider_ids` (`entity_multi`, shared key, enhancement only) | `all` | Restrict to some providers (not a legacy control; shown under More options) |
| `provider_status`, `provider_kinds` | `both`, all | Family parameters; `provider_kinds = dentist, hygienist, specialist` is the clinical-licence view |
| `missing_identifiers` (`enum_multi`, NEW: `npi`, `license`, `dea_id`, `tax_id`, `taxonomy_code`; `min_items` 0) | empty = no restriction | Providers missing at least one ticked identifier - the credentialing gap list. `dea_id` / `tax_id` members need `security_users` (parameter class rule, 02 3.2) |
| `expiring_within_days` (`integer`, NEW, `validation.min` 0, `max` 365; `null` = off) | `null` | Providers whose `license_expires_on` or `dea_expires_on` falls within n days of the office-local today (or has passed). Needs DATA-45; disabled with reason `data_unavailable` before it |
| `include_carrier_ids` (`boolean`, NEW) | `false` | Adds the per-carrier block (provider x carrier `ins_id`, network status); `false` is the most likely legacy content (open question 2) |
| `carrier_ids` (`entity_multi`, shared key) | `all` | Restricts the per-carrier block; `enabled_when ["truthy", "include_carrier_ids"]` |

### Data

| Item | Rule |
|---|---|
| Datasets | `rpt_provider_dim` (`npi`, `license`, `tax_id`, `dea_id`, `taxonomy_code`, labels, roster), dimension columns from DATA-45: `license_state`, `license_expires_on`, `dea_expires_on`; NEW `providers.effective_taxonomy_code varchar(10)` (persisted like `provider_kind`, DATA-05: backfill script calling `provider_taxonomy_service.effective_code()`, kept current by `ProviderCRUD` on create and update; request to 03 as an extension of DATA-45, exposed in `rpt_provider_dim`; the derived value the claim service uses - [V] model comment ADA-BE-14); `provider_insurance_ids` + `insurance_carriers` passthrough (block `carrier_ids`, joined on `carrier_id`, the carrier's unique key) |
| Office scope | `served_office` (header) |
| NPI check | `npi_check` computed server-side: 10 digits and the Luhn check digit over the prefix `80840` (the NPI standard); values `valid`, `invalid`, `missing` (NEW computed column, owner 03 or the definition builder) |
| `expiring_within_days` | `least(license_expires_on, dea_expires_on) <= local_today + n` |
| Date basis | none for the default run; for the enhancement the NEW basis `expiry_date` = `least(license_expires_on, dea_expires_on)` (owner 04 section 7.2; office-local `date` columns) |
| Availability | READY (coverage row 89) for the numbers the schema holds; licence state and expiry: SCHEMA(45); until `effective_taxonomy_code` is persisted the `Taxonomy` column reads the raw `taxonomy_code` and `availability[]` code `taxonomy_not_derived` says the derived value is missing; tax id type, `CS #`, `DPS`, `Ref ID`: not stored (NEW). Migrated providers carry `npi`, `license`, `tax_id`, `dea_id` as converted; `provider_insurance_ids` is empty at migration [D] `be_data_insurance.md` L53, so the carrier block is empty until staff enter ids - `availability[]` code `no_carrier_provider_ids` |

### Output

Format `standard`. Block `main` (shape `table`, placement `main`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `provider_id` | - | `id` | `aggregate` | hidden; `row_id_column` |
| `provider_label` | Provider | `text` | `aggregate` | `count_distinct` label `Providers :` |
| `title` | Degree | `text` | `aggregate` | - |
| `provider_kind` | Type | `enum` | `aggregate` | - |
| `npi` | NPI # | `text` | `aggregate` | `count` of `missing` in the summary header |
| `npi_check` | NPI check | `enum` (`valid`, `invalid` Invalid, `missing` Missing) | `aggregate` | `valid` renders blank |
| `effective_taxonomy_code` | Taxonomy | `text` | `aggregate` | NEW persisted column; reads `taxonomy_code` until it exists |
| `license` | License # | `text` | `aggregate` | - |
| `license_state` | Lic. State | `text` | `aggregate` | DATA-45; absent before it |
| `license_expires_on` | Lic. Expires | `date` | `aggregate` | DATA-45; overdue dates flagged |
| `dea_id` | DEA # | `text` | `security_users` | non-key, dropped without the class |
| `dea_expires_on` | DEA Expires | `date` | `security_users` | DATA-45 |
| `tax_id` | TaxID # | `text` | `security_users` | non-key, dropped without the class |
| `is_billing_provider` | Billing | `boolean` | `aggregate` | - |
| `is_active` | Active | `boolean` | `aggregate` | - |
| `office_id`, `office_name` | Office | `id`, `text` | `aggregate` | `fixed_outer` band |

Block `carrier_ids` (shape `table`, placement `after_group` per provider; present only with `include_carrier_ids`):

| key | label | type | data_class | total / subtotal rule |
|---|---|---|---|---|
| `carrier_id` | - | `id` | `aggregate` | hidden |
| `carrier_name` | Carrier | `text` | `aggregate` | - |
| `ins_id` | Provider ID at carrier | `text` | `aggregate` | - |
| `in_network` | In network | `boolean` | `aggregate` | `count` of true per provider |

| Item | Rule |
|---|---|
| Group levels | Office band, rows per provider; grand total `Providers : n` |
| Sort | Fixed: provider last name, first name, `provider_id`; carrier block by carrier name |
| Page break | Enhancement `page_break_by` (`none`, `office` NEW value owned by 04 section 15) |
| Summary header | Providers listed, providers with an invalid or missing NPI, providers with an identifier expiring in 60 days (after DATA-45) |

`tax_id` may hold an individual provider's SSN (legacy type `SSN`): until a tax id type exists, the column is shown only
under `security_users`; it is never a sort or search key and never a value filter - it is usable only as the presence
test of `missing_identifiers`, and only for callers holding `security_users`; masking it like the patient SSN rule (08 5.5) is open
question 4.

### Visuals and drill-through

Chart: none - a list. Drill: provider → Provider Setup, `Info` tab; carrier row → Provider Setup `INS IDs` tab (the
provider-insurance-ids screen); the "expiring" summary card → `rows` of the same report with `expiring_within_days = 60`.

### Actions

| Action | Kind | Note |
|---|---|---|
| Open provider setup | `navigate` (row) | `Info` tab |
| Create renewal task | `create_task` (bulk) | "Renew licence / DEA of {provider} by {date}" for the selected rows; after DATA-45 |
| Export selection | `export_selection` (bulk) | Full Control + `reports_export_data_files`; columns of a class the caller lacks are absent from the file too |

Worklist use: with `missing_identifiers` or `expiring_within_days` the report is the credentialing worklist; a monthly
schedule with `expiring_within_days = 60` and `skip_if_empty` (`empty_when.test = no_detail_rows`) delivers only when
something expires.

### Export and print

PDF landscape (up to 14 columns), banded, carrier block indented under each provider when present, footer echo. XLSX:
sheet `Provider Registration` (main block), sheet `Carrier IDs` (when present, provider as a column), criteria sheet;
no merged cells. CSV main block only unless `options.block = carrier_ids`. Never background.

### Open questions

| # | Question | How to confirm |
|---|---|---|
| 1 | What the report prints at all: registration numbers (assumed) or connected-service enrolment | Generate one sample on the live tool (blocking for `status = active`) |
| 2 | Are per-carrier provider ids (INS-IDS tab) printed | Same sample |
| 3 | Which of `CS #`, `DPS`, `Ref ID`, tax id type and licence state print; if they do, DATA-45 is extended | Same sample |
| 4 | Product / 08: mask `tax_id` (last four) when it is an individual's SSN, and is `license` sensitive at all (public in state registries) | Decision for `08_security_compliance.md` |
| 5 | Is the provider set the office roster (assumed) or every provider of the account regardless of office | Run for an office with no providers assigned |

## Work items

| id | title | phase | size | depends on | acceptance check |
|---|---|---|---|---|---|
| RPT-PRLIST-01 | Family base module `app/reports/definitions/lists/provider/_common.py`: shared parameter declarations (`office_scope`, `provider_ids`, `output_format`, `provider_status`, `provider_kinds`), `fixed_outer` office band, distinct-provider grand total, footer echo labels, `legacy_names` aliases (`Providers List` of the old menu) | P3 | M | DATA-05, ENG-03, ENG-11, ENG-23, FLT-01, FLT-03 | Lint passes for the four definitions; FLT-20 default-run test reproduces every legacy default of the parity file; a provider serving two selected offices appears under both bands and is counted once in the grand total |
| RPT-PRLIST-02 | Attribution values `served_office`, `operatory_office`, `listed_provider`, `operatory_provider` registered with the dataset handles (request to 03 section 5 and 02 `office_columns`) | P3 | S | DATA-45, ENG-09 | The handle applies `served_office_ids && :office_ids` for r01, r02, r04 and `operatories.office_id IN (...)` for r03; a caller restricted to office A never receives a row of an operatory of office B; a provider whose home office is outside the scope but who is assigned to a scoped office is listed |
| RPT-PRLIST-03 | Passthrough datasets of the family: `provider_holidays`, `account_holidays`, `operatories`, `provider_insurance_ids` (tenant scope, labels, `is_active` columns), and the NEW function `rpt_provider_holiday_occurrences(p_tenant_id, p_from, p_to)` that expands yearly recurring rows (request to 03 2.28 under DATA-55; the same function feeds `rpt_provider_calendar_days()`) | P3 | M | DATA-45, DATA-55, ENG-59 | Each passthrough returns only rows of the caller's tenant; a recurring holiday of 07-04 returns one occurrence per year in a three-year range; `provider_carrier_logins` is not reachable through any handle |
| RPT-PRLIST-04 | Option sources: `specialties` (response model for `GET /provider-specialties` requested from the backend), `definitions:state`, plus `rpt_value_map` domains `specialty` (NEW) and `state` for free-text provider values | P3 | S | FLT-09, DATA-02 | Both sources return labels for every value; a provider with `state = 'Texas'` matches `state_codes = ['TX']`; an unknown value is 422 |
| RPT-PRLIST-05 | NEW enhancement parameters `provider_status`, `provider_kinds` (and the report-specific keys of the sections) added to 04 section 15 with types, defaults and lint vectors | P3 | S | FLT-01, FLT-27 | Defaults add no predicate (golden default run equals the run without the parameters); `provider_kinds = ['hygienist']` lists only hygienists |
| RPT-PRLIST-06 | Rights and data classes of the family: `lists_provider` codes on the four definitions, `security_users` on `tax_id`, `dea_id`, `dea_expires_on`, export second key | P3 | S | SEC-01, SEC-03, SEC-07 | View Only caller runs but cannot print or export; a caller without `security_users` runs Provider Registration without the two columns in screen, PDF, XLSX and CSV; a caller without the family gets 403 |
| RPT-PRLIST-07 | Drill and actions: Provider Setup record drill per tab, Office Setup operatory drill, Scheduler day view from r02 and r03 (`scheduler_day`), `export_selection`; request to 07 `recordRoutes.ts` for the NEW route keys `provider_setup` and `office_setup` | P3 | S | ENG-30, ENG-49, UX-22 | The route-map contract test knows `provider_setup` and `office_setup`; clicking a provider on each report opens Provider Setup on the named tab; the drill is audited; export of a selection contains exactly the selected rows |
| RPT-PRLIST-08 | PDF and XLSX layouts of the family: banded table, portrait (r02, r03) / landscape (r01, r04), footer echo, one flat sheet per block | P3 | S | ENG-23, ENG-27 | Layout checklist per report passes; XLSX has no merged cells, typed date cells, frozen header and a criteria sheet |
| RPT-PRLIST-09 | Live legacy verification of the family's open questions (family 1-5 and per report) and update of the decisions file, the parity tables and the layouts | P3 | M | FLT-23 | Every INFERRED layout is confirmed or corrected from one generated sample per report; `build_parity.py` prints PARITY VALID after the update; Provider Registration leaves `status = beta` only after this item |
| RPT-PRLIST-10 | Definition `lists.provider_list`: parameters of the parity file, `served_office` band, columns and totals of the Output table (`provider_display_id` first), sort options, `availability[]` sparse warnings; NEW `rpt_provider_dim` columns `address_line2`, `legacy_id`, `served_office_names` (request to 03 2.3 / DATA-05) | P3 | S | RPT-PRLIST-01, RPT-PRLIST-02, RPT-PRLIST-04, DATA-05 | Golden fixture: three providers over two offices, one without specialty; default run lists all three under the working office band only where they serve it; `specialty_codes = [x]` drops the blank one; `state_codes` matches a free-text state through `rpt_value_map` |
| RPT-PRLIST-11 | Provider List enhancements: `only_billing_providers`, `only_ortho_providers`, `missing_fields` worklist mode, `group_by` `provider_kind` / `specialty`, `providers_by_kind` chart hint, internal-message row action | P3 | S | RPT-PRLIST-10, RPT-PRLIST-05, UX-24 | `missing_fields = ['phone']` returns exactly the providers without a phone; group subtotals equal the band total; the message action is absent for a provider without a linked user |
| RPT-PRLIST-12 | Definition `lists.provider_holidays` on `rpt_provider_holiday_occurrences()`: fixed basis `holiday_date`, recurring expansion, provider level with `Days off :` subtotal, `no_provider_holidays_configured` warning, relabelled date section with the legacy header as alias, NEW presets `next_7_days`, `next_30_days`, `next_month` | P3 | S | RPT-PRLIST-01, RPT-PRLIST-03, DATA-55, FLT-12 | Default run (today / today) lists exactly the providers whose one-time or yearly recurring holiday is today; a 29 February recurring row appears only in leap years; an empty tenant returns the warning, not a silent empty list |
| RPT-PRLIST-13 | Provider Holidays enhancements: `holiday_statuses`, `include_office_holidays` (account and office rows with `source`), `only_with_appointments` with `Appts` column and drill to `appointment.appointment_detail`, reschedule `create_task` bulk action | P3 | M | RPT-PRLIST-12, DATA-16, ENG-49 | With `include_office_holidays` an account-wide closure appears once per selected office; `only_with_appointments` lists a holiday with two live appointments and drills to those two; the task action creates one task per selected row |
| RPT-PRLIST-14 | Schema request for legacy holiday fidelity: `provider_holidays.end_date`, `recurrence_rule`, `open_start_time`, `open_end_time`, `lunch_start`, `lunch_end` (NEW, to 03 as an extension of DATA-45) and the `open_hours` / recurrence columns that read them | P4 | M | RPT-PRLIST-09, DATA-45 | Decision recorded after open question 5 of Provider Holidays; if accepted, a weekly recurring entry expands to one row per week in the range and an open exception prints its hours |
| RPT-PRLIST-15 | Definition `lists.provider_operatory`: union of column-provider and default-operatory links, `operatory_office` attribution, `link_type`, shared count, both grouping variants, `no_operatory_links` warning | P3 | S | RPT-PRLIST-01, RPT-PRLIST-02, RPT-PRLIST-03 | Fixture: operatory A with column provider P1 and default operatory of P1 → one row `Both`; operatory B with column provider P1 and default operatory of P2 → `Shared (2)`; a provider homed elsewhere whose default operatory is in the scoped office is listed |
| RPT-PRLIST-16 | Provider Operatory enhancements: `link_types`, `include_unassigned` (two population blocks), `only_shared_operatories`, `operatory_status`, `operatory_ids`, drills to Office Setup and `appointment.appointment_detail` | P3 | S | RPT-PRLIST-15, FLT-09 | `include_unassigned` adds every operatory without a link (`operatory_office`) and every roster provider without one (`served_office`); the default `operatory_status = both` adds no predicate; `only_shared_operatories` returns only operatories with two or more providers |
| RPT-PRLIST-17 | Definition `lists.provider_registration` (`status = beta`): main block, `security_users` columns, `npi_check` computed column, `include_carrier_ids` block from `provider_insurance_ids`, `missing_identifiers`, `registration_fields_partial`, `no_carrier_provider_ids` and `taxonomy_not_derived` warnings; NEW persisted `providers.effective_taxonomy_code` (request to 03, extension of DATA-45) | P3 | M | RPT-PRLIST-01, RPT-PRLIST-03, RPT-PRLIST-06, DATA-05, DATA-45 | A caller without `security_users` gets no `tax_id` / `dea_id` in screen and exports and cannot use those `missing_identifiers` members; an NPI with a wrong check digit shows `Invalid`; the carrier block lists one row per `provider_insurance_ids` row |
| RPT-PRLIST-18 | Provider Registration expiry: `license_state`, `license_expires_on`, `dea_expires_on` columns and `expiring_within_days` once DATA-45 lands; renewal `create_task` action; monthly schedule preset with `skip_if_empty` | P3 | S | RPT-PRLIST-17, DATA-45, ENG-43, ENG-44 | A licence expiring in 30 days is listed with `expiring_within_days = 60` and not with 20; a schedule run with nothing expiring delivers nothing; before DATA-45 the parameter is disabled with reason `data_unavailable` |

<!-- ASSEMBLED from catalog/parts/providers_list_reports/ (00_header.md, 10_reports.md). Edit this document directly from now on. -->
