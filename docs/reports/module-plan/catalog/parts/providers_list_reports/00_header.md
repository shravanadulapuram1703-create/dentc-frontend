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
| Column classes | `aggregate` for every column of r01-r03 (provider and operatory labels as operational attributes, setup catalog content, 08 5.1). Provider address, phone and e-mail are practice letterhead data (LTR-3), classed `aggregate` (open question 9 asks 08 to confirm) |
| Per-report override | `lists.provider_registration`: `tax_id` and `dea_id` (and the NEW `dea_expires_on`) are `security_users` (security card 2.3). They are non-key columns: a caller without the class gets the report without them (08 5.6) |
| Patient manifest | None: no column of the family identifies a patient, so runs write no manifest entries (ENG-14 still writes the run event) |
| Never a column | `provider_carrier_logins` (credentials), `provider_signatures`, `provider_watermarks`, `users.signature_data` (08 5.5) |

### Family-wide enhancements

| Enhancement | Detail |
|---|---|
| Saved views and favorites | ADD TO MY FAVORITES = server-side saved view + favorite (ENG-28, ENG-29); relative date presets on r02 (`next_30_days`, `this_month`, `next_month`, `this_year`) |
| Office choices | `my_offices`, several office groups, `all` (filter card 12) |
| Schedules | All four `schedulable = true` (no patient context). Typical: r02 monthly "next month" to office managers; r04 monthly with `expiring_within_days = 60` once DATA-45 lands |
| Record drill | Every provider cell opens Provider Setup (`/setup/providers/provider-setup`, `route_key = provider_setup`, the tab named per report); the target needs the Provider Setup feature right in `drill_targets[].right_code` (code owned by 08, record route map owned by 07) |
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

<!-- WORK-ITEMS -->
| RPT-PRLIST-01 | Family base module `app/reports/definitions/lists/provider/_common.py`: shared parameter declarations (`office_scope`, `provider_ids`, `output_format`, `provider_status`, `provider_kinds`), `fixed_outer` office band, distinct-provider grand total, footer echo labels, `legacy_names` aliases (`Providers List` of the old menu) | P3 | M | DATA-05, ENG-03, ENG-11, ENG-23, FLT-01, FLT-03 | Lint passes for the four definitions; FLT-20 default-run test reproduces every legacy default of the parity file; a provider serving two selected offices appears under both bands and is counted once in the grand total |
| RPT-PRLIST-02 | Attribution values `served_office`, `operatory_office`, `listed_provider`, `operatory_provider` registered with the dataset handles (request to 03 section 5 and 02 `office_columns`) | P3 | S | DATA-45, ENG-09 | The handle applies `served_office_ids && :office_ids` for r01, r02, r04 and `operatories.office_id IN (...)` for r03; a caller restricted to office A never receives a row of an operatory of office B; a provider whose home office is outside the scope but who is assigned to a scoped office is listed |
| RPT-PRLIST-03 | Passthrough datasets of the family: `provider_holidays`, `account_holidays`, `operatories`, `provider_insurance_ids` (tenant scope, labels, `is_active` columns), and the NEW function `rpt_provider_holiday_occurrences(p_tenant_id, p_from, p_to)` that expands yearly recurring rows | P3 | M | DATA-45, ENG-59 | Each passthrough returns only rows of the caller's tenant; a recurring holiday of 07-04 returns one occurrence per year in a three-year range; `provider_carrier_logins` is not reachable through any handle |
| RPT-PRLIST-04 | Option sources: `specialties` (response model for `GET /provider-specialties` requested from the backend), `definitions:state`, plus `rpt_value_map` domains `specialty` (NEW) and `state` for free-text provider values | P3 | S | FLT-09, DATA-02 | Both sources return labels for every value; a provider with `state = 'Texas'` matches `state_codes = ['TX']`; an unknown value is 422 |
| RPT-PRLIST-05 | NEW enhancement parameters `provider_status`, `provider_kinds` (and the report-specific keys of the sections) added to 04 section 15 with types, defaults and lint vectors | P3 | S | FLT-01, FLT-27 | Defaults add no predicate (golden default run equals the run without the parameters); `provider_kinds = ['hygienist']` lists only hygienists |
| RPT-PRLIST-06 | Rights and data classes of the family: `lists_provider` codes on the four definitions, `security_users` on `tax_id`, `dea_id`, `dea_expires_on`, export second key | P3 | S | SEC-01, SEC-03, SEC-07 | View Only caller runs but cannot print or export; a caller without `security_users` runs Provider Registration without the two columns in screen, PDF, XLSX and CSV; a caller without the family gets 403 |
| RPT-PRLIST-07 | Drill and actions: Provider Setup record drill per tab, Office Setup operatory drill, Scheduler hand-off from r02 and r03, `export_selection` | P3 | S | ENG-30, ENG-49, UX-22 | Clicking a provider on each report opens Provider Setup on the named tab; the drill is audited; export of a selection contains exactly the selected rows |
| RPT-PRLIST-08 | PDF and XLSX layouts of the family: banded table, portrait (r02, r03) / landscape (r01, r04), footer echo, one flat sheet per block | P3 | S | ENG-23, ENG-27 | Layout checklist per report passes; XLSX has no merged cells, typed date cells, frozen header and a criteria sheet |
| RPT-PRLIST-09 | Live legacy verification of the family's open questions (family 1-5 and per report) and update of the decisions file, the parity tables and the layouts | P3 | M | FLT-23 | Every INFERRED layout is confirmed or corrected from one generated sample per report; `build_parity.py` prints PARITY VALID after the update; Provider Registration leaves `status = beta` only after this item |
<!-- /WORK-ITEMS -->
